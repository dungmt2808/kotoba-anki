"""ghep_1303.py TRƯỚC SAU RA — ghép ảnh của tests/anki/shots_1303.js chạy trên bản 1.30.2 (TRƯỚC) và 1.30.3 (SAU) thành ảnh
"Trước | Sau" có tiêu đề (dùng cho docs/kiem_thu/1.30.3/BAO_CAO.md). Cần Pillow + phông Noto CJK."""
import os, sys

from PIL import Image, ImageDraw, ImageFont

BEFORE, AFTER, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
if not os.path.exists(FONT):
    FONT = BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

PAIRS = [
    ("01_vuon_sang", "1303_01_vuon_sang", "Màn chính, 9 giờ sáng"),
    ("15_vuon_dem", "1303_02_vuon_dem", "Màn chính, 22 giờ"),
    ("14_vuon_hoang_hon", "1303_03_hoang_hon", "Màn chính, hoàng hôn"),
    ("05_nha_noi_that", "1303_04_nha", "Nhà → Nội thất"),
    ("06_hoi_mua", "1303_05_hoi_mua", "Hộp hỏi trước khi trả xu"),
    ("02_cai_dat", "1303_06_cai_dat", "Bảng Cài đặt (nút bánh răng)"),
    ("10_on_the_mat_sau", "1303_07_on_the", "Ôn thẻ (mặt sau)"),
    ("08_tro_choi", "1303_08_tro_choi", "Trò chơi"),
    ("13_giao_dien", "1303_09_giao_dien", "Cài đặt → Giao diện & chế độ học"),
    ("12_lich_hoa", "1303_10_lich_hoa", "Lịch hoa"),
]


def label(img, text, size=26):
    f = ImageFont.truetype(BOLD, size)
    bar = Image.new("RGB", (img.width, size + 18), (58, 42, 34))
    ImageDraw.Draw(bar).text((12, 6), text, font=f, fill=(255, 250, 240))
    out = Image.new("RGB", (img.width, img.height + bar.height), (255, 255, 255))
    out.paste(bar, (0, 0)); out.paste(img, (0, bar.height))
    return out


for src, dst, title in PAIRS:
    a, b = os.path.join(BEFORE, src + ".png"), os.path.join(AFTER, src + ".png")
    if not (os.path.exists(a) and os.path.exists(b)):
        print("thiếu", src); continue
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    sc = 0.5
    ia = ia.resize((int(ia.width * sc), int(ia.height * sc)), Image.LANCZOS)
    ib = ib.resize((int(ib.width * sc), int(ib.height * sc)), Image.LANCZOS)
    ia, ib = label(ia, "1.30.2 · " + title), label(ib, "1.30.3 · " + title)
    out = Image.new("RGB", (ia.width + ib.width + 12, max(ia.height, ib.height)), (255, 255, 255))
    out.paste(ia, (0, 0)); out.paste(ib, (ia.width + 12, 0))
    out.save(os.path.join(OUT, dst + ".png"), optimize=True)
    print("ảnh", dst)
