"""ことば畑 1.31 — đồ tự thiết kế cho StackChan (thuần Python, không import anki / aqt → test offline được).

Người dùng (14/11): "thêm phần thiết kế đồ cho stack-chan, thay đồ cho stack chan ngoài stack-chan góc trái thì
stack-chan thật đang sinh hoạt có được đổi đồ luôn không". Tủ đồ có sẵn 17 món (garden_core.WEAR); nay vẽ thêm được
món của mình ở Xưởng, mặc như đồ có sẵn — cả linh vật góc trái lẫn StackChan đang sinh hoạt trong nhà / ngoài sân:
  - Mũ (head) / Mặt (face) / Cổ (neck): vẽ trên lưới đặt đúng chỗ trên thân hộp 20 cột của linh vật (GRID: rộng, cao,
    hàng bắt đầu so với đỉnh hộp — giống `dy` của hình đồ có sẵn ở web/fx.js). StackChan sinh hoạt nhỏ hơn: JS tự thu
    nhỏ hình (web/life.js `miniWear`), Xưởng cho xem trước cả hai.
  - Vỏ (shell): chọn 2 màu của bảng 32 màu (màu thân + màu viền dưới), như 4 vỏ có sẵn.
  - Giá: món vẽ 200 xu (như món chế tác 16×16), vỏ 150 xu; vẽ lại / đổi màu 50 xu, đổi tên miễn phí; tối đa 12 món.
    Tạo xong mặc luôn (như mua đồ có sẵn).

Lưu ở khoá "mywear" ngay tầng trên cùng của MORE_KEY (như "decor" / "myseeds"): bản 1.14 – 1.30 ở máy khác giữ hộ khoá
lạ ở tầng này (keep_foreign_more) nên không xoá. Điểm ảnh ở PX_KEY, id w1, w2… (bản cũ đọc / ghi PX_KEY cả khối).
  {"items": {w<n>: {"name", "slot", "c": [màu thân, màu viền] (chỉ vỏ)}}, "next": n, "on": {slot: w<n>}}
Món tự vẽ đang mặc ở một chỗ thì ví (wallet["wear"]["on"]) bỏ món có sẵn ở chỗ đó — máy còn bản cũ thấy chỗ đó trống
(không biết món tự vẽ), về 1.31 lại thấy đủ."""
from __future__ import annotations

import re
from typing import Any

try:   # chạy trong Anki (gói add-on)
    from . import more_core as more
except ImportError:   # nạp riêng (test): garden_core gán wear.more = more ngay sau khi nạp file này
    more = None  # type: ignore[assignment]

MYWEAR_KEY = "mywear"
SLOTS = ("head", "face", "neck", "shell")
SLOT_NAMES = {"head": "Mũ", "face": "Mặt", "neck": "Cổ", "shell": "Vỏ"}
# chỗ vẽ trên thân hộp 20 cột của linh vật: (rộng, cao, hàng đầu so với đỉnh hộp); mặt vẽ thẳng lên màn hình (không viền)
GRID: dict[str, tuple[int, int, int]] = {"head": (20, 8, -5), "face": (20, 9, 3), "neck": (20, 5, 12)}
ID_RE = re.compile(r"^w[1-9]\d{0,3}$")
PRICE = 200
SHELL_PRICE = 150
EDIT = 50
MAX = 12
NAME_MAX = 24


class WearError(ValueError):
    """Lỗi có câu tiếng Việt hiện cho người dùng."""


def _clean_text(raw: Any, limit: int, default: str) -> str:
    if more is not None:
        return more.clean_text(raw, limit, default)
    text = re.sub(r"[\x00-\x1f<>&\"'`\\]", "", str(raw or "")).strip()
    return text[:limit] or default


def empty() -> dict[str, Any]:
    return {"items": {}, "next": 1, "on": {}}


def _colors(raw: Any, palette: dict[str, str]) -> list[str] | None:
    """Hai màu của vỏ (khoá của bảng 32 màu, không phải "."); None nếu sai."""
    if (isinstance(raw, (list, tuple)) and len(raw) == 2
            and all(isinstance(c, str) and len(c) == 1 and c in palette and c != "." for c in raw)):
        return [raw[0], raw[1]]
    return None


def clean(raw: Any, palette: dict[str, str]) -> dict[str, Any]:
    out = empty()
    if not isinstance(raw, dict):
        return out
    items = raw.get("items") if isinstance(raw.get("items"), dict) else {}
    for wid, meta in items.items():
        if not (isinstance(wid, str) and ID_RE.match(wid) and isinstance(meta, dict) and meta.get("slot") in SLOTS):
            continue
        if len(out["items"]) >= MAX:
            break
        it: dict[str, Any] = {"name": _clean_text(meta.get("name"), NAME_MAX, "Đồ của tớ"), "slot": meta["slot"]}
        if meta["slot"] == "shell":
            c = _colors(meta.get("c"), palette)
            if c is None:
                continue
            it["c"] = c
        out["items"][wid] = it
    nxt = raw.get("next")
    biggest = max([int(w[1:]) for w in out["items"]] or [0])
    out["next"] = max(nxt if isinstance(nxt, int) and not isinstance(nxt, bool) and nxt > 0 else 1, biggest + 1)
    on = raw.get("on") if isinstance(raw.get("on"), dict) else {}
    for slot in SLOTS:
        wid = on.get(slot)
        if isinstance(wid, str) and wid in out["items"] and out["items"][wid]["slot"] == slot:
            out["on"][slot] = wid
    return out


def is_mine(wid: Any) -> bool:
    return isinstance(wid, str) and ID_RE.match(wid) is not None


def px_code(code: Any, slot: str, palette: dict[str, str]) -> str | None:
    """Mã điểm ảnh của món (đúng cỡ lưới của chỗ mặc) → mã gọn; None nếu hỏng / trống."""
    if slot not in GRID or more is None:
        return None
    w, h, _dy = GRID[slot]
    flat = more.px_decode_wh(code, w, h, palette)
    if flat is None or not flat.strip("."):
        return None
    return more.px_encode(flat)


def save(dec: dict[str, Any], payload: Any, px_store: dict[str, str], palette: dict[str, str]) -> tuple[int, str, str | None]:
    """Tạo (PRICE / SHELL_PRICE) hoặc sửa (EDIT nếu đổi hình / màu, đổi tên miễn phí) một món tự vẽ.
    Trả (xu, id, mã điểm ảnh lưu vào PX_KEY — None với vỏ)."""
    if not isinstance(payload, dict):
        raise WearError("Dữ liệu món đồ không hợp lệ.")
    slot = payload.get("slot")
    if slot not in SLOTS:
        raise WearError("Chọn chỗ mặc (mũ, mặt, cổ hay vỏ) đã nhé.")
    code: str | None = None
    colors: list[str] | None = None
    if slot == "shell":
        colors = _colors(payload.get("c"), palette)
        if colors is None:
            raise WearError("Chọn hai màu cho vỏ đã nhé.")
    else:
        w, h, _dy = GRID[slot]
        if more is None or more.px_decode_wh(payload.get("px"), w, h, palette) is None:
            raise WearError("Hình vẽ bị lỗi, thử vẽ lại nhé.")
        code = px_code(payload.get("px"), slot, palette)
        if code is None:
            raise WearError("Hình còn trống, vẽ gì đó đã nhé!")
    name = _clean_text(payload.get("name"), NAME_MAX, "Đồ của tớ")
    items = dec["items"]
    wid = payload.get("id")
    if wid:
        meta = items.get(wid) if isinstance(wid, str) else None
        if meta is None:
            raise WearError("Không tìm thấy món này.")
        if meta["slot"] != slot:
            raise WearError("Không đổi được chỗ mặc của món đã có (vẽ món mới nhé).")
        if slot == "shell":
            cost = EDIT if meta.get("c") != colors else 0
        else:
            cost = EDIT if px_code(px_store.get(wid), slot, palette) != code else 0
    else:
        if len(items) >= MAX:
            raise WearError(f"Đã có {MAX} món tự vẽ, xoá bớt món cũ đã nhé.")
        n = max(1, int(dec.get("next") or 1))
        while f"w{n}" in items:
            n += 1
        if n > 9999:
            raise WearError("Hết chỗ tạo món mới.")
        wid = f"w{n}"
        dec["next"] = n + 1
        cost = SHELL_PRICE if slot == "shell" else PRICE
    it: dict[str, Any] = {"name": name, "slot": slot}
    if colors is not None:
        it["c"] = colors
    items[wid] = it
    return cost, wid, code


def delete(dec: dict[str, Any], wid: Any) -> None:
    """Xoá món tự vẽ (đang mặc thì cởi ra). Không hoàn xu."""
    if not isinstance(wid, str) or wid not in dec["items"]:
        raise WearError("Không tìm thấy món này.")
    slot = dec["items"][wid]["slot"]
    del dec["items"][wid]
    if dec["on"].get(slot) == wid:
        dec["on"].pop(slot, None)


def put_on(dec: dict[str, Any], wid: Any) -> str:
    """Mặc món tự vẽ → trả chỗ mặc (để ví bỏ món có sẵn ở chỗ đó)."""
    if not isinstance(wid, str) or wid not in dec["items"]:
        raise WearError("Không tìm thấy món này.")
    slot = dec["items"][wid]["slot"]
    dec["on"][slot] = wid
    return slot


def catalog_view() -> dict[str, Any]:
    return {"price": PRICE, "shell_price": SHELL_PRICE, "edit": EDIT, "max": MAX,
            "grid": {k: {"w": v[0], "h": v[1], "dy": v[2]} for k, v in GRID.items()},
            "slots": [{"id": s, "name": SLOT_NAMES[s]} for s in SLOTS]}


def items_view(dec: dict[str, Any], px_store: dict[str, str] | None, palette: dict[str, str]) -> list[dict[str, Any]]:
    """Món tự vẽ cho giao diện: [{id, name, slot, px, rows, dy, c}] — rows = hàng điểm ảnh đã giải nén (JS vẽ thẳng);
    px "" / rows [] nếu điểm ảnh hỏng / chưa đồng bộ tới máy này (vẽ như chưa mặc gì ở chỗ đó)."""
    out = []
    for wid, meta in dec["items"].items():
        e: dict[str, Any] = {"id": wid, "name": meta["name"], "slot": meta["slot"]}
        if meta["slot"] == "shell":
            e["c"] = list(meta["c"])
            e["hex"] = [palette.get(c, "#888888") for c in meta["c"]]
        else:
            w, h, dy = GRID[meta["slot"]]
            code = px_code((px_store or {}).get(wid), meta["slot"], palette) or ""
            flat = more.px_decode_wh(code, w, h, palette) if code and more is not None else None
            e.update(px=code, dy=dy, w=w, h=h, rows=[flat[i:i + w] for i in range(0, w * h, w)] if flat else [])
        out.append(e)
    return out
