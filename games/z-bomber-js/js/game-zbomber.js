// Z-BOMBER - space strategy. Ported from the ZX Spectrum Next version (NTC BASIC, Main.bas) to PotentJS.
// (c) 2026 Cyborg Unicorn Pty Ltd
//
// Capture the flag across five sectors of the solar system, on an isometric board of 8 x 8 sectors.
// Both sides keep a STAR KEY in their home base: take theirs home while you keep yours. Between the
// battles the crew of the Z-BOMBER talk (their faces big on the right), and you choose how to get
// ready for the next sector.
//
// Keys: Q A O P or the arrows move the cursor a sector (the board is turned: Q up-right, A down-left,
// O up-left, P down-right); Space or Enter picks a fleet, then sends it; M sends all or half.
// Touch: tap a sector (your fleet: pick it; with one picked: send it there; its own sector: stay),
// or the pad and GO over the sky either side of the board; HALF (or the panel's top right) for all /
// half; tap to go on in a talk, tap an answer, tap a letter for your name. Game pad: the stick, A is
// GO, B is HALF.
//
// The port keeps the Next game's names and logic: every Sub of Main.bas is a function of the same
// name, every variable the BASIC one with the m_ and type prefixes (fo -> m_arrFo, zf -> m_intZf).
// The Next's hardware as every port has it:
//   - the tilemap (40 x 32, the panel and the text) is a JTileGrid
//   - the sprites are JSpriteSlots numbered as on the Next: each shows a library sprite that runs its
//     own animation (its sequence and delay: a frigate's engines, a key's glint, the cursor's blink)
//   - Layer 2 (256 x 192, the board) is an off-screen canvas drawn once a sector, put at 32, 32
//   - the canvas is the Next's 320 x 256 and nothing more; the pad and buttons go over the game
//   - Sfx is JSound (the same numbers as Sfx.Play)
// The Next's loops that wait (the title, the name, a talk, a battle's flashes) are states: the game
// loop calls onIterationGameLoop 50 times a second (one Next frame), and a state does one frame of
// its loop. A battle stops the clock at the fleet that arrived, and it goes on from the next fleet
// when the battle is over: the same order of events as the Next.
//
// The pictures: tools/nextgfx.py (the tiles and sprites: js/gfx-zbomber.js) and tools/jsexport.py
// (the board, the faces, the story: js/data-zbomber.js), from the Next game in assets/zbomber-next.
function zbomberGame()
{
	var m_objThis = this;

	// ================================================================================================
	// CONSTANTS (Main.bas's, GfxData's)

	var NF = 16;
	var MAXS = 99;
	// sprite slots: the cursor (2), the picked ring (2), the target, the keys (2), planets' flags (16),
	// the fleets (4 each), the battle (8)
	var SP_CUR = 0;
	var SP_PICK = 2;
	var SP_TGT = 4;
	var SP_KEY = 5;
	var SP_FLAG = 8;
	var SP_FL = 24;
	var SP_FX = 88;
	var NSLOTS = 128;
	// the sectors
	var T_SPACE = 0;
	var T_NEB = 1;
	var T_ROCK = 2;
	var T_RIFT = 3;
	var T_PLANET = 4;
	var T_BLUE = 7;
	var T_RED = 8;
	// the cast
	var K_YOU = 0;
	var K_YOON = 3;
	var BLUE = 1;
	var RED = 2;
	var G = GFX_ZBOMBER;
	// the tiles (GfxData.T_...)
	var T_PANEL = G.T_PANEL;
	var T_PANELT = G.T_PANELT;
	var T_PANELB = G.T_PANELB;
	var T_KEYB = G.T_KEYB;
	var T_KEYR = G.T_KEYR;
	var T_SHIPB = G.T_SHIPB;
	var T_SHIPR = G.T_SHIPR;
	// the story's scenes (Data.S_...)
	var S_PROLOGUE = 0;
	var S_M1IN = 1;
	var S_M1COMBINE = 2;
	var S_M1WIN = 3;
	var S_M1LOSE = 4;
	var S_ENDING = 21;
	var S_GAMEOVER = 22;
	// the keys (key codes)
	var KC_Q = 81;
	var KC_A = 65;
	var KC_O = 79;
	var KC_P = 80;
	var KC_M = 77;
	var KC_SPACE = 32;
	var KC_ENTER = 13;
	// the screen: the canvas is the Next's 320 x 256, all of it (JCanvas scales and turns it)
	var SCREENW = 320;
	var SCREENH = 256;
	// the touch controls in the play, over the sky either side of the board, clear of the panels and
	// the sectors (a talk, the title, the name and the end are played by tapping: no controls)
	var PLAYCONTROLS = [
		{ type:'dpad', x:34, y:188, size:22, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
		{ type:'button', x:298, y:171, size:13, key:32, label:'GO' },
		{ type:'button', x:298, y:201, size:13, key:77, label:'HALF' }
	];

	// ================================================================================================
	// THE GAME'S VARIABLES (Main.bas's)

	var m_strPName = '';
	var m_strLab0 = '';
	var m_strLab1 = '';
	var m_strMapName = '';
	var m_intSpk = -1;
	var m_intPicked = 0;
	var m_intFaceOn = -2;
	var m_intFast = 0;
	var m_intKeyT = 0;
	var m_intFirWas = 0;
	// the board: each sector's kind, who holds it, the BFS's working space
	var m_arrMt = [];
	var m_arrOwn = [];
	var m_arrDist = [];
	var m_arrQue = [];
	// fleets: side (0 none), sector, ships, target (-1 none), the next sector, frames to it, the
	// step's length, carrying a key
	var m_arrFo = [];
	var m_arrFs = [];
	var m_arrFn = [];
	var m_arrFt = [];
	var m_arrFx = [];
	var m_arrFw = [];
	var m_arrFd = [];
	var m_arrFk = [];
	// the keys (1 yours, 2 theirs): 0 at home, 1 carried (by fleet kf), 2 dropped (in sector kd)
	var m_arrKs = [0, 0, 0];
	var m_arrKf = [0, 0, 0];
	var m_arrKd = [0, 0, 0];
	var m_arrBaseS = [0, 0, 0];
	var m_arrProdT = [0, 0, 0];
	var m_arrProdN = [0, 0, 0];
	// the Z-BOMBER
	var m_intZf = -1;
	var m_intZhp = 0;
	var m_intZmax = 0;
	var m_intZpow = 0;
	var m_intZDown = 0;
	var m_intRefit = 0;
	var m_intExtra = 0;
	var m_intSector = 1;
	var m_intTries = 3;
	var m_intResult = 0;
	var m_intCombined = 0;
	var m_intBattles = 0;
	var m_intWon = 0;
	var m_intLost = 0;
	var m_intCur = 0;
	var m_intSel = -1;
	var m_intHalf = 0;
	var m_intFrames = 0;
	var m_intAiN = 0;
	var m_intMsgT = 0;
	var m_intHudT = 0;
	var m_intGarMin = 0;
	var m_intRaid = 0;
	// the tables (Tables)
	var m_arrSxT = [];
	var m_arrSyT = [];
	var m_arrRwT = [];
	var m_arrNbE = [];
	var m_arrNbW = [];
	var m_arrNbS = [];
	var m_arrNbN = [];
	var m_arrStarC = [255, 182, 109, 146, 73, 255];
	// the routes (Field)
	var m_arrFcache = [];
	var m_arrFcOK = [];
	var m_intFbase = 0;
	// drawing
	var m_arrFix = [];
	var m_arrFiy = [];
	var m_intFmax = 0;
	var m_intFlagsDirty = 0;

	// ================================================================================================
	// THE PORT'S OWN STATE (what the Next does by waiting in a loop)

	// what the game is doing: 'load', 'title', 'name', 'talk', 'play', 'bang', 'wait', 'theend'
	var m_strMode = 'load';
	// the title
	var m_intTitleY = 0;
	// the name entry
	var m_intNameCX = 0;
	var m_intNameCY = 0;
	// a talk: the scene's ops, where it is, what it's doing ('run', 'type', 'waitgo', 'choose', 'done'),
	// the page being typed, what comes after
	var m_arrTalkOps = [];
	var m_intTalkPc = 0;
	var m_strTalkStep = 'done';
	var m_arrTalkLines = [];
	var m_intTalkLine = 0;
	var m_intTalkChar = 0;
	var m_intTalkX = 3;
	var m_intTalkQ = 0;
	var m_blnTalkKeyCheck = false;
	var m_intSel2 = 0;
	var m_arrChoiceTargets = [];
	var m_cbTalk = null;
	// a battle: the clock stopped at a fleet's arrival while the talk and the flashes play
	var m_blnSuspended = false;
	var m_intResumeF = 0;
	var m_intBattleS = -1;
	var m_intBattleF = -1;
	var m_intBangJ = 0;
	var m_intBangN = 0;
	var m_intBangX = 0;
	var m_intBangY = 0;
	// WaitF
	var m_intWaitN = 0;
	var m_cbWait = null;
	// touch / mouse: this frame's tap (x, y on the 320 x 256 picture), or null
	var m_objTap = null;

	// ================================================================================================
	// POTENTJS

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objSlots = new JSpriteSlots(m_objSprites, NSLOTS);
	var m_objPad = null;
	var m_objGrid = null;
	var m_blnLoaded = false;
	var m_arrKeyMap = [];
	var m_objViewPort = null;
	var m_arrTouches = [];
	var m_objMouse = null;
	var m_objLayer2 = null;			// the board: 256 x 192
	var m_objLayer2Context = null;

	// ================================================================================================
	// HELPERS

	function Rnd(intN_a)
	{
		return rnd(intN_a);
	}

	// a key held: the keyboard, the pad or a game pad (the arrows turned with the screen)
	function isDown(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	function isTouch()
	{
		return m_objPad.isTouch();
	}

	// ================================================================================================
	// THE NEXT'S HARDWARE, AS THE GAME USES IT

	// ---- the sprites (Spr.cls's Put): slot n shows library sprite strName_a at x, y (the 320 x 256
	// picture) in sprite palette intPal_a (0 yours, 1 the Swarm's), intScale_a times the size.
	// intFrame_a: that frame, still; undefined: the frame it's on and its animation go on (a new
	// sprite in the slot starts on frame 1, still, until it's animated)
	function spr(intN_a, intX_a, intY_a, strName_a, intFrame_a, intPal_a, intScale_a)
	{
		m_objSlots.put(intN_a, intX_a, intY_a, strName_a, intFrame_a, 'zbomber_s' + intPal_a, intScale_a);
	}

	// slot n runs its sprite's sequence (carries on if it already is)
	function sprAnimate(intN_a)
	{
		m_objSlots.animate(intN_a, 1);
	}

	function SprHide(intN_a)
	{
		m_objSlots.hide(intN_a);
	}

	function SprHideRange(intFirst_a, intCount_a)
	{
		m_objSlots.hideRange(intFirst_a, intCount_a);
	}

	// ---- the face in a talk (Face.cls): cast member c with mouth mo, its top left at x, y, four times
	// the size (the Next's slots 0-16: one picture in slot 0 here)
	function FacePut(intC_a, intX_a, intY_a, intMo_a)
	{
		var intMo = intMo_a;

		if (intMo < 0)
		{
			intMo = g_arrZBLooks[intC_a][6];
		}
		m_objSlots.put(0, intX_a, intY_a - 16, 'face', intC_a * 6 + intMo + 1, undefined, 4);
	}

	function FaceHide()
	{
		m_objSlots.hide(0);
	}

	// ---- the tilemap (Tiles.cls)
	function TilesPut(intX_a, intY_a, intT_a)
	{
		m_objGrid.put(intX_a, intY_a, intT_a, 0);
	}

	function TilesFill(intT_a)
	{
		m_objGrid.rect(0, 0, 40, 32, intT_a, 0);
	}

	function TilesRect(intX_a, intY_a, intW_a, intH_a, intT_a)
	{
		m_objGrid.rect(intX_a, intY_a, intW_a, intH_a, intT_a, 0);
	}

	function TilesText(intX_a, intY_a, str_a)
	{
		m_objGrid.text(intX_a, intY_a, str_a, 0);
	}

	// ---- Layer 2 (Iso.cls)
	function IsoFill(intC_a)
	{
		m_objLayer2Context.fillStyle = rgb332ToCSS(intC_a);
		m_objLayer2Context.fillRect(0, 0, 256, 192);
	}

	function IsoPlot(intX_a, intY_a, intC_a)
	{
		m_objLayer2Context.fillStyle = rgb332ToCSS(intC_a);
		m_objLayer2Context.fillRect(intX_a, intY_a, 1, 1);
	}

	function IsoPic(intP_a, intX_a, intY_a)
	{
		m_objLayer2Context.drawImage(m_objSprites.getImageByName('zbomber_board'), intP_a * 32, 0, 32, 40, intX_a, intY_a, 32, 40);
	}

	// ---- the sound (Sfx.cls): JSound takes Sfx.Play's numbers
	function SfxPlay(intCh_a, intPeriod_a, intSlide_a, intVolume_a, intFrames_a, intNoise_a)
	{
		m_objSound.play(intCh_a, intPeriod_a, intSlide_a, intVolume_a, intFrames_a, intNoise_a !== 0);
	}

	function Blip()
	{
		SfxPlay(0, 120, -2, 12, 6, 0);
	}

	// ================================================================================================
	// THE SKY AND THE BOARD

	function Sky()
	{
		var intJ = 0;
		var intK = 0;

		IsoFill(1);
		for (intK = 0; intK <= 140; intK++)
		{
			IsoPlot(Rnd(256), Rnd(192), m_arrStarC[intJ]);
			intJ++;
			if (intJ === 6)
			{
				intJ = 0;
			}
		}
	}

	// Tables: the lookup tables (once, at the start)
	function Tables()
	{
		var intS = 0;
		var intV = 0;

		for (intS = 0; intS <= 63; intS++)
		{
			m_arrSxT[intS] = SX(intS);
			m_arrSyT[intS] = SY(intS);
			m_arrRwT[intS] = Math.floor(intS / 8);
			intV = Nb(intS, 0);
			m_arrNbE[intS] = (intV < 0) ? 255 : intV;
			intV = Nb(intS, 1);
			m_arrNbW[intS] = (intV < 0) ? 255 : intV;
			intV = Nb(intS, 2);
			m_arrNbS[intS] = (intV < 0) ? 255 : intV;
			intV = Nb(intS, 3);
			m_arrNbN[intS] = (intV < 0) ? 255 : intV;
			m_arrFcOK[intS] = 0;
			m_arrMt[intS] = T_SPACE;
			m_arrOwn[intS] = 0;
			m_arrDist[intS] = 255;
			m_arrQue[intS] = 0;
		}
		for (intS = 0; intS < 4096; intS++)
		{
			m_arrFcache[intS] = 255;
		}
		for (intS = 0; intS < NF; intS++)
		{
			m_arrFo[intS] = 0;
			m_arrFs[intS] = 0;
			m_arrFn[intS] = 0;
			m_arrFt[intS] = -1;
			m_arrFx[intS] = -1;
			m_arrFw[intS] = 0;
			m_arrFd[intS] = 1;
			m_arrFk[intS] = 0;
			m_arrFix[intS] = 0;
			m_arrFiy[intS] = 0;
		}
	}

	function SX(intS_a)
	{
		return 128 + ((intS_a & 7) - Math.floor(intS_a / 8)) * 16;
	}

	function SY(intS_a)
	{
		return 46 + ((intS_a & 7) + Math.floor(intS_a / 8)) * 8;
	}

	// the board's pictures, back to front
	function DrawBoard()
	{
		var intD = 0;
		var intC = 0;
		var intR = 0;
		var intS = 0;
		var intP = 0;

		Sky();
		for (intD = 0; intD <= 14; intD++)
		{
			for (intC = 0; intC <= 7; intC++)
			{
				intR = intD - intC;
				if ((intR >= 0) && (intR <= 7))
				{
					intS = intR * 8 + intC;
					intP = m_arrMt[intS];
					if (intP === T_PLANET)
					{
						intP = 4 + (intC * 3 + intR) % 3;
					}
					IsoPic(intP, m_arrSxT[intS] - 16, m_arrSyT[intS] - 24);
				}
			}
		}
	}

	// the sector's map: 8 rows of 8 (. space, n nebula, a asteroids, x a rift, p a planet, B you, R them)
	function LoadMap(intM_a)
	{
		var strMap = MapRow(intM_a);
		var intK = 0;
		var strCh = '';

		for (intK = 0; intK <= 63; intK++)
		{
			strCh = strMap.charAt(intK);
			m_arrOwn[intK] = 0;
			m_arrFcOK[intK] = 0;			// (the routes were for the last map)
			if (strCh === 'n')
			{
				m_arrMt[intK] = T_NEB;
			}
			else if (strCh === 'a')
			{
				m_arrMt[intK] = T_ROCK;
			}
			else if (strCh === 'x')
			{
				m_arrMt[intK] = T_RIFT;
			}
			else if (strCh === 'p')
			{
				m_arrMt[intK] = T_PLANET;
			}
			else if (strCh === 'B')
			{
				m_arrMt[intK] = T_BLUE;
				m_arrBaseS[BLUE] = intK;
			}
			else if (strCh === 'R')
			{
				m_arrMt[intK] = T_RED;
				m_arrBaseS[RED] = intK;
			}
			else
			{
				m_arrMt[intK] = T_SPACE;
			}
		}
	}

	// (the Next's MapRow gives a row at a time; here the whole map)
	function MapRow(intM_a)
	{
		var strResult = '.p.n.pxRp.a...x..n.x.p....p.n.a..a.n.p....p.x.n..x...a.pBx.p.n..';

		if (intM_a === 1)
		{
			strResult = '..p...aR.........n..p......a..p..p..a......p..n.........Ba...p..';
		}
		else if (intM_a === 2)
		{
			strResult = '.aa.p.aRa..a...a.p.aa.p.a..p..a..a..p..a.p.aa.p.a...a..aBa.p.aa.';
		}
		else if (intM_a === 3)
		{
			strResult = '..n.p.nR.n..x..np..n..p..x.p.n....n.p.x..p..n..pn..x..n.Bn.p.n..';
		}
		else if (intM_a === 4)
		{
			strResult = '..p..n.Rp...a.....ax.xa..a.p..x..x..p.a..ax.xa.....a...pBn..p...';
		}

		return strResult;
	}

	function SectorName(intM_a)
	{
		var strResult = 'THE HOLLOW THRONE';

		if (intM_a === 1)
		{
			strResult = 'MARS GATE';
		}
		else if (intM_a === 2)
		{
			strResult = 'THE BELT';
		}
		else if (intM_a === 3)
		{
			strResult = 'GANYMEDE';
		}
		else if (intM_a === 4)
		{
			strResult = 'THE RINGS';
		}

		return strResult;
	}

	// Field s: the steps from sector s to every sector (255: can't get there), kept in fcache from
	// fbase on: a breadth first search, done once for each target and kept until the map changes
	function Field(intS_a)
	{
		var intH = 0;
		var intE = 1;
		var intU = 0;
		var intD = 0;
		var intK = 0;
		var arrNb = [m_arrNbE, m_arrNbW, m_arrNbS, m_arrNbN];
		var intN = 0;
		var intV = 0;

		m_intFbase = intS_a * 64;
		if (m_arrFcOK[intS_a] === 0)
		{
			for (intK = 0; intK <= 63; intK++)
			{
				m_arrDist[intK] = 255;
			}
			m_arrDist[intS_a] = 0;
			m_arrQue[0] = intS_a;
			while (intH < intE)
			{
				intU = m_arrQue[intH];
				intH++;
				intD = m_arrDist[intU] + 1;
				for (intN = 0; intN < 4; intN++)
				{
					intV = arrNb[intN][intU];
					if (intV < 64)
					{
						if ((m_arrDist[intV] === 255) && (m_arrMt[intV] !== T_RIFT))
						{
							m_arrDist[intV] = intD;
							m_arrQue[intE] = intV;
							intE++;
						}
					}
				}
			}
			for (intK = 0; intK <= 63; intK++)
			{
				m_arrFcache[m_intFbase + intK] = m_arrDist[intK];
			}
			m_arrFcOK[intS_a] = 1;
		}
	}

	// the k-th neighbour (0-3) of sector s: -1 off the board
	function Nb(intS_a, intK_a)
	{
		var intC = intS_a & 7;
		var intR = Math.floor(intS_a / 8);
		var intResult = -1;

		if (intK_a === 0)
		{
			intC++;
		}
		else if (intK_a === 1)
		{
			intC--;
		}
		else if (intK_a === 2)
		{
			intR++;
		}
		else
		{
			intR--;
		}
		if ((intC >= 0) && (intC <= 7) && (intR >= 0) && (intR <= 7))
		{
			intResult = intR * 8 + intC;
		}

		return intResult;
	}

	// steps between two sectors (as the crow flies)
	function Far(intA_a, intB_a)
	{
		return Math.abs((intA_a & 7) - (intB_a & 7)) + Math.abs(m_arrRwT[intA_a] - m_arrRwT[intB_a]);
	}

	// ================================================================================================
	// THE CAMPAIGN (the Next's Campaign loop, as steps: each one starts a talk or the play, and says
	// what comes after it)

	function Campaign()
	{
		m_intSector = 1;
		m_intTries = 3;
		m_intRefit = 0;
		m_intExtra = 0;
		m_intWon = 0;
		m_intLost = 0;
		Talk(S_PROLOGUE, CampaignSector);
	}

	function CampaignSector()
	{
		m_strMapName = SectorName(m_intSector);
		LoadMap(m_intSector);
		DrawBoard();
		Talk(S_M1IN + (m_intSector - 1) * 4, PlayMap);
	}

	// after a sector's play (PlayMap's end)
	function CampaignAfterMap()
	{
		if (m_intResult === BLUE)
		{
			m_intWon++;
			Talk(S_M1WIN + (m_intSector - 1) * 4, function()
			{
				if (m_intSector < 5)
				{
					if (m_intPicked === 1)
					{
						m_intRefit++;
					}
					else
					{
						m_intExtra = m_intExtra + 6;
					}
				}
				if (m_intSector === 5)
				{
					Talk(S_ENDING, TheEnd);
				}
				else
				{
					m_intSector++;
					CampaignSector();
				}
			});
		}
		else
		{
			m_intLost++;
			Talk(S_M1LOSE + (m_intSector - 1) * 4, function()
			{
				m_intTries--;
				if (m_intTries < 0)
				{
					Talk(S_GAMEOVER, TheEnd);
				}
				else
				{
					CampaignSector();
				}
			});
		}
	}

	// StartMap: the fleets and the keys at the start of a sector
	function StartMap()
	{
		var intF = 0;
		var intK = 0;

		for (intF = 0; intF < NF; intF++)
		{
			m_arrFo[intF] = 0;
		}
		m_intFmax = 0;
		for (intK = 1; intK <= 2; intK++)
		{
			m_arrKs[intK] = 0;
			m_arrKf[intK] = -1;
			m_arrKd[intK] = -1;
			m_arrProdN[intK] = 0;
		}
		// the Swarm holds the planets near its base, more of them further out
		for (intK = 0; intK <= 63; intK++)
		{
			if ((m_arrMt[intK] === T_PLANET) && (Far(intK, m_arrBaseS[RED]) <= m_intSector + 1))
			{
				m_arrOwn[intK] = RED;
			}
		}
		intF = NewFleet(BLUE, m_arrBaseS[BLUE], 6 + m_intExtra);
		m_intZf = intF;
		m_intZmax = 10 + m_intRefit * 4;
		m_intZhp = m_intZmax;
		m_intZpow = 6 + m_intRefit * 3;
		m_intZDown = 0;
		NewFleet(RED, m_arrBaseS[RED], 10 + m_intSector * 4);
		if (m_intSector >= 2)
		{
			NewFleet(RED, Nb(m_arrBaseS[RED], 2), 3 + m_intSector);
		}
		if (m_intSector >= 4)
		{
			NewFleet(RED, Nb(m_arrBaseS[RED], 1), 3 + m_intSector);
		}
		m_arrProdT[BLUE] = 250;
		m_arrProdT[RED] = 280 - m_intSector * 25;
		m_intGarMin = 3 + m_intSector;
		m_intRaid = 5 + m_intSector * 2;
		m_intCur = m_arrBaseS[BLUE];
		m_intSel = -1;
		m_intHalf = 0;
		m_intCombined = 0;
		m_intResult = 0;
		m_intFlagsDirty = 1;
	}

	function NewFleet(intSide_a, intS_a, intN_a)
	{
		var intResult = -1;
		var intF = 0;

		while ((intResult < 0) && (intF < NF))
		{
			if (m_arrFo[intF] === 0)
			{
				m_arrFo[intF] = intSide_a;
				m_arrFs[intF] = intS_a;
				m_arrFn[intF] = intN_a;
				m_arrFt[intF] = -1;
				m_arrFx[intF] = -1;
				m_arrFw[intF] = 0;
				m_arrFd[intF] = 1;
				m_arrFk[intF] = 0;
				if (intF >= m_intFmax)
				{
					m_intFmax = intF + 1;
				}
				intResult = intF;
			}
			intF++;
		}

		return intResult;
	}

	// ================================================================================================
	// THE PLAY

	function PlayMap()
	{
		StartMap();
		Panel();
		m_strMode = 'play';
		m_objPad.setControls(PLAYCONTROLS);
	}

	// a frame of the play (the body of PlayMap's loop, after its Tick)
	function PlayFrame()
	{
		var intV = Key();
		var intS = -1;

		// a tap: on a sector, the cursor there and Space; on the panel's top right, M
		if (m_objTap !== null)
		{
			if ((m_objTap.y < 16) && (m_objTap.x >= 30 * 8))
			{
				intV = 6;
			}
			else if ((m_objTap.y >= 32) && (m_objTap.y < 216))
			{
				intS = SectorAt(m_objTap.x, m_objTap.y);
				if (intS >= 0)
				{
					if (intS !== m_intCur)
					{
						m_intCur = intS;
						CursorInfo();
					}
					intV = 5;
				}
			}
		}
		if ((intV >= 1) && (intV <= 4))
		{
			MoveCursor(intV);
		}
		if (intV === 5)
		{
			Pick();
		}
		if ((intV === 6) && (m_intSel >= 0))
		{
			m_intHalf = 1 - m_intHalf;
			Blip();
			HudText();
		}
		if (m_intSel < 0)
		{
			// the clock runs only while no fleet is picked
			Clock(0);
		}
		PlayAfterClock();
	}

	// the rest of a frame of the play, once the clock has run (now, or after a battle)
	function PlayAfterClock()
	{
		if (m_blnSuspended)
		{
			doNothingHere();			// a battle is on: it comes back here when it's over
		}
		else if (m_intResult !== 0)
		{
			PlayEnd();
		}
		else
		{
			DrawAll();
			if (m_intMsgT > 0)
			{
				m_intMsgT--;
				if (m_intMsgT === 0)
				{
					CursorInfo();
				}
			}
			m_intHudT++;
			if (m_intHudT >= 50)
			{
				m_intHudT = 0;
				HudText();
			}
		}
	}

	function doNothingHere()
	{
		// for clarity
	}

	// the end of a sector's play: 40 frames, then the sprites gone and the campaign goes on
	function PlayEnd()
	{
		WaitF(40, function()
		{
			m_objPad.setControls([]);
			SprHideRange(0, 96);
			CampaignAfterMap();
		});
	}

	// the sector under a point of the screen (-1: none): the board's diamond centres are at
	// (SX, SY) on Layer 2, which is at 32, 32
	function SectorAt(intX_a, intY_a)
	{
		var fltU = (intX_a - 32 - 128) / 16;
		var fltV = (intY_a - 32 - 46) / 8;
		var intC = Math.round((fltU + fltV) / 2);
		var intR = Math.round((fltV - fltU) / 2);
		var intResult = -1;

		if ((intC >= 0) && (intC <= 7) && (intR >= 0) && (intR <= 7))
		{
			intResult = intR * 8 + intC;
		}

		return intResult;
	}

	function MoveCursor(intV_a)
	{
		var intC = m_intCur & 7;
		var intR = Math.floor(m_intCur / 8);

		// the board is turned: Q up-right, A down-left, O up-left, P down-right
		if ((intV_a === 1) && (intR > 0))
		{
			intR--;
		}
		if ((intV_a === 2) && (intR < 7))
		{
			intR++;
		}
		if ((intV_a === 3) && (intC > 0))
		{
			intC--;
		}
		if ((intV_a === 4) && (intC < 7))
		{
			intC++;
		}
		m_intCur = intR * 8 + intC;
		SfxPlay(0, 200, 0, 8, 2, 0);
		CursorInfo();
	}

	// Space: pick a fleet of yours here, or send the picked one here
	function Pick()
	{
		var intF = 0;
		var intBest = -1;
		var intG = 0;

		if (m_intSel < 0)
		{
			for (intF = 0; intF < NF; intF++)
			{
				if ((m_arrFo[intF] === BLUE) && (m_arrFs[intF] === m_intCur))
				{
					if (intBest < 0)
					{
						intBest = intF;
					}
					else if (Power(intF) > Power(intBest))
					{
						intBest = intF;
					}
				}
			}
			if (intBest >= 0)
			{
				m_intSel = intBest;
				m_intHalf = 0;
				Blip();
				if (isTouch())
				{
					Msg('WHERE TO? TAP: SEND  HALF: ALL / HALF', 0);
				}
				else
				{
					Msg('WHERE TO? SPACE: SEND  M: ALL / HALF', 0);
				}
				HudText();
			}
			else
			{
				SfxPlay(0, 400, 0, 10, 4, 0);
			}
		}
		else if (m_intCur === m_arrFs[m_intSel])
		{
			// Space on its own sector: stay
			m_arrFt[m_intSel] = -1;
			m_intSel = -1;
			Blip();
			CursorInfo();
			HudText();
		}
		else
		{
			Field(m_intCur);
			if (m_arrFcache[m_intFbase + m_arrFs[m_intSel]] === 255)
			{
				Msg('NO WAY THROUGH', 60);
				SfxPlay(0, 400, 0, 10, 4, 0);
			}
			else
			{
				intF = m_intSel;
				if ((m_intHalf !== 0) && (m_arrFn[intF] >= 2))
				{
					intG = NewFleet(BLUE, m_arrFs[intF], Math.floor(m_arrFn[intF] / 2));
					if (intG >= 0)
					{
						m_arrFn[intF] = m_arrFn[intF] - m_arrFn[intG];
						intF = intG;
					}
				}
				m_arrFt[intF] = m_intCur;
				m_intSel = -1;
				SfxPlay(0, 90, -2, 13, 10, 0);
				Msg('UNDER WAY', 40);
				HudText();
			}
		}
	}

	// a fleet's strength: its ships, and the Z-BOMBER's guns
	function Power(intF_a)
	{
		var intResult = m_arrFn[intF_a];

		if (intF_a === m_intZf)
		{
			intResult = m_arrFn[intF_a] + m_intZpow;
		}

		return intResult;
	}

	// ================================================================================================
	// THE CLOCK: A FRAME OF THE WAR
	// Clock(from): the fleets from fleet `from` on (0: a new frame); a fleet arriving where the enemy
	// is stops the clock there (m_blnSuspended) for the battle, which comes back with Clock(f + 1)

	function Clock(intFrom_a)
	{
		var intF = intFrom_a;
		var blnStop = false;
		var intK = 0;

		if (intFrom_a === 0)
		{
			m_intFrames++;
		}
		// the fleets move
		while ((!blnStop) && (intF < m_intFmax))
		{
			if (m_arrFo[intF] > 0)
			{
				if (m_arrFx[intF] >= 0)
				{
					m_arrFw[intF]--;
					if (m_arrFw[intF] <= 0)
					{
						Arrive(intF);
					}
				}
				else if (m_arrFt[intF] >= 0)
				{
					if (m_arrFt[intF] === m_arrFs[intF])
					{
						m_arrFt[intF] = -1;
					}
					else
					{
						StepOut(intF);
					}
				}
				if (m_blnSuspended)
				{
					m_intResumeF = intF + 1;
					blnStop = true;
				}
				if (m_intResult !== 0)
				{
					blnStop = true;
				}
			}
			intF++;
		}
		if (!blnStop)
		{
			// the bases build ships
			for (intK = 1; intK <= 2; intK++)
			{
				m_arrProdN[intK]++;
				if (m_arrProdN[intK] >= m_arrProdT[intK])
				{
					m_arrProdN[intK] = 0;
					Build(intK);
				}
			}
			// the Z-BOMBER mended
			if (m_intZDown > 0)
			{
				m_intZDown--;
				if (m_intZDown === 0)
				{
					ZBack();
				}
			}
			// the Swarm thinks: a fleet a time
			if ((m_intFrames & 15) === 0)
			{
				Think();
			}
		}
	}

	// StepOut f: fleet f sets off for the next sector on its way
	function StepOut(intF_a)
	{
		var intBest = -1;
		var intD = 0;
		var intV = 0;
		var intN = 0;
		var intS = m_arrFs[intF_a];
		var arrNb = [m_arrNbE, m_arrNbW, m_arrNbS, m_arrNbN];
		var intI = 0;

		Field(m_arrFt[intF_a]);
		intD = m_arrFcache[m_intFbase + intS];
		if (intD === 255)
		{
			m_arrFt[intF_a] = -1;
		}
		else
		{
			// the neighbour that's nearest (the first one, in Nb's order, when two are)
			for (intI = 0; intI < 4; intI++)
			{
				intV = arrNb[intI][intS];
				if (intV < 64)
				{
					if (m_arrFcache[m_intFbase + intV] < intD)
					{
						intD = m_arrFcache[m_intFbase + intV];
						intBest = intV;
					}
				}
			}
			if (intBest < 0)
			{
				m_arrFt[intF_a] = -1;
			}
			else
			{
				m_arrFx[intF_a] = intBest;
				intN = 70;
				if ((m_arrMt[intBest] === T_NEB) || (m_arrMt[intBest] === T_ROCK))
				{
					intN = 140;
				}
				if (m_arrFk[intF_a] !== 0)
				{
					intN = Math.floor(intN * 3 / 2);
				}
				if (intF_a === m_intZf)
				{
					intN = Math.floor(intN * 4 / 5);
				}
				m_arrFw[intF_a] = intN;
				m_arrFd[intF_a] = intN;
			}
		}
	}

	// Arrive f: fleet f gets to the next sector (the enemy there: a battle, and Claim after it)
	function Arrive(intF_a)
	{
		var intS = m_arrFx[intF_a];
		var intSide = 0;
		var intFoe = 0;
		var intG = 0;
		var blnBattle = false;

		m_arrFs[intF_a] = intS;
		m_arrFx[intF_a] = -1;
		intSide = m_arrFo[intF_a];
		intFoe = 3 - intSide;
		// the enemy here: a battle
		while ((!blnBattle) && (intG < NF))
		{
			if ((m_arrFo[intG] === intFoe) && (m_arrFs[intG] === intS) && (m_arrFx[intG] < 0))
			{
				blnBattle = true;
			}
			intG++;
		}
		if (blnBattle)
		{
			m_intBattleF = intF_a;
			Battle(intS);
		}
		else
		{
			Claim(intF_a);
		}
	}

	// the end of Arrive, after its battle
	function ArriveAfterBattle(intF_a)
	{
		if (m_arrFo[intF_a] !== 0)
		{
			Claim(intF_a);
		}
	}

	// Claim f: fleet f holds its sector: keys, planets, bases; friends join up
	function Claim(intF_a)
	{
		var intS = m_arrFs[intF_a];
		var intSide = m_arrFo[intF_a];
		var intFoe = 3 - intSide;
		var intG = 0;
		var blnWon = false;

		// a dropped key: yours goes home, theirs you take
		if ((m_arrKs[intSide] === 2) && (m_arrKd[intSide] === intS))
		{
			m_arrKs[intSide] = 0;
			if (intSide === BLUE)
			{
				Msg('OUR STAR KEY IS SAFE HOME', 80);
			}
			else
			{
				Msg('THE SWARM TOOK BACK ITS KEY', 80);
			}
			SfxPlay(2, 60, -1, 14, 20, 0);
		}
		if ((m_arrKs[intFoe] === 2) && (m_arrKd[intFoe] === intS) && (m_arrFk[intF_a] === 0))
		{
			TakeKey(intF_a);
		}
		// their base, their key at home, nobody to stop you
		if ((intS === m_arrBaseS[intFoe]) && (m_arrKs[intFoe] === 0) && (m_arrFk[intF_a] === 0))
		{
			TakeKey(intF_a);
		}
		// home with their key, and yours safe: the sector is won
		if ((intS === m_arrBaseS[intSide]) && (m_arrFk[intF_a] === intFoe) && (m_arrKs[intSide] === 0))
		{
			m_intResult = intSide;
			if (intSide === BLUE)
			{
				Msg('THE SWARM\'S KEY IS OURS!', 0);
			}
			else
			{
				Msg('THE SWARM HAS OUR KEY!', 0);
			}
			SfxPlay(2, 30, 1, 15, 60, 0);
			blnWon = true;
		}
		if (!blnWon)
		{
			// a planet
			if ((m_arrMt[intS] === T_PLANET) && (m_arrOwn[intS] !== intSide))
			{
				m_arrOwn[intS] = intSide;
				m_intFlagsDirty = 1;
				if (intSide === BLUE)
				{
					Msg('PLANET TAKEN', 50);
				}
				else
				{
					Msg('THE SWARM TAKES A PLANET', 50);
				}
				SfxPlay(1, 100, -3, 12, 12, 0);
			}
			// friends here that are staying: one fleet
			if ((m_arrFt[intF_a] === intS) || (m_arrFt[intF_a] < 0))
			{
				m_arrFt[intF_a] = -1;
				for (intG = 0; intG < NF; intG++)
				{
					if ((intG !== intF_a) && (m_arrFo[intG] === intSide) && (m_arrFs[intG] === intS) && (m_arrFx[intG] < 0) && (m_arrFt[intG] < 0) && (m_arrFk[intF_a] === 0) && (m_arrFk[intG] === 0))
					{
						Join(intF_a, intG);
					}
				}
			}
		}
	}

	function TakeKey(intF_a)
	{
		var intFoe = 3 - m_arrFo[intF_a];

		m_arrKs[intFoe] = 1;
		m_arrKf[intFoe] = intF_a;
		m_arrFk[intF_a] = intFoe;
		if (m_arrFo[intF_a] === BLUE)
		{
			Msg('WE HAVE THEIR STAR KEY! GET IT HOME', 100);
		}
		else
		{
			Msg('ALERT: THE SWARM HAS OUR STAR KEY!', 100);
		}
		SfxPlay(2, 40, -1, 15, 30, 0);
	}

	// Join f, g: fleet g into fleet f
	function Join(intF_a, intG_a)
	{
		m_arrFn[intF_a] = m_arrFn[intF_a] + m_arrFn[intG_a];
		if (m_arrFn[intF_a] > MAXS)
		{
			m_arrFn[intF_a] = MAXS;
		}
		if (m_arrFk[intG_a] !== 0)
		{
			m_arrFk[intF_a] = m_arrFk[intG_a];
			m_arrKf[m_arrFk[intG_a]] = intF_a;
		}
		if (m_intZf === intG_a)
		{
			m_intZf = intF_a;
		}
		if (m_intSel === intG_a)
		{
			m_intSel = intF_a;
		}
		m_arrFo[intG_a] = 0;
	}

	// Build side: the base's yard: a ship, and one more for every two planets held
	function Build(intSide_a)
	{
		var intF = 0;
		var intN = 1;
		var intS = 0;
		var blnFull = false;
		var blnDone = false;

		for (intS = 0; intS <= 63; intS++)
		{
			if ((m_arrMt[intS] === T_PLANET) && (m_arrOwn[intS] === intSide_a))
			{
				intN++;
			}
		}
		intN = 1 + Math.floor((intN - 1) / 2);
		// no more than the yards can crew: 50 ships (the Swarm: more in each sector)
		intS = 0;
		for (intF = 0; intF < NF; intF++)
		{
			if (m_arrFo[intF] === intSide_a)
			{
				intS = intS + m_arrFn[intF];
			}
		}
		if (intSide_a === RED)
		{
			blnFull = (intS >= 50 + m_intSector * 6);
		}
		else
		{
			blnFull = (intS >= 50);
		}
		if (!blnFull)
		{
			// to the guard at the base (not a fleet carrying a key: that one has to go on fighting for it)
			intF = 0;
			while ((!blnDone) && (intF < NF))
			{
				if ((m_arrFo[intF] === intSide_a) && (m_arrFs[intF] === m_arrBaseS[intSide_a]) && (m_arrFx[intF] < 0) && (m_arrFt[intF] < 0) && (m_arrFk[intF] === 0))
				{
					m_arrFn[intF] = m_arrFn[intF] + intN;
					if (m_arrFn[intF] > MAXS)
					{
						m_arrFn[intF] = MAXS;
					}
					blnDone = true;
				}
				intF++;
			}
			if (!blnDone)
			{
				NewFleet(intSide_a, m_arrBaseS[intSide_a], intN);
			}
		}
	}

	// the Z-BOMBER mended: back at the base
	function ZBack()
	{
		var intF = 0;
		var blnDone = false;

		m_intZhp = m_intZmax;
		while ((!blnDone) && (intF < NF))
		{
			if ((m_arrFo[intF] === BLUE) && (m_arrFs[intF] === m_arrBaseS[BLUE]) && (m_arrFx[intF] < 0) && (m_arrFt[intF] < 0))
			{
				m_intZf = intF;
				blnDone = true;
			}
			intF++;
		}
		if (!blnDone)
		{
			m_intZf = NewFleet(BLUE, m_arrBaseS[BLUE], 0);
		}
		Msg('THE Z-BOMBER IS MENDED', 80);
	}

	// ================================================================================================
	// BATTLES

	// Battle s: the crew combine the Z-BOMBER (its first fight in the sector), the flashes, then the
	// rounds (BattleRounds, when the flashes are over)
	function Battle(intS_a)
	{
		var intZin = 0;

		m_blnSuspended = true;
		m_intBattleS = intS_a;
		m_intBattles++;
		if (m_intZf >= 0)
		{
			if ((m_arrFs[m_intZf] === intS_a) && (m_arrFx[m_intZf] < 0))
			{
				intZin = 1;
			}
		}
		// the Z-BOMBER's first fight in this sector: the crew combine it
		if ((intZin !== 0) && (m_intCombined === 0))
		{
			m_intCombined = 1;
			Talk(S_M1COMBINE + (m_intSector - 1) * 4, function()
			{
				m_objPad.setControls(PLAYCONTROLS);
				Panel();
				BattleFlashes();
			});
		}
		else
		{
			BattleFlashes();
		}
	}

	function BattleFlashes()
	{
		var intS = m_intBattleS;

		Msg('BATTLE! ' + SidePower(intS, BLUE) + ' AGAINST ' + SidePower(intS, RED), 0);
		Bang(intS, 60);
	}

	// the rounds, and what's left: the losers gone, the winners hold the sector
	function BattleRounds(intS_a)
	{
		var intPb = 0;
		var intPr = 0;
		var intD = 0;
		var intF = 0;
		var blnOver = false;
		var blnClaimed = false;

		while (!blnOver)
		{
			intPb = SidePower(intS_a, BLUE);
			intPr = SidePower(intS_a, RED);
			if ((intPb <= 0) || (intPr <= 0))
			{
				blnOver = true;
			}
			else
			{
				// a base's guns help whoever's home
				if (intS_a === m_arrBaseS[BLUE])
				{
					intPb = intPb + 4;
				}
				if (intS_a === m_arrBaseS[RED])
				{
					intPr = intPr + 6;
				}
				intD = Math.floor(intPr * (25 + Rnd(25)) / 100);
				if (intD < 1)
				{
					intD = 1;
				}
				Lose(intS_a, BLUE, intD);
				intD = Math.floor(intPb * (25 + Rnd(25)) / 100);
				if (intD < 1)
				{
					intD = 1;
				}
				Lose(intS_a, RED, intD);
			}
		}
		intPb = SidePower(intS_a, BLUE);
		if (intPb > 0)
		{
			Msg('WE WON: ' + intPb + ' LEFT', 90);
			SfxPlay(2, 80, -2, 14, 20, 0);
		}
		else
		{
			Msg('WE LOST THE BATTLE', 90);
			SfxPlay(2, 400, 6, 14, 30, 0);
		}
		// the losers' fleets are gone (their keys dropped here)
		for (intF = 0; intF < NF; intF++)
		{
			if ((m_arrFo[intF] > 0) && (m_arrFs[intF] === intS_a) && (m_arrFx[intF] < 0))
			{
				if ((m_arrFn[intF] <= 0) && (intF !== m_intZf))
				{
					Gone(intF);
				}
			}
		}
		// the winners hold the sector
		intF = 0;
		while ((!blnClaimed) && (intF < NF))
		{
			if ((m_arrFo[intF] > 0) && (m_arrFs[intF] === intS_a) && (m_arrFx[intF] < 0))
			{
				Claim(intF);
				blnClaimed = true;
			}
			intF++;
		}
	}

	// the battle over: the rest of Arrive, then the clock goes on from the next fleet
	function BattleOver()
	{
		BattleRounds(m_intBattleS);
		ArriveAfterBattle(m_intBattleF);
		m_blnSuspended = false;
		m_strMode = 'play';
		if (m_intResult === 0)
		{
			Clock(m_intResumeF);
		}
		PlayAfterClock();
	}

	// how strong a side is in sector s (fleets that are there, not passing)
	function SidePower(intS_a, intSide_a)
	{
		var intF = 0;
		var intP = 0;

		for (intF = 0; intF < NF; intF++)
		{
			if ((m_arrFo[intF] === intSide_a) && (m_arrFs[intF] === intS_a) && (m_arrFx[intF] < 0))
			{
				intP = intP + Power(intF);
			}
		}

		return intP;
	}

	// Lose s, side, d: that side loses d in sector s: ships first, then the Z-BOMBER's hull
	function Lose(intS_a, intSide_a, intD_a)
	{
		var intF = 0;
		var intN = 0;
		var intD = intD_a;

		for (intF = 0; intF < NF; intF++)
		{
			if ((intD > 0) && (m_arrFo[intF] === intSide_a) && (m_arrFs[intF] === intS_a) && (m_arrFx[intF] < 0))
			{
				intN = m_arrFn[intF];
				if (intN > intD)
				{
					intN = intD;
				}
				m_arrFn[intF] = m_arrFn[intF] - intN;
				intD = intD - intN;
			}
		}
		if ((intD > 0) && (intSide_a === BLUE) && (m_intZf >= 0))
		{
			if ((m_arrFs[m_intZf] === intS_a) && (m_arrFx[m_intZf] < 0))
			{
				m_intZhp = m_intZhp - intD;
				if (m_intZhp <= 0)
				{
					ZDowned();
				}
			}
		}
	}

	// the Z-BOMBER can't take any more: its crew fly the three craft home to be mended
	function ZDowned()
	{
		var intF = m_intZf;

		m_intZf = -1;
		m_intZhp = 0;
		m_intZDown = 900;
		Msg('THE Z-BOMBER FALLS BACK TO BE MENDED', 120);
		if (m_arrFn[intF] <= 0)
		{
			Gone(intF);
		}
	}

	// fleet f is gone; a key it carried drops where it was
	function Gone(intF_a)
	{
		var intK2 = m_arrFk[intF_a];

		if (intK2 !== 0)
		{
			m_arrKs[intK2] = 2;
			m_arrKd[intK2] = m_arrFs[intF_a];
			m_arrKf[intK2] = -1;
		}
		if (m_intSel === intF_a)
		{
			m_intSel = -1;
		}
		m_arrFo[intF_a] = 0;
	}

	// the battle's flashes: bangs and lasers round sector s for n frames (BangFrame each frame)
	function Bang(intS_a, intN_a)
	{
		m_intBangX = SX(intS_a) + 32;
		m_intBangY = SY(intS_a) + 32;
		m_intBangJ = 0;
		m_intBangN = intN_a;
		m_strMode = 'bang';
	}

	function BangFrame()
	{
		var intJ = 0;
		var intQ = 0;

		if (m_intBangJ >= m_intBangN)
		{
			SprHideRange(SP_FX, 8);
			BattleOver();
		}
		else
		{
			m_intBangJ++;
			intJ = m_intBangJ;
			intQ = SP_FX + (intJ & 7);
			if ((intJ & 1) !== 0)
			{
				spr(intQ, m_intBangX - 16 + Rnd(24), m_intBangY - 18 + Rnd(16), 'boom', undefined, 0, 1);
				m_objSlots.animate(intQ, 1, true);			// a bang: once through
			}
			else
			{
				spr(intQ, m_intBangX - 12 + Rnd(16), m_intBangY - 16 + Rnd(12), 'laser', 1, Rnd(2), 1);
			}
			if ((intJ & 7) === 0)
			{
				SfxPlay(1, 500 + Rnd(800), 30, 13, 10, 1);
			}
			if ((intJ & 3) === 0)
			{
				SfxPlay(0, 30 + Rnd(30), 3, 11, 6, 0);
			}
			DrawAll();
		}
	}

	// ================================================================================================
	// THE IRON SWARM'S MIND

	// Think: one of its fleets decides what to do
	function Think()
	{
		var intF = 0;
		var intJ = 0;
		var intG = 0;
		var blnDanger = false;
		var blnHelp = false;

		m_intAiN = (m_intAiN + 1) & 15;
		intF = m_intAiN;
		if (m_arrFo[intF] === RED)
		{
			if (m_arrFk[intF] === BLUE)
			{
				// carrying our key: home
				m_arrFt[intF] = m_arrBaseS[RED];
			}
			else if (m_arrKs[BLUE] === 2)
			{
				// our key dropped somewhere: get it
				m_arrFt[intF] = m_arrKd[BLUE];
			}
			else if (m_arrKs[RED] === 2)
			{
				// its key dropped: get it back
				m_arrFt[intF] = m_arrKd[RED];
			}
			else if (m_arrKs[RED] === 1)
			{
				// we have its key: everyone after the carrier (the guards stay unless it's close)
				intG = m_arrKf[RED];
				if ((m_arrFs[intF] === m_arrBaseS[RED]) && (m_arrFx[intF] < 0))
				{
					// the guard sends all it can spare after the carrier
					if (m_arrFn[intF] >= m_intGarMin + 3)
					{
						intJ = NewFleet(RED, m_arrFs[intF], m_arrFn[intF] - m_intGarMin);
						if (intJ >= 0)
						{
							m_arrFn[intF] = m_intGarMin;
							m_arrFt[intJ] = m_arrFs[intG];
						}
					}
					if (Far(m_arrFs[intG], m_arrBaseS[RED]) <= 3)
					{
						m_arrFt[intF] = m_arrFs[intG];
					}
				}
				else
				{
					m_arrFt[intF] = m_arrFs[intG];
				}
			}
			else if ((m_arrFs[intF] === m_arrBaseS[RED]) && (m_arrFx[intF] < 0))
			{
				// the guard at home: big enough? send a raid out, keep the guard (not with danger near home)
				for (intG = 0; intG < NF; intG++)
				{
					if ((m_arrFo[intG] === BLUE) && (Far(m_arrFs[intG], m_arrBaseS[RED]) <= 2))
					{
						blnDanger = true;
					}
				}
				if ((!blnDanger) && (m_arrFn[intF] >= m_intGarMin + 3))
				{
					intG = NewFleet(RED, m_arrFs[intF], m_arrFn[intF] - m_intGarMin);
					if (intG >= 0)
					{
						m_arrFn[intF] = m_intGarMin;
						m_arrFt[intG] = Goal(intG);
					}
				}
			}
			else
			{
				// us near its base: anyone close by comes home to help
				if ((Far(m_arrFs[intF], m_arrBaseS[RED]) <= 4) && (m_arrFk[intF] === 0))
				{
					for (intG = 0; intG < NF; intG++)
					{
						if ((m_arrFo[intG] === BLUE) && (Far(m_arrFs[intG], m_arrBaseS[RED]) <= 2))
						{
							blnHelp = true;
						}
					}
				}
				if (blnHelp)
				{
					m_arrFt[intF] = m_arrBaseS[RED];
				}
				else if (m_arrFt[intF] < 0)
				{
					// out in the sector with nothing to do: pick something
					m_arrFt[intF] = Goal(intF);
				}
			}
		}
	}

	// Goal(f): where a Swarm fleet goes: big enough, our base (and our key); else a planet it hasn't
	// got; else home
	function Goal(intF_a)
	{
		var intS = 0;
		var intB = -1;
		var intD = 99;
		var intResult = m_arrBaseS[BLUE];

		if (m_arrFn[intF_a] < m_intRaid)
		{
			for (intS = 0; intS <= 63; intS++)
			{
				if ((m_arrMt[intS] === T_PLANET) && (m_arrOwn[intS] !== RED))
				{
					if (Far(intS, m_arrFs[intF_a]) < intD)
					{
						intD = Far(intS, m_arrFs[intF_a]);
						intB = intS;
					}
				}
			}
			if (intB >= 0)
			{
				intResult = intB;
			}
		}

		return intResult;
	}

	// ================================================================================================
	// DRAWING

	function DrawAll()
	{
		var intF = 0;
		var intX = 0;
		var intY = 0;
		var intS = 0;
		var intN = 0;
		var intQ = 0;
		var intK = 0;
		var intW = 0;
		var intTt = 0;

		// the cursor: blinking while no fleet is picked (its sequence), steady while one is
		intX = m_arrSxT[m_intCur] + 16;
		intY = m_arrSyT[m_intCur] + 24;
		spr(SP_CUR, intX, intY, 'cursor', undefined, 0, 1);
		if (m_intSel < 0)
		{
			sprAnimate(SP_CUR);
		}
		else
		{
			m_objSlots.unanimate(SP_CUR, 1);
		}
		// the picked fleet
		if (m_intSel >= 0)
		{
			intS = m_arrFs[m_intSel];
			spr(SP_PICK, m_arrSxT[intS] + 16, m_arrSyT[intS] + 24, 'pick', 1, 0, 1);
		}
		else
		{
			SprHide(SP_PICK);
		}
		// planets' flags (only when one changed hands, or the sprites were cleared)
		if (m_intFlagsDirty !== 0)
		{
			DrawFlags();
		}
		// the fleets: the ship (its engines are its own animation) and the ship count's two digits
		intQ = SP_FL;
		for (intF = 0; intF < NF; intF++)
		{
			if (m_arrFo[intF] > 0)
			{
				intS = m_arrFs[intF];
				intX = m_arrSxT[intS];
				intY = m_arrSyT[intS];
				if (m_arrFx[intF] >= 0)
				{
					// on the way: between the two sectors (a step is 16 across and 8 down, one way or the other)
					intTt = m_arrFd[intF] - m_arrFw[intF];
					intN = m_arrFd[intF];
					intS = m_arrFx[intF];
					intW = Math.floor((16 * intTt) / intN);
					if (m_arrSxT[intS] < intX)
					{
						intX = intX - intW;
					}
					else
					{
						intX = intX + intW;
					}
					intW = Math.floor((8 * intTt) / intN);
					if (m_arrSyT[intS] < intY)
					{
						intY = intY - intW;
					}
					else
					{
						intY = intY + intW;
					}
				}
				m_arrFix[intF] = intX;			// (a key it carries goes with it)
				m_arrFiy[intF] = intY;
				// a second fleet of the same side in a sector: a little to the side
				if (m_arrFo[intF] === RED)
				{
					intX = intX + 4;
					intY = intY - 2;
				}
				else
				{
					intX = intX - 4;
					intY = intY + 2;
				}
				if (intF === m_intZf)
				{
					spr(intQ, intX + 16, intY + 20, 'zb', undefined, 0, 1);
				}
				else if (m_arrFo[intF] === BLUE)
				{
					spr(intQ, intX + 24, intY + 20, 'frigate', undefined, 0, 1);
				}
				else
				{
					spr(intQ, intX + 24, intY + 20, 'drone', undefined, 1, 1);
				}
				sprAnimate(intQ);
				SprHide(intQ + 1);
				intN = m_arrFn[intF];
				if (intN >= 10)
				{
					spr(intQ + 2, intX + 23, intY + 30, 'digit', Math.floor(intN / 10) + 1, 0, 1);
				}
				else
				{
					SprHide(intQ + 2);
				}
				if ((intN > 0) || (intF !== m_intZf))
				{
					spr(intQ + 3, intX + 30, intY + 30, 'digit', (intN % 10) + 1, 0, 1);
				}
				else
				{
					SprHide(intQ + 3);
				}
			}
			else
			{
				SprHideRange(intQ, 4);
			}
			intQ = intQ + 4;
		}
		// the keys: at home on the base, carried over the fleet, or floating where they fell (glinting)
		for (intK = 1; intK <= 2; intK++)
		{
			intS = -1;
			if (m_arrKs[intK] === 0)
			{
				intS = m_arrBaseS[intK];
			}
			if (m_arrKs[intK] === 2)
			{
				intS = m_arrKd[intK];
			}
			if (intS >= 0)
			{
				intX = m_arrSxT[intS] + 24;
				intY = m_arrSyT[intS] + 2;
				if ((m_intFrames & 8) !== 0)
				{
					intY--;
				}
			}
			else
			{
				intF = m_arrKf[intK];
				intX = m_arrFix[intF] + 24;
				intY = m_arrFiy[intF] + 4;
			}
			spr(SP_KEY + intK - 1, intX, intY, 'key', undefined, intK - 1, 1);
			sprAnimate(SP_KEY + intK - 1);
		}
		// where the picked fleet (or the one under the cursor) is going
		intF = m_intSel;
		if (intF < 0)
		{
			intF = FleetAt(m_intCur);
		}
		if ((intF >= 0) && (m_arrFt[intF] >= 0))
		{
			intS = m_arrFt[intF];
			spr(SP_TGT, m_arrSxT[intS] + 24, m_arrSyT[intS] + 6 + Math.floor((m_intFrames & 12) / 4), 'target', 1, 0, 1);
		}
		else
		{
			SprHide(SP_TGT);
		}
	}

	// DrawFlags: a flag on every planet that's held
	function DrawFlags()
	{
		var intS = 0;
		var intN = 0;

		m_intFlagsDirty = 0;
		for (intS = 0; intS <= 63; intS++)
		{
			if ((m_arrMt[intS] === T_PLANET) && (intN < 16))
			{
				if (m_arrOwn[intS] !== 0)
				{
					spr(SP_FLAG + intN, m_arrSxT[intS] + 34, m_arrSyT[intS] + 4, 'flag', 1, m_arrOwn[intS] - 1, 1);
				}
				else
				{
					SprHide(SP_FLAG + intN);
				}
				intN++;
			}
		}
	}

	// one of your fleets in sector s (-1 none)
	function FleetAt(intS_a)
	{
		var intF = 0;
		var intResult = -1;

		while ((intResult < 0) && (intF < m_intFmax))
		{
			if ((m_arrFo[intF] === BLUE) && (m_arrFs[intF] === intS_a))
			{
				intResult = intF;
			}
			intF++;
		}

		return intResult;
	}

	// ================================================================================================
	// THE PANEL

	function Panel()
	{
		TilesFill(0);
		TilesRect(0, 0, 40, 4, T_PANEL);
		TilesRect(0, 3, 40, 1, T_PANELB);
		TilesRect(0, 27, 40, 5, T_PANEL);
		TilesRect(0, 27, 40, 1, T_PANELT);
		TilesText(1, 1, 'SECTOR ' + m_intSector + ': ' + m_strMapName);
		HudText();
		CursorInfo();
		if (isTouch())
		{
			TilesText(1, 30, 'TAP: PICK, SEND   HALF: ALL OR HALF');
		}
		else
		{
			TilesText(1, 30, 'QAOP MOVE  SPACE PICK, SEND  M HALF');
		}
	}

	function HudText()
	{
		var intF = 0;
		var intNb = 0;
		var intNr = 0;

		for (intF = 0; intF < NF; intF++)
		{
			if (m_arrFo[intF] === BLUE)
			{
				intNb = intNb + m_arrFn[intF];
			}
			if (m_arrFo[intF] === RED)
			{
				intNr = intNr + m_arrFn[intF];
			}
		}
		TilesRect(0, 2, 40, 1, T_PANEL);
		TilesPut(1, 2, T_SHIPB);
		TilesText(2, 2, rightStr('  ' + intNb, 3));
		TilesPut(6, 2, T_SHIPR);
		TilesText(7, 2, rightStr('  ' + intNr, 3));
		TilesPut(12, 2, T_KEYB);
		TilesText(13, 2, KeyWord(BLUE));
		TilesPut(21, 2, T_KEYR);
		TilesText(22, 2, KeyWord(RED));
		if (m_intZf >= 0)
		{
			TilesText(30, 2, 'Z ' + rightStr(' ' + m_intZhp, 2) + '/' + m_intZmax);
		}
		else
		{
			TilesText(30, 2, 'Z MENDING');
		}
		TilesText(30, 1, 'TRIES ' + m_intTries);
		if (m_intSel >= 0)
		{
			if (m_intHalf !== 0)
			{
				TilesText(30, 0, 'SEND HALF');
			}
			else
			{
				TilesText(30, 0, 'SEND ALL ');
			}
		}
		else
		{
			TilesRect(30, 0, 9, 1, T_PANEL);
		}
	}

	function KeyWord(intSide_a)
	{
		var strResult = 'LOST  ';

		if (m_arrKs[intSide_a] === 0)
		{
			strResult = 'HOME  ';
		}
		else if (m_arrKs[intSide_a] === 1)
		{
			strResult = 'TAKEN ';
		}

		return strResult;
	}

	// what's under the cursor, in the panel at the bottom
	function CursorInfo()
	{
		var intS = m_intCur;
		var intF = 0;
		var intNb = 0;
		var intNr = 0;
		var intZ = 0;
		var strInfo = 'OPEN SPACE';
		var strTxt = '';

		if (m_intMsgT <= 0)
		{
			if (m_arrMt[intS] === T_NEB)
			{
				strInfo = 'A NEBULA: SLOW GOING';
			}
			else if (m_arrMt[intS] === T_ROCK)
			{
				strInfo = 'ASTEROIDS: SLOW GOING';
			}
			else if (m_arrMt[intS] === T_RIFT)
			{
				strInfo = 'A RIFT: NOTHING GETS THROUGH';
			}
			else if (m_arrMt[intS] === T_BLUE)
			{
				strInfo = 'OUR BASE';
			}
			else if (m_arrMt[intS] === T_RED)
			{
				strInfo = 'THE IRON SWARM\'S BASE';
			}
			else if (m_arrMt[intS] === T_PLANET)
			{
				if (m_arrOwn[intS] === BLUE)
				{
					strInfo = 'A PLANET: OURS';
				}
				else if (m_arrOwn[intS] === RED)
				{
					strInfo = 'A PLANET: THE SWARM\'S';
				}
				else
				{
					strInfo = 'A PLANET: NOBODY\'S';
				}
			}
			TilesRect(1, 28, 38, 2, T_PANEL);
			TilesText(1, 28, strInfo);
			for (intF = 0; intF < NF; intF++)
			{
				if ((m_arrFs[intF] === intS) && (m_arrFx[intF] < 0))
				{
					if (m_arrFo[intF] === BLUE)
					{
						intNb = intNb + m_arrFn[intF];
					}
					if (m_arrFo[intF] === RED)
					{
						intNr = intNr + m_arrFn[intF];
					}
					if (intF === m_intZf)
					{
						intZ = 1;
					}
				}
			}
			if ((intNb > 0) || (intZ !== 0))
			{
				strTxt = intNb + ' FRIGATES';
			}
			if (intZ !== 0)
			{
				strTxt = strTxt + ' + THE Z-BOMBER';
			}
			if (intNr > 0)
			{
				strTxt = intNr + ' SWARM DRONES';
			}
			TilesText(1, 29, strTxt);
		}
	}

	// Msg s, t: a line in the bottom panel for t frames (0: until the next)
	function Msg(str_a, intT_a)
	{
		TilesRect(1, 28, 38, 2, T_PANEL);
		TilesText(1, 28, str_a);
		if (intT_a === 0)
		{
			m_intMsgT = 30000;
		}
		else
		{
			m_intMsgT = intT_a;
		}
		if ((m_intSel >= 0) && (intT_a === 0))
		{
			m_intMsgT = 0;
		}
	}

	// ================================================================================================
	// THE TITLE, THE NAME, THE END

	function Title()
	{
		SprHideRange(0, NSLOTS);
		FaceHide();
		Sky();
		TilesFill(0);
		TilesText(16, 6, 'Z-BOMBER');
		TilesText(9, 8, 'CAPTURE THE STAR KEYS');
		if (isTouch())
		{
			TilesText(9, 20, 'TAP TO TAKE COMMAND');
		}
		else
		{
			TilesText(7, 20, 'PRESS SPACE TO TAKE COMMAND');
		}
		TilesText(4, 24, 'QAOP MOVE THE CURSOR A SECTOR');
		TilesText(4, 25, 'SPACE PICK A FLEET, SPACE AGAIN');
		TilesText(4, 26, '      TO SEND IT   M: ALL / HALF');
		TilesText(4, 27, 'OR TAP A SECTOR; THE PAD, GO, HALF');
		TilesText(4, 29, '(C) 2026 CYBORG UNICORN PTY LTD');
		m_intTitleY = 0;
		m_strMode = 'title';
	}

	function TitleFrame()
	{
		var intT = 0;
		var intV = 0;
		var intY = m_intTitleY;

		intY++;
		m_intTitleY = intY;
		// the Z-BOMBER, four times the size, flying across
		intT = Math.floor(intY / 2) % 256;
		spr(0, intT, 96 + Math.floor(intY / 16) % 2, 'zb', undefined, 0, 4);
		sprAnimate(0);
		intV = Key();
		if (m_objTap !== null)
		{
			intV = 5;
		}
		if ((intV === 5) && (intY > 20))
		{
			SprHideRange(0, 2);
			if (m_strPName.length === 0)
			{
				NameEntry();
			}
			else
			{
				TitleOver();
			}
		}
	}

	function TitleOver()
	{
		TilesFill(0);
		Campaign();
	}

	// the Captain's name
	function NameEntry()
	{
		TilesFill(0);
		TilesRect(3, 8, 34, 14, T_PANEL);
		TilesText(5, 9, 'YOUR NAME, CAPTAIN:');
		m_intNameCX = 0;
		m_intNameCY = 0;
		NameDraw();
		m_strMode = 'name';
	}

	function NameDraw()
	{
		var intT = 0;
		var str = '';

		TilesRect(25, 9, 10, 1, T_PANEL);
		TilesText(25, 9, m_strPName);
		for (intT = 0; intT <= 29; intT++)
		{
			if (intT < 26)
			{
				str = String.fromCharCode(65 + intT);
			}
			if (intT === 26)
			{
				str = '-';
			}
			if (intT === 27)
			{
				str = '<-';
			}
			if (intT === 28)
			{
				str = 'OK';
			}
			if (intT === 29)
			{
				str = '.';
			}
			if (((intT % 8) === m_intNameCX) && (Math.floor(intT / 8) === m_intNameCY))
			{
				str = '>' + str;
			}
			else
			{
				str = ' ' + str;
			}
			TilesText(5 + (intT % 8) * 4, 12 + Math.floor(intT / 8) * 2, (str + '   ').substr(0, 4));
		}
	}

	function NameFrame()
	{
		var intV = Key();
		var intT = 0;
		var intCX = 0;
		var intCY = 0;
		var blnDone = false;

		// a tap on a letter: it's picked, and Space
		if (m_objTap !== null)
		{
			intCX = Math.floor((m_objTap.x / 8 - 5) / 4);
			intCY = Math.floor((m_objTap.y / 8 - 12) / 2);
			if ((intCX >= 0) && (intCX <= 7) && (intCY >= 0) && (intCY <= 3) && (intCY * 8 + intCX <= 29))
			{
				m_intNameCX = intCX;
				m_intNameCY = intCY;
				intV = 5;
			}
		}
		if (intV !== 0)
		{
			if ((intV === 1) && (m_intNameCY > 0))
			{
				m_intNameCY--;
			}
			if ((intV === 2) && (m_intNameCY < 3))
			{
				m_intNameCY++;
			}
			if ((intV === 3) && (m_intNameCX > 0))
			{
				m_intNameCX--;
			}
			if ((intV === 4) && (m_intNameCX < 7))
			{
				m_intNameCX++;
			}
			if (m_intNameCY * 8 + m_intNameCX > 29)
			{
				m_intNameCX = 29 - m_intNameCY * 8;
			}
			if (intV === 5)
			{
				intT = m_intNameCY * 8 + m_intNameCX;
				Blip();
				if ((intT < 26) && (m_strPName.length < 8))
				{
					m_strPName = m_strPName + String.fromCharCode(65 + intT);
				}
				if ((intT === 26) && (m_strPName.length < 8))
				{
					m_strPName = m_strPName + '-';
				}
				if ((intT === 29) && (m_strPName.length < 8))
				{
					m_strPName = m_strPName + '.';
				}
				if ((intT === 27) && (m_strPName.length > 0))
				{
					m_strPName = m_strPName.substr(0, m_strPName.length - 1);
				}
				if ((intT === 28) && (m_strPName.length > 0))
				{
					blnDone = true;
				}
			}
			if ((intV === 6) && (m_strPName.length > 0))
			{
				blnDone = true;
			}
			if (blnDone)
			{
				TilesFill(0);
				TitleOver();
			}
			else
			{
				NameDraw();
			}
		}
	}

	function TheEnd()
	{
		SprHideRange(0, NSLOTS);
		FaceHide();
		TilesFill(0);
		TilesRect(6, 8, 28, 13, T_PANEL);
		if ((m_intResult === BLUE) && (m_intSector === 5))
		{
			TilesText(12, 9, 'THE WAR IS WON');
		}
		else
		{
			TilesText(12, 9, 'THE WAR IS LOST');
		}
		TilesText(8, 12, 'CAPTAIN ' + m_strPName);
		TilesText(8, 14, 'SECTORS WON  ' + m_intWon);
		TilesText(8, 15, 'SECTORS LOST ' + m_intLost);
		TilesText(8, 16, 'BATTLES      ' + m_intBattles);
		TilesText(8, 17, 'Z-BOMBER REFITS ' + m_intRefit);
		TilesText(10, 19, isTouch() ? 'TAP' : 'PRESS SPACE');
		m_strMode = 'theend';
	}

	function TheEndFrame()
	{
		var intV = Key();

		if (m_objTap !== null)
		{
			intV = 5;
		}
		if (intV === 5)
		{
			m_intBattles = 0;
			TilesFill(0);
			Title();
		}
	}

	// ================================================================================================
	// THE KEYS, THE FRAME

	// Key(): 1-4 Q A O P (repeating while held), 5 Space, 6 M (once a press), 0 nothing
	function Key()
	{
		var intV = 0;
		var intF2 = 0;
		var intResult = 0;

		if (isDown(KC_Q) || isDown(KEY_UP))
		{
			intV = 1;
		}
		if (isDown(KC_A) || isDown(KEY_DOWN))
		{
			intV = 2;
		}
		if (isDown(KC_O) || isDown(KEY_LEFT))
		{
			intV = 3;
		}
		if (isDown(KC_P) || isDown(KEY_RIGHT))
		{
			intV = 4;
		}
		if (isDown(KC_SPACE) || isDown(KC_ENTER))
		{
			intF2 = 5;
		}
		if (isDown(KC_M))
		{
			intF2 = 6;
		}
		if (intF2 !== 0)
		{
			if (m_intFirWas === 0)
			{
				m_intFirWas = intF2;
				intResult = intF2;
			}
		}
		else
		{
			m_intFirWas = 0;
			if (intV === 0)
			{
				m_intKeyT = 0;
			}
			else if (m_intKeyT === 0)
			{
				m_intKeyT = 14;
				intResult = intV;
			}
			else
			{
				m_intKeyT--;
				if (m_intKeyT === 0)
				{
					m_intKeyT = 6;
					intResult = intV;
				}
			}
		}

		return intResult;
	}

	// WaitF t: t frames, then cb
	function WaitF(intT_a, cb_a)
	{
		m_intWaitN = intT_a;
		m_cbWait = cb_a;
		m_strMode = 'wait';
	}

	function WaitFrame()
	{
		m_intWaitN--;
		if (m_intWaitN <= 0)
		{
			m_cbWait();
		}
	}

	// this frame's tap (JPad.taps: the touches and clicks that missed the pad and buttons), in the
	// 320 x 256 picture's pixels; null if none
	function readPointer()
	{
		var arrTaps = m_objPad.taps();

		m_objTap = null;
		if (arrTaps.length > 0)
		{
			m_objTap = { x:arrTaps[0].x, y:arrTaps[0].y };
		}
	}

	// ================================================================================================
	// A TALK (the scene's ops: TalkRun does them until one waits: a page typed out, Space, a choice)

	// into a talk: the board stays behind (no pad: a talk is played by tapping)
	function TalkOn()
	{
		m_objPad.setControls([]);
		SprHideRange(0, NSLOTS);
		TilesFill(0);
		m_intFaceOn = -2;
	}

	// out of a talk: the game's sprites back
	function TalkOff()
	{
		SprHideRange(0, NSLOTS);
		FaceHide();
		TilesFill(0);
		m_intFlagsDirty = 1;				// (the sprites were cleared: the flags go up again)
	}

	// Talk id, cb: scene id, then cb
	function Talk(intId_a, cb_a)
	{
		TalkOn();
		m_cbTalk = cb_a;
		m_intSpk = -1;
		m_intPicked = 0;
		m_arrTalkOps = g_arrZBStory[intId_a];
		m_intTalkPc = 0;
		m_strTalkStep = 'run';
		m_strMode = 'talk';
		TalkRun();
	}

	function TalkRun()
	{
		var arrOp = null;
		var intV = 0;
		var intT = 0;
		var cb = null;

		while (m_strTalkStep === 'run')
		{
			arrOp = m_arrTalkOps[m_intTalkPc];
			if (arrOp[0] === 'end')
			{
				TilesRect(0, 22, 40, 10, 0);
				FaceHide();
				TalkOff();
				m_strTalkStep = 'done';
				cb = m_cbTalk;
				m_cbTalk = null;
				cb();
			}
			else if ((arrOp[0] === 'say') || (arrOp[0] === 'narr'))
			{
				if ((arrOp[0] === 'say') && (m_intSpk >= 0))
				{
					TextBox(CName(m_intSpk));
				}
				else
				{
					TextBox('');
				}
				m_arrTalkLines = arrOp[1];
				m_intTalkLine = 0;
				m_intTalkChar = 0;
				m_intTalkX = 3;
				m_intTalkQ = 0;
				m_intFast = 0;
				m_blnTalkKeyCheck = false;
				m_intTalkPc++;
				m_strTalkStep = 'type';
				TalkType();
			}
			else if (arrOp[0] === 'who')
			{
				intV = arrOp[1];
				m_intSpk = (intV >= 8) ? -1 : intV;
				if (m_intFaceOn !== m_intSpk)
				{
					ShowFace(m_intSpk, -1);
				}
				m_intTalkPc++;
			}
			else if (arrOp[0] === 'mood')
			{
				if (m_intSpk >= 0)
				{
					ShowFace(m_intSpk, arrOp[1]);
				}
				m_intTalkPc++;
			}
			else if (arrOp[0] === 'icon')
			{
				if (arrOp[1] === 9)
				{
					SfxPlay(1, 300, 20, 12, 20, 0);
				}
				else
				{
					SfxPlay(1, 80, -3, 12, 12, 0);
				}
				m_intTalkPc++;
			}
			else if (arrOp[0] === 'choice')
			{
				for (intT = 0; intT < arrOp[1].length; intT++)
				{
					if (intT === 0)
					{
						m_strLab0 = Tokens(arrOp[1][0]);
					}
					if (intT === 1)
					{
						m_strLab1 = Tokens(arrOp[1][1]);
					}
				}
				m_arrChoiceTargets = arrOp[2];
				m_strTalkStep = 'choose';
				ChooseStart();
			}
			else if (arrOp[0] === 'goto')
			{
				m_intTalkPc = arrOp[1];
			}
			else
			{
				m_strTalkStep = 'done';
			}
		}
	}

	// a frame of the talk
	function TalkFrame()
	{
		if (m_strTalkStep === 'type')
		{
			TalkType();
		}
		else if (m_strTalkStep === 'waitgo')
		{
			WaitGoFrame();
		}
		else if (m_strTalkStep === 'choose')
		{
			ChooseFrame();
		}
	}

	// the page typed out (PrintLB): two letters a frame, all of it once Space is pressed
	function TalkType()
	{
		var blnTick = false;
		var str = '';
		var intB = 0;
		var strName = '';
		var intM = 0;

		if (m_blnTalkKeyCheck)
		{
			m_blnTalkKeyCheck = false;
			if ((Key() >= 5) || (m_objTap !== null))
			{
				m_intFast = 1;
			}
		}
		while ((!blnTick) && (m_strTalkStep === 'type'))
		{
			if (m_intTalkLine >= m_arrTalkLines.length)
			{
				m_strTalkStep = 'waitgo';
			}
			else
			{
				str = m_arrTalkLines[m_intTalkLine];
				if (m_intTalkChar >= str.length)
				{
					m_intTalkLine++;
					m_intTalkChar = 0;
					m_intTalkX = 3;
					m_intTalkQ = 0;
				}
				else
				{
					intB = str.charCodeAt(m_intTalkChar);
					if (intB < 8)
					{
						strName = TokName(intB);
						for (intM = 0; intM < strName.length; intM++)
						{
							TilesPut(m_intTalkX, 24 + m_intTalkLine, strName.charCodeAt(intM));
							m_intTalkX++;
						}
					}
					else
					{
						TilesPut(m_intTalkX, 24 + m_intTalkLine, intB);
						m_intTalkX++;
					}
					m_intTalkChar++;
					if (m_intFast === 0)
					{
						m_intTalkQ++;
						if ((m_intTalkQ & 1) === 0)
						{
							blnTick = true;
							m_blnTalkKeyCheck = true;
						}
					}
				}
			}
		}
	}

	// wait for Space after a page
	function WaitGoFrame()
	{
		var intV = 0;

		if ((m_intFrames & 16) !== 0)
		{
			TilesPut(36, 29, 62);
		}
		else
		{
			TilesPut(36, 29, T_PANEL);
		}
		m_intFrames++;
		intV = Key();
		if (m_objTap !== null)
		{
			intV = 5;
		}
		if (intV >= 5)
		{
			Blip();
			m_strTalkStep = 'run';
			TalkRun();
		}
	}

	// the two options (lab0, lab1)
	function ChooseStart()
	{
		TextBox('CAPTAIN ' + m_strPName);
		TilesText(3, 23, 'YOUR ORDERS?');
		m_intSel2 = 0;
		ChooseDraw();
	}

	function ChooseDraw()
	{
		var intT = 0;

		for (intT = 0; intT <= 1; intT++)
		{
			TilesText(3, 25 + intT * 2, (intT === m_intSel2) ? '>' : ' ');
		}
		TilesText(5, 25, m_strLab0);
		TilesText(5, 27, m_strLab1);
	}

	function ChooseFrame()
	{
		var intV = Key();
		var intRow = 0;

		// a tap on an answer: it's picked
		if (m_objTap !== null)
		{
			intRow = Math.floor(m_objTap.y / 8);
			if ((intRow >= 24) && (intRow <= 25))
			{
				m_intSel2 = 0;
				intV = 5;
			}
			else if ((intRow >= 26) && (intRow <= 28))
			{
				m_intSel2 = 1;
				intV = 5;
			}
		}
		if (intV !== 0)
		{
			if (((intV === 1) || (intV === 3)) && (m_intSel2 > 0))
			{
				m_intSel2 = 0;
				Blip();
			}
			if (((intV === 2) || (intV === 4)) && (m_intSel2 < 1))
			{
				m_intSel2 = 1;
				Blip();
			}
			ChooseDraw();
			if (intV === 5)
			{
				SfxPlay(0, 90, -2, 13, 10, 0);
				m_intPicked = m_intSel2 + 1;
				m_intTalkPc = m_arrChoiceTargets[m_intSel2];
				m_strTalkStep = 'run';
				TalkRun();
			}
		}
	}

	// cast member c's face, big, on the right (mouth mo, -1 their own); c -1: none
	function ShowFace(intC_a, intMo_a)
	{
		if (intC_a < 0)
		{
			FaceHide();
		}
		else
		{
			FacePut(intC_a, 160, 36, intMo_a);
		}
		m_intFaceOn = intC_a;
	}

	function TextBox(strName_a)
	{
		TilesRect(1, 23, 38, 8, T_PANEL);
		TilesRect(1, 22, 38, 1, T_PANELT);
		if (strName_a.length > 0)
		{
			TilesText(3, 22, ' ' + strName_a + ' ');
		}
	}

	// a cast member's name (the Captain: the name typed in)
	function CName(intC_a)
	{
		var strResult = '';

		if (intC_a === K_YOU)
		{
			strResult = 'CAPTAIN ' + m_strPName;
		}
		else if (intC_a === K_YOON)
		{
			strResult = 'DR YOON';
		}
		else if (intC_a > 0)
		{
			strResult = g_arrZBNames[intC_a].replace(/ /g, '');
		}

		return strResult;
	}

	// a token's name: 1 the Captain, 2 whoever is speaking, 4 the sector
	function TokName(intB_a)
	{
		var strResult = m_strMapName;

		if (intB_a === 1)
		{
			strResult = m_strPName;
		}
		else if (intB_a === 2)
		{
			strResult = CName(m_intSpk);
		}

		return strResult;
	}

	// a text with the tokens' names in (LBStr)
	function Tokens(str_a)
	{
		var strResult = '';
		var intJ = 0;
		var intB = 0;

		for (intJ = 0; intJ < str_a.length; intJ++)
		{
			intB = str_a.charCodeAt(intJ);
			if (intB < 8)
			{
				strResult = strResult + TokName(intB);
			}
			else
			{
				strResult = strResult + str_a.charAt(intJ);
			}
		}

		return strResult;
	}

	// ================================================================================================
	// THE GAME LOOP AND THE PICTURE

	// one Next frame: 50 a second
	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		if (m_blnLoaded && (m_objViewPort !== null))
		{
			readPointer();
			if (m_strMode === 'title')
			{
				TitleFrame();
			}
			else if (m_strMode === 'name')
			{
				NameFrame();
			}
			else if (m_strMode === 'talk')
			{
				TalkFrame();
			}
			else if (m_strMode === 'play')
			{
				PlayFrame();
			}
			else if (m_strMode === 'bang')
			{
				BangFrame();
			}
			else if (m_strMode === 'wait')
			{
				WaitFrame();
			}
			else if (m_strMode === 'theend')
			{
				TheEndFrame();
			}
			m_objSlots.step();
		}
		m_objSound.update();
	};

	// the picture: the border black, Layer 2, the sprites over it, the tilemap on top (Nx.OrderUSL),
	// the pad over all of it (once a touch has been seen)
	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a;
		m_arrTouches = objTouches_a;
		m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, SCREENW, SCREENH);
		if (m_blnLoaded)
		{
			objContext_a.drawImage(m_objLayer2, 32, 32);
			m_objSlots.paint(objContext_a);
			m_objGrid.paint(objContext_a, 0, 0);
		}
		m_objPad.paint(objContext_a);
	};

	// ================================================================================================
	// START

	// a library sprite: where its frames are (a cell of gfx-zbomber.js, frames w x h side by side) and
	// its animation
	function sprite(strName_a, objCell_a, intW_a, intH_a, arrSequence_a, intDelay_a)
	{
		return { name:strName_a, classes:'zbomber', imagename:'zbomber_s0', x:0, y:0, w:intW_a, h:intH_a, imagex:objCell_a.col * 16, imagey:objCell_a.row * 16, imagew:intW_a, imageh:intH_a,
			sequence:arrSequence_a, delay:intDelay_a, collisiontype:'bb', hbx:0, hby:0, hbsize:16 };
	}

	this.run = function()
	{
		var arrImages = G.images.slice(0);

		Tables();
		m_objLayer2 = document.createElement('canvas');
		m_objLayer2.width = 256;
		m_objLayer2.height = 192;
		m_objLayer2Context = m_objLayer2.getContext('2d');

		arrImages.push({ name:'zbomber_board', classes:'zbomber', source:'images/zbomber/board.png' });
		arrImages.push({ name:'zbomber_faces', classes:'zbomber', source:'images/zbomber/faces.png' });
		m_objSprites.addImagesToLibrary(arrImages);
		// the library sprites: where their frames are and what they do on their own (sequence, delay
		// in iterations: the Next game's frames \ 6 and \ 12 phases); the faces: 8 people x 6 mouths
		m_objSprites.addSpritesToLibrary([
			sprite('cursor', G.S_CURSOR, 32, 16, [1, 2, -1], 8),		// blinking
			sprite('pick', G.S_PICK, 32, 16, [1, 0], 1),
			sprite('frigate', G.S_FRIGATE, 16, 16, [1, 2, -1], 6),		// engines
			sprite('drone', G.S_DRONE, 16, 16, [1, 2, -1], 6),
			sprite('zb', G.S_ZB, 32, 16, [1, 2, -1], 6),
			sprite('key', G.S_KEY, 16, 16, [1, 2, -1], 12),			// glinting
			sprite('digit', G.S_DIGIT, 16, 16, [1, 0], 1),				// frame n + 1: the digit n
			sprite('flag', G.S_FLAG, 16, 16, [1, 0], 1),
			sprite('target', G.S_TARGET, 16, 16, [1, 0], 1),
			sprite('laser', G.S_LASER, 16, 16, [1, 0], 1),
			sprite('boom', G.S_BOOM, 16, 16, [1, 2, 3, 4, 0], 2),		// once through
			{ name:'face', classes:'zbomber', imagename:'zbomber_faces', x:0, y:0, w:36, h:36, imagex:0, imagey:0, imagew:36, imageh:36, sequence:[1, 0] } ]);
		m_objGrid = new JTileGrid(m_objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16, images:G.tilerows.map(function(str_a)
		{
			return 'zbomber_t' + str_a;
		}), first:0, firstcode:0, transparent:0 });
		m_objPad = new JPad({ controls:[], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:KC_SPACE, fire2:KC_M } } ] });
		m_objSprites.loadImagesByIDs(m_objSprites.getImageIDsByClass('zbomber'), function()
		{
			m_objGrid.invalidate();
			m_blnLoaded = true;
			Title();
		});
		m_objGameLoop.process({ iterationspersecond: 50, cbOnIteration: m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autoclear: true, autorotate: true, buffered: true, pixelated: true, hidpi: true, maxtouches: 6,
			target: 'canOutput', xresolution: SCREENW, yresolution: SCREENH, cbOnRender: m_objThis.onRenderCanvas });
	};
}

var g_objGame = new zbomberGame();
g_objGame.run();
