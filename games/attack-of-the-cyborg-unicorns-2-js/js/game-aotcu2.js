// ATTACK OF THE CYBORG UNICORNS 2 - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// The cyborg unicorns are back, about ten a wave, and this time their horns fill the sky with
// bullets: rings, fans and spirals. Your jet's hit box is only its middle, so you can weave through
// them. Bring them down before they reach the gate at the far left of the plain.
//   P  power: your shot spreads wider (4 levels; a ship lost costs one)
//   B  a bomb: it clears every bullet and hurts every unicorn on screen (3 a ship, 6 at most)
//   $  a score medal
// and the NOVA: each press throws a fast scatter of eight shots every way at once. It holds five
// bursts; run it dry and it locks until it has charged right back up.
// 1.1: fighters - small, fast, twin-winged - swoop across the sky in strafing runs, firing at you.
// They're switched off, as on the Next (FIGHTERSON = 1 brings them back). Bullets don't vanish when
// they scroll off the screen: fly away and come back, and they're still there.
//
// Keys: Q A O P, or S X Z C, or the arrows, or 5 6 7 8: fly. Space (or M): fire (hold it down).
//       N: nova. B (or Enter): bomb. A game pad: the stick flies, A fires, B is the nova.
// Touch (nothing drawn: invisible zones over the picture): the left half flies (its left, right,
//       top and bottom edges; the corners go both ways), the right half fires below the HUD's
//       line, and its top strip is bomb (left) and nova (right). A touch anywhere starts.
//
// The screen is the Next's: the landscape is one 256 x 192 picture that scrolls round (made from
// the Next's own Layer 2 runs, 16 times over for the bomb's palette flash); the HUD, the scanner
// and the words are the tile screen (JTileGrid); the jet, the unicorns, the fighters, the items,
// the explosions, the scanner's dots and every bullet and shot are numbered sprites, numbered as
// on the Next. The bullets and shots move themselves (their movers), and the sprites' hit boxes
// say what a shot hits and what bullet gets you. The game runs 50 iterations a second - the
// Next's frames.
function aotcu2Game()
{
	var m_objThis = this;
	var G = GFX_AOTCU2;

	// the part of the Next's 320 x 256 screen the game uses (the paper): the canvas is this and
	// nothing more; the touch controls are drawn over it
	var VIEW = { x:32, y:32, w:256, h:192 };

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left
	// half flies (a strip along each of its edges; the corners press two ways), the right half
	// fires, its top strip is bomb (left) and nova (right). The title and game over: anywhere is fire
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:43, h:VIEW.h, key:79 },
		{ type:'zone', x:VIEW.x + 85, y:VIEW.y, w:43, h:VIEW.h, key:80 },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:128, h:64, key:81 },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 64, w:128, h:64, key:65 },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y + 64, w:128, h:VIEW.h - 64, key:32 },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y, w:64, h:64, key:66 },
		{ type:'zone', x:VIEW.x + 192, y:VIEW.y, w:64, h:64, key:78 } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:32 } ];

	var WORLD = 2048;					// the plain is 2048 pixels long (8 screens)
	var NU = 7, NB = 8, NI = 4, NF = 4, NBUL = 52, NSHOT = 22;
	// sprite slots (as the Next's): the bullets 54-105, the shots 106-127
	var SP_SHIP = 0, SP_UNI = 1, SP_BOOM = 29, SP_ITEM = 37, SP_WIN = 41, SP_DOTME = 42, SP_DOTU = 43, SP_FIGHT = 50, SP_BUL = 54, SP_SHOT = 106;
	// the shots' targets: the unicorns 0-6, the fighters 8-11
	var BOXF = 8, NBOX = 12;
	// the fighters: 0 off (the code stays in), 1 on - off, as the Next version is
	var FIGHTERSON = 0;
	// where the jet can go (paper coordinates)
	var YTOP = 44, YLOW = 162;
	// bullet colours (sprite palette rows) and the nova
	var PINK = 5, BLUE = 6, NOVAFULL = 500, NOVABURST = 100;
	// the landscape
	var GROUND = 170;

	// keys (keyCodes)
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_S = 83, K_X = 88, K_Z = 90, K_C = 67;
	var K_5 = 53, K_6 = 54, K_7 = 55, K_8 = 56, K_SPACE = 32, K_M = 77, K_N = 78, K_B = 66, K_ENTER = 13;

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
	// the boom: four frames, 15 frames in all (as the Next's count down)
	var BOOMSEQ = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 0];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objPad, m_objGrid;
	var m_arrScene = [];				// the landscape, 16 times: palette offsets 0-15 (the bomb's flash)
	// full screen (JCanvas's screenmode): how much more of the plain shows left and right of the
	// Next's 256 (0 in the normal mode); at most WIDEMAX each side, beyond that it's black
	var WIDEMAX = 128;
	var m_intWL = 0, m_intWR = 0, m_objView = { x:32, y:32, w:256, h:192 };
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the unicorns: on, x (8ths of a pixel over the plain), life, its most, how fast (8ths a frame),
	// when it fires next, a hit flash, a spiral going (frames left), its angle
	var m_arrUOn = [], m_arrUX = [], m_arrUHP = [], m_arrUMax = [], m_arrUSpd = [], m_arrUFire = [], m_arrUFl = [], m_arrUSpin = [], m_arrUAng = [];
	var m_intUY = GROUND - 31;
	// the fighters: on, x and y (8ths of a pixel; x over the plain), speed (8ths a frame), the point
	// they're making for (this side or that of you), life, when they fire next, a hit flash
	var m_arrFOn = [], m_arrFX = [], m_arrFY = [], m_arrFVX = [], m_arrFVY = [], m_arrFTo = [], m_arrFHP = [], m_arrFFire = [], m_arrFFl = [], m_intFNext = 0;
	// items: kind (1 power, 2 bomb, 3 medal), x over the plain, y, time left
	var m_arrIK = [], m_arrIX = [], m_arrIY = [], m_arrIT = [];
	// explosions: x over the plain, y, big (their sprites play through once by themselves)
	var m_arrBX = [], m_arrBY = [], m_arrBBig = [], m_intBNext = 0;
	// the shots' targets: on (on the screen to be hit), hits not read yet
	var m_arrBoxOn = [], m_arrHits = [];
	var m_blnSparked = false;
	// the nova's 32 ways round: across and down, x 12
	var m_arrCS = [], m_arrSN = [];
	// the jet: x (8ths of a pixel over the plain), y, speed (8ths a frame), facing (1 right, -1 left)
	var m_intSX = 0, m_intSY = 0, m_intSVX = 0, m_intFace = 1, m_blnAlive = false, m_intInv = 0, m_intDeadT = 0, m_intCool = 0;
	var m_intPower = 1, m_intBombs = 3, m_intBombT = 0, m_blnBombWas = false, m_intFlash = 0;
	var m_intNova = NOVAFULL, m_blnNovaLock = false, m_blnNovaWas = false, m_intNovaCool = 0;
	var m_intCamX = 0, m_intPan = 0;
	var m_intScore = 0, m_intHiscore = 50000, m_intLives = 3, m_intWave = 1, m_intRemain = 0, m_intToCome = 0;
	var m_intFrames = 0, m_intMsgT = 0, m_blnScoreDirty = false, m_intClearT = 0;

	var m_strState = 'loading', m_intStep = 0;

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
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, 'aotcu2_s' + intRow_a, intScale_a, intFlags_a);
	}

	// the nova's directions: 32 ways round
	function setup()
	{
		var intK;
		m_arrCS = [12, 12, 11, 10, 8, 7, 5, 2, 0];
		for (intK = 9; intK <= 16; intK++)
		{
			m_arrCS[intK] = -m_arrCS[16 - intK];
		}
		for (intK = 17; intK <= 31; intK++)
		{
			m_arrCS[intK] = m_arrCS[32 - intK];
		}
		for (intK = 0; intK <= 31; intK++)
		{
			m_arrSN[intK] = m_arrCS[(intK + 24) & 31];
		}
		for (intK = 0; intK < 256; intK++)
		{
			if (SINES[intK] > 127) { SINES[intK] -= 256; }
		}
		for (intK = 0; intK < NU; intK++)
		{
			m_arrUOn.push(false); m_arrUX.push(0); m_arrUHP.push(1); m_arrUMax.push(1); m_arrUSpd.push(0); m_arrUFire.push(0); m_arrUFl.push(0); m_arrUSpin.push(0); m_arrUAng.push(0);
		}
		for (intK = 0; intK < NF; intK++)
		{
			m_arrFOn.push(false); m_arrFX.push(0); m_arrFY.push(0); m_arrFVX.push(0); m_arrFVY.push(0); m_arrFTo.push(0); m_arrFHP.push(0); m_arrFFire.push(0); m_arrFFl.push(0);
		}
		for (intK = 0; intK < NI; intK++)
		{
			m_arrIK.push(0); m_arrIX.push(0); m_arrIY.push(0); m_arrIT.push(0);
		}
		for (intK = 0; intK < NB; intK++)
		{
			m_arrBX.push(0); m_arrBY.push(0); m_arrBBig.push(false);
		}
		for (intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn.push(false); m_arrHits.push(0);
		}
	}

	// the landscape from the Next's runs (count, colour), in the Layer 2 default colours, once for
	// each palette offset (the bomb's flash adds 16 x the offset to every pixel's colour number)
	function buildScenes()
	{
		var arrPix = [], arrR = [], arrG = [], arrB = [];
		var intK = 0, intN, intV, intO, intP, intB2;
		var objCanvas, objContext, objData;
		while ((arrPix.length < 256 * 192) && (intK + 1 < AOTCU2_SCENE.length))
		{
			intN = (AOTCU2_SCENE[intK] === 0) ? 256 : AOTCU2_SCENE[intK];
			for (intV = 0; intV < intN; intV++)
			{
				arrPix.push(AOTCU2_SCENE[intK + 1]);
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
	// THE BULLETS AND SHOTS (the Next's Bul.cls): sprites 54-127, each moving itself

	// an enemy bullet's mover: where it is kept to 1/256ths of a pixel over three screens either
	// way, flying on with the ground when it's off the screen (shown then off the clip window, so
	// unseen; a wide screen shows it further out); it goes when it leaves the top or bottom, gets more than two screens away, or goes
	// past either end of the plain
	function bulletMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = intX_a * 256 + 128, intY = intY_a * 256 + 128;
		return function(intN_a, objO_a)
		{
			var intHX, intHY, blnGone;
			intX += intVX_a - m_intPan * 256;
			intY += intVY_a;
			intHX = intX >> 8;
			intHY = intY >> 8;
			blnGone = (intHX < -512) || (intHX >= 768) || (intHX < -m_intCamX - 8) || (intHX > 263 + WORLD - 256 - m_intCamX) || (intHY < 36) || (intHY >= 188);
			if ((intHX >= 4 - m_intWL) && (intHX < 252 + m_intWR))
			{
				objO_a.x = intHX + 24; objO_a.y = intHY + 24;
			}
			else
			{
				objO_a.x = -64; objO_a.y = intHY + 24;
			}
			return blnGone;
		};
	}

	// a player shot's mover: vx across and vy down a frame (and the ground's pan); it goes when it
	// leaves the paper's sides, or the play area's top or bottom
	function shotMover(intN_a, objO_a)
	{
		var intX = objO_a.x - 24 + objO_a.vx - m_intPan, intY = objO_a.y - 24 + objO_a.vy;
		objO_a.x = intX + 24; objO_a.y = intY + 24;
		return (intX < 4) || (intX >= 252) || (intY < 36) || (intY >= 188);
	}

	// everything gone: bullets, shots, targets
	function bulReset()
	{
		m_objSlots.hideRange(SP_BUL, NBUL + NSHOT);
		for (var intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn[intK] = false; m_arrHits[intK] = 0;
		}
	}

	// every enemy bullet gone (a bomb, a ship lost)
	function bulClear()
	{
		m_objSlots.hideRange(SP_BUL, NBUL);
	}

	// an enemy bullet from x, y going way a (0-255: 0 down, 64 right, 128 up, 192 left) at spd
	// sixteenths of a pixel a frame: bullet frame intFrame_a (1 small, 2 big) in palette row intPal_a
	function bulFire(intX_a, intY_a, intA_a, intSpd_a, intFrame_a, intPal_a)
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
			spr(intN, -64, intY_a + 24, 'bullet', intFrame_a, intPal_a);
			m_objSlots.setMover(intN, bulletMover(intX_a, intY_a, intVX, intVY));
		}
	}

	// a player shot from x, y flying vx across and vy down a frame, as sprite strName_a (mirrored
	// when it flies left)
	function bulShot(intX_a, intY_a, intVX_a, intVY_a, strName_a)
	{
		var intN = -1, intK;
		for (intK = SP_SHOT; (intK < SP_SHOT + NSHOT) && (intN < 0); intK++)
		{
			if (!m_objSlots.isVisible(intK)) { intN = intK; }
		}
		if (intN >= 0)
		{
			spr(intN, intX_a + 24, intY_a + 24, strName_a, 1, 0, 1, (intVX_a < 0) ? SPRITE_MIRRORX : 0);
			m_objSlots.setMover(intN, shotMover, intVX_a, intVY_a);
		}
	}

	// target n's sprite
	function boxSlot(intT_a)
	{
		return (intT_a < BOXF) ? SP_UNI + intT_a * 4 : SP_FIGHT + intT_a - BOXF;
	}

	// after the movers: each shot against the targets on the screen (their sprites' hit boxes); a
	// shot that hits one counts a hit on it and goes
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
					m_blnSparked = true;
					m_objSlots.hide(intN);
				}
			}
		}
	}

	// the hits on target n since the last time it was asked
	function bulHits(intT_a)
	{
		var intResult = m_arrHits[intT_a];
		m_arrHits[intT_a] = 0;
		return intResult;
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
	// THE SCREEN

	function hud()
	{
		m_objGrid.clear(0);
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		m_objGrid.rect(4, 5, 32, 1, G.T_SCANT, 0);
		m_objGrid.rect(4, 6, 32, 1, G.T_SCAN, 0);
		m_objGrid.rect(4, 7, 32, 1, G.T_SCANG, 0);
		showScore();
		showLives();
		showBombs();
		showNova();
		text(12, 4, 'W' + rightStr('0' + String(m_intWave), 2));
	}

	function showScore()
	{
		text(4, 4, seven(m_intScore));
		m_blnScoreDirty = false;
	}

	function showLives()
	{
		for (var intK = 0; intK <= 4; intK++)
		{
			m_objGrid.put(31 + intK, 4, (intK < m_intLives) ? G.T_LIFE : G.T_HUD, 0);
		}
	}

	function showBombs()
	{
		for (var intK = 0; intK <= 5; intK++)
		{
			m_objGrid.put(16 + intK, 4, (intK < m_intBombs) ? G.T_BOMB : G.T_HUD, 0);
		}
	}

	// the nova's charge: 5 cells, a burst each; while it's locked the cells blink
	function showNova()
	{
		var intF;
		for (var intK = 0; intK <= 4; intK++)
		{
			intF = idiv((m_intNova - intK * NOVABURST) * 8, NOVABURST);
			if (intF < 0) { intF = 0; }
			if (intF > 8) { intF = 8; }
			if (m_blnNovaLock && ((m_intFrames & 8) !== 0)) { intF = 0; }
			m_objGrid.put(23 + intK, 4, G.T_GAUGE + intF, 0);
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
		m_objGrid.rect(4, 8, 32, 20, 0, 0);
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		var intK;
		m_objSlots.hideRange(0, 54);
		bulReset();
		m_intWave = 1; m_intLives = 3; m_intScore = 0; m_intBombs = 3; m_intNova = NOVAFULL; m_blnNovaLock = false;
		hud();
		m_objGrid.rect(4, 4, 32, 1, G.T_HUD, 0);
		text(4, 4, 'HI ' + seven(m_intHiscore));
		message('ATTACK OF THE', 9, 0);
		message('CYBORG UNICORNS 2', 10, 0);
		message('QAOP / SXZC / 5678  FLY', 12, 0);
		message('SPACE FIRE  N NOVA  B BOMB', 13, 0);
		message('P POWER  B BOMB  $ MEDAL', 15, 0);
		message('V1.1  (C) 2026 CYBORG UNICORN', 26, 0);
		for (intK = 0; intK < NU; intK++)
		{
			m_arrUOn[intK] = false;
		}
		m_arrUOn[0] = true; m_arrUX[0] = 300 * 8; m_arrUHP[0] = 1; m_arrUMax[0] = 1; m_arrUSpd[0] = 3; m_arrUFl[0] = 0;
		m_intCamX = 0; m_intStep = 0;
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'title';
	}

	// a unicorn walks across the plain as it scrolls by
	function titleStep()
	{
		m_intCamX++;
		if (m_intCamX >= WORLD - 256) { m_intCamX = 0; }
		m_arrUX[0] -= m_arrUSpd[0];
		if (idiv(m_arrUX[0], 8) < m_intCamX - 40 - m_intWL) { m_arrUX[0] = (m_intCamX + 320 + m_intWR) * 8; }
		drawUnicorn(0);
		m_intStep++;
		if (m_intStep === 30) { message('PRESS SPACE', 27, 0); }
		if (m_intStep === 60) { m_objGrid.rect(4, 27, 32, 1, 0, 0); m_intStep = 0; }
		if (fireDown()) { m_strState = 'titlerelease'; }
	}

	// a game: wave after wave until the last ship is lost
	function gameStart()
	{
		m_objGrid.rect(4, 8, 32, 20, 0, 0);
		sfx(0, 200, -6, 15, 25, 0);
		m_intScore = 0; m_intLives = 3; m_intWave = 1; m_intPower = 1; m_intBombs = 3; m_intNova = NOVAFULL; m_blnNovaLock = false;
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
	// A WAVE: about ten unicorns, at most seven on the plain at once; until all are down, or the
	// last ship is lost

	function waveStart()
	{
		var intN, intTotal, intK;
		m_objSlots.hideRange(0, 54);
		bulReset();
		for (intK = 0; intK < NI; intK++)
		{
			m_arrIK[intK] = 0;
		}
		for (intK = 0; intK < NF; intK++)
		{
			m_arrFOn[intK] = false;
		}
		m_intFNext = 200;
		intTotal = 8 + rnd(5);
		intN = Math.min(intTotal, NU);
		for (intK = 0; intK < NU; intK++)
		{
			m_arrUOn[intK] = false;
			if (intK < intN) { newUnicorn(intK, WORLD - 120 - intK * 190 - rnd(60)); }
		}
		m_intToCome = intTotal - intN; m_intRemain = intTotal;
		m_intSX = 80 * 8; m_intSY = 100; m_intSVX = 0; m_intFace = 1; m_blnAlive = true; m_intInv = 100; m_intDeadT = 0; m_intCool = 0; m_intBombT = 0;
		m_blnBombWas = true; m_blnNovaWas = true;
		m_intCamX = 0; m_intPan = 0;
		hud();
		message('WAVE ' + String(m_intWave), 13, 120);
		message(String(intTotal) + ' CYBORG UNICORNS COMING', 15, 120);
		m_intClearT = 0;
		m_objPad.setControls(ZONES_PLAY);
		m_strState = 'wave';
	}

	function waveStep()
	{
		var intB;
		playerMove();
		camera();
		placeShip();
		unicorns();
		fighters();
		items();
		booms();
		bombUpdate();
		// the bullets and shots move themselves (and every animation a step on)
		m_objSlots.step();
		shotHits();
		if (m_blnAlive && (m_intInv === 0) && (m_intBombT === 0))
		{
			if (m_objSlots.collideRange(SP_SHIP, SP_BUL, NBUL).length > 0) { die(); }
		}
		if (m_blnSparked) { sfx(1, 8, 2, 9, 3, 1); }
		scanner();
		if (m_blnScoreDirty && ((m_intFrames & 3) === 0)) { showScore(); }
		if ((m_intFrames & 3) === 2) { showNova(); }
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
		else if (m_intRemain === 0)
		{
			m_intClearT++;
			if (m_intClearT === 30)
			{
				intB = m_intWave * 2000;
				addScore(intB);
				message('WAVE ' + String(m_intWave) + ' CLEARED', 13, 0);
				message('BONUS ' + String(intB), 15, 0);
				sfx(0, 100, -2, 15, 50, 0);
			}
			if (m_intClearT > 170)
			{
				clearMessages();
				if ((!m_blnAlive) && (m_intLives === 0))
				{
					// the last ship went down while the wave was being cleared: that's the end (the
					// Next carried on into the next wave with no ships left)
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

	function newUnicorn(intN_a, intX_a)
	{
		m_arrUOn[intN_a] = true;
		m_arrUX[intN_a] = intX_a * 8;
		m_arrUMax[intN_a] = 32 + m_intWave * 8; m_arrUHP[intN_a] = m_arrUMax[intN_a];
		m_arrUSpd[intN_a] = Math.min(7, 2 + idiv(m_intWave, 2) + rnd(2));
		m_arrUFire[intN_a] = 20 + rnd(40);
		m_arrUFl[intN_a] = 0; m_arrUSpin[intN_a] = 0; m_arrUAng[intN_a] = rnd(256);
	}

	function addScore(intN_a)
	{
		m_intScore += intN_a;
		m_blnScoreDirty = true;
	}

	// ====================================================================================================
	// THE JET

	function playerMove()
	{
		var intMX = 0, intMY = 0, intV, intK, blnNova, blnBomb;
		if (m_intNova < NOVAFULL) { m_intNova++; }
		if (m_blnNovaLock && (m_intNova >= NOVAFULL)) { m_blnNovaLock = false; sfx(1, 60, -2, 12, 12, 0); }
		if (m_intNovaCool > 0) { m_intNovaCool--; }
		if (!m_blnAlive)
		{
			if (m_intDeadT > 0)
			{
				m_intDeadT--;
				if ((m_intDeadT === 0) && (m_intLives > 0))
				{
					m_blnAlive = true; m_intInv = 150; m_intSY = 100; m_intSVX = 0; m_intBombs = 3; showBombs();
					m_intSX = (m_intCamX + 128) * 8;
				}
			}
		}
		else
		{
			if (down(K_O) || down(K_Z) || down(KEY_LEFT) || down(K_5)) { intMX = -1; }
			if (down(K_P) || down(K_C) || down(KEY_RIGHT) || down(K_8)) { intMX = 1; }
			if (down(K_Q) || down(K_S) || down(KEY_UP) || down(K_7)) { intMY = -1; }
			if (down(K_A) || down(K_X) || down(KEY_DOWN) || down(K_6)) { intMY = 1; }
			if (intMX !== 0)
			{
				m_intFace = intMX;
				m_intSVX = Math.max(-40, Math.min(40, m_intSVX + intMX * 3));
			}
			else
			{
				if (m_intSVX > 0) { m_intSVX--; }
				if (m_intSVX < 0) { m_intSVX++; }
			}
			m_intSX += m_intSVX;
			if (m_intSX < 64) { m_intSX = 64; m_intSVX = 0; }
			if (m_intSX > (WORLD - 8) * 8) { m_intSX = (WORLD - 8) * 8; m_intSVX = 0; }
			m_intSY = Math.max(YTOP, Math.min(YLOW, m_intSY + intMY * 2));
			// the gun: wider with power
			if (m_intCool > 0) { m_intCool--; }
			if (fireDown() && (m_intCool === 0))
			{
				intV = m_intFace * 14 + idiv(m_intSVX, 8);
				intK = idiv(m_intSX, 8) - m_intCamX + m_intFace * 8;
				if (m_intPower === 1)
				{
					bulShot(intK, m_intSY + 1, intV, 0, 'shot');
				}
				else if (m_intPower === 2)
				{
					bulShot(intK, m_intSY - 2, intV, 0, 'shot');
					bulShot(intK, m_intSY + 4, intV, 0, 'shot');
				}
				else if (m_intPower === 3)
				{
					bulShot(intK, m_intSY + 1, intV, 0, 'shot');
					bulShot(intK, m_intSY - 2, intV, -1, 'shot');
					bulShot(intK, m_intSY + 4, intV, 1, 'shot');
				}
				else
				{
					bulShot(intK, m_intSY - 2, intV, 0, 'shot');
					bulShot(intK, m_intSY + 4, intV, 0, 'shot');
					bulShot(intK, m_intSY - 4, intV, -2, 'shot');
					bulShot(intK, m_intSY + 6, intV, 2, 'shot');
				}
				m_intCool = 5;
				sfx(0, 30, 4, 10, 4, 0);
			}
			// the nova: a scatter of eight, every way
			blnNova = down(K_N);
			if (blnNova && !m_blnNovaWas)
			{
				if ((!m_blnNovaLock) && (m_intNova >= NOVABURST) && (m_intNovaCool === 0))
				{
					fireNova();
				}
				else if (m_blnNovaLock)
				{
					sfx(1, 400, 0, 8, 6, 0);
				}
			}
			m_blnNovaWas = blnNova;
			// a bomb
			blnBomb = down(K_B) || down(K_ENTER);
			if (blnBomb && (!m_blnBombWas) && (m_intBombs > 0) && (m_intBombT === 0))
			{
				m_intBombs--; showBombs();
				m_intBombT = 60; m_intInv = 60;
				sfx(2, 31, 0, 15, 60, 1);
			}
			m_blnBombWas = blnBomb;
			if (m_intInv > 0) { m_intInv--; }
		}
	}

	function fireNova()
	{
		var intK, intD, intSp, intX;
		m_intNova -= NOVABURST;
		if (m_intNova < NOVABURST) { m_blnNovaLock = true; message('NOVA RECHARGING', 17, 60); }
		m_intNovaCool = 6;
		intX = idiv(m_intSX, 8) - m_intCamX;
		for (intK = 0; intK <= 7; intK++)
		{
			intD = (intK * 4 + rnd(3) - 1) & 31;
			intSp = 10 + rnd(5);
			bulShot(intX, m_intSY, idiv(m_arrCS[intD] * intSp, 12) + idiv(m_intSVX, 8), idiv(m_arrSN[intD] * intSp, 12), 'orb');
		}
		sfx(0, 10, 6, 15, 12, 1);
		sfx(1, 150, -10, 14, 12, 0);
	}

	// the bomb: every bullet gone each frame of it, the sky flashing (the landscape's palette offset)
	function bombUpdate()
	{
		if (m_intBombT > 0)
		{
			m_intBombT--;
			bulClear();
			m_intFlash = (m_intBombT === 0) ? 0 : (idiv(m_intBombT, 3) & 15);
		}
	}

	// the view: the jet a third of the way in from the side it's leaving
	function camera()
	{
		var intWant, intWas = m_intCamX;
		intWant = idiv(m_intSX, 8) - ((m_intFace > 0) ? 88 : 168);
		intWant = Math.max(0, Math.min(WORLD - 256, intWant));
		if (intWant > m_intCamX + 7)
		{
			m_intCamX += 7;
		}
		else if (intWant < m_intCamX - 7)
		{
			m_intCamX -= 7;
		}
		else
		{
			m_intCamX = intWant;
		}
		m_intPan = m_intCamX - intWas;
	}

	// the jet's sprite (its engines flicker by themselves; it blinks while it can't be hit)
	function placeShip()
	{
		if ((!m_blnAlive) || ((m_intInv & 4) !== 0))
		{
			m_objSlots.hide(SP_SHIP);
		}
		else
		{
			spr(SP_SHIP, idiv(m_intSX, 8) - m_intCamX + 24, m_intSY + 24, 'ship', undefined, 0, 1, (m_intFace < 0) ? SPRITE_MIRRORX : 0);
			m_objSlots.animate(SP_SHIP, 1);
		}
	}

	function die()
	{
		var intX = idiv(m_intSX, 8);
		m_blnAlive = false; m_intDeadT = 100; m_intLives--; showLives();
		if (m_intPower > 1) { m_intPower--; }
		boom(intX, m_intSY, true);
		boom(intX - 10, m_intSY - 6, false);
		boom(intX + 10, m_intSY + 6, false);
		bulClear();
		m_objSlots.hide(SP_SHIP);
		sfx(2, 31, 0, 15, 70, 1);
		sfx(1, 300, 10, 15, 50, 0);
	}

	// ====================================================================================================
	// THE UNICORNS

	function unicorns()
	{
		var intN, intX, intH;
		for (intN = 0; intN < NU; intN++)
		{
			if (m_arrUOn[intN])
			{
				m_arrUX[intN] -= m_arrUSpd[intN];
				intX = idiv(m_arrUX[intN], 8) - m_intCamX;		// its middle on the screen
				// through the gate
				if (m_arrUX[intN] < 0)
				{
					message('ONE BROKE THROUGH THE GATE!', 14, 120);
					m_arrUX[intN] = (WORLD - 60) * 8;
					if (m_blnAlive) { die(); } else { m_intLives--; showLives(); }
					if (m_intLives < 0) { m_intLives = 0; }
				}
				// shot (and bombed)
				intH = bulHits(intN);
				if ((m_intBombT > 0) && (intX > -20) && (intX < 276)) { intH++; }
				if (intH > 0)
				{
					m_arrUHP[intN] -= intH;
					if ((m_intFrames & 7) === 0) { m_arrUFl[intN] = 1; }
					addScore(10 * intH);
					if ((m_intFrames & 3) === 0) { sfx(1, 60, -4, 11, 4, 0); }
					if (m_arrUHP[intN] <= 0) { kill(intN); }
				}
				if (m_arrUOn[intN])
				{
					m_arrBoxOn[intN] = (intX > 8) && (intX < 248);
					if ((intX > 16) && (intX < 270) && m_blnAlive) { horn(intN, intX); }
					// running into it
					if (m_blnAlive && (m_intInv === 0))
					{
						if ((Math.abs(idiv(m_intSX, 8) - m_intCamX - intX) < 24) && (Math.abs(m_intSY - m_intUY) < 26)) { die(); }
					}
					drawUnicorn(intN);
				}
			}
		}
	}

	// unicorn n's horn (at x on the screen): rings, fans, spirals - more and faster each wave
	function horn(intN_a, intX_a)
	{
		var intHX = intX_a - 26, intHY = m_intUY - 28;
		var intA, intC, intM, intR;
		var intSp = Math.min(22, 10 + m_intWave);
		// a spiral going
		if (m_arrUSpin[intN_a] > 0)
		{
			m_arrUSpin[intN_a]--;
			if ((m_arrUSpin[intN_a] % 3) === 0)
			{
				m_arrUAng[intN_a] = (m_arrUAng[intN_a] + 13) & 255;
				bulFire(intHX, intHY, m_arrUAng[intN_a], intSp, 1, PINK);
				bulFire(intHX, intHY, (m_arrUAng[intN_a] + 85) & 255, intSp, 1, PINK);
				bulFire(intHX, intHY, (m_arrUAng[intN_a] + 170) & 255, intSp, 1, PINK);
			}
		}
		m_arrUFire[intN_a]--;
		if (m_arrUFire[intN_a] <= 0)
		{
			m_arrUFire[intN_a] = Math.max(25, 70 - m_intWave * 5) + rnd(30);
			intR = rnd(3);
			if ((m_arrUHP[intN_a] * 2 < m_arrUMax[intN_a]) && (rnd(2) === 1)) { intR = 2; }		// hurt: more spirals
			if (intR === 0)
			{
				// a ring
				intC = Math.min(20, 10 + m_intWave * 2);
				intA = rnd(32);
				for (intM = 1; intM <= intC; intM++)
				{
					bulFire(intHX, intHY, intA & 255, intSp, 1, PINK);
					intA += idiv(256, intC);
				}
			}
			else if (intR === 1)
			{
				// a fan at you
				intC = Math.min(9, 5 + idiv(m_intWave, 2));
				intA = bulAim(intHX, intHY, idiv(m_intSX, 8) - m_intCamX, m_intSY) - (intC - 1) * 5;
				for (intM = 1; intM <= intC; intM++)
				{
					bulFire(intHX, intHY, intA & 255, intSp + 4, 2, BLUE);
					intA += 10;
				}
			}
			else
			{
				m_arrUSpin[intN_a] = 45 + m_intWave * 5;
			}
			sfx(2, 120, -6, 11, 12, 0);
		}
	}

	// unicorn n's sprite: 32 x 32 drawn twice the size (the Next's four sprites), its legs by where
	// it is on the plain, coloured by its damage (palette rows 0-3; 4 the hit flash)
	function drawUnicorn(intN_a)
	{
		var intSlot = SP_UNI + intN_a * 4;
		var intX = idiv(m_arrUX[intN_a], 8) - m_intCamX;
		var intF, intRow;
		if ((intX < -40 - m_intWL) || (intX > 300 + m_intWR))
		{
			m_objSlots.hide(intSlot);
		}
		else
		{
			intF = idiv(idiv(m_arrUX[intN_a], 8), 5) & 3;
			intRow = idiv((m_arrUMax[intN_a] - m_arrUHP[intN_a]) * 4, m_arrUMax[intN_a] + 1);
			if (m_arrUFl[intN_a] > 0)
			{
				m_arrUFl[intN_a]--;
				intRow = 4;
			}
			spr(intSlot, intX, m_intUY, 'unicorn', intF + 1, intRow, 2);
		}
	}

	function kill(intN_a)
	{
		var intX = idiv(m_arrUX[intN_a], 8), intR;
		m_arrUOn[intN_a] = false; m_intRemain--;
		m_arrBoxOn[intN_a] = false;
		m_objSlots.hide(SP_UNI + intN_a * 4);
		boom(intX, m_intUY, true);
		boom(intX - 18, m_intUY - 16, true);
		boom(intX + 16, m_intUY - 6, false);
		boom(intX - 6, m_intUY + 18, false);
		addScore(500 * m_intWave);
		sfx(2, 31, 0, 15, 50, 1);
		sfx(0, 40, 8, 14, 40, 0);
		// it may leave something behind
		intR = rnd(100);
		if ((intR < 30) && (m_intPower < 4))
		{
			drop(1, intX, m_intUY - 20);
		}
		else if ((intR < 45) && (m_intBombs < 6))
		{
			drop(2, intX, m_intUY - 20);
		}
		else if (intR < 75)
		{
			drop(3, intX, m_intUY - 20);
		}
		// the next one walks in at the far end
		if (m_intToCome > 0)
		{
			m_intToCome--;
			newUnicorn(intN_a, WORLD - 60 - rnd(120));
		}
	}

	// ====================================================================================================
	// THE FIGHTERS (1.1): they come in from off the screen, swoop to a point to one side of you, then
	// the other, firing aimed shots as they go: strafing runs, back and forth

	function fighters()
	{
		var intN, intX, intY, intH, intMost, intLive = 0, intTX, intTY;
		if (FIGHTERSON === 1)
		{
			intMost = Math.min(NF, 1 + idiv(m_intWave, 2));
			for (intN = 0; intN < NF; intN++)
			{
				if (m_arrFOn[intN]) { intLive++; }
			}
			if (m_intFNext > 0) { m_intFNext--; }
			if ((m_intFNext === 0) && (intLive < intMost) && (m_intRemain > 0)) { newFighter(); }
			for (intN = 0; intN < NF; intN++)
			{
				if (m_arrFOn[intN])
				{
					// steer: for the point, overshooting (that's the swoop); turn round once past it
					intTX = m_intSX + m_arrFTo[intN] * 8; intTY = m_intSY * 8;
					if ((!m_blnAlive) || (m_intRemain === 0)) { intTX = m_intSX + m_arrFTo[intN] * 32; intTY = YTOP * 8; }	// off, for now
					m_arrFVX[intN] += (m_arrFX[intN] < intTX) ? 2 : -2;
					m_arrFVX[intN] = Math.max(-28, Math.min(28, m_arrFVX[intN]));
					m_arrFVY[intN] += (m_arrFY[intN] < intTY) ? 1 : -1;
					m_arrFVY[intN] = Math.max(-12, Math.min(12, m_arrFVY[intN]));
					m_arrFX[intN] += m_arrFVX[intN]; m_arrFY[intN] += m_arrFVY[intN];
					if (Math.abs(m_arrFX[intN] - intTX) < 128) { m_arrFTo[intN] = -m_arrFTo[intN]; }
					if (m_arrFY[intN] < (YTOP - 8) * 8) { m_arrFY[intN] = (YTOP - 8) * 8; m_arrFVY[intN] = 0; }
					if (m_arrFY[intN] > (YLOW + 8) * 8) { m_arrFY[intN] = (YLOW + 8) * 8; m_arrFVY[intN] = 0; }
					if (m_arrFX[intN] < 0) { m_arrFX[intN] = 0; m_arrFVX[intN] = 8; }
					intX = idiv(m_arrFX[intN], 8) - m_intCamX; intY = idiv(m_arrFY[intN], 8);
					if ((intX < -400) || (intX > 650))
					{
						// gone far away
						m_arrFOn[intN] = false; m_arrBoxOn[BOXF + intN] = false; m_objSlots.hide(SP_FIGHT + intN);
					}
					// shot (and bombed)
					intH = 0;
					if (m_arrFOn[intN]) { intH = bulHits(BOXF + intN); }
					if ((m_intBombT > 0) && m_arrFOn[intN] && (intX > -8) && (intX < 264)) { intH++; }
					if (intH > 0)
					{
						m_arrFHP[intN] -= intH; m_arrFFl[intN] = 3;
						addScore(10 * intH);
						if (m_arrFHP[intN] <= 0) { killFighter(intN, true); }
					}
					if (m_arrFOn[intN])
					{
						m_arrBoxOn[BOXF + intN] = (intX > 4) && (intX < 252);
						// its gun: at you, from on the screen
						m_arrFFire[intN]--;
						if (m_arrFFire[intN] <= 0)
						{
							m_arrFFire[intN] = Math.max(35, 80 - m_intWave * 4 + rnd(50));
							if ((intX > 8) && (intX < 248) && m_blnAlive) { fighterShoot(intX, intY); }
						}
						// running into it
						if (m_blnAlive && (m_intInv === 0))
						{
							if ((Math.abs(idiv(m_intSX, 8) - m_intCamX - intX) < 11) && (Math.abs(m_intSY - intY) < 9)) { killFighter(intN, false); die(); }
						}
						if (m_arrFOn[intN]) { drawFighter(intN, intX, intY); }
					}
				}
			}
		}
	}

	function newFighter()
	{
		var intN, blnDone = false;
		for (intN = 0; (intN < NF) && !blnDone; intN++)
		{
			if (!m_arrFOn[intN])
			{
				blnDone = true;
				m_arrFOn[intN] = true;
				// in from one side or the other, just off the screen
				if (rnd(2) === 1)
				{
					m_arrFX[intN] = (m_intCamX - 24) * 8; m_arrFVX[intN] = 24; m_arrFTo[intN] = 70 + rnd(30);
				}
				else
				{
					m_arrFX[intN] = (m_intCamX + 280) * 8; m_arrFVX[intN] = -24; m_arrFTo[intN] = -70 - rnd(30);
				}
				if (m_arrFX[intN] < 0) { m_arrFX[intN] = 0; }
				m_arrFY[intN] = (YTOP + rnd(YLOW - YTOP)) * 8; m_arrFVY[intN] = 0;
				m_arrFHP[intN] = 2; m_arrFFire[intN] = 40 + rnd(40); m_arrFFl[intN] = 0;
				m_intFNext = Math.max(60, 200 + rnd(150) - m_intWave * 12);
				sfx(1, 25, 1, 10, 25, 1);
			}
		}
	}

	// a fighter's shot: one at you; from wave 3, three in a tight fan
	function fighterShoot(intX_a, intY_a)
	{
		var intSp = Math.min(30, 18 + m_intWave);
		var intA = bulAim(intX_a, intY_a, idiv(m_intSX, 8) - m_intCamX, m_intSY);
		bulFire(intX_a, intY_a, intA, intSp, 1, BLUE);
		if (m_intWave >= 3)
		{
			bulFire(intX_a, intY_a, (intA + 8) & 255, intSp, 1, BLUE);
			bulFire(intX_a, intY_a, (intA - 8) & 255, intSp, 1, BLUE);
		}
		sfx(0, 20, 2, 9, 5, 0);
	}

	function killFighter(intN_a, blnScored_a)
	{
		var intX = idiv(m_arrFX[intN_a], 8), intY = idiv(m_arrFY[intN_a], 8);
		m_arrFOn[intN_a] = false;
		m_arrBoxOn[BOXF + intN_a] = false;
		m_objSlots.hide(SP_FIGHT + intN_a);
		boom(intX, intY, false);
		boom(intX - 6, intY - 4, false);
		sfx(2, 31, 0, 14, 30, 1);
		if (blnScored_a)
		{
			addScore(300 * m_intWave);
			if (rnd(100) < 12) { drop(3, intX, intY); }
		}
	}

	// a fighter: banking when it climbs or dives fast, white for a moment when it's hit
	function drawFighter(intN_a, intX_a, intY_a)
	{
		if ((intX_a < -8 - m_intWL) || (intX_a > 264 + m_intWR))
		{
			m_objSlots.hide(SP_FIGHT + intN_a);
		}
		else
		{
			var intRow = 0;
			if (m_arrFFl[intN_a] > 0) { m_arrFFl[intN_a]--; intRow = 4; }
			spr(SP_FIGHT + intN_a, intX_a + 24, intY_a + 24, 'fighter', (Math.abs(m_arrFVY[intN_a]) > 6) ? 2 : 1, intRow);
		}
	}

	// ====================================================================================================
	// ITEMS: they float up a little and bob, and blink before they go

	function drop(intKind_a, intX_a, intY_a)
	{
		var intN, blnDone = false;
		for (intN = 0; (intN < NI) && !blnDone; intN++)
		{
			if (m_arrIK[intN] === 0)
			{
				m_arrIK[intN] = intKind_a; m_arrIX[intN] = intX_a; m_arrIY[intN] = intY_a; m_arrIT[intN] = 600;
				blnDone = true;
			}
		}
	}

	function items()
	{
		var intN, intX, intY;
		for (intN = 0; intN < NI; intN++)
		{
			if (m_arrIK[intN] > 0)
			{
				m_arrIT[intN]--;
				if (((m_intFrames & 1) === 0) && (m_arrIY[intN] > 70)) { m_arrIY[intN]--; }
				intX = m_arrIX[intN] - m_intCamX; intY = m_arrIY[intN] + idiv(m_arrSN[idiv(m_intFrames, 4) & 31], 4);
				if (m_arrIT[intN] === 0)
				{
					m_arrIK[intN] = 0; m_objSlots.hide(SP_ITEM + intN);
				}
				else if (m_blnAlive && (Math.abs(intX - (idiv(m_intSX, 8) - m_intCamX)) < 14) && (Math.abs(intY - m_intSY) < 14))
				{
					if (m_arrIK[intN] === 1)
					{
						if (m_intPower < 4) { m_intPower++; message('POWER UP', 17, 40); } else { addScore(5000); }
					}
					else if (m_arrIK[intN] === 2)
					{
						if (m_intBombs < 6) { m_intBombs++; showBombs(); }
					}
					else
					{
						addScore(2000 * m_intWave);
					}
					m_arrIK[intN] = 0; m_objSlots.hide(SP_ITEM + intN);
					sfx(1, 120, -8, 14, 14, 0);
				}
				else if ((m_arrIT[intN] < 120) && ((m_arrIT[intN] & 4) !== 0))
				{
					m_objSlots.hide(SP_ITEM + intN);
				}
				else
				{
					spr(SP_ITEM + intN, intX + 24, intY + 24, 'item', m_arrIK[intN], 0);
				}
			}
		}
	}

	// ====================================================================================================
	// EXPLOSIONS: each plays through once by itself (its sprite's sequence); the game only keeps it
	// on its spot on the plain as the view moves

	function boom(intX_a, intY_a, blnBig_a)
	{
		var intN = SP_BOOM + m_intBNext;
		m_arrBX[m_intBNext] = intX_a; m_arrBY[m_intBNext] = intY_a; m_arrBBig[m_intBNext] = blnBig_a;
		if (blnBig_a)
		{
			spr(intN, intX_a - m_intCamX + 16, intY_a + 16, 'boom', undefined, 0, 2);
		}
		else
		{
			spr(intN, intX_a - m_intCamX + 24, intY_a + 24, 'boom', undefined, 0, 1);
		}
		m_objSlots.animate(intN, 1, true);
		m_intBNext = (m_intBNext + 1) & 7;
	}

	function booms()
	{
		var intN, intX;
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
					intX = m_arrBX[intN] - m_intCamX;
					if (m_arrBBig[intN]) { m_objSlots.move(SP_BOOM + intN, intX + 16, m_arrBY[intN] + 16); }
					else { m_objSlots.move(SP_BOOM + intN, intX + 24, m_arrBY[intN] + 24); }
				}
			}
		}
	}

	// ====================================================================================================
	// THE SCANNER: the whole plain in 256 pixels (8 to 1) - you, the unicorns, the part on screen

	function scanner()
	{
		var intN;
		spr(SP_WIN, idiv(m_intCamX, 8) + 32, 42, 'window', 1, 0);
		if (m_blnAlive)
		{
			spr(SP_DOTME, idiv(m_intSX, 64) + 24, 12 + idiv((m_intSY - 36) * 14, 130) + 24, 'dot', 1, 0);
		}
		else
		{
			m_objSlots.hide(SP_DOTME);
		}
		for (intN = 0; intN < NU; intN++)
		{
			if (m_arrUOn[intN])
			{
				spr(SP_DOTU + intN, idiv(m_arrUX[intN], 64) + 24, 12 + idiv((m_intUY - 36) * 14, 130) + 24, 'dot', 2, 0);
			}
			else
			{
				m_objSlots.hide(SP_DOTU + intN);
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
	// Next's 256 (at most WIDEMAX), the sprites' clip window to match
	function Wide()
	{
		var objV = m_objCanvas.getView();
		var intL = 0, intR = 0;
		// (only a view around the game's own: before the canvas is going, it's not yet)
		if ((objV.x <= VIEW.x) && (objV.y <= VIEW.y) && (objV.x + objV.w >= VIEW.x + VIEW.w) && (objV.y + objV.h >= VIEW.y + VIEW.h))
		{
			intL = Math.min(WIDEMAX, VIEW.x - objV.x); intR = Math.min(WIDEMAX, (objV.x + objV.w) - (VIEW.x + VIEW.w));
			m_objView = objV;
		}
		if ((intL !== m_intWL) || (intR !== m_intWR))
		{
			m_intWL = intL; m_intWR = intR;
			m_objSlots.setClip(VIEW.x - intL, VIEW.y, VIEW.w + intL + intR, VIEW.h);
		}
	}

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var intSX, intK;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		if (m_blnLoaded)
		{
			// the landscape, scrolled round (it joins up end to end), under the tiles, under the sprites
			// (wide: more copies either side, out to the extra shown)
			intSX = m_intCamX & 255;
			objContext_a.save();
			objContext_a.beginPath();
			objContext_a.rect(VIEW.x - m_intWL, VIEW.y, VIEW.w + m_intWL + m_intWR, VIEW.h);
			objContext_a.clip();
			for (intK = -1; intK <= 2; intK++)
			{
				objContext_a.drawImage(m_arrScene[m_intFlash], VIEW.x + intK * 256 - intSX, VIEW.y);
			}
			objContext_a.restore();
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are (frame n is n - 1 cells right), how big it's drawn,
	// what it does on its own (sequence, delay) and the part of it that counts in a collision
	// (hbw x hbh about its middle, hby down from it)
	function sprite(strName_a, objCell_a, intW_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a, intHBY_a)
	{
		var intCW = objCell_a.w * 16, intCH = objCell_a.h * 16;
		return { name:strName_a, classes:'aotcu2', imagename:'aotcu2_s0', x:0, y:0, w:intW_a, h:intCH, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intCW, imageh:intCH,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:intHBY_a, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	this.run = function()
	{
		setup();
		buildScenes();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			sprite('ship', G.S_SHIP, 16, [1, 2, -1], 3, 7, 7, 0),			// engines flickering; hit only in its middle (3 pixels)
			sprite('shot', G.S_SHOT, 16, [1, 0], 1, 0, 0, 0),
			sprite('orb', G.S_ORB, 16, [1, 0], 1, 0, 0, 0),
			sprite('bullet', G.S_BULLET, 16, [1, 0], 1, 0, 0, 0),			// 1 small, 2 big
			sprite('unicorn', G.S_UNICORN, 32, [1, 0], 1, 26, 26, 4),		// (drawn twice the size: 52 x 52 about 4 below its middle)
			sprite('fighter', G.S_FIGHTER, 16, [1, 0], 1, 14, 12, 0),		// 1 level, 2 banking
			sprite('item', G.S_ITEM, 16, [1, 0], 1, 16, 16, 0),			// power, bomb, medal
			sprite('boom', G.S_BOOM, 16, BOOMSEQ, 1, 0, 0, 0),			// once through, then done
			sprite('dot', G.S_DOT, 16, [1, 0], 1, 0, 0, 0),				// you, a unicorn
			sprite('window', G.S_WINDOW, 32, [1, 0], 1, 0, 0, 0) ]);		// drawn twice as wide
		m_objSlots.setClip(VIEW.x, VIEW.y, VIEW.w, VIEW.h);				// (the Next's sprite clip window: the paper)
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['aotcu2_t0'], first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:K_SPACE, fire2:K_N } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('aotcu2'), function()
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

var g_objGame = new aotcu2Game();
g_objGame.run();
