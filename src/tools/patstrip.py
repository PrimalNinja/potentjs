# patstrip.py - a Next game's sprite sheets (nextgfx.py's images/<game>/sprites_<row>.png, 16 x 16
# cells) laid out again as one strip per palette row, the cells in the Next's PATTERN order: the
# order gfxtool.js gives them, each layout sprite's frames one after another (a w-cells-wide
# frame's cells side by side). So in JSprites a sprite's frame number is its pattern number + 1:
#
#   { imagename:'<game>_p0', imagex:0, imagey:0, imagew:16, imageh:16, w:16, h:16, ... }
#   frame GfxData.S_LANDER + 1 is the lander, + 2 its second frame ...
#
# A sprite w cells wide (DEFENDER HYPERSPACE's 32 x 16 ship) uses imagew 32 and imagex its first
# pattern * 16: its frames are then 32 apart, as they are in the strip.
#
#   python3 tools/patstrip.py <the Next game's folder> <the game's images folder> <game name>
#
# Writes images/<game>/patterns_<row>.png for every sprites_<row>.png there (image '<game>_p<row>'),
# and prints the pattern count. Python 3 with Pillow. (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
import os, sys, re, glob
from PIL import Image

game, imgdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
cells = []
for line in open(os.path.join(game, 'gfx', 'layout.txt')):
    line = line.split('#')[0].split()
    if len(line) >= 4 and line[0] == 'sprite':
        col, row = int(line[2]), int(line[3])
        frames = int(line[4]) if len(line) > 4 else 1
        w = int(line[5]) if len(line) > 5 else 1
        h = int(line[6]) if len(line) > 6 else 1
        if h != 1:
            raise SystemExit('patstrip: %s is %d cells tall: only one row of cells per frame is laid out' % (line[1], h))
        for f in range(frames):
            for c in range(w):
                cells.append((col + f * w + c, row))
for src in sorted(glob.glob(os.path.join(imgdir, 'sprites_*.png'))):
    row = os.path.basename(src)[len('sprites_'):-4]
    sheet = Image.open(src).convert('RGBA')
    strip = Image.new('RGBA', (16 * len(cells), 16), (0, 0, 0, 0))
    for n, (c, r) in enumerate(cells):
        strip.paste(sheet.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)), (n * 16, 0))
    strip.save(os.path.join(imgdir, 'patterns_%s.png' % row))
print('%s: %d patterns' % (name, len(cells)))
