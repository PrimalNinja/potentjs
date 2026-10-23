# Z-BOMBER (PotentJS): how it plays and how it is built

(c) 2026 Cyborg Unicorn Pty Ltd

The ZX Spectrum Next game Z-BOMBER (NTC BASIC) ported to PotentJS, the ES5 browser game framework.
It runs on a PC (keyboard, mouse, game pad) and on a phone (touch, held either way). Open `game.htm`,
or serve the folder with any web server. No build step, nothing to install.

## 1. What it is

Capture the flag across five sectors of the solar system, on an isometric board of 8 x 8 sectors. Your
fleets are frigates, and one of them carries the Z-BOMBER. The IRON SWARM's fleets are drones. Each side
keeps a STAR KEY in its home base. Take the Swarm's key into your own base while yours is still at home,
and the sector is won. Between the battles the crew talk, and after a win you choose a refit (a stronger
Z-BOMBER) or six more frigates. Lose four times and the war is lost; win all five and the ending plays.

The rules are the Next game's, unchanged (`assets/zbomber-next/Main.bas`):
- **Board:** space; a nebula or asteroids (twice as slow); a rift (nothing gets through); planets (move
  onto one and it's yours; every two planets add a ship to your base's building); the two bases.
- **Battles:** fleets of both sides in one sector fight round by round. Each side loses 25-49% of the
  other's strength a round. A base adds 4 to you at home and 6 to the Swarm at theirs. The Z-BOMBER is worth
  6 (+3 a refit) and its hull (10, +4 a refit) only takes hits when its frigates are gone; then it falls
  back to be mended for 18 seconds.
- **Building:** a ship every 5 seconds at each base, one more for every two planets; 50 ships a side (the
  Swarm more in each sector).
- **The Swarm:** guards its base, raids yours when it's strong enough, grabs planets, chases whoever has
  its key, runs for any dropped key.

## 2. Controls

| | Keyboard | Touch / mouse | Game pad |
|---|---|---|---|
| cursor a sector | Q A O P or the arrows (the board is turned: Q up-right, A down-left, O up-left, P down-right) | the pad, over the sky bottom left | stick or d-pad |
| pick a fleet, send it, stay | Space or Enter | tap the sector (your fleet: pick it; one picked: send it there; its own sector: stay), or GO | A |
| all or half | M | HALF, or the panel's top right | B |
| a talk: go on, pick an answer | Space; Q A to choose | tap; tap the answer | A |
| your name | Q A O P, Space; M ends it | tap a letter, tap OK | |

The pad and buttons (GO and HALF, over the sky bottom right) are there only in the play, and show only once a
touch has been seen, so a PC never shows them. The talks, the title, the name and the end are played by tapping.

## 3. The files

| File | What it is |
|---|---|
| `game.htm` | the page: the PotentJS files, then the game's |
| `js/game-zbomber.js` | the game: `Main.bas` ported, and the Next hardware it uses |
| `js/gfx-zbomber.js` | the tile and sprite names (made by `tools/nextgfx.py`) |
| `js/data-zbomber.js` | the story as ops, the cast's names and looks (made by `tools/jsexport.py`) |
| `images/zbomber/tiles_0.png`, `tiles_ink.png` | the tiles (panel, font 32-126) and the font's ink (nextgfx.py) |
| `images/zbomber/sprites_0..4.png` | the sprites in the 5 sprite palettes (nextgfx.py) |
| `images/zbomber/board.png` | the 9 sector pictures, 32 x 40 (jsexport.py, from isoart.py's `blocks.bin`) |
| `images/zbomber/faces.png` | 8 faces x 6 mouths, 36 x 36, put together as `Face.cls` does (jsexport.py) |
| `js/constants.js`, `utils.js`, `jsprites.js`, `jtilegrid.js`, `jcanvas.js`, `jgameloop.js`, `jsound.js`, `jpad.js` | PotentJS, as in THE GRID's port, with one fix in `jpad.js` (below) |
| `css/canvas.css`, `css/games.css` | PotentJS's page styles |
| `tools/nextgfx.py` | PotentJS's tool: the Next game's tiles and sprites |
| `tools/jsexport.py` | this port's tool: the board, the faces, the story |
| `assets/zbomber-next/` | the Next game's sources the tools read: `Main.bas`, `gfx/`, `gfx_faces/`, `scripts/STORY.txt`, `tools/` (`blocks.bin`, `people.bin`, `storyc.py`, the art scripts) |

To make the pictures and data again (Python 3 with Pillow):

```
python3 tools/nextgfx.py assets/zbomber-next zbomber
python3 tools/jsexport.py assets/zbomber-next
```

`nextgfx.py` tries the Next game's art script first, for exact palette numbers. Z-BOMBER's `artkit.py`
reads the Next's font from an NTC path that isn't here, so it falls back to the colours (and says so);
the result is the same pictures. Don't edit `gfx-zbomber.js` or `data-zbomber.js`: run the tools.

## 4. How it is put together

**The canvas** is the Next's whole picture, 320 x 256 logical pixels (border and all), and nothing more.
JCanvas scales it to fill the window from top to bottom (or side to side, whichever comes first) and turns
it on an upright phone. Touch only works on the canvas, so the pad and buttons are drawn over the game:
over the sky either side of the board, clear of the sectors and the panels (`PLAYCONTROLS`, set with
`JPad.setControls` when the play starts and taken away for a talk). JCanvas runs with `buffered`,
`pixelated` and `hidpi`: the frame is put together 1:1 and scaled in one go, so the tiles and the board
have no stitches, and phones are sharp.

**The Next's layers, the same way every port does them:**
- **Layer 2** (256 x 192, the board) is an off-screen canvas. `Sky` and `DrawBoard` draw it once a sector
  (`IsoFill`, `IsoPlot`, `IsoPic` from `board.png`), and the render draws it at (32, 32).
- **The tilemap** (40 x 32 cells, the panel and the text) is a `JTileGrid`. A character's code is its
  tile, as on the Next, so `Tiles.Text` and `Tiles.Put` port one for one (`TilesText`, `TilesPut`).
- **The hardware sprites** are a `JSpriteSlots` of 128, numbered as on the Next (`spr(n, x, y, name,
  frame, palette, scale)` for `Spr.Put`). Each slot shows a library sprite, and what a sprite does on its
  own belongs to the sprite: its sequence and delay. The frigates' and drones' engines and the
  Z-BOMBER's (every 6 frames), a STAR KEY's glint (12), the cursor's blink (8, only while no fleet is
  picked) and a battle's bangs (once through) are their library entries; the game only says
  `animate`, and `JSpriteSlots.step()` runs them each iteration. The palette picks the image
  (`zbomber_s0` to `_s4`); the title's Z-BOMBER is the same sprite four times the size.
- **A talk's face** is one 36 x 36 picture from `faces.png` drawn four times the size in slot 0 (the Next
  puts it together from 15 sprites).
- **The draw order** is `Nx.OrderUSL`: Layer 2, then the sprites, then the tilemap on top.
- **Sound** is `JSound`: `Sfx.Play`'s numbers go straight across (`SfxPlay`).

**Names and logic.** Every Sub of `Main.bas` is a function of the same name (`Clock`, `StepOut`,
`Arrive`, `Claim`, `Think`, `Goal`, `DrawAll`, `Panel`, `Talk` ...), every variable the BASIC one with the
prefixes (`fo` -> `m_arrFo`, `zf` -> `m_intZf`, `sector` -> `m_intSector`). ES5 throughout, one way out of
every function (the BASIC's `Exit Sub` and `Exit For` became if / else and loop flags).

**The data structures** are the Next's: parallel arrays by fleet (`m_arrFo` side, `m_arrFs` sector,
`m_arrFn` ships, `m_arrFt` target, `m_arrFx` the next sector on the way, `m_arrFw` / `m_arrFd` frames to
it, `m_arrFk` a key carried), by sector (`m_arrMt` kind, `m_arrOwn` holder), by key (`m_arrKs` home /
carried / dropped, `m_arrKf`, `m_arrKd`); tables made once by `Tables` (screen positions, neighbours,
digit patterns); and the route cache: `Field(target)` is a breadth-first search from the target, kept in
`m_arrFcache` (64 entries a target) until the map changes, and `StepOut` takes the nearest neighbour.

**The loops that wait became states.** The game loop calls the game 50 times a second, one Next frame
(speeds, timers and sound lengths carry straight over). The Next's waiting loops are modes
(`m_strMode`): `title`, `name`, `talk`, `play`, `bang` (a battle's 60 frames of flashes), `wait`
(`WaitF`), `theend`. Each does one frame of its loop; what came after the loop is a callback. A talk
runs the scene's ops (`TalkRun`) until one waits: a page typed two letters a frame (`TalkType`), Space
after a page (`WaitGoFrame`), a choice (`ChooseFrame`).

**A battle in the middle of the clock.** On the Next, `Clock` moves the fleets one after another; a fleet
arriving where the enemy is starts `Battle`, which plays the combine talk and the flashes and then fights
the rounds, all before `Clock` goes on to the next fleet. Here `Arrive` stops the clock at that fleet
(`m_blnSuspended`, `m_intResumeF`), the talk and the flashes run as states, then `BattleOver` fights the
rounds, finishes `Arrive` and runs `Clock` on from the next fleet. The order of events is the Next's.

**Collisions.** None of Z-BOMBER's rules are sprites touching: fleets meet in a sector (`m_arrFs`), keys
and planets are taken by the sector a fleet arrives in, and a tap is turned into a sector by the
diamond grid (`SectorAt`). So JSprites' collision detection isn't used: boxes round iso sprites overlap
their neighbours and would be less exact than the grid. The library sprites carry a `bb` box anyway.

**Input** is read through `JPad.isDown` (keyboard, pad and game pad look the same; the arrows turn with
the screen). `Key()` is the BASIC's: a direction once, again after 14 frames, then every 6; Space and M
once a press. Taps on the picture come from `JPad.taps()`: on the board, `SectorAt` turns a point into a
sector (the board's diamonds are centred on (SX, SY) on Layer 2).

## 5. A fix in PotentJS (jpad.js)

On a turned screen `JPad.isDown` turns the arrow keys round for the keyboard. It also turned the pad's
own arrows, which turn with the game already: on an upright phone the pad's up read as up and left at
once, and down as down and right (a game taking the last direction pressed went the wrong way). Now an
arrow the pad is holding counts only as itself; the keyboard's are turned as before. Other games are
unchanged except that this is put right for them too.

## 6. Tested

In Chromium (Playwright): a bot playing through the keys from the title through all five sectors
(battles, the combine talks, a lost sector, the choices) with no script errors; a phone held upright
(390 x 844, touch, the canvas turned) through the title, the name by tapping letters, the talks, and an
order by tapping sectors, HALF, and the pad's four ways.

## 7. Adding it to the games list

In `potentjs-games/index.htm`, with the folder copied in as `z-bomber-js/`:

```html
<li><a href="z-bomber-js/game.htm">Z-BOMBER</a>
	<span class="what">Capture the Swarm's STAR KEY across five sectors of the solar system, with the Z-BOMBER's crew.</span>
	<span class="keys">Q A O P move, Space pick / send, M all or half. Touch: tap a sector, the pad, GO, HALF.</span></li>
```
