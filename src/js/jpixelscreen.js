// jpixelscreen.js - JPixelScreen: a screen of pixels, one byte each (8-bit RRRGGGBB colours, as a
// ZX Spectrum Next's Layer 2), drawn on with plot / span / rect / line, and painted onto the frame
// in horizontal bands that can each be scrolled sideways (wrapping round), as a copper or a
// raster interrupt scrolls part of a screen.
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
//
//	var objL2 = new JPixelScreen({ w:256, h:192, transparent:0 });
//	objL2.plot(10, 20, 0xFC);
//	objL2.paint(objContext, 32, 32);						// all of it, no scroll
//	objL2.paint(objContext, 32, 32, [ { y:0, h:44, scroll:0 }, { y:44, h:148, scroll:intCam } ]);
//
// Options: w, h (the size: 256 x 192 by default), transparent (a colour number drawn as nothing,
// so what's behind shows: default -1, none). Only the lines drawn on since the last paint are
// turned into colour again. A palette entry can be changed (setColour) as a machine's palette is:
// every pixel of that number changes.
function JPixelScreen(objOptions_a)
{
	var m_objThis = this;
	var objO = objOptions_a || {};
	var m_intW = (objO.w === undefined) ? 256 : objO.w;
	var m_intH = (objO.h === undefined) ? 192 : objO.h;
	var m_intTransparent = (objO.transparent === undefined) ? -1 : objO.transparent;
	// (added) transparentcolour: a RRRGGGBB colour drawn as nothing whatever number shows it (the
	// Next's global transparency: a palette entry faded to it goes see-through). Default -1, none
	var m_intTransparentColour = (objO.transparentcolour === undefined) ? -1 : objO.transparentcolour;
	var m_arrPixels = new Uint8Array(m_intW * m_intH);
	var m_arrDirty = [];
	var m_blnAllDirty = true;
	var m_objCanvas = document.createElement('canvas');
	var m_objContext;
	var m_objImage;
	var m_arrPal = new Uint32Array(256);
	var m_arrPalSet = [];
	var intI;

	m_objCanvas.width = m_intW;
	m_objCanvas.height = m_intH;
	m_objContext = m_objCanvas.getContext('2d');
	m_objImage = m_objContext.createImageData(m_intW, m_intH);
	for (intI = 0; intI < m_intH; intI++)
	{
		m_arrDirty.push(true);
	}
	for (intI = 0; intI < 256; intI++)
	{
		m_arrPalSet.push(-1);
	}

	// the RGBA (as a little-endian 32-bit word) of colour number n
	function makePalette()
	{
		var intN, intC, intR, intG, intB, intB2;
		for (intN = 0; intN < 256; intN++)
		{
			intC = (m_arrPalSet[intN] >= 0) ? m_arrPalSet[intN] : intN;
			intR = Math.floor(((intC >> 5) & 7) * 255 / 7);
			intG = Math.floor(((intC >> 2) & 7) * 255 / 7);
			intB2 = intC & 3;
			intB = Math.floor((((intB2 << 1) | (intB2 !== 0 ? 1 : 0)) * 255) / 7);
			m_arrPal[intN] = ((intN === m_intTransparent) || (intC === m_intTransparentColour)) ? 0 : (((255 << 24) | (intB << 16) | (intG << 8) | intR) >>> 0);
		}
	}
	makePalette();

	this.getWidth = function()
	{
		return m_intW;
	};

	this.getHeight = function()
	{
		return m_intH;
	};

	// colour number n shows as RRRGGGBB colour c (-1: as its own number again)
	this.setColour = function(intN_a, intC_a)
	{
		if (m_arrPalSet[intN_a] !== intC_a)
		{
			m_arrPalSet[intN_a] = intC_a;
			makePalette();
			m_blnAllDirty = true;
		}
	};

	// (added) many at once: arrColours_a[n] is colour number n's RRRGGGBB colour (-1: its own)
	this.setColours = function(arrColours_a)
	{
		var blnChanged = false;
		for (var intN = 0; intN < arrColours_a.length; intN++)
		{
			if (m_arrPalSet[intN] !== arrColours_a[intN])
			{
				m_arrPalSet[intN] = arrColours_a[intN];
				blnChanged = true;
			}
		}
		if (blnChanged)
		{
			makePalette();
			m_blnAllDirty = true;
		}
	};

	this.plot = function(intX_a, intY_a, intC_a)
	{
		if ((intX_a >= 0) && (intX_a < m_intW) && (intY_a >= 0) && (intY_a < m_intH))
		{
			m_arrPixels[intY_a * m_intW + intX_a] = intC_a;
			m_arrDirty[intY_a] = true;
		}
	};

	// the colour number at x, y (-1 outside)
	this.get = function(intX_a, intY_a)
	{
		var intResult = -1;
		if ((intX_a >= 0) && (intX_a < m_intW) && (intY_a >= 0) && (intY_a < m_intH))
		{
			intResult = m_arrPixels[intY_a * m_intW + intX_a];
		}
		return intResult;
	};

	// w pixels of colour c from x, y (clipped to the screen)
	this.span = function(intX_a, intY_a, intW_a, intC_a)
	{
		var intX0 = Math.max(0, intX_a);
		var intX1 = Math.min(m_intW, intX_a + intW_a);
		if ((intY_a >= 0) && (intY_a < m_intH) && (intX1 > intX0))
		{
			var intP = intY_a * m_intW;
			for (var intX = intX0; intX < intX1; intX++)
			{
				m_arrPixels[intP + intX] = intC_a;
			}
			m_arrDirty[intY_a] = true;
		}
	};

	this.rect = function(intX_a, intY_a, intW_a, intH_a, intC_a)
	{
		for (var intY = intY_a; intY < intY_a + intH_a; intY++)
		{
			m_objThis.span(intX_a, intY, intW_a, intC_a);
		}
	};

	this.clear = function(intC_a)
	{
		var intC = (intC_a === undefined) ? 0 : intC_a;
		for (var intP = 0; intP < m_intW * m_intH; intP++)
		{
			m_arrPixels[intP] = intC;
		}
		m_blnAllDirty = true;
	};

	// a line from x0, y0 to x1, y1 (Bresenham, both ends drawn)
	this.line = function(intX0_a, intY0_a, intX1_a, intY1_a, intC_a)
	{
		var intX = intX0_a, intY = intY0_a;
		var intDX = Math.abs(intX1_a - intX0_a), intDY = -Math.abs(intY1_a - intY0_a);
		var intSX = (intX0_a < intX1_a) ? 1 : -1, intSY = (intY0_a < intY1_a) ? 1 : -1;
		var intE = intDX + intDY, intE2;
		var blnDone = false;
		while (!blnDone)
		{
			m_objThis.plot(intX, intY, intC_a);
			if ((intX === intX1_a) && (intY === intY1_a))
			{
				blnDone = true;
			}
			else
			{
				intE2 = intE * 2;
				if (intE2 >= intDY) { intE += intDY; intX += intSX; }
				if (intE2 <= intDX) { intE += intDX; intY += intSY; }
			}
		}
	};

	// copy an image's pixels in (an RGBA canvas or image already in RRRGGGBB colours: each pixel
	// is turned into its nearest number; fully see-through pixels become colour c0)
	this.fromImage = function(objImage_a, intC0_a)
	{
		var objC = document.createElement('canvas');
		objC.width = m_intW; objC.height = m_intH;
		var objX = objC.getContext('2d');
		objX.drawImage(objImage_a, 0, 0);
		var arrD = objX.getImageData(0, 0, m_intW, m_intH).data;
		var intP, intR, intG, intB;
		for (intP = 0; intP < m_intW * m_intH; intP++)
		{
			if (arrD[intP * 4 + 3] < 128)
			{
				m_arrPixels[intP] = (intC0_a === undefined) ? 0 : intC0_a;
			}
			else
			{
				intR = Math.round(arrD[intP * 4] * 7 / 255);
				intG = Math.round(arrD[intP * 4 + 1] * 7 / 255);
				intB = Math.round(arrD[intP * 4 + 2] * 3 / 255);
				m_arrPixels[intP] = (intR << 5) | (intG << 2) | intB;
			}
		}
		m_blnAllDirty = true;
	};

	// the pixels themselves (a Uint8Array, w * h, row by row): call touch() after writing to it
	this.getPixels = function()
	{
		return m_arrPixels;
	};

	this.touch = function(intY_a)
	{
		if (intY_a === undefined) { m_blnAllDirty = true; } else { m_arrDirty[intY_a] = true; }
	};

	// the screen as a canvas (its lines brought up to date)
	this.getCanvas = function()
	{
		var objWords = new Uint32Array(m_objImage.data.buffer);
		var intY, intX, intP, blnAny = false;
		for (intY = 0; intY < m_intH; intY++)
		{
			if (m_blnAllDirty || m_arrDirty[intY])
			{
				intP = intY * m_intW;
				for (intX = 0; intX < m_intW; intX++)
				{
					objWords[intP + intX] = m_arrPal[m_arrPixels[intP + intX]];
				}
				m_arrDirty[intY] = false;
				blnAny = true;
			}
		}
		m_blnAllDirty = false;
		if (blnAny)
		{
			m_objContext.putImageData(m_objImage, 0, 0);
		}
		return m_objCanvas;
	};

	// onto the frame at x, y; arrBands_a optional: [{ y, h, scroll }] - lines y .. y + h - 1 shown
	// moved left by scroll pixels, wrapping round (what's at x + scroll shows at x)
	this.paint = function(objContext_a, intX_a, intY_a, arrBands_a)
	{
		var objCanvas = m_objThis.getCanvas();
		if (arrBands_a === undefined)
		{
			objContext_a.drawImage(objCanvas, intX_a, intY_a);
		}
		else
		{
			processArray(arrBands_a, function(objBand_a)
			{
				var intS = ((objBand_a.scroll % m_intW) + m_intW) % m_intW;
				var intY0 = Math.max(0, objBand_a.y);
				var intH = Math.min(m_intH, objBand_a.y + objBand_a.h) - intY0;
				if (intH > 0)
				{
					objContext_a.drawImage(objCanvas, intS, intY0, m_intW - intS, intH, intX_a, intY_a + intY0, m_intW - intS, intH);
					if (intS > 0)
					{
						objContext_a.drawImage(objCanvas, 0, intY0, intS, intH, intX_a + m_intW - intS, intY_a + intY0, intS, intH);
					}
				}
			});
		}
	};
}
