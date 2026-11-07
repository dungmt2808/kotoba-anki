"""ことば畑 1.21 – Khách ghé vườn + Album khách (thuần Python, không import aqt → test được).

Python giữ: danh sách khách, ai ghé được cảnh nào (theo đồ đã đặt, vùng, tháng), tần suất (theo số cây Ra quả của vườn
đang xem), album (ngày gặp lần đầu, số ngày đã ghé). JS (web/guests.js) chỉ vẽ: chọn khách theo khung giờ thật trong
những khách Python cho phép, lọc thêm theo giờ / thời tiết của trời đang hiện, gặp lần đầu thì gửi `guest:met:<id>:<cảnh>`.

Không có xu, không phải cho ăn, không mất gì khi vắng (kế hoạch 1.20 mục 7). Album đồng bộ qua AnkiWeb (khoá riêng)."""
from __future__ import annotations

import datetime as _dt
import json
import os
import re
from typing import Any, Callable

GUEST_KEY = "kotoba_batake_guests"
OUTDOOR = ("yard", "beach", "shrine", "festival", "bamboo", "onsen", "station")
SCENE_RE = re.compile(r"^(yard|room|beach|shrine|festival|bamboo|onsen|station|u\d{1,2})$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_DAYS = 100000

# Khách (thứ tự = thứ tự trong album). Các trường:
#   ja: tên tiếng Nhật trang trí · kind: walk (đi bộ) / hop (chim nhảy dưới đất) / fly (bay lượn) / perch (đậu yên) /
#   swarm (đàn đom đóm) · where: "out" (mọi cảnh ngoài trời) / "room" / tuple cảnh · free: cảnh không cần món `need`
#   need: phải có một trong các món này ở cảnh đó (trừ cảnh trong `free`) · like: có món này thì ghé thường hơn (×3) và
#   đứng cạnh món đó · months: tháng ghé (None = quanh năm) · tod: buổi (day / dusk / night) · wx: dry (không mưa) /
#   wet (đang mưa) / snow (đang có tuyết) / any · w: trọng số gốc · rare: khách hiếm theo mùa · hint: gợi ý chỗ gặp
GUESTS: dict[str, dict[str, Any]] = {
    "suzume": {"name": "Chim sẻ", "ja": "スズメ", "kind": "hop", "where": "out", "tod": ("day", "dusk"), "wx": "dry",
               "like": ("flowers", "fence", "birdhouse", "scarecrow", "sunflower", "rice", "bamboofence"), "w": 10,
               "hint": "Ban ngày, trời không mưa · thích bụi hoa, hàng rào, nhà chim"},
    "neko": {"name": "Mèo hoang", "ja": "ノラネコ", "kind": "walk", "where": "out", "tod": ("day", "dusk"), "wx": "dry",
             "like": ("bench",), "w": 6,
             "hint": "Trời không mưa · thích nằm trên ghế gỗ"},
    "cho": {"name": "Bướm phượng", "ja": "アゲハチョウ", "kind": "fly", "where": "out", "tod": ("day",), "wx": "dry",
            "months": (3, 4, 5, 6, 7, 8, 9), "like": ("flowers", "sunflower", "sakura", "karesansui"), "w": 7,
            "hint": "Ban ngày tháng 3–9 · thích hoa"},
    "kaeru": {"name": "Ếch xanh", "ja": "アマガエル", "kind": "hop", "where": "out", "tod": ("day", "dusk", "night"),
              "wx": "wet", "months": (4, 5, 6, 7, 8, 9, 10),
              "like": ("pond", "well", "fountain", "rice", "temizuya", "kingyo", "taikobashi"), "w": 9,
              "hint": "Khi trời mưa, tháng 4–10 · thích ao, giếng"},
    "sagi": {"name": "Cò trắng", "ja": "シラサギ", "kind": "perch", "where": "out", "tod": ("day",), "wx": "nosnow",
             "need": ("pond", "rice", "kingyo", "taikobashi", "fountain"), "free": ("beach",), "w": 7,
             "hint": "Ban ngày · cần ao cá koi, ruộng lúa nhỏ hoặc ra Bãi biển"},
    "hotaru": {"name": "Đom đóm", "ja": "ホタル", "kind": "swarm", "where": "out", "tod": ("night",), "wx": "dry",
               "months": (5, 6, 7, 8), "need": ("pond", "lantern", "chochin", "hotaru", "taikobashi", "temizuya", "rice"),
               "free": ("bamboo",), "w": 8,
               "hint": "Đêm tháng 5–8 · cần ao, đèn lồng hoặc ra Rừng tre"},
    "tanuki": {"name": "Tanuki", "ja": "タヌキ", "kind": "walk", "where": ("yard", "bamboo", "shrine", "festival", "station", "u"),
               "tod": ("dusk", "night"), "wx": "dry", "like": ("tanuki", "yatai", "ringoame"), "w": 5,
               "hint": "Hoàng hôn, ban đêm · thích tượng tanuki, quầy mì yatai"},
    "kitsune": {"name": "Cáo đỏ", "ja": "キツネ", "kind": "walk", "where": "out", "tod": ("dusk", "night"), "wx": "dry",
                "need": ("kitsune", "torii", "hokora"), "free": ("shrine",), "like": ("kitsune",), "w": 5,
                "hint": "Hoàng hôn, ban đêm · ở Đền trên núi hoặc chỗ có cổng torii, tượng cáo"},
    "shika": {"name": "Hươu sao", "ja": "シカ", "kind": "walk", "where": "out", "tod": ("day", "dusk"), "wx": "dry",
              "need": ("shika",), "free": ("shrine",), "like": ("shika", "momiji"), "w": 7,
              "hint": "Ban ngày · ở Đền trên núi hoặc chỗ có tượng hươu Nara"},
    "kamome": {"name": "Hải âu", "ja": "カモメ", "kind": "hop", "where": ("beach",), "tod": ("day", "dusk"), "wx": "nosnow",
               "like": ("lighthouse", "parasol", "swimring"), "w": 9,
               "hint": "Ban ngày · ở Bãi biển"},
    "tsubame": {"name": "Chim én", "ja": "ツバメ", "kind": "fly", "where": ("station", "yard"), "tod": ("day",), "wx": "dry",
                "months": (3, 4, 5, 6, 7, 8), "like": ("busstop", "fumikiri"), "w": 6,
                "hint": "Ban ngày tháng 3–8 · ở Ga làng quê và sân nhà"},
    "fukuro": {"name": "Cú", "ja": "フクロウ", "kind": "perch", "where": "out", "tod": ("night",), "wx": "dry",
               "like": ("cedar", "torii", "pagoda", "momiji", "sakura", "lantern"), "w": 4,
               "hint": "Ban đêm · thích cây tuyết tùng, cổng torii, cây lớn"},
    "mejiro": {"name": "Chim vành khuyên", "ja": "メジロ", "kind": "perch", "where": ("room",), "tod": ("day",), "wx": "any",
               "need": ("furin",), "w": 8,
               "hint": "Ban ngày · đậu bậu cửa sổ khi trong nhà treo chuông gió fūrin"},
    "komori": {"name": "Dơi", "ja": "コウモリ", "kind": "fly", "where": "out", "tod": ("night",), "wx": "dry",
               "months": (10,), "w": 6, "rare": True,
               "hint": "Ban đêm mùa Halloween (tháng 10)"},
    "tsuru": {"name": "Sếu đầu đỏ", "ja": "タンチョウ", "kind": "walk", "where": "out", "tod": ("day",), "wx": "any",
              "months": (12, 1, 2), "like": ("pond", "rice", "rotenburo"), "w": 3, "rare": True,
              "hint": "Ban ngày mùa đông (tháng 12–2)"},
    "okojo": {"name": "Chồn tuyết", "ja": "オコジョ", "kind": "walk", "where": "out", "tod": ("day", "dusk", "night"),
              "wx": "snow", "months": (11, 12, 1, 2, 3), "w": 6, "rare": True,
              "hint": "Khi có tuyết (tháng 11–3)"},
}
ORDER = list(GUESTS)
WX = ("dry", "wet", "snow", "nosnow", "any")
TODS = ("day", "dusk", "night")


def _today_str(today: _dt.date) -> str:
    return today.isoformat()


def is_outdoor(scene: str) -> bool:
    return scene in OUTDOOR or bool(re.match(r"^u\d{1,2}$", scene or ""))


def scene_ok(gid: str, scene: str) -> bool:
    """Khách này có ở cảnh này không (chỉ theo loại cảnh, chưa xét đồ / tháng)."""
    g = GUESTS.get(gid)
    if not g or not SCENE_RE.match(scene or ""):
        return False
    where = g["where"]
    if where == "out":
        return is_outdoor(scene)
    if where == "room":
        return scene == "room"
    if scene.startswith("u") and scene[1:].isdigit():
        return "u" in where
    return scene in where


def items_in(home: dict[str, Any], scene: str) -> set[str]:
    out: set[str] = set()
    for e in home.get(scene) or []:
        if isinstance(e, dict) and isinstance(e.get("id"), str):
            out.add(e["id"])
    return out


def month_ok(gid: str, today: _dt.date) -> bool:
    months = GUESTS[gid].get("months")
    return not months or today.month in months


def weight(gid: str, scene: str, home: dict[str, Any], today: _dt.date) -> int:
    """Trọng số ghé cảnh này hôm nay (0 = không ghé). Giờ / thời tiết do JS xét theo trời đang hiện."""
    if gid not in GUESTS or not scene_ok(gid, scene) or not month_ok(gid, today):
        return 0
    g = GUESTS[gid]
    have = items_in(home, scene)
    need = g.get("need")
    if need and scene not in g.get("free", ()) and not (have & set(need)):
        return 0
    w = int(g["w"])
    if have & set(g.get("like", ())):
        w *= 3
    return w


def scenes_of(home: dict[str, Any], zones: list[str], uzones: list[str], room: bool) -> list[str]:
    out = ["yard"] + [z for z in OUTDOOR[1:] if z in zones] + [u for u in uzones if re.match(r"^u\d{1,2}$", u)]
    if room:
        out.append("room")
    return out


def rate(fruit: int) -> float:
    """Tỉ lệ thời gian có khách ở một cảnh: vườn nhiều cây Ra quả thì khách tới thường hơn (0,3 → 0,85)."""
    return round(0.3 + 0.55 * min(1.0, max(0, int(fruit)) / 150.0), 3)


def rate_label(fruit: int) -> str:
    r = rate(fruit)
    return "thỉnh thoảng" if r < 0.45 else "khá thường" if r < 0.7 else "rất thường"


# ---- album ---------------------------------------------------------------------------------------------------------

def clean_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    d = raw.get("d")
    if not isinstance(d, str) or not DATE_RE.match(d):
        return None
    try:
        _dt.date.fromisoformat(d)
    except ValueError:
        return None
    out: dict[str, Any] = {"d": d}
    s = raw.get("s")
    out["s"] = s if isinstance(s, str) and SCENE_RE.match(s) else "yard"
    last = raw.get("l")
    out["l"] = last if isinstance(last, str) and DATE_RE.match(last) and last >= d else d
    try:
        n = int(raw.get("n", 1))
    except (TypeError, ValueError):
        n = 1
    out["n"] = max(1, min(MAX_DAYS, n))
    return out


def clean_album(raw: Any) -> dict[str, dict[str, Any]]:
    met = raw.get("met") if isinstance(raw, dict) else None
    out: dict[str, dict[str, Any]] = {}
    if isinstance(met, dict):
        for gid in ORDER:
            e = clean_entry(met.get(gid))
            if e:
                out[gid] = e
    return out


class GuestStore:
    """Album ở khoá collection `kotoba_batake_guests` = {"met": {id: {d, s, n, l}}} (+ khoá lạ của bản sau giữ nguyên).
    Sao lưu `user_files/guests.json` (chỉ đọc khi không có collection)."""

    def __init__(self, path: str, col_getter: Callable[[], Any] | None = None) -> None:
        self.path = path
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def _raw(self) -> dict[str, Any]:
        col = self._col()
        if col is not None:
            try:
                raw = col.get_config(GUEST_KEY, None)
            except Exception:
                raw = None
            return dict(raw) if isinstance(raw, dict) else {}
        try:
            with open(self.path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            raw = None
        return dict(raw) if isinstance(raw, dict) else {}

    def album(self) -> dict[str, dict[str, Any]]:
        return clean_album(self._raw())

    def met(self, gid: str, scene: str, today: _dt.date) -> tuple[dict[str, dict[str, Any]], bool, bool]:
        """Ghi một lần gặp. Trả (album, gặp lần đầu?, có ghi?). Mỗi khách chỉ ghi một lần mỗi ngày (đếm ngày đã ghé)."""
        raw = self._raw()
        met = dict(raw.get("met")) if isinstance(raw.get("met"), dict) else {}
        ds = _today_str(today)
        cur = clean_entry(met.get(gid))
        new = cur is None
        if new:
            rec = {"d": ds, "s": scene, "n": 1, "l": ds}
        elif cur["l"] >= ds:
            return clean_album(raw), False, False
        else:
            rec = dict(cur, n=min(MAX_DAYS, cur["n"] + 1), l=ds)
        old = met.get(gid) if isinstance(met.get(gid), dict) else {}
        met[gid] = dict(old, **rec)            # giữ khoá lạ của bản sau ở mức từng khách
        raw["met"] = met
        col = self._col()
        if col is not None:
            col.set_config(GUEST_KEY, raw)
        self._backup(raw)
        return clean_album(raw), new, True

    def _backup(self, raw: dict[str, Any]) -> None:
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False)
            os.replace(tmp, self.path)
        except OSError:
            pass


# ---- dữ liệu gửi JS ----------------------------------------------------------------------------------------------

def defs_view() -> dict[str, dict[str, Any]]:
    out = {}
    for gid in ORDER:
        g = GUESTS[gid]
        out[gid] = {"name": g["name"], "ja": g["ja"], "kind": g["kind"], "tod": list(g["tod"]), "wx": g["wx"],
                    "spot": list(g.get("like", ())) + [i for i in g.get("need", ()) if i not in g.get("like", ())],
                    "rare": bool(g.get("rare"))}
    return out


def view(album: dict[str, dict[str, Any]], home: dict[str, Any], scenes: list[str], today: _dt.date,
         fruit: int) -> dict[str, Any]:
    cand: dict[str, list[list[Any]]] = {}
    for sc in scenes:
        lst = [[gid, weight(gid, sc, home, today)] for gid in ORDER]
        lst = [x for x in lst if x[1] > 0]
        if lst:
            cand[sc] = lst
    entries = []
    for gid in ORDER:
        g = GUESTS[gid]
        e = album.get(gid)
        now = any(gid == x[0] for lst in cand.values() for x in lst)
        entries.append({"id": gid, "name": g["name"], "ja": g["ja"], "hint": g["hint"], "rare": bool(g.get("rare")),
                        "met": bool(e), "d": e["d"] if e else "", "s": e["s"] if e else "", "n": e["n"] if e else 0,
                        "season": month_ok(gid, today), "now": now})
    return {"defs": defs_view(), "cand": cand, "rate": rate(fruit), "fruit": max(0, int(fruit)),
            "rate_label": rate_label(fruit), "list": entries, "met": sum(1 for x in entries if x["met"]),
            "total": len(entries), "today": today.isoformat()}


def new_between(album: dict[str, dict[str, Any]], start: _dt.date, end: _dt.date) -> list[dict[str, str]]:
    """Khách gặp lần đầu trong [start, end] (cho Lịch hoa / cuốn nhật ký), theo ngày rồi theo thứ tự album."""
    a, b = start.isoformat(), end.isoformat()
    out = [{"id": gid, "name": GUESTS[gid]["name"], "d": album[gid]["d"]} for gid in ORDER
           if gid in album and a <= album[gid]["d"] <= b]
    return sorted(out, key=lambda x: (x["d"], ORDER.index(x["id"])))
