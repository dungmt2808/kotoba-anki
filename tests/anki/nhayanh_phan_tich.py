"""Phân tích khung hình quay màn hình (Page.startScreencast) cho e2e_nhayanh.js: vùng ảnh của thẻ có bị TRỐNG ở khung nào không.

Ảnh thử là ảnh nhiễu (độ lệch chuẩn độ sáng rất cao); vùng trống (nền thẻ) gần như một màu. In ra JSON: [{"f": tên, "sd": độ lệch
chuẩn độ sáng của vùng}] theo thứ tự khung. Chạy: python nhayanh_phan_tich.py THƯ_MỤC_KHUNG x y w h (toạ độ điểm ảnh của khung).
Cần Pillow (venv của Anki 26.9.4 có sẵn)."""
import json
import os
import sys

from PIL import Image, ImageStat

d = sys.argv[1]
x, y, w, h = (int(float(v)) for v in sys.argv[2:6])
out = []
for f in sorted(os.listdir(d)):
    if not f.endswith((".png", ".jpg")):
        continue
    im = Image.open(os.path.join(d, f)).convert("L")
    box = (max(0, x), max(0, y), min(im.width, x + w), min(im.height, y + h))
    if box[2] <= box[0] or box[3] <= box[1]:
        out.append({"f": f, "sd": -1})
        continue
    st = ImageStat.Stat(im.crop(box))
    out.append({"f": f, "sd": round(st.stddev[0], 1)})
print(json.dumps(out))
