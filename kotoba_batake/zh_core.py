"""ことば畑 1.32.2 — pinyin trên từng chữ (deck tiếng Trung): đổi pinyin ghi số thành dấu thanh, tách pinyin thành âm tiết,
ghép mỗi chữ Hán với âm tiết của nó. Chỉ là cách hiện — không sửa gì trong deck, không lưu gì.

Thuần Python (không import anki / aqt) để test offline. Danh sách âm tiết ở zh_data.py (sinh từ pypinyin, đừng sửa tay).
Dấu thanh viết bằng ký tự dấu kết hợp rồi gộp NFC (không gõ sẵn bảng nguyên âm có dấu)."""
from __future__ import annotations

import os
import re
import unicodedata
from typing import Any

try:   # chạy trong Anki (gói add-on)
    from .zh_data import SYLLABLES
except ImportError:   # test: nạp file nằm cạnh
    try:
        from zh_data import SYLLABLES  # type: ignore[no-redef]
    except ImportError:
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location("kotoba_zh_data", os.path.join(os.path.dirname(os.path.abspath(__file__)), "zh_data.py"))
        _mod = _ilu.module_from_spec(_spec)
        _spec.loader.exec_module(_mod)  # type: ignore[union-attr]
        SYLLABLES = _mod.SYLLABLES

# thanh 1–4 → dấu kết hợp (macron, sắc, móc ngược, huyền); 5 / 0 = thanh nhẹ, không dấu
MARK = {"1": "\u0304", "2": "\u0301", "3": "\u030c", "4": "\u0300"}
TONE_OF = {v: k for k, v in MARK.items()}
UMLAUT = "̈"
VOWELS = "aeiouü"
# chữ cái + số thanh ngay sau (ni3, Zhong1, lv4, nu:3); không bắt "mp3", "Win10" (kiểm âm tiết hợp lệ, số đứng một mình)
_NUM_SYL = re.compile(r"(?<![A-Za-züÜ:])([A-Za-züÜ]+(?::[A-Za-z]*)?)([0-5])(?![0-9])")
_SEP = re.compile(r"[\s'’‘\-·・]+")
_PUNCT = ".,;:!?…，。！？；：、()（）\"“”"


def _base(s: str) -> str:
    """Âm tiết → chữ cái thường không thanh, ü viết v (để tra SYLLABLES)."""
    d = unicodedata.normalize("NFD", (s or "").lower()).replace("u" + UMLAUT, "v")
    return "".join(ch for ch in d if "a" <= ch <= "z")


def _tones(s: str) -> int:
    """Số dấu thanh trong một đoạn pinyin đã viết dấu."""
    return sum(1 for ch in unicodedata.normalize("NFD", s or "") if ch in TONE_OF)


def _mark_one(letters: str, tone: str) -> str | None:
    s = letters.replace("u:", "ü").replace("U:", "Ü").replace("v", "ü").replace("V", "Ü")
    b = _base(s)
    if b not in SYLLABLES and not (b.endswith("r") and b[:-1] in SYLLABLES):     # erhua: huar4 = hua + r
        return None
    if tone not in MARK:
        return s
    low = s.lower()
    if "a" in low:
        i = low.index("a")
    elif "e" in low:
        i = low.index("e")
    elif "ou" in low:
        i = low.index("o")
    else:
        i = max(low.rfind(v) for v in VOWELS)
        if i < 0:
            return None
    return unicodedata.normalize("NFC", s[: i + 1] + MARK[tone] + s[i + 1:])


def tone_marks(text: str) -> str:
    """Pinyin ghi số → dấu thanh ("ni3 hao3" → dấu; "lv4", "nu:3" → ü). Phần không phải âm tiết pinyin giữ nguyên;
    pinyin đã có dấu giữ nguyên."""
    if not text or not any(c in "012345" for c in text):
        return text or ""

    def rep(m: re.Match[str]) -> str:
        out = _mark_one(m.group(1), m.group(2))
        return m.group(0) if out is None else out

    return _NUM_SYL.sub(rep, text)


def _split_part(part: str, n: int, strict: bool) -> list[list[str]]:
    """Các cách chia một đoạn viết liền thành đúng n âm tiết hợp lệ (tối đa 4 cách, âm tiết dài thử trước).
    strict: âm tiết bắt đầu bằng a / e / o không đứng giữa đoạn (quy tắc dấu nháy của pinyin: "fang'an")."""
    found: list[list[str]] = []

    def go(pos: int, left: int, acc: list[str]) -> None:
        if len(found) >= 4:
            return
        if pos == len(part):
            if left == 0:
                found.append(list(acc))
            return
        if left == 0:
            return
        for end in range(min(len(part), pos + 7), pos, -1):
            piece = part[pos:end]
            b = _base(piece)
            if not b or b not in SYLLABLES or _tones(piece) > 1:
                continue
            if strict and pos > 0 and b[0] in "aeo":
                continue
            # dấu thanh / chữ cái kết hợp không được tách khỏi chữ của nó
            if end < len(part) and unicodedata.category(part[end]) == "Mn":
                continue
            acc.append(piece)
            go(end, left - 1, acc)
            acc.pop()

    go(0, n, [])
    return found


def split_syllables(reading: str, n: int) -> list[str] | None:
    """Pinyin của một từ → đúng n âm tiết (đã đổi số → dấu), hoặc None nếu không chia được chắc chắn."""
    if n <= 0:
        return None
    # pinyin ghi số: con số là chỗ hết âm tiết ("zang4ao2" = zang4 + ao2) → ngắt ở đó trước khi đổi sang dấu
    raw = _NUM_SYL.sub(lambda m: m.group(0) + " " if _mark_one(m.group(1), m.group(2)) is not None else m.group(0),
                       (reading or "").strip())
    r = unicodedata.normalize("NFC", tone_marks(raw))
    parts = [p.strip(_PUNCT) for p in _SEP.split(r)]
    parts = [p for p in parts if p]
    if not parts or any(not _base(p) for p in parts):
        return None
    if len(parts) == n and all(_base(p) in SYLLABLES for p in parts):
        return parts
    # chia từng đoạn viết liền sao cho tổng đúng n, theo chính tả pinyin: âm tiết bắt đầu bằng a / e / o giữa từ luôn có
    # dấu nháy đứng trước (không có thì không tách ra âm tiết đó — "xuesheng" không thành xu + e + sheng). Deck không dùng
    # dấu nháy nào thì có thể đã bỏ dấu nháy: nếu bỏ quy tắc mà chia được kiểu khác (fangan = fan + gan hay fang + an) →
    # không đoán, giữ một dòng dưới chữ. Thà không hiện còn hơn hiện sai.
    exact = _combine(parts, n, strict=True)
    if exact is None or re.search(r"['\u2019\u2018]", r):
        return exact
    return exact if _combine(parts, n, strict=False) == exact else None


def _combine(parts: list[str], n: int, strict: bool) -> list[str] | None:
    sols: list[list[str]] = []

    def go(i: int, left: int, acc: list[str]) -> None:
        if len(sols) > 1:
            return
        if i == len(parts):
            if left == 0 and acc not in sols:
                sols.append(list(acc))
            return
        rest = len(parts) - i - 1
        for k in range(1, left - rest + 1):
            for w in _split_part(parts[i], k, strict):
                go(i + 1, left - k, acc + w)

    go(0, n, [])
    return sols[0] if len(sols) == 1 else None


def is_han(ch: str) -> bool:
    o = ord(ch)
    return (0x3400 <= o <= 0x4DBF or 0x4E00 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or 0x20000 <= o <= 0x2FFFF
            or ch == "〇")


def ruby_pairs(word: str, reading: str) -> list[list[str]] | None:
    """Mỗi chữ Hán của `word` với âm tiết pinyin của nó, hoặc None (giữ một dòng pinyin dưới chữ như 1.32.1)."""
    chars = [c for c in (word or "") if not c.isspace()]
    if not chars or len(chars) > 16 or not all(is_han(c) for c in chars) or not (reading or "").strip():
        return None
    syl = split_syllables(reading, len(chars))
    if syl is None and chars[-1] == "儿" and len(chars) > 1:        # 儿 (erhua): "…diǎnr" → … + r
        r = unicodedata.normalize("NFC", tone_marks(reading.strip())).rstrip(_PUNCT)
        if r[-1:] in ("r", "R"):
            head = split_syllables(r[:-1], len(chars) - 1)
            if head is not None:
                syl = head + [r[-1]]
    if syl is None:
        return None
    return [[c, s] for c, s in zip(chars, syl)]


def bracket_pairs(tokens: list[tuple[str, str | None]]) -> tuple[str, str, list[list[str]] | None] | None:
    """Trường Từ ghi kiểu Anki 中[zhōng]文[wén] (text_core.tokens) → (chữ, pinyin cả từ, cặp chữ / âm tiết | None).
    Không có chỗ nào ghi pinyin trong ngoặc → None."""
    if not any(r for _w, r in tokens):
        return None
    word = "".join(w for w, _r in tokens)
    readings: list[str] = []
    pairs: list[list[str]] | None = []
    for w, r in tokens:
        w = w.strip()
        if not w:
            continue
        if r:
            r = unicodedata.normalize("NFC", tone_marks(r.strip()))
            readings.append(r)
            sub = ruby_pairs(w, r)
            if sub is None or pairs is None:
                pairs = None
            else:
                pairs.extend(sub)
        else:
            pairs = None if any(is_han(c) for c in w) else pairs      # chữ Hán không có pinyin → không ghép từng chữ
            if pairs is not None:
                pairs.extend([[c, ""] for c in w])
    word = "".join(c for c in word if not c.isspace())
    return word, " ".join(readings), pairs


def display(word: str, reading: str) -> dict[str, Any]:
    """Cho note_details: pinyin đã đổi số → dấu + cặp chữ / âm tiết (nếu ghép được)."""
    r = unicodedata.normalize("NFC", tone_marks(reading or "")) if reading else ""
    return {"reading": r, "ruby": ruby_pairs(word, r) if r else None}


# ---------------------------------------------------------------------------
# 1.33 — báo tiếng Trung: soát pinyin Gemini ghi cho từng chữ bằng bảng cách đọc (zh_data.READINGS_RAW, sinh từ pypinyin)
# ---------------------------------------------------------------------------

_READINGS: dict[str, set[str]] | None = None
FREE_TONE = {"一", "不"}       # 一 / 不 đổi thanh theo chữ sau (yī → yí / yì, bù → bú): nhận mọi thanh


def readings(ch: str) -> set[str]:
    """Cách đọc của một chữ Hán: {"hao3", "hao4"} (âm tiết không thanh, ü viết v, + số thanh 1–5). Chữ ngoài bảng → set()."""
    global _READINGS
    if _READINGS is None:
        try:
            from .zh_data import READINGS_RAW
        except ImportError:
            try:
                from zh_data import READINGS_RAW  # type: ignore[no-redef]
            except ImportError:
                import importlib.util as _ilu2
                _sp = _ilu2.spec_from_file_location("kotoba_zh_data2", os.path.join(os.path.dirname(os.path.abspath(__file__)), "zh_data.py"))
                _md = _ilu2.module_from_spec(_sp)
                _sp.loader.exec_module(_md)  # type: ignore[union-attr]
                READINGS_RAW = _md.READINGS_RAW
        table: dict[str, set[str]] = {}
        for line in READINGS_RAW.splitlines():
            if "\t" not in line:
                continue
            rd, chars = line.split("\t", 1)
            vals = set(rd.split())
            for c in chars:
                table[c] = vals
        _READINGS = table
    return _READINGS.get(ch, set())


def known(ch: str) -> bool:
    return bool(readings(ch))


def numbered(syl: str) -> tuple[str, int] | None:
    """Âm tiết (có dấu hoặc ghi số) → (chữ cái không thanh, ü = v; thanh 1–5). Không phải âm tiết hợp lệ → None."""
    s = (syl or "").strip()
    m = re.fullmatch(r"([A-Za-züÜ:]+)([0-5])", s)
    tone = 5
    if m:
        s, tone = m.group(1).replace("u:", "v").replace("U:", "v"), int(m.group(2)) or 5
    else:
        t = _tones(s)
        if t > 1:
            return None
        for ch in unicodedata.normalize("NFD", s):
            if ch in TONE_OF:
                tone = int(TONE_OF[ch])
    b = _base(s)
    if not b or (b not in SYLLABLES and not (b == "r")):
        return None
    return b, tone


def syllable_ok(ch: str, syl: str) -> bool:
    """Âm tiết `syl` có phải cách đọc của chữ `ch` không (thanh nhẹ nhận cho mọi chữ; 一 / 不 nhận mọi thanh;
    儿 sau âm tiết khác đọc r)."""
    n = numbered(syl)
    rd = readings(ch)
    if n is None or not rd:
        return False
    base, tone = n
    if ch == "儿" and base == "r":
        return True
    bases = {r[:-1] for r in rd}
    if base not in bases:
        return False
    return tone == 5 or ch in FREE_TONE or (base + str(tone)) in rd


def word_problem(word: str, reading: str) -> str:
    """Soát một chỗ [chữ|pinyin] của báo: "" nếu đúng, không thì câu lỗi ngắn (tiếng Việt) để gửi lại Gemini sửa."""
    chars = [c for c in word if is_han(c)]
    if not chars:
        return ""
    unknown = [c for c in chars if not known(c)]
    if unknown:
        return "chữ %s ít dùng (ngoài bộ chữ giản thể / phồn thể thường dùng)" % "".join(unknown)
    raw = _NUM_SYL.sub(lambda m: m.group(0) + " ", (reading or "").strip())
    sy = [p for p in _SEP.split(raw.strip()) if p]
    if len(sy) != len(chars):
        return "%s có %d chữ nhưng pinyin \"%s\" có %d âm tiết" % (word, len(chars), reading, len(sy))
    bad = [(c, s) for c, s in zip(chars, sy) if not syllable_ok(c, s)]
    if bad:
        return "pinyin sai: " + ", ".join("%s đọc là %s chứ không phải \"%s\"" % (
            c, "/".join(sorted(tone_marks(r) if r[-1] != "5" else r[:-1] for r in readings(c))), s) for c, s in bad[:3])
    return ""


def fill_reading(word: str) -> str | None:
    """Chữ Hán không có pinyin trong bài: chữ chỉ có một cách đọc thì máy tự điền (ghi có dấu), không thì None."""
    out = []
    for c in word:
        if not is_han(c):
            return None
        rd = readings(c)
        if len(rd) != 1:
            return None
        r = next(iter(rd))
        out.append(tone_marks(r) if r[-1] != "5" else r[:-1])
    return " ".join(out) if out else None


def is_simplified_text(words: list[str]) -> bool:
    """Deck viết chữ giản thể hay phồn thể: phần lớn chữ Hán mã hoá được GB2312 → giản thể."""
    gb = big5 = 0
    for w in words:
        for c in w:
            if not is_han(c):
                continue
            try:
                c.encode("gb2312")
                gb += 1
            except UnicodeEncodeError:
                pass
            try:
                c.encode("big5")
                big5 += 1
            except UnicodeEncodeError:
                pass
    return gb >= big5
