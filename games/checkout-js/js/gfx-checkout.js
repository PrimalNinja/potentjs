// gfx-checkout.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_CHECKOUT =
{
	// the images for JSprites.addImagesToLibrary (class 'checkout'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'checkout_ink', classes:'checkout', source:'images/checkout/tiles_ink.png' },
		{ name:'checkout_t0', classes:'checkout', source:'images/checkout/tiles_0.png' },
		{ name:'checkout_s0', classes:'checkout', source:'images/checkout/sprites_0.png' },
		{ name:'checkout_s1', classes:'checkout', source:'images/checkout/sprites_1.png' },
		{ name:'checkout_s2', classes:'checkout', source:'images/checkout/sprites_2.png' },
		{ name:'checkout_s3', classes:'checkout', source:'images/checkout/sprites_3.png' },
		{ name:'checkout_s4', classes:'checkout', source:'images/checkout/sprites_4.png' },
		{ name:'checkout_s5', classes:'checkout', source:'images/checkout/sprites_5.png' },
		{ name:'checkout_s6', classes:'checkout', source:'images/checkout/sprites_6.png' },
		{ name:'checkout_s7', classes:'checkout', source:'images/checkout/sprites_7.png' },
		{ name:'checkout_s8', classes:'checkout', source:'images/checkout/sprites_8.png' },
		{ name:'checkout_s9', classes:'checkout', source:'images/checkout/sprites_9.png' }
	],
	tilerows: ['0'],		// tile images by palette row: 'checkout_t<row>'
	spriterows: 10,			// sprite images: 'checkout_s0' .. 'checkout_s9'
	T_BLANK: 1,
	T_DIGIT: 2,
	T_DIGIT_N: 13,
	S_PERSON: { col:0, row:0, frames:3, w:1, h:1 },
	S_CASHIER: { col:3, row:0, frames:2, w:1, h:1 },
	S_ITEM: { col:0, row:1, frames:12, w:1, h:1 },
	S_FACE: { col:0, row:2, frames:2, w:1, h:1 }
};
