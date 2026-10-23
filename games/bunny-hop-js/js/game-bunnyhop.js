// BUNNYHOP - ported from the ZX Spectrum Next version (NTC BASIC).
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Five bunnies to get home to the five burrows in the hedge at the top: across five lanes of
// traffic, then over a river on floating logs and the backs of turtles (some of which dive).
// Each hop forward is 10, each bunny home 50 and twice the seconds left on the clock, all five
// home 1000 and the next level, faster (and more traffic from level 3). Now and then a carrot
// turns up in a burrow: 200 more. 3 lives, one more at 10,000.
//
// Keys: Q A O P (or a game pad's stick): hop (hold it and it keeps hopping, a bit slower).
//       Space (or Enter, or the game pad's A): start.
// Touch (nothing drawn: invisible zones over the picture): the left part of the screen hops left,
//       the right part hops right, the middle hops up (its top two thirds) and down (its bottom
//       third). Hold a finger down and it keeps hopping. A touch anywhere starts.
//
// The screen is the Next's: the scenery, the lanes, the HUD and the words are the tile screen
// (JTileGrid), each cell in a palette row (a tile image per row) and mirrored for the cars going
// left. Each lane is a band of the tile screen that slides sideways on its own and wraps round
// (paintRows: the Next does it with the copper changing the tilemap's scroll at the top of each
// lane). Nothing in the lanes moves: only where each lane has got to. What's safe is a little map
// of each lane, looked up from the bunny's x and the lane's scroll. The bunny, the bunnies home
// and the carrot are numbered sprites, numbered as on the Next. The title's big letters are the
// Next's Layer 2. The game runs 50 iterations a second - the Next's frames.
//
// Moved from the Next: the title is 16 pixels higher (its last line was below the playing
// screen's bottom); the canvas is the playing screen, 320 x 240.
function bunnyhopGame()
{
	var m_objThis = this;
	var G = GFX_BUNNYHOP;

	// the part of the Next's 320 x 256 screen the game draws in (the tilemap covers the border
	// too: the lanes are the whole 320 across; the time bar is the last line, row 29): the canvas
	// is this and nothing more
	var VIEW = { x:0, y:0, w:320, h:240 };

	// keys (keyCodes)
	var K_Q = 81, K_A = 65, K_O = 79, K_P = 80, K_SPACE = 32, K_ENTER = 13;

	// touch: invisible zones over the picture (game coordinates), never drawn. Playing: the left
	// part hops left, the right part right, the middle up (top) and down (bottom). The title:
	// anywhere starts
	var ZONES_PLAY = [
		{ type:'zone', x:VIEW.x, y:VIEW.y, w:96, h:VIEW.h, key:K_O },
		{ type:'zone', x:VIEW.x + VIEW.w - 96, y:VIEW.y, w:96, h:VIEW.h, key:K_P },
		{ type:'zone', x:VIEW.x + 96, y:VIEW.y, w:VIEW.w - 192, h:160, key:K_Q },
		{ type:'zone', x:VIEW.x + 96, y:VIEW.y + 160, w:VIEW.w - 192, h:VIEW.h - 160, key:K_A } ];
	var ZONES_MENU = [ { type:'zone', x:VIEW.x, y:VIEW.y, w:VIEW.w, h:VIEW.h, key:K_SPACE } ];

	// text colours (tilemap palette rows 10-13); the scenery's row 0, logs and turtles 1, the cars 2-7
	var C_WHITE = 10, C_YELLOW = 11, C_CYAN = 12, C_PINK = 13;
	var P_LOGS = 1;
	// sprite slots: the bunny, the bunnies home (1-5), the carrot
	var SL_B = 0, SL_HOME = 1, SL_CARROT = 6;
	// the lanes' speeds in 16ths of a pixel a frame (+ right): 0-4 the road (from the bottom), 5-9 the river
	var SPEEDS = [-10, 12, -16, 26, -12, -12, 10, 20, -14, 14];
	// the title is 16 pixels higher than the Next's (so it fits the playing screen)
	var TUP = 16;

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, 8);
	var m_objSteps = new JSteps();
	var m_objPad, m_objGrid;
	var m_blnLoaded = false, m_blnTitle = false;
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;

	// the lanes: speed, where it's got to (16ths of a pixel), its scroll (pixels); what's in each
	// 8-pixel column (0 nothing, 1 a vehicle, 2 floating, 3 a diving turtle) and where a turtle starts
	var m_arrSpd = [], m_arrOff = [], m_arrSX = [], m_arrKd = [], m_arrTs = [];
	// the bunny: its row (0 the start, 12 the burrows), x, x's 16ths, way (0 up, 1 right, 2 down,
	// 3 left), the hop's frames left, the furthest row up, the key held, the repeat's count
	var m_intPr = 0, m_intPx = 0, m_intPxf = 0, m_intPdir = 0, m_intHopT = 0, m_intBest = 0, m_intWasKey = 0, m_intKeyT = 0;
	var m_blnDead = false, m_intHow = 0;
	var m_arrHome = [0, 0, 0, 0, 0], m_intHomes = 0, m_intCarrot = -1, m_intCarrotT = 0;
	var m_intScore = 0, m_intHigh = 5000, m_intLives = 3, m_intLevel = 1, m_intTleft = 60, m_intSec = 0, m_intNextLife = 10000;
	var m_intFrames = 0, m_intSwim = 0, m_intDive = 0;
	var m_blnOver = false;

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

	// the way pressed: -1 none, 0 up, 1 right, 2 down, 3 left (the last one tested wins, as the Next's)
	function way()
	{
		var intResult = -1;
		if (down(K_Q)) { intResult = 0; }
		if (down(K_A)) { intResult = 2; }
		if (down(K_O)) { intResult = 3; }
		if (down(K_P)) { intResult = 1; }
		return intResult;
	}

	function fire()
	{
		return down(K_SPACE) || down(K_ENTER);
	}

	function sfx(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVol_a, intFrames_a, intNoise_a === 1);
	}

	function text(intX_a, intY_a, str_a, intRow_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, intRow_a);
	}

	function six(int_a)
	{
		return rightStr('000000' + String(int_a), 6);
	}

	// sprite n: a library sprite (frame undefined: its animation's)
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intScale_a, intFlags_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, 'bunnyhop_s0', intScale_a, intFlags_a);
	}

	// a frame of the Next: its frame counter is a 16-bit Integer, and it wraps round as the Next's
	// does (after 11 minutes it goes negative; see the turtles)
	function tick()
	{
		m_intFrames++;
		if (m_intFrames > 32767) { m_intFrames -= 65536; }
	}

	// WaitF t: t frames of the lanes sliding (an until that ticks, or says it's done without ticking)
	function waitF(intT_a)
	{
		var intLeft = intT_a;
		m_objSteps.until(function()
		{
			var blnDone = (intLeft <= 0);
			if (!blnDone)
			{
				slide();
				tick();
				intLeft--;
			}
			return blnDone;
		});
	}

	// ====================================================================================================
	// THE TITLE

	function titleScr()
	{
		m_objSlots.hideRange(0, 8);
		lanesOff();
		m_objGrid.clear();
		m_blnTitle = true;
		text(6, 17 - 2, 'GET FIVE BUNNIES HOME TO THEIR', C_WHITE);
		text(6, 18 - 2, 'BURROWS: OVER THE ROAD, THEN', C_WHITE);
		text(6, 19 - 2, 'ACROSS THE RIVER ON THE LOGS', C_WHITE);
		text(6, 20 - 2, 'AND THE TURTLES\' BACKS.', C_WHITE);
		text(6, 22 - 2, 'WATCH THE TURTLES: SOME DIVE.', C_CYAN);
		text(6, 23 - 2, 'A CARROT IN A BURROW: 200.', C_CYAN);
		text(6, 25 - 2, 'Q A O P: HOP', C_YELLOW);
		text(6, 27 - 2, 'HIGH SCORE ' + six(m_intHigh), C_PINK);
		text(6, 29 - 2, 'SPACE: START', C_YELLOW);
		text(8, 31 - 2, '(C) 2026 CYBORG UNICORN', C_WHITE);
		// the bunny hops on the spot (its sprite's own hop and its mover), the carrot beside it
		spr(SL_B, 248, 88 - TUP, 'titlebunny', undefined, 2, 0);
		m_objSlots.animate(SL_B, 1, true);
		m_objSlots.setMover(SL_B, titleHop);
		spr(SL_CARROT, 200, 98 - TUP, 'carrot', 1, 2, 0);
		m_objPad.setControls(ZONES_MENU);
		m_objSteps.until(function()
		{
			var blnDone = fire();
			if (!blnDone)
			{
				tick();
			}
			return blnDone;
		});
		m_objSteps.until(function()
		{
			var blnDone = !fire();
			if (!blnDone)
			{
				tick();
			}
			return blnDone;
		});
		m_objSteps.call(function()
		{
			m_objSlots.hideRange(0, 8);
			m_blnTitle = false;
		});
	}

	// the title's bunny: every 60 frames it hops up 16 pixels (its sequence has it stretched for those 8)
	function titleHop(intN_a, objO_a)
	{
		var intA = objO_a.t % 60;
		objO_a.y = 88 - TUP;
		if (intA < 8) { objO_a.y = 104 - TUP - intA * 2; }
		return false;
	}

	// ====================================================================================================
	// A GAME

	function game()
	{
		m_intScore = 0; m_intLives = 3; m_intLevel = 1; m_intNextLife = 10000;
		newLevel();
		m_objPad.setControls(ZONES_PLAY);
		playBunny();
	}

	// the end of a bunny's go: game over, all five home, or the next bunny (playBunny)
	function bunnyOver()
	{
		var intK;
		if (m_intLives === 0)
		{
			text(15, 15, 'GAME  OVER', C_PINK);
			sfx(0, 500, 20, 14, 60, 0);
			m_objPad.setControls(ZONES_MENU);
			waitF(150);
			m_objSteps.call(lanesOff);
		}
		else
		{
			// all five home
			points(1000);
			text(15, 15, 'WELL DONE!', C_YELLOW);
			for (intK = 0; intK <= 5; intK++)
			{
				m_objSteps.call(wellDoneNote(intK));
				waitF(8);
			}
			waitF(60);
			m_objSteps.call(function()
			{
				m_intLevel++;
				newLevel();
				playBunny();
			});
		}
	}

	function wellDoneNote(intK_a)
	{
		return function()
		{
			sfx(0, 150 - intK_a * 15, 0, 13, 8, 0);
		};
	}

	// the lanes for this level: what's in them and how fast they go
	function newLevel()
	{
		var intI, intK, intL;
		m_objGrid.clear();
		m_objSlots.hideRange(0, 8);
		for (intI = 0; intI <= 4; intI++)
		{
			m_arrHome[intI] = 0;
		}
		m_intHomes = 0; m_intCarrot = -1; m_intCarrotT = 300;
		// the hedge and the burrows, the verges
		for (intI = 0; intI <= 39; intI++)
		{
			m_objGrid.put(intI, 2, G.T_HEDGE, 0); m_objGrid.put(intI, 3, G.T_HEDGE + 1, 0);
			m_objGrid.put(intI, 14, G.T_GRASS, 0); m_objGrid.put(intI, 15, G.T_GRASS + 1, 0);
			m_objGrid.put(intI, 26, G.T_GRASS + 1, 0); m_objGrid.put(intI, 27, G.T_GRASS, 0);
		}
		for (intK = 0; intK <= 4; intK++)
		{
			for (intI = 0; intI <= 1; intI++)
			{
				m_objGrid.put(3 + intK * 8 + intI, 2, G.T_BAY, 0); m_objGrid.put(3 + intK * 8 + intI, 3, G.T_BAY + 1, 0);
			}
		}
		// the lanes, faster each level
		for (intL = 0; intL <= 9; intL++)
		{
			m_arrSpd[intL] = SPEEDS[intL] + idiv(SPEEDS[intL] * (m_intLevel - 1), 4);
			m_arrOff[intL] = 0;
			m_arrSX[intL] = 0;
			fillLane(intL);
		}
		hud();
	}

	// the tile row a lane starts on
	function laneRow(intL_a)
	{
		var intResult = 12 - (intL_a - 5) * 2;
		if (intL_a < 5) { intResult = 24 - intL_a * 2; }
		return intResult;
	}

	// lane l's things: what kind, where they start (8-pixel columns), and the background
	function fillLane(intL_a)
	{
		var intR = laneRow(intL_a);
		var intC, intJ, intW, intT, str, ch;
		for (intC = 0; intC <= 39; intC++)
		{
			if (intL_a < 5)
			{
				m_objGrid.put(intC, intR, G.T_ROAD, 0); m_objGrid.put(intC, intR + 1, G.T_ROAD + 1, 0);
			}
			else
			{
				m_objGrid.put(intC, intR, G.T_WATER, P_LOGS); m_objGrid.put(intC, intR + 1, G.T_WATER + 1, P_LOGS);
			}
			m_arrKd[intL_a * 40 + intC] = 0; m_arrTs[intL_a * 40 + intC] = 0;
		}
		// a = car, t = tractor, r = racing car, T = truck, s / m / L = a short / middle / long log,
		// 2 / 3 = two or three turtles (d, e: ones that dive)
		switch (intL_a)
		{
			case 0: str = 'a...........a...........a.....a.........'; break;
			case 1: str = '....t.............t...........t.........'; break;
			case 2: str = '........a...................a...........'; break;
			case 3: str = '....................r...................'; break;
			case 4: str = '..T...................T.................'; break;
			case 5: str = '3...........3...........d...............'; break;
			case 6: str = '..s...........s.............s...........'; break;
			case 7: str = '.....L....................L.............'; break;
			case 8: str = '...2..........e...........2.....2.......'; break;
			default: str = 'm.............m.............m...........'; break;
		}
		// more traffic on later levels
		if ((m_intLevel >= 3) && (intL_a === 3)) { str = '....................r.........r.........'; }
		if ((m_intLevel >= 4) && (intL_a === 2)) { str = '........a.........a.........a...........'; }
		for (intC = 0; intC <= 39; intC++)
		{
			ch = str.charAt(intC);
			switch (ch)
			{
				case 'a': thing(intL_a, intC, G.T_CAR, 2, 2 + (intC % 4)); break;
				case 't': thing(intL_a, intC, G.T_TRACTOR, 2, 7); break;
				case 'r': thing(intL_a, intC, G.T_RACER, 2, 3); break;
				case 'T': thing(intL_a, intC, G.T_TRUCK, 4, 6); break;
				case 's': logAt(intL_a, intC, 3); break;
				case 'm': logAt(intL_a, intC, 5); break;
				case 'L': logAt(intL_a, intC, 8); break;
				case '2':
				case '3':
				case 'd':
				case 'e':
					intW = 3;
					if ((ch === '2') || (ch === 'e')) { intW = 2; }
					intT = 2;
					if ((ch === 'd') || (ch === 'e')) { intT = 3; }
					for (intJ = 0; intJ < intW; intJ++)
					{
						turtle(intL_a, intC + intJ * 2, G.T_TURTLE);
						m_arrKd[intL_a * 40 + (intC + intJ * 2) % 40] = intT;
						m_arrKd[intL_a * 40 + (intC + intJ * 2 + 1) % 40] = intT;
						m_arrTs[intL_a * 40 + (intC + intJ * 2) % 40] = intT;
					}
					break;
				default: break;
			}
		}
	}

	// a car / truck (w tiles wide, palette row p) at column c of lane l, facing the way the lane
	// goes (going left: the tiles mirrored, in the other order)
	function thing(intL_a, intC_a, intT_a, intW_a, intP_a)
	{
		var intR = laneRow(intL_a);
		var intFlags = 0;
		var intJ, intQ;
		if (SPEEDS[intL_a] < 0) { intFlags = SPRITE_MIRRORX; }
		for (intJ = 0; intJ < intW_a; intJ++)
		{
			intQ = intJ;
			if (intFlags !== 0) { intQ = intW_a - 1 - intJ; }
			m_objGrid.put((intC_a + intJ) % 40, intR, intT_a + intQ, intP_a, intFlags);
			m_objGrid.put((intC_a + intJ) % 40, intR + 1, intT_a + intW_a + intQ, intP_a, intFlags);
			m_arrKd[intL_a * 40 + (intC_a + intJ) % 40] = 1;
		}
	}

	// a log n tiles long at column c of river lane l
	function logAt(intL_a, intC_a, intN_a)
	{
		var intR = laneRow(intL_a);
		var intJ, intT, intX;
		for (intJ = 0; intJ < intN_a; intJ++)
		{
			intT = G.T_LOGM;
			if (intJ === 0) { intT = G.T_LOGL; }
			if (intJ === intN_a - 1) { intT = G.T_LOGR; }
			intX = (intC_a + intJ) % 40;
			m_objGrid.put(intX, intR, intT, P_LOGS); m_objGrid.put(intX, intR + 1, intT + 1, P_LOGS);
			m_arrKd[intL_a * 40 + intX] = 2;
		}
	}

	// two tiles of a turtle (picture t: swimming / sinking) at column c of lane l, facing its way
	function turtle(intL_a, intC_a, intT_a)
	{
		var intR = laneRow(intL_a);
		var intFlags = 0;
		var intJ, intQ;
		if (m_arrSpd[intL_a] < 0) { intFlags = SPRITE_MIRRORX; }
		for (intJ = 0; intJ <= 1; intJ++)
		{
			intQ = intJ;
			if (intFlags !== 0) { intQ = 1 - intJ; }
			m_objGrid.put((intC_a + intJ) % 40, intR, intT_a + intQ, P_LOGS, intFlags);
			m_objGrid.put((intC_a + intJ) % 40, intR + 1, intT_a + 2 + intQ, P_LOGS, intFlags);
		}
	}

	function hud()
	{
		text(1, 0, 'SCORE', C_WHITE);
		text(26, 0, 'HIGH', C_WHITE);
		text(31, 1, 'LEVEL' + strBasic(m_intLevel), C_CYAN);
		text(1, 29, 'TIME', C_YELLOW);
		scores();
		showLives();
	}

	function scores()
	{
		text(7, 0, six(m_intScore), C_YELLOW);
		if (m_intScore > m_intHigh) { m_intHigh = m_intScore; }
		text(31, 0, six(m_intHigh), C_YELLOW);
	}

	function showLives()
	{
		var intK;
		for (intK = 0; intK <= 5; intK++)
		{
			if (intK < m_intLives - 1)
			{
				m_objGrid.put(1 + intK, 1, G.T_LIFE, C_WHITE);
			}
			else
			{
				m_objGrid.put(1 + intK, 1, G.T_BLACK, 0);
			}
		}
	}

	function points(intN_a)
	{
		m_intScore += intN_a;
		if (m_intScore >= m_intNextLife)
		{
			m_intNextLife += 999999; m_intLives++; showLives();
			sfx(2, 80, -2, 14, 40, 0);
		}
		scores();
	}

	// the clock's bar: 30 cells for the whole time
	function timeBar()
	{
		var intF = m_intTleft * 4;
		var intJ, intT;
		for (intJ = 0; intJ <= 29; intJ++)
		{
			intT = intF - intJ * 8;
			if (intT > 8) { intT = 8; }
			if (intT < 0) { intT = 0; }
			m_objGrid.put(6 + intJ, 29, G.T_BAR + intT, 0);
		}
	}

	// ====================================================================================================
	// THE LANES SLIDE

	function slide()
	{
		var intL;
		for (intL = 0; intL <= 9; intL++)
		{
			m_arrOff[intL] -= m_arrSpd[intL];
			if (m_arrOff[intL] < 0) { m_arrOff[intL] += 5120; }
			if (m_arrOff[intL] >= 5120) { m_arrOff[intL] -= 5120; }
			m_arrSX[intL] = idiv(m_arrOff[intL], 16);
		}
	}

	// the lanes stopped, scrolled back to 0 (Lanes.Off)
	function lanesOff()
	{
		var intL;
		for (intL = 0; intL <= 9; intL++)
		{
			m_arrSX[intL] = 0;
		}
	}

	// the kind of thing at screen x in lane l: 0 nothing (road / water), 1 a vehicle, 2 floating,
	// 3 a diving turtle
	function kindAt(intL_a, intX_a)
	{
		var intC = idiv((intX_a + m_arrSX[intL_a]) % 320, 8);
		var intResult;
		if (intC < 0) { intC += 40; }
		intResult = m_arrKd[intL_a * 40 + intC];
		// a diving turtle under water is nothing to stand on
		if ((intResult === 3) && (m_intDive === 2)) { intResult = 0; }
		return intResult;
	}

	// the turtles paddle; the divers go down and come up
	function turtles()
	{
		var intL, intC, intT, intD, intR, intS;
		if (m_intFrames % 15 === 0)
		{
			m_intSwim = 1 - m_intSwim;
			intD = idiv(m_intFrames, 15) % 16;
			// the divers: up (0-9), sinking (10, 11), under (12, 13), coming up (14, 15)
			m_intDive = 0;
			if (intD >= 10) { m_intDive = 1; }
			if ((intD === 12) || (intD === 13)) { m_intDive = 2; }
			for (intL = 5; intL <= 9; intL++)
			{
				intR = laneRow(intL);
				for (intC = 0; intC <= 39; intC++)
				{
					intS = m_arrTs[intL * 40 + intC];
					if (intS !== 0)
					{
						intT = G.T_TURTLE + m_intSwim * 4;
						if ((intS === 3) && (m_intDive === 1)) { intT = G.T_TSINK; }
						if ((intS === 3) && (m_intDive === 2))
						{
							m_objGrid.put(intC, intR, G.T_WATER, P_LOGS); m_objGrid.put((intC + 1) % 40, intR, G.T_WATER, P_LOGS);
							m_objGrid.put(intC, intR + 1, G.T_WATER + 1, P_LOGS); m_objGrid.put((intC + 1) % 40, intR + 1, G.T_WATER + 1, P_LOGS);
						}
						else
						{
							turtle(intL, intC, intT);
						}
					}
				}
			}
			// the river ripples (a colour of palette row 1 turned)
			m_objGrid.setImage(P_LOGS, (m_intSwim === 1) ? 'bunnyhop_t1a' : 'bunnyhop_t1b');
		}
	}

	// ====================================================================================================
	// A BUNNY'S GO

	// a new bunny from the start, then its frames until it's lost or all five are home
	function playBunny()
	{
		var blnEnd = false;
		m_intPr = 0; m_intPx = 152; m_intPxf = 0; m_intPdir = 0; m_intHopT = 0; m_intBest = 0; m_blnDead = false;
		m_intTleft = 60; m_intSec = 0;
		timeBar();
		m_objSteps.until(function()
		{
			var blnDone = blnEnd;
			if (!blnEnd)
			{
				slide();
				turtles();
				bunny();
				carrots();
				tick();
				if (m_blnDead || (m_intHomes === 5))
				{
					blnEnd = true;
				}
				else
				{
					m_intSec++;
					if (m_intSec >= 50)
					{
						m_intSec = 0; m_intTleft--; timeBar();
						if (m_intTleft <= 10) { sfx(1, 100, 0, 10, 4, 0); }
						if (m_intTleft === 0) { m_blnDead = true; m_intHow = 0; }
					}
				}
			}
			else
			{
				if (m_blnDead)
				{
					die();
				}
				else
				{
					bunnyOver();
				}
			}
			return blnDone;
		});
	}

	// the bunny: hopping, riding, landing
	function bunny()
	{
		var intW, intL, intY, intF;
		if (m_intHopT > 0)
		{
			m_intHopT--;
			if (m_intPdir === 1) { m_intPx += 2; }
			if (m_intPdir === 3) { m_intPx -= 2; }
			if (m_intHopT === 0) { land(); }
		}
		else
		{
			intW = way();
			if (intW < 0)
			{
				m_intWasKey = 0;
			}
			else if ((m_intWasKey === 0) || (m_intKeyT <= 0))
			{
				// a hop: 8 frames, 16 pixels
				m_intPdir = intW; m_intHopT = 8; m_intKeyT = 12; m_intWasKey = 1;
				if ((intW === 0) && (m_intPr < 12)) { m_intPr++; }
				if (intW === 2)
				{
					if (m_intPr > 0)
					{
						m_intPr--;
					}
					else
					{
						m_intHopT = 0;
					}
				}
				if ((intW === 1) && (m_intPx > 288)) { m_intHopT = 0; }
				if ((intW === 3) && (m_intPx < 16)) { m_intHopT = 0; }
				if (m_intHopT > 0) { sfx(1, 300, -20, 9, 4, 0); }
			}
			m_intKeyT--;
			// on the river: carried along
			if ((m_intHopT === 0) && (m_intPr >= 7) && (m_intPr <= 11))
			{
				intL = m_intPr - 2;
				m_intPxf += m_arrSpd[intL];
				while (m_intPxf >= 16)
				{
					m_intPxf -= 16; m_intPx++;
				}
				while (m_intPxf <= -16)
				{
					m_intPxf += 16; m_intPx--;
				}
				if ((m_intPx < -6) || (m_intPx > 310)) { m_blnDead = true; m_intHow = 1; }
			}
			if (m_intHopT === 0) { check(); }
		}
		// the sprite: mid-hop it's stretched, up / down / left / right
		intY = (26 - m_intPr * 2) * 8;
		if (m_intHopT > 0)
		{
			if (m_intPdir === 0) { intY += m_intHopT * 2; }
			if (m_intPdir === 2) { intY -= m_intHopT * 2; }
		}
		intF = 1;
		if (m_intHopT > 0) { intF = 2; }
		switch (m_intPdir)
		{
			case 0: spr(SL_B, m_intPx, intY, 'bunny', intF, 1, 0); break;
			case 2: spr(SL_B, m_intPx, intY, 'bunny', intF, 1, SPRITE_MIRRORY); break;
			case 1: spr(SL_B, m_intPx, intY, 'bunnyside', intF, 1, 0); break;
			default: spr(SL_B, m_intPx, intY, 'bunnyside', intF, 1, SPRITE_MIRRORX); break;
		}
	}

	// landed: a new row forward scores; the burrows at the top
	function land()
	{
		var intK, intBX, blnFound = false;
		if (m_intPr > m_intBest)
		{
			m_intBest = m_intPr;
			points(10);
		}
		if (m_intPr === 12)
		{
			// which burrow (it has to be in line with one)
			for (intK = 0; (intK <= 4) && !blnFound; intK++)
			{
				intBX = 24 + intK * 64;
				if (Math.abs(m_intPx - intBX) <= 8)
				{
					blnFound = true;
					if (m_arrHome[intK] !== 0)
					{
						m_blnDead = true; m_intHow = 0;
					}
					else
					{
						m_arrHome[intK] = 1; m_intHomes++;
						spr(SL_HOME + intK, intBX, 16, 'home', 1, 1, 0);
						points(50 + m_intTleft * 2);
						if (m_intCarrot === intK)
						{
							points(200);
							m_intCarrot = -1; m_objSlots.hide(SL_CARROT);
						}
						sfx(0, 100, -4, 14, 20, 0);
						// the next bunny from the start
						m_intPr = 0; m_intPx = 152; m_intPxf = 0; m_intPdir = 0; m_intBest = 0; m_intTleft = 60; m_intSec = 0;
						timeBar();
					}
				}
			}
			if (!blnFound) { m_blnDead = true; m_intHow = 0; }
		}
	}

	// standing still (not mid-hop): anything to worry about?
	function check()
	{
		var intL;
		if ((m_intPr >= 1) && (m_intPr <= 5))
		{
			intL = m_intPr - 1;
			if ((kindAt(intL, m_intPx + 4) === 1) || (kindAt(intL, m_intPx + 11) === 1)) { m_blnDead = true; m_intHow = 0; }
		}
		else if ((m_intPr >= 7) && (m_intPr <= 11))
		{
			intL = m_intPr - 2;
			if (kindAt(intL, m_intPx + 8) < 2) { m_blnDead = true; m_intHow = 1; }
		}
	}

	// a carrot now and then in an empty burrow
	function carrots()
	{
		var intJ;
		m_intCarrotT--;
		if (m_intCarrotT <= 0)
		{
			if (m_intCarrot >= 0)
			{
				m_intCarrot = -1; m_objSlots.hide(SL_CARROT); m_intCarrotT = 400;
			}
			else
			{
				intJ = rnd(5);
				if (m_arrHome[intJ] === 0)
				{
					m_intCarrot = intJ; spr(SL_CARROT, 24 + intJ * 64, 16, 'carrot', 1, 1, 0);
					m_intCarrotT = 300;
				}
				else
				{
					m_intCarrotT = 50;
				}
			}
		}
	}

	// squashed (how 0) or in the river (1): the sprite plays its splat or splash for 40 frames
	// while the lanes go on, then it's gone; 20 frames more, then a life less
	function die()
	{
		var intY = (26 - m_intPr * 2) * 8;
		var intJ = 0;
		if (m_intHow === 1)
		{
			sfx(2, 20, 0, 14, 30, 1);
			spr(SL_B, m_intPx, intY, 'splash', undefined, 1, 0);
		}
		else
		{
			sfx(2, 60, 6, 15, 20, 1);
			spr(SL_B, m_intPx, intY, 'splat', undefined, 1, 0);
		}
		m_objSlots.animate(SL_B, 1, true);
		m_objSteps.until(function()
		{
			var blnDone = (intJ >= 40);
			if (!blnDone)
			{
				slide();
				turtles();
				tick();
				intJ++;
			}
			return blnDone;
		});
		m_objSteps.call(function() { m_objSlots.hide(SL_B); });
		waitF(20);
		m_objSteps.call(function()
		{
			m_intLives--;
			showLives();
			if (m_intLives === 0)
			{
				bunnyOver();
			}
			else
			{
				playBunny();
			}
		});
	}

	// ====================================================================================================
	// THE GAME LOOP: 50 iterations a second, as the Next's frames

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		if (m_blnLoaded)
		{
			m_objSteps.update();
			m_objSlots.step();
		}
		m_objSound.update();
	};

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		var intL;
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
		if (m_blnLoaded)
		{
			// Layer 2 (behind): the title's big letters, on the paper at 32, 32
			if (m_blnTitle)
			{
				m_objSprites.paintBigText(objContext_a, 'bunnyhop_ink', 'BUNNY', 32 + 16, 32 + 8 - TUP, 6, rgb332ToCSS(0xFF), rgb332ToCSS(0xF3), '#000', 2);
				m_objSprites.paintBigText(objContext_a, 'bunnyhop_ink', 'HOP', 32 + 80, 32 + 62 - TUP, 4, rgb332ToCSS(0x7D), rgb332ToCSS(0x34), '#000', 2);
			}
			// the tilemap: the still bands, and each lane slid to where it's got to
			m_objGrid.paintRows(objContext_a, 0, 0, 0, 4, 0);
			for (intL = 9; intL >= 5; intL--)
			{
				m_objGrid.paintRows(objContext_a, 0, 0, laneRow(intL), 2, m_arrSX[intL]);
			}
			m_objGrid.paintRows(objContext_a, 0, 0, 14, 2, 0);
			for (intL = 4; intL >= 0; intL--)
			{
				m_objGrid.paintRows(objContext_a, 0, 0, laneRow(intL), 2, m_arrSX[intL]);
			}
			m_objGrid.paintRows(objContext_a, 0, 0, 26, 6, 0);
			// the sprites on top
			m_objSlots.paint(objContext_a);
		}
		m_objPad.paint(objContext_a);
	};

	// a library sprite: where its frames are (frame n is n - 1 cells right), its animation
	function sprite(strName_a, objCell_a, arrSequence_a, intDelay_a)
	{
		return { name:strName_a, classes:'bunnyhop', imagename:'bunnyhop_s0', x:0, y:0, w:16, h:16, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:16, imageh:16,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'bb', hbx:0, hby:0, hbsize:16 };
	}

	this.run = function()
	{
		var intI;
		var arrRows = [];
		for (intI = 0; intI < 400; intI++)
		{
			m_arrKd.push(0); m_arrTs.push(0);
		}
		for (intI = 0; intI <= 9; intI++)
		{
			m_arrSpd.push(0); m_arrOff.push(0); m_arrSX.push(0);
		}
		// the tile images by palette row (rows 8 and 9 aren't used)
		for (intI = 0; intI <= 13; intI++)
		{
			arrRows.push(((intI === 8) || (intI === 9)) ? 'bunnyhop_t0' : 'bunnyhop_t' + intI);
		}
		m_objSprites.addImagesToLibrary(G.images);
		m_objSprites.addSpritesToLibrary([
			sprite('bunny', G.S_UP, [1, 0], 1),						// 1 sitting, 2 mid-hop (facing up)
			sprite('bunnyside', G.S_RIGHT, [1, 0], 1),					// the same facing right
			sprite('titlebunny', G.S_UP, [2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1], 2),	// a hop every 60 frames
			sprite('splat', G.S_SPLAT, [1, 2, 0], 20),					// squashed: 20 frames each
			sprite('splash', G.S_SPLASH, [1, 2, 3, -1], 8),				// in the river: round and round
			sprite('home', G.S_HOME, [1, 0], 1),
			sprite('carrot', G.S_CARROT, [1, 0], 1) ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:arrRows, first:32, firstcode:32, transparent:0 });
		m_objPad = new JPad({ controls:ZONES_MENU, showalways:false,
			gamepads:[ { index:0, keys:{ left:K_O, right:K_P, up:K_Q, down:K_A, fire:K_SPACE } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('bunnyhop'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			// the Next's main loop: the title, a game, round again
			m_objSteps.until(function()
			{
				m_objSteps.call(titleScr);
				m_objSteps.call(game);
				return false;
			});
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: VIEW.w, yresolution: VIEW.h, xorigin: VIEW.x, yorigin: VIEW.y, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new bunnyhopGame();
g_objGame.run();
