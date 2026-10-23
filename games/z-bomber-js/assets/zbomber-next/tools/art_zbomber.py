# Z-BOMBER - the map's sprites and the panel's tiles: writes ../gfx/* (gfxtool.js makes GfxData.cls;
# facepack.py packs them as the game's sprite set, swapped with the faces for the talk scenes)
# (run: python3 tools/art_zbomber.py)   (c) 2026 Cyborg Unicorn Pty Ltd
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artkit import *
from cvkit import Cv

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..', 'gfx')
os.makedirs(D, exist_ok=True)
def c(r, g, b): return (r * 255 // 7, g * 255 // 7, b * 255 // 3)

# ---------------------------------------------------------------- tiles: the panel and the text
# 0 black, 1 white, 2 light grey, 3 grey, 4 the panel (deep blue), 5 its line (cyan), 6 red,
# 7 orange, 8 yellow, 9 cyan, 10 blue, 11 pink, 12 green, 13 dark red, 14 purple
TP = [c(0,0,0), c(7,7,3), c(5,5,2), c(3,3,1), c(0,0,1), c(1,5,3), c(7,1,0), c(7,4,0),
      c(7,7,0), c(2,7,3), c(1,2,3), c(7,3,2), c(2,6,0), c(3,0,0), c(3,0,2), MAGENTA]
palette_png(D + '/tile_pal.png', [TP])
T = Sheet(8, 16, TP)
font_into(T, 1, shadow=0, paper=15)
K = {'k': 0, 'w': 1, 'l': 2, 'g': 3, 'N': 4, 'n': 5, 'r': 6, 'o': 7, 'y': 8, 'c': 9, 'b': 10, 'p': 11, 'e': 12, 'R': 13, 'v': 14, '.': 15}
T.put(1, 0, ['NNNNNNNN'] * 8, K)                                   # the panel
T.put(2, 0, ['nnnnnnnn'] + ['NNNNNNNN'] * 7, K)                    # a line along its top
T.put(3, 0, ['NNNNNNNN'] * 7 + ['nnnnnnnn'], K)                    # a line along its bottom
T.put(4, 0, ['NNNNNNNN', 'NNNccNNN', 'NNcwwcNN', 'NcwccwcN', 'NNcbbcNN', 'NNNbbNNN', 'NNNNNNNN', 'NNNNNNNN'], K)  # your key
T.put(5, 0, ['NNNNNNNN', 'NNNooNNN', 'NNoyyoNN', 'NoyrryoN', 'NNorroNN', 'NNNrrNNN', 'NNNNNNNN', 'NNNNNNNN'], K)  # their key
T.put(6, 0, ['NNNNNNNN', 'NNNNcNNN', 'NNNcwcNN', 'NNcbwbcN', 'NcbbbbbN', 'NNNyNyNN', 'NNNNNNNN', 'NNNNNNNN'], K)  # a frigate
T.put(7, 0, ['NNNNNNNN', 'NNrNNrNN', 'NNNrrNNN', 'NNroorNN', 'NNNrrNNN', 'NNrNNrNN', 'NNNNNNNN', 'NNNNNNNN'], K)  # a drone
T.save(D + '/tiles.png')

# ---------------------------------------------------------------- sprite palettes
# 0 black, 1 white, 2 light blue, 3 blue, 4 dark blue, 5 cyan, 6 yellow, 7 orange, 8 red, 9 dark red,
# 10 grey, 11 dark grey, 12 green, 13 pink, 14 purple
SP0 = [c(0,0,0), c(7,7,3), c(4,6,3), c(1,3,3), c(0,1,2), c(2,7,3), c(7,7,0), c(7,4,0),
       c(7,1,0), c(4,0,0), c(5,5,2), c(2,2,1), c(2,6,0), c(7,3,3), c(4,1,3), MAGENTA]
RED = SP0[:]; RED[2] = c(7,5,2); RED[3] = c(6,1,0); RED[4] = c(3,0,0); RED[5] = c(7,6,0)
FLASH = [c(7,7,3)] * 15 + [MAGENTA]
DIM = [c(0,0,0)] + [c(2,2,1)] * 14 + [MAGENTA]
GOLD = SP0[:]; GOLD[2] = c(7,7,1); GOLD[3] = c(7,5,0); GOLD[4] = c(5,3,0); GOLD[5] = c(7,7,2)
palette_png(D + '/spr_pal.png', [SP0, RED, FLASH, DIM, GOLD])

S = Sheet(16, 4, SP0)

def line(v, x0, y0, x1, y1, i):
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for k in range(n + 1):
        t = k / n
        v.set(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), i)

def cells(v, col, row, w=1, h=1):
    for j in range(h):
        for i in range(w):
            cv = Cv(16, 16)
            for y in range(16):
                for x in range(16): cv.p[y][x] = v.p[j * 16 + y][i * 16 + x]
            cv.into(S, col + i, row + j)

# ---- the cursor: a diamond round a sector (32 x 16), bright and dim
for f in range(2):
    v = Cv(32, 16)
    col = 6 if f == 0 else 7
    for x in range(32):
        d = abs(x + 0.5 - 16)
        yt = int(8 - 8 + d / 2); yb = int(16 - d / 2) - 1
        if (x // 2) % 2 == 0 or d > 12:
            v.set(x, yt, col); v.set(x, yb, col)
    cells(v, f * 2, 0, 2, 1)
# ---- a fleet's mark when picked: a ring on the board (32 x 16)
v = Cv(32, 16)
for a in range(0, 360, 6):
    v.set(16 + 13 * math.cos(math.radians(a)), 8 + 6 * math.sin(math.radians(a)), 1 if a % 24 else 5)
cells(v, 4, 0, 2, 1)
# ---- a frigate (your fleets): a little arrow of a ship heading up-right, its engine flickering
for f in range(2):
    v = Cv(16, 16)
    v.poly([(13, 3), (3, 8), (7, 9), (8, 13)], 3)
    v.poly([(13, 3), (6, 8), (8, 10)], 2)
    line(v, 13, 3, 3, 8, 1)
    v.set(4, 11, 6 if f else 7); v.set(3, 12, 7 if f else 6); v.set(5, 12, 7)
    v.outline(0)
    v.into(S, 6 + f, 0)
# ---- a drone (the IRON SWARM's fleets): an iron hexagon with one eye, legs trailing (shown in
# palette 1, where the blues are reds)
for f in range(2):
    v = Cv(16, 16)
    pts = [(8 + 6 * math.cos(math.radians(a2)), 7 + 5 * math.sin(math.radians(a2))) for a2 in range(0, 360, 60)]
    v.poly(pts, 11)
    v.poly([(p[0], p[1]) for p in pts[3:]] + [pts[0]], 10)
    v.circle(7.5, 6.5, 2.5, 3); v.circle(7.5, 6.5, 1.2, 1 if f else 5)
    for x in (4, 8, 12):
        line(v, x, 11, x - 1 + f, 14, 11)
    v.outline(0)
    v.into(S, 8 + f, 0)
# ---- the Z-BOMBER: three craft joined (32 x 16), heading up-right
for f in range(2):
    v = Cv(32, 16)
    v.poly([(30, 2), (4, 11), (10, 12), (12, 15)], 3)          # the body (ANVIL)
    v.poly([(30, 2), (14, 8), (18, 10)], 2)                     # SPEAR's nose
    v.poly([(10, 9), (2, 6), (5, 13)], 14)                      # LANTERN's tail
    line(v, 30, 2, 6, 11, 1)
    v.rect(19, 5, 21, 7, 6)                                     # the cannon
    v.set(4, 13, 7 if f else 6); v.set(3, 12, 6 if f else 7); v.set(2, 14, 7)
    v.outline(0)
    cells(v, 10 + f * 2, 0, 2, 1)
# ---- a STAR KEY: a crystal, sparkling (palette 0 yours, 1 theirs)
for f in range(2):
    v = Cv(16, 16)
    v.poly([(8, 1), (13, 7), (8, 15), (3, 7)], 3)
    v.poly([(8, 1), (8, 15), (3, 7)], 2)
    line(v, 3, 7, 13, 7, 5)
    if f: v.set(6, 4, 1); v.set(5, 4, 1); v.set(6, 3, 1); v.set(11, 10, 1)
    v.outline(0)
    v.into(S, 14 + f, 0)
# ---- the numbers 0-9: small, white with a dark edge (a fleet's ships)
F = font8x8()
for n in range(10):
    v = Cv(16, 16)
    g = F[48 + n]
    for y in range(8):
        for x in range(8):
            if g[y] & (0x80 >> x): v.set(x + 4, y + 4, 1)
    v.outline(0)
    v.into(S, n, 1)
# ---- a planet's flag: who holds it (palette 0 blue, 1 red)
v = Cv(16, 16)
line(v, 5, 2, 5, 14, 10)
v.poly([(6, 2), (13, 4), (6, 7)], 3); v.poly([(6, 2), (11, 3), (6, 5)], 2)
v.outline(0)
v.into(S, 10, 1)
# ---- the target: a chevron over where a fleet is going
v = Cv(16, 16)
for k in range(3):
    line(v, 3 + k, 4 + k * 3, 8, 8 + k * 3, 6); line(v, 13 - k, 4 + k * 3, 8, 8 + k * 3, 6)
v.into(S, 11, 1)
# ---- a laser flash and a bang (4 frames)
v = Cv(16, 16)
line(v, 1, 14, 14, 1, 5); line(v, 2, 14, 14, 2, 1)
v.into(S, 12, 1)
for f in range(4):
    v = Cv(16, 16)
    r = 2 + f * 2
    v.circle(7.5, 7.5, r, [6, 7, 8, 9][f])
    v.circle(7.5, 7.5, r * 0.6, [1, 6, 7, 11][f])
    if f >= 2:
        for k in range(10):
            a = k * 0.63 + f
            v.set(7.5 + (r + 1) * math.cos(a), 7.5 + (r + 1) * math.sin(a), 11)
    v.into(S, f, 2)

S.save(D + '/sprites.png')

open(D + '/layout.txt', 'w').write('''# Z-BOMBER - names for the cells of tiles.png (8 x 8) and sprites.png (16 x 16)
# tile   NAME   index [count]
# sprite NAME   column row [frames [w h]]
# sprite palettes (spr_pal.png rows): 0 the art (you: blue), 1 the IRON SWARM (red), 2 a flash,
# 3 dim, 4 gold
tile   PANEL    1
tile   PANELT   2         # a line along its top
tile   PANELB   3         # a line along its bottom
tile   KEYB     4         # your STAR KEY
tile   KEYR     5         # theirs
tile   SHIPB    6         # a frigate
tile   SHIPR    7         # a drone

sprite CURSOR   0 0 2 2 1 # the cursor (32 x 16): bright, dim
sprite PICK     4 0 1 2 1 # the ring under the fleet you've picked (32 x 16)
sprite FRIGATE  6 0 2     # your fleets: a frigate
sprite DRONE    8 0 2     # theirs: a drone (palette 1)
sprite ZB       10 0 2 2 1 # the Z-BOMBER (32 x 16)
sprite KEY      14 0 2    # a STAR KEY (palette 0 yours, 1 theirs)
sprite DIGIT    0 1 10    # 0-9
sprite FLAG     10 1      # a planet's flag
sprite TARGET   11 1      # where a fleet is going
sprite LASER    12 1      # a laser flash
sprite BOOM     0 2 4     # a bang: 4 frames
''')
print('ok')
