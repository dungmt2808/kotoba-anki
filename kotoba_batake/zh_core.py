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
MARK = {"1": "̄", "2": "́", "3": "̌", "4": "̀"}
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
    """Mọi cách chia một đoạn viết liền thành đúng n âm tiết hợp lệ (tối đa vài cách, âm tiết dài thử trước).
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
    r = unicodedata.normalize("NFC", tone_marks((reading or "").strip()))
    parts = [p.strip(_PUNCT) for p in _SEP.split(r)]
    parts = [p for p in parts if p]
    if not parts or any(not _base(p) for p in parts):
        return None
    if len(parts) == n and all(_base(p) in SYLLABLES for p in parts):
        return parts
    # chia từng đoạn viết liền sao cho tổng đúng n: thử quy tắc dấu nháy trước, không được thì bỏ quy tắc
    for strict in (True, False):
        best = _combine(parts, n, strict)
        if best is not None:
            return best
    return None


def _combine(parts: list[str], n: int, strict: bool) -> list[str] | None:
    def go(i: int, left: int) -> list[str] | None:
        if i == len(parts):
            return [] if left == 0 else None
        rest = len(parts) - i - 1
        for k in range(1, left - rest + 1):
            ways = _split_part(parts[i], k, strict)
            if len(ways) > 1 and not _same(ways):
                continue        # chia được nhiều kiểu khác nhau → không đoán
            for w in ways[:1]:
                tail = go(i + 1, left - k)
                if tail is not None:
                    return w + tail
        return None

    return go(0, n)


def _same(ways: list[list[str]]) -> bool:
    return all(w == ways[0] for w in ways)


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


def bracket_pairs(raw: str, tokens: list[tuple[str, str | None]]) -> tuple[str, str, list[list[str]] | None] | None:
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
