"""Chuẩn hoá chữ trong trường của note (từ bản 1.17) — thuần Python, không import anki.

Tiếng Nhật: mọi kiểu furigana hay gặp được đưa về MỘT dạng (ngoặc vuông của Anki, không còn HTML):
    ngoặc vuông Anki        日本[にほん] 語[ご]  ·  食[た]べる (okurigana nằm ngoài ngoặc)
    Migaku (kèm trọng âm)   漢字[かんじ;h,1]  ·  です[;k]
    HTML ruby (Yomitan…)    <ruby>漢字<rt>かんじ</rt></ruby>  ·  <ruby><rb>漢</rb><rp>(</rp><rt>かん</rt><rp>)</rp></ruby>
    trong trường Từ         漢字（かんじ） / 漢字【かんじ】 · hai dòng 漢字<br>かんじ
Rồi suy ra: chữ hiện trên cây (surface), cách đọc kana (reading), các cặp (chữ, cách đọc) cho câu ví dụ.

Tiếng Anh: không đụng tới [...] (vd. "take [sth] off"); chỉ tách phiên âm IPA khi chắc chắn
("apple /ˈæp.əl/", "run [rʌn]"), các dạng biến đổi của từ (để tìm từ trong câu ví dụ) và chuẩn hoá câu
gõ lại khi chép chính tả (chữ thường, bỏ dấu câu, don't = do not…).

Kiểu lạ (CSS riêng, cách đọc nằm trong thuộc tính HTML…) không đoán: hiện chữ nguyên văn, người dùng chọn
trường Cách đọc riêng trong Cấu hình trường.
"""

from __future__ import annotations

import html
import re

KANA_CLASS = "ぁ-ゖゝゞァ-ヺーヽヾ"
KANJI_CLASS = "㐀-䶿一-鿿豈-﫿々〆"
HAS_KANJI = re.compile("[%s]" % KANJI_CLASS)
HAS_KANA = re.compile("[%s]" % KANA_CLASS)
KANA_WORD = re.compile(r"^[%s・\s]+$" % KANA_CLASS)

SOUND_RE = re.compile(r"\[sound:[^\]]*\]")
TAG_RE = re.compile(r"<[^>]*>")
BREAK_RE = re.compile(r"(?i)<br\s*/?>|</(?:div|p|li|tr)>")
_RUBY_RE = re.compile(r"(?is)<ruby\b[^>]*>(.*?)</ruby>")
_RP_RE = re.compile(r"(?is)<rp\b[^>]*>.*?</rp>")
_RT_RE = re.compile(r"(?is)<rt\b[^>]*>(.*?)</rt>")
_RB_RE = re.compile(r"(?is)<rb\b[^>]*>(.*?)</rb>")
_MIGAKU_RE = re.compile(r"\[([^\[\];]*);[^\[\]]*\]")
_TOKEN_RE = re.compile(r" ?([^\s>\[\]]+?)\[([^\]]*)\]")
_CJK_GAP = re.compile(r"(?<=[　-ヿ㐀-鿿豈-﫿！-～]) +(?=[　-ヿ㐀-鿿豈-﫿！-～])")
# ngoặc tròn sau chữ: chỉ tách khi bên trong toàn kana và không phải đuôi kiểu 賛成(する), 静か(な)
_PAREN_RE = re.compile(r"^(.*[%s].*?)\s*[（(【]\s*([%s・ ]+?)\s*[）)】]\s*$" % (KANJI_CLASS, KANA_CLASS))
_PAREN_SUFFIX = {"する", "な", "の", "に", "と", "だ", "たる", "を", "が", "で", "は", "も", "へ", "から", "まで", "なる"}


# ---------------------------------------------------------------------------
# Tiếng Nhật
# ---------------------------------------------------------------------------


def _plain_html(s: str) -> str:
    return TAG_RE.sub("", s or "").replace("[", "").replace("]", "")


def _ruby_repl(m: re.Match) -> str:
    inner = _RP_RE.sub("", m.group(1))
    rts = [_plain_html(x).strip() for x in _RT_RE.findall(inner)]
    if _RB_RE.search(inner):
        rbs = [_plain_html(x).strip() for x in _RB_RE.findall(inner)]
        pairs = list(zip(rbs, rts)) if len(rbs) == len(rts) else [("".join(rbs), "".join(rts))]
        return "".join(" %s[%s]" % (b, r) if r else b for b, r in pairs if b)
    out: list[str] = []
    pos = 0
    for rt in _RT_RE.finditer(inner):
        base = _plain_html(inner[pos:rt.start()]).strip()
        reading = _plain_html(rt.group(1)).strip()
        if base and reading:
            out.append(" %s[%s]" % (base, reading))
        elif base:
            out.append(base)
        elif reading and out and out[-1].endswith("]"):      # <rt> thứ hai cho cùng một chữ: nối vào
            out[-1] = out[-1][:-1] + reading + "]"
        pos = rt.end()
    out.append(_plain_html(inner[pos:]).strip())
    return "".join(out)


def ja_text(raw: str) -> str:
    """HTML của một trường → chữ thuần có furigana kiểu Anki 「漢字[かんじ]」, giữ xuống dòng bằng "\\n"."""
    s = SOUND_RE.sub("", raw or "")
    s = _RUBY_RE.sub(_ruby_repl, s)
    s = _MIGAKU_RE.sub(lambda m: "[%s]" % m.group(1) if m.group(1).strip() else "", s)
    s = BREAK_RE.sub("\n", s)
    s = html.unescape(TAG_RE.sub("", s)).replace(" ", " ")
    lines = [" ".join(line.split()) for line in s.split("\n")]
    return "\n".join(line for line in lines if line)


def tokens(text: str) -> list[tuple[str, str | None]]:
    """「私[わたし]は 学生[がくせい]」 → [(私, わたし), (は, None), (学生, がくせい)]."""
    out: list[tuple[str, str | None]] = []
    pos = 0
    for m in _TOKEN_RE.finditer(text or ""):
        if m.start() > pos:
            out.append((text[pos:m.start()], None))
        ruby = m.group(2).strip()
        out.append((m.group(1), ruby or None))
        pos = m.end()
    if pos < len(text or ""):
        out.append((text[pos:], None))
    return out


def gap(text: str) -> str:
    """Bỏ khoảng trắng dùng để tách furigana giữa các chữ Nhật."""
    return _CJK_GAP.sub("", text)


def surface(text: str) -> str:
    """Chữ hiện ra (bỏ phần cách đọc trong ngoặc vuông)."""
    return gap("".join(b for b, _r in tokens(text))).strip()


def is_kana(s: str) -> bool:
    return bool(s) and bool(KANA_WORD.match(s))


def reading(text: str) -> str:
    """Cách đọc kana của chữ có furigana: 食[た]べる → たべる. Thiếu cách đọc của chữ Hán nào thì trả ""."""
    toks = tokens(text)
    if not any(r for _b, r in toks):
        return ""
    out: list[str] = []
    for base, ruby in toks:
        if ruby:
            if not is_kana(ruby):
                return ""
            out.append(ruby)
        elif HAS_KANJI.search(base):
            return ""
        else:
            out.append(base)
    return re.sub(r"[\s・]", "", "".join(out))


def split_word(raw: str) -> tuple[str, str]:
    """Trường Từ (HTML) → (chữ, cách đọc lấy được từ chính trường đó hoặc "")."""
    text = ja_text(raw)
    lines = text.split("\n")
    if len(lines) == 2 and HAS_KANJI.search(surface(lines[0])) and is_kana(surface(lines[1])):
        return surface(lines[0]), re.sub(r"[\s・]", "", surface(lines[1]))      # 漢字<br>かんじ
    joined = " / ".join(lines)
    word, read = surface(joined), reading(joined)
    if not read:
        m = _PAREN_RE.match(word)
        if m and m.group(2).strip() not in _PAREN_SUFFIX:
            word, read = m.group(1).strip(), re.sub(r"[\s・]", "", m.group(2))
    return word, read


def reading_field(raw: str) -> str:
    """Trường Cách đọc: kana thuần, hoặc có furigana (漢字[かんじ], ruby) thì lấy phần kana."""
    text = ja_text(raw)
    joined = " / ".join(text.split("\n"))
    return reading(joined) or surface(joined)


def ja_example(raw: str) -> str:
    """Câu ví dụ → một dòng furigana kiểu Anki (đã bỏ HTML, audio)."""
    return " ".join(ja_text(raw).split("\n"))


# ---------------------------------------------------------------------------
# Tiếng Anh (và ngôn ngữ chữ Latin khác)
# ---------------------------------------------------------------------------

IPA_CHARS = set("ˈˌːˑəɚɝɪʊʌæɑɒɔɛɜɐθðŋʃʒʤʧɡɹɾʔɫɬʎɲɣχʁβɸçʝɥɯɨʉøœɶ")
_IPA_SLASH = re.compile(r"^(.*?\S)\s*/([^/]{1,60})/\s*$")
_IPA_BRACKET = re.compile(r"^(.*?\S)\s*[\[(]([^\[\]()]{1,60})[\])]\s*$")


def plain_text(raw: str) -> str:
    """HTML → chữ thuần một dòng (xuống dòng thành " / "), bỏ [sound:…]."""
    s = SOUND_RE.sub("", raw or "")
    s = BREAK_RE.sub("\n", s)
    s = html.unescape(TAG_RE.sub("", s)).replace(" ", " ")
    parts = [" ".join(line.split()) for line in s.split("\n")]
    return " / ".join(x for x in parts if x)


def looks_ipa(s: str) -> bool:
    return any(c in IPA_CHARS for c in s)


def en_split_ipa(word: str) -> tuple[str, str]:
    """「apple /ˈæp.əl/」, 「run [rʌn]」 → (chữ, phiên âm). Ngoặc không phải IPA (vd. take [sth] off) thì giữ."""
    m = _IPA_SLASH.match(word)
    if m and (looks_ipa(m.group(2)) or " " not in m.group(2).strip()) and not re.search(r"\d", m.group(2)) \
            and "/" not in m.group(1):
        return m.group(1).strip(), "/%s/" % m.group(2).strip()
    m = _IPA_BRACKET.match(word)
    if m and looks_ipa(m.group(2)):
        return m.group(1).strip(), "/%s/" % m.group(2).strip().strip("/")
    return word, ""


_POS_ABBR = {"n", "v", "vt", "vi", "adj", "adv", "prep", "conj", "pron", "int", "interj", "det", "phr", "phrv",
             "noun", "verb", "adjective", "adverb", "num", "aux", "modal", "abbr", "sth", "sb", "sbsth", "idiom",
             "pl", "sing", "us", "uk", "informal", "formal", "c", "u", "cu"}


def en_alternatives(word: str) -> list[str]:
    """Các cách viết chấp nhận được của một từ / cụm từ tiếng Anh: 「to go (v)」 → go, to go; 「color, colour」."""
    w = re.sub(r"\[[^\]]*\]|/[^/]*/", " ", word or "")
    out: list[str] = []

    def add(x: str) -> None:
        x = " ".join(x.replace("’", "'").split()).strip(" .!?;:")
        if x and x.lower() not in [o.lower() for o in out]:
            out.append(x)
    for part in re.split(r"[,;/|]", w):
        core = re.sub(r"\([^)]*\)", " ", part)
        add(core)
        inner = re.findall(r"\(([^)]*)\)", part)
        if inner and not any(re.sub(r"[^a-z]", "", x.lower()) in _POS_ABBR for x in inner):
            add(part.replace("(", "").replace(")", ""))       # (be) able to → be able to
        m = re.match(r"(?i)^\s*(to|a|an|the)\s+(.+)$", core)
        if m:
            add(m.group(2))
    return out


def en_norm(s: str) -> str:
    """So khớp từ gõ vào: chữ thường, nháy cong = thẳng, gạch nối = dấu cách, bỏ dấu câu cuối."""
    s = (s or "").replace("’", "'").replace("‘", "'").replace("`", "'").lower()
    s = re.sub(r"[-‐–—_]+", " ", s)
    s = re.sub(r"[^\w' ]+", " ", s)
    return " ".join(s.split()).strip("'")


IRREGULAR = (
    "arise arose arisen|awake awoke awoken|be was/were been|bear bore born/borne|beat beat beaten|"
    "become became become|begin began begun|bend bent bent|bet bet bet|bind bound bound|bite bit bitten|"
    "bleed bled bled|blow blew blown|break broke broken|breed bred bred|bring brought brought|"
    "broadcast broadcast broadcast|build built built|burn burnt/burned burnt/burned|burst burst burst|"
    "buy bought bought|catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|"
    "creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|"
    "dream dreamt/dreamed dreamt/dreamed|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|"
    "feed fed fed|feel felt felt|fight fought fought|find found found|flee fled fled|fly flew flown|"
    "forbid forbade forbidden|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|"
    "get got got/gotten|give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung|"
    "have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|"
    "kneel knelt knelt|know knew known|lay laid laid|lead led led|lean leant/leaned leant/leaned|"
    "learn learnt/learned learnt/learned|leave left left|lend lent lent|let let let|lie lay lain|light lit lit|"
    "lose lost lost|make made made|mean meant meant|meet met met|mistake mistook mistaken|"
    "overcome overcame overcome|pay paid paid|prove proved proven/proved|put put put|quit quit quit|"
    "read read read|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen|"
    "seek sought sought|sell sold sold|send sent sent|set set set|sew sewed sewn|shake shook shaken|"
    "shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|"
    "sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|smell smelt/smelled smelt/smelled|"
    "speak spoke spoken|speed sped sped|spell spelt/spelled spelt/spelled|spend spent spent|spill spilt/spilled spilt/spilled|"
    "spin spun spun|spit spat spat|split split split|spoil spoilt/spoiled spoilt/spoiled|spread spread spread|"
    "spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|"
    "stink stank stunk|strike struck struck|swear swore sworn|sweep swept swept|swell swelled swollen|"
    "swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|"
    "think thought thought|throw threw thrown|understand understood understood|undertake undertook undertaken|"
    "upset upset upset|wake woke woken|wear wore worn|weep wept wept|win won won|wind wound wound|"
    "withdraw withdrew withdrawn|write wrote written|forecast forecast forecast|withstand withstood withstood|"
    "uphold upheld upheld|undergo underwent undergone|oversleep overslept overslept|overtake overtook overtaken"
)
IRREGULAR_PLURAL = {"child": "children", "man": "men", "woman": "women", "person": "people", "foot": "feet",
                    "tooth": "teeth", "mouse": "mice", "goose": "geese", "leaf": "leaves", "life": "lives",
                    "knife": "knives", "wife": "wives", "half": "halves", "wolf": "wolves", "shelf": "shelves",
                    "thief": "thieves", "loaf": "loaves", "potato": "potatoes", "tomato": "tomatoes",
                    "hero": "heroes", "ox": "oxen", "cactus": "cacti", "crisis": "crises", "analysis": "analyses",
                    "phenomenon": "phenomena", "criterion": "criteria", "datum": "data", "medium": "media"}
IRREGULAR_ADJ = {"good": ["better", "best"], "bad": ["worse", "worst"], "far": ["farther", "further", "farthest", "furthest"],
                 "little": ["less", "least"], "many": ["more", "most"], "much": ["more", "most"], "well": ["better", "best"]}


def _irregular() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for row in IRREGULAR.split("|"):
        base, past, pp = row.split(" ")
        forms = past.split("/") + pp.split("/")
        out[base] = [f for f in dict.fromkeys(forms) if f != base]
    return out


IRREGULAR_VERBS = _irregular()
_VOWEL = "aeiou"


def _cvc(w: str) -> bool:
    """stop, plan, big: phụ âm – nguyên âm – phụ âm (gấp đôi phụ âm cuối khi thêm -ed / -ing / -er)."""
    return (len(w) >= 3 and w[-1] not in _VOWEL + "wxy" and w[-2] in _VOWEL and w[-3] not in _VOWEL
            and not (len(w) >= 4 and w[-4] in _VOWEL and w[-3] in _VOWEL))


def inflect(w: str) -> list[str]:
    """Các dạng thường gặp của một từ tiếng Anh (chữ thường): -s/-es/-ies, -ed, -ing, -er/-est, bất quy tắc."""
    w = w.lower()
    out = [w]
    if not re.match(r"^[a-z']+$", w):
        return out
    add = out.append
    add_all = out.extend
    add_all(IRREGULAR_VERBS.get(w, []))
    if w == "be":
        add_all(["am", "is", "are", "being"])
    if w in IRREGULAR_PLURAL:
        add(IRREGULAR_PLURAL[w])
    add_all(IRREGULAR_ADJ.get(w, []))
    cons_y = len(w) >= 2 and w.endswith("y") and w[-2] not in _VOWEL
    # -s / -es / -ies
    if cons_y:
        add(w[:-1] + "ies")
    elif re.search(r"(s|x|z|ch|sh|o)$", w):
        add(w + "es")
    else:
        add(w + "s")
    if w.endswith("fe"):
        add(w[:-2] + "ves")
    elif w.endswith("f"):
        add(w[:-1] + "ves")
    # -ed / -ing / -er / -est
    if w.endswith("ie"):
        add_all([w + "d", w[:-2] + "ying"])
    elif w.endswith("e") and not w.endswith(("ee", "ye", "oe")):
        add_all([w + "d", w[:-1] + "ing", w + "r", w + "st"])
    elif w.endswith(("ye", "oe")):
        add_all([w + "d", w + "ing"])
    elif cons_y:
        add_all([w[:-1] + "ied", w + "ing", w[:-1] + "ier", w[:-1] + "iest"])
    else:
        add_all([w + "ed", w + "ing", w + "er", w + "est"])
        if _cvc(w) or (len(w) >= 2 and w[-1] in "lp" and w[-2] in _VOWEL):
            d = w + w[-1]
            add_all([d + "ed", d + "ing", d + "er", d + "est"])
        if w.endswith("c"):
            add_all([w + "ked", w + "king"])
    if w.endswith("ee"):
        add_all([w + "d", w + "ing"])
    return list(dict.fromkeys(out))


def en_forms(word: str) -> list[str]:
    """Mọi dạng để tìm từ / cụm từ trong câu, dài trước ngắn sau. Cụm từ: chia chữ đầu (động từ) và chữ cuối (danh từ)."""
    out: list[str] = []
    for alt in en_alternatives(word):
        parts = alt.lower().split()
        if not parts:
            continue
        if len(parts) == 1:
            out.extend(inflect(parts[0]))
            continue
        out.append(" ".join(parts))
        for f in inflect(parts[0]):
            out.append(" ".join([f] + parts[1:]))
        for f in inflect(parts[-1]):
            out.append(" ".join(parts[:-1] + [f]))
    out = [f for f in dict.fromkeys(out) if f]
    return sorted(out, key=len, reverse=True)


def find_word(sentence: str, word: str, lang: str = "en") -> tuple[int, int] | None:
    """Vị trí của từ trong câu (không phân biệt hoa thường, theo ranh giới từ). lang="en" thì nhận cả dạng biến đổi."""
    forms = en_forms(word) if lang == "en" else sorted({a.lower() for a in en_alternatives(word)}, key=len, reverse=True)
    if not forms:
        return None
    latin = all(re.match(r"^[\w' ]+$", f) for f in forms)
    body = "|".join(re.escape(f).replace(r"\ ", r"\s+") for f in forms)
    pat = r"(?<![\w'])(?:%s)(?![\w])" % body if latin else "(?:%s)" % body
    m = re.search(pat, sentence, re.I)
    return (m.start(), m.end()) if m else None


_CONTRACTIONS = [
    (r"\bcan't\b", "cannot"), (r"\bcan not\b", "cannot"), (r"\bwon't\b", "will not"), (r"\bshan't\b", "shall not"),
    (r"\bain't\b", "is not"), (r"n't\b", " not"), (r"'re\b", " are"), (r"'ve\b", " have"), (r"'ll\b", " will"),
    (r"\bi'm\b", "i am"), (r"'d\b", " would"), (r"\blet's\b", "let us"),
    (r"\b(he|she|it|that|there|what|where|who|how|here)'s\b", r"\1 is"),
]


def en_words(s: str) -> list[str]:
    """Câu tiếng Anh → các từ để chấm chép chính tả (chữ thường, bỏ dấu câu, mở rút gọn: don't = do not)."""
    s = (s or "").replace("’", "'").replace("‘", "'").replace("`", "'").lower()
    for pat, rep in _CONTRACTIONS:
        s = re.sub(pat, rep, s)
    s = re.sub(r"(?<=\d),(?=\d)", "", s)
    s = re.sub(r"[-‐–—]+", " ", s)
    s = re.sub(r"[^\w' ]+", " ", s)
    return [w.strip("'") for w in s.split() if w.strip("'")]


def latin_words(s: str) -> list[str]:
    """Ngôn ngữ khác: bỏ dấu câu, chữ thường."""
    s = re.sub(r"[^\w ]+", " ", (s or "").lower())
    return s.split()
