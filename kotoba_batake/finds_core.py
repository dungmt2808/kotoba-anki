"""ことば畑 1.28 — nhặt đồ theo vùng + Hộp sưu tầm, gánh hàng rong.

Lộ trình người dùng chốt 07/11 (`KE_HOACH_Y_TUONG_HANG_NGAY.md` ý 6, 7 + luật "FOMO lành mạnh" mục 1). Thuần Python (không
import anki / aqt) để test offline bằng ngày giả.

Chỗ lấp lánh (ý 6)
- Mỗi 10 lượt ôn hôm nay (đếm revlog: cả lượt ôn ở màn ôn thường, điện thoại; bấm Lại cũng tính) mở một chỗ lấp lánh,
  tối đa 3 chỗ một ngày. Hết ngày Anki thì thôi, không dồn sang hôm sau, lỡ không mất gì.
- Chỗ nằm ở Sân vườn hoặc một vùng đã mở. Cảnh của 3 chỗ trong ngày chốt một lần (lúc vườn mở lần đầu trong ngày) theo
  thứ tự: vùng còn thiếu nhiều món trước, cùng mức thì theo ngày (đổi mỗi ngày).
- Bấm nhặt → Python chọn món của cảnh đó: món chưa có được ưu tiên ("bảo hiểm"), đủ cả rồi thì nhặt trùng đổi 3 xu.
  Món theo mùa chỉ nhặt được trong mùa (năm sau có lại). Đủ 6 món một bộ → tặng một món trang trí (vào Kho đồ).

Gánh hàng rong (ý 7)
- Phiên cố định thứ Tư + Chủ nhật (ngày Anki). Hàng của phiên chọn theo ngày, không theo collection: ai cũng thấy cùng một
  phiên hàng. Đã mở Ga làng quê thì người bán ở Ga, chưa thì đứng ở Sân vườn.
- Mỗi phiên: một món chỉ có ở gánh hàng (8 món, mỗi món quay lại sau 8 phiên ≈ 4 tuần), hai món cửa hàng giảm 25%, một
  giống cây giảm 25% (có đủ giống rồi thì thêm một món cửa hàng giảm giá). Mỗi món mua một lần mỗi phiên.

Dữ liệu ở khoá collection `kotoba_batake_events` (đồng bộ AnkiWeb, bản cũ không đọc khoá này nên không xoá):
  {"v": 1, "found": {id: {"d": ngày nhặt đầu, "n": số lần}}, "days": {ngày: {"spots": [cảnh…], "picked": [1, 2]}},
   "sets": {cảnh: ngày tặng quà}, "ped": {ngày: [ô đã mua]}} — "days" / "ped" giữ 14 ngày. Khoá lạ của bản sau giữ nguyên.
Món quà / món gánh hàng là đồ trang trí lưu ở tầng NHA_KEY của ví (garden_core.FIND_ITEMS), bản ≥ 1.24 giữ hộ món lạ.
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import re
from typing import Any, Callable

EVENT_KEY = "kotoba_batake_events"
PER_SPOT = 10              # mỗi 10 lượt ôn hôm nay mở một chỗ lấp lánh
MAX_SPOTS = 3
DUP_COINS = 3              # nhặt trùng → 3 xu
KEEP_DAYS = 14
MARKET_DAYS = (2, 6)       # thứ Tư, Chủ nhật (date.weekday())
PED_OFF = 0.25             # giảm 25%
PED_EPOCH = _dt.date(2026, 1, 4)      # Chủ nhật — phiên số 0
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SCENES = ("yard", "beach", "shrine", "festival", "bamboo", "onsen", "station")
SCENE_NAMES = {"yard": "Sân vườn", "beach": "Bãi biển", "shrine": "Đền trên núi", "festival": "Phố lễ hội",
               "bamboo": "Rừng tre", "onsen": "Suối nước nóng", "station": "Ga làng quê"}

# Món nhặt được (thứ tự = thứ tự trong Hộp sưu tầm). ja: tên Nhật · kana: cách đọc · vi: nghĩa · m: tháng có (None = quanh năm)
FINDS: dict[str, dict[str, Any]] = {
    # --- Sân vườn
    # bộ Sân vườn ai cũng nhặt được ngay (chưa cần mở vùng) → không có món theo mùa, đủ bộ quanh năm
    "katatsumuri": {"scene": "yard", "ja": "かたつむり", "kana": "かたつむり", "vi": "ốc sên"},
    "yotsuba": {"scene": "yard", "ja": "四つ葉", "kana": "よつば", "vi": "cỏ bốn lá"},
    "koishi": {"scene": "yard", "ja": "小石", "kana": "こいし", "vi": "hòn sỏi"},
    "hane": {"scene": "yard", "ja": "鳥の羽", "kana": "とりのはね", "vi": "lông chim"},
    "biidama": {"scene": "yard", "ja": "ビー玉", "kana": "ビーだま", "vi": "viên bi ve"},
    "tane": {"scene": "yard", "ja": "種", "kana": "たね", "vi": "hạt giống lạ"},
    # --- Bãi biển
    "kaigara": {"scene": "beach", "ja": "貝殻", "kana": "かいがら", "vi": "vỏ sò"},
    "hitode": {"scene": "beach", "ja": "ヒトデ", "kana": "ひとで", "vi": "sao biển"},
    "makigai": {"scene": "beach", "ja": "巻き貝", "kana": "まきがい", "vi": "ốc xoắn"},
    "seaglass": {"scene": "beach", "ja": "シーグラス", "kana": "シーグラス", "vi": "mảnh thuỷ tinh biển"},
    "ryuboku": {"scene": "beach", "ja": "流木", "kana": "りゅうぼく", "vi": "gỗ trôi dạt"},
    "sakuragai": {"scene": "beach", "ja": "桜貝", "kana": "さくらがい", "vi": "sò hoa anh đào", "m": (3, 4, 5, 6)},
    # --- Đền trên núi
    "omamori": {"scene": "shrine", "ja": "お守り", "kana": "おまもり", "vi": "bùa hộ mệnh"},
    "suzu": {"scene": "shrine", "ja": "鈴", "kana": "すず", "vi": "chuông nhỏ"},
    "emafuda": {"scene": "shrine", "ja": "絵馬", "kana": "えま", "vi": "thẻ gỗ cầu nguyện"},
    "omikuji": {"scene": "shrine", "ja": "おみくじ", "kana": "おみくじ", "vi": "quẻ giấy"},
    "matsubokkuri": {"scene": "shrine", "ja": "松ぼっくり", "kana": "まつぼっくり", "vi": "quả thông"},
    "kouyou": {"scene": "shrine", "ja": "紅葉", "kana": "もみじ", "vi": "lá phong đỏ", "m": (10, 11, 12)},
    # --- Phố lễ hội
    "yoyofusen": {"scene": "festival", "ja": "ヨーヨー", "kana": "ヨーヨー", "vi": "bóng nước yo-yo"},
    "uchiwa": {"scene": "festival", "ja": "うちわ", "kana": "うちわ", "vi": "quạt giấy"},
    "omenko": {"scene": "festival", "ja": "お面", "kana": "おめん", "vi": "mặt nạ lễ hội"},
    "kazaguruma2": {"scene": "festival", "ja": "風車", "kana": "かざぐるま", "vi": "chong chóng"},
    "wataame": {"scene": "festival", "ja": "綿あめ", "kana": "わたあめ", "vi": "kẹo bông"},
    "kingyobukuro": {"scene": "festival", "ja": "金魚", "kana": "きんぎょ", "vi": "cá vàng trong túi", "m": (6, 7, 8, 9)},
    # --- Rừng tre
    "takenoko2": {"scene": "bamboo", "ja": "竹の子", "kana": "たけのこ", "vi": "măng tre", "m": (3, 4, 5)},
    "tentoumushi": {"scene": "bamboo", "ja": "てんとう虫", "kana": "てんとうむし", "vi": "bọ rùa"},
    "taketonbo": {"scene": "bamboo", "ja": "竹とんぼ", "kana": "たけとんぼ", "vi": "chuồn chuồn tre"},
    "sasabune": {"scene": "bamboo", "ja": "笹舟", "kana": "ささぶね", "vi": "thuyền lá tre"},
    "kokedama": {"scene": "bamboo", "ja": "苔玉", "kana": "こけだま", "vi": "cầu rêu"},
    "nukegara": {"scene": "bamboo", "ja": "蝉の抜け殻", "kana": "せみのぬけがら", "vi": "xác ve", "m": (6, 7, 8, 9)},
    # --- Suối nước nóng
    "onsentamago": {"scene": "onsen", "ja": "温泉卵", "kana": "おんせんたまご", "vi": "trứng onsen"},
    "yunohana": {"scene": "onsen", "ja": "湯の花", "kana": "ゆのはな", "vi": "hoa khoáng"},
    "tenugui": {"scene": "onsen", "ja": "手ぬぐい", "kana": "てぬぐい", "vi": "khăn tay"},
    "gyunyubin": {"scene": "onsen", "ja": "牛乳瓶", "kana": "ぎゅうにゅうびん", "vi": "chai sữa"},
    "yuoke": {"scene": "onsen", "ja": "湯桶", "kana": "ゆおけ", "vi": "chậu gỗ nhỏ"},
    "yuzu": {"scene": "onsen", "ja": "柚子", "kana": "ゆず", "vi": "quả thanh yên", "m": (11, 12, 1, 2)},
    # --- Ga làng quê
    "kippu": {"scene": "station", "ja": "切符", "kana": "きっぷ", "vi": "vé tàu cũ"},
    "kitte": {"scene": "station", "ja": "切手", "kana": "きって", "vi": "tem thư"},
    "ehagaki": {"scene": "station", "ja": "絵はがき", "kana": "えはがき", "vi": "bưu thiếp"},
    "kagi": {"scene": "station", "ja": "鍵", "kana": "かぎ", "vi": "chìa khoá"},
    "botan": {"scene": "station", "ja": "ボタン", "kana": "ボタン", "vi": "cúc áo"},
    "ekistamp": {"scene": "station", "ja": "駅スタンプ", "kana": "えきスタンプ", "vi": "con dấu nhà ga"},
}
FIND_ORDER = list(FINDS)
BY_SCENE: dict[str, list[str]] = {sc: [k for k in FIND_ORDER if FINDS[k]["scene"] == sc] for sc in SCENES}

# Quà đủ bộ (đồ trang trí, id trong garden_core.FIND_ITEMS)
SET_REWARD = {"yard": "tukinh", "beach": "kaifurin", "shrine": "mikujikake", "festival": "kingyochochin",
              "bamboo": "takeakari", "onsen": "ashiyu", "station": "posuto"}
# Món chỉ có ở gánh hàng (8 món, mỗi phiên một món; mỗi món quay lại sau 8 phiên) — giá ở garden_core.FIND_ITEMS["ped"]
PED_ONLY = ("denkeoquan", "luunuoc", "hoagiay", "mushikago", "nonla", "binhgom", "dongholac", "tetsubin")

MONTH_TEXT = {(3, 4, 5, 6): "tháng 3–6",
              (10, 11, 12): "tháng 10–12", (6, 7, 8, 9): "tháng 6–9", (3, 4, 5): "tháng 3–5", (11, 12, 1, 2): "tháng 11–2"}


def _h(*parts: Any) -> int:
    """Băm cố định (không phụ thuộc PYTHONHASHSEED) — chọn theo ngày, mọi máy cùng kết quả."""
    s = "|".join(str(p) for p in parts).encode("utf-8")
    return int(hashlib.sha1(s).hexdigest()[:12], 16)


def _iso(s: Any) -> _dt.date | None:
    if not isinstance(s, str) or not DATE_RE.match(s):
        return None
    try:
        return _dt.date.fromisoformat(s)
    except ValueError:
        return None


def in_season(fid: str, today: _dt.date) -> bool:
    m = FINDS[fid].get("m")
    return not m or today.month in m


def season_text(fid: str) -> str:
    m = FINDS[fid].get("m")
    return MONTH_TEXT.get(tuple(m), "theo mùa") if m else ""


# ---------------------------------------------------------------------------
# Làm sạch dữ liệu đã lưu (dữ liệu từ collection / máy khác là không tin cậy)
# ---------------------------------------------------------------------------

def clean(raw: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"found": {}, "days": {}, "sets": {}, "ped": {}}
    if not isinstance(raw, dict):
        return out
    found = raw.get("found") if isinstance(raw.get("found"), dict) else {}
    for fid in FIND_ORDER:
        e = found.get(fid)
        if isinstance(e, dict) and _iso(e.get("d")):
            try:
                n = int(e.get("n", 1))
            except (TypeError, ValueError):
                n = 1
            out["found"][fid] = {"d": e["d"], "n": max(1, min(100000, n))}
    days = raw.get("days") if isinstance(raw.get("days"), dict) else {}
    for ds, v in days.items():
        if not _iso(ds) or not isinstance(v, dict):
            continue
        spots = v.get("spots") if isinstance(v.get("spots"), list) else []
        spots = [s for s in spots if isinstance(s, str) and s in SCENES][:MAX_SPOTS]
        picked = v.get("picked") if isinstance(v.get("picked"), list) else []
        picked = sorted({int(k) for k in picked if isinstance(k, int) and not isinstance(k, bool) and 1 <= k <= MAX_SPOTS})
        out["days"][ds] = {"spots": spots, "picked": picked}
    sets = raw.get("sets") if isinstance(raw.get("sets"), dict) else {}
    out["sets"] = {sc: d for sc, d in sets.items() if sc in SCENES and _iso(d)}
    ped = raw.get("ped") if isinstance(raw.get("ped"), dict) else {}
    for ds, v in ped.items():
        if _iso(ds) and isinstance(v, list):
            out["ped"][ds] = sorted({x for x in v if isinstance(x, str) and re.fullmatch(r"[a-z]\d", x)})
    return out


def trim(data: dict[str, Any], today: _dt.date) -> None:
    """Bỏ ngày cũ hơn 14 ngày ở "days" / "ped" (sổ nhỏ, đồng bộ nhẹ)."""
    lo = (today - _dt.timedelta(days=KEEP_DAYS)).isoformat()
    for k in ("days", "ped"):
        data[k] = {d: v for d, v in data[k].items() if d >= lo}


# ---------------------------------------------------------------------------
# Chỗ lấp lánh
# ---------------------------------------------------------------------------

def open_count(reviews: int) -> int:
    """Số chỗ lấp lánh đã mở theo lượt ôn hôm nay."""
    try:
        r = max(0, int(reviews))
    except (TypeError, ValueError):
        r = 0
    return min(MAX_SPOTS, r // PER_SPOT)


def next_at(reviews: int) -> int | None:
    """Lượt ôn cần để mở chỗ kế tiếp (None khi đã đủ 3)."""
    n = open_count(reviews)
    return None if n >= MAX_SPOTS else (n + 1) * PER_SPOT


def candidate_scenes(zones: list[str]) -> list[str]:
    """Sân vườn + các vùng đã mở (vùng tự tạo không có bộ sưu tầm)."""
    return ["yard"] + [z for z in SCENES[1:] if z in (zones or [])]


def plan_spots(data: dict[str, Any], zones: list[str], today: _dt.date) -> list[str]:
    """Cảnh của 3 chỗ lấp lánh hôm nay: vùng còn thiếu nhiều món (đang mùa) trước; cùng mức thì theo ngày.
    Ít cảnh hơn 3 thì quay vòng (vd. chỉ có Sân vườn → cả 3 chỗ ở sân)."""
    scenes = candidate_scenes(zones)
    ds = today.isoformat()

    def missing(sc: str) -> int:
        return sum(1 for f in BY_SCENE[sc] if f not in data["found"] and in_season(f, today))

    order = sorted(scenes, key=lambda sc: (-min(missing(sc), 1), _h("spot", ds, sc)))
    return [order[i % len(order)] for i in range(MAX_SPOTS)]


def ensure_day(data: dict[str, Any], zones: list[str], today: _dt.date) -> bool:
    """Chốt cảnh 3 chỗ lấp lánh của hôm nay (một lần mỗi ngày). Trả True nếu vừa ghi mới."""
    ds = today.isoformat()
    day = data["days"].get(ds)
    if day and len(day.get("spots") or []) == MAX_SPOTS:
        return False
    picked = list(day.get("picked") or []) if day else []
    data["days"][ds] = {"spots": plan_spots(data, zones, today), "picked": picked}
    trim(data, today)
    return True


def choose(data: dict[str, Any], scene: str, k: int, today: _dt.date) -> tuple[str, bool]:
    """Món nhặt ở chỗ thứ k: món chưa có (đang mùa) trước; có đủ rồi thì một món đang mùa bất kỳ (trùng)."""
    pool = [f for f in BY_SCENE.get(scene, []) if in_season(f, today)]
    if not pool:
        pool = list(BY_SCENE.get(scene, []))
    fresh = [f for f in pool if f not in data["found"]]
    lst = fresh or pool
    return lst[_h("find", today.isoformat(), k, scene) % len(lst)], bool(fresh)


class FindError(Exception):
    pass


def pick(data: dict[str, Any], k: int, scene: str, reviews: int, zones: list[str], today: _dt.date) -> dict[str, Any]:
    """Nhặt chỗ lấp lánh thứ k (1–3) ở `scene`. Sửa `data` tại chỗ. Trả {"id", "new", "coins", "set_done", "reward"}."""
    if not isinstance(k, int) or not 1 <= k <= MAX_SPOTS:
        raise FindError("Không có chỗ lấp lánh này.")
    ensure_day(data, zones, today)
    day = data["days"][today.isoformat()]
    if k > open_count(reviews):
        raise FindError("Ôn thêm %d lượt nữa để mở chỗ lấp lánh này." % max(1, k * PER_SPOT - max(0, int(reviews))))
    if k in day["picked"]:
        raise FindError("Chỗ này nhặt rồi.")
    if day["spots"][k - 1] != scene:
        raise FindError("Chỗ lấp lánh đã đổi chỗ, mở lại vườn nhé.")
    fid, new = choose(data, scene, k, today)
    ds = today.isoformat()
    if new:
        data["found"][fid] = {"d": ds, "n": 1}
    else:
        data["found"][fid] = dict(data["found"].get(fid) or {"d": ds}, n=int((data["found"].get(fid) or {}).get("n", 0)) + 1)
    day["picked"] = sorted(set(day["picked"]) | {k})
    res: dict[str, Any] = {"id": fid, "new": new, "coins": 0 if new else DUP_COINS, "set_done": False, "reward": None}
    if all(f in data["found"] for f in BY_SCENE[scene]) and scene not in data["sets"]:
        data["sets"][scene] = ds
        res.update(set_done=True, reward=SET_REWARD[scene])
    return res


def spots_view(data: dict[str, Any], reviews: int, today: _dt.date) -> list[dict[str, Any]]:
    day = data["days"].get(today.isoformat()) or {"spots": [], "picked": []}
    n = open_count(reviews)
    return [{"k": i + 1, "scene": sc, "open": i < n, "picked": (i + 1) in day["picked"]}
            for i, sc in enumerate(day["spots"][:MAX_SPOTS])]


def item_view(fid: str, data: dict[str, Any], today: _dt.date) -> dict[str, Any]:
    f = FINDS[fid]
    e = data["found"].get(fid)
    return {"id": fid, "scene": f["scene"], "ja": f["ja"], "kana": f["kana"], "vi": f["vi"], "found": bool(e),
            "d": e["d"] if e else "", "n": e["n"] if e else 0, "season": season_text(fid), "now": in_season(fid, today)}


def box_view(data: dict[str, Any], zones: list[str], today: _dt.date, reward_names: dict[str, str]) -> dict[str, Any]:
    open_sc = set(candidate_scenes(zones))
    sets = []
    for sc in SCENES:
        items = [item_view(f, data, today) for f in BY_SCENE[sc]]
        sets.append({"scene": sc, "name": SCENE_NAMES[sc], "n": sum(1 for x in items if x["found"]), "total": len(items),
                     "done": sc in data["sets"], "d": data["sets"].get(sc, ""), "open": sc in open_sc,
                     "reward": SET_REWARD[sc], "reward_name": reward_names.get(SET_REWARD[sc], ""), "items": items})
    return {"found": sum(1 for f in FIND_ORDER if f in data["found"]), "total": len(FIND_ORDER), "sets": sets}


def new_between(data: dict[str, Any], start: _dt.date, end: _dt.date) -> list[dict[str, str]]:
    """Món nhặt lần đầu trong [start, end] (Lịch hoa)."""
    a, b = start.isoformat(), end.isoformat()
    return [{"id": f, "ja": FINDS[f]["ja"], "vi": FINDS[f]["vi"], "d": data["found"][f]["d"]} for f in FIND_ORDER
            if f in data["found"] and a <= data["found"][f]["d"] <= b]


# ---------------------------------------------------------------------------
# Gánh hàng rong
# ---------------------------------------------------------------------------

def is_market(day: _dt.date) -> bool:
    return day.weekday() in MARKET_DAYS


def market_no(day: _dt.date) -> int:
    """Số thứ tự phiên (0 = Chủ nhật 04/01/2026); ngày không phải phiên → phiên gần nhất trước đó."""
    d = (day - PED_EPOCH).days
    weeks, rem = divmod(d, 7)
    # rem: 0 = CN, 3 = T4
    return weeks * 2 + (1 if rem >= 3 else 0)


def next_market(day: _dt.date, after: bool = True) -> _dt.date:
    d = day + _dt.timedelta(days=1 if after else 0)
    while not is_market(d):
        d += _dt.timedelta(days=1)
    return d


def ped_only_of(no: int) -> str:
    """Món riêng của phiên `no`: mỗi vòng 8 phiên một hoán vị → mỗi món đúng một lần mỗi 8 phiên (≈ 4 tuần)."""
    cyc, i = divmod(no, len(PED_ONLY))
    order = sorted(PED_ONLY, key=lambda x: _h("ped", cyc, x))
    return order[i]


def disc(price: int) -> int:
    """Giá giảm 25%, làm tròn tới 5 xu (ít nhất 5)."""
    return max(5, int(round(price * (1 - PED_OFF) / 5.0)) * 5)


def stock(day: _dt.date, shop_items: list[str], seeds: list[str]) -> list[dict[str, Any]]:
    """Hàng của phiên `day` (ô: x1 món riêng, d1 d2 d3 món cửa hàng giảm giá, s1 giống cây giảm giá).
    shop_items / seeds: danh sách cố định (thứ tự danh mục) để mọi máy cùng ra một phiên hàng."""
    no = market_no(day)
    ds = day.isoformat()
    out: list[dict[str, Any]] = [{"slot": "x1", "kind": "only", "id": ped_only_of(no)}]
    pool = sorted(shop_items, key=lambda x: _h("pdisc", ds, x))
    for i, iid in enumerate(pool[:3]):
        out.append({"slot": "d%d" % (i + 1), "kind": "item", "id": iid})
    if seeds:
        out.append({"slot": "s1", "kind": "seed", "id": sorted(seeds, key=lambda x: _h("pseed", ds, x))[0]})
    return out


# ---------------------------------------------------------------------------
# Lưu trữ (khoá collection + sao lưu file, như guest_core.GuestStore)
# ---------------------------------------------------------------------------

class EventStore:
    def __init__(self, path: str, col_getter: Callable[[], Any] | None = None) -> None:
        self.path = path
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def raw(self) -> dict[str, Any]:
        col = self._col()
        if col is not None:
            try:
                raw = col.get_config(EVENT_KEY, None)
            except Exception:
                raw = None
            return dict(raw) if isinstance(raw, dict) else {}
        try:
            with open(self.path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            raw = None
        return dict(raw) if isinstance(raw, dict) else {}

    def load(self) -> dict[str, Any]:
        return clean(self.raw())

    def save(self, data: dict[str, Any]) -> None:
        raw = self.raw()                       # giữ khoá lạ của bản sau
        found_raw = raw.get("found") if isinstance(raw.get("found"), dict) else {}
        found = {}
        for fid, e in data["found"].items():
            old = found_raw.get(fid) if isinstance(found_raw.get(fid), dict) else {}
            found[fid] = dict(old, **e)
        for fid, e in found_raw.items():      # món lạ của bản sau
            if fid not in FINDS:
                found[fid] = e
        raw.update(v=1, found=found, days=data["days"], sets=data["sets"], ped=data["ped"])
        col = self._col()
        if col is not None:
            col.set_config(EVENT_KEY, raw)
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False)
            os.replace(tmp, self.path)
        except OSError:
            pass
