"""ことば畑 – 1.34: Trang trí thử (bản thử đồ đạc của từng cảnh). Không import aqt.

Góp ý của người dùng (17/11): "Có 1 chức năng Trang trí nhà, lưu lại bản trang trí đó, dùng để đặt thử đồ. Hiện tại phải mua
mới đặt thử đồ được." Người dùng duyệt ảnh phác `docs/ke_hoach_1_34/` (chi tiết Claude chọn):

- Mỗi cảnh (sân, vùng, gian trong nhà) có **3 bản thử**; bản thử là một danh sách đồ đặt {id, x, y} (+ tường / sàn của gian
  trong nhà), món chưa mua cũng đặt được. Vườn thật không đổi cho tới khi bấm "Dùng bản này" (GardenState.draft_apply:
  Python kiểm lại mọi thứ, mua món còn thiếu + bày đúng như bản thử trong cùng một lần lưu).
- Bản thử chỉ là bản nháp → lưu **theo hồ sơ trên máy** (file `user_files/ho_so/<mã>/ban_thu.json` qua backup_core), không
  vào collection: không đổi dữ liệu đồng bộ của bản đã phát hành, không sang máy khác.
- Ở đây chỉ làm sạch về hình dạng (kiểu, khoảng số, độ dài) — id lạ của bản mới hơn vẫn giữ; đúng / sai chỗ đặt, giá, đã có
  hay chưa do garden_core xét lúc dùng bản thử.
"""
from __future__ import annotations

import json
import math
import re
import time
from typing import Any

FILE_NAME = "ban_thu.json"
SLOTS = 3                     # số bản thử mỗi cảnh
MAX_SCENES = 60               # sân + 6 vùng + 3 gian + vùng tự tạo (≤ 20) — dư chỗ cho bản sau
MAX_ITEMS = 160               # món trong một bản thử (sân 16 × 4 ô, 2 lớp: thảm + đồ)
MAX_XY = 63
SCENE_RE = re.compile(r"^[a-z][a-z0-9_]{0,23}$")
ITEM_RE = re.compile(r"^[A-Za-z0-9_\-]{1,40}$")
DECOR_RE = re.compile(r"^(|[wf]_[a-z0-9]{1,20}|t[1-9]\d{0,3})$")       # "" = theo kiểu nhà; mẫu có sẵn; mẫu tự vẽ
DECOR_SLOTS = ("wall", "floor")


class DraftError(ValueError):
    """Lỗi bản thử (thông điệp tiếng Việt cho người dùng)."""


def empty() -> dict[str, Any]:
    return {"v": 1, "scenes": {}}


def _int(v: Any, lo: int, hi: int) -> int | None:
    # bool là int trong Python; NaN / ±vô cực (JSON của Python đọc được "Infinity") → bỏ, không ném OverflowError
    if isinstance(v, bool) or not isinstance(v, (int, float)) or (isinstance(v, float) and not math.isfinite(v)):
        return None
    n = int(v)
    return n if lo <= n <= hi and n == v else None


def clean_slot(raw: Any) -> dict[str, Any] | None:
    """Một bản thử: {"items": [{"id", "x", "y"}], "decor"?: {"wall": id | "", "floor": id | ""}, "t": giây}. Sai hình dạng → None."""
    if not isinstance(raw, dict) or not isinstance(raw.get("items"), list):
        return None
    items: list[dict[str, Any]] = []
    for e in raw["items"]:
        if len(items) >= MAX_ITEMS:
            break
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not ITEM_RE.match(e["id"]):
            continue
        x, y = _int(e.get("x"), 0, MAX_XY), _int(e.get("y"), 0, MAX_XY)
        if x is None or y is None:
            continue
        items.append({"id": e["id"], "x": x, "y": y})
    out: dict[str, Any] = {"items": items}
    dec = raw.get("decor")
    if isinstance(dec, dict):
        d = {k: dec[k] for k in DECOR_SLOTS if isinstance(dec.get(k), str) and DECOR_RE.match(dec[k])}
        if d:
            out["decor"] = d
    t = _int(raw.get("t"), 0, 10 ** 11)
    out["t"] = t if t is not None else 0
    return out


def clean(raw: Any) -> dict[str, Any]:
    out = empty()
    if not isinstance(raw, dict) or not isinstance(raw.get("scenes"), dict):
        return out
    for scene, sc in raw["scenes"].items():
        if len(out["scenes"]) >= MAX_SCENES:
            break
        if not isinstance(scene, str) or not SCENE_RE.match(scene) or not isinstance(sc, dict):
            continue
        slots = sc.get("slots") if isinstance(sc.get("slots"), list) else []
        slots = [clean_slot(s) for s in slots[:SLOTS]] + [None] * max(0, SLOTS - len(slots))
        cur = _int(sc.get("cur"), 0, SLOTS - 1)
        if not any(slots):
            continue
        out["scenes"][scene] = {"cur": cur if cur is not None else 0, "slots": slots}
    return out


def put(store: dict[str, Any], scene: Any, slot: Any, payload: Any) -> dict[str, Any]:
    """Lưu bản thử `slot` của `scene` (payload None = xoá bản đó) và chọn nó làm bản đang xem. Trả store đã làm sạch."""
    if not isinstance(scene, str) or not SCENE_RE.match(scene):
        raise DraftError("Không có cảnh này.")
    n = _int(slot, 0, SLOTS - 1)
    if n is None:
        raise DraftError("Không có bản thử này.")
    out = clean(store)
    sc = out["scenes"].get(scene) or {"cur": 0, "slots": [None] * SLOTS}
    if payload is None:
        sc["slots"][n] = None
    else:
        s = clean_slot(payload)
        if s is None:
            raise DraftError("Bản thử hỏng, chưa lưu được.")
        s["t"] = int(time.time())
        sc["slots"][n] = s
    sc["cur"] = n
    if any(sc["slots"]):
        if scene not in out["scenes"] and len(out["scenes"]) >= MAX_SCENES:
            raise DraftError("Đã có quá nhiều bản thử.")
        out["scenes"][scene] = sc
    else:
        out["scenes"].pop(scene, None)
    return out


def pick(store: dict[str, Any], scene: Any, slot: Any) -> dict[str, Any]:
    """Chọn bản đang xem của một cảnh (bản trống vẫn chọn được: giao diện chép cảnh thật vào rồi gửi `put`)."""
    out = clean(store)
    n = _int(slot, 0, SLOTS - 1)
    if not isinstance(scene, str) or n is None:
        raise DraftError("Không có bản thử này.")
    if scene in out["scenes"]:
        out["scenes"][scene]["cur"] = n
    return out


def parse(raw: str) -> Any:
    """Tham số JSON từ cầu nối (chuỗi hỏng → DraftError)."""
    try:
        return json.loads(raw)
    except ValueError:
        raise DraftError("Bản thử hỏng, chưa lưu được.") from None
