"""ことば畑 1.19.1 — chọn từ cho báo Gemini, không phụ thuộc deck đang xem.

- Ngôn ngữ của note lấy theo loại note (Cấu hình trường / tự đoán), nên deck trộn hai thứ tiếng vẫn lấy đúng.
- Người dùng chọn tối đa 5 deck cho mỗi ngôn ngữ (khoá collection SRC_KEY, đồng bộ AnkiWeb); không chọn thì lấy
  mọi deck có note của ngôn ngữ đó.
- Mỗi số báo lấy 100 note: khoảng 70% "chưa thuộc" (hôm nay có thẻ đến hạn ôn) + 30% "đã thuộc" (đã ôn, hôm nay
  không đến hạn). Ngẫu nhiên theo ngày: cùng ngày ra cùng danh sách. Nhiều deck thì lấy xoay vòng cho đều.
- Kèm danh sách mọi từ đã học (tối đa ALL_MAX) để máy kiểm tra / nối tra từ; lời nhắc chỉ gửi 100 từ.

File này chỉ import `anki` (không import Qt/aqt) để có thể test độc lập.
"""

from __future__ import annotations

import os
import random
import re
from typing import Any, Callable

from anki.utils import ids2str

try:   # chạy trong Anki (gói add-on)
    from . import garden_core as core
except ImportError:   # test: thư mục add-on nằm trong sys.path, hoặc nạp file cạnh bên
    try:
        import garden_core as core  # type: ignore[no-redef]
    except ImportError:
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location(
            "kotoba_garden_core", os.path.join(os.path.dirname(os.path.abspath(__file__)), "garden_core.py"))
        core = _ilu.module_from_spec(_spec)  # type: ignore[assignment]
        _spec.loader.exec_module(core)  # type: ignore[union-attr]

fields = core.fields

SRC_KEY = "kotoba_batake_paper_src"   # {"ja": {"decks": [id…]}, "en": {"decks": […]}} — bản ≤ 1.19.0 không đụng
LANGS = ("ja", "en")
MAX_DECKS = 5
LIMIT = 100            # số note gửi Gemini mỗi số báo (tổng, không phải mỗi deck)
DUE_SHARE = 0.7        # 70% chưa thuộc / 30% đã thuộc
FOCUS = 20             # số từ trọng tâm (trong nhóm chưa thuộc) dặn Gemini dùng
MIN_WORDS = 10         # ít hơn thì không viết báo ngôn ngữ đó (không tốn lượt gọi)
FRESH_UNDER = 30       # đã học ít hơn thì cho dùng thêm thẻ mới (chưa ôn) của chính các deck đã chọn
ALL_MAX = 3000         # danh sách mọi từ đã học (kiểm tra, tra nghĩa)
_ONE_KANJI = re.compile(r"^[㐀-鿿豈-﫿々]$")


# ---------------------------------------------------------------------------
# Deck đã chọn (khoá collection)
# ---------------------------------------------------------------------------


def clean_decks(raw: Any, exists: Callable[[int], bool] | None = None) -> list[int]:
    out: list[int] = []
    for x in raw if isinstance(raw, list) else []:
        try:
            did = int(x)
        except (TypeError, ValueError):
            continue
        if did <= 0 or did in out or (exists is not None and not exists(did)):
            continue
        out.append(did)
        if len(out) >= MAX_DECKS:
            break
    return out


def clean_src(raw: Any, exists: Callable[[int], bool] | None = None) -> dict[str, dict[str, Any]]:
    raw = raw if isinstance(raw, dict) else {}
    out: dict[str, dict[str, Any]] = {}
    for lang in LANGS:
        part = raw.get(lang) if isinstance(raw.get(lang), dict) else {}
        out[lang] = {"decks": clean_decks(part.get("decks"), exists)}
    return out


def _deck_exists(col: Any) -> Callable[[int], bool]:
    def ok(did: int) -> bool:
        try:
            d = col.decks.get(did, default=False)
        except TypeError:
            d = col.decks.get(did)
        except Exception:
            return False
        return bool(d) and int(d.get("id", 0)) == did and not d.get("dyn")
    return ok


def load_src(col: Any) -> dict[str, dict[str, Any]]:
    try:
        raw = col.get_config(SRC_KEY, None)
    except Exception:
        raw = None
    return clean_src(raw, _deck_exists(col))


def save_src(col: Any, lang: str, decks: Any) -> list[int]:
    """Ghi deck đã chọn của một ngôn ngữ; giữ nguyên phần còn lại của khoá (kể cả khoá lạ của bản sau)."""
    if lang not in LANGS:
        raise ValueError("ngôn ngữ không hỗ trợ")
    try:
        raw = col.get_config(SRC_KEY, None)
    except Exception:
        raw = None
    raw = dict(raw) if isinstance(raw, dict) else {}
    keep = clean_decks(decks, _deck_exists(col))
    part = dict(raw.get(lang)) if isinstance(raw.get(lang), dict) else {}
    part["decks"] = keep
    raw[lang] = part
    col.set_config(SRC_KEY, raw)
    return keep


# ---------------------------------------------------------------------------
# Loại note → ngôn ngữ, loại (từ vựng / chữ Hán / ngữ pháp), vai trò trường
# ---------------------------------------------------------------------------


class _Row:
    """Note đọc thẳng từ bảng notes (nhanh hơn col.get_note khi cần vài nghìn note)."""

    def __init__(self, col: Any, nid: int, mid: str, flds: str, keys: list[str], name: str) -> None:
        self.col = col
        self.id = nid
        self.mid = mid
        self._keys = keys
        self._vals = str(flds).split("\x1f")
        self._name = name
        self.tags: list[str] = []

    def keys(self) -> list[str]:
        return list(self._keys)

    def __getitem__(self, key: str) -> str:
        i = self._keys.index(key)
        return self._vals[i] if i < len(self._vals) else ""

    def note_type(self) -> dict[str, Any]:
        return {"id": self.mid, "name": self._name}


def _model_info(col: Any, mid: str, cfg: dict[str, Any], first: tuple[int, str] | None) -> dict[str, Any] | None:
    model = core._model(col, mid)
    if not model:
        return None
    keys = [f["name"] for f in model["flds"]]
    name = model["name"]
    store = cfg.get("_fields") or {}
    conf = (store.get("models") or {}).get(mid)
    configured = fields.conf_problem(conf, keys) is None if conf else False
    sample = _Row(col, first[0], mid, first[1], keys, name) if first else _Row(col, 0, mid, "", keys, name)
    roles = core.note_roles(sample, cfg)
    lang = roles.get("lang") or "ja"
    if configured:
        kind = conf["kind"]
    elif lang == "ja":
        wf = roles.get("word") or (keys[0] if keys else None)
        idx = keys.index(wf) if wf in keys else 0
        kind = fields.guess_kind(name, keys, core._sample_words(col, mid, idx))
    else:
        kind = "vocab"
    if lang != "ja" and kind in ("kanji", "grammar"):
        kind = "vocab"
    return {"mid": mid, "name": name, "keys": keys, "roles": roles, "lang": lang, "kind": kind}


def model_infos(col: Any, cfg: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Mọi loại note đang có note: {mid: {lang, kind, keys, roles, name}}."""
    core._LANG_GUESS.clear()
    out: dict[str, dict[str, Any]] = {}
    try:
        rows = col.db.all("select mid, min(id) from notes group by mid")
    except Exception:
        return out
    for mid, nid in rows:
        first = col.db.first("select id, flds from notes where id = ?", int(nid))
        info = _model_info(col, str(mid), cfg, (int(first[0]), str(first[1])) if first else None)
        if info:
            out[str(mid)] = info
    return out


# ---------------------------------------------------------------------------
# Deck có note của từng ngôn ngữ (danh sách để chọn)
# ---------------------------------------------------------------------------


def _cards(col: Any, mids: list[str]) -> list[tuple[int, int, int, int, int, int]]:
    """(id thẻ, nid, deck gốc, type, queue, mid) của các thẻ thuộc các loại note này."""
    if not mids:
        return []
    rows = col.db.all(
        "select c.id, c.nid, (case when c.odid != 0 then c.odid else c.did end), c.type, c.queue, n.mid "
        f"from cards c join notes n on n.id = c.nid where n.mid in {ids2str([int(m) for m in mids])}")
    return [(int(a), int(b), int(c), int(d), int(e), int(f)) for a, b, c, d, e, f in rows]


def _deck_rows(col: Any) -> list[dict[str, Any]]:
    out = []
    for d in col.decks.all_names_and_ids():
        try:
            deck = col.decks.get(d.id)
        except Exception:
            continue
        if deck and not deck.get("dyn"):
            out.append({"id": int(d.id), "name": d.name})
    out.sort(key=lambda x: x["name"].lower())
    return out


def lang_decks(col: Any, cfg: dict[str, Any], infos: dict[str, dict[str, Any]] | None = None) -> dict[str, list[dict[str, Any]]]:
    """{"ja": [{id, name, notes}], "en": […]}: deck (kể cả deck con) có note của ngôn ngữ đó, kèm số note."""
    infos = infos if infos is not None else model_infos(col, cfg)
    out: dict[str, list[dict[str, Any]]] = {lang: [] for lang in LANGS}
    decks = _deck_rows(col)
    for lang in LANGS:
        mids = [m for m, i in infos.items() if i["lang"] == lang]
        home: dict[int, set[int]] = {}
        for _cid, nid, did, _t, queue, _mid in _cards(col, mids):
            if queue != core.QUEUE_SUSPENDED:
                home.setdefault(did, set()).add(nid)
        if not home:
            continue
        for d in decks:
            try:
                ids = [int(x) for x in col.decks.deck_and_child_ids(d["id"])]
            except Exception:
                ids = [d["id"]]
            nids: set[int] = set()
            for x in ids:
                nids |= home.get(x, set())
            if nids:
                out[lang].append({"id": d["id"], "name": d["name"], "notes": len(nids)})
    return out


# ---------------------------------------------------------------------------
# Chọn 100 từ cho một số báo
# ---------------------------------------------------------------------------


def _interleave(groups: dict[int, list[int]], order: list[int]) -> list[int]:
    """Xoay vòng các deck: deck 1, deck 2, … rồi lại deck 1 — deck hết từ thì các deck còn lại bù."""
    lists = [list(groups.get(k, [])) for k in order]
    out: list[int] = []
    i = 0
    while any(lists):
        if lists[i % len(lists)]:
            out.append(lists[i % len(lists)].pop(0))
        i += 1
    return out


def item_ok(it: dict[str, Any]) -> bool:
    """Note dùng được cho kho 100 từ: từ vựng có từ + nghĩa; không lấy chữ Hán đơn và ngữ pháp."""
    word = it.get("word") or ""
    if it.get("kind") != "vocab" or not word or word == "?" or not it.get("meaning"):
        return False
    return not _ONE_KANJI.match(word)


def pick(col: Any, cfg: dict[str, Any], lang: str, deck_ids: list[int] | None, seed: Any,
         limit: int = LIMIT, eligible: Callable[[dict[str, Any]], bool] | None = None,
         infos: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    """Chọn từ cho báo `lang` hôm nay.

    Trả về {"kho": [≤ limit mục], "all": [mọi từ đã học], "grammar": [note ngữ pháp đã học], "decks": [tên],
    "n_due": số note chưa thuộc, "n_learned": số note đã học, "fresh": có dùng thẻ mới không}.
    Mỗi mục: {nid, word, reading, meaning, kind, due, learned}."""
    cfg = core.merged_config(cfg)
    infos = infos if infos is not None else model_infos(col, cfg)
    mids = [m for m, i in infos.items() if i["lang"] == lang]
    ok = eligible or (lambda it: True)
    exists = _deck_exists(col)
    chosen = [d for d in (deck_ids or []) if exists(d)][:MAX_DECKS]
    owner: dict[int, int] = {}            # deck (kể cả deck con) → deck đã chọn chứa nó
    for d in chosen:
        try:
            ids = [int(x) for x in col.decks.deck_and_child_ids(d)]
        except Exception:
            ids = [d]
        for x in ids:
            owner.setdefault(x, d)
    names = []
    for d in chosen:
        try:
            names.append(col.decks.name(d))
        except Exception:
            pass
    try:
        due_cids = set(col.find_cards("is:due -is:suspended"))
    except Exception:
        due_cids = set()
    note_deck: dict[int, int] = {}
    due_n: set[int] = set()
    learned_n: set[int] = set()
    seen_n: set[int] = set()
    note_mid: dict[int, str] = {}
    for cid, nid, did, ctype, queue, mid in _cards(col, mids):
        if queue == core.QUEUE_SUSPENDED:
            continue
        if chosen and did not in owner:
            continue
        seen_n.add(nid)
        note_mid[nid] = str(mid)
        note_deck.setdefault(nid, owner.get(did, 0))
        if ctype != core.CARD_TYPE_NEW:
            learned_n.add(nid)
        if cid in due_cids:
            due_n.add(nid)
    rest_n = learned_n - due_n
    fresh_n = seen_n - learned_n - due_n
    rng = random.Random("%s:%s" % (seed, lang))
    order = chosen or [0]

    def shuffled(ns: set[int]) -> list[int]:
        groups: dict[int, list[int]] = {}
        for n in sorted(ns):
            groups.setdefault(note_deck.get(n, 0) if chosen else 0, []).append(n)
        for g in groups.values():
            rng.shuffle(g)
        return _interleave(groups, order)

    due_l, rest_l, fresh_l = shuffled(due_n), shuffled(rest_n), shuffled(fresh_n)
    cache: dict[int, dict[str, Any] | None] = {}

    def details(nids: list[int]) -> None:
        need = [n for n in nids if n not in cache]
        for i in range(0, len(need), 500):
            part = need[i:i + 500]
            for nid, mid, flds in col.db.all(f"select id, mid, flds from notes where id in {ids2str(part)}"):
                info = infos.get(str(mid))
                if not info:
                    cache[int(nid)] = None
                    continue
                row = _Row(col, int(nid), str(mid), flds, info["keys"], info["name"])
                try:
                    det = core.note_details(row, cfg, info["roles"])
                except Exception:
                    cache[int(nid)] = None
                    continue
                cache[int(nid)] = {"nid": int(nid), "word": det["word"], "reading": det["reading"],
                                   "meaning": det["meaning"], "kind": info["kind"],
                                   "due": int(nid) in due_n, "learned": int(nid) in learned_n}
            for n in part:
                cache.setdefault(n, None)

    def take(nids: list[int], n: int) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for i in range(0, len(nids), 200):
            if len(out) >= n:
                break
            chunk = nids[i:i + 200]
            details(chunk)
            for nid in chunk:
                it = cache.get(nid)
                if it and item_ok(it) and ok(it):
                    out.append(it)
                    if len(out) >= n:
                        break
        return out

    want_due = int(round(limit * DUE_SHARE))
    kho_due = take(due_l, want_due)
    kho_rest = take(rest_l, limit - len(kho_due))
    if len(kho_due) < want_due and len(kho_due) + len(kho_rest) < limit:
        more = take(due_l, limit - len(kho_rest))       # nhóm đã thuộc thiếu → lấy thêm từ chưa thuộc
        kho_due = more
    kho = kho_due + kho_rest
    fresh = False
    if len(due_n | rest_n) < FRESH_UNDER and len(kho) < limit:
        kho += take(fresh_l, limit - len(kho))           # mới bắt đầu học: dùng cả thẻ chưa ôn
        fresh = True
    # mọi từ đã học (kiểm tra, nối tra từ): kho trước, rồi các note đã học khác
    all_ids = [it["nid"] for it in kho] + [n for n in due_l + rest_l if n not in {it["nid"] for it in kho}]
    all_ids = all_ids[:ALL_MAX]
    details(all_ids)
    every = [cache[n] for n in all_ids if cache.get(n) and cache[n]["kind"] == "vocab" and cache[n]["word"] not in ("", "?")]
    if fresh:
        every += [it for it in kho if not it["learned"] and it not in every]
    grammar_ids = [n for n in due_l + rest_l if infos.get(note_mid.get(n, ""), {}).get("kind") == "grammar"][:400]
    details(grammar_ids)
    grammar = [cache[n] for n in grammar_ids if cache.get(n) and cache[n]["word"] not in ("", "?") and cache[n]["meaning"]]
    return {"lang": lang, "kho": kho, "all": every, "grammar": grammar, "decks": names,
            "n_due": len(due_n), "n_learned": len(learned_n), "fresh": fresh,
            "focus": [it["word"] for it in kho if it["due"]][:FOCUS]}


def note_words(col: Any, cfg: dict[str, Any], nids: list[int], limit: int = 6) -> list[str]:
    """1.20: chữ (trường Từ) của vài note — Lịch hoa ghi "Lên Ra quả: 3 từ: 予約する · 天気 · …"."""
    cfg = core.merged_config(cfg)
    infos = model_infos(col, cfg)
    out: list[str] = []
    ids = [int(n) for n in nids][:200]
    if not ids:
        return out
    rows = {int(nid): (str(mid), flds) for nid, mid, flds in col.db.all(f"select id, mid, flds from notes where id in {ids2str(ids)}")}
    for nid in ids:
        if nid not in rows:
            continue
        mid, flds = rows[nid]
        info = infos.get(mid)
        if not info:
            continue
        try:
            det = core.note_details(_Row(col, nid, mid, flds, info["keys"], info["name"]), cfg, info["roles"])
        except Exception:
            continue
        w = str(det.get("word") or "").strip()
        if w and w != "?" and w not in out:
            out.append(w[:30])
        if len(out) >= limit:
            break
    return out


def _key(s: str) -> str:
    """Giống paper_core.norm_key (không import paper_core để file này đứng riêng được)."""
    s = (s or "").strip().lstrip("〜～")
    if s.endswith("する") and len(s) > 2:
        s = s[:-2]
    return s


def lookup(col: Any, cfg: dict[str, Any], lang: str, wanted: list[str], limit: int = 400) -> dict[str, list[str]]:
    """1.23: tìm nghĩa của các từ (từ gốc, đã chuẩn hoá) trong **mọi deck** theo Cấu hình trường — sửa số báo cũ bấm
    từ không ra nghĩa. Trả về {từ gốc: [từ, cách đọc, nghĩa, "deck"]}. Chỉ đọc note có chứa chữ của từ cần tìm."""
    cfg = core.merged_config(cfg)
    want = {w for w in (wanted or [])[:limit] if isinstance(w, str) and w.strip()}
    if not want:
        return {}
    lower = lang != "ja"
    probe = {w.lower() if lower else w for w in want}
    infos = model_infos(col, cfg)
    mids = [m for m, i in infos.items() if i["lang"] == lang and i["kind"] == "vocab"]
    if not mids:
        return {}
    out: dict[str, list[str]] = {}
    for nid, mid, flds in col.db.all(f"select id, mid, flds from notes where mid in {ids2str([int(m) for m in mids])}"):
        hay = flds.lower() if lower else flds
        if not any(p in hay for p in probe):
            continue
        info = infos.get(str(mid))
        if not info:
            continue
        try:
            det = core.note_details(_Row(col, int(nid), str(mid), flds, info["keys"], info["name"]), cfg, info["roles"])
        except Exception:
            continue
        word = str(det.get("word") or "").strip()
        meaning = str(det.get("meaning") or "").strip()
        if not word or word == "?" or not meaning:
            continue
        k = _key(word.lower() if lower else word)
        hit = next((w for w in want if (w.lower() if lower else w) == k), None)
        if hit and hit not in out:
            out[hit] = [word[:40], str(det.get("reading") or "").strip()[:60], meaning[:160], "deck"]
            if len(out) >= len(want):
                break
    return out
