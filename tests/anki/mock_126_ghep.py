"""Ghép ảnh phác chuyển cảnh 1.26 từ ảnh gốc của mock_126.js: python3 mock_126_ghep.py THƯ_MỤC_ẢNH
  126_06_chuyen_iris.png   màn chào → vườn: vòng tròn khép lại rồi mở ra (viền bậc thang pixel)
  126_07_chuyen_la.png     đổi cảnh ◂ ▸ (Sân vườn → Trong nhà): dải lá phong quét ngang
  126_08_chuyen_rem.png    vào / ra Trong nhà: hai tấm rèm kéo khép rồi mở"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
PX = 8                                    # cỡ điểm ảnh của hiệu ứng


def iris(img, cx, cy, r):
    """phủ đen ngoài vòng tròn bán kính r (tính trên lưới PX × PX cho viền bậc thang)"""
    w, h = img.size
    m = Image.new("L", (w // PX + 1, h // PX + 1), 255)
    d = ImageDraw.Draw(m)
    d.ellipse([(cx - r) / PX, (cy - r) / PX, (cx + r) / PX, (cy + r) / PX], fill=0)
    m = m.resize((m.width * PX, m.height * PX), Image.NEAREST).crop((0, 0, w, h))
    out = img.copy()
    out.paste((27, 27, 47), (0, 0, w, h), m)
    return out


def vsheet(frames, labels, title, out, scale):
    th = [f.resize((int(f.width * scale), int(f.height * scale)), Image.LANCZOS) for f in frames]
    W = max(t.width for t in th) + 130
    H = sum(t.height + 12 for t in th) + 60
    s = Image.new("RGB", (W, H), "#fff8e6")
    d = ImageDraw.Draw(s)
    d.text((16, 10), title, fill="#1b1b2f", font=FONT)
    y = 50
    for t, lb in zip(th, labels):
        d.text((16, y + t.height // 2 - 10), lb, fill="#6b3b1f", font=SMALL)
        s.paste(t, (110, y))
        d.rectangle([109, y - 1, 110 + t.width, y + t.height], outline="#1b1b2f", width=2)
        y += t.height + 12
    s.save(os.path.join(D, out), optimize=True)
    print(out, s.size)


def sheet(frames, labels, title, out, scale):
    th = [f.resize((int(f.width * scale), int(f.height * scale)), Image.LANCZOS) for f in frames]
    W = sum(t.width for t in th) + 16 * (len(th) + 1)
    H = max(t.height for t in th) + 90
    s = Image.new("RGB", (W, H), "#fff8e6")
    d = ImageDraw.Draw(s)
    d.text((16, 10), title, fill="#1b1b2f", font=FONT)
    x = 16
    for t, lb in zip(th, labels):
        s.paste(t, (x, 50))
        d.rectangle([x - 1, 49, x + t.width, 50 + t.height], outline="#1b1b2f", width=2)
        d.text((x, 56 + t.height), lb, fill="#6b3b1f", font=SMALL)
        x += t.width + 16
    s.save(os.path.join(D, out), optimize=True)
    print(out, s.size)


# 1. iris: màn chào → vườn
a = Image.open(os.path.join(D, "raw_chao.png")).convert("RGB")
b = Image.open(os.path.join(D, "raw_vuon.png")).convert("RGB")
w, h = a.size
cx, cy, R = w // 2, int(h * 0.68), math.hypot(w, h)
fr = [a, iris(a, cx, cy, R * 0.32), iris(a, cx, cy, 70), iris(b, w // 2, h // 2, 260), iris(b, w // 2, h // 2, R * 0.45), b]
sheet(fr, ["0 s", "0,15 s", "0,25 s", "0,35 s", "0,45 s", "0,6 s"],
      "Màn chào → vườn: vòng tròn khép về chỗ thú đứng, mở ra ở giữa vườn (~0,6 giây)", "126_06_chuyen_iris.png", 0.17)

# 2. dải lá phong quét ngang: Sân vườn → Trong nhà (dải cảnh)
s1 = Image.open(os.path.join(D, "raw_dai_san.png")).convert("RGB")
s2 = Image.open(os.path.join(D, "raw_dai_nha.png")).convert("RGB")
if s2.size != s1.size:
    s2 = s2.resize(s1.size)
w, h = s1.size
LEAF = ["....k....", "...kok...", "..koook..", ".koooook.", "koooRooook", ".kooooook", "..kooook.", "...kook..", "....kk...", "....k...."]
COL = {"k": (27, 27, 47), "o": (255, 122, 74), "R": (194, 60, 30)}


def leaves(img, x0, band):
    out = img.copy()
    d = ImageDraw.Draw(out)
    S = 6
    for i in range(70):
        lx = x0 - band + (i * 97) % band
        ly = (i * 53) % (h - 40)
        pal = COL if i % 3 else {"k": (27, 27, 47), "o": (255, 210, 63), "R": (233, 168, 0)}
        for j, row in enumerate(LEAF):
            for k, c in enumerate(row):
                if c in pal:
                    d.rectangle([lx + k * S, ly + j * S, lx + k * S + S - 1, ly + j * S + S - 1], fill=pal[c])
    return out


frames = []
for t in (0.0, 0.3, 0.55, 0.8, 1.05):
    x = int(t * (w + 300))
    f = s1.copy()
    if x > 150:
        f.paste(s2.crop((0, 0, min(w, x - 150), h)), (0, 0))
    frames.append(leaves(f, x, 300) if 0 < t < 1 else f)
frames[-1] = s2
vsheet(frames, ["0 s", "0,1 s", "0,2 s", "0,3 s", "0,35 s"],
       "Đổi cảnh ◂ ▸: dải lá theo giao diện mùa quét ngang (Mùa lá đỏ: lá phong; không có giao diện mùa: ô vuông pixel)",
       "126_07_chuyen_la.png", 0.6)

# 3. rèm kéo: ra / vào Trong nhà
def curtain(img, k):
    out = img.copy()
    d = ImageDraw.Draw(out)
    cw = int(w / 2 * k)
    for side in (0, 1):
        x0 = 0 if side == 0 else w - cw
        d.rectangle([x0, 0, x0 + cw, h], fill=(214, 64, 92))
        for x in range(x0, x0 + cw, 28):
            d.rectangle([x, 0, x + 6, h], fill=(170, 40, 68))
            d.rectangle([x + 12, 0, x + 15, h], fill=(240, 120, 140))
        d.rectangle([x0, 0, x0 + cw, 18], fill=(233, 185, 73))
    return out


fr = [s1, curtain(s1, 0.55), curtain(s1, 1.0), curtain(s2, 0.55), s2]
vsheet(fr, ["0 s", "0,1 s", "0,18 s", "0,26 s", "0,35 s"], "Vào / ra Trong nhà: rèm kéo khép rồi mở", "126_08_chuyen_rem.png", 0.6)
