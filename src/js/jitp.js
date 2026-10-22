function JITP()
{
	var DEF_CALLSPERSECOND = 3;	// calls per second
	var DEF_URI = 'http://localhost/8bitology/net/ws.php';

	var m_intCPS = 0;
	var m_intCPSCounter = 0;
	var m_intCPSTimer = 0;
	var m_objTimer;
	var m_objOptions;

	var m_blnInCall = false;
	var m_intCallID = 0;
	
	function ajaxCall(strParameters_a, cbSuccess_a, cbFailure_a)
	{
		m_intCallID++;
		
		var objXHR = new XMLHttpRequest();
		objXHR.open('GET', m_objOptions.uri + '?id=' + m_intCallID + strParameters_a);
		
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
	
	function processCall()
	{
		//console.log('processCall');

		if (!m_blnInCall)
		{
			m_blnInCall = true;
			
			var intCPSTimer = performance.now();
			if (intCPSTimer - m_intCPSTimer <= 1000)
			{
				m_intCPSCounter++;
			}
			else
			{
				if (m_intCPSCounter > 0)
				{
					m_intCPS = m_intCPSCounter;
					m_intCPSCounter = 0;
				}
				
				m_intCPSTimer = intCPSTimer;
			}
			
			var strParameters = '';
			if (isFunction(m_objOptions.cbOnGetParameters))
			{
				strParameters = m_objOptions.cbOnGetParameters();
			}
			else
			{
				strParameters = m_objOptions.cbOnGetParameters;
			}

			ajaxCall(strParameters, function(objResponse_a)
			{
				if (isFunction(m_objOptions.cbOnProcess))
				{
					m_objOptions.cbOnProcess(m_intCallID, m_intCPS, objResponse_a);
				}
				m_blnInCall = false;
			},
			function(strResponse_a)
			{
				console.log(strResponse_a);	// FAILURE, FOR NOW DON'T DO ANYTHING
				m_blnInCall = false;
			});
		}
		else
		{
			// in a call so we have a process notification
			if (isFunction(m_objOptions.cbOnProcess))
			{
				m_objOptions.cbOnProcess(m_intCallID, m_intCPS);
			}
		}
	}

	this.process = function(objOptions_a)
	{
		m_objOptions = objOptions_a;
		
		if (m_objOptions.callspersecond == undefined) { m_objOptions.callspersecond = DEF_CALLSPERSECOND; }
		if (m_objOptions.uri == undefined) { m_objOptions.uri = DEF_URI; }
		
		m_objTimer = setInterval(function()
		{ 
			processCall();
		}, 1000 / m_objOptions.callspersecond);
		
		//m_objTimer = setInterval(processCall);
	};
}
