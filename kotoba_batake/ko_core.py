"""ことば畑 1.33 — tiếng Hàn cho báo tiếng Hàn: tách chữ Hangul thành chữ cái (jamo), nhận ra từ của deck trong bài khi
tiểu từ / đuôi dính vào (축제가 → 축제, 무서워서 → 무섭다), chấm chép chính tả theo cụm (chỗ cách).

Thuần Python (không import anki / aqt) để test offline. Chỉ nối tra từ khi chắc (thà bỏ sót còn hơn nối nhầm).
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any

S_BASE, L_COUNT, V_COUNT, T_COUNT = 0xAC00, 19, 21, 28
LEADS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
TAILS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
         "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]

HANGUL_RE = re.compile(r"[가-힣]")
PUNCT_RE = re.compile(r"[\s.,!?;:…·\"'“”‘’()\[\]「」『』~\-–—]+")


def is_syllable(ch: str) -> bool:
    return 0xAC00 <= ord(ch) <= 0xD7A3


def split(ch: str) -> tuple[str, str, str]:
    """Một chữ Hangul → (phụ âm đầu, nguyên âm, phụ âm cuối)."""
    i = ord(ch) - S_BASE
    return LEADS[i // (V_COUNT * T_COUNT)], VOWELS[(i % (V_COUNT * T_COUNT)) // T_COUNT], TAILS[i % T_COUNT]


def join(lead: str, vowel: str, tail: str = "") -> str:
    return chr(S_BASE + (LEADS.index(lead) * V_COUNT + VOWELS.index(vowel)) * T_COUNT + TAILS.index(tail))


def jamo(s: str) -> str:
    """Chuỗi Hangul → chuỗi chữ cái (jamo) liền nhau; ký tự khác giữ nguyên."""
    out = []
    for ch in s or "":
        if is_syllable(ch):
            out.extend(x for x in split(ch) if x)
        else:
            out.append(ch)
    return "".join(out)


# Tiểu từ / đuôi hay dính sau danh từ (gộp được 1–3 cái liền nhau: 들 + 에게 + 는, 에서 + 도…)
PARTICLES = sorted({
    "들", "이", "가", "은", "는", "을", "를", "의", "에", "에서", "에게", "에게서", "한테", "한테서", "께", "께서", "로", "으로",
    "와", "과", "랑", "이랑", "하고", "도", "만", "까지", "부터", "보다", "처럼", "마다", "이나", "나", "요", "씩", "쯤", "님",
    "이에요", "예요", "입니다", "이다", "야", "이야", "이고", "고", "이지만", "지만", "이었어요", "였어요", "이었다", "였다",
    "이었습니다", "였습니다", "이라고", "라고", "이라서", "라서", "이니까", "니까", "인", "이랑은", "으로는", "로는", "에는",
    "에서는", "에도", "에서도", "와는", "과는", "께는", "까지는", "부터는", "만은", "이요", "아", "야말로", "이네요", "네요",
    "이죠", "죠", "인가요", "인데", "인데요",
}, key=len, reverse=True)


def particle_tail(rest: str, depth: int = 0) -> bool:
    """`rest` (phần sau danh từ trong một cụm) có phải chuỗi tiểu từ / đuôi không."""
    if rest == "":
        return True
    if depth >= 3:
        return False
    return any(rest.startswith(p) and particle_tail(rest[len(p):], depth + 1) for p in PARTICLES)


def is_predicate(lemma: str) -> bool:
    """Động từ / tính từ ở dạng từ điển (kết thúc bằng 다, ≥ 2 chữ)."""
    return len(lemma) >= 2 and lemma.endswith("다") and all(is_syllable(c) for c in lemma)


# nguyên âm cuối của thân + 아 / 어 → nguyên âm gộp (가 + 아요 → 가요, 오 + 아요 → 와요, 마시 + 어요 → 마셔요, 하 → 해…)
_CONTRACT = {"ㅏ": ["ㅏ"], "ㅓ": ["ㅓ"], "ㅗ": ["ㅘ"], "ㅜ": ["ㅝ"], "ㅣ": ["ㅕ"], "ㅡ": ["ㅓ", "ㅏ"], "ㅐ": ["ㅐ"], "ㅚ": ["ㅙ"],
             "ㅔ": ["ㅔ"], "ㅕ": ["ㅕ"], "ㅟ": ["ㅟ"]}


def _stem_variants(stem: str) -> list[str]:
    """Các dạng thân hay gặp khi chia của thân `stem` (chuỗi Hangul): chính nó, thân nối 아 / 어 gộp nguyên âm (+ ㅆ quá khứ),
    bất quy tắc ㅂ (춥 → 추워), ㄷ (듣 → 들), ㅅ (낫 → 나), 르 (모르 → 몰라), ㅎ (그렇 → 그래), ㄹ rơi (살 → 사세요),
    하 → 해 / 했. Trả về các chuỗi Hangul (phần đầu của cụm phải trùng một trong số này)."""
    if not stem or not all(is_syllable(c) for c in stem):
        return []
    head, last = stem[:-1], stem[-1]
    lead, vowel, tail = split(last)
    out = {stem}
    if not tail:
        for v in _CONTRACT.get(vowel, []):
            out.add(head + join(lead, v))
            out.add(head + join(lead, v, "ㅆ"))
        if last == "하":
            out.update({head + "해", head + "했", head + "하여", head + "합"})
        if vowel == "ㅡ" and head:                    # 르 / 으 rơi: 바쁘 → 바빠, 모르 → 몰라
            pl, pv, pt = split(head[-1])
            for v in ("ㅏ", "ㅓ"):
                out.add(head + join(lead, v))
                out.add(head + join(lead, v, "ㅆ"))
            if last == "르" and not pt:
                for v in ("ㅏ", "ㅓ"):
                    out.add(head[:-1] + join(pl, pv, "ㄹ") + join("ㄹ", v))
                    out.add(head[:-1] + join(pl, pv, "ㄹ") + join("ㄹ", v, "ㅆ"))
        out.add(head + join(lead, vowel, "ㅂ"))       # 가 + ㅂ니다 → 갑니다
        out.add(head + join(lead, vowel, "ㄴ"))       # 가 + ㄴ → 간 (đã)
        out.add(head + join(lead, vowel, "ㄹ"))       # 가 + ㄹ → 갈 (sẽ)
    else:
        if tail == "ㅂ":                               # 춥다 → 추워, 무섭다 → 무서워 / 무서운
            base = head + join(lead, vowel)
            out.update({base + "워", base + "웠", base + "운", base + "울", base + "우"})
        if tail == "ㄷ":                               # 듣다 → 들어
            out.add(head + join(lead, vowel, "ㄹ"))
        if tail == "ㅅ":                               # 낫다 → 나아
            out.add(head + join(lead, vowel))
        if tail == "ㅎ":                               # 그렇다 → 그래 / 그런
            out.update({head + join(lead, "ㅐ"), head + join(lead, "ㅐ", "ㅆ"), head + join(lead, vowel, "ㄴ")})
        if tail == "ㄹ":                               # 살다 → 사세요 / 삽니다 / 사는
            out.update({head + join(lead, vowel), head + join(lead, vowel, "ㅂ"), head + join(lead, vowel, "ㄴ")})
    return sorted(out, key=len, reverse=True)


# chữ đầu của phần đuôi sau thân động / tính từ (가요, 가고, 가는, 가서, 갑니다, 가세요, 갔어요, 가면…): phần sau thân không
# bắt đầu bằng một trong các chữ này thì không phải dạng chia (가방 ≠ 가다, 사과 ≠ 사다, 오늘 ≠ 오다)
ENDING_START = set("아어았었고는은을지면니습세셨시겠기게자요던며러려도서야라냐네죠잖거군든데다")
# thân một chữ không phụ âm cuối (가, 오, 사, 하…) dễ trùng danh từ (가게, 가지, 사자, 하나…) → chỉ nhận đuôi chắc chắn
ENDING_START_SHORT = set("고는서세셨시면니겠도려러던며야라네죠잖든다요")
# thân kết thúc bằng nguyên âm: 아 / 어 / 은 / 을 / 으 đã gộp vào thân (가 + 아요 → 가요, 가 + ㄹ → 갈) nên không đứng riêng
NO_AFTER_VOWEL = set("아어았었은을으")


def predicate_match(eojeol: str, lemma: str) -> bool:
    """Cụm `eojeol` có phải một dạng chia của động / tính từ `lemma` (…다) không. Thân 1 chữ chỉ nhận khi cụm bắt đầu
    đúng dạng thân (không nhận kiểu chỉ trùng phụ âm đầu)."""
    if not is_predicate(lemma):
        return False
    w = PUNCT_RE.sub("", eojeol or "")
    if not w or not all(is_syllable(c) for c in w):
        return False
    stem = lemma[:-1]
    open_end = not split(stem[-1])[2]
    starts = ENDING_START_SHORT if (len(stem) == 1 and open_end) else ENDING_START
    for v in _stem_variants(stem):
        if not w.startswith(v):
            continue
        rest = w[len(v):]
        if len(rest) > 6:
            continue
        if rest == "":
            if v != stem:
                return True
            continue
        if rest[0] not in (starts if v == stem else ENDING_START):     # dạng gộp (갔, 했, 봐…) đã chắc là động từ
            continue
        if v == stem and open_end and rest[0] in NO_AFTER_VOWEL:
            continue
        return True
    return False


def noun_match(eojeol: str, noun: str) -> bool:
    """Cụm `eojeol` = danh từ `noun` + (tiểu từ / đuôi)."""
    w = PUNCT_RE.sub("", eojeol or "")
    if not noun or not w.startswith(noun):
        return False
    return particle_tail(w[len(noun):])


def match(eojeol: str, word: str) -> bool:
    return predicate_match(eojeol, word) if is_predicate(word) else noun_match(eojeol, word)


def find_links(text: str, words: list[str]) -> list[tuple[int, int, str]]:
    """Chỗ tra từ trong `text`: [(đầu, cuối, từ gốc)] — mỗi cụm (cách nhau dấu cách) khớp từ dài nhất trong `words`.
    Phần được gạch chân: danh từ → chỉ danh từ (축제|가), động / tính từ → cả cụm (무서워서)."""
    ordered = sorted({w for w in words if w}, key=len, reverse=True)
    out: list[tuple[int, int, str]] = []
    for m in re.finditer(r"[^\s]+", text or ""):
        tok = m.group(0)
        core = tok.strip(".,!?;:…\"'“”‘’()「」『』~")
        if not core or not HANGUL_RE.search(core):
            continue
        start = m.start() + tok.index(core)
        for w in ordered:
            if is_predicate(w):
                if predicate_match(core, w):
                    out.append((start, start + len(core), w))
                    break
            elif noun_match(core, w):
                out.append((start, start + len(w), w))
                break
    return out


# ---------------------------------------------------------------------------
# Chép chính tả: chấm theo cụm
# ---------------------------------------------------------------------------

def norm(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")


def cum(s: str) -> list[str]:
    """Câu → các cụm (bỏ dấu câu)."""
    return [x for x in PUNCT_RE.sub(" ", norm(s)).split() if x]


def grade(answer: str, typed: str) -> dict[str, Any]:
    """So câu gõ với câu đúng theo cụm. ok: đúng cả câu (bỏ qua dấu câu; khác chỗ cách nhưng đúng chữ cũng tính đúng,
    kèm `spacing`). marks: [(cụm đúng, True / False)] để tô."""
    a, t = cum(answer), cum(typed)
    joined_ok = "".join(a) == "".join(t) and bool(a)
    marks = []
    for i, x in enumerate(a):
        marks.append([x, joined_ok or (i < len(t) and t[i] == x)])
    ok = bool(a) and a == t
    return {"ok": ok or joined_ok, "spacing": joined_ok and not ok, "right": sum(1 for _x, g in marks if g),
            "total": len(a), "marks": marks}
