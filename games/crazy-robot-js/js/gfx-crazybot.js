// gfx-crazybot.js - made by tools/nextgfx.py from the Next game's gfx/layout.txt: don't edit, run the tool.
// (c) 2026 Cyborg Unicorn Pty Ltd
var GFX_CRAZYBOT =
{
	// the images for JSprites.addImagesToLibrary (class 'crazybot'): the ink mask, the tile rows, the sprite rows
	images: [
		{ name:'crazybot_ink', classes:'crazybot', source:'images/crazybot/tiles_ink.png' },
		{ name:'crazybot_t0', classes:'crazybot', source:'images/crazybot/tiles_0.png' },
		{ name:'crazybot_tg1', classes:'crazybot', source:'images/crazybot/tiles_g1.png' },
		{ name:'crazybot_tg2', classes:'crazybot', source:'images/crazybot/tiles_g2.png' },
		{ name:'crazybot_s0', classes:'crazybot', source:'images/crazybot/sprites_0.png' },
		{ name:'crazybot_s1', classes:'crazybot', source:'images/crazybot/sprites_1.png' },
		{ name:'crazybot_s2', classes:'crazybot', source:'images/crazybot/sprites_2.png' },
		{ name:'crazybot_s3', classes:'crazybot', source:'images/crazybot/sprites_3.png' },
		{ name:'crazybot_s4', classes:'crazybot', source:'images/crazybot/sprites_4.png' },
		{ name:'crazybot_s5', classes:'crazybot', source:'images/crazybot/sprites_5.png' },
		{ name:'crazybot_s6', classes:'crazybot', source:'images/crazybot/sprites_6.png' },
		{ name:'crazybot_s7', classes:'crazybot', source:'images/crazybot/sprites_7.png' },
		{ name:'crazybot_s8', classes:'crazybot', source:'images/crazybot/sprites_8.png' },
		{ name:'crazybot_s9', classes:'crazybot', source:'images/crazybot/sprites_9.png' }
	],
	tilerows: ['0', 'g1', 'g2'],		// tile images by palette row: 'crazybot_t<row>'
	spriterows: 10,			// sprite images: 'crazybot_s0' .. 'crazybot_s9'
	T_HUD: 1,
	T_HUDL: 2,
	T_WALL: 3,
	T_WALL_N: 2,
	T_DOOR: 5,
	T_BLACK: 6,
	T_LIFE: 7,
	T_CHARGE: 8,
	T_BAR: 16,
	T_BAR_N: 9,
	S_HERO: { col:0, row:0, frames:6, w:1, h:1 },
	S_GRUNT: { col:0, row:1, frames:2, w:1, h:1 },
	S_SHOOTER: { col:2, row:1, frames:2, w:1, h:1 },
	S_SPINNER: { col:4, row:1, frames:2, w:1, h:1 },
	S_HULK: { col:6, row:1, frames:2, w:1, h:1 },
	S_TURRET: { col:8, row:1, frames:1, w:1, h:1 },
	S_HUMAN: { col:9, row:1, frames:2, w:1, h:1 },
	S_CRAZY: { col:11, row:1, frames:2, w:1, h:1 },
	S_BULLET: { col:0, row:2, frames:3, w:1, h:1 },
	S_SHOT: { col:3, row:2, frames:2, w:1, h:1 },
	S_BEAM: { col:5, row:2, frames:2, w:1, h:1 },
	S_RAY: { col:7, row:2, frames:2, w:1, h:1 },
	S_WARN: { col:9, row:2, frames:1, w:1, h:1 },
	S_BOOM: { col:10, row:2, frames:4, w:1, h:1 },
	S_SPARK: { col:14, row:2, frames:1, w:1, h:1 },
	S_HEART: { col:15, row:2, frames:1, w:1, h:1 },
	S_BOSS: { col:0, row:3, frames:4, w:2, h:2 }
};
