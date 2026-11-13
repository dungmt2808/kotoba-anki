"""ことば畑 1.30 — tường & sàn của ba gian trong nhà (thuần Python, không import anki / aqt → test offline được).

Người dùng (13/11): "có xưởng xây vùng được rồi nhưng không thể thiết kế bên trong ngôi nhà … có thể mở rộng thêm mua sàn,
mua giấy dán tường không". Từ 1.25 nền ba gian đi theo kiểu nhà; nay mỗi gian (phòng chính / Bếp / Phòng ngủ) chọn riêng
được giấy dán tường và sàn:
  - mặc định "Theo kiểu nhà" (như 1.25, miễn phí, đổi kiểu nhà là đổi theo);
  - mẫu có sẵn: mua một lần, dùng cho gian nào cũng được, đổi qua lại miễn phí;
  - mẫu tự vẽ ở Xưởng: một ô 16×16 lặp lại kín tường / sàn (giá như món chế tác nhỏ, vẽ lại 50 xu, đổi tên miễn phí).
Xà trên cùng, nẹp chân tường, cột ngăn gian, cửa sổ phòng chính vẫn theo kiểu nhà để ba gian liền nhau.

Lưu ở khoá "decor" ngay tầng trên cùng của MORE_KEY (như "myseeds" của 1.22): bản 1.14 – 1.28 ở máy khác giữ hộ khoá lạ ở
tầng này (keep_foreign_more) nên không xoá. Điểm ảnh mẫu tự vẽ ở PX_KEY, id t1, t2… (bản cũ đọc / ghi PX_KEY cả khối).
  {"own": [id mẫu đã mua], "use": {gian: {"wall": id, "floor": id}}, "mine": {"items": {t<n>: {name, kind}}, "next": n}}
Id mẫu của bản mới hơn (đúng dạng id mà bản này chưa biết) được giữ nguyên trong "own" / "use"; JS không biết thì vẽ theo
kiểu nhà."""
from __future__ import annotations

import re
from typing import Any

try:   # chạy trong Anki (gói add-on)
    from . import more_core as more
except ImportError:   # nạp riêng (test): garden_core gán decor.more = more ngay sau khi nạp file này
    more = None  # type: ignore[assignment]

DECOR_KEY = "decor"
ROOMS = ("room", "kitchen", "bedroom")
ROOM_NAMES = {"room": "Phòng chính", "kitchen": "Bếp", "bedroom": "Phòng ngủ"}
SLOTS = ("wall", "floor")
SLOT_NAMES = {"wall": "Giấy dán tường", "floor": "Sàn"}
ID_RE = re.compile(r"^[wf]_[a-z0-9]{1,20}$")
TILE_RE = re.compile(r"^t[1-9]\d{0,3}$")
TILE_W = 16
TILE_MAX = 12
TILE_PRICE = 250
TILE_EDIT = 50
NAME_MAX = 24
OWN_MAX = 200

# Mẫu có sẵn (thứ tự = thứ tự trong cửa hàng). Hình vẽ ở web/nha_art.js (DECO); "ja" chỉ để trang trí trên thẻ.
WALLS: dict[str, dict[str, Any]] = {
    "w_kem": {"name": "Vữa kem", "ja": "しっくい", "price": 150, "desc": "Trơn, sáng, hợp mọi kiểu nhà"},
    "w_soc": {"name": "Sọc bạc hà", "ja": "ストライプ", "price": 250, "desc": "Sọc dọc xanh nhạt"},
    "w_sakura": {"name": "Cánh anh đào", "ja": "桜", "price": 300, "desc": "Cánh hoa rơi trên nền hồng phấn"},
    "w_seigaiha": {"name": "Sóng seigaiha", "ja": "青海波", "price": 350, "desc": "Sóng xếp vảy màu chàm"},
    "w_asanoha": {"name": "Lá gai asanoha", "ja": "麻の葉", "price": 350, "desc": "Hoạ tiết lá gai xanh ngọc"},
    "w_caro": {"name": "Caro vàng mật", "ja": "チェック", "price": 250, "desc": "Ô caro ấm áp"},
    "w_go": {"name": "Ốp gỗ thông", "ja": "板張り", "price": 300, "desc": "Ván gỗ dọc, có mắt gỗ"},
    "w_gach": {"name": "Gạch nung", "ja": "れんが", "price": 300, "desc": "Tường gạch đỏ xếp so le"},
    "w_tre": {"name": "Vách tre", "ja": "竹", "price": 300, "desc": "Thân tre xanh có đốt"},
    "w_may": {"name": "Trời mây", "ja": "空と雲", "price": 350, "desc": "Trời xanh, mây trắng lững lờ"},
    "w_sao": {"name": "Trời sao", "ja": "星空", "price": 400, "desc": "Nền chàm đêm lấm tấm sao"},
    "w_shoji": {"name": "Vách shoji", "ja": "障子", "price": 400, "desc": "Khung gỗ dán giấy trắng"},
}
FLOORS: dict[str, dict[str, Any]] = {
    "f_soi": {"name": "Gỗ sồi sáng", "ja": "フローリング", "price": 250, "desc": "Ván gỗ sáng màu"},
    "f_occho": {"name": "Gỗ óc chó", "ja": "ウォールナット", "price": 300, "desc": "Ván gỗ nâu sẫm"},
    "f_xuongca": {"name": "Gỗ xương cá", "ja": "ヘリンボーン", "price": 400, "desc": "Ván ghép chéo kiểu xương cá"},
    "f_tatami": {"name": "Chiếu tatami mới", "ja": "畳", "price": 300, "desc": "Chiếu cói xanh, viền chàm"},
    "f_caro": {"name": "Gạch ô cờ", "ja": "市松", "price": 250, "desc": "Ô cờ đen trắng"},
    "f_gom": {"name": "Gạch gốm đỏ", "ja": "テラコッタ", "price": 300, "desc": "Gạch terracotta lát vuông"},
    "f_da": {"name": "Đá phiến", "ja": "石畳", "price": 350, "desc": "Đá xám ghép mảnh"},
    "f_tham": {"name": "Thảm len", "ja": "じゅうたん", "price": 350, "desc": "Thảm len hồng đất, mềm chân"},
    "f_co": {"name": "Thảm cỏ", "ja": "芝生", "price": 300, "desc": "Như mang vườn vào nhà"},
}
PRESETS: dict[str, dict[str, Any]] = {}
for _k, _v in WALLS.items():
    PRESETS[_k] = dict(_v, slot="wall")
for _k, _v in FLOORS.items():
    PRESETS[_k] = dict(_v, slot="floor")
for _k in PRESETS:
    assert ID_RE.match(_k) and _k[0] == PRESETS[_k]["slot"][0], _k


class DecorError(ValueError):
    """Lỗi có câu tiếng Việt hiện cho người dùng."""


def _clean_text(raw: Any, limit: int, default: str) -> str:
    if more is not None:
        return more.clean_text(raw, limit, default)
    text = re.sub(r"[\x00-\x1f<>]", "", str(raw or "")).strip()
    return text[:limit] or default


def empty() -> dict[str, Any]:
    return {"own": [], "use": {r: {} for r in ROOMS}, "mine": {"items": {}, "next": 1}}


def slot_of(did: Any) -> str | None:
    """Chỗ dùng của một id mẫu có sẵn (kể cả id của bản mới hơn): w_… → wall, f_… → floor."""
    if isinstance(did, str) and ID_RE.match(did):
        return "wall" if did[0] == "w" else "floor"
    return None


def clean(raw: Any) -> dict[str, Any]:
    out = empty()
    if not isinstance(raw, dict):
        return out
    own = raw.get("own") if isinstance(raw.get("own"), list) else []
    for did in own:
        if slot_of(did) and did not in out["own"] and len(out["own"]) < OWN_MAX:
            out["own"].append(did)
    mine = raw.get("mine") if isinstance(raw.get("mine"), dict) else {}
    items = mine.get("items") if isinstance(mine.get("items"), dict) else {}
    for tid, meta in items.items():
        if (isinstance(tid, str) and TILE_RE.match(tid) and isinstance(meta, dict) and meta.get("kind") in SLOTS
                and len(out["mine"]["items"]) < TILE_MAX):
            out["mine"]["items"][tid] = {"name": _clean_text(meta.get("name"), NAME_MAX, "Mẫu của tớ"), "kind": meta["kind"]}
    nxt = mine.get("next")
    biggest = max([int(t[1:]) for t in out["mine"]["items"]] or [0])
    out["mine"]["next"] = max(nxt if isinstance(nxt, int) and not isinstance(nxt, bool) and nxt > 0 else 1, biggest + 1)
    use = raw.get("use") if isinstance(raw.get("use"), dict) else {}
    for room in ROOMS:
        cur = use.get(room) if isinstance(use.get(room), dict) else {}
        for slot in SLOTS:
            did = cur.get(slot)
            if usable(out, did, slot):
                out["use"][room][slot] = did
    return out


def usable(dec: dict[str, Any], did: Any, slot: str) -> bool:
    """Mẫu này đang có và đúng chỗ (tường / sàn)?"""
    if not isinstance(did, str):
        return False
    if TILE_RE.match(did):
        meta = dec["mine"]["items"].get(did)
        return bool(meta) and meta["kind"] == slot
    return did in dec["own"] and slot_of(did) == slot


def buy(dec: dict[str, Any], did: Any) -> int:
    """Mua một mẫu có sẵn → giá phải trả."""
    if did not in PRESETS:
        raise DecorError("Không có mẫu này.")
    if did in dec["own"]:
        raise DecorError("Mẫu này đã có rồi.")
    dec["own"].append(did)
    return int(PRESETS[did]["price"])


def use(dec: dict[str, Any], room: Any, slot: Any, did: Any, rooms_open: list[str] | tuple[str, ...]) -> None:
    """Dùng một mẫu cho một gian ("" / None = về Theo kiểu nhà)."""
    if room not in ROOMS or slot not in SLOTS:
        raise DecorError("Không có gian này.")
    if room != "room" and room not in rooms_open:
        raise DecorError("Mở rộng nhà (tab Xây nhà) rồi mới trang trí " + ROOM_NAMES[room] + " được.")
    if did in (None, "", "none"):
        dec["use"][room].pop(slot, None)
        return
    if not usable(dec, did, slot):
        wrong = (did in PRESETS and PRESETS[did]["slot"] != slot) or (
            isinstance(did, str) and did in dec["mine"]["items"] and dec["mine"]["items"][did]["kind"] != slot)
        if wrong:
            raise DecorError("Mẫu này dành cho " + ("sàn" if slot == "wall" else "tường") + ".")
        raise DecorError("Chưa có mẫu này." if (did in PRESETS or (isinstance(did, str) and TILE_RE.match(did)))
                         else "Không có mẫu này.")
    if did not in PRESETS and not TILE_RE.match(did):
        raise DecorError("Mẫu này của bản mới hơn, cập nhật để dùng nhé.")
    dec["use"][room][slot] = did


def tile_code(code: Any, palette: dict[str, str]) -> str | None:
    """Mã điểm ảnh một ô 16×16 → mã gọn; None nếu hỏng / trống."""
    flat = more.px_decode_wh(code, TILE_W, TILE_W, palette) if more is not None else None
    if flat is None or not flat.strip("."):
        return None
    return more.px_encode(flat)


def tile_save(dec: dict[str, Any], payload: Any, px_store: dict[str, str], palette: dict[str, str]) -> tuple[int, str, str]:
    """Tạo mẫu tự vẽ (TILE_PRICE) hoặc sửa (TILE_EDIT nếu đổi hình, đổi tên miễn phí). Trả (xu, id, mã lưu vào PX_KEY)."""
    if not isinstance(payload, dict):
        raise DecorError("Dữ liệu mẫu không hợp lệ.")
    kind = payload.get("kind")
    if kind not in SLOTS:
        raise DecorError("Chọn mẫu cho tường hay cho sàn đã nhé.")
    if more is None or more.px_decode_wh(payload.get("px"), TILE_W, TILE_W, palette) is None:
        raise DecorError("Hình vẽ bị lỗi, thử vẽ lại nhé.")
    code = tile_code(payload.get("px"), palette)
    if code is None:
        raise DecorError("Hình còn trống, vẽ gì đó đã nhé!")
    name = _clean_text(payload.get("name"), NAME_MAX, "Mẫu của tớ")
    items = dec["mine"]["items"]
    tid = payload.get("id")
    if tid:
        meta = items.get(tid) if isinstance(tid, str) else None
        if meta is None:
            raise DecorError("Không tìm thấy mẫu này.")
        if meta["kind"] != kind:
            raise DecorError("Không đổi được mẫu tường thành mẫu sàn (và ngược lại).")
        cost = TILE_EDIT if tile_code(px_store.get(tid), palette) != code else 0
    else:
        if len(items) >= TILE_MAX:
            raise DecorError(f"Đã có {TILE_MAX} mẫu tự vẽ, xoá bớt mẫu cũ đã nhé.")
        n = max(1, int(dec["mine"].get("next") or 1))
        while f"t{n}" in items:
            n += 1
        if n > 9999:
            raise DecorError("Hết chỗ tạo mẫu mới.")
        tid = f"t{n}"
        dec["mine"]["next"] = n + 1
        cost = TILE_PRICE
    items[tid] = {"name": name, "kind": kind}
    return cost, tid, code


def tile_delete(dec: dict[str, Any], tid: Any) -> None:
    """Xoá mẫu tự vẽ; gian đang dùng mẫu đó về Theo kiểu nhà."""
    if tid not in dec["mine"]["items"]:
        raise DecorError("Không tìm thấy mẫu này.")
    del dec["mine"]["items"][tid]
    for room in ROOMS:
        for slot in SLOTS:
            if dec["use"][room].get(slot) == tid:
                dec["use"][room].pop(slot, None)


def catalog_view() -> dict[str, Any]:
    return {"walls": [dict(v, id=k) for k, v in WALLS.items()], "floors": [dict(v, id=k) for k, v in FLOORS.items()],
            "rooms": [{"id": r, "name": ROOM_NAMES[r]} for r in ROOMS],
            "tile": {"price": TILE_PRICE, "edit": TILE_EDIT, "max": TILE_MAX, "w": TILE_W}}


def tiles_view(dec: dict[str, Any], px_store: dict[str, str] | None, palette: dict[str, str]) -> list[dict[str, Any]]:
    """Mẫu tự vẽ cho giao diện: [{id, name, kind, px}] (px "" nếu điểm ảnh hỏng / chưa đồng bộ tới máy này)."""
    out = []
    for tid, meta in dec["mine"]["items"].items():
        out.append({"id": tid, "name": meta["name"], "kind": meta["kind"],
                    "px": tile_code((px_store or {}).get(tid), palette) or ""})
    return out
