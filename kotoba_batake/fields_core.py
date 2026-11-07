"""Cấu hình trường theo loại note (từ bản 1.9) — thuần Python, không import anki.

Mỗi loại note (note type, khoá bằng id) được gán một LOẠI: từ vựng, chữ Hán,
ngữ pháp hoặc khác, và mỗi VAI TRÒ (từ, cách đọc, nghĩa…) được gán một trường.
Loại note chưa cấu hình thì vẫn dùng cách đoán tên trường như các bản trước,
nhưng vườn hiện thông báo mời cấu hình.

Lưu ở khoá riêng KEY trong cấu hình collection (đồng bộ AnkiWeb) nên bản cũ ở
máy khác không đụng tới; khi chưa có collection (test) thì ghi file.

Chế độ trò chơi (vd. Lật cặp: Kanji ↔ Hán Việt) cũng lưu ở đây, theo loại note.

1.17: mỗi loại note còn có NGÔN NGỮ (tiếng Nhật / tiếng Anh / khác) ở khoá cấp trên cùng `lang`
({mid: "ja" | "en" | "other"}, chỉ ghi khi người dùng chọn — chưa chọn thì đoán mỗi lần) và chế độ trò
chơi của tiếng Anh / ngôn ngữ khác ở `games_lang` ({"en": {trò: chế độ}, "other": {…}}). Không đặt trong
`models[mid]` / `games` vì bản ≤ 1.16 dựng lại hai mục đó và sẽ xoá khoá lạ; khoá cấp trên cùng thì được
`keep_foreign` của bản cũ giữ nguyên. Vai trò trường dùng lại mã cũ (`reading` = phiên âm IPA với tiếng Anh).
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

KEY = "kotoba_batake_fields"

KIND_ORDER = ("vocab", "kanji", "grammar", "other")
GAME_KINDS = ("vocab", "kanji", "grammar")      # loại dùng được cho trò chơi
KINDS: dict[str, dict[str, str]] = {
    "vocab": {"name": "Từ vựng", "jp": "単語", "desc": "Mỗi note là một từ: chữ, cách đọc, nghĩa, ví dụ, audio."},
    "kanji": {"name": "Chữ Hán", "jp": "漢字", "desc": "Mỗi note là một chữ Hán: Hán Việt, nghĩa, âm On / Kun."},
    "grammar": {"name": "Ngữ pháp", "jp": "文法", "desc": "Mỗi note là một mẫu ngữ pháp: cấu trúc, nghĩa, ví dụ."},
    "other": {"name": "Khác", "jp": "その他", "desc": "Vẫn mọc thành cây nhưng không dùng cho trò chơi."},
}

# Ngôn ngữ của loại note (1.17). Mục đầu = mặc định (giữ y như các bản trước).
LANGS = ("ja", "en", "other")
LANG_NAMES = {"ja": "Tiếng Nhật", "en": "Tiếng Anh", "other": "Ngôn ngữ khác"}
LANG_KINDS = {"ja": KIND_ORDER, "en": ("vocab", "other"), "other": ("vocab", "other")}
GAME_GROUPS = {"en": "en", "other": "xx"}      # nhóm trò chơi của tiếng Anh / ngôn ngữ khác (games.js)

# Vai trò của từng loại: (mã, nhãn, bắt buộc, gợi ý). Mã giống nhau giữa các loại để game dùng chung.
# 1.17: bỏ "Âm Hán Việt" và "Loại từ" khỏi Từ vựng cho gọn (Hán Việt chỉ còn ở loại Chữ Hán).
ROLES: dict[str, list[tuple[str, str, bool, str]]] = {
    "vocab": [
        ("word", "Từ (Word)", True, "Chữ hiện trên biển cây"),
        ("reading", "Cách đọc (Furigana)", False, "Hiragana / katakana của từ"),
        ("meaning", "Nghĩa", True, "Nghĩa tiếng Việt"),
        ("example", "Câu ví dụ (Example)", False, "Dùng cho Điền vào câu và chép chính tả"),
        ("ex_meaning", "Dịch câu ví dụ", False, "Hiện làm gợi ý khi điền vào câu"),
        ("audio", "Audio của từ", False, "Trường có [sound:…]"),
        ("ex_audio", "Audio câu ví dụ", False, "Đọc cả câu sau khi điền đúng"),
    ],
    "kanji": [
        ("word", "Kanji", True, "Chữ Hán của note"),
        ("hanviet", "Hán Việt", True, "Âm Hán Việt, vd. LỰC"),
        ("meaning", "Nghĩa", False, "Nghĩa tiếng Việt"),
        ("reading", "Âm On (hoặc On/Kun chung)", False, "Nếu deck gộp On và Kun trong một trường thì chọn trường đó"),
        ("kun", "Âm Kun (nếu tách riêng)", False, "Chỉ chọn khi Kun nằm ở trường khác"),
        ("example", "Ví dụ (từ / câu)", False, "Từ ghép hoặc câu có chữ này"),
        ("ex_meaning", "Dịch ví dụ", False, ""),
        ("audio", "Audio", False, "Trường có [sound:…]"),
    ],
    "grammar": [
        ("word", "Cấu trúc", True, "Mẫu ngữ pháp, vd. ～てください"),
        ("meaning", "Nghĩa", True, "Ý nghĩa của mẫu"),
        ("usage", "Cách dùng / ghi chú", False, "Hiện thêm khi bấm vào cây"),
        ("example", "Ví dụ", False, "Câu ví dụ có dùng mẫu này"),
        ("ex_meaning", "Dịch ví dụ", False, ""),
        ("ex_audio", "Audio ví dụ", False, "Dùng cho Nghe câu → chọn mẫu"),
    ],
    "other": [
        ("word", "Chữ hiện trên cây", True, ""),
        ("reading", "Cách đọc", False, ""),
        ("meaning", "Nghĩa", False, ""),
    ],
}
ROLE_IDS = ("word", "reading", "meaning", "hanviet", "kun", "example", "ex_meaning",
            "audio", "ex_audio", "pos", "usage")
# Nhãn riêng khi loại note không phải tiếng Nhật (mã vai trò giữ nguyên)
ROLE_LABELS = {
    "en": {"word": ("Từ (Word)", "vd. apple, look up"),
           "reading": ("Phiên âm (IPA)", "vd. /ˈæp.əl/"),
           "example": ("Câu ví dụ (Example)", "Câu tiếng Anh có dùng từ này")},
    "other": {"word": ("Từ (Word)", "Chữ hiện trên biển cây"),
              "reading": ("Phiên âm / cách đọc", "Nếu deck có")},
}

# Chế độ của từng trò theo loại note (mục đầu = mặc định). games.js có bảng nhãn / cách chơi khớp với bảng này.
GAMES = ("listen", "market", "crow", "memory", "cloze")
GAME_MODES: dict[str, dict[str, list[str]]] = {
    "listen": {"vocab": ["word", "meaning"], "kanji": ["word", "hanviet"], "grammar": ["word"],
               "en": ["word", "meaning"], "xx": ["word", "meaning"]},
    "market": {"vocab": ["mix", "meaning-word", "word-meaning", "reading-word"],
               "kanji": ["hanviet-word", "meaning-word", "word-hanviet", "word-reading", "mix"],
               "grammar": ["mix", "meaning-word", "word-meaning"],
               "en": ["mix", "meaning-word", "word-meaning", "reading-word"], "xx": ["mix", "meaning-word", "word-meaning"]},
    "crow": {"vocab": ["vi", "jp"], "kanji": ["word", "hanviet"], "grammar": [], "en": ["spell"], "xx": []},
    "memory": {"vocab": ["mix", "meaning", "reading"], "kanji": ["hanviet", "meaning", "reading", "mix"],
               "grammar": ["meaning"], "en": ["mix", "meaning", "reading"], "xx": ["mix", "meaning", "reading"]},
    "cloze": {"vocab": ["word"], "kanji": ["word"], "grammar": ["word"], "en": ["word"], "xx": ["word"]},
}

MAX_MODELS = 500
_MID_RE = re.compile(r"^-?\d{1,20}$")


def kinds_view(lang: str = "ja") -> list[dict[str, Any]]:
    """Bảng loại + vai trò gửi cho giao diện (nhãn theo ngôn ngữ)."""
    labels = ROLE_LABELS.get(lang, {})
    out = []
    for k in LANG_KINDS.get(lang, KIND_ORDER):
        roles = []
        for r, lab, req, hint in ROLES[k]:
            lab, hint = labels.get(r, (lab, hint))
            if lang != "ja" and r == "meaning":
                hint = "Nghĩa tiếng Việt"
            roles.append({"id": r, "label": lab, "req": req, "hint": hint})
        desc = KINDS[k]["desc"] if lang == "ja" else (
            "Mỗi note là một từ: chữ, phiên âm, nghĩa, ví dụ, audio." if k == "vocab" else KINDS[k]["desc"])
        out.append(dict(KINDS[k], id=k, desc=desc, roles=roles))
    return out


def langs_view() -> dict[str, Any]:
    return {"order": list(LANGS), "names": LANG_NAMES, "kinds": {lang: kinds_view(lang) for lang in LANGS}}


def required(kind: str) -> list[str]:
    return [r for r, _l, req, _h in ROLES.get(kind, []) if req]


def role_ids(kind: str) -> list[str]:
    return [r for r, _l, _req, _h in ROLES.get(kind, [])]


def _clean_text(v: Any, limit: int) -> str | None:
    if not isinstance(v, str):
        return None
    v = v.strip()
    if not v or len(v) > limit or any(ord(c) < 32 for c in v):
        return None
    return v


def clean_model(raw: Any) -> dict[str, Any] | None:
    """{kind, f: {vai trò: tên trường}, name} hoặc None nếu hỏng."""
    if not isinstance(raw, dict) or raw.get("kind") not in KINDS:
        return None
    kind = raw["kind"]
    allowed = set(role_ids(kind))
    f: dict[str, str] = {}
    src = raw.get("f")
    if isinstance(src, dict):
        for role, name in src.items():
            name = _clean_text(name, 200)
            if role in allowed and name:
                f[role] = name
    out: dict[str, Any] = {"kind": kind, "f": f}
    name = _clean_text(raw.get("name"), 120)
    if name:
        out["name"] = name
    return out


def clean_store(raw: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"models": {}, "games": {}, "lang": {}, "games_lang": {}}
    if not isinstance(raw, dict):
        return out
    langs = raw.get("lang")
    if isinstance(langs, dict):
        for mid, lang in list(langs.items())[:MAX_MODELS]:
            if isinstance(mid, str) and _MID_RE.match(mid) and lang in LANGS:
                out["lang"][mid] = lang
    gl = raw.get("games_lang")
    if isinstance(gl, dict):
        for lang, per in gl.items():
            group = GAME_GROUPS.get(lang)
            if not group or not isinstance(per, dict):
                continue
            keep = {g: m for g, m in per.items() if g in GAME_MODES and m in GAME_MODES[g].get(group, [])}
            if keep:
                out["games_lang"][lang] = keep
    models = raw.get("models")
    if isinstance(models, dict):
        for mid, conf in list(models.items())[:MAX_MODELS]:
            if not isinstance(mid, str) or not _MID_RE.match(mid):
                continue
            c = clean_model(conf)
            if c:
                out["models"][mid] = c
    games = raw.get("games")
    if isinstance(games, dict):
        for game, per in games.items():
            if game not in GAME_MODES or not isinstance(per, dict):
                continue
            keep = {k: m for k, m in per.items() if k in GAME_KINDS and m in GAME_MODES[game].get(k, [])}
            if keep:
                out["games"][game] = keep
    return out


def keep_foreign(store: dict[str, Any], prev: Any) -> dict[str, Any]:
    """Giữ lại khoá lạ của bản sau (vd. bản 2.x thêm mục mới) khi bản này ghi đè."""
    if isinstance(prev, dict):
        for k, v in prev.items():
            if k not in store:
                store[k] = v
    return store


def conf_problem(conf: dict[str, Any] | None, keys: list[str]) -> str | None:
    """Lý do cấu hình không dùng được với các trường hiện có (None = dùng được)."""
    if not conf:
        return "chưa cấu hình"
    for role in required(conf["kind"]):
        name = conf["f"].get(role)
        if not name:
            return "thiếu trường bắt buộc"
        if name not in keys:
            return f"không còn trường “{name}”"
    return None


def validate_save(conf: Any, keys: list[str], lang: str = "ja") -> tuple[dict[str, Any] | None, str]:
    """Kiểm tra cấu hình người dùng gửi lên. Trả về (cấu hình sạch, lỗi)."""
    c = clean_model(conf)
    if not c:
        return None, "Cấu hình không hợp lệ."
    if lang not in LANGS:
        return None, "Ngôn ngữ không hợp lệ."
    if c["kind"] not in LANG_KINDS[lang]:
        return None, "%s chỉ có loại Từ vựng hoặc Khác." % LANG_NAMES[lang]
    labels = {r: ROLE_LABELS.get(lang, {}).get(r, (lab,))[0] for r, lab, _q, _h in ROLES[c["kind"]]}
    for role in required(c["kind"]):
        if not c["f"].get(role):
            return None, f"Cần chọn trường cho “{labels[role]}”."
    for role, name in c["f"].items():
        if name not in keys:
            return None, f"Loại note này không có trường “{name}”."
    return c, ""


# ---------------------------------------------------------------------------
# Đoán loại note
# ---------------------------------------------------------------------------

_GRAMMAR_FIELD = {"ngữ pháp", "ngu phap", "grammar", "文法", "cấu trúc", "cau truc", "structure",
                  "mẫu câu", "mau cau", "文型", "pattern", "grammar point"}
_GRAMMAR_NAME = ("ngữ pháp", "ngu phap", "grammar", "文法", "文型", "mẫu câu")
_KANJI_NAME = ("kanji", "漢字", "chữ hán", "chu han", "hán tự", "han tu")
_ONEKANJI = re.compile(r"^[㐀-鿿豈-﫿々]$")
_ONKUN_FIELD = ("onyomi", "kunyomi", "âm on", "âm kun", "音読み", "訓読み", "on'yomi", "kun'yomi", "on/kun")


_HANGUL = re.compile(r"[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]")
_KANA_ANY = re.compile(r"[\u3041-\u3096\u30a1-\u30fa]")
_CJK_ANY = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
_LATIN = re.compile(r"[A-Za-z]")
_LATIN_ACCENT = re.compile(r"[\u00c0-\u00ff\u0100-\u024f\u1e00-\u1eff]")
_ZH_HINT = ("pinyin", "hanzi", "chinese", "mandarin", "中文", "汉语", "漢語", "拼音", "tiếng trung", "tieng trung")
_KO_HINT = ("korean", "hangul", "한국어", "tiếng hàn")
_EN_HINT = ("english", "ipa", "phonetic", "tiếng anh", "tieng anh", "toeic", "ielts", "oxford")


def guess_lang(name: str, keys: list[str], words: list[str]) -> str:
    """Đoán ngôn ngữ của loại note từ chữ ở trường Từ của vài note mẫu (1.17). Không chắc thì "ja" (như cũ)."""
    # bỏ phiên âm (/…/, […]) và phần sau dấu nối kiểu 「apple - quả táo」 trước khi đếm chữ
    sample = [re.split(r"\s[-–=:]\s|:\s", re.sub(r"/[^/]*/|\[[^\]]*\]", " ", w))[0].strip()
              for w in words if w and w.strip() and w != "?"][:30]
    sample = [w for w in sample if w]
    hints = " ".join([(name or "").lower()] + [k.lower() for k in keys])
    if any(h in hints for h in _ZH_HINT + _KO_HINT):
        return "other"
    if not sample:
        return "en" if any(h in hints for h in _EN_HINT) else "ja"
    n = len(sample)
    kana = sum(1 for w in sample if _KANA_ANY.search(w))
    cjk = sum(1 for w in sample if _CJK_ANY.search(w))
    hangul = sum(1 for w in sample if _HANGUL.search(w))
    latin = sum(1 for w in sample if _LATIN.search(w) and not _KANA_ANY.search(w) and not _CJK_ANY.search(w))
    accent = sum(1 for w in sample if _LATIN_ACCENT.search(w))
    if kana and kana * 5 >= n:
        return "ja"
    if hangul * 2 >= n:
        return "other"
    if cjk * 2 >= n:
        return "ja"                        # chỉ chữ Hán, không kana: deck kanji (giữ cách cũ)
    if latin * 2 >= n:
        if accent * 10 >= n * 3 and not any(h in hints for h in _EN_HINT):
            return "other"                 # nhiều chữ có dấu (tiếng Việt, Pháp, Tây Ban Nha…)
        return "en"
    return "ja"


def guess_kind(name: str, keys: list[str], words: list[str]) -> str:
    """Đoán loại note từ tên loại note, tên trường và vài chữ mẫu."""
    low_name = (name or "").lower()
    lows = [k.strip().lower() for k in keys]
    if any(h in low_name for h in _GRAMMAR_NAME) or any(k in _GRAMMAR_FIELD for k in lows):
        return "grammar"
    sample = [w for w in words if w and w != "?"]
    single = sum(1 for w in sample if _ONEKANJI.match(w))
    mostly_single = bool(sample) and single >= max(1, int(len(sample) * 0.7))
    # deck từ vựng cũng có thể nhiều từ 1 chữ (水, 山…) và có trường Hán Việt → cần thêm dấu hiệu rõ:
    # có trường âm On / Kun, hoặc tên loại note / trường đầu là “Kanji”
    has_onkun = any(k in ("on", "kun") or any(h in k for h in _ONKUN_FIELD) for k in lows)
    named = any(h in low_name for h in _KANJI_NAME) or (bool(lows) and lows[0] in ("kanji", "漢字", "chữ hán", "hán tự"))
    if mostly_single and (has_onkun or named):
        return "kanji"
    return "vocab"


# ---------------------------------------------------------------------------
# Lưu trữ
# ---------------------------------------------------------------------------


class FieldStore:
    """Đọc / ghi cấu hình trường. Có collection thì chỉ dùng collection (khoá KEY)."""

    def __init__(self, path: str, col_getter: Any = None) -> None:
        self.path = path
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def _raw(self) -> Any:
        col = self._col()
        if col is not None:
            try:
                return col.get_config(KEY, None)
            except Exception:
                return None
        try:
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return None

    def load(self) -> dict[str, Any]:
        return clean_store(self._raw())

    def save(self, store: dict[str, Any]) -> None:
        payload = keep_foreign(clean_store(store), self._raw())
        col = self._col()
        if col is not None:
            col.set_config(KEY, payload)
            return
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        os.replace(tmp, self.path)

    def set_model(self, mid: str, conf: dict[str, Any], lang: str | None = None) -> dict[str, Any]:
        store = self.load()
        store["models"][str(mid)] = conf
        if lang in LANGS:
            store["lang"][str(mid)] = lang
        self.save(store)
        return self.load()

    def set_game(self, game: str, group: str, mode: str) -> dict[str, Any]:
        """group: loại note tiếng Nhật (vocab / kanji / grammar) hoặc nhóm ngôn ngữ (en / xx) như games.js."""
        if game not in GAME_MODES or mode not in GAME_MODES[game].get(group, []):
            raise ValueError("chế độ trò chơi không hợp lệ")
        store = self.load()
        if group in GAME_KINDS:
            store["games"].setdefault(game, {})[group] = mode
        else:
            lang = next(k for k, v in GAME_GROUPS.items() if v == group)
            store["games_lang"].setdefault(lang, {})[game] = mode
        self.save(store)
        return self.load()
