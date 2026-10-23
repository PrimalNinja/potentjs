// JTileGrid - a screen of tiles: w x h cells, each a tile and a colour variant (which image of
// the tile set it comes from: the same tiles in other colours), plus text from the tile set's
// font. Like an 8-bit machine's text / tile screen.
//
// The cells are drawn at 1:1 into the grid's own canvas, and only the cells that changed since
// the last paint are drawn again; paint() then puts the whole grid onto the game's canvas in one
// drawImage - so a large backdrop is one picture, already joined, never tiles scaled one by one.
//
// objOptions_a:
//   w, h            cells across and down
//   tilew, tileh    a cell's size in pixels
//   columns         tiles across in the tile set's images
//   images          the tile set's images by variant: [ 'tiles0', 'tiles1', ... ] (JSprites names)
//   first, firstcode   the font: character code firstcode is tile first (e.g. 32, 32)
//   transparent     optional tile id drawn as nothing (see-through to what's behind the grid)
//
// (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
function JTileGrid(objSprites_a, objOptions_a)
{
	var m_objThis = this;
	var m_objSprites = objSprites_a;
	var m_objOptions = objOptions_a;
	var m_arrTiles = [];
	var m_arrVariants = [];
	var m_arrDirty = [];
	var m_blnAllDirty = true;
	var m_objCanvas = document.createElement('canvas');
	var m_objContext;

	if (m_objOptions.first === undefined) { m_objOptions.first = 32; }
	if (m_objOptions.firstcode === undefined) { m_objOptions.firstcode = 32; }
	if (m_objOptions.transparent === undefined) { m_objOptions.transparent = -1; }

	m_objCanvas.width = m_objOptions.w * m_objOptions.tilew;
	m_objCanvas.height = m_objOptions.h * m_objOptions.tileh;
	m_objContext = m_objCanvas.getContext('2d');
	m_objContext.imageSmoothingEnabled = false;

	for (var intI = 0; intI < m_objOptions.w * m_objOptions.h; intI++)
	{
		m_arrTiles.push(m_objOptions.transparent);
		m_arrVariants.push(0);
		m_arrDirty.push(true);
	}

	// put tile intTile_a in variant intVariant_a at cell x, y (outside the grid: nothing)
	this.put = function(intX_a, intY_a, intTile_a, intVariant_a)
	{
		if ((intX_a >= 0) && (intX_a < m_objOptions.w) && (intY_a >= 0) && (intY_a < m_objOptions.h))
		{
			var intCell = intY_a * m_objOptions.w + intX_a;
			var intVariant = intVariant_a;
			if (intVariant === undefined) { intVariant = 0; }
			if ((m_arrTiles[intCell] !== intTile_a) || (m_arrVariants[intCell] !== intVariant))
			{
				m_arrTiles[intCell] = intTile_a;
				m_arrVariants[intCell] = intVariant;
				m_arrDirty[intCell] = true;
			}
		}
	};

	// the tile at x, y (-1 outside the grid)
	this.get = function(intX_a, intY_a)
	{
		var intResult = -1;
		if ((intX_a >= 0) && (intX_a < m_objOptions.w) && (intY_a >= 0) && (intY_a < m_objOptions.h))
		{
			intResult = m_arrTiles[intY_a * m_objOptions.w + intX_a];
		}
		return intResult;
	};

	// the variant at x, y (-1 outside the grid)
	this.getVariant = function(intX_a, intY_a)
	{
		var intResult = -1;
		if ((intX_a >= 0) && (intX_a < m_objOptions.w) && (intY_a >= 0) && (intY_a < m_objOptions.h))
		{
			intResult = m_arrVariants[intY_a * m_objOptions.w + intX_a];
		}
		return intResult;
	};

	// text from cell x, y on (a character a cell)
	this.text = function(intX_a, intY_a, str_a, intVariant_a)
	{
		for (var intI = 0; intI < str_a.length; intI++)
		{
			m_objThis.put(intX_a + intI, intY_a, m_objOptions.first + str_a.charCodeAt(intI) - m_objOptions.firstcode, intVariant_a);
		}
	};

	// a block of one tile
	this.rect = function(intX_a, intY_a, intW_a, intH_a, intTile_a, intVariant_a)
	{
		for (var intY = intY_a; intY < intY_a + intH_a; intY++)
		{
			for (var intX = intX_a; intX < intX_a + intW_a; intX++)
			{
				m_objThis.put(intX, intY, intTile_a, intVariant_a);
			}
		}
	};

	// every cell one tile (default: the see-through one)
	this.clear = function(intTile_a, intVariant_a)
	{
		var intTile = intTile_a;
		if (intTile === undefined) { intTile = m_objOptions.transparent; }
		m_objThis.rect(0, 0, m_objOptions.w, m_objOptions.h, intTile, intVariant_a);
	};

	// a variant's image changed (another set of colours for the same tiles): drawn again
	this.setImage = function(intVariant_a, strName_a)
	{
		m_objOptions.images[intVariant_a] = strName_a;
		for (var intI = 0; intI < m_arrTiles.length; intI++)
		{
			if (m_arrVariants[intI] === intVariant_a) { m_arrDirty[intI] = true; }
		}
	};

	// draw everything again at the next paint (after the images have loaded)
	this.invalidate = function()
	{
		m_blnAllDirty = true;
	};

	// (added) the grid's canvas in scrolled bands
	function paintBands(objContext_a, intX_a, intY_a, arrBands_a)
	{
		var intW = m_objCanvas.width;
		var intHt = m_objCanvas.height;
		processArray(arrBands_a, function(objBand_a)
		{
			var intS = ((objBand_a.scroll % intW) + intW) % intW;
			var intY0 = Math.max(0, objBand_a.y);
			var intH = Math.min(intHt, objBand_a.y + objBand_a.h) - intY0;
			if (intH > 0)
			{
				objContext_a.drawImage(m_objCanvas, intS, intY0, intW - intS, intH, intX_a, intY_a + intY0, intW - intS, intH);
				if (intS > 0)
				{
					objContext_a.drawImage(m_objCanvas, 0, intY0, intS, intH, intX_a + intW - intS, intY_a + intY0, intS, intH);
				}
			}
		});
	}

	// the grid onto objContext_a at x, y: the changed cells first into the grid's own canvas.
	// arrBands_a (added, optional): [{ y, h, scroll }] - only lines y .. y + h - 1 drawn, each band
	// moved left by scroll pixels, wrapping round (a tilemap scrolled by a copper or a raster
	// interrupt: what's at x + scroll shows at x)
	this.paint = function(objContext_a, intX_a, intY_a, arrBands_a)
	{
		var intW = m_objOptions.tilew;
		var intH = m_objOptions.tileh;
		var arrImages = [];
		var blnReady = true;

		// (a variant whose image isn't there - a name wrong, still loading - draws as variant 0)
		for (var intI = 0; intI < m_objOptions.images.length; intI++)
		{
			arrImages.push(m_objSprites.getImageByName(m_objOptions.images[intI]));
		}
		if (arrImages[0] === null)
		{
			blnReady = false;
		}

		if (blnReady)
		{
			for (var intC = 0; intC < m_arrTiles.length; intC++)
			{
				if (m_blnAllDirty || m_arrDirty[intC])
				{
					var intX = (intC % m_objOptions.w) * intW;
					var intY = Math.floor(intC / m_objOptions.w) * intH;
					var intTile = m_arrTiles[intC];
					m_objContext.clearRect(intX, intY, intW, intH);
					if ((intTile >= 0) && (intTile !== m_objOptions.transparent))
					{
						var objImage = arrImages[m_arrVariants[intC]];
						if ((objImage === undefined) || (objImage === null)) { objImage = arrImages[0]; }
						m_objContext.drawImage(objImage, (intTile % m_objOptions.columns) * intW, Math.floor(intTile / m_objOptions.columns) * intH, intW, intH, intX, intY, intW, intH);
					}
					m_arrDirty[intC] = false;
				}
			}
			m_blnAllDirty = false;
			if (arrBands_a === undefined)
			{
				objContext_a.drawImage(m_objCanvas, intX_a, intY_a);
			}
			else
			{
				paintBands(objContext_a, intX_a, intY_a, arrBands_a);
			}
		}
	};
}
