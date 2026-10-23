// gfx-zbomber.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_ZBOMBER =
{
	// the images for JSprites.addImagesToLibrary (class 'zbomber'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'zbomber_ink', classes:'zbomber', source:'images/zbomber/tiles_ink.png' },
		{ name:'zbomber_t0', classes:'zbomber', source:'images/zbomber/tiles_0.png' },
		{ name:'zbomber_s0', classes:'zbomber', source:'images/zbomber/sprites_0.png' },
		{ name:'zbomber_s1', classes:'zbomber', source:'images/zbomber/sprites_1.png' },
		{ name:'zbomber_s2', classes:'zbomber', source:'images/zbomber/sprites_2.png' },
		{ name:'zbomber_s3', classes:'zbomber', source:'images/zbomber/sprites_3.png' },
		{ name:'zbomber_s4', classes:'zbomber', source:'images/zbomber/sprites_4.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'zbomber_t<row>'
	spriterows: 5,			// sprite images: 'zbomber_s0' .. 'zbomber_s4'
	T_PANEL: 1,
	T_PANELT: 2,
	T_PANELB: 3,
	T_KEYB: 4,
	T_KEYR: 5,
	T_SHIPB: 6,
	T_SHIPR: 7,
	S_CURSOR: { col:0, row:0, frames:2, w:2, h:1 },
	S_PICK: { col:4, row:0, frames:1, w:2, h:1 },
	S_FRIGATE: { col:6, row:0, frames:2, w:1, h:1 },
	S_DRONE: { col:8, row:0, frames:2, w:1, h:1 },
	S_ZB: { col:10, row:0, frames:2, w:2, h:1 },
	S_KEY: { col:14, row:0, frames:2, w:1, h:1 },
	S_DIGIT: { col:0, row:1, frames:10, w:1, h:1 },
	S_FLAG: { col:10, row:1, frames:1, w:1, h:1 },
	S_TARGET: { col:11, row:1, frames:1, w:1, h:1 },
	S_LASER: { col:12, row:1, frames:1, w:1, h:1 },
	S_BOOM: { col:0, row:2, frames:4, w:1, h:1 }
};
