// JObj3D demo: enemies keep station ahead and weave, chargers fly at you, guns fire when you're in front of them,
// you shoot back. Arrow keys (or drag) steer, space (or tap) fires. All three.js is JObj3D's.
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
var g_objWorld = new JObj3D({ container: document.getElementById('geView'), background: 0x000010 });
var g_objKeys = {};
var g_objDrag = null;
var g_intScore = 0;
var g_intShield = 10;
var g_intNextWave = 0;
var g_intReload = 0;

function spawnWave()
{
	var intI = 0;
	var intEnemy = 0;
	var objAxes = g_objWorld.getCameraAxes();
	var objCamera = g_objWorld.camera;

	for (intI = 0; intI < 3; intI++)
	{
		intEnemy = g_objWorld.spawn(g_objWorld.K_SHIP, 4, g_objWorld.CL_ENEMY, objCamera.x + objAxes.forward.x * 6000 + (intI - 1) * 1500, objCamera.y + 300 * intI, objCamera.z + objAxes.forward.z * 6000, 0xff5040);
		if (intEnemy !== -1)
		{
			g_objWorld.setMover(intEnemy, (intI === 1) ? g_objWorld.MV_CHARGE : g_objWorld.MV_HOLD, g_objWorld.OF_FACECAM);
			g_objWorld.hold(intEnemy, 3500 + intI * 600, 1200, 500, 4);
			g_objWorld.objects[intEnemy].gun = 40 + intI * 25;
			g_objWorld.objects[intEnemy].mask = g_objWorld.M_PLAYER;
		}
	}
}

function scenery()
{
	var intI = 0;
	var intRock = 0;

	for (intI = 0; intI < 24; intI++)
	{
		intRock = g_objWorld.spawn(g_objWorld.K_ROCK, 5 + (intI % 3), g_objWorld.CL_SCENERY, (Math.random() * 2 - 1) * 12000, (Math.random() * 2 - 1) * 3000, Math.random() * 20000, 0x6a6a72);
		if (intRock !== -1)
		{
			g_objWorld.spin(intRock, (intI % 3) - 1, (intI % 2) ? 1 : -1);
			g_objWorld.setMover(intRock, g_objWorld.MV_STILL, g_objWorld.OF_WRAP);
		}
	}
}

window.addEventListener('keydown', function(objEvent_a) { g_objKeys[objEvent_a.keyCode] = true; });
window.addEventListener('keyup', function(objEvent_a) { g_objKeys[objEvent_a.keyCode] = false; });
window.addEventListener('pointerdown', function(objEvent_a) { g_objDrag = { x: objEvent_a.clientX, y: objEvent_a.clientY, moved: false }; });
window.addEventListener('pointermove', function(objEvent_a)
{
	if (g_objDrag)
	{
		g_objWorld.camera.yaw += (objEvent_a.clientX - g_objDrag.x) * 0.004;
		g_objWorld.camera.pitch = Math.max(-1, Math.min(1, g_objWorld.camera.pitch - (objEvent_a.clientY - g_objDrag.y) * 0.004));
		g_objDrag.moved = g_objDrag.moved || (Math.abs(objEvent_a.clientX - g_objDrag.x) + Math.abs(objEvent_a.clientY - g_objDrag.y) > 4);
		g_objDrag.x = objEvent_a.clientX;
		g_objDrag.y = objEvent_a.clientY;
	}
});
window.addEventListener('pointerup', function()
{
	if (g_objDrag && !g_objDrag.moved)
	{
		g_objWorld.firePlayer(90);
	}
	g_objDrag = null;
});

scenery();

g_objWorld.run(function(intDt_a)
{
	var objCamera = g_objWorld.camera;
	var objAxes = null;
	var intEvent = 0;

	// steering and flying on
	if (g_objKeys[37]) { objCamera.yaw -= 0.03 * intDt_a; }
	if (g_objKeys[39]) { objCamera.yaw += 0.03 * intDt_a; }
	if (g_objKeys[38]) { objCamera.pitch = Math.min(1, objCamera.pitch + 0.02 * intDt_a); }
	if (g_objKeys[40]) { objCamera.pitch = Math.max(-1, objCamera.pitch - 0.02 * intDt_a); }
	objAxes = g_objWorld.getCameraAxes();
	objCamera.vx = objAxes.forward.x * 30;
	objCamera.vy = objAxes.forward.y * 30;
	objCamera.vz = objAxes.forward.z * 30;
	objCamera.x += objCamera.vx * intDt_a;
	objCamera.y += objCamera.vy * intDt_a;
	objCamera.z += objCamera.vz * intDt_a;

	g_intReload = Math.max(0, g_intReload - intDt_a);
	if (g_objKeys[32] && (g_intReload === 0))
	{
		g_objWorld.firePlayer(90);
		g_intReload = 8;
	}

	g_intNextWave -= intDt_a;
	if ((g_objWorld.count(g_objWorld.CL_ENEMY) === 0) && (g_intNextWave <= 0))
	{
		spawnWave();
		g_intNextWave = 100;
	}

	// what happened
	intEvent = g_objWorld.nextEvent();
	while (intEvent !== 0)
	{
		if (intEvent === g_objWorld.EV_FIRE)
		{
			g_objWorld.fire(g_objWorld.ea, 45);
			g_objWorld.objects[g_objWorld.ea].gun = 60;
		}
		else if ((intEvent === g_objWorld.EV_HIT) && (g_objWorld.eb === 255))
		{
			g_intShield--;
			g_objWorld.boom(g_objWorld.ea, 3);
		}
		else if (intEvent === g_objWorld.EV_HIT)
		{
			if (g_objWorld.objects[g_objWorld.eb].cls === g_objWorld.CL_ENEMY)
			{
				g_intScore += 100;
			}
			g_objWorld.kill(g_objWorld.ea);
			g_objWorld.boom(g_objWorld.eb, 5);
		}
		intEvent = g_objWorld.nextEvent();
	}

	document.getElementById('geHud').textContent = 'SCORE ' + g_intScore + '   SHIELD ' + Math.max(g_intShield, 0) + '   (arrows / drag steer, space / tap fire)';
});
