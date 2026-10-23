# nextgfx.py - a ZX Spectrum Next game's graphics (made by its tools/art_*.py: gfx/tiles.png,
# sprites.png, tile_pal.png, spr_pal.png, layout.txt) as images for the JS framework:
#
#   images/<game>/tiles_<n>.png    the tiles in palette row n (the Next colours a tilemap cell by
#                                  a palette row: here each row is its own image - a "variant")
#   images/<game>/sprites_<n>.png  the sprites in sprite palette row n
#   images/<game>/tiles_ink.png    the tiles' ink colour alone, white: big text in any colour
#   js/gfx-<game>.js               the layout's names: GFX_<GAME>.T_NAME (a tile's number),
#                                  GFX_<GAME>.S_NAME (a sprite's cell: { col, row, frames, w, h })
#
# Colour 15 is see-through (real transparency in the PNGs, nothing to key out at run time).
#
#   python3 tools/nextgfx.py <the Next game's folder> <game name> [rows.json]
#
# The tile palette rows are read from the game's Main.bas (its Board.Pal n, "hex" lines); rows.json
# adds or replaces rows ({ "tilerows": { "5": "00FF...E3" } }) for ones the game makes at run time.
# Sprite rows a game changes at run time (palette cycling: flickering screens, flashing lights)
# are made as extra rows from one of spr_pal.png's, with entries set to RGB332 colours:
#   { "spriterows": { "0b": { "base": 0, "set": { "12": "EB", "13": "7C", "14": "1F" } } } }
# gives images/<game>/sprites_0b.png, image '<game>_s0b'.
# The art is made again (the game's art script, its Sheet kept as palette numbers too) so a pixel's
# number is exact even where two palette entries share a colour.
#
# Python 3 with Pillow. (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
import os, sys, re, json, shutil, tempfile, subprocess, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

def rgb332(v):
    r = (v >> 5) & 7; g = (v >> 2) & 7; b = v & 3
    b3 = (b << 1) | (1 if b else 0)
    return (r * 255 // 7, g * 255 // 7, b3 * 255 // 7)

def row_of_hex(s):
    return [rgb332(int(s[k * 2:k * 2 + 2], 16)) for k in range(16)]

PATCH = '''
# --- nextgfx: keep the palette numbers as well as the colours
_Sheet_init = Sheet.__init__
def _ng_init(s, cell, rows, pal):
    _Sheet_init(s, cell, rows, pal)
    s.idx = Image.new('L', (s.w, s.h), 15)
Sheet.__init__ = _ng_init
_Sheet_put = Sheet.put
def _ng_put(s, col, row, art, key, ox=0, oy=0):
    before = s.img.copy()
    _Sheet_put(s, col, row, art, key, ox, oy)
    a = before.load(); b = s.img.load(); ix = s.idx.load()
    for y in range(s.h):
        for x in range(s.w):
            if a[x, y] != b[x, y]:
                c = b[x, y][:3]
                ix[x, y] = s.pal.index(c) if c in s.pal else 15
Sheet.put = _ng_put
_Sheet_pixel = Sheet.pixel
def _ng_pixel(s, X, Y, i):
    _Sheet_pixel(s, X, Y, i)
    if 0 <= X < s.w and 0 <= Y < s.h:
        s.idx.load()[X, Y] = i
Sheet.pixel = _ng_pixel
_Sheet_save = Sheet.save
def _ng_save(s, path):
    _Sheet_save(s, path)
    s.idx.save(path + '.idx.png')
Sheet.save = _ng_save
'''

def remake_indexed(game):
    """the game's art made again in a copy, with the Sheet keeping palette numbers: {name: L image}"""
    out = {}
    arts = glob.glob(os.path.join(game, 'tools', 'art_*.py'))
    if not arts:
        return out
    tmp = tempfile.mkdtemp()
    try:
        g = os.path.join(tmp, 'g')
        shutil.copytree(game, g, ignore=shutil.ignore_patterns('build', '*.NEX', '*.zip'))
        ak = os.path.join(g, 'tools', 'artkit.py')
        if os.path.exists(ak):
            open(ak, 'a').write(PATCH)
        for a in arts:
            r = subprocess.run([sys.executable, os.path.join(g, 'tools', os.path.basename(a))], cwd=os.path.join(g, 'tools'), capture_output=True, text=True)
            if r.returncode:
                print('  (the art script failed: colours used instead)', r.stderr[-300:])
        for f in glob.glob(os.path.join(g, 'gfx', '*.png.idx.png')):
            out[os.path.basename(f)[:-len('.png.idx.png')]] = Image.open(f).copy()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return out

def indexes(img, idx, pal):
    """palette numbers for an RGBA sheet: the remade index image if it matches, else by colour"""
    w, h = img.size
    px = img.load()
    if idx is not None and idx.size == img.size:
        ix = idx.load()
        ok = all(((255, 0, 255) if ix[x, y] == 15 else pal[ix[x, y]]) == px[x, y][:3]
                 for y in range(0, h, 3) for x in range(0, w, 3))
        if ok:
            return [[ix[x, y] for x in range(w)] for y in range(h)]
        print('  (the remade art differs from gfx/: colours used instead)')
    out = []
    for y in range(h):
        line = []
        for x in range(w):
            c = px[x, y][:3]
            line.append(15 if c == (255, 0, 255) else (pal.index(c) if c in pal else 15))
        out.append(line)
    return out

def write_variant(ind, row, path):
    h = len(ind); w = len(ind[0])
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            i = ind[y][x]
            if i != 15 and row[i] is not None:
                px[x, y] = row[i] + (255,)
    im.save(path)

def main():
    game, name = sys.argv[1], sys.argv[2].lower()
    cfg = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
    gfx = os.path.join(game, 'gfx')
    outimg = os.path.join(ROOT, 'images', name)
    os.makedirs(outimg, exist_ok=True)
    tp = Image.open(os.path.join(gfx, 'tile_pal.png')).convert('RGBA')
    base = [tp.getpixel((i, 0))[:3] for i in range(16)]
    sp = Image.open(os.path.join(gfx, 'spr_pal.png')).convert('RGBA')
    sprows = [[sp.getpixel((i, r))[:3] for i in range(16)] for r in range(sp.size[1])]

    rows = {'0': base}
    src = open(os.path.join(game, 'Main.bas'), errors='replace').read()
    for m in re.finditer(r'Board\.Pal\s+(\d+)\s*,\s*"([0-9A-Fa-f]{32})"', src):
        rows[m.group(1)] = row_of_hex(m.group(2))
    for k, v in cfg.get('tilerows', {}).items():
        rows[str(k)] = row_of_hex(v)

    idx = remake_indexed(game)
    tiles = Image.open(os.path.join(gfx, 'tiles.png')).convert('RGBA')
    sprites = Image.open(os.path.join(gfx, 'sprites.png')).convert('RGBA')
    tind = indexes(tiles, idx.get('tiles'), base)
    sind = indexes(sprites, idx.get('sprites'), sprows[0])
    for n, row in rows.items():
        write_variant(tind, row, os.path.join(outimg, 'tiles_%s.png' % n))
    for n, row in enumerate(sprows):
        write_variant(sind, row, os.path.join(outimg, 'sprites_%d.png' % n))
    extra = sorted(cfg.get('spriterows', {}).items())
    for k, spec in extra:
        row = list(sprows[int(spec.get('base', 0))])
        for e, v in spec.get('set', {}).items():
            row[int(e)] = rgb332(int(v, 16))
        write_variant(sind, row, os.path.join(outimg, 'sprites_%s.png' % k))
    # the font's ink alone, white (colour "ink" of the tiles: 1 unless rows.json says): big text
    # in any colour (JSprites.getTintedImage)
    ink = int(cfg.get('ink', 1))
    write_variant(tind, [(255, 255, 255) if k == ink else None for k in range(16)], os.path.join(outimg, 'tiles_ink.png'))

    # the layout's names
    G = 'GFX_' + name.upper()
    keys = sorted(rows, key=lambda k: (0, int(k)) if k.isdigit() else (1, k))
    imgs = ["\t\t{ name:'%s_ink', classes:'%s', source:'images/%s/tiles_ink.png' }" % (name, name, name)]
    imgs += ["\t\t{ name:'%s_t%s', classes:'%s', source:'images/%s/tiles_%s.png' }" % (name, k, name, name, k) for k in keys]
    imgs += ["\t\t{ name:'%s_s%d', classes:'%s', source:'images/%s/sprites_%d.png' }" % (name, n, name, name, n) for n in range(len(sprows))]
    imgs += ["\t\t{ name:'%s_s%s', classes:'%s', source:'images/%s/sprites_%s.png' }" % (name, k, name, name, k) for k, spec in extra]
    L = ['// gfx-%s.js - made by tools/nextgfx.py from the Next game\'s gfx/layout.txt: don\'t edit, run the tool.' % name,
         '// (c) 2026 Cyborg Unicorn Pty Ltd',
         'var %s =' % G, '{',
         "\t// the images for JSprites.addImagesToLibrary (class '%s'): the ink mask, the tile rows, the sprite rows" % name,
         "\timages: [", ',\n'.join(imgs), "\t],",
         "\ttilerows: [%s],\t\t// tile images by palette row: '%s_t<row>'" % (', '.join("'%s'" % k for k in keys), name),
         "\tspriterows: %d,\t\t\t// sprite images: '%s_s0' .. '%s_s%d'" % (len(sprows), name, name, len(sprows) - 1)]
    for line in open(os.path.join(gfx, 'layout.txt')):
        line = line.split('#')[0].split()
        if len(line) >= 3 and line[0] == 'tile':
            L.append('\tT_%s: %s,' % (line[1], line[2]))
            if len(line) > 3: L.append('\tT_%s_N: %s,' % (line[1], line[3]))
        elif len(line) >= 4 and line[0] == 'sprite':
            fr = int(line[4]) if len(line) > 4 else 1
            w = int(line[5]) if len(line) > 5 else 1
            h = int(line[6]) if len(line) > 6 else 1
            L.append('\tS_%s: { col:%s, row:%s, frames:%d, w:%d, h:%d },' % (line[1], line[2], line[3], fr, w, h))
    L[-1] = L[-1].rstrip(',')
    L.append('};')
    open(os.path.join(ROOT, 'js', 'gfx-%s.js' % name), 'w').write('\n'.join(L) + '\n')
    print('%s: tiles in %d palette rows, sprites in %d, js/gfx-%s.js' % (name, len(rows), len(sprows), name))

main()
