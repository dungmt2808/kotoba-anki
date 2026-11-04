"""1.21: hình pixel của khách ghé vườn (web/guests.js) — dựng bằng hình cơ bản + tự viền đen như pets.py.

Chạy:  python3 guests.py   → guests.json (khách × khung) + guests.png (ảnh xem thử trên nền cỏ, cỡ ×6)
Mọi khách quay mặt sang phải (JS lật khi đi sang trái). Chép mảng trong guests.json vào SPR của web/guests.js."""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spr  # noqa: E402
from spr import Spr  # noqa: E402

PAL = dict(spr.PAL)
PAL.update({"h": "#b98552", "H": "#7a4e2a", "d": "#3d8bff", "a": "#6b6f86", "A": "#43465a", "i": "#f2e6c8",
            "x": "#5b3f7a", "X": "#3a2752", "q": "#9b7bd0", "z": "#e8e8f2", "Z": "#c9c9d8", "j": "#1f5f2a"})


def suzume(frame):
    s = Spr(12, 9)
    if frame == "peck":
        s.ell(5, 5, 3.6, 2.2, "h"); s.disc(8.6, 6, 1.9, "H"); s.px(10, 7, "a")
        s.dots(((8, 6),), "k"); s.dots(((9, 7), (8, 7)), "w"); s.px(7, 6, "w")
        s.line(1, 3, 2, 4, "H"); s.px(0, 2, "H")
        s.dots(((3, 4), (5, 4)), "B"); s.ell(5, 6.4, 2.2, 0.8, "i")
        s.dots(((5, 8), (7, 8)), "a")
        return s.outline()
    s.ell(5, 5.5, 3.6, 2.2, "h"); s.disc(8.5, 3, 2, "H"); s.px(11, 3, "a")
    s.dots(((8, 3), (9, 4), (7, 4)), "w"); s.px(9, 3, "k"); s.px(8, 5, "k")
    s.line(1, 3, 2, 4, "H"); s.px(0, 2, "H")
    s.dots(((3, 5), (5, 5)), "B"); s.ell(6, 6.6, 2.2, 0.8, "i")
    s.dots(((5, 8), (7, 8)), "a")
    return s.outline()


def neko(frame):
    """Mèo hoang tam thể (khác mèo mướp thú nuôi): trắng, đốm cam + đen."""
    s = Spr(16, 13)
    if frame == "lie":            # nằm dài trên ghế
        s.ell(7.5, 9.5, 5.6, 2.4, "w"); s.disc(12.5, 8.4, 2.4, "w"); s.dots(((11, 5), (11, 6), (14, 5), (14, 6)), "w")
        s.ell(5, 8.6, 1.8, 1.1, "o"); s.ell(9, 9.4, 1.3, 1, "n"); s.px(11, 6, "o"); s.px(12, 6, "o")
        s.line(1, 10, 0, 12, "w"); s.px(0, 12, "o")
        s.dots(((12, 8), (14, 8)), "k"); s.px(13, 10, "p")
        return s.outline()
    if frame == "sit":
        s.ell(6.5, 9, 3.2, 3.5, "w"); s.disc(9.5, 4.5, 2.8, "w"); s.dots(((7, 1), (8, 2), (12, 1), (11, 2)), "w")
        s.dots(((7, 1), (8, 2), (7, 2)), "o"); s.dots(((12, 1), (11, 2), (12, 2)), "n")
        s.ell(5, 8, 1.4, 1.6, "o"); s.ell(7.6, 10.4, 1, 1, "n")
        s.line(3, 12, 1, 9, "w"); s.px(1, 9, "o"); s.dots(((8, 4), (11, 4)), "k"); s.px(10, 6, "p")
        return s.outline()
    if frame == "groom":          # liếm chân
        s.ell(6.5, 9, 3.2, 3.5, "w"); s.disc(10, 5.4, 2.8, "w"); s.dots(((8, 2), (8, 3), (12, 2), (12, 3)), "w")
        s.dots(((8, 2), (8, 3)), "o"); s.dots(((12, 2), (12, 3)), "n")
        s.ell(5, 8, 1.4, 1.6, "o"); s.ell(7.6, 10.4, 1, 1, "n")
        s.line(3, 12, 1, 9, "w"); s.px(1, 9, "o"); s.dots(((9, 5), (11, 5)), "k")
        s.line(11, 8, 12, 7, "w"); s.px(12, 7, "P")
        return s.outline()
    s.ell(7, 7.5, 4.8, 2.6, "w"); s.disc(12, 5, 2.5, "w"); s.dots(((11, 2), (13, 2), (10, 3), (14, 3)), "w")
    s.dots(((10, 3), (11, 2), (11, 3)), "o"); s.dots(((13, 2), (14, 3), (13, 3)), "n")
    s.ell(5, 6.6, 1.8, 1.2, "o"); s.ell(8.5, 7.2, 1.2, 1, "n")
    s.line(2, 6, 0, 3, "w"); s.px(0, 3, "o"); s.dots(((11, 5), (13, 5)), "k"); s.px(12, 7, "p")
    legs = ((4, 10), (5, 11), (9, 10), (10, 11)) if frame == "walk0" else ((3, 10), (3, 11), (10, 10), (11, 11))
    for x, y in legs:
        s.px(x, y, "w")
    s.px(4 if frame == "walk0" else 6, 10, "w"); s.px(8, 10, "w")
    return s.outline()


def cho(frame):
    """Bướm phượng vàng (アゲハ)."""
    s = Spr(9, 8)
    if frame == "f1":             # cánh khép (nhìn nghiêng)
        s.ell(4, 2.6, 1.6, 2.2, "y"); s.px(4, 1, "k"); s.px(4, 3, "k"); s.px(5, 4, "o")
        s.line(4, 5, 4, 6, "n"); s.px(3, 0, "n")
        return s.outline()
    s.ell(2, 2.4, 1.8, 2, "y"); s.ell(6, 2.4, 1.8, 2, "y"); s.ell(2.4, 5, 1.2, 1.2, "y"); s.ell(5.6, 5, 1.2, 1.2, "y")
    s.dots(((1, 2), (7, 2), (2, 5), (6, 5)), "k"); s.dots(((2, 1), (6, 1)), "o"); s.dots(((2, 6), (6, 6)), "d")
    s.line(4, 1, 4, 6, "n"); s.dots(((3, 0), (5, 0)), "n")
    return s.outline()


def kaeru(frame):
    """Ếch xanh (アマガエル)."""
    s = Spr(11, 8)
    s.ell(5, 5, 3.6, 2.2, "g"); s.disc(6.6, 2.8, 1.4, "g"); s.disc(3.6, 2.8, 1.4, "g")
    s.dots(((7, 2), (4, 2)), "k"); s.dots(((7, 3), (4, 3)), "w")
    s.line(2, 7, 0, 7, "g"); s.line(8, 7, 10, 7, "g"); s.px(1, 6, "g"); s.px(9, 6, "g")
    s.dots(((3, 5), (7, 5)), "G")
    if frame == "croak":
        s.ell(5.2, 6.4, 1.8, 1, "c")
    else:
        s.line(4, 6, 6, 6, "G")
    return s.outline()


def sagi(frame):
    """Cò trắng (シラサギ): cổ cong chữ S, chân đen mảnh."""
    s = Spr(14, 18)
    if frame == "dip":            # cúi mỏ xuống nước
        s.ell(5.5, 8, 3.8, 2.4, "w"); s.line(8, 8, 10, 10, "w"); s.line(9, 8, 11, 10, "w")
        s.disc(11.4, 11.4, 1.3, "w"); s.line(12, 12, 13, 14, "y"); s.px(12, 11, "k")
        s.line(1, 7, 2, 8, "z"); s.px(0, 6, "z"); s.line(3, 8, 7, 9, "Z")
        s.line(5, 11, 5, 16, "k"); s.px(6, 16, "k"); s.line(7, 11, 7, 16, "k"); s.px(8, 16, "k")
        return s.outline()
    s.ell(5.5, 9, 3.8, 2.4, "w"); s.line(1, 8, 2, 9, "z"); s.px(0, 7, "z"); s.line(3, 9, 7, 10, "Z")
    s.dots(((8, 8), (9, 7), (9, 6), (8, 5), (8, 4), (9, 3)), "w"); s.dots(((9, 8), (10, 7), (9, 5), (9, 4)), "w")
    s.disc(10, 2.2, 1.3, "w"); s.line(11, 2, 13, 2, "y"); s.px(10, 2, "k"); s.dots(((8, 1), (7, 0)), "z")
    s.line(5, 12, 5, 16, "k"); s.px(6, 16, "k"); s.px(4, 16, "k")
    s.line(6, 12, 7, 13, "k"); s.line(7, 13, 6, 14, "k")
    return s.outline()


def tanuki(frame):
    """Lửng chó tanuki thật (khác tượng tanuki): nâu, mặt nạ mắt đen, mõm trắng, chân đen, đuôi xù sọc."""
    s = Spr(16, 13)
    if frame == "sit":
        s.ell(6.5, 8.6, 3.6, 3.8, "t"); s.disc(9.5, 4.6, 2.9, "t"); s.disc(7.4, 1.8, 1, "A"); s.disc(11.6, 1.8, 1, "A")
        s.ell(8.4, 4.8, 1.2, 0.9, "A"); s.ell(10.8, 4.8, 1.2, 0.9, "A"); s.px(8, 4, "w"); s.px(11, 4, "w")
        s.ell(9.6, 6.4, 1.4, 0.8, "i"); s.px(9, 6, "k"); s.px(10, 6, "k") if False else s.px(10, 6, "k")
        s.ell(7.4, 9.6, 1.5, 2, "i"); s.ell(2.4, 10, 1.8, 2, "h"); s.px(2, 9, "A"); s.px(1, 11, "A")
        s.dots(((5, 12), (8, 12), (6, 12), (9, 12)), "A")
        return s.outline()
    s.ell(7, 7.4, 4.8, 2.8, "t"); s.ell(7, 6, 4, 1, "h"); s.disc(12, 5, 2.5, "t"); s.disc(10.6, 2.4, 0.9, "A"); s.disc(13.4, 2.4, 0.9, "A")
    s.ell(12.6, 5, 1.6, 0.8, "A"); s.px(12, 4, "w"); s.ell(14, 6.4, 1.2, 0.8, "i"); s.px(15, 6, "k")
    s.ell(2, 6.6, 1.8, 2, "h"); s.px(1, 6, "A"); s.px(2, 8, "A")
    s.ell(7, 9.2, 3, 0.7, "i")
    legs = ((4, 10), (4, 11), (10, 10), (10, 11)) if frame == "walk0" else ((3, 10), (2, 11), (11, 10), (12, 11))
    for x, y in legs:
        s.px(x, y, "A")
    s.dots(((6, 10), (8, 10), (6, 11), (8, 11)) if frame == "walk0" else ((6, 10), (8, 10), (7, 11), (9, 11)), "A")
    return s.outline()


def kitsune(frame):
    """Cáo đỏ, đuôi to chóp trắng."""
    s = Spr(17, 13)
    if frame == "sit":
        s.ell(7.5, 8.6, 3, 3.6, "o"); s.disc(10, 4.4, 2.5, "o"); s.dots(((8, 1), (8, 0), (12, 1), (12, 0)), "o")
        s.dots(((8, 0), (12, 0)), "n"); s.line(11, 5, 13, 6, "o"); s.px(13, 6, "k")
        s.ell(9.5, 6.4, 1.4, 0.8, "w"); s.ell(8.6, 9.6, 1.4, 2, "w"); s.dots(((9, 4), (11, 4)), "k")
        s.ell(3.4, 10, 3.2, 1.8, "o"); s.ell(1, 10, 1.2, 1.2, "w")
        s.dots(((7, 12), (9, 12)), "n")
        return s.outline()
    s.ell(7.5, 7, 4.6, 2.4, "o"); s.disc(12.5, 4.6, 2.3, "o"); s.dots(((11, 1), (11, 2), (14, 1), (14, 2)), "o")
    s.dots(((11, 1), (14, 1)), "n"); s.line(14, 5, 16, 6, "o"); s.px(16, 6, "k"); s.px(13, 4, "k")
    s.ell(13.5, 6.4, 1.4, 0.7, "w"); s.ell(8, 8.6, 2.6, 0.7, "w")
    s.ell(2.6, 5, 2.6, 1.6, "o"); s.disc(0.6, 4.2, 1, "w")
    legs = ((5, 9), (5, 10), (5, 11), (10, 9), (10, 10), (10, 11)) if frame == "walk0" else ((4, 9), (3, 10), (3, 11), (11, 9), (12, 10), (12, 11))
    for x, y in legs:
        s.px(x, y, "n" if y == 11 else "o")
    return s.outline()


def shika(frame):
    """Hươu sao: nâu đốm trắng, gạc nhỏ, chân mảnh."""
    s = Spr(16, 17)
    s.ell(6.5, 9, 4.6, 2.4, "h"); s.dots(((4, 8), (6, 9), (8, 8), (5, 10), (9, 10)), "i"); s.ell(6.5, 10.6, 3, 0.6, "i")
    s.dots(((1, 7), (1, 8), (0, 7)), "i")
    if frame == "graze":
        s.line(10, 8, 12, 11, "h"); s.line(11, 8, 13, 11, "h"); s.disc(13.2, 12.4, 1.4, "h"); s.px(14, 14, "k")
        s.px(13, 12, "k"); s.dots(((11, 10), (12, 10)), "H"); s.line(14, 11, 15, 10, "H")
    else:
        s.line(10, 7, 11, 5, "h"); s.line(11, 7, 12, 5, "h"); s.disc(12, 3.6, 1.7, "h"); s.px(14, 4, "h"); s.px(14, 5, "k")
        s.px(12, 3, "k"); s.px(10, 2, "H")
        s.line(11, 1, 10, 0, "H"); s.line(13, 1, 13, 0, "H"); s.px(12, 0, "H")
    if frame == "walk1":
        legs = [((3, 12), (2, 15)), ((5, 12), (5, 15)), ((8, 12), (9, 15)), ((10, 12), (11, 15))]
    else:
        legs = [((3, 12), (3, 15)), ((5, 12), (4, 15)), ((8, 12), (8, 15)), ((10, 12), (10, 15))]
    for (a, b) in legs:
        s.line(a[0], a[1], b[0], b[1], "k")
    return s.outline()


def kamome(frame):
    """Hải âu: trắng, lưng xám, mỏ vàng."""
    s = Spr(15, 10)
    if frame in ("fly0", "fly1"):
        up = frame == "fly0"
        s.ell(7, 5, 3.4, 1.4, "w"); s.disc(10.4, 4.4, 1.2, "w"); s.px(12, 4, "y"); s.px(10, 4, "k"); s.dots(((3, 5), (2, 5)), "w")
        if up:
            s.line(6, 4, 3, 1, "S"); s.line(7, 4, 4, 1, "S"); s.line(8, 4, 9, 1, "S"); s.px(2, 0, "n"); s.px(9, 0, "n")
        else:
            s.line(6, 6, 2, 8, "S"); s.line(7, 6, 3, 8, "S"); s.line(8, 6, 10, 8, "S"); s.px(1, 8, "n"); s.px(11, 8, "n")
        return s.outline()
    s.ell(6.5, 5, 3.8, 2, "w"); s.ell(6, 4.4, 3.2, 1.2, "S"); s.disc(10.4, 3, 1.6, "w"); s.line(12, 3, 13, 3, "y")
    s.px(13, 4, "r"); s.px(11, 2, "k"); s.dots(((1, 4), (2, 4)), "n"); s.px(3, 4, "S")
    s.line(6, 7, 6, 8, "y"); s.line(8, 7, 8, 8, "y")
    return s.outline()


def tsubame(frame):
    """Chim én: lưng xanh đen, họng đỏ, bụng trắng, đuôi chẻ."""
    s = Spr(14, 9)
    s.ell(7.6, 4.4, 2.8, 1.2, "u"); s.disc(10.6, 4, 1.2, "u"); s.px(11, 5, "r"); s.px(12, 4, "n"); s.px(10, 3, "k")
    s.ell(8, 5.2, 1.8, 0.5, "w")
    s.line(5, 4, 2, 3, "u"); s.line(2, 3, 0, 2, "n"); s.line(5, 5, 2, 6, "u"); s.line(2, 6, 0, 7, "n")
    if frame == "fly0":
        s.line(7, 3, 6, 0, "n"); s.line(8, 3, 9, 1, "n"); s.px(7, 1, "u"); s.px(8, 2, "u")
    else:
        s.line(7, 6, 5, 8, "n"); s.line(8, 6, 10, 8, "n")
    return s.outline()


def fukuro(frame):
    """Cú: nâu, mắt vàng to, chớp mắt."""
    s = Spr(11, 13)
    s.ell(5, 7, 3.6, 4.4, "h"); s.disc(5, 4, 3.2, "h"); s.dots(((2, 1), (8, 1), (2, 2), (8, 2)), "h")
    s.dots(((2, 1), (8, 1)), "H")
    s.ell(5, 8.6, 2.2, 2.4, "i"); s.dots(((4, 8), (6, 8), (5, 10)), "H")
    if frame == "blink":
        s.line(2, 4, 4, 4, "k"); s.line(6, 4, 8, 4, "k")
    else:
        s.disc(3.2, 4, 1.1, "y"); s.disc(6.8, 4, 1.1, "y"); s.px(3, 4, "k"); s.px(7, 4, "k")
    s.px(5, 5, "o"); s.px(5, 6, "O")
    s.dots(((4, 12), (6, 12)), "o")
    return s.outline()


def mejiro(frame):
    """Chim vành khuyên: xanh lục vàng, vòng mắt trắng."""
    s = Spr(11, 8)
    dy = -1 if frame == "hop" else 0
    s.ell(4.6, 4.6 + dy, 3, 1.8, "f"); s.disc(7.6, 3 + dy, 1.7, "f"); s.ell(5, 5.6 + dy, 2, 0.7, "c")
    s.dots(((7, 2 + dy), (8, 2 + dy), (7, 3 + dy), (8, 4 + dy)), "w"); s.px(8, 3 + dy, "k"); s.px(10, 3 + dy, "n")
    s.px(9, 4 + dy, "y"); s.line(1, 3 + dy, 0, 2 + dy, "G"); s.px(3, 4 + dy, "G")
    s.dots(((4, 7), (6, 7)), "a")
    return s.outline()


def komori(frame):
    """Dơi tím đen."""
    s = Spr(15, 8)
    s.ell(7, 4, 1.6, 2, "X"); s.dots(((6, 1), (8, 1)), "X"); s.dots(((6, 3), (8, 3)), "r")
    if frame == "f0":
        s.line(5, 3, 1, 1, "x"); s.line(5, 4, 1, 2, "x"); s.line(9, 3, 13, 1, "x"); s.line(9, 4, 13, 2, "x")
        s.dots(((2, 3), (3, 3), (11, 3), (12, 3)), "x"); s.dots(((1, 1), (13, 1)), "q")
    else:
        s.line(5, 4, 2, 6, "x"); s.line(5, 5, 2, 7, "x"); s.line(9, 4, 12, 6, "x"); s.line(9, 5, 12, 7, "x")
        s.dots(((3, 5), (11, 5)), "x")
    return s.outline()


def tsuru(frame):
    """Sếu đầu đỏ (タンチョウ): trắng, cổ + đuôi đen, chỏm đỏ, chân đen mảnh."""
    s = Spr(17, 20)
    if frame == "dance":          # dang cánh nhảy
        s.ell(7, 10.4, 3.6, 2.2, "w")
        s.dots(((4, 9), (3, 8), (2, 7), (1, 6), (2, 6), (3, 7), (4, 8), (1, 5), (0, 4)), "w"); s.dots(((0, 4), (1, 5)), "n")
        s.dots(((9, 9), (10, 8), (11, 7), (12, 6), (11, 6), (10, 7), (12, 5), (13, 4)), "w"); s.dots(((13, 4), (12, 5)), "n")
        s.line(9, 9, 10, 5, "n"); s.line(10, 9, 11, 5, "n"); s.disc(11, 3.6, 1.4, "w"); s.dots(((11, 2), (12, 2)), "r")
        s.line(12, 4, 14, 3, "y"); s.px(11, 3, "k")
        s.line(6, 13, 5, 18, "k"); s.line(8, 13, 9, 18, "k")
        return s.outline()
    s.ell(6.5, 10, 4, 2.4, "w"); s.ell(3.4, 10.6, 2, 1.4, "n")
    s.line(9, 9, 10, 4, "n"); s.line(10, 9, 11, 4, "n"); s.disc(11, 3, 1.5, "w"); s.dots(((10, 2), (11, 2), (11, 1)), "r")
    s.line(12, 3, 14, 4, "y"); s.px(11, 3, "k")
    s.line(5, 12, 5, 18, "k"); s.line(8, 12, 8, 18, "k"); s.px(4, 18, "k"); s.px(9, 18, "k")
    return s.outline()


def okojo(frame):
    """Chồn ecmin mùa đông: trắng muốt, chóp đuôi đen."""
    s = Spr(11, 12)
    if frame == "peek":           # ló đầu khỏi tuyết
        s.ell(5, 8.6, 2.4, 2.6, "w"); s.disc(5.4, 5.4, 2.2, "w"); s.dots(((4, 3), (7, 3)), "w")
        s.dots(((4, 5), (7, 5)), "k"); s.px(6, 6, "p")
        return s.outline()
    s.ell(4.6, 7.6, 2.4, 3.2, "w"); s.disc(5.6, 3.6, 2.2, "w"); s.dots(((4, 1), (7, 1)), "w")
    s.dots(((5, 3), (7, 3)), "k"); s.px(7, 4, "p"); s.ell(4.6, 8.6, 1.2, 1.6, "z")
    s.line(2, 10, 0, 7, "w"); s.px(0, 6, "k"); s.px(0, 7, "k")
    s.dots(((4, 11), (6, 11)), "z")
    return s.outline()


GUESTS = {
    "suzume": ["stand", "peck"],
    "neko": ["walk0", "walk1", "sit", "groom", "lie"],
    "cho": ["f0", "f1"],
    "kaeru": ["sit", "croak"],
    "sagi": ["stand", "dip"],
    "tanuki": ["walk0", "walk1", "sit"],
    "kitsune": ["walk0", "walk1", "sit"],
    "shika": ["walk0", "walk1", "graze"],
    "kamome": ["stand", "fly0", "fly1"],
    "tsubame": ["fly0", "fly1"],
    "fukuro": ["sit", "blink"],
    "mejiro": ["sit", "hop"],
    "komori": ["f0", "f1"],
    "tsuru": ["stand", "dance"],
    "okojo": ["sit", "peek"],
}
FN = {"suzume": suzume, "neko": neko, "cho": cho, "kaeru": kaeru, "sagi": sagi, "tanuki": tanuki, "kitsune": kitsune,
      "shika": shika, "kamome": kamome, "tsubame": tsubame, "fukuro": fukuro, "mejiro": mejiro, "komori": komori,
      "tsuru": tsuru, "okojo": okojo}


def trim(rows):
    """Bỏ hàng / cột trống quanh hình (giữ đáy để chân chạm đất đúng chỗ)."""
    while rows and not rows[0].strip("."):
        rows = rows[1:]
    while rows and not rows[-1].strip("."):
        rows = rows[:-1]
    left = min(len(r) - len(r.lstrip(".")) for r in rows)
    right = max(len(r.rstrip(".")) for r in rows)
    return [r[left:right] for r in rows]


def build():
    out = {}
    for gid, frames in GUESTS.items():
        out[gid] = {}
        for fr in frames:
            out[gid][fr] = FN[gid](fr).rows()
        # cùng một khách: các khung cùng khung chữ nhật (cắt trống chung) để không giật khi đổi khung
        allr = [r for fr in frames for r in out[gid][fr]]
        h = len(out[gid][frames[0]])
        top = min(next(i for i, r in enumerate(out[gid][fr]) if r.strip(".")) for fr in frames)
        left = min(len(r) - len(r.lstrip(".")) for r in allr if r.strip("."))
        right = max(len(r.rstrip(".")) for r in allr)
        bot = max(max(i for i, r in enumerate(out[gid][fr]) if r.strip(".")) for fr in frames)
        for fr in frames:
            out[gid][fr] = [r[left:right] for r in out[gid][fr][top:bot + 1]]
        _ = h
    return out


def sheet(sp, path, S=6):
    rows = list(sp)
    cw = 20
    img = Image.new("RGB", ((max(len(v) for v in sp.values()) * cw + 2) * S, (len(rows) * 21 + 1) * S), "#5ed35e")
    px = img.load()
    for j, gid in enumerate(rows):
        for i, fr in enumerate(sp[gid]):
            g = sp[gid][fr]
            ox, oy = 1 + i * cw, 1 + j * 21 + (20 - len(g))
            for y, line in enumerate(g):
                for x, ch in enumerate(line):
                    if ch == ".":
                        continue
                    col = tuple(int(PAL[ch][k:k + 2], 16) for k in (1, 3, 5))
                    for a in range(S):
                        for b in range(S):
                            px[(ox + x) * S + a, (oy + y) * S + b] = col
    img.save(path)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    sp = build()
    json.dump(sp, open(os.path.join(here, "guests.json"), "w"), ensure_ascii=False, indent=0)
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "guests.png")
    sheet(sp, out)
    print("ok", {k: len(v[next(iter(v))][0]) for k, v in sp.items()})
