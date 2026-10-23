
function isFunction(fn_a) 
{
	var getType = {};
	return fn_a && getType.toString.call(fn_a) === '[object Function]';
}

function processArray(arr_a, cb_a)
{
	if (arr_a !== null)
	{
		var intRowNum = 1;
		var intI = 0;
		var blnAbort = false;
		while ((!blnAbort) && (intI < arr_a.length))
		{
			if (arr_a[intI] !== undefined)
			{
				if (isFunction(cb_a))
				{
					blnAbort = cb_a(arr_a[intI], intRowNum, intI);
				}
			}
			intRowNum++;
			intI++;
		}
	}
}

// an 8-bit colour RRRGGGBB (the ZX Spectrum Next's, an MSX2's ...) as a CSS colour
function rgb332ToCSS(int_a)
{
	var intR = Math.floor(((int_a >> 5) & 7) * 255 / 7);
	var intG = Math.floor(((int_a >> 2) & 7) * 255 / 7);
	var intB2 = int_a & 3;
	var intB = Math.floor((((intB2 << 1) | (intB2 !== 0 ? 1 : 0)) * 255) / 7);
	return 'rgb(' + intR + ',' + intG + ',' + intB + ')';
}

// a whole number 0 .. n-1 at random (BASIC's Rnd(n))
function rnd(int_a)
{
	return Math.floor(Math.random() * int_a);
}

// BASIC's Str$: a number with a space in front unless it's negative
function strBasic(int_a)
{
	var strResult = String(Math.floor(int_a));
	if (int_a >= 0)
	{
		strResult = ' ' + strResult;
	}
	return strResult;
}

// BASIC's Right$: the last n characters
function rightStr(str_a, int_a)
{
	var strResult = str_a;
	if (str_a.length > int_a)
	{
		strResult = str_a.substr(str_a.length - int_a);
	}
	return strResult;
}

// a held direction that repeats like a keyboard: once at once, then after intFirst_a iterations,
// then every intNext_a (moving a pointer round a menu or a board one step at a time)
//   var objRepeat = new JRepeat(14, 6);
//   each iteration:  intStep = objRepeat.next(intHeld);   (intHeld: 0 for none, or any number)
function JRepeat(intFirst_a, intNext_a)
{
	var m_intT = 0;

	this.next = function(intHeld_a)
	{
		var intResult = 0;
		if (intHeld_a === 0)
		{
			m_intT = 0;
		}
		else if (m_intT === 0)
		{
			m_intT = intFirst_a;
			intResult = intHeld_a;
		}
		else
		{
			m_intT--;
			if (m_intT === 0)
			{
				m_intT = intNext_a;
				intResult = intHeld_a;
			}
		}
		return intResult;
	};
}
