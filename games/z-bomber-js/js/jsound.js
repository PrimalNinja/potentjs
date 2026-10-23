// JSound - sound effects and tunes, the way 8-bit sound chips make them (WebAudio, nothing to load):
// a few channels, each playing one sound at a time - a square wave tone or noise - whose pitch
// slides and whose volume fades to nothing over its length. Pitches are given as an AY / YM chip's
// periods (higher = lower note), so sounds from 8-bit games carry over as they are.
//
//   var objSound = new JSound({ channels:3 });
//   objSound.addSoundsToLibrary([ { name:'drop', period:60, slide:4, volume:13, frames:6, noise:true } ]);
//   objSound.addTunesToLibrary([ { name:'theme', channel:0, volume:10, loop:true, notes:[ [166, 18], [0, 9], ... ] } ]);
//   objSound.playSoundByName('drop', 2);  objSound.playTune('theme');
//   objSound.update();      <- once a game iteration (the slides, fades and tunes move on a step)
//
// Browsers only start sound after the player has touched, clicked or pressed a key: JSound
// starts itself on the first of those.
//
// When the page goes out of the foreground (another tab, minimised, phone locked) the sound
// pauses, and carries on from where it was when the page comes back (option pauseifhidden:false
// to keep it going).
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JSound(objOptions_a)
{
	var DEF_CHANNELS = 3;
	var DEF_CLOCK = 1750000;			// the sound chip's clock: a tone's frequency is clock / (16 * period)
	var DEF_VOLUME = 0.25;				// the loudest a channel gets (of 1)

	var m_objThis = this;
	var m_objOptions = objOptions_a;
	var m_objAudio = null;
	var m_objMaster = null;
	var m_arrChannels = [];
	var m_arrSoundLibrary = [];
	var m_arrTuneLibrary = [];
	var m_objTune = null;
	var m_blnEnabled = true;
	var m_objNoise = null;

	if (m_objOptions === undefined) { m_objOptions = {}; }
	if (m_objOptions.channels === undefined) { m_objOptions.channels = DEF_CHANNELS; }
	if (m_objOptions.clock === undefined) { m_objOptions.clock = DEF_CLOCK; }
	if (m_objOptions.volume === undefined) { m_objOptions.volume = DEF_VOLUME; }
	if (m_objOptions.pauseifhidden === undefined) { m_objOptions.pauseifhidden = true; }

	for (var intI = 0; intI < m_objOptions.channels; intI++)
	{
		m_arrChannels.push({ osc:null, oscgain:null, noise:null, noisegain:null, period:0, slide:0, volume:0, total:0, left:0, isnoise:false });
	}

	// ====================================================================================================
	// STARTING (on the first touch, click or key)

	function start()
	{
		if (m_objAudio === null)
		{
			var AudioContext = window.AudioContext || window.webkitAudioContext;
			if (AudioContext !== undefined)
			{
				m_objAudio = new AudioContext();
				m_objMaster = m_objAudio.createGain();
				m_objMaster.gain.value = m_objOptions.volume;
				m_objMaster.connect(m_objAudio.destination);

				// a second of white noise, played faster or slower for the noise's pitch
				m_objNoise = m_objAudio.createBuffer(1, m_objAudio.sampleRate, m_objAudio.sampleRate);
				var arrData = m_objNoise.getChannelData(0);
				for (var intI = 0; intI < arrData.length; intI++)
				{
					arrData[intI] = Math.random() * 2 - 1;
				}

				for (var intC = 0; intC < m_arrChannels.length; intC++)
				{
					var objChannel = m_arrChannels[intC];
					objChannel.oscgain = m_objAudio.createGain();
					objChannel.oscgain.gain.value = 0;
					objChannel.oscgain.connect(m_objMaster);
					objChannel.osc = m_objAudio.createOscillator();
					objChannel.osc.type = 'square';
					objChannel.osc.connect(objChannel.oscgain);
					objChannel.osc.start();
					objChannel.noisegain = m_objAudio.createGain();
					objChannel.noisegain.gain.value = 0;
					objChannel.noisegain.connect(m_objMaster);
					objChannel.noise = m_objAudio.createBufferSource();
					objChannel.noise.buffer = m_objNoise;
					objChannel.noise.loop = true;
					objChannel.noise.connect(objChannel.noisegain);
					objChannel.noise.start();
				}
			}
		}
		if ((m_objAudio !== null) && (m_objAudio.state === 'suspended'))
		{
			m_objAudio.resume();
		}
	}

	// out of the foreground: the sound held where it is; back: it carries on
	function isHidden()
	{
		return (document.hidden === true) || (document.webkitHidden === true);
	}

	function visibilityChanged()
	{
		if (m_objOptions.pauseifhidden && (m_objAudio !== null))
		{
			if (isHidden())
			{
				if (m_objAudio.state === 'running') { m_objAudio.suspend(); }
			}
			else
			{
				if (m_objAudio.state === 'suspended') { m_objAudio.resume(); }
			}
		}
	}

	document.addEventListener('visibilitychange', visibilityChanged, false);
	document.addEventListener('webkitvisibilitychange', visibilityChanged, false);

	window.addEventListener('keydown', start, false);
	window.addEventListener('mousedown', start, false);
	window.addEventListener('touchstart', start, false);
	window.addEventListener('touchend', start, false);

	// ====================================================================================================
	// PLAYING

	// a chip volume (0-15) as a gain: each step about 3dB, as the chips do
	function gainOf(intVolume_a)
	{
		var fltResult = 0;
		if (intVolume_a > 0)
		{
			fltResult = Math.pow(2, (intVolume_a - 15) / 2);
		}
		return fltResult;
	}

	// a channel's sound as it is now, to the WebAudio nodes
	function sendChannel(objChannel_a)
	{
		if (m_objAudio !== null)
		{
			var fltTime = m_objAudio.currentTime;
			var intVolume = 0;
			if ((objChannel_a.left > 0) && (objChannel_a.period > 0) && m_blnEnabled)
			{
				intVolume = Math.ceil(objChannel_a.volume * objChannel_a.left / objChannel_a.total);
			}

			if (objChannel_a.isnoise)
			{
				// the chip's noise: clock / (16 * period) changes a second, the buffer has sampleRate
				var fltRate = (m_objOptions.clock / (16 * Math.max(1, objChannel_a.period))) / m_objAudio.sampleRate;
				fltRate = Math.max(0.02, Math.min(1, fltRate));
				objChannel_a.noise.playbackRate.setValueAtTime(fltRate, fltTime);
				objChannel_a.noisegain.gain.setValueAtTime(gainOf(intVolume), fltTime);
				objChannel_a.oscgain.gain.setValueAtTime(0, fltTime);
			}
			else
			{
				var fltFrequency = m_objOptions.clock / (16 * Math.max(1, objChannel_a.period));
				fltFrequency = Math.max(20, Math.min(20000, fltFrequency));
				objChannel_a.osc.frequency.setValueAtTime(fltFrequency, fltTime);
				objChannel_a.oscgain.gain.setValueAtTime(gainOf(intVolume), fltTime);
				objChannel_a.noisegain.gain.setValueAtTime(0, fltTime);
			}
		}
	}

	// play a sound on a channel (it replaces what the channel was playing):
	// period (the pitch: an AY period, 1-4095; noise 1-31), slide (added to the period each
	// iteration), volume (0-15: where it starts; it fades to 0), frames (its length in iterations)
	this.play = function(intChannel_a, intPeriod_a, intSlide_a, intVolume_a, intFrames_a, blnNoise_a)
	{
		if ((intChannel_a >= 0) && (intChannel_a < m_arrChannels.length) && (intFrames_a > 0))
		{
			var objChannel = m_arrChannels[intChannel_a];
			objChannel.period = intPeriod_a;
			objChannel.slide = intSlide_a;
			objChannel.volume = intVolume_a;
			objChannel.total = intFrames_a;
			objChannel.left = intFrames_a;
			objChannel.isnoise = (blnNoise_a === true);
			sendChannel(objChannel);
		}
	};

	// is a channel playing?
	this.isBusy = function(intChannel_a)
	{
		return (m_arrChannels[intChannel_a].left > 0);
	};

	// every channel silent, the tune stopped
	this.quiet = function()
	{
		m_objTune = null;
		for (var intC = 0; intC < m_arrChannels.length; intC++)
		{
			m_arrChannels[intC].left = 0;
			sendChannel(m_arrChannels[intC]);
		}
	};

	// sound on / off (off: everything plays silently, so turning it on again carries on)
	this.setEnabled = function(blnEnabled_a)
	{
		m_blnEnabled = blnEnabled_a;
		for (var intC = 0; intC < m_arrChannels.length; intC++)
		{
			sendChannel(m_arrChannels[intC]);
		}
	};

	this.isEnabled = function()
	{
		return m_blnEnabled;
	};

	// ====================================================================================================
	// LIBRARIES: sounds and tunes by name

	// sounds: { name, period, slide, volume, frames, noise }
	this.addSoundsToLibrary = function(arrSounds_a)
	{
		processArray(arrSounds_a, function(objSound_a)
		{
			m_arrSoundLibrary.push(objSound_a);
		});
	};

	this.playSoundByName = function(strName_a, intChannel_a)
	{
		processArray(m_arrSoundLibrary, function(objSound_a)
		{
			var blnFound = (objSound_a.name === strName_a);
			if (blnFound)
			{
				m_objThis.play(intChannel_a, objSound_a.period, objSound_a.slide, objSound_a.volume, objSound_a.frames, objSound_a.noise);
			}
			return blnFound;
		});
	};

	// tunes: { name, channel, volume, loop, notes:[ [period, frames], ... ] } (period 0: a rest)
	this.addTunesToLibrary = function(arrTunes_a)
	{
		processArray(arrTunes_a, function(objTune_a)
		{
			m_arrTuneLibrary.push(objTune_a);
		});
	};

	this.playTune = function(strName_a)
	{
		m_objTune = null;
		processArray(m_arrTuneLibrary, function(objTune_a)
		{
			var blnFound = (objTune_a.name === strName_a);
			if (blnFound)
			{
				m_objTune = { tune:objTune_a, note:0, wait:0 };
			}
			return blnFound;
		});
	};

	this.stopTune = function()
	{
		if (m_objTune !== null)
		{
			m_arrChannels[m_objTune.tune.channel].left = 0;
			sendChannel(m_arrChannels[m_objTune.tune.channel]);
		}
		m_objTune = null;
	};

	this.isTunePlaying = function()
	{
		return (m_objTune !== null);
	};

	// ====================================================================================================
	// ONCE AN ITERATION: the tune's next note when it's due, every channel's slide and fade

	this.update = function()
	{
		if (m_objTune !== null)
		{
			m_objTune.wait--;
			if (m_objTune.wait <= 0)
			{
				var arrNotes = m_objTune.tune.notes;
				if (m_objTune.note >= arrNotes.length)
				{
					if (m_objTune.tune.loop)
					{
						m_objTune.note = 0;
					}
				}
				if (m_objTune.note < arrNotes.length)
				{
					var arrNote = arrNotes[m_objTune.note];
					if (arrNote[0] > 0)
					{
						m_objThis.play(m_objTune.tune.channel, arrNote[0], 0, m_objTune.tune.volume, Math.max(1, arrNote[1] - 1), false);
					}
					m_objTune.wait = arrNote[1];
					m_objTune.note++;
				}
				else
				{
					m_objTune = null;
				}
			}
		}

		for (var intC = 0; intC < m_arrChannels.length; intC++)
		{
			var objChannel = m_arrChannels[intC];
			if (objChannel.left > 0)
			{
				objChannel.left--;
				objChannel.period += objChannel.slide;
				if (objChannel.period < 1) { objChannel.period = 1; }
				if (objChannel.isnoise && (objChannel.period > 31)) { objChannel.period = 31; }
				sendChannel(objChannel);
			}
		}
	};
}
