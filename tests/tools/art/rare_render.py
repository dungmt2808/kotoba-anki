# rare_render.py IN.json OUT.png — vẽ bảng xem trước các sprite (6x) từ JSON của rare_dump.js
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); P = d['P']; items = d['items']
S = 6; pad = 14; cells = []
for name, frames in items.items():
    for fi, rows in enumerate(frames):
        cells.append((name + ('' if fi == 0 else ' #%d' % fi), rows))
cw = max(len(r[0]) for _, r in cells) * S + pad * 2; ch = max(len(r) for _, r in cells) * S + pad * 2 + 14
cols = 6; W = cols * cw; H = ((len(cells) + cols - 1) // cols) * ch
im = Image.new('RGB', (W, H), '#bfe9ff'); dr = ImageDraw.Draw(im)
for i, (name, rows) in enumerate(cells):
    ox = (i % cols) * cw + pad; oy = (i // cols) * ch + pad
    gy = oy + (ch - pad * 2 - 14) - len(rows) * S
    dr.rectangle([ox - 4, oy + (ch - pad*2 - 14) - 2, ox + cw - pad*2 + 4, oy + (ch - pad*2 - 14) + 4], fill='#5ed35e')
    for j, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != '.': dr.rectangle([ox + x * S, gy + j * S, ox + x * S + S - 1, gy + j * S + S - 1], fill=P.get(c, '#ff00ff'))
    dr.text((ox, oy + ch - pad*2 - 8), name, fill='#1b1b2f')
im.save(sys.argv[2])
