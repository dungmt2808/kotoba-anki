"""Cú pháp đánh dấu furigana dùng trong gói báo.

    [漢字|かんじ]            chữ Hán kèm cách đọc (chỉ hiện furigana)
    {表記|よみ|từ gốc}        từ cần học: hiện furigana và bấm vào được để tra.
                             "từ gốc" là dạng từ điển, viết đúng như trong pham_vi.json.
                             Okurigana để bên ngoài: {泊|と|泊まる}まり
    {コート||コート}           từ katakana thì để trống cách đọc

Mọi chữ Hán trong bài phải nằm trong [..|..] hoặc {..|..|..}.
Script chỉ dùng thư viện chuẩn, chạy được với Python 3.10 (Ubuntu 22.04).
"""
import re

TOKEN_RE = re.compile(
    r"\{([^{}\[\]|]*)\|([^{}\[\]|]*)\|([^{}\[\]|]*)\}"
    r"|\[([^{}\[\]|]*)\|([^{}\[\]|]*)\]"
)
SPECIAL = set("{}[]|")
KANJI_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005\u3006]")
KANA_ONLY_RE = re.compile(r"^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc\u30fd\u30fe〜～・]*$")
PUNCT_RE = re.compile(r"[\s\u3000。、．，！？!?.,「」『』（）()…・〜～]")


def tokenize(text):
    """Trả về danh sách token: ("plain", s) | ("ruby", mặt chữ, đọc) | ("word", mặt chữ, đọc, từ gốc)."""
    out = []
    pos = 0
    for m in TOKEN_RE.finditer(text):
        if m.start() > pos:
            out.append(("plain", text[pos:m.start()]))
        if m.group(4) is not None:
            out.append(("ruby", m.group(4), m.group(5)))
        else:
            out.append(("word", m.group(1), m.group(2), m.group(3)))
        pos = m.end()
    if pos < len(text):
        out.append(("plain", text[pos:]))
    return out


def surface(text):
    """Câu như người Nhật viết (bỏ đánh dấu)."""
    return "".join(t[1] for t in tokenize(text))


def kana(text):
    """Câu viết toàn bằng kana (thay chữ Hán bằng cách đọc)."""
    parts = []
    for t in tokenize(text):
        if t[0] == "plain":
            parts.append(t[1])
        else:
            parts.append(t[2] or t[1])
    return "".join(parts)


def keys(text):
    """Các 'từ gốc' được đánh dấu {..|..|..} trong một chuỗi."""
    return [t[3] for t in tokenize(text) if t[0] == "word"]


def problems(text):
    """Trả về (lỗi, cảnh báo) của một chuỗi có đánh dấu."""
    errors, warnings = [], []
    for t in tokenize(text):
        if t[0] == "plain":
            bad = sorted(set(t[1]) & SPECIAL)
            if bad:
                errors.append("ký tự đánh dấu bị lẻ %s gần: …%s…" % ("".join(bad), t[1][:20]))
            kj = KANJI_RE.findall(t[1])
            if kj:
                errors.append("chữ Hán thiếu furigana: %s (trong: …%s…)" % ("".join(dict.fromkeys(kj)), t[1][:24]))
        else:
            s, r = t[1], t[2]
            if not s:
                errors.append("đánh dấu có mặt chữ rỗng")
            if r and not KANA_ONLY_RE.match(r):
                errors.append("cách đọc phải là kana: %s|%s" % (s, r))
            if KANJI_RE.search(s) and not r:
                errors.append("chữ Hán thiếu cách đọc: %s" % s)
            if t[0] == "ruby" and not KANJI_RE.search(s):
                warnings.append("[%s|%s] không có chữ Hán, không cần furigana" % (s, r))
            if t[0] == "word" and not t[3].strip():
                errors.append("thiếu từ gốc trong {%s|%s|}" % (s, r))
    return errors, warnings


def to_hira(s):
    return "".join(chr(ord(c) - 0x60) if "\u30a1" <= c <= "\u30f6" else c for c in s)


def to_kata(s):
    return "".join(chr(ord(c) + 0x60) if "\u3041" <= c <= "\u3096" else c for c in s)


def norm_answer(s):
    """Chuẩn hoá câu trả lời chép chính tả: bỏ dấu câu, khoảng trắng; katakana → hiragana."""
    return to_hira(PUNCT_RE.sub("", s))


def norm_key(s):
    """Chuẩn hoá từ gốc để so khớp: bỏ 〜/～ ở đầu, bỏ する ở cuối."""
    s = s.strip().lstrip("〜～")
    if s.endswith("する") and len(s) > 2:
        s = s[:-2]
    return s
