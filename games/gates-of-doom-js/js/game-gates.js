// GATES OF DOOM - ported from the ZX Spectrum Next version (NTC BASIC: Main.bas and its classes:
// Arena, Bul, Tiles, Spr, Sfx). (c) 2026 Cyborg Unicorn Pty Ltd
//
// After Jeff Minter's Hell Gate. Four laser guns run on rails round the edge of the arena, and one
// hand moves all of them, each pair the opposite way to its twin: left / right moves the top and
// bottom guns across (one left, one right), up / down moves the side guns (one up, one down). Fire
// and all four shoot inwards together; where their lines cross are your four sights. Gates of Doom
// open in the arena and pour out demons that go for your guns: imps, wraiths, bouncing skulls and
// fire fiends that spit fireballs. Shoot the gates shut and the demons down.
// Any gun hit is a life lost: a demon reaching it, a fireball, or its twin's laser when the two line
// up. Every third wave cleared gives a life back (4 at most).
//
// Keys: Q A O P, or S X Z C, or 5 6 7 8, or the arrows: move the guns. Space (or M): fire (hold it
//       down). A game pad: the stick moves the guns, A (or B) fires.
// Touch (nothing drawn: invisible zones over the picture, several fingers at once): the left half
//       moves the guns (a strip along each of its edges presses that way: left, right, up, down;
//       the corners press two), the right half fires. A touch anywhere starts.
//
// The screen is the Next's: the arena is the Layer 2 picture (made from Arena.cls's runs); the HUD
// and the words are the tile screen (JTileGrid); the guns, the sights, the gates, the demons, the
// explosions and every shot and fireball are numbered sprites (JSpriteSlots), numbered as on the
// Next and cut to the arena below the HUD as the Next's sprite clip window does. The shots and
// fireballs (Bul.cls: 60 fireballs and 18 shots, sprites 50-127) move themselves (their movers); a
// shot counts its hits on the targets' boxes (a demon's or a gate's box is its sprite's hit box;
// a gun's is 7 each way of its middle). The game runs 50 iterations a second - the Next's frames.
//
// The Next version's bugs, kept as they are (neither stops the game being played):
// - The README says the waves open 1, 1, 2, 2, 3, 3, then 4 gates; the game opens 1 + wave \ 2:
//   1, 2, 2, 3, 3, 4, 4 ... (this follows the game).
// - Skipping the game over with fire (after its first second) goes straight into a new game when
//   fire's let go: the title sees fire still held on its first frame.
function gatesGame()
{
	var m_objThis = this;
	var G = GFX_GATES;
	var IMG = 'gates_s';

	// the part of the Next's 320 x 256 screen the game draws in: the paper (the HUD's two rows at its
	// top, the arena under it, every word inside it)
	var VIEW = { x:32, y:32, w:256, h:192 };

	// keys (keyCodes): the Next's, and the arrows as the joystick
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_S = 83, K_X = 88, K_Z = 90, K_C = 67;
	var K_5 = 53, K_6 = 54, K_7 = 55, K_8 = 56, K_SPACE = 32, K_M = 77;

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left half
	// moves the guns (its left and right strips: the top and bottom guns; its top and bottom strips:
	// the side guns), the right half fires. The title and the game over: anywhere is Space
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:43, h:VIEW.h, key:K_O },
		{ type:'zone', x:VIEW.x + 85, y:VIEW.y, w:43, h:VIEW.h, key:K_P },
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:128, h:64, key:K_Q },
		{ type:'zone', x:VIEW.x, y:VIEW.y + VIEW.h - 64, w:128, h:64, key:K_A },
		{ type:'zone', x:VIEW.x + 128, y:VIEW.y, w:128, h:VIEW.h, key:K_SPACE } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:K_SPACE } ];

	var NG = 4, NE = 14, NB = 8, NBOX = 24;
	// sprite slots (Bul has 50-127: the fireballs 50-109, the shots 110-127)
	var SP_GUN = 0, SP_CROSS = 4, SP_GATE = 5, SP_EN = 9, SP_BOOM = 23, SP_CROSS2 = 31;
	var SP_BUL = 50, SP_SHOT = 110, NBUL = 60, NSHOT = 18;
	// the targets: the demons 0-13, the gates 16-19, the guns 20-23 (each gun can be hit by the gun
	// opposite)
	var BOXGATE = 16, BOXGUN = 20;
	// demons
	var K_IMP = 1, K_WRAITH = 2, K_SKULL = 3, K_FIEND = 4;
	// where the guns run (paper coordinates: the gun's middle)
	var GXMIN = 28, GXMAX = 228, GYMIN = 44, GYMAX = 164;
	// an explosion: patterns 0-3 of BOOM, 4, 4, 4 and 3 frames (one more at the start: it steps on
	// once before it's first seen)
	var BOOMSEQ = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 0];

	// Bul's sines: 256 steps round, x 127; atan(k / 16) in 256ths of a turn
	var SINES = [
		0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
		90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116, 117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
		127, 127, 127, 127, 126, 126, 126, 125, 125, 124, 123, 122, 122, 121, 120, 118, 117, 116, 115, 113, 112, 111, 109, 107, 106, 104, 102, 100, 98, 96, 94, 92,
		90, 88, 85, 83, 81, 78, 76, 73, 71, 68, 65, 63, 60, 57, 54, 51, 49, 46, 43, 40, 37, 34, 31, 28, 25, 22, 19, 16, 12, 9, 6, 3,
		0, -3, -6, -9, -12, -16, -19, -22, -25, -28, -31, -34, -37, -40, -43, -46, -49, -51, -54, -57, -60, -63, -65, -68, -71, -73, -76, -78, -81, -83, -85, -88,
		-90, -92, -94, -96, -98, -100, -102, -104, -106, -107, -109, -111, -112, -113, -115, -116, -117, -118, -120, -121, -122, -122, -123, -124, -125, -125, -126, -126, -126, -127, -127, -127,
		-127, -127, -127, -127, -126, -126, -126, -125, -125, -124, -123, -122, -122, -121, -120, -118, -117, -116, -115, -113, -112, -111, -109, -107, -106, -104, -102, -100, -98, -96, -94, -92,
		-90, -88, -85, -83, -81, -78, -76, -73, -71, -68, -65, -63, -60, -57, -54, -51, -49, -46, -43, -40, -37, -34, -31, -28, -25, -22, -19, -16, -12, -9, -6, -3 ];
	var ATN = [0, 3, 5, 8, 10, 12, 15, 17, 19, 21, 23, 25, 26, 28, 29, 31, 32];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 128);
	var m_objPad, m_objGrid;
	var m_blnLoaded = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the guns: 0 top, 1 bottom, 2 left, 3 right; the top / bottom ones at x = gx, the sides at y = gy
	var m_arrGAlive = [], m_arrGunX = [], m_arrGunY = [];
	var m_intGX = 0, m_intGY = 0, m_intCool = 0, m_intLives = 0, m_intHitT = 0;
	// the gates: open, where, life, its most, when the next demon comes, a hit flash
	var m_arrGOn = [], m_arrGTX = [], m_arrGTY = [], m_arrGHP = [], m_arrGMax = [], m_arrGSpawn = [], m_arrGFl = [];
	// the demons: kind, position and speed (16ths of a pixel), life, timer, which gun it wants, a flash
	var m_arrEK = [], m_arrEX = [], m_arrEY = [], m_arrEVX = [], m_arrEVY = [];
	var m_arrEHP = [], m_arrET = [], m_arrETG = [], m_arrEFl = [];
	// explosions
	var m_arrBX = [], m_arrBY = [], m_arrBT = [], m_arrBBig = [], m_intBNext = 0;
	var m_intScore = 0, m_intHiscore = 20000, m_intWave = 1, m_intOver = 0, m_intGatesOpen = 0, m_intDemonCount = 0;
	var m_intFrames = 0, m_intMsgT = 0, m_intScoreDirty = 0, m_intClearT = 0;

	// the bullet engine (Bul.cls): the targets' boxes (on, x, y, half width, half height in paper
	// coordinates, the hits counted)
	var m_arrBoxOn = [], m_arrBoxX = [], m_arrBoxY = [], m_arrBoxW = [], m_arrBoxH = [], m_arrBoxHits = [];

	// what's going on (the Next's loops): 'loading', 'title', 'release' (fire let go to start),
	// 'wave', 'over'; the title's and the game over's counters
	var m_strState = 'loading', m_intT = 0;

	// ====================================================================================================
	// HELPERS

	// BASIC's \ : whole number division, towards nought
	function idiv(intA_a, intB_a)
	{
		return (intA_a / intB_a) | 0;
	}

	function sgn(intN_a)
	{
		var intResult = 0;
		if (intN_a > 0) { intResult = 1; }
		if (intN_a < 0) { intResult = -1; }
		return intResult;
	}

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a === 1);
	}

	// sprite n (Spr.Put) at x, y (the Next's sprite coordinates: the paper starts at 32, 32) as library
	// sprite name (frame: one picture; undefined: its own animation) in palette row pal, scale, flags
	function sprPut(intN_a, intX_a, intY_a, strName_a, intFrame_a, intPal_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, IMG + intPal_a, intScale_a, intFlags_a);
	}

	// sprite n as library sprite name with its own animation running (from the start when restart)
	function sprAnim(intN_a, intX_a, intY_a, strName_a, intPal_a, intScale_a, blnRestart_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, undefined, IMG + intPal_a, intScale_a, 0);
		m_objSlots.animate(intN_a, 1, blnRestart_a);
	}

	// ====================================================================================================
	// THE SHOTS AND THE FIREBALLS (Bul.cls): 60 fireballs and 18 shots, sprites 50-127, each moving
	// itself (its mover)

	// no fireballs, no shots, no boxes
	function bulReset()
	{
		var intK;
		m_objSlots.hideRange(SP_BUL, NBUL + NSHOT);
		for (intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn[intK] = false; m_arrBoxHits[intK] = 0;
		}
	}

	// every fireball gone: how many there were
	function bulClear()
	{
		var intK, intC = 0;
		for (intK = 0; intK < NBUL; intK++)
		{
			if (m_objSlots.hasMover(SP_BUL + intK))
			{
				m_objSlots.hide(SP_BUL + intK);
				intC++;
			}
		}
		return intC;
	}

	// how a fireball moves itself: x and y in 256ths of a pixel; it goes when it leaves columns 4-251
	// or rows 20-187 (the HUD is above)
	function bulletMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = intX_a, intY = intY_a;
		return function(intN_a, objO_a)
		{
			var blnDone = false, intHi, intYHi;
			intX = (intX + intVX_a) & 0xFFFF;
			intHi = intX >> 8;
			if ((intHi < 4) || (intHi >= 252))
			{
				blnDone = true;
			}
			else
			{
				intY = (intY + intVY_a) & 0xFFFF;
				intYHi = intY >> 8;
				if ((intYHi < 20) || (intYHi >= 188))
				{
					blnDone = true;
				}
				else
				{
					objO_a.x = intHi + 24; objO_a.y = intYHi + 24;
				}
			}
			return blnDone;
		};
	}

	// a fireball from x, y (paper) going way a (0-255: 0 down, 64 right, 128 up, 192 left) at spd
	// sixteenths of a pixel a frame, showing frame f of the sheet's first row in palette row pal
	function bulFire(intX_a, intY_a, intA_a, intSpd_a, intFrame_a, intPal_a)
	{
		var intK, intN = -1, intS, intVX, intVY, intSpd = intSpd_a & 255;
		for (intK = 0; (intK < NBUL) && (intN < 0); intK++)
		{
			if (!m_objSlots.hasMover(SP_BUL + intK)) { intN = SP_BUL + intK; }
		}
		if (intN >= 0)
		{
			intS = SINES[intA_a & 255];
			intVX = sgn(intS) * ((Math.abs(intS) * intSpd) >> 3);
			intS = SINES[(intA_a + 64) & 255];
			intVY = sgn(intS) * ((Math.abs(intS) * intSpd) >> 3);
			sprPut(intN, (intX_a & 255) + 24, (intY_a & 255) + 24, 'row0', intFrame_a, intPal_a, 1, 0);
			m_objSlots.setMover(intN, bulletMover((intX_a & 255) * 256 + 128, (intY_a & 255) * 256 + 128, intVX, intVY));
		}
	}

	// how a shot moves itself: vx across and vy down a frame; it goes when it leaves columns 4-251 or
	// rows 20-187, or hits a target's box (counted)
	function shotMover(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intX = intX_a & 255, intY = intY_a & 255;
		return function(intN_a, objO_a)
		{
			var blnDone = false, intK;
			intX = intX + intVX_a;
			intY = intY + intVY_a;
			if ((intX < 4) || (intX >= 252) || (intY < 20) || (intY >= 188))
			{
				blnDone = true;
			}
			else
			{
				for (intK = 0; (intK < NBOX) && !blnDone; intK++)
				{
					if (m_arrBoxOn[intK] && (Math.abs(intX - m_arrBoxX[intK]) < m_arrBoxW[intK]) && (Math.abs(intY - m_arrBoxY[intK]) < m_arrBoxH[intK]))
					{
						if (m_arrBoxHits[intK] < 255) { m_arrBoxHits[intK]++; }
						blnDone = true;
					}
				}
				objO_a.x = intX + 24; objO_a.y = intY + 24;
			}
			return blnDone;
		};
	}

	// a shot from x, y, flying vx across and vy down a frame (flying left: mirrored; up or down: turned)
	function bulShot(intX_a, intY_a, intVX_a, intVY_a)
	{
		var intK, intN = -1, intFlags = 0;
		for (intK = 0; (intK < NSHOT) && (intN < 0); intK++)
		{
			if (!m_objSlots.hasMover(SP_SHOT + intK)) { intN = SP_SHOT + intK; }
		}
		if (intN >= 0)
		{
			if (intVX_a < 0) { intFlags = SPRITE_MIRRORX; }
			if (intVY_a !== 0) { intFlags = intFlags | SPRITE_ROTATE; }
			sprPut(intN, -1000, -1000, 'row0', G.S_SHOT.col + 1, 0, 1, intFlags);
			m_objSlots.setMover(intN, shotMover(intX_a, intY_a, intVX_a, intVY_a));
		}
	}

	// target n this frame, centred at x, y, hw across and hh down from the middle to its edges (x and
	// y bytes, as the Next's)
	function bulBox(intN_a, intX_a, intY_a, intHW_a, intHH_a)
	{
		m_arrBoxOn[intN_a] = true;
		m_arrBoxX[intN_a] = intX_a & 255; m_arrBoxY[intN_a] = intY_a & 255;
		m_arrBoxW[intN_a] = intHW_a; m_arrBoxH[intN_a] = intHH_a;
	}

	// target n this frame: the sprite in slot n's own hit box (a demon, a gate)
	function bulBoxSprite(intN_a, intSlot_a)
	{
		var objB = m_objSlots.getBox(intSlot_a);
		bulBox(intN_a, (objB.left + objB.right) / 2 - 32, (objB.top + objB.bottom) / 2 - 32, (objB.right - objB.left) / 2, (objB.bottom - objB.top) / 2);
	}

	// target n gone (its hits kept until bulHits reads them)
	function bulOff(intN_a)
	{
		m_arrBoxOn[intN_a] = false;
	}

	// the shots that hit target n since the last bulHits(n)
	function bulHits(intN_a)
	{
		var intH = m_arrBoxHits[intN_a];
		m_arrBoxHits[intN_a] = 0;
		return intH;
	}

	// how many fireballs are within 7 pixels of x, y: they go (a gun hit)
	function bulNear(intX_a, intY_a)
	{
		var intK, intC = 0, intN;
		for (intK = 0; intK < NBUL; intK++)
		{
			intN = SP_BUL + intK;
			if (m_objSlots.hasMover(intN))
			{
				if ((((m_objSlots.getX(intN) - 24 - intX_a + 7) & 255) < 15) && (((m_objSlots.getY(intN) - 24 - intY_a + 7) & 255) < 15))
				{
					m_objSlots.hide(intN);
					intC++;
				}
			}
		}
		return intC;
	}

	// every fireball and shot moved and checked: the sprites' own movers, with every animation a step on
	function bulStep()
	{
		m_objSlots.step();
	}

	// the way (0-255, as bulFire's) from x, y to tx, ty
	function bulAim(intX_a, intY_a, intTX_a, intTY_a)
	{
		var intDX = intTX_a - intX_a, intDY = intTY_a - intY_a, intAX = Math.abs(intDX), intAY = Math.abs(intDY), intT, intResult = 0;
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
	// THE SCREEN (the tile screen: the HUD and the words)

	function tilesText(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	function tilesRect(intX_a, intY_a, intW_a, intH_a, intT_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, intT_a, 0);
	}

	function tilesPut(intX_a, intY_a, intT_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, 0);
	}

	// Right$("000000" & n, 7)
	function right7(intN_a)
	{
		var str = '000000' + String(intN_a);
		return str.substr(str.length - 7);
	}

	function hud()
	{
		var str = '0' + String(m_intWave);
		m_objGrid.clear(0, 0);
		tilesRect(4, 4, 32, 1, G.T_HUD);
		tilesRect(4, 5, 32, 1, G.T_HUDB);
		showScore();
		showLives();
		showGates();
		tilesText(16, 4, 'WAVE ' + str.substr(str.length - 2));
	}

	function showScore()
	{
		tilesText(4, 4, right7(m_intScore));
		m_intScoreDirty = 0;
	}

	function showLives()
	{
		var intK;
		for (intK = 0; intK <= 3; intK++)
		{
			tilesPut(32 + intK, 4, (intK < m_intLives) ? G.T_GUN : G.T_HUD);
		}
	}

	function showGates()
	{
		var intK;
		for (intK = 0; intK <= 3; intK++)
		{
			tilesPut(25 + intK, 4, (intK < m_intGatesOpen) ? G.T_GATE : G.T_HUD);
		}
	}

	// a message across the middle, on row y, for t frames (0: until the messages are cleared)
	function message(str_a, intY_a, intT_a)
	{
		tilesRect(4, intY_a, 32, 1, 0);
		tilesText(4 + idiv(32 - str_a.length, 2), intY_a, str_a);
		if (intT_a !== 0) { m_intMsgT = intT_a; }
	}

	function clearMessages()
	{
		tilesRect(4, 6, 32, 22, 0);
	}

	function fireDown()
	{
		return down(K_SPACE) || down(K_M);
	}

	function addScore(intN_a)
	{
		m_intScore += intN_a;
		m_intScoreDirty = 1;
	}

	// ====================================================================================================
	// THE TITLE

	function titleStart()
	{
		var intK;
		m_objSlots.hideRange(0, 50);
		bulReset();
		m_intWave = 1; m_intScore = 0; m_intLives = 3; m_intHitT = 0;
		for (intK = 0; intK <= 3; intK++)
		{
			m_arrGAlive[intK] = 1;
		}
		hud();
		tilesRect(4, 4, 32, 1, G.T_HUD);
		tilesText(4, 4, 'HI ' + right7(m_intHiscore));
		message('G A T E S   O F   D O O M', 9, 0);
		message('FOUR GUNS. ONE HAND.', 11, 0);
		message('LEFT/RIGHT  TOP + BOTTOM GUNS', 13, 0);
		message('UP/DOWN     THE SIDE GUNS', 14, 0);
		message('EACH PAIR GOES OPPOSITE WAYS', 15, 0);
		message('QAOP  SXZC  5678  JOYSTICK', 17, 0);
		message('SPACE  ALL FOUR FIRE', 18, 0);
		message('SHOOT THE GATES SHUT', 20, 0);
		message('ANY GUN HIT IS A LIFE LOST', 21, 0);
		message('EVEN BY ITS OWN TWIN', 22, 0);
		m_intGX = 128; m_intGY = 104;
		m_intT = 0;
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'title';
	}

	// the title's loop: the guns sweep, PRESS SPACE flashes, until fire
	function titleFrame()
	{
		placeGuns();
		drawGuns();
		m_intT++;
		m_intGX = 128 + (m_intT & 63) - 32;
		if (m_intT === 30) { message('PRESS SPACE', 25, 0); }
		if (m_intT === 60)
		{
			tilesRect(4, 25, 32, 1, 0);
			m_intT = 0;
		}
		if (fireDown()) { m_strState = 'release'; }
	}

	// fire let go: the game starts
	function releaseFrame()
	{
		if (!fireDown())
		{
			clearMessages();
			sfx(0, 300, -10, 15, 30, 0);
			gameStart();
		}
	}

	// ====================================================================================================
	// A GAME

	function gameStart()
	{
		var intK;
		m_intScore = 0; m_intWave = 1; m_intOver = 0; m_intLives = 3;
		for (intK = 0; intK <= 3; intK++)
		{
			m_arrGAlive[intK] = 1;
		}
		m_objPad.setControls(ZONES_PLAY);
		waveStart();
	}

	function gameOverStart()
	{
		if (m_intScore > m_intHiscore) { m_intHiscore = m_intScore; }
		message('THE GATES OF DOOM HAVE WON', 13, 0);
		message('GAME OVER', 15, 0);
		m_intT = 0;
		m_objPad.setControls(ZONES_MENU);
		m_strState = 'over';
	}

	// the game over: 5 seconds, or fire after the first second; nothing moves
	function overFrame()
	{
		m_intT++;
		if ((m_intT >= 250) || ((m_intT > 50) && fireDown()))
		{
			clearMessages();
			titleStart();
		}
	}

	function waveStart()
	{
		var intN, intK;
		m_objSlots.hideRange(0, 50);
		bulReset();
		for (intK = 0; intK < NE; intK++)
		{
			m_arrEK[intK] = 0;
		}
		for (intK = 0; intK < NB; intK++)
		{
			m_arrBT[intK] = 0;
		}
		intN = 1 + idiv(m_intWave, 2);
		if (intN > NG) { intN = NG; }
		for (intK = 0; intK < NG; intK++)
		{
			m_arrGOn[intK] = 0;
			if (intK < intN)
			{
				m_arrGOn[intK] = 1;
				m_arrGTX[intK] = 64 + rnd(128); m_arrGTY[intK] = 64 + rnd(80);
				m_arrGMax[intK] = 20 + m_intWave * 4; m_arrGHP[intK] = m_arrGMax[intK];
				m_arrGSpawn[intK] = 40 + intK * 50;
				m_arrGFl[intK] = 0;
			}
		}
		m_intGatesOpen = intN; m_intDemonCount = 0;
		m_intGX = 72; m_intGY = 70; m_intCool = 0; m_intHitT = 60;
		hud();
		message('WAVE ' + String(m_intWave), 12, 120);
		if (intN === 1)
		{
			message('A GATE OF DOOM IS OPENING', 14, 120);
		}
		else
		{
			message(String(intN) + ' GATES OF DOOM ARE OPENING', 14, 120);
		}
		sfx(2, 400, 6, 15, 60, 0);
		m_intClearT = 0;
		m_strState = 'wave';
	}

	// the wave's loop, once a frame
	function waveFrame()
	{
		var intB;
		gunsMove();
		gates();
		demons();
		booms();
		bulStep();
		gunHits();
		drawGuns();
		if ((m_intScoreDirty !== 0) && ((m_intFrames & 3) === 0)) { showScore(); }
		if (m_intMsgT > 0)
		{
			m_intMsgT--;
			if (m_intMsgT === 0) { clearMessages(); }
		}
		m_intFrames = (m_intFrames + 1) & 0x7FFF;
		if (m_intLives === 0)
		{
			m_intClearT++;
			if (m_intClearT > 100)
			{
				m_intOver = 1;
				gameOverStart();
			}
		}
		else if ((m_intGatesOpen === 0) && (m_intDemonCount === 0))
		{
			m_intClearT++;
			if (m_intClearT === 30)
			{
				intB = m_intWave * 2000;
				addScore(intB);
				message('WAVE ' + String(m_intWave) + ' CLEARED', 12, 0);
				message('BONUS ' + String(intB), 14, 0);
				if (((m_intWave % 3) === 0) && (m_intLives < 4))
				{
					m_intLives++; showLives();
					message('AN EXTRA LIFE', 16, 0);
				}
				sfx(0, 100, -2, 15, 50, 0);
			}
			if (m_intClearT > 170)
			{
				clearMessages();
				m_intWave++;
				waveStart();
			}
		}
	}

	// ====================================================================================================
	// THE GUNS

	function gunsMove()
	{
		var intMX = 0, intMY = 0;
		if (down(K_O) || down(K_Z) || down(K_5) || down(KEY_LEFT)) { intMX = -1; }
		if (down(K_P) || down(K_C) || down(K_8) || down(KEY_RIGHT)) { intMX = 1; }
		if (down(K_Q) || down(K_S) || down(K_7) || down(KEY_UP)) { intMY = -1; }
		if (down(K_A) || down(K_X) || down(K_6) || down(KEY_DOWN)) { intMY = 1; }
		if (m_intHitT > 0) { m_intHitT--; }
		m_intGX += intMX * 3; m_intGY += intMY * 3;
		if (m_intGX < GXMIN) { m_intGX = GXMIN; }
		if (m_intGX > GXMAX) { m_intGX = GXMAX; }
		if (m_intGY < GYMIN) { m_intGY = GYMIN; }
		if (m_intGY > GYMAX) { m_intGY = GYMAX; }
		placeGuns();
		if (m_intCool > 0) { m_intCool--; }
		if (fireDown() && (m_intCool === 0) && (m_intLives > 0) && (m_intHitT < 30))
		{
			bulShot(m_arrGunX[0], 36, 0, 9);
			bulShot(m_arrGunX[1], 172, 0, -9);
			bulShot(20, m_arrGunY[2], 9, 0);
			bulShot(236, m_arrGunY[3], -9, 0);
			m_intCool = 6;
			sfx(0, 22, 3, 9, 4, 0);
		}
	}

	function placeGuns()
	{
		m_arrGunX[0] = m_intGX; m_arrGunY[0] = 24;
		m_arrGunX[1] = 256 - m_intGX; m_arrGunY[1] = 184;			// the bottom gun goes the other way
		m_arrGunX[2] = 8; m_arrGunY[2] = m_intGY;
		m_arrGunX[3] = 248; m_arrGunY[3] = 208 - m_intGY;			// the right gun goes the other way
	}

	// the guns turned to face in: top as drawn, bottom flipped, the sides turned; the four sights where
	// the lines cross
	function drawGuns()
	{
		var intK, arrFlags = [0, SPRITE_MIRRORY, SPRITE_ROTATE | SPRITE_MIRRORX, SPRITE_ROTATE];
		for (intK = 0; intK <= 3; intK++)
		{
			if ((m_intLives > 0) && ((m_intHitT & 4) === 0))
			{
				sprPut(SP_GUN + intK, m_arrGunX[intK] + 24, m_arrGunY[intK] + 24, 'row0', G.S_GUN.col + 1, 0, 1, arrFlags[intK]);
			}
			else
			{
				m_objSlots.hide(SP_GUN + intK);
			}
		}
		sprPut(SP_CROSS, m_arrGunX[0] + 24, m_arrGunY[2] + 24, 'row0', G.S_CROSS.col + 1, 0, 1, 0);
		sprPut(SP_CROSS2, m_arrGunX[0] + 24, m_arrGunY[3] + 24, 'row0', G.S_CROSS.col + 1, 0, 1, 0);
		sprPut(SP_CROSS2 + 1, m_arrGunX[1] + 24, m_arrGunY[2] + 24, 'row0', G.S_CROSS.col + 1, 0, 1, 0);
		sprPut(SP_CROSS2 + 2, m_arrGunX[1] + 24, m_arrGunY[3] + 24, 'row0', G.S_CROSS.col + 1, 0, 1, 0);
	}

	// a gun hit by a fireball, or by the gun opposite's laser (they line up in the middle)
	function gunHits()
	{
		var intK, intH;
		for (intK = 0; intK <= 3; intK++)
		{
			intH = bulHits(BOXGUN + intK);
			if (bulNear(m_arrGunX[intK], m_arrGunY[intK]) > 0) { intH++; }
			if (intH > 0) { loseLife(intK); }
			bulBox(BOXGUN + intK, m_arrGunX[intK], m_arrGunY[intK], 7, 7);
		}
	}

	// any gun hit: a life gone; the demons and fireballs cleared
	function loseLife(intG_a)
	{
		var intM;
		if ((m_intHitT === 0) && (m_intLives > 0))
		{
			m_intLives--; showLives();
			m_intHitT = 90;
			boom(m_arrGunX[intG_a], m_arrGunY[intG_a], 1);
			bulClear();
			for (intM = 0; intM < NE; intM++)
			{
				if (m_arrEK[intM] !== 0)
				{
					boom(idiv(m_arrEX[intM], 16), idiv(m_arrEY[intM], 16), 0);
					m_arrEK[intM] = 0; bulOff(intM); m_objSlots.hide(SP_EN + intM);
				}
			}
			m_intDemonCount = 0;
			sfx(2, 31, 0, 15, 60, 1);
			sfx(1, 300, 10, 15, 40, 0);
			if (m_intLives > 0) { message('A GUN IS HIT!', 17, 80); }
		}
	}

	// ====================================================================================================
	// THE GATES

	function gates()
	{
		var intN, intH, intFl, intM, intKd, intR;
		for (intN = 0; intN < NG; intN++)
		{
			if (m_arrGOn[intN] !== 0)
			{
				intH = bulHits(BOXGATE + intN);
				if (intH > 0)
				{
					m_arrGHP[intN] -= intH; m_arrGFl[intN] = 1;
					addScore(10 * intH);
					sfx(1, 50, -3, 11, 4, 0);
					if (m_arrGHP[intN] <= 0)
					{
						m_arrGOn[intN] = 0; m_intGatesOpen--; showGates();
						bulOff(BOXGATE + intN);
						m_objSlots.hide(SP_GATE + intN);
						boom(m_arrGTX[intN], m_arrGTY[intN], 1);
						boom(m_arrGTX[intN] - 12, m_arrGTY[intN] - 10, 0);
						boom(m_arrGTX[intN] + 12, m_arrGTY[intN] + 8, 0);
						addScore(1000 * m_intWave);
						sfx(2, 31, 0, 15, 50, 1);
						sfx(0, 500, -12, 15, 40, 0);
					}
				}
				if (m_arrGOn[intN] !== 0)
				{
					// hit: it glows red-hot for a frame (and stays red-hot when nearly shut)
					intFl = ((m_arrGFl[intN] !== 0) || (m_arrGHP[intN] * 3 < m_arrGMax[intN])) ? 2 : 0;
					m_arrGFl[intN] = 0;
					sprAnim(SP_GATE + intN, m_arrGTX[intN] + 16, m_arrGTY[intN] + 16, 'gate', intFl, 2, false);
					bulBoxSprite(BOXGATE + intN, SP_GATE + intN);
					// it sends out a demon now and then
					m_arrGSpawn[intN]--;
					if (m_arrGSpawn[intN] <= 0)
					{
						intR = 120 - m_intWave * 10;
						if (intR < 40) { intR = 40; }
						m_arrGSpawn[intN] = intR + rnd(50);
						intR = rnd(10);
						intKd = K_IMP;
						if ((m_intWave >= 2) && (intR >= 6)) { intKd = K_WRAITH; }
						if ((m_intWave >= 3) && (intR === 8)) { intKd = K_SKULL; }
						if ((m_intWave >= 4) && (intR === 9)) { intKd = K_FIEND; }
						intM = spawn(intKd, m_arrGTX[intN], m_arrGTY[intN]);
						if (m_intWave >= 5) { intM = spawn(K_IMP, m_arrGTX[intN], m_arrGTY[intN]); }
						if (intM >= 0) { sfx(2, 200, -8, 12, 16, 0); }
					}
				}
			}
		}
	}

	// ====================================================================================================
	// THE DEMONS

	// a demon of kind kd out of a gate at x, y: its slot, or -1 when all 14 are out
	function spawn(intKd_a, intX_a, intY_a)
	{
		var intM, intG, intT, intResult = -1;
		for (intM = 0; (intM < NE) && (intResult < 0); intM++)
		{
			if (m_arrEK[intM] === 0)
			{
				m_arrEK[intM] = intKd_a; m_arrEX[intM] = intX_a * 16; m_arrEY[intM] = intY_a * 16; m_arrET[intM] = 0; m_arrEFl[intM] = 0;
				// it wants a gun that's still there
				intG = rnd(4);
				for (intT = 1; intT <= 4; intT++)
				{
					if (m_arrGAlive[intG] === 0) { intG = (intG + 1) & 3; }
				}
				m_arrETG[intM] = intG;
				m_arrEVX[intM] = rnd(33) - 16; m_arrEVY[intM] = rnd(33) - 16;
				if (intKd_a === K_IMP) { m_arrEHP[intM] = 1; }
				if (intKd_a === K_WRAITH) { m_arrEHP[intM] = 2; }
				if (intKd_a === K_SKULL)
				{
					m_arrEHP[intM] = 3; m_arrEVX[intM] = 20 + m_intWave * 2; m_arrEVY[intM] = 16 + m_intWave * 2;
					if (rnd(2) !== 0) { m_arrEVX[intM] = -m_arrEVX[intM]; }
				}
				if (intKd_a === K_FIEND) { m_arrEHP[intM] = 8; }
				m_intDemonCount++;
				// its look, its animation from the start (shown when the demons move, this frame)
				drawDemon(intM, intKd_a, intX_a, intY_a, 0, true);
				intResult = intM;
			}
		}
		return intResult;
	}

	// demon m (kind kd) at x, y, in palette row pal (1: the hit flash); its animation is the sprite's
	function drawDemon(intM_a, intKd_a, intX_a, intY_a, intPal_a, blnRestart_a)
	{
		var intN = SP_EN + intM_a;
		if (intKd_a === K_IMP)
		{
			sprAnim(intN, intX_a + 24, intY_a + 24, 'imp', intPal_a, 1, blnRestart_a);
		}
		else if (intKd_a === K_WRAITH)
		{
			sprAnim(intN, intX_a + 24, intY_a + 24, 'wraith', intPal_a, 1, blnRestart_a);
		}
		else if (intKd_a === K_SKULL)
		{
			sprAnim(intN, intX_a + 24, intY_a + 24, 'skull', intPal_a, 1, blnRestart_a);
		}
		else
		{
			sprAnim(intN, intX_a + 16, intY_a + 16, 'fiend', intPal_a, 2, blnRestart_a);
		}
	}

	function demons()
	{
		var intM, intKd, intX, intY, intH, intSp, intG, intA, intTX, intTY, blnAt;
		for (intM = 0; intM < NE; intM++)
		{
			intKd = m_arrEK[intM];
			if (intKd !== 0)
			{
				intX = idiv(m_arrEX[intM], 16); intY = idiv(m_arrEY[intM], 16);
				intG = m_arrETG[intM];
				if (m_arrGAlive[intG] === 0)
				{
					intG = (intG + 1) & 3;
					m_arrETG[intM] = intG;
				}
				intTX = m_arrGunX[intG]; intTY = m_arrGunY[intG];
				intSp = 20 + m_intWave * 3;
				if (intKd === K_IMP)
				{
					// homes in, wobbling
					m_arrEVX[intM] += (intTX > intX) ? 2 : -2;
					m_arrEVY[intM] += (intTY > intY) ? 2 : -2;
					m_arrEVX[intM] = clamp(m_arrEVX[intM], intSp); m_arrEVY[intM] = clamp(m_arrEVY[intM], intSp);
				}
				else if (intKd === K_WRAITH)
				{
					// straight at it, faster, swaying
					m_arrEVX[intM] += (intTX > intX) ? 4 : -4;
					m_arrEVY[intM] += (intTY > intY) ? 4 : -4;
					m_arrEVX[intM] = clamp(m_arrEVX[intM], intSp + 10); m_arrEVY[intM] = clamp(m_arrEVY[intM], intSp + 10);
				}
				else if (intKd === K_SKULL)
				{
					// bounces round the whole arena, spitting now and then
					if (((intX < 12) && (m_arrEVX[intM] < 0)) || ((intX > 244) && (m_arrEVX[intM] > 0))) { m_arrEVX[intM] = -m_arrEVX[intM]; }
					if (((intY < 28) && (m_arrEVY[intM] < 0)) || ((intY > 180) && (m_arrEVY[intM] > 0))) { m_arrEVY[intM] = -m_arrEVY[intM]; }
					if ((m_arrET[intM] % 120) === 119) { spit(intX, intY, intG); }
				}
				else
				{
					// drifts slowly, spitting fire
					m_arrEVX[intM] += (intTX > intX) ? 1 : -1;
					m_arrEVY[intM] += (intTY > intY) ? 1 : -1;
					m_arrEVX[intM] = clamp(m_arrEVX[intM], 8); m_arrEVY[intM] = clamp(m_arrEVY[intM], 8);
					if ((m_arrET[intM] % 70) === 69) { spit(intX, intY, intG); }
				}
				m_arrEX[intM] += m_arrEVX[intM]; m_arrEY[intM] += m_arrEVY[intM];
				m_arrET[intM]++;
				intX = idiv(m_arrEX[intM], 16); intY = idiv(m_arrEY[intM], 16);
				if (intX < 4) { intX = 4; m_arrEX[intM] = 64; }
				if (intX > 251) { intX = 251; m_arrEX[intM] = 251 * 16; }
				if (intY < 20) { intY = 20; m_arrEY[intM] = 320; }
				if (intY > 187) { intY = 187; m_arrEY[intM] = 187 * 16; }
				// shot
				intH = bulHits(intM);
				if (intH > 0)
				{
					m_arrEHP[intM] -= intH; m_arrEFl[intM] = 1;
					if (m_arrEHP[intM] <= 0)
					{
						killDemon(intM, intKd, intX, intY);
						intKd = 0;
					}
				}
				if (intKd !== 0)
				{
					// at a gun (its middle within 10 of the gun's, shown or flashing): the gun and the
					// demon both go
					blnAt = false;
					for (intA = 0; (intA <= 3) && !blnAt; intA++)
					{
						if ((m_arrGAlive[intA] !== 0) && (Math.abs(intX - m_arrGunX[intA]) < 11) && (Math.abs(intY - m_arrGunY[intA]) < 11))
						{
							blnAt = true;
							loseLife(intA);
							if (m_arrEK[intM] !== 0)
							{
								m_arrEK[intM] = 0; m_intDemonCount--; bulOff(intM); m_objSlots.hide(SP_EN + intM);
							}
							boom(intX, intY, 0);
							intKd = 0;
						}
					}
				}
				if (intKd !== 0)
				{
					drawDemon(intM, intKd, intX, intY, (m_arrEFl[intM] !== 0) ? 1 : 0, false);
					m_arrEFl[intM] = 0;
					bulBoxSprite(intM, SP_EN + intM);
				}
			}
		}
	}

	function clamp(intV_a, intLim_a)
	{
		var intResult = intV_a;
		if (intV_a > intLim_a)
		{
			intResult = intLim_a;
		}
		else if (intV_a < -intLim_a)
		{
			intResult = -intLim_a;
		}
		return intResult;
	}

	// a fireball from x, y at gun g
	function spit(intX_a, intY_a, intG_a)
	{
		var intSp;
		if (m_arrGAlive[intG_a] !== 0)
		{
			intSp = 16 + m_intWave * 2;
			if (intSp > 36) { intSp = 36; }
			bulFire(intX_a, intY_a, bulAim(intX_a, intY_a, m_arrGunX[intG_a], m_arrGunY[intG_a]), intSp, G.S_FIRE.col + 1, 0);
			sfx(2, 80, 4, 11, 10, 1);
		}
	}

	function killDemon(intM_a, intKd_a, intX_a, intY_a)
	{
		m_arrEK[intM_a] = 0; m_intDemonCount--;
		bulOff(intM_a);
		m_objSlots.hide(SP_EN + intM_a);
		if (intKd_a === K_FIEND)
		{
			boom(intX_a, intY_a, 1);
			addScore(500);
		}
		else
		{
			boom(intX_a, intY_a, 0);
			if (intKd_a === K_IMP) { addScore(100); }
			if (intKd_a === K_WRAITH) { addScore(150); }
			if (intKd_a === K_SKULL) { addScore(200); }
		}
		sfx(1, 20, 1, 13, 12, 1);
	}

	// ====================================================================================================
	// EXPLOSIONS

	function boom(intX_a, intY_a, intBig_a)
	{
		m_arrBX[m_intBNext] = intX_a; m_arrBY[m_intBNext] = intY_a; m_arrBT[m_intBNext] = 16; m_arrBBig[m_intBNext] = intBig_a;
		m_intBNext = (m_intBNext + 1) & 7;
	}

	// each explosion's sprite: put and started on its first frame (its sequence does the rest), gone
	// after 15 frames
	function booms()
	{
		var intN;
		for (intN = 0; intN < NB; intN++)
		{
			if (m_arrBT[intN] > 0)
			{
				m_arrBT[intN]--;
				if (m_arrBT[intN] === 0)
				{
					m_objSlots.hide(SP_BOOM + intN);
				}
				else if (m_arrBT[intN] === 15)
				{
					if (m_arrBBig[intN] !== 0)
					{
						sprAnim(SP_BOOM + intN, m_arrBX[intN] + 16, m_arrBY[intN] + 16, 'boom', 0, 2, true);
					}
					else
					{
						sprAnim(SP_BOOM + intN, m_arrBX[intN] + 24, m_arrBY[intN] + 24, 'boom', 0, 1, true);
					}
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
		if (m_blnLoaded)
		{
			switch (m_strState)
			{
				case 'title': titleFrame(); break;
				case 'release': releaseFrame(); break;
				case 'wave': waveFrame(); break;
				case 'over': overFrame(); break;
				default: break;
			}
		}
		m_objSound.update();
	};

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
		if (m_blnLoaded)
		{
			// the arena (Layer 2), the HUD and the words over it, the sprites over them (cut to the
			// arena below the HUD)
			objContext_a.drawImage(m_objSprites.getImageByName('gates_arena'), 32, 32);
			m_objGrid.paint(objContext_a, 0, 0);
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite for one row of the sprite sheet (frame n: column n - 1), or for a thing with
	// its own animation (sequence, delay) and hit box (hbw x hbh about its middle; 0: none)
	function sprite(strName_a, intCol_a, intRow_a, arrSequence_a, intDelay_a, intHBW_a, intHBH_a)
	{
		return { name:strName_a, classes:'gates', imagename:IMG + '0', x:0, y:0, w:16, h:16, imagex:intCol_a * 16, imagey:intRow_a * 16, imagew:16, imageh:16,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'hb', hbx:0, hby:0, hbsize:0, hbw:intHBW_a, hbh:intHBH_a };
	}

	function setup()
	{
		var intK, arrLib = [];
		for (intK = 0; intK <= 3; intK++)
		{
			m_arrGAlive.push(1); m_arrGunX.push(0); m_arrGunY.push(0);
		}
		for (intK = 0; intK < NG; intK++)
		{
			m_arrGOn.push(0); m_arrGTX.push(0); m_arrGTY.push(0); m_arrGHP.push(0); m_arrGMax.push(0); m_arrGSpawn.push(0); m_arrGFl.push(0);
		}
		for (intK = 0; intK < NE; intK++)
		{
			m_arrEK.push(0); m_arrEX.push(0); m_arrEY.push(0); m_arrEVX.push(0); m_arrEVY.push(0);
			m_arrEHP.push(0); m_arrET.push(0); m_arrETG.push(0); m_arrEFl.push(0);
		}
		for (intK = 0; intK < NB; intK++)
		{
			m_arrBX.push(0); m_arrBY.push(0); m_arrBT.push(0); m_arrBBig.push(0);
		}
		for (intK = 0; intK < NBOX; intK++)
		{
			m_arrBoxOn.push(false); m_arrBoxX.push(0); m_arrBoxY.push(0); m_arrBoxW.push(0); m_arrBoxH.push(0); m_arrBoxHits.push(0);
		}
		// the sheet's first row (the gun, the sight, the shot, the fireball as frames); the gates
		// turning (twice the size: a shot hits within 15 of the middle), the demons with their two
		// frames each (a shot hits within 8, a fire fiend - twice the size - within 14), the explosion
		arrLib.push(sprite('row0', 0, 0, undefined, 1, 0, 0));
		arrLib.push(sprite('gate', G.S_GATE.col, G.S_GATE.row, [1, 2, 3, 4, -1], 4, 15, 15));
		arrLib.push(sprite('imp', G.S_IMP.col, G.S_IMP.row, [1, 2, -1], 4, 16, 16));
		arrLib.push(sprite('wraith', G.S_WRAITH.col, G.S_WRAITH.row, [1, 2, -1], 6, 16, 16));
		arrLib.push(sprite('skull', G.S_SKULL.col, G.S_SKULL.row, undefined, 1, 16, 16));
		arrLib.push(sprite('fiend', G.S_FIEND.col, G.S_FIEND.row, [1, 2, -1], 10, 14, 14));
		arrLib.push(sprite('boom', G.S_BOOM.col, G.S_BOOM.row, BOOMSEQ, 1, 0, 0));
		m_objSprites.addSpritesToLibrary(arrLib);
	}

	this.run = function()
	{
		setup();
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addImagesToLibrary([ { name:'gates_arena', classes:'gates', source:'images/gates/arena.png' } ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:['gates_t0'], first:32, firstcode:32, transparent:0 });
		m_objSlots.setClip(32, 48, 256, 176);			// (the Next's sprite clip window: the arena below the HUD)
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE, fire2:K_M } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('gates'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			titleStart();
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new gatesGame();
g_objGame.run();
