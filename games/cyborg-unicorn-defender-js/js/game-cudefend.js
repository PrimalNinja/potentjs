// CYBORG UNICORN DEFENDER - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The drones have come for the foals of Rainbow Valley, eight screens of it, end to end (fly off
// one end and you come back on at the other). Snatchers come down for the foals and take them up:
// get one to the top and it turns into a glitch. Shoot a snatcher that's carrying a foal, catch
// the foal as it falls and put it down again. Droppers lay mines, hives burst into bits, and take
// too long and the hunters come for you. Lose every foal and every snatcher turns glitch.
// You are the Cyborg Unicorn: your horn fires rainbow bolts.
//
// Keys: Q A O P fly (or S X Z C, or 5 6 7 8, or the arrows). Space (or M): shoot. B (or Enter):
//       rainbow blast - everything on the screen. H: hyperspace (you might not come out of it in
//       one piece). A game pad: the stick flies, A shoots, B is the rainbow blast.
// Touch (nothing drawn: invisible zones over the picture): the left half flies (its left, right,
//       top and bottom edges; the corners go both ways), the right half shoots below the scanner,
//       and its top strip (the HUD and the scanner) is the rainbow blast (left) and hyperspace
//       (right). Fly and shoot together with two thumbs. A touch anywhere starts.
//
// The screen is the Next's: the valley is one 256 x 192 picture that scrolls round (made from the
// Next's own Layer 2 runs, 16 times over for the rainbow blast's palette flash); the HUD, the
// scanner and its dots and the words are the tile screen (JTileGrid); you, the drones, the foals,
// the beams, the explosions, the scanner's window and every bullet, mine and bolt are numbered
// sprites, numbered as on the Next. The bullets and bolts move themselves (their movers: Bul.cls's)
// and the sprites' hit boxes say what a bolt hits and what drone you run into. The game runs 50
// iterations a second - the Next's frames.
//
// The canvas is the paper's width and the HUD band above it down to the paper's bottom (the
// HUD's purple runs on into the Next's border at both sides: that part is left off).
//
// The Next version's bug fixed here, because it broke play:
// - Lose your last unicorn while a cleared wave's bonus is showing (a hunter or a bullet still
//   about) and the next wave started anyway, with you flying again on no lives; the next loss
//   took lives to -1 and the game could never end. Here that's GAME OVER.
//
// The Next version's bugs, kept as they are (they don't stop the game being played):
// - In hyperspace you're gone from the screen but a bullet where you were still gets you (the
//   bullet check doesn't look at hyperspace; running into a drone does).
// - The hyperspace twinkle is drawn twice the size from your top left, so it sits 8 pixels right
//   of and below you.
function cudefendGame()
{
	var m_objThis = this;
	var G = GFX_CUDEFEND;

	// the part of the Next's 320 x 256 screen the game draws in: the paper's width, from the HUD
	// band at the top to the paper's bottom: the canvas is this and nothing more
	var VIEW = { x:32, y:0, w:256, h:224 };

	// keys (keyCodes)
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_S = 83, K_X = 88, K_Z = 90, K_C = 67;
	var K_5 = 53, K_6 = 54, K_7 = 55, K_8 = 56, K_SPACE = 32, K_M = 77, K_B = 66, K_H = 72, K_ENTER = 13;

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left
	// half flies (a strip along each of its edges; the corners press two ways), the right half
	// shoots, its top strip (the HUD and the scanner) is the rainbow blast (left) and hyperspace
	// (right). The title and game over: anywhere is Space
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:43, h:VIEW.h, key:K_O },
		{ type:'zone', x:VIEW.x + 85, y:VIEW.y, w:43, h:VIEW.h, key:K_P },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:128, h:80, key:K_Q },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 80, w:128, h:80, key:K_A },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y + 64, w:128, h:VIEW.h - 64, key:K_SPACE },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y, w:64, h:64, key:K_B },
		{ type:'zone', x:VIEW.x + 192, y:VIEW.y, w:64, h:64, key:K_H } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:K_SPACE } ];

	var WORLD = 2048, HALF = 1024;		// the valley: 8 screens, end to end
	var NU = 20, NP = 10, NB = 8, NBUL = 52, NSHOT = 22;
	// sprite slots (as the Next's; the bullets 54-105, the bolts 106-127)
	var SP_UNI = 0, SP_UFO = 2, SP_PEOPLE = 22, SP_BOOM = 32, SP_BEAM = 40, SP_WIN = 44, SP_HYPER = 45, SP_BUL = 54, SP_SHOT = 106;
	// drone kinds
	var K_LANDER = 1, K_MUTANT = 2, K_BOMBER = 3, K_POD = 4, K_SWARM = 5, K_BAITER = 6;
	// where you can fly (paper rows; the scanner is above)
	var YTOP = 44, YLOW = 168, GROUND = 176;
	// bullet colours (sprite palette rows); a glitch's colours
	var PINK = 2, BLUE = 3, GLITCH = 4;

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
	// an explosion: four frames, 15 frames in all (as the Next's count down), then it stops
	var BOOMSEQ = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 0];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objPad, m_objGrid;
	var m_arrScene = [];				// the valley, 16 times: palette offsets 0-15 (the blast's flash)
	// full screen (JCanvas's screenmode): how much more of the valley shows left and right of the
	// Next's 256 (0 in the normal mode); the picture goes round, so it's just drawn more times
	var m_intWL = 0, m_intWR = 0, m_objView = { x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h };
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the drones: kind, x (world pixels), y, x speed (8ths), y speed, a timer, who they've got (-1
	// none), when they fire next, x's 8ths
	var m_arrUK = [], m_arrUX = [], m_arrUY = [], m_arrUVX = [], m_arrUVY = [], m_arrUT = [], m_arrUG = [], m_arrUF = [], m_arrUFr = [];
	// the foals: 0 gone, 1 walking, 2 carried up, 3 falling, 4 hanging from you; x, y, way, fall speed
	var m_arrPS = [], m_arrPX = [], m_arrPY = [], m_arrPD = [], m_arrPV = [];
	// explosions: where on the valley (their sprites play through once by themselves)
	var m_arrBX = [], m_arrBY = [], m_intBNext = 0;
	// the bolts' targets (the drones): on the screen to be hit, hits not read yet
	var m_arrBoxOn = [], m_arrHits = [];
	var m_blnSparked = false;
	// you: x (8ths of a world pixel), y, speed (8ths a frame), facing
	var m_intHX = 0, m_intHY = 0, m_intHVX = 0, m_intFace = 1, m_blnAlive = false, m_intInv = 0, m_intDeadT = 0, m_intCool = 0;
	var m_intSmart = 3, m_intSmartT = 0, m_blnSmartWas = false, m_blnHyperWas = false, m_intHyperT = 0, m_intCarry = -1;
	var m_intCamX = 0, m_intPan = 0, m_intFlash = 0;
	var m_intScore = 0, m_intHiscore = 20000, m_intLives = 3, m_intWave = 1, m_intNextLife = 10000;
	var m_intFrames = 0, m_intMsgT = 0, m_blnScoreDirty = false, m_intWaveT = 0, m_intToCome = 0, m_blnPeopleLost = false, m_intClearT = 0;

	var m_strState = 'loading', m_intStep = 0;

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
		return (int_a > 0) ? 1 : ((int_a < 0) ? -1 : 0);
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function fireDown()
	{
		return down(K_SPACE) || down(K_M);
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

	// sprite n: a library sprite in palette row intRow_a (frame undefined: its animation's)
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intRow_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, 'cudefend_s' + intRow_a, intScale_a, intFlags_a);
	}

	// ---------------------------------------------------------------- the world joins up end to end
	// where world x is on the screen (its paper x: -1024 .. 1023)
	function sx(intX_a)
	{
		return ((intX_a - m_intCamX + WORLD + HALF) & (WORLD - 1)) - HALF;
	}

	// from a to b the short way round (-1024 .. 1023)
	function dif(intA_a, intB_a)
	{
		return ((intB_a - intA_a + WORLD + HALF) & (WORLD - 1)) - HALF;
	}

	function wrap(intX_a)
	{
		return (intX_a + WORLD) & (WORLD - 1);
	}

	// you, in world pixels
	function youX()
	{
		return m_intHX >> 3;
	}

	function setup()
	{
		var intK;
		for (intK = 0; intK < 256; intK++)
		{
			if (SINES[intK] > 127) { SINES[intK] -= 256; }
		}
		for (intK = 0; intK < NU; intK++)
		{
			m_arrUK.push(0); m_arrUX.push(0); m_arrUY.push(0); m_arrUVX.push(0); m_arrUVY.push(0); m_arrUT.push(0); m_arrUG.push(-1); m_arrUF.push(0); m_arrUFr.push(0);
			m_arrBoxOn.push(false); m_arrHits.push(0);
		}
		for (intK = 0; intK < NP; intK++)
		{
			m_arrPS.push(0); m_arrPX.push(0); m_arrPY.push(0); m_arrPD.push(1); m_arrPV.push(0);
		}
		for (intK = 0; intK < NB; intK++)
		{
			m_arrBX.push(0); m_arrBY.push(0);
		}
	}

	// the valley from the Next's runs (count, colour), in the Layer 2 default colours, once for
	// each palette offset (the blast's flash adds 16 x the offset to every pixel's colour number)
	function buildScenes()
	{
		var arrPix = [], arrR = [], arrG = [], arrB = [];
		var intK = 0, intN, intV, intO, intP, intB2;
		var objCanvas, objContext, objData;
		while ((arrPix.length < 256 * 192) && (intK + 1 < CUDEFEND_SCENE.length))
		{
			intN = (CUDEFEND_SCENE[intK] === 0) ? 256 : CUDEFEND_SCENE[intK];
			for (intV = 0; intV < intN; intV++)
			{
				arrPix.push(CUDEFEND_SCENE[intK + 1]);
			}
			intK += 2;
		}
		for (intV = 0; intV < 256; intV++)
		{
			intB2 = intV & 3;
			arrR.push(Math.floor(((intV >> 5) & 7) * 255 / 7));
			arrG.push(Math.floor(((intV >> 2) & 7) * 255 / 7));
			arrB.push(Math.floor((((intB2 << 1) | ((intB2 !== 0) ? 1 : 0)) * 255) / 7));
		}
		for (intO = 0; intO < 16; intO++)
		{
			objCanvas = document.createElement('canvas');
			objCanvas.width = 256; objCanvas.height = 192;
			objContext = objCanvas.getContext('2d');
			objData = objContext.createImageData(256, 192);
			for (intP = 0; intP < 256 * 192; intP++)
			{
				intV = ((arrPix[intP] || 0) + intO * 16) & 255;
				objData.data[intP * 4] = arrR[intV];
				objData.data[intP * 4 + 1] = arrG[intV];
				objData.data[intP * 4 + 2] = arrB[intV];
				objData.data[intP * 4 + 3] = 255;
			}
			objContext.putImageData(objData, 0, 0);
			m_arrScene.push(objCanvas);
		}
	}

	// ====================================================================================================
	// THE BULLETS AND BOLTS (the Next's Bul.cls): sprites 54-127, each moving itself

	// an enemy bullet's mover: where it is kept to 1/256ths of a pixel, flying on with the ground
	// when it's off the screen (shown then off the clip window, so unseen); it goes when it leaves
	// the play area's top or bottom, or gets more than two screens away
	function bulletMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = intX_a * 256 + 128, intY = intY_a * 256 + 128;
		return function(intN_a, objO_a)
		{
			var intHX, intHY;
			intX += intVX_a - m_intPan * 256;
			intY += intVY_a;
			intHX = intX >> 8;
			intHY = intY >> 8;
			if ((intHX >= 4 - m_intWL) && (intHX < 252 + m_intWR))
			{
				objO_a.x = intHX + 24; objO_a.y = intHY + 24;
			}
			else
			{
				objO_a.x = -64; objO_a.y = intHY + 24;
			}
			return (intHX < -512) || (intHX >= 768) || (intHY < 36) || (intHY >= 188);
		};
	}

	// a bolt's mover: vx across and vy down a frame (and the ground's pan); it goes when it leaves
	// the paper's sides (on a wide screen, the sides of what's shown), or the play area's top or bottom
	function shotMover(intN_a, objO_a)
	{
		var intX = objO_a.x - 24 + objO_a.vx - m_intPan, intY = objO_a.y - 24 + objO_a.vy;
		objO_a.x = intX + 24; objO_a.y = intY + 24;
		return (intX < 4 - m_intWL) || (intX >= 252 + m_intWR) || (intY < 36) || (intY >= 188);
	}

	// everything gone: bullets, bolts, targets
	function bulReset()
	{
		m_objSlots.hideRange(SP_BUL, NBUL + NSHOT);
		for (var intK = 0; intK < NU; intK++)
		{
			m_arrBoxOn[intK] = false; m_arrHits[intK] = 0;
		}
	}

	// every enemy bullet gone (a blast, you lost)
	function bulClear()
	{
		m_objSlots.hideRange(SP_BUL, NBUL);
	}

	// an enemy bullet from x, y going way a (0-255: 0 down, 64 right, 128 up, 192 left) at spd
	// sixteenths of a pixel a frame: library sprite strName_a, frame intFrame_a, palette row intPal_a
	function bulFire(intX_a, intY_a, intA_a, intSpd_a, strName_a, intFrame_a, intPal_a)
	{
		var intN = -1, intK, intS, intVX, intVY;
		for (intK = SP_BUL; (intK < SP_BUL + NBUL) && (intN < 0); intK++)
		{
			if (!m_objSlots.isVisible(intK)) { intN = intK; }
		}
		if (intN >= 0)
		{
			intS = SINES[intA_a & 255];
			intVX = (Math.abs(intS) * intSpd_a) >> 3;
			if (intS < 0) { intVX = -intVX; }
			intS = SINES[(intA_a + 64) & 255];
			intVY = (Math.abs(intS) * intSpd_a) >> 3;
			if (intS < 0) { intVY = -intVY; }
			spr(intN, -64, intY_a + 24, strName_a, intFrame_a, intPal_a);
			m_objSlots.setMover(intN, bulletMover(intX_a, intY_a, intVX, intVY));
		}
	}

	// a bolt from x, y flying vx across and vy down a frame (mirrored when it flies left)
	function bulShot(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intN = -1, intK;
		for (intK = SP_SHOT; (intK < SP_SHOT + NSHOT) && (intN < 0); intK++)
		{
			if (!m_objSlots.isVisible(intK)) { intN = intK; }
		}
		if (intN >= 0)
		{
			spr(intN, intX_a + 24, intY_a + 24, 'shot', 1, 0, 1, (intVX_a < 0) ? SPRITE_MIRRORX : 0);
			m_objSlots.setMover(intN, shotMover, intVX_a, intVY_a);
		}
	}

	// after the movers: each bolt against the drones on the screen (their sprites' hit boxes); a bolt
	// that hits one counts a hit on it and goes
	function shotHits()
	{
		var intS, intN, intT, blnHit;
		m_blnSparked = false;
		for (intS = 0; intS < NSHOT; intS++)
		{
			intN = SP_SHOT + intS;
			if (m_objSlots.isVisible(intN))
			{
				blnHit = false;
				for (intT = 0; (intT < NU) && !blnHit; intT++)
				{
					if (m_arrBoxOn[intT] && m_objSlots.collide(intN, SP_UFO + intT))
					{
						blnHit = true;
						m_arrHits[intT] = Math.min(255, m_arrHits[intT] + 1);
					}
				}
				if (blnHit)
				{
					m_blnSparked = true;
					m_objSlots.hide(intN);
				}
			}
		}
	}

	// the hits on drone n since the last time it was asked
	function bulHits(intT_a)
	{
		var intResult = m_arrHits[intT_a];
		m_arrHits[intT_a] = 0;
		return intResult;
	}

	// is a bullet on you (within 3 pixels of your middle)? You may be hidden (hyperspace), so it's
	// your spot that counts, not your sprite
	function bulHit()
	{
		var intX = sx(youX()) + 32, intY = m_intHY + 32;
		return bulletsIn(intX - 4, intY - 4, 8, 8) > 0;
	}

	function bulletsIn(intX_a, intY_a, intW_a, intH_a)
	{
		var intN = 0, intK;
		for (intK = SP_BUL; intK < SP_BUL + NBUL; intK++)
		{
			if (m_objSlots.collideRect(intK, intX_a, intY_a, intW_a, intH_a)) { intN++; }
		}
		return intN;
	}

	// the way (0-255, as bulFire's) from x, y to tx, ty
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
	// THE PANEL AND THE SCANNER

	function hud()
	{
		m_objGrid.clear(0);
		m_objGrid.rect(0, 0, 40, 4, G.T_HUD, 0);
		m_objGrid.rect(4, 4, 32, 1, G.T_SCANT, 0);
		m_objGrid.rect(4, 5, 32, 2, G.T_SCAN, 0);
		m_objGrid.rect(4, 7, 32, 1, G.T_SCANG, 0);
		text(4, 1, 'SCORE');
		text(20, 1, 'HI ' + seven(m_intHiscore));
		text(32, 1, 'W' + rightStr('0' + String(m_intWave), 2));
		showScore();
		showLives();
	}

	function showScore()
	{
		text(10, 1, seven(m_intScore));
		m_blnScoreDirty = false;
	}

	function showLives()
	{
		for (var intK = 0; intK <= 5; intK++)
		{
			m_objGrid.put(4 + intK, 2, (intK < m_intLives) ? G.T_LIFE : G.T_HUD, 0);
			m_objGrid.put(12 + intK, 2, (intK < m_intSmart) ? G.T_SMART : G.T_HUD, 0);
		}
	}

	function addScore(intN_a)
	{
		m_intScore += intN_a;
		m_blnScoreDirty = true;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 10000;
			m_intLives++; m_intSmart++;
			showLives();
			sfx(1, 60, -1, 14, 30, 0);
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
		m_objGrid.rect(4, 9, 32, 18, 0, 0);
	}

	// the scanner: the whole valley in 256 pixels (8 to 1), with you in the middle; every 4th frame
	function scanner()
	{
		var intN, intBase;
		if ((m_intFrames & 3) === 1)
		{
			m_objGrid.rect(4, 5, 32, 2, G.T_SCAN, 0);
			m_objGrid.rect(4, 7, 32, 1, G.T_SCANG, 0);
			intBase = wrap(youX() - HALF);
			for (intN = 0; intN < NP; intN++)
			{
				if (m_arrPS[intN] !== 0) { dot(intBase, m_arrPX[intN], m_arrPY[intN], 1); }
			}
			for (intN = 0; intN < NU; intN++)
			{
				if (m_arrUK[intN] !== 0) { dot(intBase, m_arrUX[intN], m_arrUY[intN], 0); }
			}
			if (m_blnAlive) { dot(intBase, youX(), m_intHY, 2); }
			// the part on the screen
			spr(SP_WIN, (((m_intCamX - intBase) & (WORLD - 1)) >> 3) + 32, 44, 'window', 1, 0);
		}
	}

	// a dot: its tile has it in one of 4 places across and 3 down (c: 0 drone, 1 foal, 2 you)
	function dot(intBase_a, intX_a, intY_a, intC_a)
	{
		var intR = (intX_a - intBase_a) & (WORLD - 1);
		var intV = Math.max(0, Math.min(8, idiv((intY_a - 40) * 9, 141)));
		m_objGrid.put(4 + (intR >> 6), 5 + idiv(intV, 3), G.T_DOT + intC_a * 12 + (intV % 3) * 4 + ((intR & 63) >> 4), 0);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		m_objSlots.hideRange(0, 54);
		bulReset();
		m_intFlash = 0;
		m_intWave = 1; m_intLives = 3; m_intScore = 0; m_intSmart = 3;
		hud();
		message('C Y B O R G   U N I C O R N', 8, 0);
		message('D E F E N D E R', 10, 0);
		message('SAVE THE FOALS FROM THE DRONES', 12, 0);
		message('QAOP / SXZC / 5678  FLY', 15, 0);
		message('SPACE SHOOT  B RAINBOW BLAST', 16, 0);
		message('H HYPERSPACE', 17, 0);
		message('CATCH THE FOALS THEY DROP!', 19, 0);
		message('(C) 2026 CYBORG UNICORN', 26, 0);
		// a snatcher comes for a foal; you, flying by
		m_intCamX = 0; m_intStep = 0; m_intFace = 1; m_intHY = 144;
		spr(SP_UNI, 40 + 24 - 8, m_intHY + 24, 'uni', undefined, 0);
		m_objSlots.animate(SP_UNI, 1);
		spr(SP_UFO, 200 + 24, 30 + 24, 'lander', undefined, 0);
		m_objSlots.animate(SP_UFO, 1);
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'title';
	}

	function titleStep()
	{
		m_intCamX = wrap(m_intCamX + 1);
		m_objSlots.move(SP_UFO, 200 + 24, 30 + (idiv(m_intFrames, 4) % 8) + 24);
		m_intFrames++;
		m_intStep++;
		if (m_intStep === 30) { message('PRESS SPACE', 23, 0); }
		if (m_intStep === 60) { m_objGrid.rect(4, 23, 32, 1, 0, 0); m_intStep = 0; }
		if (fireDown()) { m_strState = 'titlerelease'; }
	}

	// a game: wave after wave until the last unicorn is lost
	function gameStart()
	{
		var intK;
		clearMessages();
		m_objSlots.hideRange(0, 54);
		sfx(0, 200, -6, 15, 25, 0);
		m_intScore = 0; m_intLives = 3; m_intWave = 1; m_intSmart = 3; m_intNextLife = 10000;
		for (intK = 0; intK < NP; intK++)
		{
			m_arrPS[intK] = 1;
		}
		waveStart();
	}

	function gameOver()
	{
		m_intFlash = 0;
		if (m_intScore > m_intHiscore) { m_intHiscore = m_intScore; }
		message('GAME OVER', 14, 0);
		m_objPad.setControls(ZONES_MENU);
		m_intStep = 0;
		m_strState = 'over';
	}

	// everything stays where it was while GAME OVER shows
	function overStep()
	{
		m_intStep++;
		if ((m_intStep >= 250) || ((m_intStep > 50) && fireDown()))
		{
			clearMessages();
			titleStart();
		}
	}

	// ====================================================================================================
	// A WAVE

	// the foals back (every fifth wave, or at the start): spread along the ground
	function people()
	{
		for (var intK = 0; intK < NP; intK++)
		{
			m_arrPS[intK] = 1; m_arrPX[intK] = intK * idiv(WORLD, NP) + rnd(100); m_arrPY[intK] = GROUND - 8; m_arrPD[intK] = 1 - 2 * rnd(2); m_arrPV[intK] = 0;
		}
	}

	function peopleLeft()
	{
		var intN = 0;
		for (var intK = 0; intK < NP; intK++)
		{
			if (m_arrPS[intK] !== 0) { intN++; }
		}
		return intN;
	}

	function waveStart()
	{
		var intK;
		m_objSlots.hideRange(0, 54);
		bulReset();
		for (intK = 0; intK < NU; intK++)
		{
			m_arrUK[intK] = 0;
		}
		if ((m_intWave === 1) || (m_intWave % 5 === 0))
		{
			people();
		}
		else
		{
			// the survivors back on the ground
			for (intK = 0; intK < NP; intK++)
			{
				if (m_arrPS[intK] !== 0) { m_arrPS[intK] = 1; m_arrPY[intK] = GROUND - 8; }
			}
		}
		m_blnPeopleLost = (peopleLeft() === 0);
		// the drones: snatchers come in groups of five; droppers and hives from the start
		m_intToCome = Math.min(25, 10 + m_intWave * 2);
		for (intK = 1; intK <= 5 + m_intWave; intK++)
		{
			if (intK <= 10) { newUFO(K_LANDER); }
		}
		if (m_intWave >= 2)
		{
			for (intK = 1; intK <= 1 + idiv(m_intWave, 2); intK++)
			{
				if (intK <= 4) { newUFO(K_BOMBER); }
			}
		}
		if (m_intWave >= 3)
		{
			for (intK = 1; intK <= idiv(m_intWave, 2); intK++)
			{
				if (intK <= 3) { newUFO(K_POD); }
			}
		}
		m_intHX = 200 * 8; m_intHY = 100; m_intHVX = 0; m_intFace = 1; m_blnAlive = true; m_intInv = 100; m_intDeadT = 0; m_intCool = 0; m_intSmartT = 0; m_intCarry = -1;
		m_blnSmartWas = true; m_blnHyperWas = true; m_intHyperT = 0;
		m_intCamX = 112; m_intPan = 0; m_intWaveT = 0; m_intClearT = 0; m_intFlash = 0;
		hud();
		message('WAVE ' + String(m_intWave), 13, 100);
		if (m_blnPeopleLost) { message('THE VALLEY IS LOST: GLITCHES!', 15, 100); } else { message('SAVE THE FOALS!', 15, 100); }
		m_objPad.setControls(ZONES_PLAY);
		m_strState = 'wave';
	}

	function waveStep()
	{
		var intT, intB, intK;
		m_intWaveT++;
		// more snatchers, five at a time
		if ((m_intToCome > 0) && (((m_intWaveT % 600) === 0) || ((attackers() < 4) && ((m_intWaveT % 50) === 0))))
		{
			for (intK = 1; intK <= 5; intK++)
			{
				if (m_intToCome > 0) { newUFO(K_LANDER); }
			}
		}
		// too slow: a hunter
		if ((m_intWaveT > 2500) && ((m_intWaveT % 500) === 0)) { newUFO(K_BAITER); }
		you();
		camera();
		drawUnicorn();
		ufos();
		folk();
		booms();
		smartUpdate();
		// the bullets and bolts move themselves (and every animation a step on)
		m_objSlots.step();
		shotHits();
		if (m_blnAlive && (m_intInv === 0) && (m_intSmartT === 0))
		{
			if (bulHit()) { die(); }
		}
		if (m_blnSparked) { sfx(1, 8, 2, 9, 3, 1); }
		scanner();
		if (m_blnScoreDirty && ((m_intFrames & 3) === 0)) { showScore(); }
		if (m_intMsgT > 0)
		{
			m_intMsgT--;
			if (m_intMsgT === 0) { clearMessages(); }
		}
		m_intFrames++;
		if ((!m_blnAlive) && (m_intDeadT === 0) && (m_intLives === 0))
		{
			gameOver();
		}
		else if ((m_intToCome === 0) && (attackers() === 0))
		{
			// all the attackers down (hunters don't count)
			m_intClearT++;
			if (m_intClearT === 30)
			{
				intT = peopleLeft();
				intB = m_intWave * 100 * intT;
				addScore(intB);
				message('WAVE ' + String(m_intWave) + ' CLEARED', 12, 0);
				message(String(intT) + ' FOALS SAVED: BONUS ' + String(intB), 14, 0);
				sfx(0, 100, -2, 15, 50, 0);
			}
			if (m_intClearT > 170)
			{
				clearMessages();
				if ((!m_blnAlive) && (m_intLives === 0))
				{
					// the last unicorn went down while the wave was being cleared: that's the end
					// (the Next carried on into the next wave with no lives left)
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

	function attackers()
	{
		var intC = 0;
		for (var intN = 0; intN < NU; intN++)
		{
			if ((m_arrUK[intN] > 0) && (m_arrUK[intN] !== K_BAITER)) { intC++; }
		}
		return intC;
	}

	// ====================================================================================================
	// YOU

	function you()
	{
		var intMX = 0, intMY = 0, intV, blnB, intX;
		if (!m_blnAlive)
		{
			if (m_intDeadT > 0)
			{
				m_intDeadT--;
				if ((m_intDeadT === 0) && (m_intLives > 0))
				{
					m_blnAlive = true; m_intInv = 150; m_intHY = 100; m_intHVX = 0; m_intSmart = 3; showLives();
				}
			}
		}
		else if (m_intHyperT > 0)
		{
			// hyperspace: gone for a moment, then somewhere else (and maybe in pieces)
			m_intHyperT--;
			if (m_intHyperT === 0)
			{
				m_intHX = rnd(WORLD) * 8; m_intHY = YTOP + rnd(YLOW - YTOP); m_intHVX = 0;
				m_intCamX = wrap(youX() - 128); m_intPan = 0;
				m_objSlots.hide(SP_HYPER);
				if (rnd(4) === 0) { die(); }
			}
		}
		else
		{
			if (down(K_O) || down(K_Z) || down(K_5) || down(KEY_LEFT)) { intMX = -1; }
			if (down(K_P) || down(K_C) || down(K_8) || down(KEY_RIGHT)) { intMX = 1; }
			if (down(K_Q) || down(K_S) || down(K_7) || down(KEY_UP)) { intMY = -1; }
			if (down(K_A) || down(K_X) || down(K_6) || down(KEY_DOWN)) { intMY = 1; }
			if (intMX !== 0)
			{
				m_intFace = intMX;
				m_intHVX = Math.max(-40, Math.min(40, m_intHVX + intMX * 3));
			}
			else
			{
				if (m_intHVX > 0) { m_intHVX--; }
				if (m_intHVX < 0) { m_intHVX++; }
			}
			m_intHX = (m_intHX + m_intHVX + WORLD * 8) & (WORLD * 8 - 1);
			m_intHY = Math.max(YTOP, Math.min(YLOW, m_intHY + intMY * 2));
			// the horn
			if (m_intCool > 0) { m_intCool--; }
			if (fireDown() && (m_intCool === 0))
			{
				intV = m_intFace * 14 + idiv(m_intHVX, 8);
				bulShot(sx(youX()) + m_intFace * 14, m_intHY + 3, intV, 0);
				m_intCool = 4;
				sfx(0, 30, 4, 10, 4, 0);
			}
			// a rainbow blast
			blnB = down(K_B) || down(K_ENTER);
			if (blnB && (!m_blnSmartWas) && (m_intSmart > 0) && (m_intSmartT === 0))
			{
				m_intSmart--; showLives();
				m_intSmartT = 40;
				smartBomb();
				sfx(2, 31, 0, 15, 60, 1);
			}
			m_blnSmartWas = blnB;
			// hyperspace
			blnB = down(K_H);
			if (blnB && !m_blnHyperWas)
			{
				m_intHyperT = 30;
				intX = sx(youX());
				spr(SP_HYPER, intX + 24, m_intHY + 24, 'stars', 1, 0, 2);
				dropCarry();
				sfx(1, 20, 6, 14, 30, 0);
			}
			m_blnHyperWas = blnB;
			if (m_intInv > 0) { m_intInv--; }
			// a foal hanging on: put them down near the ground
			if (m_intCarry >= 0)
			{
				m_arrPX[m_intCarry] = youX(); m_arrPY[m_intCarry] = m_intHY + 14;
				if (m_intHY >= YLOW - 4)
				{
					m_arrPS[m_intCarry] = 1; m_arrPY[m_intCarry] = GROUND - 8;
					addScore(500);
					message('SAFE! 500', 20, 50);
					sfx(1, 80, -3, 14, 20, 0);
					m_intCarry = -1;
				}
			}
		}
	}

	// the foal you're carrying falls
	function dropCarry()
	{
		if (m_intCarry >= 0)
		{
			m_arrPS[m_intCarry] = 3; m_arrPV[m_intCarry] = 0; m_intCarry = -1;
		}
	}

	// the view: you a third of the way in from the side you're leaving
	function camera()
	{
		var intWant, intWas = m_intCamX, intD;
		intWant = wrap(youX() - ((m_intFace > 0) ? 88 : 168));
		intD = Math.max(-7, Math.min(7, dif(m_intCamX, intWant)));
		m_intCamX = wrap(m_intCamX + intD);
		m_intPan = dif(intWas, m_intCamX);
	}

	// your sprite: 32 x 16, legs and mane going by themselves, mirrored to fly left; it blinks while
	// you can't be hit (put before the drones move, so running into one is where you are now)
	function drawUnicorn()
	{
		if ((!m_blnAlive) || (m_intHyperT > 0) || ((m_intInv & 4) !== 0))
		{
			m_objSlots.hide(SP_UNI);
		}
		else
		{
			spr(SP_UNI, sx(youX()) + 24 - 8, m_intHY + 24, 'uni', undefined, 0, 1, (m_intFace < 0) ? SPRITE_MIRRORX : 0);
			m_objSlots.animate(SP_UNI, 1);
		}
	}

	function die()
	{
		m_blnAlive = false; m_intDeadT = 100; m_intLives--; showLives();
		boom(youX(), m_intHY);
		boom(youX() - 10, m_intHY - 6);
		boom(youX() + 10, m_intHY + 6);
		bulClear();
		dropCarry();
		m_objSlots.hide(SP_UNI);
		sfx(2, 31, 0, 15, 70, 1);
		sfx(1, 300, 10, 15, 50, 0);
	}

	// every drone on the screen goes, and every bullet
	function smartBomb()
	{
		var intN, intX;
		for (intN = 0; intN < NU; intN++)
		{
			if (m_arrUK[intN] !== 0)
			{
				intX = sx(m_arrUX[intN]);
				if ((intX > -8) && (intX < 264)) { killUFO(intN); }
			}
		}
		bulClear();
	}

	// the blast's flash: the valley's palette offset
	function smartUpdate()
	{
		if (m_intSmartT > 0)
		{
			m_intSmartT--;
			m_intFlash = (m_intSmartT === 0) ? 0 : (idiv(m_intSmartT, 3) & 15);
		}
	}

	// ====================================================================================================
	// THE DRONES

	function newUFO(intKind_a)
	{
		var intN, intM = -1, intKind = intKind_a;
		for (intN = 0; intN < NU; intN++)
		{
			if ((m_arrUK[intN] === 0) && (intM < 0)) { intM = intN; }
		}
		if (intM >= 0)
		{
			if ((intKind === K_LANDER) && m_blnPeopleLost) { intKind = K_MUTANT; }
			m_arrUK[intM] = intKind; m_arrUG[intM] = -1; m_arrUT[intM] = rnd(100); m_arrUFr[intM] = 0;
			m_arrUF[intM] = 60 + rnd(120);
			// somewhere off the screen
			m_arrUX[intM] = wrap(m_intCamX + 300 + rnd(WORLD - 600));
			m_arrUY[intM] = 50 + rnd(70);
			m_arrUVX[intM] = 4 + rnd(6);
			if (rnd(2) === 1) { m_arrUVX[intM] = -m_arrUVX[intM]; }
			m_arrUVY[intM] = 0;
			if (intKind === K_LANDER) { m_intToCome--; }
			if (intKind === K_BAITER) { m_arrUX[intM] = wrap(youX() + 200 * m_intFace); m_arrUY[intM] = m_intHY; }
			if (intKind === K_SWARM) { m_arrUVX[intM] = 0; }
		}
	}

	function killUFO(intN_a)
	{
		var intPts, intJ, intC;
		boom(m_arrUX[intN_a], m_arrUY[intN_a]);
		switch (m_arrUK[intN_a])
		{
			case K_LANDER: intPts = 150; break;
			case K_MUTANT: intPts = 150; break;
			case K_BOMBER: intPts = 250; break;
			case K_POD: intPts = 1000; break;
			case K_SWARM: intPts = 150; break;
			default: intPts = 200; break;
		}
		// a snatcher with a foal: they fall
		if (m_arrUG[intN_a] >= 0)
		{
			m_arrPS[m_arrUG[intN_a]] = 3; m_arrPV[m_arrUG[intN_a]] = 0;
			m_arrUG[intN_a] = -1;
		}
		// a hive: bits
		if (m_arrUK[intN_a] === K_POD)
		{
			intC = 3 + rnd(3);
			for (intJ = 1; intJ <= intC; intJ++)
			{
				swarmer(m_arrUX[intN_a], m_arrUY[intN_a]);
			}
		}
		m_arrUK[intN_a] = 0;
		m_arrBoxOn[intN_a] = false;
		m_objSlots.hide(SP_UFO + intN_a);
		m_objSlots.hide(SP_BEAM + (intN_a & 3));
		addScore(intPts);
		sfx(2, 20 + rnd(10), 4, 14, 18, 1);
	}

	function swarmer(intX_a, intY_a)
	{
		var intN, blnDone = false;
		for (intN = 0; (intN < NU) && !blnDone; intN++)
		{
			if (m_arrUK[intN] === 0)
			{
				m_arrUK[intN] = K_SWARM; m_arrUX[intN] = wrap(intX_a + rnd(16) - 8); m_arrUY[intN] = intY_a + rnd(16) - 8; m_arrUVX[intN] = 0; m_arrUVY[intN] = 0;
				m_arrUT[intN] = rnd(50); m_arrUG[intN] = -1; m_arrUF[intN] = 40 + rnd(60); m_arrUFr[intN] = 0;
				blnDone = true;
			}
		}
	}

	// a drone moves along at its speed in 8ths (the 8ths carried over)
	function drift(intN_a, intVX_a)
	{
		m_arrUFr[intN_a] += intVX_a;
		m_arrUX[intN_a] = wrap(m_arrUX[intN_a] + idiv(m_arrUFr[intN_a], 8));
		m_arrUFr[intN_a] = m_arrUFr[intN_a] % 8;
	}

	function ufos()
	{
		var intN, intX, intD, strName, intRow, intFlags, intJ, intBest, intBD;
		for (intN = 0; intN < NU; intN++)
		{
			if (m_arrUK[intN] !== 0)
			{
				m_arrUT[intN]++;
				// shot?
				if (bulHits(intN) > 0) { killUFO(intN); }
			}
			if (m_arrUK[intN] !== 0)
			{
				intD = dif(m_arrUX[intN], youX());			// you, from it
				intRow = 0; intFlags = 0; strName = 'lander';
				switch (m_arrUK[intN])
				{
					case K_LANDER:
						if (m_arrUG[intN] >= 0)
						{
							// going up with a foal
							m_arrUY[intN]--;
							intJ = m_arrUG[intN]; m_arrPX[intJ] = m_arrUX[intN]; m_arrPY[intJ] = m_arrUY[intN] + 14;
							spr(SP_BEAM + (intN & 3), sx(m_arrUX[intN]) + 24, m_arrUY[intN] + 24 + 8, 'beam', 1, 0);
							if (m_arrUY[intN] <= YTOP - 8)
							{
								// at the top: they're gone, and it's a glitch now
								m_arrPS[intJ] = 0; m_arrUG[intN] = -1; m_arrUK[intN] = K_MUTANT;
								m_objSlots.hide(SP_BEAM + (intN & 3));
								message('A GLITCH!', 20, 40);
								sfx(1, 200, 20, 14, 30, 0);
								if (peopleLeft() === 0) { lostCity(); }
							}
						}
						else
						{
							// drifting; now and then it picks a foal on the ground below
							drift(intN, m_arrUVX[intN]);
							intBest = -1; intBD = 40;
							for (intJ = 0; intJ < NP; intJ++)
							{
								if ((m_arrPS[intJ] === 1) && (Math.abs(dif(m_arrUX[intN], m_arrPX[intJ])) < intBD))
								{
									intBD = Math.abs(dif(m_arrUX[intN], m_arrPX[intJ])); intBest = intJ;
								}
							}
							if (intBest < 0)
							{
								// no one below: wander up and down
								if ((m_arrUT[intN] % 40) === 0) { m_arrUVY[intN] = rnd(3) - 1; }
								m_arrUY[intN] = Math.max(50, Math.min(130, m_arrUY[intN] + m_arrUVY[intN]));
							}
							else if ((m_arrUT[intN] % 2) === 0)
							{
								// down to them
								m_arrUX[intN] = wrap(m_arrUX[intN] + sgn(dif(m_arrUX[intN], m_arrPX[intBest])));
								m_arrUY[intN]++;
								if ((m_arrUY[intN] >= GROUND - 24) && (Math.abs(dif(m_arrUX[intN], m_arrPX[intBest])) < 4))
								{
									m_arrUG[intN] = intBest; m_arrPS[intBest] = 2;
									sfx(1, 400, -20, 13, 30, 0);
									if (Math.abs(sx(m_arrUX[intN])) < 300) { message("THEY'VE GOT A FOAL!", 20, 40); }
								}
							}
						}
						strName = 'lander';
						if (m_arrUF[intN] <= 0) { shoot(intN, 14 + m_intWave, 0); }
						break;
					case K_MUTANT:
						// straight at you, jittering
						if ((m_arrUT[intN] & 1) === 0)
						{
							m_arrUX[intN] = wrap(m_arrUX[intN] + sgn(intD) * 2 + rnd(3) - 1);
							m_arrUY[intN] = m_arrUY[intN] + sgn(m_intHY - m_arrUY[intN]) + rnd(3) - 1;
						}
						m_arrUY[intN] = Math.max(YTOP, Math.min(YLOW, m_arrUY[intN]));
						strName = 'mutant'; intRow = GLITCH;
						if (m_arrUF[intN] <= 0) { shoot(intN, 18 + m_intWave, 1); }
						break;
					case K_BOMBER:
						drift(intN, idiv(m_arrUVX[intN], 2));
						m_arrUY[intN] = 80 + idiv(sine1(m_arrUT[intN]), 3);
						intX = sx(m_arrUX[intN]);
						if (((m_arrUT[intN] % 70) === 0) && (intX > 8) && (intX < 248)) { bulFire(intX, m_arrUY[intN], 0, 0, 'mine', 1, 0); }
						strName = 'bomber';
						break;
					case K_POD:
						drift(intN, idiv(m_arrUVX[intN], 2));
						m_arrUY[intN] = 70 + idiv(sine1(m_arrUT[intN] + intN * 30), 4);
						strName = 'pod';
						break;
					case K_SWARM:
						// fast at you across, overshooting
						m_arrUVX[intN] = Math.max(-28, Math.min(28, m_arrUVX[intN] + sgn(intD)));
						drift(intN, m_arrUVX[intN]);
						m_arrUY[intN] += sgn(m_intHY - m_arrUY[intN]);
						strName = 'swarmer';
						intFlags = (m_arrUVX[intN] > 0) ? SPRITE_MIRRORX : 0;
						if (m_arrUF[intN] <= 0) { shoot(intN, 20, 0); }
						break;
					default:
						// a hunter: keeps up with you, and shoots fans
						m_arrUX[intN] = wrap(m_arrUX[intN] + sgn(intD) * 3 + idiv(m_intHVX, 8));
						m_arrUY[intN] += sgn(m_intHY - 20 - m_arrUY[intN]);
						strName = 'baiter';
						if (m_arrUF[intN] <= 0) { shoot(intN, 22, 2); }
						break;
				}
				m_arrUF[intN]--;
				// on the screen: the sprite, the target; you running into it (a wide screen: drawn and
				// a target out to its edges)
				intX = sx(m_arrUX[intN]);
				if ((intX > -16 - m_intWL) && (intX < 272 + m_intWR))
				{
					spr(SP_UFO + intN, intX + 24, m_arrUY[intN] + 24, strName, undefined, intRow, 1, intFlags);
					m_objSlots.animate(SP_UFO + intN, 1);
					m_arrBoxOn[intN] = (intX > 4 - m_intWL) && (intX < 252 + m_intWR);
					if (m_blnAlive && (m_intInv === 0) && (m_intHyperT === 0) && m_objSlots.isVisible(SP_UNI))
					{
						if (m_objSlots.collide(SP_UFO + intN, SP_UNI))
						{
							killUFO(intN);
							die();
						}
					}
				}
				else
				{
					m_objSlots.hide(SP_UFO + intN);
					m_arrBoxOn[intN] = false;
					if ((m_arrUK[intN] === K_LANDER) && (m_arrUG[intN] >= 0)) { m_objSlots.hide(SP_BEAM + (intN & 3)); }
				}
			}
		}
	}

	// a sine wave: -64 .. 64 over 128 frames
	function sine1(intT_a)
	{
		var intU = intT_a & 127;
		return (intU < 64) ? intU * 2 - 64 : 192 - intU * 2;
	}

	// drone n shoots at you (if it's on the screen): kind 0 one bullet, 1 a pair, 2 a fan of 3
	function shoot(intN_a, intSp_a, intKind_a)
	{
		var intX, intA, intY = m_arrUY[intN_a];
		m_arrUF[intN_a] = Math.max(25, 70 + rnd(70) - m_intWave * 3);
		intX = sx(m_arrUX[intN_a]);
		if (m_blnAlive && (intX >= 0) && (intX <= 256))
		{
			intA = bulAim(intX, intY, sx(youX()), m_intHY);
			if (intKind_a === 0)
			{
				bulFire(intX, intY, intA, intSp_a, 'bullet', 1, PINK);
			}
			else if (intKind_a === 1)
			{
				bulFire(intX, intY, intA, intSp_a, 'bullet', 1, PINK);
				bulFire(intX, intY, (intA + 8) & 255, intSp_a, 'bullet', 1, PINK);
			}
			else
			{
				bulFire(intX, intY, intA, intSp_a, 'bullet', 2, BLUE);
				bulFire(intX, intY, (intA + 14) & 255, intSp_a, 'bullet', 2, BLUE);
				bulFire(intX, intY, (intA - 14) & 255, intSp_a, 'bullet', 2, BLUE);
			}
		}
	}

	// every foal's gone: every snatcher turns glitch
	function lostCity()
	{
		m_blnPeopleLost = true;
		for (var intN = 0; intN < NU; intN++)
		{
			if (m_arrUK[intN] === K_LANDER) { m_arrUK[intN] = K_MUTANT; }
		}
		message('THE VALLEY IS LOST!', 13, 100);
		sfx(2, 40, 10, 15, 80, 1);
	}

	// ====================================================================================================
	// THE FOALS

	function folk()
	{
		var intN, intX, blnWalk;
		for (intN = 0; intN < NP; intN++)
		{
			blnWalk = false;
			if (m_arrPS[intN] === 1)
			{
				// walking about
				if ((m_intFrames & 3) === 0) { m_arrPX[intN] = wrap(m_arrPX[intN] + m_arrPD[intN]); }
				if (rnd(300) === 0) { m_arrPD[intN] = -m_arrPD[intN]; }
				blnWalk = true;
			}
			else if (m_arrPS[intN] === 3)
			{
				// falling: from up high it's the end of them, unless you catch them
				m_arrPV[intN]++;
				m_arrPY[intN] += idiv(m_arrPV[intN], 8);
				if (m_arrPY[intN] >= GROUND - 8)
				{
					m_arrPY[intN] = GROUND - 8;
					if (m_arrPV[intN] > 22)
					{
						m_arrPS[intN] = 0; boom(m_arrPX[intN], m_arrPY[intN]);
						m_objSlots.hide(SP_PEOPLE + intN);
						if (peopleLeft() === 0) { lostCity(); }
					}
					else
					{
						m_arrPS[intN] = 1; addScore(250);
					}
				}
				// caught? (your spot, not your sprite: you can catch them while you blink)
				if ((m_arrPS[intN] === 3) && m_blnAlive && (m_intCarry < 0))
				{
					if ((Math.abs(dif(youX(), m_arrPX[intN])) < 14) && (Math.abs(m_intHY + 12 - m_arrPY[intN]) < 12))
					{
						m_arrPS[intN] = 4; m_intCarry = intN;
						addScore(500);
						message('CAUGHT! 500', 20, 50);
						sfx(1, 100, -4, 14, 20, 0);
					}
				}
			}
			if (m_arrPS[intN] !== 0)
			{
				intX = sx(m_arrPX[intN]);
				if ((intX > -16 - m_intWL) && (intX < 272 + m_intWR))
				{
					// walking: its own two frames; carried, falling or hanging on: rearing
					spr(SP_PEOPLE + intN, intX + 24, m_arrPY[intN] + 24, 'person', blnWalk ? undefined : 3, 0, 1, (m_arrPD[intN] < 0) ? SPRITE_MIRRORX : 0);
					if (blnWalk) { m_objSlots.animate(SP_PEOPLE + intN, 1); }
				}
				else
				{
					m_objSlots.hide(SP_PEOPLE + intN);
				}
			}
			else
			{
				m_objSlots.hide(SP_PEOPLE + intN);
			}
		}
	}

	// ====================================================================================================
	// EXPLOSIONS: each plays through once by itself (its sprite's sequence); the game only keeps it
	// on its spot in the valley as the view moves

	function boom(intX_a, intY_a)
	{
		var intN = SP_BOOM + m_intBNext;
		m_arrBX[m_intBNext] = intX_a; m_arrBY[m_intBNext] = intY_a;
		spr(intN, sx(intX_a) + 24, intY_a + 24, 'boom', undefined, 0);
		m_objSlots.animate(intN, 1, true);
		m_intBNext = (m_intBNext + 1) & 7;
	}

	function booms()
	{
		var intN;
		for (intN = 0; intN < NB; intN++)
		{
			if (m_objSlots.isVisible(SP_BOOM + intN))
			{
				if (!m_objSlots.isAnimated(SP_BOOM + intN))
				{
					m_objSlots.hide(SP_BOOM + intN);
				}
				else
				{
					m_objSlots.move(SP_BOOM + intN, sx(m_arrBX[intN]) + 24, m_arrBY[intN] + 24);
				}
			}
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
				case 'title': titleStep(); m_objSlots.step(); break;
				case 'titlerelease': if (!fireDown()) { gameStart(); } break;
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
			m_objSlots.setClip(32 - intL, 32, 256 + intL + intR, 192);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var intSX;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			// the valley (Layer 2, on the paper), scrolled round, under the tiles, under the sprites
			// (wide: the picture again each side, as far as is shown)
			intSX = 32 - (m_intCamX & 255);
			while (intSX > 32 - m_intWL)
			{
				intSX -= 256;
			}
			while (intSX < 32 + 256 + m_intWR)
			{
				objContext_a.drawImage(m_arrScene[m_intFlash], intSX, 32);
				intSX += 256;
			}
			// the HUD and the scanner stay the Next's width (its purple border part left off)
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
			objContext_a.clip();
			m_objGrid.paint(objContext_a, 0, 0);
			objContext_a.restore();
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are (frame n is n - 1 cells right), how big it's drawn,
	// what it does on its own (sequence, delay) and the part of it that counts in a collision
	// (hbw x hbh about its middle)
	function sprite(strName_a, objCell_a, intW_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a)
	{
		var intCW = objCell_a.w * 16, intCH = objCell_a.h * 16;
		return { name:strName_a, classes:'cudefend', imagename:'cudefend_s0', x:0, y:0, w:intW_a, h:intCH, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intCW, imageh:intCH,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	this.run = function()
	{
		setup();
		buildScenes();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			// you: running into a drone is within 16 across and 10 down of its middle (its box
			// 18 x 16, yours 14 x 4); the bullets look at your spot (bulHit)
			sprite('uni', G.S_UNI, 32, [1, 2, -1], 2, 14, 4),
			// the drones: a bolt within 9 across and 8 down of the middle hits
			sprite('lander', G.S_LANDER, 16, [1, 2, -1], 8, 18, 16),
			sprite('mutant', G.S_MUTANT, 16, [1, 2, -1], 4, 18, 16),
			sprite('bomber', G.S_BOMBER, 16, [1, 2, -1], 8, 18, 16),
			sprite('pod', G.S_POD, 16, [1, 2, -1], 8, 18, 16),
			sprite('swarmer', G.S_SWARMER, 16, [1, 2, -1], 4, 18, 16),
			sprite('baiter', G.S_BAITER, 16, [1, 2, -1], 4, 18, 16),
			sprite('person', G.S_PERSON, 16, [1, 2, -1], 8, 0, 0),		// walking x2, rearing
			sprite('beam', G.S_BEAM, 16, [1, 0], 1, 0, 0),
			// bullets, mines and bolts: a point
			sprite('mine', G.S_MINE, 16, [1, 0], 1, 0, 0),
			sprite('bullet', G.S_BULLET, 16, [1, 0], 1, 0, 0),			// small, big
			sprite('shot', G.S_SHOT, 16, [1, 0], 1, 0, 0),
			sprite('boom', G.S_BOOM, 16, BOOMSEQ, 1, 0, 0),			// once through, then done
			sprite('window', G.S_WINDOW, 32, [1, 0], 1, 0, 0),			// drawn twice as wide
			sprite('stars', G.S_STARS, 16, [1, 0], 1, 0, 0) ]);
		m_objSlots.setClip(32, 32, 256, 192);						// (the Next's sprite clip window: the paper)
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['cudefend_t0'], first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE, fire2:K_B } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('cudefend'), function()
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

var g_objGame = new cudefendGame();
g_objGame.run();
