// JSteps - runs a game written as steps and waits, one game-loop iteration at a time. Old games
// (BASIC especially) are full of "do this, wait 40 frames, do that, loop until a key": JSteps
// keeps that shape without blocking the browser.
//
//   var objSteps = new JSteps();
//   objSteps.call(function() { say('READY'); });      a step: runs once
//   objSteps.wait(40);                                 40 iterations of nothing
//   objSteps.until(function() { return fire(); });     runs once an iteration until it returns true
//   each iteration:  objSteps.update();
//
// Steps added while a step runs go in front of what's left (a sub that calls a sub), so a step
// can be a whole routine:
//   function attack() { objSteps.call(flash); objSteps.wait(30); objSteps.call(redraw); }
// and an until step that adds steps runs them before it's called again: a menu loop can start
// an animation and carry on afterwards.
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JSteps()
{
	var m_arrQueue = [];
	var m_arrAdded = null;		// steps added by the step running now (null: none running)
	var m_intIteration = 0;

	function add(objStep_a)
	{
		if (m_arrAdded !== null)
		{
			m_arrAdded.push(objStep_a);
		}
		else
		{
			m_arrQueue.push(objStep_a);
		}
	}

	// run a step's function, the steps it adds put in front; returns what the function returned
	function run(fn_a)
	{
		var arrWas = m_arrAdded;
		var varResult;

		m_arrAdded = [];
		varResult = fn_a();
		m_arrQueue = m_arrAdded.concat(m_arrQueue);
		m_arrAdded = arrWas;

		return varResult;
	}

	this.call = function(fn_a)
	{
		add({ type:'call', fn:fn_a });
	};

	this.wait = function(intIterations_a)
	{
		add({ type:'wait', left:intIterations_a });
	};

	this.until = function(fn_a)
	{
		add({ type:'until', fn:fn_a, ran:-1 });
	};

	// everything still to do forgotten (a new game)
	this.clear = function()
	{
		m_arrQueue = [];
		if (m_arrAdded !== null) { m_arrAdded = []; }
	};

	this.isBusy = function()
	{
		return (m_arrQueue.length > 0);
	};

	// once an iteration: steps run until a wait, or an until that isn't done yet
	this.update = function()
	{
		var blnGo = true;
		var objStep, intBefore;

		m_intIteration++;
		while (blnGo && (m_arrQueue.length > 0))
		{
			objStep = m_arrQueue[0];
			if (objStep.type === 'wait')
			{
				if (objStep.left > 0)
				{
					objStep.left--;
					blnGo = false;
				}
				if (objStep.left <= 0)
				{
					m_arrQueue.shift();
				}
			}
			else if (objStep.type === 'call')
			{
				m_arrQueue.shift();
				run(objStep.fn);
			}
			else if (objStep.ran === m_intIteration)
			{
				// an until runs once an iteration at most
				blnGo = false;
			}
			else
			{
				objStep.ran = m_intIteration;
				intBefore = m_arrQueue.length;
				if (run(objStep.fn) === true)
				{
					m_arrQueue.splice(m_arrQueue.indexOf(objStep), 1);
				}
				else if (m_arrQueue.length === intBefore)
				{
					blnGo = false;
				}
			}
		}
	};
}
