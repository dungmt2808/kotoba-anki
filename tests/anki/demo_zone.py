"""Vùng tự tạo mẫu cho ảnh / video giới thiệu: "Tiệm bánh nhỏ" (công trình 64 × 76 + cảnh nền 256 × 76).

Vẽ bằng mã (hình chữ nhật, mái bậc thang, cây tròn) với bảng màu CRAFT_PALETTE của add-on, trả về payload cho
`STATE.zone_save(...)`. `python demo_zone.py OUT.png` xuất ảnh xem trước (cần Pillow).
"""
import sys

LW, LH = 64, 76
EW, EH = 256, 76


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [["."] * w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x0, y0, x1, y1, c, edge=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                e = edge and (x in (x0, x1) or y in (y0, y1))
                self.put(x, y, edge if e else c)

    def disc(self, cx, cy, r, c, edge=None, light=None):
        for y in range(cy - r - 1, cy + r + 2):
            for x in range(cx - r - 1, cx + r + 2):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d <= r * r:
                    inner = d <= (r - 1) ** 2
                    col = c if inner or not edge else edge
                    if light and inner and (x - cx) < -r // 3 and (y - cy) < -r // 3:
                        col = light
                    self.put(x, y, col)

    def flat(self):
        return "".join("".join(r) for r in self.px)


def landmark():
    c = Canvas(LW, LH)
    # ống khói
    c.rect(44, 6, 50, 22, "S", "k")
    c.rect(43, 4, 51, 7, "m", "k")
    # mái bậc thang
    top, bot, cx = 10, 31, 32
    for y in range(top, bot + 1):
        hw = 5 + int((y - top) * 1.45)
        x0, x1 = max(0, cx - hw), min(LW - 1, cx + hw - 1)
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y == top
            col = "k" if edge else ("R" if (y - top) % 5 == 4 else "r")
            c.put(x, y, col)
    c.rect(0, bot, LW - 1, bot + 1, "k")
    # tường
    c.rect(4, 33, 59, 73, "c", "k")
    # mái hiên sọc đỏ / trắng, mép dưới răng cưa
    for y in range(34, 39):
        for x in range(5, 59):
            c.put(x, y, "r" if (x // 4) % 2 == 0 else "w")
    for x in range(5, 59):
        if (x // 4) % 2 == 0:
            c.put(x, 39, "R")
    c.rect(4, 33, 59, 33, "k")
    # biển hiệu + ổ bánh
    c.rect(23, 41, 40, 47, "y", "B")
    c.rect(28, 43, 35, 45, "h", "t")
    c.put(30, 44, "E"), c.put(33, 44, "E")
    # hai cửa sổ có bánh bày
    for x0 in (9, 43):
        c.rect(x0, 43, x0 + 12, 58, "l", "B")
        c.rect(x0 + 6, 44, x0 + 6, 57, "w")
        c.rect(x0 + 1, 50, x0 + 11, 50, "w")
        c.rect(x0 + 1, 55, x0 + 11, 57, "h")
        c.put(x0 + 3, 55, "t"), c.put(x0 + 8, 56, "t")
        c.rect(x0 - 1, 59, x0 + 13, 60, "b", "B")
    # cửa ra vào
    c.rect(27, 50, 36, 73, "b", "B")
    c.rect(29, 52, 34, 59, "l", "B")
    c.put(34, 63, "y")
    # chậu cây hai bên cửa
    for x0 in (20, 39):
        c.rect(x0, 69, x0 + 4, 73, "t", "B")
        c.disc(x0 + 2, 65, 3, "g", "G", "f")
    # bậc thềm
    c.rect(2, 74, 61, 75, "S", "k")
    return c.flat()


def env():
    c = Canvas(EW, EH)
    for cx, cy in ((24, 9), (118, 6), (206, 11)):        # mây
        for dx, r in ((-7, 4), (0, 6), (8, 4)):
            c.disc(cx + dx, cy, r, "w")
    for x, r in ((10, 9), (34, 7), (190, 8), (214, 10), (240, 7)):   # hàng cây hai bên
        c.rect(x - 1, 54, x + 1, 66, "B")
        c.disc(x, 46, r, "g", "G", "f")
    for x in range(0, EW, 6):                              # hàng rào gỗ thấp
        if 50 < x < 180:
            continue
        c.rect(x, 60, x + 1, 68, "t", "B")
    for x in list(range(0, 52)) + list(range(180, EW)):
        c.put(x, 63, "B"), c.put(x, 66, "B")
    return c.flat()


def payload(encode):
    return {"name": "Tiệm bánh nhỏ", "px": encode(landmark()), "env": encode(env()),
            "bg": "town", "ground": "#e9d8a6", "hills": "#f5b971"}


if __name__ == "__main__":
    from PIL import Image
    sys.path.insert(0, sys.argv[2] if len(sys.argv) > 2 else ".")
    import garden_core as core
    pal = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in core.CRAFT_PALETTE.items()}
    for name, (fl, w, h) in {"lm": (landmark(), LW, LH), "env": (env(), EW, EH)}.items():
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for i, ch in enumerate(fl):
            if ch != ".":
                im.putpixel((i % w, i // w), pal[ch] + (255,))
        im.resize((w * 4, h * 4), Image.NEAREST).save(sys.argv[1].replace(".png", "_%s.png" % name))
