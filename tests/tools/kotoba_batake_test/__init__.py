"""ことば畑 · Công cụ test (1.23, kế hoạch mục 5) — add-on PHỤ, cài cạnh ことば畑 để thử mọi giao diện mà không cần
kiếm đủ xu. KHÔNG nằm trong bản phát hành (gói ことば畑 đăng AnkiWeb không có nút hay khoá nào để thêm xu).

Menu Tools → ことば畑 · Công cụ test:
- Sao lưu ví (mọi khoá ことば畑 trong collection: xu, nhà, đồ, vùng, giao diện mùa, nhật ký, báo…) ra file; Khôi phục ví.
- +1.000 / +100.000 / +1.000.000 xu; đưa ví về 0 xu.
- Xây xong nhà; mở hết vùng; mở hết giao diện mùa.
- Xoá số báo Gemini hôm nay (thử lại luồng viết báo); giả lập thư mục kotoba_daily mất / có lại.
- Bật / tắt Gemini giả (viết báo không tốn lượt thật: chép một số báo mẫu).
Mỗi lần dùng đều ghi vào nhật ký Báo lỗi ("đã dùng công cụ test: …") để khi đọc báo cáo biết dữ liệu đã bị chỉnh.

Cách test an toàn: tạo hồ sơ Anki riêng (File → Switch Profile → Add) và KHÔNG đăng nhập AnkiWeb ở hồ sơ đó; hoặc bấm
Sao lưu ví trước, Khôi phục ví sau và tắt đồng bộ trong lúc test (xu, nhà, đồ lưu trong collection, đồng bộ qua AnkiWeb).
"""

from __future__ import annotations

import datetime
import json
import os
import shutil
import sys
import time
from typing import Any

from aqt import mw
from aqt.qt import QAction, QFileDialog, QMenu
from aqt.utils import askUser, showInfo, tooltip

HERE = os.path.dirname(os.path.abspath(__file__))
PREFIX = "kotoba_batake"
_fake = {"on": False, "orig": {}}


def kb() -> Any:
    """Module của ことば畑 (thư mục có thể là "kotoba_batake" hoặc số của AnkiWeb)."""
    for name, mod in list(sys.modules.items()):
        if "." in name or mod is None:
            continue
        if hasattr(mod, "STATE") and hasattr(mod, "GardenDialog") and hasattr(mod, "PAPER"):
            return mod
    raise RuntimeError("Không thấy add-on ことば畑 (cài ことば畑 trước).")


def _log(what: str) -> None:
    try:
        m = kb()
        m.ERRORS.add("Công cụ test", "đã dùng công cụ test", what, "", "test " + getattr(m, "VERSION", "?"))
    except Exception:
        pass


def _refresh() -> None:
    m = kb()
    if m._dialog is not None:
        try:
            m._dialog.refresh()
        except Exception:
            pass


def _keys() -> dict[str, Any]:
    col = mw.col
    try:
        conf = col.all_config()
    except Exception:
        conf = {}
    return {k: v for k, v in conf.items() if isinstance(k, str) and k.startswith(PREFIX)}


# ---------------------------------------------------------------------------
# Sao lưu / khôi phục
# ---------------------------------------------------------------------------

def backup() -> None:
    if not mw.col:
        return
    folder = os.path.join(HERE, "user_files")
    os.makedirs(folder, exist_ok=True)
    default = os.path.join(folder, "vi_%s_%s.json" % (mw.pm.name, datetime.datetime.now().strftime("%Y%m%d_%H%M%S")))
    path, _f = QFileDialog.getSaveFileName(mw, "Sao lưu ví ことば畑", default, "JSON (*.json)")
    if not path:
        return
    data = {"phien_ban": 1, "luc": datetime.datetime.now().isoformat(timespec="seconds"), "ho_so": mw.pm.name,
            "khoa": _keys()}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    _log("sao lưu ví (%d khoá) → %s" % (len(data["khoa"]), os.path.basename(path)))
    tooltip("Đã sao lưu %d khoá của ことば畑." % len(data["khoa"]))


def restore() -> None:
    if not mw.col:
        return
    path, _f = QFileDialog.getOpenFileName(mw, "Khôi phục ví ことば畑", os.path.join(HERE, "user_files"), "JSON (*.json)")
    if not path:
        return
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        keys = data["khoa"]
        assert isinstance(keys, dict) and all(k.startswith(PREFIX) for k in keys)
    except Exception:
        showInfo("File này không phải bản sao lưu của Công cụ test.")
        return
    if not askUser("Khôi phục ví về đúng như lúc sao lưu (%s, hồ sơ %s)?\nMọi thay đổi sau đó của ことば畑 sẽ mất."
                   % (data.get("luc", "?"), data.get("ho_so", "?"))):
        return
    col = mw.col
    for k in list(_keys()):
        if k not in keys:
            try:
                col.remove_config(k)
            except Exception:
                pass
    for k, v in keys.items():
        col.set_config(k, v)
    _log("khôi phục ví từ %s (%d khoá)" % (os.path.basename(path), len(keys)))
    _refresh()
    tooltip("Đã khôi phục ví.")


# ---------------------------------------------------------------------------
# Xu, nhà, vùng, giao diện mùa
# ---------------------------------------------------------------------------

def add_coins(n: int) -> None:
    m = kb()
    d = m.STATE.load()
    d["coins"] = max(0, int(d["coins"]) + n) if n else 0
    m.STATE.save(d)
    _log("%s xu → ví %d" % ("+%d" % n if n else "đưa về 0", d["coins"]))
    _refresh()
    tooltip("Ví: %d xu" % d["coins"])


def build_house() -> None:
    m = kb()
    d = m.STATE.load()
    d["home"]["house"] = len(m.core.HOUSE_LEVELS) - 1
    m.STATE.save(d)
    _log("xây xong nhà")
    _refresh()


def open_zones() -> None:
    m = kb()
    d = m.STATE.load()
    for z in m.core.ZONE_IDS:
        if z not in d["home"]["zones"]:
            d["home"]["zones"].append(z)
    m.STATE.save(d)
    _log("mở hết vùng")
    _refresh()


def open_seasons() -> None:
    m = kb()
    d = m.STATE.load()
    d["season"]["unlocked"] = list(m.core.season.THEME_IDS)
    m.STATE.save(d)
    _log("mở hết giao diện mùa")
    _refresh()


# ---------------------------------------------------------------------------
# Báo
# ---------------------------------------------------------------------------

def delete_today() -> None:
    m = kb()
    day = m.ai_today()
    n = 0
    for base in (m.AI_DIR, m.AI_DIR_EN):
        folder = os.path.join(base, "bao", day)
        if os.path.isdir(folder):
            shutil.rmtree(folder, ignore_errors=True)
            n += 1
        st = m.ai.load_status(base) if os.path.isdir(base) else None
        if st is not None:
            st.update(tries=0, audio_tries=0, last_try=0, error="")
            m.ai.save_status(base, st)
    m._libraries.clear()
    _log("xoá số báo Gemini hôm nay (%d báo)" % n)
    _refresh()
    tooltip("Đã xoá %d số báo của hôm nay." % n)


def hide_claude(hide: bool) -> None:
    m = kb()
    cfg = m.config()
    path = m.paper.resolve_dir(cfg.get("bao_dir")) if hide else None
    raw = str(cfg.get("bao_dir") or "").strip()
    if not raw:
        showInfo("Chưa đặt bao_dir (thư mục kotoba_daily).")
        return
    real = os.path.abspath(os.path.expanduser(raw))
    hidden = real.rstrip("/\\") + ".kbtest_an"
    if hide and path and not os.path.exists(hidden):
        os.rename(path, hidden)
        _log("giả lập thư mục kotoba_daily mất")
    elif not hide and os.path.isdir(hidden) and not os.path.exists(real):
        os.rename(hidden, real)
        _log("giả lập thư mục kotoba_daily có lại")
    m._libraries.clear()
    _refresh()


def toggle_fake() -> None:
    """Gemini giả: Thử khoá luôn đúng, viết báo = chép số báo mẫu (không gọi mạng, không tốn lượt)."""
    m = kb()
    ai = m.ai
    if _fake["on"]:
        for name, fn in _fake["orig"].items():
            setattr(ai, name, fn)
        _fake.update(on=False, orig={})
        _log("tắt Gemini giả")
        tooltip("Đã tắt Gemini giả.")
        return
    _fake["orig"] = {"Job": ai.Job, "test_key": ai.test_key, "make_audio": ai.make_audio}

    class FakeJob:
        def __init__(self, client: Any, base: str, date: str, scope: Any, opts: Any, progress: Any = None) -> None:
            self.base, self.date, self.en = base, date, (scope or {}).get("lang") == "en"
            self.progress = progress or (lambda msg: None)

        def run(self) -> dict[str, Any]:
            self.progress("Gemini giả đang viết…")
            time.sleep(1.5)
            src = os.path.join(HERE, "bao_mau_en.json" if self.en else "bao_mau.json")
            with open(src, encoding="utf-8") as f:
                raw = json.load(f)
            raw["ngay"] = self.date
            so, _ky = ai.numbering(self.base, self.date)
            raw["so"] = so
            raw["may_viet"] = "Gemini (giả)"
            ai._write_json(ai.issue_path(self.base, self.date), raw)
            return {"ok": True, "so": so, "date": self.date, "model": "gia", "calls": 0}

    ai.Job = FakeJob
    ai.test_key = lambda client, prefer="": {"model": "gia", "models": ["gia"], "tts": False}
    ai.make_audio = lambda *a, **k: {"made": 0}
    _fake["on"] = True
    _log("bật Gemini giả")
    tooltip("Đã bật Gemini giả: viết báo không tốn lượt thật (tắt khi khởi động lại Anki).")


# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------

def _menu() -> None:
    menu = QMenu("ことば畑 · Công cụ test", mw)
    items = [
        ("Sao lưu ví…", backup), ("Khôi phục ví…", restore), None,
        ("+1.000 xu", lambda: add_coins(1000)), ("+100.000 xu", lambda: add_coins(100000)),
        ("+1.000.000 xu", lambda: add_coins(1000000)),
        ("Đưa ví về 0 xu", lambda: askUser("Đưa ví về 0 xu?") and add_coins(0)), None,
        ("Xây xong nhà", build_house), ("Mở hết vùng", open_zones), ("Mở hết giao diện mùa", open_seasons), None,
        ("Xoá số báo Gemini hôm nay", delete_today),
        ("Giả lập thư mục kotoba_daily mất", lambda: hide_claude(True)),
        ("Giả lập thư mục kotoba_daily có lại", lambda: hide_claude(False)),
        ("Bật / tắt Gemini giả (không tốn lượt)", toggle_fake),
    ]
    for it in items:
        if it is None:
            menu.addSeparator()
            continue
        act = QAction(it[0], mw)

        def run(_checked: bool = False, fn: Any = it[1]) -> None:
            try:
                fn()
            except Exception as err:      # công cụ test: báo thẳng lỗi
                showInfo("Công cụ test: %s" % err)
        act.triggered.connect(run)
        menu.addAction(act)
    mw.form.menuTools.addMenu(menu)


_menu()
