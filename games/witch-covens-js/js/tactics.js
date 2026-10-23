// tactics.js - the engine of the four ZX Spectrum Next squad tactics games (DEMON TRANSCENDENCE,
// ZOMBIE APOCALYPSE, WITCH COVENS, VOID STRIKE: one NTC BASIC engine, each game its own data),
// ported to PotentJS. The game's data (js/data-<game>.js, made by tools/ports/tactics_export.py)
// is the missions, the words, the kinds and what the game says differently.
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Turn-based, in the spirit of Rebelstar: each turn your squad spends time units (TU) moving,
// shooting (a snap shot or an aimed one), throwing grenades, opening doors, picking things up;
// then the enemy has its turn - and a soldier with TU left fires at whatever moves where he can
// see it. 16 missions, a comic page before each.
//
// The BASIC is turned over routine for routine. Its waits (VFrame, Wait n, key loops) are JSteps:
// a routine that waits puts its body in a step (sCall), so routines called one after another run
// one after another; a loop whose body waits is sLoop. The map and the panel are a JTileGrid (the
// Next's tilemap). The units, items, shots and effects are JSpriteSlots, numbered as the Next's
// sprites, and each does what it does on its own: a unit's animation is its kind's sequence, with
// a loop for each way it faces; a boom plays once and stops; a shot flies its line by a mover; a
// shot or a blast asks the slots what it touches (their hit boxes). An enemy not seen is still on
// its cell, drawn with a blank image, so a shot still meets it. Line of sight and the enemy's
// paths stay on the grid, as the Next's Z80 did them.
function tacticsGame(objData_a)
{
	var m_objThis = this;
	var D = objData_a;
	var NAME = D.name;
	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:96, y:32, w:256, h:192 };		// the part of the screen the game uses: the canvas shows only this
	// full screen (JCanvas's screenmode) on a wider screen: more of the map shows left and right of
	// the Next's 16 x 10 cells (at most WIDEMAX pixels each side); the panel and the pages stay as
	// they are. m_objWide is the map's rows on the screen, all 32 cells across
	var WIDEMAX = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:96, y:32, w:256, h:192 }, m_objWide = null, m_blnMap = false;

	// the unit kinds: 0 a soldier, 1-6 the enemy, 7-12 things that don't move (10-12 2 x 2), 13 a survivor
	var K_SOLDIER = 0, K_IMP = 1, K_HUSK = 2, K_HOUND = 3, K_SPITTER = 4, K_BRUTE = 5, K_WRAITH = 6;
	var K_PORTAL = 7, K_NEST = 8, K_ALTAR = 9, K_CORE = 10, K_GATEKEEPER = 11, K_ARCHDEMON = 12, K_SURVIVOR = 13;
	// the cell kinds (tools/art_*.py's CELLS)
	var C_VOID = 0, C_ROUGH = 5, C_HAZARD = 6, C_WALL1 = 7, C_WALL2 = 8, C_WINDOW = 9, C_DOORH = 10, C_DOORV = 12;
	var C_CRATE = 14, C_TANK = 15, C_PILLAR = 16, C_CONSOLE = 17, C_TERMINAL = 18, C_EXIT = 19, C_MACHINE = 20, C_TABLE = 21;
	var O_KILL = 1, O_RESCUE = 2, O_TERMINAL = 3, O_DESTROY = 4, O_EXIT = 5, O_BOSS = 6;
	var I_MEDKIT = 1, I_AMMO = 2, I_GRENADES = 3, I_DATA = 4, I_CORPSE = 5, I_REMAINS = 6;
	var TU_STEP = 2, TU_DIAG = 3, TU_SNAP = 8, TU_AIM = 14, TU_GREN = 10, TU_PICK = 4, TU_USE = 8, TU_DOOR = 2, TU_HIT = 8;
	var W_PAGE = 0, W_NAME = 114, W_BRIEF = 130, W_SQUAD = 162;
	var NU = 40, NI = 32;
	var PL_ACID = D.pl.PL_ACID;
	var T_PANEL = D.consts.T_PANEL, T_GREN = D.consts.T_GREN;
	// fx.png's frames (tools/ports/tactics_sheets.py), 1-based
	var FX_CURSOR = 1, FX_TARGET = 3, FX_FLASH = 4, FX_BOOM = 5, FX_SPARK = 9, FX_SPARKACID = 11, FX_TRACER = 13;
	var FX_ACID = 14, FX_FIRE = 15, FX_FIREACID = 16, FX_GRENADE = 17, FX_SPARKPORTAL = 18, FX_SPARKFLASH = 20;
	// the keys (key codes) and the BASIC's Key() codes
	var KC_Q = 81, KC_W = 87, KC_E = 69, KC_A = 65, KC_D = 68, KC_Z = 90, KC_X = 88, KC_C = 67, KC_F = 70, KC_G = 71;
	var KC_P = 80, KC_U = 85, KC_N = 78, KC_T = 84, KC_B = 66, KC_Y = 89, KC_1 = 49, KC_2 = 50, KC_ENTER = 13, KC_SPACE = 32;
	// the sprite slots, as the Next's: units 0-39, items 40-71, the big one 100, the cursor, the target,
	// the shot, the effect; and a blast probe (never seen)
	var SP_ITEM = 40, SP_BIG = 100, SP_CURSOR = 110, SP_TARGET = 111, SP_SHOT = 112, SP_FX = 113, SP_PROBE = 114, NSLOTS = 115;
	// a unit kind's sequence: a loop for each way it faces (frames a, b), a step every 24 iterations
	var UNIT_SEQUENCE = [1, 2, -1, 3, 4, -4, 5, 6, -7, 7, 8, -10];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	var m_objSlots = new JSpriteSlots(m_objSprites, 115);
	var m_objBlank = null;		// a blank image: an enemy not seen (still there for shots)
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null, m_arrTaps = [];
	var m_intSched = 0;

	// the units: kind (255: none), place, hit points (and full), TU (and full), accuracy, weapon (1
	// rifle, 2 shotgun, 3 heavy), shots, grenades, facing (0 up 1 right 2 down 3 left), alerted,
	// seen now, name (a word), kills, carries the data (a survivor: found)
	var uk = [], ux = [], uy = [], uhp = [], umhp = [], utu = [], umtu = [], uacc = [], uwep = [], uammo = [];
	var ugren = [], ufc = [], ual = [], uvis = [], unm = [], ukl = [], uro = [];
	var occ = [];
	var ik = [], ix = [], iy = [];
	var khp = [], ktu = [], kd1 = [], kd2 = [], karm = [], krng = [], kpat = [], kpal = [], kbig = [];
	var rnm = [], racc = [], rtu = [], rhp = [], rwep = [], rkl = [], ral = [], recruits = 0;
	var bnm = [], bacc = [], btu = [], bhp = [], bwep = [], bkl = [], bal = [], brec = 0;
	var mission = 0, obj = 0, theme = 1, turn = 0, sel = 0, vx = 0, vy = 0, targets = 0, rescued = 0, lost = 0;
	var termDone = 0, boss = -1, result = 0, frames = 0, noise = 0;
	var m_intKLast = 0, m_intKRep = 0;
	// the map (a cell kind each), sight / walking tables, a line's cells, the distances
	var mp = [], blk = [], wk = [], ww = [], lx = [], ly = [], dst = [];
	// VOID STRIKE: which ships hit a shielded boss this turn
	var m_intShBits = 0, m_intShTurn = -1;
	// the screen: Layer 2's picture (-1 off) and its clip window, the fade level (8: as drawn)
	var m_intPic = -1, m_objL2Clip = { x0:0, x1:255, y0:0, y1:191 }, m_intFade = 8;
	var m_intFlashU = -1;		// the unit flashing (hit), -1 none
	var m_strMode = 'menu';		// 'menu' (a tap is Enter), 'play', 'aim'
	var m_strMsg = '';			// the message line (for the tests)
	var m_arrMsgLog = [], m_strHelp = '';
	var m_intShots = 0, m_intShotHits = 0, m_intShotChance = 0;

	// ====================================================================================================
	// THE STEPS: a routine that waits schedules its body; sLoop runs a body until it says it's done

	function sCall(fn_a)
	{
		m_intSched++;
		m_objSteps.call(fn_a);
	}

	function sWait(intN_a)
	{
		m_intSched++;
		m_objSteps.wait(intN_a);
	}

	function sUntil(fn_a)
	{
		m_intSched++;
		m_objSteps.until(fn_a);
	}

	// fnBody_a() returns true when the loop's done; the steps it schedules run before it's called again
	function sLoop(fnBody_a)
	{
		sUntil(function()
		{
			var blnDone = false;
			var blnAgain = true;
			var intWas;
			while (blnAgain)
			{
				intWas = m_intSched;
				blnDone = fnBody_a();
				blnAgain = (!blnDone) && (m_intSched === intWas);
			}
			return blnDone;
		});
	}

	// ====================================================================================================
	// SMALL THINGS

	// what this game says instead of DEMON TRANSCENDENCE's words
	function T(str_a)
	{
		var strResult = str_a;
		if (D.msgs.hasOwnProperty(str_a))
		{
			strResult = D.msgs[str_a];
		}
		return strResult;
	}

	function wd(intN_a)
	{
		var strResult = D.words[intN_a];
		if (strResult === undefined) { strResult = ''; }
		return strResult;
	}

	function num(intV_a)
	{
		return String(intV_a);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVolume_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVolume_a, intFrames_a, intNoise_a !== 0);
	}

	function imageName(strWhat_a)
	{
		return NAME + '_' + strWhat_a;
	}

	// ====================================================================================================
	// KEYS

	function isDown(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// the key pressed (the BASIC's Key()): a code (q w e a d z x c f g p u n t b y 1 2, 13, 32), 0
	// none; held, it comes again after 12 frames, then every 5. In a menu a tap is Enter
	function key()
	{
		var intC = 0;
		var intResult = 0;
		var blnL = isDown(KEY_LEFT), blnR = isDown(KEY_RIGHT), blnU = isDown(KEY_UP), blnDn = isDown(KEY_DOWN);
		if (isDown(KC_Q)) { intC = 113; }
		if (isDown(KC_W) || blnU) { intC = 119; }
		if (isDown(KC_E)) { intC = 101; }
		if (isDown(KC_A) || blnL) { intC = 97; }
		if (isDown(KC_D) || blnR) { intC = 100; }
		if (isDown(KC_Z)) { intC = 122; }
		if (isDown(KC_X) || blnDn) { intC = 120; }
		if (isDown(KC_C)) { intC = 99; }
		// (two arrows at once - the touch pad's diagonals - go that way)
		if (blnU && blnL) { intC = 113; }
		if (blnU && blnR) { intC = 101; }
		if (blnDn && blnL) { intC = 122; }
		if (blnDn && blnR) { intC = 99; }
		if (isDown(KC_F)) { intC = 102; }
		if (isDown(KC_G)) { intC = 103; }
		if (isDown(KC_P)) { intC = 112; }
		if (isDown(KC_U)) { intC = 117; }
		if (isDown(KC_N)) { intC = 110; }
		if (isDown(KC_T)) { intC = 116; }
		if (isDown(KC_B)) { intC = 98; }
		if (isDown(KC_Y)) { intC = 121; }
		if (isDown(KC_1)) { intC = 49; }
		if (isDown(KC_2)) { intC = 50; }
		if (isDown(KC_ENTER)) { intC = 13; }
		if (isDown(KC_SPACE)) { intC = 32; }
		if (intC === 0)
		{
			m_intKLast = 0;
			if ((m_strMode === 'menu') && (m_arrTaps.length > 0))
			{
				intResult = 13;
			}
		}
		else if (intC !== m_intKLast)
		{
			m_intKLast = intC;
			m_intKRep = 12;
			intResult = intC;
		}
		else
		{
			m_intKRep--;
			if (m_intKRep <= 0)
			{
				m_intKRep = 5;
				intResult = intC;
			}
		}
		return intResult;
	}

	// the way key c goes (intD_a 0: across, 1: down); 9 for not a way
	function dir(intC_a, intD_a)
	{
		var intDX = 9, intDY = 9;
		switch (intC_a)
		{
			case 113: intDX = -1; intDY = -1; break;
			case 119: intDX = 0; intDY = -1; break;
			case 101: intDX = 1; intDY = -1; break;
			case 97: intDX = -1; intDY = 0; break;
			case 100: intDX = 1; intDY = 0; break;
			case 122: intDX = -1; intDY = 1; break;
			case 120: intDX = 0; intDY = 1; break;
			case 99: intDX = 1; intDY = 1; break;
			default: break;
		}
		return (intD_a === 0) ? intDX : intDY;
	}

	// wait for Enter, Space, Y, N or B (let go first); then fnThen_a(the code)
	function waitKey(fnThen_a)
	{
		sCall(function()
		{
			var intC = 0;
			m_strMode = 'menu';
			sUntil(function() { return (key() === 0) && (m_arrTaps.length === 0); });
			sUntil(function()
			{
				intC = key();
				return (intC === 13) || (intC === 32) || (intC === 121) || (intC === 110) || (intC === 98);
			});
			sCall(function() { fnThen_a(intC); });
		});
	}

	// the tapped map cell, or null
	function tappedCell()
	{
		var objResult = null;
		var intI, intX, intY;
		for (intI = 0; intI < m_arrTaps.length; intI++)
		{
			intX = m_arrTaps[intI].x - GAMEX - 32;
			intY = m_arrTaps[intI].y - 32;
			if (m_blnMap && (intY < 160)) { intX -= wideOff(); }
			if ((intX + wideOff() >= -Math.min(m_intWL, WIDEMAX)) && (intX + wideOff() < 256 + Math.min(m_intWR, WIDEMAX)) && (intY >= 0) && (intY < 160) &&
				(vx + Math.floor(intX / 16) >= 0) && (vx + Math.floor(intX / 16) < 32))
			{
				objResult = { x:vx + Math.floor(intX / 16), y:vy + Math.floor(intY / 16) };
			}
		}
		return objResult;
	}

	// ====================================================================================================
	// THE TILEMAP: 40 x 32 cells over the whole 320 x 256 picture; the map is rows 4-23, the panel
	// 24-27. A map cell of kind k is tiles 96 + k * 4 .. + 3

	function attrOf(intT_a)
	{
		var intResult = 0;
		if (intT_a < 96)
		{
			intResult = D.attrs[String(theme)][intT_a];
		}
		return intResult;
	}

	function cls()
	{
		m_objGrid.clear(32, 0);
		m_blnMap = false;
	}

	function put(intX_a, intY_a, intT_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, attrOf(intT_a));
	}

	function fill(intY0_a, intY1_a, intT_a)
	{
		var intX, intY;
		for (intY = intY0_a; intY <= intY1_a; intY++)
		{
			for (intX = 4; intX <= 35; intX++)
			{
				put(intX, intY, intT_a);
			}
		}
	}

	// text in palette row intRow_a (0 white, 1 yellow, 2 cyan, 3 red)
	function textC(intX_a, intY_a, str_a, intRow_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intRow_a);
	}

	// the map from cell vx, vy into rows 4-23, columns 4-35
	function drawView(intVX_a, intVY_a)
	{
		var intX, intY, intT;
		for (intY = 0; intY < 10; intY++)
		{
			for (intX = 0; intX < 16; intX++)
			{
				intT = 96 + mp[(intVY_a + intY) * 32 + intVX_a + intX] * 4;
				m_objGrid.put(4 + intX * 2, 4 + intY * 2, intT, 0);
				m_objGrid.put(5 + intX * 2, 4 + intY * 2, intT + 1, 0);
				m_objGrid.put(4 + intX * 2, 5 + intY * 2, intT + 2, 0);
				m_objGrid.put(5 + intX * 2, 5 + intY * 2, intT + 3, 0);
			}
		}
		// (and the same rows all the way across, for a wide screen)
		for (intY = 0; intY < 10; intY++)
		{
			for (intX = 0; intX < 32; intX++)
			{
				wideCell(intX, intY, 96 + mp[(intVY_a + intY) * 32 + intX] * 4);
			}
		}
		m_blnMap = true;
	}

	// a wide screen's map: cell x (0-31) of the view's row y as tiles t .. t + 3
	function wideCell(intX_a, intY_a, intT_a)
	{
		m_objWide.put(intX_a * 2, intY_a * 2, intT_a, 0);
		m_objWide.put(intX_a * 2 + 1, intY_a * 2, intT_a + 1, 0);
		m_objWide.put(intX_a * 2, intY_a * 2 + 1, intT_a + 2, 0);
		m_objWide.put(intX_a * 2 + 1, intY_a * 2 + 1, intT_a + 3, 0);
	}

	// the place's tiles (each place its own cells 96-255)
	function setPlace(intPlace_a)
	{
		var intInk;
		theme = intPlace_a;
		for (intInk = 0; intInk < 4; intInk++)
		{
			m_objGrid.setImage(intInk, imageName('tiles_p' + intPlace_a + '_v' + intInk));
			m_objWide.setImage(intInk, imageName('tiles_p' + intPlace_a + '_v' + intInk));
		}
	}

	// the terminal on screen flashes (its two looks in turn) until it's used
	function blink()
	{
		var intX, intY, intT, intTX, intTY;
		if ((obj === O_TERMINAL) && (termDone === 0))
		{
			intT = ((frames & 16) !== 0) ? 96 + 4 * 24 : 96 + 4 * C_TERMINAL;
			for (intY = 0; intY <= 9; intY++)
			{
				for (intX = 0; intX <= 15; intX++)
				{
					if (mp[(vy + intY) * 32 + vx + intX] === C_TERMINAL)
					{
						intTX = 4 + intX * 2; intTY = 4 + intY * 2;
						m_objGrid.put(intTX, intTY, intT, 0); m_objGrid.put(intTX + 1, intTY, intT + 1, 0);
						m_objGrid.put(intTX, intTY + 1, intT + 2, 0); m_objGrid.put(intTX + 1, intTY + 1, intT + 3, 0);
					}
				}
			}
			// (on a wide screen too)
			for (intY = 0; intY <= 9; intY++)
			{
				for (intX = 0; intX <= 31; intX++)
				{
					if (mp[(vy + intY) * 32 + intX] === C_TERMINAL) { wideCell(intX, intY, intT); }
				}
			}
		}
	}

	// ====================================================================================================
	// THE SPRITES

	function sx(intX_a)
	{
		return 32 + (intX_a - vx) * 16 + wideOff();
	}

	// a wide screen: how far the map is drawn moved across, so the map fills the screen either side
	// (at the map's left or right end the Next's 16 columns move over instead of leaving black); 0 on
	// the Next's 256
	function wideOff()
	{
		var intL = Math.min(m_intWL, WIDEMAX), intR = Math.min(m_intWR, WIDEMAX);
		var intLo = (vx - 16) * 16 + intR, intHi = vx * 16 - intL;
		var intResult = 0;
		if ((intL > 0) || (intR > 0))
		{
			if (intLo > intHi) { intResult = Math.floor((intLo + intHi) / 2); }
			else if (intResult < intLo) { intResult = intLo; }
			else if (intResult > intHi) { intResult = intHi; }
		}
		return intResult;
	}

	function sy(intY_a)
	{
		return 32 + (intY_a - vy) * 16;
	}

	// the image a unit's slot is drawn from: its place's sheet, the flash colours while it's hit,
	// blank while the enemy isn't seen
	function unitImage(intU_a, strSheet_a)
	{
		var varResult = imageName(strSheet_a + theme);
		if ((side(intU_a) === 1) && (uvis[intU_a] === 0)) { varResult = m_objBlank; }
		else if (intU_a === m_intFlashU) { varResult = imageName(strSheet_a + theme + '_f'); }
		return varResult;
	}

	// every unit and item on its cell (off the view they're outside the clip window): a unit is its
	// kind's sprite, its loop the way it faces (the next unit half a cycle on); the big one 2 x 2
	function units()
	{
		var intU, intKd, blnBig = false;
		for (intU = 0; intU < NU; intU++)
		{
			intKd = uk[intU];
			if (intKd === 255)
			{
				m_objSlots.hide(intU);
			}
			else if (kbig[intKd] !== 0)
			{
				m_objSlots.hide(intU);
				blnBig = true;
				m_objSlots.put(SP_BIG, sx(ux[intU]), sy(uy[intU]), 'big' + intKd, undefined, unitImage(intU, 'big_p'));
				m_objSlots.animate(SP_BIG, 1);
			}
			else
			{
				m_objSlots.put(intU, sx(ux[intU]), sy(uy[intU]), 'kind' + intKd, undefined, unitImage(intU, 'units_p'));
				m_objSlots.animate(intU, (((intKd >= K_PORTAL) && (intKd <= K_ALTAR)) ? 0 : ufc[intU]) * 3 + 1 + (intU & 1));
			}
		}
		if (!blnBig) { m_objSlots.hide(SP_BIG); }
		for (intU = 0; intU < NI; intU++)
		{
			if (ik[intU] === 0) { m_objSlots.hide(SP_ITEM + intU); }
			else { m_objSlots.put(SP_ITEM + intU, sx(ix[intU]), sy(iy[intU]), 'item', ik[intU]); }
		}
	}

	// a marker on cell x, y: fx.png's frame intFx_a (outside the view it's outside the clip window)
	function mark(intN_a, intX_a, intY_a, intFx_a)
	{
		m_objSlots.put(intN_a, sx(intX_a), sy(intY_a), 'fx', intFx_a);
	}

	// the effect slot playing an effect's sequence once (a boom, sparks), on cell x, y
	function fxRun(strName_a, intX_a, intY_a)
	{
		m_objSlots.put(SP_FX, sx(intX_a), sy(intY_a), strName_a);
		m_objSlots.animate(SP_FX, 1, true);
	}

	// the shot slot looking like fx.png's frame intFx_a, flying the line's cells (lx, ly) on its own:
	// intPer_a frames a cell, then gone
	function fly(intFx_a, intN_a, intPer_a)
	{
		var arrX = lx.slice(0, intN_a), arrY = ly.slice(0, intN_a);
		if (intN_a > 0)
		{
			mark(SP_SHOT, arrX[0], arrY[0], intFx_a);
			m_objSlots.setMover(SP_SHOT, function(intS_a, objO_a)
			{
				var intI = Math.floor(objO_a.t / intPer_a);
				if (intI < arrX.length) { objO_a.x = sx(arrX[intI]); objO_a.y = sy(arrY[intI]); }
				return intI >= arrX.length;
			});
		}
	}

	// the cell the shot slot is over
	function shotCellX()
	{
		return vx + Math.round((m_objSlots.getX(SP_SHOT) - 32 - wideOff()) / 16);
	}

	function shotCellY()
	{
		return vy + Math.round((m_objSlots.getY(SP_SHOT) - 32) / 16);
	}

	// the unit (not intNot_a) that slot n touches, -1 none: the slots' own hit boxes
	function hitBy(intN_a, intNot_a)
	{
		var intResult = -1, intU;
		units();
		m_objSlots.collideRange(intN_a, 0, NU, function(intS_a, intM_a)
		{
			if ((intResult < 0) && (intM_a !== intNot_a)) { intResult = intM_a; }
			return intResult >= 0;
		});
		if ((intResult < 0) && m_objSlots.collide(intN_a, SP_BIG))
		{
			for (intU = 0; intU < NU; intU++)
			{
				if ((uk[intU] !== 255) && (kbig[uk[intU]] !== 0) && (intU !== intNot_a)) { intResult = intU; }
			}
		}
		return intResult;
	}

	// the unit standing in cell x, y: the blast probe put there, and what it touches
	function hitAt(intX_a, intY_a, intNot_a)
	{
		var intResult;
		m_objSlots.put(SP_PROBE, sx(intX_a), sy(intY_a), 'fx', 1, m_objBlank);
		intResult = hitBy(SP_PROBE, intNot_a);
		m_objSlots.hide(SP_PROBE);
		return intResult;
	}

	// ====================================================================================================
	// THE MAP'S STATE

	function cell(intX_a, intY_a)
	{
		var intResult = C_VOID;
		if ((intX_a >= 0) && (intY_a >= 0) && (intX_a < 32) && (intY_a < 24))
		{
			intResult = mp[intY_a * 32 + intX_a];
		}
		return intResult;
	}

	function who(intX_a, intY_a)
	{
		var intResult = -1;
		if ((intX_a >= 0) && (intY_a >= 0) && (intX_a < 32) && (intY_a < 24))
		{
			intResult = occ[intY_a * 32 + intX_a] - 1;
		}
		return intResult;
	}

	function unplace(intU_a)
	{
		var intC = uy[intU_a] * 32 + ux[intU_a];
		if ((intC >= 0) && (intC <= 767))
		{
			if (occ[intC] === intU_a + 1) { occ[intC] = 0; }
			if ((uk[intU_a] !== 255) && (kbig[uk[intU_a]] !== 0))
			{
				if (occ[intC + 1] === intU_a + 1) { occ[intC + 1] = 0; }
				if (occ[intC + 32] === intU_a + 1) { occ[intC + 32] = 0; }
				if (occ[intC + 33] === intU_a + 1) { occ[intC + 33] = 0; }
			}
		}
	}

	function place(intU_a, intX_a, intY_a)
	{
		unplace(intU_a);
		ux[intU_a] = intX_a; uy[intU_a] = intY_a;
		occ[intY_a * 32 + intX_a] = intU_a + 1;
		if (kbig[uk[intU_a]] !== 0)
		{
			occ[intY_a * 32 + intX_a + 1] = intU_a + 1; occ[intY_a * 32 + intX_a + 32] = intU_a + 1; occ[intY_a * 32 + intX_a + 33] = intU_a + 1;
		}
	}

	// a soldier can step there (open floor, an open door, rough ground)
	function walkable(intX_a, intY_a)
	{
		var intC = cell(intX_a, intY_a);
		return (wk[intC] !== 0) && (intC !== C_DOORH) && (intC !== C_DOORV);
	}

	function dist(intA_a, intB_a)
	{
		var intDX = Math.abs(ux[intA_a] - ux[intB_a]), intDY = Math.abs(uy[intA_a] - uy[intB_a]);
		if (kbig[uk[intB_a]] !== 0)
		{
			if (ux[intA_a] > ux[intB_a]) { intDX--; }
			if (uy[intA_a] > uy[intB_a]) { intDY--; }
		}
		return (intDX > intDY) ? intDX : intDY;
	}

	// a can see b (within 12 cells, the line clear; a big one: any of its cells)
	function sees(intA_a, intB_a)
	{
		var blnResult = false;
		if (dist(intA_a, intB_a) <= 12)
		{
			blnResult = los(ux[intA_a], uy[intA_a], ux[intB_a], uy[intB_a]);
			if ((!blnResult) && (kbig[uk[intB_a]] !== 0))
			{
				blnResult = los(ux[intA_a], uy[intA_a], ux[intB_a] + 1, uy[intB_a] + 1);
				if (!blnResult) { blnResult = los(ux[intA_a], uy[intA_a], ux[intB_a] + 1, uy[intB_a]); }
				if (!blnResult) { blnResult = los(ux[intA_a], uy[intA_a], ux[intB_a], uy[intB_a] + 1); }
			}
		}
		return blnResult;
	}

	// 0 the player's (soldiers, survivors), 1 the enemy's, -1 none
	function side(intU_a)
	{
		var intResult = 1;
		if (uk[intU_a] === 255) { intResult = -1; }
		else if ((uk[intU_a] === K_SOLDIER) || (uk[intU_a] === K_SURVIVOR)) { intResult = 0; }
		return intResult;
	}

	// which of the enemy a soldier can see now (alerted when seen)
	function seen()
	{
		var intD, intS, blnSeen;
		for (intD = 0; intD < NU; intD++)
		{
			if ((uk[intD] !== 255) && (side(intD) === 1))
			{
				uvis[intD] = 0;
				blnSeen = false;
				for (intS = 0; (intS < NU) && (!blnSeen); intS++)
				{
					if ((uk[intS] === K_SOLDIER) && sees(intS, intD))
					{
						uvis[intD] = 1; ual[intD] = 1; blnSeen = true;
					}
				}
				if ((uk[intD] >= K_PORTAL) && (uk[intD] <= K_ARCHDEMON)) { uvis[intD] = 1; }
			}
		}
	}

	// the view moved so cell x, y is well inside it; redrawn
	function look(intX_a, intY_a)
	{
		var intNX = vx, intNY = vy;
		if (intX_a < intNX + 3) { intNX = intX_a - 3; }
		if (intX_a > intNX + 12) { intNX = intX_a - 12; }
		if (intY_a < intNY + 2) { intNY = intY_a - 2; }
		if (intY_a > intNY + 7) { intNY = intY_a - 7; }
		if (intNX < 0) { intNX = 0; }
		if (intNX > 16) { intNX = 16; }
		if (intNY < 0) { intNY = 0; }
		if (intNY > 14) { intNY = 14; }
		if ((intNX !== vx) || (intNY !== vy))
		{
			vx = intNX; vy = intNY;
			drawView(vx, vy);
		}
	}

	// ====================================================================================================
	// SIGHT AND PATHS (the Next's Z80 View.Walk and View.Flow, step for step)

	function blocks(intX_a, intY_a)
	{
		return blk[cell(intX_a, intY_a)] !== 0;
	}

	// the line from x0, y0 to x1, y1 a cell at a time (Bresenham's): blnRec_a puts its cells in lx,
	// ly; returns { clear, n } - clear when nothing between blocks, and no corner squeezed past
	// diagonally between two that do; n the cells (to the end, or to the first that blocks)
	function walkLine(intX0_a, intY0_a, intX1_a, intY1_a, blnRec_a)
	{
		var intB = intX0_a, intC = intY0_a;
		var intDX = Math.abs(intX1_a - intX0_a), intSX = (intX1_a >= intX0_a) ? 1 : -1;
		var intDY = -Math.abs(intY1_a - intY0_a), intSY = (intY1_a >= intY0_a) ? 1 : -1;
		var intErr = intDX + intDY, intE2, intFlags, intN = 0;
		var intState = 0;		// 0 going, 1 clear, 2 blocked
		while (intState === 0)
		{
			if ((intB === intX1_a) && (intC === intY1_a))
			{
				intState = 1;
			}
			else
			{
				intE2 = intErr * 2;
				intFlags = 0;
				if (intE2 >= intDY)
				{
					intErr += intDY; intB += intSX; intFlags |= 1;
				}
				if (intDX >= intE2)
				{
					intErr += intDX; intC += intSY; intFlags |= 2;
				}
				if (blnRec_a && (intN < 63))
				{
					lx[intN] = intB; ly[intN] = intC; intN++;
				}
				if ((intB === intX1_a) && (intC === intY1_a))
				{
					intState = 1;
				}
				else if (blocks(intB, intC))
				{
					intState = 2;
				}
				else if ((intFlags === 3) && blocks(intB, intC - intSY) && blocks(intB - intSX, intC))
				{
					intState = 2;
				}
			}
		}
		return { clear:(intState === 1), n:intN };
	}

	function los(intX0_a, intY0_a, intX1_a, intY1_a)
	{
		return walkLine(intX0_a, intY0_a, intX1_a, intY1_a, false).clear;
	}

	function line(intX0_a, intY0_a, intX1_a, intY1_a)
	{
		return walkLine(intX0_a, intY0_a, intX1_a, intY1_a, true).n;
	}

	// distances (steps) to the nearest cell whose dst is 0 (255 the rest) through the cells the
	// enemy can walk (t 0) or a wraith can (t 1), 8 ways (a diagonal only when both cells beside it
	// are open)
	function flow(intT_a)
	{
		var arrTab = (intT_a !== 0) ? ww : wk;
		var arrQueue = [];
		var arrDirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
		var intHead = 0, intJ, intCell, intD, intX, intY, intK, intNX, intNY, intN;
		for (intJ = 0; intJ < 768; intJ++)
		{
			if (dst[intJ] === 0) { arrQueue.push(intJ); }
		}
		while (intHead < arrQueue.length)
		{
			intCell = arrQueue[intHead];
			intHead++;
			intD = dst[intCell] + 1;
			if (intD < 254)
			{
				intX = intCell & 31; intY = intCell >> 5;
				for (intK = 0; intK < 8; intK++)
				{
					intNX = intX + arrDirs[intK][0]; intNY = intY + arrDirs[intK][1];
					if ((intNX >= 0) && (intNX < 32) && (intNY >= 0) && (intNY < 24))
					{
						intN = intNY * 32 + intNX;
						if ((dst[intN] === 255) && (arrTab[mp[intN]] !== 0))
						{
							if ((arrDirs[intK][0] === 0) || (arrDirs[intK][1] === 0) ||
								((arrTab[mp[intY * 32 + intNX]] !== 0) && (arrTab[mp[intNY * 32 + intX]] !== 0)))
							{
								dst[intN] = intD;
								arrQueue.push(intN);
							}
						}
					}
				}
			}
		}
	}

	// ====================================================================================================
	// THE PANEL (rows 24-27)

	function say(str_a)
	{
		m_strMsg = str_a;
		if (str_a !== '') { m_arrMsgLog.push('T' + turn + ' ' + str_a); if (m_arrMsgLog.length > 300) { m_arrMsgLog.shift(); } }
		fill(26, 26, T_PANEL);
		textC(4, 26, str_a, 1);
	}

	function help(str_a)
	{
		m_strHelp = str_a;
		fill(25, 25, T_PANEL);
		textC(4, 25, str_a, 2);
	}

	// the picked one's name, hit points, TU, weapon and shots, grenades; the turn's line
	function panel()
	{
		var intU = sel;
		fill(24, 24, T_PANEL);
		fill(27, 27, T_PANEL);
		if (intU >= 0)
		{
			if (uk[intU] === K_SURVIVOR) { textC(4, 24, T('SURVIVOR'), 1); } else { textC(4, 24, wd(unm[intU]), 1); }
			textC(12, 24, 'HP' + num(uhp[intU]), 0);
			textC(17, 24, 'TU' + num(utu[intU]), 2);
			if (uk[intU] === K_SOLDIER)
			{
				textC(22, 24, (uwep[intU] === 1) ? T('RIF') : ((uwep[intU] === 2) ? T('SHG') : T('HVY')), 0);
				textC(25, 24, num(uammo[intU]), 0);
				put(29, 24, T_GREN);
				textC(30, 24, num(ugren[intU]), 0);
				if (uro[intU] !== 0) { textC(33, 24, T('DAT'), 1); }
			}
			textC(4, 27, T('TURN ') + num(turn) + '  ' + goal(), 2);
			help(T('MOVE F FIRE G GREN N NEXT T END'));
		}
	}

	// ====================================================================================================
	// HURTING

	// unit u takes d damage (less its armour, 1 at least) from unit by (-1: none); it flashes; at 0
	// it's gone
	function hurt(intU_a, intD_a, intBy_a)
	{
		sCall(function()
		{
			var intD = intD_a, intJ;
			if (uk[intU_a] !== 255)
			{
				intD -= karm[uk[intU_a]];
				if (intD < 1) { intD = 1; }
				uhp[intU_a] -= intD;
				if ((uvis[intU_a] !== 0) || (side(intU_a) === 0))
				{
					for (intJ = 0; intJ <= 5; intJ++)
					{
						sCall(flashStep(intU_a, (intJ & 1) === 0));
						sWait(1);
					}
				}
				sCall(function()
				{
					m_intFlashU = -1;
					if (uhp[intU_a] <= 0) { kill(intU_a, intBy_a); }
					sCall(function() { units(); });
				});
			}
		});
	}

	function flashStep(intU_a, blnOn_a)
	{
		return function()
		{
			m_intFlashU = blnOn_a ? intU_a : -1;
			units();
		};
	}

	// unit u gone: a body left (a soldier's, a survivor's) or remains (the enemy's); the big things
	// go up; the data a soldier carried falls where he was
	function kill(intU_a, intBy_a)
	{
		sCall(function()
		{
			var intKd = uk[intU_a];
			if (intBy_a >= 0) { ukl[intBy_a]++; }
			unplace(intU_a);
			uk[intU_a] = 255;
			units();
			if (intKd === K_SOLDIER)
			{
				drop(I_CORPSE, ux[intU_a], uy[intU_a]);
				if (uro[intU_a] !== 0) { drop(I_DATA, ux[intU_a], uy[intU_a]); uro[intU_a] = 0; }
				say(wd(unm[intU_a]) + T(' IS DOWN'));
				sfx(1, 600, 4, 15, 30, 0);
			}
			else if (intKd === K_SURVIVOR)
			{
				drop(I_CORPSE, ux[intU_a], uy[intU_a]);
				lost++;
				say(T('A SURVIVOR IS DEAD'));
			}
			else if (intKd >= K_PORTAL)
			{
				boom(ux[intU_a], uy[intU_a], 1);
				if (kbig[intKd] !== 0) { boom(ux[intU_a] + 1, uy[intU_a] + 1, 1); }
				sCall(function() { sfx(2, 30, 1, 14, 24, 1); });
			}
			else
			{
				drop(I_REMAINS, ux[intU_a], uy[intU_a]);
				sfx(2, 30, 1, 14, 24, 1);
			}
		});
	}

	// an item on the floor (the oldest body makes room when there's none)
	function drop(intKd_a, intX_a, intY_a)
	{
		var intF = -1, intJ;
		for (intJ = 0; (intJ < NI) && (intF < 0); intJ++)
		{
			if (ik[intJ] === 0) { intF = intJ; }
		}
		for (intJ = 0; (intJ < NI) && (intF < 0); intJ++)
		{
			if (ik[intJ] >= I_CORPSE) { intF = intJ; }
		}
		if (intF >= 0)
		{
			ik[intF] = intKd_a; ix[intF] = intX_a; iy[intF] = intY_a;
		}
	}

	// an explosion on cell x, y (big: a longer one)
	function boom(intX_a, intY_a, intBig_a)
	{
		sCall(function()
		{
			sfx(2, 20 + rnd(20), 2, 15, 20 + intBig_a * 20, 1);
			fxRun('boom', intX_a, intY_a);
			sUntil(function() { return !m_objSlots.isAnimated(SP_FX); });
			sCall(function() { m_objSlots.hide(SP_FX); });
		});
	}

	// VOID STRIKE: a 2 x 2 one's shield holds unless three different ships hit it this turn; hurt
	// otherwise (the other games: just hurt)
	function hurtShielded(intW_a, intD_a, intU_a)
	{
		sCall(function()
		{
			var intN = 0, intJ;
			var blnShielded = false;
			if (D.rules.shield && (uk[intW_a] !== 255) && (kbig[uk[intW_a]] !== 0) && (intU_a <= 5))
			{
				if (m_intShTurn !== turn) { m_intShBits = 0; m_intShTurn = turn; }
				m_intShBits |= (1 << intU_a);
				for (intJ = 0; intJ <= 5; intJ++)
				{
					if ((m_intShBits & (1 << intJ)) !== 0) { intN++; }
				}
				if (intN >= 3)
				{
					if (intN === 3) { say(D.rules.shieldmsgs[0]); }
				}
				else
				{
					blnShielded = true;
					mark(SP_FX, ux[intW_a] + 1, uy[intW_a], FX_SPARKFLASH);
					sfx(1, 900, -20, 12, 8, 0);
					say((intN === 1) ? D.rules.shieldmsgs[1] : D.rules.shieldmsgs[2]);
					sWait(8);
					sCall(function() { m_objSlots.hide(SP_FX); });
				}
			}
			if (!blnShielded)
			{
				hurt(intW_a, intD_a, intU_a);
			}
		});
	}

	// ====================================================================================================
	// THE PLAYER'S TURN (the BASIC's Tac)

	var m_intEndAsk = 0, m_intCX = 0, m_intCY = 0;

	// until the turn is ended (T twice) or the mission's over
	function tacPlay()
	{
		sCall(function()
		{
			var blnPost = false;
			var blnDone = false;
			help(T("THE SQUAD'S TURN"));
			sel = next0(sel - 1);
			if (sel < 0)
			{
				result = 2;
			}
			else
			{
				look(ux[sel], uy[sel]);
				panel();
				say(T('YOUR TURN'));
				m_intEndAsk = 0;
				m_strMode = 'play';
				sUntil(function()
				{
					var intC, intDX, intDY, intWas, objCell;
					// what follows a key (after the steps it started): the mission's end, the picked one gone
					if (blnPost)
					{
						blnPost = false;
						check();
						if (result !== 0) { blnDone = true; }
						else
						{
							if (uk[sel] === 255) { sel = next0(sel); panel(); }
							if (sel < 0) { result = 2; blnDone = true; }
						}
					}
					if (!blnDone)
					{
						m_strMode = 'play';
						if ((frames & 15) === 0) { blink(); }
						intC = key();
						objCell = tappedCell();
						intWas = m_intSched;
						if ((intC === 0) && (objCell !== null))
						{
							playTap(objCell);
							blnPost = true;
						}
						else if (intC !== 0)
						{
							intDX = dir(intC, 0); intDY = dir(intC, 1);
							if (intC !== 116) { m_intEndAsk = 0; }
							if (intDX !== 9)
							{
								walk(sel, intDX, intDY);
							}
							else
							{
								switch (intC)
								{
									case 110:
										sel = next0(sel);
										look(ux[sel], uy[sel]);
										panel();
										break;
									case 102:
										if (uk[sel] === K_SOLDIER) { aim(0, -1, -1); } else { say(T("SURVIVORS DON'T SHOOT")); }
										break;
									case 103:
										if (uk[sel] === K_SOLDIER) { aim(1, -1, -1); } else { say(T("SURVIVORS DON'T THROW")); }
										break;
									case 112:
										pickUp(sel);
										break;
									case 117:
										useIt(sel);
										break;
									case 116:
										if (m_intEndAsk !== 0)
										{
											m_objSlots.hide(SP_CURSOR);
											blnDone = true;
										}
										else
										{
											m_intEndAsk = 1;
											say(T('T AGAIN ENDS THE TURN'));
										}
										break;
									default:
										break;
								}
							}
							if (!blnDone) { blnPost = true; }
						}
						if (blnPost && (m_intSched === intWas))
						{
							// nothing started: the checks now
							blnPost = false;
							check();
							if (result !== 0) { blnDone = true; }
							else
							{
								if (uk[sel] === 255) { sel = next0(sel); panel(); }
								if (sel < 0) { result = 2; blnDone = true; }
							}
						}
					}
					if ((!blnDone) && (m_intSched === intWas))
					{
						units();
						m_objSlots.put(SP_CURSOR, sx(ux[sel]), sy(uy[sel]), 'cursor');
						m_objSlots.animate(SP_CURSOR, 1);
					}
					if (blnDone)
					{
						m_objSlots.hide(SP_CURSOR);
						m_strMode = 'menu';
					}
					return blnDone;
				});
			}
		});
	}

	// a tap on the map in the squad's turn: one of yours picks him; next to the picked one steps
	// there; one of the enemy you see aims at it
	function playTap(objCell_a)
	{
		var intW = who(objCell_a.x, objCell_a.y);
		var intDX = objCell_a.x - ux[sel], intDY = objCell_a.y - uy[sel];
		if ((intW >= 0) && (side(intW) === 0) && ((uk[intW] === K_SOLDIER) || (D.rules.found === 'none') || (uro[intW] !== 0)))
		{
			sel = intW;
			panel();
		}
		else if ((Math.abs(intDX) <= 1) && (Math.abs(intDY) <= 1) && ((intDX !== 0) || (intDY !== 0)))
		{
			m_intEndAsk = 0;
			walk(sel, intDX, intDY);
		}
		else if ((intW >= 0) && (side(intW) === 1) && (uvis[intW] !== 0) && (uk[sel] === K_SOLDIER))
		{
			m_intEndAsk = 0;
			aim(0, objCell_a.x, objCell_a.y);
		}
	}

	// the next soldier or survivor after unit u (round), those with TU first; -1 none left
	function next0(intU_a)
	{
		var intResult = -1, intJ, intV, intX;
		var blnGot = false;
		for (intJ = 1; (intJ <= NU) && (!blnGot); intJ++)
		{
			intV = (intU_a + intJ + NU) % NU;
			if ((D.rules.found === 'next') && (uk[intV] === K_SURVIVOR) && (uro[intV] === 0))
			{
				for (intX = 0; intX <= 5; intX++)
				{
					if ((uro[intV] === 0) && (uk[intX] === K_SOLDIER) && sees(intX, intV)) { uro[intV] = 1; }
				}
			}
			if ((uk[intV] === K_SOLDIER) || ((uk[intV] === K_SURVIVOR) && ((D.rules.found === 'none') || (uro[intV] !== 0))))
			{
				if (intResult < 0) { intResult = intV; }
				if (utu[intV] >= TU_STEP) { intResult = intV; blnGot = true; }
			}
		}
		return intResult;
	}

	// a step (or a closed door opened); TU spent
	function walk(intU_a, intDX_a, intDY_a)
	{
		var intNX = ux[intU_a] + intDX_a, intNY = uy[intU_a] + intDY_a;
		var intC = cell(intNX, intNY);
		var intCost, intWas;
		if ((intDX_a === 0) && (intDY_a === -1)) { ufc[intU_a] = 0; }
		if ((intDX_a === 1) && (intDY_a === 0)) { ufc[intU_a] = 1; }
		if ((intDX_a === 0) && (intDY_a === 1)) { ufc[intU_a] = 2; }
		if ((intDX_a === -1) && (intDY_a === 0)) { ufc[intU_a] = 3; }
		if ((intC === C_DOORH) || (intC === C_DOORV))
		{
			if (utu[intU_a] < TU_DOOR)
			{
				say(T('NOT ENOUGH TU'));
			}
			else
			{
				utu[intU_a] -= TU_DOOR;
				mp[intNY * 32 + intNX] = intC + 1;
				drawView(vx, vy);
				sfx(0, 300, 6, 12, 10, 0);
				say(T('DOOR OPEN'));
				seen();
				panel();
			}
		}
		else if (!walkable(intNX, intNY))
		{
			say(T('BLOCKED'));
		}
		else if (who(intNX, intNY) >= 0)
		{
			say(T('SOMEONE IS THERE'));
		}
		else if ((intDX_a !== 0) && (intDY_a !== 0) && ((!walkable(ux[intU_a] + intDX_a, uy[intU_a])) || (!walkable(ux[intU_a], uy[intU_a] + intDY_a))))
		{
			say(T('NO WAY ROUND THE CORNER'));
		}
		else
		{
			intCost = ((intDX_a !== 0) && (intDY_a !== 0)) ? TU_DIAG : TU_STEP;
			if (intC === C_ROUGH) { intCost *= 2; }
			if (utu[intU_a] < intCost)
			{
				say(T('NOT ENOUGH TU'));
			}
			else
			{
				utu[intU_a] -= intCost;
				place(intU_a, intNX, intNY);
				sfx(0, 900 + rnd(200), 0, 6, 2, 1);
				intWas = spotted();
				seen();
				if (spotted() > intWas)
				{
					say(T('DEMON SPOTTED!'));
					sfx(1, 120, -2, 14, 20, 0);
				}
				// a survivor on the exit: out
				if ((uk[intU_a] === K_SURVIVOR) && (intC === C_EXIT))
				{
					unplace(intU_a);
					uk[intU_a] = 255;
					rescued++;
					say(T('A SURVIVOR IS OUT'));
					sel = next0(intU_a);
				}
				if (sel >= 0) { look(ux[sel], uy[sel]); }
				panel();
			}
		}
	}

	// how many of the enemy are seen now (WITCH COVENS: a soldier finds the survivors he sees)
	function spotted()
	{
		var intN = 0, intJ, intS;
		for (intJ = 0; intJ < NU; intJ++)
		{
			if ((D.rules.found === 'spotted') && (uk[intJ] === K_SURVIVOR) && (uro[intJ] === 0))
			{
				for (intS = 0; intS <= 5; intS++)
				{
					if ((uro[intJ] === 0) && (uk[intS] === K_SOLDIER) && sees(intS, intJ))
					{
						uro[intJ] = 1;
						say(D.rules.foundmsg);
					}
				}
			}
			if ((side(intJ) === 1) && (uvis[intJ] !== 0) && (uk[intJ] < K_PORTAL)) { intN++; }
		}
		return intN;
	}

	// what's on the floor under u
	function pickUp(intU_a)
	{
		var intJ, blnDone = false;
		for (intJ = 0; (intJ < NI) && (!blnDone); intJ++)
		{
			if ((ik[intJ] >= I_MEDKIT) && (ik[intJ] <= I_DATA) && (ix[intJ] === ux[intU_a]) && (iy[intJ] === uy[intU_a]))
			{
				blnDone = true;
				if (utu[intU_a] < TU_PICK)
				{
					say(T('NOT ENOUGH TU'));
				}
				else if ((uk[intU_a] === K_SURVIVOR) && (ik[intJ] !== I_MEDKIT))
				{
					say(T("SURVIVORS CAN'T USE THAT"));
				}
				else
				{
					utu[intU_a] -= TU_PICK;
					switch (ik[intJ])
					{
						case I_MEDKIT:
							uhp[intU_a] += 6;
							if (uhp[intU_a] > umhp[intU_a]) { uhp[intU_a] = umhp[intU_a]; }
							say(T('MEDKIT: HP ') + num(uhp[intU_a]));
							break;
						case I_AMMO:
							uammo[intU_a] += (uwep[intU_a] === 2) ? 12 : ((uwep[intU_a] === 3) ? 15 : 20);
							say(T('AMMUNITION'));
							break;
						case I_GRENADES:
							ugren[intU_a] += 2;
							say(T('TWO GRENADES'));
							break;
						default:
							uro[intU_a] = 1;
							say(T('THE DATA - GET IT TO THE EXIT'));
							break;
					}
					ik[intJ] = 0;
					sfx(0, 150, -4, 12, 8, 0);
					panel();
				}
			}
		}
		if (!blnDone) { say(T('NOTHING HERE')); }
	}

	// the terminal next to u (the logs downloaded: u carries the data)
	function useIt(intU_a)
	{
		var intDX, intDY, blnDone = false;
		for (intDY = -1; (intDY <= 1) && (!blnDone); intDY++)
		{
			for (intDX = -1; (intDX <= 1) && (!blnDone); intDX++)
			{
				if (cell(ux[intU_a] + intDX, uy[intU_a] + intDY) === C_TERMINAL)
				{
					blnDone = true;
					if (termDone !== 0) { say(T('THE LOGS ARE TAKEN')); }
					else if (uk[intU_a] !== K_SOLDIER) { say(T("A SOLDIER'S JOB")); }
					else if (utu[intU_a] < TU_USE) { say(T('NOT ENOUGH TU')); }
					else
					{
						utu[intU_a] -= TU_USE;
						termDone = 1; uro[intU_a] = 1;
						say(T('LOGS DOWNLOADED - TO THE EXIT'));
						sfx(0, 100, 2, 13, 30, 0);
						panel();
					}
				}
			}
		}
		if (!blnDone) { say(T('NOTHING TO USE HERE')); }
	}

	// out of ammunition: the one of the enemy next to soldier u (-1 none) ...
	function meleeTarget(intU_a)
	{
		var intT = -1, intJ, intW;
		for (intJ = 0; intJ <= 8; intJ++)
		{
			intW = who(ux[intU_a] + (intJ % 3) - 1, uy[intU_a] + Math.floor(intJ / 3) - 1);
			if ((intW >= 0) && (side(intW) === 1)) { intT = intW; }
		}
		return intT;
	}

	// ... struck with the rifle butt (a snap shot's TU, 3 in 4 hit, 3-5 less armour)
	function melee(intU_a, intT_a)
	{
		sCall(function()
		{
			if (utu[intU_a] < cost(intU_a, 1))
			{
				say(T('NOT ENOUGH TU'));
			}
			else
			{
				utu[intU_a] -= cost(intU_a, 1);
				face(intU_a, ux[intT_a], uy[intT_a]);
				units();
				sfx(1, 300, 6, 13, 6, 1);
				if (rnd(4) < 3)
				{
					say(wd(unm[intU_a]) + T(' STRIKES'));
					hurtShielded(intT_a, 3 + rnd(3), intU_a);
				}
				else
				{
					say(wd(unm[intU_a]) + T(' MISSES'));
				}
				sCall(panel);
			}
		});
	}

	// the target cursor (g 1: where a grenade goes) - moved with the eight ways, N the next one
	// seen; 1 a snap shot, 2 an aimed one (G throws); F (or B) back. intX_a, intY_a: where it starts
	// (-1: the nearest seen)
	function aim(intG_a, intX_a, intY_a)
	{
		sCall(function()
		{
			var intT, intMT;
			var blnAfter = false, blnDone = false;
			if ((intG_a === 0) && (uammo[sel] === 0))
			{
				intMT = meleeTarget(sel);
				if (intMT < 0) { say(T('NO AMMUNITION')); } else { melee(sel, intMT); }
			}
			else if ((intG_a === 1) && (ugren[sel] === 0))
			{
				say(T('NO GRENADES'));
			}
			else
			{
				intT = nearSeen(sel, -1);
				if (intX_a >= 0)
				{
					m_intCX = intX_a; m_intCY = intY_a;
				}
				else if (intT >= 0)
				{
					m_intCX = ux[intT]; m_intCY = uy[intT];
				}
				else
				{
					// none in sight: three cells the way he faces
					m_intCX = ux[sel]; m_intCY = uy[sel];
					switch (ufc[sel])
					{
						case 0: m_intCY -= 3; break;
						case 1: m_intCX += 3; break;
						case 2: m_intCY += 3; break;
						default: m_intCX -= 3; break;
					}
					clampCursor();
				}
				look(m_intCX, m_intCY);
				aimInfo(intG_a);
				m_strMode = 'aim';
				sUntil(function()
				{
					var intC, intDX, intDY, intD, objCell;
					if (blnAfter)
					{
						blnAfter = false;
						if ((uammo[sel] === 0) || (uk[sel] === 255) || (result !== 0))
						{
							blnDone = true;
						}
						else
						{
							check();
							if (result !== 0) { blnDone = true; }
						}
						aimInfo(intG_a);
					}
					if (!blnDone)
					{
						m_strMode = 'aim';
						intC = key();
						objCell = tappedCell();
						if ((intC === 0) && (objCell !== null))
						{
							m_intCX = objCell.x; m_intCY = objCell.y;
							clampCursor();
							aimInfo(intG_a);
						}
						dirKey(intC);
					}
					function dirKey(intC_a)
					{
						intDX = dir(intC_a, 0); intDY = dir(intC_a, 1);
						if (intC_a === 0)
						{
							intDX = 9;
						}
						else if (intDX !== 9)
						{
							m_intCX += intDX; m_intCY += intDY;
							clampCursor();
							look(m_intCX, m_intCY);
							aimInfo(intG_a);
						}
						else if (intC_a === 110)
						{
							intT = nearSeen(sel, who(m_intCX, m_intCY));
							if (intT >= 0) { m_intCX = ux[intT]; m_intCY = uy[intT]; look(m_intCX, m_intCY); }
							aimInfo(intG_a);
						}
						else if ((intC_a === 102) || (intC_a === 98))
						{
							blnDone = true;
						}
						else if ((intG_a === 0) && ((intC_a === 49) || (intC_a === 50)))
						{
							if ((m_intCX === ux[sel]) && (m_intCY === uy[sel])) { say(T('NOT AT YOURSELF')); }
							else if (utu[sel] < cost(sel, intC_a - 48)) { say(T('NOT ENOUGH TU')); }
							else
							{
								shoot(sel, m_intCX, m_intCY, intC_a - 48);
								blnAfter = true;
							}
						}
						else if ((intG_a === 1) && ((intC_a === 103) || (intC_a === 13)))
						{
							intD = Math.abs(m_intCX - ux[sel]);
							if (Math.abs(m_intCY - uy[sel]) > intD) { intD = Math.abs(m_intCY - uy[sel]); }
							if (intD > 8) { say(T('TOO FAR TO THROW')); }
							else if (!los(ux[sel], uy[sel], m_intCX, m_intCY)) { say(T('NO CLEAR THROW')); }
							else if (utu[sel] < TU_GREN) { say(T('NOT ENOUGH TU')); }
							else
							{
								throwGrenade(sel, m_intCX, m_intCY);
								blnDone = true;
							}
						}
					}
					if (blnDone)
					{
						m_objSlots.hide(SP_TARGET);
						if ((sel >= 0) && (uk[sel] !== 255)) { sCall(function() { look(ux[sel], uy[sel]); panel(); }); }
						else { sCall(panel); }
						m_strMode = 'play';
					}
					else
					{
						units();
						mark(SP_TARGET, m_intCX, m_intCY, FX_TARGET);
					}
					return blnDone;
				});
			}
		});
	}

	function clampCursor()
	{
		if (m_intCX < 0) { m_intCX = 0; }
		if (m_intCY < 0) { m_intCY = 0; }
		if (m_intCX > 31) { m_intCX = 31; }
		if (m_intCY > 23) { m_intCY = 23; }
	}

	// the help line for the target cursor: the chances and costs
	function aimInfo(intG_a)
	{
		if (intG_a !== 0)
		{
			help(T('G THROW (') + num(TU_GREN) + T('TU)  F BACK'));
		}
		else
		{
			help(T('1 SNAP ') + num(chance(sel, m_intCX, m_intCY, 1)) + T('% 2 AIM ') + num(chance(sel, m_intCX, m_intCY, 2)) + T('% F BACK'));
		}
	}

	// a shot's TU (m 1 snap, 2 aimed; the heavy gun 4 more)
	function cost(intU_a, intM_a)
	{
		var intResult = (intM_a === 1) ? TU_SNAP : TU_AIM;
		if (uwep[intU_a] === 3) { intResult += 4; }
		return intResult;
	}

	// the chance (5-95%) u hits x, y: his aim, the weapon and the mode, less 2% a cell; a big target
	// is easier
	function chance(intU_a, intX_a, intY_a, intM_a)
	{
		var intC, intW;
		var intD = Math.abs(intX_a - ux[intU_a]);
		if (Math.abs(intY_a - uy[intU_a]) > intD) { intD = Math.abs(intY_a - uy[intU_a]); }
		if (uwep[intU_a] === 2) { intC = (intM_a === 1) ? 80 : 100; }
		else if (uwep[intU_a] === 3) { intC = (intM_a === 1) ? 50 : 115; }
		else { intC = (intM_a === 1) ? 60 : 100; }
		intC = Math.floor(uacc[intU_a] * intC / 100) - intD * 2;
		if ((uwep[intU_a] === 2) && (intD > 6)) { intC -= (intD - 6) * 6; }
		intW = who(intX_a, intY_a);
		if ((intW >= 0) && (kbig[uk[intW]] !== 0)) { intC += 15; }
		if (!los(ux[intU_a], uy[intU_a], intX_a, intY_a)) { intC = Math.floor(intC / 3); }
		if (intC < 5) { intC = 5; }
		if (intC > 95) { intC = 95; }
		return intC;
	}

	// unit u fires at cell x, y (m 1 snap, 2 aimed): the shot flies its line a cell a frame; it hits
	// the target (its chance), or flies wide - and hits whatever it meets first, a friend too
	function shoot(intU_a, intX_a, intY_a, intM_a)
	{
		sCall(function()
		{
			var blnHit, intEX = intX_a, intEY = intY_a, intN, intJ = -1, intW = -1, blnStop = false;
			utu[intU_a] -= cost(intU_a, intM_a);
			uammo[intU_a]--;
			face(intU_a, intX_a, intY_a);
			noise = 1;
			blnHit = rnd(100) < chance(intU_a, intX_a, intY_a, intM_a);
			m_intShots++; m_intShotChance += chance(intU_a, intX_a, intY_a, intM_a); if (blnHit) { m_intShotHits++; }
			if (!blnHit)
			{
				intEX = intX_a + rnd(5) - 2; intEY = intY_a + rnd(5) - 2;
				if ((intEX === ux[intU_a]) && (intEY === uy[intU_a])) { intEX = intX_a; intEY = intY_a; }
				if (intEX < 0) { intEX = 0; }
				if (intEY < 0) { intEY = 0; }
				if (intEX > 31) { intEX = 31; }
				if (intEY > 23) { intEY = 23; }
			}
			if (uwep[intU_a] === 2) { sfx(2, 18, 2, 15, 12, 1); }
			else if (uwep[intU_a] === 3) { sfx(2, 10, 1, 15, 16, 1); }
			else { sfx(2, 25, 3, 14, 8, 1); }
			units();
			mark(SP_FX, ux[intU_a], uy[intU_a], FX_FLASH);
			intN = line(ux[intU_a], uy[intU_a], intEX, intEY);
			// the shot flies its line a cell a frame on its own; each frame: what does it touch?
			fly(FX_TRACER, intN, 1);
			sUntil(function()
			{
				var blnDone = false;
				// (the first frame: the flash and the shot in its first cell seen; then a cell a frame)
				if (intJ === 0) { m_objSlots.hide(SP_FX); }
				if ((intN > 0) && (intJ >= 0))
				{
					intW = hitBy(SP_SHOT, intU_a);
					if (intW >= 0)
					{
						if ((shotCellX() === intX_a) && (shotCellY() === intY_a) && blnHit) { blnStop = true; }
						else if (rnd(100) < 40) { blnStop = true; }
						else { intW = -1; }
					}
				}
				intJ++;
				if ((intJ > 0) && (blnStop || (intJ >= intN)))
				{
					m_objSlots.hide(SP_SHOT);
					blnDone = true;
				}
				return blnDone;
			});
			sCall(function()
			{
				var intD, intDmg;
				if (intW >= 0)
				{
					intD = Math.abs(ux[intW] - ux[intU_a]);
					if (Math.abs(uy[intW] - uy[intU_a]) > intD) { intD = Math.abs(uy[intW] - uy[intU_a]); }
					if (uwep[intU_a] === 2)
					{
						intDmg = 5 + rnd(5);
						if (intD > 4) { intDmg = Math.floor(intDmg / 2); }
					}
					else if (uwep[intU_a] === 3) { intDmg = 6 + rnd(5); }
					else { intDmg = 3 + rnd(4); }
					mark(SP_FX, ux[intW], uy[intW], FX_SPARK);
					hurtShielded(intW, intDmg, intU_a);
					sCall(function() { m_objSlots.hide(SP_FX); shotDone(intU_a); });
				}
				else if (intN > 0)
				{
					fxRun('sparkacid', lx[intN - 1], ly[intN - 1]);
					sUntil(function() { return !m_objSlots.isAnimated(SP_FX); });
					sCall(function()
					{
						m_objSlots.hide(SP_FX);
						if (!blnHit) { say(T('MISSED')); }
						shotDone(intU_a);
					});
				}
				else
				{
					shotDone(intU_a);
				}
			});
		});
	}

	function shotDone(intU_a)
	{
		if (sel === intU_a) { panel(); }
		seen();
		units();
	}

	// a grenade to x, y - everything in the 3 x 3 round it hurt
	function throwGrenade(intU_a, intX_a, intY_a)
	{
		sCall(function()
		{
			var intN, intJ = 0, intX = intX_a, intY = intY_a;
			utu[intU_a] -= TU_GREN;
			ugren[intU_a]--;
			face(intU_a, intX_a, intY_a);
			noise = 1;
			intN = line(ux[intU_a], uy[intU_a], intX_a, intY_a);
			units();
			// the grenade flies its line on its own, two frames a cell
			fly(FX_GRENADE, intN, 2);
			sUntil(function() { return !m_objSlots.hasMover(SP_SHOT); });
			sCall(function()
			{
				var intK = 0;
				m_objSlots.hide(SP_SHOT);
				if (intN > 0) { intX = lx[intN - 1]; intY = ly[intN - 1]; }
				boom(intX, intY, 1);
				// the 3 x 3 round it: what stands in each cell (the blast probe's collision)
				sLoop(function()
				{
					var intW;
					if (intK < 9)
					{
						intW = hitAt(intX + (intK % 3) - 1, intY + Math.floor(intK / 3) - 1, -1);
						if (intW >= 0) { hurtShielded(intW, 5 + rnd(5), intU_a); }
						intK++;
					}
					return intK >= 9;
				});
				sCall(function() { panel(); seen(); units(); });
			});
		});
	}

	// unit u turned towards cell x, y
	function face(intU_a, intX_a, intY_a)
	{
		var intDX = intX_a - ux[intU_a], intDY = intY_a - uy[intU_a];
		if (Math.abs(intDX) > Math.abs(intDY))
		{
			ufc[intU_a] = (intDX > 0) ? 1 : 3;
		}
		else
		{
			ufc[intU_a] = (intDY > 0) ? 2 : 0;
		}
	}

	// the one of the enemy seen from u next in order of distance after unit "after" (-1: the
	// nearest; round to the nearest again after the farthest); -1 none seen
	function nearSeen(intU_a, intAfter_a)
	{
		var intResult = -1, intNB = -1, intAD = -1, intBD = 32767, intND = 32767, intJ, intD;
		if ((intAfter_a >= 0) && (uk[intAfter_a] !== 255)) { intAD = dist(intU_a, intAfter_a) * 64 + intAfter_a; }
		for (intJ = 0; intJ < NU; intJ++)
		{
			if ((side(intJ) === 1) && (uvis[intJ] !== 0))
			{
				intD = dist(intU_a, intJ) * 64 + intJ;
				if ((intD > intAD) && (intD < intBD)) { intBD = intD; intResult = intJ; }
				if (intD < intND) { intND = intD; intNB = intJ; }
			}
		}
		if (intResult < 0) { intResult = intNB; }
		return intResult;
	}

	// enemy d just moved - every soldier who sees it (10 cells at most), with a snap shot's TU left
	// and shots, fires at it
	function react(intD_a)
	{
		sCall(function()
		{
			var intS = 0;
			sLoop(function()
			{
				if (intS <= 5)
				{
					if ((uk[intS] === K_SOLDIER) && (uk[intD_a] !== 255) && (utu[intS] >= cost(intS, 1)) && (uammo[intS] > 0) &&
						(dist(intS, intD_a) <= 10) && sees(intS, intD_a))
					{
						look(ux[intD_a], uy[intD_a]);
						say(wd(unm[intS]) + T(' FIRES!'));
						shoot(intS, ux[intD_a], uy[intD_a], 1);
					}
					intS++;
				}
				return intS > 5;
			});
		});
	}

	// ====================================================================================================
	// THE ENEMY'S TURN (the BASIC's Ai)

	// every one's move, then the things'
	function aiPlay()
	{
		sCall(function()
		{
			var intD, intS, blnWr = false, blnStop = false, blnPend = false, blnAl;
			m_objSlots.hide(SP_CURSOR);
			help(T("THE DEMONS' TURN"));
			say('');
			// who knows where the squad is: seen, near, or a shot heard close
			for (intD = 0; intD < NU; intD++)
			{
				if ((side(intD) === 1) && (uk[intD] < K_PORTAL))
				{
					utu[intD] = umtu[intD];
					if (ual[intD] === 0)
					{
						blnAl = false;
						for (intS = 0; (intS < NU) && (!blnAl); intS++)
						{
							if (prey(intS) && ((dist(intD, intS) <= 6) || ((noise !== 0) && (dist(intD, intS) <= 10))))
							{
								ual[intD] = 1; blnAl = true;
							}
						}
					}
					if (uk[intD] === K_WRAITH) { blnWr = true; }
				}
			}
			noise = 0;
			for (intD = 0; intD < NU; intD++)
			{
				if ((uk[intD] === K_SURVIVOR) && (uro[intD] === 0))
				{
					for (intS = 0; intS <= 5; intS++)
					{
						if ((uro[intD] === 0) && (uk[intS] === K_SOLDIER) && sees(intS, intD)) { uro[intD] = 1; }
					}
				}
			}
			flows(0);
			intD = 0;
			sLoop(function()
			{
				var blnDone = false;
				if (blnPend)
				{
					blnPend = false;
					check();
					if (result !== 0) { blnDone = true; blnStop = true; }
				}
				if (!blnDone)
				{
					if (intD >= NU)
					{
						blnDone = true;
					}
					else
					{
						if ((uk[intD] !== 255) && (uk[intD] < K_PORTAL) && (uk[intD] !== K_WRAITH) && (side(intD) === 1) && (ual[intD] !== 0))
						{
							move(intD);
						}
						blnPend = true;
						intD++;
					}
				}
				return blnDone;
			});
			sCall(function()
			{
				if ((!blnStop) && blnWr)
				{
					flows(1);
					intD = 0;
					sLoop(function()
					{
						var blnDone = false;
						if (blnPend)
						{
							blnPend = false;
							check();
							if (result !== 0) { blnDone = true; blnStop = true; }
						}
						if (!blnDone)
						{
							if (intD >= NU) { blnDone = true; }
							else
							{
								if ((uk[intD] === K_WRAITH) && (ual[intD] !== 0)) { move(intD); }
								blnPend = true;
								intD++;
							}
						}
						return blnDone;
					});
				}
			});
			sCall(function()
			{
				if (!blnStop)
				{
					intD = 0;
					sLoop(function()
					{
						var blnDone = false;
						if (blnPend)
						{
							blnPend = false;
							check();
							if (result !== 0) { blnDone = true; blnStop = true; }
						}
						if (!blnDone)
						{
							if (intD >= NU) { blnDone = true; }
							else
							{
								if ((uk[intD] === K_PORTAL) || (uk[intD] === K_NEST))
								{
									if ((turn + intD) % 3 === 0) { spawn(intD); }
								}
								else if ((uk[intD] === K_GATEKEEPER) || (uk[intD] === K_ARCHDEMON))
								{
									bossAct(intD);
								}
								blnPend = true;
								intD++;
							}
						}
						return blnDone;
					});
				}
			});
			sCall(function()
			{
				if (!blnStop) { seen(); units(); }
			});
		});
	}

	// the distances to the nearest soldier or found survivor (t 1: a wraith's - through walls)
	function flows(intT_a)
	{
		var intJ;
		for (intJ = 0; intJ < 768; intJ++) { dst[intJ] = 255; }
		for (intJ = 0; intJ < NU; intJ++)
		{
			if (prey(intJ)) { dst[uy[intJ] * 32 + ux[intJ]] = 0; }
		}
		flow(intT_a);
	}

	// one the enemy goes for: a soldier, or a survivor the squad has found
	function prey(intJ_a)
	{
		return (side(intJ_a) === 0) && ((uk[intJ_a] !== K_SURVIVOR) || (uro[intJ_a] !== 0));
	}

	function pass(intD_a, intX_a, intY_a)
	{
		var intC = cell(intX_a, intY_a);
		return (uk[intD_a] === K_WRAITH) ? (ww[intC] !== 0) : (wk[intC] !== 0);
	}

	// d spends its TU - a claw at one next to it, a spit at one it sees (a spitter), else a step nearer
	function move(intD_a)
	{
		sCall(function()
		{
			var intKd = uk[intD_a], intGuard = 0, blnPend = false;
			sLoop(function()
			{
				var blnDone = false;
				var intT, intBest, intBX, intBY, intDX, intDY, intNX, intNY, intC, intV, intCost;
				if (blnPend)
				{
					blnPend = false;
					check();
					if (result !== 0) { blnDone = true; }
				}
				if (!blnDone)
				{
					if (uk[intD_a] === 255) { blnDone = true; }
					else
					{
						intGuard++;
						if (intGuard > 40) { blnDone = true; }
					}
				}
				if (!blnDone)
				{
					intT = adjacent(intD_a);
					if (intT >= 0)
					{
						if (utu[intD_a] < TU_HIT) { blnDone = true; }
						else
						{
							utu[intD_a] -= TU_HIT;
							claw(intD_a, intT);
							blnPend = true;
						}
					}
					else if ((intKd === K_SPITTER) && (utu[intD_a] >= 10) && (target(intD_a) >= 0))
					{
						utu[intD_a] -= 10;
						spit(intD_a, target(intD_a));
						blnPend = true;
					}
					else
					{
						// a step down the distances
						intBest = dst[uy[intD_a] * 32 + ux[intD_a]];
						intBX = 0; intBY = 0;
						for (intDY = -1; intDY <= 1; intDY++)
						{
							for (intDX = -1; intDX <= 1; intDX++)
							{
								intNX = ux[intD_a] + intDX; intNY = uy[intD_a] + intDY;
								if (((intDX !== 0) || (intDY !== 0)) && (intNX >= 0) && (intNY >= 0) && (intNX < 32) && (intNY < 24))
								{
									intV = dst[intNY * 32 + intNX];
									if ((intV < intBest) && (who(intNX, intNY) < 0))
									{
										if ((intDX !== 0) && (intDY !== 0))
										{
											if (pass(intD_a, ux[intD_a] + intDX, uy[intD_a]) && pass(intD_a, ux[intD_a], uy[intD_a] + intDY))
											{
												intBest = intV; intBX = intDX; intBY = intDY;
											}
										}
										else
										{
											intBest = intV; intBX = intDX; intBY = intDY;
										}
									}
								}
							}
						}
						if ((intBX === 0) && (intBY === 0))
						{
							blnDone = true;
						}
						else
						{
							intNX = ux[intD_a] + intBX; intNY = uy[intD_a] + intBY;
							intC = cell(intNX, intNY);
							if (((intC === C_DOORH) || (intC === C_DOORV)) && (intKd !== K_WRAITH))
							{
								// a closed door: opened (it stays)
								if (utu[intD_a] < TU_DOOR) { blnDone = true; }
								else
								{
									utu[intD_a] -= TU_DOOR;
									mp[intNY * 32 + intNX] = intC + 1;
									drawView(vx, vy);
									seen();
								}
							}
							else
							{
								intCost = ((intBX !== 0) && (intBY !== 0)) ? TU_DIAG : TU_STEP;
								if (intC === C_ROUGH) { intCost *= 2; }
								if (utu[intD_a] < intCost) { blnDone = true; }
								else
								{
									utu[intD_a] -= intCost;
									face(intD_a, intNX, intNY);
									place(intD_a, intNX, intNY);
									seen();
									if (uvis[intD_a] !== 0)
									{
										look(ux[intD_a], uy[intD_a]);
										units();
										sWait(3);
									}
									react(intD_a);
									blnPend = true;
								}
							}
						}
					}
				}
				return blnDone;
			});
		});
	}

	// a soldier or found survivor next to d (any of the eight), -1 none
	function adjacent(intD_a)
	{
		var intResult = -1, intJ;
		for (intJ = 0; (intJ < NU) && (intResult < 0); intJ++)
		{
			if (prey(intJ) && (dist(intJ, intD_a) <= 1)) { intResult = intJ; }
		}
		return intResult;
	}

	// the nearest soldier or found survivor d can see within its range, -1 none
	function target(intD_a)
	{
		var intResult = -1, intBD = 99, intJ, intDD;
		for (intJ = 0; intJ < NU; intJ++)
		{
			if (prey(intJ))
			{
				intDD = dist(intD_a, intJ);
				if ((intDD <= krng[uk[intD_a]]) && (intDD < intBD) && sees(intD_a, intJ)) { intBD = intDD; intResult = intJ; }
			}
		}
		return intResult;
	}

	// d attacks t next to it (3 in 4 hit)
	function claw(intD_a, intT_a)
	{
		sCall(function()
		{
			face(intD_a, ux[intT_a], uy[intT_a]);
			if (uvis[intD_a] === 0) { uvis[intD_a] = 1; }
			look(ux[intT_a], uy[intT_a]);
			units();
			sfx(1, 200 + rnd(100), 8, 14, 10, 1);
			sWait(4);
			sCall(function()
			{
				if (rnd(4) < 3)
				{
					if (uk[intT_a] === K_SOLDIER) { say(wd(unm[intT_a]) + T(' IS HIT')); } else { say(T('THE SURVIVOR IS HIT')); }
					hurt(intT_a, kd1[uk[intD_a]] + rnd(kd2[uk[intD_a]] - kd1[uk[intD_a]] + 1), intD_a);
				}
				else
				{
					say(T('CLAWS MISS'));
				}
			});
		});
	}

	// a ball of acid from d at t - it flies its line and hits what's in the way first
	function spit(intD_a, intT_a)
	{
		sCall(function()
		{
			var intN, intJ = -1, intW = -1, intX, intY;
			face(intD_a, ux[intT_a], uy[intT_a]);
			uvis[intD_a] = 1;
			look(ux[intT_a], uy[intT_a]);
			units();
			intX = ux[intT_a]; intY = uy[intT_a];
			if (rnd(100) >= uacc[intD_a]) { intX += rnd(3) - 1; intY += rnd(3) - 1; }
			if (intX < 0) { intX = 0; }
			if (intY < 0) { intY = 0; }
			if (intX > 31) { intX = 31; }
			if (intY > 23) { intY = 23; }
			sfx(1, 400, -8, 12, 14, 1);
			intN = line(ux[intD_a], uy[intD_a], intX, intY);
			// the acid flies its line on its own; each frame: what does it touch?
			fly(FX_ACID, intN, 1);
			sUntil(function()
			{
				var blnDone = false;
				if ((intN > 0) && (intJ >= 0))
				{
					intW = hitBy(SP_SHOT, intD_a);
				}
				intJ++;
				if ((intJ > 0) && ((intW >= 0) || (intJ >= intN)))
				{
					m_objSlots.hide(SP_SHOT);
					blnDone = true;
				}
				return blnDone;
			});
			sCall(function()
			{
				if (intW >= 0)
				{
					hurt(intW, kd1[uk[intD_a]] + rnd(kd2[uk[intD_a]] - kd1[uk[intD_a]] + 1), intD_a);
				}
				else
				{
					say(T('IT MISSES'));
				}
			});
		});
	}

	// a portal (an imp) or a nest (a hound or an imp) brings one more, next to it
	function spawn(intD_a)
	{
		sCall(function()
		{
			var intU = -1, intJ, intDX, intDY, intKd, intAlive = 0, blnDone = false;
			for (intJ = 6; intJ < NU; intJ++)
			{
				if ((side(intJ) === 1) && (uk[intJ] < K_PORTAL)) { intAlive++; }
			}
			for (intJ = 6; (intJ < NU) && (intU < 0); intJ++)
			{
				if (uk[intJ] === 255) { intU = intJ; }
			}
			if ((intAlive < 14) && (intU >= 0))
			{
				intKd = ((uk[intD_a] === K_NEST) && (rnd(2) === 0)) ? K_HOUND : K_IMP;
				for (intJ = 0; (intJ <= 7) && (!blnDone); intJ++)
				{
					intDX = rnd(3) - 1; intDY = rnd(3) - 1;
					if (walkable(ux[intD_a] + intDX, uy[intD_a] + intDY) && (who(ux[intD_a] + intDX, uy[intD_a] + intDY) < 0))
					{
						blnDone = true;
						uk[intU] = intKd; uhp[intU] = khp[intKd]; umhp[intU] = khp[intKd]; umtu[intU] = ktu[intKd]; utu[intU] = 0;
						uacc[intU] = 40 + mission * 2; ual[intU] = 1; ufc[intU] = 2; uvis[intU] = 0;
						ux[intU] = ux[intD_a] + intDX; uy[intU] = uy[intD_a] + intDY;
						place(intU, ux[intU], uy[intU]);
						seen();
						if (uvis[intU] !== 0)
						{
							look(ux[intU], uy[intU]);
							units();
							fxRun('sparkportal', ux[intU], uy[intU]);
							sUntil(function() { return !m_objSlots.isAnimated(SP_FX); });
							sCall(function() { m_objSlots.hide(SP_FX); say(T('SOMETHING CAME THROUGH')); });
						}
					}
				}
			}
		});
	}

	// the gatekeeper (acid at two it sees, claws at one next to it) or the archdemon (turn about:
	// fire on one it sees - the cells round it burn too - or an imp called up)
	function bossAct(intD_a)
	{
		sCall(function()
		{
			var intT = adjacent(intD_a), intN = 1, intJ = 0, blnPend = false, intK = 0;
			if (intT >= 0)
			{
				claw(intD_a, intT);
			}
			else if (uk[intD_a] === K_GATEKEEPER)
			{
				sLoop(function()
				{
					var blnDone = false;
					if (blnPend)
					{
						blnPend = false;
						check();
						if (result !== 0) { blnDone = true; }
						intN++;
					}
					if ((!blnDone) && (intN > 2)) { blnDone = true; }
					if (!blnDone)
					{
						intT = target(intD_a);
						if (intT >= 0) { spit(intD_a, intT); }
						blnPend = true;
					}
					return blnDone;
				});
			}
			else if ((turn & 1) !== 0)
			{
				spawn(intD_a);
			}
			else
			{
				intT = target(intD_a);
				if (intT >= 0)
				{
					say(T('THE ARCHDEMON BURNS'));
					look(ux[intT], uy[intT]);
					units();
					intN = line(ux[intD_a], uy[intD_a], ux[intT], uy[intT]);
					// the fire flies its line on its own
					fly((D.rules.bossfirepal === PL_ACID) ? FX_FIREACID : FX_FIRE, intN, 1);
					sUntil(function() { return !m_objSlots.hasMover(SP_SHOT); });
					sCall(function()
					{
						var intTX = ux[intT], intTY = uy[intT];
						m_objSlots.hide(SP_SHOT);
						boom(intTX, intTY, 1);
						sLoop(function()
						{
							var intW;
							if (intK < 9)
							{
								intW = hitAt(intTX + (intK % 3) - 1, intTY + Math.floor(intK / 3) - 1, -1);
								if ((intW >= 0) && (side(intW) === 0))
								{
									hurt(intW, kd1[uk[intD_a]] + rnd(kd2[uk[intD_a]] - kd1[uk[intD_a]] + 1), intD_a);
								}
								intK++;
							}
							return intK >= 9;
						});
					});
				}
			}
		});
	}

	// ====================================================================================================
	// THE CAMPAIGN AND A MISSION (the BASIC's Lvl)

	// a new squad, the story's start, the missions in turn (a failed one tried again, or back to the
	// title); after the 16th the story's end
	function campaign()
	{
		sCall(function()
		{
			var intR, intPhase = 0, intC = 0;
			var arrSquad = [[72, 24, 12, 1], [68, 24, 11, 2], [64, 26, 10, 1], [60, 22, 13, 3], [62, 24, 10, 1], [58, 24, 10, 2]];
			for (intR = 0; intR <= 5; intR++)
			{
				rnm[intR] = W_SQUAD + intR; rkl[intR] = 0; ral[intR] = 1;
				racc[intR] = arrSquad[intR][0]; rtu[intR] = arrSquad[intR][1]; rhp[intR] = arrSquad[intR][2]; rwep[intR] = arrSquad[intR][3];
			}
			recruits = 0;
			comic(0);
			comic(1);
			mission = 1;
			sLoop(function()
			{
				var blnDone = false, intJ;
				if (intPhase === 0)
				{
					// the mission's page, the roster as it starts
					comic(mission + 1);
					for (intJ = 0; intJ <= 5; intJ++)
					{
						bnm[intJ] = rnm[intJ]; bacc[intJ] = racc[intJ]; btu[intJ] = rtu[intJ]; bhp[intJ] = rhp[intJ];
						bwep[intJ] = rwep[intJ]; bkl[intJ] = rkl[intJ]; bal[intJ] = ral[intJ];
					}
					brec = recruits;
					intPhase = 1;
				}
				else if (intPhase === 1)
				{
					brief();
					run();
					intPhase = 2;
				}
				else if (intPhase === 2)
				{
					if (result === 1)
					{
						debrief();
						mission++;
						if (mission > 16)
						{
							comic(18);
							theEnd();
							intPhase = 4;
						}
						else
						{
							intPhase = 0;
						}
					}
					else
					{
						cls();
						textC(4, 10, T('        MISSION FAILED'), 3);
						textC(4, 13, T('     ENTER - TRY IT AGAIN'), 1);
						textC(4, 15, T('     B - BACK TO THE TITLE'), 2);
						waitKey(function(intC_a) { intC = intC_a; });
						intPhase = 3;
					}
				}
				else if (intPhase === 3)
				{
					if (intC === 98)
					{
						blnDone = true;
					}
					else
					{
						for (intJ = 0; intJ <= 5; intJ++)
						{
							rnm[intJ] = bnm[intJ]; racc[intJ] = bacc[intJ]; rtu[intJ] = btu[intJ]; rhp[intJ] = bhp[intJ];
							rwep[intJ] = bwep[intJ]; rkl[intJ] = bkl[intJ]; ral[intJ] = bal[intJ];
						}
						recruits = brec;
						intPhase = 1;
					}
				}
				else
				{
					blnDone = true;
				}
				return blnDone;
			});
		});
	}

	// the mission's name, what to do, the squad
	function brief()
	{
		sCall(function()
		{
			var intR, intY = 14;
			m_objSlots.hideRange(0, NSLOTS);
			m_intPic = -1;
			cls();
			textC(4, 5, T('MISSION ') + num(mission), 1);
			textC(4, 6, wd(W_NAME + mission - 1), 0);
			textC(4, 9, wd(W_BRIEF + (mission - 1) * 2), 2);
			textC(4, 10, wd(W_BRIEF + (mission - 1) * 2 + 1), 2);
			textC(4, 13, T('THE SQUAD          HP  TU  ACC'), 1);
			for (intR = 0; intR <= 5; intR++)
			{
				if (ral[intR] !== 0)
				{
					textC(4, intY, wd(rnm[intR]), 0);
					textC(12, intY, (rwep[intR] === 1) ? T('RIFLE') : ((rwep[intR] === 2) ? T('SHOTGUN') : T('HEAVY')), 2);
					textC(23, intY, num(rhp[intR]), 0);
					textC(27, intY, num(rtu[intR]), 0);
					textC(31, intY, num(racc[intR]), 0);
					intY++;
				}
			}
			textC(4, 22, T('        ENTER - DEPLOY'), 1);
			waitKey(function() { m_intKLast = 0; });
		});
	}

	// the roster from the mission - the dead gone, recruits in their places, kills counted
	function debrief()
	{
		var intR, intU, intK;
		for (intR = 0; intR <= 5; intR++)
		{
			if (ral[intR] !== 0)
			{
				intU = -1;
				for (intK = 0; intK <= 5; intK++)
				{
					if ((uk[intK] === K_SOLDIER) && (unm[intK] === rnm[intR])) { intU = intK; }
				}
				if (intU < 0)
				{
					ral[intR] = 0;
				}
				else
				{
					rkl[intR] = ukl[intU];
					if ((ukl[intU] >= 3) && (racc[intR] < 85)) { racc[intR] += 2; }
				}
			}
			if ((ral[intR] === 0) && (recruits < 10))
			{
				rnm[intR] = W_SQUAD + 6 + recruits; recruits++;
				racc[intR] = 50 + rnd(8); rtu[intR] = 22 + rnd(3); rhp[intR] = 9 + rnd(2); rwep[intR] = 1 + rnd(2); rkl[intR] = 0; ral[intR] = 1;
			}
		}
	}

	// the mission from its start to won (result 1) or lost (2)
	function run()
	{
		sCall(function()
		{
			var intPhase = 0;
			loadIt();
			m_intPic = -1;
			cls();
			fill(24, 27, T_PANEL);
			drawView(vx, vy);
			seen();
			units();
			result = 0; turn = 1;
			sLoop(function()
			{
				var blnDone = false, intK;
				if (intPhase === 0)
				{
					for (intK = 0; intK < NU; intK++)
					{
						if ((uk[intK] === K_SOLDIER) || (uk[intK] === K_SURVIVOR)) { utu[intK] = umtu[intK]; }
					}
					tacPlay();
					intPhase = 1;
				}
				else if (intPhase === 1)
				{
					if (result !== 0) { blnDone = true; }
					else
					{
						aiPlay();
						intPhase = 2;
					}
				}
				else
				{
					check();
					if (result !== 0) { blnDone = true; }
					else
					{
						turn++;
						intPhase = 0;
					}
				}
				return blnDone;
			});
			sCall(function()
			{
				m_objSlots.hide(SP_CURSOR);
				m_objSlots.hide(SP_TARGET);
				if (result === 1)
				{
					say(T('MISSION COMPLETE'));
					sfx(0, 200, -3, 15, 60, 0);
				}
				else
				{
					say(T('MISSION FAILED'));
				}
				help(T('            ENTER'));
				waitKey(function() { m_intKLast = 0; });
			});
		});
	}

	// the mission's map and facts: the squad, the enemy, the items
	function loadIt()
	{
		var objM = D.missions[mission];
		var intJ, intU, intKd;
		mp = objM.map.slice(0);
		obj = objM.obj;
		setPlace(objM.theme);
		for (intJ = 0; intJ < NU; intJ++)
		{
			uk[intJ] = 255; uro[intJ] = 0; ual[intJ] = 0; uvis[intJ] = 0; ukl[intJ] = 0;
		}
		m_intFlashU = -1;
		for (intJ = 0; intJ < 768; intJ++) { occ[intJ] = 0; }
		for (intJ = 0; intJ < NI; intJ++) { ik[intJ] = 0; }
		// the squad: the roster's living, on the start cells
		intU = 0;
		for (intJ = 0; intJ <= 5; intJ++)
		{
			if ((ral[intJ] !== 0) && (intU < objM.start.length))
			{
				uk[intU] = K_SOLDIER; unm[intU] = rnm[intJ]; uacc[intU] = racc[intJ]; umtu[intU] = rtu[intJ]; utu[intU] = rtu[intJ];
				umhp[intU] = rhp[intJ]; uhp[intU] = rhp[intJ]; uwep[intU] = rwep[intJ]; ukl[intU] = rkl[intJ]; ugren[intU] = 2; ufc[intU] = 1;
				uammo[intU] = (rwep[intJ] === 2) ? 16 : ((rwep[intJ] === 3) ? 20 : 30);
				place(intU, objM.start[intU][0], objM.start[intU][1]);
				intU++;
			}
		}
		// the others: survivors, the enemy, things - from unit 6 on
		boss = -1; targets = 0; rescued = 0; lost = 0; termDone = 0;
		for (intJ = 0; intJ < objM.units.length; intJ++)
		{
			intKd = objM.units[intJ][0];
			intU = 6 + intJ;
			if (intU < NU)
			{
				uk[intU] = intKd; ufc[intU] = 2;
				uhp[intU] = khp[intKd];
				if (kbig[intKd] === 0) { uhp[intU] += Math.floor((mission - 1) / 6); }
				umhp[intU] = uhp[intU];
				umtu[intU] = ktu[intKd]; utu[intU] = 0; uacc[intU] = 40 + mission * 2;
				if (intKd === K_SURVIVOR) { uhp[intU] = khp[intKd]; umhp[intU] = uhp[intU]; umtu[intU] = ktu[intKd]; utu[intU] = ktu[intKd]; ufc[intU] = 3; }
				place(intU, objM.units[intJ][1], objM.units[intJ][2]);
				if ((intKd >= K_PORTAL) && (intKd <= K_CORE)) { targets++; }
				if ((intKd === K_GATEKEEPER) || (intKd === K_ARCHDEMON)) { boss = intU; ual[intU] = 1; }
			}
		}
		for (intJ = 0; intJ < objM.items.length; intJ++)
		{
			if (intJ < NI) { ik[intJ] = objM.items[intJ][0]; ix[intJ] = objM.items[intJ][1]; iy[intJ] = objM.items[intJ][2]; }
		}
		sel = 0;
		vx = ux[0] - 4; vy = uy[0] - 5;
		if (vx < 0) { vx = 0; }
		if (vx > 16) { vx = 16; }
		if (vy < 0) { vy = 0; }
		if (vy > 14) { vy = 14; }
		m_intShTurn = -1;
	}

	// won or lost yet (result 1 / 2)
	function check()
	{
		var intU, intSq = 0, intDm = 0, intTg = 0, intSv = 0, blnEx = false, blnBig = false;
		for (intU = 0; intU < NU; intU++)
		{
			switch (uk[intU])
			{
				case K_SOLDIER:
					intSq++;
					if ((cell(ux[intU], uy[intU]) === C_EXIT) && ((obj === O_EXIT) || ((obj === O_TERMINAL) && (uro[intU] !== 0)))) { blnEx = true; }
					break;
				case K_SURVIVOR:
					intSv++;
					break;
				case K_IMP: case K_HUSK: case K_HOUND: case K_SPITTER: case K_BRUTE: case K_WRAITH:
					intDm++;
					break;
				case K_PORTAL: case K_NEST: case K_ALTAR: case K_CORE:
					intDm++; intTg++;
					if (uk[intU] === K_CORE) { blnBig = true; }
					break;
				case K_GATEKEEPER: case K_ARCHDEMON:
					blnBig = true;
					break;
				default:
					break;
			}
		}
		targets = intTg;
		if (intSq === 0)
		{
			result = 2;
		}
		else if (D.rules.shieldfail && blnBig && (intSq < 3))
		{
			// VOID STRIKE: fewer than three ships can't bring a shield down
			result = 2;
		}
		else
		{
			switch (obj)
			{
				case O_KILL:
					if (intDm === 0) { result = 1; }
					break;
				case O_RESCUE:
					if (lost > 0) { result = 2; }
					if ((intSv === 0) && (lost === 0)) { result = 1; }
					break;
				case O_TERMINAL: case O_EXIT:
					if (blnEx) { result = 1; }
					break;
				case O_DESTROY:
					if (intTg === 0) { result = 1; }
					break;
				case O_BOSS:
					if ((boss >= 0) && (uk[boss] === 255)) { result = 1; }
					break;
				default:
					break;
			}
		}
	}

	// what's left to do, for the panel
	function goal()
	{
		var strResult;
		switch (obj)
		{
			case O_KILL: strResult = T('KILL ALL'); break;
			case O_RESCUE: strResult = T('RESCUE ') + num(rescued) + T(' OUT'); break;
			case O_TERMINAL: strResult = (termDone !== 0) ? T('DATA TO EXIT') : T('USE TERMINAL'); break;
			case O_DESTROY: strResult = T('DESTROY ') + num(targets); break;
			case O_EXIT: strResult = T('REACH EXIT'); break;
			default: strResult = T('KILL THE BOSS'); break;
		}
		return strResult;
	}

	// ====================================================================================================
	// THE TITLE AND THE COMIC PAGES (the BASIC's Story)

	function l2Clip(intX0_a, intX1_a, intY0_a, intY1_a)
	{
		m_objL2Clip = { x0:intX0_a, x1:intX1_a, y0:intY0_a, y1:intY1_a };
	}

	// the title picture, the keys, until Enter
	function title()
	{
		sCall(function()
		{
			var intT = 0, intC = 0;
			m_objSlots.hideRange(0, NSLOTS);
			pic(0);
			cls();
			l2Clip(0, 255, 0, 127);
			textC(4, 18, T('   NINTH SENTINEL GOES IN.'), 2);
			textC(4, 21, T('QWE/A D/ZXC MOVE   F FIRE'), 0);
			textC(4, 22, T('G GRENADE  P PICK UP  U USE'), 0);
			textC(4, 23, T('N NEXT SOLDIER   TT END TURN'), 0);
			textC(4, 26, T('  (C) 2026 CYBORG UNICORN'), 2);
			show();
			m_strMode = 'menu';
			sUntil(function() { return key() === 0; });
			sUntil(function()
			{
				intT++;
				if (intT === 30) { textC(4, 24, T('        PRESS ENTER'), 1); }
				if (intT === 60) { textC(4, 24, T('                   '), 0); intT = 0; }
				intC = key();
				return (intC === 13) || (intC === 32);
			});
			sCall(function() { sfx(0, 80, -2, 15, 25, 0); });
			hide();
			sCall(function() { l2Clip(0, 255, 0, 191); });
		});
	}

	// comic page p: its panels one after another, each with its caption; Enter goes on, B skips the
	// rest of the page
	function comic(intP_a)
	{
		sCall(function()
		{
			var intS = 0, intC = 0;
			m_objSlots.hideRange(0, NSLOTS);
			pic(intP_a + 1);
			cls();
			m_strMode = 'menu';
			sLoop(function()
			{
				var blnDone = false;
				if ((intS > 2) || (intC === 98))
				{
					blnDone = true;
				}
				else
				{
					// the panels so far: A (top left), A and B (the top), all
					if (intS === 0) { l2Clip(0, 127, 0, 87); }
					else if (intS === 1) { l2Clip(0, 255, 0, 87); }
					else { l2Clip(0, 255, 0, 191); }
					if (intS === 0) { cap(intP_a * 6, 4, 4, 16); cap(intP_a * 6 + 1, 4, 5, 16); }
					else if (intS === 1) { cap(intP_a * 6 + 2, 20, 4, 16); cap(intP_a * 6 + 3, 20, 5, 16); }
					else { cap(intP_a * 6 + 4, 4, 15, 32); cap(intP_a * 6 + 5, 4, 16, 32); }
					if (intS === 0) { show(); }
					sCall(function() { sfx(0, 60, -1, 10, 6, 0); });
					sUntil(function() { return (key() === 0) && (m_arrTaps.length === 0); });
					sUntil(function()
					{
						intC = key();
						return (intC === 13) || (intC === 32) || (intC === 98);
					});
					intS++;
				}
				return blnDone;
			});
			sCall(function()
			{
				l2Clip(0, 255, 0, 191);
				textC(4, 27, '                                ', 0);
			});
			hide();
		});
	}

	// after the last page
	function theEnd()
	{
		sCall(function()
		{
			cls();
			textC(4, 9, T('       DEMON TRANSCENDENCE'), 1);
			textC(4, 12, T(' THE RIFT IS SEALED. THE STATION'), 0);
			textC(4, 13, T(' IS QUIET. NINTH SENTINEL GOES'), 0);
			textC(4, 14, T(' HOME.'), 0);
			textC(4, 18, T('            THE END'), 3);
			waitKey(function() { m_intKLast = 0; });
		});
	}

	// caption line n in the middle of w columns from x, on row y
	function cap(intN_a, intX_a, intY_a, intW_a)
	{
		var str = wd(intN_a);
		textC(intX_a + Math.floor((intW_a - str.length) / 2), intY_a, str, 1);
	}

	// picture n (0 the title, 1-19 the pages) on Layer 2, dark until shown
	function pic(intN_a)
	{
		m_intFade = 0;
		m_intPic = intN_a;
	}

	function show()
	{
		sCall(function()
		{
			var intJ;
			for (intJ = 0; intJ <= 8; intJ++)
			{
				sCall(fadeStep(intJ));
				sWait(1);
			}
		});
	}

	function hide()
	{
		sCall(function()
		{
			var intJ;
			for (intJ = 8; intJ >= 0; intJ--)
			{
				sCall(fadeStep(intJ));
				sWait(1);
			}
			sCall(function()
			{
				m_intPic = -1;
				m_intFade = 8;
				cls();
			});
		});
	}

	function fadeStep(intJ_a)
	{
		return function() { m_intFade = intJ_a; };
	}

	// ====================================================================================================
	// THE LOOPS

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		m_arrTaps = m_objPad.taps();
		Wide();
		if (m_blnLoaded)
		{
			m_objSteps.update();
			m_objSlots.step();
			frames++;
		}
		m_objSound.update();
	};

	// the screen's shape: what JCanvas shows (wider in full screen), the extra either side of the
	// Next's 256, the sprites' clip window to match
	function Wide()
	{
		var objV = m_objCanvas.getView();
		var intL = 0, intR = 0;
		// (only a view around the game's own: before the canvas is going, it's not yet)
		if ((objV.x <= VIEW.x) && (objV.y <= VIEW.y) && (objV.x + objV.w >= VIEW.x + VIEW.w) && (objV.y + objV.h >= VIEW.y + VIEW.h))
		{
			intL = VIEW.x - objV.x; intR = (objV.x + objV.w) - (VIEW.x + VIEW.w);
			m_objView = objV;
		}
		if ((intL !== m_intWL) || (intR !== m_intWR))
		{
			m_intWL = intL; m_intWR = intR;
			m_objSlots.setClip(32 - Math.min(intL, WIDEMAX), 32, 256 + Math.min(intL, WIDEMAX) + Math.min(intR, WIDEMAX), 160);
			if (m_blnMap) { units(); }
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var objPic;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		var intL = Math.min(m_intWL, WIDEMAX), intR = Math.min(m_intWR, WIDEMAX), intOff = 0;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			// Layer 2 (under everything), in its clip window
			if (m_intPic >= 0)
			{
				objPic = m_objSprites.getImageByName(imageName('pic_' + m_intPic));
				if (objPic !== null)
				{
					objContext_a.save();
					objContext_a.beginPath();
					objContext_a.rect(32 + m_objL2Clip.x0, 32 + m_objL2Clip.y0, m_objL2Clip.x1 - m_objL2Clip.x0 + 1, m_objL2Clip.y1 - m_objL2Clip.y0 + 1);
					objContext_a.clip();
					objContext_a.drawImage(objPic, 32, 32);
					objContext_a.restore();
				}
			}
			if (m_blnMap && ((intL > 0) || (intR > 0)))
			{
				// a wide screen: the map's rows across the whole width (moved across by wideOff), the
				// tilemap's map part over it moved the same, the panel under it where it always is
				intOff = wideOff();
				objContext_a.save();
				objContext_a.beginPath();
				objContext_a.rect(32 - intL, 32, 256 + intL + intR, 160);
				objContext_a.clip();
				m_objWide.paint(objContext_a, 32 - vx * 16 + intOff, 32);
				objContext_a.restore();
				objContext_a.save();
				objContext_a.beginPath();
				objContext_a.rect(32 + intOff, 32, 256, 160);
				objContext_a.clip();
				m_objGrid.paint(objContext_a, intOff, 0);
				objContext_a.restore();
				objContext_a.save();
				objContext_a.beginPath();
				objContext_a.rect(32, 192, 256, 32);
				objContext_a.clip();
				m_objGrid.paint(objContext_a, 0, 0);
				objContext_a.restore();
			}
			else
			{
				// the tilemap, clipped to the paper
				objContext_a.save();
				objContext_a.beginPath();
				objContext_a.rect(32, 32, 256, 192);
				objContext_a.clip();
				m_objGrid.paint(objContext_a, 0, 0);
				objContext_a.restore();
			}
			// the sprites, over the map's view (wider on a wide screen)
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(32 - intL, 32, 256 + intL + intR, 160);
			objContext_a.clip();
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
			// the palette fade
			if (m_intFade < 8)
			{
				objContext_a.fillStyle = 'rgba(0, 0, 0, ' + ((8 - m_intFade) / 8) + ')';
				objContext_a.fillRect(m_objView.x - GAMEX, m_objView.y, m_objView.w, m_objView.h);
			}
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite of the game's: its frames, its sequence and pace, its hit box
	function sprite(strName_a, strImage_a, intW_a, intH_a, intImageX_a, intImageY_a, arrSequence_a, intDelay_a, strCollision_a)
	{
		return { name:strName_a, classes:'tac', imagename:imageName(strImage_a), x:0, y:0, w:intW_a, h:intH_a,
			imagex:intImageX_a, imagey:intImageY_a, imagew:intW_a, imageh:intH_a, sequence:arrSequence_a, delay:intDelay_a,
			collisiontype:strCollision_a, hbx:0, hby:0, hbsize:8 };
	}

	this.run = function()
	{
		var arrImages = [], arrLib = [], intI, intP, intInk;
		// the kinds, the cells' sight and walking
		for (intI = 0; intI < 14; intI++)
		{
			khp[intI] = D.kinds[intI][0]; ktu[intI] = D.kinds[intI][1]; kd1[intI] = D.kinds[intI][2]; kd2[intI] = D.kinds[intI][3];
			karm[intI] = D.kinds[intI][4]; krng[intI] = D.kinds[intI][5]; kpat[intI] = D.kinds[intI][6]; kpal[intI] = D.kinds[intI][7];
			kbig[intI] = D.kinds[intI][8];
		}
		for (intI = 0; intI < 32; intI++)
		{
			blk[intI] = 0; wk[intI] = 1; ww[intI] = 1;
		}
		processArray([C_WALL1, C_WALL2, C_DOORH, C_DOORV, C_PILLAR, C_MACHINE, C_TERMINAL], function(intC_a) { blk[intC_a] = 1; });
		processArray([C_VOID, C_HAZARD, C_WALL1, C_WALL2, C_WINDOW, C_CRATE, C_TANK, C_PILLAR, C_CONSOLE, C_TERMINAL, C_MACHINE, C_TABLE],
			function(intC_a) { wk[intC_a] = 0; });
		ww[C_VOID] = 0; ww[C_HAZARD] = 0;
		// the images
		for (intP = 0; intP < D.places.length; intP++)
		{
			for (intInk = 0; intInk < 4; intInk++)
			{
				arrImages.push({ name:imageName('tiles_p' + D.places[intP] + '_v' + intInk), classes:'tac',
					source:'images/' + NAME + '/tiles_p' + D.places[intP] + '_v' + intInk + '.png' });
			}
			processArray(['units_p', 'units_f_', 'big_p', 'big_f_'], function(strSheet_a)
			{
				var strName = (strSheet_a.indexOf('_f_') >= 0) ? strSheet_a.replace('_f_', '_p') + D.places[intP] + '_f' : strSheet_a + D.places[intP];
				arrImages.push({ name:imageName(strName), classes:'tac', source:'images/' + NAME + '/' + strName + '.png' });
			});
		}
		for (intI = 0; intI < D.pictures; intI++)
		{
			arrImages.push({ name:imageName('pic_' + intI), classes:'tac', source:'images/' + NAME + '/pic_' + intI + '.png' });
		}
		arrImages.push({ name:imageName('fx'), classes:'tac', source:'images/' + NAME + '/fx.png' });
		arrImages.push({ name:imageName('items'), classes:'tac', source:'images/' + NAME + '/items.png' });
		m_objSprites.addImagesToLibrary(arrImages);
		// the sprites: each unit kind with its loops (a way it faces each, frames a and b, a step every
		// 24 frames) and its whole-cell hit box; the 2 x 2 ones; the items; the cursor (blinking); fx.png
		// as frames (markers, the shot - a small hit box in the middle of its cell); the effects that
		// play once and stop
		for (intI = 0; intI < 14; intI++)
		{
			if (kbig[intI] !== 0)
			{
				arrLib.push(sprite('big' + intI, 'big_p1', 32, 32, 0, (intI - K_CORE) * 32, [1, 2, -1], 16, 'bb'));
			}
			else
			{
				arrLib.push(sprite('kind' + intI, 'units_p1', 16, 16, 0, intI * 16, UNIT_SEQUENCE, 24, 'bb'));
			}
		}
		arrLib.push(sprite('item', 'items', 16, 16, 0, 0, [1, 0], 1, ''));
		arrLib.push(sprite('cursor', 'fx', 16, 16, (FX_CURSOR - 1) * 16, 0, [1, 2, -1], 8, ''));
		arrLib.push(sprite('fx', 'fx', 16, 16, 0, 0, [1, 0], 1, 'hb'));
		arrLib.push(sprite('boom', 'fx', 16, 16, (FX_BOOM - 1) * 16, 0, [1, 2, 3, 4, 1, 2, 0], 2, ''));
		arrLib.push(sprite('sparkacid', 'fx', 16, 16, (FX_SPARKACID - 1) * 16, 0, [1, 2, 0], 3, ''));
		arrLib.push(sprite('sparkportal', 'fx', 16, 16, (FX_SPARKPORTAL - 1) * 16, 0, [1, 2, 1, 2, 1, 2, 1, 2, 0], 1, ''));
		m_objSprites.addSpritesToLibrary(arrLib);
		m_objSlots.setClip(32, 32, 256, 160);		// (the map's view: what's off it isn't drawn)
		m_objBlank = document.createElement('canvas');
		m_objBlank.width = 256; m_objBlank.height = 256;
		// the tilemap
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16,
			images:[imageName('tiles_p1_v0'), imageName('tiles_p1_v1'), imageName('tiles_p1_v2'), imageName('tiles_p1_v3')],
			first:0, firstcode:0, transparent:32 });
		m_objWide = new JTileGrid(m_objSprites, { w:64, h:20, tilew:8, tileh:8, columns:16,
			images:[imageName('tiles_p1_v0'), imageName('tiles_p1_v1'), imageName('tiles_p1_v2'), imageName('tiles_p1_v3')],
			first:0, firstcode:0, transparent:32 });
		// touch: no controls drawn; the map's cells can be tapped (a soldier to pick him, a cell
		// next to him to step, a demon he sees to aim at it) and in a menu a tap is Enter
		m_objPad = new JPad({ controls:[], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:KC_F, fire2:KC_ENTER } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('tac'), function()
		{
			setPlace(1);
			m_objGrid.invalidate();
			cls();
			m_blnLoaded = true;
			// the BASIC's main loop: the title, the campaign, again
			m_objSteps.until(function()
			{
				title();
				campaign();
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:true, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:VIEW.w, yresolution:VIEW.h, xorigin:VIEW.x, yorigin:VIEW.y, screenmode:'ask', cbOnRender:m_objThis.onRenderCanvas });
	};

	// for the tests: start the campaign's next mission at n
	this.setMission = function(intN_a)
	{
		mission = intN_a;
	};

	// for the tests: the state, read only
	this.state = function()
	{
		return { mission:mission, turn:turn, result:result, sel:sel, vx:vx, vy:vy, obj:obj, mode:m_strMode,
			uk:uk.slice(0), ux:ux.slice(0), uy:uy.slice(0), uhp:uhp.slice(0), utu:utu.slice(0), uvis:uvis.slice(0), uro:uro.slice(0), uammo:uammo.slice(0),
			termDone:termDone, rescued:rescued, lost:lost, targets:targets, pic:m_intPic, fade:m_intFade,
			mp:mp.slice(0), ik:ik.slice(0), ix:ix.slice(0), iy:iy.slice(0), wk:wk.slice(0), steps:m_objSteps.isBusy(), msg:m_strMsg, log:m_arrMsgLog.slice(0), help:m_strHelp,
			shots:m_intShots, shothits:m_intShotHits, shotchance:m_intShotChance, wideoff:wideOff(), view:m_objView };
	};
}
