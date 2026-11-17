"""Báo tiếng Đức / tiếng Pháp (1.35) — do Gemini viết bằng khoá của người dùng, cùng khung với báo tiếng Anh (ai_en.py) và
báo tiếng Hàn (ai_ko.py). Phần chung của hai báo ở đây; ai_de.py / ai_fr.py chỉ chọn ngôn ngữ.

  - thư mục riêng  user_files/bao_gemini_de/ , bao_gemini_fr/ ; trình độ CEFR A1–C1 (Goethe / DELF), mặc định A2;
  - Gemini viết chữ trơn. MÁY tự nối tra từ (eu_core): từ của deck trong bài kể cả dạng biến đổi (Hunde → der Hund,
    gegangen → gehen, mangeons → manger, l'école → école), ghi thành {chữ trong bài||từ gốc} — cùng cú pháp với các báo khác;
  - bộ kiểm tra `check`: đúng khung, chữ Latin của tiếng đó (không chữ Hán / kana / Hangul / chữ riêng của tiếng Việt), độ
    dài theo trình độ (đếm từ), số từ của deck được dùng, câu hỏi một đáp án, câu chép chép nguyên văn từ bài, phần tiếng Việt
    có dấu.

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
    from . import eu_core as eu
    from . import paper_core as paper
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_core as ai  # type: ignore[no-redef]
    import ai_en  # type: ignore[no-redef]
    import eu_core as eu  # type: ignore[no-redef]
    import paper_core as paper  # type: ignore[no-redef]

LEVELS = ("A1", "A2", "B1", "B2", "C1")
DEFAULT_LEVEL = "A2"
LENGTH = {"A1": (100, 230), "A2": (160, 340), "B1": (230, 470), "B2": (300, 620), "C1": (340, 740)}     # như báo tiếng Anh
SENT_WORDS = {"A1": 8, "A2": 11, "B1": 15, "B2": 19, "C1": 24}
DICT_WORDS = {"A1": (4, 11), "A2": (4, 13), "B1": (5, 17), "B2": (5, 19), "C1": (5, 21)}
LINK_MAX = 24

# Ngữ pháp mỗi trình độ (trình độ|id|mẫu|nghĩa) — Claude soạn theo các điểm quen thuộc của khung CEFR (Goethe / DELF)
GRAMMAR_TEXT = {
    "de": """
A1|de1-01|sein: ich bin, du bist, er ist|là (động từ sein)
A1|de1-02|haben: ich habe, du hast|có
A1|de1-03|der / die / das + Nomen|mạo từ xác định theo giống
A1|de1-04|ein / eine / kein|mạo từ không xác định; không có (danh từ)
A1|de1-05|Verb ở vị trí thứ hai|động từ đứng thứ hai trong câu
A1|de1-06|nicht|không (phủ định)
A1|de1-07|W-Fragen: wer, was, wo, wann, wie|câu hỏi với từ để hỏi
A1|de1-08|Ich möchte …|tôi muốn … (lịch sự)
A1|de1-09|Akkusativ: den / einen|tân ngữ trực tiếp (giống đực)
A1|de1-10|in / an / auf + Dativ (Wo?)|ở đâu
A2|de2-01|Perfekt: haben / sein + Partizip II|quá khứ (kể chuyện, văn nói)
A2|de2-02|können, müssen, dürfen, wollen|có thể, phải, được phép, muốn
A2|de2-03|weil + động từ cuối câu|bởi vì
A2|de2-04|dass + động từ cuối câu|rằng
A2|de2-05|Dativ: dem / der / einem|tặng cách (cho ai)
A2|de2-06|trennbare Verben: aufstehen → ich stehe auf|động từ tách
A2|de2-07|Komparativ: größer als|so sánh hơn
A2|de2-08|Präteritum: war, hatte|quá khứ của sein / haben
A2|de2-09|wenn …, dann …|khi / nếu …, thì …
B1|de3-01|Präteritum|quá khứ đơn (văn kể)
B1|de3-02|Relativsatz: der Mann, der …|mệnh đề quan hệ
B1|de3-03|obwohl|mặc dù
B1|de3-04|um … zu + Infinitiv|để làm gì
B1|de3-05|Passiv: wird + Partizip II|bị động
B1|de3-06|Konjunktiv II: würde, hätte, wäre|giả định, nói lịch sự
B1|de3-07|Plusquamperfekt|quá khứ trước một việc quá khứ
B2|de4-01|Passiv mit Modalverb: muss gemacht werden|bị động với động từ khuyết thiếu
B2|de4-02|Partizip als Adjektiv: das lachende Kind|phân từ làm tính từ
B2|de4-03|je … desto …|càng … càng …
C1|de5-01|Nominalisierung|danh từ hoá
C1|de5-02|Konjunktiv I: er sagt, er sei …|lời nói gián tiếp
""",
    "fr": """
A1|fr1-01|être / avoir|là / có
A1|fr1-02|le / la / les, un / une / des|mạo từ
A1|fr1-03|ne … pas|không (phủ định)
A1|fr1-04|présent des verbes en -er|hiện tại của động từ nhóm 1
A1|fr1-05|il y a|có (tồn tại)
A1|fr1-06|est-ce que / qu'est-ce que|câu hỏi
A1|fr1-07|aller + infinitif|sắp làm gì (tương lai gần)
A1|fr1-08|je voudrais …|tôi muốn … (lịch sự)
A1|fr1-09|à / au / chez|ở, đến
A1|fr1-10|accord de l'adjectif: petit / petite|tính từ hợp giống / số
A2|fr2-01|passé composé avec avoir / être|quá khứ kép
A2|fr2-02|imparfait|quá khứ miêu tả, thói quen
A2|fr2-03|pronoms COD: le / la / les|đại từ tân ngữ trực tiếp
A2|fr2-04|parce que|bởi vì
A2|fr2-05|futur simple|tương lai đơn
A2|fr2-06|plus … que / moins … que|so sánh hơn / kém
A2|fr2-07|pouvoir / vouloir / devoir + infinitif|có thể / muốn / phải
A2|fr2-08|verbes pronominaux: se lever|động từ phản thân
A2|fr2-09|y / en|đại từ y / en
B1|fr3-01|il faut que + subjonctif|cần phải (thức giả định)
B1|fr3-02|qui, que, où, dont|đại từ quan hệ
B1|fr3-03|conditionnel présent|điều kiện, nói lịch sự
B1|fr3-04|si + imparfait, conditionnel|câu điều kiện loại 2
B1|fr3-05|plus-que-parfait|quá khứ trước một việc quá khứ
B1|fr3-06|bien que + subjonctif|mặc dù
B1|fr3-07|gérondif: en + -ant|vừa … vừa …
B2|fr4-01|voix passive|bị động
B2|fr4-02|discours indirect|lời nói gián tiếp
B2|fr4-03|participe présent|phân từ hiện tại
C1|fr5-01|subjonctif passé|giả định quá khứ
C1|fr5-02|nominalisation|danh từ hoá
""",
}

# Tên báo — Claude đề xuất (như "The Garden Gazette"), người dùng đổi được: ai_de.MASTHEAD / ai_fr.MASTHEAD, web/paper.js MAST
INFO = {
    "de": {"folder": "bao_gemini_de", "masthead": "Der Wortgarten", "name": "tiếng Đức", "NAME": "TIẾNG ĐỨC", "short": "Đức",
           "exam": "Goethe", "village": "Kotoba-Dorf và khu vườn Kotoba-Garten", "notice": "Dorfnachrichten",
           "corner": "StackChans Ecke", "inn": "Gasthaus Kotoba",
           "first": "(chưa có kỳ nào, đây là kỳ 1: Lin đến Kotoba-Dorf và bắt đầu làm ở Gasthaus Kotoba)",
           "example": '{"loai":"tin_lang","tieu_de":"StackChan streicht die alte Brücke","doan":["Gestern Nachmittag ging '
                      'StackChan mit einem kleinen Farbkasten zur alten Brücke. „Ich möchte die Brücke glücklich machen!“, '
                      'sagte StackChan."]}',
           "quotes": "„…“ (hoặc \"…\")", "slip": "tiếng Đức (vd. nhầm du / Sie, nhầm giống der / die / das)",
           "rules": "- Viết hoa mọi danh từ như tiếng Đức chuẩn; dùng ä ö ü ß đúng chính tả (không viết ae / oe / ue).\n"
                    "- Văn kể dùng Präteritum hoặc Perfekt thống nhất trong một bài."},
    "fr": {"folder": "bao_gemini_fr", "masthead": "Le Jardin des Mots", "name": "tiếng Pháp", "NAME": "TIẾNG PHÁP",
           "short": "Pháp", "exam": "DELF", "village": "le village de Kotoba và khu vườn le jardin Kotoba",
           "notice": "Nouvelles du village", "corner": "Le coin de StackChan", "inn": "l'auberge Kotoba",
           "first": "(chưa có kỳ nào, đây là kỳ 1: Lin đến le village de Kotoba và bắt đầu làm ở l'auberge Kotoba)",
           "example": '{"loai":"tin_lang","tieu_de":"StackChan repeint le vieux pont","doan":["Hier après-midi, StackChan '
                      'est allé au vieux pont avec une petite boîte de peinture. « Je veux rendre le pont heureux ! » a dit '
                      'StackChan."]}',
           "quotes": "« … » (hoặc \"…\")", "slip": "tiếng Pháp (vd. nhầm tu / vous, nhầm giống le / la)",
           "rules": "- Dùng dấu tiếng Pháp đúng chính tả (é è ê à ç œ…); khoảng trắng trước ! ? : ; theo kiểu Pháp.\n"
                    "- Văn kể dùng passé composé + imparfait (A1–B1) thống nhất trong một bài."},
}
# Từ không nối tra (quá phổ biến: nối là gạch chân khắp bài) và tên riêng của báo
STOP = {
    "de": {"sein", "haben", "werden", "der", "die", "das", "ein", "eine", "und", "oder", "aber", "nicht", "ich", "du", "er",
           "sie", "es", "wir", "ihr", "in", "an", "auf", "mit", "zu", "von", "für", "ja", "nein", "den", "dem", "des", "im"},
    "fr": {"être", "avoir", "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "ne", "pas", "je", "tu", "il", "elle",
           "nous", "vous", "ils", "elles", "de", "à", "en", "dans", "pour", "sur", "oui", "non", "du", "au", "aux"},
}
NAMES = {"stackchan", "hana", "lin", "kotoba"}


def info(lang: str) -> dict[str, str]:
    return INFO[lang if lang in INFO else "de"]


def builtin_grammar(lang: str, level: str) -> list[dict[str, str]]:
    """Mẫu ngữ pháp tới trình độ `level` (mẫu thấp hơn để ôn)."""
    top = LEVELS.index(level) if level in LEVELS else 1
    out = []
    for line in GRAMMAR_TEXT.get(lang, "").strip().splitlines():
        lv, gid, mau, nghia = line.split("|")
        if lv in LEVELS and LEVELS.index(lv) <= top:
            out.append({"id": gid, "mau": mau, "nghia": nghia, "bai": lv})
    return out


_NOT_LATIN = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff]")


def deck_word(raw: Any, lang: str = "de") -> str:
    """Từ của deck dùng làm từ gốc khi tra: chữ Latin (≤ 4 từ), bỏ số nhiều / ghi chú; giữ mạo từ ("der Hund")."""
    w = ai._plain(raw, 80)
    w = re.sub(r"[\[\]{}|<>]", "", w).strip(" .;:!?")
    alts = eu.alternatives(w, lang)
    w = alts[0] if alts else ""
    if not w or _NOT_LATIN.search(w) or not re.search(r"[A-Za-zÀ-ÿ]", w):
        return ""
    if len(w.split()) > 4 or len(w) > 40:
        return ""
    return w


def _row(it: dict[str, Any], lang: str) -> list[str] | None:
    word = deck_word(it.get("word"), lang)
    meaning = ai._plain(it.get("meaning"), 120)
    if not word or not meaning:
        return None
    reading = ai._plain(it.get("reading"), 60)
    return [word, reading if reading and not _NOT_LATIN.search(reading) else "", meaning, "deck"]


def scope_from_pick(lang: str, pk: dict[str, Any], level: str) -> dict[str, Any]:
    """Phạm vi từ words_core.pick — kho ≤ 100 từ cho lời nhắc, mọi từ đã học để kiểm tra / nối tra từ."""
    level = level if level in LEVELS else DEFAULT_LEVEL
    kho, due = [], []
    for it in pk.get("kho", []):
        r = _row(it, lang)
        if r:
            kho.append(r)
            if it.get("due"):
                due.append(r[0])
    vocab, seen = [], set()
    for it in list(pk.get("kho", [])) + list(pk.get("all", [])):
        r = _row(it, lang)
        if r and r[0] not in seen:
            seen.add(r[0])
            vocab.append(r)
    grammar = builtin_grammar(lang, level)
    decks = [d for d in pk.get("decks", []) if isinstance(d, str)]
    return {
        "lang": lang, "nguon": "deck", "trinh_do": level, "nen_tang": "A1",
        "tu_vung": vocab, "kho": kho, "ngu_phap": grammar,
        "trong_tam": {"tu": due[:ai.FOCUS_WORDS], "ngu_phap": [g["id"] for g in grammar if g["bai"] == level]},
        "can_on": due, "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(vocab)),
    }


# ---------------------------------------------------------------------------
# Chữ, câu, nối tra từ
# ---------------------------------------------------------------------------

VI_ONLY = ai_en.VI_ONLY
MARKUP_RE = re.compile(r"[\[\]{}|*_#]")
EU_OK_RE = re.compile(r"[A-Za-z0-9\s.,!?;:'\"()\-–—…%&/+°€$@#=~◆“”‘’„‚«»‹›"
                      r"äöüßÄÖÜẞàâæçéèêëîïôœùûüÿÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ\u00a0\u202f]")


def clean_eu(s: Any) -> Any:
    if not isinstance(s, str):
        return s
    s = MARKUP_RE.sub("", paper.surface(s))
    return re.sub(r"[ \t]+", " ", s).strip()


clean_vi = ai_en.clean_vi
check_vi = ai_en.check_vi
season_text = ai_en.season_text_vi


def words(s: str, lang: str = "de") -> list[str]:
    return [w for w in eu.words(s, lang) if re.search(r"[^\W\d_]", w)]


def sentences(s: str) -> list[str]:
    return [x.strip() for x in re.split(r"(?<=[.!?…])[»“\"]?\s+(?=[A-ZÀ-ÖØ-Þ„«\"“])|\n+", s or "") if x.strip()]


def _issue_texts(raw: dict[str, Any]) -> tuple[list[str], set[int], list[tuple[int, str | int]]]:
    return ai_en._issue_texts(raw)


def _paragraphs(raw: dict[str, Any]) -> list[str]:
    return ai_en._paragraphs(raw)


def _norm_sent(s: str, lang: str) -> str:
    return " ".join(eu.words(paper.surface(s), lang))


def in_text(sentence: str, raw: dict[str, Any], lang: str = "de") -> bool:
    want = _norm_sent(sentence, lang)
    return bool(want) and any(want in _norm_sent(p, lang) for p in _paragraphs(raw))


def _deck_words(scope: dict[str, Any], extra: list[str] | None = None) -> list[str]:
    out = [r[0] for r in scope.get("tu_vung", []) if r and r[0]]
    return out + [w for w in extra or [] if w]


_RX: dict[tuple[str, str], Any] = {}


def _rx(word: str, lang: str) -> Any:
    key = (lang, word)
    if key not in _RX:
        base = {eu.strip_article(a, lang).lower() for a in eu.alternatives(word, lang)}
        if base & STOP.get(lang, set()) or base & NAMES:
            _RX[key] = None
        else:
            fs = [f for f in eu.forms(word, lang) if eu.strip_article(f, lang).lower() not in STOP.get(lang, set())]
            body = "|".join(re.escape(f).replace(r"\ ", r"\s+") for f in fs)
            _RX[key] = re.compile(r"(?<![%s])(?:%s)(?![%s])" % (eu.LETTERS, body, eu.LETTERS), re.I) if body else None
        if len(_RX) > 20000:
            _RX.clear()
    return _RX[key]


def find_links(s: str, words_: list[str], lang: str) -> list[tuple[int, int, str]]:
    """Chỗ có từ của deck trong chuỗi (kể cả dạng biến đổi): [(đầu, cuối, từ gốc)], không chồng nhau, dài trước."""
    cands = []
    for w in dict.fromkeys(words_):
        rx = _rx(w, lang)
        if rx is None:
            continue
        for m in rx.finditer(s):
            cands.append((m.start(), m.end(), w))
    cands.sort(key=lambda x: (x[0], -(x[1] - x[0])))
    out, end = [], -1
    for a, b, w in cands:
        if a >= end:
            out.append((a, b, w))
            end = b
    return out


def _link_one(s: str, words_: list[str], used: set[str], cap: list[int], lang: str, first_only: bool = True,
              must: set[str] | None = None) -> str:
    """Nối tra từ trong một chuỗi chữ trơn: mỗi từ gốc một chỗ (lần đầu xuất hiện trong cả số), tối đa LINK_MAX; từ mới
    của số (`must`) luôn nối (như báo tiếng Hàn 1.33)."""
    spans = []
    for a, b, w in find_links(s, words_, lang):
        if first_only and w in used:
            continue
        if cap[0] >= LINK_MAX and w not in (must or ()):
            continue
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


def deck_used(texts: list[str], scope: dict[str, Any], lang: str, extra: list[str] | None = None) -> set[str]:
    ws = _deck_words(scope, extra)
    return {w for t in texts for _a, _b, w in find_links(paper.surface(t), ws, lang)}


def autofix(lang: str, raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: bỏ đánh dấu / markdown, bỏ từ mới đã có trong deck / không dùng, chọn lại câu chép không có
    trong bài, sửa id mẫu câu; rồi máy nối tra từ (từ mới + từ trọng tâm trước)."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL

    def k(v: Any) -> Any:
        if isinstance(v, str) and MARKUP_RE.search(paper.surface(v)):
            notes.append("bỏ ký tự đánh dấu / markdown trong bài")
        return clean_eu(v)
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
    deck = {r[0].lower() for r in scope.get("tu_vung", []) if r and r[0]}
    deck_base = {eu.strip_article(x, lang).lower() for x in deck}
    tm = [w for w in raw.get("tu_moi", []) if isinstance(w, dict) and isinstance(w.get("w"), str) and w["w"].strip()] \
        if isinstance(raw.get("tu_moi"), list) else []
    tm2 = []
    for w in tm:
        w["w"] = deck_word(w["w"], lang) or clean_eu(w["w"])
        w["r"] = ai._plain(w.get("r"), 40) if isinstance(w.get("r"), str) else ""
        w["m"] = clean_vi(w.get("m")) if isinstance(w.get("m"), str) else ""
        if w["w"].lower() in deck or eu.strip_article(w["w"], lang).lower() in deck_base:
            notes.append("bỏ khai báo từ mới đã có trong deck")
        elif w["w"]:
            tm2.append(w)
    tm2 = tm2[:int(opts.get("max_new", 3))]
    _fix_dictation(lang, raw, scope, opts, notes, level)
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
    used_new = {w for t in plain for _a, _b, w in find_links(t, [x["w"] for x in tm2], lang)}
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
        linked[i] = _link_one(plain[i], words_, used, cap, lang, must={w["w"] for w in tm3})
    for (bi, slot), s in zip(where, linked):
        if slot == "tieu_de":
            bai[bi]["tieu_de"] = s
        else:
            bai[bi]["doan"][slot] = s
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict) and isinstance(c.get("cau"), str):
            c["cau"] = _link_one(paper.surface(c["cau"]), words_, set(), [0], lang, first_only=False)
    return raw, list(dict.fromkeys(notes))


def _fix_dictation(lang: str, raw: dict[str, Any], scope: dict[str, Any], opts: dict[str, Any], notes: list[str],
                   level: str) -> None:
    """Câu chép phải chép nguyên văn một câu trong bài; không có thì máy chọn câu trọn vẹn trong bài."""
    if not isinstance(raw.get("bai"), list):
        return
    lo, hi = DICT_WORDS.get(level, (4, 13))
    cts = raw.get("chinh_ta") if isinstance(raw.get("chinh_ta"), list) else []
    keep = [c for c in cts if isinstance(c, dict) and isinstance(c.get("cau"), str) and in_text(c["cau"], raw, lang)
            and lo <= len(words(paper.surface(c["cau"]), lang)) <= hi + 3]
    want = 1 if opts.get("short") else 2
    if len(keep) >= want and len(keep) == len(cts):
        return
    have = {_norm_sent(c["cau"], lang) for c in keep}
    ws = _deck_words(scope)
    cands = []
    for p in _paragraphs(raw):
        for sent in sentences(paper.surface(p)):
            s = sent.lstrip("◆ ").strip()
            n = len(words(s, lang))
            if not lo <= n <= hi or _norm_sent(s, lang) in have:
                continue
            if s.count('"') % 2 or s.count("“") != s.count("”") or s.count("«") != s.count("»") or \
                    s.count("„") != s.count("“"):
                continue
            if any(x in s.lower() for x in NAMES):
                continue
            cands.append((-len(find_links(s, ws, lang)), -n, s))
    cands.sort()
    for _u, _n, s in cands:
        if len(keep) >= max(want, min(3, len(cts))):
            break
        keep.append({"cau": s, "them_dap_an": []})
        have.add(_norm_sent(s, lang))
    notes.append("chọn lại câu chép chính tả từ bài (câu cũ không chép nguyên văn)")
    raw["chinh_ta"] = keep[:4]


def plain_issue(raw: Any) -> Any:
    """Bản không có dấu tra từ để gửi Gemini sửa / soát — cả câu hỏi / lựa chọn (máy nối tra từ ở đó nữa)."""
    out = ai_en.plain_issue(raw)
    for q in out.get("cau_hoi", []) if isinstance(out, dict) and isinstance(out.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            if isinstance(q.get("hoi"), str):
                q["hoi"] = paper.surface(q["hoi"])
            if isinstance(q.get("chon"), list):
                q["chon"] = [paper.surface(o) if isinstance(o, str) else o for o in q["chon"]]
    return out


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------


def text_problems(s: str) -> list[str]:
    """Lỗi chữ của một chuỗi tiếng Đức / tiếng Pháp (đã bỏ đánh dấu)."""
    out = []
    if _NOT_LATIN.search(s):
        out.append("có chữ Hán / kana / Hangul")
    if any(c in VI_ONLY for c in s):
        out.append("có chữ tiếng Việt")
    odd = sorted({c for c in s if not EU_OK_RE.match(c)} - set(VI_ONLY))
    odd = [c for c in odd if not _NOT_LATIN.match(c)]
    if odd:
        out.append("có ký tự lạ %s" % "".join(odd[:8]))
    return out


def check_eu(rep: Any, where: str, value: Any, ctx: dict[str, Any]) -> None:
    """Một chuỗi tiếng Đức / tiếng Pháp (có thể có đánh dấu tra từ của máy)."""
    if not isinstance(value, str) or not value.strip():
        rep.err(where, "phải là chuỗi %s không rỗng" % info(ctx["lang"])["name"])
        return
    for t in paper.tokenize(value):
        if t[0] == "plain" and any(c in t[1] for c in "{}[]|"):
            rep.err(where, "có ký tự đánh dấu lạ gần: …%s…" % t[1][:24])
        if t[0] == "word":
            ctx["used"].add(t[3])
            if t[3] not in ctx["keys"]:
                rep.err(where, '"%s" không phải từ của deck hay từ mới' % t[3])
    s = paper.surface(value)
    for e in text_problems(s):
        rep.err(where, e + ": \"%s…\"" % s[:30])


def check(lang: str, raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Đức / tiếng Pháp. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = ai.Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    nm = info(lang)["name"]
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
            rep.err(where, "cần có w (từ %s) và m (nghĩa tiếng Việt)" % nm)
            continue
        if text_problems(w["w"]) or not re.search(r"[A-Za-zÀ-ÿ]", w["w"]):
            rep.err(where, "w phải là từ %s" % nm)
        check_vi(rep, where + ".m", w.get("m"))
        new_keys.add(w["w"])
    deck_keys = {r[0] for r in scope.get("tu_vung", []) if r and r[0]}
    ctx = {"keys": deck_keys | new_keys, "used": set(), "lang": lang}
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
        check_eu(rep, where + ".tieu_de", b.get("tieu_de"), ctx)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 6:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 6)")
        for j, p in enumerate(doan):
            check_eu(rep, "%s.doan[%d]" % (where, j), p, ctx)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else len(words(paper.surface(p), lang))
                sents += [len(words(x, lang)) for x in sentences(paper.surface(p))]
                if len(p) > 2500:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = LENGTH[level]
    if short:
        lo, hi = lo // 3, hi // 2
    if opts.get("story_plain") and story_seen and not short:
        lo, hi = int(lo * 0.4), int(hi * 0.75)
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d từ), cần khoảng %d–%d từ" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d từ), cần khoảng %d–%d từ" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d từ, nên trong khoảng %d–%d" % (total, lo, hi))
    if sents:
        avg = sum(sents) / len(sents)
        if avg > SENT_WORDS[level] * 1.4:
            rep.warn("bai", "câu hơi dài so với trình độ %s (trung bình %.0f từ / câu, nên ≤ %d): tách câu dài"
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
        check_eu(rep, where + ".hoi", q.get("hoi"), ctx)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_eu(rep, "%s.chon[%d]" % (where, j), o, ctx)
        norm = [_norm_sent(o, lang) for o in chon if isinstance(o, str)]
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
        check_eu(rep, where + ".cau", c.get("cau"), ctx)
        if isinstance(c.get("cau"), str):
            n = len(words(paper.surface(c["cau"]), lang))
            if not dlo <= n <= dhi + 3:
                rep.err(where, "câu chép chính tả cần %d–%d từ (đang %d)" % (dlo, dhi, n))
            if n and not in_text(c["cau"], raw, lang):
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
    used = deck_used(plain, scope, lang)
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


def deck_count(lang: str, raw: Any, scope: dict[str, Any]) -> int:
    if not isinstance(raw, dict):
        return 0
    texts, _t, _w = _issue_texts(raw)
    return len(deck_used(texts, scope, lang))


def focus_used(lang: str, raw: Any, scope: dict[str, Any]) -> list[int]:
    due = [w for w in scope.get("can_on", []) if w]
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    texts, _t, _w = _issue_texts(raw)
    used = deck_used(texts, scope, lang)
    return [len(used & set(due)), len(due)]


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

STORY_SETUP = {
    "de": """Truyện dài kỳ "Das kleine Gasthaus im Kotoba-Dorf" (bản tiếng Đức của truyện chung của làng). Kotoba-Dorf là
làng nhỏ cạnh khu vườn Kotoba-Garten, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán, tên viết đúng như sau):
- StackChan: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ, nói câu ngắn, vui vẻ.
- Hana: chủ quán trọ "Gasthaus Kotoba", khoảng 30 tuổi, chu đáo, lịch sự với khách (không gọi "Oma").
- Lin: cô gái Việt Nam mới đến làng, làm ở Gasthaus Kotoba, đang học tiếng của làng, đôi khi nói nhầm nhưng rất cố gắng.
- der Bürgermeister: trưởng làng, hiền, thích kể chuyện ngày xưa (không có tên riêng).
- der Briefträger: bác đưa thư vui tính, biết mọi tin trong làng.
Lời thoại để trong ngoặc kép „…“ và ghi rõ ai nói.""",
    "fr": """Truyện dài kỳ "La petite auberge du village de Kotoba" (bản tiếng Pháp của truyện chung của làng). Le village de
Kotoba là làng nhỏ cạnh khu vườn le jardin Kotoba, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán, tên viết đúng như sau):
- StackChan: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ, nói câu ngắn, vui vẻ.
- Hana: chủ quán trọ "l'auberge Kotoba", khoảng 30 tuổi, chu đáo, lịch sự với khách (không gọi "grand-mère").
- Lin: cô gái Việt Nam mới đến làng, làm ở l'auberge Kotoba, đang học tiếng của làng, đôi khi nói nhầm nhưng rất cố gắng.
- le maire: trưởng làng, hiền, thích kể chuyện ngày xưa (không có tên riêng).
- le facteur: bác đưa thư vui tính, biết mọi tin trong làng.
Lời thoại để trong ngoặc kép « … » và ghi rõ ai nói.""",
}


def rules(lang: str) -> str:
    i = info(lang)
    return (
        "QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):\n"
        "- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng %s: không chữ Hán / kana / Hangul, không "
        "chữ tiếng Việt, không phiên âm. StackChan viết StackChan.\n"
        "- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm "
        "tra.\n"
        "- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được chia động từ, đổi số nhiều, đổi đuôi tính từ bình "
        "thường.\n%s\n"
        "- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU."
        % (i["name"], i["rules"]))


def system_prompt(lang: str, level: str) -> str:
    level = level if level in LEVELS else DEFAULT_LEVEL
    lo, hi = LENGTH[level]
    i = info(lang)
    who = "người Đức bản xứ" if lang == "de" else "người Pháp bản xứ"
    return (
        "Bạn là %s, viết báo làng \"%s\" (bản %s của 畑新聞) cho người Việt Nam đang học %s trình độ %s (khung CEFR, như "
        "kỳ thi %s).\n"
        "Viết %s tự nhiên, đúng ngữ pháp và chính tả: câu ngắn và rõ (trung bình khoảng %d từ một câu), ấm áp, hơi hài "
        "hước; không dịch từng chữ từ tiếng Việt.\n"
        "Chỉ dùng ngữ pháp tới trình độ %s (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ "
        "vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.\n"
        "Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.\n"
        "Độ dài phần bài của cả số báo: %d–%d từ.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (
            who, i["masthead"], i["name"], i["name"], level, i["exam"], i["name"], SENT_WORDS[level], level, lo, hi,
            rules(lang)))


def _vocab_lines(scope: dict[str, Any], limit: int = 1500) -> str:
    rows = scope["kho"] if scope.get("kho") else scope.get("tu_vung", [])
    first = set(scope.get("trong_tam", {}).get("tu", [])) | set(scope.get("sap_quen", [])) | set(scope.get("loi_sai", []))
    ordered = [r for r in rows if r[0] in first] + [r for r in reversed(rows) if r[0] not in first]
    return "\n".join("%s = %s" % (r[0], r[2]) for r in ordered[:limit])


def prof(lang: str) -> dict[str, Any]:
    i = info(lang)
    return {
        "season": ai_en.season_text_vi,
        "levels": LEVELS, "default_level": DEFAULT_LEVEL, "length": LENGTH, "dict_words": DICT_WORDS,
        "lang_name": i["name"], "level_name": lambda lv: lv, "story_setup": STORY_SETUP[lang if lang in STORY_SETUP else "de"],
        "vocab_head": "(từ = nghĩa)", "vocab_lines": lambda scope: _vocab_lines(scope),
        "example": i["example"],
        "fill": {
            "@TITLE@": "Tiêu đề viết kiểu tiêu đề báo %s, ngắn (3–8 từ)." % i["name"], "@QLANG@": i["NAME"],
            "@CLANG@": i["name"],
            "@NONAMES@": "KHÔNG có tên riêng và không phải lời thoại trong ngoặc kép",
            "@NONAMES_SHORT@": "KHÔNG có tên riêng và không phải lời thoại trong ngoặc kép",
            "@ALT@": "thường để rỗng",
            "@VILLAGE@": i["village"],
            "@TUMOI@": "(w = từ %s ở dạng từ điển — danh từ kèm mạo từ; r = phiên âm IPA dạng /.../ nếu chắc, không thì "
                       "rỗng; m = nghĩa tiếng Việt)" % i["name"],
            "@TUMOI2@": "(w = từ %s ở dạng từ điển, danh từ kèm mạo từ; r = phiên âm IPA hoặc rỗng; m = nghĩa tiếng Việt)"
                        % i["name"],
            "@NOTICE_NAME@": i["notice"],
            "@FIRST@": i["first"],
            "@DUNIT@": "từ", "@LUNIT@": "từ",
            "@NOTICES@": "%s — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng \"◆ \", tiêu đề \"%s\"."
                         % (i["notice"], i["notice"]),
            "@COLUMN@": "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu \"%s\"." % i["corner"],
        },
    }


def write_prompt(lang: str, scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    """Cùng khung với lời nhắc của báo tiếng Anh (ai_en.write_prompt), phần riêng ở prof(lang)."""
    return ai_en.write_prompt(scope, opts, story, history, date, prof=prof(lang))


def repair_prompt(lang: str, raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    i = info(lang)
    vocab = ""
    if any("DANH SÁCH TỪ VỰNG" in e or "từ của deck" in e for e in errors):
        vocab = "\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):\n" + _vocab_lines(scope, 400)
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo %s (JSON). Sửa ĐÚNG các lỗi này (chữ Hán / kana / Hangul / chữ "
        "Việt trong phần %s → viết lại bằng %s; phần tiếng Việt → viết tiếng Việt có dấu; câu chép chính tả → chép nguyên "
        "văn một câu trong bài…), giữ nguyên phần còn lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\n"
        "LỖI:\n- " % (i["name"], i["name"], i["name"]) + "\n- ".join(errors[:40]) + "\n\n" + rules(lang) + vocab +
        "\n\nSỐ BÁO:\n" + json.dumps(plain_issue(raw), ensure_ascii=False))


def review_prompt(lang: str, raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    i = info(lang)
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    gram = ("giống der / die / das, cách (Nominativ / Akkusativ / Dativ), vị trí động từ, chia động từ, viết hoa danh từ"
            if lang == "de" else "giống le / la, hợp giống / số, chia động từ, passé composé với être / avoir, dấu")
    return (
        "Bạn là biên tập viên người %s, soát lại số báo %s dưới đây dành cho người Việt học %s trình độ %s trước khi in.\n"
        "Kiểm tra kỹ từng câu:\n"
        "1. %s có tự nhiên và đúng ngữ pháp không (%s).\n"
        "2. Ngữ pháp và độ dài câu có vượt trình độ %s không → viết lại đơn giản, tách câu dài.\n"
        "3. Từ khó hơn trình độ %s (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai "
        "báo trong tu_moi (kèm nghĩa tiếng Việt).\n"
        "4. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.\n"
        "5. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "6. Câu chép chính tả có chép nguyên văn một câu trong bài không.\n"
        "7. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.\n"
        "8. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (Hana là chủ %s, Lin là nhân viên mới).\n"
        "9. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). "
        "Không có lỗi thì van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). "
        "Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết "
        "lại. \"dich\" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.\n\n%s\n\n%s"
        "DANH SÁCH NGỮ PHÁP:\n%s\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):\n%s\n\nSỐ BÁO:\n%s" % (
            i["short"], i["name"], i["name"], level, i["name"].capitalize(), gram, level, level, i["inn"], rules(lang),
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            ai._grammar_lines(scope), _vocab_lines(scope, 600), json.dumps(plain_issue(raw), ensure_ascii=False)))
