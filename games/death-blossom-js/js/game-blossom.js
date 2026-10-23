// DEATH BLOSSOM - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// One starfighter against a fleet. Your ship always points up the screen; steer left and right
// and the whole sky turns round you - the stars, the enemies, their fire. Thrust to close in,
// brake to let them come, and shoot them before they get you.
//   Waves of 50: darts (fast, they come straight at you), weavers (they circle and fire fans),
//   brutes (slow and tough, they fire rings). After every two waves, the mothership.
//   Then round again, faster and meaner.
// The DEATH BLOSSOM: your ship spins and throws three rings of fire every way at once, and wipes
// the enemy's bullets out of the sky. Then it takes ten seconds to charge again.
//
// Keys: O P (or Z C, 5 8, the arrows): turn. Q (or S, 7, up): thrust. A (or X, 6, down): brake.
//       Space (or M, 0): fire - hold it down. N (or B, Enter): the death blossom.
//       A game pad: the stick turns, thrusts and brakes, A fires, B is the death blossom.
// Touch (nothing drawn): touch the canvas itself. The left part of the view turns (its left half
// left, its right half right), its top strip thrusts and its bottom strip brakes; the right part
// fires, and its top right corner is the death blossom. A tap anywhere starts, where it says
// PRESS SPACE.
//
// The screen is the Next's: the stars are Layer 2 (drawn a pixel each); the HUD and the words are
// the tile screen (JTileGrid); you, the mothership and everything else are numbered sprites,
// numbered as on the Next. The Next's Sky.cls (the turning sky) is here as the sky's table: 104
// bodies (16 enemies, 8 explosions, 48 enemy bullets, 32 of your shots), each kept where it is from
// you in 32nds of a pixel, with its speed in 256ths, worked in 16 bits as the Z80 does. Each body's
// sprite moves itself (skyMover: turned by your steering, slid down by your speed, then moved by
// its own speed), and the sprites' hit boxes say what a shot hits, what bullet gets you and what
// flies into you. The game runs 50 iterations a second - the Next's frames.
function blossomGame()
{
	var m_objThis = this;
	var G = GFX_BLOSSOM;

	// the part of the Next's 320 x 256 screen the game uses (the paper): the canvas is this and
	// nothing more; the touch controls are drawn over it
	var VIEW = { x:32, y:32, w:256, h:192 };

	var NE = 16, NB = 8;
	var SP_SHIP = 0, SP_BOSS = 1;
	// the sky's bodies are sprites 24-127 (body n is sprite SKY + n): 0-15 enemies, 16-23
	// explosions, 24-71 enemy bullets, 72-103 your shots
	var SKY = 24, NBODY = 104, NSTAR = 48;
	// full screen (JCanvas's screenmode): how much more of the sky shows left and right of the
	// Next's 256 (0 in the normal mode), at most WIDEMAX each side. The stars then are three times
	// as many in a field three times as wide (the Next's 48 and two more lots of 48 either side), and
	// an enemy bullet or a shot that the game is done with (well off the Next's screen) carries on
	// flying, only drawn, as one of NGHOST ghosts (sprites GHOST on) until it's off the wide screen
	var WIDEMAX = 256, NGHOST = 48, GHOST = 128;
	var FULLCHARGE = 500;						// 10 seconds
	var KDART = 0, KWEAVER = 1, KBRUTE = 2;
	// you are drawn in the middle of the paper, 128, 120 (the screen's 160, 152)
	var YOUX = 160, YOUY = 152;
	// the Next's sprite flags (attribute 2), kept in the bodies as the Next keeps them
	var NX_MIRRORX = 8, NX_MIRRORY = 4, NX_ROTATE = 2, NX_PAL = 16;
	// the Next's sprite patterns (GfxData.cls)
	var P_SHIP = 0, P_SHOT = 2, P_ORB = 3, P_BULLET = 4, P_BOOM = 6, P_DART = 10, P_WEAVER = 14, P_BRUTE = 18, P_NONE = 255;
	// a star's colour (Layer 2, RRRGGGBB)
	var STARBRIGHT = 0xFF, STARDIM = 0x92, STARBLUE = 0x6F;

	// keys (keyCodes)
	var K_O = 79, K_P = 80, K_Z = 90, K_C = 67, K_5 = 53, K_8 = 56;
	var K_Q = 81, K_S = 83, K_7 = 55, K_A = 65, K_X = 88, K_6 = 54;
	var K_SPACE = 32, K_M = 77, K_0 = 48, K_N = 78, K_B = 66, K_ENTER = 13;

	// the sines: 256 steps round, x 127 (Sky.cls's table)
	var SINES = [
		0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3,
		0, 253, 250, 247, 244, 240, 237, 234, 231, 228, 225, 222, 219, 216, 213, 210, 207, 205, 202, 199, 196, 193, 191, 188, 185, 183, 180, 178, 175, 173, 171, 168,
		166, 164, 162, 160, 158, 156, 154, 152, 150, 149, 147, 145, 144, 143, 141, 140, 139, 138, 136, 135, 134, 134, 133, 132, 131, 131, 130, 130, 130, 129, 129, 129,
		129, 129, 129, 129, 130, 130, 130, 131, 131, 132, 133, 134, 134, 135, 136, 138, 139, 140, 141, 143, 144, 145, 147, 149, 150, 152, 154, 156, 158, 160, 162, 164,
		166, 168, 171, 173, 175, 178, 180, 183, 185, 188, 191, 193, 196, 199, 202, 205, 207, 210, 213, 216, 219, 222, 225, 228, 231, 234, 237, 240, 244, 247, 250, 253 ];
	// atan(k / 16) in 256ths of a turn (Sky.Aim's)
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];
	// an explosion: four frames, 15 frames in all (as the Next's count down), then done
	var BOOMSEQ = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 0];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, GHOST + NGHOST);
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	// a Next sprite pattern's library sprite and frame
	var m_arrPatName = [], m_arrPatFrame = [];

	// THE SKY (Sky.cls). A body: where it is from you (32nds of a pixel: x across, y down), its speed
	// (256ths of a pixel a frame), on, its pattern (255: not drawn), its flags (the Next's attribute
	// 2: palette row, mirrors, rotate), the shots that hit it, where it is on the paper, and whether
	// its middle is on the paper (an enemy's)
	var m_arrBX = [], m_arrBY = [], m_arrBVX = [], m_arrBVY = [], m_arrBOn = [], m_arrBPat = [], m_arrBFl = [], m_arrBHits = [];
	var m_arrBSX = [], m_arrBSY = [], m_arrBVis = [];
	// the stars: x, y (32nds), colour
	var m_arrStX = [], m_arrStY = [], m_arrStC = [], m_arrStCSS = [];
	// full screen: the wide screen's extra each side, as JCanvas shows it (m_intWL, m_intWR) and as
	// the sky is drawn there (m_intSL, m_intSR: at most WIDEMAX); the view shown; the ghosts: where
	// from you (32nds), speed (256ths), on, just made (moved from the next step)
	var m_intWL = 0, m_intWR = 0, m_intSL = 0, m_intSR = 0, m_objView = { x:32, y:32, w:256, h:192 };
	var m_arrGX = [], m_arrGY = [], m_arrGVX = [], m_arrGVY = [], m_arrGOn = [], m_arrGNew = [], m_arrGFoe = [];
	// this frame's turn (its size and sign) and your speed (32nds a frame); a bullet on you; the
	// enemy (+1) that flew into you
	var m_intSmag = 0, m_blnSneg = false, m_intFwd = 0, m_blnHitF = false, m_intBumpN = 0;

	// the enemies (bodies 0-15): on, kind, life, when it fires next, how fast, which way round it
	// circles, its hit flash
	var m_arrEOn = [], m_arrEKind = [], m_arrEHP = [], m_arrEFire = [], m_arrESpd = [], m_arrESide = [], m_arrEFlash = [];
	var m_intBNext = 0;
	// you
	var m_intAlive = 0, m_intInv = 0, m_intDeadT = 0, m_intCool = 0, m_intTurnT = 0, m_intFwdYou = 32;
	var m_intCharge = FULLCHARGE, m_intBlossT = 0, m_blnBlossWas = false, m_intSpin = 0, m_intTurn = 0;
	// the waves
	var m_intScore = 0, m_intHiscore = 50000, m_intLives = 3, m_intWave = 1, m_intCycle = 0, m_intPh = 0;
	var m_intToSpawn = 0, m_intRemain = 0, m_intSpawnT = 0, m_intMost = 0;
	var m_intFrames = 0, m_intMsgT = 0, m_blnScoreDirty = false, m_intClearT = 0, m_intNextLife = 50000;
	// the mothership
	var m_blnBossOn = false, m_intBossHp = 0, m_intBossMax = 1, m_intBossAng = 0, m_intBossT = 0, m_intBossFl = 0, m_blnBossWas = false;

	var m_strState = 'loading', m_intStep = 0;

	// the touch zones while you play (never drawn; zones that overlap press both keys): the left
	// 96 pixels turn (left half left, right half right), with thrust along their top 48 and brake
	// along their bottom 48; the rest fires, except the top right corner: the death blossom
	var ZONES = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:48, h:VIEW.h, key:KEY_LEFT },
		{ type:'zone', x:VIEW.x + 48, y:VIEW.y, w:48, h:VIEW.h, key:KEY_RIGHT },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:96, h:48, key:KEY_UP },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 48, w:96, h:48, key:KEY_DOWN },
		{ type:'zone', x:VIEW.x + 96, y:VIEW.y + 48, w:VIEW.w - 96, h:VIEW.h - 48, key:K_SPACE },
		{ type:'zone', x:VIEW.x + 96, y:VIEW.y, w:VIEW.w - 192, h:48, key:K_SPACE },
		{ type:'zone', x:VIEW.x + VIEW.w - 96, y:VIEW.y, w:96, h:48, key:K_N } ];

	// ====================================================================================================
	// HELPERS

	// BASIC's \ : whole number division, towards nought
	function idiv(intA_a, intB_a)
	{
		return (intA_a / intB_a) | 0;
	}

	// BASIC's Mod as NTC does it: the dividend's sign; by nought, the dividend
	function imod(intA_a, intB_a)
	{
		return (intB_a === 0) ? intA_a : intA_a % intB_a;
	}

	// a 16 bit word, as the Z80 keeps it (-32768 .. 32767)
	function w16(int_a)
	{
		return (int_a << 16) >> 16;
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function fireDown()
	{
		return down(K_SPACE) || down(K_M) || down(K_0);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a === 1);
	}

	function text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function seven(int_a)
	{
		return rightStr('000000' + String(int_a), 7);
	}

	// the Next's sprite flags as the framework's: the image (palette row) and the mirrors and turn
	function rowOf(intFl_a)
	{
		return 'blossom_s' + ((intFl_a >> 4) & 15);
	}

	function flagsOf(intFl_a)
	{
		var intResult = 0;
		if ((intFl_a & NX_MIRRORX) !== 0) { intResult |= SPRITE_MIRRORX; }
		if ((intFl_a & NX_MIRRORY) !== 0) { intResult |= SPRITE_MIRRORY; }
		if ((intFl_a & NX_ROTATE) !== 0) { intResult |= SPRITE_ROTATE; }
		return intResult;
	}

	// the patterns, in the order the Next's GfxData loads them, as library sprites and frames
	function setup()
	{
		var arrOrder = [['ship', G.S_SHIP], ['shot', G.S_SHOT], ['orb', G.S_ORB], ['bullet', G.S_BULLET], ['boom', G.S_BOOM],
			['dart', G.S_DART], ['weaver', G.S_WEAVER], ['brute', G.S_BRUTE]];
		var intK, intF;
		for (intK = 0; intK < arrOrder.length; intK++)
		{
			for (intF = 1; intF <= arrOrder[intK][1].frames; intF++)
			{
				m_arrPatName.push(arrOrder[intK][0]);
				m_arrPatFrame.push(intF);
			}
		}
		m_arrPatName[P_NONE] = 'bossbody'; m_arrPatFrame[P_NONE] = 1;
		for (intK = 0; intK < 256; intK++)
		{
			if (SINES[intK] > 127) { SINES[intK] -= 256; }
		}
		for (intK = 0; intK < NBODY; intK++)
		{
			m_arrBX.push(0); m_arrBY.push(0); m_arrBVX.push(0); m_arrBVY.push(0); m_arrBOn.push(false); m_arrBPat.push(P_NONE); m_arrBFl.push(0);
			m_arrBHits.push(0); m_arrBSX.push(0); m_arrBSY.push(0); m_arrBVis.push(false);
		}
		for (intK = 0; intK < NGHOST; intK++)
		{
			m_arrGX.push(0); m_arrGY.push(0); m_arrGVX.push(0); m_arrGVY.push(0); m_arrGOn.push(false); m_arrGNew.push(false); m_arrGFoe.push(false);
		}
		for (intK = 0; intK < NE; intK++)
		{
			m_arrEOn.push(false); m_arrEKind.push(0); m_arrEHP.push(0); m_arrEFire.push(0); m_arrESpd.push(0); m_arrESide.push(1); m_arrEFlash.push(0);
		}
		skyInit();
	}

	// ====================================================================================================
	// THE SKY (Sky.cls): the stars and the bodies, turned round you and slid past as you fly

	// the stars scattered (once: they carry on from screen to screen), no bodies
	function skyInit()
	{
		var intK;
		for (intK = 0; intK < NSTAR; intK++)
		{
			m_arrStX.push((rnd(256) - 128) * 32);
			m_arrStY.push((rnd(192) - 120) * 32);
			m_arrStC.push((intK < 16) ? STARBRIGHT : ((intK >= 40) ? STARBLUE : STARDIM));
			m_arrStCSS.push(rgb332ToCSS(m_arrStC[intK]));
		}
		// (full screen) two more lots: the same 256 to the left and to the right (no more of the
		// game's random numbers used); from then on they're one field 768 wide
		for (intK = 0; intK < NSTAR * 2; intK++)
		{
			m_arrStX.push(m_arrStX[intK % NSTAR] + ((intK < NSTAR) ? -8192 : 8192));
			m_arrStY.push(m_arrStY[intK % NSTAR]);
			m_arrStC.push(m_arrStC[intK % NSTAR]);
			m_arrStCSS.push(m_arrStCSS[intK % NSTAR]);
		}
	}

	// no bodies
	function skyReset()
	{
		for (var intK = 0; intK < NBODY; intK++)
		{
			m_arrBOn[intK] = false; m_arrBHits[intK] = 0; m_arrBVis[intK] = false;
		}
		m_objSlots.hideRange(SKY, NBODY);
		ghostsOff(false);
	}

	// body n's sprite: its pattern (the bossbody, unseen, for 255), palette row, mirrors and turn
	function bodyLook(intN_a)
	{
		var intP = m_arrBPat[intN_a];
		m_objSlots.put(SKY + intN_a, m_arrBSX[intN_a] + 24, m_arrBSY[intN_a] + 24, m_arrPatName[intP], m_arrPatFrame[intP], (intP === P_NONE) ? '' : rowOf(m_arrBFl[intN_a]), 1, flagsOf(m_arrBFl[intN_a]));
	}

	// a body on: it moves itself from now on (skyMover)
	function bodyOn(intN_a, intX_a, intY_a, intVX_a, intVY_a, intPat_a, intFl_a)
	{
		m_arrBX[intN_a] = w16(intX_a); m_arrBY[intN_a] = w16(intY_a); m_arrBVX[intN_a] = w16(intVX_a); m_arrBVY[intN_a] = w16(intVY_a);
		m_arrBOn[intN_a] = true; m_arrBPat[intN_a] = intPat_a; m_arrBFl[intN_a] = intFl_a; m_arrBHits[intN_a] = 0; m_arrBVis[intN_a] = false;
		m_arrBSX[intN_a] = (m_arrBX[intN_a] >> 5) + 128; m_arrBSY[intN_a] = (m_arrBY[intN_a] >> 5) + 120;
		bodyLook(intN_a);
		m_objSlots.setMover(SKY + intN_a, skyMover);
	}

	// Spawn n, x, y, vx, vy, pat, flags: body n (an enemy 0-15 or an explosion 16-23) there (its hit
	// size is its sprite's hit box)
	function skySpawn(intN_a, intX_a, intY_a, intVX_a, intVY_a, intPat_a, intFl_a)
	{
		bodyOn(intN_a, intX_a, intY_a, intVX_a, intVY_a, intPat_a, intFl_a);
	}

	// Shot x, y, vx, vy, pat: one of your shots (if there's room)
	function skyShot(intX_a, intY_a, intVX_a, intVY_a, intPat_a)
	{
		var intN = -1, intK;
		for (intK = 72; (intK < 104) && (intN < 0); intK++)
		{
			if (!m_arrBOn[intK]) { intN = intK; }
		}
		if (intN >= 0) { bodyOn(intN, intX_a, intY_a, intVX_a, intVY_a, intPat_a, 0); }
	}

	// Fire x, y, a, speed, pat, pal: an enemy bullet from x, y (32nds) going way a (0-255: 0 down, 64
	// right, 128 up, 192 left), speed in 32nds of a pixel a frame (a byte), pattern, palette row
	function skyFire(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPal_a)
	{
		var intN = -1, intK;
		for (intK = 24; (intK < 72) && (intN < 0); intK++)
		{
			if (!m_arrBOn[intK]) { intN = intK; }
		}
		if (intN >= 0)
		{
			bodyOn(intN, intX_a, intY_a, fireSin(intA_a & 255, intSpd_a & 255), fireSin((intA_a + 64) & 255, intSpd_a & 255), intPat_a, (intPal_a << 4) & 0xF0);
		}
	}

	// sin(a) x speed / 16, the sign put back after (as the Z80 multiplies)
	function fireSin(intA_a, intSpd_a)
	{
		var intS = SINES[intA_a];
		var intResult = (Math.abs(intS) * intSpd_a) >> 4;
		if (intS < 0) { intResult = -intResult; }
		return intResult;
	}

	// Vel n, vx, vy: body n's speed
	function skyVel(intN_a, intVX_a, intVY_a)
	{
		m_arrBVX[intN_a] = w16(intVX_a); m_arrBVY[intN_a] = w16(intVY_a);
	}

	// Look n, pat, flags: body n's pattern (255: not drawn) and flags
	function skyLook(intN_a, intPat_a, intFl_a)
	{
		m_arrBPat[intN_a] = intPat_a; m_arrBFl[intN_a] = intFl_a;
		bodyLook(intN_a);
	}

	// KillB n: body n gone
	function skyKill(intN_a)
	{
		m_arrBOn[intN_a] = false;
		m_objSlots.hide(SKY + intN_a);
	}

	// Hits(n): the shots that hit body n since the last Hits(n)
	function skyHits(intN_a)
	{
		var intResult = m_arrBHits[intN_a];
		m_arrBHits[intN_a] = 0;
		return intResult;
	}

	// ClearBullets: every enemy bullet gone
	function skyClearBullets()
	{
		for (var intK = 24; intK < 72; intK++)
		{
			if (m_arrBOn[intK]) { skyKill(intK); }
		}
		ghostsOff(true);
	}

	// Sn(a): the sine of way a (0-255 round; only its low byte counts), x 127
	function sn(intA_a)
	{
		return SINES[intA_a & 255];
	}

	// Aim(x, y, tx, ty): the way (0-255, as skyFire's) from x, y to tx, ty (pixels)
	function aim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a;
		var intAX = Math.abs(intDX), intAY = Math.abs(intDY), intT, intResult = 0;
		if ((intAX !== 0) || (intAY !== 0))
		{
			if (intAX <= intAY)
			{
				intT = ATN[idiv(intAX * 16, intAY)];
			}
			else
			{
				intT = 64 - ATN[idiv(intAY * 16, intAX)];
			}
			if (intDY >= 0)
			{
				intResult = (intDX >= 0) ? intT : ((256 - intT) & 255);
			}
			else
			{
				intResult = (intDX >= 0) ? 128 - intT : 128 + intT;
			}
		}
		return intResult;
	}

	// v x the turn / 256 (the turn's sine x 256), towards nought, as the Z80's two byte multiply
	function smul(int_a)
	{
		var intResult = (Math.abs(int_a) * m_intSmag) >> 8;
		if ((int_a < 0) !== m_blnSneg) { intResult = -intResult; }
		return intResult;
	}

	// a body's sprite moves itself: turned with the sky (a pair of shears: x -= y s; y += x s, its
	// speed too), slid down by your speed, then by its own speed. A bullet or a shot is done once it's
	// well off the screen
	function skyMover(intSlot_a, objO_a)
	{
		var intN = intSlot_a - SKY, intSX, intSY, blnGone = false, intG;
		if (m_intSmag !== 0)
		{
			m_arrBX[intN] = w16(m_arrBX[intN] - smul(m_arrBY[intN]));
			m_arrBY[intN] = w16(m_arrBY[intN] + smul(m_arrBX[intN]));
			m_arrBVX[intN] = w16(m_arrBVX[intN] - smul(m_arrBVY[intN]));
			m_arrBVY[intN] = w16(m_arrBVY[intN] + smul(m_arrBVX[intN]));
		}
		m_arrBX[intN] = w16(m_arrBX[intN] + (m_arrBVX[intN] >> 3));
		m_arrBY[intN] = w16(m_arrBY[intN] + (m_arrBVY[intN] >> 3) + m_intFwd);
		intSX = (m_arrBX[intN] >> 5) + 128;
		intSY = (m_arrBY[intN] >> 5) + 120;
		m_arrBSX[intN] = intSX; m_arrBSY[intN] = intSY;
		if (intN >= 24)
		{
			blnGone = (intSX < -16) || (intSX > 271) || (intSY < -16) || (intSY > 207);
			if (blnGone)
			{
				m_arrBOn[intN] = false;
				// (full screen) still on the wide screen: it flies on as a ghost
				if ((intSX >= -16 - m_intSL) && (intSX <= 271 + m_intSR) && (intSY >= -16) && (intSY <= 207))
				{
					intG = ghostFree();
					if (intG >= 0)
					{
						m_arrGX[intG] = m_arrBX[intN]; m_arrGY[intG] = m_arrBY[intN]; m_arrGVX[intG] = m_arrBVX[intN]; m_arrGVY[intG] = m_arrBVY[intN];
						m_arrGOn[intG] = true; m_arrGNew[intG] = true; m_arrGFoe[intG] = (intN < 72);
						m_objSlots.put(GHOST + intG, intSX + 24, intSY + 24, m_arrPatName[m_arrBPat[intN]], m_arrPatFrame[m_arrBPat[intN]], rowOf(m_arrBFl[intN]), 1, flagsOf(m_arrBFl[intN]));
						m_objSlots.setMover(GHOST + intG, ghostMover);
					}
				}
			}
		}
		objO_a.x = intSX + 24; objO_a.y = intSY + 24;
		return blnGone;
	}

	// GHOSTS (full screen only): a bullet or a shot the game is done with, still flying on the wide
	// screen. Only drawn: nothing hits them and they hit nothing

	// a ghost free (-1: none)
	function ghostFree()
	{
		var intResult = -1;
		for (var intK = 0; (intK < NGHOST) && (intResult < 0); intK++)
		{
			if (!m_arrGOn[intK]) { intResult = intK; }
		}
		return intResult;
	}

	// every ghost gone (blnFoes_a: only the enemy bullets)
	function ghostsOff(blnFoes_a)
	{
		for (var intK = 0; intK < NGHOST; intK++)
		{
			if (m_arrGOn[intK] && (m_arrGFoe[intK] || !blnFoes_a))
			{
				m_arrGOn[intK] = false;
				m_objSlots.hide(GHOST + intK);
			}
		}
	}

	// a ghost moves as skyMover moves a body (it was put where it is this frame, so it waits a
	// frame); done once it's off the wide screen
	function ghostMover(intSlot_a, objO_a)
	{
		var intN = intSlot_a - GHOST, intSX, intSY, blnGone = false;
		if (m_arrGNew[intN])
		{
			m_arrGNew[intN] = false;
		}
		else
		{
			if (m_intSmag !== 0)
			{
				m_arrGX[intN] = w16(m_arrGX[intN] - smul(m_arrGY[intN]));
				m_arrGY[intN] = w16(m_arrGY[intN] + smul(m_arrGX[intN]));
				m_arrGVX[intN] = w16(m_arrGVX[intN] - smul(m_arrGVY[intN]));
				m_arrGVY[intN] = w16(m_arrGVY[intN] + smul(m_arrGVX[intN]));
			}
			m_arrGX[intN] = w16(m_arrGX[intN] + (m_arrGVX[intN] >> 3));
			m_arrGY[intN] = w16(m_arrGY[intN] + (m_arrGVY[intN] >> 3) + m_intFwd);
			intSX = (m_arrGX[intN] >> 5) + 128;
			intSY = (m_arrGY[intN] >> 5) + 120;
			blnGone = (intSX < -16 - m_intSL) || (intSX > 271 + m_intSR) || (intSY < -16) || (intSY > 207);
			if (blnGone) { m_arrGOn[intN] = false; }
			objO_a.x = intSX + 24; objO_a.y = intSY + 24;
		}
		return blnGone;
	}

	// Step turn, speed: the stars and every body turned (turn: the sine of the angle x 256; + turns the
	// sky clockwise on the screen) and moved down by speed (32nds of a pixel), then by their own
	// speeds; then what touches: an enemy bullet on you (it goes), an enemy flying into you, your
	// shots on the enemies (a shot that hits one goes, and counts a hit on it)
	function skyStep(intTurn_a, intSpeed_a)
	{
		var intK, intT, intH, intF;
		m_intSmag = Math.abs(intTurn_a); m_blnSneg = (intTurn_a < 0);
		m_intFwd = intSpeed_a;
		m_blnHitF = false; m_intBumpN = 0;
		// the stars: the far ones (not white) at half speed; wrapped round the screen
		if ((m_intSL + m_intSR) > 0)
		{
			wideStars();
		}
		for (intK = 0; (intK < NSTAR) && ((m_intSL + m_intSR) === 0); intK++)
		{
			if (m_intSmag !== 0)
			{
				m_arrStX[intK] = w16(m_arrStX[intK] - smul(m_arrStY[intK]));
				m_arrStY[intK] = w16(m_arrStY[intK] + smul(m_arrStX[intK]));
			}
			intF = (m_arrStC[intK] === STARBRIGHT) ? m_intFwd : (m_intFwd >> 1);
			intT = w16(m_arrStY[intK] + intF);
			if (w16(intT - 2304) >= 0)
			{
				intT = w16(intT - 6144);
			}
			else if (w16(intT + 3840) < 0)
			{
				intT = w16(intT + 6144);
			}
			m_arrStY[intK] = intT;
			intH = (((m_arrStX[intK] >> 8) + 16) & 31) - 16;
			m_arrStX[intK] = (m_arrStX[intK] & 255) + intH * 256;
		}
		// the bodies move themselves (and every animation a step on)
		m_objSlots.step();
		// the enemies: on the screen? on you?
		for (intK = 0; intK < 16; intK++)
		{
			m_arrBVis[intK] = false;
			if (m_arrBOn[intK])
			{
				m_arrBVis[intK] = (m_arrBSX[intK] >= 0) && (m_arrBSX[intK] < 256) && (m_arrBSY[intK] >= 0) && (m_arrBSY[intK] < 192);
				if (m_arrBVis[intK] && m_objSlots.collideRect(SKY + intK, YOUX, YOUY, 0, 0)) { m_intBumpN = intK + 1; }
			}
		}
		// the enemy bullets: on you?
		for (intK = 24; intK < 72; intK++)
		{
			if (m_arrBOn[intK] && m_objSlots.collideRect(SKY + intK, YOUX, YOUY, 0, 0))
			{
				m_blnHitF = true;
				skyKill(intK);
			}
		}
		// your shots: on an enemy that's on the screen?
		for (intK = 72; intK < 104; intK++)
		{
			if (m_arrBOn[intK] && (m_arrBSX[intK] >= 0) && (m_arrBSX[intK] < 256) && (m_arrBSY[intK] >= 0) && (m_arrBSY[intK] < 256))
			{
				m_objSlots.collideRange(SKY + intK, SKY, 16, shotOn);
			}
		}
	}

	// (full screen) the stars as skyStep moves them, all three lots, wrapped round a field 768 wide
	// (so a star goes on across the old edges, and comes round again past the wide screen's)
	function wideStars()
	{
		var intK, intT, intF, intH;
		for (intK = 0; intK < NSTAR * 3; intK++)
		{
			if (m_intSmag !== 0)
			{
				m_arrStX[intK] = w16(m_arrStX[intK] - smul(m_arrStY[intK]));
				m_arrStY[intK] = w16(m_arrStY[intK] + smul(m_arrStX[intK]));
			}
			intF = (m_arrStC[intK] === STARBRIGHT) ? m_intFwd : (m_intFwd >> 1);
			intT = w16(m_arrStY[intK] + intF);
			if (w16(intT - 2304) >= 0)
			{
				intT = w16(intT - 6144);
			}
			else if (w16(intT + 3840) < 0)
			{
				intT = w16(intT + 6144);
			}
			m_arrStY[intK] = intT;
			intH = ((((m_arrStX[intK] >> 8) + 48) % 96 + 96) % 96) - 48;
			m_arrStX[intK] = (m_arrStX[intK] & 255) + intH * 256;
		}
	}

	// shot sprite intShot_a touches enemy sprite intEnemy_a: if the enemy's on the screen, a hit
	// (and the shot goes, and looks no further)
	function shotOn(intShot_a, intEnemy_a)
	{
		var intE = intEnemy_a - SKY, blnResult = false;
		if (m_arrBOn[intE] && m_arrBVis[intE])
		{
			m_arrBHits[intE] = Math.min(255, m_arrBHits[intE] + 1);
			skyKill(intShot_a - SKY);
			blnResult = true;
		}
		return blnResult;
	}

	// ====================================================================================================
	// THE SCREEN

	function hud()
	{
		m_objGrid.clear(0);
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		showScore();
		showWave();
		showLives();
		showCharge();
		showLeft();
	}

	function showScore()
	{
		text(4, 4, seven(m_intScore));
		m_blnScoreDirty = false;
	}

	function showWave()
	{
		text(12, 4, 'W' + rightStr('0' + String(m_intWave), 2));
	}

	function showLives()
	{
		for (var intK = 0; intK <= 4; intK++)
		{
			m_objGrid.put(31 + intK, 4, (intK < m_intLives) ? G.T_LIFE : G.T_HUD, 0);
		}
	}

	// the death blossom's charge: 4 cells; full, they flash
	function showCharge()
	{
		var intF;
		text(16, 4, 'DB');
		for (var intK = 0; intK <= 3; intK++)
		{
			intF = idiv((m_intCharge - intK * idiv(FULLCHARGE, 4)) * 8, idiv(FULLCHARGE, 4));
			if (intF < 0) { intF = 0; }
			if (intF > 8) { intF = 8; }
			if ((m_intCharge >= FULLCHARGE) && ((m_intFrames & 16) !== 0)) { intF = 0; }
			m_objGrid.put(18 + intK, 4, G.T_GAUGE + intF, 0);
		}
	}

	// the enemies still to beat, or the mothership's life (the Next works this in 16 bits, and from
	// the third mothership on its first cells read empty while it's healthy: here it's worked out
	// right)
	function showLeft()
	{
		var intF;
		if (m_blnBossOn)
		{
			for (var intK = 0; intK <= 7; intK++)
			{
				intF = idiv((m_intBossHp - idiv(intK * m_intBossMax, 8)) * 64, m_intBossMax);
				if (intF < 0) { intF = 0; }
				if (intF > 8) { intF = 8; }
				m_objGrid.put(23 + intK, 4, G.T_BOSSBAR + intF, 0);
			}
		}
		else
		{
			text(23, 4, 'LEFT ' + rightStr('0' + String(m_intRemain), 2) + ' ');
		}
	}

	// a message across the middle for t frames (0: until the next)
	function message(str_a, intY_a, intT_a)
	{
		m_objGrid.rect(4, intY_a, 32, 1, 0, 0);
		text(4 + idiv(32 - str_a.length, 2), intY_a, str_a);
		if (intT_a > 0) { m_intMsgT = intT_a; }
	}

	function clearMessages()
	{
		m_objGrid.rect(4, 6, 32, 24, 0, 0);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objSlots.hideRange(0, 24);
		skyReset();
		m_intWave = 1; m_intLives = 3; m_intScore = 0; m_intCharge = FULLCHARGE; m_blnBossOn = false; m_intRemain = 50;
		hud();
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		text(4, 4, 'HI ' + seven(m_intHiscore));
		message('D E A T H   B L O S S O M', 9, 0);
		message('TURN  O P    THRUST Q  BRAKE A', 12, 0);
		message('SPACE FIRE   N DEATH BLOSSOM', 13, 0);
		message('50 A WAVE.  EVERY 2 WAVES:', 15, 0);
		message('THE MOTHERSHIP', 16, 0);
		message('(C) 2026 CYBORG UNICORN', 26, 0);
		m_objPad.setControls([]);					// (a tap anywhere starts)
		m_intStep = 0;
		m_strState = 'title';
	}

	// the sky turns slowly round as it drifts past
	function titleStep()
	{
		skyStep(-3, 24);
		drawShip();
		m_intFrames = w16(m_intFrames + 1);
		m_intStep++;
		if (m_intStep === 30) { message('PRESS SPACE', 23, 0); }
		if (m_intStep === 60) { m_objGrid.rect(4, 23, 32, 1, 0, 0); m_intStep = 0; }
		if (fireDown() || (m_objPad.taps().length > 0)) { m_strState = 'titlerelease'; }
	}

	// a game: wave after wave until the last ship is lost
	function gameStart()
	{
		clearMessages();
		sfx(0, 200, -6, 15, 25, 0);
		m_intScore = 0; m_intLives = 3; m_intWave = 1; m_intCharge = FULLCHARGE; m_intNextLife = 50000;
		waveStart();
	}

	function gameOver()
	{
		var intK;
		if (m_intScore > m_intHiscore) { m_intHiscore = m_intScore; }
		message('GAME OVER', 14, 0);
		m_objPad.setControls([]);
		// the Next stops showing its own sprites (you, the mothership) and the explosions stop
		// where they are; the sky carries on drifting
		m_objSlots.unanimate(SP_BOSS);
		for (intK = 0; intK < NB; intK++)
		{
			m_objSlots.unanimate(SKY + 16 + intK);
		}
		m_intStep = 0;
		m_strState = 'over';
	}

	function overStep()
	{
		m_intStep++;
		skyStep(0, 16);
		if ((m_intStep >= 250) || ((m_intStep > 50) && (fireDown() || (m_objPad.taps().length > 0))))
		{
			clearMessages();
			titleStart();
		}
	}

	// ====================================================================================================
	// A WAVE: 50 enemies, or (every third) the mothership; until it's done, or the last ship lost

	function waveStart()
	{
		var intK;
		m_objSlots.hideRange(0, 24);
		skyReset();
		for (intK = 0; intK < NE; intK++)
		{
			m_arrEOn[intK] = false;
		}
		m_intCycle = idiv(m_intWave - 1, 3); m_intPh = (m_intWave - 1) % 3;
		m_intMost = Math.min(15, 8 + m_intCycle * 2 + m_intPh * 2);		// on screen at once: more each wave
		m_intAlive = 1; m_intInv = 100; m_intDeadT = 0; m_intCool = 0; m_intBlossT = 0; m_blnBlossWas = true; m_intFwdYou = 32; m_intTurnT = 0;
		m_blnBossOn = false; m_blnBossWas = false;
		m_intSpawnT = 60;
		hud();
		if (m_intPh === 2)
		{
			m_intToSpawn = 0; m_intRemain = 1;
			newBoss();
			message('THE MOTHERSHIP', 13, 120);
		}
		else
		{
			m_intToSpawn = 50; m_intRemain = 50;
			message('WAVE ' + String(m_intWave), 13, 120);
			message('50 OF THEM. GOOD LUCK.', 15, 120);
		}
		showLeft();
		m_intClearT = 0;
		m_objPad.setControls(ZONES);
		m_strState = 'wave';
	}

	function waveStep()
	{
		var intB, intK;
		playerMove();
		spawning();
		enemies();
		if (m_blnBossOn) { boss(); }
		booms();
		skyStep(m_intTurn, m_intFwdYou);
		if ((m_intAlive !== 0) && (m_intInv === 0) && (m_intBlossT === 0))
		{
			if (m_blnHitF) { die(); }
		}
		intK = m_intBumpN;
		if ((intK > 0) && (m_intAlive !== 0))
		{
			if (m_arrEOn[intK - 1] && (intK > 1)) { killEnemy(intK - 1, false); }
			if ((m_intInv === 0) && (m_intBlossT === 0)) { die(); }
		}
		drawShip();
		if (m_blnBossOn || m_blnBossWas) { drawBoss(); }
		if (m_blnScoreDirty && ((m_intFrames & 3) === 0)) { showScore(); }
		if ((m_intFrames & 7) === 4) { showCharge(); }
		if (m_blnBossOn && ((m_intFrames & 7) === 0)) { showLeft(); }
		if (m_intMsgT > 0)
		{
			m_intMsgT--;
			if (m_intMsgT === 0) { clearMessages(); }
		}
		m_intFrames = w16(m_intFrames + 1);
		if ((m_intAlive === 0) && (m_intDeadT === 0) && (m_intLives === 0))
		{
			gameOver();
		}
		else if (m_intRemain === 0)
		{
			m_intClearT++;
			if (m_intClearT === 30)
			{
				// (the Next works the bonus out in 16 bits: from the second mothership it came out
				// wrong - less than nothing - so here it's worked out in full)
				intB = (m_intCycle + 1) * 5000;
				if (m_intPh === 2) { intB = (m_intCycle + 1) * 20000; }
				addScore(intB);
				if (m_intPh === 2) { message('THE MOTHERSHIP IS DOWN', 13, 0); } else { message('WAVE ' + String(m_intWave) + ' CLEARED', 13, 0); }
				message('BONUS ' + String(intB), 15, 0);
				sfx(0, 100, -2, 15, 50, 0);
			}
			if (m_intClearT > 170)
			{
				clearMessages();
				if ((m_intAlive === 0) && (m_intLives === 0))
				{
					// the last ship went down while the wave was being cleared: that's the end (the
					// Next carried on into the next wave with no ships left, and the game never ended)
					gameOver();
				}
				else
				{
					m_intWave++;
					waveStart();
				}
			}
		}
	}

	function addScore(intN_a)
	{
		m_intScore += intN_a;
		m_blnScoreDirty = true;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 50000;
			if (m_intLives < 5)
			{
				m_intLives++; showLives();
				sfx(1, 50, -1, 14, 30, 0);
			}
		}
	}

	// ====================================================================================================
	// YOU

	function playerMove()
	{
		var intMX = 0, intMY = 0, blnBl;
		if (m_intCharge < FULLCHARGE) { m_intCharge++; }
		m_intTurn = 0;
		if (m_intAlive === 0)
		{
			if (m_intFwdYou > 16) { m_intFwdYou--; }
			if (m_intDeadT > 0)
			{
				m_intDeadT--;
				if ((m_intDeadT === 0) && (m_intLives > 0)) { m_intAlive = 1; m_intInv = 150; m_intFwdYou = 32; }
			}
		}
		else
		{
			if (down(K_O) || down(K_Z) || down(K_5) || down(KEY_LEFT)) { intMX = -1; }
			if (down(K_P) || down(K_C) || down(K_8) || down(KEY_RIGHT)) { intMX = 1; }
			if (down(K_Q) || down(K_S) || down(K_7) || down(KEY_UP)) { intMY = -1; }
			if (down(K_A) || down(K_X) || down(K_6) || down(KEY_DOWN)) { intMY = 1; }
			// turning: it builds up over a few frames, so a tap is a small nudge
			if (intMX === 0)
			{
				m_intTurnT = 0;
			}
			else
			{
				if (m_intTurnT < 10) { m_intTurnT++; }
				m_intTurn = -intMX * (4 + m_intTurnT);				// your ship turns right: the sky turns left round you
			}
			// thrust and brake
			if (intMY < 0)
			{
				if (m_intFwdYou < 80) { m_intFwdYou += 2; }
			}
			else if (intMY > 0)
			{
				if (m_intFwdYou > 8) { m_intFwdYou -= 2; }
			}
			else
			{
				if (m_intFwdYou < 32) { m_intFwdYou++; }
				if (m_intFwdYou > 32) { m_intFwdYou--; }
			}
			// the guns: two shots from the wing tips
			if (m_intCool > 0) { m_intCool--; }
			if (fireDown() && (m_intCool === 0) && (m_intBlossT === 0))
			{
				skyShot(-192, -64, 0, -1792, P_SHOT);
				skyShot(192, -64, 0, -1792, P_SHOT);
				m_intCool = 6;
				sfx(0, 30, 4, 10, 4, 0);
			}
			// the death blossom
			blnBl = down(K_N) || down(K_B) || down(K_ENTER);
			if (blnBl && !m_blnBlossWas)
			{
				if ((m_intCharge >= FULLCHARGE) && (m_intBlossT === 0))
				{
					m_intCharge = 0; m_intBlossT = 40; m_intSpin = 0;
					skyClearBullets();
					sfx(2, 31, 0, 15, 60, 1);
					sfx(1, 200, -8, 15, 40, 0);
				}
				else
				{
					sfx(1, 400, 0, 8, 6, 0);
				}
			}
			m_blnBlossWas = blnBl;
			if (m_intBlossT > 0)
			{
				m_intBlossT--;
				if ((m_intBlossT === 36) || (m_intBlossT === 26) || (m_intBlossT === 16)) { blossom(m_intBlossT); }
				if (m_intBlossT === 0) { m_intInv = 30; }
			}
			if (m_intInv > 0) { m_intInv--; }
		}
	}

	// one ring of the death blossom: ten orbs every way
	function blossom(intT_a)
	{
		var intA = intT_a * 3, intM;
		for (intM = 0; intM <= 9; intM++)
		{
			skyShot(0, 0, idiv(sn(intA) * 200, 16), idiv(sn(intA + 64) * 200, 16), P_ORB);
			intA += 26;
		}
		skyClearBullets();
		sfx(0, 10, 6, 15, 12, 1);
	}

	// your ship (its engines flicker by themselves; it blinks while it can't be hit; it spins round
	// by quarter turns while the death blossom goes)
	function drawShip()
	{
		var intFl = 0, intK;
		if ((m_intAlive === 0) || ((m_intInv & 4) !== 0))
		{
			m_objSlots.hide(SP_SHIP);
		}
		else
		{
			if (m_intBlossT > 0)
			{
				m_intSpin = (m_intSpin + 1) & 7;
				intK = idiv(m_intSpin, 2);
				if (intK === 1) { intFl = NX_ROTATE; }
				if (intK === 2) { intFl = NX_MIRRORX | NX_MIRRORY; }
				if (intK === 3) { intFl = NX_ROTATE | NX_MIRRORX | NX_MIRRORY; }
			}
			m_objSlots.put(SP_SHIP, 152, 144, 'ship', undefined, 'blossom_s0', 1, flagsOf(intFl));
			m_objSlots.animate(SP_SHIP, 1);
		}
	}

	function die()
	{
		m_intAlive = 0; m_intDeadT = 100; m_intLives--; showLives();
		boom(0, 0);
		boom(-320, -192);
		boom(320, 192);
		skyClearBullets();
		m_objSlots.hide(SP_SHIP);
		sfx(2, 31, 0, 15, 70, 1);
		sfx(1, 300, 10, 15, 50, 0);
	}

	// ====================================================================================================
	// THE ENEMIES

	// new ones come in from all round, well off the screen
	function spawning()
	{
		var intN, intLive = 0, intA, intR, intKind, blnDone = false;
		if (m_intToSpawn > 0)
		{
			if (m_intSpawnT > 0)
			{
				m_intSpawnT--;
			}
			else
			{
				for (intN = 1; intN < NE; intN++)
				{
					if (m_arrEOn[intN]) { intLive++; }
				}
				if (intLive >= m_intMost)
				{
					m_intSpawnT = 10;
				}
				else
				{
					for (intN = 1; (intN < NE) && !blnDone; intN++)
					{
						if (!m_arrEOn[intN])
						{
							blnDone = true;
							intR = rnd(100);
							intKind = KDART;
							if (intR < 30 + m_intCycle * 5) { intKind = KWEAVER; }
							if (intR < 10 + m_intCycle * 4) { intKind = KBRUTE; }
							intA = rnd(256);
							newEnemy(intN, intKind, idiv(sn(intA) * 170, 127), idiv(sn(intA + 64) * 140, 127));
							m_intToSpawn--;
							m_intSpawnT = Math.max(12, 30 - m_intCycle * 5);
						}
					}
				}
			}
		}
	}

	// enemy n of a kind at x, y (pixels from you)
	function newEnemy(intN_a, intKind_a, intX_a, intY_a)
	{
		var intA, intSp;
		m_arrEOn[intN_a] = true; m_arrEKind[intN_a] = intKind_a; m_arrEFlash[intN_a] = 0;
		m_arrESide[intN_a] = 1 - 2 * rnd(2);
		if (intKind_a === KDART)
		{
			m_arrEHP[intN_a] = 1; intSp = 46; m_arrEFire[intN_a] = 60 + rnd(60);
		}
		else if (intKind_a === KWEAVER)
		{
			m_arrEHP[intN_a] = 3; intSp = 40; m_arrEFire[intN_a] = 80 + rnd(60);
		}
		else
		{
			m_arrEHP[intN_a] = 8; intSp = 22; m_arrEFire[intN_a] = 90 + rnd(60);
		}
		intSp += m_intCycle * 6;
		m_arrESpd[intN_a] = intSp;
		intA = aim(intX_a, intY_a, 0, 0);
		skySpawn(intN_a, intX_a * 32, intY_a * 32, idiv(sn(intA) * intSp, 16), idiv(sn(intA + 64) * intSp, 16), P_NONE, 0);
		face(intN_a, intA);
	}

	function enemies()
	{
		var intN, intH;
		for (intN = 1; intN < NE; intN++)
		{
			if (m_arrEOn[intN])
			{
				intH = skyHits(intN);
				if ((m_intBlossT > 0) && m_arrBVis[intN]) { intH++; }
				if (intH > 0)
				{
					m_arrEHP[intN] -= intH; m_arrEFlash[intN] = 3;
					if (m_arrEHP[intN] <= 0)
					{
						killEnemy(intN, true);
					}
					else
					{
						sfx(1, 60, -4, 11, 4, 0);
					}
				}
				if (m_arrEOn[intN])
				{
					if (((m_intFrames + intN) & 3) === 0) { steer(intN); }
					if (m_arrEFlash[intN] > 0)
					{
						m_arrEFlash[intN]--;
						if (m_arrEFlash[intN] === 0) { steer(intN); }
					}
					m_arrEFire[intN]--;
					if (m_arrEFire[intN] <= 0) { shoot(intN); }
				}
			}
		}
	}

	// enemy n: turn towards what it wants, a little at a time; its sprite faces the way it flies
	function steer(intN_a)
	{
		var intX = idiv(m_arrBX[intN_a], 32), intY = idiv(m_arrBY[intN_a], 32);
		var intH = aim(0, 0, m_arrBVX[intN_a], m_arrBVY[intN_a]);
		var intT = aim(intX, intY, 0, 0);
		var intDist = Math.abs(intX) + Math.abs(intY);
		var intMT, intD;
		if (m_arrEKind[intN_a] === KDART)
		{
			intMT = 6;
			if (intDist < 40) { intT = intH; }					// committed: it flies on past
		}
		else if (m_arrEKind[intN_a] === KWEAVER)
		{
			intMT = 10;
			if (intDist > 110) { intT += m_arrESide[intN_a] * 24; } else { intT += m_arrESide[intN_a] * 64; }
		}
		else
		{
			intMT = 4;
			if (intDist < 70) { intT += m_arrESide[intN_a] * 64; }
		}
		intD = ((intT - intH + 128) & 255) - 128;
		if (intD > intMT) { intD = intMT; }
		if (intD < -intMT) { intD = -intMT; }
		intH = (intH + intD) & 255;
		skyVel(intN_a, idiv(sn(intH) * m_arrESpd[intN_a], 16), idiv(sn(intH + 64) * m_arrESpd[intN_a], 16));
		face(intN_a, intH);
	}

	// enemy n's sprite for way h: 4 drawings (each 22.5 degrees on) turned by quarters
	function face(intN_a, intH_a)
	{
		var intD = idiv(intH_a + 8, 16) & 15;
		var intQ = idiv(19 - intD, 4) & 3;
		var intPat = (intD + 4 * intQ) & 15;
		var intFl = 0;
		if (m_arrEKind[intN_a] === KDART)
		{
			intPat += P_DART;
		}
		else if (m_arrEKind[intN_a] === KWEAVER)
		{
			intPat += P_WEAVER;
		}
		else
		{
			intPat += P_BRUTE;
		}
		if (intQ === 1) { intFl = NX_ROTATE; }
		if (intQ === 2) { intFl = NX_MIRRORX | NX_MIRRORY; }
		if (intQ === 3) { intFl = NX_ROTATE | NX_MIRRORX | NX_MIRRORY; }
		if (m_arrEFlash[intN_a] > 0) { intFl |= NX_PAL; }
		skyLook(intN_a, intPat, intFl);
	}

	// enemy n fires (only from on the screen)
	function shoot(intN_a)
	{
		var intX, intY, intA, intM, intSp, intC;
		if (m_arrEKind[intN_a] === KDART)
		{
			m_arrEFire[intN_a] = 90 + rnd(60) - m_intCycle * 10;
		}
		else if (m_arrEKind[intN_a] === KWEAVER)
		{
			m_arrEFire[intN_a] = 110 + rnd(60) - m_intCycle * 10;
		}
		else
		{
			m_arrEFire[intN_a] = 130 + rnd(60) - m_intCycle * 10;
		}
		if (m_arrEFire[intN_a] < 40) { m_arrEFire[intN_a] = 40; }
		if (m_arrBVis[intN_a] && (m_intAlive !== 0))
		{
			intX = m_arrBX[intN_a]; intY = m_arrBY[intN_a];
			intA = aim(idiv(intX, 32), idiv(intY, 32), 0, 0);
			intSp = 44 + m_intCycle * 8;
			if (m_arrEKind[intN_a] === KDART)
			{
				skyFire(intX, intY, intA, intSp + 12, P_BULLET, 2);
			}
			else if (m_arrEKind[intN_a] === KWEAVER)
			{
				for (intM = -1; intM <= 1; intM++)
				{
					skyFire(intX, intY, (intA + intM * 12) & 255, intSp, P_BULLET + 1, 3);
				}
			}
			else
			{
				intC = Math.min(14, 8 + m_intCycle * 2);
				intA = rnd(32);
				for (intM = 1; intM <= intC; intM++)
				{
					skyFire(intX, intY, intA & 255, intSp - 8, P_BULLET, 2);
					intA += idiv(256, intC);
				}
			}
			sfx(2, 120, -6, 10, 10, 0);
		}
	}

	function killEnemy(intN_a, blnScored_a)
	{
		var intX = m_arrBX[intN_a], intY = m_arrBY[intN_a];
		m_arrEOn[intN_a] = false;
		skyKill(intN_a);
		boom(intX, intY);
		m_intRemain--;
		if (m_intRemain < 0) { m_intRemain = 0; }
		showLeft();
		if (blnScored_a)
		{
			if (m_arrEKind[intN_a] === KDART)
			{
				addScore(100 * (m_intCycle + 1));
			}
			else if (m_arrEKind[intN_a] === KWEAVER)
			{
				addScore(200 * (m_intCycle + 1));
			}
			else
			{
				addScore(400 * (m_intCycle + 1));
			}
		}
		sfx(2, 31, 0, 14, 25, 1);
	}

	// ====================================================================================================
	// THE MOTHERSHIP (the sky's body 0: an unseen body with its hit box; its picture is sprite 1, four
	// times the Next's 16 x 16, drawn twice the size)

	function newBoss()
	{
		m_blnBossOn = true; m_blnBossWas = true;
		m_intBossMax = 300 + m_intCycle * 150; m_intBossHp = m_intBossMax;
		m_intBossAng = 0; m_intBossT = 0; m_intBossFl = 0;
		skySpawn(0, 0, -220 * 32, 0, 240, P_NONE, 0);
		m_arrEOn[0] = false;
	}

	function boss()
	{
		var intX = idiv(m_arrBX[0], 32), intY = idiv(m_arrBY[0], 32);
		var intH, intD, intM, intA, intSp, blnDown = false;
		intH = skyHits(0);
		if ((m_intBlossT > 0) && m_arrBVis[0] && ((m_intFrames & 3) === 0)) { intH += 4; }
		if (intH > 0)
		{
			m_intBossHp -= intH; m_intBossFl = 3;
			if ((m_intFrames & 3) === 0) { sfx(1, 60, -4, 11, 4, 0); }
			addScore(10 * intH);
			if (m_intBossHp <= 0) { bossDown(); blnDown = true; }
		}
		if (!blnDown)
		{
			// it keeps about 90 pixels off you, circling
			m_intBossT = w16(m_intBossT + 1);
			intD = Math.abs(intX) + Math.abs(intY);
			intA = aim(intX, intY, 0, 0);
			intM = 24 + m_intCycle * 4;
			if (intD > 140)
			{
				intA += 16;
			}
			else if (intD < 100)
			{
				intA += 128; intM = 56;						// too close: it backs off, quickly
			}
			else
			{
				intA += 64;
			}
			if ((m_intBossT & 7) === 0) { skyVel(0, idiv(sn(intA) * intM, 16), idiv(sn(intA + 64) * intM, 16)); }
			// its guns: a turning spiral all the time; fans at you; rings when it's hurt
			if (m_arrBVis[0] && (m_intAlive !== 0))
			{
				intX = m_arrBX[0]; intY = m_arrBY[0];
				intSp = 40 + m_intCycle * 6;
				m_intBossAng = (m_intBossAng + 5) & 255;
				// (from the ninth cycle's mothership, 8 - cycle is nought or less: the Next's Mod then
				// gives the spiral never, then every frame, and so does this)
				if (imod(m_intBossT, 8 - m_intCycle) === 0)
				{
					for (intM = 0; intM <= 3; intM++)
					{
						skyFire(intX, intY, (m_intBossAng + intM * 64) & 255, intSp, P_BULLET, 2);
					}
				}
				if (imod(m_intBossT, 90) === 45)
				{
					intA = aim(idiv(intX, 32), idiv(intY, 32), 0, 0) - 30;
					for (intM = 0; intM <= 5; intM++)
					{
						skyFire(intX, intY, intA & 255, intSp + 16, P_BULLET + 1, 3);
						intA += 12;
					}
					sfx(2, 120, -6, 11, 12, 0);
				}
				if ((m_intBossHp * 2 < m_intBossMax) && (imod(m_intBossT, 150) === 100))
				{
					intA = rnd(32);
					for (intM = 0; intM <= 15; intM++)
					{
						skyFire(intX, intY, intA & 255, intSp - 8, P_BULLET + 1, 3);
						intA += 16;
					}
				}
			}
		}
	}

	function bossDown()
	{
		var intX = m_arrBX[0], intY = m_arrBY[0];
		m_blnBossOn = false; m_blnBossWas = false;
		skyKill(0);
		m_objSlots.hideRange(SP_BOSS, 4);
		boom(intX, intY);
		boom(intX - 640, intY - 480);
		boom(intX + 640, intY - 320);
		boom(intX - 480, intY + 640);
		boom(intX + 480, intY + 480);
		m_intRemain = 0;
		skyClearBullets();
		m_objGrid.rect(23, 4, 8, 1, G.T_HUD, 0);
		sfx(2, 31, 0, 15, 90, 1);
		sfx(0, 40, 8, 15, 70, 0);
	}

	// the mothership's picture where its body is (its lights flash by themselves): hot when it's badly
	// hurt; white now and then when it's hit
	function drawBoss()
	{
		var intX, intY, intRow = 0;
		if (!m_blnBossOn)
		{
			m_objSlots.hideRange(SP_BOSS, 4);
		}
		else
		{
			intX = idiv(m_arrBX[0], 32) + 128; intY = idiv(m_arrBY[0], 32) + 120;
			if (m_intBossHp * 3 < m_intBossMax) { intRow = 4; }
			if (m_intBossFl > 0)
			{
				m_intBossFl--;
				if ((m_intFrames & 3) === 0) { intRow = 1; }			// hit: a flash now and then
			}
			m_objSlots.put(SP_BOSS, intX, intY, 'boss', undefined, 'blossom_s' + intRow, 2);
			m_objSlots.animate(SP_BOSS, 1);
		}
	}

	// ====================================================================================================
	// EXPLOSIONS (the sky's bodies 16-23): each plays through once by itself (its sprite's sequence)
	// and drifts with the sky

	function boom(intX_a, intY_a)
	{
		skySpawn(16 + m_intBNext, intX_a, intY_a, 0, 0, P_BOOM, 0);
		m_objSlots.animate(SKY + 16 + m_intBNext, 1, true);
		m_intBNext = (m_intBNext + 1) & 7;
	}

	// an explosion that's played through goes
	function booms()
	{
		for (var intN = 16; intN < 16 + NB; intN++)
		{
			if (m_arrBOn[intN] && !m_objSlots.isAnimated(SKY + intN)) { skyKill(intN); }
		}
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		Wide();
		if (m_blnLoaded)
		{
			switch (m_strState)
			{
				case 'start': titleStart(); break;
				case 'title': titleStep(); break;
				case 'titlerelease': if (!fireDown()) { gameStart(); } break;		// (the Next waits here, the sky still)
				case 'wave': waveStep(); break;
				case 'over': overStep(); break;
				default: break;
			}
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
			m_intSL = Math.min(intL, WIDEMAX); m_intSR = Math.min(intR, WIDEMAX);
			m_objSlots.setClip(VIEW.x - m_intSL, VIEW.y + 8, VIEW.w + m_intSL + m_intSR, VIEW.h - 8);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var intK, intX;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			// the stars (Layer 2), under the tiles, under the sprites (full screen: all three lots, as
			// far as the wide screen shows them)
			if ((m_intSL + m_intSR) > 0)
			{
				for (intK = 0; intK < NSTAR * 3; intK++)
				{
					intX = (m_arrStX[intK] >> 5) + 128;
					if ((intX >= -m_intSL) && (intX < 256 + m_intSR))
					{
						objContext_a.fillStyle = m_arrStCSS[intK];
						objContext_a.fillRect(VIEW.x + intX, VIEW.y + (m_arrStY[intK] >> 5) + 120, 1, 1);
					}
				}
			}
			for (intK = 0; (intK < NSTAR) && ((m_intSL + m_intSR) === 0); intK++)
			{
				objContext_a.fillStyle = m_arrStCSS[intK];
				objContext_a.fillRect(VIEW.x + (m_arrStX[intK] >> 5) + 128, VIEW.y + (m_arrStY[intK] >> 5) + 120, 1, 1);
			}
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
		}
	};

	// a library sprite: where its frames are (frame n is n - 1 cells right), what it does on its own
	// (sequence, delay) and the part of it that counts in a collision (a square about its middle).
	// The hit boxes are the Next's distances: a shot hits an enemy within its size (dart and weaver
	// 7, brute 8, the mothership 26); an enemy flies into you within its size less 3; a bullet gets
	// you within 4
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a, fltHB_a)
	{
		var intCW = objCell_a.w * 16, intCH = objCell_a.h * 16;
		return { name:strName_a, classes:'blossom', imagename:'blossom_s0', x:0, y:0, w:intCW, h:intCH, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intCW, imageh:intCH,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:fltHB_a };
	}

	this.run = function()
	{
		setup();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			sprite('ship', G.S_SHIP, [1, 2, -1], 3, 0),					// engines flickering
			sprite('shot', G.S_SHOT, [1, 0], 1, 6),
			sprite('orb', G.S_ORB, [1, 0], 1, 6),
			sprite('bullet', G.S_BULLET, [1, 0], 1, 9),					// 1 small, 2 big
			sprite('boom', G.S_BOOM, BOOMSEQ, 1, 0),					// once through, then done
			sprite('dart', G.S_DART, [1, 0], 1, 8),						// 0, 22.5, 45, 67.5 degrees round from pointing down
			sprite('weaver', G.S_WEAVER, [1, 0], 1, 8),
			sprite('brute', G.S_BRUTE, [1, 0], 1, 10),
			sprite('boss', G.S_BOSS, [1, 2, -1], 8, 0),					// 32 x 32, drawn twice the size; lights flashing
			{ name:'bossbody', classes:'blossom', imagename:'', x:0, y:0, w:16, h:16, imagex:0, imagey:0, imagew:16, imageh:16,
				sequence:[1, 0], delay:1, collisiontype:'hb', hbx:0, hby:0, hbsize:46 } ]);	// the mothership's body: not drawn
		m_objSlots.setClip(VIEW.x, VIEW.y + 8, VIEW.w, VIEW.h - 8);			// (the Next's sprite clip window: the paper under the HUD)
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['blossom_t0'], first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:[], showalways:false, gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:K_SPACE, fire2:K_N } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('blossom'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			m_strState = 'start';
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, screenmode: 'ask', cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new blossomGame();
g_objGame.run();
