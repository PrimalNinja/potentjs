# Z-BOMBER - the cast: writes people.bin (one 32-byte record each: storyc.py puts it in the story
# banks; Main.bas reads the look and the name). Everyone here is made up.
# A record: 0 girl (1) or not, 1-7 spare, 8-16 the look (face, skin, hair, hair colour, eyes, eye
# colour, mouth, accessory, outfit: the face parts from KPOP GROUP MANAGER, drawn by Face.cls),
# 17-23 spare, 24-31 the name (8 letters, spaces after).
# (run: python3 tools/cast.py)   (c) 2026 Cyborg Unicorn Pty Ltd
import os
HERE = os.path.dirname(os.path.abspath(__file__))

#          name       girl  face skin hair hcol eyes ecol mouth acc outfit
CAST = [('CAPTAIN',  1, [0, 1, 4, 0, 2, 1, 0, 0, 7]),    # 0 you (the name is typed in)
        ('JIN',      0, [0, 1, 13, 0, 3, 0, 4, 0, 1]),   # 1 SPEAR's pilot
        ('MAYA',     1, [1, 2, 9, 5, 4, 2, 4, 5, 4]),    # 2 ANVIL's gunner
        ('DR YOON',  0, [0, 0, 10, 3, 1, 0, 1, 6, 0]),   # 3 the engineer (glasses)
        ('ARI',      1, [1, 0, 7, 6, 6, 2, 2, 0, 6]),    # 4 the ship's AI
        ('VELK',     0, [1, 0, 14, 7, 0, 0, 5, 0, 3]),   # 5 the IRON SWARM's admiral
        ('SERA',     1, [0, 1, 3, 4, 7, 1, 5, 3, 2]),    # 6 his second
        ('ODO',      0, [1, 2, 10, 6, 3, 0, 5, 0, 0])]   # 7 Earth Command (grey, stern)

out = bytearray()
for name, girl, look in CAST:
    r = bytearray(32)
    r[0] = girl
    r[8:17] = bytes(look)
    r[24:32] = name[:8].ljust(8).encode()
    out += r
open(os.path.join(HERE, 'people.bin'), 'wb').write(out)
print(len(CAST), 'people,', len(out), 'bytes')
