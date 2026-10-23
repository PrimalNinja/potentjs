# jsexport.py - Z-BOMBER's pictures and story for the PotentJS port, the parts tools/nextgfx.py doesn't
# make (nextgfx.py makes the tiles and the sprites, as for every port)
# (c) 2026 Cyborg Unicorn Pty Ltd
#
#   python3 tools/jsexport.py <the Next game's folder>     (here: assets/zbomber-next)
#
# Writes into this folder (z-bomber-js), from the same sources the Next build uses:
#   images/zbomber/board.png    the 9 sector pictures (isoart.py's), 32 x 40 each, side by side
#                                      (0 space, 1 nebula, 2 asteroids, 3 rift, 4-6 planets, 7 your
#                                      base, 8 the Swarm's); Layer 2 colour 0 is see-through
#   images/zbomber/faces.png    the cast's faces as Face.cls puts them together, 36 x 36 each
#                                      (the face's top left at 0, 4 in the cell), 6 mouths each:
#                                      cast c with mouth m is frame c * 6 + m + 1
#   js/data-zbomber.js          the story (storyc.py's parse, flattened to ops), the cast's
#                                      names and looks
import os, sys, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..')
GAME = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, 'assets', 'zbomber-next')
ROOT = GAME
sys.path.insert(0, os.path.join(GAME, 'tools'))
MAG = (255, 0, 255)

def out_path(*p):
    path = os.path.join(OUT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path

# ---------------------------------------------------------------- the board (isoart.py's pictures)
def board():
    data = open(os.path.join(GAME, 'tools', 'blocks.bin'), 'rb').read()
    img = Image.new('RGBA', (9 * 32, 40), (0, 0, 0, 0))
    for k in range(9):
        off = (8192 + (k - 6) * 1280) if k >= 6 else k * 1280
        for y in range(40):
            for x in range(32):
                v = data[off + y * 32 + x]
                if v:
                    img.putpixel((k * 32 + x, y), (rgb8(v) + (255,)))
    img.save(out_path('images', 'zbomber', 'board.png'))

def rgb8(v):
    # the Next's RRRGGGBB as the screen shows it (blue's 2 bits widened as the Next does: b2 b1 (b2|b1))
    r = v >> 5; g = (v >> 2) & 7; b = v & 3
    b3 = (b << 1) | (1 if b else 0)
    return (r * 255 // 7, g * 255 // 7, b3 * 255 // 7)

def index_of(c, row):
    # a sheet pixel's colour number (None: see-through)
    if c[3] == 0 or c[:3] == MAG: return None
    if c[:3] in row: return row.index(c[:3])
    best = min(range(16), key=lambda k: sum((a - b) ** 2 for a, b in zip(c[:3], row[k])))
    return best

# ---------------------------------------------------------------- the faces (Face.cls, put together here)
def faces(looks):
    G = os.path.join(ROOT, 'gfx_faces')
    sheet = Image.open(os.path.join(G, 'sprites.png')).convert('RGBA')
    pal = Image.open(os.path.join(G, 'spr_pal.png')).convert('RGB')
    rows = [[pal.getpixel((x, y)) for x in range(16)] for y in range(pal.size[1])]
    W = 36
    img = Image.new('RGBA', (len(looks) * 6 * W, W), (0, 0, 0, 0))

    def cell(col, row, prow, x, y, w=1, h=1):
        for j in range(16 * h):
            for i in range(16 * w):
                c = sheet.getpixel((col * 16 + i, row * 16 + j))
                k = index_of(c, rows[0])
                if k is not None and k != 15 and 0 <= x + i < img.size[0] and 0 <= y + j < img.size[1]:
                    img.putpixel((x + i, y + j), rows[prow][k] + (255,))

    def pos(base_col, base_row, n, w):
        idx = base_row * 16 + base_col + n * w
        return idx % 16, idx // 16

    for p, L in enumerate(looks):
        face, skin, hair, hcol, eyes, ecol, mouth, acc, outfit = L
        for mo in range(6):
            x = (p * 6 + mo) * W; y = 4                     # Face.Put's x, y (the face's top left)
            c, rw = pos(2, 4, outfit, 2) if outfit < 7 else (2, 5)
            cell(c, rw, 0, x, y + 16, 2, 1)                  # the clothes
            c, rw = pos(0, 0, face, 2); cell(c, rw, 1 + skin, x, y, 2, 2)
            c, rw = pos(6, 6, mo, 1); cell(c, rw, 1 + skin, x + 8, y + 16)
            c, rw = pos(4, 5, eyes, 2) if eyes < 6 else pos(0, 6, eyes - 6, 2)
            cell(c, rw, 12 + ecol, x, y + 8, 2, 1)
            if hair < 6: c, rw = pos(4, 0, hair, 2)
            elif hair < 14: c, rw = pos(0, 2, hair - 6, 2)
            else: c, rw = (0, 4)
            cell(c, rw, 4 + hcol, x, y, 2, 2)
            if acc == 6: cell(4, 6, 0, x, y + 8, 2, 1)       # glasses
            elif acc == 1: cell(12, 6, 0, x + 14, y - 4)
            elif acc == 3: cell(14, 6, 0, x + 1, y + 3)
            elif acc == 5: cell(0, 7, 0, x + 16, y + 10)
            elif acc != 0: cell(12 + acc - 1, 6, 0, x + 19, y + acc - 1)
    img.save(out_path('images', 'zbomber', 'faces.png'))

# ---------------------------------------------------------------- the story
def story():
    import storyc
    sc = storyc.parse(os.path.join(ROOT, 'scripts', 'STORY.txt'))
    out = []
    for name in storyc.SCENES:
        ops = []
        flatten(sc.get(name, [('narr', '(%s TO COME)' % name)]), ops, storyc)
        ops.append(['end'])
        out.append(ops)
    return out

def flatten(st, ops, storyc):
    for s in st:
        k = s[0]
        if k in ('say', 'narr'):
            for pg in storyc.pages(s[1]): ops.append([k, pg.split('\n')])
        elif k in ('mood', 'icon', 'who'): ops.append([k, s[1]])
        elif k == 'choice':
            op = ['choice', [lab for lab, sub in s[1]], []]
            ops.append(op)
            gotos = []
            for lab, sub in s[1]:
                op[2].append(len(ops))
                flatten(sub, ops, storyc)
                g = ['goto', 0]; ops.append(g); gotos.append(g)
            for g in gotos: g[1] = len(ops)
        # aff, flag, money, stat: nothing in Z-BOMBER (skipped as the Next's Play skips them)

def main():
    people = open(os.path.join(GAME, 'tools', 'people.bin'), 'rb').read()
    looks = [list(people[p * 32 + 8:p * 32 + 17]) for p in range(8)]
    names = [people[p * 32 + 24:p * 32 + 32].decode('latin-1').strip() for p in range(8)]
    board(); faces(looks)
    js = ('// data-zbomber.js - made by tools/jsexport.py from scripts/STORY.txt and tools/people.bin: don\'t edit\n'
          '// (c) 2026 Cyborg Unicorn Pty Ltd\n'
          '// g_arrZBStory[scene]: ops: [\'who\', n] [\'mood\', n] [\'icon\', n] [\'say\', lines] [\'narr\', lines]\n'
          '// [\'choice\', labels, targets] [\'goto\', op] [\'end\']; in the text \\u0001 is the Captain\'s name,\n'
          '// \\u0002 the speaker\'s, \\u0004 the sector\'s\n'
          'var g_arrZBStory = ' + json.dumps(story(), separators=(',', ':')).replace('],[', '],\n[') + ';\n'
          'var g_arrZBNames = ' + json.dumps(names) + ';\n'
          'var g_arrZBLooks = ' + json.dumps(looks) + ';\n')
    open(out_path('js', 'data-zbomber.js'), 'w', encoding='ascii').write(js)
    print('images/zbomber/board.png, faces.png, js/data-zbomber.js')

main()
