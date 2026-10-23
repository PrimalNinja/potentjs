// DEFENDER - ZX Spectrum Next Edition, ported from the Next version (NTC BASIC, Main.bas).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Landers are taking the humanoids off the planet. Shoot them; catch a humanoid that falls and
// put it back down. Lose every humanoid and the planet goes: every lander turns mutant. Take too
// long over a wave and a baiter comes after you. A smart bomb clears the screen, hyperspace puts
// you somewhere else. The humanoids and the planet come back every fifth wave.
//
// Keys: Q A altitude, O P thrust (the arrows as the joystick), Space or Z laser, B or M smart
//       bomb, H hyperspace. A game pad: the stick flies, A is the laser, B the smart bomb.
// Touch (nothing drawn: invisible zones over the picture): the left half flies (a strip along
//       each of its edges presses that way; the corners press two), the right half below the
//       scanner fires, the right half of the scanner strip is the smart bomb (left) and
//       hyperspace (right). Fly and fire with two thumbs at once. A touch anywhere starts.
//
// The screen is the Next's: the words are the tile screen (JTileGrid, in the game's palette rows,
// their black paper and all); Layer 2 (the scanner, the stars, the ground) is a 256 x 192 picture
// drawn a pixel at a time as on the Next and shown in three bands, as the copper does (Scroll.cls):
// the scanner not scrolled, the sky by a quarter of the ground's scroll, the ground by all of it.
// The ship, the lasers, the humanoids, the enemies, their shots and the explosions are numbered
// sprites (SprData's 16 patterns), numbered as on the Next. The shots move themselves (their
// movers); the sprites' hit boxes say what a laser hits, what runs into the ship, what shot gets
// it and when it catches a humanoid. The game runs 50 iterations a second - the Next's frames.
//
// The canvas is the Next's 256 x 192 picture: everything is drawn in it (the border flashes - red
// when the ship blows up or the planet goes, white with the smart bomb - are outside it, so they
// don't show; the smart bomb's white flash of the picture itself does).
//
// The Next version's bugs, kept as they are (they don't stop the game being played):
// - The ship's flickering engine flame never shows: "thrust And (frames And 2)" is 1 And 2, which
//   is 0, so the ship is always drawn without it in play (the title's ship does flicker).
// - The tops of the highest hills (the ground's line on Layer 2 line 159) are in the sky's band of
//   the copper (from line 44 to 159), so those few pixels scroll with the stars, not the ground.
// - The wave's clock is a 16-bit Integer: a wave that goes on for 11 minutes wraps it round and the
//   baiters stop coming for the next 11.
function defenderGame()
{
	var m_objThis = this;
	var G = GFX_DEFENDER;

	// the part of the Next's 320 x 256 screen the game draws in: Layer 2's 256 x 192 (the words and
	// sprites are all inside it): the canvas is this and nothing more
	var VIEW = { x:32, y:32, w:256, h:192 };

	// keys (keyCodes)
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_Z = 90, K_B = 66, K_M = 77, K_H = 72, K_SPACE = 32;

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left
	// half flies (its left and right strips thrust, its top and bottom strips climb and dive), the
	// right half below the scanner fires, the right half of the scanner strip is the smart bomb
	// (left) and hyperspace (right). The title: anywhere is Space
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:43, h:VIEW.h, key:K_O },
		{ type:'zone', x:VIEW.x + 85, y:VIEW.y, w:43, h:VIEW.h, key:K_P },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:128, h:64, key:K_Q },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 64, w:128, h:64, key:K_A },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y + 44, w:128, h:VIEW.h - 44, key:K_SPACE },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y, w:64, h:44, key:K_B },
		{ type:'zone', x:VIEW.x + 192, y:VIEW.y, w:64, h:44, key:K_H } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:K_SPACE } ];

	// the world, the play area (Layer 2 y, counting up from the bottom)
	var WORLD_W = 1024, WORLD_MASK = 1023, PLAY_TOP = 30, PLAY_BOT = 146;
	// sprite slots (the Next's)
	var SLOT_PLAYER = 0, SLOT_LASER0 = 1, SLOT_HUMAN0 = 5, SLOT_ENEMY0 = 13, SLOT_SHOT0 = 23, SLOT_BOOM0 = 29;
	var MAX_LASERS = 4, MAX_HUMANS = 8, MAX_ENEMIES = 10, MAX_SHOTS = 6, MAX_BOOMS = 4;
	// enemy states
	var ST_DEAD = 0, ST_WANDER = 1, ST_DESCEND = 2, ST_ABDUCT = 3, ST_MUTANT = 4, ST_BAITER = 5;
	// humanoid states
	var H_DEAD = 0, H_GROUND = 1, H_GRABBED = 2, H_FALLING = 3, H_CARRIED = 4;
	// Layer 2 colours (RRRGGGBB)
	var COL_TERRAIN = 0xC8, COL_DIVIDER = 0x8B;
	// the pens: the Layer 2 colour each of the original's CPC pens draws in
	var PENC = [0, 3, 224, 28, 31, 226, 252, 255, 146, 2, 224, 31, 28, 226, 252, 255];
	// an explosion: the four patterns, 15 frames in all (as the Next's count down), then it's done
	// (one more at the start: the sprites step on once before it's first seen)
	var BOOMSEQ = [11, 11, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14, 0];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 64);
	var m_objSteps = new JSteps();
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// Layer 2: 256 x 192, a pixel at a time (colour 0 left see-through: what's under it is palette
	// entry 0's colour, black, or white in the smart bomb's flash); the copper's two scrolls
	var m_objL2 = null, m_objL2Context = null, m_objL2Data = null, m_blnL2Dirty = true;
	var m_arrR = [], m_arrG = [], m_arrB = [];
	var m_intL2Pal0 = 0, m_intScrollStars = 0, m_intScrollGround = 0, m_blnBig = false;
	// Layer 2 is 512 across here, not the Next's 256, so a wide screen can show more of the world:
	// the ground is a ring of 512 columns and the stars are drawn twice (256 apart), so the middle
	// 256 are exactly the Next's (the hill tops in the sky's band - see the top - are kept as the
	// Next's 256 ring has them, twice over: m_arrYSky)
	var L2W = 512;
	// full screen (JCanvas's screenmode): how much more of the world shows left and right of the
	// Next's 256 (0 in the normal mode); the world drawn there is at most WIDEMAX each side
	var WIDEMAX = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:32, y:32, w:256, h:192 };

	// the player
	var m_intPX = 0, m_intPY = 0, m_intPVX = 0, m_intPVY = 0, m_intPDir = 1, m_intPSX = 88, m_intCamX = 0;
	var m_intOldPRX = 0, m_intOldPRY = 0, m_intThrust = 0, m_intSafeT = 0;
	var m_intScore = 0, m_intNextBonus = 10000, m_intLives = 3, m_intBombs = 3, m_intWave = 1;
	var m_blnGameOver = false, m_blnPlanetDead = false;
	var m_intFireCD = 0, m_intBombCD = 0, m_intHyperCD = 0, m_intFlashBg = 0;
	var m_intFrames = 0, m_intWaveT = 0, m_intBaiterT = 0, m_blnHudDirty = false, m_intMsgT = 0;
	// lasers
	var m_arrLX = [], m_arrLY = [], m_arrLVX = [], m_arrLLife = [];
	// humanoids
	var m_arrHX = [], m_arrHY = [], m_arrHState = [], m_arrHCarrier = [], m_arrHDir = [], m_arrHFall = [], m_arrHVY = [];
	var m_arrOldHRX = [], m_arrOldHRY = [], m_intHumansAlive = 0;
	// enemies
	var m_arrEX = [], m_arrEY = [], m_arrEVX = [], m_arrEVY = [], m_arrEState = [], m_arrETarget = [];
	var m_arrOldERX = [], m_arrOldERY = [], m_intEnemiesAlive = 0, m_intSpawnTimer = 0, m_intToSpawn = 0;
	// explosions: on or not, where in the world (their sprites play through once by themselves)
	var m_arrBOn = [], m_arrBX = [], m_arrBY = [];
	// the landscape: a height for each 4 pixels of the world; the ground's line for every x of it;
	// the line drawn in each of Layer 2's columns
	var m_arrLand = [], m_arrYH = [], m_arrYCol = [], m_arrYSky = [], m_intTCam = 0, m_blnTerOn = false, m_blnTerDead = false, m_intTerN = 256, m_intMark0 = -1;
	// the original's own random numbers (the landscape, the stars)
	var m_intRS = 0;
	// the words: palette row, where
	var m_intTxtPen = 2, m_intAtX = 0, m_intAtY = 0, m_intGX = 0, m_intGY = 0;

	var m_strState = 'loading', m_intT = 0, m_intDieF = 0, m_strResume = '';

	// ====================================================================================================
	// HELPERS

	// BASIC's \ : whole number division, towards nought
	function idiv(intA_a, intB_a)
	{
		return (intA_a / intB_a) | 0;
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a === 1);
	}

	// the low 32 bits of a x b (a and b whole, 0 .. 2^32 - 1), as a Long multiply on the Next
	function mul32(intA_a, intB_a)
	{
		var intAH = (intA_a >>> 16) & 0xFFFF, intAL = intA_a & 0xFFFF, intBH = (intB_a >>> 16) & 0xFFFF, intBL = intB_a & 0xFFFF;
		return (intAL * intBL + ((intAH * intBL + intAL * intBH) & 0xFFFF) * 65536) % 4294967296;
	}

	// the original's Rand: its own repeatable numbers, 0 .. n-1
	function rand(intN_a)
	{
		m_intRS = ((mul32(m_intRS, 1103515245) + 12345) % 4294967296) & 0x7FFFFFFF;
		return Math.floor(m_intRS / 65536) % intN_a;
	}

	// a hardware sprite as the Next's SetHardwareSprite: x 0..255 and y 0..191 on Layer 2 (y up
	// from the bottom), the sprite's middle there
	function spr(intSlot_a, intX_a, intY_a, strName_a, intFrame_a, blnFlip_a)
	{
		m_objSlots.put(intSlot_a, intX_a + 24, (191 - intY_a) + 24, strName_a, intFrame_a, 'defender_s0', 1, blnFlip_a ? SPRITE_MIRRORX : 0);
	}

	function hideAllSprites()
	{
		m_objSlots.hideRange(0, 64);
	}

	// ====================================================================================================
	// LAYER 2 AND THE WORDS (the original's CPC-style statements, on the Next)

	function l2Span(intX_a, intY_a, intW_a, intC_a)
	{
		var intK, intP, arrD = m_objL2Data.data;
		for (intK = intX_a; (intK < intX_a + intW_a) && (intK < L2W); intK++)
		{
			if ((intK >= 0) && (intY_a >= 0) && (intY_a < 192))
			{
				intP = (intY_a * L2W + intK) * 4;
				arrD[intP] = m_arrR[intC_a]; arrD[intP + 1] = m_arrG[intC_a]; arrD[intP + 2] = m_arrB[intC_a];
				arrD[intP + 3] = (intC_a === 0) ? 0 : 255;
			}
		}
		m_blnL2Dirty = true;
	}

	function l2Plot(intX_a, intY_a, intC_a)
	{
		if ((intX_a >= 0) && (intX_a < L2W) && (intY_a >= 0) && (intY_a < 192))
		{
			l2Span(intX_a, intY_a, 1, intC_a);
		}
	}

	function l2Rect(intX_a, intY_a, intW_a, intH_a, intC_a)
	{
		for (var intJ = intY_a; intJ < intY_a + intH_a; intJ++)
		{
			l2Span(intX_a, intJ, intW_a, intC_a);
		}
	}

	// the copper's scrolls for the sky and the ground (Scroll.Show)
	function scrollShow(intStars_a, intGround_a)
	{
		m_intScrollStars = intStars_a & 255;
		m_intScrollGround = intGround_a & (L2W - 1);
	}

	// Pen n: the words' palette row
	function pen(intN_a)
	{
		switch (intN_a)
		{
			case 14: m_intTxtPen = 3; break;
			case 11: m_intTxtPen = 4; break;
			case 10: m_intTxtPen = 5; break;
			case 12: m_intTxtPen = 6; break;
			case 13: m_intTxtPen = 7; break;
			default: m_intTxtPen = 2; break;
		}
	}

	// At x, y: where the words go (1, 1 = the top left of the 32 x 24 picture)
	function at(intX_a, intY_a)
	{
		m_intAtX = intX_a + 3; m_intAtY = intY_a + 3;
	}

	function printS(str_a)
	{
		m_objGrid.text(m_intAtX, m_intAtY, str_a, m_intTxtPen);
		m_intAtX += str_a.length;
	}

	function clsAll()
	{
		m_objGrid.clear(0, 0);
		l2Rect(0, 0, L2W, 192, 0);
		for (var intK = 0; intK < L2W; intK++)
		{
			m_arrYCol[intK] = -1;
			m_arrYSky[intK & 255] = -1;
		}
		m_blnTerOn = false;
		m_blnBig = false;
	}

	// Plot x, y, c: a point (y counts up from the bottom, as on the CPC), the start of the next Draw
	function plot(intX_a, intY_a, intC_a)
	{
		m_intGX = intX_a; m_intGY = intY_a;
		if ((intX_a >= 0) && (intX_a < 256) && (intY_a >= 0) && (intY_a < 192)) { l2Plot(intX_a, 191 - intY_a, PENC[intC_a & 15]); }
	}

	// Draw x, y, c: a line from the last point to x, y
	function draw(intX_a, intY_a, intC_a)
	{
		var intCol = PENC[intC_a & 15], intX0 = m_intGX, intY0 = m_intGY;
		var intDX = Math.abs(intX_a - intX0), intDY = -Math.abs(intY_a - intY0);
		var intSX = (intX0 < intX_a) ? 1 : -1, intSY = (intY0 < intY_a) ? 1 : -1;
		var intE = intDX + intDY, intE2, blnDone = false;
		while (!blnDone)
		{
			if ((intX0 >= 0) && (intX0 < 256) && (intY0 >= 0) && (intY0 < 192)) { l2Plot(intX0, 191 - intY0, intCol); }
			if ((intX0 === intX_a) && (intY0 === intY_a))
			{
				blnDone = true;
			}
			else
			{
				intE2 = intE * 2;
				if (intE2 >= intDY) { intE += intDY; intX0 += intSX; }
				if (intE2 <= intDX) { intE += intDX; intY0 += intSY; }
			}
		}
		m_intGX = intX_a; m_intGY = intY_a;
	}

	// ====================================================================================================
	// COORDINATES AND THE TERRAIN

	// the landscape, made once: hills and mountains wandering up and down
	function makeLand()
	{
		var intH = 14, intT = 14, intK;
		m_intRS = 12345;
		for (intK = 0; intK < 256; intK++)
		{
			if (intK % 16 === 0) { intT = 8 + rand(23); }
			if (intH < intT) { intH = intH + 1 + rand(3); }
			if (intH > intT) { intH = intH - 1 - rand(3); }
			if (intH < 8) { intH = 8; }
			if (intH > 32) { intH = 32; }
			m_arrLand[intK] = intH;
		}
		// the last few lead back to the first, so it joins all the way round
		for (intK = 248; intK <= 255; intK++)
		{
			m_arrLand[intK] = m_arrLand[247] + idiv((m_arrLand[0] - m_arrLand[247]) * (intK - 247), 9);
		}
	}

	function getTerrainY(intWX_a)
	{
		return m_blnPlanetDead ? 6 : m_arrLand[(intWX_a >> 2) & 255];
	}

	function worldToScreenX(intWX_a, intCX_a)
	{
		var intD = (intWX_a - intCX_a) & WORLD_MASK;
		if (intD >= 512) { intD -= 1024; }
		return intD;
	}

	function worldToRadarX(intWX_a)
	{
		return 64 + (((intWX_a - m_intPX + 512) & WORLD_MASK) >> 3);
	}

	// the ground's line for every x of the world (Layer 2 y, top down), sloping between the 4-pixel
	// steps of getTerrainY
	function heights()
	{
		var intWX, intH0, intH1;
		for (intWX = 0; intWX <= WORLD_MASK; intWX++)
		{
			intH0 = getTerrainY(intWX); intH1 = getTerrainY((intWX + 4) & WORLD_MASK);
			m_arrYH[intWX] = 191 - (intH0 + idiv((intH1 - intH0) * (intWX & 3), 4));
		}
	}

	// one column of the terrain: the old pixel off, the new on. The ground's band: column (wx And
	// 511). A pixel in the sky's band (a hill top on line 159): column (wx And 255) as the Next's,
	// and again 256 on (the sky's ring repeats every 256, as the stars do)
	function col(intWX_a)
	{
		var intC = intWX_a & (L2W - 1), intC8 = intWX_a & 255, intY = m_arrYH[intWX_a];
		if (m_arrYCol[intC] >= 160) { l2Plot(intC, m_arrYCol[intC], 0); }
		m_arrYCol[intC] = intY;
		if (intY >= 160) { l2Plot(intC, intY, COL_TERRAIN); }
		if ((m_arrYSky[intC8] >= 0) && (m_arrYSky[intC8] < 160)) { l2Plot(intC8, m_arrYSky[intC8], 0); l2Plot(intC8 + 256, m_arrYSky[intC8], 0); }
		m_arrYSky[intC8] = intY;
		if (intY < 160) { l2Plot(intC8, intY, COL_TERRAIN); l2Plot(intC8 + 256, intY, COL_TERRAIN); }
	}

	// the terrain: Layer 2's column (wx And 255) holds world x wx; only the columns that came into
	// view since last time are drawn; the copper scrolls the ground by cx and the sky by a quarter
	// (wide: the columns either side too, from -l to 255 + r)
	function terrain(intCX_a)
	{
		var intD, intK, intFrom = 0, intTo = -1;
		// the columns shown: the Next's 256 and, on a wide screen, those either side
		var intL = wideL(), intN = 256 + intL + wideR();
		if (m_blnTerDead !== m_blnPlanetDead) { heights(); }
		if ((!m_blnTerOn) || (m_blnTerDead !== m_blnPlanetDead) || (intN !== m_intTerN))
		{
			intFrom = -intL; intTo = intN - intL - 1;
		}
		else
		{
			intD = (intCX_a - m_intTCam) & WORLD_MASK;
			if (intD >= 512) { intD -= 1024; }
			if ((intD >= intN) || (intD <= -intN))
			{
				intFrom = -intL; intTo = intN - intL - 1;
			}
			else if (intD > 0)
			{
				intFrom = intN - intL - intD; intTo = intN - intL - 1;
			}
			else if (intD < 0)
			{
				intFrom = -intL; intTo = -intL - intD - 1;
			}
		}
		for (intK = intFrom; intK <= intTo; intK++)
		{
			col((intCX_a + intK) & WORLD_MASK);
		}
		m_intTerN = intN;
		m_blnTerOn = true; m_blnTerDead = m_blnPlanetDead; m_intTCam = intCX_a;
		scrollShow((intCX_a >> 2) & 255, intCX_a & (L2W - 1));
	}

	// ====================================================================================================
	// THE SCREEN

	function updateHUD()
	{
		pen(15);
		at(1, 1);
		printS(rightStr('000000' + String(m_intScore), 7));
		pen(14);
		at(10, 1);
		printS('SHIPS' + strBasic(m_intLives) + ' ');
		pen(12);
		at(19, 1);
		printS('BOMBS' + strBasic(m_intBombs) + ' ');
		pen(11);
		at(27, 1);
		printS('WAVE' + strBasic(m_intWave) + ' ');
		m_blnHudDirty = false;
	}

	function drawStaticFrame()
	{
		clsAll();
		// the scanner's divider and box
		l2Rect(0, 43, L2W, 1, COL_DIVIDER);
		plot(62, 152, 12);
		draw(193, 152, 12);
		draw(193, 182, 12);
		draw(62, 182, 12);
		draw(62, 152, 12);
		stars();
		m_intMark0 = -1;
		updateHUD();
	}

	// the stars: scattered over the sky (Layer 2 lines 46-155), scrolled slowly by the copper
	function stars()
	{
		var intK, intX, intY, arrC = [73, 146, 219, 255];
		m_intRS = 777;
		for (intK = 0; intK < 60; intK++)
		{
			intX = rand(256); intY = 46 + rand(110);
			l2Plot(intX, intY, arrC[intK % 4]);
			l2Plot(intX + 256, intY, arrC[intK % 4]);
		}
	}

	// a message in the middle of the play area for a while
	function message(str_a, intT_a)
	{
		pen(14);
		at(17 - idiv(str_a.length, 2), 11);
		printS(str_a);
		m_intMsgT = intT_a;
	}

	// the scanner's marks showing the part of the world on the screen (just outside the box, above
	// and below it)
	function viewMarks()
	{
		var intM = worldToRadarX(m_intCamX);
		if (intM !== m_intMark0)
		{
			if (m_intMark0 >= 0)
			{
				l2Span(m_intMark0, 7, 3, 0); l2Span(m_intMark0 + 30, 7, 3, 0);
				l2Span(m_intMark0, 41, 3, 0); l2Span(m_intMark0 + 30, 41, 3, 0);
			}
			if ((intM >= 62) && (intM + 33 <= 194))
			{
				l2Span(intM, 7, 3, 0xFF); l2Span(intM + 30, 7, 3, 0xFF);
				l2Span(intM, 41, 3, 0xFF); l2Span(intM + 30, 41, 3, 0xFF);
				m_intMark0 = intM;
			}
			else
			{
				m_intMark0 = -1;
			}
		}
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		hideAllSprites();
		clsAll();
		scrollShow(0, 0);
		stars();
		m_blnBig = true;			// "DEFENDER", three times the size, on Layer 2 (drawn with the frame)
		pen(11);
		at(5, 6);
		printS('ZX SPECTRUM NEXT EDITION');
		pen(15);
		at(9, 9); printS('LANDER      150');
		at(9, 11); printS('MUTANT      150');
		at(9, 13); printS('BAITER      200');
		at(9, 15); printS('HUMANOID    500');
		pen(12);
		at(3, 17); printS('Q / A or UP/DN : ALTITUDE');
		at(3, 18); printS('O / P or LT/RT : THRUST');
		at(3, 19); printS('SPACE / FIRE 1 : LASER');
		at(3, 20); printS('B / M / FIRE 2 : SMART BOMB');
		at(3, 21); printS('H              : HYPERSPACE');
		// the enemies and their points, the ship flying across the bottom: every one changes
		// pattern each 8 frames
		spr(1, 56, 195 - 9 * 8, 'lander', undefined, false);
		spr(2, 56, 195 - 11 * 8, 'mutant', undefined, false);
		spr(3, 56, 195 - 13 * 8, 'baiter', undefined, false);
		spr(4, 56, 195 - 15 * 8, 'human', undefined, false);
		spr(0, -20, 6, 'ship', undefined, false);
		for (var intK = 0; intK <= 4; intK++)
		{
			m_objSlots.setDelay(intK, 8);
			m_objSlots.animate(intK, 1, true);
		}
		m_intT = 0;
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'title';
	}

	function titleStep()
	{
		m_intT++;
		// (wide: across all of it, from beyond the left edge to beyond the right)
		spr(0, (m_intT * 2) % (300 + wideL() + wideR()) - 20 - wideL(), 6, 'ship', undefined, false);
		pen(10);
		at(7, 23);
		if ((idiv(m_intT, 25) & 1) !== 0) { printS('PRESS SPACE OR FIRE'); } else { printS('                   '); }
		if (down(K_SPACE)) { m_strState = 'titlerelease'; }
	}

	function titleRelease()
	{
		if (!down(K_SPACE))
		{
			hideAllSprites();
			for (var intK = 0; intK <= 4; intK++)
			{
				m_objSlots.setDelay(intK, 0);
				m_objSlots.unanimate(intK);
			}
			gameStart();
		}
	}

	function gameStart()
	{
		m_intScore = 0; m_intNextBonus = 10000;
		m_intLives = 3;
		m_intBombs = 3;
		m_intWave = 1;
		m_blnGameOver = false;
		initWave();
		m_objPad.setControls(ZONES_PLAY);
		m_strState = 'play';
	}

	// the game over screen, a while, then the title
	function gameOver()
	{
		hideAllSprites();
		clsAll();
		scrollShow(0, 0);
		pen(10);
		at(8, 9);
		printS('G A M E   O V E R');
		pen(15);
		at(8, 12);
		printS('FINAL SCORE: ' + String(m_intScore));
		pen(14);
		at(8, 15);
		printS('REACHED WAVE: ' + String(m_intWave));
		m_objPad.setControls(ZONES_MENU);
		m_objSteps.wait(150);
		m_objSteps.call(titleStart);
		m_strState = 'steps';
	}

	// ====================================================================================================
	// A WAVE

	function initWave()
	{
		var intI;
		hideAllSprites();
		drawStaticFrame();

		m_intPX = 512; m_intPY = 96; m_intPVX = 0; m_intPVY = 0; m_intPDir = 1; m_intPSX = 88;
		m_intOldPRX = 128; m_intOldPRY = 165;
		m_intSafeT = 50;

		for (intI = 0; intI < MAX_LASERS; intI++)
		{
			m_arrLLife[intI] = 0;
		}
		for (intI = 0; intI < MAX_BOOMS; intI++)
		{
			m_arrBOn[intI] = false;
		}

		// the humanoids: all of them at the start, and back again every fifth wave
		if ((m_intWave === 1) || ((m_intWave - 1) % 5 === 0))
		{
			m_blnPlanetDead = false;
			m_intHumansAlive = MAX_HUMANS;
			for (intI = 0; intI < MAX_HUMANS; intI++)
			{
				m_arrHX[intI] = (intI * 128 + 48) & WORLD_MASK;
				m_arrHState[intI] = H_GROUND;
			}
		}
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			m_arrOldHRX[intI] = 0;
			m_arrHCarrier[intI] = -1;
			if (m_arrHState[intI] !== H_DEAD)
			{
				m_arrHState[intI] = H_GROUND;
				m_arrHY[intI] = getTerrainY(m_arrHX[intI]) + 6;
			}
			m_arrHDir[intI] = (rand(2) !== 0) ? 1 : -1;
		}

		for (intI = 0; intI < MAX_ENEMIES; intI++)
		{
			m_arrEState[intI] = ST_DEAD;
			m_arrOldERX[intI] = 0;
		}

		m_intToSpawn = Math.min(24, 10 + m_intWave * 2);
		m_intEnemiesAlive = 0;
		m_intSpawnTimer = 10;
		m_intWaveT = 0; m_intBaiterT = 0;

		for (intI = 0; intI <= 4; intI++)
		{
			spawnEnemy();
		}
		updateHUD();
		message('WAVE' + strBasic(m_intWave), 60);
	}

	function spawnEnemy()
	{
		var intI, blnDone = false;
		for (intI = 0; (intI < MAX_ENEMIES) && (m_intToSpawn > 0) && !blnDone; intI++)
		{
			if (m_arrEState[intI] === ST_DEAD)
			{
				m_arrEX[intI] = (m_intPX + 250 + rnd(500)) & WORLD_MASK;
				m_arrEY[intI] = 110 + rnd(30);
				m_arrEVX[intI] = (rnd(2) === 0) ? 1 : -1;
				m_arrEVY[intI] = -1;
				m_arrEState[intI] = m_blnPlanetDead ? ST_MUTANT : ST_WANDER;
				m_arrETarget[intI] = -1;
				m_arrOldERX[intI] = 0;
				m_intEnemiesAlive++;
				m_intToSpawn--;
				blnDone = true;
			}
		}
	}

	// the baiter: a fast saucer that comes for you when a wave goes on too long
	function spawnBaiter()
	{
		var intI, blnDone = false;
		for (intI = 0; (intI < MAX_ENEMIES) && !blnDone; intI++)
		{
			if (m_arrEState[intI] === ST_DEAD)
			{
				m_arrEX[intI] = (m_intPX + 300) & WORLD_MASK;
				m_arrEY[intI] = m_intPY;
				m_arrEState[intI] = ST_BAITER;
				m_arrEVX[intI] = 0; m_arrEVY[intI] = 0;
				m_arrETarget[intI] = -1; m_arrOldERX[intI] = 0;
				sfx(1, 40, 2, 13, 25, 0);
				blnDone = true;
			}
		}
	}

	function fireLaser()
	{
		var intI, blnDone = false;
		for (intI = 0; (intI < MAX_LASERS) && !blnDone; intI++)
		{
			if (m_arrLLife[intI] === 0)
			{
				m_arrLX[intI] = (m_intPX + m_intPDir * 12) & WORLD_MASK;
				m_arrLY[intI] = m_intPY - 1;
				m_arrLVX[intI] = m_intPDir * 16 + m_intPVX;
				m_arrLLife[intI] = 14;
				sfx(0, 24, 5, 12, 9, 0);
				blnDone = true;
			}
		}
	}

	// an explosion at world x, y: its sprite plays once through by itself
	function boom(intWX_a, intWY_a)
	{
		var intK, blnDone = false;
		for (intK = 0; (intK < MAX_BOOMS) && !blnDone; intK++)
		{
			if (!m_arrBOn[intK])
			{
				m_arrBOn[intK] = true; m_arrBX[intK] = intWX_a; m_arrBY[intK] = intWY_a;
				spr(SLOT_BOOM0 + intK, worldToScreenX(intWX_a, m_intCamX), intWY_a, 'boom', undefined, false);
				m_objSlots.animate(SLOT_BOOM0 + intK, 1, true);
				blnDone = true;
			}
		}
	}

	function killEnemy(intIdx_a)
	{
		var intH;
		m_objSlots.hide(SLOT_ENEMY0 + intIdx_a);
		if (m_arrOldERX[intIdx_a] > 0)
		{
			plot(m_arrOldERX[intIdx_a], m_arrOldERY[intIdx_a], 0);
			m_arrOldERX[intIdx_a] = 0;
		}
		boom(m_arrEX[intIdx_a], m_arrEY[intIdx_a]);

		intH = m_arrETarget[intIdx_a];
		if ((intH >= 0) && (intH < MAX_HUMANS))
		{
			if ((m_arrHState[intH] === H_GRABBED) && (m_arrHCarrier[intH] === intIdx_a))
			{
				m_arrHState[intH] = H_FALLING;
				m_arrHCarrier[intH] = -1;
				m_arrHFall[intH] = m_arrHY[intH]; m_arrHVY[intH] = 0;
			}
		}

		if (m_arrEState[intIdx_a] === ST_BAITER)
		{
			addScore(200);
		}
		else
		{
			addScore(150);
			m_intEnemiesAlive--;
		}
		m_arrEState[intIdx_a] = ST_DEAD;
		sfx(1, 10, 1, 14, 20, 1);
	}

	function addScore(intN_a)
	{
		m_intScore += intN_a;
		if (m_intScore >= m_intNextBonus)
		{
			m_intNextBonus += 10000;
			m_intLives++;
			if (m_intBombs < 9) { m_intBombs++; }
			sfx(2, 60, -1, 14, 40, 0);
		}
		m_blnHudDirty = true;
	}

	function triggerSmartBomb(intCX_a)
	{
		var intI, intSX;
		if (m_intBombs > 0)
		{
			m_intBombs--;
			m_intBombCD = 25;
			sfx(2, 4, 1, 15, 45, 1);
			m_intL2Pal0 = 0xFF;			// (and the border white: outside the picture)
			m_intFlashBg = 4;
			for (intI = 0; intI < MAX_ENEMIES; intI++)
			{
				if (m_arrEState[intI] !== ST_DEAD)
				{
					intSX = worldToScreenX(m_arrEX[intI], intCX_a);
					if ((intSX >= -16) && (intSX <= 272)) { killEnemy(intI); }
				}
			}
			m_objSlots.hideRange(SLOT_SHOT0, MAX_SHOTS);
			m_blnHudDirty = true;
		}
	}

	// the ship's hit: it blows up (60 frames, everything else still), then loseLifeEnd
	function loseLife(strResume_a)
	{
		var intI;
		sfx(2, 6, 1, 15, 70, 1);
		sfx(0, 150, 6, 14, 60, 0);
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			if (m_arrHState[intI] === H_CARRIED)
			{
				m_arrHState[intI] = H_FALLING; m_arrHFall[intI] = m_arrHY[intI]; m_arrHVY[intI] = 0;
			}
		}
		spr(SLOT_PLAYER, m_intPSX, m_intPY, 'shipboom', undefined, false);
		m_objSlots.animate(SLOT_PLAYER, 1, true);
		m_intDieF = 0;
		m_strResume = strResume_a;
		m_strState = 'dying';
	}

	function dyingStep()
	{
		m_intDieF++;
		if (m_intDieF === 40) { m_objSlots.hide(SLOT_PLAYER); }
		if (m_intDieF < 60)
		{
			m_objSlots.step();
		}
		else
		{
			loseLifeEnd();
			m_strState = 'play';
			// the rest of the frame the ship was hit in
			if (m_strResume === 'shots') { frameShots(); } else { frameRest(); }
		}
	}

	// after the explosion: a ship less; the enemies near the ship moved away, the shots gone, a
	// moment's safety, and on
	function loseLifeEnd()
	{
		var intI;
		m_intLives--;
		if (m_intLives <= 0)
		{
			hideAllSprites();
			m_blnGameOver = true;
		}
		else
		{
			for (intI = 0; intI < MAX_ENEMIES; intI++)
			{
				if (m_arrEState[intI] !== ST_DEAD)
				{
					if (Math.abs(worldToScreenX(m_arrEX[intI], m_intPX)) < 200) { m_arrEX[intI] = (m_arrEX[intI] + 400) & WORLD_MASK; }
					if (m_arrEState[intI] === ST_BAITER)
					{
						m_arrEState[intI] = ST_DEAD; m_objSlots.hide(SLOT_ENEMY0 + intI);
					}
				}
			}
			m_objSlots.hideRange(SLOT_SHOT0, MAX_SHOTS);
			m_intPY = 96; m_intPVX = 0; m_intSafeT = 100; m_intBaiterT = 0;
			m_blnHudDirty = true;
		}
	}

	// ====================================================================================================
	// THE PARTS OF A FRAME

	function controls()
	{
		var blnUp = down(K_Q) || down(KEY_UP), blnDown = down(K_A) || down(KEY_DOWN);
		var blnLeft = down(K_O) || down(KEY_LEFT), blnRight = down(K_P) || down(KEY_RIGHT);
		if (blnUp)
		{
			if (m_intPVY < 3) { m_intPVY++; }
		}
		else if (blnDown)
		{
			if (m_intPVY > -3) { m_intPVY--; }
		}
		else
		{
			m_intPVY = 0;
		}

		m_intThrust = 0;
		if (blnLeft)
		{
			m_intPDir = -1; m_intThrust = 1;
			if (m_intPVX > -10) { m_intPVX--; }
		}
		else if (blnRight)
		{
			m_intPDir = 1; m_intThrust = 1;
			if (m_intPVX < 10) { m_intPVX++; }
		}
		else if (m_intFrames % 3 === 0)
		{
			if (m_intPVX > 0) { m_intPVX--; }
			if (m_intPVX < 0) { m_intPVX++; }
		}
		if ((m_intThrust !== 0) && !m_objSound.isBusy(2)) { sfx(2, 28, 0, 5, 3, 1); }

		m_intPX = (m_intPX + m_intPVX) & WORLD_MASK;
		m_intPY += m_intPVY;
		if (m_intPY < PLAY_TOP) { m_intPY = PLAY_TOP; }
		if (m_intPY > PLAY_BOT) { m_intPY = PLAY_BOT; }

		// the ship sits to one side, leaving room ahead: turning round, it slides across
		if ((m_intPDir > 0) && (m_intPSX > 88)) { m_intPSX -= 4; }
		if ((m_intPDir < 0) && (m_intPSX < 168)) { m_intPSX += 4; }
		m_intCamX = (m_intPX - m_intPSX) & WORLD_MASK;

		// the laser
		if (m_intFireCD > 0) { m_intFireCD--; }
		if ((down(K_SPACE) || down(K_Z)) && (m_intFireCD === 0))
		{
			fireLaser();
			m_intFireCD = 5;
		}

		// the smart bomb
		if (m_intBombCD > 0) { m_intBombCD--; }
		if ((down(K_B) || down(K_M)) && (m_intBombCD === 0)) { triggerSmartBomb(m_intCamX); }

		// hyperspace: somewhere else, at random
		if (m_intHyperCD > 0) { m_intHyperCD--; }
		if (down(K_H) && (m_intHyperCD === 0))
		{
			plot(m_intOldPRX, m_intOldPRY, 0);
			m_intPX = rnd(WORLD_W);
			m_intPY = 50 + rnd(85);
			m_intPVX = 0;
			m_intHyperCD = 50; m_intSafeT = 25;
			sfx(0, 500, -24, 14, 20, 0);
		}
	}

	// the ship (it flashes while it's safe: still there for catching humanoids), its scanner dot
	function drawPlayer()
	{
		// (the Next's "thrust And (frames And 2)" is never true: no flame - see the top)
		spr(SLOT_PLAYER, m_intPSX, m_intPY, 'ship', 1, m_intPDir < 0);
		if ((m_intSafeT !== 0) && ((m_intSafeT & 4) !== 0)) { m_objSlots.hide(SLOT_PLAYER); }
		if (m_intSafeT > 0) { m_intSafeT--; }

		plot(m_intOldPRX, m_intOldPRY, 0);
		m_intOldPRX = 128;
		m_intOldPRY = 154 + idiv(m_intPY, 7);
		plot(m_intOldPRX, m_intOldPRY, 15);
	}

	function lasers()
	{
		var intI, intLSX;
		for (intI = 0; intI < MAX_LASERS; intI++)
		{
			if (m_arrLLife[intI] > 0)
			{
				m_arrLX[intI] = (m_arrLX[intI] + m_arrLVX[intI]) & WORLD_MASK;
				m_arrLLife[intI]--;
				intLSX = worldToScreenX(m_arrLX[intI], m_intCamX);
				// past the Next's edge on a wide screen: on out to the wide edge, however long it
				// takes (in the normal mode it's gone there anyway)
				if ((m_arrLLife[intI] === 0) && ((intLSX < 0) || (intLSX > 255))) { m_arrLLife[intI] = 1; }
				if ((m_arrLLife[intI] > 0) && (intLSX >= -wideL()) && (intLSX <= 255 + wideR()))
				{
					spr(SLOT_LASER0 + intI, intLSX, m_arrLY[intI], 'laser', 5, m_arrLVX[intI] < 0);
				}
				else
				{
					m_arrLLife[intI] = 0;
					m_objSlots.hide(SLOT_LASER0 + intI);
				}
			}
			else
			{
				m_objSlots.hide(SLOT_LASER0 + intI);
			}
		}
	}

	// humanoid i's sprite where it is: walking about on the ground, else standing
	function showHuman(intI_a, intHSX_a)
	{
		var intN = SLOT_HUMAN0 + intI_a;
		if (m_arrHState[intI_a] === H_GROUND)
		{
			spr(intN, intHSX_a, m_arrHY[intI_a], 'human', undefined, m_arrHDir[intI_a] < 0);
			m_objSlots.animate(intN, 1);
		}
		else
		{
			spr(intN, intHSX_a, m_arrHY[intI_a], 'human', 4, m_arrHDir[intI_a] < 0);
		}
	}

	// does the ship (flashing or not: where it is) touch humanoid i's sprite?
	function shipTouches(intN_a)
	{
		var objB = m_objSlots.getBox(SLOT_PLAYER);
		return m_objSlots.collideRect(intN_a, objB.left, objB.top, objB.right - objB.left, objB.bottom - objB.top);
	}

	function humans()
	{
		var intI, intHSX, intHRX, intHRY, intTGround, blnCaught;
		for (intI = 0; intI < MAX_HUMANS; intI++)
		{
			if (m_arrOldHRX[intI] > 0)
			{
				plot(m_arrOldHRX[intI], m_arrOldHRY[intI], 0);
				m_arrOldHRX[intI] = 0;
			}

			if (m_arrHState[intI] !== H_DEAD)
			{
				switch (m_arrHState[intI])
				{
					case H_GROUND:
						// wandering about
						if (m_intFrames % 6 === 0)
						{
							m_arrHX[intI] = (m_arrHX[intI] + m_arrHDir[intI]) & WORLD_MASK;
							if (rnd(60) === 0) { m_arrHDir[intI] = -m_arrHDir[intI]; }
						}
						m_arrHY[intI] = getTerrainY(m_arrHX[intI]) + 6;
						break;
					case H_CARRIED:
						m_arrHX[intI] = m_intPX;
						m_arrHY[intI] = m_intPY - 10;
						intTGround = getTerrainY(m_arrHX[intI]) + 6;
						if ((m_arrHY[intI] <= intTGround) || (m_intPY <= PLAY_TOP))
						{
							m_arrHY[intI] = intTGround;
							m_arrHState[intI] = H_GROUND;
							addScore(500);
							sfx(0, 90, -3, 14, 20, 0);
						}
						break;
					case H_FALLING:
						if ((m_intFrames % 4 === 0) && (m_arrHVY[intI] < 3)) { m_arrHVY[intI]++; }
						m_arrHY[intI] -= m_arrHVY[intI];
						// caught? (its sprite where it is now, against the ship's)
						blnCaught = false;
						intHSX = worldToScreenX(m_arrHX[intI], m_intCamX);
						if ((intHSX >= -8 - wideL()) && (intHSX <= 263 + wideR()))
						{
							showHuman(intI, intHSX);
							blnCaught = shipTouches(SLOT_HUMAN0 + intI);
						}
						if (blnCaught)
						{
							m_arrHState[intI] = H_CARRIED;
							addScore(500);
							sfx(0, 140, -6, 14, 14, 0);
						}
						else
						{
							intTGround = getTerrainY(m_arrHX[intI]) + 6;
							if (m_arrHY[intI] <= intTGround)
							{
								m_arrHY[intI] = intTGround;
								if (m_arrHFall[intI] - intTGround > 60)
								{
									// too far to fall
									m_arrHState[intI] = H_DEAD;
									m_intHumansAlive--;
									boom(m_arrHX[intI], m_arrHY[intI]);
									sfx(1, 100, 12, 13, 25, 0);
									humansGone();
								}
								else
								{
									m_arrHState[intI] = H_GROUND;
									addScore(250);
								}
							}
						}
						break;
					default:
						break;
				}
			}

			if (m_arrHState[intI] !== H_DEAD)
			{
				intHSX = worldToScreenX(m_arrHX[intI], m_intCamX);
				if ((intHSX >= -8 - wideL()) && (intHSX <= 263 + wideR()))
				{
					showHuman(intI, intHSX);
				}
				else
				{
					m_objSlots.hide(SLOT_HUMAN0 + intI);
				}
				intHRX = worldToRadarX(m_arrHX[intI]);
				intHRY = 153 + idiv(m_arrHY[intI], 7);
				plot(intHRX, intHRY, 13);
				m_arrOldHRX[intI] = intHRX; m_arrOldHRY[intI] = intHRY;
			}
			else
			{
				m_objSlots.hide(SLOT_HUMAN0 + intI);
			}
		}
	}

	// no humanoids left: the planet goes, and every lander turns mutant
	function humansGone()
	{
		var intK;
		if ((m_intHumansAlive <= 0) && !m_blnPlanetDead)
		{
			m_blnPlanetDead = true;
			m_intFlashBg = 10;			// (the border red: outside the picture)
			sfx(2, 3, 1, 15, 60, 1);
			for (intK = 0; intK < MAX_ENEMIES; intK++)
			{
				if ((m_arrEState[intK] === ST_WANDER) || (m_arrEState[intK] === ST_DESCEND)) { m_arrEState[intK] = ST_MUTANT; }
			}
			message('THE PLANET IS GONE', 100);
		}
	}

	// the enemies; true if one ran into the ship (it's blown up: loseLife)
	function enemies()
	{
		var intI, intESX, intERX, intERY, intTH, intDXH, intS, intN;
		var strName, intEcol, blnHit, blnLost = false, arrLasers;

		if (m_intSpawnTimer > 0)
		{
			m_intSpawnTimer--;
		}
		else if ((m_intToSpawn > 0) && (m_intEnemiesAlive < 7))
		{
			spawnEnemy();
			m_intSpawnTimer = 60;
		}
		// the baiter: after 40 seconds, then every 12 (the wave's clock a 16-bit Integer, as the Next's)
		m_intWaveT = ((m_intWaveT + 1) << 16) >> 16;
		if (m_intWaveT > 2000)
		{
			m_intBaiterT++;
			if ((m_intBaiterT >= 600) || (m_intWaveT === 2001))
			{
				m_intBaiterT = 0;
				spawnBaiter();
			}
		}

		for (intI = 0; (intI < MAX_ENEMIES) && !blnLost; intI++)
		{
			intN = SLOT_ENEMY0 + intI;
			if (m_arrOldERX[intI] > 0)
			{
				plot(m_arrOldERX[intI], m_arrOldERY[intI], 0);
				m_arrOldERX[intI] = 0;
			}

			if (m_arrEState[intI] !== ST_DEAD)
			{
				switch (m_arrEState[intI])
				{
					case ST_WANDER:
						if (m_intFrames % 2 === 0) { m_arrEX[intI] = (m_arrEX[intI] + m_arrEVX[intI]) & WORLD_MASK; }
						if (m_intFrames % 3 === 0) { m_arrEY[intI] += m_arrEVY[intI]; }
						if (m_arrEY[intI] < 70) { m_arrEVY[intI] = 1; }
						if (m_arrEY[intI] > 140) { m_arrEVY[intI] = -1; }
						// now and then it picks a humanoid below to take
						if ((rnd(150) === 0) && (m_intHumansAlive > 0))
						{
							intTH = rnd(MAX_HUMANS);
							if (m_arrHState[intTH] === H_GROUND)
							{
								m_arrETarget[intI] = intTH;
								m_arrEState[intI] = ST_DESCEND;
							}
						}
						break;
					case ST_DESCEND:
						intTH = m_arrETarget[intI];
						if ((intTH < 0) || (m_arrHState[intTH] !== H_GROUND))
						{
							m_arrEState[intI] = ST_WANDER;
						}
						else
						{
							intDXH = worldToScreenX(m_arrHX[intTH], m_arrEX[intI]);
							if (intDXH > 1)
							{
								m_arrEX[intI] = (m_arrEX[intI] + 1) & WORLD_MASK;
							}
							else if (intDXH < -1)
							{
								m_arrEX[intI] = (m_arrEX[intI] - 1) & WORLD_MASK;
							}
							else if (m_arrEY[intI] > m_arrHY[intTH] + 10)
							{
								m_arrEY[intI]--;
							}
							else
							{
								m_arrHState[intTH] = H_GRABBED;
								m_arrHCarrier[intTH] = intI;
								m_arrEState[intI] = ST_ABDUCT;
								sfx(1, 300, -16, 13, 30, 0);
								message('HUMANOID TAKEN!', 50);
							}
						}
						break;
					case ST_ABDUCT:
						intTH = m_arrETarget[intI];
						if ((intTH < 0) || (m_arrHState[intTH] !== H_GRABBED))
						{
							m_arrEState[intI] = ST_WANDER;
						}
						else
						{
							if (m_intFrames % 2 === 0) { m_arrEY[intI]++; }
							m_arrHX[intTH] = m_arrEX[intI];
							m_arrHY[intTH] = m_arrEY[intI] - 10;
							if (m_arrEY[intI] >= 140)
							{
								m_arrHState[intTH] = H_DEAD;
								m_intHumansAlive--;
								m_arrEState[intI] = ST_MUTANT;
								sfx(1, 60, 8, 15, 40, 0);
								humansGone();
							}
						}
						break;
					case ST_MUTANT:
						// straight at the ship, twitching
						intDXH = worldToScreenX(m_intPX, m_arrEX[intI]);
						if (intDXH > 0) { m_arrEX[intI] = (m_arrEX[intI] + 2 + rnd(2)) & WORLD_MASK; } else { m_arrEX[intI] = (m_arrEX[intI] - 2 - rnd(2)) & WORLD_MASK; }
						if (m_arrEY[intI] < m_intPY - 4)
						{
							m_arrEY[intI] += 1 + rnd(2);
						}
						else if (m_arrEY[intI] > m_intPY + 4)
						{
							m_arrEY[intI] -= 1 + rnd(2);
						}
						else
						{
							m_arrEY[intI] += rnd(5) - 2;
						}
						break;
					case ST_BAITER:
						// fast, close, and mean
						intDXH = worldToScreenX(m_intPX, m_arrEX[intI]);
						if ((intDXH > 30) && (m_arrEVX[intI] < 9)) { m_arrEVX[intI]++; }
						if ((intDXH < -30) && (m_arrEVX[intI] > -9)) { m_arrEVX[intI]--; }
						m_arrEX[intI] = (m_arrEX[intI] + m_arrEVX[intI]) & WORLD_MASK;
						if (m_arrEY[intI] < m_intPY) { m_arrEY[intI] += 2; } else { m_arrEY[intI] -= 2; }
						break;
					default:
						break;
				}
				if (m_arrEY[intI] < PLAY_TOP - 8) { m_arrEY[intI] = PLAY_TOP - 8; }
				if (m_arrEY[intI] > PLAY_BOT) { m_arrEY[intI] = PLAY_BOT; }

				// its sprite where it is now (its look by what it is), then what its hit box touches
				strName = 'lander'; intEcol = 12;
				if (m_arrEState[intI] === ST_MUTANT) { strName = 'mutant'; intEcol = 10; }
				if (m_arrEState[intI] === ST_BAITER) { strName = 'baiter'; intEcol = 14; }
				intESX = worldToScreenX(m_arrEX[intI], m_intCamX);
				spr(intN, intESX, m_arrEY[intI], strName, undefined, false);
				m_objSlots.animate(intN, 1);

				// a laser? (the first one that touches it)
				blnHit = false;
				arrLasers = m_objSlots.collideRange(intN, SLOT_LASER0, MAX_LASERS, function() { return true; });
				if (arrLasers.length > 0)
				{
					m_arrLLife[arrLasers[0] - SLOT_LASER0] = 0;
					m_objSlots.hide(arrLasers[0]);
					killEnemy(intI);
					blnHit = true;
				}

				if (!blnHit)
				{
					if ((m_intSafeT === 0) && m_objSlots.collide(intN, SLOT_PLAYER))
					{
						killEnemy(intI);
						blnLost = true;
					}
					else
					{
						// it shoots (aimed), when it's on the screen and not right on top of the ship
						intS = 220;
						if (m_arrEState[intI] === ST_MUTANT) { intS = 140; }
						if (m_arrEState[intI] === ST_BAITER) { intS = 60; }
						if ((intESX >= 12) && (intESX <= 244) && (Math.abs(intESX - m_intPSX) > 24) && (rnd(intS) === 0)) { enemyShot(intI, intESX); }

						if ((intESX < -8 - wideL()) || (intESX > 263 + wideR())) { m_objSlots.hide(intN); }

						intERX = worldToRadarX(m_arrEX[intI]);
						intERY = 153 + idiv(m_arrEY[intI], 7);
						plot(intERX, intERY, intEcol);
						m_arrOldERX[intI] = intERX;
						m_arrOldERY[intI] = intERY;
					}
				}
			}
			else
			{
				m_objSlots.hide(intN);
			}
		}
		return blnLost;
	}

	// an enemy's shot: kept in the world (in quarter pixels), moving itself; it's done when its time
	// is up or it leaves the screen or the play area
	function shotMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = intX_a, intY = intY_a, intLife = 60;
		return function(intN_a, objO_a)
		{
			var blnDone = false, intSX, intWY;
			if (m_strState === 'play')
			{
				intX = (intX + intVX_a) & 4095;
				intY += intVY_a;
				intLife--;
				intSX = worldToScreenX(intX >> 2, m_intCamX);
				intWY = idiv(intY, 4);
				if ((intLife > 0) && (intSX >= 0) && (intSX <= 255) && (intWY > 20) && (intWY < 148))
				{
					objO_a.x = intSX + 24; objO_a.y = (191 - intWY) + 24;
				}
				else
				{
					blnDone = true;
				}
			}
			return blnDone;
		};
	}

	// a shot from enemy n at screen x esx, aimed at the ship
	function enemyShot(intN_a, intESX_a)
	{
		var intK, intDX, intDY, intM, blnDone = false;
		for (intK = 0; (intK < MAX_SHOTS) && !blnDone; intK++)
		{
			if (!m_objSlots.isVisible(SLOT_SHOT0 + intK))
			{
				intDX = m_intPSX - intESX_a; intDY = m_intPY - m_arrEY[intN_a];
				intM = Math.max(1, Math.abs(intDX), Math.abs(intDY));
				m_objSlots.put(SLOT_SHOT0 + intK, -64, -64, 'shot', 10, 'defender_s0');
				m_objSlots.setMover(SLOT_SHOT0 + intK, shotMover(m_arrEX[intN_a] * 4, m_arrEY[intN_a] * 4, idiv(intDX * 12, intM), idiv(intDY * 12, intM)));
				sfx(2, 70, -3, 8, 6, 0);
				blnDone = true;
			}
		}
	}

	// the shots move themselves (and every animation a step on); true if one got the ship
	function shots()
	{
		var intI, blnLost = false;
		m_objSlots.step();
		for (intI = 0; (intI < MAX_SHOTS) && !blnLost; intI++)
		{
			if ((m_intSafeT === 0) && m_objSlots.collide(SLOT_SHOT0 + intI, SLOT_PLAYER))
			{
				m_objSlots.hide(SLOT_SHOT0 + intI);
				blnLost = true;
			}
		}
		return blnLost;
	}

	// the explosions kept on their spots in the world as the view moves; gone when played through
	function booms()
	{
		var intK, intN, intBSX;
		for (intK = 0; intK < MAX_BOOMS; intK++)
		{
			intN = SLOT_BOOM0 + intK;
			if (m_arrBOn[intK] && !m_objSlots.isAnimated(intN)) { m_arrBOn[intK] = false; }
			if (m_arrBOn[intK])
			{
				intBSX = worldToScreenX(m_arrBX[intK], m_intCamX);
				if ((intBSX > -8 - wideL()) && (intBSX < 264 + wideR()))
				{
					m_objSlots.move(intN, intBSX + 24, (191 - m_arrBY[intK]) + 24);
				}
				else
				{
					m_objSlots.hide(intN);
				}
			}
			else
			{
				m_objSlots.hide(intN);
			}
		}
	}

	// ====================================================================================================
	// A FRAME OF PLAY (the Next's main loop)

	function playFrame()
	{
		m_intFrames++;
		if (m_intFlashBg > 0)
		{
			m_intFlashBg--;
			if (m_intFlashBg === 0) { m_intL2Pal0 = 0; }
		}
		if (m_intMsgT > 0)
		{
			m_intMsgT--;
			if (m_intMsgT === 0)
			{
				at(1, 11);
				printS('                                ');
			}
		}

		controls();
		drawPlayer();
		lasers();
		humans();
		if (enemies())
		{
			loseLife('shots');
		}
		else
		{
			frameShots();
		}
	}

	function frameShots()
	{
		var blnLost = false;
		if (!m_blnGameOver) { blnLost = shots(); }
		if (blnLost)
		{
			loseLife('rest');
		}
		else
		{
			frameRest();
		}
	}

	function frameRest()
	{
		booms();
		terrain(m_intCamX);
		viewMarks();
		if (m_blnHudDirty) { updateHUD(); }

		if (m_blnGameOver)
		{
			gameOver();
		}
		else if ((m_intEnemiesAlive <= 0) && (m_intToSpawn <= 0))
		{
			// wave complete: a bonus for each humanoid left
			waveDone();
		}
	}

	function waveDone()
	{
		var intI, intB;
		for (intI = 0; intI < MAX_ENEMIES; intI++)
		{
			if (m_arrEState[intI] === ST_BAITER)
			{
				m_arrEState[intI] = ST_DEAD; m_objSlots.hide(SLOT_ENEMY0 + intI);
			}
		}
		intB = Math.min(5000, m_intHumansAlive * 100 * m_intWave);
		pen(14);
		at(9, 10); printS('ATTACK WAVE' + strBasic(m_intWave));
		at(11, 11); printS('COMPLETED');
		pen(15);
		at(9, 13); printS('BONUS' + strBasic(intB));
		// the tune: six notes, 10 frames each
		for (intI = 0; intI <= 5; intI++)
		{
			m_objSteps.call(noteStep(intI));
			m_objSteps.wait(10);
		}
		m_objSteps.call(function() { addScore(intB); });
		m_objSteps.wait(60);
		m_objSteps.call(function()
		{
			m_intWave++;
			if (m_intBombs < 5) { m_intBombs++; }
			initWave();
			m_strState = 'play';
		});
		m_strState = 'steps';
	}

	function noteStep(intF_a)
	{
		return function() { sfx(intF_a % 3, 120 - intF_a * 12, 0, 13, 12, 0); };
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		wide();
		if (m_blnLoaded)
		{
			switch (m_strState)
			{
				case 'start': titleStart(); break;
				case 'title': titleStep(); m_objSlots.step(); break;
				case 'titlerelease': titleRelease(); break;
				case 'play': playFrame(); break;
				case 'dying': dyingStep(); break;
				case 'steps': m_objSteps.update(); break;
				default: break;
			}
		}
		m_objSound.update();
	};

	// the screen's shape: what JCanvas shows (wider in full screen), the extra either side of the
	// Next's 256, the sprites' clip window to match (the world drawn there: at most WIDEMAX)
	function wide()
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
			m_objSlots.setClip(32 - wideL(), 32, 256 + wideL() + wideR(), 192);
		}
	}

	// how far the world is drawn past the Next's 256 on the left / right (0 in the normal mode)
	function wideL()
	{
		return Math.min(m_intWL, WIDEMAX);
	}

	function wideR()
	{
		return Math.min(m_intWR, WIDEMAX);
	}

	// one band of Layer 2 lines, scrolled sideways (round, a ring of L2W) as the copper sets it;
	// wide: from l further left, w across
	function paintBand(objContext_a, intY_a, intH_a, intScroll_a, intL_a, intW_a)
	{
		var intS = (((intScroll_a - intL_a) % L2W) + L2W) % L2W, intW1 = Math.min(intW_a, L2W - intS);
		objContext_a.drawImage(m_objL2, intS, intY_a, intW1, intH_a, 32 - intL_a, 32 + intY_a, intW1, intH_a);
		if (intW1 < intW_a)
		{
			objContext_a.drawImage(m_objL2, 0, intY_a, intW_a - intW1, intH_a, 32 - intL_a + intW1, 32 + intY_a, intW_a - intW1, intH_a);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		var intL = wideL(), intW = 256 + wideL() + wideR();
		// all of what's shown black (past the world on a wide screen), then Layer 2's palette entry
		// 0 under the world (black; white in the smart bomb's flash)
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		objContext_a.fillStyle = rgb332ToCSS(m_intL2Pal0);
		objContext_a.fillRect(VIEW.x - intL, VIEW.y, intW, VIEW.h);
		if (m_blnLoaded)
		{
			if (m_blnL2Dirty)
			{
				m_objL2Context.putImageData(m_objL2Data, 0, 0);
				m_blnL2Dirty = false;
			}
			// the copper: the scanner still, the sky (the stars) slow, the ground at full speed
			paintBand(objContext_a, 0, 44, 0, intL, intW);
			paintBand(objContext_a, 44, 116, m_intScrollStars, intL, intW);
			paintBand(objContext_a, 160, 32, m_intScrollGround, intL, intW);
			if (m_blnBig)
			{
				m_objSprites.paintBigText(objContext_a, 'defender_ink', 'DEFENDER', 32 + 24, 32 + 6, 3, rgb332ToCSS(0xFC), rgb332ToCSS(0xE0), rgb332ToCSS(0), 2);
			}
			// the words over Layer 2, the sprites over them
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite from SprData's patterns (frame n is pattern n - 1), what it does on its own
	// (sequence, delay) and the part of it that counts in a collision (hbw x hbh about its middle)
	function sprite(strName_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a)
	{
		return { name:strName_a, classes:'defender', imagename:'defender_s0', x:0, y:0, w:16, h:16, imagex:0, imagey:0, imagew:16, imageh:16,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	function setup()
	{
		var intV, intB2, intK;
		for (intV = 0; intV < 256; intV++)
		{
			intB2 = intV & 3;
			m_arrR.push(Math.floor(((intV >> 5) & 7) * 255 / 7));
			m_arrG.push(Math.floor(((intV >> 2) & 7) * 255 / 7));
			m_arrB.push(Math.floor((((intB2 << 1) | ((intB2 !== 0) ? 1 : 0)) * 255) / 7));
		}
		m_objL2 = document.createElement('canvas');
		m_objL2.width = L2W; m_objL2.height = 192;
		m_objL2Context = m_objL2.getContext('2d');
		m_objL2Data = m_objL2Context.createImageData(L2W, 192);
		for (intK = 0; intK < MAX_LASERS; intK++)
		{
			m_arrLX.push(0); m_arrLY.push(0); m_arrLVX.push(0); m_arrLLife.push(0);
		}
		for (intK = 0; intK < MAX_HUMANS; intK++)
		{
			m_arrHX.push(0); m_arrHY.push(0); m_arrHState.push(H_DEAD); m_arrHCarrier.push(-1); m_arrHDir.push(1); m_arrHFall.push(0); m_arrHVY.push(0);
			m_arrOldHRX.push(0); m_arrOldHRY.push(0);
		}
		for (intK = 0; intK < MAX_ENEMIES; intK++)
		{
			m_arrEX.push(0); m_arrEY.push(0); m_arrEVX.push(0); m_arrEVY.push(0); m_arrEState.push(ST_DEAD); m_arrETarget.push(-1);
			m_arrOldERX.push(0); m_arrOldERY.push(0);
		}
		for (intK = 0; intK < MAX_BOOMS; intK++)
		{
			m_arrBOn.push(false); m_arrBX.push(0); m_arrBY.push(0);
		}
		for (intK = 0; intK < L2W; intK++)
		{
			m_arrYCol.push(-1);
		}
		for (intK = 0; intK < 256; intK++)
		{
			m_arrYSky.push(-1);
		}
		makeLand();
		heights();
	}

	this.run = function()
	{
		var arrImages = [], intK;
		setup();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			// the ship: an enemy within 11 across and 9 up or down of its middle runs into it, a shot
			// within 7 and 6, a falling humanoid within 12 and 12 is caught
			sprite('ship', [1, 6, -1], 2, 8, 8),
			sprite('shipboom', [11, 12, 13, 14, -1], 4, 0, 0),
			// a laser hits an enemy within 14 across and 9 up or down
			sprite('laser', [5, 0], 1, 14, 8),
			sprite('lander', [2, 7, -1], 8, 14, 10),
			sprite('mutant', [3, 8, -1], 8, 14, 10),
			sprite('baiter', [15, 16, -1], 4, 14, 10),
			sprite('human', [4, 9, -1], 12, 16, 16),
			sprite('shot', [10, 0], 1, 6, 4),
			sprite('boom', BOOMSEQ, 1, 0, 0) ]);
		// the words' palette rows (Board.Pal 2-7; 0 and 1 the tiles' own)
		for (intK = 0; intK <= 7; intK++)
		{
			arrImages.push((intK >= 2) ? 'defender_t' + intK : 'defender_t0');
		}
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrImages, first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE, fire2:K_B } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('defender'), function()
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

var g_objGame = new defenderGame();
g_objGame.run();
