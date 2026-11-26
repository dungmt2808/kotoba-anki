"""Trang web chung (GitHub Pages): tên, giá, mô tả của mọi thứ trong vườn — đọc thẳng từ mã Python của add-on.

Chạy: python3 site/tools/xuat_ten.py [THU_MUC_ADDON] > ten.json
(`xuat_hinh.js` tự gọi file này; không cần chạy tay.)
Không import aqt / anki — dùng các *_core.py thuần Python như bộ test.
"""
from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake")
sys.path.insert(0, ADDON)
sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))

import finds_core  # noqa: E402
import garden_core as core  # noqa: E402
import guest_core  # noqa: E402
import le_core  # noqa: E402

# garden_core nạp bản riêng của các *_core (khi chạy ngoài Anki) và nối chúng với nhau — dùng đúng các bản đó
decor_core, more_core, season_core, share_core = core.decor, core.more, core.season, core.share

# 4 loài hoa của Lịch hoa (web/seeds.js CAL_ONLY) — không bán ở cửa hàng nên Python không có tên
CAL_FLOWERS = {"mai": "Mai vàng", "ajisai": "Cẩm tú cầu", "kiku": "Hoa cúc", "poinsettia": "Trạng nguyên"}


def _version() -> str:
    with open(os.path.join(ADDON, "manifest.json"), encoding="utf-8") as f:
        return json.load(f).get("human_version", "")


def _contact() -> str:
    """Email liên hệ đã ghi trong add-on (CONTACT_EMAIL ở __init__.py) — một chỗ duy nhất để sửa."""
    with open(os.path.join(ADDON, "__init__.py"), encoding="utf-8") as f:
        m = re.search(r'^CONTACT_EMAIL\s*=\s*"([^"]+)"', f.read(), re.M)
    return m.group(1) if m else ""


def _le() -> dict:
    """1.36: sự kiện Giáng sinh (le_core) cho mục "Giáng sinh 2026" của trang — lịch, luật, ngăn theo nhóm, câu chúc, mã thiệp.
    Hộp quà bí mật: chỉ ghi số hộp (món bên trong để `box_items` — xuat_hinh.js dùng để che ở Kho hình tới 25/12, không ghi ra
    su_kien.json)."""
    doors = []
    box_items: list[str] = []
    for d in sorted(le_core.DOORS):
        info = le_core.DOORS[d]
        if info["kind"] == "qua":
            box_items += list((info.get("item") or {}).keys())
            doors.append({"kind": "qua"})
            continue
        doors.append({"kind": info["kind"], "name": info["name"], "desc": info["desc"],
                      "items": sorted((info.get("item") or {}).keys()), "tiles": list(info.get("tiles") or [])})
    # thiệp mẫu: có cả hình vẽ tay (bông tuyết, trái tim) như ảnh phác 1.36.3
    W = le_core.CARD_W
    cells = ["."] * (W * le_core.CARD_H)
    for x0, y0 in ((14, 36), (64, 31), (110, 40), (52, 48)):
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            cells[(y0 + dy) * W + x0 + dx] = "w"
    for j, row in enumerate(["..pp.pp..", ".ppppppp.", "ppppppppp", ".ppppppp.", "..ppppp..", "...ppp...", "....p...."]):
        for i, ch in enumerate(row):
            if ch != ".":
                cells[(30 + j) * W + 76 + i] = ch
    sample = {"f": "thong", "st": [{"s": "xmastree", "x": 4, "y": 22}, {"s": "presents", "x": 34, "y": 52},
                                    {"s": "stackchan", "x": 88, "y": 43}, {"s": "le_tat", "x": 70, "y": 50, "m": 1}],
              "t1": "Giáng sinh an lành!", "t2": "— ことば畑", "c": "ja", "d": le_core._px_encode("".join(cells))}
    return {
        "id": le_core.EV_ID, "year": le_core.YEAR, "pre_from": le_core.PRE_FROM.isoformat(), "first": le_core.FIRST.isoformat(),
        "doors_n": le_core.DOORS_N, "end": le_core.END.isoformat(), "box_day": le_core.BOX_DAY.isoformat(),
        "eve": le_core.EVE.isoformat(timespec="minutes"), "makeup_per": le_core.MAKEUP_PER, "makeup_max": le_core.MAKEUP_MAX,
        "kinds": le_core.KIND_NAMES, "doors": doors, "boxes": len(le_core.BOX_DOORS), "box_items": box_items,
        "chuc": le_core.CHUC, "frames": [{"id": f, "name": le_core.FRAME_NAMES[f]} for f in le_core.FRAMES],
        "langs": le_core.LANG_VI, "fix_per_day": le_core.FIX_PER_DAY, "cards": le_core.CARDS_MAX,
        "code": {"prefix": le_core.CODE_PREFIX, "max": le_core.CODE_MAX, "unzip_max": 16000},
        "limits": {"t1": le_core.T1_MAX, "t2": le_core.T2_MAX, "stickers": le_core.STICKERS_MAX, "w": le_core.CARD_W,
                   "h": le_core.CARD_H, "recv": le_core.RECV_MAX},
        "sample": le_core.card_code(sample),
        # 1.36.3: hình vẽ trên thiệp — 32 màu của Xưởng, giới hạn (đã nén)
        "draw_pal": {k: core.CRAFT_PALETTE[k] for k in le_core.DRAW_CHARS}, "d_max": le_core.D_MAX,
    }


def main() -> None:
    cat = core.home_catalog()
    more = more_core.catalog_view()
    themes = {t["id"]: {"name": t["name"], "jp": t.get("jp", ""), "kind": t.get("kind", "")} for t in season_core.THEMES}
    items = []
    for it in cat["items"]:
        items.append({
            "id": it["id"], "name": it["name"], "price": it.get("price", 0), "scene": it.get("scene"),
            "w": it.get("w", 1), "place": it.get("place"), "desc": it.get("desc") or "",
            "season": it.get("season"), "rare": bool(it.get("rare")), "only": it.get("only"),
            "group": it.get("group"), "set": it.get("set"),
        })
    out = {
        "version": _version(),
        "contact": _contact(),
        "items": items,
        "themes": themes,
        "zones": [{"id": "yard", "name": "Sân nhà"}] + [{"id": z["id"], "name": z["name"], "price": z["price"]} for z in cat["zones"]],
        "rooms": {"room": "Phòng chính", **{r["id"]: r["name"] for r in cat["rooms"]}},
        "levels": cat["levels"],
        "styles": cat["styles"],
        "wear": cat["wear"],
        "faces": cat["faces"],
        "pets": more["pets"],
        "seeds": more["seeds"],
        "cal_flowers": CAL_FLOWERS,
        "uzone": more["uzone"],
        "le": _le(),
        "guests": [dict({"id": k}, **{f: v.get(f) for f in ("name", "ja", "hint", "where")}) for k, v in guest_core.GUESTS.items()],
        "finds": [dict({"id": k}, **v) for k, v in finds_core.FINDS.items()],
        "find_scenes": finds_core.SCENE_NAMES,
        "set_reward": finds_core.SET_REWARD,
        "decor": decor_core.catalog_view(),
        "craft": {"palette": core.CRAFT_PALETTE, "prices": {str(k): v for k, v in core.CRAFT_PRICES.items()},
                  "kinds": core.CRAFT_KINDS, "fx": list(core.CRAFT_FX)},
        "share": {"ver": share_core.SHARE_VER, "seed_price": share_core.MYSEED_PRICE, "zone_price": more_core.UZONE_PRICE,
                  "stages": list(share_core.STAGE_NAMES), "code_max": share_core.CODE_MAX, "data_max": share_core.DATA_MAX},
    }
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
