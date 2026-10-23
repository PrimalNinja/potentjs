// gfx-arcade.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_ARCADE =
{
	// the images for JSprites.addImagesToLibrary (class 'arcade'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'arcade_ink', classes:'arcade', source:'images/arcade/tiles_ink.png' },
		{ name:'arcade_t0', classes:'arcade', source:'images/arcade/tiles_0.png' },
		{ name:'arcade_s0', classes:'arcade', source:'images/arcade/sprites_0.png' },
		{ name:'arcade_s1', classes:'arcade', source:'images/arcade/sprites_1.png' },
		{ name:'arcade_s2', classes:'arcade', source:'images/arcade/sprites_2.png' },
		{ name:'arcade_s3', classes:'arcade', source:'images/arcade/sprites_3.png' },
		{ name:'arcade_s4', classes:'arcade', source:'images/arcade/sprites_4.png' },
		{ name:'arcade_s5', classes:'arcade', source:'images/arcade/sprites_5.png' },
		{ name:'arcade_s6', classes:'arcade', source:'images/arcade/sprites_6.png' },
		{ name:'arcade_s7', classes:'arcade', source:'images/arcade/sprites_7.png' },
		{ name:'arcade_s0a', classes:'arcade', source:'images/arcade/sprites_0a.png' },
		{ name:'arcade_s0b', classes:'arcade', source:'images/arcade/sprites_0b.png' },
		{ name:'arcade_s0c', classes:'arcade', source:'images/arcade/sprites_0c.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'arcade_t<row>'
	spriterows: 8,			// sprite images: 'arcade_s0' .. 'arcade_s7'
	T_BLACK: 1,
	T_BOX: 2,
	T_BOXTL: 3,
	T_BOXT: 4,
	T_BOXTR: 5,
	T_BOXL: 6,
	T_BOXR: 7,
	T_BOXBL: 8,
	T_BOXB: 9,
	T_BOXBR: 10,
	T_STAR: 11,
	T_STAR_N: 2,
	T_PSTAR: 13,
	T_PSTAR_N: 2,
	T_BAR: 16,
	T_BAR_N: 9,
	S_CAB: { col:0, row:0, frames:8, w:1, h:2 },
	S_PERSON: { col:0, row:2, frames:7, w:1, h:1 },
	S_CURSOR: { col:7, row:2, frames:1, w:1, h:2 },
	S_COIN: { col:8, row:2, frames:1, w:1, h:1 },
	S_FACE: { col:9, row:2, frames:2, w:1, h:1 },
	S_BROKEN: { col:11, row:2, frames:1, w:1, h:1 },
	S_NEW: { col:12, row:2, frames:1, w:1, h:1 }
};
