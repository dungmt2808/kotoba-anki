"""Ghép ảnh phác 1.32.2 từ ảnh gốc của mock_1322.js: python3 mock_1322_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  1322_01_nut_sua.png        bảng ôn mặt trước / mặt sau có nút ✎ Sửa (phím E) ở góc dưới bên trái
  1322_02_cua_so_sua.png     bấm ✎ Sửa → cửa sổ sửa note của Anki (ảnh chụp cửa sổ thật) mở trên vườn
  1322_03_da_luu.png         đóng cửa sổ → thẻ đang ôn hiện chữ mới, không tính lượt ôn
  1322_04_pinyin_tren_chu.png  cây tiếng Trung: pinyin dòng dưới (1.32.1) → nằm trên từng chữ; deck ghi số → có dấu"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
MID = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
CJK = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 16)
INK, PAPER, RED, GREEN = (74, 52, 38), (253, 246, 232), (224, 84, 78), (47, 125, 74)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def scaled(im, k):
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def page(title, lines, body, gap=18):
    """Nền giấy: tiêu đề + vài dòng chú thích + ảnh."""
    head = 30 + 34 + 24 * len(lines)
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tw = max([probe.textlength(title, font=BOLD)] + [probe.textlength(t, font=SMALL) for t in lines])
    o = Image.new("RGB", (int(max(body.width, tw)) + 2 * gap, head + body.height + gap), PAPER)
    d = ImageDraw.Draw(o)
    d.text((gap, 18), title, font=BOLD, fill=INK)
    for i, t in enumerate(lines):
        d.text((gap, 56 + 24 * i), t, font=SMALL, fill=INK)
    o.paste(body, (gap, head))
    d.rectangle([gap - 1, head - 1, gap + body.width, head + body.height], outline=INK)
    return o


def grid(row, gap=18, label=36):
    """row: [(ảnh, nhãn, màu)] → một hàng ảnh có nhãn ở trên."""
    W = sum(im.width for im, _a, _c in row) + gap * (len(row) - 1)
    H = max(im.height for im, _a, _c in row) + label
    o = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(o)
    x = 0
    for im, a, c in row:
        d.text((x, 6), a, font=MID, fill=c)
        o.paste(im, (x, label))
        d.rectangle([x, label, x + im.width - 1, label + im.height - 1], outline=INK)
        x += im.width + gap
    return o


def save(im, name):
    im.save(os.path.join(OUT, name))
    print(" ", name, im.size)


def callout(d, xy, text, color=RED, font=MID):
    x, y = xy
    w = d.textlength(text, font=font)
    d.rectangle([x - 8, y - 6, x + w + 8, y + 26], fill=color)
    d.text((x, y), text, font=font, fill=(255, 255, 255))


# 1. nút Sửa ở mặt trước / mặt sau (cắt phần bảng ôn, bỏ thanh trên cùng)
front, back = load("raw_truoc.png"), load("raw_sau.png")
box = (16, 80, 1350, 842)
row = grid([(scaled(front.crop(box), 0.62), "Mặt trước", INK), (scaled(back.crop(box), 0.62), "Mặt sau", INK)])
save(page("1.32.2 · Nút ✎ Sửa trong bảng ôn (Tưới ngay)",
          ["Góc dưới bên trái, như nút Edit khi ôn trong Anki · phím tắt E (giống Anki) · hiện ở cả hai mặt thẻ.",
           "Nút \"Lật thẻ\" / bốn nút chấm ngắn lại một chút, không đổi chỗ, không đổi phím."], row), "1322_01_nut_sua.png")

# 2. cửa sổ sửa note của Anki mở trên vườn
ed = load("raw_cua_so_sua.png")
bar = 34
win = Image.new("RGB", (ed.width + 4, ed.height + bar + 4), (60, 60, 60))
dw = ImageDraw.Draw(win)
dw.rectangle([2, 2, ed.width + 1, bar + 1], fill=(236, 236, 236))
dw.text((14, 6), "Sửa thẻ · ことば畑", font=CJK, fill=(30, 30, 30))
for i, c in enumerate(((255, 95, 87), (254, 188, 46), (40, 200, 64))):
    dw.ellipse([ed.width - 80 + 24 * i, 12, ed.width - 66 + 24 * i, 26], fill=c)
win.paste(ed, (2, bar + 2))
bg = back.copy()
dim = Image.new("RGB", bg.size, (0, 0, 0))
bg = Image.blend(bg, dim, 0.18)
sh = Image.new("RGB", (win.width, win.height), (40, 30, 20))
x0, y0 = 700, 120
bg.paste(Image.blend(bg.crop((x0 + 10, y0 + 10, x0 + 10 + win.width, y0 + 10 + win.height)), sh, 0.45), (x0 + 10, y0 + 10))
bg.paste(win, (x0, y0))
d = ImageDraw.Draw(bg)
callout(d, (40, 700), "① bấm ✎ Sửa (hoặc phím E)")
d.line([(70, 732), (70, 760)], fill=RED, width=4)
callout(d, (x0 - 120, y0 - 44), "② cửa sổ sửa note của chính Anki · đúng note của thẻ đang ôn")
callout(d, (x0 + 230, y0 + 314), "sửa trường bất kỳ", GREEN)
save(page("1.32.2 · Bấm ✎ Sửa → cửa sổ sửa note của Anki",
          ["Ảnh chụp cửa sổ thật của Anki 26.9 (Fields…, Cards…, định dạng chữ, thêm ảnh / âm thanh, Tags như khi sửa trong Anki).",
           "Sửa xong bấm Close (Ctrl+Enter) hoặc đóng cửa sổ là lưu. Cửa sổ vườn vẫn mở phía sau; mở hai lần chỉ có một cửa sổ."],
          scaled(bg, 0.9)), "1322_02_cua_so_sua.png")

# 3. sau khi lưu
done = load("raw_da_luu.png").crop(box)
d = ImageDraw.Draw(done)
callout(d, (560, 360), "chữ mới hiện ngay ở mặt đang xem", GREEN)
save(page("1.32.2 · Lưu xong: thẻ đang ôn hiện chữ mới",
          ["Vẫn đúng thẻ đó, đúng mặt đang xem — chấm tiếp như bình thường. Không tính là một lượt ôn, không cộng / trừ xu.",
           "Cây trong vườn cập nhật chữ / nghĩa. Hoàn tác lần sửa: Edit → Undo ở cửa sổ chính của Anki (Ctrl+Z trong vườn chỉ",
           "hoàn tác lượt chấm, như 1.31.4)."], scaled(done, 0.8)), "1322_03_da_luu.png")

# 4. pinyin trên từng chữ
big = lambda n: scaled(load(n), 1.5)
row1 = grid([(big("raw_py_hoc_sinh_cu.png"), "1.32.1 · pinyin dòng dưới", INK),
             (big("raw_py_hoc_sinh_moi.png"), "1.32.2 · pinyin trên từng chữ", RED)])
row2 = grid([(big("raw_py_ni_hao_cu.png"), "Deck ghi số: hiện nguyên số", INK),
             (big("raw_py_ni_hao_moi.png"), "1.32.2 · đổi thành dấu thanh, trên chữ", RED)])
body = Image.new("RGB", (max(row1.width, row2.width), row1.height + row2.height + 20), PAPER)
body.paste(row1, (0, 0))
body.paste(row2, (0, row1.height + 20))
save(page("1.32.2 · Bấm cây của deck tiếng Trung: pinyin nằm trên từng chữ",
          ["Như furigana của tiếng Nhật. Deck ghi pinyin bằng số thì hiện dấu thanh (deck không bị sửa — chỉ cách hiện).",
           "Không chia đúng được mỗi chữ một âm tiết (vd. pinyin thiếu / thừa âm) → giữ một dòng dưới chữ như 1.32.1.",
           "Cùng cách hiện ở ô gợi ý khi rê chuột lên cây."], body), "1322_04_pinyin_tren_chu.png")
