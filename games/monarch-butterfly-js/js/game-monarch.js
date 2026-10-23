// MONARCH BUTTERFLY - a horizontal scrolling shooter, ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The insects have come: a hive mind of smart, armoured, engineered insects, flying living ships out
// of a mothership the size of a moon. You fly the Monarch, a butterfly-winged fighter, through their
// hive on a flower world, down into their burrows, and along the hull of the mothership to its bridge.
// R-Type's play, slower: the screen creeps along, the terrain kills, and you have the Chrysalis - a
// pod that clips onto your nose or tail, eats bullets, and can be thrown off to fight on its own.
//
// Keys: Q A O P (or the arrows) move; Space (or 0, Z) fire - hold it for rapid fire and to charge the
// wave beam, let go to throw the beam; M (or X) the pod; B (or C) a bomb; H pause; K on the title
// redefines the seven keys. Touch: the pad on the left; FIRE, POD, BOMB and PAUSE on the right.
// Game pads: the stick, buttons A (fire), B (the pod), X (a bomb).
//
// How it's built on PotentJS:
// - the terrain is a JTileGrid the level's whole width (the Next streams it column by column into its
//   tilemap; here it's painted at the camera, the spawns and events still read a column at a time);
//   the text and the panel are a 40 x 32 JTileGrid over it; Layer 2 (the far backdrop at half the
//   scroll, the bosses, the title) is a picture painted under both, faded and scrolled;
// - the sprites are JSpriteSlots numbered as the Next's (the Monarch 0, the charge 4, the pod 5,
//   fireflies 6-7, the beam 8, seeds 12-15, laser 16-19, pickups 20-26, a spark 27, the insects
//   from 28, then the bullet engine's 24 shots and 40 bullets from 64). What a sprite does on its own
//   is its library entry: its loops (sequence, delay) and its hit box - the Monarch's is its head,
//   the pod's and fireflies' are what they eat. The game says what each is doing and asks what
//   touches: each pool flies by one moveRangeBy a frame (the speeds the functions), then
//   collideRange (shots on the insects, bullets on your head, the pod / seeds / beam on the
//   insects) and collideRect (bullets in the shields, the laser's line, a bomb, the insects on your
//   head, the pickups);
// - 50 iterations a second, as the Next's frames; JSteps keeps the BASIC's waits and loops.
function monarchGame()
{
	var m_objThis = this;
	var G = GFX_MONARCH;
	var D = DATA_MONARCH;

	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:96, y:32, w:256, h:192 };		// the part of the screen the game uses: the canvas shows only this
	var NE = 18, NI = 7, NM = 4, NB = 40, NS = 24;
	var K_GNAT = 1, K_WASP = 2, K_CARRIER = 3, K_MANTIS = 4, K_BEETLE = 5, K_DRAGON = 6, K_HORNET = 7, K_NEST = 8;
	var K_SPIDER = 9, K_FLEA = 10, K_BORER = 11, K_MOTH = 12, K_CENTI = 13, K_SEG = 14;
	var K_BEE = 15, K_CANNON = 16, K_HATCH = 17, K_SCARAB = 18, K_DRONE = 19;
	var K_QBODY = 20, K_QHEAD = 21, K_QSTING = 22, K_BEYE = 23, K_BSAC = 24, K_BBODY = 25;
	var K_CORE = 26, K_GUN = 27, K_HULL = 28;
	var K_PART = 30, K_BOOM = 31, K_BIGBOOM = 32;
	var I_P = 1, I_RED = 2, I_BLUE = 3, I_YELLOW = 4, I_SPEED = 5, I_MISSILE = 6, I_FLY = 7, I_BOMB = 8, I_POD = 9, I_BIGP = 10, I_GEM = 11;
	var PL_SHIP = 0, PL_FLASH = 1, PL_WASP = 2, PL_BEETLE = 3, PL_MANTIS = 4, PL_DRAGON = 5, PL_CARRIER = 6, PL_GNAT = 7;
	var PINK = 8, BLUE = 9, PL_SHOT = 10, PL_RED = 11, PL_BLUEC = 12, PL_YEL = 13, PL_FIRE = 14, PL_BOSS = 15;
	var POD_NONE = 0, POD_FRONT = 1, POD_BACK = 2, POD_OUT = 3, POD_FREE = 4, POD_BACKHOME = 5, POD_CALLED = 6;
	var XMIN = 12, XMAX = 236, YMIN = 10, YMAX = 166;
	var MIRRORX = SPRITE_MIRRORX, MIRRORY = SPRITE_MIRRORY;
	// the sprites, numbered as the Next's: the Monarch (one 32 x 32: the Next's 0-3), the charge, the
	// pod, the fireflies, the wave beam, the seeds, the laser, the pickups, a spark, the enemies (2
	// each), then the bullet engine's shots and bullets (the Next's 64-127)
	var SP_PL = 0, SP_FLARE = 4, SP_POD = 5, SP_FLY = 6, SP_BEAM = 8, SP_MIS = 12, SP_LAS = 16, SP_ITEM = 20, SP_SPARK = 27, SP_EN = 28, SP_SHOT = 64, SP_BUL = 88;
	// (a wide screen: the laser's 3 more segments, out to its right edge, in the beam's spare sprites)
	var SP_LASW = 9;
	// the controls (Pad.Read's bits)
	var P_UP = 1, P_DOWN = 2, P_LEFT = 4, P_RIGHT = 8, P_FIRE = 16, P_POD = 32, P_BOMB = 64;
	var K_H = 72, K_K = 75;
	var V_FIRE = 200, V_POD = 201, V_BOMB = 202;			// the touch buttons' and game pads' keys
	// an explosion's frames (et 1-15: a frame every 4)
	var BOOMSEQ = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 0];
	var ANIMSEQ = [1, 1, 1, 1, 2, 2, 2, 2, -1];

	// the sines: 256 steps round, x 127
	var SN = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3];
	// (the table's second half is the first negated)
	(function()
	{
		var intI;
		for (intI = 0; intI < 128; intI++) { SN[128 + intI] = -SN[intI]; }
	})();
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];

	var m_objSprites = new JSprites();
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objSet = {};			// each library sprite's sheet: the common one ('c') or a level's
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	var m_objPad = null, m_objText = null, m_objTerrain = null;
	// full screen (JCanvas's screenmode): how much more of the paper shows left and right of the Next's
	// 256 (0 in the normal mode), at most WIDEL left and WIDER right - past that it's black. The
	// backdrop and the level go on that far; an insect is still gone at x -40 and comes in at column 35
	// (its left edge 284 at the least), as on the Next, so on a wide screen they show up and go a little
	// inside the edges
	var WIDEL = 128, WIDER = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:96, y:32, w:256, h:192 };
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the keys: up, down, left, right, fire, the pod, a bomb (redefinable), and the spares
	var m_arrKeys = [81, 65, 79, 80, 32, 77, 66];
	var m_arrSpare = [[38, P_UP], [40, P_DOWN], [37, P_LEFT], [39, P_RIGHT], [48, P_FIRE], [90, P_FIRE], [88, P_POD], [67, P_BOMB]];

	// enemies: kind, position and speed (16ths of a pixel, paper), life, timer, a mode, its argument,
	// a wait before it comes in, when it fires next, a hit flash, where it started (y), its drop,
	// its frame (Move sets it); its box on, its hits so far
	var ek = [], ex = [], ey = [], evx = [], evy = [], ehp = [], et = [], ea = [], eb = [], ew = [], efire = [], ef = [], ey0 = [], edrop = [], eanim = [];
	// a wide screen: an insect that came in early, out past the Next's right edge, slides in with the
	// level, doing nothing, until it's where the Next would have made it (ex at or left of epre); then
	// it starts as if just made. -1: not coming in
	var epre = [], m_intPreD = 0, m_intNextEv = 0;
	var SPAWNX = 288;
	var FLYIN = 40;		// (frames a wide screen's coming-in insect takes to fly in from its right edge)		// (the furthest right the Next makes one: column (cam >> 3) + 35)
	var m_arrBoxOn = [], m_arrHit = [];
	// a wide screen: an insect drawn out in the extra space (or in the right-hand band where the Next
	// keeps a coming-in one box-less) has its box on for your weapons only (not a bomb), and the hits
	// your weapons give it there count (the Next only counts hits from x 0 to 249)
	var m_arrBoxW = [], m_arrHitW = [];
	// each kind: life, score, half box, big, its sprite, its palette, on the ground, deadly to touch, animation
	var khp = [], ksc = [], kw = [], kh = [], kbig = [], kpat = [], kpal = [], kgnd = [], kair = [], kanim = [];
	var ik = [], ix = [], iy = [], ivx = [], ivy = [], it = [];
	var mk = [], mxx = [], myy = [], mvx = [], mvy = [], mtg = [];
	var px = 0, py = 0, pxs = 0, pys = 0, alive = 0, inv = 0, deadT = 0;
	var power = 1, speed = 1, weapon = 0, missiles = 0, flies = 0, lives = 0, bombs = 0;
	var holdT = 0, charge = 0, fireWas = 0, podWas = 0, bombWas = 0, cool = 0;
	var beamOn = 0, beamX = 0, beamY = 0, beamS = 0, laserT = 0;
	var podSt = 0, podX = 0, podY = 0, podT = 0;
	var flyX = [0, 0], flyY = [0, 0], misT = 0, bombT = 0;
	var score = 0, hiscore = 20000, nextExtend = 50000;
	var chain = 0, chainT = 0, maxChain = 0, scoreDirty = 0, beamWas = 0;
	var stage = 1, loopN = 1, frames = 0, over = 0, cleared = 0, clearT = 0;
	var cam = 0, camAcc = 0, scrollSpd = 0, sd = 0, stopAt = -1, ckCol = 0;
	var msgT = 0, l2x = 0, backPic = '';
	var bossOn = 0, bossT = 0, bossMax = 0, bossPh = 0, bossDie = 0, bossRec = -1, bossPic = '';
	var bpr = [], bpk = [], bpx = [], bpy = [];
	var mlist = [], klist = [], mcount = 0, kcount = 0, dieF = 0, spdAdd = 0;
	var kp = 0;
	var m_blnGameDone = false;

	// the map: this level's columns (32 bytes each: 22 tiles, two spawns, an event), the next column to
	// come in (its spawns and events queued), the rows a message holds
	var m_arrMap = [], m_intCols = 0, m_intMapCols = 0, m_intNext = 0, m_intQuiet = 0, m_arrQueue = [], m_blnMsgRows = false, m_blnTerrain = false;
	// Layer 2: the picture shown, its scroll, its fade (0 black, 8 as drawn, 16 white)
	var m_strPicture = 'title', m_intL2X = 0, m_intL2Y = 0, m_intFade = 8;
	var m_intPause = 0;

	// the pools: shots and bullets in flight, their speeds
	var m_arrSOn = [], m_arrSVX = [], m_arrSVY = [], m_arrSDmg = [];
	var m_arrBOn = [], m_arrBVX = [], m_arrBVY = [];
	var m_arrShield = [null, null, null, null];
	var m_blnBulHit = false, m_intBulLive = 0, m_intEaten = 0, m_blnSparked = false, m_intSparkX = 0, m_intSparkY = 0, m_intLaserEnd = 0;
	var m_arrClearX = [], m_arrClearY = [];

	// ====================================================================================================
	// NUMBERS (the Next's 16 bit sums: shifts, a sine table, Rnd)

	function sinK(intA_a, intK_a)
	{
		var intS = SN[intA_a & 255];
		var intV = (Math.abs(intS) * intK_a) >> 4;
		return (intS < 0) ? -intV : intV;
	}

	function idiv(intA_a, intB_a)
	{
		var intQ = intA_a / intB_a;
		return (intQ < 0) ? Math.ceil(intQ) : Math.floor(intQ);
	}

	function rnd(intN_a)
	{
		return Math.floor(Math.random() * intN_a);
	}

	// the way (0-255: 0 down, 64 right, 128 up, 192 left) from x, y to tx, ty
	function aim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a;
		var intAX = Math.abs(intDX), intAY = Math.abs(intDY), intT = 0, intResult = 0;
		if ((intAX !== 0) || (intAY !== 0))
		{
			if (intAX <= intAY) { intT = ATN[idiv(intAX * 16, intAY)]; }
			else { intT = 64 - ATN[idiv(intAY * 16, intAX)]; }
			if (intDY >= 0)
			{
				intResult = (intDX >= 0) ? intT : ((256 - intT) & 255);
			}
			else
			{
				intResult = (intDX >= 0) ? (128 - intT) : (128 + intT);
			}
		}
		return intResult;
	}

	function seven(int_a)
	{
		return rightStr('0000000' + String(int_a), 7);
	}

	// ====================================================================================================
	// THE KEYS (Pad.Read: every control at once)

	function keyDown(intCode_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intCode_a, m_objViewPort);
	}

	function padRead()
	{
		var intBits = 0, intI;
		for (intI = 0; intI < 7; intI++)
		{
			if (keyDown(m_arrKeys[intI])) { intBits = intBits | (1 << intI); }
		}
		for (intI = 0; intI < m_arrSpare.length; intI++)
		{
			if ((m_arrKeys.indexOf(m_arrSpare[intI][0]) < 0) && keyDown(m_arrSpare[intI][0])) { intBits = intBits | m_arrSpare[intI][1]; }
		}
		if (keyDown(V_FIRE)) { intBits = intBits | P_FIRE; }
		if (keyDown(V_POD)) { intBits = intBits | P_POD; }
		if (keyDown(V_BOMB)) { intBits = intBits | P_BOMB; }
		return intBits;
	}

	// the first key (a letter, a digit, Space, Enter) held now; -1 none
	function padScan()
	{
		var intResult = -1, intC;
		for (intC = 90; intC >= 13; intC--)
		{
			if ((((intC >= 65) && (intC <= 90)) || ((intC >= 48) && (intC <= 57)) || (intC === 32) || (intC === 13)) && (m_arrKeyMap[intC] === 0))
			{
				intResult = intC;
			}
		}
		return intResult;
	}

	function keyName(intC_a)
	{
		var strResult = String.fromCharCode(intC_a);
		if (intC_a === 32) { strResult = 'SPACE'; }
		if (intC_a === 13) { strResult = 'ENTER'; }
		return strResult;
	}

	// ====================================================================================================
	// THE TILEMAP (Map.cls): the panel and the text (m_objText), the terrain (m_objTerrain)

	function mapPut(intX_a, intY_a, intT_a)
	{
		m_objText.put(intX_a, intY_a, intT_a, 4);
	}

	function mapText(intX_a, intY_a, str_a)
	{
		m_objText.text(intX_a, intY_a, str_a, 4);
	}

	function mapTextC(intX_a, intY_a, str_a, intRow_a)
	{
		m_objText.text(intX_a, intY_a, str_a, intRow_a);
	}

	// every cell blank: the text and the terrain (on the Next they're the same tilemap)
	function mapCls()
	{
		m_objText.clear(0, 4);
		m_blnTerrain = false;
	}

	// a level's map: its terrain (a JTileGrid its whole width) and the column count (the map bank's
	// #3E00; 480 when it isn't set)
	function mapLevel(intLevel_a)
	{
		var intC, intR, intN;
		m_arrMap = D.maps[intLevel_a];
		m_intMapCols = Math.floor(m_arrMap.length / 32);
		m_intCols = 480;
		intN = colByte(496, 0) + colByte(496, 1) * 256;
		if (intN > 0) { m_intCols = intN; }
		m_objTerrain = new JTileGrid(m_objSprites, { w:m_intCols, h:22, tilew:8, tileh:8, columns:16, images:['mon_tl' + intLevel_a], first:0, firstcode:0, transparent:0 });
		for (intC = 0; intC < m_intCols; intC++)
		{
			for (intR = 0; intR < 22; intR++)
			{
				m_objTerrain.put(intC, intR, colByte(intC, intR), 0);
			}
		}
		m_objTerrain.invalidate();
	}

	function colByte(intC_a, intK_a)
	{
		return (intC_a < m_intMapCols) ? m_arrMap[intC_a * 32 + intK_a] : 0;
	}

	// a wide screen: how much more shows right and left, in whole columns (0 on the Next's 256)
	function wideR()
	{
		return Math.min(m_intWR, WIDER) & ~7;
	}

	function wideL()
	{
		return Math.min(m_intWL, WIDEL) & ~7;
	}

	// Map.Start: from column col (the paper's left edge at its world x), the columns up to 36 on
	// read (their spawns left out: on a restart they'd be on top of you)
	function mapStart(intCol_a)
	{
		var intK;
		m_arrQueue = [];
		m_intNext = intCol_a; m_intNextEv = intCol_a;
		m_intQuiet = intCol_a + 32;
		m_blnTerrain = true;
		mapFill();
		m_intQuiet = 0;
		// (a wide screen: the ones that would start on it come in from its right edge instead)
		if (wideR() > 0)
		{
			for (intK = 0; intK < m_arrQueue.length; intK++)
			{
				if ((m_arrQueue[intK][0] <= 240) && (m_arrQueue[intK][4] < SPAWNX + wideR())) { m_arrQueue[intK][4] = SPAWNX + wideR(); }
			}
		}
	}

	// the columns coming in (Map.Fill): each one's spawns and event into the queue
	function mapFill()
	{
		var intK, intX;
		// the spawns (a wide screen: further on, coming in past the Next's right edge)
		while (m_intNext < ((cam + wideR()) >> 3) + 36)
		{
			if ((m_intNext < m_intCols) && (m_intNext >= m_intQuiet))
			{
				intX = (m_intNext * 8 - cam + 4) >> 1;
				for (intK = 22; intK <= 26; intK += 4)
				{
					if (colByte(m_intNext, intK) !== 0)
					{
						m_arrQueue.push([colByte(m_intNext, intK), colByte(m_intNext, intK + 1), colByte(m_intNext, intK + 2), colByte(m_intNext, intK + 3), intX * 2]);
					}
				}
			}
			m_intNext++;
		}
		// the events (where the Next has them, whatever the screen)
		while (m_intNextEv < (cam >> 3) + 36)
		{
			if (m_intNextEv < m_intCols)
			{
				intX = (m_intNextEv * 8 - cam + 4) >> 1;
				if (colByte(m_intNextEv, 30) !== 0)
				{
					m_arrQueue.push([240 + colByte(m_intNextEv, 30), 0, colByte(m_intNextEv, 31), 0, intX * 2]);
				}
			}
			m_intNextEv++;
		}
	}

	// the tile at paper x, y (0 off the play area, past the level's end, or in the rows a message holds);
	// blnWide_a: out as far as a wide screen shows the level (your shots go on that far)
	function tileAt(intX_a, intY_a, blnWide_a)
	{
		var intResult = 0, intC, intR, intWL = blnWide_a ? m_intWL : 0, intWR = blnWide_a ? m_intWR : 0;
		if (m_blnTerrain && (intY_a >= 0) && (intY_a <= 175) && (intX_a >= -32 - intWL) && (intX_a <= 287 + intWR))
		{
			intC = (cam + intX_a) >> 3;
			intR = intY_a >> 3;
			if ((intC >= 0) && (intC < m_intCols) && !(m_blnMsgRows && ((intR === 10) || (intR === 12))))
			{
				intResult = colByte(intC, intR);
			}
		}
		return intResult;
	}

	function solid(intX_a, intY_a)
	{
		return (tileAt(intX_a, intY_a) >= 128);
	}

	// the same for your own shots, the beam, the laser and the seeds: on a wide screen the land goes on
	// to its edges, so they meet it there
	function solidW(intX_a, intY_a)
	{
		return (tileAt(intX_a, intY_a, true) >= 128);
	}

	// rows 14 and 16 held still and cleared for a message (the terrain there isn't shown or solid)
	function msgRows(bln_a)
	{
		var intK;
		if (bln_a !== m_blnMsgRows)
		{
			m_blnMsgRows = bln_a;
			if (bln_a)
			{
				for (intK = 0; intK < 40; intK++)
				{
					mapPut(intK, 14, 0); mapPut(intK, 16, 0);
				}
			}
		}
	}

	// ====================================================================================================
	// LAYER 2 (Pal.cls): the picture shown, its fade

	function picture(strName_a)
	{
		m_strPicture = strName_a;
		m_intL2X = 0; m_intL2Y = 0;
	}

	function fade(intN_a)
	{
		var intN = intN_a;
		if (intN < 0) { intN = 0; }
		if (intN > 16) { intN = 16; }
		m_intFade = intN;
	}

	// ====================================================================================================
	// SPRITES: a sprite's look (one of the sheet's sprites, in a palette row)

	function sheetName(strSet_a, intRow_a)
	{
		return 'mon_' + strSet_a + '_' + intRow_a;
	}

	// strName_a's look in palette row intRow_a, its frames by arrSequence_a; intScale_a 2: twice the size
	// sprite n: library sprite strName_a at x, y in palette row intRow_a (frame 0 leaves the frame to
	// its animation), its sheet the common one or the level's; scale, mirroring optional
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, sheetName(m_objSet[strName_a], intRow_a), intScale_a, intFlags_a);
	}

	function hideRange(intFirst_a, intCount_a)
	{
		m_objSlots.hideRange(intFirst_a, intCount_a);
	}

	// ====================================================================================================
	// THE BULLET ENGINE (Bul.cls): 24 shots (class 'monshot') and 40 enemy bullets (class 'monbul'),
	// the insects' boxes (their own sprites), the shields

	function bulReset()
	{
		var intK;
		for (intK = 0; intK < NB; intK++) { m_arrBOn[intK] = false; }
		for (intK = 0; intK < NS; intK++) { m_arrSOn[intK] = false; }
		for (intK = 0; intK < NE; intK++) { m_arrBoxOn[intK] = false; m_arrHit[intK] = 0; epre[intK] = -1; m_arrBoxW[intK] = false; m_arrHitW[intK] = 0; }
		for (intK = 0; intK < 4; intK++) { m_arrShield[intK] = null; }
		hideRange(SP_SHOT, NS + NB);
		m_intBulLive = 0;
	}

	// Clear(): every enemy bullet gone (a bomb, a death): how many there were; where the first 8 were
	// Clear(): every enemy bullet gone (a bomb, a death): how many there were; where the first 8 were
	function bulClear()
	{
		var intK, intN = 0;
		for (intK = 0; intK < NB; intK++)
		{
			if (m_arrBOn[intK])
			{
				if (intN < 8)
				{
					m_arrClearX[intN] = Math.floor(m_objSlots.getX(SP_BUL + intK)) - 24; m_arrClearY[intN] = Math.floor(m_objSlots.getY(SP_BUL + intK)) - 24;
				}
				intN++;
				m_arrBOn[intK] = false;
			}
		}
		hideRange(SP_BUL, NB);
		return intN;
	}

	function clearShots()
	{
		var intK;
		for (intK = 0; intK < NS; intK++) { m_arrSOn[intK] = false; }
		hideRange(SP_SHOT, NS);
	}

	// Fire x, y, a, spd, pat, pal: an enemy bullet from x, y going way a at spd sixteenths of a pixel a
	// frame (vx = sin(a) * spd / 8 in 256ths), sprite pattern pat in palette pal
	// Fire x, y, a, spd, look, pal: an enemy bullet from x, y going way a at spd sixteenths of a pixel
	// a frame (vx = sin(a) * spd / 8 in 256ths), as library sprite strName_a in palette pal
	function bulFire(intX_a, intY_a, intA_a, intSpd_a, strName_a, intPal_a)
	{
		var intB = -1, intK, intS, intC;
		if ((intX_a >= 0) && (intX_a <= 255))
		{
			for (intK = NB - 1; intK >= 0; intK--)
			{
				if (!m_arrBOn[intK]) { intB = intK; }
			}
			if (intB >= 0)
			{
				m_arrBOn[intB] = true;
				intS = SN[intA_a & 255]; intC = SN[(intA_a + 64) & 255];
				m_arrBVX[intB] = (((Math.abs(intS) * intSpd_a) >> 3) * ((intS < 0) ? -1 : 1)) / 256;
				m_arrBVY[intB] = (((Math.abs(intC) * intSpd_a) >> 3) * ((intC < 0) ? -1 : 1)) / 256;
				spr(SP_BUL + intB, intX_a + 24.5, (intY_a & 255) + 24.5, strName_a, 1, intPal_a);
			}
		}
	}

	// Shot x, y, vx, vy, dmg, pat, row, mirrored: a player shot flying vx, vy pixels a frame
	// Shot x, y, vx, vy, dmg, look, row, mirrored: a player shot flying vx, vy pixels a frame
	function bulShot(intX_a, intY_a, intVX_a, intVY_a, intDmg_a, strName_a, intRow_a, intFlags_a)
	{
		var intS = -1, intK, intX;
		for (intK = NS - 1; intK >= 0; intK--)
		{
			if (!m_arrSOn[intK]) { intS = intK; }
		}
		if (intS >= 0)
		{
			m_arrSOn[intS] = true;
			m_arrSVX[intS] = intVX_a; m_arrSVY[intS] = intVY_a; m_arrSDmg[intS] = intDmg_a;
			// (a wide screen: one made left of 0 - the pod behind you - starts there, not wrapped round to the right)
			intX = ((m_intWL + m_intWR) > 0) ? intX_a : (intX_a & 255);
			spr(SP_SHOT + intS, intX + 24, (intY_a & 255) + 24, strName_a, 1, intRow_a, 1, intFlags_a);
		}
	}

	function addHit(intM_a, intDmg_a)
	{
		m_arrHit[intM_a] = Math.min(255, m_arrHit[intM_a] + intDmg_a);
	}

	function hits(intM_a)
	{
		var intResult = m_arrHit[intM_a];
		m_arrHit[intM_a] = 0;
		return intResult;
	}

	// one of your weapons hits it: as addHit, and kept apart for the wide screen's extra space
	function addHitW(intM_a, intDmg_a)
	{
		addHit(intM_a, intDmg_a);
		m_arrHitW[intM_a] = Math.min(255, m_arrHitW[intM_a] + intDmg_a);
	}

	function hitsW(intM_a)
	{
		var intResult = m_arrHitW[intM_a];
		m_arrHitW[intM_a] = 0;
		return intResult;
	}

	// is its box on for your weapons (the Next's box, or on a wide screen its box out there)?
	function boxOnW(intM_a)
	{
		return m_arrBoxOn[intM_a] || m_arrBoxW[intM_a];
	}

	// Touch(x, y, w, h, dmg): dmg to every box the box at x, y (w across, h down from its centre)
	// overlaps - a JSprites collision of the touch box with the insects: how many it touched
	// Touch(x, y, w, h, dmg): dmg to every insect whose hit box the box at x, y (w across, h down from
	// its centre) touches: how many it touched
	function bulTouch(intX_a, intY_a, intW_a, intH_a, intDmg_a)
	{
		var intN = 0, intM;
		for (intM = 0; intM < NE; intM++)
		{
			if (m_arrBoxOn[intM] && m_objSlots.collideRect(SP_EN + intM * 2, intX_a + 32 - intW_a, intY_a + 32 - intH_a, intW_a * 2, intH_a * 2))
			{
				addHit(intM, intDmg_a);
				intN++;
			}
		}
		return intN;
	}

	// a sprite's touch (the pod, a seed, the beam: their own hit boxes) on the insects: each one it
	// touches takes dmg; how many
	function touchBy(intN_a, intDmg_a)
	{
		var intN = 0;
		m_objSlots.collideRange(intN_a, SP_EN, NE * 2, function(intA_a, intB_a)
		{
			var intM = (intB_a - SP_EN) >> 1;
			if (boxOnW(intM))
			{
				addHitW(intM, intDmg_a);
				intN++;
			}
			return false;
		});
		return intN;
	}

	// Laser(x, y, dmg): a beam from x, y to the right, stopped by the nearest box in its way or a
	// solid tile: dmg to that one (the laser's box from x to the terrain, collided with the boxes)
	// Laser(x, y, dmg): a beam from x, y to the right, stopped by the nearest insect in its way or a
	// solid tile: dmg to that one (the beam's line asked of each insect's hit box)
	function bulLaser(intX_a, intY_a, intDmg_a)
	{
		var intC = 0, intXX = intX_a, intD, blnFar = false, intBest = -1, intM, intL, intMeet, intEnd;
		while (!blnFar && !solidW(intXX, intY_a))
		{
			intD = 8 - ((cam + intXX) & 7);
			intXX += intD; intC += intD;
			if (intX_a + intC > 255 + m_intWR) { blnFar = true; }
		}
		m_intLaserEnd = blnFar ? (255 + m_intWR) : (intX_a + intC);
		intEnd = m_intLaserEnd;
		for (intM = 0; intM < NE; intM++)
		{
			if (boxOnW(intM) && m_objSlots.collideRect(SP_EN + intM * 2, intX_a + 32, intY_a + 32, intEnd - intX_a, 0))
			{
				intL = Math.max(0, Math.ceil(m_objSlots.getBox(SP_EN + intM * 2).left) - 32);
				intMeet = (intL > intX_a) ? intL : intX_a;
				if (intMeet < m_intLaserEnd)
				{
					m_intLaserEnd = intMeet;
					intBest = intM;
				}
			}
		}
		if (intBest >= 0)
		{
			addHitW(intBest, intDmg_a);
			m_blnSparked = true; m_intSparkX = m_intLaserEnd; m_intSparkY = intY_a;
		}
		return intBest;
	}

	// Shield n, x, y, r: enemy bullets within r pixels (both ways) of x, y go
	// Shield n: enemy bullets inside the box go (the pod's and the fireflies' own hit boxes; the
	// beam's: r pixels both ways); null: none
	function shield(intN_a, objBox_a)
	{
		m_arrShield[intN_a] = objBox_a;
	}

	function shieldOf(intN_a)
	{
		var objB = m_objSlots.getBox(intN_a);
		return { x:objB.left, y:objB.top, w:objB.right - objB.left, h:objB.bottom - objB.top };
	}

	// Step: every shot and bullet moved (one moveSpritesByIDs a pool, the speeds the functions),
	// out of the play area or into the terrain they go; the shots hit the boxes, the bullets go into
	// the shields and hit your head - JSprites' collisions
	// Step: every shot and bullet moved (one moveRangeBy a pool, the speeds the functions), out of
	// the play area or into the terrain they go; the shots hit the insects, the bullets go into the
	// shields and hit your head - each asked of the sprites' own hit boxes
	function bulStep(blnHead_a)
	{
		var intK, intN, intX, intY, intJ;
		m_blnSparked = false; m_blnBulHit = false; m_intEaten = 0;
		// the shots
		m_objSlots.moveRangeBy(SP_SHOT, NS,
			function(intI_a) { return m_arrSOn[intI_a] ? m_arrSVX[intI_a] : 0; },
			function(intI_a) { return m_arrSOn[intI_a] ? m_arrSVY[intI_a] : 0; });
		for (intK = 0; intK < NS; intK++)
		{
			if (m_arrSOn[intK])
			{
				intN = SP_SHOT + intK;
				intX = m_objSlots.getX(intN) - 24; intY = m_objSlots.getY(intN) - 24;
				// (a wide screen: out to its edges)
				if ((intX < 4 - m_intWL) || (intX >= 252 + m_intWR) || (intY < 2) || (intY >= 178) || solidW(intX, intY))
				{
					m_arrSOn[intK] = false;
				}
				else
				{
					// the first insect it touches (whose box is on) takes its damage
					m_objSlots.collideRange(intN, SP_EN, NE * 2, function(intA_a, intB_a)
					{
						var intM = (intB_a - SP_EN) >> 1, blnHit = boxOnW(intM);
						if (blnHit)
						{
							addHitW(intM, m_arrSDmg[intK]);
							m_intSparkX = intX; m_intSparkY = intY; m_blnSparked = true;
							m_arrSOn[intK] = false;
						}
						return blnHit;
					});
				}
				if (!m_arrSOn[intK]) { m_objSlots.hide(intN); }
			}
		}
		// the bullets
		m_objSlots.moveRangeBy(SP_BUL, NB,
			function(intI_a) { return m_arrBOn[intI_a] ? m_arrBVX[intI_a] : 0; },
			function(intI_a) { return m_arrBOn[intI_a] ? m_arrBVY[intI_a] : 0; });
		m_intBulLive = 0;
		for (intK = 0; intK < NB; intK++)
		{
			if (m_arrBOn[intK])
			{
				intN = SP_BUL + intK;
				intX = Math.floor(m_objSlots.getX(intN)) - 24; intY = Math.floor(m_objSlots.getY(intN)) - 24;
				if ((intX < 2) || (intX >= 254) || (intY < 2) || (intY >= 178) || solid(intX, intY))
				{
					m_arrBOn[intK] = false;
				}
				else
				{
					for (intJ = 0; (intJ < 4) && m_arrBOn[intK]; intJ++)
					{
						if ((m_arrShield[intJ] !== null) && m_objSlots.collideRect(intN, m_arrShield[intJ].x, m_arrShield[intJ].y, m_arrShield[intJ].w, m_arrShield[intJ].h))
						{
							m_arrBOn[intK] = false;
							m_intEaten++;
						}
					}
				}
				if (m_arrBOn[intK]) { m_intBulLive++; } else { m_objSlots.hide(intN); }
			}
		}
		// your head (the Monarch's own hit box) on a bullet
		if (blnHead_a && (m_objSlots.collideRange(SP_PL, SP_BUL, NB).length > 0)) { m_blnBulHit = true; }
	}

	// ====================================================================================================
	// THE TITLE

	function title()
	{
		hideAll();
		bulReset();
		m_objSteps.call(function()
		{
			mapCls();
			m_objText.setImage(4, 'mon_tl1');
			fade(0);
			picture('title');
			panelText();
			mapTextC(9, 12, 'THE INSECTS HAVE COME', 2);
			mapText(6, 23, 'K REDEFINE KEYS    H PAUSE');
			mapTextC(8, 25, '(C) 2026 CYBORG UNICORN', 2);
			m_objPad.setControls(m_arrTitleControls);
		});
		fadeFrames(0, 8, 1);
		var intT = 0, blnFireWas = true;
		m_objSteps.until(function()
		{
			var blnDone = false, blnF;
			frames++;
			intT++;
			if (intT === 30) { mapTextC(12, 21, 'PRESS FIRE TO FLY', 1); }
			if (intT === 60) { mapText(12, 21, '                 '); intT = 0; }
			kp = padRead();
			blnF = ((kp & P_FIRE) !== 0);
			if (!blnF) { blnFireWas = false; }
			if ((blnF && !blnFireWas) || (m_objPad.taps().length > 0))
			{
				blnDone = true;
			}
			else if (m_arrKeyMap[K_K] === 0)
			{
				redefine();
				blnFireWas = true;
			}
			return blnDone;
		});
		m_objSteps.call(function() { m_objSound.play(0, 80, -2, 15, 25, false); });
		fadeFrames(8, 0, -1);
	}

	// a frame each: the fade from intFrom_a to intTo_a (Pal.Fade t : Frame)
	function fadeFrames(intFrom_a, intTo_a, intStep_a)
	{
		var intT = intFrom_a, blnDone = false;
		m_objSteps.until(function()
		{
			var blnResult = false;
			if (blnDone)
			{
				blnResult = true;
			}
			else
			{
				fade(intT);
				if (intT === intTo_a) { blnDone = true; }
				intT += intStep_a;
			}
			return blnResult;
		});
	}

	function showKeys()
	{
		var strS = '', intK;
		for (intK = 0; intK <= 3; intK++)
		{
			strS = strS + keyName(m_arrKeys[intK]) + ' ';
		}
		mapText(6, 15, 'MOVE     ' + strS + '      ');
		mapText(6, 16, 'FIRE     ' + keyName(m_arrKeys[4]) + '  HOLD: THE BEAM  ');
		mapText(6, 17, 'THE POD  ' + keyName(m_arrKeys[5]) + '       ');
		mapText(6, 18, 'BOMB     ' + keyName(m_arrKeys[6]) + '       ');
	}

	// every key in turn: press the one you want (let go of it before the next)
	function redefine()
	{
		var arrNames = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'FIRE', 'THE POD', 'BOMB'];
		var intA;
		m_objSteps.until(function() { return padScan() < 0; });
		m_objSteps.call(showKeys);
		for (intA = 0; intA < 7; intA++)
		{
			(function(intAction_a)
			{
				m_objSteps.call(function() { mapTextC(6, 13, 'PRESS A KEY FOR ' + arrNames[intAction_a] + '         ', 1); });
				m_objSteps.until(function()
				{
					var intC = padScan(), blnDone = false;
					if (intC >= 0)
					{
						m_arrKeys[intAction_a] = intC;
						m_objSound.play(0, 60, 0, 12, 4, false);
						blnDone = true;
					}
					return blnDone;
				});
				m_objSteps.until(function() { return padScan() < 0; });
				m_objSteps.call(showKeys);
			})(intA);
		}
		m_objSteps.call(function() { mapTextC(6, 13, 'DONE                         ', 1); });
		m_objSteps.wait(51);
		m_objSteps.call(function()
		{
			var intC;
			for (intC = 13; intC <= 18; intC++)
			{
				mapText(4, intC, '                                ');
			}
		});
	}

	// ====================================================================================================
	// THE PANEL: row 26 the score, the high score, lives, bombs; row 27 the beam's charge, the power, the chain

	function panelText()
	{
		var intK;
		for (intK = 4; intK <= 35; intK++)
		{
			mapPut(intK, 26, G.T_PANEL);
			mapPut(intK, 27, G.T_PANEL);
		}
		mapText(4, 26, '1P');
		mapText(16, 26, 'HI');
		showScore(); showHi();
	}

	function panel()
	{
		panelText();
		mapText(4, 27, 'BEAM');
		mapPut(9, 27, G.T_BARL);
		mapPut(20, 27, G.T_BARR);
		mapText(22, 27, 'POW');
		beamWas = -1;
		showBeam(); showLives(); showBombs(); showPower(); showChain();
	}

	function showScore()
	{
		mapText(7, 26, seven(score));
		scoreDirty = 0;
	}

	function showHi()
	{
		mapTextC(19, 26, seven(hiscore), 1);
	}

	function showLives()
	{
		var intK;
		for (intK = 0; intK <= 3; intK++)
		{
			mapPut(27 + intK, 26, (intK < lives - 1) ? G.T_LIFE : G.T_PANEL);
		}
	}

	function showBombs()
	{
		var intK;
		for (intK = 0; intK <= 4; intK++)
		{
			mapPut(31 + intK, 26, (intK < bombs) ? G.T_BOMB : G.T_PANEL);
		}
	}

	function showPower()
	{
		var intK;
		for (intK = 0; intK <= 4; intK++)
		{
			mapPut(26 + intK, 27, (intK < power) ? G.T_POW1 : G.T_POW0);
		}
	}

	function showChain()
	{
		if (chain > 1) { mapTextC(31, 27, rightStr('  ' + chain, 3) + 'X', 3); }
		else { mapText(31, 27, '    '); }
	}

	// the beam's charge: 10 cells, 3 steps each
	function showBeam()
	{
		var intV = charge >> 1, intK, intI = 3;
		if (intV > 30) { intV = 30; }
		if (intV !== beamWas)
		{
			beamWas = intV;
			for (intK = 0; intK <= 9; intK++)
			{
				if (intV >= intI) { mapPut(10 + intK, 27, (intV >= 30) ? G.T_BAR2 : G.T_BAR1); }
				else { mapPut(10 + intK, 27, G.T_BAR0); }
				intI += 3;
			}
		}
	}

	// a message across the play area for t frames (0: until the next)
	function message(str_a, intT_a)
	{
		msgRows(true);
		mapText(4, 14, '                                ');
		mapTextC(4 + idiv(32 - str_a.length, 2), 14, str_a, 1);
		msgT = intT_a;
	}

	function message2(str_a)
	{
		msgRows(true);
		mapText(4, 16, '                                ');
		mapText(4 + idiv(32 - str_a.length, 2), 16, str_a);
	}

	function clearMessage()
	{
		mapText(4, 14, '                                ');
		mapText(4, 16, '                                ');
		msgRows(false);
	}

	function addScore(intN_a)
	{
		score += intN_a;
		scoreDirty = 1;
		if (score >= nextExtend)
		{
			lives++; showLives();
			nextExtend += 50000;
			m_objSound.play(2, 50, -1, 15, 40, false);
		}
	}

	// ====================================================================================================
	// A GAME

	function game()
	{
		lives = 3; bombs = 2; power = 1; speed = 1; weapon = 0; missiles = 0; flies = 0;
		podSt = POD_NONE; score = 0; chain = 0; maxChain = 0; loopN = 1; stage = FIRST_STAGE; over = 0;
		nextExtend = 50000;
		m_blnGameDone = false;
		m_objSteps.until(function()
		{
			if (!m_blnGameDone)
			{
				m_objSteps.call(stageRun);
				m_objSteps.call(function()
				{
					if (over)
					{
						m_blnGameDone = true;
					}
					else
					{
						stage++;
						if (stage > G.LEVELS)
						{
							ending('THE HIVE IS BROKEN');
							m_objSteps.call(function() { loopN++; stage = 1; });
						}
					}
				});
			}
			return m_blnGameDone;
		});
		m_objSteps.call(function() { ending('GAME OVER'); });
	}

	function ending(str_a)
	{
		var intN = 0, blnUp = false;
		if (score > hiscore) { hiscore = score; }
		showHi();
		hideAll();
		bulReset();
		clearMessage();
		message(str_a, 0);
		if (str_a !== 'GAME OVER') { message2('NOW IT GETS HARDER'); }
		m_objSteps.until(function()
		{
			var blnDone = false, blnF;
			intN++;
			if (intN > 300)
			{
				blnDone = true;
			}
			else
			{
				blnF = ((padRead() & P_FIRE) !== 0);
				if (!blnF) { blnUp = true; }
				else if (blnUp && (intN > 50)) { blnDone = true; }
				if ((m_objPad.taps().length > 0) && (intN > 50)) { blnDone = true; }
			}
			return blnDone;
		});
		m_objSteps.call(clearMessage);
		fadeFrames(8, 0, -1);
	}

	function stageName()
	{
		var arrN = ['THE MEADOW FRONT', 'THE BURROWS', 'THE MOTHERSHIP'];
		return arrN[Math.min(stage, 3) - 1];
	}

	// a stage, from the start to its boss beaten (or the last life lost)
	function stageRun()
	{
		spdAdd = (loopN - 1) * 4;
		hideAll();
		bulReset();
		fade(0);
		mapCls();
		m_objText.setImage(4, 'mon_tl' + stage);
		mapLevel(stage);
		backPic = 'back' + stage;
		m_objPad.setControls(m_arrPlayControls);
		panel();
		ckCol = 0;
		cleared = 0; clearT = 0;
		restart();
		m_objSteps.call(function()
		{
			message('STAGE ' + stage, 150);
			message2(stageName());
		});
		m_objSteps.until(function()
		{
			var blnDone = false;
			if (m_intPause > 0)
			{
				pauseStep();
			}
			else
			{
				tick();
				if ((alive === 0) && (deadT === 0) && (lives === 0))
				{
					over = 1;
					blnDone = true;
				}
				else
				{
					if ((alive === 0) && (deadT === 0)) { restart(); }
					if (cleared)
					{
						clearT++;
						if (clearT === 1)
						{
							message('STAGE CLEAR', 0);
							message2('MAX HIT CHAIN ' + maxChain);
							addScore(maxChain * 100);
						}
						if (clearT > 200)
						{
							fadeFrames(8, 0, -1);
							m_objSteps.call(clearMessage);
							blnDone = true;
						}
					}
				}
			}
			return blnDone;
		});
	}

	// from the last checkpoint: the terrain, the ship, nothing else
	function restart()
	{
		var intK;
		for (intK = 0; intK < NE; intK++) { ek[intK] = 0; }
		for (intK = 0; intK < NI; intK++) { ik[intK] = 0; }
		for (intK = 0; intK < NM; intK++) { mk[intK] = 0; }
		hideAll();
		bulReset();
		bossOn = 0; stopAt = -1;
		picture(backPic);
		cam = ckCol * 8 + wideL(); camAcc = 0; scrollSpd = 8; sd = 0;		// (a wide screen: the land already that much on, so it fills the left)
		mapStart(ckCol);
		l2x = (cam >> 1) & 255;
		m_intL2X = l2x;
		px = 40; py = 88; pxs = px * 16; pys = py * 16;
		alive = 1; inv = 120; deadT = 0;
		holdT = 0; charge = 0; beamOn = 0; laserT = 0; cool = 0;
		fireWas = 1; podWas = 1; bombWas = 1; bombT = 0; misT = 0;
		chain = 0; chainT = 0; showChain();
		if (podSt !== POD_NONE) { podSt = POD_FRONT; }
		podX = px + 20; podY = py;
		for (intK = 0; intK <= 1; intK++)
		{
			flyX[intK] = px; flyY[intK] = py;
		}
		showPower(); showLives(); showBombs();
		intK = 0;
		m_objSteps.until(function()
		{
			var blnDone = (intK > 8);
			if (!blnDone)
			{
				show();
				fade(intK);
				intK++;
			}
			return blnDone;
		});
	}

	// one frame of the play
	function tick()
	{
		if (m_arrKeyMap[K_H] === 0)
		{
			m_intPause = 1;
		}
		else
		{
			spawns();
			scroll();
			playerMove();
			weapons();
			podUpdate();
			flyUpdate();
			beamUpdate();
			laserUpdate();
			missileUpdate();
			enemies();
			if (bossOn) { bossUpdate(); }
			items();
			bombUpdate();
			if (alive)
			{
				bulStep(true);
				if ((inv === 0) && m_blnBulHit) { die(); }
			}
			else
			{
				bulStep(false);
			}
			if (m_intEaten > 0) { addScore(m_intEaten * 10); }
			if (m_blnSparked) { spark(m_intSparkX, m_intSparkY); }
			if (!m_objSlots.isAnimated(SP_SPARK)) { m_objSlots.hide(SP_SPARK); }
			if (chainT > 0)
			{
				chainT--;
				if (chainT === 0) { chain = 0; showChain(); }
			}
			drawPlayer();
			if ((frames & 3) === 0)
			{
				if (scoreDirty) { showScore(); }
				showBeam();
			}
			if (msgT > 0)
			{
				msgT--;
				if (msgT === 0) { clearMessage(); }
			}
			show();
		}
	}

	// a spark: its sprite shows for 3 frames (its sequence) and is put away when it's done
	function spark(intX_a, intY_a)
	{
		spr(SP_SPARK, intX_a + 24, intY_a + 24, 'spark', 0, PL_SHOT);
		m_objSlots.animate(SP_SPARK, 1, true);
	}

	// H: everything stops until H again
	function pauseStep()
	{
		if (m_intPause === 1)
		{
			if (m_arrKeyMap[K_H] !== 0)
			{
				m_intPause = 2;
				mapTextC(4, 27, '         PAUSED - H GOES ON     ', 1);
				m_objSound.quiet();
			}
		}
		else if (m_intPause === 2)
		{
			if (m_arrKeyMap[K_H] === 0) { m_intPause = 3; }
		}
		else if (m_arrKeyMap[K_H] !== 0)
		{
			m_intPause = 0;
			panel();
			showScore();
		}
	}

	// the frame to the screen (Show: the sprites, the copper, Layer 2's scroll): the animations step
	// the frame to the screen (Show: the sprites, the copper, Layer 2's scroll): the sprites' movers
	// and animations a step on
	function show()
	{
		m_objSlots.step();
		m_intL2X = l2x;
		frames++;
	}

	function hideAll()
	{
		hideRange(0, SP_SHOT);
	}

	// ====================================================================================================
	// THE SCROLL AND WHAT IT BRINGS

	function scroll()
	{
		sd = 0;
		if (scrollSpd !== 0)
		{
			camAcc += scrollSpd;
			while (camAcc >= 16)
			{
				camAcc -= 16;
				cam++;
				sd++;
			}
			if ((stopAt >= 0) && (cam >= stopAt))
			{
				cam = stopAt; scrollSpd = 0; stopAt = -1;
				startBoss();
			}
			if (sd)
			{
				mapFill();
				l2x = (cam >> 1) & 255;
			}
		}
	}

	// what the new columns bring
	function spawns()
	{
		var arrQ;
		while (m_arrQueue.length > 0)
		{
			arrQ = m_arrQueue.shift();
			if (arrQ[0] > 240)
			{
				if (arrQ[0] === 241) { ckCol = ((cam + arrQ[4]) >> 3) - 2; }
				else if (arrQ[0] === 242) { stopAt = cam + arrQ[4] - 248; }
				else if (arrQ[0] === 243) { scrollSpd = arrQ[2]; }
				else if (arrQ[0] === 244) { cleared = 1; }
			}
			else
			{
				m_intPreD = (wideR() > 0) ? Math.max(0, arrQ[4] - SPAWNX) : 0;
				wave(arrQ[0], arrQ[4], arrQ[1], arrQ[2], arrQ[3]);
				m_intPreD = 0;
			}
		}
	}

	// a spawn: one enemy, or a line of them (a: how many)
	function wave(intKd_a, intX_a, intY_a, intA_a, intB_a)
	{
		var intN, intM, intK, intA = intA_a;
		if ((intKd_a === K_GNAT) || (intKd_a === K_WASP))
		{
			if (intA < 1) { intA = 1; }
			for (intN = 0; intN < intA; intN++)
			{
				intM = spawn(intKd_a, intX_a + 8, intY_a);
				if (intM >= 0)
				{
					ew[intM] = intN * 10; ea[intM] = intB_a;
					if ((intKd_a === K_WASP) && (intB_a === 1))
					{
						ey[intM] += (intN & 1) ? -512 : 512;
						ey0[intM] = ey[intM];
					}
				}
			}
		}
		else if (intKd_a === K_CARRIER)
		{
			intM = spawn(intKd_a, intX_a + 16, intY_a);
			if (intM >= 0) { edrop[intM] = intA; }
		}
		else if (intKd_a === K_CENTI)
		{
			// a head and a line of segments, each following the one before
			intM = spawn(intKd_a, intX_a + 8, intY_a);
			for (intN = 1; intN <= intA; intN++)
			{
				if (intM >= 0)
				{
					intK = spawn(K_SEG, intX_a + 8 + intN * 10, intY_a);
					if (intK >= 0) { eb[intK] = intM; }
					intM = intK;
				}
			}
		}
		else
		{
			intM = spawn(intKd_a, intX_a + 8, intY_a);
			if (intM >= 0) { ea[intM] = intA; eb[intM] = intB_a; }
		}
	}

	// spawn(kind, x, y): a free record set up (two for a big one): its number, -1 none free
	function spawn(intKd_a, intX_a, intY_a)
	{
		var intM, intSt = kbig[intKd_a] ? 2 : 1, intResult = -1;
		for (intM = 0; (intM <= NE - intSt) && (intResult < 0); intM += intSt)
		{
			if ((ek[intM] === 0) && ((intSt === 1) || (ek[intM + 1] === 0)))
			{
				ek[intM] = intKd_a; ex[intM] = intX_a * 16; ey[intM] = intY_a * 16; ey0[intM] = ey[intM];
				evx[intM] = 0; evy[intM] = 0; ehp[intM] = idiv(khp[intKd_a] * (2 + loopN), 3); et[intM] = 0; ea[intM] = 0; eb[intM] = 0;
				ew[intM] = 0; efire[intM] = 30 + rnd(40); ef[intM] = 0; edrop[intM] = 0; eanim[intM] = 0;
				epre[intM] = (m_intPreD > 0) ? (intX_a - m_intPreD) * 16 : -1;
				if (intSt === 2) { ek[intM + 1] = K_PART; }
				intResult = intM;
			}
		}
		return intResult;
	}

	// ====================================================================================================
	// THE SHIP

	function playerMove()
	{
		var intSp, intDX = 0, intDY = 0;
		if (alive === 0)
		{
			if (deadT > 0) { deadT--; }
		}
		else
		{
			if (inv > 0) { inv--; }
			kp = padRead();
			intSp = 24 + (speed + speed) * 4;
			if (kp & P_LEFT) { intDX = -intSp; }
			if (kp & P_RIGHT) { intDX = intSp; }
			if (kp & P_UP) { intDY = -intSp; }
			if (kp & P_DOWN) { intDY = intSp; }
			if ((intDX !== 0) && (intDY !== 0)) { intDX = (intDX * 3) >> 2; intDY = (intDY * 3) >> 2; }
			pxs += intDX; pys += intDY;
			if (pxs < XMIN * 16) { pxs = XMIN * 16; }
			if (pxs > XMAX * 16) { pxs = XMAX * 16; }
			if (pys < YMIN * 16) { pys = YMIN * 16; }
			if (pys > YMAX * 16) { pys = YMAX * 16; }
			px = pxs >> 4; py = pys >> 4;
			// the Monarch: its wings beat (its sequence)
			spr(SP_PL, px + 16, py + 16, 'player', 0, PL_SHIP);
			m_objSlots.animate(SP_PL, 1);
			// the terrain: the body's middle and its nose
			if (inv < 100)
			{
				if (solid(px + 12, py) || solid(px + 7, py)) { die(); }
			}
		}
	}

	function drawPlayer()
	{
		if (alive === 0)
		{
			m_objSlots.hide(SP_PL);
			m_objSlots.hide(SP_FLARE);
		}
		else
		{
			if ((inv > 0) && ((frames & 2) !== 0)) { m_objSlots.hide(SP_PL); }
			// the charge at the nose: flickering, steady when it's full
			if (charge > 8)
			{
				spr(SP_FLARE, px + 42, py + 24, 'flare', (charge >= 60) ? 2 : 0, PL_SHOT);
				if (charge < 60) { m_objSlots.animate(SP_FLARE, 1); }
			}
			else
			{
				m_objSlots.hide(SP_FLARE);
			}
		}
	}

	function die()
	{
		var intK;
		if ((alive !== 0) && !GOD)
		{
			alive = 0; deadT = 100;
			lives--;
			boom(px, py, 1);
			boom(px - 10, py - 6, 0);
			boom(px + 10, py + 6, 0);
			m_objSound.play(1, 31, 0, 15, 40, true);
			bulClear();
			beamOn = 0; laserT = 0; charge = 0; holdT = 0;
			m_objSlots.hide(SP_BEAM); hideRange(SP_LAS, 4); hideRange(SP_LASW, 3);
			// what's lost: some power, the speed, the seeds, the fireflies (the pod stays yours)
			power--;
			if (power < 1) { power = 1; }
			speed = 1; missiles = 0; flies = 0;
			hideRange(SP_FLY, 2); hideRange(SP_MIS, NM);
			for (intK = 0; intK < NM; intK++) { mk[intK] = 0; }
			if (podSt !== POD_NONE) { podSt = POD_FRONT; }
			m_objSlots.hide(SP_POD);
			chain = 0; chainT = 0; showChain();
			showLives(); showPower();
		}
	}

	// ====================================================================================================
	// YOUR WEAPONS: fire held shoots rapid fire (every 4 frames, 3 from power 3) and charges the beam;
	// let go with enough charge and the beam flies

	function weapons()
	{
		var blnF, blnP, blnB;
		if (cool > 0) { cool--; }
		if (alive !== 0)
		{
			blnF = ((kp & P_FIRE) !== 0);
			if (blnF)
			{
				holdT++;
				volley();
				if ((holdT > 12) && (charge < 60))
				{
					charge++;
					if (charge === 60) { m_objSound.play(2, 30, 0, 12, 6, false); }
				}
			}
			else
			{
				if (fireWas && (charge >= 12) && (beamOn === 0)) { beam(); }
				holdT = 0; charge = 0;
			}
			fireWas = blnF ? 1 : 0;
			// the pod: throw it, call it back
			blnP = ((kp & P_POD) !== 0);
			if (blnP && !podWas) { podKey(); }
			podWas = blnP ? 1 : 0;
			// a bomb
			blnB = ((kp & P_BOMB) !== 0);
			if (blnB && !bombWas && (bombs > 0) && (bombT === 0)) { bomb(); }
			bombWas = blnB ? 1 : 0;
			// the seeds go by themselves
			if (missiles > 0)
			{
				misT++;
				if (misT >= 40 - missiles * 8) { misT = 0; seeds(); }
			}
		}
	}

	// one volley of the weapon, the pod's and the fireflies' shots
	function volley()
	{
		var intX, intN, intS, intD;
		if (cool === 0)
		{
			cool = (power >= 3) ? 3 : 4;
			intX = px + 14;
			if (weapon === 0)
			{
				// the vulcan: two bolts; power 2 an angled one each way in turn, 3 both, 4 three bolts and
				// both, 5 the same harder
				intN = (power >= 5) ? 3 : 2;
				if (power >= 4)
				{
					bulShot(intX + 2, py, 14, 0, intN, 'vulcan', PL_SHOT, 0);
					bulShot(intX, py - 4, 14, 0, intN, 'vulcan', PL_SHOT, 0);
					bulShot(intX, py + 4, 14, 0, intN, 'vulcan', PL_SHOT, 0);
				}
				else
				{
					bulShot(intX, py - 3, 14, 0, 2, 'vulcan', PL_SHOT, 0);
					bulShot(intX, py + 3, 14, 0, 2, 'vulcan', PL_SHOT, 0);
				}
				if (power === 2)
				{
					if (frames & 1) { bulShot(intX, py - 3, 13, -2, 2, 'vulcan', PL_SHOT, 0); }
					else { bulShot(intX, py + 3, 13, 2, 2, 'vulcan', PL_SHOT, 0); }
				}
				else if (power >= 3)
				{
					bulShot(intX, py - 4, 13, -2, intN, 'vulcan', PL_SHOT, 0);
					bulShot(intX, py + 4, 13, 2, intN, 'vulcan', PL_SHOT, 0);
				}
			}
			else if (weapon === 1)
			{
				// red: a fan, 3 ways to 7
				intN = 1 + ((power + 1) >> 1);
				for (intS = -intN; intS <= intN; intS++)
				{
					bulShot(intX, py + intS * 2, 12, intS, 2, 'fan', PL_FIRE, 0);
				}
			}
			else if (weapon === 2)
			{
				// blue: the laser for a moment (laserUpdate), and a bolt
				laserT = 7;
				bulShot(intX, py, 14, 0, 2, 'vulcan', PL_BLUEC, 0);
			}
			else
			{
				// yellow: spores up and down and on, more with the power
				bulShot(intX, py, 13, 0, 3, 'spore', PL_YEL, 0);
				bulShot(intX - 4, py - 4, 10, -3, 3, 'spore', PL_YEL, 0);
				bulShot(intX - 4, py + 4, 10, 3, 3, 'spore', PL_YEL, 0);
				if (power >= 3)
				{
					bulShot(intX - 8, py - 6, 6, -5, 3, 'spore', PL_YEL, 0);
					bulShot(intX - 8, py + 6, 6, 5, 3, 'spore', PL_YEL, 0);
				}
				if (power >= 5)
				{
					bulShot(intX - 20, py - 2, -12, -1, 3, 'spore', PL_YEL, 0);
					bulShot(intX - 20, py + 2, -12, 1, 3, 'spore', PL_YEL, 0);
				}
			}
			// the pod on your nose or tail shoots too; out on its own it shoots ahead
			if (podSt === POD_FRONT)
			{
				bulShot(podX + 6, podY - 3, 14, 0, 2, 'vulcan', PL_SHOT, 0);
				bulShot(podX + 6, podY + 3, 14, 0, 2, 'vulcan', PL_SHOT, 0);
			}
			else if (podSt === POD_BACK)
			{
				bulShot(podX - 6, podY, -14, 0, 2, 'vulcan', PL_SHOT, MIRRORX);
			}
			else if ((podSt === POD_FREE) || (podSt === POD_OUT))
			{
				bulShot(podX + 6, podY, 14, 0, 2, 'vulcan', PL_SHOT, 0);
			}
			for (intD = 0; intD < flies; intD++)
			{
				bulShot(flyX[intD] + 6, flyY[intD], 13, 0, 1, 'vulcan', PL_YEL, 0);
			}
			m_objSound.play(0, 24, 2, 9, 3, false);
		}
	}

	// the wave beam: its size by the charge
	// the wave beam: its size by the charge
	function beam()
	{
		beamOn = 1;
		beamS = (charge >= 60) ? 2 : ((charge >= 36) ? 1 : 0);
		beamX = px + 16; beamY = py;
		laserT = 0; hideRange(SP_LAS, 4); hideRange(SP_LASW, 3);
		m_objSound.play(2, 120, -5, 15, 24, false);
	}

	function beamUpdate()
	{
		var intW, intH, intDmg, intRow;
		if (beamOn !== 0)
		{
			beamX += 7;
			if (beamS === 0) { intW = 8; intH = 6; intDmg = 2; }
			else if (beamS === 1) { intW = 15; intH = 7; intDmg = 3; }
			else { intW = 15; intH = 15; intDmg = 5; }
			if ((beamX - intW > 255 + m_intWR) || solidW(beamX + intW - 2, beamY))
			{
				beamOn = 0;
				m_objSlots.hide(SP_BEAM);
				shield(1, null);
			}
			else
			{
				// it hurts everything it touches (its own hit box); the bigger two eat bullets
				intRow = (frames & 2) ? PL_BLUEC : PL_SHOT;
				if (beamS === 0) { spr(SP_BEAM, beamX + 24, beamY + 24, 'wave0', 1, intRow); }
				else if (beamS === 1) { spr(SP_BEAM, beamX + 16, beamY + 24, 'wave1', 1, intRow); }
				else { spr(SP_BEAM, beamX + 16, beamY + 16, 'wave2', 1, intRow); }
				touchBy(SP_BEAM, intDmg);
				if (beamS > 0) { shield(1, { x:beamX + 33 - intH, y:beamY + 33 - intH, w:intH * 2 - 1, h:intH * 2 - 1 }); }
				else { shield(1, null); }
			}
		}
	}

	// the blue laser: straight ahead to whatever is in the way, for a few frames (4 segments, each
	// 16, 32 or 64 wide: the Next's sprite scaling)
	// the blue laser: straight ahead to whatever is in the way, for a few frames (4 segments, each
	// 16, 32 or 64 wide: the Next's sprite scaling)
	function laserUpdate()
	{
		var intX, intE, intN, intR, intW, intS;
		if (laserT !== 0)
		{
			laserT--;
			if ((laserT === 0) || (alive === 0))
			{
				hideRange(SP_LAS, 4); hideRange(SP_LASW, 3); laserT = 0;
			}
			else
			{
				intX = px + 14;
				bulLaser(intX, py, 1 + (power >> 1));
				intE = m_intLaserEnd;
				// (a wide screen: on with 3 more, as far as it reaches; the Next's 256 only takes the 4)
				for (intN = 0; intN < 7; intN++)
				{
					intS = (intN < 4) ? (SP_LAS + intN) : (SP_LASW + intN - 4);
					intR = intE - intX;
					if ((intR <= 0) || ((intN >= 4) && ((m_intWL + m_intWR) === 0)))
					{
						m_objSlots.hide(intS);
					}
					else
					{
						intW = (intR >= 64) ? 64 : ((intR >= 32) ? 32 : 16);
						spr(intS, intX + 32, py + 24, 'laser' + intW, 1, PL_BLUEC);
						intX += intW;
					}
				}
			}
		}
	}

	// ====================================================================================================
	// THE POD

	function podKey()
	{
		if (podSt === POD_FRONT)
		{
			podSt = POD_OUT; podT = 0;
			m_objSound.play(2, 90, 3, 13, 10, false);
		}
		else if (podSt === POD_BACK)
		{
			podSt = POD_BACKHOME; podT = 0;
			m_objSound.play(2, 90, 3, 13, 10, false);
		}
		else if ((podSt === POD_FREE) || (podSt === POD_OUT))
		{
			podSt = POD_CALLED; podT = 0;
			m_objSound.play(2, 60, -3, 13, 10, false);
		}
	}

	// POD_OUT: thrown forward; POD_BACKHOME: thrown back; POD_CALLED: called back; POD_FREE: on its own
	// POD_OUT: thrown forward; POD_BACKHOME: thrown back; POD_CALLED: called back; POD_FREE: on its own
	function podUpdate()
	{
		var intDX, intDY, intRow;
		if (podSt !== POD_NONE)
		{
			if (alive === 0)
			{
				shield(0, null);
			}
			else
			{
				podT++;
				if (podSt === POD_FRONT)
				{
					podX = px + 20; podY = py;
				}
				else if (podSt === POD_BACK)
				{
					podX = px - 20; podY = py;
				}
				else if (podSt === POD_OUT)
				{
					podX += 5;
					if ((podX > 220) || solid(podX + 8, podY)) { podSt = POD_FREE; }
				}
				else if (podSt === POD_BACKHOME)
				{
					podX -= 5;
					if ((podX < 24) || solid(podX - 8, podY)) { podSt = POD_FREE; }
				}
				else if (podSt === POD_FREE)
				{
					// it keeps level with you, slowly, and shoots on its own
					if (podY < py) { podY++; }
					if (podY > py) { podY--; }
					if ((podT & 15) === 0) { bulShot(podX + 6, podY, 14, 0, 2, 'vulcan', PL_SHOT, 0); }
					podX -= sd;
					if (podX < 16) { podX = 16; }
				}
				else
				{
					// called back: to the ship, then on its nose or its tail, whichever it reaches
					intDX = px - podX; intDY = py - podY;
					if (intDX > 4) { podX += 4; }
					else if (intDX < -4) { podX -= 4; }
					else { podX = px; }
					if (intDY > 3) { podY += 3; }
					else if (intDY < -3) { podY -= 3; }
					else { podY = py; }
					if ((Math.abs(intDX) < 24) && (Math.abs(intDY) < 10))
					{
						podSt = (podX >= px) ? POD_FRONT : POD_BACK;
						m_objSound.play(2, 40, 0, 12, 6, false);
					}
				}
				// it turns (its sequence), hurts what it touches and eats bullets (its hit box)
				intRow = (weapon === 1) ? PL_RED : ((weapon === 2) ? PL_BLUEC : PL_YEL);
				spr(SP_POD, podX + 24, podY + 24, 'pod', 0, intRow);
				m_objSlots.animate(SP_POD, 1);
				touchBy(SP_POD, ((podSt === POD_OUT) || (podSt === POD_BACKHOME)) ? 4 : 1);
				shield(0, shieldOf(SP_POD));
			}
		}
	}

	// the fireflies: above and below, a little behind, catching up
	// the fireflies: above and below, a little behind, catching up; they eat bullets (their hit boxes)
	function flyUpdate()
	{
		var intD, intTX, intTY;
		for (intD = 0; intD <= 1; intD++)
		{
			if ((intD < flies) && alive)
			{
				intTX = px - 6;
				intTY = (intD === 0) ? (py - 20) : (py + 20);
				flyX[intD] += (intTX - flyX[intD]) >> 2;
				flyY[intD] += (intTY - flyY[intD]) >> 2;
				spr(SP_FLY + intD, flyX[intD] + 24, flyY[intD] + 24, 'fly', 0, PL_YEL);
				m_objSlots.animate(SP_FLY + intD, (intD !== 0) ? 4 : 1);
				shield(2 + intD, shieldOf(SP_FLY + intD));
			}
			else
			{
				shield(2 + intD, null);
				m_objSlots.hide(SP_FLY + intD);
			}
		}
	}

	// ====================================================================================================
	// THE HOMING SEEDS

	function seeds()
	{
		var intN, intS = 0;
		for (intN = 0; intN < NM; intN++)
		{
			if ((mk[intN] === 0) && (intS < missiles))
			{
				mk[intN] = 1;
				mxx[intN] = px * 16; myy[intN] = py * 16;
				mvx[intN] = 24;
				mvy[intN] = (intS === 0) ? -32 : 32;
				mtg[intN] = target(px, py);
				intS++;
			}
		}
	}

	// the nearest enemy ahead that can be hurt, -1 none
	function target(intX_a, intY_a)
	{
		var intM, intD, intBest = 9999, intOX, intResult = -1;
		for (intM = 0; intM < NE; intM++)
		{
			if ((ek[intM] > 0) && (ek[intM] < K_PART) && (ew[intM] === 0) && (khp[ek[intM]] > 0) && (epre[intM] < 0))
			{
				intOX = ex[intM] >> 4;
				if ((intOX > intX_a) && (intOX < 256 + m_intWR))
				{
					intD = intOX - intX_a + Math.abs((ey[intM] >> 4) - intY_a);
					if (intD < intBest) { intBest = intD; intResult = intM; }
				}
			}
		}
		return intResult;
	}

	function missileUpdate()
	{
		var intN, intX, intY, intM, intFl, intF;
		for (intN = 0; intN < NM; intN++)
		{
			if (mk[intN])
			{
				intM = mtg[intN];
				if ((intM >= 0) && ((ek[intM] === 0) || (ek[intM] >= K_PART))) { intM = -1; }
				if ((intM < 0) && ((frames & 7) === intN)) { intM = target(mxx[intN] >> 4, myy[intN] >> 4); }
				mtg[intN] = intM;
				if (intM >= 0)
				{
					mvx[intN] += (ex[intM] > mxx[intN]) ? 5 : -5;
					mvy[intN] += (ey[intM] > myy[intN]) ? 5 : -5;
				}
				else
				{
					mvx[intN] += 4;
				}
				if (mvx[intN] > 56) { mvx[intN] = 56; }
				if (mvx[intN] < -40) { mvx[intN] = -40; }
				if (mvy[intN] > 48) { mvy[intN] = 48; }
				if (mvy[intN] < -48) { mvy[intN] = -48; }
				mxx[intN] += mvx[intN]; myy[intN] += mvy[intN];
				intX = mxx[intN] >> 4; intY = myy[intN] >> 4;
				// its look: right, or up / down and right, or the same to the left
				intF = 1; intFl = 0;
				if (Math.abs(mvy[intN]) * 2 > Math.abs(mvx[intN]))
				{
					intF = 2;
					if (mvy[intN] > 0) { intFl = MIRRORY; }
				}
				if (mvx[intN] < 0) { intFl = intFl | MIRRORX; }
				spr(SP_MIS + intN, intX + 24, intY + 24, 'missile', intF, PL_SHOT, 1, intFl);
				if ((intX < -m_intWL) || (intX > 255 + m_intWR) || (intY < 0) || (intY > 175) || solidW(intX, intY))
				{
					mk[intN] = 0; m_objSlots.hide(SP_MIS + intN);
				}
				else if (touchBy(SP_MIS + intN, 6) > 0)
				{
					mk[intN] = 0; m_objSlots.hide(SP_MIS + intN);
					spark(intX, intY);
				}
			}
		}
	}

	// ====================================================================================================
	// A BOMB

	function bomb()
	{
		var intN, intJ;
		bombs--; showBombs();
		bombT = 40;
		intN = bulClear();
		if (intN > 8) { intN = 8; }
		for (intJ = 0; intJ < intN; intJ++)
		{
			drop(I_GEM, m_arrClearX[intJ], m_arrClearY[intJ]);
		}
		bulTouch(128, 88, 140, 100, 40);
		if (inv < 40) { inv = 40; }
		m_objSound.play(1, 40, 2, 15, 40, true);
	}

	function bombUpdate()
	{
		if (bombT !== 0)
		{
			bombT--;
			if (bombT > 32) { fade(16 - (40 - bombT)); }
			else if (bombT === 32) { fade(8); }
			if (bombT > 20) { bulClear(); }
		}
	}

	// ====================================================================================================
	// THE ENEMIES

	function enemies()
	{
		var intJ, intM;
		enemyPre();
		for (intJ = 0; intJ < mcount; intJ++)
		{
			intM = mlist[intJ];
			move(intM, ek[intM]);
		}
		enemyPost();
		for (intJ = 0; intJ < kcount; intJ++)
		{
			intM = klist[intJ];
			kill(intM, ek[intM], ex[intM] >> 4, ey[intM] >> 4);
		}
		if (dieF) { die(); }
	}

	function hideEnemy(intM_a)
	{
		m_objSlots.hide(SP_EN + intM_a * 2);
	}

	function remove(intM_a)
	{
		m_arrBoxOn[intM_a] = false; m_arrBoxW[intM_a] = false;
		hideEnemy(intM_a);
		if (kbig[ek[intM_a]]) { ek[intM_a + 1] = 0; }
		ek[intM_a] = 0;
	}

	// EnemyPre: explosions go off (back with the terrain), ground things go by with the terrain, waiting
	// ones count down; the ones to move are listed for move
	// EnemyPre: explosions go by with the terrain and go when their sprite has played through, ground
	// things go by with the terrain, waiting ones count down; the ones to move are listed for move
	function enemyPre()
	{
		var intM, intK, intN;
		mcount = 0;
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			intN = SP_EN + intM * 2;
			if (intK >= K_BOOM)
			{
				if (!m_objSlots.isAnimated(intN))
				{
					ek[intM] = 0;
					m_objSlots.hide(intN);
				}
				else
				{
					ex[intM] -= sd * 16;
					m_objSlots.moveBy(intN, -sd, 0);
				}
			}
			else if ((intK !== 0) && (intK < K_PART))
			{
				if (epre[intM] >= 0)
				{
					// coming in on a wide screen: by with the level until where the Next makes it
					ex[intM] -= sd * 16;
					if (ex[intM] <= epre[intM]) { epre[intM] = -1; }
				}
				else
				{
					if (kgnd[intK]) { ex[intM] -= sd * 16; }
					if (ew[intM] !== 0) { ew[intM]--; }
					else { mlist[mcount] = intM; mcount++; }
				}
			}
		}
	}

	// EnemyPost: after move, every live one: off the edges it goes; its hits taken off its life (a kill
	// listed); its box for the shots (its own sprite's hit box); its look; touching your head (a
	// JSprites collision)
	// EnemyPost: after move, every live one: off the edges it goes; its hits taken off its life (a kill
	// listed); its box on for the shots (its sprite's own hit box); its look (the kind's sprite, its
	// loop; white while hit, upside down on a ceiling); touching your head
	// its look: the kind's sprite, its loop; white while hit, upside down on a ceiling
	function enemyLook(intM_a, intK_a, intX_a, intY_a, intN_a)
	{
		var intRow = kpal[intK_a], intFl;
		if (ef[intM_a] > 0) { ef[intM_a]--; intRow = PL_FLASH; }
		intFl = (kgnd[intK_a] && (ea[intM_a] === 1)) ? MIRRORY : 0;
		if (kanim[intK_a] === 3)
		{
			// its frame is what it's doing (move sets it)
			spr(intN_a, intX_a + 24, intY_a + 24, 'k' + intK_a, 1 + eanim[intM_a], intRow, 1, intFl);
		}
		else
		{
			// its own loop; every other record steps out of time with its neighbour
			spr(intN_a, intX_a + (kbig[intK_a] ? 16 : 24), intY_a + (kbig[intK_a] ? 16 : 24), 'k' + intK_a, 0, intRow, 1, intFl);
			m_objSlots.animate(intN_a, ((intM_a & 1) !== 0) ? 4 : 1);
		}
	}

	function enemyPost()
	{
		var intM, intK, intX, intY, intH, intHW, intN;
		kcount = 0; dieF = 0;
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			intN = SP_EN + intM * 2;
			if ((intK !== 0) && (intK < K_PART))
			{
				if ((ew[intM] === 0) && (epre[intM] < 0))
				{
					ex[intM] += evx[intM]; ey[intM] += evy[intM]; et[intM]++;
				}
				intX = ex[intM] >> 4; intY = ey[intM] >> 4;
				if (epre[intM] >= 0)
				{
					// coming in on a wide screen: flown in from past its right edge over the last FLYIN
					// frames before the Next would have made it (where it is in the level, ex, goes on
					// by with the level as before: it starts from there); no box
					m_arrBoxOn[intM] = false; m_arrBoxW[intM] = false; m_arrHitW[intM] = 0;
					intH = (scrollSpd > 0) ? Math.floor((ex[intM] - epre[intM]) / scrollSpd) : FLYIN + 1;
					if (kgnd[intK])
					{
						// (one on the ground comes in with the land it's on)
						if (intX + 40 < 311 + m_intWR) { enemyLook(intM, intK, intX, intY, intN); } else { hideEnemy(intM); }
					}
					else if (intH > FLYIN)
					{
						hideEnemy(intM);
					}
					else
					{
						intX = (epre[intM] >> 4) + Math.floor(((256 + 24 + m_intWR) - (epre[intM] >> 4)) * intH / FLYIN);
						enemyLook(intM, intK, intX, intY, intN);
					}
				}
				else if ((intX + 40 > 360) || (intX + 40 < 0) || (intY + 40 > 260) || (intY + 40 < 0))
				{
					// off the edges: gone
					m_arrBoxOn[intM] = false; m_arrBoxW[intM] = false;
					hideEnemy(intM);
					ek[intM] = 0;
					if (kbig[intK]) { ek[intM + 1] = 0; }
				}
				else if ((ew[intM] !== 0) || (intX + 40 >= 311 + m_intWR))
				{
					// waiting, or still coming in on the right: no box, not drawn
					m_arrBoxOn[intM] = false; m_arrBoxW[intM] = false;
					hideEnemy(intM);
				}
				else
				{
					// (still coming in on the right, on a wide screen - x 271 on: drawn; the Next gives it
					// no box, here your weapons can hit it)
					intH = hits(intM); intHW = hitsW(intM);
					if ((intH > 0) && (khp[intK] > 0) && (intX >= 0) && (intX < 250))
					{
						ehp[intM] -= intH; ef[intM] = 2;
					}
					else if ((intHW > 0) && (khp[intK] > 0) && ((m_intWL + m_intWR) > 0) && ((intX < 0) || (intX >= 250)))
					{
						// a wide screen: your weapons' hits out past where the Next counts them
						ehp[intM] -= intHW; ef[intM] = 2;
					}
					if ((khp[intK] > 0) && (ehp[intM] <= 0))
					{
						klist[kcount] = intM; kcount++;
					}
					else
					{
						m_arrBoxOn[intM] = (intX >= 0) && (intX <= 255) && (intY >= 0) && (intY <= 255) && (intX + 40 < 311);
						m_arrBoxW[intM] = !m_arrBoxOn[intM] && ((m_intWL + m_intWR) > 0) && (intX >= -m_intWL) && (intX + 40 < 311 + m_intWR) && (intY >= 0) && (intY <= 255);
						enemyLook(intM, intK, intX, intY, intN);
						// flying into you: does its hit box touch your head (px + 9, py: 4 across, 2 down)?
						if (kair[intK] && alive && (inv === 0) && m_objSlots.collideRect(intN, px + 39, py + 31, 4, 2))
						{
							dieF = 1;
						}
					}
				}
			}
		}
	}

	// how each kind moves and shoots
	function move(intM_a, intKd_a)
	{
		var intX, intY, intT, intA, intN, intK;
		intT = et[intM_a];
		intX = ex[intM_a] >> 4; intY = ey[intM_a] >> 4;
		switch (intKd_a)
		{
			case K_GNAT:
				// a swarm: 0 a wave across, 1 dives at you, 2 a loop
				evx[intM_a] = -28 - spdAdd;
				if (ea[intM_a] === 0)
				{
					ey[intM_a] = ey0[intM_a] + sinK(intT * 3, 48);
				}
				else if (ea[intM_a] === 1)
				{
					if ((intX < 200) && (eb[intM_a] === 0))
					{
						eb[intM_a] = 1;
						intA = aim(intX, intY, px, py);
						evx[intM_a] = sinK(intA, 64); evy[intM_a] = sinK(intA + 64, 64);
					}
					if (eb[intM_a]) { evx[intM_a] = evx[intM_a] - 1; }
				}
				else
				{
					if ((intX < 170) && (eb[intM_a] < 128))
					{
						eb[intM_a] += 4;
						evx[intM_a] = sinK(eb[intM_a] + 192, 64) - 8;
						evy[intM_a] = sinK(eb[intM_a] + 128, 64);
					}
				}
				if ((loopN > 1) && (intT === efire[intM_a])) { shoot(intX, intY, aim(intX, intY, px, py), 20, 'bsmall', PINK); }
				break;
			case K_WASP:
				if (ea[intM_a] === 0)
				{
					// in, a stop to shoot, away
					if (intT < 50)
					{
						evx[intM_a] = -32;
					}
					else if (intT < 110)
					{
						evx[intM_a] += 2;
						if (evx[intM_a] > 0) { evx[intM_a] = 0; }
						if (intT === 80) { fan(intX, intY, 3 + loopN - 1, 10, 22, 'bsmall', PINK); }
					}
					else
					{
						evx[intM_a] -= 3;
						evy[intM_a] = sinK(intT * 4, 64);
					}
				}
				else
				{
					// zigzag, bouncing off the edges of the way
					evx[intM_a] = -20;
					if (evy[intM_a] === 0) { evy[intM_a] = 20; }
					if ((intY < 16) || solid(intX, intY - 10)) { evy[intM_a] = 20; }
					if ((intY > 160) || solid(intX, intY + 10)) { evy[intM_a] = -20; }
					if (intT === efire[intM_a])
					{
						shoot(intX, intY, aim(intX, intY, px, py), 22, 'bsmall', PINK);
						efire[intM_a] = intT + 70;
					}
				}
				break;
			case K_CARRIER:
				evx[intM_a] = -10;
				evy[intM_a] = sinK(intT * 2, 32);
				if (intT === efire[intM_a])
				{
					shoot(intX - 8, intY, aim(intX, intY, px, py), 18, 'bmed', BLUE);
					efire[intM_a] = intT + 80;
				}
				break;
			case K_MANTIS:
				// on the ground (or upside down on the ceiling): it aims at you
				eanim[intM_a] = (efire[intM_a] - intT < 12) ? 1 : 0;
				if (intT === efire[intM_a])
				{
					intN = (ea[intM_a] === 1) ? (intY + 4) : (intY - 4);
					if ((intX < 250) && (intX > 0)) { fan(intX - 4, intN, 1 + loopN, 8, 20, 'needle', PINK); }
					efire[intM_a] = intT + 90 - loopN * 10;
				}
				break;
			case K_BEETLE:
				// walks the floor towards you, its horn spitting fire
				evx[intM_a] = -6;
				if (solid(intX - 8, intY)) { evx[intM_a] = 6; }
				if (!solid(intX, intY + 9))
				{
					evy[intM_a] = 24;
				}
				else
				{
					evy[intM_a] = 0;
					if (solid(intX, intY + 7)) { ey[intM_a] -= 16; }
				}
				if (intT === efire[intM_a])
				{
					fan(intX - 6, intY - 4, 3, 12, 20, 'bsmall', PINK);
					efire[intM_a] = intT + 100;
				}
				break;
			case K_DRAGON:
				// a swoop: in fast, an S, a ring of bullets halfway
				evx[intM_a] = -40;
				if (ea[intM_a] === 0) { ey[intM_a] = ey0[intM_a] + sinK(intT * 2, 96); }
				else { ey[intM_a] = ey0[intM_a] - sinK(intT * 2, 96); }
				if (intT === 40) { ring(intX, intY, 6 + loopN * 2, intT, 18, 'bmed', BLUE); }
				break;
			case K_HORNET:
				// it holds the right of the screen, up and down, firing, then goes
				if (intT < 60)
				{
					evx[intM_a] = -24;
				}
				else if (intT < 600)
				{
					evx[intM_a] = 0;
					ey[intM_a] = ey0[intM_a] + sinK(intT, 112);
					if ((intT & 63) === 0) { fan(intX - 10, intY, 5 + loopN, 10, 20, 'bmed', PINK); }
					if ((intT & 63) === 32)
					{
						for (intN = 0; intN <= 2; intN++)
						{
							shoot(intX - 10, intY, aim(intX, intY, px, py), 24 + intN * 4, 'needle', BLUE);
						}
					}
				}
				else
				{
					evx[intM_a] -= 2;
				}
				break;
			case K_SPIDER:
				// it hangs from the roof till you're near, drops on its thread to your height, spits, climbs
				if (eb[intM_a] === 0)
				{
					if (intX < 210) { eb[intM_a] = 1; }
				}
				else if (eb[intM_a] === 1)
				{
					evy[intM_a] = 28;
					if ((intY >= py - 4) || (intY > 150)) { evy[intM_a] = 0; eb[intM_a] = 2; efire[intM_a] = intT + 16; }
				}
				else if (eb[intM_a] === 2)
				{
					if (intT === efire[intM_a]) { fan(intX - 6, intY, 3, 16, 14, 'bmed', BLUE); }
					if (intT > efire[intM_a] + 30) { eb[intM_a] = 3; }
				}
				else if (eb[intM_a] === 3)
				{
					evy[intM_a] = -16;
					if (ey[intM_a] <= ey0[intM_a]) { ey[intM_a] = ey0[intM_a]; evy[intM_a] = 0; eb[intM_a] = 4; }
				}
				break;
			case K_FLEA:
				if (eb[intM_a] === 0)
				{
					// on the ground: a hop now and then, at you
					eanim[intM_a] = 0; evx[intM_a] = 0; evy[intM_a] = 0;
					if ((intT >= efire[intM_a]) && (intX < 250))
					{
						eb[intM_a] = 1; evy[intM_a] = -44 - rnd(16);
						evx[intM_a] = (px < intX) ? -20 : 12;
						efire[intM_a] = intT + 40 + rnd(40);
					}
				}
				else
				{
					eanim[intM_a] = 1;
					evy[intM_a] += 3;
					if ((evy[intM_a] > 0) && solid(intX, intY + 8)) { eb[intM_a] = 0; evy[intM_a] = 0; evx[intM_a] = 0; }
					if (intY > 168) { eb[intM_a] = 0; evy[intM_a] = 0; }
				}
				break;
			case K_BORER:
				// in the floor (or the roof): it opens and sprays a ring
				intN = efire[intM_a] - intT;
				eanim[intM_a] = ((intN >= 0) && (intN < 16)) ? 1 : 0;
				if (intN === 0)
				{
					if ((intX > 0) && (intX < 250)) { ring(intX, intY, 6 + loopN * 2, intT * 2, 14, 'bsmall', PINK); }
					efire[intM_a] = intT + 110 - loopN * 10;
				}
				break;
			case K_MOTH:
				// it weaves across, dropping spores
				evx[intM_a] = -14;
				if (eb[intM_a] === 0) { ey[intM_a] = ey0[intM_a] + sinK(intT * 2, 80); }
				else { ey[intM_a] = ey0[intM_a] - sinK(intT * 2, 80); }
				if (((intT & 31) === 16) && (intX < 240)) { shoot(intX, intY + 8, 232, 12, 'bmed', PINK); }
				break;
			case K_CENTI:
				evx[intM_a] = -18;
				ey[intM_a] = ey0[intM_a] + sinK(intT * 3, 64);
				if (intT === efire[intM_a])
				{
					shoot(intX, intY, aim(intX, intY, px, py), 20, 'bsmall', PINK);
					efire[intM_a] = intT + 70;
				}
				break;
			case K_SEG:
				// it follows the one in front (lagging: the body ripples); with that one gone, it leads
				intN = eb[intM_a];
				if ((ek[intN] !== K_CENTI) && (ek[intN] !== K_SEG))
				{
					ek[intM_a] = K_CENTI; ey0[intM_a] = ey[intM_a]; efire[intM_a] = intT + 30;
				}
				else
				{
					ex[intM_a] += (ex[intN] + 160 - ex[intM_a]) >> 2;
					ey[intM_a] += (ey[intN] - ey[intM_a]) >> 2;
				}
				break;
			case K_BEE:
				// armoured guard bees: a sine line that shoots (0), or a swoop at you and away (1)
				if (ea[intM_a] === 0)
				{
					evx[intM_a] = -26;
					ey[intM_a] = ey0[intM_a] + sinK(intT * 3, 40);
					if (intT === efire[intM_a]) { shoot(intX, intY, aim(intX, intY, px, py), 22, 'bsmall', BLUE); }
				}
				else
				{
					if (intT < 40)
					{
						intA = aim(intX, intY, px, py);
						evx[intM_a] = sinK(intA, 56); evy[intM_a] = sinK(intA + 64, 56);
					}
					else
					{
						evx[intM_a] -= 2;
						if (evy[intM_a] > 0) { evy[intM_a]--; } else { evy[intM_a]++; }
					}
				}
				break;
			case K_CANNON:
				// a gun on the hull (or under it): it turns to you, and fires
				intN = intY - py;
				if (ea[intM_a] === 1) { intN = -intN; }
				if ((intN > 40) && (Math.abs(intX - px) < 40)) { eanim[intM_a] = 2; }
				else if (intN > 16) { eanim[intM_a] = 1; }
				else { eanim[intM_a] = 0; }
				if (intT === efire[intM_a])
				{
					if ((intX > 0) && (intX < 250)) { fan(intX, intY, 1 + loopN, 10, 24, 'needle', BLUE); }
					efire[intM_a] = intT + 70 - loopN * 8;
				}
				break;
			case K_HATCH:
				// it opens and lets bees out
				intN = efire[intM_a] - intT;
				eanim[intM_a] = ((intN >= 0) && (intN < 20)) ? 1 : 0;
				if (intN === 0)
				{
					if ((intX > 20) && (intX < 240))
					{
						for (intA = 0; intA <= 1; intA++)
						{
							intK = spawn(K_BEE, intX, intY - 8);
							if (intK >= 0) { ea[intK] = 1; ew[intK] = intA * 14; }
						}
					}
					efire[intM_a] = intT + 150;
				}
				break;
			case K_SCARAB:
				// rolls along the hull at you, lobbing fire
				evx[intM_a] = -10;
				if (solid(intX - 9, intY)) { evx[intM_a] = 4; }
				if (!solid(intX, intY + 9))
				{
					evy[intM_a] = 24;
				}
				else
				{
					evy[intM_a] = 0;
					if (solid(intX, intY + 7)) { ey[intM_a] -= 16; }
				}
				if (intT === efire[intM_a])
				{
					fan(intX - 6, intY - 4, 3, 16, 18, 'bmed', PINK);
					efire[intM_a] = intT + 80;
				}
				break;
			case K_DRONE:
				// an eye drone: it drifts in, circles and fires bursts
				if (intT < 50)
				{
					evx[intM_a] = -28;
				}
				else
				{
					evx[intM_a] = sinK(intT * 2, 24) - 4; evy[intM_a] = sinK(intT * 2 + 64, 24);
					if ((intT & 63) === 0)
					{
						for (intN = 0; intN <= 2; intN++)
						{
							shoot(intX, intY, aim(intX, intY, px, py), 20 + intN * 6, 'needle', PINK);
						}
					}
				}
				break;
			case K_NEST:
				// it spits a gnat now and then
				if (intT === efire[intM_a])
				{
					if ((intX > 20) && (intX < 250))
					{
						intN = spawn(K_GNAT, intX, intY);
						if (intN >= 0) { ea[intN] = 1; ey0[intN] = ey[intN]; }
					}
					efire[intM_a] = intT + 110;
				}
				break;
			default:
				break;
		}
	}

	function kill(intM_a, intKd_a, intX_a, intY_a)
	{
		if ((intKd_a === K_QHEAD) || (intKd_a === K_BEYE) || (intKd_a === K_CORE))
		{
			boom(intX_a, intY_a, 1);
			bossDown();
		}
		else
		{
			chain++; chainT = 60;
			if (chain > maxChain) { maxChain = chain; }
			if (chain > 1) { showChain(); }
			addScore(ksc[intKd_a] + chain * 10);
			remove(intM_a);
			// what it drops
			if (intKd_a === K_CARRIER)
			{
				drop(edrop[intM_a], intX_a, intY_a);
				drop(I_GEM, intX_a, intY_a);
			}
			else if (intKd_a === K_HORNET)
			{
				drop(I_P, intX_a, intY_a); drop(I_GEM, intX_a, intY_a); drop(I_GEM, intX_a, intY_a); drop(I_GEM, intX_a, intY_a);
			}
			else if ((intKd_a === K_NEST) || (intKd_a === K_BEETLE) || (intKd_a === K_DRAGON))
			{
				drop(I_GEM, intX_a, intY_a);
			}
			else if ((intKd_a === K_QSTING) || (intKd_a === K_BSAC) || (intKd_a === K_GUN))
			{
				drop(I_P, intX_a, intY_a); drop(I_GEM, intX_a, intY_a); drop(I_GEM, intX_a, intY_a);
			}
			else if (rnd(4) === 0)
			{
				drop(I_GEM, intX_a, intY_a);
			}
			// the second time round they shoot back as they go
			if ((loopN > 1) && alive) { shoot(intX_a, intY_a, aim(intX_a, intY_a, px, py), 24, 'bsmall', PINK); }
			boom(intX_a, intY_a, kbig[intKd_a]);
			if (kbig[intKd_a]) { m_objSound.play(1, 31, 0, 15, 30, true); }
			else { m_objSound.play(1, 20, 1, 13, 12, true); }
		}
	}

	// boom x, y, big: an explosion in a free record (none free: none)
	// boom x, y, big: an explosion in a free record (none free: none) - its sprite plays through once
	function boom(intX_a, intY_a, intBig_a)
	{
		var intM, blnDone = false;
		for (intM = 0; (intM < NE) && !blnDone; intM++)
		{
			if (ek[intM] === 0)
			{
				ek[intM] = intBig_a ? K_BIGBOOM : K_BOOM;
				ex[intM] = intX_a * 16; ey[intM] = intY_a * 16; et[intM] = 0;
				m_arrBoxOn[intM] = false; m_arrBoxW[intM] = false;
				if (intBig_a) { spr(SP_EN + intM * 2, intX_a + 16, intY_a + 16, 'boom', 0, PL_FIRE, 2); }
				else { spr(SP_EN + intM * 2, intX_a + 24, intY_a + 24, 'boom', 0, PL_FIRE); }
				m_objSlots.animate(SP_EN + intM * 2, 1, true);
				blnDone = true;
			}
		}
	}

	function shoot(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPl_a)
	{
		if ((intX_a >= 0) && (intX_a <= 255) && alive)
		{
			bulFire(intX_a, intY_a, intA_a, intSpd_a + spdAdd, intPat_a, intPl_a);
		}
	}

	// fan x, y, n, step, speed: n bullets aimed at you, step apart
	function fan(intX_a, intY_a, intN_a, intStp_a, intSpd_a, intPat_a, intPl_a)
	{
		var intA = aim(intX_a, intY_a, px, py) - idiv((intN_a - 1) * intStp_a, 2), intJ;
		for (intJ = 0; intJ < intN_a; intJ++)
		{
			shoot(intX_a, intY_a, intA + intJ * intStp_a, intSpd_a, intPat_a, intPl_a);
		}
	}

	function ring(intX_a, intY_a, intN_a, intA_a, intSpd_a, intPat_a, intPl_a)
	{
		var intJ;
		for (intJ = 0; intJ < intN_a; intJ++)
		{
			shoot(intX_a, intY_a, intA_a + idiv(intJ * 256, intN_a), intSpd_a, intPat_a, intPl_a);
		}
	}

	// ====================================================================================================
	// PICKUPS

	// drop kind, x, y: a pickup comes out of x, y
	function drop(intKind_a, intX_a, intY_a)
	{
		var intN, blnDone = false;
		if (intKind_a !== 0)
		{
			for (intN = 0; (intN < NI) && !blnDone; intN++)
			{
				if (ik[intN] === 0)
				{
					ik[intN] = intKind_a; ix[intN] = intX_a * 16; iy[intN] = intY_a * 16; it[intN] = 0;
					ivx[intN] = rnd(33) - 16; ivy[intN] = rnd(33) - 16;
					blnDone = true;
				}
			}
		}
	}

	// they drift back with the terrain; gems fly to you when you're close (or after a while); picked up
	// when the ship's middle is inside the pickup's box (a JSprites collision)
	// they drift back with the terrain; gems fly to you when you're close (or after a while); picked up
	// when the ship's middle is in the pickup's hit box
	function items()
	{
		var intN, intX, intY, intDX, intDY, strName, intRow, intSN, blnPicked;
		for (intN = 0; intN < NI; intN++)
		{
			intSN = SP_ITEM + intN;
			if (ik[intN])
			{
				it[intN]++;
				intX = ix[intN] >> 4; intY = iy[intN] >> 4;
				intDX = px - intX; intDY = py - intY;
				if ((ik[intN] === I_GEM) && alive && ((it[intN] > 60) || ((Math.abs(intDX) < 48) && (Math.abs(intDY) < 48))))
				{
					ivx[intN] = intDX * 8; ivy[intN] = intDY * 8;
					if (ivx[intN] > 80) { ivx[intN] = 80; }
					if (ivx[intN] < -80) { ivx[intN] = -80; }
					if (ivy[intN] > 80) { ivy[intN] = 80; }
					if (ivy[intN] < -80) { ivy[intN] = -80; }
				}
				else
				{
					ivx[intN] = ivx[intN] - (ivx[intN] >> 3) - 1;
					if (ivx[intN] < -10) { ivx[intN] = -10; }
					ivy[intN] = ivy[intN] - (ivy[intN] >> 3);
					iy[intN] += sinK(it[intN] * 4, 8);
				}
				ix[intN] += ivx[intN]; iy[intN] += ivy[intN];
				if (iy[intN] < 160) { iy[intN] = 160; }
				if (iy[intN] > 2720) { iy[intN] = 2720; }
				intX = ix[intN] >> 4; intY = iy[intN] >> 4;
				if (ik[intN] === I_GEM) { strName = 'gem'; intRow = PL_BLUEC; }
				else if (ik[intN] === I_RED) { strName = 'crystal'; intRow = PL_RED; }
				else if (ik[intN] === I_BLUE) { strName = 'crystal'; intRow = PL_BLUEC; }
				else if (ik[intN] === I_YELLOW) { strName = 'crystal'; intRow = PL_YEL; }
				else if (ik[intN] === I_POD) { strName = 'itempod'; intRow = PL_YEL; }
				else if (ik[intN] === I_SPEED) { strName = 'items'; intRow = PL_BLUEC; }
				else if (ik[intN] === I_MISSILE) { strName = 'itemm'; intRow = PL_RED; }
				else if (ik[intN] === I_FLY) { strName = 'itemf'; intRow = PL_YEL; }
				else if (ik[intN] === I_BOMB) { strName = 'itemb'; intRow = PL_FIRE; }
				else if (ik[intN] === I_BIGP) { strName = 'itembigp'; intRow = PL_SHOT; }
				else { strName = 'itemp'; intRow = PL_SHOT; }
				if ((ik[intN] !== I_GEM) && (it[intN] & 8)) { intRow = PL_FLASH; }
				// it turns (its sequence) or flashes; a big P is twice the size
				spr(intSN, intX + ((ik[intN] === I_BIGP) ? 16 : 24), intY + ((ik[intN] === I_BIGP) ? 16 : 24), strName, 0, intRow);
				m_objSlots.animate(intSN, ((ik[intN] === I_GEM) && ((intN & 1) !== 0)) ? 4 : 1);
				// does the ship's middle (a point) touch its hit box?
				blnPicked = alive && m_objSlots.collideRect(intSN, px + 32, py + 32, 0, 0);
				if (intX < -8)
				{
					ik[intN] = 0; m_objSlots.hide(intSN);
				}
				else if (blnPicked)
				{
					pick(ik[intN]);
					ik[intN] = 0; m_objSlots.hide(intSN);
				}
			}
		}
	}

	function pick(intKind_a)
	{
		var blnMore = true;
		if (intKind_a === I_GEM)
		{
			addScore(100 + chain * 10);
			m_objSound.play(2, 20, -1, 10, 4, false);
			blnMore = false;
		}
		else if (intKind_a === I_P)
		{
			if (power < 5) { power++; } else { addScore(1000); }
			showPower();
		}
		else if (intKind_a === I_BIGP)
		{
			power += 2;
			if (power > 5) { power = 5; }
			if (bombs < 5) { bombs++; }
			showPower(); showBombs();
		}
		else if ((intKind_a === I_RED) || (intKind_a === I_BLUE) || (intKind_a === I_YELLOW) || (intKind_a === I_POD))
		{
			if (intKind_a !== I_POD) { weapon = intKind_a - 1; }
			if (podSt === POD_NONE) { podSt = POD_FRONT; podX = px + 20; podY = py; }
		}
		else if (intKind_a === I_SPEED)
		{
			if (speed < 4) { speed++; } else { addScore(1000); }
		}
		else if (intKind_a === I_MISSILE)
		{
			if (missiles < 2) { missiles++; } else { addScore(1000); }
		}
		else if (intKind_a === I_FLY)
		{
			if (flies < 2)
			{
				flyX[flies] = px; flyY[flies] = py;
				flies++;
			}
			else
			{
				addScore(1000);
			}
		}
		else if (intKind_a === I_BOMB)
		{
			if (bombs < 5) { bombs++; } else { addScore(1000); }
			showBombs();
		}
		if (blnMore)
		{
			addScore(200);
			m_objSound.play(2, 70, -3, 14, 12, false);
		}
	}

	// ====================================================================================================
	// THE BOSS: the scroll stops; Layer 2 fades from the backdrop to the boss's picture and its scroll
	// sways it. Its parts are enemy records put where the picture has them each frame: a weak point,
	// guns or sacs that can be shot off, armour over the body (shots stop on it, touching it kills).

	function startBoss()
	{
		var intM, strName;
		for (intM = 0; intM < NE; intM++)
		{
			if ((ek[intM] > 0) && (ek[intM] < K_PART))
			{
				boom(ex[intM] >> 4, ey[intM] >> 4, 0);
				remove(intM);
			}
		}
		bulClear();
		for (intM = 0; intM <= 4; intM++)
		{
			bpk[intM] = 0; bpr[intM] = -1;
		}
		if (stage === 1)
		{
			bossPart(0, K_QHEAD, 120, 80); bossPart(1, K_QSTING, 168, 154); bossPart(4, K_QBODY, 195, 114);
			bossPic = 'boss1'; strName = 'THE QUEEN WASP';
		}
		else if (stage === 2)
		{
			bossPart(0, K_BEYE, 96, 84); bossPart(1, K_BSAC, 150, 60); bossPart(2, K_BSAC, 182, 56);
			bossPart(3, K_BSAC, 212, 64); bossPart(4, K_BBODY, 172, 104);
			bossPic = 'boss2'; strName = 'THE BROOD MOTHER';
		}
		else
		{
			bossPart(0, K_CORE, 176, 104); bossPart(1, K_GUN, 140, 96); bossPart(2, K_GUN, 134, 128);
			bossPart(3, K_GUN, 150, 152); bossPart(4, K_HULL, 200, 106);
			bossPic = 'boss3'; strName = 'THE BRIDGE';
		}
		bossOn = 1; bossT = 0; bossPh = 0; bossDie = 0; bossRec = -1;
		bossMax = 200 + loopN * 100 + stage * 40;
		message('WARNING', 120);
		message2(strName);
		m_objSound.play(2, 200, 0, 15, 60, false);
	}

	function bossPart(intN_a, intKd_a, intX_a, intY_a)
	{
		bpk[intN_a] = intKd_a; bpx[intN_a] = intX_a; bpy[intN_a] = intY_a;
	}

	function bossUpdate()
	{
		var intVX, intVY, intT, intM, intN;
		bossT++;
		intT = bossT;
		// the change of picture
		if (intT <= 16)
		{
			fade(8 - (intT >> 1));
		}
		else
		{
			if (intT === 17)
			{
				for (intM = 0; intM < NE; intM++)
				{
					if (ek[intM]) { remove(intM); }
				}
				picture(bossPic);
				for (intN = 0; intN <= 4; intN++)
				{
					if (bpk[intN]) { bpr[intN] = spawn(bpk[intN], bpx[intN], bpy[intN]); }
				}
				bossRec = bpr[0];
				ehp[bossRec] = bossMax;
			}
			if (intT <= 33) { fade((intT - 17) >> 1); }
			// the sway (faster when it's hurt), the parts put where the picture has them (the picture
			// wraps round: across it only moves right of where it's drawn, 0-24; the Bridge only bobs)
			if (bossDie > 0)
			{
				intVX = rnd(7); intVY = rnd(5) - 2;
			}
			else if (bossPh === 2)
			{
				intVX = 12 + (sinK(intT * 2, 24) >> 4); intVY = sinK(intT * 3, 36) >> 4;
			}
			else
			{
				intVX = 12 + (sinK(intT, 24) >> 4); intVY = sinK(intT + (intT >> 1), 32) >> 4;
			}
			if (stage === 3) { intVX = 0; intVY = intVY >> 1; }
			l2x = intVX & 255;
			m_intL2Y = (intVY < 0) ? (192 + intVY) : intVY;
			if (bossDie > 0)
			{
				bossDying();
			}
			else
			{
				for (intN = 0; intN <= 4; intN++)
				{
					intM = bpr[intN];
					if (intM >= 0)
					{
						if (ek[intM] === bpk[intN])
						{
							ex[intM] = (bpx[intN] - intVX) * 16; ey[intM] = (bpy[intN] - intVY) * 16;
							eanim[intM] = ((intT + intN * 5) >> 3) & 1;
						}
						else
						{
							bpr[intN] = -1;
						}
					}
				}
				if (intT >= 60)
				{
					// the phases: by the life left
					if (ehp[bossRec] * 3 < bossMax) { bossPh = 2; }
					else if (ehp[bossRec] * 3 < bossMax * 2) { bossPh = 1; }
					if (stage === 1) { queenFire(intT, intVX, intVY); }
					else if (stage === 2) { broodFire(intT, intVX, intVY); }
					else { bridgeFire(intT, intVX, intVY); }
				}
			}
		}
	}

	// the Queen Wasp: the stinger's fans and spiral, the head's orbs and rings, her brood
	function queenFire(intT_a, intVX_a, intVY_a)
	{
		var intHX = 120 - intVX_a, intHY = 80 - intVY_a, intSX = 168 - intVX_a, intSY = 154 - intVY_a, intM, intK;
		if (bpr[1] >= 0)
		{
			if ((intT_a & 63) === 0) { fan(intSX - 6, intSY, 5 + bossPh, 10, 22, 'needle', PINK); }
			if ((bossPh >= 1) && ((intT_a & 127) < 48) && ((intT_a & 3) === 0)) { shoot(intSX - 6, intSY, intT_a * 7, 18, 'bsmall', PINK); }
		}
		if ((intT_a & 127) === 64) { fan(intHX - 8, intHY + 8, 3, 14, 20, 'bmed', BLUE); }
		if (bossPh === 2)
		{
			if ((intT_a & 63) === 32) { ring(intHX - 6, intHY, 12 + loopN * 2, intT_a, 18, 'bbig', PINK); }
			if (((intT_a & 127) < 24) && ((intT_a & 3) === 2)) { shoot(intHX - 8, intHY + 6, aim(intHX, intHY, px, py), 28, 'needle', BLUE); }
		}
		if ((bossPh >= 1) && ((intT_a & 255) === 128))
		{
			for (intM = 0; intM <= 3; intM++)
			{
				intK = spawn(K_GNAT, intHX + 30, intHY + 50);
				if (intK >= 0) { ea[intK] = 1; ew[intK] = intM * 12; }
			}
		}
	}

	// the Brood Mother: acid from her jaws, her sacs hatching fleas, her machine eye's sweeps
	function broodFire(intT_a, intVX_a, intVY_a)
	{
		var intMX = 76 - intVX_a, intMY = 100 - intVY_a, intHX = 96 - intVX_a, intHY = 84 - intVY_a, intN, intK;
		if ((intT_a & 63) === 0) { fan(intMX, intMY, 3 + bossPh, 12, 16, 'bbig', PINK); }
		for (intN = 1; intN <= 3; intN++)
		{
			if ((bpr[intN] >= 0) && (((intT_a + intN * 80) & 255) === 0))
			{
				intK = spawn(K_FLEA, bpx[intN] - intVX_a, bpy[intN] - intVY_a - 8);
				if (intK >= 0) { eb[intK] = 1; evy[intK] = -24; evx[intK] = -16; }
			}
		}
		if ((bossPh >= 1) && ((intT_a & 127) < 48) && ((intT_a & 3) === 0)) { shoot(intHX - 6, intHY, 192 + sinK(intT_a * 4, 40), 22, 'needle', BLUE); }
		if ((bossPh === 2) && ((intT_a & 63) === 32)) { ring(intHX, intHY, 10 + loopN * 2, intT_a, 16, 'bmed', PINK); }
	}

	// the Bridge: its guns' streams, the core's spirals and rings, its bees
	function bridgeFire(intT_a, intVX_a, intVY_a)
	{
		var intN, intX, intY, intK;
		for (intN = 1; intN <= 3; intN++)
		{
			if (bpr[intN] >= 0)
			{
				intX = bpx[intN] - intVX_a - 8; intY = bpy[intN] - intVY_a;
				if ((((intT_a + intN * 20) & 63) < 12) && ((intT_a & 3) === 0)) { shoot(intX, intY, aim(intX, intY, px, py), 24, 'needle', BLUE); }
			}
		}
		intX = 176 - intVX_a; intY = 104 - intVY_a;
		if ((bossPh >= 1) && ((intT_a & 1) === 0) && ((intT_a & 127) < 64)) { shoot(intX - 10, intY, intT_a * 5, 16, 'bsmall', PINK); }
		if ((bossPh === 2) && ((intT_a & 63) === 0)) { ring(intX - 10, intY, 14 + loopN * 2, intT_a, 18, 'bbig', PINK); }
		if ((intT_a & 255) === 200)
		{
			for (intN = 0; intN <= 2; intN++)
			{
				intK = spawn(K_BEE, 250, 40 + intN * 50);
				if (intK >= 0) { ea[intK] = 1; ew[intK] = intN * 10; }
			}
		}
	}

	// the boss's weak point shot through: it comes apart
	function bossDown()
	{
		var intM;
		bossDie = 160;
		for (intM = 0; intM < NE; intM++)
		{
			if ((ek[intM] > 0) && (ek[intM] < K_PART)) { remove(intM); }
		}
		bulClear();
		addScore(30000);
		clearMessage();
		message('DESTROYED', 120);
		m_objSound.play(1, 31, 0, 15, 60, true);
	}

	function bossDying()
	{
		bossDie--;
		if (((bossDie & 7) === 0) && (bossDie > 40))
		{
			boom(110 + rnd(120), 50 + rnd(110), rnd(2));
			m_objSound.play(1, 20 + rnd(20), 1, 14, 16, true);
		}
		if ((bossDie <= 32) && (bossDie > 16)) { fade((bossDie - 16) >> 1); }
		if (bossDie === 16)
		{
			picture(backPic);
		}
		if (bossDie < 16) { fade(8 - (bossDie >> 1)); }
		if (bossDie === 0)
		{
			bossOn = 0; cleared = 1;
			m_intL2Y = 0;
		}
	}

	// ====================================================================================================
	// THE LOOPS

	// for the tests: where the game is
	this.state = function()
	{
		var intK, intE = 0;
		for (intK = 0; intK < NE; intK++) { if ((ek[intK] > 0) && (ek[intK] < K_PART)) { intE++; } }
		return { stage:stage, lives:lives, alive:alive, score:score, frames:frames, bullets:m_intBulLive, enemies:intE, boss:bossOn, bossT:bossT, bossHP:(bossOn && (bossRec >= 0)) ? ehp[bossRec] : 0,
			cleared:cleared, over:over, cam:cam, stopAt:stopAt, ck:ckCol, px:px, py:py, power:power, weapon:weapon, pod:podSt, bombs:bombs, chain:chain, picture:m_strPicture, fade:m_intFade,
			ms:Math.round(m_fltIterMs * 100) / 100, msmax:m_fltIterMax };
	};

	// for the tests: the pickups out (kind, paper x, y)
	this.items = function()
	{
		var arrR = [], intN;
		for (intN = 0; intN < NI; intN++)
		{
			if (ik[intN]) { arrR.push([ik[intN], ix[intN] >> 4, iy[intN] >> 4, it[intN]]); }
		}
		return arrR;
	};

	// for the tests: a ship that can't be hit, the first stage, the camera on, power, the boss's life
	this.cheat = function(strWhat_a, intN_a)
	{
		var intK;
		if (strWhat_a === 'god') { GOD = (intN_a !== 0); }
		if (strWhat_a === 'stage') { FIRST_STAGE = intN_a; }
		if (strWhat_a === 'cam')
		{
			// on to just before world x n (the spawns on the way left out)
			for (intK = 0; intK < NE; intK++) { if (ek[intK]) { remove(intK); } }
			cam = intN_a; m_intNext = (cam >> 3) + 4; m_intNextEv = m_intNext; m_intQuiet = (cam >> 3) + 32; mapFill(); m_intQuiet = 0;
			while ((m_arrQueue.length > 0) && (m_arrQueue[0][0] <= 240)) { m_arrQueue.shift(); }
			l2x = (cam >> 1) & 255;
		}
		if (strWhat_a === 'power') { power = intN_a; showPower(); }
		if (strWhat_a === 'weapon') { weapon = intN_a; if (podSt === POD_NONE) { podSt = POD_FRONT; } }
		if (strWhat_a === 'item') { drop(intN_a, px + 30, py); }
		if (strWhat_a === 'bosshp') { if (bossRec >= 0) { ehp[bossRec] = intN_a; } }
	};

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		Wide();
		var fltT0 = Date.now();
		if (m_blnLoaded)
		{
			m_objSteps.update();
		}
		m_objSound.update();
		m_fltIterMs = m_fltIterMs * 0.95 + (Date.now() - fltT0) * 0.05;
		if (Date.now() - fltT0 > m_fltIterMax) { m_fltIterMax = Date.now() - fltT0; }
	};
	var m_fltIterMs = 0, m_fltIterMax = 0;

	// the screen's shape: what JCanvas shows (wider in full screen), the extra either side of the
	// Next's 256, the sprites' clip window to match (as far as the world goes: WIDEL, WIDER)
	function Wide()
	{
		var objV = m_objCanvas.getView();
		var intL = 0, intR = 0;
		// (only a view around the game's own: before the canvas is going, it's not yet)
		if ((objV.x <= VIEW.x) && (objV.y <= VIEW.y) && (objV.x + objV.w >= VIEW.x + VIEW.w) && (objV.y + objV.h >= VIEW.y + VIEW.h))
		{
			intL = Math.min(VIEW.x - objV.x, WIDEL); intR = Math.min((objV.x + objV.w) - (VIEW.x + VIEW.w), WIDER);
			m_objView = objV;
		}
		if ((intL !== m_intWL) || (intR !== m_intWR))
		{
			m_intWL = intL; m_intWR = intR;
			m_objSlots.setClip(32 - intL, 32, 256 + intL + intR, 176);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var objPic, intX, intY, intX0, intW;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			// the play area across: the Next's 256 and, on a wide screen, the extra either side
			intX0 = 32 - m_intWL; intW = 256 + m_intWL + m_intWR;
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			// the fallback colour (NextReg #4A: dark blue) where every layer is see-through
			objContext_a.fillStyle = '#00006d';
			objContext_a.fillRect(32, 32, 256, 192);
			// Layer 2: the picture, scrolled (it wraps round), cut above the panel, faded (wide: a
			// backdrop goes on round either side; the title and a boss are one picture, kept to the 256)
			objContext_a.save();
			objContext_a.beginPath();
			if ((m_strPicture === 'title') || (m_strPicture.substr(0, 4) === 'boss'))
			{
				objContext_a.rect(32, 32, 256, 176);
			}
			else
			{
				objContext_a.rect(intX0, 32, intW, 176);
			}
			objContext_a.clip();
			objPic = m_objSprites.getImageByName('mon_' + m_strPicture);
			for (intX = -256; intX <= 512; intX += 256)
			{
				for (intY = 0; intY <= 192; intY += 192)
				{
					objContext_a.drawImage(objPic, 32 - m_intL2X + intX, 32 - m_intL2Y + intY);
				}
			}
			if (m_intFade < 8)
			{
				objContext_a.fillStyle = 'rgba(0,0,0,' + (1 - m_intFade / 8) + ')';
				objContext_a.fillRect(intX0, 32, intW, 176);
			}
			else if (m_intFade > 8)
			{
				objContext_a.fillStyle = 'rgba(255,255,255,' + ((m_intFade - 8) / 8) + ')';
				objContext_a.fillRect(intX0, 32, intW, 176);
			}
			objContext_a.restore();
			// the terrain (not in the rows a message holds)
			if (m_blnTerrain && (m_objTerrain !== null))
			{
				objContext_a.save();
				objContext_a.beginPath();
				if (m_blnMsgRows)
				{
					objContext_a.rect(intX0, 32, intW, 80);
					objContext_a.rect(intX0, 120, intW, 8);
					objContext_a.rect(intX0, 136, intW, 72);
				}
				else
				{
					objContext_a.rect(intX0, 32, intW, 176);
				}
				objContext_a.clip();
				m_objTerrain.paint(objContext_a, 32 - cam, 32);
				objContext_a.restore();
			}
			// the text and the panel (the tilemap's clip window: the paper)
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(32, 32, 256, 192);
			objContext_a.clip();
			m_objText.paint(objContext_a, 0, 0);
			objContext_a.restore();
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// the kinds: life, score, box, big, sprite, palette, ground, deadly to touch, animation (1 two
	// frames, 2 two big frames, 3 move sets eanim)
	function kind(intKd_a, intHp_a, intSc_a, intW_a, intH_a, intBig_a, strPat_a, intPl_a, intGnd_a, intAir_a, intAnim_a)
	{
		kanim[intKd_a] = intAnim_a;
		khp[intKd_a] = intHp_a; ksc[intKd_a] = intSc_a; kw[intKd_a] = intW_a; kh[intKd_a] = intH_a; kbig[intKd_a] = intBig_a;
		kpat[intKd_a] = strPat_a; kpal[intKd_a] = intPl_a; kgnd[intKd_a] = intGnd_a; kair[intKd_a] = intAir_a;
	}

	// a library sprite: one of the sheet's sprites (gfxtool's name), what it does on its own (its
	// sequence and delay) and the part of it that counts in a collision (hbw x hbh about its middle,
	// moved hbx across); w, h: its size on the screen when that isn't the sheet's
	function sprite(strName_a, strGfx_a, arrSequence_a, intDelay_a, fltHBW_a, fltHBH_a, intHBX_a, intW_a, intImageX_a, intImageY_a, intH_a)
	{
		var objS = G.SPR[strGfx_a];
		m_objSet[strName_a] = objS.set;
		return { name:strName_a, classes:'mon', imagename:'mon_' + objS.set + '_0', x:0, y:0, w:(intW_a === undefined) ? objS.w : intW_a, h:(intH_a === undefined) ? objS.h : intH_a,
			imagex:(intImageX_a === undefined) ? objS.x : intImageX_a, imagey:(intImageY_a === undefined) ? objS.y : intImageY_a, imagew:objS.w, imageh:objS.h,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:(intHBX_a === undefined) ? 0 : intHBX_a, hby:0, hbsize:0, hbw:fltHBW_a, hbh:fltHBH_a };
	}

	var m_arrTitleControls, m_arrPlayControls;
	var GOD = false, FIRST_STAGE = 1;			// (for the tests, as the Next's: a ship that can't be hit, the first stage)

	this.run = function()
	{
		var arrImages = [], arrLib, intR, intN, intK;
		var arrPics = ['title', 'back1', 'boss1', 'back2', 'boss2', 'back3', 'boss3'];
		for (intR = 0; intR < 16; intR++)
		{
			arrImages.push({ name:'mon_c_' + intR, classes:'mon', source:'images/monarch/spr_c_' + intR + '.png' });
			for (intN = 1; intN <= G.LEVELS; intN++)
			{
				arrImages.push({ name:'mon_l' + intN + '_' + intR, classes:'mon', source:'images/monarch/spr_l' + intN + '_' + intR + '.png' });
			}
		}
		for (intR = 0; intR < 4; intR++)
		{
			arrImages.push({ name:'mon_t' + intR, classes:'mon', source:'images/monarch/tiles_' + intR + '.png' });
		}
		for (intN = 1; intN <= G.LEVELS; intN++)
		{
			arrImages.push({ name:'mon_tl' + intN, classes:'mon', source:'images/monarch/tiles_l' + intN + '.png' });
		}
		for (intK = 0; intK < arrPics.length; intK++)
		{
			arrImages.push({ name:'mon_' + arrPics[intK], classes:'mon', source:'images/monarch/' + arrPics[intK] + '.png' });
		}
		m_objSprites.addImagesToLibrary(arrImages);
		// what each sprite does on its own and what of it counts in a collision
		arrLib = [
			sprite('player', 'PLAYER', [1, 2, 3, 2, -1], 4, 7, 5, -18),			// wings beating; only its head (px + 9) is hit
			sprite('flare', 'FLARE', [1, 2, -1], 4, 0, 0),				// the charge flickering
			sprite('pod', 'POD', [1, 2, 3, 4, -1], 4, 16, 16),			// turning; it touches and eats 8 each way
			sprite('fly', 'FLY', [1, 2, -1, 2, 1, -4], 8, 11, 11),			// two fireflies blinking out of step
			sprite('wave0', 'WAVE0', [1, 0], 1, 16, 12),
			sprite('wave1', 'WAVE1', [1, 0], 1, 30, 14),
			sprite('wave2', 'WAVE2', [1, 0], 1, 30, 30),
			sprite('missile', 'MISSILE', [1, 0], 1, 8, 8),
			sprite('laser16', 'LASER', [1, 0], 1, 0, 0),
			sprite('laser32', 'LASER', [1, 0], 1, 0, 0, 0, 32),		// (the Next's sprite scaled across)
			sprite('laser64', 'LASER', [1, 0], 1, 0, 0, 0, 64),
			sprite('gem', 'GEM', [1, 2, -1, 2, 1, -4], 8, 28, 24),			// turning
			sprite('crystal', 'CRYSTAL', [1, 0], 1, 28, 24),
			sprite('itempod', 'POD', [1, 2, 3, 4, -1], 4, 28, 24),
			sprite('items', 'ITEMS', [1, 0], 1, 28, 24),
			sprite('itemm', 'ITEMM', [1, 0], 1, 28, 24),
			sprite('itemf', 'ITEMF', [1, 0], 1, 28, 24),
			sprite('itemb', 'ITEMB', [1, 0], 1, 28, 24),
			sprite('itemp', 'ITEMP', [1, 0], 1, 28, 24),
			sprite('itembigp', 'ITEMP', [1, 0], 1, 28, 24, 0, 32, undefined, undefined, 32),			// twice the size, the same reach
			sprite('spark', 'SPARK', [1, 1, 1, 0], 1, 0, 0),			// three frames, then gone
			sprite('boom', 'BOOM', [1, 2, 3, 4, 0], 4, 0, 0),			// once through, then gone
			sprite('vulcan', 'VULCAN', [1, 0], 1, 0, 0),				// shots and bullets: a point
			sprite('fan', 'FAN', [1, 0], 1, 0, 0),
			sprite('spore', 'SPORE', [1, 0], 1, 0, 0),
			sprite('bsmall', 'BSMALL', [1, 0], 1, 0, 0),
			sprite('bmed', 'BMED', [1, 0], 1, 0, 0),
			sprite('bbig', 'BBIG', [1, 0], 1, 0, 0),
			sprite('needle', 'NEEDLE', [1, 0], 1, 0, 0) ];
		m_objSlots.setClip(32, 32, 256, 176);			// (the Next's sprite clip window: the play area)
		for (intK = 0; intK < NE; intK++) { m_arrHit[intK] = 0; m_arrBoxOn[intK] = false; ek[intK] = 0; m_arrHitW[intK] = 0; m_arrBoxW[intK] = false; }
		kind(K_GNAT, 1, 100, 6, 5, 0, 'GNAT', PL_GNAT, 0, 1, 1);
		kind(K_WASP, 3, 200, 6, 6, 0, 'WASP', PL_WASP, 0, 1, 1);
		kind(K_CARRIER, 14, 500, 14, 12, 1, 'CARRIER', PL_CARRIER, 0, 1, 2);
		kind(K_MANTIS, 4, 300, 6, 7, 0, 'MANTIS', PL_MANTIS, 1, 1, 3);
		kind(K_BEETLE, 7, 400, 7, 6, 0, 'BEETLE', PL_BEETLE, 1, 1, 1);
		kind(K_DRAGON, 6, 400, 14, 8, 1, 'DRAGON', PL_DRAGON, 0, 1, 2);
		kind(K_HORNET, 40, 2000, 14, 12, 1, 'HORNET', PL_WASP, 0, 1, 2);
		kind(K_NEST, 12, 600, 7, 6, 0, 'NEST', PL_CARRIER, 1, 1, 1);
		kind(K_SPIDER, 5, 300, 6, 6, 0, 'SPIDER', PL_GNAT, 1, 1, 1);
		kind(K_FLEA, 4, 300, 6, 6, 0, 'FLEA', PL_BEETLE, 1, 1, 3);
		kind(K_BORER, 8, 400, 6, 7, 0, 'BORER', PL_CARRIER, 1, 1, 3);
		kind(K_MOTH, 10, 500, 14, 10, 1, 'MOTH', PL_GNAT, 0, 1, 2);
		kind(K_CENTI, 12, 600, 6, 6, 0, 'CENTH', PL_BOSS, 0, 1, 1);
		kind(K_SEG, 5, 150, 6, 6, 0, 'CENTS', PL_BOSS, 0, 1, 1);
		kind(K_BEYE, 1, 40000, 8, 8, 0, 'BEYE', PL_BOSS, 0, 1, 3);
		kind(K_BSAC, 40, 3000, 7, 7, 0, 'BSAC', PL_CARRIER, 0, 1, 3);
		kind(K_BBODY, 0, 0, 50, 44, 0, '', 0, 0, 1, 0);
		kind(K_QBODY, 0, 0, 38, 40, 0, '', 0, 0, 1, 0);
		kind(K_BEE, 3, 200, 6, 6, 0, 'BEE', PL_WASP, 0, 1, 1);
		kind(K_CANNON, 6, 400, 6, 6, 0, 'CANNON', PL_BEETLE, 1, 1, 3);
		kind(K_HATCH, 10, 500, 7, 5, 0, 'HATCH', PL_BEETLE, 1, 1, 3);
		kind(K_SCARAB, 9, 500, 7, 6, 0, 'SCARAB', PL_DRAGON, 1, 1, 1);
		kind(K_DRONE, 6, 400, 7, 7, 0, 'DRONE', PL_MANTIS, 0, 1, 1);
		kind(K_CORE, 1, 50000, 8, 8, 0, 'CORE', PL_BOSS, 0, 1, 3);
		kind(K_GUN, 50, 4000, 7, 7, 0, 'GUN', PL_BEETLE, 0, 1, 3);
		kind(K_HULL, 0, 0, 48, 70, 0, '', 0, 0, 1, 0);
		kind(K_QHEAD, 1, 30000, 12, 12, 0, 'QEYE', PL_BOSS, 0, 1, 3);
		kind(K_QSTING, 60, 5000, 8, 6, 0, 'STING', PL_BOSS, 0, 1, 3);
		// each kind: its sprite, two frames in a loop (or the frame move picks), its box kw x kh each way
		// of its middle; a boss's part on Layer 2 is an empty cell of the sheet with just its box
		for (intK = 1; intK <= K_HULL; intK++)
		{
			if (kpat[intK] === '') { arrLib.push(sprite('k' + intK, 'SPARK', [1, 0], 1, kw[intK] * 2, kh[intK] * 2, 0, 16, 240, 0)); }
			else if (kanim[intK] === 3) { arrLib.push(sprite('k' + intK, kpat[intK], [1, 0], 1, kw[intK] * 2, kh[intK] * 2)); }
			else { arrLib.push(sprite('k' + intK, kpat[intK], [1, 2, -1, 2, 1, -4], 4, kw[intK] * 2, kh[intK] * 2)); }
		}
		m_objSprites.addSpritesToLibrary(arrLib);
		m_objText = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['mon_t0', 'mon_t1', 'mon_t2', 'mon_t3', 'mon_tl1'], first:0, firstcode:0, transparent:0 });
		m_arrTitleControls = [];			// (a tap anywhere plays)
		m_arrPlayControls = [
			{ type:'dpad', x:VIEW.x + 32, y:179, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:186, size:22, key:V_FIRE, label:'FIRE' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:144, size:18, key:V_POD, label:'POD' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:107, size:18, key:V_BOMB, label:'BOMB' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:62, size:13, key:K_H, label:'PAUSE' }
		];
		m_objPad = new JPad({ controls:m_arrTitleControls,
			gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:V_FIRE, fire2:V_POD, fire3:V_BOMB } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('mon'), function()
		{
			m_objText.invalidate();
			m_blnLoaded = true;
			m_objSteps.until(function()
			{
				m_objSteps.call(title);
				m_objSteps.call(game);
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:true, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:VIEW.w, yresolution:VIEW.h, xorigin:VIEW.x, yorigin:VIEW.y, screenmode:'ask', cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new monarchGame();
g_objGame.run();
