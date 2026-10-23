// gfx-cudefend.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_CUDEFEND =
{
	// the images for JSprites.addImagesToLibrary (class 'cudefend'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'cudefend_ink', classes:'cudefend', source:'images/cudefend/tiles_ink.png' },
		{ name:'cudefend_t0', classes:'cudefend', source:'images/cudefend/tiles_0.png' },
		{ name:'cudefend_s0', classes:'cudefend', source:'images/cudefend/sprites_0.png' },
		{ name:'cudefend_s1', classes:'cudefend', source:'images/cudefend/sprites_1.png' },
		{ name:'cudefend_s2', classes:'cudefend', source:'images/cudefend/sprites_2.png' },
		{ name:'cudefend_s3', classes:'cudefend', source:'images/cudefend/sprites_3.png' },
		{ name:'cudefend_s4', classes:'cudefend', source:'images/cudefend/sprites_4.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'cudefend_t<row>'
	spriterows: 5,			// sprite images: 'cudefend_s0' .. 'cudefend_s4'
	T_HUD: 1,
	T_SCAN: 2,
	T_SCANT: 3,
	T_SCANG: 4,
	T_LIFE: 5,
	T_SMART: 6,
	T_BLACK: 7,
	T_DOT: 96,
	T_DOT_N: 36,
	S_UNI: { col:0, row:0, frames:2, w:2, h:1 },
	S_SHOT: { col:4, row:0, frames:1, w:1, h:1 },
	S_LANDER: { col:0, row:1, frames:2, w:1, h:1 },
	S_MUTANT: { col:2, row:1, frames:2, w:1, h:1 },
	S_BOMBER: { col:4, row:1, frames:2, w:1, h:1 },
	S_POD: { col:6, row:1, frames:2, w:1, h:1 },
	S_SWARMER: { col:8, row:1, frames:2, w:1, h:1 },
	S_BAITER: { col:10, row:1, frames:2, w:1, h:1 },
	S_PERSON: { col:0, row:2, frames:3, w:1, h:1 },
	S_BEAM: { col:3, row:2, frames:1, w:1, h:1 },
	S_MINE: { col:4, row:2, frames:1, w:1, h:1 },
	S_BULLET: { col:5, row:2, frames:2, w:1, h:1 },
	S_BOOM: { col:7, row:2, frames:4, w:1, h:1 },
	S_WINDOW: { col:11, row:2, frames:1, w:1, h:1 },
	S_STARS: { col:12, row:2, frames:1, w:1, h:1 }
};
