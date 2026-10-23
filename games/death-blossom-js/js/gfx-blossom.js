// gfx-blossom.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_BLOSSOM =
{
	// the images for JSprites.addImagesToLibrary (class 'blossom'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'blossom_ink', classes:'blossom', source:'images/blossom/tiles_ink.png' },
		{ name:'blossom_t0', classes:'blossom', source:'images/blossom/tiles_0.png' },
		{ name:'blossom_s0', classes:'blossom', source:'images/blossom/sprites_0.png' },
		{ name:'blossom_s1', classes:'blossom', source:'images/blossom/sprites_1.png' },
		{ name:'blossom_s2', classes:'blossom', source:'images/blossom/sprites_2.png' },
		{ name:'blossom_s3', classes:'blossom', source:'images/blossom/sprites_3.png' },
		{ name:'blossom_s4', classes:'blossom', source:'images/blossom/sprites_4.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'blossom_t<row>'
	spriterows: 5,			// sprite images: 'blossom_s0' .. 'blossom_s4'
	T_HUD: 1,
	T_LIFE: 2,
	T_GAUGE: 16,
	T_GAUGE_N: 9,
	T_BOSSBAR: 3,
	T_BOSSBAR_N: 9,
	S_SHIP: { col:0, row:0, frames:2, w:1, h:1 },
	S_SHOT: { col:2, row:0, frames:1, w:1, h:1 },
	S_ORB: { col:3, row:0, frames:1, w:1, h:1 },
	S_BULLET: { col:4, row:0, frames:2, w:1, h:1 },
	S_BOOM: { col:6, row:0, frames:4, w:1, h:1 },
	S_DART: { col:0, row:1, frames:4, w:1, h:1 },
	S_WEAVER: { col:4, row:1, frames:4, w:1, h:1 },
	S_BRUTE: { col:8, row:1, frames:4, w:1, h:1 },
	S_BOSS: { col:0, row:2, frames:2, w:2, h:2 }
};
