// JObj3D tests (three.js r128, no WebGL: everything but the drawing itself), and the standalone JSound / JMusic
// usage: node test-jobj3d.js <folder with jobj3d.js, jsound.js, jmusic.js>      needs three (NODE_PATH)
// ES5

var g_fs = require('fs');
var g_path = require('path');
var g_vm = require('vm');
var THREE = require('three');

var g_strDir = process.argv[2];
var g_intPassed = 0;
var g_intFailed = 0;

function check(blnCondition_a, strName_a, strDetail_a)
{
	if (blnCondition_a) { g_intPassed++; console.log('  PASS  ' + strName_a); }
	else { g_intFailed++; console.log('  FAIL  ' + strName_a + '\n        ' + strDetail_a); }
}

function near(fltA_a, fltB_a, fltTolerance_a)
{
	return Math.abs(fltA_a - fltB_a) <= (fltTolerance_a || 0.5);
}

function createWorld(objOptions_a)
{
	var objContext = { THREE: THREE, Math: Math, console: console };
	objContext.window = { devicePixelRatio: 1, addEventListener: function() {}, removeEventListener: function() {}, requestAnimationFrame: function() { return 1; }, cancelAnimationFrame: function() {} };
	g_vm.createContext(objContext);
	g_vm.runInContext(g_fs.readFileSync(g_path.join(g_strDir, 'jobj3d.js'), 'utf8') + '\nthis.JObj3D = JObj3D;', objContext);
	return new objContext.JObj3D(objOptions_a || {});
}

console.log('JObj3D');

(function()
{
	var objWorld = createWorld({ nobj: 8 });
	var intA = objWorld.spawn(objWorld.K_CUBE, 4, objWorld.CL_ENEMY, 100, 0, 2000, 0xff0000);
	var objA = objWorld.objects[intA];
	var intI = 0;
	var arrFull = [];

	check(intA === 0 && objA.cls === objWorld.CL_ENEMY && objA.hw === 256 && objA.hh === 256 && objWorld.getScene().children.indexOf(objA.mesh) !== -1,
		'spawn: first free slot, hit box from the model at its size (16 x 2^4), a three.js mesh in the scene', 'hw ' + objA.hw);
	for (intI = 1; intI < 8; intI++)
	{
		arrFull.push(objWorld.spawn(objWorld.K_DART, 2, objWorld.CL_SCENERY, 0, 0, 0));
	}
	check(objWorld.spawn(objWorld.K_DART, 2, objWorld.CL_SCENERY, 0, 0, 0) === -1 && objWorld.count(objWorld.CL_SCENERY) === 7, 'a full table gives -1; count by class', objWorld.count(objWorld.CL_SCENERY));
	objWorld.kill(3);
	check(objWorld.count(objWorld.CL_SCENERY) === 6 && objWorld.spawn(objWorld.K_DART, 2, objWorld.CL_SCENERY, 0, 0, 0) === 3, 'kill frees the slot for the next spawn', '');
	objWorld.clear();
	check(objWorld.count(objWorld.CL_SCENERY) === 0 && objWorld.count(objWorld.CL_ENEMY) === 0, 'clear empties the table', '');

	// movers
	intA = objWorld.spawn(objWorld.K_CUBE, 2, objWorld.CL_ENEMY, 0, 0, 0);
	objWorld.setMover(intA, objWorld.MV_STRAIGHT, 0);
	objWorld.setVel(intA, 3, 0, -2);
	objWorld.update(5);
	check(objWorld.objects[intA].x === 15 && objWorld.objects[intA].z === -10, 'MV_STRAIGHT: on by its speed, 5 50ths', objWorld.objects[intA].x + ',' + objWorld.objects[intA].z);

	objWorld.setMover(intA, objWorld.MV_FALL, 0);
	objWorld.objects[intA].pa = 2;
	objWorld.setVel(intA, 0, 0, 0);
	objWorld.objects[intA].y = 0;
	objWorld.update(3);
	check(objWorld.objects[intA].y === -12 && objWorld.objects[intA].vy === -6, 'MV_FALL: the speed down grows by pa a 50th', 'y ' + objWorld.objects[intA].y);

	objWorld.objects[intA].life = 4;
	objWorld.update(4);
	check(objWorld.objects[intA].cls === 0, 'life: taken out when it reaches 0', '');

	intA = objWorld.spawn(objWorld.K_ROCK, 3, objWorld.CL_SCENERY, 0, 0, 0);
	objWorld.setMover(intA, objWorld.MV_ORBIT, 0);
	objWorld.objects[intA].pa = 1000;
	objWorld.objects[intA].pb = 500;
	objWorld.objects[intA].dist = 400;
	objWorld.objects[intA].spd = 64;
	objWorld.update(10);
	check(near(Math.sqrt(Math.pow(objWorld.objects[intA].x - 1000, 2) + Math.pow(objWorld.objects[intA].z - 500, 2)), 400, 0.01), 'MV_ORBIT: round (pa, pb) at dist', objWorld.objects[intA].x.toFixed(1) + ',' + objWorld.objects[intA].z.toFixed(1));
	objWorld.clear();

	// charging at you, then passing and gone behind
	intA = objWorld.spawn(objWorld.K_SHIP, 3, objWorld.CL_ENEMY, 0, 0, 4000);
	objWorld.setMover(intA, objWorld.MV_CHARGE, objWorld.OF_FACECAM);
	objWorld.objects[intA].spd = 100;
	objWorld.update(10);
	objWorld.update(10);
	check(objWorld.objects[intA].z < 4000 && objWorld.objects[intA].mover === objWorld.MV_PASS, 'MV_CHARGE: straight at you, within 2500 it goes on through (MV_PASS)', 'z ' + objWorld.objects[intA].z.toFixed(0) + ', mover ' + objWorld.objects[intA].mover);
	for (var intP = 0; intP < 8; intP++)
	{
		objWorld.update(10);
	}
	check(objWorld.objects[intA].cls === 0, 'MV_PASS: taken out 3000 behind you', 'z ' + objWorld.objects[intA].z);

	// coming down to the ground
	intA = objWorld.spawn(objWorld.K_CUBE, 2, objWorld.CL_SCENERY, 0, 100, 3000);
	objWorld.setMover(intA, objWorld.MV_FALL, objWorld.OF_LAND);
	objWorld.objects[intA].pa = 4;
	objWorld.update(10);
	check(objWorld.objects[intA].y === 0 && objWorld.objects[intA].mover === objWorld.MV_STILL && objWorld.nextEvent() === objWorld.EV_LAND && objWorld.ea === intA, 'OF_LAND: stopped on the ground, EV_LAND', 'y ' + objWorld.objects[intA].y);
	objWorld.clear();
})();

(function()
{
	var objWorld = createWorld({ nobj: 32 });
	var intEnemy = objWorld.spawn(objWorld.K_SHIP, 4, objWorld.CL_ENEMY, 0, 0, 3000, 0xff4040);
	var intEvent = 0;
	var intBolt = -1;
	var intGot = 0;
	var intI = 0;
	var intHitsYou = 0;
	var intDebrisAtBoom = 0;

	objWorld.setMover(intEnemy, objWorld.MV_STILL, objWorld.OF_FACECAM);
	objWorld.objects[intEnemy].gun = 10;
	objWorld.update(10);
	intEvent = objWorld.nextEvent();
	check(intEvent === objWorld.EV_FIRE && objWorld.ea === intEnemy && objWorld.objects[intEnemy].gun === -1, 'guns: ready with you in front of it: EV_FIRE (then waits to be re-armed)', 'event ' + intEvent);

	intBolt = objWorld.fire(intEnemy, 60);
	check(intBolt !== -1 && objWorld.objects[intBolt].cls === objWorld.CL_EBOLT && objWorld.objects[intBolt].vz < -50 && objWorld.objects[intBolt].mask === objWorld.M_PLAYER, 'fire: an enemy bolt along the way it faces (towards you), it hits you', 'vz ' + objWorld.objects[intBolt].vz);
	for (intI = 0; intI < 6; intI++)
	{
		objWorld.update(10);
	}
	intEvent = objWorld.nextEvent();
	while (intEvent !== 0)
	{
		if ((intEvent === objWorld.EV_HIT) && (objWorld.eb === 255))
		{
			intHitsYou++;
		}
		intEvent = objWorld.nextEvent();
	}
	check(intHitsYou >= 1, 'the bolt reaching you: EV_HIT with eb 255 (you)', intHitsYou + ' hits');

	// your bolt into the enemy
	objWorld.clear();
	intEnemy = objWorld.spawn(objWorld.K_SHIP, 4, objWorld.CL_ENEMY, 0, 0, 2000, 0xff4040);
	intBolt = objWorld.firePlayer(80);
	for (intI = 0; intI < 6; intI++)
	{
		objWorld.update(10);
		intEvent = objWorld.nextEvent();
		while (intEvent !== 0)
		{
			if ((intEvent === objWorld.EV_HIT) && (objWorld.ea === intBolt) && (objWorld.eb === intEnemy))
			{
				intGot++;
				objWorld.boom(intEnemy, 5);
				objWorld.kill(intBolt);
				intDebrisAtBoom = objWorld.count(objWorld.CL_DEBRIS);
			}
			intEvent = objWorld.nextEvent();
		}
	}
	check(intGot === 1, 'your bolt (firePlayer) hits the enemy: EV_HIT bolt, enemy, once (not once per 50th of the update)', intGot + ' hits');
	check(objWorld.nextEvent() === 0, 'events about objects since taken out (their slots reused by the blast) are dropped', 'ea ' + objWorld.ea);
	check(objWorld.count(objWorld.CL_ENEMY) === 0 && intDebrisAtBoom === 7, 'boom: the enemy gone, a fireball and 6 pieces of debris where it was', intDebrisAtBoom + ' (fireball and debris)');
	for (intI = 0; intI < 12; intI++)
	{
		objWorld.update(10);
	}
	check(objWorld.count(objWorld.CL_DEBRIS) === 0, 'the fireball and debris burn out (their lives)', objWorld.count(objWorld.CL_DEBRIS) + ' left');
})();

(function()
{
	var objWorld = createWorld({ nobj: 8, container: { clientWidth: 800, clientHeight: 600, appendChild: function() {} }, renderer: false });
	var intAhead = objWorld.spawn(objWorld.K_CUBE, 3, objWorld.CL_ENEMY, 0, 0, 1000);
	var intBehind = objWorld.spawn(objWorld.K_CUBE, 3, objWorld.CL_ENEMY, 0, 0, -1000);
	var intRight = objWorld.spawn(objWorld.K_CUBE, 3, objWorld.CL_ENEMY, 2000, 0, 0);
	var objProjected = null;

	check(objWorld.onScreen(intAhead) === 1 && objWorld.onScreen(intBehind) === 0 && objWorld.onScreen(intRight) === 0, 'onScreen: ahead yes, behind and off to the side no (90 degrees across)', '');
	check(objWorld.pick(objWorld.M_ENEMY, 5000) === intAhead, 'pick: the nearest target in front of you', objWorld.pick(objWorld.M_ENEMY, 5000));
	objWorld.draw();
	check(objWorld.objects[intAhead].mesh.position.z === 1000 && near(objWorld.getThreeCamera().fov, 73.74, 0.05), 'draw: three.js meshes placed from the table; the camera 90 degrees across (73.7 up on 4:3)', 'fov ' + objWorld.getThreeCamera().fov.toFixed(2));
	objWorld.getThreeCamera().updateMatrixWorld();
	objProjected = new THREE.Vector3(0, 0, 1000).project(objWorld.getThreeCamera());
	check(near(objProjected.x, 0, 0.001) && near(objProjected.y, 0, 0.001), 'the object straight ahead is in the middle of the picture (three.js projection)', objProjected.x + ',' + objProjected.y);

	objWorld.setCamera(0, 0, 0, Math.PI / 2, 0, 0);
	objWorld.draw();
	objWorld.getThreeCamera().updateMatrixWorld();
	objProjected = new THREE.Vector3(2000, 0, 0).project(objWorld.getThreeCamera());
	check(objWorld.onScreen(intRight) === 1 && objWorld.onScreen(intAhead) === 0 && near(objProjected.x, 0, 0.001), 'the camera turned (yaw a quarter turn): the one on the right is now ahead', objProjected.x);

	objWorld.shift(10, 20, 30);
	check(objWorld.objects[intAhead].x === 10 && objWorld.objects[intAhead].z === 1030, 'shift moves everything (as Rebase)', '');

	objWorld.addModel(20, { vertices: [[0, 10, 0], [-10, -10, 0], [10, -10, 0]], faces: [{ v: [0, 1, 2], c: 0x00ff00 }] });
	check(objWorld.objects[objWorld.spawn(20, 1, objWorld.CL_SCENERY, 0, 0, 0)].hw === 20, 'addModel: your own model (E3Data style: vertices, faces with colours)', '');
	objWorld.destroy();
	check(objWorld.count(objWorld.CL_ENEMY) === 0, 'destroy lets everything go', '');
})();

// ---- the standalone JSound / JMusic
(function()
{
	var arrAdded = [];
	var arrRemoved = [];
	var intOscillators = 0;
	var blnClosed = false;
	var objContext = { Math: Math, console: console };
	var objSound = null;
	var objMusic = null;
	var fnStart = null;

	function node()
	{
		return { gain: { value: 0, setValueAtTime: function() {}, linearRampToValueAtTime: function() {}, cancelScheduledValues: function() {} }, frequency: { value: 0, setValueAtTime: function() {} }, playbackRate: { value: 1, setValueAtTime: function() {} }, connect: function() {}, disconnect: function() {}, start: function() {}, stop: function() {}, type: '' };
	}

	objContext.window = {
		AudioContext: function()
		{
			this.state = 'running';
			this.sampleRate = 44100;
			this.currentTime = 0;
			this.destination = {};
			this.createGain = function() { return node(); };
			this.createOscillator = function() { intOscillators++; return node(); };
			this.createBuffer = function() { return { getChannelData: function() { return new Float32Array(10); } }; };
			this.createBufferSource = function() { return node(); };
			this.resume = function() {};
			this.suspend = function() {};
			this.close = function() { blnClosed = true; };
		},
		addEventListener: function(strType_a, fn_a) { arrAdded.push(strType_a); if (strType_a === 'mousedown') { fnStart = fn_a; } },
		removeEventListener: function(strType_a) { arrRemoved.push(strType_a); }
	};
	objContext.document = { hidden: false, addEventListener: function(strType_a) { arrAdded.push(strType_a); }, removeEventListener: function(strType_a) { arrRemoved.push(strType_a); } };
	g_vm.createContext(objContext);
	g_vm.runInContext(g_fs.readFileSync(g_path.join(g_strDir, 'jsound.js'), 'utf8') + '\n' + g_fs.readFileSync(g_path.join(g_strDir, 'jmusic.js'), 'utf8') + '\nthis.JSound = JSound; this.JMusic = JMusic;', objContext);

	console.log('JSound / JMusic (standalone)');
	check(typeof objContext.isFunction === 'undefined' && typeof objContext.processArray === 'undefined', 'standalone: no PotentJS utils on the page (they carry their own)', '');
	objSound = new objContext.JSound({ channels: 3 });
	objSound.addSoundsToLibrary([{ name: 'zap', period: 60, slide: 4, volume: 13, frames: 6 }]);
	fnStart();
	objSound.playSoundByName('zap', 1);
	objSound.update();
	check(intOscillators === 3 && objSound.isBusy(1), 'JSound: starts on the first touch, plays a sound from its library', intOscillators + ' oscillators');
	objSound.destroy();
	check(arrRemoved.indexOf('mousedown') !== -1 && arrRemoved.indexOf('visibilitychange') !== -1 && blnClosed, 'JSound.destroy: lets go of its listeners and closes its audio', JSON.stringify(arrRemoved));

	blnClosed = false;
	objMusic = new objContext.JMusic({ channels: 2 });
	objMusic.addMusicSpritesToLibrary([{ name: 'beat', classes: 'song', channel: 0, delay: 2, volume: 10, sequence: ['C3', '-', 'G3', '-', -1] }]);
	objMusic.useMusicSpritesByClass('song');
	objMusic.playMusicSpriteByName('beat', 1);
	objMusic.step();
	objMusic.step();
	check(objMusic.isPlaying(objMusic.getMusicSpriteIDByName('beat')), 'JMusic: a music sprite plays (its own JSound underneath)', '');
	objMusic.destroy();
	check(!objMusic.isPlaying(objMusic.getMusicSpriteIDByName('beat')) && (arrRemoved.filter(function(s_a) { return s_a === 'mousedown'; }).length === 2), 'JMusic.destroy: stops and lets go of the JSound it made', JSON.stringify(arrRemoved));
})();

console.log('\n' + g_intPassed + ' passed, ' + g_intFailed + ' failed');
process.exitCode = (g_intFailed > 0) ? 1 : 0;
