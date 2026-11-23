"""Ghép ảnh phác "Thiệp Giáng sinh" + "Tô tranh theo số" (21/11) từ ảnh gốc của mock_thiep_to_mau.js — cùng kiểu ảnh bài
đăng 1.35.6 (tiêu đề + ảnh có khung đỏ đánh số + chú thích từng số), dùng hàm của bai_dang_1356_ghep.py.
Chạy: python3 mock_thiep_to_mau_ghep.py RAW RA
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bai_dang_1356_ghep as G

G.SRC, G.OUT = sys.argv[1], sys.argv[2]
G.BRAND = "Ảnh phác · 21/11"
os.makedirs(G.OUT, exist_ok=True)
for n in ["t1_loi_vao", "t2_xuong_thiep", "t3_treo_thiep", "c1_tro_choi", "c2_man_to", "c3_treo_tranh"]:
    if os.path.exists(os.path.join(G.SRC, n + ".png")):
        G.compose(n, G.cropped(n), G.info_of(n))
