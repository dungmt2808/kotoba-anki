"""ことば畑 1.36 — sự kiện mùa: Giáng sinh 2026 (tủ lịch 24 ngăn).

Bản gộp người dùng chốt 23/11 (`docs/ke_hoach_1_36/KE_HOACH.md`, mục BẢN GỘP CHỐT). Thuần Python (không import anki / aqt)
để test offline bằng ngày giả.

Luật
- Tủ lịch 24 ngăn, ngăn d ứng với ngày Anki d/12 (qua giờ đổi ngày của Anki như mọi phần khác). Ngăn d mở được từ ngày d nếu
  ngày d có ít nhất 1 lượt ôn (revlog: ôn trên điện thoại cũng tính) hoặc ngày d đã dùng vé giữ chuỗi. Ngăn đủ điều kiện mà
  chưa mở thì chờ đó, mở lúc nào cũng được tới hết 31/12 (cập nhật / cài muộn không mất ngăn — lượt ôn trước lúc cài vẫn tính).
- Lỡ ngày (không ôn, không vé): mỗi 15 lượt ôn trong một ngày mở bù 1 ngăn, tối đa 2 ngăn bù mỗi ngày, tới hết 31/12.
- Quà chỉ là đồ trang trí, không có xu. Ngăn "Cây" treo thêm đồ lên cây thông, ngăn "Nhà" / "Sân" khoác áo Noel cho nhà và
  thắp đèn sân, ngăn "Trong nhà" là món đồ (vào Kho đồ) hoặc mẫu tường / sàn, ngăn "Hộp quà bí mật" đặt một hộp dưới gốc cây
  (mở được từ 25/12 — sau mùa vẫn mở được, quà đã có thì không mất).
- Lần đầu mở vườn trong mùa (1/12 – 31/12): tặng Tủ lịch 2026 và — nếu chưa có — một cây thông Noel (tặng cả khi chưa mở
  giao diện mùa Giáng sinh). Hết mùa (ngày Anki ≥ 1/1/2027): không mở ngăn nữa, tủ lịch thành món kỷ niệm (xem lại được).

Dữ liệu ở khoá collection `kotoba_batake_le` (đồng bộ AnkiWeb; bản cũ không đọc khoá này nên không xoá):
  {"v": 1, "noel2026": {"open": {"<ngăn>": {"d": ngày mở, "b": 0 | 1 (mở bù)}}, "bu": {ngày: số ngăn bù đã mở},
                        "gift": {"tulich" | "tree": ngày tặng}, "box": {"<hộp>": ngày mở hộp}}}
Khoá lạ (của bản sau) giữ nguyên. Hai máy cùng ghi: gộp theo hợp (ngăn / quà / hộp đã mở ở máy nào cũng tính).
Món của sự kiện lưu ở tầng NHA_KEY của ví (garden_core.LE_ITEMS) như quà 1.28 — bản ≥ 1.24 giữ hộ món lạ.
Mẫu tường / sàn Noel là mẫu có sẵn của decor_core (id w_noel… / f_noel…) — bản ≥ 1.30 giữ hộ id lạ.
"""
from __future__ import annotations

import datetime as _dt
import json
import re
from typing import Any, Callable

try:
    from . import backup_core as backup
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import backup_core as backup  # type: ignore[no-redef]

LE_KEY = "kotoba_batake_le"
EV_ID = "noel2026"
YEAR = 2026
PRE_FROM = _dt.date(YEAR, 11, 15)        # giao diện mùa Giáng sinh đã chạy: Tin làng báo trước ngày mở tủ lịch
FIRST = _dt.date(YEAR, 12, 1)
DOORS_N = 24
END = _dt.date(YEAR, 12, 31)             # ngăn còn mở / mở bù được tới hết ngày này
BOX_DAY = _dt.date(YEAR, 12, 25)         # hộp quà bí mật mở được từ sáng 25
MAKEUP_PER = 15
MAKEUP_MAX = 2
KEEP_BU = 40                             # sổ mở bù giữ 40 ngày
SOON_DAYS = 7
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Món của sự kiện (id ở garden_core.LE_ITEMS) và mẫu tường / sàn (decor_core.NOEL_TILES)
TULICH = "le_tulich"
TREE = "xmastree"
WALLS = ("w_noeltuyet", "w_noelkeo", "w_noeldo")
FLOORS = ("f_noelcaro", "f_noellen")

# 24 ngăn. kind: cay (treo lên cây) · nha (áo nhà) · san (đèn / đồ ngoài sân) · trong (đồ trong nhà / mẫu tường sàn) ·
# qua (hộp quà bí mật). part: phần vẽ (cây / nhà / sân). item: món vào kho ({id: số}). tiles: mẫu tường / sàn. box: hộp số mấy.
DOORS: dict[int, dict[str, Any]] = {
    1: {"kind": "nha", "part": "wreath", "name": "Vòng hoa cửa", "desc": "Vòng hoa lá thông trên cửa, nơ đỏ trên hai đèn lồng"},
    2: {"kind": "cay", "part": "red", "name": "Quả châu đỏ", "desc": "Hai quả châu đỏ đầu tiên cho cây thông"},
    3: {"kind": "trong", "item": {"le_caynho": 1}, "name": "Cây thông nhỏ để bàn", "desc": "Cây thông bé xíu trong chậu gốm"},
    4: {"kind": "cay", "part": "yellow", "name": "Quả châu vàng", "desc": "Hai quả châu vàng óng"},
    5: {"kind": "trong", "item": {"le_tat": 1}, "name": "Tất Noel", "desc": "Chiếc tất đỏ treo tường chờ quà"},
    6: {"kind": "qua", "box": 1, "item": {"le_cautuyet": 1}, "name": "Hộp quà bí mật", "desc": "Đặt dưới gốc cây · mở từ sáng 25/12"},
    7: {"kind": "nha", "part": "garland", "name": "Dây lá thông & đèn viền mái",
        "desc": "Dây lá thông thắt nơ dọc mép mái, đèn viền mái và đèn rủ — tối là sáng"},
    8: {"kind": "trong", "tiles": list(WALLS), "name": "Bộ tường Noel",
        "desc": "3 mẫu giấy dán tường: Bông tuyết trên nền thông, Sọc kẹo gậy, Đỏ mận cây thông nhỏ"},
    9: {"kind": "cay", "part": "blue", "name": "Quả châu xanh", "desc": "Hai quả châu xanh dương"},
    10: {"kind": "cay", "part": "lights", "name": "Dây đèn cây thông", "desc": "Đèn nhấp nháy quanh cây"},
    11: {"kind": "trong", "item": {"le_banhkem": 1}, "name": "Bánh kem dâu", "desc": "Bánh kem dâu kem tươi kiểu Nhật cho đêm Giáng sinh"},
    12: {"kind": "cay", "part": "purple", "name": "Quả châu tím", "desc": "Hai quả châu tím"},
    13: {"kind": "qua", "box": 2, "item": {"le_gaubong": 1}, "name": "Hộp quà bí mật", "desc": "Đặt dưới gốc cây · mở từ sáng 25/12"},
    14: {"kind": "san", "part": "path", "name": "Đèn lối đi & nến cửa sổ",
         "desc": "Đèn lối đi trước sân, nến ở cửa sổ, cây thông và đồ cao quấn đèn"},
    15: {"kind": "trong", "tiles": list(FLOORS), "name": "Bộ sàn Noel", "desc": "2 mẫu sàn: Thảm caro đỏ, Thảm len tuyết"},
    16: {"kind": "cay", "part": "tinsel", "name": "Dây kim tuyến", "desc": "Dây kim tuyến vàng quấn quanh cây"},
    17: {"kind": "san", "item": {"le_nguoituyet": 1}, "name": "Người tuyết", "desc": "Mũ đen, khăn đỏ, mũi cà rốt"},
    18: {"kind": "trong", "item": {"le_denngu": 1}, "name": "Đèn ngủ ngôi sao", "desc": "Toả ánh vàng dịu ban đêm"},
    19: {"kind": "cay", "part": "red2", "name": "Thêm quả châu đỏ", "desc": "Hai quả châu đỏ nữa"},
    20: {"kind": "qua", "box": 3, "item": {"le_longden": 1}, "name": "Hộp quà bí mật", "desc": "Đặt dưới gốc cây · mở từ sáng 25/12"},
    21: {"kind": "san", "part": "swag", "item": {"le_tuanloc": 2}, "name": "Dây đèn võng & tuần lộc đèn",
         "desc": "Dây đèn võng qua sân, đôi tuần lộc đèn, ngôi sao trên mái"},
    22: {"kind": "cay", "part": "candy", "name": "Kẹo gậy", "desc": "Hai cây kẹo gậy sọc đỏ trắng"},
    23: {"kind": "trong", "item": {"le_banhquy": 1}, "name": "Bàn nhỏ bánh quy + sữa",
         "desc": "Bàn gỗ thấp có sẵn khay — tối 24 để dành cho ông già Noel"},
    24: {"kind": "cay", "part": "star", "name": "Ngôi sao", "desc": "Ngôi sao trên đỉnh cây thông"},
}
assert sorted(DOORS) == list(range(1, DOORS_N + 1))
KIND_NAMES = {"cay": "Cây", "nha": "Nhà", "san": "Sân", "trong": "Trong nhà", "qua": "Hộp quà"}
TREE_PARTS = tuple(DOORS[d]["part"] for d in sorted(DOORS) if DOORS[d]["kind"] == "cay")
HOUSE_PARTS = ("wreath", "garland", "path", "swag")
BOX_DOORS = {DOORS[d]["box"]: d for d in DOORS if DOORS[d]["kind"] == "qua"}
# Câu khi lắc hộp (đoán món bên trong) — theo hộp
SHAKE = {1: ("Lắc lắc… óc ách!", "Nghe như có nước bên trong, tròn tròn."),
         2: ("Lắc lắc… êm ru.", "Mềm mềm, không kêu gì cả."),
         3: ("Lắc lắc… lách cách.", "Nghe như giấy với một thứ gì cứng cứng.")}


class LeError(Exception):
    """Lỗi có câu tiếng Việt hiện cho người dùng."""


def _iso(s: Any) -> _dt.date | None:
    if not isinstance(s, str) or not DATE_RE.match(s):
        return None
    try:
        return _dt.date.fromisoformat(s)
    except ValueError:
        return None


def door_date(d: int) -> _dt.date:
    return _dt.date(YEAR, 12, d)


def phase(today: _dt.date) -> str | None:
    """"pre" (15–30/11: báo trước) · "advent" (1–24/12) · "after" (25–31/12) · "done" (từ 1/1/2027: tủ lịch là kỷ niệm) ·
    None (trước 15/11/2026)."""
    if today < PRE_FROM:
        return None
    if today < FIRST:
        return "pre"
    if today <= door_date(DOORS_N):
        return "advent"
    if today <= END:
        return "after"
    return "done"


def active(today: _dt.date) -> bool:
    """Trong mùa sự kiện: tủ lịch, áo nhà, đèn sân, cây theo ngăn."""
    return FIRST <= today <= END


# ---------------------------------------------------------------------------
# Làm sạch (dữ liệu từ collection / máy khác là không tin cậy)
# ---------------------------------------------------------------------------

def empty() -> dict[str, Any]:
    return {"open": {}, "bu": {}, "gift": {}, "box": {}}


def clean_ev(raw: Any) -> dict[str, Any]:
    out = empty()
    if not isinstance(raw, dict):
        return out
    op = raw.get("open") if isinstance(raw.get("open"), dict) else {}
    for k, v in op.items():
        if not (isinstance(k, str) and k.isdigit() and str(int(k)) == k and int(k) in DOORS and isinstance(v, dict)):
            continue
        d = _iso(v.get("d"))
        if d is None or d < door_date(int(k)):
            continue
        out["open"][k] = {"d": d.isoformat(), "b": 1 if v.get("b") in (1, True) else 0}
    bu = raw.get("bu") if isinstance(raw.get("bu"), dict) else {}
    for ds, n in bu.items():
        if _iso(ds) and isinstance(n, int) and not isinstance(n, bool) and n > 0:
            out["bu"][ds] = min(MAKEUP_MAX, n)
    gift = raw.get("gift") if isinstance(raw.get("gift"), dict) else {}
    for k in ("tulich", "tree"):
        if _iso(gift.get(k)):
            out["gift"][k] = gift[k]
    box = raw.get("box") if isinstance(raw.get("box"), dict) else {}
    for k, v in box.items():
        if isinstance(k, str) and k.isdigit() and str(int(k)) == k and int(k) in BOX_DOORS and _iso(v):
            out["box"][k] = v
    return out


def clean(raw: Any) -> dict[str, Any]:
    """Cả khoá: {"noel2026": ...}."""
    ev = raw.get(EV_ID) if isinstance(raw, dict) else None
    return {EV_ID: clean_ev(ev)}


def merge_ev(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    """Gộp hai bản (hai máy): ngăn / quà / hộp đã mở ở máy nào cũng tính (ngày sớm hơn thắng), số bù lấy lớn hơn."""
    out = clean_ev(a)
    other = clean_ev(b)
    for k, v in other["open"].items():
        cur = out["open"].get(k)
        if cur is None or v["d"] < cur["d"]:
            out["open"][k] = v
    for ds, n in other["bu"].items():
        out["bu"][ds] = max(out["bu"].get(ds, 0), n)
    for k, v in other["gift"].items():
        if k not in out["gift"] or v < out["gift"][k]:
            out["gift"][k] = v
    for k, v in other["box"].items():
        if k not in out["box"] or v < out["box"][k]:
            out["box"][k] = v
    return out


def trim(ev: dict[str, Any], today: _dt.date) -> None:
    lo = (today - _dt.timedelta(days=KEEP_BU)).isoformat()
    ev["bu"] = {d: n for d, n in ev["bu"].items() if d >= lo}


# ---------------------------------------------------------------------------
# Ngăn
# ---------------------------------------------------------------------------

def _days(x: Any) -> set[str]:
    return {s for s in (x or []) if isinstance(s, str) and _iso(s)}


def _reviews(n: Any) -> int:
    try:
        return max(0, int(n))
    except (TypeError, ValueError):
        return 0


def makeup_left(ev: dict[str, Any], today: _dt.date, reviews_today: Any) -> int:
    """Số ngăn còn mở bù được hôm nay (mỗi 15 lượt ôn hôm nay một ngăn, tối đa 2 / ngày)."""
    return max(0, min(MAKEUP_MAX, _reviews(reviews_today) // MAKEUP_PER) - int(ev["bu"].get(today.isoformat(), 0)))


def makeup_next(ev: dict[str, Any], today: _dt.date, reviews_today: Any) -> int | None:
    """Còn bao nhiêu lượt ôn nữa thì mở bù thêm được 1 ngăn (0 = mở bù được ngay; None = hôm nay đã đủ 2 ngăn bù)."""
    used = int(ev["bu"].get(today.isoformat(), 0))
    r = _reviews(reviews_today)
    earned = min(MAKEUP_MAX, r // MAKEUP_PER)
    if earned > used:
        return 0
    if used >= MAKEUP_MAX:
        return None
    return (used + 1) * MAKEUP_PER - r


def door_state(ev: dict[str, Any], d: int, today: _dt.date, reviewed: set[str], frozen: set[str]) -> str:
    """open · ready (đủ điều kiện, mở được) · wait (hôm nay, chưa ôn lượt nào) · miss (lỡ ngày — mở bù) · future · closed
    (hết mùa, chưa mở)."""
    if str(d) in ev["open"]:
        return "open"
    dd = door_date(d)
    if today < dd:
        return "future"
    if today > END:
        return "closed"
    iso = dd.isoformat()
    if iso in reviewed or iso in frozen:
        return "ready"
    if dd == today:
        return "wait"
    return "miss"


def open_door(ev: dict[str, Any], d: Any, today: _dt.date, reviewed: Any, frozen: Any, reviews_today: Any) -> dict[str, Any]:
    """Mở ngăn d (sửa `ev` tại chỗ). Trả {"d", "makeup": bool, "item": {id: n}, "tiles": [...], "part", "box", "kind",
    "name"}. Sai luật → LeError (câu cho người dùng)."""
    try:
        d = int(d)
    except (TypeError, ValueError):
        raise LeError("Không có ngăn này.") from None
    if d not in DOORS:
        raise LeError("Không có ngăn này.")
    if not active(today):
        raise LeError("Tủ lịch mở từ 1/12 tới hết 31/12." if today < FIRST else "Mùa Giáng sinh đã qua — ngăn không mở thêm được.")
    st = door_state(ev, d, today, _days(reviewed), _days(frozen))
    if st == "open":
        raise LeError("Ngăn này mở rồi.")
    if st == "future":
        raise LeError("Ngăn này mở từ %d/12 nhé." % d)
    if st == "wait":
        raise LeError("Ôn ít nhất 1 thẻ hôm nay là mở được ngăn này.")
    makeup = st == "miss"
    if makeup:
        if makeup_left(ev, today, reviews_today) <= 0:
            nxt = makeup_next(ev, today, reviews_today)
            if nxt is None:
                raise LeError("Hôm nay đã mở bù đủ %d ngăn — mai mở bù tiếp nhé." % MAKEUP_MAX)
            raise LeError("Ngày %d/12 lỡ rồi — ôn thêm %d lượt nữa hôm nay để mở bù." % (d, nxt))
        ds = today.isoformat()
        ev["bu"][ds] = int(ev["bu"].get(ds, 0)) + 1
        trim(ev, today)
    ev["open"][str(d)] = {"d": today.isoformat(), "b": 1 if makeup else 0}
    info = DOORS[d]
    give = {} if info["kind"] == "qua" else dict(info.get("item") or {})
    return {"d": d, "makeup": makeup, "item": give, "tiles": list(info.get("tiles") or []), "part": info.get("part", ""),
            "box": info.get("box", 0), "kind": info["kind"], "name": info["name"], "desc": info["desc"]}


def gifts_due(ev: dict[str, Any], today: _dt.date) -> list[str]:
    """Quà mở mùa chưa tặng: "tulich" (Tủ lịch 2026), "tree" (cây thông — chỉ tặng khi chưa có cây nào)."""
    if not active(today):
        return []
    return [k for k in ("tulich", "tree") if k not in ev["gift"]]


def mark_gifts(ev: dict[str, Any], keys: list[str], today: _dt.date) -> None:
    for k in keys:
        ev["gift"].setdefault(k, today.isoformat())


def expected_items(ev: dict[str, Any]) -> dict[str, int]:
    """Số món của sự kiện người dùng phải đang có (theo sổ): tủ lịch đã tặng, món của ngăn đã mở, quà của hộp đã mở.
    Món của sự kiện không bán / bỏ được nên ví có ít hơn (khôi phục ví cũ, máy khác ghi ví mà chưa có sổ…) là chưa nhận."""
    out: dict[str, int] = {}
    if "tulich" in ev["gift"]:
        out[TULICH] = 1
    for k in ev["open"]:
        info = DOORS[int(k)]
        if info["kind"] == "qua":
            continue
        for iid, n in (info.get("item") or {}).items():
            out[iid] = out.get(iid, 0) + n
    for k in ev["box"]:
        d = BOX_DOORS[int(k)]
        if str(d) in ev["open"]:
            for iid, n in DOORS[d]["item"].items():
                out[iid] = out.get(iid, 0) + n
    return out


def expected_tiles(ev: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for k in sorted(ev["open"], key=int):
        out += [t for t in DOORS[int(k)].get("tiles") or [] if t not in out]
    return out


# Món tự bày vào ô trống khi nhận (đồ ngoài sân + tủ lịch); đồ trong nhà khác vào Kho đồ để người dùng tự chọn chỗ.
AUTO_PLACE = ("le_tulich", "le_nguoituyet", "le_tuanloc", TREE)


def auto_list(give: dict[str, int]) -> list[str]:
    """Danh sách món (lặp theo số) nên tự bày trong `give`."""
    out: list[str] = []
    for iid in AUTO_PLACE:
        out += [iid] * int(give.get(iid, 0) or 0)
    return out


def plan_sync(ev: dict[str, Any], owned: dict[str, int], placed: dict[str, int], tiles_own: list[str] | set[str],
              today: _dt.date) -> dict[str, Any] | None:
    """Việc tự làm khi mở vườn (sổ `ev` + kho `owned` {id: số} + số đang đặt `placed` {id: số} + mẫu tường / sàn đang có):
    - trong mùa, lần đầu: tặng Tủ lịch 2026 (treo ở tường phòng khách nếu còn ô) và — chưa có cây thông nào — một cây thông
      (tự đặt ở sân); có cây trong kho mà chưa đặt ở đâu thì đặt một cây ra sân (một lần, cùng lúc tặng);
    - bất kỳ lúc nào: sổ ghi đã nhận mà kho thiếu (khôi phục ví cũ, Anki tắt giữa hai lần ghi…) → bù cho đủ, không tự bày.
    Trả None (không có gì) hoặc {"give": {id: n}, "auto": [id…], "tiles": [id…], "mark": ["tulich" | "tree"], "welcome": bool}.
    Sửa `ev` (đánh dấu đã tặng)."""
    give: dict[str, int] = {}
    auto: list[str] = []
    mark = gifts_due(ev, today)
    if "tulich" in mark:
        if int(owned.get(TULICH, 0) or 0) < 1:
            give[TULICH] = 1
        if int(placed.get(TULICH, 0) or 0) < 1:
            auto.append(TULICH)
    if "tree" in mark:
        if int(owned.get(TREE, 0) or 0) < 1:
            give[TREE] = 1
        if int(placed.get(TREE, 0) or 0) < 1:
            auto.append(TREE)
    mark_gifts(ev, mark, today)
    for iid, n in expected_items(ev).items():
        short = n - int(owned.get(iid, 0) or 0) - give.get(iid, 0)
        if short > 0:
            give[iid] = give.get(iid, 0) + short
    tiles = [t for t in expected_tiles(ev) if t not in set(tiles_own or ())]
    if not (give or auto or tiles or mark):
        return None
    return {"give": give, "auto": auto, "tiles": tiles, "mark": mark, "welcome": "tulich" in mark}


# ---------------------------------------------------------------------------
# Hộp quà bí mật
# ---------------------------------------------------------------------------

def open_box(ev: dict[str, Any], n: Any, today: _dt.date) -> dict[str, int]:
    """Mở hộp quà số n (từ 25/12; hết mùa vẫn mở được) → món vào kho. Sửa `ev` tại chỗ."""
    try:
        n = int(n)
    except (TypeError, ValueError):
        raise LeError("Không có hộp quà này.") from None
    if n not in BOX_DOORS:
        raise LeError("Không có hộp quà này.")
    d = BOX_DOORS[n]
    if str(d) not in ev["open"]:
        raise LeError("Mở ngăn %d/12 của tủ lịch để có hộp quà này đã nhé." % d)
    if str(n) in ev["box"]:
        raise LeError("Hộp quà này mở rồi.")
    if today < BOX_DAY:
        raise LeError("Hộp quà bí mật mở được từ sáng 25/12 — lắc thử đoán xem nhé!")
    ev["box"][str(n)] = today.isoformat()
    return dict(DOORS[d]["item"])


# ---------------------------------------------------------------------------
# Trạng thái để vẽ
# ---------------------------------------------------------------------------

def parts(ev: dict[str, Any]) -> list[str]:
    """Phần đã mở (cây + nhà + sân), theo thứ tự ngăn."""
    return [DOORS[d]["part"] for d in sorted(DOORS) if str(d) in ev["open"] and DOORS[d].get("part")]


def boxes(ev: dict[str, Any], today: _dt.date) -> list[dict[str, Any]]:
    out = []
    for n, d in sorted(BOX_DOORS.items()):
        if str(d) not in ev["open"]:
            continue
        opened = str(n) in ev["box"]
        it = next(iter(DOORS[d]["item"]))
        out.append({"n": n, "d": d, "opened": opened, "can": not opened and today >= BOX_DAY,
                    "shake": list(SHAKE[n]), "item": it if opened else ""})
    return out


def simulate(day: _dt.date, reviewed: bool = True) -> dict[str, Any]:
    """Sổ giả cho "Xem thử sự kiện" (admin, không ghi gì): mọi ngăn tới ngày `day` đã mở (reviewed=False: ngăn hôm nay chưa
    mở), hộp quà đã mở nếu `day` sau 25/12 (ngày 25 để bấm thử mở hộp)."""
    ev = empty()
    last = min(DOORS_N, (day - FIRST).days + 1) if day >= FIRST else 0
    if not reviewed and last and door_date(last) == day:
        last -= 1
    for d in range(1, max(0, last) + 1):
        ev["open"][str(d)] = {"d": door_date(d).isoformat(), "b": 0}
    if day >= FIRST:
        ev["gift"] = {"tulich": FIRST.isoformat(), "tree": FIRST.isoformat()}
    if day > BOX_DAY:
        ev["box"] = {str(n): BOX_DAY.isoformat() for n, d in BOX_DOORS.items() if str(d) in ev["open"]}
    return ev


def view(ev: dict[str, Any], today: _dt.date, reviewed: Any, frozen: Any, reviews_today: Any,
         names: dict[str, str] | None = None) -> dict[str, Any]:
    """Cho JS (data.le). names: tên món ({id: tên}) để ghi trên ngăn đã mở / thẻ "Mở được!"."""
    rv, fz = _days(reviewed), _days(frozen)
    names = names or {}
    doors = []
    tomorrow = today + _dt.timedelta(days=1)
    for d in sorted(DOORS):
        info = DOORS[d]
        st = door_state(ev, d, today, rv, fz)
        op = ev["open"].get(str(d))
        known = st == "open" or (door_date(d) == tomorrow and st == "future")     # ngăn mai hé bóng món
        iso = door_date(d).isoformat()
        doors.append({"d": d, "state": st, "kind": info["kind"], "kname": KIND_NAMES[info["kind"]],
                      "name": info["name"] if known else "", "desc": info["desc"] if st == "open" else "",
                      "at": op["d"] if op else "", "bu": bool(op and op["b"]), "peek": known and st == "future",
                      "item": next(iter(info.get("item") or {}), "") if known else "",
                      "part": info.get("part", "") if known else "",
                      "tiles": list(info.get("tiles") or []) if known else [],
                      "box": info.get("box", 0) if known else 0,
                      "frozen": iso in fz and iso not in rv})
    ready = [x["d"] for x in doors if x["state"] == "ready"]
    miss = [x["d"] for x in doors if x["state"] == "miss"]
    ph = phase(today)
    return {
        "id": EV_ID, "year": YEAR, "phase": ph, "active": active(today), "today": today.isoformat(),
        "day": today.day if today.month == 12 and today.year == YEAR else 0,
        "doors": doors, "opened": len(ev["open"]), "total": DOORS_N, "ready": ready, "miss": miss,
        "makeup": {"left": makeup_left(ev, today, reviews_today) if active(today) else 0,
                   "next": makeup_next(ev, today, reviews_today) if active(today) else None,
                   "per": MAKEUP_PER, "max": MAKEUP_MAX, "reviews": _reviews(reviews_today),
                   "used": int(ev["bu"].get(today.isoformat(), 0))},
        "parts": parts(ev), "boxes": boxes(ev, today), "box_day": BOX_DAY.isoformat(), "end": END.isoformat(),
        "gift": dict(ev["gift"]),
        "names": {k: v for k, v in names.items() if k.startswith("le_") or k == TREE},
    }


def news_line(ev: dict[str, Any] | None, today: _dt.date, reviewed: Any, frozen: Any, reviews_today: Any = 0) -> dict[str, Any] | None:
    """Dòng cho thẻ Hôm nay / Tin làng ({id, text, short, low?}). None = không có gì để nói."""
    ph = phase(today)
    if ph == "pre":
        left = (FIRST - today).days
        return {"id": "le_pre", "low": left > 1,
                "text": ("Mai mở Lịch chờ Giáng sinh — 24 ngăn quà trang trí" if left == 1 else
                         "1/12 mở Lịch chờ Giáng sinh — 24 ngăn quà trang trí"),
                "short": "mai mở Lịch chờ Giáng sinh" if left == 1 else "1/12 mở Lịch chờ Giáng sinh"}
    if ev is None:
        return None
    if ph == "done" or not active(today):
        bx = [b for b in boxes(ev, today) if b["can"]]
        if bx:
            return {"id": "le_box", "text": "Còn %d hộp quà bí mật chưa mở" % len(bx), "short": "mở hộp quà bí mật"}
        return None
    rv, fz = _days(reviewed), _days(frozen)
    sts = {d: door_state(ev, d, today, rv, fz) for d in DOORS}
    ready = sorted(d for d, s in sts.items() if s == "ready")
    if ready:
        if len(ready) == 1:
            return {"id": "le_ready", "text": "Tủ lịch Giáng sinh: ngăn %d/12 chờ mở" % ready[0],
                    "short": "ngăn %d/12 của tủ lịch chờ mở" % ready[0]}
        return {"id": "le_ready", "text": "Tủ lịch Giáng sinh: %d ngăn chờ mở" % len(ready),
                "short": "%d ngăn tủ lịch chờ mở" % len(ready)}
    if today <= door_date(DOORS_N) and sts.get(today.day) == "wait":
        return {"id": "le_wait", "text": "Tủ lịch Giáng sinh: ôn 1 thẻ là mở ngăn %d/12" % today.day,
                "short": "ôn 1 thẻ mở ngăn %d/12" % today.day}
    miss = [d for d, s in sts.items() if s == "miss"]
    if miss and makeup_left(ev, today, reviews_today) > 0:
        return {"id": "le_makeup", "text": "Tủ lịch: mở bù được 1 ngăn lỡ ngày", "short": "mở bù 1 ngăn tủ lịch"}
    bx = [b for b in boxes(ev, today) if b["can"]]
    if bx:
        return {"id": "le_box", "text": "Hộp quà bí mật dưới gốc cây mở được rồi!", "short": "mở hộp quà bí mật"}
    if miss:
        nxt = makeup_next(ev, today, reviews_today)
        if nxt:
            return {"id": "le_makeup_next", "low": True, "text": "Ôn thêm %d lượt nữa mở bù 1 ngăn tủ lịch" % nxt,
                    "short": "ôn %d lượt mở bù 1 ngăn" % nxt}
    return None


def soon_line(today: _dt.date) -> dict[str, Any] | None:
    """Dòng "Sắp tới" của Tin làng: ngày mở tủ lịch / mở hộp quà."""
    for at, text in ((FIRST, "Lịch chờ Giáng sinh mở"), (BOX_DAY, "Mở hộp quà bí mật")):
        if 0 < (at - today).days <= SOON_DAYS:
            return {"id": "le_soon", "at": at.isoformat(), "text": text}
    return None


# ---------------------------------------------------------------------------
# Lưu trữ (khoá collection + sao lưu file, như finds_core.EventStore)
# ---------------------------------------------------------------------------

class LeStore:
    def __init__(self, path: str, col_getter: Callable[[], Any] | None = None) -> None:
        self.path = path
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def raw(self, strict: bool = True) -> dict[str, Any]:
        col = self._col()
        if col is not None:
            try:
                raw = backup.read_config(col, LE_KEY)
            except backup.ReadFailed:
                if strict:          # đọc lỗi không phải "trống" — đọc để ghi thì dừng (không ghi sổ trống đè sổ thật)
                    raise
                raw = None
            return dict(raw) if isinstance(raw, dict) else {}
        try:
            with open(self.path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            raw = None
        return dict(raw) if isinstance(raw, dict) else {}

    def load(self) -> dict[str, Any]:
        """Sự kiện năm nay (đã làm sạch). Đọc lỗi → bản trống có dấu `_damaged` (vẫn vẽ được); ghi bản đó bị từ chối."""
        try:
            return clean_ev(self.raw().get(EV_ID))
        except backup.ReadFailed:
            out = empty()
            out["_damaged"] = True
            return out

    def payload(self, ev: dict[str, Any]) -> dict[str, Any]:
        if ev.get("_damaged"):
            raise backup.ReadFailed(LE_KEY)
        raw = self.raw()                       # giữ khoá lạ của bản sau (đọc lỗi → ReadFailed, không ghi)
        cur = raw.get(EV_ID) if isinstance(raw.get(EV_ID), dict) else {}
        merged = merge_ev(ev, cur)             # máy khác vừa mở thêm ngăn (đồng bộ) → không mất
        out_ev = dict(cur)
        out_ev.update(merged)
        raw["v"] = 1
        raw[EV_ID] = out_ev
        return raw

    def write(self, ev: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
        """Phần ghi để GardenState.save(extra=…) ghi cùng một lần với ví."""
        return (LE_KEY, self.path, self.payload(ev))

    def save(self, ev: dict[str, Any]) -> None:
        raw = self.payload(ev)
        col = self._col()
        if col is not None:
            backup.put_config(col, LE_KEY, raw)
        try:
            backup.write_backup(self.path, backup.backup_payload(raw, col) if col is not None else raw, col)
        except OSError as err:
            if col is None:
                raise
            print(f"[kotoba_batake] le backup file: {err}")
