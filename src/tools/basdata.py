# basdata.py - the bytes a Next game keeps in an NTC BASIC class (its "db" lines after a label)
# as a JS array, for a port:
#   python3 tools/basdata.py <file.cls> <label> <JS variable> <out.js>
# e.g.  python3 tools/basdata.py ../GEMRUSH/Caves.cls cv_data GEMRUSH_CAVES js/data-gemrush.js
# (c) 2026 Cyborg Unicorn Pty Ltd - MIT License
import sys, re
src, label, var, out = sys.argv[1:5]
lines = open(src, errors='replace').read().split('\n')
vals = []
on = False
for l in lines:
    t = l.strip()
    if t.startswith(label + ':'):
        on = True
        continue
    if on:
        if t.startswith('db '):
            for v in t[3:].split(';')[0].split(','):
                v = v.strip()
                vals.append(int(v[1:], 16) if v.startswith('#') else int(v))
        elif t and not t.startswith(';'):
            break
rows = ['\t' + ', '.join(str(v) for v in vals[k:k + 32]) for k in range(0, len(vals), 32)]
open(out, 'w').write('// %s - made by tools/basdata.py from %s (%s): don\'t edit, run the tool.\n// (c) 2026 Cyborg Unicorn Pty Ltd\nvar %s = [\n%s\n];\n' % (out.split('/')[-1], src.split('/')[-1], label, var, ',\n'.join(rows)))
print('%s: %d bytes' % (out, len(vals)))
