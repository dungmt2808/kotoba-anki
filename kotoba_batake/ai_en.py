"""Báo 畑新聞 bản tiếng Anh — "The Garden Gazette" (bản 1.19), do Gemini viết bằng khoá của người dùng.

Dùng chung khung của báo tiếng Nhật (ai_core.Job, định dạng bao.json, paper_core đọc / chấm / chép), chỉ khác:
  - thư mục riêng  user_files/bao_gemini_en/  (số báo, truyện, lịch sử, nhật ký, trạng thái riêng);
  - trình độ CEFR A1–C1, phạm vi = từ tiếng Anh của deck đang xem (cột IPA làm "cách đọc");
  - Gemini viết chữ trơn (không đánh dấu gì). MÁY tự nối tra từ: tìm từ của deck trong bài theo dạng gốc
    (went → go, cities → city, bigger → big…, cụm từ nhiều chữ), ghi thành {chữ trong bài||từ gốc} — cùng cú pháp
    với báo tiếng Nhật nên phần đọc báo / bấm tra nghĩa dùng lại nguyên vẹn. Gửi lại cho Gemini (sửa, soát) thì
    bỏ hết đánh dấu, nên Gemini không thể làm hỏng hay làm rơi chỗ tra từ;
  - bộ kiểm tra `check`: đúng khung, chỉ chữ tiếng Anh (không lẫn tiếng Việt / chữ Nhật), độ dài theo trình độ,
    số từ của deck được dùng, câu hỏi một đáp án, câu chép chép nguyên văn từ bài, phần tiếng Việt có dấu.

File này không import aqt (test được bằng python thường).
"""

from __future__ import annotations

import copy
import datetime
import json
import re
from typing import Any

try:
    from . import ai_core as ai
    from . import paper_core as paper
    from . import text_core as text
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_core as ai  # type: ignore[no-redef]
    import paper_core as paper  # type: ignore[no-redef]
    import text_core as text  # type: ignore[no-redef]

FOLDER = "bao_gemini_en"
LEVELS = ("A1", "A2", "B1", "B2", "C1")
DEFAULT_LEVEL = "A2"
# số từ tiếng Anh của cả phần bài (không tính tiêu đề), số thường 3 bài
LENGTH = {"A1": (100, 230), "A2": (160, 340), "B1": (230, 470), "B2": (300, 620), "C1": (340, 740)}
SENT_WORDS = {"A1": 9, "A2": 12, "B1": 16, "B2": 20, "C1": 25}      # độ dài câu trung bình nên có
DICT_WORDS = {"A1": (4, 12), "A2": (4, 14), "B1": (5, 18), "B2": (5, 20), "C1": (5, 22)}   # câu chép chính tả
LINK_MAX = 24          # tổng số chỗ bấm tra từ trong phần bài (mỗi từ một chỗ, lần đầu xuất hiện)
MASTHEAD = "The Garden Gazette"

# Mẫu ngữ pháp theo khung CEFR (danh sách chung tự soạn). Báo dùng ngữ pháp tới trình độ đã chọn.
GRAMMAR_TEXT = """
A1|be: am / is / are|động từ to be
A1|present simple: I work / she works|thì hiện tại đơn
A1|present continuous: I am working|thì hiện tại tiếp diễn
A1|there is / there are|có (cái gì ở đâu)
A1|can / can't|có thể / không thể
A1|have got / has got|có (sở hữu)
A1|like / love / hate + -ing|thích / ghét làm gì
A1|imperatives: Come in! / Don't run!|câu mệnh lệnh
A1|possessive 's and my / your / his / her|sở hữu
A1|this / that / these / those|này / kia
A1|prepositions of place: in / on / under / next to|giới từ chỉ nơi chốn
A1|prepositions of time: at / on / in|giới từ chỉ thời gian
A1|a / an / the|mạo từ
A1|some / any|một vài / nào
A1|was / were|quá khứ của be
A1|questions: What / Where / When / Who / How|câu hỏi Wh-
A1|let's + verb|hãy cùng …
A1|would like|muốn (lịch sự)
A2|past simple (regular and irregular verbs)|thì quá khứ đơn
A2|past continuous: was / were + -ing|thì quá khứ tiếp diễn
A2|going to (plans)|dự định sẽ
A2|will (decisions, predictions, offers)|sẽ
A2|comparatives: bigger / more beautiful than|so sánh hơn
A2|superlatives: the biggest / the most beautiful|so sánh nhất
A2|present perfect: have / has + past participle (ever, never, just)|thì hiện tại hoàn thành
A2|must / mustn't / have to|phải / không được
A2|should / shouldn't|nên / không nên
A2|adverbs of frequency: always / usually / sometimes / never|trạng từ chỉ tần suất
A2|much / many / a lot of / a few / a little|lượng từ
A2|too / enough|quá / đủ
A2|first conditional: If it rains, we will …|câu điều kiện loại 1
A2|verb + to-infinitive: want to / decide to|động từ + to V
A2|because / so / but|vì / nên / nhưng
A2|might / may (possibility)|có lẽ
A2|object pronouns: me / him / her / us / them|đại từ tân ngữ
A2|time clauses: when / before / after|khi / trước khi / sau khi
B1|present perfect vs past simple|hiện tại hoàn thành và quá khứ đơn
B1|present perfect continuous: have been + -ing|hiện tại hoàn thành tiếp diễn
B1|past perfect: had + past participle|quá khứ hoàn thành
B1|used to|đã từng (thói quen trong quá khứ)
B1|second conditional: If I had …, I would …|câu điều kiện loại 2
B1|passive voice: is made / was built|câu bị động
B1|relative clauses: who / which / that / where|mệnh đề quan hệ
B1|reported speech: She said (that) …|câu tường thuật
B1|gerunds and infinitives: enjoy -ing / hope to|danh động từ và to V
B1|phrasal verbs: look after / find out / give up|cụm động từ
B1|so / such … that|quá … đến nỗi
B1|although / however|mặc dù / tuy nhiên
B1|question tags: …, isn't it?|câu hỏi đuôi
B1|must / might / can't (deduction)|suy đoán
B2|third conditional: If I had known, I would have …|câu điều kiện loại 3
B2|wish / if only|ước gì
B2|future continuous / future perfect|tương lai tiếp diễn / hoàn thành
B2|passive with modals: should be done|bị động với động từ khuyết thiếu
B2|have something done|nhờ / thuê ai làm gì
B2|non-defining relative clauses|mệnh đề quan hệ không xác định
B2|participle clauses: Walking home, she …|mệnh đề phân từ
B2|modal perfect: should have / might have|lẽ ra / có lẽ đã
B2|linking words: despite / whereas / unless|từ nối
C1|inversion: Never have I … / Not only …|đảo ngữ
C1|cleft sentences: What I need is … / It was … that|câu chẻ
C1|mixed conditionals|câu điều kiện hỗn hợp
C1|advanced passive: It is said that …|bị động nâng cao
C1|subjunctive: I suggest (that) he be …|thể giả định
"""


def builtin_grammar(level: str) -> list[dict[str, str]]:
    """Mẫu ngữ pháp tới trình độ `level` (B1 = A1 + A2 + B1)."""
    upto = LEVELS.index(level) if level in LEVELS else 1
    out, count = [], {}
    for line in GRAMMAR_TEXT.strip().splitlines():
        lv, mau, nghia = line.split("|")
        count[lv] = count.get(lv, 0) + 1
        if LEVELS.index(lv) <= upto:
            out.append({"id": "cefr:%s-%02d" % (lv, count[lv]), "mau": mau, "nghia": nghia, "bai": "CEFR " + lv})
    return out


# ---------------------------------------------------------------------------
# Phạm vi: từ tiếng Anh của deck đang xem
# ---------------------------------------------------------------------------

_KEY_BAD = re.compile(r"[\[\]{}|<>]")


def deck_word(raw: Any) -> str:
    """Từ / cụm từ của deck dùng làm từ gốc khi tra (bỏ HTML, IPA đã tách sẵn ở garden_core)."""
    w = ai._plain(raw, 60)
    w = _KEY_BAD.sub("", w).strip(" .;:")
    if not w or w == "?" or not re.search(r"[A-Za-z]", w) or len(w.split()) > 6 or len(w) > 50:
        return ""
    if re.search(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]", w):
        return ""
    return w


def _ipa(raw: Any) -> str:
    s = ai._plain(raw, 60)
    if not s:
        return ""
    if not (text.looks_ipa(s) or (s.startswith("/") and s.endswith("/")) or (s.startswith("[") and s.endswith("]"))):
        return ""
    s = s.strip("/[] ")
    return "/%s/" % s if s else ""


def scope_from_plants(plants: list[dict[str, Any]], level: str, max_words: int = 1200) -> dict[str, Any]:
    """Phạm vi từ cây tiếng Anh của deck đang xem: [từ, IPA, nghĩa, "deck"]."""
    level = level if level in LEVELS else DEFAULT_LEVEL
    studied, fresh, focus, weak = [], [], [], []
    seen: set[str] = set()
    for p in plants:
        if (p.get("lang") or "ja") != "en" or (p.get("kind") or "vocab") not in ("vocab", "other"):
            continue
        word = deck_word(p.get("word"))
        meaning = ai._plain(p.get("meaning"), 120)
        if not word or not meaning:
            continue
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        row = [word, _ipa(p.get("reading")), meaning, "deck"]
        learned = (p.get("stage") or 0) >= 1 or p.get("stability") is not None
        (studied if learned else fresh).append(row)
        if learned and (p.get("wilted") or p.get("thirsty")):
            weak.append(word)
        elif learned and (p.get("stage") or 0) == 1:
            focus.append(word)
    vocab = studied[:max_words]
    if len(vocab) < 30:              # mới bắt đầu học: cho dùng cả từ chưa ôn
        vocab += fresh[:max(0, 200 - len(vocab))]
    grammar = builtin_grammar(level)
    return {
        "lang": "en", "nguon": "deck", "trinh_do": level, "nen_tang": "A1",
        "tu_vung": vocab, "ngu_phap": grammar,
        # mẫu câu trọng tâm: các mẫu đúng trình độ đang chọn (mẫu thấp hơn để ôn)
        "trong_tam": {"tu": (weak[:6] + focus)[:24], "ngu_phap": [g["id"] for g in grammar if g["bai"] == "CEFR " + level]},
        "sap_quen": weak[:12], "loi_sai": [], "sach": {"deck": "deck đang học"},
        "so_tu_da_hoc": len(studied),
    }


def kho_ok(item: dict[str, Any]) -> bool:
    """1.19.1: note dùng được cho kho từ của báo tiếng Anh."""
    return bool(deck_word(item.get("word")))


def scope_from_pick(pk: dict[str, Any], level: str) -> dict[str, Any]:
    """1.19.1: phạm vi từ words_core.pick — kho ≤ 100 từ cho lời nhắc, mọi từ đã học để kiểm tra / nối tra từ."""
    level = level if level in LEVELS else DEFAULT_LEVEL

    def row(it: dict[str, Any]) -> list[str] | None:
        word = deck_word(it.get("word"))
        meaning = ai._plain(it.get("meaning"), 120)
        return [word, _ipa(it.get("reading")), meaning, "deck"] if word and meaning else None

    kho, due = [], []
    for it in pk.get("kho", []):
        r = row(it)
        if r:
            kho.append(r)
            if it.get("due"):
                due.append(r[0])
    vocab, seen = [], set()
    for it in list(pk.get("kho", [])) + list(pk.get("all", [])):
        r = row(it)
        if r and r[0].lower() not in seen:
            seen.add(r[0].lower())
            vocab.append(r)
    grammar = builtin_grammar(level)
    decks = [d for d in pk.get("decks", []) if isinstance(d, str)]
    return {
        "lang": "en", "nguon": "deck", "trinh_do": level, "nen_tang": "A1",
        "tu_vung": vocab, "kho": kho, "ngu_phap": grammar,
        "trong_tam": {"tu": due[:ai.FOCUS_WORDS], "ngu_phap": [g["id"] for g in grammar if g["bai"] == "CEFR " + level]},
        "can_on": due, "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(vocab)),
    }


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    """[số từ phải ôn có trong bài (kể cả dạng biến đổi), số từ phải ôn trong kho]."""
    due = [w for w in scope.get("can_on", []) if w]
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    texts, _t, _w = _issue_texts(raw)
    used = deck_used([paper.surface(t) for t in texts], LinkIndex(scope))
    return [len(used & set(due)), len(due)]


# ---------------------------------------------------------------------------
# Máy tự nối tra từ: từ trong bài → từ gốc của deck
# ---------------------------------------------------------------------------

TOKEN_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")
STOP = {"a", "an", "the", "be", "to", "of", "and", "or", "in", "on", "at", "for", "with", "i", "you", "he", "she",
        "it", "we", "they", "is", "am", "are", "this", "that", "my", "your"}
# dạng trông như biến đổi nhưng là từ khác (news ≠ new, evening ≠ even, corner ≠ corn…)
NOT_DERIVED = {
    "news", "clothes", "physics", "series", "species", "always", "politics", "economics", "mathematics", "lens",
    "perhaps", "evening", "morning", "during", "wedding", "earring", "herring", "nothing", "something", "anything",
    "everything", "ceiling", "pudding", "bed", "feed", "need", "seed", "weed", "deed", "shed", "red", "fed", "wed",
    "forest", "honest", "interest", "harvest", "modest", "request", "suggest", "contest", "protest", "breakfast",
    "corner", "flower", "power", "tower", "number", "summer", "hammer", "butter", "letter", "matter", "dinner",
    "mother", "brother", "father", "sister", "weather", "feather", "leather", "water", "paper", "after", "over",
    "under", "never", "ever", "river", "silver", "finger", "ginger", "danger", "hunger", "manners", "customs",
    "glasses", "wings", "pants", "goods", "kings", "rings", "things", "scissors",
}
NAMES = {"stackchan", "hana", "linh", "lin", "oakley", "ben", "kotoba", "mayor"}      # nhân vật / tên riêng của báo: không tra
# tính từ một âm tiết hay gặp (so sánh hơn / nhất -er / -est); tính từ tận cùng -y thì luôn nhận -ier / -iest
COMMON_ADJ = set("""big small tall short long old young new fast slow hot cold warm cool high low cheap rich poor strong
weak quick quiet loud late near nice fine large wide safe close brave wise clean clear dark light bright deep fresh full
great hard soft kind sweet thick thin wet dry sad fat flat smart sharp tough wild calm neat proud plain rare ripe rude
sure true pure simple gentle narrow clever deep loose tight firm fair few green black white young cute""".split())
BE_FORMS = {"am", "is", "are", "was", "were", "been", "being"}


def _rev_irregular() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for base, forms in text.IRREGULAR_VERBS.items():
        for f in forms:
            out.setdefault(f, []).append(base)
    for base, pl in text.IRREGULAR_PLURAL.items():
        out.setdefault(pl, []).append(base)
    for base, forms in text.IRREGULAR_ADJ.items():
        for f in forms:
            out.setdefault(f, []).append(base)
    out.setdefault("has", []).append("have")
    out.setdefault("does", []).append("do")
    for f in BE_FORMS:
        out.setdefault(f, []).append("be")
    return out


REV_IRR = _rev_irregular()


def _lemmas(t: str) -> list[tuple[str, str]]:
    """Các từ gốc có thể của một chữ trong bài (chữ thường): (gốc, kiểu biến đổi)."""
    out: list[tuple[str, str]] = [(b, "irr") for b in REV_IRR.get(t, [])]

    def add(x: str, kind: str) -> None:
        if x and (x, kind) not in out:
            out.append((x, kind))
    if t.endswith("ies") and len(t) > 4:
        add(t[:-3] + "y", "s")
    if t.endswith("ves"):
        add(t[:-3] + "f", "s")
        add(t[:-3] + "fe", "s")
    if t.endswith("es"):
        add(t[:-2], "s")
    if t.endswith("s") and not t.endswith(("ss", "us", "is")):
        add(t[:-1], "s")
    if t.endswith("ied"):
        add(t[:-3] + "y", "ed")
    if t.endswith("ed"):
        add(t[:-2], "ed")
        add(t[:-1], "ed")
        if len(t) > 4 and t[-3] == t[-4]:
            add(t[:-3], "ed")
    if t.endswith("ying"):
        add(t[:-4] + "ie", "ing")
    if t.endswith("ing"):
        b = t[:-3]
        add(b, "ing")
        add(b + "e", "ing")
        if len(b) > 2 and b[-1] == b[-2]:
            add(b[:-1], "ing")
    for suf in ("iest", "ier"):
        if t.endswith(suf):
            add(t[:-len(suf)] + "y", "cmp")
    for suf in ("est", "er"):
        if t.endswith(suf):
            b = t[:-len(suf)]
            add(b, "cmp")
            add(b + "e", "cmp")
            if len(b) > 2 and b[-1] == b[-2]:
                add(b[:-1], "cmp")
    return out


def _allowed(t: str, lemma: str, kind: str) -> bool:
    if kind == "irr":
        return True
    if t in NOT_DERIVED or lemma in STOP:
        return False
    irregular = lemma in text.IRREGULAR_VERBS
    if len(lemma) < 3 and not irregular:
        return False
    if kind == "ed" and irregular:          # bed ≠ be + d, seed ≠ see + d
        return False
    if kind == "cmp":
        if irregular or not (lemma in COMMON_ADJ or (lemma.endswith("y") and t.endswith(("ier", "iest")))):
            return False
    return t in text.inflect(lemma)


def _norm_phrase(s: str) -> str:
    return " ".join(s.lower().replace("’", "'").replace("-", " ").split())


class LinkIndex:
    """Chỉ mục từ của deck (+ từ mới của số báo) để nối chữ trong bài với từ gốc."""

    def __init__(self, scope: dict[str, Any], new_words: list[str] | None = None) -> None:
        self.single: dict[str, str] = {}
        self.phrase: dict[str, str] = {}
        self.maxn = 1
        self.deck_keys: set[str] = set()
        for row in scope.get("tu_vung", []):
            if row and row[0]:
                self._add(row[0], row[0])
                self.deck_keys.add(row[0])
        for w in new_words or []:
            self._add(w, w)

    def _add(self, word: str, key: str) -> None:
        for alt in text.en_alternatives(word):
            a = _norm_phrase(alt)
            parts = a.split()
            if not parts or not all(re.match(r"^[a-z']+$", p) for p in parts):
                continue
            if len(parts) == 1:
                self.single.setdefault(a, key)
                continue
            self.maxn = min(6, max(self.maxn, len(parts)))
            self.phrase.setdefault(a, key)
            for f in text.en_forms(alt):
                self.phrase.setdefault(_norm_phrase(f), key)

    def lookup(self, tok: str) -> str | None:
        t = tok.lower().replace("’", "'")
        if t.endswith("'s"):
            t = t[:-2]
        if t in STOP or t in NAMES:
            return None
        if t in self.single:
            return self.single[t]
        for lemma, kind in _lemmas(t):
            if lemma in self.single and lemma not in STOP and _allowed(t, lemma, kind):
                return self.single[lemma]
        return None

    def spans(self, s: str, title: bool = False) -> list[tuple[int, int, str]]:
        """Các đoạn (đầu, cuối, từ gốc) trong chuỗi chữ trơn s, không chồng nhau, cụm dài trước."""
        toks = [(m.start(), m.end(), m.group(0)) for m in TOKEN_RE.finditer(s)]
        out: list[tuple[int, int, str]] = []
        i = 0
        while i < len(toks):
            hit = None
            for n in range(min(self.maxn, len(toks) - i), 1, -1):
                part = toks[i:i + n]
                if any(not re.match(r"^[\s\-]+$", s[part[k][1]:part[k + 1][0]]) for k in range(n - 1)):
                    continue
                key = self.phrase.get(_norm_phrase(" ".join(p[2] for p in part)))
                if key:
                    hit = (part[0][0], part[-1][1], key, n)
                    break
            if hit:
                out.append(hit[:3])
                i += hit[3]
                continue
            st, en, tok = toks[i]
            key = self.lookup(tok)
            if key and tok[:1].isupper() and not title and not key[:1].isupper() and not _sentence_start(s, st):
                key = None           # chữ viết hoa giữa câu: tên riêng (Mrs. Rose, The Kettle Café…)
            if key:
                out.append((st, en, key))
            i += 1
        return out


def _sentence_start(s: str, pos: int) -> bool:
    j = pos - 1
    while j >= 0 and s[j] in " \t\"“‘'(◆":
        j -= 1
    if j >= 0 and s[j] == ".":
        prev = re.findall(r"[A-Za-z]+$", s[:j])
        if prev and prev[-1].lower() in ABBR:      # Mrs. Rose: chữ sau Mr. / Mrs. / Dr. không phải đầu câu
            return False
    return j < 0 or s[j] in ".!?:\n"


def _apply(s: str, spans: list[tuple[int, int, str]]) -> str:
    out, last = [], 0
    for st, en, key in sorted(spans):
        out.append(s[last:st])
        out.append("{%s||%s}" % (s[st:en], key))
        last = en
    out.append(s[last:])
    return "".join(out)


def link_texts(texts: list[str], titles: set[int], index: LinkIndex, first_keys: list[str],
               cap: int = LINK_MAX) -> list[str]:
    """Nối tra từ cho phần bài: mỗi từ gốc một chỗ (lần đầu xuất hiện); từ mới + từ trọng tâm trước, tối đa `cap`."""
    found: dict[str, tuple[int, int, int, int]] = {}      # từ gốc → (thứ tự, chuỗi số, đầu, cuối)
    order = 0
    for ti, s in enumerate(texts):
        for st, en, key in index.spans(s, ti in titles):
            if key not in found:
                found[key] = (order, ti, st, en)
            order += 1
    pri = {k: i for i, k in enumerate(first_keys)}
    chosen = sorted(found.items(), key=lambda kv: (pri.get(kv[0], len(pri)), kv[1][0]))[:cap]
    per: dict[int, list[tuple[int, int, str]]] = {}
    for key, (_o, ti, st, en) in chosen:
        per.setdefault(ti, []).append((st, en, key))
    return [_apply(s, per.get(ti, [])) for ti, s in enumerate(texts)]


def deck_used(texts: list[str], index: LinkIndex) -> set[str]:
    """Từ của deck (không tính từ mới) có trong các chuỗi chữ trơn."""
    out: set[str] = set()
    for s in texts:
        out.update(k for _a, _b, k in index.spans(s) if k in index.deck_keys)
    return out


# ---------------------------------------------------------------------------
# Làm sạch / sửa máy móc
# ---------------------------------------------------------------------------

VI_ONLY = set("ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹĩũõãẠẢẤẦẨẪẬẮẰẲẴẶĐẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸĨŨÕÃƠƯĂ")
VI_MARK_RE = re.compile(r"[àáâãèéêìíòóôõùúýăđĩũơưạ-ỹÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯẠ-Ỹ]")
CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff]")
EN_OK_RE = re.compile(r"[A-Za-z0-9\s.,!?;:'\"()\-–—…%&/+°£€$@#=~◆“”‘’éèêëàâäïîôöüûçñÉÈÀÇ]")


MARKUP_RE = re.compile(r"[\[\]{}|*]|(?<!\w)_|_(?!\w)")


def clean_en(s: Any) -> Any:
    """Chuỗi tiếng Anh: bỏ mọi đánh dấu (máy nối tra từ lại sau), bỏ markdown, gộp khoảng trắng."""
    if not isinstance(s, str):
        return s
    s = paper.surface(s)
    s = s.replace("[", "(").replace("]", ")").replace("{", "(").replace("}", ")").replace("|", "/")
    s = re.sub(r"\*+|(?<!\w)_+|_+(?!\w)", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_vi(s: Any) -> Any:
    if not isinstance(s, str):
        return s
    return re.sub(r"\s+", " ", s.replace("{", "").replace("}", "").replace("|", "/")).strip()


def words(s: str) -> list[str]:
    return text.en_words(paper.surface(s or ""))


ABBR = {"mr", "mrs", "ms", "dr", "st", "no", "vs", "etc", "jr", "sr", "mt"}


def sentences(s: str) -> list[str]:
    """Tách đoạn văn (chữ trơn) thành câu: sau . ! ? (kể cả có ngoặc kép đóng), trừ Mr. / Mrs. / Dr.…"""
    out, start = [], 0
    for m in re.finditer(r"[.!?…]+[\"”’)]*\s+", s):
        before = re.findall(r"[A-Za-z]+(?=\.$)", s[start:m.start() + 1])
        if before and before[-1].lower() in ABBR:
            continue
        out.append(s[start:m.end()].strip())
        start = m.end()
    if s[start:].strip():
        out.append(s[start:].strip())
    return [x for x in out if x]


def _issue_texts(raw: dict[str, Any]) -> tuple[list[str], set[int], list[tuple[int, str | int]]]:
    """Tiêu đề + đoạn văn của các bài, vị trí chuỗi là tiêu đề, và chỗ để ghi lại."""
    texts: list[str] = []
    titles: set[int] = set()
    where: list[tuple[int, str | int]] = []
    for bi, b in enumerate(raw.get("bai", []) if isinstance(raw.get("bai"), list) else []):
        if not isinstance(b, dict):
            continue
        if isinstance(b.get("tieu_de"), str):
            titles.add(len(texts))
            texts.append(b["tieu_de"])
            where.append((bi, "tieu_de"))
        for j, p in enumerate(b.get("doan") or [] if isinstance(b.get("doan"), list) else []):
            if isinstance(p, str):
                texts.append(p)
                where.append((bi, j))
    return texts, titles, where


def _paragraphs(raw: dict[str, Any]) -> list[str]:
    return [p for b in (raw.get("bai") or []) if isinstance(b, dict)
            for p in (b.get("doan") or []) if isinstance(p, str)]


def _word_seq(texts: list[str]) -> str:
    return " " + " ".join(" ".join(words(t)) for t in texts) + " "


def in_text(sentence: str, raw: dict[str, Any]) -> bool:
    w = " ".join(words(sentence))
    return bool(w) and (" " + w + " ") in _word_seq(_paragraphs(raw))


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: bỏ đánh dấu / markdown, bỏ từ mới đã có trong deck, chọn lại câu chép không có trong bài,
    sửa id mẫu câu; rồi máy nối tra từ (từ mới + từ trọng tâm trước)."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL

    def en(v: Any) -> Any:
        if isinstance(v, str) and MARKUP_RE.search(paper.surface(v)):
            notes.append("bỏ ký tự đánh dấu / markdown trong bài")
        return clean_en(v)
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            b["tieu_de"] = en(b.get("tieu_de"))
            if isinstance(b.get("doan"), list):
                b["doan"] = [en(p) for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
            if isinstance(b.get("ky"), str) and b["ky"].isdigit():
                b["ky"] = int(b["ky"])
            if isinstance(b.get("ky_truoc"), str):
                b["ky_truoc"] = clean_vi(b["ky_truoc"])
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            q["hoi"] = en(q.get("hoi"))
            if isinstance(q.get("chon"), list):
                q["chon"] = [en(o) for o in q["chon"]]
            if isinstance(q.get("dung"), str) and q["dung"].isdigit():
                q["dung"] = int(q["dung"])
            q["giai_thich"] = clean_vi(q.get("giai_thich"))
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            c["cau"] = en(c.get("cau"))
            extra = c.get("them_dap_an") if isinstance(c.get("them_dap_an"), list) else []
            c["them_dap_an"] = [en(x) for x in extra if isinstance(x, str) and x.strip()]
    for k in ("tom_tat", "tom_tat_truyen"):
        if isinstance(raw.get(k), str):
            raw[k] = clean_vi(raw[k])
    # từ mới
    deck = {r[0].lower() for r in scope.get("tu_vung", []) if r and r[0]}
    tm = [w for w in raw.get("tu_moi", []) if isinstance(w, dict) and isinstance(w.get("w"), str) and w["w"].strip()] \
        if isinstance(raw.get("tu_moi"), list) else []
    tm2 = []
    for w in tm:
        w["w"] = deck_word(w["w"]) or clean_en(w["w"])
        w["r"] = _ipa(w.get("r")) if isinstance(w.get("r"), str) else ""
        w["m"] = clean_vi(w.get("m")) if isinstance(w.get("m"), str) else ""
        if w["w"].lower() in deck:
            notes.append("bỏ khai báo từ mới đã có trong deck")
        elif w["w"]:
            tm2.append(w)
    tm2 = tm2[:int(opts.get("max_new", 3))]
    # câu chép chính tả + mẫu câu
    _fix_dictation(raw, scope, opts, notes, level)
    if isinstance(raw.get("mau_cau"), list):
        ids = {g["id"] for g in scope.get("ngu_phap", [])}
        mc = [g for g in raw["mau_cau"] if isinstance(g, str)]
        fixed = [g if g in ids else ai._match_grammar(g, scope) for g in mc]
        fixed = [g for g in dict.fromkeys(fixed) if g]
        if fixed != mc:
            notes.append("sửa / bỏ id mẫu câu không có trong danh sách")
        raw["mau_cau"] = fixed
    # máy nối tra từ
    texts, titles, where = _issue_texts(raw)
    new_index = LinkIndex({"tu_vung": []}, [w["w"] for w in tm2])
    used_new = {k for t in texts for _a, _b, k in new_index.spans(t, True)}
    tm3 = [w for w in tm2 if w["w"] in used_new]
    if len(tm3) != len(tm2):
        notes.append("bỏ từ mới khai báo nhưng không dùng")
    raw["tu_moi"] = tm3
    index = LinkIndex(scope, [w["w"] for w in tm3])
    first = [w["w"] for w in tm3] + list(scope.get("loi_sai", [])) + list(scope.get("sap_quen", [])) + \
        list(scope.get("trong_tam", {}).get("tu", []))
    linked = link_texts(texts, titles, index, list(dict.fromkeys(first)))
    bai = raw.get("bai")
    for (bi, slot), s in zip(where, linked):
        if slot == "tieu_de":
            bai[bi]["tieu_de"] = s
        else:
            bai[bi]["doan"][slot] = s
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict) and isinstance(c.get("cau"), str):
            c["cau"] = _apply(c["cau"], index.spans(c["cau"]))
    return raw, list(dict.fromkeys(notes))


def _fix_dictation(raw: dict[str, Any], scope: dict[str, Any], opts: dict[str, Any], notes: list[str],
                   level: str) -> None:
    """Câu chép phải chép nguyên văn một câu trong bài; không có thì máy chọn câu trọn vẹn trong bài
    (độ dài hợp trình độ, có từ của deck), khỏi gọi Gemini."""
    if not isinstance(raw.get("bai"), list):
        return
    lo, hi = DICT_WORDS.get(level, (4, 14))
    cts = raw.get("chinh_ta") if isinstance(raw.get("chinh_ta"), list) else []
    keep = [c for c in cts if isinstance(c, dict) and isinstance(c.get("cau"), str) and in_text(c["cau"], raw)
            and lo <= len(words(c["cau"])) <= hi + 4]
    want = 1 if opts.get("short") else 2
    if len(keep) >= want and len(keep) == len(cts):
        return
    have = {" ".join(words(c["cau"])) for c in keep}
    index = LinkIndex(scope)
    cands = []
    for p in _paragraphs(raw):
        for sent in sentences(p):
            s = sent.lstrip("◆ ").strip()
            n = len(words(s))
            if not lo <= n <= hi or " ".join(words(s)) in have:
                continue
            if s.count('"') % 2 or s.count("“") != s.count("”"):
                continue
            names = len(_proper_names(s))      # tên riêng (Linh, Kotoba Village…) nghe khó đoán cách viết → để sau
            cands.append((names, -len(deck_used([s], index)), -n, s))
    cands.sort()
    for _p, _u, _n, s in cands:
        if len(keep) >= max(want, min(3, len(cts))):
            break
        keep.append({"cau": s, "them_dap_an": []})
        have.add(" ".join(words(s)))
    notes.append("chọn lại câu chép chính tả từ bài (câu cũ không chép nguyên văn)")
    raw["chinh_ta"] = keep[:4]


def _proper_names(s: str) -> list[str]:
    """Chữ viết hoa không đứng đầu câu (tên người / nơi chốn), cả tên nhân vật của báo."""
    out = []
    for m in TOKEN_RE.finditer(s):
        t = m.group(0)
        if (t[:1].isupper() and t != "I" and not _sentence_start(s, m.start())) or t.lower() in NAMES:
            out.append(t)
    return out


def plain_issue(raw: Any) -> Any:
    """Bản không có đánh dấu tra từ để gửi cho Gemini sửa / soát (máy nối lại sau)."""
    if not isinstance(raw, dict):
        return raw
    out = copy.deepcopy(raw)
    for b in out.get("bai", []) if isinstance(out.get("bai"), list) else []:
        if isinstance(b, dict):
            if isinstance(b.get("tieu_de"), str):
                b["tieu_de"] = paper.surface(b["tieu_de"])
            if isinstance(b.get("doan"), list):
                b["doan"] = [paper.surface(p) if isinstance(p, str) else p for p in b["doan"]]
    for c in out.get("chinh_ta", []) if isinstance(out.get("chinh_ta"), list) else []:
        if isinstance(c, dict) and isinstance(c.get("cau"), str):
            c["cau"] = paper.surface(c["cau"])
    return out


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

def check_en(rep: Any, where: str, value: Any, ctx: dict[str, Any]) -> None:
    """Một chuỗi tiếng Anh (có thể có đánh dấu tra từ của máy)."""
    if not isinstance(value, str) or not value.strip():
        rep.err(where, "phải là chuỗi tiếng Anh không rỗng")
        return
    for t in paper.tokenize(value):
        if t[0] == "plain" and any(c in t[1] for c in "{}[]|"):
            rep.err(where, "có ký tự đánh dấu lạ gần: …%s…" % t[1][:24])
        if t[0] == "word":
            ctx["used"].add(t[3])
            if t[3] not in ctx["keys"]:
                rep.err(where, '"%s" không phải từ của deck hay từ mới' % t[3])
    s = paper.surface(value)
    if CJK_RE.search(s):
        rep.err(where, "có chữ Nhật / Trung / Hàn trong phần tiếng Anh")
    vi = sorted({c for c in s if c in VI_ONLY})
    if vi:
        rep.err(where, 'có chữ tiếng Việt (%s) trong phần tiếng Anh: "%s…" — viết hoàn toàn bằng tiếng Anh'
                % ("".join(vi[:5]), s[:40]))
    odd = sorted({c for c in s if not EN_OK_RE.match(c) and c not in VI_ONLY and not CJK_RE.match(c)})
    if odd:
        rep.err(where, "có ký tự lạ %s" % "".join(odd[:8]))
    if s and not re.search(r"[A-Za-z]", s):
        rep.err(where, "không có chữ tiếng Anh nào")


def check_vi(rep: Any, where: str, value: Any, required: bool = True) -> None:
    if not isinstance(value, str) or not value.strip():
        if required:
            rep.err(where, "cần một câu tiếng Việt")
        return
    if len(value.strip()) >= 15 and not VI_MARK_RE.search(value):
        rep.err(where, "phải viết bằng tiếng Việt (có dấu), không viết tiếng Anh")
    if any(c in value for c in "{}|"):
        rep.err(where, "phần tiếng Việt không dùng ký tự { } |")


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Anh. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
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
            rep.err(where, "cần có w (từ tiếng Anh) và m (nghĩa tiếng Việt)")
            continue
        if not re.search(r"[A-Za-z]", w["w"]) or CJK_RE.search(w["w"]):
            rep.err(where, "w phải là từ tiếng Anh")
        check_vi(rep, where + ".m", w.get("m"))
        new_keys.add(w["w"])
    deck_keys = {r[0] for r in scope.get("tu_vung", []) if r and r[0]}
    ctx = {"keys": deck_keys | new_keys, "used": set()}

    bai = raw.get("bai")
    lo_n, hi_n = (1, 2) if short else (2, 4) if opts.get("no_story") else (3, 5)    # 1.23: Truyện: Tắt → 2 bài
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
        check_en(rep, where + ".tieu_de", b.get("tieu_de"), ctx)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 6:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 6)")
        for j, p in enumerate(doan):
            check_en(rep, "%s.doan[%d]" % (where, j), p, ctx)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else len(words(p))
                sents += [len(words(x)) for x in sentences(paper.surface(p))]
                if len(p) > 1500:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = LENGTH[level]
    if short:
        lo, hi = lo // 3, hi // 2
    if opts.get("story_plain") and story_seen and not short:     # 1.23: truyện viết sẵn không tính vào độ dài
        lo, hi = int(lo * 0.4), int(hi * 0.75)
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d từ), cần khoảng %d–%d từ" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d từ), cần khoảng %d–%d từ" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d từ, nên trong khoảng %d–%d" % (total, lo, hi))
    if sents:
        avg = sum(sents) / len(sents)
        if avg > SENT_WORDS[level] * 1.35:
            rep.warn("bai", "câu hơi dài so với trình độ %s (trung bình %.0f từ / câu, nên ≤ %d): tách câu dài thành câu ngắn"
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
        check_en(rep, where + ".hoi", q.get("hoi"), ctx)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_en(rep, "%s.chon[%d]" % (where, j), o, ctx)
        norm = [" ".join(words(o)) for o in chon if isinstance(o, str)]
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
    paras = [paper.surface(p) for p in _paragraphs(raw)]
    for i, c in enumerate(ct):
        where = "chinh_ta[%d]" % i
        if not isinstance(c, dict):
            rep.err(where, "phải là object")
            continue
        check_en(rep, where + ".cau", c.get("cau"), ctx)
        if isinstance(c.get("cau"), str):
            n = len(words(c["cau"]))
            if not dlo <= n <= dhi + 4:
                rep.err(where, "câu chép chính tả cần %d–%d từ (đang %d)" % (dlo, dhi, n))
            if n and not in_text(c["cau"], raw):
                rep.err(where, "câu chép chính tả phải chép nguyên văn một câu trong bài")
            elif n:
                sf = paper.surface(c["cau"]).strip()
                if not any(sf in p for p in paras):
                    rep.warn(where, "câu chép nên là MỘT câu trọn vẹn chép đúng cả dấu câu: %s" % sf[:40])
                names = _proper_names(sf)
                if names:
                    rep.warn(where, "câu chép có tên riêng %s (nghe khó đoán cách viết): nên chọn câu khác trong bài"
                             % ", ".join(names[:3]))
        extra = c.get("them_dap_an", [])
        if not isinstance(extra, list) or not all(isinstance(x, str) for x in extra):
            rep.err(where + ".them_dap_an", "phải là danh sách chuỗi")
        else:
            for x in extra:
                if CJK_RE.search(x) or any(ch in x for ch in "{}[]|") or any(ch in VI_ONLY for ch in x):
                    rep.err(where + ".them_dap_an", "chỉ ghi cách viết khác bằng tiếng Anh, không đánh dấu")

    mc = raw.get("mau_cau")
    if not isinstance(mc, list):
        rep.err("mau_cau", "phải là danh sách id mẫu câu")
    elif grammar_ids and not mc:
        rep.warn("mau_cau", "chưa ghi id mẫu câu nhấn mạnh (lấy đúng id trong danh sách ngữ pháp)")
    else:
        for g in mc:
            if g not in grammar_ids:
                rep.err("mau_cau", 'id "%s" không có trong danh sách ngữ pháp' % g)
    for k in new_keys:
        if k not in ctx["used"]:
            rep.err("tu_moi", '"%s" khai báo là từ mới nhưng không có trong bài' % k)
    check_vi(rep, "tom_tat", raw.get("tom_tat"))
    if story_seen and not short:
        check_vi(rep, "tom_tat_truyen", raw.get("tom_tat_truyen"))
    # từ của deck có được dùng không (máy tự tìm theo dạng gốc)
    index = LinkIndex(scope)
    plain = [paper.surface(b.get("tieu_de") or "") for b in bai if isinstance(b, dict)] + paras
    used = deck_used(plain, index)
    n_deck = len(scope.get("tu_vung", []))
    need = 2 if short else 4
    if n_deck >= 20 and len(used) < need:
        rep.err("bai", "chỉ dùng %d từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC; viết lại vài câu để dùng thêm ít nhất 8 từ "
                "trong danh sách (đúng nghĩa đã ghi)" % len(used))
    elif n_deck >= 20 and not short and len(used) < 8:
        rep.warn("bai", "mới dùng %d từ của deck; nên dùng 8–20 từ trong danh sách từ vựng" % len(used))
    focus = [w for w in scope.get("trong_tam", {}).get("tu", []) + scope.get("sap_quen", []) if w]
    if focus and not short and scope.get("kho"):
        if len(used & set(focus)) < min(4, len(focus)):
            rep.warn("bai", "mới dùng %d từ TRỌNG TÂM; nếu hợp thì đưa thêm vài từ (%s) vào bài, đừng ép câu"
                     % (len(used & set(focus)), ", ".join(focus[:8])))
    elif focus and not short and not used & set(focus):
        rep.warn("bai", "chưa dùng từ TRỌNG TÂM nào (%s): đưa 2–3 từ này vào bài" % ", ".join(focus[:6]))
    if level in ("A1", "A2"):
        new_idx = LinkIndex({"tu_vung": []}, list(new_keys))
        hard = []
        for s in plain:
            for m in TOKEN_RE.finditer(s):
                t = re.sub(r"['’]s$", "", m.group(0))
                if len(t) >= 11 and t[:1].islower() and not index.lookup(t) and not new_idx.lookup(t) \
                        and t not in hard:
                    hard.append(t)
        if hard:
            rep.warn("bai", "từ dài / khó hơn trình độ %s (không có trong deck): %s — đổi từ dễ hơn hoặc khai báo tu_moi"
                     % (level, ", ".join(hard[:8])))
    return rep


def link_count(raw: Any) -> int:
    if not isinstance(raw, dict):
        return 0
    texts, _t, _w = _issue_texts(raw)
    return sum(len(paper.keys(t)) for t in texts)


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    """Số từ của deck có trong bài (để so bản soát lần 2 với bản trước)."""
    if not isinstance(raw, dict):
        return 0
    texts, _t, _w = _issue_texts(raw)
    return len(deck_used([paper.surface(t) for t in texts], LinkIndex(scope)))


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

# 1.25.2 "Một làng, một truyện": cùng làng, cùng truyện với báo tiếng Nhật / tiếng Việt (tên theo story_core.NAMES)
STORY_SETUP = """Truyện dài kỳ "The Little Inn of Kotoba Village" (bản tiếng Anh của truyện chung của làng). Kotoba Village
là làng nhỏ cạnh khu vườn Kotoba Farm, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán, tên viết đúng như sau):
- StackChan: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ, nói câu ngắn, vui vẻ.
- Hana: bà chủ quán trọ "the Kotoba Inn", khoảng 30 tuổi, chu đáo, lịch sự với khách.
- Lin: cô gái Việt Nam mới đến làng, làm ở the Kotoba Inn, đang học tiếng của làng, đôi khi nói nhầm nhưng rất cố gắng.
- the mayor: trưởng làng, hiền, thích kể chuyện ngày xưa.
- the postman: bác đưa thư vui tính, biết mọi tin trong làng.
Mỗi kỳ là một tình huống nhỏ trong ngày ở quán hoặc trong làng, kết hơi bỏ ngỏ.
Lời thoại để trong ngoặc kép "…" và ghi rõ ai nói (said Lin, Hana asked…)."""

RULES = """QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Anh: không chữ Việt, không chữ Nhật /
  Trung / Hàn, không phiên âm trong bài.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được chia động từ, số nhiều, so sánh (go → went, city → cities).
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU.
- Tên riêng viết đúng như phần nhân vật. Dấu câu, ngoặc kép như tiếng Anh thông thường."""


def season_text(date: datetime.date) -> str:
    m = date.month
    s = "xuân" if m in (3, 4, 5) else "hạ" if m in (6, 7, 8) else "thu" if m in (9, 10, 11) else "đông"
    return "%s, ngày %d/%d/%d, mùa %s" % (date.strftime("%A"), date.day, date.month, date.year, s)


def system_prompt(level: str) -> str:
    level = level if level in LEVELS else DEFAULT_LEVEL
    lo, hi = LENGTH[level]
    return (
        "Bạn là người bản xứ nói tiếng Anh, viết báo làng \"%s\" (bản tiếng Anh của 畑新聞) cho người Việt Nam đang "
        "học tiếng Anh trình độ %s (CEFR).\n"
        "Viết tiếng Anh tự nhiên, đúng ngữ pháp như người bản xứ viết cho người học: câu ngắn và rõ (trung bình khoảng "
        "%d từ một câu), ấm áp, hơi hài hước; không dịch từng chữ từ tiếng Việt.\n"
        "Chỉ dùng ngữ pháp tới trình độ %s (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách "
        "từ vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.\n"
        "Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.\n"
        "Độ dài phần bài của cả số báo: %d–%d từ tiếng Anh.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (
            MASTHEAD, level, SENT_WORDS[level], level, lo, hi, RULES))


def _vocab_lines(scope: dict[str, Any], limit: int = 1500) -> str:
    """Danh sách từ gửi Gemini: "từ /IPA/ = nghĩa", từ trọng tâm / sắp quên / chép sai trước, rồi từ mới học gần đây."""
    rows = scope["kho"] if scope.get("kho") else scope.get("tu_vung", [])    # 1.19.1: chỉ gửi kho ≤ 100 từ
    first = set(scope.get("trong_tam", {}).get("tu", [])) | set(scope.get("sap_quen", [])) | set(scope.get("loi_sai", []))
    ordered = [r for r in rows if r[0] in first] + [r for r in reversed(rows) if r[0] not in first]
    return "\n".join("%s%s = %s" % (r[0], " " + r[1] if r[1] else "", r[2]) for r in ordered[:limit])


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    short = bool(opts.get("short"))
    ky = int(opts.get("ky") or 1)
    third = "thong_bao" if date.day % 2 == 0 else "cot"
    dlo, dhi = DICT_WORDS[level]
    parts = ["HÔM NAY: %s. Số báo %d.%s" % (season_text(date), int(opts.get("so") or 1),
                                           (" Thời tiết ở làng: %s." % opts["thoi_tiet"]) if opts.get("thoi_tiet") else "")]
    if short:
        parts.append(
            "ĐÂY LÀ SỐ RÚT GỌN (người học còn nhiều số chưa đọc): chỉ 1 bài loai \"tin_lang\" ngắn (2 đoạn), "
            "chinh_ta 2 câu chép nguyên văn từ bài, cau_hoi để rỗng hoặc 1 câu. KHÔNG viết truyện. "
            "Tin làng có thể nhắc nhẹ là các nhân vật đang chờ người đọc.")
    elif opts.get("no_story") or opts.get("story_plain"):
        # 1.23: Truyện: Tắt → 2 bài; truyện đã viết + biên tập sẵn → máy tự chèn làm bài thứ 2, ở đây viết 2 bài còn lại
        sp = opts.get("story_plain")
        parts.append(
            "CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ%s):\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba Village và khu vườn Kotoba Farm, 2–3 đoạn%s.\n"
            "2. loai \"%s\": %s\n"
            "Tiêu đề viết kiểu tiêu đề báo tiếng Anh, ngắn (3–8 từ).\n"
            "cau_hoi: 2–3 câu trắc nghiệm TIẾNG ANH về nội dung %s, mỗi câu đúng 3 lựa chọn tiếng Anh ngắn, CHỈ MỘT đáp "
            "án đúng, \"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" tiếng Việt chỉ "
            "ra câu nào trong bài cho biết đáp án.\n"
            "chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ %s (một câu trọn vẹn, %d–%d từ, chép đúng cả dấu câu), nên chứa từ "
            "trong danh sách từ vựng, KHÔNG có tên riêng và không phải lời thoại trong ngoặc kép; \"them_dap_an\": thường "
            "để rỗng.%s" % (
                ": máy tự chèn truyện đã viết sẵn làm bài giữa" if sp else "",
                " (đừng kể lại truyện)" if sp else "",
                third, "Notices — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng \"◆ \", tiêu đề "
                "\"Village Notices\"." if third == "thong_bao" else
                "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu \"StackChan's Corner\".",
                "CẢ SỐ (nên có 1 câu về truyện)" if sp else "bài", "bài hoặc truyện" if sp else "bài", dlo, dhi,
                ("\nĐỘ DÀI: hai bài này tổng khoảng %d–%d từ (truyện không tính).\nTRUYỆN ĐÃ VIẾT SẴN (kỳ %d, để đặt câu hỏi / câu "
                 "chép):\n%s" % (int(LENGTH[level][0] * 0.4), int(LENGTH[level][1] * 0.75), ky,
                                 json.dumps({"tieu_de": sp["tieu_de"], "doan": sp["doan"]}, ensure_ascii=False))) if sp else ""))
    else:
        parts.append(
            "CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba Village và khu vườn Kotoba Farm, dùng nhân vật của truyện, 2–3 đoạn.\n"
            "2. loai \"truyen\": kỳ %d của truyện dài kỳ, \"ky\": %d, 2–3 đoạn, kết hơi bỏ ngỏ; \"ky_truoc\": %s.\n"
            "3. loai \"%s\": %s\n"
            "Tiêu đề viết kiểu tiêu đề báo tiếng Anh, ngắn (3–8 từ).\n"
            "cau_hoi: 2–3 câu trắc nghiệm TIẾNG ANH về nội dung bài, mỗi câu đúng 3 lựa chọn tiếng Anh ngắn, CHỈ MỘT đáp "
            "án đúng, \"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" tiếng Việt chỉ "
            "ra câu nào trong bài cho biết đáp án.\n"
            "chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (một câu trọn vẹn, %d–%d từ, chép đúng cả dấu câu), nên chứa từ "
            "trong danh sách từ vựng, KHÔNG có tên riêng (tên người, tên làng, tên quán: nghe khó đoán cách viết) và không "
            "phải lời thoại trong ngoặc kép; \"them_dap_an\": cách viết khác của cả câu vẫn đúng (OK / okay…), thường để rỗng.\n"
            "tom_tat_truyen: 1 câu tiếng Việt tóm tắt kỳ %d (để kỳ sau viết tiếp)." % (
                ky, ky, "\"\" (kỳ 1)" if ky == 1 else "1 câu tiếng Việt tóm tắt kỳ %d" % (ky - 1),
                third, "Notices — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng \"◆ \", tiêu đề "
                "\"Village Notices\"." if third == "thong_bao" else
                "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu \"StackChan's Corner\".", dlo, dhi, ky))
    for extra in (ai.master_news(opts, "tiếng Anh"), ai.story_goc_text(opts, "tiếng Anh")):    # 1.25.2: tin / truyện chung
        if extra:
            parts.append(extra)
    if not short:
        parts.append("dich: mỗi bài thêm \"dich\" = bản dịch tiếng Việt TỰ NHIÊN (có dấu) của từng đoạn (cùng số phần tử "
                     "với doan; không ghi chú trong ngoặc). Người học bấm \"Dịch\" mới thấy.")
    parts.append(
        "mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất "
        "2 lần. Phần lớn là mẫu TRỌNG TÂM (đúng trình độ %s), thêm 1 mẫu thấp hơn để ôn.\n"
        "Dùng 10–20 từ khác nhau trong DANH SÁCH TỪ VỰNG ĐÃ HỌC (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa %d từ "
        "ngoài danh sách thật sự cần (w = từ tiếng Anh như viết trong bài ở dạng gốc, r = phiên âm IPA dạng /.../, "
        "m = nghĩa tiếng Việt). tom_tat: 1–2 câu tiếng Việt tóm tắt số báo." % (level, int(opts.get("max_new", 3))))
    if scope.get("khong_deck"):         # 1.25.1: không dùng deck — viết theo trình độ, Gemini tự chọn từ đáng học
        few = int(scope.get("it_tu") or 0)
        parts.append(
            ("NGƯỜI HỌC MỚI CÓ %d TỪ ĐÃ HỌC (danh sách bên dưới — dùng nếu hợp): còn lại viết" % few if few else
             "NGƯỜI HỌC CHƯA CÓ DECK (không có danh sách từ đã học): viết") +
            " bằng từ thông dụng đúng trình độ %s. Chọn 8–%d "
            "từ đáng học trong số (đúng trình độ, hợp chủ đề), khai báo trong tu_moi (w = từ ở dạng gốc, r = phiên âm IPA "
            "/…/, m = nghĩa tiếng Việt); máy tự gạch chân." % (level, int(opts.get("max_new", ai.NO_DECK_NEW))))
    tt = scope.get("trong_tam", {}).get("tu", [])
    if tt and scope.get("kho"):
        parts.append(
            "TỪ TRỌNG TÂM (người học phải ôn hôm nay): " + ", ".join(tt[:ai.FOCUS_WORDS]) + "\n"
            "Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. "
            "Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / "
            "số lượng → Village Notices hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / "
            "thời tiết → tin làng.")
    elif tt:
        parts.append("TỪ TRỌNG TÂM (mới học / sắp quên, nên dùng vài từ): " + ", ".join(tt[:30]))
    if scope.get("loi_sai"):
        parts.append("TỪ NGƯỜI HỌC HAY NGHE SAI (nên đưa vào câu chép chính tả): " + ", ".join(scope["loi_sai"][:10]))
    recent = [h for h in history[-3:] if isinstance(h, dict)]
    if recent:
        parts.append("3 SỐ GẦN NHẤT (tránh lặp lại chủ đề và mẫu câu): " +
                     "; ".join("%s: %s — %s" % (h.get("ngay"), ", ".join(h.get("mau", [])), h.get("tom_tat", "")[:80])
                               for h in recent))
    if not short and not opts.get("no_story") and not opts.get("story_plain"):
        parts.append("TRUYỆN:\n" + STORY_SETUP)
        if opts.get("tones") or opts.get("tone") in ai.story_core.TONES:      # 1.25.1: chọn nhiều chủ đề
            parts.append("CHỦ ĐỀ TRUYỆN: " + ai.story_core.tone_text(opts.get("tones") or opts.get("tone")))
        if story:
            parts.append("ĐÃ XẢY RA:\n" + "\n".join("- Kỳ %s (%s): %s" % (s.get("ky"), s.get("ngay"), s.get("tom_tat"))
                                                     for s in story[-10:]))
            if story[-1].get("nguyen_van"):     # 1.23: nguyên văn kỳ trước
                parts.append("NGUYÊN VĂN KỲ TRƯỚC (viết tiếp, không mâu thuẫn):\n" + "\n".join(story[-1]["nguyen_van"]))
        else:
            parts.append("ĐÃ XẢY RA: (chưa có kỳ nào, đây là kỳ 1: Lin đến Kotoba Village và bắt đầu làm ở the Kotoba Inn)")
    parts.append("DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:\n" + ai._grammar_lines(scope))
    if scope.get("kho") or scope.get("tu_vung"):
        parts.append("DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/ = nghĩa):\n" + _vocab_lines(scope))
    parts.append(
        "VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):\n"
        '{"loai":"tin_lang","tieu_de":"StackChan Paints the Old Bridge","doan":["Yesterday afternoon, StackChan '
        'carried a small box of paints to the old bridge. \\"I want to make it happy,\\" he said."]}')
    return "\n\n".join(parts)


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    vocab = ""
    if any("DANH SÁCH TỪ VỰNG" in e or "từ của deck" in e for e in errors):
        vocab = "\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/ = nghĩa):\n" + _vocab_lines(scope, 400)
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo tiếng Anh (JSON). Sửa ĐÚNG các lỗi này (chữ tiếng Việt / "
        "chữ Nhật trong phần tiếng Anh → viết lại bằng tiếng Anh; phần tiếng Việt → viết tiếng Việt có dấu; câu chép chính "
        "tả → chép nguyên văn một câu trong bài…), giữ nguyên phần còn lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\n"
        "LỖI:\n- " + "\n- ".join(errors[:40]) + "\n\n" + RULES + vocab +
        "\n\nSỐ BÁO:\n" + json.dumps(plain_issue(raw), ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    level = scope.get("trinh_do") if scope.get("trinh_do") in LEVELS else DEFAULT_LEVEL
    return (
        "Bạn là biên tập viên người bản xứ, soát lại số báo tiếng Anh dưới đây dành cho người Việt học tiếng Anh trình độ "
        "%s trước khi in.\nKiểm tra kỹ từng câu:\n"
        "1. Tiếng Anh có tự nhiên và đúng ngữ pháp không (thì, mạo từ a/an/the, giới từ, chia động từ, số ít / số nhiều).\n"
        "2. Ngữ pháp và độ dài câu có vượt trình độ %s không → viết lại đơn giản, tách câu dài.\n"
        "3. Từ khó hơn trình độ %s (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc "
        "khai báo trong tu_moi (kèm nghĩa tiếng Việt).\n"
        "4. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.\n"
        "5. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "6. Câu chép chính tả có chép nguyên văn một câu trong bài không.\n"
        "7. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.\n"
        "8. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (Hana là bà chủ the Kotoba Inn, Lin là nhân viên mới).\n"
        "9. Kết hợp từ tự nhiên như người bản xứ viết.\n"
        "10. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). "
        "Không có lỗi thì van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). "
        "Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết "
        "lại. \"dich\" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.\n\n%s\n\n%s"
        "DANH SÁCH NGỮ PHÁP:\n%s\n\nDANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/ = nghĩa):\n%s\n\nSỐ BÁO:\n%s" % (
            level, level, level, RULES,
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            ai._grammar_lines(scope), _vocab_lines(scope, 600), json.dumps(plain_issue(raw), ensure_ascii=False)))
