"""Ghép ảnh phác 1.36 (Giáng sinh) từ ảnh gốc của mock_136.js: python3 mock_136_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  136_01_lich.png       Lịch chờ Giáng sinh 1–24/12 (giả hôm nay 10/12): ô đã mở, ô lỡ ngày, ô hôm nay, ô tự vẽ, ô ngôi sao
  136_02_treo_mon.png   1/12 cây trống → mở ô → chọn chỗ treo / màu / từ gắn; 13/12 rê chuột lên món thấy ngày + từ
  136_03_tu_ve.png      Chủ nhật 6 / 13 / 20: tự vẽ món treo 8 × 8, xem ngay trên cây
  136_04_thiep.png      Thiệp điều ước: mặt trước trang trí (giấy, sticker, hình 16 × 16), mặt sau viết điều ước, treo lên cây
  136_05_dem_24.png     Đêm 24/12: cây đủ 24 món + ngôi sao, ông già Noel đáp xe tuần lộc xuống sân lấy thiệp
  136_06_sang_25.png    Sáng 25/12: hộp quà dưới gốc — quả cầu tuyết có cây của bạn + thư trả lời ghép 24 từ"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc"
BOLD = ImageFont.truetype(CJK % "Bold", 24)
MID = ImageFont.truetype(CJK % "Bold", 17)
SMALL = ImageFont.truetype(CJK % "Regular", 17)
INK, PAPER = (58, 42, 34), (253, 246, 232)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def scaled(im, k, nearest=False):
    return im.resize((round(im.width * k), round(im.height * k)), Image.NEAREST if nearest else Image.LANCZOS)


def page(title, lines, body, gap=20):
    head = 26 + 36 + 27 * len(lines)
    o = Image.new("RGB", (body.width + 2 * gap, head + body.height + gap), PAPER)
    d = ImageDraw.Draw(o)
    d.text((gap, 14), title, font=BOLD, fill=INK)
    for i, t in enumerate(lines):
        d.text((gap, 54 + 27 * i), t, font=SMALL, fill=INK)
    o.paste(body, (gap, head))
    return o


def stack(parts, gap=16, label=28):
    """parts: [(ảnh, nhãn)] xếp dọc, nhãn đậm phía trên mỗi ảnh."""
    W = max(im.width for im, _ in parts)
    H = sum(im.height + (label if lab else 0) for im, lab in parts) + gap * (len(parts) - 1)
    o = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(o)
    y = 0
    for im, lab in parts:
        if lab:
            d.text((0, y), lab, font=MID, fill=INK)
            y += label
        o.paste(im, (0, y))
        y += im.height + gap
    return o


def side(parts, gap=16, label=28):
    """parts: [(ảnh, nhãn)] xếp ngang."""
    W = sum(im.width for im, _ in parts) + gap * (len(parts) - 1)
    H = max(im.height for im, _ in parts) + label
    o = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(o)
    x = 0
    for im, lab in parts:
        d.text((x, 0), lab, font=MID, fill=INK)
        o.paste(im, (x, label))
        x += im.width + gap
    return o


K = 0.86

# 01 — Lịch
lich = scaled(load("raw_lich.png").crop((0, 0, 1500, 960)), K)
page("1.36 · Lịch chờ Giáng sinh (ví dụ: hôm nay Thứ Năm 10/12)", [
    "Mở từ chip “Giáng sinh”, từ dòng nhắc trong thẻ Hôm nay hoặc bấm vào cây thông ở sân. 24 ô cửa, mỗi ô một món treo.",
    "Ngày nào có ôn (ôn trên điện thoại cũng tính) thì mở ô ngày đó. Lỡ ngày thì ôn thêm 15 lượt để mở bù. Không cần ôn liền ngày.",
    "Chủ nhật 6 / 13 / 20 là ô tự vẽ; ô 24 là ngôi sao trên đỉnh cây. Quà chỉ là đồ trang trí, không cho xu.",
], lich).save(os.path.join(OUT, "136_01_lich.png"))

# 02 — Treo món + rê chuột
treo = scaled(load("raw_treo.png").crop((0, 90, 1500, 720)), K)
ru = scaled(load("raw_ru.png").crop((640, 100, 1200, 410)), 1.6, nearest=True)
page("1.36 · Treo món lên cây của mình", [
    "Mở ô xong thì bấm một chấm trắng trên cây để chọn chỗ treo, chọn màu và từ gắn với món đó.",
    "Từ gắn mặc định là từ bạn bấm Lại nhiều nhất hôm nay, đổi được. Không muốn chọn thì bấm “Để vườn treo hộ”.",
    "Rê chuột lên món thấy ngày treo và từ của ngày đó: cây thông cũng là cuốn sổ 24 từ của tháng 12.",
], stack([(treo, "1/12 · cây còn trống, mở ô đầu tiên"), (ru, "13/12 · 12 món, rê chuột lên một món (ảnh phóng to)")])).save(
    os.path.join(OUT, "136_02_treo_mon.png"))

# 03 — Tự vẽ
ve = scaled(load("raw_ve.png").crop((150, 90, 1350, 840)), K)
page("1.36 · Chủ nhật: tự vẽ món treo", [
    "Chủ nhật 6, 13, 20/12 không có món có sẵn: bạn tự vẽ một món 8 × 8 (bút, tẩy, đổ màu như Xưởng) và xem ngay trên cây.",
    "Không muốn vẽ thì bấm “Lấy món có sẵn”. Món tự vẽ cũng gắn một từ. Nhờ vậy mỗi người có một cây khác nhau.",
], ve).save(os.path.join(OUT, "136_03_tu_ve.png"))

# 04 — Thiệp điều ước
thiep = scaled(load("raw_thiep.png").crop((140, 90, 1290, 830)), K)
page("1.36 · Thiệp điều ước gửi ông già Noel", [
    "Mặt trước tự trang trí: chọn giấy, dán sticker, vẽ một hình 16 × 16. Mặt sau viết điều ước bằng tiếng Việt hoặc tiếng đang học.",
    "Viết tiếng Nhật thì có nút “Nhờ Gemini sửa” như Luyện viết. Viết xong treo thiệp lên cây, sửa được tới 18:00 ngày 24/12.",
    "Thiệp chỉ nằm trong vườn của bạn, không gửi đi đâu.",
], thiep).save(os.path.join(OUT, "136_04_thiep.png"))

# 05 — Đêm 24
dem = scaled(load("raw_dem.png").crop((0, 90, 1500, 480)), K)
zoom = scaled(load("raw_dem.png").crop((600, 140, 1300, 410)), 1.5, nearest=True)
page("1.36 · Đêm 24/12: ông già Noel ghé lấy thiệp", [
    "Ngôi sao (ô 24) lên đỉnh cây, đèn sáng: đây là thành phẩm của cả tháng. Ông già Noel đáp xe tuần lộc xuống sân và cầm thiệp đi.",
    "StackChan đội mũ Noel và thú nuôi ra xem. Mở vườn lúc nào từ 18:00 ngày 24 tới hết 31/12 cũng gặp, không cần thức khuya.",
], stack([(dem, ""), (zoom, "phóng to")])).save(os.path.join(OUT, "136_05_dem_24.png"))

# 06 — Sáng 25
sang = scaled(load("raw_sang.png").crop((0, 90, 1500, 850)), K)
page("1.36 · Sáng 25/12: quà của ông già Noel", [
    "Dưới gốc cây có hộp quà, trên tuyết còn dấu chân và vết xe. Mở quà nhận quả cầu tuyết, bên trong là cây thông bạn đã trang trí.",
    "Kèm thư trả lời viết sẵn, ghép điều ước của bạn và 24 từ trên cây, không gọi Gemini. Quả cầu tuyết đặt được trong nhà.",
    "Từ 26/12, “Cây thông 2026” vào Kho đồ, giữ mãi. Cuốn nhật ký có trang “Giáng sinh 2026”. Năm sau trang trí một cây mới.",
], sang).save(os.path.join(OUT, "136_06_sang_25.png"))
print("xong:", sorted(f for f in os.listdir(OUT) if f.startswith("136_")))
