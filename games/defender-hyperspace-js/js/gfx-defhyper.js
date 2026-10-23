// gfx-defhyper.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_DEFHYPER =
{
	// the images for JSprites.addImagesToLibrary (class 'defhyper'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'defhyper_ink', classes:'defhyper', source:'images/defhyper/tiles_ink.png' },
		{ name:'defhyper_t0', classes:'defhyper', source:'images/defhyper/tiles_0.png' },
		{ name:'defhyper_s0', classes:'defhyper', source:'images/defhyper/sprites_0.png' },
		{ name:'defhyper_s1', classes:'defhyper', source:'images/defhyper/sprites_1.png' },
		{ name:'defhyper_s2', classes:'defhyper', source:'images/defhyper/sprites_2.png' },
		{ name:'defhyper_s3', classes:'defhyper', source:'images/defhyper/sprites_3.png' },
		{ name:'defhyper_s4', classes:'defhyper', source:'images/defhyper/sprites_4.png' },
		{ name:'defhyper_s5', classes:'defhyper', source:'images/defhyper/sprites_5.png' },
		{ name:'defhyper_s6', classes:'defhyper', source:'images/defhyper/sprites_6.png' },
		{ name:'defhyper_s7', classes:'defhyper', source:'images/defhyper/sprites_7.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'defhyper_t<row>'
	spriterows: 8,			// sprite images: 'defhyper_s0' .. 'defhyper_s7'
	T_HUD: 1,
	T_SCAN: 2,
	T_SCANT: 3,
	T_SCANG: 4,
	T_LIFE: 5,
	T_SMART: 6,
	T_BLACK: 7,
	T_INV: 8,
	T_INVE: 9,
	T_SCANS: 10,
	T_DOT: 96,
	T_DOT_N: 60,
	S_SHIP: { col:0, row:0, frames:3, w:2, h:1 },
	S_LASER: { col:6, row:0, frames:1, w:1, h:1 },
	S_HUMAN: { col:7, row:0, frames:3, w:1, h:1 },
	S_GATE: { col:10, row:0, frames:2, w:1, h:1 },
	S_STARS: { col:12, row:0, frames:1, w:1, h:1 },
	S_WINDOW: { col:13, row:0, frames:1, w:1, h:1 },
	S_MINE: { col:14, row:0, frames:1, w:1, h:1 },
	S_LANDER: { col:0, row:1, frames:2, w:1, h:1 },
	S_MUTANT: { col:2, row:1, frames:2, w:1, h:1 },
	S_BOMBER: { col:4, row:1, frames:2, w:1, h:1 },
	S_POD: { col:6, row:1, frames:2, w:1, h:1 },
	S_SWARMER: { col:8, row:1, frames:2, w:1, h:1 },
	S_BAITER: { col:10, row:1, frames:2, w:1, h:1 },
	S_FIREB: { col:12, row:1, frames:2, w:1, h:1 },
	S_FIREBALL: { col:14, row:1, frames:2, w:1, h:1 },
	S_DYNAMO: { col:0, row:2, frames:2, w:1, h:1 },
	S_HUM: { col:2, row:2, frames:2, w:1, h:1 },
	S_GUPPY: { col:4, row:2, frames:2, w:1, h:1 },
	S_PHRED: { col:6, row:2, frames:2, w:1, h:1 },
	S_MUNCHIE: { col:8, row:2, frames:2, w:1, h:1 },
	S_BULLET: { col:10, row:2, frames:2, w:1, h:1 },
	S_BOOM: { col:0, row:3, frames:4, w:1, h:1 }
};
