// JPad - on-screen controls for phones and tablets: a direction pad, buttons and touch zones that
// press keys. A touched control sets its key in the game loop's key map exactly as the keyboard
// does, so a game only ever reads keys and plays the same with either.
//
// Put the controls where the game isn't: a 320 x 256 game in a 448 x 256 canvas leaves 64 pixels
// each side - a landscape phone's spare width. They're drawn only once a touch has been seen (a
// PC with a mouse never shows them), unless showalways is set.
//
//   var objPad = new JPad({ controls:[
//       { type:'dpad', x:32, y:200, size:28, keys:{ left:KEY_LEFT, right:KEY_RIGHT, up:KEY_UP, down:KEY_DOWN } },
//       { type:'button', x:416, y:200, size:22, key:32, label:'DROP' },
//       { type:'zone', x:64, y:0, w:320, h:256, key:32 } ] });   <- a zone isn't drawn
//   each iteration:  objPad.update(arrKeyMap_a, objTouches, objMouse);
//   each frame:      objPad.paint(objContext);
//   reading a key:   objPad.isDown(arrKeyMap_a, KEY_LEFT, objViewPort)  (arrows turned with the screen)
//   game pads:       gamepads:[{ index:0, keys:{ left:37, right:39, up:38, down:40, fire:32, fire2:77 } }]
//                    in the options: pad 0's stick / d-pad and buttons A, B press those keys, and
//                    X, Y too if fire3, fire4 are given (the browser's Gamepad API, polled each
//                    update; a key left out isn't pressed)
//   pointing games:  objPad.taps() - the places touched or clicked this iteration, off the controls
//                    ([{x, y}], logical canvas coordinates): a card or a menu line picked by a finger
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JPad(objOptions_a)
{
	var m_objThis = this;
	var m_objOptions = objOptions_a;
	var m_arrPressed = [];			// the keys the pad is holding down now
	var m_blnSeenTouch = false;
	var m_arrTaps = [];				// new touches or clicks this iteration that missed every control
	var m_arrDownIDs = [];			// the touches held at the last update
	var m_blnMouseWas = false;		// the mouse button held at the last update

	if (m_objOptions.controls === undefined) { m_objOptions.controls = []; }
	if (m_objOptions.showalways === undefined) { m_objOptions.showalways = false; }
	if (m_objOptions.colour === undefined) { m_objOptions.colour = 'rgba(255,255,255,0.35)'; }
	if (m_objOptions.pressedcolour === undefined) { m_objOptions.pressedcolour = 'rgba(255,255,0,0.6)'; }
	if (m_objOptions.font === undefined) { m_objOptions.font = 'bold 9px sans-serif'; }

	// is a game pad's button n pressed?
	function padButton(objGP_a, intN_a)
	{
		return (intN_a < objGP_a.buttons.length) && objGP_a.buttons[intN_a].pressed;
	}

	// is a point on a control (the middle of the direction pad too)?
	function isOn(objControl_a, intX_a, intY_a)
	{
		var intDX = intX_a - objControl_a.x;
		var intDY = intY_a - objControl_a.y;
		var blnResult = false;

		if (objControl_a.type === 'zone')
		{
			blnResult = (intDX >= 0) && (intDX < objControl_a.w) && (intDY >= 0) && (intDY < objControl_a.h);
		}
		else
		{
			blnResult = (intDX * intDX + intDY * intDY) <= (objControl_a.size * objControl_a.size * 1.44);
		}

		return blnResult;
	}

	// the keys a control presses for a point on it ([] if the point isn't on it)
	function keysAt(objControl_a, intX_a, intY_a)
	{
		var arrResult = [];
		var intDX = intX_a - objControl_a.x;
		var intDY = intY_a - objControl_a.y;

		if (objControl_a.type === 'zone')
		{
			if ((intDX >= 0) && (intDX < objControl_a.w) && (intDY >= 0) && (intDY < objControl_a.h))
			{
				arrResult.push(objControl_a.key);
			}
		}
		else if ((intDX * intDX + intDY * intDY) <= (objControl_a.size * objControl_a.size * 1.44))
		{
			if (objControl_a.type === 'button')
			{
				arrResult.push(objControl_a.key);
			}
			else
			{
				// the direction pad: a third of its size off the middle presses that way (diagonals too)
				var intDead = objControl_a.size / 3;
				if (intDX < -intDead) { arrResult.push(objControl_a.keys.left); }
				if (intDX > intDead) { arrResult.push(objControl_a.keys.right); }
				if (intDY < -intDead) { arrResult.push(objControl_a.keys.up); }
				if (intDY > intDead) { arrResult.push(objControl_a.keys.down); }
			}
		}

		return arrResult;
	}

	// the controls in place of the old ones (a game with screens that want different controls)
	this.setControls = function(arrControls_a)
	{
		m_objOptions.controls = arrControls_a;
	};

	// once an iteration: what's touched now presses its keys; what the pad pressed before and
	// nothing touches now is let go
	this.update = function(arrKeyMap_a, arrTouches_a, objMouse_a)
	{
		var arrNow = [];
		var arrPoints = [];
		var arrNew = [];
		var arrIDs = [];
		var blnMouse = false;

		processArray(arrTouches_a, function(objTouch_a)
		{
			if ((objTouch_a.x >= 0) && (objTouch_a.y >= 0))
			{
				arrPoints.push(objTouch_a);
				arrIDs.push(objTouch_a.id);
				if (m_arrDownIDs.indexOf(objTouch_a.id) < 0) { arrNew.push(objTouch_a); }
				m_blnSeenTouch = true;
			}
		});
		if ((objMouse_a !== undefined) && (objMouse_a !== null) && (objMouse_a.buttons[0] === 0) && (objMouse_a.x >= 0))
		{
			arrPoints.push(objMouse_a);
			blnMouse = true;
			if (!m_blnMouseWas) { arrNew.push(objMouse_a); }
		}
		// the game pads
		if ((m_objOptions.gamepads !== undefined) && (navigator.getGamepads !== undefined))
		{
			var arrPads = navigator.getGamepads();
			processArray(m_objOptions.gamepads, function(objConfig_a)
			{
				var objGP = (arrPads !== null) ? arrPads[objConfig_a.index] : null;
				if ((objGP !== undefined) && (objGP !== null))
				{
					var arrPadKeys = [];
					var fltX = (objGP.axes.length > 0) ? objGP.axes[0] : 0;
					var fltY = (objGP.axes.length > 1) ? objGP.axes[1] : 0;
					if ((fltX < -0.5) || padButton(objGP, 14)) { arrPadKeys.push(objConfig_a.keys.left); }
					if ((fltX > 0.5) || padButton(objGP, 15)) { arrPadKeys.push(objConfig_a.keys.right); }
					if ((fltY < -0.5) || padButton(objGP, 12)) { arrPadKeys.push(objConfig_a.keys.up); }
					if ((fltY > 0.5) || padButton(objGP, 13)) { arrPadKeys.push(objConfig_a.keys.down); }
					if (padButton(objGP, 0)) { arrPadKeys.push(objConfig_a.keys.fire); }
					if (padButton(objGP, 1)) { arrPadKeys.push(objConfig_a.keys.fire2); }
					if ((objConfig_a.keys.fire3 !== undefined) && padButton(objGP, 2)) { arrPadKeys.push(objConfig_a.keys.fire3); }
					if ((objConfig_a.keys.fire4 !== undefined) && padButton(objGP, 3)) { arrPadKeys.push(objConfig_a.keys.fire4); }
					processArray(arrPadKeys, function(intKey_a)
					{
						if ((intKey_a !== undefined) && (arrNow.indexOf(intKey_a) < 0)) { arrNow.push(intKey_a); }
					});
				}
			});
		}
		m_arrDownIDs = arrIDs;
		m_blnMouseWas = blnMouse;

		// the new presses that missed every control are taps
		m_arrTaps = [];
		processArray(arrNew, function(objPoint_a)
		{
			var blnOnControl = false;
			processArray(m_objOptions.controls, function(objControl_a)
			{
				if (isOn(objControl_a, objPoint_a.x, objPoint_a.y)) { blnOnControl = true; }
			});
			if (!blnOnControl) { m_arrTaps.push({ x:objPoint_a.x, y:objPoint_a.y }); }
		});

		processArray(arrPoints, function(objPoint_a)
		{
			processArray(m_objOptions.controls, function(objControl_a)
			{
				processArray(keysAt(objControl_a, objPoint_a.x, objPoint_a.y), function(intKey_a)
				{
					if (arrNow.indexOf(intKey_a) < 0) { arrNow.push(intKey_a); }
				});
			});
		});

		processArray(m_arrPressed, function(intKey_a)
		{
			if (arrNow.indexOf(intKey_a) < 0) { arrKeyMap_a[intKey_a] = -1; }
		});
		processArray(arrNow, function(intKey_a)
		{
			arrKeyMap_a[intKey_a] = 0;
		});
		m_arrPressed = arrNow;
	};

	// is a key down (the keyboard's or the pad's)? The arrow keys are turned with the screen when
	// it's rotated (a keyboard on a turned screen), as the demos' inkey does
	this.isDown = function(arrKeyMap_a, intKey_a, objViewPort_a)
	{
		var intKey = intKey_a;
		var blnResult = (arrKeyMap_a[intKey] === 0);

		if ((!blnResult) && (objViewPort_a !== undefined) && (objViewPort_a !== null) && objViewPort_a.isrotated && (m_arrPressed.indexOf(intKey_a) < 0))
		{
			if (intKey == DEF_KEY_LEFT) { intKey = ROTATED_KEY_LEFT; }
			else if (intKey == DEF_KEY_RIGHT) { intKey = ROTATED_KEY_RIGHT; }
			else if (intKey == DEF_KEY_UP) { intKey = ROTATED_KEY_UP; }
			else if (intKey == DEF_KEY_DOWN) { intKey = ROTATED_KEY_DOWN; }
			blnResult = (intKey !== intKey_a) && (arrKeyMap_a[intKey] === 0);
		}

		return blnResult;
	};

	// the places touched or clicked this iteration that weren't on a control ([{x, y}])
	this.taps = function()
	{
		return m_arrTaps;
	};

	// has anything been touched yet (a touch screen)?
	this.isTouch = function()
	{
		return m_blnSeenTouch;
	};

	// once a frame: the controls (once a touch has been seen)
	this.paint = function(objContext_a)
	{
		if (m_objOptions.showalways || m_blnSeenTouch)
		{
			objContext_a.save();
			objContext_a.font = m_objOptions.font;
			objContext_a.textAlign = 'center';
			objContext_a.textBaseline = 'middle';
			objContext_a.lineWidth = 2;
			processArray(m_objOptions.controls, function(objControl_a)
			{
				if (objControl_a.type === 'button')
				{
					var blnDown = (m_arrPressed.indexOf(objControl_a.key) >= 0);
					objContext_a.strokeStyle = blnDown ? m_objOptions.pressedcolour : m_objOptions.colour;
					objContext_a.fillStyle = objContext_a.strokeStyle;
					objContext_a.beginPath();
					objContext_a.arc(objControl_a.x, objControl_a.y, objControl_a.size, 0, Math.PI * 2);
					objContext_a.stroke();
					if (objControl_a.label !== undefined)
					{
						objContext_a.fillText(objControl_a.label, objControl_a.x, objControl_a.y);
					}
				}
				else if (objControl_a.type === 'dpad')
				{
					var intS = objControl_a.size;
					var arrWays = [ ['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1] ];
					objContext_a.strokeStyle = m_objOptions.colour;
					objContext_a.beginPath();
					objContext_a.arc(objControl_a.x, objControl_a.y, intS, 0, Math.PI * 2);
					objContext_a.stroke();
					processArray(arrWays, function(arrWay_a)
					{
						var blnWayDown = (m_arrPressed.indexOf(objControl_a.keys[arrWay_a[0]]) >= 0);
						var intX = objControl_a.x + arrWay_a[1] * intS * 0.6;
						var intY = objControl_a.y + arrWay_a[2] * intS * 0.6;
						objContext_a.fillStyle = blnWayDown ? m_objOptions.pressedcolour : m_objOptions.colour;
						objContext_a.beginPath();
						objContext_a.moveTo(intX + arrWay_a[1] * intS * 0.3, intY + arrWay_a[2] * intS * 0.3);
						objContext_a.lineTo(intX - arrWay_a[2] * intS * 0.25, intY - arrWay_a[1] * intS * 0.25);
						objContext_a.lineTo(intX + arrWay_a[2] * intS * 0.25, intY + arrWay_a[1] * intS * 0.25);
						objContext_a.closePath();
						objContext_a.fill();
					});
				}
			});
			objContext_a.restore();
		}
	};
}
