// BURGER SHOP - four burger shops side by side, one cook each, a race to take the most money in
// one shift. Ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// People walk along the footpath; some come in, queue at the counter and order: a burger, a
// cheeseburger, the big one (with lettuce), a salad, chips or a drink. Each of the four shops gets
// the same customers, so it's fair. Make it before their patience runs out:
//   take a plate, put it on the plate bench (the ring), add what the dish needs:
//     buns and cheese straight from their crates,
//     patties cooked on the grill (don't leave them: they burn),
//     lettuce chopped on the board (keep pressing),
//   then carry the plate to the SERVE hatch. Chips: a potato in the fryer. Drinks: the machine.
//   Anything spoilt goes in the bin. The benches hold anything while your hands are full.
// 1 to 4 cooks play; the computer runs the other shops.
//
// Players: 1 Q A O P + Space (touch: the pad and COOK), 2 the arrows + Enter (or game pad 1),
// 3 5 6 7 8 + 0, 4 I J K L + M (or game pad 2). One button does it all: take, put down, chop, serve.
//
// The shops are one picture drawn four times (the Next's Layer 2); the cooks, the food, the
// customers are numbered sprites (24 a shop); the money, the clock and the messages are the tile
// screen, on top.
function burgerGame()
{
	var m_objThis = this;
	var G = GFX_BURGER;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:96, y:32, w:256, h:192 };
	var NS = 4, NQ = 4, SHIFTLEN = 7500;		// four shops, four customers each, 150 seconds
	var COOK = 220, BURN = 420, FRY = 260, FILL = 120, CHOPS = 5;
	// items: 1 bun, 2 raw patty, 3 patty, 4 burnt patty, 5 cheese, 6 lettuce, 7 chopped lettuce,
	// 8 potato, 9 chips, 10 burnt chips, 11 drink, 12 a plate (its mask: bun 1, patty 2, cheese 4,
	// lettuce 8)
	var PLATE = 12;
	// stations: 0 bench, 1 plate bench, 2 serve, 3 bench, 4 bench, 5 bin, 6 grill, 7 chopping board,
	// 8 fryer, 9 drinks, 10-15 crates: plates, buns, patties, cheese, lettuces, potatoes
	var ST_ASM = 1, ST_SERVE = 2, ST_BIN = 5, ST_GRILL = 6, ST_CHOP = 7, ST_FRY = 8, ST_DRINK = 9;
	// the keys: each player's left, right, up, down, button
	var KEYS = [ [79, 80, 81, 65, 32], [KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, 13], [53, 56, 55, 54, 48], [74, 76, 73, 75, 77] ];
	var K_SPACE = 32;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 96);
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the stations: where (cell), where you stand and which way you face to use it; and per shop:
	// the item on it, its plate mask, its timer
	var m_arrStCol = [], m_arrStRow = [], m_arrSdC = [], m_arrSdR = [], m_arrSdF = [];
	var m_arrSIt = [], m_arrSMk = [], m_arrST = [];
	// the cooks
	var m_arrCX = [], m_arrCY = [], m_arrFace = [], m_arrHold = [], m_arrHoldM = [];
	var m_arrMoving = [false, false, false, false], m_arrActWas = [], m_arrHuman = [], m_arrMoney = [], m_arrMoneyWas = [];
	var m_arrAiT = [], m_arrAiW = [], m_arrMarkT = [], m_arrMarkP = [], m_arrMarkX = [], m_arrMarkY = [];
	// the customers: state (0 none, 1 coming in, 2 waiting, 3 going happy, 4 going angry),
	// position, order, patience, colours
	var m_arrQSt = [], m_arrQX = [], m_arrQY = [], m_arrQO = [], m_arrQP = [], m_arrQPal = [];
	// passers-by on the footpath
	var m_arrWX = [], m_arrWDir = [], m_arrWPal = [];
	// the menu: price, plate mask (0: not on a plate)
	var PRICE = [0, 5, 6, 9, 4, 3, 2];
	var OMASK = [0, 3, 7, 15, 8, 0, 0];
	var m_intPlayers = 0, m_blnDemo = false, m_intClock = 0, m_intNextCust = 0, m_intFrames = 0;

	var m_strState = 'loading', m_intWait = 0;

	// ====================================================================================================
	// TABLES

	function setup()
	{
		var intK;
		station(0, 1, 2, 1, 3, 0);
		station(1, 2, 2, 2, 3, 0);
		station(2, 3, 2, 3, 3, 0);
		station(3, 4, 2, 4, 3, 0);
		station(4, 5, 2, 5, 3, 0);
		station(5, 6, 2, 6, 3, 0);
		station(6, 0, 3, 1, 3, 2);
		station(7, 0, 4, 1, 4, 2);
		station(8, 7, 3, 6, 3, 3);
		station(9, 7, 4, 6, 4, 3);
		for (intK = 10; intK <= 15; intK++)
		{
			station(intK, intK - 9, 5, intK - 9, 4, 1);
		}
	}

	function station(intID_a, intC_a, intR_a, intSC_a, intSR_a, intF_a)
	{
		m_arrStCol[intID_a] = intC_a; m_arrStRow[intID_a] = intR_a; m_arrSdC[intID_a] = intSC_a; m_arrSdR[intID_a] = intSR_a; m_arrSdF[intID_a] = intF_a;
	}

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

	// a dark box for text: cells x0 - x1, y0 - y1
	function box(intX0_a, intY0_a, intX1_a, intY1_a)
	{
		m_objGrid.rect(intX0_a, intY0_a, intX1_a - intX0_a + 1, intY1_a - intY0_a + 1, 32, 0);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objSlots.hideRange(0, 96);
		m_objGrid.clear(0, 0);
		box(6, 6, 33, 25);
		text(15, 7, 'BURGER SHOP');
		text(8, 9, 'FOUR SHOPS, ONE SHIFT.');
		text(8, 10, 'THE MOST MONEY WINS.');
		text(8, 12, m_objPad.isTouch() ? 'HOW MANY COOKS? TAP 1' : 'HOW MANY COOKS? 1 2 3 4');
		text(8, 14, '1  Q A O P + SPACE');
		text(8, 15, '2  ARROWS + ENTER, PAD 1');
		text(8, 16, '3  5 6 7 8 + 0');
		text(8, 17, '4  I J K L + M, PAD 2');
		text(7, 19, 'THE COMPUTER COOKS THE REST');
		text(8, 21, 'PLATE ON THE PLATE BENCH,');
		text(8, 22, 'ADD THE FOOD, TAKE IT TO');
		text(8, 23, 'THE HATCH. ONE BUTTON DOES');
		text(8, 24, 'THE LOT.');
		m_intPlayers = 0; m_blnDemo = false; m_intWait = 0;
		m_strState = 'title';
	}

	function titleStep()
	{
		var intK, intX, intY;
		var arrTaps = m_objPad.taps();
		m_intWait++;
		for (intK = 1; intK <= 4; intK++)
		{
			if (down(48 + intK)) { m_intPlayers = intK; }
		}
		// a tap on a number (1 on a phone: the only cook with a pad)
		if (arrTaps.length > 0)
		{
			intX = Math.floor((arrTaps[0].x - GAMEX) / 8);
			intY = Math.floor(arrTaps[0].y / 8);
			if ((intY >= 11) && (intY <= 13) && (intX >= 23) && (intX <= 31)) { m_intPlayers = Math.max(1, Math.min(4, Math.floor((intX - 23) / 2) + 1)); }
			else if (m_objPad.isTouch()) { m_intPlayers = 1; }
		}
		if (m_intWait > 500)
		{
			// nobody: the computer cooks all four, a demo
			m_blnDemo = true;
		}
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
		var intS, intK;
		for (intS = 0; intS < NS; intS++)
		{
			m_arrCX[intS] = 48; m_arrCY[intS] = 56; m_arrFace[intS] = 1; m_arrHold[intS] = 0; m_arrHoldM[intS] = 0; m_arrMoney[intS] = 0; m_arrMoneyWas[intS] = -1;
			m_arrHuman[intS] = (intS < m_intPlayers); m_arrActWas[intS] = true; m_arrAiT[intS] = -1; m_arrAiW[intS] = 30; m_arrMarkT[intS] = 0;
			m_arrWX[intS] = rnd(128); m_arrWDir[intS] = 1 - 2 * rnd(2); m_arrWPal[intS] = 5 + rnd(4);
			for (intK = 0; intK <= 15; intK++)
			{
				m_arrSIt[intS * 16 + intK] = 0; m_arrSMk[intS * 16 + intK] = 0; m_arrST[intS * 16 + intK] = 0;
			}
			for (intK = 0; intK < NQ; intK++)
			{
				m_arrQSt[intS * 4 + intK] = 0;
			}
		}
		m_intClock = SHIFTLEN; m_intNextCust = 60; m_intFrames = 0;
		for (intS = 0; intS < NS; intS++)
		{
			showLabel(intS);
		}
		m_strState = 'shift';
	}

	function shiftStep()
	{
		var intS;
		for (intS = 0; intS < NS; intS++)
		{
			if (m_arrHuman[intS]) { player(intS); } else { robot(intS); }
			stations(intS);
			customers(intS);
			drawShop(intS);
			if (m_arrMoney[intS] !== m_arrMoneyWas[intS]) { showLabel(intS); }
		}
		arrivals();
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

	// shop s's name and money, top left of its footpath
	function showLabel(intN_a)
	{
		var intX = 4 + (intN_a & 1) * 16, intY = 4 + Math.floor(intN_a / 2) * 12;
		var str = m_arrHuman[intN_a] ? 'P' + (intN_a + 1) : 'CPU';
		text(intX, intY, str + ' $' + m_arrMoney[intN_a] + ' ');
		m_arrMoneyWas[intN_a] = m_arrMoney[intN_a];
	}

	function showClock()
	{
		var intSec = Math.floor(m_intClock / 50);
		text(18, 15, Math.floor(intSec / 60) + ':' + rightStr('0' + (intSec % 60), 2));
	}

	// ====================================================================================================
	// THE COOKS

	function player(intN_a)
	{
		var arrK = KEYS[intN_a];
		var intMX = 0, intMY = 0;
		var blnAct = down(arrK[4]);
		if (down(arrK[0])) { intMX = -1; }
		if (down(arrK[1])) { intMX = 1; }
		if (down(arrK[2])) { intMY = -1; }
		if (down(arrK[3])) { intMY = 1; }
		walk(intN_a, intMX, intMY);
		if (blnAct && !m_arrActWas[intN_a]) { doAct(intN_a, facing(intN_a)); }
		m_arrActWas[intN_a] = blnAct;
	}

	// move cook n (the kitchen floor: cells 1-6 across, 3-4 down), facing the way it went
	function walk(intN_a, intMX_a, intMY_a)
	{
		if (intMX_a < 0) { m_arrFace[intN_a] = 2; }
		if (intMX_a > 0) { m_arrFace[intN_a] = 3; }
		if (intMY_a < 0) { m_arrFace[intN_a] = 0; }
		if (intMY_a > 0) { m_arrFace[intN_a] = 1; }
		m_arrCX[intN_a] = Math.max(16, Math.min(96, m_arrCX[intN_a] + intMX_a * 2));
		m_arrCY[intN_a] = Math.max(48, Math.min(64, m_arrCY[intN_a] + intMY_a * 2));
		m_arrMoving[intN_a] = (intMX_a !== 0) || (intMY_a !== 0);
	}

	// the station cook n is facing (-1: none)
	function facing(intN_a)
	{
		var intC = Math.floor((m_arrCX[intN_a] + 8) / 16), intR = Math.floor((m_arrCY[intN_a] + 8) / 16);
		var intResult = -1;
		if (m_arrFace[intN_a] === 0) { intR--; }
		if (m_arrFace[intN_a] === 1) { intR++; }
		if (m_arrFace[intN_a] === 2) { intC--; }
		if (m_arrFace[intN_a] === 3) { intC++; }
		if ((intR >= 2) && (intR <= 5) && (intC >= 0) && (intC <= 7)) { intResult = stationAt(intC, intR); }
		return intResult;
	}

	function stationAt(intC_a, intR_a)
	{
		var intID, intResult = -1;
		for (intID = 15; intID >= 0; intID--)
		{
			if ((m_arrStCol[intID] === intC_a) && (m_arrStRow[intID] === intR_a)) { intResult = intID; }
		}
		return intResult;
	}

	// the one button: take, put down, add to a plate, chop, pour, serve, bin - whatever the station
	// and what's in your hands make sense of
	function doAct(intN_a, intID_a)
	{
		var intI, intH, intSI, intB;
		if (intID_a >= 0)
		{
			intI = intN_a * 16 + intID_a; intH = m_arrHold[intN_a]; intSI = m_arrSIt[intI];
			if (intID_a >= 10)
			{
				// a crate: take one, or (holding a plate) put a bun or cheese straight on it
				if (intH === 0)
				{
					m_arrHold[intN_a] = [PLATE, 1, 2, 5, 6, 8][intID_a - 10];
					m_arrHoldM[intN_a] = 0;
					blip();
				}
				else if ((intH === PLATE) && ((intID_a === 11) || (intID_a === 13)))
				{
					intB = (intID_a === 11) ? 1 : 4;
					if ((m_arrHoldM[intN_a] & intB) === 0) { m_arrHoldM[intN_a] |= intB; blip(); }
				}
			}
			else if (intID_a === ST_BIN)
			{
				if (intH !== 0) { m_arrHold[intN_a] = 0; m_arrHoldM[intN_a] = 0; m_objSound.play(1, 31, -1, 10, 8, 1); }
			}
			else if (intID_a === ST_SERVE)
			{
				if (((intH === PLATE) && (m_arrHoldM[intN_a] > 0)) || (intH === 9) || (intH === 11)) { serve(intN_a); }
			}
			else if (intID_a === ST_GRILL)
			{
				if ((intH === 2) && (intSI === 0))
				{
					m_arrSIt[intI] = 2; m_arrST[intI] = 0; m_arrHold[intN_a] = 0; m_objSound.play(2, 20, 0, 9, 20, 1);
				}
				else if ((intH === 0) && (intSI > 0))
				{
					m_arrHold[intN_a] = intSI; m_arrSIt[intI] = 0; blip();
				}
				else if ((intH === PLATE) && (intSI === 3) && ((m_arrHoldM[intN_a] & 2) === 0))
				{
					m_arrHoldM[intN_a] |= 2; m_arrSIt[intI] = 0; blip();
				}
			}
			else if (intID_a === ST_CHOP)
			{
				if ((intH === 6) && (intSI === 0))
				{
					m_arrSIt[intI] = 6; m_arrST[intI] = 0; m_arrHold[intN_a] = 0; blip();
				}
				else if ((intH === 0) && (intSI === 6))
				{
					m_arrST[intI]++; m_objSound.play(1, 15, 2, 12, 3, 1);
					if (m_arrST[intI] >= CHOPS) { m_arrSIt[intI] = 7; }
				}
				else if ((intH === 0) && (intSI === 7))
				{
					m_arrHold[intN_a] = 7; m_arrSIt[intI] = 0; blip();
				}
				else if ((intH === PLATE) && (intSI === 7) && ((m_arrHoldM[intN_a] & 8) === 0))
				{
					m_arrHoldM[intN_a] |= 8; m_arrSIt[intI] = 0; blip();
				}
			}
			else if (intID_a === ST_FRY)
			{
				if ((intH === 8) && (intSI === 0))
				{
					m_arrSIt[intI] = 8; m_arrST[intI] = 0; m_arrHold[intN_a] = 0; m_objSound.play(2, 25, 0, 9, 20, 1);
				}
				else if ((intH === 0) && ((intSI === 9) || (intSI === 10)))
				{
					m_arrHold[intN_a] = intSI; m_arrSIt[intI] = 0; blip();
				}
			}
			else if (intID_a === ST_DRINK)
			{
				if ((intH === 0) && (intSI === 0))
				{
					m_arrSIt[intI] = 11; m_arrST[intI] = 0; m_objSound.play(2, 60, -1, 8, 30, 1);
				}
				else if ((intH === 0) && (intSI === 11) && (m_arrST[intI] >= FILL))
				{
					m_arrHold[intN_a] = 11; m_arrSIt[intI] = 0; blip();
				}
			}
			else
			{
				// a bench: put down, pick up, or put food on a plate (either way round)
				if ((intH !== 0) && (intSI === 0))
				{
					m_arrSIt[intI] = intH; m_arrSMk[intI] = m_arrHoldM[intN_a]; m_arrHold[intN_a] = 0; m_arrHoldM[intN_a] = 0; blip();
				}
				else if ((intH === 0) && (intSI !== 0))
				{
					m_arrHold[intN_a] = intSI; m_arrHoldM[intN_a] = m_arrSMk[intI]; m_arrSIt[intI] = 0; m_arrSMk[intI] = 0; blip();
				}
				else if ((intH === PLATE) && (plateBit(intSI) > 0))
				{
					if ((m_arrHoldM[intN_a] & plateBit(intSI)) === 0) { m_arrHoldM[intN_a] |= plateBit(intSI); m_arrSIt[intI] = 0; blip(); }
				}
				else if ((intSI === PLATE) && (plateBit(intH) > 0))
				{
					if ((m_arrSMk[intI] & plateBit(intH)) === 0) { m_arrSMk[intI] |= plateBit(intH); m_arrHold[intN_a] = 0; blip(); }
				}
			}
		}
	}

	// what an item adds to a plate (0: it doesn't go on one)
	function plateBit(intIt_a)
	{
		var intResult = 0;
		if (intIt_a === 1) { intResult = 1; }
		if (intIt_a === 3) { intResult = 2; }
		if (intIt_a === 5) { intResult = 4; }
		if (intIt_a === 7) { intResult = 8; }
		return intResult;
	}

	function blip()
	{
		m_objSound.play(0, 90, -6, 9, 4, 0);
	}

	// the dish in cook n's hands, to the first waiting customer who ordered it
	function serve(intN_a)
	{
		var intQ, intO, intBest = -1, intH = m_arrHold[intN_a];
		for (intQ = intN_a * 4; intQ <= intN_a * 4 + 3; intQ++)
		{
			if (m_arrQSt[intQ] === 2)
			{
				intO = m_arrQO[intQ];
				if (((intH === PLATE) && (OMASK[intO] === m_arrHoldM[intN_a])) || ((intH === 9) && (intO === 5)) || ((intH === 11) && (intO === 6)))
				{
					if ((intBest < 0) || (m_arrQP[intQ] < m_arrQP[intBest])) { intBest = intQ; }
				}
			}
		}
		m_arrMarkX[intN_a] = m_arrStCol[ST_SERVE] * 16; m_arrMarkY[intN_a] = m_arrStRow[ST_SERVE] * 16; m_arrMarkT[intN_a] = 30;
		if (intBest < 0)
		{
			m_arrMarkP[intN_a] = 2;
			m_objSound.play(1, 400, 0, 12, 10, 0);
		}
		else
		{
			m_arrMoney[intN_a] += PRICE[m_arrQO[intBest]];
			if (m_arrQP[intBest] > 700) { m_arrMoney[intN_a] += 2; }		// quick: a tip
			m_arrQSt[intBest] = 3;
			m_arrHold[intN_a] = 0; m_arrHoldM[intN_a] = 0;
			m_arrMarkP[intN_a] = 1;
			m_objSound.play(0, 60, -2, 15, 20, 0);
		}
	}

	// ====================================================================================================
	// THE COMPUTER'S COOKS

	function robot(intN_a)
	{
		var intT, intPX, intPY, intMX = 0, intMY = 0;
		if (m_arrAiW[intN_a] > 0)
		{
			m_arrAiW[intN_a]--;
		}
		else
		{
			if (m_arrAiT[intN_a] < 0)
			{
				m_arrAiT[intN_a] = decide(intN_a);
				if (m_arrAiT[intN_a] < 0) { m_arrAiW[intN_a] = 12; }
			}
			intT = m_arrAiT[intN_a];
			if (intT >= 0)
			{
				intPX = m_arrSdC[intT] * 16; intPY = m_arrSdR[intT] * 16;
				if (m_arrCX[intN_a] < intPX) { intMX = 1; }
				else if (m_arrCX[intN_a] > intPX) { intMX = -1; }
				else if (m_arrCY[intN_a] < intPY) { intMY = 1; }
				else if (m_arrCY[intN_a] > intPY) { intMY = -1; }
				if ((intMX !== 0) || (intMY !== 0))
				{
					walk(intN_a, intMX, intMY);
				}
				else
				{
					m_arrFace[intN_a] = m_arrSdF[intT];
					doAct(intN_a, intT);
					m_arrAiT[intN_a] = -1; m_arrAiW[intN_a] = 5 + intN_a * 3 + rnd(6);		// each computer cook a bit slower than the last
				}
			}
		}
	}

	// the computer cook's next station: what the most impatient customer wants, and what's in hand
	function decide(intN_a)
	{
		var intQ, intO = 0, intM, intH, intB, intNeed, intBest = -1;
		var intAsmI, intAsmM, intGr, intCh, intFr, intDr;
		var intResult = -1, blnSet = false;

		function pick(intID_a)
		{
			if (!blnSet) { intResult = intID_a; blnSet = true; }
		}

		for (intQ = intN_a * 4; intQ <= intN_a * 4 + 3; intQ++)
		{
			if (m_arrQSt[intQ] === 2)
			{
				if ((intBest < 0) || (m_arrQP[intQ] < m_arrQP[intBest])) { intBest = intQ; }
			}
		}
		if (intBest >= 0) { intO = m_arrQO[intBest]; }
		intM = OMASK[intO];
		intB = intN_a * 16;
		intAsmI = m_arrSIt[intB + ST_ASM]; intAsmM = m_arrSMk[intB + ST_ASM];
		intGr = m_arrSIt[intB + ST_GRILL]; intCh = m_arrSIt[intB + ST_CHOP]; intFr = m_arrSIt[intB + ST_FRY]; intDr = m_arrSIt[intB + ST_DRINK];
		intH = m_arrHold[intN_a];
		// something in hand
		if ((intH === 4) || (intH === 10)) { pick(ST_BIN); }
		if (intH === 2) { pick((intGr === 0) ? ST_GRILL : ST_BIN); }
		if (intH === 6) { pick((intCh === 0) ? ST_CHOP : ST_BIN); }
		if (intH === 8) { pick((intFr === 0) ? ST_FRY : ST_BIN); }
		if ((intH === 1) || (intH === 3) || (intH === 5) || (intH === 7))
		{
			pick(((intAsmI === PLATE) && ((intAsmM & plateBit(intH)) === 0)) ? ST_ASM : ST_BIN);
		}
		if (intH === PLATE)
		{
			if ((intM > 0) && (m_arrHoldM[intN_a] === intM)) { pick(ST_SERVE); }
			else if ((intAsmI === 0) && ((m_arrHoldM[intN_a] & ~intM) === 0)) { pick(ST_ASM); }
			else { pick(ST_BIN); }
		}
		if ((intH === 9) || (intH === 11))
		{
			pick((((intH === 9) && (intO === 5)) || ((intH === 11) && (intO === 6))) ? ST_SERVE : ST_BIN);
		}
		// empty hands: burnt food off first
		if (intGr === 4) { pick(ST_GRILL); }
		if (intFr === 10) { pick(ST_FRY); }
		if (intO === 0) { blnSet = true; }
		if (intM > 0)
		{
			if (intAsmI === 0) { pick(10); }											// a plate first
			if ((intAsmI === PLATE) && ((intAsmM & ~intM) !== 0)) { pick(ST_ASM); }	// the wrong dish: off
			if ((intAsmI === PLATE) && (intAsmM === intM)) { pick(ST_ASM); }			// done: pick it up
			intNeed = intM & ~intAsmM;
			if ((intNeed & 2) !== 0)
			{
				if (intGr === 3) { pick(ST_GRILL); }
				if (intGr === 0) { pick(12); }
			}
			if ((intNeed & 8) !== 0)
			{
				if ((intCh === 7) || (intCh === 6)) { pick(ST_CHOP); }
				if (intCh === 0) { pick(14); }
			}
			if ((intNeed & 1) !== 0) { pick(11); }
			if ((intNeed & 4) !== 0) { pick(13); }
		}
		else if (intO === 5)
		{
			if (intFr === 9) { pick(ST_FRY); }
			if (intFr === 0) { pick(15); }
		}
		else
		{
			if (intDr === 0) { pick(ST_DRINK); }
			if ((intDr === 11) && (m_arrST[intB + ST_DRINK] >= FILL)) { pick(ST_DRINK); }
		}
		return intResult;
	}

	// ====================================================================================================
	// COOKING

	function stations(intN_a)
	{
		var intI = intN_a * 16 + ST_GRILL;
		var intV = m_arrSIt[intI];
		if ((intV === 2) || (intV === 3))
		{
			m_arrST[intI]++;
			if ((intV === 2) && (m_arrST[intI] >= COOK)) { m_arrSIt[intI] = 3; m_objSound.play(0, 40, 0, 10, 6, 0); }
			if ((intV === 3) && (m_arrST[intI] >= BURN)) { m_arrSIt[intI] = 4; m_objSound.play(1, 31, 0, 12, 20, 1); }
		}
		intI = intN_a * 16 + ST_FRY;
		intV = m_arrSIt[intI];
		if ((intV === 8) || (intV === 9))
		{
			m_arrST[intI]++;
			if ((intV === 8) && (m_arrST[intI] >= FRY)) { m_arrSIt[intI] = 9; m_objSound.play(0, 40, 0, 10, 6, 0); }
			if ((intV === 9) && (m_arrST[intI] >= FRY + BURN - COOK)) { m_arrSIt[intI] = 10; m_objSound.play(1, 31, 0, 12, 20, 1); }
		}
		intI = intN_a * 16 + ST_DRINK;
		if ((m_arrSIt[intI] === 11) && (m_arrST[intI] < FILL)) { m_arrST[intI]++; }
	}

	// ====================================================================================================
	// CUSTOMERS

	// every so often a customer comes to every shop, the same order for all (if there's room)
	function arrivals()
	{
		var intO, intR, intN, intQ, intPal, blnDone;
		m_intNextCust--;
		if (m_intNextCust <= 0)
		{
			m_intNextCust = 110 + Math.floor(m_intClock / 50) + rnd(90);
			intR = rnd(100);
			if (m_intClock > SHIFTLEN / 2)
			{
				if (intR < 30) { intO = 1; } else if (intR < 50) { intO = 2; } else if (intR < 70) { intO = 5; } else if (intR < 85) { intO = 6; } else { intO = 4; }
			}
			else
			{
				if (intR < 20) { intO = 1; } else if (intR < 40) { intO = 2; } else if (intR < 60) { intO = 3; } else if (intR < 75) { intO = 4; } else if (intR < 88) { intO = 5; } else { intO = 6; }
			}
			intPal = 5 + rnd(4);
			for (intN = 0; intN < NS; intN++)
			{
				blnDone = false;
				for (intQ = intN * 4; (intQ <= intN * 4 + 3) && !blnDone; intQ++)
				{
					if (m_arrQSt[intQ] === 0)
					{
						m_arrQSt[intQ] = 1; m_arrQX[intQ] = 112; m_arrQY[intQ] = 0; m_arrQO[intQ] = intO; m_arrQPal[intQ] = intPal;
						m_arrQP[intQ] = (intO === 3) ? 1600 : 1200;
						blnDone = true;
					}
				}
			}
		}
	}

	// shop n's customers: in through the door to their place at the counter, wait, go
	function customers(intN_a)
	{
		var intQ, intSlot, intTX;
		for (intQ = intN_a * 4; intQ <= intN_a * 4 + 3; intQ++)
		{
			intSlot = intQ - intN_a * 4;
			if (m_arrQSt[intQ] === 1)
			{
				intTX = 48 + intSlot * 16;
				if (m_arrQY[intQ] < 16) { m_arrQY[intQ]++; }
				else if (m_arrQX[intQ] > intTX) { m_arrQX[intQ]--; }
				else { m_arrQSt[intQ] = 2; }
			}
			else if (m_arrQSt[intQ] === 2)
			{
				m_arrQP[intQ]--;
				if (m_arrQP[intQ] <= 0)
				{
					m_arrQSt[intQ] = 4; m_arrMoney[intN_a] -= 2;
					m_objSound.play(2, 300, 8, 10, 20, 0);
				}
			}
			else if (m_arrQSt[intQ] >= 3)
			{
				if (m_arrQX[intQ] < 112) { m_arrQX[intQ]++; }
				else if (m_arrQY[intQ] > 0) { m_arrQY[intQ]--; }
				else { m_arrQSt[intQ] = 0; }
			}
		}
		// the passer-by
		m_arrWX[intN_a] += m_arrWDir[intN_a];
		if ((m_arrWX[intN_a] < -16) || (m_arrWX[intN_a] > 128))
		{
			m_arrWDir[intN_a] = 1 - 2 * rnd(2); m_arrWPal[intN_a] = 5 + rnd(4);
			m_arrWX[intN_a] = (m_arrWDir[intN_a] > 0) ? -16 : 128;
		}
	}

	// ====================================================================================================
	// DRAWING

	// sprite n: a library sprite at x, y in colours row; frame 0 leaves its frame to its animation
	function spr(intSlot_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intFlags_a)
	{
		m_objSlots.put(intSlot_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, 'burger_s' + intRow_a, 1, intFlags_a);
	}

	// a person standing (the start of their sequence) or walking (its walking loop)
	function person(intSlot_a, intX_a, intY_a, blnWalking_a, intRow_a, intFlags_a)
	{
		spr(intSlot_a, intX_a, intY_a, 'person', 0, intRow_a, intFlags_a);
		m_objSlots.animate(intSlot_a, blnWalking_a ? 3 : 1);
	}

	// an item's sprite (a plate shows what's on it): [name, frame]
	function itemPat(intIt_a, intM_a)
	{
		return (intIt_a === PLATE) ? ['plate', intM_a + 1] : ['item', intIt_a];
	}

	function orderPat(intO_a)
	{
		var arrResult = ['item', 11];
		if (intO_a <= 4) { arrResult = ['plate', OMASK[intO_a] + 1]; }
		else if (intO_a === 5) { arrResult = ['item', 9]; }
		return arrResult;
	}

	// shop n: 24 sprites from n * 24: the cook, what they hold, 8 stations' food, 4 cooking clocks,
	// 4 customers, their 4 orders, a passer-by, a mark at the hatch
	function drawShop(intN_a)
	{
		var intB = intN_a * 24, intOX = (intN_a & 1) * 128 + 32, intOY = Math.floor(intN_a / 2) * 96 + 32;
		var intFrame, intFl = 0, intQ, intID, intI, intJ, intRow, arrPat;
		var intLoop;
		// the cook: walking the way they face (the chef's sequence has a loop for each), still when stopped
		if (m_arrFace[intN_a] === 1) { intLoop = 1; }
		else if (m_arrFace[intN_a] === 0) { intLoop = 4; }
		else
		{
			intLoop = 7;
			if (m_arrFace[intN_a] === 2) { intFl = SPRITE_MIRRORX; }
		}
		spr(intB, intOX + m_arrCX[intN_a], intOY + m_arrCY[intN_a], 'chef', 0, 1 + intN_a, intFl);
		if (m_arrMoving[intN_a]) { m_objSlots.animate(intB, intLoop); } else { m_objSlots.unanimate(intB); }
		if (m_arrHold[intN_a] !== 0)
		{
			arrPat = itemPat(m_arrHold[intN_a], m_arrHoldM[intN_a]);
			spr(intB + 1, intOX + m_arrCX[intN_a], intOY + m_arrCY[intN_a] - 9, arrPat[0], arrPat[1], 0, 0);
		}
		else
		{
			m_objSlots.hide(intB + 1);
		}
		// the food on the stations
		intJ = 0;
		for (intID = 0; intID <= 9; intID++)
		{
			if ((intID !== ST_SERVE) && (intID !== ST_BIN))
			{
				intI = intN_a * 16 + intID;
				if (m_arrSIt[intI] !== 0)
				{
					arrPat = itemPat(m_arrSIt[intI], m_arrSMk[intI]);
					spr(intB + 2 + intJ, intOX + m_arrStCol[intID] * 16, intOY + m_arrStRow[intID] * 16, arrPat[0], arrPat[1], 0, 0);
				}
				else
				{
					m_objSlots.hide(intB + 2 + intJ);
				}
				intJ++;
			}
		}
		// the cooking clocks
		drawClock(intB + 10, intOX, intOY, intN_a * 16 + ST_GRILL, m_arrSIt[intN_a * 16 + ST_GRILL] === 2, COOK);
		drawClock(intB + 11, intOX, intOY, intN_a * 16 + ST_CHOP, m_arrSIt[intN_a * 16 + ST_CHOP] === 6, CHOPS);
		drawClock(intB + 12, intOX, intOY, intN_a * 16 + ST_FRY, m_arrSIt[intN_a * 16 + ST_FRY] === 8, FRY);
		drawClock(intB + 13, intOX, intOY, intN_a * 16 + ST_DRINK, (m_arrSIt[intN_a * 16 + ST_DRINK] === 11) && (m_arrST[intN_a * 16 + ST_DRINK] < FILL), FILL);
		// the customers and their orders
		for (intQ = 0; intQ <= 3; intQ++)
		{
			intI = intN_a * 4 + intQ;
			if (m_arrQSt[intI] === 0)
			{
				m_objSlots.hide(intB + 14 + intQ); m_objSlots.hide(intB + 18 + intQ);
			}
			else
			{
				intRow = (m_arrQSt[intI] === 4) ? 9 : m_arrQPal[intI];
				intFl = ((m_arrQSt[intI] === 1) && (m_arrQY[intI] >= 16)) ? SPRITE_MIRRORX : 0;
				person(intB + 14 + intQ, intOX + m_arrQX[intI], intOY + m_arrQY[intI], m_arrQSt[intI] !== 2, intRow, intFl);
				if ((m_arrQSt[intI] === 2) && ((m_arrQP[intI] > 400) || ((m_intFrames & 8) !== 0)))
				{
					arrPat = orderPat(m_arrQO[intI]);
					spr(intB + 18 + intQ, intOX + m_arrQX[intI], intOY + m_arrQY[intI] - 14, arrPat[0], arrPat[1], 0, 0);
				}
				else if (m_arrQSt[intI] === 4)
				{
					spr(intB + 18 + intQ, intOX + m_arrQX[intI], intOY + m_arrQY[intI] - 14, 'mark', 2, 0, 0);
				}
				else
				{
					m_objSlots.hide(intB + 18 + intQ);
				}
			}
		}
		// the passer-by
		if ((m_arrWX[intN_a] >= 0) && (m_arrWX[intN_a] <= 112))
		{
			person(intB + 22, intOX + m_arrWX[intN_a], intOY - 3, true, m_arrWPal[intN_a], (m_arrWDir[intN_a] > 0) ? 0 : SPRITE_MIRRORX);
		}
		else
		{
			m_objSlots.hide(intB + 22);
		}
		// served! / wrong
		if (m_arrMarkT[intN_a] > 0)
		{
			m_arrMarkT[intN_a]--;
			spr(intB + 23, intOX + m_arrMarkX[intN_a], intOY + m_arrMarkY[intN_a], 'mark', m_arrMarkP[intN_a], 0, 0);
		}
		else
		{
			m_objSlots.hide(intB + 23);
		}
	}

	function drawClock(intSlot_a, intOX_a, intOY_a, intI_a, blnGoing_a, intTotal_a)
	{
		var intID = intI_a & 15;
		if (blnGoing_a)
		{
			spr(intSlot_a, intOX_a + m_arrStCol[intID] * 16, intOY_a + m_arrStRow[intID] * 16, 'clock', 1 + Math.floor(m_arrST[intI_a] * 4 / (intTotal_a + 1)), 0, 0);
		}
		else
		{
			m_objSlots.hide(intSlot_a);
		}
	}

	// ====================================================================================================
	// THE END OF THE SHIFT

	function results()
	{
		var intR, intN, intBest, str;
		var arrDone = [false, false, false, false];
		m_objSlots.hideRange(0, 96);
		box(9, 9, 30, 20);
		text(11, 10, 'TIME! SHUT UP SHOP.');
		for (intR = 0; intR <= 3; intR++)
		{
			intBest = -1;
			for (intN = 0; intN <= 3; intN++)
			{
				if (!arrDone[intN])
				{
					if ((intBest < 0) || (m_arrMoney[intN] > m_arrMoney[intBest])) { intBest = intN; }
				}
			}
			arrDone[intBest] = true;
			str = m_arrHuman[intBest] ? 'P' + (intBest + 1) : 'CPU ' + (intBest + 1);
			text(11, 12 + intR * 2, (intR + 1) + '.  ' + str + '   $' + m_arrMoney[intBest] + '    ');
		}
		m_objSound.play(0, 100, -3, 15, 50, 0);
		m_intWait = 0;
		m_strState = 'results';
	}

	function resultsStep()
	{
		m_intWait++;
		if ((m_intWait >= 400) || ((m_intWait > 60) && (down(K_SPACE) || down(48) || down(13) || (m_objPad.taps().length > 0))))
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
		var objShop;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		if (m_blnLoaded)
		{
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			// the shops (Layer 2), the sprites, the text on top
			objShop = m_objSprites.getImageByName('burger_shop');
			objContext_a.drawImage(objShop, 32, 32);
			objContext_a.drawImage(objShop, 160, 32);
			objContext_a.drawImage(objShop, 32, 128);
			objContext_a.drawImage(objShop, 160, 128);
			m_objSlots.paint(objContext_a);
			m_objGrid.paint(objContext_a, 0, 0);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are and what it does on its own (sequence, delay)
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a)
	{
		return { name:strName_a, classes:'burger', imagename:'burger_s0', x:0, y:0, w:16, h:16, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:16,
			sequence:(arrSequence_a === undefined) ? [1, 0] : arrSequence_a, delay:(intDelay_a === undefined) ? 1 : intDelay_a };
	}

	this.run = function()
	{
		setup();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addImagesToLibrary([ { name:'burger_shop', classes:'burger', source:'images/burger/shop.png' } ]);
		m_objSprites.addSpritesToLibrary([
			sprite('chef', G.S_CHEF, [1, 2, -1, 3, 4, -4, 5, 6, -7], 6),		// walking: towards you (step 1), away (4), sideways (7)
			sprite('person', G.S_PERSON, [1, 0, 2, 3, -3], 8),			// standing (step 1), walking (3) sprite('item', G.S_ITEM), sprite('plate', G.S_PLATE),
			sprite('mark', G.S_MARK), sprite('clock', G.S_CLOCK) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['burger_t0'], first:0, firstcode:0, transparent:0 });
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:170, size:30, keys:{ left:79, right:80, up:81, down:65 } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:170, size:22, key:K_SPACE, label:'COOK' }
		], gamepads:[
			{ index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:13 } },
			{ index:1, keys:{ left:74, right:76, up:73, down:75, fire:77 } }
		] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('burger'), function()
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

var g_objGame = new burgerGame();
g_objGame.run();
