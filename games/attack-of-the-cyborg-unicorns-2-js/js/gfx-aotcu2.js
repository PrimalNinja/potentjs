// gfx-aotcu2.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_AOTCU2 =
{
	// the images for JSprites.addImagesToLibrary (class 'aotcu2'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'aotcu2_ink', classes:'aotcu2', source:'images/aotcu2/tiles_ink.png' },
		{ name:'aotcu2_t0', classes:'aotcu2', source:'images/aotcu2/tiles_0.png' },
		{ name:'aotcu2_s0', classes:'aotcu2', source:'images/aotcu2/sprites_0.png' },
		{ name:'aotcu2_s1', classes:'aotcu2', source:'images/aotcu2/sprites_1.png' },
		{ name:'aotcu2_s2', classes:'aotcu2', source:'images/aotcu2/sprites_2.png' },
		{ name:'aotcu2_s3', classes:'aotcu2', source:'images/aotcu2/sprites_3.png' },
		{ name:'aotcu2_s4', classes:'aotcu2', source:'images/aotcu2/sprites_4.png' },
		{ name:'aotcu2_s5', classes:'aotcu2', source:'images/aotcu2/sprites_5.png' },
		{ name:'aotcu2_s6', classes:'aotcu2', source:'images/aotcu2/sprites_6.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'aotcu2_t<row>'
	spriterows: 7,			// sprite images: 'aotcu2_s0' .. 'aotcu2_s6'
	T_HUD: 1,
	T_SCAN: 2,
	T_SCANT: 3,
	T_SCANB: 4,
	T_SCANG: 5,
	T_LIFE: 6,
	T_BLACK: 7,
	T_BOMB: 8,
	T_GAUGE: 16,
	T_GAUGE_N: 9,
	S_SHIP: { col:0, row:0, frames:2, w:1, h:1 },
	S_SHOT: { col:2, row:0, frames:1, w:1, h:1 },
	S_BOLT: { col:3, row:0, frames:1, w:1, h:1 },
	S_DOT: { col:4, row:0, frames:2, w:1, h:1 },
	S_WINDOW: { col:6, row:0, frames:1, w:1, h:1 },
	S_BOOM: { col:8, row:0, frames:4, w:1, h:1 },
	S_UNICORN: { col:0, row:1, frames:4, w:2, h:2 },
	S_BULLET: { col:0, row:3, frames:2, w:1, h:1 },
	S_ORB: { col:2, row:3, frames:1, w:1, h:1 },
	S_ITEM: { col:3, row:3, frames:3, w:1, h:1 },
	S_FIGHTER: { col:6, row:3, frames:2, w:1, h:1 }
};
