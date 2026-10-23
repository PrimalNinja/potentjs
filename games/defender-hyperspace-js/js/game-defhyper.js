// DEFENDER HYPERSPACE - ported from the ZX Spectrum Next game (NTC BASIC: Main.bas, Bul.cls,
// Land.cls). A Defender done the Stargate way.
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The planet is 2048 pixels round. Landers come down for the ten humanoids and carry them up: get
// one to the top and it turns mutant. Shoot a lander carrying someone and they fall: catch them
// (as many as you like) and set them down. Lose them all and the planet blows up. Bombers lay
// mines, pods burst into swarmers, firebombers throw fireballs, dynamos shed space hums, guppies
// swarm; take too long and the baiters, Phred and Big Red come. The Stargate takes you to a
// humanoid in trouble, or with four aboard (flying right, before wave 10) warps you three waves on.
// Inviso: a cloak nothing can hurt, that kills what it touches.
//
// Keys: Q A (or the up / down arrows, or 7 6) up and down, O P (the left / right arrows, 5 8) turn
// and thrust, Space or M laser, B or Enter smart bomb, I or N Inviso (hold), H hyperspace. Touch:
// the pad on the left; FIRE, BOMB, INV, HYPER on the right. A game pad: the stick, A fire, B bomb.
//
// As on the Next: the planet is Layer 2 (a JPixelScreen: the stars scrolled at a quarter of the
// mountains' speed, as the copper does), the scanner and the panel are the tilemap (a JTileGrid).
// Everything that moves is a sprite: JSpriteSlots numbered as the Next's hardware sprites (the
// later on top). A library sprite is what a thing is - its animation loops (sequence, delay), its
// hit box sized to the original's test; the game says what each is doing (flying, thrusting,
// walking, held, exploding) and asks what touches what. Bul.cls - the enemy bullets and the laser
// shots, moved and checked in Z80 there - is two pools of slots moved with one showRange call
// each, their places from the Z80's own fixed-point sums; the laser's targets (Bul.Box) are zones
// the shots are asked about (collideRect).
function defhyperGame()
{
	var m_objThis = this;
	var G = GFX_DEFHYPER;

	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:88, y:8, w:272, h:224 };		// the part of the screen the game uses: the canvas shows only this
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_SPACE = 32, K_M = 77, K_B = 66, K_ENTER = 13, K_I = 73, K_N = 78, K_H = 72;
	var K_5 = 53, K_6 = 54, K_7 = 55, K_8 = 56;

	var WORLD = 2048, HALF = 1024;
	var NU = 32, NP = 10, NB = 8, NBOX = 24, NEB = 52, NSH = 22;
	var K_LANDER = 1, K_MUTANT = 2, K_BOMBER = 3, K_POD = 4, K_SWARM = 5, K_BAITER = 6, K_FIREB = 7;
	var K_FIREBALL = 8, K_DYNAMO = 9, K_HUM = 10, K_GUPPY = 11, K_PHRED = 12, K_BIGRED = 13, K_MUNCH = 14;
	var YTOP = 44, YLOW = 176, GY = 177;
	var PINK = 2, BLUE = 3;
	var GATEX = 1500, GATEY = 84;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objL2 = new JPixelScreen({ w:256, h:192 });
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	var m_strState = 'loading';

	// the enemies: kind, x, y, x speed (8ths), y speed, a timer, who they've got, when they fire
	// next, x's 8ths, their box, the humanoid in their sights
	var uk = [], ux = [], uy = [], uvx = [], uvy = [], ut = [], ug = [], uf = [], ufr = [], ub = [], utg = [];
	var scR = [], scS = [], q = [];
	// the humanoids: 0 gone, 1 walking, 2 carried up, 3 falling, 4 aboard; x, y, way, fall speed,
	// where they fell from, their box, their place aboard
	var ps = [], px = [], py = [], pd = [], pv = [], pf = [], pb = [], pa = [];
	var bo = [];
	var bx = [], by = [], bt = [], bnext = 0;
	var hx = 0, hy = 0, hvx = 0, face = 1, alive = 0, safe = 0, deadT = 0, cool = 0;
	var smart = 0, smartT = 0, smartWas = 0, hyperWas = 0, hyperT = 0, thrust = 0;
	var aboard = 0, catches = 0, cloak = 0, cloakOn = 0, gateT = 0, warp = 0;
	var camX = 0, pan = 0;
	var score = 0, hiscore = 21270, lives = 0, wave = 0, over = 0, nextLife = 0;
	var frames = 0, msgT = 0, scoreDirty = 0, waveT = 0, planetGone = 0;
	var chaser = 0, att = 0, tc = 0, me = 0;
	var sn2 = [], sn4 = [], sn24 = [], sn32 = [], scC = [], scD = [];
	var m_intT = 0, m_intPage = 0, m_intClearT = 0;

	// ====================================================================================================
	// BASIC AS NTC DOES IT

	function idiv(intA_a, intB_a)
	{
		var fltQ = intA_a / intB_a;
		return (fltQ < 0) ? Math.ceil(fltQ) : Math.floor(fltQ);
	}

	function sgn(int_a)
	{
		return (int_a > 0) ? 1 : ((int_a < 0) ? -1 : 0);
	}

	function trimStr(int_a)
	{
		return String(int_a);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a !== 0);
	}

	// ====================================================================================================
	// KEYS

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function fireDown()
	{
		return down(K_SPACE) || down(K_M);
	}

	// ====================================================================================================
	// THE WORLD JOINS UP END TO END

	function Sx(intX_a)
	{
		return ((intX_a - camX + WORLD + HALF) & (WORLD - 1)) - HALF;
	}

	function Dif(intA_a, intB_a)
	{
		return ((intB_a - intA_a + WORLD + HALF) & (WORLD - 1)) - HALF;
	}

	function Wrap(intX_a)
	{
		return (intX_a + WORLD) & (WORLD - 1);
	}

	function Tick()
	{
		frames = (frames + 1) & 0x7FFF;
	}

	// ====================================================================================================
	// THE SPRITES: JSpriteSlots numbered as the Next's - the ship (0-1), the enemies (2-33), the
	// humanoids (34-43), the explosions (44-51), the scanner's window (52), the Stargate (53), the
	// bullets (54-105) and the laser shots (106-127). A library sprite is what a thing is: its frames
	// (frame n of a strip is pattern n - 1), its animation loops (sequence, delay) and its hit box
	// (sized to the original's tests); the game says what each is doing and asks what touches what

	var m_objSlots = null;
	var m_intShipID = 0, m_intWinID = 52, m_intGateID = 53;
	var m_arrUfoIDs = [], m_arrPeopleIDs = [], m_arrBoomIDs = [], m_arrEbIDs = [], m_arrShotIDs = [];
	var SEQ = {};
	var m_objPose = {}, m_arrName = [], m_arrStep = [], m_arrAnim = [], m_arrFrame = [], m_arrStart = [];
	// the image each kind is drawn from: the mixed strip (a mutant's and the Stargate's second
	// frames in their other colours), or a palette row
	var IMG_MIX = 'defhyper_pmix';

	function img(intRow_a)
	{
		return 'defhyper_p' + intRow_a;
	}

	function range(intFirst_a, intCount_a)
	{
		var arrR = [];
		for (var intI = 0; intI < intCount_a; intI++) { arrR.push(intFirst_a + intI); }
		return arrR;
	}

	// what a sprite is doing now (a library sprite and the loop of its sequence that does it); it
	// starts when that's a change
	function Pose(intID_a, objPart_a)
	{
		if (m_objPose[intID_a] !== objPart_a)
		{
			m_objPose[intID_a] = objPart_a;
			m_arrStart[intID_a] = true;
		}
		m_arrName[intID_a] = objPart_a.name;
		m_arrStep[intID_a] = objPart_a.step;
		m_arrAnim[intID_a] = true;
	}

	// a sprite held on a pattern (a bullet, a still one in the title)
	function Still(intID_a, intPattern_a)
	{
		m_objPose[intID_a] = null;
		m_arrName[intID_a] = (m_arrEbIDs.indexOf(intID_a) >= 0) ? 'eb' : ((intID_a === m_intWinID) ? 'win' : 'strip');
		m_arrFrame[intID_a] = intPattern_a + 1;
		m_arrAnim[intID_a] = false;
	}

	// Spr.Put: the sprite's top left on the 320 x 256 picture, its look (image, mirrored)
	function Put(intID_a, intX_a, intY_a, strImage_a, blnMirror_a)
	{
		m_objSlots.put(intID_a, intX_a, intY_a, m_arrName[intID_a], m_arrAnim[intID_a] ? undefined : m_arrFrame[intID_a], strImage_a, 1, blnMirror_a ? SPRITE_MIRRORX : 0);
		if (m_arrAnim[intID_a] && m_arrStart[intID_a])
		{
			m_arrStart[intID_a] = false;
			m_objSlots.animate(intID_a, m_arrStep[intID_a], true);
		}
	}

	// a sprite where it is now (shown: what it touches is asked next)
	function At(intID_a, intX_a, intY_a)
	{
		m_objSlots.move(intID_a, intX_a, intY_a);
	}

	function Hide(intID_a)
	{
		m_objSlots.hide(intID_a);
	}

	function HideAll()
	{
		m_objSlots.hideRange(0, 128);
	}

	function makeSprites()
	{
		var arrLib = [];
		var intI;
		// a strip sprite: frame n is pattern n - 1; a hit box hbw x hbh about its middle (hby: twice
		// the offset, as JSprites halves it)
		function lib(strName_a, intW_a, intH_a, intImageX_a, intImageW_a, arrSeq_a, intDelay_a, intHBW_a, intHBH_a, intHBY_a)
		{
			arrLib.push({ name:strName_a, classes:'dh', imagename:IMG_MIX, x:0, y:0, w:intW_a, h:intH_a,
				imagex:intImageX_a, imagey:0, imagew:intImageW_a, imageh:16, sequence:arrSeq_a, delay:intDelay_a,
				collisiontype:'hb', hbx:0, hby:(intHBY_a === undefined) ? 0 : intHBY_a, hbsize:0, hbw:intHBW_a, hbh:intHBH_a });
		}
		function part(strName_a, intStep_a)
		{
			return { name:strName_a, step:intStep_a };
		}
		// the ship: still (step 1) or thrusting (step 3); it touches an enemy within 14 across, 8 down
		lib('ship', 32, 16, G_S.SHIP * 16, 32, [1, 0, 2, 3, -3], 2, 28, 16);
		SEQ.SHIP = part('ship', 1);
		SEQ.THRUST = part('ship', 3);
		// the enemies flap (Main.bas's "S_X - ((ut And n) <> 0)": a pattern every n frames); each is a
		// point (the ship's box is the test)
		processArray([[K_LANDER, 'LANDER', 8], [K_MUTANT, 'MUTANT', 4], [K_BOMBER, 'BOMBER', 8], [K_POD, 'POD', 8], [K_SWARM, 'SWARMER', 4],
			[K_BAITER, 'BAITER', 4], [K_FIREB, 'FIREB', 4], [K_FIREBALL, 'FIREBALL', 2], [K_DYNAMO, 'DYNAMO', 8], [K_HUM, 'HUM', 2],
			[K_GUPPY, 'GUPPY', 4], [K_PHRED, 'PHRED', 4], [K_MUNCH, 'MUNCHIE', 4]], function(arr_a)
		{
			lib('k' + arr_a[0], 16, 16, 0, 16, [G_S[arr_a[1]] + 1, G_S[arr_a[1]] + 2, -1], arr_a[2], 0, 0);
			SEQ[arr_a[0]] = part('k' + arr_a[0], 1);
			// the title's cast: every 8 frames
			lib('t' + arr_a[0], 16, 16, 0, 16, [G_S[arr_a[1]] + 1, G_S[arr_a[1]] + 2, -1], 8, 0, 0);
		});
		SEQ[K_BIGRED] = SEQ[K_PHRED];
		SEQ.TITLE = {};
		processArray([K_LANDER, K_MUTANT, K_POD, K_FIREB, K_DYNAMO, K_GUPPY, K_PHRED], function(intK_a) { SEQ.TITLE[intK_a] = part('t' + intK_a, 1); });
		// a humanoid walks (step 1) or is held (step 4); caught within 14 across and 12 down of 10
		// above its middle
		lib('human', 16, 16, 0, 16, [G_S.HUMAN + 1, G_S.HUMAN + 2, -1, G_S.HUMAN + 3, 0], 8, 0, 8, -20);
		SEQ.WALK = part('human', 1);
		SEQ.HELD = part('human', 4);
		// an explosion: once through
		lib('boom', 16, 16, 0, 16, [G_S.BOOM + 1, G_S.BOOM + 2, G_S.BOOM + 3, G_S.BOOM + 4, 0], 4, 0, 0);
		SEQ.BOOM = part('boom', 1);
		// the Stargate (step 1) or hyperspace's stars (step 4): it takes you within 12 of its middle
		lib('gate', 32, 32, 0, 16, [G_S.GATE + 1, G_S.GATE + 2, -1, G_S.STARS + 1, 0], 4, 25, 25);
		SEQ.GATE = part('gate', 1);
		SEQ.STARS = part('gate', 4);
		lib('win', 32, 16, 0, 16, [1, 0], 1, 0, 0);
		lib('strip', 16, 16, 0, 16, [1, 0], 1, 0, 0);
		// an enemy bullet: it hits within 3 of the ship's middle (4 x 4 each)
		lib('eb', 16, 16, 0, 16, [1, 0], 1, 4, 4);
		m_objSprites.addSpritesToLibrary(arrLib);
		m_objSlots = new JSpriteSlots(m_objSprites, 128);
		m_arrUfoIDs = range(2, NU);
		m_arrPeopleIDs = range(34, NP);
		m_arrBoomIDs = range(44, NB);
		m_arrEbIDs = range(54, NEB);
		m_arrShotIDs = range(106, NSH);
		Still(m_intWinID, G_S.WINDOW);
	}

	// the patterns' numbers (GfxData.cls's S_ constants: the order gfxtool gives them)
	var G_S = {};
	function patterns()
	{
		var intN = 0;
		// the layout's order: each sprite's frames x its width in cells
		processArray(['SHIP', 'LASER', 'HUMAN', 'GATE', 'STARS', 'WINDOW', 'MINE', 'LANDER', 'MUTANT', 'BOMBER', 'POD', 'SWARMER', 'BAITER',
			'FIREB', 'FIREBALL', 'DYNAMO', 'HUM', 'GUPPY', 'PHRED', 'MUNCHIE', 'BULLET', 'BOOM'], function(strName_a)
		{
			var objS = G['S_' + strName_a];
			G_S[strName_a] = intN;
			intN += objS.frames * objS.w;
		});
	}

	// ====================================================================================================
	// BUL.CLS: THE ENEMY BULLETS AND THE LASER SHOTS

	// the sines: 256 steps round, x 127
	var SIN = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3];
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];
	// enemy bullets: on, x and y in 256ths of a pixel (x carries the screen: -2 .. 2 screens), speeds, pattern, palette
	var ebOn = [], ebX = [], ebY = [], ebVX = [], ebVY = [], ebPat = [], ebPal = [];
	// laser shots: on, x, y (the paper's), speeds, pattern
	var shOn = [], shX = [], shY = [], shVX = [], shVY = [], shPat = [];
	// the target boxes: on, hits
	var boxOn = [], boxHits = [];
	var m_blnHit = false, m_blnSpark = false, m_intBlo = -2008, m_intBhi = 2263;

	function sine(intA_a)
	{
		var intA = intA_a & 255;
		return (intA < 128) ? SIN[intA] : -SIN[intA - 128];
	}

	// Bul.Reset: no bullets, no shots, no boxes
	var bxX = [], bxY = [], bxW = [], bxH = [];

	function BulReset()
	{
		for (var intI = 0; intI < NEB; intI++) { ebOn[intI] = 0; ebX[intI] = 0; ebY[intI] = 0; }
		for (intI = 0; intI < NSH; intI++) { shOn[intI] = 0; }
		for (intI = 0; intI < NBOX; intI++) { boxOn[intI] = 0; boxHits[intI] = 0; }
		m_objSlots.hideRange(m_arrEbIDs[0], NEB);
		m_objSlots.hideRange(m_arrShotIDs[0], NSH);
	}

	// Bul.Clear: every enemy bullet gone; how many there were
	function BulClear()
	{
		var intN = 0;
		for (var intI = 0; intI < NEB; intI++)
		{
			if (ebOn[intI] !== 0) { intN++; }
			ebOn[intI] = 0;
		}
		m_objSlots.hideRange(m_arrEbIDs[0], NEB);
		return intN;
	}

	// Bul.Fire x, y, a, spd, pat, pal: way a (0 down, 64 right ...), spd 16ths of a pixel a frame
	function BulFire(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPal_a)
	{
		var blnDone = false;
		for (var intI = 0; (intI < NEB) && !blnDone; intI++)
		{
			if (ebOn[intI] === 0)
			{
				ebOn[intI] = 1;
				ebX[intI] = (intX_a & 255) * 256 + 128;
				ebY[intI] = (intY_a & 255) * 256 + 128;
				// sin * spd / 8 as the Z80 does it: the size multiplied, shifted, the sign put back
				ebVX[intI] = sgn(sine(intA_a)) * ((Math.abs(sine(intA_a)) * (intSpd_a & 255)) >> 3);
				ebVY[intI] = sgn(sine(intA_a + 64)) * ((Math.abs(sine(intA_a + 64)) * (intSpd_a & 255)) >> 3);
				ebPat[intI] = intPat_a; ebPal[intI] = intPal_a;
				// its look; shown from its first move
				Still(m_arrEbIDs[intI], intPat_a);
				Put(m_arrEbIDs[intI], (intX_a & 255) + 24, (intY_a & 255) + 24, img(intPal_a), false);
				Hide(m_arrEbIDs[intI]);
				blnDone = true;
			}
		}
	}

	// Bul.Shot x, y, vx, vy, pat: a laser shot
	function BulShot(intX_a, intY_a, intVX_a, intVY_a, intPat_a)
	{
		var blnDone = false;
		for (var intI = 0; (intI < NSH) && !blnDone; intI++)
		{
			if (shOn[intI] === 0)
			{
				shOn[intI] = 1;
				shX[intI] = intX_a & 255; shY[intI] = intY_a & 255; shVX[intI] = intVX_a; shVY[intI] = intVY_a; shPat[intI] = intPat_a;
				Still(m_arrShotIDs[intI], intPat_a);
				Put(m_arrShotIDs[intI], shX[intI] + 24, shY[intI] + 24, IMG_MIX, intVX_a < 0);
				Hide(m_arrShotIDs[intI]);
				blnDone = true;
			}
		}
	}

	// Bul.Box n, x, y, hw, hh: target box n this frame, centred at x, y (a zone the shots touch)
	function BulBox(intN_a, intX_a, intY_a, intHW_a, intHH_a)
	{
		boxOn[intN_a] = 1;
		bxX[intN_a] = intX_a & 255; bxY[intN_a] = intY_a & 255; bxW[intN_a] = intHW_a & 255; bxH[intN_a] = intHH_a & 255;
	}

	function BulOff(intN_a)
	{
		boxOn[intN_a] = 0;
	}

	function BulHits(intN_a)
	{
		var intResult = boxHits[intN_a];
		boxHits[intN_a] = 0;
		return intResult;
	}

	function BulAim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a, intAX = Math.abs(intDX), intAY = Math.abs(intDY), intT, intResult = 0;
		if ((intAX !== 0) || (intAY !== 0))
		{
			if (intAX <= intAY) { intT = ATN[idiv(intAX * 16, intAY)]; } else { intT = 64 - ATN[idiv(intAY * 16, intAX)]; }
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

	// Bul.Step px, py, pan: the bullet pattern and the laser shots moved (the view moved pan pixels)
	// - one showRange each, every one's place from its own sums - then what they touch
	function BulStep(intPX_a, intPY_a, intPan_a)
	{
		var intI, intB;
		m_blnHit = false; m_blnSpark = false;
		// the enemy bullets: each its own straight line in 256ths of a pixel and the ground's pan;
		// gone past two screens, or above row 36 or from row 188
		m_objSlots.showRange(m_arrEbIDs[0], NEB, function(intI_a)
		{
			var intScreen;
			if (ebOn[intI_a] !== 0)
			{
				ebX[intI_a] += ebVX[intI_a] - intPan_a * 256;
				intScreen = Math.floor(ebX[intI_a] / 65536);
				ebY[intI_a] = (ebY[intI_a] + ebVY[intI_a]) & 0xFFFF;
				if ((intScreen < -2) || (intScreen > 2) || (Math.floor(ebX[intI_a] / 256) < m_intBlo) || (Math.floor(ebX[intI_a] / 256) > m_intBhi) || ((ebY[intI_a] >> 8) < 36) || ((ebY[intI_a] >> 8) >= 188))
				{
					ebOn[intI_a] = 0;
				}
			}
			return Math.floor(ebX[intI_a] / 256) + 24;
		}, function(intI_a)
		{
			return (ebY[intI_a] >> 8) + 24;
		});
		for (intI = 0; intI < NEB; intI++)
		{
			intB = Math.floor(ebX[intI] / 256);
			// on the screen (not past its edges): drawn, and does it touch the ship's middle?
			if ((ebOn[intI] !== 0) && (intB >= 4) && (intB < 252))
			{
				if (m_objSlots.collideRect(m_arrEbIDs[intI], intPX_a + 30, intPY_a + 30, 4, 4)) { m_blnHit = true; }
			}
			else
			{
				Hide(m_arrEbIDs[intI]);
			}
		}
		// the laser shots: vx across (less the pan), vy down; gone off the paper; a hit on the first
		// target box it touches
		m_objSlots.showRange(m_arrShotIDs[0], NSH, function(intI_a)
		{
			if (shOn[intI_a] !== 0) { shX[intI_a] += shVX[intI_a] - intPan_a; }
			return shX[intI_a] + 24;
		}, function(intI_a)
		{
			if (shOn[intI_a] !== 0) { shY[intI_a] += shVY[intI_a]; }
			return shY[intI_a] + 24;
		});
		for (intI = 0; intI < NSH; intI++)
		{
			if (shOn[intI] !== 0)
			{
				if ((shX[intI] < 4) || (shX[intI] >= 252) || (shY[intI] < 36) || (shY[intI] >= 188))
				{
					shOn[intI] = 0;
				}
				else
				{
					for (intB = 0; (intB < NBOX) && (shOn[intI] !== 0); intB++)
					{
						if ((boxOn[intB] !== 0) && m_objSlots.collideRect(m_arrShotIDs[intI], bxX[intB] + 32 - bxW[intB], bxY[intB] + 32 - bxH[intB], bxW[intB] * 2, bxH[intB] * 2))
						{
							if (boxHits[intB] < 255) { boxHits[intB]++; }
							m_blnSpark = true;
							shOn[intI] = 0;
						}
					}
				}
			}
			if (shOn[intI] === 0) { Hide(m_arrShotIDs[intI]); }
		}
	}

	// ====================================================================================================
	// THE PANEL AND THE SCANNER

	function Text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function Rect(intX_a, intY_a, intW_a, intH_a, intT_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, intT_a, 0);
	}

	function Hud()
	{
		m_objGrid.clear(0, 0);
		Rect(0, 0, 40, 4, G.T_HUD);
		Rect(4, 4, 32, 1, G.T_SCANT);
		Rect(4, 5, 32, 2, G.T_SCAN);
		Rect(4, 7, 32, 1, G.T_SCANG);
		Rect(3, 4, 1, 4, G.T_SCANS);
		Rect(36, 4, 1, 4, G.T_SCANS);
		Text(4, 1, 'SCORE');
		Text(19, 1, 'HI ' + rightStr('000000' + trimStr(hiscore), 7));
		Text(30, 1, 'WAVE ' + trimStr(wave));
		Text(20, 2, 'INV');
		ShowScore();
		ShowLives();
		ShowCloak();
	}

	function ShowScore()
	{
		Text(10, 1, rightStr('000000' + trimStr(score), 7));
		scoreDirty = 0;
	}

	function ShowLives()
	{
		for (var intK = 0; intK <= 5; intK++)
		{
			m_objGrid.put(4 + intK, 2, (intK < lives) ? G.T_LIFE : G.T_HUD, 0);
			m_objGrid.put(12 + intK, 2, (intK < smart) ? G.T_SMART : G.T_HUD, 0);
		}
	}

	function ShowCloak()
	{
		var intN = idiv(cloak + 39, 40);
		for (var intK = 0; intK <= 9; intK++)
		{
			m_objGrid.put(24 + intK, 2, (intK < intN) ? G.T_INV : G.T_INVE, 0);
		}
	}

	function AddScore(intN_a)
	{
		score += intN_a;
		scoreDirty = 1;
		if (score >= nextLife)
		{
			nextLife += 10000;
			lives++; smart++;
			cloak = Math.min(400, cloak + 120);
			ShowLives(); ShowCloak();
			sfx(1, 60, -1, 14, 30, 0);
		}
	}

	function Message(str_a, intY_a, intT_a)
	{
		Rect(4, intY_a, 32, 1, 0);
		Text(4 + idiv(32 - str_a.length, 2), intY_a, str_a);
		if (intT_a !== 0) { msgT = intT_a; }
	}

	function ClearMessages()
	{
		Rect(4, 9, 32, 18, 0);
	}

	// the scanner: the whole planet in 256 pixels, you in the middle; every 4th frame
	function Scanner()
	{
		var intN, intBase;
		if ((frames & 3) === 1)
		{
			Rect(4, 5, 32, 2, G.T_SCAN);
			Rect(4, 7, 32, 1, G.T_SCANG);
			intBase = Wrap(me - HALF);
			Dot(intBase, GATEX, GATEY, 4);
			for (intN = 0; intN < NP; intN++)
			{
				if ((ps[intN] > 0) && (ps[intN] < 4)) { Dot(intBase, px[intN], py[intN], 3); }
			}
			for (intN = 0; intN < NU; intN++)
			{
				if (uk[intN] === K_LANDER)
				{
					Dot(intBase, ux[intN], uy[intN], 1);
				}
				else if (uk[intN] !== 0)
				{
					Dot(intBase, ux[intN], uy[intN], 0);
				}
			}
			if (alive !== 0) { Dot(intBase, me, hy, 2); }
			Put(m_intWinID, idiv((camX - intBase) & (WORLD - 1), 8) + 32, 44, IMG_MIX, false);
		}
	}

	function Dot(intBase_a, intX_a, intY_a, intC_a)
	{
		var intR = idiv((intX_a - intBase_a) & (WORLD - 1), 16), intY = intY_a & 255;
		m_objGrid.put(scC[intR], scR[intY], G.T_DOT + intC_a * 12 + scS[intY] + scD[intR], 0);
	}

	// ====================================================================================================
	// THE PLANET (Land.cls): Layer 2's column (x And 255) holds world x, drawn as it comes into view

	var m_blnLandDead = false, m_blnLandReady = false, m_intLandCam = 0, m_intSkyScroll = 0, m_intLandScroll = 0;

	function LandInit()
	{
		m_objL2.clear(0);
		// the stars (x, y, colour)
		for (var intK = 0; intK < 70; intK++)
		{
			m_objL2.plot(DEFHYPER_STARS[intK * 3], DEFHYPER_STARS[intK * 3 + 1], DEFHYPER_STARS[intK * 3 + 2]);
		}
		m_blnLandDead = false; m_blnLandReady = false;
	}

	function LandKill(intD_a)
	{
		m_blnLandDead = (intD_a !== 0); m_blnLandReady = false;
	}

	function LandHeight(intWX_a)
	{
		return DEFHYPER_LAND[intWX_a & 2047];
	}

	// one column: rows 128-191, the line between this x's height and the next's (2 pixels thick)
	function LandCol(intWX_a)
	{
		var intX = intWX_a & 255, intB = LandHeight(intWX_a), intC = LandHeight(intWX_a + 1), intT, intRow;
		if (intB > intC) { intT = intB; intB = intC; intC = intT; }
		intC += 2;
		if (m_blnLandDead) { intB = 255; intC = 0; }
		for (intRow = 128; intRow < 192; intRow++)
		{
			m_objL2.plot(intX, intRow, ((intRow >= intB) && (intRow < intC)) ? 200 : 0);
		}
	}

	function LandView(intCX_a)
	{
		var intD, intK;
		if (!m_blnLandReady)
		{
			for (intK = 0; intK <= 255; intK++) { LandCol(intCX_a + intK); }
		}
		else
		{
			intD = (intCX_a - m_intLandCam) & 2047;
			if (intD >= 1024) { intD -= 2048; }
			if ((intD >= 256) || (intD <= -256))
			{
				for (intK = 0; intK <= 255; intK++) { LandCol(intCX_a + intK); }
			}
			else if (intD > 0)
			{
				for (intK = 256 - intD; intK <= 255; intK++) { LandCol(intCX_a + intK); }
			}
			else if (intD < 0)
			{
				for (intK = 0; intK <= -intD - 1; intK++) { LandCol(intCX_a + intK); }
			}
		}
		m_blnLandReady = true; m_intLandCam = intCX_a;
		m_intSkyScroll = idiv(intCX_a, 4) & 255;
		m_intLandScroll = intCX_a & 255;
	}

	// the stars twinkle: one of the three colours bright
	function Twinkle(intT_a)
	{
		m_objL2.setColour(73, 0x6D);
		m_objL2.setColour(109, 0x6D);
		m_objL2.setColour(182, 0x6D);
		switch (intT_a % 3)
		{
			case 0: m_objL2.setColour(73, 0xFF); break;
			case 1: m_objL2.setColour(109, 0xB6); break;
			default: m_objL2.setColour(182, 0xDB); break;
		}
	}

	// Layer 2's black (palette entry 0)
	function Black(intC_a)
	{
		m_objL2.setColour(0, intC_a);
	}

	// ====================================================================================================
	// THE TITLE

	function Cast(intN_a, intCX_a, intCY_a, intPat_a, intRow_a, blnMirror_a, str_a)
	{
		Still(m_arrUfoIDs[intN_a], intPat_a);
		Put(m_arrUfoIDs[intN_a], intCX_a * 8 - 4, intCY_a * 8 - 4, img(intRow_a), blnMirror_a);
		Text(intCX_a + 2, intCY_a, str_a);
	}

	function titleStart()
	{
		HideAll();
		BulReset();
		wave = 1; lives = 3; score = 0; smart = 3; cloak = 200; planetGone = 0;
		LandKill(0);
		Hud();
		m_intT = 0; m_intPage = 0; camX = 0; face = 1; hy = 100;
		m_strState = 'title';
	}

	function titlePage()
	{
		m_objSlots.hideRange(m_arrUfoIDs[0], 128 - m_arrUfoIDs[0]);
		ClearMessages();
		Message('D E F E N D E R', 9, 0);
		Message('H Y P E R S P A C E', 10, 0);
		if (m_intPage === 0)
		{
			Cast(0, 5, 13, G_S.LANDER, 0, false, 'LANDER    150');
			Cast(1, 5, 15, G_S.MUTANT, 0, false, 'MUTANT    150');
			Cast(2, 5, 17, G_S.BOMBER, 0, false, 'BOMBER    250');
			Cast(3, 5, 19, G_S.POD, 0, false, 'POD      1000');
			Cast(4, 5, 21, G_S.SWARMER, 0, false, 'SWARMER   150');
			Cast(5, 5, 23, G_S.BAITER, 0, false, 'BAITER    200');
			Cast(6, 5, 25, G_S.FIREB, 0, false, 'FIREBOMBER 250');
			Cast(7, 21, 13, G_S.FIREBALL, 0, false, 'FIREBALL 100');
			Cast(8, 21, 15, G_S.DYNAMO, 0, false, 'DYNAMO   200');
			Cast(9, 21, 17, G_S.HUM, 0, false, 'SPACE HUM 100');
			Cast(10, 21, 19, G_S.GUPPY, 0, false, 'GUPPY    200');
			Cast(11, 21, 21, G_S.PHRED, 0, false, 'PHRED    200');
			Cast(12, 21, 23, G_S.PHRED, 6, false, 'BIG RED  200');
			Cast(13, 21, 25, G_S.MUNCHIE, 0, false, 'MUNCHIE   50');
		}
		else
		{
			Message('QA UP/DOWN   OP LEFT/RIGHT', 13, 0);
			Message('(OR 5678, OR A JOYSTICK)', 14, 0);
			Message('SPACE LASER   B SMART BOMB', 16, 0);
			Message('I INVISO     H HYPERSPACE', 17, 0);
			Message('SAVE THE HUMANOIDS!', 19, 0);
			Message('FLY INTO THE STARGATE TO REACH', 21, 0);
			Message('ONE IN TROUBLE. WITH 4 ABOARD', 22, 0);
			Message('IT WARPS YOU 3 WAVES ON', 23, 0);
			Message('(C) 2026 CYBORG UNICORN', 26, 0);
			Cast(0, 10, 19, G_S.HUMAN + 2, 0, false, '');
			Cast(1, 29, 19, G_S.HUMAN + 2, 0, true, '');
		}
	}

	// the cast that moves on the title
	var TITLE_MOVERS = [[0, 100, K_LANDER], [1, 116, K_MUTANT], [3, 148, K_POD], [6, 196, K_FIREB]];
	var TITLE_MOVERS2 = [[8, 116, K_DYNAMO], [10, 148, K_GUPPY], [11, 164, K_PHRED], [12, 180, K_PHRED]];

	function titleStep()
	{
		if (m_intT === 0) { titlePage(); }
		camX = Wrap(camX + 2);
		LandView(camX);
		if (m_intPage === 0)
		{
			Pose(m_intShipID, SEQ.THRUST);
			Put(m_intShipID, (m_intT * 2) % 320 - 40, 92, IMG_MIX, false);
			// the cast that moves: their own animations (every 8 frames)
			processArray(TITLE_MOVERS.concat(TITLE_MOVERS2), function(arr_a)
			{
				var intID = m_arrUfoIDs[arr_a[0]];
				Pose(intID, SEQ.TITLE[arr_a[2]]);
				Put(intID, (arr_a[0] >= 7) ? 164 : 36, arr_a[1], img((arr_a[0] === 12) ? 6 : 0), false);
			});
		}
		else
		{
			Hide(m_intShipID);
		}
		if ((frames & 15) === 0) { Twinkle(idiv(frames, 16)); }
		Tick();
		m_intT++;
		if ((m_intT % 50) === 0)
		{
			if ((idiv(m_intT, 50) % 2) !== 0) { Message(m_objPad.isTouch() ? 'TAP FIRE' : 'PRESS SPACE', 28, 0); } else { Rect(4, 28, 32, 1, 0); }
		}
		if (m_intT === 400) { m_intT = 0; m_intPage = 1 - m_intPage; }
		if (fireDown()) { m_strState = 'titlerelease'; }
	}

	function titleEnd()
	{
		ClearMessages();
		Rect(4, 28, 32, 1, 0);
		HideAll();
		m_objPose = {};
		sfx(0, 200, -6, 15, 25, 0);
		gameStart();
	}

	// ====================================================================================================
	// A GAME

	function gameStart()
	{
		score = 0; lives = 3; wave = 1; over = 0; smart = 3; nextLife = 10000; cloak = 200;
		planetGone = 0;
		for (var intK = 0; intK < NP; intK++) { ps[intK] = 1; }
		waveStart();
	}

	// the end of a wave: on to the next (three on through a warp), or the game's over
	function waveNext()
	{
		if (over !== 0)
		{
			gameOverStart();
		}
		else
		{
			wave += (warp !== 0) ? 3 : 1;
			waveStart();
		}
	}

	function gameOverStart()
	{
		Black(0);
		if (score > hiscore) { hiscore = score; }
		Message('GAME OVER', 14, 0);
		m_intT = 0;
		m_strState = 'over';
	}

	function gameOverStep()
	{
		m_intT++;
		if ((m_intT >= 250) || ((m_intT > 50) && fireDown()))
		{
			ClearMessages();
			titleStart();
		}
	}

	function People()
	{
		for (var intK = 0; intK < NP; intK++)
		{
			ps[intK] = 1; px[intK] = intK * idiv(WORLD, NP) + rnd(100); py[intK] = GY; pd[intK] = 1 - 2 * rnd(2); pv[intK] = 0;
		}
	}

	function PeopleLeft()
	{
		var intN = 0;
		for (var intK = 0; intK < NP; intK++)
		{
			if (ps[intK] !== 0) { intN++; }
		}
		return intN;
	}

	function OnGround()
	{
		var intN = 0;
		for (var intK = 0; intK < NP; intK++)
		{
			if (ps[intK] === 1) { intN++; }
		}
		return intN;
	}

	// this wave's line up (Stargate's own)
	function LineUp()
	{
		for (var intK = 0; intK <= 14; intK++) { q[intK] = 0; }
		if (wave % 10 === 5)
		{
			q[K_DYNAMO] = 6; q[K_GUPPY] = 22; q[K_SWARM] = 8;
		}
		else if (wave % 10 === 0)
		{
			q[K_FIREB] = 13; q[K_POD] = 6;
		}
		else if (wave === 1)
		{
			q[K_LANDER] = 11; q[K_DYNAMO] = 2; q[K_FIREB] = 3;
		}
		else if (wave === 2)
		{
			q[K_LANDER] = 10; q[K_DYNAMO] = 2; q[K_FIREB] = 3; q[K_GUPPY] = 7;
		}
		else if (wave === 3)
		{
			q[K_LANDER] = 10; q[K_DYNAMO] = 2; q[K_FIREB] = 6; q[K_GUPPY] = 4; q[K_POD] = 3;
		}
		else if (wave < 11)
		{
			q[K_LANDER] = 17; q[K_DYNAMO] = 3; q[K_FIREB] = 3; q[K_GUPPY] = 5; q[K_POD] = 4;
			if (wave === 6) { q[K_BOMBER] = 2; }
			if (wave > 6) { q[K_BOMBER] = 3; }
		}
		else
		{
			q[K_LANDER] = 18; q[K_DYNAMO] = 4; q[K_FIREB] = 4; q[K_GUPPY] = 3; q[K_POD] = 4; q[K_BOMBER] = 2;
		}
	}

	function ToCome()
	{
		var intN = 0;
		for (var intK = 1; intK <= 14; intK++) { intN += q[intK]; }
		return intN;
	}

	function FreeSlots()
	{
		var intC = 0;
		for (var intN = 0; intN < NU; intN++)
		{
			if (uk[intN] === 0) { intC++; }
		}
		return intC;
	}

	// one more of the others (not landers) in, if there's room
	function Arrive()
	{
		var blnDone = false;
		if (FreeSlots() >= 7)
		{
			for (var intKd = 2; (intKd <= 14) && !blnDone; intKd++)
			{
				if (q[intKd] > 0)
				{
					q[intKd]--;
					NewUFO(intKd);
					blnDone = true;
				}
			}
		}
	}

	function waveStart()
	{
		var intK;
		HideAll();
		m_objPose = {};
		BulReset();
		Black(0);
		for (intK = 0; intK < NB; intK++) { bt[intK] = 0; }
		for (intK = 0; intK < NU; intK++) { uk[intK] = 0; ub[intK] = -1; }
		for (intK = 0; intK < NBOX; intK++) { bo[intK] = -1; }
		if ((wave === 1) || (wave % 5 === 1) || ((warp !== 0) && (planetGone !== 0)))
		{
			if ((planetGone !== 0) || (wave > 1)) { Message('THE PLANET IS RESTORED', 17, 100); }
			People();
			planetGone = 0;
		}
		else
		{
			for (intK = 0; intK < NP; intK++)
			{
				if (ps[intK] !== 0) { ps[intK] = 1; py[intK] = GY; }
			}
		}
		for (intK = 0; intK < NP; intK++) { pb[intK] = -1; }
		LandKill(planetGone);
		warp = 0;
		LineUp();
		for (intK = 1; intK <= 5; intK++)
		{
			if (q[K_LANDER] > 0) { q[K_LANDER]--; NewUFO(K_LANDER); }
		}
		for (intK = 1; intK <= 14; intK++) { Arrive(); }
		hx = 200 * 8; hy = 100; hvx = 0; face = 1; alive = 1; safe = 100; deadT = 0; cool = 0; smartT = 0;
		aboard = 0; catches = 0; cloakOn = 0; gateT = 0; chaser = 0;
		smartWas = 1; hyperWas = 1; hyperT = 0;
		camX = 112; pan = 0; waveT = 0; m_intClearT = 0;
		Hud();
		Message('ATTACK WAVE ' + trimStr(wave), 13, 100);
		if (wave % 10 === 5)
		{
			Message('YLLABIAN DOGFIGHT!', 15, 100);
		}
		else if (wave % 10 === 0)
		{
			Message('FIREBOMBER SHOWDOWN!', 15, 100);
		}
		else if (planetGone !== 0)
		{
			Message('NO PLANET: MUTANTS!', 15, 100);
		}
		m_strState = 'wave';
	}

	function Attackers()
	{
		var intC = 0;
		for (var intN = 0; intN < NU; intN++)
		{
			switch (uk[intN])
			{
				case 0: case K_FIREBALL: case K_HUM: case K_BAITER: case K_PHRED: case K_BIGRED: case K_MUNCH: break;
				default: intC++; break;
			}
		}
		return intC;
	}

	// a frame of a wave (the original's WaveRun loop, once round)
	function waveStep()
	{
		var intK, intT, intB;
		waveT++;
		if (waveT > 30000) { waveT = 20000; }
		if ((waveT % 10) === 1) { att = Attackers(); tc = ToCome(); }
		if ((q[K_LANDER] > 0) && (((waveT % 600) === 0) || ((att < 5) && ((waveT % 50) === 0))))
		{
			for (intK = 1; intK <= 5; intK++)
			{
				if ((q[K_LANDER] > 0) && (FreeSlots() > 4)) { q[K_LANDER]--; NewUFO(K_LANDER); }
			}
		}
		if ((waveT % 40) === 20) { Arrive(); }
		if ((waveT > 2000) && ((waveT % 450) === 0))
		{
			chaser++;
			if (chaser % 3 === 1) { NewUFO(K_BAITER); } else if (chaser % 3 === 2) { NewUFO(K_PHRED); } else { NewUFO(K_BIGRED); }
		}
		You();
		me = idiv(hx, 8);
		Camera();
		UFOs();
		Folk();
		Gate();
		Booms();
		SmartUpdate();
		if ((alive !== 0) && (hyperT === 0)) { BulStep(Sx(me), hy + 1, pan); } else { BulStep(0, 0, pan); }
		if ((alive !== 0) && (safe === 0) && (smartT === 0) && (cloakOn === 0) && (hyperT === 0))
		{
			if (m_blnHit) { Die(); }
		}
		DrawShip();
		Scanner();
		if ((scoreDirty !== 0) && ((frames & 3) === 0)) { ShowScore(); }
		if (msgT > 0)
		{
			msgT--;
			if (msgT === 0) { ClearMessages(); }
		}
		if ((frames & 15) === 0) { Twinkle(idiv(frames, 16)); }
		LandView(camX);
		Tick();
		if ((alive === 0) && (deadT === 0) && (lives === 0))
		{
			over = 1;
			waveNext();
		}
		else if (warp !== 0)
		{
			// through the Stargate with four aboard: three waves on
			intT = PeopleLeft();
			intB = Math.min(20000, intT * 2000);
			AddScore(intB);
			ShowScore();
			HideAll();
			BulClear();
			BulReset();
			ClearMessages();
			Message('S T A R G A T E   W A R P', 12, 0);
			Message('BONUS ' + trimStr(intB), 14, 0);
			m_intT = 0;
			m_strState = 'warp';
		}
		else if ((tc === 0) && (att === 0) && (waveT > 10))
		{
			// all the attackers down
			m_intClearT++;
			if (m_intClearT === 30)
			{
				intT = PeopleLeft();
				if (wave % 10 === 5) { intB = 2500; } else if (wave < 5) { intB = wave * 100 * intT; } else { intB = intT * 500; }
				AddScore(intB);
				ShowScore();
				Message('ATTACK WAVE ' + trimStr(wave) + ' COMPLETED', 12, 0);
				if (wave % 10 === 5) { Message('DOGFIGHT BONUS 2500', 14, 0); } else { Message('BONUS X ' + trimStr(intT) + ' = ' + trimStr(intB), 14, 0); }
				sfx(0, 100, -2, 15, 50, 0);
			}
			if (m_intClearT > 170)
			{
				ClearMessages();
				waveNext();
			}
		}
	}

	// the warp's flash: 150 frames
	function warpStep()
	{
		m_intT++;
		if ((m_intT & 4) !== 0) { Black((m_intT * 37) & 255); } else { Black(0); }
		if (m_intT >= 150)
		{
			Black(0);
			ClearMessages();
			waveNext();
		}
	}

	// ====================================================================================================
	// YOU

	function You()
	{
		var intMX = 0, intMY = 0, blnSB, intN;
		if (alive === 0)
		{
			if (deadT > 0)
			{
				deadT--;
				if ((deadT === 0) && (lives > 0))
				{
					alive = 1; safe = 150; hy = 100; hvx = 0; ShowLives();
				}
			}
		}
		else if (hyperT > 0)
		{
			// hyperspace: gone for a moment, then somewhere else (and maybe in pieces)
			hyperT--;
			if (hyperT === 0)
			{
				hx = rnd(WORLD) * 8; hy = YTOP + rnd(YLOW - YTOP); hvx = 0;
				camX = Wrap(idiv(hx, 8) - 88); face = 1; pan = 0;
				Hide(m_intGateID);
				if (rnd(5) === 0) { Die(); }
			}
		}
		else
		{
			if (down(K_O) || down(KEY_LEFT) || down(K_5)) { intMX = -1; }
			if (down(K_P) || down(KEY_RIGHT) || down(K_8)) { intMX = 1; }
			if (down(K_Q) || down(KEY_UP) || down(K_7)) { intMY = -1; }
			if (down(K_A) || down(KEY_DOWN) || down(K_6)) { intMY = 1; }
			thrust = 0;
			if (intMX !== 0)
			{
				face = intMX; thrust = 1;
				hvx = Math.max(-52, Math.min(52, hvx + intMX * 3));
			}
			else
			{
				if (hvx > 0) { hvx--; }
				if (hvx < 0) { hvx++; }
			}
			hx = (hx + hvx + WORLD * 8) & (WORLD * 8 - 1);
			hy = Math.max(YTOP, Math.min(YLOW, hy + intMY * 3));
			// the laser
			if (cool > 0) { cool--; }
			if (fireDown() && (cool === 0))
			{
				BulShot(Sx(idiv(hx, 8)) + face * 18, hy + 1, face * 20, 0, G_S.LASER);
				cool = 3;
				sfx(0, 24, 3, 10, 4, 0);
			}
			// a smart bomb
			blnSB = down(K_B) || down(K_ENTER);
			if (blnSB && (smartWas === 0) && (smart > 0) && (smartT === 0))
			{
				smart--; ShowLives();
				smartT = 40;
				SmartBomb();
				sfx(2, 31, 0, 15, 60, 1);
			}
			smartWas = blnSB ? 1 : 0;
			// Inviso: while it's held and there's some left
			if ((down(K_I) || down(K_N)) && (cloak > 0))
			{
				if (cloakOn === 0) { sfx(1, 300, -8, 11, 20, 0); }
				cloakOn = 1; cloak--;
				if ((cloak % 40) === 0) { ShowCloak(); }
			}
			else
			{
				if (cloakOn !== 0) { ShowCloak(); }
				cloakOn = 0;
			}
			// hyperspace
			blnSB = down(K_H);
			if (blnSB && (hyperWas === 0))
			{
				hyperT = 30;
				Pose(m_intGateID, SEQ.STARS);
				Put(m_intGateID, Sx(idiv(hx, 8)) + 16, hy + 16, IMG_MIX, false);
				DropAll();
				sfx(1, 20, 6, 14, 30, 0);
			}
			hyperWas = blnSB ? 1 : 0;
			if (safe > 0) { safe--; }
			// down on the ground with humanoids aboard: they get off
			if ((aboard > 0) && (hy >= YLOW - 2))
			{
				for (intN = 0; intN < NP; intN++)
				{
					if (ps[intN] === 4)
					{
						ps[intN] = 1; py[intN] = GY; px[intN] = Wrap(idiv(hx, 8) - face * (8 + pa[intN] * 6));
						AddScore(500);
					}
				}
				Message(trimStr(aboard * 500), 20, 50);
				sfx(1, 80, -3, 14, 20, 0);
				aboard = 0; catches = 0;
			}
		}
	}

	function DropAll()
	{
		for (var intN = 0; intN < NP; intN++)
		{
			if (ps[intN] === 4) { ps[intN] = 3; pv[intN] = 0; pf[intN] = py[intN]; }
		}
		aboard = 0; catches = 0;
	}

	// the view: you a quarter of the way in from the side you're leaving
	function Camera()
	{
		var intWant, intWas = camX, intD;
		intWant = (face > 0) ? Wrap(me - 72) : Wrap(me - 184);
		intD = Math.max(-9, Math.min(9, Dif(camX, intWant)));
		camX = Wrap(camX + intD);
		pan = Dif(intWas, camX);
	}

	// the ship's place this frame (its hit rectangle: the enemies and the humanoids test it)
	function ShipAt()
	{
		At(m_intShipID, Sx(me) + 24 - 8, hy + 24);
	}

	function DrawShip()
	{
		if ((alive === 0) || (hyperT > 0) || ((safe & 4) !== 0))
		{
			Hide(m_intShipID);
		}
		else
		{
			Pose(m_intShipID, (thrust !== 0) ? SEQ.THRUST : SEQ.SHIP);
			Put(m_intShipID, Sx(me) + 24 - 8, hy + 24, (cloakOn !== 0) ? img(4) : IMG_MIX, face < 0);
		}
		if (m_blnSpark) { sfx(1, 8, 2, 9, 3, 1); }
	}

	function Die()
	{
		alive = 0; deadT = 110; lives--; ShowLives();
		cloakOn = 0;
		Boom(idiv(hx, 8), hy);
		Boom(idiv(hx, 8) - 12, hy - 6);
		Boom(idiv(hx, 8) + 12, hy + 6);
		Boom(idiv(hx, 8), hy - 10);
		BulClear();
		DropAll();
		Hide(m_intShipID);
		smartT = 20;
		sfx(2, 31, 0, 15, 70, 1);
		sfx(1, 300, 10, 15, 50, 0);
	}

	function SmartBomb()
	{
		var intX;
		for (var intN = 0; intN < NU; intN++)
		{
			if (uk[intN] !== 0)
			{
				intX = Sx(ux[intN]);
				if ((intX > -8) && (intX < 264)) { KillUFO(intN); }
			}
		}
		BulClear();
	}

	function SmartUpdate()
	{
		if (smartT !== 0)
		{
			smartT--;
			Black(((smartT > 0) && ((smartT & 2) !== 0)) ? 0xFF : 0);
		}
	}

	// ====================================================================================================
	// THE STARGATE

	function Gate()
	{
		var intX, intN, intBest, intBY;
		if (gateT > 0) { gateT--; }
		intX = Sx(GATEX);
		if ((intX > -24) && (intX < 280))
		{
			Pose(m_intGateID, SEQ.GATE);
			Put(m_intGateID, intX + 16, GATEY + 16, IMG_MIX, false);
		}
		else if (hyperT === 0)
		{
			Hide(m_intGateID);
		}
		if ((alive !== 0) && (hyperT === 0) && (gateT === 0) && m_objSlots.collideRect(m_intGateID, Sx(me) + 32, hy + 32, 0, 0))
		{
			// in!
			gateT = 120;
			sfx(1, 30, 8, 15, 40, 0);
			sfx(0, 400, -12, 13, 40, 0);
			if ((aboard >= 4) && (wave < 10) && (face > 0))
			{
				warp = 1;
			}
			else
			{
				// a humanoid falling, then one being carried off (nearest the top), else the far side
				intBest = -1; intBY = 999;
				for (intN = 0; intN < NP; intN++)
				{
					if ((ps[intN] === 3) && (intBest < 0)) { intBest = intN; }
				}
				if (intBest >= 0)
				{
					hx = Wrap(px[intBest] - face * 60) * 8; hy = py[intBest] - 10;
				}
				else
				{
					for (intN = 0; intN < NU; intN++)
					{
						if ((uk[intN] === K_LANDER) && (ug[intN] >= 0) && (uy[intN] < intBY)) { intBY = uy[intN]; intBest = intN; }
					}
					if (intBest >= 0)
					{
						hx = Wrap(ux[intBest] - face * 70) * 8; hy = uy[intBest];
					}
					else
					{
						hx = Wrap(idiv(hx, 8) + HALF) * 8;
					}
				}
				hy = Math.max(YTOP, Math.min(YLOW, hy));
				camX = (face > 0) ? Wrap(idiv(hx, 8) - 72) : Wrap(idiv(hx, 8) - 184);
				pan = 0; me = idiv(hx, 8);
				BulClear();
				smartT = 12;
				Message('STARGATE', 20, 40);
			}
		}
	}

	// ====================================================================================================
	// THE LASER'S TARGET BOXES

	function BoxFor(intOwn_a)
	{
		var intResult = -1;
		for (var intB = 0; (intB < NBOX) && (intResult < 0); intB++)
		{
			if (bo[intB] < 0)
			{
				bo[intB] = intOwn_a;
				BulHits(intB);
				intResult = intB;
			}
		}
		return intResult;
	}

	function BoxFree(intB_a)
	{
		if (intB_a >= 0)
		{
			BulOff(intB_a);
			bo[intB_a] = -1;
		}
	}

	// ====================================================================================================
	// THE ENEMIES

	function NewUFO(intKd_a)
	{
		var intN, intM = -1, intKd = intKd_a;
		for (intN = 0; intN < NU; intN++)
		{
			if ((uk[intN] === 0) && (intM < 0)) { intM = intN; }
		}
		if (intM >= 0)
		{
			if ((intKd === K_LANDER) && (planetGone !== 0)) { intKd = K_MUTANT; }
			uk[intM] = intKd; ug[intM] = -1; ut[intM] = rnd(100); ufr[intM] = 0; ub[intM] = -1; utg[intM] = -1;
			uf[intM] = 60 + rnd(120);
			ux[intM] = Wrap(camX + 300 + rnd(WORLD - 600));
			uy[intM] = 56 + rnd(70);
			uvx[intM] = 4 + rnd(6);
			if (rnd(2) !== 0) { uvx[intM] = -uvx[intM]; }
			uvy[intM] = 0;
			switch (intKd)
			{
				case K_BAITER: case K_PHRED: case K_BIGRED:
					ux[intM] = Wrap(idiv(hx, 8) + 220 * face); uy[intM] = hy;
					break;
				case K_GUPPY:
					uvx[intM] = 0; uvy[intM] = 0;
					break;
				case K_FIREB:
					uvx[intM] = 12; uvy[intM] = 1;
					if (rnd(2) !== 0) { uvx[intM] = -12; }
					break;
				case K_SWARM:
					uvx[intM] = 0;
					break;
				case K_BOMBER: case K_POD: case K_DYNAMO:
					uvx[intM] = idiv(uvx[intM], 2);
					break;
				default:
					break;
			}
		}
	}

	// a child (swarmer, fireball, hum, munchie) from x, y: its slot or -1
	function Spawn(intKd_a, intX_a, intY_a)
	{
		var intResult = -1;
		for (var intN = 0; (intN < NU) && (intResult < 0); intN++)
		{
			if (uk[intN] === 0)
			{
				uk[intN] = intKd_a; ux[intN] = Wrap(intX_a); uy[intN] = intY_a; uvx[intN] = 0; uvy[intN] = 0;
				ut[intN] = 0; ug[intN] = -1; uf[intN] = 40 + rnd(60); ufr[intN] = 0; ub[intN] = -1;
				intResult = intN;
			}
		}
		return intResult;
	}

	function KillUFO(intN_a)
	{
		var intPts, intJ, intCount;
		Boom(ux[intN_a], uy[intN_a]);
		switch (uk[intN_a])
		{
			case K_LANDER: case K_MUTANT: case K_SWARM: intPts = 150; break;
			case K_BOMBER: case K_FIREB: intPts = 250; break;
			case K_POD: intPts = 1000; break;
			case K_FIREBALL: case K_HUM: intPts = 100; break;
			case K_MUNCH: intPts = 50; break;
			default: intPts = 200; break;
		}
		if (ug[intN_a] >= 0)
		{
			intJ = ug[intN_a];
			ps[intJ] = 3; pv[intJ] = 0; pf[intJ] = py[intJ];
			ug[intN_a] = -1;
		}
		if (uk[intN_a] === K_POD)
		{
			intCount = 4 + rnd(4);
			for (intJ = 1; intJ <= intCount; intJ++)
			{
				Spawn(K_SWARM, ux[intN_a] + rnd(16) - 8, uy[intN_a] + rnd(16) - 8);
			}
		}
		uk[intN_a] = 0;
		BoxFree(ub[intN_a]); ub[intN_a] = -1;
		Hide(m_arrUfoIDs[intN_a]);
		AddScore(intPts);
		sfx(2, 20 + rnd(10), 4, 14, 18, 1);
	}

	function UFOs()
	{
		var intN, intX, intH, intD, intRow, blnMirror, intJ, intBest, intBD, intHW, intHH, intID, blnTouch;
		ShipAt();
		for (intN = 0; intN < NU; intN++)
		{
			if (uk[intN] !== 0)
			{
				ut[intN]++;
				if (ut[intN] > 30000) { ut[intN] = 0; }
				// shot?
				if (ub[intN] >= 0)
				{
					intH = BulHits(ub[intN]);
					if (intH > 0) { KillUFO(intN); }
				}
			}
			if (uk[intN] !== 0)
			{
				intD = Dif(ux[intN], me);
				intHW = 7; intHH = 6; intRow = -1; blnMirror = false;
				switch (uk[intN])
				{
					case K_LANDER:
						if (ug[intN] >= 0)
						{
							// going up with someone
							if ((ut[intN] & 1) === 0) { uy[intN]--; }
							intJ = ug[intN]; px[intJ] = ux[intN]; py[intJ] = uy[intN] + 12;
							if (uy[intN] <= YTOP - 6)
							{
								ps[intJ] = 0; ug[intN] = -1; uk[intN] = K_MUTANT;
								Hide(m_arrPeopleIDs[intJ]);
								BoxFree(pb[intJ]); pb[intJ] = -1;
								Message('MUTANT!', 20, 40);
								sfx(1, 200, 20, 14, 30, 0);
								if (PeopleLeft() === 0) { PlanetGoes(); }
							}
						}
						else
						{
							MoveX(intN);
							intBest = utg[intN];
							if ((intBest >= 0) && (ps[intBest] !== 1)) { intBest = -1; }
							if ((ut[intN] & 15) === 0)
							{
								intBest = -1; intBD = 40;
								for (intJ = 0; intJ < NP; intJ++)
								{
									if (ps[intJ] === 1)
									{
										intH = Math.abs(Dif(ux[intN], px[intJ]));
										if (intH < intBD) { intBD = intH; intBest = intJ; }
									}
								}
							}
							utg[intN] = intBest;
							if ((intBest < 0) || ((ut[intN] & 511) < 150))
							{
								if ((ut[intN] & 31) === 0) { uvy[intN] = rnd(3) - 1; }
								uy[intN] = Math.max(56, Math.min(130, uy[intN] + uvy[intN]));
							}
							else if ((ut[intN] & 1) === 0)
							{
								ux[intN] = Wrap(ux[intN] + sgn(Dif(ux[intN], px[intBest])));
								if (uy[intN] < GY - 12) { uy[intN]++; }
								if ((uy[intN] >= GY - 12) && (Math.abs(Dif(ux[intN], px[intBest])) < 3))
								{
									ug[intN] = intBest; ps[intBest] = 2;
									sfx(1, 400, -20, 13, 30, 0);
									if (OnGround() === 0)
									{
										Message('PLANET SURFACE UNSTABLE!', 18, 100);
									}
									else if (Math.abs(Sx(ux[intN])) < 300)
									{
										Message('HUMANOID!', 20, 40);
									}
								}
							}
						}
						if (uf[intN] <= 0) { Shoot(intN, 14 + wave, 0); }
						break;
					case K_MUTANT:
						if ((ut[intN] & 1) === 0)
						{
							ux[intN] = Wrap(ux[intN] + sgn(intD) * 3 + rnd(3) - 1);
							uy[intN] = uy[intN] + sgn(hy - uy[intN]) * 2 + rnd(5) - 2;
						}
						uy[intN] = Math.max(YTOP, Math.min(YLOW, uy[intN]));
						if (uf[intN] <= 0) { Shoot(intN, 18 + wave, 1); }
						break;
					case K_BOMBER:
						MoveX(intN);
						uy[intN] = 90 + sn2[ut[intN] & 127];
						if (((ut[intN] & 31) === 0) && (Sx(ux[intN]) > 8) && (Sx(ux[intN]) < 248)) { BulFire(Sx(ux[intN]), uy[intN], 0, 0, G_S.MINE, 0); }
						break;
					case K_POD:
						MoveX(intN);
						uy[intN] = 80 + sn4[(ut[intN] + intN * 30) & 127];
						break;
					case K_SWARM:
						uvx[intN] = Math.max(-30, Math.min(30, uvx[intN] + sgn(intD)));
						MoveX(intN);
						uy[intN] = uy[intN] + sgn(hy - uy[intN]) + sn32[(ut[intN] * 4) & 127];
						uy[intN] = Math.max(YTOP, Math.min(YLOW, uy[intN]));
						intHW = 5; intHH = 4;
						if (uf[intN] <= 0) { Shoot(intN, 20, 0); }
						break;
					case K_BAITER:
						ux[intN] = Wrap(ux[intN] + sgn(intD) * 3 + idiv(hvx, 8));
						uy[intN] = uy[intN] + sgn(hy - 20 - uy[intN]);
						intHH = 3;
						if (uf[intN] <= 0) { Shoot(intN, 26, 0); uf[intN] = 30 + rnd(30); }
						break;
					case K_FIREB:
						MoveX(intN);
						uy[intN] += uvy[intN];
						if ((ut[intN] & 63) === 0)
						{
							uvy[intN] = rnd(2) * 2 - 1;
							if (rnd(3) === 0) { uvx[intN] = -uvx[intN]; }
						}
						if (uy[intN] < 56) { uvy[intN] = 1; }
						if (uy[intN] > 150) { uvy[intN] = -1; }
						if (uf[intN] <= 0)
						{
							uf[intN] = Math.max(40, 90 + rnd(90) - wave * 4);
							if ((wave >= 2) && (Math.abs(Sx(ux[intN]) - 128) < 128) && (alive !== 0)) { Fireball(intN); }
						}
						break;
					case K_FIREBALL:
						MoveX(intN);
						uy[intN] += uvy[intN];
						intHW = 4; intHH = 4;
						if ((ut[intN] > 100) || (uy[intN] < YTOP) || (uy[intN] > YLOW + 8))
						{
							uk[intN] = 0; BoxFree(ub[intN]); ub[intN] = -1; Hide(m_arrUfoIDs[intN]);
						}
						break;
					case K_DYNAMO:
						MoveX(intN);
						uy[intN] = 96 + sn2[(ut[intN] + intN * 20) & 127];
						if (uf[intN] <= 0)
						{
							uf[intN] = 150 + rnd(100);
							if ((Math.abs(Sx(ux[intN]) - 128) < 200) && (FreeSlots() > 3))
							{
								if (Spawn(K_HUM, ux[intN], uy[intN]) >= 0) { sfx(1, 40, -2, 11, 10, 0); }
							}
						}
						break;
					case K_HUM:
						if ((ut[intN] & 1) === 0)
						{
							ux[intN] = Wrap(ux[intN] + sgn(intD) * 2 + rnd(3) - 1);
							uy[intN] = uy[intN] + sgn(hy - uy[intN]) + rnd(3) - 1;
						}
						intHW = 4; intHH = 4;
						break;
					case K_GUPPY:
						uvx[intN] = Math.max(-22, Math.min(22, uvx[intN] + sgn(intD)));
						MoveX(intN);
						if ((ut[intN] & 1) === 0) { uy[intN] += sgn(hy - uy[intN]); }
						uy[intN] += sn24[(ut[intN] * 3 + intN * 16) & 127];
						uy[intN] = Math.max(YTOP, Math.min(YLOW, uy[intN]));
						if (uvx[intN] < 0) { blnMirror = true; }
						if (uf[intN] <= 0) { Shoot(intN, 16 + wave, 0); uf[intN] += 60; }
						break;
					case K_PHRED: case K_BIGRED:
						ux[intN] = Wrap(ux[intN] + sgn(intD) * 3 + idiv(hvx, 16));
						uy[intN] += sgn(hy - uy[intN]);
						if (intD < 0) { blnMirror = true; }
						if (uk[intN] === K_BIGRED) { intRow = 6; }
						if (uf[intN] <= 0)
						{
							uf[intN] = 90 + rnd(60);
							if (FreeSlots() > 3) { Spawn(K_MUNCH, ux[intN], uy[intN]); }
						}
						break;
					case K_MUNCH:
						ux[intN] = Wrap(ux[intN] + sgn(intD) * 2 + sgn(intD) * (ut[intN] & 1));
						uy[intN] += sgn(hy - uy[intN]);
						intHW = 4; intHH = 4;
						if (intD < 0) { blnMirror = true; }
						if (ut[intN] > 600) { uk[intN] = 0; BoxFree(ub[intN]); ub[intN] = -1; Hide(m_arrUfoIDs[intN]); }
						break;
					default:
						break;
				}
				uf[intN]--;
			}
			if (uk[intN] !== 0)
			{
				// on the screen: the sprite, the target box; you running into it
				intID = m_arrUfoIDs[intN];
				intX = Sx(ux[intN]);
				if ((intX > -16) && (intX < 272))
				{
					Pose(intID, SEQ[uk[intN]]);
					Put(intID, intX + 24, uy[intN] + 24, (intRow < 0) ? IMG_MIX : img(intRow), blnMirror);
					if ((intX > 2) && (intX < 254))
					{
						if (ub[intN] < 0) { ub[intN] = BoxFor(intN); }
						if (ub[intN] >= 0) { BulBox(ub[intN], intX, uy[intN], intHW, intHH); }
					}
					else
					{
						BoxFree(ub[intN]); ub[intN] = -1;
					}
					if ((alive !== 0) && (hyperT === 0))
					{
						blnTouch = m_objSlots.collide(intID, m_intShipID);
						if (blnTouch)
						{
							if (cloakOn !== 0)
							{
								KillUFO(intN);
							}
							else if (safe === 0)
							{
								KillUFO(intN);
								Die();
							}
						}
					}
				}
				else
				{
					Hide(intID);
					BoxFree(ub[intN]); ub[intN] = -1;
				}
			}
		}
	}

	// enemy n moves across uvx(n) eighths of a pixel (its eighths kept in ufr)
	function MoveX(intN_a)
	{
		var intF = ufr[intN_a] + uvx[intN_a], intM = 0;
		while (intF >= 8) { intF -= 8; intM++; }
		while (intF <= -8) { intF += 8; intM--; }
		ufr[intN_a] = intF;
		if (intM !== 0) { ux[intN_a] = (ux[intN_a] + intM + WORLD) & (WORLD - 1); }
	}

	function Fireball(intN_a)
	{
		var intJ = Spawn(K_FIREBALL, ux[intN_a], uy[intN_a]), intD;
		if (intJ >= 0)
		{
			intD = Dif(ux[intN_a], idiv(hx, 8));
			uvx[intJ] = Math.max(-40, Math.min(40, sgn(intD) * (24 + wave * 2)));
			uvy[intJ] = sgn(hy - uy[intN_a]);
			sfx(1, 60, 6, 12, 12, 0);
		}
	}

	function Sine1(intT_a)
	{
		var intU = intT_a & 127;
		return (intU < 64) ? (intU * 2 - 64) : (192 - intU * 2);
	}

	// enemy n shoots at you (if it's on the screen): kind 0 one bullet, 1 a pair, 2 a fan of 3
	function Shoot(intN_a, intSp_a, intKind_a)
	{
		var intX, intA;
		uf[intN_a] = Math.max(25, 80 + rnd(80) - wave * 3);
		if ((alive !== 0) && (hyperT === 0))
		{
			intX = Sx(ux[intN_a]);
			if ((intX >= 0) && (intX <= 256) && (Math.abs(intX - Sx(me)) >= 20))
			{
				intA = BulAim(intX, uy[intN_a], Sx(me), hy);
				if (intKind_a === 0)
				{
					BulFire(intX, uy[intN_a], intA, intSp_a, G_S.BULLET, PINK);
				}
				else if (intKind_a === 1)
				{
					BulFire(intX, uy[intN_a], intA, intSp_a, G_S.BULLET, PINK);
					BulFire(intX, uy[intN_a], (intA + 8) & 255, intSp_a, G_S.BULLET, PINK);
				}
				else
				{
					BulFire(intX, uy[intN_a], intA, intSp_a, G_S.BULLET + 1, BLUE);
					BulFire(intX, uy[intN_a], (intA + 14) & 255, intSp_a, G_S.BULLET + 1, BLUE);
					BulFire(intX, uy[intN_a], (intA - 14) & 255, intSp_a, G_S.BULLET + 1, BLUE);
				}
			}
		}
	}

	function PlanetGoes()
	{
		planetGone = 1;
		LandKill(1);
		for (var intN = 0; intN < NU; intN++)
		{
			if (uk[intN] === K_LANDER) { uk[intN] = K_MUTANT; }
		}
		smartT = 45;
		Message('THE PLANET HAS EXPLODED!', 13, 120);
		sfx(2, 40, 10, 15, 90, 1);
		sfx(0, 500, 12, 15, 90, 1);
	}

	// ====================================================================================================
	// THE HUMANOIDS

	function Folk()
	{
		var intN, intX, intJ, intID, blnCaught, objPart;
		for (intN = 0; intN < NP; intN++)
		{
			intID = m_arrPeopleIDs[intN];
			// shot by your laser (carried up, or falling)?
			if ((pb[intN] >= 0) && (BulHits(pb[intN]) > 0) && ((ps[intN] === 2) || (ps[intN] === 3)))
			{
				Boom(px[intN], py[intN]);
				for (intJ = 0; intJ < NU; intJ++)
				{
					if (ug[intJ] === intN) { ug[intJ] = -1; }
				}
				ps[intN] = 0;
				sfx(1, 300, 20, 13, 25, 0);
				Message('HUMANOID KILLED', 20, 40);
				if (PeopleLeft() === 0) { PlanetGoes(); }
			}
			objPart = SEQ.HELD;
			switch (ps[intN])
			{
				case 1:
					if ((frames & 3) === 0) { px[intN] = Wrap(px[intN] + pd[intN]); }
					if (((frames & 15) === intN) && (rnd(20) === 0)) { pd[intN] = -pd[intN]; }
					objPart = SEQ.WALK;
					break;
				case 3:
					// falling: from up high it's the end of them, unless you catch them
					pv[intN]++;
					py[intN] += idiv(pv[intN], 10);
					if (py[intN] >= GY)
					{
						py[intN] = GY;
						if (GY - pf[intN] > 60)
						{
							ps[intN] = 0; Boom(px[intN], py[intN]);
							Hide(intID);
							sfx(1, 200, 30, 13, 25, 0);
							if (PeopleLeft() === 0) { PlanetGoes(); }
						}
						else
						{
							ps[intN] = 1; AddScore(250);
							Message('250', 20, 30);
						}
					}
					// caught? (the ship's hit rectangle against the humanoid's)
					if ((ps[intN] === 3) && (alive !== 0) && (hyperT === 0))
					{
						At(intID, Sx(px[intN]) + 24, py[intN] + 24);
						blnCaught = m_objSlots.collide(intID, m_intShipID);
						if (blnCaught)
						{
							ps[intN] = 4; pa[intN] = aboard; aboard++;
							catches = Math.min(4, catches + 1);
							AddScore(500 * catches);
							Message(trimStr(500 * catches), 20, 50);
							sfx(1, 100, -4, 14, 20, 0);
						}
					}
					break;
				case 4:
					// aboard: hanging under the ship, one behind the other
					px[intN] = Wrap(me - face * (4 + pa[intN] * 6)); py[intN] = hy + 11;
					break;
				default:
					break;
			}
			if (ps[intN] !== 0)
			{
				intX = Sx(px[intN]);
				if ((intX > -16) && (intX < 272) && ((ps[intN] !== 4) || ((alive !== 0) && (hyperT === 0))))
				{
					Pose(intID, objPart);
					Put(intID, intX + 24, py[intN] + 24, IMG_MIX, pd[intN] < 0);
					if (((ps[intN] === 2) || (ps[intN] === 3)) && (intX > 2) && (intX < 254))
					{
						if (pb[intN] < 0) { pb[intN] = BoxFor(100 + intN); }
						if (pb[intN] >= 0) { BulBox(pb[intN], intX, py[intN], 2, 4); }
					}
					else
					{
						BoxFree(pb[intN]); pb[intN] = -1;
					}
				}
				else
				{
					Hide(intID);
					BoxFree(pb[intN]); pb[intN] = -1;
				}
			}
			else
			{
				Hide(intID);
				BoxFree(pb[intN]); pb[intN] = -1;
			}
		}
	}

	// ====================================================================================================
	// EXPLOSIONS

	function Boom(intX_a, intY_a)
	{
		bx[bnext] = intX_a; by[bnext] = intY_a; bt[bnext] = 16;
		m_objPose[m_arrBoomIDs[bnext]] = null;
		Pose(m_arrBoomIDs[bnext], SEQ.BOOM);
		bnext = (bnext + 1) & 7;
	}

	function Booms()
	{
		processArray(m_arrBoomIDs, function(intID_a, intRow_a, intN_a)
		{
			var intX;
			if (bt[intN_a] > 0)
			{
				bt[intN_a]--;
				intX = Sx(bx[intN_a]);
				if ((bt[intN_a] === 0) || (intX < -16) || (intX > 272))
				{
					Hide(intID_a);
				}
				else
				{
					Put(intID_a, intX + 24, by[intN_a] + 24, IMG_MIX, false);
				}
			}
		});
	}

	// ====================================================================================================
	// FOR THE TESTS

	this.test = function(strWhat_a)
	{
		var objResult = { state:m_strState, score:score, lives:lives, smart:smart, wave:wave, people:PeopleLeft(), attackers:Attackers(), tocome:ToCome(),
			alive:alive, hx:idiv(hx, 8), hy:hy, aboard:aboard, planet:planetGone, bullets:0 };
		for (var intI = 0; intI < NEB; intI++) { objResult.bullets += ebOn[intI]; }
		if ((strWhat_a === 'endwave') && (m_strState === 'wave'))
		{
			for (intI = 0; intI < NU; intI++)
			{
				if (uk[intI] !== 0) { KillUFO(intI); }
			}
			for (intI = 0; intI <= 14; intI++) { q[intI] = 0; }
		}
		if ((strWhat_a === 'gate') && (m_strState === 'wave'))
		{
			// the ship put in front of the Stargate (the warp tested with 4 aboard: 'gate4')
			hx = (GATEX - 4) * 8; hy = GATEY; face = 1; hvx = 0;
		}
		if ((strWhat_a === 'planet') && (m_strState === 'wave'))
		{
			for (intI = 0; intI < NP; intI++) { ps[intI] = 0; }
			PlanetGoes();
		}
		if (strWhat_a === 'safe') { safe = 30000; }
		if (strWhat_a === 'lastlife') { lives = 1; ShowLives(); }
		return objResult;
	};

	this.gate4 = function()
	{
		for (var intI = 0; intI < 4; intI++) { ps[intI] = 4; pa[intI] = intI; }
		aboard = 4;
		return this.test('gate');
	};

	// ====================================================================================================
	// THE LOOPS

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
				case 'titlerelease': if (!fireDown()) { titleEnd(); } break;
				case 'wave': waveStep(); break;
				case 'warp': warpStep(); break;
				case 'over': gameOverStep(); break;
				default: break;
			}
			// (the original's game over wait moves nothing: the sprites stay as they were)
			if (m_strState !== 'over') { m_objSlots.step(); }
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
			// Layer 2: the scanner's rows still, the stars at a quarter speed, the mountains
			m_objL2.paint(objContext_a, GAMEX + 32, 32, [ { y:0, h:32, scroll:0 }, { y:32, h:80, scroll:m_intSkyScroll }, { y:112, h:80, scroll:m_intLandScroll } ]);
			objContext_a.save();
			objContext_a.translate(GAMEX, 0);
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var intI, intK;
		for (intI = 0; intI <= 255; intI++)
		{
			intK = Math.max(0, Math.min(8, idiv((intI - 40) * 9, 145)));
			scR[intI] = 5 + idiv(intK, 3); scS[intI] = (intK % 3) * 4;
		}
		for (intI = 0; intI <= 127; intI++)
		{
			intK = Sine1(intI);
			sn2[intI] = idiv(intK, 2); sn4[intI] = idiv(intK, 4); sn24[intI] = idiv(intK, 24); sn32[intI] = idiv(intK, 32);
			scC[intI] = 4 + idiv(intI, 4); scD[intI] = intI & 3;
		}
		patterns();
		// the tiles (GFX_DEFHYPER's), the pattern strips (tools/patstrip.py, tools/ports/defhyper_mix.py)
		m_objSprites.addImagesToLibrary([ G.images[0], G.images[1] ]);
		for (intI = 0; intI < 8; intI++)
		{
			m_objSprites.addImagesToLibrary([ { name:img(intI), classes:'defhyper', source:'images/defhyper/patterns_' + intI + '.png' } ]);
		}
		m_objSprites.addImagesToLibrary([ { name:IMG_MIX, classes:'defhyper', source:'images/defhyper/patterns_mix.png' } ]);
		makeSprites();
		// the Next's sprite clip window: the paper
		m_objSlots.setClip(32, 32, 256, 192);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['defhyper_t0'], first:0, firstcode:0, transparent:0 });
		LandInit();
		m_objPad = new JPad({ controls:[
			{ type:'dpad', x:VIEW.x + 32, y:135, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
			{ type:'button', x:VIEW.x + VIEW.w - 30, y:185, size:24, key:K_SPACE, label:'FIRE' },
			{ type:'button', x:VIEW.x + VIEW.w - 46, y:143, size:17, key:K_B, label:'BOMB' },
			{ type:'button', x:VIEW.x + VIEW.w - 18, y:111, size:16, key:K_I, label:'INV' },
			{ type:'button', x:VIEW.x + VIEW.w - 44, y:79, size:15, key:K_H, label:'HYPER' }
		], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:K_SPACE, fire2:K_B } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('defhyper'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			m_strState = 'start';
		});
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:true, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:VIEW.w, yresolution:VIEW.h, xorigin:VIEW.x, yorigin:VIEW.y, cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new defhyperGame();
g_objGame.run();
