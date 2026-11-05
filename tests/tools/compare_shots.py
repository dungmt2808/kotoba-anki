"""compare_shots.py TRƯỚC SAU RA — ghép ảnh của shots_1225.js chạy trên bản cũ (TRƯỚC) và bản mới (SAU) thành ảnh
"Trước | Sau" có tiêu đề + ghi chú (số liệu từ info.json của mỗi lần chạy). Cần Pillow."""
import json, os, sys

from PIL import Image, ImageDraw, ImageFont

BEFORE, AFTER, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
if not os.path.exists(BOLD):
    BOLD = FONT

SHOTS = [
    ("a_thieu_xu_xuong", "a", "0 xu · tab Xưởng: thẻ \"Tạo món đồ mới\"",
     "Trước: nút \"Mở xưởng\" bấm được dù không đủ xu cho món nhỏ nhất (vẽ xong mới biết không lưu được). "
     "Sau: khoá, ghi \"Còn thiếu 200 xu\" như hai thẻ tạo vùng / giống."),
    ("b_doi_ma_sau_xem", "b", "Dán mã chia sẻ: xem trước mã MÓN (200 xu) rồi dán đè mã VÙNG (5.000 xu)",
     "Trước: bản xem trước cũ vẫn còn, bấm \"Làm món này · 200 xu\" lại tạo vùng và trừ 5.000 xu. "
     "Sau: đổi chữ trong ô là bản xem trước cũ biến mất, phải bấm Xem trước lại."),
    ("c_bam_dup_xay", "c", "Bấm đúp nút \"Xây\" (bước Đổ móng · 80 xu)",
     "Trước: xây luôn 2 bước, mất 230 xu. Sau: chỉ xây 1 bước, mất 80 xu (Mua / +1 cái / Sửa 1 nấc cũng vậy)."),
    ("d_nha_1093x560", "d", "Bảng Nhà · laptop 1366×768 đặt Windows 125% (trang ~1093×560)",
     "Trước: danh sách đồ + nút Mua nằm dưới mép cửa sổ, phải cuộn cả trang. "
     "Sau: bảng gọn lại (nút cảnh một hàng, Ví / Thoát cùng hàng tiêu đề), thấy cả hàng đồ đầu tiên."),
    ("e_nha_720x520", "e", "Bảng Nhà · cửa sổ nhỏ nhất Anki cho phép (720×520)",
     "Trước: chỉ thấy khung xem, danh sách đồ ở dưới mép. Sau: bảng gọn + tự cuộn cho vừa cửa sổ."),
    ("f_trong_nha_1093x560", "f", "Cảnh Trong nhà · cửa sổ thấp (1093×560)",
     "Trước: cảnh cao hơn khung xem, tràn lên viền trên, dòng gợi ý đè viền dưới. Sau: khung xem đủ cao cho cảnh ×2."),
]


def load_info(d):
    try:
        return json.load(open(os.path.join(d, "info.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def wrap(draw, text, font, width):
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fmt(v):
    if isinstance(v, list):
        return " · ".join(str(x) for x in v)
    return str(v or "")


ib, ia = load_info(BEFORE), load_info(AFTER)
f_title, f_head, f_text = ImageFont.truetype(BOLD, 26), ImageFont.truetype(BOLD, 22), ImageFont.truetype(FONT, 18)
for name, key, title, note in SHOTS:
    pb, pa = os.path.join(BEFORE, name + ".png"), os.path.join(AFTER, name + ".png")
    if not (os.path.exists(pb) and os.path.exists(pa)):
        print("thiếu ảnh", name)
        continue
    a, b = Image.open(pb).convert("RGB"), Image.open(pa).convert("RGB")
    W = a.width + b.width + 60
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    note_lines = wrap(tmp, note, f_text, W - 40)
    cap_b = wrap(tmp, "Đo được: " + fmt(ib.get(key)), f_text, a.width - 10)
    cap_a = wrap(tmp, "Đo được: " + fmt(ia.get(key)), f_text, b.width - 10)
    top = 20 + 34 + len(note_lines) * 24 + 16 + 34
    cap_h = max(len(cap_b), len(cap_a)) * 24 + 20
    H = top + max(a.height, b.height) + cap_h
    img = Image.new("RGB", (W, H), "#fff7d6")
    d = ImageDraw.Draw(img)
    d.text((20, 20), title, font=f_title, fill="#1b1b2f")
    y = 20 + 34
    for ln in note_lines:
        d.text((20, y), ln, font=f_text, fill="#3a3a55")
        y += 24
    y += 16
    d.rectangle([20, y - 4, 20 + a.width, y + 28], fill="#ffb3b3")
    d.text((28, y), "TRƯỚC (1.22.4)", font=f_head, fill="#7a0010")
    d.rectangle([40 + a.width, y - 4, 40 + a.width + b.width, y + 28], fill="#b8f0c0")
    d.text((48 + a.width, y), "SAU (1.22.5)", font=f_head, fill="#0b5a1c")
    img.paste(a, (20, top))
    img.paste(b, (40 + a.width, top))
    d.rectangle([20, top, 20 + a.width - 1, top + a.height - 1], outline="#d0002a", width=3)
    d.rectangle([40 + a.width, top, 40 + a.width + b.width - 1, top + b.height - 1], outline="#139a35", width=3)
    yy = top + max(a.height, b.height) + 10
    for i, ln in enumerate(cap_b):
        d.text((24, yy + i * 24), ln, font=f_text, fill="#7a0010")
    for i, ln in enumerate(cap_a):
        d.text((44 + a.width, yy + i * 24), ln, font=f_text, fill="#0b5a1c")
    out = os.path.join(OUT, name + ".png")
    img.save(out, optimize=True)
    print(out, img.size)
