"""Ghép ảnh phác 1.34 từ ảnh gốc của mock_134.js: python3 mock_134_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  134_01_phim_nghe_lai.png   bảng ôn mặt sau: số phím 1–4 trên nút chấm, nút Nghe lại (R), nút Phóng to (F)
  134_02_tu_lat.png          thẻ trắc nghiệm gọi lật (pycmd "ans"): 1.33.3 không lật → 1.34 lật như Anki
  134_03_phong_to.png        thẻ bài đọc dài: bình thường → Phóng to (ẩn thanh trên, đầu bảng ôn, vườn)
  134_04_an_hien_vuon.png    Ẩn vườn → Hiện vườn: 1.33.3 khung thẻ kẹt ở cỡ cao → 1.34 về đúng như trước
  134_05_chon_deck.png       ô Deck: danh sách phẳng (bây giờ) → nút gọn + cây deck như Anki, gõ để tìm
  134_06_trang_tri_thu.png   Nhà → Trang trí thử: đặt thử đồ chưa mua, 3 bản lưu sẵn
  134_07_dung_ban_thu.png    Dùng bản này: hỏi một lần, mua đủ món còn thiếu rồi bày đúng như bản thử"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
MID = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
LIST = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
INK, PAPER, RED, GREEN, GREY = (74, 52, 38), (253, 246, 232), (200, 64, 58), (47, 125, 74), (120, 105, 92)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def scaled(im, k):
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def page(title, lines, body, gap=18):
    head = 30 + 34 + 24 * len(lines)
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tw = max([probe.textlength(title, font=BOLD)] + [probe.textlength(t, font=SMALL) for t in lines])
    o = Image.new("RGB", (int(max(body.width, tw)) + 2 * gap, head + body.height + gap), PAPER)
    d = ImageDraw.Draw(o)
    d.text((gap, 18), title, font=BOLD, fill=INK)
    for i, t in enumerate(lines):
        d.text((gap, 56 + 24 * i), t, font=SMALL, fill=INK)
    o.paste(body, (gap, head))
    return o


def grid(row, gap=18, label=30):
    """row: [(ảnh, nhãn, màu)] → một hàng ảnh có nhãn ở trên (nhãn dài thì xuống dòng theo bề ngang ảnh)."""
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))

    def wrap(t, w):
        out, cur = [], ""
        for word in t.split(" "):
            nxt = (cur + " " + word).strip()
            if probe.textlength(nxt, font=MID) > w and cur:
                out.append(cur)
                cur = word
            else:
                cur = nxt
        out.append(cur)
        return out
    labels = [wrap(a, im.width) for im, a, _c in row]
    lab = label + 22 * (max(len(x) for x in labels) - 1)
    W = sum(im.width for im, _a, _c in row) + gap * (len(row) - 1)
    H = max(im.height for im, _a, _c in row) + lab
    o = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(o)
    x = 0
    for (im, _a, c), ls in zip(row, labels):
        for i, t in enumerate(ls):
            d.text((x, 4 + 22 * i), t, font=MID, fill=c)
        o.paste(im, (x, lab))
        d.rectangle([x, lab, x + im.width - 1, lab + im.height - 1], outline=INK)
        x += im.width + gap
    return o


def stack(rows, gap=18):
    W = max(r.width for r in rows)
    o = Image.new("RGB", (W, sum(r.height for r in rows) + gap * (len(rows) - 1)), PAPER)
    y = 0
    for r in rows:
        o.paste(r, (0, y))
        y += r.height + gap
    return o


def save(im, name):
    im.save(os.path.join(OUT, name), optimize=True)
    print(" ", name, im.size)


# 1. phím, nghe lại, phóng to
im = load("raw_phim.png").crop((16, 80, 1350, 842))
save(page("1.34 · Bảng ôn: phím 1–4 ghi trên nút, Nghe lại (R), Phóng to (F)",
          ["Phím Space / Enter (lật, rồi \"Được\") và 1 · 2 · 3 · 4 đã chạy từ trước — chỉ là trên nút chưa ghi số nên khó biết.",
           "Nghe lại: phát lại âm thanh của mặt đang xem, phím R (như Anki; F5 cũng được). Thẻ không có âm thanh thì nút ẩn."],
          scaled(im, 0.78)), "134_01_phim_nghe_lai.png")

# 2. tự lật
k = 0.46
box = (16, 80, 1350, 842)
row = grid([(scaled(load("raw_tl1.png").crop(box), k), "1. Thẻ trắc nghiệm: bấm một đáp án", INK),
            (scaled(load("raw_tl_cu.png").crop(box), k), "2. Bây giờ (1.33.3): đáp án tô vàng nhưng thẻ không lật", RED),
            (scaled(load("raw_tl2.png").crop(box), k), "3. 1.34: thẻ tự lật như trong Anki, chấm 1–4 luôn", GREEN)])
save(page("1.34 · Thẻ tự lật (thẻ trắc nghiệm, thẻ có nút \"Xem đáp án\" riêng…)",
          ["Nhiều mẫu thẻ tự gọi lật thẻ của Anki (pycmd('ans')) hoặc tự chấm (pycmd('ease3')) — bảng ôn của vườn chưa hiểu lệnh đó.",
           "1.34 hiểu đúng như Anki: lật khi đang ở mặt trước, chấm chỉ khi đã lật; thẻ cũ còn đếm giờ thì không lật nhầm thẻ mới."], row),
     "134_02_tu_lat.png")

# 3. phóng to
row = grid([(scaled(load("raw_pt1.png"), 0.55), "Bình thường: thanh trên + chậu cây + vườn bên dưới", INK),
            (scaled(load("raw_pt2.png"), 0.55), "Phóng to (F): chỉ còn thẻ + nút chấm, thẻ cao thêm ~200 px", GREEN)])
save(page("1.34 · Nút Phóng to cho thẻ dài (bài đọc, ngữ pháp nhiều ví dụ…)",
          ["Ẩn thanh trên cùng, chậu cây thu nhỏ, đầu bảng ôn một dòng mỏng, ẩn vườn — thẻ chiếm gần hết cửa sổ.",
           "Bấm lại / phím F / Esc là về như cũ; nhớ lần sau (theo máy). Kết hợp F11 (toàn màn hình) là to nhất."], row),
     "134_03_phong_to.png")

# 4. ẩn / hiện vườn (cửa sổ 1600 × 1000, như màn 1080p)
k = 0.36
cells = [("raw_ah1.png", "1. Đang ôn: khung thẻ 660 px, thấy 60 px vườn ở đáy", INK),
         ("raw_ah2.png", "2. Bấm Ẩn vườn: vườn ẩn, khung thẻ cao ra 710 px", INK),
         ("raw_ah3.png", "3. Bây giờ — bấm Hiện vườn: khung thẻ vẫn 710 px, vườn còn 10 px", RED),
         ("raw_ah4.png", "4. 1.34 — bấm Hiện vườn: về đúng như ảnh 1", GREEN)]
rows = [grid([(scaled(load(a), k), b, c) for a, b, c in cells[:2]]), grid([(scaled(load(a), k), b, c) for a, b, c in cells[2:]])]
save(page("1.34 · Sửa lỗi \"Hiện vườn\" không trả khung thẻ về như cũ",
          ["Lỗi: Ẩn vườn đổi luôn cỡ khung thẻ sang \"Cao\" (lưu vào cài đặt), Hiện vườn chỉ hiện lại vườn mà không đổi cỡ thẻ về.",
           "1.34: Ẩn vườn chỉ ẩn vườn — khung thẻ cao ra khi vườn ẩn, vườn hiện thì về cỡ cũ. Người đã lỡ bấm ở bản cũ cũng về đúng."],
          stack(rows)), "134_04_an_hien_vuon.png")

# 5. chọn deck: danh sách phẳng (vẽ lại ô chọn của trình duyệt — không chụp được) → cây deck
flat = json.load(open(os.path.join(SRC, "deck_cu.json"), encoding="utf-8"))
lh = 21
old = Image.new("RGB", (340, 26 + lh * len(flat) + 6), (255, 255, 255))
d = ImageDraw.Draw(old)
d.rectangle([0, 0, old.width - 1, old.height - 1], outline=(110, 110, 110))
d.text((8, 5), "(ô thả xuống bây giờ)", font=LIST, fill=GREY)
for i, n in enumerate(flat):
    y = 26 + i * lh
    if n == "Tiếng Nhật::N4::Bài 17":
        d.rectangle([2, y - 1, old.width - 3, y + lh - 2], fill=(56, 117, 215))
    d.text((8, y + 1), n, font=LIST, fill=(255, 255, 255) if n == "Tiếng Nhật::N4::Bài 17" else (30, 30, 30))
new1 = load("raw_deck1.png").crop((380, 8, 1366, 640))
new2 = load("raw_deck2.png").crop((380, 8, 905, 370))
row = grid([(old, "Bây giờ: %d deck một danh sách dài, tên đầy đủ" % len(flat), RED),
            (new1, "1.34: nút gọn ở thanh trên, bấm mở cây deck như Anki", GREEN),
            (new2, "Gõ chữ là lọc (\"bai 1\")", GREEN)])
save(page("1.34 · Ô chọn deck gọn như Anki (người có nhiều deck con)",
          ["Thanh trên chỉ ghi tên deck ngắn (\"Tiếng Nhật › N4 › Bài 17\"); bấm → cây deck: ▸ / ▾ thu gọn, số thẻ Mới / Học / Ôn như màn Decks.",
           "Mở sẵn nhánh của deck đang xem; gõ chữ là tìm (thay nút kính lúp, phím / vẫn mở); ↑ ↓ ← → Enter Esc như Anki."], row),
     "134_05_chon_deck.png")

# 6. trang trí thử
save(page("1.34 · Nhà → Trang trí thử: đặt thử cả đồ chưa mua, lưu lại bản trang trí",
          ["Bấm \"Trang trí thử\" → bày đồ tuỳ ý: món chưa có hiện mờ, có khung + chữ \"thử\"; dời / cất đồ đang có cũng chỉ là thử.",
           "3 bản thử mỗi cảnh, tự lưu — tắt Anki mở lại vẫn còn. Vườn thật không đổi cho tới khi bấm \"Dùng bản này\"."],
          scaled(load("raw_thu1.png"), 0.85)), "134_06_trang_tri_thu.png")

# 7. dùng bản thử
im = load("raw_thu2.png").crop((16, 80, 1350, 830))
save(page("1.34 · \"Dùng bản này\": hỏi một lần, mua đủ món còn thiếu, bày đúng như bản thử",
          ["Python kiểm lại giá / số xu / số món tối đa lúc bấm; thiếu xu thì nút ghi \"Thiếu N xu\" như các nút Mua khác.",
           "Mua và bày xong cùng một lần lưu — lỗi giữa chừng thì không trừ xu, không đổi gì."],
          scaled(im, 0.8)), "134_07_dung_ban_thu.png")
