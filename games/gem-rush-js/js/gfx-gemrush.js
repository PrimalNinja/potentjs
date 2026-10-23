// gfx-gemrush.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_GEMRUSH =
{
	// the images for JSprites.addImagesToLibrary (class 'gemrush'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'gemrush_ink', classes:'gemrush', source:'images/gemrush/tiles_ink.png' },
		{ name:'gemrush_t0', classes:'gemrush', source:'images/gemrush/tiles_0.png' },
		{ name:'gemrush_t1', classes:'gemrush', source:'images/gemrush/tiles_1.png' },
		{ name:'gemrush_t2', classes:'gemrush', source:'images/gemrush/tiles_2.png' },
		{ name:'gemrush_t3', classes:'gemrush', source:'images/gemrush/tiles_3.png' },
		{ name:'gemrush_t4', classes:'gemrush', source:'images/gemrush/tiles_4.png' },
		{ name:'gemrush_t5', classes:'gemrush', source:'images/gemrush/tiles_5.png' },
		{ name:'gemrush_t6', classes:'gemrush', source:'images/gemrush/tiles_6.png' },
		{ name:'gemrush_tc0', classes:'gemrush', source:'images/gemrush/tiles_c0.png' },
		{ name:'gemrush_tc1', classes:'gemrush', source:'images/gemrush/tiles_c1.png' },
		{ name:'gemrush_tc10', classes:'gemrush', source:'images/gemrush/tiles_c10.png' },
		{ name:'gemrush_tc11', classes:'gemrush', source:'images/gemrush/tiles_c11.png' },
		{ name:'gemrush_tc2', classes:'gemrush', source:'images/gemrush/tiles_c2.png' },
		{ name:'gemrush_tc3', classes:'gemrush', source:'images/gemrush/tiles_c3.png' },
		{ name:'gemrush_tc4', classes:'gemrush', source:'images/gemrush/tiles_c4.png' },
		{ name:'gemrush_tc5', classes:'gemrush', source:'images/gemrush/tiles_c5.png' },
		{ name:'gemrush_tc6', classes:'gemrush', source:'images/gemrush/tiles_c6.png' },
		{ name:'gemrush_tc7', classes:'gemrush', source:'images/gemrush/tiles_c7.png' },
		{ name:'gemrush_tc8', classes:'gemrush', source:'images/gemrush/tiles_c8.png' },
		{ name:'gemrush_tc9', classes:'gemrush', source:'images/gemrush/tiles_c9.png' },
		{ name:'gemrush_tflash', classes:'gemrush', source:'images/gemrush/tiles_flash.png' },
		{ name:'gemrush_s0', classes:'gemrush', source:'images/gemrush/sprites_0.png' },
		{ name:'gemrush_s1', classes:'gemrush', source:'images/gemrush/sprites_1.png' },
		{ name:'gemrush_s2', classes:'gemrush', source:'images/gemrush/sprites_2.png' }
	],
	tilerows: ['0', '1', '2', '3', '4', '5', '6', 'c0', 'c1', 'c10', 'c11', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'flash'],		// tile images by palette row: 'gemrush_t<row>'
	spriterows: 3,			// sprite images: 'gemrush_s0' .. 'gemrush_s2'
	T_CLEAR: 0,
	T_BLACK: 1,
	T_GEMICON: 2,
	T_HEART: 3,
	T_THING: 96,
	S_UNI: { col:0, row:0, frames:4, w:1, h:1 },
	S_FRONT: { col:4, row:0, frames:3, w:1, h:1 },
	S_GEM: { col:7, row:0, frames:1, w:1, h:1 },
	S_ROCK: { col:8, row:0, frames:1, w:1, h:1 },
	S_HEART: { col:9, row:0, frames:1, w:1, h:1 }
};
