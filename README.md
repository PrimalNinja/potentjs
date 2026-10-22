# PotentJS

(c) 2026 Cyborg Unicorn Pty Ltd, MIT License

PotentJS is a small JavaScript framework for 2D games in a browser canvas, aimed at 8-bit style
games. It runs on a PC and on a phone, with the canvas turned round when the phone is held
upright.

It's ES5 throughout. There's no build step and nothing to install. It comes as `potentjs.zip`:
unzip it and everything is in the `potentjs/` folder; open `games.htm` to see the games. A game is an `.htm` page
that loads the library files with `<script>` tags, then the game's own file.

Other documents in this folder:
- `PORTS.md`: the Next games ported to it, and how to port another one.
- `updates.md`: what changed from the original PotentJS.

## Contents

1. [The files](#the-files)
2. [How a game runs](#how-a-game-runs)
3. [A page and a minimal game](#a-page-and-a-minimal-game)
4. [constants.js](#constantsjs)
5. [utils.js](#utilsjs)
6. [JCanvas (jcanvas.js)](#jcanvas-jcanvasjs)
7. [JGameLoop (jgameloop.js)](#jgameloop-jgameloopjs)
8. [JSprites (jsprites.js)](#jsprites-jspritesjs)
9. [JSpriteSlots (jsprites.js)](#jspriteslots-jspritesjs)
10. [JTileGrid (jtilegrid.js)](#jtilegrid-jtilegridjs)
11. [JPixelScreen (jpixelscreen.js)](#jpixelscreen-jpixelscreenjs)
12. [JSound (jsound.js)](#jsound-jsoundjs)
13. [JPad (jpad.js)](#jpad-jpadjs)
14. [JSteps (jsteps.js)](#jsteps-jstepsjs)
15. [JITP (jitp.js)](#jitp-jitpjs)
16. [JZOSCIIWebRadio (jzosciiwebradio.js)](#jzosciiwebradio-jzosciiwebradiojs)
17. [JMusic (jmusic.js)](#jmusic-jmusicjs)
18. [The tools](#the-tools)
19. [Code conventions](#code-conventions)

## The files

| File | What it is |
|---|---|
| `js/constants.js` | default resolution, key codes, the rotated arrow keys |
| `js/utils.js` | `isFunction`, `processArray`, BASIC helpers, `JRepeat` |
| `js/jcanvas.js` | `JCanvas`: the canvas, scaling, rotation, mouse, touch, the render loop |
| `js/jgameloop.js` | `JGameLoop`: the game's fixed-rate loop and the key map |
| `js/jsprites.js` | `JSprites`: images, sprites, animation, collisions, drawing helpers; `JSpriteSlots` |
| `js/jtilegrid.js` | `JTileGrid`: a tile / text screen |
| `js/jpixelscreen.js` | `JPixelScreen`: a screen of 8-bit pixels (a Next's Layer 2), painted in scrolled bands |
| `js/jsound.js` | `JSound`: sound effects and tunes |
| `js/jmusic.js` | `JMusic`: music sprites, multi-channel music played from patterns, kept in time by the game loop |
| `js/jpad.js` | `JPad`: on-screen touch controls, taps and game pads |
| `js/jsteps.js` | `JSteps`: steps and waits for games written as sequences |
| `js/jitp.js` | `JITP`: the third loop, for multiplayer games: talks to the game server at a fixed rate |
| `js/jzosciiwebradio.js` | `JZOSCIIWebRadio`: ZOSCII MQ Web Radio, from a ZOSCII MQ or an ICY stream |
| `css/canvas.css` | the original page style (centred canvas) |
| `css/games.css` | a games page: black, no scrolling, no touch gestures (load after canvas.css) |
| `tools/*.py` | Python tools that make a game's images and data |
| `games.htm` | the list of ported games |
| `music.htm`, `js/game-music.js` | the JMusic demo: a song on five channels that brings its parts in on cue |
| `radio.htm`, `radio/logo.png` | a ZOSCII Web Radio player in the canvas, with Cyborg Unicorn's key file |

## How a game runs

There are up to three loops, and they run separately.

- **The game loop** (`JGameLoop`) runs at a fixed number of iterations per second, set by the
  game (50 for the Next ports). The game's logic goes here: input, movement, rules, sound
  updates. It gets the key map each time.
- **The render loop** (`JCanvas`) runs at the display's rate (`requestAnimationFrame`) and
  calls the game's render callback. Drawing goes here, and nothing else. It gets the drawing
  context, the viewport, the mouse, the touches and the frame rate.
- **The network loop** (`JITP`) is only for multiplayer games. It calls the game server at
  its own fixed rate (3 calls a second by default): it sends what the game gives it and hands
  back the server's reply (in `mmogdemo.htm`, the area and player go up and the area's data
  comes back). It's kept apart so a slow server never holds up the game or the drawing. The
  game loop reads what the last call brought back.

The game draws in **logical pixels** (for example 448 x 256). JCanvas scales that to fit the
window and centres it. On an upright phone it turns it a quarter round (autorotate), so the
game always sees a landscape canvas. Mouse and touch positions come back in logical pixels.

## A page and a minimal game

```html
<html>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	<head>
		<title>MY GAME</title>
		<link rel="stylesheet" type="text/css" href="css/canvas.css">
		<link rel="stylesheet" type="text/css" href="css/games.css">
	</head>
	<body>
		<canvas id="canOutput"></canvas>
		<script src="js/constants.js"></script>
		<script src="js/utils.js"></script>
		<script src="js/jsprites.js"></script>
		<script src="js/jtilegrid.js"></script>
		<script src="js/jcanvas.js"></script>
		<script src="js/jgameloop.js"></script>
		<script src="js/jsound.js"></script>
		<script src="js/jpad.js"></script>
		<script src="js/jsteps.js"></script>
		<script src="js/game-mygame.js"></script>
	</body>
</html>
```

```javascript
// game-mygame.js - a square that moves with the arrows, the pad or a game pad
function myGame()
{
	var m_objThis = this;
	var XRES = 448, YRES = 256;
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objSound = new JSound({ channels:3 });
	var m_objPad = new JPad({ controls:[
		{ type:'dpad', x:32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
		{ type:'button', x:416, y:170, size:22, key:32, label:'BEEP' }
	], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:32 } } ] });
	var m_arrKeyMap = [], m_objViewPort = null, m_arrTouches = [], m_objMouse = null;
	var m_intX = 200, m_intY = 120;

	function down(intKey_a)
	{
		return m_objPad.isDown(m_arrKeyMap, intKey_a, m_objViewPort);
	}

	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_arrKeyMap = arrKeyMap_a;
		m_objPad.update(m_arrKeyMap, m_arrTouches, m_objMouse);
		if (down(KEY_LEFT)) { m_intX--; }
		if (down(KEY_RIGHT)) { m_intX++; }
		if (down(KEY_UP)) { m_intY--; }
		if (down(KEY_DOWN)) { m_intY++; }
		if (down(32) && !m_objSound.isBusy(0)) { m_objSound.play(0, 200, -4, 14, 10, false); }
		m_objSound.update();
	};

	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objViewPort = objViewPort_a; m_arrTouches = objTouches_a; m_objMouse = objMouse_a;
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(0, 0, XRES, YRES);
		objContext_a.fillStyle = '#ff0';
		objContext_a.fillRect(m_intX, m_intY, 16, 16);
		m_objPad.paint(objContext_a);
	};

	this.run = function()
	{
		m_objGameLoop.process({ iterationspersecond:50, cbOnIteration:m_objThis.onIterationGameLoop });
		m_objCanvas.render({ autorotate:true, buffered:true, pixelated:true, hidpi:true,
			target:'canOutput', xresolution:XRES, yresolution:YRES, cbOnRender:m_objThis.onRenderCanvas });
	};
}

var g_objGame = new myGame();
g_objGame.run();
```

This is the pattern every port uses. The render callback keeps the viewport, the touches and
the mouse. The game loop passes them to `JPad.update`, then reads keys through `JPad.isDown`.
Keyboard, touch and game pad then all look the same to the game.

## constants.js

| Name | Value | Meaning |
|---|---|---|
| `XRESOLUTION`, `YRESOLUTION` | 320, 200 | the default logical size (JCanvas has its own defaults too) |
| `CHARSIZE` | 8 | a character cell |
| `KEY_LEFT`, `KEY_RIGHT`, `KEY_UP`, `KEY_DOWN` | 37, 39, 38, 40 | the arrow keys' codes |
| `DEF_KEY_*` | the same | the unrotated arrow keys |
| `ROTATED_KEY_LEFT`, `_RIGHT`, `_UP`, `_DOWN` | 38, 40, 39, 37 | the arrow key that means each way when the screen is turned |

## utils.js

| Function | What it does |
|---|---|
| `isFunction(fn)` | true if `fn` is a function |
| `processArray(arr, cb)` | calls `cb(item, rowNumber, index)` for each item that isn't `undefined`; the callback returns `true` to stop |
| `rgb332ToCSS(n)` | an 8-bit RRRGGGBB colour (the Next's) as a CSS `rgb()` string |
| `rnd(n)` | a whole number from 0 to n-1 (BASIC's `Rnd(n)`) |
| `strBasic(n)` | BASIC's `Str$`: a space in front unless negative |
| `rightStr(s, n)` | BASIC's `Right$`: the last n characters |
| `JRepeat(first, next)` | a held direction that repeats like a keyboard |

`JRepeat` is for moving a pointer round a menu or a board. Call `next(held)` once an
iteration, where `held` is 0 for nothing held or any number for a direction. It returns the
number straight away, then again after `first` iterations, then every `next`. Otherwise it
returns 0.

```javascript
var objRepeat = new JRepeat(14, 6);
var intMove = objRepeat.next(intHeld);	// 0 most iterations, intHeld when it's time to move
```

## JCanvas (jcanvas.js)

`new JCanvas()`, then `render(options)` once. Calling `render` again with new options resizes
without starting a second loop.

| Option | Default | What it does |
|---|---|---|
| `target` | `''` | the `<canvas>` element's id |
| `xresolution`, `yresolution` | 320, 200 | the logical size the game draws in |
| `xscale`, `yscale` | 1, 1 | pixel shape: 2 for double-width pixels, 0.5 for double-height |
| `cbOnRender` | none | `function(context, viewport, mouse, touches, fps)`, called every frame |
| `autoclear` | true | clear the frame before each render |
| `autorotate` | true | turn the game a quarter round when the window is taller than it is wide |
| `buffered` | false | draw the frame 1:1 off screen, then scale it onto the canvas in one go (no seams between tiles) |
| `pixelated` | false | no image smoothing: sharp pixels when scaled |
| `hidpi` | false | use the screen's real pixels (`devicePixelRatio`): sharp on phones |
| `maxtouches` | 6 | how many touches are tracked at once |
| `enablemouse`, `enabletouch` | true | turn mouse or touch input off |
| `usesetinterval` | false | render on a timer instead of `requestAnimationFrame` |
| `framespersecond` | 60 | the timer's rate when `usesetinterval` is on |
| `parentWindow` | none | measure this element instead of the window (a game inside another page) |
| `xorigin`, `yorigin` | 0, 0 | the game's point shown at the canvas's top left |
| `screenmode` | `'normal'` | `'normal'`, `'fullscreen'` or `'ask'` (see the screen modes below) |
| `screenmodelabels` | `['NORMAL', 'FULLSCREEN', 'SCREEN']` | the words on the `'ask'` choice: the two modes, then the heading |
| `cbOnScreenMode` | none | `function(mode)`, called when the player picks a mode on the `'ask'` choice |

**The canvas is the game and nothing more.** Set `xresolution` and `yresolution` to the area the
game actually draws in, and JCanvas scales exactly that to fill the window. If a game draws at
positions inside a bigger space (a port that keeps the original machine's screen coordinates, for
example 256 x 192 inside the Next's 320 x 256), set `xorigin` and `yorigin` to the top left of the
area used. The game keeps drawing at its own positions, and mouse and touch come back in those
same coordinates. Touch only works inside the canvas, so on-screen controls are drawn over the
game, not in borders beside it.

**The screen modes.**

- **`'normal'`** (the default): as above. The game's resolution is scaled to fit, and the
  window's spare length is left empty.
- **`'fullscreen'`**: the canvas fills the window. JCanvas takes the window's shape (turned
  round when the game is rotated) and widens the game's resolution to match it (or makes it
  taller, if the window is the narrower shape). Half the extra goes on each side, so the game's
  own area stays in the middle. A game that does nothing about it is simply centred, with what it
  draws outside its area showing in the extra (usually black). A game that looks at `getView()`
  can draw into the extra, for example more of a scrolling world to the left and right.
- **`'ask'`**: before the game shows, a choice of NORMAL and FULLSCREEN. Left / right (or N / F)
  and Enter / Space, a click or touch on either half, or a game pad's left / right and A. Until
  it's picked, the keys go only to the choice and `cbOnRender` isn't called. A game can wait for
  `getScreenMode()` to stop being `'ask'` before it starts.

Each frame (or when it needs to), the game can ask:

| Method | Returns |
|---|---|
| `getView()` | `{ x, y, w, h }`: the part of the game's coordinates being shown. Normal: the resolution at the origin. Full screen: wider or taller, with the game's area in the middle |
| `getScreenMode()` | `'normal'`, `'fullscreen'`, or `'ask'` while the choice is showing |
| `setScreenMode(mode)` | switches to `'normal'` or `'fullscreen'` from the game (an options menu) |

Mouse and touch come back in the game's coordinates in every mode. A window resize or a turned
phone works out the view again.

What the render callback gets:

- **`context`**: the 2D context, already scaled (and turned if rotated), so draw in logical
  pixels. With `buffered`, it's the off-screen buffer's context.
- **`viewport`**: `{ width, height, isrotated }`, the window's size and whether the game is
  turned.
- **`mouse`**: `{ buttons:[left, middle, right], x, y, rawX, rawY }`.
  - A button is `0` while held and `-1` when up (the same as the key map).
  - `x` and `y` are logical pixels, and `-1` when the mouse is off the canvas.
- **`touches`**: an array of `{ id, x, y, rawX, rawY }`, `maxtouches` long. A slot not being
  touched has `id` and `x` of `-1`.
- **`fps`**: frames drawn in the last second.

The right-click menu is turned off on the page.

For pixel-art games, use `buffered: true, pixelated: true, hidpi: true` together. Every port
does.

## JGameLoop (jgameloop.js)

`new JGameLoop()`, then `process(options)` once.

| Option | Default | What it does |
|---|---|---|
| `iterationspersecond` | 60 | how often the game's iteration runs |
| `cbOnIteration` | none | `function(keyMap, iterationsPerSecond)` |
| `enablekeys` | true | listen to the keyboard |
| `pauseifhidden` | true | no iterations while the page isn't in the foreground (another tab, minimised, phone locked) |

`isPaused()` says whether the loop is paused because the page is hidden. The game carries on
from where it was when the page comes back. JITP runs on its own timer and isn't paused, so a
multiplayer game stays connected.

The **key map** is an array indexed by key code (`event.keyCode`). An entry is `0` while the
key is down and `-1` when it's up.

A key pressed and let go between two iterations isn't lost. It stays down until one iteration
has seen it.

Read keys through `JPad.isDown` where touch or game pads are used. Otherwise test
`keyMap[code] === 0` yourself.

## JSprites (jsprites.js)

`new JSprites()` holds an **image library** and a **sprite library**. It also holds a list of
**used sprites**: the ones in play, which can be shown, moved, animated and tested for
collisions.

### Images

```javascript
objSprites.addImagesToLibrary([ { name:'hero', classes:'level1 player', source:'images/hero.png' } ]);
objSprites.loadImagesByIDs(objSprites.getImageIDsByClass('level1'), function(arrIDs) { /* all loaded */ });
```

| Method | What it does |
|---|---|
| `addImagesToLibrary(arr)` | add `{ name, classes, source }` entries; `classes` is a space-separated list |
| `getImageIDByName(name)` | an image's id (-1 if none) |
| `getImageIDsByClass(class, limit)` | the ids of images with that class (`limit` optional) |
| `loadImageByID(id, cb)` | load one; `cb(id)` when it's loaded |
| `loadImagesByIDs(ids, cb)` | load several; `cb(ids)` when all are loaded |
| `unloadImageByID(id)`, `unloadImagesByIDs(ids)` | free them |
| `getImageByName(name)` | the loaded image object (null if not loaded) |
| `getSpriteByName(name)` | a library sprite's description, to read (null if none) |
| `getTintedImage(name, cssColour)` | the image in one colour (every non-see-through pixel); cached; works from `file://` |

Image id 0 is a dummy, so real images start at 1.

### Sprites

A sprite library entry describes a sprite and where its frames are in an image:

| Property | Meaning |
|---|---|
| `name`, `classes` | a unique name; a space-separated class list |
| `x`, `y`, `w`, `h` | its position, and its size on screen |
| `imagename` | the image its frames are in |
| `imagex`, `imagey`, `imagew`, `imageh` | frame 1's place and size in the image; frame n is `(n - 1) * imagew` further right |
| `sequence` | the animation: frame numbers, `0` to stop, `-n` to go back to step n (one sequence can hold a loop for each thing the sprite does) |
| `delay` | iterations each step of the sequence is shown for (default 1: a step every `animateSprites()`) |
| `collisiontype` | `'bb'` (bounding box) or `'hb'` (hit box) |
| `hbx`, `hby`, `hbsize` | the hit box: an offset from the middle and a square size |
| `hbw`, `hbh` | a hit box that isn't square: its width and height (default `hbsize`) |

| Method | What it does |
|---|---|
| `addSpritesToLibrary(arr)` | add sprite descriptions |
| `useSpriteByName(name)`, `useSpritesByClass(class, limit)` | put library sprites into play |
| `unuseAllSprites()` | take every sprite out of play |
| `getSpriteIDByName(name)`, `getSpriteIDsByClass(class, limit)` | ids of sprites in play |
| `showSpriteByID(id, x, y)`, `showSpritesByIDs(ids, x, y)` | show (x, y optional; for many, numbers or `function(index, id)`) |
| `hideSpriteByID(id)`, `hideSpritesByIDs(ids)` | hide |
| `moveSpriteByID(id, dx, dy)`, `moveSpritesByIDs(ids, dx, dy)` | move by an offset (numbers or functions) |
| `animateSpriteByID(id, step)`, `animateSpritesByIDs(ids, step)` | start animating (from a sequence step, optional) |
| `unanimateSpriteByID(id, frame)`, `unanimateSpritesByIDs(ids, frame)` | stop animating (on a frame, optional) |
| `animateSprites()` | move every animating sprite on (call once an iteration): a step every `delay` calls |
| `paintSprites(context)` | draw every visible sprite in play |
| `processSprites(ids, cb)` | `cb(id)` for each |

### Collisions

| Method | What it does |
|---|---|
| `collisionDetectIDtoID(id1, id2, cb)` | `cb(id1, id2, 'type1-type2')` if they overlap |
| `collisionDetectIDtoIDs(id, ids, cb)` | one against many; returns `[{ id1, id2, Type }]` |
| `collisionDetectIDstoIDs(ids1, ids2, breakOnFirst, cb)` | many against many |
| `collisionDetectIDtoN(id, 'x' or 'y', comparator, n, cb)` | a sprite's edge against a line, e.g. `('x', '>=', 300)` |
| `collisionDetectIDstoN(ids, property, comparator, n, breakOnFirst, cb)` | many against a line |

### Drawing helpers

These draw straight from the libraries, with nothing put into play first. They're for things
drawn many times (bullets, blocks, letters) and for numbered sprites (`JSpriteSlots`).

| Method | What it does |
|---|---|
| `stampSprite(ctx, name, frame, x, y, image, scale, flags)` | draw a library sprite's frame; `image` is optional (another image with the same layout: a colour variant); `scale` defaults to 1; `flags` takes `SPRITE_MIRRORX`, `SPRITE_MIRRORY`, `SPRITE_ROTATE` (a quarter turn clockwise, done before the mirrors as on the Next: rotate + both mirrors is a quarter turn anticlockwise; the hit box turns with it) |
| `paintTile(ctx, tileset, tile, x, y, image, scale)` | one tile; the tile set is `{ imagename, tilew, tileh, columns }`, and tiles are numbered from 0 |
| `paintText(ctx, font, str, x, y, image, scale)` | text from a font sheet; the font is `{ imagename, tilew, tileh, columns, first, firstcode }` (character `firstcode` is tile `first`) |
| `paintBigText(ctx, inkImage, str, x, y, zoom, top, bottom, shadow, offset)` | 8 x 8 font text `zoom` times the size; top half in colour `top`, bottom half in `bottom`, over a shadow `offset` pixels down and right (0: none); `inkImage` is a 16-across sheet of the font's ink alone |
| `paintTiles(ctx, tileset, tilemap)` | the original tile map painter (it has fixed first and last row limits in it, from an old demo) |

## JSpriteSlots (jsprites.js)

Numbered sprites, as an 8-bit machine's hardware has them. Higher numbers are drawn on top.

What a sprite does on its own belongs to the sprite, not the game:
- **Its animation:** the library entry's `sequence` and `delay`, with a loop for each thing it
  does.
- **Its hit box:** `collisiontype` with `hbx`, `hby` and `hbsize` (or `hbw` and `hbh`).
- **Its movement:** a *mover* function.

The game only says what a sprite is doing ("walking left", "scared", "exploding") and asks
whether two things touch. It never counts frames, works out distances or follows a spark.

```javascript
var objSlots = new JSpriteSlots(objSprites, 64);
objSlots.put(3, 100, 50, 'chef', undefined, 'game_s1');	// slot, x, y, library sprite, frame (undefined: its animation's), image
objSlots.animate(3, 7);						// run the chef's sequence from step 7 (its walking-sideways loop)
objSlots.setMover(9, function(n, o) { o.vy += 0.2; o.y += o.vy; return o.t > 40; }, 0, -3);	// a spark that falls, then goes
objSlots.step();						// once an iteration: animations and movers a step on
if (objSlots.collide(3, 0)) { ... }				// do slots 3 and 0 touch (their hit boxes)?
objSlots.paint(objContext);					// in the render callback
```

**Showing:**

| Method | What it does |
|---|---|
| `put(n, x, y, name, frame, image, scale, flags)` | show slot n as library sprite `name`. A `frame` stops its animation on that frame; `undefined` leaves the frame to the animation (a new sprite starts on frame 1). `image`, `scale` and `flags` work as in `stampSprite` |
| `move(n, x, y)` | somewhere else (its look and animation as they are) |
| `look(n, image, flags)` | another colour variant or mirroring |
| `hide(n)`, `hideRange(first, count)` | hide (and stop their movers) |
| `isVisible(n)`, `getX(n)`, `getY(n)`, `getFrame(n)` | what it's doing now |

**Animation** (the library sprite's `sequence` and `delay`, the same rules as JSprites: frame
numbers, `0` stops, `-n` goes back to step n):

| Method | What it does |
|---|---|
| `animate(n, step, restart)` | run the sequence from `step`. If it's already running the loop that starts there, it carries on, so it can be called every frame while something keeps walking. `restart` true starts it again |
| `unanimate(n, frame)` | stop it, on `frame` (optional: else where it is) |
| `setDelay(n, delay)` | this slot's own pace (0: the sprite's `delay`), e.g. the same walker faster in a faster level |
| `isAnimated(n)` | still running? (a sequence ending in `0` stops, e.g. an explosion played once) |

One sequence holds a loop per state. For example BURGER SHOP's chef is
`[1, 2, -1, 3, 4, -4, 5, 6, -7]` with `delay: 6`: towards you from step 1, away from step 4,
sideways from step 7. `unanimate` keeps him still when he stops.

**Movement** (positions as numbers or functions, as JSprites' `showSpritesByIDs` and
`moveSpritesByIDs`, which were made for bullet patterns):

| Method | What it does |
|---|---|
| `showRange(first, count, x, y)` | show a range of slots at x, y: numbers, or `function(i, n)` giving them (`i` counts from 0): a row, a ring, a spread of bullets |
| `moveBy(n, dx, dy)` | move by dx, dy: numbers, or `function(n)` |
| `moveRangeBy(first, count, dx, dy)` | move a range: numbers, or `function(i, n)`, so each bullet of a pattern can go its own way |
| `setMover(n, fn, vx, vy)` | how slot n moves on its own each `step()`: `fn(n, o)` changes `o.x`, `o.y`, `o.vx`, `o.vy` (its speeds, starting at `vx`, `vy`) and `o.flags`, with `o.t` counting its steps from 0. It returns `true` when it's done, and the sprite is hidden. `null` stops it |
| `hasMover(n)` | is it moving on its own? |

**Collisions** (the library sprite's hit box: `'bb'` the whole sprite, `'hb'` a box about its
middle; it flips with the sprite when it's mirrored):

| Method | What it does |
|---|---|
| `collide(n, m)` | do shown slots n and m touch? |
| `collideRange(n, first, count, cb)` | the shown slots of a range that n touches, nearest the start first. `cb(n, m)` is optional; return `true` from it to stop looking |
| `collideRect(n, x, y, w, h)` | does n touch a rectangle (a beam, a wall, a zone)? |
| `getBox(n)` | its hit box now: `{ left, top, right, bottom }` |

**Every iteration and every frame:**

| Method | What it does |
|---|---|
| `step()` | once an iteration: every mover moved, every animation a step on (each at its own delay) |
| `step(first, count)` | the same for those slots only, the rest held as they are (a machine's sprites stay put while its program waits) |
| `setClip(x, y, w, h)`, `clearClip()` | only draw inside a rectangle (a clip window) |
| `paint(ctx)` | draw every shown slot, lowest first |

## JTileGrid (jtilegrid.js)

A screen of tiles, like an 8-bit machine's text or tile screen. Each cell has a tile and a
**variant**, which is the image the tile comes from. Variants are the same tile set in other
colours, so cells can be coloured separately (a Next tilemap's palette rows).

```javascript
var objGrid = new JTileGrid(objSprites, { w:40, h:32, tilew:8, tileh:8, columns:16,
	images:['game_t0', 'game_t1'], first:0, firstcode:0, transparent:0 });
objGrid.text(2, 1, 'SCORE 000', 1);
objGrid.paint(objContext, 0, 0);		// in the render callback
```

| Option | Meaning |
|---|---|
| `w`, `h` | cells across and down |
| `tilew`, `tileh` | a cell's size in pixels |
| `columns` | tiles across in the images |
| `images` | image names by variant |
| `first`, `firstcode` | the font: character code `firstcode` is tile `first` (default 32, 32) |
| `transparent` | a tile drawn as nothing, so what's behind shows (default -1: none) |

| Method | What it does |
|---|---|
| `put(x, y, tile, variant)` | one cell |
| `get(x, y)`, `getVariant(x, y)` | a cell's tile or variant (-1 outside) |
| `text(x, y, str, variant)` | a string across from x, y |
| `rect(x, y, w, h, tile, variant)` | a block of one tile |
| `clear(tile, variant)` | every cell (default: the see-through tile) |
| `setImage(variant, name)` | a variant gets another image: a colour scheme swapped; only its cells are redrawn |
| `invalidate()` | redraw every cell on the next paint (after the images load) |
| `paint(ctx, x, y, bands)` | the grid onto the frame at x, y. `bands` (optional): `[{ y, h, scroll }]`, only those lines drawn, each band moved left by `scroll` pixels and wrapping round (a tilemap scrolled in strips by a copper or a raster interrupt) |

The grid keeps its own canvas at 1:1 and only redraws the cells that changed. `paint` then
draws it in one piece, so a big backdrop has no seams and costs one `drawImage` a frame.

A variant whose image hasn't loaded or doesn't exist uses image 0.

## JPixelScreen (jpixelscreen.js)

A screen of pixels, one byte each: a colour number looked up in a 256-entry palette of 8-bit
RRRGGGBB colours, as the Next's Layer 2 is. Draw on it with plot, span, rect and line, change a
palette entry and every pixel of that number changes, and paint it onto the frame whole or in
horizontal bands that are each scrolled sideways (a copper or raster interrupt scrolling part of
a screen). Only the lines drawn on since the last paint are turned into colour again.

```javascript
var objL2 = new JPixelScreen({ w:256, h:192, transparent:0 });
objL2.plot(10, 20, 0xFC);
objL2.paint(objContext, 32, 32);								// all of it
objL2.paint(objContext, 32, 32, [ { y:0, h:44, scroll:0 }, { y:44, h:148, scroll:intCamera } ]);
```

| Option | Default | Meaning |
|---|---|---|
| `w`, `h` | 256, 192 | the size |
| `transparent` | -1 | a colour number drawn as nothing (-1: none) |
| `transparentcolour` | -1 | a RRRGGGBB colour drawn as nothing whatever number shows it (the Next's global transparency) |

| Method | What it does |
|---|---|
| `plot(x, y, c)`, `get(x, y)` | one pixel |
| `span(x, y, w, c)`, `rect(x, y, w, h, c)`, `line(x0, y0, x1, y1, c)`, `clear(c)` | drawing |
| `setColour(n, rgb332)`, `setColours(arr)` | palette entries |
| `fromImage(image, c0)` | load a picture's pixels as colour numbers |
| `getPixels()`, `touch(y)` | the bytes themselves; mark a line changed after writing them directly |
| `getWidth()`, `getHeight()`, `getCanvas()` | its size; its 1:1 canvas |
| `paint(ctx, x, y, bands)` | onto the frame at x, y; `bands` as JTileGrid's |

## JSound (jsound.js)

Sound effects and tunes made in the browser with Web Audio, with no sound files. It works like
an 8-bit sound chip. There are a few channels, each playing one sound at a time: a square-wave
tone or noise, whose pitch slides and whose volume fades to nothing over its length.

Pitch is given as an AY / YM chip's **period**, where higher is a lower note. The frequency is
`clock / (16 * period)`, with a clock of 1750000 by default. Sounds from 8-bit games carry over
as they are.

```javascript
var objSound = new JSound({ channels:3 });
objSound.play(0, 120, -4, 12, 10, false);	// channel, period, slide, volume 0-15, frames, noise
objSound.update();			// once a game iteration
```

| Option | Default | Meaning |
|---|---|---|
| `channels` | 3 | how many sounds at once |
| `clock` | 1750000 | the chip clock the periods are for |
| `volume` | 0.25 | the loudest a channel gets (0-1) |
| `pauseifhidden` | true | the sound stops while the page isn't in the foreground, and carries on when it comes back |
| `samplevolume` | 1 | the loudest a sample gets (0-1) |

| Method | What it does |
|---|---|
| `play(channel, period, slide, volume, frames, noise)` | play a sound: `slide` is added to the period each iteration, the volume fades over `frames` iterations, and `noise` is true for noise |
| `isBusy(channel)` | is it still playing? |
| `quiet()` | every channel silent, the tune stopped |
| `setEnabled(bln)`, `isEnabled()` | sound on or off (off still keeps time, so turning it back on carries on) |
| `addSoundsToLibrary(arr)` | named sounds: `{ name, period, slide, volume, frames, noise }` |
| `playSoundByName(name, channel)` | play one |
| `addTunesToLibrary(arr)` | tunes: `{ name, channel, volume, loop, notes:[[period, frames], ...] }` (period 0 is a rest) |
| `playTune(name)`, `stopTune()`, `isTunePlaying()` | the tune |
| `update()` | once an iteration: the tune's next note, every channel's slide and fade |
| `addSamplesToLibrary(arr)` | recorded sounds: `{ name, rate, data }`, where `data` is base64 text of 8-bit unsigned mono bytes (128 is silence) at `rate` a second |
| `playSample(name, volume)` | play one (volume 0-1, default 1), replacing one already playing. Returns false if there's no such sample or the sound hasn't started yet |
| `stopSample()`, `isSamplePlaying()` | stop it, or ask if one is playing |

Browsers only allow sound after the player has done something. JSound starts itself on the
first key press, click or touch.

**Samples** (a game's voice, say) play one at a time beside the channels, through their own
volume. They're given as base64 text in a `.js` file rather than as sound files, because a page
opened from disk isn't allowed to load files. Each is made into sound the first time it plays.
`setEnabled(false)` stops the one playing.

## JPad (jpad.js)

On-screen touch controls that press keys. A game only ever reads keys, so it plays the same
with a keyboard, a finger or a game pad.

```javascript
var objPad = new JPad({ controls:[
	{ type:'dpad', x:32, y:170, size:30, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
	{ type:'button', x:416, y:170, size:22, key:32, label:'FIRE' },
	{ type:'zone', x:64, y:0, w:320, h:256, key:13 }
], gamepads:[ { index:0, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN, fire:32, fire2:77 } } ] });
```

| Control | What it does |
|---|---|
| `dpad` | a circle `size` across; a third of its size off the middle presses that way (diagonals press two) |
| `button` | a circle that presses `key`, with a `label` |
| `zone` | a rectangle that presses `key`; it isn't drawn |

| Option | Default | Meaning |
|---|---|---|
| `controls` | `[]` | the controls above |
| `gamepads` | none | game pads: their stick or d-pad and buttons A and B press these keys; buttons X and Y too when `fire3`, `fire4` are given |
| `showalways` | false | draw the controls even before a touch is seen |
| `colour`, `pressedcolour` | see-through white, yellow | how they're drawn |
| `font` | `'bold 9px sans-serif'` | the buttons' labels |

| Method | What it does |
|---|---|
| `update(keyMap, touches, mouse)` | once an iteration: what's touched (or clicked) presses its keys; what isn't any more is let go |
| `isDown(keyMap, key, viewport)` | is a key down, by keyboard or pad; when the screen is turned, the arrow keys are turned too |
| `taps()` | the new touches or clicks this iteration that missed every control: `[{ x, y }]` in logical pixels |
| `setControls(arr)` | other controls (each screen of a game can have its own) |
| `isTouch()` | has a touch been seen? (to show "TAP" instead of "PRESS SPACE") |
| `paint(ctx)` | draw the controls, only once a touch has been seen |

Touch only works inside the canvas, so the controls go over the game, placed from the edges of
its area (for example `x:VIEW.x + 32`, `x:VIEW.x + VIEW.w - 32`) where they cover the least. A
PC never shows the controls.

## JSteps (jsteps.js)

This is for games written as "do this, wait 40 frames, loop until a key", which is how BASIC
games are written. JSteps keeps that shape without blocking the browser.

```javascript
var objSteps = new JSteps();
objSteps.call(function() { say('GET READY'); });
objSteps.wait(40);
objSteps.until(function() { return fire(); });	// called once an iteration until it returns true
objSteps.call(startLevel);
objSteps.update();				// once a game iteration
```

| Method | What it does |
|---|---|
| `call(fn)` | a step that runs once |
| `wait(n)` | n iterations of nothing |
| `until(fn)` | runs once an iteration until it returns `true` |
| `clear()` | forget everything still to do |
| `isBusy()` | is anything still to do? |
| `update()` | once an iteration: steps run until a wait or an unfinished `until` |

Steps added while a step runs go **in front** of what's left, so a step can be a whole routine
and a routine can call another, as a sub calls a sub. An `until` that adds steps gets them run
before it's called again. That's how a menu loop can start an animation and carry on
afterwards.

A game's main loop can be one `until` that never finishes:

```javascript
objSteps.until(function() { title(); objSteps.call(playGame); return false; });
```

## JITP (jitp.js)

JITP is the third loop, for multiplayer games (see `mmogdemo.htm`). It runs beside the game
loop and the render loop, at its own rate.
- **Each call:** it sends what the game gives it to the game server and hands back the reply.
  In `mmogdemo.htm` that's the area and the player going up, and the area's data coming back.
- **Kept apart:** a slow or dropped call never holds up the game or the drawing.
- **The game's side:** `cbOnGetParameters` gives what to send, and `cbOnProcess` hands over
  what came back. The game loop reads the latest of it each iteration.

| Option | Default | Meaning |
|---|---|---|
| `uri` | `http://localhost/8bitology/net/ws.php` | the service |
| `callspersecond` | 3 | how often |
| `cbOnGetParameters` | none | a string, or a function returning one, added to the call's query string |
| `cbOnProcess` | none | `function(callID, callsPerSecond, response)`; it's also called without a response while a call is still out |

Each call sends `?id=<call number>` plus the parameters. Only one call is out at a time.

## JZOSCIIWebRadio (jzosciiwebradio.js)

Plays ZOSCII MQ Web Radio: a station's channels straight from a ZOSCII MQ (your own instance or
anyone else's) or from an ICY stream. It draws nothing. A game or page draws its own player (or
none, with the radio just playing behind the game) from the callbacks. `radio.htm` is a full
player drawn in the canvas, set up for Cyborg Unicorn ZOSCII Web Radio.

```javascript
var objRadio = new JZOSCIIWebRadio({ rom:'radio/logo.png', behaviour:'repeatAllQueues',
	onTrack:function(objInfo_a) { strNowPlaying = objInfo_a.title + ' - ' + objInfo_a.artist; },
	onImage:function(objImage_a, strFilename_a) { objCover = objImage_a; } });
objRadio.start([
	{ name:'English', type:'mq', url:'https://my.server/zosciimq/index.php', queue:'Cyborg Unicorn English' },
	{ name:'English', type:'icy', url:'http://host:8000', session:0 } ]);
```

**Sources:**

| Type | Properties | What happens |
|---|---|---|
| `mq` | `name`, `url` (the MQ's `index.php`), `queue` (the channel) | messages are fetched one at a time (`action=fetch&q=<queue>&after=<pointer>`) and decoded here with the key file: MP3s play, JPEGs and text go to `onImage` / `onText`. The server never knows what it's sending |
| `icy` | `name`, `url`, `session` | the browser plays the stream as it is; `session` N resumes session N (`/N` is added to the URL), 0 is a new one |

**The key file (ROM):** the MQ channels need the station's key file, bit for bit as the station
encoded with. The ICY channels don't need one.
- It can be a URL, a `File` or `Blob` (from a file input or a drop), an `ArrayBuffer` or a
  `Uint8Array`.
- `radio.htm` bundles Cyborg Unicorn's (`radio/logo.png`). The listener can choose another with
  the KEY FILE button, the K key, or by dropping a file on the page.

**HTTP or HTTPS:** a page served over HTTPS can only use HTTPS sources, because the browser blocks
plain HTTP on a secure page.
- Self-host the MQ or the stream behind HTTPS to use it from an HTTPS page.
- An HTTP-only ICY stream (like Cyborg Unicorn's own, from a home PC) works from a page served
  over HTTP.
- A source on another server must send CORS headers (`Access-Control-Allow-Origin`): the MQ for
  its fetches, and an ICY stream for the level meter. With `analyser: false` a stream needs no
  CORS, but there are no levels.

| Option | Default | Meaning |
|---|---|---|
| `rom` | none | the key file (see above) |
| `behaviour` | `'repeatAllQueues'` | at the end of a channel: `repeatQueue` (the same again), `repeatAllQueues` / `nextQueue` (the next channel), `randomQueue`, `waitAtEnd` (wait for new messages), `stopAtEnd` |
| `volume` | 1 | 0-1 |
| `analyser` | true | the sound levels for `getLevels` (Web Audio) |
| `fftSize` | 64 | the analyser's size: half this many levels |
| `minTrackSize` | 1024000 | songs at least this big go in the history for `previous()` (jingles don't) |
| `imageGap` | 2 | seconds a picture stays up before what follows it |
| `waitSeconds` | 30 | `waitAtEnd`: how long before looking again |
| `retrySeconds` | 30 | an MQ that can't be reached: how long before trying again |
| `streamRetrySeconds` | 5 | a stream that drops: how long before reconnecting |
| `maxTextLength` | 16384 | longer text messages are skipped |

| Callback | Called with |
|---|---|
| `onStatus(str)` | what it's doing, in words |
| `onTrack(info)` | a song started: `{ title, artist, album, year, filename, source, stream }` (from its ID3 tags; on a stream, the channel's name) |
| `onTrackEnd()` | a song finished |
| `onImage(image, filename)` | a picture arrived: a loaded `Image`, ready to draw |
| `onText(str, filename)` | a text message arrived |
| `onEndOfChannel(source)` | the channel had nothing more |
| `onStop()` | it stopped |

| Method | What it does |
|---|---|
| `start(sources)` | play a list of sources, from the first (or a random one). Call it from a key press or a tap: browsers only start sound after the player does something |
| `stop()`, `pause()`, `resume()`, `toggle()` | the usual; `toggle` returns whether it's now paused |
| `next()` | the next message; on a stream, the next channel |
| `previous()` | the song before this one (MQ channels) |
| `channel(n)` | straight to source n of the list |
| `setROM(rom)`, `hasROM()` | another key file (used from the next `start`) |
| `setVolume(n)`, `setBehaviour(str)` | change them while it plays |
| `isPlaying()`, `isPaused()`, `isStream()`, `getSource()`, `getSourceIndex()` | what's going on |
| `getProgress()`, `seek(n)` | how far through the song, 0-1 (0 on a stream); jump there |
| `getLevels(arr)` | fills `arr` with the sound's levels now, low notes first, 0-255 each: call it each frame for a meter |

It uses its own `<audio>` element (not on the page) and its own Web Audio context, separate from
JSound, so a game's sound effects and the radio play together.

## JMusic (jmusic.js)

Music sprites: music made the way JSprites makes animation. A music sprite is a pattern (a
sequence of notes on one channel, 0-9) kept in a library and put into play like a sprite:
used, played from any step, paused, carried on, played once or looped. Its sequence works like a
sprite's: notes in place of frames, `0` to stop, `-n` to go back to step n.

A music sprite can conduct the others from inside its own sequence. It can start them, pause
them, hold them back for a number of its own steps, or tell the game something has happened. So
the drums can run an 8-beat loop while the bass and the tune wait, and bring them in on the
beat.

JMusic has no collisions. Its `step()` runs in the game loop, once an iteration, not in the
canvas's frames. The music never skips when drawing does, and the beat stays locked to the
game.

```javascript
var objMusic = new JMusic({ channels:10 });
objMusic.addMusicSpritesToLibrary([
	{ name:'drums', classes:'song', channel:0, delay:12, volume:12,
		sequence:[ 'N3', '-', 'N14', '-', 'N3', 'N3', 'N14', '-',
			{ play:'bass', step:1 }, 'N3', '-', 'N14', '-', 'N3', 'N3', 'N14', '-', -10 ] },
	{ name:'bass', classes:'song', channel:1, delay:12, volume:13,
		sequence:[ 'A2', '-', 'A3', '-', 'E2', '-', 'G2', 'A2', -1 ] } ]);
objMusic.useMusicSpritesByClass('song');
objMusic.playMusicSpriteByName('drums', 1);	// the bass waits for its cue
objMusic.step();				// once a game iteration
```

| Option | Default | Meaning |
|---|---|---|
| `channels` | 10 | channels for its own JSound |
| `clock` | 1750000 | the chip clock the periods are for |
| `volume` | JSound's | the loudest a channel gets (0-1) |
| `sound` | its own | a JSound to play through. A game's sound effects and music can share one: give the music channels the effects don't use |
| `onEvent` | none | `function(event, byName)`, called by an `{ event }` step |

**A music sprite:**

| Property | Meaning |
|---|---|
| `name`, `classes` | a unique name; a space-separated class list |
| `channel` | the channel it plays on (0-9) |
| `sequence` | its steps (below) |
| `delay` | iterations a step lasts (default 12) |
| `volume` | 0-15 (default 12) |
| `length` | iterations a note sounds (default 0: the whole step, less one) |
| `noise` | every note is noise |
| `slide` | added to each note's period every iteration |

**A step in a sequence:**

| Step | Meaning |
|---|---|
| `'C4'`, `'F#3'`, `'Bb5'` | a note: a letter, `#` or `b`, an octave (A4 is 440Hz) |
| `'-'` or `'.'` | a rest |
| `'N12'` | noise at period 12 (1-31; low numbers hiss high) |
| `120` | a raw period (the AY's: bigger is lower) |
| `[ note, steps, volume, slide ]` | a note held for that many steps, with its own volume and slide |
| `0` | stop: the sprite pauses here; played again, it carries on after it |
| `-n` | go back to step n (a loop) |
| `{ play:'bass tune', step:1 }` | start music sprites, by names or classes; `step` is optional (without it they carry on from where they paused) |
| `{ pause:'tune' }` | pause them |
| `{ hold:'arp', steps:16 }` | hold them back for 16 of this sprite's own notes, then let them go |
| `{ event:'chorus' }` | calls `onEvent('chorus', this sprite's name)` |

Commands take no time: the next note follows at once. Sprites started in the same iteration
sound together.

| Method | What it does |
|---|---|
| `addMusicSpritesToLibrary(arr)`, `getMusicSpriteByName(name)` | the library |
| `useMusicSpriteByName(name, channel)` | put one into play (paused at step 1); returns its id |
| `useMusicSpritesByClass(class)` | put a class into play; returns the ids |
| `unuseAllMusicSprites()` | take them all out of play |
| `getMusicSpriteIDByName(name)`, `getMusicSpriteIDs('names classes')` | ids in play |
| `playMusicSpriteByID(id, step)`, `playMusicSpritesByIDs(ids, step)`, `playMusicSpriteByName(who, step)` | play, from `step` or from where it paused |
| `pauseMusicSpriteByID(id)`, `pauseMusicSpritesByIDs(ids)`, `pauseMusicSpriteByName(who)` | pause where it is |
| `rewindMusicSpriteByID(id)`, `rewindMusicSpriteByName(who)` | pause and go back to step 1 |
| `muteMusicSpriteByName(who, bln)` | keeps playing in time but isn't heard |
| `processMusicSprites(ids, cb)` | `cb(id, sprite)` for each: change its channel, delay or volume |
| `isPlaying(id)`, `getStep(id)` | playing (and not held)? which step? |
| `setTempo(percent)` | 200 is twice as fast |
| `getSound()` | its JSound |
| `step()` | once a game iteration |

`music.htm` is the demo. STACKER's music is a real use: the tune plays its first eight bars
alone, then cues the bass and drums in, and all three loop together.

## The tools

These are Python 3 tools with Pillow, run once per game. They live in `tools/`.

| Tool | What it does |
|---|---|
| `nextgfx.py <Next game folder> <name> [rows.json]` | a Next game's tiles and sprites as one image per palette row, plus `js/gfx-<name>.js` with their names |
| `basdata.py <file.cls> <label> <JS name> <out.js>` | a class's `db` bytes after a label as a JS array |
| `l2runs.py <file.cls> <label> <w> <h> <out.png> [first-last <prefix>]` | a run-packed Layer 2 picture as a PNG; palette-cycled entries as masks |
| `ports/*.json` | the extra palette rows used by the ports |
| `gfxlayout.py <Next game folder> <name> <out folder> [--compose A,B] [--strip NEW=A,B]` | a game laid out by gfxtool.js (`gfx/layout.txt`: common and per-level tiles, sprites, palettes, maps, pictures) as sprite sheets per palette row, tile sheets, the pictures, `js/gfx-<name>.js` and `js/data-<name>.js` |
| `patstrip.py <Next game folder> <images folder> <name>` | a game's sprite sheets laid out again in the Next's pattern order, so a JSprites frame number is the pattern number + 1 |
| `ports/defender_sprites.py`, `ports/defhyper_mix.py`, `ports/defmulti_gfx.py`, `ports/defhell_gfx.py`, `ports/defhell_voice.py` | the DEFENDER games' own image, data and voice makers |

`PORTS.md` has the details. Don't edit generated files (`gfx-*.js`, `data-*.js`). Run the tool
again instead.

## Code conventions

These are the rules PotentJS and the games are written to:

- **ES5 only.** No `let`, `const`, arrow functions or classes. Constructor functions with
  `this.method = function() {}`.
- **Names:**
  - Hungarian prefixes: `str`, `int`, `flt`, `bln`, `arr`, `obj`, `fn` / `cb`.
  - Members start `m_`, globals start `g_`, arguments end `_a`.
  - Counters are named, for example `intI`, never a bare `i`.
- **Braces:** `{` goes on a new line, and braces are never left out.
- **Flow:** no `continue` and no early `return`. A function has one way out, with a result
  variable.
- **Headers:** the framework library files carry `(c) 2026 Cyborg Unicorn Pty Ltd - MIT License`. A game's own files (its page, game, gfx and data files) carry `(c) 2026 Cyborg Unicorn Pty Ltd` only, with no licence.

The original demo pages (`spritedemo.htm`, `itpdemo.htm`, `mmogdemo.htm`) need image and font files that weren't in the uploaded zip (the `font/` folder
is empty). They load, but those pictures don't show.
