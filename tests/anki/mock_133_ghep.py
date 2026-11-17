"""Ghép ảnh phác báo tiếng Trung / tiếng Hàn từ ảnh của mock_133.js: python3 mock_133_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  133_00_mac_dinh.png      báo mặc định cho người chưa từng chọn báo (bảng, theo quyết định 17/11)
  133_01_nguon_bao.png     tab Nguồn báo: Báo muốn nhận có Trung / Hàn, tối đa 2, gợi ý thêm báo thứ hai, HSK 1–6
  133_02_bao_trung.png     báo tiếng Trung: pinyin trên chữ, bấm từ → pinyin + nghĩa + Hán Việt
  133_03_bao_han.png       báo tiếng Hàn: bấm từ có tiểu từ / đuôi dính → từ gốc
  133_04_chep_trung.png    chép chính tả tiếng Trung: chấm theo từng chữ
  133_05_chep_han.png      chép chính tả tiếng Hàn: chấm theo cụm"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
BOLD = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 22)   # có cả chữ Việt + Trung + Hàn
MID = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 17)
SMALL = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 16)
INK, PAPER, RED, GREEN, LINE = (74, 52, 38), (253, 246, 232), (224, 84, 78), (47, 125, 74), (200, 180, 160)


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
    d.rectangle([gap - 1, head - 1, gap + body.width, head + body.height], outline=INK)
    return o


def shot(name, k=0.85, box=(16, 80, 1350, 818)):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGB").crop(box)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def save(im, name):
    im.save(os.path.join(OUT, name))
    print(" ", name, im.size)


# 0. bảng báo mặc định
rows = [("Deck đang chọn", "Báo mặc định (1 báo)", "Ghi chú"),
        ("deck tiếng Trung", "Báo tiếng Trung", "tài khoản có thêm deck tiếng Hàn → gợi ý \"thêm báo tiếng Hàn?\""),
        ("deck tiếng Hàn / Nhật / Anh", "báo của ngôn ngữ đó", "như trên: có deck ngôn ngữ khác → gợi ý thêm báo thứ hai"),
        ("deck không phải ngôn ngữ,", "báo của ngôn ngữ ôn nhiều nhất", "chưa ôn gì trong 30 ngày → ngôn ngữ có nhiều thẻ nhất"),
        ("  tài khoản có deck Trung + Hàn", "  30 ngày qua", ""),
        ("deck không phải ngôn ngữ,", "báo của ngôn ngữ đó", ""),
        ("  tài khoản có 1 deck ngôn ngữ", "", ""),
        ("không có deck ngôn ngữ nào", "Báo tiếng Việt", "truyện + tin làng, như bây giờ")]
cols = (40, 380, 700)
W, rh = 1240, 34
body = Image.new("RGB", (W, 40 + rh * len(rows)), (255, 252, 244))
d = ImageDraw.Draw(body)
for i, r in enumerate(rows):
    y = 20 + rh * i
    if i == 0:
        d.rectangle([0, 0, W, y + rh - 6], fill=(250, 230, 190))
    elif not r[0].startswith("  "):
        d.line([(20, y - 6), (W - 20, y - 6)], fill=LINE, width=1)
    for c, t in zip(cols, r):
        d.text((c, y), t, font=MID if i == 0 or c == cols[1] else SMALL, fill=RED if (c == cols[1] and i) else INK)
save(page("Báo tiếng Trung / tiếng Hàn · báo mặc định cho người chưa từng chọn báo",
          ["Theo quyết định 17/11: tối đa 2 báo trong Nhật / Anh / Trung / Hàn (tiếng Việt vẫn đi một mình), mặc định 1 báo.",
           "Chỉ áp cho người chưa từng chọn báo (người đã chọn giữ nguyên khi cập nhật). Không tự đổi theo mỗi lần đổi deck."],
          body), "133_00_mac_dinh.png")

save(page("Tab Nguồn báo · Báo muốn nhận thêm Tiếng Trung / Tiếng Hàn",
          ["Đang xem deck Tiếng Trung, chưa từng chọn báo → tick sẵn Tiếng Trung. Tài khoản còn deck tiếng Hàn → dòng gợi ý (bấm Không",
           "là ẩn hẳn). Tick tới 2 báo thì ô thứ ba mờ đi. Mỗi báo một khối như báo Nhật / Anh: trình độ HSK 1–6 / TOPIK 1–6, Lấy từ."],
          shot("133_01_nguon_bao")), "133_01_nguon_bao.png")
save(page("Báo tiếng Trung · 菜园日报 (Báo Vườn rau — tên Claude chọn)",
          ["Kể lại cùng một truyện của làng như báo Nhật / Anh / Việt. Pinyin nằm trên từng chữ; nút \"Ẩn pinyin\" như \"Ẩn furigana\".",
           "Bấm từ gạch chân → pinyin + nghĩa + Hán Việt (HẠI PHẠ) + đã học ở deck nào. Từ tách theo từ của deck (tiếng Trung không có dấu cách).",
           "Chữ giản / phồn thể theo deck. Gemini ghi pinyin bằng số cho từng từ; máy soát (âm tiết hợp lệ, mỗi chữ một âm, khớp deck) rồi đặt dấu."],
          shot("133_02_bao_trung")), "133_02_bao_trung.png")
save(page("Báo tiếng Hàn · 텃밭 신문 (Báo Mảnh vườn — tên Claude chọn)",
          ["Không có phiên âm trên chữ (người học tiếng Hàn đọc được Hangul sau vài tuần); phiên âm có trong ô tra từ.",
           "Bấm từ → từ gốc: 무서워서 → 무섭다, 축제가 → 축제 (tiểu từ / đuôi dính vào từ được máy tách khi nối tra từ)."],
          shot("133_03_bao_han")), "133_03_bao_han.png")
save(page("Chép chính tả tiếng Trung · chấm theo từng chữ",
          ["Gõ bằng bộ gõ pinyin của máy. Chấm từng chữ; gõ nhầm chữ cùng âm (怕 / 帕) thì nói rõ — lỗi hay gặp nhất khi gõ pinyin.",
           "Câu chép lấy từ báo (có giọng đọc) và từ deck như bây giờ; xu như chép tiếng Nhật / Anh."],
          shot("133_04_chep_trung")), "133_04_chep_trung.png")
save(page("Chép chính tả tiếng Hàn · chấm theo cụm (từng chỗ cách)",
          ["Gõ bằng bộ gõ tiếng Hàn của máy. Chấm theo cụm cách nhau dấu cách; cụm sai tô hồng và chỉ chỗ khác (ㅆ → ㅅ).",
           "Không tính sai khi chỉ khác dấu câu / thiếu dấu cách cuối câu (như tiếng Anh: hoa thường không tính)."],
          shot("133_05_chep_han")), "133_05_chep_han.png")
