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
# chữ Latin (romaji, tiếng Anh, tiếng Việt có dấu) và chữ Latin toàn khổ trong câu tiếng Nhật
LATIN_RE = re.compile(r"[A-Za-z\u00c0-\u024f\u1e00-\u1eff\uff21-\uff3a\uff41-\uff5a]+")
# chữ Hán có trong bộ mã Nhật nhưng thật ra là giản thể / dị thể gần như không dùng ở Nhật
SIMPLIFIED_IN_JIS = set("从气几坏广无网价儿决况听挂梦烟窗")
JOYO_OUTSIDE_CP932 = set("𠮟剝頰塡")
SPECIAL_DAY = {1: "ついたち", 2: "ふつか", 3: "みっか", 4: "よっか", 5: "いつか", 6: "むいか", 7: "なのか",
               8: "ようか", 9: "ここのか", 10: "とおか", 14: "じゅうよっか", 20: "はつか", 24: "にじゅうよっか"}
SPECIAL_PEOPLE = {1: "ひとり", 2: "ふたり"}


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


def bad_kanji(text):
    """Chữ Hán không dùng trong tiếng Nhật (thường là chữ Trung giản thể)."""
    out = []
    for ch in KANJI_RE.findall(text):
        if ch in SIMPLIFIED_IN_JIS:
            out.append(ch)
            continue
        if ch in JOYO_OUTSIDE_CP932 or ch in "々〆":
            continue
        try:
            ch.encode("cp932")
        except UnicodeEncodeError:
            out.append(ch)
    return list(dict.fromkeys(out))


def _subseq(small, big):
    it = iter(big)
    return all(c in it for c in small)


def problems(text):
    """Trả về (lỗi, cảnh báo) của một chuỗi có đánh dấu."""
    errors, warnings = [], []
    toks = tokenize(text)
    for i, t in enumerate(toks):
        if t[0] == "plain":
            m = re.match(r".*?(\d+)$", t[1])
            nxt = toks[i + 1] if i + 1 < len(toks) else None
            if m and nxt and nxt[0] != "plain" and not t[1].endswith("." + m.group(1)):
                n, nr = int(m.group(1)), to_hira(nxt[2] or "")
                if nxt[1][:1] == "日" and nr.startswith("にち") and n in SPECIAL_DAY:
                    errors.append("%d日 đọc đặc biệt, viết [%d日|%s]" % (n, n, SPECIAL_DAY[n]))
                if nxt[1][:1] == "人" and nr.startswith("にん") and n in SPECIAL_PEOPLE:
                    errors.append("%d人 đọc đặc biệt, viết [%d人|%s]" % (n, n, SPECIAL_PEOPLE[n]))
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
            if r and KANA_ONLY_RE.match(r):
                kana_in = to_hira("".join(c for c in s if "\u3041" <= c <= "\u30ff")).replace("ー", "")
                if kana_in and not _subseq(kana_in, to_hira(r)):
                    errors.append("cách đọc %s không khớp phần kana trong %s" % (r, s))
                md = re.match(r"^(\d+)(日|人)$", s)
                if md:
                    table = SPECIAL_DAY if md.group(2) == "日" else SPECIAL_PEOPLE
                    n = int(md.group(1))
                    if n in table and to_hira(r) != table[n]:
                        errors.append("%s phải đọc là %s" % (s, table[n]))
    surf = surface(text)
    lat = LATIN_RE.findall(surf)
    acr = [x for x in lat if re.match(r"^[A-Z]{2,5}$", x)]        # NHK, JR, SNS: người Nhật vẫn viết vậy
    lat = [x for x in lat if x not in acr]
    if lat:
        errors.append('có chữ Latin (romaji / tiếng Anh / tiếng Việt) "%s" trong câu tiếng Nhật' % " ".join(dict.fromkeys(lat))[:40])
    if acr:
        warnings.append("có chữ viết tắt Latin %s, người học N5–N4 có thể chưa đọc được" % " ".join(dict.fromkeys(acr)))
    bad = bad_kanji(surf)
    if bad:
        errors.append("chữ Hán %s không dùng trong tiếng Nhật (có thể là chữ Trung giản thể)" % "".join(bad))
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
