// ARCADE TYCOON - run an amusement arcade. Ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// You've $5000 and an empty arcade. Buy machines and put them on the floor; people come in, look
// for the kind of game they're after, put their money in and play. Watch what's popular (the
// stars, the news each morning) and buy more of what gets played; sell what doesn't (for half
// what you paid). Machines break down - fix them, or nobody plays them. Each night the rent and
// the power bill come out. Make $30,000 and you're rich. Go broke and it's over.
//
// Keys: Q A O P or the arrows (or a game pad) move round the floor. Space or Enter: on an empty
//       spot, buy a machine; on a machine, see how it's doing - fix it, buy another the same, or
//       sell it. In a list: Q A choose, Space take it, M back.
// Touch or mouse: tap a spot to go there, tap it again to choose; tap a line of a list, tap it
//       again to take it; BACK.
//
// The floor is one picture (the Next's Layer 2: tools/l2runs.py); the machines and the people are
// numbered sprites (the screens' colours turn round, as the Next's palette did: three sprite
// images, tools/ports/arcade.json); the panel and the lists are the tile screen.
function arcadeGame()
{
	var m_objThis = this;
	var G = GFX_ARCADE;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:96, y:32, w:256, h:192 };
	var NS = 24, NC = 16, NT = 8;
	var GOAL = 30000, START = 5000, HOUR = 400, RENT = 150, POWER = 15;
	var WALKX = 128, DOORY = 190;
	// sprite slots: machines 0-47 (2 each), people 48-63, their faces / coins 64-79, signs 80-103,
	// the cursor 104-105
	var SP_CAB = 0, SP_MAN = 48, SP_ICON = 64, SP_SIGN = 80, SP_CUR = 104;
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_M = 77, K_SPACE = 32, K_ENTER = 13;
	var NAMES = ['', 'PINBALL', 'RACER', 'GUN GAME', 'FIGHTER', 'DANCE', 'CLAW', 'AIR HOCKEY', 'RETRO'];
	var SCREENS = ['a', 'b', 'c'];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objSteps = new JSteps();
	var m_objRepeat = new JRepeat(12, 5);
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the kinds of machine: price, a play's price, how long a play is (frames), how often it breaks
	// (in 1000 plays), how popular (0-100)
	var m_arrTPrice = [], m_arrTPlay = [], m_arrTTime = [], m_arrTBreak = [], m_arrTPop = [];
	// the slots: the kind there (0 none), broken, busy (who's playing: a person + 100), someone
	// waiting, takings, plays, new (a few days' novelty), to be drawn again
	var m_arrMK = [], m_arrMBroke = [], m_arrMBusy = [], m_arrMWait = [], m_arrMTake = [], m_arrMPlays = [], m_arrMNew = [], m_arrMDraw = [];
	// the people: state (0 none, 1 walking to a machine, 2 waiting, 3 playing, 4 leaving), where,
	// where to, which machine, plays left, a timer, palette, mood (1 happy, 2 cross), what's shown
	// over them (1 coin, 2 happy, 3 cross) and how long
	var m_arrPS = [], m_arrPX = [], m_arrPY = [], m_arrPTX = [], m_arrPTY = [], m_arrPM = [], m_arrPCr = [], m_arrPT = [];
	var m_arrPPal = [], m_arrPMood = [], m_arrPIc = [], m_arrPIcT = [];
	var m_arrColX = [], m_arrRowY = [36, 84, 132];
	var m_intCash = 0, m_intTakings = 0, m_intDay = 0, m_intClock = 0, m_intRep = 0, m_blnOver = false;
	var m_intCurC = 3, m_intCurR = 1, m_intFirWas = 0, m_intFrames = 0;
	var m_intNewsUp = 0, m_intServed = 0, m_intTurnedAway = 0, m_intSpinT = 0, m_intScreen = 0;
	var m_arrTaps = [];

	// ====================================================================================================
	// THE TABLES

	function setup()
	{
		var intK;
		kind(1, 800, 8, 150, 4, 50);
		kind(2, 2400, 15, 120, 3, 60);
		kind(3, 1500, 12, 120, 3, 55);
		kind(4, 1800, 12, 140, 2, 55);
		kind(5, 3000, 18, 160, 4, 50);
		kind(6, 900, 5, 60, 1, 45);
		kind(7, 1200, 9, 160, 2, 45);
		kind(8, 500, 6, 140, 1, 40);
		for (intK = 0; intK <= 7; intK++)
		{
			m_arrColX[intK] = 8 + intK * 32;
		}
	}

	function kind(intT_a, intPr_a, intPl_a, intTm_a, intBr_a, intPo_a)
	{
		m_arrTPrice[intT_a] = intPr_a; m_arrTPlay[intT_a] = intPl_a; m_arrTTime[intT_a] = intTm_a; m_arrTBreak[intT_a] = intBr_a; m_arrTPop[intT_a] = intPo_a;
	}

	// a slot's spot: its column and row from its number
	function slotX(intM_a)
	{
		return m_arrColX[intM_a % 8];
	}

	function slotY(intM_a)
	{
		return m_arrRowY[Math.floor(intM_a / 8)];
	}

	// ====================================================================================================
	// THE PANEL AND THE LISTS

	function put(intX_a, intY_a, intT_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, 0);
	}

	function rect(intX_a, intY_a, intW_a, intH_a, intT_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, intT_a, 0);
	}

	function text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function panel()
	{
		rect(0, 0, 40, 7, G.T_BOX);
		rect(0, 27, 40, 5, G.T_BOX);
		showCash(); showClock(); showRep();
	}

	function showCash()
	{
		if (m_intCash < 0) { text(4, 4, 'CASH -$' + (-m_intCash) + '     '); } else { text(4, 4, 'CASH $' + m_intCash + '      '); }
		text(4, 5, 'TODAY $' + m_intTakings + '     ');
	}

	function showClock()
	{
		var intH = 10 + Math.floor(m_intClock / HOUR);
		var intM = Math.floor(((m_intClock % HOUR) * 6) / HOUR);
		text(22, 4, 'DAY ' + m_intDay + '  ');
		text(30, 4, rightStr('0' + intH, 2) + ':' + intM + '0');
	}

	function showRep()
	{
		var intK;
		text(22, 5, 'REP');
		for (intK = 0; intK <= 4; intK++)
		{
			put(26 + intK, 5, (m_intRep >= intK * 20 + 10) ? G.T_PSTAR : G.T_PSTAR + 1);
		}
	}

	// the line along the bottom
	function say(str_a)
	{
		rect(4, 27, 32, 1, G.T_BOX);
		text(4 + Math.floor((32 - str_a.length) / 2), 27, str_a);
	}

	// a box on the floor: x, y, w, h (cells)
	function box(intX_a, intY_a, intW_a, intH_a)
	{
		rect(intX_a + 1, intY_a + 1, intW_a - 2, intH_a - 2, G.T_BOX);
		rect(intX_a + 1, intY_a, intW_a - 2, 1, G.T_BOXT);
		rect(intX_a + 1, intY_a + intH_a - 1, intW_a - 2, 1, G.T_BOXB);
		rect(intX_a, intY_a + 1, 1, intH_a - 2, G.T_BOXL);
		rect(intX_a + intW_a - 1, intY_a + 1, 1, intH_a - 2, G.T_BOXR);
		put(intX_a, intY_a, G.T_BOXTL); put(intX_a + intW_a - 1, intY_a, G.T_BOXTR);
		put(intX_a, intY_a + intH_a - 1, G.T_BOXBL); put(intX_a + intW_a - 1, intY_a + intH_a - 1, G.T_BOXBR);
	}

	function unbox()
	{
		rect(0, 7, 40, 20, 0);
	}

	// how popular a kind is, as stars (0-5) at x, y
	function stars(intX_a, intY_a, intP_a)
	{
		var intK;
		for (intK = 0; intK <= 4; intK++)
		{
			put(intX_a + intK, intY_a, (intP_a >= intK * 20 + 10) ? G.T_STAR : G.T_STAR + 1);
		}
	}

	// ====================================================================================================
	// KEYS, TAPS

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// a key for the lists: 1 up, 2 down, 3 left, 4 right, 5 take, 6 back (0: none) - repeating slowly
	function key()
	{
		var intV = 0, intF = 0, intResult = 0;
		if (down(K_Q) || down(KEY_UP)) { intV = 1; }
		if (down(K_A) || down(KEY_DOWN)) { intV = 2; }
		if (down(K_O) || down(KEY_LEFT)) { intV = 3; }
		if (down(K_P) || down(KEY_RIGHT)) { intV = 4; }
		if (down(K_SPACE) || down(K_ENTER)) { intF = 5; }
		if (down(K_M)) { intF = 6; }
		if (intF !== 0)
		{
			if (m_intFirWas === 0)
			{
				m_intFirWas = intF;
				intResult = intF;
			}
			m_objRepeat.next(0);
		}
		else
		{
			m_intFirWas = 0;
			intResult = m_objRepeat.next(intV);
		}
		return intResult;
	}

	// this iteration's first tap in the game's own pixels ({x, y}; null: none)
	function tap()
	{
		var objResult = null;
		if ((m_arrTaps.length > 0) && (m_arrTaps[0].x >= GAMEX) && (m_arrTaps[0].x < GAMEX + 320))
		{
			objResult = { x:m_arrTaps[0].x - GAMEX, y:m_arrTaps[0].y };
		}
		return objResult;
	}

	// the tile row tapped (-1: none)
	function tapRow()
	{
		var objTap = tap();
		return (objTap !== null) ? Math.floor(objTap.y / 8) : -1;
	}

	// the floor spot tapped (-1: none)
	function tapSlot()
	{
		var objTap = tap();
		var intC, intR, intResult = -1;
		if (objTap !== null)
		{
			for (intR = 0; intR <= 2; intR++)
			{
				for (intC = 0; intC <= 7; intC++)
				{
					if ((objTap.x >= m_arrColX[intC] + 28) && (objTap.x < m_arrColX[intC] + 52) && (objTap.y >= m_arrRowY[intR] + 28) && (objTap.y < m_arrRowY[intR] + 68))
					{
						intResult = intR * 8 + intC;
					}
				}
			}
		}
		return intResult;
	}

	// ====================================================================================================
	// THE TITLE

	function title()
	{
		var intK, intY = 0;
		for (intK = 0; intK < NS; intK++)
		{
			m_arrMK[intK] = 0; m_arrMDraw[intK] = true; m_arrMBroke[intK] = 0; m_arrMNew[intK] = 0;
		}
		for (intK = 0; intK < NC; intK++)
		{
			m_arrPS[intK] = 0;
		}
		// a show floor
		m_arrMK[1] = 2; m_arrMK[2] = 5; m_arrMK[5] = 4; m_arrMK[6] = 1; m_arrMK[9] = 6; m_arrMK[14] = 8; m_arrMK[17] = 3; m_arrMK[22] = 7;
		m_objSlots.hideRange(0, 128);
		drawMachines();
		rect(0, 0, 40, 32, 0);
		m_intCash = START; m_intTakings = 0; m_intDay = 1; m_intClock = 0; m_intRep = 50;
		panel();
		rect(0, 4, 40, 3, G.T_BOX);
		text(13, 4, 'ARCADE TYCOON');
		box(6, 9, 28, 14);
		text(8, 10, 'START WITH $5000');
		text(8, 11, "MAKE $30000. DON'T GO BROKE");
		text(8, 13, 'BUY MACHINES, WATCH WHAT');
		text(8, 14, 'GETS PLAYED, BUY MORE OF');
		text(8, 15, 'THAT. SELL THE DUDS (HALF');
		text(8, 16, 'PRICE). FIX WHAT BREAKS.');
		if (m_objPad.isTouch())
		{
			text(8, 18, 'TAP A SPOT, TAP IT AGAIN');
			text(8, 19, 'TO CHOOSE. BACK: BACK');
		}
		else
		{
			text(8, 18, 'QAOP  MOVE   SPACE  CHOOSE');
			text(8, 19, 'M     BACK');
		}
		text(8, 21, '(C) 2026 CYBORG UNICORN');
		m_objSteps.until(function()
		{
			var blnDone = (key() === 5) || (tap() !== null);
			intY++;
			if (intY === 25) { say(m_objPad.isTouch() ? 'TAP TO START' : 'PRESS SPACE'); }
			if (intY === 50) { say(''); intY = 0; }
			if (blnDone) { m_arrTaps = []; }
			return blnDone;
		});
		m_objSteps.call(unbox);
	}

	// ====================================================================================================
	// A GAME

	function game()
	{
		var intK;
		for (intK = 0; intK < NS; intK++)
		{
			m_arrMK[intK] = 0; m_arrMDraw[intK] = true; m_arrMBroke[intK] = 0; m_arrMBusy[intK] = 0; m_arrMWait[intK] = 0;
			m_arrMTake[intK] = 0; m_arrMPlays[intK] = 0; m_arrMNew[intK] = 0;
		}
		for (intK = 0; intK < NC; intK++)
		{
			m_arrPS[intK] = 0;
		}
		m_objSlots.hideRange(0, 128);
		drawMachines();
		m_intCash = START; m_intDay = 1; m_intRep = 50; m_blnOver = false; m_intCurC = 3; m_intCurR = 1;
		rect(0, 0, 40, 32, 0);
		panel();
		say('YOUR ARCADE! BUY SOME MACHINES');
		nextDay();
	}

	function nextDay()
	{
		oneDay();
		m_objSteps.call(function()
		{
			if (!m_blnOver)
			{
				m_intDay++;
				nextDay();
			}
		});
	}

	// a day: 10 in the morning to 10 at night, then the bills
	function oneDay()
	{
		var intK, intF = 0;
		m_intClock = 0; m_intTakings = 0; m_intServed = 0; m_intTurnedAway = 0;
		for (intK = 0; intK < NS; intK++)
		{
			m_arrMTake[intK] = 0;
		}
		showCash(); showClock();
		if (m_intDay > 1) { morning(); }
		m_objSteps.until(function()
		{
			var intKey = key();
			var intW = tapSlot();
			if (intW >= 0)
			{
				if (intW === m_intCurR * 8 + m_intCurC)
				{
					intKey = 5;
				}
				else
				{
					m_intCurR = Math.floor(intW / 8); m_intCurC = intW % 8;
					m_objSound.play(0, 200, 0, 6, 2, 0);
				}
			}
			if (intKey === 5) { choose(); } else { moveCursor(intKey); }
			arrivals();
			people();
			drawCursor();
			drawMachines();
			m_intClock++;
			if ((m_intClock % 40) === 0) { showClock(); }
			if ((m_intFrames & 15) === 0) { showCash(); }
			if (m_intNewsUp > 0)
			{
				m_intNewsUp--;
				if (m_intNewsUp === 0) { say(m_objPad.isTouch() ? 'TAP A SPOT TWICE: BUY/SELL/FIX' : 'SPACE: BUY / SELL / FIX'); }
			}
			return (m_intClock >= HOUR * 12);
		});
		// closing time: everyone out
		m_objSteps.call(function()
		{
			var intK;
			say('CLOSING TIME!');
			m_objSlots.hideRange(SP_CUR, 2);
			for (intK = 0; intK < NC; intK++)
			{
				if ((m_arrPS[intK] !== 0) && (m_arrPS[intK] !== 4)) { leave(intK); }
			}
		});
		m_objSteps.until(function()
		{
			people();
			drawMachines();
			intF++;
			return (intF >= 150);
		});
		m_objSteps.call(function()
		{
			var intK;
			for (intK = 0; intK < NC; intK++)
			{
				m_arrPS[intK] = 0;
			}
			m_objSlots.hideRange(SP_MAN, 32);
			night();
		});
	}

	// the morning: what's hot and what's not (the news), popularity drifting back to the middle
	function morning()
	{
		var intT, intK;
		for (intT = 1; intT <= NT; intT++)
		{
			m_arrTPop[intT] += ((50 - m_arrTPop[intT]) / 5) | 0;		// (BASIC's \: towards nought)
		}
		for (intK = 0; intK < NS; intK++)
		{
			if (m_arrMNew[intK] > 0) { m_arrMNew[intK]--; m_arrMDraw[intK] = true; }
		}
		intT = 1 + rnd(NT);
		if (rnd(3) !== 0)
		{
			m_arrTPop[intT] = Math.min(100, m_arrTPop[intT] + 30 + rnd(20));
			switch (rnd(3))
			{
				case 0: say(NAMES[intT] + ' GAMES ARE HOT!'); break;
				case 1: say('EVERYONE WANTS ' + NAMES[intT] + '!'); break;
				default: say('NEWS: ' + NAMES[intT] + ' CRAZE!'); break;
			}
		}
		else
		{
			m_arrTPop[intT] = Math.max(5, m_arrTPop[intT] - 30 - rnd(15));
			if (rnd(2) !== 0) { say(NAMES[intT] + ' IS SO LAST YEAR'); } else { say('NOBODY PLAYS ' + NAMES[intT] + ' NOW'); }
		}
		m_intNewsUp = 300;
	}

	// the night: the bills, the day's figures; broke, or rich?
	function night()
	{
		var intBill, intMach = 0, intK, intF = 0;
		for (intK = 0; intK < NS; intK++)
		{
			if (m_arrMK[intK] !== 0) { intMach++; }
		}
		intBill = RENT + POWER * intMach;
		m_intCash -= intBill;
		showCash();
		box(6, 8, 28, 16);
		text(8, 9, 'DAY ' + m_intDay + ' IS DONE');
		text(8, 11, 'TAKINGS        $' + m_intTakings);
		text(8, 12, 'RENT AND POWER $' + intBill);
		if (m_intTakings - intBill >= 0) { text(8, 13, 'PROFIT         $' + (m_intTakings - intBill)); } else { text(8, 13, 'LOSS           $' + (intBill - m_intTakings)); }
		text(8, 15, 'PEOPLE PLAYED  ' + m_intServed);
		text(8, 16, 'WALKED OUT     ' + m_intTurnedAway);
		if (m_intCash < 0)
		{
			text(8, 18, "YOU'RE BROKE!");
			text(8, 19, 'THE BANK TAKES THE LOT.');
			m_blnOver = true;
			m_objSound.play(2, 400, 10, 15, 60, 0);
		}
		else if (m_intCash >= GOAL)
		{
			text(8, 18, "YOU'RE RICH!");
			text(8, 19, '$' + m_intCash + ' IN ' + m_intDay + ' DAYS');
			m_blnOver = true;
			m_objSound.play(0, 80, -1, 15, 60, 0);
		}
		else
		{
			text(8, 18, 'CASH NOW $' + m_intCash);
			m_objSound.play(1, 120, -4, 12, 20, 0);
		}
		text(8, 22, m_objPad.isTouch() ? 'TAP TO GO ON' : 'PRESS SPACE');
		m_objSteps.until(function()
		{
			var blnDone;
			intF++;
			blnDone = ((key() === 5) || (tap() !== null)) && (intF > 30);
			if (blnDone) { m_arrTaps = []; }
			return blnDone;
		});
		m_objSteps.call(unbox);
	}

	// ====================================================================================================
	// THE FLOOR

	function moveCursor(intF_a)
	{
		if ((intF_a === 1) && (m_intCurR > 0)) { m_intCurR--; }
		if ((intF_a === 2) && (m_intCurR < 2)) { m_intCurR++; }
		if ((intF_a === 3) && (m_intCurC > 0)) { m_intCurC--; }
		if ((intF_a === 4) && (m_intCurC < 7)) { m_intCurC++; }
		if ((intF_a > 0) && (intF_a < 5)) { m_objSound.play(0, 200, 0, 6, 2, 0); }
	}

	function drawCursor()
	{
		var intX = m_arrColX[m_intCurC] + 32, intY = m_arrRowY[m_intCurR] + 32;
		m_objSlots.put(SP_CUR, intX, intY, 'cursor', 1, ((m_intFrames & 16) !== 0) ? row0() : 'arcade_s7');
	}

	// the sprite image for palette row 0 now (its screens' colours turned round)
	function row0()
	{
		return 'arcade_s0' + SCREENS[m_intScreen];
	}

	// the machines that changed: their sprites, broken signs, NEW
	function drawMachines()
	{
		var intM, intX, intY, strImage;
		for (intM = 0; intM < NS; intM++)
		{
			if (m_arrMDraw[intM])
			{
				m_arrMDraw[intM] = false;
				intX = slotX(intM) + 32; intY = slotY(intM) + 32;
				if (m_arrMK[intM] === 0)
				{
					m_objSlots.hide(SP_CAB + intM * 2); m_objSlots.hide(SP_SIGN + intM);
				}
				else
				{
					strImage = (m_arrMBroke[intM] !== 0) ? 'arcade_s7' : row0();
					m_objSlots.put(SP_CAB + intM * 2, intX, intY, 'cab', m_arrMK[intM], strImage);
					if (m_arrMBroke[intM] !== 0) { m_objSlots.put(SP_SIGN + intM, intX, intY + 6, 'broken', 1, row0()); }
					else if (m_arrMNew[intM] > 0) { m_objSlots.put(SP_SIGN + intM, intX, intY - 10, 'new', 1, row0()); }
					else { m_objSlots.hide(SP_SIGN + intM); }
				}
			}
		}
	}

	// the screens flicker: sprite colours 12-14 turned round (every machine drawn again)
	function screens()
	{
		var intK;
		m_intSpinT++;
		if (m_intSpinT >= 6)
		{
			m_intSpinT = 0;
			m_intScreen = Math.floor(m_intFrames / 6) % 3;
			for (intK = 0; intK < NS; intK++)
			{
				m_arrMDraw[intK] = true;
			}
			drawMachines();
		}
	}

	// Space on the floor: buy, or a machine's card
	function choose()
	{
		var intM = m_intCurR * 8 + m_intCurC;
		m_arrTaps = [];
		if (m_arrMK[intM] === 0) { buyMenu(intM); } else { machineMenu(intM); }
		m_objSteps.call(unbox);
	}

	// a list's pointer: '>' on line sel of n lines from y (every step lines apart)
	function pointers(intX_a, intY_a, intStep_a, intN_a, intSel_a)
	{
		var intT;
		for (intT = 1; intT <= intN_a; intT++)
		{
			text(intX_a, intY_a + intT * intStep_a, (intT === intSel_a) ? '>' : ' ');
		}
	}

	// the list of machines to buy for slot m
	function buyMenu(intM_a)
	{
		var intSel = 1, intT;
		box(3, 7, 34, 20);
		text(5, 8, 'BUY A MACHINE    PRICE  PLAY');
		for (intT = 1; intT <= NT; intT++)
		{
			text(7, 9 + intT * 2, NAMES[intT]);
			text(21, 9 + intT * 2, '$' + m_arrTPrice[intT]);
			text(28, 9 + intT * 2, '$' + m_arrTPlay[intT]);
			stars(7, 10 + intT * 2, m_arrTPop[intT]);
		}
		text(5, 9, 'HOW POPULAR:');
		pointers(5, 9, 2, NT, intSel);
		m_objSteps.until(function()
		{
			var intF = key();
			var intRow = tapRow();
			var blnDone = false;
			var intWas = intSel;
			if ((intRow >= 11) && (intRow <= 26))
			{
				intT = Math.floor((intRow - 11) / 2) + 1;
				if (intT === intSel) { intF = 5; } else { intSel = intT; }
			}
			else if (intRow >= 0)
			{
				intF = 6;
			}
			if (intF === 1) { intSel--; }
			if (intSel < 1) { intSel = NT; }
			if (intF === 2) { intSel++; }
			if (intSel > NT) { intSel = 1; }
			if (intSel !== intWas) { pointers(5, 9, 2, NT, intSel); }
			if (intF === 5)
			{
				if (m_intCash >= m_arrTPrice[intSel])
				{
					buy(intM_a, intSel);
					blnDone = true;
				}
				else
				{
					say('NOT ENOUGH CASH!');
					m_objSound.play(2, 500, 0, 12, 10, 0);
				}
			}
			return blnDone || (intF === 6);
		});
	}

	function buy(intM_a, intT_a)
	{
		m_intCash -= m_arrTPrice[intT_a];
		m_arrMK[intM_a] = intT_a; m_arrMBroke[intM_a] = 0; m_arrMBusy[intM_a] = 0; m_arrMWait[intM_a] = 0; m_arrMTake[intM_a] = 0;
		m_arrMPlays[intM_a] = 0; m_arrMNew[intM_a] = 3; m_arrMDraw[intM_a] = true;
		showCash();
		say('A NEW ' + NAMES[intT_a] + '!');
		m_objSound.play(0, 100, -3, 14, 16, 0);
	}

	// a machine's card: how it's doing; fix it, buy another, sell it
	function machineMenu(intM_a)
	{
		var intT = m_arrMK[intM_a];
		var intSel = (m_arrMBroke[intM_a] !== 0) ? 1 : 2;
		box(6, 8, 28, 16);
		text(8, 9, NAMES[intT]);
		stars(26, 9, m_arrTPop[intT]);
		text(8, 11, 'TODAY  $' + m_arrMTake[intM_a]);
		text(8, 12, 'PLAYS  ' + m_arrMPlays[intM_a] + ' IN ALL');
		text(8, 13, (m_arrMBroke[intM_a] !== 0) ? 'OUT OF ORDER!' : 'WORKING');
		text(10, 16, 'FIX IT        $' + Math.floor(m_arrTPrice[intT] / 10));
		text(10, 17, 'BUY ANOTHER   $' + m_arrTPrice[intT]);
		text(10, 18, 'SELL IT FOR   $' + Math.floor(m_arrTPrice[intT] / 2));
		text(10, 19, 'BACK');
		pointers(8, 15, 1, 4, intSel);
		m_objSteps.until(function()
		{
			var intF = key();
			var intRow = tapRow();
			var blnDone = false;
			var intWas = intSel;
			var intE;
			if ((intRow >= 16) && (intRow <= 19))
			{
				if (intRow - 15 === intSel) { intF = 5; } else { intSel = intRow - 15; }
			}
			else if (intRow >= 0)
			{
				intF = 6;
			}
			if (intF === 1) { intSel--; }
			if (intSel < 1) { intSel = 4; }
			if (intF === 2) { intSel++; }
			if (intSel > 4) { intSel = 1; }
			if (intSel !== intWas) { pointers(8, 15, 1, 4, intSel); }
			if (intF === 5)
			{
				if (intSel === 1)
				{
					if (m_arrMBroke[intM_a] === 0)
					{
						say("IT'S NOT BROKEN");
					}
					else if (m_intCash < Math.floor(m_arrTPrice[intT] / 10))
					{
						say('NOT ENOUGH CASH!');
					}
					else
					{
						m_intCash -= Math.floor(m_arrTPrice[intT] / 10); m_arrMBroke[intM_a] = 0; m_arrMDraw[intM_a] = true; showCash();
						say('FIXED!'); m_objSound.play(0, 60, -1, 13, 12, 0);
						blnDone = true;
					}
				}
				else if (intSel === 2)
				{
					intE = freeSlot(intM_a);
					if (intE < 0) { say('NO ROOM ON THE FLOOR'); }
					else if (m_intCash < m_arrTPrice[intT]) { say('NOT ENOUGH CASH!'); }
					else { buy(intE, intT); blnDone = true; }
				}
				else if (intSel === 3)
				{
					sell(intM_a);
					blnDone = true;
				}
				else
				{
					blnDone = true;
				}
			}
			return blnDone || (intF === 6);
		});
	}

	// the empty slot nearest m (-1: none)
	function freeSlot(intM_a)
	{
		var intD, intBest = 999, intE, intResult = -1;
		for (intE = 0; intE < NS; intE++)
		{
			if (m_arrMK[intE] === 0)
			{
				intD = Math.abs((intE % 8) - (intM_a % 8)) + Math.abs(Math.floor(intE / 8) - Math.floor(intM_a / 8)) * 2;
				if (intD < intBest) { intBest = intD; intResult = intE; }
			}
		}
		return intResult;
	}

	function sell(intM_a)
	{
		var intK;
		m_intCash += Math.floor(m_arrTPrice[m_arrMK[intM_a]] / 2);
		say('SOLD THE ' + NAMES[m_arrMK[intM_a]]);
		// anyone on it or waiting for it gives up
		for (intK = 0; intK < NC; intK++)
		{
			if ((m_arrPS[intK] > 0) && (m_arrPM[intK] === intM_a) && (m_arrPS[intK] !== 4)) { m_arrPMood[intK] = 2; leave(intK); }
		}
		m_arrMK[intM_a] = 0; m_arrMBroke[intM_a] = 0; m_arrMBusy[intM_a] = 0; m_arrMWait[intM_a] = 0; m_arrMDraw[intM_a] = true;
		showCash();
		m_objSound.play(1, 300, -10, 12, 12, 0);
	}

	// ====================================================================================================
	// THE PEOPLE

	// people coming in: more with a good name and in the evening
	function arrivals()
	{
		var intH = Math.floor(m_intClock / HOUR), intGap, intN = 0, intK, blnDone = false;
		// (more machines, more come in)
		for (intK = 0; intK < NS; intK++)
		{
			if (m_arrMK[intK] !== 0) { intN++; }
		}
		intGap = Math.max(14, 75 - Math.floor(m_intRep / 3) - intN * 2);
		if ((intH >= 6) && (intH < 11)) { intGap -= 25; }
		if (intH < 2) { intGap += 20; }
		if (rnd(intGap) === 0)
		{
			for (intK = 0; (intK < NC) && !blnDone; intK++)
			{
				if (m_arrPS[intK] === 0)
				{
					m_arrPX[intK] = WALKX; m_arrPY[intK] = DOORY; m_arrPPal[intK] = 1 + rnd(6); m_arrPMood[intK] = 0; m_arrPIcT[intK] = 0;
					pick(intK);
					blnDone = true;
				}
			}
		}
	}

	// person p picks a machine: a kind by how popular it is (of the kinds on the floor), then a free
	// one of that kind, or one to wait for; none: off they go, cross
	function pick(intP_a)
	{
		var intTot = 0, intR, intT = 0, intM, intGot = -1, intW = -1;
		for (intM = 0; intM < NS; intM++)
		{
			if ((m_arrMK[intM] !== 0) && (m_arrMBroke[intM] === 0)) { intTot += pull(intM); }
		}
		if (intTot > 0)
		{
			intR = rnd(intTot);
			for (intM = 0; intM < NS; intM++)
			{
				if ((m_arrMK[intM] !== 0) && (m_arrMBroke[intM] === 0) && (intT === 0))
				{
					intR -= pull(intM);
					if (intR < 0) { intT = m_arrMK[intM]; }
				}
			}
			// of that kind: a free one, or else one with nobody waiting
			for (intM = 0; intM < NS; intM++)
			{
				if ((m_arrMK[intM] === intT) && (m_arrMBroke[intM] === 0))
				{
					if ((m_arrMBusy[intM] === 0) && (m_arrMWait[intM] === 0)) { intGot = intM; }
					if ((m_arrMWait[intM] === 0) && (m_arrMBusy[intM] !== 0)) { intW = intM; }
				}
			}
			if (intGot < 0) { intGot = intW; }
			// that kind's all taken: any free machine will do
			if (intGot < 0)
			{
				for (intM = 0; intM < NS; intM++)
				{
					if ((m_arrMK[intM] !== 0) && (m_arrMBroke[intM] === 0) && (m_arrMBusy[intM] === 0) && (m_arrMWait[intM] === 0)) { intGot = intM; }
				}
			}
		}
		if (intGot < 0)
		{
			m_arrPMood[intP_a] = 2; m_arrPS[intP_a] = 1; leave(intP_a); m_intTurnedAway++;
		}
		else
		{
			m_arrPM[intP_a] = intGot;
			if (m_arrMBusy[intGot] === 0) { m_arrMBusy[intGot] = 100 + intP_a; } else { m_arrMWait[intGot] = 1 + intP_a; }
			m_arrPS[intP_a] = 1;
			m_arrPTX[intP_a] = slotX(intGot) + 8; m_arrPTY[intP_a] = slotY(intGot) + 40;
			m_arrPCr[intP_a] = 1 + rnd(4);
		}
	}

	// how much machine m draws people: its kind's popularity, more when new, less when its kind is
	// everywhere already
	function pull(intM_a)
	{
		var intSame = 0, intE;
		for (intE = 0; intE < NS; intE++)
		{
			if (m_arrMK[intE] === m_arrMK[intM_a]) { intSame++; }
		}
		return Math.floor(((m_arrTPop[m_arrMK[intM_a]] + m_arrMNew[intM_a] * 15) * 3) / (intSame + 2));
	}

	// off to the door
	function leave(intP_a)
	{
		var intM = m_arrPM[intP_a];
		if ((m_arrPS[intP_a] === 3) || (m_arrPS[intP_a] === 1))
		{
			if (m_arrMBusy[intM] === 100 + intP_a) { m_arrMBusy[intM] = 0; }
		}
		if ((m_arrPS[intP_a] === 2) || (m_arrPS[intP_a] === 1))
		{
			if (m_arrMWait[intM] === 1 + intP_a) { m_arrMWait[intM] = 0; }
		}
		m_arrPS[intP_a] = 4; m_arrPTX[intP_a] = WALKX; m_arrPTY[intP_a] = DOORY + 6;
		if (m_arrPMood[intP_a] === 2)
		{
			m_arrPIc[intP_a] = 3; m_arrPIcT[intP_a] = 60;
			if ((m_intRep > 0) && (rnd(2) === 0)) { m_intRep--; }
			showRep();
		}
		else if (m_arrPMood[intP_a] === 1)
		{
			m_arrPIc[intP_a] = 2; m_arrPIcT[intP_a] = 50;
			if (m_intRep < 100) { m_intRep++; }
			showRep();
		}
	}

	function people()
	{
		var intP;
		for (intP = 0; intP < NC; intP++)
		{
			if (m_arrPS[intP] !== 0) { pStep(intP); }
			if (m_arrPS[intP] !== 0) { pDraw(intP); }
		}
		// the people's own animations a step on (only while the arcade's open, as everything else)
		m_objSlots.step();
	}

	// person p: a frame of walking, waiting or playing
	function pStep(intP_a)
	{
		var intM = m_arrPM[intP_a];
		var blnGo = true;
		switch (m_arrPS[intP_a])
		{
			case 1:
			case 4:
				// walking: across to the middle, up or down it, across to the spot
				if ((m_arrPY[intP_a] !== m_arrPTY[intP_a]) && (m_arrPX[intP_a] !== WALKX))
				{
					m_arrPX[intP_a] += (m_arrPX[intP_a] < WALKX) ? 1 : -1;
				}
				else if (m_arrPY[intP_a] !== m_arrPTY[intP_a])
				{
					m_arrPY[intP_a] += (m_arrPY[intP_a] < m_arrPTY[intP_a]) ? 1 : -1;
				}
				else if (m_arrPX[intP_a] !== m_arrPTX[intP_a])
				{
					m_arrPX[intP_a] += (m_arrPX[intP_a] < m_arrPTX[intP_a]) ? 1 : -1;
				}
				else if (m_arrPS[intP_a] === 4)
				{
					// there: out of the door
					m_arrPS[intP_a] = 0; m_objSlots.hide(SP_MAN + intP_a); m_objSlots.hide(SP_ICON + intP_a);
				}
				else
				{
					// there: at the machine
					m_arrPS[intP_a] = (m_arrMBusy[intM] === 100 + intP_a) ? 3 : 2;
					m_arrPT[intP_a] = 0;
				}
				break;
			case 2:
				// waiting for the machine; it comes free, or they give up
				m_arrPT[intP_a]++;
				if ((m_arrMK[intM] === 0) || (m_arrMBroke[intM] !== 0))
				{
					m_arrPMood[intP_a] = 2; leave(intP_a);
				}
				else if (m_arrMBusy[intM] === 0)
				{
					m_arrMBusy[intM] = 100 + intP_a; m_arrMWait[intM] = 0; m_arrPS[intP_a] = 3; m_arrPT[intP_a] = 0;
				}
				else if (m_arrPT[intP_a] > 400)
				{
					m_arrPMood[intP_a] = 2; leave(intP_a); m_intTurnedAway++;
				}
				break;
			case 3:
				// playing: a coin in at the start of each go
				if (m_arrPT[intP_a] === 0)
				{
					if ((m_arrMBroke[intM] !== 0) || (m_arrMK[intM] === 0))
					{
						m_arrPMood[intP_a] = 2; leave(intP_a);
						blnGo = false;
					}
					else
					{
						m_intCash += m_arrTPlay[m_arrMK[intM]]; m_intTakings += m_arrTPlay[m_arrMK[intM]];
						m_arrMTake[intM] += m_arrTPlay[m_arrMK[intM]]; m_arrMPlays[intM]++;
						m_arrPIc[intP_a] = 1; m_arrPIcT[intP_a] = 30;
						// the coin floats up off them on its own, and goes
						m_objSlots.put(SP_ICON + intP_a, m_arrPX[intP_a] - 8 + 32, m_arrPY[intP_a] - 16 + 32 - 14, 'coin', 1, row0());
						m_objSlots.setMover(SP_ICON + intP_a, coinMover, 0, -1 / 3);
						m_objSound.play(1, 30, 1, 9, 4, 0);
						// sometimes it breaks
						if (rnd(1000) < m_arrTBreak[m_arrMK[intM]])
						{
							m_arrMBroke[intM] = 1; m_arrMDraw[intM] = true;
							say('THE ' + NAMES[m_arrMK[intM]] + ' HAS BROKEN!');
							m_objSound.play(2, 60, 8, 14, 20, 1);
							m_arrPMood[intP_a] = 2; leave(intP_a);
							blnGo = false;
						}
					}
				}
				if (blnGo)
				{
					m_arrPT[intP_a]++;
					if (m_arrPT[intP_a] >= m_arrTTime[m_arrMK[intM]])
					{
						m_arrPT[intP_a] = 0; m_arrPCr[intP_a]--;
						if (m_arrPCr[intP_a] <= 0)
						{
							m_intServed++;
							m_arrMBusy[intM] = 0;
							// another machine, or home happy
							if ((rnd(3) === 0) && (m_intClock < HOUR * 11))
							{
								m_arrPIc[intP_a] = 2; m_arrPIcT[intP_a] = 30;
								pick(intP_a);
							}
							else
							{
								m_arrPMood[intP_a] = 1; m_arrPS[intP_a] = 3; leave(intP_a);
							}
						}
					}
				}
				break;
			default:
				break;
		}
	}

	// person p's sprite, and what's over them
	// a coin's way: up a pixel every three steps, gone after 30
	function coinMover(intN_a, objO_a)
	{
		objO_a.y += objO_a.vy;
		return (objO_a.t >= 29);
	}

	function pDraw(intP_a)
	{
		// what they're doing picks a loop of the person's sequence: walking down the walkway (1),
		// up it (4), across (7), waiting (10), playing (12)
		var intLoop, intFl = 0;
		var intX = m_arrPX[intP_a] - 8 + 32, intY = m_arrPY[intP_a] - 16 + 32;
		switch (m_arrPS[intP_a])
		{
			case 1:
			case 4:
				if ((m_arrPY[intP_a] !== m_arrPTY[intP_a]) && (m_arrPX[intP_a] === WALKX))
				{
					intLoop = (m_arrPY[intP_a] < m_arrPTY[intP_a]) ? 1 : 4;
				}
				else
				{
					intLoop = 7;
					if ((m_arrPTX[intP_a] < m_arrPX[intP_a]) || ((m_arrPX[intP_a] > WALKX) && (m_arrPY[intP_a] !== m_arrPTY[intP_a]))) { intFl = SPRITE_MIRRORX; }
				}
				break;
			case 2:
				intLoop = 10;
				break;
			default:
				intLoop = 12;
				break;
		}
		m_objSlots.put(SP_MAN + intP_a, intX, intY, 'person', undefined, 'arcade_s' + m_arrPPal[intP_a], 1, intFl);
		m_objSlots.animate(SP_MAN + intP_a, intLoop);
		if (m_arrPIcT[intP_a] > 0)
		{
			m_arrPIcT[intP_a]--;
			if (m_arrPIc[intP_a] !== 1)
			{
				m_objSlots.setMover(SP_ICON + intP_a, null);
				m_objSlots.put(SP_ICON + intP_a, intX, intY - 16, 'face', m_arrPIc[intP_a] - 1, row0());
			}
		}
		else
		{
			m_objSlots.hide(SP_ICON + intP_a);
		}
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		m_arrTaps = m_objPad.taps();
		if (m_blnLoaded)
		{
			m_objSteps.update();
			screens();
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
			// the floor (Layer 2), the sprites, the panel and the lists on top
			objContext_a.drawImage(m_objSprites.getImageByName('arcade_floor'), 32, 32);
			m_objSlots.paint(objContext_a);
			m_objGrid.paint(objContext_a, 0, 0);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are and what it does on its own (sequence, delay)
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a)
	{
		var intH = objCell_a.h * 16;
		return { name:strName_a, classes:'arcade', imagename:'arcade_s0', x:0, y:0, w:16, h:intH, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:intH,
			sequence:(arrSequence_a === undefined) ? [1, 0] : arrSequence_a, delay:(intDelay_a === undefined) ? 1 : intDelay_a };
	}

	this.run = function()
	{
		setup();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addImagesToLibrary([ { name:'arcade_floor', classes:'arcade', source:'images/arcade/floor.png' } ]);
		m_objSprites.addSpritesToLibrary([ sprite('cab', G.S_CAB), sprite('person', G.S_PERSON, [1, 2, -1, 3, 4, -4, 5, 6, -7, 3, 0, 7, 0], 6), sprite('cursor', G.S_CURSOR), sprite('coin', G.S_COIN),
			sprite('face', G.S_FACE), sprite('broken', G.S_BROKEN), sprite('new', G.S_NEW) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['arcade_t0'], first:0, firstcode:0, transparent:0 });
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:140, size:20, key:K_SPACE, label:'OK' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:200, size:20, key:K_M, label:'BACK' }
		], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:K_SPACE, fire2:K_M } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('arcade'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			// the BASIC's main loop: the title, a game, again
			m_objSteps.until(function()
			{
				title();
				m_objSteps.call(game);
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new arcadeGame();
g_objGame.run();
