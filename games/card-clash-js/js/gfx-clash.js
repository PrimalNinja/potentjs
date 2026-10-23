// gfx-clash.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_CLASH =
{
	// the images for JSprites.addImagesToLibrary (class 'clash'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'clash_ink', classes:'clash', source:'images/clash/tiles_ink.png' },
		{ name:'clash_t0', classes:'clash', source:'images/clash/tiles_0.png' },
		{ name:'clash_t1', classes:'clash', source:'images/clash/tiles_1.png' },
		{ name:'clash_t2', classes:'clash', source:'images/clash/tiles_2.png' },
		{ name:'clash_t3', classes:'clash', source:'images/clash/tiles_3.png' },
		{ name:'clash_t4', classes:'clash', source:'images/clash/tiles_4.png' },
		{ name:'clash_t5', classes:'clash', source:'images/clash/tiles_5.png' },
		{ name:'clash_t6', classes:'clash', source:'images/clash/tiles_6.png' },
		{ name:'clash_t7', classes:'clash', source:'images/clash/tiles_7.png' },
		{ name:'clash_s0', classes:'clash', source:'images/clash/sprites_0.png' },
		{ name:'clash_s1', classes:'clash', source:'images/clash/sprites_1.png' },
		{ name:'clash_s2', classes:'clash', source:'images/clash/sprites_2.png' }
	],
	tilerows: ['0', '1', '2', '3', '4', '5', '6', '7'],		// tile images by palette row: 'clash_t<row>'
	spriterows: 3,			// sprite images: 'clash_s0' .. 'clash_s2'
	T_FELT: 1,
	T_FELT2: 2,
	T_TL: 3,
	T_TOP: 4,
	T_TR: 5,
	T_LEFT: 6,
	T_RIGHT: 7,
	T_BL: 8,
	T_BOT: 9,
	T_BR: 10,
	T_WEAVE: 11,
	T_HEART: 12,
	T_BOLT: 13,
	T_DECK: 14,
	S_PORT: { col:0, row:0, frames:8, w:2, h:2 },
	S_PORT2: { col:0, row:2, frames:8, w:2, h:2 },
	S_PORT3: { col:0, row:4, frames:8, w:2, h:2 },
	S_BACK: { col:0, row:6, frames:1, w:2, h:2 },
	S_POINT: { col:2, row:6, frames:1, w:1, h:1 },
	S_BANG: { col:3, row:6, frames:1, w:1, h:1 }
};
