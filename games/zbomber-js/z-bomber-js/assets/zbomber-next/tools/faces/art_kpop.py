# KPOP GROUP MANAGER (and WITCH BIAS) - the idols' faces (sprite parts) and the screen's tiles: writes ../gfx/*
# (run: python3 tools/art_kpop.py)   (c) 2026 Cyborg Unicorn Pty Ltd
#
# A face is put together from parts, each its own sprites and palette row, so 100 idols get
# 100 different faces out of 128 patterns:
#   OUTFIT (32 x 16, row 0)  FACE (32 x 32, a skin row 1-3)  MOUTH (16 x 16, the skin row)
#   EYES (32 x 16, an eye row 12-14)  HAIR (32 x 32, a hair row 4-11)  ACC (16 x 16 / 32 x 16, row 0)
# The parts are drawn in colour numbers; the palette row gives the colours:
#   skin rows:  0 outline, 1 white, 2 light, 3 skin, 4 shade, 5 blush, 6 mouth, 7 lip pink
#   hair rows:  0 outline, 1 shine, 2 light, 3 mid, 4 dark
#   eye rows:   0 lashes, 1 white, 2 iris light, 3 iris, 4 pupil
#   row 0 (outfits, accessories, the icons): 15 colours, below
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artkit import *
from cvkit import Cv

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..', '..', 'gfx_faces')
os.makedirs(D, exist_ok=True)
def c(r, g, b): return (r * 255 // 7, g * 255 // 7, b * 255 // 3)

# ---------------------------------------------------------------- palettes
ROW0 = [c(1,0,1), c(7,7,3), c(7,1,1), c(4,0,0), c(7,5,3), c(7,2,2), c(3,6,3), c(1,1,2),
        c(7,6,0), c(5,3,0), c(5,5,2), c(2,2,1), c(0,0,0), c(5,4,3), c(3,7,2), MAGENTA]
def skin(l, m, s):
    return [c(2,1,0), c(7,7,3), l, m, s, c(7,3,2), c(5,1,1), c(7,4,2)] + [c(0,0,0)] * 7 + [MAGENTA]
SKINS = [skin(c(7,7,3), c(7,6,2), c(6,5,2)), skin(c(7,6,2), c(7,5,2), c(6,4,1)), skin(c(7,5,2), c(6,4,1), c(5,3,1))]
def hair(o, sh, l, m, d):
    return [o, sh, l, m, d] + [c(0,0,0)] * 10 + [MAGENTA]
HAIRS = [hair(c(0,0,0), c(3,3,3), c(2,2,2), c(1,1,1), c(0,0,1)),     # black
         hair(c(1,0,0), c(5,3,1), c(4,2,0), c(3,1,0), c(2,1,0)),     # dark brown
         hair(c(2,1,0), c(7,6,2), c(6,4,1), c(5,3,0), c(3,2,0)),     # caramel
         hair(c(3,2,0), c(7,7,3), c(7,7,1), c(7,6,0), c(5,4,0)),     # blonde
         hair(c(3,0,1), c(7,6,3), c(7,4,3), c(7,3,2), c(5,1,2)),     # pink
         hair(c(0,1,1), c(5,7,3), c(3,6,3), c(1,4,3), c(0,2,2)),     # blue
         hair(c(1,1,1), c(7,7,3), c(6,6,3), c(5,5,2), c(3,3,2)),     # silver
         hair(c(2,0,0), c(7,4,2), c(6,1,1), c(5,0,1), c(3,0,0))]     # red
def eye(l, m, d):
    return [c(1,0,0), c(7,7,3), l, m, d] + [c(0,0,0)] * 10 + [MAGENTA]
EYES = [eye(c(6,4,1), c(4,2,0), c(1,0,0)), eye(c(4,3,1), c(2,1,0), c(0,0,0)), eye(c(4,6,3), c(2,3,3), c(0,1,1))]
WHITE = [c(7,7,3)] * 15 + [MAGENTA]
SP = [ROW0] + SKINS + HAIRS + EYES + [WHITE]
palette_png(D + '/spr_pal.png', SP)

S = Sheet(16, 8, ROW0)
names = []

def ell(v, cx, cy, rx, ry, i, test=None):
    for y in range(v.h):
        for x in range(v.w):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                if test is None or test(x, y): v.set(x, y, i)
def put_cv(v, col, row):
    for j in range(v.h // 16):
        for i in range(v.w // 16):
            cv = Cv(16, 16)
            for y in range(16):
                for x in range(16): cv.p[y][x] = v.p[j * 16 + y][i * 16 + x]
            cv.into(S, col + i, row + j)
def outline_only(v, idx, col=0):
    # an outline in colour col round the pixels of colour idx (on empty pixels only)
    q = [r[:] for r in v.p]
    for y in range(v.h):
        for x in range(v.w):
            if v.p[y][x] is None:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if v.get(x + dx, y + dy) == idx: q[y][x] = col; break
    v.p = q

# ---------------------------------------------------------------- the face: 32 x 32
# head centre 16, 15; the hair goes over it; the eyes part at y 8, the mouth part at 8, 16
def face(kind):
    v = Cv(32, 32)
    v.rect(14, 22, 17, 31, 3)                         # the neck
    v.rect(14, 22, 17, 24, 4)                         # (its shadow under the chin)
    if kind == 0:     # soft and round
        ell(v, 16, 14.5, 8.6, 9.2, 3)
        ell(v, 16, 19, 6.5, 5.5, 3)
    else:             # a longer jaw
        ell(v, 16, 14, 8.4, 9.0, 3)
        v.poly([(8, 15), (24, 15), (21, 23), (16, 25.5), (11, 23)], 3)
    # ears
    ell(v, 7.6, 16, 1.7, 2.6, 3); ell(v, 24.4, 16, 1.7, 2.6, 3)
    v.set(7, 16, 4); v.set(24, 16, 4)
    # shading: the right edge, a highlight top left
    v.shade(3, 4, lambda x, y: x >= 22 and y > 8 and y < 22)
    v.shade(3, 2, lambda x, y: 10 <= x <= 13 and 9 <= y <= 13)
    v.set(16, 19, 4); v.set(17, 19, 4)                # the nose
    v.outline(0)
    return v

# ---------------------------------------------------------------- outfits: 32 x 16 (shoulders, at y 16)
def outfit(k):
    v = Cv(32, 16)
    # shoulders: rows 8-15 (the face's y 24-31)
    pts = [(1, 16), (3, 10), (9, 8), (13, 7.5), (19, 7.5), (23, 8), (29, 10), (31, 16)]
    if k == 0:     # a black suit, white shirt, a red tie
        v.poly(pts, 12); v.poly([(12, 7), (20, 7), (16, 16)], 1); v.poly([(15, 9), (17, 9), (17.5, 15), (16, 16), (14.5, 15)], 2)
        v.poly([(12, 7), (16, 16), (13, 16), (10, 9)], 11); v.poly([(20, 7), (16, 16), (19, 16), (22, 9)], 11)
    elif k == 1:   # a pink hoodie
        v.poly(pts, 4); v.poly([(11, 7), (21, 7), (19, 11), (13, 11)], 5)
        v.rect(13, 11, 13, 14, 1); v.rect(19, 11, 19, 14, 1)
    elif k == 2:   # a sailor collar: navy and white
        v.poly(pts, 1); v.poly([(5, 9), (12, 7), (16, 15), (20, 7), (27, 9), (24, 12), (16, 16), (8, 12)], 7)
        v.poly([(14, 12), (18, 12), (16, 15)], 2)
    elif k == 3:   # a sparkly stage top: gold
        v.poly(pts, 8); v.poly([(12, 7), (20, 7), (16, 12)], 3)
        random.seed(3)
        for _ in range(14):
            x, y = random.randint(3, 28), random.randint(9, 15)
            if v.get(x, y) == 8: v.set(x, y, 1 if random.random() < 0.5 else 9)
    elif k == 4:   # a striped tee
        v.poly(pts, 1)
        for y in range(8, 16, 3):
            for x in range(32):
                if v.get(x, y) == 1: v.set(x, y, 6)
        ell(v, 16, 7, 4.5, 2.5, None)
    elif k == 5:   # off the shoulder: lavender with a white frill
        v.poly([(1, 16), (3, 12), (29, 12), (31, 16)], 13)
        for x in range(2, 30): v.set(x, 11 + (x % 2), 1)
        # the bare shoulders: skin is in the face's palette, so a soft line only
    elif k == 6:   # a denim jacket, white tee
        v.poly(pts, 6); v.poly([(11, 7), (21, 7), (19, 16), (13, 16)], 1)
        v.shade(6, 7, lambda x, y: x in (12, 20) or y == 15)
    elif k == 7:   # a red bomber with a white stripe
        v.poly(pts, 2); v.poly([(12, 7), (20, 7), (18, 10), (14, 10)], 3)
        for x in range(32):
            if v.get(x, 13) == 2: v.set(x, 13, 1)
    v.outline(0)
    return v

# ---------------------------------------------------------------- eyes: 32 x 16 (at y 8)
# eyes at the face's y 13-18 (rows 5-10 here), left centre x 11.5, right 20.5
def eyes(k):
    v = Cv(32, 16)
    def one(cx, side):
        if k in (0, 1, 2, 3):   # big round eyes (0, 1 with lashes: the girls'; 2, 3 the boys')
            ell(v, cx, 8, 2.6, 3.0, 1)
            ell(v, cx, 8.4, 2.1, 2.7, 3)
            ell(v, cx, 9.2, 1.4, 1.6, 4)
            v.set(cx - 1.5, 6.5, 1); v.set(cx - 1.0, 6.5, 1); v.set(cx - 1.5, 7.2, 1)   # the shine
            v.set(cx + 0.8, 10.0, 2)
            v.rect(cx - 2.6, 5, cx + 2.6, 5, 0)                                      # the lid
            if k in (0, 1):
                v.set(cx + 2.8 * side, 4.6, 0); v.set(cx + 3.4 * side, 4.2, 0)        # lashes
                if k == 1: v.set(cx - 2.9 * side, 5.2, 0)
            if k == 3:          # sleepier: a heavier lid
                v.rect(cx - 2.6, 6, cx + 2.6, 6, 0)
        elif k in (4, 5):       # smiling closed eyes (^ ^), or a wink on the right
            if k == 5 and side > 0:
                v.rect(cx - 2, 8, cx + 2, 8, 0); v.set(cx - 2, 7, 0); v.set(cx + 2, 7, 0)
            elif k == 4:
                for dx in range(-2, 3): v.set(cx + dx, 7 + abs(dx) // 2 * 1 - (1 if abs(dx) == 0 else 0) + 1, 0)
            else:
                ell(v, cx, 8, 2.6, 3.0, 1); ell(v, cx, 8.4, 2.1, 2.7, 3); ell(v, cx, 9.2, 1.4, 1.6, 4)
                v.set(cx - 1.5, 6.5, 1); v.rect(cx - 2.6, 5, cx + 2.6, 5, 0)
                v.set(cx + 2.8 * side, 4.6, 0)
        elif k == 6:            # narrow, cool eyes
            v.rect(cx - 2.6, 7, cx + 2.6, 9, 1)
            v.rect(cx - 1, 7, cx + 1, 9, 3); v.set(cx, 8, 4)
            v.set(cx - 0.6, 7, 1)
            v.rect(cx - 3, 6, cx + 2.6, 6, 0); v.set(cx + 3 * side, 5.5, 0)
        elif k == 7:            # sparkly star eyes
            ell(v, cx, 8, 2.6, 3.0, 1); ell(v, cx, 8.4, 2.1, 2.7, 3)
            v.set(cx, 7, 1); v.set(cx, 9, 1); v.set(cx - 1, 8, 1); v.set(cx + 1, 8, 1); v.set(cx, 8, 1)
            v.rect(cx - 2.6, 5, cx + 2.6, 5, 0); v.set(cx + 2.8 * side, 4.6, 0)
    one(11.5, -1); one(20.5, 1)
    return v

# ---------------------------------------------------------------- mouths: 16 x 16 (at 8, 16), with blush
# the mouth at the face's y 21-22 (row 5-6 here), x 16 (8 here); blush at rows 2-3
def mouth(k):
    v = Cv(16, 16)
    for bx in (1, 12):
        v.rect(bx, 2, bx + 2, 2, 5); v.set(bx + 1, 3, 5)
    if k == 0:    # a smile
        v.set(6, 5, 6); v.rect(7, 6, 9, 6, 6); v.set(10, 5, 6)
    elif k == 1:  # an open smile
        v.rect(6, 5, 10, 5, 6); v.rect(7, 6, 9, 6, 6); v.set(8, 7, 6); v.rect(7, 6, 9, 6, 7)
        v.rect(6, 5, 10, 5, 6); v.set(8, 6, 7)
    elif k == 2:  # a cat mouth (w)
        v.set(6, 5, 6); v.set(7, 6, 6); v.set(8, 5, 6); v.set(9, 6, 6); v.set(10, 5, 6)
    elif k == 3:  # a small o
        v.rect(7, 5, 9, 6, 6); v.set(8, 5, 7)
    elif k == 4:  # a big grin with teeth
        v.rect(5, 5, 11, 5, 1); v.rect(6, 6, 10, 6, 6); v.set(5, 4, 6); v.set(11, 4, 6)
    elif k == 5:  # a smirk
        v.rect(7, 6, 9, 6, 6); v.set(10, 5, 6)
    return v

# ---------------------------------------------------------------- hair: 32 x 32
# a cap of hair over the top of the head, a fringe (hairline(x): the hair comes down to it) and
# the sides; shaded dark under and at the edges, a shine band across the top
def hairdo(style):
    v = Cv(32, 32)
    def cap(rx=10.3, ry=10.5, cy=13.6, hl=None, lo=0):
        for y in range(32):
            for x in range(32):
                if ((x + 0.5 - 16) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    if hl is None or y < hl(x) + (1 if (9 <= x <= 22 and x % 3 == 1 and hl(x) < 16) else 0): v.set(x, y, 3)
    def side(x0, x1, y0, y1, taper=0):
        for y in range(y0, y1 + 1):
            t = (y - y0) / max(1, y1 - y0)
            a = x0 + taper * t if taper > 0 else x0
            b = x1 + taper * t if taper < 0 else x1
            v.rect(a, y, b, y, 3)
    def strands(xs, y0, y1):
        for x in xs: v.rect(x, y0, x, y1, 4)
    flat = lambda h: (lambda x: h)
    if style == 0:      # girl: long and straight, a straight fringe
        cap(hl=lambda x: 11 if 9 <= x <= 22 else 32)
        side(5, 9, 10, 30); side(22, 26, 10, 30)
        strands((7, 24), 16, 29)
    elif style == 1:    # girl: twin tails
        cap(hl=lambda x: 10 + (1 if x % 4 == 0 else 0) if 9 <= x <= 22 else 18)
        ell(v, 3.5, 19, 3.6, 9, 3); ell(v, 28.5, 19, 3.6, 9, 3)
        v.rect(5, 10, 7, 13, 2); v.rect(24, 10, 26, 13, 2)         # (the bobbles: shaded light)
    elif style == 2:    # girl: a bob with a fringe
        cap(rx=11, ry=11, cy=14, hl=lambda x: 11 if 9 <= x <= 22 else 32)
        side(5, 9, 10, 22); side(22, 26, 10, 22)
        for x in range(5, 27):
            if v.get(x, 22) == 3: v.set(x, 23, 3)
    elif style == 3:    # girl: a high ponytail
        cap(hl=lambda x: 9 + abs(x - 15) // 3 if 9 <= x <= 22 else 15)
        ell(v, 26, 4, 3.5, 3.5, 3)
        side(26, 29, 5, 24, taper=0)
        for y in range(5, 25): v.set(27 + (y % 3 == 0), y, 4)
    elif style == 4:    # girl: long waves, a side part
        cap(hl=lambda x: (9 + (x - 9) // 2) if 9 <= x <= 22 else 32)
        for y in range(9, 31):
            w = int(1.2 * math.sin(y / 2.0))
            v.rect(4 + w, y, 9 + w, y, 3); v.rect(22 - w, y, 27 - w, y, 3)
        strands((6, 25), 14, 29)
    elif style == 5:    # girl: space buns
        cap(hl=lambda x: 10 if 9 <= x <= 22 else 19)
        ell(v, 8, 3.5, 4, 3.6, 3); ell(v, 24, 3.5, 4, 3.6, 3)
        side(6, 8, 12, 20)
        side(23, 25, 12, 20)
    elif style == 6:    # girl: a short pixie, swept fringe
        cap(rx=10, ry=10, cy=13.4, hl=lambda x: 9 + (22 - x) // 3 if 9 <= x <= 22 else 17)
    elif style == 7:    # girl: long, swept to one side
        cap(hl=lambda x: 7 + (x - 6) // 2 if 9 <= x <= 22 else 32)
        side(4, 9, 10, 31, taper=0); side(22, 25, 10, 17)
        strands((6,), 14, 30)
    elif style == 8:    # boy: the comma fringe (a side part)
        cap(rx=10.2, ry=10, cy=13.3, hl=lambda x: (12 - (x - 9) // 3) if 9 <= x <= 22 else 15)
        v.set(21, 12, 3); v.set(22, 12, 3)
    elif style == 9:    # boy: curtains (a middle part)
        cap(rx=10.2, ry=10, cy=13.3, hl=lambda x: (8 + abs(x - 16) // 2) if 9 <= x <= 22 else 16)
        v.set(16, 7, 4); v.set(16, 8, 4)
    elif style == 10:   # boy: short and spiky
        cap(rx=9.6, ry=9, cy=13, hl=lambda x: 9 if 9 <= x <= 22 else 13)
        for x in range(7, 26, 3): v.poly([(x - 1.5, 6), (x + 1.5, 6), (x + 0.5, 2)], 3)
    elif style == 11:   # boy: a messy fringe over the eyes
        cap(rx=10.4, ry=10.2, cy=13.4, hl=lambda x: (12 + (x % 3)) if 9 <= x <= 22 else 16)
    elif style == 12:   # boy: a longer cut, past the ears
        cap(rx=10.6, ry=10.6, cy=13.8, hl=lambda x: 11 + (x % 2) if 9 <= x <= 22 else 32)
        side(5, 8, 12, 22); side(23, 26, 12, 22)
    elif style == 13:   # boy: a wavy perm
        cap(rx=11, ry=10.6, cy=13.2, hl=lambda x: 10 + (1 if (x // 2) % 2 else 0) if 9 <= x <= 22 else 15)
        for x in range(6, 27, 2): v.set(x, 3 + (x % 4 == 0), 3)
    elif style == 14:   # boy: swept up (a quiff), forehead out
        cap(rx=10, ry=10, cy=13.2, hl=lambda x: 7 if 9 <= x <= 22 else 14)
        ell(v, 15, 4, 6, 3.4, 3)
    # brows (in the hair's colour) where the fringe doesn't cover them: the face's y 11-12
    for cx in (11.5, 20.5):
        for dx in range(-2, 3):
            x, y = int(cx + dx), 11
            if v.get(x, y) is None and v.get(x, y - 1) is None and v.get(x, y - 2) is None: v.set(x, y, 4)
    # shading
    for y in range(32):
        for x in range(32):
            if v.p[y][x] == 3:
                below = v.get(x, y + 1)
                if y > 18 or (below is None and y > 8): v.p[y][x] = 4
                elif 5 <= y <= 6 and 9 <= x <= 22: v.p[y][x] = 2
                elif y == 4 and 12 <= x <= 19: v.p[y][x] = 2
                elif (x <= 6 or x >= 25) and y > 12: v.p[y][x] = 4
    for (x, y) in ((11, 5), (12, 5), (13, 6)):
        if v.get(x, y) in (2, 3): v.set(x, y, 1)
    # keep the brows as brows (not an outline)
    br = [(x, 11) for x in range(32) if v.get(x, 11) == 4 and v.get(x, 10) is None]
    for (x, y) in br: v.set(x, y, None)
    v.outline(0)
    for (x, y) in br: v.set(x, y, 4)
    # (the outline isn't drawn into the face: where it would sit on the face, the face's own
    # pixels show - hair edges over skin get a dark line all the same, which reads as hair)
    return v

# ---------------------------------------------------------------- accessories (row 0)
def acc(k):
    if k == 6:   # round glasses: 32 x 16 at y 8
        v = Cv(32, 16)
        for cx in (11.5, 20.5):
            for a in range(36):
                t = a * math.pi / 18
                v.set(cx + math.cos(t) * 3.6, 8 + math.sin(t) * 3.3, 12)
        v.rect(15, 7, 16, 7, 12); v.rect(4, 7, 7, 7, 12); v.rect(24, 7, 27, 7, 12)
        return v
    v = Cv(16, 16)
    if k == 1:   # a big ribbon bow (red)
        v.poly([(8, 7), (1, 2), (1, 12)], 2); v.poly([(8, 7), (15, 2), (15, 12)], 2)
        v.poly([(7, 8), (4, 15), (6, 15), (8, 10)], 3); v.poly([(9, 8), (12, 15), (10, 15), (8, 10)], 3)
        ell(v, 8, 7, 2, 2, 5)
        v.set(3, 5, 4); v.set(13, 5, 4)
    elif k == 2: # a star clip (gold)
        pts = []
        for a in range(10):
            r = 6.5 if a % 2 == 0 else 2.8
            t = -math.pi / 2 + a * math.pi / 5
            pts.append((8 + math.cos(t) * r, 8 + math.sin(t) * r))
        v.poly(pts, 8); v.set(7, 6, 1); v.set(8, 9, 9)
    elif k == 3: # a flower (pink, gold middle)
        for a in range(5):
            t = a * 2 * math.pi / 5
            ell(v, 8 + math.cos(t) * 3.6, 8 + math.sin(t) * 3.6, 2.8, 2.8, 4)
        ell(v, 8, 8, 2, 2, 8)
    elif k == 4: # a heart clip
        ell(v, 5.5, 6, 3, 3, 5); ell(v, 10.5, 6, 3, 3, 5)
        v.poly([(2.6, 7), (13.4, 7), (8, 14)], 5); v.set(5, 5, 1)
    elif k == 5: # a hoop earring, silver
        for a in range(24):
            t = a * math.pi / 12
            v.set(8 + math.cos(t) * 1.6, 10 + math.sin(t) * 2, 10)
        v.set(8, 7, 10)
    v.outline(0)
    return v

# ---------------------------------------------------------------- icons (row 0)
def icon(k):
    v = Cv(16, 16)
    if k == 0:     # a heart
        ell(v, 5, 6, 3.6, 3.6, 5); ell(v, 11, 6, 3.6, 3.6, 5); v.poly([(1.5, 7), (14.5, 7), (8, 14.5)], 5)
        v.set(4, 4, 1); v.set(5, 4, 1); v.set(4, 5, 1)
    elif k == 1:   # a star
        pts = []
        for a in range(10):
            r = 7 if a % 2 == 0 else 3
            t = -math.pi / 2 + a * math.pi / 5
            pts.append((8 + math.cos(t) * r, 8.5 + math.sin(t) * r))
        v.poly(pts, 8); v.set(8, 5, 1)
    elif k == 2:   # a music note
        ell(v, 5, 12, 3, 2.3, 7); v.rect(7, 2, 8, 12, 7); v.poly([(8, 2), (13, 4), (13, 7), (8, 5)], 7)
    elif k == 3:   # a pointer (a hand-ish arrow)
        v.poly([(2, 2), (13, 8), (8, 9), (11, 14), (9, 15), (6, 10), (2, 13)], 1)
    elif k == 4:   # a crown
        v.poly([(2, 13), (2, 5), (5, 9), (8, 3), (11, 9), (14, 5), (14, 13)], 8)
        v.rect(2, 11, 14, 13, 9); v.set(8, 6, 2); v.set(5, 11, 6); v.set(11, 11, 2)
    elif k == 5:   # a microphone
        ell(v, 8, 5, 3.5, 3.5, 10); v.rect(7, 8, 9, 15, 12); v.set(7, 3, 1); v.rect(5, 5, 11, 5, 11)
    elif k == 6:   # a light stick
        ell(v, 8, 5, 4, 4, 13); ell(v, 8, 5, 2.2, 2.2, 1); v.rect(7, 9, 9, 15, 1)
    elif k == 7:   # a sparkle
        v.rect(7, 2, 8, 13, 1); v.rect(2, 7, 13, 8, 1); v.rect(5, 5, 10, 10, 1)
        v.set(7, 7, 8); v.set(8, 8, 8)
    elif k == 8:   # a trophy
        v.poly([(3, 2), (13, 2), (11, 8), (5, 8)], 8); v.rect(7, 8, 8, 11, 9); v.rect(4, 12, 11, 14, 9)
        v.set(5, 3, 1); v.set(1, 3, 8); v.set(14, 3, 8)
    elif k == 9:   # a broken heart
        ell(v, 5, 6, 3.6, 3.6, 11); ell(v, 11, 6, 3.6, 3.6, 11); v.poly([(1.5, 7), (14.5, 7), (8, 14.5)], 11)
        for y in range(3, 14): v.set(8 + (1 if y % 3 == 0 else 0), y, None)
    if k != 7: v.outline(0)
    return v

# ---------------------------------------------------------------- the sheet
# rows 0-1: FACE x2, HAIR 0-5; rows 2-3: HAIR 6-13; rows 4-5: HAIR 14, OUTFIT x8 (32 x 16) ...
for k in range(2): put_cv(face(k), k * 2, 0)
HAIRN = 15
for k in range(HAIRN):
    n = k + 2
    put_cv(hairdo(k), (n % 8) * 2, (n // 8) * 2)
names.append('sprite FACE     0 0 2 2 2 # the faces (32 x 32): round, a longer jaw - a skin row (1-3)')
names.append('sprite HAIR     4 0 6 2 2 # the hair (32 x 32): girls 0-7, boys 8-14 - a hair row (4-11)')
names.append('sprite HAIR2    0 2 8 2 2 # (on: style n is HAIR + n * 4)')
names.append('sprite HAIR3    0 4 1 2 2')
# outfits: 32 x 16 cells from col 2 row 4: 7 across, then row 5... (2 cells wide, 1 high)
OUTN = 8
for k in range(OUTN):
    col = 2 + (k % 7) * 2; row = 4 + (k // 7)
    put_cv(outfit(k), col, row)
names.append('sprite OUTFIT   2 4 7 2 1 # the clothes (32 x 16, the shoulders): row 0')
names.append('sprite OUTFIT2  2 5 1 2 1')
# eyes: 32 x 16: row 5 from col 4 (6 of them), row 6 (2)
EYEN = 8
for k in range(EYEN):
    if k < 6: col, row = 4 + k * 2, 5
    else: col, row = (k - 6) * 2, 6
    put_cv(eyes(k), col, row)
names.append('sprite EYES     4 5 6 2 1 # the eyes (32 x 16): girls 0, 1, anyone 2-7 - an eye row (12-14)')
names.append('sprite EYES2    0 6 2 2 1')
# glasses (32 x 16) at col 4 row 6
put_cv(acc(6), 4, 6)
names.append('sprite GLASSES  4 6 1 2 1 # round glasses (32 x 16): row 0')
# mouths: 16 x 16 at col 6.. row 6
for k in range(6): put_cv(mouth(k), 6 + k, 6)
names.append('sprite MOUTH    6 6 6     # mouths with blush: smile, open, cat, o, grin, smirk - the skin row')
# accessories 1-5: col 12.. row 6 (4) and row 7 col 0 (1)
for k in range(1, 6):
    n = 12 + (k - 1)
    put_cv(acc(k), n % 16, 6 + n // 16)
names.append('sprite ACC      12 6 4    # bow, star clip, flower, heart clip: row 0')
names.append('sprite ACC2     0 7 1     # a hoop earring')
# icons: row 7 from col 1
for k in range(10): put_cv(icon(k), 1 + k, 7)
names.append('sprite ICON     1 7 10    # heart, star, note, pointer, crown, mic, light stick, sparkle, trophy, broken heart')

# ---------------------------------------------------------------- WITCH BIAS: a duck icon, two witch hats (row 0)
def duck():
    v = Cv(16, 16)
    ell(v, 8.5, 11, 6, 3.6, 8)                    # the body
    v.poly([(13, 9), (15.5, 7), (15, 11)], 8)     # the tail
    ell(v, 5.5, 5.5, 3.4, 3.2, 8)                 # the head
    v.poly([(0.5, 5.5), (3, 4.6), (3, 7.2), (0.5, 7)], 2)   # the beak
    v.set(5, 4, 12)                               # an eye
    v.poly([(6, 10), (11, 10), (9, 13)], 9)       # a wing
    v.set(4, 4, 1)
    v.outline(0)
    return v
def hat(k):
    v = Cv(32, 16)
    body, hi, band, trim = (12, 11, 3, 8) if k == 0 else (7, 11, 8, 1)
    v.poly([(8, 12.6), (12, 5), (16, 1.5), (27, 0.6), (19, 4), (24, 12.6)], body)
    v.poly([(11, 11), (14, 5), (17, 2.6), (15, 6), (13.5, 11)], hi)
    ell(v, 16, 13.4, 15.2, 2.2, body)
    v.rect(3, 13, 28, 13, hi)
    v.poly([(9, 10), (23, 10), (23.6, 12), (8.6, 12)], band)
    if k == 0:
        v.rect(14, 10, 17, 11, trim); v.rect(15, 10, 16, 11, 12)          # a buckle
    else:
        for (x, y) in ((14, 7), (19, 8), (17, 4)): v.set(x, y, trim); v.set(x + 1, y, trim)   # stars
        v.set(11, 11, 1); v.set(20, 11, 1)
    v.outline(0)
    return v
put_cv(duck(), 11, 7)
put_cv(hat(0), 12, 7)
put_cv(hat(1), 14, 7)
names.append('sprite DUCK     11 7 1    # a duck (the icon after the others)')
names.append('sprite HAT      12 7 2 2 1 # witch hats (32 x 16): row 0')
S.save(D + '/sprites.png')

# ---------------------------------------------------------------- tiles (8 x 8)
# 0 black, 1 white, 2 pink, 3 hot pink, 4 purple, 5 dark purple, 6 lilac, 7 night, 8 gold,
# 9 mint, 10 sky, 11 grey, 12 dark grey, 13 red, 14 the font's shadow
TP = [c(0,0,0), c(7,7,3), c(7,5,3), c(7,2,2), c(4,1,2), c(2,0,1), c(6,5,3), c(1,0,1),
      c(7,6,0), c(3,7,2), c(3,5,3), c(5,5,2), c(2,2,1), c(7,1,1), c(3,0,1), MAGENTA]
palette_png(D + '/tile_pal.png', [TP])
T = Sheet(8, 16, TP)
font_into(T, 1, shadow=14, paper=5, chars=range(32, 96))
K = {('%x' % i): i for i in range(16)}; K['.'] = 15
def tile(n, rows): T.put(n % 16, n // 16, rows, K)
tile(1, ['55555555'] * 8)                                                    # BOX: the panels
tile(2, ['44444444'] * 8)                                                    # BOX2
tile(3, ['66666666', '65555555', '65555555', '65555555', '65555555', '65555555', '65555555', '65555555'])  # frame TL
tile(4, ['66666666'] + ['55555555'] * 7)                                     # T
tile(5, ['66666666', '55555554', '55555554', '55555554', '55555554', '55555554', '55555554', '55555554'])  # TR
tile(6, ['65555555'] * 8)                                                    # L
tile(7, ['55555554'] * 8)                                                    # R
tile(8, ['65555555'] * 7 + ['64444444'])                                     # BL
tile(9, ['55555555'] * 7 + ['44444444'])                                     # B
tile(10, ['55555554'] * 7 + ['44444444'])                                    # BR
# bars: 96-104 (0-8 pixels filled) pink, 105-113 mint
for k in range(9):
    for base, f in ((96, '3'), (105, '9')):
        rows = ['77777777'] + [''.join(f if x < k else 'c' for x in range(8)) for _ in range(6)] + ['77777777']
        tile(base + k, rows)
tile(11, ['55555555', '55355355', '53333335', '53333335', '55333355', '55533555', '55555555', '55555555'])  # heart (on BOX)
tile(12, ['55555555', '55588555', '55888855', '88888888', '55888855', '58855885', '55555555', '55555555'])  # star
tile(13, ['00000000'] * 8)                                                   # BLACK
tile(14, ['55555555', '55111555', '51111155', '51111155', '55111555', '55515555', '55511155', '55555555'])  # fan (a person)
tile(15, ['55555555', '55588855', '58555585', '58588885', '58588585', '55888855', '55555555', '55555555'])  # money (a coin)
T.save(D + '/tiles.png')

open(D + '/layout.txt', 'w').write('''# KPOP GROUP MANAGER - names for the cells of tiles.png (8 x 8) and sprites.png (16 x 16)
# tile   NAME   index [count]
# sprite NAME   column row [frames [w h]]
# sprite palettes (spr_pal.png rows): 0 clothes / accessories / icons, 1-3 skin, 4-11 hair
# (black, brown, caramel, blonde, pink, blue, silver, red), 12-14 eyes, 15 white (a flash)
tile   BOX      1         # the panels
tile   BOX2     2
tile   FTL      3         # a frame
tile   FT       4
tile   FTR      5
tile   FL       6
tile   FR       7
tile   FBL      8
tile   FB       9
tile   FBR      10
tile   HEART    11
tile   STAR     12
tile   BLACK    13
tile   FAN      14
tile   COIN     15
tile   BARP     96 9      # a pink bar cell: 0-8 filled
tile   BARM     105 9      # a mint one

''' + '\n'.join(names) + '\n')

# a preview: every part
im = S.img.convert('RGB').resize((S.w * 3, S.h * 3), Image.NEAREST)
im.save(os.path.join(HERE, 'parts_preview.png'))
print('ok')
