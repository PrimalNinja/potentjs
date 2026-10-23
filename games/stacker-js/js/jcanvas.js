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
			fltScaleX = m_objOptions.yresolution / m_objViewPort.width;
			fltScaleY = m_objOptions.xresolution / m_objViewPort.height;
			m_fltScale = 100 / (Math.max(fltScaleX, fltScaleY) * 100);
			intCSSWidth = m_objOptions.yresolution * m_fltScale;
			intCSSHeight = m_objOptions.xresolution * m_fltScale;
			m_fltScale = m_fltScale * fltRatio;
			m_objCanvas.width = m_objOptions.yresolution * m_fltScale;
			m_objCanvas.height = m_objOptions.xresolution * m_fltScale;

			m_objCanvasContext.translate(m_objCanvas.width, 0);
			m_objCanvasContext.rotate(Math.PI / 2);
		}
		else
		{
			fltScaleX = m_objOptions.xresolution / m_objViewPort.width;
			fltScaleY = m_objOptions.yresolution / m_objViewPort.height;
			m_fltScale = 100 / (Math.max(fltScaleX, fltScaleY) * 100);
			intCSSWidth = m_objOptions.xresolution * m_fltScale;
			intCSSHeight = m_objOptions.yresolution * m_fltScale;
			m_fltScale = m_fltScale * fltRatio;
			m_objCanvas.width = m_objOptions.xresolution * m_fltScale;
			m_objCanvas.height = m_objOptions.yresolution * m_fltScale;

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
			m_objCanvasContext.translate(-m_objOptions.xorigin, -m_objOptions.yorigin);
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
			if ((m_objBuffer.width !== m_objOptions.xresolution) || (m_objBuffer.height !== m_objOptions.yresolution) || (m_objBufferContext === null))
			{
				m_objBuffer.width = m_objOptions.xresolution;
				m_objBuffer.height = m_objOptions.yresolution;
				m_objBufferContext = m_objBuffer.getContext('2d');
			}
			setSmoothing(m_objBufferContext, false);
			m_objBufferContext.setTransform(1, 0, 0, 1, -m_objOptions.xorigin, -m_objOptions.yorigin);
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
				m_objMouse.y = m_objOptions.yresolution - Math.round(m_objMouse.rawX / m_fltScale);
			}
			else
			{
				m_objMouse.x = Math.round(m_objMouse.rawX / m_fltScale);
				m_objMouse.y = Math.round(m_objMouse.rawY / m_fltScale);
			}
			m_objMouse.x += m_objOptions.xorigin;
			m_objMouse.y += m_objOptions.yorigin;
		}
		
		// touch calculations
		for (var intI = 0; intI < m_objOptions.maxtouches; intI++)
		{
			if ((m_objTouches[intI].rawX >= 0) && (m_objTouches[intI].rawY >= 0))
			{
				if (m_objViewPort.isrotated)
				{
					m_objTouches[intI].x = Math.round(m_objTouches[intI].rawY / m_fltScale);
					m_objTouches[intI].y = m_objOptions.yresolution - Math.round(m_objTouches[intI].rawX / m_fltScale);
				}
				else
				{
					m_objTouches[intI].x = Math.round(m_objTouches[intI].rawX / m_fltScale);
					m_objTouches[intI].y = Math.round(m_objTouches[intI].rawY / m_fltScale);
				}
				m_objTouches[intI].x += m_objOptions.xorigin;
				m_objTouches[intI].y += m_objOptions.yorigin;
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
			objContext.clearRect(m_objOptions.xorigin, m_objOptions.yorigin, m_objOptions.xresolution, m_objOptions.yresolution);
		}

		if (isFunction(m_objOptions.cbOnRender))
		{
			m_objOptions.cbOnRender(objContext, m_objViewPort, m_objMouse, m_objTouches, m_intFPS);			
		}

		if (m_objBuffer !== null)
		{
			m_objCanvasContext.clearRect(0, 0, m_objOptions.xresolution, m_objOptions.yresolution);
			m_objCanvasContext.drawImage(m_objBuffer, 0, 0);
		}
	}

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

			initialise();
			resizeViewPort(true);
		}
		else
		{
			resizeViewPort(false);
		}
	};
}
