"""1.11: Báo lỗi — nhật ký lỗi (Python + JavaScript) và báo cáo chẩn đoán gửi cho người làm add-on.

Thuần Python (không import Qt / aqt) để test được. __init__.py gom thông tin máy rồi gọi build_report().
Nguyên tắc riêng tư: không có tên deck, nội dung thẻ, tên hồ sơ, đường dẫn thư mục nhà (đổi thành ~).
Báo cáo chỉ hiện ra để người dùng tự chép / lưu; add-on không gửi gì lên mạng.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any

LOG_MAX = 40            # giữ tối đa 40 lỗi gần nhất (gộp lỗi trùng)
DETAIL_MAX = 4000       # cắt bớt traceback quá dài
MSG_MAX = 300
REPORT_ERRORS = 15      # báo cáo chỉ in 15 lỗi mới nhất


def _now() -> int:
    return int(time.time())


class ErrorLog:
    """Nhật ký lỗi lưu ở user_files/errors.json (giữ khi cập nhật add-on, không đồng bộ).

    Lỗi trùng (cùng loại + chỗ + nội dung) chỉ tăng bộ đếm, nên lỗi lặp mỗi khung hình không làm tràn nhật ký."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.session_new = 0          # số lỗi mới trong lần chạy này (để hiện nhắc một lần)

    def entries(self) -> list[dict[str, Any]]:
        try:
            with open(self.path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            return []
        out = []
        for e in raw if isinstance(raw, list) else []:
            if isinstance(e, dict) and isinstance(e.get("msg"), str):
                out.append({"kind": str(e.get("kind") or "?")[:10], "where": str(e.get("where") or "")[:80],
                            "msg": e["msg"][:MSG_MAX], "detail": str(e.get("detail") or "")[:DETAIL_MAX],
                            "first": int(e.get("first") or 0), "last": int(e.get("last") or 0),
                            "count": max(1, int(e.get("count") or 1)), "ver": str(e.get("ver") or "")[:20]})
        return out[-LOG_MAX:]

    def _write(self, items: list[dict[str, Any]]) -> None:
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(items[-LOG_MAX:], f, ensure_ascii=False, indent=0)
            os.replace(tmp, self.path)
        except OSError:
            pass          # không ghi được nhật ký thì thôi, không bao giờ làm hỏng việc khác

    def add(self, kind: str, where: str, msg: str, detail: str = "", ver: str = "", now: int | None = None) -> bool:
        """Ghi một lỗi. Trả về True nếu là lỗi mới (chưa có trong nhật ký)."""
        now = _now() if now is None else now
        msg = (msg or "").strip()[:MSG_MAX] or "(không có nội dung)"
        where = (where or "").strip()[:80]
        detail = (detail or "").strip()[-DETAIL_MAX:]
        items = self.entries()
        for e in items:
            if e["kind"] == kind and e["where"] == where and e["msg"] == msg:
                e["count"] += 1
                e["last"] = now
                e["detail"] = detail or e["detail"]
                e["ver"] = ver or e["ver"]
                items.remove(e)
                items.append(e)          # lỗi vừa lặp lại xếp cuối (mới nhất)
                self._write(items)
                return False
        items.append({"kind": kind, "where": where, "msg": msg, "detail": detail, "first": now, "last": now,
                      "count": 1, "ver": ver})
        self._write(items)
        self.session_new += 1
        return True

    def clear(self) -> None:
        self._write([])


KEY_RE = re.compile(r"AIza[0-9A-Za-z_\-]{20,}")
KEY_RE_AQ = re.compile(r"\bAQ\.[0-9A-Za-z_\-.]{20,}")      # 1.22.2: khoá kiểu mới của AI Studio


def redact(text: str, home: str | None = None, names: tuple[str, ...] = ()) -> str:
    """Bỏ thông tin cá nhân khỏi đoạn văn bản: thư mục nhà → ~, tên hồ sơ / tên người dùng → <…>."""
    if not text:
        return ""
    out = KEY_RE.sub("AIza…(đã ẩn)", text)      # 1.12: khoá Gemini lỡ lọt vào thông báo lỗi
    out = KEY_RE_AQ.sub("AQ.…(đã ẩn)", out)
    home = home if home is not None else os.path.expanduser("~")
    if home and len(home) > 3:
        for h in {home, home.replace("\\", "/"), home.replace("/", "\\")}:
            out = re.sub(re.escape(h) + r"(?=[\\/]|$|\W)", "~", out, flags=re.IGNORECASE)
    for n in names:
        if n and len(n) >= 2:
            out = re.sub(r"(?<=[\\/])" + re.escape(n) + r"(?=[\\/])", "<hồ sơ>", out)
    return out


def _fmt_time(ts: int) -> str:
    if not ts:
        return "?"
    return time.strftime("%d/%m %H:%M", time.localtime(ts))


def build_report(info: dict[str, Any], errors: list[dict[str, Any]], home: str | None = None,
                 names: tuple[str, ...] = ()) -> str:
    """Báo cáo dạng chữ thường (dán vào tin nhắn / issue được). info: các mục `nhãn: giá trị` theo thứ tự."""
    lines = ["ことば畑 — báo cáo lỗi", "=" * 24,
             "Thời gian: " + time.strftime("%Y-%m-%d %H:%M (%z)")]
    for label, value in info.get("rows", []):
        if value in (None, "", [], {}):
            continue
        if isinstance(value, (list, tuple)):
            value = ", ".join(str(v) for v in value)
        lines.append(f"{label}: {value}")
    note = (info.get("note") or "").strip()
    lines += ["", "Mô tả lỗi (bạn tự ghi: đang làm gì thì lỗi, lỗi trông thế nào):",
              note if note else "- …", ""]
    errs = errors[-REPORT_ERRORS:][::-1]
    if not errs:
        lines.append("Nhật ký lỗi: trống.")
    else:
        lines.append(f"Nhật ký lỗi ({len(errors)} lỗi, in {len(errs)} lỗi mới nhất):")
        for e in errs:
            times = f"{_fmt_time(e['last'])}" + (f" · ×{e['count']} từ {_fmt_time(e['first'])}" if e["count"] > 1 else "")
            head = f"- [{times}] {e['kind']}" + (f" · {e['where']}" if e["where"] else "") + \
                (f" · bản {e['ver']}" if e.get("ver") else "")
            lines.append(head)
            lines.append("  " + e["msg"])
            if e["detail"]:
                tail = e["detail"].strip().splitlines()[-12:]      # 12 dòng cuối của traceback là đủ
                lines += ["    " + t for t in tail]
    lines += ["", "Báo cáo này không có tên deck, nội dung thẻ hay đường dẫn cá nhân. Xem lại trước khi gửi."]
    return redact("\n".join(lines), home, names)


def config_diff(cfg: dict[str, Any], defaults: dict[str, Any]) -> list[str]:
    """Các mục cấu hình khác mặc định (đường dẫn thư mục báo chỉ ghi là đã đặt / chưa)."""
    out = []
    for k in sorted(defaults):
        if k.startswith("_"):
            continue
        v = cfg.get(k, defaults[k])
        if v == defaults[k]:
            continue
        if k == "bao_dir":
            out.append("bao_dir=(đã đặt)")
        elif k == "gemini_key":          # 1.12: không bao giờ ghi khoá API vào báo cáo
            out.append("gemini_key=(đã đặt)")
        else:
            out.append(f"{k}={json.dumps(v, ensure_ascii=False)}")
    return out


def os_release(path: str = "/etc/os-release") -> str:
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return ""


def clean_client(raw: Any) -> dict[str, Any]:
    """Thông tin phía trang vườn (JS gửi lên): kích thước cửa sổ, màn hình, trình duyệt nhúng."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, Any] = {}
    for k in ("w", "h", "sw", "sh"):
        if isinstance(raw.get(k), (int, float)):
            out[k] = int(raw[k])
    if isinstance(raw.get("dpr"), (int, float)):
        out["dpr"] = round(float(raw["dpr"]), 2)
    ua = raw.get("ua")
    if isinstance(ua, str):
        m = re.search(r"(Chrome|QtWebEngine)/([\d.]+)", ua)
        out["engine"] = " ".join(f"{a}/{b}" for a, b in re.findall(r"(Chrome|QtWebEngine)/([\d.]+)", ua)) if m else ua[:60]
    for k in ("scene", "panel", "theme"):
        if isinstance(raw.get(k), str):
            out[k] = raw[k][:30]
    return out
