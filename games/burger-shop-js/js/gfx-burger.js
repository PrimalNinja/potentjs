// gfx-burger.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_BURGER =
{
	// the images for JSprites.addImagesToLibrary (class 'burger'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'burger_ink', classes:'burger', source:'images/burger/tiles_ink.png' },
		{ name:'burger_t0', classes:'burger', source:'images/burger/tiles_0.png' },
		{ name:'burger_s0', classes:'burger', source:'images/burger/sprites_0.png' },
		{ name:'burger_s1', classes:'burger', source:'images/burger/sprites_1.png' },
		{ name:'burger_s2', classes:'burger', source:'images/burger/sprites_2.png' },
		{ name:'burger_s3', classes:'burger', source:'images/burger/sprites_3.png' },
		{ name:'burger_s4', classes:'burger', source:'images/burger/sprites_4.png' },
		{ name:'burger_s5', classes:'burger', source:'images/burger/sprites_5.png' },
		{ name:'burger_s6', classes:'burger', source:'images/burger/sprites_6.png' },
		{ name:'burger_s7', classes:'burger', source:'images/burger/sprites_7.png' },
		{ name:'burger_s8', classes:'burger', source:'images/burger/sprites_8.png' },
		{ name:'burger_s9', classes:'burger', source:'images/burger/sprites_9.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'burger_t<row>'
	spriterows: 10,			// sprite images: 'burger_s0' .. 'burger_s9'
	S_CHEF: { col:0, row:0, frames:6, w:1, h:1 },
	S_PERSON: { col:6, row:0, frames:3, w:1, h:1 },
	S_ITEM: { col:0, row:1, frames:11, w:1, h:1 },
	S_PLATE: { col:0, row:2, frames:16, w:1, h:1 },
	S_MARK: { col:0, row:3, frames:2, w:1, h:1 },
	S_CLOCK: { col:2, row:3, frames:4, w:1, h:1 }
};
