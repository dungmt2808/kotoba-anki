"""1.25.5: bản sửa hình gốc (admin) — thuần Python, không import aqt.

Người dùng (11/11): sửa thiết kế có sẵn (cây, đèn, thú…) rồi "ra bản mới cho người dùng add-on luôn".
- Bản sửa là các hàng điểm ảnh (như `SPR` trong web/*.js) theo khoá "<nhóm>:<id>" và tên khung:
  {"v": 1, "sua": {"do:chochin": {"spr": ["...kkkk...", …]}, "thu:shiba": {"walk0": [...], "sit": [...]}}}
  nhóm: do (đồ: sân, nội thất, vùng, mùa, hiếm), thu (thú nuôi), giong (giống cây), khach (khách ghé vườn).
- Hai nơi: `kotoba_batake/mau_sua.json` đi kèm gói (mọi người nhận khi cập nhật add-on) và `user_files/mau_sua.json`
  (máy người sửa, chế độ admin). Trang gộp hai nơi, bản của máy thắng từng khung.
- Python chỉ kiểm cấu trúc (ký tự, cỡ, số lượng); trang kiểm thêm cỡ bằng hình gốc và màu có trong bảng màu của nhóm.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

GROUPS = ("do", "thu", "giong", "khach")
KEY_RE = re.compile(r"^(do|thu|giong|khach):[A-Za-z][A-Za-z0-9_]{0,40}$")
FRAME_RE = re.compile(r"^[A-Za-z0-9_]{1,16}$")
ROW_RE = re.compile(r"^[A-Za-z.]{1,64}$")
MAX_ROWS = 64
MAX_FRAMES = 16
MAX_KEYS = 600
MAX_FILE = 4 * 1024 * 1024


class MauError(Exception):
    """Câu tiếng Việt hiện cho người dùng."""


def clean_rows(rows: Any) -> list[str] | None:
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_ROWS:
        return None
    if not all(isinstance(r, str) and ROW_RE.match(r) for r in rows):
        return None
    if len({len(r) for r in rows}) != 1:
        return None
    return list(rows)


def clean_frames(raw: Any) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    if not isinstance(raw, dict):
        return out
    for name, rows in list(raw.items())[:MAX_FRAMES]:
        if isinstance(name, str) and FRAME_RE.match(name):
            r = clean_rows(rows)
            if r is not None:
                out[name] = r
    return out


def clean(raw: Any) -> dict[str, Any]:
    """{"v": 1, "sua": {khoá: {khung: [hàng]}}}; khoá / khung / hàng hỏng bị bỏ, khoá không còn khung nào bị bỏ."""
    out: dict[str, Any] = {"v": 1, "sua": {}}
    src = raw.get("sua") if isinstance(raw, dict) else None
    if not isinstance(src, dict):
        return out
    for key, frames in src.items():
        if len(out["sua"]) >= MAX_KEYS:
            break
        if isinstance(key, str) and KEY_RE.match(key):
            f = clean_frames(frames)
            if f:
                out["sua"][key] = f
    return out


def merge(base: Any, over: Any) -> dict[str, Any]:
    """Gộp hai bộ bản sửa: `over` thắng từng khung (khung khác của `base` giữ nguyên)."""
    a, b = clean(base), clean(over)
    out = {"v": 1, "sua": {k: dict(v) for k, v in a["sua"].items()}}
    for k, frames in b["sua"].items():
        out["sua"].setdefault(k, {}).update(frames)
    return clean(out)


def set_fix(store: Any, key: Any, frames: Any) -> dict[str, Any]:
    """Ghi bản sửa của một hình (thay hết các khung cũ của hình đó). Không có khung nào hợp lệ → MauError."""
    if not isinstance(key, str) or not KEY_RE.match(key):
        raise MauError("Không rõ hình nào.")
    f = clean_frames(frames)
    if not f:
        raise MauError("Hình trống hoặc không hợp lệ.")
    out = clean(store)
    out["sua"][key] = f
    return clean(out)


def remove(store: Any, key: Any) -> dict[str, Any]:
    out = clean(store)
    if isinstance(key, str):
        out["sua"].pop(key, None)
    return out


def read(path: str) -> dict[str, Any]:
    """Đọc file bản sửa; không có / hỏng → bộ trống."""
    try:
        if os.path.getsize(path) > MAX_FILE:
            return clean(None)
        with open(path, encoding="utf-8") as f:
            return clean(json.load(f))
    except (OSError, ValueError):
        return clean(None)


def write(path: str, store: Any) -> None:
    data = clean(store)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, path)


def parse_upload(text: Any) -> dict[str, Any]:
    """File người khác gửi (Nhập file): phải đúng dạng, có ít nhất một hình."""
    if not isinstance(text, str) or len(text) > MAX_FILE:
        raise MauError("File quá lớn hoặc không đọc được.")
    try:
        data = clean(json.loads(text))
    except ValueError:
        raise MauError("File không đúng định dạng bản sửa hình.") from None
    if not data["sua"]:
        raise MauError("File không có hình nào.")
    return data
