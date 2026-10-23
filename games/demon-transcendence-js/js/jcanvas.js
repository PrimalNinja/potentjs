// TODO:
//
//		The ability to define regions
//		The ability to autoclear specified regions
//		
function JCanvas()
{
	var DEF_FRAMESPERSECOND = 60;	// frames per second
	var DEF_MAXTOUCHES = 6;			// maximum touches
	var DEF_XRESOLUTION = 320;		// 1920
	var DEF_YRESOLUTION = 200;		// 1080
	var DEF_XSCALE = 1;				// 1 is square pixels, 2 for double width, 0.5 for double height
	var DEF_YSCALE = 1;

	var m_blnEnableMouse = true;
	var m_blnEnableTouch = true;
	var m_blnInitialised = false;
	var m_intFPS = 0;				// resets when viewport resizes
	var m_intFPSCounter = 0;		// resets when viewport resizes
	var m_intFPSTimer = 0;			// resets when viewport resizes
	var m_fltScale = 1;
	var m_objBody = document.getElementsByTagName("BODY")[0];
	var m_objCanvas;
	var m_objCanvasContext;
	var m_objBuffer = null;			// buffered: the frame drawn here at the logical resolution (1:1), then scaled onto the canvas in one go
	var m_objBufferContext = null;
	var m_objMouse = {
		buttons: [-1, -1, -1],
		rawX:-1, rawY:-1, x:-1, y:-1
	};
	var m_objOptions;
	var m_objTimer;
	var m_objTouches = [];
	var m_objViewPort; // = getViewPort();
	// the screen mode (option screenmode): 'normal' shows the game's resolution as it is;
	// 'fullscreen' widens (or heightens) it to the screen's shape, half the extra on each side;
	// 'ask' shows a choice of the two first. m_objView is what's shown, in the game's coordinates
	var m_strScreenMode = 'normal';
	var m_objView = { x:0, y:0, w:DEF_XRESOLUTION, h:DEF_YRESOLUTION };
	var m_intAskPick = 0;			// asking: 0 NORMAL, 1 FULLSCREEN
	var m_blnAskPressed = false;	// asking: a click or touch is held on a choice
	var m_blnAskPadWas = true;		// asking: a game pad button or way was held last frame (wait for it to be let go)

	function getViewPort()
	{
		var intHeight = 0;
		var intWidth = 0;
		var objPerspective = window;
		var strPrefix = 'inner';

		if(m_objOptions.parentWindow !== undefined)
		{
			objPerspective = m_objOptions.parentWindow;
			strPrefix = 'client';
			intHeight = objPerspective[strPrefix + 'Height'];
			intWidth = objPerspective[strPrefix + 'Width'];
		}
		else
		{
			if (!('innerWidth' in window))
			{
				strPrefix = 'client';
				objPerspective = document.documentElement || document.body;
			}

			intHeight = objPerspective[strPrefix + 'Height'];
			intWidth = objPerspective[strPrefix + 'Width'];
		}

		var blnRotated = false;
		if (m_objOptions.autorotate)
		{
			blnRotated = window.innerHeight > window.innerWidth;
		}
		
		var objResult = 
		{
			width : intWidth,
			height : intHeight,
			isrotated: blnRotated
		};
		
		return objResult;
	}
	
	function initialise()
	{
		if (!m_blnInitialised)
		{
			// initialise the touches
			for (var intI = 0; intI < m_objOptions.maxtouches; intI++) 
			{
				m_objTouches.push({ id:-1, rawX:-1, rawY:-1, x:-1, y:-1 });
			}
			
			m_objCanvas = document.getElementById(m_objOptions.target);
			m_objCanvasContext = m_objCanvas.getContext('2d');
			
			window.onload = function()
			{
				window.addEventListener('resize', resizeViewPort, false);
			};

			if (m_objOptions.usesetinterval)
			{
				m_objTimer = setInterval(function()
				{ 
					renderFrame();
				}, 1000 / m_objOptions.framespersecond);
			}
			else
			{
				var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
				function animateFrame() 
				{
					renderFrame();
					m_objTimer = requestAnimationFrame(animateFrame);
				}
				m_objTimer = requestAnimationFrame(animateFrame);		
			}
			
			// prevent right click menu
			window.oncontextmenu = function() 
			{
					return false;
			};
			
			// mouse detection

			if(m_blnEnableMouse)
			{
				m_objCanvas.addEventListener('mousedown', function(objEvent_a) 
				{
					if ((objEvent_a.button >= 0) && (objEvent_a.button <= 2))
					{
						m_objMouse.buttons[objEvent_a.button] = 0;
					}
				}, false);
				
				m_objCanvas.addEventListener('mouseup', function(objEvent_a) 
				{
					if ((objEvent_a.button >= 0) && (objEvent_a.button <= 2))
					{
						m_objMouse.buttons[objEvent_a.button] = -1;
					}
				}, false);
				
				m_objCanvas.addEventListener('mousemove', function(objEvent_a) 
				{
					var objRect = m_objCanvas.getBoundingClientRect();
					
					m_objMouse.rawX = Math.round((objEvent_a.clientX - objRect.left) / (objRect.right - objRect.left) * m_objCanvas.width);
					m_objMouse.rawY = Math.round((objEvent_a.clientY - objRect.top) / (objRect.bottom - objRect.top) * m_objCanvas.height);
					
				}, false);

				
				m_objCanvas.addEventListener('mouseout', function(objEvent_a) 
				{
					m_objMouse.rawX = -1;
					m_objMouse.rawY = -1;
					m_objMouse.x = -1;
					m_objMouse.y = -1;
					
				}, false);
			}
			
			// touch detection (refer to here: http://www.javascriptkit.com/javatutors/touchevents.shtml)
			function getNewTouch()
			{
				var intResult = -1;
				
				for (var intI = 0; intI < m_objOptions.maxtouches; intI++)
				{
					if (m_objTouches[intI].id == -1)
					{
						intResult = intI;
						break;
					}
				}
				
				return intResult;
			}

			function findTouch(intID_a)
			{
				var intResult = -1;
				
				for (var intI = 0; intI < m_objOptions.maxtouches; intI++)
				{
					if (m_objTouches[intI].id == intID_a)
					{
						intResult = intI;
						break;
					}
				}
				
				return intResult;
			}
			
			function onTouch(objEvent_a)
			{
				var objRect = m_objCanvas.getBoundingClientRect();
				var intTouches = objEvent_a.changedTouches.length;

				for (var intI = 0; ((intI < intTouches) && (intI < m_objOptions.maxtouches)); intI++)
				{
					// process each touch
					var objTouch = objEvent_a.changedTouches[intI];
					var intTouch = findTouch(objTouch.identifier);

					if (intTouch === -1)
					{
						intTouch = getNewTouch();
					}
					
					if (intTouch >= 0)
					{
						m_objTouches[intTouch].id = objTouch.identifier;
						m_objTouches[intTouch].rawX = Math.round((objTouch.clientX - objRect.left) / (objRect.right - objRect.left) * m_objCanvas.width);
						m_objTouches[intTouch].rawY = Math.round((objTouch.clientY - objRect.top) / (objRect.bottom - objRect.top) * m_objCanvas.height);
					}
				}
		
				objEvent_a.preventDefault();
			}
			
			function onEndTouch(objEvent_a)
			{
				var objRect = m_objCanvas.getBoundingClientRect();
				var intTouches = objEvent_a.changedTouches.length;

				for (var intI = 0; ((intI < intTouches) && (intI < m_objOptions.maxtouches)); intI++)
				{
					// process each touch
					var objTouch = objEvent_a.changedTouches[intI];
					var intTouch = findTouch(objTouch.identifier);

					if (intTouch >= 0)
					{
						m_objTouches[intTouch].id = -1;
						m_objTouches[intTouch].rawX = -1;
						m_objTouches[intTouch].rawY = -1;
						m_objTouches[intTouch].x = -1;
						m_objTouches[intTouch].y = -1;
					}
				}

				objEvent_a.preventDefault();
			}

			if(m_blnEnableTouch)
			{
				m_objCanvas.addEventListener('touchstart', function(objEvent_a)
				{
					onTouch(objEvent_a);
					
				}, false);
				
				m_objCanvas.addEventListener('touchmove', function(objEvent_a)
				{
					onTouch(objEvent_a);
					
				}, false);
				
				m_objCanvas.addEventListener('touchend', function(objEvent_a)
				{
					onEndTouch(objEvent_a);
				
				}, false);
				
				m_objCanvas.addEventListener('touchcancel', function(objEvent_a)
				{
					onEndTouch(objEvent_a);
				
				}, false);
			}

		}
		
		m_blnInitialised = true;
	}

	// what's shown: the game's resolution at its origin, or (full screen) that widened or heightened
	// to the screen's shape - the extra split half to each side, the game's area in the middle
	function computeView()
	{
		var intW = m_objOptions.xresolution;
		var intH = m_objOptions.yresolution;
		var intScreenW = m_objViewPort.width;
		var intScreenH = m_objViewPort.height;
		var intExtra = 0;

		m_objView = { x:m_objOptions.xorigin, y:m_objOptions.yorigin, w:intW, h:intH };
		if ((m_strScreenMode === 'fullscreen') && (intScreenW > 0) && (intScreenH > 0))
		{
			// (turned: the screen's height runs along the game's width)
			if (m_objViewPort.isrotated)
			{
				intScreenW = m_objViewPort.height;
				intScreenH = m_objViewPort.width;
			}
			if (intScreenW * intH > intScreenH * intW)
			{
				intExtra = Math.round(intH * intScreenW / intScreenH) - intW;
				m_objView.x -= Math.floor(intExtra / 2);
				m_objView.w += intExtra;
			}
			else
			{
				intExtra = Math.round(intW * intScreenH / intScreenW) - intH;
				m_objView.y -= Math.floor(intExtra / 2);
				m_objView.h += intExtra;
			}
		}
	}

	// asking: the mode picked (keys, mouse, touch or game pad), then the game's view at that size
	function pickScreenMode(intPick_a)
	{
		m_strScreenMode = (intPick_a === 1) ? 'fullscreen' : 'normal';
		resizeViewPort(false);
		if (isFunction(m_objOptions.cbOnScreenMode))
		{
			m_objOptions.cbOnScreenMode(m_strScreenMode);
		}
	}

	// asking: the keys go to the choice only (caught before the game's key map sees them)
	function onAskKey(objEvent_a)
	{
		var intKey = objEvent_a.keyCode;
		if (m_strScreenMode === 'ask')
		{
			if ((intKey === 37) || (intKey === 78)) { m_intAskPick = 0; }
			if ((intKey === 39) || (intKey === 70)) { m_intAskPick = 1; }
			if (intKey === 78) { pickScreenMode(0); }
			else if (intKey === 70) { pickScreenMode(1); }
			else if ((intKey === 13) || (intKey === 32)) { pickScreenMode(m_intAskPick); }
			objEvent_a.preventDefault();
			objEvent_a.stopImmediatePropagation();
		}
	}

	// asking: a game pad's left / right picks, A (or start) chooses
	function pollAskPad()
	{
		var arrPads = (navigator.getGamepads !== undefined) ? navigator.getGamepads() : null;
		var blnHeld = false;
		var intChoose = -1;
		var intI, objGP;
		if (arrPads !== null)
		{
			for (intI = 0; intI < arrPads.length; intI++)
			{
				objGP = arrPads[intI];
				if ((objGP !== undefined) && (objGP !== null))
				{
					if (((objGP.axes.length > 0) && (objGP.axes[0] < -0.5)) || ((objGP.buttons.length > 14) && objGP.buttons[14].pressed))
					{
						blnHeld = true;
						if (!m_blnAskPadWas) { m_intAskPick = 0; }
					}
					if (((objGP.axes.length > 0) && (objGP.axes[0] > 0.5)) || ((objGP.buttons.length > 15) && objGP.buttons[15].pressed))
					{
						blnHeld = true;
						if (!m_blnAskPadWas) { m_intAskPick = 1; }
					}
					if (((objGP.buttons.length > 0) && objGP.buttons[0].pressed) || ((objGP.buttons.length > 9) && objGP.buttons[9].pressed))
					{
						blnHeld = true;
						if (!m_blnAskPadWas) { intChoose = m_intAskPick; }
					}
				}
			}
		}
		m_blnAskPadWas = blnHeld;
		if (intChoose >= 0)
		{
			pickScreenMode(intChoose);
		}
	}

	// asking: the two choices side by side, the picked one lit; a click or touch on either half picks it
	function renderAsk(objContext_a)
	{
		var arrLabels = m_objOptions.screenmodelabels;
		var intW = m_objView.w, intH = m_objView.h, intX = m_objView.x, intY = m_objView.y;
		var intI, intTouch = -1;
		var intSize = Math.max(8, Math.round(intH / 16));

		// a click or a touch on a half lights it; letting go chooses it (so the press doesn't carry
		// on into the game)
		if ((m_objMouse.buttons[0] === 0) && (m_objMouse.x >= 0))
		{
			intTouch = (m_objMouse.x - intX < intW / 2) ? 0 : 1;
		}
		for (intI = 0; intI < m_objOptions.maxtouches; intI++)
		{
			if ((m_objTouches[intI].id !== -1) && (m_objTouches[intI].x >= 0))
			{
				intTouch = (m_objTouches[intI].x - intX < intW / 2) ? 0 : 1;
			}
		}
		objContext_a.save();
		objContext_a.fillStyle = '#000';
		objContext_a.fillRect(intX, intY, intW, intH);
		objContext_a.font = 'bold ' + intSize + 'px sans-serif';
		objContext_a.textAlign = 'center';
		objContext_a.textBaseline = 'middle';
		objContext_a.fillStyle = '#fff';
		objContext_a.fillText(arrLabels[2], intX + intW / 2, intY + intH / 3);
		for (intI = 0; intI < 2; intI++)
		{
			objContext_a.fillStyle = (intI === m_intAskPick) ? '#ff0' : '#888';
			objContext_a.fillText(arrLabels[intI], intX + intW * (1 + 2 * intI) / 4, intY + intH * 2 / 3);
		}
		objContext_a.restore();

		if (intTouch >= 0)
		{
			m_intAskPick = intTouch;
			m_blnAskPressed = true;
		}
		else if (m_blnAskPressed)
		{
			m_blnAskPressed = false;
			pickScreenMode(m_intAskPick);
		}
	}

	function setSmoothing(objContext_a, blnSmooth_a)
	{
		objContext_a.imageSmoothingEnabled = blnSmooth_a;
		objContext_a.mozImageSmoothingEnabled = blnSmooth_a;
		objContext_a.webkitImageSmoothingEnabled = blnSmooth_a;
		objContext_a.msImageSmoothingEnabled = blnSmooth_a;
	}

	function resizeViewPort(blnRenderFrame_a)
	{
		//console.log('resizeViewPort');
		var fltScaleX = 0;
		var fltScaleY = 0;
		var blnRenderFrame = blnRenderFrame_a;
		
		if (blnRenderFrame == undefined) { blnRenderFrame = true; }
		
		m_objViewPort = getViewPort();
		computeView();

		// hidpi: the canvas in the screen's own pixels (a phone has 2 or 3 to a CSS pixel), shown
		// at its CSS size - sharp instead of blown up. m_fltScale is then canvas pixels per
		// logical pixel, so the mouse and touch sums below work as they are
		var fltRatio = 1;
		if (m_objOptions.hidpi && (window.devicePixelRatio !== undefined))
		{
			fltRatio = window.devicePixelRatio;
		}
		var intCSSWidth = 0;
		var intCSSHeight = 0;

		if (m_objViewPort.isrotated)
		{
			fltScaleX = m_objView.h / m_objViewPort.width;
			fltScaleY = m_objView.w / m_objViewPort.height;
			m_fltScale = 100 / (Math.max(fltScaleX, fltScaleY) * 100);
			intCSSWidth = m_objView.h * m_fltScale;
			intCSSHeight = m_objView.w * m_fltScale;
			m_fltScale = m_fltScale * fltRatio;
			m_objCanvas.width = m_objView.h * m_fltScale;
			m_objCanvas.height = m_objView.w * m_fltScale;

			m_objCanvasContext.translate(m_objCanvas.width, 0);
			m_objCanvasContext.rotate(Math.PI / 2);
		}
		else
		{
			fltScaleX = m_objView.w / m_objViewPort.width;
			fltScaleY = m_objView.h / m_objViewPort.height;
			m_fltScale = 100 / (Math.max(fltScaleX, fltScaleY) * 100);
			intCSSWidth = m_objView.w * m_fltScale;
			intCSSHeight = m_objView.h * m_fltScale;
			m_fltScale = m_fltScale * fltRatio;
			m_objCanvas.width = m_objView.w * m_fltScale;
			m_objCanvas.height = m_objView.h * m_fltScale;

		}
		
		var intMarginTop = (m_objViewPort.height - intCSSHeight) / 2;
		var intBodyHeight = intMarginTop + intCSSHeight;
		if (fltRatio !== 1)
		{
			m_objCanvas.style = 'margin-top:' + intMarginTop + 'px; width:' + intCSSWidth + 'px; height:' + intCSSHeight + 'px';
		}
		else
		{
			m_objCanvas.style = 'margin-top:' + intMarginTop + 'px';
		}
		m_objBody.style = 'height:' + intBodyHeight + 'px';

		m_objCanvasContext.scale(m_fltScale * m_objOptions.xscale, m_fltScale * m_objOptions.yscale);

		// the view: xorigin, yorigin is the game's point shown at the canvas' top left (a game drawn
		// in a bigger space shows only the part that's in use - no borders it doesn't need)
		if (!m_objOptions.buffered)
		{
			m_objCanvasContext.translate(-m_objView.x, -m_objView.y);
		}

		// pixel art: no smoothing when images are scaled (setting the canvas size resets it)
		if (m_objOptions.pixelated)
		{
			setSmoothing(m_objCanvasContext, false);
		}

		// buffered: an offscreen canvas at the logical resolution, drawn at 1:1 - tiles meet
		// exactly, and the whole frame is scaled onto the canvas once (no stitches between tiles)
		if (m_objOptions.buffered)
		{
			if (m_objBuffer === null)
			{
				m_objBuffer = document.createElement('canvas');
			}
			// (setting its size clears it and its settings; only when the resolution changes)
			if ((m_objBuffer.width !== m_objView.w) || (m_objBuffer.height !== m_objView.h) || (m_objBufferContext === null))
			{
				m_objBuffer.width = m_objView.w;
				m_objBuffer.height = m_objView.h;
				m_objBufferContext = m_objBuffer.getContext('2d');
			}
			setSmoothing(m_objBufferContext, false);
			m_objBufferContext.setTransform(1, 0, 0, 1, -m_objView.x, -m_objView.y);
		}
		
		m_intFPS = 0;
		m_intFPSCounter = 0;
		m_intFPSTimer = performance.now();
		
		if (blnRenderFrame)
		{
			renderFrame();
		}
	}
	
	function renderFrame()
	{
		//console.log('renderFrame');
		
		var intFPSTimer = performance.now();
		if (intFPSTimer - m_intFPSTimer <= 1000)
		{
			m_intFPSCounter++;
		}
		else
		{
			if (m_intFPSCounter > 0)
			{
				m_intFPS = m_intFPSCounter;
				m_intFPSCounter = 0;
			}
			
			m_intFPSTimer = intFPSTimer;
		}
		
		m_objViewPort = getViewPort();

		// mouse calculations
		if ((m_objMouse.rawX >= 0) && (m_objMouse.rawY >= 0))
		{
			if (m_objViewPort.isrotated)
			{
				m_objMouse.x = Math.round(m_objMouse.rawY / m_fltScale);
				m_objMouse.y = m_objView.h - Math.round(m_objMouse.rawX / m_fltScale);
			}
			else
			{
				m_objMouse.x = Math.round(m_objMouse.rawX / m_fltScale);
				m_objMouse.y = Math.round(m_objMouse.rawY / m_fltScale);
			}
			m_objMouse.x += m_objView.x;
			m_objMouse.y += m_objView.y;
		}
		
		// touch calculations
		for (var intI = 0; intI < m_objOptions.maxtouches; intI++)
		{
			if ((m_objTouches[intI].rawX >= 0) && (m_objTouches[intI].rawY >= 0))
			{
				if (m_objViewPort.isrotated)
				{
					m_objTouches[intI].x = Math.round(m_objTouches[intI].rawY / m_fltScale);
					m_objTouches[intI].y = m_objView.h - Math.round(m_objTouches[intI].rawX / m_fltScale);
				}
				else
				{
					m_objTouches[intI].x = Math.round(m_objTouches[intI].rawX / m_fltScale);
					m_objTouches[intI].y = Math.round(m_objTouches[intI].rawY / m_fltScale);
				}
				m_objTouches[intI].x += m_objView.x;
				m_objTouches[intI].y += m_objView.y;
			}
		}
				
		// call the canvas renderer (buffered: into the 1:1 buffer, then the buffer onto the canvas)
		var objContext = m_objCanvasContext;
		if (m_objBuffer !== null)
		{
			objContext = m_objBufferContext;
		}

		if (m_objOptions.autoclear)
		{
			objContext.clearRect(m_objView.x, m_objView.y, m_objView.w, m_objView.h);
		}

		if (m_strScreenMode === 'ask')
		{
			pollAskPad();
		}
		if (m_strScreenMode === 'ask')
		{
			renderAsk(objContext);
		}
		else if (isFunction(m_objOptions.cbOnRender))
		{
			m_objOptions.cbOnRender(objContext, m_objViewPort, m_objMouse, m_objTouches, m_intFPS);			
		}

		if (m_objBuffer !== null)
		{
			m_objCanvasContext.clearRect(0, 0, m_objView.w, m_objView.h);
			m_objCanvasContext.drawImage(m_objBuffer, 0, 0);
		}
	}

	// the part of the game's coordinates being shown now: { x, y, w, h } (normal: the resolution at
	// the origin; full screen: wider or taller, the game's area in the middle)
	this.getView = function()
	{
		return { x:m_objView.x, y:m_objView.y, w:m_objView.w, h:m_objView.h };
	};

	// 'normal', 'fullscreen', or 'ask' while the choice is still showing
	this.getScreenMode = function()
	{
		return m_strScreenMode;
	};

	// change the mode from the game ('normal' or 'fullscreen')
	this.setScreenMode = function(strMode_a)
	{
		m_strScreenMode = strMode_a;
		resizeViewPort(false);
	};

	this.render = function(objOptions_a)
	{
		m_objOptions = objOptions_a;
		
		if (m_objOptions.xresolution == undefined) { m_objOptions.xresolution = DEF_XRESOLUTION; }
		if (m_objOptions.yresolution == undefined) { m_objOptions.yresolution = DEF_YRESOLUTION; }
		if (m_objOptions.xscale == undefined) { m_objOptions.xscale = DEF_XSCALE; }
		if (m_objOptions.yscale == undefined) { m_objOptions.yscale = DEF_YSCALE; }
		if (m_objOptions.xorigin == undefined) { m_objOptions.xorigin = 0; }
		if (m_objOptions.yorigin == undefined) { m_objOptions.yorigin = 0; }
		if(m_objOptions.enablemouse !== undefined) { m_blnEnableMouse = m_objOptions.enablemouse; }
		if(m_objOptions.enabletouch !== undefined) { m_blnEnableTouch = m_objOptions.enabletouch; }

		if (!m_blnInitialised)
		{
			if (m_objOptions.autoclear == undefined) { m_objOptions.autoclear = true; }
			if (m_objOptions.autorotate == undefined) { m_objOptions.autorotate = true; }
			if (m_objOptions.framespersecond == undefined) { m_objOptions.framespersecond = DEF_FRAMESPERSECOND; }
			if (m_objOptions.maxtouches == undefined) { m_objOptions.maxtouches = DEF_MAXTOUCHES; }
			if (m_objOptions.target == undefined) { m_objOptions.target = ''; }
			if (m_objOptions.usesetinterval == undefined) { m_objOptions.usesetinterval = false; }
			if (m_objOptions.pixelated == undefined) { m_objOptions.pixelated = false; }
			if (m_objOptions.buffered == undefined) { m_objOptions.buffered = false; }
			if (m_objOptions.hidpi == undefined) { m_objOptions.hidpi = false; }
			if (m_objOptions.screenmode == undefined) { m_objOptions.screenmode = 'normal'; }
			if (m_objOptions.screenmodelabels == undefined) { m_objOptions.screenmodelabels = ['NORMAL', 'FULLSCREEN', 'SCREEN']; }
			m_strScreenMode = m_objOptions.screenmode;
			window.addEventListener('keydown', onAskKey, true);

			initialise();
			resizeViewPort(true);
		}
		else
		{
			resizeViewPort(false);
		}
	};
}
