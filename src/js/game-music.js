// Music sprites - a PotentJS page that plays a little song made of JMusic music sprites and shows its
// channels as they go: the drums run an 8 beat loop and conduct the rest - the hats and the bass
// kick in after two bars, the tune after four, the arpeggio is held back a while longer.
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
//
// Keys: Space or Enter plays / stops; 1-9, 0 mute a channel; + - the tempo.
// Touch or mouse: PLAY, FASTER, SLOWER at the sides; tap a channel to mute it.
function musicDemo()
{
	var m_objThis = this;
	var XRES = 448, YRES = 256, ROWY = 46, ROWH = 18;
	var C_BACK = '#05060f', C_EDGE = '#00f0ff', C_TEXT = '#e8f8ff', C_DIM = '#4a5a7a', C_HOT = '#ff3cc8', C_ON = '#00f0ff';

	// a bar is 8 steps; the drums' sequence: two bars alone, then the hats and the bass come in
	// on the beat, two more, then the tune; the arpeggio is held back 16 more of their steps
	var BEAT = ['N3', '-', 'N14', '-', 'N3', 'N3', 'N14', '-'];
	var FILL = ['N3', '-', 'N14', '-', 'N14', 'N12', 'N10', 'N8'];
	var INTRO = [].concat(BEAT, BEAT,
		[ { play:'hats bass', step:1 }, { event:'bass in' } ], BEAT, FILL,
		[ { play:'tune arp', step:1 }, { hold:'arp', steps:16 }, { event:'tune in' } ]);
	// then round and round from the first beat after the tune came in (the cues aren't given again)
	var DRUMS = INTRO.concat(BEAT, BEAT, BEAT, FILL, [ -(INTRO.length + 1) ]);

	var SONG = [
		{ name:'drums', classes:'demo', channel:0, delay:12, volume:13, length:4, sequence:DRUMS },
		{ name:'hats', classes:'demo', channel:1, delay:12, volume:7, length:2, sequence:['N1', 'N1', 'N1', 'N1', 'N1', 'N1', 'N1', ['N1', 1, 10], -1] },
		{ name:'bass', classes:'demo', channel:2, delay:12, volume:13, sequence:[
			'A2', 'A2', 'A3', 'A2', 'E2', 'A2', 'G2', 'A2',
			'F2', 'F2', 'F3', 'F2', 'C3', 'F2', 'E2', 'F2',
			'C2', 'C2', 'C3', 'C2', 'G2', 'C3', 'B2', 'C3',
			'G2', 'G2', 'G3', 'G2', 'D3', 'G2', 'E2', 'D2', -1 ] },
		{ name:'tune', classes:'demo', channel:3, delay:12, volume:12, sequence:[
			['E5', 2], ['A4', 2], 'C5', 'D5', ['E5', 2],
			['F5', 2], 'E5', 'D5', ['C5', 3], '-',
			['E5', 2], ['G5', 2], 'F5', 'E5', ['D5', 2],
			['B4', 3], 'C5', ['D5', 3], '-', -1 ] },
		{ name:'arp', classes:'demo', channel:4, delay:6, volume:8, length:5, sequence:[
			'A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'C5', 'A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'C5',
			'F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'A4', 'F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'A4',
			'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'E4', 'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'E4',
			'G4', 'B4', 'D5', 'G5', 'D5', 'B4', 'G4', 'B4', 'G4', 'B4', 'D5', 'G5', 'D5', 'B4', 'G4', 'B4', -1 ] }
	];

	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objMusic = new JMusic({ channels:10, onEvent:function(strEvent_a, strBy_a) { m_strEvent = strEvent_a + ' (from ' + strBy_a + ')'; m_intEventT = 100; } });
	var m_objPad;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	var m_arrWas = [], m_arrMuted = [];
	var m_blnPlaying = false, m_intTempo = 100, m_strEvent = '', m_intEventT = 0, m_intFrames = 0;
	var m_arrIDs = [];

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function pressed(intKey_a)
	{
		var blnDown = down(intKey_a);
		var blnResult = blnDown && !m_arrWas[intKey_a];
		m_arrWas[intKey_a] = blnDown;
		return blnResult;
	}

	function playOrStop()
	{
		var intI;
		if (m_blnPlaying)
		{
			m_objMusic.pauseMusicSpriteByName('demo');
			m_objMusic.getSound().quiet();
			m_blnPlaying = false;
		}
		else
		{
			// the drums from the top; the others back to their starts, paused, waiting for their cue
			for (intI = 0; intI < m_arrIDs.length; intI++) { m_objMusic.pauseMusicSpriteByID(m_arrIDs[intI]); }
			m_objMusic.processMusicSprites(m_arrIDs, function(intID_a, objSprite_a) { objSprite_a.next = 1; objSprite_a.step = 0; objSprite_a.steps = 0; });
			m_objMusic.playMusicSpriteByName('drums', 1);
			m_blnPlaying = true;
		}
	}

	function mute(intCh_a)
	{
		m_arrMuted[intCh_a] = !m_arrMuted[intCh_a];
		m_objMusic.processMusicSprites(m_arrIDs, function(intID_a, objSprite_a)
		{
			if (objSprite_a.channel === intCh_a) { objSprite_a.ismuted = m_arrMuted[intCh_a]; }
		});
	}

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		var intK, intRow;
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		if (pressed(32) || pressed(13)) { playOrStop(); }
		for (intK = 0; intK <= 9; intK++)
		{
			if (pressed(48 + intK)) { mute((intK + 9) % 10); }
		}
		if (pressed(187) || pressed(107) || pressed(61)) { m_intTempo = Math.min(300, m_intTempo + 10); m_objMusic.setTempo(m_intTempo); }
		if (pressed(189) || pressed(109) || pressed(173)) { m_intTempo = Math.max(30, m_intTempo - 10); m_objMusic.setTempo(m_intTempo); }
		processArray(m_objPad.taps(), function(objTap_a)
		{
			intRow = Math.floor((objTap_a.y - ROWY) / ROWH);
			if ((objTap_a.x >= 64) && (objTap_a.x < 384) && (intRow >= 0) && (intRow <= 9)) { mute(intRow); }
		});
		// the music keeps time here, in the game loop
		m_objMusic.step();
		if (m_intEventT > 0) { m_intEventT--; }
		m_intFrames++;
	};

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var intCh, intY, objSprite, intID, intK, intStep, strState;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = C_BACK;
		objContext_a.fillRect(0, 0, XRES, YRES);
		objContext_a.textBaseline = 'top';
		objContext_a.font = 'bold 11px monospace';
		objContext_a.fillStyle = C_EDGE;
		objContext_a.fillText('JMUSIC - MUSIC SPRITES, 10 CHANNELS', 70, 8);
		objContext_a.font = '9px monospace';
		objContext_a.fillStyle = C_DIM;
		objContext_a.fillText('TEMPO ' + m_intTempo + '%   ' + (m_blnPlaying ? 'PLAYING' : 'STOPPED - SPACE / PLAY'), 70, 24);
		if (m_intEventT > 0) { objContext_a.fillStyle = C_HOT; objContext_a.fillText('EVENT: ' + m_strEvent, 240, 24); }
		for (intCh = 0; intCh <= 9; intCh++)
		{
			intY = ROWY + intCh * ROWH;
			objContext_a.strokeStyle = '#1c2a60';
			objContext_a.strokeRect(66.5, intY + 0.5, 314, ROWH - 3);
			objContext_a.fillStyle = m_arrMuted[intCh] ? C_DIM : C_TEXT;
			objContext_a.fillText(String((intCh + 1) % 10) + (m_arrMuted[intCh] ? ' MUTED' : ''), 70, intY + 4);
			objSprite = null; intID = -1;
			m_objMusic.processMusicSprites(m_arrIDs, function(intI_a, objS_a) { if (objS_a.channel === intCh) { objSprite = objS_a; intID = intI_a; } });
			if (objSprite !== null)
			{
				strState = m_objMusic.isPlaying(intID) ? 'PLAYING' : ((objSprite.held > 0) ? 'HELD' : 'WAITING');
				objContext_a.fillStyle = m_objMusic.isPlaying(intID) ? C_ON : C_DIM;
				objContext_a.fillText(objSprite.name.toUpperCase(), 116, intY + 4);
				objContext_a.fillText(strState, 160, intY + 4);
				// the 16 steps around where it is
				intStep = m_objMusic.getStep(intID);
				for (intK = 0; intK < 16; intK++)
				{
					objContext_a.fillStyle = ((intStep > 0) && (((intStep - 1) % 16) === intK)) ? C_HOT : '#20264a';
					objContext_a.fillRect(212 + intK * 10, intY + 3, 8, ROWH - 9);
				}
			}
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var intI;
		for (intI = 0; intI <= 9; intI++) { m_arrMuted.push(false); }
		m_objMusic.addMusicSpritesToLibrary(SONG);
		m_arrIDs = m_objMusic.useMusicSpritesByClass('demo');
		m_objPad = new JPad({ controls:[
			{ type:'button', x:32, y:128, size:22, key:32, label:'PLAY' },
			{ type:'button', x:416, y:90, size:20, key:187, label:'FASTER' },
			{ type:'button', x:416, y:166, size:20, key:189, label:'SLOWER' }
		], showalways:true });
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:false, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:XRES, yresolution:YRES, cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new musicDemo();
g_objGame.run();
