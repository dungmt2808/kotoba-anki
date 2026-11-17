"""Ghép ảnh phác 1.32 từ ảnh gốc của mock_132.js: python3 mock_132_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  132_02_sinh_hoat_5_tieng.png   bấm StackChan đang đọc sách: thẻ sinh hoạt ở 5 tiếng
  132_03_stackchan_noi.png       StackChan nói (bong bóng cạnh linh vật) ở 5 tiếng
  132_09_cay_trung_han.png       bấm cây tiếng Trung (pinyin trên chữ, Hán Việt) / tiếng Hàn
Các ảnh 132_01, 04–08, 10 chụp thẳng (mock_132.js) — chép sang thư mục ra."""
import os, shutil, sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
INK, PAPER, RED = (74, 52, 38), (253, 246, 232), (224, 84, 78)
NAMES = {"ja": ("Tiếng Nhật", "như hiện nay"), "en": ("Tiếng Anh", "mới"), "zh": ("Tiếng Trung", "mới · có pinyin"),
         "ko": ("Tiếng Hàn", "mới · có phiên âm"), "vi": ("Chỉ tiếng Việt", "mới")}
LANGS = ("ja", "en", "zh", "ko", "vi")


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def grid(rows, title, out, gap=18, head=74, label=40):
    """rows: [[(ảnh, nhãn, nhãn phụ), …], …] → một ảnh nền giấy, tiêu đề ở trên."""
    widths = [sum(im.width for im, _a, _b in r) + gap * (len(r) + 1) for r in rows]
    heights = [max(im.height for im, _a, _b in r) + label for r in rows]
    W, H = max(widths), head + sum(heights) + gap * (len(rows) + 1)
    o = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(o)
    d.text((gap, 18), title, font=BOLD, fill=INK)
    y = head
    for r, h in zip(rows, heights):
        x = gap
        for im, a, b in r:
            d.text((x, y + 6), a, font=BOLD, fill=RED if b.startswith("mới") else INK)
            if b:
                d.text((x + d.textlength(a, font=BOLD) + 10, y + 11), b, font=SMALL, fill=INK)
            o.paste(im, (x, y + label))
            d.rectangle([x - 1, y + label - 1, x + im.width, y + label + im.height], outline=INK)
            x += im.width + gap
        y += h + gap
    o.save(os.path.join(OUT, out))
    print(" ", out, o.size)


grid([[(load("raw_sinhhoat_%s.png" % l), *NAMES[l]) for l in LANGS[:3]],
      [(load("raw_sinhhoat_%s.png" % l), *NAMES[l]) for l in LANGS[3:]]],
     "Bấm StackChan đang đọc sách — câu sinh hoạt theo \"Tiếng trong vườn\"", "132_02_sinh_hoat_5_tieng.png")
grid([[(load("raw_noi_%d_%s.png" % (i, l)), *NAMES[l]) for l in LANGS] for i in (0, 1)][0:1] +
     [[(load("raw_noi_1_%s.png" % l), *NAMES[l]) for l in LANGS[:3]], [(load("raw_noi_1_%s.png" % l), *NAMES[l]) for l in LANGS[3:]]],
     "StackChan nói — phần tiếng Nhật đổi theo tiếng đã chọn, phần tiếng Việt giữ nguyên", "132_03_stackchan_noi.png")
grid([[(load("raw_ghim_zh.png"), "Deck tiếng Trung", "pinyin nằm trên chữ như furigana · Hán Việt cạnh nghĩa"),
       (load("raw_ghim_ko.png"), "Deck tiếng Hàn", "phiên âm dưới chữ")]],
     "Bấm vào cây của deck tiếng Trung / tiếng Hàn", "132_09_cay_trung_han.png")
for n in ("132_01_cai_dat", "132_04_so_sinh_hoat_trung", "132_05_hop_suu_tam_han", "132_06_khach_anh", "132_07_cau_hinh_trung",
          "132_08_cau_hinh_han", "132_10_duoi_qua_pinyin"):
    shutil.copy(os.path.join(SRC, n + ".png"), os.path.join(OUT, n + ".png"))
    print(" ", n + ".png")
