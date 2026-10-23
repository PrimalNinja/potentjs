# Z-BOMBER - the map's sectors, drawn for Layer 2: writes blocks.bin (storyc.py puts it in the
# story banks: Data.BLOCKPAGE) and iso_preview.png.
# (run: python3 tools/isoart.py)   (c) 2026 Cyborg Unicorn Pty Ltd
#
# Each sector is a 32 x 40 picture, one byte a pixel (a Layer 2 colour, RRRGGGBB; 0 = see-through,
# not drawn): the diamond top (32 x 16, its middle at 16, 24), the board's edge under it (8 pixels
# thick), and 16 pixels of room above for what stands on it (rocks, a planet, a base). Six to an
# 8K page (7,680 bytes), the 9 pictures in two pages:
#   0 space   1 nebula   2 asteroids   3 a rift   4-6 planets (red, ice, gas)   7 your base
#   8 the IRON SWARM's base
import os, math, random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 32, 40
CX, CY = 16, 24
random.seed(2199)

def c8(r, g, b):
    v = (r << 5) | (g << 2) | b
    if v == 0: v = 0x01            # 0 is see-through: the darkest blue instead of black
    if v == 0xE3: v = 0xE2
    return v

def blank(): return [[0] * W for _ in range(H)]

def on_top(x, y):
    # inside the diamond top (32 x 16 about CX, CY)
    return abs(x + 0.5 - CX) / 16 + abs(y + 0.5 - CY) / 8 <= 1

def slab(p, left, right, edge):
    # the board's edge: under the diamond's two lower sides, 8 pixels deep
    for x in range(W):
        # the diamond's lower edge at x
        yb = CY + 8 - abs(x + 0.5 - CX) / 2
        for y in range(int(yb), int(yb) + 8):
            if 0 <= y < H: p[y][x] = left if x < CX else right
        if 0 <= int(yb) + 7 < H: p[int(yb) + 7][x] = edge

def top(p, fn):
    for y in range(H):
        for x in range(W):
            if on_top(x, y): p[y][x] = fn(x, y)
    # the rim of the diamond, lighter
def rim(p, col):
    for x in range(W):
        d = abs(x + 0.5 - CX)
        yt = int(CY - 8 + d / 2); yb = int(CY + 8 - d / 2) - 1
        if 0 <= yt < H and on_top(x, yt): p[yt][x] = col
        if 0 <= yb < H and on_top(x, yb): p[yb][x] = col

def disc(p, cx, cy, r, fn):
    for y in range(H):
        for x in range(W):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r: p[y][x] = fn(x, y, dx / r, dy / r)

SPACE_TOP = lambda x, y: c8(0, 0, 1) if (x * 7 + y * 13) % 29 else c8(1, 1, 2)
def space():
    p = blank(); slab(p, c8(0, 0, 1), c8(1, 1, 1), c8(2, 2, 2)); top(p, SPACE_TOP); rim(p, c8(1, 2, 3)); return p

def nebula():
    p = blank(); slab(p, c8(1, 0, 1), c8(2, 0, 1), c8(3, 1, 2))
    cols = [c8(2, 0, 1), c8(3, 0, 2), c8(4, 1, 2), c8(5, 1, 3), c8(3, 1, 3)]
    top(p, lambda x, y: cols[int((math.sin(x * 0.7) + math.cos(y * 1.3 + x * 0.3) + 2) * 1.2 + random.random()) % 5])
    rim(p, c8(5, 2, 3)); return p

def asteroids():
    p = blank(); slab(p, c8(1, 1, 0), c8(2, 1, 0), c8(3, 2, 1)); top(p, lambda x, y: c8(1, 1, 0) if (x + y) % 5 else c8(2, 1, 0))
    rim(p, c8(3, 2, 1))
    for (rx, ry, r) in ((9, 18, 5), (21, 16, 6), (15, 25, 4), (25, 25, 3)):
        disc(p, rx, ry, r, lambda x, y, u, v: c8(5, 4, 2) if u + v < -0.6 else (c8(3, 2, 1) if u + v < 0.5 else c8(2, 1, 0)))
    return p

def rift():
    p = blank(); slab(p, c8(0, 0, 1), c8(1, 0, 1), c8(2, 0, 2))
    def f(x, y):
        dx, dy = (x + 0.5 - CX) / 16, (y + 0.5 - CY) / 8
        d = math.hypot(dx, dy); a = math.atan2(dy, dx)
        s = math.sin(a * 2 + d * 9)
        if d < 0.25: return c8(0, 0, 0)
        if s > 0.6: return c8(6, 3, 3) if d < 0.6 else c8(3, 0, 2)
        return c8(1, 0, 1) if d > 0.5 else c8(0, 0, 0)
    top(p, f); rim(p, c8(4, 1, 3)); return p

def planet(kind):
    p = space()
    def red(x, y, u, v):
        l = -u * 0.6 - v * 0.8
        band = (y // 3) % 2
        if l > 0.4: return c8(7, 5, 2)
        if l > -0.1: return c8(6, 2, 0) if band else c8(5, 2, 0)
        return c8(3, 1, 0)
    def ice(x, y, u, v):
        l = -u * 0.6 - v * 0.8
        if l > 0.4: return c8(7, 7, 3)
        if l > -0.1: return c8(4, 6, 3) if (x * 3 + y) % 7 else c8(6, 7, 3)
        return c8(1, 3, 2)
    def gas(x, y, u, v):
        l = -u * 0.6 - v * 0.8
        band = int((v + 1) * 4) % 3
        base = [c8(6, 5, 1), c8(5, 3, 1), c8(7, 6, 2)][band]
        if l < -0.2: return [c8(3, 2, 0), c8(2, 1, 0), c8(3, 3, 1)][band]
        return base
    fn = [red, ice, gas][kind]
    # its shadow on the board, then the planet floating over its sector
    for y in range(H):
        for x in range(W):
            if on_top(x, y) and ((x + 0.5 - 18) / 9) ** 2 + ((y + 0.5 - 26) / 4) ** 2 <= 1: p[y][x] = c8(0, 0, 0) if (x + y) % 2 else c8(0, 0, 1)
    disc(p, 16, 13, 9, fn)
    if kind == 2:                  # rings
        for a in range(0, 360, 4):
            x = 16 + 13 * math.cos(math.radians(a)); y = 14 + 3.5 * math.sin(math.radians(a))
            if math.sin(math.radians(a)) > 0 or math.hypot(x - 16, (y - 13)) > 9:
                p[int(y)][int(x)] = c8(7, 6, 2)
    return p

def base(blue):
    p = space()
    hi, mid, lo, glow = ((c8(6, 7, 3), c8(2, 4, 3), c8(1, 1, 2), c8(3, 7, 3)) if blue else
                         (c8(7, 4, 2), c8(5, 0, 0), c8(2, 0, 0), c8(7, 7, 0)))
    # a pad on the board
    for y in range(H):
        for x in range(W):
            if on_top(x, y) and abs(x + 0.5 - CX) / 12 + abs(y + 0.5 - CY) / 6 <= 1: p[y][x] = lo if (x + y) % 4 else mid
    if blue:
        # a station: a ring round a tower
        for x in range(12, 20):
            for y in range(6, 24): p[y][x] = hi if x < 14 else (mid if x < 18 else lo)
        for a in range(0, 360, 3):
            x = 16 + 13 * math.cos(math.radians(a)); y = 14 + 4 * math.sin(math.radians(a))
            p[int(y)][int(x)] = glow if a % 30 == 0 else hi
        for y in range(3, 6): p[y][15] = glow; p[y][16] = glow
    else:
        # a hive: spikes
        for k, (sx, sh) in enumerate(((8, 12), (13, 18), (16, 22), (19, 18), (24, 12))):
            for y in range(24 - sh, 24):
                w = max(1, (y - (24 - sh)) // 4)
                for x in range(sx - w, sx + w + 1): p[y][x] = hi if x < sx else (mid if x == sx else lo)
            p[24 - sh][sx] = glow
    return p

pics = [space(), nebula(), asteroids(), rift(), planet(0), planet(1), planet(2), base(True), base(False)]
data = bytearray()
for k, p in enumerate(pics):
    if k == 6: data += bytes(8192 - len(data))           # the second page
    for row in p: data += bytes(row)
data += bytes(16384 - len(data))
open(os.path.join(HERE, 'blocks.bin'), 'wb').write(data)

def rgb(v): return ((v >> 5) * 255 // 7, ((v >> 2) & 7) * 255 // 7, (v & 3) * 255 // 3)
img = Image.new('RGB', (len(pics) * 34 * 3, H * 3), (40, 40, 40))
for k, p in enumerate(pics):
    for y in range(H):
        for x in range(W):
            if p[y][x]:
                for a in range(3):
                    for b in range(3): img.putpixel(((k * 34 + x) * 3 + a, y * 3 + b), rgb(p[y][x]))
img.save(os.path.join(HERE, 'iso_preview.png'))
print(len(pics), 'pictures,', len(data), 'bytes')
