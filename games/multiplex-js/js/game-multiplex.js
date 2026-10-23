// MULTIPLEX - a bullet-hell shooter, ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The station's defence grid has turned: its drones fill the corridors, coming at you from both
// ends and dropping in through the gaps in the ceiling. Your ship has no gun. It has the Multiplex
// projector: it throws patterns of light - rings, flowers, spirals, waves, vortices, stars -
// hundreds of shots at once, every way at once.
//
// Keys: Q A O P (or the arrows) move - left / right turn the ship and fly it; Space (or 0, Z) fire;
// S (or X) the next pattern; W (or C) a nova; H pause; K on the title redefines the seven keys.
// Touch: the pad on the left; FIRE, PATTERN, NOVA and PAUSE on the right. Game pads: the stick,
// buttons A (fire), B (pattern), X (nova).
//
// How it's built on PotentJS:
// - the terrain is a JTileGrid the level's whole width (one picture: painted at the camera); the
//   text and the panel are a 40 x 32 JTileGrid over it (the Next's tilemap);
// - the sprites are JSpriteSlots numbered as the Next's (the ship 0, the pickups 2-7, a spark 8,
//   the guardian 9, the drones from 26, the 128 multiplexed bullets from 64), and Layer 2's 512
//   dots are their own JSpriteSlots under them. What a sprite does on its own is its library entry:
//   its loops (sequence, delay), its hit box. The game says what each is doing (animate a loop,
//   put a frame) and asks what touches: the bullets and the dots fly by one moveRangeBy each a
//   frame (their speeds the functions), then collideRange (bullets on the ship) and collideRect
//   (dots on the drones' and guardian's boxes, drones on the ship, the pickups, the guardian's ram);
// - 50 iterations a second, as the Next's frames; JSteps keeps the BASIC's waits and loops.
function multiplexGame()
{
	var m_objThis = this;
	var G = GFX_MULTIPLEX;
	var D = DATA_MULTIPLEX;

	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:96, y:32, w:264, h:192 };		// the part of the screen the game uses: the canvas shows only this
	var NE = 18, NI = 6, ND = 512, NB = 128;
	var K_DART = 1, K_ORB = 2, K_SPIN = 3, K_SWARM = 4, K_MINER = 5, K_TURRET = 6, K_HUNTER = 7;
	var K_CARRIER = 8, K_SNIPER = 9, K_MINE = 10, K_BOSS = 20;
	var K_PART = 30, K_BOOM = 31, K_BIGBOOM = 32;
	var S_LEFT = 0, S_RIGHT = 1, S_BOTH = 2, S_GAP = 3, S_WARP = 4, S_GROUND = 5;
	var I_P = 1, I_N = 2, I_S = 3, I_1 = 4;
	var PL_SHIP = 0, PL_FLASH = 1, PL_RED = 2, PL_GREEN = 3, PL_PURPLE = 4, PL_ORANGE = 5, PL_STEEL = 6, PL_FIRE = 7;
	var PL_PINK = 8, PL_CYAN = 9, PL_YELLOW = 10, PL_LIME = 11, PL_ITEM = 12, PL_BOSSA = 13, PL_BOSSB = 14, PL_LIGHT = 15;
	var W_RING = 0, W_FLOWER = 1, W_SPIRAL = 2, W_WAVE = 3, W_VORTEX = 4, W_STAR = 5, W_ALL = 6;
	var YMIN = 8, YMAX = 168;
	var MIRRORX = SPRITE_MIRRORX, MIRRORY = SPRITE_MIRRORY;
	// the controls (Pad.Read's bits)
	var P_UP = 1, P_DOWN = 2, P_LEFT = 4, P_RIGHT = 8, P_FIRE = 16, P_POD = 32, P_BOMB = 64;
	var K_H = 72, K_K = 75;
	var V_FIRE = 200, V_POD = 201, V_BOMB = 202;			// the touch buttons' and game pads' keys

	// the sines: 256 steps round, x 127
	var SN = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3];
	// (the table's second half is the first negated: 253 = -3 ...)
	(function()
	{
		var intI;
		for (intI = 0; intI < 128; intI++) { SN[128 + intI] = -SN[intI]; }
	})();
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];

	var m_objSprites = new JSprites();
	// the sprites, numbered as the Next's: the ship (one 32 x 16: the Next's 0-1), the pickups, a
	// spark, the guardian (one 64 x 64: the Next's 9-24), the drones (2 each); then the 128
	// multiplexed bullets; and Layer 2's 512 dots, their own numbered set under them
	var SP_SHIP = 0, SP_ITEM = 2, SP_SPARK = 8, SP_BOSS = 9, SP_EN = 26, SP_BUL = 64;
	var m_objSlots = new JSpriteSlots(m_objSprites, 64 + 128);
	var m_objDots = new JSpriteSlots(m_objSprites, 512);
	var m_objSet = {};			// each library sprite's sheet: the common one ('c') or a level's
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	var m_objPad = null, m_objText = null, m_objTerrain = null;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the keys: up, down, left, right, fire, pattern, nova (redefinable), and the spares
	var m_arrKeys = [81, 65, 79, 80, 32, 83, 87];
	var m_arrSpare = [[38, P_UP], [40, P_DOWN], [37, P_LEFT], [39, P_RIGHT], [48, P_FIRE], [90, P_FIRE], [88, P_POD], [67, P_BOMB]];

	// enemies: kind, place and speed (16ths; x in the world), life, timer, mode, its argument,
	// warping in, when it fires next, a hit flash, mirrored; a target for the dots, the hits taken
	var ek = [], ex = [], ey = [], evx = [], evy = [], ehp = [], et = [], ea = [], eb = [], ews = [], efire = [], ef = [], eflip = [];
	var m_arrTargetOn = [], m_blnBossTarget = false, m_arrHit = [];
	// each kind: life, score, half box, big, its sprite, its palette, animation
	var khp = [], ksc = [], kw = [], kh = [], kbig = [], kpat = [], kpal = [], kanim = [];
	var ik = [], ix = [], iy = [], it = [];
	var pwx = 0, pys = 0, pvx = 0, face = 0, psx = 0, psy = 0;
	var alive = 0, inv = 0, deadT = 0, lives = 0, novas = 0;
	var power = 1, speed = 1, weapon = 0, ang = 0;
	var pt = [0, 0, 0, 0, 0, 0];
	var patWas = 0, novaWas = 0, novaT = 0;
	var score = 0, hiscore = 20000, nextExtend = 50000;
	var mult = 1, multT = 0, scoreDirty = 0;
	var stage = 1, loopN = 1, frames = 0, over = 0, cleared = 0, clearT = 0;
	var cam = 0, wid = 0, msgT = 0, spdAdd = 0;
	var wi = 0, waveT = 0, gate = 0, pk = 0, pn = 0, ps = 0, ptim = 0, pidx = 0;
	var gapN = 0, gapX = [], ealive = 0, drops = 0;
	var bossOn = 0, bossT = 0, bossHP = 0, bossMax = 0, bossDie = 0;
	var bwx = 0, bwy = 0, bvx = 0, bossPat = '', bossPal = 0, bossFl = 0;
	var mlist = [], klist = [], mcount = 0, kcount = 0, dieF = 0;
	var scanT = 0, opwx = 0, opys = 0, peak = 0;
	var scn = [], sco = [];
	var kp = 0;
	var m_blnGameDone = false;

	// the map: this level's columns (32 bytes each: 22 tiles, the floor's top, the ceiling's bottom)
	var m_arrMap = [], m_arrMeta = [], m_intCols = 0, m_blnMsgRows = false;
	// the screen: Layer 2's fade (0 black, 8 as drawn, 16 white), the title picture shown or not
	var m_intFade = 8, m_intDotFade = -1, m_blnTitlePic = false, m_strTitleText = '';
	var m_intPause = 0;

	// the pools: the dots and the bullets in flight, their speeds
	var m_arrDOn = [], m_arrDVX = [], m_arrDVY = [], m_arrDLife = [], m_arrDDmg = [], m_arrDFree = [];
	var m_arrBOn = [], m_arrBVX = [], m_arrBVY = [], m_arrBFree = [];
	var m_intDotHits = 0, m_intHitX = 0, m_intHitY = 0, m_intBulLive = 0, m_blnBulHit = false;
	var m_intCamWas = 0;
	// full screen (JCanvas's screenmode): how much more of the station shows left and right of the
	// Next's paper (0 in the normal mode); at most WIDEMAX each side, black beyond
	var WIDEMAX = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h };

	// ====================================================================================================
	// NUMBERS (the Next's 16 bit sums: shifts, a sine table, Rnd)

	function sinK(intA_a, intK_a)
	{
		var intS = SN[intA_a & 255];
		var intV = (Math.abs(intS) * intK_a) >> 4;
		return (intS < 0) ? -intV : intV;
	}

	function sin127(intA_a)
	{
		return SN[intA_a & 255];
	}

	function idiv(intA_a, intB_a)
	{
		var intQ = intA_a / intB_a;
		return (intQ < 0) ? Math.ceil(intQ) : Math.floor(intQ);
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

	function mapCls()
	{
		m_objText.clear(0, 4);
	}

	// the column count, a level's fact (Map.Meta: 2 the gaps, 3-10 where, 16 on the waves)
	function meta(intI_a)
	{
		var intResult = 0;
		if (intI_a < 2) { intResult = (intI_a === 0) ? (m_intCols & 255) : (m_intCols >> 8); }
		else if (intI_a - 2 < m_arrMeta.length) { intResult = m_arrMeta[intI_a - 2]; }
		return intResult;
	}

	function mapStart(intLevel_a)
	{
		var intC, intR;
		m_arrMap = D.maps[intLevel_a];
		m_arrMeta = D.meta[intLevel_a] || [];
		m_intCols = Math.floor(m_arrMap.length / 32);
		m_objTerrain = new JTileGrid(m_objSprites, { w:m_intCols, h:22, tilew:8, tileh:8, columns:16, images:['mpx_tl' + intLevel_a], first:0, firstcode:0, transparent:0 });
		for (intC = 0; intC < m_intCols; intC++)
		{
			for (intR = 0; intR < 22; intR++)
			{
				m_objTerrain.put(intC, intR, m_arrMap[intC * 32 + intR], 0);
			}
		}
		m_objTerrain.invalidate();
		m_blnMsgRows = false;
	}

	// the tile at paper x, y (0 off the play area, past the level's ends, or in the rows a
	// message holds)
	function tileAt(intX_a, intY_a)
	{
		var intResult = 0, intC, intR;
		if ((intY_a >= 0) && (intY_a <= 175) && (intX_a >= -32) && (intX_a <= 287))
		{
			intC = (cam + intX_a) >> 3;
			intR = intY_a >> 3;
			if ((intC >= 0) && (intC < m_intCols) && !(m_blnMsgRows && ((intR === 3) || (intR === 5))))
			{
				intResult = m_arrMap[intC * 32 + intR];
			}
		}
		return intResult;
	}

	function solid(intX_a, intY_a)
	{
		return (tileAt(intX_a, intY_a) >= 128);
	}

	function floorY(intX_a)
	{
		var intC = intX_a >> 3;
		return ((intC < 0) || (intC >= m_intCols)) ? 176 : m_arrMap[intC * 32 + 22];
	}

	function ceilY(intX_a)
	{
		var intC = intX_a >> 3;
		return ((intC < 0) || (intC >= m_intCols)) ? 0 : m_arrMap[intC * 32 + 23];
	}

	// rows 7 and 9 held for a message (cleared: the terrain under them isn't shown or solid)
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
					mapPut(intK, 7, 0); mapPut(intK, 9, 0);
				}
			}
		}
	}

	// ====================================================================================================
	// LAYER 2'S FADE (Pal.Fade): the title picture and the dots, to black and up to white

	function fade(intN_a)
	{
		var intN = intN_a, intK;
		if (intN < 0) { intN = 0; }
		if (intN > 16) { intN = 16; }
		m_intFade = intN;
		if (intN !== m_intDotFade)
		{
			// the dots are Layer 2's: their colours fade with it (each dot's colour strip at this level)
			m_intDotFade = intN;
			for (intK = 0; intK < ND; intK++)
			{
				m_objDots.look(intK, 'mpx_dots' + intN);
			}
		}
	}

	// ====================================================================================================
	// SPRITES: a sprite's look (one of the sheet's sprites, in a palette row)

	function sheetName(strSet_a, intRow_a)
	{
		return 'mpx_' + strSet_a + '_' + intRow_a;
	}

	// sprite n: library sprite strName_a at x, y in palette row intRow_a (frame 0 leaves the frame to
	// its animation); scale, mirroring optional
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, (intFrame_a === 0) ? undefined : intFrame_a, sheetName(m_objSet[strName_a], intRow_a), intScale_a, intFlags_a);
	}

	function hideRange(intFirst_a, intCount_a)
	{
		m_objSlots.hideRange(intFirst_a, intCount_a);
	}

	// ====================================================================================================
	// THE DOTS (Dots.cls): a pool of 512 sprites in class 'mpxdot'

	function dotsWipe()
	{
		var intK;
		m_arrDFree = [];
		for (intK = ND - 1; intK >= 0; intK--)
		{
			m_arrDOn[intK] = false;
			m_arrDFree.push(intK);
		}
		m_objDots.hideRange(0, ND);
	}

	function dotsCount()
	{
		return ND - m_arrDFree.length;
	}

	// Burst x, y, n, a, step, spd, amp, petals, r, twist, life, colour, dmg: n dots at once - the
	// k-th way a + k * step from r pixels out, turned twist more, at spd + amp * |sin(a * petals)| / 128
	// sixteenths of a pixel a frame
	// Burst x, y, n, a, step, spd, amp, petals, r, twist, life, colour, dmg: n dots at once - the
	// k-th way a + k * step from r pixels out, turned twist more, at spd + amp * |sin(a * petals)| / 128
	// sixteenths of a pixel a frame
	function burst(intX_a, intY_a, intN_a, intA_a, intStep_a, intSpd_a, intAmp_a, intPetals_a, intR_a, intTwist_a, intLife_a, intC_a, intDmg_a)
	{
		var intK, intA = intA_a & 255, intS, intDa, intPX, intPY, intD;
		var intLife = ((intLife_a >> 1) + (intLife_a & 1)) * 2;
		for (intK = 0; (intK < intN_a) && (m_arrDFree.length > 0); intK++)
		{
			intS = intSpd_a + ((intAmp_a * Math.abs(sin127((intA * intPetals_a) & 255))) >> 7);
			if (intS > 255) { intS = 255; }
			intDa = (intA + intTwist_a) & 255;
			intPX = intX_a + ((sin127(intA) * intR_a) >> 7);
			intPY = intY_a + ((sin127(intA + 64) * intR_a) >> 7);
			if ((intPY >= 0) && (intPY < 176))
			{
				intD = m_arrDFree.pop();
				m_arrDOn[intD] = true;
				// the Next's speed is in 256ths a move, two frames a move: / 512 a frame
				m_arrDVX[intD] = ((sin127(intDa) * intS) >> 2) / 512;
				m_arrDVY[intD] = ((sin127(intDa + 64) * intS) >> 2) / 512;
				m_arrDLife[intD] = intLife;
				m_arrDDmg[intD] = intDmg_a;
				// its colour: frame (colour + 1) of the strip of all 256
				m_objDots.put(intD, intPX - cam + 32, intPY + 32, 'dot', (intC_a & 255) + 1, 'mpx_dots' + m_intDotFade);
			}
			intA = (intA + intStep_a) & 255;
		}
	}

	function freeDot(intD_a)
	{
		m_arrDOn[intD_a] = false;
		m_arrDFree.push(intD_a);
		m_objDots.hide(intD_a);
	}

	// a frame of the dots: all of them fly (one moveSpritesByIDs, their speeds the functions, the
	// camera's move taken off), their lives run out, the paper's edges and the terrain stop them,
	// and they hit the targets (JSprites' collisions)
	// a frame of the dots: all of them fly (one moveRangeBy, their speeds the functions, the camera's
	// move taken off), their lives run out, the paper's edges and the terrain stop them, and they hit
	// the targets (each target's own hit box asked of each dot)
	function dotsStep()
	{
		var intDCam = cam - m_intCamWas, intK, intX, intY, intT, intM;
		var arrBoxes = [], arrWho = [], objB;
		m_objDots.moveRangeBy(0, ND,
			function(intI_a) { return m_arrDOn[intI_a] ? (m_arrDVX[intI_a] - intDCam) : 0; },
			function(intI_a) { return m_arrDOn[intI_a] ? m_arrDVY[intI_a] : 0; });
		for (intM = 0; intM < NE; intM++)
		{
			if (m_arrTargetOn[intM])
			{
				objB = m_objSlots.getBox(SP_EN + intM * 2);
				arrBoxes.push({ x:objB.left, y:objB.top, w:objB.right - objB.left, h:objB.bottom - objB.top }); arrWho.push(intM);
			}
		}
		if (m_blnBossTarget)
		{
			objB = m_objSlots.getBox(SP_BOSS);
			arrBoxes.push({ x:objB.left, y:objB.top, w:objB.right - objB.left, h:objB.bottom - objB.top }); arrWho.push(19);
		}
		m_intDotHits = 0;
		for (intK = 0; intK < ND; intK++)
		{
			if (m_arrDOn[intK])
			{
				intX = Math.floor(m_objDots.getX(intK)) - 32; intY = Math.floor(m_objDots.getY(intK)) - 32;
				m_arrDLife[intK]--;
				if ((m_arrDLife[intK] <= 0) || (intX < 0) || (intX > 255) || (intY < 0) || (intY > 175) || solid(intX, intY))
				{
					freeDot(intK);
				}
				else
				{
					for (intT = 0; (intT < arrBoxes.length) && m_arrDOn[intK]; intT++)
					{
						if (m_objDots.collideRect(intK, arrBoxes[intT].x, arrBoxes[intT].y, arrBoxes[intT].w, arrBoxes[intT].h))
						{
							m_arrHit[arrWho[intT]] += m_arrDDmg[intK];
							m_intHitX = intX; m_intHitY = intY;
							m_intDotHits++;
							freeDot(intK);
						}
					}
				}
			}
		}
	}

	function hits(intN_a)
	{
		var intResult = m_arrHit[intN_a];
		m_arrHit[intN_a] = 0;
		return intResult;
	}

	// ====================================================================================================
	// THE BULLETS (Bul.cls): a pool of 128 sprites in class 'mpxbul'

	function bulReset()
	{
		var intK;
		m_arrBFree = [];
		for (intK = NB - 1; intK >= 0; intK--)
		{
			m_arrBOn[intK] = false;
			m_arrBFree.push(intK);
		}
		hideRange(SP_BUL, NB);
		m_intBulLive = 0;
	}

	// Burst x, y, n, a, step, spd, pat, pal: n bullets, the k-th going way a + k * step at spd
	// sixteenths of a pixel a frame
	// Burst x, y, n, a, step, spd, pat, pal: n bullets, the k-th going way a + k * step at spd
	// sixteenths of a pixel a frame
	function bulBurst(intX_a, intY_a, intN_a, intA_a, intStep_a, intSpd_a, intPat_a, intPal_a)
	{
		var intK, intA = intA_a & 255, intB;
		for (intK = 0; (intK < intN_a) && (m_arrBFree.length > 0); intK++)
		{
			intB = m_arrBFree.pop();
			m_arrBOn[intB] = true;
			m_arrBVX[intB] = idiv(Math.abs(sin127(intA)) * intSpd_a, 8) * ((sin127(intA) < 0) ? -1 : 1) / 256;
			m_arrBVY[intB] = idiv(Math.abs(sin127(intA + 64)) * intSpd_a, 8) * ((sin127(intA + 64) < 0) ? -1 : 1) / 256;
			spr(SP_BUL + intB, intX_a - cam + 24.5, intY_a + 24.5, 'b' + intPat_a, 1, intPal_a);
			intA = (intA + intStep_a) & 255;
		}
	}

	function bulClear()
	{
		bulReset();
	}

	// a frame of the bullets: one moveSpritesByIDs; off the paper or into the terrain they go; on
	// the ship (its hit box: 4 across and 3 down of its middle) - JSprites' collision
	// a frame of the bullets: one moveRangeBy (their speeds the functions); off the paper or into the
	// terrain they go; does the ship (its own hit box) touch one?
	function bulStep(blnShip_a)
	{
		var intDCam = cam - m_intCamWas, intK, intX, intY;
		m_objSlots.moveRangeBy(SP_BUL, NB,
			function(intI_a) { return m_arrBOn[intI_a] ? (m_arrBVX[intI_a] - intDCam) : 0; },
			function(intI_a) { return m_arrBOn[intI_a] ? m_arrBVY[intI_a] : 0; });
		m_intBulLive = 0;
		for (intK = 0; intK < NB; intK++)
		{
			if (m_arrBOn[intK])
			{
				intX = Math.floor(m_objSlots.getX(SP_BUL + intK)) - 24; intY = Math.floor(m_objSlots.getY(SP_BUL + intK)) - 24;
				if ((intX < 0) || (intX > 255) || (intY < 0) || (intY > 175) || solid(intX, intY))
				{
					m_arrBOn[intK] = false;
					m_arrBFree.push(intK);
					m_objSlots.hide(SP_BUL + intK);
				}
				else
				{
					m_intBulLive++;
				}
			}
		}
		m_blnBulHit = blnShip_a && (m_objSlots.collideRange(SP_SHIP, SP_BUL, NB).length > 0);
	}

	// ====================================================================================================
	// THE TITLE

	function title()
	{
		hideAll();
		bulReset();
		dotsWipe();
		mapCls();
		m_objText.setImage(4, 'mpx_tl1');
		fade(0);
		m_blnTitlePic = true;
		m_intCamWas = cam;
		panelText();
		mapTextC(7, 16, 'NO GUN. ONLY THE PATTERN.', 2);
		mapText(6, 23, 'K REDEFINE KEYS    H PAUSE');
		mapTextC(8, 25, '(C) 2026 CYBORG UNICORN', 2);
		showKeys();
		m_objPad.setControls(m_arrTitleControls);
		fadeFrames(0, 8, 1);
		var intT = 0, blnFireWas = true;
		m_objSteps.until(function()
		{
			var blnDone = false, blnF;
			frames++;
			intT++;
			if (intT === 30) { mapTextC(11, 21, 'PRESS FIRE TO PLAY', 1); }
			if (intT === 60) { mapText(11, 21, '                  '); intT = 0; }
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
		m_objSteps.call(function() { m_blnTitlePic = false; });
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
		mapText(6, 18, 'MOVE     ' + strS + '      ');
		mapText(6, 19, 'FIRE ' + keyName(m_arrKeys[4]) + '  PATTERN ' + keyName(m_arrKeys[5]) + '  NOVA ' + keyName(m_arrKeys[6]) + '   ');
	}

	// every key in turn: press the one you want (let go of it before the next)
	function redefine()
	{
		var arrNames = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'FIRE', 'PATTERN', 'NOVA'];
		var intA;
		m_objSteps.until(function() { return padScan() < 0; });
		for (intA = 0; intA < 7; intA++)
		{
			(function(intAction_a)
			{
				m_objSteps.call(function() { mapTextC(6, 16, '  PRESS A KEY FOR ' + arrNames[intAction_a] + '        ', 1); });
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
		m_objSteps.call(function() { mapTextC(6, 16, '  DONE                          ', 1); });
		m_objSteps.wait(50);
		m_objSteps.call(function() { mapTextC(7, 16, 'NO GUN. ONLY THE PATTERN.  ', 2); });
	}

	// ====================================================================================================
	// THE PANEL: row 26 the score, the pattern, its power, the multiplier, lives, novas; row 27 the scanner

	function panelText()
	{
		var intK;
		for (intK = 4; intK <= 35; intK++)
		{
			mapPut(intK, 26, G.T_PANEL);
			mapPut(intK, 27, G.T_PANEL);
		}
		for (intK = 0; intK <= 31; intK++)
		{
			sco[intK] = 255;
		}
		showScore();
		mapTextC(12, 27, 'HI ' + seven(hiscore), 1);
	}

	function panel()
	{
		var intK;
		panelText();
		for (intK = 4; intK <= 35; intK++)
		{
			mapPut(intK, 27, G.T_SCAN);
		}
		showWeapon(); showPower(); showLives(); showNovas(); showMult();
	}

	function showScore()
	{
		mapText(4, 26, seven(score));
		scoreDirty = 0;
	}

	function weaponName()
	{
		return 'RING  FLOWERSPIRALWAVE  VORTEXSTAR  ALL   '.substr(weapon * 6, 6);
	}

	function showWeapon()
	{
		mapTextC(12, 26, weaponName(), 2);
	}

	function showPower()
	{
		var intK;
		for (intK = 0; intK <= 4; intK++)
		{
			mapPut(19 + intK, 26, (intK < power) ? G.T_POW1 : G.T_POW0);
		}
	}

	function showMult()
	{
		if (mult > 1) { mapTextC(25, 26, 'X' + mult, 3); }
		else { mapText(25, 26, '  '); }
	}

	function showLives()
	{
		var intK;
		for (intK = 0; intK <= 3; intK++)
		{
			mapPut(28 + intK, 26, (intK < lives - 1) ? G.T_LIFE : G.T_PANEL);
		}
	}

	function showNovas()
	{
		var intK;
		for (intK = 0; intK <= 2; intK++)
		{
			mapPut(33 + intK, 26, (intK < novas) ? G.T_NOVA : G.T_PANEL);
		}
	}

	// a message across the play area for t frames (0: until the next)
	function message(str_a, intT_a)
	{
		msgRows(true);
		mapText(4, 7, '                                ');
		mapTextC(4 + idiv(32 - str_a.length, 2), 7, str_a, 1);
		msgT = intT_a;
	}

	function message2(str_a)
	{
		msgRows(true);
		mapText(4, 9, '                                ');
		mapText(4 + idiv(32 - str_a.length, 2), 9, str_a);
	}

	function clearMessage()
	{
		mapText(4, 7, '                                ');
		mapText(4, 9, '                                ');
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

	// the scanner: the whole corridor in 32 cells (64 halves) - you, the drones, the paper's view
	function scanner()
	{
		var intC, intM, intK;
		for (intC = 0; intC <= 31; intC++) { scn[intC] = 0; }
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			if ((intK > 0) && (intK < K_PART))
			{
				intC = ex[intM] >> 4;
				if ((intC >= 0) && (intC < wid))
				{
					intC = ((intC >> 4) * 21) >> 5;
					if (intC > 63) { intC = 63; }
					scn[intC >> 1] = scn[intC >> 1] | (1 + (intC & 1));
				}
			}
		}
		if (bossOn)
		{
			intC = ((bwx >> 4) * 21) >> 5;
			if (intC > 63) { intC = 63; }
			scn[intC >> 1] = scn[intC >> 1] | 3;
		}
		if (alive)
		{
			intC = (((((pwx >> 4) >> 4) * 21) >> 5) + 1) >> 4;
			if (intC > 31) { intC = 31; }
			scn[intC] = scn[intC] | 4;
		}
		intC = (((cam >> 4) * 21) >> 5) >> 4;
		intM = ((((cam + 255) >> 4) * 21) >> 5) >> 4;
		if (intM > 31) { intM = 31; }
		while (intC <= intM)
		{
			scn[intC] = scn[intC] | 8;
			intC++;
		}
		for (intC = 0; intC <= 31; intC++)
		{
			if (scn[intC] !== sco[intC])
			{
				mapPut(4 + intC, 27, G.T_SCAN + scn[intC]);
				sco[intC] = scn[intC];
			}
		}
	}

	// ====================================================================================================
	// A GAME

	function game()
	{
		lives = 3; novas = 2; power = 1; speed = 1; weapon = W_RING;
		score = 0; mult = 1; multT = 0; loopN = 1; stage = FIRST_STAGE; over = 0;
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
							ending('THE GRID IS DOWN');
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
		hideAll();
		bulReset();
		dotsWipe();
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
				show();
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
		var arrN = ['THE OUTER HULL', 'THE REACTOR', 'THE BIOLAB', 'THE CORE'];
		return arrN[Math.min(stage, 4) - 1];
	}

	// a stage: from the start to its guardian beaten (or the last life lost)
	function stageRun()
	{
		var intK;
		spdAdd = (loopN - 1) * 4 + (stage - 1) * 2;
		hideAll();
		bulReset();
		fade(0);
		mapCls();
		m_objText.setImage(4, 'mpx_tl' + stage);
		dotsWipe();
		mapStart(stage);
		wid = m_intCols * 8;
		gapN = meta(2);
		if (gapN > 8) { gapN = 8; }
		for (intK = 0; intK < gapN; intK++)
		{
			gapX[intK] = meta(3 + intK) * 8;
		}
		m_objPad.setControls(m_arrPlayControls);
		panel();
		cleared = 0; clearT = 0; peak = 0;
		wi = 0; waveT = 150; gate = 0; pn = 0;
		bossOn = 0;
		for (intK = 0; intK < NE; intK++)
		{
			ek[intK] = 0;
		}
		pwx = (wid >> 1) * 16; pys = 88 * 16; face = 0;
		cam = (pwx >> 4) - 96;
		m_intCamWas = cam;
		restart();
		m_objSteps.call(function()
		{
			message('SECTOR ' + stage, 150);
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
							message('SECTOR CLEAR  BONUS ' + (stage * 5000), 0);
							message2('MOST SHOTS AT ONCE ' + peak);
							addScore(stage * 5000);
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

	// the ship back (where it went down), the bullets gone
	function restart()
	{
		var intK;
		for (intK = 0; intK < NI; intK++)
		{
			ik[intK] = 0;
		}
		hideRange(SP_SHIP, 1);
		hideRange(SP_ITEM, NI);
		hideRange(SP_SPARK, 1);
		bulReset();
		pvx = 0;
		alive = 1; inv = 120; deadT = 0;
		patWas = 1; novaWas = 1; novaT = 0;
		mult = 1; multT = 0; showMult();
		showPower(); showLives(); showNovas(); showWeapon();
		camera();
		safePlace();
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

	// back in open air with room round the ship: the nearest such place to where you went down
	function safePlace()
	{
		var intD, intY, intJ, intE, intX, intB, blnFound = false;
		intB = (face === 0) ? -16 : 16;
		for (intE = 0; (intE <= 16) && !blnFound; intE++)
		{
			intX = psx - intB * ((intE + 1) >> 1);
			if (intE & 1) { intX = psx + intB * ((intE + 1) >> 1); }
			if ((intX >= 16) && (intX <= 239))
			{
				for (intD = 0; (intD <= 160) && !blnFound; intD += 4)
				{
					for (intJ = 0; (intJ <= 1) && !blnFound; intJ++)
					{
						intY = intJ ? (psy - intD) : (psy + intD);
						if ((intY >= YMIN) && (intY <= YMAX))
						{
							if (!solid(intX - 28, intY) && !solid(intX, intY) && !solid(intX + 28, intY) && !solid(intX, intY - 12) && !solid(intX, intY + 12))
							{
								pys = intY * 16; psy = intY;
								pwx = ((pwx >> 4) + intX - psx) * 16; psx = intX;
								blnFound = true;
							}
						}
					}
				}
			}
		}
	}

	// one frame of the play
	function tick()
	{
		var intK;
		if (m_arrKeyMap[K_H] === 0)
		{
			m_intPause = 1;
		}
		else
		{
			kp = padRead();
			playerMove();
			camera();
			waves();
			enemies();
			if (bossOn) { bossUpdate(); }
			weapons();
			dotsStep();
			bulStep((alive !== 0) && (inv === 0));
			if (alive && (inv === 0) && m_blnBulHit) { die(); }
			if (m_intDotHits > 0)
			{
				// a spark: its sprite shows for 3 frames (its sequence) and is put away when it's done
				spr(SP_SPARK, m_intHitX + 24, m_intHitY + 24, 'spark', 0, PL_LIGHT);
				m_objSlots.animate(SP_SPARK, 1, true);
			}
			if (!m_objSlots.isAnimated(SP_SPARK)) { m_objSlots.hide(SP_SPARK); }
			items();
			novaUpdate();
			drawPlayer();
			if (multT > 0)
			{
				multT--;
				if (multT === 0) { mult = 1; showMult(); }
			}
			scanT++;
			if (scanT >= 6)
			{
				scanT = 0; scanner();
				intK = dotsCount() + m_intBulLive;
				if (intK > peak) { peak = intK; }
			}
			if (((frames & 3) === 0) && scoreDirty) { showScore(); }
			if (msgT > 0)
			{
				msgT--;
				if (msgT === 0) { clearMessage(); }
			}
			m_intCamWas = cam;
			show();
		}
	}

	// H: everything stops until H again (the shot counts in the panel)
	function pauseStep()
	{
		if (m_intPause === 1)
		{
			if (m_arrKeyMap[K_H] !== 0)
			{
				m_intPause = 2;
				mapTextC(4, 26, '         PAUSED - H GOES ON     ', 1);
				mapTextC(4, 27, '  DOTS ' + rightStr('  ' + dotsCount(), 3) + '  BULLETS ' + rightStr('  ' + m_intBulLive, 3) + '  PEAK ' + rightStr('  ' + peak, 3) + ' ', 2);
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
		}
	}

	// the frame to the screen (Show: Frame, the uploads, the sound): the sprites' animations step
	// the frame to the screen (Show: Frame, the uploads, the sound): the sprites' animations a step on
	function show()
	{
		m_objSlots.step();
		frames++;
	}

	function hideAll()
	{
		hideRange(0, SP_BUL);
	}

	// ====================================================================================================
	// THE SHIP AND THE CAMERA

	function playerMove()
	{
		var intMx, intVy;
		if (alive === 0)
		{
			if (deadT > 0) { deadT--; }
		}
		else
		{
			if (inv > 0) { inv--; }
			opwx = pwx; opys = pys;
			intMx = 44 + speed * 10;
			if (kp & P_RIGHT)
			{
				face = 0;
				pvx += 5;
			}
			else if (kp & P_LEFT)
			{
				face = 1;
				pvx -= 5;
			}
			else
			{
				pvx -= (pvx + 4) >> 3;
			}
			if (pvx > intMx) { pvx = intMx; }
			if (pvx < -intMx) { pvx = -intMx; }
			intVy = 30 + speed * 6;
			if (kp & P_UP) { pys -= intVy; }
			if (kp & P_DOWN) { pys += intVy; }
			if (pys < YMIN * 16) { pys = YMIN * 16; }
			if (pys > YMAX * 16) { pys = YMAX * 16; }
			pwx += pvx;
			if (pwx < 256) { pwx = 256; pvx = 0; }
			if (pwx > (wid - 16) * 16) { pwx = (wid - 16) * 16; pvx = 0; }
			psy = pys >> 4;
		}
	}

	// the paper follows the ship: it sits a third in from the side it flies from
	function camera()
	{
		var intT, intD;
		intT = (face === 0) ? ((pwx >> 4) - 88) : ((pwx >> 4) - 168);
		intD = (intT - cam) >> 2;
		if (intD > 12) { intD = 12; }
		if (intD < -12) { intD = -12; }
		if ((intD === 0) && (intT !== cam)) { intD = (intT > cam) ? 1 : -1; }
		cam += intD;
		if (cam > wid - 256) { cam = wid - 256; }
		if (cam < 0) { cam = 0; }
		psx = (pwx >> 4) - cam;
		// the terrain: the nose, the middle, the tail - while you flash it stops you instead
		if (alive)
		{
			intD = (face === 0) ? 7 : -7;
			if (solid(psx + intD, psy) || solid(psx, psy + 2) || solid(psx - intD, psy - 1))
			{
				if (inv > 0)
				{
					pwx = opwx; pys = opys; pvx = 0; psy = pys >> 4; psx = (pwx >> 4) - cam;
				}
				else
				{
					die();
				}
			}
		}
		// the ship: its engines flicker (its sequence); it faces the way it flies
		if (alive)
		{
			spr(SP_SHIP, psx + 16, psy + 24, 'ship', 0, PL_SHIP, 1, (face === 0) ? 0 : MIRRORX);
			m_objSlots.animate(SP_SHIP, 1);
		}
	}

	function drawPlayer()
	{
		if ((alive === 0) || ((inv > 0) && ((frames & 2) !== 0)))
		{
			m_objSlots.hide(SP_SHIP);
		}
	}

	function die()
	{
		if ((alive !== 0) && !GOD)
		{
			alive = 0; deadT = 100;
			lives--;
			boom(pwx >> 4, psy, 1);
			boom((pwx >> 4) - 10, psy - 6, 0);
			boom((pwx >> 4) + 10, psy + 6, 0);
			m_objSound.play(1, 31, 0, 15, 40, true);
			bulClear();
			power--;
			if (power < 1) { power = 1; }
			speed = 1;
			mult = 1; multT = 0; showMult();
			showLives(); showPower();
			m_objSlots.hide(SP_SHIP);
		}
	}

	// ====================================================================================================
	// THE PATTERNS

	function weapons()
	{
		var blnF, intX, intD, intK;
		if (alive !== 0)
		{
			blnF = ((kp & P_POD) !== 0);
			if (blnF && !patWas)
			{
				weapon++;
				if (weapon > W_ALL) { weapon = W_RING; }
				showWeapon();
				m_objSound.play(2, 40, 0, 12, 6, false);
			}
			patWas = blnF;
			blnF = ((kp & P_BOMB) !== 0);
			if (blnF && !novaWas && (novas > 0) && (novaT === 0)) { nova(); }
			novaWas = blnF;
			if ((kp & P_FIRE) === 0)
			{
				for (intK = 0; intK <= 5; intK++) { pt[intK] = 0; }
			}
			else
			{
				intX = pwx >> 4;
				intD = (power >= 4) ? 2 : 1;
				if (weapon === W_ALL)
				{
					for (intK = 0; intK <= 5; intK++) { pattern(intK, intX, intD); }
				}
				else
				{
					pattern(weapon, intX, intD);
				}
			}
		}
	}

	// one pattern w (from x, psy; d its damage) on its own timer
	function pattern(intW_a, intX_a, intD_a)
	{
		var intT, intN, intA, intS;
		pt[intW_a]++; intT = pt[intW_a];
		switch (intW_a)
		{
			case W_RING:
				if ((intT >= 7 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					burst(intX_a, psy, 24, ang, 11, 26, 0, 0, 6, 0, 84, 0x1F, intD_a);
					ang += 5;
					m_objSound.play(0, 60, 4, 8, 3, false);
				}
				break;
			case W_FLOWER:
				if ((intT >= 8 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					burst(intX_a, psy, 32, ang, 8, 12, 36, 3, 4, 0, 96, 0xE7, intD_a);
					ang += 3;
					m_objSound.play(0, 90, -4, 8, 3, false);
				}
				break;
			case W_SPIRAL:
				intN = 3 + (power >> 1);
				intS = idiv(256 + (intN >> 1), intN);
				burst(intX_a, psy, intN, ang, intS, 30, 0, 0, 6, 0, 84, 0xFC, intD_a);
				ang += 11;
				if ((intT & 3) === 1) { m_objSound.play(0, 120, -8, 6, 2, false); }
				break;
			case W_WAVE:
				intA = sinK(intT * 9, 3 + (power >> 1));
				intN = (face === 0) ? 64 : 192;
				burst(intX_a, psy, 2, intN + intA, -intA - intA, 44, 0, 0, 8, 0, 64, 0x5C, intD_a);
				burst(intX_a, psy, 2, intN + 128 - intA, intA + intA, 36, 0, 0, 4, 0, 60, 0x5C, intD_a);
				if (power >= 3) { burst(intX_a, psy, 2, intN + intA + intA, -intA * 4, 40, 0, 0, 4, 0, 60, 0x9C, intD_a); }
				if ((intT & 3) === 1) { m_objSound.play(0, 70, 6, 6, 2, false); }
				break;
			case W_VORTEX:
				intN = 5 + (power >> 1);
				intS = idiv(256 + (intN >> 1), intN);
				burst(intX_a, psy, intN, ang, intS, 24, 0, 0, 22, 64, 84, 0xAB, intD_a);
				ang += 9;
				if ((intT & 7) === 1) { m_objSound.play(0, 50, 3, 7, 3, false); }
				break;
			default:
				if ((intT >= 11 - power) || (intT === 1))
				{
					pt[intW_a] = 1;
					burst(intX_a, psy, 12, ang, 21, 14, 0, 0, 4, 0, 96, 0xFF, intD_a);
					burst(intX_a, psy, 12, ang, 21, 26, 0, 0, 4, 0, 96, 0xF8, intD_a);
					burst(intX_a, psy, 12, ang + 10, 21, 20, 0, 0, 4, 0, 96, 0xFC, intD_a);
					ang += 4;
					m_objSound.play(0, 40, 2, 9, 4, false);
				}
				break;
		}
		ang = ang & 255;
	}

	// a nova: every bullet gone, everything on the paper hurt, a burst of 128 dots
	function nova()
	{
		var intM, intX, intK;
		novas--; showNovas();
		novaT = 40;
		bulClear();
		intX = pwx >> 4;
		burst(intX, psy, 64, 0, 4, 20, 0, 0, 4, 0, 70, 0xFF, 4);
		burst(intX, psy, 64, 2, 4, 40, 0, 0, 4, 0, 70, 0xFC, 4);
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			if ((intK > 0) && (intK < K_PART) && (ews[intM] === 0))
			{
				intX = (ex[intM] >> 4) - cam;
				if ((intX > -16) && (intX < 272) && (khp[intK] > 0)) { ehp[intM] -= 30; ef[intM] = 4; }
			}
		}
		if (bossOn) { bossHP -= 20; }
		if (inv < 40) { inv = 40; }
		m_objSound.play(1, 40, 2, 15, 40, true);
	}

	function novaUpdate()
	{
		if (novaT !== 0)
		{
			novaT--;
			if (novaT > 32) { fade(16 - (40 - novaT)); }
			else if (novaT === 32) { fade(8); }
			if (novaT > 20) { bulClear(); }
		}
	}

	// ====================================================================================================
	// THE WAVES: the level's list (meta from 16: kind, count, side, gate), one after another

	function waves()
	{
		var intK;
		if (pn > 0)
		{
			ptim--;
			if (ptim <= 0)
			{
				spawnOne(pk, ps, pidx);
				pidx++;
				pn--;
				ptim = (pk === K_SWARM) ? 6 : 10;
			}
		}
		else if (!bossOn && !cleared)
		{
			waveT--;
			if ((waveT <= 0) && !((ealive > gate) && ((waveT > -600) || (ealive > 9))))
			{
				intK = meta(16 + wi * 4);
				if (intK === K_BOSS)
				{
					if (ealive === 0) { startBoss(); }
				}
				else if (intK !== 0)
				{
					pk = intK; pn = meta(17 + wi * 4); ps = meta(18 + wi * 4); gate = meta(19 + wi * 4);
					pn = pn + loopN - 1;
					pidx = 0; ptim = 0;
					wi++;
					waveT = 90;
				}
			}
		}
	}

	// one drone of a wave: in from the side (or both in turn), down a gap, warped in, or on the ground
	function spawnOne(intKd_a, intSide_a, intN_a)
	{
		var intX = 0, intY = 0, intM, intG, intD, intJ, intFl = 0, intPx = pwx >> 4, intSide = intSide_a, blnFound;
		if (intSide === S_BOTH) { intSide = S_LEFT + (intN_a & 1); }
		if ((intSide === S_LEFT) || (intSide === S_RIGHT))
		{
			intX = (intSide === S_LEFT) ? (cam - 24) : (cam + 280);
			if (intX < 24) { intX = cam + 280; }
			if (intX > wid - 24) { intX = cam - 24; }
			blnFound = false;
			for (intJ = 0; (intJ <= 5) && !blnFound; intJ++)
			{
				intY = 24 + rnd(128);
				if (!solid(intX - cam, intY)) { blnFound = true; }
			}
		}
		else if (intSide === S_GAP)
		{
			intG = 0; intD = 9999;
			for (intJ = 0; intJ < gapN; intJ++)
			{
				if (Math.abs(gapX[intJ] - intPx) < intD) { intD = Math.abs(gapX[intJ] - intPx); intG = intJ; }
			}
			intX = gapX[intG] + rnd(17) - 8; intY = -12;
		}
		else if (intSide === S_WARP)
		{
			intX = cam + 24 + rnd(208); intY = 24 + rnd(128);
			if (Math.abs(intX - intPx) < 56) { intX = (intX < intPx) ? (intX - 64) : (intX + 64); }
			if (intX < 24) { intX = 24; }
			if (intX > wid - 24) { intX = wid - 24; }
		}
		else
		{
			intX = rnd(2) ? (intPx + 70 + rnd(140)) : (intPx - 70 - rnd(140));
			if (intX < 32) { intX = 32; }
			if (intX > wid - 32) { intX = wid - 32; }
			if ((intN_a & 1) && (ceilY(intX) > 0))
			{
				intY = ceilY(intX) + 6; intFl = MIRRORY;
			}
			else
			{
				intY = floorY(intX) - 6;
			}
		}
		intM = spawn(intKd_a, intX, intY);
		if (intM >= 0)
		{
			eflip[intM] = intFl;
			if ((intSide === S_WARP) || (intSide === S_GROUND)) { ews[intM] = 32; }
			if (intSide === S_GAP) { ea[intM] = 1; }
			evx[intM] = (intX > intPx) ? -1 : 1;
		}
	}

	// a free record set up (two for a big one): its number, -1 none free
	function spawn(intKd_a, intX_a, intY_a)
	{
		var intM, intSt = kbig[intKd_a] ? 2 : 1, intResult = -1;
		for (intM = 0; (intM <= NE - intSt) && (intResult < 0); intM += intSt)
		{
			if ((ek[intM] === 0) && ((intSt === 1) || (ek[intM + 1] === 0)))
			{
				ek[intM] = intKd_a; ex[intM] = intX_a * 16; ey[intM] = intY_a * 16;
				evx[intM] = 0; evy[intM] = 0; ehp[intM] = idiv(khp[intKd_a] * (1 + loopN), 2); et[intM] = 0; ea[intM] = 0; eb[intM] = 0;
				ews[intM] = 0; efire[intM] = 20 + rnd(40); ef[intM] = 0; eflip[intM] = 0;
				if (intSt === 2) { ek[intM + 1] = K_PART; }
				intResult = intM;
			}
		}
		return intResult;
	}

	// ====================================================================================================
	// THE ENEMIES: who moves (EnemyPre), how each moves and shoots (move), the rest (enemyPost)

	function enemies()
	{
		var intJ, intM, intK;
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
		if ((frames & 15) === 0)
		{
			for (intM = 0; intM < NE; intM++)
			{
				intK = ek[intM];
				if ((intK > 0) && (intK < K_PART))
				{
					if ((ex[intM] < -1024) || ((ex[intM] >> 4) > wid + 64) || (ey[intM] > 3200) || (ey[intM] < -1024)) { remove(intM); }
				}
			}
		}
	}

	function remove(intM_a)
	{
		m_objSlots.hide(SP_EN + intM_a * 2);
		if (kbig[ek[intM_a]]) { ek[intM_a + 1] = 0; }
		ek[intM_a] = 0;
	}

	function enemyPre()
	{
		var intM, intK;
		mcount = 0; ealive = 0;
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			if ((intK !== 0) && (intK < 30))
			{
				if (intK !== K_MINE) { ealive++; }
				if (ews[intM] === 0) { mlist[mcount] = intM; mcount++; }
			}
		}
	}

	// every record: explosions go off, warping ones count down; the rest move on, take their hits
	// (a kill listed), put their box down for the dots, show, and fly into you
	// every record: explosions go when their sprite has played through, warping ones count down; the
	// rest move on, take their hits (a kill listed), are targets for the dots, show, and fly into you
	function enemyPost()
	{
		var intM, intK, intX, intY, intH, intRow, intN;
		kcount = 0; dieF = 0;
		for (intM = 0; intM < NE; intM++)
		{
			intK = ek[intM];
			intN = SP_EN + intM * 2;
			m_arrTargetOn[intM] = false;
			if ((intK !== 0) && (intK !== K_PART))
			{
				if (intK > K_PART)
				{
					// an explosion: its sprite plays once through
					if (!m_objSlots.isAnimated(intN))
					{
						ek[intM] = 0;
						m_objSlots.hide(intN);
					}
					else
					{
						intX = (ex[intM] >> 4) - cam; intY = ey[intM] >> 4;
						if (intK === K_BIGBOOM) { m_objSlots.move(intN, intX + 16, intY + 16); }
						else { m_objSlots.move(intN, intX + 24, intY + 24); }
					}
				}
				else
				{
					intX = (ex[intM] >> 4) - cam; intY = ey[intM] >> 4;
					if (ews[intM] !== 0)
					{
						// warping in: the warp's sprite plays its frames as it counts down
						spr(intN, intX + 24, intY + 24, 'warp', 0, PL_LIGHT);
						m_objSlots.animate(intN, 1, ews[intM] === 32);
						ews[intM]--;
						if (!shown(intX, intY)) { m_objSlots.hide(intN); }
					}
					else
					{
						ex[intM] += evx[intM]; ey[intM] += evy[intM]; et[intM]++;
						intX = (ex[intM] >> 4) - cam; intY = ey[intM] >> 4;
						intH = hits(intM);
						if ((intH > 0) && (khp[intK] > 0)) { ehp[intM] -= intH; ef[intM] = 2; }
						if ((khp[intK] > 0) && (ehp[intM] <= 0))
						{
							klist[kcount] = intM; kcount++;
						}
						else if (!shown(intX, intY))
						{
							m_objSlots.hide(intN);
						}
						else
						{
							// its look: the kind's sprite (white while hit), its loop or the frame it's on
							intRow = kpal[intK];
							if (ef[intM] > 0) { ef[intM]--; intRow = PL_FLASH; }
							if (kanim[intK] === 3)
							{
								spr(intN, intX + 24, intY + 24, 'k' + intK, 1 + eb[intM], intRow, 1, eflip[intM]);
							}
							else
							{
								spr(intN, intX + (kbig[intK] ? 16 : 24), intY + (kbig[intK] ? 16 : 24), 'k' + intK, 0, intRow, 1, eflip[intM]);
								m_objSlots.animate(intN, ((intM & 1) !== 0) ? 4 : 1);
							}
							// a target for the dots (on the paper, can be hurt)
							m_arrTargetOn[intM] = (intX >= 0) && (intX <= 255) && (intY >= 0) && (intY < 176) && (khp[intK] > 0);
							// flying into you: does its hit box touch the ship's middle (2 across, 1 down)?
							// (only on the Next's paper and round it, as the Next's: the wide screen's extra just shows)
							if (alive && (inv === 0) && visible(intX, intY) && m_objSlots.collideRect(intN, psx + 30, psy + 31, 4, 2)) { dieF = 1; }
						}
					}
				}
			}
		}
	}

	// shows: x -16 .. 271, y -16 .. 191
	function visible(intX_a, intY_a)
	{
		return (intX_a >= -16) && (intX_a < 272) && (intY_a >= -16) && (intY_a < 192);
	}

	// drawn: as visible, and on a wide screen the extra either side too
	function shown(intX_a, intY_a)
	{
		return (intX_a >= -16 - m_intWL) && (intX_a < 272 + m_intWR) && (intY_a >= -16) && (intY_a < 192);
	}

	// how each kind moves and shoots (x, y: its place in the world; px: yours)
	function move(intM_a, intKd_a)
	{
		var intX, intY, intT, intA, intN, intPx, intDx;
		intT = et[intM_a];
		intX = ex[intM_a] >> 4; intY = ey[intM_a] >> 4;
		intPx = pwx >> 4;
		intDx = intPx - intX;
		if (ea[intM_a] === 1)
		{
			// coming down a gap in the ceiling: straight down, out under it
			evx[intM_a] = 0; evy[intM_a] = 28;
			if (intY > 40) { ea[intM_a] = 0; evy[intM_a] = 0; }
		}
		else
		{
			switch (intKd_a)
			{
				case K_DART:
					if (intT === 1) { evx[intM_a] = (intDx > 0) ? (44 + spdAdd) : (-44 - spdAdd); }
					if (evx[intM_a] > 0)
					{
						eflip[intM_a] = MIRRORX;
						if (intDx < -150) { evx[intM_a] = -44 - spdAdd; }
					}
					else
					{
						eflip[intM_a] = 0;
						if (intDx > 150) { evx[intM_a] = 44 + spdAdd; }
					}
					if ((intT & 7) === 0)
					{
						if (intY < psy - 4) { evy[intM_a] = 10; }
						else if (intY > psy + 4) { evy[intM_a] = -10; }
						else { evy[intM_a] = 0; }
					}
					if (intT === efire[intM_a]) { fan(intX, intY, 3, 12, 22 + spdAdd, G.S_BSMALL, PL_PINK); efire[intM_a] = intT + 60 - stage * 5; }
					break;
				case K_ORB:
					if ((intT & 15) === 1)
					{
						intA = aim(intX, intY, intPx, psy);
						evx[intM_a] = sinK(intA, 2); evy[intM_a] = sinK(intA + 64, 2) + sinK(intT * 4, 1);
					}
					if (intT === efire[intM_a])
					{
						fan(intX, intY, 5, 10, 18 + spdAdd, G.S_BBIG, PL_CYAN);
						if ((stage > 2) && onPaper(intX)) { bulBurst(intX, intY, 8, intT, 32, 12 + spdAdd, G.S_BSMALL, PL_CYAN); }
						efire[intM_a] = intT + 60 - stage * 5;
					}
					break;
				case K_SPIN:
					if ((intT & 7) === 1)
					{
						intA = aim(intX, intY, intPx, psy);
						if (Math.abs(intDx) > 90) { evx[intM_a] = sinK(intA, 3); evy[intM_a] = sinK(intA + 64, 3); }
						else { evx[intM_a] = sinK(intA + 64, 2); evy[intM_a] = sinK(intA + 128, 2); }
					}
					if ((intT === efire[intM_a]) || (intT === efire[intM_a] + 12))
					{
						if (onPaper(intX)) { bulBurst(intX, intY, 16, intT * 3, 16, 14 + spdAdd, G.S_BSMALL, PL_PINK); }
						if (intT === efire[intM_a] + 12) { efire[intM_a] = intT + 70 - stage * 8; }
					}
					break;
				case K_SWARM:
					evx[intM_a] += (intDx > 0) ? 3 : -3;
					evy[intM_a] += (intY < psy) ? 2 : -2;
					if (evx[intM_a] > 40) { evx[intM_a] = 40; }
					if (evx[intM_a] < -40) { evx[intM_a] = -40; }
					if (evy[intM_a] > 28) { evy[intM_a] = 28; }
					if (evy[intM_a] < -28) { evy[intM_a] = -28; }
					eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					break;
				case K_MINER:
					if ((evx[intM_a] >= 0) && (evx[intM_a] < 12)) { evx[intM_a] = 12; }
					if ((evx[intM_a] < 0) && (evx[intM_a] > -12)) { evx[intM_a] = -12; }
					if (solid(intX - cam + (evx[intM_a] >> 1), intY)) { evx[intM_a] = -evx[intM_a]; }
					evy[intM_a] = sinK(intT * 3, 1);
					if (intT === efire[intM_a])
					{
						intN = spawn(K_MINE, intX, intY + 8);
						efire[intM_a] = intT + 70;
					}
					break;
				case K_TURRET:
					eb[intM_a] = (Math.abs(intDx) < 24) ? 1 : 0;
					eflip[intM_a] = (intDx > 0) ? ((eflip[intM_a] & MIRRORY) | MIRRORX) : (eflip[intM_a] & MIRRORY);
					if (intT === efire[intM_a])
					{
						if (Math.abs(intDx) < 180) { fan(intX, intY, 3 + (stage >> 1), 10, 20 + spdAdd, G.S_BDIAM, PL_YELLOW); }
						efire[intM_a] = intT + 55 - stage * 5;
					}
					break;
				case K_HUNTER:
					if ((intT & 7) === 1)
					{
						intA = aim(intX, intY, intPx, psy);
						evx[intM_a] = sinK(intA, 4); evy[intM_a] = sinK(intA + 64, 3);
						eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					}
					if (((intT & 127) < 64) && ((intT & 3) === 0) && onPaper(intX)) { bulBurst(intX, intY, 3, intT * 5, 85, 16 + spdAdd, G.S_BSTAR, PL_PINK); }
					break;
				case K_CARRIER:
					if (intT === 1) { evx[intM_a] = (intDx > 0) ? -12 : 12; }
					eflip[intM_a] = (evx[intM_a] > 0) ? MIRRORX : 0;
					evy[intM_a] = sinK(intT * 2, 1);
					if (intT === efire[intM_a])
					{
						if (onPaper(intX)) { bulBurst(intX, intY, 12, intT, 21, 12 + spdAdd, G.S_BRING, PL_CYAN); }
						efire[intM_a] = intT + 90;
					}
					break;
				case K_SNIPER:
					if ((intT & 3) === 1)
					{
						intN = (intDx > 0) ? (intPx - 110) : (intPx + 110);
						if (intX < intN - 8) { evx[intM_a] = 20; }
						else if (intX > intN + 8) { evx[intM_a] = -20; }
						else { evx[intM_a] = 0; }
						if (intY < psy - 6) { evy[intM_a] = 12; }
						else if (intY > psy + 6) { evy[intM_a] = -12; }
						else { evy[intM_a] = 0; }
						eflip[intM_a] = (intDx > 0) ? MIRRORX : 0;
					}
					if (intT === efire[intM_a])
					{
						if (onPaper(intX)) { fan(intX, intY, 3, 5, 36 + spdAdd, G.S_BTINY, PL_YELLOW); }
						efire[intM_a] = intT + 50 - stage * 5;
					}
					break;
				case K_MINE:
					if (intT > 240)
					{
						if (onPaper(intX)) { bulBurst(intX, intY, 12, intT, 21, 12 + spdAdd, G.S_BSMALL, PL_PINK); }
						remove(intM_a);
						boom(intX, intY, 0);
					}
					break;
				default:
					break;
			}
		}
	}

	function onPaper(intX_a)
	{
		var intX = intX_a - cam;
		return (intX > 0) && (intX < 256);
	}

	function kill(intM_a, intKd_a, intX_a, intY_a)
	{
		mult++;
		if (mult > 8) { mult = 8; }
		multT = 90;
		showMult();
		addScore(ksc[intKd_a] * mult);
		remove(intM_a);
		if (intKd_a === K_CARRIER)
		{
			drops++;
			switch (drops & 7)
			{
				case 1: case 3: case 5: case 7: drop(I_P, intX_a, intY_a); break;
				case 2: case 6: drop(I_N, intX_a, intY_a); break;
				case 4: drop(I_S, intX_a, intY_a); break;
				default: drop(I_1, intX_a, intY_a); break;
			}
		}
		else if (intKd_a === K_HUNTER)
		{
			drop(I_P, intX_a, intY_a);
		}
		else if ((intKd_a !== K_MINE) && (rnd(40) === 0))
		{
			drop(I_P, intX_a, intY_a);
		}
		// the second time round they shoot back as they go
		if ((loopN > 1) && alive && (intKd_a !== K_MINE)) { shoot(intX_a, intY_a, aim(intX_a, intY_a, pwx >> 4, psy), 24, G.S_BSMALL, PL_PINK); }
		boom(intX_a, intY_a, kbig[intKd_a]);
		if (kbig[intKd_a]) { m_objSound.play(1, 31, 0, 15, 30, true); }
		else { m_objSound.play(1, 20, 1, 13, 12, true); }
	}

	// an explosion in a free record (none free: none)
	// an explosion in a free record (none free: none) - its sprite plays once through
	function boom(intX_a, intY_a, intBig_a)
	{
		var intM, blnDone = false;
		for (intM = 0; (intM < NE) && !blnDone; intM++)
		{
			if (ek[intM] === 0)
			{
				ek[intM] = intBig_a ? K_BIGBOOM : K_BOOM;
				ex[intM] = intX_a * 16; ey[intM] = intY_a * 16; et[intM] = 0; ews[intM] = 0;
				if (intBig_a) { spr(SP_EN + intM * 2, intX_a - cam + 16, intY_a + 16, 'boom', 0, PL_FIRE, 2); }
				else { spr(SP_EN + intM * 2, intX_a - cam + 24, intY_a + 24, 'boom', 0, PL_FIRE); }
				m_objSlots.animate(SP_EN + intM * 2, 1, true);
				blnDone = true;
			}
		}
	}

	function shoot(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPl_a)
	{
		if (alive && onPaper(intX_a)) { bulBurst(intX_a, intY_a, 1, intA_a, 0, intSpd_a + spdAdd, intPat_a, intPl_a); }
	}

	// n bullets aimed at you, step apart
	function fan(intX_a, intY_a, intN_a, intStp_a, intSpd_a, intPat_a, intPl_a)
	{
		if (alive && onPaper(intX_a)) { bulBurst(intX_a, intY_a, intN_a, aim(intX_a, intY_a, pwx >> 4, psy) - (((intN_a - 1) * intStp_a) >> 1), intStp_a, intSpd_a, intPat_a, intPl_a); }
	}

	// ====================================================================================================
	// PICKUPS

	function drop(intKind_a, intX_a, intY_a)
	{
		var intN, blnDone = false;
		for (intN = 0; (intN < NI) && !blnDone; intN++)
		{
			if (ik[intN] === 0)
			{
				ik[intN] = intKind_a; ix[intN] = intX_a * 16; iy[intN] = intY_a * 16; it[intN] = 0;
				blnDone = true;
			}
		}
	}

	// they bob where they are, blink before they go, and are yours when you touch them (JSprites'
	// collision: the pickup's box, 13 across and 10 down, with the ship's middle)
	// they bob where they are, blink before they go, and are yours when the ship's middle touches
	// the pickup's hit box (13 across and 10 down)
	function items()
	{
		var intN, intX, intY, intSN, blnGot;
		for (intN = 0; intN < NI; intN++)
		{
			if (ik[intN])
			{
				intSN = SP_ITEM + intN;
				it[intN]++;
				intX = (ix[intN] >> 4) - cam;
				intY = (iy[intN] >> 4) + ((sin127(it[intN] * 4) >> 4) >> 1);
				spr(intSN, intX + 24, intY + 24, 'item', ik[intN], PL_ITEM);
				blnGot = (it[intN] <= 600) && alive && m_objSlots.collideRect(intSN, psx + 31.5, psy + 31.5, 1, 1);
				if (it[intN] > 600)
				{
					ik[intN] = 0; m_objSlots.hide(intSN);
				}
				else if (blnGot)
				{
					pick(ik[intN]);
					ik[intN] = 0; m_objSlots.hide(intSN);
				}
				else if ((intX < -16 - m_intWL) || (intX > 271 + m_intWR) || ((it[intN] > 450) && ((it[intN] & 4) !== 0)))
				{
					m_objSlots.hide(intSN);
				}
			}
		}
	}

	function pick(intKind_a)
	{
		switch (intKind_a)
		{
			case I_P:
				if (power < 5) { power++; showPower(); } else { addScore(2000); }
				message2('POWER UP');
				break;
			case I_N:
				if (novas < 3) { novas++; showNovas(); } else { addScore(2000); }
				message2('NOVA');
				break;
			case I_S:
				if (speed < 3) { speed++; } else { addScore(2000); }
				message2('SPEED UP');
				break;
			default:
				lives++; showLives();
				message2('EXTRA SHIP');
				break;
		}
		msgT = 60;
		addScore(500);
		m_objSound.play(2, 30, -1, 14, 16, false);
	}

	// ====================================================================================================
	// THE GUARDIAN: 64 x 64, hunting you along the corridor; its whole body takes the dots, it fires
	// the level's own patterns, faster as it weakens

	function startBoss()
	{
		bossOn = 1; bossT = 0; bossDie = 0;
		bossMax = 500 + stage * 150 + (loopN - 1) * 300;
		bossHP = bossMax;
		bwx = ((pwx >> 4) > cam + 128) ? (cam - 40) : (cam + 296);
		bwy = 88; bvx = 0;
		bossPat = 'BOSS' + Math.min(stage, 4);
		bossPal = (stage <= 2) ? PL_BOSSA : PL_BOSSB;
		message('WARNING', 120);
		message2('GUARDIAN APPROACHING');
		m_objSound.play(2, 200, -2, 15, 60, false);
	}

	function bossUpdate()
	{
		var intX, intSx, intH, intPx, intN, blnRam;
		bossT++;
		intPx = pwx >> 4;
		m_blnBossTarget = false;
		if (bossDie > 0)
		{
			bossDying();
		}
		else
		{
			// it keeps a way off you across, and sways up and down
			intX = (intPx > bwx) ? (intPx - 100) : (intPx + 100);
			if (bwx < intX - 4) { bvx += 2; }
			else if (bwx > intX + 4) { bvx -= 2; }
			if (bvx > 40) { bvx = 40; }
			if (bvx < -40) { bvx = -40; }
			bwx += bvx >> 4;
			if (bwx < 40) { bwx = 40; }
			if (bwx > wid - 40) { bwx = wid - 40; }
			bwy = 88 + sinK(bossT * 2, 6);
			intSx = bwx - cam;
			// the dots: its body (a little smaller than its picture)
			intH = hits(19);
			if (intH) { bossHP -= intH; bossFl = 2; }
			if (bossHP <= 0)
			{
				bossDie = 1;
				addScore(20000 + stage * 10000);
				bulClear();
			}
			else
			{
				m_blnBossTarget = (intSx > 0) && (intSx < 256);
				// its patterns: the level's, quicker as it weakens
				intN = 3;
				if (bossHP < (bossMax >> 1)) { intN = 2; }
				if (bossHP < (bossMax >> 2)) { intN = 1; }
				if ((intSx > 8) && (intSx < 248) && alive)
				{
					switch (stage)
					{
						case 1:
							if (bossT % (24 * intN) === 0)
							{
								bulBurst(bwx - 22, bwy - 22, 10, bossT, 25, 16 + spdAdd, G.S_BSMALL, PL_PINK);
								bulBurst(bwx + 22, bwy + 22, 10, bossT + 12, 25, 16 + spdAdd, G.S_BSMALL, PL_PINK);
							}
							if (bossT % (40 * intN) === 20) { fan(bwx, bwy, 5, 10, 22, G.S_BBIG, PL_CYAN); }
							break;
						case 2:
							if ((bossT & 3) === 0) { bulBurst(bwx, bwy, 4, bossT * 3, 64, 18 + spdAdd, G.S_BDIAM, PL_YELLOW); }
							if (bossT % (60 * intN) === 0) { bulBurst(bwx, bwy - 26, 16, 0, 16, 12 + spdAdd, G.S_BBIG, PL_PINK); }
							break;
						case 3:
							if (bossT % (16 * intN) === 0) { bulBurst(bwx, bwy + 8, 18, bossT * 5, 14, 10 + spdAdd + (bossT & 7), G.S_BRING, PL_LIME); }
							if (bossT % 50 === 25) { fan(bwx, bwy, 3, 6, 34, G.S_BTINY, PL_YELLOW); }
							break;
						default:
							if ((bossT & 3) === 0)
							{
								bulBurst(bwx, bwy, 3, bossT * 7, 85, 18 + spdAdd, G.S_BSTAR, PL_PINK);
								bulBurst(bwx, bwy, 3, -bossT * 5, 85, 14 + spdAdd, G.S_BSMALL, PL_CYAN);
							}
							if (bossT % (45 * intN) === 0) { bulBurst(bwx, bwy, 20, bossT, 13, 10 + spdAdd, G.S_BBIG, PL_YELLOW); }
							break;
					}
				}
				drawBoss(intSx);
				// it rams you too: |bwx - px| < 30, |bwy - psy| < 28 - does its body touch a small box
				// (7 x 3) round the ship's middle?
				blnRam = alive && (inv === 0) && (intSx > -40) && (intSx < 296) && m_objSlots.collideRect(SP_BOSS, psx + 28.5, psy + 30.5, 7, 3);
				if (blnRam) { die(); }
			}
		}
	}

	function drawBoss(intSx_a)
	{
		var intRow;
		if ((intSx_a < -40 - m_intWL) || (intSx_a > 296 + m_intWR))
		{
			m_objSlots.hide(SP_BOSS);
		}
		else
		{
			intRow = bossPal;
			if (bossFl > 0) { bossFl--; intRow = PL_FLASH; }
			spr(SP_BOSS, intSx_a, bwy, bossPat, 1, intRow);
		}
	}

	function bossDying()
	{
		bossDie++;
		if ((bossDie & 3) === 0)
		{
			boom(bwx - 24 + rnd(48), bwy - 24 + rnd(48), rnd(2));
			m_objSound.play(1, 25 + rnd(10), 1, 15, 14, true);
		}
		if (bossDie & 2) { bossFl = 1; }
		drawBoss(bwx - cam);
		if (bossDie > 100)
		{
			bossOn = 0;
			m_objSlots.hide(SP_BOSS);
			boom(bwx, bwy, 1);
			cleared = 1;
		}
	}

	// ====================================================================================================
	// THE LOOPS

	// for the tests: where the game is
	this.state = function()
	{
		return { stage:stage, lives:lives, alive:alive, score:score, frames:frames, dots:dotsCount(), bullets:m_intBulLive, enemies:ealive,
			boss:bossOn, bossHP:bossHP, cleared:cleared, over:over, cam:cam, psx:psx, psy:psy, wi:wi, power:power, weapon:weapon, title:m_blnTitlePic, ms:Math.round(m_fltIterMs * 100) / 100, msmax:m_fltIterMax };
	};

	// for the tests: the dots flying (paper x, y, speeds)
	this.dots = function()
	{
		var arrR = [], intK, objS;
		for (intK = 0; intK < ND; intK++)
		{
			if (m_arrDOn[intK])
			{
				arrR.push([Math.round(m_objDots.getX(intK) - 32), Math.round(m_objDots.getY(intK) - 32), Math.round(m_arrDVX[intK] * 100) / 100, Math.round(m_arrDVY[intK] * 100) / 100, m_arrDLife[intK], m_objDots.getFrame(intK) - 1]);
			}
		}
		return arrR;
	};

	// for the tests: a stage started straight away, the guardian on, a ship that can't be hit
	this.cheat = function(strWhat_a, intN_a)
	{
		if (strWhat_a === 'god') { GOD = (intN_a !== 0); }
		if (strWhat_a === 'stage') { FIRST_STAGE = intN_a; }
		if (strWhat_a === 'boss') { wi = 99; waveT = 0; pn = 0; for (var intM = 0; intM < NE; intM++) { if (ek[intM] > 0) { remove(intM); } } startBoss(); }
		if (strWhat_a === 'power') { power = intN_a; showPower(); }
		if (strWhat_a === 'bosshp') { bossHP = intN_a; }
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
	// Next's paper (the right's counting the 8 the normal view has past it), the sprites' and dots'
	// clip windows to match
	function Wide()
	{
		var objV = m_objCanvas.getView();
		var intL = 0, intR = 0;
		// (only a view around the game's own: before the canvas is going, it's not yet)
		if ((objV.x <= VIEW.x) && (objV.y <= VIEW.y) && (objV.x + objV.w >= VIEW.x + VIEW.w) && (objV.y + objV.h >= VIEW.y + VIEW.h))
		{
			m_objView = objV;
			if (objV.w > VIEW.w)
			{
				intL = Math.min(VIEW.x - objV.x, WIDEMAX);
				intR = Math.min((objV.x + objV.w) - (GAMEX + 32 + 256), WIDEMAX);
			}
		}
		if ((intL !== m_intWL) || (intR !== m_intWR))
		{
			m_intWL = intL; m_intWR = intR;
			m_objSlots.setClip(32 - intL, 32, 256 + intL + intR, 176);
			m_objDots.setClip(32 - intL, 32, 256 + intL + intR, 176);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var objPic;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			objContext_a.save();
			objContext_a.beginPath();
			// (wide: the paper and the extra either side)
			objContext_a.rect(32 - m_intWL, 32, 256 + m_intWL + m_intWR, 176);
			objContext_a.clip();
			if (m_blnTitlePic)
			{
				// Layer 2: the title picture, faded
				objPic = m_objSprites.getImageByName('mpx_title');
				objContext_a.drawImage(objPic, 32, 32);
				if (m_intFade < 8)
				{
					objContext_a.fillStyle = 'rgba(0,0,0,' + (1 - m_intFade / 8) + ')';
					objContext_a.fillRect(32, 32, 256, 176);
				}
			}
			else if (m_objTerrain !== null)
			{
				m_objTerrain.paint(objContext_a, 32 - cam, 32);
				if (m_blnMsgRows)
				{
					objContext_a.fillStyle = '#000';
					objContext_a.fillRect(32 - m_intWL, 56, 256 + m_intWL + m_intWR, 8);
					objContext_a.fillRect(32 - m_intWL, 72, 256 + m_intWL + m_intWR, 8);
				}
			}
			objContext_a.restore();
			m_objText.paint(objContext_a, 0, 0);
			m_objDots.paint(objContext_a);
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	// the dots' colours: a strip of all 256 (RRRGGGBB, 2 x 2 each) at each fade level
	function dotImages()
	{
		var arrImages = [], intF, intC, objCan, objC, intR, intG, intB;
		for (intF = 0; intF <= 16; intF++)
		{
			objCan = document.createElement('canvas');
			objCan.width = 512; objCan.height = 2;
			objC = objCan.getContext('2d');
			for (intC = 0; intC < 256; intC++)
			{
				intR = Math.round(((intC >> 5) & 7) * 255 / 7);
				intG = Math.round(((intC >> 2) & 7) * 255 / 7);
				intB = Math.round((((intC & 3) << 1) | ((intC & 3) ? 1 : 0)) * 255 / 7);
				intR = fadeChannel(intR, intF); intG = fadeChannel(intG, intF); intB = fadeChannel(intB, intF);
				objC.fillStyle = 'rgb(' + intR + ',' + intG + ',' + intB + ')';
				objC.fillRect(intC * 2, 0, 2, 2);
			}
			arrImages.push({ name:'mpx_dots' + intF, classes:'mpx', source:objCan.toDataURL() });
		}
		return arrImages;
	}

	function fadeChannel(intV_a, intF_a)
	{
		return (intF_a <= 8) ? Math.round(intV_a * intF_a / 8) : Math.round(intV_a + (255 - intV_a) * (intF_a - 8) / 8);
	}

	// the kinds: life, score, box, big, sprite, palette, animation
	function kind(intKd_a, intHp_a, intSc_a, intW_a, intH_a, intBig_a, strPat_a, intPl_a, intAnim_a)
	{
		kanim[intKd_a] = intAnim_a;
		khp[intKd_a] = intHp_a; ksc[intKd_a] = intSc_a; kw[intKd_a] = intW_a; kh[intKd_a] = intH_a; kbig[intKd_a] = intBig_a;
		kpat[intKd_a] = strPat_a; kpal[intKd_a] = intPl_a;
	}

	// a library sprite: one of the sheet's sprites (gfxtool's name, or a pattern cell), what it does
	// on its own (its sequence and delay) and the part of it that counts in a collision (hbw x hbh
	// about its middle)
	function sprite(strName_a, strGfx_a, arrSequence_a, intDelay_a, fltHBW_a, fltHBH_a)
	{
		var objS = G.SPR[strGfx_a];
		m_objSet[strName_a] = objS.set;
		return { name:strName_a, classes:'mpx', imagename:'mpx_' + objS.set + '_0', x:0, y:0, w:objS.w, h:objS.h, imagex:objS.x, imagey:objS.y, imagew:objS.w, imageh:objS.h,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:fltHBW_a, hbh:fltHBH_a };
	}

	function patSprite(intPat_a)
	{
		var arrP = G.PAT.c[intPat_a];
		m_objSet['b' + intPat_a] = arrP[0];
		return { name:'b' + intPat_a, classes:'mpx', imagename:'mpx_' + arrP[0] + '_0', x:0, y:0, w:16, h:16, imagex:arrP[1], imagey:arrP[2], imagew:16, imageh:16,
			sequence:[1, 0], delay:1, collisiontype:'hb', hbx:0, hby:0, hbsize:1, hbw:1, hbh:1 };
	}

	var m_arrTitleControls, m_arrPlayControls;
	var GOD = false, FIRST_STAGE = 1;			// (for the tests, as the Next's: a ship that can't be hit, the first stage)

	this.run = function()
	{
		var arrImages = [], arrLib = [], intR, intN, intK;
		for (intR = 0; intR < 16; intR++)
		{
			arrImages.push({ name:'mpx_c_' + intR, classes:'mpx', source:'images/multiplex/spr_c_' + intR + '.png' });
			for (intN = 1; intN <= G.LEVELS; intN++)
			{
				arrImages.push({ name:'mpx_l' + intN + '_' + intR, classes:'mpx', source:'images/multiplex/spr_l' + intN + '_' + intR + '.png' });
			}
		}
		for (intR = 0; intR < 4; intR++)
		{
			arrImages.push({ name:'mpx_t' + intR, classes:'mpx', source:'images/multiplex/tiles_' + intR + '.png' });
		}
		for (intN = 1; intN <= G.LEVELS; intN++)
		{
			arrImages.push({ name:'mpx_tl' + intN, classes:'mpx', source:'images/multiplex/tiles_l' + intN + '.png' });
		}
		arrImages.push({ name:'mpx_title', classes:'mpx', source:'images/multiplex/title.png' });
		arrImages = arrImages.concat(dotImages());
		m_objSprites.addImagesToLibrary(arrImages);
		// what each sprite does on its own and what of it counts in a collision
		arrLib = [
			sprite('ship', 'SHIP', [1, 2, -1], 2, 9, 7),				// engines flickering; hit within 4 across, 3 down
			sprite('item', 'ITEMP', [1, 0], 1, 27, 21),				// (frame: its kind)
			sprite('spark', 'SPARK', [1, 1, 1, 0], 1, 0, 0),			// three frames, then gone
			sprite('boom', 'BOOM', [1, 2, 3, 4, 0], 4, 0, 0),			// once through, then gone
			sprite('warp', 'WARPS', [4, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 0], 1, 0, 0),
			{ name:'dot', classes:'mpx', imagename:'mpx_dots8', x:0, y:0, w:2, h:2, imagex:0, imagey:0, imagew:2, imageh:2, sequence:[1, 0], delay:1, collisiontype:'bb' } ];
		m_objSet.dot = '';
		for (intK = 1; intK <= 4; intK++)
		{
			arrLib.push(sprite('BOSS' + intK, 'BOSS' + intK, [1, 0], 1, 52, 52));		// its body takes the dots
		}
		processArray([G.S_BSMALL, G.S_BBIG, G.S_BDIAM, G.S_BSTAR, G.S_BRING, G.S_BTINY], function(intPat_a) { arrLib.push(patSprite(intPat_a)); });
		m_objSlots.setClip(32, 32, 256, 176);			// (the Next's sprite clip window: the paper)
		m_objDots.setClip(32, 32, 256, 176);
		for (intK = 0; intK < 20; intK++) { m_arrHit[intK] = 0; }
		for (intK = 0; intK < NE; intK++) { m_arrTargetOn[intK] = false; }
		kind(K_DART, 2, 100, 6, 4, 0, 'DART', PL_RED, 1);
		kind(K_ORB, 6, 200, 6, 6, 0, 'ORB', PL_GREEN, 1);
		kind(K_SPIN, 12, 400, 7, 7, 0, 'SPIN', PL_PURPLE, 1);
		kind(K_SWARM, 1, 50, 5, 4, 0, 'SWARM', PL_FIRE, 1);
		kind(K_MINER, 10, 300, 7, 5, 0, 'MINER', PL_FIRE, 1);
		kind(K_TURRET, 10, 300, 7, 6, 0, 'TURRET', PL_STEEL, 3);
		kind(K_HUNTER, 60, 2000, 14, 10, 1, 'HUNTER', PL_RED, 2);
		kind(K_CARRIER, 40, 1000, 14, 9, 1, 'CARRIER', PL_PURPLE, 2);
		kind(K_SNIPER, 8, 300, 7, 5, 0, 'SNIPER', PL_GREEN, 1);
		kind(K_MINE, 2, 20, 5, 5, 0, 'MINE', PL_RED, 1);
		// each kind: its sprite, two frames in a loop (or the frame move picks), and its box for the
		// dots: (kw + 2) x (kh + 2) each way of its middle
		for (intK = K_DART; intK <= K_MINE; intK++)
		{
			arrLib.push(sprite('k' + intK, kpat[intK], (kanim[intK] === 3) ? [1, 0] : [1, 2, -1, 2, 1, -4], 4, (kw[intK] + 2) * 2, (kh[intK] + 2) * 2));
		}
		m_objSprites.addSpritesToLibrary(arrLib);
		m_objText = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['mpx_t0', 'mpx_t1', 'mpx_t2', 'mpx_t3', 'mpx_tl1'], first:0, firstcode:0, transparent:0 });
		m_arrTitleControls = [];			// (a tap anywhere plays)
		m_arrPlayControls = [
			{ type:'dpad', x:VIEW.x + 32, y:179, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:186, size:22, key:V_FIRE, label:'FIRE' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:144, size:18, key:V_POD, label:'PATTERN' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:107, size:18, key:V_BOMB, label:'NOVA' },
			{ type:'button', x:VIEW.x + VIEW.w - 32, y:62, size:13, key:K_H, label:'PAUSE' }
		];
		m_objPad = new JPad({ controls:m_arrTitleControls,
			gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:V_FIRE, fire2:V_POD, fire3:V_BOMB } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('mpx'), function()
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

var g_objGame = new multiplexGame();
g_objGame.run();
