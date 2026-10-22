# PotentJS updates

(c) 2026 Cyborg Unicorn Pty Ltd, MIT License

These are the changes made to PotentJS (uploaded as fe6b9c0f-gameframework.zip, now
`potentjs.zip` with everything in a `potentjs/` folder) while porting the
ZX Spectrum Next games. All of it is ES5. The old demos (`spritedemo.htm`,
`itpdemo.htm`, `mmogdemo.htm`) still run the same, because every new option
is off unless a page turns it on.

## Changed files

### js/jcanvas.js

There are three new options for `render()`, and all of them default to `false`.

- **`buffered`**: the frame is drawn at the logical resolution into an off-screen canvas, then
  scaled onto the real canvas in one `drawImage`. This fixes the stitches between scaled
  tiles: tiles are joined before anything is scaled. The render callback gets the buffer's
  context, so games don't change.
- **`pixelated`**: image smoothing is turned off after every resize, so the pixels stay sharp.
- **`hidpi`**: the canvas gets as many real pixels as the screen has (`devicePixelRatio`),
  with the CSS size set separately. Phones are no longer blurry. The scale factor takes it
  into account, so mouse and touch coordinates are still logical.

- **`xorigin`, `yorigin`** (default 0): the game's point shown at the canvas's top left. A game
  that draws inside a bigger space (a port keeping the Next's screen positions) gives JCanvas
  only the area it uses, and that area fills the window with no borders. Mouse and touch come
  back in the game's own coordinates.

### js/jsprites.js

- **New globals:** `SPRITE_MIRRORX = 1` and `SPRITE_MIRRORY = 2`.
- **`getImageByName(name)`**: a library image by name.
- **`stampSprite(ctx, name, frame, x, y, image, scale, flags)`**:
  - draws a library sprite at any frame;
  - takes another image (a colour variant of the same sheet), a scale, and mirroring;
  - mirrors about the sprite's middle.
- **`paintTile(ctx, tileset, tile, x, y, image, scale)`**: one tile of a tile set.
- **`paintText(ctx, font, str, x, y, image, scale)`**: text from a font sheet. The font is
  `{ imagename, tilew, tileh, columns, first, firstcode }`.
- **`getTintedImage(name, cssColour)`**: an image in one colour, cached. It's made by
  compositing (`source-in`), so it works from `file://`, where `getImageData` doesn't.
- **`paintBigText(ctx, inkImage, str, x, y, zoom, top, bottom, shadow, offset)`**: 8 x 8 font
  text blown up. The top half is one colour, the bottom half another, with a shadow.
- **Sprite library entries** can have a `delay` (iterations per step of the sequence, used by
  `animateSprites`) and a rectangular hit box (`hbw`, `hbh`, used by the collision methods).
  Without them, everything works as before.
- **`getSpriteByName(name)`**: a library sprite's description, to read.
- **New class `JSpriteSlots(sprites, count)`**: numbered sprites, like a machine's hardware
  sprites. Higher numbers are drawn on top.
  - **Showing:** `put`, `move`, `look`, `hide`, `hideRange`, `isVisible`, a clip window
    (`setClip`), and `paint`.
  - **Animation:** the library sprite's own `sequence` and `delay` with `animate(n, step)`,
    `unanimate`, `setDelay`, `isAnimated`. One sequence holds a loop per state, and the game
    picks the loop.
  - **Movement:** positions as numbers or functions (`showRange`, `moveBy`, `moveRangeBy`), as
    JSprites' bullet-pattern style, and a mover per slot (`setMover`) for things that move on
    their own.
  - **Collisions:** the library sprite's own hit box (`collide`, `collideRange`, `collideRect`,
    `getBox`).
  - **`step()`** once an iteration runs the movers and the animations.
- **`imageOf`** (private): lets the helpers take an image name or an image object.
- **Unchanged:** `paintTiles` still has its fixed row limits.

### js/jgameloop.js

A quick key tap is no longer lost. If a key goes down and up between two iterations, the
release waits until one iteration has seen the key down. This uses `m_arrKeySeen` and
`m_arrKeyRelease`.

- **`pauseifhidden`** (default true): no iterations while the page is out of the foreground. The
  game carries on from where it was when it comes back. `isPaused()` says if it's paused. JITP
  has its own timer, so a multiplayer game stays connected.

### js/utils.js

- `rgb332ToCSS(int)`: an 8-bit RRRGGGBB colour (the Next's) as CSS.
- `rnd(n)`: a whole number from 0 to n-1, as in BASIC's `Rnd(n)`.
- `strBasic(n)`: BASIC's `Str$`, with a space in front of numbers that aren't negative.
- `rightStr(s, n)`: BASIC's `Right$`.
- **`JRepeat(first, next)`**: a held direction that repeats like a keyboard does: once
  straight away, then after `first` iterations, then every `next`. Call `next(held)` once an
  iteration. It's for moving a pointer round a menu or a board.

## New files

### js/jtilegrid.js: JTileGrid

`new JTileGrid(sprites, { w, h, tilew, tileh, columns, images, first, firstcode, transparent })`

- **Variants:** each cell has a tile and a *variant*, which is an index into `images`. That's
  how a Next tilemap cell's palette row is done: each row is its own image.
- **Methods:** `put`, `get`, `getVariant`, `text`, `rect`, `clear`, `invalidate` and
  `paint(ctx, x, y)`. `setImage(variant, name)` swaps a colour scheme and redraws only the
  cells using it.
- **Painting:** `paint` keeps the grid in its own 1:1 canvas and redraws only the cells that
  changed. It then draws onto the frame in one piece, so there are no stitches.
- **Missing images:** a variant whose image is missing falls back to image 0.

### js/jsound.js: JSound

`new JSound({ channels, clock, volume })` makes sound with Web Audio, with no sound files. Each
channel has a square-wave oscillator and looping white noise.

- **`play(channel, period, slide, volume, frames, noise)`**: the same numbers as the Next
  games' `Sfx.Play`. That's an AY tone period (clock 1750000), a pitch slide per frame,
  volume 0-15, and a fade over so many frames, as tone or noise.
- **Tunes:** `addTunesToLibrary([{ name, channel, volume, loop, notes:[[period, frames], ...] }])`,
  `playTune`, `stopTune` and `isTunePlaying`.
- **Other methods:** `addSoundsToLibrary` / `playSoundByName`, `isBusy`, `quiet`,
  `setEnabled` and `isEnabled`.
- **`update()`** runs once an iteration. It steps the tune, slides and fades.
- **Starting:** sound starts on the first key press or touch, as browsers want.

- **`pauseifhidden`** (default true): the sound stops while the page is out of the foreground,
  and carries on when it comes back.

### js/jmusic.js: JMusic

Music sprites. A pattern of notes on a channel (0-9) is kept in a library and played like a
JSprites sprite: from any step, paused, carried on, looped. A sequence can start, pause or hold
other music sprites, and raise an event for the game, so one part can bring the others in on
the beat. It steps in the game loop, so the music never skips when drawing does. It plays
through its own JSound or one the game already has. `music.htm` and `js/game-music.js` are the
demo; STACKER uses it for its tune, bass and drums.

### js/jpad.js: JPad

Touch controls that press keys, so a game only ever reads keys.

- **Controls:** `{ type:'dpad', x, y, size, keys:{ left, right, up, down } }`,
  `{ type:'button', x, y, size, key, label }`, and `{ type:'zone', x, y, w, h, key }` (not
  drawn).
- **`update(keymap, touches, mouse)`** runs once an iteration. A control being touched sets
  its key down, and it's let go when nothing touches it.
- **`isDown(keymap, key, viewport)`**: a key is down, by the keyboard or the pad. The arrow
  keys are turned round when the screen is rotated.
- **`taps()`**: this iteration's new touches or clicks that missed every control, as
  `[{ x, y }]`. It's for pointing at things: a card, a company, a spot on the floor.
- **`gamepads:[{ index, keys:{ left, right, up, down, fire, fire2 } }]`**: a game pad's stick,
  d-pad and A / B buttons press keys (the Gamepad API, polled each update).
- **`setControls`** gives each screen its own buttons. **`isTouch`** says whether a touch has
  been seen. **`paint`** draws the controls only once a touch has been seen, so a PC never
  shows them.

### js/jsteps.js: JSteps

This runs a game written as "do this, wait, loop until a key" without blocking the browser.

- **`call(fn)`**: a step that runs once.
- **`wait(n)`**: n iterations of nothing.
- **`until(fn)`**: runs once an iteration until it returns true.
- **`clear()`** and **`isBusy()`**.
- **`update()`** runs once an iteration.

Steps added while a step runs go in front of what's left, like a sub calling a sub. An `until`
that adds steps gets them run before it's called again.

### js/jzosciiwebradio.js: JZOSCIIWebRadio

ZOSCII MQ Web Radio as a PotentJS library, with no page furniture and no jQuery.

- **Sources:** ZOSCII MQ channels (fetched and decoded in the browser with the station's key
  file) and ICY streams, as in the existing jQuery player.
- **What it hands over:** song details from ID3v1 / ID3v2 tags, pictures and text from the MQ,
  and the sound's levels (`getLevels`) for a meter.
- **Controls:** next, previous, pause, a jump to a point in the song, and channel changes.
- **The end of a channel:** the same six behaviours as the jQuery player.
- **The key file:** a URL, a chosen or dropped file, or bytes.
- **HTTP and HTTPS:** a page served over HTTPS can only use HTTPS sources. Self-hosted ones can
  be HTTPS; an HTTP-only ICY stream works from a page served over HTTP.

### radio.htm, js/game-radio.js, radio/logo.png

A ZOSCII Web Radio player drawn in the canvas, set up for Cyborg Unicorn ZOSCII Web Radio (its
two MQ channels and two ICY streams).

- **Choosing channels:** tick channels by tap or key.
- **On screen:** the song, picture and text, the level bars, and a progress bar you can tap.
- **Controls:** PLAY, PAUSE, NEXT, PREV, MODE (the end-of-channel behaviour), and KEY FILE to
  choose another station's key file (or drop one on the page).
- **The bundled key file:** Cyborg Unicorn's (`radio/logo.png`).
- **The MQ address:** the MQ channels use `indexmq.php` as the station's player does, so the page
  must be served from the station's server for them. Elsewhere, put the MQ's full address in
  `SOURCES` at the top of `js/game-radio.js`.

### css/games.css

A black page with no scrolling, no text selection, and no browser touch gestures.

### The tools (Python 3 with Pillow)

- **`tools/nextgfx.py <Next game folder> <name> [rows.json]`** makes images from the game's
  own art script, with exact palette indexes.
  - It writes `images/<name>/tiles_<row>.png`, `sprites_<row>.png` and `tiles_ink.png`, plus
    `js/gfx-<name>.js` with the layout's names (`T_...`, `S_...`).
  - It reads `Board.Pal` lines from Main.bas.
  - `rows.json` adds `tilerows` (colour schemes a game makes at run time) and `spriterows`
    (sprite rows with some entries changed, for palette cycling).
- **`tools/basdata.py <file.cls> <label> <JS name> <out.js>`** copies a class's `db` bytes
  into a JS array.
- **`tools/l2runs.py <file.cls> <label> <w> <h> <out.png> [first-last <prefix>]`** unpacks a
  run-packed Layer 2 picture.
  - Colours are the Layer 2 default palette.
  - Cycled palette entries are left see-through and written as masks, one per entry, for
    tinting.
- **`tools/ports/*.json`**: the rows used for GEM RUSH, CHOMPBOT, STOCK MARKET and ARCADE
  TYCOON.

### The games

The ports keep what their sprites do in the sprites:
- **Animation:** each sprite's animation is its library sequence, with a loop per state.
- **Hit boxes:** each sprite's hit box is in its library entry.
- **Things that move on their own** have movers: THE GRID's sparks, ARCADE TYCOON's coins, and
  CARD CLASH's pointer and flash.
- **What's left in each game:** what everything is doing, and the questions "do these two
  touch?". There's no frame counting and no distance sums.


| Page | Files |
|---|---|
| `stacker.htm` | `js/gfx-stacker.js`, `js/game-stacker.js`, `images/stacker/` |
| `gemrush.htm` | `js/gfx-gemrush.js`, `js/data-gemrush.js`, `js/game-gemrush.js`, `images/gemrush/` |
| `chompbot.htm` | `js/gfx-chompbot.js`, `js/data-chompbot.js`, `js/game-chompbot.js`, `images/chompbot/` |
| `thegrid.htm` | `js/gfx-thegrid.js`, `js/game-thegrid.js`, `images/thegrid/` |
| `clash.htm` | `js/gfx-clash.js`, `js/game-clash.js`, `images/clash/` |
| `stocks.htm` | `js/gfx-stocks.js`, `js/game-stocks.js`, `images/stocks/` |
| `burger.htm` | `js/gfx-burger.js`, `js/game-burger.js`, `images/burger/` (`shop.png`) |
| `checkout.htm` | `js/gfx-checkout.js`, `js/game-checkout.js`, `images/checkout/` (`store.png`, `belt_F0`-`FF`) |
| `arcade.htm` | `js/gfx-arcade.js`, `js/game-arcade.js`, `images/arcade/` (`floor.png`, `sprites_0a`-`0c`) |

- **`games.htm`** links to all nine, with what each one is and its controls, and to the radio.
- **`PORTS.md`** covers how the ports are laid out, the libraries, the tools, and how to port
  the next game.
- **`FRAMEWORK.md`** is the full reference for PotentJS: every library, option and method, with a minimal example game.
- **`updates.md`** is this file.

## The second round of ports

DEFENDER, DEFENDER HYPERSPACE, DEFENDER MULTIPLEX, MULTIPLEX and MONARCH BUTTERFLY. What they
added is generic and off unless a game uses it; the other games run as before.

- **`js/jpixelscreen.js`** (new): `JPixelScreen`, a Layer 2 style screen of colour numbers with a
  palette, plot / span / rect / line, `transparentcolour`, and painting in scrolled bands.
- **`js/jtilegrid.js`**: `paint(ctx, x, y, bands)`: the optional bands scroll strips of the grid
  sideways, wrapping round.
- **`js/jpad.js`**: game pads' X and Y buttons press `fire3` and `fire4` when they're given.
- **`tools/gfxlayout.py`**, **`tools/patstrip.py`** (new), and the DEFENDER games' own makers in
  `tools/ports/`.

## The tactics games

DEMON TRANSCENDENCE, ZOMBIE APOCALYPSE, WITCH COVENS and VOID STRIKE: one engine on the Next,
so one engine here (`js/tactics.js` in each game's folder, the same file in all four), with each
game's own data (`js/data-<game>.js`) and art (`images/<game>/`). No library changes.

- **`tools/ports/tactics_export.py`** (new) makes a game's images and data from the Next game's
  folder: the tiles in each palette row, the sprites, the Layer 2 pictures, the maps, words and
  kinds.
- **`tools/ports/tactics_sheets.py`** (new) puts the sprites together as the sheets the engine
  loads (units, the 2 x 2 ones, items, effects).
- Touch: no on-screen controls. Taps inside the canvas only: a soldier picks him, a cell next
  to him steps there, a demon he can see aims at it; in a menu a tap is Enter.

## Screen modes (JCanvas)

- **`js/jcanvas.js`**: a new option, `screenmode`. It's `'normal'` (the default, which works
  exactly as before), `'fullscreen'` or `'ask'`.
  - **Full screen** widens the game's resolution to the window's shape (turned with the screen),
    half the extra each side. A game that doesn't use it is centred. One that reads `getView()`
    can fill the extra.
  - **Ask** shows a NORMAL / FULLSCREEN choice first, by keys, mouse, touch or game pad.
- New methods: `getView()`, `getScreenMode()`, `setScreenMode(mode)`. New options:
  `screenmodelabels`, `cbOnScreenMode`.
- **DEFENDER HELLGATE** uses it: it asks at the start. In full screen on a wider screen it shows
  more of the world left and right (up to 128 more each side): the stars, the landscape, the
  enemies, humanoids, bullets, pickups, the HELLGATE and the mechs. The HUD and the scanner stay in
  the middle. What happens in the game is unchanged: the laser's reach, what can be hit, the smart
  bomb and when enemies fire are still the Next's 256 across.

## Sprite rotation and widescreen ports

- **`js/jsprites.js`**: `SPRITE_ROTATE` (from DEATH BLOSSOM's and ATTACK OF THE CYBORG UNICORNS 2's
  own copies, now in the framework): a quarter turn clockwise before the mirrors, as the Next's
  rotate bit; the hit box turns with it.
- The ports ask NORMAL / FULLSCREEN at the start (`screenmode:'ask'`) and use the extra width to
  show more of the game's world; what happens in each game is unchanged.

## Tile mirroring, row scroll, shots to the edge

- **`js/jtilegrid.js`**: from DEFENDER (Next Edition)'s and CYBORG UNICORN DEFENDER's own copies, now in
  the framework: `put(x, y, tile, variant, flags)` takes `SPRITE_MIRRORX` / `SPRITE_MIRRORY` (a Next
  tilemap cell's mirror bits), `getFlags(x, y)`, and `paintRows(ctx, x, y, firstRow, rows, scrollX)`
  (a band of rows slid sideways and wrapped). `paint`'s bands are kept. Nothing changes for a game
  that doesn't use them.
- In full screen the player's own shots now reach the edges of what's shown, and enemies drawn
  there can be hit (MONARCH BUTTERFLY and the DEFENDER games). Everything else is the Next's.

## Not changed

- The demo pages and their games.

## Removed

- The New Zealand Story demo: `index.htm`, `nzstory.htm` and `js/game-nzstory.js`.
- `js/constants.js`, `js/jitp.js`, `css/canvas.css` and `font/`.

## DEFENDER HELLGATE

- **`js/jsprites.js`**: `JSpriteSlots.step(first, count)`: both optional. Given, only those slots'
  movers and animations move on and the rest are held as they are, as a machine's sprites stay put
  while its program waits (DEFENDER HELLGATE holds everything but the ship while it blows up, and
  everything during the end of a wave). `step()` with nothing does what it always did.
- **`tools/ports/defhell_gfx.py`** (new): DEFENDER HELLGATE's images and font data from the Next
  game's `SprData.cls` (its 8-bit and 4-bit patterns and sprite palette), `gfx/tiles.png` and
  `Main.bas`'s `Board.Pal` rows.
- **`js/jsound.js`**: samples. `addSamplesToLibrary`, `playSample`, `stopSample`,
  `isSamplePlaying`, and the option `samplevolume`. They're 8-bit unsigned mono at any rate, given
  as base64 so they load from a `.js` file. Nothing changes for a game that doesn't use them.
- **`tools/ports/defhell_voice.py`** (new): DEFENDER HELLGATE's 25 voice lines from the Next
  game's `tools/speech/*.wav`, made the way its `speech.py` makes them (13,671 a second, 8 bits,
  each matched in loudness), into `js/data-defhell-voice.js`.
- **DEFENDER HELLGATE** now has the voice of the Next's DEFHELLV build: the same lines at the same
  moments, one at a time, and the keys 1-5 (volume), 0 (off) and V (off and back on).
