function spriteDemo()
{
	var m_objThis = this;
	var m_intFrame = 1;
	var m_intIteration = 1;

	var m_intBoxSize = 8;
	var m_intBoxX = 20;
	var m_intBoxY = YRESOLUTION * 0.5 + 20;
	var m_intBoxX2 = 20;
	var m_intBoxXD2 = 2;

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
	var m_blnResourcesLoaded = false;
	var m_arrImages = [
		{ name:'man', classes:'people', source:'images/man.jpg' },
		{ name:'woman', classes:'people', source:'images/woman.jpg' }
	];
	var m_arrSprites = [
		{ name:'man', classes:'people', imagename:'man', x:10, y:20, w:50, h:100, imagex:0, imagey:19, imagew:92, imageh:125, sequence:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,-1] },
		{ name:'woman', classes:'people', imagename:'woman', x:260, y:50, w:25, h:100, imagex:0, imagey:0, imagew:110, imageh:303, sequence:[1,1,2,2,3,3,4,4,5,5,-1] }
	];
	
	var m_arrPeopleImageIDs = [];
	var m_arrPeopleSpriteIDs = [];

	var m_objSprites = new JSprites();
	var m_objGameLoop = new JGameLoop();
	var m_objCanvas = new JCanvas();
	
	// helpers
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
		
		// draw a yellow border
		//objContext_a.beginPath();
		//objContext_a.strokeStyle = "yellow";
		//objContext_a.linewidth="1";
		//objContext_a.rect(0, 0, XRESOLUTION, YRESOLUTION);
		//objContext_a.stroke();
		//objContext_a.closePath();

		// draw a yellow inner border
		//objContext_a.beginPath();
		//objContext_a.strokeStyle = "yellow";
		//objContext_a.linewidth="1";
		//objContext_a.rect(10, 10, XRESOLUTION - 20, YRESOLUTION - 20);
		//objContext_a.stroke();
		//objContext_a.closePath();

		// draw box 1
		objContext_a.beginPath();
		objContext_a.fillStyle = "cyan";
		objContext_a.linewidth="1";
		objContext_a.fillRect(m_intBoxX, m_intBoxY, m_intBoxSize, m_intBoxSize);
		objContext_a.fill();
		objContext_a.closePath();
		
		// draw box 2
		objContext_a.beginPath();
		objContext_a.fillStyle = "green";
		objContext_a.linewidth="1";
		objContext_a.fillRect(m_intBoxX2, YRESOLUTION * 0.5 - 20 - m_intBoxSize, m_intBoxSize, m_intBoxSize);
		objContext_a.fill();
		objContext_a.closePath();
		
		// write the text
		locate(1, 1); print("         1         2         3         4         5         6         7         8");
		locate(1, 2); print("12345678901234567890123456789012345678901234567890123456789012345678901234567890");
		
		locate(1, 22); print(objMouse_a.x + ":" + objMouse_a.y + ":" + objMouse_a.rawX + ":" + objMouse_a.rawY + ":" + objMouse_a.buttons[0] + ":" + objMouse_a.buttons[1] + ":" + objMouse_a.buttons[2]);
		
		locate(1, 23); print(objTouches_a[0].x + ":" + objTouches_a[0].y + ":" + objTouches_a[1].x + ":" + objTouches_a[1].y + ":" + objTouches_a[2].x + ":" + objTouches_a[2].y + ":" + objTouches_a[3].x + ":" + objTouches_a[3].y + ":" + objTouches_a[4].x + ":" + objTouches_a[4].y + ":" + objTouches_a[5].x + ":" + objTouches_a[5].y);
		
		locate(1, 24); print("         1         2         3         4         5         6         7         8");
		locate(1, 25); print("12345678901234567890123456789012345678901234567890123456789012345678901234567890");

		locate(1, 134); print("         1         2         3         4         5         6         7         8");
		locate(1, 135); print("12345678901234567890123456789012345678901234567890123456789012345678901234567890");
		
		if (m_blnResourcesLoaded)
		{
			m_objSprites.paintSprites(objContext_a);
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
	
		// check box 2 if near the edge of the screen resolution, change directions if it is
		if ((m_intBoxX2 > (300 - m_intBoxSize)) || (m_intBoxX2 < 20))
		{
			m_intBoxXD2 = -m_intBoxXD2;
		}
		
		// move the boxes;
		
		// first check mouse, if no mouse, check touch, if no touch, check keys
		if (m_objGameProperties.mouse.x >= 0)
		{
			m_intBoxX = m_objGameProperties.mouse.x - m_intBoxSize * 0.5;
		}
		else
		{
			if (m_objGameProperties.touches[0].x >= 0)
			{
				m_intBoxX = m_objGameProperties.touches[0].x - m_intBoxSize * 0.5;
			}
			else
			{
				if (inkey(KEY_LEFT) === 0)
				{
					intXOffset = -2;
				}
				else if (inkey(KEY_RIGHT) === 0)
				{
					intXOffset = 2;
				} 
			}
		}

		if (m_objGameProperties.mouse.y >= 0)
		{
			m_intBoxY = m_objGameProperties.mouse.y - m_intBoxSize * 0.5;
		}
		else
		{
			if (m_objGameProperties.touches[0].y >= 0)
			{
				m_intBoxY = m_objGameProperties.touches[0].y - m_intBoxSize * 0.5;
			}
			else
			{
				if (inkey(KEY_UP) === 0)
				{
					intYOffset = -2;
				}
				else if (inkey(KEY_DOWN) === 0)
				{
					intYOffset = 2;
				} 
			}
		}
		
		m_intBoxX += intXOffset;
		m_intBoxY += intYOffset;
		m_intBoxX2 += m_intBoxXD2;
		
		if (m_blnResourcesLoaded)
		{
			// each command here iterates through all the sprites
			//m_objSprites.moveSpritesByIDs(m_arrPeopleSpriteIDs, intXOffset, intYOffset);
			//m_objSprites.showSpritesByIDs(m_arrPeopleSpriteIDs);
			
			// this method iterates through the sprites once
			m_objSprites.processSprites(m_arrPeopleImageIDs, function(intID_a)
			{
				m_objSprites.moveSpriteByID(intID_a, intXOffset, intYOffset);
				m_objSprites.showSpriteByID(intID_a);
			});
			
			if (m_intIteration % 2 === 0)
			{
				m_objSprites.animateSprites();
			}
		}
		m_intIteration++;
	};
	
	this.run = function()
	{
		m_objSprites.addImagesToLibrary(m_arrImages);
		m_objSprites.addSpritesToLibrary(m_arrSprites);
		m_arrPeopleImageIDs = m_objSprites.getImageIDsByClass('people');

		// use sprites and get ids
		m_objSprites.useSpritesByClass('people');
		m_arrPeopleSpriteIDs = m_objSprites.getSpriteIDsByClass('people');

		// load the images
		m_objSprites.loadImagesByIDs(m_arrPeopleImageIDs, function()
		{
			// animate after the images are loaded
			m_objSprites.animateSpritesByIDs(m_arrPeopleSpriteIDs);
			
			m_blnResourcesLoaded = true;
		});

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
	};
}

var g_objGame = new spriteDemo();
g_objGame.run();
