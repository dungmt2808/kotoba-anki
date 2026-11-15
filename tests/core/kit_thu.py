"""Thư mục kotoba_daily cho test (15/11): repo công khai không kèm dữ liệu riêng của bộ kotoba_daily (pham_vi.json sinh từ
giáo trình, bao/ báo + giọng đọc, lich_su.md) → bộ công cụ trong repo + dữ liệu thử ở tests/fixtures:
  - pham_vi_thu.json: bảng phạm vi (bỏ tên sách, chủ đề bài, giải nghĩa ngữ pháp; mã bài "thu:<chương>")
  - kotoba_daily_thu/: chữ của 8 số báo thật 01 → 08/11 (bao/<ngày>/bao.json) + lich_su.md
Ở repo cũ (còn dữ liệu thật) kết quả như nhau: dữ liệu thử phủ lên đúng các file đó.
"""
from __future__ import annotations

import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
KIT = os.path.join(ROOT, "kotoba_daily")
FX = os.path.join(ROOT, "tests", "fixtures")
PHAM_VI = os.path.join(FX, "pham_vi_thu.json")


def pham_vi_path() -> str:
    """pham_vi.json để test: luôn là bảng thử (giống nhau ở mọi máy)."""
    return PHAM_VI


def make(dst: str, ignore: tuple[str, ...] = ("audio", "*.html", "__pycache__", "truyen_chung.json")) -> str:
    """Chép bộ kotoba_daily vào dst rồi phủ 8 số báo + lich_su.md + pham_vi.json thử. Trả dst."""
    shutil.copytree(KIT, dst, ignore=shutil.ignore_patterns(*ignore), dirs_exist_ok=True)
    shutil.copytree(os.path.join(FX, "kotoba_daily_thu"), dst, dirs_exist_ok=True)
    shutil.copy(PHAM_VI, os.path.join(dst, "pham_vi.json"))
    return dst
