"""Trang web chung (1.36.2): sinh mã thiệp "KBC1:" thử (đúng + hỏng + sửa tay) và thiệp add-on đọc được (le_core.decode_card) —
kiem_tra_trang.js so với KBC.decode (site/thiep.js) trên trình duyệt.

Chạy: python3 tests/trang/thiep_thu.py [THU_MUC_ADDON] [SO_MA] > thiep_thu.json
Mỗi ca: {"code": "...", "ok": thiệp đã làm sạch | null, "nhan": nhóm ca}
"""
from __future__ import annotations

import base64
import json
import os
import random
import sys
import unicodedata
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake")
N = int(sys.argv[2]) if len(sys.argv) > 2 else 60
sys.path.insert(0, ADDON)
sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))
import le_core as le  # noqa: E402

rnd = random.Random(20261125)
IDS = ["xmastree", "presents", "yukidaruma", "stackchan", "wreath", "sleigh", "le_tat", "le_tuanloc", "fence", "khong_co_hinh"]
TEXTS = ["Giáng sinh an lành!", "— Lan gửi Hoa",
         "メリークリスマス",
         "圣诞快乐 🎄",      # chữ Nhật / chữ Trung mỗi thứ một dòng (soát chữ test_1314.py)
         "Frohe  Weihnachten ", " a\tb\nc\r\n",
         unicodedata.normalize("NFD", "Tiếng Việt có dấu"), "​ẩn‮﻿chữ", "x" * 40, "　khoảng trắng Nhật　", "\x85nel\x85", ""]


def pack(obj, raw_bytes: bytes | None = None) -> str:
    """Mã thiệp từ một đối tượng bất kỳ (không làm sạch trước — như người sửa tay)."""
    b = raw_bytes if raw_bytes is not None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
    z = zlib.compress(b, 9)
    return le.CODE_PREFIX + base64.urlsafe_b64encode(z).decode("ascii").rstrip("=") + ":" + ("%08x" % (zlib.crc32(z) & 0xFFFFFFFF))[:6]


def rdraw() -> str:
    """Hình vẽ tay ngẫu nhiên (vài nét) — dạng gọn như le_core._px_encode."""
    cells = ["."] * 9600
    for _ in range(rnd.randint(1, 12)):
        x, y, c = rnd.randrange(120), rnd.randrange(80), rnd.choice(le.DRAW_CHARS)
        for _ in range(rnd.randint(1, 40)):
            x = max(0, min(119, x + rnd.choice((-1, 0, 1)))); y = max(0, min(79, y + rnd.choice((-1, 0, 1))))
            cells[y * 120 + x] = c
    return le._px_encode("".join(cells))


def rcard() -> dict:
    st = []
    for _ in range(rnd.randint(0, 16)):
        s = {"s": rnd.choice(IDS), "x": rnd.choice([rnd.randint(-60, 130), rnd.uniform(-60, 130), rnd.randint(-48, 120) + 0.5]),
             "y": rnd.choice([rnd.randint(-60, 90), rnd.uniform(-60, 90), rnd.randint(-48, 80) + 0.5])}
        if rnd.random() < 0.3:
            s["m"] = rnd.choice([1, True, 0, "1", 1.0])
        if rnd.random() < 0.3:
            s["z"] = rnd.choice([2, 2.0, 1, "2", True])
        st.append(s)
    out = {"f": rnd.choice(["den", "tuyet", "thong", "qua"]), "st": st, "t1": rnd.choice(TEXTS), "t2": rnd.choice(TEXTS),
           "c": rnd.choice(["", "ja", "vi", "en", "zh", "ko", "de", "fr", "xx"]), "w": "điều ước không được vào mã", "wl": "ja"}
    if rnd.random() < 0.6:
        out["d"] = rdraw()          # 1.36.3: hình vẽ tay
    return out


cases = []


def add(code: str, nhan: str) -> None:
    cases.append({"code": code, "ok": le.decode_card(code), "nhan": nhan})


for _ in range(N):
    add(le.card_code(rcard()), "đúng (add-on làm)")
for _ in range(N):
    add(pack(rcard()), "sửa tay (chưa làm sạch: số lẻ .5, bool, chữ bẩn, quá 12 sticker)")
good = [c["code"] for c in cases if c["ok"]][:N]
for code in good[: N // 2]:
    i = rnd.randrange(len(code))
    add(code[:i] + "\n " + code[i:], "đúng, có xuống dòng / dấu cách")
    k = rnd.randrange(len("KBC1:"), len(code))
    ch = rnd.choice("ABCxyz019-_")
    add(code[:k] + ch + code[k + 1:], "đổi một ký tự")
    add(code[: rnd.randrange(5, len(code))], "cắt cụt")
    add(code[:-6] + code[-6:].upper(), "mã kiểm tra viết hoa")
add("", "trống")
add("KB1:m:8:YQ:eJwrS:00000000", "mã thiết kế KB1")
add("KBC1:", "chỉ có đầu mã")
add("KBC1:abc", "không có mã kiểm tra")
add("KBC1:" + "A" * 7000 + ":000000", "quá 6.000 ký tự")
add("kbc1:" + good[0][5:], "đầu mã viết thường")
add(pack({"f": "den", "st": [], "c": []}), "câu chúc là mảng (1.36.1: add-on ném TypeError)")
add(pack({"f": "den", "st": [], "c": {"a": 1}}), "câu chúc là đối tượng")
add(pack({"f": ["den"], "st": []}), "khung là mảng")
add(pack({"f": "den", "st": {"s": "x"}}), "sticker không phải danh sách")
add(pack({"f": "den", "st": [{"s": "xmastree\n", "x": 1, "y": 1}, {"s": "Xmas", "x": 1, "y": 1}, {"s": "a" * 41, "x": 1, "y": 1}]}), "tên sticker lạ")
add(pack({"f": "den", "st": [{"s": "fence", "x": 1e300, "y": -1e300}, {"s": "fence", "x": 10 ** 30, "y": 3}]}), "toạ độ rất lớn")
add(pack([1, 2, 3]), "JSON là mảng")
add(pack("chuỗi"), "JSON là chuỗi")
add(pack(None, b"{not json"), "JSON hỏng")
add(pack(None, b'{"f": "den", "t1": "\xff\xfe"}'), "UTF-8 hỏng")
add(pack(None, json.dumps({"f": "den", "st": [], "t1": "a" * 20000}).encode()), "giải nén > 16.000 byte")
add(pack(None, json.dumps({"f": "den", "st": [], "t1": "b" * 15900}).encode()), "giải nén gần 16.000 byte")
# 1.36.3: hình vẽ tay sửa tay / hỏng
D = rdraw()
for bad, nhan in ((D.replace("2", "²", 1) if "2" in D else "²k" + D, "hình vẽ: chữ số Unicode"), ("0k" + D, "hình vẽ: lặp 0 lần"),
                  (D + "5", "hình vẽ: số đứng cuối"), ("9601k", "hình vẽ: thừa ô"), ("9599k", "hình vẽ: thiếu ô"),
                  ("9600X", "hình vẽ: màu lạ"), ("9600.", "hình vẽ: trống"), ("k" * 9600, "hình vẽ: chưa gọn (k × 9600)"),
                  ("".join(rnd.choice(le.DRAW_CHARS) for _ in range(9600)), "hình vẽ: nhiễu (quá giới hạn)"), (123, "hình vẽ: số"),
                  ("05k9595.", "hình vẽ: số 0 đứng đầu")):
    add(pack({"f": "den", "st": [], "d": bad}), bad if isinstance(bad, str) and len(bad) < 20 else nhan)
add(le.CODE_PREFIX + base64.urlsafe_b64encode(b"khong phai zlib").decode().rstrip("=") + ":" +
    ("%08x" % (zlib.crc32(b"khong phai zlib") & 0xFFFFFFFF))[:6], "không phải zlib (đúng mã kiểm tra)")
json.dump(cases, sys.stdout, ensure_ascii=False)
