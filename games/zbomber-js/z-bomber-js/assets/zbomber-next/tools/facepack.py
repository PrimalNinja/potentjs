# facepack.py - IDOL WINGS's two sets of sprite patterns, for swapping in and out of the Next's
# sprite RAM (it holds 128): the faces (gfx_faces/: KPOP GROUP MANAGER's face parts, with WITCH
# BIAS's hats) for the talk scenes, and the game's own (gfx/) to put back after.
# Writes tools/faces.bin and tools/game.bin (16K each: storyc.py puts them in the story banks),
# FaceSet.cls (the face parts' pattern numbers, their palettes, Load) and GameSet.cls (the game's
# palettes, Load).   (run: python3 tools/facepack.py, after art_mechra.py)
# (c) 2026 Cyborg Unicorn Pty Ltd
import os, re, subprocess, tempfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

LOAD = '''            pop hl
            ld a, (hl)
            ld ({fp}), a
            ld bc, #243B
            ld a, #43               ; the sprites' first palette
            out (c), a
            inc b
            ld a, #20
            out (c), a
            dec b
            ld a, #40
            out (c), a
            inc b
            xor a
            out (c), a
            dec b
            ld a, #41
            out (c), a
            inc b
            ld hl, fs_pal
            ld e, NPAL
fs_pl:
            ld a, (hl)
            out (c), a
            inc hl
            dec e
            jr nz, fs_pl
            dec b
            ld a, #43
            out (c), a
            inc b
            xor a
            out (c), a
            dec b
            ld a, #56               ; the patterns' pages in slots 6 and 7
            out (c), a
            inc b
            ld a, ({fp})
            out (c), a
            dec b
            ld a, #57
            out (c), a
            inc b
            ld a, ({fp})
            inc a
            out (c), a
            ld bc, #303B            ; from pattern 0
            xor a
            out (c), a
            ld hl, #C000
            ld c, #5B
            ld d, NBLK              ; 256 bytes at a time
fs_lp:
            ld b, 0
            otir
            dec d
            jr nz, fs_lp
            ld bc, #243B            ; bank 5 back in slots 6 and 7
            ld a, #56
            out (c), a
            inc b
            ld a, 10
            out (c), a
            dec b
            ld a, #57
            out (c), a
            inc b
            ld a, 11
            out (c), a
            jp fs_end
fs_pal:'''

def pack(src_dir, binname, cls, what, consts_too):
    tmp = tempfile.mkdtemp()
    shutil.copytree(src_dir, os.path.join(tmp, 'gfx'))
    out = os.path.join(tmp, 'F.cls')
    subprocess.run(['node', os.path.join(ROOT, 'gfxtool.js'), 'build', os.path.join(tmp, 'gfx'), out], check=True, stdout=subprocess.DEVNULL)
    src = open(out).read()
    shutil.rmtree(tmp)

    def block(label):
        m = re.search(r'^' + label + r':\s*$(.*?)(?=^\S)', src, re.M | re.S)
        vals = []
        for l in m.group(1).splitlines():
            l = l.strip()
            if l.startswith('db '):
                vals += [int(v.strip().replace('#', ''), 16) for v in l[3:].split(',')]
        return vals

    pats = block('pats')
    spal = block('spal')
    assert len(pats) <= 16384 and 0 < len(spal) <= 256 and len(spal) % 16 == 0, (len(pats), len(spal))
    open(os.path.join(HERE, binname), 'wb').write(bytes(pats + [0] * (16384 - len(pats))))
    consts = re.findall(r'^Public Const (S_\w+) = (\d+)', src, re.M)
    L = []
    A = L.append
    A("' %s - %s (made by tools/facepack.py: don't edit). Its patterns are in the" % (cls, what))
    A("' story banks (two pages, from tools/%s); Load page puts them in the Next's sprite RAM and its" % binname)
    A("' palettes in the sprite palettes.")
    A("' (c) 2026 Cyborg Unicorn Pty Ltd")
    A('Option Explicit')
    A('')
    if consts_too:
        for n, v in consts: A('Public Const %s = %s' % (n, v))
        A('')
    A('Private fp As Integer')
    A('')
    A('Public Sub Load(ByVal page As Integer)')
    A('#asm')
    A(LOAD.replace('NPAL', str(len(spal) & 255)).replace('NBLK', str((len(pats) + 255) // 256)))
    for k in range(0, len(spal), 16): A('            db ' + ', '.join('#%02X' % v for v in spal[k:k + 16]))
    A('fs_end:')
    A('#endasm')
    A('End Sub')
    open(os.path.join(ROOT, cls + '.cls'), 'w').write('\r\n'.join(L) + '\r\n')
    print('%s: %d patterns, %d palettes' % (binname, len(pats) // 128, len(spal) // 16))

pack(os.path.join(ROOT, 'gfx_faces'), 'faces.bin', 'FaceSet', "the face parts of KPOP GROUP MANAGER (and WITCH BIAS's hats) for the talk scenes", True)
pack(os.path.join(ROOT, 'gfx'), 'game.bin', 'GameSet', "the game's own sprites, put back after a talk scene", False)
