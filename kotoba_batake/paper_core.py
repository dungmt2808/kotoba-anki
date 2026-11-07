"""Báo 畑新聞 và chép chính tả hằng ngày cho ことば畑 (bản 1.6).

Báo do bộ `kotoba_daily` (Claude Code chạy mỗi sáng) viết ra thư mục:
    <bao_dir>/bao/<YYYY-MM-DD>/bao.json      nội dung số báo
    <bao_dir>/bao/<YYYY-MM-DD>/audio/...     giọng đọc VOICEVOX (tuỳ chọn)
    <bao_dir>/pham_vi.json                   từ vựng, mẫu câu đã học (để tra nghĩa)
Add-on chỉ đọc các file đó (coi là dữ liệu không tin cậy) và ghi lại đúng một file
    <bao_dir>/tien_do.json                   từ sắp héo, từ chép sai, số báo chưa đọc
để số báo hôm sau nhắc lại đúng chỗ bạn yếu.

File này không import aqt (test được bằng gói `anki`). Trạng thái đã đọc / chép chính tả
lưu ở khoá cấu hình collection riêng PAPER_KEY (đồng bộ AnkiWeb), tách khỏi ví để bản cũ
của add-on trên máy khác không xoá mất.
"""

from __future__ import annotations

import datetime
import json
import os
import random
import re
from typing import Any, Callable

try:
    from . import garden_core as core
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import garden_core as core  # type: ignore[no-redef]
text = core.text      # 1.17: chuẩn hoá chữ (furigana, tiếng Anh) — text_core

PAPER_KEY = "kotoba_batake_paper"
PAPER_KEY_EN = "kotoba_batake_paper_en"   # 1.19: báo tiếng Anh (số đã đọc / câu đã làm theo ngày, tách khỏi báo tiếng Nhật)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
AUDIO_RE = re.compile(r"^audio/[A-Za-z0-9_.-]{1,80}\.(?:wav|mp3|ogg|m4a)$")
MAX_JSON = 1_000_000
MAX_ISSUES = 500

Q_COINS = 2            # mỗi câu hỏi đúng ngay lần đầu
CT_COINS = 2           # mỗi câu chép chính tả đúng ngay lần đầu
ISSUE_BONUS = 5        # làm hết phần luyện tập của một số báo
DICT_COINS = 2         # mỗi câu trong lượt chép chính tả hằng ngày
DICT_BONUS = 5         # làm hết lượt hằng ngày
DICT_SIZE = 5
DICT_REVIEW_MAX = 2    # tối đa số câu chép sai đến hạn ôn trong lượt hằng ngày
DICT_PAPER_MAX = 4     # tối đa số câu lấy từ báo; câu ví dụ trong deck chỉ lấp chỗ còn trống
REVIEW_STEPS = (1, 3, 7)   # câu chép sai quay lại sau 1, 3, 7 ngày; đúng đủ 3 lần thì thôi
MISS_DAYS = 14             # từ chép sai trong 14 ngày gần nhất được gửi sang báo
LOAI = ("tin_lang", "truyen", "thong_bao", "cot", "tin_that")


class PaperError(ValueError):
    """Lỗi hiển thị được cho người dùng (câu tiếng Việt)."""


# ---------------------------------------------------------------------------
# Cú pháp furigana của gói báo:  [漢字|かんじ]   {表記|よみ|từ gốc}
# ---------------------------------------------------------------------------

TOKEN_RE = re.compile(
    r"\{([^{}\[\]|]*)\|([^{}\[\]|]*)\|([^{}\[\]|]*)\}"
    r"|\[([^{}\[\]|]*)\|([^{}\[\]|]*)\]"
)
KANJI_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005\u3006]")
PUNCT_RE = re.compile(r"[\s\u3000。、．，！？!?.,「」『』（）()…・〜～\"']")
JP_GAP_RE = re.compile(r"(?<=[\u3040-\u30ff\u3400-\u9fff\uff01-\uff5e。、「」])\s+"
                       r"|\s+(?=[\u3040-\u30ff\u3400-\u9fff\uff01-\uff5e。、「」])")


def tokenize(text: str) -> list[tuple[str, ...]]:
    out: list[tuple[str, ...]] = []
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


def surface(text: str) -> str:
    return "".join(t[1] for t in tokenize(text))


def kana(text: str) -> str:
    return "".join(t[1] if t[0] == "plain" else (t[2] or t[1]) for t in tokenize(text))


def keys(text: str) -> list[str]:
    return [t[3] for t in tokenize(text) if t[0] == "word"]


def to_hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "\u30a1" <= c <= "\u30f6" else c for c in s)


def norm_answer(s: str) -> str:
    return to_hira(PUNCT_RE.sub("", s or ""))


def norm_key(s: str) -> str:
    s = (s or "").strip().lstrip("〜～")
    if s.endswith("する") and len(s) > 2:
        s = s[:-2]
    return s


# Từ nhiều cách đọc / số đếm: gửi cho giọng đọc bằng kana để khỏi đọc sai
RISKY_READ = {"今日", "明日", "昨日", "一日", "一人", "二人", "何", "方", "上手", "下手", "大人", "今朝", "今年",
              "一月", "人気", "市場", "日", "月", "上", "下", "生"}


def speech_text(markup: str) -> str:
    """Chữ gửi cho giọng đọc (Gemini TTS hoặc giọng của máy): giữ chữ Hán để đúng ngữ điệu,
    trừ số đếm / từ nhiều cách đọc thì dùng kana."""
    out = []
    for t in tokenize(markup or ""):
        if t[0] == "plain":
            out.append(t[1])
        elif t[2] and (re.search(r"\d", t[1]) or t[1] in RISKY_READ):
            out.append(t[2])
        else:
            out.append(t[1])
    return "".join(out).replace("◆", "").strip()


class Voice:
    """Giọng đọc dự phòng cho câu / từ không có file audio (1.13). __init__.py dựng mỗi lần cần.

    cached(speech) -> (bản thường, bản chậm | None): giọng Gemini đã tạo sẵn trong user_files, hoặc None
    tts: máy có giọng tiếng Nhật của hệ điều hành (Anki phát bằng TTSTag, đọc chậm được)
    gen: hôm nay còn nhờ Gemini tạo giọng đọc được (có khoá, chưa hết hạn mức giọng đọc)
    mpv: trình phát của Anki là mpv (phát chậm được cả file audio của deck)
    Thứ tự: file có sẵn → giọng Gemini đã tạo → giọng của máy (phát ngay, trong lúc đó vẫn nhờ Gemini tạo bản
    hay hơn nếu có khoá) → nhờ Gemini tạo (chờ một lát).
    """

    def __init__(self, cached: Callable[[str], Any] | None = None, tts: bool = False,
                 gen: bool = False, mpv: bool = False, tts_en: bool = False) -> None:
        self.cached = cached or (lambda speech: None)
        self.tts = tts            # giọng tiếng Nhật của máy
        self.tts_en = tts_en      # 1.17: giọng tiếng Anh của máy
        self.gen = gen
        self.mpv = mpv

    def how(self, markup: str, lang: str = "ja") -> tuple[str | None, bool, Any]:
        """(cách phát, có bản chậm, dữ liệu) cho một câu không có file audio. Ngôn ngữ khác: chỉ audio của deck."""
        if lang not in ("ja", "en"):
            return None, False, None
        speech = speech_text(markup)
        if not speech:
            return None, False, None
        try:
            hit = self.cached(speech)
        except Exception:
            hit = None
        if hit and hit[0]:
            return "cache", bool(hit[1]) or self.mpv, hit
        if lang == "ja" and self.tts:
            return "tts", True, speech
        if lang == "en" and self.tts_en:
            return "tts_en", True, speech
        if self.gen:
            return "gen", False, speech
        return None, False, None

    def wants(self, how: str | None) -> bool:
        """Có nên nhờ Gemini tạo giọng đọc cho câu đang phát bằng cách `how` không."""
        return bool(self.gen and how in ("tts", "tts_en", "gen"))

    def any(self, lang: str = "ja") -> bool:
        if lang == "en":
            return bool(self.tts_en or self.gen)
        if lang != "ja":
            return False
        return bool(self.tts or self.gen)


NO_VOICE = Voice()


def anki_to_markup(raw: str) -> tuple[str, bool]:
    """Câu ví dụ kiểu Anki 「私[わたし]は 学生[がくせい]です」 → cú pháp của báo.

    Trả về (chuỗi đánh dấu, có đủ cách đọc cho mọi chữ Hán hay không).
    """
    text = core._clean_example(raw)
    parts: list[str] = []
    complete = True
    for base, ruby in core.furigana_tokens(text):
        base = base.replace("|", "").replace("{", "").replace("}", "")
        if ruby and KANJI_RE.search(base):
            ruby = re.sub(r"[\[\]{}|]", "", ruby)
            parts.append("[%s|%s]" % (base, ruby))
        else:
            seg = base.replace("[", "").replace("]", "")
            if KANJI_RE.search(seg):
                complete = False
            parts.append(seg)
    joined = "".join(parts)
    # bỏ khoảng trắng dùng để tách furigana giữa các chữ Nhật
    out: list[str] = []
    for t in tokenize(joined):
        out.append(JP_GAP_RE.sub("", t[1]) if t[0] == "plain" else
                   ("[%s|%s]" % (t[1], t[2]) if t[0] == "ruby" else "{%s|%s|%s}" % t[1:]))
    return "".join(out).strip(), complete


# ---------------------------------------------------------------------------
# Thư mục báo (kotoba_daily)
# ---------------------------------------------------------------------------


def resolve_dir(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    path = os.path.abspath(os.path.expanduser(value.strip()))
    return path if os.path.isdir(path) else None


def _read_json(path: str, limit: int = MAX_JSON) -> Any:
    if os.path.getsize(path) > limit:
        raise PaperError("File %s lớn quá." % os.path.basename(path))
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _s(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:limit]


def _list(value: Any, limit: int) -> list[Any]:
    return value[:limit] if isinstance(value, list) else []


def _int(value: Any, lo: int, hi: int) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if lo <= value <= hi else None


def clean_issue(raw: Any, date: str) -> dict[str, Any]:
    """Chỉ giữ đúng các trường cần dùng, đúng kiểu, độ dài có giới hạn."""
    if not isinstance(raw, dict):
        raise PaperError("Số báo %s sai định dạng." % date)
    arts = []
    for b in _list(raw.get("bai"), 6):
        if not isinstance(b, dict):
            continue
        doan = [p for p in (_s(x, 1500) for x in _list(b.get("doan"), 12)) if p]
        title = _s(b.get("tieu_de"), 200)
        if not doan and not title:
            continue
        nguon = _s(b.get("nguon"), 400)
        arts.append({
            "loai": b.get("loai") if b.get("loai") in LOAI else "tin_lang",
            "tieu_de": title,
            "doan": doan,
            "ky": _int(b.get("ky"), 1, 100000),
            "ky_truoc": _s(b.get("ky_truoc"), 300),
            "nguon": nguon if re.match(r"^https?://", nguon) else "",
        })
    if not arts:
        raise PaperError("Số báo %s không có bài nào." % date)
    qs = []
    for q in _list(raw.get("cau_hoi"), 4):
        if not isinstance(q, dict):
            continue
        chon = [_s(o, 200) for o in _list(q.get("chon"), 4)]
        dung = _int(q.get("dung"), 0, len(chon) - 1)
        if len(chon) < 2 or not all(chon) or dung is None or not _s(q.get("hoi"), 300):
            continue
        qs.append({"hoi": _s(q.get("hoi"), 300), "chon": chon, "dung": dung, "giai_thich": _s(q.get("giai_thich"), 300)})
    cts = []
    for c in _list(raw.get("chinh_ta"), 4):
        if not isinstance(c, dict) or not _s(c.get("cau"), 120):
            continue
        cts.append({"cau": _s(c.get("cau"), 120),
                    "them": [_s(x, 120) for x in _list(c.get("them_dap_an"), 6) if _s(x, 120)]})
    new_words = []
    for w in _list(raw.get("tu_moi"), 6):
        if isinstance(w, dict) and _s(w.get("w"), 40):
            new_words.append({"w": _s(w.get("w"), 40), "r": _s(w.get("r"), 60), "m": _s(w.get("m"), 120)})
    mau = [_s(x, 80) for x in _list(raw.get("mau_cau"), 10) if _s(x, 80)]
    return {
        "ngay": date,
        "so": _int(raw.get("so"), 1, 1_000_000) or 0,
        "rut_gon": bool(raw.get("rut_gon")),
        "bai": arts,
        "cau_hoi": qs,
        "chinh_ta": cts,
        "mau_cau": mau,
        "tu_moi": new_words,
        "tom_tat": _s(raw.get("tom_tat"), 400),
        # 1.12: ai viết số này (báo do Gemini viết ghi "Gemini (<model>)"; trống = bộ kotoba_daily / Claude)
        "may_viet": _s(raw.get("may_viet"), 60) if re.match(r"^[\w .()\-:/]*$", _s(raw.get("may_viet"), 60)) else "",
        # 1.19: ngôn ngữ của số báo (bản tiếng Anh ghi "ngon_ngu": "en")
        "lang": "en" if raw.get("ngon_ngu") == "en" else "ja",
    }


class Library:
    """Đọc thư mục kotoba_daily. Có bộ nhớ đệm theo thời gian sửa file."""

    def __init__(self, base: str, lang: str = "ja") -> None:
        self.base = base
        self.lang = lang          # 1.19: ngôn ngữ của thư mục báo (bao_gemini_en: "en")
        self._cache: dict[str, tuple[float, int, Any]] = {}

    def _cached(self, path: str, build: Callable[[], Any]) -> Any:
        st = os.stat(path)
        hit = self._cache.get(path)
        if hit and hit[0] == st.st_mtime and hit[1] == st.st_size:
            return hit[2]
        value = build()
        self._cache[path] = (st.st_mtime, st.st_size, value)
        return value

    def _issue_dir(self, date: str) -> str:
        if not DATE_RE.match(date or ""):
            raise PaperError("Ngày không hợp lệ.")
        return os.path.join(self.base, "bao", date)

    def issues(self) -> list[str]:
        root = os.path.join(self.base, "bao")
        try:
            names = os.listdir(root)
        except OSError:
            return []
        out = [n for n in names if DATE_RE.match(n) and os.path.isfile(os.path.join(root, n, "bao.json"))]
        # chỉ giữ số đọc được (số hỏng không làm hòm thư báo "có thư" mãi)
        return [n for n in sorted(out, reverse=True)[:MAX_ISSUES] if self.try_issue(n) is not None]

    def issue(self, date: str) -> dict[str, Any]:
        path = os.path.join(self._issue_dir(date), "bao.json")
        if not os.path.isfile(path):
            raise PaperError("Không có số báo ngày %s." % date)

        def build() -> Any:
            try:
                raw = _read_json(path)
            except (OSError, ValueError) as err:
                raise PaperError("Không đọc được số báo %s." % date) from err
            return clean_issue(raw, date)
        return self._cached(path, build)

    def try_issue(self, date: str) -> dict[str, Any] | None:
        try:
            return self.issue(date)
        except (PaperError, OSError):
            return None

    def scope(self) -> dict[str, Any]:
        """Từ vựng và mẫu câu trong pham_vi.json (để tra nghĩa khi bấm vào từ)."""
        path = os.path.join(self.base, "pham_vi.json")
        empty: dict[str, Any] = {"vocab": {}, "grammar": {}, "books": {}}
        if not os.path.isfile(path):
            return empty

        def build() -> Any:
            try:
                raw = _read_json(path, 5_000_000)
            except (OSError, ValueError, PaperError):
                return empty
            if not isinstance(raw, dict):
                return empty
            sach = raw.get("sach") if isinstance(raw.get("sach"), dict) else {}
            books = {k: _s(v, 60) for k, v in sach.items() if isinstance(k, str)}
            vocab: dict[str, list[str]] = {}
            for row in _list(raw.get("tu_vung"), 50_000):
                if isinstance(row, list) and len(row) >= 3 and all(isinstance(x, str) for x in row[:4]):
                    vocab.setdefault(norm_key(row[0]), [row[0][:40], row[1][:60], row[2][:160],
                                                        row[3][:60] if len(row) > 3 else ""])
            grammar: dict[str, dict[str, str]] = {}
            for g in _list(raw.get("ngu_phap"), 5_000):
                if isinstance(g, dict) and isinstance(g.get("id"), str):
                    grammar[g["id"]] = {"mau": _s(g.get("mau"), 200), "nghia": _s(g.get("nghia"), 300),
                                        "bai": _s(g.get("bai"), 60)}
            return {"vocab": vocab, "grammar": grammar, "books": books}
        return self._cached(path, build)

    def audio(self, date: str) -> dict[str, Any]:
        """Danh sách file audio của số báo (chỉ các file có thật, nằm trong thư mục số báo)."""
        folder = self._issue_dir(date)
        path = os.path.join(folder, "audio", "am_thanh.json")
        out: dict[str, Any] = {"credit": "", "bai": [], "chinh_ta": []}
        if not os.path.isfile(path):
            return out
        try:
            raw = _read_json(path, 200_000)
        except (OSError, ValueError, PaperError):
            return out
        if not isinstance(raw, dict):
            return out

        def ok(rel: Any) -> str | None:
            if isinstance(rel, str) and AUDIO_RE.match(rel) and os.path.isfile(os.path.join(folder, rel)):
                return rel
            return None
        credit = _s(raw.get("credit"), 80)
        out["credit"] = credit if credit.startswith(("VOICEVOX:", "Gemini TTS:")) else ""
        for files in _list(raw.get("bai"), 6):
            out["bai"].append([ok(f) for f in _list(files, 12)])
        for c in _list(raw.get("chinh_ta"), 4):
            c = c if isinstance(c, dict) else {}
            out["chinh_ta"].append({"thuong": ok(c.get("thuong")), "cham": ok(c.get("cham"))})
        return out

    def audio_path(self, date: str, rel: str | None) -> str | None:
        if not rel or not AUDIO_RE.match(rel):
            return None
        folder = os.path.realpath(self._issue_dir(date))
        full = os.path.realpath(os.path.join(folder, rel))
        if not full.startswith(folder + os.sep) or not os.path.isfile(full):
            return None
        return full

    def story_index(self) -> dict[int, str]:
        """Số kỳ truyện → ngày của số báo chứa kỳ đó."""
        out: dict[int, str] = {}
        for d in self.issues():
            iss = self.try_issue(d)
            for b in (iss or {}).get("bai", []):
                if b["loai"] == "truyen" and b["ky"]:
                    out.setdefault(b["ky"], d)
        return out


# ---------------------------------------------------------------------------
# Trạng thái: đã đọc, câu đã trả lời, hàng đợi câu chép sai
# ---------------------------------------------------------------------------


def empty_state() -> dict[str, Any]:
    return {"read": {}, "dict": {"day": -1, "items": [], "res": {}, "coins": 0, "bonus": False},
            "queue": {}, "seen": [], "miss": {}}


# p:<ngày>:<i> câu trong báo · n:<nid> câu ví dụ của note · w:<nid> từ của note (1.13, deck không có câu ví dụ)
SID_RE = re.compile(r"^(?:p:\d{4}-\d{2}-\d{2}:\d{1,2}|n:\d{1,20}|w:\d{1,20})$")


def _bits(raw: Any, digits: bool = True) -> dict[str, int]:
    if not isinstance(raw, dict):
        return {}
    return {k: int(v) for k, v in raw.items()
            if isinstance(k, str) and (k.isdigit() or not digits) and not isinstance(v, bool) and v in (0, 1)}


def clean_state(raw: Any) -> dict[str, Any]:
    st = empty_state()
    if not isinstance(raw, dict):
        return st
    read = raw.get("read") if isinstance(raw.get("read"), dict) else {}
    for date, r in list(read.items())[-MAX_ISSUES:]:
        if not (isinstance(date, str) and DATE_RE.match(date) and isinstance(r, dict)):
            continue
        st["read"][date] = {
            "q": _bits(r.get("q")),
            "ct": _bits(r.get("ct")),
            "coins": int(r["coins"]) if isinstance(r.get("coins"), int) else 0,
            "bonus": bool(r.get("bonus")),
        }
    d = raw.get("dict") if isinstance(raw.get("dict"), dict) else {}
    if isinstance(d.get("day"), int):
        st["dict"]["day"] = d["day"]
        st["dict"]["items"] = [x for x in _list(d.get("items"), DICT_SIZE + 3) if isinstance(x, str) and SID_RE.match(x)]
        st["dict"]["res"] = {k: v for k, v in _bits(d.get("res"), digits=False).items() if k in st["dict"]["items"]}
        st["dict"]["coins"] = int(d["coins"]) if isinstance(d.get("coins"), int) else 0
        st["dict"]["bonus"] = bool(d.get("bonus"))
    q = raw.get("queue") if isinstance(raw.get("queue"), dict) else {}
    for sid, item in list(q.items())[:300]:
        if isinstance(sid, str) and SID_RE.match(sid) and isinstance(item, dict) \
                and isinstance(item.get("due"), int) and isinstance(item.get("box"), int):
            st["queue"][sid] = {"due": item["due"], "box": max(0, min(len(REVIEW_STEPS), item["box"]))}
    st["seen"] = [x for x in _list(raw.get("seen"), 1000) if isinstance(x, str) and SID_RE.match(x)][-200:]
    miss = raw.get("miss") if isinstance(raw.get("miss"), dict) else {}
    st["miss"] = {k[:40]: v for k, v in list(miss.items())[-200:] if isinstance(k, str) and k.strip() and isinstance(v, int)}
    return st


class PaperState:
    """Lưu trong cấu hình collection (khoá PAPER_KEY) + bản sao lưu user_files/paper.json."""

    def __init__(self, path: str, col_getter: Any = None, key: str = PAPER_KEY) -> None:
        self.path = path
        self.col_getter = col_getter
        self.key = key            # 1.19: báo tiếng Anh dùng khoá riêng PAPER_KEY_EN

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def load(self) -> dict[str, Any]:
        stored: Any = None
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(self.key, None)
            except Exception:
                stored = None
        if not isinstance(stored, dict):
            try:
                with open(self.path, encoding="utf-8") as f:
                    stored = json.load(f)
            except (OSError, ValueError):
                stored = None
        return clean_state(stored)

    def save(self, st: dict[str, Any]) -> None:
        col = self._col()
        if col is not None:
            try:
                col.set_config(self.key, st)
            except Exception as err:
                print(f"[kotoba_batake] save paper: {err}")
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(st, f, ensure_ascii=False)
            os.replace(tmp, self.path)
        except OSError as err:
            if col is None:
                raise
            print(f"[kotoba_batake] paper backup file: {err}")


# ---------------------------------------------------------------------------
# Xem báo
# ---------------------------------------------------------------------------


def _accepted(markup: str, extra: list[str], kana_ok: bool = True) -> set[str]:
    out = {norm_answer(surface(markup))}
    if kana_ok:
        out.add(norm_answer(kana(markup)))
    out.update(norm_answer(x) for x in extra)
    out.discard("")
    return out


def matches(markup: str, extra: list[str], variants: list[str], kana_ok: bool = True, lang: str = "ja") -> bool:
    """Câu gõ lại có khớp không. Tiếng Nhật: so kana / chữ (bỏ dấu câu). 1.17 tiếng Anh: so từng từ (chữ thường,
    bỏ dấu câu, don't = do not); ngôn ngữ khác: bỏ dấu câu, chữ thường."""
    if lang != "ja":
        norm = text.en_words if lang == "en" else text.latin_words
        ok_set = [norm(surface(x)) for x in [markup] + list(extra or [])]   # 1.19: câu báo tiếng Anh có {chữ||từ gốc}
        return any(isinstance(v, str) and norm(v) in ok_set and norm(v) for v in variants)
    ok = _accepted(markup, extra, kana_ok)
    return any(norm_answer(v) in ok for v in variants if isinstance(v, str))


def _texts(issue: dict[str, Any]) -> list[str]:
    out = []
    for b in issue["bai"]:
        out.append(b["tieu_de"])
        out.extend(b["doan"])
    for q in issue["cau_hoi"]:
        out.append(q["hoi"])
        out.extend(q["chon"])
    out.extend(c["cau"] for c in issue["chinh_ta"])
    return out


def _lesson(tag: str, books: dict[str, str]) -> str:
    if ":" not in tag:
        return tag
    bid, ch = tag.split(":", 1)
    return "%s, bài %s" % (books.get(bid, bid), ch)


def ct_voice(lib: Library, date: str, i: int, cau: str, voice: Voice | None = None, lang: str = "ja") -> dict[str, Any]:
    """Câu chép chính tả thứ i của số báo phát bằng gì: file của số báo, hoặc giọng dự phòng (1.13).
    1.19: báo tiếng Anh dùng giọng tiếng Anh của máy (tts_en)."""
    au = lib.audio(date)["chinh_ta"]
    a = au[i] if i < len(au) else {}
    if a.get("thuong"):
        return {"how": "file", "audio": True, "slow": bool(a.get("cham")) or bool(voice and voice.mpv),
                "pending": False, "file": a.get("thuong"), "slow_file": a.get("cham")}
    voice = voice or NO_VOICE
    how, slow, data = voice.how(cau, lang)
    return {"how": how, "audio": how in ("cache", "tts", "tts_en"), "slow": slow, "pending": how == "gen", "data": data,
            "want_gen": voice.wants(how)}


def dict_len(markup: str, lang: str = "ja") -> tuple[int, str]:
    """Độ dài câu chép để hiện cho người học: tiếng Nhật đếm ký tự, tiếng Anh / chữ Latin đếm từ (1.19)."""
    if lang == "ja":
        return len(norm_answer(surface(markup))), "ký tự"
    return len((text.en_words if lang == "en" else text.latin_words)(surface(markup))), "từ"


def issue_view(lib: Library, st: dict[str, Any], date: str, voice: Voice | None = None) -> dict[str, Any]:
    """Dữ liệu gửi sang giao diện. Không gửi đáp án câu hỏi và câu chép chính tả chưa làm."""
    voice = voice or NO_VOICE
    iss = lib.issue(date)
    scope = lib.scope()
    books = scope["books"]
    new = {norm_key(w["w"]): w for w in iss["tu_moi"]}
    tu: dict[str, dict[str, Any]] = {}
    for text in _texts(iss):
        for k in keys(text):
            nk = norm_key(k)
            if nk in new:
                w = new[nk]
                tu[k] = {"w": w["w"], "r": w["r"], "m": w["m"], "moi": True}
            elif nk in scope["vocab"]:
                w4 = scope["vocab"][nk]
                tu[k] = {"w": w4[0], "r": w4[1], "m": w4[2], "bai": _lesson(w4[3], books)}
            else:
                tu[k] = {"w": k, "r": "", "m": ""}
    mau = []
    for gid in iss["mau_cau"]:
        g = scope["grammar"].get(gid)
        if g:
            mau.append({"mau": g["mau"], "nghia": g["nghia"], "bai": _lesson(g["bai"], books)})
    audio = lib.audio(date)
    r = st["read"].get(date, {"q": {}, "ct": {}, "coins": 0, "bonus": False})
    stories = lib.story_index()
    arts = []
    fallback = False
    lang = iss["lang"]
    machine = voice.tts_en if lang == "en" else voice.tts
    for i, b in enumerate(iss["bai"]):
        a = dict(b)
        files = audio["bai"][i] if i < len(audio["bai"]) else []
        a["audio"] = [bool(files[j]) if j < len(files) else False for j in range(len(b["doan"]))]
        if machine and not all(a["audio"]):     # 1.13: đoạn chưa có giọng đọc → giọng của máy
            fallback = True
            a["audio"] = [True] * len(b["doan"])
        if b["loai"] == "truyen" and b["ky"] and b["ky"] > 1:
            prev = stories.get(b["ky"] - 1)
            if prev and prev not in st["read"] and prev != date:
                a["ky_truoc_ngay"] = prev
        arts.append(a)
    questions = []
    for i, q in enumerate(iss["cau_hoi"]):
        item: dict[str, Any] = {"hoi": q["hoi"], "chon": q["chon"]}
        if str(i) in r["q"]:
            item.update(done=True, first=r["q"][str(i)], dung=q["dung"], giai_thich=q["giai_thich"])
        questions.append(item)
    dict_items = []
    for i, c in enumerate(iss["chinh_ta"]):
        cv = ct_voice(lib, date, i, c["cau"], voice, lang)
        fallback = fallback or cv["how"] in ("cache", "tts", "tts_en")
        n, unit = dict_len(c["cau"], lang)
        item = {"audio": cv["audio"], "slow": cv["slow"], "pending": cv["pending"], "len": n, "unit": unit,
                "lang": lang, "kana_ok": lang == "ja"}
        if str(i) in r["ct"]:
            item.update(done=True, first=r["ct"][str(i)], cau=c["cau"])
        dict_items.append(item)
    return {
        "date": date, "so": iss["so"], "rut_gon": iss["rut_gon"], "bai": arts, "cau_hoi": questions,
        "chinh_ta": dict_items, "mau": mau, "tu": tu, "credit": audio["credit"], "may_viet": iss["may_viet"],
        "voice_note": "Câu chưa có giọng đọc dùng giọng dự phòng (Gemini hoặc giọng %s của máy)."
        % ("tiếng Anh" if lang == "en" else "tiếng Nhật") if fallback else "",
        "lang": lang,
        "coins": r["coins"], "complete": r["bonus"],
        "reward": {"q": Q_COINS, "ct": CT_COINS, "bonus": ISSUE_BONUS},
    }


def issue_pending(lib: Library, date: str, voice: Voice | None) -> list[str]:
    """Câu chép chính tả của số báo đang chờ Gemini tạo giọng đọc (chữ gửi cho giọng đọc)."""
    if not voice or not voice.gen:
        return []
    try:
        iss = lib.issue(date)
    except PaperError:
        return []
    out = []
    for i, c in enumerate(iss["chinh_ta"]):
        cv = ct_voice(lib, date, i, c["cau"], voice, iss["lang"])
        if cv.get("want_gen") and cv.get("data"):
            out.append(cv["data"])
    return out


def index_view(lib: Library | None, st: dict[str, Any]) -> dict[str, Any]:
    issues = []
    for d in lib.issues() if lib else []:
        iss = lib.try_issue(d) if lib else None
        if not iss:
            continue
        story = next((b for b in iss["bai"] if b["loai"] == "truyen"), None)
        r = st["read"].get(d)
        issues.append({
            "date": d, "so": iss["so"], "title": surface(iss["bai"][0]["tieu_de"]) or surface(iss["bai"][0]["doan"][0])[:30],
            "ky": story["ky"] if story else None, "rut_gon": iss["rut_gon"],
            "read": r is not None, "complete": bool(r and r["bonus"]), "coins": r["coins"] if r else 0,
            "tom_tat": iss["tom_tat"], "lang": iss["lang"],
        })
    return {"enabled": lib is not None, "issues": issues, "lang": lib.lang if lib else ""}


def unread_dates(lib: Library | None, st: dict[str, Any]) -> list[str]:
    if not lib:
        return []
    return [d for d in lib.issues() if d not in st["read"]]


def summary(lib: Library | None, st: dict[str, Any], today: int) -> dict[str, Any]:
    """Thông tin nhỏ cho màn chính: số báo chưa đọc, tiến độ chép chính tả hôm nay."""
    unread = unread_dates(lib, st)
    d = st["dict"]
    built = d["day"] == today
    return {
        "enabled": lib is not None,
        "unread": len(unread),
        "latest": unread[0] if unread else None,
        "dict_done": len(d["res"]) if built else 0,
        "dict_total": len(d["items"]) if built else DICT_SIZE,
    }


def mark_read(st: dict[str, Any], date: str) -> None:
    st["read"].setdefault(date, {"q": {}, "ct": {}, "coins": 0, "bonus": False})


def _listenable(lib: Library, date: str, n: int, voice: Voice | None = None) -> list[int]:
    """Các câu chép chính tả của số báo nghe được (file audio hoặc giọng dự phòng); câu không nghe được không tính."""
    try:
        iss = lib.issue(date)
    except PaperError:
        return []
    cts = iss["chinh_ta"]
    return [i for i in range(min(n, len(cts))) if ct_voice(lib, date, i, cts[i]["cau"], voice, iss["lang"])["audio"]]


def _check_issue_done(lib: Library, st: dict[str, Any], iss: dict[str, Any], date: str,
                      voice: Voice | None = None) -> int:
    r = st["read"][date]
    if r["bonus"]:
        return 0
    cts = _listenable(lib, date, len(iss["chinh_ta"]), voice)
    if len(r["q"]) >= len(iss["cau_hoi"]) and all(str(i) in r["ct"] for i in cts) \
            and (iss["cau_hoi"] or cts):
        r["bonus"] = True
        r["coins"] += ISSUE_BONUS
        return ISSUE_BONUS
    return 0


def answer_question(lib: Library, st: dict[str, Any], date: str, i: int, choice: int,
                    voice: Voice | None = None) -> dict[str, Any]:
    iss = lib.issue(date)
    if not 0 <= i < len(iss["cau_hoi"]):
        raise PaperError("Không có câu hỏi này.")
    q = iss["cau_hoi"][i]
    mark_read(st, date)
    r = st["read"][date]
    ok = choice == q["dung"]
    gained = 0
    first = str(i) not in r["q"]
    if first:
        r["q"][str(i)] = 1 if ok else 0
        if ok:
            gained += Q_COINS
            r["coins"] += Q_COINS
    bonus = _check_issue_done(lib, st, iss, date, voice) if first else 0
    return {"kind": "q", "date": date, "i": i, "ok": ok, "dung": q["dung"], "giai_thich": q["giai_thich"],
            "first": first, "gained": gained + bonus, "bonus": bonus, "complete": r["bonus"]}


def _queue_wrong(st: dict[str, Any], sid: str, today: int) -> None:
    st["queue"][sid] = {"due": today + REVIEW_STEPS[0], "box": 0}


def _queue_right(st: dict[str, Any], sid: str, today: int) -> None:
    item = st["queue"].get(sid)
    if not item or item["due"] > today:
        return
    item["box"] += 1
    if item["box"] >= len(REVIEW_STEPS):
        del st["queue"][sid]
    else:
        item["due"] = today + REVIEW_STEPS[item["box"]]


def _remember_miss(st: dict[str, Any], words: list[str], today: int) -> None:
    for w in words:
        w = (w or "").strip()[:40]
        if w:
            st["miss"].pop(w, None)
            st["miss"][w] = today


def answer_issue_dictation(lib: Library, st: dict[str, Any], date: str, i: int,
                           variants: list[str], today: int, voice: Voice | None = None) -> dict[str, Any]:
    iss = lib.issue(date)
    if not 0 <= i < len(iss["chinh_ta"]):
        raise PaperError("Không có câu này.")
    c = iss["chinh_ta"][i]
    if i not in _listenable(lib, date, len(iss["chinh_ta"]), voice):
        raise PaperError("Câu này chưa có giọng đọc nên chưa chép chính tả được.")
    if not any(isinstance(v, str) and v.strip() for v in variants):
        raise PaperError("Gõ câu bạn nghe được trước đã.")
    mark_read(st, date)
    r = st["read"][date]
    ok = matches(c["cau"], c["them"], variants, lang=iss["lang"])
    sid = "p:%s:%d" % (date, i)
    first = str(i) not in r["ct"]
    gained = 0
    if first:
        r["ct"][str(i)] = 1 if ok else 0
        if ok:
            gained += CT_COINS
            r["coins"] += CT_COINS
    if ok:
        _queue_right(st, sid, today)
    else:
        _queue_wrong(st, sid, today)
        _remember_miss(st, keys(c["cau"]), today)
    bonus = _check_issue_done(lib, st, iss, date, voice) if first else 0
    return {"kind": "ct", "date": date, "i": i, "ok": ok, "cau": c["cau"], "first": first,
            "gained": gained + bonus, "bonus": bonus, "complete": r["bonus"], "lang": iss["lang"]}


# ---------------------------------------------------------------------------
# Chép chính tả hằng ngày
# ---------------------------------------------------------------------------


_MARKUP_CHARS = re.compile(r"[\[\]{}|]")


def note_dict_item(note: Any, cfg: dict[str, Any]) -> dict[str, Any] | None:
    """Câu ví dụ của một note dùng cho chép chính tả (None nếu không dùng được)."""
    roles = core.note_roles(note, cfg)        # 1.9: theo cấu hình trường của loại note (chưa có thì đoán)
    if not roles.get("example"):
        return None
    lang = roles.get("lang") or "ja"
    if lang != "ja":                          # 1.17: câu tiếng Anh / ngôn ngữ khác, chấm theo từ
        sent = _MARKUP_CHARS.sub("", core._clean_example(note[roles["example"]] or "", lang)).strip()
        words = (text.en_words if lang == "en" else text.latin_words)(sent)
        if not 2 <= len(words) <= 25 or len(sent) > 180:
            return None
        meaning = core._clean(note[roles["ex_meaning"]], 160) if roles.get("ex_meaning") else ""
        return {"markup": sent, "kana_ok": False, "audio": core.example_audio(note, cfg, roles), "meaning": meaning,
                "word": core.note_details(note, cfg, roles)["word"], "lang": lang}
    markup, complete = anki_to_markup(note[roles["example"]] or "")
    n = len(norm_answer(surface(markup)))
    if not 4 <= n <= 45:
        return None
    word = core.note_details(note, cfg, roles)["word"]
    meaning = core._clean(note[roles["ex_meaning"]], 160) if roles.get("ex_meaning") else ""
    return {"markup": markup, "kana_ok": complete, "audio": core.example_audio(note, cfg, roles),
            "meaning": meaning, "word": word, "lang": "ja"}


JP_WORD_RE = re.compile(r"[ぁ-ヿ㐀-鿿]")
KANA_WORD_RE = re.compile(r"^[ぁ-ゖァ-ヺー・]+$")
WORD_SKIP_RE = re.compile(r"[/／、,;；()（）\[\]{}<>=~?？!！…|｜\s]")


def note_word_item(note: Any, cfg: dict[str, Any]) -> dict[str, Any] | None:
    """Từ của note dùng cho chép chính tả khi deck không có câu ví dụ (1.13): nghe từ, gõ lại.

    Chỉ lấy note từ vựng có từ tiếng Nhật 2–16 ký tự, một cách viết; từ có chữ Hán phải có cách đọc kana."""
    roles = core.note_roles(note, cfg)
    if roles.get("kind") in ("grammar", "kanji", "other"):
        return None
    det = core.note_details(note, cfg, roles)
    lang = roles.get("lang") or "ja"
    if lang != "ja":       # 1.17: từ / cụm từ ngắn chữ Latin (1–4 chữ), cách viết đầu tiên
        alts = text.en_alternatives(det.get("word") or "")
        word = _MARKUP_CHARS.sub("", alts[0] if alts else "").strip()
        n = len(word.split())
        if not word or word == "?" or not 1 <= n <= 4 or not 2 <= len(word) <= 40 or not re.search(r"[^\W\d_]", word):
            return None
        return {"markup": word, "kana_ok": False, "audio": core.note_audio(note, cfg, roles),
                "meaning": core._clean(det.get("meaning") or "", 80), "word": word, "lang": lang}
    word = (det.get("word") or "").strip().strip("〜～").strip()
    if not word or word == "?" or WORD_SKIP_RE.search(word) or not JP_WORD_RE.search(word):
        return None
    n = len(norm_answer(word))
    if not 2 <= n <= 16:
        return None
    if KANJI_RE.search(word):
        reading = re.sub(r"[\s　]", "", det.get("reading") or "")
        if not KANA_WORD_RE.match(reading):
            return None
        markup = "[%s|%s]" % (word, to_hira(reading))
    elif KANA_WORD_RE.match(word):
        markup = word
    else:
        return None
    return {"markup": markup, "kana_ok": True, "audio": core.note_audio(note, cfg, roles),
            "meaning": core._clean(det.get("meaning") or "", 80), "word": word, "lang": "ja"}


Resolver = Callable[[int], "dict[str, Any] | None"]


def resolve(sid: str, lib: Library | None, note_item: Resolver, voice: Voice | None = None,
            word_item: Resolver | None = None) -> dict[str, Any] | None:
    """Nội dung một câu chép chính tả theo id ('p:<ngày>:<i>', 'n:<nid>' hoặc 'w:<nid>').

    audio: nghe được ngay · pending: đang chờ Gemini tạo giọng đọc · how: file / media / cache / tts / gen."""
    voice = voice or NO_VOICE
    try:
        if sid.startswith("p:"):
            _, date, i = sid.split(":")
            iss = lib.try_issue(date) if lib else None
            if not lib or not iss or int(i) >= len(iss["chinh_ta"]):
                return None
            c = iss["chinh_ta"][int(i)]
            cv = ct_voice(lib, date, int(i), c["cau"], voice, iss["lang"])
            return {"src": "paper", "markup": c["cau"], "extra": c["them"], "kana_ok": iss["lang"] == "ja",
                    "lang": iss["lang"],
                    "audio": cv["audio"], "slow": cv["slow"], "pending": cv["pending"], "how": cv["how"],
                    "data": cv.get("data"), "cv": cv, "want_gen": bool(cv.get("want_gen")),
                    "label": "Báo %s/%s" % (date[8:10], date[5:7]), "meaning": "",
                    "words": keys(c["cau"]), "date": date, "i": int(i)}
        if sid.startswith(("n:", "w:")):
            nid = int(sid[2:])
            getter = note_item if sid[0] == "n" else word_item
            item = getter(nid) if getter else None
            if not item:
                return None
            lang = item.get("lang") or "ja"
            if item.get("audio"):
                how, slow, data = "media", voice.mpv, item["audio"]
            else:
                how, slow, data = voice.how(item["markup"], lang)
            if sid[0] == "n":
                label = "Ví dụ của " + item["word"]
            else:
                label = "Nghe từ" + (" · " + item["meaning"][:40] if item.get("meaning") else "")
            return {"src": "deck" if sid[0] == "n" else "word", "markup": item["markup"], "extra": [],
                    "kana_ok": item["kana_ok"], "audio": how in ("media", "cache", "tts", "tts_en"), "slow": slow,
                    "lang": lang,
                    "pending": how == "gen", "how": how, "data": data, "label": label, "want_gen": voice.wants(how),
                    "meaning": item.get("meaning") or "", "words": [item["word"]], "nid": nid}
    except (ValueError, KeyError, TypeError, OSError):
        return None
    return None


def _usable(info: dict[str, Any] | None) -> bool:
    return bool(info and (info["audio"] or info["pending"]))


def _fill(st: dict[str, Any], today: int, lib: Library | None, candidates: list[dict[str, Any]],
          words: list[dict[str, Any]], res: Callable[[str], Any], chosen: list[str]) -> None:
    """Thêm câu vào lượt hôm nay cho đủ DICT_SIZE. Thứ tự ưu tiên: câu chép sai đến hạn ôn → câu trong
    các số báo mới nhất → câu ví dụ của cây héo / khát (có audio thật trước) → từ của cây (deck không có câu ví dụ)."""
    rng = random.Random(today * 104729 + 7)
    seen = set(st["seen"])

    def take(sid: str) -> bool:
        if sid in chosen or len(chosen) >= DICT_SIZE:
            return False
        if not _usable(res(sid)):          # không nghe được (và không chờ tạo giọng đọc) thì không chép được
            return False
        chosen.append(sid)
        return True

    def ordered(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        pool = list(rows)
        rng.shuffle(pool)
        pool.sort(key=lambda c: (0 if c.get("wilted") else 1 if c.get("thirsty") else 2, 0 if c.get("audio") else 1))
        return pool

    due = sorted((sid for sid, q in st["queue"].items() if q["due"] <= today), key=lambda s: st["queue"][s]["due"])
    for sid in due[:DICT_REVIEW_MAX]:
        take(sid)
    paper_ids = []
    for date in (lib.issues()[:7] if lib else []):
        iss = lib.try_issue(date) if lib else None
        paper_ids.extend("p:%s:%d" % (date, i) for i in range(len((iss or {}).get("chinh_ta", []))))
    fresh_paper = [s for s in paper_ids if s not in seen and s not in st["queue"]]
    n = sum(1 for s in chosen if s.startswith("p:"))
    for sid in fresh_paper:
        if n >= DICT_PAPER_MAX:
            break
        n += 1 if take(sid) else 0
    pool = ["n:%d" % int(c["nid"]) for c in ordered(candidates)]
    wpool = ["w:%d" % int(c["nid"]) for c in ordered(words)]
    for sid in pool + wpool:
        if len(chosen) >= DICT_SIZE:
            break
        if sid not in seen:
            take(sid)
    for sid in due[DICT_REVIEW_MAX:] + fresh_paper + pool + wpool:
        if len(chosen) >= DICT_SIZE:
            break
        take(sid)


def build_daily(st: dict[str, Any], today: int, lib: Library | None, candidates: list[dict[str, Any]],
                note_item: Resolver, voice: Voice | None = None, word_item: Resolver | None = None,
                words: list[dict[str, Any]] | None = None) -> bool:
    """Chọn lượt chép chính tả của hôm nay (một lần mỗi ngày). Trả về True nếu trạng thái đổi.

    candidates: cây của deck đang xem có câu ví dụ {nid, wilted, thirsty, audio}; words (1.13): cây từ vựng
    dùng để "nghe từ, gõ lại" khi không đủ câu ví dụ. Trong ngày, câu chưa làm mà không còn nghe được nữa
    (vd. Gemini hết hạn mức giọng đọc) thì bỏ ra và lấp câu khác vào.
    """
    d = st["dict"]
    words = words or []

    def res(sid: str) -> Any:
        return resolve(sid, lib, note_item, voice, word_item)
    if d["day"] == today and d["items"]:
        keep = [s for s in d["items"] if s in d["res"] or _usable(res(s))]
        if len(keep) == len(d["items"]):
            return False
        chosen = list(keep)
        _fill(st, today, lib, candidates, words, res, chosen)
        d["items"] = chosen
        d["res"] = {k: v for k, v in d["res"].items() if k in chosen}
    else:
        chosen = []
        _fill(st, today, lib, candidates, words, res, chosen)
        st["dict"] = {"day": today, "items": chosen, "res": {}, "coins": 0, "bonus": False}
    seen = set(st["seen"])
    st["seen"] = (st["seen"] + [s for s in chosen if s not in seen])[-200:]
    return True


def daily_pending(st: dict[str, Any], lib: Library | None, note_item: Resolver, voice: Voice | None = None,
                  word_item: Resolver | None = None) -> list[str]:
    """Chữ cần Gemini tạo giọng đọc cho lượt chép hôm nay (câu chưa làm)."""
    out = []
    for sid in st["dict"]["items"]:
        if sid in st["dict"]["res"]:
            continue
        info = resolve(sid, lib, note_item, voice, word_item)
        if info and info["want_gen"] and info["data"]:
            out.append(info["data"])
    return list(dict.fromkeys(out))


VOICE_LABEL = {"tts": "giọng máy", "tts_en": "giọng máy", "cache": "giọng Gemini"}


def daily_view(st: dict[str, Any], lib: Library | None, note_item: Resolver, voice: Voice | None = None,
               word_item: Resolver | None = None) -> dict[str, Any]:
    d = st["dict"]
    items = []
    for sid in d["items"]:
        info = resolve(sid, lib, note_item, voice, word_item)
        if not info:
            continue
        item: dict[str, Any] = {"id": sid, "src": info["src"], "label": info["label"], "audio": info["audio"],
                                "slow": info["slow"], "pending": info["pending"], "kana_ok": info["kana_ok"],
                                "voice": VOICE_LABEL.get(info["how"] or "", ""), "lang": info.get("lang", "ja"),
                                "len": dict_len(info["markup"], info.get("lang", "ja"))[0],
                                "unit": dict_len(info["markup"], info.get("lang", "ja"))[1],
                                "review": sid in st["queue"]}
        if sid in d["res"]:
            item.update(done=True, first=d["res"][sid], cau=info["markup"], meaning=info["meaning"])
        items.append(item)
    return {"day": d["day"], "items": items, "done": len(d["res"]), "total": len(items), "coins": d["coins"],
            "complete": d["bonus"], "reward": {"each": DICT_COINS, "bonus": DICT_BONUS},
            "queue": len(st["queue"]), "pending": sum(1 for i in items if i["pending"])}


def answer_daily(st: dict[str, Any], today: int, sid: str, variants: list[str], lib: Library | None,
                 note_item: Resolver, voice: Voice | None = None, word_item: Resolver | None = None) -> dict[str, Any]:
    d = st["dict"]
    if d["day"] != today or sid not in d["items"]:
        raise PaperError("Lượt chép chính tả đã sang ngày mới, mở lại bảng nhé.")
    info = resolve(sid, lib, note_item, voice, word_item)
    if not info:
        raise PaperError("Không còn câu này (note hoặc số báo đã bị xoá).")
    if not any(isinstance(v, str) and v.strip() for v in variants):
        raise PaperError("Gõ câu bạn nghe được trước đã.")
    ok = matches(info["markup"], info["extra"], variants, info["kana_ok"], info.get("lang", "ja"))
    first = sid not in d["res"]
    gained = 0
    if first:
        d["res"][sid] = 1 if ok else 0
        if ok:
            gained += DICT_COINS
            d["coins"] += DICT_COINS
    if ok:
        _queue_right(st, sid, today)
    else:
        _queue_wrong(st, sid, today)
        _remember_miss(st, info["words"], today)
    bonus = 0
    if first and not d["bonus"] and len(d["res"]) >= len(d["items"]):
        d["bonus"] = True
        d["coins"] += DICT_BONUS
        bonus = DICT_BONUS
    return {"kind": "dict", "id": sid, "ok": ok, "cau": info["markup"], "meaning": info["meaning"],
            "first": first, "gained": gained + bonus, "bonus": bonus, "complete": d["bonus"],
            "done": len(d["res"]), "total": len(d["items"])}


SLOW_SPEED = 0.75


def play_target(how: str | None, data: Any, slow: bool, lib: Library | None = None, date: str = "",
                cv: dict[str, Any] | None = None) -> tuple[str, Any, float] | None:
    """Cách phát: ('file', đường dẫn tuyệt đối, tốc độ), ('media', tên file trong media của collection, tốc độ)
    hoặc ('tts', chữ, tốc độ). Tốc độ < 1 với file chỉ dùng được khi trình phát là mpv (__init__ quyết định)."""
    if how == "file" and lib is not None and cv is not None:
        rel = cv.get("slow_file") if slow and cv.get("slow_file") else cv.get("file")
        path = lib.audio_path(date, rel)
        if not path:
            return None
        return ("file", path, SLOW_SPEED if slow and not cv.get("slow_file") else 1.0)
    if how == "media" and isinstance(data, str) and data:
        return ("media", os.path.basename(data), SLOW_SPEED if slow else 1.0)
    if how == "cache" and data and data[0]:
        if slow and data[1]:
            return ("file", data[1], 1.0)
        return ("file", data[0], SLOW_SPEED if slow else 1.0)
    if how in ("tts", "tts_en") and isinstance(data, str) and data:
        return (how, data, 0.7 if slow else 1.0)
    return None


def audio_for(sid: str, slow: bool, lib: Library | None, note_item: Resolver, voice: Voice | None = None,
              word_item: Resolver | None = None) -> tuple[str, Any, float] | None:
    info = resolve(sid, lib, note_item, voice, word_item)
    if not info or not info["audio"]:
        return None
    return play_target(info["how"], info["data"], slow, lib, info.get("date", ""), info.get("cv"))


# ---------------------------------------------------------------------------
# tien_do.json: gửi ngược sang bộ viết báo
# ---------------------------------------------------------------------------


def progress_payload(st: dict[str, Any], lib: Library | None, plants: list[dict[str, Any]], today: int) -> dict[str, Any]:
    wilted = [p["word"] for p in plants if p.get("wilted") and isinstance(p.get("word"), str)]
    thirsty = [p["word"] for p in plants if p.get("thirsty") and not p.get("wilted") and isinstance(p.get("word"), str)]
    miss = [w for w, day in sorted(st["miss"].items(), key=lambda kv: -kv[1]) if today - day <= MISS_DAYS]
    return {
        "sap_quen": list(dict.fromkeys(wilted + thirsty))[:30],
        "loi_sai": miss[:30],
        "chua_doc": unread_dates(lib, st)[:30],
    }


def write_progress(base: str, payload: dict[str, Any]) -> bool:
    """Ghi tien_do.json nếu nội dung đổi. Trả về True nếu có ghi."""
    path = os.path.join(base, "tien_do.json")
    try:
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
        if isinstance(old, dict) and all(old.get(k) == v for k, v in payload.items()):
            return False
    except (OSError, ValueError):
        pass
    out = dict(payload)
    out["cap_nhat"] = datetime.datetime.now().isoformat(timespec="minutes")
    out["_ghi_chu"] = "File này do add-on ことば畑 ghi, đừng sửa tay."
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
    return True
