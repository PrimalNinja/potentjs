// STACKER - a falling block puzzle. Ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The seven four-block pieces fall into a well ten wide and twenty deep. Turn them and slide
// them so they fill whole rows: a full row goes. Two games: MARATHON (levels go up every ten
// rows, faster and faster) and SPRINT (forty rows, as quick as you can).
//
// Keys: O P (or left / right) move, A (or down) down a bit, Space drop, Q (or up) turn right,
//       W turn left, H hold the piece for later, M the music on / off.
// Touch: the pad on the left, DROP / TURN / HOLD on the right.
//
// The screen is the Next's: a 40 x 32 tile screen (JTileGrid: a colour variant a cell, so one
// block tile makes all seven colours) over a 256 x 192 picture (the backdrop and the big title),
// sprites over both. The game runs 50 iterations a second - the Next's frames.
function stackerGame()
{
	var m_objThis = this;
	var G = GFX_STACKER;

	// the canvas: the game's 320 x 256 in the middle, the touch controls either side
	var GAMEX = 64;
	var XRES = 448;
	var YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:72, y:32, w:280, h:192 };

	var BW = 10, BH = 22, WX = 15, WY = 4;
	// tile colour variants (the Next's palette rows): 0 the frame / floor, 1-7 the pieces, 8 a
	// flash, 9 grey, 10-13 words
	var C_WHITE = 10, C_YELLOW = 11, C_CYAN = 12, C_PINK = 13;

	// keys (keyCodes)
	var K_O = 79, K_P = 80, K_A = 65, K_Q = 81, K_W = 87, K_H = 72, K_M = 77, K_SPACE = 32, K_ENTER = 13;

	var SHAPES = [
		"01112131202122230212223210111213",
		"10201121102011211020112110201121",
		"10011121101121120111211210011112",
		"10200111101121221121021200011112",
		"00101121201121120111122210011102",
		"00011121102011120111212210110212",
		"20011121101112220111210200101112"
	];
	var GRAVITY = "4036322823191511070504040403030302020201";
	var KICKX = [0, -1, 1, 0, -1, 1, -2, 2];
	var KICKY = [0, 0, 0, -1, -1, -1, 0, 0];
	var BOB = [0, 1, 2, 3, 2, 1, 0, -1, -2, -3, -2, -1];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:6 });		// 0-2 the sound effects, 3-5 the music
	var m_objMusic = new JMusic({ sound:m_objSound });
	var m_objPad;
	var m_objGrid;
	var m_objBack;					// the picture behind the tiles (the Next's Layer 2): 256 x 192
	var m_objBackContext;
	var m_blnLoaded = false;

	var m_arrKeyMap = [];
	var m_objViewPort = null;
	var m_arrTouches = [];
	var m_objMouse = null;

	// the game
	var m_arrBoard = [];
	var m_arrBag = [], m_intBagN = 7, m_arrNext = [0, 0, 0];
	var m_intCur = 0, m_intRot = 0, m_intCX = 0, m_intCY = 0, m_intGY = 0;
	var m_intHold = -1, m_blnHeld = false, m_intLockT = 0, m_intResets = 0, m_intFallT = 0;
	var m_intDas = 0, m_intDasW = 0, m_intRotWas = 0, m_blnDropWas = false, m_blnHoldWas = false, m_blnMusWas = false;
	var m_arrOX = [0, 0, 0, 0], m_arrOY = [0, 0, 0, 0], m_arrOGX = [0, 0, 0, 0], m_arrOGY = [0, 0, 0, 0], m_blnShown = false;
	var m_intScore = 0, m_intLines = 0, m_intLevel = 1, m_intStartLv = 1, m_intMode = 0, m_blnOver = true;
	var m_arrBest = [0, 0], m_intBestT = 0, m_intTimeF = 0, m_intFrames = 0, m_blnMusic = true;
	var m_arrFull = [], m_intFlashW = 0;

	// what the game is doing (the Next version's loops, one step an iteration)
	var m_strState = 'loading';
	var m_intWait = 0;
	var m_intStep = 0;
	var m_intTitleWas = 1;

	// ====================================================================================================
	// KEYS

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function way()
	{
		var intResult = 0;
		if (down(K_O) || down(KEY_LEFT)) { intResult = -1; }
		if (down(K_P) || down(KEY_RIGHT)) { intResult = 1; }
		return intResult;
	}

	function fire()
	{
		return down(K_SPACE);
	}

	// ====================================================================================================
	// TEXT, NUMBERS

	function clock(intF_a)
	{
		var intS = Math.floor(intF_a / 50);
		var intCS = (intF_a % 50) * 2;
		return String(Math.floor(intS / 60)) + ':' + rightStr('0' + String(intS % 60), 2) + '.' + rightStr('0' + String(intCS), 2);
	}

	function text(intX_a, intY_a, str_a, intColour_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intColour_a);
	}

	// ====================================================================================================
	// THE PICTURE BEHIND (Layer 2 on the Next: its colours are RRRGGGBB)

	function backRect(intX_a, intY_a, intW_a, intH_a, intColour_a)
	{
		m_objBackContext.fillStyle = rgb332ToCSS(intColour_a);
		m_objBackContext.fillRect(intX_a, intY_a, intW_a, intH_a);
	}

	function backdrop()
	{
		backRect(0, 0, 256, 192, 1);
		for (var intK = 0; intK <= 30; intK++)
		{
			var intX = (intK * 53) % 244;
			var intY = (intK * 97) % 180;
			backRect(intX, intY, 8, 8, 0x25);
			backRect(intX + 1, intY + 1, 6, 6, 1);
		}
	}

	// big letters from the font, z times the size: c1 on the top half, c2 the bottom, a shadow
	function big(intX_a, intY_a, str_a, intZ_a, intC1_a, intC2_a)
	{
		m_objSprites.paintBigText(m_objBackContext, 'stacker_ink', str_a, intX_a, intY_a, intZ_a, rgb332ToCSS(intC1_a), rgb332ToCSS(intC2_a), rgb332ToCSS(0), 2);
	}

	// ====================================================================================================
	// SOUND: the music - an old Russian folk tune, as JMusic music sprites. The tune plays its
	// first eight bars alone, then cues the bass and the drums in; from then on all three go round
	// together (A A B: the tune's bars 9-24 line up with the bass's 1-16, its bars 1-8 with the
	// bass's 17-24, and the cue puts the bass back on its first bar each time round)

	// the tune from letters and lengths in eighths (the Next's notes: a A4 ... h A5, s G#4, t G#5, r a rest)
	function melody(str_a)
	{
		var arrResult = [];
		var objNotes = { a:'A4', b:'B4', c:'C5', d:'D5', e:'E5', f:'F5', g:'G5', h:'A5', s:'G#4', t:'G#5', r:'-' };
		for (var intI = 0; intI < str_a.length; intI += 2)
		{
			arrResult.push([objNotes[str_a.charAt(intI)], parseInt(str_a.charAt(intI + 1), 10)]);
		}
		return arrResult;
	}

	// a bar of bass for each chord: root and octave, eighths
	function bass(str_a)
	{
		var arrResult = [];
		var objRoots = { E:['E2', 'E3'], A:['A2', 'A3'], D:['D2', 'D3'], C:['C2', 'C3'] };
		for (var intI = 0; intI < str_a.length; intI++)
		{
			for (var intK = 0; intK < 4; intK++)
			{
				arrResult.push(objRoots[str_a.charAt(intI)][0], objRoots[str_a.charAt(intI)][1]);
			}
		}
		return arrResult;
	}

	function songs()
	{
		var strA = 'e2b1c1d2c1b1a2a1c1e2d1c1b3c1d2e2c2a2a4r1d2f1h2g1f1e3c1e2d1c1b2b1c1d2e2c2a2a2r2';
		var strB = 'e4c4d4b4c4a4s4b2r2e4c4d4b4c2e2h4t8';
		m_objMusic.addMusicSpritesToLibrary([
			{ name:'tune', classes:'stacker', channel:3, delay:9, volume:10,
				sequence:[].concat(melody(strA), [ { play:'bass drums', step:1 } ], melody(strA), melody(strB), [ -1 ]) },
			{ name:'bass', classes:'stacker', channel:4, delay:9, volume:9, length:6,
				sequence:[].concat(bass('EAEADCEA'), bass('AEAEAEAE'), bass('EAEADCEA'), [ -1 ]) },
			{ name:'drums', classes:'stacker', channel:5, delay:9, volume:8, length:3,
				sequence:[ 'N14', '-', 'N3', '-', 'N14', 'N14', 'N3', '-', -1 ] }
		]);
		m_objMusic.useMusicSpritesByClass('stacker');
	}

	// on: the tune from the top (if it isn't going already); off: all of it back to the start
	function music(blnOn_a)
	{
		if (blnOn_a && m_blnMusic && !m_blnOver)
		{
			if (!m_objMusic.isPlaying(m_objMusic.getMusicSpriteIDByName('tune')))
			{
				m_objMusic.rewindMusicSpriteByName('stacker');
				m_objMusic.playMusicSpriteByName('tune', 1);
			}
		}
		else
		{
			m_objMusic.rewindMusicSpriteByName('stacker');
		}
	}

	// ====================================================================================================
	// THE PIECES

	function shapeCell(intP_a, intR_a, intJ_a, intXY_a)
	{
		return parseInt(SHAPES[intP_a].charAt(intR_a * 8 + intJ_a * 2 + intXY_a), 10);
	}

	function fits(intX_a, intY_a, intR_a)
	{
		var blnResult = true;
		for (var intJ = 0; intJ < 4; intJ++)
		{
			var intA = intX_a + shapeCell(m_intCur, intR_a, intJ, 0);
			var intB = intY_a + shapeCell(m_intCur, intR_a, intJ, 1);
			if ((intA < 0) || (intA >= BW) || (intB >= BH))
			{
				blnResult = false;
			}
			else if ((intB >= 0) && (m_arrBoard[intB * BW + intA] !== 0))
			{
				blnResult = false;
			}
		}
		return blnResult;
	}

	function nextPiece()
	{
		if (m_intBagN >= 7)
		{
			m_arrBag = [0, 1, 2, 3, 4, 5, 6];
			for (var intJ = 6; intJ >= 1; intJ--)
			{
				var intR = rnd(intJ + 1);
				var intT = m_arrBag[intJ];
				m_arrBag[intJ] = m_arrBag[intR];
				m_arrBag[intR] = intT;
			}
			m_intBagN = 0;
		}
		var intResult = m_arrBag[m_intBagN];
		m_intBagN++;
		return intResult;
	}

	function gravity()
	{
		var intL = Math.min(m_intLevel, 20);
		return parseInt(GRAVITY.substr((intL - 1) * 2, 2), 10);
	}

	// a cell of the well drawn from what's in it
	function cell(intX_a, intY_a)
	{
		if (intY_a >= 2)
		{
			var intC = m_arrBoard[intY_a * BW + intX_a];
			if (intC !== 0)
			{
				m_objGrid.put(WX + intX_a, WY + intY_a, G.T_BLOCK, intC);
			}
			else
			{
				m_objGrid.put(WX + intX_a, WY + intY_a, G.T_FLOOR, 0);
			}
		}
	}

	function hideCur()
	{
		if (m_blnShown)
		{
			for (var intJ = 0; intJ < 4; intJ++)
			{
				cell(m_arrOGX[intJ], m_arrOGY[intJ]);
				cell(m_arrOX[intJ], m_arrOY[intJ]);
			}
		}
		m_blnShown = false;
	}

	// the piece and its ghost (where it would land)
	function show()
	{
		var intJ;
		hideCur();
		m_intGY = m_intCY;
		while (fits(m_intCX, m_intGY + 1, m_intRot))
		{
			m_intGY++;
		}
		for (intJ = 0; intJ < 4; intJ++)
		{
			var intA = m_intCX + shapeCell(m_intCur, m_intRot, intJ, 0);
			var intB = shapeCell(m_intCur, m_intRot, intJ, 1);
			m_arrOGX[intJ] = intA; m_arrOGY[intJ] = m_intGY + intB;
			m_arrOX[intJ] = intA; m_arrOY[intJ] = m_intCY + intB;
		}
		for (intJ = 0; intJ < 4; intJ++)
		{
			if (m_arrOGY[intJ] >= 2) { m_objGrid.put(WX + m_arrOGX[intJ], WY + m_arrOGY[intJ], G.T_GHOST, m_intCur + 1); }
		}
		for (intJ = 0; intJ < 4; intJ++)
		{
			if (m_arrOY[intJ] >= 2) { m_objGrid.put(WX + m_arrOX[intJ], WY + m_arrOY[intJ], G.T_BLOCK, m_intCur + 1); }
		}
		m_blnShown = true;
	}

	function spawn()
	{
		m_intRot = 0; m_intCX = 3; m_intCY = 0;
		m_intLockT = 0; m_intResets = 0; m_intFallT = 0; m_blnShown = false;
		if (!fits(m_intCX, m_intCY, m_intRot))
		{
			m_blnOver = true;
		}
		else
		{
			if (fits(m_intCX, m_intCY + 1, m_intRot)) { m_intCY++; }
			show();
		}
	}

	// piece p drawn small at x, y, or cleared (p < 0)
	function mini(intP_a, intX_a, intY_a)
	{
		var intJ;
		for (intJ = 0; intJ <= 11; intJ++)
		{
			m_objGrid.put(intX_a + intJ % 4, intY_a + Math.floor(intJ / 4), G.T_PANEL, 0);
		}
		if (intP_a >= 0)
		{
			var intUp = (intP_a === 0) ? 1 : 0;
			for (intJ = 0; intJ < 4; intJ++)
			{
				m_objGrid.put(intX_a + shapeCell(intP_a, 0, intJ, 0), intY_a + shapeCell(intP_a, 0, intJ, 1) - intUp, G.T_BLOCK, intP_a + 1);
			}
		}
	}

	function showNext()
	{
		for (var intK = 0; intK <= 2; intK++)
		{
			mini(m_arrNext[intK], 29, 9 + intK * 4);
		}
	}

	function showHold()
	{
		mini(m_intHold, 4, 9);
	}

	function newPiece()
	{
		m_intCur = m_arrNext[0]; m_arrNext[0] = m_arrNext[1]; m_arrNext[1] = m_arrNext[2]; m_arrNext[2] = nextPiece();
		showNext();
		spawn();
		m_blnHeld = false;
	}

	// ====================================================================================================
	// THE SCREEN'S PARTS

	function well()
	{
		m_objGrid.put(WX - 1, WY + 1, G.T_FRAME, 0);
		m_objGrid.put(WX + BW, WY + 1, G.T_FRAME + 2, 0);
		for (var intI = 0; intI < BW; intI++)
		{
			m_objGrid.put(WX + intI, WY + 1, G.T_FRAME + 1, 0);
			m_objGrid.put(WX + intI, WY + BH, G.T_FRAME + 6, 0);
		}
		for (var intK = 2; intK < BH; intK++)
		{
			m_objGrid.put(WX - 1, WY + intK, G.T_FRAME + 3, 0);
			m_objGrid.put(WX + BW, WY + intK, G.T_FRAME + 4, 0);
			for (intI = 0; intI < BW; intI++)
			{
				m_objGrid.put(WX + intI, WY + intK, G.T_FLOOR, 0);
			}
		}
		m_objGrid.put(WX - 1, WY + BH, G.T_FRAME + 5, 0);
		m_objGrid.put(WX + BW, WY + BH, G.T_FRAME + 7, 0);
	}

	function box(intX_a, intY_a, intW_a, intH_a, str_a)
	{
		var intA, intB;
		m_objGrid.put(intX_a - 1, intY_a - 1, G.T_FRAME, 0); m_objGrid.put(intX_a + intW_a, intY_a - 1, G.T_FRAME + 2, 0);
		m_objGrid.put(intX_a - 1, intY_a + intH_a, G.T_FRAME + 5, 0); m_objGrid.put(intX_a + intW_a, intY_a + intH_a, G.T_FRAME + 7, 0);
		for (intA = 0; intA < intW_a; intA++)
		{
			m_objGrid.put(intX_a + intA, intY_a - 1, G.T_FRAME + 1, 0); m_objGrid.put(intX_a + intA, intY_a + intH_a, G.T_FRAME + 6, 0);
		}
		for (intB = 0; intB < intH_a; intB++)
		{
			m_objGrid.put(intX_a - 1, intY_a + intB, G.T_FRAME + 3, 0); m_objGrid.put(intX_a + intW_a, intY_a + intB, G.T_FRAME + 4, 0);
			for (intA = 0; intA < intW_a; intA++)
			{
				m_objGrid.put(intX_a + intA, intY_a + intB, G.T_PANEL, 0);
			}
		}
		text(intX_a, intY_a - 2, str_a, C_WHITE);
	}

	function stats()
	{
		text(3, 16, 'SCORE', C_WHITE);
		text(3, 17, rightStr('0000000' + String(m_intScore), 7), C_YELLOW);
		text(3, 18, 'ROWS' + rightStr('    ' + strBasic(m_intLines), 5), C_CYAN);
		text(3, 19, 'LEVEL' + rightStr('   ' + strBasic(m_intLevel), 4), C_CYAN);
		if (m_intMode === 1) { text(3, 20, 'TIME', C_WHITE); }
	}

	function panels()
	{
		box(3, 8, 6, 4, 'HOLD');
		box(28, 8, 6, 12, 'NEXT');
		box(3, 16, 9, 6, '');
		text(1, 4, (m_intMode === 0) ? 'MARATHON' : 'SPRINT 40', C_YELLOW);
		stats();
		showNext();
		showHold();
	}

	function points(intN_a)
	{
		m_intScore += intN_a;
		text(3, 17, rightStr('0000000' + String(m_intScore), 7), C_YELLOW);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_blnOver = true;
		music(false);
		m_objGrid.clear();
		backdrop();
		big(16, 12, 'STACK', 6, 0xFC, 0xEC);
		big(112, 66, 'ER', 4, 0x1F, 0x0B);
		text(6, 20, 'FILL WHOLE ROWS TO CLEAR THEM.', C_WHITE);
		text(3, 24, 'O P MOVE  A DOWN  SPACE DROP', C_CYAN);
		text(3, 25, 'Q W TURN  H HOLD  M MUSIC ON/OFF', C_CYAN);
		text(8, 27, '(C) 2026 CYBORG UNICORN', C_WHITE);
		text(12, 26, 'SPACE: START', C_YELLOW);
		titleText();
		m_intTitleWas = 1;
		m_strState = 'title';
	}

	function titleText()
	{
		if (m_intMode === 0)
		{
			text(8, 21, '<  MARATHON  >          ', C_YELLOW);
			text(8, 22, 'START AT LEVEL' + strBasic(m_intStartLv) + ' (Q A) ', C_WHITE);
			text(8, 23, 'BEST ' + rightStr('000000' + String(m_arrBest[0]), 7) + '     ', C_PINK);
		}
		else
		{
			text(8, 21, '<   SPRINT   >          ', C_YELLOW);
			text(8, 22, '40 ROWS AGAINST THE CLOCK', C_WHITE);
			if (m_intBestT > 0)
			{
				text(8, 23, 'BEST ' + clock(m_intBestT) + '        ', C_PINK);
			}
			else
			{
				text(8, 23, '                  ', C_PINK);
			}
		}
	}

	function titleStep()
	{
		var intV = 0;
		if (way() < 0) { intV = 1; }
		if (way() > 0) { intV = 2; }
		if (down(K_Q) || down(KEY_UP)) { intV = 3; }
		if (down(K_A) || down(KEY_DOWN)) { intV = 4; }
		if (fire() || down(K_ENTER)) { intV = 9; }
		if (intV === 0)
		{
			m_intTitleWas = 0;
		}
		else if (m_intTitleWas === 0)
		{
			m_intTitleWas = 1;
			if ((intV === 1) || (intV === 2)) { m_intMode = 1 - m_intMode; }
			if ((intV === 3) && (m_intStartLv < 15)) { m_intStartLv++; }
			if ((intV === 4) && (m_intStartLv > 1)) { m_intStartLv--; }
			titleText();
			if (intV === 9)
			{
				gameStart();
			}
		}
	}

	// ====================================================================================================
	// A GAME

	function gameStart()
	{
		m_objGrid.clear();
		backdrop();
		m_arrBoard = [];
		for (var intI = 0; intI < BW * BH; intI++)
		{
			m_arrBoard.push(0);
		}
		m_intScore = 0; m_intLines = 0; m_intLevel = m_intStartLv; m_intTimeF = 0; m_blnOver = false;
		if (m_intMode === 1) { m_intLevel = 1; }
		m_intHold = -1; m_intBagN = 7;
		m_blnDropWas = true;						// (the Space that started it isn't a drop)
		well();
		for (var intK = 0; intK <= 2; intK++)
		{
			m_arrNext[intK] = nextPiece();
		}
		panels();
		newPiece();
		m_objMusic.rewindMusicSpriteByName('stacker');	// (the tune from the start)
		music(true);
		m_strState = 'play';
	}

	function playStep()
	{
		if ((m_intMode === 1) && (m_intFrames % 5 === 0))
		{
			text(3, 21, clock(m_intTimeF) + ' ', C_YELLOW);
		}
		controls();
		if (m_strState === 'play')
		{
			if (m_blnOver)
			{
				gameOver();
			}
			else if ((m_intMode === 1) && (m_intLines >= 40))
			{
				sprintDone();
			}
		}
	}

	function controls()
	{
		var blnMoved = false;
		var blnDone = false;
		var intW = way();

		// left / right: once, then repeating after a moment
		if (intW !== 0)
		{
			if (intW !== m_intDasW)
			{
				m_intDasW = intW; m_intDas = 0;
				if (fits(m_intCX + intW, m_intCY, m_intRot)) { m_intCX += intW; blnMoved = true; m_objSound.play(1, 400, 0, 6, 2, false); }
			}
			else
			{
				m_intDas++;
				if ((m_intDas >= 10) && (m_intDas % 2 === 0))
				{
					if (fits(m_intCX + intW, m_intCY, m_intRot)) { m_intCX += intW; blnMoved = true; }
				}
			}
		}
		else
		{
			m_intDasW = 0;
		}

		// turning (with a nudge sideways or up if it won't fit)
		var intT = 0;
		if (down(K_Q) || down(KEY_UP)) { intT = 1; }
		if (down(K_W)) { intT = 3; }
		if ((intT !== 0) && (m_intRotWas === 0))
		{
			if (turn((m_intRot + intT) & 3)) { blnMoved = true; m_objSound.play(1, 300, -10, 7, 3, false); }
		}
		m_intRotWas = intT;

		// hold
		if (down(K_H))
		{
			if ((!m_blnHoldWas) && (!m_blnHeld))
			{
				hideCur();
				if (m_intHold < 0)
				{
					m_intHold = m_intCur; showHold(); newPiece();
				}
				else
				{
					var intJ = m_intHold; m_intHold = m_intCur; m_intCur = intJ; showHold(); spawn();
				}
				m_blnHeld = true;
				m_objSound.play(2, 150, 10, 9, 6, false);
				blnDone = true;
			}
			m_blnHoldWas = true;
		}
		else
		{
			m_blnHoldWas = false;
		}

		// the music
		if (down(K_M))
		{
			if (!m_blnMusWas) { m_blnMusic = !m_blnMusic; m_objSound.quiet(); music(true); }
			m_blnMusWas = true;
		}
		else
		{
			m_blnMusWas = false;
		}

		// a hard drop
		if (!blnDone)
		{
			if (fire())
			{
				if (!m_blnDropWas)
				{
					m_blnDropWas = true;
					points((m_intGY - m_intCY) * 2);
					m_intCY = m_intGY;
					show();
					m_objSound.play(2, 60, 4, 13, 6, true);
					lock();
					blnDone = true;
				}
			}
			else
			{
				m_blnDropWas = false;
			}
		}

		if (!blnDone)
		{
			// falling: faster while A (or down) is held
			var intDrop = gravity();
			if (down(K_A) || down(KEY_DOWN))
			{
				if (intDrop > 2) { intDrop = 2; }
			}
			m_intFallT++;
			if (m_intFallT >= intDrop)
			{
				m_intFallT = 0;
				if (fits(m_intCX, m_intCY + 1, m_intRot))
				{
					m_intCY++; blnMoved = true; m_intLockT = 0;
					if ((intDrop === 2) && (gravity() > 2)) { points(1); }
				}
			}
			// resting on something: it locks after a moment (moving it puts that off, up to 15 times)
			if (!fits(m_intCX, m_intCY + 1, m_intRot))
			{
				m_intLockT++;
				if (blnMoved && (m_intResets < 15)) { m_intLockT = 0; m_intResets++; }
				if (m_intLockT >= 30)
				{
					lock();
					blnDone = true;
				}
			}
			if ((!blnDone) && blnMoved) { show(); }
		}
	}

	function turn(intR_a)
	{
		var blnResult = false;
		var intJ = 0;
		while ((!blnResult) && (intJ <= 7) && ((intJ < 6) || (m_intCur === 0)))
		{
			if (fits(m_intCX + KICKX[intJ], m_intCY + KICKY[intJ], intR_a))
			{
				m_intCX += KICKX[intJ]; m_intCY += KICKY[intJ]; m_intRot = intR_a; blnResult = true;
			}
			intJ++;
		}
		return blnResult;
	}

	// the piece stays where it is: full rows flash and go, then the next piece comes
	function lock()
	{
		var intJ, intX, intY;
		for (intJ = 0; intJ < 4; intJ++)
		{
			if (m_arrOY[intJ] >= 0) { m_arrBoard[m_arrOY[intJ] * BW + m_arrOX[intJ]] = m_intCur + 1; }
		}
		for (intJ = 0; intJ < 4; intJ++)
		{
			cell(m_arrOGX[intJ], m_arrOGY[intJ]);
			cell(m_arrOX[intJ], m_arrOY[intJ]);
		}
		m_blnShown = false;
		m_objSound.play(2, 80, 2, 9, 4, true);
		m_arrFull = [];
		for (intY = 0; intY < BH; intY++)
		{
			var blnFull = true;
			for (intX = 0; intX < BW; intX++)
			{
				if (m_arrBoard[intY * BW + intX] === 0) { blnFull = false; }
			}
			if (blnFull) { m_arrFull.push(intY); }
		}
		if (m_arrFull.length > 0)
		{
			m_intFlashW = 0;
			m_strState = 'flash';
		}
		else
		{
			m_intWait = 4;
			m_strState = 'lockwait';
		}
	}

	// the full rows flash for 16 frames, then go
	function flashStep()
	{
		var intJ, intX, intY;
		var intN = m_arrFull.length;
		for (intJ = 0; intJ < intN; intJ++)
		{
			for (intX = 0; intX < BW; intX++)
			{
				if (m_intFlashW % 4 < 2) { m_objGrid.put(WX + intX, WY + m_arrFull[intJ], G.T_BLOCK, 8); }
				else { cell(intX, m_arrFull[intJ]); }
			}
		}
		if (m_intFlashW === 0)
		{
			if (intN === 4) { m_objSound.play(0, 100, -3, 15, 30, false); }
			else { m_objSound.play(1, 200, -8, 13, 15, false); }
		}
		m_intFlashW++;
		if (m_intFlashW > 15)
		{
			for (intJ = 0; intJ < intN; intJ++)
			{
				for (intY = m_arrFull[intJ]; intY >= 1; intY--)
				{
					for (intX = 0; intX < BW; intX++)
					{
						m_arrBoard[intY * BW + intX] = m_arrBoard[(intY - 1) * BW + intX];
					}
				}
				for (intX = 0; intX < BW; intX++)
				{
					m_arrBoard[intX] = 0;
				}
			}
			for (intY = 2; intY < BH; intY++)
			{
				for (intX = 0; intX < BW; intX++)
				{
					cell(intX, intY);
				}
			}
			m_intLines += intN;
			points([10, 30, 50, 80][intN - 1] * 10 * m_intLevel);
			if ((m_intMode === 0) && (Math.floor(m_intLines / 10) + m_intStartLv > m_intLevel))
			{
				m_intLevel = Math.floor(m_intLines / 10) + m_intStartLv;
				m_objSound.play(2, 50, -2, 14, 30, false);
			}
			stats();
			m_intWait = 4;
			m_strState = 'lockwait';
		}
	}

	function gameOver()
	{
		m_objSound.quiet();
		music(false);
		m_intStep = BH - 1;
		m_intWait = 0;
		m_strState = 'fill';
	}

	// the well fills with grey from the bottom, a row every 3 frames
	function fillStep()
	{
		if (m_intWait > 0)
		{
			m_intWait--;
		}
		else if (m_intStep >= 2)
		{
			for (var intI = 0; intI < BW; intI++)
			{
				m_objGrid.put(WX + intI, WY + m_intStep, G.T_BLOCK, 9);
			}
			m_objSound.play(1, 100 + m_intStep * 20, 0, 10, 3, true);
			m_intStep--;
			m_intWait = 2;
		}
		else
		{
			text(WX + 1, WY + 10, 'GAME OVER', C_PINK);
			if ((m_intMode === 0) && (m_intScore > m_arrBest[0]))
			{
				m_arrBest[0] = m_intScore;
				text(WX, WY + 12, 'BEST SCORE', C_YELLOW);
			}
			m_intWait = 100;
			m_strState = 'endwait';
		}
	}

	function sprintDone()
	{
		m_objSound.quiet();
		m_blnOver = true;
		music(false);
		text(3, 21, clock(m_intTimeF) + ' ', C_YELLOW);
		text(WX + 1, WY + 10, '40 ROWS!', C_YELLOW);
		text(WX + 1, WY + 12, clock(m_intTimeF), C_WHITE);
		if ((m_intBestT === 0) || (m_intTimeF < m_intBestT))
		{
			m_intBestT = m_intTimeF;
			text(WX + 1, WY + 14, 'BEST TIME', C_PINK);
		}
		m_intStep = 0;
		m_intWait = 0;
		m_strState = 'fanfare';
	}

	function fanfareStep()
	{
		if (m_intWait > 0)
		{
			m_intWait--;
		}
		else if (m_intStep <= 4)
		{
			m_objSound.play(0, 200 - m_intStep * 30, 0, 13, 10, false);
			m_intStep++;
			m_intWait = 9;
		}
		else
		{
			m_intWait = 100;
			m_strState = 'endwait';
		}
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);

		if (m_blnLoaded)
		{
			switch (m_strState)
			{
				case 'start':
					titleStart();
					break;
				case 'title':
					titleStep();
					break;
				case 'play':
					playStep();
					break;
				case 'flash':
					flashStep();
					break;
				case 'lockwait':
					m_intWait--;
					if (m_intWait <= 0)
					{
						newPiece();
						m_strState = 'play';
					}
					break;
				case 'fill':
					fillStep();
					break;
				case 'fanfare':
					fanfareStep();
					break;
				case 'endwait':
					m_intWait--;
					if (m_intWait <= 0) { m_strState = 'endfire'; }
					break;
				case 'endfire':
					if (fire() || down(K_ENTER)) { m_strState = 'endrelease'; }
					break;
				case 'endrelease':
					if (!fire()) { titleStart(); }
					break;
				default:
					break;
			}
			m_intFrames++;
			if ((m_intMode === 1) && (!m_blnOver)) { m_intTimeF++; }
		}
		m_objMusic.step();
		m_objSound.update();
	};

	// ====================================================================================================
	// DRAWING: the backdrop, the tiles, the sprites, the touch controls

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a;
		m_arrTouches = objTouches_a;
		m_objMouse = objMouse_a;

		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		// the strip left of the picture behind (MARATHON and the panels' edges are there) in its blue
		objContext_a.fillStyle = rgb332ToCSS(1);
		objContext_a.fillRect(VIEW.x, VIEW.y, GAMEX + 32 - VIEW.x, VIEW.h);
		if (m_blnLoaded)
		{
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			objContext_a.drawImage(m_objBack, 32, 32);
			m_objGrid.paint(objContext_a, 0, 0);
			if (m_strState === 'title')
			{
				// a few blocks bobbing about
				for (var intK = 0; intK <= 6; intK++)
				{
					var intBob = BOB[(Math.floor(m_intFrames / 5) + intK * 2) % 12];
					m_objSprites.stampSprite(objContext_a, 'big', 1, 24 + intK * 40, 138 + intBob, 'stacker_s' + (intK + 1));
				}
			}
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var arrTileImages = [];
		for (var intN = 0; intN <= 13; intN++)
		{
			arrTileImages.push('stacker_t' + intN);
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			{ name:'big', classes:'stacker', imagename:'stacker_s0', x:0, y:0, w:16, h:16, imagex:G.S_BIG.col * 16, imagey:G.S_BIG.row * 16, imagew:16, imageh:16, sequence:[1, 0] }
		]);

		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrTileImages, first:0, firstcode:0, transparent:G.T_CLEAR });
		m_objBack = document.createElement('canvas');
		m_objBack.width = 256;
		m_objBack.height = 192;
		m_objBackContext = m_objBack.getContext('2d');
		m_objBackContext.imageSmoothingEnabled = false;

		songs();

		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:190, size:26, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:196, size:20, key:K_SPACE, label:'DROP' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:150, size:18, key:K_Q, label:'TURN' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:98, size:16, key:K_H, label:'HOLD' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:50, size:14, key:K_M, label:'MUSIC' },
			{ type:'button', x:VIEW.x + 32, y:110, size:16, key:K_W, label:'TURN L' }
		] });

		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('stacker'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			m_strState = 'start';
		});

		m_objGameLoop.process(
			{
				iterationspersecond: 50,		// the Next's frames
				cbOnIteration: m_objThis.onIterationGameLoop
			});

		m_objCanvas.render(
			{
				autoclear: true,
				autorotate: true,
				buffered: true,				// drawn at 1:1, scaled in one go: no stitches between tiles
				pixelated: true,
				hidpi: true,				// sharp on phones (their 2 or 3 pixels to a CSS pixel)
				maxtouches: 6,
				target: 'canOutput',
				xresolution: VIEW.w,
				yresolution: VIEW.h,
				xorigin: VIEW.x,
				yorigin: VIEW.y,
				cbOnRender: m_objThis.onRenderCanvas
			});
	};
}

var g_objGame = new stackerGame();
g_objGame.run();
