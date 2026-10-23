// CHOMPBOT - a maze chase. Ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// CHOMPBOT eats every bolt in the maze while four bugs hunt him: SPARK (red) comes straight for
// him, BYTE (pink) heads for where he's going, QUIRK (cyan) works with SPARK to box him in, and
// FUZZ (orange) chases him from afar but wanders off when he gets close. Now and then they all
// break off to their own corners. Eat an energy cell and they turn blue and run: eat them then
// for 200, 400, 800, 1600. Their eyes go home to the den to grow a new bug.
//
// Keys: Q A O P or the arrows; Space (or Enter) starts. Touch: the pad, START on the right.
//
// The maze is the tile screen; CHOMPBOT and the bugs are numbered sprites (JSpriteSlots, as the
// Next's hardware sprites), moving a pixel at a time and turning at the middle of a cell.
function chompbotGame()
{
	var m_objThis = this;
	var G = GFX_CHOMPBOT;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:64, y:0, w:320, h:256 };
	var MW = 28, MH = 31, OX = 48, OY = 8, MAZES = 3;
	var C_WHITE = 2, C_YELLOW = 3, C_CYAN = 4, C_PINK = 5, C_GREEN = 6;
	// sprite slots: CHOMPBOT 0, the bugs 1-8 (body, eyes), the points 9, the bonus 10, the panel's bonus things 20-27
	var SL_P = 0, SL_PTS = 9, SL_BON = 10, SL_HUD = 20;
	var B_DEN = 0, B_LEAVE = 1, B_OUT = 2, B_EYES = 3, B_ENTER = 4;
	var K_O = 79, K_P = 80, K_A = 65, K_Q = 81, K_SPACE = 32, K_ENTER = 13;
	var DXS = [0, 1, 0, -1], DYS = [-1, 0, 1, 0];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 32);
	var m_objPad, m_objGrid, m_objBack, m_objBackContext;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	var m_arrLg = [], m_arrDt = [], m_intPointsT = 0;
	var m_intPX = 0, m_intPY = 0, m_intPD = 0, m_intPAcc = 0, m_blnPMov = false, m_intPSpd = 0, m_intWant = 0;
	var m_arrBX = [0, 0, 0, 0], m_arrBY = [0, 0, 0, 0], m_arrBD = [0, 0, 0, 0], m_arrBSt = [0, 0, 0, 0];
	var m_arrBFr = [false, false, false, false], m_arrBAcc = [0, 0, 0, 0], m_arrBDots = [0, 0, 0, 0];
	var m_intBSpd = 0, m_intFrSpd = 0;
	var m_intScore = 0, m_intHigh = 5000, m_intNextLife = 0, m_intLives = 0, m_intLevel = 1, m_intMaze = 0;
	var m_intDots = 0, m_intEaten = 0, m_intPhase = 0, m_intPhT = 0, m_blnScatter = true;
	var m_intFrT = 0, m_intFrLen = 0, m_intChain = 0, m_intNoDot = 0, m_intBonT = 0, m_intBonK = 0;
	var m_intAteBug = -1, m_intFrames = 0, m_blnDead = false, m_intFrozen = 0, m_blnWaka = false, m_arrGot = [];

	var m_strState = 'loading', m_intWait = 0, m_intStep = 0;

	// ====================================================================================================
	// KEYS, TEXT

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// the way held: -1 none, 0 up, 1 right, 2 down, 3 left
	function way()
	{
		var intResult = -1;
		if (down(K_Q) || down(KEY_UP)) { intResult = 0; }
		if (down(K_A) || down(KEY_DOWN)) { intResult = 2; }
		if (down(K_O) || down(KEY_LEFT)) { intResult = 3; }
		if (down(K_P) || down(KEY_RIGHT)) { intResult = 1; }
		return intResult;
	}

	function fire()
	{
		return down(K_SPACE) || down(K_ENTER);
	}

	function text(intX_a, intY_a, str_a, intColour_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intColour_a);
	}

	// sprite n: a library sprite at x, y in colours row; frame 0 leaves its frame to its animation
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, 'chompbot_s' + intRow_a, 1, intFlags_a);
	}

	// sprite n running its own animation (its sequence from the start)
	function anim(intN_a, intX_a, intY_a, strName_a, intRow_a, intFlags_a)
	{
		spr(intN_a, intX_a, intY_a, strName_a, 0, intRow_a, intFlags_a);
		m_objSlots.animate(intN_a, 1);
	}

	// the maze's colours by the level: the walls' colour (8 of them), the energy cells blinked off,
	// the walls flashing white
	function colours(intLv_a, strHow_a)
	{
		m_objGrid.setImage(0, 'chompbot_tw' + (intLv_a % 8) + strHow_a);
	}

	function six(int_a)
	{
		return rightStr('000000' + String(int_a), 6);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		var intK;
		m_objSlots.hideRange(0, 32);
		m_objGrid.clear();
		colours(0, '');
		m_objBackContext.fillStyle = '#000';
		m_objBackContext.fillRect(0, 0, 256, 192);
		m_objSprites.paintBigText(m_objBackContext, 'chompbot_ink', 'CHOMP', 8, 10, 6, rgb332ToCSS(0xFC), rgb332ToCSS(0xF0), rgb332ToCSS(0), 2);
		m_objSprites.paintBigText(m_objBackContext, 'chompbot_ink', 'BOT', 80, 64, 4, rgb332ToCSS(0x1F), rgb332ToCSS(0x13), rgb332ToCSS(0), 2);
		text(7, 18, 'EAT EVERY BOLT IN THE MAZE.', C_WHITE);
		text(12, 20, 'SPARK', C_PINK); text(18, 20, 'COMES STRAIGHT AT YOU', C_WHITE);
		text(12, 22, 'BYTE', C_PINK); text(18, 22, 'GETS IN FRONT', C_WHITE);
		text(12, 24, 'QUIRK', C_CYAN); text(18, 24, 'BOXES YOU IN', C_WHITE);
		text(12, 26, 'FUZZ', C_YELLOW); text(18, 26, 'COMES AND GOES', C_WHITE);
		m_objGrid.put(8, 28, G.T_BOLT, 0); text(10, 28, '10', C_YELLOW);
		m_objGrid.put(15, 28, G.T_CELL, 0); text(17, 28, '50: THEN EAT THE BUGS', C_YELLOW);
		text(7, 29, 'Q A O P MOVE.  SPACE: START', C_CYAN);
		text(7, 30, 'HIGH SCORE ' + six(m_intHigh), C_PINK);
		text(7, 31, '(C) 2026 CYBORG UNICORN', C_WHITE);
		for (intK = 0; intK <= 3; intK++)
		{
			spr(1 + intK * 2, 72, 156 + intK * 16, 'bug', 1, intK + 1);
			spr(2 + intK * 2, 72, 156 + intK * 16, 'eyes', 2, intK + 1);
		}
		m_strState = 'title';
	}

	function titleStep()
	{
		// CHOMPBOT runs across the bottom of the picture with a bug after him, then back the other way
		var intA = m_intFrames % 400;
		var intX;
		if (intA < 200)
		{
			intX = intA * 2 - 40;
			anim(SL_P, intX + 30, 126, 'chomp', 0);
			anim(9, intX - 10, 126, 'bug', 1);
			spr(10, intX - 10, 126, 'eyes', 2, 1);
		}
		else
		{
			intX = 400 - (intA - 200) * 2 - 40;
			anim(SL_P, intX - 30, 126, 'chomp', 0, SPRITE_MIRRORX);
			anim(9, intX + 10, 126, 'bug', 5);
			spr(10, intX + 10, 126, 'scared', 1, 5);
		}
		if (fire())
		{
			m_objSlots.hideRange(0, 32);
			m_objBackContext.fillRect(0, 0, 256, 192);
			gameStart();
		}
	}

	// ====================================================================================================
	// A GAME

	function gameStart()
	{
		m_intScore = 0; m_intLives = 3; m_intLevel = 1; m_intNextLife = 10000;
		m_arrGot = [0, 0, 0, 0, 0, 0, 0, 0];
		m_objGrid.clear();
		newLevel();
		ready();
	}

	// a new maze, full of bolts
	function newLevel()
	{
		var intX, intY, intT, intP;
		m_intMaze = Math.floor((m_intLevel - 1) / 2) % MAZES;
		colours(m_intLevel - 1, '');
		m_objGrid.clear();
		m_intDots = 0; m_intEaten = 0;
		m_arrLg = []; m_arrDt = [];
		for (intY = 0; intY < MH; intY++)
		{
			for (intX = 0; intX < MW; intX++)
			{
				intT = CHOMPBOT_MAZES[m_intMaze * 868 + intY * MW + intX];
				intP = intY * MW + intX;
				m_arrLg[intP] = 0; m_arrDt[intP] = 0;
				if (intT === G.T_BOLT) { m_arrDt[intP] = 1; }
				if (intT === G.T_CELL) { m_arrDt[intP] = 2; }
				if ((intT === 0) || (intT === G.T_BOLT) || (intT === G.T_CELL)) { m_arrLg[intP] = 1; }
				if ((intT === G.T_BOLT) || (intT === G.T_CELL)) { m_intDots++; }
				if (intT === G.T_DOOR) { m_arrLg[intP] = 2; }
				if (intT === 5) { m_arrLg[intP] = 3; }
				if ((intT === 5) || (intT === 6)) { intT = G.T_BLACK; }
				m_objGrid.put(OX / 8 + intX, OY / 8 + intY, intT, 0);
			}
		}
		// the speeds (16ths of a pixel a frame) and how long they stay scared, by the level
		if (m_intLevel === 1)
		{
			m_intPSpd = 24; m_intBSpd = 22; m_intFrLen = 300;
		}
		else if (m_intLevel <= 4)
		{
			m_intPSpd = 26; m_intBSpd = 25; m_intFrLen = 250 - m_intLevel * 25;
		}
		else
		{
			m_intPSpd = 28; m_intBSpd = 27; m_intFrLen = Math.max(50, 160 - m_intLevel * 10);
		}
		m_intFrSpd = 14;
		m_intBonK = Math.min(7, m_intLevel - 1);
		m_arrGot[m_intBonK] = 1;
		panel();
	}

	function panel()
	{
		text(0, 2, 'SCORE', C_WHITE);
		text(0, 6, 'HIGH', C_WHITE);
		text(0, 10, 'LEVEL', C_WHITE);
		text(0, 11, rightStr('  ' + strBasic(m_intLevel), 3), C_YELLOW);
		text(35, 2, 'BONUS', C_WHITE);
		for (var intK = 0; intK <= 7; intK++)
		{
			if (m_arrGot[intK]) { spr(SL_HUD + intK, 288, 32 + intK * 18, 'bonus', intK + 1, 0); } else { m_objSlots.hide(SL_HUD + intK); }
		}
		scores();
		showLives();
	}

	function scores()
	{
		text(0, 3, six(m_intScore), C_YELLOW);
		if (m_intScore > m_intHigh) { m_intHigh = m_intScore; }
		text(0, 7, six(m_intHigh), C_YELLOW);
	}

	function showLives()
	{
		for (var intK = 0; intK <= 4; intK++)
		{
			m_objGrid.put(intK, 30, (intK < m_intLives - 1) ? G.T_LIFE : G.T_BLACK, 0);
		}
	}

	function points(intN_a)
	{
		m_intScore += intN_a;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 999999;
			m_intLives++;
			showLives();
			m_objSound.play(2, 80, -2, 14, 40, false);
		}
		scores();
	}

	// everyone to their starting places, READY! for two seconds
	function ready()
	{
		m_intPX = 112; m_intPY = 132; m_intPD = 3; m_intWant = 3; m_intPAcc = 0; m_blnPMov = true;
		m_arrBX = [112, 112, 96, 128]; m_arrBY = [84, 108, 108, 108]; m_arrBD = [3, 0, 2, 2];
		m_arrBSt = [B_OUT, B_DEN, B_DEN, B_DEN];
		m_arrBFr = [false, false, false, false]; m_arrBAcc = [0, 0, 0, 0];
		// how many bolts before each leaves the den (fewer on later levels)
		m_arrBDots = [0, 0, 30, 60];
		if (m_intLevel > 1) { m_arrBDots[2] = 0; m_arrBDots[3] = 30; }
		if (m_intLevel > 2) { m_arrBDots[3] = 0; }
		m_intPhase = 0; m_intPhT = 0; m_blnScatter = true; m_intFrT = 0; m_intNoDot = 0; m_intBonT = 0; m_blnDead = false; m_intFrozen = 0;
		m_objSlots.hide(SL_PTS); m_objSlots.hide(SL_BON);
		m_objSound.quiet();
		text(0, 14, 'READY!', C_YELLOW);
		draw();
		m_intWait = 100;
		m_strState = 'ready';
	}

	function playStep()
	{
		var intW = way();
		if (intW >= 0) { m_intWant = intW; }
		if (m_intFrozen > 0)
		{
			m_intFrozen--;
			if (m_intFrozen === 0) { m_objSlots.hide(SL_PTS); }
		}
		else
		{
			movePlayer();
			for (var intK = 0; intK <= 3; intK++)
			{
				moveBug(intK);
			}
			timers();
			draw();
			catchBugs();
		}
		if (m_intFrozen > 0) { draw(); }
		if (m_blnDead)
		{
			m_objSound.quiet();
			m_intWait = 50; m_intStep = 0;
			m_strState = 'die';
		}
		else if (m_intEaten === m_intDots)
		{
			m_objSound.quiet();
			m_intWait = 50; m_intStep = 0;
			m_strState = 'cleared';
		}
	}

	// ====================================================================================================
	// MOVING

	// is the cell at tx, ty open to CHOMPBOT (the tunnel's ends count as open)
	function open1(intTX_a, intTY_a)
	{
		var blnResult = false;
		if ((intTY_a >= 0) && (intTY_a < MH))
		{
			if ((intTX_a < 0) || (intTX_a >= MW))
			{
				blnResult = (m_arrLg[intTY_a * MW] === 1);
			}
			else
			{
				blnResult = (m_arrLg[intTY_a * MW + intTX_a] === 1);
			}
		}
		return blnResult;
	}

	function movePlayer()
	{
		// turning round is allowed any time
		if (m_intWant === ((m_intPD + 2) & 3)) { m_intPD = m_intWant; m_blnPMov = true; }
		m_intPAcc += m_intPSpd;
		while (m_intPAcc >= 16)
		{
			m_intPAcc -= 16;
			if (((m_intPX & 7) === 4) && ((m_intPY & 7) === 4))
			{
				var intTX = m_intPX >> 3;
				var intTY = m_intPY >> 3;
				if (open1(intTX + DXS[m_intWant], intTY + DYS[m_intWant])) { m_intPD = m_intWant; m_blnPMov = true; }
				if (!open1(intTX + DXS[m_intPD], intTY + DYS[m_intPD])) { m_blnPMov = false; }
				eat(intTX, intTY);
			}
			if (m_blnPMov)
			{
				m_intPX += DXS[m_intPD]; m_intPY += DYS[m_intPD];
				if (m_intPX < -8) { m_intPX = MW * 8 + 7; }
				if (m_intPX > MW * 8 + 7) { m_intPX = -8; }
			}
		}
	}

	// at the middle of cell tx, ty: a bolt or an energy cell there?
	function eat(intTX_a, intTY_a)
	{
		if ((intTX_a >= 0) && (intTX_a < MW))
		{
			var intP = intTY_a * MW + intTX_a;
			if (m_arrDt[intP] === 1)
			{
				m_arrDt[intP] = 0;
				m_objGrid.put(OX / 8 + intTX_a, OY / 8 + intTY_a, 0, 0);
				m_intEaten++; m_intNoDot = 0;
				points(10);
				m_blnWaka = !m_blnWaka;
				if (m_blnWaka) { m_objSound.play(0, 180, -6, 11, 3, false); } else { m_objSound.play(0, 120, 6, 11, 3, false); }
				dotCount();
			}
			else if (m_arrDt[intP] === 2)
			{
				m_arrDt[intP] = 0;
				m_objGrid.put(OX / 8 + intTX_a, OY / 8 + intTY_a, 0, 0);
				m_intEaten++; m_intNoDot = 0;
				points(50);
				dotCount();
				scare();
			}
			// the bonus thing, when it's there (below the den)
			if ((m_intBonT > 0) && (intTY_a === 16) && ((intTX_a === 13) || (intTX_a === 14)))
			{
				m_intBonT = 0;
				m_objSlots.hide(SL_BON);
				points([100, 300, 500, 700, 1000, 2000, 3000, 5000][m_intBonK]);
				spr(SL_PTS, OX + 112 - 8, OY + 132 - 8, 'bval', m_intBonK + 1, 0);
				m_intPointsT = 100;
				m_objSound.play(1, 40, -1, 14, 20, false);
			}
		}
	}

	function dotCount()
	{
		// the next bug in the den counts down to leaving
		var blnDone = false;
		for (var intJ = 1; intJ <= 3; intJ++)
		{
			if ((!blnDone) && (m_arrBSt[intJ] === B_DEN) && (m_arrBDots[intJ] > 0))
			{
				m_arrBDots[intJ]--;
				blnDone = true;
			}
		}
		// the bonus thing comes out twice a level
		if ((m_intEaten === 70) || (m_intEaten === 170))
		{
			m_intBonT = 500;
			spr(SL_BON, OX + 112 - 8, OY + 132 - 8, 'bonus', m_intBonK + 1, 0);
		}
	}

	// an energy cell: the bugs that are out turn blue and run (turning round)
	function scare()
	{
		m_intFrT = m_intFrLen; m_intChain = 0;
		for (var intJ = 0; intJ <= 3; intJ++)
		{
			if (m_arrBSt[intJ] === B_OUT)
			{
				if (m_intFrLen > 0) { m_arrBFr[intJ] = true; }
				m_arrBD[intJ] = (m_arrBD[intJ] + 2) & 3;
			}
			else if (m_arrBSt[intJ] !== B_EYES)
			{
				if (m_intFrLen > 0) { m_arrBFr[intJ] = true; }
			}
		}
		m_objSound.play(2, 300, -20, 12, 30, false);
	}

	// the clocks: scatter / chase, scared, the bonus, the den
	function timers()
	{
		var intJ;
		if (m_intFrT > 0)
		{
			m_intFrT--;
			if (m_intFrT === 0) { m_arrBFr = [false, false, false, false]; }
		}
		else
		{
			m_intPhT++;
			// scatter 7s, chase 20s, scatter 7s, chase 20s, scatter 5s, chase 20s, scatter 5s, then chase
			var intLen = [350, 1000, 350, 1000, 250, 1000, 250][m_intPhase];
			if ((m_intPhase < 7) && (m_intPhT >= intLen))
			{
				m_intPhase++; m_intPhT = 0;
				m_blnScatter = ((m_intPhase & 1) === 0);
				for (intJ = 0; intJ <= 3; intJ++)
				{
					if (m_arrBSt[intJ] === B_OUT) { m_arrBD[intJ] = (m_arrBD[intJ] + 2) & 3; }
				}
			}
		}
		if (m_intBonT > 0)
		{
			m_intBonT--;
			if (m_intBonT === 0) { m_objSlots.hide(SL_BON); }
		}
		if (m_intPointsT > 0)
		{
			m_intPointsT--;
			if (m_intPointsT === 0) { m_objSlots.hide(SL_PTS); }
		}
		// no bolt eaten for 4 seconds: the next one leaves anyway
		m_intNoDot++;
		if (m_intNoDot > 200)
		{
			m_intNoDot = 0;
			var blnDone = false;
			for (intJ = 1; intJ <= 3; intJ++)
			{
				if ((!blnDone) && (m_arrBSt[intJ] === B_DEN)) { m_arrBDots[intJ] = 0; blnDone = true; }
			}
		}
		// a hum while the bugs are about, a warble while they're blue
		if (!m_objSound.isBusy(1))
		{
			if (m_intFrT > 0) { m_objSound.play(1, 400 - (m_intFrames % 8) * 20, 0, 7, 4, false); }
			else { m_objSound.play(1, 250 - (m_intFrames % 16) * 4, 0, 6, 4, false); }
		}
	}

	// bug n's go: as fast as its state lets it, a pixel at a time
	function moveBug(intN_a)
	{
		var intS = m_intBSpd;
		if (m_arrBFr[intN_a]) { intS = m_intFrSpd; }
		if (m_arrBSt[intN_a] === B_EYES) { intS = 40; }
		if ((m_arrBSt[intN_a] === B_DEN) || (m_arrBSt[intN_a] === B_LEAVE)) { intS = 10; }
		if ((m_arrBY[intN_a] === 108) && (m_arrBSt[intN_a] === B_OUT) && ((m_arrBX[intN_a] < 40) || (m_arrBX[intN_a] > 184))) { intS = 12; }	// the tunnel
		m_arrBAcc[intN_a] += intS;
		while (m_arrBAcc[intN_a] >= 16)
		{
			m_arrBAcc[intN_a] -= 16;
			step1(intN_a);
		}
	}

	function step1(intN_a)
	{
		switch (m_arrBSt[intN_a])
		{
			case B_DEN:
				// bob up and down until it's time
				m_arrBY[intN_a] += DYS[m_arrBD[intN_a]];
				if (m_arrBY[intN_a] <= 104) { m_arrBD[intN_a] = 2; }
				if (m_arrBY[intN_a] >= 112) { m_arrBD[intN_a] = 0; }
				if ((m_arrBDots[intN_a] === 0) && (m_arrBY[intN_a] === 108)) { m_arrBSt[intN_a] = B_LEAVE; }
				break;
			case B_LEAVE:
				// to the middle, then up out of the door
				if (m_arrBX[intN_a] < 112) { m_arrBX[intN_a]++; m_arrBD[intN_a] = 1; }
				else if (m_arrBX[intN_a] > 112) { m_arrBX[intN_a]--; m_arrBD[intN_a] = 3; }
				else
				{
					m_arrBY[intN_a]--; m_arrBD[intN_a] = 0;
					if (m_arrBY[intN_a] <= 84) { m_arrBSt[intN_a] = B_OUT; m_arrBD[intN_a] = 3; }
				}
				break;
			case B_EYES:
				if ((m_arrBY[intN_a] === 84) && (m_arrBX[intN_a] > 98) && (m_arrBX[intN_a] < 126))
				{
					// over the den: line up on the door, then in
					if (m_arrBX[intN_a] < 112) { m_arrBX[intN_a]++; m_arrBD[intN_a] = 1; }
					else if (m_arrBX[intN_a] > 112) { m_arrBX[intN_a]--; m_arrBD[intN_a] = 3; }
					else { m_arrBSt[intN_a] = B_ENTER; }
				}
				else
				{
					if (((m_arrBX[intN_a] & 7) === 4) && ((m_arrBY[intN_a] & 7) === 4)) { choose(intN_a, 13, 10); }
					go(intN_a);
				}
				break;
			case B_ENTER:
				m_arrBY[intN_a]++; m_arrBD[intN_a] = 2;
				if (m_arrBY[intN_a] >= 108) { m_arrBSt[intN_a] = B_LEAVE; m_arrBFr[intN_a] = false; }
				break;
			case B_OUT:
				if (((m_arrBX[intN_a] & 7) === 4) && ((m_arrBY[intN_a] & 7) === 4))
				{
					if (m_arrBFr[intN_a]) { wander(intN_a); } else { target(intN_a); }
				}
				go(intN_a);
				break;
			default:
				break;
		}
	}

	// a pixel along its way (wrapping through the tunnel)
	function go(intN_a)
	{
		m_arrBX[intN_a] += DXS[m_arrBD[intN_a]]; m_arrBY[intN_a] += DYS[m_arrBD[intN_a]];
		if (m_arrBX[intN_a] < -8) { m_arrBX[intN_a] = MW * 8 + 7; }
		if (m_arrBX[intN_a] > MW * 8 + 7) { m_arrBX[intN_a] = -8; }
	}

	// at the middle of a cell: the way (not back) that's nearest the target cell gx, gy
	function choose(intN_a, intGX_a, intGY_a)
	{
		var intTX = m_arrBX[intN_a] >> 3, intTY = m_arrBY[intN_a] >> 3;
		var intBest = -1, intBestD = 999999;
		for (var intD = 0; intD <= 3; intD++)
		{
			if (intD !== ((m_arrBD[intN_a] + 2) & 3))
			{
				var intEX = intTX + DXS[intD], intEY = intTY + DYS[intD];
				if (open1(intEX, intEY))
				{
					var intDD = (intEX - intGX_a) * (intEX - intGX_a) + (intEY - intGY_a) * (intEY - intGY_a);
					if (intDD < intBestD) { intBestD = intDD; intBest = intD; }
				}
			}
		}
		if (intBest < 0) { intBest = (m_arrBD[intN_a] + 2) & 3; }
		m_arrBD[intN_a] = intBest;
	}

	// each bug's target, chasing or scattering
	function target(intN_a)
	{
		var intTX, intTY, intAX, intAY;
		if (m_blnScatter)
		{
			intTX = [25, 2, 27, 0][intN_a];
			intTY = [-3, -3, 32, 32][intN_a];
		}
		else
		{
			intTX = m_intPX >> 3; intTY = m_intPY >> 3;
			if (intN_a === 1)
			{
				intTX += DXS[m_intPD] * 4; intTY += DYS[m_intPD] * 4;
			}
			else if (intN_a === 2)
			{
				intAX = intTX + DXS[m_intPD] * 2; intAY = intTY + DYS[m_intPD] * 2;
				intTX = intAX * 2 - (m_arrBX[0] >> 3); intTY = intAY * 2 - (m_arrBY[0] >> 3);
			}
			else if (intN_a === 3)
			{
				intAX = (m_arrBX[3] >> 3) - intTX; intAY = (m_arrBY[3] >> 3) - intTY;
				if (intAX * intAX + intAY * intAY < 64) { intTX = 0; intTY = 32; }
			}
		}
		choose(intN_a, intTX, intTY);
	}

	// scared: a random way at each turning
	function wander(intN_a)
	{
		var intTX = m_arrBX[intN_a] >> 3, intTY = m_arrBY[intN_a] >> 3;
		var intD = rnd(4);
		var blnDone = false;
		for (var intJ = 0; intJ <= 3; intJ++)
		{
			var intW = (intD + intJ) & 3;
			if ((!blnDone) && (intW !== ((m_arrBD[intN_a] + 2) & 3)) && open1(intTX + DXS[intW], intTY + DYS[intW]))
			{
				m_arrBD[intN_a] = intW;
				blnDone = true;
			}
		}
		if (!blnDone) { m_arrBD[intN_a] = (m_arrBD[intN_a] + 2) & 3; }
	}

	// CHOMPBOT and a bug in the same place: he eats it (blue) or it gets him
	function catchBugs()
	{
		var blnDone = false;
		for (var intJ = 0; intJ <= 3; intJ++)
		{
			if ((!blnDone) && ((m_arrBSt[intJ] === B_OUT) || (m_arrBSt[intJ] === B_LEAVE)) && m_objSlots.collide(SL_P, 1 + intJ * 2))
			{
				if (m_arrBFr[intJ])
				{
					m_arrBFr[intJ] = false; m_arrBSt[intJ] = B_EYES; m_intAteBug = intJ;
					points([200, 400, 800, 1600][m_intChain]);
					spr(SL_PTS, OX + m_arrBX[intJ] - 8, OY + m_arrBY[intJ] - 8, 'pts', m_intChain + 1, 0);
					if (m_intChain < 3) { m_intChain++; }
					m_objSlots.hide(SL_P); m_objSlots.hide(1 + intJ * 2); m_objSlots.hide(2 + intJ * 2);
					m_objSound.play(2, 30, 4, 15, 25, false);
					m_intFrozen = 50; m_intPointsT = 0;
					// bring the eyes to a cell's middle so they can find their way home
					m_arrBX[intJ] = (m_arrBX[intJ] >> 3) * 8 + 4; m_arrBY[intJ] = (m_arrBY[intJ] >> 3) * 8 + 4;
					blnDone = true;
				}
				else
				{
					m_blnDead = true;
				}
			}
		}
	}

	// ====================================================================================================
	// DRAWING THE SPRITES

	function draw()
	{
		var intJ, intF, intPr;
		if ((m_intFrozen > 0) && (m_intPointsT === 0))
		{
			// (a bug's just been eaten: CHOMPBOT and it are hidden, the points shown)
		}
		else
		{
			// his mouth chomps while he moves (the sprite's own sequence), half open when he stops
			var intX = OX + m_intPX - 8, intY = OY + m_intPY - 8;
			if (m_intPD === 0) { spr(SL_P, intX, intY, 'chompu', 0, 0); }
			else if (m_intPD === 1) { spr(SL_P, intX, intY, 'chomp', 0, 0); }
			else if (m_intPD === 2) { spr(SL_P, intX, intY, 'chompu', 0, 0, SPRITE_MIRRORY); }
			else { spr(SL_P, intX, intY, 'chomp', 0, 0, SPRITE_MIRRORX); }
			if (m_blnPMov) { m_objSlots.animate(SL_P, 1); } else { m_objSlots.unanimate(SL_P, 2); }
		}
		for (intJ = 0; intJ <= 3; intJ++)
		{
			var intBX = OX + m_arrBX[intJ] - 8, intBY = OY + m_arrBY[intJ] - 8;
			if ((m_intFrozen > 0) && (m_intPointsT === 0) && (intJ === m_intAteBug))
			{
				// (hidden while its points show)
			}
			else if ((m_arrBSt[intJ] === B_EYES) || (m_arrBSt[intJ] === B_ENTER))
			{
				m_objSlots.hide(1 + intJ * 2);
				spr(2 + intJ * 2, intBX, intBY, 'eyes', m_arrBD[intJ] + 1, 0);
			}
			else if (m_arrBFr[intJ])
			{
				intPr = 5;
				if ((m_intFrT < 100) && (Math.floor(m_intFrT / 10) % 2 === 0)) { intPr = 6; }
				anim(1 + intJ * 2, intBX, intBY, 'bug', intPr);
				spr(2 + intJ * 2, intBX, intBY, 'scared', 1, intPr);
			}
			else
			{
				anim(1 + intJ * 2, intBX, intBY, 'bug', intJ + 1);
				spr(2 + intJ * 2, intBX, intBY, 'eyes', m_arrBD[intJ] + 1, intJ + 1);
			}
		}
		// the energy cells blink
		colours(m_intLevel - 1, (Math.floor(m_intFrames / 12) % 2 === 1) ? '' : 'off');
	}

	// caught: the bugs vanish, CHOMPBOT comes apart
	function dieStep()
	{
		if (m_intWait > 0)
		{
			m_intWait--;
		}
		else if (m_intStep === 0)
		{
			m_objSlots.hideRange(1, 8);
			m_objSlots.hide(SL_BON);
			m_intStep = 1;
		}
		else if (m_intStep <= 8)
		{
			if (m_intStep === 1) { anim(SL_P, OX + m_intPX - 8, OY + m_intPY - 8, 'die', 0); }
			m_objSound.play(0, 100 + (m_intStep - 1) * 60, 10, 13, 10, false);
			m_intStep++;
			m_intWait = 9;
		}
		else if (m_intStep === 9)
		{
			m_objSlots.hide(SL_P);
			m_intWait = 50;
			m_intStep = 10;
		}
		else
		{
			m_intLives--;
			showLives();
			if (m_intLives === 0)
			{
				// game over
				text(0, 14, 'GAME', C_PINK); text(0, 15, 'OVER', C_PINK);
				m_objSound.play(0, 600, 20, 14, 50, false);
				m_intWait = 150;
				m_strState = 'gameover';
			}
			else
			{
				ready();
			}
		}
	}

	// all the bolts gone: the walls flash, on to the next
	function clearedStep()
	{
		if (m_intWait > 0)
		{
			m_intWait--;
		}
		else if (m_intStep === 0)
		{
			m_objSlots.hideRange(1, 8);
			m_objSlots.hide(SL_BON); m_objSlots.hide(SL_PTS);
			m_intStep = 1;
		}
		else if (m_intStep <= 8)
		{
			colours(m_intLevel - 1, ((m_intStep - 1) % 2 === 1) ? 'fl' : '');
			m_intStep++;
			m_intWait = 11;
		}
		else
		{
			m_objSlots.hide(SL_P);
			points(0);
			m_intLevel++;
			newLevel();
			ready();
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
				case 'start': titleStart(); break;
				case 'title': titleStep(); m_objSlots.step(); break;
				case 'ready':
					m_intWait--;
					if (m_intWait <= 0)
					{
						text(0, 14, '      ', C_WHITE);
						m_strState = 'play';
					}
					break;
				case 'play': playStep(); m_objSlots.step(); break;
				case 'die': dieStep(); m_objSlots.step(); break;
				case 'cleared': clearedStep(); break;
				case 'gameover':
					if (m_intWait > 0) { m_intWait--; }
					else if (!fire()) { titleStart(); }
					break;
				default: break;
			}
			m_intFrames++;
		}
		m_objSound.update();
	};

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
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are, what it does on its own (sequence, delay) and the
	// part of it that counts when CHOMPBOT meets a bug (a square hbsize across, about its middle)
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a, intHB_a)
	{
		return { name:strName_a, classes:'chompbot', imagename:'chompbot_s0', x:0, y:0, w:16, h:16, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:16,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:intHB_a };
	}

	this.run = function()
	{
		var arrTiles = ['chompbot_tw0', 'chompbot_t0', 'chompbot_t2', 'chompbot_t3', 'chompbot_t4', 'chompbot_t5', 'chompbot_t6'];
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			sprite('chomp', G.S_CHOMP, [1, 2, 3, 2, -1], 2, 6),			// chomping
			sprite('chompu', G.S_CHOMPU, [1, 2, 3, 2, -1], 2, 6),
			sprite('die', G.S_DIE, [1, 2, 3, 4, 5, 6, 7, 8, 0], 10, 0),	// coming apart, once
			sprite('bug', G.S_BUG, [1, 2, -1], 6, 6),					// wriggling
			sprite('eyes', G.S_EYES, [1, 0], 1, 6), sprite('scared', G.S_SCARED, [1, 0], 1, 6), sprite('pts', G.S_PTS, [1, 0], 1, 0),
			sprite('bonus', G.S_BONUS, [1, 0], 1, 0), sprite('bval', G.S_BVAL, [1, 0], 1, 0) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrTiles, first:0, firstcode:0, transparent:0 });
		m_objBack = document.createElement('canvas');
		m_objBack.width = 256; m_objBack.height = 192;
		m_objBackContext = m_objBack.getContext('2d');
		m_objBackContext.imageSmoothingEnabled = false;
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:200, size:20, key:K_SPACE, label:'START' }
		] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('chompbot'), function()
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

var g_objGame = new chompbotGame();
g_objGame.run();
