// THE GRID - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The grid. Chains of droids march in from the top left and wind their way down it, row by row,
// towards you. Shoot a droid and it leaves a pod on the grid; pods grow, and a ripe pod bursts
// and drops a bomb. Down the left side runs the Y zapper, along the bottom the X zapper: every so
// often they fire, a beam along a row and a beam up a column - keep out of them - and where the
// beams cross, a new pod grows. Clear every droid to finish the sector.
//
// Keys: Q A O P (or S X Z C, or the arrows): move. Space (or M, 0): fire (hold it down).
// Touch: the pad on the left, FIRE on the right.
//
// The grid is drawn every frame in colours that run down it in waves (the Next turns its
// palette); the pods and the beams are the tile screen; you, the droids, the zappers, the
// bombs and the sparks are numbered sprites.
function thegridGame()
{
	var m_objThis = this;
	var G = GFX_THEGRID;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:96, y:32, w:256, h:192 };
	var NS = 24, NBOMB = 6, NP = 20, COLS = 15, ROWS = 10;
	var SP_SHIP = 0, SP_SHOT = 1, SP_XZ = 2, SP_YZ = 3, SP_SEG = 4, SP_BOMB = 28, SP_BOOM = 34, SP_DOT = 40;
	var K_O = 79, K_P = 80, K_A = 65, K_Q = 81, K_S = 83, K_X = 88, K_Z = 90, K_C = 67, K_M = 77, K_0 = 48, K_SPACE = 32;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 64);
	var m_objPad, m_objGrid, m_objBack, m_objBackContext;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the droids: on, the cell it's in, the cell it's going to, how far there (16ths), which way
	var m_arrSOn = [], m_arrSC = [], m_arrSR = [], m_arrSNC = [], m_arrSNR = [], m_arrSP = [], m_arrSDir = [], m_arrSHead = [];
	var m_arrPod = [], m_intPodClock = 0;
	var m_arrBOn = [], m_arrBX = [], m_arrBY = [];
	var m_intXNext = 0;
	var m_intPNext = 0;
	var m_intZX = 0, m_intZY = 0, m_intZDX = 0, m_intZDY = 0, m_intZT = 0, m_intZC = 0, m_intZR = 0, m_intBeam = 0;
	var m_arrRainbow = [], m_intFade = 0;
	var m_intShipX = 0, m_intShipY = 0, m_blnAlive = false, m_intDeadT = 0, m_intInv = 0;
	var m_blnShotOn = false, m_intShotX = 0, m_intShotY = 0;
	var m_intScore = 0, m_intHiscore = 10000, m_intLives = 3, m_intSector = 1, m_intSpeed = 1, m_intToCome = 0, m_intComeT = 0;
	var m_intFrames = 0, m_intMsgT = 0, m_blnScoreDirty = false, m_intShake = 0, m_intShakeX = 0, m_intShakeY = 0;
	var m_arrStars = [];

	var m_strState = 'loading', m_intStep = 0;

	// ====================================================================================================
	// KEYS, TEXT

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function fireDown()
	{
		return down(K_SPACE) || down(K_M) || down(K_0);
	}

	function text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function seven(int_a)
	{
		return rightStr('000000' + String(int_a), 7);
	}

	// ====================================================================================================
	// COLOURS: 24 round the rainbow (RRRGGGBB); the grid's lines in waves of them

	function rainbows()
	{
		for (var intK = 0; intK <= 23; intK++)
		{
			var intH = Math.floor(intK / 4), intF = (intK % 4) * 2, intR = 0, intG = 0, intB = 0;
			if (intH === 0) { intR = 7; intG = intF; intB = 0; }
			if (intH === 1) { intR = 7 - intF; intG = 7; intB = 0; }
			if (intH === 2) { intR = 0; intG = 7; intB = Math.floor(intF / 2); }
			if (intH === 3) { intR = 0; intG = 7 - intF; intB = 3; }
			if (intH === 4) { intR = intF; intG = 0; intB = 3; }
			if (intH === 5) { intR = 7; intG = 0; intB = 3 - Math.floor(intF / 2); }
			m_arrRainbow[intK] = intR * 32 + intG * 4 + intB;
		}
	}

	// the grid's picture (the Next's Layer 2) in this frame's colours: the lines by their row, the
	// stars, the zappers' tracks - and the shake
	function colours()
	{
		var arrEntry = [0];
		var intJ, intV;
		for (intJ = 0; intJ <= 23; intJ++)
		{
			intV = m_arrRainbow[(intJ + Math.floor(m_intFrames / 2)) % 24];
			if (m_intFade > 0)
			{
				intV = (m_intFade > 12) ? 0 : (intV & 0x92);
			}
			arrEntry.push(rgb332ToCSS(intV));
		}
		for (intJ = 0; intJ <= 3; intJ++)
		{
			arrEntry.push(((((Math.floor(m_intFrames / 8) + intJ * 3) & 7) === 0) ? rgb332ToCSS(0xFF) : rgb332ToCSS(0x49)));
		}
		arrEntry.push(rgb332ToCSS(m_arrRainbow[Math.floor(m_intFrames / 4) % 24] & 0x6D));
		if (m_intFade > 0) { m_intFade--; }

		var objC = m_objBackContext;
		objC.fillStyle = '#000';
		objC.fillRect(0, 0, 256, 192);
		// the stars (25-28)
		processArray(m_arrStars, function(arrS_a)
		{
			objC.fillStyle = arrEntry[arrS_a[2]];
			objC.fillRect(arrS_a[0], arrS_a[1], 1, 1);
		});
		// the lines: an entry by their row (1 + (y - 16) * 24 / 161)
		for (var intE = 1; intE <= 24; intE++)
		{
			var intY0 = 16 + Math.ceil((intE - 1) * 161 / 24);
			var intY1 = 16 + Math.ceil(intE * 161 / 24);
			objC.fillStyle = arrEntry[intE];
			for (var intCX = 0; intCX < 16; intCX++)
			{
				objC.fillRect(16 + intCX * 16, intY0, 1, Math.min(intY1, 177) - intY0);
			}
		}
		for (var intRY = 0; intRY < 11; intRY++)
		{
			var intY = 16 + intRY * 16;
			objC.fillStyle = arrEntry[1 + Math.floor((intY - 16) * 24 / 161)];
			objC.fillRect(16, intY, 241, 1);
		}
		// the zappers' tracks (29)
		objC.fillStyle = arrEntry[29];
		objC.fillRect(13, 16, 1, 176);
		objC.fillRect(16, 189, 240, 1);

		// the shake
		if (m_intShake > 0)
		{
			m_intShake--;
			m_intShakeX = rnd(5); m_intShakeY = rnd(5);
		}
		else
		{
			m_intShakeX = 0; m_intShakeY = 0;
		}
	}

	// ====================================================================================================
	// THE SCREEN

	function hud()
	{
		m_objGrid.clear(0);
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		showScore();
		text(14, 4, 'SECTOR ' + rightStr('0' + String(m_intSector), 2));
		showLives();
	}

	function showScore()
	{
		text(4, 4, seven(m_intScore));
		m_blnScoreDirty = false;
	}

	function showLives()
	{
		for (var intK = 0; intK <= 4; intK++)
		{
			m_objGrid.put(31 + intK, 4, (intK < m_intLives) ? G.T_LIFE : G.T_HUD, 0);
		}
	}

	function message(str_a, intY_a, intT_a)
	{
		text(4 + Math.floor((32 - str_a.length) / 2), intY_a, str_a);
		if (intT_a > 0) { m_intMsgT = intT_a; }
	}

	function clearMessage(intY_a)
	{
		m_objGrid.rect(4, intY_a, 32, 1, 0, 0);
		redrawRow(Math.floor((intY_a - 6) / 2));
	}

	function clearAll()
	{
		var intN;
		m_arrSOn = []; m_arrSC = []; m_arrSR = []; m_arrSNC = []; m_arrSNR = []; m_arrSP = []; m_arrSDir = []; m_arrSHead = [];
		for (intN = 0; intN < NS; intN++)
		{
			m_arrSOn.push(false); m_arrSC.push(0); m_arrSR.push(0); m_arrSNC.push(0); m_arrSNR.push(0); m_arrSP.push(0); m_arrSDir.push(1); m_arrSHead.push(false);
		}
		m_arrPod = [];
		for (intN = 0; intN < 150; intN++) { m_arrPod.push(0); }
		m_arrBOn = []; m_arrBX = []; m_arrBY = [];
		for (intN = 0; intN < NBOMB; intN++)
		{
			m_arrBOn.push(false); m_arrBX.push(0); m_arrBY.push(0);
		}
		m_objSlots.hideRange(SP_DOT, NP);
		m_intBeam = 0;
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objSlots.hideRange(0, 64);
		clearAll();
		m_intSector = 1; m_intLives = 3; m_intScore = 0;
		hud();
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		text(4, 4, 'HI ' + seven(m_intHiscore));
		message('T H E   G R I D', 9, 0);
		message('THE DROIDS ARE ON THE GRID', 12, 0);
		message('SHOOT THEM. MIND THE PODS,', 14, 0);
		message('THE BOMBS AND THE ZAPPERS.', 15, 0);
		message('QAOP MOVE   SPACE FIRE', 18, 0);
		message('(C) 2026 CYBORG UNICORN', 27, 0);
		m_intStep = 0; m_intFade = 30;
		m_strState = fireDown() ? 'titlerelease0' : 'title';
	}

	function titleStep()
	{
		colours();
		m_intStep++;
		if (m_intStep === 30) { message('PRESS SPACE', 23, 0); }
		if (m_intStep === 60) { m_objGrid.rect(4, 23, 32, 1, 0, 0); m_intStep = 0; }
		if (fireDown()) { m_strState = 'titlerelease'; }
	}

	// ====================================================================================================
	// A SECTOR

	function sectorStart()
	{
		clearAll();
		m_objSlots.hideRange(0, 60);
		hud();
		m_intToCome = Math.min(NS, 8 + m_intSector * 2);
		m_intSpeed = Math.min(3, 1 + Math.floor(m_intSector / 3));
		m_intComeT = 0;
		m_intShipX = 128; m_intShipY = 160; m_blnAlive = true; m_intInv = 60; m_intDeadT = 0; m_blnShotOn = false;
		m_intZX = 40; m_intZY = 40; m_intZDX = 1; m_intZDY = 1; m_intZT = 150; m_intPodClock = 0;
		m_intFade = 30;
		// a few pods to start with
		for (var intK = 1; intK <= 3 + m_intSector; intK++)
		{
			var intI = rnd(COLS) + rnd(5) * COLS + COLS;
			if (m_arrPod[intI] === 0) { m_arrPod[intI] = 1; drawPod(intI); }
		}
		message('SECTOR ' + String(m_intSector), 13, 80);
		m_strState = 'sector';
	}

	function sectorStep()
	{
		controls(); droids(); pods(); zappers(); bombs();
		drawAll();
		collisions();
		booms();
		colours();
		if (m_blnScoreDirty && ((m_intFrames & 3) === 0)) { showScore(); }
		if (m_intMsgT > 0)
		{
			m_intMsgT--;
			if (m_intMsgT === 0) { clearMessage(13); clearMessage(15); }
		}
		if ((!m_blnAlive) && (m_intDeadT === 0) && (m_intLives === 0))
		{
			gameOver();
		}
		else if ((m_intToCome === 0) && (!remaining()))
		{
			// cleared: a bonus for each pod still on the grid
			var intB = 0;
			for (var intK = 0; intK < 150; intK++)
			{
				if (m_arrPod[intK] > 0) { intB += 50; }
			}
			intB += m_intSector * 1000;
			addScore(intB);
			message('SECTOR CLEAR', 13, 0);
			message('BONUS ' + String(intB), 15, 0);
			m_objSound.play(0, 100, -2, 15, 50, false);
			m_intStep = 0;
			m_strState = 'clear';
		}
	}

	function clearStep()
	{
		m_intStep++;
		if ((m_intStep & 7) === 0) { spark(32 + rnd(192), 30 + rnd(140), 1); }
		colours();
		drawAll();
		booms();
		if (m_blnScoreDirty) { showScore(); }
		m_intShake = 0;
		if (m_intStep >= 120)
		{
			clearMessage(13); clearMessage(15);
			m_intSector++;
			sectorStart();
		}
	}

	function gameOver()
	{
		if (m_intScore > m_intHiscore) { m_intHiscore = m_intScore; }
		message('GAME OVER', 14, 0);
		m_intStep = 0;
		m_strState = 'over';
	}

	function overStep()
	{
		m_intStep++;
		colours();
		drawAll();
		booms();
		if ((m_intStep >= 250) || ((m_intStep > 50) && fireDown()))
		{
			m_strState = 'overrelease';
		}
	}

	function remaining()
	{
		var blnResult = false;
		for (var intN = 0; intN < NS; intN++)
		{
			if (m_arrSOn[intN]) { blnResult = true; }
		}
		return blnResult;
	}

	function addScore(intP_a)
	{
		var intWas = Math.floor(m_intScore / 10000);
		m_intScore += intP_a;
		m_blnScoreDirty = true;
		if ((Math.floor(m_intScore / 10000) > intWas) && (m_intLives < 5))
		{
			m_intLives++; showLives(); m_objSound.play(1, 50, -1, 14, 30, false);
		}
	}

	// ====================================================================================================
	// YOU

	function controls()
	{
		if (!m_blnAlive)
		{
			if (m_intDeadT > 0)
			{
				m_intDeadT--;
				if ((m_intDeadT === 0) && (m_intLives > 0)) { m_blnAlive = true; m_intInv = 100; m_intShipX = 128; m_intShipY = 160; }
			}
		}
		else
		{
			if (down(K_O) || down(K_Z) || down(KEY_LEFT)) { m_intShipX -= 3; }
			if (down(K_P) || down(K_C) || down(KEY_RIGHT)) { m_intShipX += 3; }
			if (down(K_Q) || down(K_S) || down(KEY_UP)) { m_intShipY -= 3; }
			if (down(K_A) || down(K_X) || down(KEY_DOWN)) { m_intShipY += 3; }
			m_intShipX = Math.max(24, Math.min(248, m_intShipX));
			m_intShipY = Math.max(104, Math.min(168, m_intShipY));
			if (m_intInv > 0) { m_intInv--; }
			// the shot: one at a time, fast
			if (m_blnShotOn)
			{
				m_intShotY -= 9;
				if (m_intShotY < 16) { m_blnShotOn = false; }
			}
			else if (fireDown())
			{
				m_blnShotOn = true; m_intShotX = m_intShipX; m_intShotY = m_intShipY - 8;
				m_objSound.play(0, 25, 3, 9, 3, false);
			}
		}
	}

	// what touches what: the sprites' own hit boxes (their library entries) say; the pods are
	// tiles, so the shot finds them by the grid cell it's in
	function collisions()
	{
		var intJ, intC, intR, intP;
		var arrHit;
		if (m_blnShotOn)
		{
			arrHit = m_objSlots.collideRange(SP_SHOT, SP_SEG, NS);
			if (arrHit.length > 0)
			{
				m_blnShotOn = false;
				killSeg(arrHit[0] - SP_SEG);
			}
		}
		if (m_blnShotOn)
		{
			arrHit = m_objSlots.collideRange(SP_SHOT, SP_BOMB, NBOMB);
			if (arrHit.length > 0)
			{
				intJ = arrHit[0] - SP_BOMB;
				m_blnShotOn = false; m_arrBOn[intJ] = false;
				boom(m_arrBX[intJ], m_arrBY[intJ]); addScore(25);
			}
		}
		if (m_blnShotOn)
		{
			intC = Math.floor((m_intShotX - 16) / 16); intR = Math.floor((m_intShotY - 16) / 16);
			if ((intC >= 0) && (intC < COLS) && (intR >= 0) && (intR < ROWS) && (m_arrPod[intR * COLS + intC] > 0))
			{
				intP = intR * COLS + intC;
				m_blnShotOn = false;
				m_arrPod[intP]--;
				drawPod(intP);
				if (m_arrPod[intP] === 0) { addScore(10); spark(m_intShotX, m_intShotY, 4); } else { spark(m_intShotX, m_intShotY, 1); }
				m_objSound.play(1, 40, 2, 10, 4, true);
			}
		}
		if (m_blnAlive && (m_intInv === 0))
		{
			// a bomb, a droid or a beam on you
			arrHit = m_objSlots.collideRange(SP_SHIP, SP_BOMB, NBOMB);
			if (arrHit.length > 0)
			{
				m_arrBOn[arrHit[0] - SP_BOMB] = false;
				die();
			}
			else if ((m_objSlots.collideRange(SP_SHIP, SP_SEG, NS).length > 0) ||
				((m_intBeam > 0) && (m_objSlots.collideRect(SP_SHIP, 24 + m_intZC * 16 + 24 - 3, 0, 6, 256) || m_objSlots.collideRect(SP_SHIP, 0, 24 + m_intZR * 16 + 24 - 3, 320, 6))))
			{
				die();
			}
		}
	}

	function die()
	{
		m_blnAlive = false; m_intDeadT = 110; m_intLives--; showLives();
		boom(m_intShipX, m_intShipY);
		spark(m_intShipX, m_intShipY, 12);
		m_intShake = 30; m_intFade = 0;
		for (var intK = 0; intK < NBOMB; intK++) { m_arrBOn[intK] = false; }
		m_objSound.play(2, 31, 0, 15, 70, true);
		m_objSound.play(1, 300, 10, 15, 50, false);
	}

	// ====================================================================================================
	// THE DROIDS

	function segX(intJ_a)
	{
		return 24 + m_arrSC[intJ_a] * 16 + (m_arrSNC[intJ_a] - m_arrSC[intJ_a]) * m_arrSP[intJ_a];
	}

	function segY(intJ_a)
	{
		return 24 + m_arrSR[intJ_a] * 16 + (m_arrSNR[intJ_a] - m_arrSR[intJ_a]) * m_arrSP[intJ_a];
	}

	function droids()
	{
		var intJ;
		// a new chain comes in at the top left, a droid every cell's width
		if (m_intToCome > 0)
		{
			m_intComeT -= m_intSpeed;
			if (m_intComeT <= 0)
			{
				var blnDone = false;
				for (intJ = 0; intJ < NS; intJ++)
				{
					if ((!blnDone) && (!m_arrSOn[intJ]))
					{
						m_arrSOn[intJ] = true; m_arrSC[intJ] = -1; m_arrSR[intJ] = 0; m_arrSNC[intJ] = 0; m_arrSNR[intJ] = 0; m_arrSP[intJ] = 0; m_arrSDir[intJ] = 1;
						m_arrSHead[intJ] = ((m_intToCome % 8) === 0);
						m_intToCome--;
						m_intComeT = 16;
						blnDone = true;
					}
				}
			}
		}
		for (intJ = 0; intJ < NS; intJ++)
		{
			if (m_arrSOn[intJ])
			{
				m_arrSP[intJ] += m_intSpeed;
				if (m_arrSP[intJ] >= 16)
				{
					m_arrSP[intJ] = 0; m_arrSC[intJ] = m_arrSNC[intJ]; m_arrSR[intJ] = m_arrSNR[intJ];
					// the next cell: on along the row; at the edge or a pod, down one and back
					var intC = m_arrSC[intJ] + m_arrSDir[intJ], intR = m_arrSR[intJ];
					if ((intC < 0) || (intC >= COLS)) { turn(intJ); }
					else if (m_arrPod[intR * COLS + intC] > 0) { turn(intJ); }
					else { m_arrSNC[intJ] = intC; m_arrSNR[intJ] = intR; }
				}
			}
		}
	}

	// droid j turns: down a row (or up from the bottom) and back the other way
	function turn(intJ_a)
	{
		m_arrSDir[intJ_a] = -m_arrSDir[intJ_a];
		var intR = m_arrSR[intJ_a] + 1;
		if (intR >= ROWS) { intR = ROWS - 2; }
		var intP = intR * COLS + m_arrSC[intJ_a];
		if (m_arrPod[intP] > 0) { m_arrPod[intP] = 0; drawPod(intP); }		// it eats through a pod in the way
		m_arrSNC[intJ_a] = m_arrSC[intJ_a]; m_arrSNR[intJ_a] = intR;
	}

	function killSeg(intJ_a)
	{
		var intX = segX(intJ_a), intY = segY(intJ_a);
		m_arrSOn[intJ_a] = false;
		boom(intX, intY);
		spark(intX, intY, 5);
		addScore(m_arrSHead[intJ_a] ? 100 : 20);
		// it leaves a pod where it was
		var intC = Math.floor((intX - 16) / 16), intR = Math.floor((intY - 16) / 16);
		if ((intC >= 0) && (intC < COLS) && (intR >= 0) && (intR < ROWS - 1) && (m_arrPod[intR * COLS + intC] === 0))
		{
			m_arrPod[intR * COLS + intC] = 1; drawPod(intR * COLS + intC);
		}
		m_objSound.play(2, 31, 0, 12, 12, true);
	}

	// ====================================================================================================
	// PODS

	// the pods grow; a ripe one bursts and drops a bomb
	function pods()
	{
		m_intPodClock++;
		if (m_intPodClock >= 30)
		{
			m_intPodClock = 0;
			for (var intC = 1; intC <= 4; intC++)
			{
				var intJ = rnd(150);
				if (m_arrPod[intJ] > 0)
				{
					if (m_arrPod[intJ] < 4)
					{
						m_arrPod[intJ]++; drawPod(intJ);
					}
					else
					{
						m_arrPod[intJ] = 0; drawPod(intJ);
						dropBomb(24 + (intJ % COLS) * 16, 24 + Math.floor(intJ / COLS) * 16);
					}
				}
			}
		}
	}

	// pod j's tiles (2 x 2), or blank
	function drawPod(intJ_a)
	{
		var intTX = 6 + (intJ_a % COLS) * 2, intTY = 6 + Math.floor(intJ_a / COLS) * 2;
		var intT = 0;
		if (m_arrPod[intJ_a] > 0)
		{
			intT = G.T_POD + (m_arrPod[intJ_a] - 1) * 4;
			m_objGrid.put(intTX, intTY, intT, 0); m_objGrid.put(intTX + 1, intTY, intT + 1, 0);
			m_objGrid.put(intTX, intTY + 1, intT + 2, 0); m_objGrid.put(intTX + 1, intTY + 1, intT + 3, 0);
		}
		else
		{
			m_objGrid.rect(intTX, intTY, 2, 2, 0, 0);
		}
	}

	// a grid row's / column's pods drawn again (after a beam or a message over them)
	function redrawRow(intR_a)
	{
		if ((intR_a >= 0) && (intR_a < ROWS))
		{
			for (var intC = 0; intC < COLS; intC++) { drawPod(intR_a * COLS + intC); }
		}
	}

	function redrawCol(intC_a)
	{
		for (var intR = 0; intR < ROWS; intR++) { drawPod(intR * COLS + intC_a); }
	}

	function dropBomb(intX_a, intY_a)
	{
		spark(intX_a, intY_a, 3);
		m_objSound.play(1, 200, -10, 11, 10, false);
		var blnDone = false;
		for (var intJ = 0; intJ < NBOMB; intJ++)
		{
			if ((!blnDone) && (!m_arrBOn[intJ])) { m_arrBOn[intJ] = true; m_arrBX[intJ] = intX_a; m_arrBY[intJ] = intY_a; blnDone = true; }
		}
	}

	function bombs()
	{
		for (var intJ = 0; intJ < NBOMB; intJ++)
		{
			if (m_arrBOn[intJ])
			{
				m_arrBY[intJ] += 2;
				if (m_arrBY[intJ] > 190) { m_arrBOn[intJ] = false; }
			}
		}
	}

	// ====================================================================================================
	// THE ZAPPERS: the X zapper slides along the bottom, the Y zapper down the left; every so often
	// they charge, then fire their beams; a new pod where they cross

	function zappers()
	{
		var intJ, intBT;
		if (m_intBeam === 0)
		{
			m_intZX += m_intZDX; m_intZY += m_intZDY;
			if (m_intZX < 24) { m_intZDX = 1; }
			if (m_intZX > 248) { m_intZDX = -1; }
			if (m_intZY < 24) { m_intZDY = 1; }
			if (m_intZY > 168) { m_intZDY = -1; }
		}
		m_intZT--;
		if (m_intZT === 30) { m_objSound.play(1, 100, -3, 10, 30, false); }
		if (m_intZT === 0)
		{
			// fire: the column and row they're on
			m_intZC = Math.min(COLS - 1, Math.floor((m_intZX - 16) / 16));
			m_intZR = Math.min(ROWS - 1, Math.floor((m_intZY - 16) / 16));
			m_intBeam = 24;
			intBT = G.T_VBEAM + (Math.floor(m_intFrames / 2) & 1);
			for (intJ = 6; intJ <= 25; intJ++) { m_objGrid.put(7 + m_intZC * 2, intJ, intBT, 0); }
			intBT = G.T_HBEAM + (Math.floor(m_intFrames / 2) & 1);
			for (intJ = 6; intJ <= 35; intJ++) { m_objGrid.put(intJ, 7 + m_intZR * 2, intBT, 0); }
			m_objGrid.put(7 + m_intZC * 2, 7 + m_intZR * 2, G.T_CROSS, 0);
			m_objSound.play(2, 20, 0, 14, 24, true);
			m_intShake = 6;
		}
		if (m_intBeam > 0)
		{
			m_intBeam--;
			if (m_intBeam === 0)
			{
				for (intJ = 6; intJ <= 25; intJ++) { m_objGrid.put(7 + m_intZC * 2, intJ, 0, 0); }
				for (intJ = 6; intJ <= 35; intJ++) { m_objGrid.put(intJ, 7 + m_intZR * 2, 0, 0); }
				redrawCol(m_intZC);
				redrawRow(m_intZR);
				if ((m_arrPod[m_intZR * COLS + m_intZC] === 0) && (m_intZR < ROWS - 1)) { m_arrPod[m_intZR * COLS + m_intZC] = 1; drawPod(m_intZR * COLS + m_intZC); }
				m_intZT = Math.max(90, 200 - m_intSector * 10 + rnd(80));
			}
		}
	}

	// ====================================================================================================
	// EFFECTS

	// an explosion: its sprite plays through once (its sequence) and is put away when it's done
	function boom(intX_a, intY_a)
	{
		spr(SP_BOOM + m_intXNext, intX_a + 16, intY_a + 16, 'boom', 1, 0, 2);
		m_objSlots.animate(SP_BOOM + m_intXNext, 1, true);
		m_intXNext = (m_intXNext + 1) % NBOMB;
	}

	function booms()
	{
		for (var intJ = 0; intJ < NBOMB; intJ++)
		{
			if (!m_objSlots.isAnimated(SP_BOOM + intJ)) { m_objSlots.hide(SP_BOOM + intJ); }
		}
	}

	// n sparks flying out from x, y: each its own sprite with its own mover (thrown out, falling,
	// gone after a while or off the bottom) - the game doesn't follow them
	function spark(intX_a, intY_a, intCount_a)
	{
		var intJ, intLife;
		for (intJ = 1; intJ <= intCount_a; intJ++)
		{
			intLife = 20 + rnd(20);
			spr(SP_DOT + m_intPNext, intX_a + 24, intY_a + 24, 'dot', 1 + (m_intPNext & 1), 0);
			m_objSlots.setMover(SP_DOT + m_intPNext, sparkMover(intLife), (rnd(65) - 32) / 16, (rnd(49) - 40) / 16);
			m_intPNext = (m_intPNext + 1) % NP;
		}
	}

	function sparkMover(intLife_a)
	{
		return function(intN_a, objO_a)
		{
			objO_a.x += objO_a.vx; objO_a.y += objO_a.vy; objO_a.vy += 3 / 16;
			return (objO_a.t >= intLife_a) || (objO_a.y > 190 + 24);
		};
	}

	// ====================================================================================================
	// THE SPRITES

	// sprite n: a library sprite at x, y in colours row; frame 0 leaves its frame to its animation
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intScale_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, 'thegrid_s' + intRow_a, intScale_a);
	}

	function drawAll()
	{
		var intJ, intRow;
		if ((!m_blnAlive) || ((m_intInv & 4) !== 0)) { m_objSlots.hide(SP_SHIP); }
		else { spr(SP_SHIP, m_intShipX + 24, m_intShipY + 24, 'ship', 0, 0); m_objSlots.animate(SP_SHIP, 1); }
		if (m_blnShotOn) { spr(SP_SHOT, m_intShotX + 24, m_intShotY + 24, 'shot', 1, 0); } else { m_objSlots.hide(SP_SHOT); }
		// the zappers (flashing while they charge)
		intRow = ((m_intZT < 30) && ((m_intFrames & 2) !== 0)) ? 1 : 0;
		spr(SP_XZ, m_intZX + 24, 176 + 32, 'zapper', 1, intRow);
		spr(SP_YZ, 32, m_intZY + 24, 'zapper', 2, intRow);
		for (intJ = 0; intJ < NS; intJ++)
		{
			if (m_arrSOn[intJ] && (m_arrSC[intJ] >= 0))
			{
				// alternate droids step out of time with each other: their loops start a frame apart
				spr(SP_SEG + intJ, segX(intJ) + 24, segY(intJ) + 24, 'droid', 0, m_arrSHead[intJ] ? 2 : 0);
				m_objSlots.animate(SP_SEG + intJ, 1 + (intJ & 1));
			}
			else
			{
				m_objSlots.hide(SP_SEG + intJ);
			}
		}
		for (intJ = 0; intJ < NBOMB; intJ++)
		{
			if (m_arrBOn[intJ]) { spr(SP_BOMB + intJ, m_arrBX[intJ] + 24, m_arrBY[intJ] + 24, 'bomb', 0, 0); m_objSlots.animate(SP_BOMB + intJ, 1); } else { m_objSlots.hide(SP_BOMB + intJ); }
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
				case 'titlerelease0': colours(); if (!fireDown()) { m_strState = 'title'; } break;
				case 'title': titleStep(); break;
				case 'titlerelease':
					colours();
					if (!fireDown())
					{
						m_objSound.play(0, 200, -6, 15, 25, false);
						m_intScore = 0; m_intLives = 3; m_intSector = 1;
						sectorStart();
					}
					break;
				case 'sector': sectorStep(); break;
				case 'clear': clearStep(); break;
				case 'over': overStep(); break;
				case 'overrelease': colours(); if (!fireDown()) { titleStart(); } break;
				default: break;
			}
			m_objSlots.step();
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
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(32, 32, 256, 192);
			objContext_a.clip();
			objContext_a.drawImage(m_objBack, 32 - m_intShakeX, 32 - m_intShakeY);
			objContext_a.restore();
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are, what it does on its own (sequence, delay) and the
	// part of it that counts in a collision (hbw x hbh about its middle)
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a)
	{
		return { name:strName_a, classes:'thegrid', imagename:'thegrid_s0', x:0, y:0, w:16, h:16, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:16,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:16, hbw:intHBW_a, hbh:intHBH_a };
	}

	this.run = function()
	{
		rainbows();
		// the stars: 110 of them, 4 twinkling colours (entries 25-28)
		for (var intK = 0; intK < 110; intK++)
		{
			m_arrStars.push([rnd(256), 16 + rnd(176), 25 + rnd(4)]);
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			sprite('ship', G.S_SHIP, [1, 2, -1], 3, 8, 8),			// engines flickering
			sprite('shot', G.S_SHOT, [1, 0], 1, 4, 8),
			sprite('droid', G.S_DROID, [1, 2, -1], 6, 12, 12),		// walking
			sprite('zapper', G.S_ZAPPER, [1, 0], 1, 16, 16),
			sprite('bomb', G.S_BOMB, [1, 2, -1], 4, 10, 12),		// spinning
			sprite('boom', G.S_BOOM, [1, 2, 3, 4, 0], 4, 0, 0),		// once through, then done
			sprite('dot', G.S_DOT, [1, 0], 1, 0, 0) ]);
		m_objSlots.setClip(0, 40, 320, 184);			// (the Next's sprite clip window)
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['thegrid_t0'], first:0, firstcode:0, transparent:0 });
		m_objBack = document.createElement('canvas');
		m_objBack.width = 256; m_objBack.height = 192;
		m_objBackContext = m_objBack.getContext('2d');
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:180, size:24, key:K_SPACE, label:'FIRE' }
		] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('thegrid'), function()
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

var g_objGame = new thegridGame();
g_objGame.run();
