// gfx-thegrid.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_THEGRID =
{
	// the images for JSprites.addImagesToLibrary (class 'thegrid'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'thegrid_ink', classes:'thegrid', source:'images/thegrid/tiles_ink.png' },
		{ name:'thegrid_t0', classes:'thegrid', source:'images/thegrid/tiles_0.png' },
		{ name:'thegrid_s0', classes:'thegrid', source:'images/thegrid/sprites_0.png' },
		{ name:'thegrid_s1', classes:'thegrid', source:'images/thegrid/sprites_1.png' },
		{ name:'thegrid_s2', classes:'thegrid', source:'images/thegrid/sprites_2.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'thegrid_t<row>'
	spriterows: 3,			// sprite images: 'thegrid_s0' .. 'thegrid_s2'
	T_HUD: 1,
	T_VBEAM: 2,
	T_VBEAM_N: 2,
	T_HBEAM: 4,
	T_HBEAM_N: 2,
	T_CROSS: 6,
	T_LIFE: 7,
	T_POD: 16,
	T_POD_N: 16,
	S_SHIP: { col:0, row:0, frames:2, w:1, h:1 },
	S_SHOT: { col:2, row:0, frames:1, w:1, h:1 },
	S_DROID: { col:3, row:0, frames:2, w:1, h:1 },
	S_ZAPPER: { col:5, row:0, frames:2, w:1, h:1 },
	S_BOMB: { col:7, row:0, frames:2, w:1, h:1 },
	S_BOOM: { col:9, row:0, frames:4, w:1, h:1 },
	S_DOT: { col:13, row:0, frames:2, w:1, h:1 }
};
