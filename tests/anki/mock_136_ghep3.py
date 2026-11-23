"""Ghép ảnh phác 1.36 bản 3 (19/11) từ ảnh gốc của mock_136.js (bước v3lich v3nha v3tuong v3cay v3nhac v3dem):
python3 mock_136_ghep3.py THƯ_MỤC_ẢNH THƯ_MỤC_RA (docs/ke_hoach_1_36/ban3)
  01_tu_lich.png      tủ lịch gỗ 24 ngăn treo tường phòng khách: ngăn hôm nay sáng, ngăn mai hé bóng, mở ngăn có hiệu ứng
  02_nha_4_nac.png    nhà khoác áo Noel lên dần 4 nấc (1/12, 7/12, 14/12, đêm 21/12)
  03_tuong_san.png    tường / sàn Noel (mẫu thật của add-on, dùng như Tường & sàn)
  04_cay_qua.png      cây thông được tặng: trơn → đầy dần; hộp quà bí mật mỗi Chủ nhật, lắc nghe đoán
  05_nhac_banh.png    hộp nhạc học dần; bánh quy + sữa cho ông già Noel (tối 24 → sáng 25)
  06_dem_24.png       đêm 24 toàn cảnh"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc"
BOLD, MID, SMALL = ImageFont.truetype(CJK % "Bold", 24), ImageFont.truetype(CJK % "Bold", 17), ImageFont.truetype(CJK % "Regular", 17)
INK, PAPER = (58, 42, 34), (253, 246, 232)


def load(n):
    return Image.open(os.path.join(SRC, n)).convert("RGB")


def sc(im, k, nearest=False):
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


def grid(cells, cols, gap=14, label=28):
    """cells: [(ảnh, nhãn)] xếp lưới `cols` cột, nhãn đậm phía trên."""
    w = max(im.width for im, _ in cells)
    h = max(im.height for im, _ in cells) + label
    rows = (len(cells) + cols - 1) // cols
    o = Image.new("RGB", (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), PAPER)
    d = ImageDraw.Draw(o)
    for i, (im, lab) in enumerate(cells):
        x, y = (i % cols) * (w + gap), (i // cols) * (h + gap)
        d.text((x, y), lab, font=MID, fill=INK)
        o.paste(im, (x, y + label))
    return o


def stack(parts, gap=16):
    W = max(im.width for im in parts)
    o = Image.new("RGB", (W, sum(im.height for im in parts) + gap * (len(parts) - 1)), PAPER)
    y = 0
    for im in parts:
        o.paste(im, (0, y))
        y += im.height + gap
    return o


K = 0.86
page("1.36 bản 3 · Tủ lịch gỗ 24 ngăn (ví dụ: hôm nay Thứ Năm 10/12)", [
    "Lịch là một món đồ thật treo trên tường phòng khách (bấm mở), thay cho bảng ô vuông. Ngăn đã mở thấy món bên trong.",
    "Ngăn hôm nay sáng lấp lánh; bấm thì ngăn trượt ra, món bay ra kèm tiếng chuông rồi tự bày vào chỗ của nó.",
    "Ngăn ngày mai hé ra một chút: thấy bóng món bên trong để đoán. Ngăn lỡ ngày (4) ôn thêm 15 lượt là mở bù.",
], sc(load("raw_v3_lich.png").crop((0, 90, 1500, 890)), K)).save(os.path.join(OUT, "01_tu_lich.png"))

nha = [sc(load("raw_v3_nha%d.png" % k).crop((200, 95, 620, 410)), 1.4, nearest=True) for k in (1, 2, 3, 4)]
page("1.36 bản 3 · Nhà khoác áo Noel, lên dần 4 nấc", [
    "Thay cho 7 món nhỏ dán rời: cả ngôi nhà mặc một bộ Giáng sinh vẽ liền, mỗi tuần thêm một nấc (4 ngăn của tủ lịch).",
    "Đêm 24 cả nhà sáng đèn. Hết mùa thì nhà về như cũ; bộ áo giữ trong Kho đồ, mùa sau mặc lại được.",
], grid([(nha[0], "1/12 · nấc 1: vòng hoa cửa, nơ đỏ hai đèn lồng"), (nha[1], "7/12 · nấc 2: mái tuyết dày, dây lá thông + nơ"),
         (nha[2], "14/12 · nấc 3: đèn màu viền mái, cột băng, nến cửa sổ"), (nha[3], "21/12 (ảnh ban đêm) · nấc 4: sao trên mái, người tuyết")], 2)
).save(os.path.join(OUT, "02_nha_4_nac.png"))

t = load("raw_v3_tuong.png")
page("1.36 bản 3 · Tường & sàn Noel", [
    "3 ngăn “Trong nhà” tặng mẫu tường / sàn Giáng sinh, dùng như mẫu ở Nhà → Tường & sàn (ảnh: mẫu vẽ thật trong add-on, đồ nội thất vẫn ở trên).",
    "Chọn cho từng gian (bếp, phòng khách, phòng ngủ), giữ mãi, mùa nào cũng đổi lại được.",
], stack([sc(t.crop((480, 130, 1010, 410)), 2, nearest=True), sc(t.crop((255, 425, 1105, 705)), 1.0)])).save(os.path.join(OUT, "03_tuong_san.png"))

cay = [sc(load(f).crop((600, 120, 1020, 410)), 1.15, nearest=True) for f in ("raw_v3_cay1.png", "raw_v3_cay10.png", "raw_v3_cay17.png", "raw_v3_cay24.png")]
page("1.36 bản 3 · Cây thông được tặng: trơn rồi đầy dần · Hộp quà bí mật", [
    "Mở giao diện Giáng sinh đã được tặng cây thông. Ngày 1/12 cây trơn; mỗi ngăn “Cây” treo thêm đúng những món của chính cây đó",
    "(quả châu, dây đèn, dây kim tuyến), đêm 24 có ngôi sao. Ai chưa có cây thì ngày 1/12 được tặng cây trơn.",
    "Mỗi Chủ nhật (6, 13, 20/12) có thêm một hộp quà bí mật dưới gốc: lắc nghe đoán, chỉ mở được sáng 25/12.",
], stack([grid([(cay[0], "1/12 · cây trơn"), (cay[1], "10/12 · 5 quả châu + dây đèn · hộp quà 6/12"),
                (cay[2], "17/12 · + dây kim tuyến · hộp quà 13/12"), (cay[3], "đêm 24/12 · ngôi sao, 3 hộp quà")], 2),
          sc(load("raw_v3_lac.png").crop((300, 95, 1200, 420)), 1.0)])).save(os.path.join(OUT, "04_cay_qua.png"))

nh = load("raw_v3_nhac.png")
b1 = sc(load("raw_v3_banh_toi.png").crop((560, 150, 960, 370)), 1.6, nearest=True)
b2 = sc(load("raw_v3_banh_sang.png").crop((560, 150, 960, 370)), 1.6, nearest=True)
page("1.36 bản 3 · Hộp nhạc học dần · Bánh quy và sữa cho ông già Noel", [
    "Hộp nhạc (ngăn 3/12) mỗi ngày học thêm một câu của きよしこの夜 · Silent Night (đã hết bản quyền, nhạc 8-bit); đêm 24 phát trọn bài.",
    "Ngăn 23/12: bánh quy + sữa. Tối 24 bày trên bàn kotatsu; sáng 25 chỉ còn vụn bánh và tờ giấy cảm ơn của ông.",
], stack([sc(nh.crop((20, 95, 1110, 720)), K), grid([(b1, "tối 24/12"), (b2, "sáng 25/12")], 2)])).save(os.path.join(OUT, "05_nhac_banh.png"))

dem = load("raw_v3_dem.png")
page("1.36 bản 3 · Đêm 24/12 toàn cảnh", [
    "Nhà nấc 4 sáng đèn, cây thông có ngôi sao, 3 hộp quà bí mật dưới gốc; ông già Noel đáp xe tuần lộc lấy thiệp, StackChan + thú nuôi ra xem.",
    "Mở vườn lúc nào từ 18:00 ngày 24 tới hết 31/12 cũng gặp. Sáng 25 mở hộp quà, quả cầu tuyết + thư (như ảnh bản 2).",
], stack([sc(dem.crop((0, 90, 1500, 420)), K), sc(dem.crop((600, 140, 1300, 410)), 1.5, nearest=True)])).save(os.path.join(OUT, "06_dem_24.png"))
print("xong:", sorted(os.listdir(OUT)))
