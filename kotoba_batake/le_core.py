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

1.36.1 (thêm khoá trong cùng "noel2026", chỉ có khi đã dùng — bản 1.36.0 giữ nguyên khoá lạ khi ghi):
  "cards": [thiệp | {"at"} (ô trống / đã xoá) ×3], "hang": {"i": thiệp treo lên cây, "at"}, "santa": {"seen", "read"},
  "pack": {"at", "items", "tiles"} (đã cất đồ 1/1), "prev": {"<gian>:<wall|floor>": mẫu trước khi dùng mẫu Noel},
  "recv": [{"k": mã thiệp nhận, "at", "x"?: đã xoá}], "fixn": {ngày: số lần nhờ Gemini sửa điều ước}.
- Thiệp 120 × 80: khung (4 kiểu), sticker (hình có sẵn của vườn), lời chúc 2 dòng + câu chúc 7 tiếng; mặt sau điều ước
  (tiếng Việt / tiếng đang học, "Nhờ Gemini sửa" khi bấm). Treo lên cây cho ông già Noel tới 18:00 ngày 24 (giờ máy).
- Ông già Noel ghé từ 18:00 ngày 24 (giờ máy): tối 24 lần đầu mở vườn xem cảnh đêm; ngày Anki 25–31/12 lần đầu mở vườn có
  thư (viết sẵn — không gọi Gemini) + "Xem lại đêm qua"; bánh quy còn vụn.
- Ngày Anki ≥ 1/1: lần đầu mở vườn StackChan cất đồ Noel (tuần lộc đèn, bánh) vào Kho đồ, gian đang dùng tường / sàn Noel về
  mẫu dùng trước đó. Tủ lịch, thiệp, thư ở Album → Kỷ niệm.
"""
from __future__ import annotations

import base64
import datetime as _dt
import json
import re
import unicodedata
import zlib
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
    _clean_more(raw, out)
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
    _merge_more(out, other)
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


def news_line(ev: dict[str, Any] | None, today: _dt.date, reviewed: Any, frozen: Any, reviews_today: Any = 0,
              now: _dt.datetime | None = None) -> dict[str, Any] | None:
    """Dòng cho thẻ Hôm nay / Tin làng ({id, text, short, low?}). None = không có gì để nói. now (1.36.1, giờ máy): nhắc
    treo thiệp trước 18:00 ngày 24, thư của ông già Noel."""
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
    if now is not None and today == door_date(DOORS_N) and not came(now) and hang_index(ev) < 0:
        # hạn 18:00 hôm nay — trước cả ngăn chờ mở (ngăn chờ mở được tới hết 31/12)
        return {"id": "le_eve_card", "text": "Tối nay ông già Noel ghé — treo thiệp điều ước lên cây trước 18:00 nhé",
                "short": "treo thiệp lên cây trước 18:00"}
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
    if now is not None and came(now) and today >= BOX_DAY and not (ev.get("santa") or {}).get("read"):
        return {"id": "le_letter", "text": "Ông già Noel để lại thư dưới gốc cây", "short": "đọc thư của ông già Noel"}
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
    if now is not None and not came(now) and not any(filled(c) for c in cards(ev)):
        return {"id": "le_card", "low": True, "text": "Làm thiệp Giáng sinh, viết điều ước treo lên cây cho ông già Noel",
                "short": "làm thiệp Giáng sinh"}
    return None


def soon_line(today: _dt.date) -> dict[str, Any] | None:
    """Dòng "Sắp tới" của Tin làng: ngày mở tủ lịch / mở hộp quà."""
    for at, text in ((FIRST, "Lịch chờ Giáng sinh mở"), (BOX_DAY, "Mở hộp quà bí mật")):
        if 0 < (at - today).days <= SOON_DAYS:
            return {"id": "le_soon", "at": at.isoformat(), "text": text}
    return None


# ---------------------------------------------------------------------------
# 1.36.1: thiệp + điều ước, ông già Noel (đêm 24, thư sáng 25), cất đồ 1/1, thiệp nhận bằng mã
# ---------------------------------------------------------------------------

EVE = _dt.datetime(YEAR, 12, 24, 18, 0)      # ông già Noel ghé vườn (giờ máy) — thiệp treo trên cây khoá từ lúc này
CARD_W, CARD_H = 120, 80
CARDS_MAX = 3
FRAMES = ("den", "tuyet", "thong", "qua")
FRAME_NAMES = {"den": "Đèn nháy", "tuyet": "Tuyết trắng", "thong": "Cành thông", "qua": "Giấy quà"}
# câu chúc bấm là thêm (tiếng Việt + 6 tiếng của vườn)
CHUC = {"vi": "Giáng sinh an lành",
        "ja": "メリークリスマス",
        "en": "Merry Christmas",
        "zh": "圣诞快乐",
        "ko": "메리 크리스마스",
        "de": "Frohe Weihnachten",
        "fr": "Joyeux Noël"}
WISH_LANGS = ("vi", "ja", "en", "zh", "ko", "de", "fr")
LANG_VI = {"vi": "tiếng Việt", "ja": "tiếng Nhật", "en": "tiếng Anh", "zh": "tiếng Trung", "ko": "tiếng Hàn",
           "de": "tiếng Đức", "fr": "tiếng Pháp"}
T1_MAX = 28
T2_MAX = 28
WISH_MAX = 160
STICKERS_MAX = 12
RECV_MAX = 12            # thiệp nhận (còn giữ) tối đa
RECV_KEEP = 24           # kể cả dấu "đã xoá" (để máy khác không trả lại thiệp đã xoá)
FIX_PER_DAY = 5          # "Nhờ Gemini sửa" điều ước: số lần / ngày
CODE_PREFIX = "KBC1:"
CODE_MAX = 6000
# 1/1: cất vào Kho đồ (đèn sân của bộ Giáng sinh + đồ ăn); tủ lịch, tất, đèn ngủ, quả cầu tuyết, gấu bông… bày quanh năm
PACK_ITEMS = ("le_tuanloc", "le_banhquy", "le_banhkem")
NOEL_TILES = WALLS + FLOORS
STICKER_RE = re.compile(r"^[a-z][a-z0-9_]{0,39}$")
DT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$")
PREV_RE = re.compile(r"^(room|kitchen|bedroom):(wall|floor)$")
TILE_ID_RE = re.compile(r"^[a-z0-9_]{1,40}$")
_CTRL = re.compile("[\x00-\x08\x0b-\x1f\x7f​-‏‪-‮⁦-⁩﻿]")
# Thư của ông già Noel: lời chào + ký tên theo Ngôn ngữ trong vườn (thân thư tiếng Việt)
LETTER_GREET = {"vi": "Gửi cháu yêu,",
                "ja": "メリークリスマス！",
                "en": "Merry Christmas!",
                "zh": "圣诞快乐！",
                "ko": "메리 크리스마스!",
                "de": "Frohe Weihnachten!",
                "fr": "Joyeux Noël !"}
LETTER_SIGN = {"vi": "Ông già Noel",
               "ja": "サンタクロースより",
               "en": "Love, Santa",
               "zh": "圣诞老人",
               "ko": "산타 할아버지가",
               "de": "Dein Weihnachtsmann",
               "fr": "Le Père Noël"}


def _dtp(s: Any) -> _dt.datetime | None:
    if not isinstance(s, str) or not DT_RE.match(s):
        return None
    try:
        return _dt.datetime.fromisoformat(s)
    except ValueError:
        return None


def stamp(now: _dt.datetime) -> str:
    return now.replace(microsecond=0).isoformat(timespec="seconds")


def _bump(prev: Any, now: _dt.datetime) -> str:
    """Dấu thời gian của lần sửa mới: luôn sau lần sửa trước của chính ô đó (hai lần lưu trong cùng một giây, đồng hồ máy lùi)
    — không thì khi gộp với bản trong collection, lần sửa mới có thể thua bản cũ cùng dấu."""
    t = now.replace(microsecond=0)
    p = _dtp(prev.get("at") if isinstance(prev, dict) else prev)
    if p is not None and t <= p:
        t = p + _dt.timedelta(seconds=1)
    return stamp(t)


def _line(s: Any, limit: int) -> str:
    """Chữ một dòng: NFC, bỏ ký tự điều khiển / chiều chữ, xuống dòng → dấu cách, gộp khoảng trắng, cắt theo độ dài."""
    if not isinstance(s, str):
        return ""
    s = unicodedata.normalize("NFC", s)
    s = _CTRL.sub("", s.replace("\r", " ").replace("\n", " ").replace("\t", " "))
    s = re.sub(r" {2,}", " ", s).strip()
    return s[:limit].rstrip()


def _clamp(v: Any, lo: int, hi: int) -> int | None:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or v in (float("inf"), float("-inf")):
        return None
    return max(lo, min(hi, int(round(v))))


def _clean_sticker(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or not isinstance(raw.get("s"), str) or not STICKER_RE.match(raw["s"]):
        return None
    x, y = _clamp(raw.get("x"), -48, CARD_W), _clamp(raw.get("y"), -48, CARD_H)
    if x is None or y is None:
        return None
    out: dict[str, Any] = {"s": raw["s"], "x": x, "y": y}
    if raw.get("m") in (1, True):
        out["m"] = 1
    if raw.get("z") == 2:
        out["z"] = 2
    return out


def _clean_fix(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    src, sua = _line(raw.get("for"), WISH_MAX), _line(raw.get("sua"), 240)
    if not src or not sua:
        return None
    out: dict[str, Any] = {"for": src, "sua": sua}
    nx = _line(raw.get("nx"), 200)
    if nx:
        out["nx"] = nx
    loi = []
    for e in (raw.get("loi") if isinstance(raw.get("loi"), list) else [])[:3]:
        if isinstance(e, dict):
            g, s2, t = _line(e.get("goc"), 40), _line(e.get("sua"), 40), _line(e.get("gt"), 140)
            if g or s2:
                loi.append({"goc": g, "sua": s2, "gt": t})
    if loi:
        out["loi"] = loi
    return out


def filled(c: Any) -> bool:
    return bool(isinstance(c, dict) and c.get("f") in FRAMES)


def clean_card(raw: Any, wish: bool = True) -> dict[str, Any] | None:
    """Một thiệp (dữ liệu từ trang / máy khác / mã của bạn bè là không tin cậy). Không có khung = ô trống (giữ dấu thời
    gian `at` để máy khác không trả lại thiệp đã xoá). wish=False: chỉ mặt trước (mã gửi bạn không có điều ước)."""
    if not isinstance(raw, dict):
        return None
    at = raw.get("at") if _dtp(raw.get("at")) else None
    if raw.get("f") not in FRAMES:
        return {"at": at} if at else None
    st: list[dict[str, Any]] = []
    for x in (raw.get("st") if isinstance(raw.get("st"), list) else [])[:STICKERS_MAX * 3]:
        c = _clean_sticker(x)
        if c:
            st.append(c)
        if len(st) >= STICKERS_MAX:
            break
    out: dict[str, Any] = {"f": raw["f"], "st": st, "t1": _line(raw.get("t1"), T1_MAX), "t2": _line(raw.get("t2"), T2_MAX),
                           "c": raw.get("c") if raw.get("c") in CHUC else ""}
    if wish:
        out["w"] = _line(raw.get("w"), WISH_MAX)
        out["wl"] = raw.get("wl") if raw.get("wl") in WISH_LANGS else "vi"
        fx = _clean_fix(raw.get("fx"))
        if fx:
            out["fx"] = fx
    if at:
        out["at"] = at
    return out


def _clean_more(raw: dict[str, Any], out: dict[str, Any]) -> None:
    """Phần 1.36.1 của sổ (chỉ thêm khoá khi có nội dung — sổ 1.36.0 làm sạch ra giống hệt)."""
    cards_raw = raw.get("cards")
    if isinstance(cards_raw, list):
        cl = [clean_card(c) for c in cards_raw[:CARDS_MAX]]
        if any(cl):
            out["cards"] = cl + [None] * (CARDS_MAX - len(cl))
    hang = raw.get("hang")
    if isinstance(hang, dict) and _dtp(hang.get("at")):
        i = hang.get("i")
        out["hang"] = {"i": i if isinstance(i, int) and not isinstance(i, bool) and 0 <= i < CARDS_MAX else -1,
                       "at": hang["at"]}
    sa = raw.get("santa")
    if isinstance(sa, dict):
        o: dict[str, Any] = {}
        if _dtp(sa.get("seen")):
            o["seen"] = sa["seen"]
        if _iso(sa.get("read")):
            o["read"] = sa["read"]
        if isinstance(sa.get("facts"), str) and re.match(r"^[a-z0-9_,]{0,120}$", sa["facts"]):
            o["facts"] = sa["facts"]
        if o:
            out["santa"] = o
    pk = raw.get("pack")
    if isinstance(pk, dict) and _iso(pk.get("at")):
        items_raw = pk.get("items") if isinstance(pk.get("items"), dict) else {}
        items = {k: n for k, n in items_raw.items() if isinstance(k, str) and STICKER_RE.match(k)
                 and isinstance(n, int) and not isinstance(n, bool) and 0 < n < 100}
        tiles = []
        for t in (pk.get("tiles") if isinstance(pk.get("tiles"), list) else [])[:12]:
            if (isinstance(t, list) and len(t) == 4 and all(isinstance(v, str) and len(v) <= 40 for v in t)
                    and PREV_RE.match(t[0] + ":" + t[1])):
                tiles.append(list(t))
        out["pack"] = {"at": pk["at"], "items": items, "tiles": tiles}
    pv = raw.get("prev")
    if isinstance(pv, dict):
        o = {k: v for k, v in list(pv.items())[:20] if isinstance(k, str) and PREV_RE.match(k) and isinstance(v, str)
             and (v == "" or TILE_ID_RE.match(v))}
        if o:
            out["prev"] = o
    rc = raw.get("recv")
    if isinstance(rc, list):
        lst: list[dict[str, Any]] = []
        seen: set[str] = set()
        for e in rc[:RECV_KEEP * 2]:
            if not isinstance(e, dict) or not isinstance(e.get("k"), str) or not _iso(e.get("at")):
                continue
            k = re.sub(r"\s+", "", e["k"])
            if k in seen or not k.startswith(CODE_PREFIX) or len(k) > CODE_MAX:
                continue
            gone = e.get("x") in (1, True)
            if not gone and decode_card(k) is None:
                continue
            seen.add(k)
            ent: dict[str, Any] = {"k": k, "at": e["at"]}
            if gone:
                ent["x"] = 1
            lst.append(ent)
        if lst:
            out["recv"] = _trim_recv(lst)
    fx = raw.get("fixn")
    if isinstance(fx, dict):
        o2 = {d: min(99, n) for d, n in fx.items() if _iso(d) and isinstance(n, int) and not isinstance(n, bool) and n > 0}
        if o2:
            out["fixn"] = o2


def _at(c: Any) -> str:
    return (c or {}).get("at") or "" if isinstance(c, dict) else ""


def _trim_recv(lst: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Thiệp nhận: mới trước; giữ mọi thiệp còn (≤ RECV_MAX) + dấu đã xoá mới nhất cho đủ RECV_KEEP."""
    lst = sorted(lst, key=lambda e: (e["at"], e["k"]), reverse=True)
    live = [e for e in lst if not e.get("x")][:RECV_MAX]
    gone = [e for e in lst if e.get("x")][:max(0, RECV_KEEP - len(live))]
    keep = {id(e) for e in live + gone}
    return [e for e in lst if id(e) in keep]


def _newer(y: Any, x: Any) -> bool:
    """y mới hơn x (cùng dấu thời gian — hai máy cùng phút: chọn cố định theo nội dung, để gộp A + B = B + A)."""
    ay, ax = _at(y), _at(x)
    if ay != ax:
        return ay > ax
    return json.dumps(y, sort_keys=True, ensure_ascii=False) > json.dumps(x, sort_keys=True, ensure_ascii=False)


def _first(sa: dict[str, Any]) -> str:
    return min([v for k, v in sa.items() if k in ("seen", "read")] or ["~"])


def _merge_more(out: dict[str, Any], other: dict[str, Any]) -> None:
    """Gộp phần 1.36.1 của hai máy: thiệp từng ô theo lần sửa sau, thiệp treo theo lần chọn sau, đã xem / đã đọc / đã cất
    ở máy nào cũng tính, thiệp nhận gộp (xoá ở máy nào cũng xoá)."""
    cb = other.get("cards")
    if cb:
        ca = out.get("cards")
        if not ca:
            out["cards"] = [dict(c) if c else None for c in cb]
        else:
            out["cards"] = [cb[i] if _newer(cb[i], ca[i]) else ca[i] for i in range(CARDS_MAX)]
    hb = other.get("hang")
    if hb and (not out.get("hang") or _newer(hb, out["hang"])):
        out["hang"] = dict(hb)
    sb = other.get("santa")
    if sb:
        sa = dict(out.get("santa") or {})
        fa, fb = sa.get("facts"), sb.get("facts")
        # thứ ông già Noel thấy: của máy ghi nhận ông ghé trước
        first_b = (_first(sb), fb or "") < (_first(sa), fa or "") if fa is not None and fb is not None else fa is None
        for k, v in sb.items():
            if k != "facts" and (k not in sa or v < sa[k]):
                sa[k] = v
        if fb is not None and first_b:
            sa["facts"] = fb
        out["santa"] = sa
    pb = other.get("pack")
    if pb and (not out.get("pack") or (pb["at"], json.dumps(pb, sort_keys=True)) < (out["pack"]["at"], json.dumps(out["pack"], sort_keys=True))):
        out["pack"] = pb
    prv = other.get("prev")
    if prv:
        out["prev"] = dict(prv, **(out.get("prev") or {}))
    rb = other.get("recv")
    if rb:
        by = {e["k"]: dict(e) for e in rb}
        for e in out.get("recv") or []:
            cur = by.get(e["k"])
            if cur is None:
                by[e["k"]] = dict(e)
            else:
                if e.get("x"):
                    cur["x"] = 1
                cur["at"] = min(cur["at"], e["at"])
        out["recv"] = _trim_recv(list(by.values()))
    fb = other.get("fixn")
    if fb:
        fa = dict(out.get("fixn") or {})
        for d, n in fb.items():
            fa[d] = max(fa.get(d, 0), n)
        out["fixn"] = fa


# ---- thiệp ----

def came(now: _dt.datetime) -> bool:
    """Ông già Noel đã ghé (từ 18:00 ngày 24/12, giờ máy)."""
    return now >= EVE


def cards(ev: dict[str, Any]) -> list[Any]:
    c = list(ev.get("cards") or [])
    return (c + [None] * CARDS_MAX)[:CARDS_MAX]


def hang_index(ev: dict[str, Any]) -> int:
    h = ev.get("hang") or {}
    i = h.get("i", -1)
    return i if isinstance(i, int) and 0 <= i < CARDS_MAX and filled(cards(ev)[i]) else -1


def taken_index(ev: dict[str, Any], now: _dt.datetime) -> int:
    """Thiệp ông già Noel đã mang đi (thiệp đang treo lúc 18:00 ngày 24) — giữ làm kỷ niệm, không sửa / xoá."""
    return hang_index(ev) if came(now) else -1


def _slot(i: Any) -> int:
    try:
        i = int(i)
    except (TypeError, ValueError):
        raise LeError("Không có thiệp này.") from None
    if not 0 <= i < CARDS_MAX:
        raise LeError("Không có thiệp này.")
    return i


def _workshop(today: _dt.date) -> None:
    if today < FIRST:
        raise LeError("Xưởng thiệp mở từ 1/12.")
    if today > END:
        raise LeError("Mùa Giáng sinh đã qua — thiệp giữ ở Album → Kỷ niệm (lưu ảnh / chép mã vẫn được).")


def save_card(ev: dict[str, Any], i: Any, raw: Any, today: _dt.date, now: _dt.datetime) -> dict[str, Any]:
    """Lưu thiệp ô i (1/12 – 31/12). Bản Gemini sửa chỉ giữ của sổ (không tin trang) và khi điều ước không đổi."""
    i = _slot(i)
    _workshop(today)
    if taken_index(ev, now) == i:
        raise LeError("Ông già Noel đã mang thiệp này đi rồi — làm một thiệp khác nhé.")
    c = clean_card(raw)
    if not filled(c):
        raise LeError("Thiệp chưa có khung.")
    assert c is not None
    c.pop("fx", None)
    old = cards(ev)[i]
    if filled(old) and old.get("fx") and old["fx"]["for"] == c["w"]:
        c["fx"] = old["fx"]
    c["at"] = _bump(old, now)
    lst = cards(ev)
    lst[i] = c
    ev["cards"] = lst
    return c


def delete_card(ev: dict[str, Any], i: Any, today: _dt.date, now: _dt.datetime) -> None:
    i = _slot(i)
    _workshop(today)
    if taken_index(ev, now) == i:
        raise LeError("Ông già Noel đã mang thiệp này đi — giữ làm kỷ niệm nhé.")
    lst = cards(ev)
    lst[i] = {"at": _bump(lst[i], now)}
    ev["cards"] = lst
    if (ev.get("hang") or {}).get("i") == i:
        ev["hang"] = {"i": -1, "at": _bump(ev.get("hang"), now)}


def hang_card(ev: dict[str, Any], i: Any, today: _dt.date, now: _dt.datetime) -> None:
    """Treo thiệp ô i lên cây cho ông già Noel (i < 0: gỡ xuống). Mỗi lúc một thiệp; tới 18:00 ngày 24."""
    if came(now):
        raise LeError("Ông già Noel đã ghé rồi — thiệp trên cây không đổi được nữa.")
    _workshop(today)
    try:
        i = int(i)
    except (TypeError, ValueError):
        raise LeError("Không có thiệp này.") from None
    if i >= 0:
        i = _slot(i)
        if not filled(cards(ev)[i]):
            raise LeError("Ô này chưa có thiệp.")
    ev["hang"] = {"i": i if i >= 0 else -1, "at": _bump(ev.get("hang"), now)}


def fix_left(ev: dict[str, Any], today: _dt.date) -> int:
    return max(0, FIX_PER_DAY - int((ev.get("fixn") or {}).get(today.isoformat(), 0)))


def fix_mark(ev: dict[str, Any], today: _dt.date) -> None:
    lo = (today - _dt.timedelta(days=3)).isoformat()
    fx = {d: n for d, n in (ev.get("fixn") or {}).items() if d >= lo}
    fx[today.isoformat()] = fx.get(today.isoformat(), 0) + 1
    ev["fixn"] = fx


def fix_set(ev: dict[str, Any], i: int, text: str, res: dict[str, Any], now: _dt.datetime | None = None) -> bool:
    """Gắn bản Gemini sửa vào thiệp ô i nếu điều ước vẫn là `text` (người dùng chưa sửa trong lúc chờ). Là một lần sửa thiệp
    (dấu thời gian mới — gộp với collection thì bản có bản sửa thắng)."""
    lst = cards(ev)
    c = lst[i] if 0 <= i < CARDS_MAX else None
    if not filled(c) or c.get("w") != text:
        return False
    fx = _clean_fix(dict(res, **{"for": text}))
    if not fx:
        return False
    c = dict(c, fx=fx, at=_bump(c, now or _dt.datetime.now()))
    lst[i] = c
    ev["cards"] = lst
    return True


# ---- mã thiệp gửi bạn (chỉ mặt trước) ----

def card_code(card: Any) -> str:
    c = clean_card(card, wish=False)
    if not filled(c):
        raise LeError("Thiệp trống.")
    assert c is not None
    c.pop("at", None)
    z = zlib.compress(json.dumps(c, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)
    body = base64.urlsafe_b64encode(z).decode("ascii").rstrip("=")
    return CODE_PREFIX + body + ":" + ("%08x" % (zlib.crc32(z) & 0xFFFFFFFF))[:6]


def decode_card(code: Any) -> dict[str, Any] | None:
    """Mã "KBC1:…" → mặt trước thiệp đã làm sạch; hỏng / không phải mã thiệp → None."""
    if not isinstance(code, str):
        return None
    s = re.sub(r"\s+", "", code)
    if not s.startswith(CODE_PREFIX) or len(s) > CODE_MAX:
        return None
    body, _, crc = s[len(CODE_PREFIX):].rpartition(":")
    if not body or not re.match(r"^[A-Za-z0-9_-]+$", body):
        return None
    try:
        z = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
    except ValueError:
        return None
    if ("%08x" % (zlib.crc32(z) & 0xFFFFFFFF))[:6] != crc:
        return None
    try:
        d = zlib.decompressobj()
        raw = d.decompress(z, 16000)
        if d.unconsumed_tail:
            return None
        obj = json.loads(raw.decode("utf-8"))
    except (zlib.error, ValueError):
        return None
    c = clean_card(obj, wish=False)
    if not filled(c):
        return None
    assert c is not None
    c.pop("at", None)
    return c


def recv_add(ev: dict[str, Any], code: Any, today: _dt.date) -> dict[str, Any]:
    c = decode_card(code)
    if c is None:
        raise LeError("Mã thiệp không đúng — chép lại đúng đoạn bắt đầu bằng “%s” nhé." % CODE_PREFIX)
    k = card_code(c)
    lst = [dict(e) for e in ev.get("recv") or []]
    live = [e for e in lst if not e.get("x")]
    for e in lst:
        if e["k"] == k:
            if not e.get("x"):
                raise LeError("Thiệp này đã có trong Album rồi.")
            if len(live) >= RECV_MAX:
                break
            e.pop("x", None)
            e["at"] = today.isoformat()
            ev["recv"] = _trim_recv(lst)
            return c
    if len(live) >= RECV_MAX:
        raise LeError("Album giữ tối đa %d thiệp nhận — xoá bớt thiệp cũ nhé." % RECV_MAX)
    lst = [e for e in lst if e["k"] != k]
    lst.insert(0, {"k": k, "at": today.isoformat()})
    ev["recv"] = _trim_recv(lst)
    return c


def recv_del(ev: dict[str, Any], k: Any) -> None:
    lst = [dict(e) for e in ev.get("recv") or []]
    for e in lst:
        if e["k"] == k and not e.get("x"):
            e["x"] = 1
            ev["recv"] = _trim_recv(lst)
            return
    raise LeError("Không còn thiệp này.")


def recv_list(ev: dict[str, Any]) -> list[dict[str, Any]]:
    out = []
    for e in ev.get("recv") or []:
        if e.get("x"):
            continue
        c = decode_card(e["k"])
        if c:
            out.append({"k": e["k"], "at": e["at"], "card": c})
    return out


# ---- ông già Noel, thư ----

def facts(ev: dict[str, Any], placed: dict[str, int]) -> str:
    """Những thứ ông già Noel thấy trong vườn (chụp lại lúc ông ghé — thư sau này không đổi khi dọn đồ)."""
    f = [p for p in parts(ev) if p in ("star", "lights", "swag", "path", "wreath")]
    for iid, code in (("le_nguoituyet", "snowman"), ("le_tuanloc", "deer"), ("le_banhquy", "cookie"), (TREE, "tree")):
        if int(placed.get(iid, 0) or 0) > 0:
            f.append(code)
    return ",".join(f)


def santa_view(ev: dict[str, Any], today: _dt.date, now: _dt.datetime) -> dict[str, Any]:
    """due: lần đầu mở vườn tối 24 (ngày Anki 24, từ 18:00 giờ máy) → cảnh đêm · morning: ngày Anki 25–31/12 chưa đọc thư →
    thư + "Xem lại đêm qua"."""
    sa = ev.get("santa") or {}
    c = came(now)
    return {"came": c, "eve": EVE.isoformat(timespec="minutes"),
            "due": bool(c and today == door_date(DOORS_N) and not sa.get("seen")),
            "morning": bool(c and BOX_DAY <= today <= END and not sa.get("read")),
            "seen": sa.get("seen", ""), "read": sa.get("read", "")}


def mark_seen(ev: dict[str, Any], now: _dt.datetime, fx: str) -> None:
    sa = dict(ev.get("santa") or {})
    sa.setdefault("seen", stamp(now))
    sa.setdefault("facts", fx)
    ev["santa"] = sa


def mark_read(ev: dict[str, Any], today: _dt.date, fx: str) -> None:
    sa = dict(ev.get("santa") or {})
    sa.setdefault("read", today.isoformat())
    sa.setdefault("facts", fx)
    ev["santa"] = sa


def _join(xs: list[str]) -> str:
    return xs[0] if len(xs) == 1 else ", ".join(xs[:-1]) + " và " + xs[-1]


def letter(ev: dict[str, Any], today: _dt.date, now: _dt.datetime, placed: dict[str, int] | None = None) -> dict[str, Any] | None:
    """Thư của ông già Noel (viết sẵn — không gọi Gemini): có từ ngày Anki 25/12 sau khi ông ghé. Lời chào + ký tên theo
    Ngôn ngữ trong vườn (trang chọn), thân thư tiếng Việt; nhắc ≤ 3 thứ đã bày, bánh quy, điều ước trên thiệp đã treo."""
    if not came(now) or today < BOX_DAY:
        return None
    if not (ev["open"] or ev["gift"] or any(filled(c) for c in cards(ev))):
        return None
    sa = ev.get("santa") or {}
    fs = set((sa.get("facts") if isinstance(sa.get("facts"), str) else facts(ev, placed or {})).split(","))
    seen: list[str] = []
    if "star" in fs:
        seen.append("ngôi sao trên đỉnh cây thông")
    elif "lights" in fs:
        seen.append("cây thông sáng đèn")
    if "swag" in fs:
        seen.append("dây đèn võng qua sân")
    elif "path" in fs:
        seen.append("đèn lối đi trước sân")
    if "wreath" in fs:
        seen.append("vòng hoa trên cửa")
    if "snowman" in fs:
        seen.append("bạn người tuyết khăn đỏ")
    body = []
    p1 = "Đêm qua ông ghé vườn của cháu."
    if seen:
        p1 += " Từ trên trời ông đã thấy " + _join(seen[:3]) + " — đẹp lắm!"
    if "deer" in fs:
        p1 += " Mấy chú tuần lộc của ông cứ ngó mãi hai bạn tuần lộc đèn trong sân."
    body.append(p1)
    if "cookie" in fs:
        body.append("Cảm ơn cháu đã để bánh quy với sữa — ông ăn hết rồi, chỉ còn ít vụn trên khay thôi.")
    hi = hang_index(ev)
    c = cards(ev)[hi] if hi >= 0 else None
    wish, wl = "", "vi"
    if c:
        wish, wl = c.get("w") or "", c.get("wl") or "vi"
        if wish:
            body.append("Ông đã đọc điều ước trên thiệp của cháu" +
                        (" — viết bằng %s giỏi quá" % LANG_VI.get(wl, "ngoại ngữ") if wl != "vi" else "") +
                        ". Ông cất thiệp thật kỹ rồi.")
        else:
            body.append("Ông đã nhận tấm thiệp cháu treo trên cây, ông cất thật kỹ rồi.")
    else:
        body.append("Năm nay ông chưa thấy thiệp trên cây — năm sau treo một tấm cho ông nhé.")
    n = len(ev["open"])
    if n >= 20:
        body.append("Cả tháng cháu mở %d / %d ngăn tủ lịch — chăm ôn bài thật đấy, ông vui lắm." % (n, DOORS_N))
    elif n:
        body.append("Tháng này cháu mở được %d ngăn tủ lịch. Mỗi ngày ôn một chút là giỏi rồi." % n)
    bx = [b for b in boxes(ev, today) if not b["opened"]]
    if bx:
        body.append("Dưới gốc cây có %d hộp quà — mở được rồi đấy." % len(bx))
    body.append("Giáng sinh vui vẻ, học tiếp thật vui nhé!")
    return {"greet": dict(LETTER_GREET), "sign": dict(LETTER_SIGN), "body": body, "wish": wish, "wl": wl,
            "date": "25/12/%d" % YEAR, "card": hi}


# ---- cất đồ 1/1 ----

def pack_due(ev: dict[str, Any], today: _dt.date) -> bool:
    """Lần đầu mở vườn từ ngày Anki 1/1: cất đồ Noel (một lần — đã cất ở máy khác thì thôi)."""
    return today > END and "pack" not in ev and bool(ev["open"] or ev["gift"])


def pack_plan(ev: dict[str, Any], placed: dict[str, int], use: dict[str, Any]) -> dict[str, Any]:
    """{"items": {món: số đang bày → cất vào Kho đồ}, "tiles": [[gian, wall|floor, mẫu Noel, mẫu trả lại ("" = theo kiểu
    nhà)]]}. use: decor["use"] ({gian: {wall, floor}})."""
    items = {iid: int(placed[iid]) for iid in PACK_ITEMS if int(placed.get(iid, 0) or 0) > 0}
    tiles = []
    prev = ev.get("prev") or {}
    for room in ("room", "kitchen", "bedroom"):
        slots = use.get(room) if isinstance(use, dict) and isinstance(use.get(room), dict) else {}
        for slot in ("wall", "floor"):
            cur = slots.get(slot)
            if cur in NOEL_TILES:
                back = prev.get(room + ":" + slot, "")
                tiles.append([room, slot, cur, "" if back in NOEL_TILES else back])
    return {"items": items, "tiles": tiles}


def mark_pack(ev: dict[str, Any], today: _dt.date, plan: dict[str, Any]) -> None:
    ev["pack"] = {"at": today.isoformat(), "items": dict(plan.get("items") or {}),
                  "tiles": [list(t) for t in plan.get("tiles") or []]}


def remember_prev(ev: dict[str, Any], room: str, slot: str, cur: Any) -> bool:
    """Gian sắp dùng mẫu Noel: nhớ mẫu đang dùng (không phải mẫu Noel) để 1/1 trả lại. Trả True nếu sổ đổi."""
    key = "%s:%s" % (room, slot)
    if not PREV_RE.match(key) or cur in NOEL_TILES:
        return False
    cur = cur if isinstance(cur, str) and TILE_ID_RE.match(cur or "_") else ""
    prev = dict(ev.get("prev") or {})
    if prev.get(key) == cur and key in prev:
        return False
    prev[key] = cur
    ev["prev"] = prev
    return True


def stickers(ev: dict[str, Any]) -> list[str]:
    """Sticker món của sự kiện đã nhận (tủ lịch, món của ngăn đã mở, quà của hộp đã mở) — theo thứ tự ngăn."""
    got = expected_items(ev)
    out = [TULICH] if got.get(TULICH) else []
    for d in sorted(DOORS):
        for iid in DOORS[d].get("item") or {}:
            if got.get(iid) and iid not in out:
                out.append(iid)
    return out


def view_more(ev: dict[str, Any], today: _dt.date, now: _dt.datetime, placed: dict[str, int] | None = None) -> dict[str, Any]:
    """Phần 1.36.1 của data.le: thiệp, ông già Noel, thư, cất đồ, thiệp nhận."""
    cs = cards(ev)
    tk = taken_index(ev, now)
    return {
        "cards": [c if filled(c) else None for c in cs], "hang": hang_index(ev), "taken": tk,
        "card_edit": FIRST <= today <= END, "hang_edit": FIRST <= today <= END and not came(now),
        "santa": santa_view(ev, today, now), "eaten": came(now),
        "letter": letter(ev, today, now, placed),
        "pack": ev.get("pack"), "recv": recv_list(ev), "fix_left": fix_left(ev, today),
        "frames": [{"id": f, "name": FRAME_NAMES[f]} for f in FRAMES], "chuc": dict(CHUC),
        "stickers": stickers(ev), "now": stamp(now), "code_prefix": CODE_PREFIX,
        "limits": {"t1": T1_MAX, "t2": T2_MAX, "wish": WISH_MAX, "stickers": STICKERS_MAX, "cards": CARDS_MAX,
                   "recv": RECV_MAX, "w": CARD_W, "h": CARD_H},
    }


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
