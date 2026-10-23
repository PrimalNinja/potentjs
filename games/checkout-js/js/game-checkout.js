// CHECKOUT - four checkouts, one busy shift, and the tills can't add up. Ported from the ZX
// Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The tills show each price as you scan it, then forget it. Shoppers queue at your checkout and
// load the belt; scan each thing as it reaches the scanner (its price flashes up on the till's
// display - remember it!), and when the bag's full the shopper asks: how much? Pick the total
// from three. Right: the money's yours, and a bit extra for being quick. Wrong: they're cross,
// and it costs you. As the shift goes on, the baskets fill up and the prices go up. 1 to 4
// cashiers; the computer runs the other tills.
//
// Players: 1 O P + Space (touch: the arrows and SCAN, or tap a total), 2 the arrows + Enter (or
// game pad 1), 3 5 8 + 0, 4 J L + M (or game pad 2). Fire: scan / say it. Left, right: pick the
// total.
//
// The shop is one picture (the Next's Layer 2); the belts are its palette entries turned to make
// them run (masks tinted on top, tools/l2runs.py); the shoppers, the cashiers and the shopping
// are numbered sprites; the tills' displays, the takings and the totals are the tile screen.
function checkoutGame()
{
	var m_objThis = this;
	var G = GFX_CHECKOUT;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:96, y:32, w:256, h:192 };
	var NL = 4, NQ = 4, NI = 8, SHIFTLEN = 9000;
	var X_LOAD = 58, X_PAY = 196, X_SCAN = 168;
	var BELT_LIGHT = rgb332ToCSS(0x6D), BELT_DARK = rgb332ToCSS(0x24);
	// the keys: each player's left, right, button
	var KEYS = [ [79, 80, 32], [KEY_LEFT, KEY_RIGHT, 13], [53, 56, 48], [74, 76, 77] ];
	var K_SPACE = 32;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 64);
	var m_objPad, m_objGrid, m_objStore, m_objStoreContext;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the shoppers: per lane 4 (lane * 4 + k): state (0 none, 1 coming, 2 waiting, 3 to the belt,
	// 4 loading, 5 to the till, 6 asking, 7 going), x, things still to load, things on the belt
	// not scanned, the true total, colours, how long they've waited, face
	var m_arrCSt = [], m_arrCX = [], m_arrCLoad = [], m_arrCLeft = [], m_arrCSum = [], m_arrCPal = [], m_arrCT = [], m_arrCFace = [];
	// the things on the belts: per lane 8: on, x, kind, price, whose
	var m_arrIOn = [], m_arrIX = [], m_arrIK = [], m_arrIP = [], m_arrIW = [];
	// the tills
	var m_arrDispV = [], m_arrDispT = [], m_arrQOn = [], m_arrQA = [], m_arrQRight = [], m_arrQSel = [], m_arrQWho = [], m_arrQT = [];
	var m_arrMoney = [], m_arrMoneyWas = [], m_arrBelt = [0, 0, 0, 0], m_arrAiT = [], m_arrHuman = [], m_arrActWas = [], m_arrLRWas = [];
	var m_arrNRight = [], m_arrNWrong = [];
	// the belts' turn (which of each lane's 4 entries is light), -1: not drawn yet
	var m_arrPhase = [-1, -1, -1, -1], m_blnStoreDirty = true;
	var m_intPlayers = 0, m_intClock = 0, m_intNextCust = 0, m_intFrames = 0, m_blnDemo = false;

	var m_strState = 'loading', m_intWait = 0;

	// ====================================================================================================
	// KEYS, TEXT

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function anyKey()
	{
		var blnResult = down(K_SPACE) || down(48) || down(13);
		var intK;
		for (intK = 49; intK <= 52; intK++)
		{
			if (down(intK)) { blnResult = true; }
		}
		return blnResult;
	}

	function text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function box(intX0_a, intY0_a, intX1_a, intY1_a)
	{
		m_objGrid.rect(intX0_a, intY0_a, intX1_a - intX0_a + 1, intY1_a - intY0_a + 1, 32, 0);
	}

	// this iteration's first tap as a tile cell ({x, y}; null: none)
	function tapCell()
	{
		var arrTaps = m_objPad.taps();
		var objResult = null;
		if (arrTaps.length > 0)
		{
			objResult = { x:Math.floor((arrTaps[0].x - GAMEX) / 8), y:Math.floor(arrTaps[0].y / 8) };
		}
		return objResult;
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objSlots.hideRange(0, 64);
		m_objGrid.clear(0, 0);
		box(6, 6, 33, 25);
		text(14, 7, 'C H E C K O U T');
		text(8, 9, "THE TILLS CAN'T ADD UP.");
		text(8, 10, 'EACH PRICE FLASHES UP ONCE');
		text(8, 11, 'AS YOU SCAN IT. REMEMBER!');
		text(8, 12, 'THEN PICK THE TOTAL.');
		text(8, 14, m_objPad.isTouch() ? 'HOW MANY CASHIERS? TAP 1' : 'HOW MANY CASHIERS? 1 2 3 4');
		text(8, 16, '1  O P + SPACE');
		text(8, 17, '2  ARROWS + ENTER, PAD 1');
		text(8, 18, '3  5 8 + 0');
		text(8, 19, '4  J L + M, PAD 2');
		text(8, 21, 'FIRE: SCAN, OR SAY IT');
		text(8, 22, 'LEFT, RIGHT: PICK THE TOTAL');
		text(8, 24, 'THE COMPUTER RUNS THE REST');
		m_intPlayers = 0; m_blnDemo = false; m_intWait = 0;
		m_strState = 'title';
	}

	function titleStep()
	{
		var intK;
		var objCell = tapCell();
		belts();
		m_intFrames++;
		m_intWait++;
		for (intK = 1; intK <= 4; intK++)
		{
			if (down(48 + intK)) { m_intPlayers = intK; }
		}
		if (objCell !== null)
		{
			if ((objCell.y >= 13) && (objCell.y <= 15) && (objCell.x >= 26) && (objCell.x <= 34)) { m_intPlayers = Math.max(1, Math.min(4, Math.floor((objCell.x - 26) / 2) + 1)); }
			else if (m_objPad.isTouch()) { m_intPlayers = 1; }
		}
		if (m_intWait > 600) { m_blnDemo = true; }
		if ((m_intPlayers > 0) || m_blnDemo)
		{
			m_objGrid.clear(0, 0);
			m_objSound.play(0, 100, -3, 15, 25, 0);
			shiftStart();
		}
	}

	// ====================================================================================================
	// A SHIFT

	function shiftStart()
	{
		var intN, intK;
		for (intN = 0; intN < NL; intN++)
		{
			m_arrHuman[intN] = (intN < m_intPlayers); m_arrMoney[intN] = 0; m_arrMoneyWas[intN] = -1; m_arrDispT[intN] = 0; m_arrQOn[intN] = false;
			m_arrActWas[intN] = true; m_arrLRWas[intN] = 1; m_arrAiT[intN] = 0; m_arrNRight[intN] = 0; m_arrNWrong[intN] = 0;
		}
		for (intK = 0; intK <= 15; intK++)
		{
			m_arrCSt[intK] = 0;
		}
		for (intK = 0; intK <= 31; intK++)
		{
			m_arrIOn[intK] = false;
		}
		m_intClock = SHIFTLEN; m_intNextCust = 30; m_intFrames = 0;
		for (intN = 0; intN < NL; intN++)
		{
			label(intN);
			text(9, intN * 6 + 4, String(intN + 1));
		}
		m_strState = 'shift';
	}

	function shiftStep()
	{
		var intN;
		for (intN = 0; intN < NL; intN++)
		{
			if (m_arrHuman[intN]) { player(intN); } else { robot(intN); }
			lane(intN);
			drawLane(intN);
			if (m_arrMoney[intN] !== m_arrMoneyWas[intN]) { label(intN); }
		}
		arrivals();
		belts();
		if ((m_intFrames & 15) === 0) { showClock(); }
		m_intFrames++;
		m_intClock--;
		if (m_blnDemo && (anyKey() || (m_objPad.taps().length > 0)))
		{
			titleStart();
		}
		else if (m_intClock <= 0)
		{
			results();
		}
	}

	// the lane's cashier and takings, on the mat by the till
	function label(intL_a)
	{
		text(32, intL_a * 6 + 5, (m_arrHuman[intL_a] ? 'P' + (intL_a + 1) : 'CPU') + ' ');
		text(32, intL_a * 6 + 9, ('$' + m_arrMoney[intL_a] + '   ').substr(0, 4));
		m_arrMoneyWas[intL_a] = m_arrMoney[intL_a];
	}

	function showClock()
	{
		var intSec = Math.floor(m_intClock / 50);
		text(16, 1, 'SHIFT  ' + Math.floor(intSec / 60) + ':' + rightStr('0' + (intSec % 60), 2) + ' ');
	}

	// the till's display: a price ($ and up to 2 digits), or blank
	function display(intL_a, intV_a)
	{
		var intY = intL_a * 6 + 5;
		if (intV_a < 0)
		{
			m_objGrid.put(29, intY, G.T_DIGIT + 12, 0); m_objGrid.put(30, intY, G.T_DIGIT + 12, 0); m_objGrid.put(31, intY, G.T_DIGIT + 12, 0);
		}
		else
		{
			m_objGrid.put(29, intY, G.T_DIGIT + 10, 0);
			if (intV_a >= 10)
			{
				m_objGrid.put(30, intY, G.T_DIGIT + Math.floor(intV_a / 10), 0); m_objGrid.put(31, intY, G.T_DIGIT + intV_a % 10, 0);
			}
			else
			{
				m_objGrid.put(30, intY, G.T_DIGIT + intV_a, 0); m_objGrid.put(31, intY, G.T_DIGIT + 12, 0);
			}
		}
	}

	// the belts run: each lane's 4 palette entries turned when its belt moved (every 4th frame);
	// on the title they all run
	function belts()
	{
		var intL;
		for (intL = 0; intL < NL; intL++)
		{
			if ((m_arrBelt[intL] !== 0) || (m_strState === 'title'))
			{
				m_arrBelt[intL] = 0;
				if ((m_intFrames & 3) === 0)
				{
					m_arrPhase[intL] = (3 - Math.floor(m_intFrames / 4)) & 3;
					m_blnStoreDirty = true;
				}
			}
		}
	}

	// the shop picture again with the belts' colours (only when they've turned)
	function drawStore()
	{
		var intL, intJ, intPhase;
		m_objStoreContext.clearRect(0, 0, 256, 192);
		m_objStoreContext.drawImage(m_objSprites.getImageByName('checkout_store'), 0, 0);
		for (intL = 0; intL < NL; intL++)
		{
			intPhase = Math.max(0, m_arrPhase[intL]);
			for (intJ = 0; intJ <= 3; intJ++)
			{
				m_objStoreContext.drawImage(m_objSprites.getTintedImage('checkout_belt' + (intL * 4 + intJ), (intJ === intPhase) ? BELT_LIGHT : BELT_DARK), 0, 0);
			}
		}
		m_blnStoreDirty = false;
	}

	// ====================================================================================================
	// THE CASHIERS

	function player(intL_a)
	{
		var arrK = KEYS[intL_a];
		var intLR = 0, intJ;
		var blnAct = down(arrK[2]);
		var objCell;
		if (down(arrK[0])) { intLR = -1; }
		if (down(arrK[1])) { intLR = 1; }
		if (m_arrQOn[intL_a])
		{
			if ((intLR !== 0) && (m_arrLRWas[intL_a] === 0))
			{
				m_arrQSel[intL_a] = Math.max(0, Math.min(2, m_arrQSel[intL_a] + intLR));
				showQuestion(intL_a);
				m_objSound.play(1, 80, 0, 8, 2, 0);
			}
			if (blnAct && !m_arrActWas[intL_a]) { answer(intL_a); }
			// player 1 on a phone: a total tapped
			objCell = tapCell();
			if ((intL_a === 0) && m_arrQOn[intL_a] && (objCell !== null) && (objCell.y >= 8) && (objCell.y <= 10) && (objCell.x >= 17) && (objCell.x < 32))
			{
				intJ = Math.floor((objCell.x - 17) / 5);
				m_arrQSel[intL_a] = intJ;
				answer(intL_a);
			}
		}
		else if (blnAct && !m_arrActWas[intL_a])
		{
			scan(intL_a);
		}
		m_arrLRWas[intL_a] = intLR; m_arrActWas[intL_a] = blnAct;
	}

	// the computer's cashier: scans a moment after a thing arrives; answers - usually right
	function robot(intL_a)
	{
		var intF;
		if (m_arrAiT[intL_a] > 0)
		{
			m_arrAiT[intL_a]--;
		}
		else if (m_arrQOn[intL_a])
		{
			if (rnd(100) < 82) { m_arrQSel[intL_a] = m_arrQRight[intL_a]; } else { m_arrQSel[intL_a] = (m_arrQRight[intL_a] + 1 + rnd(2)) % 3; }
			answer(intL_a);
			m_arrAiT[intL_a] = 20;
		}
		else
		{
			intF = front(intL_a);
			if ((intF >= 0) && (m_arrIX[intF] >= X_SCAN))
			{
				scan(intL_a);
				m_arrAiT[intL_a] = 12 + rnd(20);
			}
		}
	}

	// the thing nearest the scanner on lane l (-1: none)
	function front(intL_a)
	{
		var intJ, intB = -1;
		for (intJ = intL_a * NI; intJ < intL_a * NI + NI; intJ++)
		{
			if (m_arrIOn[intJ] && ((intB < 0) || (m_arrIX[intJ] > m_arrIX[intB]))) { intB = intJ; }
		}
		return intB;
	}

	// scan the thing at the scanner: its price flashes up (and is gone again soon)
	function scan(intL_a)
	{
		var intF = front(intL_a);
		if ((intF >= 0) && (m_arrIX[intF] >= X_SCAN))
		{
			m_arrIOn[intF] = false;
			m_arrDispV[intL_a] = m_arrIP[intF]; m_arrDispT[intL_a] = 50;
			m_objSlots.animate(intL_a * 16, 3, true);		// the cashier scans (and stands again)
			display(intL_a, m_arrIP[intF]);
			m_arrCLeft[m_arrIW[intF]]--;
			m_objSound.play(0, 30, 0, 12, 3, 0);
		}
	}

	// the shopper's question: three totals, one right
	function ask(intL_a, intW_a)
	{
		var intS = m_arrCSum[intW_a];
		var intD1 = 1 + rnd(4), intD2;
		if (rnd(2) !== 0) { intD1 = -intD1; }
		intD2 = 0;
		while ((intD2 === 0) || (intD2 === intD1) || (intS + intD2 < 1))
		{
			intD2 = 1 + rnd(6);
			if (rnd(2) !== 0) { intD2 = -intD2; }
		}
		if (intS + intD1 < 1) { intD1 = -intD1; }
		m_arrQRight[intL_a] = rnd(3);
		m_arrQA[intL_a * 3 + m_arrQRight[intL_a]] = intS;
		m_arrQA[intL_a * 3 + (m_arrQRight[intL_a] + 1) % 3] = intS + intD1;
		m_arrQA[intL_a * 3 + (m_arrQRight[intL_a] + 2) % 3] = intS + intD2;
		m_arrQOn[intL_a] = true; m_arrQSel[intL_a] = 1; m_arrQWho[intL_a] = intW_a; m_arrQT[intL_a] = 400;
		m_arrCSt[intW_a] = 6;
		showQuestion(intL_a);
		m_objSound.play(1, 120, -4, 11, 8, 0);
	}

	function showQuestion(intL_a)
	{
		var intY = intL_a * 6 + 9, intJ, str;
		text(10, intY, 'TOTAL?');
		for (intJ = 0; intJ <= 2; intJ++)
		{
			str = '$' + m_arrQA[intL_a * 3 + intJ];
			str = (intJ === m_arrQSel[intL_a]) ? '>' + str + '<' : ' ' + str + ' ';
			text(17 + intJ * 5, intY, (str + '    ').substr(0, 5));
		}
	}

	function clearQuestion(intL_a)
	{
		m_objGrid.rect(10, intL_a * 6 + 9, 22, 1, 0, 0);
	}

	// the answer given: right - the takings and a tip for speed; wrong - a cross shopper
	function answer(intL_a)
	{
		var intW = m_arrQWho[intL_a];
		m_arrQOn[intL_a] = false;
		clearQuestion(intL_a);
		if ((m_arrQSel[intL_a] === m_arrQRight[intL_a]) && (m_arrQT[intL_a] > 0))
		{
			m_arrMoney[intL_a] += 2 + Math.floor(m_arrCSum[intW] / 4) + Math.floor(m_arrQT[intL_a] / 100);
			m_arrCFace[intW] = 1; m_arrNRight[intL_a]++;
			m_objSound.play(0, 60, -2, 14, 15, 0);
		}
		else
		{
			m_arrMoney[intL_a] -= 5;
			m_arrCFace[intW] = 2; m_arrNWrong[intL_a]++;
			m_objSound.play(2, 300, 8, 12, 20, 0);
		}
		m_arrCSt[intW] = 7; m_arrCT[intW] = 0;
	}

	// ====================================================================================================
	// THE SHOPPERS

	// now and then a shopper arrives at the shortest queue (if there's room)
	function arrivals()
	{
		var intL, intB = -1, intC, intBC = 99, intK, intPh, blnDone = false;
		m_intNextCust--;
		if (m_intNextCust <= 0)
		{
			intPh = Math.floor((SHIFTLEN - m_intClock) / 1800);		// 0-4: the shift goes on
			m_intNextCust = 70 - intPh * 8 + rnd(50);
			for (intL = 0; intL < NL; intL++)
			{
				intC = 0;
				for (intK = intL * NQ; intK < intL * NQ + NQ; intK++)
				{
					if ((m_arrCSt[intK] >= 1) && (m_arrCSt[intK] <= 4)) { intC++; }
				}
				intC = intC * 4 + rnd(4);
				if (intC < intBC) { intBC = intC; intB = intL; }
			}
			if (intBC < 12)
			{
				for (intK = intB * NQ; (intK < intB * NQ + NQ) && !blnDone; intK++)
				{
					if (m_arrCSt[intK] === 0)
					{
						m_arrCSt[intK] = 1; m_arrCX[intK] = 4; m_arrCPal[intK] = 5 + rnd(4); m_arrCT[intK] = 0; m_arrCFace[intK] = 0;
						m_arrCLoad[intK] = Math.min(7, 2 + rnd(2) + intPh);
						m_arrCLeft[intK] = 0; m_arrCSum[intK] = 0;
						blnDone = true;
					}
				}
			}
		}
	}

	// lane l: the shoppers move up, load the belt, walk to the till, ask, go; the belt runs
	function lane(intL_a)
	{
		var intJ, intW, intTX, intPos = 0, blnBusy = false, blnMoved = false, intPh;
		// the display forgets
		if (m_arrDispT[intL_a] > 0)
		{
			m_arrDispT[intL_a]--;
			if (m_arrDispT[intL_a] === 0) { display(intL_a, -1); }
		}
		// the question's clock
		if (m_arrQOn[intL_a])
		{
			m_arrQT[intL_a]--;
			if ((m_arrQT[intL_a] === 0) && m_arrHuman[intL_a]) { m_arrQSel[intL_a] = 9; answer(intL_a); }
		}
		// is the loading place taken? (someone loading or walking there)
		for (intW = intL_a * NQ; intW < intL_a * NQ + NQ; intW++)
		{
			if ((m_arrCSt[intW] === 3) || (m_arrCSt[intW] === 4)) { blnBusy = true; }
		}
		for (intW = intL_a * NQ; intW < intL_a * NQ + NQ; intW++)
		{
			switch (m_arrCSt[intW])
			{
				case 1:
				case 2:
					// in the queue: the first waiting one goes to the belt when it's free
					if (!blnBusy)
					{
						m_arrCSt[intW] = 3; blnBusy = true;
					}
					else
					{
						intTX = 40 - intPos * 16;
						intPos++;
						if (m_arrCX[intW] < intTX) { m_arrCX[intW]++; } else { m_arrCSt[intW] = 2; }
					}
					break;
				case 3:
					if (m_arrCX[intW] < X_LOAD) { m_arrCX[intW]++; } else { m_arrCSt[intW] = 4; m_arrCT[intW] = 0; }
					break;
				case 4:
					// put things on the belt, one at a time, when there's room at the start
					m_arrCT[intW]++;
					if (m_arrCT[intW] >= 16)
					{
						if (m_arrCLoad[intW] > 0)
						{
							intJ = freeItem(intL_a);
							if (room(intL_a) && (intJ >= 0))
							{
								intPh = Math.floor((SHIFTLEN - m_intClock) / 1800);
								m_arrIOn[intJ] = true; m_arrIX[intJ] = 56; m_arrIK[intJ] = rnd(12); m_arrIW[intJ] = intW;
								m_arrIP[intJ] = 1 + rnd(5 + intPh * 3);
								m_arrCSum[intW] += m_arrIP[intJ]; m_arrCLeft[intW]++;
								m_arrCLoad[intW]--; m_arrCT[intW] = 0;
							}
						}
						else
						{
							m_arrCSt[intW] = 5;
						}
					}
					break;
				case 5:
					if (m_arrCX[intW] < X_PAY) { m_arrCX[intW]++; }
					if ((m_arrCX[intW] >= X_PAY) && (m_arrCLeft[intW] === 0) && !m_arrQOn[intL_a]) { ask(intL_a, intW); }
					break;
				case 7:
					m_arrCX[intW] += 2;
					m_arrCT[intW]++;
					if (m_arrCX[intW] > 250) { m_arrCSt[intW] = 0; }
					break;
				default:
					break;
			}
		}
		// the belt: each thing moves up to the scanner, or the thing ahead of it
		for (intJ = intL_a * NI; intJ < intL_a * NI + NI; intJ++)
		{
			if (m_arrIOn[intJ] && (m_arrIX[intJ] < X_SCAN) && clear(intL_a, intJ))
			{
				m_arrIX[intJ]++;
				blnMoved = true;
			}
		}
		if (blnMoved) { m_arrBelt[intL_a] = 1; }
	}

	// is there room for a new thing at the start of lane l's belt?
	function room(intL_a)
	{
		var intJ, blnResult = true;
		for (intJ = intL_a * NI; intJ < intL_a * NI + NI; intJ++)
		{
			if (m_arrIOn[intJ] && (m_arrIX[intJ] < 74)) { blnResult = false; }
		}
		return blnResult;
	}

	function freeItem(intL_a)
	{
		var intJ, intResult = -1;
		for (intJ = intL_a * NI + NI - 1; intJ >= intL_a * NI; intJ--)
		{
			if (!m_arrIOn[intJ]) { intResult = intJ; }
		}
		return intResult;
	}

	// can thing j move on? (nothing just ahead of it)
	function clear(intL_a, intJ_a)
	{
		var intM, blnResult = true;
		for (intM = intL_a * NI; intM < intL_a * NI + NI; intM++)
		{
			if (m_arrIOn[intM] && (intM !== intJ_a) && (m_arrIX[intM] > m_arrIX[intJ_a]) && (m_arrIX[intM] - m_arrIX[intJ_a] < 18)) { blnResult = false; }
		}
		return blnResult;
	}

	// ====================================================================================================
	// DRAWING

	// sprite n: a library sprite at x, y in colours row; frame 0 leaves its frame to its animation
	function spr(intSlot_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intFlags_a)
	{
		m_objSlots.put(intSlot_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, 'checkout_s' + intRow_a, 1, intFlags_a);
	}

	// lane l: 16 sprites from l * 16: the cashier, 4 shoppers, 8 things, a face, spare
	function drawLane(intL_a)
	{
		var intB = intL_a * 16, intY0 = intL_a * 48 + 32, intJ, intW;
		spr(intB, 226 + 32, intY0 + 14, 'cashier', 0, 1 + intL_a, SPRITE_MIRRORX);
		for (intJ = 0; intJ <= 3; intJ++)
		{
			intW = intL_a * NQ + intJ;
			if (m_arrCSt[intW] === 0)
			{
				m_objSlots.hide(intB + 1 + intJ);
			}
			else
			{
				// standing (waiting, loading, asking) or walking: the person's sequence has both
				spr(intB + 1 + intJ, m_arrCX[intW] + 32, intY0 + 32, 'person', 0, m_arrCPal[intW], 0);
				m_objSlots.animate(intB + 1 + intJ, ((m_arrCSt[intW] === 2) || (m_arrCSt[intW] === 4) || (m_arrCSt[intW] === 6)) ? 1 : 3);
			}
		}
		for (intJ = 0; intJ < NI; intJ++)
		{
			intW = intL_a * NI + intJ;
			if (m_arrIOn[intW]) { spr(intB + 5 + intJ, m_arrIX[intW] + 32, intY0 + 15, 'item', m_arrIK[intW] + 1, 0, 0); } else { m_objSlots.hide(intB + 5 + intJ); }
		}
		// the face of whoever just paid
		m_objSlots.hide(intB + 13);
		for (intJ = 0; intJ <= 3; intJ++)
		{
			intW = intL_a * NQ + intJ;
			if ((m_arrCSt[intW] === 7) && (m_arrCFace[intW] > 0) && (m_arrCT[intW] < 50))
			{
				spr(intB + 13, m_arrCX[intW] + 32, intY0 + 18, 'face', m_arrCFace[intW], 0, 0);
			}
		}
	}

	// ====================================================================================================
	// THE END OF THE SHIFT

	function results()
	{
		var intR, intL, intBest, str;
		var arrUsed = [false, false, false, false];
		m_objSlots.hideRange(0, 64);
		m_objGrid.clear(0, 0);
		box(5, 8, 34, 22);
		text(11, 9, 'THE SHOP IS CLOSED');
		text(7, 11, '         TAKINGS RIGHT WRONG');
		for (intR = 0; intR <= 3; intR++)
		{
			intBest = -1;
			for (intL = 0; intL <= 3; intL++)
			{
				if (!arrUsed[intL] && ((intBest < 0) || (m_arrMoney[intL] > m_arrMoney[intBest]))) { intBest = intL; }
			}
			arrUsed[intBest] = true;
			str = m_arrHuman[intBest] ? 'P' + (intBest + 1) + '  ' : 'CPU' + (intBest + 1);
			text(7, 13 + intR * 2, (intR + 1) + '. ' + str + ' $' + (String(m_arrMoney[intBest]) + '    ').substr(0, 5) +
				rightStr('   ' + m_arrNRight[intBest], 4) + rightStr('     ' + m_arrNWrong[intBest], 6));
		}
		m_objSound.play(0, 100, -3, 15, 50, 0);
		m_intWait = 0;
		m_strState = 'results';
	}

	function resultsStep()
	{
		m_intWait++;
		if ((m_intWait >= 500) || ((m_intWait > 60) && (down(K_SPACE) || down(48) || down(13) || (m_objPad.taps().length > 0))))
		{
			titleStart();
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
				case 'title': titleStep(); break;
				case 'shift': shiftStep(); m_objSlots.step(); break;
				case 'results': resultsStep(); break;
				default: break;
			}
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
			if (m_blnStoreDirty) { drawStore(); }
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			// the shop (Layer 2), the sprites, the text on top
			objContext_a.drawImage(m_objStore, 32, 32);
			m_objSlots.paint(objContext_a);
			m_objGrid.paint(objContext_a, 0, 0);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are and what it does on its own (sequence, delay)
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a)
	{
		return { name:strName_a, classes:'checkout', imagename:'checkout_s0', x:0, y:0, w:16, h:16, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:16,
			sequence:(arrSequence_a === undefined) ? [1, 0] : arrSequence_a, delay:(intDelay_a === undefined) ? 1 : intDelay_a };
	}

	this.run = function()
	{
		var arrImages = [ { name:'checkout_store', classes:'checkout', source:'images/checkout/store.png' } ];
		var intE;
		for (intE = 0; intE <= 15; intE++)
		{
			arrImages.push({ name:'checkout_belt' + intE, classes:'checkout', source:'images/checkout/belt_F' + intE.toString(16).toUpperCase() + '.png' });
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addImagesToLibrary(arrImages);
		m_objSprites.addSpritesToLibrary([ sprite('person', G.S_PERSON, [1, 0, 2, 3, -3], 8), sprite('cashier', G.S_CASHIER, [1, 0, 2, 1, 0], 10), sprite('item', G.S_ITEM), sprite('face', G.S_FACE) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['checkout_t0'], first:0, firstcode:0, transparent:0 });
		m_objStore = document.createElement('canvas');
		m_objStore.width = 256; m_objStore.height = 192;
		m_objStoreContext = m_objStore.getContext('2d');
		m_objPad = new JPad({ controls:[
			{ type:'button', x:VIEW.x + 32, y:120, size:22, key:79, label:'<' },
			{ type:'button', x:VIEW.x + 32, y:190, size:22, key:80, label:'>' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:170, size:22, key:K_SPACE, label:'SCAN' }
		], gamepads:[
			{ index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, fire:13 } },
			{ index:1, keys:{ left:74, right:76, fire:77 } }
		] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('checkout'), function()
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

var g_objGame = new checkoutGame();
g_objGame.run();
