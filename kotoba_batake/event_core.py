"""ことば畑 1.26 — màn chào khi mở vườn + Bảng tin làng.

Chỉ tổng hợp từ dữ liệu có sẵn (ví, thú nuôi, khách, giao diện mùa, gói báo, vé giữ chuỗi, lịch sử ôn) theo ngày Anki;
không lưu gì mới. Thuần Python (không import anki / aqt) để test offline bằng ngày giả.

- `greeter`: ai ra chào — thú thân nhất đang ở nhà (cùng mức thì chọn theo ngày, cố định trong ngày); chưa nuôi thú →
  StackChan; mọi con đều đi chơi → StackChan báo nhẹ "… đi chơi rồi — cho ăn là về nhé".
- `festival`: câu chào ngày lễ (Tết, お正月, Giáng sinh, Halloween, Trung thu, Thất Tịch); ngày thường JS chào theo giờ.
- `news`: tin hôm nay + sắp tới (7 ngày) + 1–3 dòng cho màn chào + dòng "Tin làng" của thẻ Hôm nay (chỉ tin chưa nằm sẵn
  trong thẻ: Nhiệm vụ / Báo / thú đói / nhà cần sửa đã có dòng riêng).
"""
from __future__ import annotations

import datetime as _dt
from typing import Any

try:
    from . import guest_core as guests
    from . import season_core as season
except ImportError:     # chạy test độc lập
    import guest_core as guests  # type: ignore[no-redef]
    import season_core as season  # type: ignore[no-redef]

WEEKDAY = ("T2", "T3", "T4", "T5", "T6", "T7", "CN")
WEEKDAY_FULL = ("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật")
SOON_DAYS = 7
MILESTONE_DAYS = (30, 50, 100, 150, 200, 300, 365, 500, 730, 1000, 1500, 2000)
STREAK_SOON = (7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000)   # = more_core.STREAK_MARKS
NEAR = 3                # "còn ≤ 3 ngày nữa" mới báo
GREET_LINES = 3
SCENE_NAMES = {"yard": "Sân vườn", "room": "Trong nhà", "beach": "Bãi biển", "shrine": "Đền trên núi",
               "bamboo": "Rừng tre", "festival": "Phố lễ hội", "station": "Ga làng quê", "onsen": "Suối nước nóng"}


def date_label(d: _dt.date) -> str:
    """"Thứ Năm 12/11"."""
    return "%s %d/%d" % (WEEKDAY_FULL[d.weekday()], d.day, d.month)


def short_date(d: _dt.date, today: _dt.date) -> str:
    """"CN 15/11" (trong 7 ngày tới), "15/11" (xa hơn)."""
    if 0 <= (d - today).days <= SOON_DAYS:
        return "%s %d/%d" % (WEEKDAY[d.weekday()], d.day, d.month)
    return "%d/%d" % (d.day, d.month)


# ---------------------------------------------------------------------------
# Ai ra chào
# ---------------------------------------------------------------------------

def greeter(pets: list[dict[str, Any]], day: int) -> dict[str, Any]:
    """pets = more_core.pets_view (id, name, state full / hungry / away, love). → {who: id thú | "stack", name, away}."""
    pets = [p for p in pets or [] if isinstance(p, dict) and isinstance(p.get("id"), str)]
    home = [p for p in pets if p.get("state") != "away"]
    if home:
        best = max(int(p.get("love") or 0) for p in home)
        top = sorted((p for p in home if int(p.get("love") or 0) == best), key=lambda p: str(p.get("id")))
        p = top[int(day) % len(top)] if day is not None else top[0]
        return {"who": p["id"], "name": str(p.get("name") or ""), "away": ""}
    if pets:
        p = max(pets, key=lambda p: (int(p.get("love") or 0), str(p.get("id"))))
        return {"who": "stack", "name": "StackChan", "away": str(p.get("name") or "")}
    return {"who": "stack", "name": "StackChan", "away": ""}


# ---------------------------------------------------------------------------
# Câu chào ngày lễ
# ---------------------------------------------------------------------------

def festival(today: _dt.date) -> dict[str, str] | None:
    """{"hi", "vi", "theme"} vào đúng ngày lễ; ngày thường None (JS chào theo giờ trong vườn)."""
    try:
        tet = season.tet_date(today.year)
        moon = season.mid_autumn_date(today.year)
    except Exception:       # lịch âm lỗi (không xảy ra với các năm hiện có) → bỏ qua Tết / Trung thu
        tet = moon = None
    if tet and 0 <= (today - tet).days <= 2:
        return {"hi": "あけましておめでとう！", "vi": "Chúc mừng năm mới!", "theme": "tet"}
    if today.month == 1 and today.day <= 3:
        return {"hi": "あけましておめでとう！", "vi": "Chúc mừng năm mới!", "theme": "shogatsu"}
    if today.month == 12 and today.day in (24, 25):
        return {"hi": "メリークリスマス！", "vi": "Giáng sinh vui vẻ!", "theme": "noel"}
    if today.month == 10 and today.day == 31:
        return {"hi": "ハッピーハロウィン！", "vi": "Halloween vui vẻ!", "theme": "halloween"}
    if moon and today == moon:
        return {"hi": "お月見しよう！", "vi": "Trung thu ngắm trăng nào!", "theme": "tsukimi"}
    if today.month == 7 and today.day == 7:
        return {"hi": "七夕だね！", "vi": "Thất Tịch — viết điều ước nào!", "theme": "tanabata"}
    return None


# ---------------------------------------------------------------------------
# Tin hôm nay / sắp tới
# ---------------------------------------------------------------------------

def _guest_line(home: dict[str, Any], scenes: list[str], album: dict[str, Any], today: _dt.date) -> dict[str, Any] | None:
    """Khách đáng chú ý hôm nay: khách hiếm đang mùa → khách chưa gặp → khách ghé nhiều nhất (cố định trong ngày)."""
    best: list[tuple[int, int, str, str]] = []
    for gid in guests.ORDER:
        g = guests.GUESTS[gid]
        top = max(((guests.weight(gid, sc, home, today), sc) for sc in scenes), default=(0, ""))
        if top[0] <= 0:
            continue
        rank = (2 if g.get("rare") else 0) + (1 if gid not in (album or {}) else 0)
        best.append((rank, top[0], gid, top[1]))
    if not best:
        return None
    rank = max(b[0] for b in best)
    pool = sorted([b for b in best if b[0] == rank], key=lambda b: (-b[1], b[2]))[:3]
    _r, _w, gid, sc = pool[today.toordinal() % len(pool)]
    g = guests.GUESTS[gid]
    tod = tuple(g.get("tod") or ())
    when = "Tối nay " if tod and all(t in ("dusk", "night") for t in tod) else "Hôm nay "
    wx = {"snow": " lúc tuyết rơi", "wet": " lúc trời mưa"}.get(g.get("wx"), "")
    name = g["name"][0].lower() + g["name"][1:]
    where = SCENE_NAMES.get(sc, "vùng tự tạo" if sc.startswith("u") else sc)
    return {"id": "guest", "icon": "paw", "text": "%s%s có thể ghé %s%s" % (when, name, where, wx), "short": "%s ghé %s" % (
        g["name"], where), "rare": bool(g.get("rare"))}


def _milestones(total_days: int, reviewed_today: bool, streak: int) -> list[dict[str, Any]]:
    out = []
    nxt = next((m for m in MILESTONE_DAYS if m > total_days or (m == total_days and reviewed_today)), None)
    if nxt is not None:
        if nxt == total_days and reviewed_today:
            out.append({"id": "days", "icon": "firework", "text": "Hôm nay là ngày học thứ %d!" % nxt, "short": "ngày học thứ %d" % nxt})
        else:
            left = nxt - total_days
            if left <= NEAR:
                # 1.30.1: "ngày có ôn" khó hiểu → nói thẳng là tổng số ngày đã học (không cần liền nhau)
                out.append({"id": "days", "icon": "star", "text": "Học thêm %d ngày nữa là tròn %d ngày học" % (left, nxt),
                            "short": "thêm %d ngày nữa tròn %d ngày học" % (left, nxt)})
    mark = next((m for m in STREAK_SOON if m > streak), None)        # hôm nay chưa ôn: ôn hôm nay là +1
    if mark is not None and streak > 0:
        left = mark - streak
        if left <= NEAR:
            out.append({"id": "streak", "icon": "fire", "text": "Ôn tiếp %d ngày nữa là tròn %d ngày liền" % (left, mark),
                        "short": "%d ngày nữa tròn %d ngày liền" % (left, mark)})
    return out


def news(ctx: dict[str, Any]) -> dict[str, Any]:
    """ctx: today (date), day (ngày Anki), paper {enabled, unread}, streak, reviewed_today, total_days, freeze {n, days},
    pets (pets_view), wear {level, steps}, season (clean_season), home, scenes, album, sub (gói báo: until, auto, trial,
    paid) → {"date", "today": [...], "soon": [...], "greet": [...], "line": tin cho thẻ Hôm nay | None}."""
    today: _dt.date = ctx["today"]
    items: list[dict[str, Any]] = []
    # 1. vé giữ chuỗi vừa dùng (hôm qua / hai hôm trước)
    fz = ctx.get("freeze") or {}
    used = [d for d in (fz.get("days") or []) if isinstance(d, str) and (today - _dt.timedelta(days=2)).isoformat() <= d < today.isoformat()]
    if used:
        items.append({"id": "freeze_used", "icon": "snow", "dup": False,
                      "text": "Đã dùng %d vé giữ chuỗi · chuỗi %d ngày" % (len(used), int(ctx.get("streak") or 0)),
                      "short": "đã dùng vé giữ chuỗi"})
    # 2. báo mới (đã có dòng Báo trong thẻ)
    paper = ctx.get("paper") or {}
    if paper.get("enabled") and int(paper.get("unread") or 0) > 0:
        items.append({"id": "paper", "icon": "book", "text": "Báo mới đã tới", "dup": True})
    # 3. mốc học
    for m in _milestones(int(ctx.get("total_days") or 0), bool(ctx.get("reviewed_today")), int(ctx.get("streak") or 0)):
        items.append(dict(m, dup=False))
    # 3b. 1.28: chỗ lấp lánh (mở theo lượt ôn hôm nay) + gánh hàng rong
    fd = ctx.get("finds") or {}
    left = [x for x in fd.get("spots") or [] if x.get("open") and not x.get("picked")]
    if left:
        where = []
        for x in left:
            nm = SCENE_NAMES.get(x.get("scene"), "")
            if nm and nm not in where:
                where.append(nm)
        items.append({"id": "finds", "icon": "sparkle", "dup": False,
                      "text": "%d chỗ lấp lánh: %s" % (len(left), " · ".join(where)),
                      "short": "%d chỗ lấp lánh ở %s" % (len(left), where[0] if len(where) == 1 else "%d nơi" % len(where))})
    elif fd.get("next") and int(fd.get("open") or 0) < int(fd.get("max") or 3):
        need = int(fd["next"]) - int(fd.get("reviews") or 0)
        if need > 0:
            items.append({"id": "finds_next", "icon": "sparkle", "dup": False, "low": True,
                          "text": "Ôn thêm %d lượt nữa mở một chỗ lấp lánh" % need})
    ped = fd.get("ped") or {}
    if ped.get("today"):
        nm = SCENE_NAMES.get(ped.get("scene"), "Sân vườn")
        items.append({"id": "ped", "icon": "peddler", "dup": False, "text": "Gánh hàng rong ghé %s hôm nay" % nm,
                      "short": "gánh hàng rong ghé %s" % nm})
    # 4. khách đáng chú ý
    sc = ctx.get("scenes")
    g = _guest_line(ctx.get("home") or {}, [x for x in sc if isinstance(x, str)] if isinstance(sc, list) else [], ctx.get("album") or {}, today)
    if g:
        items.append(dict(g, dup=False))
    # 5. giao diện mùa đang có
    ss = ctx.get("season") or {}
    active = None
    try:
        active = season.active_theme(ss, today) if ss else None
    except Exception:
        active = None
    tmap = {t["id"]: t for t in season.THEMES}
    if active and active in tmap:
        _s, e = season.window(tmap[active], today)
        items.append({"id": "theme", "icon": "leaf", "text": "%s · tới %d/%d" % (tmap[active]["name"], e.day, e.month),
                      "dup": False, "short": "%s tới %d/%d" % (tmap[active]["name"], e.day, e.month), "low": True})
    # 6. chăm sóc (đã có dòng riêng trong thẻ)
    for p in ctx.get("pets") or []:
        if p.get("state") == "away":
            items.append({"id": "pet_away", "icon": "paw", "text": "%s đi chơi rồi — cho ăn là về" % p.get("name", ""), "dup": True})
        elif p.get("state") == "hungry":
            items.append({"id": "pet_hungry", "icon": "paw", "text": "%s đang đói" % p.get("name", ""), "dup": True})
    wear = ctx.get("wear") or {}
    if int(wear.get("level") or 0) > 0 and wear.get("steps"):
        step = wear["steps"][-1]
        step = step.get("name") if isinstance(step, dict) else str(step)
        items.append({"id": "repair", "icon": "wrench", "text": "Nhà hơi cũ (%s)" % step.lower(), "hint": "Sửa ở Xây nhà", "dup": True})
    # 7. vé giữ chuỗi đang có
    if int(fz.get("n") or 0) > 0 and not used:
        items.append({"id": "freeze", "icon": "snow", "text": "Có %d vé giữ chuỗi" % int(fz["n"]), "dup": False, "low": True})

    soon: list[dict[str, Any]] = []
    mode = ss.get("mode") if isinstance(ss, dict) else None
    if isinstance(ss, dict) and ss and mode != "off":
        unlocked = set(ss.get("unlocked") or []) if isinstance(ss, dict) else set()
        for t in season.THEMES:
            if t.get("kind") != "event":
                continue
            s, e = season.window(t, today)
            if t["id"] == active:
                if 0 <= (e - today).days <= SOON_DAYS:
                    soon.append({"id": "theme_end", "icon": "leaf", "text": "%s kết thúc" % t["name"], "d": short_date(e, today),
                                 "at": e.isoformat()})
                continue
            if 0 < (s - today).days <= SOON_DAYS:
                soon.append({"id": "theme_start", "icon": "blossom", "d": short_date(s, today), "at": s.isoformat(),
                             "text": "%s bắt đầu%s" % (t["name"], "" if t["id"] in unlocked else " · chưa mở")})
    if ped.get("next_iso"):         # 1.28: phiên gánh hàng kế tiếp (thứ Tư / Chủ nhật — luôn trong 7 ngày tới)
        try:
            nd = _dt.date.fromisoformat(ped["next_iso"])
        except (TypeError, ValueError):
            nd = None
        if nd and 0 < (nd - today).days <= SOON_DAYS:
            soon.append({"id": "ped_next", "icon": "peddler", "d": short_date(nd, today), "at": nd.isoformat(),
                         "text": "Gánh hàng rong ghé " + SCENE_NAMES.get(ped.get("scene"), "Sân vườn")})
    sub = ctx.get("sub") or {}
    try:
        until = _dt.date.fromisoformat(sub["until"]) if sub.get("until") else None
    except (TypeError, ValueError):
        until = None
    if until and 0 <= (until - today).days < SOON_DAYS:
        soon.append({"id": "paper_sub", "icon": "book", "d": short_date(until, today), "at": until.isoformat(),
                     "text": "Gói báo hết hạn" + (" · tự gia hạn" if sub.get("auto") else "")})
    soon.sort(key=lambda x: x["at"])

    greet_lines = [x["text"] for x in items if not x.get("low") and x["id"] not in ("pet_hungry", "pet_away", "repair")][:GREET_LINES]
    line = next((x for x in items if not x.get("dup") and not x.get("low")), None) or \
        next((x for x in items if not x.get("dup")), None)
    return {"date": date_label(today), "today": [{k: v for k, v in x.items() if k not in ("dup", "low")} for x in items],
            "soon": soon, "greet": [("[i:%s] " % x["icon"]) + x["text"] for x in items
                                   if x["text"] in greet_lines][:GREET_LINES],
            "line": (line.get("short") or line["text"]) if line else None}


def is_new_player(w: Any) -> bool:
    """1.26.1: hồ sơ chưa làm gì trong vườn (chưa tưới lần nào, chưa thu hoạch, 0 xu, chưa xây nhà, chưa có đồ) → hiện
    hướng dẫn 3 bước (tour.js). Người đang dùng cập nhật lên thì đã có lượt tưới / xu nên không thấy."""
    if not isinstance(w, dict):
        return False
    home = w.get("home") if isinstance(w.get("home"), dict) else {}
    try:
        return (int(w.get("waters") or 0) == 0 and int(w.get("harvests") or 0) == 0 and int(w.get("coins") or 0) == 0
                and not int(home.get("house") or 0) and not home.get("owned"))
    except (TypeError, ValueError):
        return False
