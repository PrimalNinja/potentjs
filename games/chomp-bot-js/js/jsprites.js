// TODO:
//
//		Character (via JBrainac)
//		Sprite Priorities
//		sensors: cansee (direction, distance, frequencyrange), canhear (distance, vol, frequencyrange), cansmell (distance)
//		items: hascolour (frequency), hassmell, hasnoise (volume, frequency)
//		Velocities
//		Rotations
//		Effects
//		Magnification
//		Transparency
//		Collision Detection within all or defined sets of Sprite Priorities
//		
// stampSprite's flags
var SPRITE_MIRRORX = 1;
var SPRITE_MIRRORY = 2;

function JSprites()
{
	var m_objThis = this;
	
	// we have a dummy image because the array is 1 based, we want sprite 0 to mean something special as well as negatives in a similar way to the animation sequences
	var m_arrImageLibrary = [
		{ name:'DUMMY', classes:'DUMMY', source:'', isloaded:false, theimage:null }
	];

	// no sequence bounds checking, the last number should be either 0 or a negative
	// supported collision types: bb - bounding box, hb - hitbox
	
	// sprite properties:
	
	// name:'DUMMY'			- name of the sprite, should be unique
	// classes:'DUMMY'		- class of sprites, can be not unique
	// isvisible:false		- is the sprite visible?
	// x:0					- current x position of the sprite
	// y:0					- current y position of the sprite
	// w:0					- current width of the sprite
	// h:0					- current height of the sprite
	// imagename:'DUMMY'	- the name of the image the sprite is using
	// imageid:0			- the image's id
	// imagex:1				- the x position within the image to start the sprite
	// imagey:1				- the y position within the image to start the sprite
	// imagew:0				- the width within the image to end the sprite
	// imageh:0				- the height within the image to end the sprite
	// collisiontype:''		- a collision detection method if provided
	// hbx:0				- if colltiontype is 'hb' (hitbox) then the x offset from the centre of the sprite to start it
	// hby:0				- if colltiontype is 'hb' (hitbox) then the y offset from the centre of the sprite to start it
	// hbsize: 0			- the size of a square that has it's centre placed over hbx & hby
	// hbw, hbh			- optional: the hit box's width and height when it isn't square (default hbsize)
	// delay: 1				- animation: iterations each step of the sequence is shown for (1: every animateSprites)
	// isanimated:false		- is the sprite animated?
	// frame:1				- current frame of the sprite
	// nextframe:0			- next sprite frame if animated
	// sequence: []			- animation sequences
	var m_arrSpriteLibrary = [
		{ name:'DUMMY', classes:'DUMMY', isvisible:false, x:0, y:0, w:0, h:0, imagename:'DUMMY', imageid:0, imagex:1, imagey:1, imagew:0, imageh:0, collisiontype:'', hbx:0, hby:0, hbsize:0, isanimated:false, frame:1, nextframe:0, sequence:[1, 2, 3, 4, -1, 5, 6, 7, 8, 0] }	// 0 for stop, -x to go to x
	];

	var m_arrUsedSprites = [];

	// ====================================================================================================
	// HELPERS
	
	function doNothing()
	{
		// do nothing, this function is for clarity of code sometimes
	}
	
	function getArrayIDByName(arr_a, strName_a)
	{
		var intResult = -1;
		
		var intI = 0;
		processArray(arr_a, function(obj_a)
		{
			if (strName_a == obj_a.name)
			{
				intResult = intI;
				return true;
			}
			else
			{
				intI++;
				return false;
			}
		});
		
		return intResult;
	}
	
	// half a hit box's width ('hbw') or height ('hbh'): its own size if it has one, else hbsize
	function hbHalf(objSprite_a, strWhich_a)
	{
		var intSize = objSprite_a[strWhich_a];
		if ((intSize === undefined) || (intSize === null)) { intSize = objSprite_a.hbsize; }
		return intSize * 0.5;
	}

	// intLimit_a is optional, if not provided then no limit is enforced
	function getArrayIDsByClass(arr_a, strClass_a, intLimit_a)	
	{
		var arrResult = [];
		var strClass = ' ' + strClass_a + ' ';
		var intLimit = intLimit_a;
		if (intLimit === undefined) { intLimit = 0; }

		var intI = 0;
		processArray(arr_a, function(objImage_a)
		{
			var strClasses = ' ' + objImage_a.classes + ' ';
			if (strClasses.indexOf(strClass) >= 0)
			{
				arrResult.push(intI);
				
				if ((intLimit > 0) && (intI == intLimit))
				{
					return true;
				}
			}
			intI++;
			return false;
		});

		return arrResult;
	}

	// ====================================================================================================
	// IMAGES - MEMORY MANAGEMENT
	
	// add images to our image library
	this.addImagesToLibrary = function(arrImages_a)
	{
		processArray(arrImages_a, function(objImage_a)
		{
			var objImage = { name:objImage_a.name, classes:objImage_a.classes, source:objImage_a.source, isloaded:false, theimage:null };
			m_arrImageLibrary.push(objImage);
		});
	};

	// get the ID of an image
	this.getImageIDByName = function(strName_a)
	{
		return getArrayIDByName(m_arrImageLibrary, strName_a);
	};
	
	// get IDs of multiple images
	// intLimit_a is optional, if not provided then no limit is enforced
	this.getImageIDsByClass = function(strClass_a, intLimit_a)	
	{
		return getArrayIDsByClass(m_arrImageLibrary, strClass_a, intLimit_a);
	};
	
	// load an image into memory
	this.loadImageByID = function(intID_a, cbOnLoad_a)
	{
		m_arrImageLibrary[intID_a].theimage = new Image();
		m_arrImageLibrary[intID_a].theimage.src = m_arrImageLibrary[intID_a].source;
		m_arrImageLibrary[intID_a].theimage.onload = function()
		{
			if (isFunction(cbOnLoad_a))
			{
				m_arrImageLibrary[intID_a].isloaded = true;
				cbOnLoad_a(intID_a);
			}
		};
	};
	
	// load multiple images into memory
	this.loadImagesByIDs = function(arrIDs_a, cbOnLoad_a)
	{
		var intDone = 0;
		var intTodo = arrIDs_a.length;
		
		processArray(arrIDs_a, function(intID_a)
		{
			m_objThis.loadImageByID(intID_a, function()
			{
				intDone++;
				if (intDone == intTodo)
				{
					if (isFunction(cbOnLoad_a))
					{
						cbOnLoad_a(arrIDs_a);
					}
				}
			});
		});
	};
	
	// unload an image (to reclaim memory)
	this.unloadImageByID = function(intID_a)
	{
		m_arrImageLibrary[intID_a].isloaded = false;
		m_arrImageLibrary[intID_a].theimage = null;
	};
	
	// unload multiple images (to reclaim memory)
	this.unloadImagesByIDs = function(arrIDs_a)
	{
		processArray(arrIDs_a, function(intID_a)
		{
			m_objThis.unloadImageByID(intID_a);
		});
	};

	// ====================================================================================================
	// SPRITES - MEMORY MANAGEMENT
	
	// add sprites to our sprite library
	this.addSpritesToLibrary = function(arrSprites_a)
	{
		processArray(arrSprites_a, function(objSprite_a)
		{
			var intImageID = m_objThis.getImageIDByName(objSprite_a.imagename);
			var objSprite = { name:objSprite_a.name, classes:objSprite_a.classes, isvisible:false, x:objSprite_a.x, y:objSprite_a.y, w:objSprite_a.w, h:objSprite_a.h, imagename:objSprite_a.imagename, imageid:intImageID, imagex:objSprite_a.imagex, imagey:objSprite_a.imagey, imagew:objSprite_a.imagew, imageh:objSprite_a.imageh, collisiontype:objSprite_a.collisiontype, hbx:objSprite_a.hbx, hby:objSprite_a.hby, hbsize:objSprite_a.hbsize, hbw:objSprite_a.hbw, hbh:objSprite_a.hbh, isanimated:false, frame:1, nextframe:1, sequence:objSprite_a.sequence, delay:(objSprite_a.delay === undefined) ? 1 : objSprite_a.delay, wait:0 };
			m_arrSpriteLibrary.push(objSprite);
		});
	};
	
	// a library sprite's description (what it looks like, its sequence, its hit box) - to read, not change
	this.getSpriteByName = function(strName_a)
	{
		var intID = getArrayIDByName(m_arrSpriteLibrary, strName_a);
		return (intID > 0) ? m_arrSpriteLibrary[intID] : null;
	};

	// get a sprite id
	this.getSpriteIDByName = function(strName_a)
	{
		return getArrayIDByName(m_arrUsedSprites, strName_a);
	};

	// get multiple sprite ids
	// intLimit_a is optional, if not provided then no limit is enforced
	this.getSpriteIDsByClass = function(strClass_a, intLimit_a)	
	{
		return getArrayIDsByClass(m_arrUsedSprites, strClass_a, intLimit_a);
	};

	this.unuseAllSprites = function()
	{
		m_arrUsedSprites = [];
		m_objThis.useSpriteByName('DUMMY');	// always have a dummy sprite used
	};

	// use a sprite
	this.useSpriteByName = function(strName_a)
	{
		var intID = getArrayIDByName(m_arrSpriteLibrary, strName_a);
		if (intID >= 0)
		{
			m_arrUsedSprites.push(m_arrSpriteLibrary[intID]);
		}
	};

	// use multiple sprites
	// intLimit_a is optional, if not provided then no limit is enforced
	this.useSpritesByClass = function(strClass_a, intLimit_a)
	{
		var arrSprites = getArrayIDsByClass(m_arrSpriteLibrary, strClass_a, intLimit_a);
		processArray(arrSprites, function(intID_a)
		{
			m_arrUsedSprites.push(m_arrSpriteLibrary[intID_a]);
		});
	};

	// ====================================================================================================
	// SPRITES - USAGE
	
	// animate a used sprite
	// intFrame_a is optional, if not provided then animate from where it left off
	this.animateSpriteByID = function(intID_a, intFrame_a)
	{
		if (intFrame_a === undefined)
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].nextframe = intFrame_a;
			m_arrUsedSprites[intID_a].wait = 0;
		}
		m_arrUsedSprites[intID_a].isanimated = true;
	};

	// animate multiple used sprites
	// intFrame_a is optional, if not provided then animate from where it left off
	this.animateSpritesByIDs = function(arrIDs_a, intFrame_a)
	{
		processArray(arrIDs_a, function(intID_a)
		{
			m_objThis.animateSpriteByID(intID_a, intFrame_a);
		});
	};
	
	// animate all used sprites
	// frame indexes are 1-based, 0 means stop animating, -X means go back to frame abs(X)
	this.animateSprites = function()
	{
		processArray(m_arrUsedSprites, function(objSprite_a)
		{
			var blnStep = false;
			if (objSprite_a.isanimated)
			{
				// a step each delay calls (delay 1: every call)
				objSprite_a.wait = (objSprite_a.wait === undefined) ? 0 : objSprite_a.wait - 1;
				if (objSprite_a.wait <= 0)
				{
					objSprite_a.wait = (objSprite_a.delay === undefined) ? 1 : objSprite_a.delay;
					blnStep = true;
				}
			}
			if (blnStep)
			{
				var intNewFrame = objSprite_a.sequence[(objSprite_a.nextframe - 1)];

				if (intNewFrame === 0)
				{
					// end of animation
					objSprite_a.isanimated = false;
				}
				else if (intNewFrame > 0)
				{
					// next frame
					objSprite_a.frame = intNewFrame;
					objSprite_a.nextframe++;
				}
				else if (intNewFrame < 0)
				{
					// go back to a previous frame
					objSprite_a.nextframe = Math.abs(intNewFrame);
					intNewFrame = objSprite_a.sequence[(objSprite_a.nextframe - 1)];
					objSprite_a.frame = intNewFrame;
					objSprite_a.nextframe++;
				}
			}
		});
	};

	// hide a sprite
	this.hideSpriteByID = function(intID_a)
	{
		m_arrUsedSprites[intID_a].isvisible = false;
	};

	// hide multiple sprites
	this.hideSpritesByIDs = function(arrIDs_a)
	{
		processArray(arrIDs_a, function(intID_a)
		{
			m_objThis.hideSpriteByID(intID_a);
		});
	};

	// move a sprite
	// intOffsetX_a and intOffSetY_a are optional and may be literals or functions
	this.moveSpriteByID = function(intID_a, intOffsetX_a, intOffSetY_a)
	{
		if (intOffsetX_a === undefined)
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].x += intOffsetX_a;
		}

		if (intOffSetY_a === undefined)
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].y += intOffSetY_a;
		}
	};

	// move multiple sprites
	// cbCalculateOffsetX_a and cbCalculateOffSetY_a are optional and may be literals or functions
	this.moveSpritesByIDs = function(arrIDs_a, cbCalculateOffsetX_a, cbCalculateOffSetY_a)
	{
		var intI = 0;
		
		processArray(arrIDs_a, function(intID_a)
		{
			var intOffsetX = cbCalculateOffsetX_a;
			var intOffsetY = cbCalculateOffSetY_a;
			
			if (isFunction(cbCalculateOffsetX_a))
			{
				intOffsetX = cbCalculateOffsetX_a(intI, intID_a);
			}
			
			if (isFunction(cbCalculateOffSetY_a))
			{
				intOffsetY = cbCalculateOffSetY_a(intI, intID_a);
			}
			
			m_objThis.moveSpriteByID(intID_a, intOffsetX, intOffsetY);
			intI++;
		});
	};
	
	// paint all used sprites
	this.paintSprites = function(objContext_a)
	{
		processArray(m_arrUsedSprites, function(objSprite_a)
		{
			if (objSprite_a.isvisible)
			{
				var intImageX = objSprite_a.imagex + ((objSprite_a.frame - 1) * objSprite_a.imagew);
				objContext_a.drawImage(m_arrImageLibrary[objSprite_a.imageid].theimage, intImageX, objSprite_a.imagey, objSprite_a.imagew, objSprite_a.imageh, objSprite_a.x, objSprite_a.y, objSprite_a.w, objSprite_a.h);
			}
		});
	};
	
	// process sprites
	this.processSprites = function(arrIDs_a, cb_a)
	{
		if (isFunction(cb_a))
		{
			processArray(arrIDs_a, function(intID_a)
			{
				cb_a(intID_a);
			});
		}
	};

	// show a sprite
	// intX_a and intY_a are optional and may be literals or functions
	this.showSpriteByID = function(intID_a, intX_a, intY_a)
	{
		if (intX_a === undefined)
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].x = intX_a;
		}

		if (intY_a === undefined)
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].y = intY_a;
		}
		
		m_arrUsedSprites[intID_a].isvisible = true;
	};

	// show multiple sprites
	// optional cbCalculateX_a, cbCalculateY_a are optional and may be literals or functions
	this.showSpritesByIDs = function(arrIDs_a, cbCalculateX_a, cbCalculateY_a)
	{
		var intI = 0;
		
		processArray(arrIDs_a, function(intID_a)
		{
			var intX = cbCalculateX_a;
			var intY = cbCalculateY_a;
			
			if (isFunction(cbCalculateX_a))
			{
				intX = cbCalculateX_a(intI, intID_a);
			}
			
			if (isFunction(cbCalculateY_a))
			{
				intY = cbCalculateY_a(intI, intID_a);
			}
			
			m_objThis.showSpriteByID(intID_a, intX, intY);
			intI++;
		});
	};

	// freeze animation of a sprite
	// intFrame_a is optional
	this.unanimateSpriteByID = function(intID_a, intFrame_a)
	{
		if (intFrame_a === undefined) 
		{
			doNothing();
		}
		else
		{
			m_arrUsedSprites[intID_a].frame = intFrame_a;
		}
		m_arrUsedSprites[intID_a].isanimated = false;
	};

	// freeze animation of multiple sprites
	this.unanimateSpritesByIDs = function(arrIDs_a, intFrame_a)
	{
		processArray(arrIDs_a, function(intID_a)
		{
			m_objThis.unanimateSpriteByID(intID_a, intFrame_a);
		});
	};

	// valid collision types: boundingbox bb, hitbox hb
	// collisiontype is 'hb', then hbx = hitbox x offset from centre of sprite
	// collisiontype is 'hb', then hby = hitbox y offset from centre of sprite
	// collisiontype is 'hb', then hbsize = hitbox size
	this.collisionDetectIDtoID = function(intID1_a, intID2_a, cb_a)
	{
		// for sprite 1, top left x, top left y, bottom left x, bottom left y, top right x, top right y, bottom right x, bottom right y
		var strType1 = m_arrUsedSprites[intID1_a].collisiontype;
		var intTop1 = m_arrUsedSprites[intID1_a].y;
		var intBottom1 = m_arrUsedSprites[intID1_a].y + m_arrUsedSprites[intID1_a].h;
		var intLeft1 = m_arrUsedSprites[intID1_a].x;
		var intRight1 = m_arrUsedSprites[intID1_a].x + m_arrUsedSprites[intID1_a].w;
		
		var intCentreX = 0;
		var intCentreY = 0;
		var intHBHalf = 0;

		if (strType1 === 'hb')
		{
			// if using hb method then calculate the square as the hb
			intCentreX = (m_arrUsedSprites[intID1_a].x + m_arrUsedSprites[intID1_a].w * 0.5) - (m_arrUsedSprites[intID1_a].hbx * 0.5);
			intCentreY = (m_arrUsedSprites[intID1_a].y + m_arrUsedSprites[intID1_a].h * 0.5) + (m_arrUsedSprites[intID1_a].hby * 0.5);
			intHBHalf = hbHalf(m_arrUsedSprites[intID1_a], 'hbw');
			intLeft1 = intCentreX - intHBHalf;
			intRight1 = intCentreX + intHBHalf;
			intHBHalf = hbHalf(m_arrUsedSprites[intID1_a], 'hbh');
			intTop1 = intCentreY - intHBHalf;
			intBottom1 = intCentreY + intHBHalf;
		}

		// for sprite 2, top left x, top left y, bottom left x, bottom left y, top right x, top right y, bottom right x, bottom right y
		var strType2 = m_arrUsedSprites[intID2_a].collisiontype;
		var intTop2 = m_arrUsedSprites[intID2_a].y;
		var intBottom2 = m_arrUsedSprites[intID2_a].y + m_arrUsedSprites[intID2_a].h;
		var intLeft2 = m_arrUsedSprites[intID2_a].x;
		var intRight2 = m_arrUsedSprites[intID2_a].x + m_arrUsedSprites[intID2_a].w;
		
		if (strType2 === 'hb')
		{
			// if using hb method then calculate the square as the hb
			intCentreX = (m_arrUsedSprites[intID2_a].x + m_arrUsedSprites[intID2_a].w * 0.5) - (m_arrUsedSprites[intID2_a].hbx * 0.5);
			intCentreY = (m_arrUsedSprites[intID2_a].y + m_arrUsedSprites[intID2_a].h * 0.5) + (m_arrUsedSprites[intID2_a].hby * 0.5);
			intHBHalf = hbHalf(m_arrUsedSprites[intID2_a], 'hbw');
			intLeft2 = intCentreX - intHBHalf;
			intRight2 = intCentreX + intHBHalf;
			intHBHalf = hbHalf(m_arrUsedSprites[intID2_a], 'hbh');
			intTop2 = intCentreY - intHBHalf;
			intBottom2 = intCentreY + intHBHalf;
		}

		if (intLeft1 < intRight2 && intRight1 > intLeft2 && intTop1 < intBottom2 && intBottom1 > intTop2)
		{				
			cb_a(intID1_a, intID2_a, strType1 + '-' + strType2);
		}
	};

	this.collisionDetectIDtoIDs = function(intID_a, arrIDs_a, cb_a)
	{
		var arrResult = [];

		processArray(arrIDs_a, function(intI_a) 
		{
			m_objThis.collisionDetectIDtoID(intID_a, intI_a, function(intID1_a, intID2_a, strType_a)
			{
				arrResult.push({ id1:intID1_a, id2:intID2_a, Type:strType_a });
				cb_a(intID1_a, intID2_a, strType_a);
			});
		});

		return arrResult;
	};

	this.collisionDetectIDstoIDs = function(arrID1s_a, arrIDs2_a, blnBreakOnFirst_a, cb_a)
	{
		var arrResult = [];
		var blnBreak = false;

		processArray(arrID1s_a, function(intI_a) 
		{
			processArray(arrIDs2_a, function(intJ_a) 
			{
				m_objThis.collisionDetectIDtoID(intI_a, intJ_a, function(intID1_a, intID2_a, strType_a)
				{
					arrResult.push({ id1:intID1_a, id2:intID2_a, Type:strType_a });
					if (isFunction(cb_a))
					{
						cb_a(intID1_a, intID2_a, strType_a);
					}
					
					if (blnBreakOnFirst_a)
					{
						blnBreak = true;
					}
				});
				
				return blnBreak;
			});
			
			return blnBreak;
		});

		return arrResult;
	};
	
	this.collisionDetectIDtoN = function(intID_a, strProperty_a, strComparitor_a, intN_a, cb_a)
	{
		// TODO: for the chosen type, if there is a collision between intID_a and N, then cb_a(intID_a, strComparitor_a)
		//		 the collision type is read from the sprite to decide what value to compare with the comparitor
		//		 valid properties, x, y
		//		 valid comparitors, <, >, <=, >=, ==
		//		 usage: collisionDetectIDtoN(1, 'x', '>=', 300, function(id_a, comparitor_a) {});

		// for the sprite, top left x, top left y, bottom left x, bottom left y, top right x, top right y, bottom right x, bottom right y

		var strType = m_arrUsedSprites[intID_a].collisiontype;
		var intTop = m_arrUsedSprites[intID_a].y;
		var intBottom = m_arrUsedSprites[intID_a].y + m_arrUsedSprites[intID_a].h;
		var intLeft = m_arrUsedSprites[intID_a].x;
		var intRight = m_arrUsedSprites[intID_a].x + m_arrUsedSprites[intID_a].w;
		
		var intCentreX = 0;
		var intCentreY = 0;
		var intHBHalf = 0;

		if (strType === 'hb')
		{
			// if using hb method then calculate the square as the hb
			intCentreX = (m_arrUsedSprites[intID_a].x + m_arrUsedSprites[intID_a].w * 0.5) - (m_arrUsedSprites[intID_a].hbx * 0.5);
			intCentreY = (m_arrUsedSprites[intID_a].y + m_arrUsedSprites[intID_a].h * 0.5) + (m_arrUsedSprites[intID_a].hby * 0.5);
			intHBHalf = hbHalf(m_arrUsedSprites[intID_a], 'hbw');
			intLeft = intCentreX - intHBHalf;
			intRight = intCentreX + intHBHalf;
			intHBHalf = hbHalf(m_arrUsedSprites[intID_a], 'hbh');
			intTop = intCentreY - intHBHalf;
			intBottom = intCentreY + intHBHalf;
		}

		var blnResult = false;
		
		var intValue = 0; //if strProperty_a == 'x' and we are checking for > then intValue would be intRight
		if(strProperty_a === 'x') 
		{
			if ((strComparitor_a === '<') || (strComparitor_a === '=<') )
			{
				intValue = intLeft;
			} 
			else if ((strComparitor_a === '>') || (strComparitor_a === '=>') )
			{
				intValue = intRight;
			} 
		} 
		else if(strProperty_a === 'y') 
		{
			if ((strComparitor_a === '<') || (strComparitor_a === '=<') )
			{
				intValue = intTop;
			} 
			else if ((strComparitor_a === '>') || (strComparitor_a === '=>') )
			{
				intValue = intBottom;
			} 
		}

		if(intValue !== undefined)
		{
			switch(strComparitor_a)
			{
				case '>':
					blnResult = intValue > intN_a;
					break;
				case '<':
					blnResult = intValue < intN_a;
					break;
				case '<=':
					blnResult = intValue <= intN_a;
					break;
				case '>=':
					blnResult = intValue >= intN_a;
					break;
				default:
					doNothing();
					break;
			}
		}

		if(blnResult)
		{
			cb_a(intID_a, strType_a, strProperty_a, strComparitor_a);
		}
	};

	this.collisionDetectIDstoN = function(arrIDs_a, strProperty_a, strComparitor_a, intN_a, blnBreakOnFirst_a, cb_a)
	{
		var arrResult = [];
		var blnBreak = false;

		processArray(arrIDs_a, function(intI_a) 
		{
			m_objThis.collisionDetectIDtoN(intI_a, strProperty_a, strComparitor_a, intN_a, function(intID_a, strType_a, strProperty_a, strComparitor_a)
			{
				arrResult.push({ id:intID_a, type:strProperty_a, property:strProperty_a, comparitor:strComparitor_a });
				if (isFunction(cb_a))
				{
					cb_a(intID_a, strType_a, strProperty_a, strComparitor_a);
				}

				if (blnBreakOnFirst_a)
				{
					blnBreak = true;
				}
			});
			
			return blnBreak;
		});

		return arrResult;
	};

	// ====================================================================================================
	// TILES - USAGE
	
	// var m_objTileSet = {
		// tilew:8,
		// tileh:16,
		// columns:16,
		// tilecount:256,
		// imagename:'level1',
		// transparency:0xff00ff
	// };
	
	// var m_objTileMap = { 
		// w:66, 
		// h:14, 
		// tiles:[ 1,1,1,1,1,1,1,1...] 
	// };

	// paint tiles
	this.paintTiles = function(objContext_a, objTileSet_a, objTileMap_a)
	{
		var intImageID = m_objThis.getImageIDByName(objTileSet_a.imagename);
		
		var FIRSTROW = 3;
		var LASTROW = 14;
		
		var intOffsetX = 0;
		var intOffsetY = -(objTileSet_a.tileh * FIRSTROW);
		var intMapX = 0;
		var intMapY = 0;
		var intRows = 0;
		processArray(objTileMap_a.tiles, function(intTileID_a)
		{
			if (intRows < LASTROW)
			{
				if (intRows >= FIRSTROW)
				{
					// paint tile
					var intTileID = intTileID_a - 1;
					var intImageX = Math.floor(intTileID % objTileSet_a.columns) * objTileSet_a.tilew;
					var intImageY = Math.floor(intTileID / objTileSet_a.columns) * objTileSet_a.tileh;
					objContext_a.drawImage(m_arrImageLibrary[intImageID].theimage, 
						intImageX + 1, intImageY + 1, objTileSet_a.tilew - 1, objTileSet_a.tileh - 1, 
						(intMapX * objTileSet_a.tilew) + intOffsetX + 1, (intMapY * objTileSet_a.tileh) + intOffsetY + 1, objTileSet_a.tilew + 1, objTileSet_a.tileh + 1);
				}

				// next tile
				intMapX++;
				if (intMapX >= objTileMap_a.w)
				{
					intRows++;
					intMapY++;
					intMapX = 0;
				}
			}
		});
	};

	// ====================================================================================================
	// DRAWING HELPERS - for games that draw many copies of the same picture (bullets, blocks,
	// letters): nothing to "use" first, just the image library and a position

	// an image by name (null if it isn't loaded)
	this.getImageByName = function(strName_a)
	{
		var objResult = null;
		var intID = getArrayIDByName(m_arrImageLibrary, strName_a);

		if ((intID > 0) && (m_arrImageLibrary[intID].isloaded))
		{
			objResult = m_arrImageLibrary[intID].theimage;
		}

		return objResult;
	};

	// a library image's name, or an image / canvas itself (getTintedImage's): the image to draw
	function imageOf(varImage_a)
	{
		var objResult = varImage_a;
		if (typeof varImage_a === 'string')
		{
			objResult = m_objThis.getImageByName(varImage_a);
		}
		return objResult;
	}

	// stamp a library sprite's frame at x, y without using it (frames are 1-based, as in sequences)
	// strImageName_a is optional: another image with the same layout (a colour variant's name, or an image)
	// intScale_a is optional (1); intFlags_a is optional: SPRITE_MIRRORX, SPRITE_MIRRORY (added)
	this.stampSprite = function(objContext_a, strName_a, intFrame_a, intX_a, intY_a, strImageName_a, intScale_a, intFlags_a)
	{
		var intID = getArrayIDByName(m_arrSpriteLibrary, strName_a);
		var intScale = intScale_a;
		var strImageName = strImageName_a;
		var intFlags = intFlags_a;

		if (intScale === undefined) { intScale = 1; }
		if (intFlags === undefined) { intFlags = 0; }
		if (intID > 0)
		{
			var objSprite = m_arrSpriteLibrary[intID];
			if (strImageName === undefined) { strImageName = objSprite.imagename; }
			var objImage = imageOf(strImageName);
			if (objImage !== null)
			{
				var intImageX = objSprite.imagex + ((intFrame_a - 1) * objSprite.imagew);
				var intW = objSprite.w * intScale;
				var intH = objSprite.h * intScale;
				if (intFlags === 0)
				{
					objContext_a.drawImage(objImage, intImageX, objSprite.imagey, objSprite.imagew, objSprite.imageh, intX_a, intY_a, intW, intH);
				}
				else
				{
					// mirrored: drawn about its own middle
					objContext_a.save();
					objContext_a.translate(intX_a + intW / 2, intY_a + intH / 2);
					objContext_a.scale(((intFlags & SPRITE_MIRRORX) !== 0) ? -1 : 1, ((intFlags & SPRITE_MIRRORY) !== 0) ? -1 : 1);
					objContext_a.drawImage(objImage, intImageX, objSprite.imagey, objSprite.imagew, objSprite.imageh, -intW / 2, -intH / 2, intW, intH);
					objContext_a.restore();
				}
			}
		}
	};

	// paint one tile of a tile set (tile ids 0-based here: the cell's number in the image, left to
	// right, top to bottom) - strImageName_a is optional (a colour variant of the tile set's image)
	this.paintTile = function(objContext_a, objTileSet_a, intTile_a, intX_a, intY_a, strImageName_a, intScale_a)
	{
		var strImageName = strImageName_a;
		var intScale = intScale_a;
		if (strImageName === undefined) { strImageName = objTileSet_a.imagename; }
		if (intScale === undefined) { intScale = 1; }
		var objImage = imageOf(strImageName);
		if (objImage !== null)
		{
			var intImageX = (intTile_a % objTileSet_a.columns) * objTileSet_a.tilew;
			var intImageY = Math.floor(intTile_a / objTileSet_a.columns) * objTileSet_a.tileh;
			objContext_a.drawImage(objImage, intImageX, intImageY, objTileSet_a.tilew, objTileSet_a.tileh, intX_a, intY_a, objTileSet_a.tilew * intScale, objTileSet_a.tileh * intScale);
		}
	};

	// paint text from a font tile set: objFont_a = a tile set whose tile for a character is
	// first + its code - firstcode (e.g. { imagename, tilew:8, tileh:8, columns:16, first:32, firstcode:32 })
	this.paintText = function(objContext_a, objFont_a, str_a, intX_a, intY_a, strImageName_a, intScale_a)
	{
		var intScale = intScale_a;
		if (intScale === undefined) { intScale = 1; }
		for (var intI = 0; intI < str_a.length; intI++)
		{
			var intTile = objFont_a.first + str_a.charCodeAt(intI) - objFont_a.firstcode;
			m_objThis.paintTile(objContext_a, objFont_a, intTile, intX_a + intI * objFont_a.tilew * intScale, intY_a, strImageName_a, intScale);
		}
	};

	// a copy of an image in one colour (every pixel that isn't see-through), made once and kept:
	// for one-colour pictures (letters, shapes) in any colour. Drawing only - nothing is read
	// back from the image, so it works from file:// too
	var m_objTints = {};
	this.getTintedImage = function(strName_a, strColour_a)
	{
		var objResult = null;
		var strKey = strName_a + '|' + strColour_a;

		if (m_objTints[strKey] !== undefined)
		{
			objResult = m_objTints[strKey];
		}
		else
		{
			var objImage = m_objThis.getImageByName(strName_a);
			if (objImage !== null)
			{
				var objCanvas = document.createElement('canvas');
				objCanvas.width = objImage.width;
				objCanvas.height = objImage.height;
				var objContext = objCanvas.getContext('2d');
				objContext.drawImage(objImage, 0, 0);
				objContext.globalCompositeOperation = 'source-in';
				objContext.fillStyle = strColour_a;
				objContext.fillRect(0, 0, objCanvas.width, objCanvas.height);
				m_objTints[strKey] = objCanvas;
				objResult = objCanvas;
			}
		}

		return objResult;
	};

	// big text: a font's letters (an image of the ink alone, as a 16-across sheet of 8 x 8 tiles with
	// a character's tile at its code) z times the size, the top half one colour and the bottom
	// half another, over a shadow intShadow_a pixels down and right (0: none)
	this.paintBigText = function(objContext_a, strInkImage_a, str_a, intX_a, intY_a, intZ_a, strTop_a, strBottom_a, strShadow_a, intShadow_a)
	{
		var arrPasses = [];
		if (intShadow_a > 0) { arrPasses.push([strShadow_a, strShadow_a, intShadow_a]); }
		arrPasses.push([strTop_a, strBottom_a, 0]);
		processArray(arrPasses, function(arrPass_a)
		{
			var objTop = m_objThis.getTintedImage(strInkImage_a, arrPass_a[0]);
			var objBottom = m_objThis.getTintedImage(strInkImage_a, arrPass_a[1]);
			if ((objTop !== null) && (objBottom !== null))
			{
				for (var intI = 0; intI < str_a.length; intI++)
				{
					var intTile = str_a.charCodeAt(intI);
					var intSX = (intTile % 16) * 8;
					var intSY = Math.floor(intTile / 16) * 8;
					var intDX = intX_a + intI * 8 * intZ_a + arrPass_a[2];
					var intDY = intY_a + arrPass_a[2];
					objContext_a.drawImage(objTop, intSX, intSY, 8, 4, intDX, intDY, 8 * intZ_a, 4 * intZ_a);
					objContext_a.drawImage(objBottom, intSX, intSY + 4, 8, 4, intDX, intDY + 4 * intZ_a, 8 * intZ_a, 4 * intZ_a);
				}
			}
		});
	};

	m_objThis.unuseAllSprites();	// always have a dummy sprite used
}

// JSpriteSlots - numbered sprites, as an 8-bit machine's hardware has them: put sprite n at x, y
// showing a library sprite (in a colour variant, scaled, mirrored), hide it, and paint them all
// each frame - the higher numbers on top.
//
// What a sprite does on its own belongs to the sprite, not the game: its library entry holds its
// animation (sequence, delay) and its hit box (collisiontype, hbx, hby, hbsize / hbw, hbh), so the
// game only says what it's doing ("walking left": animate from the walking-left loop) and asks
// whether two things touch.
//
//   var objSlots = new JSpriteSlots(objSprites, 64);
//   objSlots.put(3, 100, 50, 'bug', 1, 'game_s1');     slot 3 shows sprite 'bug' at 100, 50
//   objSlots.animate(3, 1);                            ... and runs its sequence from step 1
//   objSlots.move(3, 102, 50);                         later: just moves (the animation runs on)
//   objSlots.step();                                   once an iteration: every animation a step on
//   if (objSlots.collide(3, 0)) { ... }                do slots 3 and 0 touch?
//   objSlots.setMover(5, function(n, o) { o.vy += 0.2; o.y += o.vy; return o.t > 40; });
//                                                      how slot 5 moves on its own (a falling
//                                                      spark: true when it's done, then it's hidden)
//   objSlots.paint(objContext);                        each frame
//
// A sequence is as JSprites': frame numbers, 0 to stop, -n to go back to step n - so one sequence
// can hold a loop for each thing a sprite does, and animate(n, step) starts the one wanted.
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JSpriteSlots(objSprites_a, intCount_a)
{
	var m_objThis = this;
	var m_arrSlots = [];
	var m_objClip = null;

	for (var intI = 0; intI < intCount_a; intI++)
	{
		m_arrSlots.push({ isvisible:false, x:0, y:0, name:'', sprite:null, frame:1, image:undefined, scale:1, flags:0, isanimated:false, loop:0, next:1, wait:0, delay:0, mover:null, vx:0, vy:0, t:0 });
	}

	// the library sprite a slot shows (null: none)
	function spriteOf(objSlot_a)
	{
		if ((objSlot_a.sprite === null) || (objSlot_a.sprite.name !== objSlot_a.name))
		{
			objSlot_a.sprite = objSprites_a.getSpriteByName(objSlot_a.name);
		}
		return objSlot_a.sprite;
	}

	// a slot's animation one step on: the next frame of its sequence (0 stops it, -n goes back to step n)
	function stepSlot(objSlot_a)
	{
		var objSprite = spriteOf(objSlot_a);
		var intFrame;
		if ((objSprite === null) || (objSprite.sequence === undefined) || (objSlot_a.next < 1) || (objSlot_a.next > objSprite.sequence.length))
		{
			objSlot_a.isanimated = false;
		}
		else
		{
			intFrame = objSprite.sequence[objSlot_a.next - 1];
			if (intFrame < 0)
			{
				objSlot_a.next = -intFrame;
				intFrame = objSprite.sequence[objSlot_a.next - 1];
			}
			if ((intFrame === 0) || (intFrame === undefined))
			{
				objSlot_a.isanimated = false;
			}
			else
			{
				objSlot_a.frame = intFrame;
				objSlot_a.next++;
			}
			if (objSlot_a.delay > 0) { objSlot_a.wait = objSlot_a.delay; }
			else { objSlot_a.wait = ((objSprite.delay === undefined) || (objSprite.delay < 1)) ? 1 : objSprite.delay; }
		}
	}

	// a slot's hit box: { left, top, right, bottom } ('bb': the whole sprite; 'hb': the hit box
	// about its middle, as JSprites works it out - flipped with the sprite when it's mirrored)
	function boxOf(objSlot_a)
	{
		var objSprite = spriteOf(objSlot_a);
		var intW = 16, intH = 16, fltCX, fltCY, fltHW, fltHH, fltHBX;
		var objResult;
		if (objSprite !== null)
		{
			intW = objSprite.w * objSlot_a.scale;
			intH = objSprite.h * objSlot_a.scale;
		}
		if ((objSprite !== null) && (objSprite.collisiontype === 'hb'))
		{
			fltHBX = ((objSlot_a.flags & SPRITE_MIRRORX) !== 0) ? -(objSprite.hbx || 0) : (objSprite.hbx || 0);
			fltCX = objSlot_a.x + intW * 0.5 - fltHBX * 0.5 * objSlot_a.scale;
			fltCY = objSlot_a.y + intH * 0.5 + (objSprite.hby || 0) * 0.5 * objSlot_a.scale;
			fltHW = ((objSprite.hbw !== undefined) ? objSprite.hbw : objSprite.hbsize) * 0.5 * objSlot_a.scale;
			fltHH = ((objSprite.hbh !== undefined) ? objSprite.hbh : objSprite.hbsize) * 0.5 * objSlot_a.scale;
			objResult = { left:fltCX - fltHW, top:fltCY - fltHH, right:fltCX + fltHW, bottom:fltCY + fltHH };
		}
		else
		{
			objResult = { left:objSlot_a.x, top:objSlot_a.y, right:objSlot_a.x + intW, bottom:objSlot_a.y + intH };
		}
		return objResult;
	}

	function overlap(objA_a, objB_a)
	{
		return (objA_a.left < objB_a.right) && (objA_a.right > objB_a.left) && (objA_a.top < objB_a.bottom) && (objA_a.bottom > objB_a.top);
	}

	// ====================================================================================================
	// SHOWING

	// sprite n shows library sprite strName_a at x, y. intFrame_a: a frame (the animation stops);
	// undefined keeps the frame and the animation running when it's the same sprite as before
	// (a new sprite starts on frame 1, not animating). varImage_a, intScale_a, intFlags_a optional:
	// as JSprites.stampSprite
	this.put = function(intN_a, intX_a, intY_a, strName_a, intFrame_a, varImage_a, intScale_a, intFlags_a)
	{
		var objSlot = m_arrSlots[intN_a];
		if (strName_a !== objSlot.name)
		{
			objSlot.name = strName_a;
			objSlot.frame = 1;
			objSlot.isanimated = false;
			objSlot.loop = 0;
		}
		if (intFrame_a !== undefined)
		{
			objSlot.frame = intFrame_a;
			objSlot.isanimated = false;
			objSlot.loop = 0;
		}
		objSlot.isvisible = true;
		objSlot.x = intX_a;
		objSlot.y = intY_a;
		objSlot.image = varImage_a;
		objSlot.scale = (intScale_a === undefined) ? 1 : intScale_a;
		objSlot.flags = (intFlags_a === undefined) ? 0 : intFlags_a;
	};

	// sprite n somewhere else (shown; its look and animation as they are)
	this.move = function(intN_a, intX_a, intY_a)
	{
		var objSlot = m_arrSlots[intN_a];
		objSlot.isvisible = true;
		objSlot.x = intX_a;
		objSlot.y = intY_a;
	};

	// sprite n's colour variant and mirroring (its frame and animation as they are)
	this.look = function(intN_a, varImage_a, intFlags_a)
	{
		var objSlot = m_arrSlots[intN_a];
		objSlot.image = varImage_a;
		objSlot.flags = (intFlags_a === undefined) ? 0 : intFlags_a;
	};

	// sprite n hidden (and its mover stopped)
	this.hide = function(intN_a)
	{
		m_arrSlots[intN_a].isvisible = false;
		m_arrSlots[intN_a].mover = null;
	};

	this.hideRange = function(intFirst_a, intCount_a)
	{
		for (var intI = intFirst_a; (intI < intFirst_a + intCount_a) && (intI < m_arrSlots.length); intI++)
		{
			m_arrSlots[intI].isvisible = false;
			m_arrSlots[intI].mover = null;
		}
	};

	this.isVisible = function(intN_a)
	{
		return m_arrSlots[intN_a].isvisible;
	};

	this.getX = function(intN_a)
	{
		return m_arrSlots[intN_a].x;
	};

	this.getY = function(intN_a)
	{
		return m_arrSlots[intN_a].y;
	};

	this.getFrame = function(intN_a)
	{
		return m_arrSlots[intN_a].frame;
	};

	// ====================================================================================================
	// ANIMATION (the library sprite's sequence and delay)

	// run sprite n's sequence from step intStep_a (1: the start). Already running the loop that
	// starts there: it carries on (call it every frame while something's walking left and it keeps
	// walking) - unless blnRestart_a
	this.animate = function(intN_a, intStep_a, blnRestart_a)
	{
		var objSlot = m_arrSlots[intN_a];
		var intStep = (intStep_a === undefined) ? 1 : intStep_a;
		if ((!objSlot.isanimated) || (objSlot.loop !== intStep) || (blnRestart_a === true))
		{
			objSlot.isanimated = true;
			objSlot.loop = intStep;
			objSlot.next = intStep;
			stepSlot(objSlot);
		}
	};

	// sprite n's animation stopped (on frame intFrame_a, optional: else where it is)
	this.unanimate = function(intN_a, intFrame_a)
	{
		var objSlot = m_arrSlots[intN_a];
		objSlot.isanimated = false;
		objSlot.loop = 0;
		if (intFrame_a !== undefined) { objSlot.frame = intFrame_a; }
	};

	// sprite n's animation at its own pace: a step every intDelay_a iterations (0: the library
	// sprite's delay) - the same sprite faster or slower in different places
	this.setDelay = function(intN_a, intDelay_a)
	{
		m_arrSlots[intN_a].delay = intDelay_a;
	};

	this.isAnimated = function(intN_a)
	{
		return m_arrSlots[intN_a].isanimated;
	};

	// ====================================================================================================
	// MOVEMENT (positions as numbers or functions, as JSprites' show and move; and a slot's own mover)

	// sprites first .. first + count - 1 shown at x, y: numbers, or functions(i, n) giving them
	// (i: 0 for the first of the range) - a row of things, a circle, whatever the functions say
	this.showRange = function(intFirst_a, intCount_a, varX_a, varY_a)
	{
		var intI, intN;
		for (intI = 0; (intI < intCount_a) && (intFirst_a + intI < m_arrSlots.length); intI++)
		{
			intN = intFirst_a + intI;
			m_objThis.move(intN, isFunction(varX_a) ? varX_a(intI, intN) : varX_a, isFunction(varY_a) ? varY_a(intI, intN) : varY_a);
		}
	};

	// sprite n moved by dx, dy (numbers, or functions(n) giving them)
	this.moveBy = function(intN_a, varDX_a, varDY_a)
	{
		var objSlot = m_arrSlots[intN_a];
		objSlot.x += isFunction(varDX_a) ? varDX_a(intN_a) : varDX_a;
		objSlot.y += isFunction(varDY_a) ? varDY_a(intN_a) : varDY_a;
	};

	// sprites first .. first + count - 1 moved by dx, dy (numbers, or functions(i, n) giving them)
	this.moveRangeBy = function(intFirst_a, intCount_a, varDX_a, varDY_a)
	{
		var intI, intN;
		for (intI = 0; (intI < intCount_a) && (intFirst_a + intI < m_arrSlots.length); intI++)
		{
			intN = intFirst_a + intI;
			m_arrSlots[intN].x += isFunction(varDX_a) ? varDX_a(intI, intN) : varDX_a;
			m_arrSlots[intN].y += isFunction(varDY_a) ? varDY_a(intI, intN) : varDY_a;
		}
	};

	// how sprite n moves on its own, each step(): fn_a(n, o) changes o.x, o.y (and o.vx, o.vy, its
	// own speeds; o.flags; o.t counts its steps from 0) and returns true when it's done - the
	// sprite's then hidden. vx, vy: its speeds to start with. null: it stops moving on its own
	this.setMover = function(intN_a, fn_a, fltVX_a, fltVY_a)
	{
		var objSlot = m_arrSlots[intN_a];
		objSlot.mover = isFunction(fn_a) ? fn_a : null;
		objSlot.vx = (fltVX_a === undefined) ? 0 : fltVX_a;
		objSlot.vy = (fltVY_a === undefined) ? 0 : fltVY_a;
		objSlot.t = 0;
	};

	this.hasMover = function(intN_a)
	{
		return (m_arrSlots[intN_a].mover !== null);
	};

	// once an iteration: every running animation a step on (each at its sprite's delay), every
	// shown sprite with a mover moved
	this.step = function()
	{
		var intN = 0;
		processArray(m_arrSlots, function(objSlot_a)
		{
			var objMotion;
			if (objSlot_a.isvisible && (objSlot_a.mover !== null))
			{
				objMotion = { x:objSlot_a.x, y:objSlot_a.y, vx:objSlot_a.vx, vy:objSlot_a.vy, flags:objSlot_a.flags, t:objSlot_a.t };
				if (objSlot_a.mover(intN, objMotion) === true)
				{
					objSlot_a.isvisible = false;
					objSlot_a.mover = null;
				}
				objSlot_a.x = objMotion.x; objSlot_a.y = objMotion.y; objSlot_a.vx = objMotion.vx; objSlot_a.vy = objMotion.vy;
				objSlot_a.flags = objMotion.flags; objSlot_a.t = objMotion.t + 1;
			}
			intN++;
		});
		processArray(m_arrSlots, function(objSlot_a)
		{
			if (objSlot_a.isanimated)
			{
				objSlot_a.wait--;
				if (objSlot_a.wait <= 0)
				{
					stepSlot(objSlot_a);
				}
			}
		});
	};

	// ====================================================================================================
	// COLLISIONS (the library sprite's hit box: collisiontype 'bb' or 'hb', as JSprites)

	// do shown sprites n and m touch?
	this.collide = function(intN_a, intM_a)
	{
		var objA = m_arrSlots[intN_a], objB = m_arrSlots[intM_a];
		return objA.isvisible && objB.isvisible && (intN_a !== intM_a) && overlap(boxOf(objA), boxOf(objB));
	};

	// the shown sprites from intFirst_a (intCount_a of them) that sprite n touches, nearest the
	// start first; cb_a(n, m) for each, optional - return true from it to stop looking
	this.collideRange = function(intN_a, intFirst_a, intCount_a, cb_a)
	{
		var arrResult = [];
		var blnStop = false;
		var intM;
		for (intM = intFirst_a; (intM < intFirst_a + intCount_a) && (intM < m_arrSlots.length) && !blnStop; intM++)
		{
			if (m_objThis.collide(intN_a, intM))
			{
				arrResult.push(intM);
				if (isFunction(cb_a)) { blnStop = (cb_a(intN_a, intM) === true); }
			}
		}
		return arrResult;
	};

	// does shown sprite n touch a rectangle (a beam, a wall, a zone)?
	this.collideRect = function(intN_a, intX_a, intY_a, intW_a, intH_a)
	{
		var objSlot = m_arrSlots[intN_a];
		return objSlot.isvisible && overlap(boxOf(objSlot), { left:intX_a, top:intY_a, right:intX_a + intW_a, bottom:intY_a + intH_a });
	};

	// sprite n's hit box now: { left, top, right, bottom }
	this.getBox = function(intN_a)
	{
		return boxOf(m_arrSlots[intN_a]);
	};

	// ====================================================================================================
	// PAINTING

	// the sprites only drawn inside a rectangle (as a machine's sprite clip window); none: everywhere
	this.setClip = function(intX_a, intY_a, intW_a, intH_a)
	{
		m_objClip = { x:intX_a, y:intY_a, w:intW_a, h:intH_a };
	};

	this.clearClip = function()
	{
		m_objClip = null;
	};

	// every shown sprite, sprite 0 first (so the higher numbers end up on top)
	this.paint = function(objContext_a)
	{
		objContext_a.save();
		if (m_objClip !== null)
		{
			objContext_a.beginPath();
			objContext_a.rect(m_objClip.x, m_objClip.y, m_objClip.w, m_objClip.h);
			objContext_a.clip();
		}
		processArray(m_arrSlots, function(objSlot_a)
		{
			if (objSlot_a.isvisible)
			{
				objSprites_a.stampSprite(objContext_a, objSlot_a.name, objSlot_a.frame, objSlot_a.x, objSlot_a.y, objSlot_a.image, objSlot_a.scale, objSlot_a.flags);
			}
		});
		objContext_a.restore();
	};
}
