"""Báo tiếng Hàn (1.33) — do Gemini viết bằng khoá của người dùng, cùng khung với báo tiếng Anh (ai_en.py).

  - thư mục riêng  user_files/bao_gemini_ko/ ; trình độ TOPIK 1–6; phạm vi = từ tiếng Hàn của các deck đã chọn;
  - Gemini viết chữ trơn bằng Hangul (không Hán tự, không phiên âm). MÁY tự nối tra từ (ko_core.find_links): từ của deck
    trong bài kể cả khi tiểu từ / đuôi dính vào (축제가 → 축제, 무서워서 → 무섭다), ghi thành {chữ trong bài||từ gốc} —
    cùng cú pháp với báo tiếng Nhật / tiếng Anh nên phần đọc báo / tra nghĩa dùng lại nguyên vẹn;
  - bộ kiểm tra `check`: đúng khung, chỉ Hangul (không Hán tự / kana / chữ Việt / Latin), độ dài theo trình độ (đếm cụm
    어절), số từ của deck được dùng, câu hỏi một đáp án, câu chép chép nguyên văn từ bài, phần tiếng Việt có dấu.

File này không import aqt (test được bằng python thường).
"""
from __future__ import annotations

import datetime
import json
import re
from typing import Any

try:
    from . import ai_core as ai
    from . import ai_en
    from . import ko_core as ko
    from . import paper_core as paper
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_core as ai  # type: ignore[no-redef]
    import ai_en  # type: ignore[no-redef]
    import ko_core as ko  # type: ignore[no-redef]
    import paper_core as paper  # type: ignore[no-redef]

FOLDER = "bao_gemini_ko"
LANG = "ko"
LEVELS = ("TOPIK1", "TOPIK2", "TOPIK3", "TOPIK4", "TOPIK5", "TOPIK6")
DEFAULT_LEVEL = "TOPIK2"
# độ dài phần bài của cả số (cụm 어절), độ dài câu trung bình, câu chép chính tả
LENGTH = {"TOPIK1": (90, 200), "TOPIK2": (130, 280), "TOPIK3": (180, 380), "TOPIK4": (230, 480), "TOPIK5": (280, 580),
          "TOPIK6": (320, 660)}
SENT_WORDS = {"TOPIK1": 5, "TOPIK2": 6, "TOPIK3": 8, "TOPIK4": 10, "TOPIK5": 12, "TOPIK6": 14}
DICT_WORDS = {"TOPIK1": (2, 6), "TOPIK2": (3, 7), "TOPIK3": (3, 9), "TOPIK4": (4, 10), "TOPIK5": (4, 12), "TOPIK6": (5, 14)}
LINK_MAX = 24
MASTHEAD = "말밭 신문"            # Báo Ruộng Lời (말 = lời, 밭 = ruộng — như ことば畑); tên Claude đề xuất, người dùng chọn

# Ngữ pháp mỗi trình độ (id|mẫu|nghĩa) — Claude soạn theo các điểm ngữ pháp sơ / trung cấp quen thuộc của TOPIK
GRAMMAR_TEXT = """
TOPIK1|ko1-01|N이에요 / 예요|là N
TOPIK1|ko1-02|N은 / 는|chủ đề (còn N thì…)
TOPIK1|ko1-03|N이 / 가 있어요 / 없어요|có / không có N
TOPIK1|ko1-04|V/A-아요 / 어요|đuôi thân mật lịch sự (hiện tại)
TOPIK1|ko1-05|V/A-았어요 / 었어요|đã (quá khứ)
TOPIK1|ko1-06|N에 가다 / 오다|đi / đến N
TOPIK1|ko1-07|N에서 V|làm V ở N
TOPIK1|ko1-08|V-고 싶다|muốn V
TOPIK1|ko1-09|안 V/A|không (phủ định)
TOPIK1|ko1-10|N을 / 를|tân ngữ
TOPIK1|ko1-11|V/A-고|và, rồi
TOPIK2|ko2-01|V-(으)ㄹ 거예요|sẽ
TOPIK2|ko2-02|V-(으)세요|hãy… (lịch sự)
TOPIK2|ko2-03|V/A-지만|nhưng
TOPIK2|ko2-04|V/A-아서 / 어서|vì… nên; rồi (nối hành động)
TOPIK2|ko2-05|V-(으)ㄹ 수 있다 / 없다|có thể / không thể
TOPIK2|ko2-06|V-고 있다|đang
TOPIK2|ko2-07|V/A-(으)면|nếu
TOPIK2|ko2-08|V-(으)러 가다|đi để làm V
TOPIK2|ko2-09|N보다|hơn N (so sánh)
TOPIK2|ko2-10|V-아 / 어 주다|làm giúp
TOPIK3|ko3-01|V/A-(으)니까|vì (lý do, hay đi với lời khuyên)
TOPIK3|ko3-02|V-(으)려고 하다|định
TOPIK3|ko3-03|V/A-(으)ㄴ데 / 는데|bối cảnh; nhưng
TOPIK3|ko3-04|V-아 / 어 보다|thử
TOPIK3|ko3-05|V/A-기 때문에|vì
TOPIK3|ko3-06|V-(으)ㄴ 적이 있다|đã từng
TOPIK3|ko3-07|V/A-(으)ㄹ 것 같다|có lẽ, hình như
TOPIK3|ko3-08|V-게 되다|trở nên, rốt cuộc thì
TOPIK4|ko4-01|V-다가|đang… thì (chuyển hành động)
TOPIK4|ko4-02|V/A-더라고요|(kể lại điều mình đã thấy)
TOPIK4|ko4-03|V/A-(으)ㄹ 텐데|chắc là… (nên)
TOPIK4|ko4-04|V-도록|để, sao cho
TOPIK4|ko4-05|V/A-거든요|vì (giải thích, thân mật)
TOPIK4|ko4-06|V-자마자|ngay khi
TOPIK5|ko5-01|V/A-더니|(thấy) … rồi thì
TOPIK5|ko5-02|V-(으)ㄴ 채로|trong trạng thái đã…
TOPIK5|ko5-03|V/A-(으)ㄹ 뿐만 아니라|không những… mà còn
TOPIK5|ko5-04|V-는 바람에|vì (kết quả không mong muốn)
TOPIK6|ko6-01|V/A-기는커녕|đừng nói là… ngay cả
TOPIK6|ko6-02|V-고 말다|rốt cuộc đã (đáng tiếc)
TOPIK6|ko6-03|V/A-(으)ㄹ지언정|thà… chứ không
"""


def builtin_grammar(level: str) -> list[dict[str, str]]:
    """Mẫu ngữ pháp tới trình độ `level` (mẫu thấp hơn để ôn)."""
    top = LEVELS.index(level) if level in LEVELS else 1
    out = []
    for line in GRAMMAR_TEXT.strip().splitlines():
        lv, gid, mau, nghia = line.split("|")
        if lv in LEVELS and LEVELS.index(lv) <= top:
            out.append({"id": gid, "mau": mau, "nghia": nghia, "bai": lv.replace("TOPIK", "TOPIK ")})
    return out


def deck_word(raw: Any) -> str:
    """Từ của deck dùng làm từ gốc khi tra: chuỗi Hangul (≤ 4 cụm), không lẫn Hán tự / kana / Latin."""
    w = ai._plain(raw, 60)
    w = re.sub(r"[\[\]{}|<>]", "", w).strip(" .;:!?")
    w = re.split(r"\s*[/,;(（]\s*", w)[0].strip()
    if not w or not ko.HANGUL_RE.search(w) or re.search(r"[A-Za-z\u3040-\u30ff\u3400-\u9fff]", w):
        return ""
    if len(w.split()) > 4 or len(w) > 24:
        return ""
    return w


def _row(it: dict[str, Any]) -> list[str] | None:
    word = deck_word(it.get("word"))
    meaning = ai._plain(it.get("meaning"), 120)
    if not word or not meaning:
        return None
    hv = ai._plain(it.get("hanviet"), 30)
    if hv and hv.lower() not in meaning.lower():
        meaning = "%s · %s" % (meaning, hv.upper())
    reading = ai._plain(it.get("reading"), 60)
    return [word, reading if reading and not ko.HANGUL_RE.search(reading) else "", meaning, "deck"]


def kho_ok(item: dict[str, Any]) -> bool:
    return bool(deck_word(item.get("word")))


def scope_from_pick(pk: dict[str, Any], level: str) -> dict[str, Any]:
    """Phạm vi từ words_core.pick — kho ≤ 100 từ cho lời nhắc, mọi từ đã học để kiểm tra / nối tra từ."""
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
    return {
        "lang": LANG, "nguon": "deck", "trinh_do": level, "nen_tang": "TOPIK1",
        "tu_vung": vocab, "kho": kho, "ngu_phap": grammar,
        "trong_tam": {"tu": due[:ai.FOCUS_WORDS], "ngu_phap": [g["id"] for g in grammar if g["bai"] == level.replace("TOPIK", "TOPIK ")]},
        "can_on": due, "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(vocab)),
    }


# ---------------------------------------------------------------------------
# Chữ, câu, nối tra từ
# ---------------------------------------------------------------------------

VI_ONLY = ai_en.VI_ONLY
MARKUP_RE = re.compile(r"[\[\]{}|*_#]")
KO_OK_RE = re.compile(r"[\uac00-\ud7a3\s0-9.,!?;:'\"()\-–—…%~·“”‘’◆]")


def clean_ko(s: Any) -> Any:
    if not isinstance(s, str):
        return s
    s = MARKUP_RE.sub("", paper.surface(s))
    return re.sub(r"[ \t]+", " ", s).strip()


clean_vi = ai_en.clean_vi
check_vi = ai_en.check_vi
season_text = ai_en.season_text


def words(s: str) -> list[str]:
    """Các cụm (어절) có chữ Hàn."""
    return [w for w in (s or "").split() if ko.HANGUL_RE.search(w)]


def sentences(s: str) -> list[str]:
    out = [x.strip() for x in re.split(r"(?<=[.!?])\s+|\n+", s or "") if x.strip()]
    return out


def _issue_texts(raw: dict[str, Any]) -> tuple[list[str], set[int], list[tuple[int, str | int]]]:
    return ai_en._issue_texts(raw)


def _paragraphs(raw: dict[str, Any]) -> list[str]:
    return ai_en._paragraphs(raw)


def in_text(sentence: str, raw: dict[str, Any]) -> bool:
    want = " ".join(ko.cum(paper.surface(sentence)))
    return bool(want) and any(want in " ".join(ko.cum(paper.surface(p))) for p in _paragraphs(raw))


def _deck_words(scope: dict[str, Any], extra: list[str] | None = None) -> list[str]:
    out = [r[0] for r in scope.get("tu_vung", []) if r and r[0]]
    return out + [w for w in extra or [] if w]


def _link_one(s: str, words_: list[str], used: set[str], cap: list[int], first_only: bool = True) -> str:
    """Nối tra từ trong một chuỗi chữ trơn: mỗi từ gốc một chỗ (lần đầu xuất hiện trong cả số), tối đa LINK_MAX."""
    spans = []
    for a, b, w in ko.find_links(s, words_):
        if first_only and w in used:
            continue
        if cap[0] >= LINK_MAX:
            break
        used.add(w)
        cap[0] += 1
        spans.append((a, b, w))
    out, pos = [], 0
    for a, b, w in spans:
        out.append(s[pos:a])
        out.append("{%s||%s}" % (s[a:b], w))
        pos = b
    out.append(s[pos:])
    return "".join(out)


def deck_used(texts: list[str], scope: dict[str, Any], extra: list[str] | None = None) -> set[str]:
    ws = _deck_words(scope, extra)
    return {w for t in texts for _a, _b, w in ko.find_links(paper.surface(t), ws)}


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: bỏ đánh dấu / markdown, bỏ từ mới đã có trong deck / không dùng, chọn lại câu chép không có
    trong bài, sửa id mẫu câu; rồi máy nối tra từ (từ mới + từ trọng tâm trước)."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL

    def k(v: Any) -> Any:
        if isinstance(v, str) and MARKUP_RE.search(paper.surface(v)):
            notes.append("bỏ ký tự đánh dấu / markdown trong bài")
        return clean_ko(v)
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            b["tieu_de"] = k(b.get("tieu_de"))
            if isinstance(b.get("doan"), list):
                b["doan"] = [k(p) for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
            if isinstance(b.get("ky"), str) and b["ky"].isdigit():
                b["ky"] = int(b["ky"])
            if isinstance(b.get("ky_truoc"), str):
                b["ky_truoc"] = clean_vi(b["ky_truoc"])
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            q["hoi"] = k(q.get("hoi"))
            if isinstance(q.get("chon"), list):
                q["chon"] = [k(o) for o in q["chon"]]
            if isinstance(q.get("dung"), str) and q["dung"].isdigit():
                q["dung"] = int(q["dung"])
            q["giai_thich"] = clean_vi(q.get("giai_thich"))
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            c["cau"] = k(c.get("cau"))
            extra = c.get("them_dap_an") if isinstance(c.get("them_dap_an"), list) else []
            c["them_dap_an"] = [k(x) for x in extra if isinstance(x, str) and x.strip()]
    for key in ("tom_tat", "tom_tat_truyen"):
        if isinstance(raw.get(key), str):
            raw[key] = clean_vi(raw[key])
    deck = {r[0] for r in scope.get("tu_vung", []) if r and r[0]}
    tm = [w for w in raw.get("tu_moi", []) if isinstance(w, dict) and isinstance(w.get("w"), str) and w["w"].strip()] \
        if isinstance(raw.get("tu_moi"), list) else []
    tm2 = []
    for w in tm:
        w["w"] = deck_word(w["w"]) or clean_ko(w["w"])
        w["r"] = ai._plain(w.get("r"), 40) if isinstance(w.get("r"), str) else ""
        w["m"] = clean_vi(w.get("m")) if isinstance(w.get("m"), str) else ""
        if w["w"] in deck:
            notes.append("bỏ khai báo từ mới đã có trong deck")
        elif w["w"]:
            tm2.append(w)
    tm2 = tm2[:int(opts.get("max_new", 3))]
    _fix_dictation(raw, scope, opts, notes, level)
    if isinstance(raw.get("mau_cau"), list):
        ids = {g["id"] for g in scope.get("ngu_phap", [])}
        mc = [g for g in raw["mau_cau"] if isinstance(g, str)]
        fixed = [g if g in ids else ai._match_grammar(g, scope) for g in mc]
        fixed = [g for g in dict.fromkeys(fixed) if g]
        if fixed != mc:
            notes.append("sửa / bỏ id mẫu câu không có trong danh sách")
        raw["mau_cau"] = fixed
    texts, titles, where = _issue_texts(raw)
    plain = [paper.surface(t) for t in texts]
    used_new = {w for t in plain for _a, _b, w in ko.find_links(t, [x["w"] for x in tm2])}
    tm3 = [w for w in tm2 if w["w"] in used_new]
    if len(tm3) != len(tm2):
        notes.append("bỏ từ mới khai báo nhưng không dùng")
    raw["tu_moi"] = tm3
    first = [w["w"] for w in tm3] + list(scope.get("loi_sai", [])) + list(scope.get("sap_quen", [])) + \
        list(scope.get("trong_tam", {}).get("tu", []))
    words_ = list(dict.fromkeys(first + _deck_words(scope, [w["w"] for w in tm3])))
    used: set[str] = set()
    cap = [0]
    bai = raw.get("bai")
    order = sorted(range(len(plain)), key=lambda i: i in titles)       # tiêu đề nối sau cùng (bài trước)
    linked = list(plain)
    for i in order:
        linked[i] = _link_one(plain[i], words_, used, cap)
    for (bi, slot), s in zip(where, linked):
        if slot == "tieu_de":
            bai[bi]["tieu_de"] = s
        else:
            bai[bi]["doan"][slot] = s
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict) and isinstance(c.get("cau"), str):
            c["cau"] = _link_one(paper.surface(c["cau"]), words_, set(), [0], first_only=False)
    return raw, list(dict.fromkeys(notes))


def _fix_dictation(raw: dict[str, Any], scope: dict[str, Any], opts: dict[str, Any], notes: list[str],
                   level: str) -> None:
    """Câu chép phải chép nguyên văn một câu trong bài; không có thì máy chọn câu trọn vẹn trong bài."""
    if not isinstance(raw.get("bai"), list):
        return
    lo, hi = DICT_WORDS.get(level, (3, 8))
    cts = raw.get("chinh_ta") if isinstance(raw.get("chinh_ta"), list) else []
    keep = [c for c in cts if isinstance(c, dict) and isinstance(c.get("cau"), str) and in_text(c["cau"], raw)
            and lo <= len(words(paper.surface(c["cau"]))) <= hi + 3]
    want = 1 if opts.get("short") else 2
    if len(keep) >= want and len(keep) == len(cts):
        return
    have = {" ".join(ko.cum(c["cau"])) for c in keep}
    ws = _deck_words(scope)
    cands = []
    for p in _paragraphs(raw):
        for sent in sentences(paper.surface(p)):
            s = sent.lstrip("◆ ").strip()
            n = len(words(s))
            if not lo <= n <= hi or " ".join(ko.cum(s)) in have:
                continue
            if s.count('"') % 2 or s.count("“") != s.count("”"):
                continue
            cands.append((-len(ko.find_links(s, ws)), -n, s))
    cands.sort()
    for _u, _n, s in cands:
        if len(keep) >= max(want, min(3, len(cts))):
            break
        keep.append({"cau": s, "them_dap_an": []})
        have.add(" ".join(ko.cum(s)))
    notes.append("chọn lại câu chép chính tả từ bài (câu cũ không chép nguyên văn)")
    raw["chinh_ta"] = keep[:4]


def plain_issue(raw: Any) -> Any:
    return ai_en.plain_issue(raw)


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

def check_ko(rep: Any, where: str, value: Any, ctx: dict[str, Any]) -> None:
    """Một chuỗi tiếng Hàn (có thể có đánh dấu tra từ của máy)."""
    if not isinstance(value, str) or not value.strip():
        rep.err(where, "phải là chuỗi tiếng Hàn không rỗng")
        return
    for t in paper.tokenize(value):
        if t[0] == "plain" and any(c in t[1] for c in "{}[]|"):
            rep.err(where, "có ký tự đánh dấu lạ gần: …%s…" % t[1][:24])
        if t[0] == "word":
            ctx["used"].add(t[3])
            if t[3] not in ctx["keys"]:
                rep.err(where, '"%s" không phải từ của deck hay từ mới' % t[3])
    s = paper.surface(value)
    for e in ai.story_core.ko_text_problems(s):
        rep.err(where, e + ": \"%s…\"" % s[:30])
    odd = sorted({c for c in s if not KO_OK_RE.match(c) and not ko.HANGUL_RE.match(c)})
    odd = [c for c in odd if not re.match(r"[A-Za-z\u3400-\u9fff\u3040-\u30ff]", c) and c not in VI_ONLY]
    if odd:
        rep.err(where, "có ký tự lạ %s" % "".join(odd[:8]))


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Hàn. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = ai.Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
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
            rep.err(where, "cần có w (từ tiếng Hàn) và m (nghĩa tiếng Việt)")
            continue
        if not ko.HANGUL_RE.search(w["w"]):
            rep.err(where, "w phải là từ tiếng Hàn (Hangul)")
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
        check_ko(rep, where + ".tieu_de", b.get("tieu_de"), ctx)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 6:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 6)")
        for j, p in enumerate(doan):
            check_ko(rep, "%s.doan[%d]" % (where, j), p, ctx)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else len(words(paper.surface(p)))
                sents += [len(words(x)) for x in sentences(paper.surface(p))]
                if len(p) > 1500:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = LENGTH[level]
    if short:
        lo, hi = lo // 3, hi // 2
    if opts.get("story_plain") and story_seen and not short:
        lo, hi = int(lo * 0.4), int(hi * 0.75)
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d cụm), cần khoảng %d–%d cụm" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d cụm), cần khoảng %d–%d cụm" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d cụm, nên trong khoảng %d–%d" % (total, lo, hi))
    if sents:
        avg = sum(sents) / len(sents)
        if avg > SENT_WORDS[level] * 1.4:
            rep.warn("bai", "câu hơi dài so với trình độ %s (trung bình %.0f cụm / câu, nên ≤ %d): tách câu dài"
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
        check_ko(rep, where + ".hoi", q.get("hoi"), ctx)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_ko(rep, "%s.chon[%d]" % (where, j), o, ctx)
        norm = [" ".join(ko.cum(paper.surface(o))) for o in chon if isinstance(o, str)]
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
        check_ko(rep, where + ".cau", c.get("cau"), ctx)
        if isinstance(c.get("cau"), str):
            n = len(words(paper.surface(c["cau"])))
            if not dlo <= n <= dhi + 3:
                rep.err(where, "câu chép chính tả cần %d–%d cụm (đang %d)" % (dlo, dhi, n))
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
    plain = [paper.surface(b.get("tieu_de") or "") for b in bai if isinstance(b, dict)] + \
        [paper.surface(p) for p in _paragraphs(raw)]
    used = deck_used(plain, scope)
    n_deck = len(scope.get("tu_vung", []))
    need = 2 if short else 4
    if n_deck >= 20 and len(used) < need:
        rep.err("bai", "chỉ dùng %d từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC; viết lại vài câu để dùng thêm ít nhất 8 từ "
                "trong danh sách (đúng nghĩa đã ghi)" % len(used))
    elif n_deck >= 20 and not short and len(used) < 8:
        rep.warn("bai", "mới dùng %d từ của deck; nên dùng 8–20 từ trong danh sách từ vựng" % len(used))
    return rep


def link_count(raw: Any) -> int:
    if not isinstance(raw, dict):
        return 0
    texts, _t, _w = _issue_texts(raw)
    return sum(len(paper.keys(t)) for t in texts)


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    if not isinstance(raw, dict):
        return 0
    texts, _t, _w = _issue_texts(raw)
    return len(deck_used(texts, scope))


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    due = [w for w in scope.get("can_on", []) if w]
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    texts, _t, _w = _issue_texts(raw)
    used = deck_used(texts, scope)
    return [len(used & set(due)), len(due)]


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

STORY_SETUP = """Truyện dài kỳ "코토바 마을의 작은 여관" (bản tiếng Hàn của truyện chung của làng). 코토바 마을 là làng nhỏ cạnh
khu vườn 코토바 텃밭, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán, tên viết đúng như sau):
- 스택짱: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ, nói câu ngắn, vui vẻ.
- 하나 씨: chủ quán trọ "코토바 여관", khoảng 30 tuổi, chu đáo, lịch sự với khách (린 gọi là 하나 언니).
- 린: cô gái Việt Nam mới đến làng, làm ở 코토바 여관, đang học tiếng của làng, đôi khi nói nhầm nhưng rất cố gắng.
- 촌장님: trưởng làng, hiền, thích kể chuyện ngày xưa.
- 우체부 아저씨: bác đưa thư vui tính, biết mọi tin trong làng.
Lời thoại để trong ngoặc kép "…" và ghi rõ ai nói."""

RULES = """QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Hàn (Hangul): không Hán tự (漢字), không
  chữ Nhật / Việt / Latin, không phiên âm. StackChan viết 스택짱.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được thêm tiểu từ và chia đuôi bình thường (축제가, 무서워서).
- Văn kể dùng đuôi -아요 / -어요 hoặc -습니다 thống nhất trong một bài; viết cách chữ (띄어쓰기) chuẩn.
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU."""


def system_prompt(level: str) -> str:
    level = level if level in LEVELS else DEFAULT_LEVEL
    lo, hi = LENGTH[level]
    return (
        "Bạn là người Hàn bản xứ, viết báo làng \"%s\" (bản tiếng Hàn của 畑新聞) cho người Việt Nam đang học tiếng Hàn "
        "trình độ %s.\n"
        "Viết tiếng Hàn tự nhiên, đúng ngữ pháp và cách chữ: câu ngắn và rõ (trung bình khoảng %d cụm 어절 một câu), "
        "ấm áp, hơi hài hước; không dịch từng chữ từ tiếng Việt.\n"
        "Chỉ dùng ngữ pháp tới trình độ %s (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ "
        "vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.\n"
        "Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.\n"
        "Độ dài phần bài của cả số báo: %d–%d cụm (어절).\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (
            MASTHEAD, level.replace("TOPIK", "TOPIK "), SENT_WORDS[level], level.replace("TOPIK", "TOPIK "), lo, hi, RULES))


def _vocab_lines(scope: dict[str, Any], limit: int = 1500) -> str:
    rows = scope["kho"] if scope.get("kho") else scope.get("tu_vung", [])
    first = set(scope.get("trong_tam", {}).get("tu", [])) | set(scope.get("sap_quen", [])) | set(scope.get("loi_sai", []))
    ordered = [r for r in rows if r[0] in first] + [r for r in reversed(rows) if r[0] not in first]
    return "\n".join("%s = %s" % (r[0], r[2]) for r in ordered[:limit])


KO_PROF: dict[str, Any] = {
    "levels": LEVELS, "default_level": DEFAULT_LEVEL, "length": LENGTH, "dict_words": DICT_WORDS,
    "lang_name": "tiếng Hàn", "level_name": lambda lv: lv.replace("TOPIK", "TOPIK "), "story_setup": STORY_SETUP,
    "vocab_head": "(từ = nghĩa)", "vocab_lines": lambda scope: _vocab_lines(scope),
    "example": '{"loai":"tin_lang","tieu_de":"스택짱, 오래된 다리를 칠하다","doan":["어제 오후에 스택짱은 작은 물감 상자를 '
               '들고 오래된 다리에 갔어요. \\"다리를 행복하게 해 주고 싶어요!\\" 스택짱이 말했어요."]}',
    "fill": {
        "@TITLE@": "Tiêu đề viết kiểu tiêu đề báo tiếng Hàn, ngắn.", "@QLANG@": "TIẾNG HÀN", "@CLANG@": "tiếng Hàn",
        "@NONAMES@": "không phải lời thoại trong ngoặc kép", "@NONAMES_SHORT@": "không phải lời thoại trong ngoặc kép",
        "@ALT@": "thường để rỗng",
        "@VILLAGE@": "코토바 마을 và khu vườn 코토바 텃밭",
        "@TUMOI@": "(w = từ tiếng Hàn ở dạng từ điển — danh từ, hoặc động / tính từ đuôi 다; r = phiên âm romaja; "
                   "m = nghĩa tiếng Việt)",
        "@TUMOI2@": "(w = từ tiếng Hàn ở dạng từ điển, r = phiên âm romaja, m = nghĩa tiếng Việt)",
        "@NOTICE_NAME@": "마을 소식",
        "@FIRST@": "(chưa có kỳ nào, đây là kỳ 1: 린 đến 코토바 마을 và bắt đầu làm ở 코토바 여관)",
        "@DUNIT@": "cụm 어절", "@LUNIT@": "cụm 어절",
        "@NOTICES@": "마을 소식 — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng \"◆ \", tiêu đề \"마을 소식\".",
        "@COLUMN@": "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu \"스택짱의 코너\".",
    },
}


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    """Cùng khung với lời nhắc của báo tiếng Anh (ai_en.write_prompt), phần riêng ở KO_PROF."""
    return ai_en.write_prompt(scope, opts, story, history, date, prof=KO_PROF)


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    vocab = ""
    if any("DANH SÁCH TỪ VỰNG" in e or "từ của deck" in e for e in errors):
        vocab = "\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):\n" + _vocab_lines(scope, 400)
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo tiếng Hàn (JSON). Sửa ĐÚNG các lỗi này (Hán tự / chữ Latin / chữ "
        "Nhật / chữ Việt trong phần tiếng Hàn → viết lại bằng Hangul; phần tiếng Việt → viết tiếng Việt có dấu; câu chép "
        "chính tả → chép nguyên văn một câu trong bài…), giữ nguyên phần còn lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\n"
        "LỖI:\n- " + "\n- ".join(errors[:40]) + "\n\n" + RULES + vocab +
        "\n\nSỐ BÁO:\n" + json.dumps(plain_issue(raw), ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    lv = level.replace("TOPIK", "TOPIK ")
    return (
        "Bạn là biên tập viên người Hàn, soát lại số báo tiếng Hàn dưới đây dành cho người Việt học tiếng Hàn trình độ %s "
        "trước khi in.\nKiểm tra kỹ từng câu:\n"
        "1. Tiếng Hàn có tự nhiên và đúng ngữ pháp không (tiểu từ 이/가, 은/는, 을/를, đuôi câu, kính ngữ, cách chữ 띄어쓰기).\n"
        "2. Ngữ pháp và độ dài câu có vượt trình độ %s không → viết lại đơn giản, tách câu dài.\n"
        "3. Từ khó hơn trình độ %s (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai "
        "báo trong tu_moi (kèm nghĩa tiếng Việt).\n"
        "4. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.\n"
        "5. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "6. Câu chép chính tả có chép nguyên văn một câu trong bài không.\n"
        "7. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.\n"
        "8. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (하나 씨 là chủ 코토바 여관, 린 là nhân viên mới).\n"
        "9. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). "
        "Không có lỗi thì van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). "
        "Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết "
        "lại. \"dich\" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.\n\n%s\n\n%s"
        "DANH SÁCH NGỮ PHÁP:\n%s\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):\n%s\n\nSỐ BÁO:\n%s" % (
            lv, lv, lv, RULES,
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            ai._grammar_lines(scope), _vocab_lines(scope, 600), json.dumps(plain_issue(raw), ensure_ascii=False)))
