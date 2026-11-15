"""Ghép ảnh phác chuyển cảnh 1.26 (bản 12/11, giao diện 1.25.9) từ ảnh gốc của mock_126_v2.js: python3 mock_126_v2_ghep.py THƯ_MỤC
  126_08_chuyen_iris.png   màn chào → vườn: vòng tròn khép về chỗ thú đứng rồi mở ra giữa vườn
  126_09_chuyen_la.png     đổi cảnh ◂ ▸ giữa các vùng (Sân vườn → Bãi biển): dải lá theo giao diện mùa quét ngang
  126_10_chuyen_rem.png    vào / ra Trong nhà (cả nhà 3 gian): hai tấm rèm kéo khép rồi mở
  126_11_bat_nhe.png       mở bảng Nhà / Trò chơi / Báo / Lịch hoa: bảng phóng 96 % → 100 % và hiện dần"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1]
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
PX = 8                                    # cỡ điểm ảnh của hiệu ứng
INK = (27, 27, 47)


def load(name):
    return Image.open(os.path.join(D, name)).convert("RGB")


def iris(img, cx, cy, r):
    """phủ màu mực ngoài vòng tròn bán kính r (tính trên lưới PX × PX cho viền bậc thang)"""
    w, h = img.size
    m = Image.new("L", (w // PX + 1, h // PX + 1), 255)
    d = ImageDraw.Draw(m)
    d.ellipse([(cx - r) / PX, (cy - r) / PX, (cx + r) / PX, (cy + r) / PX], fill=0)
    m = m.resize((m.width * PX, m.height * PX), Image.NEAREST).crop((0, 0, w, h))
    out = img.copy()
    out.paste(INK, (0, 0, w, h), m)
    return out


def head(d, title):
    """tiêu đề: dòng đầu đậm, dòng sau nhỏ; trả về chiều cao phần đầu"""
    lines = title.split("\n")
    d.text((16, 10), lines[0], fill=INK, font=FONT)
    for i, ln in enumerate(lines[1:]):
        d.text((16, 42 + i * 24), ln, fill="#4a4a66", font=SMALL)
    return 50 + 24 * (len(lines) - 1)


def sheet(frames, labels, title, out, scale, cols=None):
    """lưới khung hình (cols cột), nhãn thời điểm dưới mỗi khung"""
    th = [f.resize((int(f.width * scale), int(f.height * scale)), Image.LANCZOS) for f in frames]
    cols = cols or len(th)
    rows = math.ceil(len(th) / cols)
    tw, tht = max(t.width for t in th), max(t.height for t in th)
    top = 50 + 24 * title.count("\n")
    W = cols * (tw + 16) + 16
    H = top + rows * (tht + 40)
    s = Image.new("RGB", (W, H), "#fff8e6")
    d = ImageDraw.Draw(s)
    head(d, title)
    for i, (t, lb) in enumerate(zip(th, labels)):
        x = 16 + (i % cols) * (tw + 16)
        y = top + (i // cols) * (tht + 40)
        s.paste(t, (x, y))
        d.rectangle([x - 1, y - 1, x + t.width, y + t.height], outline=INK, width=2)
        d.text((x, y + t.height + 6), lb, fill="#6b3b1f", font=SMALL)
    s.save(os.path.join(D, out), optimize=True)
    print(out, s.size)


def vsheet(frames, labels, title, out, scale):
    th = [f.resize((int(f.width * scale), int(f.height * scale)), Image.LANCZOS) for f in frames]
    top = 50 + 24 * title.count("\n")
    W = max(t.width for t in th) + 130
    H = sum(t.height + 12 for t in th) + top + 10
    s = Image.new("RGB", (W, H), "#fff8e6")
    d = ImageDraw.Draw(s)
    head(d, title)
    y = top
    for t, lb in zip(th, labels):
        d.text((16, y + t.height // 2 - 10), lb, fill="#6b3b1f", font=SMALL)
        s.paste(t, (110, y))
        d.rectangle([109, y - 1, 110 + t.width, y + t.height], outline=INK, width=2)
        y += t.height + 12
    s.save(os.path.join(D, out), optimize=True)
    print(out, s.size)


meta = json.load(open(os.path.join(D, "raw_meta.json")))

# 1. iris: màn chào → vườn (lần mở đầu ngày ~0,6 s; các lần mở sau chỉ nửa sau, ~0,4 s)
a, b = load("raw_chao.png"), load("raw_vuon.png")
w, h = a.size
cx, cy, R = w // 2, int(h * 0.66), math.hypot(w, h)
fr = [a, iris(a, cx, cy, R * 0.32), iris(a, cx, cy, 60), iris(b, w // 2, h // 2, 200), iris(b, w // 2, h // 2, R * 0.45), b]
sheet(fr, ["0 s", "0,15 s", "0,25 s", "0,35 s", "0,45 s", "0,6 s"],
      "Màn chào → vườn: vòng tròn (~0,6 giây)\nKhép về chỗ thú đứng rồi mở ra giữa vườn. Các lần mở sau trong ngày: không chào, chỉ mở ra (~0,4 giây).",
      "126_08_chuyen_iris.png", 0.3, cols=3)

# 2. dải lá theo giao diện mùa quét ngang: Sân vườn → Bãi biển
s1, s2 = load("raw_dai_san.png"), load("raw_dai_bien.png")
if s2.size != s1.size:
    s2 = s2.resize(s1.size)
w, h = s1.size
# thẻ Hôm nay nằm trên dải cảnh (lớp HTML): hiệu ứng vẽ trên canvas không che nó
yx, yy = meta["yard"][0], meta["yard"][1]
tx, ty, tw_, th_ = meta.get("today") or [1088, 108, 250, 182]
CARD = (tx - yx, ty - yy, tx - yx + tw_ + 6, ty - yy + th_ + 6)      # + bóng đổ 5 px


def keep_card(f, src):
    f.paste(src.crop(CARD), CARD[:2])
    return f


LEAF = ["....k....", "...kok...", "..koook..", ".koooook.", "koooRooook", ".kooooook", "..kooook.", "...kook..", "....kk...", "....k...."]
COL = {"k": INK, "o": (255, 122, 74), "R": (194, 60, 30)}
COL2 = {"k": INK, "o": (255, 210, 63), "R": (233, 168, 0)}


def leaves(img, x0, band):
    out = img.copy()
    d = ImageDraw.Draw(out)
    S = 5
    for i in range(60):
        lx = x0 - band + (i * 97) % band
        ly = (i * 53) % max(1, h - 40)
        pal = COL if i % 3 else COL2
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
    frames.append(keep_card(leaves(f, x, 300), s1) if 0 < t < 1 else f)
frames[-1] = s2
vsheet(frames, ["0 s", "0,1 s", "0,2 s", "0,3 s", "0,35 s"],
       "Đổi cảnh ◂ ▸ giữa các vùng: dải lá quét ngang (~0,35 giây)\nMùa lá đỏ: lá phong · mùa khác: cánh hoa / bông tuyết… · không bật giao diện mùa: ô vuông pixel",
       "126_09_chuyen_la.png", 0.62)

# 3. rèm kéo: Sân vườn ⇄ Trong nhà (cả nhà 3 gian)
s3 = load("raw_dai_nha.png")
if s3.size != s1.size:
    s3 = s3.resize(s1.size)


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
        d.rectangle([x0, 0, x0 + cw, 16], fill=(233, 185, 73))
    return out


fr = [s1, keep_card(curtain(s1, 0.55), s1), keep_card(curtain(s1, 1.0), s1), keep_card(curtain(s3, 0.55), s3), s3]
vsheet(fr, ["0 s", "0,1 s", "0,18 s", "0,26 s", "0,35 s"], "Vào / ra Trong nhà: rèm kéo (~0,35 giây)\nSân vườn → Trong nhà (cả nhà 3 gian): rèm khép rồi mở ra", "126_10_chuyen_rem.png", 0.62)

# 4. bật nhẹ: mở bảng Nhà (cả bảng Trò chơi / Báo / Lịch hoa)
g, n = load("raw_vuon2.png"), load("raw_nha.png")
x, y, pw, ph = meta["home"]
panel = n.crop((x, y, x + pw, y + ph))


def pop(k, alpha):
    out = g.copy()
    sw, sh = int(pw * k), int(ph * k)
    p = panel.resize((sw, sh), Image.LANCZOS)
    px, py = x + (pw - sw) // 2, y + (ph - sh) // 2
    base = out.crop((px, py, px + sw, py + sh))
    out.paste(Image.blend(base, p, alpha), (px, py))
    return out


fr = [g, pop(0.96, 0.45), pop(0.98, 0.8), n]
sheet(fr, ["0 s", "0,05 s", "0,1 s", "0,15 s"],
      "Mở bảng: bật nhẹ (~0,15 giây)\nNhà, Trò chơi, Báo, Lịch hoa: phóng 96 % → 100 % và hiện dần. Kiểu Dịu mắt / Tắt chuyển cảnh: hiện ngay như bây giờ.", "126_11_bat_nhe.png", 0.3, cols=4)
