// GEM RUSH - a Boulder Dash style cave digger. Ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Pip the cyborg unicorn digs through twelve caves for gems. Get enough and the way out opens.
// Rocks and gems fall when there's nothing under them, and roll off rocks, gems and walls.
// Fireflies blow up (taking everything round them) when they touch you or the amoeba;
// butterflies blow up into gems. Drop a rock on either. The amoeba grows: shut it in and it
// turns into gems, let it grow too big and it turns to rock. The magic wall, once a rock falls
// on it, hums a while, and whatever falls through comes out the other thing (rock -> gem).
//
// Keys: Q A O P (or the arrows) move; hold Space with a way to grab what's there without
//       moving; R give up this go (a life lost); on the title O P (left / right) pick the cave.
// Touch: the pad on the left; GRAB and GIVE UP on the right.
//
// The cave is the tile screen: 20 x 15 cells of 16 x 16 (four tiles each) seen at a time; Pip is
// a sprite. Each move, every cell has its go, top to bottom (turn).
function gemrushGame()
{
	var m_objThis = this;
	var G = GFX_GEMRUSH;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:64, y:0, w:320, h:256 };
	var W = 40, CH = 22, CAVES = 12;
	// what's in a cell (+128: moved this turn, so it doesn't move again)
	var E_SP = 0, E_DI = 1, E_RK = 2, E_GM = 3, E_WL = 4, E_ST = 5, E_PL = 6, E_EX = 7;
	var E_FF = 8, E_BF = 12, E_AM = 16, E_MW = 17, E_RF = 18, E_GF = 19, E_X1 = 20, E_Y1 = 25, E_IN = 30;
	// tile colour variants: 0 the cave's colours, 1 the creatures', 2-6 words
	var C_WHITE = 2, C_YELLOW = 3, C_CYAN = 4, C_PINK = 5, C_GREEN = 6;
	var K_O = 79, K_P = 80, K_A = 65, K_Q = 81, K_R = 82, K_SPACE = 32, K_ENTER = 13;
	var NAMES = ['FIRST DIG', 'ROCK GARDEN', 'FIREFLY ROOMS', 'BUTTERFLY FARM', 'GREEN TIDE', 'MAGIC WALL', 'STEEL MAZE', 'AVALANCHE', 'FIRE AND FLUTTER', 'ZIGZAG', 'GREEN AND GOLD', 'THE VAULT'];
	var BOB = [0, 1, 2, 3, 2, 1, 0, -1, -2, -3, -2, -1];
	var DOF = [-W, 1, W, -1];
	// Pip looking at you: 31 steps open, 1 blinking, round again (steps 1-33); tapping (34-38)
	var FRONT = (function()
	{
		var arrResult = [];
		var intI;
		for (intI = 0; intI < 31; intI++) { arrResult.push(1); }
		arrResult.push(2, -1, 3, 3, 1, 1, -34);
		return arrResult;
	})();

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 1);		// Pip
	var SL_PIP = 0;
	var m_objPad, m_objGrid, m_objBack, m_objBackContext;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	var m_arrCave = [], m_arrLook = [];
	var m_intCave = 0, m_intBest = 0, m_intScore = 0, m_intLives = 0, m_intNextLife = 0;
	var m_intGems = 0, m_intNeed = 0, m_intValue = 0, m_intExtra = 0, m_intTime = 0, m_intSpeed = 0;
	var m_intAmT = 0, m_intAmN = 0, m_blnAmCan = false, m_blnAmFast = false;
	var m_intMagicT = 0, m_intMagic = 0, m_intMagicLeft = 0, m_intAmClock = 0, m_blnExitOpen = false;
	var m_intPP = 0, m_blnAlive = false, m_blnDone = false, m_intInT = 0, m_blnBorn = false;
	var m_intCamX = 0, m_intCamY = 0, m_intFace = 0, m_intIdleT = 0;
	var m_intFrames = 0, m_intSec = 0, m_intPend = 0, m_blnSnap = false, m_intFlash = 0;
	var m_intT = 0, m_intEndT = 0;

	var m_strState = 'loading', m_strAfter = '', m_intWait = 0, m_intStep = 0, m_intTitleWas = 1, m_blnFireSeen = false;

	// ====================================================================================================
	// KEYS

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// the way held: 0 none, 1 up, 2 right, 3 down, 4 left
	function way()
	{
		var intResult = 0;
		if (down(K_Q) || down(KEY_UP)) { intResult = 1; }
		if (down(K_A) || down(KEY_DOWN)) { intResult = 3; }
		if (down(K_O) || down(KEY_LEFT)) { intResult = 4; }
		if (down(K_P) || down(KEY_RIGHT)) { intResult = 2; }
		return intResult;
	}

	function fire()
	{
		return down(K_SPACE);
	}

	function text(intX_a, intY_a, str_a, intColour_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intColour_a);
	}

	function score6()
	{
		return rightStr('000000' + String(m_intScore), 6);
	}

	// wait some frames, then for fire to be let go and pressed, then go to state strAfter_a
	function waitThenFire(intFrames_a, strAfter_a)
	{
		m_intWait = intFrames_a;
		m_strAfter = strAfter_a;
		m_blnFireSeen = false;
		m_strState = 'waitfire';
	}

	// ====================================================================================================
	// THE PICTURE BEHIND (black, the big words)

	function backClear()
	{
		m_objBackContext.fillStyle = '#000';
		m_objBackContext.fillRect(0, 0, 256, 192);
	}

	function big(intX_a, intY_a, str_a, intZ_a, intC1_a, intC2_a)
	{
		m_objSprites.paintBigText(m_objBackContext, 'gemrush_ink', str_a, intX_a, intY_a, intZ_a, rgb332ToCSS(intC1_a), rgb332ToCSS(intC2_a), rgb332ToCSS(0), 2);
	}

	// ====================================================================================================
	// THE CAVE'S LOOKS: each kind of cell, its first tile (of four) and its colour variant

	function look(intE_a, intTh_a, intP_a)
	{
		m_arrLook[intE_a] = [G.T_THING + intTh_a * 4, intP_a];
	}

	function looks()
	{
		look(E_SP, 0, 0); look(E_DI, 1, 0); look(E_RK, 2, 0); look(E_WL, 7, 0); look(E_ST, 8, 0);
		look(E_PL, 0, 0); look(E_RF, 2, 0); look(E_EX, 8, 0); look(E_IN, 8, 0); look(E_MW, 7, 0);
		look(31, 0, 0);
		anim(0);
	}

	// a: the animation's step (every 4 frames)
	function anim(intA_a)
	{
		look(E_GM, 3 + intA_a % 4, 0); look(E_GF, 3 + intA_a % 4, 0);
		for (var intJ = 0; intJ <= 3; intJ++)
		{
			look(E_FF + intJ, 10 + intA_a % 4, 1);
			look(E_BF + intJ, 14 + intA_a % 4, 1);
		}
		look(E_AM, 18 + Math.floor(intA_a / 2) % 2, 1);
		if (m_intMagic === 1) { look(E_MW, 20 + intA_a % 4, 1); } else { look(E_MW, 7, 0); }
		if (m_blnExitOpen && (intA_a % 2 === 0)) { look(E_EX, 9, 0); } else { look(E_EX, 8, 0); }
		if (intA_a % 2 === 1) { look(E_IN, 9, 0); } else { look(E_IN, 8, 0); }
		look(E_X1, 24, 1); look(E_X1 + 1, 24, 1); look(E_X1 + 2, 25, 1); look(E_X1 + 3, 26, 1); look(E_X1 + 4, 26, 1);
		look(E_Y1, 24, 1); look(E_Y1 + 1, 24, 1); look(E_Y1 + 2, 25, 1); look(E_Y1 + 3, 26, 1); look(E_Y1 + 4, 26, 1);
	}

	// the part seen: 20 x 15 cells from camx, camy, from tile row 2 down
	function showCave()
	{
		for (var intY = 0; intY < 15; intY++)
		{
			for (var intX = 0; intX < 20; intX++)
			{
				var arrL = m_arrLook[m_arrCave[(m_intCamY + intY) * W + m_intCamX + intX] & 31];
				if (arrL === undefined) { arrL = [G.T_THING, 0]; }
				m_objGrid.put(intX * 2, 2 + intY * 2, arrL[0], arrL[1]);
				m_objGrid.put(intX * 2 + 1, 2 + intY * 2, arrL[0] + 1, arrL[1]);
				m_objGrid.put(intX * 2, 3 + intY * 2, arrL[0] + 2, arrL[1]);
				m_objGrid.put(intX * 2 + 1, 3 + intY * 2, arrL[0] + 3, arrL[1]);
			}
		}
	}

	function caveColours(strRow_a)
	{
		m_objGrid.setImage(0, 'gemrush_t' + strRow_a);
	}

	// cave n's cell k (0-879), info k (0 gems needed, 1 a gem's worth, 2 then, 3 time, 4 frames a
	// move, 5 the amoeba's slow time, 6 the magic wall's time)
	function caveCell(intN_a, intK_a)
	{
		var intB = GEMRUSH_CAVES[intN_a * 440 + Math.floor(intK_a / 2)];
		return ((intK_a & 1) !== 0) ? (intB & 15) : (intB >> 4);
	}

	function caveInfo(intN_a, intK_a)
	{
		return GEMRUSH_CAVES[5280 + intN_a * 8 + intK_a];
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objGrid.clear();
		backClear();
		caveColours('c0');
		looks();
		big(56, 8, 'GEM', 6, 0xFC, 0xE0);
		big(64, 62, 'RUSH', 4, 0x1F, 0x13);
		text(9, 24, 'PIP THE CYBORG UNICORN', C_PINK);
		text(3, 25, 'DIGS FOR GEMS IN TWELVE DEEP CAVES', C_WHITE);
		text(3, 27, 'Q A O P MOVE   SPACE + WAY: GRAB', C_CYAN);
		text(3, 28, 'R: GIVE UP THIS GO', C_CYAN);
		text(8, 31, '(C) 2026 CYBORG UNICORN', C_WHITE);
		titleText();
		m_intTitleWas = 1;
		m_strState = 'title';
	}

	function titleText()
	{
		if (m_intCave > m_intBest) { m_intCave = m_intBest; }
		text(4, 29, 'O P: START IN CAVE ' + String.fromCharCode(65 + m_intCave) + '  SPACE: GO', C_YELLOW);
	}

	function titleStep()
	{
		var intV = way();
		if (fire() || down(K_ENTER)) { intV = 9; }
		if (intV === 0)
		{
			m_intTitleWas = 0;
		}
		else if (m_intTitleWas === 0)
		{
			m_intTitleWas = 1;
			if ((intV === 4) && (m_intCave > 0)) { m_intCave--; }
			if ((intV === 2) && (m_intCave < m_intBest)) { m_intCave++; }
			titleText();
			if (intV === 9)
			{
				m_intScore = 0; m_intLives = 3; m_intNextLife = 500;
				caveStart();
			}
		}
	}

	// ====================================================================================================
	// A CAVE

	function loadCave()
	{
		m_arrCave = [];
		for (var intJ = 0; intJ < 880; intJ++)
		{
			var intV = caveCell(m_intCave, intJ);
			var intE = intV;
			if (intV === 6) { intE = E_IN; m_intPP = intJ; }
			else if (intV === 8) { intE = E_FF + 3; }
			else if (intV === 9) { intE = E_BF + 3; }
			else if (intV === 10) { intE = E_AM; }
			else if (intV === 11) { intE = E_MW; }
			else if (intV === 7) { intE = E_EX; }
			m_arrCave.push(intE);
		}
		m_intNeed = caveInfo(m_intCave, 0); m_intValue = caveInfo(m_intCave, 1); m_intExtra = caveInfo(m_intCave, 2);
		m_intTime = caveInfo(m_intCave, 3); m_intSpeed = caveInfo(m_intCave, 4); m_intAmT = caveInfo(m_intCave, 5); m_intMagicT = caveInfo(m_intCave, 6);
		m_intGems = 0; m_intMagic = 0; m_blnExitOpen = false; m_blnAmFast = false; m_intAmClock = 0; m_intMagicLeft = 0;
		m_blnAlive = false; m_blnBorn = false; m_blnDone = false; m_intInT = 20; m_intFace = 0; m_intIdleT = 0;
	}

	function caveStart()
	{
		m_objGrid.clear();
		backClear();
		loadCave();
		caveColours('c' + m_intCave);
		looks();
		camera(true);
		showCave();
		// the cave's name for a moment
		var strName = NAMES[m_intCave];
		m_objGrid.rect(8, 14, 24, 5, G.T_BLACK, 0);
		text(20 - Math.floor((strName.length + 7) / 2), 15, 'CAVE ' + String.fromCharCode(65 + m_intCave) + ': ' + strName, C_YELLOW);
		text(11, 17, 'GET' + strBasic(m_intNeed) + ' GEMS', C_WHITE);
		m_intWait = 70;
		m_strState = 'intro';
	}

	function caveGo()
	{
		hud(true);
		m_intT = 0; m_intEndT = 0; m_intSec = 0; m_intPend = 0;
		m_strState = 'cave';
	}

	// a frame of a cave
	function caveStep()
	{
		var intW = way();
		if (intW !== 0) { m_intPend = intW; }			// a way pressed between moves still counts
		m_blnSnap = fire();
		if (down(K_R) && m_blnAlive) { boom(m_intPP, false); }
		m_intT++;
		if (m_intT >= m_intSpeed)
		{
			m_intT = 0;
			turn();
			m_intPend = intW;
			if (m_blnBorn && (!m_blnAlive) && (m_intEndT === 0)) { m_intEndT = 1; }
		}
		if (m_intFrames % 4 === 0) { anim(Math.floor(m_intFrames / 4)); }
		if (m_intFlash > 0)
		{
			m_intFlash--;
			caveColours((m_intFlash > 0) ? 'flash' : ('c' + m_intCave));
		}
		camera(false);
		showCave();
		// the clock: a second each 50 frames, once Pip's here
		if (m_blnAlive && (!m_blnDone))
		{
			m_intSec++;
			if (m_intSec >= 50)
			{
				m_intSec = 0;
				m_intTime--;
				m_intAmClock++;
				if (m_intAmClock >= m_intAmT) { m_blnAmFast = true; }
				if ((m_intTime <= 10) && (m_intTime > 0)) { m_objSound.play(1, 120, 0, 12, 4, false); }
				hud(false);
				if (m_intTime <= 0)
				{
					m_blnAlive = false;
					text(15, 1, 'OUT OF TIME', C_PINK);
					m_objSound.play(0, 900, 30, 14, 40, false);
					m_intEndT = 1;
				}
			}
		}
		if (m_blnDone)
		{
			m_strState = 'bonus';				// the time left goes into the score
		}
		else if (m_intEndT > 0)
		{
			m_intEndT++;
			if ((m_intEndT > 120) || ((m_intEndT > 30) && fire()))
			{
				lifeLost();
			}
		}
	}

	function bonusStep()
	{
		if (m_intTime > 0)
		{
			m_intTime--;
			points(1);
			hud(false);
			m_objSound.play(1, 60 + (m_intTime % 8) * 4, 0, 12, 1, false);
		}
		else
		{
			hud(false);
			m_intWait = 40;
			m_strState = 'gotout';
		}
	}

	function gotOut()
	{
		m_intCave++;
		if ((m_intCave > m_intBest) && (m_intCave < CAVES)) { m_intBest = m_intCave; }
		if (m_intCave === CAVES)
		{
			ending();
		}
		else
		{
			caveStart();
		}
	}

	function lifeLost()
	{
		m_intLives--;
		if (m_intLives === 0)
		{
			m_objGrid.rect(10, 14, 20, 5, G.T_BLACK, 0);
			text(15, 15, 'GAME OVER', C_PINK);
			text(12, 17, 'SCORE ' + strBasic(m_intScore), C_YELLOW);
			m_objSound.play(0, 900, 30, 14, 60, false);
			waitThenFire(60, 'title');
		}
		else
		{
			caveStart();
		}
	}

	function ending()
	{
		m_objGrid.clear();
		backClear();
		big(16, 20, 'WELL DUG!', 3, 0xFC, 0xE0);
		text(4, 16, "PIP'S BEEN THROUGH ALL TWELVE CAVES", C_WHITE);
		text(4, 18, 'AND THE GEMS ARE HOME. WELL DONE.', C_WHITE);
		text(12, 21, 'SCORE ' + strBasic(m_intScore), C_YELLOW);
		m_intStep = 1;
		m_intWait = 0;
		m_strState = 'ending';
	}

	function endingStep()
	{
		if (m_intWait > 0)
		{
			m_intWait--;
		}
		else if (m_intStep <= 6)
		{
			m_objSound.play(0, 200 - m_intStep * 20, 0, 14, 8, false);
			m_intStep++;
			m_intWait = 9;
		}
		else
		{
			m_intCave = 0;
			waitThenFire(50, 'title');
		}
	}

	// the part seen follows Pip (first: centred on where he is)
	function camera(blnFirst_a)
	{
		var intX = m_intPP % W;
		var intY = Math.floor(m_intPP / W);
		if (blnFirst_a)
		{
			m_intCamX = intX - 10; m_intCamY = intY - 7;
		}
		else
		{
			if (intX - m_intCamX < 5) { m_intCamX = intX - 5; }
			if (intX - m_intCamX > 14) { m_intCamX = intX - 14; }
			if (intY - m_intCamY < 4) { m_intCamY = intY - 4; }
			if (intY - m_intCamY > 10) { m_intCamY = intY - 10; }
		}
		m_intCamX = Math.max(0, Math.min(W - 20, m_intCamX));
		m_intCamY = Math.max(0, Math.min(CH - 15, m_intCamY));
	}

	// the top two rows: gems (got / needed), what one's worth, the time; the score and lives
	function hud(blnAll_a)
	{
		if (blnAll_a)
		{
			m_objGrid.rect(0, 0, 40, 2, G.T_BLACK, 0);
			text(1, 1, 'CAVE ' + String.fromCharCode(65 + m_intCave) + ': ' + NAMES[m_intCave], C_GREEN);
			m_objGrid.put(1, 0, G.T_GEMICON, C_WHITE);
			m_objGrid.put(33, 0, G.T_HEART, 1);
		}
		var str = rightStr('  ' + strBasic(m_intGems), 3) + '/' + rightStr('  ' + strBasic(m_intNeed), 3);
		text(2, 0, str, m_blnExitOpen ? C_YELLOW : C_WHITE);
		if (m_blnExitOpen)
		{
			text(11, 0, 'WORTH' + rightStr('   ' + strBasic(m_intExtra), 3), C_YELLOW);
		}
		else
		{
			text(11, 0, 'WORTH' + rightStr('   ' + strBasic(m_intValue), 3), C_CYAN);
		}
		text(22, 0, 'TIME' + rightStr('   ' + strBasic(m_intTime), 4), (m_intTime <= 10) ? C_PINK : C_WHITE);
		text(34, 0, rightStr(' ' + strBasic(m_intLives), 2), C_PINK);
		text(27, 1, 'SCORE ' + score6(), C_YELLOW);
	}

	function points(intN_a)
	{
		m_intScore += intN_a;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 500;
			m_intLives++;
			m_intFlash = 6;
			m_objSound.play(2, 80, -2, 14, 30, false);
		}
	}

	// ====================================================================================================
	// A MOVE: every cell has its go

	function turn()
	{
		var intP, intE, intB;
		m_intAmN = 0; m_blnAmCan = false;
		if (m_intInT > 0)
		{
			m_intInT--;
			if (m_intInT === 0)
			{
				m_arrCave[m_intPP] = E_PL; m_blnAlive = true; m_blnBorn = true;
				m_objSound.play(0, 150, -4, 14, 12, false);
			}
		}
		for (intP = W + 1; intP <= W * (CH - 1) - 2; intP++)
		{
			intE = m_arrCave[intP];
			if (intE >= 128)
			{
				m_arrCave[intP] = intE - 128;
			}
			else if (intE >= E_RK)
			{
				if ((intE === E_RK) || (intE === E_GM))
				{
					intB = m_arrCave[intP + W];
					if (intB === E_SP)
					{
						m_arrCave[intP] = E_SP; m_arrCave[intP + W] = intE + 16 + 128;	// falling now
					}
					else if ((intB === E_RK) || (intB === E_GM) || (intB === E_WL))
					{
						roll(intP, intE + 16);
					}
				}
				else if ((intE === E_RF) || (intE === E_GF)) { fall(intP, intE); }
				else if (intE === E_PL) { move(intP); }
				else if ((intE >= E_FF) && (intE <= E_FF + 3)) { fly(intP, intE - E_FF, false); }
				else if ((intE >= E_BF) && (intE <= E_BF + 3)) { fly(intP, intE - E_BF, true); }
				else if (intE === E_AM) { grow(intP); }
				else if (((intE >= E_X1) && (intE <= E_X1 + 3)) || ((intE >= E_Y1) && (intE <= E_Y1 + 3))) { m_arrCave[intP] = intE + 1; }
				else if (intE === E_X1 + 4) { m_arrCave[intP] = E_SP; }
				else if (intE === E_Y1 + 4) { m_arrCave[intP] = E_GM; }
			}
		}
		// the amoeba: shut in, it turns to gems; too big, to rock
		if (m_intAmN > 0)
		{
			if (m_intAmN >= 200)
			{
				allAm(E_RK);
			}
			else if (!m_blnAmCan)
			{
				allAm(E_GM);
				m_objSound.play(2, 40, 2, 14, 30, false);
			}
		}
		// the magic wall hums a while, then it's dead
		if (m_intMagic === 1)
		{
			m_intMagicLeft--;
			if (m_intMagicLeft <= 0) { m_intMagic = 2; }
		}
	}

	function allAm(intE_a)
	{
		for (var intP = 0; intP < 880; intP++)
		{
			if (m_arrCave[intP] === E_AM) { m_arrCave[intP] = intE_a; }
		}
	}

	// a rock or gem on something round rolls off, if both the side and below it are clear
	function roll(intP_a, intF_a)
	{
		if ((m_arrCave[intP_a - 1] === E_SP) && (m_arrCave[intP_a + W - 1] === E_SP))
		{
			m_arrCave[intP_a] = E_SP; m_arrCave[intP_a - 1] = intF_a;
		}
		else if ((m_arrCave[intP_a + 1] === E_SP) && (m_arrCave[intP_a + W + 1] === E_SP))
		{
			m_arrCave[intP_a] = E_SP; m_arrCave[intP_a + 1] = intF_a + 128;
		}
	}

	// a falling rock or gem (e: E_RF / E_GF)
	function fall(intP_a, intE_a)
	{
		var intB = m_arrCave[intP_a + W];
		if (intB === E_SP)
		{
			m_arrCave[intP_a] = E_SP; m_arrCave[intP_a + W] = intE_a + 128;
		}
		else if (intB === E_PL)
		{
			boom(intP_a + W, false);
		}
		else if ((intB >= E_FF) && (intB < E_FF + 4))
		{
			boom(intP_a + W, false);
		}
		else if ((intB >= E_BF) && (intB < E_BF + 4))
		{
			boom(intP_a + W, true);
		}
		else if (intB === E_MW)
		{
			if (m_intMagic === 0) { m_intMagic = 1; magicOn(); }
			m_arrCave[intP_a] = E_SP;
			if (m_intMagic === 1)
			{
				var intQ = intP_a + W * 2;
				if (m_arrCave[intQ] === E_SP)
				{
					m_arrCave[intQ] = ((intE_a === E_RF) ? E_GF : E_RF) + 128;
				}
			}
			m_objSound.play(2, 30, 0, 12, 6, true);
		}
		else if ((intB === E_RK) || (intB === E_GM) || (intB === E_WL))
		{
			if ((m_arrCave[intP_a - 1] === E_SP) && (m_arrCave[intP_a + W - 1] === E_SP))
			{
				m_arrCave[intP_a] = E_SP; m_arrCave[intP_a - 1] = intE_a;
			}
			else if ((m_arrCave[intP_a + 1] === E_SP) && (m_arrCave[intP_a + W + 1] === E_SP))
			{
				m_arrCave[intP_a] = E_SP; m_arrCave[intP_a + 1] = intE_a + 128;
			}
			else
			{
				land(intP_a, intE_a);
			}
		}
		else
		{
			land(intP_a, intE_a);
		}
	}

	function land(intP_a, intE_a)
	{
		m_arrCave[intP_a] = intE_a - 16;
		if (intE_a === E_RF) { m_objSound.play(2, 25, 0, 13, 4, true); } else { m_objSound.play(1, 40, -1, 12, 4, false); }
	}

	function magicOn()
	{
		m_objSound.play(0, 60, 0, 10, 20, false);
		m_intMagicLeft = Math.floor(m_intMagicT * 50 / m_intSpeed);
	}

	// Pip's go: the way pressed (with Space: grab without moving)
	function move(intP_a)
	{
		if (m_intPend === 0)
		{
			m_intFace = 0;
			if (m_intIdleT < 1000) { m_intIdleT += m_intSpeed; }
		}
		else
		{
			m_intIdleT = 0;
			var intD = m_intPend - 1;
			var intQ = intP_a + DOF[intD];
			var intC = m_arrCave[intQ] & 127;
			if (intD === 1) { m_intFace = 2; }
			if (intD === 3) { m_intFace = 4; }
			if (((intD === 0) || (intD === 2)) && (m_intFace === 0)) { m_intFace = 2; }
			if ((intC === E_SP) || (intC === E_DI))
			{
				if (intC === E_DI) { m_objSound.play(1, 600, 0, 8, 2, true); }
				if (m_blnSnap) { m_arrCave[intQ] = E_SP; } else { step1(intP_a, intQ); }
			}
			else if (intC === E_GM)
			{
				gem();
				if (m_blnSnap) { m_arrCave[intQ] = E_SP; } else { step1(intP_a, intQ); }
			}
			else if (intC === E_RK)
			{
				if (((intD === 1) || (intD === 3)) && (!m_blnSnap))
				{
					var intR = intQ + DOF[intD];
					if ((m_arrCave[intR] === E_SP) && (rnd(8) === 0))
					{
						m_arrCave[intR] = (intD === 1) ? (E_RK + 128) : E_RK;
						step1(intP_a, intQ);
						m_objSound.play(2, 35, 0, 11, 3, true);
					}
				}
			}
			else if (intC === E_EX)
			{
				if (m_blnExitOpen && (!m_blnSnap))
				{
					m_arrCave[intP_a] = E_SP; m_blnAlive = false; m_blnDone = true;
					m_objSound.play(0, 100, -3, 14, 25, false);
				}
			}
		}
	}

	function step1(intP_a, intQ_a)
	{
		m_arrCave[intP_a] = E_SP;
		m_arrCave[intQ_a] = (intQ_a > intP_a) ? (E_PL + 128) : E_PL;
		m_intPP = intQ_a;
	}

	function gem()
	{
		m_intGems++;
		points(m_blnExitOpen ? m_intExtra : m_intValue);
		m_objSound.play(0, 40, -1, 13, 6, false);
		if ((m_intGems === m_intNeed) && (!m_blnExitOpen))
		{
			m_blnExitOpen = true; m_intFlash = 4;
			m_objSound.play(2, 60, -2, 14, 20, false);
		}
		hud(false);
	}

	// a firefly turns left when it can, a butterfly right: d its way (0 up 1 right 2 down 3 left)
	function fly(intP_a, intD_a, blnButterfly_a)
	{
		var blnDone = false;
		var intJ, intQ;
		// touching Pip or the amoeba: it blows up
		for (intJ = 0; intJ <= 3; intJ++)
		{
			var intN = m_arrCave[intP_a + DOF[intJ]] & 127;
			if ((!blnDone) && ((intN === E_PL) || (intN === E_AM)))
			{
				boom(intP_a, blnButterfly_a);
				blnDone = true;
			}
		}
		if (!blnDone)
		{
			var intE = blnButterfly_a ? E_BF : E_FF;
			var intND = blnButterfly_a ? ((intD_a + 1) & 3) : ((intD_a + 3) & 3);
			intQ = intP_a + DOF[intND];
			if (m_arrCave[intQ] === E_SP)
			{
				m_arrCave[intP_a] = E_SP;
				m_arrCave[intQ] = intE + intND + ((intQ > intP_a) ? 128 : 0);
			}
			else
			{
				intQ = intP_a + DOF[intD_a];
				if (m_arrCave[intQ] === E_SP)
				{
					m_arrCave[intP_a] = E_SP;
					m_arrCave[intQ] = intE + intD_a + ((intQ > intP_a) ? 128 : 0);
				}
				else
				{
					// blocked: turn the other way
					m_arrCave[intP_a] = intE + (blnButterfly_a ? ((intD_a + 3) & 3) : ((intD_a + 1) & 3));
				}
			}
		}
	}

	// the amoeba: grows now and then into space or dirt next to it
	function grow(intP_a)
	{
		var intJ, intC;
		m_intAmN++;
		if (!m_blnAmCan)
		{
			for (intJ = 0; intJ <= 3; intJ++)
			{
				intC = m_arrCave[intP_a + DOF[intJ]];
				if ((intC === E_SP) || (intC === E_DI)) { m_blnAmCan = true; }
			}
		}
		var blnGrows = m_blnAmFast ? (rnd(16) <= 3) : (rnd(64) <= 1);
		if (blnGrows)
		{
			var intQ = intP_a + DOF[rnd(4)];
			intC = m_arrCave[intQ];
			if ((intC === E_SP) || (intC === E_DI))
			{
				m_arrCave[intQ] = E_AM + ((intQ > intP_a) ? 128 : 0);
			}
		}
	}

	// an explosion round cell p: to space or gems. Steel and the way out stay
	function boom(intP_a, blnGems_a)
	{
		var intB = blnGems_a ? E_Y1 : E_X1;
		for (var intY = -1; intY <= 1; intY++)
		{
			for (var intX = -1; intX <= 1; intX++)
			{
				var intQ = intP_a + intY * W + intX;
				var intE = m_arrCave[intQ] & 127;
				if ((intE !== E_ST) && (intE !== E_EX))
				{
					if (intE === E_PL) { m_blnAlive = false; }
					m_arrCave[intQ] = intB + ((intQ > intP_a) ? 128 : 0);
				}
			}
		}
		m_objSound.play(2, 10, 2, 15, 25, true);
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
				case 'title':
					if (m_strState === 'start') { titleStart(); } else { titleStep(); }
					break;
				case 'intro':
					m_intWait--;
					if (m_intWait <= 0) { caveGo(); }
					break;
				case 'cave':
					caveStep();
					break;
				case 'bonus':
					bonusStep();
					break;
				case 'gotout':
					m_intWait--;
					if (m_intWait <= 0) { gotOut(); }
					break;
				case 'ending':
					endingStep();
					break;
				case 'waitfire':
					if (m_intWait > 0)
					{
						m_intWait--;
					}
					else if (!m_blnFireSeen)
					{
						if (!fire()) { m_blnFireSeen = true; }
					}
					else if (fire() || down(K_ENTER))
					{
						if (m_strAfter === 'title') { titleStart(); }
					}
					break;
				default:
					break;
			}
			pip();
			m_objSlots.step();
			m_intFrames = (m_intFrames + 1) & 0x7FFF;
		}
		m_objSound.update();
	};

	// ====================================================================================================
	// DRAWING

	// Pip: walking (his sequence's walking loop, at the cave's pace) or looking at you (blinking
	// now and then, tapping a hoof when he's waited a while)
	function pip()
	{
		var intX, intY;
		if (((m_strState === 'cave') || (m_strState === 'bonus')) && m_blnAlive)
		{
			intX = (m_intPP % W - m_intCamX) * 16;
			intY = 16 + (Math.floor(m_intPP / W) - m_intCamY) * 16;
			if (m_intFace === 0)
			{
				m_objSlots.put(SL_PIP, intX, intY, 'front', undefined, 'gemrush_s0');
				m_objSlots.animate(SL_PIP, (m_intIdleT > 150) ? 34 : 1);
			}
			else
			{
				m_objSlots.put(SL_PIP, intX, intY, 'uni', undefined, 'gemrush_s0', 1, (m_intFace === 4) ? SPRITE_MIRRORX : 0);
				m_objSlots.setDelay(SL_PIP, Math.max(1, m_intSpeed));
				m_objSlots.animate(SL_PIP, 1);
			}
		}
		else
		{
			m_objSlots.hide(SL_PIP);
		}
	}

	function stamp(objContext_a, strName_a, intFrame_a, intX_a, intY_a, intScale_a, intRow_a, intFlags_a)
	{
		m_objSprites.stampSprite(objContext_a, strName_a, intFrame_a, intX_a, intY_a, 'gemrush_s' + intRow_a, intScale_a, intFlags_a);
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		if (m_blnLoaded)
		{
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			objContext_a.drawImage(m_objBack, 32, 32);
			m_objGrid.paint(objContext_a, 0, 0);
			if (m_strState === 'title')
			{
				var intA = Math.floor(m_intFrames / 8);
				if (intA % 8 === 0) { stamp(objContext_a, 'front', 2, 128, 128, 4, 0); } else { stamp(objContext_a, 'front', 1, 128, 124, 4, 0); }
				stamp(objContext_a, 'gem', 1, 56, 150 + BOB[Math.floor(m_intFrames / 6) % 12], 2, 0);
				stamp(objContext_a, 'rock', 1, 216, 152, 2, 0);
				stamp(objContext_a, 'rock', 1, 84, 156, 2, 0);
				stamp(objContext_a, 'gem', 1, 248, 128 + BOB[Math.floor((m_intFrames + 20) / 6) % 12], 2, 1);
			}
			else if (m_strState === 'ending')
			{
				stamp(objContext_a, 'front', 1, 144, 196, 2, 0);
			}
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var arrTiles = ['gemrush_tc0', 'gemrush_t1', 'gemrush_t2', 'gemrush_t3', 'gemrush_t4', 'gemrush_t5', 'gemrush_t6'];
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			// walking: a frame a step (the slot's delay is the cave's pace)
			{ name:'uni', classes:'gemrush', imagename:'gemrush_s0', x:0, y:0, w:16, h:16, imagex:G.S_UNI.col * 16, imagey:G.S_UNI.row * 16, imagew:16, imageh:16, sequence:[1, 2, 3, 4, -1], delay:6 },
			// looking at you: a blink every 32 steps (step 1); waited a while: tapping a hoof (step 34)
			{ name:'front', classes:'gemrush', imagename:'gemrush_s0', x:0, y:0, w:16, h:16, imagex:G.S_FRONT.col * 16, imagey:G.S_FRONT.row * 16, imagew:16, imageh:16, sequence:FRONT, delay:4 },
			{ name:'gem', classes:'gemrush', imagename:'gemrush_s0', x:0, y:0, w:16, h:16, imagex:G.S_GEM.col * 16, imagey:G.S_GEM.row * 16, imagew:16, imageh:16, sequence:[1, 0] },
			{ name:'rock', classes:'gemrush', imagename:'gemrush_s0', x:0, y:0, w:16, h:16, imagex:G.S_ROCK.col * 16, imagey:G.S_ROCK.row * 16, imagew:16, imageh:16, sequence:[1, 0] }
		]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrTiles, first:0, firstcode:0, transparent:G.T_CLEAR });
		m_objBack = document.createElement('canvas');
		m_objBack.width = 256; m_objBack.height = 192;
		m_objBackContext = m_objBack.getContext('2d');
		m_objBackContext.imageSmoothingEnabled = false;

		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:180, size:28, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:190, size:22, key:K_SPACE, label:'GRAB' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:40, size:16, key:K_R, label:'GIVE UP' }
		] });

		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('gemrush'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			m_strState = 'start';
		});

		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new gemrushGame();
g_objGame.run();
