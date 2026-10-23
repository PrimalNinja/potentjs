// gfx-gates.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_GATES =
{
	// the images for JSprites.addImagesToLibrary (class 'gates'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'gates_ink', classes:'gates', source:'images/gates/tiles_ink.png' },
		{ name:'gates_t0', classes:'gates', source:'images/gates/tiles_0.png' },
		{ name:'gates_s0', classes:'gates', source:'images/gates/sprites_0.png' },
		{ name:'gates_s1', classes:'gates', source:'images/gates/sprites_1.png' },
		{ name:'gates_s2', classes:'gates', source:'images/gates/sprites_2.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'gates_t<row>'
	spriterows: 3,			// sprite images: 'gates_s0' .. 'gates_s2'
	T_HUD: 1,
	T_HUDB: 2,
	T_GUN: 3,
	T_GUNX: 4,
	T_GATE: 5,
	S_GUN: { col:0, row:0, frames:1, w:1, h:1 },
	S_CROSS: { col:1, row:0, frames:1, w:1, h:1 },
	S_SHOT: { col:2, row:0, frames:1, w:1, h:1 },
	S_FIRE: { col:3, row:0, frames:1, w:1, h:1 },
	S_GATE: { col:4, row:0, frames:4, w:1, h:1 },
	S_IMP: { col:8, row:0, frames:2, w:1, h:1 },
	S_WRAITH: { col:10, row:0, frames:2, w:1, h:1 },
	S_SKULL: { col:12, row:0, frames:1, w:1, h:1 },
	S_FIEND: { col:13, row:0, frames:2, w:1, h:1 },
	S_BOOM: { col:0, row:1, frames:4, w:1, h:1 }
};
