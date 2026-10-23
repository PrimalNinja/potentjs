// TODO:
//
//		Events of different types, such as Time Elapsed, server event? collision?
//		
function JGameLoop()
{
	var DEF_ITERATIONSPERSECOND = 60;	// frames per second

	var m_arrKeyMap = [];
	var m_arrKeySeen = [];			// has an iteration seen the key down yet? (a quick tap isn't lost between iterations)
	var m_arrKeyRelease = [];		// let go before any iteration saw it: let go after the next one
	var m_blnEnableKeys = true;
	var m_blnPauseIfHidden = true;		// the page not in the foreground (another tab, minimised, phone locked): no iterations
	var m_intIPS = 0;
	var m_intIPSCounter = 0;
	var m_intIPSTimer = 0;
	var m_objTimer;
	var m_objOptions;
	
	function processIteration()
	{
		//console.log('processIteration');

		if (!(m_blnPauseIfHidden && isHidden()))
		{
			iterate();
		}
	}

	// is the page out of the foreground?
	function isHidden()
	{
		return (document.hidden === true) || (document.webkitHidden === true);
	}

	function iterate()
	{
		var intIPSTimer = performance.now();
		if (intIPSTimer - m_intIPSTimer <= 1000)
		{
			m_intIPSCounter++;
		}
		else
		{
			if (m_intIPSCounter > 0)
			{
				m_intIPS = m_intIPSCounter;
				m_intIPSCounter = 0;
			}
			
			m_intIPSTimer = intIPSTimer;
		}
		
		if (isFunction(m_objOptions.cbOnIteration))
		{
			m_objOptions.cbOnIteration(m_arrKeyMap, m_intIPS);
		}

		// the keys down now have been seen; ones let go too quickly to be seen go now
		for (var intI = 0; intI < m_arrKeyMap.length; intI++)
		{
			if (m_arrKeyRelease[intI])
			{
				m_arrKeyRelease[intI] = false;
				m_arrKeyMap[intI] = -1;
			}
			m_arrKeySeen[intI] = true;
		}
	}

	this.process = function(objOptions_a)
	{
		m_objOptions = objOptions_a;
		
		if (m_objOptions.iterationspersecond == undefined) { m_objOptions.iterationspersecond = DEF_ITERATIONSPERSECOND; }
		if (m_objOptions.enablekeys !== undefined) { m_blnEnableKeys = m_objOptions.enablekeys; }
		if (m_objOptions.pauseifhidden !== undefined) { m_blnPauseIfHidden = m_objOptions.pauseifhidden; }

		// initialise the keymap
		for (var intI = 0; intI < 255; intI++) 
		{
			m_arrKeyMap.push(-1);
			m_arrKeySeen.push(true);
			m_arrKeyRelease.push(false);
		}
		
		m_objTimer = setInterval(function()
		{ 
			processIteration();
		}, 1000 / m_objOptions.iterationspersecond);
		
		if(m_blnEnableKeys)
		{
			window.addEventListener("keydown", function(e)
			{
				var event = window.event ? window.event : e;
				if (m_arrKeyMap[event.keyCode] !== 0)
				{
					m_arrKeySeen[event.keyCode] = false;
				}
				m_arrKeyMap[event.keyCode] = 0;
				m_arrKeyRelease[event.keyCode] = false;
			});
			
			window.addEventListener("keyup", function(e)
			{
				var event = window.event ? window.event : e;
				if (m_arrKeySeen[event.keyCode])
				{
					m_arrKeyMap[event.keyCode] = -1;
				}
				else
				{
					m_arrKeyRelease[event.keyCode] = true;
				}
			});
		}
		//m_objTimer = setInterval(processIteration);
	};

	// is the game paused because the page isn't in the foreground?
	this.isPaused = function()
	{
		return m_blnPauseIfHidden && isHidden();
	};
}
