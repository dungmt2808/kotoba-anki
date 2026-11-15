"""Trang web chung: sinh mã KB1 thử (đúng + hỏng) và kết quả add-on đọc được — kiem_tra_trang.js so với KB.decode trên trình duyệt.

Chạy: python3 tests/trang/ma_thu.py [THU_MUC_ADDON] [SO_MA] > ma_thu.json
Mỗi ca: {"code": "...", "ok": kết quả share.parse_code | null, "err": câu lỗi | null, "nhan": mô tả ca}
"""
from __future__ import annotations

import base64
import json
import os
import random
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake")
N = int(sys.argv[2]) if len(sys.argv) > 2 else 60
sys.path.insert(0, ADDON)
sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))
import garden_core as core  # noqa: E402

share, more = core.share, core.more
PAL = list(core.CRAFT_PALETTE)
rnd = random.Random(20261115)


def parse(code: str):
    try:
        return share.parse_code(code, core.CRAFT_PALETTE, core.CRAFT_PRICES, core.CRAFT_KINDS, core.CRAFT_FX), None
    except share.ShareError as err:
        return None, str(err)


def pic(w: int, h: int, fill: float) -> str:
    cols = rnd.sample(PAL, rnd.randint(1, 8))
    out = []
    for _ in range(w * h):
        out.append(rnd.choice(cols) if rnd.random() < fill else ".")
    # mảng màu liền cho có đoạn lặp dài (như hình vẽ thật)
    for _ in range(rnd.randint(0, 6)):
        x, y, ww, hh, c = rnd.randrange(w), rnd.randrange(h), rnd.randint(1, w), rnd.randint(1, h), rnd.choice(PAL + ["."])
        for j in range(y, min(h, y + hh)):
            for i in range(x, min(w, x + ww)):
                out[j * w + i] = c
    return "".join(out)


NAMES = ["Đèn lồng", "", "  Cơm   nắm  ", "<b>Hoa</b> & 'lá'", "猫の家", "🌸 Hoa anh đào 🌸", "x" * 60, "Tên\tcó\ntab"]


def item() -> str:
    sz = rnd.choice([16, 24, 32])
    flat = pic(sz, sz, rnd.choice([0.05, 0.4, 0.9]))
    if not flat.strip("."):
        flat = "k" + flat[1:]
    meta = {"size": sz, "name": rnd.choice(NAMES) or "Món", "kind": rnd.choice(list(core.CRAFT_KINDS)), "fx": rnd.choice(core.CRAFT_FX)}
    return share.code_item(meta, more.px_encode(flat))


def seed() -> str:
    st = []
    for i in range(5):
        st.append(more.px_encode(pic(16, 16, 0.5)) if rnd.random() < 0.75 or i >= 2 else "")
    while sum(1 for s in st if s) < 3:
        st[rnd.randrange(5)] = more.px_encode(pic(16, 16, 0.5))
    return share.code_seed(rnd.choice(NAMES) or "Giống", st)


def zone() -> str:
    lm = more.px_encode(pic(64, 76, 0.3)) if rnd.random() < 0.8 else ""
    env = more.px_encode(pic(256, 76, 0.15)) if rnd.random() < 0.5 or not lm else ""
    z = {"name": rnd.choice(NAMES) or "Vùng", "bg": rnd.choice(list(more.UZONE_BG)), "ground": rnd.choice(more.UZONE_GROUND),
         "hills": rnd.choice(more.UZONE_HILLS), "lm": lm, "env": env}
    return share.code_zone(z)


def raw(kind: str, size: str, name: str, data: str) -> str:
    """Mã tự dựng (dữ liệu sai nhưng mã kiểm tra đúng) — để thử phần kiểm tra bên trong."""
    head = ":".join(["KB1", kind, size, base64.urlsafe_b64encode(name.encode()).decode().rstrip("="),
                     base64.urlsafe_b64encode(zlib.compress(data.encode("ascii"), 9)).decode().rstrip("=")])
    return head + ":" + f"{zlib.crc32(head.encode('ascii')) & 0xFFFFFFFF:08x}"


def main() -> None:
    cases = []

    def add(code: str, label: str) -> None:
        ok, err = parse(code)
        cases.append({"code": code, "ok": ok, "err": err, "nhan": label})

    for i in range(N):
        code = [item, seed, zone][i % 3]()
        add(code, "đúng " + code[4])
        # hỏng: đổi một ký tự, cắt cụt, thêm xuống dòng / dấu cách, KB2, bỏ một đoạn
        j = rnd.randrange(4, len(code))
        ch = rnd.choice("AbZ09_-") if code[j] != "A" else "B"
        add(code[:j] + ch + code[j + 1:], "đổi ký tự")
        add(code[: rnd.randrange(5, len(code))], "cắt cụt")
        add("  " + "\n".join(code[k:k + 37] for k in range(0, len(code), 37)) + " \n", "xuống dòng")
    c = item()
    add("KB2" + c[3:], "KB2")
    add(c.rsplit(":", 1)[0], "thiếu mã kiểm tra")
    add("xin chào", "không phải mã")
    add("", "rỗng")
    add("KB1:m:16:@@:@@:00000000", "ký tự lạ")
    flat16 = "k" * 256
    add(raw("m", "20", "x", "ground,none," + more.px_encode(flat16)), "cỡ lạ")
    add(raw("m", "16", "x", "sky,none," + more.px_encode(flat16)), "loại đặt lạ")
    add(raw("m", "16", "x", "ground,laser," + more.px_encode(flat16)), "hiệu ứng lạ → none")
    add(raw("m", "16", "x", "ground,none,255k"), "thiếu điểm ảnh")
    add(raw("m", "16", "x", "ground,none,256Q"), "màu lạ")
    add(raw("m", "16", "x", "ground,none,256."), "hình trống")
    add(raw("g", "16", "x", ",".join([more.px_encode(flat16)] * 2 + ["", "", ""])), "giống ít hơn 3 giai đoạn")
    add(raw("g", "16", "x", ",".join([more.px_encode(flat16)] * 4)), "giống thiếu một giai đoạn")
    add(raw("z", "64x76", "x", "meadow,5ed35e,7ed98a,,"), "vùng chưa vẽ gì")
    add(raw("z", "64x76", "x", "space,5ed35e,7ed98a," + more.px_encode("k" * 64 * 76) + ","), "nền lạ")
    add(raw("z", "64x76", "x", "meadow,123456,7ed98a," + more.px_encode("k" * 64 * 76) + ","), "màu đất lạ")
    add(raw("z", "64x76", "x", "meadow,5ED35E,7ED98A," + more.px_encode("k" * 64 * 76) + ","), "màu viết hoa")
    add(raw("x", "16", "x", "a"), "loại lạ")
    add(raw("m", "16", "x", "ground,none," + "k" * 170000), "quá nhiều dữ liệu (bom nén)")
    json.dump(cases, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
