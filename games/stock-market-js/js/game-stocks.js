// STOCK MARKET - two years of stocks and shares, as teletext pages. Ported from the ZX Spectrum
// Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Two years on the market, a month a turn. You start with $1000 in the bank. Each month: buy,
// sell, then read the news - a teletext page of the month's goings on (storms, wars, aliens, a
// robot that wins a baking contest) - and see what it did to your shares. Prices drift a little on
// their own, the news moves them a lot. Go bust and a company's shares are worth nothing (it
// comes back later as a new float); over $500 and it splits 2 for 1. The bank pays 1% a month.
// After 24 months: how rich are you?
//
// Keys: Q A (or the arrows up / down, 7 6): pick a company. B: buy. S: sell. N: next month.
//       Buying or selling: O P (the arrows left / right, 5 8): one less / more (hold for faster),
//       M: as many as you can, Enter or Space: done, X: never mind.
// Touch: tap a company; the buttons at the sides.
//
// All of it is the tile screen, as a teletext page: 40 x 32 cells in 16 colour pairs (the
// JTileGrid's 16 variants), the teletext font and block graphics.
function stocksGame()
{
	var m_objThis = this;
	var G = GFX_STOCKS;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:64, y:8, w:320, h:232 };
	var NC = 8, MONTHS = 24, NSTORY = 40;
	// the colour pairs (ink on paper)
	var WHITE = 0, YELLOW = 1, CYAN = 2, GREEN = 3, RED = 4, MAGENTA = 5, BLUE = 6;
	var WONB = 7, YONB = 8, KONC = 9, WONR = 10, KONY = 11, KONW = 12, WONG = 13, YONR = 14, KONG = 15;
	var K_Q = 81, K_A = 65, K_B = 66, K_S = 83, K_N = 78, K_O = 79, K_P = 80, K_M = 77, K_X = 88;
	var K_7 = 55, K_6 = 54, K_5 = 53, K_8 = 56, K_SPACE = 32, K_ENTER = 13;
	var SEXT = [1, 2, 4, 8, 16, 32];
	var MENU = 'Q A PICK  B BUY  S SELL  N NEXT MONTH';
	var MENUTOUCH = 'TAP A COMPANY: BUY, SELL OR NEXT';
	// STOCK MARKET in block letters: six rows (a count, then the cells)
	var LOGO = [15, 152, 140, 144, 140, 156, 132, 152, 140, 144, 152, 140, 144, 148, 160, 132,
		15, 137, 140, 144, 128, 149, 128, 149, 128, 149, 149, 128, 128, 157, 145, 128,
		15, 137, 140, 129, 128, 133, 128, 137, 140, 129, 137, 140, 129, 133, 130, 132,
		18, 180, 160, 148, 152, 140, 144, 156, 140, 144, 148, 160, 132, 156, 140, 132,
		140, 156, 132, 18, 149, 133, 149, 157, 140, 149, 157, 156, 129, 157, 145, 128,
		157, 140, 128, 128, 149, 128, 18, 133, 128, 133, 133, 128, 133, 133, 130, 132,
		133, 130, 132, 141, 140, 132, 128, 133, 128];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	var m_arrTaps = [];

	var m_arrName = [], m_arrPrice = [], m_arrOwn = [], m_arrChg = [], m_arrMv = [], m_arrDead = [], m_arrHist = [], m_arrUsed = [];
	var m_intNote = -1, m_intNoteK = 0;
	var m_intCash = 0, m_intWorth = 0, m_intBest = 200000, m_intMonth = 0, m_intSel = 0, m_intInterest = 0;
	var m_strH1 = '', m_strH2 = '', m_strB1 = '', m_strB2 = '', m_strB3 = '', m_strBr1 = '', m_strBr2 = '';
	var m_intFrames = 0;

	// the touch buttons for each kind of page
	var m_arrMarketPad, m_arrTradePad, m_arrWaitPad;

	// ====================================================================================================
	// KEYS, TEXT

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function text(intX_a, intY_a, str_a, intCol_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intCol_a);
	}

	function rect(intX_a, intY_a, intW_a, intH_a, intCol_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, 32, intCol_a);
	}

	function cls()
	{
		rect(0, 0, 40, 32, 0);
	}

	function num(int_a)
	{
		return String(int_a);
	}

	function two(int_a)
	{
		return rightStr('0' + num(int_a), 2);
	}

	// cents as $1234.56
	function dollars(int_a)
	{
		return '$' + num(Math.floor(int_a / 100)) + '.' + two(int_a % 100);
	}

	function pct(int_a)
	{
		return ((int_a > 0) ? '+' : '') + num(int_a) + '%';
	}

	function touch()
	{
		return m_objPad.isTouch();
	}

	// ====================================================================================================
	// PAGES

	// the teletext header: the page number, the service, the date, the clock
	function header(intPage_a)
	{
		var intS = Math.floor(m_intFrames / 50);
		var str = 'P' + num(intPage_a) + '  NEXTFAX ' + num(intPage_a) + '  MON ' + two(m_intMonth + 1) + '  ';
		str += two((Math.floor(intS / 3600) % 24) + 9) + ':' + two(Math.floor(intS / 60) % 60) + ':' + two(intS % 60);
		text(1, 1, str, WHITE);
	}

	// a banner: a coloured bar 3 rows deep with a title in it
	function banner(intY_a, str_a, intCol_a)
	{
		rect(0, intY_a, 40, 3, intCol_a);
		text(Math.floor((40 - str_a.length) / 2), intY_a + 1, str_a, intCol_a);
	}

	function logo(intX_a, intY_a, intCol_a)
	{
		var intR, intI, intN, intP = 0;
		for (intR = 0; intR <= 5; intR++)
		{
			intN = LOGO[intP]; intP++;
			for (intI = 0; intI < intN; intI++)
			{
				m_objGrid.put(intX_a + intI + Math.floor(intR / 3) * 3, intY_a + intR + Math.floor(intR / 3), LOGO[intP], intCol_a);
				intP++;
			}
		}
	}

	// wait for Space / Enter (or a tap) on the title and the news; then for it to be let go
	function waitSpace(intY_a)
	{
		var intC = 0;
		m_objPad.setControls(m_arrWaitPad);
		m_objSteps.until(function()
		{
			var blnDone = down(K_SPACE) || down(K_ENTER) || (m_arrTaps.length > 0);
			intC++;
			if ((intC & 31) === 0)
			{
				if ((intC & 32) !== 0) { text(13, intY_a, touch() ? 'TAP TO GO ON' : 'PRESS  SPACE', KONY); } else { rect(13, intY_a, 12, 1, 0); }
			}
			if ((intC & 63) === 7) { header(100 + m_intMonth); }
			return blnDone;
		});
		m_objSteps.until(function()
		{
			return !(down(K_SPACE) || down(K_ENTER));
		});
		m_objSteps.call(function() { m_objSound.play(0, 80, 0, 12, 4, 0); });
	}

	function title()
	{
		cls();
		m_intMonth = 0;
		header(100);
		rect(0, 3, 40, 9, WONB);
		logo(2, 4, YONB);
		text(4, 14, 'THE GAME OF STOCKS AND SHARES', CYAN);
		text(2, 16, '24 MONTHS. $1000 IN THE BANK.', WHITE);
		text(2, 17, 'BUY LOW, SELL HIGH, READ THE NEWS.', WHITE);
		if (touch())
		{
			text(2, 19, 'TAP    PICK A COMPANY', GREEN);
			text(2, 20, 'BUY    SELL', GREEN);
			text(2, 21, '- +    HOW MANY  (ALL: ALL YOU CAN)', GREEN);
			text(2, 22, 'NEXT   NEXT MONTH (AND THE NEWS)', GREEN);
		}
		else
		{
			text(2, 19, 'Q A    PICK A COMPANY', GREEN);
			text(2, 20, 'B S    BUY, SELL', GREEN);
			text(2, 21, 'O P    HOW MANY  (M: ALL YOU CAN)', GREEN);
			text(2, 22, 'N      NEXT MONTH (AND THE NEWS)', GREEN);
		}
		text(2, 25, 'BEST FORTUNE SO FAR: ' + dollars(m_intBest), YELLOW);
		text(0, 29, '  (C) 2026 CYBORG UNICORN PTY LTD       ', WONR);
		waitSpace(27);
	}

	// ====================================================================================================
	// A GAME

	function play()
	{
		setup();
		month();
	}

	// a month: the market; then the news and the next month, or the end
	function month()
	{
		market();
		m_objSteps.call(function()
		{
			if (m_intMonth >= MONTHS)
			{
				final();
			}
			else
			{
				news();
				m_objSteps.call(function()
				{
					m_intMonth++;
					month();
				});
			}
		});
	}

	function setup()
	{
		var intI;
		m_arrName = ['ROBO BUTLERS PLC', 'SPECCY SOFTWARE', 'LUNAR CHEESE CO', 'COSMIC PIZZA', 'DODO AIRWAYS', 'BANANA SHIPPING', 'UNICORN GOLD MINES', 'BRELLY & SONS'];
		for (intI = 0; intI < NC; intI++)
		{
			m_arrPrice[intI] = 1000 + rnd(6000);
			m_arrOwn[intI] = 0; m_arrChg[intI] = 0; m_arrDead[intI] = 0;
			m_arrHist[intI * 25] = Math.floor(m_arrPrice[intI] / 10);
		}
		for (intI = 0; intI < NSTORY; intI++)
		{
			m_arrUsed[intI] = 0;
		}
		m_intCash = 100000; m_intMonth = 0; m_intSel = 0;
	}

	// ====================================================================================================
	// THE MARKET PAGE

	function menu()
	{
		rect(0, 20, 40, 2, 0);
		text(1, 20, touch() ? MENUTOUCH : MENU, GREEN);
	}

	function market()
	{
		var blnDone = false, intKWas = 1;
		cls();
		header(200);
		banner(3, 'STOCK MARKET    MONTH ' + num(m_intMonth + 1) + ' OF ' + num(MONTHS), YONB);
		if (m_intMonth >= MONTHS) { banner(3, 'THE MARKET HAS CLOSED', YONB); }
		text(1, 7, 'COMPANY            PRICE  CHANGE    OWN', CYAN);
		menu();
		if (m_intMonth >= MONTHS)
		{
			rect(0, 20, 40, 1, 0);
			text(1, 20, touch() ? 'THE FINAL BELL: TAP NEXT' : 'THE FINAL BELL: PRESS N', GREEN);
		}
		board();
		m_objPad.setControls(m_arrMarketPad);
		m_objSteps.until(function()
		{
			var intKS = 0, intY;
			if ((m_intFrames & 63) === 0) { header(200); }
			if (down(K_Q) || down(K_7) || down(KEY_UP)) { intKS = 1; }
			if (down(K_A) || down(K_6) || down(KEY_DOWN)) { intKS = 2; }
			if (down(K_B)) { intKS = 3; }
			if (down(K_S)) { intKS = 4; }
			if (down(K_N)) { intKS = 5; }
			if ((intKS !== 0) && (intKWas === 0))
			{
				if (intKS === 1) { m_intSel = (m_intSel + NC - 1) % NC; board(); m_objSound.play(0, 60, 0, 10, 2, 0); }
				if (intKS === 2) { m_intSel = (m_intSel + 1) % NC; board(); m_objSound.play(0, 60, 0, 10, 2, 0); }
				if ((intKS === 3) && (m_intMonth < MONTHS)) { trade(1); m_objSteps.call(board); }
				if ((intKS === 4) && (m_intMonth < MONTHS)) { trade(-1); m_objSteps.call(board); }
				if (intKS === 5) { blnDone = true; }
			}
			intKWas = intKS;
			// a tapped company
			if (m_arrTaps.length > 0)
			{
				intY = Math.floor(m_arrTaps[0].y / 8);
				if ((intY >= 9) && (intY < 9 + NC) && (intY - 9 !== m_intSel))
				{
					m_intSel = intY - 9; board(); m_objSound.play(0, 60, 0, 10, 2, 0);
				}
			}
			return blnDone;
		});
		m_objSteps.until(function()
		{
			return !down(K_N);
		});
	}

	// the companies, your cash, your fortune, and a chart of the one picked
	function board()
	{
		var intI, intY, intCol, str;
		m_intWorth = m_intCash;
		for (intI = 0; intI < NC; intI++)
		{
			intY = 9 + intI;
			intCol = (intI === m_intSel) ? KONC : WHITE;
			rect(0, intY, 40, 1, intCol);
			text(1, intY, m_arrName[intI], intCol);
			if (m_arrDead[intI] !== 0)
			{
				text(23, intY, 'BUST - SUSPENDED', intCol);
			}
			else
			{
				str = dollars(m_arrPrice[intI]);
				text(28 - str.length, intY, str, intCol);
				str = pct(m_arrChg[intI]);
				if (intI === m_intSel) { text(34 - str.length, intY, str, intCol); }
				else if (m_arrChg[intI] < 0) { text(34 - str.length, intY, str, RED); }
				else { text(34 - str.length, intY, str, GREEN); }
				str = num(m_arrOwn[intI]);
				text(39 - str.length, intY, str, intCol);
				m_intWorth += m_arrPrice[intI] * m_arrOwn[intI];
			}
		}
		rect(0, 18, 40, 1, 0);
		text(1, 18, 'CASH ' + dollars(m_intCash), YELLOW);
		str = 'WORTH ' + dollars(m_intWorth);
		text(39 - str.length, 18, str, YELLOW);
		chart();
	}

	// the picked company's price, month by month, in block graphics (2 months a cell, 5 cells high)
	function chart()
	{
		var intM, intMx = 1, intMn = 30000, intC, intR, intB, intK, intI, intV, intH;
		rect(0, 22, 40, 7, 0);
		text(1, 22, 'PRICE HISTORY: ' + m_arrName[m_intSel], CYAN);
		for (intM = 0; intM <= m_intMonth; intM++)
		{
			intH = m_arrHist[m_intSel * 25 + intM];
			if (intH > intMx) { intMx = intH; }
			if (intH < intMn) { intMn = intH; }
		}
		if (intMn > 0) { intMn--; }
		for (intC = 0; intC <= 12; intC++)
		{
			for (intR = 0; intR <= 4; intR++)
			{
				intB = 0;
				for (intK = 0; intK <= 1; intK++)
				{
					intM = intC * 2 + intK;
					if (intM <= m_intMonth)
					{
						// height in sextant rows (2-15): low to high
						intV = 2 + Math.floor((m_arrHist[m_intSel * 25 + intM] - intMn) * 13 / (intMx - intMn));
						// this cell's three rows of sextants (from the bottom: cell 4 holds rows 0-2)
						for (intI = 0; intI <= 2; intI++)
						{
							if (intV > (4 - intR) * 3 + (2 - intI)) { intB = intB | SEXT[intI * 2 + intK]; }
						}
					}
				}
				m_objGrid.put(2 + intC, 23 + intR, 128 + intB, GREEN);
			}
		}
		text(17, 24, 'HIGH ' + dollars(intMx * 10), WHITE);
		text(17, 25, 'LOW  ' + dollars((intMn + 1) * 10), WHITE);
		text(17, 27, 'NOW  ' + dollars(m_arrPrice[m_intSel]), WHITE);
	}

	// buy (dir 1) or sell (-1) shares in the company picked
	function trade(intDir_a)
	{
		var intQ = 1, intMx, intHeld = 0, intC = 0;
		var blnOK = false;
		if (m_arrDead[m_intSel] === 0)
		{
			intMx = (intDir_a > 0) ? Math.floor(m_intCash / m_arrPrice[m_intSel]) : m_arrOwn[m_intSel];
			if (intMx <= 0)
			{
				rect(0, 20, 40, 1, 0);
				if (intDir_a > 0) { text(1, 20, "YOU CAN'T AFFORD A SINGLE SHARE", RED); } else { text(1, 20, "YOU HAVEN'T GOT ANY TO SELL", RED); }
				m_objSound.play(1, 400, 0, 10, 10, 0);
				m_objSteps.wait(60);
				m_objSteps.call(menu);
			}
			else
			{
				if (intMx >= 10) { intQ = 10; }
				m_objSteps.until(function()
				{
					return !(down(K_B) || down(K_S));
				});
				m_objSteps.call(function()
				{
					m_objPad.setControls(m_arrTradePad);
					prompt();
				});
				m_objSteps.until(function()
				{
					var intStep;
					var blnDone = false;
					intC = 0;
					if (down(K_O) || down(K_5) || down(KEY_LEFT)) { intC = -1; }
					if (down(K_P) || down(K_8) || down(KEY_RIGHT)) { intC = 1; }
					if (down(K_M)) { intC = 2; }
					if (down(K_ENTER) || down(K_SPACE)) { intC = 3; }
					if (down(K_X)) { intC = 4; }
					if (intC === 0)
					{
						intHeld = 0;
					}
					else
					{
						if (intC === 3) { blnOK = true; blnDone = true; }
						if (intC === 4) { blnDone = true; }
						if (intC === 2) { intQ = intMx; }
						if ((intC === -1) || (intC === 1))
						{
							// held down: it speeds up
							intHeld++;
							intStep = 1;
							if (intHeld > 8) { intStep = 10; }
							if (intHeld > 24) { intStep = 100; }
							if (intHeld > 40) { intStep = 1000; }
							intQ = Math.max(1, Math.min(intMx, intQ + intC * intStep));
							m_objSound.play(0, 100, 0, 8, 2, 0);
							m_objSteps.wait((intHeld === 1) ? 12 : 4);
						}
						if (!blnDone) { prompt(); }
					}
					return blnDone;
				});
				m_objSteps.call(function()
				{
					if (blnOK)
					{
						if (intDir_a > 0)
						{
							m_intCash -= intQ * m_arrPrice[m_intSel]; m_arrOwn[m_intSel] += intQ;
						}
						else
						{
							m_intCash += intQ * m_arrPrice[m_intSel]; m_arrOwn[m_intSel] -= intQ;
						}
						m_objSound.play(0, 40, -1, 14, 12, 0);
					}
				});
				m_objSteps.until(function()
				{
					return !(down(K_ENTER) || down(K_SPACE) || down(K_X));
				});
				m_objSteps.call(function()
				{
					menu();
					m_objPad.setControls(m_arrMarketPad);
				});
			}
		}

		function prompt()
		{
			var str;
			rect(0, 20, 40, 2, WONB);
			str = ((intDir_a > 0) ? 'BUY ' : 'SELL ') + m_arrName[m_intSel] + ': ' + num(intQ);
			text(1, 20, str, YONB);
			str = ((intDir_a > 0) ? 'COST ' : 'FOR ') + dollars(intQ * m_arrPrice[m_intSel]) + (touch() ? '' : '  O P M ENTER X');
			text(1, 21, str, WONB);
		}
	}

	// ====================================================================================================
	// THE NEWS

	function news()
	{
		var intS, intI, intY, intCol, str, intSum = 0;
		var strT, strM0, strM1, strM2, strM3;
		for (intI = 0; intI < NC; intI++)
		{
			m_arrMv[intI] = rnd(9) - 4;			// the drift
		}
		// the main story (not one told lately) and a short one
		intS = rnd(NSTORY);
		while (m_arrUsed[intS] > 0)
		{
			intS = rnd(NSTORY);
		}
		for (intI = 0; intI < NSTORY; intI++)
		{
			if (m_arrUsed[intI] > 0) { m_arrUsed[intI]--; }
		}
		m_arrUsed[intS] = 12;
		story(intS);
		strT = m_strH1; strM0 = m_strH2;
		strM1 = m_strB1; strM2 = m_strB2; strM3 = m_strB3;
		brief(rnd(16));
		// prices move
		for (intI = 0; intI < NC; intI++)
		{
			if (m_arrDead[intI] !== 0)
			{
				m_arrDead[intI]--;
				if (m_arrDead[intI] === 0) { m_arrPrice[intI] = 1000 + rnd(1500); m_arrChg[intI] = 0; m_arrOwn[intI] = 0; }
			}
			else
			{
				if (m_arrMv[intI] < -90) { m_arrMv[intI] = -90; }
				m_arrPrice[intI] = Math.floor(m_arrPrice[intI] * (100 + m_arrMv[intI]) / 100);
				m_arrChg[intI] = m_arrMv[intI];
			}
		}
		checks();
		for (intI = 0; intI < NC; intI++)
		{
			m_arrHist[intI * 25 + m_intMonth + 1] = Math.floor(m_arrPrice[intI] / 10);
		}
		m_intInterest = Math.floor(m_intCash / 100);
		m_intCash += m_intInterest;
		// the page
		cls();
		header(101 + m_intMonth);
		rect(0, 3, 40, 3, WONR);
		text(2, 4, 'N E X T F A X    N E W S', WONR);
		text(1, 7, strT, YELLOW);
		text(1, 8, strM0, YELLOW);
		text(1, 10, strM1, WHITE);
		text(1, 11, strM2, WHITE);
		text(1, 12, strM3, WHITE);
		text(1, 14, 'IN BRIEF', CYAN);
		text(1, 15, m_strBr1, WHITE);
		text(1, 16, m_strBr2, WHITE);
		text(1, 18, 'MARKET MOVES', GREEN);
		intY = 19;
		for (intI = 0; intI < NC; intI++)
		{
			text(1, intY + intI, m_arrName[intI], WHITE);
			if (m_arrDead[intI] !== 0)
			{
				text(21, intY + intI, 'BUST!', RED);
			}
			else
			{
				intCol = (m_arrChg[intI] < 0) ? RED : GREEN;
				m_objGrid.put(20, intY + intI, 128 + 63, intCol);
				str = pct(m_arrChg[intI]);
				text(26 - str.length, intY + intI, str, intCol);
				str = dollars(m_arrPrice[intI]);
				text(39 - str.length, intY + intI, str, WHITE);
			}
			intSum += m_arrChg[intI];
		}
		text(1, 27, 'BANK INTEREST +' + dollars(m_intInterest), CYAN);
		notes();
		if (intSum > 0) { m_objSound.play(0, 100, -3, 13, 30, 0); } else { m_objSound.play(0, 300, 6, 13, 30, 0); }
		waitSpace(29);
	}

	// busts and splits (after the moves): noted for the page
	function checks()
	{
		var intI;
		m_intNote = -1;
		for (intI = 0; intI < NC; intI++)
		{
			if (m_arrDead[intI] === 0)
			{
				if (m_arrPrice[intI] < 100)
				{
					m_arrDead[intI] = 3; m_arrPrice[intI] = 0; m_arrOwn[intI] = 0; m_arrChg[intI] = -100; m_intNote = intI; m_intNoteK = 0;
				}
				else if (m_arrPrice[intI] > 50000)
				{
					m_arrPrice[intI] = Math.floor(m_arrPrice[intI] / 2); m_arrOwn[intI] *= 2; m_intNote = intI; m_intNoteK = 1;
				}
			}
		}
	}

	function notes()
	{
		if (m_intNote >= 0)
		{
			if (m_intNoteK === 0)
			{
				rect(0, 28, 40, 1, WONR);
				text(1, 28, m_arrName[m_intNote] + ' GOES BUST!', WONR);
			}
			else
			{
				rect(0, 28, 40, 1, KONG);
				text(1, 28, m_arrName[m_intNote] + ': 2 FOR 1 SPLIT', KONG);
			}
		}
	}

	// move company c by lo .. hi percent
	function hit(intC_a, intLo_a, intHi_a)
	{
		m_arrMv[intC_a] += intLo_a + rnd(intHi_a - intLo_a + 1);
	}

	function hitAll(intLo_a, intHi_a)
	{
		var intC;
		for (intC = 0; intC < NC; intC++)
		{
			hit(intC, intLo_a, intHi_a);
		}
	}

	// the main story s: the headline (2 lines), the story (3 lines), its moves
	function story(intS_a)
	{
		var arr = STORIES[intS_a];
		var intI;
		m_strH1 = arr[0]; m_strH2 = arr[1]; m_strB1 = arr[2]; m_strB2 = arr[3]; m_strB3 = arr[4];
		for (intI = 0; intI < arr[5].length; intI++)
		{
			if (arr[5][intI][0] < 0) { hitAll(arr[5][intI][1], arr[5][intI][2]); } else { hit(arr[5][intI][0], arr[5][intI][1], arr[5][intI][2]); }
		}
	}

	// the stories: headline, its second line, three lines of story, the moves ([company (-1: all), lo, hi])
	var STORIES = [
		['ALIENS LAND IN CORNWALL!', '', 'THEY COME IN PEACE, SAY THE VISITORS.', 'THEY ALSO WANT PIZZA. A LOT OF PIZZA.', 'THREE HUNDRED THOUSAND PEPPERONIS.', [[3, 40, 90], [4, -20, -5]]],
		['STORM BATTERS THE COAST', '', 'GALES OF 120 MPH. SHIPS STAY IN PORT,', 'PLANES GROUNDED, AND EVERYONE IN THE', 'COUNTRY WANTS AN UMBRELLA.', [[7, 30, 70], [5, -30, -10], [4, -25, -10]]],
		['WAR DECLARED ON BELGIUM', '...BY MISTAKE', 'A TYPING ERROR AT THE MINISTRY. THE', 'BELGIANS ARE VERY UNDERSTANDING. GOLD', 'SOARS ANYWAY. MARKETS ARE JUMPY.', [[6, 20, 50], [-1, -10, 0]]],
		['HEATWAVE: HOTTEST SUMMER EVER', '', 'CHEESE MELTS IN THE STREETS. NOBODY', 'NEEDS AN UMBRELLA. THE BEACHES ARE', 'FULL, THE FLIGHTS ARE FULL.', [[7, -50, -25], [2, -35, -15], [4, 10, 30]]],
		['MOON MADE OF CHEESE AFTER ALL', '', "ASTRONAUTS CONFIRM: IT'S A MATURE", 'CHEDDAR. LUNAR CHEESE CO ALREADY OWNS', 'THE MINING RIGHTS. CRACKERS NOT INCL.', [[2, 60, 120]]],
		['MOON NOT MADE OF CHEESE', '', "SCIENTISTS: 'IT IS ROCK. IT WAS ALWAYS", "ROCK.' LUNAR CHEESE CO SHARES FALL", "OFF A CLIFF. THE BOSS IS 'GUTTED'.", [[2, -60, -30]]],
		['ROBOT UPRISING FIZZLES OUT', '', 'THE ROBOTS ONLY WANTED A CUP OF TEA.', 'ROBO BUTLERS SAY THEIRS ALWAYS MAKE', 'THE TEA. ORDERS FLOOD IN.', [[0, 25, 60]]],
		['ROBO BUTLER WINS BAKE OFF', '', "'THE BEST SPONGE IN TEN YEARS,' SAYS", 'THE JUDGE. PIZZA SALES SLUMP AS THE', 'NATION BAKES AT HOME.', [[0, 20, 45], [3, -25, -10]]],
		['ROBOT BUTLER POURS TEA ON THE KING', '', "HIS MAJESTY IS 'NOT AMUSED'. A RECALL", 'OF 2 MILLION ROBO BUTLERS BEGINS.', '', [[0, -50, -25]]],
		['SPECCY GAME TOPS THE CHARTS', '', "'MANIC MINER 7' SELLS A MILLION COPIES", 'IN A WEEK. CASSETTE FACTORIES WORK', 'ROUND THE CLOCK.', [[1, 30, 80]]],
		['PIRATE TAPE SCANDAL', '', 'MILLIONS OF COPIED CASSETTES FOUND IN', "A SCHOOL PLAYGROUND. SPECCY SOFTWARE'S", 'PROFITS VANISH.', [[1, -45, -20]]],
		['GOLD FOUND IN UNICORN DROPPINGS', '', 'THE MINERS ARE NOT SURPRISED. NOBODY', 'ELSE WANTS TO TALK ABOUT IT.', '', [[6, 40, 90]]],
		['UNICORNS GO ON STRIKE', '', 'THEY WANT RAINBOWS AND A FOUR DAY', 'WEEK. THE GOLD MINES STAND IDLE.', '', [[6, -45, -20]]],
		['DODO JET LANDS ON WRONG CONTINENT', '', 'PASSENGERS FOR SPAIN ENJOY A SURPRISE', 'HOLIDAY IN PERU. COMPENSATION CLAIMS', 'COULD RUN TO MILLIONS.', [[4, -40, -20]]],
		['DODO AIRWAYS: THE BIRD CAN FLY!', '', 'THE FIRST DODO SINCE 1681 TAKES OFF', "AT THE AIRLINE'S OPENING CEREMONY.", 'BOOKINGS GO THROUGH THE ROOF.', [[4, 35, 75]]],
		['GIANT SQUID ATTACKS BANANA BOAT', '', "'IT WAS AFTER THE BANANAS,' SAYS THE", "CAPTAIN. BANANA SHIPPING'S INSURERS", 'ARE NOT ANSWERING THE PHONE.', [[5, -40, -15]]],
		['WORLD BANANA SHORTAGE', '', 'ONE BANANA NOW COSTS AS MUCH AS A', 'SMALL CAR. ANYONE WITH A BOAT FULL', 'OF THEM IS SUDDENLY RICH.', [[5, 40, 90]]],
		['COMET MISSES EARTH', '', 'BY ABOUT FOUR MILES. THE WORLD PARTIES', 'AND THE MARKETS ARE IN A GREAT MOOD.', '', [[-1, 5, 20]]],
		['MARKET CRASH! SELL! SELL! SELL!', '', 'NOBODY KNOWS WHY. A MAN IN A BOWLER', 'HAT SNEEZED AND IT ALL WENT WRONG.', '', [[-1, -40, -15]]],
		['BOOM TIME!', '', 'THE CHANCELLOR ABOLISHES TAX FOR A', 'MONTH. EVERYTHING GOES UP.', '', [[-1, 10, 30]]],
		['RAIN FOR FORTY DAYS', '', 'A MAN IS SEEN BUILDING A BIG BOAT.', 'UMBRELLAS SELL OUT. NOBODY FLIES.', '', [[7, 60, 120], [4, -30, -10], [5, 10, 30]]],
		['STOCK EXCHANGE CAT SITS ON KEYBOARD', '', 'PRICES ARE ALL OVER THE PLACE. THE CAT', 'HAS BEEN GIVEN A BONUS.', '', [[-1, -30, 30]]],
		['PIZZA GIVEN TO EVERY SCHOOL CHILD', '', "GOVERNMENT'S NEW HEALTHY EATING PLAN", 'HAS SOME NUTRITIONISTS WORRIED.', '', [[3, 30, 60], [2, 10, 25]]],
		['PIZZA DELIVERED BY DODO', '', 'COSMIC PIZZA AND DODO AIRWAYS TEAM UP:', 'YOUR PIZZA, ANYWHERE, IN AN HOUR.', 'COLD, BUT IN AN HOUR.', [[3, 15, 35], [4, 15, 35]]],
		['ALIENS COME BACK FOR A REFUND', '', "'THE PIZZA WAS COLD,' THEY SAY, AND", 'PARK A MOTHERSHIP OVER THE HEAD OFFICE.', '', [[3, -50, -20]]],
		['GOLD RUSH IN THE SCOTTISH HIGHLANDS', '', 'A FARMER FINDS A NUGGET THE SIZE OF A', 'SHEEP. EVERYONE HEADS NORTH.', '', [[6, -25, -10], [4, 10, 25]]],
		['ZX SPECTRUM 2000 LAUNCHED', '', 'RUBBER KEYS ARE BACK. QUEUES ROUND THE', 'BLOCK AT EVERY COMPUTER SHOP.', '', [[1, 40, 90], [0, -10, 5]]],
		['UMBRELLA FLIES AWAY WITH CHAIRMAN', '', 'MR BRELLY WAS LAST SEEN OVER FRANCE.', "THE BOARD SAYS 'BUSINESS AS USUAL'.", '', [[7, -40, -15]]],
		['INTEREST RATES UP', '', 'THE BANK OF ENGLAND PUTS RATES UP.', 'SAVERS SMILE. SHARES DIP.', '', [[-1, -12, 0]]],
		['DOG ELECTED MAYOR OF SWINDON', '', 'HIS FIRST ACT: MORE LAMP POSTS.', 'THE MARKETS BARELY NOTICE.', '', [[-1, -3, 5]]],
		['SEA MONSTER EATS A CONTAINER SHIP', '', "'IT WAS FULL OF CHEESE,' SAYS THE", 'LOCH NESS TOURIST BOARD, PROUDLY.', '', [[5, -30, -10], [2, 10, 30]]],
		['TIME TRAVELLER BUYS SHARES', '', 'A MAN IN A SILVER SUIT BUYS EVERY', 'SPECCY SOFTWARE SHARE HE CAN FIND.', "'TRUST ME,' HE SAYS. THEN VANISHES.", [[1, 20, 50]]],
		['VOLCANO ERUPTS IN ICELAND', '', 'THE ASH CLOUD GROUNDS EVERY PLANE IN', 'EUROPE. PEOPLE STAY HOME, ORDER PIZZA.', '', [[4, -45, -20], [3, 10, 30]]],
		['ROBOTS LEARN TO MINE GOLD', '', 'ROBO BUTLERS SIGN A DEAL WITH UNICORN', 'GOLD MINES. THE UNICORNS ARE FURIOUS.', '', [[0, 20, 40], [6, 5, 25]]],
		['SNOW IN JULY', '', 'NOBODY KNOWS WHAT TO WEAR. UMBRELLAS', 'SELL WELL. BANANAS FREEZE ON THE DOCK.', '', [[7, 15, 35], [5, -25, -10]]],
		['MILLIONAIRE BUYS THE MOON', '', 'HE PLANS A THEME PARK. LUNAR CHEESE CO', 'WILL RUN THE CAFE.', '', [[2, 25, 55]]],
		['ALIENS WANT OUR UMBRELLAS', '', 'IT RAINS ACID ON THEIR PLANET. THEY', 'PAY IN GOLD. EVERYONE WINS.', '', [[7, 40, 80], [6, 10, 30]]],
		['PIRATES SEIZE THE BANANA FLEET', '', 'THE NAVY IS SENT. THE PIRATES SURRENDER', 'AFTER ONE BITE. THEY HATE BANANAS.', '', [[5, -20, 10]]],
		['TEA SHORTAGE GRIPS THE NATION', '', 'A ROBO BUTLER WITHOUT TEA IS JUST A', 'ROBOT. SHARES FALL AS TEMPERS RISE.', '', [[0, -35, -15]]],
		['THE WORLD CUP IS COMING HERE!', '', 'FLIGHTS ARE BOOKED, PIZZAS ORDERED, AND', 'IT WILL PROBABLY RAIN.', '', [[4, 15, 40], [3, 15, 40], [7, 5, 20]]]
	];

	// a short item: a rumour, a tip - smaller moves
	function brief(intS_a)
	{
		var intC = rnd(NC), intK;
		var strN = m_arrName[intC];
		m_strBr2 = '';
		switch (intS_a)
		{
			case 0: m_strBr1 = 'CHAIRMAN OF ' + strN + ' BUYS A YACHT.'; hit(intC, 3, 12); break;
			case 1: m_strBr1 = 'TAX INSPECTORS VISIT ' + strN + '.'; hit(intC, -12, -3); break;
			case 2: m_strBr1 = strN + ' WINS AN AWARD.'; hit(intC, 5, 15); break;
			case 3: m_strBr1 = 'RUMOUR: ' + strN + ' IS IN TROUBLE.'; hit(intC, -15, -5); break;
			case 4: m_strBr1 = "SHARE TIPSTER: 'BUY " + strN + "!'"; hit(intC, 0, 20); break;
			case 5: m_strBr1 = strN + "'S BOSS FALLS IN A POND."; hit(intC, -8, 0); break;
			case 6: m_strBr1 = 'A PIGEON NESTS IN ' + strN + "'S"; m_strBr2 = "BOARDROOM. 'GOOD LUCK,' SAYS THE BOARD."; hit(intC, 2, 10); break;
			case 7: m_strBr1 = strN + ' MOVES TO A BIGGER OFFICE.'; hit(intC, 0, 10); break;
			case 8: m_strBr1 = strN + "'S ACCOUNTS 'A BIT ODD'."; hit(intC, -20, -5); break;
			case 9: m_strBr1 = 'QUIET MONTH IN THE CITY.'; break;
			case 10: m_strBr1 = 'TEA BREAK RUNS LONG AT THE EXCHANGE.'; break;
			case 11: m_strBr1 = 'WEATHER: ' + m_arrName[7] + ' WATCHES THE SKY.'; hit(7, -5, 5); break;
			case 12: m_strBr1 = strN + ' LAUNCHES A NEW ADVERT.'; hit(intC, 0, 12); break;
			case 13: m_strBr1 = 'UFO SEEN OVER ' + strN + "'S FACTORY."; hit(intC, -5, 15); break;
			case 14: m_strBr1 = strN + ' STAFF GO ON A PICNIC.'; hit(intC, -3, 3); break;
			default: m_strBr1 = 'FORTUNE TELLER BACKS ' + strN + '.'; hit(intC, -10, 20); break;
		}
		// too long for a line: split at a space
		if ((m_strBr1.length > 38) && (m_strBr2 === ''))
		{
			intK = 38;
			while ((intK > 1) && (m_strBr1.charAt(intK - 1) !== ' '))
			{
				intK--;
			}
			m_strBr2 = m_strBr1.substr(intK);
			m_strBr1 = m_strBr1.substr(0, intK - 1);
		}
	}

	// ====================================================================================================
	// THE END

	function final()
	{
		var intI, intR = 0;
		var arrSays = ["A PAUPER. HERE'S A PENNY.", 'A CAUTIOUS SAVER.', 'A SHREWD INVESTOR.', 'A BIG CHEESE.', 'A CITY WIZARD.', 'A TYCOON. BUY THE MOON.'];
		cls();
		header(999);
		banner(3, 'THE FINAL BELL', WONR);
		m_intWorth = m_intCash;
		for (intI = 0; intI < NC; intI++)
		{
			if (m_arrDead[intI] === 0) { m_intWorth += m_arrPrice[intI] * m_arrOwn[intI]; }
		}
		text(2, 8, 'YOU STARTED WITH $1000.00', WHITE);
		text(2, 10, 'YOU ARE WORTH ' + dollars(m_intWorth), YELLOW);
		if (m_intWorth > 100000) { intR = 1; }
		if (m_intWorth > 300000) { intR = 2; }
		if (m_intWorth > 1000000) { intR = 3; }
		if (m_intWorth > 5000000) { intR = 4; }
		if (m_intWorth > 20000000) { intR = 5; }
		text(2, 13, 'THE CITY SAYS YOU ARE:', CYAN);
		text(2, 15, arrSays[intR], GREEN);
		if (m_intWorth > m_intBest)
		{
			m_intBest = m_intWorth;
			text(2, 18, 'THE BEST FORTUNE YET!', YONR);
			m_objSound.play(0, 60, -2, 15, 60, 0);
		}
		waitSpace(27);
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		// taps in the game's own coordinates
		m_arrTaps = [];
		processArray(m_objPad.taps(), function(objTap_a)
		{
			if ((objTap_a.x >= GAMEX) && (objTap_a.x < GAMEX + 320)) { m_arrTaps.push({ x:objTap_a.x - GAMEX, y:objTap_a.y }); }
		});
		if (m_blnLoaded)
		{
			m_objSteps.update();
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
			m_objGrid.paint(objContext_a, 0, 0);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var arrTiles = [];
		var intI;
		var intR = VIEW.x + VIEW.w - 32;
		for (intI = 0; intI <= 15; intI++)
		{
			arrTiles.push('stocks_t' + intI);
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrTiles, first:0, firstcode:0 });
		m_arrMarketPad = [
			{ type:'dpad', x:VIEW.x + 32, y:128, size:28, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:intR, y:70, size:20, key:K_B, label:'BUY' },
			{ type:'button', x:intR, y:128, size:20, key:K_S, label:'SELL' },
			{ type:'button', x:intR, y:186, size:20, key:K_N, label:'NEXT' } ];
		m_arrTradePad = [
			{ type:'button', x:VIEW.x + 32, y:100, size:20, key:K_O, label:'-' },
			{ type:'button', x:VIEW.x + 32, y:160, size:20, key:K_P, label:'+' },
			{ type:'button', x:intR, y:70, size:20, key:K_M, label:'ALL' },
			{ type:'button', x:intR, y:128, size:20, key:K_ENTER, label:'OK' },
			{ type:'button', x:intR, y:186, size:20, key:K_X, label:'X' } ];
		m_arrWaitPad = [
			{ type:'button', x:intR, y:128, size:20, key:K_SPACE, label:'GO' } ];
		m_objPad = new JPad({ controls:m_arrWaitPad });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('stocks'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			// the BASIC's main loop: the title, a game, again
			m_objSteps.until(function()
			{
				title();
				m_objSteps.call(play);
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new stocksGame();
g_objGame.run();
