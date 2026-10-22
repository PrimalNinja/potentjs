function mmogDemo()
{
	var m_objThis = this;
	var m_intFrame = 1;
	var m_intIteration = 1;

	var DEF_URI = 'http://localhost/canvas/ws.php';

	var m_objGameProperties = 
	{
		callspersecond: 0,
		cursorx: 1,
		cursory: 1,
		framespersecond: 0,
		iterationspersecond: 0,
		context: null,
		keymap: [],
		mouse: null,
		touches: null,
		viewport: null
	};
	
	// sprite stuff
	var m_arrImages = [
	];
	var m_arrSprites = [
	];
	
	// data stuff
	var m_intAreaID = 1;
	var m_strAreaData = '';

	var m_blnInitialising = false;
	var m_blnInitialised = false;
	var m_blnResourcesLoaded = false;
	
	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	var m_objITP = new JITP();
	
	// player data
	
	var strChar = 'abcdefghijklmnopqrstuvwxyz'.substr(getRandomInt(0, 25), 1);
	
	var m_strPlayer = prompt("Please enter a lowercase letter a to z", strChar);
	//var m_strPlayer = 'd';	// this is the player
	var m_intPlayerX = getRandomInt(2, 39);	// this is the players x position
	var m_intPlayerY = getRandomInt(2, 19);	// this is the players y position
	
	// ajax stuff
	function setPlayerPosAjaxCall(strPlayer_a, intPlayerX_a, intPlayerY_a, cbSuccess_a, cbFailure_a)
	{
		var objXHR = new XMLHttpRequest();
		objXHR.open('GET', DEF_URI + '?function=setplayerpos&areaid=' + encodeURIComponent(m_intAreaID) + '&player=' + encodeURIComponent(strPlayer_a) + '&playerx=' + encodeURIComponent(intPlayerX_a) + '&playery=' + encodeURIComponent(intPlayerY_a));
		
		objXHR.onload = function() 
		{
			if (objXHR.status === 200) 
			{
				cbSuccess_a(objXHR.responseText);
			}
			else 
			{
				cbFailure_a(objXHR.status);
			}
		};
		
		objXHR.send();
	}
	
	function doNothing()
	{
		// do nothing
	}
	
	function setPlayerPos(strPlayer_a, intPlayerX_a, intPlayerY_a)
	{
		setPlayerPosAjaxCall(strPlayer_a, intPlayerX_a, intPlayerY_a, function(objResponse_a)
		{
			if (objResponse_a !== undefined)
			{
				var arrCommands = objResponse_a.split(':');
				
				var strMessage = arrCommands[1];
				if (strMessage.length > 2)
				{
					console.debug('MESSAGE: ' + strMessage);
				}

				if (arrCommands[0] == '1')
				{
					// success
					m_intPlayerX = intPlayerX_a;
					m_intPlayerY = intPlayerY_a;
					console.debug('.');
				}
			}
			else
			{
				console.debug('waiting for server response');
			}
		}, doNothing);
	}
	
	// helpers
	function getRandomInt(intMin_a, intMax_a) 
	{
		var intMin = Math.ceil(intMin_a);
		intMax = Math.floor(intMax_a);
		return Math.floor(Math.random() * (intMax - intMin)) + intMin;	
	}
	
	function inkey(intKey_a)
	{
		var intKey = intKey_a;
		var intResult = m_objGameProperties.keymap[intKey];
		
		if ((intKey >= DEF_KEY_LOWEST) && (intKey <= DEF_KEY_HIGHEST))
		{
			// arrow keys, rotate if the screen is rotated
			if (m_objGameProperties.viewport.isrotated)
			{
				if (intKey == DEF_KEY_LEFT) { intKey = ROTATED_KEY_LEFT; }
				else if (intKey == DEF_KEY_RIGHT) {intKey = ROTATED_KEY_RIGHT; }
				else if (intKey == DEF_KEY_UP) {intKey = ROTATED_KEY_UP; }
				else if (intKey == DEF_KEY_DOWN) {intKey = ROTATED_KEY_DOWN; }
				
				intResult = m_objGameProperties.keymap[intKey];
			}
		}
		
		return intResult;
	}
	
	function locate(intX_a, intY_a)
	{
		m_objGameProperties.cursorx = intX_a;
		m_objGameProperties.cursory = intY_a;
	}

	function print(str_a)
	{
		m_objGameProperties.context.beginPath();
		m_objGameProperties.context.font = "8px Amstrad CPC correct";
		m_objGameProperties.context.fillStyle = "yellow";
		m_objGameProperties.context.textAlign = "left";
		m_objGameProperties.context.fillText(str_a, (m_objGameProperties.cursorx - 1) * CHARSIZE, (m_objGameProperties.cursory * CHARSIZE));
		m_objGameProperties.context.closePath();
	}

	// Canvas Logic
	this.onRenderCanvas = function(objContext_a, objViewPort_a, objMouse_a, objTouches_a, intFramesPerSecond_a)
	{
		m_objGameProperties.context = objContext_a;
		m_objGameProperties.framespersecond = intFramesPerSecond_a;
		m_objGameProperties.mouse = objMouse_a;
		m_objGameProperties.touches = objTouches_a;
		m_objGameProperties.viewport = objViewPort_a;
		
		// write the text
		locate(1, 22); print(objMouse_a.x + ":" + objMouse_a.y + ":" + objMouse_a.rawX + ":" + objMouse_a.rawY + ":" + objMouse_a.buttons[0] + ":" + objMouse_a.buttons[1] + ":" + objMouse_a.buttons[2]);
		locate(1, 23); print(objTouches_a[0].x + ":" + objTouches_a[0].y + ":" + objTouches_a[1].x + ":" + objTouches_a[1].y + ":" + objTouches_a[2].x + ":" + objTouches_a[2].y + ":" + objTouches_a[3].x + ":" + objTouches_a[3].y + ":" + objTouches_a[4].x + ":" + objTouches_a[4].y + ":" + objTouches_a[5].x + ":" + objTouches_a[5].y);
		locate(1, 24); print("FPS: " + m_objGameProperties.framespersecond + ", IPS: " + m_objGameProperties.iterationspersecond + ", CPS: " + m_objGameProperties.callspersecond + ", Pos: " + m_intPlayerX + "," + m_intPlayerY);
		
		if (m_blnResourcesLoaded)
		{
			var intY = 1;

			for (var intI = 0; intI < m_strAreaData.length; intI++)
			{
				if (intI % 40 === 0)
				{
					var strRow = m_strAreaData.substr(intI, 40);
					locate(1, intY); print(strRow);
					intY++;
				}
			}
		}
		
		// render player
		if (m_blnResourcesLoaded)
		{
			locate(m_intPlayerX, m_intPlayerY); print(m_strPlayer);
		}
		
		m_intFrame++;
	};

	// Game Loop
	this.onIterationGameLoop = function(arrKeyMap_a, intIterationsPerSecond_a)
	{
		m_objGameProperties.iterationspersecond = intIterationsPerSecond_a;
		m_objGameProperties.keymap = arrKeyMap_a;
		
		var intXOffset = 0;
		var intYOffset = 0;
	
		if (m_blnResourcesLoaded)
		{
			// first check mouse, if no mouse, check touch, if no touch, check keys
			//if (m_objGameProperties.mouse.x >= 0)
			//{
				//m_intBoxX = m_objGameProperties.mouse.x - m_intBoxSize * 0.5;
			//}
			//else
			//{
				//if (m_objGameProperties.touches[0].x >= 0)
				//{
					//m_intBoxX = m_objGameProperties.touches[0].x - m_intBoxSize * 0.5;
				//}
				//else
				//{
					if (inkey(KEY_LEFT) === 0)
					{
						intXOffset = -1;
					}
					else if (inkey(KEY_RIGHT) === 0)
					{
						intXOffset = 1;
					} 
				//}
			//}

			//if (m_objGameProperties.mouse.y >= 0)
			//{
				//m_intBoxY = m_objGameProperties.mouse.y - m_intBoxSize * 0.5;
			//}
			//else
			//{
				//if (m_objGameProperties.touches[0].y >= 0)
				//{
					//m_intBoxY = m_objGameProperties.touches[0].y - m_intBoxSize * 0.5;
				//}
				//else
				//{
					if (inkey(KEY_UP) === 0)
					{
						intYOffset = -1;
					}
					else if (inkey(KEY_DOWN) === 0)
					{
						intYOffset = 1;
					} 
				//}
			//}		
			
			var intPlayerX = m_intPlayerX + intXOffset;
			var intPlayerY = m_intPlayerY + intYOffset;
			if ((intPlayerX != m_intPlayerX) || (intPlayerY != m_intPlayerY))
			{
				setPlayerPos(m_strPlayer, intPlayerX, intPlayerY);
			}
		}

		
		if ((!m_blnInitialised) && (!m_blnInitialising))
		{
			m_blnInitialising = true;
			setPlayerPos(m_strPlayer, m_intPlayerX, m_intPlayerY);
			m_blnInitialised = true;
			m_blnInitialising = false;
		}

		m_intIteration++;
	};
	
	this.onProcessInternetTransfer = function(intCallID_a, intCPS_a, objResponse_a)
	{
		function processCommand(strCommand_a)
		{
			console.debug(strCommand_a);
		}
		
		m_objGameProperties.callspersecond = intCPS_a;

		if (objResponse_a !== undefined)
		{
			var arrCommands = objResponse_a.split(':');
			
			var strMessage = arrCommands[1];
			if (strMessage.length > 0)
			{
				console.debug('MESSAGE: ' + strMessage);
			}

			if (arrCommands[0] == '1')
			{
				// success
				m_strAreaData = arrCommands[2];
				m_blnResourcesLoaded = true;
				// var intCommand = 0;
				// processArray(arrCommands, function(strCommand_a)
				// {
					// if (intCommand > 1)
					// {
						// processCommand(strCommand_a);
					// }
					// intCommand++;
				// });
			}
		}
		else
		{
			console.debug('waiting for server response');
		}
	};

	this.run = function()
	{
		m_intIteration = 1;
		m_objGameLoop.process(
			{
				iterationspersecond: 25,	// how many iterations per second
				cbOnIteration: m_objThis.onIterationGameLoop
			});

		m_objCanvas.render( 
			{
				autoclear: true,			// turn on auto clear the canvas between frames
				autorotate: true,			// turn on auto rotation
				framespersecond: 60,		// frames per second (only works when setinterval = true), otherwise it is ignored
				maxtouches: 6,				// maximum number of touches
				portrait: false,				// is the screen a portrait screen?
				target: 'canOutput',
				xresolution: XRESOLUTION,	// logical x resolution
				yresolution: YRESOLUTION,	// logical y resolution
				xscale: 1,					// 1 is square pixels, 2 for double width, 0.5 for double height
				usesetinterval: false,		// if true we are updating the display using setInterval, if false we use requestAnimationFrame (which is best)
				cbOnRender: m_objThis.onRenderCanvas
			});


	m_objITP.process(
		{
			callspersecond: 10,		// how many calls per second
			uri: DEF_URI,
			cbOnGetParameters: '&function=getarea&areaid=' + encodeURIComponent(m_intAreaID) + '&player=' + encodeURIComponent(m_strPlayer),
			cbOnProcess: m_objThis.onProcessInternetTransfer
		});
	};
}

var g_objGame = new mmogDemo();
g_objGame.run();
