# gfxlayout.py - a ZX Spectrum Next game's graphics, as gfxtool.js lays them out (gfx/layout.txt:
# a common set and a set for each level - tiles, tile palettes, a sprite sheet, sprite palettes,
# level maps, pictures), turned into images and names for PotentJS:
#
#   images/<game>/spr_c_<r>.png       the common sprite sheet in sprite palette row r (0-15)
#   images/<game>/spr_l<n>_<r>.png    level n's sprite sheet in row r
#   images/<game>/tiles_<r>.png       the common tiles (0-95: the font, the panel) in tile row r
#                                     (0-3: the rows text can be printed in)
#   images/<game>/tiles_l<n>.png      all 256 tiles of level n, each in its own palette row (the
#                                     row gfxtool gives it: the one that draws it best)
#   images/<game>/<picture>.png       the pictures (title screens), as they are
#   js/gfx-<game>.js                  GFX_<GAME>: T_ and S_ names with gfxtool's numbers, PAT (each
#                                     sprite pattern: its sheet and place), SPR (each named sprite:
#                                     sheet, place, size, frames), the palettes, LEVELS
#   js/data-<game>.js                 DATA_<GAME>: each level's map bytes and facts (map_lN.bin,
#                                     map_lN.meta) as arrays
#
# A sprite is cut the way gfxtool cuts it: every pixel is the nearest colour of sprite palette row 0
# (colour 15 / clear pixels see-through), then drawn again in each row - so a sprite in row r looks
# as it does on the Next with palette offset r. Tiles: each one's best row, as gfxtool picks it.
#
# --compose NAME,...  sprites drawn as their top half only, the bottom half the top mirrored (a
#                     32 x 32 from 32 x 16 cells): each frame is put together whole under the sheet
#                     and SPR gives that place instead
#
# --strip NEW=A,B,C   a sprite NEW whose frames are A's, B's and C's first frames, side by side
#                     under the sheet (frames the game takes from cells that aren't next to each other)
#
#   python3 tools/gfxlayout.py <the Next game's folder> <game name> <out folder> [--compose A,B]
#                              [--strip NEW=A,B,...]
#
# Python 3 with Pillow. (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
import os, sys, re, json, shutil
from PIL import Image

def clear(p):
    return p[3] < 128 or (p[0] == 255 and p[1] == 0 and p[2] == 255)

def read_palette(path, rows=16):
    im = Image.open(path).convert('RGBA')
    pals = []
    for y in range(min(im.height, rows)):
        pals.append([im.getpixel((x, y))[:3] for x in range(16)])
    return pals

def nearest(pal, p):
    if clear(p):
        return 15
    best, bd = 0, 1e18
    for i in range(15):
        c = pal[i]
        dd = (c[0] - p[0]) ** 2 * 3 + (c[1] - p[1]) ** 2 * 4 + (c[2] - p[2]) ** 2 * 2
        if dd < bd:
            bd, best = dd, i
    return best

def read_layout(path):
    L = {'common': None, 'levels': [], 'pictures': []}
    cur = None
    for line in open(path):
        line = re.sub(r'#.*$', '', line).strip()
        if not line:
            continue
        w = line.split()
        k = w[0].lower()
        if k == 'data':
            continue
        if k == 'common':
            cur = {'tiles': w[2], 'tpal': w[3], 'sprites': w[4], 'spal': w[5], 'tilen': [], 'spr': [], 'first': 0}
            L['common'] = cur
        elif k == 'level':
            cur = {'n': int(w[1]), 'tiles': w[4], 'tpal': w[5], 'sprites': w[6], 'map': w[7] if len(w) > 7 else None,
                   'tilen': [], 'spr': [], 'first': 64}
            L['levels'].append(cur)
        elif k == 'picture':
            L['pictures'].append({'name': w[1], 'file': w[2]})
        elif k == 'tile':
            cur['tilen'].append((w[1].upper(), int(w[2]), int(w[3]) if len(w) > 3 else 1))
        elif k == 'sprite':
            cur['spr'].append({'name': w[1].upper(), 'col': int(w[2]), 'row': int(w[3]),
                               'frames': int(w[4]) if len(w) > 4 else 1,
                               'w': int(w[5]) if len(w) > 5 else 1, 'h': int(w[6]) if len(w) > 6 else 1})
    return L

def index_sheet(path, pal):
    im = Image.open(path).convert('RGBA')
    px = im.load()
    idx = [[nearest(pal, px[x, y]) for x in range(im.width)] for y in range(im.height)]
    return idx, im.width, im.height

def draw_index(idx, w, h, pal):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            i = idx[y][x]
            if i != 15:
                c = pal[i]
                px[x, y] = (c[0], c[1], c[2], 255)
    return im

def tiles_best(img, pals, rows, count, first=0):
    """each 8 x 8 cell: (its index grid, its best row) - as gfxtool's cutTiles"""
    px = img.load()
    out = []
    for t in range(count):
        cx, cy = (t % 16) * 8, (t // 16) * 8
        if t < first or cy + 8 > img.height:
            out.append(None)
            continue
        best, bd, bidx = rows[0], 1e18, None
        for r in rows:
            err, ix = 0, []
            for y in range(8):
                for x in range(8):
                    p = px[cx + x, cy + y]
                    i = nearest(pals[r], p)
                    ix.append(i)
                    if i != 15:
                        c = pals[r][i]
                        err += (c[0] - p[0]) ** 2 * 3 + (c[1] - p[1]) ** 2 * 4 + (c[2] - p[2]) ** 2 * 2
            if err < bd:
                bd, best, bidx = err, r, ix
        out.append((bidx, best))
    return out

def put_tile(dst, t, ix, pal):
    px = dst.load()
    cx, cy = (t % 16) * 8, (t // 16) * 8
    for y in range(8):
        for x in range(8):
            i = ix[y * 8 + x]
            if i != 15:
                c = pal[i]
                px[cx + x, cy + y] = (c[0], c[1], c[2], 255)

def main():
    if len(sys.argv) < 4:
        print(__doc__ if __doc__ else 'gfxlayout.py <game folder> <name> <out folder> [--compose A,B]')
        sys.exit(1)
    game, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
    compose = []
    if '--compose' in sys.argv:
        compose = [s.upper() for s in sys.argv[sys.argv.index('--compose') + 1].split(',')]
    strips = []
    k0 = 0
    while '--strip' in sys.argv[k0:]:
        k0 = sys.argv.index('--strip', k0) + 1
        sn, parts = sys.argv[k0].split('=')
        strips.append((sn.upper(), [p0.upper() for p0 in parts.split(',')]))
    gfx = os.path.join(game, 'gfx')
    L = read_layout(os.path.join(gfx, 'layout.txt'))
    imgdir = os.path.join(out, 'images', name)
    jsdir = os.path.join(out, 'js')
    os.makedirs(imgdir, exist_ok=True)
    os.makedirs(jsdir, exist_ok=True)
    G = name.upper()
    c = L['common']
    spal = read_palette(os.path.join(gfx, c['spal']))
    while len(spal) < 16:
        spal.append(spal[0])
    ctp = read_palette(os.path.join(gfx, c['tpal']), 4)
    consts = {}
    pats = {}
    spr = {}

    def do_sprites(s, key):
        pat = pats.setdefault(key, {})
        idx, w, h = index_sheet(os.path.join(gfx, s['sprites']), spal[0])
        names = {}
        n = s['first']
        for d in s['spr']:
            consts['S_' + d['name']] = n
            consts['S_' + d['name'] + '_N'] = d['frames']
            if d['w'] > 1:
                consts['S_' + d['name'] + '_W'] = d['w']
            if d['h'] > 1:
                consts['S_' + d['name'] + '_H'] = d['h']
            for f in range(d['frames']):
                for j in range(d['h']):
                    for i in range(d['w']):
                        pat[n] = [key, (d['col'] + f * d['w'] + i) * 16, (d['row'] + j) * 16]
                        n += 1
            ent = {'set': key, 'x': d['col'] * 16, 'y': d['row'] * 16, 'w': d['w'] * 16, 'h': d['h'] * 16,
                   'frames': d['frames']}
            spr[d['name']] = ent
            names[d['name']] = d
        # what's put together under the sheet: composed sprites (each frame whole: its top half,
        # then that mirrored) and strips (other sprites' first frames side by side)
        jobs = []
        y0 = h
        for d in s['spr']:
            if d['name'] in compose:
                fw, fh = d['w'] * 16, d['h'] * 16
                ent = spr[d['name']]
                ent['x'], ent['y'], ent['h'], ent['composed'] = 0, y0, fh * 2, True
                jobs.append(('c', d, ent['y'], fw, fh))
                y0 += fh * 2
        for sn, parts in strips:
            if all(p0 in names for p0 in parts):
                d0 = names[parts[0]]
                fw, fh = d0['w'] * 16, d0['h'] * 16
                spr[sn] = {'set': key, 'x': 0, 'y': y0, 'w': fw, 'h': fh, 'frames': len(parts), 'strip': parts}
                jobs.append(('s', parts, y0, fw, fh))
                y0 += fh
        H = y0
        big = [[15] * w for _ in range(H)]
        for y in range(h):
            big[y] = list(idx[y])
        for job in jobs:
            if job[0] == 'c':
                d, yy, fw, fh = job[1], job[2], job[3], job[4]
                for f in range(d['frames']):
                    sx, sy = (d['col'] + f * d['w']) * 16, d['row'] * 16
                    for y in range(fh):
                        for x in range(fw):
                            v = idx[sy + y][sx + x]
                            big[yy + y][f * fw + x] = v
                            big[yy + fh * 2 - 1 - y][f * fw + x] = v
            else:
                parts, yy, fw, fh = job[1], job[2], job[3], job[4]
                for f, p0 in enumerate(parts):
                    d = names[p0]
                    sx, sy = d['col'] * 16, d['row'] * 16
                    for y in range(fh):
                        for x in range(fw):
                            big[yy + y][f * fw + x] = idx[sy + y][sx + x]
        for r in range(16):
            draw_index(big, w, H, spal[r]).save(os.path.join(imgdir, 'spr_%s_%d.png' % (key, r)))
        return H

    do_sprites(c, 'c')
    # the common tiles: in each of the 4 text rows, and each in its best row (for the levels)
    cimg = Image.open(os.path.join(gfx, c['tiles'])).convert('RGBA')
    crow = list(range(len(ctp)))
    ctl = tiles_best(cimg, ctp, crow, 96)
    for r in range(4):
        im = Image.new('RGBA', (128, 48), (0, 0, 0, 0))
        for t in range(96):
            if ctl[t]:
                put_tile(im, t, ctl[t][0], ctp[r] if r < len(ctp) else ctp[0])
        im.save(os.path.join(imgdir, 'tiles_%d.png' % r))
    for nm, t, cnt in c['tilen']:
        consts['T_' + nm] = t
        if cnt > 1:
            consts['T_' + nm + '_N'] = cnt
    data = {'maps': {}, 'meta': {}}
    for lv in L['levels']:
        n = lv['n']
        do_sprites(lv, 'l%d' % n)
        tp = read_palette(os.path.join(gfx, lv['tpal']), 12)
        pals = list(ctp)
        while len(pals) < 4:
            pals.append(ctp[0])
        pals += tp
        limg = Image.open(os.path.join(gfx, lv['tiles'])).convert('RGBA')
        big = Image.new('RGBA', (128, 256), (0, 0, 0, 0))
        big.paste(limg.crop((0, 0, 128, min(limg.height, 208))), (0, 48))
        lt = tiles_best(big, pals, list(range(4, len(pals))), 256, 96)
        im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        for t in range(256):
            src = ctl[t] if t < 96 else lt[t]
            if src:
                put_tile(im, t, src[0], pals[src[1]])
        im.save(os.path.join(imgdir, 'tiles_l%d.png' % n))
        for nm, t, cnt in lv['tilen']:
            consts['T_' + nm] = t
        if lv['map']:
            mp = os.path.join(gfx, lv['map'])
            data['maps'][n] = list(open(mp, 'rb').read())
            me = mp.replace('.bin', '.meta')
            if os.path.exists(me):
                data['meta'][n] = list(open(me, 'rb').read())
    for p in L['pictures']:
        shutil.copy(os.path.join(gfx, p['file']), os.path.join(imgdir, p['file']))
    hexs = lambda pal: ['#%02x%02x%02x' % tuple(c3) for c3 in pal]
    G_obj = dict(consts)
    G_obj['LEVELS'] = len(L['levels'])
    G_obj['PAT'] = pats
    G_obj['SPR'] = spr
    G_obj['SPAL'] = [hexs(p) for p in spal]
    G_obj['PICTURES'] = [p['file'] for p in L['pictures']]
    hdr = '// gfx-%s.js - made by tools/gfxlayout.py from the Next game\'s gfx/ (don\'t edit: run the tool again).\n// (c) 2026 Cyborg Unicorn Pty Ltd\n' % name
    open(os.path.join(jsdir, 'gfx-%s.js' % name), 'w').write(hdr + 'var GFX_%s = %s;\n' % (G, json.dumps(G_obj, separators=(',', ':'))))
    if data['maps']:
        hdr = '// data-%s.js - made by tools/gfxlayout.py: the levels\' maps (32 bytes a column) and facts (don\'t edit).\n// (c) 2026 Cyborg Unicorn Pty Ltd\n' % name
        open(os.path.join(jsdir, 'data-%s.js' % name), 'w').write(hdr + 'var DATA_%s = %s;\n' % (G, json.dumps(data, separators=(',', ':'))))
    print('%s: %d sprite patterns named, %d levels' % (name, sum(len(v) for v in pats.values()), len(L['levels'])))

main()
