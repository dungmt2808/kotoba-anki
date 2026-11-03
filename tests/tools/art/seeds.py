from spr import Spr, sheet
import json

def seedmound(c1="b", c2="t"):
    s = Spr(); s.ell(7.5, 13.5, 2.6, 1.4, c1); s.px(6, 13, c2); s.px(8, 14, c2); return s

S = {}
# ---- Lúa
def blade(s, x0, y0, x1, y1, c, c2):
    s.line(x0, y0, x1, y1, c); s.line(x0 + 1, y0, x1 + (1 if x1 >= x0 else 0), y1 + 1, c2)

def ine():
    out = []
    s = Spr(); s.ell(6.5, 13.5, 1.6, 1.1, "c"); s.ell(9.5, 14, 1.4, 1, "y"); s.px(6, 13, "w"); out.append(s.outline())
    s = Spr()
    blade(s, 6, 15, 4, 10, "g", "f"); blade(s, 7, 15, 7, 8, "g", "G"); blade(s, 9, 15, 11, 10, "f", "g")
    out.append(s.outline())
    s = Spr()
    for a in ((6, 15, 2, 6), (7, 15, 5, 3), (7, 15, 8, 1), (8, 15, 11, 3), (9, 15, 13, 7)):
        blade(s, *a, "g", "G")
    s.line(5, 15, 3, 11, "f"); s.line(10, 15, 12, 11, "f")
    out.append(s.outline())
    s = Spr()
    for a in ((6, 15, 2, 8), (7, 15, 5, 5), (8, 15, 9, 4), (9, 15, 13, 8)):
        blade(s, *a, "g", "G")
    for pts in (((5, 5), (4, 4), (4, 3), (5, 2), (6, 1)), ((9, 4), (10, 3), (11, 2), (12, 2), (13, 3)), ((8, 4), (8, 3), (7, 2), (8, 1), (8, 0))):
        for i, (x, y) in enumerate(pts): s.px(x, y, "f" if i % 2 else "c")
    out.append(s.outline())
    s = Spr()
    for a in ((6, 15, 2, 9), (7, 15, 5, 6), (8, 15, 9, 5), (9, 15, 13, 9)):
        blade(s, *a, "f", "Y")
    for pts in (((5, 6), (4, 5), (3, 4), (2, 4), (1, 5), (1, 6), (1, 7)), ((9, 5), (10, 4), (11, 3), (12, 3), (13, 4), (14, 5), (14, 6)),
                ((7, 5), (7, 4), (6, 3), (6, 2), (7, 1), (8, 1))):
        for i, (x, y) in enumerate(pts): s.px(x, y, "y" if i % 2 else "Y"); s.px(x, y + 1, "y") if i in (2, 4) else None
    out.append(s.outline())
    return out
S["ine"] = ine()

def daikon():
    out = []
    s = seedmound("t", "c"); s.px(7, 13, "w"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 11, "g"); s.ell(5, 10, 2, 1.3, "g"); s.ell(9.5, 10, 2, 1.3, "f"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 9, "G")
    for cx, cy, rx, ry, c in ((4, 8, 2.5, 1.6, "g"), (10.5, 8, 2.5, 1.6, "g"), (5.5, 5, 1.8, 2.3, "G"), (9, 4.5, 1.8, 2.5, "g"), (7.5, 11, 1.5, 1, "f")):
        s.ell(cx, cy, rx, ry, c)
    out.append(s.outline())
    s = Spr()
    for cx, cy, rx, ry, c in ((3.5, 9, 2.6, 1.6, "g"), (11.5, 9, 2.6, 1.6, "g"), (5, 6, 1.8, 2.4, "G"), (10, 6, 1.8, 2.4, "g")):
        s.ell(cx, cy, rx, ry, c)
    s.line(7, 14, 7, 3, "G"); s.line(8, 14, 9, 4, "G")
    s.dots(((6, 2), (7, 1), (8, 2), (9, 3), (10, 2)), "w"); s.dots(((7, 2), (9, 2)), "v")
    s.ell(7.5, 14, 2, 1.4, "e")
    out.append(s.outline())
    s = Spr()
    for cx, cy, rx, ry, c in ((3.5, 3.5, 2.5, 1.7, "g"), (11.5, 3.5, 2.5, 1.7, "g"), (6, 1.8, 1.6, 1.8, "G"), (9.5, 1.8, 1.6, 1.8, "g")):
        s.ell(cx, cy, rx, ry, c)
    s.ell(7.5, 10, 3.2, 5, "e"); s.rect(5, 5, 6, 2, "f"); s.dots(((6, 9), (9, 12), (7, 13)), "s")
    out.append(s.outline())
    return out
S["daikon"] = daikon()

def himawari():
    out = []
    s = Spr(); s.ell(7.5, 13.5, 1.4, 2, "n"); s.line(7, 12, 7, 15, "w"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 9, "g"); s.ell(5, 9, 2, 1.2, "g"); s.ell(10, 9, 2, 1.2, "f"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 2, "g"); s.line(8, 15, 8, 4, "G")
    for cx, cy, c in ((4.5, 11, "g"), (11, 8, "G"), (4.5, 6, "G"), (10.5, 4, "g")): s.ell(cx, cy, 2.4, 1.3, c)
    s.ell(7.5, 1.5, 1.5, 1.5, "f")
    out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 7, "G"); s.ell(4, 12, 2.4, 1.3, "g"); s.ell(11, 10, 2.4, 1.3, "g")
    s.disc(7.5, 4.5, 4.4, "y"); s.disc(7.5, 4.5, 2.2, "B")
    for x, y in ((3, 2), (12, 2), (3, 7), (12, 7), (7, 0)): s.px(x, y, "Y")
    s.px(7, 4, "b"); s.px(8, 5, "b")
    out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 8, "G"); s.ell(4, 12, 2.4, 1.3, "G"); s.ell(11, 11, 2.4, 1.3, "g")
    s.disc(8.5, 5.5, 4.6, "Y"); s.disc(8.5, 5.5, 3.3, "B")
    for x, y in ((7, 4), (9, 4), (8, 6), (10, 6), (7, 7), (9, 8), (11, 5)): s.px(x, y, "c")
    out.append(s.outline())
    return out
S["himawari"] = himawari()

def kabocha():
    out = []
    s = Spr(); s.ell(7.5, 13.8, 2.2, 1.1, "c"); s.px(6, 14, "w"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 11, "g"); s.ell(5, 10.5, 2, 1.4, "g"); s.ell(10, 10.5, 2, 1.4, "f"); out.append(s.outline())
    s = Spr(); s.line(2, 14, 13, 14, "G"); s.line(13, 14, 14, 12, "G")
    for cx, cy, r, c in ((4, 11, 2.6, "g"), (9.5, 10.5, 3, "G"), (13, 9.5, 1.8, "g")): s.disc(cx, cy, r, c)
    s.px(9, 10, "g")
    out.append(s.outline())
    s = Spr(); s.line(1, 14, 14, 14, "G")
    for cx, cy, r, c in ((3.5, 11, 2.6, "g"), (9, 11.5, 2.4, "G"), (13, 10.5, 2, "g")): s.disc(cx, cy, r, c)
    s.ell(7, 6, 2.2, 2.4, "y"); s.px(7, 9, "o"); s.line(7, 8, 7, 10, "G"); s.ell(7, 5, 1, 1, "o")
    out.append(s.outline())
    s = Spr(); s.line(0, 14, 15, 14, "G"); s.disc(2.5, 11, 2.2, "g"); s.disc(13.5, 10.5, 2, "G")
    s.ell(8, 10.5, 4.6, 3.6, "o")
    for x in (6, 8, 10): s.line(x, 8, x, 13, "O")
    s.rect(7, 5, 2, 3, "G"); s.px(9, 5, "g"); s.px(6, 9, "y")
    out.append(s.outline())
    return out
S["kabocha"] = kabocha()

def take():
    out = []
    s = Spr(); s.ell(7.5, 13.5, 2.2, 1.5, "b"); s.px(7, 12, "t"); s.px(7, 11, "B"); out.append(s.outline())
    s = Spr(); s.ell(7.5, 12, 2.6, 3.6, "b"); s.line(7, 8, 8, 6, "B")
    for y in (10, 13): s.line(5, y, 10, y, "t")
    s.px(6, 11, "B"); s.px(9, 12, "B")
    out.append(s.outline())
    s = Spr(); s.rect(7, 3, 2, 13, "g"); s.dots(((7, 7), (8, 7), (7, 11), (8, 11)), "G")
    s.ell(11, 4.5, 2.4, 1, "f"); s.ell(4.5, 8, 2.2, 1, "g"); s.ell(10.5, 1.8, 1.8, 0.9, "g"); s.ell(4, 13.5, 1.4, 1.6, "b")
    out.append(s.outline())
    s = Spr()
    for x, top in ((5, 1), (10, 4)):
        s.rect(x, top, 2, 16 - top, "g")
        for y in range(top + 3, 16, 4): s.rect(x, y, 2, 1, "G")
    for cx, cy, rx in ((3, 3, 2.2), (9, 2, 2), (13.5, 5.5, 1.8), (2.5, 8, 1.8), (13, 9, 1.6)):
        s.ell(cx, cy, rx, 1, "f")
    out.append(s.outline())
    s = Spr()
    for x, top in ((2, 3), (7, 0), (12, 2)):
        s.rect(x, top, 2, 16 - top, "g" if x != 7 else "G")
        for y in range(top + 3, 16, 4): s.rect(x, y, 2, 1, "j" if x == 7 else "G")
    for cx, cy, rx, ry in ((4.5, 2, 2.5, 1.6), (10, 1.5, 2.8, 1.6), (14, 4, 1.6, 1.4), (1, 5, 1.4, 1.3), (5, 7, 1.5, 1), (10.5, 6, 1.5, 1)):
        s.ell(cx, cy, rx, ry, "f")
    s.ell(10, 14.4, 1.2, 1.4, "b")
    out.append(s.outline())
    return out
S["take"] = take()

def tree(canopy, blobs, trunk="b"):
    s = Spr(); s.rect(7, 9, 2, 7, trunk); s.line(8, 11, 11, 9, trunk); s.line(7, 12, 5, 10, trunk)
    s.ell(7.5, 5.5, 6, 4.6, canopy[0])
    s.ell(5, 4, 3, 2.4, canopy[1]); s.ell(10.5, 6.5, 3, 2.2, canopy[2])
    for x, y, c in blobs: s.px(x, y, c)
    return s

def sakura():
    out = []
    s = Spr(); s.disc(7.5, 13.5, 1.6, "t"); s.px(7, 13, "c"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 10, "b"); s.ell(5, 9.5, 2, 1.3, "g"); s.ell(9.5, 8.5, 2, 1.3, "g"); out.append(s.outline())
    s = Spr(); s.rect(7, 9, 2, 7, "b"); s.ell(7.5, 6.5, 4.4, 3.6, "g"); s.ell(6, 5.5, 2, 1.8, "f"); s.px(10, 7, "G"); out.append(s.outline())
    out.append(tree("PpP", ((3, 4, "p"), (6, 2, "w"), (9, 3, "p"), (12, 5, "w"), (5, 7, "w"), (10, 8, "p"), (8, 5, "R")), "B").outline())
    s = tree("gfG", ())
    for x, y in ((4, 5), (9, 3), (11, 7), (6, 8)):
        s.px(x, y, "r"); s.px(x + 1, y + 1, "R"); s.px(x, y - 1, "G")
    out.append(s.outline())
    return out
S["sakura"] = sakura()

def momiji():
    out = []
    s = Spr(); s.ell(6.5, 13.5, 1.3, 1, "b"); s.line(7, 13, 11, 11, "t"); s.px(10, 12, "t"); out.append(s.outline())
    s = Spr(); s.line(7, 15, 7, 10, "b"); s.dots(((6, 8), (7, 7), (8, 8), (5, 9), (9, 9), (7, 9)), "g"); s.px(7, 8, "f"); out.append(s.outline())
    s = Spr(); s.rect(7, 9, 2, 7, "b"); s.ell(7.5, 6, 4.6, 3.6, "g"); s.dots(((4, 5), (8, 3), (11, 6), (6, 8)), "f"); out.append(s.outline())
    out.append(tree("oyO", ((4, 6, "r"), (9, 3, "y"), (11, 7, "r"), (6, 3, "O"))).outline())
    s = tree("rRr", ((4, 4, "o"), (10, 3, "o"), (7, 7, "y"), (12, 6, "R")))
    s.px(2, 13, "r"); s.px(13, 12, "R"); s.px(12, 14, "o")
    out.append(s.outline())
    return out
S["momiji"] = momiji()

def pot(s):
    s.rect(3, 12, 10, 1, "u"); s.rect(4, 13, 8, 3, "l"); s.rect(4, 13, 8, 1, "u"); s.rect(5, 11, 6, 1, "B")
    return s

def bonsai():
    out = []
    s = pot(Spr()); s.px(7, 10, "t"); out.append(s.outline())
    s = pot(Spr()); s.line(7, 10, 7, 8, "g"); s.px(6, 7, "g"); s.px(8, 7, "f"); out.append(s.outline())
    s = pot(Spr()); s.line(7, 10, 6, 7, "b"); s.line(6, 7, 8, 5, "b"); s.ell(8.5, 4, 3, 1.6, "G"); s.ell(9, 3.4, 1.8, 0.8, "g"); out.append(s.outline())
    s = pot(Spr()); s.line(7, 10, 5, 8, "b"); s.line(5, 8, 7, 5, "b"); s.line(7, 5, 9, 3, "b")
    s.ell(4, 6.5, 2.8, 1.3, "G"); s.ell(10.5, 5, 2.6, 1.2, "G"); s.ell(8.5, 1.8, 2.6, 1.2, "G")
    for x, y in ((3, 6), (10, 4), (8, 1)): s.px(x, y, "g")
    out.append(s.outline())
    s = pot(Spr()); s.line(7, 10, 5, 8, "B"); s.line(5, 8, 7, 5, "B"); s.line(7, 5, 9, 3, "B"); s.line(8, 9, 11, 8, "B")
    s.ell(3.5, 6.5, 3, 1.4, "j"); s.ell(11.5, 6.5, 2.8, 1.3, "G"); s.ell(8.5, 1.8, 3, 1.3, "G"); s.ell(7, 4, 1.6, 0.8, "j")
    for x, y in ((3, 6), (11, 6), (8, 1), (6, 4)): s.px(x, y, "g")
    s.dots(((2, 7), (12, 7), (10, 2)), "b"); s.dots(((5, 11), (9, 11)), "f")
    out.append(s.outline())
    return out
S["bonsai"] = bonsai()

for k, v in S.items():
    for i, sp in enumerate(v):
        rows = sp.rows()
        assert len(rows) == 16 and all(len(r) == 16 for r in rows), (k, i)
sheet({k: [sp.rows() for sp in v] for k, v in S.items()}, "seeds.png", 6)
json.dump({k: [sp.rows() for sp in v] for k, v in S.items()}, open("seeds.json", "w"))
print("ok")
