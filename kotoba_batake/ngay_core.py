"""ことば畑 – 1.28: chia lượt ôn (revlog) theo ngày Anki đúng lịch địa phương.

Audit 12/11 F02: trước 1.28 mọi chỗ chia ngày bằng một mốc giờ qua ngày rồi chia cố định 86400 giây — ngày đổi giờ mùa
hè dài 23 / 25 giờ (New York, Berlin) hay lệch 30 phút (Lord Howe) làm một lượt ôn rơi sang ngày bên cạnh: Lịch hoa lệch
ngày, chuỗi đứt, vé giữ chuỗi bị dùng cho ngày đã ôn. Từ 1.28 một ngày Anki = từ giờ qua ngày (giờ địa phương, vd. 4:00)
hôm đó tới giờ qua ngày hôm sau, tính theo lịch của máy cho từng ngày.

Dùng chung cho: chuỗi ngày ôn (`garden_core.review_days` / `daily_stats`), tổng ngày có ôn, Lịch hoa
(`journal_core.revlog_days`, `fruit_cards`, `first_review_day`), bù xu điện thoại (`revlog_by_day`), vé giữ chuỗi.

Không import aqt / anki (test được bằng python thường). SQL dùng hàm `date(…, 'localtime')` của SQLite — cùng múi giờ với
`datetime.fromtimestamp` của Python (cùng thư viện C của tiến trình).
"""
from __future__ import annotations

import datetime as _dt
import time as _time
from typing import Any


class Days:
    """Ngày Anki theo mốc `day_cutoff` (giây, lúc qua ngày kế tiếp) của scheduler."""

    def __init__(self, cutoff: int) -> None:
        self.cutoff = int(cutoff)
        loc = _dt.datetime.fromtimestamp(self.cutoff)
        self.roll = _dt.timedelta(hours=loc.hour, minutes=loc.minute, seconds=loc.second)
        self.today = (loc - _dt.timedelta(days=1)).date()     # trừ theo lịch (không phải 86400 giây)
        # bộ đổi của SQLite: giờ địa phương lùi đúng giờ qua ngày → ngày lịch của ngày Anki
        self.mod = "-%d seconds" % int(self.roll.total_seconds())

    def date_of(self, ts: float) -> _dt.date:
        """Ngày Anki (ngày lịch) chứa thời điểm `ts` (giây)."""
        return (_dt.datetime.fromtimestamp(ts) - self.roll).date()

    def rel_of(self, ts: float) -> int:
        """0 = hôm nay, -1 = hôm qua…"""
        return (self.date_of(ts) - self.today).days

    def start_of(self, d: _dt.date) -> int:
        """Thời điểm (giây) ngày Anki `d` bắt đầu: 0 giờ địa phương của `d` + giờ qua ngày."""
        naive = _dt.datetime.combine(d, _dt.time()) + self.roll
        try:
            return int(_time.mktime(naive.timetuple()))
        except (OverflowError, ValueError):
            return int(naive.replace(tzinfo=_dt.timezone.utc).timestamp())

    def rel_start(self, rel: int) -> int:
        return self.start_of(self.today + _dt.timedelta(days=int(rel)))

    def sql_day(self, col: str = "id") -> str:
        """Biểu thức SQL ra 'yyyy-mm-dd' (ngày Anki) của cột id (mili giây) — một tham số: `self.mod`."""
        return "date(%s / 1000, 'unixepoch', 'localtime', ?)" % col

    def rel_of_iso(self, s: Any) -> int | None:
        try:
            return (_dt.date.fromisoformat(str(s)) - self.today).days
        except (TypeError, ValueError):
            return None


def days_of(col: Any) -> Days:
    return Days(int(col.sched.day_cutoff))
