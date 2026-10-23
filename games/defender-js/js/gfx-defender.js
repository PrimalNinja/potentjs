// gfx-defender.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_DEFENDER =
{
	// the images for JSprites.addImagesToLibrary (class 'defender'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'defender_ink', classes:'defender', source:'images/defender/tiles_ink.png' },
		{ name:'defender_t0', classes:'defender', source:'images/defender/tiles_0.png' },
		{ name:'defender_t2', classes:'defender', source:'images/defender/tiles_2.png' },
		{ name:'defender_t3', classes:'defender', source:'images/defender/tiles_3.png' },
		{ name:'defender_t4', classes:'defender', source:'images/defender/tiles_4.png' },
		{ name:'defender_t5', classes:'defender', source:'images/defender/tiles_5.png' },
		{ name:'defender_t6', classes:'defender', source:'images/defender/tiles_6.png' },
		{ name:'defender_t7', classes:'defender', source:'images/defender/tiles_7.png' },
		{ name:'defender_s0', classes:'defender', source:'images/defender/sprites_0.png' }
	],
	tilerows: ['0', '2', '3', '4', '5', '6', '7'],		// tile images by palette row: 'defender_t<row>'
	spriterows: 1,			// sprite images: 'defender_s0' .. 'defender_s0'
	T_CLEAR: 0,
	S_NONE: { col:0, row:0, frames:1, w:1, h:1 }
};
