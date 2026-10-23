// CRAZY ROBOT - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Robotron meets Berzerk, with bullet hell and laser beams. Twenty rooms of the robot factory, one
// after another. The walls are electric: touch one and you're toast (the robots too). Shoot the
// robots, save the humans, get out through a door before the crazy face comes looking for you.
// Every fifth room has a boss, and its doors stay shut until it's scrap.
//
// Keys: Q A O P (or a game pad's stick): move, eight ways. Space (or the game pad's A): shoot the
//       way you face; hold it and you keep facing that way (walk backwards, sideways, firing);
//       hold it for a moment and it's the laser beam: much stronger, but you walk slower.
// Touch (nothing drawn: invisible zones over the picture): the left half moves (its left, right,
//       top and bottom edges; the corners go both ways), the right half is fire (hold it). Move
//       and fire together with two thumbs. A touch anywhere starts.
//
// The screen is the Next's: the walls, the HUD and the words are the tile screen (JTileGrid; the
// walls' glow is their own colour variant, its image swapped round every four frames as the Next
// turns three palette colours round); the floor is the Next's Layer 2 (a picture per tint, made
// once); you, the robots, the humans, the crazy face, the bosses, the lasers and every bullet and
// shot are numbered sprites, numbered as on the Next. The bullets and shots move themselves (their
// movers: Bul.cls's), and the sprites' hit boxes say what a shot hits and what bullet gets you.
// The game runs 50 iterations a second - the Next's frames.
//
// Moved from the Next: "ROOM nn" at the top right is one cell further left (its last digit was
// past the picture, in the Next's border); the canvas is the picture, 256 x 256.
//
// The Next version's bugs fixed here, because they broke play:
// - The top and bottom doors killed you every time: your wall check looks 6 above and 7 below your
//   middle, and past the room's edge counts as a wall, so in the doorway you died a step before
//   you were out. Here past the edge isn't a wall for that check.
// - A human you saved kept being saved, every frame you stood near them (If hon(j) is true for
//   the heart's -30 too, so the heart never floated away): points, SAVED and extra lives poured in.
//   Here only a human still wandering can be saved.
//
// The Next version's bugs, kept as they are (none of them stops the game being played):
// - BASIC's True is -1, so a boss's speed 1 + (hp < half) is 0 once it's below half: TANK-O and
//   SPIDERBOT stop going side to side (they were meant to speed up). And the grunts step every
//   3 - (room > 10) = 4th frame after room 10, slower, not faster.
// - The turret on the left wall points into the wall (rotate + mirror Y, where mirror X was meant).
// - The laser beam's hit spark is hidden again the same frame (Sparks), so it's never seen.
// - Die by walking into a wall while the beam is on, and the beam stays on the screen until the
//   room starts again (Shoot runs straight after You, puts it back, and isn't run again).
// - The explosion's place (cx1, cy1) is shared with FreeSpot and the crazy face: a boss laying
//   robots can make an explosion jump.
// - The key that ends GAME OVER (or the ending) is still down when the title starts, so the title
//   shows for one frame and a new game starts straight away.
function crazybotGame()
{
	var m_objThis = this;
	var G = GFX_CRAZYBOT;

	// the part of the Next's 320 x 256 screen the game draws in: the paper's width (the HUD's text
	// is all inside it) and the whole height (the HUD bands above and below): the canvas is this
	var VIEW = { x:32, y:0, w:256, h:256 };

	// keys (keyCodes)
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_SPACE = 32;

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left
	// half moves (a strip along each of its edges; the corners press two ways), the right half
	// fires. The title, game over and the ending: anywhere is fire
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:43, h:VIEW.h, key:K_O },
		{ type:'zone', x:VIEW.x + 85, y:VIEW.y, w:43, h:VIEW.h, key:K_P },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:128, h:85, key:K_Q },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 85, w:128, h:85, key:K_A },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y, w:128, h:VIEW.h, key:K_SPACE } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:K_SPACE } ];

	var NR = 16, NH = 3;
	// robot kinds
	var K_GRUNT = 1, K_SHOOT = 2, K_SPIN = 3, K_HULK = 4, K_TURRET = 5;
	// sprite slots (as the Next's): the bullets 50-109, your shots 110-127
	var SL_ROB = 0, SL_BOSS = 16, SL_YOU = 20, SL_HUM = 21, SL_CRAZY = 24, SL_BEAM = 25, SL_RAY = 33, SL_SPARK = 49;
	var SL_BUL = 50, NBUL = 60, SL_SHOT = 110, NSHOT = 18;
	var BEAMN = 8, RAYN = 8;
	// the shots' targets: the robots 0-15, the boss 16
	var NBOX = 17, BOX_BOSS = 16;

	// the bullets' sines: 256 steps round, x 127 (Bul.cls's table)
	var SINES = [
		0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3,
		0, 253, 250, 247, 244, 240, 237, 234, 231, 228, 225, 222, 219, 216, 213, 210, 207, 205, 202, 199, 196, 193, 191, 188, 185, 183, 180, 178, 175, 173, 171, 168,
		166, 164, 162, 160, 158, 156, 154, 152, 150, 149, 147, 145, 144, 143, 141, 140, 139, 138, 136, 135, 134, 134, 133, 132, 131, 131, 130, 130, 130, 129, 129, 129,
		129, 129, 129, 129, 130, 130, 130, 131, 131, 132, 133, 134, 134, 135, 136, 138, 139, 140, 141, 143, 144, 145, 147, 149, 150, 152, 154, 156, 158, 160, 162, 164,
		166, 168, 171, 173, 175, 178, 180, 183, 185, 188, 191, 193, 196, 199, 202, 205, 207, 210, 213, 216, 219, 222, 225, 228, 231, 234, 237, 240, 244, 247, 250, 253 ];
	// atan(k / 16) in 256ths of a turn (Bul.Aim's)
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];
	// a robot's legs: a step every 8 frames, 16 steps round (started part way in, so each robot
	// keeps its own timing, as the Next's rt(m) \ 8)
	var ROBSEQ = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, -1];
	// an explosion: four pictures over 15 frames, then done (the first step is passed over by the
	// step() in the frame it starts)
	var BOOMSEQ = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 0];
	// the floor's colours (dark, lines) by the room's group of five
	var FLOORS = [[0x01, 0x26], [0x20, 0x44], [0x04, 0x2D], [0x21, 0x66]];
	// the glow's three colour schemes, turned round (the Next's tile palette entries 4-6)
	var GLOWS = ['crazybot_t0', 'crazybot_tg1', 'crazybot_tg2'];
	var BOSSNAMES = 'TANK-O     SPIDERBOT  BRAIN TANK MOTHER CORE';

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objPad, m_objGrid;
	var m_arrFloors = [];
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the robots: kind (0 none), x, y (the middle, room pixels), life, its own clock, way, wall
	// (turrets), its explosion's frames left, its legs' start
	var m_arrRK = [], m_arrRX = [], m_arrRY = [], m_arrRHP = [], m_arrRT = [], m_arrRDX = [], m_arrRDY = [], m_arrRF = [], m_arrRBoom = [], m_arrRStep = [];
	// the humans: x, y, on (1 wandering, negative: the heart floating up), way
	var m_arrHX = [], m_arrHY = [], m_arrHOn = [], m_arrHDX = [], m_arrHDY = [];
	// the turrets' / bosses' lasers, 2 at a time: on (1 warning, 2 firing), across (0) or down (1),
	// where, from, to, time, whose (a robot, -1 the boss)
	var m_arrROn = [0, 0], m_arrRDir = [0, 0], m_arrRPos = [0, 0], m_arrRA = [0, 0], m_arrRB = [0, 0], m_arrRTm = [0, 0], m_arrROwn = [0, 0];
	// the walls: 32 x 24 cells (Bul.cls's map)
	var m_arrWall = [];
	// the shots' targets: on, the hits not read yet; the spark (Bul.Sparked: 1 a hit, 2 a wall)
	var m_arrBoxOn = [], m_arrHits = [], m_arrShotWall = [];
	var m_intSpk = 0, m_intSpkX = 0, m_intSpkY = 0, m_blnHit = false;

	var m_intPX = 0, m_intPY = 0, m_intFC = 0, m_intLock = 0, m_intHeld = 0, m_intAlive = 0;
	var m_intRoom = 1, m_intLives = 3, m_intScore = 0, m_intHiscore = 10000, m_intSaved = 0;
	var m_intEntry = 0, m_intFrames = 0, m_intRoomT = 0, m_intCrazyOn = 0, m_intCX1 = 0, m_intCY1 = 0, m_intCDX = 0, m_intCDY = 0;
	var m_intBossHp = 0, m_intBossMax = 1, m_intBossK = 0, m_intBossX = 0, m_intBossY = 0, m_intBossT = 0, m_intBossDX = 1;
	var m_intShotT = 0, m_intBeamOn = 0, m_intNextLife = 20000;
	var m_intDeadT = 0, m_intSpkT = 0, m_intGlowT = 0, m_intWon = 0, m_intExitD = -1;
	var m_intSeed = 0;

	// what's showing: the floor's tint, the big letters on it ('', 'title', 'ending')
	var m_intFloor = 0, m_strBig = '';
	var m_strState = 'loading', m_intStep = 0, m_intTitleStep = 0;

	// ====================================================================================================
	// HELPERS

	// BASIC's \ : whole number division, towards nought
	function idiv(intA_a, intB_a)
	{
		return (intA_a / intB_a) | 0;
	}

	// BASIC's Sgn
	function sgn(int_a)
	{
		var intResult = 0;
		if (int_a > 0) { intResult = 1; }
		if (int_a < 0) { intResult = -1; }
		return intResult;
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function fire1()
	{
		return down(K_SPACE);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a === 1);
	}

	function text(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	// BASIC's Format$(n, "000...") with intW_a noughts
	function zeros(int_a, intW_a)
	{
		var strResult = String(int_a);
		while (strResult.length < intW_a)
		{
			strResult = '0' + strResult;
		}
		return strResult;
	}

	// sprite n: a library sprite in sprite palette row intRow_a (frame undefined: its animation's)
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, 'crazybot_s' + intRow_a, intScale_a, intFlags_a);
	}

	// a laser piece (32 x 16, the Next's 16 x 16 stretched twice as long) with its top left at the
	// Next's x, y: across, or turned to go down (16 x 32)
	function sprLong(intN_a, intX_a, intY_a, strName_a, intFrame_a, blnDown_a)
	{
		if (blnDown_a)
		{
			spr(intN_a, intX_a - 8, intY_a + 8, strName_a, intFrame_a, 0, 1, SPRITE_ROTATE);
		}
		else
		{
			spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, 0, 1, 0);
		}
	}

	// two 32-bit whole numbers multiplied, as the Next's Long does (the low 32 bits; here as a
	// number up to 2^33 that & makes 32 bits of)
	function mul32(intA_a, intB_a)
	{
		var intAH = (intA_a >>> 16) & 0xFFFF, intAL = intA_a & 0xFFFF;
		var intBH = (intB_a >>> 16) & 0xFFFF, intBL = intB_a & 0xFFFF;
		return ((intAH * intBL + intAL * intBH) & 0xFFFF) * 65536 + intAL * intBL;
	}

	// a repeatable random number 0 .. n-1 (each room's maze is always the same)
	function rndS(intN_a)
	{
		m_intSeed = (mul32(m_intSeed, 1103515245) + 12345) & 0x7FFFFFFF;
		return idiv(m_intSeed, 65536) % intN_a;
	}

	function kindName(intKind_a)
	{
		var strResult = 'turret';
		if (intKind_a === K_GRUNT) { strResult = 'grunt'; }
		else if (intKind_a === K_SHOOT) { strResult = 'shooter'; }
		else if (intKind_a === K_SPIN) { strResult = 'spinner'; }
		else if (intKind_a === K_HULK) { strResult = 'hulk'; }
		return strResult;
	}

	// the step of ROBSEQ to start at so the legs show (t \ 8) mod 2 from the next frame drawn
	function legStep(intT_a)
	{
		var intResult = intT_a % 16;
		if (intResult === 0) { intResult = 16; }
		return intResult;
	}

	function setup()
	{
		var intK;
		for (intK = 0; intK < 256; intK++)
		{
			if (SINES[intK] > 127) { SINES[intK] -= 256; }
		}
		for (intK = 0; intK < NR; intK++)
		{
			m_arrRK.push(0); m_arrRX.push(0); m_arrRY.push(0); m_arrRHP.push(0); m_arrRT.push(0); m_arrRDX.push(0); m_arrRDY.push(0); m_arrRF.push(0); m_arrRBoom.push(0); m_arrRStep.push(0);
		}
		for (intK = 0; intK < NH; intK++)
		{
			m_arrHX.push(0); m_arrHY.push(0); m_arrHOn.push(0); m_arrHDX.push(0); m_arrHDY.push(0);
		}
		for (intK = 0; intK < 768; intK++)
		{
			m_arrWall.push(0);
		}
		for (intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn.push(false); m_arrHits.push(0);
		}
		for (intK = 0; intK < NSHOT; intK++)
		{
			m_arrShotWall.push(false);
		}
	}

	// the floors (Layer 2): metal plates, a picture for each of the four tints
	function buildFloors()
	{
		var intT, intX, intY, objCanvas, objContext, strB, strL;
		for (intT = 0; intT < 4; intT++)
		{
			objCanvas = document.createElement('canvas');
			objCanvas.width = 256; objCanvas.height = 192;
			objContext = objCanvas.getContext('2d');
			strB = rgb332ToCSS(FLOORS[intT][0]);
			strL = rgb332ToCSS(FLOORS[intT][1]);
			objContext.fillStyle = strB;
			objContext.fillRect(0, 0, 256, 192);
			objContext.fillStyle = strL;
			for (intY = 0; intY < 192; intY += 16)
			{
				objContext.fillRect(0, intY, 256, 1);
			}
			for (intX = 0; intX < 256; intX += 16)
			{
				objContext.fillRect(intX, 0, 1, 192);
			}
			for (intY = 4; intY < 192; intY += 16)
			{
				for (intX = 4; intX < 256; intX += 16)
				{
					objContext.fillRect(intX, intY, 1, 1);
					if ((intX + 8 < 256) && (intY + 8 < 192)) { objContext.fillRect(intX + 8, intY + 8, 1, 1); }
				}
			}
			m_arrFloors.push(objCanvas);
		}
	}

	// ====================================================================================================
	// THE BULLETS, THE SHOTS AND THE WALLS (the Next's Bul.cls): sprites 50-127, each moving itself

	// Bul.Solid: the wall at room pixel x, y (outside the room: a wall)
	function solid(intX_a, intY_a)
	{
		var intResult = 1;
		if ((intX_a >= 0) && (intX_a < 256) && (intY_a >= 0) && (intY_a < 192))
		{
			intResult = m_arrWall[(intY_a >> 3) * 32 + (intX_a >> 3)];
		}
		return intResult;
	}

	// a wall at room pixel x, y; outside the room: none (your own check, see you())
	function wallIn(intX_a, intY_a)
	{
		var intResult = 0;
		if ((intX_a >= 0) && (intX_a < 256) && (intY_a >= 0) && (intY_a < 192))
		{
			intResult = m_arrWall[(intY_a >> 3) * 32 + (intX_a >> 3)];
		}
		return intResult;
	}

	// a robot bullet's mover: where it is in 1/256ths of a pixel (16 bits, as the Next's); it goes
	// when it leaves the room or hits a wall
	function bulletMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = (intX_a & 255) * 256 + 128, intY = (intY_a & 255) * 256 + 128;
		return function(intN_a, objO_a)
		{
			var intHX, intHY, blnGone = false;
			intX = (intX + intVX_a) & 0xFFFF;
			intHX = intX >> 8;
			if ((intHX < 2) || (intHX >= 254)) { blnGone = true; }
			intY = (intY + intVY_a) & 0xFFFF;
			intHY = intY >> 8;
			if ((intHY < 2) || (intHY >= 190)) { blnGone = true; }
			if ((!blnGone) && (m_arrWall[(intHY >> 3) * 32 + (intHX >> 3)] !== 0)) { blnGone = true; }
			objO_a.x = intHX + 24; objO_a.y = intHY + 24;
			return blnGone;
		};
	}

	// one of your shots: vx, vy pixels a frame (bytes, as the Next's); it goes at the room's edge,
	// or at a wall (a spark there)
	function shotMover(intN_a, objO_a)
	{
		var intX = (objO_a.x - 24 + objO_a.vx) & 255, intY = (objO_a.y - 24 + objO_a.vy) & 255;
		var blnGone = false;
		if ((intX < 2) || (intX >= 254) || (intY < 2) || (intY >= 190))
		{
			blnGone = true;
		}
		else if (m_arrWall[(intY >> 3) * 32 + (intX >> 3)] !== 0)
		{
			blnGone = true;
			m_arrShotWall[intN_a - SL_SHOT] = true;
		}
		objO_a.x = intX + 24; objO_a.y = intY + 24;
		return blnGone;
	}

	// Bul.Reset: no bullets, no shots, no targets
	function bulReset()
	{
		m_objSlots.hideRange(SL_BUL, NBUL + NSHOT);
		for (var intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn[intK] = false; m_arrHits[intK] = 0;
		}
	}

	// Bul.Clear: every robot bullet gone
	function bulClear()
	{
		m_objSlots.hideRange(SL_BUL, NBUL);
	}

	// Bul.Fire: a robot bullet from x, y going way a (0-255: 0 down, 64 right, 128 up, 192 left)
	// at spd sixteenths of a pixel a frame, bullet picture intFrame_a (1 red, 2 pink, 3 small cyan)
	function bulFire(intX_a, intY_a, intA_a, intSpd_a, intFrame_a)
	{
		var intN = -1, intK, intS, intVX, intVY;
		for (intK = SL_BUL; (intK < SL_BUL + NBUL) && (intN < 0); intK++)
		{
			if (!m_objSlots.isVisible(intK)) { intN = intK; }
		}
		if (intN >= 0)
		{
			intS = SINES[intA_a & 255];
			intVX = (Math.abs(intS) * (intSpd_a & 255)) >> 3;
			if (intS < 0) { intVX = -intVX; }
			intS = SINES[(intA_a + 64) & 255];
			intVY = (Math.abs(intS) * (intSpd_a & 255)) >> 3;
			if (intS < 0) { intVY = -intVY; }
			spr(intN, (intX_a & 255) + 24, (intY_a & 255) + 24, 'bullet', intFrame_a, 0);
			m_objSlots.setMover(intN, bulletMover(intX_a, intY_a, intVX, intVY));
		}
	}

	// Bul.Shot: one of your shots from x, y moving vx, vy a frame, picture intFrame_a (1 across,
	// 2 slanting) turned and mirrored by intFlags_a
	function bulShot(intX_a, intY_a, intVX_a, intVY_a, intFrame_a, intFlags_a)
	{
		var intN = -1, intK;
		for (intK = SL_SHOT; (intK < SL_SHOT + NSHOT) && (intN < 0); intK++)
		{
			if (!m_objSlots.isVisible(intK)) { intN = intK; }
		}
		if (intN >= 0)
		{
			spr(intN, (intX_a & 255) + 24, (intY_a & 255) + 24, 'shot', intFrame_a, 0, 1, intFlags_a);
			m_objSlots.setMover(intN, shotMover, intVX_a, intVY_a);
		}
	}

	// target n's sprite
	function boxSlot(intT_a)
	{
		return (intT_a === BOX_BOSS) ? SL_BOSS : SL_ROB + intT_a;
	}

	// Bul.Step: every bullet and shot moved (their movers, with every animation a step on); each
	// shot against the targets (their sprites' hit boxes) - a hit counts and the shot goes; and a
	// bullet on you (your hit box: your middle, 3 pixels each way)
	function bulStep()
	{
		var intS, intN, intT, blnHit;
		for (intS = 0; intS < NSHOT; intS++)
		{
			m_arrShotWall[intS] = false;
		}
		m_objSlots.step();
		m_intSpk = 0;
		for (intS = 0; intS < NSHOT; intS++)
		{
			intN = SL_SHOT + intS;
			if (m_arrShotWall[intS])
			{
				m_intSpk = 2; m_intSpkX = m_objSlots.getX(intN) - 24; m_intSpkY = m_objSlots.getY(intN) - 24;
			}
			else if (m_objSlots.isVisible(intN))
			{
				blnHit = false;
				for (intT = 0; (intT < NBOX) && !blnHit; intT++)
				{
					if (m_arrBoxOn[intT] && m_objSlots.collide(intN, boxSlot(intT)))
					{
						blnHit = true;
						m_arrHits[intT] = Math.min(255, m_arrHits[intT] + 1);
					}
				}
				if (blnHit)
				{
					m_intSpk = 1; m_intSpkX = m_objSlots.getX(intN) - 24; m_intSpkY = m_objSlots.getY(intN) - 24;
					m_objSlots.hide(intN);
				}
			}
		}
		m_blnHit = (m_intAlive !== 0) && (m_objSlots.collideRange(SL_YOU, SL_BUL, NBUL).length > 0);
	}

	// Bul.Hits: the shots that hit target n since the last time it was asked
	function bulHits(intT_a)
	{
		var intResult = m_arrHits[intT_a];
		m_arrHits[intT_a] = 0;
		return intResult;
	}

	// Bul.Aim: the way (0-255, as bulFire's) from x, y to tx, ty
	function bulAim(intX_a, intY_a, intTX_a, intTY_a)
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

	// ====================================================================================================
	// FRAMES: sound, the walls' glow

	function tick()
	{
		m_objSound.update();
		m_intFrames++;
		glow();
	}

	// the walls' glow: three colours turned round every four frames
	function glow()
	{
		m_intGlowT++;
		if (m_intGlowT >= 4)
		{
			m_intGlowT = 0;
			m_objGrid.setImage(1, GLOWS[idiv(m_intFrames, 4) % 3]);
		}
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		bulReset();
		m_objSlots.hideRange(0, 50);
		m_objGrid.clear(0, 0);
		m_intFloor = 0; m_strBig = 'title';
		text(9, 18, '20 ROOMS. NO WAY BACK.');
		text(6, 21, 'Q A O P  MOVE (8 WAYS)');
		text(6, 22, 'SPACE    SHOOT, HOLD: SAME WAY');
		text(6, 23, 'HOLD ON  THE LASER BEAM');
		text(6, 24, 'THE WALLS ARE ELECTRIC!');
		text(10, 26, 'SPACE TO START');
		text(8, 1, 'HI ' + zeros(m_intHiscore, 6));
		text(9, 30, '(C) 2026 CYBORG UNICORN');
		m_intTitleStep = 0;
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'title';
	}

	// a parade of robots, bobbing, until Space
	function titleStep()
	{
		var intK, intY;
		tick();
		if (m_intTitleStep === 0) { m_intTitleStep = legStep(m_intFrames); }
		for (intK = 0; intK <= 4; intK++)
		{
			intY = 150;
			if (((idiv(m_intFrames, 8) + intK) % 2) !== 0) { intY = 148; }
			if (intK === 3)
			{
				spr(SL_ROB + intK, 76 + intK * 40 - 8, intY - 42, 'hulk', undefined, 4, 2);
			}
			else
			{
				spr(SL_ROB + intK, 76 + intK * 40, intY - 26, kindName(1 + intK % 4), undefined, 1 + intK % 4);
			}
			m_objSlots.animate(SL_ROB + intK, m_intTitleStep);
		}
		m_objSlots.step();
		if (fire1())
		{
			m_objSlots.hideRange(0, 50);
			sfx(0, 80, -2, 14, 20, 0);
			gameStart();
		}
	}

	// ====================================================================================================
	// A GAME: room after room, until the last life or the Mother Core

	function gameStart()
	{
		m_intScore = 0; m_intLives = 3; m_intRoom = 1; m_intSaved = 0; m_intNextLife = 20000; m_intWon = 0;
		m_intEntry = 0;
		m_strBig = '';
		m_objPad.setControls(ZONES_PLAY);
		roomStart();
	}

	function gameEnd()
	{
		var intK;
		if (m_intScore > m_intHiscore) { m_intHiscore = m_intScore; }
		bulReset();
		m_objSlots.hideRange(0, 50);
		m_objPad.setControls(ZONES_MENU);
		if (m_intWon !== 0)
		{
			// the ending
			m_objGrid.clear(0, 0);
			m_intFloor = 3; m_strBig = 'ending';
			text(6, 19, 'THE MOTHER CORE IS SCRAP.');
			text(6, 21, 'THE FACTORY GOES QUIET.');
			text(6, 23, 'HUMANS SAVED: ' + String(m_intSaved));
			text(6, 25, 'SCORE ' + zeros(m_intScore, 6));
			for (intK = 0; intK <= 5; intK++)
			{
				spr(intK, 70 + intK * 32, 190, 'human', 1, 0);
			}
			spr(SL_YOU, 60, 190, 'hero', 1, 0);
		}
		else
		{
			m_objGrid.rect(12, 14, 16, 3, G.T_HUD, 0);
			text(15, 15, 'GAME OVER');
		}
		m_intStep = 0;
		m_strState = 'over';
	}

	// GAME OVER (or the ending): 100 frames, then Space let go, then Space (the Next's WaitKey)
	function overStep()
	{
		tick();
		m_intStep++;
		if (m_intStep > 100)
		{
			if (m_intStep === 101)
			{
				if (fire1()) { m_intStep = 100; }
			}
			else if (fire1())
			{
				m_objSlots.hideRange(0, 50);
				titleStart();
			}
		}
	}

	// ====================================================================================================
	// THE HUD (the top and bottom borders)

	function hud()
	{
		m_objGrid.rect(0, 0, 40, 4, G.T_HUD, 0);
		m_objGrid.rect(0, 28, 40, 4, G.T_HUD, 0);
		text(4, 1, 'SCORE ' + zeros(m_intScore, 6));
		text(19, 1, 'HI ' + zeros(m_intHiscore, 6));
		text(29, 1, 'ROOM ' + zeros(m_intRoom, 2));
		lives1();
	}

	function lives1()
	{
		var intK;
		m_objGrid.rect(4, 2, 10, 1, G.T_HUD, 0);
		for (intK = 1; intK <= m_intLives; intK++)
		{
			if (intK <= 8) { m_objGrid.put(3 + intK, 2, G.T_LIFE, 0); }
		}
		text(19, 2, 'SAVED ' + String(m_intSaved) + ' ');
	}

	function score1(intP_a)
	{
		m_intScore += intP_a;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 20000;
			m_intLives++;
			sfx(1, 60, -1, 14, 40, 0);
			lives1();
		}
		text(10, 1, zeros(m_intScore, 6));
	}

	function bossBar()
	{
		var intW, intV;
		if (m_intBossK === 0)
		{
			m_objGrid.rect(4, 29, 32, 1, G.T_HUD, 0);
		}
		else
		{
			text(4, 29, BOSSNAMES.substr((m_intBossK - 1) * 11, 11));
			intV = idiv(m_intBossHp * 16 * 8, m_intBossMax);
			for (intW = 0; intW <= 15; intW++)
			{
				if (intV >= 8)
				{
					m_objGrid.put(18 + intW, 29, G.T_BAR + 8, 0); intV -= 8;
				}
				else
				{
					m_objGrid.put(18 + intW, 29, G.T_BAR + intV, 0); intV = 0;
				}
			}
		}
	}

	// ====================================================================================================
	// THE ROOM: cells 32 x 24 (the paper); the tile screen's are 4 right and 4 down

	function wallAt(intCX_a, intCY_a)
	{
		m_arrWall[intCY_a * 32 + intCX_a] = 1;
		m_objGrid.put(intCX_a + 4, intCY_a + 4, G.T_WALL + ((intCX_a + intCY_a) & 1), 1);
	}

	function door(intD_a, blnShut_a)
	{
		var intJ, intCX, intCY;
		for (intJ = 0; intJ <= 3; intJ++)
		{
			if (intD_a === 0) { intCX = 0; intCY = 10 + intJ; }
			else if (intD_a === 1) { intCX = 31; intCY = 10 + intJ; }
			else if (intD_a === 2) { intCX = 14 + intJ; intCY = 0; }
			else { intCX = 14 + intJ; intCY = 23; }
			if (blnShut_a)
			{
				m_arrWall[intCY * 32 + intCX] = 1;
				m_objGrid.put(intCX + 4, intCY + 4, G.T_DOOR, 0);
			}
			else
			{
				m_arrWall[intCY * 32 + intCX] = 0;
				m_objGrid.put(intCX + 4, intCY + 4, 0, 0);
			}
		}
	}

	function build()
	{
		var intCX, intCY, intJ, intD, intK, intSX, intSY;
		m_objGrid.clear(0, 0);
		for (intK = 0; intK < 768; intK++)
		{
			m_arrWall[intK] = 0;
		}
		m_intFloor = idiv(m_intRoom - 1, 5) % 4;
		hud();
		for (intCX = 0; intCX <= 31; intCX++)
		{
			wallAt(intCX, 0); wallAt(intCX, 23);
		}
		for (intCY = 1; intCY <= 22; intCY++)
		{
			wallAt(0, intCY); wallAt(31, intCY);
		}
		// the maze: posts in a 4 x 2 grid, each with a wall to the next post one way (BASIC's
		// True is -1: the right two columns of posts are one cell further left)
		m_intSeed = m_intRoom * 37 + 11;
		for (intJ = 0; intJ <= 7; intJ++)
		{
			intSX = 6 + (intJ % 4) * 6 - (((intJ % 4) > 1) ? 1 : 0);
			intSY = 8 + idiv(intJ, 4) * 8;
			intD = rndS(4);
			if ((m_intRoom % 5) === 0) { intD = 4; }			// (a boss room: posts only)
			for (intK = 0; intK <= 6; intK++)
			{
				if (intD === 0) { intCX = intSX + intK; intCY = intSY; }
				else if (intD === 1) { intCX = intSX - intK; intCY = intSY; }
				else if (intD === 2) { intCX = intSX; intCY = intSY + intK; }
				else if (intD === 3) { intCX = intSX; intCY = intSY - intK; }
				else { intCX = intSX; intCY = intSY; }
				if ((intCX > 0) && (intCX < 31) && (intCY > 0) && (intCY < 23))
				{
					// keep the doorways clear
					if (!(((intCY >= 9) && (intCY <= 14) && ((intCX < 4) || (intCX > 27))) || ((intCX >= 13) && (intCX <= 18) && ((intCY < 4) || (intCY > 19)))))
					{
						wallAt(intCX, intCY);
					}
				}
			}
		}
		// the doors: the one you came in by is shut; a boss room's are all shut
		for (intD = 0; intD <= 3; intD++)
		{
			door(intD, (intD === m_intEntry) || ((m_intRoom % 5) === 0));
		}
	}

	// a free place for something (not near you or a wall): cx1, cy1
	function freeSpot()
	{
		var intTries, blnDone = false;
		for (intTries = 1; (intTries <= 60) && !blnDone; intTries++)
		{
			m_intCX1 = 24 + rnd(208); m_intCY1 = 24 + rnd(144);
			if ((solid(m_intCX1 - 8, m_intCY1 - 8) === 0) && (solid(m_intCX1 + 8, m_intCY1 - 8) === 0) && (solid(m_intCX1 - 8, m_intCY1 + 8) === 0) && (solid(m_intCX1 + 8, m_intCY1 + 8) === 0))
			{
				if (Math.abs(m_intCX1 - m_intPX) + Math.abs(m_intCY1 - m_intPY) > 80) { blnDone = true; }
			}
		}
	}

	function spawn(intKind_a, intCount_a)
	{
		var intJ, intM, intK, blnFull = false;
		for (intJ = 1; (intJ <= intCount_a) && !blnFull; intJ++)
		{
			intM = -1;
			for (intK = 0; intK < NR; intK++)
			{
				if ((m_arrRK[intK] === 0) && (intM < 0)) { intM = intK; }
			}
			if (intM < 0)
			{
				blnFull = true;
			}
			else
			{
				freeSpot();
				m_arrRK[intM] = intKind_a; m_arrRX[intM] = m_intCX1; m_arrRY[intM] = m_intCY1; m_arrRT[intM] = rnd(60); m_arrRF[intM] = 0; m_arrRBoom[intM] = 0;
				m_arrRDX[intM] = 0; m_arrRDY[intM] = 0;
				m_arrRStep[intM] = legStep(m_arrRT[intM] + 1);
				if (intKind_a === K_GRUNT) { m_arrRHP[intM] = 1; }
				else if (intKind_a === K_SHOOT) { m_arrRHP[intM] = 2; }
				else if (intKind_a === K_SPIN) { m_arrRHP[intM] = 5; }
				else if (intKind_a === K_HULK) { m_arrRHP[intM] = 999; }
				else if (intKind_a === K_TURRET)
				{
					m_arrRHP[intM] = 6;
					// on a wall: the top or bottom, or a side
					intK = rnd(4);
					if (intK === 0) { m_arrRX[intM] = 24 + rnd(26) * 8; m_arrRY[intM] = 12; m_arrRF[intM] = 0; }
					else if (intK === 1) { m_arrRX[intM] = 24 + rnd(26) * 8; m_arrRY[intM] = 180; m_arrRF[intM] = 1; }
					else if (intK === 2) { m_arrRX[intM] = 12; m_arrRY[intM] = 28 + rnd(16) * 8; m_arrRF[intM] = 2; }
					else { m_arrRX[intM] = 244; m_arrRY[intM] = 28 + rnd(16) * 8; m_arrRF[intM] = 3; }
					// not in a doorway
					if (((m_arrRX[intM] > 100) && (m_arrRX[intM] < 156)) || ((m_arrRY[intM] > 72) && (m_arrRY[intM] < 120))) { m_arrRK[intM] = 0; }
				}
			}
		}
	}

	// a room: everything set up, then roomStep each frame until a door or the end of a life
	function roomStart()
	{
		var intK;
		bulReset();
		m_objSlots.hideRange(0, 50);
		for (intK = 0; intK < NR; intK++)
		{
			m_arrRK[intK] = 0;
		}
		m_arrROn[0] = 0; m_arrROn[1] = 0;
		// where you come in
		if (m_intEntry === 0) { m_intPX = 14; m_intPY = 96; m_intFC = 2; }
		else if (m_intEntry === 1) { m_intPX = 242; m_intPY = 96; m_intFC = 6; }
		else if (m_intEntry === 2) { m_intPX = 128; m_intPY = 14; m_intFC = 4; }
		else { m_intPX = 128; m_intPY = 178; m_intFC = 0; }
		build();
		// the robots: more, and more kinds, room by room
		m_intBossK = 0;
		if ((m_intRoom % 5) === 0)
		{
			startBoss(idiv(m_intRoom, 5));
			spawn(K_GRUNT, idiv(m_intRoom, 5) + 1);
		}
		else
		{
			spawn(K_GRUNT, 3 + idiv(m_intRoom, 2));
			spawn(K_SHOOT, 1 + idiv(m_intRoom, 3));
			if (m_intRoom >= 3) { spawn(K_SPIN, idiv(m_intRoom + 1, 4)); }
			if (m_intRoom >= 6) { spawn(K_HULK, (m_intRoom >= 12) ? 2 : 1); }
			if (m_intRoom >= 4) { spawn(K_TURRET, 1 + ((m_intRoom >= 11) ? 1 : 0) + ((m_intRoom >= 16) ? 1 : 0)); }
		}
		// the humans
		for (intK = 0; intK < NH; intK++)
		{
			m_arrHOn[intK] = 0;
			if ((intK < 2) && ((m_intRoom % 5) !== 0))
			{
				freeSpot();
				m_arrHOn[intK] = 1; m_arrHX[intK] = m_intCX1; m_arrHY[intK] = m_intCY1; m_arrHDX[intK] = 0; m_arrHDY[intK] = 0;
			}
		}
		bossBar();
		m_intAlive = 1; m_intDeadT = 0; m_intRoomT = 0; m_intCrazyOn = 0; m_intHeld = 0; m_intLock = 0; m_intBeamOn = 0;
		text(14, 30, 'ROOM ' + String(m_intRoom) + '      ');
		if ((m_intRoom % 5) === 0) { text(14, 30, 'BOSS ROOM!'); }
		sfx(1, 200, -6, 13, 20, 0);
		m_intExitD = -1;
		m_strState = 'room';
	}

	// a frame of the room (PlayRoom's loop)
	function roomStep()
	{
		m_intRoomT++;
		if (m_intAlive !== 0)
		{
			you();
			shoot();
		}
		else
		{
			m_intDeadT++;
		}
		robots();
		if (m_intBossK !== 0) { boss(); }
		rays();
		humans();
		crazy();
		bulStep();
		if ((m_intAlive !== 0) && m_blnHit) { die(); }
		sparks();
		tick();
		// out through a door?
		if (m_intAlive !== 0)
		{
			if (m_intPX < 4) { m_intExitD = 0; }
			if (m_intPX > 251) { m_intExitD = 1; }
			if (m_intPY < 4) { m_intExitD = 2; }
			if (m_intPY > 187) { m_intExitD = 3; }
		}
		if ((m_intDeadT > 100) || (m_intExitD >= 0) || (m_intWon !== 0))
		{
			roomEnd();
		}
	}

	function roomEnd()
	{
		var intK, blnLeft = false;
		beamOff();
		m_objSlots.hide(SL_CRAZY);
		if (m_intWon !== 0)
		{
			gameEnd();
		}
		else if (m_intExitD >= 0)
		{
			// a bonus for a room with no robots left
			for (intK = 0; intK < NR; intK++)
			{
				if ((m_arrRK[intK] !== 0) && (m_arrRK[intK] !== K_HULK)) { blnLeft = true; }
			}
			if ((!blnLeft) && ((m_intRoom % 5) !== 0))
			{
				text(12, 30, 'ROOM CLEAR! +' + String(m_intRoom * 100));
				score1(m_intRoom * 100);
				m_intStep = 0;
				m_strState = 'clear';
			}
			else
			{
				nextRoom();
			}
		}
		else
		{
			// lost a life: the same room again, from the same door
			m_intLives--;
			if (m_intLives < 0)
			{
				gameEnd();
			}
			else
			{
				roomStart();
			}
		}
	}

	// ROOM CLEAR shows for 50 frames (everything stops)
	function clearStep()
	{
		tick();
		m_intStep++;
		if (m_intStep >= 50) { nextRoom(); }
	}

	// you come in by the door opposite the one you left by
	function nextRoom()
	{
		m_intRoom++;
		if (m_intExitD === 0) { m_intEntry = 1; }
		else if (m_intExitD === 1) { m_intEntry = 0; }
		else if (m_intExitD === 2) { m_intEntry = 3; }
		else { m_intEntry = 2; }
		roomStart();
	}

	// ====================================================================================================
	// YOU

	// facing d (0 up, then clockwise in 8): xy 0 the x step, 1 the y step
	function way(intD_a, intXY_a)
	{
		var intResult = 0;
		if (intXY_a === 0)
		{
			if (intD_a >= 5) { intResult = -1; }
			if ((intD_a >= 1) && (intD_a <= 3)) { intResult = 1; }
		}
		else
		{
			if ((intD_a === 7) || (intD_a === 0) || (intD_a === 1)) { intResult = -1; }
			if ((intD_a >= 3) && (intD_a <= 5)) { intResult = 1; }
		}
		return intResult;
	}

	function you()
	{
		var intDX = 0, intDY = 0, intSp, intND = 0, intFl = 0, intFrame, intLoop;
		if (down(K_Q)) { intDY = -1; }
		if (down(K_A)) { intDY = 1; }
		if (down(K_O)) { intDX = -1; }
		if (down(K_P)) { intDX = 1; }
		intSp = (m_intBeamOn !== 0) ? 1 : 2;
		if ((intDX !== 0) || (intDY !== 0))
		{
			// which way that is
			if ((intDX === 0) && (intDY === -1)) { intND = 0; }
			if ((intDX === 1) && (intDY === -1)) { intND = 1; }
			if ((intDX === 1) && (intDY === 0)) { intND = 2; }
			if ((intDX === 1) && (intDY === 1)) { intND = 3; }
			if ((intDX === 0) && (intDY === 1)) { intND = 4; }
			if ((intDX === -1) && (intDY === 1)) { intND = 5; }
			if ((intDX === -1) && (intDY === 0)) { intND = 6; }
			if ((intDX === -1) && (intDY === -1)) { intND = 7; }
			if (m_intLock === 0) { m_intFC = intND; }
			m_intPX += intDX * intSp; m_intPY += intDY * intSp;
		}
		// the walls are electric (only the walls: past the room's edge, in a doorway, isn't one -
		// the Next's fix, see the top)
		if ((wallIn(m_intPX - 4, m_intPY - 6) !== 0) || (wallIn(m_intPX + 4, m_intPY - 6) !== 0) || (wallIn(m_intPX - 4, m_intPY + 7) !== 0) || (wallIn(m_intPX + 4, m_intPY + 7) !== 0))
		{
			if ((m_intPX > 3) && (m_intPX < 252) && (m_intPY > 3) && (m_intPY < 188))
			{
				die();
			}
		}
		if (m_intAlive !== 0)
		{
			// the picture: side on (left / right), front, back; walking: its loop (side 1, front 4,
			// back 7); standing: the loop's first frame
			if ((m_intFC >= 1) && (m_intFC <= 3))
			{
				intFrame = 1; intLoop = 1;
			}
			else if (m_intFC >= 5)
			{
				intFrame = 1; intLoop = 1; intFl = SPRITE_MIRRORX;
			}
			else if (m_intFC === 4)
			{
				intFrame = 3; intLoop = 4;
			}
			else
			{
				intFrame = 5; intLoop = 7;
			}
			if ((intDX !== 0) || (intDY !== 0))
			{
				spr(SL_YOU, m_intPX + 24, m_intPY + 24, 'hero', undefined, 0, 1, intFl);
				m_objSlots.animate(SL_YOU, intLoop);
			}
			else
			{
				spr(SL_YOU, m_intPX + 24, m_intPY + 24, 'hero', intFrame, 0, 1, intFl);
			}
		}
	}

	function die()
	{
		if (m_intAlive !== 0)
		{
			m_intAlive = 0; m_intDeadT = 0;
			beamOff();
			m_objSlots.hide(SL_YOU);
			boom(m_intPX, m_intPY);
			sfx(0, 40, 12, 15, 50, 1);
			sfx(1, 300, 20, 15, 50, 0);
		}
	}

	// an explosion in the spark slot, at cx1, cy1
	function boom(intX_a, intY_a)
	{
		m_intSpkT = 16;
		m_intCX1 = intX_a; m_intCY1 = intY_a;
		sfx(2, 20, 4, 14, 20, 1);
	}

	// the spark slot: an explosion going (four pictures, from spkT), or where a shot hit
	function sparks()
	{
		if (m_intSpkT > 0)
		{
			m_intSpkT--;
			spr(SL_SPARK, m_intCX1 + 24, m_intCY1 + 24, 'boom', 4 - idiv(m_intSpkT, 4), 0);
			if (m_intSpkT === 0) { m_objSlots.hide(SL_SPARK); }
		}
		else if (m_intSpk !== 0)
		{
			spr(SL_SPARK, m_intSpkX + 24, m_intSpkY + 24, 'spark', 1, 0);
		}
		else
		{
			m_objSlots.hide(SL_SPARK);
		}
	}

	// ====================================================================================================
	// SHOOTING

	function shoot()
	{
		var intSX, intSY, intFrame, intFl, blnDone = false;
		if (fire1())
		{
			m_intHeld++;
			m_intLock = 1;
			if (m_intHeld >= 18)
			{
				m_intBeamOn = 1;
				beam();
				blnDone = true;
			}
			else if (m_intHeld === 1)
			{
				m_intShotT = 0;
			}
		}
		else
		{
			m_intHeld = 0; m_intLock = 0;
			if (m_intBeamOn !== 0) { beamOff(); }
		}
		if ((!blnDone) && (m_intHeld !== 0))
		{
			m_intShotT--;
			if (m_intShotT <= 0)
			{
				m_intShotT = 6;
				intSX = way(m_intFC, 0) * 7; intSY = way(m_intFC, 1) * 7;
				// the picture: across, up / down (turned), slanting (mirrored as needed)
				if ((intSX !== 0) && (intSY !== 0))
				{
					intFrame = 2; intFl = 0;
					if (intSX < 0) { intFl += SPRITE_MIRRORX; }
					if (intSY < 0) { intFl += SPRITE_MIRRORY; }
				}
				else if (intSY !== 0)
				{
					intFrame = 1; intFl = SPRITE_ROTATE;
				}
				else
				{
					intFrame = 1; intFl = (intSX < 0) ? SPRITE_MIRRORX : 0;
				}
				bulShot(m_intPX + intSX, m_intPY + intSY, intSX, intSY, intFrame, intFl);
				sfx(0, 60, 3, 11, 4, 0);
			}
		}
	}

	// the laser beam: straight the way you face (a slant counts as across), to the first wall or
	// robot; it does a hit every other frame
	function beam()
	{
		var intDX = way(m_intFC, 0), intDY = way(m_intFC, 1);
		var intX, intY, intD, intBest, intBD, intJ, intSegs;
		if (intDX !== 0) { intDY = 0; }
		// to the wall
		intX = m_intPX; intY = m_intPY; intD = 0;
		do
		{
			intX += intDX * 4; intY += intDY * 4; intD += 4;
		}
		while ((solid(intX, intY) === 0) && (intD <= 260));
		// the nearest robot in the way
		intBest = -1; intBD = intD;
		for (intJ = 0; intJ < NR; intJ++)
		{
			if ((m_arrRK[intJ] > 0) && (m_arrRBoom[intJ] === 0))
			{
				if (intDX !== 0)
				{
					if ((Math.abs(m_arrRY[intJ] - m_intPY) < 10) && ((m_arrRX[intJ] - m_intPX) * intDX > 0) && (Math.abs(m_arrRX[intJ] - m_intPX) < intBD)) { intBest = intJ; intBD = Math.abs(m_arrRX[intJ] - m_intPX); }
				}
				else
				{
					if ((Math.abs(m_arrRX[intJ] - m_intPX) < 10) && ((m_arrRY[intJ] - m_intPY) * intDY > 0) && (Math.abs(m_arrRY[intJ] - m_intPY) < intBD)) { intBest = intJ; intBD = Math.abs(m_arrRY[intJ] - m_intPY); }
				}
			}
		}
		if ((m_intBossK !== 0) && (m_intBossHp > 0))
		{
			if (intDX !== 0)
			{
				if ((Math.abs(m_intBossY - m_intPY) < 28) && ((m_intBossX - m_intPX) * intDX > 0) && (Math.abs(m_intBossX - m_intPX) - 24 < intBD)) { intBest = 99; intBD = Math.abs(m_intBossX - m_intPX) - 24; }
			}
			else
			{
				if ((Math.abs(m_intBossX - m_intPX) < 28) && ((m_intBossY - m_intPY) * intDY > 0) && (Math.abs(m_intBossY - m_intPY) - 24 < intBD)) { intBest = 99; intBD = Math.abs(m_intBossY - m_intPY) - 24; }
			}
		}
		if (((m_intFrames % 2) === 0) && (intBest >= 0))
		{
			if (intBest === 99) { hurtBoss(1); } else { hurtRobot(intBest, 1); }
			m_intCX1 = m_intPX + intDX * intBD; m_intCY1 = m_intPY + intDY * intBD;
			spr(SL_SPARK, m_intCX1 + 24, m_intCY1 + 24, 'spark', 1, 0);
		}
		// the sprites: 32 pixel pieces
		intSegs = idiv(intBD + 31, 32);
		if (intSegs > BEAMN) { intSegs = BEAMN; }
		for (intJ = 0; intJ < BEAMN; intJ++)
		{
			if (intJ < intSegs)
			{
				if (intDX !== 0)
				{
					intX = m_intPX + intDX * (intJ * 32 + 16); intY = m_intPY;
					sprLong(SL_BEAM + intJ, intX + 24 - 8, intY + 24, 'beam', 1 + (m_intFrames & 1), false);
				}
				else
				{
					intX = m_intPX; intY = m_intPY + intDY * (intJ * 32 + 16);
					sprLong(SL_BEAM + intJ, intX + 24, intY + 24 - 8, 'beam', 1 + (m_intFrames & 1), true);
				}
			}
			else
			{
				m_objSlots.hide(SL_BEAM + intJ);
			}
		}
		if ((m_intFrames % 8) === 0) { sfx(0, 30 + (m_intFrames % 16), 0, 10, 8, 0); }
	}

	function beamOff()
	{
		m_intBeamOn = 0;
		m_objSlots.hideRange(SL_BEAM, BEAMN);
	}

	// ====================================================================================================
	// THE ROBOTS

	function hurtRobot(intM_a, intD_a)
	{
		if (m_arrRK[intM_a] === K_HULK)
		{
			// shots push a hulk back
			m_arrRX[intM_a] += way(m_intFC, 0) * 2; m_arrRY[intM_a] += way(m_intFC, 1) * 2;
		}
		else
		{
			m_arrRHP[intM_a] -= intD_a;
			if (m_arrRHP[intM_a] <= 0)
			{
				m_arrRBoom[intM_a] = 16;
				m_arrBoxOn[intM_a] = false;
				if (m_arrRK[intM_a] === K_GRUNT) { score1(50); }
				else if (m_arrRK[intM_a] === K_SHOOT) { score1(100); }
				else if (m_arrRK[intM_a] === K_SPIN) { score1(200); }
				else { score1(300); }
				sfx(2, 20, 4, 14, 20, 1);
			}
		}
	}

	function robots()
	{
		var intM, intH;
		for (intM = 0; intM < NR; intM++)
		{
			if (m_arrRK[intM] !== 0)
			{
				if (m_arrRBoom[intM] > 0)
				{
					// going up in smoke (its sprite plays the explosion through)
					m_arrRBoom[intM]--;
					if (m_arrRBoom[intM] === 15)
					{
						spr(SL_ROB + intM, m_arrRX[intM] + 24, m_arrRY[intM] + 24, 'boom', undefined, 0);
						m_objSlots.animate(SL_ROB + intM, 1, true);
					}
					if (m_arrRBoom[intM] === 0)
					{
						m_arrRK[intM] = 0;
						m_objSlots.hide(SL_ROB + intM);
					}
				}
				else
				{
					intH = bulHits(intM);
					if (intH !== 0) { hurtRobot(intM, intH); }
					if (m_arrRBoom[intM] === 0) { robotMove(intM); }
				}
			}
		}
	}

	function robotMove(intM_a)
	{
		var intX, intY, intA, intRow = 1, intFl = 0, intDX, intDY, intJ, intT, blnFried = false;
		m_arrRT[intM_a]++;
		intT = m_arrRT[intM_a];
		intX = m_arrRX[intM_a]; intY = m_arrRY[intM_a];
		switch (m_arrRK[intM_a])
		{
			case K_GRUNT:
				// straight at you, walls or no walls (and they fry on them)
				if ((intT % ((m_intRoom > 10) ? 4 : 3)) === 0)
				{
					if (m_intPX > intX + 1) { intX++; }
					if (m_intPX < intX - 1) { intX--; }
					if (m_intPY > intY + 1) { intY++; }
					if (m_intPY < intY - 1) { intY--; }
				}
				if (solid(intX, intY) !== 0)
				{
					m_arrRX[intM_a] = intX; m_arrRY[intM_a] = intY;
					m_arrRHP[intM_a] = 0; m_arrRBoom[intM_a] = 16; m_arrBoxOn[intM_a] = false; score1(50);
					sfx(2, 20, 4, 13, 16, 1);
					blnFried = true;
				}
				intRow = 1;
				break;
			case K_SHOOT:
				// walk a bit, stop, shoot at you
				if ((intT % 90) < 50)
				{
					if ((intT % 90) === 0)
					{
						m_arrRDX[intM_a] = 0; m_arrRDY[intM_a] = 0;
						if (Math.abs(m_intPX - intX) > Math.abs(m_intPY - intY)) { m_arrRDX[intM_a] = sgn(m_intPX - intX); } else { m_arrRDY[intM_a] = sgn(m_intPY - intY); }
					}
					if ((intT % 2) !== 0)
					{
						if (solid(intX + m_arrRDX[intM_a] * 10, intY + m_arrRDY[intM_a] * 10) === 0) { intX += m_arrRDX[intM_a]; intY += m_arrRDY[intM_a]; }
					}
				}
				else if (((intT % 90) === 60) || ((m_intRoom > 8) && ((intT % 90) === 75)))
				{
					intA = bulAim(intX, intY, m_intPX, m_intPY);
					bulFire(intX, intY, intA, 20 + m_intRoom, 1);
					if (m_intRoom > 6)
					{
						bulFire(intX, intY, (intA + 12) & 255, 20 + m_intRoom, 1);
						bulFire(intX, intY, (intA - 12) & 255, 20 + m_intRoom, 1);
					}
				}
				intRow = 2;
				break;
			case K_SPIN:
				// turns round, spraying
				if (((intT % 6) === 0) && ((intT % 120) < 80))
				{
					intA = (intT * 5) & 255;
					bulFire(intX, intY, intA, 14 + idiv(m_intRoom, 2), 2);
					bulFire(intX, intY, (intA + 128) & 255, 14 + idiv(m_intRoom, 2), 2);
					if (m_intRoom > 12)
					{
						bulFire(intX, intY, (intA + 64) & 255, 14 + idiv(m_intRoom, 2), 2);
						bulFire(intX, intY, (intA + 192) & 255, 14 + idiv(m_intRoom, 2), 2);
					}
				}
				// drifts slowly
				if ((intT % 4) === 0)
				{
					intDX = sgn(m_intPX - intX); intDY = sgn(m_intPY - intY);
					if (solid(intX + intDX * 10, intY + intDY * 10) === 0) { intX += intDX; intY += intDY; }
				}
				intRow = 3;
				break;
			case K_HULK:
				if ((intT % 3) === 0)
				{
					intDX = sgn(m_intPX - intX); intDY = sgn(m_intPY - intY);
					if (solid(intX + intDX * 14, intY) === 0) { intX += intDX; }
					if (solid(intX, intY + intDY * 14) === 0) { intY += intDY; }
				}
				intRow = 4;
				break;
			default:
				// a turret: a warning, then the laser across the room
				if ((intT % (200 - m_intRoom * 4)) === 0) { startRay(intM_a); }
				intRow = 5;
				break;
		}
		if (!blnFried)
		{
			m_arrRX[intM_a] = intX; m_arrRY[intM_a] = intY;
			// you touched it?
			if (m_intAlive !== 0)
			{
				intJ = (m_arrRK[intM_a] === K_HULK) ? 13 : 7;
				if ((Math.abs(m_intPX - intX) < intJ) && (Math.abs(m_intPY - intY) < intJ + 2)) { die(); }
			}
			// the picture (its legs: its own loop) and the target box (its sprite's hit box)
			if (m_arrRK[intM_a] === K_HULK)
			{
				spr(SL_ROB + intM_a, intX + 24 - 8, intY + 24 - 8, 'hulk', undefined, intRow, 2);
				m_objSlots.animate(SL_ROB + intM_a, m_arrRStep[intM_a]);
			}
			else if (m_arrRK[intM_a] === K_TURRET)
			{
				if (m_arrRF[intM_a] === 1) { intFl = SPRITE_MIRRORY; }
				else if (m_arrRF[intM_a] === 2) { intFl = SPRITE_ROTATE + SPRITE_MIRRORY; }
				else if (m_arrRF[intM_a] === 3) { intFl = SPRITE_ROTATE; }
				spr(SL_ROB + intM_a, intX + 24, intY + 24, 'turret', 1, intRow, 1, intFl);
			}
			else
			{
				spr(SL_ROB + intM_a, intX + 24, intY + 24, kindName(m_arrRK[intM_a]), undefined, intRow);
				m_objSlots.animate(SL_ROB + intM_a, m_arrRStep[intM_a]);
			}
			m_arrBoxOn[intM_a] = true;
		}
	}

	// ====================================================================================================
	// THE LASERS (turrets, bosses)

	// a turret's laser: across the room from its wall (down from the top, up from the bottom, across
	// from the sides)
	function startRay(intM_a)
	{
		var intJ, intS = -1, intX, intY;
		for (intJ = 0; intJ <= 1; intJ++)
		{
			if ((m_arrROn[intJ] === 0) && (intS < 0)) { intS = intJ; }
		}
		if (intS >= 0)
		{
			m_arrROn[intS] = 1; m_arrRTm[intS] = 40; m_arrROwn[intS] = intM_a;
			if (m_arrRF[intM_a] <= 1)
			{
				m_arrRDir[intS] = 1; m_arrRPos[intS] = m_arrRX[intM_a];
				intY = m_arrRY[intM_a];
				if (m_arrRF[intM_a] === 0)
				{
					m_arrRA[intS] = intY + 8; intY += 8;
					do
					{
						intY += 4;
					}
					while ((solid(m_arrRX[intM_a], intY) === 0) && (intY <= 190));
					m_arrRB[intS] = intY;
				}
				else
				{
					m_arrRB[intS] = intY - 8; intY -= 8;
					do
					{
						intY -= 4;
					}
					while ((solid(m_arrRX[intM_a], intY) === 0) && (intY >= 2));
					m_arrRA[intS] = intY;
				}
			}
			else
			{
				m_arrRDir[intS] = 0; m_arrRPos[intS] = m_arrRY[intM_a];
				intX = m_arrRX[intM_a];
				if (m_arrRF[intM_a] === 2)
				{
					m_arrRA[intS] = intX + 8; intX += 8;
					do
					{
						intX += 4;
					}
					while ((solid(intX, m_arrRY[intM_a]) === 0) && (intX <= 252));
					m_arrRB[intS] = intX;
				}
				else
				{
					m_arrRB[intS] = intX - 8; intX -= 8;
					do
					{
						intX -= 4;
					}
					while ((solid(intX, m_arrRY[intM_a]) === 0) && (intX >= 2));
					m_arrRA[intS] = intX;
				}
			}
			sfx(1, 500, -20, 10, 30, 0);
		}
	}

	// a boss's laser: a whole row or column through the room
	function bossRay(intDir_a, intPos_a)
	{
		var intJ, intS = -1;
		for (intJ = 0; intJ <= 1; intJ++)
		{
			if ((m_arrROn[intJ] === 0) && (intS < 0)) { intS = intJ; }
		}
		if (intS >= 0)
		{
			m_arrROn[intS] = 1; m_arrRTm[intS] = 45; m_arrROwn[intS] = -1; m_arrRDir[intS] = intDir_a; m_arrRPos[intS] = intPos_a;
			m_arrRA[intS] = 8;
			m_arrRB[intS] = (intDir_a === 0) ? 248 : 184;
			sfx(1, 500, -20, 10, 30, 0);
		}
	}

	function rays()
	{
		var intS, intJ, intN, intX, intY, strName, intFrame;
		for (intS = 0; intS <= 1; intS++)
		{
			if (m_arrROn[intS] !== 0)
			{
				m_arrRTm[intS]--;
				if (m_arrROwn[intS] >= 0)
				{
					if ((m_arrRK[m_arrROwn[intS]] !== K_TURRET) || (m_arrRBoom[m_arrROwn[intS]] > 0)) { m_arrROn[intS] = 0; m_arrRTm[intS] = 0; }
				}
				if (m_arrRTm[intS] <= 0)
				{
					if (m_arrROn[intS] === 1)
					{
						m_arrROn[intS] = 2; m_arrRTm[intS] = 30;
						sfx(1, 40, 0, 14, 30, 1);
					}
					else
					{
						m_arrROn[intS] = 0;
					}
				}
				// on you?
				if ((m_arrROn[intS] === 2) && (m_intAlive !== 0))
				{
					if (m_arrRDir[intS] === 0)
					{
						if ((Math.abs(m_intPY - m_arrRPos[intS]) < 7) && (m_intPX >= m_arrRA[intS]) && (m_intPX <= m_arrRB[intS])) { die(); }
					}
					else
					{
						if ((Math.abs(m_intPX - m_arrRPos[intS]) < 6) && (m_intPY >= m_arrRA[intS]) && (m_intPY <= m_arrRB[intS])) { die(); }
					}
				}
			}
			// the sprites: up to 8 pieces of 32 (the warning blinks)
			intN = 0;
			if (m_arrROn[intS] !== 0) { intN = idiv(m_arrRB[intS] - m_arrRA[intS] + 31, 32); }
			if (intN > RAYN) { intN = RAYN; }
			if (m_arrROn[intS] === 1)
			{
				strName = 'warn'; intFrame = 1;
			}
			else
			{
				strName = 'ray'; intFrame = 1 + (m_intFrames & 1);
			}
			for (intJ = 0; intJ < RAYN; intJ++)
			{
				if ((intJ < intN) && ((m_arrROn[intS] === 2) || ((idiv(m_intFrames, 4) % 2) === 0)))
				{
					if (m_arrRDir[intS] === 0)
					{
						intX = m_arrRA[intS] + intJ * 32;
						if (intX > m_arrRB[intS] - 32) { intX = m_arrRB[intS] - 32; }
						sprLong(SL_RAY + intS * RAYN + intJ, intX + 32, m_arrRPos[intS] + 24, strName, intFrame, false);
					}
					else
					{
						intY = m_arrRA[intS] + intJ * 32;
						if (intY > m_arrRB[intS] - 32) { intY = m_arrRB[intS] - 32; }
						sprLong(SL_RAY + intS * RAYN + intJ, m_arrRPos[intS] + 24, intY + 32, strName, intFrame, true);
					}
				}
				else
				{
					m_objSlots.hide(SL_RAY + intS * RAYN + intJ);
				}
			}
		}
	}

	// ====================================================================================================
	// THE HUMANS

	function humans()
	{
		var intJ, intM, intX, intY;
		for (intJ = 0; intJ < NH; intJ++)
		{
			if (m_arrHOn[intJ] > 0)
			{
				if ((m_intFrames % 40) === intJ * 13) { m_arrHDX[intJ] = rnd(3) - 1; m_arrHDY[intJ] = rnd(3) - 1; }
				if ((m_intFrames % 3) === 0)
				{
					intX = m_arrHX[intJ] + m_arrHDX[intJ]; intY = m_arrHY[intJ] + m_arrHDY[intJ];
					if ((solid(intX - 8, intY - 8) === 0) && (solid(intX + 8, intY - 8) === 0) && (solid(intX - 8, intY + 8) === 0) && (solid(intX + 8, intY + 8) === 0)) { m_arrHX[intJ] = intX; m_arrHY[intJ] = intY; }
				}
				// saved?
				if ((m_intAlive !== 0) && (Math.abs(m_intPX - m_arrHX[intJ]) < 10) && (Math.abs(m_intPY - m_arrHY[intJ]) < 12))
				{
					m_intSaved++;
					score1(1000);
					spr(SL_HUM + intJ, m_arrHX[intJ] + 24, m_arrHY[intJ] + 24, 'heart', 1, 0);
					sfx(1, 80, -3, 14, 25, 0);
					if ((m_intSaved % 5) === 0) { m_intLives++; }
					lives1();
					m_arrHOn[intJ] = -30;
				}
				else
				{
					// a grunt got them?
					for (intM = 0; intM < NR; intM++)
					{
						if ((m_arrRK[intM] === K_GRUNT) && (m_arrRBoom[intM] === 0))
						{
							if ((Math.abs(m_arrRX[intM] - m_arrHX[intJ]) < 8) && (Math.abs(m_arrRY[intM] - m_arrHY[intJ]) < 8))
							{
								m_arrHOn[intJ] = 0; m_objSlots.hide(SL_HUM + intJ);
								sfx(2, 400, 30, 12, 20, 0);
							}
						}
					}
					if (m_arrHOn[intJ] > 0)
					{
						spr(SL_HUM + intJ, m_arrHX[intJ] + 24, m_arrHY[intJ] + 24, 'human', undefined, 0);
						m_objSlots.animate(SL_HUM + intJ, 1);
					}
				}
			}
			else if (m_arrHOn[intJ] < 0)
			{
				// the heart floats up
				m_arrHOn[intJ]++;
				m_arrHY[intJ]--;
				spr(SL_HUM + intJ, m_arrHX[intJ] + 24, m_arrHY[intJ] + 24, 'heart', 1, 0);
				if (m_arrHOn[intJ] === 0) { m_objSlots.hide(SL_HUM + intJ); }
			}
		}
	}

	// ====================================================================================================
	// THE CRAZY FACE: in too long

	function crazy()
	{
		if (m_intBossK === 0)
		{
			if (m_intCrazyOn === 0)
			{
				if (m_intRoomT === 900 - m_intRoom * 15)
				{
					m_intCrazyOn = 1;
					if (m_intEntry === 0) { m_intCX1 = 8; m_intCY1 = 96; }
					else if (m_intEntry === 1) { m_intCX1 = 248; m_intCY1 = 96; }
					else if (m_intEntry === 2) { m_intCX1 = 128; m_intCY1 = 8; }
					else { m_intCX1 = 128; m_intCY1 = 184; }
					m_intBossX = 0;
					m_intCDX = m_intCX1; m_intCDY = m_intCY1;
					text(12, 30, 'THE CRAZY FACE!   ');
					sfx(1, 120, 30, 15, 40, 0);
				}
			}
			else
			{
				// it bounces towards you, through the walls
				if ((m_intFrames % 2) === 0)
				{
					m_intCDX += sgn(m_intPX - m_intCDX) * (1 + idiv(m_intRoom, 10));
					m_intCDY += sgn(m_intPY - m_intCDY);
				}
				spr(SL_CRAZY, m_intCDX + 24, m_intCDY + 24 - Math.abs((idiv(m_intFrames, 2) % 16) - 8), 'crazy', undefined, 0);
				m_objSlots.animate(SL_CRAZY, 1);
				if ((m_intAlive !== 0) && (Math.abs(m_intPX - m_intCDX) < 9) && (Math.abs(m_intPY - m_intCDY) < 9)) { die(); }
			}
		}
	}

	// ====================================================================================================
	// THE BOSSES

	function startBoss(intB_a)
	{
		m_intBossK = intB_a;
		m_intBossMax = 100 + intB_a * 100;
		m_intBossHp = m_intBossMax;
		m_intBossX = 128; m_intBossY = 60; m_intBossT = 0; m_intBossDX = 1;
	}

	function hurtBoss(intD_a)
	{
		if (m_intBossHp > 0)
		{
			m_intBossHp -= intD_a;
			if (m_intBossHp <= 0)
			{
				m_intBossHp = 0; m_intBossT = 0;
				score1(5000 * m_intBossK);
				bulClear();
			}
			if (((m_intFrames % 4) === 0) || (m_intBossHp === 0)) { bossBar(); }
		}
	}

	function boss()
	{
		var intA, intRow = 5, intJ, intH = 0, intSp;
		if (m_intBossHp <= 0)
		{
			// it blows up, then the doors open
			m_intBossT++;
			if ((m_intBossT % 6) === 0)
			{
				m_intCX1 = m_intBossX - 24 + rnd(48); m_intCY1 = m_intBossY - 24 + rnd(48); m_intSpkT = 16;
				sfx(2, 20 + rnd(20), 4, 15, 20, 1);
			}
			if (m_intBossT === 120)
			{
				m_objSlots.hide(SL_BOSS);
				m_arrBoxOn[BOX_BOSS] = false;
				if (m_intBossK === 4)
				{
					m_intWon = 1;
				}
				else
				{
					for (intJ = 0; intJ <= 3; intJ++)
					{
						if (intJ !== m_intEntry) { door(intJ, false); }
					}
					text(12, 30, 'THE DOORS ARE OPEN');
					sfx(1, 100, -3, 14, 40, 0);
				}
				m_intBossK = 0;
				bossBar();
			}
		}
		else
		{
			m_intBossT++;
			intH = bulHits(BOX_BOSS);
			if (intH !== 0) { hurtBoss(intH); }
			// (BASIC's True is -1: below half its strength this is 0, not 2)
			intSp = 1 + ((m_intBossHp < idiv(m_intBossMax, 2)) ? -1 : 0);
			if (m_intBossK === 1)
			{
				// TANK-O: along the top, fans of bullets at you, rings, its cannon's laser down
				m_intBossX += m_intBossDX * intSp;
				if ((m_intBossX > 200) || (m_intBossX < 56)) { m_intBossDX = -m_intBossDX; }
				if ((m_intBossT % 50) === 0)
				{
					intA = bulAim(m_intBossX, m_intBossY + 20, m_intPX, m_intPY);
					for (intJ = -2; intJ <= 2; intJ++)
					{
						bulFire(m_intBossX, m_intBossY + 20, (intA + intJ * 10) & 255, 22, 1);
					}
				}
				if ((m_intBossT % 120) === 60)
				{
					for (intJ = 0; intJ <= 15; intJ++)
					{
						bulFire(m_intBossX, m_intBossY, intJ * 16, 14, 3);
					}
				}
				if ((m_intBossT % 160) === 100) { bossRay(1, m_intBossX); }
				intRow = 5;
			}
			else if (m_intBossK === 2)
			{
				// SPIDERBOT: scuttles about, a spiral, lays grunts
				m_intBossX += m_intBossDX * intSp;
				if ((m_intBossX > 200) || (m_intBossX < 56)) { m_intBossDX = -m_intBossDX; }
				m_intBossY = 70 + (idiv(m_intBossT, 3) % 60) - 30;
				if ((m_intBossT % 4) === 0)
				{
					intA = (m_intBossT * 7) & 255;
					bulFire(m_intBossX, m_intBossY, intA, 16, 2);
					bulFire(m_intBossX, m_intBossY, (intA + 85) & 255, 16, 2);
					bulFire(m_intBossX, m_intBossY, (intA + 170) & 255, 16, 2);
				}
				if ((m_intBossT % 240) === 0) { spawn(K_GRUNT, 2); }
				intRow = 7;
			}
			else if (m_intBossK === 3)
			{
				// BRAIN TANK: jumps about, rings, crossed lasers through where you stand
				if ((m_intBossT % 150) === 0) { m_intBossX = 64 + rnd(128); m_intBossY = 50 + rnd(90); }
				if ((m_intBossT % 40) === 20)
				{
					for (intJ = 0; intJ <= 19; intJ++)
					{
						bulFire(m_intBossX, m_intBossY, (intJ * 13 + m_intBossT) & 255, 15, 3);
					}
				}
				if ((m_intBossT % 130) === 70) { bossRay(0, m_intPY); bossRay(1, m_intPX); }
				intRow = 8;
			}
			else
			{
				// MOTHER CORE: in the middle; spirals, aimed fans, lasers across the room, spinners
				m_intBossX = 128; m_intBossY = 80;
				if (((m_intBossT % 3) === 0) && ((m_intBossT % 300) < 180))
				{
					intA = (m_intBossT * 3) & 255;
					bulFire(m_intBossX, m_intBossY, intA, 15, 2);
					bulFire(m_intBossX, m_intBossY, (255 - intA) & 255, 15, 1);
				}
				if (((m_intBossT % 300) >= 180) && ((m_intBossT % 20) === 0))
				{
					intA = bulAim(m_intBossX, m_intBossY, m_intPX, m_intPY);
					for (intJ = -3; intJ <= 3; intJ++)
					{
						bulFire(m_intBossX, m_intBossY, (intA + intJ * 8) & 255, 24, 3);
					}
				}
				if ((m_intBossT % 110) === 50)
				{
					if (rnd(2) !== 0) { bossRay(0, 24 + rnd(144)); } else { bossRay(1, 24 + rnd(208)); }
				}
				if ((m_intBossT % 400) === 0) { spawn(K_SPIN, 1); }
				intRow = 9;
			}
			// the boss: 32 x 32 drawn twice the size (the Next's four sprites); a flash when hit
			if (intH !== 0) { intRow = 6; }
			spr(SL_BOSS, m_intBossX, m_intBossY, 'boss', m_intBossK, intRow, 2);
			m_arrBoxOn[BOX_BOSS] = true;
			if ((m_intAlive !== 0) && (Math.abs(m_intPX - m_intBossX) < 30) && (Math.abs(m_intPY - m_intBossY) < 30)) { die(); }
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
				case 'room': roomStep(); break;
				case 'clear': clearStep(); break;
				case 'over': overStep(); break;
				default: break;
			}
		}
		else
		{
			m_objSound.update();
		}
	};

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
		if (m_blnLoaded)
		{
			// the floor (Layer 2, with the title's or the ending's big letters), under the tiles,
			// under the sprites
			objContext_a.drawImage(m_arrFloors[m_intFloor], 32, 32);
			if (m_strBig === 'title')
			{
				m_objSprites.paintBigText(objContext_a, 'crazybot_ink', 'CRAZY', 32 + 24, 32 + 20, 4, rgb332ToCSS(0xFC), rgb332ToCSS(0xEC), rgb332ToCSS(0), 2);
				m_objSprites.paintBigText(objContext_a, 'crazybot_ink', 'ROBOT', 32 + 24, 32 + 56, 4, rgb332ToCSS(0xFC), rgb332ToCSS(0xEC), rgb332ToCSS(0), 2);
			}
			else if (m_strBig === 'ending')
			{
				m_objSprites.paintBigText(objContext_a, 'crazybot_ink', 'FREE!', 32 + 16, 32 + 30, 6, rgb332ToCSS(0xFF), rgb332ToCSS(0xFC), rgb332ToCSS(0), 2);
			}
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are (frame n is n - 1 cells right), how big it's drawn,
	// what it does on its own (sequence, delay) and the part of it that counts in a collision
	// (hbw x hbh about its middle)
	function sprite(strName_a, objCell_a, intW_a, intH_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a)
	{
		var intCW = objCell_a.w * 16, intCH = objCell_a.h * 16;
		return { name:strName_a, classes:'crazybot', imagename:'crazybot_s0', x:0, y:0, w:intW_a, h:intH_a, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intCW, imageh:intCH,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	this.run = function()
	{
		setup();
		buildFloors();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			// you: walking side on (step 1), towards you (4), away (7); a bullet gets you within
			// 3 pixels of your middle
			sprite('hero', G.S_HERO, 16, 16, [1, 2, -1, 3, 4, -4, 5, 6, -7], 6, 7, 7),
			// the robots: the shots' targets (their boxes: 9 each way; the hulk, drawn twice the
			// size, 14)
			sprite('grunt', G.S_GRUNT, 16, 16, ROBSEQ, 1, 18, 18),
			sprite('shooter', G.S_SHOOTER, 16, 16, ROBSEQ, 1, 18, 18),
			sprite('spinner', G.S_SPINNER, 16, 16, ROBSEQ, 1, 18, 18),
			sprite('hulk', G.S_HULK, 16, 16, ROBSEQ, 1, 14, 14),
			sprite('turret', G.S_TURRET, 16, 16, [1, 0], 1, 18, 18),
			sprite('boss', G.S_BOSS, 32, 32, [1, 0], 1, 28, 28),				// TANK-O, SPIDERBOT, BRAIN TANK, MOTHER CORE (drawn twice the size)
			sprite('human', G.S_HUMAN, 16, 16, [1, 2, -1], 8, 0, 0),
			sprite('crazy', G.S_CRAZY, 16, 16, [1, 2, -1], 10, 0, 0),
			sprite('heart', G.S_HEART, 16, 16, [1, 0], 1, 0, 0),
			// the bullets and your shots: a point
			sprite('bullet', G.S_BULLET, 16, 16, [1, 0], 1, 0, 0),				// red, pink, small cyan
			sprite('shot', G.S_SHOT, 16, 16, [1, 0], 1, 0, 0),				// across, slanting
			// the lasers: 32 x 16 pieces (the Next stretches them twice as long)
			sprite('beam', G.S_BEAM, 32, 16, [1, 0], 1, 0, 0),
			sprite('ray', G.S_RAY, 32, 16, [1, 0], 1, 0, 0),
			sprite('warn', G.S_WARN, 32, 16, [1, 0], 1, 0, 0),
			sprite('boom', G.S_BOOM, 16, 16, BOOMSEQ, 1, 0, 0),
			sprite('spark', G.S_SPARK, 16, 16, [1, 0], 1, 0, 0) ]);
		m_objSlots.setClip(32, 32, 256, 192);						// (the Next's sprite clip window: the paper)
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['crazybot_t0', 'crazybot_t0'], first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('crazybot'), function()
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

var g_objGame = new crazybotGame();
g_objGame.run();
