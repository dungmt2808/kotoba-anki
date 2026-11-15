"""check_outline.py ALL.json OUT_DIR [ADDON] — 1.25.3: dò lỗi viền trong mọi hình có sẵn (từ dump_all.js).

- "khuyết viền": điểm trong suốt bị viền đen (k) bao 3 / 4 phía — viền bị hụt một điểm (vd. cán đèn lồng giấy 1.25.2)
- "lộ màu": điểm màu (không phải k) chạm nền trong suốt hoặc mép hình — thiếu viền đen ở đó (có chỗ cố ý: khói, hạt sáng…)
In danh sách + vẽ OUT_DIR/khuyet_vien.png, OUT_DIR/lo_mau.png (hình phóng to, điểm nghi vấn đóng khung đỏ / tím). Cần Pillow."""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ALL, OUT = sys.argv[1], sys.argv[2]
ADDON = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(OUT, exist_ok=True)
data = json.load(open(ALL, encoding="utf-8"))
if ADDON:      # khách ghé vườn: bảng màu riêng trong guests.js
    m = re.search(r"const PAL = (\{[^}]*\})", open(os.path.join(ADDON, "web", "guests.js"), encoding="utf-8").read())
    gpal = json.loads(m.group(1)) if m else {}
    for v in data.get("guests", {}).values():
        v["pal"] = v.get("pal") or gpal
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
font = ImageFont.truetype(FONT, 13) if os.path.exists(FONT) else ImageFont.load_default()


def check(rows):
    h, w = len(rows), max(len(r) for r in rows)
    at = lambda x, y: rows[y][x] if 0 <= y < h and 0 <= x < len(rows[y]) else "."
    notch, expo = [], []
    for y in range(h):
        for x in range(w):
            c = at(x, y)
            nb = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)]
            if c == "." and sum(n == "k" for n in nb) >= 3:
                notch.append((x, y))
            elif c not in (".", "k") and any(n == "." for n in nb):
                expo.append((x, y))
    return notch, expo


def sheet(items, path, mark):
    if not items:
        return
    Z, pad, cols = 8, 14, 6
    cw = max(max(len(r) for r in v["rows"]) for _, v, _ in items) * Z + pad
    ch = max(len(v["rows"]) for _, v, _ in items) * Z + pad + 18
    rws = (len(items) + cols - 1) // cols
    im = Image.new("RGB", (cols * cw + pad, rws * ch + pad), "#f2efe6")
    d = ImageDraw.Draw(im)
    for i, (name, v, pts) in enumerate(items):
        ox, oy = pad + (i % cols) * cw, pad + (i // cols) * ch
        d.text((ox, oy), name, fill="#1b1b2f", font=font)
        oy += 18
        pal = v.get("pal") or {}
        for y, row in enumerate(v["rows"]):
            for x, c in enumerate(row):
                if c != ".":
                    d.rectangle([ox + x * Z, oy + y * Z, ox + x * Z + Z - 1, oy + y * Z + Z - 1], fill=pal.get(c, "#ff00ff"))
        for x, y in pts:
            d.rectangle([ox + x * Z - 1, oy + y * Z - 1, ox + x * Z + Z, oy + y * Z + Z], outline=mark, width=2)
    im.save(path)


notches, expos = [], []
for group in ("home", "pets", "seeds", "guests"):
    for name, v in sorted(data.get(group, {}).items()):
        n, e = check(v["rows"])
        if n:
            notches.append(("%s/%s" % (group, name), v, n))
        if e:
            expos.append(("%s/%s" % (group, name), v, e))
print("KHUYẾT VIỀN (%d hình):" % len(notches))
for name, _v, pts in notches:
    print("  %-28s %s" % (name, " ".join("(%d,%d)" % p for p in pts)))
print("LỘ MÀU (%d hình): %s" % (len(expos), ", ".join("%s×%d" % (n, len(p)) for n, _v, p in expos)))
sheet(notches, os.path.join(OUT, "khuyet_vien.png"), "#ff1744")
sheet(expos, os.path.join(OUT, "lo_mau.png"), "#d500f9")
