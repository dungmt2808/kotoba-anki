"""Báo tiếng Trung (1.33) — do Gemini viết bằng khoá của người dùng, cùng khung với báo tiếng Anh (ai_en.py).

  - thư mục riêng  user_files/bao_gemini_zh/ ; trình độ HSK 1–6; phạm vi = từ tiếng Trung của các deck đã chọn; chữ giản
    thể hay phồn thể theo deck (`scope["phon_the"]`);
  - Gemini viết chữ Hán, MỖI TỪ kèm pinyin ghi số: [学生|xue2 sheng5] (như furigana của báo tiếng Nhật). MÁY soát từng
    chữ với bảng cách đọc (zh_core.readings, sinh từ pypinyin): đúng số âm tiết, âm tiết là cách đọc của chữ đó (thanh
    nhẹ / 一 / 不 đổi thanh được nhận); chữ chỉ có một cách đọc mà thiếu pinyin thì máy tự điền. Rồi máy đổi số → dấu,
    ghép pinyin theo TỪNG CHỮ ([学|xué][生|sheng]) và nối tra từ của deck ({学生|xué sheng|学生}, tìm theo chữ vì tiếng
    Trung không có dấu cách);
  - bộ kiểm tra `check`: đúng khung, chỉ chữ Hán (không kana / Hangul / chữ Việt / Latin ngoài tên StackChan, đúng giản /
    phồn thể), mọi chữ có pinyin đúng, độ dài theo trình độ (đếm chữ Hán), câu hỏi một đáp án, câu chép chép nguyên văn từ
    bài, phần tiếng Việt có dấu.

File này không import aqt (test được bằng python thường).
"""
from __future__ import annotations

import copy
import datetime
import json
import re
import unicodedata
from typing import Any

try:
    from . import ai_core as ai
    from . import ai_en
    from . import paper_core as paper
    from . import zh_core as zh
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_core as ai  # type: ignore[no-redef]
    import ai_en  # type: ignore[no-redef]
    import paper_core as paper  # type: ignore[no-redef]
    import zh_core as zh  # type: ignore[no-redef]

FOLDER = "bao_gemini_zh"
LANG = "zh"
LEVELS = ("HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6")
DEFAULT_LEVEL = "HSK2"
# độ dài phần bài của cả số (chữ Hán), độ dài câu trung bình (chữ), câu chép chính tả (chữ)
LENGTH = {"HSK1": (150, 330), "HSK2": (220, 450), "HSK3": (300, 600), "HSK4": (380, 760), "HSK5": (460, 920),
          "HSK6": (540, 1080)}
SENT_WORDS = {"HSK1": 9, "HSK2": 11, "HSK3": 14, "HSK4": 17, "HSK5": 21, "HSK6": 25}
DICT_WORDS = {"HSK1": (4, 10), "HSK2": (5, 12), "HSK3": (6, 14), "HSK4": (6, 16), "HSK5": (8, 18), "HSK6": (8, 20)}
LINK_MAX = 24
MASTHEAD = "词田晨报"            # Báo sáng Ruộng Chữ (词 = chữ / từ, 田 = ruộng — như ことば畑); tên Claude đề xuất

GRAMMAR_TEXT = """
HSK1|zh1-01|A 是 B|A là B
HSK1|zh1-02|有 / 没有|có / không có
HSK1|zh1-03|……吗？|câu hỏi có / không
HSK1|zh1-04|……呢？|còn … thì sao?
HSK1|zh1-05|N 的 N|của (sở hữu)
HSK1|zh1-06|很 + tính từ|rất …
HSK1|zh1-07|不 / 没 + V|không / chưa (phủ định)
HSK1|zh1-08|在 + nơi chốn|ở …
HSK1|zh1-09|想 + V|muốn …
HSK1|zh1-10|会 + V|biết / sẽ …
HSK1|zh1-11|V + 了|đã … (hoàn thành)
HSK1|zh1-12|几 / 多少|mấy / bao nhiêu
HSK2|zh2-01|V + 过|đã từng …
HSK2|zh2-02|V + 着|(trạng thái) đang …
HSK2|zh2-03|正在 + V + 呢|đang …
HSK2|zh2-04|要 / 快要 + V + 了|sắp … rồi
HSK2|zh2-05|A 比 B + tính từ|A … hơn B
HSK2|zh2-06|因为……，所以……|vì … nên …
HSK2|zh2-07|虽然……，但是……|tuy … nhưng …
HSK2|zh2-08|可以 + V|có thể …
HSK2|zh2-09|V + 得 + bổ ngữ|… (làm) thế nào (说得很好)
HSK2|zh2-10|一边……一边……|vừa … vừa …
HSK2|zh2-11|就|ngay / thì
HSK2|zh2-12|还|còn, vẫn
HSK3|zh3-01|把 + tân ngữ + V|đem / làm cho (câu chữ 把)
HSK3|zh3-02|被 + người + V|bị / được (bị động)
HSK3|zh3-03|越来越 + tính từ|càng ngày càng …
HSK3|zh3-04|如果……就……|nếu … thì …
HSK3|zh3-05|一……就……|hễ … là …
HSK3|zh3-06|除了……以外|ngoài … ra
HSK3|zh3-07|只有……才……|chỉ có … mới …
HSK3|zh3-08|又……又……|vừa … vừa … (tính chất)
HSK3|zh3-09|先……然后……|trước … sau đó …
HSK3|zh3-10|得 + V|phải …
HSK4|zh4-01|不但……而且……|không những … mà còn …
HSK4|zh4-02|即使……也……|dù … cũng …
HSK4|zh4-03|既然……就……|đã … thì …
HSK4|zh4-04|不管……都……|bất kể … đều …
HSK4|zh4-05|竟然|vậy mà, không ngờ
HSK4|zh4-06|于是|thế là
HSK5|zh5-01|尽管……还是……|mặc dù … vẫn …
HSK5|zh5-02|何况|huống hồ
HSK5|zh5-03|以免|để tránh
HSK5|zh5-04|难道……吗？|lẽ nào …?
HSK6|zh6-01|与其……不如……|thà … còn hơn …
HSK6|zh6-02|宁可……也不……|thà … chứ không …
HSK6|zh6-03|未免|có phần (quá)
"""


def builtin_grammar(level: str) -> list[dict[str, str]]:
    top = LEVELS.index(level) if level in LEVELS else 1
    out = []
    for line in GRAMMAR_TEXT.strip().splitlines():
        lv, gid, mau, nghia = line.split("|")
        if lv in LEVELS and LEVELS.index(lv) <= top:
            out.append({"id": gid, "mau": mau, "nghia": nghia, "bai": lv.replace("HSK", "HSK ")})
    return out


HAN_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")


def deck_word(raw: Any) -> str:
    """Từ của deck dùng làm từ gốc khi tra: toàn chữ Hán (1–8 chữ)."""
    w = ai._plain(raw, 60)
    w = re.sub(r"\[[^\]]*\]", "", w)                 # 中[zhōng]文[wén] → 中文
    w = re.sub(r"[\s{}|<>]", "", w).strip("。，、；：！？.,;:!?")
    w = re.split(r"[/／,，;；(（]", w)[0]
    if not w or not all(zh.is_han(c) for c in w) or len(w) > 8:
        return ""
    return w


def _pinyin(raw: Any, word: str) -> str:
    """Pinyin của deck (đã đổi số → dấu); không khớp số chữ thì bỏ."""
    r = ai._plain(raw, 60)
    if not r or HAN_RE.search(r):
        return ""
    sy = zh.split_syllables(r, len(word))
    return " ".join(sy) if sy else ""


def _row(it: dict[str, Any]) -> list[str] | None:
    word = deck_word(it.get("word"))
    meaning = ai._plain(it.get("meaning"), 120)
    if not word or not meaning:
        return None
    hv = ai._plain(it.get("hanviet"), 30)
    if hv and hv.lower() not in meaning.lower():
        meaning = "%s · %s" % (meaning, hv.upper())
    return [word, _pinyin(it.get("reading"), word), meaning, "deck"]


def kho_ok(item: dict[str, Any]) -> bool:
    return bool(deck_word(item.get("word")))


def scope_from_pick(pk: dict[str, Any], level: str) -> dict[str, Any]:
    level = level if level in LEVELS else DEFAULT_LEVEL
    kho, due = [], []
    for it in pk.get("kho", []):
        r = _row(it)
        if r:
            kho.append(r)
            if it.get("due"):
                due.append(r[0])
    vocab, seen = [], set()
    for it in list(pk.get("kho", [])) + list(pk.get("all", [])):
        r = _row(it)
        if r and r[0] not in seen:
            seen.add(r[0])
            vocab.append(r)
    grammar = builtin_grammar(level)
    decks = [d for d in pk.get("decks", []) if isinstance(d, str)]
    words_ = [r[0] for r in vocab]
    return {
        "lang": LANG, "nguon": "deck", "trinh_do": level, "nen_tang": "HSK1",
        "tu_vung": vocab, "kho": kho, "ngu_phap": grammar,
        "trong_tam": {"tu": due[:ai.FOCUS_WORDS], "ngu_phap": [g["id"] for g in grammar if g["bai"] == level.replace("HSK", "HSK ")]},
        "can_on": due, "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(vocab)),
        "phon_the": bool(words_) and not zh.is_simplified_text(words_),
    }


# ---------------------------------------------------------------------------
# Chữ + pinyin: đọc đánh dấu của Gemini, soát, ghép theo từng chữ, nối tra từ
# ---------------------------------------------------------------------------

VI_ONLY = ai_en.VI_ONLY
clean_vi = ai_en.clean_vi
check_vi = ai_en.check_vi
season_text = ai_en.season_text
SENT_END = re.compile(r"(?<=[。！？!?])")
KEEP_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")


def chars(markup: str) -> tuple[list[tuple[str, str | None]], list[str]]:
    """Chuỗi có đánh dấu → [(chữ, âm tiết có dấu | None)] (một mục mỗi ký tự) + các lỗi pinyin tìm thấy.
    [词|ci2] / {词|ci2|词} chia âm tiết theo chữ; chữ Hán không có pinyin → None (tự điền nếu chữ chỉ có một cách đọc)."""
    out: list[tuple[str, str | None]] = []
    probs: list[str] = []
    for t in paper.tokenize(markup or ""):
        if t[0] == "plain":
            for c in t[1]:
                if zh.is_han(c):
                    f = zh.fill_reading(c)
                    out.append((c, f))
                else:
                    out.append((c, None))
            continue
        word, reading = t[1], t[2]
        han = [c for c in word if zh.is_han(c)]
        if not han:
            out.extend((c, None) for c in word)
            continue
        p = zh.word_problem(word, reading)
        if p:
            probs.append(p)
            out.extend((c, None) for c in word)
            continue
        raw = zh._NUM_SYL.sub(lambda m: m.group(0) + " ", (reading or "").strip())
        sy = [x for x in zh._SEP.split(raw.strip()) if x]
        it = iter(sy)
        for c in word:
            if zh.is_han(c):
                s = next(it)
                n = zh.numbered(s)
                if n and n[0] == "r" and c == "\u513f":
                    out.append((c, "r"))
                elif n:
                    out.append((c, _marked(n)))
                else:
                    out.append((c, None))
            else:
                out.append((c, None))
    return out, probs


def _marked(n: tuple[str, int]) -> str:
    base, tone = n
    s = base.replace("v", "ü")
    return s if tone == 5 else zh.tone_marks(base + str(tone))


def surface(markup: str) -> str:
    return paper.surface(markup or "")


def missing(cs: list[tuple[str, str | None]]) -> list[str]:
    return [c for c, s in cs if zh.is_han(c) and not s]


def serialize(cs: list[tuple[str, str | None]], links: list[tuple[int, int, str]] | None = None) -> str:
    """Ghép lại: chữ Hán có âm tiết → [chữ|âm]; chỗ tra từ (đầu, cuối, từ gốc) → {chữ…|âm âm|từ gốc}."""
    starts = {a: (b, k) for a, b, k in links or []}
    out = []
    i = 0
    while i < len(cs):
        if i in starts:
            b, k = starts[i]
            seg = cs[i:b]
            if all(s for c, s in seg if zh.is_han(c)):
                out.append("{%s|%s|%s}" % ("".join(c for c, _s in seg), " ".join(s for c, s in seg if zh.is_han(c) and s), k))
                i = b
                continue
        c, s = cs[i]
        out.append("[%s|%s]" % (c, s) if zh.is_han(c) and s else c)
        i += 1
    return "".join(out)


def find_links(text: str, words_: list[str], used: set[str], cap: list[int], first_only: bool = True) -> list[tuple[int, int, str]]:
    """Từ của deck trong chuỗi chữ (dò từ dài nhất trước, không chồng nhau)."""
    ordered = sorted({w for w in words_ if w}, key=len, reverse=True)
    taken = [False] * len(text)
    found: list[tuple[int, int, str]] = []
    for w in ordered:
        if first_only and w in used:
            continue
        start = 0
        while True:
            i = text.find(w, start)
            if i < 0:
                break
            if not any(taken[i:i + len(w)]):
                if cap[0] >= LINK_MAX:
                    return sorted(found)
                found.append((i, i + len(w), w))
                for j in range(i, i + len(w)):
                    taken[j] = True
                used.add(w)
                cap[0] += 1
                if first_only:
                    break
            start = i + 1
    return sorted(found)


def _deck_words(scope: dict[str, Any], extra: list[str] | None = None) -> list[str]:
    return [r[0] for r in scope.get("tu_vung", []) if r and r[0]] + [w for w in extra or [] if w]


def deck_used(texts: list[str], scope: dict[str, Any], extra: list[str] | None = None) -> set[str]:
    ws = _deck_words(scope, extra)
    seen: set[str] = set()
    for t in texts:
        s = surface(t)
        for w in ws:
            if w and w in s:
                seen.add(w)
    return seen


def _strings(raw: dict[str, Any]) -> list[tuple[Any, Any]]:
    """Mọi chỗ chữ tiếng Trung của số báo: (object chứa, khoá / vị trí)."""
    out: list[tuple[Any, Any]] = []
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            out.append((b, "tieu_de"))
            if isinstance(b.get("doan"), list):
                out.extend((b["doan"], j) for j in range(len(b["doan"])))
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            out.append((q, "hoi"))
            if isinstance(q.get("chon"), list):
                out.extend((q["chon"], j) for j in range(len(q["chon"])))
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            out.append((c, "cau"))
    return out


def _paragraphs(raw: dict[str, Any]) -> list[str]:
    return ai_en._paragraphs(raw)


def in_text(sentence: str, raw: dict[str, Any]) -> bool:
    want = "".join(KEEP_RE.findall(surface(sentence)))
    return bool(want) and any(want in "".join(KEEP_RE.findall(surface(p))) for p in _paragraphs(raw))


def sentences(s: str) -> list[str]:
    return [x.strip() for x in SENT_END.split(s or "") if x.strip()]


def han_count(s: str) -> int:
    return len(KEEP_RE.findall(surface(s)))


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: pinyin số → dấu, ghép theo từng chữ, tự điền pinyin của chữ một cách đọc, bỏ markdown / chỗ tra
    từ cũ, bỏ từ mới đã có trong deck / không dùng, chọn lại câu chép không có trong bài, sửa id mẫu câu; rồi nối tra từ."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            if isinstance(b.get("doan"), list):
                b["doan"] = [p for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
            if isinstance(b.get("ky"), str) and b["ky"].isdigit():
                b["ky"] = int(b["ky"])
            if isinstance(b.get("ky_truoc"), str):
                b["ky_truoc"] = clean_vi(b["ky_truoc"])
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            if isinstance(q.get("dung"), str) and q["dung"].isdigit():
                q["dung"] = int(q["dung"])
            q["giai_thich"] = clean_vi(q.get("giai_thich"))
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            extra = c.get("them_dap_an") if isinstance(c.get("them_dap_an"), list) else []
            c["them_dap_an"] = [x.strip() for x in extra if isinstance(x, str) and x.strip()]
    for key in ("tom_tat", "tom_tat_truyen"):
        if isinstance(raw.get(key), str):
            raw[key] = clean_vi(raw[key])
    # từ mới
    deck = {r[0] for r in scope.get("tu_vung", []) if r and r[0]}
    tm = [w for w in raw.get("tu_moi", []) if isinstance(w, dict) and isinstance(w.get("w"), str) and w["w"].strip()] \
        if isinstance(raw.get("tu_moi"), list) else []
    tm2 = []
    for w in tm:
        w["w"] = deck_word(w["w"]) or w["w"].strip()
        r = ai._plain(w.get("r"), 40) if isinstance(w.get("r"), str) else ""
        sy = zh.split_syllables(r, len(w["w"])) if r else None
        w["r"] = " ".join(sy) if sy else ""
        w["m"] = clean_vi(w.get("m")) if isinstance(w.get("m"), str) else ""
        if w["w"] in deck:
            notes.append("bỏ khai báo từ mới đã có trong deck")
        elif w["w"]:
            tm2.append(w)
    tm2 = tm2[:int(opts.get("max_new", 3))]
    # chữ + pinyin của mọi chỗ, theo từng chữ
    places = _strings(raw)
    filled = 0
    for holder, key in places:
        v = holder[key] if isinstance(holder, list) else holder.get(key)
        if not isinstance(v, str):
            continue
        filled += sum(1 for t in paper.tokenize(v) if t[0] == "plain" for c in t[1] if zh.is_han(c) and zh.fill_reading(c))
    if filled:
        notes.append("tự điền pinyin cho %d chữ chỉ có một cách đọc" % filled)
    _fix_dictation(raw, scope, opts, notes, level)
    if isinstance(raw.get("mau_cau"), list):
        ids = {g["id"] for g in scope.get("ngu_phap", [])}
        mc = [g for g in raw["mau_cau"] if isinstance(g, str)]
        fixed = [g if g in ids else ai._match_grammar(g, scope) for g in mc]
        fixed = [g for g in dict.fromkeys(fixed) if g]
        if fixed != mc:
            notes.append("sửa / bỏ id mẫu câu không có trong danh sách")
        raw["mau_cau"] = fixed
    texts = [surface(holder[key] if isinstance(holder, list) else holder.get(key) or "") for holder, key in places
             if isinstance(holder[key] if isinstance(holder, list) else holder.get(key), str)]
    used_new = {w["w"] for w in tm2 if any(w["w"] in t for t in texts)}
    tm3 = [w for w in tm2 if w["w"] in used_new]
    if len(tm3) != len(tm2):
        notes.append("bỏ từ mới khai báo nhưng không dùng")
    raw["tu_moi"] = tm3
    first = [w["w"] for w in tm3] + list(scope.get("loi_sai", [])) + list(scope.get("sap_quen", [])) + \
        list(scope.get("trong_tam", {}).get("tu", []))
    words_ = list(dict.fromkeys(first + _deck_words(scope, [w["w"] for w in tm3])))
    used: set[str] = set()
    cap = [0]
    body = {id(b): True for b in raw.get("bai", []) if isinstance(b, dict)}
    body.update({id(b["doan"]): True for b in raw.get("bai", []) if isinstance(b, dict) and isinstance(b.get("doan"), list)})
    places = _strings(raw)                     # câu chép có thể vừa được chọn lại → đọc lại vị trí
    # đoạn văn nối trước tiêu đề (từ của deck gạch chân ở chỗ người học đọc kỹ), như báo tiếng Hàn / tiếng Anh
    places = [x for x in places if not (isinstance(x[0], dict) and x[1] == "tieu_de")] + \
        [x for x in places if isinstance(x[0], dict) and x[1] == "tieu_de"]
    for holder, key in places:
        v = holder[key] if isinstance(holder, list) else holder.get(key)
        if not isinstance(v, str):
            continue
        v = re.sub(r"[*_#]", "", v)
        cs, probs = chars(v)
        if probs:          # pinyin sai: giữ nguyên chữ của Gemini để bước kiểm tra chỉ đúng chỗ sai cho lượt sửa
            if isinstance(holder, list):
                holder[key] = v
            else:
                holder[key] = v
            continue
        text = "".join(c for c, _s in cs)
        is_body = id(holder) in body           # bài: mỗi từ gạch chân một lần; câu hỏi / câu chép: mọi chỗ
        links = find_links(text, words_, used if is_body else set(), cap if is_body else [0], first_only=is_body)
        s = serialize(cs, links)
        if isinstance(holder, list):
            holder[key] = s
        else:
            holder[key] = s
    return raw, list(dict.fromkeys(notes))


def _fix_dictation(raw: dict[str, Any], scope: dict[str, Any], opts: dict[str, Any], notes: list[str],
                   level: str) -> None:
    """Câu chép phải chép nguyên văn một câu trong bài; không có thì máy chọn câu trọn vẹn trong bài (giữ pinyin)."""
    if not isinstance(raw.get("bai"), list):
        return
    lo, hi = DICT_WORDS.get(level, (5, 12))
    cts = raw.get("chinh_ta") if isinstance(raw.get("chinh_ta"), list) else []
    keep = [c for c in cts if isinstance(c, dict) and isinstance(c.get("cau"), str) and in_text(c["cau"], raw)
            and lo <= han_count(c["cau"]) <= hi + 4]
    want = 1 if opts.get("short") else 2
    if len(keep) >= want and len(keep) == len(cts):
        return
    have = {"".join(KEEP_RE.findall(surface(c["cau"]))) for c in keep}
    ws = _deck_words(scope)
    cands = []
    for p in _paragraphs(raw):
        cs, _pr = chars(p)
        text = "".join(c for c, _s in cs)
        pos = 0
        for sent in sentences(text):
            i = text.find(sent, pos)
            pos = i + len(sent) if i >= 0 else pos
            core_ = sent.lstrip("◆ ").strip()
            n = len(KEEP_RE.findall(core_))
            key = "".join(KEEP_RE.findall(core_))
            if not lo <= n <= hi or key in have or i < 0:
                continue
            if core_.count("“") != core_.count("”") or "“" in core_:
                continue
            j = i + sent.index(core_)
            seg = cs[j:j + len(core_)]
            if missing(seg):
                continue
            cands.append((-sum(1 for w in ws if w in core_), -n, serialize(seg), key))
    cands.sort()
    for _u, _n, s, key in cands:
        if len(keep) >= max(want, min(3, len(cts))):
            break
        keep.append({"cau": s, "them_dap_an": []})
        have.add(key)
    notes.append("chọn lại câu chép chính tả từ bài (câu cũ không chép nguyên văn)")
    raw["chinh_ta"] = keep[:4]


def plain_issue(raw: Any) -> Any:
    """Bản gửi cho Gemini sửa / soát: giữ pinyin theo từ ([chữ|pinyin]) nhưng bỏ chỗ tra từ của máy ({…} → […])."""
    if not isinstance(raw, dict):
        return raw
    out = copy.deepcopy(raw)

    def plain(v: Any) -> Any:
        if not isinstance(v, str):
            return v
        return "".join("[%s|%s]" % (t[1], t[2]) if t[0] in ("ruby", "word") and t[2] else t[1]
                       for t in paper.tokenize(v))
    for holder, key in _strings(out):
        if isinstance(holder, list):
            holder[key] = plain(holder[key])
        else:
            holder[key] = plain(holder.get(key))
    return out


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

def check_zh(rep: Any, where: str, value: Any, ctx: dict[str, Any], simplified: bool) -> None:
    if not isinstance(value, str) or not value.strip():
        rep.err(where, "phải là chuỗi tiếng Trung không rỗng")
        return
    for t in paper.tokenize(value):
        if t[0] == "plain" and any(c in t[1] for c in "{}[]|"):
            rep.err(where, "có ký tự đánh dấu lạ gần: …%s…" % t[1][:24])
        if t[0] == "word":
            ctx["used"].add(t[3])
            if t[3] not in ctx["keys"]:
                rep.err(where, '"%s" không phải từ của deck hay từ mới' % t[3])
    cs, probs = chars(value)
    for p in probs[:3]:
        rep.err(where, p)
    miss = missing(cs)
    if miss and not probs:
        rep.err(where, "chữ thiếu pinyin: %s — mọi chữ Hán phải viết kèm pinyin [chữ|pinyin]" % "".join(dict.fromkeys(miss))[:10])
    s = surface(value)
    for e in ai.story_core.zh_text_problems(s, simplified):
        rep.err(where, e)
    if s and not KEEP_RE.search(s):
        rep.err(where, "không có chữ Hán nào")


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Trung. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = ai.Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    simplified = not scope.get("phon_the")
    short = bool(opts.get("short"))
    max_new = int(opts.get("max_new", 3))
    grammar_ids = {g["id"] for g in scope.get("ngu_phap", [])}
    tm = raw.get("tu_moi", [])
    if not isinstance(tm, list):
        rep.err("tu_moi", "phải là danh sách")
        tm = []
    if len(tm) > max_new:
        rep.err("tu_moi", "có %d từ mới, tối đa %d" % (len(tm), max_new))
    new_keys = set()
    for i, w in enumerate(tm):
        where = "tu_moi[%d]" % i
        if not isinstance(w, dict) or not isinstance(w.get("w"), str) or not w["w"].strip():
            rep.err(where, "cần có w (từ tiếng Trung) và m (nghĩa tiếng Việt)")
            continue
        if not deck_word(w["w"]):
            rep.err(where, "w phải là từ tiếng Trung (chỉ chữ Hán)")
        check_vi(rep, where + ".m", w.get("m"))
        new_keys.add(w["w"])
    deck_keys = {r[0] for r in scope.get("tu_vung", []) if r and r[0]}
    ctx = {"keys": deck_keys | new_keys, "used": set()}
    bai = raw.get("bai")
    lo_n, hi_n = (1, 2) if short else (2, 4) if opts.get("no_story") else (3, 5)
    if not isinstance(bai, list) or not lo_n <= len(bai) <= hi_n:
        rep.err("bai", "cần %d–%d bài" % (lo_n, hi_n))
        bai = bai if isinstance(bai, list) else []
    total = 0
    sents: list[int] = []
    story_seen = False
    for i, b in enumerate(bai):
        where = "bai[%d]" % i
        if not isinstance(b, dict):
            rep.err(where, "phải là object")
            continue
        if b.get("loai") not in ai.LOAI_AI:
            rep.err(where + ".loai", "phải là một trong %s" % ", ".join(ai.LOAI_AI))
        if b.get("loai") == "truyen":
            story_seen = True
            if short:
                rep.err(where, "số rút gọn không viết tiếp truyện")
            ky = b.get("ky")
            if not isinstance(ky, int) or isinstance(ky, bool) or ky < 1:
                rep.err(where + ".ky", "truyện cần số kỳ (số nguyên ≥ 1)")
            elif opts.get("ky") and ky != opts["ky"]:
                rep.err(where + ".ky", "kỳ này phải là kỳ %d" % opts["ky"])
            if isinstance(ky, int) and ky > 1:
                check_vi(rep, where + ".ky_truoc", b.get("ky_truoc"))
        check_zh(rep, where + ".tieu_de", b.get("tieu_de"), ctx, simplified)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 6:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 6)")
        for j, p in enumerate(doan):
            check_zh(rep, "%s.doan[%d]" % (where, j), p, ctx, simplified)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else han_count(p)
                sents += [len(KEEP_RE.findall(x)) for x in sentences(surface(p))]
                if len(p) > 6000:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = LENGTH[level]
    if short:
        lo, hi = lo // 3, hi // 2
    if opts.get("story_plain") and story_seen and not short:
        lo, hi = int(lo * 0.4), int(hi * 0.75)
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d chữ), cần khoảng %d–%d chữ" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d chữ), cần khoảng %d–%d chữ" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d chữ, nên trong khoảng %d–%d" % (total, lo, hi))
    if sents:
        avg = sum(sents) / len(sents)
        if avg > SENT_WORDS[level] * 1.4:
            rep.warn("bai", "câu hơi dài so với trình độ %s (trung bình %.0f chữ / câu, nên ≤ %d): tách câu dài"
                     % (level, avg, SENT_WORDS[level]))
    qs = raw.get("cau_hoi")
    want_q = (0, 1) if short else (2, 3)
    if not isinstance(qs, list) or not want_q[0] <= len(qs) <= want_q[1] + 1:
        rep.err("cau_hoi", "cần %d–%d câu hỏi" % want_q)
        qs = qs if isinstance(qs, list) else []
    for i, q in enumerate(qs):
        where = "cau_hoi[%d]" % i
        if not isinstance(q, dict):
            rep.err(where, "phải là object")
            continue
        check_zh(rep, where + ".hoi", q.get("hoi"), ctx, simplified)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_zh(rep, "%s.chon[%d]" % (where, j), o, ctx, simplified)
        norm = [surface(o) for o in chon if isinstance(o, str)]
        if len(set(norm)) != len(norm):
            rep.err(where + ".chon", "có hai lựa chọn giống nhau")
        d = q.get("dung")
        if isinstance(d, bool) or not isinstance(d, int) or not 0 <= d < len(chon):
            rep.err(where + ".dung", "phải là vị trí (tính từ 0) của đáp án đúng")
        check_vi(rep, where + ".giai_thich", q.get("giai_thich"))
    if len(qs) >= 2 and len({q.get("dung") for q in qs if isinstance(q, dict)}) == 1:
        rep.warn("cau_hoi", "mọi câu đều có đáp án ở cùng một vị trí")
    ct = raw.get("chinh_ta")
    if not isinstance(ct, list) or not (1 if short else 2) <= len(ct) <= 4:
        rep.err("chinh_ta", "cần 2–3 câu chép chính tả")
        ct = ct if isinstance(ct, list) else []
    dlo, dhi = DICT_WORDS[level]
    for i, c in enumerate(ct):
        where = "chinh_ta[%d]" % i
        if not isinstance(c, dict):
            rep.err(where, "phải là object")
            continue
        check_zh(rep, where + ".cau", c.get("cau"), ctx, simplified)
        if isinstance(c.get("cau"), str):
            n = han_count(c["cau"])
            if not dlo <= n <= dhi + 4:
                rep.err(where, "câu chép chính tả cần %d–%d chữ (đang %d)" % (dlo, dhi, n))
            if n and not in_text(c["cau"], raw):
                rep.err(where, "câu chép chính tả phải chép nguyên văn một câu trong bài")
        extra = c.get("them_dap_an", [])
        if not isinstance(extra, list) or not all(isinstance(x, str) for x in extra):
            rep.err(where + ".them_dap_an", "phải là danh sách chuỗi")
    mc = raw.get("mau_cau")
    if not isinstance(mc, list):
        rep.err("mau_cau", "phải là danh sách id mẫu câu")
    elif grammar_ids and not mc:
        rep.warn("mau_cau", "chưa ghi id mẫu câu nhấn mạnh (lấy đúng id trong danh sách ngữ pháp)")
    else:
        for g in mc:
            if g not in grammar_ids:
                rep.err("mau_cau", 'id "%s" không có trong danh sách ngữ pháp' % g)
    for kk in new_keys:
        if kk not in ctx["used"]:
            rep.err("tu_moi", '"%s" khai báo là từ mới nhưng không có trong bài' % kk)
    check_vi(rep, "tom_tat", raw.get("tom_tat"))
    if story_seen and not short:
        check_vi(rep, "tom_tat_truyen", raw.get("tom_tat_truyen"))
    plain = [surface(b.get("tieu_de") or "") for b in bai if isinstance(b, dict)] + [surface(p) for p in _paragraphs(raw)]
    used = deck_used(plain, scope)
    n_deck = len(scope.get("tu_vung", []))
    need = 2 if short else 4
    if n_deck >= 20 and len(used) < need:
        rep.err("bai", "chỉ dùng %d từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC; viết lại vài câu để dùng thêm ít nhất 8 từ "
                "trong danh sách (đúng nghĩa đã ghi)" % len(used))
    elif n_deck >= 20 and not short and len(used) < 8:
        rep.warn("bai", "mới dùng %d từ của deck; nên dùng 8–20 từ trong danh sách từ vựng" % len(used))
    # pinyin của từ của deck trong bài khác pinyin deck ghi (chữ nhiều cách đọc) → gợi ý cho bước soát
    deck_py = {r[0]: r[1] for r in scope.get("tu_vung", []) if r and r[0] and r[1]}
    odd = []
    for _h, _k in _strings(raw):
        v = _h[_k] if isinstance(_h, list) else _h.get(_k)
        for t in paper.tokenize(v if isinstance(v, str) else ""):
            if t[0] == "word" and t[3] in deck_py and zh._base(t[2].replace(" ", "")) != zh._base(deck_py[t[3]].replace(" ", "")):
                odd.append("%s: bài đọc %s, deck ghi %s" % (t[3], t[2], deck_py[t[3]]))
    if odd:
        rep.warn("bai", "pinyin khác deck (xem lại chữ nhiều cách đọc): " + "; ".join(dict.fromkeys(odd))[:300])
    return rep


def link_count(raw: Any) -> int:
    if not isinstance(raw, dict):
        return 0
    return sum(len(paper.keys(v)) for h, k in _strings(raw)
               for v in [h[k] if isinstance(h, list) else h.get(k)] if isinstance(v, str))


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    if not isinstance(raw, dict):
        return 0
    return len(deck_used([surface(p) for p in _paragraphs(raw)], scope))


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    due = [w for w in scope.get("can_on", []) if w]
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    used = deck_used([surface(p) for p in _paragraphs(raw)], scope)
    return [len(used & set(due)), len(due)]


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

STORY_SETUP = """Truyện dài kỳ "言叶村的小旅店" (bản tiếng Trung của truyện chung của làng). 言叶村 là làng nhỏ cạnh khu
vườn 言叶菜园, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán, tên viết đúng như sau):
- StackChan (viết Latin): robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ, nói câu ngắn, vui vẻ.
- 哈娜: bà chủ quán trọ "言叶旅店", khoảng 30 tuổi, chu đáo, lịch sự với khách (林 gọi là 哈娜姐).
- 林: cô gái Việt Nam mới đến làng, làm ở 言叶旅店, đang học tiếng của làng, đôi khi nói nhầm nhưng rất cố gắng.
- 村长: trưởng làng, hiền, thích kể chuyện ngày xưa.
- 邮递员: bác đưa thư vui tính, biết mọi tin trong làng.
Lời thoại để trong ngoặc kép “…” và ghi rõ ai nói."""


def rules(simplified: bool = True) -> str:
    kind = "GIẢN THỂ" if simplified else "PHỒN THỂ"
    return ("QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):\n"
            "- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Trung chữ %s: không kana, "
            "không chữ Hàn / Việt, không chữ Latin (trừ tên StackChan), dấu câu Trung Quốc ，。！？“”.\n"
            "- MỌI chữ Hán viết kèm pinyin theo TỪ, dạng [chữ|pinyin ghi số]: [学生|xue2 sheng5][在|zai4][看书|kan4 shu1]。"
            " Mỗi chữ một âm tiết, cách nhau dấu cách; số 1–4 là thanh, 5 là thanh nhẹ; ü viết v (女 = nv3). Dấu câu, chữ "
            "số và StackChan để ngoài ngoặc. Ghi đúng cách đọc theo văn cảnh (长大 = zhang3 da4, 很长 = hen3 chang2); 一 / "
            "不 ghi thanh theo chữ sau (一个 = yi2 ge4, 不是 = bu2 shi4).\n"
            "- KHÔNG dùng { } và không markdown (* _ #): máy tự gạch chân từ đã học để người đọc bấm tra.\n"
            "- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi.\n"
            "- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU, "
            "không kèm chữ Hán." % kind)


RULES = rules(True)


def system_prompt(level: str, simplified: bool = True) -> str:
    level = level if level in LEVELS else DEFAULT_LEVEL
    lo, hi = LENGTH[level]
    lv = level.replace("HSK", "HSK ")
    return (
        "Bạn là người Trung Quốc bản xứ, viết báo làng \"%s\" (bản tiếng Trung của 畑新聞) cho người Việt Nam đang học "
        "tiếng Trung trình độ %s.\n"
        "Viết tiếng Trung tự nhiên, đúng ngữ pháp: câu ngắn và rõ (trung bình khoảng %d chữ một câu), ấm áp, hơi hài "
        "hước; không dịch từng chữ từ tiếng Việt.\n"
        "Chỉ dùng ngữ pháp tới trình độ %s (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ "
        "vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.\n"
        "Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.\n"
        "Độ dài phần bài của cả số báo: %d–%d chữ Hán.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (
            MASTHEAD, lv, SENT_WORDS[level], lv, lo, hi, rules(simplified)))


def _vocab_lines(scope: dict[str, Any], limit: int = 1500) -> str:
    rows = scope["kho"] if scope.get("kho") else scope.get("tu_vung", [])
    first = set(scope.get("trong_tam", {}).get("tu", [])) | set(scope.get("sap_quen", [])) | set(scope.get("loi_sai", []))
    ordered = [r for r in rows if r[0] in first] + [r for r in reversed(rows) if r[0] not in first]
    return "\n".join("%s%s = %s" % (r[0], " " + r[1] if r[1] else "", r[2]) for r in ordered[:limit])


def _zh_extra(scope: dict[str, Any], opts: dict[str, Any]) -> str:
    sp = opts.get("story_plain")
    return ("PINYIN: mọi chữ Hán ở tiêu đề, bài, câu hỏi, lựa chọn và câu chép đều viết dạng [chữ|pinyin ghi số] theo từ "
            "(xem QUY TẮC). " + ("Truyện đã viết sẵn ở trên đã có pinyin; câu hỏi / câu chép lấy từ truyện thì chép cả "
                                 "pinyin." if sp else ""))


ZH_PROF: dict[str, Any] = {
    "levels": LEVELS, "default_level": DEFAULT_LEVEL, "length": LENGTH, "dict_words": DICT_WORDS,
    "lang_name": "tiếng Trung", "level_name": lambda lv: lv.replace("HSK", "HSK "), "story_setup": STORY_SETUP,
    "vocab_head": "(từ pinyin = nghĩa)", "vocab_lines": lambda scope: _vocab_lines(scope), "sep": "、",
    "example": '{"loai":"tin_lang","tieu_de":"[今天|jin1 tian1]StackChan[去|qu4][画|hua4][画|hua4]",'
               '"doan":["[下午|xia4 wu3]，StackChan[带|dai4][着|zhe5][一|yi4][盒|he2][颜料|yan2 liao4][去|qu4][了|le5]'
               '[老|lao3][桥|qiao2]。“[我|wo3][想|xiang3][让|rang4][它|ta1][开心|kai1 xin1]！”[他|ta1][说|shuo1]。"]}',
    "extra": (_zh_extra,),
    "fill": {
        "@TITLE@": "Tiêu đề viết kiểu tiêu đề báo tiếng Trung, ngắn.", "@QLANG@": "TIẾNG TRUNG", "@CLANG@": "tiếng Trung",
        "@NONAMES@": "không phải lời thoại trong ngoặc kép", "@NONAMES_SHORT@": "không phải lời thoại trong ngoặc kép",
        "@ALT@": "thường để rỗng",
        "@VILLAGE@": "言叶村 và khu vườn 言叶菜园",
        "@TUMOI@": "(w = từ tiếng Trung chỉ gồm chữ Hán, r = pinyin ghi số, m = nghĩa tiếng Việt)",
        "@TUMOI2@": "(w = từ tiếng Trung, r = pinyin ghi số, m = nghĩa tiếng Việt)",
        "@NOTICE_NAME@": "村里通知",
        "@FIRST@": "(chưa có kỳ nào, đây là kỳ 1: 林 đến 言叶村 và bắt đầu làm ở 言叶旅店)",
        "@DUNIT@": "chữ Hán", "@LUNIT@": "chữ Hán",
        "@NOTICES@": "村里通知 — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng \"◆ \", tiêu đề \"村里通知\".",
        "@COLUMN@": "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu \"StackChan的小角落\".",
    },
}


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    prof = dict(ZH_PROF)
    prof["fill"] = dict(ZH_PROF["fill"])
    p = ai_en.write_prompt(scope, opts, story, history, date, prof=prof)
    return p.replace(RULES, rules(not scope.get("phon_the")))


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    vocab = ""
    if any("DANH SÁCH TỪ VỰNG" in e or "từ của deck" in e for e in errors):
        vocab = "\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ pinyin = nghĩa):\n" + _vocab_lines(scope, 400)
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo tiếng Trung (JSON). Sửa ĐÚNG các lỗi này (pinyin sai / thiếu → "
        "ghi lại đúng [chữ|pinyin ghi số] mỗi chữ một âm tiết; chữ kana / Hàn / Latin / chữ Việt trong phần tiếng Trung → "
        "viết lại bằng chữ Hán; phần tiếng Việt → tiếng Việt có dấu; câu chép chính tả → chép nguyên văn một câu trong "
        "bài…), giữ nguyên phần còn lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\n"
        "LỖI:\n- " + "\n- ".join(errors[:40]) + "\n\n" + rules(not scope.get("phon_the")) + vocab +
        "\n\nSỐ BÁO:\n" + json.dumps(plain_issue(raw), ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    lv = level.replace("HSK", "HSK ")
    return (
        "Bạn là biên tập viên người Trung Quốc, soát lại số báo tiếng Trung dưới đây dành cho người Việt học tiếng Trung "
        "trình độ %s trước khi in.\nKiểm tra kỹ từng câu:\n"
        "1. Tiếng Trung có tự nhiên và đúng ngữ pháp không (lượng từ, 了 / 过 / 着, trật tự từ, bổ ngữ).\n"
        "2. PINYIN: mỗi chữ đúng cách đọc theo văn cảnh (chữ nhiều cách đọc, thanh nhẹ, 一 / 不 đổi thanh), mỗi chữ một "
        "âm tiết.\n"
        "3. Ngữ pháp và độ dài câu có vượt trình độ %s không → viết lại đơn giản, tách câu dài.\n"
        "4. Từ khó hơn trình độ %s (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai "
        "báo trong tu_moi (kèm pinyin và nghĩa tiếng Việt).\n"
        "5. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.\n"
        "6. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "7. Câu chép chính tả có chép nguyên văn một câu trong bài không.\n"
        "8. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.\n"
        "9. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (哈娜 là chủ 言叶旅店, 林 là nhân viên mới).\n"
        "10. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). "
        "Không có lỗi thì van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên), giữ dạng "
        "[chữ|pinyin]. Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật "
        "sự, không viết lại. \"dich\" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.\n\n%s\n\n%s"
        "DANH SÁCH NGỮ PHÁP:\n%s\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ pinyin = nghĩa):\n%s\n\nSỐ BÁO:\n%s" % (
            lv, lv, lv, rules(not scope.get("phon_the")),
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            ai._grammar_lines(scope), _vocab_lines(scope, 600), json.dumps(plain_issue(raw), ensure_ascii=False)))
