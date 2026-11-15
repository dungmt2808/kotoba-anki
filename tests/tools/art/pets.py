from spr import Spr, PAL
from PIL import Image
import json

W, H = 16, 13
def new(): return Spr(W, H)

def cat(frame):
    s = new(); body = "t"
    if frame == "sleep":
        s.ell(7.5, 9.5, 5.5, 3, body); s.ell(11.5, 8.5, 2.6, 2.4, body); s.px(10, 5, body); s.px(13, 6, body)
        s.dots(((5, 7), (7, 7), (9, 7)), "B"); s.line(2, 11, 6, 12, body); s.dots(((11, 9), (13, 9)), "B")
        return s.outline()
    if frame == "sit":
        s.ell(6.5, 9, 3.2, 3.5, body); s.disc(9.5, 4.5, 2.8, body); s.dots(((7, 1), (8, 2), (12, 1), (11, 2)), body)
        s.line(3, 12, 1, 9, body); s.dots(((5, 7), (5, 9), (7, 8)), "B"); s.dots(((8, 4), (11, 4)), "k"); s.px(10, 6, "p")
        s.px(7, 12, "c"); s.px(9, 12, "c")
        return s.outline()
    s.ell(7, 7.5, 4.8, 2.6, body); s.disc(12, 5, 2.5, body); s.dots(((11, 2), (13, 2), (10, 3), (14, 3)), body)
    s.line(2, 6, 0, 3, body); s.dots(((5, 6), (7, 6), (9, 6)), "B"); s.dots(((11, 5), (13, 5)), "k"); s.px(12, 7, "p")
    legs = ((4, 10), (5, 11), (9, 10), (10, 11)) if frame == "walk0" else ((3, 10), (3, 11), (10, 10), (11, 11))
    for x, y in legs: s.px(x, y, body)
    s.px(4 if frame == "walk0" else 6, 10, body); s.px(8, 10, body)
    return s.outline()

def shiba(frame):
    s = new(); body = "o"
    if frame == "sleep":
        s.ell(7.5, 9.5, 5.5, 2.8, body); s.ell(11.5, 8.5, 2.6, 2.3, body); s.dots(((10, 6), (13, 6)), body)
        s.ell(12, 9.6, 1.5, 1, "c"); s.disc(3, 8, 1.6, body); s.px(3, 8, "c"); s.dots(((11, 8),), "k")
        return s.outline()
    if frame == "sit":
        s.ell(6.5, 9, 3.4, 3.4, body); s.disc(9.5, 4.5, 3, body); s.dots(((7, 1), (7, 2), (12, 1), (12, 2)), body)
        s.ell(10.5, 6, 1.6, 1.1, "c"); s.ell(8, 9.5, 1.4, 2, "c"); s.disc(2.5, 8, 1.7, body); s.px(2, 8, "c")
        s.dots(((8, 4), (11, 4)), "k"); s.px(11, 5, "k")
        return s.outline()
    s.ell(7, 7.5, 5, 2.7, body); s.disc(12, 4.8, 2.7, body); s.dots(((11, 1), (11, 2), (14, 2), (14, 1)), body)
    s.ell(13, 6, 1.6, 1, "c"); s.disc(2, 4.5, 1.6, body); s.px(2, 4, "c"); s.ell(8, 9, 2.4, 0.8, "c")
    s.dots(((11, 4),), "k"); s.px(14, 5, "k")
    legs = ((4, 10), (4, 11), (10, 10), (10, 11)) if frame == "walk0" else ((3, 10), (2, 11), (11, 10), (12, 11))
    for x, y in legs: s.px(x, y, body)
    s.dots(((6, 10), (8, 10), (6 if frame == "walk0" else 7, 11)), body)
    return s.outline()

def hen(frame):
    s = new(); body = "w"
    if frame == "sleep":
        s.ell(7.5, 9, 5, 3.2, body); s.disc(11, 6.5, 2.2, body); s.dots(((11, 4), (12, 4)), "r"); s.px(13, 7, "y")
        s.line(4, 8, 8, 9, "s"); s.line(10, 7, 11, 7, "k")
        return s.outline()
    if frame == "sit":   # mổ thóc
        s.ell(6.5, 8, 4.5, 3, body); s.disc(11.5, 9.5, 2, body); s.dots(((11, 7), (12, 7)), "r"); s.px(13, 11, "y")
        s.dots(((2, 5), (3, 4), (2, 6)), body); s.line(4, 8, 7, 9, "s"); s.px(11, 9, "k"); s.dots(((6, 11), (8, 11)), "y")
        s.dots(((14, 12), (12, 12)), "c")
        return s.outline()
    s.ell(6.5, 7, 4.5, 3, body); s.disc(11, 3.5, 2.2, body); s.dots(((10, 0), (11, 0), (11, 1)), "r"); s.px(14, 3, "y"); s.px(13, 3, "y")
    s.px(12, 5, "r"); s.dots(((2, 4), (2, 3), (3, 3), (1, 5)), body); s.line(4, 7, 7, 8, "s"); s.px(11, 3, "k")
    legs = ((6, 10), (6, 11), (8, 10), (9, 11)) if frame == "walk0" else ((6, 10), (5, 11), (8, 10), (8, 11))
    for x, y in legs: s.px(x, y, "y")
    return s.outline()

def rabbit(frame):
    s = new(); body = "w"
    if frame == "sleep":
        s.ell(7.5, 9.5, 5, 2.8, body); s.disc(11.5, 8, 2.2, body); s.line(9, 6, 6, 5, body); s.line(10, 6, 7, 4, body)
        s.px(7, 5, "P"); s.px(2, 9, body); s.px(12, 8, "k")
        return s.outline()
    if frame == "sit":
        s.ell(6.5, 9, 3.6, 3.4, body); s.disc(9.5, 5.5, 2.5, body); s.line(8, 3, 8, 0, body); s.line(10, 3, 11, 0, body)
        s.px(8, 1, "P"); s.px(11, 1, "P"); s.px(10, 5, "k"); s.px(11, 7, "p"); s.disc(2.5, 9.5, 1.2, body)
        s.line(12, 10, 14, 9, "o"); s.px(14, 8, "g")    # cà rốt
        return s.outline()
    hop = frame == "walk1"
    dy = -1 if hop else 0
    s.ell(7, 8 + dy, 4.4, 2.8, body); s.disc(11.5, 5.5 + dy, 2.4, body)
    s.line(10, 3 + dy, 9, 0 + dy if not hop else 0, body); s.line(12, 3 + dy, 12, 0, body); s.px(9, 1, "P"); s.px(12, 1, "P")
    s.px(12, 5 + dy, "k"); s.px(14, 6 + dy, "p"); s.disc(2.5, 7 + dy, 1.3, body)
    if hop:
        s.line(4, 10, 2, 11, body); s.line(9, 10, 11, 11, body)
    else:
        s.dots(((4, 11), (5, 11), (9, 11), (10, 11)), body)
    return s.outline()

def duck(frame):
    s = new(); body = "y"
    if frame == "sleep":
        s.ell(7.5, 9.5, 4.5, 2.6, body); s.disc(10, 7.5, 2.2, body); s.px(12, 8, "o"); s.line(8, 7, 9, 7, "k"); s.line(4, 9, 7, 10, "Y")
        return s.outline()
    if frame == "sit":
        s.ell(7, 9.5, 4.5, 2.6, body); s.disc(10, 5.5, 2.4, body); s.ell(13, 6.5, 1.3, 0.7, "o"); s.px(10, 5, "k"); s.line(4, 9, 7, 10, "Y")
        return s.outline()
    s.ell(7, 8, 4.5, 2.6, body); s.disc(10.5, 4.5, 2.4, body); s.ell(13.5, 5.5, 1.3, 0.7, "o"); s.px(11, 4, "k")
    s.line(4, 8, 7, 9, "Y"); s.px(2, 7, body)
    feet = ((6, 11), (5, 12), (9, 11), (9, 12)) if frame == "walk0" else ((6, 11), (6, 12), (9, 11), (10, 12))
    for x, y in feet: s.px(x, y, "o")
    return s.outline()

def turtle(frame):
    s = new()
    if frame == "sleep":
        s.ell(7.5, 9, 5, 3, "G"); s.dots(((5, 8), (8, 7), (10, 9), (6, 10)), "f"); s.rect(3, 11, 10, 1, "g")
        return s.outline()
    s.ell(7.5, 8, 5, 3, "G"); s.dots(((5, 7), (8, 6), (10, 8), (6, 9), (8, 9)), "f"); s.rect(3, 10, 10, 1, "g")
    head_x = 13 if frame != "sit" else 12
    s.disc(head_x, 8, 1.6, "f"); s.px(head_x + 1, 7, "k"); s.px(1, 9, "f")
    legs = ((4, 11), (10, 11)) if frame == "walk0" else ((5, 11), (11, 11))
    for x, y in legs: s.px(x, y, "f"); s.px(x + 1, y, "f")
    return s.outline()

PETS = {"neko": cat, "shiba": shiba, "niwatori": hen, "usagi": rabbit, "ahiru": duck, "kame": turtle}
FR = ("walk0", "walk1", "sit", "sleep")
out = {k: {f: fn(f).rows() for f in FR} for k, fn in PETS.items()}
sc = 6
img = Image.new("RGB", (len(FR) * 18 * sc, len(PETS) * 15 * sc), "#5ed35e")
for j, k in enumerate(PETS):
    for i, f in enumerate(FR):
        for y, row in enumerate(out[k][f]):
            for x, ch in enumerate(row):
                if ch == ".": continue
                col = PAL[ch]
                for a in range(sc):
                    for b in range(sc):
                        img.putpixel(((i * 18 + 1 + x) * sc + a, (j * 15 + 1 + y) * sc + b), tuple(int(col[q:q + 2], 16) for q in (1, 3, 5)))
img.save("pets.png")
json.dump(out, open("pets.json", "w"))
print("ok")
