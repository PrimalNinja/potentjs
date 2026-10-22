// JZOSCIIWebRadio - ZOSCII MQ Web Radio for PotentJS: plays a station's channels straight from a
// ZOSCII MQ (anyone's instance, or your own) or from an ICY stream, with no page furniture - the
// game or page draws what it wants (now playing, cover pictures, a level meter) from callbacks.
//
// Two kinds of source:
//   { name:'English', type:'mq', url:'https://my.server/zosciimq/index.php', queue:'Cyborg Unicorn English' }
//       messages fetched from the MQ one at a time (action=fetch&q=...&after=<pointer>) and
//       decoded here in the browser with the station's ROM: MP3s play, JPEGs and text are handed
//       to the page. The server never knows what it's sending.
//   { name:'English', type:'icy', url:'http://host:8000', session:0 }
//       an ICY stream (e.g. zwrserve), played by the browser as it is; session N resumes session N
//       (the URL gets /N on the end), 0 is a new one.
//
//   var objRadio = new JZOSCIIWebRadio({ rom:'logo.png', behaviour:'repeatAllQueues',
//       onTrack:function(objInfo_a) { ... }, onImage:function(objImage_a, strFilename_a) { ... } });
//   objRadio.start([ objSource1, objSource2 ]);     <- from a key press or a tap (browsers only
//                                                      start sound after the player does something)
//   objRadio.next();  objRadio.previous();  objRadio.toggle();  objRadio.stop();
//   objRadio.getLevels(arrLevels);                  <- each frame, for a meter (0-255 each)
//
// HTTP or HTTPS: a page served over HTTPS can only use HTTPS sources (the browser blocks plain
// HTTP on a secure page). Self-host the MQ or the stream behind HTTPS to use them from one; an
// HTTP-only stream works from a page served over HTTP. A source on another server must send CORS
// headers (Access-Control-Allow-Origin) - the MQ for its fetches, an ICY stream for the level meter
// (or set analyser:false, then the stream needs no CORS but there are no levels).
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JZOSCIIWebRadio(objOptions_a)
{
	var m_objThis = this;
	var m_objOptions = objOptions_a || {};

	var m_objPlayer = null;				// the <audio> element (not on the page)
	var m_objAudio = null;				// Web Audio: the context, the player's node, the analyser
	var m_objSourceNode = null;
	var m_objAnalyser = null;
	var m_arrBins = null;
	var m_arrROM = null;
	var m_arrSources = [];
	var m_intSource = 0;
	var m_strPointer = '';				// the last message fetched on the current source
	var m_arrHistory = [];				// the songs played: { source, after } - fetch after "after" to get it again
	var m_blnPlaying = false;
	var m_blnPaused = false;
	var m_blnFetching = false;
	var m_blnStream = false;
	var m_strLastType = '';
	var m_objTimer = null;
	var m_strImageURL = null;
	var m_strTrackURL = null;

	if (m_objOptions.behaviour === undefined) { m_objOptions.behaviour = 'repeatAllQueues'; }
	if (m_objOptions.analyser === undefined) { m_objOptions.analyser = true; }
	if (m_objOptions.volume === undefined) { m_objOptions.volume = 1; }
	if (m_objOptions.minTrackSize === undefined) { m_objOptions.minTrackSize = 1024000; }
	if (m_objOptions.imageGap === undefined) { m_objOptions.imageGap = 2; }
	if (m_objOptions.waitSeconds === undefined) { m_objOptions.waitSeconds = 30; }
	if (m_objOptions.retrySeconds === undefined) { m_objOptions.retrySeconds = 30; }
	if (m_objOptions.streamRetrySeconds === undefined) { m_objOptions.streamRetrySeconds = 5; }
	if (m_objOptions.maxTextLength === undefined) { m_objOptions.maxTextLength = 16384; }

	// ====================================================================================================
	// HELPERS

	function call(fn_a, var1_a, var2_a)
	{
		if (isFunction(fn_a))
		{
			fn_a(var1_a, var2_a);
		}
	}

	function status(str_a)
	{
		call(m_objOptions.onStatus, str_a);
	}

	function currentSource()
	{
		return (m_intSource < m_arrSources.length) ? m_arrSources[m_intSource] : null;
	}

	function clearTimer()
	{
		if (m_objTimer !== null)
		{
			clearTimeout(m_objTimer);
			m_objTimer = null;
		}
	}

	function later(fn_a, intSeconds_a)
	{
		clearTimer();
		m_objTimer = setTimeout(function()
		{
			m_objTimer = null;
			if (m_blnPlaying)
			{
				fn_a();
			}
		}, intSeconds_a * 1000);
	}

	// an ICY source's URL: /N on the end to resume session N
	function streamURL(objSource_a)
	{
		var strURL = objSource_a.url;
		if ((objSource_a.session !== undefined) && (objSource_a.session > 0))
		{
			if (strURL.charAt(strURL.length - 1) !== '/') { strURL += '/'; }
			strURL += objSource_a.session;
		}
		return strURL;
	}

	// ZOSCII: each pair of bytes is an address (low byte first) in the ROM; the byte there is the data
	function decode(arrZOS_a)
	{
		var intLength = Math.floor(arrZOS_a.length / 2);
		var arrResult = new Uint8Array(intLength);
		var intI, intAddress;
		for (intI = 0; intI < intLength; intI++)
		{
			intAddress = arrZOS_a[intI * 2] | (arrZOS_a[intI * 2 + 1] << 8);
			arrResult[intI] = m_arrROM[intAddress];
		}
		return arrResult;
	}

	// what a decoded message is: 'mp3', 'jpg' or 'text'
	function typeOf(arr_a)
	{
		var strResult = 'text';
		if ((arr_a.length >= 3) && (arr_a[0] === 0xFF) && (arr_a[1] === 0xD8) && (arr_a[2] === 0xFF))
		{
			strResult = 'jpg';
		}
		if ((arr_a.length >= 3) && (((arr_a[0] === 0xFF) && ((arr_a[1] & 0xE0) === 0xE0)) || ((arr_a[0] === 0x49) && (arr_a[1] === 0x44) && (arr_a[2] === 0x33))))
		{
			strResult = 'mp3';
		}
		return strResult;
	}

	// ====================================================================================================
	// TEXT AND ID3 TAGS

	function utf8(arr_a, intStart_a, intEnd_a)
	{
		var strResult = '';
		var intI = intStart_a;
		var intB, intCode;
		while (intI < intEnd_a)
		{
			intB = arr_a[intI];
			if (intB < 0x80)
			{
				intCode = intB; intI += 1;
			}
			else if (intB < 0xE0)
			{
				intCode = ((intB & 0x1F) << 6) | (arr_a[intI + 1] & 0x3F); intI += 2;
			}
			else if (intB < 0xF0)
			{
				intCode = ((intB & 0x0F) << 12) | ((arr_a[intI + 1] & 0x3F) << 6) | (arr_a[intI + 2] & 0x3F); intI += 3;
			}
			else
			{
				intCode = ((intB & 0x07) << 18) | ((arr_a[intI + 1] & 0x3F) << 12) | ((arr_a[intI + 2] & 0x3F) << 6) | (arr_a[intI + 3] & 0x3F); intI += 4;
			}
			if (intCode >= 0x10000)
			{
				intCode -= 0x10000;
				strResult += String.fromCharCode(0xD800 + (intCode >> 10), 0xDC00 + (intCode & 0x3FF));
			}
			else
			{
				strResult += String.fromCharCode(intCode);
			}
		}
		return strResult;
	}

	function utf16(arr_a, intStart_a, intEnd_a, blnBigEndian_a)
	{
		var strResult = '';
		var intI;
		for (intI = intStart_a; intI + 1 < intEnd_a; intI += 2)
		{
			strResult += String.fromCharCode(blnBigEndian_a ? ((arr_a[intI] << 8) | arr_a[intI + 1]) : (arr_a[intI] | (arr_a[intI + 1] << 8)));
		}
		return strResult;
	}

	function latin1(arr_a, intStart_a, intEnd_a)
	{
		var strResult = '';
		var intI;
		for (intI = intStart_a; intI < intEnd_a; intI++)
		{
			strResult += String.fromCharCode(arr_a[intI]);
		}
		return strResult;
	}

	function tidy(str_a)
	{
		return str_a.replace(/\u0000/g, ' ').replace(/\s+$/, '').replace(/^\s+/, '');
	}

	// text in an ID3v2 frame: encoding byte, then 0 latin-1, 1 UTF-16 with a BOM, 2 UTF-16BE, 3 UTF-8
	function frameText(arr_a, intStart_a, intEnd_a)
	{
		var intEnc = arr_a[intStart_a];
		var intI = intStart_a + 1;
		var strResult = '';
		if (intEnc === 0)
		{
			strResult = latin1(arr_a, intI, intEnd_a);
		}
		else if (intEnc === 1)
		{
			if ((intI + 1 < intEnd_a) && (arr_a[intI] === 0xFE) && (arr_a[intI + 1] === 0xFF)) { strResult = utf16(arr_a, intI + 2, intEnd_a, true); }
			else if ((intI + 1 < intEnd_a) && (arr_a[intI] === 0xFF) && (arr_a[intI + 1] === 0xFE)) { strResult = utf16(arr_a, intI + 2, intEnd_a, false); }
			else { strResult = utf16(arr_a, intI, intEnd_a, false); }
		}
		else if (intEnc === 2)
		{
			strResult = utf16(arr_a, intI, intEnd_a, true);
		}
		else
		{
			strResult = utf8(arr_a, intI, intEnd_a);
		}
		return tidy(strResult);
	}

	function big(arr_a, intAt_a, intBytes_a, blnSynchsafe_a)
	{
		var intResult = 0;
		var intI;
		for (intI = 0; intI < intBytes_a; intI++)
		{
			intResult = blnSynchsafe_a ? ((intResult << 7) | (arr_a[intAt_a + intI] & 0x7F)) : ((intResult * 256) + arr_a[intAt_a + intI]);
		}
		return intResult;
	}

	// a song's title, artist, album and year: ID3v2 (2.2, 2.3, 2.4) at the start, else ID3v1 at the end
	function tags(arr_a)
	{
		var objResult = { title:'', artist:'', album:'', year:'' };
		var objNames = { TT2:'title', TP1:'artist', TAL:'album', TYE:'year', TIT2:'title', TPE1:'artist', TALB:'album', TYER:'year', TDRC:'year' };
		var intVersion, intEnd, intAt, intHead, intSize, strID, blnGo = true;
		try
		{
			if ((arr_a.length > 10) && (arr_a[0] === 0x49) && (arr_a[1] === 0x44) && (arr_a[2] === 0x33))
			{
				intVersion = arr_a[3];
				intEnd = Math.min(arr_a.length, 10 + big(arr_a, 6, 4, true));
				intAt = 10;
				if ((arr_a[5] & 0x40) !== 0)
				{
					intAt += (intVersion >= 4) ? big(arr_a, 10, 4, true) : (4 + big(arr_a, 10, 4, false));
				}
				intHead = (intVersion === 2) ? 6 : 10;
				while (blnGo && (intAt + intHead <= intEnd))
				{
					if (arr_a[intAt] === 0)
					{
						blnGo = false;
					}
					else
					{
						strID = latin1(arr_a, intAt, intAt + ((intVersion === 2) ? 3 : 4));
						intSize = (intVersion === 2) ? big(arr_a, intAt + 3, 3, false) : big(arr_a, intAt + 4, 4, intVersion >= 4);
						if ((intSize <= 0) || (intAt + intHead + intSize > intEnd))
						{
							blnGo = false;
						}
						else
						{
							if ((objNames[strID] !== undefined) && (objResult[objNames[strID]] === ''))
							{
								objResult[objNames[strID]] = frameText(arr_a, intAt + intHead, intAt + intHead + intSize);
							}
							intAt += intHead + intSize;
						}
					}
				}
			}
			if ((objResult.title === '') && (arr_a.length >= 128) && (latin1(arr_a, arr_a.length - 128, arr_a.length - 125) === 'TAG'))
			{
				intAt = arr_a.length - 128;
				objResult.title = tidy(latin1(arr_a, intAt + 3, intAt + 33));
				objResult.artist = tidy(latin1(arr_a, intAt + 33, intAt + 63));
				objResult.album = tidy(latin1(arr_a, intAt + 63, intAt + 93));
				objResult.year = tidy(latin1(arr_a, intAt + 93, intAt + 97));
			}
		}
		catch (objError_a)
		{
			// a broken tag: whatever was read so far
		}
		if (objResult.year.length > 4) { objResult.year = objResult.year.substr(0, 4); }
		return objResult;
	}

	// ====================================================================================================
	// THE PLAYER

	function setup()
	{
		var fnAudioContext = window.AudioContext || window.webkitAudioContext;
		if (m_objPlayer === null)
		{
			m_objPlayer = document.createElement('audio');
			if (m_objOptions.analyser)
			{
				m_objPlayer.crossOrigin = 'anonymous';
			}
			m_objPlayer.volume = m_objOptions.volume;
			m_objPlayer.addEventListener('ended', onEnded, false);
			m_objPlayer.addEventListener('error', onError, false);
			if (m_objOptions.analyser && (fnAudioContext !== undefined))
			{
				m_objAudio = new fnAudioContext();
				m_objSourceNode = m_objAudio.createMediaElementSource(m_objPlayer);
				m_objAnalyser = m_objAudio.createAnalyser();
				m_objAnalyser.fftSize = (m_objOptions.fftSize !== undefined) ? m_objOptions.fftSize : 64;
				m_arrBins = new Uint8Array(m_objAnalyser.frequencyBinCount);
				m_objSourceNode.connect(m_objAnalyser);
				m_objAnalyser.connect(m_objAudio.destination);
			}
		}
		if ((m_objAudio !== null) && (m_objAudio.state === 'suspended'))
		{
			m_objAudio.resume();
		}
	}

	function play(strURL_a, fnFailed_a)
	{
		var objPromise;
		m_objPlayer.src = strURL_a;
		objPromise = m_objPlayer.play();
		if ((objPromise !== undefined) && isFunction(objPromise.then))
		{
			objPromise.then(null, fnFailed_a);
		}
	}

	function onEnded()
	{
		if (m_blnPlaying && !m_blnStream)
		{
			call(m_objOptions.onTrackEnd);
			fetchNext();
		}
	}

	function onError()
	{
		if (m_blnPlaying && (m_objPlayer.getAttribute('src') !== ''))
		{
			if (m_blnStream)
			{
				status('Stream error - retrying in ' + m_objOptions.streamRetrySeconds + 's...');
				later(function() { startStream(currentSource()); }, m_objOptions.streamRetrySeconds);
			}
			else
			{
				status('Playback error (wrong ROM or a broken file) - skipping...');
				fetchNext();
			}
		}
	}

	function startStream(objSource_a)
	{
		var strURL = streamURL(objSource_a);
		m_blnStream = true;
		status('Connecting to ' + strURL);
		call(m_objOptions.onTrack, { title:objSource_a.name, artist:'', album:'', year:'', filename:'', source:objSource_a, stream:true });
		play(strURL, function()
		{
			if (m_blnPlaying)
			{
				status('Stream failed - retrying in ' + m_objOptions.streamRetrySeconds + 's...');
				later(function() { startStream(objSource_a); }, m_objOptions.streamRetrySeconds);
			}
		});
	}

	// ====================================================================================================
	// THE MQ

	function fetchNext()
	{
		var objSource = currentSource();
		var objXHR, strAfter;
		clearTimer();
		if (m_blnPlaying && !m_blnFetching && (objSource !== null))
		{
			if (objSource.type === 'icy')
			{
				startStream(objSource);
			}
			else
			{
				m_blnStream = false;
				m_blnFetching = true;
				strAfter = m_strPointer;
				objXHR = new XMLHttpRequest();
				objXHR.open('POST', objSource.url, true);
				objXHR.responseType = 'arraybuffer';
				objXHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				objXHR.onload = function()
				{
					var strDisposition, arrMatch, strFilename = null;
					m_blnFetching = false;
					if (m_blnPlaying)
					{
						if (objXHR.status === 200)
						{
							strDisposition = objXHR.getResponseHeader('Content-Disposition') || '';
							arrMatch = strDisposition.match(/filename="?([^";]+)"?/);
							if (arrMatch !== null) { strFilename = arrMatch[1].replace(/\s+$/, ''); }
							// a message has a filename; the MQ's own replies (JSON) don't: the end of the channel
							if ((strFilename !== null) && (strFilename !== m_strPointer) && (objXHR.response.byteLength > 0))
							{
								m_strPointer = strFilename;
								fetched(strFilename, strAfter, new Uint8Array(objXHR.response));
							}
							else
							{
								endOfChannel();
							}
						}
						else
						{
							status('HTTP ' + objXHR.status + ' - retrying in ' + m_objOptions.retrySeconds + 's...');
							later(fetchNext, m_objOptions.retrySeconds);
						}
					}
				};
				objXHR.onerror = function()
				{
					m_blnFetching = false;
					if (m_blnPlaying)
					{
						status('Can\'t reach ' + objSource.url + ' - retrying in ' + m_objOptions.retrySeconds + 's...');
						later(fetchNext, m_objOptions.retrySeconds);
					}
				};
				objXHR.send('action=fetch&q=' + encodeURIComponent(objSource.queue) + '&after=' + encodeURIComponent(strAfter));
			}
		}
	}

	// a message arrived: decoded, then a song played, a picture or text handed over
	function fetched(strFilename_a, strAfter_a, arrZOS_a)
	{
		var arrData = null;
		var strType;
		try
		{
			arrData = decode(arrZOS_a);
		}
		catch (objError_a)
		{
			arrData = null;
		}
		if ((arrData === null) || (arrData.length === 0))
		{
			status('Couldn\'t decode ' + strFilename_a + ' - skipping...');
			fetchNext();
		}
		else
		{
			strType = typeOf(arrData);
			if (m_strLastType === 'jpg')
			{
				// a picture stays up a moment before whatever's next
				later(function() { use(strType, strFilename_a, strAfter_a, arrData); }, m_objOptions.imageGap);
			}
			else
			{
				use(strType, strFilename_a, strAfter_a, arrData);
			}
			m_strLastType = strType;
		}
	}

	function use(strType_a, strFilename_a, strAfter_a, arrData_a)
	{
		var objInfo, objImage, strText;
		if (strType_a === 'mp3')
		{
			// songs (not jingles) go in the history, for previous()
			if ((arrData_a.length >= m_objOptions.minTrackSize) || (m_arrHistory.length === 0))
			{
				m_arrHistory.push({ source:m_intSource, after:strAfter_a });
			}
			objInfo = tags(arrData_a);
			objInfo.filename = strFilename_a;
			objInfo.source = currentSource();
			objInfo.stream = false;
			if (objInfo.title === '') { objInfo.title = strFilename_a; }
			if (m_strTrackURL !== null) { URL.revokeObjectURL(m_strTrackURL); }
			m_strTrackURL = URL.createObjectURL(new Blob([arrData_a], { type:'audio/mpeg' }));
			status('Playing ' + objInfo.title);
			call(m_objOptions.onTrack, objInfo);
			play(m_strTrackURL, function()
			{
				if (m_blnPlaying && !m_blnPaused)
				{
					fetchNext();
				}
			});
		}
		else if (strType_a === 'jpg')
		{
			if (m_strImageURL !== null) { URL.revokeObjectURL(m_strImageURL); }
			m_strImageURL = URL.createObjectURL(new Blob([arrData_a], { type:'image/jpeg' }));
			objImage = new Image();
			objImage.onload = function()
			{
				call(m_objOptions.onImage, objImage, strFilename_a);
			};
			objImage.src = m_strImageURL;
			fetchNext();
		}
		else
		{
			if (arrData_a.length <= m_objOptions.maxTextLength)
			{
				strText = utf8(arrData_a, 0, arrData_a.length);
				call(m_objOptions.onText, strText, strFilename_a);
			}
			fetchNext();
		}
	}

	// the channel has nothing more: the behaviour says what next
	function endOfChannel()
	{
		var blnFetch = true;
		call(m_objOptions.onEndOfChannel, currentSource());
		switch (m_objOptions.behaviour)
		{
			case 'repeatQueue':
				m_strPointer = '';
				status('End of channel - repeating it...');
				break;
			case 'nextQueue':
			case 'repeatAllQueues':
				m_intSource = (m_intSource + 1) % m_arrSources.length;
				m_strPointer = '';
				status('End of channel - on to ' + currentSource().name + '...');
				break;
			case 'randomQueue':
				m_intSource = rndIndex(m_arrSources.length);
				m_strPointer = '';
				status('End of channel - on to ' + currentSource().name + '...');
				break;
			case 'stopAtEnd':
				blnFetch = false;
				status('End of channel - stopped.');
				m_objThis.stop();
				break;
			default:
				// waitAtEnd: wait for new messages on the same channel
				blnFetch = false;
				status('Waiting ' + m_objOptions.waitSeconds + 's for new songs...');
				later(fetchNext, m_objOptions.waitSeconds);
				break;
		}
		if (blnFetch)
		{
			fetchNext();
		}
	}

	function rndIndex(intN_a)
	{
		return Math.floor(Math.random() * intN_a);
	}

	function loadROM(fnDone_a)
	{
		var varROM = m_objOptions.rom;
		var objXHR, objReader;
		if ((m_arrROM !== null) || (varROM === undefined) || (varROM === null))
		{
			fnDone_a();
		}
		else if (varROM instanceof Uint8Array)
		{
			m_arrROM = varROM;
			fnDone_a();
		}
		else if (varROM instanceof ArrayBuffer)
		{
			m_arrROM = new Uint8Array(varROM);
			fnDone_a();
		}
		else if ((window.Blob !== undefined) && (varROM instanceof Blob))
		{
			objReader = new FileReader();
			objReader.onload = function()
			{
				m_arrROM = new Uint8Array(objReader.result);
				fnDone_a();
			};
			objReader.readAsArrayBuffer(varROM);
		}
		else
		{
			status('Loading the ROM...');
			objXHR = new XMLHttpRequest();
			objXHR.open('GET', String(varROM), true);
			objXHR.responseType = 'arraybuffer';
			objXHR.onload = function()
			{
				if (objXHR.status === 200)
				{
					m_arrROM = new Uint8Array(objXHR.response);
				}
				else
				{
					status('Couldn\'t load the ROM (HTTP ' + objXHR.status + ')');
				}
				fnDone_a();
			};
			objXHR.onerror = function()
			{
				status('Couldn\'t load the ROM');
				fnDone_a();
			};
			objXHR.send();
		}
	}

	// ====================================================================================================
	// CONTROLS

	// start playing a list of sources (call it from a key press or a tap)
	this.start = function(arrSources_a)
	{
		var blnNeedROM = false;
		halt();
		m_arrSources = arrSources_a || [];
		processArray(m_arrSources, function(objSource_a)
		{
			if (objSource_a.type !== 'icy') { blnNeedROM = true; }
		});
		if (m_arrSources.length === 0)
		{
			status('No channels to play.');
		}
		else
		{
			setup();
			m_intSource = (m_objOptions.behaviour === 'randomQueue') ? rndIndex(m_arrSources.length) : 0;
			m_strPointer = '';
			m_arrHistory = [];
			m_strLastType = '';
			m_blnPlaying = true;
			m_blnPaused = false;
			loadROM(function()
			{
				if (m_blnPlaying)
				{
					if (blnNeedROM && (m_arrROM === null))
					{
						status('The MQ channels need the station\'s ROM (the rom option).');
						m_objThis.stop();
					}
					else
					{
						fetchNext();
					}
				}
			});
		}
	};

	// everything stopped (no onStop: start() uses it too)
	function halt()
	{
		clearTimer();
		m_blnPlaying = false;
		m_blnPaused = false;
		m_blnFetching = false;
		if (m_objPlayer !== null)
		{
			m_objPlayer.pause();
			m_objPlayer.removeAttribute('src');
			m_objPlayer.load();
		}
		m_blnStream = false;
	}

	this.stop = function()
	{
		var blnWas = m_blnPlaying;
		halt();
		if (blnWas)
		{
			call(m_objOptions.onStop);
		}
	};

	// the ROM (the station's key file): a URL, a File / Blob, an ArrayBuffer or a Uint8Array - used
	// from the next start()
	this.setROM = function(varROM_a)
	{
		m_objOptions.rom = varROM_a;
		m_arrROM = null;
	};

	this.hasROM = function()
	{
		return (m_arrROM !== null) || ((m_objOptions.rom !== undefined) && (m_objOptions.rom !== null));
	};

	this.pause = function()
	{
		if (m_blnPlaying && !m_blnPaused)
		{
			m_objPlayer.pause();
			m_blnPaused = true;
		}
	};

	this.resume = function()
	{
		if (m_blnPlaying && m_blnPaused)
		{
			setup();
			m_objPlayer.play();
			m_blnPaused = false;
		}
	};

	this.toggle = function()
	{
		if (m_blnPaused) { m_objThis.resume(); } else { m_objThis.pause(); }
		return m_blnPaused;
	};

	// the next message on an MQ channel; on a stream, the next channel
	this.next = function()
	{
		if (m_blnPlaying && !m_blnFetching)
		{
			m_blnPaused = false;
			if (m_blnStream)
			{
				m_intSource = (m_intSource + 1) % m_arrSources.length;
				m_strPointer = '';
			}
			fetchNext();
		}
	};

	// the song before this one (MQ channels)
	this.previous = function()
	{
		var objWas;
		if (m_blnPlaying && !m_blnFetching && !m_blnStream && (m_arrHistory.length >= 2))
		{
			m_arrHistory.pop();
			objWas = m_arrHistory.pop();
			m_intSource = objWas.source;
			m_strPointer = objWas.after;
			m_blnPaused = false;
			fetchNext();
		}
	};

	// straight to channel n of the list
	this.channel = function(intN_a)
	{
		if (m_blnPlaying && (intN_a >= 0) && (intN_a < m_arrSources.length))
		{
			m_intSource = intN_a;
			m_strPointer = '';
			m_blnFetching = false;
			fetchNext();
		}
	};

	this.setVolume = function(flt_a)
	{
		m_objOptions.volume = flt_a;
		if (m_objPlayer !== null) { m_objPlayer.volume = flt_a; }
	};

	this.setBehaviour = function(str_a)
	{
		m_objOptions.behaviour = str_a;
	};

	this.isPlaying = function()
	{
		return m_blnPlaying;
	};

	this.isPaused = function()
	{
		return m_blnPaused;
	};

	this.isStream = function()
	{
		return m_blnStream;
	};

	this.getSource = function()
	{
		return currentSource();
	};

	this.getSourceIndex = function()
	{
		return m_intSource;
	};

	// how far through the song (0-1; 0 on a stream, which has no end)
	this.getProgress = function()
	{
		var fltResult = 0;
		if ((m_objPlayer !== null) && isFinite(m_objPlayer.duration) && (m_objPlayer.duration > 0))
		{
			fltResult = m_objPlayer.currentTime / m_objPlayer.duration;
		}
		return fltResult;
	};

	// jump to a point in the song (0-1)
	this.seek = function(flt_a)
	{
		if ((m_objPlayer !== null) && isFinite(m_objPlayer.duration) && (m_objPlayer.duration > 0))
		{
			m_objPlayer.currentTime = flt_a * m_objPlayer.duration;
		}
	};

	// the sound's levels now, low notes first (0-255 each), into arrLevels_a (any length up to
	// the analyser's bins: 32 with the default fftSize); all 0 without an analyser
	this.getLevels = function(arrLevels_a)
	{
		var intI;
		if ((m_objAnalyser !== null) && m_blnPlaying && !m_blnPaused)
		{
			m_objAnalyser.getByteFrequencyData(m_arrBins);
		}
		for (intI = 0; intI < arrLevels_a.length; intI++)
		{
			arrLevels_a[intI] = ((m_arrBins !== null) && m_blnPlaying && !m_blnPaused && (intI < m_arrBins.length)) ? m_arrBins[intI] : 0;
		}
		return arrLevels_a;
	};
}
