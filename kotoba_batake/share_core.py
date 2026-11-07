"""1.22 — giống cây tự vẽ và mã chia sẻ thiết kế.

Thuần Python (không import anki / aqt) để test được độc lập.

Giống cây tự vẽ
  - Vẽ trong Xưởng: 5 giai đoạn 16×16 (Hạt → Mầm → Cây non → Ra hoa → Ra quả), vẽ tối thiểu 3, giai đoạn chưa vẽ
    lấy hình giai đoạn gần nhất trước nó (Hạt chưa vẽ thì dùng hạt của cây gốc) — phần suy ra do JS vẽ (seeds.js).
  - Lưu: tên + luật gieo ở khoá "myseeds" ngay tầng trên cùng của MORE_KEY — bản 1.14–1.21 giữ hộ khoá lạ ở tầng
    này (keep_foreign_more), còn "seeds" thì bản cũ làm sạch theo danh sách giống của nó (sẽ xoá giống "g1" và luật
    trỏ tới nó). Điểm ảnh ở PX_KEY như món tự làm: px["g1"] = "mã0|mã1|mã2|mã3|mã4" ("" = chưa vẽ); bản cũ đọc / ghi
    PX_KEY cả khối nên giữ nguyên mục lạ.
  - Luật gieo theo deck / loại note / tag: luật trỏ tới giống tự vẽ nằm ở myseeds["rules"], luật trỏ tới giống mua
    (và "Trộn") nằm ở more["seeds"] như cũ. Đặt luật cho một chỗ thì xoá luật cùng chỗ ở bên kia. Nếu hai bên cùng
    có luật cho một chỗ (máy còn bản cũ đặt luật sau đó) thì luật của more["seeds"] thắng — đó là luật mới hơn.

Mã chia sẻ: KB1:<loại>:<cỡ>:<tên>:<dữ liệu>:<mã kiểm tra>
  - loại m = món tự làm (cỡ 16 / 24 / 32), z = vùng tự tạo (cỡ 64x76), g = giống cây tự vẽ (cỡ 16).
  - tên: UTF-8 rồi base64 (url-safe, bỏ dấu =); dữ liệu: chuỗi các phần cách nhau bằng dấu phẩy, nén zlib rồi base64:
      m: <loại đặt>,<hiệu ứng>,<mã điểm ảnh>     z: <nền>,<màu đất>,<màu đồi>,<công trình>,<cảnh nền>
      g: <mã giai đoạn 0>,…,<mã giai đoạn 4>
  - mã kiểm tra: CRC32 (8 chữ số hex) của mọi thứ trước dấu ":" cuối.
  Mã dán vào là dữ liệu không tin cậy: giới hạn độ dài trước và sau khi giải nén, kiểm tra từng màu / cỡ / loại /
  danh sách cho phép, làm sạch tên. Làm món từ mã thì trả xu như tự chế tác.
"""

from __future__ import annotations

import base64
import binascii
import re
import zlib
from typing import Any

try:   # chạy trong Anki (gói add-on)
    from . import more_core as more
except ImportError:   # nạp riêng (test): garden_core gán share.more = more ngay sau khi nạp file này
    more = None  # type: ignore[assignment]

MYSEED_KEY = "myseeds"
MYSEED_MAX = 12
MYSEED_PRICE = 500
MYSEED_EDIT = 50
STAGES = 5
STAGE_NAMES = ("Hạt", "Mầm", "Cây non", "Ra hoa", "Ra quả")
MIN_DRAWN = 3
SEED_W = 16
NAME_MAX = 24

SHARE_VER = "KB1"
CODE_MAX = 200_000          # độ dài tối đa của mã dán vào (vùng có cảnh nền 256×76 nhiều chi tiết ~ vài chục nghìn ký tự)
DATA_MAX = 160_000          # độ dài tối đa sau khi giải nén (công trình + cảnh nền chưa nén ≤ 2 × (64×76 + 256×76) ký tự)


class ShareError(ValueError):
    """Lỗi có câu tiếng Việt hiện cho người dùng."""


def is_myseed(v: Any) -> bool:
    return isinstance(v, str) and re.fullmatch(r"g[1-9]\d{0,3}", v) is not None


def _empty_rules() -> dict[str, Any]:
    return {"deck": {}, "kind": {}, "tag": []}


def empty_myseeds() -> dict[str, Any]:
    return {"items": {}, "next": 1, "rules": _empty_rules()}


def clean_myseeds(raw: Any) -> dict[str, Any]:
    out = empty_myseeds()
    if not isinstance(raw, dict):
        return out
    items = raw.get("items") if isinstance(raw.get("items"), dict) else {}
    for gid, meta in items.items():
        if is_myseed(gid) and isinstance(meta, dict) and len(out["items"]) < MYSEED_MAX:
            out["items"][gid] = {"name": more.clean_text(meta.get("name"), NAME_MAX, "Giống của tớ")}
    nxt = more._int(raw.get("next"))
    biggest = max([int(g[1:]) for g in out["items"]] or [0])
    out["next"] = max(nxt if nxt and nxt > 0 else 1, biggest + 1)
    ok = set(out["items"])
    rules = raw.get("rules") if isinstance(raw.get("rules"), dict) else {}
    deck = rules.get("deck") if isinstance(rules.get("deck"), dict) else {}
    for did, v in deck.items():
        if isinstance(did, str) and re.fullmatch(r"\d{1,20}", did) and v in ok and len(out["rules"]["deck"]) < 200:
            out["rules"]["deck"][did] = v
    kind = rules.get("kind") if isinstance(rules.get("kind"), dict) else {}
    out["rules"]["kind"] = {k: kind[k] for k in more.SEED_KINDS if kind.get(k) in ok}
    tags = rules.get("tag") if isinstance(rules.get("tag"), list) else []
    seen: set[str] = set()
    for row in tags:
        if isinstance(row, list) and len(row) == 2 and row[1] in ok:
            t = more._clean_tag(row[0])
            if t and t.lower() not in seen and len(out["rules"]["tag"]) < more.SEED_TAG_MAX:
                seen.add(t.lower())
                out["rules"]["tag"].append([t, row[1]])
    return out


# ---- điểm ảnh của giống tự vẽ (PX_KEY) ----

def _stage_code(code: Any, palette: dict[str, str]) -> str | None:
    """Mã một giai đoạn → mã gọn ("" = chưa vẽ), None nếu hỏng."""
    if code in (None, ""):
        return ""
    flat = more.px_decode_wh(code, SEED_W, SEED_W, palette)
    if flat is None:
        return None
    return more.px_encode(flat) if flat.strip(".") else ""


def stages_of(px_store: dict[str, str] | None, gid: str, palette: dict[str, str]) -> list[str]:
    """5 mã giai đoạn của giống gid ("" = chưa vẽ / hỏng)."""
    raw = (px_store or {}).get(gid)
    parts = raw.split("|") if isinstance(raw, str) else []
    out = []
    for i in range(STAGES):
        c = _stage_code(parts[i], palette) if i < len(parts) else ""
        out.append(c or "")
    return out


def check_stages(codes: Any, palette: dict[str, str]) -> list[str]:
    if not isinstance(codes, list) or len(codes) != STAGES:
        raise ShareError("Thiếu hình các giai đoạn của cây.")
    out = []
    for i, c in enumerate(codes):
        v = _stage_code(c, palette)
        if v is None:
            raise ShareError(f"Hình giai đoạn “{STAGE_NAMES[i]}” bị lỗi, thử vẽ lại nhé.")
        out.append(v)
    drawn = sum(1 for c in out if c)
    if drawn < MIN_DRAWN:
        raise ShareError(f"Vẽ ít nhất {MIN_DRAWN} giai đoạn đã nhé (mới có {drawn}).")
    return out


def save_myseed(my: dict[str, Any], payload: Any, px_store: dict[str, str], palette: dict[str, str]) -> tuple[int, str, str]:
    """Tạo giống mới (MYSEED_PRICE) hoặc sửa giống (MYSEED_EDIT nếu đổi hình, đổi tên miễn phí).
    Trả (xu phải trả, id giống, mã điểm ảnh ghép để lưu vào PX_KEY)."""
    if not isinstance(payload, dict):
        raise ShareError("Dữ liệu giống cây không hợp lệ.")
    codes = check_stages(payload.get("st"), palette)
    name = more.clean_text(payload.get("name"), NAME_MAX, "Giống của tớ")
    joined = "|".join(codes)
    gid = payload.get("id")
    if gid:
        if gid not in my["items"]:
            raise ShareError("Không tìm thấy giống này.")
        cost = MYSEED_EDIT if stages_of(px_store, gid, palette) != codes else 0
    else:
        if len(my["items"]) >= MYSEED_MAX:
            raise ShareError(f"Đã có {MYSEED_MAX} giống tự vẽ, xoá bớt giống cũ đã nhé.")
        n = max(1, int(my.get("next") or 1))
        while f"g{n}" in my["items"]:
            n += 1
        if n > 9999:
            raise ShareError("Hết chỗ tạo giống mới.")
        gid = f"g{n}"
        my["next"] = n + 1
        cost = MYSEED_PRICE
    my["items"][gid] = {"name": name}
    return cost, gid, joined


def delete_myseed(my: dict[str, Any], gid: str) -> None:
    if gid not in my["items"]:
        raise ShareError("Không tìm thấy giống này.")
    del my["items"][gid]
    r = my["rules"]
    r["deck"] = {k: v for k, v in r["deck"].items() if v != gid}
    r["kind"] = {k: v for k, v in r["kind"].items() if v != gid}
    r["tag"] = [row for row in r["tag"] if row[1] != gid]


def myseeds_view(my: dict[str, Any], px_store: dict[str, str] | None, palette: dict[str, str]) -> list[dict[str, Any]]:
    """Cho giao diện: [{id, name, st: [5 mã], drawn: số giai đoạn đã vẽ}]."""
    out = []
    for gid, meta in my["items"].items():
        st = stages_of(px_store, gid, palette)
        out.append({"id": gid, "name": meta["name"], "st": st, "drawn": sum(1 for c in st if c)})
    return out


# ---- luật gieo: gộp giống mua + giống tự vẽ ----

def combined(sd: dict[str, Any], my: dict[str, Any] | None) -> dict[str, Any]:
    """Bảng luật để more.resolve_seed / apply_seeds dùng: owned = giống mua + giống tự vẽ; luật của more["seeds"]
    thắng khi hai bên cùng có luật cho một chỗ."""
    if not my or not my.get("items"):
        return sd
    r = my["rules"]
    deck = dict(r["deck"])
    deck.update(sd.get("deck") or {})
    kind = dict(r["kind"])
    kind.update(sd.get("kind") or {})
    legacy_tags = list(sd.get("tag") or [])
    have = {t.lower() for t, _v in legacy_tags}
    tags = legacy_tags + [row for row in r["tag"] if row[0].lower() not in have]
    return {"owned": list(sd.get("owned") or []) + list(my["items"]), "deck": deck, "kind": kind, "tag": tags}


def set_rule(m: dict[str, Any], where: str, key: Any, value: Any) -> None:
    """Đặt luật gieo; value là giống tự vẽ thì ghi vào myseeds, còn lại (giống mua, "mix", "" = bỏ) ghi như cũ."""
    my = m.setdefault(MYSEED_KEY, empty_myseeds())
    value = "" if value in (None, "", "default") else value
    if is_myseed(value):
        if value not in my["items"]:
            raise ShareError("Không tìm thấy giống này.")
        r = my["rules"]
        if where == "deck":
            did = str(key)
            if not re.fullmatch(r"\d{1,20}", did):
                raise ShareError("Deck không hợp lệ.")
            more.set_seed_rule(m, "deck", did, "")
            r["deck"][did] = value
        elif where == "kind":
            if key not in more.SEED_KINDS:
                raise ShareError("Loại note không hợp lệ.")
            more.set_seed_rule(m, "kind", key, "")
            r["kind"][key] = value
        elif where == "tag":
            tag = more._clean_tag(key)
            if not tag:
                raise ShareError("Gõ tên tag (không có dấu cách).")
            rest = [row for row in r["tag"] if row[0].lower() != tag.lower()]
            legacy = [row for row in m["seeds"]["tag"] if row[0].lower() != tag.lower()]
            if len(rest) + len(legacy) >= more.SEED_TAG_MAX:
                raise ShareError(f"Tối đa {more.SEED_TAG_MAX} luật theo tag.")
            m["seeds"]["tag"] = legacy
            rest.append([tag, value])
            r["tag"] = rest
        else:
            raise ShareError("Luật gieo không hợp lệ.")
        return
    r = my["rules"]
    if where == "tag" and value:          # giới hạn số luật tag tính chung hai bên
        tag = more._clean_tag(key)
        mine = [row for row in r["tag"] if row[0].lower() != tag.lower()]
        legacy = [row for row in m["seeds"]["tag"] if row[0].lower() != tag.lower()]
        if tag and len(mine) + len(legacy) >= more.SEED_TAG_MAX:
            raise ShareError(f"Tối đa {more.SEED_TAG_MAX} luật theo tag.")
    more.set_seed_rule(m, where, key, value)
    if where == "deck":
        r["deck"].pop(str(key), None)
    elif where == "kind":
        r["kind"].pop(key, None)
    elif where == "tag":
        tag = more._clean_tag(key).lower()
        r["tag"] = [row for row in r["tag"] if row[0].lower() != tag]


# ---- mã chia sẻ ----

def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(text: str) -> bytes:
    if not re.fullmatch(r"[A-Za-z0-9_-]*", text):
        raise ShareError("Mã có ký tự lạ — chép lại cả đoạn nhé.")
    try:
        return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))
    except (binascii.Error, ValueError):
        raise ShareError("Mã bị hỏng — chép lại cả đoạn nhé.") from None


def _crc(head: str) -> str:
    return f"{zlib.crc32(head.encode('ascii')) & 0xFFFFFFFF:08x}"


def make_code(kind: str, size: str, name: str, parts: list[str]) -> str:
    head = ":".join([SHARE_VER, kind, size, _b64e(name.encode("utf-8")),
                     _b64e(zlib.compress(",".join(parts).encode("ascii"), 9))])
    return head + ":" + _crc(head)


def code_item(meta: dict[str, Any], px_code: str) -> str:
    return make_code("m", str(meta["size"]), meta["name"], [meta["kind"], meta.get("fx") or "none", px_code])


def code_zone(z: dict[str, Any]) -> str:
    return make_code("z", f"{more.LANDMARK_W}x{more.LANDMARK_H}", z["name"],
                     [z["bg"], z["ground"].lstrip("#"), z["hills"].lstrip("#"), z.get("lm") or "", z.get("env") or ""])


def code_seed(name: str, stages: list[str]) -> str:
    return make_code("g", str(SEED_W), name, list(stages))


def parse_code(text: Any, palette: dict[str, str], craft_prices: dict[int, int], craft_kinds: Any,
               craft_fx: Any) -> dict[str, Any]:
    """Đọc mã dán vào → bản xem trước {t, name, …, price}. Lỗi → ShareError (câu cho người dùng)."""
    if not isinstance(text, str):
        raise ShareError("Dán mã chia sẻ vào ô trước đã.")
    if len(text) > CODE_MAX * 2:
        raise ShareError("Mã dài quá, không phải mã thiết kế của vườn.")
    code = "".join(text.split())          # dán từ tin nhắn hay bị xuống dòng / thêm dấu cách
    if not code:
        raise ShareError("Dán mã chia sẻ vào ô trước đã.")
    if len(code) > CODE_MAX:
        raise ShareError("Mã dài quá, không phải mã thiết kế của vườn.")
    m = re.match(r"KB(\d+):", code)
    if not m:
        raise ShareError("Đây không phải mã thiết kế (mã đúng bắt đầu bằng “KB1:”).")
    if m.group(0) != SHARE_VER + ":":
        raise ShareError("Mã này của bản ことば畑 mới hơn — cập nhật rồi dán lại nhé.")
    parts = code.split(":")
    if len(parts) != 6:
        raise ShareError("Mã bị thiếu một đoạn — chép lại cả đoạn nhé.")
    _ver, kind, size, name64, data64, crc = parts
    if crc.lower() != _crc(":".join(parts[:5])):
        raise ShareError("Mã bị thiếu hoặc sai một chỗ (mã kiểm tra không khớp) — chép lại cả đoạn nhé.")
    try:
        raw_name = _b64d(name64)[:400].decode("utf-8", "ignore")
    except ShareError:
        raw_name = ""
    try:
        dec = zlib.decompressobj()
        raw = dec.decompress(_b64d(data64), DATA_MAX + 1)
        if len(raw) > DATA_MAX or dec.unconsumed_tail:
            raise ShareError("Mã chứa quá nhiều dữ liệu.")
        data = raw.decode("ascii")
    except (zlib.error, UnicodeDecodeError):
        raise ShareError("Mã bị hỏng — chép lại cả đoạn nhé.") from None
    fields = data.split(",")
    if kind == "m":
        try:
            sz = int(size)
        except ValueError:
            sz = 0
        if sz not in craft_prices or len(fields) != 3:
            raise ShareError("Mã món đồ không hợp lệ.")
        place, fx, px = fields
        if place not in craft_kinds:
            raise ShareError("Mã món đồ không hợp lệ (loại đặt lạ).")
        flat = more.px_decode_wh(px, sz, sz, palette)
        if flat is None or not flat.strip("."):
            raise ShareError("Hình trong mã bị hỏng.")
        return {"t": "m", "name": more.clean_text(raw_name, NAME_MAX, "Món tự làm"), "size": sz, "kind": place,
                "fx": fx if fx in craft_fx else "none", "px": more.px_encode(flat), "price": craft_prices[sz]}
    if kind == "z":
        if size != f"{more.LANDMARK_W}x{more.LANDMARK_H}" or len(fields) != 5:
            raise ShareError("Mã vùng không hợp lệ.")
        bg, ground, hills, lm, env = fields
        ground, hills = "#" + ground.lower(), "#" + hills.lower()
        if bg not in more.UZONE_BG or ground not in more.UZONE_GROUND or hills not in more.UZONE_HILLS:
            raise ShareError("Mã vùng không hợp lệ (nền / màu lạ).")
        lm_flat = more.px_decode_wh(lm, more.LANDMARK_W, more.LANDMARK_H, palette) if lm else "." * (more.LANDMARK_W * more.LANDMARK_H)
        env_code = more.clean_env(env, palette)
        if lm_flat is None or env_code is None:
            raise ShareError("Hình trong mã bị hỏng.")
        lm_code = more.px_encode(lm_flat) if lm_flat.strip(".") else ""
        if not lm_code and not env_code:
            raise ShareError("Vùng trong mã chưa vẽ gì.")
        return {"t": "z", "name": more.clean_text(raw_name, 20, "Vùng của tớ"), "bg": bg, "ground": ground,
                "hills": hills, "lm": lm_code, "env": env_code, "price": more.UZONE_PRICE}
    if kind == "g":
        if size != str(SEED_W) or len(fields) != STAGES:
            raise ShareError("Mã giống cây không hợp lệ.")
        try:
            st = check_stages(fields, palette)
        except ShareError:
            raise ShareError("Hình trong mã bị hỏng.") from None
        return {"t": "g", "name": more.clean_text(raw_name, NAME_MAX, "Giống của tớ"), "st": st, "price": MYSEED_PRICE}
    raise ShareError("Mã này của bản ことば畑 mới hơn — cập nhật rồi dán lại nhé.")
