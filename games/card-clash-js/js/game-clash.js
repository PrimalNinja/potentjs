// CARD CLASH - witches, zombies and cyborgs: a card battle. Ported from the ZX Spectrum Next
// version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Pick a side - the WITCHES (hexes), the ZOMBIES (they keep coming back) or the CYBORGS (shields
// and lasers) - and duel the other two, then the champion. Win and you win a card for your deck.
//
// A duel: each of you has 20 life and a deck. Each turn you draw a card and get energy (one more
// each turn, up to 8). Play characters onto your three spots and spells for their effects; each
// costs energy. A character can attack from the turn after it's played: the other side may block
// with one of theirs (the stronger wins; equal: both go) or take the hit on their life. Life to
// nothing and you've lost.
//
// Keys: Q A O P or the arrows move the pointer over the cards. Space (or Enter): play the card from
// your hand / attack with the card on your spot / pick the target. M: end your turn (or don't block).
// Touch or mouse: tap a card to point at it, tap it again to use it; END for M.
//
// The cards are the tile screen (each cell in its own colours: JTileGrid variants); the pictures
// are numbered sprites (JSpriteSlots). The BASIC's waits and key loops are JSteps.
function clashGame()
{
	var m_objThis = this;
	var G = GFX_CLASH;

	var GAMEX = 64, XRES = 448, YRES = 256;

	// the part of the screen the game uses: the canvas is this and nothing more (the touch
	// controls are drawn over it, at its sides)
	var VIEW = { x:96, y:32, w:256, h:192 };
	var HAND = 5, FLD = 3, MAXDECK = 30, LIFE0 = 20;
	// abilities
	var AB_BREW = 1, AB_SWIFT = 2, AB_HEX = 3, AB_HEXALL = 4, AB_HEX2 = 5, AB_RISE = 6, AB_BITE = 7;
	var AB_HORDE = 8, AB_KING = 9, AB_SHIELD = 10, AB_LASER = 11, AB_LASER2 = 12;
	// spells
	var SP_FIRE = 19, SP_CURSE = 20, SP_RAISE = 21, SP_PLAGUE = 22, SP_BOOST = 23, SP_EMP = 24;
	// sprite slots: the cards' pictures: my hand 0-19, my spots 20-31, theirs 32-43 (4 apart, as the
	// Next's four 16 x 16 sprites a picture); the pointer 44, a flash 45
	var SL_HAND = 0, SL_MINE = 20, SL_THEIRS = 32, SL_POINT = 44, SL_BANG = 45;
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_M = 77, K_SPACE = 32, K_ENTER = 13;

	var SHORT = ['', 'HEDGE', 'NOVICE', 'BROOM', ' CAT', 'COVEN', ' ARCH', 'SHAMBL', 'CRAWL', 'GHOUL', 'HORDE', 'BRUTE', ' KING',
		'DRONE', 'TROOP', 'HACKER', ' MECH', 'SNIPER', 'OMEGA', ' FIRE', 'CURSE', 'RAISE', 'PLAGUE', 'BOOST', ' EMP'];
	var LONG = ['', 'HEDGE WITCH', 'NOVICE', 'BROOMRIDER', 'FAMILIAR', 'ELDER WITCH', 'ARCH WITCH', 'SHAMBLER', 'CRAWLER', 'GHOUL',
		'THE HORDE', 'BRUTE', 'ZOMBIE KING', 'DRONE', 'TROOPER', 'HACKER', 'BATTLE MECH', 'SNIPER', 'OMEGA', 'FIREBALL', 'CURSE',
		'RAISE DEAD', 'PLAGUE', 'OVERCLOCK', 'EMP'];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 50);
	var m_objSteps = new JSteps();
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	var m_arrCost = [], m_arrPow = [], m_arrFac = [], m_arrAb = [];
	// per side (0 you, 1 them): the deck (30 each), the hand (5 each), the spots (3 each)
	var m_arrDeck = [], m_arrDeckN = [0, 0], m_arrHnd = [];
	var m_arrFC = [], m_arrFPow = [], m_arrFReady = [], m_arrFShield = [], m_arrFRose = [];
	var m_arrLife = [0, 0], m_arrEn = [0, 0], m_arrTurnN = [0, 0], m_arrSide = [1, 1];
	// your own deck between duels
	var m_arrMyDeck = [], m_intMyN = 0;
	var m_intDuel = 0, m_intWinner = -1, m_intCur = 0, m_intFrames = 0;
	var m_objRepeat = new JRepeat(14, 6), m_intFirWas = 0, m_intPointX = -1, m_intPointY = -1;
	var m_arrTaps = [];

	// ====================================================================================================
	// THE CARDS

	function setup()
	{
		// cost, power, side, ability
		card(1, 1, 2, 1, 0); card(2, 1, 1, 1, AB_BREW); card(3, 2, 3, 1, AB_SWIFT);
		card(4, 2, 2, 1, AB_HEX); card(5, 4, 5, 1, AB_HEXALL); card(6, 6, 7, 1, AB_HEX2);
		card(7, 1, 2, 2, 0); card(8, 1, 1, 2, AB_RISE); card(9, 2, 3, 2, AB_BITE);
		card(10, 3, 2, 2, AB_HORDE); card(11, 4, 6, 2, 0); card(12, 6, 6, 2, AB_KING);
		card(13, 1, 1, 3, AB_SHIELD); card(14, 2, 3, 3, 0); card(15, 2, 2, 3, AB_LASER);
		card(16, 4, 5, 3, AB_SHIELD); card(17, 3, 3, 3, AB_LASER2); card(18, 7, 8, 3, AB_SHIELD);
		card(SP_FIRE, 2, 0, 1, 0); card(SP_CURSE, 3, 0, 1, 0); card(SP_RAISE, 2, 0, 2, 0);
		card(SP_PLAGUE, 4, 0, 2, 0); card(SP_BOOST, 1, 0, 3, 0); card(SP_EMP, 5, 0, 3, 0);
		m_arrCost[0] = 0; m_arrPow[0] = 0; m_arrFac[0] = 0; m_arrAb[0] = 0;
	}

	function card(intC_a, intCost_a, intPow_a, intFac_a, intAb_a)
	{
		m_arrCost[intC_a] = intCost_a; m_arrPow[intC_a] = intPow_a; m_arrFac[intC_a] = intFac_a; m_arrAb[intC_a] = intAb_a;
	}

	function isSpell(intC_a)
	{
		return (intC_a >= SP_FIRE);
	}

	// what a card does (two lines of 10)
	function says(intC_a, intLn_a)
	{
		var arrLines = ['', ''];
		if (intC_a >= SP_FIRE)
		{
			switch (intC_a)
			{
				case SP_FIRE: arrLines = ['DESTROY A', 'FOE OF 3-']; break;
				case SP_CURSE: arrLines = ['A FOE', 'LOSES 3']; break;
				case SP_RAISE: arrLines = ['A SHAMBLER', 'FOR YOU']; break;
				case SP_PLAGUE: arrLines = ['ALL NON-', 'ZOMBIES -2']; break;
				case SP_BOOST: arrLines = ['YOURS +3', '']; break;
				default: arrLines = ['DESTROY', 'ALL OF 2-']; break;
			}
		}
		else
		{
			switch (m_arrAb[intC_a])
			{
				case AB_BREW: arrLines = ['BREW: YOU', 'GET 2 LIFE']; break;
				case AB_SWIFT: arrLines = ['SWIFT: CAN', 'ATTACK NOW']; break;
				case AB_HEX: arrLines = ['HEX: THEIR', 'BEST -1']; break;
				case AB_HEXALL: arrLines = ['HEX: ALL', 'THEIRS -1']; break;
				case AB_HEX2: arrLines = ['HEX: THEIR', 'BEST -2']; break;
				case AB_RISE: arrLines = ['RISES: BACK', 'TO HAND']; break;
				case AB_BITE: arrLines = ['BITE: +1', 'EACH KILL']; break;
				case AB_HORDE: arrLines = ['HORDE: +1', 'PER ZOMBIE']; break;
				case AB_KING: arrLines = ['HORDE AND', 'RISES']; break;
				case AB_SHIELD: arrLines = ['SHIELD:', 'LIVES ONCE']; break;
				case AB_LASER: arrLines = ['LASER: 1', 'TO THEM']; break;
				case AB_LASER2: arrLines = ['LASER: 2', 'TO THEM']; break;
				default: break;
			}
		}
		return arrLines[intLn_a];
	}

	function sideName(intS_a)
	{
		var strResult = 'CYBORGS';
		if (intS_a === 1) { strResult = 'WITCHES'; }
		if (intS_a === 2) { strResult = 'ZOMBIES'; }
		return strResult;
	}

	function num(int_a)
	{
		return String(int_a);
	}

	// ====================================================================================================
	// DRAWING (the tile screen's colour variants: 0 the table, 1-3 the sides' cards, 4 spells,
	// 5 backs, 6 chosen, 7 the panel)

	function put(intX_a, intY_a, intT_a, intP_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, intP_a);
	}

	function rect(intX_a, intY_a, intW_a, intH_a, intT_a, intP_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, intT_a, intP_a);
	}

	function text(intX_a, intY_a, str_a, intP_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intP_a);
	}

	// the table
	function table()
	{
		var intX, intY;
		m_objSlots.hideRange(0, 50);
		for (intY = 0; intY <= 31; intY++)
		{
			for (intX = 0; intX <= 39; intX++)
			{
				if (((intX * 7 + intY * 3) % 11) === 0) { put(intX, intY, G.T_FELT2, 0); } else { put(intX, intY, G.T_FELT, 0); }
			}
		}
	}

	// a card at paper cell cx, cy (6 x 7 cells); its picture in sprite slot sl; hi: chosen;
	// dk: spent (dark picture); c < 0: face down; c 0: an empty spot
	function drawCard(intCX_a, intCY_a, intC_a, intPw_a, intSl_a, blnHi_a, blnDk_a)
	{
		var intX = intCX_a + 4, intY = intCY_a + 4, intP, intF, str;
		if (intC_a === 0)
		{
			rect(intX, intY, 6, 7, G.T_FELT, 0);
			if (blnHi_a)
			{
				put(intX, intY, G.T_TL, 6); put(intX + 5, intY, G.T_TR, 6);
				put(intX, intY + 6, G.T_BL, 6); put(intX + 5, intY + 6, G.T_BR, 6);
			}
			m_objSlots.hide(intSl_a);
		}
		else
		{
			if (intC_a < 0) { intP = 5; } else if (isSpell(intC_a)) { intP = 4; } else { intP = m_arrFac[intC_a]; }
			intF = blnHi_a ? 6 : intP;
			put(intX, intY, G.T_TL, intF); rect(intX + 1, intY, 4, 1, G.T_TOP, intF); put(intX + 5, intY, G.T_TR, intF);
			rect(intX, intY + 1, 1, 5, G.T_LEFT, intF); rect(intX + 5, intY + 1, 1, 5, G.T_RIGHT, intF);
			rect(intX + 1, intY + 1, 4, 4, G.T_FELT, intP);
			put(intX, intY + 6, G.T_BL, intF); rect(intX + 1, intY + 6, 4, 1, G.T_BOT, intF); put(intX + 5, intY + 6, G.T_BR, intF);
			if (intC_a < 0)
			{
				rect(intX + 1, intY + 1, 4, 5, G.T_WEAVE, intP);
				m_objSlots.hide(intSl_a);
			}
			else
			{
				rect(intX, intY + 5, 6, 1, G.T_FELT, intP);
				text(intX, intY + 5, SHORT[intC_a], intP);
				text(intX + 1, intY, num(m_arrCost[intC_a]), intP);
				if (!isSpell(intC_a))
				{
					str = num(intPw_a);
					text(intX + 5 - str.length, intY + 6, str, intP);
				}
				pic(intSl_a, intX * 8 + 8, intY * 8 + 8, intC_a, blnDk_a);
			}
		}
	}

	// card c's picture (32 x 32) at x, y
	function pic(intSl_a, intX_a, intY_a, intC_a, blnDk_a)
	{
		m_objSlots.put(intSl_a, intX_a, intY_a, 'port' + (1 + Math.floor((intC_a - 1) / 8)), ((intC_a - 1) % 8) + 1, blnDk_a ? 'clash_s1' : 'clash_s0');
	}

	// where things are (paper cells): the spots (theirs at the top), the hand
	function spotX(intS_a)
	{
		return 1 + intS_a * 7;
	}

	function handX(intH_a)
	{
		return 1 + intH_a * 6;
	}

	// everything again (cur: the pointer's place: 0-4 the hand, 5-7 your spots, 8-10 theirs)
	function drawAll()
	{
		var intK;
		for (intK = 0; intK < FLD; intK++)
		{
			drawCard(spotX(intK), 0, m_arrFC[3 + intK], powOf(1, intK), SL_THEIRS + intK * 4, (m_intCur === 8 + intK), false);
			drawCard(spotX(intK), 9, m_arrFC[intK], powOf(0, intK), SL_MINE + intK * 4, (m_intCur === 5 + intK), (m_arrFReady[intK] === 0));
		}
		for (intK = 0; intK < HAND; intK++)
		{
			drawCard(handX(intK), 16, m_arrHnd[intK], m_arrPow[m_arrHnd[intK]], SL_HAND + intK * 4, (m_intCur === intK), false);
		}
		stats();
		info();
	}

	// the panel: their life, energy, cards; yours
	function stats()
	{
		var intK, intN = 0;
		rect(25, 4, 10, 7, G.T_FELT, 7);
		text(25, 4, sideName(m_arrSide[1]), 7);
		put(25, 5, G.T_HEART, 7); text(26, 5, num(m_arrLife[1]) + ' ', 7);
		put(29, 5, G.T_BOLT, 7); text(30, 5, num(m_arrEn[1]), 7);
		put(32, 5, G.T_DECK, 7); text(33, 5, num(m_arrDeckN[1]), 7);
		for (intK = 0; intK < HAND; intK++)
		{
			if (m_arrHnd[5 + intK] !== 0) { intN++; }
		}
		text(25, 6, 'HAND ' + num(intN), 7);
		rect(25, 16, 10, 4, G.T_FELT, 7);
		text(25, 16, 'YOU', 7);
		put(25, 17, G.T_HEART, 7); text(26, 17, num(m_arrLife[0]) + ' ', 7);
		put(29, 17, G.T_BOLT, 7); text(30, 17, num(m_arrEn[0]), 7);
		put(32, 17, G.T_DECK, 7); text(33, 17, num(m_arrDeckN[0]), 7);
		text(25, 19, m_objPad.isTouch() ? 'END: END TURN' : 'M: END TURN', 7);
	}

	// what the pointer's on
	function info()
	{
		var intC = 0;
		if (m_intCur < 5) { intC = m_arrHnd[m_intCur]; } else { intC = m_arrFC[m_intCur - 5]; }
		rect(25, 8, 14, 6, G.T_FELT, 0);
		if (intC > 0)
		{
			text(25, 8, LONG[intC], 0);
			if (isSpell(intC)) { text(25, 9, 'SPELL', 0); } else { text(25, 9, sideName(m_arrFac[intC]), 0); }
			text(25, 10, 'COST ' + num(m_arrCost[intC]), 0);
			if (!isSpell(intC)) { text(25, 11, 'POWER ' + num(m_arrPow[intC]), 0); }
			text(25, 12, says(intC, 0), 0);
			text(25, 13, says(intC, 1), 0);
		}
	}

	// the lines between the spots
	function say(str_a)
	{
		var str = str_a.substr(0, 21);
		rect(4, 11, 21, 2, G.T_FELT, 0);
		text(4 + Math.floor((21 - str.length) / 2), 11, str, 0);
	}

	function say2(str_a)
	{
		var str = str_a.substr(0, 21);
		rect(4, 12, 21, 1, G.T_FELT, 0);
		text(4 + Math.floor((21 - str.length) / 2), 12, str, 0);
	}

	// the pointer over the card it's on
	function pointer()
	{
		var intX, intY;
		if (m_intCur < 5)
		{
			intX = handX(m_intCur); intY = 16;
		}
		else if (m_intCur < 8)
		{
			intX = spotX(m_intCur - 5); intY = 9;
		}
		else
		{
			intX = spotX(m_intCur - 8); intY = 0;
		}
		intX = (intX + 4) * 8 + 16; intY = (intY + 4) * 8 - 10;
		if (!m_objSlots.isVisible(SL_POINT) || (intX !== m_intPointX) || (intY !== m_intPointY))
		{
			// it bobs over the card on its own
			m_intPointX = intX; m_intPointY = intY;
			m_objSlots.put(SL_POINT, intX, intY, 'point', 1, 'clash_s0');
			m_objSlots.setMover(SL_POINT, function(intN_a, objO_a)
			{
				objO_a.y = intY + (Math.floor(objO_a.t / 8) & 3);
				return false;
			});
		}
	}

	// wait (the pointer hidden)
	function waitF(intT_a)
	{
		m_objSteps.call(function() { m_objSlots.hide(SL_POINT); });
		m_objSteps.wait(intT_a);
	}

	// a flash on a card (where: 5-7 yours, 8-10 theirs)
	function bang(intW_a)
	{
		var intX, intY;
		if (intW_a >= 8)
		{
			intX = spotX(intW_a - 8); intY = 0;
		}
		else
		{
			intX = spotX(intW_a - 5); intY = 9;
		}
		m_objSteps.call(function()
		{
			// the flash flickers (flipped every other pair of frames) on its own and goes
			m_objSlots.put(SL_BANG, (intX + 4) * 8 + 16, (intY + 4) * 8 + 20, 'bang', 1, 'clash_s0');
			m_objSlots.setMover(SL_BANG, function(intN_a, objO_a)
			{
				objO_a.flags = (((objO_a.t + 1) & 2) !== 0) ? SPRITE_MIRRORX : 0;
				return (objO_a.t >= 11);
			});
		});
		m_objSteps.wait(12);
	}

	// ====================================================================================================
	// KEYS, TAPS

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// 1 up, 2 down, 3 left, 4 right, 5 Space, 6 M (the moves repeating slowly)
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

	// the tile cell of this iteration's first tap ({x, y}; null: none)
	function tapCell()
	{
		var objResult = null;
		var intX;
		if (m_arrTaps.length > 0)
		{
			intX = m_arrTaps[0].x - GAMEX;
			if ((intX >= 0) && (intX < 320))
			{
				objResult = { x:Math.floor(intX / 8), y:Math.floor(m_arrTaps[0].y / 8) };
			}
		}
		return objResult;
	}

	// the pointer place tapped (0-4 the hand, 5-7 your spots, 8-10 theirs; -1: none)
	function tapPlace()
	{
		var objCell = tapCell();
		var intResult = -1;
		var intDX;
		if (objCell !== null)
		{
			if ((objCell.y >= 20) && (objCell.y <= 26) && (objCell.x >= 5) && (objCell.x < 35))
			{
				intResult = Math.floor((objCell.x - 5) / 6);
			}
			else if ((objCell.y >= 4) && (objCell.y <= 19) && (objCell.x >= 5))
			{
				intDX = objCell.x - 5;
				if (((intDX % 7) < 6) && (Math.floor(intDX / 7) < FLD))
				{
					if (objCell.y >= 13) { intResult = 5 + Math.floor(intDX / 7); }
					else if (objCell.y <= 10) { intResult = 8 + Math.floor(intDX / 7); }
				}
			}
		}
		return intResult;
	}

	// a tap on the panel's END TURN line?
	function tapEnd()
	{
		var objCell = tapCell();
		return (objCell !== null) && (objCell.y >= 18) && (objCell.y <= 20) && (objCell.x >= 25) && (objCell.x <= 38);
	}

	// the pointer moved by key f: along a row, between the rows
	function moveCur(intF_a)
	{
		var intWas = m_intCur;
		if (m_intCur < 5)
		{
			if ((intF_a === 3) && (m_intCur > 0)) { m_intCur--; }
			if ((intF_a === 4) && (m_intCur < 4)) { m_intCur++; }
			if (intF_a === 1) { m_intCur = 5 + Math.floor((m_intCur * 3) / 5); }
		}
		else if (m_intCur < 8)
		{
			if ((intF_a === 3) && (m_intCur > 5)) { m_intCur--; }
			if ((intF_a === 4) && (m_intCur < 7)) { m_intCur++; }
			if (intF_a === 1) { m_intCur += 3; }
			if (intF_a === 2) { m_intCur = Math.floor(((m_intCur - 5) * 5) / 3) + 1; }
		}
		else
		{
			if ((intF_a === 3) && (m_intCur > 8)) { m_intCur--; }
			if ((intF_a === 4) && (m_intCur < 10)) { m_intCur++; }
			if (intF_a === 2) { m_intCur -= 3; }
		}
		moved(intWas);
	}

	// the pointer put straight on a place (a tap)
	function moveTo(intW_a)
	{
		var intWas = m_intCur;
		m_intCur = intW_a;
		moved(intWas);
	}

	function moved(intWas_a)
	{
		if (m_intCur !== intWas_a)
		{
			m_objSound.play(0, 200, 0, 6, 2, 0);
			recard(intWas_a); recard(m_intCur); info();
		}
	}

	// one card again (by pointer place)
	function recard(intW_a)
	{
		if (intW_a < 5)
		{
			drawCard(handX(intW_a), 16, m_arrHnd[intW_a], m_arrPow[m_arrHnd[intW_a]], SL_HAND + intW_a * 4, (m_intCur === intW_a), false);
		}
		else if (intW_a < 8)
		{
			drawCard(spotX(intW_a - 5), 9, m_arrFC[intW_a - 5], powOf(0, intW_a - 5), SL_MINE + (intW_a - 5) * 4, (m_intCur === intW_a), (m_arrFReady[intW_a - 5] === 0));
		}
		else
		{
			drawCard(spotX(intW_a - 8), 0, m_arrFC[intW_a - 5], powOf(1, intW_a - 8), SL_THEIRS + (intW_a - 8) * 4, (m_intCur === intW_a), false);
		}
	}

	// ====================================================================================================
	// THE TITLE AND THE CAMPAIGN

	function title()
	{
		table();
		text(11, 6, 'C A R D   C L A S H', 0);
		text(8, 8, 'WITCHES  ZOMBIES  CYBORGS', 0);
		text(7, 20, m_objPad.isTouch() ? '  PICK YOUR SIDE: TAP IT' : 'PICK YOUR SIDE: O P, SPACE', 0);
		text(9, 26, '(C) 2026 CYBORG UNICORN', 0);
		m_arrSide[0] = 1;
		titleSides();
		m_objSteps.until(function()
		{
			var intF = key();
			var objCell = tapCell();
			var intWas = m_arrSide[0];
			var intK;
			if (objCell !== null)
			{
				for (intK = 1; intK <= 3; intK++)
				{
					if ((objCell.x >= 7 + (intK - 1) * 10) && (objCell.x <= 12 + (intK - 1) * 10) && (objCell.y >= 10) && (objCell.y <= 16))
					{
						if (intK === m_arrSide[0]) { intF = 5; } else { m_arrSide[0] = intK; }
					}
				}
			}
			if ((intF === 3) && (m_arrSide[0] > 1)) { m_arrSide[0]--; }
			if ((intF === 4) && (m_arrSide[0] < 3)) { m_arrSide[0]++; }
			if (m_arrSide[0] !== intWas) { titleSides(); }
			if (intF === 5) { m_objSound.play(0, 100, -2, 14, 20, 0); }
			return (intF === 5);
		});
	}

	function titleSides()
	{
		var intK;
		text(14, 22, '  ' + sideName(m_arrSide[0]) + '  ', 0);
		for (intK = 1; intK <= 3; intK++)
		{
			drawCard(3 + (intK - 1) * 10, 6, intK * 6, m_arrPow[intK * 6], (intK - 1) * 4, (intK === m_arrSide[0]), false);
		}
	}

	// three duels: the other two sides, then the champion; a card won after each
	function campaign()
	{
		var intK, intN;
		// your deck: your side's six characters three times, its two spells three times
		m_intMyN = 0;
		for (intK = 0; intK <= 5; intK++)
		{
			for (intN = 1; intN <= 3; intN++)
			{
				m_arrMyDeck[m_intMyN] = (m_arrSide[0] - 1) * 6 + 1 + intK; m_intMyN++;
			}
		}
		for (intK = 0; intK <= 1; intK++)
		{
			for (intN = 1; intN <= 3; intN++)
			{
				m_arrMyDeck[m_intMyN] = SP_FIRE + (m_arrSide[0] - 1) * 2 + intK; m_intMyN++;
			}
		}
		m_intDuel = 1;
		nextDuel();
	}

	function nextDuel()
	{
		if (m_intDuel === 3)
		{
			m_arrSide[1] = 1 + rnd(3);
		}
		else
		{
			m_arrSide[1] = 1 + ((m_arrSide[0] + m_intDuel - 1) % 3);
		}
		duel1();
		m_objSteps.call(function()
		{
			if (m_intWinner !== 0)
			{
				table();
				text(12, 12, 'YOU LOST THE DUEL', 0);
				text(12, 14, m_objPad.isTouch() ? 'TAP TO GO ON' : 'PRESS SPACE', 0);
				pause();
			}
			else
			{
				prize();
				m_objSteps.call(function()
				{
					if (m_intDuel < 3)
					{
						m_intDuel++;
						nextDuel();
					}
					else
					{
						table();
						text(10, 10, 'YOU BEAT THE CHAMPION!', 0);
						text(10, 12, 'THE ' + sideName(m_arrSide[0]) + ' RULE!', 0);
						text(12, 16, m_objPad.isTouch() ? 'TAP TO GO ON' : 'PRESS SPACE', 0);
						m_objSound.play(0, 80, -1, 15, 60, 0);
						pause();
					}
				});
			}
		});
	}

	function pause()
	{
		m_objSteps.until(function()
		{
			var blnDone = (key() === 5) || (m_arrTaps.length > 0);
			if (blnDone) { m_arrTaps = []; }
			return blnDone;
		});
	}

	// a card won: one of two from the beaten side
	function prize()
	{
		var intA, intB, intCh = 1;
		table();
		intA = (m_arrSide[1] - 1) * 6 + 2 + rnd(5);
		intB = SP_FIRE + (m_arrSide[1] - 1) * 2 + rnd(2);
		text(9, 5, 'YOU WON! TAKE A CARD:', 0);

		function show()
		{
			var intC = (intCh === 1) ? intA : intB;
			drawCard(6, 8, intA, m_arrPow[intA], 0, (intCh === 1), false);
			drawCard(18, 8, intB, 0, 4, (intCh === 2), false);
			rect(6, 21, 30, 2, G.T_FELT, 0);
			text(10, 21, LONG[intC], 0);
			text(10, 22, says(intC, 0) + ' ' + says(intC, 1), 0);
		}

		show();
		m_objSteps.until(function()
		{
			var intF = key();
			var objCell = tapCell();
			var intWas = intCh;
			var intN;
			if ((objCell !== null) && (objCell.y >= 12) && (objCell.y <= 18))
			{
				if ((objCell.x >= 10) && (objCell.x <= 15)) { if (intCh === 1) { intF = 5; } else { intCh = 1; } }
				if ((objCell.x >= 22) && (objCell.x <= 27)) { if (intCh === 2) { intF = 5; } else { intCh = 2; } }
			}
			if (intF === 3) { intCh = 1; }
			if (intF === 4) { intCh = 2; }
			if (intCh !== intWas) { show(); }
			if (intF === 5)
			{
				intN = (intCh === 1) ? intA : intB;
				if (m_intMyN < MAXDECK)
				{
					m_arrMyDeck[m_intMyN] = intN; m_intMyN++;
				}
				else
				{
					m_arrMyDeck[rnd(m_intMyN)] = intN;
				}
				m_objSound.play(0, 100, -3, 14, 20, 0);
			}
			return (intF === 5);
		});
	}

	// ====================================================================================================
	// A DUEL

	function duel1()
	{
		var intK, intI, intN, intT, intP = 0, blnFirst = true;
		table();
		// the decks, shuffled; the hands; the spots
		m_arrDeckN[0] = m_intMyN;
		for (intK = 0; intK < m_intMyN; intK++)
		{
			m_arrDeck[intK] = m_arrMyDeck[intK];
		}
		intN = 0;
		for (intK = 0; intK <= 5; intK++)
		{
			intT = (m_intDuel === 3) ? 4 : 3;
			for (intI = 1; intI <= intT; intI++)
			{
				if (intN < 30) { m_arrDeck[30 + intN] = (m_arrSide[1] - 1) * 6 + 1 + intK; intN++; }
			}
		}
		for (intK = 0; intK <= 1; intK++)
		{
			for (intI = 1; intI <= 3; intI++)
			{
				if (intN < 30) { m_arrDeck[30 + intN] = SP_FIRE + (m_arrSide[1] - 1) * 2 + intK; intN++; }
			}
		}
		m_arrDeckN[1] = intN;
		shuffle(0); shuffle(1);
		for (intK = 0; intK <= 9; intK++)
		{
			m_arrHnd[intK] = 0;
		}
		for (intK = 0; intK <= 5; intK++)
		{
			m_arrFC[intK] = 0; m_arrFPow[intK] = 0; m_arrFReady[intK] = 0; m_arrFShield[intK] = 0; m_arrFRose[intK] = 0;
		}
		m_arrLife[0] = LIFE0; m_arrLife[1] = LIFE0; m_arrTurnN[0] = 0; m_arrTurnN[1] = 0; m_arrEn[0] = 0; m_arrEn[1] = 0;
		for (intK = 1; intK <= 4; intK++)
		{
			drawOne(0); drawOne(1);
		}
		m_intCur = 0; m_intWinner = -1;
		drawAll();
		say('DUEL ' + num(m_intDuel) + ': THE ' + sideName(m_arrSide[1]));
		waitF(80);
		// turn by turn, you first, till someone's won
		m_objSteps.until(function()
		{
			var blnDone = false;
			if (!blnFirst)
			{
				if (m_intWinner >= 0) { blnDone = true; } else { intP = 1 - intP; }
			}
			if (!blnDone)
			{
				blnFirst = false;
				turnStart(intP);
				if (intP === 0) { yourTurn(); } else { theirTurn(); }
			}
			return blnDone;
		});
		waitF(40);
		m_objSteps.call(function()
		{
			if (m_intWinner === 0)
			{
				say('YOU WIN THE DUEL!'); m_objSound.play(0, 100, -2, 15, 40, 0);
			}
			else
			{
				say('YOU LOSE...'); m_objSound.play(2, 400, 10, 15, 50, 0);
			}
		});
		m_objSteps.wait(120);
		m_objSteps.call(function() { m_objSlots.hideRange(0, 50); });
	}

	function shuffle(intP_a)
	{
		var intA, intB, intT;
		for (intA = m_arrDeckN[intP_a] - 1; intA >= 1; intA--)
		{
			intB = rnd(intA + 1);
			intT = m_arrDeck[intP_a * 30 + intA]; m_arrDeck[intP_a * 30 + intA] = m_arrDeck[intP_a * 30 + intB]; m_arrDeck[intP_a * 30 + intB] = intT;
		}
	}

	// p draws a card (none left: 2 damage instead)
	function drawOne(intP_a)
	{
		var intH, blnDone = false;
		if (m_arrDeckN[intP_a] === 0)
		{
			hurt(intP_a, 2);
		}
		else
		{
			for (intH = 0; (intH < HAND) && !blnDone; intH++)
			{
				if (m_arrHnd[intP_a * 5 + intH] === 0)
				{
					m_arrDeckN[intP_a]--;
					m_arrHnd[intP_a * 5 + intH] = m_arrDeck[intP_a * 30 + m_arrDeckN[intP_a]];
					blnDone = true;
				}
			}
		}
	}

	function turnStart(intP_a)
	{
		var intK;
		m_arrTurnN[intP_a]++;
		m_arrEn[intP_a] = Math.min(m_arrTurnN[intP_a], 8);
		for (intK = 0; intK < FLD; intK++)
		{
			if (m_arrFC[intP_a * 3 + intK] !== 0) { m_arrFReady[intP_a * 3 + intK] = 1; }
		}
		drawOne(intP_a);
		drawAll();
	}

	function hurt(intP_a, intD_a)
	{
		m_arrLife[intP_a] -= intD_a;
		if (m_arrLife[intP_a] <= 0)
		{
			m_arrLife[intP_a] = 0;
			m_intWinner = 1 - intP_a;
		}
		stats();
		m_objSound.play(2, 60, 6, 14, 12, 1);
	}

	// a character's power now: HORDE counts the other zombies on its side
	function powOf(intP_a, intS_a)
	{
		var intV = 0, intC = 0, intK;
		if ((intS_a >= 0) && (intS_a < FLD)) { intC = m_arrFC[intP_a * 3 + intS_a]; }
		if (intC !== 0)
		{
			intV = m_arrFPow[intP_a * 3 + intS_a];
			if ((m_arrAb[intC] === AB_HORDE) || (m_arrAb[intC] === AB_KING))
			{
				for (intK = 0; intK < FLD; intK++)
				{
					if ((intK !== intS_a) && (m_arrFC[intP_a * 3 + intK] > 0))
					{
						if (m_arrFac[m_arrFC[intP_a * 3 + intK]] === 2) { intV++; }
					}
				}
			}
		}
		return intV;
	}

	// ====================================================================================================
	// PLAYING CARDS

	// p plays hand card h (target t: a spot, for the spells that need one); false if it can't. The
	// flashes of what it beats play as steps, then everything's drawn again.
	function play(intP_a, intH_a, intT_a)
	{
		var intC = m_arrHnd[intP_a * 5 + intH_a];
		var intQ = 1 - intP_a;
		var intS, intK;
		var blnResult = false;

		if ((intC > 0) && (m_arrCost[intC] <= m_arrEn[intP_a]))
		{
			if (!isSpell(intC))
			{
				intS = freeSpot(intP_a);
				if (intS >= 0)
				{
					blnResult = true;
					m_arrFC[intP_a * 3 + intS] = intC; m_arrFPow[intP_a * 3 + intS] = m_arrPow[intC]; m_arrFRose[intP_a * 3 + intS] = 0;
					m_arrFReady[intP_a * 3 + intS] = (m_arrAb[intC] === AB_SWIFT) ? 1 : 0;
					m_arrFShield[intP_a * 3 + intS] = (m_arrAb[intC] === AB_SHIELD) ? 1 : 0;
					m_arrEn[intP_a] -= m_arrCost[intC]; m_arrHnd[intP_a * 5 + intH_a] = 0;
					m_objSound.play(0, 120, -4, 12, 10, 0);
					// what it does when it comes on
					switch (m_arrAb[intC])
					{
						case AB_BREW: m_arrLife[intP_a] += 2; break;
						case AB_HEX: weaken(intQ, best(intQ), 1); break;
						case AB_HEX2: weaken(intQ, best(intQ), 2); break;
						case AB_HEXALL:
							for (intK = 0; intK < FLD; intK++)
							{
								weaken(intQ, intK, 1);
							}
							break;
						case AB_LASER: hurt(intQ, 1); break;
						case AB_LASER2: hurt(intQ, 2); break;
						default: break;
					}
				}
			}
			else
			{
				switch (intC)
				{
					case SP_FIRE:
						if ((intT_a >= 0) && (m_arrFC[intQ * 3 + intT_a] !== 0) && (powOf(intQ, intT_a) <= 3))
						{
							blnResult = true;
							spend(intP_a, intH_a, intC);
							kill(intQ, intT_a);
						}
						break;
					case SP_CURSE:
						if ((intT_a >= 0) && (m_arrFC[intQ * 3 + intT_a] !== 0))
						{
							blnResult = true;
							spend(intP_a, intH_a, intC);
							weaken(intQ, intT_a, 3);
						}
						break;
					case SP_RAISE:
						intS = freeSpot(intP_a);
						if (intS >= 0)
						{
							blnResult = true;
							spend(intP_a, intH_a, intC);
							m_arrFC[intP_a * 3 + intS] = 7; m_arrFPow[intP_a * 3 + intS] = 2; m_arrFReady[intP_a * 3 + intS] = 0;
							m_arrFShield[intP_a * 3 + intS] = 0; m_arrFRose[intP_a * 3 + intS] = 0;
						}
						break;
					case SP_PLAGUE:
						blnResult = true;
						spend(intP_a, intH_a, intC);
						for (intS = 0; intS <= 5; intS++)
						{
							if ((m_arrFC[intS] > 0) && (m_arrFac[m_arrFC[intS]] !== 2)) { weaken(Math.floor(intS / 3), intS % 3, 2); }
						}
						break;
					case SP_BOOST:
						if ((intT_a >= 0) && (m_arrFC[intP_a * 3 + intT_a] !== 0))
						{
							blnResult = true;
							spend(intP_a, intH_a, intC);
							m_arrFPow[intP_a * 3 + intT_a] += 3;
						}
						break;
					default:
						blnResult = true;
						spend(intP_a, intH_a, intC);
						for (intS = 0; intS <= 5; intS++)
						{
							if ((m_arrFC[intS] > 0) && (powOf(Math.floor(intS / 3), intS % 3) <= 2)) { kill(Math.floor(intS / 3), intS % 3); }
						}
						break;
				}
			}
		}
		if (blnResult)
		{
			m_objSteps.call(drawAll);
		}
		return blnResult;
	}

	function spend(intP_a, intH_a, intC_a)
	{
		m_arrEn[intP_a] -= m_arrCost[intC_a]; m_arrHnd[intP_a * 5 + intH_a] = 0;
		m_objSound.play(1, 40, -2, 13, 14, 1);
	}

	function freeSpot(intP_a)
	{
		var intK, intResult = -1;
		for (intK = FLD - 1; intK >= 0; intK--)
		{
			if (m_arrFC[intP_a * 3 + intK] === 0) { intResult = intK; }
		}
		return intResult;
	}

	// p's strongest character's spot (-1: none)
	function best(intP_a)
	{
		var intK, intV, intB = -1, intResult = -1;
		for (intK = 0; intK < FLD; intK++)
		{
			if (m_arrFC[intP_a * 3 + intK] > 0)
			{
				intV = powOf(intP_a, intK);
				if (intV > intB) { intB = intV; intResult = intK; }
			}
		}
		return intResult;
	}

	// p's character at s loses d power (to nothing: gone)
	function weaken(intP_a, intS_a, intD_a)
	{
		if ((intS_a >= 0) && (m_arrFC[intP_a * 3 + intS_a] !== 0))
		{
			m_arrFPow[intP_a * 3 + intS_a] -= intD_a;
			if (m_arrFPow[intP_a * 3 + intS_a] <= 0)
			{
				m_arrFPow[intP_a * 3 + intS_a] = 0;
				kill(intP_a, intS_a);
			}
		}
	}

	// p's character at s is beaten: a shield saves it once; a riser goes back to the hand
	function kill(intP_a, intS_a)
	{
		var intC = m_arrFC[intP_a * 3 + intS_a];
		var intH, blnDone = false;
		if (intC !== 0)
		{
			if ((m_arrFShield[intP_a * 3 + intS_a] !== 0) && (m_arrFPow[intP_a * 3 + intS_a] > 0))
			{
				m_arrFShield[intP_a * 3 + intS_a] = 0;
				say2(LONG[intC] + "'S SHIELD!");
			}
			else
			{
				m_arrFC[intP_a * 3 + intS_a] = 0;
				bang(5 + intP_a * 3 + intS_a);
				if (((m_arrAb[intC] === AB_RISE) || (m_arrAb[intC] === AB_KING)) && (m_arrFRose[intP_a * 3 + intS_a] === 0))
				{
					for (intH = 0; (intH < HAND) && !blnDone; intH++)
					{
						if (m_arrHnd[intP_a * 5 + intH] === 0)
						{
							m_arrHnd[intP_a * 5 + intH] = intC;
							say2(LONG[intC] + ' RISES!');
							blnDone = true;
						}
					}
				}
			}
		}
	}

	// p's character at s attacks; the other side blocks with b (-1: takes it)
	function attack(intP_a, intS_a, intB_a)
	{
		var intQ = 1 - intP_a;
		var intC = m_arrFC[intP_a * 3 + intS_a];
		var intPA = powOf(intP_a, intS_a);
		var intPB;
		m_arrFReady[intP_a * 3 + intS_a] = 0;
		if (intB_a < 0)
		{
			say(LONG[intC] + ' HITS ' + num(intPA));
			hurt(intQ, intPA);
			waitF(30);
		}
		else
		{
			intPB = powOf(intQ, intB_a);
			say(LONG[intC] + ' VS'); say2(LONG[m_arrFC[intQ * 3 + intB_a]]);
			waitF(40);
			m_objSteps.call(function()
			{
				if (intPA >= intPB)
				{
					kill(intQ, intB_a);
					if ((m_arrAb[intC] === AB_BITE) && (m_arrFC[intQ * 3 + intB_a] === 0)) { m_arrFPow[intP_a * 3 + intS_a]++; }
				}
				if (intPB >= intPA) { kill(intP_a, intS_a); }
				m_objSound.play(2, 50, 4, 14, 10, 1);
			});
		}
		m_objSteps.call(drawAll);
	}

	// ====================================================================================================
	// YOUR TURN

	function yourTurn()
	{
		say('YOUR TURN');
		say2(m_objPad.isTouch() ? 'TAP AGAIN: USE IT' : 'SPACE: PLAY OR ATTACK');
		m_objSteps.until(function()
		{
			var intF = 0, intW, intB;
			var blnDone = (m_intWinner >= 0);
			if (!blnDone)
			{
				pointer();
				intF = key();
				intW = tapPlace();
				if (intW >= 0)
				{
					if (intW === m_intCur) { intF = 5; } else { moveTo(intW); }
				}
				if (tapEnd()) { intF = 6; }
				if ((intF >= 1) && (intF <= 4)) { moveCur(intF); }
				if (intF === 5)
				{
					if (m_intCur < 5)
					{
						// a card from the hand
						if (m_arrHnd[m_intCur] <= 0)
						{
							say('NO CARD THERE');
						}
						else if (m_arrCost[m_arrHnd[m_intCur]] > m_arrEn[0])
						{
							say('NOT ENOUGH ENERGY');
							m_objSound.play(2, 500, 0, 10, 8, 0);
						}
						else if ((m_arrHnd[m_intCur] === SP_FIRE) || (m_arrHnd[m_intCur] === SP_CURSE) || (m_arrHnd[m_intCur] === SP_BOOST))
						{
							target(m_arrHnd[m_intCur], function(intT_a)
							{
								if ((intT_a >= 0) && !play(0, m_intCur, intT_a)) { say("THAT WON'T WORK"); }
							});
						}
						else if (!play(0, m_intCur, -1))
						{
							say('NO ROOM ON YOUR SPOTS');
						}
					}
					else if (m_intCur < 8)
					{
						// attack
						if (m_arrFC[m_intCur - 5] === 0)
						{
							say('NOTHING THERE');
						}
						else if (m_arrFReady[m_intCur - 5] === 0)
						{
							say("IT CAN'T ATTACK YET");
						}
						else
						{
							intB = theyBlock(m_intCur - 5);
							attack(0, m_intCur - 5, intB);
						}
					}
				}
				blnDone = (intF === 6);
			}
			return blnDone;
		});
		m_objSteps.call(function() { m_objSlots.hide(SL_POINT); });
	}

	// choose a target for spell c: theirs (FIRE, CURSE) or yours (BOOST); then fnThen_a(the spot,
	// -1: back)
	function target(intC_a, fnThen_a)
	{
		var intWas = m_intCur;
		var intF = 0;
		var intLo = (intC_a === SP_BOOST) ? 5 : 8;
		m_intCur = intLo;
		recard(intWas); recard(m_intCur); info();
		say(m_objPad.isTouch() ? 'WHICH? (END: BACK)' : 'WHICH ONE? (M: BACK)');
		m_objSteps.until(function()
		{
			var intK = m_intCur;
			var intW = tapPlace();
			pointer();
			intF = key();
			if ((intW >= intLo) && (intW <= intLo + 2))
			{
				if (intW === m_intCur) { intF = 5; } else { m_intCur = intW; }
			}
			if (tapEnd()) { intF = 6; }
			if ((intF === 3) && (m_intCur !== intLo)) { m_intCur--; }
			if ((intF === 4) && (m_intCur !== intLo + 2)) { m_intCur++; }
			if (m_intCur !== intK) { recard(intK); recard(m_intCur); info(); }
			return (intF === 5) || (intF === 6);
		});
		m_objSteps.call(function()
		{
			var intT = (intF === 6) ? -1 : m_intCur - intLo;
			var intK = m_intCur;
			m_intCur = intWas;
			recard(intK); recard(m_intCur);
			say('YOUR TURN');
			fnThen_a(intT);
		});
	}

	// ====================================================================================================
	// THEIR TURN (the computer)

	function theirTurn()
	{
		var blnPlayed = true, intS = 0;
		say('THE ' + sideName(m_arrSide[1]) + "' TURN");
		say2('');
		waitF(40);
		// play cards: the dearest first, while there's energy and room
		m_objSteps.until(function()
		{
			var intH, intC, intB = -1, intT = 0;
			var blnDone = (m_intWinner >= 0) || !blnPlayed;
			if (!blnDone)
			{
				blnPlayed = false;
				for (intH = 0; intH < HAND; intH++)
				{
					intC = m_arrHnd[5 + intH];
					if ((intC > 0) && (m_arrCost[intC] <= m_arrEn[1]) && (m_arrCost[intC] > intT) && useful(intC))
					{
						intT = m_arrCost[intC]; intB = intH;
					}
				}
				if (intB >= 0)
				{
					intC = m_arrHnd[5 + intB];
					say('THEY PLAY ' + LONG[intC]);
					blnPlayed = play(1, intB, aiTarget(intC));
					waitF(50);
				}
				else
				{
					blnDone = true;
				}
			}
			return blnDone;
		});
		// attack: with what wins (or when there's nothing to stop it)
		m_objSteps.until(function()
		{
			var intMe = intS;
			var blnDone = (m_intWinner >= 0) || (intS >= FLD);
			if (!blnDone)
			{
				intS++;
				if ((m_arrFC[3 + intMe] > 0) && (m_arrFReady[3 + intMe] !== 0))
				{
					if ((powOf(1, intMe) > powOf(0, best(0))) || (best(0) < 0) || (rnd(3) === 0) || (powOf(1, intMe) >= m_arrLife[0]))
					{
						say('THEIR ' + LONG[m_arrFC[3 + intMe]]); say2('ATTACKS!');
						waitF(30);
						m_objSteps.call(function()
						{
							youBlock(intMe, function(intB_a)
							{
								attack(1, intMe, intB_a);
								waitF(30);
							});
						});
					}
				}
			}
			return blnDone;
		});
	}

	// is card c worth playing now (for the computer)?
	function useful(intC_a)
	{
		var blnResult = true;
		if (!isSpell(intC_a))
		{
			blnResult = (freeSpot(1) >= 0);
		}
		else
		{
			switch (intC_a)
			{
				case SP_FIRE: blnResult = (aiTarget(intC_a) >= 0); break;
				case SP_CURSE: blnResult = (best(0) >= 0); break;
				case SP_RAISE: blnResult = (freeSpot(1) >= 0); break;
				case SP_BOOST: blnResult = (best(1) >= 0); break;
				default: blnResult = (count0(0) >= 2); break;
			}
		}
		return blnResult;
	}

	function count0(intP_a)
	{
		var intK, intResult = 0;
		for (intK = 0; intK < FLD; intK++)
		{
			if (m_arrFC[intP_a * 3 + intK] > 0) { intResult++; }
		}
		return intResult;
	}

	// the computer's target for a spell
	function aiTarget(intC_a)
	{
		var intS, intV, intB = -1, intResult = -1;
		if (intC_a === SP_FIRE)
		{
			for (intS = 0; intS < FLD; intS++)
			{
				if (m_arrFC[intS] > 0)
				{
					intV = powOf(0, intS);
					if ((intV <= 3) && (intV > intB)) { intB = intV; intResult = intS; }
				}
			}
		}
		else if (intC_a === SP_CURSE)
		{
			intResult = best(0);
		}
		else if (intC_a === SP_BOOST)
		{
			intResult = best(1);
		}
		return intResult;
	}

	// the computer blocks your attacker (at your spot s)? its spot, or -1
	function theyBlock(intS_a)
	{
		var intA = powOf(0, intS_a);
		var intB, intV, intW = 99, intResult = -1;
		// the weakest that beats it
		for (intB = 0; intB < FLD; intB++)
		{
			if (m_arrFC[3 + intB] > 0)
			{
				intV = powOf(1, intB);
				if ((intV > intA) && (intV < intW)) { intW = intV; intResult = intB; }
			}
		}
		// about to lose: anything at all
		if ((intResult < 0) && (m_arrLife[1] <= intA))
		{
			for (intB = 0; intB < FLD; intB++)
			{
				if (m_arrFC[3 + intB] > 0) { intResult = intB; }
			}
		}
		return intResult;
	}

	// you choose a blocker for their attacker at s; then fnThen_a(your spot, -1: none)
	function youBlock(intS_a, fnThen_a)
	{
		var intWas, intF = 0;
		if (count0(0) === 0)
		{
			fnThen_a(-1);
		}
		else
		{
			intWas = m_intCur;
			m_intCur = 5;
			recard(intWas); recard(m_intCur); info();
			say('BLOCK ' + LONG[m_arrFC[3 + intS_a]] + ' ' + num(powOf(1, intS_a)) + '?');
			say2(m_objPad.isTouch() ? 'TAP: YES  END: NO' : 'SPACE: WITH THAT  M: NO');
			m_objSteps.until(function()
			{
				var intK = m_intCur;
				var intW = tapPlace();
				pointer();
				intF = key();
				if ((intW >= 5) && (intW <= 7))
				{
					if (intW === m_intCur) { intF = 5; } else { m_intCur = intW; }
				}
				if (tapEnd()) { intF = 6; }
				if ((intF === 3) && (m_intCur > 5)) { m_intCur--; }
				if ((intF === 4) && (m_intCur < 7)) { m_intCur++; }
				if (m_intCur !== intK) { recard(intK); recard(m_intCur); info(); }
				if ((intF === 5) && (m_arrFC[m_intCur - 5] === 0)) { intF = 0; }
				return (intF === 5) || (intF === 6);
			});
			m_objSteps.call(function()
			{
				m_objSlots.hide(SL_POINT);
				say2('');
				fnThen_a((intF === 5) ? m_intCur - 5 : -1);
			});
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
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	function sprite(strName_a, objCell_a, intW_a, intH_a)
	{
		return { name:strName_a, classes:'clash', imagename:'clash_s0', x:0, y:0, w:intW_a, h:intH_a, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intW_a, imageh:intH_a, sequence:[1, 0] };
	}

	this.run = function()
	{
		var arrTiles = [];
		var intI;
		for (intI = 0; intI <= 7; intI++)
		{
			arrTiles.push('clash_t' + intI);
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([ sprite('port1', G.S_PORT, 32, 32), sprite('port2', G.S_PORT2, 32, 32), sprite('port3', G.S_PORT3, 32, 32),
			sprite('back', G.S_BACK, 32, 32), sprite('point', G.S_POINT, 16, 16), sprite('bang', G.S_BANG, 16, 16) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrTiles, first:0, firstcode:0, transparent:0 });
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:144, size:20, key:K_SPACE, label:'PLAY' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:196, size:20, key:K_M, label:'END' }
		] });
		setup();
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('clash'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			// the BASIC's main loop: the title, the campaign, again
			m_objSteps.until(function()
			{
				title();
				m_objSteps.call(campaign);
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new clashGame();
g_objGame.run();
