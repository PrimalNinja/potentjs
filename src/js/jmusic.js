// JMusic - music sprites. A music sprite is a pattern - a sequence of notes on a channel
// (0-9) - kept in a library and put into play just as JSprites' sprites are: used, played
// (animated) from any step, paused, carried on, played once or looped. Its sequence works as a
// sprite's does: notes in place of frames, 0 to stop, -n to go back to step n.
//
// A music sprite can conduct the others from inside its own sequence: start them, pause them,
// hold some back for a while, tell the game something's happened. So one channel can run an 8
// beat loop while the bass and the tune wait, and kick in on the beat the drums say.
//
// No collisions - but the timing: JMusic steps in the game loop (step() once an
// iteration, not in the canvas's frames), so the music never skips when drawing does, and the
// game's events and the beat stay locked together.
//
//   var objMusic = new JMusic({ channels:10 });
//   objMusic.addMusicSpritesToLibrary([
//       { name:'drums', classes:'song1', channel:0, delay:12, noise:true, volume:12,
//         sequence:[ 'N2', '-', 'N12', '-', 'N2', 'N2', 'N12', '-', -1 ] },
//       { name:'bass', classes:'song1', channel:1, delay:12, volume:13,
//         sequence:[ 'C2', '-', 'C3', '-', 'G2', '-', 'A#2', 'B2', -1 ] } ]);
//   objMusic.useMusicSpritesByClass('song1');
//   objMusic.playMusicSpriteByName('drums', 1);           <- the bass waits for its cue
//   each game iteration:  objMusic.step();
//
// A step of a sequence is:
//   'C4', 'F#3', 'Bb5'   a note (a letter, # or b, an octave); '-' or '.' a rest
//   'N12'                noise at period 12 (1-31: low numbers hiss high)
//   120                  a raw period (the AY's: bigger is lower)
//   [ note, steps, volume, slide ]   a note held for steps (default 1), its own volume and slide
//   0                    stop (the sprite pauses here; played again, it carries on after it)
//   -n                   go back to step n (a loop)
//   { play:'bass tune', step:1 }   start music sprites (names or classes, space between); step
//                        optional (without it they carry on from where they paused)
//   { pause:'tune' }               pause them
//   { hold:'tune', steps:16 }      pause them for 16 of this sprite's steps, then carry on
//   { event:'chorus' }             options.onEvent('chorus', this sprite's name)
//   (commands take no time: the next note follows at once)
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JMusic(objOptions_a)
{
	var m_objThis = this;
	var m_objOptions = objOptions_a || {};
	var NOTES = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

	if (m_objOptions.channels === undefined) { m_objOptions.channels = 10; }
	if (m_objOptions.clock === undefined) { m_objOptions.clock = 1750000; }

	// the channels sound through a JSound of their own (or the one given)
	var m_objSound = (m_objOptions.sound !== undefined) ? m_objOptions.sound : new JSound({ channels:m_objOptions.channels, clock:m_objOptions.clock, volume:m_objOptions.volume });
	var m_arrLibrary = [];
	var m_arrUsed = [];
	var m_intTempo = 100;		// percent: 200 twice as fast

	// ====================================================================================================
	// HELPERS

	function idByName(arr_a, strName_a)
	{
		var intResult = -1;
		var intI;
		for (intI = arr_a.length - 1; intI >= 0; intI--)
		{
			if (arr_a[intI].name === strName_a) { intResult = intI; }
		}
		return intResult;
	}

	// the used music sprites that a list of names and classes ('bass tune drums') picks out
	function idsOf(strWho_a)
	{
		var arrResult = [];
		var arrWords = String(strWho_a).split(' ');
		var intI;
		for (intI = 0; intI < m_arrUsed.length; intI++)
		{
			processArray(arrWords, function(strWord_a)
			{
				var strClasses = ' ' + m_arrUsed[intI].classes + ' ';
				if ((strWord_a !== '') && ((m_arrUsed[intI].name === strWord_a) || (strClasses.indexOf(' ' + strWord_a + ' ') >= 0)) && (arrResult.indexOf(intI) < 0))
				{
					arrResult.push(intI);
				}
			});
		}
		return arrResult;
	}

	// a note's AY period: 'C4', 'F#3', 'Bb5' (A4 = 440Hz); 0 for a rest or anything else
	function periodOf(strNote_a)
	{
		var intResult = 0;
		var arrMatch = /^([A-Ga-g])([#b]?)(-?[0-9])$/.exec(strNote_a);
		var intMidi;
		if (arrMatch !== null)
		{
			intMidi = 12 * (parseInt(arrMatch[3], 10) + 1) + NOTES[arrMatch[1].toUpperCase()] + ((arrMatch[2] === '#') ? 1 : 0) - ((arrMatch[2] === 'b') ? 1 : 0);
			intResult = Math.round(m_objOptions.clock / (16 * 440 * Math.pow(2, (intMidi - 69) / 12)));
		}
		return intResult;
	}

	// play one note step on a sprite's channel: [what, steps, volume, slide]
	function sound(objSprite_a, varNote_a)
	{
		var arrNote = (varNote_a instanceof Array) ? varNote_a : [varNote_a];
		var varWhat = arrNote[0];
		var intSteps = (arrNote[1] === undefined) ? 1 : arrNote[1];
		var intVolume = (arrNote[2] === undefined) ? objSprite_a.volume : arrNote[2];
		var intSlide = (arrNote[3] === undefined) ? objSprite_a.slide : arrNote[3];
		var intPeriod = 0;
		var blnNoise = objSprite_a.noise;
		var intFrames;
		if (typeof varWhat === 'number')
		{
			intPeriod = varWhat;
		}
		else if (/^N[0-9]+$/.test(varWhat))
		{
			intPeriod = parseInt(varWhat.substr(1), 10);
			blnNoise = true;
		}
		else
		{
			intPeriod = periodOf(varWhat);
		}
		if ((intPeriod > 0) && (intVolume > 0) && !objSprite_a.ismuted)
		{
			// it sounds for its length (the sprite's, or its steps' worth), fading as the chips do
			intFrames = (objSprite_a.length > 0) ? objSprite_a.length * intSteps : Math.max(1, delayOf(objSprite_a) * intSteps - 1);
			m_objSound.play(objSprite_a.channel, intPeriod, intSlide, intVolume, intFrames, blnNoise);
		}
		return intSteps;
	}

	function delayOf(objSprite_a)
	{
		return Math.max(1, Math.round(objSprite_a.delay * 100 / m_intTempo));
	}

	// a command step: the others started, paused, held; an event to the game
	function command(objSprite_a, objCommand_a)
	{
		if (objCommand_a.play !== undefined)
		{
			processArray(idsOf(objCommand_a.play), function(intID_a) { m_objThis.playMusicSpriteByID(intID_a, objCommand_a.step); });
		}
		if (objCommand_a.pause !== undefined)
		{
			processArray(idsOf(objCommand_a.pause), function(intID_a) { m_objThis.pauseMusicSpriteByID(intID_a); });
		}
		if (objCommand_a.hold !== undefined)
		{
			processArray(idsOf(objCommand_a.hold), function(intID_a)
			{
				// held until the holder has played this many more steps
				var objHeld = m_arrUsed[intID_a];
				objHeld.held = objSprite_a.steps + ((objCommand_a.steps === undefined) ? 1 : objCommand_a.steps);
				objHeld.heldby = objSprite_a;
			});
		}
		if ((objCommand_a.event !== undefined) && isFunction(m_objOptions.onEvent))
		{
			m_objOptions.onEvent(objCommand_a.event, objSprite_a.name);
		}
	}

	// a music sprite's next step: commands at once, then one note or rest (or a stop)
	function advance(objSprite_a)
	{
		var blnDone = false;
		var intGuard = 0;
		var varStep;
		while (!blnDone && (intGuard < 64))
		{
			intGuard++;
			if ((objSprite_a.next < 1) || (objSprite_a.next > objSprite_a.sequence.length))
			{
				// off the end: it stops (as a 0 would)
				objSprite_a.isplaying = false;
				objSprite_a.next = 1;
				blnDone = true;
			}
			else
			{
				varStep = objSprite_a.sequence[objSprite_a.next - 1];
				objSprite_a.step = objSprite_a.next;
				objSprite_a.next++;
				if (varStep === 0)
				{
					objSprite_a.isplaying = false;
					blnDone = true;
				}
				else if ((typeof varStep === 'number') && (varStep < 0))
				{
					objSprite_a.next = -varStep;
				}
				else if ((typeof varStep === 'object') && !(varStep instanceof Array) && (varStep !== null))
				{
					command(objSprite_a, varStep);
				}
				else
				{
					objSprite_a.wait = delayOf(objSprite_a) * sound(objSprite_a, varStep);
					objSprite_a.steps++;
					blnDone = true;
				}
			}
		}
	}

	// ====================================================================================================
	// THE LIBRARY

	// music sprites: { name, classes, channel (0-9), sequence, delay (iterations a step), volume
	// (0-15), length (iterations a note sounds; 0: its step), noise (all its notes noise), slide }
	this.addMusicSpritesToLibrary = function(arrSprites_a)
	{
		processArray(arrSprites_a, function(objSprite_a)
		{
			m_arrLibrary.push({
				name:objSprite_a.name, classes:(objSprite_a.classes === undefined) ? '' : objSprite_a.classes,
				channel:(objSprite_a.channel === undefined) ? 0 : objSprite_a.channel,
				sequence:objSprite_a.sequence, delay:(objSprite_a.delay === undefined) ? 12 : objSprite_a.delay,
				volume:(objSprite_a.volume === undefined) ? 12 : objSprite_a.volume,
				length:(objSprite_a.length === undefined) ? 0 : objSprite_a.length,
				noise:(objSprite_a.noise === true), slide:(objSprite_a.slide === undefined) ? 0 : objSprite_a.slide });
		});
	};

	// a library music sprite's description, to read (null if none)
	this.getMusicSpriteByName = function(strName_a)
	{
		var intID = idByName(m_arrLibrary, strName_a);
		return (intID >= 0) ? m_arrLibrary[intID] : null;
	};

	// ====================================================================================================
	// IN PLAY (used music sprites: paused until played)

	// put a library music sprite into play (paused at step 1); on another channel, optional
	this.useMusicSpriteByName = function(strName_a, intChannel_a)
	{
		var intID = idByName(m_arrLibrary, strName_a);
		var objLib, objUsed = null;
		if (intID >= 0)
		{
			objLib = m_arrLibrary[intID];
			objUsed = { name:objLib.name, classes:objLib.classes, channel:(intChannel_a === undefined) ? objLib.channel : intChannel_a,
				sequence:objLib.sequence, delay:objLib.delay, volume:objLib.volume, length:objLib.length, noise:objLib.noise, slide:objLib.slide,
				isplaying:false, ismuted:false, next:1, step:0, wait:0, held:0, heldby:null, steps:0, fresh:false };
			m_arrUsed.push(objUsed);
		}
		return (objUsed !== null) ? m_arrUsed.length - 1 : -1;
	};

	// every library music sprite of a class into play
	this.useMusicSpritesByClass = function(strClass_a)
	{
		var arrResult = [];
		processArray(m_arrLibrary, function(objLib_a)
		{
			if ((' ' + objLib_a.classes + ' ').indexOf(' ' + strClass_a + ' ') >= 0) { arrResult.push(m_objThis.useMusicSpriteByName(objLib_a.name)); }
		});
		return arrResult;
	};

	// everything out of play, every channel quiet
	this.unuseAllMusicSprites = function()
	{
		m_arrUsed = [];
		m_objSound.quiet();
	};

	this.getMusicSpriteIDByName = function(strName_a)
	{
		return idByName(m_arrUsed, strName_a);
	};

	// the ids of the used music sprites a list of names and classes picks out ('bass drums', 'song1')
	this.getMusicSpriteIDs = function(strWho_a)
	{
		return idsOf(strWho_a);
	};

	// play: from step intStep_a (optional: else from where it paused), on the next step() -
	// so everything played in one iteration starts together
	this.playMusicSpriteByID = function(intID_a, intStep_a)
	{
		var objSprite = m_arrUsed[intID_a];
		if (objSprite !== undefined)
		{
			if (intStep_a !== undefined) { objSprite.next = intStep_a; }
			if (!objSprite.isplaying || (intStep_a !== undefined)) { objSprite.fresh = true; }
			objSprite.isplaying = true;
			objSprite.held = 0;
		}
	};

	this.playMusicSpritesByIDs = function(arrIDs_a, intStep_a)
	{
		processArray(arrIDs_a, function(intID_a) { m_objThis.playMusicSpriteByID(intID_a, intStep_a); });
	};

	this.playMusicSpriteByName = function(strWho_a, intStep_a)
	{
		m_objThis.playMusicSpritesByIDs(idsOf(strWho_a), intStep_a);
	};

	// pause: it stays where it is (played again, it carries on)
	this.pauseMusicSpriteByID = function(intID_a)
	{
		if (m_arrUsed[intID_a] !== undefined) { m_arrUsed[intID_a].isplaying = false; }
	};

	this.pauseMusicSpritesByIDs = function(arrIDs_a)
	{
		processArray(arrIDs_a, function(intID_a) { m_objThis.pauseMusicSpriteByID(intID_a); });
	};

	this.pauseMusicSpriteByName = function(strWho_a)
	{
		m_objThis.pauseMusicSpritesByIDs(idsOf(strWho_a));
	};

	// rewind: paused, back at step 1, nothing held (played again, it starts from the top)
	this.rewindMusicSpriteByID = function(intID_a)
	{
		var objSprite = m_arrUsed[intID_a];
		if (objSprite !== undefined)
		{
			objSprite.isplaying = false;
			objSprite.fresh = false;
			objSprite.next = 1;
			objSprite.step = 0;
			objSprite.steps = 0;
			objSprite.wait = 0;
			objSprite.held = 0;
			objSprite.heldby = null;
		}
	};

	this.rewindMusicSpriteByName = function(strWho_a)
	{
		processArray(idsOf(strWho_a), function(intID_a) { m_objThis.rewindMusicSpriteByID(intID_a); });
	};

	// muted: it plays on (in time) but isn't heard - drop a part in and out without losing the beat
	this.muteMusicSpriteByName = function(strWho_a, blnMuted_a)
	{
		processArray(idsOf(strWho_a), function(intID_a) { m_arrUsed[intID_a].ismuted = (blnMuted_a !== false); });
	};

	// do something with each of a list of used music sprites: cb_a(id, sprite) - the sprite's
	// channel, delay, volume can be changed there
	this.processMusicSprites = function(arrIDs_a, cb_a)
	{
		processArray(arrIDs_a, function(intID_a) { if (m_arrUsed[intID_a] !== undefined) { cb_a(intID_a, m_arrUsed[intID_a]); } });
	};

	this.isPlaying = function(intID_a)
	{
		return (m_arrUsed[intID_a] !== undefined) && m_arrUsed[intID_a].isplaying && (m_arrUsed[intID_a].held === 0);
	};

	// the step a music sprite is on (1-based; 0 before it's started)
	this.getStep = function(intID_a)
	{
		return (m_arrUsed[intID_a] !== undefined) ? m_arrUsed[intID_a].step : 0;
	};

	// everything faster or slower: 100 as written, 200 twice as fast
	this.setTempo = function(intPercent_a)
	{
		m_intTempo = Math.max(10, intPercent_a);
	};

	// the JSound the music plays through (on / off, quiet)
	this.getSound = function()
	{
		return m_objSound;
	};

	// ====================================================================================================
	// ONCE A GAME ITERATION (in the game loop, not the canvas: the music keeps time when drawing skips)

	this.step = function()
	{
		// one music sprite's tick: held back, started this tick (it sounds at once, with whatever
		// started it), or counting down to its next step
		function tick(objSprite_a)
		{
			if (objSprite_a.isplaying)
			{
				if (objSprite_a.held > 0)
				{
					if ((objSprite_a.heldby === null) || !objSprite_a.heldby.isplaying || (objSprite_a.heldby.steps > objSprite_a.held))
					{
						// let go: it comes in on the holder's beat
						objSprite_a.held = 0;
						objSprite_a.fresh = false;
						advance(objSprite_a);
					}
				}
				else if (objSprite_a.fresh)
				{
					objSprite_a.fresh = false;
					advance(objSprite_a);
				}
				else
				{
					objSprite_a.wait--;
					if (objSprite_a.wait <= 0)
					{
						advance(objSprite_a);
					}
				}
			}
		}

		processArray(m_arrUsed, tick);
		// any started by a sprite further down the list: they start this tick too, in step
		processArray(m_arrUsed, function(objSprite_a)
		{
			if (objSprite_a.isplaying && objSprite_a.fresh && (objSprite_a.held === 0)) { tick(objSprite_a); }
		});
		if (m_objOptions.sound === undefined)
		{
			m_objSound.update();
		}
	};
}
