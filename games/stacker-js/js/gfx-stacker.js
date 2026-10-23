// gfx-stacker.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_STACKER =
{
	// the images for JSprites.addImagesToLibrary (class 'stacker'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'stacker_ink', classes:'stacker', source:'images/stacker/tiles_ink.png' },
		{ name:'stacker_t0', classes:'stacker', source:'images/stacker/tiles_0.png' },
		{ name:'stacker_t1', classes:'stacker', source:'images/stacker/tiles_1.png' },
		{ name:'stacker_t2', classes:'stacker', source:'images/stacker/tiles_2.png' },
		{ name:'stacker_t3', classes:'stacker', source:'images/stacker/tiles_3.png' },
		{ name:'stacker_t4', classes:'stacker', source:'images/stacker/tiles_4.png' },
		{ name:'stacker_t5', classes:'stacker', source:'images/stacker/tiles_5.png' },
		{ name:'stacker_t6', classes:'stacker', source:'images/stacker/tiles_6.png' },
		{ name:'stacker_t7', classes:'stacker', source:'images/stacker/tiles_7.png' },
		{ name:'stacker_t8', classes:'stacker', source:'images/stacker/tiles_8.png' },
		{ name:'stacker_t9', classes:'stacker', source:'images/stacker/tiles_9.png' },
		{ name:'stacker_t10', classes:'stacker', source:'images/stacker/tiles_10.png' },
		{ name:'stacker_t11', classes:'stacker', source:'images/stacker/tiles_11.png' },
		{ name:'stacker_t12', classes:'stacker', source:'images/stacker/tiles_12.png' },
		{ name:'stacker_t13', classes:'stacker', source:'images/stacker/tiles_13.png' },
		{ name:'stacker_s0', classes:'stacker', source:'images/stacker/sprites_0.png' },
		{ name:'stacker_s1', classes:'stacker', source:'images/stacker/sprites_1.png' },
		{ name:'stacker_s2', classes:'stacker', source:'images/stacker/sprites_2.png' },
		{ name:'stacker_s3', classes:'stacker', source:'images/stacker/sprites_3.png' },
		{ name:'stacker_s4', classes:'stacker', source:'images/stacker/sprites_4.png' },
		{ name:'stacker_s5', classes:'stacker', source:'images/stacker/sprites_5.png' },
		{ name:'stacker_s6', classes:'stacker', source:'images/stacker/sprites_6.png' },
		{ name:'stacker_s7', classes:'stacker', source:'images/stacker/sprites_7.png' }
	],
	tilerows: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],		// tile images by palette row: 'stacker_t<row>'
	spriterows: 8,			// sprite images: 'stacker_s0' .. 'stacker_s7'
	T_CLEAR: 0,
	T_BLACK: 1,
	T_BLOCK: 2,
	T_GHOST: 3,
	T_FLOOR: 4,
	T_FRAME: 5,
	T_FRAME_N: 8,
	T_PANEL: 13,
	S_BIG: { col:0, row:0, frames:1, w:1, h:1 }
};
