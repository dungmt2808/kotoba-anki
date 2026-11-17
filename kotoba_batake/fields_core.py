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

1.32: thêm tiếng Trung / tiếng Hàn ("zh" / "ko"). Bản ≤ 1.31 chỉ biết ja / en / other và làm sạch mục `lang`,
`models[mid].f`, `games_lang` theo danh sách của nó (bỏ giá trị lạ) → lưu theo cách bản cũ hiểu được:
`lang[mid] = "other"` (bản cũ chạy như "Ngôn ngữ khác") + `lang2[mid] = "zh" | "ko"`; vai trò chỉ tiếng Trung / Hàn mới
có (Hán Việt của loại Từ vựng) ở `f2[mid]`; chế độ trò chơi của zh / ko ở `games_lang2`. Ba khoá mới nằm ở cấp trên cùng
nên bản cũ giữ nguyên khi ghi đè (`keep_foreign`). Bản cũ đổi `lang[mid]` sang khác "other" thì lựa chọn đó thắng.
Bản ≤ 1.31 chỉ cho chọn "Ngôn ngữ khác" cho deck tiếng Trung / Hàn → `lang[mid] = "other"` lưu từ bản cũ không có nghĩa là
người dùng muốn "Ngôn ngữ khác": 1.32 vẫn đoán (deck đoán ra zh / ko thì dùng zh / ko — `effective_lang`). Chọn "Ngôn ngữ
khác" ở 1.32 thì ghi thêm `lang2[mid] = "other"` (giữ đúng lựa chọn đó; trong add-on là danh sách `fixed`).
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

try:   # chạy trong Anki (gói add-on)
    from . import backup_core as backup
except ImportError:   # test: thư mục add-on nằm trong sys.path, hoặc nạp riêng file này
    try:
        import backup_core as backup  # type: ignore[no-redef]
    except ImportError:
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location(
            "kotoba_backup_core", os.path.join(os.path.dirname(os.path.abspath(__file__)), "backup_core.py"))
        backup = _ilu.module_from_spec(_spec)  # type: ignore[assignment]
        _spec.loader.exec_module(backup)  # type: ignore[union-attr]

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
LANGS = ("ja", "en", "zh", "ko", "other")
OLD_LANGS = ("ja", "en", "other")              # bản ≤ 1.31 hiểu được (khoá lang)
NEW_LANGS = ("zh", "ko")                       # 1.32: lưu ở khoá lang2
LANG_NAMES = {"ja": "Tiếng Nhật", "en": "Tiếng Anh", "zh": "Tiếng Trung", "ko": "Tiếng Hàn", "other": "Ngôn ngữ khác"}
LANG_KINDS = {"ja": KIND_ORDER, "en": ("vocab", "other"), "zh": ("vocab", "kanji", "other"), "ko": ("vocab", "other"),
              "other": ("vocab", "other")}
GAME_GROUPS = {"en": "en", "other": "xx", "zh": "zh", "ko": "ko"}      # nhóm trò chơi theo ngôn ngữ (games.js)
# Chữ trang trí cạnh tên loại (Từ vựng 単語 / 词汇 / 단어)
KIND_JP = {"en": {"vocab": "Vocabulary", "other": "Other"}, "zh": {"vocab": "词汇", "kanji": "汉字", "other": "其他"},
           "ko": {"vocab": "단어", "other": "기타"}, "other": {"vocab": "", "other": ""}}

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
# 1.32: vai trò thêm theo ngôn ngữ (chèn sau Nghĩa) — bản cũ không biết → lưu ở f2
EXTRA_ROLES: dict[tuple[str, str], list[tuple[str, str, bool, str]]] = {
    ("zh", "vocab"): [("hanviet", "Hán Việt (nếu có)", False, "vd. 学生 → HỌC SINH")],
    ("ko", "vocab"): [("hanviet", "Hán Việt (nếu có)", False, "vd. 학교 → HỌC HIỆU")],
}
# vai trò không dùng với ngôn ngữ đó
SKIP_ROLES: dict[tuple[str, str], tuple[str, ...]] = {("zh", "kanji"): ("kun",)}
# Nhãn riêng khi loại note không phải tiếng Nhật (mã vai trò giữ nguyên)
ROLE_LABELS = {
    "en": {"word": ("Từ (Word)", "vd. apple, look up"),
           "reading": ("Phiên âm (IPA)", "vd. /ˈæp.əl/"),
           "example": ("Câu ví dụ (Example)", "Câu tiếng Anh có dùng từ này")},
    "other": {"word": ("Từ (Word)", "Chữ hiện trên biển cây"),
              "reading": ("Phiên âm / cách đọc", "Nếu deck có")},
    "zh": {"word": ("Từ (chữ Hán)", "Chữ hiện trên biển cây · giản thể hoặc phồn thể"),
           "reading": ("Pinyin", "vd. nǐ hǎo · deck ghi số (ni3 hao3) cũng được"),
           "example": ("Câu ví dụ (Example)", "Câu tiếng Trung có dùng từ này"),
           "audio": ("Audio của từ", "Không có thì đọc bằng giọng tiếng Trung của máy")},
    "ko": {"word": ("Từ (Hangul)", "Chữ hiện trên biển cây"),
           "reading": ("Phiên âm (romaja)", "Nếu deck có, vd. annyeonghaseyo"),
           "example": ("Câu ví dụ (Example)", "Câu tiếng Hàn có dùng từ này"),
           "audio": ("Audio của từ", "Không có thì đọc bằng giọng tiếng Hàn của máy")},
}
ROLE_LABELS_KIND = {("zh", "kanji"): {"word": ("Chữ Hán", "Một chữ của note"), "reading": ("Pinyin", "vd. xué")}}

# Chế độ của từng trò theo loại note (mục đầu = mặc định). games.js có bảng nhãn / cách chơi khớp với bảng này.
GAMES = ("listen", "market", "crow", "memory", "cloze")
GAME_MODES: dict[str, dict[str, list[str]]] = {
    "listen": {"vocab": ["word", "meaning"], "kanji": ["word", "hanviet"], "grammar": ["word"],
               "en": ["word", "meaning"], "xx": ["word", "meaning"], "zh": ["word", "meaning"], "ko": ["word", "meaning"]},
    "market": {"vocab": ["mix", "meaning-word", "word-meaning", "reading-word"],
               "kanji": ["hanviet-word", "meaning-word", "word-hanviet", "word-reading", "mix"],
               "grammar": ["mix", "meaning-word", "word-meaning"],
               "en": ["mix", "meaning-word", "word-meaning", "reading-word"], "xx": ["mix", "meaning-word", "word-meaning"],
               "zh": ["mix", "meaning-word", "word-meaning", "reading-word", "hanviet-word"],
               "ko": ["mix", "meaning-word", "word-meaning", "reading-word"]},
    "crow": {"vocab": ["vi", "jp"], "kanji": ["word", "hanviet"], "grammar": [], "en": ["spell"], "xx": ["spell", "answer"],
             "zh": ["pinyin", "spell", "answer"], "ko": ["spell", "answer"]},
    "memory": {"vocab": ["mix", "meaning", "reading"], "kanji": ["hanviet", "meaning", "reading", "mix"],
               "grammar": ["meaning"], "en": ["mix", "meaning", "reading"], "xx": ["mix", "meaning", "reading"],
               "zh": ["mix", "meaning", "reading", "hanviet"], "ko": ["mix", "meaning", "reading"]},
    "cloze": {"vocab": ["word"], "kanji": ["word"], "grammar": ["word"], "en": ["word"], "xx": ["word"], "zh": ["word"],
              "ko": ["word"]},
}

MAX_MODELS = 500
_MID_RE = re.compile(r"^-?\d{1,20}$")


def roles_for(kind: str, lang: str = "ja") -> list[tuple[str, str, bool, str]]:
    """Vai trò của loại note theo ngôn ngữ (1.32: thêm Hán Việt cho từ vựng tiếng Trung / Hàn, bỏ Âm Kun với tiếng Trung)."""
    base = [r for r in ROLES.get(kind, []) if r[0] not in SKIP_ROLES.get((lang, kind), ())]
    extra = EXTRA_ROLES.get((lang, kind), [])
    if not extra:
        return base
    at = next((i + 1 for i, r in enumerate(base) if r[0] == "meaning"), len(base))
    return base[:at] + extra + base[at:]


def kinds_view(lang: str = "ja") -> list[dict[str, Any]]:
    """Bảng loại + vai trò gửi cho giao diện (nhãn theo ngôn ngữ)."""
    out = []
    for k in LANG_KINDS.get(lang, KIND_ORDER):
        labels = dict(ROLE_LABELS.get(lang, {}), **ROLE_LABELS_KIND.get((lang, k), {}))
        roles = []
        for r, lab, req, hint in roles_for(k, lang):
            lab, hint = labels.get(r, (lab, hint))
            if lang != "ja" and r == "meaning":
                hint = "Nghĩa tiếng Việt"
            roles.append({"id": r, "label": lab, "req": req, "hint": hint})
        desc = KINDS[k]["desc"] if lang == "ja" or k == "kanji" else (
            "Mỗi note là một từ: chữ, phiên âm, nghĩa, ví dụ, audio." if k == "vocab" else KINDS[k]["desc"])
        if lang == "zh" and k == "kanji":
            desc = "Mỗi note là một chữ Hán: Hán Việt, nghĩa, pinyin."
        jp = KIND_JP.get(lang, {}).get(k, KINDS[k]["jp"])
        out.append(dict(KINDS[k], id=k, desc=desc, roles=roles, jp=jp))
    return out


def langs_view() -> dict[str, Any]:
    return {"order": list(LANGS), "names": LANG_NAMES, "kinds": {lang: kinds_view(lang) for lang in LANGS}}


def required(kind: str) -> list[str]:
    return [r for r, _l, req, _h in ROLES.get(kind, []) if req]


def role_ids(kind: str, lang: str | None = None) -> list[str]:
    """Mã vai trò của loại note. lang = None: như bản ≤ 1.31 (không có vai trò thêm của 1.32)."""
    if lang is None:
        return [r for r, _l, _req, _h in ROLES.get(kind, [])]
    return [r for r, _l, _req, _h in roles_for(kind, lang)]


def _clean_text(v: Any, limit: int) -> str | None:
    if not isinstance(v, str):
        return None
    v = v.strip()
    if not v or len(v) > limit or any(ord(c) < 32 for c in v):
        return None
    return v


def clean_model(raw: Any, lang: str | None = None) -> dict[str, Any] | None:
    """{kind, f: {vai trò: tên trường}, name} hoặc None nếu hỏng."""
    if not isinstance(raw, dict) or not isinstance(raw.get("kind"), str) or raw.get("kind") not in KINDS:   # 1.25.3: sai kiểu → bỏ
        return None
    kind = raw["kind"]
    allowed = set(role_ids(kind, lang)) | set(role_ids(kind))
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
    """Dạng dùng trong add-on: lang gộp cả zh / ko (từ lang2), f của model gộp vai trò thêm (từ f2), games_lang gộp
    games_lang2. Ghi ra thì tách lại bằng to_raw()."""
    out: dict[str, Any] = {"models": {}, "games": {}, "lang": {}, "games_lang": {}, "fixed": []}
    if not isinstance(raw, dict):
        return out
    langs = raw.get("lang")
    if isinstance(langs, dict):
        for mid, lang in list(langs.items())[:MAX_MODELS]:
            if isinstance(mid, str) and _MID_RE.match(mid) and lang in LANGS:
                out["lang"][mid] = lang
    langs2 = raw.get("lang2")          # 1.32: zh / ko — chỉ khi bản cũ chưa đổi lang[mid] sang ngôn ngữ khác
    if isinstance(langs2, dict):
        for mid, lang in list(langs2.items())[:MAX_MODELS]:
            if not (isinstance(mid, str) and _MID_RE.match(mid)) or out["lang"].get(mid, "other") != "other":
                continue
            if lang in NEW_LANGS:
                out["lang"][mid] = lang
            elif lang == "other" and out["lang"].get(mid) == "other":
                out["fixed"].append(mid)        # "Ngôn ngữ khác" chọn ở 1.32+: không đoán lại
    fixed = raw.get("fixed")             # dạng trong add-on (to_raw / set_model gọi lại clean_store)
    if isinstance(fixed, list):
        for mid in fixed[:MAX_MODELS]:
            if isinstance(mid, str) and out["lang"].get(mid) == "other" and mid not in out["fixed"]:
                out["fixed"].append(mid)
    for key in ("games_lang", "games_lang2"):
        gl = raw.get(key)
        if not isinstance(gl, dict):
            continue
        for lang, per in gl.items():
            group = GAME_GROUPS.get(lang)
            if not group or not isinstance(per, dict):
                continue
            keep = {g: m for g, m in per.items() if g in GAME_MODES and m in GAME_MODES[g].get(group, [])}
            if keep:
                out["games_lang"].setdefault(lang, {}).update(keep)
    models = raw.get("models")
    f2 = raw.get("f2") if isinstance(raw.get("f2"), dict) else {}
    if isinstance(models, dict):
        for mid, conf in list(models.items())[:MAX_MODELS]:
            if not isinstance(mid, str) or not _MID_RE.match(mid):
                continue
            lang = out["lang"].get(mid)
            if isinstance(conf, dict) and isinstance(f2.get(mid), dict) and isinstance(conf.get("f"), dict):
                conf = dict(conf, f=dict(f2[mid], **conf["f"]))
            c = clean_model(conf, lang)
            if c:
                extra = {r for r, _l, _q, _h in EXTRA_ROLES.get((lang or "", c["kind"]), [])}
                base = set(role_ids(c["kind"]))
                c["f"] = {r: n for r, n in c["f"].items() if r in base or r in extra}
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


def to_raw(store: dict[str, Any]) -> dict[str, Any]:
    """1.32: dạng lưu trong collection — bản ≤ 1.31 đọc phần cũ như trước (zh / ko là "other"), phần mới ở lang2 / f2 /
    games_lang2. Luôn có đủ ba khoá mới (kể cả rỗng) để keep_foreign không mang lại giá trị cũ."""
    st = clean_store(store)
    out: dict[str, Any] = {"models": {}, "games": st["games"], "lang": {}, "games_lang": {}, "lang2": {}, "f2": {},
                           "games_lang2": {}}
    for mid, lang in st["lang"].items():
        if lang in NEW_LANGS:
            out["lang"][mid] = "other"
            out["lang2"][mid] = lang
        else:
            out["lang"][mid] = lang
            if lang == "other" and mid in st["fixed"]:
                out["lang2"][mid] = "other"
    for mid, conf in st["models"].items():
        base = set(role_ids(conf["kind"]))
        old = {r: n for r, n in conf["f"].items() if r in base}
        new = {r: n for r, n in conf["f"].items() if r not in base}
        out["models"][mid] = dict(conf, f=old)
        if new:
            out["f2"][mid] = new
    for lang, per in st["games_lang"].items():
        out["games_lang2" if lang in NEW_LANGS else "games_lang"][lang] = per
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
    if lang not in LANGS:
        return None, "Ngôn ngữ không hợp lệ."
    c = clean_model(conf, lang)
    if not c:
        return None, "Cấu hình không hợp lệ."
    if c["kind"] not in LANG_KINDS[lang]:
        ks = [KINDS[k]["name"] for k in LANG_KINDS[lang]]
        names = ", ".join(ks[:-1]) + " hoặc " + ks[-1] if len(ks) > 1 else ks[0]
        return None, "%s chỉ có loại %s." % (LANG_NAMES[lang], names)
    allowed = set(role_ids(c["kind"], lang))
    c["f"] = {r: n for r, n in c["f"].items() if r in allowed}
    lab_map = dict(ROLE_LABELS.get(lang, {}), **ROLE_LABELS_KIND.get((lang, c["kind"]), {}))
    labels = {r: lab_map.get(r, (lab,))[0] for r, lab, _q, _h in roles_for(c["kind"], lang)}
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
# 1.31.4: chữ Hán chỉ có ở tiếng Trung — giản thể rồi phồn thể — mà tiếng Nhật hiện đại không dùng (tiếng Nhật viết 這 / 説 /
# 時 thay cho 这 / 说 / 时; chữ hai bên viết giống nhau như 学, 国, 写 không có ở đây). Trước đây deck tiếng Trung để loại note tên
# chung ("Basic", trường Front / Back) bị đoán là deck chữ Hán tiếng Nhật vì không có kana. Chỉ gồm chữ hay gặp ở HSK 1–3.
_ZH_ONLY = re.compile("[们这说么吗呢吧你她谁对还让进过时东车门问间见长书买卖话语认识习题练读汉欢饭馆钱银铁飞谢请爱电脑视开"
                      "关头发现实动应该经济务员业样种难边气热鱼鸡马鸟爸妈怎桌师兴钟块岁觉听给级红绿页两从乐场运远词课网"
                      "贵节绍张处办帮备错别诉试结离讲"
                      "們說麼嗎妳對讓學國會來讀賣腦關發實應經濟樣點邊氣雞廣歲聽從兩覺綠]")
_JA_HINT = ("japanese", "nihongo", "日本語", "tiếng nhật", "tieng nhat", "jlpt", "furigana", "kana", "kanji", "漢字")


def effective_lang(store: dict[str, Any] | None, mid: str, guessed: str | None) -> str | None:
    """1.32: ngôn ngữ dùng cho loại note: người dùng đã chọn; riêng "other" lưu từ bản ≤ 1.31 (bản cũ chưa có tiếng Trung /
    Hàn) mà deck đoán ra zh / ko thì dùng zh / ko. None = chưa chọn (dùng ngôn ngữ đoán được)."""
    st = store or {}
    chosen = (st.get("lang") or {}).get(mid)
    if chosen not in LANGS:
        return None
    if chosen == "other" and mid not in (st.get("fixed") or ()) and guessed in NEW_LANGS:
        return guessed
    return chosen


def guess_lang(name: str, keys: list[str], words: list[str]) -> str:
    """Đoán ngôn ngữ của loại note từ chữ ở trường Từ của vài note mẫu (1.17). Không chắc thì "ja" (như cũ)."""
    # bỏ phiên âm (/…/, […]) và phần sau dấu nối kiểu 「apple - quả táo」 trước khi đếm chữ
    sample = [re.split(r"\s[-–=:]\s|:\s", re.sub(r"/[^/]*/|\[[^\]]*\]", " ", w))[0].strip()
              for w in words if w and w.strip() and w != "?"][:30]
    sample = [w for w in sample if w]
    hints = " ".join([(name or "").lower()] + [k.lower() for k in keys])
    if any(h in hints for h in _KO_HINT):
        return "ko"                        # 1.32: trước 1.32 là "other"
    if any(h in hints for h in _ZH_HINT):
        return "zh"
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
        return "ko"
    if cjk * 2 >= n:
        # 1.31.4: chỉ chữ Hán, không kana mà có chữ chỉ tiếng Trung mới dùng (≥ 10 % số từ, ít nhất 2 từ) → tiếng Trung
        # ("Ngôn ngữ khác"); tên loại note / trường có dấu hiệu tiếng Nhật thì vẫn là tiếng Nhật
        zh = sum(1 for w in sample if _ZH_ONLY.search(w))
        if not kana and zh >= min(2, n) and zh * 10 >= n and not any(h in hints for h in _JA_HINT):
            return "zh"
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
        payload = keep_foreign(to_raw(store), self._raw())
        col = self._col()
        if col is not None:
            backup.put_config(col, KEY, payload)
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
            fixed = [m for m in store.get("fixed") or [] if m != str(mid)]
            store["fixed"] = fixed + ([str(mid)] if lang == "other" else [])
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
