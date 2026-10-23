// DEFENDER HELLGATE - ported from the ZX Spectrum Next game (NTC BASIC: Main.bas, Bul.cls,
// FastSpr.cls, FastL2.cls, Scroll.cls, Sfx.cls, L2.cls; the DEFHELLV build: with Speech.cls's voice).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Defender meets bullet hell. DEFENDER's world, landers, mutants, baiter and humanoids; all of
// Stargate's cast (bombers, pods and swarmers, firebombers and fireballs, dynamos and space hums,
// Yllabian space guppies, Phred, Big Red and munchies), its wave line-ups, Inviso and its gate
// (the HELLGATE); MECHRA's pickups, power levels 1-5, the guard, the HIT chain and bullet hell; a
// level every 8 humanoids saved and every fifth level a boss level of giant mechs. It never ends.
//
// Keys (the Next's): Q / A altitude, O / P thrust, Space or Z laser, B or M smart bomb, G guard,
// I or N (held) Inviso, H hyperspace. A game pad (the Next's joystick): the stick, fire 1 the
// laser, fire 2 smart bomb.
//
// As on the Next: the scanner, the stars and the landscape are Layer 2 (a JPixelScreen), the sky
// and the ground scrolled at their own speeds as the copper does (Scroll.cls: painted in bands);
// the words are the tilemap (a JTileGrid, a palette row per pen); everything that moves is a
// hardware sprite - JSpriteSlots numbered as the Next's (0 the ship, 1 the guard, 2 the HELLGATE,
// 3-10 the humanoids, 11-26 the enemies, 27-32 the explosions, 33-38 the pickups, 39 and 15 the two
// giant mechs on the screen, 54-105 Bul.cls's 52 enemy bullets, 106-127 its 22 laser shots). After
// them, drawn as nothing, Bul.cls's 24 target boxes (128-151) and the ship's middle (152), so its
// tests are questions of what touches what. A library sprite is what a thing is: its animation
// (sequence and delay, as the original picks its frames) and its hit box, sized so the questions
// are the original's tests exactly. The bullets and the shots move with one showRange each, their
// places from Bul.cls's own fixed point sums. One game step (the Next's frame) every iteration of
// the 50 a second, as the Next runs it.
function defhellGame()
{
	var m_objThis = this;

	var GAMEX = 64, XRES = 448, YRES = 256;
	var VIEW = { x:96, y:32, w:256, h:192 };		// the part of the screen the game uses: the canvas shows only this
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_SPACE = 32, K_Z = 90, K_B = 66, K_M = 77, K_G = 71, K_I = 73, K_N = 78, K_H = 72;
	// the voice's keys (the DEFHELLV build): V off / on, 0 off, 1 (quiet) to 5 (full)
	var K_V = 86, K_0 = 48, K_1 = 49, K_2 = 50, K_3 = 51, K_4 = 52, K_5 = 53;
	// the voice's clips (data-defhell-voice.js has them in this order)
	var V_TAKEN = 0, V_LOST = 1, V_CAUGHT = 2, V_SAVED = 3, V_WARNING = 4, V_MECHS = 5, V_MECHDOWN = 6;
	var V_DESTROY = 7, V_HELLGATE = 8, V_WARP = 9, V_SMART = 10, V_POWERUP = 11, V_MAXPOWER = 12;
	var V_LEVELUP = 13, V_PLANET = 14, V_RESTORED = 15, V_WAVE = 16, V_WAVEDONE = 17, V_DOGFIGHT = 18;
	var V_SHOWDOWN = 19, V_GUARD = 20, V_INVISO = 21, V_HYPER = 22, V_START = 23, V_GAMEOVER = 24;
	var vlev = 5, vOn = 5, vWas = 0;		// the voice's volume (0 off - 5), the volume V turns it back on at, V held last frame

	// World & Layer 2 screen (256 x 192, sprites offset +32, +32; y counts up)
	var WORLD_W = 1024, WORLD_MASK = 1023, PLAY_TOP = 30, PLAY_BOT = 146;
	// sprite patterns: DEFENDER's, the Stargate cast's (two frames each), the 4-bit half patterns
	var PAT_PLAYER = 0, PAT_LANDER = 1, PAT_MUTANT = 2, PAT_HUMAN = 3, PAT_FRAME2 = 5, PAT_BOOM = 10, PAT_BAITER = 14;
	var PAT_BOMBER = 16, PAT_POD = 18, PAT_SWARM = 20, PAT_FIREB = 22, PAT_FBALL = 24, PAT_DYNAMO = 26, PAT_HUM = 28;
	var PAT_GUPPY = 30, PAT_PHRED = 32, PAT_BIGRED = 34, PAT_MUNCH = 36, PAT_GATE = 38;
	var Q_ITEM = 80, Q_BIGP = 84, Q_GEM = 86, Q_GUARD = 88, Q_LASER = 120, Q_SHOT = 121, Q_PINK = 122, Q_BLUE = 123, Q_MINE = 124;
	var PAL_ITEM = 8, PAL_BOSS = 9, PAL_FX = 14, PAL_WHITE = 15;
	// hardware sprite slots (54-127: the bullets and the laser, Bul.cls); then the targets and the ship's middle
	var SLOT_PLAYER = 0, SLOT_GUARD = 1, SLOT_GATE = 2, SLOT_HUMAN0 = 3, SLOT_ENEMY0 = 11, SLOT_BOOM0 = 27, SLOT_ITEM0 = 33;
	var SLOT_BOSS0 = 39, SLOT_BOSS1 = 15, BUL0 = 54, SHOT0 = 106, TGT0 = 128, PROBE = 152, NSLOTS = 153;
	var NB = 52, NSH = 22, NT = 24;
	var MAX_HUMANS = 8, MAX_ENEMIES = 16, MAX_BOOMS = 6, MAX_ITEMS = 6, MECH_BOX = 16, MAX_MECHS = 5;
	var K_LANDER = 1, K_MUTANT = 2, K_BOMBER = 3, K_POD = 4, K_SWARM = 5, K_BAITER = 6, K_FIREB = 7;
	var K_FBALL = 8, K_DYNAMO = 9, K_HUM = 10, K_GUPPY = 11, K_PHRED = 12, K_BIGRED = 13, K_MUNCH = 14;
	var ST_WANDER = 1, ST_DESCEND = 2, ST_ABDUCT = 3;
	var H_DEAD = 0, H_GROUND = 1, H_GRABBED = 2, H_FALLING = 3, H_CARRIED = 4;
	var GATEX = 768, GATEY = 104;
	var COL_TERRAIN = 0xC8, COL_DIVIDER = 0x8B;
	// each enemy kind's patterns (the first; the second is +1, or + PAT_FRAME2 for the lander and mutant)
	var KPAT = [0, PAT_LANDER, PAT_MUTANT, PAT_BOMBER, PAT_POD, PAT_SWARM, PAT_BAITER, PAT_FIREB, PAT_FBALL, PAT_DYNAMO, PAT_HUM, PAT_GUPPY, PAT_PHRED, PAT_BIGRED, PAT_MUNCH];

	var m_objSprites = new JSprites();
	var m_objSlots = new JSpriteSlots(m_objSprites, NSLOTS);
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSteps = new JSteps();
	// Layer 2: 512 across, not the Next's 256, so a wide screen can show more of the world: the
	// landscape is a ring of 512 columns and the stars are drawn twice (256 apart), so the middle
	// 256 are exactly the Next's
	var L2W = 512;
	var m_objL2 = new JPixelScreen({ w:L2W, h:192 });
	// full screen (JCanvas's screenmode): how much more of the world shows left and right of the
	// Next's 256 (0 in the normal mode); the world drawn there is at most WIDEMAX each side
	var WIDEMAX = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:96, y:32, w:256, h:192 };
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	// which sprites move on through the original's waits: 'all', 'ship' (the ship blowing up), 'none'
	var m_strLive = 'all';

	// ---- Main.bas's globals (their names kept)
	var px = 0, py = 0, pvx = 0, pvy = 0, pdir = 1, psx = 88, cam_x = 0, pan = 0, old_prx = 0, old_pry = 0, thrust = 0, safeT = 0;
	var score = 0, nextBonus = 10000, lives = 3, bombs = 3, wave = 1, game_over = false, planet_dead = false;
	var fire_cd = 0, bomb_cd = 0, hyper_cd = 0, flash_bg = 0, frames = 0, f3 = 0, waveT = 0, hudDirty = 0, chaser = 0, msgT = 0;
	var cloak = 0, cloakOn = 0, gateT = 0, warp = 0;
	var power = 1, pNext = 0, pAll = 0, guards = 3, guardT = 0, guardWas = 0;
	var chain = 0, chainT = 0, level = 1, saved = 0, bossDone = 0, statsDirty = 0;
	var hx = [], hy = [], hstate = [], hcarrier = [], hdir = [], hfall = [], hvy = [], old_hrx = [], old_hry = [], hsv = [], humans_alive = 0;
	var ek = [], ex = [], ey = [], evx = [], evy = [], estate = [], etarget = [], ut = [], uf = [], ufr = [], old_erx = [], old_ery = [], esv = [];
	var gateV = 0, guardV = 0;
	var spawn_timer = 0, nuMax = MAX_ENEMIES, att = 0, tc = 0, freeN = 0;
	var q = [];
	var bx = [], by = [], bt = [];
	var ik = [], ix = [], iy = [], ivx = [], ivy = [], ia = [];
	var bossMode = 0, bossN = 0, mechsKilled = 0;
	var mcx = [], mcy = [], mhp = [], mdie = [], mfl = [], mkd = [], mrx = [], mry = [];
	var mN = 0, mLeft = 0, mT = 0, mDrift = 1, mMax = 0, setOn0 = 0, setOn1 = 0;
	var land = [], yh = [], ycol = [], tcam = 0, terOn = 0, terDead = false, terN = 256, mark0 = -1;
	var gx = 0, gy = 0, penc = [], txtPen = 2, atx = 0, aty = 0, rs = 0;
	var sn3 = [], sn24 = [], sn32 = [];
	var m_intBorder = 0, m_intSkyScroll = 0, m_intGroundScroll = 0;

	(function()
	{
		var intK;
		for (intK = 0; intK < MAX_HUMANS; intK++)
		{
			hx.push(0); hy.push(0); hstate.push(H_DEAD); hcarrier.push(-1); hdir.push(1); hfall.push(0); hvy.push(0); old_hrx.push(0); old_hry.push(0); hsv.push(0);
		}
		for (intK = 0; intK < MAX_ENEMIES; intK++)
		{
			ek.push(0); ex.push(0); ey.push(0); evx.push(0); evy.push(0); estate.push(0); etarget.push(-1); ut.push(0); uf.push(0); ufr.push(0);
			old_erx.push(0); old_ery.push(0); esv.push(0);
		}
		for (intK = 0; intK <= 14; intK++) { q.push(0); }
		for (intK = 0; intK < MAX_BOOMS; intK++) { bx.push(0); by.push(0); bt.push(0); }
		for (intK = 0; intK < MAX_ITEMS; intK++) { ik.push(0); ix.push(0); iy.push(0); ivx.push(0); ivy.push(0); ia.push(0); }
		for (intK = 0; intK < MAX_MECHS; intK++) { mcx.push(0); mcy.push(0); mhp.push(0); mdie.push(0); mfl.push(0); mkd.push(0); mrx.push(0); mry.push(0); }
	})();

	// ====================================================================================================
	// BASIC AS NTC DOES IT

	// \ : integer division, towards 0
	function idiv(intA_a, intB_a)
	{
		var fltQ = intA_a / intB_a;
		return (fltQ < 0) ? Math.ceil(fltQ) : Math.floor(fltQ);
	}

	// an Integer (16 bits, wrapping)
	function int16(int_a)
	{
		return (int_a << 16) >> 16;
	}

	function sgn(int_a)
	{
		var intR = 0;
		if (int_a > 0) { intR = 1; }
		if (int_a < 0) { intR = -1; }
		return intR;
	}

	// a 32-bit multiply that wraps, as a Long does (ES5: no Math.imul)
	function mul32(intA_a, intB_a)
	{
		var intAH = (intA_a >>> 16) & 0xFFFF, intAL = intA_a & 0xFFFF;
		var intBH = (intB_a >>> 16) & 0xFFFF, intBL = intB_a & 0xFFFF;
		return ((intAL * intBL) + (((intAH * intBL + intAL * intBH) << 16) >>> 0)) | 0;
	}

	// the original's own random numbers (the same landscape and stars every time)
	function Rand(intN_a)
	{
		rs = (mul32(rs, 1103515245) + 12345) & 0x7FFFFFFF;
		return Math.floor(rs / 65536) % intN_a;
	}

	function strS(int_a)
	{
		return strBasic(int_a);
	}

	// Mid$(Str$(n), 2)
	function trimS(int_a)
	{
		return strBasic(int_a).substr(1);
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function Sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a !== 0);
	}

	// ====================================================================================================
	// THE ORIGINAL'S CPC-STYLE STATEMENTS

	function SetPens()
	{
		var strP = '000 003 224 028 031 226 252 255 146 002 224 031 028 226 252 255';
		for (var intK = 0; intK <= 15; intK++)
		{
			penc[intK] = parseInt(strP.substr(intK * 4, 3), 10);
		}
	}

	function Pen(intN_a)
	{
		switch (intN_a)
		{
			case 14: txtPen = 3; break;
			case 11: txtPen = 4; break;
			case 10: txtPen = 5; break;
			case 12: txtPen = 6; break;
			case 13: txtPen = 7; break;
			default: txtPen = 2; break;
		}
	}

	// the border's colour: on the Next round the paper - outside the canvas here, so only kept
	function Border(intN_a)
	{
		m_intBorder = intN_a & 7;
	}

	function At(intX_a, intY_a)
	{
		atx = intX_a + 3; aty = intY_a + 3;
	}

	function PrintS(str_a)
	{
		m_objGrid.text(atx, aty, str_a, txtPen);
		atx += str_a.length;
	}

	function ClsAll()
	{
		m_objGrid.clear(0, 0);
		m_objL2.rect(0, 0, L2W, 192, 0);
		for (var intK = 0; intK < L2W; intK++)
		{
			ycol[intK] = -1;
		}
		terOn = 0;
	}

	function Plot(intX_a, intY_a, intC_a)
	{
		gx = intX_a; gy = intY_a;
		if ((intX_a >= 0) && (intX_a < 256) && (intY_a >= 0) && (intY_a < 192)) { m_objL2.plot(intX_a, 191 - intY_a, penc[intC_a & 15]); }
	}

	function Draw(intX_a, intY_a, intC_a)
	{
		m_objL2.line(gx, 191 - gy, intX_a, 191 - intY_a, penc[intC_a & 15]);
		gx = intX_a; gy = intY_a;
	}

	function L2Plot(intX_a, intY_a, intC_a)
	{
		if ((intX_a >= 0) && (intX_a < 256) && (intY_a >= 0) && (intY_a < 192)) { m_objL2.plot(intX_a, intY_a, intC_a); }
	}

	// L2.Big x, y, s, z, c1, c2: the words z times the size, c1 on top shading to c2, over a shadow
	// (colour 0) two pixels down and right; the letters from the font (tile colour 1)
	function L2Big(intX_a, intY_a, str_a, intZ_a, intC1_a, intC2_a)
	{
		var intPass, intSh, intK, intR, intB, intI, intRun, intCol;
		for (intPass = 0; intPass <= 1; intPass++)
		{
			intSh = (1 - intPass) * 2;
			for (intK = 1; intK <= str_a.length; intK++)
			{
				for (intR = 0; intR <= 7; intR++)
				{
					intB = DH_FONT[(str_a.charCodeAt(intK - 1) & 127) * 8 + intR];
					intCol = 0;
					if (intPass !== 0) { intCol = (intR < 4) ? intC1_a : intC2_a; }
					intI = 0;
					while (intB !== 0)
					{
						if ((intB & 128) !== 0)
						{
							intRun = 0;
							while ((intB & 128) !== 0)
							{
								intRun++; intB = (intB * 2) & 255;
							}
							m_objL2.rect(intX_a + ((intK - 1) * 8 + intI) * intZ_a + intSh, intY_a + intR * intZ_a + intSh, intRun * intZ_a, intZ_a, intCol);
							intI += intRun;
						}
						else
						{
							intI++; intB = (intB * 2) & 255;
						}
					}
				}
			}
		}
	}

	function ScrollShow(intStars_a, intGround_a)
	{
		m_intSkyScroll = intStars_a & 255; m_intGroundScroll = intGround_a & (L2W - 1);
	}

	// ====================================================================================================
	// THE SPRITES (FastSpr.cls's, Spr8Big; the slots numbered as the Next's)

	var m_objPose = {};

	// FastSpr.Put8: an 8-bit pattern sprite centred at x, y (DEFENDER's: x 0-255, y up), mirrored
	function Put8(intSlot_a, intX_a, intY_a, strName_a, blnFlip_a)
	{
		m_objSlots.put(intSlot_a, intX_a + 24, 215 - intY_a, strName_a, undefined, 'dh_s8', 1, blnFlip_a ? SPRITE_MIRRORX : 0);
	}

	// FastSpr.Put4: a 4-bit sprite centred at x, y in palette row pal, twice the size
	function Put4(intSlot_a, intX_a, intY_a, strName_a, intPal_a, intScale_a)
	{
		var intOff = 8 * intScale_a;
		m_objSlots.put(intSlot_a, intX_a + 32 - intOff, 223 - intOff - intY_a, strName_a, undefined, 'dh_q' + intPal_a, intScale_a, 0);
	}

	// what a sprite is doing: the loop of its sequence that starts at step n (carries on if it's
	// already on it)
	function Pose(intSlot_a, intStep_a)
	{
		m_objSlots.animate(intSlot_a, intStep_a);
	}

	function HideSprite(intSlot_a)
	{
		m_objSlots.hide(intSlot_a);
	}

	function HideAllSprites()
	{
		m_objSlots.hideRange(0, 128);
		BulReset();
	}

	// the ship's middle, for the questions about what touches it
	function Probe()
	{
		m_objSlots.put(PROBE, psx + 24, 215 - py, 'probe', 41, 'dh_s8');
	}

	// ====================================================================================================
	// BUL.CLS: 52 enemy bullets and 22 laser shots. Coordinates are the paper's (0-255 across, 0-191
	// down), positions centres; the sprite's corner is 24 up and left (+ 32 for the border)

	var SIN = [0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3];
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];

	// enemy bullets: on, x (1/256ths of a pixel, the screen it's on included: -2 .. 2 screens), y
	// (1/256ths, 16 bits), speeds, pattern, palette; where it's drawn
	var bon = [], bX = [], bY = [], bvx = [], bvy = [], bpat = [], bdx = [], bdy = [];
	// shots: on, x, y (bytes), speeds (signed bytes), pattern
	var son = [], shx = [], shy = [], svx = [], svy = [], spat = [];
	// the targets: on, hits
	var ton = [], thits = [];
	var hitF = 0, spk = 0;

	function Sin(intA_a)
	{
		var intA = intA_a & 255;
		return (intA < 128) ? SIN[intA] : -SIN[intA - 128];
	}

	// sin(a) * spd / 8 as the Z80 does it (the size multiplied, shifted, the sign put back)
	function SinSpd(intA_a, intSpd_a)
	{
		var intS = Sin(intA_a);
		var intM = ((Math.abs(intS) * (intSpd_a & 255)) & 0xFFFF) >> 3;
		return (intS < 0) ? -intM : intM;
	}

	function BulReset()
	{
		var intN;
		for (intN = 0; intN < NB; intN++) { bon[intN] = 0; bdx[intN] = 0; bdy[intN] = 0; }
		for (intN = 0; intN < NSH; intN++) { son[intN] = 0; shx[intN] = 0; shy[intN] = 0; }
		for (intN = 0; intN < NT; intN++) { ton[intN] = 0; thits[intN] = 0; }
		m_objSlots.hideRange(BUL0, NB + NSH);
		m_objSlots.hideRange(TGT0, NT);
	}

	// Clear(): every enemy bullet gone: how many there were
	function BulClear()
	{
		var intC = 0;
		for (var intN = 0; intN < NB; intN++)
		{
			if (bon[intN] !== 0)
			{
				bon[intN] = 0; intC++;
				HideSprite(BUL0 + intN);
			}
		}
		return intC;
	}

	// Fire x, y, a, spd, pat, pal: an enemy bullet from x, y going way a (0 down, 64 right, 128 up,
	// 192 left) at spd sixteenths of a pixel a frame
	function BulFire(intX_a, intY_a, intA_a, intSpd_a, intPat_a, intPal_a)
	{
		var intR = -1, intN;
		for (intN = 0; (intN < NB) && (intR < 0); intN++)
		{
			if (bon[intN] === 0) { intR = intN; }
		}
		if (intR >= 0)
		{
			bon[intR] = 1;
			bvx[intR] = SinSpd(intA_a, intSpd_a);
			bvy[intR] = SinSpd(intA_a + 64, intSpd_a);
			bX[intR] = (intX_a & 255) * 256 + 128;
			bY[intR] = (intY_a & 255) * 256 + 128;
			// its look now; it's shown from its first move
			m_objSlots.put(BUL0 + intR, 0, 0, 'bul', (intPat_a & 127) - 79, 'dh_q' + (intPal_a & 15));
			HideSprite(BUL0 + intR);
		}
	}

	// Shot x, y, vx, vy, pat: a laser shot from x, y flying vx across and vy down a frame
	function BulShot(intX_a, intY_a, intVX_a, intVY_a, intPat_a)
	{
		var intR = -1, intN;
		for (intN = 0; (intN < NSH) && (intR < 0); intN++)
		{
			if (son[intN] === 0) { intR = intN; }
		}
		if (intR >= 0)
		{
			son[intR] = 1;
			shx[intR] = intX_a & 255; shy[intR] = intY_a & 255;
			svx[intR] = (intVX_a << 24) >> 24; svy[intR] = (intVY_a << 24) >> 24;
			spat[intR] = intPat_a;
		}
	}

	// Box n, x, y, hw, hh: target n this frame, centred at x, y, hw across and hh down to its edges
	function BulBox(intN_a, intX_a, intY_a, intHW_a, intHH_a)
	{
		ton[intN_a] = 1;
		m_objSlots.put(TGT0 + intN_a, intX_a + 24, intY_a + 24, 'tgt' + intHW_a + '_' + intHH_a, 41, 'dh_s8');
	}

	// Off n: target n gone (its hits kept until Hits reads them)
	function BulOff(intN_a)
	{
		ton[intN_a] = 0;
		HideSprite(TGT0 + intN_a);
	}

	// Hits(n): the shots that hit target n since the last Hits(n)
	function BulHits(intN_a)
	{
		var intR = thits[intN_a];
		thits[intN_a] = 0;
		return intR;
	}

	// Aim(x, y, tx, ty): the way (0-255, as Fire's) from x, y to tx, ty
	function BulAim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a;
		var intAX = Math.abs(intDX), intAY = Math.abs(intDY);
		var intT, intR = 0;
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

	// Step px, py, pan: every bullet and shot moved (the view moved pan pixels: they move the other
	// way with the ground), the bullets on the ship? (its middle: within 3 both ways), the shots
	// into the targets (each its first)
	function BulStep(intPan_a)
	{
		var intPan = (intPan_a << 24) >> 24;
		var arrShots = [];
		hitF = 0; spk = 0;
		m_objSlots.showRange(BUL0, NB, function(intR_a)
		{
			var intX, intY;
			if (bon[intR_a] !== 0)
			{
				bX[intR_a] = bX[intR_a] + bvx[intR_a] - intPan * 256;
				intX = bX[intR_a] >> 8;
				bY[intR_a] = (bY[intR_a] + bvy[intR_a]) & 0xFFFF;
				intY = bY[intR_a] >> 8;
				if ((intX < -512) || (intX >= 768) || (intY < 46) || (intY >= 188))
				{
					bon[intR_a] = 0;
				}
				else
				{
					bdx[intR_a] = intX; bdy[intR_a] = intY;
				}
			}
			return bdx[intR_a] + 24;
		}, function(intR_a)
		{
			return bdy[intR_a] + 24;
		});
		// off the screen: flying, not drawn
		for (var intR = 0; intR < NB; intR++)
		{
			if ((bon[intR] === 0) || (bdx[intR] < 4 - m_intWL) || (bdx[intR] >= 252 + m_intWR)) { HideSprite(BUL0 + intR); }
		}
		Probe();
		if (m_objSlots.collideRange(PROBE, BUL0, NB).length > 0) { hitF = 1; }
		// the shots: x += vx - pan, y += vy; gone off the paper (a wide screen: off the world shown
		// either side of it, at most WIDEMAX)
		m_objSlots.showRange(SHOT0, NSH, function(intS_a)
		{
			var intX, intY;
			if (son[intS_a] !== 0)
			{
				intX = shx[intS_a] + (((svx[intS_a] - intPan) << 24) >> 24);
				intY = shy[intS_a] + svy[intS_a];
				if ((intX < 4 - Math.min(m_intWL, WIDEMAX)) || (intX >= 252 + Math.min(m_intWR, WIDEMAX)) || (intY < 46) || (intY >= 188))
				{
					son[intS_a] = 0;
				}
				else
				{
					shx[intS_a] = intX; shy[intS_a] = intY;
					arrShots.push(intS_a);
				}
			}
			return shx[intS_a] + 24;
		}, function(intS_a)
		{
			return shy[intS_a] + 24;
		});
		for (var intS = 0; intS < NSH; intS++)
		{
			if (son[intS] === 0) { HideSprite(SHOT0 + intS); }
		}
		processArray(arrShots, function(intS_a)
		{
			var intSlot = SHOT0 + intS_a;
			m_objSlots.put(intSlot, shx[intS_a] + 24, shy[intS_a] + 24, 'shot', spat[intS_a] - 79, 'dh_q' + PAL_FX, 1, (svx[intS_a] < 0) ? SPRITE_MIRRORX : 0);
			m_objSlots.collideRange(intSlot, TGT0, NT, function(intN_a, intM_a)
			{
				var intT = intM_a - TGT0;
				if (thits[intT] < 255) { thits[intT]++; }
				spk = 1;
				son[intS_a] = 0;
				HideSprite(intSlot);
				return true;
			});
		});
	}

	// ====================================================================================================
	// COORDINATE & TERRAIN HELPERS

	function MakeLand()
	{
		var intH = 14, intT = 14, intK;
		rs = 12345;
		for (intK = 0; intK <= 255; intK++)
		{
			if (intK % 16 === 0) { intT = 8 + Rand(23); }
			if (intH < intT) { intH = intH + 1 + Rand(3); }
			if (intH > intT) { intH = intH - 1 - Rand(3); }
			if (intH < 8) { intH = 8; }
			if (intH > 32) { intH = 32; }
			land[intK] = intH;
		}
		for (intK = 248; intK <= 255; intK++)
		{
			land[intK] = land[247] + idiv((land[0] - land[247]) * (intK - 247), 9);
		}
	}

	function GetTerrainY(intWX_a)
	{
		return planet_dead ? 6 : land[idiv(intWX_a, 4) & 255];
	}

	function WorldToScreenX(intWX_a, intCX_a)
	{
		var intD = (intWX_a - intCX_a) & WORLD_MASK;
		if (intD >= 512) { intD -= 1024; }
		return intD;
	}

	function WorldToRadarX(intWX_a)
	{
		return 64 + idiv((intWX_a - px + 512) & WORLD_MASK, 8);
	}

	function Sine1(intT_a)
	{
		var intU = intT_a & 127;
		return (intU < 64) ? intU * 2 - 64 : 192 - intU * 2;
	}

	function SinTables()
	{
		for (var intK = 0; intK <= 127; intK++)
		{
			sn3[intK] = idiv(Sine1(intK), 3); sn24[intK] = idiv(Sine1(intK), 24); sn32[intK] = idiv(Sine1(intK), 32);
		}
	}

	function UpdateHUD()
	{
		Pen(15); At(1, 1); PrintS(rightStr('000000' + trimS(score), 7));
		Pen(14); At(10, 1); PrintS('SHIPS' + strS(lives) + ' ');
		Pen(12); At(19, 1); PrintS('BOMBS' + strS(bombs) + ' ');
		Pen(11); At(27, 1); PrintS('WAVE' + strS(wave) + ' ');
		hudDirty = 0;
	}

	function ShowStats()
	{
		Pen(15); At(1, 3); PrintS('LV' + strS(level) + '  ');
		Pen(11); At(1, 4); PrintS('POW' + strS(power) + ' ');
		Pen(13); At(1, 5); PrintS('P' + strS(pNext) + '/10 ');
		Pen(12); At(26, 3); PrintS('GUARD' + strS(guards) + ' ');
		Pen(11); At(26, 4); PrintS('INV' + strS(idiv(cloak, 40)) + '  ');
		Pen(14); At(26, 5);
		if (chain > 1) { PrintS('HIT' + strS(chain) + '   '); } else { PrintS('       '); }
		statsDirty = 0;
	}

	function DrawStaticFrame()
	{
		ClsAll();
		m_objL2.rect(0, 43, L2W, 1, COL_DIVIDER);
		Plot(62, 152, 12);
		Draw(193, 152, 12);
		Draw(193, 182, 12);
		Draw(62, 182, 12);
		Draw(62, 152, 12);
		Stars();
		mark0 = -1;
		UpdateHUD();
		ShowStats();
	}

	function Stars()
	{
		var strC = '073146219255', intX, intY;
		rs = 777;
		for (var intK = 0; intK <= 59; intK++)
		{
			intX = Rand(256); intY = 46 + Rand(110);
			L2Plot(intX, intY, parseInt(strC.substr((intK % 4) * 3, 3), 10));
			m_objL2.plot(intX + 256, intY, parseInt(strC.substr((intK % 4) * 3, 3), 10));
		}
	}

	// ====================================================================================================
	// WAVE & ENTITY MANAGEMENT

	function ClearPlay()
	{
		var intI;
		HideAllSprites();
		for (intI = 0; intI < MAX_BOOMS; intI++) { bt[intI] = 0; }
		for (intI = 0; intI < MAX_HUMANS; intI++) { hsv[intI] = 0; old_hrx[intI] = 0; }
		gateV = 0; guardV = 0;
		for (intI = 0; intI < MAX_ENEMIES; intI++)
		{
			ek[intI] = 0; old_erx[intI] = 0; esv[intI] = 0;
			BulOff(intI);
			BulHits(intI);
		}
		for (intI = 0; intI < MAX_MECHS; intI++) { BulOff(MECH_BOX + intI); }
		ItemsClear();
		for (intI = 0; intI <= 14; intI++) { q[intI] = 0; }
	}

	function InitWave()
	{
		var intI;
		ClearPlay();
		DrawStaticFrame();
		px = 512; py = 96; pvx = 0; pvy = 0; pdir = 1; psx = 88; pan = 0;
		cam_x = (px - psx) & WORLD_MASK;
		old_prx = 128; old_pry = 0;
		safeT = 50; cloakOn = 0; gateT = 0; warp = 0; bossMode = 0;
		if ((wave === 1) || ((wave - 1) % 5 === 0))
		{
			if (wave > 1) { Message('THE PLANET IS RESTORED', 100); Say(V_RESTORED); }
			planet_dead = false;
			humans_alive = MAX_HUMANS;
			for (intI = 0; intI < MAX_HUMANS; intI++)
			{
				hx[intI] = (intI * 128 + 48) & WORLD_MASK;
				hstate[intI] = H_GROUND;
			}
		}
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			hcarrier[intI] = -1;
			if (hstate[intI] !== H_DEAD)
			{
				hstate[intI] = H_GROUND;
				hy[intI] = GetTerrainY(hx[intI]) + 6;
			}
			hdir[intI] = (Rand(2) !== 0) ? 1 : -1;
		}
		nuMax = MAX_ENEMIES;
		LineUp();
		spawn_timer = 10;
		waveT = 0; chaser = 0;
		for (intI = 1; intI <= 5; intI++)
		{
			if (q[K_LANDER] > 0) { q[K_LANDER]--; NewEnemy(K_LANDER); }
		}
		for (intI = 1; intI <= 4; intI++) { Arrive(); }
		att = Attackers(); tc = ToCome();
		UpdateHUD();
		if (wave % 10 === 5)
		{
			Message('YLLABIAN DOGFIGHT!', 100);
			Say(V_DOGFIGHT);
		}
		else if (wave % 10 === 0)
		{
			Message('FIREBOMBER SHOWDOWN!', 100);
			Say(V_SHOWDOWN);
		}
		else if (planet_dead)
		{
			Message('NO PLANET: MUTANTS!', 100);
		}
		else
		{
			Message('WAVE' + strS(wave), 60);
			if (wave === 1) { Say(V_START); } else { Say(V_WAVE); }
		}
	}

	function LineUp()
	{
		if (wave % 10 === 5)
		{
			q[K_DYNAMO] = 5; q[K_GUPPY] = 16; q[K_SWARM] = 6;
		}
		else if (wave % 10 === 0)
		{
			q[K_FIREB] = 11; q[K_POD] = 4;
		}
		else if (wave === 1)
		{
			q[K_LANDER] = 11; q[K_DYNAMO] = 1; q[K_FIREB] = 2;
		}
		else if (wave === 2)
		{
			q[K_LANDER] = 11; q[K_DYNAMO] = 2; q[K_FIREB] = 2; q[K_GUPPY] = 5;
		}
		else if (wave === 3)
		{
			q[K_LANDER] = 12; q[K_DYNAMO] = 2; q[K_FIREB] = 4; q[K_GUPPY] = 4; q[K_POD] = 2;
		}
		else if (wave < 11)
		{
			q[K_LANDER] = 15; q[K_DYNAMO] = 2; q[K_FIREB] = 3; q[K_GUPPY] = 4; q[K_POD] = 3;
			if (wave === 6) { q[K_BOMBER] = 2; }
			if (wave > 6) { q[K_BOMBER] = 3; }
		}
		else
		{
			q[K_LANDER] = 18; q[K_DYNAMO] = 3; q[K_FIREB] = 4; q[K_GUPPY] = 3; q[K_POD] = 4; q[K_BOMBER] = 3;
		}
		if (planet_dead) { q[K_MUTANT] = q[K_LANDER]; q[K_LANDER] = 0; }
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
		for (var intN = 0; intN < nuMax; intN++)
		{
			if (ek[intN] === 0) { intC++; }
		}
		return intC;
	}

	// the attackers left (fireballs, hums, baiters, Phreds, Big Reds and munchies don't count)
	function Attackers()
	{
		var intC = 0;
		for (var intN = 0; intN < MAX_ENEMIES; intN++)
		{
			switch (ek[intN])
			{
				case 0: case K_FBALL: case K_HUM: case K_BAITER: case K_PHRED: case K_BIGRED: case K_MUNCH: break;
				default: intC++; break;
			}
		}
		return intC;
	}

	// one more of the others (not landers) in, if there's room
	function Arrive()
	{
		var blnDone = false;
		if (FreeSlots() >= 6)
		{
			for (var intKD = 2; (intKD <= 14) && !blnDone; intKD++)
			{
				if (q[intKD] > 0)
				{
					q[intKD]--;
					NewEnemy(intKD);
					blnDone = true;
				}
			}
		}
	}

	function FreeEnemy()
	{
		var intR = -1;
		for (var intN = 0; (intN < nuMax) && (intR < 0); intN++)
		{
			if (ek[intN] === 0) { intR = intN; }
		}
		return intR;
	}

	// one of kind kd, somewhere off the screen
	function NewEnemy(intKD_a)
	{
		var intKD = intKD_a;
		var intM = FreeEnemy();
		if (intM >= 0)
		{
			if ((intKD === K_LANDER) && planet_dead) { intKD = K_MUTANT; }
			ek[intM] = intKD; estate[intM] = ST_WANDER; etarget[intM] = -1;
			ut[intM] = rnd(100); uf[intM] = 60 + rnd(120); ufr[intM] = 0;
			BulHits(intM);
			ex[intM] = (px + 250 + rnd(500)) & WORLD_MASK;
			ey[intM] = 70 + rnd(70);
			evy[intM] = -1;
			if ((intKD === K_LANDER) || (intKD === K_MUTANT))
			{
				evx[intM] = (rnd(2) === 0) ? 1 : -1;
			}
			else
			{
				evx[intM] = 4 + rnd(6);
				if (rnd(2) !== 0) { evx[intM] = -evx[intM]; }
				evy[intM] = 0;
			}
			switch (intKD)
			{
				case K_BAITER: case K_PHRED: case K_BIGRED:
					ex[intM] = (px + 300 * pdir) & WORLD_MASK; ey[intM] = py;
					evx[intM] = 0;
					Sfx(1, 40, 2, 13, 25, 0);
					break;
				case K_GUPPY: case K_SWARM:
					evx[intM] = 0;
					break;
				case K_FIREB:
					evx[intM] = 12; evy[intM] = 1;
					if (rnd(2) !== 0) { evx[intM] = -12; }
					break;
				case K_BOMBER: case K_POD: case K_DYNAMO:
					evx[intM] = idiv(evx[intM], 2);
					break;
				default:
					break;
			}
		}
	}

	// a child (swarmer, fireball, hum, munchie) from x, y: its slot or -1
	function Spawn(intKD_a, intX_a, intY_a)
	{
		var intN = FreeEnemy();
		if (intN >= 0)
		{
			ek[intN] = intKD_a; ex[intN] = intX_a & WORLD_MASK; ey[intN] = intY_a; evx[intN] = 0; evy[intN] = 0;
			ut[intN] = 0; uf[intN] = 40 + rnd(60); ufr[intN] = 0; etarget[intN] = -1; estate[intN] = 0;
			BulHits(intN);
		}
		return intN;
	}

	// enemy n moves across evx(n) eighths of a pixel
	function MoveX(intN_a)
	{
		var intF = ufr[intN_a] + evx[intN_a], intM = 0;
		while (intF >= 8) { intF -= 8; intM++; }
		while (intF <= -8) { intF += 8; intM--; }
		ufr[intN_a] = intF;
		if (intM !== 0) { ex[intN_a] = (ex[intN_a] + intM) & WORLD_MASK; }
	}

	// the laser, by power level
	function FireLasers()
	{
		var intX = psx + pdir * 12, intY = 192 - py;
		var intV = pdir * 16 + pvx;
		if (intV > 30) { intV = 30; }
		if (intV < -30) { intV = -30; }
		switch (power)
		{
			case 1:
				BulShot(intX, intY, intV, 0, Q_LASER);
				fire_cd = 5;
				break;
			case 2:
				BulShot(intX, intY - 2, intV, 0, Q_LASER);
				BulShot(intX, intY + 3, intV, 0, Q_LASER);
				fire_cd = 4;
				break;
			case 3: case 4:
				BulShot(intX, intY - 2, intV, 0, Q_LASER);
				BulShot(intX, intY + 3, intV, 0, Q_LASER);
				if ((frames & 1) !== 0) { BulShot(intX, intY, intV, -3, Q_LASER); } else { BulShot(intX, intY + 1, intV, 3, Q_LASER); }
				fire_cd = (power === 3) ? 4 : 3;
				break;
			default:
				BulShot(intX, intY - 3, intV, 0, Q_LASER);
				BulShot(intX, intY + 1, intV, 0, Q_LASER);
				BulShot(intX, intY + 5, intV, 0, Q_LASER);
				BulShot(intX, intY, intV, -3, Q_LASER);
				BulShot(intX, intY + 2, intV, 3, Q_LASER);
				fire_cd = 3;
				break;
		}
		Sfx(0, 24, 5, 12, 9, 0);
	}

	function Boom(intWX_a, intWY_a)
	{
		var blnDone = false;
		for (var intK = 0; (intK < MAX_BOOMS) && !blnDone; intK++)
		{
			if (bt[intK] === 0)
			{
				bx[intK] = intWX_a; by[intK] = intWY_a; bt[intK] = 16;
				// a new explosion: its sequence from the start
				m_objSlots.put(SLOT_BOOM0 + intK, 0, 0, 'boom', undefined, 'dh_s8');
				HideSprite(SLOT_BOOM0 + intK);
				m_objSlots.animate(SLOT_BOOM0 + intK, 1, true);
				blnDone = true;
			}
		}
	}

	function KillEnemy(intIdx_a)
	{
		var intH, intPts, intN, intC;
		esv[intIdx_a] = 1;
		EnemyOff(intIdx_a);
		Boom(ex[intIdx_a], ey[intIdx_a]);
		intH = etarget[intIdx_a];
		if ((ek[intIdx_a] === K_LANDER) && (intH >= 0) && (intH < MAX_HUMANS))
		{
			if ((hstate[intH] === H_GRABBED) && (hcarrier[intH] === intIdx_a))
			{
				hstate[intH] = H_FALLING;
				hcarrier[intH] = -1;
				hfall[intH] = hy[intH]; hvy[intH] = 0;
			}
		}
		switch (ek[intIdx_a])
		{
			case K_LANDER: case K_MUTANT: case K_SWARM: intPts = 150; break;
			case K_BOMBER: case K_FIREB: intPts = 250; break;
			case K_POD: intPts = 1000; break;
			case K_FBALL: case K_HUM: intPts = 100; break;
			case K_MUNCH: intPts = 50; break;
			default: intPts = 200; break;
		}
		// a pod: swarmers
		if (ek[intIdx_a] === K_POD)
		{
			intC = 3 + rnd(4);
			for (intN = 1; intN <= intC; intN++)
			{
				Spawn(K_SWARM, ex[intIdx_a] + rnd(16) - 8, ey[intIdx_a] + rnd(16) - 8);
			}
		}
		// the HIT chain, and a pickup maybe
		chain++; chainT = 90; statsDirty = 1;
		intPts += (chain - 1) * 10;
		Drop(intIdx_a);
		ek[intIdx_a] = 0;
		AddScore(intPts);
		Sfx(1, 10, 1, 14, 20, 1);
	}

	function AddScore(intN_a)
	{
		score += intN_a;
		if (score >= nextBonus)
		{
			nextBonus += 10000;
			lives++;
			if (bombs < 9) { bombs++; }
			cloak += 120;
			if (cloak > 400) { cloak = 400; }
			statsDirty = 1;
			Sfx(2, 60, -1, 14, 40, 0);
		}
		hudDirty = 1;
	}

	function TriggerSmartBomb(intCX_a)
	{
		var intI, intSX;
		if (bombs > 0)
		{
			bombs--;
			bomb_cd = 25;
			Sfx(2, 4, 1, 15, 45, 1);
			Say(V_SMART);
			Border(7);
			m_objL2.setColour(0, 0xFF);
			flash_bg = 4;
			for (intI = 0; intI < MAX_ENEMIES; intI++)
			{
				if (ek[intI] !== 0)
				{
					intSX = WorldToScreenX(ex[intI], intCX_a);
					if ((intSX >= -16) && (intSX <= 272)) { KillEnemy(intI); }
				}
			}
			BulClear();
			if (bossMode !== 0) { MechBomb(); }
			hudDirty = 1;
		}
	}

	// the ship's hit: it blows up (60 frames, everything else held), then LoseLifeEnd
	function LoseLife()
	{
		var intI;
		Sfx(2, 6, 1, 15, 70, 1);
		Sfx(0, 150, 6, 14, 60, 0);
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			if (hstate[intI] === H_CARRIED)
			{
				hstate[intI] = H_FALLING; hfall[intI] = hy[intI]; hvy[intI] = 0;
			}
		}
		HideSprite(SLOT_GUARD);
		m_strLive = 'ship';
		m_objSlots.put(SLOT_PLAYER, psx + 24, 215 - py, 'shipboom', undefined, 'dh_s8');
		m_objSlots.animate(SLOT_PLAYER, 1, true);
		Frames(60, function(intF_a)
		{
			if (intF_a >= 40) { HideSprite(SLOT_PLAYER); }
			Border((intF_a % 8 < 4) ? 2 : 0);
		});
		m_objSteps.call(LoseLifeEnd);
	}

	function LoseLifeEnd()
	{
		var intI;
		m_strLive = 'all';
		Border(0);
		lives--;
		if (power > 1) { power--; }
		pNext = 0; chain = 0; chainT = 0; guardT = 0; cloakOn = 0; statsDirty = 1;
		BulClear();
		if (lives <= 0)
		{
			HideAllSprites();
			game_over = true;
		}
		else
		{
			for (intI = 0; intI < MAX_ENEMIES; intI++)
			{
				if (ek[intI] !== 0)
				{
					if (Math.abs(WorldToScreenX(ex[intI], px)) < 200) { ex[intI] = (ex[intI] + 400) & WORLD_MASK; }
					if ((ek[intI] === K_BAITER) || (ek[intI] === K_FBALL) || (ek[intI] === K_MUNCH))
					{
						ek[intI] = 0; HideSprite(SLOT_ENEMY0 + intI); BulOff(intI);
					}
				}
			}
			py = 96; pvx = 0; safeT = 100;
			hudDirty = 1;
		}
	}

	// Say n: the voice says clip n (V_TAKEN ...), unless it's already saying something or it's off
	function Say(intN_a)
	{
		if ((vlev > 0) && (!m_objSound.isSamplePlaying()))
		{
			m_objSound.playSample(DEFHELL_VOICE[intN_a].name, vlev / 5);
		}
	}

	// the voice's keys, every frame on every screen (the title, the pauses, the game over too):
	// 1 (quiet) to 5 (full), 0 off; V off and back on (at the volume it had)
	function VoiceKeys()
	{
		var intB = -1;
		if (down(K_V))
		{
			if (vWas === 0)
			{
				intB = (vlev > 0) ? 0 : vOn;
			}
			vWas = 1;
		}
		else
		{
			vWas = 0;
		}
		if (down(K_0)) { intB = 0; }
		if (down(K_1)) { intB = 1; }
		if (down(K_2)) { intB = 2; }
		if (down(K_3)) { intB = 3; }
		if (down(K_4)) { intB = 4; }
		if (down(K_5)) { intB = 5; }
		if ((intB >= 0) && (intB !== vlev))
		{
			if (vlev > 0) { vOn = vlev; }
			vlev = intB;
			if (vlev === 0) { m_objSound.stopSample(); }
			if (intB === 0) { MessageAt('VOICE OFF', 15, 50); } else { MessageAt('VOICE' + strS(intB), 15, 50); }
		}
	}

	function Message(strM_a, intT_a)
	{
		MessageAt(strM_a, 11, intT_a);
	}

	function MessageAt(strM_a, intRow_a, intT_a)
	{
		Pen(14);
		At(17 - idiv(strM_a.length, 2), intRow_a);
		PrintS(strM_a);
		msgT = intT_a;
	}

	function ClearMessages()
	{
		for (var intK = 9; intK <= 15; intK++)
		{
			At(1, intK); PrintS('                                ');
		}
	}

	// ====================================================================================================
	// THE PARTS OF A FRAME

	function Controls()
	{
		var intWas, intB;
		if (down(K_Q))
		{
			if (pvy < 3) { pvy++; }
		}
		else if (down(K_A))
		{
			if (pvy > -3) { pvy--; }
		}
		else
		{
			pvy = 0;
		}
		thrust = 0;
		if (down(K_O))
		{
			pdir = -1; thrust = 1;
			if (pvx > -10) { pvx--; }
		}
		else if (down(K_P))
		{
			pdir = 1; thrust = 1;
			if (pvx < 10) { pvx++; }
		}
		else if (f3 === 0)
		{
			if (pvx > 0) { pvx--; }
			if (pvx < 0) { pvx++; }
		}
		if ((thrust !== 0) && !m_objSound.isBusy(2)) { Sfx(2, 28, 0, 5, 3, 1); }

		px = (px + pvx) & WORLD_MASK;
		py += pvy;
		if (py < PLAY_TOP) { py = PLAY_TOP; }
		if (py > PLAY_BOT) { py = PLAY_BOT; }
		// the ship sits to one side, leaving room ahead: turning round, it slides across
		if ((pdir > 0) && (psx > 88)) { psx -= 4; }
		if ((pdir < 0) && (psx < 168)) { psx += 4; }
		intWas = cam_x;
		cam_x = (px - psx) & WORLD_MASK;
		pan = WorldToScreenX(cam_x, intWas);

		if (fire_cd > 0) { fire_cd--; }
		if ((down(K_SPACE) || down(K_Z)) && (fire_cd === 0)) { FireLasers(); }
		if (bomb_cd > 0) { bomb_cd--; }
		if ((down(K_B) || down(K_M)) && (bomb_cd === 0)) { TriggerSmartBomb(cam_x); }

		// the guard: G
		intB = down(K_G) ? 1 : 0;
		if ((intB !== 0) && (guardWas === 0) && (guards > 0) && (guardT === 0))
		{
			guards--; statsDirty = 1;
			guardT = 100;
			Say(V_GUARD);
			GuardEat();
			Sfx(1, 500, -20, 14, 40, 0);
		}
		guardWas = intB;

		// Inviso: I or N, while it's held and there's some left
		if ((down(K_I) || down(K_N)) && (cloak > 0))
		{
			if (cloakOn === 0) { Sfx(1, 300, -8, 11, 20, 0); Say(V_INVISO); }
			cloakOn = 1; cloak--;
			if (cloak % 40 === 0) { statsDirty = 1; }
		}
		else
		{
			if (cloakOn !== 0) { statsDirty = 1; }
			cloakOn = 0;
		}

		// Hyperspace: somewhere else, at random
		if (hyper_cd > 0) { hyper_cd--; }
		if ((hyper_cd === 0) && down(K_H))
		{
			Plot(old_prx, old_pry, 0);
			px = rnd(WORLD_W);
			py = 50 + rnd(85);
			pvx = 0;
			hyper_cd = 50; safeT = 25;
			cam_x = (px - psx) & WORLD_MASK; pan = 0;
			BulClear();
			Sfx(0, 500, -24, 14, 20, 0);
			Say(V_HYPER);
		}
	}

	function DrawPlayer()
	{
		var blnVis = (safeT === 0) || ((safeT & 4) === 0);
		var intJ;
		// Inviso: a flicker of a ship
		if ((cloakOn !== 0) && ((frames & 3) !== 0)) { blnVis = false; }
		Put8(SLOT_PLAYER, psx, py, 'ship', pdir < 0);
		Pose(SLOT_PLAYER, (thrust !== 0) ? 3 : 1);
		if (!blnVis) { HideSprite(SLOT_PLAYER); }
		if (safeT > 0) { safeT--; }
		intJ = 154 + idiv(py, 7);
		if (intJ !== old_pry)
		{
			if (old_pry > 0) { Plot(old_prx, old_pry, 0); }
			old_prx = 128; old_pry = intJ;
			Plot(old_prx, old_pry, 15);
		}
	}

	function Humans()
	{
		var intHSX, intHRX, intHRY, intTG, intI;
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			if ((hstate[intI] !== H_DEAD) && (bossMode === 0))
			{
				switch (hstate[intI])
				{
					case H_GROUND:
						// wandering about
						if ((frames & 7) === 0)
						{
							hx[intI] = (hx[intI] + hdir[intI]) & WORLD_MASK;
							if (rnd(60) === 0) { hdir[intI] = -hdir[intI]; }
							hy[intI] = GetTerrainY(hx[intI]) + 6;
						}
						break;
					case H_CARRIED:
						hx[intI] = px;
						hy[intI] = py - 10;
						intTG = GetTerrainY(hx[intI]) + 6;
						if ((hy[intI] <= intTG) || (py <= PLAY_TOP))
						{
							hy[intI] = intTG;
							hstate[intI] = H_GROUND;
							AddScore(500);
							Sfx(0, 90, -3, 14, 20, 0);
							Say(V_SAVED);
						}
						break;
					case H_FALLING:
						if (((frames & 3) === 0) && (hvy[intI] < 3)) { hvy[intI]++; }
						hy[intI] -= hvy[intI];
						// caught? (within 12 of the ship both ways)
						Put8(SLOT_HUMAN0 + intI, WorldToScreenX(hx[intI], cam_x), hy[intI], 'human', hdir[intI] < 0);
						Probe();
						if (m_objSlots.collide(SLOT_HUMAN0 + intI, PROBE))
						{
							hstate[intI] = H_CARRIED;
							AddScore(500);
							Sfx(0, 140, -6, 14, 14, 0);
							Say(V_CAUGHT);
						}
						else
						{
							intTG = GetTerrainY(hx[intI]) + 6;
							if (hy[intI] <= intTG)
							{
								hy[intI] = intTG;
								if (hfall[intI] - intTG > 60)
								{
									// too far to fall
									hstate[intI] = H_DEAD;
									humans_alive--;
									Boom(hx[intI], hy[intI]);
									Sfx(1, 100, 12, 13, 25, 0);
									HumansGone();
									Say(V_LOST);
								}
								else
								{
									hstate[intI] = H_GROUND;
									AddScore(250);
								}
							}
						}
						break;
					default:
						break;
				}
			}

			if ((hstate[intI] !== H_DEAD) && (bossMode === 0))
			{
				intHSX = WorldToScreenX(hx[intI], cam_x);
				if ((intHSX >= -8 - m_intWL) && (intHSX <= 263 + m_intWR))
				{
					Put8(SLOT_HUMAN0 + intI, intHSX, hy[intI], 'human', hdir[intI] < 0);
					Pose(SLOT_HUMAN0 + intI, (hstate[intI] === H_GROUND) ? 1 : 4);
					hsv[intI] = 1;
				}
				else
				{
					HideSprite(SLOT_HUMAN0 + intI); hsv[intI] = 0;
				}
				if (((intI + frames) & 3) === 1)
				{
					intHRX = 64 + idiv((hx[intI] - px + 512) & WORLD_MASK, 8);
					intHRY = 38 - idiv(hy[intI], 7);
					if ((intHRX !== old_hrx[intI]) || (intHRY !== old_hry[intI]))
					{
						if (old_hrx[intI] > 0) { L2Plot(old_hrx[intI], old_hry[intI], 0); }
						L2Plot(intHRX, intHRY, penc[13]);
						old_hrx[intI] = intHRX; old_hry[intI] = intHRY;
					}
				}
			}
			else if ((hsv[intI] !== 0) || (old_hrx[intI] > 0) || m_objSlots.isVisible(SLOT_HUMAN0 + intI))
			{
				HideSprite(SLOT_HUMAN0 + intI);
				hsv[intI] = 0;
				if (old_hrx[intI] > 0) { L2Plot(old_hrx[intI], old_hry[intI], 0); }
				old_hrx[intI] = 0;
			}
		}
	}

	// no humans left: the planet goes, and every lander turns mutant
	function HumansGone()
	{
		if ((humans_alive <= 0) && !planet_dead)
		{
			planet_dead = true;
			Border(2);
			flash_bg = 10;
			Sfx(2, 3, 1, 15, 60, 1);
			for (var intK = 0; intK < MAX_ENEMIES; intK++)
			{
				if (ek[intK] === K_LANDER) { ek[intK] = K_MUTANT; }
			}
			q[K_MUTANT] += q[K_LANDER]; q[K_LANDER] = 0;
			Message('THE PLANET IS GONE', 100);
			Say(V_PLANET);
		}
	}

	function Aboard()
	{
		var intC = 0;
		for (var intN = 0; intN < MAX_HUMANS; intN++)
		{
			if (hstate[intN] === H_CARRIED) { intC++; }
		}
		return intC;
	}

	function Enemies()
	{
		var intESX, intERX, intERY, intEPat, intECol, intTH, intDXH, intD, blnFl, intHW, intHH, intN, intI, intSlot, intStep;
		var blnStop = false;

		waveT++;
		if (waveT > 30000) { waveT = 20000; }
		if ((waveT % 10) === 1) { att = Attackers(); tc = ToCome(); freeN = FreeSlots(); }
		if (bossMode === 0)
		{
			// the landers, one a second while there are fewer than 8 about; the others as room allows
			if (spawn_timer > 0)
			{
				spawn_timer--;
			}
			else if (((q[K_LANDER] > 0) || (q[K_MUTANT] > 0)) && (att < 8) && (freeN > 3))
			{
				if (q[K_LANDER] > 0)
				{
					q[K_LANDER]--; NewEnemy(K_LANDER); freeN--;
				}
				else
				{
					q[K_MUTANT]--; NewEnemy(K_MUTANT);
				}
				spawn_timer = 60;
			}
			if ((waveT % 40) === 20) { Arrive(); }
			// too slow: a baiter, then Phred and Big Red
			if ((waveT > 2000) && ((waveT % 450) === 0))
			{
				chaser++;
				if (chaser % 3 === 1) { NewEnemy(K_BAITER); } else if (chaser % 3 === 2) { NewEnemy(K_PHRED); } else { NewEnemy(K_BIGRED); }
			}
		}
		else if ((waveT % 300) === 150)
		{
			// help for the giant mechs: swarmers now and then, from the nearest one still going
			intTH = -1; intD = 999;
			for (intN = 0; intN < mN; intN++)
			{
				if (mhp[intN] > 0)
				{
					intDXH = Math.abs(WorldToScreenX(mcx[intN], px));
					if (intDXH < intD) { intD = intDXH; intTH = intN; }
				}
			}
			if (intTH >= 0)
			{
				intDXH = intTH;
				intD = 2 + idiv(bossN, 2);
				for (intN = 1; intN <= intD; intN++)
				{
					if (FreeSlots() > 1) { Spawn(K_SWARM, mcx[intDXH], mcy[intDXH]); }
				}
			}
		}

		Probe();
		for (intI = 0; (intI < MAX_ENEMIES) && !blnStop; intI++)
		{
			intSlot = SLOT_ENEMY0 + intI;
			// shot?
			if (ek[intI] !== 0)
			{
				if (BulHits(intI) > 0) { KillEnemy(intI); }
			}

			intEPat = 0;
			if (ek[intI] !== 0)
			{
				ut[intI]++;
				if (ut[intI] > 30000) { ut[intI] = 0; }
				intD = (px - ex[intI]) & WORLD_MASK;		// the ship, from it
				if (intD >= 512) { intD -= 1024; }
				intHW = 7; intHH = 6; blnFl = false; intECol = 11;
				switch (ek[intI])
				{
					case K_LANDER:
						switch (estate[intI])
						{
							case ST_WANDER:
								if ((frames & 1) === 0) { ex[intI] = (ex[intI] + evx[intI]) & WORLD_MASK; }
								if (f3 === 0) { ey[intI] += evy[intI]; }
								if (ey[intI] < 70) { evy[intI] = 1; }
								if (ey[intI] > 140) { evy[intI] = -1; }
								// now and then it picks a human below to take
								if (((ut[intI] & 7) === 0) && (humans_alive > 0))
								{
									if (rnd(19) === 0)
									{
										intTH = rnd(MAX_HUMANS);
										if (hstate[intTH] === H_GROUND)
										{
											etarget[intI] = intTH;
											estate[intI] = ST_DESCEND;
										}
									}
								}
								break;
							case ST_DESCEND:
								intTH = etarget[intI];
								if ((intTH < 0) || (hstate[intTH] !== H_GROUND))
								{
									estate[intI] = ST_WANDER;
								}
								else
								{
									intDXH = WorldToScreenX(hx[intTH], ex[intI]);
									if (intDXH > 1)
									{
										ex[intI] = (ex[intI] + 1) & WORLD_MASK;
									}
									else if (intDXH < -1)
									{
										ex[intI] = (ex[intI] - 1) & WORLD_MASK;
									}
									else if (ey[intI] > hy[intTH] + 10)
									{
										ey[intI]--;
									}
									else
									{
										hstate[intTH] = H_GRABBED;
										hcarrier[intTH] = intI;
										estate[intI] = ST_ABDUCT;
										Sfx(1, 300, -16, 13, 30, 0);
										Message('HUMANOID TAKEN!', 50);
										Say(V_TAKEN);
									}
								}
								break;
							case ST_ABDUCT:
								intTH = etarget[intI];
								if ((intTH < 0) || (hstate[intTH] !== H_GRABBED))
								{
									estate[intI] = ST_WANDER;
								}
								else
								{
									if ((frames & 1) === 0) { ey[intI]++; }
									hx[intTH] = ex[intI];
									hy[intTH] = ey[intI] - 10;
									if (ey[intI] >= 140)
									{
										hstate[intTH] = H_DEAD;
										humans_alive--;
										ek[intI] = K_MUTANT; etarget[intI] = -1;
										Sfx(1, 60, 8, 15, 40, 0);
										HumansGone();
										Say(V_LOST);
									}
								}
								break;
							default:
								break;
						}
						intEPat = PAT_LANDER; intECol = 12;
						if (uf[intI] <= 0) { Shoot(intI, 20 + wave, 0); }
						break;
					case K_MUTANT:
						// straight at the ship, twitching
						if (intD > 0) { ex[intI] = (ex[intI] + 2 + rnd(2)) & WORLD_MASK; } else { ex[intI] = (ex[intI] - 2 - rnd(2)) & WORLD_MASK; }
						if (ey[intI] < py - 4)
						{
							ey[intI] += 1 + rnd(2);
						}
						else if (ey[intI] > py + 4)
						{
							ey[intI] -= 1 + rnd(2);
						}
						else
						{
							ey[intI] += rnd(5) - 2;
						}
						intEPat = PAT_MUTANT; intECol = 10;
						if (uf[intI] <= 0) { Shoot(intI, 24 + wave, 1); }
						break;
					case K_BAITER:
						// fast, close, and mean
						if ((intD > 30) && (evx[intI] < 9)) { evx[intI]++; }
						if ((intD < -30) && (evx[intI] > -9)) { evx[intI]--; }
						ex[intI] = (ex[intI] + evx[intI]) & WORLD_MASK;
						if (ey[intI] < py) { ey[intI] += 2; } else { ey[intI] -= 2; }
						intEPat = PAT_BAITER; intECol = 14; intHH = 3;
						if (uf[intI] <= 0) { Shoot(intI, 34, 0); uf[intI] = 30 + rnd(30); }
						break;
					case K_BOMBER:
						// drifts, bobbing, leaving mines
						MoveX(intI);
						ey[intI] = 100 + sn3[ut[intI] & 127];
						if ((ut[intI] & 31) === 0)
						{
							intESX = WorldToScreenX(ex[intI], cam_x);
							if ((intESX > 8) && (intESX < 248)) { BulFire(intESX, 191 - ey[intI], 0, 0, Q_MINE, PAL_FX); }
						}
						intEPat = PAT_BOMBER; intECol = 13;
						break;
					case K_POD:
						MoveX(intI);
						ey[intI] = 110 + sn3[(ut[intI] + intI * 30) & 127];
						intEPat = PAT_POD; intECol = 13;
						break;
					case K_SWARM:
						// fast at the ship across, overshooting, undulating
						evx[intI] += sgn(intD);
						if (evx[intI] > 30) { evx[intI] = 30; }
						if (evx[intI] < -30) { evx[intI] = -30; }
						MoveX(intI);
						ey[intI] += sgn(py - ey[intI]) + sn32[(ut[intI] * 4) & 127];
						intEPat = PAT_SWARM; intECol = 10; intHW = 5; intHH = 4;
						blnFl = (evx[intI] > 0);
						if (uf[intI] <= 0) { Shoot(intI, 26, 0); }
						break;
					case K_FIREB:
						// zig zag; from wave 2, fireballs
						MoveX(intI);
						ey[intI] += evy[intI];
						if ((ut[intI] & 63) === 0)
						{
							evy[intI] = rnd(2) * 2 - 1;
							if (rnd(3) === 0) { evx[intI] = -evx[intI]; }
						}
						if (ey[intI] < 50) { evy[intI] = 1; }
						if (ey[intI] > 140) { evy[intI] = -1; }
						intEPat = PAT_FIREB; intECol = 14;
						if (uf[intI] <= 0)
						{
							uf[intI] = 90 + rnd(90) - wave * 4;
							if (uf[intI] < 40) { uf[intI] = 40; }
							if ((wave >= 2) && (Math.abs(WorldToScreenX(ex[intI], cam_x) - 128) < 128)) { Fireball(intI); }
						}
						break;
					case K_FBALL:
						// straight on, then gone
						MoveX(intI);
						ey[intI] += evy[intI];
						intEPat = PAT_FBALL; intECol = 14; intHW = 4; intHH = 4;
						if ((ut[intI] > 100) || (ey[intI] < PLAY_TOP - 8) || (ey[intI] > PLAY_BOT))
						{
							ek[intI] = 0; HideSprite(intSlot); BulOff(intI);
						}
						break;
					case K_DYNAMO:
						// drifts; sheds space hums
						MoveX(intI);
						ey[intI] = 96 + sn3[(ut[intI] + intI * 20) & 127];
						intEPat = PAT_DYNAMO; intECol = 11;
						if (uf[intI] <= 0)
						{
							uf[intI] = 150 + rnd(100);
							if ((Math.abs(WorldToScreenX(ex[intI], cam_x) - 128) < 200) && (FreeSlots() > 3))
							{
								intTH = Spawn(K_HUM, ex[intI], ey[intI]);
								if (intTH >= 0) { Sfx(1, 40, -2, 11, 10, 0); }
							}
						}
						break;
					case K_HUM:
						// after the ship, wobbling
						if ((ut[intI] & 1) === 0)
						{
							ex[intI] = (ex[intI] + sgn(intD) * 2 + rnd(3) - 1) & WORLD_MASK;
							ey[intI] += sgn(py - ey[intI]) + rnd(3) - 1;
						}
						intEPat = PAT_HUM; intECol = 11; intHW = 4; intHH = 4;
						break;
					case K_GUPPY:
						// a swarm, homing in, wiggling
						evx[intI] += sgn(intD);
						if (evx[intI] > 22) { evx[intI] = 22; }
						if (evx[intI] < -22) { evx[intI] = -22; }
						MoveX(intI);
						if ((ut[intI] & 1) === 0) { ey[intI] += sgn(py - ey[intI]); }
						ey[intI] += sn24[(ut[intI] * 3 + intI * 16) & 127];
						intEPat = PAT_GUPPY; intECol = 12;
						blnFl = (evx[intI] < 0);
						if (uf[intI] <= 0) { Shoot(intI, 22 + wave, 0); uf[intI] += 60; }
						break;
					case K_PHRED: case K_BIGRED:
						// fast after the ship; spits munchies
						ex[intI] = (ex[intI] + sgn(intD) * 3 + idiv(pvx, 2)) & WORLD_MASK;
						ey[intI] += sgn(py - ey[intI]);
						if (ek[intI] === K_PHRED) { intEPat = PAT_PHRED; intECol = 12; } else { intEPat = PAT_BIGRED; intECol = 10; }
						blnFl = (intD < 0);
						if (uf[intI] <= 0)
						{
							uf[intI] = 90 + rnd(60);
							if (FreeSlots() > 3) { Spawn(K_MUNCH, ex[intI], ey[intI]); }
						}
						break;
					case K_MUNCH:
						// small, quick, after the ship
						ex[intI] = (ex[intI] + sgn(intD) * 2 + sgn(intD) * (ut[intI] & 1)) & WORLD_MASK;
						ey[intI] += sgn(py - ey[intI]);
						intEPat = PAT_MUNCH; intECol = 13; intHW = 4; intHH = 4;
						blnFl = (intD < 0);
						if (ut[intI] > 600) { ek[intI] = 0; HideSprite(intSlot); BulOff(intI); }
						break;
					default:
						break;
				}
				uf[intI]--;
			}

			if (ek[intI] !== 0)
			{
				if (ey[intI] < PLAY_TOP - 8) { ey[intI] = PLAY_TOP - 8; }
				if (ey[intI] > PLAY_BOT) { ey[intI] = PLAY_BOT; }
				intESX = (ex[intI] - cam_x) & WORLD_MASK;
				if (intESX >= 512) { intESX -= 1024; }
				// it, where it is now (as the pattern its kind was this frame: a lander turned mutant
				// shows as one from the next)
				Put8(intSlot, intESX, ey[intI], 'e' + KPAT.indexOf(intEPat), blnFl);
				// running into the ship (within 11 across, 9 up or down; Inviso: it goes, the ship doesn't)
				if (m_objSlots.collide(intSlot, PROBE))
				{
					if (cloakOn !== 0)
					{
						KillEnemy(intI);
					}
					else if (safeT === 0)
					{
						KillEnemy(intI);
						LoseLife();
						blnStop = true;
					}
				}
			}

			if (!blnStop)
			{
				if (ek[intI] !== 0)
				{
					if ((intESX >= -8 - m_intWL) && (intESX <= 263 + m_intWR))
					{
						Pose(intSlot, 1);
						esv[intI] = 1;
						// (its target on while it's shown: on a wide screen out there too, for the laser)
						if ((intESX > 2 - m_intWL) && (intESX < 254 + m_intWR)) { BulBox(intI, intESX, 191 - ey[intI], intHW, intHH); } else { BulOff(intI); }
					}
					else
					{
						HideSprite(intSlot);
						if (esv[intI] !== 0)
						{
							BulOff(intI);
							esv[intI] = 0;
						}
					}
					// its dot on the scanner: every fourth frame, moved only when it moves
					if (((intI + frames) & 3) === 0)
					{
						intERX = 64 + idiv((ex[intI] - px + 512) & WORLD_MASK, 8);
						intERY = 38 - idiv(ey[intI], 7);
						if ((intERX !== old_erx[intI]) || (intERY !== old_ery[intI]))
						{
							if (old_erx[intI] > 0) { L2Plot(old_erx[intI], old_ery[intI], 0); }
							L2Plot(intERX, intERY, penc[intECol]);
							old_erx[intI] = intERX; old_ery[intI] = intERY;
						}
					}
				}
				else if ((esv[intI] !== 0) || (old_erx[intI] > 0) || m_objSlots.isVisible(intSlot))
				{
					EnemyOff(intI);
				}
			}
		}
	}

	// enemy n's sprite, target box and scanner dot gone
	function EnemyOff(intN_a)
	{
		HideSprite(SLOT_ENEMY0 + intN_a);
		esv[intN_a] = 0;
		BulOff(intN_a);
		if (old_erx[intN_a] > 0) { L2Plot(old_erx[intN_a], old_ery[intN_a], 0); }
		old_erx[intN_a] = 0;
	}

	// a firebomber throws a fireball at the ship
	function Fireball(intN_a)
	{
		var intM = Spawn(K_FBALL, ex[intN_a], ey[intN_a]), intD;
		if (intM >= 0)
		{
			intD = WorldToScreenX(px, ex[intN_a]);
			evx[intM] = sgn(intD) * (24 + wave * 2);
			if (evx[intM] > 40) { evx[intM] = 40; }
			if (evx[intM] < -40) { evx[intM] = -40; }
			evy[intM] = sgn(py - ey[intN_a]);
			Sfx(1, 60, 6, 12, 12, 0);
		}
	}

	// enemy n shoots at the ship (if it's on the screen): kind 0 one shot, 1 a pair, 2 a fan of 3;
	// more of them, and faster, as the level goes up
	function Shoot(intN_a, intSp_a, intKind_a)
	{
		var intX, intY, intA, intSp = intSp_a, intKind = intKind_a;
		uf[intN_a] = 80 + rnd(80) - wave * 3 - level * 4;
		if (uf[intN_a] < 18) { uf[intN_a] = 18; }
		intSp += idiv(level, 2);
		if (intSp > 60) { intSp = 60; }
		if ((intKind === 0) && (level >= 4)) { intKind = 1; }
		if ((intKind === 1) && (level >= 7)) { intKind = 2; }
		intX = WorldToScreenX(ex[intN_a], cam_x);
		// (on the screen, and not point blank)
		if ((intX >= 4) && (intX <= 252) && (Math.abs(intX - psx) >= 20))
		{
			intY = 191 - ey[intN_a];
			intA = BulAim(intX, intY, psx, 191 - py);
			if (intKind === 0)
			{
				BulFire(intX, intY, intA, intSp, Q_SHOT, PAL_FX);
			}
			else if (intKind === 1)
			{
				BulFire(intX, intY, (intA - 4) & 255, intSp, Q_PINK, PAL_FX);
				BulFire(intX, intY, (intA + 4) & 255, intSp, Q_PINK, PAL_FX);
			}
			else
			{
				BulFire(intX, intY, intA, intSp, Q_BLUE, PAL_FX);
				BulFire(intX, intY, (intA + 14) & 255, intSp, Q_BLUE, PAL_FX);
				BulFire(intX, intY, (intA - 14) & 255, intSp, Q_BLUE, PAL_FX);
			}
			Sfx(2, 70, -3, 8, 6, 0);
		}
	}

	function Booms()
	{
		var intBSX;
		for (var intK = 0; intK < MAX_BOOMS; intK++)
		{
			if (bt[intK] > 0)
			{
				bt[intK]--;
				intBSX = WorldToScreenX(bx[intK], cam_x);
				if ((bt[intK] > 0) && (intBSX > -8 - m_intWL) && (intBSX < 264 + m_intWR))
				{
					Put8(SLOT_BOOM0 + intK, intBSX, by[intK], 'boom', false);
				}
				else
				{
					HideSprite(SLOT_BOOM0 + intK);
				}
			}
		}
	}

	// the scanner's marks showing the part of the world on the screen
	function ViewMarks()
	{
		var intM = WorldToRadarX(cam_x);
		if (intM !== mark0)
		{
			if (mark0 >= 0)
			{
				m_objL2.span(mark0, 7, 3, 0); m_objL2.span(mark0 + 30, 7, 3, 0);
				m_objL2.span(mark0, 41, 3, 0); m_objL2.span(mark0 + 30, 41, 3, 0);
			}
			if ((intM >= 62) && (intM + 33 <= 194))
			{
				m_objL2.span(intM, 7, 3, 0xFF); m_objL2.span(intM + 30, 7, 3, 0xFF);
				m_objL2.span(intM, 41, 3, 0xFF); m_objL2.span(intM + 30, 41, 3, 0xFF);
				mark0 = intM;
			}
			else
			{
				mark0 = -1;
			}
		}
	}

	// ====================================================================================================
	// THE HELLGATE (Stargate's Stargate)

	// fly into it: four or more humanoids aboard, flying right, before wave 10: three waves on.
	// Otherwise it takes the ship to a humanoid in trouble
	function Gate()
	{
		var intX, intN, intBest, intBY;
		if (gateT > 0) { gateT--; }
		if (bossMode === 0)
		{
			intX = WorldToScreenX(GATEX, cam_x);
			if ((intX > -16 - m_intWL) && (intX < 272 + m_intWR))
			{
				m_objSlots.put(SLOT_GATE, intX + 32 - 16, (191 - GATEY) + 32 - 16, 'gate', undefined, 'dh_s8', 2, 0);
				Pose(SLOT_GATE, 1);
				gateV = 1;
			}
			else if (gateV !== 0)
			{
				HideSprite(SLOT_GATE); gateV = 0;
			}
			Probe();
			// in! (within 12 of it both ways)
			if ((gateT === 0) && m_objSlots.collide(SLOT_GATE, PROBE))
			{
				gateT = 120;
				Sfx(1, 30, 8, 15, 40, 0);
				Sfx(0, 400, -12, 13, 40, 0);
				if ((Aboard() >= 4) && (wave < 10) && (pdir > 0))
				{
					warp = 1;
				}
				else
				{
					// a humanoid falling, then one being carried off (the one nearest the top), else the far side
					intBest = -1; intBY = -1;
					for (intN = 0; intN < MAX_HUMANS; intN++)
					{
						if ((hstate[intN] === H_FALLING) && (intBest < 0)) { intBest = intN; }
					}
					if (intBest >= 0)
					{
						px = (hx[intBest] - pdir * 60) & WORLD_MASK; py = hy[intBest] + 10;
					}
					else
					{
						for (intN = 0; intN < MAX_ENEMIES; intN++)
						{
							if ((ek[intN] === K_LANDER) && (estate[intN] === ST_ABDUCT))
							{
								if (ey[intN] > intBY) { intBY = ey[intN]; intBest = intN; }
							}
						}
						if (intBest >= 0)
						{
							px = (ex[intBest] - pdir * 70) & WORLD_MASK; py = ey[intBest];
						}
						else
						{
							px = (px + 512) & WORLD_MASK;
						}
					}
					if (py < PLAY_TOP) { py = PLAY_TOP; }
					if (py > PLAY_BOT) { py = PLAY_BOT; }
					cam_x = (px - psx) & WORLD_MASK; pan = 0;
					BulClear();
					Border(5); flash_bg = 8;
					Message('HELLGATE', 40);
					Say(V_HELLGATE);
				}
			}
		}
	}

	// through the HELLGATE with four aboard: a bonus, the humanoids saved, three waves on
	function WarpDone()
	{
		var intT = humans_alive;
		var intB = Math.min(20000, intT * 2000);
		AddScore(intB);
		HideAllSprites();
		ClearMessages();
		MessageAt('H E L L G A T E   W A R P', 10, 0);
		Say(V_WARP);
		MessageAt('BONUS' + strS(intB), 12, 0);
		SaveFolk(intT);
		UpdateHUD();
		ShowStats();
		m_strLive = 'none';
		Frames(150, function(intF_a)
		{
			var intF = intF_a + 1;
			m_objL2.setColour(0, ((intF & 4) !== 0) ? ((intF * 37) & 255) : 0);
		});
		m_objSteps.call(function()
		{
			m_strLive = 'all';
			m_objL2.setColour(0, -1);
			wave += 3;
			NextWave();
		});
	}

	// ====================================================================================================
	// MECHRA'S SIDE: THE LEVEL, THE GUARD, THE PICKUPS

	// t humanoids saved: every 8 is a level
	function SaveFolk(intT_a)
	{
		saved += intT_a;
		while (saved >= 8)
		{
			saved -= 8; level++;
			MessageAt('LEVEL' + strS(level), 15, 0);
			Sfx(1, 70, -2, 15, 40, 0);
			Say(V_LEVELUP);
		}
		statsDirty = 1;
	}

	// the guard eats every bullet on the screen: 10 each, and a gem for every four
	function GuardEat()
	{
		var intC = BulClear(), intN;
		if (intC > 0)
		{
			AddScore(intC * 10);
			for (intN = 1; intN <= idiv(intC, 4); intN++)
			{
				NewItem(3, px + rnd(40) - 20, py - 10 + rnd(20));
			}
		}
	}

	// every frame: the chain running down, the guard, the enemies' rings
	function Hell()
	{
		var intN, intX, intC, blnDone;
		if (chainT > 0)
		{
			chainT--;
			if (chainT === 0) { chain = 0; statsDirty = 1; }
		}
		if (guardT > 0)
		{
			guardT--;
			if ((frames & 1) === 0) { GuardEat(); }
			if ((guardT > 24) || ((guardT & 2) !== 0))
			{
				Put4(SLOT_GUARD, psx, py, 'guard', PAL_ITEM, 2);
				Pose(SLOT_GUARD, 1);
				guardV = 1;
			}
			else if (guardV !== 0)
			{
				HideSprite(SLOT_GUARD); guardV = 0;
			}
		}
		else if (guardV !== 0)
		{
			HideSprite(SLOT_GUARD); guardV = 0;
		}
		// from level 3, pods, dynamos, bombers and firebombers on the screen fire rings
		if ((level >= 3) && (bossMode === 0))
		{
			intC = 150 - level * 8;
			if (intC < 50) { intC = 50; }
			if ((frames % intC) === 0)
			{
				blnDone = false;
				for (intN = 0; (intN < MAX_ENEMIES) && !blnDone; intN++)
				{
					if ((ek[intN] === K_POD) || (ek[intN] === K_DYNAMO) || (ek[intN] === K_BOMBER) || (ek[intN] === K_FIREB))
					{
						intX = WorldToScreenX(ex[intN], cam_x);
						if ((intX > 16) && (intX < 240) && (Math.abs(intX - psx) > 30))
						{
							Ring(intX, 191 - ey[intN], 6 + idiv(level, 2), frames & 31, 16 + idiv(level, 2), Q_BLUE);
							blnDone = true;
						}
					}
				}
			}
		}
	}

	// a ring of c shots from x, y (paper: y down), the first at angle a0
	function Ring(intX_a, intY_a, intC_a, intA0_a, intSp_a, intPat_a)
	{
		var intC = Math.min(24, intC_a);
		for (var intN = 0; intN < intC; intN++)
		{
			BulFire(intX_a, intY_a, (intA0_a + idiv(intN * 256, intC)) & 255, intSp_a, intPat_a, PAL_FX);
		}
	}

	function ItemsClear()
	{
		for (var intN = 0; intN < MAX_ITEMS; intN++)
		{
			ik[intN] = 0;
			HideSprite(SLOT_ITEM0 + intN);
		}
		HideSprite(SLOT_GUARD);
		guardT = 0;
	}

	// enemy n going: maybe a P, a big P (pods, bombers and firebombers more often) or a gem
	function Drop(intN_a)
	{
		var intR = rnd(100), intKD = 0;
		if ((ek[intN_a] === K_POD) || (ek[intN_a] === K_FIREB) || (ek[intN_a] === K_BOMBER))
		{
			if (intR < 25) { intKD = 2; } else if (intR < 75) { intKD = 1; } else { intKD = 3; }
		}
		else if ((ek[intN_a] !== K_FBALL) && (ek[intN_a] !== K_MUNCH))
		{
			if (intR < 4) { intKD = 2; } else if (intR < 45) { intKD = 1; } else if (intR < 65) { intKD = 3; }
		}
		if (intKD !== 0) { NewItem(intKD, ex[intN_a], ey[intN_a]); }
	}

	function NewItem(intKD_a, intX_a, intY_a)
	{
		var blnDone = false;
		for (var intN = 0; (intN < MAX_ITEMS) && !blnDone; intN++)
		{
			if (ik[intN] === 0)
			{
				ik[intN] = intKD_a; ix[intN] = intX_a & WORLD_MASK; iy[intN] = intY_a; ivx[intN] = rnd(3) - 1; ivy[intN] = 3; ia[intN] = 0;
				blnDone = true;
			}
		}
	}

	var ITEM = ['', 'ip', 'ibig', 'igem'];

	// the pickup n where it is now, for the questions
	function ItemAt(intN_a)
	{
		var intX = (ix[intN_a] - cam_x) & WORLD_MASK;
		if (intX >= 512) { intX -= 1024; }
		Put4(SLOT_ITEM0 + intN_a, intX, iy[intN_a], ITEM[ik[intN_a]], PAL_ITEM, 1);
		return intX;
	}

	// the pickups: they pop out, then drift down; close to the ship (or while it guards) they fly to it
	function Items()
	{
		var intN, intDX, intDY, intX, intSlot, blnPull;
		Probe();
		for (intN = 0; intN < MAX_ITEMS; intN++)
		{
			intSlot = SLOT_ITEM0 + intN;
			if (ik[intN] !== 0)
			{
				ia[intN]++;
				// close to the ship? (within 48 across and 40 up or down)
				ItemAt(intN);
				blnPull = m_objSlots.collideRect(intSlot, psx + 32 - 38, 223 - py - 30, 76, 60);
				if (blnPull || (guardT > 0))
				{
					// pulled in, up to 5 pixels a frame
					intDX = (px - ix[intN]) & WORLD_MASK;
					if (intDX >= 512) { intDX -= 1024; }
					intDY = py - iy[intN];
					ix[intN] = (ix[intN] + Math.max(-5, Math.min(5, intDX))) & WORLD_MASK;
					iy[intN] += Math.max(-5, Math.min(5, intDY));
				}
				else
				{
					// up 3 pixels a frame, slowing, then down one every other frame
					if (((ia[intN] & 3) === 0) && (ivy[intN] > -1)) { ivy[intN]--; }
					if (ia[intN] === 16) { ivx[intN] = 0; }
					ix[intN] = (ix[intN] + ivx[intN]) & WORLD_MASK;
					if ((ivy[intN] >= 0) || ((ia[intN] & 1) === 0)) { iy[intN] += ivy[intN]; }
				}
				if (iy[intN] > PLAY_BOT) { iy[intN] = PLAY_BOT; ivy[intN] = 0; }
				intX = ItemAt(intN);
				if (ia[intN] > 500)
				{
					ik[intN] = 0; HideSprite(intSlot);
				}
				else if (m_objSlots.collide(intSlot, PROBE))
				{
					// on the ship (within 10 both ways)
					Pick(ik[intN]);
					ik[intN] = 0; HideSprite(intSlot);
				}
				else if (iy[intN] < GetTerrainY(ix[intN]) + 4)
				{
					ik[intN] = 0; HideSprite(intSlot);
				}
				else if ((intX > -16 - m_intWL) && (intX < 272 + m_intWR) && ((ia[intN] < 400) || ((frames & 2) !== 0)))
				{
					Pose(intSlot, 1);
				}
				else
				{
					HideSprite(intSlot);
				}
			}
		}
	}

	function Pick(intKind_a)
	{
		if (intKind_a === 3)
		{
			AddScore(100 + chain * 10);
			Sfx(0, 40, -1, 12, 6, 0);
		}
		else
		{
			if (intKind_a === 2)
			{
				PowerUp();
			}
			else
			{
				pNext++;
				if (pNext >= 10) { pNext = 0; PowerUp(); }
				Sfx(0, 60, -2, 12, 6, 0);
			}
			pAll++;
			if (pAll % 25 === 0)
			{
				guards++;
				MessageAt('GUARD +1', 15, 40);
			}
			AddScore(50);
			statsDirty = 1;
		}
	}

	function PowerUp()
	{
		if (power < 5)
		{
			power++;
			MessageAt('POWER' + strS(power), 15, 40);
			if (power === 5) { Say(V_MAXPOWER); } else { Say(V_POWERUP); }
		}
		else
		{
			AddScore(2000);
			MessageAt('MAX POWER 2000', 15, 40);
			Say(V_MAXPOWER);
		}
		Sfx(1, 50, -1, 14, 25, 0);
		statsDirty = 1;
	}

	// ====================================================================================================
	// THE BOSS LEVEL: every fifth level. The ground stays; the humanoids are out of it (they're back
	// after). MECHRA's giant mechs are out in the wraparound world, one more each time (up to 5)

	function StartBoss()
	{
		var intN, intI;
		ClearPlay();
		DrawStaticFrame();
		bossN = bossDone + 1;
		bossMode = 1; nuMax = 4;
		px = 512; py = 96; pvx = 0; pvy = 0; pdir = 1; psx = 88; pan = 0;
		cam_x = (px - psx) & WORLD_MASK;
		safeT = 100; cloakOn = 0; gateT = 0; warp = 0; waveT = 0; old_pry = 0;
		// anyone aboard is set down
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			if ((hstate[intI] === H_CARRIED) || (hstate[intI] === H_FALLING) || (hstate[intI] === H_GRABBED)) { hstate[intI] = H_GROUND; hy[intI] = GetTerrainY(hx[intI]) + 6; }
		}
		// the mechs: the first just off the screen ahead, the others spaced evenly round the world
		mN = Math.min(MAX_MECHS, bossN);
		mMax = 60 + bossN * 30;
		for (intN = 0; intN < mN; intN++)
		{
			mcx[intN] = (px + 300 + intN * idiv(WORLD_W, mN)) & WORLD_MASK;
			mcy[intN] = 96; mhp[intN] = mMax; mdie[intN] = 0; mfl[intN] = 0; mrx[intN] = 0;
			mkd[intN] = (bossN - 1 + intN) % 5;
			BulHits(MECH_BOX + intN);
		}
		mLeft = mN; mT = 0; mDrift = 1; setOn0 = 0; setOn1 = 0;
		MessageAt('WARNING!', 10, 0);
		if (mN === 1)
		{
			MessageAt('GIANT MECH APPROACHING', 12, 120);
			Say(V_WARNING);
		}
		else
		{
			MessageAt(trimS(mN) + ' GIANT MECHS APPROACHING', 12, 120);
			Say(V_MECHS);
		}
		Sfx(1, 400, 0, 15, 60, 0);
	}

	// the giant mechs, every frame: they drift and bob, get hit, shoot, blow up; the two on the screen
	// (at most) drawn
	function Boss()
	{
		var intN, intX, intH, intPl, intUsed = 0, intRX, intRY, intSlot, blnStop = false;
		mT++;
		if (mT > 30000) { mT = 1000; }
		if (mT < 100)
		{
			Border(((mT & 16) !== 0) ? 2 : 0);
			if (mT === 99) { Border(0); }
		}
		if (mT === 200) { Say(V_DESTROY); }
		// all of them drift the same way, a pixel every other frame, turning round every 10 seconds
		if ((mT & 511) === 0) { mDrift = -mDrift; }
		Probe();
		for (intN = 0; (intN < mN) && !blnStop; intN++)
		{
			if ((mhp[intN] > 0) || (mdie[intN] > 0))
			{
				if ((mT & 1) === 0) { mcx[intN] = (mcx[intN] + mDrift) & WORLD_MASK; }
				mcy[intN] = 92 + idiv(sn3[(idiv(mT, 2) + intN * 40) & 127], 2) + sn24[(idiv(mT, 3) + intN * 25) & 127] * 2;
				intX = (mcx[intN] - cam_x) & WORLD_MASK;
				if (intX >= 512) { intX -= 1024; }
				// its dot on the scanner (two pixels wide)
				intRX = 64 + idiv((mcx[intN] - px + 512) & WORLD_MASK, 8);
				intRY = 38 - idiv(mcy[intN], 7);
				if ((intRX !== mrx[intN]) || (intRY !== mry[intN]))
				{
					if (mrx[intN] > 0) { L2Plot(mrx[intN], mry[intN], 0); L2Plot(mrx[intN] + 1, mry[intN], 0); }
					L2Plot(intRX, intRY, 0xE0); L2Plot(intRX + 1, intRY, 0xE0);
					mrx[intN] = intRX; mry[intN] = intRY;
				}
				// on the screen: drawn with the first sprite set free (put now, for the questions)
				intSlot = -1;
				if ((intX > -40 - m_intWL) && (intX < 296 + m_intWR) && (intUsed < 2))
				{
					intSlot = (intUsed === 0) ? SLOT_BOSS0 : SLOT_BOSS1;
					m_objSlots.put(intSlot, intX, 199 - mcy[intN], 'mech', mkd[intN] + 1, 'dh_mech');
				}
				intPl = PAL_BOSS + mkd[intN];
				if (mdie[intN] > 0)
				{
					// going down: explosions, flashing, then gone
					mdie[intN]--;
					if ((mdie[intN] & 3) === 0)
					{
						Boom(mcx[intN] - 32 + rnd(64), mcy[intN] - 20 + rnd(40));
						Sfx(2, 20 + rnd(20), 4, 15, 12, 1);
					}
					if ((mdie[intN] & 4) !== 0) { intPl = PAL_WHITE; }
					if (mdie[intN] === 0)
					{
						mLeft--;
						L2Plot(mrx[intN], mry[intN], 0); L2Plot(mrx[intN] + 1, mry[intN], 0); mrx[intN] = 0;
					}
				}
				else
				{
					// hit?
					// (a wide screen: its target on out there too, for the laser)
					if ((intX > 2 - m_intWL) && (intX < 254 + m_intWR)) { BulBox(MECH_BOX + intN, intX, 191 - mcy[intN], 28, 20); } else { BulOff(MECH_BOX + intN); }
					intH = BulHits(MECH_BOX + intN);
					if (intH > 0)
					{
						mhp[intN] -= intH; mfl[intN] = 4;
						AddScore(intH * 10);
						if (mhp[intN] <= 0) { MechDown(intN); }
					}
					if (mfl[intN] > 0) { mfl[intN]--; intPl = PAL_WHITE; }
					if (mhp[intN] > 0)
					{
						// running into it (within 26 across, 20 up or down)
						if ((safeT === 0) && (cloakOn === 0) && (intSlot >= 0) && m_objSlots.collide(intSlot, PROBE))
						{
							LoseLife();
							blnStop = true;
						}
						else if ((mT >= 90) && (intX > 8) && (intX < 248))
						{
							// its guns, while it's on the screen
							MechGuns(intN, intX);
						}
					}
				}
				if (!blnStop && (intSlot >= 0))
				{
					if ((mhp[intN] > 0) || (mdie[intN] > 0))
					{
						m_objSlots.look(intSlot, (intPl === PAL_WHITE) ? 'dh_mechw' : 'dh_mech', 0);
						if (intUsed === 0) { setOn0 = 1; } else { setOn1 = 1; }
						intUsed++;
					}
					else
					{
						HideSprite(intSlot);
					}
				}
			}
		}
		if (!blnStop)
		{
			// a sprite set not used this frame: off
			if ((intUsed < 2) && (setOn1 !== 0)) { HideSprite(SLOT_BOSS1); setOn1 = 0; }
			if ((intUsed < 1) && (setOn0 !== 0)) { HideSprite(SLOT_BOSS0); setOn0 = 0; }
		}
	}

	// mech n's guns (it's at screen x x): three phases as it gets hurt
	function MechGuns(intN_a, intX_a)
	{
		var intT = mT + intN_a * 23, intA, intPh, intSp, intY, intJ;
		if (mhp[intN_a] * 3 > mMax * 2) { intPh = 1; } else if (mhp[intN_a] * 3 > mMax) { intPh = 2; } else { intPh = 3; }
		intSp = Math.min(40, 14 + bossN + idiv(level, 3));
		intY = 191 - mcy[intN_a] + 8;
		intA = BulAim(intX_a, intY, psx, 191 - py);
		switch (intPh)
		{
			case 1:
				if ((intT % 44) === 0)
				{
					for (intJ = -2; intJ <= 2; intJ++) { BulFire(intX_a, intY, (intA + intJ * 8) & 255, intSp, Q_PINK, PAL_FX); }
				}
				if ((intT % 110) === 55) { Ring(intX_a, intY, 10 + bossN, intT & 31, intSp - 4, Q_BLUE); }
				break;
			case 2:
				if ((intT % 5) === 0)
				{
					BulFire(intX_a, intY, (intT * 7) & 255, intSp - 2, Q_PINK, PAL_FX);
					BulFire(intX_a, intY, (intT * 7 + 128) & 255, intSp - 2, Q_PINK, PAL_FX);
				}
				if ((intT % 70) === 0)
				{
					for (intJ = -1; intJ <= 1; intJ++) { BulFire(intX_a, intY, (intA + intJ * 6) & 255, intSp + 8, Q_BLUE, PAL_FX); }
				}
				break;
			default:
				if ((intT % 45) === 0) { Ring(intX_a, intY, 14 + bossN, idiv(intT, 45) * 9, intSp - 4, Q_BLUE); }
				if ((intT % 28) === 14)
				{
					for (intJ = -1; intJ <= 1; intJ++) { BulFire(intX_a, intY, (intA + intJ * 10) & 255, intSp + 10, Q_PINK, PAL_FX); }
				}
				if ((intT % 9) === 0) { BulFire(intX_a, intY, (intT * 11) & 255, intSp, Q_SHOT, PAL_FX); }
				break;
		}
		if ((intT % 60) === 0) { Sfx(1, 90, 2, 11, 10, 0); }
	}

	// mech n beaten: 10,000 times the boss level's number, its bullets gone, a shower of pickups
	function MechDown(intN_a)
	{
		var intPts, intM;
		mhp[intN_a] = 0; mdie[intN_a] = 90;
		mechsKilled++;
		Say(V_MECHDOWN);
		BulOff(MECH_BOX + intN_a);
		BulClear();
		intPts = bossN * 10000;
		AddScore(intPts);
		UpdateHUD();
		ClearMessages();
		MessageAt('GIANT MECH DESTROYED!', 10, 90);
		MessageAt('BONUS' + strS(intPts), 12, 90);
		for (intM = 1; intM <= 4; intM++)
		{
			NewItem(2 + (intM & 1), mcx[intN_a] - 20 + intM * 8, mcy[intN_a]);
		}
		Border(7); flash_bg = 20;
		m_objL2.setColour(0, 0xFF);
		Sfx(2, 31, 0, 15, 80, 1);
		Sfx(0, 300, 10, 15, 60, 0);
	}

	// a smart bomb: every mech on the screen takes a chunk
	function MechBomb()
	{
		var intX;
		for (var intN = 0; intN < mN; intN++)
		{
			if (mhp[intN] > 0)
			{
				intX = (mcx[intN] - cam_x) & WORLD_MASK;
				if (intX >= 512) { intX -= 1024; }
				if ((intX > -32) && (intX < 288))
				{
					mhp[intN] -= 15; mfl[intN] = 8;
					if (mhp[intN] <= 0) { MechDown(intN); }
				}
			}
		}
	}

	// ====================================================================================================
	// THE MAIN PROGRAM: the BASIC's loops and waits as steps (JSteps); a Vsync is the end of an
	// iteration

	// n frames of fn(f) (f from 0), each followed by a Vsync
	function Frames(intN_a, fn_a)
	{
		var intF = 0;
		m_objSteps.until(function()
		{
			var blnDone = (intF >= intN_a);
			if (!blnDone)
			{
				fn_a(intF);
				intF++;
			}
			return blnDone;
		});
	}

	function MainLoop()
	{
		m_objSteps.call(TitleScreen);
		m_objSteps.call(Game);
		m_objSteps.call(MainLoop);
	}

	function Game()
	{
		score = 0; nextBonus = 10000;
		lives = 3; bombs = 3; wave = 1;
		game_over = false;
		cloak = 200; level = 1; saved = 0; bossDone = 0; mechsKilled = 0;
		power = 1; pNext = 0; pAll = 0; guards = 3; guardT = 0; chain = 0; chainT = 0;
		InitWave();
		m_objSteps.call(PlayLoop);
	}

	// Do While Not game_over: a frame of play, then the next
	function PlayLoop()
	{
		if (!game_over)
		{
			m_objSteps.wait(1);
			m_objSteps.call(FrameStart);
			m_objSteps.call(Enemies);
			m_objSteps.call(FrameMiddle);
			m_objSteps.call(FrameBoss);
			m_objSteps.call(FrameBullets);
			m_objSteps.call(FrameEnd);
			m_objSteps.call(PlayLoop);
		}
		else
		{
			m_objSteps.call(GameOver);
		}
	}

	function FrameStart()
	{
		frames = int16(frames + 1);
		f3++;
		if (f3 === 3) { f3 = 0; }
		if (flash_bg > 0)
		{
			flash_bg--;
			if (flash_bg === 0)
			{
				Border(0);
				m_objL2.setColour(0, -1);
			}
		}
		if (msgT > 0)
		{
			msgT--;
			if (msgT === 0) { ClearMessages(); }
		}
		Controls();
		DrawPlayer();
		Humans();
	}

	function FrameMiddle()
	{
		if (!game_over)
		{
			Gate();
			Items();
			Hell();
		}
	}

	function FrameBoss()
	{
		if (!game_over && (bossMode !== 0)) { Boss(); }
	}

	function FrameBullets()
	{
		if (!game_over)
		{
			BulStep(pan);
			if ((hitF !== 0) && (safeT === 0) && (cloakOn === 0) && (guardT === 0)) { LoseLife(); }
		}
	}

	function FrameEnd()
	{
		if (spk !== 0) { Sfx(1, 8, 2, 9, 3, 1); }
		Booms();
		Terrain(cam_x);
		ViewMarks();
		if (hudDirty !== 0) { UpdateHUD(); }
		if ((statsDirty !== 0) && ((frames & 3) === 2)) { ShowStats(); }
		if (!game_over)
		{
			if (warp !== 0)
			{
				WarpDone();
			}
			else if (bossMode !== 0)
			{
				if (mLeft <= 0) { BossOver(); }
			}
			else if ((att <= 0) && (tc <= 0) && (waveT > 10))
			{
				// wave complete: a bonus for each human left
				WaveDone();
			}
		}
	}

	function GameOver()
	{
		HideAllSprites();
		ClsAll();
		ScrollShow(0, 0);
		Pen(10); At(8, 9); PrintS('G A M E   O V E R');
		Say(V_GAMEOVER);
		Pen(15); At(8, 12); PrintS('FINAL SCORE: ' + trimS(score));
		Pen(14); At(8, 14); PrintS('REACHED WAVE: ' + trimS(wave));
		Pen(11); At(8, 16); PrintS('LEVEL: ' + trimS(level) + '  MECHS: ' + trimS(mechsKilled));
		m_objSteps.wait(200);
	}

	function WaveDone()
	{
		var intB, intF;
		for (var intI = 0; intI < MAX_ENEMIES; intI++)
		{
			if (ek[intI] !== 0) { ek[intI] = 0; HideSprite(SLOT_ENEMY0 + intI); BulOff(intI); }
		}
		BulReset();
		// (an Integer: past 32767 it wraps, as the Next's does)
		intB = int16(humans_alive * 100 * wave);
		if (intB > 5000) { intB = 5000; }
		ClearMessages();
		Pen(14);
		At(9, 10); PrintS('ATTACK WAVE' + strS(wave));
		Say(V_WAVEDONE);
		At(11, 11); PrintS('COMPLETED');
		Pen(15);
		At(9, 13); PrintS('BONUS' + strS(intB));
		m_strLive = 'none';
		for (intF = 0; intF <= 5; intF++)
		{
			m_objSteps.call(sfxStep(intF));
			m_objSteps.wait(10);
		}
		m_objSteps.call(function()
		{
			AddScore(intB);
			UpdateHUD();
			// the humanoids left are saved: every 8, a level
			SaveFolk(humans_alive);
			ShowStats();
		});
		m_objSteps.wait(90);
		m_objSteps.call(function()
		{
			m_strLive = 'all';
			wave++;
			if (bombs < 5) { bombs++; }
			NextWave();
		});
	}

	function sfxStep(intF_a)
	{
		return function()
		{
			Sfx(intF_a % 3, 120 - intF_a * 12, 0, 13, 12, 0);
		};
	}

	// the next wave, or first the giant mechs (every fifth level)
	function NextWave()
	{
		if (idiv(level, 5) > bossDone) { StartBoss(); } else { InitWave(); }
	}

	// the giant mechs gone: a moment, then the next wave
	function BossOver()
	{
		bossDone = bossN;
		bossMode = 0;
		BulReset();
		if (setOn0 !== 0) { HideSprite(SLOT_BOSS0); }
		if (setOn1 !== 0) { HideSprite(SLOT_BOSS1); }
		setOn0 = 0; setOn1 = 0;
		m_strLive = 'none';
		m_objSteps.wait(100);
		m_objSteps.call(function()
		{
			m_strLive = 'all';
			InitWave();
		});
	}

	var m_intTitleT = 0;

	function TitleScreen()
	{
		var arrRows = [[1, 'tlander'], [2, 'tmutant'], [3, 'tbaiter'], [4, 'tbomber'], [5, 'tpod'], [6, 'tswarm'],
			[7, 'tfireb'], [8, 'tdynamo'], [9, 'tguppy'], [10, 'tphred'], [11, 'tbigred'], [12, 'thuman']];
		HideAllSprites();
		ClsAll();
		ScrollShow(0, 0);
		Stars();
		L2Big(24, 6, 'DEFENDER', 3, 0xFC, 0xE0);
		Pen(10); At(9, 6); PrintS('H E L L G A T E');
		Pen(15);
		At(4, 8); PrintS('LANDER    150');
		At(4, 10); PrintS('MUTANT    150');
		At(4, 12); PrintS('BAITER    200');
		At(4, 14); PrintS('BOMBER    250');
		At(4, 16); PrintS('POD      1000');
		At(4, 18); PrintS('SWARMER   150');
		At(20, 8); PrintS('FIREBOMB 250');
		At(20, 10); PrintS('DYNAMO   200');
		At(20, 12); PrintS('GUPPY    200');
		At(20, 14); PrintS('PHRED    200');
		At(20, 16); PrintS('BIG RED  200');
		At(20, 18); PrintS('HUMANOID 500');
		Pen(12);
		At(1, 21); PrintS('Q/A UP/DN O/P THRUST SPACE FIRE');
		At(1, 22); PrintS('B BOMB H HYPER G GUARD I INVISO');
		Pen(11);
		At(1, 24); PrintS('(C) 2026 CYBORG UNICORN PTY LTD');
		m_intTitleT = 0;
		m_objSteps.wait(1);
		// the cast down the sides (flapping every 8 frames), a P and a big P, the ship flying across
		processArray(arrRows, function(arrRow_a, intRow_a, intI_a)
		{
			Put8(arrRow_a[0], (intI_a < 6) ? 16 : 144, 195 - (8 + (intI_a % 6) * 2) * 8, arrRow_a[1], false);
			m_objSlots.animate(arrRow_a[0], 1, true);
		});
		Put4(13, 56, 195 - 6 * 8, 'ip', PAL_ITEM, 1);
		m_objSlots.animate(13, 1, true);
		Put4(14, 200, 195 - 6 * 8, 'ibig', PAL_ITEM, 1);
		m_objSlots.animate(14, 1, true);
		Put8(SLOT_PLAYER, -20, 195 - 20 * 8 + 2, 'tship', false);
		m_objSlots.animate(SLOT_PLAYER, 1, true);
		m_objSlots.setMover(SLOT_PLAYER, function(intN_a, objO_a)
		{
			objO_a.x = ((objO_a.t + 2) * 2) % 300 - 20 + 24;
			return false;
		});
		m_objSteps.until(function()
		{
			m_intTitleT++;
			Pen(10); At(7, 23);
			if ((idiv(m_intTitleT, 25) & 1) !== 0) { PrintS('PRESS SPACE OR FIRE'); } else { PrintS('                   '); }
			return down(K_SPACE);
		});
		m_objSteps.until(function()
		{
			return !down(K_SPACE);
		});
		m_objSteps.call(HideAllSprites);
	}

	// ====================================================================================================
	// THE LANDSCAPE: Layer 2's column (wx And 255) holds world x wx; the copper scrolls the ground
	// (from line 160) by cx And 255 and the sky (lines 44-159) by a quarter of that

	function Heights()
	{
		var intH0, intH1;
		for (var intWX = 0; intWX <= WORLD_MASK; intWX++)
		{
			intH0 = GetTerrainY(intWX); intH1 = GetTerrainY((intWX + 4) & WORLD_MASK);
			yh[intWX] = 191 - (intH0 + idiv((intH1 - intH0) * (intWX & 3), 4));
		}
	}

	function Col(intWX_a)
	{
		var intC = intWX_a & (L2W - 1);
		if (ycol[intC] >= 0) { m_objL2.plot(intC, ycol[intC], 0); }
		ycol[intC] = yh[intWX_a & WORLD_MASK];
		m_objL2.plot(intC, ycol[intC], COL_TERRAIN);
	}

	function Cols(intCX_a, intK0_a, intN_a)
	{
		for (var intK = 0; intK < intN_a; intK++) { Col(intCX_a + intK0_a + intK); }
	}

	function Terrain(intCX_a)
	{
		var intD;
		// the columns shown: the Next's 256 and, on a wide screen, those either side
		var intL = Math.min(m_intWL, WIDEMAX), intN = 256 + intL + Math.min(m_intWR, WIDEMAX);
		if (terDead !== planet_dead) { Heights(); }
		if ((terOn === 0) || (terDead !== planet_dead) || (intN !== terN))
		{
			Cols(intCX_a, -intL, intN);
		}
		else
		{
			intD = (intCX_a - tcam) & WORLD_MASK;
			if (intD >= 512) { intD -= 1024; }
			if ((intD >= intN) || (intD <= -intN))
			{
				Cols(intCX_a, -intL, intN);
			}
			else if (intD > 0)
			{
				Cols(intCX_a, intN - intL - intD, intD);
			}
			else if (intD < 0)
			{
				Cols(intCX_a, -intL, -intD);
			}
		}
		terN = intN;
		terOn = 1; terDead = planet_dead; tcam = intCX_a;
		ScrollShow(idiv(intCX_a, 4) & 255, intCX_a & (L2W - 1));
	}

	// ====================================================================================================
	// THE SPRITE LIBRARY: what each thing is - its frames, its animation (as the original picks its
	// frames), its hit box (sized so the questions are the original's tests: the ship's middle is a
	// point, so each box is the distance the original tests)

	function lib(strName_a, strImage_a, intW_a, intH_a, arrSeq_a, intDelay_a, intHBW_a, intHBH_a)
	{
		return { name:strName_a, classes:'defhell', imagename:strImage_a, x:0, y:0, w:intW_a, h:intH_a, imagex:0, imagey:0, imagew:intW_a, imageh:intH_a,
			sequence:arrSeq_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	function makeSprites()
	{
		var arrLib = [], intK, intP, intSecond;
		// the ship: still (step 1), its flame flickering every 2 frames while it thrusts (step 3)
		arrLib.push(lib('ship', 'dh_s8', 16, 16, [PAT_PLAYER + 1, -1, PAT_PLAYER + PAT_FRAME2 + 1, PAT_PLAYER + 1, -3], 2, 0, 0));
		arrLib.push(lib('shipboom', 'dh_s8', 16, 16, [PAT_BOOM + 1, PAT_BOOM + 2, PAT_BOOM + 3, PAT_BOOM + 4, -1], 4, 0, 0));
		// the ship's middle: a point (drawn as nothing)
		arrLib.push(lib('probe', 'dh_s8', 16, 16, [41, 0], 1, 0, 0));
		// the guard, twice the size, mirrored every other frame
		arrLib.push(lib('guard', 'dh_q8', 16, 16, [Q_GUARD - 79, 47, -1], 1, 0, 0));
		// the HELLGATE, twice the size: in within 12 of its middle
		arrLib.push(lib('gate', 'dh_s8', 16, 16, [PAT_GATE + 1, PAT_GATE + 2, -1], 4, 13, 13));
		// a humanoid: walking (step 1), held or falling (step 4); caught within 12 both ways
		arrLib.push(lib('human', 'dh_s8', 16, 16, [PAT_HUMAN + 1, PAT_HUMAN + PAT_FRAME2 + 1, -1, PAT_HUMAN + 1, -4], 16, 24, 24));
		// the enemies: two patterns each, changing every 8 frames (or 4); into the ship within 11
		// across, 9 up or down
		for (intK = 1; intK <= 14; intK++)
		{
			intP = KPAT[intK];
			intSecond = ((intP === PAT_LANDER) || (intP === PAT_MUTANT)) ? intP + PAT_FRAME2 : intP + 1;
			arrLib.push(lib('e' + intK, 'dh_s8', 16, 16, [intP + 1, intSecond + 1, -1],
				((intP === PAT_BAITER) || (intP === PAT_SWARM) || (intP === PAT_FIREB) || (intP === PAT_FBALL) || (intP === PAT_MUNCH) || (intP === PAT_PHRED) || (intP === PAT_BIGRED)) ? 4 : 8, 22, 18));
		}
		// an explosion: patterns 10-13, 4 frames each (the last 3)
		arrLib.push(lib('boom', 'dh_s8', 16, 16, [11, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14, 0], 1, 0, 0));
		// the pickups: a P spinning, a big P, a gem; picked up within 10 both ways
		arrLib.push(lib('ip', 'dh_q8', 16, 16, [1, 2, 3, 4, -1], 4, 20, 20));
		arrLib.push(lib('ibig', 'dh_q8', 16, 16, [5, 6, -1], 8, 20, 20));
		arrLib.push(lib('igem', 'dh_q8', 16, 16, [7, 8, -1], 4, 20, 20));
		// a giant mech (64 x 48): rammed within 26 across, 20 up or down
		arrLib.push(lib('mech', 'dh_mech', 64, 48, [1, 0], 1, 52, 40));
		// an enemy bullet (on the ship within 3 both ways), a laser shot (a point)
		arrLib.push(lib('bul', 'dh_q14', 16, 16, [Q_SHOT - 79, 0], 1, 8, 8));
		arrLib.push(lib('shot', 'dh_q14', 16, 16, [Q_LASER - 79, 0], 1, 0, 0));
		// Bul.cls's targets: |x - bx| < hw, |y - by| < hh (drawn as nothing)
		processArray([[7, 6], [7, 3], [5, 4], [4, 4], [28, 20]], function(arr_a)
		{
			arrLib.push(lib('tgt' + arr_a[0] + '_' + arr_a[1], 'dh_s8', 16, 16, [41, 0], 1, arr_a[0] * 2, arr_a[1] * 2));
		});
		// the title's: the cast flapping every 8 frames, the ship flying past
		processArray([['tlander', PAT_LANDER, PAT_LANDER + PAT_FRAME2], ['tmutant', PAT_MUTANT, PAT_MUTANT + PAT_FRAME2], ['tbaiter', PAT_BAITER, PAT_BAITER + 1],
			['tbomber', PAT_BOMBER, PAT_BOMBER + 1], ['tpod', PAT_POD, PAT_POD + 1], ['tswarm', PAT_SWARM, PAT_SWARM + 1], ['tfireb', PAT_FIREB, PAT_FIREB + 1],
			['tdynamo', PAT_DYNAMO, PAT_DYNAMO + 1], ['tguppy', PAT_GUPPY, PAT_GUPPY + 1], ['tphred', PAT_PHRED, PAT_PHRED + 1], ['tbigred', PAT_BIGRED, PAT_BIGRED + 1],
			['thuman', PAT_HUMAN, PAT_HUMAN + PAT_FRAME2], ['tship', PAT_PLAYER, PAT_PLAYER + PAT_FRAME2]], function(arr_a)
		{
			arrLib.push(lib(arr_a[0], 'dh_s8', 16, 16, [arr_a[1] + 1, arr_a[2] + 1, -1], 8, 0, 0));
		});
		m_objSprites.addSpritesToLibrary(arrLib);
		for (intK = 0; intK < NSLOTS; intK++)
		{
			m_objSlots.put(intK, 0, 0, 'probe', 41, 'dh_s8');
			m_objSlots.hide(intK);
		}
		m_objSlots.setClip(32, 32, 256, 192);
	}

	// ====================================================================================================
	// FOR THE TESTS: what's going on; a few short cuts

	this.test = function(strWhat_a)
	{
		var intI;
		var objResult = { score:score, lives:lives, bombs:bombs, wave:wave, level:level, power:power, pnext:pNext, guards:guards, humans:humans_alive,
			att:att, tocome:tc, px:px, py:py, psx:psx, bossMode:bossMode, mLeft:mLeft, mN:mN, over:game_over, frames:frames, chain:chain, live:m_strLive,
			mx:WorldToScreenX(mcx[0], cam_x), mhp:mhp[0], bullets:bon.join('').split('1').length - 1 };
		if (strWhat_a === 'lastlife') { lives = 1; hudDirty = 1; }
		if (strWhat_a === 'safe') { safeT = 30000; }
		if (strWhat_a === 'unsafe') { safeT = 0; }
		if (strWhat_a === 'endwave')
		{
			for (intI = 0; intI < MAX_ENEMIES; intI++) { if (ek[intI] !== 0) { KillEnemy(intI); } }
			for (intI = 0; intI <= 14; intI++) { q[intI] = 0; }
		}
		if (strWhat_a === 'level5') { level = (bossDone + 1) * 5; saved = 0; statsDirty = 1; }
		if (strWhat_a === 'item') { NewItem(1, px + 30 * pdir, py + 10); NewItem(2, px + 40 * pdir, py - 10); }
		if (strWhat_a === 'bullets') { Ring(psx + 60, 191 - py, 12, 0, 16, Q_BLUE); }
		if (strWhat_a === 'nearmech') { px = (mcx[0] - 70) & WORLD_MASK; cam_x = (px - psx) & WORLD_MASK; pan = 0; }
		if (strWhat_a === 'power5') { power = 5; statsDirty = 1; }
		if (strWhat_a === 'gatepos') { px = (GATEX - 50) & WORLD_MASK; py = GATEY; pdir = 1; psx = 88; cam_x = (px - psx) & WORLD_MASK; pan = 0; }
		if (strWhat_a === 'aboard4') { for (intI = 0; intI < 4; intI++) { if (hstate[intI] !== H_DEAD) { hstate[intI] = H_CARRIED; } } }
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
			// the sprites' animations and movers: all of them, or (in the original's waits) only the
			// ship blowing up, or none
			if (m_strLive === 'all') { m_objSlots.step(); } else if (m_strLive === 'ship') { m_objSlots.step(SLOT_PLAYER, 1); }
			VoiceKeys();
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
			m_objSlots.setClip(32 - intL, 32, 256 + intL + intR, 192);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			// the layers as the Next has them (SUL): Layer 2 at the bottom (the scanner still, the sky
			// a quarter of the ground's scroll, the ground), the tilemap over it, the sprites on top
			// (wide: drawn from further left, each band's scroll moved back to match; a ring of L2W)
			var intL = Math.min(m_intWL, WIDEMAX);
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(GAMEX + 32 - intL, 32, 256 + intL + Math.min(m_intWR, WIDEMAX), 192);
			objContext_a.clip();
			m_objL2.paint(objContext_a, GAMEX + 32 - intL, 32, [ { y:0, h:44, scroll:L2W - intL }, { y:44, h:116, scroll:m_intSkyScroll - intL }, { y:160, h:32, scroll:m_intGroundScroll - intL } ]);
			objContext_a.restore();
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
			objContext_a.clip();
			objContext_a.translate(GAMEX, 0);
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
			objContext_a.restore();
		}
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		var intR;
		SetPens();
		MakeLand();
		Heights();
		SinTables();
		BulReset();
		// the images (tools/ports/defhell_gfx.py)
		m_objSprites.addImagesToLibrary([ { name:'dh_s8', classes:'defhell', source:'images/defhell/spr8.png' },
			{ name:'dh_mech', classes:'defhell', source:'images/defhell/mech.png' },
			{ name:'dh_mechw', classes:'defhell', source:'images/defhell/mechw.png' } ]);
		for (intR = 8; intR <= 15; intR++)
		{
			m_objSprites.addImagesToLibrary([ { name:'dh_q' + intR, classes:'defhell', source:'images/defhell/spr4_' + intR + '.png' } ]);
		}
		for (intR = 2; intR <= 7; intR++)
		{
			m_objSprites.addImagesToLibrary([ { name:'dh_t' + intR, classes:'defhell', source:'images/defhell/tiles_' + intR + '.png' } ]);
		}
		makeSprites();
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16,
			images:['dh_t2', 'dh_t2', 'dh_t2', 'dh_t3', 'dh_t4', 'dh_t5', 'dh_t6', 'dh_t7'], first:0, firstcode:0, transparent:0 });
		// no on-screen controls; a game pad is the Next's joystick (its stick and two fire buttons)
		m_objPad = new JPad({ controls:[], gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE, fire2:K_B } } ] });
		m_objSound.addSamplesToLibrary(DEFHELL_VOICE);
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('defhell'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			MainLoop();
		});
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear:true, autorotate:true, buffered:true, pixelated:true, hidpi:true, maxtouches:6,
			target:'canOutput', xresolution:VIEW.w, yresolution:VIEW.h, xorigin:VIEW.x, yorigin:VIEW.y, screenmode:'ask', cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new defhellGame();
g_objGame.run();
