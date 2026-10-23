# cast_preview.py - draws the cast's faces as Face.cls puts them together -> tools/cast_preview.png
# (run: python3 tools/cast_preview.py, after cast.py)   (c) 2026 Cyborg Unicorn Pty Ltd
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, '..', 'gfx_faces')
sheet = Image.open(os.path.join(G, 'sprites.png')).convert('RGB')
pal = Image.open(os.path.join(G, 'spr_pal.png')).convert('RGB')
row0 = [pal.getpixel((x, 0)) for x in range(16)]
MAG = (255, 0, 255)
def cell(col, row, prow, img, x, y, w=1, h=1):
    p2 = [pal.getpixel((k, prow)) for k in range(16)]
    for j in range(16 * h):
        for i in range(16 * w):
            c = sheet.getpixel((col * 16 + i, row * 16 + j))
            if c == MAG or c == row0[15]: continue
            k = row0.index(c) if c in row0 else None
            img.putpixel((x + i, y + j), p2[k] if k is not None else c)
def pos(base_col, base_row, n, w, h):
    # frame n of a sprite at (base_col, base_row), frames w x h cells, 16 cells a row
    idx = base_row * 16 + base_col + n * w
    return idx % 16, idx // 16
data = open(os.path.join(HERE, 'people.bin'), 'rb').read()
img = Image.new('RGB', (8 * 40, 50), (20, 20, 60))
for p in range(len(data) // 32):
    r = data[p * 32:p * 32 + 32]; L = list(r[8:17]); x0 = p * 40 + 4
    face, skin, hair, hcol, eyes, ecol, mouth, acc, outfit = L
    c, rw = pos(2, 4, outfit, 2, 1) if outfit < 7 else (2, 5)
    cell(c, rw, 0, img, x0, 16 + 16, 2, 1)
    c, rw = pos(0, 0, face, 2, 2); cell(c, rw, 1 + skin, img, x0, 16, 2, 2)
    c, rw = pos(6, 6, mouth, 1, 1); cell(c, rw, 1 + skin, img, x0 + 8, 16 + 16)
    c, rw = pos(4, 5, eyes, 2, 1) if eyes < 6 else pos(0, 6, eyes - 6, 2, 1); cell(c, rw, 12 + ecol, img, x0, 16 + 8, 2, 1)
    hr = hair
    if hr < 6: c, rw = pos(4, 0, hr, 2, 2)
    elif hr < 14: c, rw = pos(0, 2, hr - 6, 2, 2)
    else: c, rw = (0, 4)
    cell(c, rw, 4 + hcol, img, x0, 16, 2, 2)
    if acc == 6: cell(4, 6, 0, img, x0, 16 + 8, 2, 1)
img = img.resize((img.width * 3, img.height * 3), Image.NEAREST)
img.save(os.path.join(HERE, 'cast_preview.png'))
