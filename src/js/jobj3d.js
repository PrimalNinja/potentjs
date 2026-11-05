// JObj3D - NTC3D's Obj3D on three.js: a table of things in a 3D world, each moved every 50th of a second by
// its mover, tested for hits against the classes its mask cares about, and drawn by three.js - so a game only
// says what's what and answers what happened. Same classes, masks, movers, flags and events as the ZX Spectrum
// Next's Obj3D (NTC BASIC), same units (world units; speeds a 50th's move; turns 256 to the circle), so a game
// can be designed once for both. three.js (r128) does the scene, the camera, the light and the drawing.
//
//   var objWorld = new JObj3D({ container: document.getElementById('geView') });
//   var intShip = objWorld.spawn(objWorld.K_SHIP, 4, objWorld.CL_ENEMY, 0, 0, 3000, 0xff4040);
//   objWorld.setMover(intShip, objWorld.MV_CHARGE, objWorld.OF_FACECAM);
//   objWorld.objects[intShip].spd = 6;  objWorld.objects[intShip].gun = 50;
//   objWorld.run(function(intDt_a)
//   {
//       var intEvent = objWorld.nextEvent();
//       while (intEvent !== 0)
//       {
//           if (intEvent === objWorld.EV_FIRE) { objWorld.fire(objWorld.ea, 40); objWorld.objects[objWorld.ea].gun = 50; }
//           if (intEvent === objWorld.EV_HIT) { objWorld.boom(objWorld.ea, 4); }
//           intEvent = objWorld.nextEvent();
//       }
//   });
//
// The camera (objWorld.camera): x, y, z where it is; yaw, pitch, roll (radians: yaw 0 looks along +z); vx, vy,
// vz its move a 50th (the movers that keep station or charge use it). x right, y up, z ahead, as E3.
// An object (objWorld.objects[i]): kind, size (a model unit is 2^size world units), cls (0 = free), mask,
// x, y, z, vx, vy, vz, mover, flags, pa, pb, spd, dist (the mover's settings), state, timer, life (50ths to
// go, 0 = for ever), gun (50ths till ready; -1 waiting to be re-armed), hw, hh (half hit box across / up),
// colour, type, uv (yours), mark (scanner colour), spina, spinb (256ths of a turn a 50th).
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JObj3D(objOptions_a)
{
	var m_objThis = this;
	var m_objOptions = objOptions_a || {};

	var m_TURN = Math.PI * 2 / 256;		// a 256th of a turn in radians
	var m_INTCAMHIT = 60;				// the camera's own half size for hits (world units)

	var m_objScene = null;
	var m_objCamera3 = null;
	var m_objRenderer = null;
	var m_objSun = null;
	var m_objModels = {};				// kind: { geometry, faceColours, hw, hh }
	var m_objMaterials = {};			// colour: material
	var m_arrEvents = [];				// { type, a, b, sa, sb }: sa, sb the objects' serials when it happened
	var m_intFrame = 0;
	var m_intSerial = 0;				// every spawn gets the next: an event about a slot since reused is dropped
	var m_intAnimation = 0;
	var m_fltLastTime = 0;
	var m_fnFrame = null;
	var m_fnResize = null;
	var m_objResizeObserver = null;
	var m_objBolt = { kind: 3, size: 3, colour: 0xffff60 };
	var m_objDebris = { kind: 5, size: 3, colour: 0xb0b0b0, fall: 1 };
	var m_objBlast = { kind: 4, colour: 0xff8020 };

	// classes and their mask bits, movers, flags, events: as Obj3D's
	this.CL_PLAYER = 1; this.CL_ENEMY = 2; this.CL_EBOLT = 3; this.CL_PBOLT = 4; this.CL_SCENERY = 5; this.CL_DEBRIS = 6;
	this.M_PLAYER = 2; this.M_ENEMY = 4; this.M_EBOLT = 8; this.M_PBOLT = 16; this.M_SCENERY = 32; this.M_DEBRIS = 64;
	this.MV_STILL = 0; this.MV_STRAIGHT = 1; this.MV_FALL = 2; this.MV_BLAST = 3; this.MV_HOLD = 4; this.MV_HOLDONLY = 5;
	this.MV_CHARGE = 6; this.MV_PASS = 7; this.MV_TURN = 8; this.MV_WEAVE = 9; this.MV_ORBIT = 10; this.MV_CIRCLE = 11;
	this.MV_HUNT = 12; this.MV_HOME = 13;
	this.OF_BEHIND = 1; this.OF_WRAP = 2; this.OF_FACECAM = 4; this.OF_FACEVEL = 8; this.OF_LAND = 16; this.OF_GUNANY = 32;
	this.EV_FIRE = 1; this.EV_HIT = 2; this.EV_LAND = 3;

	// the models it knows from the start (more with addModel)
	this.K_CUBE = 0; this.K_SHIP = 1; this.K_DART = 2; this.K_BOLT = 3; this.K_BLAST = 4; this.K_DEBRIS = 5; this.K_ROCK = 6;

	this.nobj = m_objOptions.nobj || 64;
	this.ground = (m_objOptions.ground !== undefined) ? m_objOptions.ground : 0;	// OF_LAND's ground height
	this.objects = [];
	this.camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0 };
	this.ea = 0;			// the last event's objects (NextEvent): ea, and eb (255: the camera)
	this.eb = 0;

	// ================================================================================================
	// MODELS

	function colourOf(varColour_a)
	{
		return new THREE.Color(varColour_a);
	}

	// a model: vertices [[x, y, z], ...] (model units, int8 as E3Data's), faces [[i, i, i, ...] or
	// { v: [i, ...], c: colour }]: convex, any order (both sides drawn, so winding doesn't matter)
	function buildModel(objModel_a)
	{
		var arrPositions = [];
		var arrColours = [];
		var blnFaceColours = false;
		var fltHW = 0;
		var fltHH = 0;
		var intF = 0;
		var intV = 0;
		var arrFace = null;
		var objColour = null;
		var arrVertex = null;
		var objGeometry = new THREE.BufferGeometry();

		for (intF = 0; intF < objModel_a.faces.length; intF++)
		{
			arrFace = objModel_a.faces[intF].v || objModel_a.faces[intF];
			if (objModel_a.faces[intF].c !== undefined)
			{
				blnFaceColours = true;
			}
		}

		for (intF = 0; intF < objModel_a.faces.length; intF++)
		{
			arrFace = objModel_a.faces[intF].v || objModel_a.faces[intF];
			objColour = colourOf((objModel_a.faces[intF].c !== undefined) ? objModel_a.faces[intF].c : 0xffffff);
			for (intV = 1; intV < arrFace.length - 1; intV++)
			{
				pushVertex(arrFace[0]);
				pushVertex(arrFace[intV]);
				pushVertex(arrFace[intV + 1]);
			}
		}

		function pushVertex(intIndex_a)
		{
			arrVertex = objModel_a.vertices[intIndex_a];
			arrPositions.push(arrVertex[0], arrVertex[1], arrVertex[2]);
			arrColours.push(objColour.r, objColour.g, objColour.b);
			fltHW = Math.max(fltHW, Math.abs(arrVertex[0]), Math.abs(arrVertex[2]));
			fltHH = Math.max(fltHH, Math.abs(arrVertex[1]));
		}

		objGeometry.setAttribute('position', new THREE.Float32BufferAttribute(arrPositions, 3));
		if (blnFaceColours)
		{
			objGeometry.setAttribute('color', new THREE.Float32BufferAttribute(arrColours, 3));
		}
		objGeometry.computeVertexNormals();

		return { geometry: objGeometry, faceColours: blnFaceColours, hw: fltHW, hh: fltHH };
	}

	this.addModel = function(intKind_a, objModel_a)
	{
		m_objModels[intKind_a] = buildModel(objModel_a);
	};

	function addBuiltInModels()
	{
		var intI = 0;
		var arrRock = [];
		var arrRockFaces = [];

		m_objThis.addModel(m_objThis.K_CUBE, {
			vertices: [[-16, -16, -16], [16, -16, -16], [16, 16, -16], [-16, 16, -16], [-16, -16, 16], [16, -16, 16], [16, 16, 16], [-16, 16, 16]],
			faces: [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]
		});
		m_objThis.addModel(m_objThis.K_SHIP, {
			vertices: [[0, 0, 32], [-24, 0, -16], [24, 0, -16], [0, 8, -12], [0, -6, -12]],
			faces: [[0, 3, 1], [0, 2, 3], [0, 1, 4], [0, 4, 2], [1, 3, 2], [1, 2, 4]]
		});
		m_objThis.addModel(m_objThis.K_DART, {
			vertices: [[0, 0, 32], [-10, 0, -20], [10, 0, -20], [0, 10, -20]],
			faces: [[0, 3, 1], [0, 2, 3], [0, 1, 2], [1, 3, 2]]
		});
		m_objThis.addModel(m_objThis.K_BOLT, {
			vertices: [[0, 0, 24], [-3, 0, -24], [3, 0, -24], [0, 3, -24], [0, -3, -24]],
			faces: [[0, 1, 3], [0, 3, 2], [0, 2, 4], [0, 4, 1], [1, 4, 2, 3]]
		});
		m_objThis.addModel(m_objThis.K_BLAST, {
			vertices: [[0, 16, 0], [16, 0, 0], [0, 0, 16], [-16, 0, 0], [0, 0, -16], [0, -16, 0]],
			faces: [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]]
		});
		m_objThis.addModel(m_objThis.K_DEBRIS, {
			vertices: [[0, 8, 0], [-8, -6, -6], [8, -6, -6], [0, -6, 8]],
			faces: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]]
		});
		for (intI = 0; intI < 8; intI++)
		{
			arrRock.push([Math.cos(intI * Math.PI / 4) * (14 + (intI % 3) * 3), ((intI % 2) ? 6 : -6), Math.sin(intI * Math.PI / 4) * (14 + (intI % 2) * 4)]);
		}
		arrRock.push([0, 18, 0]);
		arrRock.push([0, -14, 0]);
		for (intI = 0; intI < 8; intI++)
		{
			arrRockFaces.push([8, intI, (intI + 1) % 8]);
			arrRockFaces.push([9, (intI + 1) % 8, intI]);
		}
		m_objThis.addModel(m_objThis.K_ROCK, { vertices: arrRock, faces: arrRockFaces });
	}

	function materialFor(objModel_a, intColour_a, blnGlow_a)
	{
		var strKey = (objModel_a.faceColours ? 'faces' : String(intColour_a)) + (blnGlow_a ? ':glow' : '');
		var objMaterial = m_objMaterials[strKey];

		if (!objMaterial)
		{
			if (blnGlow_a)
			{
				objMaterial = new THREE.MeshBasicMaterial({ color: colourOf(intColour_a), transparent: true, opacity: 0.85 });
			}
			else
			{
				objMaterial = new THREE.MeshLambertMaterial({ color: objModel_a.faceColours ? 0xffffff : colourOf(intColour_a), vertexColors: objModel_a.faceColours, side: THREE.DoubleSide });
			}
			m_objMaterials[strKey] = objMaterial;
		}

		return objMaterial;
	}

	// bolts, debris and blasts: their models (as Obj3D's BoltModel, DebrisModel, BlastModel)
	this.boltModel = function(intKind_a, intSize_a, intColour_a) { m_objBolt = { kind: intKind_a, size: intSize_a, colour: intColour_a }; };
	this.debrisModel = function(intKind_a, intSize_a, intColour_a, intFall_a) { m_objDebris = { kind: intKind_a, size: intSize_a, colour: intColour_a, fall: intFall_a }; };
	this.blastModel = function(intKind_a, intColour_a) { m_objBlast = { kind: intKind_a, colour: intColour_a }; };

	// ================================================================================================
	// THE TABLE

	function freeObject(intI_a)
	{
		var objObject = m_objThis.objects[intI_a];

		objObject.cls = 0;
		if (objObject.mesh)
		{
			m_objScene.remove(objObject.mesh);
			objObject.mesh = null;
		}
	}

	this.kill = function(intI_a)
	{
		if ((intI_a >= 0) && (intI_a < m_objThis.nobj) && (m_objThis.objects[intI_a].cls !== 0))
		{
			freeObject(intI_a);
		}
	};

	this.clear = function()
	{
		var intI = 0;

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			m_objThis.kill(intI);
		}
		m_arrEvents = [];
	};

	// a new object in the first free slot (-1: none free): still, no speed, flags, mask, life or gun; its hit box
	// from its model at its size
	this.spawn = function(intKind_a, intSize_a, intClass_a, fltX_a, fltY_a, fltZ_a, intColour_a)
	{
		var intResult = -1;
		var intI = 0;
		var objObject = null;
		var objModel = m_objModels[intKind_a] || m_objModels[m_objThis.K_CUBE];
		var fltScale = Math.pow(2, intSize_a);

		for (intI = 0; (intI < m_objThis.nobj) && (intResult === -1); intI++)
		{
			if (m_objThis.objects[intI].cls === 0)
			{
				intResult = intI;
			}
		}

		if (intResult !== -1)
		{
			objObject = m_objThis.objects[intResult];
			m_intSerial++;
			objObject.serial = m_intSerial;
			objObject.kind = intKind_a;
			objObject.size = intSize_a;
			objObject.cls = intClass_a;
			objObject.mask = 0;
			objObject.x = fltX_a;
			objObject.y = fltY_a;
			objObject.z = fltZ_a;
			objObject.vx = 0;
			objObject.vy = 0;
			objObject.vz = 0;
			objObject.mover = m_objThis.MV_STILL;
			objObject.flags = 0;
			objObject.pa = 0;
			objObject.pb = 0;
			objObject.spd = 0;
			objObject.dist = 0;
			objObject.state = 0;
			objObject.timer = 0;
			objObject.life = 0;
			objObject.gun = 0;
			objObject.colour = (intColour_a !== undefined) ? intColour_a : 0xc0c0c0;
			objObject.type = 0;
			objObject.uv = 0;
			objObject.mark = 0;
			objObject.spina = 0;
			objObject.spinb = 0;
			objObject.a = 0;
			objObject.b = 0;
			objObject.hw = objModel.hw * fltScale;
			objObject.hh = objModel.hh * fltScale;
			objObject.bx = fltX_a;
			objObject.by = fltY_a;
			objObject.bz = fltZ_a;
			objObject.mesh = new THREE.Mesh(objModel.geometry, materialFor(objModel, objObject.colour, (intKind_a === m_objThis.K_BLAST)));
			objObject.mesh.scale.set(fltScale, fltScale, fltScale);
			m_objScene.add(objObject.mesh);
		}

		return intResult;
	};

	this.setVel = function(intI_a, fltVX_a, fltVY_a, fltVZ_a)
	{
		var objObject = m_objThis.objects[intI_a];

		objObject.vx = fltVX_a;
		objObject.vy = fltVY_a;
		objObject.vz = fltVZ_a;
	};

	this.setMover = function(intI_a, intMover_a, intFlags_a)
	{
		var objObject = m_objThis.objects[intI_a];

		objObject.mover = intMover_a;
		objObject.flags = intFlags_a || 0;
		objObject.state = 0;
		objObject.timer = 0;
		objObject.bx = objObject.x;
		objObject.by = objObject.y;
		objObject.bz = objObject.z;
	};

	// keep station ahead of you: dist ahead, weaving ax across and ay up, up to fast faster than you
	this.hold = function(intI_a, fltDist_a, fltAX_a, fltAY_a, fltFast_a)
	{
		var objObject = m_objThis.objects[intI_a];

		objObject.dist = fltDist_a;
		objObject.pa = fltAX_a;
		objObject.pb = fltAY_a;
		objObject.spd = fltFast_a;
	};

	this.spin = function(intI_a, intA_a, intB_a)
	{
		m_objThis.objects[intI_a].spina = intA_a;
		m_objThis.objects[intI_a].spinb = intB_a;
	};

	this.mark = function(intI_a, intColour_a)
	{
		m_objThis.objects[intI_a].mark = intColour_a;
	};

	this.move = function(intI_a, fltX_a, fltY_a, fltZ_a)
	{
		var objObject = m_objThis.objects[intI_a];

		objObject.x = fltX_a;
		objObject.y = fltY_a;
		objObject.z = fltZ_a;
		objObject.bx = fltX_a;
		objObject.by = fltY_a;
		objObject.bz = fltZ_a;
	};

	this.count = function(intClass_a)
	{
		var intResult = 0;
		var intI = 0;

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			if (m_objThis.objects[intI].cls === intClass_a)
			{
				intResult++;
			}
		}

		return intResult;
	};

	// ================================================================================================
	// THE CAMERA

	function cameraAxes()
	{
		var objCamera = m_objThis.camera;
		var fltCY = Math.cos(objCamera.yaw);
		var fltSY = Math.sin(objCamera.yaw);
		var fltCP = Math.cos(objCamera.pitch);
		var fltSP = Math.sin(objCamera.pitch);
		var fltCR = Math.cos(objCamera.roll);
		var fltSR = Math.sin(objCamera.roll);
		var objForward = { x: fltSY * fltCP, y: fltSP, z: fltCY * fltCP };
		var objRight0 = { x: fltCY, y: 0, z: -fltSY };
		var objUp0 = { x: -fltSY * fltSP, y: fltCP, z: -fltCY * fltSP };

		return {
			forward: objForward,
			right: { x: objRight0.x * fltCR + objUp0.x * fltSR, y: objRight0.y * fltCR + objUp0.y * fltSR, z: objRight0.z * fltCR + objUp0.z * fltSR },
			up: { x: objUp0.x * fltCR - objRight0.x * fltSR, y: objUp0.y * fltCR - objRight0.y * fltSR, z: objUp0.z * fltCR - objRight0.z * fltSR }
		};
	}

	this.getCameraAxes = cameraAxes;

	this.setCamera = function(fltX_a, fltY_a, fltZ_a, fltYaw_a, fltPitch_a, fltRoll_a)
	{
		var objCamera = m_objThis.camera;

		objCamera.x = fltX_a;
		objCamera.y = fltY_a;
		objCamera.z = fltZ_a;
		objCamera.yaw = fltYaw_a || 0;
		objCamera.pitch = fltPitch_a || 0;
		objCamera.roll = fltRoll_a || 0;
	};

	// where a world point is from the camera: x right, y up, z ahead
	function toView(fltX_a, fltY_a, fltZ_a)
	{
		var objAxes = cameraAxes();
		var fltDX = fltX_a - m_objThis.camera.x;
		var fltDY = fltY_a - m_objThis.camera.y;
		var fltDZ = fltZ_a - m_objThis.camera.z;

		return {
			x: fltDX * objAxes.right.x + fltDY * objAxes.right.y + fltDZ * objAxes.right.z,
			y: fltDX * objAxes.up.x + fltDY * objAxes.up.y + fltDZ * objAxes.up.z,
			z: fltDX * objAxes.forward.x + fltDY * objAxes.forward.y + fltDZ * objAxes.forward.z
		};
	}

	this.toView = toView;

	// 1 when object i is in front of the camera and inside the picture (90 degrees across, as E3)
	this.onScreen = function(intI_a)
	{
		var objObject = m_objThis.objects[intI_a];
		var objView = toView(objObject.x, objObject.y, objObject.z);
		var fltAspect = getAspect();

		return ((objObject.cls !== 0) && (objView.z > 10) && (Math.abs(objView.x) <= objView.z) && (Math.abs(objView.y) <= objView.z / fltAspect)) ? 1 : 0;
	};

	// the nearest object in front of you within rng whose class is in mask (a target): its slot, or -1
	this.pick = function(intMask_a, fltRange_a)
	{
		var intResult = -1;
		var fltBest = fltRange_a;
		var intI = 0;
		var objObject = null;
		var objView = null;

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			objObject = m_objThis.objects[intI];
			if ((objObject.cls !== 0) && ((intMask_a & (1 << objObject.cls)) !== 0))
			{
				objView = toView(objObject.x, objObject.y, objObject.z);
				if ((objView.z > 0) && (objView.z < fltBest) && (Math.abs(objView.x) < objView.z * 0.25) && (Math.abs(objView.y) < objView.z * 0.25))
				{
					fltBest = objView.z;
					intResult = intI;
				}
			}
		}

		return intResult;
	};

	// everything moved by the same amount (as Fly3D.Rebase does, to keep the numbers small)
	this.shift = function(fltDX_a, fltDY_a, fltDZ_a)
	{
		var intI = 0;
		var objObject = null;

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			objObject = m_objThis.objects[intI];
			if (objObject.cls !== 0)
			{
				objObject.x += fltDX_a; objObject.y += fltDY_a; objObject.z += fltDZ_a;
				objObject.bx += fltDX_a; objObject.by += fltDY_a; objObject.bz += fltDZ_a;
			}
		}
	};

	// ================================================================================================
	// FIRING AND BLOWING UP

	function forwardOf(objObject_a)
	{
		return { x: Math.sin(objObject_a.a) * Math.cos(objObject_a.b), y: Math.sin(objObject_a.b), z: Math.cos(objObject_a.a) * Math.cos(objObject_a.b) };
	}

	function launch(intClass_a, intMask_a, fltX_a, fltY_a, fltZ_a, fltDX_a, fltDY_a, fltDZ_a, fltSpeed_a, objCarry_a)
	{
		var fltLength = Math.max(Math.sqrt(fltDX_a * fltDX_a + fltDY_a * fltDY_a + fltDZ_a * fltDZ_a), 0.0001);
		var intBolt = m_objThis.spawn(m_objBolt.kind, m_objBolt.size, intClass_a, fltX_a, fltY_a, fltZ_a, m_objBolt.colour);
		var objBolt = null;

		if (intBolt !== -1)
		{
			objBolt = m_objThis.objects[intBolt];
			objBolt.vx = fltDX_a / fltLength * fltSpeed_a + objCarry_a.x;
			objBolt.vy = fltDY_a / fltLength * fltSpeed_a + objCarry_a.y;
			objBolt.vz = fltDZ_a / fltLength * fltSpeed_a + objCarry_a.z;
			objBolt.mask = intMask_a;
			objBolt.mover = m_objThis.MV_STRAIGHT;
			objBolt.flags = m_objThis.OF_FACEVEL;
			objBolt.life = 100;
		}

		return intBolt;
	}

	// a bolt from object i along the way it faces, sp a 50th faster than it moves: it hits you (an enemy's bolt)
	this.fire = function(intFrom_a, fltSpeed_a)
	{
		var objFrom = m_objThis.objects[intFrom_a];
		var objForward = forwardOf(objFrom);

		return launch(m_objThis.CL_EBOLT, m_objThis.M_PLAYER, objFrom.x + objForward.x * objFrom.hw, objFrom.y + objForward.y * objFrom.hw, objFrom.z + objForward.z * objFrom.hw, objForward.x, objForward.y, objForward.z, fltSpeed_a, { x: objFrom.vx, y: objFrom.vy, z: objFrom.vz });
	};

	// a bolt from object i at a point
	this.fireAt = function(intFrom_a, fltX_a, fltY_a, fltZ_a, fltSpeed_a)
	{
		var objFrom = m_objThis.objects[intFrom_a];

		return launch(m_objThis.CL_EBOLT, m_objThis.M_PLAYER, objFrom.x, objFrom.y, objFrom.z, fltX_a - objFrom.x, fltY_a - objFrom.y, fltZ_a - objFrom.z, fltSpeed_a, { x: 0, y: 0, z: 0 });
	};

	// your bolt, from the camera along its way (or at a point): it hits enemies and scenery
	this.firePlayer = function(fltSpeed_a, fltX_a, fltY_a, fltZ_a)
	{
		var objCamera = m_objThis.camera;
		var objForward = cameraAxes().forward;
		var objDirection = (fltX_a === undefined) ? objForward : { x: fltX_a - objCamera.x, y: fltY_a - objCamera.y, z: fltZ_a - objCamera.z };

		return launch(m_objThis.CL_PBOLT, m_objThis.M_ENEMY | m_objThis.M_SCENERY, objCamera.x + objForward.x * 80, objCamera.y + objForward.y * 80 - 30, objCamera.z + objForward.z * 80, objDirection.x, objDirection.y, objDirection.z, fltSpeed_a, { x: objCamera.vx, y: objCamera.vy, z: objCamera.vz });
	};

	// n pieces of debris flying from a point, with a speed of their own added
	this.burst = function(fltX_a, fltY_a, fltZ_a, intCount_a, fltVX_a, fltVY_a, fltVZ_a)
	{
		var intI = 0;
		var intPiece = 0;
		var objPiece = null;

		for (intI = 0; intI < intCount_a; intI++)
		{
			intPiece = m_objThis.spawn(m_objDebris.kind, m_objDebris.size, m_objThis.CL_DEBRIS, fltX_a, fltY_a, fltZ_a, m_objDebris.colour);
			if (intPiece !== -1)
			{
				objPiece = m_objThis.objects[intPiece];
				objPiece.vx = (fltVX_a || 0) + (Math.random() * 2 - 1) * 24;
				objPiece.vy = (fltVY_a || 0) + Math.random() * 24;
				objPiece.vz = (fltVZ_a || 0) + (Math.random() * 2 - 1) * 24;
				objPiece.mover = m_objThis.MV_FALL;
				objPiece.pa = m_objDebris.fall;
				objPiece.spina = Math.floor(Math.random() * 12) - 6;
				objPiece.spinb = Math.floor(Math.random() * 12) - 6;
				objPiece.life = 40 + Math.floor(Math.random() * 40);
			}
		}
	};

	// object i blown up: a fireball of size sc where it was, and debris
	this.boom = function(intI_a, intSize_a)
	{
		var objObject = m_objThis.objects[intI_a];
		var fltX = objObject.x;
		var fltY = objObject.y;
		var fltZ = objObject.z;
		var intBlast = 0;

		m_objThis.kill(intI_a);
		intBlast = m_objThis.spawn(m_objBlast.kind, intSize_a, m_objThis.CL_DEBRIS, fltX, fltY, fltZ, m_objBlast.colour);
		if (intBlast !== -1)
		{
			m_objThis.objects[intBlast].mover = m_objThis.MV_BLAST;
			m_objThis.objects[intBlast].life = 24;
			m_objThis.objects[intBlast].spina = 7;
			m_objThis.objects[intBlast].spinb = 5;
		}
		m_objThis.burst(fltX, fltY, fltZ, 6, 0, 0, 0);
	};

	// ================================================================================================
	// EVERY 50th

	// an event, unless the same one is already waiting (update steps several 50ths at once)
	function addEvent(intType_a, intA_a, intB_a)
	{
		var intSerialA = m_objThis.objects[intA_a].serial;
		var intSerialB = (intB_a === 255) ? 255 : ((intType_a === m_objThis.EV_HIT) ? m_objThis.objects[intB_a].serial : 0);
		var blnWaiting = false;
		var intI = 0;

		for (intI = 0; intI < m_arrEvents.length; intI++)
		{
			if ((m_arrEvents[intI].type === intType_a) && (m_arrEvents[intI].a === intA_a) && (m_arrEvents[intI].b === intB_a) && (m_arrEvents[intI].sa === intSerialA) && (m_arrEvents[intI].sb === intSerialB))
			{
				blnWaiting = true;
			}
		}
		if (!blnWaiting)
		{
			m_arrEvents.push({ type: intType_a, a: intA_a, b: intB_a, sa: intSerialA, sb: intSerialB });
		}
	}

	function steerTowards(objObject_a, fltTX_a, fltTY_a, fltTZ_a, fltSpeed_a, fltRate_a)
	{
		var fltDX = fltTX_a - objObject_a.x;
		var fltDY = fltTY_a - objObject_a.y;
		var fltDZ = fltTZ_a - objObject_a.z;
		var fltLength = Math.max(Math.sqrt(fltDX * fltDX + fltDY * fltDY + fltDZ * fltDZ), 0.0001);
		var fltRate = (fltRate_a > 0) ? Math.min(fltRate_a / 64, 1) : 1;

		objObject_a.vx += (fltDX / fltLength * fltSpeed_a - objObject_a.vx) * fltRate;
		objObject_a.vy += (fltDY / fltLength * fltSpeed_a - objObject_a.vy) * fltRate;
		objObject_a.vz += (fltDZ / fltLength * fltSpeed_a - objObject_a.vz) * fltRate;
	}

	function cameraSpeed()
	{
		var objCamera = m_objThis.camera;

		return Math.sqrt(objCamera.vx * objCamera.vx + objCamera.vy * objCamera.vy + objCamera.vz * objCamera.vz);
	}

	function moveOne(intI_a)
	{
		var objObject = m_objThis.objects[intI_a];
		var objCamera = m_objThis.camera;
		var objAxes = null;
		var fltAngle = 0;
		var fltDistance = 0;
		var objView = null;

		objObject.timer++;
		switch (objObject.mover)
		{
			case m_objThis.MV_STRAIGHT:
			case m_objThis.MV_PASS:
				objObject.x += objObject.vx; objObject.y += objObject.vy; objObject.z += objObject.vz;
				break;
			case m_objThis.MV_FALL:
				objObject.vy -= objObject.pa;
				objObject.x += objObject.vx; objObject.y += objObject.vy; objObject.z += objObject.vz;
				break;
			case m_objThis.MV_BLAST:
				if ((objObject.life > 0) && (objObject.life <= 8) && (objObject.state === 0))
				{
					objObject.state = 1;
					objObject.mesh.scale.multiplyScalar(2);
				}
				break;
			case m_objThis.MV_HOLD:
			case m_objThis.MV_HOLDONLY:
				objAxes = cameraAxes();
				fltAngle = objObject.timer * 0.04;
				steerTowards(objObject,
					objCamera.x + objAxes.forward.x * objObject.dist + objAxes.right.x * objObject.pa * Math.sin(fltAngle) + objAxes.up.x * objObject.pb * Math.cos(fltAngle * 0.7),
					objCamera.y + objAxes.forward.y * objObject.dist + objAxes.right.y * objObject.pa * Math.sin(fltAngle) + objAxes.up.y * objObject.pb * Math.cos(fltAngle * 0.7),
					objCamera.z + objAxes.forward.z * objObject.dist + objAxes.right.z * objObject.pa * Math.sin(fltAngle) + objAxes.up.z * objObject.pb * Math.cos(fltAngle * 0.7),
					cameraSpeed() + objObject.spd, 16);
				objObject.x += objObject.vx; objObject.y += objObject.vy; objObject.z += objObject.vz;
				break;
			case m_objThis.MV_CHARGE:
				steerTowards(objObject, objCamera.x, objCamera.y, objCamera.z, cameraSpeed() + objObject.spd, 0);
				objObject.x += objObject.vx; objObject.y += objObject.vy; objObject.z += objObject.vz;
				fltDistance = Math.sqrt(Math.pow(objObject.x - objCamera.x, 2) + Math.pow(objObject.y - objCamera.y, 2) + Math.pow(objObject.z - objCamera.z, 2));
				if (fltDistance < 2500)
				{
					objObject.mover = m_objThis.MV_PASS;
				}
				break;
			case m_objThis.MV_TURN:
			case m_objThis.MV_HUNT:
			case m_objThis.MV_HOME:
				steerTowards(objObject, objCamera.x, objCamera.y, objCamera.z, cameraSpeed() + objObject.spd, (objObject.mover === m_objThis.MV_HOME) ? objObject.pa : 8);
				objObject.x += objObject.vx; objObject.y += objObject.vy; objObject.z += objObject.vz;
				if (objObject.mover === m_objThis.MV_HUNT)
				{
					objObject.y = objObject.by;
				}
				break;
			case m_objThis.MV_WEAVE:
				objObject.bx += objObject.vx; objObject.by += objObject.vy; objObject.bz += objObject.vz;
				objObject.x = objObject.bx + objObject.pa * Math.sin(objObject.timer * 0.06);
				objObject.y = objObject.by + objObject.pb * Math.sin(objObject.timer * 0.045);
				objObject.z = objObject.bz;
				break;
			case m_objThis.MV_ORBIT:
				fltAngle = objObject.timer * objObject.spd * m_TURN / 50;
				objObject.x = objObject.pa + Math.sin(fltAngle) * objObject.dist;
				objObject.z = objObject.pb + Math.cos(fltAngle) * objObject.dist;
				break;
			case m_objThis.MV_CIRCLE:
				fltAngle = objObject.timer * objObject.spd * m_TURN / 50;
				objObject.x = objCamera.x + Math.sin(fltAngle) * objObject.dist;
				objObject.z = objCamera.z + Math.cos(fltAngle) * objObject.dist;
				break;
			default:
				break;
		}

		objObject.a += objObject.spina * m_TURN;
		objObject.b += objObject.spinb * m_TURN;

		if ((objObject.flags & m_objThis.OF_FACECAM) !== 0)
		{
			objObject.a = Math.atan2(objCamera.x - objObject.x, objCamera.z - objObject.z);
			objObject.b = Math.atan2(objCamera.y - objObject.y, Math.sqrt(Math.pow(objCamera.x - objObject.x, 2) + Math.pow(objCamera.z - objObject.z, 2)));
		}
		else if (((objObject.flags & m_objThis.OF_FACEVEL) !== 0) && ((objObject.vx !== 0) || (objObject.vz !== 0) || (objObject.vy !== 0)))
		{
			objObject.a = Math.atan2(objObject.vx, objObject.vz);
			objObject.b = Math.atan2(objObject.vy, Math.sqrt(objObject.vx * objObject.vx + objObject.vz * objObject.vz));
		}

		if (((objObject.flags & m_objThis.OF_LAND) !== 0) && (objObject.y <= m_objThis.ground) && (objObject.state !== 2))
		{
			objObject.y = m_objThis.ground;
			objObject.vx = 0; objObject.vy = 0; objObject.vz = 0;
			objObject.mover = m_objThis.MV_STILL;
			objObject.state = 2;
			addEvent(m_objThis.EV_LAND, intI_a, 0);
		}

		objView = toView(objObject.x, objObject.y, objObject.z);
		if (((objObject.flags & m_objThis.OF_BEHIND) !== 0) && (objObject.z < objCamera.z - 2500))
		{
			freeObject(intI_a);
		}
		else if ((objObject.mover === m_objThis.MV_PASS) && (objView.z < -3000))
		{
			freeObject(intI_a);
		}
		else if (((objObject.flags & m_objThis.OF_WRAP) !== 0) && (Math.abs(objView.z) > 14000))
		{
			objAxes = cameraAxes();
			m_objThis.move(intI_a, objCamera.x + objAxes.forward.x * 9000 + objObject.pa, objCamera.y + objAxes.forward.y * 9000 + objObject.pb, objCamera.z + objAxes.forward.z * 9000);
		}
	}

	function gunReady(intI_a)
	{
		var objObject = m_objThis.objects[intI_a];
		var objCamera = m_objThis.camera;
		var fltDX = objCamera.x - objObject.x;
		var fltDY = objCamera.y - objObject.y;
		var fltDZ = objCamera.z - objObject.z;
		var fltDistance = Math.sqrt(fltDX * fltDX + fltDY * fltDY + fltDZ * fltDZ);
		var objForward = forwardOf(objObject);
		var blnResult = false;

		if ((objObject.flags & m_objThis.OF_GUNANY) !== 0)
		{
			blnResult = (fltDistance <= 8500);
		}
		else if ((fltDistance >= 700) && (fltDistance <= 8500))
		{
			blnResult = ((objForward.x * fltDX + objForward.y * fltDY + objForward.z * fltDZ) / fltDistance > 0.85);
		}

		return blnResult;
	}

	function overlap(objA_a, objB_a)
	{
		return ((Math.abs(objA_a.x - objB_a.x) < objA_a.hw + objB_a.hw) && (Math.abs(objA_a.z - objB_a.z) < objA_a.hw + objB_a.hw) && (Math.abs(objA_a.y - objB_a.y) < objA_a.hh + objB_a.hh));
	}

	function findHits()
	{
		var intI = 0;
		var intJ = 0;
		var objA = null;
		var objB = null;
		var objCamera = { x: m_objThis.camera.x, y: m_objThis.camera.y, z: m_objThis.camera.z, hw: m_INTCAMHIT, hh: m_INTCAMHIT };

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			objA = m_objThis.objects[intI];
			if ((objA.cls !== 0) && (objA.mask !== 0))
			{
				if (((objA.mask & m_objThis.M_PLAYER) !== 0) && overlap(objA, objCamera))
				{
					addEvent(m_objThis.EV_HIT, intI, 255);
				}
				for (intJ = 0; intJ < m_objThis.nobj; intJ++)
				{
					objB = m_objThis.objects[intJ];
					if ((intJ !== intI) && (objB.cls !== 0) && (objA.cls !== 0) && ((objA.mask & (1 << objB.cls)) !== 0) && overlap(objA, objB))
					{
						addEvent(m_objThis.EV_HIT, intI, intJ);
					}
				}
			}
		}
	}

	// dt 50ths gone: everything moved, lives counted down (out at 0), guns readied (EV_FIRE), hits found (EV_HIT)
	this.update = function(intDt_a)
	{
		var intSteps = Math.min(Math.max(Math.round(intDt_a), 0), 10);
		var intStep = 0;
		var intI = 0;
		var objObject = null;

		for (intStep = 0; intStep < intSteps; intStep++)
		{
			m_intFrame++;
			for (intI = 0; intI < m_objThis.nobj; intI++)
			{
				objObject = m_objThis.objects[intI];
				if (objObject.cls !== 0)
				{
					moveOne(intI);
				}
				if (objObject.cls !== 0)
				{
					if (objObject.life > 0)
					{
						objObject.life--;
						if (objObject.life === 0)
						{
							freeObject(intI);
						}
					}
				}
				if ((objObject.cls !== 0) && (objObject.gun > 0))
				{
					objObject.gun--;
					if ((objObject.gun === 0) && gunReady(intI))
					{
						objObject.gun = -1;
						addEvent(m_objThis.EV_FIRE, intI, 0);
					}
					else if (objObject.gun === 0)
					{
						objObject.gun = 1;
					}
				}
			}
			findHits();
		}
	};

	// the next thing that happened: EV_FIRE, EV_HIT or EV_LAND (its objects in ea, eb), or 0 for none. Events
	// about an object taken out (or its slot since reused) are dropped, so booming one never confuses the next
	this.nextEvent = function()
	{
		var intResult = 0;
		var objEvent = null;
		var blnStale = false;

		while ((intResult === 0) && (m_arrEvents.length > 0))
		{
			objEvent = m_arrEvents.shift();
			blnStale = (m_objThis.objects[objEvent.a].cls === 0) || (m_objThis.objects[objEvent.a].serial !== objEvent.sa);
			if ((objEvent.type === m_objThis.EV_HIT) && (objEvent.b !== 255))
			{
				blnStale = blnStale || (m_objThis.objects[objEvent.b].cls === 0) || (m_objThis.objects[objEvent.b].serial !== objEvent.sb);
			}
			if (!blnStale)
			{
				m_objThis.ea = objEvent.a;
				m_objThis.eb = objEvent.b;
				intResult = objEvent.type;
			}
		}

		return intResult;
	};

	// ================================================================================================
	// DRAWING

	function getAspect()
	{
		var objContainer = m_objOptions.container;
		var intWidth = (objContainer && objContainer.clientWidth) ? objContainer.clientWidth : 320;
		var intHeight = (objContainer && objContainer.clientHeight) ? objContainer.clientHeight : 240;

		return intWidth / intHeight;
	}

	function fitView()
	{
		var objContainer = m_objOptions.container;
		var intWidth = (objContainer && objContainer.clientWidth) ? objContainer.clientWidth : 320;
		var intHeight = (objContainer && objContainer.clientHeight) ? objContainer.clientHeight : 240;

		// 90 degrees across, as E3
		m_objCamera3.aspect = intWidth / intHeight;
		m_objCamera3.fov = 2 * Math.atan(1 / m_objCamera3.aspect) * 180 / Math.PI;
		m_objCamera3.updateProjectionMatrix();
		if (m_objRenderer)
		{
			m_objRenderer.setSize(intWidth, intHeight, false);
		}
	}

	this.resize = fitView;

	// the picture: everything placed and turned as the table says, seen from the camera
	this.draw = function()
	{
		var intI = 0;
		var objObject = null;
		var objAxes = cameraAxes();
		var objCamera = m_objThis.camera;

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			objObject = m_objThis.objects[intI];
			if ((objObject.cls !== 0) && objObject.mesh)
			{
				objObject.mesh.position.set(objObject.x, objObject.y, objObject.z);
				objObject.mesh.rotation.set(-objObject.b, objObject.a, 0, 'YXZ');
			}
		}

		m_objCamera3.position.set(objCamera.x, objCamera.y, objCamera.z);
		m_objCamera3.up.set(objAxes.up.x, objAxes.up.y, objAxes.up.z);
		m_objCamera3.lookAt(objCamera.x + objAxes.forward.x * 1000, objCamera.y + objAxes.forward.y * 1000, objCamera.z + objAxes.forward.z * 1000);
		if (m_objRenderer)
		{
			m_objRenderer.render(m_objScene, m_objCamera3);
		}
	};

	// a loop: each frame fnFrame(dt) (50ths gone), then update(dt) and draw()
	this.run = function(fnFrame_a)
	{
		m_fnFrame = fnFrame_a;
		m_fltLastTime = 0;

		function frame(fltTime_a)
		{
			var intDt = (m_fltLastTime === 0) ? 1 : Math.round((fltTime_a - m_fltLastTime) * 50 / 1000);

			m_fltLastTime = fltTime_a;
			if (m_fnFrame)
			{
				m_fnFrame(intDt);
				m_objThis.update(intDt);
				m_objThis.draw();
				m_intAnimation = window.requestAnimationFrame(frame);
			}
		}

		m_intAnimation = window.requestAnimationFrame(frame);
	};

	this.stop = function()
	{
		m_fnFrame = null;
		if (m_intAnimation)
		{
			window.cancelAnimationFrame(m_intAnimation);
			m_intAnimation = 0;
		}
	};

	// three.js itself, for anything more (fog, a sky, extra lights)
	this.getScene = function() { return m_objScene; };
	this.getThreeCamera = function() { return m_objCamera3; };
	this.getRenderer = function() { return m_objRenderer; };

	// everything let go: the loop, the picture, the models and materials, the listeners
	this.destroy = function()
	{
		var strKey = '';

		m_objThis.stop();
		m_objThis.clear();
		if (m_fnResize)
		{
			window.removeEventListener('resize', m_fnResize);
		}
		if (m_objResizeObserver)
		{
			m_objResizeObserver.disconnect();
		}
		for (strKey in m_objModels)
		{
			if (m_objModels.hasOwnProperty(strKey))
			{
				m_objModels[strKey].geometry.dispose();
			}
		}
		for (strKey in m_objMaterials)
		{
			if (m_objMaterials.hasOwnProperty(strKey))
			{
				m_objMaterials[strKey].dispose();
			}
		}
		if (m_objRenderer)
		{
			m_objRenderer.dispose();
			if (m_objRenderer.domElement && m_objRenderer.domElement.parentNode)
			{
				m_objRenderer.domElement.parentNode.removeChild(m_objRenderer.domElement);
			}
		}
	};

	// ================================================================================================
	// SETUP

	function initialise()
	{
		var intI = 0;
		var objSun = m_objOptions.sun || { x: 0.4, y: 0.8, z: -0.45 };

		for (intI = 0; intI < m_objThis.nobj; intI++)
		{
			m_objThis.objects.push({ cls: 0, mesh: null });
		}

		m_objScene = new THREE.Scene();
		m_objScene.background = new THREE.Color((m_objOptions.background !== undefined) ? m_objOptions.background : 0x000010);
		m_objScene.add(new THREE.AmbientLight(0xffffff, 0.35));
		m_objSun = new THREE.DirectionalLight(0xffffff, 0.85);
		m_objSun.position.set(objSun.x, objSun.y, objSun.z);
		m_objScene.add(m_objSun);
		m_objCamera3 = new THREE.PerspectiveCamera(60, 4 / 3, 10, m_objOptions.far || 60000);

		if (m_objOptions.container && (m_objOptions.renderer !== false))
		{
			m_objRenderer = (m_objOptions.renderer && (m_objOptions.renderer !== true)) ? m_objOptions.renderer : new THREE.WebGLRenderer({ antialias: true });
			if (m_objRenderer.setPixelRatio)
			{
				m_objRenderer.setPixelRatio(window.devicePixelRatio || 1);
			}
			if (m_objRenderer.domElement)
			{
				m_objRenderer.domElement.style.width = '100%';
				m_objRenderer.domElement.style.height = '100%';
				m_objRenderer.domElement.style.display = 'block';
				m_objOptions.container.appendChild(m_objRenderer.domElement);
			}
			m_fnResize = fitView;
			window.addEventListener('resize', m_fnResize);
			if (typeof window.ResizeObserver === 'function')
			{
				m_objResizeObserver = new window.ResizeObserver(fitView);
				m_objResizeObserver.observe(m_objOptions.container);
			}
		}

		addBuiltInModels();
		fitView();
	}

	initialise();
}
