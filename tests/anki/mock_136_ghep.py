"""Ghép ảnh phác 1.36 (Giáng sinh, bản 2 — 18/11) từ ảnh gốc của mock_136.js: python3 mock_136_ghep.py THƯ_MỤC_ẢNH THƯ_MỤC_RA
  136_01_lich.png        Lịch chờ Giáng sinh 1–24/12 (giả hôm nay 10/12): mỗi ô một món cho Cây · Nhà · Trong nhà
  136_02_cay.png         Cây: 1/12 cây trống, 10 chỗ treo đặt sẵn → 24/12 cây xong (7 món + dây kim tuyến + dây đèn + ngôi sao)
  136_03_nha.png         Ngoài nhà: vòng hoa cửa, đèn mái, cột băng, hình dán cửa sổ tự vẽ, người tuyết (chỗ đặt sẵn)
  136_04_trong_nha.png   Trong nhà: vòng hoa tường, tất, tranh tự vẽ, cây thông nhỏ, hộp quà, bánh khúc cây, bát yuzu
  136_05_tu_ve.png       Chủ nhật tự vẽ: 6/12 món treo cây 8 × 8, 13/12 hình dán cửa sổ, 20/12 tranh tường 16 × 16
  136_06_thiep.png       Thiệp điều ước: mặt trước trang trí, mặt sau viết điều ước, treo lên cây
  136_07_dem_24.png      Đêm 24/12: cây + nhà sáng đèn, ông già Noel đáp xe tuần lộc xuống sân lấy thiệp
  136_08_sang_25.png     Sáng 25/12: quả cầu tuyết có cây của bạn + thư trả lời; Kỷ niệm Giáng sinh 2026"""
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
for f in os.listdir(OUT):
    if f.startswith("136_") and f.endswith(".png"):
        os.remove(os.path.join(OUT, f))

lich = scaled(load("raw_lich.png").crop((0, 0, 1500, 960)), K)
page("1.36 · Lịch chờ Giáng sinh (ví dụ: hôm nay Thứ Năm 10/12)", [
    "Mở từ chip “Giáng sinh”, từ dòng nhắc trong thẻ Hôm nay hoặc bấm vào cây thông ở sân. 24 ô cửa, mỗi ô một món để trang trí",
    "cây thông (10 ô), ngôi nhà (7 ô) hoặc trong nhà (7 ô). Đồ chỉ để trang trí và giữ làm kỷ niệm, không cho xu.",
    "Ngày nào có ôn (ôn trên điện thoại cũng tính) thì mở ô ngày đó. Lỡ ngày thì ôn thêm 15 lượt để mở bù, không cần ôn liền ngày.",
], lich).save(os.path.join(OUT, "136_01_lich.png"))

cay1 = scaled(load("raw_cay1.png").crop((0, 90, 1500, 720)), K)
cay2 = scaled(load("raw_cay2.png").crop((560, 100, 1200, 410)), 1.5, nearest=True)
page("1.36 · Cây thông của riêng mình", [
    "Cây có 10 chỗ treo đặt sẵn (chấm trắng) để cây không rối. Mở ô xong thì bấm một chấm để treo và chọn màu; treo rồi vẫn dời được.",
    "Đến 24/12 cây có 7 món treo, dây kim tuyến, dây đèn và ngôi sao. Rê chuột lên một món thấy tên món và ngày mở ô, để làm kỷ niệm.",
], stack([(cay1, "1/12 · cây còn trống, mở ô đầu tiên"), (cay2, "24/12 · cây xong, rê chuột lên một món (ảnh phóng to)")])).save(
    os.path.join(OUT, "136_02_cay.png"))

nha = scaled(load("raw_nha.png").crop((0, 90, 1500, 720)), K)
page("1.36 · Trang trí ngôi nhà (ví dụ: hôm nay Thứ Hai 14/12)", [
    "7 ô cho ngoài nhà: vòng hoa cửa, đèn mái nhà, cột băng, hình dán cửa sổ tự vẽ, người tuyết, kẹo gậy lối đi, nến cửa sổ.",
    "Mỗi món có vài chỗ đặt sẵn (cạnh cửa, góc sân…) cho đẹp; đổi chỗ được tới hết mùa, không muốn bày thì cất vào kho.",
], nha).save(os.path.join(OUT, "136_03_nha.png"))

tr = load("raw_trong.png")
room = tr.crop((300, 95, 1000, 410)); room = room.resize((room.width * 2, room.height * 2), Image.NEAREST)
pop = scaled(tr.crop((320, 425, 950, 600)), 1.0)
page("1.36 · Trang trí trong nhà (ví dụ: 23/12)", [
    "7 ô cho trong nhà: vòng hoa tường, tất Noel, cây thông nhỏ, bánh khúc cây, tranh tự vẽ 16 × 16, bát yuzu (Đông chí), hộp quà.",
    "Đặt như đồ nội thất, ở gian nào cũng được (bếp, phòng khách, phòng ngủ).",
], stack([(room, "phòng khách (ảnh phóng to)"), (pop, "mở ô hôm nay")])).save(os.path.join(OUT, "136_04_trong_nha.png"))

ve = scaled(load("raw_ve.png").crop((150, 90, 1350, 840)), K)
page("1.36 · Chủ nhật: tự vẽ", [
    "3 ô Chủ nhật không có món sẵn mà để bạn tự vẽ (bút, tẩy, đổ màu như Xưởng): 6/12 món treo cây 8 × 8, 13/12 hình dán cửa sổ 8 × 8,",
    "20/12 tranh treo tường 16 × 16. Không muốn vẽ thì bấm “Lấy món có sẵn”. Nhờ vậy mỗi người có một cây và một ngôi nhà khác nhau.",
], ve).save(os.path.join(OUT, "136_05_tu_ve.png"))

thiep = scaled(load("raw_thiep.png").crop((140, 90, 1290, 830)), K)
page("1.36 · Thiệp điều ước gửi ông già Noel", [
    "Mặt trước tự trang trí: chọn giấy, dán sticker, vẽ một hình 16 × 16. Mặt sau viết điều ước bằng tiếng Việt hoặc tiếng đang học.",
    "Viết tiếng Nhật thì có nút “Nhờ Gemini sửa” như Luyện viết. Viết xong treo thiệp lên cây, sửa được tới 18:00 ngày 24/12.",
    "Thiệp chỉ nằm trong vườn của bạn, không gửi đi đâu.",
], thiep).save(os.path.join(OUT, "136_06_thiep.png"))

dem = scaled(load("raw_dem.png").crop((0, 90, 1500, 480)), K)
zoom = scaled(load("raw_dem.png").crop((600, 140, 1300, 410)), 1.5, nearest=True)
page("1.36 · Đêm 24/12: ông già Noel ghé lấy thiệp", [
    "Ngôi sao (ô 24) lên đỉnh cây, cây và nhà sáng đèn: thành phẩm của cả tháng. Ông già Noel đáp xe tuần lộc xuống sân, cầm thiệp đi.",
    "StackChan đội mũ Noel và thú nuôi ra xem. Mở vườn lúc nào từ 18:00 ngày 24 tới hết 31/12 cũng gặp, không cần thức khuya.",
], stack([(dem, ""), (zoom, "phóng to")])).save(os.path.join(OUT, "136_07_dem_24.png"))

sang = scaled(load("raw_sang.png").crop((0, 90, 1500, 850)), K)
page("1.36 · Sáng 25/12: quà của ông già Noel + Kỷ niệm Giáng sinh 2026", [
    "Dưới gốc cây có hộp quà, trên tuyết còn dấu chân và vết xe. Quà là quả cầu tuyết, bên trong là cây thông bạn đã trang trí.",
    "Thư trả lời viết sẵn, nhắc điều ước và đồ bạn đã bày, không gọi Gemini. Tab Album có “Kỷ niệm Giáng sinh 2026”: ảnh sân, ảnh trong nhà,",
    "thiệp, thư, lịch 24 ô. Từ 1/1 hỏi một lần: cất bộ đồ Noel vào Kho đồ (giữ mãi, mùa sau bày lại được) hay để thêm.",
], sang).save(os.path.join(OUT, "136_08_sang_25.png"))
print("xong:", sorted(f for f in os.listdir(OUT) if f.startswith("136_")))
