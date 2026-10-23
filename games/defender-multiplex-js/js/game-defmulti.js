// DEFENDER MULTIPLEX - ported from the ZX Spectrum Next game (NTC BASIC: Main.bas, Play.cls,
// Sector.cls, Front.cls, Mechs.cls, Film.cls, Dots.cls, Bul.cls, Map.cls; the 1MB build, DEFMULTI,
// without the 2MB build's voice). MULTIPLEX's bullet hell with DEFENDER HELLGATE's laser and arms.
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Sixteen planets, each five depths down and then its reactor; the escape up a shaft; open space
// between planets; the films between. Keys: Q A O P (or the arrows, 7 6 5 8) fly, Space (or 0)
// the laser, Z the spray, S (or X) the next pattern, B (or M) smart bomb, G guard, I (or N)
// Inviso, W the Death Blossom, H hyperspace, Enter pause; K on the title redefines the keys.
// Touch: the pad on the left, the arms' buttons round the sides. A game pad: the stick, A the
// laser, B the spray.
//
// As on the Next the game's play runs at 25 frames a second (a frame's work there takes two TV
// frames): Tick every other iteration of the 50. The films, the title and the fades run at 50.
// The layers are the Next's: the terrain and the panel a JTileGrid (the tilemap, streamed a column
// at a time either way and scrolled as the copper does, the panel and the message rows held
// still), Layer 2 a JPixelScreen (the pictures, the laser beams, its palette faded as Pal.cls
// does - a colour faded to black goes see-through), the sprites JSpriteSlots numbered as the
// Next's (0-63, its 64 bullet slots after them). Everything that moves is a sprite: the 512 dots
// are 2 x 2 sprites under all the others (a frame a colour: Layer 2's, faded with it), each half
// of them moved a frame by one showRange whose functions are Dots.cls's own fixed point sums; the
// 128 enemy bullets are one pool moved the same way (Bul.cls's sums); the drones likewise
// (EnemyPost's work). What a sprite does on its own is its library entry: its animation loops
// (sequence, delay), its hit box (sized to the original's tests); the game says what each thing
// is doing and asks what touches what (collide, collideRange, collideRect).
function defmultiGame()
{
	var m_objThis = this;

	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:96, y:32, w:256, h:192 };		// the part of the screen the game uses: the canvas shows only this
	var NE = 18, NI = 8, NB = 128, ND = 512;
	var K_DART = 1, K_ORB = 2, K_SPIN = 3, K_SWARM = 4, K_MINER = 5, K_TURRET = 6, K_HUNTER = 7;
	var K_CARRIER = 8, K_SNIPER = 9, K_MINE = 10, K_MECH = 11, K_REACTOR = 12, K_BOSS = 20;
	var K_MUTANT = 13, K_DYNAMO = 14, K_PART = 30, K_BOOM = 31, K_BIGBOOM = 32;
	var S_LEFT = 0, S_RIGHT = 1, S_BOTH = 2, S_GAP = 3, S_WARP = 4, S_GROUND = 5;
	var I_P = 1, I_N = 2, I_S = 3, I_1 = 4, I_SP = 5, I_BIGP = 6, I_GEM = 7;
	var PL_SHIP = 0, PL_FLASH = 1, PL_RED = 2, PL_GREEN = 3, PL_PURPLE = 4, PL_ORANGE = 5, PL_STEEL = 6, PL_FIRE = 7;
	var PL_PINK = 8, PL_CYAN = 9, PL_YELLOW = 10, PL_LIME = 11, PL_ITEM = 12, PL_BOSSA = 13, PL_BOSSB = 14, PL_LIGHT = 15;
	var W_RING = 0, W_FLOWER = 1, W_SPIRAL = 2, W_WAVE = 3, W_VORTEX = 4, W_STAR = 5, W_ALL = 6;
	var YMIN = 8, YMAX = 168;
	var FIRST_PLANET = 1, FIRST_DEPTH = 1, GOD = 0;
	var SPACECOLS = 216, MAPBLK = 12;
	var MIRRORX = 8, MIRRORY = 4;
	// GfxData.cls's numbers: the sprite patterns and the tiles
	var S_SHIP = 0, S_BSMALL = 4, S_SPARK = 5, S_BBIG = 6, S_BDIAM = 8, S_BSTAR = 10, S_BRING = 12, S_BTINY = 14;
	var S_BOOM = 15, S_ITEMP = 19, S_DART = 24, S_ORB = 26, S_SPIN = 28, S_SWARM = 30, S_MINE = 32, S_TURRET = 34, S_MINER = 36;
	var S_SNIPER = 38, S_HUNTER = 40, S_CARRIER = 44, S_GUARD = 48, S_SMALLP = 50, S_BIGP = 54, S_GEM = 56, S_MUTANT = 58, S_DYNAMO = 60;
	var S_REACTOR = 110;
	var T_PANEL = 1, T_LIFE = 2, T_NOVA = 3, T_POW0 = 4, T_POW1 = 5, T_EN0 = 6, T_EN1 = 7, T_EN2 = 8, T_GUARD = 9, T_INV = 10, T_SCAN = 16;
	// Pad.cls's actions
	var P_UP = 1, P_DOWN = 2, P_LEFT = 4, P_RIGHT = 8, P_LASER = 16, P_PATTERN = 32, P_SMART = 64, P_SPRAY = 128;
	var P_BLOSSOM = 256, P_INVISO = 512, P_GUARD = 1024, P_HYPER = 2048;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	// Layer 2: bank 12 (the dots' layer: the beams, the films' pictures) and the title's picture
	var m_objL2 = new JPixelScreen({ w:256, h:192, transparentcolour:0 });
	var m_objTitleL2 = new JPixelScreen({ w:256, h:192, transparentcolour:0 });
	// full screen (JCanvas's screenmode): how much more of the world shows left and right of the
	// Next's 256 (0 in the normal mode); the world drawn there is at most WIDEMAX each side. The
	// terrain there is its own tilemap (m_objWideGrid: a ring of WGW world columns, the terrain's 22
	// rows), only drawn - the Next's tilemap is still the one the game asks what's solid
	var WIDEMAX = 128, WGW = 80;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:96, y:32, w:256, h:192 };
	var m_objWideGrid = null, m_arrWideCol = [], m_intClipH = 176;
	// your dots and beams fly on out there too: the beams' bits either side of the paper are drawn
	// into their own Layer 2 strip (paper x -128 .. 383 at 0 .. 511), and what's solid out there is
	// the level's own columns (m_arrCols)
	var m_objBeamW = new JPixelScreen({ w:512, h:176, transparentcolour:0 });
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	var m_arrDat = null;

	// ---- Main.bas's globals
	var ek = [], ex = [], ey = [], evx = [], evy = [], ehp = [], et = [], ea = [], eb = [], ews = [], efire = [], ef = [], eflip = [];
	var khp = [], ksc = [], kw = [], kh = [], kbig = [], kpat = [], kpal = [], kanim = [];
	var ik = [], ix = [], iy = [], it = [], ivx = [], ivy = [];
	var pNext = 0, pAll = 0, gEat = 0;
	var pwx = 0, pys = 0, pvx = 0, face = 0, psx = 0, psy = 0;
	var alive = 0, inv = 0, deadT = 0, lives = 0, smarts = 0;
	var guards = 0, guardT = 0, invE = 0, invOn = 0, energy = 0, blossT = 0;
	var lasT = 0, hypT = 0, kWas = 0, nextBonus = 0;
	var power = 1, speed = 1, weapon = 0, ang = 0;
	var pt = [0, 0, 0, 0, 0, 0];
	var novaT = 0, sparkT = 0;
	var score = 0, hiscore = 20000, nextExtend = 0;
	var mult = 1, multT = 0, scoreDirty = 0;
	var planet = 1, depth = 1, tset = 1;
	var stage = 1, loopN = 1, frames = 0, over = 0, cleared = 0, clearT = 0;
	var cam = 0, wid = 0, msgT = 0, spdAdd = 0, msgR = 0;
	var inPlay = 0;
	var wi = 0, waveT = 0, gate = 0, pk = 0, pn = 0, ps = 0, ptim = 0, pidx = 0;
	var gapN = 0, gapX = [], ealive = 0, drops = 0;
	var mN = 0, mT = 0, mWave = 0, mMax = 0, mDrawn = 0;
	var mx = [0, 0, 0, 0], my = [0, 0, 0, 0], mhp = [0, 0, 0, 0], mdie = [0, 0, 0, 0], mfl = [0, 0, 0, 0], mkd = [0, 0, 0, 0], mhome = [0, 0, 0, 0];
	var rN = 0, rpx = [0, 0, 0], reactLeft = 0, escT = 0;
	var bossV = 0, bossOn = 0, bossT = 0, bossHP = 0, bossMax = 0, bossDie = 0;
	var bwx = 0, bwy = 0, bvx = 0, bossPat = 0, bossPal = 0, bossFl = 0;
	var mlist = [], klist = [], mcount = 0, kcount = 0, dieF = 0;
	var scanT = 0;
	var opwx = 0, opys = 0;
	var scn = [], sco = [];
	var peak = 0;
	var kp = 0;

	// ====================================================================================================
	// BASIC AS NTC DOES IT

	// \ : an integer division, towards 0
	function idiv(intA_a, intB_a)
	{
		var fltQ = intA_a / intB_a;
		return (fltQ < 0) ? Math.ceil(fltQ) : Math.floor(fltQ);
	}

	// Mod: the sign of the left
	function imod(intA_a, intB_a)
	{
		return intA_a - idiv(intA_a, intB_a) * intB_a;
	}

	// Rnd(n): 0 .. n - 1
	function rnd(intN_a)
	{
		return Math.floor(Math.random() * intN_a);
	}

	// Fx.cls: shifts (arithmetic: they round down)
	function S1(int_a) { return int_a >> 1; }
	function S2(int_a) { return int_a >> 2; }
	function S3(int_a) { return int_a >> 3; }
	function S4(int_a) { return int_a >> 4; }
	function L4(int_a) { return int_a * 16; }

	function trimStr(int_a)
	{
		return String(int_a);
	}

	// Right$("0000000" & n, 7)
	function digits(int_a, intN_a)
	{
		var str = '0000000000' + String(int_a);
		return str.substring(str.length - intN_a);
	}

	function spaces(intN_a)
	{
		var str = '';
		for (var intI = 0; intI < intN_a; intI++) { str += ' '; }
		return str;
	}

	// ====================================================================================================
	// THE DATA FILE (Pak.cls): DEFMULTI.DAT from block 9

	function datByte(intB_a, intO_a)
	{
		return m_arrDat[(intB_a - DM_DATFIRST) * 16384 + intO_a];
	}

	function PakWord(intB_a, intO_a)
	{
		return datByte(intB_a, intO_a) + datByte(intB_a, intO_a + 1) * 256;
	}

	// Pak.Unpack: tokens 0 the end; 1-127 that many bytes as they are; 128-255 a copy of t - 128 + 2
	// bytes from (the next two, low first) back
	function Unpack(intB_a, intO_a)
	{
		var arrOut = [];
		var intP = (intB_a - DM_DATFIRST) * 16384 + intO_a;
		var blnGo = true;
		var intT, intL, intOff, intK;
		while (blnGo)
		{
			intT = m_arrDat[intP]; intP++;
			if (intT === 0)
			{
				blnGo = false;
			}
			else if (intT < 128)
			{
				for (intK = 0; intK < intT; intK++) { arrOut.push(m_arrDat[intP + intK]); }
				intP += intT;
			}
			else
			{
				intL = intT - 128 + 2; intOff = m_arrDat[intP] | (m_arrDat[intP + 1] << 8); intP += 2;
				for (intK = 0; intK < intL; intK++) { arrOut.push(arrOut[arrOut.length - intOff]); }
			}
		}
		return arrOut;
	}

	// ====================================================================================================
	// SFX.CLS: an effect starts at the next Sfx.Update (the AY is only written there)

	var m_arrSfxPend = [null, null, null];

	function SfxPlay(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		if ((intCh_a >= 0) && (intCh_a <= 2))
		{
			m_arrSfxPend[intCh_a] = [intPeriod_a, intSlide_a, intVol_a, Math.max(1, intFrames_a), intNoise_a !== 0];
		}
	}

	function SfxUpdate()
	{
		m_objSound.update();
		for (var intC = 0; intC < 3; intC++)
		{
			if (m_arrSfxPend[intC] !== null)
			{
				var arr = m_arrSfxPend[intC];
				m_objSound.play(intC, arr[0], arr[1], arr[2], arr[3], arr[4]);
				m_arrSfxPend[intC] = null;
			}
		}
	}

	function SfxQuiet()
	{
		m_arrSfxPend = [null, null, null];
		m_objSound.quiet();
	}

	// ====================================================================================================
	// PAD.CLS: the twelve actions on redefinable keys, the spare keys, Kempston (a game pad)

	// the Spectrum's keys (half row * 8 + bit) as the browser's key codes
	var ZXKEY = [16, 90, 88, 67, 86, -1, -1, -1, 65, 83, 68, 70, 71, -1, -1, -1, 81, 87, 69, 82, 84, -1, -1, -1,
		49, 50, 51, 52, 53, -1, -1, -1, 48, 57, 56, 55, 54, -1, -1, -1, 80, 79, 73, 85, 89, -1, -1, -1,
		13, 76, 75, 74, 72, -1, -1, -1, 32, 17, 77, 78, 66, -1, -1, -1];
	var K_ENTER = 13, K_K = 75, K_SPACE = 32, K_Z = 90, K_S = 83, K_B = 66, K_G = 71, K_I = 73, K_W = 87, K_H = 72;
	var m_arrKeyCode = [16, 8, 41, 40, 56, 9, 60, 1, 17, 42, 12, 52];
	var m_arrSpare = [];

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	// the spare keys: the cursor keys 7 6 5 8, 0 the laser, X the pattern, M a smart bomb, N Inviso -
	// any not already chosen
	function Spares()
	{
		m_arrSpare = [];
		processArray([[35, P_UP], [36, P_DOWN], [28, P_LEFT], [34, P_RIGHT], [32, P_LASER], [2, P_PATTERN], [58, P_SMART], [59, P_INVISO]], function(arr_a)
		{
			if (m_arrKeyCode.indexOf(arr_a[0]) < 0) { m_arrSpare.push(arr_a); }
		});
	}

	function PadRead()
	{
		var intR = 0;
		var intI;
		for (intI = 0; intI < 12; intI++)
		{
			if (down(ZXKEY[m_arrKeyCode[intI]])) { intR |= (1 << intI); }
		}
		processArray(m_arrSpare, function(arr_a)
		{
			if (down(ZXKEY[arr_a[0]])) { intR |= arr_a[1]; }
		});
		// (the port's: the browser's arrow keys too)
		if (down(KEY_UP)) { intR |= P_UP; }
		if (down(KEY_DOWN)) { intR |= P_DOWN; }
		if (down(KEY_LEFT)) { intR |= P_LEFT; }
		if (down(KEY_RIGHT)) { intR |= P_RIGHT; }
		return intR;
	}

	// Scan(): the first key held (-1 none)
	function PadScan()
	{
		var intR = -1;
		for (var intC = 63; intC >= 0; intC--)
		{
			if ((ZXKEY[intC] >= 0) && down(ZXKEY[intC])) { intR = intC; }
		}
		return intR;
	}

	function KeyName(intCode_a)
	{
		var strR = '?ZXCV???ASDFG???QWERT???12345???09876???POIUY???-LKJH???--MNB'.charAt(intCode_a);
		if (intCode_a === 0) { strR = 'CAPS'; }
		if (intCode_a === 48) { strR = 'ENTER'; }
		if (intCode_a === 56) { strR = 'SPACE'; }
		if (intCode_a === 57) { strR = 'SYMBOL'; }
		return strR;
	}

	// ====================================================================================================
	// PAL.CLS: Layer 2's palette faded - 0 black ... 8 as drawn ... 16 white

	var m_intFade = 8;
	var m_arrFadeTab = [];

	function fadeCh(intV_a, intLv_a)
	{
		var intR = 0;
		if (intLv_a < 8)
		{
			intR = ((intV_a * intLv_a) >> 3) & 7;
		}
		else
		{
			intR = Math.min(7, intV_a + ((((7 - intV_a) * (intLv_a - 8)) >> 3) & 7));
		}
		return intR;
	}

	function fadeColour(intC_a, intLv_a)
	{
		var intB = (intC_a & 3) * 2;
		if (intB >= 6) { intB = 7; }
		return (fadeCh((intC_a >> 5) & 7, intLv_a) << 5) | (fadeCh((intC_a >> 2) & 7, intLv_a) << 2) | (fadeCh(intB, intLv_a) >> 1);
	}

	function PalFade(intN_a)
	{
		var intN = Math.max(0, Math.min(16, intN_a));
		m_intFade = intN;
		for (var intI = 0; intI < 256; intI++) { m_arrFadeTab[intI] = fadeColour(intI, intN); }
		m_objL2.setColours(m_arrFadeTab);
		m_objTitleL2.setColours(m_arrFadeTab);
		m_objBeamW.setColours(m_arrFadeTab);
		// the dots are Layer 2's too
		for (intI = 0; intI < ND; intI++) { m_objSlots.unanimate(dotSlot(intI), dotFrame(intI)); }
	}

	// ====================================================================================================
	// MAP.CLS: the tilemap - 40 x 32 cells over the whole 320 x 256 picture; rows 4-25 the play area
	// (paper lines 0-175), 26-27 the panel. A tile is drawn in its own palette row (the level's
	// attribute table: the image has them so) or, for text, in row r: tile 256 + r * 96 + code

	var m_arrCols = [], m_arrFacts = [];
	var ncols = 0, cm = 0, sx = 0, lo = 0, hi = 0, mrow = 0, mr1 = 7, mr2 = 9;
	var m_intTileImageL = 1, m_intTileImageV = 0;

	function MapPut(intX_a, intY_a, intT_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, 0);
	}

	// the tile number in a cell (text's tiles are the font's)
	function MapGet(intX_a, intY_a)
	{
		var intT = m_objGrid.get(intX_a, intY_a);
		if (intT >= 256) { intT = (intT - 256) % 96; }
		return intT;
	}

	function MapText(intX_a, intY_a, str_a)
	{
		for (var intI = 0; intI < str_a.length; intI++) { MapPut(intX_a + intI, intY_a, str_a.charCodeAt(intI)); }
	}

	function MapTextC(intX_a, intY_a, str_a, intRow_a)
	{
		for (var intI = 0; intI < str_a.length; intI++) { MapPut(intX_a + intI, intY_a, 256 + intRow_a * 96 + str_a.charCodeAt(intI)); }
	}

	function MapCls()
	{
		m_objGrid.clear(0);
	}

	function MapStart(intX_a)
	{
		cm = intX_a;
		lo = S3(cm) - 3;
		hi = lo;
		MapScroll(cm);
	}

	// the tilemap holds world columns lo .. hi - 1: 3 left of the paper to 36 on, written either way
	function Fill()
	{
		var intC = S3(cm);
		while (hi < intC + 37)
		{
			Column(hi);
			hi++;
			if (hi - lo > 40) { lo = hi - 40; }
		}
		while (lo > intC - 3)
		{
			lo--;
			Column(lo);
			if (hi - lo > 40) { hi = lo + 40; }
		}
	}

	function MapScroll(intX_a)
	{
		cm = intX_a;
		Fill();
		sx = cm - 32;
		while (sx >= 320) { sx -= 320; }
		if (sx < 0) { sx += 320; }
	}

	function MapShift(intD_a)
	{
		cm += intD_a;
		lo += S3(intD_a); hi += S3(intD_a);
	}

	// world column wc into map column wc mod 40 (outside the level: empty); a message's rows left alone
	function Column(intWC_a)
	{
		var arrCB = ((intWC_a >= 0) && (intWC_a < ncols)) ? m_arrCols[intWC_a] : null;
		var intMC = ((intWC_a % 40) + 40) % 40;
		for (var intK = 0; intK < 22; intK++)
		{
			var intRow = 4 + intK;
			if ((mrow === 0) || ((intRow !== mr1) && (intRow !== mr2)))
			{
				MapPut(intMC, intRow, (arrCB === null) ? 0 : arrCB[intK]);
			}
		}
	}

	// the tile at paper x, y (-32 .. 287, 0 .. 175; else 0) - Map.Solid's sum, and the dots' and the
	// bullets' column table's
	function TileAt(intX_a, intY_a)
	{
		var intR = 0;
		if ((intY_a >= 0) && (intY_a < 176) && (intX_a >= -32))
		{
			var intX = (intX_a + 32 + sx) % 320;
			intR = MapGet(intX >> 3, (intY_a + 32) >> 3);
		}
		return intR;
	}

	// the tile at paper x, y for your dots and beams: on the paper the tilemap's (TileAt), either
	// side of it in full screen the level's own column there (as Column writes it: outside the
	// level empty, a message's two rows empty while it shows)
	function TileAtW(intX_a, intY_a)
	{
		var intR = 0, intWC, intRow;
		if ((intX_a >= 0) && (intX_a < 256))
		{
			intR = TileAt(intX_a, intY_a);
		}
		else if ((intY_a >= 0) && (intY_a < 176))
		{
			intWC = S3(cam + intX_a);
			intRow = 4 + S3(intY_a);
			if ((intWC >= 0) && (intWC < ncols) && ((mrow === 0) || ((intRow !== mr1) && (intRow !== mr2))))
			{
				intR = m_arrCols[intWC][intRow - 4];
			}
		}
		return intR;
	}

	function Solid(intX_a, intY_a)
	{
		return TileAt(intX_a, intY_a) >= 128;
	}

	function FloorY(intX_a)
	{
		var intC = S3(intX_a);
		return ((intC < 0) || (intC >= ncols)) ? 176 : m_arrCols[intC][22];
	}

	function CeilY(intX_a)
	{
		var intC = S3(intX_a);
		return ((intC < 0) || (intC >= ncols)) ? 0 : m_arrCols[intC][23];
	}

	function Meta(intI_a)
	{
		return (intI_a < m_arrFacts.length) ? m_arrFacts[intI_a] : 0;
	}

	// MsgRows n: 1 rows 7 and 9 held still and cleared for a message, 2 rows 12 and 14; 0 the terrain back
	function MsgRows(intN_a)
	{
		var intK, intWC, intMC;
		if (intN_a !== mrow)
		{
			if (mrow !== 0)
			{
				for (intWC = lo; intWC < hi; intWC++)
				{
					if ((intWC >= 0) && (intWC < ncols))
					{
						intMC = ((intWC % 40) + 40) % 40;
						MapPut(intMC, mr1, m_arrCols[intWC][mr1 - 4]);
						MapPut(intMC, mr2, m_arrCols[intWC][mr2 - 4]);
					}
				}
			}
			mrow = intN_a;
			if (intN_a !== 0)
			{
				if (intN_a === 2) { mr1 = 12; mr2 = 14; } else { mr1 = 7; mr2 = 9; }
				for (intK = 0; intK < 40; intK++) { MapPut(intK, mr1, 0); MapPut(intK, mr2, 0); }
			}
		}
	}

	// Map.Still: no scroll (the title, the films)
	function MapStill()
	{
		sx = 0;
	}

	// the copper's list as bands of the tilemap: scrolled to line 175 of the paper, a message's two
	// rows and the panel still
	function tileBands()
	{
		var arrB = [];
		var intY = 32;
		var arrStill = [];
		if (mrow !== 0) { arrStill = [mr1 * 8, mr2 * 8]; }
		processArray(arrStill, function(intS_a)
		{
			arrB.push({ y:intY, h:intS_a - intY, scroll:sx });
			arrB.push({ y:intS_a, h:8, scroll:0 });
			intY = intS_a + 8;
		});
		arrB.push({ y:intY, h:208 - intY, scroll:sx });
		arrB.push({ y:208, h:48, scroll:0 });
		return arrB;
	}


	// ====================================================================================================
	// SPRITES: JSpriteSlots - the Next's 64 sprite slots (512-575) and its 64 bullet slots (576-703,
	// one per bullet record), under them all Layer 2's 512 dots (0-511), over them the dots' 20
	// targets and the laser's head (704-724: drawn as nothing, there to be touched). A library
	// sprite is what a thing is: its frames (a level's sprites in a palette row each: images
	// dm_s<level>_<row>, tools/ports/defmulti_gfx.py; frame n of the strip is pattern n - 1), its
	// animation (sequence and delay) and its hit box (sized to the original's tests)

	var m_objSlots = new JSpriteSlots(m_objSprites, 725);
	var DOT0 = 0, SL0 = 512, BUL0 = 576, TGT0 = 704, PROBE = 724;
	var SP_SHIP = SL0, SP_SPARK = SL0 + 8, SP_BOSS = SL0 + 9, SP_EN = SL0 + 26, SP_GUARD = SL0 + 62;

	function imgName(intPal_a)
	{
		return 'dm_s' + tset + '_' + intPal_a;
	}

	// the slot of record r's dot: the two halves (even records, odd) a range each
	function dotSlot(intR_a)
	{
		return DOT0 + (intR_a & 1) * 256 + (intR_a >> 1);
	}

	function itemSlot(intN_a)
	{
		return SL0 + ((intN_a < 6) ? 2 + intN_a : ((intN_a === 6) ? 25 : 63));
	}

	// Spr.Put: slot n shows library sprite strName_a at x, y (the 320 x 256 picture), in palette row
	// intPal_a, mirrored (the Next's flags: 8 across, 4 down), scaled; a frame stops its animation
	function Put(intN_a, intX_a, intY_a, strName_a, intFrame_a, intPal_a, intFlags_a, intScale_a)
	{
		var intFlags = (((intFlags_a & MIRRORX) !== 0) ? SPRITE_MIRRORX : 0) | (((intFlags_a & MIRRORY) !== 0) ? SPRITE_MIRRORY : 0);
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, imgName(intPal_a), intScale_a, intFlags);
	}

	function Hide(intN_a)
	{
		m_objSlots.hide(intN_a);
	}

	// Spr.HideRange 0, 64: all the Next's sprites 0-63
	function HideSlots()
	{
		m_objSlots.hideRange(SL0, 64);
	}

	// a library sprite
	function lib(strName_a, strImage_a, intW_a, intH_a, intIX_a, intIY_a, intIW_a, intIH_a, arrSeq_a, intDelay_a, intHBW_a, intHBH_a, intHBX_a, intHBY_a)
	{
		return { name:strName_a, classes:'dm', imagename:strImage_a, x:0, y:0, w:intW_a, h:intH_a, imagex:intIX_a, imagey:intIY_a, imagew:intIW_a, imageh:intIH_a,
			sequence:arrSeq_a, delay:intDelay_a, collisiontype:'hb', hbx:(intHBX_a === undefined) ? 0 : intHBX_a, hby:(intHBY_a === undefined) ? 0 : intHBY_a,
			hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	// a 16 x 16 pattern sprite (frame n: pattern n - 1)
	function pat(strName_a, arrSeq_a, intDelay_a, intHBW_a, intHBH_a)
	{
		return lib(strName_a, 'dm_s1_0', 16, 16, 0, 0, 16, 16, arrSeq_a, intDelay_a, intHBW_a, intHBH_a);
	}

	// a target's box: |x - bx| < w, |y - by| < h (drawn as nothing)
	function tgtName(intW_a, intH_a)
	{
		return 'tgt' + intW_a + '_' + intH_a;
	}

	function makeSprites()
	{
		var arrLib = [], arrWarp = [8], arrSizes = [[26, 26], [28, 20]];
		var intK;
		var BIG = 'dm_s1_0';
		for (intK = 0; intK < 8; intK++) { arrWarp.push(14); }
		for (intK = 0; intK < 8; intK++) { arrWarp.push(12); }
		for (intK = 0; intK < 8; intK++) { arrWarp.push(10); }
		for (intK = 0; intK < 7; intK++) { arrWarp.push(8); }
		arrWarp.push(0);
		// the ship (its flames flicker); its box the bullets' test: 9 x 7 about its middle
		arrLib.push(lib('ship', 'dm_s1_0', 32, 16, 0, 0, 32, 16, [1, 2, -1], 2, 9, 7));
		// the drones: two patterns every 4 frames; the box the one they touch you with (|dx| < kw + 4,
		// |dy| < kh + 3 against the ship's 8 x 6 middle)
		processArray([K_DART, K_ORB, K_SPIN, K_SWARM, K_MINER, K_SNIPER, K_MINE, K_MUTANT, K_DYNAMO], function(intKD_a)
		{
			arrLib.push(pat('k' + intKD_a, [kpat[intKD_a] + 1, kpat[intKD_a] + 2, -1], 4, kw[intKD_a] * 2, kh[intKD_a] * 2));
		});
		// a turret looks ahead (step 1) or up (step 3); a reactor part whole (1) or cracked (3)
		arrLib.push(pat('k' + K_TURRET, [S_TURRET + 1, -1, S_TURRET + 2, -3], 1, kw[K_TURRET] * 2, kh[K_TURRET] * 2));
		// the big ones: 32 x 32 (the top half over itself upside down)
		arrLib.push(lib('k' + K_HUNTER, BIG, 32, 32, 0, 80, 32, 32, [1, 2, -1], 4, kw[K_HUNTER] * 2, kh[K_HUNTER] * 2));
		arrLib.push(lib('k' + K_CARRIER, BIG, 32, 32, 0, 80, 32, 32, [3, 4, -1], 4, kw[K_CARRIER] * 2, kh[K_CARRIER] * 2));
		arrLib.push(lib('k' + K_REACTOR, BIG, 32, 32, 0, 80, 32, 32, [5, -1, 6, -3], 1, kw[K_REACTOR] * 2, kh[K_REACTOR] * 2));
		arrLib.push(pat('warp', arrWarp, 1, 0, 0));
		arrLib.push(pat('boom', [S_BOOM + 1, S_BOOM + 2, S_BOOM + 3, S_BOOM + 4, 0], 4, 0, 0));
		// pickups: touched within 14 across and 11 down of the ship's middle
		arrLib.push(pat('smallp', [S_SMALLP + 1, S_SMALLP + 2, S_SMALLP + 3, S_SMALLP + 4, -1], 2, 28, 22));
		arrLib.push(pat('bigp', [S_BIGP + 1, S_BIGP + 2, -1], 4, 28, 22));
		arrLib.push(pat('gem', [S_GEM + 1, S_GEM + 2, -1], 2, 28, 22));
		arrLib.push(pat('capsule', [S_ITEMP + 1, 0], 1, 28, 22));
		arrLib.push(pat('spark', [S_SPARK + 1, 0], 1, 0, 0));
		arrLib.push(pat('guard', [S_GUARD + 1, S_GUARD + 2, -1], 2, 0, 0));
		// the guardian (it rams you within 30 across, 28 down) and the giant mech (26, 20)
		arrLib.push(lib('boss', BIG, 64, 64, 0, 16, 64, 64, [1, 0], 1, 60, 56));
		arrLib.push(lib('mech', BIG, 64, 48, 64, 16, 64, 48, [1, 0], 1, 52, 40));
		// an enemy bullet: its middle (on the ship's box: a hit)
		arrLib.push(pat('bul', [1, 0], 1, 0, 0));
		// the films': a dart, a planet's piece, a nova
		arrLib.push(pat('fdart', [S_DART + 1, S_DART + 2, -1], 4, 0, 0));
		arrLib.push(lib('fdart2y', 'dm_s1_0', 16, 32, 0, 0, 16, 16, [S_DART + 1, S_DART + 2, -1], 4, 0, 0));
		arrLib.push(pat('piece', [S_BOOM + 1, S_BOOM + 2, S_BOOM + 3, S_BOOM + 4, -1], 6, 0, 0));
		arrLib.push(pat('nova', [S_BOOM + 1, S_BOOM + 2, S_BOOM + 3, S_BOOM + 4, 0], 4, 0, 0));
		// a dot: 2 x 2, a frame a colour (Layer 2's: dm_dots); its box its top left point
		arrLib.push(lib('dot', 'dm_dots', 2, 2, 0, 0, 2, 2, [1, 0], 1, 0, 0, 2, -2));
		// the targets (each drone's box + 2, the guardian's, the mech's) and the laser's head
		processArray([K_DART, K_ORB, K_SPIN, K_SWARM, K_MINER, K_TURRET, K_HUNTER, K_CARRIER, K_REACTOR, K_SNIPER, K_MINE, K_MUTANT, K_DYNAMO], function(intKD_a)
		{
			arrSizes.push([kw[intKD_a] + 2, kh[intKD_a] + 2]);
		});
		processArray(arrSizes, function(arr_a)
		{
			if (m_objSprites.getSpriteByName(tgtName(arr_a[0], arr_a[1])) === null)
			{
				m_objSprites.addSpritesToLibrary([lib(tgtName(arr_a[0], arr_a[1]), 'dm_dots', 16, 16, 0, 0, 2, 2, [1, 0], 1, arr_a[0] * 2, arr_a[1] * 2)]);
			}
		});
		arrLib.push(lib('probe', 'dm_dots', 16, 16, 0, 0, 2, 2, [1, 0], 1, 0, 0));
		m_objSprites.addSpritesToLibrary(arrLib);
	}

	// the ship's middle on the picture (the zones it touches drones and pickups with)
	function shipZone(intW_a, intH_a)
	{
		return { x:psx + 32 - intW_a / 2, y:psy + 32 - intH_a / 2, w:intW_a, h:intH_a };
	}

	function touches(intN_a, objZone_a)
	{
		return m_objSlots.collideRect(intN_a, objZone_a.x, objZone_a.y, objZone_a.w, objZone_a.h);
	}

	// ====================================================================================================
	// THE SINES (Bul.cls): 256 steps round, x 127

	var SIN = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3];
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];

	function Sin(intA_a)
	{
		var intA = intA_a & 255;
		return (intA < 128) ? SIN[intA] : -SIN[intA - 128];
	}

	// SinK(a, k): the sine of way a times k (0-255), / 16
	function SinK(intA_a, intK_a)
	{
		var intS = Sin(intA_a);
		var intM = (Math.abs(intS) * (intK_a & 255)) >> 4;
		return (intS < 0) ? -intM : intM;
	}

	// Aim(x, y, tx, ty): the way (0-255: 0 down, 64 right) from x, y to tx, ty
	function Aim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a;
		var intAX = Math.abs(intDX), intAY = Math.abs(intDY);
		var intT = 0, intR = 0;
		if ((intAX !== 0) || (intAY !== 0))
		{
			if (intAX <= intAY) { intT = ATN[idiv(intAX * 16, intAY)]; } else { intT = 64 - ATN[idiv(intAY * 16, intAX)]; }
			if (intDY >= 0)
			{
				intR = (intDX >= 0) ? intT : ((256 - intT) & 255);
			}
			else
			{
				intR = (intDX >= 0) ? 128 - intT : 128 + intT;
			}
		}
		return intR;
	}


	// ====================================================================================================
	// DOTS.CLS: your dots - 512 records, half of them moved a frame (twice as far), each a 2 x 2
	// sprite (Layer 2's: under every other sprite, faded with its palette; a frame a colour)

	var dl = [], dc = [], dvx = [], dvy = [], dX = [], dY = [], dd = [], drows = [], dcand = [], dkill = [], ddx = [], ddy = [];
	var m_arrFre = [];
	var m_intHalf = 0;
	var hit = [], bxs = [], m_arrGrid = [], bl = [];
	var hx = 0, hy = 0, nhit = 0, m_intDotCam = 0, m_intDotDY = 0;

	function dotFrame(intR_a)
	{
		return m_arrFadeTab[dc[intR_a]] + 1 + ((drows[intR_a] === 1) ? 256 : 0);
	}

	function DotsReset()
	{
		m_arrFre = [];
		for (var intR = 0; intR < ND; intR++)
		{
			dl[intR] = 0; m_arrFre.push(intR);
		}
		m_objSlots.hideRange(DOT0, ND);
	}

	// Clear(): every dot gone at its next turn; how many there were
	function DotsClear()
	{
		var intN = 0;
		for (var intR = 0; intR < ND; intR++)
		{
			if (dl[intR] !== 0) { dl[intR] = 1; intN++; }
		}
		return intN;
	}

	// Wipe c: all of Layer 2 colour c, no dots, no beams
	function DotsWipe(intC_a)
	{
		m_objL2.clear(intC_a);
		m_objBeamW.clear(0);
		DotsReset();
		for (var intB = 0; intB < 8; intB++) { bml[intB] = 0; }
	}

	function DotsCount()
	{
		return ND - m_arrFre.length;
	}

	// Burst x, y, n, a, step, spd, amp, petals, r, twist, life, colour, dmg: the k-th goes way a + k *
	// step from r pixels out that way, turned twist more as it flies, at spd + amp * |sin of its way *
	// petals| / 128 16ths of a pixel a frame
	function DotsBurst(intX_a, intY_a, intN_a, intA_a, intStp_a, intSpd_a, intAmp_a, intPetals_a, intR_a, intTwist_a, intLife_a, intC_a, intDmg_a)
	{
		var intA = intA_a & 255;
		var intLife = ((intLife_a & 255) >> 1) + (intLife_a & 1);
		var intK = 0;
		var intN = intN_a & 255;
		var intS, intDA, intVX, intVY, intPX, intPY, intR;
		while ((intK < intN) && (m_arrFre.length > 0))
		{
			intS = Math.min(255, (((Math.abs(Sin((intA * (intPetals_a & 255)) & 255)) * (intAmp_a & 255)) >> 7) & 255) + (intSpd_a & 255));
			intDA = (intA + intTwist_a) & 255;
			intVX = (Sin(intDA) * intS) >> 2;
			intVY = (Sin(intDA + 64) * intS) >> 2;
			intPX = (intX_a + ((Sin(intA) * (intR_a & 255)) >> 7)) & 0xFFFF;
			intPY = (intY_a & 255) + ((Sin(intA + 64) * (intR_a & 255)) >> 7);
			if ((intPY >= 0) && (intPY < 176))
			{
				intR = m_arrFre.pop();
				dl[intR] = intLife; dc[intR] = intC_a & 255; dvx[intR] = intVX; dvy[intR] = intVY;
				dX[intR] = intPX * 256 + 128; dY[intR] = intPY * 256 + 128; dd[intR] = intDmg_a & 255;
			}
			intA = (intA + intStp_a) & 255;
			intK++;
		}
	}

	// AddBox n, x, y, w, h: a target for GridBuild
	function AddBox(intN_a, intX_a, intY_a, intW_a, intH_a)
	{
		if (bl.length < 20) { bl.push([intN_a, WideOn() ? intX_a : (intX_a & 255), intY_a & 255, intW_a & 255, intH_a & 255]); }
	}

	// in full screen a target's box can be shown either side of the paper: a target's left .. right
	// edge for its box to be on (the normal mode: the paper's, as the Next has it)
	function boxL(intW_a)
	{
		return (WideL() > 0) ? -WideL() - intW_a : 0;
	}

	function boxR(intW_a)
	{
		return (WideR() > 0) ? 255 + WideR() + intW_a : 255;
	}

	// GridBuild: the targets into the grid (16 x 11 cells of 16 x 16; where two overlap, the later)
	// and onto their unseen box sprites (the hit: |x - bx| < w, |y - by| < h)
	function GridBuild()
	{
		var intI;
		for (intI = 0; intI < 176; intI++) { m_arrGrid[intI] = 0; }
		processArray(bl, function(arr_a)
		{
			var intN = arr_a[0], intX = arr_a[1], intY = arr_a[2], intW = arr_a[3], intH = arr_a[4];
			var intC0, intC1, intR0, intR1, intRow, intCol;
			bxs[intN] = arr_a;
			m_objSlots.put(TGT0 + intN, intX + 24, intY + 24, tgtName(intW, intH), 1, 'dm_dots');
			intC0 = ((intX - intW < 0) ? 0 : intX - intW) >> 4;
			intC1 = ((intX + intW > 255) ? 255 : intX + intW) >> 4;
			intR0 = ((intY - intH < 0) ? 0 : intY - intH) & 0xF0;
			intR1 = ((intY + intH > 175) ? 175 : intY + intH) & 0xF0;
			for (intRow = intR0; intRow <= intR1; intRow += 16)
			{
				for (intCol = intC0; intCol <= intC1; intCol++) { m_arrGrid[intRow | intCol] = intN + 1; }
			}
		});
	}

	// Hits(n): the damage target n took since the last
	function Hits(intN_a)
	{
		var intH = hit[intN_a];
		hit[intN_a] = 0;
		return intH;
	}

	// a dot (or the laser's head) at paper x, y: does it touch the target in its cell? Then its
	// damage is given
	function targetHit(intX_a, intY_a, intDmg_a, intSlot_a)
	{
		var intN = -1;
		var blnHit = false;
		if ((intX_a >= 0) && (intX_a < 256))
		{
			intN = m_arrGrid[(intY_a & 0xF0) | (intX_a >> 4)] - 1;
		}
		else
		{
			// (full screen, off the paper: no grid there - every target asked, the later where two touch)
			processArray(bl, function(arr_a)
			{
				if (m_objSlots.collide(intSlot_a, TGT0 + arr_a[0])) { intN = arr_a[0]; }
			});
		}
		if ((intN >= 0) && m_objSlots.collide(intSlot_a, TGT0 + intN))
		{
			blnHit = true;
			hit[intN] = Math.min(255, hit[intN] + intDmg_a);
			hx = intX_a; hy = intY_a;
			nhit++;
		}
		return blnHit;
	}

	// Step cam: half the dots moved (one showRange: each dot's own sums give where it's got to),
	// gone off the paper or into rock; then each asked whether it touches the target in its cell;
	// the gone ones freed in record order (the free records are a stack)
	function DotsStep(intCam_a)
	{
		var intH, intFirst, intI, intR;
		var blnW = WideOn();
		nhit = 0;
		m_intDotCam = intCam_a;
		m_intHalf ^= 1;
		intH = m_intHalf;
		intFirst = DOT0 + intH * 256;
		m_objSlots.showRange(intFirst, 256, function(intI_a, intN_a)
		{
			var intR = intI_a * 2 + intH;
			var intYY, intD;
			dkill[intR] = false;
			if (dl[intR] !== 0)
			{
				dl[intR]--;
				if (dl[intR] === 0)
				{
					dkill[intR] = true;
				}
				else
				{
					dX[intR] = (dX[intR] + dvx[intR]) & 0xFFFFFF;
					dY[intR] = (dY[intR] + dvy[intR]) & 0xFFFF;
					intYY = dY[intR] >> 8;
					intD = ((dX[intR] >> 8) - intCam_a) & 0xFFFF;
					// (full screen: on out to the edges of the world shown)
					if (blnW) { intD = (intD << 16) >> 16; }
					if ((intYY >= 176) || (blnW ? ((intD < -WideL()) || (intD >= 254 + WideR())) : (intD >= 254)) || (TileAtW(intD, intYY) >= 128))
					{
						dkill[intR] = true;
					}
					else
					{
						ddx[intR] = intD; ddy[intR] = intYY;
						drows[intR] = ((intYY & 31) === 31) ? 1 : 2;
					}
				}
			}
			return 32 + ddx[intR];
		}, function(intI_a)
		{
			return 32 + ddy[intI_a * 2 + intH];
		});
		for (intI = 0; intI < 256; intI++)
		{
			intR = intI * 2 + intH;
			if ((dl[intR] !== 0) && !dkill[intR])
			{
				m_objSlots.unanimate(intFirst + intI, dotFrame(intR));
				if (targetHit(ddx[intR], ddy[intR], dd[intR], intFirst + intI)) { dkill[intR] = true; }
			}
			if (dkill[intR])
			{
				dl[intR] = 0;
				m_arrFre.push(intR);
			}
			if (dl[intR] === 0) { m_objSlots.hide(intFirst + intI); }
		}
	}

	// ---- the laser's beams: 8 records, drawn into Layer 2 as lines (white at the head to red)
	var bml = [0, 0, 0, 0, 0, 0, 0, 0], bmd = [], bmX = [], bmY = [], bmvx = [], bmvy = [], bmdrawn = [], bmhx = [], bmhy = [], bmtx = [], bmty = [];
	var BEAMCOLS = [0xFF, 0xFC, 0xF4, 0xE0];

	function Beam(intX_a, intY_a, intVX_a, intVY_a, intLife_a, intDmg_a)
	{
		var blnDone = false;
		for (var intI = 0; intI < 8; intI++)
		{
			if (!blnDone && (bml[intI] === 0))
			{
				blnDone = true;
				bml[intI] = intLife_a & 255; bmd[intI] = intDmg_a & 255;
				bmX[intI] = (intX_a & 0xFFFF) * 256 + 128; bmY[intI] = (intY_a & 255) * 256 + 128;
				bmvx[intI] = ((intVX_a & 0xFFFF) << 16) >> 16; bmvy[intI] = ((intVY_a & 0xFFFF) << 16) >> 16;
				bmdrawn[intI] = 0;
			}
		}
	}

	function BeamsOff()
	{
		for (var intI = 0; intI < 8; intI++)
		{
			if (bml[intI] !== 0) { bml[intI] = 1; }
		}
	}

	// a line from x, y by dx, dy (Bresenham, its length the larger): colour 0 rubs it out, else the
	// beam's colours a quarter each; lines 176 on not drawn
	function beamLine(intX_a, intY_a, intDX_a, intDY_a, blnDraw_a)
	{
		// (full screen: x isn't wrapped round the paper - off it, the beam goes on into the side strip)
		var blnW = WideOn();
		var intX = blnW ? intX_a : (intX_a & 255), intY = intY_a & 255;
		var intAX = Math.abs(intDX_a), intAY = Math.abs(intDY_a);
		var intSX = (intDX_a < 0) ? -1 : 1, intSY = (intDY_a < 0) ? -1 : 1;
		var intCnt = Math.max(intAX, intAY);
		var intErr, intQ, intQN, intCI = 0;
		if (intCnt === 0) { intCnt = 1; }
		intErr = intCnt >> 1;
		intQ = intCnt >> 2;
		if (intQ === 0) { intQ = 1; }
		intQN = intQ;
		while (intCnt > 0)
		{
			if (intY < 176)
			{
				if (blnW) { beamPlotW(intX, intY, blnDraw_a ? BEAMCOLS[intCI] : 0); } else { m_objL2.plot(intX, intY, blnDraw_a ? BEAMCOLS[intCI] : 0); }
			}
			intQN--;
			if (intQN === 0)
			{
				if (intCI < 3) { intCI++; }
				intQN = intQ;
			}
			if (intAY < intAX)
			{
				intX = blnW ? intX + intSX : ((intX + intSX) & 255);
				intErr -= intAY;
				if (intErr < 0) { intErr += intAX; intY = (intY + intSY) & 255; }
			}
			else
			{
				intY = (intY + intSY) & 255;
				intErr -= intAX;
				if (intErr < 0) { intErr += intAY; intX = blnW ? intX + intSX : ((intX + intSX) & 255); }
			}
			intCnt--;
		}
	}

	// full screen: a beam's point at paper x, y - on the paper into Layer 2, either side of it (as far
	// as the world is shown) into the side strip
	function beamPlotW(intX_a, intY_a, intC_a)
	{
		if ((intX_a >= 0) && (intX_a < 256))
		{
			m_objL2.plot(intX_a, intY_a, intC_a);
		}
		else if ((intX_a >= -WideL()) && (intX_a < 256 + WideR()))
		{
			m_objBeamW.plot(intX_a + 128, intY_a, intC_a);
		}
	}

	// every drawn beam rubbed out (the screen's shape about to change: drawn one way, it's rubbed out
	// the same way)
	function BeamsRub()
	{
		for (var intI = 0; intI < 8; intI++)
		{
			if ((bml[intI] !== 0) && (bmdrawn[intI] !== 0))
			{
				bmdrawn[intI] = 0;
				beamLine(bmhx[intI], bmhy[intI], bmtx[intI], bmty[intI], false);
			}
		}
		m_objBeamW.clear(0);
	}

	// (paper x, y): solid, or a target hit (its damage given)
	function beamTest(intX_a, intY_a, intDmg_a)
	{
		var blnR = TileAtW(intX_a, intY_a) >= 128;
		if (!blnR)
		{
			m_objSlots.put(PROBE, intX_a + 24, intY_a + 24, 'probe', 1, 'dm_dots');
			blnR = targetHit(intX_a, intY_a, intDmg_a, PROBE);
		}
		return blnR;
	}

	// Beams: after Step - each rubbed out, moved, checked at its head and half a frame back, drawn
	function Beams()
	{
		var intI, intY, intD, intVH, intYH, intX2, intY2, blnKill;
		var blnW = WideOn();
		for (intI = 0; intI < 8; intI++)
		{
			if (bml[intI] !== 0)
			{
				if (bmdrawn[intI] !== 0)
				{
					bmdrawn[intI] = 0;
					beamLine(bmhx[intI], bmhy[intI], bmtx[intI], bmty[intI], false);
				}
				bml[intI]--;
				if (bml[intI] !== 0)
				{
					bmX[intI] = (bmX[intI] + bmvx[intI]) & 0xFFFFFF;
					bmY[intI] = (bmY[intI] + bmvy[intI]) & 0xFFFF;
					intY = bmY[intI] >> 8;
					intD = ((bmX[intI] >> 8) - m_intDotCam) & 0xFFFF;
					intVH = (((bmvx[intI] >> 8) & 255) << 24) >> 24;
					intYH = (((bmvy[intI] >> 8) & 255) << 24) >> 24;
					// (full screen: on out to the edges of the world shown)
					if (blnW) { intD = (intD << 16) >> 16; }
					blnKill = (intY >= 176) || (blnW ? ((intD < -WideL()) || (intD >= 254 + WideR())) : (intD >= 254));
					if (!blnKill) { blnKill = beamTest(intD, intY, bmd[intI]); }
					if (!blnKill)
					{
						intX2 = blnW ? (intD - (intVH >> 1)) : ((intD - (intVH >> 1)) & 255);
						intY2 = (intY - (intYH >> 1)) & 255;
						if (intY2 < 176) { blnKill = beamTest(intX2, intY2, bmd[intI]); }
					}
					if (blnKill)
					{
						bml[intI] = 0;
					}
					else
					{
						bmhx[intI] = intD; bmhy[intI] = intY;
						bmtx[intI] = ((((-intVH * 2) & 255) << 24) >> 24);
						bmty[intI] = ((((-intYH * 2) & 255) << 24) >> 24);
						bmdrawn[intI] = 1;
						beamLine(intD, intY, bmtx[intI], bmty[intI], true);
					}
				}
			}
		}
	}

	// Shift d: every dot and beam d pixels along the world (open space's wrap)
	function DotsShift(intD_a)
	{
		var intI;
		for (intI = 0; intI < 8; intI++)
		{
			if (bml[intI] !== 0) { bmX[intI] = (bmX[intI] + intD_a * 256) & 0xFFFFFF; }
		}
		for (intI = 0; intI < ND; intI++)
		{
			if (dl[intI] !== 0) { dX[intI] = (dX[intI] + intD_a * 256) & 0xFFFFFF; }
		}
	}

	// ====================================================================================================
	// BUL.CLS: the enemy bullets - 128 records; on the Next 64 hardware sprites shown twice a frame
	// (above line 88 at the frame's start, the copper writing the same 64 with those below), so 64
	// up and 64 down at most can be seen; all of them move and hit

	var bon = [], bpal = [], bulvx = [], bulvy = [], bX = [], bY = [], bdx = [], bdy = [];
	var m_arrBFre = [];
	var hitF = 0, live = 0;

	function BulReset()
	{
		m_arrBFre = [];
		for (var intR = 0; intR < NB; intR++) { bon[intR] = 0; m_arrBFre.push(intR); }
		m_objSlots.hideRange(BUL0, NB);
		live = 0;
	}

	// Clear(): every bullet gone (a nova, a death, the guard): how many there were
	function BulClear()
	{
		var intN = 0;
		for (var intR = 0; intR < NB; intR++)
		{
			if (bon[intR] !== 0)
			{
				bon[intR] = 0; intN++;
				m_arrBFre.push(intR);
				Hide(BUL0 + intR);
			}
		}
		return intN;
	}

	// Burst x, y, n, a, step, spd, pat, pal: the k-th going way a + k * step at sin * spd / 8
	function BulBurst(intX_a, intY_a, intN_a, intA_a, intStp_a, intSpd_a, intPat_a, intPal_a)
	{
		var intA = intA_a & 255;
		var intN = intN_a & 255;
		var intK = 0;
		var intR, intS, intC;
		while ((intK < intN) && (m_arrBFre.length > 0))
		{
			intS = Sin(intA); intC = Sin(intA + 64);
			intR = m_arrBFre.pop();
			bon[intR] = 1;
			bulvx[intR] = (intS < 0) ? -((-intS * (intSpd_a & 255)) >> 3) : ((intS * (intSpd_a & 255)) >> 3);
			bulvy[intR] = (intC < 0) ? -((-intC * (intSpd_a & 255)) >> 3) : ((intC * (intSpd_a & 255)) >> 3);
			bX[intR] = (intX_a & 0xFFFF) * 256 + 128;
			bY[intR] = (intY_a & 255) * 256 + 128;
			// its look now; it's shown from its first move
			Put(BUL0 + intR, 0, 0, 'bul', (intPat_a & 254) + 1, intPal_a & 15, 0);
			Hide(BUL0 + intR);
			intA = (intA + intStp_a) & 255;
			intK++;
		}
	}

	// Step px, py, cam: the bullet pattern moved - one showRange over the 128, each one's place from
	// its own fixed point sums; gone off the paper or into rock; then "do any touch the ship?"
	// (px, py 0: no ship). On the Next only 64 above line 88 and 64 below can be seen at once (the
	// copper's multiplexing); here every one is drawn
	function BulStep(intPX_a, intPY_a, intCam_a)
	{
		var intR;
		hitF = 0; live = 0;
		m_objSlots.showRange(BUL0, NB, function(intR_a)
		{
			var intY, intD;
			if (bon[intR_a] !== 0)
			{
				bX[intR_a] = (bX[intR_a] + bulvx[intR_a]) & 0xFFFFFF;
				bY[intR_a] = (bY[intR_a] + bulvy[intR_a]) & 0xFFFF;
				intY = bY[intR_a] >> 8;
				intD = ((bX[intR_a] >> 8) - intCam_a) & 0xFFFF;
				if ((intY >= 176) || (intD >= 256) || (TileAt(intD, intY) >= 128))
				{
					bon[intR_a] = 0;
					m_arrBFre.push(intR_a);
				}
				else
				{
					live++;
					bdx[intR_a] = intD; bdy[intR_a] = intY;
				}
			}
			return bdx[intR_a] + 24;
		}, function(intR_a)
		{
			return bdy[intR_a] + 24;
		});
		for (intR = 0; intR < NB; intR++)
		{
			if (bon[intR] === 0) { Hide(BUL0 + intR); }
		}
		if ((intPX_a !== 0) || (intPY_a !== 0))
		{
			if (m_objSlots.collideRange(SP_SHIP, BUL0, NB).length > 0) { hitF = 1; }
		}
	}

	function BulShift(intD_a)
	{
		for (var intR = 0; intR < NB; intR++)
		{
			if (bon[intR] !== 0) { bX[intR] = (bX[intR] + intD_a * 256) & 0xFFFFFF; }
		}
	}

	// ====================================================================================================
	// PLAY.CLS: a frame of play

	function AddScore(intN_a)
	{
		score += intN_a;
		scoreDirty = 1;
		if (score >= nextBonus)
		{
			nextBonus += 10000;
			if (smarts < 9) { smarts++; }
			if (guards < 9) { guards++; }
			invE = Math.min(450, invE + 150);
			Panel(6);
		}
		if (score >= nextExtend)
		{
			lives++; Panel(6);
			nextExtend += 50000;
			SfxPlay(2, 50, -1, 15, 40, 0);
		}
	}

	// the scanner: the whole corridor in 32 cells (64 halves) - you, the drones, the paper's view
	function Scanner()
	{
		var intC, intM, intK;
		for (intC = 0; intC < 32; intC++) { scn[intC] = 0; }
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			if ((intK > 0) && (intK < K_PART))
			{
				intC = S4(ex[intM]);
				if ((intC >= 0) && (intC < wid))
				{
					intC = Math.min(63, S3(S2(S4(intC) * 21)));
					scn[S1(intC)] |= (1 + (intC & 1));
				}
			}
		}
		if (bossOn)
		{
			intC = Math.min(63, S3(S2(S4(bwx) * 21)));
			scn[S1(intC)] |= 3;
		}
		if (alive)
		{
			intC = Math.min(31, S4(S3(S2(S4(S4(pwx)) * 21)) + 1));
			scn[intC] |= 4;
		}
		intC = S4(S3(S2(S4(cam) * 21)));
		intM = Math.min(31, S4(S3(S2(S4(cam + 255) * 21))));
		while (intC <= intM)
		{
			scn[intC] |= 8;
			intC++;
		}
		for (intC = 0; intC < 32; intC++)
		{
			if (scn[intC] !== sco[intC])
			{
				MapPut(4 + intC, 27, T_SCAN + scn[intC]);
				sco[intC] = scn[intC];
			}
		}
	}

	// one frame of the play (the Next's Show at its end)
	function Tick()
	{
		var intN;
		kp = PadRead();
		PlayerMove();
		Camera();
		Waves();
		Enemies();
		if (bossOn) { BossUpdate(); }
		if (mN > 0) { MechsUpdate(); }
		GridBuild();
		Weapons();
		DotsStep(cam);
		Beams();
		if (alive)
		{
			// (the ship where it is now: the bullets ask if they touch it)
			m_objSlots.move(SP_SHIP, psx + 16, psy + 24);
			BulStep(psx, psy, cam);
			if (hitF)
			{
				if ((inv === 0) && (guardT === 0) && (blossT === 0) && (invOn === 0)) { Die(); }
			}
		}
		else
		{
			BulStep(0, 0, cam);
		}
		if (nhit > 0)
		{
			sparkT = 3;
			Put(SP_SPARK, hx + 24, hy + 24, 'spark', undefined, PL_LIGHT, 0);
		}
		if (sparkT > 0)
		{
			sparkT--;
			if (sparkT === 0) { Hide(SP_SPARK); }
		}
		Items();
		NovaUpdate();
		ArmsUpdate();
		DrawPlayer();
		if (multT > 0)
		{
			multT--;
			if (multT === 0) { mult = 1; Panel(5); }
		}
		scanT++;
		if (scanT >= 6)
		{
			scanT = 0;
			Scanner();
			intN = DotsCount() + live;
			if (intN > peak) { peak = intN; }
		}
		if (((frames & 3) === 0) && scoreDirty) { Panel(1); }
		if (msgT > 0)
		{
			msgT--;
			if (msgT === 0) { Msg('', -2); }
		}
		// the sprites' own animations a step on (the game's frame)
		m_objSlots.step();
		Show();
	}

	function PlayerMove()
	{
		var intMX, intVY;
		if (alive === 0)
		{
			if (deadT > 0) { deadT--; }
		}
		else
		{
			if (inv > 0) { inv--; }
			opwx = pwx; opys = pys;
			intMX = 44 + speed * 10;
			if ((kp & P_RIGHT) !== 0)
			{
				face = 0; pvx += 5;
			}
			else if ((kp & P_LEFT) !== 0)
			{
				face = 1; pvx -= 5;
			}
			else
			{
				pvx -= S3(pvx + 4);
			}
			pvx = Math.max(-intMX, Math.min(intMX, pvx));
			intVY = 30 + speed * 6;
			if ((kp & P_UP) !== 0) { pys -= intVY; }
			if ((kp & P_DOWN) !== 0) { pys += intVY; }
			pys = Math.max(YMIN * 16, Math.min(YMAX * 16, pys));
			pwx += pvx;
			if (pwx < 256) { pwx = 256; pvx = 0; }
			if (pwx > L4(wid - 16)) { pwx = L4(wid - 16); pvx = 0; }
			psy = S4(pys);
		}
	}

	function DrawPlayer()
	{
		var intFl, intFc;
		if ((alive === 0) || ((inv > 0) && ((frames & 2) !== 0)) || ((invOn !== 0) && ((frames & 1) !== 0)))
		{
			Hide(SP_SHIP);
		}
		else
		{
			intFl = 0;
			intFc = face;
			if (blossT > 0)
			{
				// the Blossom: spinning (the mirrors in turn)
				intFc = (frames >> 1) & 1;
				if ((frames & 4) !== 0) { intFl = MIRRORY; }
			}
			// (the ship facing left: its two patterns swapped and mirrored - the whole 32 x 16 mirrored)
			Put(SP_SHIP, psx + 16, psy + 24, 'ship', undefined, (invOn !== 0) ? PL_LIGHT : PL_SHIP, intFl | ((intFc !== 0) ? MIRRORX : 0));
			m_objSlots.animate(SP_SHIP, 1);
		}
	}

	function ArmsUpdate()
	{
		var intN;
		if (guardT > 0)
		{
			guardT--;
			intN = BulClear();
			if (intN > 0)
			{
				AddScore(intN * 10);
				gEat += intN;
				while (gEat >= 4)
				{
					gEat -= 4;
					Drop(I_GEM, S4(pwx) + rnd(40) - 20, psy - 10 + rnd(20));
				}
			}
			if ((guardT > 24) || ((guardT & 2) !== 0))
			{
				Put(SP_GUARD, psx + 16, psy + 16, 'guard', undefined, PL_CYAN, 0, 2);
				m_objSlots.animate(SP_GUARD, 1);
			}
			else
			{
				Hide(SP_GUARD);
			}
		}
		if (blossT > 0) { blossT--; }
		if (hypT > 0)
		{
			hypT--;
			if (hypT === 0) { PalFade(8); }
		}
	}

	function NovaUpdate()
	{
		if (novaT !== 0)
		{
			novaT--;
			if (novaT > 32)
			{
				PalFade(16 - (40 - novaT));
			}
			else if (novaT === 32)
			{
				PalFade(8);
			}
			if (novaT > 20) { BulClear(); }
		}
	}

	// the paper follows the ship: a third in from the side it flies from
	function Camera()
	{
		var intT, intD;
		intT = (face === 0) ? S4(pwx) - 88 : S4(pwx) - 168;
		intD = Math.max(-12, Math.min(12, S2(intT - cam)));
		if ((intD === 0) && (intT !== cam)) { intD = (intT > cam) ? 1 : -1; }
		cam += intD;
		if (cam < 0) { cam = 0; }
		if (cam > wid - 256) { cam = wid - 256; }
		MapScroll(cam);
		psx = S4(pwx) - cam;
		// the terrain at the nose, the middle, the tail: while you flash it stops you instead
		if (alive)
		{
			intD = (face === 0) ? 7 : -7;
			if (Solid(psx + intD, psy) || Solid(psx, psy + 2) || Solid(psx - intD, psy - 1))
			{
				if (inv > 0)
				{
					pwx = opwx; pys = opys; pvx = 0; psy = S4(pys); psx = S4(pwx) - cam;
				}
				else
				{
					Die();
				}
			}
		}
	}

	// the arms: one press, one go for the pattern key, the smart bomb, the guard, hyperspace, the
	// Blossom; the laser and the spray held
	function Weapons()
	{
		var intX, intD, intNK, intK, blnGo = true;
		if (alive !== 0)
		{
			intNK = kp & ~kWas;
			kWas = kp;
			if ((intNK & P_PATTERN) !== 0)
			{
				weapon++;
				if (weapon > W_ALL) { weapon = W_RING; }
				Panel(2);
				SfxPlay(2, 40, 0, 12, 6, 0);
			}
			if (((intNK & P_SMART) !== 0) && (smarts > 0) && (novaT === 0)) { SmartBomb(); }
			if (((intNK & P_GUARD) !== 0) && (guards > 0) && (guardT === 0))
			{
				guards--; guardT = 100; Panel(6);
				SfxPlay(2, 90, 3, 13, 20, 0);
			}
			if (((intNK & P_HYPER) !== 0) && (hypT === 0) && (blossT === 0))
			{
				Hyperspace();
				blnGo = false;
			}
		}
		else
		{
			blnGo = false;
		}
		if (blnGo)
		{
			if (((intNK & P_BLOSSOM) !== 0) && (energy >= 96) && (blossT === 0))
			{
				blossT = 50; energy = 0; Panel(4);
				SfxPlay(1, 25, 1, 15, 60, 1);
			}
			invOn = 0;
			if (((kp & P_INVISO) !== 0) && (invE > 0))
			{
				invOn = 1; invE--;
				if ((invE % 25) === 0) { Panel(6); }
			}
			intX = S4(pwx);
			intD = (power >= 4) ? 2 : 1;
			if (lasT > 0) { lasT--; }
			if (blossT > 0)
			{
				// the Death Blossom: the laser every way, every pattern (half the patterns a frame, a beam
				// every other)
				if ((frames & 1) !== 0)
				{
					intK = rnd(256);
					Beam(intX, psy, SinK(intK, 160) * 2, SinK(intK + 64, 160) * 2, 18, 3 + power);
				}
				for (intK = frames & 1; intK <= 5; intK += 2) { Pattern(intK, intX, intD); }
			}
			else
			{
				if (((kp & P_LASER) !== 0) && (lasT === 0)) { Laser(intX); }
				if ((kp & P_SPRAY) === 0)
				{
					for (intK = 0; intK <= 5; intK++) { pt[intK] = 0; }
				}
				else if (weapon === W_ALL)
				{
					for (intK = 0; intK <= 5; intK++) { Pattern(intK, intX, intD); }
				}
				else
				{
					Pattern(weapon, intX, intD);
				}
			}
		}
	}

	function Laser(intX_a)
	{
		var intX = intX_a, intV, intDm;
		if (face === 0) { intV = 12 * 256; intX += 12; } else { intV = -12 * 256; intX -= 12; }
		intDm = 2 + S1(power);
		if ((power === 1) || (power === 5)) { Beam(intX, psy, intV, 0, 26, intDm); }
		if (power >= 2) { Beam(intX, psy - 3, intV, 0, 26, intDm); Beam(intX, psy + 3, intV, 0, 26, intDm); }
		if (power >= 3)
		{
			if ((frames & 4) !== 0) { Beam(intX, psy, intV, 384, 22, intDm); } else { Beam(intX, psy, intV, -384, 22, intDm); }
		}
		if (power >= 5) { Beam(intX, psy, intV, 640, 20, intDm); Beam(intX, psy, intV, -640, 20, intDm); }
		lasT = (power >= 4) ? 4 : 6;
		SfxPlay(0, 30, 6, 10, 4, 0);
	}

	function SmartBomb()
	{
		var intM, intK, intX;
		smarts--; Panel(6);
		novaT = 40;
		DotsBurst(S4(pwx), psy, 64, 0, 4, 20, 0, 0, 4, 0, 70, 0xFF, 4);
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			if ((intK > 0) && (intK < K_PART) && (ews[intM] === 0))
			{
				intX = S4(ex[intM]) - cam;
				if ((intX > -16) && (intX < 272) && (khp[intK] > 0)) { ehp[intM] = 0; ef[intM] = 4; }
			}
		}
		if (bossOn) { bossHP -= idiv(bossMax, 8); }
		SfxPlay(1, 40, 2, 15, 40, 1);
	}

	// one pattern w (from x, psy; d its damage) on its own timer pt(w)
	function Pattern(intW_a, intX_a, intD_a)
	{
		var intT, intN, intA, intS;
		pt[intW_a]++;
		intT = pt[intW_a];
		switch (intW_a)
		{
			case W_RING:
				if ((intT >= 7 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					DotsBurst(intX_a, psy, 24, ang, 11, 26, 0, 0, 6, 0, 84, 0x1F, intD_a);
					ang += 5;
					SfxPlay(0, 60, 4, 8, 3, 0);
				}
				break;
			case W_FLOWER:
				if ((intT >= 8 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					DotsBurst(intX_a, psy, 32, ang, 8, 12, 36, 3, 4, 0, 96, 0xE7, intD_a);
					ang += 3;
					SfxPlay(0, 90, -4, 8, 3, 0);
				}
				break;
			case W_SPIRAL:
				intN = 3 + S1(power);
				intS = idiv(256 + S1(intN), intN);
				DotsBurst(intX_a, psy, intN, ang, intS, 30, 0, 0, 6, 0, 84, 0xFC, intD_a);
				ang += 11;
				if ((intT & 3) === 1) { SfxPlay(0, 120, -8, 6, 2, 0); }
				break;
			case W_WAVE:
				intA = SinK(intT * 9, 3 + S1(power));
				intN = (face === 0) ? 64 : 192;
				DotsBurst(intX_a, psy, 2, intN + intA, -intA - intA, 44, 0, 0, 8, 0, 64, 0x5C, intD_a);
				DotsBurst(intX_a, psy, 2, intN + 128 - intA, intA + intA, 36, 0, 0, 4, 0, 60, 0x5C, intD_a);
				if (power >= 3) { DotsBurst(intX_a, psy, 2, intN + intA + intA, -intA * 4, 40, 0, 0, 4, 0, 60, 0x9C, intD_a); }
				if ((intT & 3) === 1) { SfxPlay(0, 70, 6, 6, 2, 0); }
				break;
			case W_VORTEX:
				intN = 5 + S1(power);
				intS = idiv(256 + S1(intN), intN);
				DotsBurst(intX_a, psy, intN, ang, intS, 24, 0, 0, 22, 64, 84, 0xAB, intD_a);
				ang += 9;
				if ((intT & 7) === 1) { SfxPlay(0, 50, 3, 7, 3, 0); }
				break;
			default:
				if ((intT >= 11 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					DotsBurst(intX_a, psy, 12, ang, 21, 14, 0, 0, 4, 0, 96, 0xFF, intD_a);
					DotsBurst(intX_a, psy, 12, ang, 21, 26, 0, 0, 4, 0, 96, 0xF8, intD_a);
					DotsBurst(intX_a, psy, 12, ang + 10, 21, 20, 0, 0, 4, 0, 96, 0xFC, intD_a);
					ang += 4;
					SfxPlay(0, 40, 2, 9, 4, 0);
				}
				break;
		}
		ang &= 255;
	}

	// ---- the drones: who's to move (EnemyPre), how each moves and shoots (Move), the rest of it
	// (EnemyPost: moved on, explosions, warping in, hits, boxes for the dots, sprites, flying into
	// you), then the kills
	function Enemies()
	{
		var intJ, intM, intK;
		EnemyPre();
		for (intJ = 0; intJ < mcount; intJ++)
		{
			intM = mlist[intJ];
			Move(intM, ek[intM]);
		}
		EnemyPost();
		for (intJ = 0; intJ < kcount; intJ++)
		{
			intM = klist[intJ];
			Kill(intM, ek[intM], S4(ex[intM]), S4(ey[intM]));
		}
		if (dieF) { Touch(); }
		// gone out of the world (every 16 frames)
		if ((frames & 15) === 0)
		{
			for (intM = 0; intM < NE; intM++)
			{
				intK = ek[intM];
				if ((intK > 0) && (intK < K_PART))
				{
					if ((ex[intM] < -1024) || (S4(ex[intM]) > wid + 64) || (ey[intM] > 3200) || (ey[intM] < -1024)) { Remove(intM); }
				}
			}
		}
	}

	function EnemyPre()
	{
		mcount = 0; ealive = 0;
		for (var intM = 0; intM < NE; intM++)
		{
			var intK = ek[intM];
			if ((intK !== 0) && (intK < 30))
			{
				if (intK !== K_MINE) { ealive++; }
				if (ews[intM] === 0) { mlist[mcount] = intM; mcount++; }
			}
		}
	}

	// EnemyPost: one showRange over the records - each one's frame of work done as its place is
	// worked out: moved on, exploding, warping in, its hits, its box for the dots, its look and
	// animation; then "do any touch the ship?" (its 8 x 6 middle)
	var enPX = [], enPY = [];

	function EnemyPost()
	{
		var arrHide = [], arrTouch = [];
		kcount = 0; dieF = 0; bl = [];
		m_objSlots.showRange(SP_EN, NE, function(intM_a, intN_a)
		{
			var intKD = ek[intM_a];
			var intX, intY, intEws, intH, blnVis, intPal;
			if ((intKD === 0) || (intKD === K_PART))
			{
				arrHide.push(intN_a);
			}
			else if (intKD > K_PART)
			{
				// an explosion: once through, gone after 16 frames
				et[intM_a]++;
				intX = S4(ex[intM_a]) - cam; intY = S4(ey[intM_a]);
				blnVis = (intX >= -16 - WideL()) && (intX <= 271 + WideR()) && (intY >= -16) && (intY <= 191);
				if (et[intM_a] >= 16)
				{
					ek[intM_a] = 0;
					arrHide.push(intN_a);
				}
				else if (!blnVis)
				{
					arrHide.push(intN_a);
				}
				else if (intKD === K_BIGBOOM)
				{
					enPX[intM_a] = intX + 16; enPY[intM_a] = intY + 16;
					Put(intN_a, enPX[intM_a], enPY[intM_a], 'boom', undefined, PL_FIRE, 0, 2);
					m_objSlots.animate(intN_a, 1, et[intM_a] === 1);
				}
				else
				{
					enPX[intM_a] = intX + 24; enPY[intM_a] = intY + 24;
					Put(intN_a, enPX[intM_a], enPY[intM_a], 'boom', undefined, PL_FIRE, 0);
					m_objSlots.animate(intN_a, 1, et[intM_a] === 1);
				}
			}
			else
			{
				intEws = ews[intM_a];
				if (intEws === 0)
				{
					ex[intM_a] += evx[intM_a];
					ey[intM_a] += evy[intM_a];
					et[intM_a]++;
				}
				intX = S4(ex[intM_a]) - cam; intY = S4(ey[intM_a]);
				blnVis = (intX >= -16 - WideL()) && (intX <= 271 + WideR()) && (intY >= -16) && (intY <= 191);
				if (intEws !== 0)
				{
					// warping in
					ews[intM_a]--;
					if (blnVis)
					{
						enPX[intM_a] = intX + 24; enPY[intM_a] = intY + 24;
						Put(intN_a, enPX[intM_a], enPY[intM_a], 'warp', undefined, PL_LIGHT, 0);
						m_objSlots.animate(intN_a, 1);
					}
					else
					{
						arrHide.push(intN_a);
					}
				}
				else
				{
					// its hits (the dots' and the laser's damage since the last frame)
					intH = hit[intM_a];
					hit[intM_a] = 0;
					if ((intH !== 0) && (khp[intKD] !== 0))
					{
						ehp[intM_a] -= intH;
						ef[intM_a] = 2;
					}
					if ((khp[intKD] !== 0) && (ehp[intM_a] <= 0))
					{
						// (dead: drawn as it was; Kill takes it)
						klist[kcount] = intM_a;
						kcount++;
					}
					else if (!blnVis)
					{
						arrHide.push(intN_a);
					}
					else
					{
						if ((intX >= boxL(16)) && (intX <= boxR(16)) && (intY >= 0) && (intY < 176) && (khp[intKD] !== 0) && (bl.length < 19))
						{
							bl.push([intM_a, intX, intY, kw[intKD] + 2, kh[intKD] + 2]);
						}
						intPal = kpal[intKD];
						if (ef[intM_a] !== 0) { ef[intM_a]--; intPal = PL_FLASH; }
						if (kbig[intKD]) { enPX[intM_a] = intX + 16; enPY[intM_a] = intY + 16; } else { enPX[intM_a] = intX + 24; enPY[intM_a] = intY + 24; }
						Put(intN_a, enPX[intM_a], enPY[intM_a], 'k' + intKD, undefined, intPal, eflip[intM_a]);
						// what it's doing: a turret looking ahead or up, a reactor part whole or cracked, the
						// rest flying (their own animation)
						m_objSlots.animate(intN_a, (kanim[intKD] === 3) ? ((eb[intM_a] !== 0) ? 3 : 1) : 1);
						if (alive && (inv === 0) && (intX >= -16) && (intX <= 271)) { arrTouch.push(intN_a); }
					}
				}
			}
			return enPX[intM_a];
		}, function(intM_a)
		{
			return enPY[intM_a];
		});
		processArray(arrHide, function(intN_a) { Hide(intN_a); });
		processArray(arrTouch, function(intN_a)
		{
			if (touches(intN_a, shipZone(8, 6))) { dieF = 1; }
		});
	}

	function Remove(intM_a)
	{
		Hide(SP_EN + intM_a);
		if (kbig[ek[intM_a]] && (intM_a + 1 < NE))
		{
			ek[intM_a + 1] = 0;
			Hide(SP_EN + intM_a + 1);
		}
		ek[intM_a] = 0;
	}

	// how each kind moves and shoots
	function onPaper(intX_a)
	{
		return (intX_a - cam > 0) && (intX_a - cam < 256);
	}

	function Move(intM_a, intKD_a)
	{
		var intT = et[intM_a];
		var intX = S4(ex[intM_a]), intY = S4(ey[intM_a]);
		var intPX = S4(pwx);
		var intDX = intPX - intX;
		var intA, intN;
		if (ea[intM_a] === 1)
		{
			// coming down a gap in the ceiling: straight down, out under it
			evx[intM_a] = 0; evy[intM_a] = 28;
			if (intY > 40) { ea[intM_a] = 0; evy[intM_a] = 0; }
		}
		else
		{
			switch (intKD_a)
			{
				case K_DART:
					if (intT === 1) { evx[intM_a] = (intDX > 0) ? 44 + spdAdd : -44 - spdAdd; }
					if (evx[intM_a] > 0)
					{
						eflip[intM_a] = MIRRORX;
						if (intDX < -150) { evx[intM_a] = -44 - spdAdd; }
					}
					else
					{
						eflip[intM_a] = 0;
						if (intDX > 150) { evx[intM_a] = 44 + spdAdd; }
					}
					if ((intT & 7) === 0)
					{
						if (intY < psy - 4) { evy[intM_a] = 10; } else if (intY > psy + 4) { evy[intM_a] = -10; } else { evy[intM_a] = 0; }
					}
					if (intT === efire[intM_a]) { Fan(intX, intY, 3, 12, 22 + spdAdd, S_BSMALL, PL_PINK); efire[intM_a] = intT + 60 - stage * 5; }
					break;
				case K_ORB:
					if ((intT & 15) === 1)
					{
						intA = Aim(intX, intY, intPX, psy);
						evx[intM_a] = SinK(intA, 2); evy[intM_a] = SinK(intA + 64, 2) + SinK(intT * 4, 1);
					}
					if (intT === efire[intM_a])
					{
						Fan(intX, intY, 5, 10, 18 + spdAdd, S_BBIG, PL_CYAN);
						if ((stage > 2) && onPaper(intX)) { BulBurst(intX, intY, 8, intT, 32, 12 + spdAdd, S_BSMALL, PL_CYAN); }
						efire[intM_a] = intT + 60 - stage * 5;
					}
					break;
				case K_SPIN:
					if ((intT & 7) === 1)
					{
						intA = Aim(intX, intY, intPX, psy);
						if (Math.abs(intDX) > 90)
						{
							evx[intM_a] = SinK(intA, 3); evy[intM_a] = SinK(intA + 64, 3);
						}
						else
						{
							evx[intM_a] = SinK(intA + 64, 2); evy[intM_a] = SinK(intA + 128, 2);
						}
					}
					if ((intT === efire[intM_a]) || (intT === efire[intM_a] + 12))
					{
						if (onPaper(intX)) { BulBurst(intX, intY, 16, intT * 3, 16, 14 + spdAdd, S_BSMALL, PL_PINK); }
						if (intT === efire[intM_a] + 12) { efire[intM_a] = intT + 70 - stage * 8; }
					}
					break;
				case K_SWARM:
					evx[intM_a] += (intDX > 0) ? 3 : -3;
					evy[intM_a] += (intY < psy) ? 2 : -2;
					evx[intM_a] = Math.max(-40, Math.min(40, evx[intM_a]));
					evy[intM_a] = Math.max(-28, Math.min(28, evy[intM_a]));
					eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					break;
				case K_MINER:
					if ((evx[intM_a] >= 0) && (evx[intM_a] < 12)) { evx[intM_a] = 12; }
					if ((evx[intM_a] < 0) && (evx[intM_a] > -12)) { evx[intM_a] = -12; }
					if (Solid(intX - cam + S1(evx[intM_a]), intY)) { evx[intM_a] = -evx[intM_a]; }
					evy[intM_a] = SinK(intT * 3, 1);
					if (intT === efire[intM_a])
					{
						intN = Spawn(K_MINE, intX, intY + 8);
						efire[intM_a] = intT + 70;
					}
					break;
				case K_TURRET:
					eb[intM_a] = (Math.abs(intDX) < 24) ? 1 : 0;
					evy[intM_a] = 0;
					if ((intT & 3) === 1)
					{
						evx[intM_a] = 0;
						if (Math.abs(intDX) > 40 + (intM_a & 3) * 14)
						{
							intA = (intDX > 0) ? 1 : -1;
							intN = intX + intA * 8;
							if ((eflip[intM_a] & MIRRORY) !== 0)
							{
								intN = CeilY(intN);
								if ((intN > 0) && (Math.abs(intN + 6 - intY) < 13)) { evx[intM_a] = intA * (8 + stage * 2); ey[intM_a] = L4(CeilY(intX) + 6); }
							}
							else
							{
								intN = FloorY(intN);
								if ((intN < 176) && (Math.abs(intN - 6 - intY) < 13)) { evx[intM_a] = intA * (8 + stage * 2); ey[intM_a] = L4(FloorY(intX) - 6); }
							}
						}
					}
					if (intDX > 0) { eflip[intM_a] = (eflip[intM_a] & MIRRORY) | MIRRORX; } else { eflip[intM_a] = eflip[intM_a] & MIRRORY; }
					if (intT === efire[intM_a])
					{
						if (Math.abs(intDX) < 180) { Fan(intX, intY, 3 + S1(stage), 10, 20 + spdAdd, S_BDIAM, PL_YELLOW); }
						efire[intM_a] = intT + 55 - stage * 5;
					}
					break;
				case K_HUNTER:
					if ((intT & 7) === 1)
					{
						intA = Aim(intX, intY, intPX, psy);
						evx[intM_a] = SinK(intA, 4); evy[intM_a] = SinK(intA + 64, 3);
						eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					}
					if (((intT & 127) < 64) && ((intT & 3) === 0) && onPaper(intX)) { BulBurst(intX, intY, 3, intT * 5, 85, 16 + spdAdd, S_BSTAR, PL_PINK); }
					break;
				case K_REACTOR:
					evx[intM_a] = 0; evy[intM_a] = 0;
					eb[intM_a] = (ehp[intM_a] * 2 < khp[intKD_a]) ? 2 : 0;
					if (intT === efire[intM_a])
					{
						if (Math.abs(intDX) < 200) { BulBurst(intX, intY, 8 + idiv(planet, 2), intT * 5, idiv(256, 8 + idiv(planet, 2)), 14 + spdAdd, S_BSMALL, PL_YELLOW); }
						efire[intM_a] = intT + 90 - planet * 2;
					}
					break;
				case K_CARRIER:
					if (intT === 1) { evx[intM_a] = (intDX > 0) ? -12 : 12; }
					eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					evy[intM_a] = SinK(intT * 2, 1);
					if (intT === efire[intM_a])
					{
						if (onPaper(intX)) { BulBurst(intX, intY, 12, intT, 21, 12 + spdAdd, S_BRING, PL_CYAN); }
						efire[intM_a] = intT + 90;
					}
					break;
				case K_SNIPER:
					if ((intT & 3) === 1)
					{
						intN = (intDX > 0) ? intPX - 110 : intPX + 110;
						if (intX < intN - 8) { evx[intM_a] = 20; } else if (intX > intN + 8) { evx[intM_a] = -20; } else { evx[intM_a] = 0; }
						if (intY < psy - 6) { evy[intM_a] = 12; } else if (intY > psy + 6) { evy[intM_a] = -12; } else { evy[intM_a] = 0; }
						eflip[intM_a] = (intDX > 0) ? MIRRORX : 0;
					}
					if (intT === efire[intM_a])
					{
						if (onPaper(intX)) { Fan(intX, intY, 3, 5, 36 + spdAdd, S_BTINY, PL_YELLOW); }
						efire[intM_a] = intT + 50 - stage * 5;
					}
					break;
				case K_MUTANT:
					if ((intT & 3) === 1)
					{
						intA = Aim(intX, intY, intPX, psy) + rnd(48) - 24;
						evx[intM_a] = SinK(intA, 3 + S2(stage)); evy[intM_a] = SinK(intA + 64, 3 + S2(stage));
						eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					}
					if (intT === efire[intM_a])
					{
						if (onPaper(intX)) { Shoot(intX, intY, Aim(intX, intY, intPX, psy), 22 + spdAdd, S_BSMALL, PL_PINK); }
						efire[intM_a] = intT + 45 - stage * 3;
					}
					break;
				case K_DYNAMO:
					if ((intT & 31) === 1)
					{
						intA = rnd(256);
						if (Math.abs(intDX) > 120) { intA = Aim(intX, intY, intPX, psy); }
						evx[intM_a] = SinK(intA, 1); evy[intM_a] = SinK(intA + 64, 1);
					}
					if ((intT >= efire[intM_a]) && (intT < efire[intM_a] + 24) && ((intT & 3) === 0))
					{
						if (onPaper(intX)) { BulBurst(intX, intY, 4, intT * 3, 64, 16 + spdAdd, S_BDIAM, PL_CYAN); }
					}
					if (intT === efire[intM_a] + 24) { efire[intM_a] = intT + 80 - stage * 6; }
					break;
				case K_MINE:
					if (intT > 240)
					{
						if (onPaper(intX)) { BulBurst(intX, intY, 12, intT, 21, 12 + spdAdd, S_BSMALL, PL_PINK); }
						Remove(intM_a);
						Boom(intX, intY, 0);
					}
					break;
				default:
					break;
			}
		}
	}

	function Kill(intM_a, intKD_a, intX_a, intY_a)
	{
		mult = Math.min(8, mult + 1);
		multT = 90;
		Panel(5);
		AddScore(ksc[intKD_a] * mult);
		if (intKD_a === K_REACTOR)
		{
			reactLeft--;
			ReactorDown(intX_a, intY_a);
		}
		if ((energy < 96) && (blossT === 0))
		{
			energy = Math.min(96, energy + 3 + idiv(ksc[intKD_a], 100));
			Panel(4);
		}
		Remove(intM_a);
		if (intKD_a === K_CARRIER)
		{
			drops++;
			switch (drops & 7)
			{
				case 1: case 3: case 5: case 7: Drop(I_P, intX_a, intY_a); break;
				case 2: case 6: Drop(I_N, intX_a, intY_a); break;
				case 4: Drop(I_S, intX_a, intY_a); break;
				default: Drop(I_1, intX_a, intY_a); break;
			}
		}
		else if (intKD_a === K_HUNTER)
		{
			Drop(I_P, intX_a, intY_a);
		}
		else if ((intKD_a !== K_MINE) && (rnd(40) === 0))
		{
			Drop(I_P, intX_a, intY_a);
		}
		HgDrop(intKD_a, intX_a, intY_a);
		// the second time round they shoot back as they go
		if ((loopN > 1) && alive && (intKD_a !== K_MINE)) { Shoot(intX_a, intY_a, Aim(intX_a, intY_a, S4(pwx), psy), 24, S_BSMALL, PL_PINK); }
		Boom(intX_a, intY_a, kbig[intKD_a]);
		if (kbig[intKD_a]) { SfxPlay(1, 31, 0, 15, 30, 1); } else { SfxPlay(1, 20, 1, 13, 12, 1); }
	}

	// Boom x, y, big: an explosion in a free record (none free: none)
	function Boom(intX_a, intY_a, intBig_a)
	{
		var blnDone = false;
		for (var intM = 0; intM < NE; intM++)
		{
			if (!blnDone && (ek[intM] === 0))
			{
				blnDone = true;
				ek[intM] = (intBig_a !== 0) ? K_BIGBOOM : K_BOOM;
				ex[intM] = L4(intX_a); ey[intM] = L4(intY_a); et[intM] = 0; ews[intM] = 0;
			}
		}
	}

	function Shoot(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPal_a)
	{
		if (alive && onPaper(intX_a)) { BulBurst(intX_a, intY_a, 1, intA_a, 0, intSpd_a + spdAdd, intPat_a, intPal_a); }
	}

	// Fan: n bullets aimed at you, step apart
	function Fan(intX_a, intY_a, intN_a, intStp_a, intSpd_a, intPat_a, intPal_a)
	{
		if (alive && onPaper(intX_a)) { BulBurst(intX_a, intY_a, intN_a, Aim(intX_a, intY_a, S4(pwx), psy) - S1((intN_a - 1) * intStp_a), intStp_a, intSpd_a, intPat_a, intPal_a); }
	}

	// the pickups: the capsules bob; HELLGATE's pop out, then drift down. Near the ship (or while it
	// guards) they're pulled in; do they touch its middle? Then they're yours
	function Items()
	{
		var intN, intX, intY, intDX, intDY, blnHG, intLife, intSlot, blnPicked;
		for (intN = 0; intN < NI; intN++)
		{
			if (ik[intN] !== 0)
			{
				intSlot = itemSlot(intN);
				it[intN]++;
				blnHG = (ik[intN] >= I_SP);
				intLife = blnHG ? 250 : 600;
				intDX = S4(pwx) - S4(ix[intN]); intDY = psy - S4(iy[intN]);
				if (alive && (((Math.abs(intDX) < 48) && (Math.abs(intDY) < 40)) || (guardT > 0)))
				{
					intDX = Math.max(-10, Math.min(10, intDX));
					intDY = Math.max(-10, Math.min(10, intDY));
					ix[intN] += L4(intDX); iy[intN] += L4(intDY);
				}
				else if (blnHG)
				{
					if (ivy[intN] < 16) { ivy[intN] += 16; }
					if (it[intN] === 8) { ivx[intN] = 0; }
					ix[intN] += ivx[intN]; iy[intN] += ivy[intN];
					if (iy[intN] < YMIN * 16) { iy[intN] = YMIN * 16; ivy[intN] = 0; }
				}
				intX = S4(ix[intN]) - cam;
				intY = S4(iy[intN]);
				if (!blnHG) { intY += S1(S4(Sin(it[intN] * 4))); }
				if (blnHG)
				{
					Put(intSlot, intX + 24, intY + 24, (ik[intN] === I_SP) ? 'smallp' : ((ik[intN] === I_BIGP) ? 'bigp' : 'gem'), undefined, PL_ORANGE, 0);
					m_objSlots.animate(intSlot, 1);
				}
				else
				{
					Put(intSlot, intX + 24, intY + 24, 'capsule', S_ITEMP + ik[intN], PL_ITEM, 0);
				}
				blnPicked = alive && touches(intSlot, shipZone(0, 0));
				if (it[intN] > intLife)
				{
					ik[intN] = 0; Hide(intSlot);
				}
				else if (blnPicked)
				{
					Pick(ik[intN]);
					ik[intN] = 0; Hide(intSlot);
				}
				else if (blnHG && (((it[intN] + intN) & 3) === 0) && (intY > FloorY(S4(ix[intN])) - 4))
				{
					ik[intN] = 0; Hide(intSlot);
				}
				else if ((intX < -16 - WideL()) || (intX > 271 + WideR()) || ((it[intN] > intLife - 150) && ((it[intN] & 4) !== 0)))
				{
					Hide(intSlot);
				}
			}
		}
	}

	// ====================================================================================================
	// SECTOR.CLS: the panel, the messages, a level from start to end, the waves, the guardians

	// Panel w: 0 all of it, 1 the score, 2 the pattern, 3 the power, 4 the energy, 5 the multiplier,
	// 6 the arms, 7 the title's (the score and the best)
	function Panel(intW_a)
	{
		var intK, intE, intN;
		if ((intW_a === 0) || (intW_a === 7))
		{
			for (intK = 4; intK <= 35; intK++) { MapPut(intK, 26, T_PANEL); MapPut(intK, 27, T_PANEL); }
			for (intK = 0; intK < 32; intK++) { sco[intK] = 255; }
			MapTextC(12, 27, 'HI ' + digits(hiscore, 7), 1);
		}
		if (intW_a === 0)
		{
			for (intK = 4; intK <= 35; intK++) { MapPut(intK, 27, T_SCAN); }
		}
		if ((intW_a === 0) || (intW_a === 1) || (intW_a === 7))
		{
			MapText(4, 26, digits(score, 7));
			scoreDirty = 0;
		}
		if ((intW_a === 0) || (intW_a === 2)) { MapTextC(11, 26, 'RING  FLOWERSPIRALWAVE  VORTEXSTAR  ALL   '.substr(weapon * 6, 6), 2); }
		if ((intW_a === 0) || (intW_a === 3))
		{
			for (intK = 0; intK <= 4; intK++) { MapPut(17 + intK, 26, (intK < power) ? T_POW1 : T_POW0); }
		}
		if ((intW_a === 0) || (intW_a === 4))
		{
			for (intK = 0; intK <= 3; intK++)
			{
				intE = energy - intK * 24;
				MapPut(22 + intK, 26, (intE >= 24) ? T_EN2 : ((intE >= 12) ? T_EN1 : T_EN0));
			}
		}
		if ((intW_a === 0) || (intW_a === 5))
		{
			if (mult > 1) { MapTextC(26, 26, String.fromCharCode(48 + mult), 3); } else { MapText(26, 26, ' '); }
		}
		if ((intW_a === 0) || (intW_a === 6))
		{
			MapPut(28, 26, T_LIFE); MapPut(30, 26, T_NOVA); MapPut(32, 26, T_GUARD); MapPut(34, 26, T_INV);
			for (intK = 0; intK <= 3; intK++)
			{
				if (intK === 0) { intN = lives - 1; } else if (intK === 1) { intN = smarts; } else if (intK === 2) { intN = guards; } else { intN = idiv(invE + 24, 25); }
				intN = Math.max(0, Math.min(9, intN));
				if (intK === 3) { MapTextC(35, 26, String.fromCharCode(48 + intN), 2); } else { MapTextC(29 + intK * 2, 26, String.fromCharCode(48 + intN), 1); }
			}
		}
	}

	// Msg m, t: a message across the play area for t frames (0: until the next); t -1: m on the line
	// under it; t -2: gone
	function Msg(str_a, intT_a)
	{
		if (intT_a === -2)
		{
			if (msgR !== 0)
			{
				MapText(4, msgR, spaces(32));
				MapText(4, msgR + 2, spaces(32));
			}
			MsgRows(0);
			msgR = 0;
		}
		else if (intT_a === -1)
		{
			if (msgR === 0) { MsgRows(1); msgR = 7; }
			MapText(4, msgR + 2, spaces(32));
			MapText(4 + idiv(32 - str_a.length, 2), msgR + 2, str_a);
		}
		else
		{
			MsgRows(1);
			msgR = 7;
			MapText(4, 7, spaces(32));
			MapTextC(4 + idiv(32 - str_a.length, 2), 7, str_a, 1);
			msgT = intT_a;
		}
	}

	function Name(intK_a)
	{
		var strR;
		if (intK_a === 0)
		{
			strR = 'THE CRUST     THE TUNNELS   THE HATCHERIESTHE LABS      THE DEEP      THE REACTOR   OPEN SPACE    '.substr(depth * 14 - 14, 14);
		}
		else
		{
			strR = 'KHOR   VESSA  ULDRAN MORRAK ZETH   OBRIX  CALLUN DRAEGO SKARN  IVUL   TORMEX NAXOS  PELLUS GROTH  AZRAEL XUL    '.substr(planet * 7 - 7, 7);
		}
		return strR.replace(/\s+$/, '');
	}

	// a stage: from the start to its guardian beaten (or the last life lost)
	var m_intTickPhase = 0;

	function StageRun()
	{
		var intK, intJ, intKD, intX, intM;
		stage = 1 + idiv(planet - 1, 4) + S1(depth - 1);
		spdAdd = (loopN - 1) * 4 + (stage - 1) * 2;
		HideSlots();
		BulReset();
		PalFade(0);
		MapCls();
		if (depth === 7) { LoadLevel(95 + planet); } else { LoadLevel((planet - 1) * 6 + depth - 1); }
		m_strLayers = 'SLU';
		m_intL2Bank = 12;
		DotsWipe(0);
		MapStart(0);
		wid = ncols * 8;
		gapN = Math.min(8, Meta(2));
		for (intK = 0; intK < gapN; intK++) { gapX[intK] = Meta(3 + intK) * 8; }
		Panel(0);
		cleared = 0; clearT = 0; peak = 0;
		wi = 0; waveT = 150; gate = 0; pn = 0;
		bossOn = 0; escT = 0;
		for (intK = 0; intK < NE; intK++) { ek[intK] = 0; }
		m_objSlots.hideRange(SP_EN, NE);
		MechsClear();
		mMax = 90 + planet * 20;
		khp[K_REACTOR] = 200 + planet * 25;
		// the reactor's parts, first in the wave list
		rN = 0; reactLeft = 0;
		for (intJ = 0; intJ <= 30; intJ++)
		{
			intKD = Meta(16 + intJ * 4);
			if (intKD === 0) { intJ = 31; }
			else if ((intKD === K_REACTOR) && (rN < 3))
			{
				intX = Meta(17 + intJ * 4) * 8;
				intM = Spawn(K_REACTOR, intX, FloorY(intX) - 16);
				if (intM >= 0) { rpx[rN] = intX; rN++; reactLeft++; }
			}
		}
		pwx = (rN > 0) ? L4(40) : L4(idiv(wid, 2));
		pys = 88 * 16; face = 0;
		cam = S4(pwx) - 96;
		Restart();
		m_objSteps.call(function()
		{
			Msg('PLANET ' + trimStr(planet) + ' ' + Name(1) + '  DEPTH ' + trimStr(depth), 150);
			Msg(Name(0), -1);
			inPlay = 1;
			m_intTickPhase = 0;
		});
		m_objSteps.until(StageLoop);
	}

	// StageRun's loop: a Tick every iteration (50 a second: the Next managed 25, which was too slow
	// here; everything runs twice as fast as on the Next)
	function StageLoop()
	{
		var blnDone = false;
		m_intTickPhase = 1;
		if (m_intTickPhase === 1)
		{
			if (down(K_ENTER))
			{
				Pause();
			}
			else
			{
				Tick();
				if (depth === 7) { Wrap(); }
				if (escT > 0) { Escape(); }
				if ((alive === 0) && (deadT === 0) && (lives <= 0))
				{
					over = 1; inPlay = 0;
					blnDone = true;
				}
				else
				{
					if ((alive === 0) && (deadT === 0)) { Restart(); }
					if (cleared)
					{
						clearT++;
						if (clearT === 1)
						{
							if (depth < 5) { Msg('DEPTH CLEAR - GOING DOWN', 0); } else if (depth === 6) { Msg('YOU GOT OUT', 0); } else { Msg('THE GUARDIAN IS DOWN', 0); }
							Msg('BONUS ' + trimStr(depth * 1000 + planet * 500) + '  MOST SHOTS ' + trimStr(peak), -1);
							AddScore(depth * 1000 + planet * 500);
						}
						if (clearT > 200)
						{
							FadeLoop(8, 0, null);
							m_objSteps.call(function() { Msg('', -2); inPlay = 0; });
							blnDone = true;
						}
					}
				}
			}
		}
		return blnDone;
	}

	// open space goes round: past 400 or 1360 everything moves 960 (the stars repeat every 960)
	function Wrap()
	{
		var intD = S4(pwx), intJ, intX;
		if (intD < 400) { intD = 960; } else if (intD > 1360) { intD = -960; } else { intD = 0; }
		if (intD !== 0)
		{
			pwx += L4(intD); opwx += L4(intD);
			cam += intD;
			MapShift(intD);
			for (intJ = 0; intJ < NE; intJ++)
			{
				if (ek[intJ] !== 0)
				{
					intX = S4(ex[intJ]) + intD;
					if (intX < 0) { intX += 960; }
					if (intX >= wid) { intX -= 960; }
					ex[intJ] = L4(intX) + (ex[intJ] & 15);
				}
			}
			for (intJ = 0; intJ < NI; intJ++)
			{
				if (ik[intJ] !== 0)
				{
					intX = S4(ix[intJ]) + intD;
					if (intX < 0) { intX += 960; }
					if (intX >= wid) { intX -= 960; }
					ix[intJ] = L4(intX);
				}
			}
			for (intJ = 0; intJ <= 3; intJ++)
			{
				if ((mhp[intJ] > 0) || (mdie[intJ] > 0))
				{
					intX = mx[intJ] + intD;
					if (intX < 0) { intX += 960; }
					if (intX >= wid) { intX -= 960; }
					mx[intJ] = intX;
				}
			}
			if (bossOn)
			{
				bwx += intD;
				if (bwx < 40) { bwx += 960; }
				if (bwx > wid - 40) { bwx -= 960; }
			}
			DotsShift(intD);
			BulShift(intD);
		}
	}

	// the escape: the reactor's going up - out through a shaft in the roof before it does
	function Escape()
	{
		var intJ;
		escT--;
		if ((escT % 25) === 0)
		{
			Msg('THE REACTOR IS GOING CRITICAL', 30);
			Msg('GET OUT  ' + trimStr(idiv(escT, 25)), -1);
		}
		if ((escT & 7) === 0)
		{
			Boom(cam + 16 + rnd(224), 16 + rnd(150), rnd(2));
			SfxPlay(2, 20 + rnd(30), 4, 13, 10, 1);
		}
		if ((escT & 63) === 0) { PalFade(6); }
		if ((escT & 63) === 2) { PalFade(8); }
		if (((escT % 24) === 0) && (ealive < 14) && (gapN > 0))
		{
			intJ = rnd(gapN);
			Spawn(K_SWARM, gapX[intJ], -12);
		}
		if (alive && (psy <= 22))
		{
			for (intJ = 0; intJ < gapN; intJ++)
			{
				if (Math.abs(S4(pwx) - gapX[intJ]) < 14) { escT = 0; cleared = 1; }
			}
		}
		if ((escT === 0) && (cleared === 0))
		{
			// too late: the blast takes a life, the ship's thrown clear anyway
			Die();
			cleared = 1;
		}
	}

	// the ship back (somewhere clear near where it went down), the bullets gone
	function Restart()
	{
		var intK;
		for (intK = 0; intK < NI; intK++) { ik[intK] = 0; }
		// (Spr.HideRange 0, 26: the ship, the pickups, the spark, the guardian; Spr.Hide 63)
		m_objSlots.hideRange(SL0, 26); Hide(SL0 + 63);
		BulReset();
		pvx = 0;
		alive = 1; inv = 120; deadT = 0;
		novaT = 0; sparkT = 0;
		mult = 1; multT = 0; Panel(5);
		guardT = 0; blossT = 0; invOn = 0; hypT = 0; lasT = 0; kWas = -1;
		BeamsOff();
		Hide(SP_GUARD);
		Panel(3); Panel(6); Panel(2); Panel(4);
		Camera();
		SafePlace();
		FadeLoop(0, 8, Show);
	}

	function SafePlace()
	{
		var intB = (face === 0) ? -16 : 16;
		var intE, intX, intD, intJ, intY, blnDone = false;
		for (intE = 0; (intE <= 16) && !blnDone; intE++)
		{
			intX = psx - intB * S1(intE + 1);
			if ((intE & 1) !== 0) { intX = psx + intB * S1(intE + 1); }
			if ((intX >= 16) && (intX <= 239))
			{
				for (intD = 0; (intD <= 160) && !blnDone; intD += 4)
				{
					for (intJ = 0; (intJ <= 1) && !blnDone; intJ++)
					{
						intY = (intJ !== 0) ? psy - intD : psy + intD;
						if ((intY >= YMIN) && (intY <= YMAX))
						{
							if (!Solid(intX - 28, intY) && !Solid(intX, intY) && !Solid(intX + 28, intY) && !Solid(intX, intY - 12) && !Solid(intX, intY + 12))
							{
								pys = L4(intY); psy = intY;
								pwx = L4(S4(pwx) + intX - psx); psx = intX;
								blnDone = true;
							}
						}
					}
				}
			}
		}
	}

	function Die()
	{
		if ((alive !== 0) && (GOD === 0))
		{
			alive = 0; deadT = 100;
			lives--;
			Boom(S4(pwx), psy, 1);
			Boom(S4(pwx) - 10, psy - 6, 0);
			Boom(S4(pwx) + 10, psy + 6, 0);
			SfxPlay(1, 31, 0, 15, 40, 1);
			BulClear();
			power = Math.max(1, power - 1);
			speed = 1;
			mult = 1; multT = 0; Panel(5);
			Panel(6); Panel(3);
			Hide(SP_SHIP);
		}
	}

	// hyperspace: anywhere along the corridor - into the rock, and that's a ship
	function Hyperspace()
	{
		var intX = 24 + rnd(wid - 48);
		pwx = L4(intX); pys = L4(YMIN + rnd(YMAX - YMIN)); psy = S4(pys); pvx = 0;
		cam = intX - 128;
		if (cam < 0) { cam = 0; }
		if (cam > wid - 256) { cam = wid - 256; }
		MapStart(cam);
		BeamsOff();
		BulClear();
		psx = intX - cam;
		opwx = pwx; opys = pys;
		hypT = 12; PalFade(16);
		SfxPlay(2, 200, -12, 15, 24, 0);
		if (Solid(psx, psy) || Solid(psx - 6, psy) || Solid(psx + 6, psy))
		{
			inv = 0; Die();
		}
		else if (inv < 30)
		{
			inv = 30;
		}
	}

	// a drone touched the ship: Inviso destroys the ones in its reach (its 20 x 12 about the ship's
	// middle), the guard and the Blossom shrug it off, else a ship
	function Touch()
	{
		var intM, intKD;
		if ((guardT === 0) && (blossT === 0))
		{
			if (invOn === 0)
			{
				Die();
			}
			else
			{
				for (intM = 0; intM < NE; intM++)
				{
					intKD = ek[intM];
					if ((intKD > 0) && (intKD < K_PART) && (ews[intM] === 0) && (khp[intKD] > 0))
					{
						if (touches(SP_EN + intM, shipZone(20, 12))) { ehp[intM] = 0; ef[intM] = 4; }
					}
				}
			}
		}
	}

	// Waves: the level's list (kind, count, side, gate), one wave after another
	function Waves()
	{
		var intK, blnGo = true;
		if (pn > 0)
		{
			ptim--;
			if (ptim <= 0)
			{
				SpawnOne(pk, ps, pidx);
				pidx++;
				pn--;
				ptim = (pk === K_SWARM) ? 6 : 10;
			}
			blnGo = false;
		}
		if (blnGo && ((bossOn !== 0) || (cleared !== 0))) { blnGo = false; }
		if (blnGo)
		{
			waveT--;
			if (waveT > 0) { blnGo = false; }
		}
		if (blnGo && (ealive - reactLeft > gate) && ((waveT > -600) || (ealive > 9))) { blnGo = false; }
		if (blnGo)
		{
			intK = Meta(16 + wi * 4);
			if (intK === 0)
			{
				if ((ealive === 0) && (depth !== 6))
				{
					if (MechsAlive() === 0) { cleared = 1; }
				}
			}
			else if (intK === K_REACTOR)
			{
				wi++; waveT = 1;
			}
			else if (intK === K_MECH)
			{
				MechsStart(Meta(17 + wi * 4));
				gate = Meta(19 + wi * 4); wi++; waveT = 200;
			}
			else if (intK === K_BOSS)
			{
				if (ealive === 0)
				{
					if (depth === 7)
					{
						mMax = 160 + planet * 30;
						MechsStart(1 + idiv(planet, 6));
						wi++;
					}
					else
					{
						StartBoss();
					}
				}
			}
			else
			{
				pk = intK; pn = Meta(17 + wi * 4); ps = Meta(18 + wi * 4); gate = Meta(19 + wi * 4);
				pn += loopN - 1;
				pidx = 0; ptim = 0;
				wi++;
				waveT = 90;
			}
		}
	}

	// one of the wave's drones, from its side
	function SpawnOne(intKD_a, intSide_a, intN_a)
	{
		var intPX = S4(pwx), intFl = 0, intSide = intSide_a, intX = 0, intY = 0, intJ, intG, intD, intM;
		if (intSide === S_BOTH) { intSide = S_LEFT + (intN_a & 1); }
		if ((intSide === S_LEFT) || (intSide === S_RIGHT))
		{
			intX = (intSide === S_LEFT) ? cam - 24 : cam + 280;
			if (intX < 24) { intX = cam + 280; }
			if (intX > wid - 24) { intX = cam - 24; }
			for (intJ = 0; intJ <= 5; intJ++)
			{
				intY = 24 + rnd(128);
				if (!Solid(intX - cam, intY)) { intJ = 6; }
			}
		}
		else if (intSide === S_GAP)
		{
			// the gap nearest you
			intG = 0; intD = 9999;
			for (intJ = 0; intJ < gapN; intJ++)
			{
				if (Math.abs(gapX[intJ] - intPX) < intD) { intD = Math.abs(gapX[intJ] - intPX); intG = intJ; }
			}
			intX = gapX[intG] + rnd(17) - 8; intY = -12;
		}
		else if (intSide === S_WARP)
		{
			intX = cam + 24 + rnd(208); intY = 24 + rnd(128);
			if (Math.abs(intX - intPX) < 56) { intX = (intX < intPX) ? intX - 64 : intX + 64; }
			intX = Math.max(24, Math.min(wid - 24, intX));
		}
		else
		{
			// on the floor or the ceiling, near you
			intX = (rnd(2) !== 0) ? intPX + 70 + rnd(140) : intPX - 70 - rnd(140);
			intX = Math.max(32, Math.min(wid - 32, intX));
			if (((intN_a & 1) !== 0) && (CeilY(intX) > 0))
			{
				intY = CeilY(intX) + 6; intFl = MIRRORY;
			}
			else
			{
				intY = FloorY(intX) - 6;
			}
		}
		intM = Spawn(intKD_a, intX, intY);
		if (intM >= 0)
		{
			eflip[intM] = intFl;
			if ((intSide === S_WARP) || (intSide === S_GROUND)) { ews[intM] = 32; }
			if (intSide === S_GAP) { ea[intM] = 1; }
			evx[intM] = (intX > intPX) ? -1 : 1;
		}
	}

	// Spawn(kind, x, y): a free record (two for a big one): its number, -1 none
	function Spawn(intKD_a, intX_a, intY_a)
	{
		var intR = -1;
		var intSt = kbig[intKD_a] ? 2 : 1;
		for (var intM = 0; (intM <= NE - intSt) && (intR < 0); intM += intSt)
		{
			if ((ek[intM] === 0) && ((intSt === 1) || (ek[intM + 1] === 0)))
			{
				ek[intM] = intKD_a; ex[intM] = L4(intX_a); ey[intM] = L4(intY_a);
				evx[intM] = 0; evy[intM] = 0; ehp[intM] = idiv(khp[intKD_a] * (1 + loopN), 2); et[intM] = 0; ea[intM] = 0; eb[intM] = 0;
				ews[intM] = 0; efire[intM] = 20 + rnd(40); ef[intM] = 0; eflip[intM] = 0;
				if (intSt === 2) { ek[intM + 1] = K_PART; }
				intR = intM;
			}
		}
		return intR;
	}

	// ---- pickups
	function Drop(intKind_a, intX_a, intY_a)
	{
		var blnDone = false;
		for (var intN = 0; intN < NI; intN++)
		{
			if (!blnDone && (ik[intN] === 0))
			{
				blnDone = true;
				ik[intN] = intKind_a; ix[intN] = L4(intX_a); iy[intN] = L4(intY_a); it[intN] = 0;
				ivx[intN] = (rnd(3) - 1) * 24; ivy[intN] = -96;
			}
		}
	}

	// HELLGATE's drops: the big ones a quarter big P, half P, a quarter gem; the rest 4% big P, 41% P, 20% gem
	function HgDrop(intKD_a, intX_a, intY_a)
	{
		var intR, intK = 0;
		if (intKD_a !== K_MINE)
		{
			intR = rnd(100);
			if ((intKD_a === K_SPIN) || (intKD_a === K_CARRIER) || (intKD_a === K_MINER))
			{
				intK = (intR < 25) ? I_BIGP : ((intR < 75) ? I_SP : I_GEM);
			}
			else if (intR < 4) { intK = I_BIGP; }
			else if (intR < 45) { intK = I_SP; }
			else if (intR < 65) { intK = I_GEM; }
			if (intK !== 0) { Drop(intK, intX_a, intY_a); }
		}
	}

	function PowerUp()
	{
		if (power < 5)
		{
			power++; Panel(3);
			Msg('POWER ' + String.fromCharCode(48 + power), -1);
		}
		else
		{
			AddScore(2000);
			Msg('MAX POWER 2000', -1);
		}
		msgT = 60;
		SfxPlay(1, 50, -1, 14, 25, 0);
	}

	function Pick(intKind_a)
	{
		if (intKind_a === I_GEM)
		{
			AddScore(100 + mult * 10);
			SfxPlay(0, 40, -1, 12, 6, 0);
		}
		else if ((intKind_a === I_SP) || (intKind_a === I_BIGP))
		{
			if (intKind_a === I_BIGP)
			{
				PowerUp();
			}
			else
			{
				pNext++;
				if (pNext >= 10) { pNext = 0; PowerUp(); }
				SfxPlay(0, 60, -2, 12, 6, 0);
			}
			pAll++;
			if ((pAll % 25) === 0)
			{
				if (guards < 9) { guards++; Panel(6); }
				Msg('GUARD +1', -1); msgT = 60;
			}
			AddScore(50);
		}
		else
		{
			if (intKind_a === I_P)
			{
				PowerUp();
			}
			else if (intKind_a === I_N)
			{
				if (smarts < 9) { smarts++; Panel(6); } else { AddScore(2000); }
				Msg('SMART BOMB', -1);
			}
			else if (intKind_a === I_S)
			{
				if (speed < 3) { speed++; } else { AddScore(2000); }
				Msg('SPEED UP', -1);
			}
			else
			{
				lives++; Panel(6);
				Msg('EXTRA SHIP', -1);
			}
			msgT = 60;
			AddScore(500);
			SfxPlay(2, 30, -1, 14, 16, 0);
		}
	}

	// ---- the guardian: 64 x 64 that hunts you along the corridor, the level's own patterns
	function StartBoss()
	{
		bossOn = 1; bossT = 0; bossDie = 0;
		bossMax = 500 + stage * 150 + (loopN - 1) * 300;
		bossHP = bossMax;
		bwx = (S4(pwx) > cam + 128) ? cam - 40 : cam + 296;
		bwy = 88; bvx = 0;
		bossV = (idiv(planet - 1, 4)) & 1;
		bossPat = 64;
		bossPal = ((tset === 1) || (tset === 2)) ? PL_BOSSA : PL_BOSSB;
		if (bossV) { bossPal = PL_BOSSA + PL_BOSSB - bossPal; }
		Msg('WARNING', 120);
		Msg('GUARDIAN APPROACHING', -1);
		SfxPlay(2, 200, -2, 15, 60, 0);
	}

	function BossUpdate()
	{
		var intX, intSX, intJ, intH, intPX, intN, blnGo = true;
		bossT++;
		intPX = S4(pwx);
		if (bossDie > 0)
		{
			bossDie++;
			if ((bossDie & 3) === 0)
			{
				Boom(bwx - 24 + rnd(48), bwy - 24 + rnd(48), rnd(2));
				SfxPlay(1, 25 + rnd(10), 1, 15, 14, 1);
			}
			if ((bossDie & 2) !== 0) { bossFl = 1; }
			DrawBoss(bwx - cam);
			if (bossDie > 100)
			{
				bossOn = 0;
				Hide(SP_BOSS);
				Boom(bwx, bwy, 1);
				cleared = 1;
			}
		}
		else
		{
			// it keeps a way off you across, and sways up and down
			intX = (intPX > bwx) ? intPX - 100 : intPX + 100;
			if (bwx < intX - 4) { bvx += 2; } else if (bwx > intX + 4) { bvx -= 2; }
			bvx = Math.max(-40 - bossV * 24, Math.min(40 + bossV * 24, bvx));
			bwx += S4(bvx);
			bwx = Math.max(40, Math.min(wid - 40, bwx));
			bwy = 88 + SinK(bossT * 2, 6);
			intSX = bwx - cam;
			intH = Hits(19);
			if (intH !== 0) { bossHP -= intH; bossFl = 2; }
			if ((intSX > boxL(26)) && (intSX < boxR(26) + 1)) { AddBox(19, intSX, bwy, 26, 26); }
			if (bossHP <= 0)
			{
				bossDie = 1;
				AddScore(20000 + stage * 10000);
				BulClear();
				blnGo = false;
			}
			if (blnGo)
			{
				intN = 3;
				if (bossHP < S1(bossMax)) { intN = 2; }
				if (bossHP < S2(bossMax)) { intN = 1; }
				if ((intSX > 8) && (intSX < 248) && alive) { BossFire(intN, intPX); }
				DrawBoss(intSX);
				// it rams you too (a JSprites collision: |dx| < 30, |dy| < 28)
				if (alive && (inv === 0) && touches(SP_BOSS, shipZone(0, 0))) { Die(); }
			}
		}
	}

	function BossFire(intN_a, intPX_a)
	{
		var intJ, intA;
		switch (tset + bossV * 4)
		{
			case 1:
				if ((bossT % (24 * intN_a)) === 0)
				{
					BulBurst(bwx - 22, bwy - 22, 10, bossT, 25, 16 + spdAdd, S_BSMALL, PL_PINK);
					BulBurst(bwx + 22, bwy + 22, 10, bossT + 12, 25, 16 + spdAdd, S_BSMALL, PL_PINK);
				}
				if ((bossT % (40 * intN_a)) === 20) { Fan(bwx, bwy, 5, 10, 22, S_BBIG, PL_CYAN); }
				break;
			case 2:
				if ((bossT & 3) === 0) { BulBurst(bwx, bwy, 4, bossT * 3, 64, 18 + spdAdd, S_BDIAM, PL_YELLOW); }
				if ((bossT % (60 * intN_a)) === 0) { BulBurst(bwx, bwy - 26, 16, 0, 16, 12 + spdAdd, S_BBIG, PL_PINK); }
				break;
			case 3:
				if ((bossT % (16 * intN_a)) === 0) { BulBurst(bwx, bwy + 8, 18, bossT * 5, 14, 10 + spdAdd + (bossT & 7), S_BRING, PL_LIME); }
				if ((bossT % 50) === 25) { Fan(bwx, bwy, 3, 6, 34, S_BTINY, PL_YELLOW); }
				break;
			case 4:
				if ((bossT & 3) === 0)
				{
					BulBurst(bwx, bwy, 3, bossT * 7, 85, 18 + spdAdd, S_BSTAR, PL_PINK);
					BulBurst(bwx, bwy, 3, -bossT * 5, 85, 14 + spdAdd, S_BSMALL, PL_CYAN);
				}
				if ((bossT % (45 * intN_a)) === 0) { BulBurst(bwx, bwy, 20, bossT, 13, 10 + spdAdd, S_BBIG, PL_YELLOW); }
				break;
			case 5:
				if ((bossT % (30 * intN_a)) === 0) { Fan(bwx, bwy, 7, 9, 26 + spdAdd, S_BDIAM, PL_YELLOW); }
				if (((bossT & 7) === 0) && (intN_a < 3)) { BulBurst(bwx, bwy + 20, 1, rnd(256), 0, 5, S_BSTAR, PL_PINK); }
				break;
			case 6:
				if ((bossT & 1) === 0) { BulBurst(bwx, bwy, 2, Aim(bwx, bwy, intPX_a, psy) + S2(Sin(bossT * 4)), 128, 22 + spdAdd, S_BSMALL, PL_CYAN); }
				if ((bossT % (70 * intN_a)) === 35) { BulBurst(bwx, bwy, 24, bossT, 11, 10 + spdAdd, S_BRING, PL_LIME); }
				break;
			case 7:
				if (((bossT % (90 * intN_a)) === 45) && (ealive < 12))
				{
					for (intJ = 0; intJ <= 2; intJ++) { intA = Spawn(K_SWARM, bwx - 16 + intJ * 16, bwy + 24); }
					SfxPlay(2, 120, -3, 13, 20, 0);
				}
				if ((bossT % (20 * intN_a)) === 0) { BulBurst(bwx, bwy, 12, bossT * 7, 21, 12 + spdAdd, S_BSMALL, PL_PINK); }
				break;
			default:
				if ((bossT & 1) === 0) { BulBurst(bwx, bwy, 4, bossT * 2, 64, 16 + spdAdd, S_BSTAR, PL_YELLOW); }
				if (((bossT & 3) === 0) && (intN_a === 1)) { BulBurst(bwx, bwy, 4, 32 - bossT * 3, 64, 12 + spdAdd, S_BSMALL, PL_PINK); }
				if ((bossT % 50) === 0) { Fan(bwx, bwy, 3, 8, 30 + spdAdd, S_BBIG, PL_CYAN); }
				break;
		}
	}

	// the guardian's 16 sprites: one 64 x 64 sprite (on the Next 4 x 4 at sx + col * 16)
	function DrawBoss(intSX_a)
	{
		var intPal = bossPal;
		if ((intSX_a < -40 - WideL()) || (intSX_a > 296 + WideR()))
		{
			Hide(SP_BOSS);
		}
		else
		{
			if (bossFl > 0) { bossFl--; intPal = PL_FLASH; }
			Put(SP_BOSS, intSX_a, bwy, 'boss', 1, intPal, 0);
		}
	}

	// LoadLevel i: map i (planet * 6 + depth; 96 on open space): its tile set, its map (packed a row
	// at a time: turned into columns), its facts, its colours one of six ways
	function LoadLevel(intI_a)
	{
		var intO = intI_a * 8;
		var intMB = datByte(MAPBLK, intO) + MAPBLK, intMO = PakWord(MAPBLK, intO + 1);
		var intFB = datByte(MAPBLK, intO + 3) + MAPBLK, intFO = PakWord(MAPBLK, intO + 4);
		var intV = datByte(MAPBLK, intO + 7);
		var arrRows, intCols, intC, intJ, arrCol;
		tset = datByte(MAPBLK, intO + 6);
		arrRows = Unpack(intMB, intMO);
		intCols = (intI_a >= 96) ? SPACECOLS : 192;
		m_arrFacts = Unpack(intFB, intFO);
		m_arrCols = [];
		for (intC = 0; intC < intCols; intC++)
		{
			arrCol = [];
			for (intJ = 0; intJ < 32; intJ++) { arrCol.push(arrRows[intJ * intCols + intC]); }
			m_arrCols.push(arrCol);
		}
		ncols = m_arrFacts[0] + m_arrFacts[1] * 256;
		m_objGrid.setImage(0, 'dm_t' + tset + '_' + intV);
		m_objGrid.invalidate();
		// (the wide screen's terrain: the same tiles, written again from the new map)
		m_objWideGrid.setImage(0, 'dm_t' + tset + '_' + intV);
		m_objWideGrid.invalidate();
		m_arrWideCol = [];
		m_objImg = {};
	}

	// ReactorDown x, y: a part of the reactor gone - the last one: the escape
	function ReactorDown(intX_a, intY_a)
	{
		for (var intJ = 0; intJ <= 5; intJ++) { Boom(intX_a - 20 + rnd(40), intY_a - 16 + rnd(32), 1); }
		SfxPlay(1, 25, 1, 15, 60, 1);
		if (reactLeft > 0)
		{
			Msg('REACTOR PART DESTROYED', 90);
			Msg(trimStr(reactLeft) + ' TO GO', -1);
		}
		else
		{
			Msg('THE REACTOR IS GOING CRITICAL', 60);
			Msg('GET OUT - UP A SHAFT IN THE ROOF', -1);
			escT = 500;
			BulClear();
		}
	}

	// ====================================================================================================
	// MECHS.CLS: HELLGATE's giant mechs - up to 4, each near the part it guards (in open space, after
	// you); the one nearest the screen's middle drawn and hit (the dots' target 18)

	function MechsStart(intN_a)
	{
		var intJ, intI, blnDone;
		if (mN === 0)
		{
			Msg('WARNING', 120);
			Msg((intN_a === 1) ? 'GIANT MECH APPROACHING' : 'GIANT MECHS IN THE SECTOR', -1);
			mT = 0;
		}
		for (intJ = 1; intJ <= intN_a; intJ++)
		{
			blnDone = false;
			for (intI = 0; (intI <= 3) && !blnDone; intI++)
			{
				if ((mhp[intI] <= 0) && (mdie[intI] === 0))
				{
					mkd[intI] = (planet + intI + mWave) % 5;
					mhome[intI] = (rN > 0) ? rpx[(intI + mWave) % rN] : S4(pwx);
					mx[intI] = (S4(pwx) < mhome[intI]) ? mhome[intI] + 96 : mhome[intI] - 96;
					if (rN === 0) { mx[intI] = mhome[intI] + 220 - (intI & 1) * 440; }
					my[intI] = 80;
					mhp[intI] = mMax; mfl[intI] = 0;
					if (intI >= mN) { mN = intI + 1; }
					blnDone = true;
				}
			}
		}
		mWave++;
		SfxPlay(1, 400, 0, 15, 60, 0);
	}

	function MechsUpdate()
	{
		var intI, intSX, intBest = -1, intBD = 999, intD, intPX, intH, intTX, intJ, blnGo = true;
		mT++;
		if (mT > 30000) { mT = 1000; }
		intPX = S4(pwx);
		for (intI = 0; intI < mN; intI++)
		{
			if (mhp[intI] > 0)
			{
				if (rN === 0) { mhome[intI] = intPX; }
				if (Math.abs(intPX - mhome[intI]) < 220)
				{
					intTX = Math.max(mhome[intI] - 150, Math.min(mhome[intI] + 150, intPX));
				}
				else
				{
					intTX = mhome[intI];
				}
				if (((mT & 1) === 0) || (rN === 0))
				{
					if (mx[intI] < intTX - 2) { mx[intI] += 1 + S2(planet); }
					if (mx[intI] > intTX + 2) { mx[intI] -= 1 + S2(planet); }
				}
				my[intI] = 76 + S4(Sin((mT + intI * 40) * 2)) * 3 + S4(Sin(mT * 3 + intI * 64));
			}
			if ((mhp[intI] > 0) || (mdie[intI] > 0))
			{
				intSX = mx[intI] - cam;
				intD = Math.abs(intSX - 128);
				if ((intD < intBD) && (intSX > -40) && (intSX < 296)) { intBD = intD; intBest = intI; }
			}
		}
		if (intBest < 0)
		{
			// (none the Next would show: on a wide screen the nearest one alive in the extra is drawn,
			// only drawn - nothing else done with it)
			intBD = 999;
			for (intI = 0; intI < mN; intI++)
			{
				intSX = mx[intI] - cam;
				intD = Math.abs(intSX - 128);
				if ((mhp[intI] > 0) && (intD < intBD) && (intSX > -40 - WideL()) && (intSX < 296 + WideR())) { intBD = intD; intBest = intI; }
			}
			if (intBest >= 0)
			{
				DrawMech(intBest, mx[intBest] - cam);
			}
			else if (mDrawn)
			{
				Hide(SP_BOSS); mDrawn = 0;
			}
		}
		else
		{
			intI = intBest;
			intSX = mx[intI] - cam;
			if (mdie[intI] > 0)
			{
				mdie[intI]--;
				if ((mdie[intI] & 3) === 0)
				{
					Boom(mx[intI] - 28 + rnd(56), my[intI] - 18 + rnd(36), rnd(2));
					SfxPlay(2, 20 + rnd(20), 4, 15, 12, 1);
				}
				if (mdie[intI] === 0)
				{
					Hide(SP_BOSS); mDrawn = 0;
					Boom(mx[intI], my[intI], 1);
					blnGo = false;
				}
			}
			else
			{
				if ((intSX > boxL(28) + 2) && (intSX < boxR(28) - 1)) { AddBox(18, intSX, my[intI], 28, 20); }
				intH = Hits(18);
				if (intH > 0)
				{
					mhp[intI] -= intH; mfl[intI] = 3;
					AddScore(intH * 5);
					if (mhp[intI] <= 0) { MechDown(intI); blnGo = false; }
				}
				if (blnGo)
				{
					// running into it (a JSprites collision: |dx| < 26, |dy| < 20)
					if (alive && (inv === 0) && (guardT === 0) && (blossT === 0) && (invOn === 0))
					{
						// (it, where it is now: does it touch the ship's middle?)
						Put(SP_BOSS, intSX, my[intI] + 8, 'mech', mkd[intI] + 1, PL_ORANGE, 0);
						if (touches(SP_BOSS, shipZone(0, 0))) { Die(); }
					}
					if ((mT >= 60) && (intSX > 8) && (intSX < 248) && alive) { MechGuns(intI); }
				}
			}
			if (blnGo) { DrawMech(intI, intSX); }
		}
	}

	function DrawMech(intI_a, intSX_a)
	{
		var intPal = PL_ORANGE;
		if (mfl[intI_a] > 0) { mfl[intI_a]--; intPal = PL_FLASH; }
		if ((mdie[intI_a] > 0) && ((mdie[intI_a] & 4) !== 0)) { intPal = PL_FLASH; }
		Put(SP_BOSS, intSX_a, my[intI_a] + 8, 'mech', mkd[intI_a] + 1, intPal, 0);
		mDrawn = 1;
	}

	function MechGuns(intI_a)
	{
		var intT = mT + intI_a * 23, intPh, intSp, intY, intWX, intA;
		if (mhp[intI_a] * 3 > mMax * 2) { intPh = 1; } else if (mhp[intI_a] * 3 > mMax) { intPh = 2; } else { intPh = 3; }
		intSp = Math.min(40, 16 + idiv(planet, 2) + spdAdd);
		intY = my[intI_a] + 4;
		intWX = mx[intI_a];
		intA = Aim(intWX, intY, S4(pwx), psy);
		if (intPh === 1)
		{
			if ((intT % 44) === 0) { BulBurst(intWX, intY, 5, intA - 16, 8, intSp, S_BBIG, PL_PINK); }
			if ((intT % 110) === 55) { BulBurst(intWX, intY, 10 + idiv(planet, 2), intT & 31, idiv(256, 10 + idiv(planet, 2)), intSp - 4, S_BSMALL, PL_CYAN); }
		}
		else if (intPh === 2)
		{
			if ((intT % 5) === 0) { BulBurst(intWX, intY, 2, intT * 7, 128, intSp - 2, S_BSMALL, PL_PINK); }
			if ((intT % 70) === 0) { BulBurst(intWX, intY, 3, intA - 6, 6, intSp + 8, S_BDIAM, PL_CYAN); }
		}
		else
		{
			if ((intT % 45) === 0) { BulBurst(intWX, intY, 14 + idiv(planet, 2), idiv(intT, 45) * 9, idiv(256, 14 + idiv(planet, 2)), intSp - 4, S_BSMALL, PL_CYAN); }
			if ((intT % 28) === 14) { BulBurst(intWX, intY, 3, intA - 10, 10, intSp + 10, S_BBIG, PL_PINK); }
			if ((intT % 9) === 0) { BulBurst(intWX, intY, 1, intT * 11, 0, intSp, S_BSTAR, PL_YELLOW); }
		}
		if ((intT % 60) === 0) { SfxPlay(1, 90, 2, 11, 10, 0); }
	}

	function MechDown(intI_a)
	{
		var intJ;
		mhp[intI_a] = 0; mdie[intI_a] = 80;
		BulClear();
		AddScore(5000 * planet);
		Msg('GIANT MECH DESTROYED', 90);
		Msg('BONUS ' + trimStr(5000 * planet), -1);
		for (intJ = 1; intJ <= 4; intJ++)
		{
			if ((intJ & 1) !== 0) { Drop(I_BIGP, mx[intI_a] - 20 + intJ * 8, my[intI_a]); } else { Drop(I_GEM, mx[intI_a] - 20 + intJ * 8, my[intI_a]); }
		}
		SfxPlay(1, 31, 0, 15, 50, 1);
	}

	function MechsClear()
	{
		for (var intI = 0; intI <= 3; intI++) { mhp[intI] = 0; mdie[intI] = 0; }
		mN = 0; mWave = 0; mT = 0;
		if (mDrawn) { Hide(SP_BOSS); }
		mDrawn = 0;
	}

	function MechsAlive()
	{
		var intN = 0;
		for (var intI = 0; intI < mN; intI++)
		{
			if (mhp[intI] > 0) { intN++; }
		}
		return intN;
	}

	// ====================================================================================================
	// FRAMES AND WAITS (JSteps: an iteration is the Next's frame)

	var m_strLayers = 'SUL', m_intL2Bank = 9;
	var m_objL2Clip = { x:0, y:0, w:256, h:176 };

	// Show: the frame to the screen (the Next's Frame, Map.Upload, Bul.Show, Spr.Show) and the sound
	function Show()
	{
		SfxUpdate();
		frames++;
	}

	// a fade from one level to another a frame a step (fn_a after each: Show, or nothing - VFrame)
	function FadeLoop(intFrom_a, intTo_a, fn_a)
	{
		var intK = intFrom_a;
		var intDir = (intTo_a >= intFrom_a) ? 1 : -1;
		m_objSteps.until(function()
		{
			var blnDone = ((intDir > 0) && (intK > intTo_a)) || ((intDir < 0) && (intK < intTo_a));
			if (!blnDone)
			{
				PalFade(intK);
				if (fn_a !== null) { fn_a(); }
				intK += intDir;
			}
			return blnDone;
		});
	}

	// n frames of fn_a(i) (each its own iteration)
	function Frames(intN_a, fn_a)
	{
		var intI = 0;
		m_objSteps.until(function()
		{
			var blnDone = (intI >= intN_a);
			if (!blnDone)
			{
				fn_a(intI);
				intI++;
			}
			return blnDone;
		});
	}

	// ====================================================================================================
	// MAIN.BAS: set up, then the title and a game, round and round

	function Kind(intKD_a, intHP_a, intSC_a, intW_a, intH_a, intBig_a, intPat_a, intPal_a, intAnim_a)
	{
		kanim[intKD_a] = intAnim_a;
		khp[intKD_a] = intHP_a; ksc[intKD_a] = intSC_a; kw[intKD_a] = intW_a; kh[intKD_a] = intH_a; kbig[intKD_a] = intBig_a;
		kpat[intKD_a] = intPat_a; kpal[intKD_a] = intPal_a;
	}

	function Setup()
	{
		var intI;
		for (intI = 0; intI <= 40; intI++) { Kind(intI, 0, 0, 0, 0, 0, 0, 0, 0); }
		Kind(K_DART, 2, 100, 6, 4, 0, S_DART, PL_RED, 1);
		Kind(K_ORB, 6, 200, 6, 6, 0, S_ORB, PL_GREEN, 1);
		Kind(K_SPIN, 12, 400, 7, 7, 0, S_SPIN, PL_PURPLE, 1);
		Kind(K_SWARM, 1, 50, 5, 4, 0, S_SWARM, PL_FIRE, 1);
		Kind(K_MINER, 10, 300, 7, 5, 0, S_MINER, PL_FIRE, 1);
		Kind(K_TURRET, 10, 300, 7, 6, 0, S_TURRET, PL_STEEL, 3);
		Kind(K_HUNTER, 60, 2000, 14, 10, 1, S_HUNTER, PL_RED, 2);
		Kind(K_CARRIER, 40, 1000, 14, 9, 1, S_CARRIER, PL_PURPLE, 2);
		Kind(K_REACTOR, 250, 8000, 14, 14, 1, S_REACTOR, PL_BOSSA, 3);
		Kind(K_SNIPER, 8, 300, 7, 5, 0, S_SNIPER, PL_GREEN, 1);
		Kind(K_MINE, 2, 20, 5, 5, 0, S_MINE, PL_RED, 1);
		Kind(K_MUTANT, 4, 150, 6, 5, 0, S_MUTANT, PL_PURPLE, 1);
		Kind(K_DYNAMO, 8, 250, 6, 6, 0, S_DYNAMO, PL_RED, 1);
		for (intI = 0; intI < NE; intI++) { ek[intI] = 0; enPX[intI] = 0; enPY[intI] = 0; }
		for (intI = 0; intI < NI; intI++) { ik[intI] = 0; }
		for (intI = 0; intI < 20; intI++) { hit[intI] = 0; }
		for (intI = 0; intI < ND; intI++) { dc[intI] = 0; drows[intI] = 2; ddx[intI] = 0; ddy[intI] = 0; dl[intI] = 0; }
		for (intI = 0; intI < NB; intI++) { bdx[intI] = 0; bdy[intI] = 0; }
		for (intI = 0; intI < 32; intI++) { scn[intI] = 0; sco[intI] = 255; }
		makeSprites();
		for (intI = 0; intI < ND; intI++) { m_objSlots.put(dotSlot(intI), 0, 0, 'dot', 1, 'dm_dots'); }
		Spares();
		DotsReset();
		BulReset();
		PalFade(8);
		SlotsClip(176);
	}

	function MainLoop()
	{
		m_objSteps.call(Title);
		m_objSteps.call(Game);
		m_objSteps.call(MainLoop);
	}

	// ====================================================================================================
	// FRONT.CLS: the title, the keys, the game's order, the ending, the pause

	function Title()
	{
		var intT = 0, blnWait = true;
		HideSlots();
		BulReset();
		MapStill();
		MapCls();
		PalFade(0);
		m_strLayers = 'SUL';
		m_intL2Bank = 9;
		Panel(7);
		inPlay = 3;
		MapTextC(7, 14, 'WE TAKE THE WAR TO THEM.', 2);
		MapText(5, 23, 'K REDEFINE KEYS   ENTER PAUSE');
		MapTextC(8, 25, '(C) 2026 CYBORG UNICORN', 2);
		ShowKeys();
		FadeLoop(0, 8, null);
		m_objSteps.until(function()
		{
			var blnDone = false, blnF;
			SfxUpdate();
			frames++;
			intT++;
			if (intT === 30) { MapTextC(11, 21, 'PRESS FIRE TO PLAY', 1); }
			if (intT === 60) { MapText(11, 21, spaces(18)); intT = 0; }
			kp = PadRead();
			blnF = (kp & (P_LASER | P_SPRAY)) !== 0;
			if (!blnF) { blnWait = false; }
			if (blnF && !blnWait)
			{
				blnDone = true;
			}
			else if (down(K_K))
			{
				Redefine();
				m_objSteps.call(function() { ShowKeys(); blnWait = true; });
			}
			return blnDone;
		});
		m_objSteps.call(function()
		{
			SfxPlay(0, 80, -2, 15, 25, 0);
			inPlay = 0;
		});
		FadeLoop(8, 0, null);
	}

	function ShowKeys()
	{
		var str = '';
		for (var intK = 0; intK <= 3; intK++) { str += KeyName(m_arrKeyCode[intK]) + ' '; }
		MapText(5, 16, 'MOVE ' + str + spaces(14));
		MapText(5, 17, 'LASER ' + KeyName(m_arrKeyCode[4]) + '  SPRAY ' + KeyName(m_arrKeyCode[7]) + '  PATTERN ' + KeyName(m_arrKeyCode[5]) + '    ');
		MapText(5, 18, 'SMART ' + KeyName(m_arrKeyCode[6]) + '  GUARD ' + KeyName(m_arrKeyCode[10]) + '  INVISO ' + KeyName(m_arrKeyCode[9]) + '    ');
		MapText(5, 19, 'BLOSSOM ' + KeyName(m_arrKeyCode[8]) + '  HYPERSPACE ' + KeyName(m_arrKeyCode[11]) + '        ');
	}

	// K: the twelve keys redefined, one after another
	function Redefine()
	{
		var NAMES = 'UP        DOWN      LEFT      RIGHT     THE LASER THE PATTERNSMART BOMBTHE SPRAY THE BLOSSOMINVISO    THE GUARD HYPERSPACE';
		m_objSteps.until(function() { return PadScan() < 0; });
		processArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], function(intA_a)
		{
			m_objSteps.call(function()
			{
				MapTextC(5, 14, '  PRESS A KEY FOR ' + NAMES.substr(intA_a * 10, 10).replace(/\s+$/, '') + spaces(10), 1);
			});
			m_objSteps.until(function()
			{
				var intC = PadScan();
				var blnDone = (intC >= 0);
				if (blnDone)
				{
					m_arrKeyCode[intA_a] = intC;
					Spares();
					SfxPlay(0, 60, 0, 12, 4, 0);
				}
				return blnDone;
			});
			m_objSteps.until(function()
			{
				SfxUpdate();
				return PadScan() < 0;
			});
			m_objSteps.call(ShowKeys);
		});
		m_objSteps.call(function() { MapTextC(5, 14, '  DONE                            ', 1); });
		m_objSteps.wait(51);
		m_objSteps.call(function() { MapTextC(7, 14, 'WE TAKE THE WAR TO THEM.   ', 2); });
	}

	// a game: the intro, then each planet's film, its five depths and reactor, its film going up,
	// open space; after the 16th, round again harder
	function Game()
	{
		lives = 3; smarts = 3; guards = 3; invE = 300; energy = 0; power = 1; speed = 1; weapon = W_RING;
		nextBonus = 10000; pNext = 0; pAll = 0; gEat = 0;
		score = 0; mult = 1; multT = 0; loopN = 1; over = 0;
		nextExtend = 50000;
		planet = FIRST_PLANET; depth = FIRST_DEPTH;
		FilmShow(0);
		m_objSteps.call(GameLoop);
	}

	function GameLoop()
	{
		if (depth === 1) { FilmShow(1); }
		m_objSteps.call(StageRun);
		m_objSteps.call(function()
		{
			if (over)
			{
				Ending('GAME OVER');
			}
			else
			{
				if (depth === 6) { FilmShow(2); }
				m_objSteps.call(function()
				{
					depth++;
					if (depth > 7)
					{
						depth = 1; planet++;
						if (planet > 16)
						{
							Ending('THE INVASION IS OVER');
							loopN++; planet = 1;
						}
					}
					m_objSteps.call(GameLoop);
				});
			}
		});
	}

	function Ending(str_a)
	{
		var intN = 0, blnUp = false;
		if (score > hiscore) { hiscore = score; }
		HideSlots();
		BulReset();
		DotsWipe(0);
		Msg('', -2);
		// mid-screen: GAME OVER on row 14, or the loop's two lines
		MsgRows(2);
		msgR = 12;
		MapText(4, 12, spaces(32));
		if (str_a === 'GAME OVER')
		{
			MapTextC(4 + idiv(32 - str_a.length, 2), 14, str_a, 1);
		}
		else
		{
			MapTextC(4 + idiv(32 - str_a.length, 2), 12, str_a, 1);
			Msg('NOW IT GETS HARDER', -1);
		}
		m_objSteps.until(function()
		{
			var blnDone = false, blnF;
			intN++;
			Show();
			blnF = (PadRead() & (P_LASER | P_SPRAY)) !== 0;
			if (!blnF)
			{
				blnUp = true;
			}
			else if (blnUp && (intN > 50))
			{
				blnDone = true;
			}
			return blnDone || (intN >= 300);
		});
		m_objSteps.call(function() { Msg('', -2); });
		FadeLoop(8, 0, null);
	}

	// Enter: everything stops until Enter again
	function Pause()
	{
		inPlay = 2;
		m_objSteps.until(function() { return !down(K_ENTER); });
		m_objSteps.call(function()
		{
			MapTextC(4, 26, '         PAUSED - ENTER GOES ON   ', 1);
			MapTextC(4, 27, '  DOTS ' + ('  ' + DotsCount()).slice(-3) + '  BULLETS ' + ('  ' + live).slice(-3) + '  PEAK ' + ('  ' + peak).slice(-3) + ' ', 2);
			SfxQuiet();
		});
		m_objSteps.until(function() { return down(K_ENTER); });
		m_objSteps.until(function() { return !down(K_ENTER); });
		m_objSteps.call(function()
		{
			Panel(0);
			inPlay = 1;
		});
	}

	// ====================================================================================================
	// FILM.CLS: the films - 0 the intro (the fleet leaves Earth, the story's three pages), 1 the planet
	// ahead, 2 a planet going up. Any key skips one

	var F_PLANET = 0, F_EARTH = 4, F_STORY = 5;
	var T_LAUNCH = 18, T_APPROACH = 20, T_ESCAPE = 22, T_SKIP = 24;

	function FilmShow(intK_a)
	{
		var objF = { sk:false, up:false, pg:0, na:99, qx:0, qy:0, nvOn:true };
		var intS;

		// the picture n into Layer 2 (dark: the fade brings it up)
		function pc(intN_a)
		{
			var arrPix = m_objL2.getPixels();
			var intJ, intO, intB, intA, arrD, intK;
			PalFade(0);
			MapCls();
			for (intJ = 0; intJ < 6; intJ++)
			{
				intO = 1024 + (intN_a * 6 + intJ) * 3;
				intB = datByte(MAPBLK, intO) + MAPBLK; intA = PakWord(MAPBLK, intO + 1);
				arrD = Unpack(intB, intA);
				for (intK = 0; (intK < 8192) && (intK < arrD.length); intK++) { arrPix[intJ * 8192 + intK] = arrD[intK]; }
			}
			m_objL2.touch();
		}

		// the words n on row r, in the middle of columns c0 .. c0 + w - 1, in palette row cr
		function tx(intN_a, intR_a, intC0_a, intW_a, intCR_a)
		{
			var intO = 1280, intJ, str = '';
			for (intJ = 1; intJ <= intN_a; intJ++)
			{
				while (datByte(MAPBLK, intO) !== 0) { intO++; }
				intO++;
			}
			while (datByte(MAPBLK, intO) !== 0)
			{
				str += String.fromCharCode(datByte(MAPBLK, intO));
				intO++;
			}
			MapTextC(intC0_a + idiv(intW_a - str.length, 2), intR_a, str, intCR_a);
		}

		// a key (let go of first): skip
		function ky()
		{
			if ((PadScan() >= 0) || (PadRead() !== 0))
			{
				if (objF.up) { objF.sk = true; }
			}
			else
			{
				objF.up = true;
			}
		}

		// a nova now and then, big, somewhere in the sky (pg: on the planet's surface, more often)
		function nv()
		{
			objF.na++;
			if (objF.pg)
			{
				if (objF.na > 6 + rnd(8)) { objF.na = 0; objF.qx = 10 + rnd(236); objF.qy = 130 + rnd(50); SfxPlay(2, 20 + rnd(30), 4, 12, 10, 1); }
			}
			else if (objF.na > 30 + rnd(40))
			{
				objF.na = 0; objF.qx = 20 + rnd(216); objF.qy = 10 + rnd(110);
			}
			if (objF.na < 16)
			{
				Put(SL0 + 60, objF.qx + 24, objF.qy + 24, 'nova', undefined, ((objF.qx & 1) !== 0) ? PL_CYAN : PL_FIRE, 0, 2);
				m_objSlots.animate(SL0 + 60, 1, objF.na === 0);
			}
			else if (objF.na === 16)
			{
				Hide(SL0 + 60);
			}
		}

		// a film's frame: fn_a(t) for t 0 .. n, the novas, a key skips
		function loop(intN_a, fn_a)
		{
			var intT = 0;
			m_objSteps.until(function()
			{
				var blnDone = objF.sk || (intT > intN_a);
				if (!blnDone)
				{
					fn_a(intT);
					if (objF.nvOn) { nv(); }
					m_objSlots.step();
					ky();
					intT++;
				}
				return blnDone;
			});
		}

		function wt(intN_a)
		{
			loop(intN_a - 1, function() { doNothing(); });
		}

		function fade(intFrom_a, intTo_a)
		{
			var intK = intFrom_a;
			var intDir = (intTo_a >= intFrom_a) ? 1 : -1;
			m_objSteps.until(function()
			{
				var blnDone = objF.sk || ((intDir > 0) && (intK > intTo_a)) || ((intDir < 0) && (intK < intTo_a));
				if (!blnDone)
				{
					PalFade(intK);
					intK += intDir;
				}
				return blnDone;
			});
		}

		function unlessSkipped(fn_a)
		{
			m_objSteps.call(function() { if (!objF.sk) { fn_a(); } });
		}

		function ship(intN_a, intX_a, intY_a, intFlags_a)
		{
			Put(intN_a, intX_a + 16, intY_a + 24, 'ship', undefined, PL_SHIP, intFlags_a);
			m_objSlots.animate(intN_a, 1);
		}

		// the screen for a film: no play, the tilemap still and clear, the picture over all of Layer 2
		HideSlots();
		BulReset();
		DotsWipe(0);
		PalFade(0);
		MapStill();
		MapCls();
		m_strLayers = 'SUL';
		m_intL2Bank = 12;
		m_objL2Clip = { x:0, y:0, w:256, h:192 };
		SlotsClip(192);
		if (intK_a === 0)
		{
			pc(F_EARTH);
			tx(T_LAUNCH, 6, 4, 32, 1);
			tx(T_SKIP, 27, 4, 32, 2);
			fade(0, 8);
			objF.na = 99;
			loop(420, function(intT_a)
			{
				// twelve ships off Earth for the far stars, one after another
				var intI, intS2, intX, intY;
				for (intI = 0; intI <= 11; intI++)
				{
					intS2 = intT_a - intI * 14;
					if (intS2 > 0)
					{
						intX = 70 + idiv(intS2 * (16 + (intI % 3) * 5), 10);
						intY = 140 - idiv(intS2 * (7 + (intI % 4) * 2), 10) - (intI & 1) * 6;
						if ((intX < 250) && (intY > 2)) { ship(SL0 + intI * 2, intX, intY, 0); } else { Hide(SL0 + intI * 2); }
					}
				}
				if (intT_a === 200) { tx(T_LAUNCH + 1, 8, 4, 32, 2); }
			});
			// the story: three pages, each three panels shown in turn by Layer 2's clip window
			for (intS = 0; intS <= 2; intS++)
			{
				(function(intS_a)
				{
					unlessSkipped(function()
					{
						HideSlots();
						pc(F_STORY + intS_a);
						m_objL2Clip = { x:0, y:0, w:128, h:88 };
						tx(intS_a * 6, 4, 4, 16, 1);
						tx(intS_a * 6 + 1, 5, 4, 16, 1);
						tx(T_SKIP, 27, 4, 32, 2);
					});
					fade(0, 8);
					wt(160);
					unlessSkipped(function()
					{
						m_objL2Clip = { x:0, y:0, w:256, h:88 };
						SfxPlay(0, 60, -1, 10, 6, 0);
						tx(intS_a * 6 + 2, 4, 20, 16, 1);
						tx(intS_a * 6 + 3, 5, 20, 16, 1);
					});
					wt(160);
					unlessSkipped(function()
					{
						m_objL2Clip = { x:0, y:0, w:256, h:192 };
						SfxPlay(0, 60, -1, 10, 6, 0);
						tx(intS_a * 6 + 4, 15, 4, 32, 1);
						tx(intS_a * 6 + 5, 16, 4, 32, 1);
					});
					wt(220);
					fade(8, 0);
				})(intS);
			}
		}
		else if (intK_a === 1)
		{
			pc(F_PLANET + ((planet - 1) * 3) % 4);
			MapTextC(4 + idiv(32 - ('PLANET ' + planet + '  ' + Name(1)).length, 2), 6, 'PLANET ' + planet + '  ' + Name(1), 1);
			fade(0, 8);
			objF.na = 99;
			loop(300, function(intT_a)
			{
				// the ship in from the left, down to the planet's middle
				if (intT_a < 240)
				{
					ship(SP_SHIP, Math.min(120, -24 + intT_a), 40 + idiv(intT_a * intT_a, 600), 0);
				}
				else if (intT_a === 240)
				{
					Hide(SP_SHIP);
					SfxPlay(0, 40, 2, 12, 20, 0);
				}
				if (intT_a === 50) { tx(T_APPROACH, 8, 4, 32, 2); }
				if (intT_a === 130) { tx(T_APPROACH + 1, 10, 4, 32, 1); }
			});
		}
		else
		{
			pc(F_PLANET + ((planet - 1) * 3) % 4);
			fade(0, 8);
			objF.na = 99;
			loop(380, function(intT_a)
			{
				var intI, intS2, intX, intY, intJ;
				objF.nvOn = (intT_a < 150) || (intT_a > 250);
				if (intT_a < 150)
				{
					// the ship up off the surface and away to the top left; six drones after it
					intX = 128 - idiv(intT_a * 3, 4);
					intY = 150 - idiv(intT_a * 4, 3);
					if (intY > -20) { ship(SP_SHIP, intX, intY, MIRRORX); } else { Hide(SP_SHIP); }
					for (intI = 0; intI <= 5; intI++)
					{
						intS2 = intT_a - 14 - intI * 7;
						if (intS2 > 0)
						{
							intX = 128 + (intI - 3) * 6 - idiv(intS2 * 3, 4) + S4(Sin(intT_a * 6 + intI * 40));
							intY = 150 - idiv(intS2 * 4, 3) + S4(Sin(intT_a * 5 + intI * 60));
							if (intY > -20)
							{
								// (as the Next has it: kpal times Spr.Pal again - palette 0, twice as tall)
								Put(SP_EN + intI, intX + 24, intY + 24, 'fdart2y', undefined, 0, 0);
								m_objSlots.animate(SP_EN + intI, 1);
							}
							else
							{
								Hide(SP_EN + intI);
							}
						}
					}
					// the planet shaking itself apart under them
					objF.pg = 1;
				}
				if (intT_a === 150)
				{
					// it goes: white, then the pieces
					HideSlots();
					SfxPlay(1, 25, 1, 15, 80, 1);
					SfxPlay(2, 31, 0, 15, 60, 1);
					objF.pg = 0;
					objF.na = 99;
					FadeLoop(8, 16, null);
					m_objSteps.call(function()
					{
						DotsWipe(0);
						for (intJ = 0; intJ <= 120; intJ++) { m_objL2.plot(rnd(256), rnd(192), 255 - rnd(2) * 109); }
					});
					FadeLoop(16, 8, function() { m_objSteps.wait(1); });
					m_objSteps.call(function() { tx(T_ESCAPE, 8, 4, 32, 1); });
				}
				if ((intT_a > 150) && (intT_a < 250))
				{
					// the pieces flying out
					intS2 = intT_a - 150;
					for (intI = 0; intI <= 15; intI++)
					{
						intX = 128 + idiv(S3(Sin(intI * 16 + 64)) * intS2 * (2 + (intI & 3)), 16);
						intY = 180 + idiv(S3(Sin(intI * 16 + 8)) * intS2 * (2 + (intI & 3)), 16);
						if ((intX > -16) && (intX < 272) && (intY > -16) && (intY < 208))
						{
							Put(SL0 + 40 + intI, intX + 24, intY + 24, 'piece', undefined, ((intI & 1) !== 0) ? PL_YELLOW : PL_FIRE, 0);
							m_objSlots.animate(SL0 + 40 + intI, 1 + (intI & 3));
						}
						else
						{
							Hide(SL0 + 40 + intI);
						}
					}
				}
				if (intT_a === 200)
				{
					MapTextC(4 + idiv(32 - (Name(1) + ' DESTROYED').length, 2), 10, Name(1) + ' DESTROYED', 2);
				}
				if (intT_a > 250) { objF.pg = 0; }
			});
		}
		// back as play wants it: Layer 2 cut above the panel, the sprites to the play area
		m_objSteps.call(function() { objF.sk = false; });
		fade(8, 0);
		m_objSteps.call(function()
		{
			HideSlots();
			MapCls();
			DotsWipe(0);
			m_objL2Clip = { x:0, y:0, w:256, h:176 };
			SlotsClip(176);
		});
	}

	// ====================================================================================================
	// FOR THE TESTS

	this.test = function(strWhat_a)
	{
		var intM;
		var objResult = { inplay:inPlay, planet:planet, depth:depth, tset:tset, score:score, lives:lives, alive:alive, dots:DotsCount(), bullets:live,
			wi:wi, ealive:ealive, cleared:cleared, bossOn:bossOn, mN:mN, escT:escT, cam:cam, psx:psx, psy:psy, power:power, weapon:weapon, over:over, bossHP:bossHP, bossT:bossT, bwx:bwx, bwy:bwy, free:m_arrBFre.length };
		if (strWhat_a === 'clear') { cleared = 1; }
		if (strWhat_a === 'kill')
		{
			for (intM = 0; intM < NE; intM++)
			{
				if ((ek[intM] > 0) && (ek[intM] < K_PART) && (khp[ek[intM]] > 0)) { ehp[intM] = 0; }
			}
		}
		if (strWhat_a === 'waves') { wi = 0; while (Meta(16 + wi * 4) !== 0) { wi++; } }
		if (strWhat_a === 'boss') { wi = 0; while ((Meta(16 + wi * 4) !== 0) && (Meta(16 + wi * 4) !== K_BOSS)) { wi++; } waveT = 0; gate = 99; }
		if (strWhat_a === 'reactor') { for (intM = 0; intM < NE; intM++) { if (ek[intM] === K_REACTOR) { ehp[intM] = 0; } } }
		if (strWhat_a === 'escape') { pys = 30 * 16; pwx = L4(gapX[0]); inv = 30000; }
		if (strWhat_a === 'god') { GOD = 1; }
		if (strWhat_a === 'die') { inv = 0; Die(); }
		if (strWhat_a === 'lastlife') { lives = 1; Panel(6); }
		if (strWhat_a === 'safe') { inv = 30000; }
		if (strWhat_a.indexOf('goto') === 0) { planet = parseInt(strWhat_a.split(' ')[1], 10); depth = parseInt(strWhat_a.split(' ')[2], 10) - 1; cleared = 1; clearT = 199; }
		if (strWhat_a === 'burst') { BulBurst(bwx, bwy, 16, 0, 16, 16, S_BSMALL, PL_PINK); objResult.solid = Solid(bwx - cam, bwy); objResult.f1 = m_arrBFre.length; BulStep(psx, psy, cam); objResult.f2 = m_arrBFre.length; objResult.bx = bX.slice(120); objResult.by = bY.slice(120); objResult.bv=bvx.slice(120); }
		if (strWhat_a === 'bench')
		{
			// the cost of a game frame (Tick) and of drawing every sprite, in ms (the tests measure)
			var objC = document.createElement('canvas'), fltT0, intB;
			objC.width = 320; objC.height = 256;
			fltT0 = performance.now();
			for (intB = 0; intB < 50; intB++) { kp = 0; Tick(); }
			objResult.tickms = (performance.now() - fltT0) / 50;
			fltT0 = performance.now();
			for (intB = 0; intB < 50; intB++) { m_objSlots.paint(objC.getContext('2d')); }
			objResult.paintms = (performance.now() - fltT0) / 50;
			objResult.dots = DotsCount();
		}
		if (strWhat_a === 'power') { power = 5; weapon = W_ALL; energy = 96; Panel(0); }
		return objResult;
	};

	// ====================================================================================================
	// THE LOOPS

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		Wide();
		if (m_blnLoaded)
		{
			m_objSteps.update();
			WideFill();
		}
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
			if (m_strLayers === 'SLU') { BeamsRub(); }
			m_intWL = intL; m_intWR = intR;
			SlotsClip(m_intClipH);
		}
	}

	// the world shown either side (at most WIDEMAX)
	function WideL()
	{
		return Math.min(m_intWL, WIDEMAX);
	}

	function WideR()
	{
		return Math.min(m_intWR, WIDEMAX);
	}

	// full screen with the world shown either side (your dots and beams fly on out there)
	function WideOn()
	{
		return (m_intWL > 0) || (m_intWR > 0);
	}

	// the sprites' clip window: the paper (h 176: play - as wide as the screen shows the world) or
	// all of the picture (h 192: the films - the Next's 256)
	function SlotsClip(intH_a)
	{
		var intL = 0, intR = 0;
		m_intClipH = intH_a;
		if (intH_a === 176) { intL = WideL(); intR = WideR(); }
		m_objSlots.setClip(32 - intL, 32, 256 + intL + intR, intH_a);
	}

	// the wide screen's terrain: the world columns either side of the paper written into the ring
	// (each only when it isn't already the one there)
	function WideFill()
	{
		var intWC, intWC1, intMC, intK, arrCB;
		if ((m_strLayers === 'SLU') && ((m_intWL > 0) || (m_intWR > 0)))
		{
			intWC1 = S3(cam + 255 + WideR());
			for (intWC = S3(cam - WideL()); intWC <= intWC1; intWC++)
			{
				intMC = ((intWC % WGW) + WGW) % WGW;
				if (m_arrWideCol[intMC] !== intWC)
				{
					m_arrWideCol[intMC] = intWC;
					arrCB = ((intWC >= 0) && (intWC < ncols)) ? m_arrCols[intWC] : null;
					for (intK = 0; intK < 22; intK++) { m_objWideGrid.put(intMC, intK, (arrCB === null) ? 0 : arrCB[intK], 0); }
				}
			}
		}
	}

	// the terrain either side of the paper (a message's two rows left out, as the Next's tilemap has
	// them while it shows)
	function paintWideTiles(objContext_a)
	{
		var intL = WideL(), intR = WideR();
		var intS = cam - intL;
		var arrB = [], intY = 0;
		if ((intL > 0) || (intR > 0))
		{
			if (mrow !== 0)
			{
				processArray([mr1 * 8 - 32, mr2 * 8 - 32], function(intS_a)
				{
					arrB.push({ y:intY, h:intS_a - intY, scroll:intS });
					intY = intS_a + 8;
				});
			}
			arrB.push({ y:intY, h:176 - intY, scroll:intS });
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(32 - intL, 32, intL, 176);
			objContext_a.rect(288, 32, intR, 176);
			objContext_a.clip();
			m_objWideGrid.paint(objContext_a, 32 - intL, 32, arrB);
			objContext_a.restore();
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var objL2;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			objL2 = (m_intL2Bank === 12) ? m_objL2 : m_objTitleL2;
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			// the layers as the Next has them: in play the terrain under Layer 2 (the dots, the beams),
			// on the title and in the films Layer 2's picture under the text; the sprites over all
			if (m_strLayers === 'SLU')
			{
				paintWideTiles(objContext_a);
				paintTiles(objContext_a);
				paintL2(objContext_a, objL2);
				paintBeamW(objContext_a);
			}
			else
			{
				paintL2(objContext_a, objL2);
				paintTiles(objContext_a);
			}
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	function paintL2(objContext_a, objL2_a)
	{
		objContext_a.save();
		objContext_a.beginPath();
		objContext_a.rect(32 + m_objL2Clip.x, 32 + m_objL2Clip.y, m_objL2Clip.w, m_objL2Clip.h);
		objContext_a.clip();
		objL2_a.paint(objContext_a, 32, 32);
		objContext_a.restore();
	}

	// full screen: the beams' side strip, either side of the paper (as far as the world is shown)
	function paintBeamW(objContext_a)
	{
		var intL = WideL(), intR = WideR();
		if ((intL > 0) || (intR > 0))
		{
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(32 - intL, 32, intL, 176);
			objContext_a.rect(288, 32, intR, 176);
			objContext_a.clip();
			m_objBeamW.paint(objContext_a, 32 - 128, 32);
			objContext_a.restore();
		}
	}

	// the tilemap, clipped to the paper and the panel, scrolled as the copper scrolls it
	function paintTiles(objContext_a)
	{
		objContext_a.save();
		objContext_a.beginPath();
		objContext_a.rect(32, 32, 256, 192);
		objContext_a.clip();
		m_objGrid.paint(objContext_a, 0, 0, tileBands());
		objContext_a.restore();
	}

	this.run = function()
	{
		var intL, intR, intV, strBin, intI, arrTitle;
		// the data file
		strBin = atob(DM_DAT);
		m_arrDat = new Uint8Array(strBin.length);
		for (intI = 0; intI < strBin.length; intI++) { m_arrDat[intI] = strBin.charCodeAt(intI); }
		// the title's picture: blocks 9-11
		arrTitle = m_objTitleL2.getPixels();
		for (intI = 0; intI < 256 * 192; intI++) { arrTitle[intI] = m_arrDat[intI]; }
		m_objTitleL2.touch();
		// the images (tools/ports/defmulti_gfx.py)
		for (intL = 1; intL <= 4; intL++)
		{
			for (intR = 0; intR < 16; intR++)
			{
				m_objSprites.addImagesToLibrary([ { name:'dm_s' + intL + '_' + intR, classes:'defmulti', source:'images/defmulti/spr_' + intL + '_' + intR + '.png' } ]);
			}
			for (intV = 0; intV < 6; intV++)
			{
				m_objSprites.addImagesToLibrary([ { name:'dm_t' + intL + '_' + intV, classes:'defmulti', source:'images/defmulti/tiles_' + intL + '_' + intV + '.png' } ]);
			}
		}
		m_objSprites.addImagesToLibrary([ { name:'dm_dots', classes:'defmulti', source:'images/defmulti/dots.png' } ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['dm_t1_0'], first:0, firstcode:0, transparent:0 });
		m_objWideGrid = new JTileGrid(m_objSprites, { w:WGW, h:22, tilew:8, tileh:8, columns:16, images:['dm_t1_0'], first:0, firstcode:0, transparent:0 });
		Setup();
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:160, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + 18, y:107, size:13, key:K_S, label:'PATT' },
			{ type:'button', x:VIEW.x + 46, y:89, size:13, key:K_G, label:'GUARD' },
			{ type:'button', x:VIEW.x + 18, y:71, size:13, key:K_H, label:'HYPER' },
			{ type:'button', x:VIEW.x + 46, y:53, size:13, key:K_ENTER, label:'PAUSE' },
			{ type:'button', x:VIEW.x + VIEW.w - 30, y:194, size:22, key:K_SPACE, label:'LASER' },
			{ type:'button', x:VIEW.x + VIEW.w - 44, y:156, size:18, key:K_Z, label:'SPRAY' },
			{ type:'button', x:VIEW.x + VIEW.w - 18, y:125, size:15, key:K_B, label:'SMART' },
			{ type:'button', x:VIEW.x + VIEW.w - 46, y:96, size:14, key:K_I, label:'INV' },
			{ type:'button', x:VIEW.x + VIEW.w - 18, y:68, size:14, key:K_W, label:'BLOSS' }
		], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:K_SPACE, fire2:K_Z } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('defmulti'), function()
		{
			m_objGrid.invalidate();
			m_objWideGrid.invalidate();
			m_blnLoaded = true;
			MainLoop();
		});
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:true, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:VIEW.w, yresolution:VIEW.h, xorigin:VIEW.x, yorigin:VIEW.y, screenmode:'ask', cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new defmultiGame();
g_objGame.run();
