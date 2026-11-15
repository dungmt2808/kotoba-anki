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
