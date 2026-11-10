"""ことば畑 1.20 — 花暦 · Lịch hoa, nhật ký một dòng + sticker tâm trạng, luyện viết, cuốn nhật ký.

- Số liệu ôn KHÔNG lưu thêm: đếm thẳng revlog theo ngày của Anki (type < 4, như daily_stats / bù xu điện thoại),
  nên có cả ngày trước khi cài và lượt ôn trên điện thoại. "Lên Ra quả" theo ngày chỉ GẦN ĐÚNG: lượt ôn có
  ivl ≥ mốc Ra quả (mặc định 90 ngày) mà lastIvl < mốc (revlog không lưu độ bền FSRS của từng lượt).
- Nhật ký + luyện viết: khoá collection THEO THÁNG `kotoba_batake_journal_<yyyy>_<mm>` (đồng bộ AnkiWeb; khoá nhỏ
  để hai máy viết khác tháng không đè nhau) = {"<yyyy-mm-dd>": {"m": sticker, "t": nhật ký, "w": bài luyện viết,
  "u": thời điểm Gemini sửa}}. Làm sạch khi đọc, giữ khoá lạ của bản sau khi ghi. Bản ≤ 1.19.1 không đụng.
- Luyện viết: tối đa 60 ký tự (tiếng Nhật) / 30 từ (tiếng Anh), Gemini sửa 1 lần mỗi ngày (câu đã sửa · lỗi ·
  nhận xét), máy kiểm tra + cắt đầu ra theo giới hạn (không gọi lại). Nhật ký KHÔNG BAO GIỜ gửi cho Gemini.
- Không có xu cho nhật ký / luyện viết (người dùng chốt 04/11/2026).

File này không import aqt (test được bằng python thường).
"""

from __future__ import annotations

import base64
import datetime as _dt
import difflib
import json
import math
import os
import re
import time
from typing import Any, Callable

try:
    from . import season_core as season
    from . import text_core as text
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import season_core as season  # type: ignore[no-redef]
    import text_core as text  # type: ignore[no-redef]


def _ai() -> Any:
    try:
        from . import ai_core as ai
    except ImportError:
        import ai_core as ai  # type: ignore[no-redef]
    return ai


def _ai_en() -> Any:
    try:
        from . import ai_en
    except ImportError:
        import ai_en  # type: ignore[no-redef]
    return ai_en


JOURNAL_PREFIX = "kotoba_batake_journal_"
STICKERS = ("vui", "hao_hung", "thu_thai", "binh_thuong", "met", "buon", "ban", "om")
STICKER_NAMES = {"vui": "Vui", "hao_hung": "Hào hứng", "thu_thai": "Thư thái", "binh_thuong": "Bình thường",
                 "met": "Mệt", "buon": "Buồn", "ban": "Bận", "om": "Ốm"}
DIARY_MAX = 200
WRITE_LANGS = ("ja", "en")
WRITE_MAX = {"ja": 60, "en": 30}
WRITE_UNIT = {"ja": "ký tự", "en": "từ"}
FIX_LIMIT = {"ja": 72, "en": 36}           # câu đã sửa: ≤ bài gốc + 20%
ERR_PART = {"ja": 15, "en": 5}             # "chỗ sai → sửa" của một lỗi: chỉ trích đúng chỗ sai
WHY_MAX = 60                               # giải thích một lỗi: 1 câu
MORE_MAX = 60                              # "còn lại": khi có hơn 3 lỗi
NOTE_MAX = 100                             # nhận xét: tối đa 2 câu
RULE_MAX = 30                              # quy tắc ngắn (gom "Lỗi hay gặp" trong cuốn nhật ký)
MAX_ERRORS = 3
LOAI = ("ngữ pháp", "dạng chia", "từ", "trợ từ", "chính tả", "tự nhiên hơn")
FIX_STALE = 600                            # cờ "đang sửa" cũ hơn 10 phút (tắt Anki giữa chừng) → coi như chưa sửa
QUEUE_DAYS = 3                             # bài "chờ lượt" quá 3 ngày thì thôi tự gửi lại
PHOTO_EVERY = 7 * 86400                    # ảnh vườn tự chụp: mỗi tuần một tấm
PHOTO_MAX_BYTES = 400_000
WEEKDAYS = ("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật")
WD_SHORT = ("T2", "T3", "T4", "T5", "T6", "T7", "CN")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^(\d{4})-(\d{2})$")
FUTURE_MONTHS = 12

# Giao diện mùa → loài hoa trong ô lịch (loài ở web/seeds.js; "goc" = cây gốc của vườn)
SPECIES = {"tet": "mai", "spring": "sakura", "hanami": "sakura", "tsuyu": "ajisai", "tanabata": "take",
           "summer": "himawari", "natsumatsuri": "himawari", "autumn": "kiku", "tsukimi": "ine",
           "halloween": "kabocha", "momiji": "momiji", "noel": "poinsettia", "winter": "bonsai", "shogatsu": "bonsai"}


class JournalError(Exception):
    """Lỗi hiện cho người dùng (câu tiếng Việt)."""


# ---------------------------------------------------------------------------
# Ngày
# ---------------------------------------------------------------------------


def parse_date(s: Any) -> _dt.date | None:
    if not isinstance(s, str) or not DATE_RE.match(s):
        return None
    try:
        return _dt.date.fromisoformat(s)
    except ValueError:
        return None


def parse_month(s: Any) -> tuple[int, int] | None:
    m = MONTH_RE.match(s) if isinstance(s, str) else None
    if not m:
        return None
    y, mo = int(m.group(1)), int(m.group(2))
    return (y, mo) if 1970 <= y <= 2200 and 1 <= mo <= 12 else None


def month_key(y: int, m: int) -> str:
    return "%s%04d_%02d" % (JOURNAL_PREFIX, y, m)


def month_days(y: int, m: int) -> int:
    nxt = _dt.date(y + (m == 12), m % 12 + 1, 1)
    return (nxt - _dt.date(y, m, 1)).days


def add_months(y: int, m: int, k: int) -> tuple[int, int]:
    i = y * 12 + (m - 1) + k
    return i // 12, i % 12 + 1


def ddmm(d: _dt.date) -> str:
    return "%d/%d" % (d.day, d.month)


def anki_today(col: Any) -> _dt.date:
    """Ngày (lịch) của ngày Anki hiện tại: lúc 2 giờ sáng mà giờ qua ngày là 4 giờ thì vẫn là hôm qua."""
    cutoff = int(col.sched.day_cutoff)
    return _dt.datetime.fromtimestamp(cutoff - 86400).date()


# ---------------------------------------------------------------------------
# Đếm revlog theo ngày (một truy vấn gộp cho cả khoảng)
# ---------------------------------------------------------------------------


def revlog_days(col: Any, start: _dt.date, end: _dt.date, fruit_ivl: int = 90) -> dict[str, dict[str, int]]:
    """{ "yyyy-mm-dd": {"n": lượt ôn, "new": thẻ mới, "fruit": thẻ lên Ra quả (gần đúng)} } cho start ≤ ngày ≤ end.

    Theo ngày của Anki (giờ qua ngày của Anki), bỏ lượt "đổi lịch tay" (type ≥ 4). Thẻ mới = thẻ có lượt type 0
    trong ngày. Lên Ra quả = lượt có ivl ≥ mốc mà lastIvl < mốc (revlog không lưu độ bền FSRS từng lượt)."""
    cutoff = int(col.sched.day_cutoff)
    day0 = cutoff - 86400
    today = anki_today(col)
    lo = day0 + (start - today).days * 86400
    hi = day0 + (end - today).days * 86400 + 86400
    rows = col.db.all(
        "select cast((id / 1000.0 - ?) / 86400.0 + 100000 as int) - 100000 as rel, count(), "
        "count(distinct case when type = 0 then cid end), "
        "count(distinct case when ivl >= ? and lastIvl < ? and type in (1, 2, 3) then cid end) "
        "from revlog where id >= ? and id < ? and type < 4 group by rel",
        day0, int(fruit_ivl), int(fruit_ivl), lo * 1000, hi * 1000)
    out: dict[str, dict[str, int]] = {}
    for rel, n, new, fruit in rows:
        d = today + _dt.timedelta(days=int(rel))
        if d < start or d > end:
            continue
        out[d.isoformat()] = {"n": int(n or 0), "new": int(new or 0), "fruit": int(fruit or 0)}
    return out


def fruit_cards(col: Any, day: _dt.date, fruit_ivl: int = 90) -> list[int]:
    """Thẻ lên Ra quả (gần đúng) trong một ngày: id thẻ theo thứ tự lượt ôn."""
    cutoff = int(col.sched.day_cutoff)
    day0 = cutoff - 86400
    lo = day0 + (day - anki_today(col)).days * 86400
    rows = col.db.list(
        "select cid from revlog where id >= ? and id < ? and type in (1, 2, 3) and ivl >= ? and lastIvl < ? order by id",
        lo * 1000, (lo + 86400) * 1000, int(fruit_ivl), int(fruit_ivl))
    return list(dict.fromkeys(int(x) for x in rows))


def first_review_day(col: Any) -> _dt.date | None:
    v = col.db.scalar("select min(id) from revlog where type < 4")
    if not v:
        return None
    cutoff = int(col.sched.day_cutoff)
    rel = math.floor((int(v) / 1000.0 - (cutoff - 86400)) / 86400.0)
    return anki_today(col) + _dt.timedelta(days=rel)


def level(n: int, goal: int) -> int:
    """Mức cây theo mục tiêu ngày: 0 lượt → đất; < 1/3 → mầm; < 2/3 → cây non; < mục tiêu → ra nụ; đạt → nở rộ."""
    goal = goal if isinstance(goal, int) and goal > 0 else 30
    if n <= 0:
        return 0
    if n * 3 < goal:
        return 1
    if n * 3 < goal * 2:
        return 2
    if n < goal:
        return 3
    return 4


def streaks(days: set[str], today: _dt.date) -> tuple[int, int]:
    """(chuỗi hiện tại, chuỗi dài nhất) trong tập ngày có ôn. Hôm nay chưa ôn thì chuỗi tính tới hôm qua."""
    cur = 0
    d = today if today.isoformat() in days else today - _dt.timedelta(days=1)
    while d.isoformat() in days:
        cur += 1
        d -= _dt.timedelta(days=1)
    best = run = 0
    prev: _dt.date | None = None
    for s in sorted(days):
        x = _dt.date.fromisoformat(s)
        run = run + 1 if prev is not None and (x - prev).days == 1 else 1
        best = max(best, run)
        prev = x
    return cur, best


# ---------------------------------------------------------------------------
# Giao diện mùa theo ngày (theo lịch, kể cả giao diện chưa mở khoá)
# ---------------------------------------------------------------------------


def theme_spans(y0: int, y1: int) -> list[tuple[str, _dt.date, _dt.date]]:
    """Mọi lần diễn ra của 14 giao diện mùa bắt đầu trong các năm y0 − 1 … y1, theo thứ tự ưu tiên."""
    out: list[tuple[str, _dt.date, _dt.date]] = []
    for t in season.THEMES:
        for y in range(y0 - 1, y1 + 1):
            try:
                s, e = season.occurrence(t, y)
            except (ValueError, OverflowError):
                continue
            out.append((t["id"], s, e))
    return out


def theme_on(d: _dt.date, spans: list[tuple[str, _dt.date, _dt.date]]) -> str | None:
    for tid, s, e in spans:          # spans theo thứ tự ưu tiên → lần đầu khớp là giao diện của ngày đó
        if s <= d <= e:
            return tid
    return None


SHORT_NAME = {"tet": "Tết", "noel": "Giáng sinh", "shogatsu": "お正月", "tsukimi": "Trung thu", "halloween": "Halloween",
              "momiji": "Mùa lá đỏ", "tanabata": "Thất Tịch", "natsumatsuri": "Lễ hội mùa hè", "tsuyu": "Mùa mưa",
              "hanami": "Hoa anh đào", "spring": "Mùa xuân", "summer": "Mùa hè", "autumn": "Mùa thu", "winter": "Mùa đông"}


def theme_name(tid: str | None, short: bool = False) -> str:
    t = season.THEME_BY_ID.get(tid or "")
    if not t:
        return ""
    return SHORT_NAME.get(t["id"], t["name"]) if short else t["name"]


def month_bands(y: int, m: int, spans: list[tuple[str, _dt.date, _dt.date]]) -> list[dict[str, Any]]:
    """Dải tên mùa / lễ của tháng: giao diện thắng ít nhất một ngày trong tháng, kèm khoảng ngày của lần đó."""
    first, n = _dt.date(y, m, 1), month_days(y, m)
    wins: dict[str, list[_dt.date]] = {}
    for i in range(n):
        d = first + _dt.timedelta(days=i)
        tid = theme_on(d, spans)
        if tid:
            wins.setdefault(tid, []).append(d)
    order = [t["id"] for t in season.THEMES]
    out = []
    for tid in sorted(wins, key=lambda x: min(wins[x])):
        d0 = wins[tid][0]
        s, e = next((s, e) for t2, s, e in spans if t2 == tid and s <= d0 <= e)
        over = [o for o in wins if o != tid and order.index(o) > order.index(tid)
                and any(s2 <= e and e2 >= s for t2, s2, e2 in spans if t2 == o)]
        t = season.THEME_BY_ID[tid]
        out.append({"id": tid, "name": t["name"], "start": ddmm(s), "end": ddmm(e) + ("/%d" % e.year if e.year != y else ""),
                    "lunar": t["when"][0] == "lunar", "over": [theme_name(o, True) for o in over]})
    return out


def upcoming(after: _dt.date, spans: list[tuple[str, _dt.date, _dt.date]], n: int = 2) -> list[dict[str, Any]]:
    """Lễ (không tính 4 mùa) sắp bắt đầu sau `after`."""
    rows = sorted((s, e, tid) for tid, s, e in spans
                  if s > after and season.THEME_BY_ID[tid]["kind"] == "event")
    out = []
    for s, e, tid in rows:
        if any(x["id"] == tid for x in out):
            continue
        t = season.THEME_BY_ID[tid]
        out.append({"id": tid, "name": theme_name(tid, True), "start": ddmm(s), "end": ddmm(e) + "/%d" % e.year,
                    "single": s == e, "lunar": t["when"][0] == "lunar"})
        if len(out) >= n:
            break
    return out


# ---------------------------------------------------------------------------
# Làm sạch dữ liệu (dữ liệu từ collection: có thể do bản khác / máy khác ghi)
# ---------------------------------------------------------------------------

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f​-‏  ﻿]")


def clean_line(s: Any, limit: int) -> str:
    """Chữ một đoạn: bỏ ký tự điều khiển, xuống dòng → dấu cách, gộp khoảng trắng, cắt theo độ dài."""
    if not isinstance(s, str):
        return ""
    s = _CTRL.sub("", s.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " "))
    s = re.sub(r"\s*\n\s*", " ", s)
    s = re.sub(r" {2,}", " ", s).strip()
    return s[:limit]


_EN_WORD = re.compile(r"[A-Za-z0-9À-ɏ]+(?:['’\-][A-Za-z0-9À-ɏ]+)*")


def count_units(s: str, lang: str) -> int:
    """Độ dài bài luyện viết: tiếng Nhật đếm ký tự (không tính khoảng trắng), tiếng Anh đếm từ."""
    if lang == "en":
        return len(_EN_WORD.findall(s or ""))
    return len(re.sub(r"\s", "", s or ""))


def clip_units(s: str, lang: str, limit: int) -> tuple[str, bool]:
    """Cắt bài ở đơn vị thứ `limit` (tiếng Anh: hết từ thứ 30; tiếng Nhật: ký tự thứ 60, không tính khoảng trắng)."""
    if count_units(s, lang) <= limit:
        return s, False
    if lang == "en":
        ms = list(_EN_WORD.finditer(s))
        end = ms[limit - 1].end()
        # giữ dấu câu dính ngay sau từ cuối (vd. "happy." )
        m2 = re.match(r"[.,!?;:…\"'”’)]*", s[end:])
        end += len(m2.group(0)) if m2 else 0
        return s[:end].rstrip(), True
    n, out = 0, []
    for ch in s:
        if not ch.isspace():
            if n >= limit:
                break
            n += 1
        out.append(ch)
    return "".join(out).rstrip(), True


def _clean_err(raw: Any) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    out = {"goc": clean_line(raw.get("goc"), 80), "sua": clean_line(raw.get("sua"), 80),
           "loai": raw.get("loai") if raw.get("loai") in LOAI else "ngữ pháp",
           "quy_tac": clean_line(raw.get("quy_tac"), RULE_MAX + 10), "giai_thich": clean_line(raw.get("giai_thich"), 160)}
    return out if out["goc"] or out["sua"] else None


WRITE_STATES = ("", "wait", "queue", "done")


def clean_writing(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    lang = raw.get("lang") if raw.get("lang") in WRITE_LANGS else "ja"
    goc = clean_line(raw.get("goc"), 400)
    goc, _ = clip_units(goc, lang, WRITE_MAX[lang])
    st = raw.get("st") if raw.get("st") in WRITE_STATES else ""
    w: dict[str, Any] = {"lang": lang, "goc": goc, "st": st}
    hints = raw.get("goi_y")
    if isinstance(hints, list):
        w["goi_y"] = [clean_line(x, 40) for x in hints if isinstance(x, str) and clean_line(x, 40)][:2]
    if isinstance(raw.get("gr"), int) and 0 <= raw["gr"] < 10000:
        w["gr"] = raw["gr"]
    for k in ("sent", "retry_at"):
        if isinstance(raw.get(k), (int, float)) and raw[k] > 0:
            w[k] = float(raw[k])
    if st == "done":
        w["sua"] = clean_line(raw.get("sua"), 400)
        w["loi"] = [e for e in (_clean_err(x) for x in (raw.get("loi") if isinstance(raw.get("loi"), list) else [])[:MAX_ERRORS]) if e]
        for k, lim in (("con_lai", MORE_MAX + 20), ("tu_nhien", 400), ("nhan_xet", NOTE_MAX + 40), ("model", 80)):
            w[k] = clean_line(raw.get(k), lim)
        w["seen"] = bool(raw.get("seen"))
    if st in ("", "queue") and clean_line(raw.get("err"), 160):
        w["err"] = clean_line(raw.get("err"), 160)
    if raw.get("rq"):
        w["rq"] = 1
    if not goc and st != "done":
        return None if not w.get("goi_y") else w
    return w


def clean_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    out: dict[str, Any] = {}
    if raw.get("m") in STICKERS:
        out["m"] = raw["m"]
    t = clean_line(raw.get("t"), DIARY_MAX)
    if t:
        out["t"] = t
    w = clean_writing(raw.get("w"))
    if w:
        out["w"] = w
    if isinstance(raw.get("u"), (int, float)) and raw["u"] > 0:
        out["u"] = float(raw["u"])
    return out or None


def clean_month(raw: Any, y: int, m: int) -> dict[str, dict[str, Any]]:
    """Ngày → mục đã làm sạch. Chỉ nhận ngày thuộc đúng tháng của khoá; bỏ mục rỗng / hỏng."""
    out: dict[str, dict[str, Any]] = {}
    if not isinstance(raw, dict):
        return out
    pre = "%04d-%02d-" % (y, m)
    for k, v in raw.items():
        if isinstance(k, str) and k.startswith(pre) and parse_date(k):
            e = clean_entry(v)
            if e:
                out[k] = e
    return out


# ---------------------------------------------------------------------------
# Lưu trữ: khoá collection theo tháng + sao lưu user_files/journal/<yyyy_mm>.json
# ---------------------------------------------------------------------------


class JournalStore:
    def __init__(self, folder: str, col_getter: Callable[[], Any] | None = None) -> None:
        self.folder = folder
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def _backup_path(self, y: int, m: int) -> str:
        return os.path.join(self.folder, "%04d_%02d.json" % (y, m))

    def _raw(self, y: int, m: int) -> dict[str, Any]:
        col = self._col()
        if col is not None:
            try:
                raw = col.get_config(month_key(y, m), None)
            except Exception:
                raw = None
            return dict(raw) if isinstance(raw, dict) else {}
        try:       # không có collection (test / chưa mở hồ sơ): đọc bản sao lưu
            with open(self._backup_path(y, m), encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            raw = None
        return dict(raw) if isinstance(raw, dict) else {}

    def month(self, y: int, m: int) -> dict[str, dict[str, Any]]:
        return clean_month(self._raw(y, m), y, m)

    def entry(self, d: _dt.date) -> dict[str, Any]:
        return self.month(d.year, d.month).get(d.isoformat(), {})

    def months(self, ym: list[tuple[int, int]]) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for y, m in ym:
            out.update(self.month(y, m))
        return out

    def update(self, d: _dt.date, changes: dict[str, Any]) -> dict[str, Any]:
        """Ghi các mục đã đổi của một ngày (đã làm sạch). Giữ nguyên khoá lạ của bản sau (ở mức tháng và mức ngày).
        changes: {"m": …, "t": …, "w": dict | None, "u": …}; giá trị rỗng / None = xoá mục đó."""
        y, m = d.year, d.month
        raw = self._raw(y, m)
        key = d.isoformat()
        cur = dict(raw.get(key)) if isinstance(raw.get(key), dict) else {}
        for k, v in changes.items():
            if v in (None, "", {}, []):
                cur.pop(k, None)
            else:
                cur[k] = v
        if cur:
            raw[key] = cur
        else:
            raw.pop(key, None)
        col = self._col()
        if col is not None:
            col.set_config(month_key(y, m), raw)
        self._backup(y, m, raw)
        return clean_entry(cur) or {}

    def _backup(self, y: int, m: int, raw: dict[str, Any]) -> None:
        try:
            os.makedirs(self.folder, exist_ok=True)
            tmp = self._backup_path(y, m) + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False)
            os.replace(tmp, self._backup_path(y, m))
        except OSError:
            pass

    def all_keys(self) -> list[tuple[int, int]]:
        """Các tháng có khoá nhật ký trong collection (để kệ sách biết tháng nào có viết)."""
        col = self._col()
        out: list[tuple[int, int]] = []
        try:
            names = list(col.all_config().keys()) if col is not None and hasattr(col, "all_config") else []
        except Exception:
            names = []
        for k in names:
            mt = re.match(r"^%s(\d{4})_(\d{2})$" % re.escape(JOURNAL_PREFIX), str(k))
            if mt:
                out.append((int(mt.group(1)), int(mt.group(2))))
        return sorted(out)


# ---------------------------------------------------------------------------
# Lịch tháng / năm (dữ liệu gửi sang trang; JS chỉ vẽ)
# ---------------------------------------------------------------------------


def _day_info(ds: str, counts: dict[str, dict[str, int]], entries: dict[str, dict[str, Any]], goal: int,
              spans: list[tuple[str, _dt.date, _dt.date]], today: _dt.date, plain: bool) -> dict[str, Any]:
    d = _dt.date.fromisoformat(ds)
    c = counts.get(ds, {})
    e = entries.get(ds, {})
    th = theme_on(d, spans)
    w = e.get("w") or {}
    return {"d": ds, "day": d.day, "n": c.get("n", 0), "lv": level(c.get("n", 0), goal), "th": th or "",
            "sp": "goc" if plain or not th else SPECIES.get(th, "goc"), "mood": e.get("m", ""),
            "note": bool(e.get("t") or w.get("goc")), "fut": d > today}


def month_view(y: int, m: int, today: _dt.date, counts: dict[str, dict[str, int]], entries: dict[str, dict[str, Any]],
               goal: int, first: _dt.date | None, plain: bool = False, streak: int = 0) -> dict[str, Any]:
    spans = theme_spans(y, y + 1)
    n = month_days(y, m)
    days = [_day_info(_dt.date(y, m, i + 1).isoformat(), counts, entries, goal, spans, today, plain) for i in range(n)]
    lo = first if first and first < today else today
    for ds in entries:           # nhật ký viết cho ngày trước lần ôn đầu tiên vẫn xem được
        d = parse_date(ds)
        if d and d < lo:
            lo = d
    py, pm = add_months(y, m, -1)
    ny, nm = add_months(y, m, 1)
    my, mm = add_months(today.year, today.month, FUTURE_MONTHS)
    last = _dt.date(y, m, n)
    return {
        "kind": "month", "y": y, "m": m, "id": "%04d-%02d" % (y, m), "today": today.isoformat(),
        "first_wd": _dt.date(y, m, 1).weekday(), "goal": goal if goal > 0 else 30,
        "prev": "%04d-%02d" % (py, pm) if (py, pm) >= (lo.year, lo.month) else "",
        "next": "%04d-%02d" % (ny, nm) if (ny, nm) <= (my, mm) else "",
        "bands": month_bands(y, m, spans), "soon": upcoming(last, theme_spans(y, y + 2)),
        "days": days, "reviewed": sum(1 for x in days if x["n"] > 0), "streak": streak,
        "plain": plain,
    }


def year_view(y: int, today: _dt.date, counts: dict[str, dict[str, int]], entries: dict[str, dict[str, Any]],
              goal: int, first: _dt.date | None, streak: int = 0) -> dict[str, Any]:
    spans = theme_spans(y, y)
    months = []
    for m in range(1, 13):
        n = month_days(y, m)
        days, strip = [], []
        last = None
        for i in range(n):
            d = _dt.date(y, m, i + 1)
            ds = d.isoformat()
            c = counts.get(ds, {}).get("n", 0)
            days.append(-1 if d > today else level(c, goal))
            th = theme_on(d, spans) or ""
            if strip and last == th:
                strip[-1][1] += 1
            else:
                strip.append([th, 1])
            last = th
        months.append({"m": m, "first_wd": _dt.date(y, m, 1).weekday(), "days": days, "strip": strip,
                       "reviewed": sum(1 for i in range(n) if counts.get(_dt.date(y, m, i + 1).isoformat(), {}).get("n", 0) > 0),
                       "fut": _dt.date(y, m, 1) > today, "now": (y, m) == (today.year, today.month)})
    ys = [k for k in counts if k.startswith("%04d-" % y)]
    moods: dict[str, int] = {}
    for ds, e in entries.items():
        if ds.startswith("%04d-" % y) and e.get("m"):
            moods[e["m"]] = moods.get(e["m"], 0) + 1
    top = max(moods.items(), key=lambda kv: (kv[1], -STICKERS.index(kv[0]))) if moods else None
    _cur, best = streaks({k for k in ys if counts[k]["n"] > 0}, today)
    lo = first.year if first else today.year
    for ds in entries:
        d = parse_date(ds)
        if d and d.year < lo:
            lo = d.year
    return {
        "kind": "year", "y": y, "today": today.isoformat(), "goal": goal if goal > 0 else 30,
        "prev": str(y - 1) if y - 1 >= lo else "", "next": str(y + 1) if y + 1 <= today.year + 1 else "",
        "months": months,
        "sum": {"days": sum(1 for k in ys if counts[k]["n"] > 0), "reviews": sum(counts[k]["n"] for k in ys),
                "fruit": sum(counts[k]["fruit"] for k in ys),
                "notes": sum(1 for ds, e in entries.items() if ds.startswith("%04d-" % y) and (e.get("t") or e.get("m"))),
                "mood": [top[0], top[1]] if top else None, "best": best},
        "streak": streak,
        "legend": [t["id"] for t in season.THEMES if t["kind"] == "event"],
    }


# ---------------------------------------------------------------------------
# Luyện viết: gợi ý, đếm từ đã dùng, đánh dấu chỗ sửa / từ đã học
# ---------------------------------------------------------------------------

_JP = re.compile(r"[ぁ-ヿ㐀-鿿]")
_KANJI = re.compile(r"[㐀-鿿々]")
_HIRA = re.compile(r"[ぁ-ゟ]")
_GODAN_END = set("うくぐすつぬぶむるい")


def jp_forms(word: str) -> list[str]:
    """Các dạng để tìm một từ tiếng Nhật trong bài: chữ gốc, gốc của động từ / tính từ (予約する → 予約, 寒い → 寒)."""
    w = re.sub(r"[〜～~（）()\s]", "", word or "")
    out = [w] if w else []
    if len(w) > 2 and w.endswith("する"):
        out.append(w[:-2])
    elif len(w) >= 2 and w[-1] in _GODAN_END and (_KANJI.search(w[:-1]) or len(w[:-1]) >= 3):
        out.append(w[:-1])
    return [x for x in dict.fromkeys(out) if x]


def jp_find(textv: str, form: str) -> list[tuple[int, int]]:
    """Vị trí của `form` trong bài. Gốc chỉ một chữ Hán (行 của 行く) thì chữ đứng trước không được là chữ Hán
    (tránh 銀行) và chữ sau phải là kana."""
    out = []
    start = 0
    single = len(form) == 1 and _KANJI.match(form)
    while True:
        i = textv.find(form, start)
        if i < 0:
            break
        j = i + len(form)
        ok = True
        if single:
            if i > 0 and _KANJI.match(textv[i - 1]):
                ok = False
            if j >= len(textv) or not _HIRA.match(textv[j]):
                ok = False
        if ok:
            out.append((i, j))
        start = i + 1
    return out


def word_spans(textv: str, words: list[str], lang: str) -> list[tuple[int, int, str]]:
    """Các đoạn (đầu, cuối, từ) trong bài khớp một từ trong danh sách, không chồng nhau, đoạn dài trước."""
    if not textv or not words:
        return []
    if lang == "en":
        en = _ai_en()
        idx = en.LinkIndex({"tu_vung": [[w] for w in words if w]})
        return [(a, b, k) for a, b, k in idx.spans(textv, False)]
    cands: list[tuple[int, int, str]] = []
    for w in words:
        for f in jp_forms(w):
            for a, b in jp_find(textv, f):
                cands.append((a, b, w))
    cands.sort(key=lambda x: (-(x[1] - x[0]), x[0]))
    taken: list[tuple[int, int, str]] = []
    for a, b, w in cands:
        if all(b <= x[0] or a >= x[1] for x in taken):
            taken.append((a, b, w))
    return sorted(taken)


def used_hints(textv: str, hints: list[str], lang: str) -> list[str]:
    found = {k for _a, _b, k in word_spans(textv, hints, lang)}
    return [h for h in hints if h in found]


def hint_ok(it: dict[str, Any], lang: str) -> bool:
    w = str(it.get("word") or "")
    if not w or w == "?" or it.get("kind", "vocab") != "vocab":
        return False
    if lang == "en":
        return bool(re.match(r"^[A-Za-z][A-Za-z' \-]*$", w)) and len(w.split()) <= 3 and len(w) <= 24
    return bool(_JP.search(w)) and len(w) <= 8 and not re.search(r"[\[\]{}|<>/;,、()（）〜～\s]", w)


def pick_hints(items: list[dict[str, Any]], lang: str, seed: str, n: int = 2) -> list[str]:
    """2 từ phải ôn hôm nay (ngẫu nhiên theo ngày + số lần bấm Đổi gợi ý); thiếu thì lấy từ đã thuộc."""
    import random
    due = [it["word"] for it in items if it.get("due") and hint_ok(it, lang)]
    rest = [it["word"] for it in items if not it.get("due") and hint_ok(it, lang)]
    rng = random.Random(seed)
    pool = list(dict.fromkeys(due))
    rng.shuffle(pool)
    if len(pool) < n:
        extra = [w for w in dict.fromkeys(rest) if w not in pool]
        rng.shuffle(extra)
        pool += extra
    return pool[:n]


def _tokens_en(s: str) -> list[tuple[int, int, str]]:
    return [(m.start(), m.end(), m.group(0)) for m in re.finditer(r"\S+", s)]


def _norm_en(tok: str) -> str:
    return re.sub(r"[^\w'’]", "", tok.lower()).replace("’", "'")


def changed_ranges(goc: str, sua: str, lang: str) -> list[tuple[int, int]]:
    """Chỗ trong câu đã sửa khác với bài gốc (máy so chuỗi: tiếng Nhật theo ký tự, tiếng Anh theo từ)."""
    return diff_marks(goc, sua, lang)[0]


def diff_marks(goc: str, sua: str, lang: str) -> tuple[list[tuple[int, int]], list[tuple[int, str]]]:
    """(chỗ thêm / thay trong câu đã sửa, chỗ bị bỏ: (vị trí trong câu đã sửa, chữ của bài gốc bị bỏ))."""
    if not sua:
        return [], []
    out: list[tuple[int, int]] = []
    dels: list[tuple[int, str]] = []
    if lang == "en":
        a, b = _tokens_en(goc), _tokens_en(sua)
        sm = difflib.SequenceMatcher(None, [_norm_en(t[2]) for t in a], [_norm_en(t[2]) for t in b], autojunk=False)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op in ("replace", "insert") and j2 > j1:
                out.append((b[j1][0], b[j2 - 1][1]))
            elif op == "delete" and i2 > i1:
                pos = b[j1][0] if j1 < len(b) else len(sua)
                dels.append((pos, " ".join(t[2] for t in a[i1:i2]) + (" " if j1 < len(b) else "")))
        return out, dels
    sm = difflib.SequenceMatcher(None, goc, sua, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("replace", "insert") and j2 > j1:
            if out and j1 - out[-1][1] <= 1 and not re.search(r"[、。！？\s]", sua[out[-1][1]:j1]):
                out[-1] = (out[-1][0], j2)          # かった + で + す → một chỗ sửa かったです
            else:
                out.append((j1, j2))
        elif op == "delete" and i2 > i1 and goc[i1:i2].strip():
            dels.append((j1, goc[i1:i2]))
    return out, dels


def segments(sua: str, changed: list[tuple[int, int]], learned: list[tuple[int, int, str]],
             dels: list[tuple[int, str]] | None = None) -> list[list[Any]]:
    """[[chữ, "c" (đã sửa) / "u" (từ đã học) / "cu" / "d" (chữ của bài gốc bị bỏ) / ""], …] — JS vẽ bằng textContent."""
    if not sua:
        return []
    flags = [""] * len(sua)
    for a, b in changed:
        for i in range(max(0, a), min(len(sua), b)):
            flags[i] = "c"
    for a, b, _w in learned:
        for i in range(max(0, a), min(len(sua), b)):
            flags[i] = ("c" if flags[i] == "c" else "") + "u"
    at: dict[int, str] = {}
    for pos, t in dels or []:
        at[pos] = at.get(pos, "") + t
    out: list[list[Any]] = []
    for i, (ch, f) in enumerate(zip(sua, flags)):
        if i in at:
            out.append([at[i], "d"])
        if out and out[-1][1] == f:
            out[-1][0] += ch
        else:
            out.append([ch, f])
    if len(sua) in at:
        out.append([at[len(sua)].rstrip(), "d"])
    return out


# ---------------------------------------------------------------------------
# Gemini sửa bài: lời nhắc, khuôn JSON, máy kiểm tra + cắt đầu ra
# ---------------------------------------------------------------------------

_S = {"type": "STRING"}
FIX_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "sua": _S,
        "loi": {"type": "ARRAY", "maxItems": MAX_ERRORS, "items": {
            "type": "OBJECT",
            "properties": {"goc": _S, "sua": _S, "loai": _S, "quy_tac": _S, "giai_thich": _S},
            "required": ["goc", "sua", "loai", "quy_tac", "giai_thich"]}},
        "con_lai": _S, "tu_nhien": _S, "nhan_xet": _S,
    },
    "required": ["sua", "loi", "con_lai", "tu_nhien", "nhan_xet"],
}
LANG_VI = {"ja": "tiếng Nhật", "en": "tiếng Anh"}


def fix_system(lang: str, level: str) -> str:
    return ("Bạn là giáo viên %s dạy người Việt, trình độ người học: %s. Bạn sửa một bài luyện viết rất ngắn "
            "(một hai câu tự viết). Chỉ sửa lỗi thật, sửa ít nhất có thể, giữ ý và cách nói của người học; "
            "không viết lại thành bài khác. Giải thích và nhận xét bằng tiếng Việt CÓ DẤU đầy đủ (viết \"Tính từ\", "
            "không viết \"Tinh tu\"), ngắn gọn, thân thiện. "
            "Không dùng markdown, không emoji, không đánh dấu furigana. Chỉ trả về JSON đúng khuôn."
            % (LANG_VI.get(lang, "ngoại ngữ"), level))


def fix_prompt(goc: str, lang: str, level: str, hints: list[str]) -> str:
    n = count_units(goc, lang)
    unit = WRITE_UNIT[lang]
    lim = fix_limit(n, lang)
    part = ERR_PART[lang]
    if lang == "en":
        ex = {"sua": "Yesterday it rained, so I booked a table and we ate together.",
              "loi": [{"goc": "it rain", "sua": "it rained", "loai": "dạng chia", "quy_tac": "thì quá khứ",
                       "giai_thich": "Chuyện hôm qua thì chia động từ ở quá khứ."},
                      {"goc": "I book", "sua": "I booked", "loai": "dạng chia", "quy_tac": "thì quá khứ",
                       "giai_thich": "Cùng quy tắc như lỗi trên."}],
              "con_lai": "", "tu_nhien": "", "nhan_xet": "Dùng đúng từ book. Kể chuyện đã qua thì nhớ chia quá khứ."}
    else:
        ex = {"sua": "きのうは寒かったですが、レストランを予約しました。",
              "loi": [{"goc": "寒いでした", "sua": "寒かったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い (〜かった)",
                       "giai_thich": "Tính từ đuôi い: quá khứ là bỏ い + かった(です)."}],
              "con_lai": "", "tu_nhien": "", "nhan_xet": "Dùng đúng 予約する, nối câu bằng が tự nhiên. Nhớ quá khứ của tính từ い."}
    lines = [
        "Trình độ: %s. Ngôn ngữ của bài: %s." % (level, LANG_VI[lang]),
        "Bài của người học (%d %s):" % (n, unit),
        "<<<", goc, ">>>",
    ]
    if hints:
        lines.append("Từ gợi ý người học được nhắc thử dùng: %s (dùng đúng thì khen trong nhận xét)." % ", ".join(hints))
    lines += [
        "",
        "GIỚI HẠN ĐỘ DÀI (máy sẽ cắt phần vượt quá, nên viết ngắn ngay từ đầu):",
        "- sua: câu đã sửa, tối đa %d %s (bài gốc + 20%%). Sửa ít nhất có thể: chỉ thay đúng chỗ sai, không bỏ bớt "
        "chữ / ý nào của người học, không thêm ý mới. Không có lỗi thì chép lại nguyên bài." % (lim, unit),
        "- loi: tối đa %d lỗi, lỗi quan trọng nhất trước. Lỗi nhỏ về dấu câu / khoảng trắng thì bỏ qua." % MAX_ERRORS,
        "  + goc / sua của một lỗi: chỉ trích đúng chỗ sai và chỗ sửa, tối đa %d %s, không chép cả câu. goc phải chép "
        "nguyên văn từ bài gốc." % (part, unit),
        "  + loai: đúng một trong: %s." % ", ".join(LOAI),
        "  + quy_tac: tên quy tắc thật ngắn để gom lỗi hay gặp, tối đa %d ký tự (vd. \"tính từ đuôi い (〜かった)\", "
        "\"trợ từ に / で\", \"thì quá khứ\")." % RULE_MAX,
        "  + giai_thich: 1 câu tiếng Việt, tối đa %d ký tự. Lỗi cùng quy tắc với lỗi trước thì ghi đúng: "
        "\"Cùng quy tắc như lỗi trên.\"" % WHY_MAX,
        "- con_lai: để trống \"\" nếu có không quá %d lỗi; có nhiều hơn thì gộp phần còn lại trong 1 câu, tối đa %d ký tự "
        "(vd. \"Còn 1 lỗi cùng loại: was → were.\")." % (MAX_ERRORS, MORE_MAX),
        "- nhan_xet: tối đa 2 câu, tối đa %d ký tự: một câu khen chỗ làm đúng, một điều nên nhớ." % NOTE_MAX,
        "- tu_nhien: chỉ khi bài KHÔNG có lỗi nào: một cách nói tự nhiên hơn, không dài hơn bài gốc; có lỗi thì để \"\".",
        "",
        "Ví dụ JSON đúng giới hạn (chỉ minh hoạ khuôn, không chép nội dung):",
        json.dumps(ex, ensure_ascii=False),
    ]
    return "\n".join(lines)


def fix_limit(n: int, lang: str) -> int:
    """Độ dài tối đa của câu đã sửa: bài gốc + 20% (ít nhất + 6 ký tự / + 3 từ cho bài rất ngắn), trần 72 / 36."""
    extra = 6 if lang == "ja" else 3
    return max(1, min(FIX_LIMIT[lang], max(int(math.ceil(n * 1.2)), n + extra)))


_VI_MARK = re.compile(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", re.I)
_VI_ONLY = re.compile(r"[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĩũõãơư]", re.I)
_LATIN_WORD = re.compile(r"[A-Za-zÀ-ỹ]{2,}")
_CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")
# dấu hết câu: 。！？ của tiếng Nhật đứng liền chữ sau; . ! ? … cần khoảng trắng / ngoặc / hết chuỗi theo sau
_SENT_END = re.compile(r"[。！？][」』）)]*|[.!?…](?=[\s\"'”’)」』]|$)")


def vi_ok(s: str) -> bool:
    """Phần tiếng Việt phải có dấu (câu ≥ 3 chữ Latin mà không có dấu nào → không dấu)."""
    words = _LATIN_WORD.findall(s or "")
    return len(words) < 3 or bool(_VI_MARK.search(s))


def lang_ok(s: str, lang: str) -> bool:
    """Kiểm tra mức nhẹ: câu đã sửa đúng ngôn ngữ của bài."""
    if not s:
        return False
    if lang == "en":
        return not _CJK.search(s) and not _VI_ONLY.search(s) and len(_EN_WORD.findall(s)) > 0
    jp = len(_JP.findall(s))
    latin = len(re.findall(r"[A-Za-zÀ-ỹ]", s))
    return jp > 0 and latin <= max(3, jp // 3) and not _VI_ONLY.search(s)


def cut_chars(s: str, limit: int, max_sent: int = 0) -> tuple[str, bool]:
    """Cắt chữ (đếm ký tự) ở dấu hết câu gần nhất trong giới hạn, không có thì cắt + "…". max_sent: tối đa số câu."""
    s = s.strip()
    cut = False
    if max_sent:
        ends = [m.end() for m in _SENT_END.finditer(s)]
        if len(ends) > max_sent:
            s, cut = s[:ends[max_sent - 1]].strip(), True
    if len(s) <= limit:
        return s, cut
    ends = [m.end() for m in _SENT_END.finditer(s) if m.end() <= limit]
    if ends:
        return s[:ends[-1]].strip(), True
    return s[:max(1, limit - 1)].rstrip() + "…", True


def cut_units(s: str, lang: str, limit: int) -> tuple[str, bool]:
    """Như cut_chars nhưng đếm theo đơn vị của bài (ký tự / từ)."""
    s = s.strip()
    if count_units(s, lang) <= limit:
        return s, False
    ends = [m.end() for m in _SENT_END.finditer(s)]
    ok = [e for e in ends if count_units(s[:e], lang) <= limit]
    if ok:
        return s[:ok[-1]].strip(), True
    part, _ = clip_units(s, lang, max(1, limit - 1) if lang == "ja" else limit)   # "…" cũng là một ký tự
    return part.rstrip(" ,、") + "…", True


def _norm_find(s: str, lang: str) -> str:
    if lang == "en":
        return re.sub(r"\s+", " ", s.lower().replace("’", "'")).strip()
    return re.sub(r"\s", "", s)


LOAI_ALIAS = {"ngữ pháp": "ngữ pháp", "ngu phap": "ngữ pháp", "grammar": "ngữ pháp", "cấu trúc": "ngữ pháp",
              "dạng chia": "dạng chia", "chia động từ": "dạng chia", "chia": "dạng chia", "thì": "dạng chia",
              "từ": "từ", "từ vựng": "từ", "dùng từ": "từ", "chọn từ": "từ", "vocabulary": "từ",
              "trợ từ": "trợ từ", "particle": "trợ từ", "giới từ": "trợ từ", "mạo từ": "từ",
              "chính tả": "chính tả", "spelling": "chính tả", "chữ": "chính tả", "kanji": "chính tả",
              "tự nhiên hơn": "tự nhiên hơn", "tự nhiên": "tự nhiên hơn", "cách nói": "tự nhiên hơn"}


def norm_loai(v: Any) -> str:
    s = re.sub(r"\s+", " ", str(v or "").strip().lower()).strip(" .:")
    if s in LOAI:
        return s
    return LOAI_ALIAS.get(s, next((LOAI_ALIAS[k] for k in LOAI_ALIAS if k in s), "ngữ pháp"))


def check_fix(raw: Any, goc: str, lang: str) -> tuple[dict[str, Any], list[str]]:
    """Máy kiểm tra đầu ra của Gemini (không gọi lại — giữ 1 lượt / ngày). Trả về (kết quả sạch, ghi chú đã cắt / bỏ)."""
    if not isinstance(raw, dict):
        raise JournalError("Gemini trả về dữ liệu lạ.")
    notes: list[str] = []
    n = count_units(goc, lang)
    g = _norm_find(goc, lang)

    def txt(k: str) -> str:
        v = raw.get(k)
        return clean_line(v, 1000) if isinstance(v, str) else ""

    sua = txt("sua")
    if sua:
        if not lang_ok(sua, lang):
            notes.append("bỏ câu đã sửa: sai ngôn ngữ")
            sua = ""
        elif count_units(sua, lang) > 2 * max(1, n):
            notes.append("bỏ câu đã sửa: dài gấp %.1f lần bài gốc" % (count_units(sua, lang) / max(1, n)))
            sua = ""
        else:
            lim = fix_limit(n, lang)
            sua2, cut = cut_units(sua, lang, lim)
            if cut:
                notes.append("cắt câu đã sửa: %d → %d %s" % (count_units(sua, lang), count_units(sua2, lang), WRITE_UNIT[lang]))
            sua = sua2
    loi: list[dict[str, str]] = []
    raw_loi = raw.get("loi") if isinstance(raw.get("loi"), list) else []
    if len(raw_loi) > MAX_ERRORS:
        notes.append("bỏ %d lỗi sau lỗi thứ %d" % (len(raw_loi) - MAX_ERRORS, MAX_ERRORS))
    for i, e in enumerate(raw_loi):
        if len(loi) >= MAX_ERRORS:
            break
        if not isinstance(e, dict):
            continue
        eg = clean_line(e.get("goc"), 200)
        es = clean_line(e.get("sua"), 200)
        if not eg or _norm_find(eg, lang) not in g:
            notes.append("bỏ lỗi %d: chỗ sai \"%s\" không có trong bài" % (i + 1, eg[:20]))
            continue
        lim = ERR_PART[lang]
        eg2, c1 = (cut_units(eg, lang, lim) if lang == "en" else cut_chars(eg, lim))
        es2, c2 = (cut_units(es, lang, lim) if lang == "en" else cut_chars(es, lim))
        if c1 or c2:
            notes.append("cắt chỗ sai / sửa của lỗi %d" % (i + 1))
        why = clean_line(e.get("giai_thich"), 400)
        why2, c3 = cut_chars(why, WHY_MAX, 1)
        if c3:
            notes.append("cắt giải thích lỗi %d: %d → %d ký tự" % (i + 1, len(why), len(why2)))
        if why2 and not vi_ok(why2):
            notes.append("bỏ giải thích lỗi %d: tiếng Việt không dấu" % (i + 1))
            why2 = ""
        rule, c4 = cut_chars(clean_line(e.get("quy_tac"), 200), RULE_MAX)
        if c4:
            notes.append("cắt quy tắc lỗi %d" % (i + 1))
        if (not rule or re.search(r"(?i)cùng quy tắc|như (lỗi )?trên", rule)) and loi:
            rule = loi[-1]["quy_tac"]          # "Cùng quy tắc như lỗi trên" → dùng quy tắc của lỗi trước (gom Lỗi hay gặp)
        loai = norm_loai(e.get("loai"))
        if str(e.get("loai") or "").strip().lower() != loai:
            notes.append("đổi loại lỗi %d \"%s\" → \"%s\"" % (i + 1, str(e.get("loai") or "")[:16], loai))
        loi.append({"goc": eg2, "sua": es2, "loai": loai, "quy_tac": rule, "giai_thich": why2})
    more = txt("con_lai")
    if more:
        more2, c = cut_chars(more, MORE_MAX, 1)
        if c:
            notes.append("cắt phần còn lại: %d → %d ký tự" % (len(more), len(more2)))
        more = more2 if vi_ok(more2) else ""
    nx = txt("nhan_xet")
    if nx:
        nx2, c = cut_chars(nx, NOTE_MAX, 2)
        if c:
            notes.append("cắt nhận xét: %d → %d ký tự" % (len(nx), len(nx2)))
        if not vi_ok(nx2):
            notes.append("bỏ nhận xét: tiếng Việt không dấu")
            nx2 = ""
        nx = nx2
    tn = txt("tu_nhien")
    if tn:
        if loi:
            notes.append("bỏ cách nói tự nhiên hơn: bài có lỗi")
            tn = ""
        elif not lang_ok(tn, lang) or count_units(tn, lang) > max(n, 1) + (2 if lang == "ja" else 1):
            notes.append("bỏ cách nói tự nhiên hơn: sai ngôn ngữ hoặc dài hơn bài gốc")
            tn = ""
        elif _norm_find(tn, lang) == g:
            tn = ""
    if not loi and sua and _norm_find(sua, lang) != g:
        # Gemini sửa mà không nêu lỗi nào (hay gặp: chỉ thêm dấu câu) → vẫn hiện câu đã sửa, coi như không có lỗi lớn
        notes.append("câu đã sửa khác bài gốc nhưng không nêu lỗi")
    return {"sua": sua, "loi": loi, "con_lai": more, "tu_nhien": tn, "nhan_xet": nx}, notes


def fix_models(names: list[str], client: Any = None) -> list[str]:
    """Thứ tự model cho bài sửa: Flash-Lite trước (hạn mức riêng, không tranh lượt với báo dùng Flash), rồi các model khác."""
    lite = [n for n in names if "lite" in n]
    rest = [n for n in names if "lite" not in n]
    out = lite + rest
    if client is not None:
        out = [n for n in out if not client.is_exhausted(n)]
    return out[:8]


def run_fix(client: Any, models: list[str], goc: str, lang: str, level: str, hints: list[str]) -> dict[str, Any]:
    """Gọi Gemini (luồng nền, không đụng collection). Thử lần lượt các model: hết hạn mức → model sau; khoá sai →
    dừng. Trả về {"raw": dict, "model": tên}. Mọi model hết hạn mức → AIError(kind="quota", daily=True)."""
    ai = _ai()
    order = fix_models(models, client)
    if not order:
        raise ai.AIError("Hôm nay Gemini hết lượt miễn phí.", "quota", daily=True)
    system, prompt = fix_system(lang, level), fix_prompt(goc, lang, level, hints)
    last: Any = None
    tries = 0
    for name in order:
        if client.is_exhausted(name):
            continue
        tries += 1
        try:
            out = client.generate(name, system, prompt, FIX_SCHEMA, temperature=0.3, max_tokens=8192, thinking="low")
            return {"raw": ai.parse_json(out), "model": name}
        except ai.AIError as e:
            last = e
            if e.kind == "key":
                raise
            if e.kind == "net":
                raise
            if e.kind == "quota" and e.daily:
                continue
            if tries >= 3:
                break
    if all(client.is_exhausted(n) for n in order):
        raise ai.AIError("Hôm nay Gemini hết lượt miễn phí.", "quota", daily=True)
    raise last or ai.AIError("Không gọi được model nào.", "model")


def short_reason(err: Any) -> str:
    """Lý do ngắn cho thông báo "Chưa sửa được: …"."""
    kind = getattr(err, "kind", "")
    return {"net": "mất mạng", "key": "khoá Gemini không dùng được", "quota": "hết lượt miễn phí",
            "busy": "Gemini đang bận", "format": "Gemini trả về JSON hỏng", "bad": "Gemini trả về dữ liệu lạ",
            "blocked": "Gemini từ chối bài này", "model": "không gọi được model nào"}.get(kind) or \
        (str(err)[:60] if err else "lỗi không rõ")


# ---------------------------------------------------------------------------
# Khung ngày: số liệu + nhật ký + luyện viết
# ---------------------------------------------------------------------------


def _marks(goc: str, sua: str, lang: str, learned: list[str]) -> tuple[Any, Any, Any]:
    changed, dels = diff_marks(goc, sua, lang)
    return changed, word_spans(sua, learned, lang), dels


def stale_wait(w: dict[str, Any] | None, now: float | None = None, running: bool = False) -> bool:
    """Cờ "đang sửa" cũ (> 10 phút) mà không có việc nền nào đang chạy: tắt Anki giữa chừng → mở khoá, không tính lượt."""
    if not w or w.get("st") != "wait" or running:
        return False
    now = time.time() if now is None else now
    return now - float(w.get("sent") or 0) > FIX_STALE


def writing_view(w: dict[str, Any] | None, lang: str, langs: list[str], is_today: bool, has_key: bool,
                 hints_now: list[str], learned: list[str], reset_at: float | None = None) -> dict[str, Any] | None:
    """Khung Luyện viết của một ngày. Ngày cũ chưa viết → None (chỉ hôm nay mới viết được)."""
    if not w and not is_today:
        return None
    w = dict(w or {})
    wl = w.get("lang") if w.get("goc") or w.get("st") == "done" else lang
    wl = wl if wl in WRITE_LANGS else "ja"
    goc = w.get("goc", "")
    st = w.get("st", "")
    hints = w.get("goi_y") if isinstance(w.get("goi_y"), list) and w.get("goi_y") else hints_now
    v: dict[str, Any] = {
        "lang": wl, "langs": [x for x in langs if x in WRITE_LANGS], "max": WRITE_MAX[wl], "unit": WRITE_UNIT[wl],
        "goc": goc, "count": count_units(goc, wl), "hints": hints, "used": used_hints(goc, hints, wl) if goc else [],
        "st": st, "err": w.get("err", ""), "today": is_today, "key": has_key,
        "locked": st in ("wait", "queue", "done") or not is_today,
    }
    if st == "queue":
        v["reset"] = time.strftime("%H:%M", time.localtime(reset_at)) if reset_at else ""
    if st == "done":
        sua = w.get("sua", "")
        v["fix"] = {
            "segs": segments(sua, *_marks(goc, sua, wl, learned)) if sua else [],
            "loi": w.get("loi", []), "con_lai": w.get("con_lai", ""), "nhan_xet": w.get("nhan_xet", ""),
            "tu_nhien": w.get("tu_nhien", ""), "same": bool(sua) and _norm_find(sua, wl) == _norm_find(goc, wl),
            "seen": bool(w.get("seen")),
        }
    return v


def paper_line(read: dict[str, dict[str, Any]], issues: dict[str, dict[str, Any]], ds: str) -> str:
    """"đọc số N · chép đúng a / b câu" cho số báo của ngày ds (mọi báo đã đọc của ngày đó)."""
    parts = []
    for lang, r in read.items():
        if ds not in r:
            continue
        x = r[ds]
        info = issues.get(lang, {}).get(ds) or {}
        so = info.get("so")
        total = info.get("ct") or len(x.get("ct", {}))
        ok = sum(1 for v in (x.get("ct") or {}).values() if v)
        p = ("đọc số %s" % so if so else "đã đọc") + (" tiếng Anh" if lang == "en" and len(read) > 1 else "")
        if total:
            p += " · chép đúng %d / %d câu" % (ok, total)
        parts.append(p)
    return " · ".join(parts)


def day_head(d: _dt.date, today: _dt.date) -> dict[str, Any]:
    spans = theme_spans(d.year, d.year)
    th = theme_on(d, spans)
    return {"d": d.isoformat(), "title": "%s, %02d/%02d/%d" % (WEEKDAYS[d.weekday()], d.day, d.month, d.year),
            "th": th or "", "th_name": theme_name(th, True), "today": d == today, "fut": d > today}


# ---------------------------------------------------------------------------
# Cuốn nhật ký
# ---------------------------------------------------------------------------


def _sentences(s: str) -> int:
    s = (s or "").strip()
    if not s:
        return 0
    n = len(_SENT_END.findall(s))
    if not re.search(r"[.!?。！？…][\"'”’)」』]*$", s):
        n += 1           # câu cuối không có dấu hết câu
    return max(1, n)


def month_summary(y: int, m: int, today: _dt.date, counts: dict[str, dict[str, int]],
                  entries: dict[str, dict[str, Any]]) -> dict[str, Any]:
    n = month_days(y, m)
    keys = [_dt.date(y, m, i + 1).isoformat() for i in range(n)]
    done_days = [k for k in keys if counts.get(k, {}).get("n", 0) > 0]
    best = max(done_days, key=lambda k: (counts[k]["n"], k), default="")
    elapsed = n if (y, m) < (today.year, today.month) else max(0, (today - _dt.date(y, m, 1)).days + 1)
    writes = [entries[k]["w"] for k in keys if k in entries and entries[k].get("w", {}).get("goc")]
    moods: dict[str, int] = {}
    errs: dict[str, list[Any]] = {}
    for k in keys:
        e = entries.get(k) or {}
        if e.get("m"):
            moods[e["m"]] = moods.get(e["m"], 0) + 1
        for er in (e.get("w") or {}).get("loi", []) if (e.get("w") or {}).get("st") == "done" else []:
            if er.get("loai") == "tự nhiên hơn":
                continue
            rule = (er.get("quy_tac") or er.get("loai") or "").strip()
            if not rule:
                continue
            key = rule.lower()
            errs.setdefault(key, [rule, 0])[1] += 1
    return {
        "days": len(done_days), "of": elapsed, "reviews": sum(counts.get(k, {}).get("n", 0) for k in keys),
        "fruit": sum(counts.get(k, {}).get("fruit", 0) for k in keys),
        "best": ("%s · %d" % (ddmm(_dt.date.fromisoformat(best)), counts[best]["n"])) if best else "",
        "notes": sum(1 for k in keys if (entries.get(k) or {}).get("t")),
        "writes": len(writes),
        "sentences": sum(_sentences(w.get("sua") or w.get("goc", "")) for w in writes),
        "moods": sorted(moods.items(), key=lambda kv: (-kv[1], STICKERS.index(kv[0])))[:4],
        "errors": [v for v in sorted(errs.values(), key=lambda v: (-v[1], v[0]))[:3]],
    }


def dominant_theme(y: int, m: int, spans: list[tuple[str, _dt.date, _dt.date]] | None = None) -> str:
    spans = spans or theme_spans(y, y)
    cnt: dict[str, int] = {}
    for i in range(month_days(y, m)):
        t = theme_on(_dt.date(y, m, i + 1), spans)
        if t:
            cnt[t] = cnt.get(t, 0) + 1
    return max(cnt.items(), key=lambda kv: kv[1])[0] if cnt else ""


def book_rows(y: int, m: int, today: _dt.date, counts: dict[str, dict[str, int]], entries: dict[str, dict[str, Any]],
              goal: int, plain: bool = False) -> list[dict[str, Any]]:
    """Mỗi ngày một dòng, CHỈ ngày có ôn hoặc có viết (bỏ ngày trống cho cuốn gọn)."""
    spans = theme_spans(y, y)
    rows = []
    for i in range(month_days(y, m)):
        d = _dt.date(y, m, i + 1)
        if d > today:
            break
        ds = d.isoformat()
        c = counts.get(ds, {}).get("n", 0)
        e = entries.get(ds) or {}
        w = e.get("w") or {}
        wr = (w.get("sua") or w.get("goc", "")) if w.get("st") == "done" else w.get("goc", "")
        if not c and not e.get("t") and not e.get("m") and not wr:
            continue
        th = theme_on(d, spans)
        rows.append({"d": ds, "label": "%02d %s" % (d.day, WD_SHORT[d.weekday()]), "lv": level(c, goal),
                     "sp": "goc" if plain or not th else SPECIES.get(th, "goc"), "mood": e.get("m", ""),
                     "t": e.get("t", ""), "w": wr, "wl": w.get("lang", "ja"), "n": c})
    return rows


def shelf(first: _dt.date | None, today: _dt.date, extra: list[tuple[int, int]] | None = None) -> list[dict[str, Any]]:
    """Kệ sách: một cuốn mỗi tháng (từ tháng có lượt ôn / nhật ký đầu tiên tới tháng này) + một cuốn năm cho năm đã hết."""
    lo = (first.year, first.month) if first else (today.year, today.month)
    for ym in extra or []:
        if ym < lo:
            lo = ym
    out = []
    y, m = lo
    while (y, m) <= (today.year, today.month):
        out.append({"id": "%04d-%02d" % (y, m), "y": y, "m": m, "label": "Th %d" % m, "th": dominant_theme(y, m),
                    "draft": (y, m) == (today.year, today.month)})
        y, m = add_months(y, m, 1)
    years = sorted({b["y"] for b in out if b["y"] < today.year})
    for yy in years:
        out.append({"id": str(yy), "y": yy, "m": 0, "label": "Năm %d" % yy, "th": "", "year": True, "draft": False})
    return out


# ---------------------------------------------------------------------------
# Ảnh vườn tự chụp (bìa cuốn nhật ký): chỉ trên máy này, không đồng bộ
# ---------------------------------------------------------------------------

PNG_DATA_RE = re.compile(r"^data:image/png;base64,([A-Za-z0-9+/=]+)$")


def decode_png(data_url: str) -> bytes:
    m = PNG_DATA_RE.match(data_url or "")
    if not m:
        raise JournalError("Ảnh không đúng định dạng PNG.")
    raw = base64.b64decode(m.group(1), validate=True)
    if len(raw) > PHOTO_MAX_BYTES or raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise JournalError("Ảnh quá lớn hoặc hỏng.")
    return raw


def photos(folder: str) -> list[str]:
    """Ngày của các ảnh vườn đã chụp (yyyy-mm-dd), cũ → mới."""
    try:
        names = os.listdir(folder)
    except OSError:
        return []
    return sorted(n[:-4] for n in names if n.endswith(".png") and parse_date(n[:-4]))


def profile_photo_dir(root: str, key: str, adopt: bool) -> str:
    """1.25.3 (audit BUG-06): ảnh vườn tự chụp theo hồ sơ — `root/<mã hồ sơ>/`. Trước đây mọi hồ sơ trên máy dùng chung
    `root/` (tên ảnh chỉ có ngày) nên hồ sơ mới tinh lấy bìa nhật ký là nhà của hồ sơ khác. Ảnh cũ ở `root/` (của bản
    ≤ 1.25.2) về hồ sơ đầu tiên đã có ví (`adopt`) mở sau khi cập nhật; hồ sơ mới tinh không nhận. `key` rỗng
    (không biết hồ sơ) thì dùng `root` như cũ."""
    if not key or not re.fullmatch(r"[0-9a-f]{6,40}", key):
        return root
    folder = os.path.join(root, key)
    if os.path.isdir(folder):
        return folder
    old = photos(root)
    if old and not adopt:
        return folder          # chưa tạo thư mục: hồ sơ có ví mở sau vẫn nhận được ảnh cũ
    try:
        os.makedirs(folder, exist_ok=True)
        for ds in old:
            os.replace(os.path.join(root, ds + ".png"), os.path.join(folder, ds + ".png"))
    except OSError:
        pass
    return folder


def photo_due(folder: str, today: _dt.date) -> bool:
    ps = photos(folder)
    if not ps:
        return True
    return (today - _dt.date.fromisoformat(ps[-1])).days >= 7


def save_photo(folder: str, today: _dt.date, data_url: str) -> str:
    raw = decode_png(data_url)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, today.isoformat() + ".png")
    with open(path, "wb") as f:
        f.write(raw)
    # giữ 1 tấm / tuần (ISO), bỏ tấm khác cùng tuần
    wk = today.isocalendar()[:2]
    for ds in photos(folder):
        if ds != today.isoformat() and _dt.date.fromisoformat(ds).isocalendar()[:2] == wk:
            try:
                os.remove(os.path.join(folder, ds + ".png"))
            except OSError:
                pass
    return path


def month_photo(folder: str, y: int, m: int) -> tuple[str, str] | None:
    """(ngày, data URL) của ảnh mới nhất chụp trong tháng."""
    pre = "%04d-%02d-" % (y, m)
    ps = [p for p in photos(folder) if p.startswith(pre)]
    if not ps:
        return None
    try:
        with open(os.path.join(folder, ps[-1] + ".png"), "rb") as f:
            raw = f.read(PHOTO_MAX_BYTES + 1)
    except OSError:
        return None
    if len(raw) > PHOTO_MAX_BYTES or raw[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return ps[-1], "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


# ---------------------------------------------------------------------------
# Nhật ký sửa bài (như nhật ký báo): những gì máy đã cắt / bỏ — chỉ trên máy này
# ---------------------------------------------------------------------------


def write_fix_log(folder: str, date: str, info: dict[str, Any]) -> None:
    try:
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, "sua_bai.json")
        try:
            with open(path, encoding="utf-8") as f:
                log = json.load(f)
        except (OSError, ValueError):
            log = []
        if not isinstance(log, list):
            log = []
        log.append(dict(info, ngay=date, luc=time.strftime("%Y-%m-%d %H:%M:%S")))
        with open(path, "w", encoding="utf-8") as f:
            json.dump(log[-60:], f, ensure_ascii=False, indent=1)
    except OSError:
        pass
