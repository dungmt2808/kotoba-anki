"""Ghép ảnh bài đăng Facebook 1.35.6 từ ảnh gốc của bai_dang_1356.js: dải tiêu đề + ảnh chụp (đã có khung đỏ đánh số) +
chú thích từng số bên dưới. Ảnh gốc chụp gấp đôi (2 điểm ảnh / 1 px CSS); ảnh ra rộng 2048 px (cỡ lớn nhất Facebook giữ).
Chạy: python3 bai_dang_1356_ghep.py RAW RA
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = "", ""          # main() đặt; ảnh phác khác (mock_thiep_to_mau_ghep.py) import module này rồi tự đặt
BRAND = "ことば畑 1.35.6"
K = 2                      # điểm ảnh / px CSS của ảnh gốc
W_OUT = 2048
INK, PAPER, CREAM, RED, LINE, SUB = (74, 52, 38), (253, 246, 232), (255, 251, 240), (232, 56, 47), (122, 92, 70), (140, 112, 92)
F_LAT = {"b": "/usr/share/fonts/opentype/inter/Inter-Bold.otf", "r": "/usr/share/fonts/opentype/inter/Inter-Regular.otf"}
F_CJK = {"b": "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "r": "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"}
_fonts = {}


F_SYM = {"b": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "r": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"}


def font(kind, size, cjk=False):
    key = (kind, size, cjk)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype((F_SYM if cjk == "sym" else F_CJK if cjk else F_LAT)[kind], size)
    return _fonts[key]


def is_cjk(ch):
    o = ord(ch)
    return 0x2E80 <= o <= 0x9FFF or 0xAC00 <= o <= 0xD7AF or 0xF900 <= o <= 0xFAFF or 0xFF00 <= o <= 0xFFEF or 0x3000 <= o <= 0x30FF


SYM = "⚙▸▾▴◂"          # Inter không có: vẽ bằng DejaVu Sans


def runs(text):
    out = []
    for ch in text:
        c = "sym" if ch in SYM else is_cjk(ch)
        if out and out[-1][1] == c:
            out[-1][0] += ch
        else:
            out.append([ch, c])
    return out


def width(text, kind, size):
    d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    return sum(d.textlength(t, font=font(kind, size, c)) for t, c in runs(text))


def draw_text(d, xy, text, kind, size, fill):
    x, y = xy
    for t, c in runs(text):
        f = font(kind, size, c)
        d.text((x, y + (size * 0.06 if c is True else 0)), t, font=f, fill=fill)
        x += d.textlength(t, font=f)


def wrap(text, kind, size, w):
    lines, cur = [], ""
    for word in text.split(" "):
        nxt = (cur + " " + word).strip()
        if width(nxt, kind, size) > w and cur:
            lines.append(cur)
            cur = word
        else:
            cur = nxt
    lines.append(cur)
    return lines


def badge(d, cx, cy, n, r):
    d.ellipse([cx - r - 5, cy - r - 5, cx + r + 5, cy + r + 5], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED)
    f = font("b", int(r * 1.25))
    t = str(n)
    tw = d.textlength(t, font=f)
    d.text((cx - tw / 2, cy - r * 0.78), t, font=f, fill=(255, 255, 255))


def compose(name, body, info, out_name=None):
    """body: ảnh chụp (đã cắt); info: {title, sub?, items} → ảnh ra"""
    W = body.width
    pad = int(W * 0.03)
    ts, ls = int(W * 0.026), int(W * 0.0175)          # cỡ chữ tiêu đề / chú thích
    title_lines = wrap(info["title"], "b", ts, W - 2 * pad - width(BRAND, "b", int(ls * 0.9)) - pad)
    head = pad + len(title_lines) * int(ts * 1.3) + int(pad * 0.6)
    items = info.get("items") or []
    note = info.get("note")
    r = int(ls * 0.72)
    text_x = pad + 2 * r + int(ls * 0.7)
    if note:                                    # một câu không đánh số (ảnh mời Giáng sinh)
        items, text_x = [note], pad
    blocks = [wrap(t, "r", ls, W - text_x - pad) for t in items]
    lh = int(ls * 1.42)
    legend = (pad + sum(max(len(b) * lh, 2 * r + 10) + int(ls * 0.5) for b in blocks) + int(pad * 0.5)) if items else int(pad * 0.6)
    border = 4
    H = head + body.height + 2 * border + legend
    o = Image.new("RGB", (W + 2 * border, H), PAPER)
    d = ImageDraw.Draw(o)
    y = pad
    for t in title_lines:
        draw_text(d, (pad, y), t, "b", ts, INK)
        y += int(ts * 1.3)
    brand = BRAND
    draw_text(d, (W + 2 * border - pad - width(brand, "b", int(ls * 0.9)), pad + int(ts * 0.2)), brand, "b", int(ls * 0.9), SUB)
    d.rectangle([0, head, W + 2 * border - 1, head + body.height + 2 * border - 1], fill=INK)
    o.paste(body, (border, head + border))
    y = head + body.height + 2 * border + pad
    for i, b in enumerate(blocks):
        if not note:
            badge(d, pad + r, y + int(ls * 0.62), i + 1, r)
        for j, t in enumerate(b):
            draw_text(d, (text_x, y + j * lh), t, "r", ls, INK)
        y += max(len(b) * lh, 2 * r + 10) + int(ls * 0.5)
    if o.width > W_OUT:
        o = o.resize((W_OUT, round(o.height * W_OUT / o.width)), Image.LANCZOS)
    p = os.path.join(OUT, (out_name or name) + ".jpg")
    o.save(p, quality=92, optimize=True)
    print(" ", os.path.basename(p), o.size)


def load(name):
    return Image.open(os.path.join(SRC, name + ".png")).convert("RGB")


def info_of(name):
    p = os.path.join(SRC, name + ".json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}


def cropped(name):
    im, inf = load(name), info_of(name)
    c = inf.get("crop")
    if c:
        x, y, w, h = [round(v * K) for v in c]
        im = im.crop((max(0, x), max(0, y), min(im.width, x + w), min(im.height, y + h)))
    return im


def stack(ims, gap=0, bg=PAPER):
    W = max(i.width for i in ims)
    o = Image.new("RGB", (W, sum(i.height for i in ims) + gap * (len(ims) - 1)), bg)
    y = 0
    for i in ims:
        o.paste(i, (0, y))
        y += i.height + gap
    return o


def main():
    global SRC, OUT
    SRC, OUT = sys.argv[1], sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    # Bước 1: cửa sổ chính của Anki (thanh trên + danh sách deck), khung quanh nút ことば畑
    bar, decks = load("01a_anki_thanh"), load("01b_anki_deck")
    decks = decks.crop((0, 0, decks.width, min(decks.height, int(300 * K))))
    win = stack([bar, decks])
    x, y, w, h = [v * K for v in json.load(open(os.path.join(SRC, "01a_anki_thanh_nut.json")))]
    d = ImageDraw.Draw(win)
    p = 8
    d.rounded_rectangle([x - p - 4, y + 2, x + w + p + 4, y + h + p + 4], radius=16, outline=(255, 255, 255), width=12)
    d.rounded_rectangle([x - p, y + 4, x + w + p, y + h + p], radius=14, outline=RED, width=8)
    badge(d, x + w / 2, y + h + p + 50, 1, 30)
    # chú thích nhỏ bên phải: phím tắt
    compose("01_mo_vuon", win, info_of("01_mo_vuon"))

    for n in ["02_cau_hinh_truong", "03_khoa_gemini", "10_bang_on", "11_cay_deck", "12_ngon_ngu", "14_doc_bao", "15_tro_choi", "16_trang_tri_thu"]:
        if os.path.exists(os.path.join(SRC, n + ".png")):
            compose(n, cropped(n), info_of(n))

    # 13: Báo muốn nhận + khối báo (trên) · Tuỳ chọn thêm → Bắt đầu truyện mới (dưới)
    a, b = cropped("13_nguon_bao"), cropped("13b_nguon_bao")
    cut = Image.new("RGB", (max(a.width, b.width), 36), PAPER)
    dd = ImageDraw.Draw(cut)
    for xx in range(0, cut.width, 28):
        dd.line([xx, 18, xx + 14, 18], fill=LINE, width=4)
    compose("13_nguon_bao", stack([a, cut, b]), info_of("13_nguon_bao"))

    # 20: Giáng sinh — ảnh mời, không chú thích số
    compose("20_giang_sinh", cropped("20_giang_sinh"), dict(info_of("20_giang_sinh"),
            note="Giao diện Giáng sinh đã tự bật trong vườn (15/11 – 31/12). Sự kiện Giáng sinh sẽ ra mắt trong tháng 12 — cùng chờ nhé!"))


if __name__ == "__main__":
    main()
