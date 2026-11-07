"""1.14 — phần mới của Nhà & Cửa hàng: sửa nhà, thú nuôi, giống cây cho ruộng, vùng tự tạo.

Thuần Python (không import anki / aqt) để test được độc lập. Dữ liệu lưu ở khoá collection riêng
MORE_KEY (đồng bộ AnkiWeb) để bản ≤ 1.13 ở máy khác (vốn làm sạch và xoá khoá lạ trong ví) không xoá mất.
Mọi số ngày ở đây là "ngày Anki" (col.sched.today), không phải ngày lịch.
"""

from __future__ import annotations

import re
from typing import Any

MORE_KEY = "kotoba_batake_more"


class MoreError(ValueError):
    """Lỗi có câu tiếng Việt hiện cho người dùng (garden_core đổi thành HomeError)."""


def _int(v: Any) -> int | None:
    return v if isinstance(v, int) and not isinstance(v, bool) and -10**7 < v < 10**7 else None


def clean_text(raw: Any, limit: int, default: str) -> str:
    text = re.sub(r"[\x00-\x1f<>&\"'`\\]", "", str(raw or "")).strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit] or default


# ---------------------------------------------------------------------------
# Sửa nhà: nhà cũ đi 1 nấc mỗi 7 ngày Anki kể từ lần sửa gần nhất. Không bao giờ sập, không mất đồ.
# ---------------------------------------------------------------------------

WEAR_DAYS = 7
WEAR_STEPS = [
    {"id": "moss", "name": "Rêu bám", "fix": "Cạo rêu"},
    {"id": "paint", "name": "Sơn bong", "fix": "Sơn lại tường"},
    {"id": "tiles", "name": "Ngói lệch", "fix": "Lợp lại ngói"},
    {"id": "leak", "name": "Mái dột", "fix": "Chống dột"},
]
WEAR_MIN_HOUSE = 3      # có tường (bước "Xây tường") mới bắt đầu cũ đi
BACK_GAP = 14           # vắng ≥ 14 ngày rồi quay lại → giảm giá sửa nhà
BACK_DAYS = 7           # … trong 7 ngày kể từ hôm quay lại
BACK_OFF = 0.5


def wear_cap(house: int) -> int:
    """Nấc hư tối đa theo bậc nhà: chưa có tường thì không cũ; có tường chưa có mái thì chỉ rêu + sơn."""
    if house < WEAR_MIN_HOUSE:
        return 0
    return 2 if house == WEAR_MIN_HOUSE else len(WEAR_STEPS)


def wear_level(more: dict[str, Any], house: int, today: int | None) -> int:
    cap = wear_cap(house)
    day = more["repair"].get("day")
    if not cap or day is None or today is None:
        return 0
    return max(0, min(cap, (today - day) // WEAR_DAYS))


def wear_unit(house_value: int) -> int:
    """Giá sửa một nấc: ~3% tổng giá đã xây (nhà xây xong 3.430 xu → 105 xu / nấc), tối thiểu 15 xu."""
    return max(15, int(round(house_value * 0.03 / 5)) * 5)


def back_discount(more: dict[str, Any], today: int | None) -> bool:
    back = more["repair"].get("back")
    return back is not None and today is not None and 0 <= today - back < BACK_DAYS


def repair_cost(more: dict[str, Any], house: int, house_value: int, today: int | None, steps: int | None) -> tuple[int, int]:
    """(xu, số nấc sửa). steps=None = sửa hết."""
    lvl = wear_level(more, house, today)
    n = lvl if steps is None else max(0, min(int(steps), lvl))
    cost = n * wear_unit(house_value)
    if back_discount(more, today):
        cost = int(cost * BACK_OFF)
    return cost, n


def apply_repair(more: dict[str, Any], house: int, today: int, n: int) -> None:
    """Bớt n nấc hư. Sửa hết thì tính lại từ hôm nay; sửa một phần thì giữ phần ngày lẻ của tuần đang cũ dần."""
    lvl = wear_level(more, house, today)
    n = max(0, min(n, lvl))
    if not n:
        return
    if n >= lvl:
        more["repair"]["day"] = today
        return
    cap = wear_cap(house)
    day = max(more["repair"]["day"], today - (cap * WEAR_DAYS + WEAR_DAYS - 1))   # vắng quá trần không tính thêm
    more["repair"]["day"] = today - (lvl - n) * WEAR_DAYS - ((today - day) % WEAR_DAYS)


def touch_repair(more: dict[str, Any], house: int, today: int | None) -> bool:
    """Gọi khi mở vườn: bắt đầu tính tuổi nhà (lần đầu có tường), ghi nhận "mừng quay lại". Trả True nếu đổi."""
    if today is None:
        return False
    rp = more["repair"]
    changed = False
    if house >= WEAR_MIN_HOUSE and rp.get("day") is None:
        rp["day"] = today
        changed = True
    seen = rp.get("seen")
    if seen != today:
        if seen is not None and today - seen >= BACK_GAP and wear_level(more, house, today) > 0:
            rp["back"] = today
        rp["seen"] = today
        changed = True
    return changed


# ---------------------------------------------------------------------------
# Thú nuôi: cho ăn vài xu mỗi ngày; quên cho ăn thì thú chỉ đi chơi, không bao giờ chết hay bỏ đi hẳn.
# ---------------------------------------------------------------------------

PETS: dict[str, dict[str, Any]] = {
    "niwatori": {"name": "Gà mái", "price": 500, "food": 2, "room": False,
                 "desc": "Mổ thóc khắp sân, thỉnh thoảng cục tác khoe trứng"},
    "ahiru": {"name": "Vịt con", "price": 600, "food": 2, "room": False,
              "desc": "Đi lạch bạch, trời mưa thì vui hẳn lên"},
    "usagi": {"name": "Thỏ trắng", "price": 700, "food": 2, "room": True,
              "desc": "Nhảy lò cò, ngồi gặm cà rốt"},
    "kame": {"name": "Rùa", "price": 800, "food": 1, "room": True,
             "desc": "Bò chầm chậm, trưa nào cũng rụt cổ ngủ"},
    "neko": {"name": "Mèo mướp", "price": 900, "food": 3, "room": True,
             "desc": "Đi dạo, nằm phơi nắng, tối cuộn tròn ngủ"},
    "shiba": {"name": "Chó Shiba", "price": 1200, "food": 4, "room": False,
              "desc": "Chạy quanh sân, vẫy đuôi mừng rỡ"},
}
PET_LOVE = [(0, "Mới về"), (7, "Quen hơi"), (21, "Thân thiết"), (50, "Tri kỷ")]
PET_AWAY = 2            # lần ăn gần nhất cách đây ≥ 2 ngày → đi chơi (cho ăn là về ngay)
PET_LOVE_MAX = 999
PET_NAME_MAX = 12


def pet_state(rec: dict[str, Any], today: int | None) -> str:
    """full = đã ăn hôm nay · hungry = chưa ăn hôm nay (vẫn ở nhà) · away = đi chơi."""
    fed = rec.get("fed")
    if today is None or fed is None:
        return "hungry"
    if fed >= today:
        return "full"
    return "hungry" if today - fed < PET_AWAY else "away"


def love_info(love: int) -> dict[str, Any]:
    name, nxt = PET_LOVE[0][1], None
    for i, (need, label) in enumerate(PET_LOVE):
        if love >= need:
            name = label
            nxt = PET_LOVE[i + 1][0] if i + 1 < len(PET_LOVE) else None
    return {"name": name, "next": nxt, "tier": sum(1 for need, _ in PET_LOVE if love >= need) - 1}


def _clean_pets(raw: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if not isinstance(raw, dict):
        return out
    for pid in PETS:   # thứ tự cố định
        r = raw.get(pid)
        if not isinstance(r, dict):
            continue
        scene = r.get("scene") if isinstance(r.get("scene"), str) and re.fullmatch(r"[a-z]{2,12}|u\d{1,2}", r["scene"]) else "yard"
        love = _int(r.get("love"))
        out[pid] = {
            "name": clean_text(r.get("name"), PET_NAME_MAX, PETS[pid]["name"]),
            "scene": scene,
            "fed": _int(r.get("fed")),
            "love": max(0, min(PET_LOVE_MAX, love if love is not None else 0)),
            "got": _int(r.get("got")),
        }
    return out


def buy_pet(more: dict[str, Any], pid: str, today: int | None) -> int:
    if pid not in PETS:
        raise MoreError("Không có con vật này.")
    if pid in more["pets"]:
        raise MoreError("Bạn đã nuôi con này rồi.")
    more["pets"][pid] = {"name": PETS[pid]["name"], "scene": "yard", "fed": today, "love": 1, "got": today}
    return PETS[pid]["price"]


def feed_cost(more: dict[str, Any], pid: str | None, today: int | None) -> tuple[int, list[str]]:
    """Xu và danh sách thú sẽ được cho ăn (bỏ qua con đã ăn hôm nay)."""
    if pid is not None and pid not in more["pets"]:
        raise MoreError("Không tìm thấy con vật này.")
    ids = [pid] if pid else list(more["pets"])
    ids = [p for p in ids if pet_state(more["pets"][p], today) != "full"]
    return sum(PETS[p]["food"] for p in ids), ids


def apply_feed(more: dict[str, Any], ids: list[str], today: int | None) -> None:
    for p in ids:
        rec = more["pets"][p]
        rec["fed"] = today
        rec["love"] = min(PET_LOVE_MAX, rec["love"] + 1)


def rename_pet(more: dict[str, Any], pid: str, name: Any) -> None:
    if pid not in more["pets"]:
        raise MoreError("Không tìm thấy con vật này.")
    more["pets"][pid]["name"] = clean_text(name, PET_NAME_MAX, PETS[pid]["name"])


def move_pet(more: dict[str, Any], pid: str, scene: str, allowed: list[str]) -> None:
    if pid not in more["pets"]:
        raise MoreError("Không tìm thấy con vật này.")
    if scene not in allowed:
        raise MoreError("Chưa mở cảnh này.")
    if scene == "room" and not PETS[pid]["room"]:
        raise MoreError(f"{PETS[pid]['name']} thích ở ngoài trời hơn.")
    more["pets"][pid]["scene"] = scene


def pets_view(more: dict[str, Any], today: int | None) -> list[dict[str, Any]]:
    out = []
    for pid, rec in more["pets"].items():
        info = love_info(rec["love"])
        out.append({"id": pid, "name": rec["name"], "species": PETS[pid]["name"], "scene": rec["scene"],
                    "state": pet_state(rec, today), "love": rec["love"], "love_name": info["name"],
                    "love_next": info["next"], "tier": info["tier"], "food": PETS[pid]["food"]})
    return out


# ---------------------------------------------------------------------------
# Giống cây cho ruộng: mua giống rồi gán theo deck / loại note / tag. Cây vẫn lớn theo FSRS như cũ,
# giống chỉ đổi hình vẽ.
# ---------------------------------------------------------------------------

SEEDS: dict[str, dict[str, Any]] = {
    "ine": {"name": "Lúa", "price": 600, "desc": "Mạ non → lúa trổ bông → bông vàng trĩu hạt"},
    "daikon": {"name": "Củ cải daikon", "price": 600, "desc": "Lá xanh xoè, củ trắng ló khỏi đất"},
    "himawari": {"name": "Hướng dương", "price": 800, "desc": "Thân cao, hoa vàng to, chín thì đầy hạt"},
    "kabocha": {"name": "Bí ngô", "price": 800, "desc": "Dây leo, hoa vàng, quả bí cam tròn"},
    "take": {"name": "Tre", "price": 900, "desc": "Măng nhú lên, vươn thành khóm tre xanh"},
    "sakura": {"name": "Anh đào", "price": 1200, "desc": "Nụ hồng, hoa anh đào nở rộ, ra quả anh đào đỏ"},
    "momiji": {"name": "Phong lá đỏ", "price": 1200, "desc": "Lá xanh chuyển cam rồi đỏ rực"},
    "bonsai": {"name": "Bonsai thông", "price": 1500, "desc": "Chậu sứ, thông uốn dáng, ra quả thông"},
}
SEED_KINDS = ("vocab", "kanji", "grammar", "other")
SEED_TAG_MAX = 12
MIX = "mix"             # trộn: mỗi cây một giống (trong các giống đã có + cây gốc), cố định theo note


def _clean_tag(raw: Any) -> str:
    tag = re.sub(r"[\s\x00-\x1f<>&\"'`\\]", "", str(raw or ""))
    return tag[:60]


def _clean_seeds(raw: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"owned": [], "deck": {}, "kind": {}, "tag": []}
    if not isinstance(raw, dict):
        return out
    got = raw.get("owned") if isinstance(raw.get("owned"), list) else []
    out["owned"] = [s for s in SEEDS if s in got]
    ok = set(out["owned"]) | {MIX}
    deck = raw.get("deck") if isinstance(raw.get("deck"), dict) else {}
    for did, v in deck.items():
        if isinstance(did, str) and re.fullmatch(r"\d{1,20}", did) and v in ok and len(out["deck"]) < 200:
            out["deck"][did] = v
    kind = raw.get("kind") if isinstance(raw.get("kind"), dict) else {}
    out["kind"] = {k: kind[k] for k in SEED_KINDS if kind.get(k) in ok}
    tags = raw.get("tag") if isinstance(raw.get("tag"), list) else []
    seen: set[str] = set()
    for row in tags:
        if isinstance(row, list) and len(row) == 2 and row[1] in ok:
            t = _clean_tag(row[0])
            if t and t.lower() not in seen and len(out["tag"]) < SEED_TAG_MAX:
                seen.add(t.lower())
                out["tag"].append([t, row[1]])
    return out


def buy_seed(more: dict[str, Any], sid: str) -> int:
    if sid not in SEEDS:
        raise MoreError("Không có giống cây này.")
    if sid in more["seeds"]["owned"]:
        raise MoreError("Giống này đã có rồi.")
    more["seeds"]["owned"] = [s for s in SEEDS if s in more["seeds"]["owned"] or s == sid]
    return SEEDS[sid]["price"]


def set_seed_rule(more: dict[str, Any], where: str, key: Any, value: Any) -> None:
    """where: deck (key = id deck) / kind (key = loại note) / tag (key = tên tag). value "" = bỏ luật."""
    sd = more["seeds"]
    value = "" if value in (None, "", "default") else value
    if value and value != MIX and value not in sd["owned"]:
        raise MoreError("Mua giống này trước đã.")
    if where == "deck":
        did = str(key)
        if not re.fullmatch(r"\d{1,20}", did):
            raise MoreError("Deck không hợp lệ.")
        if value:
            sd["deck"][did] = value
        else:
            sd["deck"].pop(did, None)
    elif where == "kind":
        if key not in SEED_KINDS:
            raise MoreError("Loại note không hợp lệ.")
        if value:
            sd["kind"][key] = value
        else:
            sd["kind"].pop(key, None)
    elif where == "tag":
        tag = _clean_tag(key)
        if not tag:
            raise MoreError("Gõ tên tag (không có dấu cách).")
        rest = [r for r in sd["tag"] if r[0].lower() != tag.lower()]
        if value:
            if len(rest) >= SEED_TAG_MAX:
                raise MoreError(f"Tối đa {SEED_TAG_MAX} luật theo tag.")
            rest.append([tag, value])
        sd["tag"] = rest
    else:
        raise MoreError("Luật gieo không hợp lệ.")


def _pick(sd: dict[str, Any], v: str, nid: int) -> str | None:
    if v == MIX:
        choices: list[str | None] = [None] + list(sd["owned"])
        h = (int(nid) * 2654435761) & 0xFFFFFFFF
        return choices[h % len(choices)]
    return v if v in sd["owned"] else None


def resolve_seed(sd: dict[str, Any], nid: int, kind: str, tags: list[str], decks: list[int]) -> str | None:
    """Giống của một cây. Ưu tiên: tag → loại note → deck của thẻ (deck gần nhất, rồi tới deck cha) → cây gốc."""
    low = [t.lower() for t in tags or []]
    for tag, v in sd["tag"]:
        t = tag.lower()
        if any(x == t or x.startswith(t + "::") for x in low):
            return _pick(sd, v, nid)
    if kind in sd["kind"]:
        return _pick(sd, sd["kind"][kind], nid)
    for did in decks or []:
        v = sd["deck"].get(str(did))
        if v:
            return _pick(sd, v, nid)
    return None


def apply_seeds(plants: list[dict[str, Any]], meta: list[dict[str, Any]] | None, sd: dict[str, Any]) -> None:
    """Gắn "v" (giống) cho từng cây. meta[i] = {"tags": [...], "decks": [deck của thẻ, cha, ông…]}."""
    if not sd["owned"]:
        return
    for i, p in enumerate(plants):
        m = meta[i] if meta and i < len(meta) else {}
        v = resolve_seed(sd, p.get("nid", 0), p.get("kind", "vocab"), m.get("tags") or [], m.get("decks") or [])
        if v:
            p["v"] = v
        else:
            p.pop("v", None)


# ---------------------------------------------------------------------------
# Vùng tự tạo: tên, kiểu nền, màu đất / đồi, công trình 64×76 vẽ bằng Xưởng. Đồ ngoài trời đặt được như vùng có sẵn.
# ---------------------------------------------------------------------------

UZONE_MAX = 6
UZONE_PRICE = 5000
UZONE_EDIT = 50         # sửa hình công trình (đổi tên / nền / màu thì miễn phí)
LANDMARK_W, LANDMARK_H = 64, 76
ENV_W, ENV_H = 256, 76  # 1.16: cảnh nền tự vẽ phủ cả vùng (trên nền có sẵn, dưới công trình và đồ đặt)
UZONE_BG = {
    "meadow": "Đồng cỏ", "flower": "Đồi hoa", "sand": "Bãi cát", "snow": "Đồng tuyết",
    "rock": "Núi đá", "lake": "Bờ hồ", "town": "Phố lát đá", "forest": "Rừng thông",
}
UZONE_GROUND = ["#5ed35e", "#8fd36a", "#3ccb5e", "#b8e05a", "#e9d8a6", "#f2e3b3", "#eaf1f7", "#c9d3dd",
                "#b0a48c", "#8a8fa8", "#d99a6c", "#c98a52", "#9a7bc4", "#ffc4d6", "#7ec8c0", "#5a6b8a"]
UZONE_HILLS = ["#7ed98a", "#2e8b3a", "#1f5f2a", "#9aa0b5", "#8a8fa8", "#c4d7e8", "#f5b971", "#d99a6c",
               "#c77dff", "#ff7fa0", "#2ec4b6", "#2f5fb0", "#6b3b1f", "#e9b949", "#ffffff", "#3a3a55"]
UZONE_DEFAULT = {"bg": "meadow", "ground": UZONE_GROUND[0], "hills": UZONE_HILLS[0]}


def px_decode_wh(code: Any, w: int, h: int, palette: dict[str, str]) -> str | None:
    """Giải nén "5.3kky" thành chuỗi w*h ký tự (None nếu sai định dạng / sai màu / sai kích thước)."""
    n_all = w * h
    if not isinstance(code, str) or len(code) > n_all * 3:
        return None
    out: list[str] = []
    total = 0
    num = ""
    for ch in code:
        if ch.isdigit():
            num += ch
            if len(num) > 5:
                return None
            continue
        if ch != "." and ch not in palette:
            return None
        n = int(num) if num else 1
        num = ""
        if n < 1 or total + n > n_all:
            return None
        out.append(ch * n)
        total += n
    if num or total != n_all:
        return None
    return "".join(out)


def px_encode(flat: str) -> str:
    out, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i]:
            j += 1
        out.append((str(j - i) if j - i > 1 else "") + flat[i])
        i = j
    return "".join(out)


def is_uzone(scene: Any) -> bool:
    return isinstance(scene, str) and re.fullmatch(r"u[1-9]\d?", scene) is not None


def _clean_zone(raw: Any, palette: dict[str, str]) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or not is_uzone(raw.get("id")):
        return None
    lm = raw.get("lm") if isinstance(raw.get("lm"), str) else ""
    if lm and px_decode_wh(lm, LANDMARK_W, LANDMARK_H, palette) is None:
        lm = ""
    return {
        "id": raw["id"],
        "name": clean_text(raw.get("name"), 20, "Vùng của tớ"),
        "bg": raw.get("bg") if raw.get("bg") in UZONE_BG else UZONE_DEFAULT["bg"],
        "ground": raw.get("ground") if raw.get("ground") in UZONE_GROUND else UZONE_DEFAULT["ground"],
        "hills": raw.get("hills") if raw.get("hills") in UZONE_HILLS else UZONE_DEFAULT["hills"],
        "lm": lm,
    }


def clean_env(code: Any, palette: dict[str, str]) -> str | None:
    """Cảnh nền 256×76 đã nén → mã gọn ("" = chưa vẽ), None nếu hỏng."""
    if code in (None, ""):
        return ""
    flat = px_decode_wh(code, ENV_W, ENV_H, palette)
    if flat is None:
        return None
    return px_encode(flat) if flat.strip(".") else ""


def save_zone(more: dict[str, Any], payload: Any, palette: dict[str, str]) -> tuple[int, str]:
    """Tạo vùng mới (payload không có id) hoặc sửa vùng. Trả (xu phải trả, id vùng).
    Vẽ lại công trình hoặc cảnh nền (1.16) mất UZONE_EDIT xu; đổi tên / nền / màu miễn phí.
    payload không có "env" (giao diện cũ) thì giữ nguyên cảnh nền đang có."""
    if not isinstance(payload, dict):
        raise MoreError("Dữ liệu vùng không hợp lệ.")
    lm = payload.get("px") if isinstance(payload.get("px"), str) else ""
    flat = px_decode_wh(lm, LANDMARK_W, LANDMARK_H, palette) if lm else "." * (LANDMARK_W * LANDMARK_H)
    if flat is None:
        raise MoreError("Hình công trình bị lỗi, thử vẽ lại nhé.")
    code = px_encode(flat) if flat.strip(".") else ""
    env = clean_env(payload.get("env"), palette) if "env" in payload else None
    if "env" in payload and env is None:
        raise MoreError("Hình cảnh nền bị lỗi, thử vẽ lại nhé.")
    zid = payload.get("id")
    zones = more["zones"]
    if zid:
        z = next((x for x in zones if x["id"] == zid), None)
        if z is None:
            raise MoreError("Không tìm thấy vùng này.")
        if env is None:
            env = z.get("env", "")
        cost = UZONE_EDIT if (code != z["lm"] or env != z.get("env", "")) else 0
    else:
        if len(zones) >= UZONE_MAX:
            raise MoreError(f"Đã có {UZONE_MAX} vùng tự tạo rồi.")
        used = {x["id"] for x in zones}
        n = max(1, int(more.get("znext") or 1))
        while f"u{n}" in used:
            n += 1
        if n > 99:
            raise MoreError("Hết chỗ tạo vùng mới.")
        zid = f"u{n}"
        more["znext"] = n + 1
        z = {"id": zid}
        zones.append(z)
        cost = UZONE_PRICE
        env = env or ""
    clean = _clean_zone(dict(payload, id=zid, lm=code), palette)
    z.clear()
    z.update(clean or {"id": zid, **UZONE_DEFAULT, "name": "Vùng của tớ", "lm": ""})
    z["env"] = env
    return cost, zid


def delete_zone(more: dict[str, Any], zid: str) -> None:
    if not any(z["id"] == zid for z in more["zones"]):
        raise MoreError("Không tìm thấy vùng này.")
    more["zones"] = [z for z in more["zones"] if z["id"] != zid]
    for rec in more["pets"].values():   # thú đang ở vùng đó về sân nhà
        if rec["scene"] == zid:
            rec["scene"] = "yard"


# ---------------------------------------------------------------------------
# Làm sạch + xem
# ---------------------------------------------------------------------------

def empty_more() -> dict[str, Any]:
    return {"repair": {"day": None, "seen": None, "back": None}, "pets": {}, "pet_auto": False,
            "seeds": _clean_seeds(None), "zones": [], "znext": 1}


def clean_more(raw: Any, palette: dict[str, str]) -> dict[str, Any]:
    more = empty_more()
    if not isinstance(raw, dict):
        return more
    rp = raw.get("repair") if isinstance(raw.get("repair"), dict) else {}
    more["repair"] = {"day": _int(rp.get("day")), "seen": _int(rp.get("seen")), "back": _int(rp.get("back"))}
    more["pets"] = _clean_pets(raw.get("pets"))
    more["pet_auto"] = raw.get("pet_auto") is True
    more["seeds"] = _clean_seeds(raw.get("seeds"))
    zones = raw.get("zones") if isinstance(raw.get("zones"), list) else []
    seen: set[str] = set()
    for z in zones:
        c = _clean_zone(z, palette)
        if c and c["id"] not in seen and len(more["zones"]) < UZONE_MAX:
            seen.add(c["id"])
            more["zones"].append(c)
    # 1.16: cảnh nền tự vẽ lưu ở khoá riêng "zenv" {id vùng: mã} (bản 1.14–1.15 giữ hộ khoá lạ, nhưng làm sạch
    # từng vùng thì bỏ trường lạ — nên không để trong "zones")
    zenv = raw.get("zenv") if isinstance(raw.get("zenv"), dict) else {}
    for z in more["zones"]:
        env = clean_env(zenv.get(z["id"]), palette)
        z["env"] = env or ""
    nxt = _int(raw.get("znext"))
    biggest = max([int(z["id"][1:]) for z in more["zones"]] or [0])
    more["znext"] = max(nxt if nxt and nxt > 0 else 1, biggest + 1)
    return more


def view(more: dict[str, Any], house: int, house_value: int, today: int | None) -> dict[str, Any]:
    """Phần tính sẵn cho giao diện (không lưu): tình trạng nhà, giá sửa, trạng thái thú."""
    lvl = wear_level(more, house, today)
    unit = wear_unit(house_value)
    cost_all, _ = repair_cost(more, house, house_value, today, None)
    cost_one, _ = repair_cost(more, house, house_value, today, 1)
    day = more["repair"].get("day")
    nxt = None
    if wear_cap(house) and day is not None and today is not None and lvl < wear_cap(house):
        nxt = WEAR_DAYS - ((today - day) % WEAR_DAYS) if today >= day else WEAR_DAYS
    return {
        "today": today,
        "wear": {"level": lvl, "cap": wear_cap(house), "steps": [s for s in WEAR_STEPS[:lvl]],
                 "all_steps": WEAR_STEPS, "unit": unit, "cost_all": cost_all, "cost_one": cost_one,
                 "back": back_discount(more, today), "next_in": nxt},
        "pets": pets_view(more, today),
    }


def catalog_view() -> dict[str, Any]:
    """Phần danh mục của cửa hàng cho các tính năng 1.14."""
    return {
        "pets": [dict(v, id=k) for k, v in PETS.items()],
        "pet_love": [{"need": n, "name": s} for n, s in PET_LOVE],
        "seeds": [dict(v, id=k) for k, v in SEEDS.items()],
        "seed_kinds": list(SEED_KINDS),
        "uzone": {"max": UZONE_MAX, "price": UZONE_PRICE, "edit": UZONE_EDIT, "w": LANDMARK_W, "h": LANDMARK_H,
                  "env_w": ENV_W, "env_h": ENV_H,
                  "bg": [{"id": k, "name": v} for k, v in UZONE_BG.items()],
                  "ground": list(UZONE_GROUND), "hills": list(UZONE_HILLS)},
        "wear_days": WEAR_DAYS,
    }


# ---------------------------------------------------------------------------
# Hiệu ứng thành tích của vườn (tính ở Python, JS chỉ vẽ)
# ---------------------------------------------------------------------------

STREAK_MARKS = (7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000)


def joy_view(plants: list[dict[str, Any]], left: int | None, reviews: int, goal: int, streak: int,
             quests_done: bool, today: int | None) -> dict[str, Any]:
    """Trạng thái để vẽ hiệu ứng: xong hết thẻ hôm nay, đạt mục tiêu, vườn ra hoa / ra quả hết, mốc chuỗi ngày."""
    n = len(plants)
    stages = [p.get("stage", 0) for p in plants if not p.get("wilted")]
    low = min([p.get("stage", 0) for p in plants]) if plants else 0
    wilted = sum(1 for p in plants if p.get("wilted"))
    grown = None
    if n >= 5 and not wilted:
        grown = "fruit" if low >= 4 else "flower" if low >= 3 else "green" if low >= 2 else None
    mature = sum(1 for s in stages if s >= 3)
    return {
        "day": today,
        "done": bool(left == 0 and reviews > 0),
        "left": left,
        "goal": bool(goal > 0 and reviews >= goal),
        "grown": grown,
        "mature": mature,
        "fruit": sum(1 for s in stages if s >= 4),
        "plants": n,
        "streak": streak,
        "streak_mark": streak if streak in STREAK_MARKS else 0,
        "quests": bool(quests_done),
    }


# ---------------------------------------------------------------------------
# Giao diện tự chỉnh (config.json "ui", chỉ trên máy này): mỗi chế độ một kiểu
# ---------------------------------------------------------------------------

UI_MODES = ("main", "review", "panel")          # màn chính · đang ôn thẻ · đang mở Trò chơi / Báo / Cấu hình
UI_CHOICES: dict[str, tuple[str, ...]] = {
    "yard": ("full", "still", "dim", "hide"),    # cảnh sân (nhà + vùng)
    "field": ("full", "still", "dim", "hide"),   # ruộng cây
    "sky": ("on", "off"),                        # hạt bay theo mùa ở nền trang + dải trang trí chuyển động
    "weather": ("on", "off"),                    # mưa / tuyết rơi, chớp
    "mascot": ("on", "off"),                     # linh vật nói chuyện (bong bóng chữ)
    "joy": ("on", "off"),                        # hiệu ứng thành tích (xong thẻ, vườn ra hoa…)
    "pets": ("on", "off"),                       # thú nuôi + khách ghé vườn (1.21) trên sân
}
UI_GLOBAL: dict[str, tuple[str, ...]] = {
    "card": ("normal", "tall"),                  # khung thẻ khi ôn: vừa / to hết chỗ (khi ẩn vườn)
    "theme": ("garden", "paper"),                # màu bảng ôn: vàng / trắng giấy (1.23: bỏ "night" — Đêm vườn)
    "scene": ("normal", "large"),                # 1.23: cỡ cảnh trên màn chính: Vừa / Lớn
    "start": ("last", "yard"),                   # 1.23: mở vườn: cảnh đang chọn / luôn về Sân vườn
    "deco": ("on", "off"),                       # 1.25: dây trang trí mùa (dải trên cùng, sân, trong nhà): Hiện / Ẩn
}
UI_PRESETS: dict[str, dict[str, Any]] = {
    "full": {},                                  # như cũ: mọi thứ chuyển động
    "focus": {"review": {"yard": "hide", "field": "hide", "sky": "off", "weather": "off", "mascot": "off", "joy": "off"},
              "card": "tall"},
    "calm": {m: {"yard": "still", "field": "still", "sky": "off", "weather": "off"} for m in UI_MODES},
}
# 1.23 (người dùng: "tắt giao diện học buổi tối luôn vì có vẻ nhìn không đẹp lắm"): bỏ kiểu "Ôn buổi tối" và màu bảng
# "Đêm vườn". Ai đang dùng thì về như "Đầy đủ" (các mục của kiểu đó về mặc định, mục tự chỉnh khác giữ nguyên).
OLD_NIGHT = {"review": {"yard": "dim", "field": "dim", "sky": "off", "weather": "off", "mascot": "off"}}


def ui_default() -> dict[str, Any]:
    out: dict[str, Any] = {m: {k: v[0] for k, v in UI_CHOICES.items()} for m in UI_MODES}
    out.update({k: v[0] for k, v in UI_GLOBAL.items()})
    return out


def clean_ui(raw: Any) -> dict[str, Any]:
    out = ui_default()
    if not isinstance(raw, dict):
        return out
    night = raw.get("theme") == "night"         # 1.23: kiểu "Ôn buổi tối" cũ → bỏ
    for m in UI_MODES:
        sub = raw.get(m) if isinstance(raw.get(m), dict) else {}
        for k, choices in UI_CHOICES.items():
            if night and OLD_NIGHT.get(m, {}).get(k) == sub.get(k):
                continue
            if sub.get(k) in choices:
                out[m][k] = sub[k]
    for k, choices in UI_GLOBAL.items():
        if raw.get(k) in choices:
            out[k] = raw[k]
    return out


UI_KEEP_ON_PRESET = ("scene", "start", "deco")    # 1.25: nhóm "Màn chính" không thuộc kiểu có sẵn → bấm kiểu không đổi


def ui_preset(name: str, current: Any = None) -> dict[str, Any]:
    if name not in UI_PRESETS:
        raise MoreError("Không có kiểu giao diện này.")
    out = ui_default()
    for k, v in UI_PRESETS[name].items():
        if isinstance(v, dict):
            out[k].update(v)
        else:
            out[k] = v
    if current is not None:
        cur = clean_ui(current)
        for k in UI_KEEP_ON_PRESET:
            out[k] = cur[k]
    return out
