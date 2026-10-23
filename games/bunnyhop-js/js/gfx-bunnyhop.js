// gfx-bunnyhop.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_BUNNYHOP =
{
	// the images for JSprites.addImagesToLibrary (class 'bunnyhop'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'bunnyhop_ink', classes:'bunnyhop', source:'images/bunnyhop/tiles_ink.png' },
		{ name:'bunnyhop_t0', classes:'bunnyhop', source:'images/bunnyhop/tiles_0.png' },
		{ name:'bunnyhop_t1', classes:'bunnyhop', source:'images/bunnyhop/tiles_1.png' },
		{ name:'bunnyhop_t2', classes:'bunnyhop', source:'images/bunnyhop/tiles_2.png' },
		{ name:'bunnyhop_t3', classes:'bunnyhop', source:'images/bunnyhop/tiles_3.png' },
		{ name:'bunnyhop_t4', classes:'bunnyhop', source:'images/bunnyhop/tiles_4.png' },
		{ name:'bunnyhop_t5', classes:'bunnyhop', source:'images/bunnyhop/tiles_5.png' },
		{ name:'bunnyhop_t6', classes:'bunnyhop', source:'images/bunnyhop/tiles_6.png' },
		{ name:'bunnyhop_t7', classes:'bunnyhop', source:'images/bunnyhop/tiles_7.png' },
		{ name:'bunnyhop_t10', classes:'bunnyhop', source:'images/bunnyhop/tiles_10.png' },
		{ name:'bunnyhop_t11', classes:'bunnyhop', source:'images/bunnyhop/tiles_11.png' },
		{ name:'bunnyhop_t12', classes:'bunnyhop', source:'images/bunnyhop/tiles_12.png' },
		{ name:'bunnyhop_t13', classes:'bunnyhop', source:'images/bunnyhop/tiles_13.png' },
		{ name:'bunnyhop_t1a', classes:'bunnyhop', source:'images/bunnyhop/tiles_1a.png' },
		{ name:'bunnyhop_t1b', classes:'bunnyhop', source:'images/bunnyhop/tiles_1b.png' },
		{ name:'bunnyhop_s0', classes:'bunnyhop', source:'images/bunnyhop/sprites_0.png' }
	],
	tilerows: ['0', '1', '2', '3', '4', '5', '6', '7', '10', '11', '12', '13', '1a', '1b'],		// tile images by palette row: 'bunnyhop_t<row>'
	spriterows: 1,			// sprite images: 'bunnyhop_s0' .. 'bunnyhop_s0'
	T_CLEAR: 0,
	T_BLACK: 1,
	T_GRASS: 2,
	T_GRASS_N: 2,
	T_ROAD: 4,
	T_ROAD_N: 2,
	T_WATER: 6,
	T_WATER_N: 2,
	T_HEDGE: 8,
	T_HEDGE_N: 2,
	T_BAY: 10,
	T_BAY_N: 2,
	T_BAR: 12,
	T_BAR_N: 9,
	T_LIFE: 21,
	T_CAR: 96,
	T_TRACTOR: 100,
	T_RACER: 104,
	T_TRUCK: 108,
	T_LOGL: 116,
	T_LOGM: 118,
	T_LOGR: 120,
	T_TURTLE: 122,
	T_TURTLE2: 126,
	T_TSINK: 130,
	S_UP: { col:0, row:0, frames:2, w:1, h:1 },
	S_RIGHT: { col:2, row:0, frames:2, w:1, h:1 },
	S_SPLAT: { col:4, row:0, frames:2, w:1, h:1 },
	S_SPLASH: { col:6, row:0, frames:3, w:1, h:1 },
	S_HOME: { col:0, row:1, frames:1, w:1, h:1 },
	S_CARROT: { col:1, row:1, frames:1, w:1, h:1 }
};
