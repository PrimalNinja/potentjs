# l2runs.py - a Next game's Layer 2 picture, kept in an NTC BASIC class as runs ("db count, colour"
# pairs after a label, a count of 0 meaning 256), as a PNG for a port:
#   python3 tools/l2runs.py <file.cls> <label> <width> <height> <out.png> [first-last <mask prefix>]
# e.g.  python3 tools/l2runs.py ../CHECKOUT/Store.cls up_data 256 192 images/checkout/store.png F0-FF images/checkout/belt
# The colours are the Layer 2 default palette (an index is its RGB332 colour). Entries a game
# changes at run time (palette cycling: running belts, water, lights) can be given as a range:
# their pixels are left see-through in the picture and each entry gets a mask of its own
# (<prefix>_<hex>.png, white where it is) to be tinted and drawn over it (JSprites.getTintedImage).
# (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
import sys
from PIL import Image

def rgb332(v):
    r = (v >> 5) & 7; g = (v >> 2) & 7; b = v & 3
    b3 = (b << 1) | (1 if b else 0)
    return (r * 255 // 7, g * 255 // 7, b3 * 255 // 7)

src, label, w, h, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
lo, hi, prefix = 256, -1, None
if len(sys.argv) > 7:
    lo, hi = [int(v, 16) for v in sys.argv[6].split('-')]
    prefix = sys.argv[7]

# the db bytes after the label
vals = []
on = False
for l in open(src, errors='replace').read().split('\n'):
    t = l.strip()
    if t.startswith(label + ':'):
        on = True
    elif on:
        if t.startswith('db '):
            for v in t[3:].split(';')[0].split(','):
                v = v.strip()
                vals.append(int(v[1:], 16) if v.startswith('#') else int(v))
        elif t and not t.startswith(';'):
            break

# the runs
pix = []
k = 0
while len(pix) < w * h and k + 1 < len(vals):
    n = vals[k] or 256
    pix.extend([vals[k + 1]] * n)
    k += 2
pix = pix[:w * h]
if len(pix) < w * h:
    sys.exit('%s: only %d pixels in the runs (%d wanted)' % (src, len(pix), w * h))

img = Image.new('RGBA', (w, h))
img.putdata([(0, 0, 0, 0) if lo <= v <= hi else rgb332(v) + (255,) for v in pix])
img.save(out)
print('%s: %d x %d' % (out, w, h))
if prefix:
    for e in range(lo, hi + 1):
        m = Image.new('RGBA', (w, h))
        m.putdata([(255, 255, 255, 255) if v == e else (0, 0, 0, 0) for v in pix])
        m.save('%s_%02X.png' % (prefix, e))
    print('%s_%02X.png - %s_%02X.png: the masks' % (prefix, lo, prefix, hi))
