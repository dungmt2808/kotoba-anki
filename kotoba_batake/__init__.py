"""ことば畑 (Kotoba Batake) – vườn từ vựng pixel cho Anki.

Mỗi note là một cây. Cây lớn theo độ bền trí nhớ FSRS, khát khi tới hạn ôn,
héo khi lâu chưa ôn. Ôn ngay trong khu vườn (hoặc ở màn ôn của Anki) để tưới
cây và nhận xu.
"""

from __future__ import annotations

import base64
import datetime
import json
import os
import platform
import re
import sys
import time
import traceback
from typing import Any

from aqt import gui_hooks, mw  # nạp trước để tránh vòng import của anki.scheduler

from anki.scheduler.v3 import CardAnswer, QueuedCards  # noqa: E402
from aqt.operations.scheduling import answer_card
from aqt.qt import QAction, QDialog, QKeySequence, Qt, QVBoxLayout, qconnect
from aqt.sound import av_player, play_clicked_audio
from aqt.theme import theme_manager
from aqt.utils import getFile, openLink, restoreGeom, saveGeom, showWarning, tooltip
from aqt.webview import AnkiWebView

from . import ai_core as ai
from . import ai_en
from . import ai_vi
from . import diag
from . import event_core
from . import fields_core
from . import finds_core as finds
from . import guest_core as guests
from . import life_core
from . import journal_core as journal
from . import launcher
from . import garden_core as core
from . import more_core
from . import mau_core as mau
from . import paper_core as paper
from . import share_core
from . import story_core
from . import words_core as words

ADDON_DIR = os.path.dirname(os.path.abspath(__file__))
ADDON = mw.addonManager.addonFromModule(__name__)
WEB_BASE = f"/_addons/{ADDON}/web"
# Lưu trong cấu hình collection (đồng bộ AnkiWeb) + bản sao lưu ở user_files/state.json
STATE = core.GardenState(os.path.join(ADDON_DIR, "user_files", "state.json"), col_getter=lambda: mw.col)
# Báo 畑新聞 + chép chính tả: khoá riêng trong collection + bản sao lưu user_files/paper.json
PAPER = paper.PaperState(os.path.join(ADDON_DIR, "user_files", "paper.json"), col_getter=lambda: mw.col)
# Cấu hình trường theo loại note + chế độ trò chơi (1.9): khoá riêng trong collection
FIELDS = fields_core.FieldStore(os.path.join(ADDON_DIR, "user_files", "fields.json"), col_getter=lambda: mw.col)
ERRORS = diag.ErrorLog(os.path.join(ADDON_DIR, "user_files", "errors.json"))   # 1.11: nhật ký cho Báo lỗi
# 1.12: báo do Gemini viết (khoá API của người dùng) nằm ở thư mục riêng, cùng định dạng kotoba_daily
AI_DIR = os.path.join(ADDON_DIR, "user_files", ai.FOLDER)
# 1.19: báo tiếng Anh (The Garden Gazette, chỉ Gemini viết): thư mục riêng + trạng thái đọc / chép riêng trong collection
AI_DIR_EN = os.path.join(ADDON_DIR, "user_files", ai_en.FOLDER)
PAPER_EN = paper.PaperState(os.path.join(ADDON_DIR, "user_files", "paper_en.json"), col_getter=lambda: mw.col,
                            key=paper.PAPER_KEY_EN)
# 1.25.1: báo tiếng Việt (Báo Làng Kotoba, chỉ Gemini viết) — cho người không học tiếng Nhật / tiếng Anh
AI_DIR_VI = os.path.join(ADDON_DIR, "user_files", ai_vi.FOLDER)
PAPER_VI = paper.PaperState(os.path.join(ADDON_DIR, "user_files", "paper_vi.json"), col_getter=lambda: mw.col,
                            key=paper.PAPER_KEY_VI)
AI_DIRS = {"ja": AI_DIR, "en": AI_DIR_EN, "vi": AI_DIR_VI}
# 1.25.2 "Một làng, một truyện": bộ nhớ truyện chung + bản gốc mỗi ngày (truyện + tin làng, tiếng Việt) cho mọi báo Gemini
AI_DIR_SHARED = os.path.join(ADDON_DIR, "user_files", ai.SHARED_FOLDER)
AI_MODS = {"en": ai_en, "vi": ai_vi}
# 1.23: tiến độ đọc của nguồn báo tiếng Nhật thứ hai (Kệ báo gộp số Claude Code + Gemini), khoá collection riêng
BOOK = paper.PaperState(os.path.join(ADDON_DIR, "user_files", "paper_nguon.json"), col_getter=lambda: mw.col,
                        key=paper.PAPER_KEY_SRC, clean=paper.clean_book)
LANG_NAME = {"ja": "tiếng Nhật", "en": "tiếng Anh", "vi": "tiếng Việt", "other": "ngôn ngữ khác"}
_ai: dict[str, Any] = {"running": False, "testing": False, "msg": "", "lang": "ja", "why": ""}
_libraries: dict[str, paper.Library] = {}
_dict_possible = False   # deck đang xem có câu / từ để chép chính tả không (cập nhật ở refresh)
# 1.13: giọng dự phòng cho câu chép không có audio
_dich_job: dict[str, Any] = {"running": False, "ref": ""}       # 1.23: "Dịch số này" đang chạy
_voice_job: dict[str, Any] = {"running": False, "tried": set()}   # đang nhờ Gemini tạo giọng đọc / chữ đã thử
_ja_tts: bool | None = None      # máy có giọng tiếng Nhật của hệ điều hành (Anki TTS) — kiểm một lần
_en_tts: bool | None = None      # 1.17: máy có giọng tiếng Anh của hệ điều hành
_mpv_slow = False                # vừa phát chậm bằng mpv → trả tốc độ về 1 khi phát xong
_wav_checked = False             # đã sửa file giọng đọc lồng của 1.12 chưa (một lần mỗi lần mở Anki)

RATINGS = {
    1: CardAnswer.AGAIN,
    2: CardAnswer.HARD,
    3: CardAnswer.GOOD,
    4: CardAnswer.EASY,
}

mw.addonManager.setWebExports(__name__, r"web/.*\.(css|js)")


def _manifest() -> dict[str, Any]:
    try:
        with open(os.path.join(ADDON_DIR, "manifest.json"), encoding="utf-8") as f:
            m = json.load(f)
        return m if isinstance(m, dict) else {}
    except (OSError, ValueError):
        return {}


VERSION = str(_manifest().get("human_version") or "?")


def _warn(where: str, err: Any) -> None:
    """Lỗi đã được bắt (không làm hỏng vườn): in ra console như trước và ghi vào nhật ký Báo lỗi."""
    print(f"[kotoba_batake] {where}: {err}")
    try:
        tb = traceback.format_exc()
        ERRORS.add("Python", where, f"{type(err).__name__}: {err}" if isinstance(err, BaseException) else str(err),
                   tb if tb and not tb.startswith("NoneType: None") else "", VERSION)
    except Exception:
        pass


def config() -> dict[str, Any]:
    cfg = core.merged_config(mw.addonManager.getConfig(__name__))
    try:
        cfg["_fields"] = FIELDS.load()
    except Exception as err:
        _warn("fields", err)
        cfg["_fields"] = fields_core.clean_store(None)
    cfg["_tts"] = {"en": en_tts_available()}     # 1.17: cây tiếng Anh không có audio thì đọc bằng giọng máy
    return cfg


def _read_body() -> str:
    with open(os.path.join(ADDON_DIR, "web", "body.html"), encoding="utf-8") as f:
        return f.read()


def _deck_name(deck_id: int | None = None) -> str | None:
    try:
        deck = mw.col.decks.get(deck_id) if deck_id else mw.col.decks.current()
        return deck["name"] if deck else None
    except Exception:
        return None


def _stage(nid: int, deck: str | None) -> int | None:
    return core.note_stage(mw.col, nid, config()["stage_days"], deck)


def _today() -> int:
    return int(mw.col.sched.today)


def _bao_dir_set(cfg: dict[str, Any]) -> bool:
    """1.22.8: người dùng đã tự đặt bao_dir (bộ kotoba_daily / Claude Code) trong config → mới hiện thẻ Claude Code."""
    value = cfg.get("bao_dir")
    return isinstance(value, str) and bool(value.strip())


def paper_source(cfg: dict[str, Any] | None = None) -> str:
    """Nguồn báo đang dùng: "claude" (thư mục kotoba_daily), "gemini" (khoá Gemini) hoặc "" (chưa có)."""
    cfg = cfg if cfg is not None else config()
    want = cfg.get("bao_source") or "auto"
    if want == "claude" and not _bao_dir_set(cfg):
        want = "auto"   # 1.22.8: thẻ Claude Code chỉ hiện khi có bao_dir → "claude" mà không có bao_dir thì như auto
    has_claude = paper.resolve_dir(cfg.get("bao_dir")) is not None
    has_gemini = bool(ai.clean_key(cfg.get("gemini_key")))
    if want == "claude":
        return "claude" if has_claude else ""
    if want == "gemini":
        return "gemini" if has_gemini else ""
    return "claude" if has_claude else "gemini" if has_gemini else ""


def _library(lang: str = "ja") -> paper.Library | None:
    """Thư mục báo đang dùng (kotoba_daily trong bao_dir, hoặc thư mục của Gemini). None nếu chưa có.

    1.19: lang="en" → thư mục báo tiếng Anh của Gemini (cần khoá Gemini); 1.25.1: "vi" báo tiếng Việt;
    ngôn ngữ khác → chưa có báo."""
    global _wav_checked
    cfg = config()
    if lang in ("en", "vi"):
        if not ai.clean_key(cfg.get("gemini_key")):
            return None
        # chưa có thư mục thì Library coi như chưa có số nào (thư mục chỉ tạo khi Gemini viết số đầu tiên)
        base = AI_DIRS[lang]
        if base not in _libraries:
            _libraries[base] = paper.Library(base, lang)
        return _libraries[base]
    if lang != "ja":
        return None
    src = paper_source(cfg)
    if src == "claude":
        base = paper.resolve_dir(cfg.get("bao_dir"))
    elif src == "gemini":
        try:
            base = ai.ensure_dir(AI_DIR)
        except OSError as err:
            _warn("thư mục báo Gemini", err)
            return None
        if not _wav_checked:
            _wav_checked = True
            _repair_audio_later(base)   # 1.13: file WAV lồng của bản 1.12 (tiếng bụp / rè) + bản chậm còn thiếu
    else:
        return None
    if not base:
        return None
    if base not in _libraries:
        _libraries[base] = paper.Library(base)
    return _libraries[base]


DICH_DIR = os.path.join(ADDON_DIR, "user_files", "dich_claude")   # 1.23: bản dịch cho số Claude Code (kotoba_daily chỉ đọc)


def _claude_dich(date: str) -> list[list[str] | None]:
    if not paper.DATE_RE.match(date or ""):
        return []
    try:
        with open(os.path.join(DICH_DIR, date + ".json"), encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        return []
    rows = raw.get("bai") if isinstance(raw, dict) else None
    out: list[list[str] | None] = []
    for r in rows if isinstance(rows, list) else []:
        out.append([x[:1500] for x in r if isinstance(x, str)] if isinstance(r, list) and all(isinstance(x, str) for x in r)
                   else None)
    return out[:6]


def _save_claude_dich(date: str, dich: list[list[str] | None]) -> bool:
    if not paper.DATE_RE.match(date or "") or not any(dich):
        return False
    os.makedirs(DICH_DIR, exist_ok=True)
    tmp = os.path.join(DICH_DIR, date + ".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"bai": dich}, f, ensure_ascii=False)
    os.replace(tmp, os.path.join(DICH_DIR, date + ".json"))
    return True


def _claude_story_dir(cfg: dict[str, Any]) -> str | None:
    """1.25.8: thư mục kotoba_daily (báo Claude Code) để truyện chung nối với truyện của Claude — chỉ khi đã đặt bao_dir."""
    base = paper.resolve_dir(cfg.get("bao_dir")) if _bao_dir_set(cfg) else None
    return base if base and os.path.isdir(os.path.join(base, "bao")) else None


def _source_lib(src: str) -> paper.Library | None:
    """1.23: thư mục báo tiếng Nhật của một nguồn cụ thể (để Kệ báo gộp hiện cả số của nguồn không dùng nữa)."""
    cfg = config()
    if src == paper_source(cfg):
        return _library("ja")
    if src == "claude":
        base = paper.resolve_dir(cfg.get("bao_dir")) if _bao_dir_set(cfg) else None
    elif src == "gemini":
        base = AI_DIR if os.path.isdir(os.path.join(AI_DIR, "bao")) else None
    else:
        base = None
    if not base:
        return None
    if base not in _libraries:
        _libraries[base] = paper.Library(base)
    return _libraries[base]


def _ja_sources() -> list[tuple[str, paper.Library]]:
    """Các nguồn báo tiếng Nhật có số trên máy này: nguồn đang dùng trước, rồi nguồn kia (nếu có số)."""
    cur = paper_source()
    out: list[tuple[str, paper.Library]] = []
    for src in [cur] + [x for x in paper.SOURCES if x != cur]:
        lib = _source_lib(src) if src else None
        if lib is not None and (src == cur or lib.issues()):
            out.append((src, lib))
    return out


def _book() -> dict[str, Any]:
    """Sổ tiến độ theo nguồn; lần đầu: nguồn đang dùng là nguồn mặc định (giữ ở khoá cũ như bản 1.22)."""
    book = BOOK.load()
    if not book["mac_dinh"]:
        book["mac_dinh"] = paper_source() or "gemini"
        try:
            BOOK.save(book)
        except Exception as err:
            _warn("sổ tiến độ báo", err)
    return book


def paper_states(lang: str, src: str | None = None) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any] | None]:
    """(trạng thái lưu, trạng thái nhìn theo nguồn `src`, sổ theo nguồn). Báo tiếng Anh chỉ có một nguồn."""
    st = _paper_state(lang).load()
    if lang != "ja":
        return st, st, None
    book = _book()
    return st, paper.source_view(st, book, src if src is not None else paper_source()), book


def save_paper_states(lang: str, st: dict[str, Any], book: dict[str, Any] | None) -> None:
    _paper_state(lang).save(st)
    if book is not None and lang == "ja":
        BOOK.save(book)


def _is_gemini_dir(base: str) -> bool:
    """Thư mục báo do add-on (Gemini) viết: tiếng Nhật / tiếng Anh / tiếng Việt (1.25.1) — ghi bổ sung được."""
    return os.path.realpath(base) in {os.path.realpath(d) for d in AI_DIRS.values()}


def paper_ref(lang: str, ref: str) -> tuple[paper.Library | None, str, str]:
    """1.23: mã số báo của Kệ báo gộp: "2026-11-04" (nguồn đang dùng) hoặc "2026-11-04@claude" → (thư mục, nguồn, ngày)."""
    date, _, src = str(ref or "").partition("@")
    if lang != "ja":
        return _library(lang), "gemini", date
    cur = paper_source()
    src = src if src in paper.SOURCES else cur
    return (_library("ja") if src == cur else _source_lib(src)), src, date


PAPER_LANGS = ("ja", "en", "vi")     # 1.25.1: thêm báo tiếng Việt


def _en_has_issues() -> bool:
    try:
        return bool(paper.Library(AI_DIR_EN, "en").issues()) if os.path.isdir(AI_DIR_EN) else False
    except Exception:
        return False


def wanted_langs(cfg: dict[str, Any] | None = None) -> list[str]:
    """1.19.1: báo người dùng muốn nhận (ô tick ở tab Nguồn báo). Chưa chọn lần nào: tiếng Nhật, và tiếng Anh nếu
    máy đã có số báo tiếng Anh của bản 1.19.0 (để báo tiếng Anh không tự dưng biến mất)."""
    cfg = cfg if cfg is not None else config()
    raw = cfg.get("gemini_langs")
    if isinstance(raw, list):
        return clean_langs(raw)
    return ["ja"] + (["en"] if _en_has_issues() else [])


def clean_langs(raw: Any) -> list[str]:
    """1.25.2: tối đa 2 báo — tiếng Nhật và / hoặc tiếng Anh, HOẶC chỉ tiếng Việt (báo Nhật / Anh đã có bản dịch tiếng Việt,
    ba báo cùng kể một chuyện thì thừa). Có cả Việt lẫn Nhật / Anh → bỏ Việt."""
    out = [x for x in PAPER_LANGS if isinstance(raw, list) and x in raw]
    return [x for x in out if x != "vi"] if len(out) > 1 else out


def _old_waiting(cfg: dict[str, Any]) -> list[str]:
    """Hàng chờ kiểu 1.22.3 / 1.22.4: mọi báo đã tick khi vừa dán khoá lần đầu (`gemini_wait_start`), hoặc báo vừa tick
    thêm ở "Báo muốn nhận" (`gemini_wait_langs`)."""
    langs = wanted_langs(cfg)
    if cfg.get("gemini_wait_start"):
        return langs
    w = cfg.get("gemini_wait_langs")
    return [x for x in langs if isinstance(w, list) and x in w]


def _lang_source(cfg: dict[str, Any], lang: str) -> str:
    """Nguồn báo của `lang` lúc này: tiếng Nhật theo paper_source, tiếng Anh / tiếng Việt chỉ có Gemini (cần khoá)."""
    if lang == "ja":
        return paper_source(cfg)
    return "gemini" if ai.clean_key(cfg.get("gemini_key")) else ""


def confirmed_sources(cfg: dict[str, Any] | None = None) -> dict[str, str]:
    """1.23: "nguồn đã xác nhận" của từng báo (`paper_confirmed`, config trên máy này, không đồng bộ).

    Lần đầu chạy 1.23 (chưa có khoá này): ghi nguồn đang dùng làm nguồn đã xác nhận — người đang dùng Gemini không bị
    bắt bấm lại "Bắt đầu viết"; báo đang chờ kiểu 1.22.3 / 1.22.4 thì vẫn chờ."""
    cfg = cfg if cfg is not None else config()
    raw = cfg.get("paper_confirmed")
    if isinstance(raw, dict):
        return {x: raw.get(x) if raw.get(x) in ("claude", "gemini") else "" for x in PAPER_LANGS}
    wait = _old_waiting(cfg)
    on = wanted_langs(cfg)
    out = {x: _lang_source(cfg, x) if x not in wait and (x == "ja" or x in on) else "" for x in PAPER_LANGS}
    try:
        save_config(paper_confirmed=out)
    except Exception as err:
        _warn("paper_confirmed", err)
    return out


def confirm_source(lang: str, src: str) -> None:
    """Ghi nguồn đã xác nhận của báo `lang` (chỉ khi đổi, để không ghi config mỗi lần làm mới vườn)."""
    cur = confirmed_sources()
    if lang in PAPER_LANGS and cur.get(lang) != src:
        cur[lang] = src
        save_config(paper_confirmed=cur)


def ai_waiting(cfg: dict[str, Any] | None = None) -> list[str]:
    """Báo đang chờ người dùng bấm "Bắt đầu viết" (không tự viết).

    1.22.3 / 1.22.4: dán khoá lần đầu, tick thêm báo (`_old_waiting`). 1.23 (sửa tận gốc, kế hoạch mục 3 — trước đây
    bấm "Dùng Gemini cho báo tiếng Nhật", "Đổi khoá" khi đang dùng Claude Code, hay thư mục kotoba_daily tạm thời không
    thấy đều làm Gemini viết ngay): **nguồn lúc này là Gemini mà nguồn đã xác nhận không phải Gemini** thì cũng chờ.
    Chỉ "Bắt đầu viết" / "Viết" mới xác nhận Gemini; quy tắc nằm ở đây nên đường đổi nguồn nào cũng không lọt."""
    cfg = cfg if cfg is not None else config()
    langs = wanted_langs(cfg)
    wait = _old_waiting(cfg)
    conf = confirmed_sources(cfg)
    return [x for x in langs if x in wait or (_lang_source(cfg, x) == "gemini" and conf.get(x) != "gemini")]


def _unread(lang: str) -> list[str]:
    try:
        return paper.unread_dates(_library(lang), paper_states(lang)[1])
    except Exception as err:
        _warn("báo " + lang, err)
        return []


def paper_lang(dialog: Any = None) -> str:
    """Ngôn ngữ của báo đang đọc: chọn ở Kệ báo, không thì báo có số chưa đọc (tiếng Nhật trước).

    1.19.1: không còn theo deck đang xem."""
    langs = wanted_langs() or ["ja"]
    cur = getattr(dialog, "_paper_lang", "") if dialog is not None else ""
    if cur in langs:
        return cur
    for lang in langs:
        if _unread(lang):
            return lang
    return langs[0]


def _paper_state(lang: str) -> paper.PaperState:
    return PAPER_EN if lang == "en" else PAPER_VI if lang == "vi" else PAPER


def paper_langs() -> list[dict[str, Any]]:
    """Báo đã tick và đọc được trên máy này (nút chuyển ở Kệ báo, chỉ hiện khi có hai ngôn ngữ)."""
    out = []
    for lang in wanted_langs():
        try:
            lib = _library(lang)
            if lib is None:
                continue
            issues = lib.issues()
            read = paper_states(lang)[1]["read"]
        except Exception as err:
            _warn("báo " + lang, err)
            continue
        out.append({"lang": lang, "name": LANG_NAME[lang], "issues": len(issues),
                    "unread": sum(1 for d in issues if d not in read)})
    return out


def paper_summary(dialog: Any = None, **extra: Any) -> dict[str, Any]:
    """Thông tin báo cho màn chính (chip Báo, hòm thư): cộng số chưa đọc của mọi báo đã tick; lượt chép là chung."""
    s = paper.summary(None, PAPER.load(), _today())
    unread: list[str] = []
    enabled = False
    for lang in wanted_langs():
        if _library(lang) is None:
            continue
        enabled = True
        unread += _unread(lang)
    lang = paper_lang(dialog)
    s.update(enabled=enabled, unread=len(unread), latest=max(unread) if unread else None, lang=lang)
    s["source"] = paper_source() if lang == "ja" else ("gemini" if _library(lang) is not None else "")
    s["ai_busy"] = bool(_ai["running"])
    # 1.25.1: có gì để chép chính tả không (câu báo Nhật / Anh, câu / từ có audio của deck) — chỉ đọc báo tiếng Việt
    # thì thẻ Hôm nay không ghi "Chép 0/5"
    try:
        s["dict_ok"] = bool(_dict_possible or s.get("dict_done") or any(x in wanted_langs() for x in ("ja", "en")))
    except Exception:
        s["dict_ok"] = True
    s.update(extra)
    return s


def _bg(task: Any, done: Any) -> None:
    """Chạy `task` ở luồng nền, không giữ collection (Gemini / file báo không đụng collection).

    1.22.6: tham số `uses_collection` của `taskman.run_in_background` chỉ có từ Anki 23.10; Anki 2.1.x báo TypeError
    (trước đây mọi việc nền của Gemini — viết báo, giọng đọc, thử khoá, sửa bài luyện viết — hỏng trên 2.1.66)."""
    try:
        mw.taskman.run_in_background(task, done, uses_collection=False)
    except TypeError as err:
        if "uses_collection" not in str(err):
            raise
        mw.taskman.run_in_background(task, done)


def _repair_audio_later(base: str) -> None:
    """Sửa giọng đọc của các số Gemini cũ trong luồng nền (tạo bản chậm mất khoảng 1 giây mỗi câu)."""
    def done(fut: Any) -> None:
        try:
            n = fut.result()
        except Exception as err:
            _warn("sửa giọng đọc 1.12", err)
            return
        if n and _dialog is not None and getattr(_dialog, "_open_issue", None):
            _dialog._reissue(_dialog._open_issue)
    try:
        _bg(lambda: ai.repair_audio(base), done)
    except Exception as err:
        _warn("sửa giọng đọc 1.12", err)


def _avail() -> tuple[int, int, tuple[str, ...]]:
    """Số thẻ đến hạn, thẻ mới hiện có và các việc khác làm được hôm nay (để chọn nhiệm vụ)."""
    col = mw.col
    due = len(col.find_cards("is:due is:review -is:suspended"))
    new = len(col.find_cards("is:new -is:suspended"))
    extra: list[str] = []
    try:
        if any(_unread(lang) for lang in wanted_langs()):     # 1.19.1: mọi báo đã tick
            extra.append("paper")
        # 1.25.1: chỉ báo tiếng Việt (không chép) thì nhiệm vụ chép chính tả theo deck đang xem
        if _dict_possible or (_library() is not None and any(x in wanted_langs() for x in ("ja", "en"))):
            extra.append("dict")
    except Exception as err:
        _warn("avail", err)
    return due, new, tuple(extra)


def _note_item(nid: int) -> dict[str, Any] | None:
    try:
        return paper.note_dict_item(mw.col.get_note(nid), config())
    except Exception:
        return None


def _word_item(nid: int) -> dict[str, Any] | None:
    try:
        return paper.note_word_item(mw.col.get_note(nid), config())
    except Exception:
        return None


def _tts_has(prefix: str) -> bool:
    try:
        from aqt.tts import TTSPlayer
        for p in list(av_player.players):
            if isinstance(p, TTSPlayer) and any(
                    str(getattr(v, "lang", "")).lower().replace("-", "_").startswith(prefix) for v in p.voices()):
                return True
    except Exception as err:
        _warn("giọng đọc của máy", err)
    return False


def ja_tts_available() -> bool:
    """Máy có giọng đọc tiếng Nhật của hệ điều hành không (Windows / macOS; Anki phát bằng TTSTag)."""
    global _ja_tts
    if _ja_tts is None:
        _ja_tts = _tts_has("ja")
    return bool(_ja_tts)


def en_tts_available() -> bool:
    """1.17: máy có giọng đọc tiếng Anh của hệ điều hành không."""
    global _en_tts
    if _en_tts is None:
        _en_tts = _tts_has("en")
    return bool(_en_tts)


def _mpv() -> Any:
    try:
        from aqt import sound as snd
        return getattr(snd, "mpvManager", None)
    except Exception:
        return None


def _voice(cfg: dict[str, Any] | None = None) -> paper.Voice:
    """Giọng dự phòng cho câu chép không có audio: giọng Gemini đã tạo → giọng của máy → nhờ Gemini tạo."""
    cfg = cfg if cfg is not None else config()
    o = _ai_opts(cfg)
    mpv = _mpv() is not None
    if o["dict_voice"] == "tat":
        return paper.Voice(mpv=mpv)
    tts, tts_en = ja_tts_available(), en_tts_available()
    if o["dict_voice"] == "may":
        return paper.Voice(tts=tts, mpv=mpv, tts_en=tts_en)
    has_key = bool(ai.clean_key(cfg.get("gemini_key")))
    st = ai.load_status(AI_DIR) if os.path.isdir(AI_DIR) else {}
    voice_name = o["voice"]
    return paper.Voice(cached=lambda speech: ai.cached_voice(AI_DIR, speech, voice_name), tts=tts,
                       gen=has_key and st.get("voice_fail_day") != ai_today(), mpv=mpv, tts_en=tts_en)


def _play(target: tuple[str, Any, float]) -> None:
    """Phát: ('file', đường dẫn tuyệt đối), ('media', tên file media của collection) hoặc ('tts', chữ) + tốc độ."""
    global _mpv_slow
    kind, what, speed = target
    if kind in ("tts", "tts_en"):
        from anki.sound import TTSTag
        lang = "en_US" if kind == "tts_en" else "ja_JP"
        av_player.play_tags([TTSTag(field_text=what, lang=lang, voices=[], speed=speed, other_args=[])])
        return
    mgr = _mpv()
    if mgr is not None:
        try:
            mgr.set_property("speed", float(speed))
            _mpv_slow = speed != 1.0
        except Exception:
            _mpv_slow = False
    # file của báo / giọng Gemini: đường dẫn tuyệt đối (đã kiểm tra); file của deck: chỉ tên file trong media
    av_player.play_file(what if kind == "file" else os.path.basename(what))


def _reset_speed(*_args: Any) -> None:
    """Phát chậm bằng mpv xong thì trả tốc độ về 1 (để audio của thẻ ôn sau đó không bị chậm theo)."""
    global _mpv_slow
    if _mpv_slow:
        _mpv_slow = False
        mgr = _mpv()
        if mgr is not None:
            try:
                mgr.set_property("speed", 1.0)
            except Exception:
                pass


def voice_start(speeches: list[str], after: Any = None) -> bool:
    """Nhờ Gemini tạo giọng đọc (luồng nền) cho câu chép không có audio. after() chạy ở luồng chính khi xong."""
    if _voice_job["running"] or not mw.col:
        return False
    cfg = config()
    o = _ai_opts(cfg)
    key = ai.clean_key(cfg.get("gemini_key"))
    todo = [s for s in dict.fromkeys(speeches) if s and s not in _voice_job["tried"]][:8]
    if not key or o["dict_voice"] != "auto" or not todo:
        return False
    try:
        base = ai.ensure_dir(AI_DIR)
    except OSError as err:
        _warn("thư mục báo Gemini", err)
        return False
    st = ai.load_status(base)
    if st.get("voice_fail_day") == ai_today():
        return False
    client = ai.Gemini(key, exhausted=_shared_exhausted())
    _voice_job["running"] = True
    _voice_job["tried"].update(todo)

    def task() -> dict[str, Any]:
        return ai.make_voices(client, base, todo, o["voice"], o["tts_model"])

    def done(fut: Any) -> None:
        _voice_job["running"] = False
        try:
            res = fut.result()
        except Exception as err:
            _warn("giọng đọc Gemini cho câu chép", err)
            res = {"made": 0, "error": type(err).__name__}
        st2 = ai.load_status(base)
        st2["exhausted"] = client.exhausted_state()
        if res.get("error") and not res.get("made"):
            st2["voice_fail_day"] = ai_today()
            st2["voice_error"] = str(res["error"])[:200]
        ai.save_status(base, st2)
        if after is not None:
            try:
                after()
            except Exception as err:
                _warn("sau khi tạo giọng đọc", err)

    _bg(task, done)
    return True


def _write_progress(plants: list[dict[str, Any]] | None) -> None:
    """Ghi tien_do.json cho bộ viết báo (từ sắp héo, từ chép sai, số báo chưa đọc)."""
    lib = _library()
    if lib is None or plants is None:
        return
    try:
        paper.write_progress(lib.base, paper.progress_payload(paper_states("ja")[1], lib, plants, _today()))
    except (OSError, ValueError) as err:
        _warn("tien_do.json", err)


def _quest_after(kind: str, **kw: Any) -> dict[str, Any] | None:
    try:
        res = STATE.quest_event(_today(), _avail, kind, **kw)
    except Exception as err:
        _warn("quest", err)
        return None
    res.pop("wallet", None)
    return res


# 1.23 (KB-03): sổ phần thưởng của các lượt ôn trong phiên này (Undo của Anki chỉ có trong phiên) — Undo lượt ôn thì
# trả lại xu; trước đây ôn rồi Undo lặp lại cùng thẻ thì mỗi vòng lại được cộng xu.
_ledger: list[dict[str, Any]] = []
LEDGER_MAX = 60


def _quest_snapshot() -> tuple[list[str], bool, int | None]:
    try:
        q = STATE.load().get("quest") or {}
    except Exception:
        return [], False, None
    return list(q.get("done") or []), bool(q.get("chest")), q.get("day")


def _streak_snapshot() -> tuple[int | None, int, int]:
    """1.25.3: (ngày nhiệm vụ, chuỗi dài nhất, chuỗi đang tưới) trước lượt ôn — Undo trả về đúng các số này."""
    try:
        q = STATE.load().get("quest") or {}
        pr = q.get("progress") or {}
        return q.get("day"), int(pr.get("streak") or 0), int(pr.get("streak_cur") or 0)
    except Exception:
        return None, 0, 0


def _last_rev(cid: int) -> int:
    try:
        return int(mw.col.db.scalar("select max(id) from revlog where cid = ?", int(cid)) or 0)
    except Exception:
        return 0


# 1.25.3 (audit BUG-01): ghi cấu hình collection (kể cả set_config không tạo bước Undo) ngay sau Undo làm Anki xoá
# Redo. Nên lượt ôn vừa Undo chỉ được đánh dấu "chờ" (`wait`): ví đọc ra luôn đã trừ phần thưởng của lượt đó (móc
# STATE.on_load), còn việc ghi đợi tới lần ghi ví kế tiếp (ôn thẻ khác, mua đồ…: móc STATE.on_save đánh dấu đã trả),
# tới lúc Redo không còn dùng được (thao tác khác của Anki), trước khi đồng bộ hoặc khi đóng hồ sơ. Redo trước đó thì
# thôi chờ, không ghi gì.
def _alive(e: dict[str, Any]) -> bool | None:
    try:
        return bool(mw.col.db.scalar("select count() from revlog where id = ? and cid = ?", e["rev"], e["cid"]))
    except Exception:
        return None


def _redo_possible() -> bool:
    try:
        return bool(mw.col.undo_status().redo)
    except Exception:
        return False


def _undo_waiting() -> bool:
    return any(e.get("wait") for e in _ledger)


def _undo_on_load(data: dict[str, Any]) -> None:
    """STATE.on_load: áp phần trả lại của các lượt đang chờ vào ví vừa đọc (lượt mới Undo trước — đúng thứ tự Undo)."""
    if not _undo_waiting() or not mw.col:
        return
    for e in reversed(_ledger):
        if not e.get("wait"):
            continue
        if _alive(e):            # đã Redo (Anki không có móc riêng cho Redo) → thôi chờ
            e["wait"] = False
            continue
        core.undo_reward(data, e)


def _undo_on_save(_data: dict[str, Any]) -> None:
    """STATE.on_save: ví sắp ghi được đọc qua on_load nên đã có phần trả lại → các lượt chờ coi như đã trả."""
    for e in _ledger:
        if e.get("wait"):
            e["wait"] = False
            e["undone"] = True


def _flush_undo(force: bool = False) -> None:
    """Ghi phần trả lại đang chờ khi Redo không còn dùng được (force: trước khi đồng bộ / đóng hồ sơ)."""
    if not _undo_waiting() or not mw.col:
        return
    if not force and _redo_possible():
        return
    STATE.save(STATE.load())


def check_undo() -> int:
    """So sổ phần thưởng với revlog: lượt ôn đã bị Undo (dòng revlog mất) → trả lại xu (ghi khi Redo không còn dùng
    được, xem trên); Redo (dòng revlog có lại) → thôi chờ / cộng lại. Gọi sau Undo của Anki (state_did_undo), sau mỗi
    thao tác của Anki khi đang có lượt chờ, và mỗi lần vườn làm mới. Trả về số xu chênh (âm = đã trừ)."""
    if not _ledger or not mw.col:
        return 0
    delta = 0
    fresh: list[dict[str, Any]] = []
    for e in reversed(_ledger):
        alive = _alive(e)
        if alive is None:
            continue
        if not alive and not e.get("undone") and not e.get("wait"):
            fresh.append(e)
        elif alive and e.get("wait"):
            e["wait"] = False                # Redo trước khi kịp ghi: không có gì để làm
        elif alive and e.get("undone"):
            delta += STATE.redo_answer(e)
            e["undone"] = False
            e.update(goal=0, quest_coins=0, quest_done=[], chest=False,      # nhiệm vụ / mục tiêu không cộng lại
                     streak0=None, streak_cur0=None)
    if fresh:
        c0 = int(STATE.load().get("coins") or 0)
        for e in fresh:
            e["wait"] = True
        delta += int(STATE.load().get("coins") or 0) - c0
    _flush_undo()
    return delta


def _on_undo(*_args: Any) -> None:
    try:
        delta = check_undo()
    except Exception as err:
        _warn("hoàn tác lượt ôn", err)
        return
    if delta and _dialog is not None:
        try:
            _dialog.refresh()
        except Exception as err:
            _warn("refresh sau Undo", err)
    if delta < 0 and config().get("show_tooltips", True):
        tooltip("ことば畑: đã hoàn tác lượt ôn, trả lại %d xu." % -delta, period=2500)


def _on_op(*_args: Any) -> None:
    """operation_did_execute: có lượt đang chờ thì xem đã Redo chưa / Redo còn dùng được không (ghi khi hết Redo)."""
    if not _undo_waiting():
        return
    try:
        check_undo()
    except Exception as err:
        _warn("hoàn tác lượt ôn", err)


def _on_sync_start(*_args: Any) -> None:
    try:
        _flush_undo(force=True)
    except Exception as err:
        _warn("hoàn tác lượt ôn (đồng bộ)", err)


def _record_answer(nid: int, old: int | None, ease: int, deck: str | None,
                   before: str | None = None, cid: int | None = None) -> dict[str, Any]:
    """Cộng xu, ghi số lần tưới. Trả về kết quả để làm hiệu ứng / thông báo."""
    cfg = config()
    new = core.note_stage(mw.col, nid, cfg["stage_days"], deck)
    done0, chest0, _qd = _quest_snapshot()
    sday0, streak0, scur0 = _streak_snapshot()
    _wallet, gained = STATE.record_answer(ease, old, new, day=_today(), before=before)
    info: dict[str, Any] = {"nid": nid, "ease": ease, "old": old, "new": new, "gained": gained, "message": None,
                            "goal_bonus": 0}
    try:
        today = _daily_stats()
        info["goal_bonus"] = STATE.claim_goal(
            today["day"], today["reviews"], int(cfg["daily_goal"]), int(cfg["daily_bonus"])
        )
    except Exception as err:
        _warn("daily goal", err)
    if old is not None and new is not None and new > old:
        word, _ = core.note_texts(mw.col.get_note(nid), cfg)
        info["message"] = f"{word}: {core.STAGES[old]} → {core.STAGES[new]}  +{gained} xu"
    info["quests"] = _quest_after(
        "answer", before=before, ease=ease,
        stage_up=old is not None and new is not None and new > old,
    )
    if cid:
        done1, chest1, qday = _quest_snapshot()
        q = info["quests"] or {}
        _ledger.append({
            "cid": int(cid), "rev": _last_rev(int(cid)), "gained": gained, "goal": int(info.get("goal_bonus") or 0),
            "goal_day": _today() if info.get("goal_bonus") else None, "quest_coins": int(q.get("coins") or 0),
            "quest_done": [x for x in done1 if x not in done0], "chest": chest1 and not chest0, "qday": qday,
            "day": _today(), "ease": ease, "before": before,
            "stage_up": old is not None and new is not None and new > old,
            "harvest": old is not None and new == core.STAGE_FRUIT and old < core.STAGE_FRUIT,
            # 1.25.3: chuỗi tưới trước lượt này (cùng ngày nhiệm vụ; ngày mới thì từ 0)
            "streak0": streak0 if sday0 == qday else 0, "streak_cur0": scur0 if sday0 == qday else 0,
        })
        del _ledger[:-LEDGER_MAX]
    return info


# 1.22.6: lượt ôn đang lưu (thẻ → lúc bấm). Lượt ôn ghi vào revlog ở luồng nền trước khi add-on kịp ghi "máy tính đã
# trả xu" (`_record_answer` chạy sau). Nếu vườn làm mới đúng lúc đó (đổi deck ngay sau khi chấm, đồng bộ xong…) thì
# lần bù xu điện thoại tưởng lượt này là lượt ôn ngoài add-on → trả xu hai lần. Còn lượt đang lưu thì hoãn lần bù.
_answering: dict[int, float] = {}
ANSWER_WAIT = 30.0     # giây; lượt lưu hỏng (không bao giờ xong) thì sau chừng này bù lại như thường


def answer_started(cid: int) -> None:
    _answering[int(cid)] = time.time()


def answer_finished(cid: int) -> None:
    _answering.pop(int(cid), None)


def answers_pending(now: float | None = None) -> bool:
    now = time.time() if now is None else now
    for cid, at in list(_answering.items()):
        if now - at > ANSWER_WAIT:
            _answering.pop(cid, None)
    return bool(_answering)


def mobile_catch_up() -> dict[str, Any] | None:
    """1.11: bù xu / nhiệm vụ / mục tiêu ngày cho lượt ôn không qua add-on (điện thoại…). None = không có gì."""
    if not mw.col:
        return None
    if answers_pending():      # 1.22.6: lượt ôn của chính máy này đang lưu → để lần làm mới sau bù (không trả hai lần)
        return None
    cfg = config()
    if not cfg.get("mobile_coins", True):
        return None
    try:
        res = STATE.mobile_catch_up(mw.col, int(cfg["daily_goal"]), int(cfg["daily_bonus"]), _avail)
    except Exception as err:
        _warn("bù xu điện thoại", err)
        return None
    if res:
        res.pop("wallet", None)
    return res


def mobile_message(res: dict[str, Any]) -> str:
    """Câu thông báo ngắn cho lần bù xu."""
    parts = [f"bù {res['reviews']} lượt ôn trên điện thoại: +{res['coins']} xu"]
    if res.get("goal"):
        parts.append(f"thưởng mục tiêu ngày +{res['goal']} xu")
    q = res.get("quests") or {}
    if q.get("done"):
        parts.append(f"xong {len(q['done'])} nhiệm vụ +{len(q['done']) * core.QUEST_REWARD} xu")
    if q.get("chest"):
        parts.append(f"mở rương +{q['chest']['coins']} xu")
    if not res.get("reviews"):
        parts = parts[1:]
    return "ことば畑: " + " · ".join(parts)


# ---------------------------------------------------------------------------
# 1.12: Báo do Gemini viết (khoá API của người dùng, chạy nền, không đụng collection)
# ---------------------------------------------------------------------------


def save_config(**changes: Any) -> None:
    """Ghi vài mục cấu hình của add-on (meta.json trên máy này, không đồng bộ AnkiWeb)."""
    raw = dict(mw.addonManager.getConfig(__name__) or {})
    raw.update(changes)
    mw.addonManager.writeConfig(__name__, raw)


def prefs_script() -> str:
    """1.25.3: <script> đặt window.__kbPrefs = cài đặt riêng máy đã lưu (config "prefs"), chèn vào <head> của trang vườn.
    localStorage của trang không còn sau khi tắt Anki (webview của Anki dùng profile không lưu, cổng đổi mỗi lần mở)."""
    try:
        prefs = more_core.clean_prefs((mw.addonManager.getConfig(__name__) or {}).get("prefs"))
    except Exception as err:
        _warn("cài đặt riêng máy", err)
        prefs = {}
    data = json.dumps(prefs, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e")
    return f"<script>window.__kbPrefs = {data};</script>"


# 1.25.5: bản sửa hình gốc (chế độ admin) — kèm gói cho mọi người + bản của máy người sửa (mau_core)
MAU_BUNDLED = os.path.join(ADDON_DIR, "mau_sua.json")
MAU_LOCAL = os.path.join(ADDON_DIR, "user_files", "mau_sua.json")
# 1.25.7 (người dùng chọn "góp ý sửa hình"): chế độ admin bật bằng file user_files/admin trên máy người làm add-on
# (không còn config "admin" — ai cũng tự bật được rồi vẽ lại đồ có sẵn miễn phí). Gói phát hành không có file này,
# cập nhật add-on vẫn giữ. Người dùng thường chỉ có "Góp ý hình": vẽ thử rồi lưu file gửi đi, vườn của họ không đổi.
ADMIN_FILE = os.path.join(ADDON_DIR, "user_files", "admin")


def admin_on() -> bool:
    return os.path.isfile(ADMIN_FILE)


def fixes_merged() -> dict[str, Any]:
    # 1.25.7: bản sửa của máy chỉ áp khi có file admin — chép file vào user_files/ không đổi được vườn;
    # admin xoá file admin là thấy đúng như người dùng sẽ thấy (chỉ bản đi kèm gói)
    if not admin_on():
        return mau.read(MAU_BUNDLED)
    return mau.merge(mau.read(MAU_BUNDLED), mau.read(MAU_LOCAL))


def fix_script() -> str:
    """<script> đặt window.__kbFix = bản sửa hình (trước khi các file hình chạy)."""
    try:
        data = fixes_merged()["sua"]
    except Exception as err:
        _warn("bản sửa hình", err)
        data = {}
    text = json.dumps(data, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e")
    return f"<script>window.__kbFix = {text};</script>"


def save_prefs(raw: str) -> None:
    """Lệnh `prefs:set:{"kb-sky": "…", "kb-music": null…}` (trang gom các thay đổi rồi gửi một lần)."""
    try:
        changes = json.loads(raw)
    except ValueError:
        return
    if not isinstance(changes, dict):
        return
    cur = (mw.addonManager.getConfig(__name__) or {}).get("prefs")
    new = more_core.merge_prefs(cur, changes)
    if new != more_core.clean_prefs(cur):
        save_config(prefs=new)


def ai_today() -> str:
    """Ngày của số báo: ngày thật trên máy (như `date +%F` của bộ kotoba_daily)."""
    return datetime.date.today().isoformat()


def _ai_opts(cfg: dict[str, Any]) -> dict[str, Any]:
    level = cfg.get("gemini_level") if cfg.get("gemini_level") in ai.LEVELS else "N5"
    audio = cfg.get("gemini_audio") if cfg.get("gemini_audio") in ai.AUDIO_MODES else "chinh_ta"
    voice = cfg.get("gemini_voice") if cfg.get("gemini_voice") in ai.VOICES else ai.VOICES[0]
    model = cfg.get("gemini_model") if isinstance(cfg.get("gemini_model"), str) else ""
    tts = cfg.get("gemini_tts_model") if isinstance(cfg.get("gemini_tts_model"), str) else ""
    level_en = cfg.get("gemini_level_en") if cfg.get("gemini_level_en") in ai_en.LEVELS else ai_en.DEFAULT_LEVEL
    voice_en = cfg.get("gemini_voice_en") if cfg.get("gemini_voice_en") in ai.VOICES else voice
    return {"level": level, "audio": audio, "voice": voice, "model": model.strip()[:80],
            "level_en": level_en, "voice_en": voice_en,
            "tts_model": tts.strip()[:80], "auto": bool(cfg.get("gemini_auto", True)),
            "scope": "deck",      # 1.23: báo Gemini chỉ lấy từ deck (gemini_scope "auto" cũ = "deck")
            "story": cfg.get("gemini_story") if cfg.get("gemini_story") in story_core.MODES else "hay",
            "tone": cfg.get("gemini_story_tone") if cfg.get("gemini_story_tone") in story_core.TONES else "am",
            # 1.25.1: chủ đề truyện chọn nhiều (bản cũ chỉ đọc gemini_story_tone = chủ đề đầu tiên)
            "tones": story_core.norm_tones(cfg.get("gemini_story_tones") if isinstance(cfg.get("gemini_story_tones"), list)
                                           else cfg.get("gemini_story_tone")),
            "dict_voice": cfg.get("dict_voice") if cfg.get("dict_voice") in DICT_VOICE_MODES else "auto"}


DICT_VOICE_MODES = ("auto", "may", "tat")   # 1.13: giọng cho câu chép không có audio: Gemini → máy / chỉ máy / tắt


def _claude_pham_vi(cfg: dict[str, Any]) -> str | None:
    base = paper.resolve_dir(cfg.get("bao_dir"))
    path = os.path.join(base, "pham_vi.json") if base else ""
    return path if path and os.path.isfile(path) else None


def _lang_view(lang: str, o: dict[str, Any], date: str) -> dict[str, Any]:
    """Một hàng của thẻ Gemini (báo tiếng Nhật / tiếng Anh / tiếng Việt): trình độ, số hôm nay, lỗi, phạm vi, nhật ký."""
    en = lang == "en"
    base = AI_DIRS[lang]
    st = ai.load_status(base) if os.path.isdir(base) else {}
    today: dict[str, Any] | None = None
    if ai.has_issue(base, date):
        iss = paper.Library(base, lang).try_issue(date)
        today = {"date": date, "so": iss["so"] if iss else 0,
                 "title": paper.surface(iss["bai"][0]["tieu_de"]) if iss else "",
                 "audio_left": 0 if lang == "vi" else len(ai.audio_todo(base, date, o["audio"]))}
    focus = st.get("focus") if st.get("focus_day") == date and isinstance(st.get("focus"), list) else None
    return {
        "lang": lang, "name": LANG_NAME[lang], "level": o["level_en"] if en else "" if lang == "vi" else o["level"],
        "levels": list(ai_en.LEVELS if en else ai_vi.LEVELS if lang == "vi" else ai.LEVELS), "today": today,
        "error": st.get("error", "") if st.get("day") == date else "",
        "audio_error": st.get("audio_error", "") if st.get("day") == date else "",
        "thieu": st.get("thieu", "") if st.get("thieu_day") == date else "",
        "focus": focus, "scope_text": st.get("scope", ""),
        "sub_off": st.get("sub_off") == date,      # 1.25.1: hôm nay không viết được vì gói báo hết hạn
        "log": ai.log_summary(ai.last_log(base, st.get("log_day") or date)), "log_day": st.get("log_day") or "",
        "issues": len(paper.Library(base, lang).issues()) if os.path.isdir(base) else 0,
        "running": bool(_ai["running"]) and _ai.get("lang", "ja") == lang,
        "model": st.get("model", ""), "tts": bool(st.get("tts")),
    }


def ai_view(extra: dict[str, Any] | None = None, lang: str | None = None) -> dict[str, Any]:
    """Dữ liệu cho tab Nguồn báo. Không bao giờ gửi khoá (chỉ dạng che AIza…abcd / AQ.A…abcd).

    1.19.1: một hàng cho mỗi ngôn ngữ (ô tick "Báo muốn nhận", trình độ, deck lấy từ); không theo deck đang xem."""
    cfg = config()
    o = _ai_opts(cfg)
    key = ai.clean_key(cfg.get("gemini_key"))
    date = ai_today()
    langs = {x: _lang_view(x, o, date) for x in PAPER_LANGS}
    claude_dir = paper.resolve_dir(cfg.get("bao_dir"))
    claude_issues = len(paper.Library(claude_dir).issues()) if claude_dir else 0
    pv = _claude_pham_vi(cfg)
    decks: dict[str, list[dict[str, Any]]] = {x: [] for x in PAPER_LANGS}
    picked: dict[str, list[int]] = {x: [] for x in PAPER_LANGS}
    modes: dict[str, str] = {x: "deck" for x in PAPER_LANGS}
    if mw.col:
        try:
            decks = words.lang_decks(mw.col, cfg)
            src = words.load_src(mw.col)
            picked = {x: src[x]["decks"] for x in PAPER_LANGS}
            modes = {x: src[x]["mode"] for x in PAPER_LANGS}
        except Exception as err:
            _warn("danh sách deck cho báo", err)
    view = {
        "source": paper_source(cfg), "want": cfg.get("bao_source") or "auto", "langs_on": wanted_langs(cfg),
        "gemini": {
            "key": ai.mask_key(key), "audio": o["audio"], "voice": o["voice"], "auto": o["auto"],
            "scope": o["scope"], "model": o["model"], "story": o["story"], "tone": o["tone"],
            "tones": [[k, story_core.TONE_NAME[k]] for k in story_core.TONES], "tones_on": o["tones"],
            "has_tts": any(v["tts"] for v in langs.values()),
            "running": bool(_ai["running"]), "run_lang": _ai.get("lang", "ja"), "testing": bool(_ai["testing"]),
            "msg": _ai["msg"], "langs": langs, "first": bool(key) and bool(cfg.get("gemini_wait_start")),
            "waiting": [x for x in ai_waiting(cfg) if not langs[x]["today"]] if key else [],
            # 1.23: báo chờ vì nguồn vừa thành Gemini (bấm "Dùng Gemini", mất thư mục kotoba_daily), không phải vừa tick
            "switched": [x for x in ai_waiting(cfg) if x not in _old_waiting(cfg)] if key else [],
        },
        "claude": {"set": _bao_dir_set(cfg), "ok": bool(claude_dir), "pham_vi": bool(pv),
                   "path": diag.redact(str(claude_dir or cfg.get("bao_dir") or ""))[:160], "issues": claude_issues},
        "decks": decks, "picked": picked, "modes": modes, "max_decks": words.MAX_DECKS,
        "sub": paper_sub_view(),
        "voices": list(ai.VOICES), "key_page": ai.KEY_PAGE,
        # 1.13: giọng cho câu chép không có audio
        "dict_voice": {"mode": o["dict_voice"], "tts": ja_tts_available(), "key": bool(key),
                       "error": "", "running": bool(_voice_job["running"])},
    }
    st = ai.load_status(AI_DIR) if os.path.isdir(AI_DIR) else {}
    if st.get("voice_fail_day") == date:
        view["dict_voice"]["error"] = st.get("voice_error", "")
    if extra:
        view.update(extra)
    return view


def _ai_push(extra: dict[str, Any] | None = None) -> None:
    if _dialog is not None:
        try:
            _dialog._js("aiStatus", ai_view(extra))
        except Exception as err:
            _warn("aiStatus", err)


def _shared_exhausted(*bases: str) -> dict[str, float]:
    """1.19: hạn mức theo khoá, dùng chung cho báo tiếng Nhật / tiếng Anh / giọng đọc → gộp model đã hết hạn mức."""
    out: dict[str, float] = {}
    try:      # 1.20: model hết hạn mức do bài luyện viết gặp (bài sửa chạy song song với báo)
        for k, v in _load_quota().items():
            out[k] = max(out.get(k, 0), float(v))
    except Exception:
        pass
    for b in bases or (AI_DIR, AI_DIR_EN, AI_DIR_VI):
        st = ai.load_status(b) if os.path.isdir(b) else {}
        for k, v in (st.get("exhausted") or {}).items() if isinstance(st.get("exhausted"), dict) else []:
            if isinstance(k, str) and isinstance(v, (int, float)):
                out[k] = max(out.get(k, 0), float(v))
    return out


def ai_test_key(key: str) -> None:
    """Thử khoá trong luồng nền; đúng thì lưu khoá (dán lần đầu: chọn luôn nguồn Gemini, chờ "Bắt đầu viết").

    1.22.3 (người dùng: "test khóa vừa xong thì gemini chạy ngay lập tức, không kịp cấu hình gì cả"): dán khoá lần đầu
    thì chưa viết — chờ người dùng chọn báo muốn nhận / trình độ / deck rồi bấm "Bắt đầu viết" (`gemini_wait_start`).
    Đổi khoá khi đã có khoá thì giữ như cũ."""
    if _ai["testing"]:
        return
    _ai["testing"] = True
    first = not ai.clean_key(config().get("gemini_key"))
    old = ai.load_status(AI_DIR) if os.path.isdir(AI_DIR) else {}
    client = ai.Gemini(key, exhausted=_shared_exhausted())
    prefer = old.get("model", "")

    def done(fut: Any) -> None:
        _ai["testing"] = False
        ok = False
        try:
            r = fut.result()
            if first:
                save_config(gemini_key=key, bao_source="gemini", gemini_wait_start=True)
            else:
                save_config(gemini_key=key)      # 1.23: "Đổi khoá" không đổi nguồn báo (trước: tự chọn Gemini)
            st = ai.load_status(ai.ensure_dir(AI_DIR))
            st.update(model=r["model"], models=r["models"], tts=r["tts"], exhausted=client.exhausted_state())
            st.pop("voice_fail_day", None)
            ai.save_status(AI_DIR, st)
            msg = "✓ Khoá dùng được · model " + r["model"]
            if not r["tts"]:
                msg += " · khoá này chưa có giọng đọc Gemini (vẫn đọc báo được)"
            if first:
                msg += ". Chọn báo muốn nhận, trình độ, deck rồi bấm “Bắt đầu viết”."
            ok = True
        except ai.AIError as err:
            msg = "✗ " + str(err)
        except Exception as err:
            _warn("thử khoá Gemini", err)
            msg = "✗ Không thử được khoá (%s)." % type(err).__name__
        _ai_push({"flash": msg, "ok": ok})
        if ok and _dialog is not None:
            _dialog.refresh()          # đổi nguồn báo (+ tự viết số hôm nay nếu đang bật và không chờ "Bắt đầu viết")

    _bg(lambda: ai.test_key(client, prefer), done)
    _ai_push()


def _loi_sai(lang: str) -> list[str]:
    """Từ chép sai gần đây (lượt chép chung + báo của ngôn ngữ đó), đúng chữ của ngôn ngữ."""
    if lang == "vi":          # 1.25.1: báo tiếng Việt không có chép chính tả
        return []
    today = _today()
    miss = paper.progress_payload(_paper_state(lang).load(), None, [], today)["loi_sai"]
    if lang == "en":
        miss += paper.progress_payload(PAPER.load(), None, [], today)["loi_sai"]
        miss = [w for w in miss if re.search(r"[A-Za-z]", w)]
    else:
        miss = [w for w in miss if ai.JP_CHAR_RE.search(w)]
    return list(dict.fromkeys(miss))[:12]


def _ai_scope(cfg: dict[str, Any], o: dict[str, Any], lang: str) -> dict[str, Any]:
    """1.19.1: phạm vi của báo `lang` — 100 từ lấy từ các deck đã chọn (không chọn thì mọi deck), không theo deck
    đang xem. 1.23: báo Gemini **chỉ** lấy từ deck (bỏ "Giáo trình" / pham_vi.json của kotoba_daily — báo Claude Code
    vẫn theo giáo trình); trình độ luôn theo ô Trình độ."""
    en = lang == "en"
    src = words.load_src(mw.col)
    level = o["level_en"] if en else o["level"]
    if lang == "vi":          # 1.25.2: báo tiếng Việt chỉ truyện + tin làng, không lấy thẻ
        return ai_vi.scope()
    mod = AI_MODS.get(lang)
    builder = mod.scope_from_pick if mod else ai.scope_from_pick
    if src[lang]["mode"] == "level":     # 1.25.1: Không dùng deck — Gemini viết theo trình độ, tự chọn từ đáng học
        scope = builder({"kho": [], "all": [], "grammar": [], "decks": []}, level)
        scope["khong_deck"] = True
        return scope
    pk = words.pick(mw.col, cfg, lang, src[lang]["decks"], ai_today(), eligible=mod.kho_ok if mod else ai.kho_ok)
    scope = builder(pk, level)
    n = len(scope.get("kho") or [])
    if n < words.MIN_WORDS:
        # 1.25.1: chưa có deck / deck đã chọn quá ít từ → vẫn viết, theo trình độ (từ ít ỏi đã có vẫn gửi kèm)
        scope["khong_deck"] = True
        scope["it_tu"] = n
    try:
        scope["loi_sai"] = list(dict.fromkeys(_loi_sai(lang) + list(scope.get("loi_sai", []))))[:12]
    except Exception as err:
        _warn("từ chép sai", err)
    return scope


def _village_weather(date: str) -> str:
    """1.25.2: thời tiết của làng hôm nay = trời trong vườn (cùng công thức với sky.js, có thiên hướng của giao diện mùa)."""
    try:
        day = datetime.date.fromisoformat(date)
        theme = None
        try:
            from . import season_core
            theme = season_core.active_theme(STATE.load()["season"], day)
        except Exception:
            theme = None
        fixed = _fixed_weather() if date == ai_today() else ""
        if fixed:                       # 1.25.9: người dùng chọn trời cố định trong ⚙ → báo hôm nay theo đúng trời đó
            return "cả ngày " + fixed
        return story_core.village_weather(day, theme)
    except Exception as err:
        _warn("thời tiết của làng", err)
        return ""


def _fixed_weather() -> str:
    """Trời cố định đã chọn ở ⚙ (config prefs "kb-sky") → "mưa" / "tuyết"…; "" nếu để Tự động."""
    try:
        prefs = more_core.clean_prefs((mw.addonManager.getConfig(__name__) or {}).get("prefs"))
        sky = json.loads(prefs.get("kb-sky") or "{}")
        w = sky.get("weather") if isinstance(sky, dict) else None
        return story_core._WEATHER_VI.get(w, "") if isinstance(w, str) else ""
    except (ValueError, TypeError, AttributeError):
        return ""


def src_mode(lang: str) -> str:
    try:
        return words.load_src(mw.col)[lang]["mode"]
    except Exception:
        return "deck"


def paper_sub_view() -> dict[str, Any]:
    """1.25.1: gói báo cho tab Nguồn báo / bảng Báo (ngày theo ngày thật như số báo)."""
    try:
        data = STATE.load()
        v = more_core.sub_view(data["more"]["paper_sub"], datetime.date.fromisoformat(ai_today()))
        v["coins"] = data["coins"]
        return v
    except Exception as err:
        _warn("gói báo", err)
        return {"active": True, "left": 0, "plans": [], "coins": 0, "auto": True}


def paper_sub_ensure(date: str, commit: bool = True) -> tuple[str, int]:
    """Gói báo cho số Gemini mới. Báo Claude Code (bộ kotoba_daily của người dùng) không cần gói.

    1.26.1: ai_start chỉ xem (`commit=False`: hết hạn thì không viết); tặng thử / gia hạn (trừ xu) ở _ai_done khi số báo đã
    viết xong — Gemini lỗi thì không mất xu, gói thử chưa bắt đầu."""
    try:
        res, price = STATE.paper_sub_ensure(date, commit)
    except Exception as err:
        _warn("gói báo", err)
        return "ok", 0
    if not commit:
        return res, price
    note = ""
    if res == "trial":
        note = "Tặng %d ngày đọc báo miễn phí. Sau đó: gói 1 tuần 100 xu, 1 tháng 300 xu." % more_core.PAPER_TRIAL_DAYS
    elif res == "renewed":
        note = "Đã gia hạn gói báo · −%d xu." % price
    if note and _dialog is not None:
        try:
            _dialog._js("notice", {"msg": note, "ms": 7000})
        except Exception as err:
            _warn("thông báo gói báo", err)
    elif note and config().get("show_tooltips", True):
        tooltip("ことば畑: " + note, period=6000)
    return res, price


def _ai_progress(msg: str) -> None:
    _ai["msg"] = msg
    if _dialog is not None:
        try:
            _dialog._js("aiProgress", {"msg": msg})
        except Exception:
            pass


def ai_start(reason: str, dialog: Any = None, lang: str = "ja") -> bool:
    """Viết số hôm nay của báo `lang` (và / hoặc tạo giọng đọc còn thiếu) trong luồng nền.

    reason: "auto" (mở vườn / mở hồ sơ: có giới hạn số lần mỗi ngày), "manual" (bấm Viết số hôm nay),
    "audio" (bấm Tạo giọng đọc). Trả về True nếu đã bắt đầu một việc (không thì lý do ở _ai["why"]).
    1.19.1: ngôn ngữ do người gọi chọn (ai_start_all chạy lần lượt các báo đã tick), không theo deck đang xem.
    """
    _ai["why"] = ""
    if _ai["running"] or _ai["testing"] or not mw.col:
        return False
    cfg = config()
    en = lang == "en"
    if lang not in PAPER_LANGS:
        return False
    if lang == "ja" and paper_source(cfg) != "gemini":
        return False
    key = ai.clean_key(cfg.get("gemini_key"))
    if not key:
        return False
    if reason == "auto" and lang in ai_waiting(cfg):
        return False                     # 1.23: chờ "Bắt đầu viết" (một quy tắc chung, xem ai_waiting)
    o = _ai_opts(cfg)
    date = ai_today()
    try:
        base = ai.ensure_dir(AI_DIRS[lang])
    except OSError as err:
        _warn("thư mục báo Gemini", err)
        return False
    st = ai.load_status(base)
    if st.get("day") != date:
        st = {k: st[k] for k in ("model", "models", "tts", "log_day", "exhausted") if k in st}
        st.update(day=date, tries=0, audio_tries=0)
    has = ai.has_issue(base, date)
    need_audio = bool(has and lang != "vi" and o["audio"] != "tat" and ai.audio_todo(base, date, o["audio"]))
    recent = time.time() - float(st.get("last_try") or 0) < 600
    if reason == "auto":
        if not o["auto"] or recent:
            return False
        if not has and int(st.get("tries") or 0) >= ai.MAX_AUTO_TRIES:
            return False
        if has and (not need_audio or int(st.get("audio_tries") or 0) >= 2):
            return False
    elif reason == "audio" and not need_audio:
        return False
    elif reason == "manual" and has and not need_audio:
        return False
    scope: dict[str, Any] | None = None
    opts: dict[str, Any] = {}
    odir = AI_DIR if lang != "ja" else AI_DIR_EN
    other = ai.load_status(odir) if os.path.isdir(odir) else {}
    if not has:
        # 1.25.1: số mới cần gói báo (lần đầu tặng 7 ngày; hết hạn + Tự gia hạn + đủ xu thì tự gia hạn).
        # 1.26.1: ở đây chỉ xem; tặng thử / trừ xu khi số báo đã viết xong (_ai_done)
        sub, price = paper_sub_ensure(date, commit=False)
        if sub == "expired":
            _ai["why"] = "Gói báo đã hết hạn — gia hạn ở thẻ Gói báo (tab Nguồn báo)."
            st.update(sub_off=date)
            ai.save_status(base, st)
            return False
        st.pop("sub_off", None)
        scope = _ai_scope(cfg, o, lang)
        st.pop("thieu", None)
        if scope.get("khong_deck") and scope.get("it_tu") is not None and src_mode(lang) != "level":
            n0 = scope["it_tu"]
            st.update(thieu=("Chưa có từ %s nào — viết theo trình độ." % LANG_NAME[lang] if not n0 else
                             "Deck mới có %d từ — viết theo trình độ." % n0), thieu_day=date)
        try:
            unread = paper.unread_dates(paper.Library(base, lang), paper_states(lang, "gemini")[1])
        except Exception:
            unread = []
        opts = {"max_new": ai.NO_DECK_NEW if scope.get("khong_deck") and lang != "vi" else 3, "short": len(unread) >= 3,
                "model": o["model"], "prefer": st.get("model", "") or other.get("model", ""), "story": o["story"],
                "tone": o["tones"][0], "tones": o["tones"],
                # 1.25.2: truyện chung + thời tiết khớp với trời trong vườn
                "story_base": AI_DIR_SHARED, "thoi_tiet": _village_weather(date)}
        try:
            src0 = ai.migrate_story(AI_DIR_SHARED, [AI_DIR, AI_DIR_EN, AI_DIR_VI])
            if src0:
                _warn("truyện chung", "chép bộ nhớ truyện từ " + os.path.basename(src0))
        except OSError as err:
            _warn("truyện chung", err)
        try:      # 1.25.8: báo Claude Code đã đăng kỳ nào sau kỳ cuối của truyện chung → chép sang (truyện nối tiếp)
            opts["noi_claude"] = ai.import_claude_story(AI_DIR_SHARED, _claude_story_dir(cfg), date)
        except Exception as err:      # noqa: BLE001 — số báo Claude hỏng không làm dừng báo Gemini
            _warn("truyện chung (Claude Code)", err)
        st["tries"] = int(st.get("tries") or 0) + 1
        st["scope"] = ai.describe_scope(scope)
    else:
        st["audio_tries"] = int(st.get("audio_tries") or 0) + 1
    st["last_try"] = time.time()
    ai.save_status(base, st)
    client = ai.Gemini(key, exhausted=_shared_exhausted())
    voice = o["voice_en"] if en else o["voice"]
    claude_story = _claude_story_dir(cfg)

    def progress(msg: str) -> None:
        mw.taskman.run_on_main(lambda: _ai_progress(msg))

    def task() -> dict[str, Any]:
        if not has and not opts.get("short") and opts.get("story") != "tat":
            # 1.25.2 "Một làng, một truyện": bản gốc hôm nay (báo đầu tiên trong ngày viết, báo sau đọc lại)
            try:
                master, mlog = ai.ensure_master(client, AI_DIR_SHARED, date, opts, progress)
            except Exception as err:      # bản gốc hỏng (kể cả lỗi bất ngờ) → báo tự viết truyện như cũ, không mất số
                if getattr(err, "kind", "") == "key":
                    raise
                master, mlog = None, [{"buoc": "ban_goc_loi", "ly_do": ("%s: %s" % (type(err).__name__, err))[:200]}]
            opts["master"] = master
            if opts.get("noi_claude") and master:      # nhật ký viết báo (không phải nhật ký lỗi)
                mlog = [{"buoc": "noi_claude", "so_ky": opts["noi_claude"]}] + (mlog or [{"buoc": "ban_goc_san", "ky": master.get("ky")}])
            opts["_master_log"] = mlog
        res: dict[str, Any] = {"ok": True, "audio_only": True} if has else \
            ai.Job(client, base, date, scope or {}, opts, progress).run()
        if not has:
            try:      # 1.25.8: kỳ Gemini vừa viết → kotoba_daily/truyen_chung.json (báo Claude Code viết nối tiếp)
                ai.export_story_for_claude(AI_DIR_SHARED, claude_story)
            except Exception as err:      # noqa: BLE001
                res["export_err"] = str(err)[:200]
        if res.get("ok") and o["audio"] != "tat" and lang != "vi":      # 1.25.1: báo tiếng Việt không có giọng đọc
            try:
                res["audio"] = ai.make_audio(client, base, date, o["audio"], voice, o["tts_model"], progress)
            except ai.AIError as err:
                res["audio"] = {"made": 0, "error": str(err)}
        return res

    _ai.update(running=True, msg="Đang chuẩn bị…", lang=lang)
    owner = _owner_now()      # 1.28 (audit 12/11 F09): việc nền gắn với hồ sơ bắt đầu viết
    _bg(task, lambda fut: _ai_done(fut, base, date, client, owner))
    _ai_push()
    if _dialog is not None:
        _dialog._js("paperSummary", paper_summary(_dialog, ai_busy=True))
    return True


def ai_start_all(reason: str = "auto") -> bool:
    """1.19.1: tự viết lần lượt các báo đã tick (một việc nền một lúc; xong báo này thì _ai_done gọi lại).
    Báo trong `ai_waiting()` (vừa dán khoá, vừa tick thêm, 1.23: nguồn vừa thành Gemini mà chưa xác nhận) không tự viết
    cho tới khi bấm "Bắt đầu viết"."""
    cfg = config()
    if paper_source(cfg) == "claude":
        confirm_source("ja", "claude")   # 1.23: đang đọc báo Claude Code → mất thư mục / đổi nguồn thì Gemini chờ
    skip = ai_waiting() if reason == "auto" else []
    for lang in wanted_langs():
        if lang in skip:
            continue
        try:
            if ai_start(reason, None, lang):
                return True
        except Exception as err:
            _warn("Gemini (tự viết %s)" % lang, err)
    return False


def _owner_now() -> str:
    """Mã hồ sơ đang mở ("" khi chưa mở hồ sơ nào) — để việc nền biết nó thuộc hồ sơ nào."""
    try:
        return core.profile_key(mw.col) if mw.col is not None else ""
    except Exception:
        return ""


SUB_PENDING = os.path.join(ADDON_DIR, "user_files", "goi_bao_cho.json")


def _sub_pending_load() -> dict[str, list[str]]:
    try:
        with open(SUB_PENDING, encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        return {}
    out: dict[str, list[str]] = {}
    for k, v in raw.items() if isinstance(raw, dict) else []:
        if isinstance(k, str) and re.fullmatch(r"[0-9a-f]{16}", k) and isinstance(v, list):
            days = sorted({x for x in v if isinstance(x, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", x)})
            if days:
                out[k] = days[-14:]
    return out


def _sub_pending_save(data: dict[str, list[str]]) -> None:
    try:
        os.makedirs(os.path.dirname(SUB_PENDING), exist_ok=True)
        tmp = SUB_PENDING + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, SUB_PENDING)
    except OSError as err:
        _warn("gói báo (chờ hồ sơ)", err)


def sub_pending_settle() -> int:
    """1.28 (audit 12/11 F09): số báo viết xong khi hồ sơ đã đổi → tính gói báo cho đúng hồ sơ đã bắt đầu viết, lúc hồ
    sơ đó mở lại (không bao giờ lấy xu / gia hạn gói của hồ sơ đang mở thay cho hồ sơ khác)."""
    owner = _owner_now()
    if not owner:
        return 0
    data = _sub_pending_load()
    days = data.pop(owner, None)
    if not days:
        return 0
    _sub_pending_save(data)
    n = 0
    for d in days:
        paper_sub_ensure(d)
        n += 1
    return n


def _ai_done(fut: Any, base: str, date: str, client: Any = None, owner: str | None = None) -> None:
    _ai.update(running=False, msg="")
    try:
        res = fut.result()
    except Exception as err:
        _warn("Gemini", err)
        res = {"ok": False, "error": "Lỗi không mong đợi (%s), xem Báo lỗi." % type(err).__name__}
    # 1.28 (audit 12/11 F09): hồ sơ đã đổi (hoặc đóng) trong lúc Gemini viết → không đụng ví / gói của hồ sơ đang mở;
    # ghi chờ, hồ sơ bắt đầu viết mở lại thì mới tặng thử / gia hạn (sub_pending_settle)
    moved = owner is not None and owner != _owner_now()
    if res.get("ok") and not res.get("audio_only") and ai.has_issue(base, date):
        if moved:
            if owner:
                data = _sub_pending_load()
                data[owner] = sorted(set(data.get(owner, [])) | {date})[-14:]
                _sub_pending_save(data)
        else:
            paper_sub_ensure(date)      # 1.26.1: số mới đã về → bây giờ mới tặng thử / gia hạn gói báo (trừ xu)
    st = ai.load_status(base)
    st["log_day"] = date if not res.get("audio_only") else st.get("log_day", date)
    if res.get("ok"):
        st["error"] = ""
        if res.get("model"):
            st["model"] = res["model"]
        if isinstance(res.get("focus"), list):
            st.update(focus=res["focus"], focus_day=date)
    else:
        st["error"] = str(res.get("error") or "")
    au = res.get("audio") or {}
    st["audio_error"] = str(au.get("error") or "")
    if client is not None:
        st["exhausted"] = client.exhausted_state()
    ai.save_status(base, st)
    lname = {AI_DIR_EN: " tiếng Anh", AI_DIR_VI: " tiếng Việt"}.get(base, "")
    if res.get("ok") and not res.get("audio_only"):
        msg = "Báo%s mới: số %s đã về hòm thư." % (lname, res.get("so", ""))
    elif res.get("ok") and au.get("made"):
        msg = "Đã tạo %d giọng đọc." % au["made"]
    elif res.get("ok") and au.get("error"):
        msg = "Giọng đọc: " + au["error"]
    elif res.get("ok"):
        msg = ""
    else:
        msg = "✗ Gemini chưa viết được báo%s: " % lname + str(res.get("error") or "")
    if moved:
        msg = ""                  # việc của hồ sơ khác: không báo trong vườn / thanh Anki của hồ sơ này
    if _dialog is not None:
        try:
            _dialog.refresh()          # refresh() gọi ai_start_all → báo kế tiếp (nếu có)
        except Exception as err:
            _warn("refresh sau khi Gemini viết", err)
        _ai_push({"flash": msg, "ok": bool(res.get("ok"))} if msg else None)
        if msg:     # 1.20: thông báo dài, vào hàng chờ (không bị "Gemini đã sửa bài…" thay mất và ngược lại)
            _dialog._js("notice", {"msg": msg, "ms": 8000})
    else:
        if msg and config().get("show_tooltips", True):
            tooltip("ことば畑: " + msg, period=6000)
        if not mw.col:
            return                # hồ sơ đã đóng: báo kế tiếp chờ hồ sơ mở lại
        try:
            ai_start_all("auto")
        except Exception as err:
            _warn("Gemini (báo kế tiếp)", err)


# ---------------------------------------------------------------------------
# 1.20: 花暦 · Lịch hoa, nhật ký + sticker, luyện viết (Gemini sửa 1 lần / ngày), cuốn nhật ký
# ---------------------------------------------------------------------------

JOURNAL_DIR = os.path.join(ADDON_DIR, "user_files", "journal")     # sao lưu nhật ký + nhật ký sửa bài (máy này)
PHOTO_DIR = os.path.join(ADDON_DIR, "user_files", "anh_vuon")       # ảnh vườn tự chụp mỗi tuần (không đồng bộ)


def _photo_dir() -> str:
    """1.25.3 (audit BUG-06): thư mục ảnh vườn của hồ sơ đang mở (`anh_vuon/<mã hồ sơ>/`, xem journal.profile_photo_dir)."""
    col = mw.col
    if col is None:
        return PHOTO_DIR
    try:
        has_wallet = isinstance(col.get_config(core.CONFIG_KEY, None), dict)
    except Exception:
        has_wallet = False
    return journal.profile_photo_dir(PHOTO_DIR, core.profile_key(col), has_wallet)
JOURNAL = journal.JournalStore(JOURNAL_DIR, col_getter=lambda: mw.col)
# Việc nền "Gemini sửa bài": trạng thái RIÊNG, không dùng _ai["running"] của báo → hai việc chạy song song được
_fix: dict[str, Any] = {"running": False, "date": "", "sent": 0.0}
_quota_mem: dict[str, float] = {}       # model hết hạn mức do bài sửa gặp (dùng chung với báo qua _shared_exhausted)
_words_cache: dict[tuple[str, ...], dict[str, Any]] = {}     # (ngày, ngôn ngữ, collection, deck đã chọn) → words.pick (gợi ý, từ đã học)
_pdf_jobs: list[Any] = []


def _quota_file() -> str:
    return os.path.join(JOURNAL_DIR, "quota.json")


def _load_quota() -> dict[str, float]:
    if not _quota_mem:
        try:
            with open(_quota_file(), encoding="utf-8") as f:
                raw = json.load(f)
            now = time.time()
            for k, v in raw.items() if isinstance(raw, dict) else []:
                if isinstance(k, str) and isinstance(v, (int, float)) and v > now:
                    _quota_mem[k] = float(v)
        except (OSError, ValueError):
            pass
    return _quota_mem


def _save_quota(state: dict[str, float]) -> None:
    now = time.time()
    for k, v in state.items():
        _quota_mem[k] = max(_quota_mem.get(k, 0), float(v))
    for k in [k for k, v in _quota_mem.items() if v <= now]:
        _quota_mem.pop(k, None)
    try:
        os.makedirs(JOURNAL_DIR, exist_ok=True)
        with open(_quota_file(), "w", encoding="utf-8") as f:
            json.dump(_quota_mem, f)
    except OSError:
        pass


def cal_today() -> datetime.date:
    return journal.anki_today(mw.col)


def _daily_stats(col: Any = None) -> dict[str, int]:
    """core.daily_stats + ngày đã dùng vé giữ chuỗi (1.25.9)."""
    return core.daily_stats(col or mw.col, STATE.frozen_days())


# 1.26: màn chào khi mở vườn. Add-on chỉ dùng để test (tests/anki/zz_kbtest) đặt True để các kịch bản cũ không bị màn chào
# chặn; kịch bản của màn chào đặt lại False.
GREET_TEST_OFF = False
TOUR_TEST_OFF = False       # 1.26.1: add-on test (zz_kbtest) tắt hướng dẫn 3 bước cho kịch bản cũ
_day_total: dict[str, Any] = {"key": None, "v": 0}


def _news_and_greet(data: dict[str, Any], today: dict[str, Any], cfg: dict[str, Any]) -> tuple[dict[str, Any], Any]:
    """1.26: Tin làng (Hôm nay / Sắp tới + dòng cho thẻ Hôm nay) và nội dung màn chào (None = không chào)."""
    w = data["wallet"]
    mv = w.get("more_view") or {}
    day = today.get("day")
    cday = cal_today()
    home = w.get("home") or {}
    reviewed = int(today.get("reviews") or 0) > 0
    try:          # các ngày trước hôm nay: đếm một lần mỗi ngày Anki (quét cả revlog), hôm nay cộng riêng
        # 1.28 (audit 12/11 F07): khoá có thêm số lượt ôn trước hôm nay (đếm theo khoá chính, rất nhanh) → đồng bộ /
        # nhập / khôi phục mang thêm lịch sử cũ về thì tính lại (trước: giữ tổng cũ tới hôm sau)
        start_ms = core.ngay.days_of(mw.col).rel_start(0) * 1000
        key = (str(getattr(mw.col, "path", "")), day,
               int(mw.col.db.scalar("select count() from revlog where id < ?", start_ms) or 0))
        if _day_total.get("key") != key:
            _day_total.update(key=key, v=core.review_day_total(mw.col, before_today=True))
        total = int(_day_total["v"]) + (1 if reviewed else 0)
    except Exception:
        total = 0
    ctx = {"today": cday, "day": day, "paper": data.get("paper") or {}, "streak": int(today.get("streak") or 0),
           "reviewed_today": reviewed, "total_days": total, "freeze": (w.get("more") or {}).get("freeze") or {},
           "pets": mv.get("pets") or [], "wear": mv.get("wear") or {}, "season": w.get("season") or {}, "home": home,
           "scenes": _guest_scenes(w), "album": GUESTS.album(), "sub": (w.get("more") or {}).get("paper_sub") or {},
           "finds": data.get("finds") or {}}
    nw = event_core.news(ctx)
    greet = None
    if not GREET_TEST_OFF and more_core.clean_ui(cfg.get("ui")).get("greet") != "off":
        g = event_core.greeter(mv.get("pets") or [], day if isinstance(day, int) else cday.toordinal())
        items: list[str] = []
        theme_name = ""
        try:
            from . import season_core
            theme = season_core.active_theme(w.get("season") or {}, cday)
            if theme:
                items = [k for k in season_core.theme_items(theme) if season_core.SEASON_ITEMS[k].get("scene") == "yard"][:4]
                theme_name = next((t["name"] for t in season_core.THEMES if t["id"] == theme), "")
        except Exception:
            theme = None
        greet = dict(g, day=day, date=nw["date"], news=nw["greet"], fest=event_core.festival(cday), theme=theme,
                     items=items, theme_name=theme_name,
                     freeze=any(x.get("id") == "freeze_used" for x in nw["today"]), reviews=int(today.get("reviews") or 0))
    return nw, greet


def _freeze_settle() -> list[str]:
    """1.25.9: hôm qua (hai hôm trước) chưa ôn mà còn vé giữ chuỗi → dùng vé. Trả về các ngày vừa dùng vé."""
    try:
        days, today = core.review_days(mw.col)
        return STATE.freeze_settle(days, today)
    except Exception as err:
        _warn("vé giữ chuỗi", err)
        return []


def _cal_goal(cfg: dict[str, Any] | None = None) -> int:
    try:
        g = int((cfg or config()).get("daily_goal") or 30)
    except (TypeError, ValueError):
        g = 30
    return g if g > 0 else 30


def _cal_plain() -> bool:
    """Giao diện mùa đang Tắt → ô lịch dùng cây gốc của vườn (vạch màu + dải tên mùa / lễ vẫn hiện)."""
    try:
        return STATE.load()["season"].get("mode") == "off"
    except Exception:
        return False


def _fruit_ivl(cfg: dict[str, Any]) -> int:
    try:
        return int(list(cfg.get("stage_days") or [3, 21, 90])[-1])
    except (TypeError, ValueError, IndexError):
        return 90


def write_langs(cfg: dict[str, Any] | None = None) -> list[str]:
    """Ngôn ngữ luyện viết = báo tiếng Nhật / tiếng Anh đã tick (1.19.1).

    1.25.1: không tick báo Nhật / Anh nào (vd. chỉ báo tiếng Việt) → ngôn ngữ có deck trong collection; không có deck
    tiếng Nhật / tiếng Anh nào → [] = ẩn Luyện viết (người không học hai thứ tiếng này)."""
    ticked = [x for x in wanted_langs(cfg) if x in journal.WRITE_LANGS]
    if ticked:
        return ticked
    try:
        have = _lang_presence()
    except Exception as err:
        _warn("ngôn ngữ luyện viết", err)
        return list(journal.WRITE_LANGS)
    return [x for x in journal.WRITE_LANGS if have.get(x)]


_presence: dict[str, Any] = {"t": 0.0, "v": {}, "col": ""}


def _lang_presence() -> dict[str, bool]:
    """Collection có note tiếng Nhật / tiếng Anh không (đọc lại tối đa mỗi 60 giây). 1.25.9: gắn với collection đang
    mở — đổi hồ sơ trong 60 giây không còn nhận kết quả của hồ sơ cũ."""
    path = str(getattr(mw.col, "path", "") or "")
    if time.time() - _presence["t"] > 60 or not _presence["v"] or _presence["col"] != path:
        infos = words.model_infos(mw.col, core.merged_config(config()))
        langs = {i["lang"] for i in infos.values()}
        _presence.update(t=time.time(), v={"ja": "ja" in langs, "en": "en" in langs}, col=path)
    return _presence["v"]


def _write_lang(cfg: dict[str, Any]) -> str:
    langs = write_langs(cfg) or list(journal.WRITE_LANGS)
    want = cfg.get("journal_lang")
    return want if want in langs else langs[0]


def _write_level(cfg: dict[str, Any], lang: str) -> str:
    o = _ai_opts(cfg)
    return o["level_en"] if lang == "en" else o["level"]


def _words_for(ds: str, lang: str, cfg: dict[str, Any]) -> dict[str, Any]:
    """Từ của báo `lang` hôm nay (deck đã chọn ở tab Nguồn báo, không chọn thì mọi deck) — gợi ý + từ đã học."""
    # 1.25.3 (audit BUG-05): khoá có cả collection (hồ sơ) và deck đã chọn — trước chỉ (ngày, ngôn ngữ) nên đổi nguồn ở
    # tab Nguồn báo / đổi hồ sơ trong ngày vẫn ra gợi ý + "từ đã học" của nguồn cũ
    try:
        src = words.load_src(mw.col)
        mine = json.dumps(src.get(lang) or {}, sort_keys=True, default=str)
    except Exception as err:
        _warn("từ cho luyện viết", err)
        src, mine = None, "?"
    k = (ds, lang, str(getattr(mw.col, "path", "") or ""), mine)
    if k not in _words_cache:
        try:
            if src is None:
                raise ValueError("không đọc được deck đã chọn")
            if len(_words_cache) > 6:
                _words_cache.clear()
            _words_cache[k] = words.pick(mw.col, cfg, lang, src[lang]["decks"], ds,
                                         eligible=ai_en.kho_ok if lang == "en" else ai.kho_ok)
        except Exception as err:
            _warn("từ cho luyện viết", err)
            _words_cache[k] = {"kho": [], "all": []}
    return _words_cache[k]


def _hints(ds: str, lang: str, gr: int, cfg: dict[str, Any]) -> list[str]:
    pk = _words_for(ds, lang, cfg)
    return journal.pick_hints(pk.get("kho") or [], lang, "%s:%s:%d" % (ds, lang, gr))


def _learned(ds: str, lang: str, cfg: dict[str, Any]) -> list[str]:
    pk = _words_for(ds, lang, cfg)
    return [it["word"] for it in (pk.get("all") or []) + (pk.get("kho") or []) if it.get("word")][:3000]


def _unstale(d: datetime.date, entry: dict[str, Any]) -> dict[str, Any]:
    """Cờ "đang sửa" quá 10 phút mà không có việc nền (tắt Anki giữa chừng) → mở khoá, không tính lượt."""
    w = entry.get("w")
    running = _fix["running"] and _fix["date"] == d.isoformat()
    if journal.stale_wait(w, running=running):
        w2 = dict(w, st="", err="")
        w2.pop("sent", None)
        entry = JOURNAL.update(d, {"w": w2})
    return entry


def journal_summary() -> dict[str, Any] | None:
    """Thẻ Hôm nay: ô "Hôm nay thế nào?", dòng luyện viết (đang sửa / đã sửa · xem ▸), có cần chụp ảnh vườn tuần này."""
    if not mw.col:
        return None
    today = cal_today()
    e = _unstale(today, JOURNAL.entry(today))
    w = None
    # bài đã sửa mà chưa xem: tìm cả mấy hôm trước (sửa xong lúc vườn đóng, hôm sau mới mở)
    for back in range(0, journal.QUEUE_DAYS + 1):
        d = today - datetime.timedelta(days=back)
        x = (e if back == 0 else JOURNAL.entry(d)).get("w") or {}
        st = x.get("st")
        if (st == "done" and not x.get("seen")) or (back == 0 and st in ("wait", "queue")):
            w = {"d": d.isoformat(), "st": st, "n": len(x.get("loi") or []), "today": back == 0}
            break
    return {"today": today.isoformat(), "asked": bool(e.get("m") or e.get("t")), "mood": e.get("m", ""), "w": w,
            "photo_due": journal.photo_due(_photo_dir(), today), "fixing": bool(_fix["running"])}


def _push_journal() -> None:
    if _dialog is not None:
        try:
            _dialog._js("journal", journal_summary())
        except Exception as err:
            _warn("journal", err)


def _counts(start: datetime.date, end: datetime.date, cfg: dict[str, Any]) -> dict[str, dict[str, int]]:
    try:
        return journal.revlog_days(mw.col, start, end, _fruit_ivl(cfg))
    except Exception as err:
        _warn("đếm lượt ôn theo ngày", err)
        return {}


def cal_month(ym: str) -> dict[str, Any]:
    cfg = config()
    today = cal_today()
    y, m = journal.parse_month(ym) or (today.year, today.month)
    first = journal.first_review_day(mw.col)
    counts = _counts(datetime.date(y, m, 1), datetime.date(y, m, journal.month_days(y, m)), cfg)
    try:
        streak = int(_daily_stats().get("streak", 0))
    except Exception:
        streak = 0
    v = journal.month_view(y, m, today, counts, JOURNAL.month(y, m), _cal_goal(cfg), first, _cal_plain(), streak)
    try:       # 1.25.9: vé giữ chuỗi — số vé, nút mua, ngày đã dùng vé (ô lịch có bông tuyết)
        data = STATE.load()
        fz = data["more"]["freeze"]
        v["freeze"] = more_core.freeze_view(fz, int(data.get("coins") or 0))
        used = set(fz["days"])
        for d in v["days"]:
            if d["d"] in used:
                d["fz"] = True
    except Exception as err:
        _warn("vé giữ chuỗi", err)
    return v


def cal_year(ys: str) -> dict[str, Any]:
    cfg = config()
    today = cal_today()
    try:
        y = int(ys)
    except (TypeError, ValueError):
        y = today.year
    y = max(1970, min(today.year + 1, y))
    counts = _counts(datetime.date(y, 1, 1), datetime.date(y, 12, 31), cfg)
    entries = JOURNAL.months([(y, m) for m in range(1, 13)])
    try:
        streak = int(_daily_stats().get("streak", 0))
    except Exception:
        streak = 0
    return journal.year_view(y, today, counts, entries, _cal_goal(cfg), journal.first_review_day(mw.col), streak,
                             STATE.frozen_days())


def _paper_day(ds: str) -> str:
    read: dict[str, dict[str, Any]] = {}
    issues: dict[str, dict[str, Any]] = {}
    for lang in PAPER_LANGS:
        try:
            r = paper_states(lang)[1]["read"]
        except Exception:
            continue
        if ds not in r:
            continue
        read[lang] = r
        lib = _library(lang)
        iss = lib.try_issue(ds) if lib is not None else None
        if iss:
            issues[lang] = {ds: {"so": iss.get("so"), "ct": len(iss.get("chinh_ta") or [])}}
    return journal.paper_line(read, issues, ds)


def cal_day(ds: str) -> dict[str, Any]:
    cfg = config()
    today = cal_today()
    d = journal.parse_date(ds) or today
    ds = d.isoformat()
    v = journal.day_head(d, today)
    c = _counts(d, d, cfg).get(ds, {}) if d <= today else {}
    v.update(n=c.get("n", 0), new=c.get("new", 0), fruit=c.get("fruit", 0), fruit_words=[], paper="")
    if c.get("fruit"):
        try:
            cids = journal.fruit_cards(mw.col, d, _fruit_ivl(cfg))[:40]
            nids = list(dict.fromkeys(int(x) for x in mw.col.db.list(
                "select nid from cards where id in (%s)" % ",".join(str(int(x)) for x in cids)))) if cids else []
            v["fruit_words"] = words.note_words(mw.col, cfg, nids[:6])
        except Exception as err:
            _warn("từ lên Ra quả", err)
    try:
        v["paper"] = _paper_day(ds) if d <= today else ""
    except Exception as err:
        _warn("báo của ngày", err)
    e = _unstale(d, JOURNAL.entry(d)) if d <= today else {}
    v["mood"] = e.get("m", "")
    v["t"] = e.get("t", "")
    v["editable"] = d <= today
    v["diary_max"] = journal.DIARY_MAX
    try:      # 1.21: khách gặp lần đầu hôm đó
        v["guests"] = [g["name"] for g in guests.new_between(GUESTS.album(), d, d)]
    except Exception as err:
        _warn("khách ghé vườn", err)
        v["guests"] = []
    try:      # 1.28: món nhặt được lần đầu hôm đó
        v["finds"] = ["%s (%s)" % (x["ja"], x["vi"]) for x in finds.new_between(EVENTS.load(), d, d)]
    except Exception as err:
        _warn("nhặt đồ", err)
        v["finds"] = []
    try:      # 1.30: việc của StackChan thấy lần đầu hôm đó
        v["life"] = ["%s (%s)" % (x["ja"], x["name"]) for x in life_core.new_between(LIFE.seen(), d, d)]
    except Exception as err:
        _warn("sinh hoạt", err)
        v["life"] = []
    w = e.get("w")
    is_today = d == today
    v["w"] = None
    if d <= today and not write_langs(cfg) and not (w or {}).get("goc"):
        pass                    # 1.25.1: không học tiếng Nhật / tiếng Anh → không có Luyện viết
    elif d <= today:
        lang = (w or {}).get("lang") if (w or {}).get("goc") else _write_lang(cfg)
        lang = lang if lang in journal.WRITE_LANGS else "ja"
        hints = (w or {}).get("goi_y") or (_hints(ds, lang, int((w or {}).get("gr") or 0), cfg) if is_today else [])
        learned = _learned(ds, lang, cfg) if (w or {}).get("st") == "done" else []
        has_key = bool(ai.clean_key(cfg.get("gemini_key")))
        v["w"] = journal.writing_view(w, lang, write_langs(cfg), is_today, has_key, hints, learned,
                                      (w or {}).get("retry_at"))
        if v["w"] is not None:
            v["w"]["running"] = bool(_fix["running"] and _fix["date"] == ds)
    return v


def _cal_push(kind_view: dict[str, Any]) -> None:
    if _dialog is not None:
        _dialog._js("calView", kind_view)


def _book_month(y: int, m: int, today: datetime.date, cfg: dict[str, Any]) -> dict[str, Any]:
    counts = _counts(datetime.date(y, m, 1), datetime.date(y, m, journal.month_days(y, m)), cfg)
    entries = JOURNAL.month(y, m)
    goal = _cal_goal(cfg)
    plain = _cal_plain()
    ph = journal.month_photo(_photo_dir(), y, m)
    return {"id": "%04d-%02d" % (y, m), "y": y, "m": m, "title": "Tháng %d · %d" % (m, y),
            "draft": (y, m) == (today.year, today.month), "th": journal.dominant_theme(y, m),
            "th_name": journal.theme_name(journal.dominant_theme(y, m), True), "plain": plain,
            "photo": ph[1] if ph else "", "photo_day": journal.ddmm(datetime.date.fromisoformat(ph[0])) if ph else "",
            "stats": dict(journal.month_summary(y, m, today, counts, entries),
                          guests=[g["name"] for g in guests.new_between(
                              GUESTS.album(), datetime.date(y, m, 1), datetime.date(y, m, journal.month_days(y, m)))]),
            "rows": journal.book_rows(y, m, today, counts, entries, goal, plain)}


def cal_book(bid: str) -> dict[str, Any]:
    cfg = config()
    today = cal_today()
    first = journal.first_review_day(mw.col)
    shelf = journal.shelf(first, today)
    ids = [b["id"] for b in shelf]
    if bid not in ids:
        py, pm = journal.add_months(today.year, today.month, -1)
        prev = "%04d-%02d" % (py, pm)
        bid = prev if prev in ids else ids[-1] if ids else "%04d-%02d" % (today.year, today.month)
        if bid not in ids:
            bid = "%04d-%02d" % (today.year, today.month)
    ym = journal.parse_month(bid)
    if ym:
        book = _book_month(ym[0], ym[1], today, cfg)
        book["months"] = None
    else:
        y = int(bid)
        months = [_book_month(y, m, today, cfg) for m in range(1, 13) if datetime.date(y, m, 1) <= today]
        st = [b["stats"] for b in months]
        moods: dict[str, int] = {}
        errs: dict[str, list[Any]] = {}
        for s in st:
            for k, n in s["moods"]:
                moods[k] = moods.get(k, 0) + n
            for rule, n in s["errors"]:
                errs.setdefault(rule.lower(), [rule, 0])[1] += n
        best_m = max(months, key=lambda b: b["stats"]["reviews"], default=None)
        book = {"id": str(y), "y": y, "m": 0, "title": "Năm %d" % y, "draft": False, "th": "", "th_name": "",
                "plain": _cal_plain(), "photo": next((b["photo"] for b in reversed(months) if b["photo"]), ""),
                "photo_day": next((b["photo_day"] for b in reversed(months) if b["photo"]), ""),
                "stats": {"days": sum(s["days"] for s in st), "of": sum(s["of"] for s in st),
                          "reviews": sum(s["reviews"] for s in st), "fruit": sum(s["fruit"] for s in st),
                          "best": ("Tháng %d · %d lượt" % (best_m["m"], best_m["stats"]["reviews"])) if best_m and best_m["stats"]["reviews"] else "",
                          "notes": sum(s["notes"] for s in st), "writes": sum(s["writes"] for s in st),
                          "sentences": sum(s["sentences"] for s in st),
                          "guests": [g for s in st for g in s.get("guests", [])],
                          "moods": sorted(moods.items(), key=lambda kv: -kv[1])[:4],
                          "errors": sorted(errs.values(), key=lambda v: -v[1])[:3]},
                "rows": [], "months": [{"id": b["id"], "title": b["title"], "rows": b["rows"]} for b in months]}
    return {"kind": "book", "shelf": shelf, "book": book, "today": today.isoformat()}


def fix_start(ds: str, auto: bool = False) -> str:
    """Nhờ Gemini sửa bài luyện viết của ngày ds (luồng nền). Trả về "" nếu đã gửi, không thì lý do (câu ngắn)."""
    if not mw.col:
        return "Chưa mở hồ sơ."
    if _fix["running"]:
        return "Gemini đang sửa một bài, chờ chút nhé."
    cfg = config()
    today = cal_today()
    d = journal.parse_date(ds)
    if d is None or d > today:
        return "Ngày không hợp lệ."
    if not auto and d != today:
        return "Chỉ sửa được bài của hôm nay."
    e = _unstale(d, JOURNAL.entry(d))
    w = e.get("w") or {}
    goc = w.get("goc", "")
    lang = w.get("lang", "ja")
    if not goc.strip():
        return "Viết bài trước đã."
    if w.get("st") == "done":
        return "Hôm nay Gemini đã sửa rồi."
    if w.get("st") == "wait":
        return "Gemini đang sửa bài này."
    key = ai.clean_key(cfg.get("gemini_key"))
    if not key:
        return "Dán khoá Gemini ở tab Nguồn báo để được sửa."
    level = _write_level(cfg, lang)
    hints = list(w.get("goi_y") or [])
    sent = time.time()
    w2 = dict(w, st="wait", sent=sent)
    w2.pop("err", None)
    if auto:
        w2["rq"] = 1
    JOURNAL.update(d, {"w": w2})
    ex = dict(_shared_exhausted())
    client = ai.Gemini(key, exhausted=ex)
    models: list[str] = []
    for base in (AI_DIR, AI_DIR_EN, AI_DIR_VI):
        st = ai.load_status(base) if os.path.isdir(base) else {}
        for n in st.get("models") or [] if isinstance(st.get("models"), list) else []:
            if isinstance(n, str) and n not in models:
                models.append(n)

    def task() -> dict[str, Any]:
        names = models or ai.text_models(client.models())
        return journal.run_fix(client, names, goc, lang, level, hints)

    _fix.update(running=True, date=d.isoformat(), sent=sent)
    owner = _owner_now()
    _bg(task, lambda fut: _fix_done(fut, d, sent, client, goc, lang, owner))
    _push_journal()
    return ""


def _fix_done(fut: Any, d: datetime.date, sent: float, client: Any, goc: str, lang: str,
              owner: str | None = None) -> None:
    _fix.update(running=False, date="", sent=0.0)
    try:
        _save_quota(client.exhausted_state())
    except Exception as err:
        _warn("hạn mức Gemini (sửa bài)", err)
    if not mw.col:
        return
    if owner is not None and owner != _owner_now():
        return               # 1.28: bài của hồ sơ khác — hồ sơ đó mở lại thì bài "đang sửa" quá hạn tự gửi lại được
    ds = d.isoformat()
    e = JOURNAL.entry(d)
    w = e.get("w") or {}
    if w.get("st") != "wait" or abs(float(w.get("sent") or 0) - sent) > 2 or w.get("goc") != goc:
        return               # bài đã đổi trong lúc chờ (máy khác đồng bộ về…): bỏ kết quả, không tính lượt
    cfg = config()
    msg, ok, n = "", False, 0
    try:
        res = fut.result()
        clean, notes = journal.check_fix(res.get("raw"), goc, lang)
        if not (clean["sua"] or clean["loi"] or clean["nhan_xet"] or clean["tu_nhien"]):
            raise journal.JournalError("Gemini trả về bài sửa rỗng.")
        w2 = dict(w, st="done", model=str(res.get("model") or "")[:80], seen=False, **clean)
        for k in ("err", "retry_at"):
            w2.pop(k, None)
        JOURNAL.update(d, {"w": w2, "u": time.time()})
        journal.write_fix_log(JOURNAL_DIR, ds, {"model": w2["model"], "loi": len(clean["loi"]), "cat": notes,
                                                 "token": int(client.tokens or 0)})
        n = len(clean["loi"])
        ok = True
        msg = "[i:pencil] Gemini đã sửa bài luyện viết%s · %s · bấm để xem ▸" % (
            " hôm nay" if d == cal_today() else " ngày " + journal.ddmm(d),
            ("%d lỗi" % n) if n else "không có lỗi")
    except Exception as err:
        quota = isinstance(err, ai.AIError) and err.kind == "quota"
        if not isinstance(err, (ai.AIError, journal.JournalError)):
            _warn("Gemini sửa bài", err)
        if quota and not w.get("rq"):
            at = ai.next_reset()
            w2 = dict(w, st="queue", retry_at=at, err="")
            msg = "Hôm nay Gemini hết lượt miễn phí · sẽ tự sửa sau %s" % time.strftime("%H:%M", time.localtime(at))
        else:
            reason = journal.short_reason(err) if isinstance(err, ai.AIError) else str(err)[:60]
            w2 = dict(w, st="", err=reason)
            msg = "Chưa sửa được: %s · không tính lượt, thử lại sau" % reason
        w2.pop("sent", None)
        JOURNAL.update(d, {"w": w2})
        journal.write_fix_log(JOURNAL_DIR, ds, {"loi_goi": str(err)[:200]})
    if _dialog is not None:
        try:
            _dialog._js("calFix", {"d": ds, "ok": ok, "n": n, "msg": msg, "view": cal_day(ds)})
        except Exception as err:
            _warn("calFix", err)
        _push_journal()
    elif cfg.get("show_tooltips", True):
        tooltip("ことば畑: " + ("Gemini đã sửa bài luyện viết · mở vườn để xem" if ok else
                                re.sub(r"\[i:[a-z]+\]\s?", "", msg)), period=6000)


def fix_auto() -> bool:
    """Bài "chờ lượt" (mọi model hết hạn mức): sau giờ đặt lại hạn mức thì tự gửi lại MỘT lần (mở Anki / mở vườn)."""
    if _fix["running"] or not mw.col:
        return False
    if not ai.clean_key(config().get("gemini_key")):
        return False
    today = cal_today()
    for back in range(journal.QUEUE_DAYS + 1):
        d = today - datetime.timedelta(days=back)
        w = JOURNAL.entry(d).get("w") or {}
        if w.get("st") == "queue" and not w.get("rq") and time.time() >= float(w.get("retry_at") or 0):
            return fix_start(d.isoformat(), auto=True) == ""
    return False


# -- 1.21: khách ghé vườn + Album khách ----------------------------------------------------------------------------

GUESTS = guests.GuestStore(os.path.join(ADDON_DIR, "user_files", "guests.json"), col_getter=lambda: mw.col)
# 1.28: chỗ lấp lánh + Hộp sưu tầm, gánh hàng rong (khoá collection kotoba_batake_events)
EVENTS = finds.EventStore(os.path.join(ADDON_DIR, "user_files", "events.json"), col_getter=lambda: mw.col)


# 1.30: sinh hoạt của StackChan (khoá collection kotoba_batake_life)
LIFE = life_core.LifeStore(os.path.join(ADDON_DIR, "user_files", "life.json"), col_getter=lambda: mw.col)


def _life_ctx(wallet: dict[str, Any]) -> tuple[dict[str, Any], list[str], bool]:
    """(nhà, các cảnh StackChan tới được, có thú nuôi đang ở trong nhà không)."""
    home = wallet.get("home") or {}
    scenes = life_core.open_scenes(home, core.ROOM_UNLOCK_LEVEL)
    pets = ((wallet.get("more_view") or {}).get("pets")) or []
    pets_home = any(isinstance(p, dict) and p.get("scene") == "room" and p.get("state") != "away" for p in pets)
    return home, scenes, pets_home


def life_view(wallet: dict[str, Any]) -> dict[str, Any]:
    """1.30: việc StackChan làm được ở từng cảnh hôm nay + sổ Sinh hoạt (data.life)."""
    home, scenes, pets_home = _life_ctx(wallet)
    names = {k: v["name"] for k, v in core.CATALOG.items()}
    return life_core.view(LIFE.seen(), home, scenes, cal_today(), pets_home, names)


def _ped_shop_items() -> list[str]:
    """Món cửa hàng gánh hàng có thể giảm giá: món bán ở cửa hàng (không phải hiếm / theo mùa / quà / món riêng)."""
    return [k for k, v in core.CATALOG.items()
            if int(v.get("price") or 0) > 0 and not v.get("rare") and not v.get("only") and not v.get("season")]


def _ped_goods(wallet: dict[str, Any], ev: dict[str, Any], day: datetime.date) -> list[dict[str, Any]]:
    home = wallet.get("home") or {}
    owned_seeds = set(((wallet.get("more") or {}).get("seeds") or {}).get("owned") or [])
    bought = set(ev["ped"].get(day.isoformat()) or [])
    out = []
    for g in finds.stock(day, _ped_shop_items(), list(more_core.SEEDS)):
        if g["kind"] == "seed":
            sd = more_core.SEEDS[g["id"]]
            price = int(sd["price"])
            lock = "Đã có giống này" if g["id"] in owned_seeds else ""
            out.append(dict(g, name="Giống cây: " + sd["name"], desc=sd.get("desc", ""), price=price, now=finds.disc(price),
                            bought=g["slot"] in bought, lock=lock, scene="", place="", w=1))
            continue
        it = core.CATALOG[g["id"]]
        price = int(it["price"])
        now = price if g["kind"] == "only" else finds.disc(price)
        lock = ""
        if it.get("zone") and it["zone"] not in (home.get("zones") or []):
            lock = "Mở vùng " + next(z["name"] for z in core.ZONES if z["id"] == it["zone"]) + " trước"
        elif it["scene"] == "room" and int(home.get("house") or 0) < core.ROOM_UNLOCK_LEVEL:
            lock = "Xây nhà tới bước Lắp cửa trước"
        elif (home.get("owned") or {}).get(g["id"], 0) >= it.get("max", 99):
            lock = "Đã có"
        out.append(dict(g, name=it["name"], desc=it.get("desc") or core.ITEM_DESC.get(g["id"], ""), price=price, now=now,
                        bought=g["slot"] in bought, lock=lock, scene=it["scene"], place=it.get("place", ""), w=it.get("w", 1)))
    return out


def finds_view(wallet: dict[str, Any], reviews: int, save: bool = True) -> dict[str, Any]:
    """1.28: chỗ lấp lánh hôm nay, gánh hàng rong, Hộp sưu tầm (data.finds)."""
    today = cal_today()
    zones = list((wallet.get("home") or {}).get("zones") or [])
    ev = EVENTS.load()
    if finds.ensure_day(ev, zones, today) and save and mw.col is not None:
        EVENTS.save(ev)
    if save and mw.col is not None:
        # đã ghi "đủ bộ" mà quà chưa vào kho (tắt Anki đúng lúc nhặt, hai máy ghi đè nhau) → tặng lại; quà không bán / bỏ
        # được nên số đang có = 0 nghĩa là chưa nhận
        own = (wallet.get("home") or {}).get("owned") or {}
        for sc in ev["sets"]:
            gift = finds.SET_REWARD.get(sc)
            if gift and gift in core.FIND_ITEMS and not own.get(gift):
                wallet.update(STATE.find_reward(0, gift))
                own = wallet["home"]["owned"]
    market = finds.is_market(today)
    nxt = finds.next_market(today)
    rewards = {k: v["name"] for k, v in core.FIND_ITEMS.items()}
    return {
        "day": today.isoformat(), "reviews": int(reviews), "per": finds.PER_SPOT, "max": finds.MAX_SPOTS,
        "open": finds.open_count(reviews), "next": finds.next_at(reviews),
        "spots": finds.spots_view(ev, reviews, today),
        "ped": {"today": market, "scene": "station" if "station" in zones else "yard",
                "date": event_core.date_label(today), "next": event_core.short_date(nxt, today), "next_iso": nxt.isoformat(),
                "goods": _ped_goods(wallet, ev, today) if market else []},
        "box": finds.box_view(ev, zones, today, rewards),
    }


def _guest_scenes(wallet: dict[str, Any]) -> list[str]:
    home = wallet.get("home") or {}
    uz = [z.get("id") for z in ((wallet.get("more") or {}).get("zones") or []) if isinstance(z, dict)]
    return guests.scenes_of(home, list(home.get("zones") or []), [u for u in uz if isinstance(u, str)],
                            int(home.get("house") or 0) >= core.ROOM_UNLOCK_LEVEL)


def guest_view(wallet: dict[str, Any], plants: list[dict[str, Any]] | None) -> dict[str, Any]:
    """Khách được ghé cảnh nào, tần suất (theo số cây Ra quả của vườn đang xem), album."""
    fruit = sum(1 for p in plants or [] if int(p.get("stage") or 0) >= 4)
    return guests.view(GUESTS.album(), wallet.get("home") or {}, _guest_scenes(wallet), cal_today(), fruit)


def export_pdf(parent: Any, html: str, name: str) -> None:
    """Xuất cuốn nhật ký ra PDF (khổ A5 dọc): JS dựng HTML của cuốn, QtWebEngine in ra file người dùng chọn."""
    from aqt.qt import QMarginsF, QPageLayout, QPageSize, QUrl
    try:
        from aqt.qt import QWebEnginePage
    except ImportError:
        from PyQt6.QtWebEngineCore import QWebEnginePage  # type: ignore[no-redef]
    from aqt.utils import getSaveFile
    safe = re.sub(r"[^\w\-]+", "_", name or "nhat_ky", flags=re.UNICODE).strip("_")[:60] or "nhat_ky"
    fname = "kotoba_batake_nhat_ky_%s.pdf" % safe
    path = os.environ.get("KB_TEST_PDF") or getSaveFile(parent, "Xuất cuốn nhật ký", "kotoba_batake_pdf", "PDF", ".pdf", fname)
    if not path:
        return
    page = QWebEnginePage(parent)
    _pdf_jobs.append(page)

    def finished(fpath: str, success: bool) -> None:
        if page in _pdf_jobs:
            _pdf_jobs.remove(page)
        page.deleteLater()
        if _dialog is not None:
            _dialog._js("calPdf", {"ok": bool(success), "name": os.path.basename(fpath)})

    def loaded(ok: bool) -> None:
        layout = QPageLayout(QPageSize(QPageSize.PageSizeId.A5), QPageLayout.Orientation.Portrait,
                             QMarginsF(0, 0, 0, 0))
        page.printToPdf(path, layout)

    page.pdfPrintingFinished.connect(finished)
    page.loadFinished.connect(loaded)
    if len(html.encode("utf-8")) < 1_800_000:
        page.setHtml(html, QUrl("about:blank"))
    else:      # setHtml của Qt chỉ nhận tới ~2 MB (cuốn năm nhiều ảnh): ghi ra file tạm rồi mở
        tmp = os.path.join(JOURNAL_DIR, "_xuat_pdf.html")
        os.makedirs(JOURNAL_DIR, exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(html)
        page.load(QUrl.fromLocalFile(tmp))


# ---------------------------------------------------------------------------
# Cửa sổ khu vườn (có ôn thẻ ngay bên trong)
# ---------------------------------------------------------------------------


GEOM_KEY = "kotoba_batake"


class GardenDialog(QDialog):
    def __init__(self) -> None:
        # Cửa sổ thường (như bảng Thống kê của Anki) để có nút phóng to / thu nhỏ.
        super().__init__(mw, Qt.WindowType.Window)
        self.setWindowTitle("ことば畑 · Vườn từ vựng")
        self.setMinimumSize(720, 520)
        try:
            restoreGeom(self, GEOM_KEY, default_size=(1100, 820))
        except Exception:  # hồ sơ chưa sẵn sàng
            self.resize(1100, 820)
        self._was_maximized = True
        self._cal_keep: dict[str, tuple[str, dict[str, Any]]] = {}   # 1.23 (KB-01): chữ đang gõ dở trong Lịch hoa
        self.deck_id: int = mw.col.decks.current()["id"]
        self._card: Any = None          # thẻ đang chờ trả lời
        self._states: Any = None
        self._old_stage: int | None = None
        self._type_info: dict[str, Any] | None = None  # thông tin ô gõ đáp án
        self._shown_card: Any = None    # thẻ đang hiện (để phát lại âm thanh)
        self._busy = False
        self._review_gen = 0            # 1.22.6: tăng mỗi lần dừng ôn / đổi deck — lượt chấm lưu xong sau đó không mở lại bảng ôn
        self._plants: list[dict[str, Any]] | None = None   # cây của deck đang xem (cho chép chính tả)
        self._paper_lang = ""         # 1.19.1: báo đang đọc, chọn ở Kệ báo ("" = báo có số chưa đọc, tiếng Nhật trước)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        self.web = AnkiWebView(parent=self, title="kotoba_batake")
        layout.addWidget(self.web)
        self.web.set_bridge_command(self._on_bridge, self)
        # 1.13: Anki 26.x gắn vào mọi webview "Esc → pycmd('close')" (không xét preventDefault) nên Esc để đóng
        # bảng Nhà / Trò chơi / Báo… đóng luôn cả cửa sổ vườn. Chỉ đóng cửa sổ khi trang không dùng phím Esc đó.
        self.web.onEsc = self._on_esc
        # Cho phép nhạc nền / âm thanh phát ngay khi mở vườn (giống màn ôn thẻ của Anki),
        # không phải chờ người dùng bấm vào một chức năng nào đó trước.
        try:
            self.web.setPlaybackRequiresGesture(False)
        except Exception as err:   # bản Anki cũ không có hàm này
            _warn("autoplay", err)
        # Không dùng CSS mặc định của Anki (nút bo tròn, nền xám khi rê chuột…) để giữ kiểu pixel.
        head = ""
        try:
            zoom = float(self.web.app_zoom_factor())
            if zoom != 1:
                head = f"<style>body {{ zoom: {zoom}; }}</style>"
        except Exception:
            pass
        head += prefs_script()      # 1.25.3: cài đặt riêng máy (trời & giờ, nhạc…) — có trước khi sky.js / music.js chạy
        head += fix_script()        # 1.25.5: bản sửa hình gốc
        self.web.stdHtml(
            _read_body(),
            head=head,
            default_css=False,
            css=[f"{WEB_BASE}/garden.css"],
            js=[
                f"{WEB_BASE}/diag.js", f"{WEB_BASE}/prefs.js", f"{WEB_BASE}/fix.js", f"{WEB_BASE}/icons.js", f"{WEB_BASE}/sky.js", f"{WEB_BASE}/season.js", f"{WEB_BASE}/fx.js", f"{WEB_BASE}/music.js",
                f"{WEB_BASE}/games.js", f"{WEB_BASE}/fields.js", f"{WEB_BASE}/season_art.js", f"{WEB_BASE}/rare_art.js", f"{WEB_BASE}/nha_art.js", f"{WEB_BASE}/pets.js", f"{WEB_BASE}/guests.js",
                f"{WEB_BASE}/finds_art.js", f"{WEB_BASE}/finds.js", f"{WEB_BASE}/life.js", f"{WEB_BASE}/home.js", f"{WEB_BASE}/craft.js", f"{WEB_BASE}/paper.js", f"{WEB_BASE}/seeds.js",
                f"{WEB_BASE}/joy.js", f"{WEB_BASE}/ui.js", f"{WEB_BASE}/calendar.js", f"{WEB_BASE}/greet.js", f"{WEB_BASE}/tour.js", f"{WEB_BASE}/garden.js",
            ],
            context=self,
        )
        # Anki xếp hàng lệnh eval cho tới khi trang sẵn sàng, nên gửi luôn dữ liệu.
        self.refresh()

    # -- khu vườn ----------------------------------------------------------

    def refresh(self) -> None:
        global _dict_possible
        if not mw.col:
            return
        try:      # 1.23 (KB-03): Undo / Redo lượt ôn ở cửa sổ chính → trả lại / cộng lại xu (trước lần bù điện thoại)
            check_undo()
        except Exception as err:
            _warn("hoàn tác lượt ôn", err)
        paid = mobile_catch_up()
        fed = None
        try:   # 1.14: tuổi nhà, "mừng quay lại", tự cho thú ăn
            fed = STATE.touch()
        except Exception as err:
            _warn("nhà / thú nuôi", err)
        frozen_now = _freeze_settle()      # 1.25.9: trước khi đọc ví (số vé còn lại đúng)
        try:
            cfg = config()
            data = core.build_garden(mw.col, self.deck_id, cfg)
            data["wallet"] = STATE.load()
            meta = data.pop("_meta", None)
            try:
                more_core.apply_seeds(data["plants"], meta, share_core.combined(data["wallet"]["more"]["seeds"],
                                                                               data["wallet"]["more"].get(share_core.MYSEED_KEY)))
            except Exception as err:
                _warn("giống cây", err)
            data["ui"] = more_core.clean_ui(cfg.get("ui"))
            data["admin"] = admin_on()       # 1.25.5: "Sửa hình" (admin) · 1.25.7: người dùng thường "Góp ý hình"
            data["fx"] = {
                "effects": bool(cfg["effects"]),
                "sound": bool(cfg["sound"]),
                "music": bool(cfg["music"]),
                "music_volume": float(cfg["music_volume"]),
                "game_daily_coins": int(cfg["game_daily_coins"]),
            }
            data["catalog"] = core.home_catalog(data["wallet"], STATE.load_px())
            try:
                today = _daily_stats()
            except Exception:
                today = {"reviews": 0, "streak": 0, "day": 0}
            today["goal"] = int(cfg["daily_goal"])
            today["bonus"] = int(cfg["daily_bonus"])
            today["claimed"] = data["wallet"].get("goal_day") == today["day"]
            today["freeze"] = more_core.freeze_view(data["wallet"]["more"]["freeze"], int(data["wallet"].get("coins") or 0))
            data["today"] = today
            data["mobile_on"] = bool(cfg.get("mobile_coins", True))
            try:      # 1.20: ô "Hôm nay thế nào?", dòng luyện viết, ảnh vườn tự chụp
                data["journal"] = journal_summary()
            except Exception as err:
                _warn("nhật ký", err)
                data["journal"] = None
            try:      # 1.21: khách ghé vườn + Album khách
                data["guests"] = guest_view(data["wallet"], data["plants"])
            except Exception as err:
                _warn("khách ghé vườn", err)
                data["guests"] = None
            try:      # 1.28: chỗ lấp lánh, gánh hàng rong, Hộp sưu tầm
                data["finds"] = finds_view(data["wallet"], int(today.get("reviews") or 0))
            except Exception as err:
                _warn("nhặt đồ / gánh hàng", err)
                data["finds"] = None
            try:      # 1.30: sinh hoạt của StackChan + sổ Sinh hoạt
                data["life"] = life_view(data["wallet"])
            except Exception as err:
                _warn("sinh hoạt", err)
                data["life"] = None
            self._plants = data["plants"]
            _dict_possible = bool(self._dict_candidates(_voice(cfg)) or self._word_candidates(_voice(cfg)))
            try:
                data["paper"] = paper_summary(self)
            except Exception as err:
                _warn("paper", err)
                data["paper"] = None
            try:
                data["quests"] = STATE.quests(_today(), _avail)
            except Exception as err:
                _warn("quests", err)
                data["quests"] = None
            _write_progress(self._plants)
            try:
                q = data.get("quests") or {}
                qc = (data.get("stats") or {}).get("queue")      # 1.18: build_garden đã đọc deck_due_tree
                data["joy"] = more_core.joy_view(
                    data["plants"], sum(qc) if qc else self._left_today(), int(today.get("reviews", 0)), int(today["goal"]),
                    int(today.get("streak", 0)), bool(q.get("list")) and all(x.get("done") for x in q.get("list", [])),
                    today.get("day"))
            except Exception as err:
                _warn("hiệu ứng thành tích", err)
                data["joy"] = None
            try:      # 1.26: Tin làng + màn chào
                data["news"], data["greet"] = _news_and_greet(data, today, cfg)
            except Exception as err:
                _warn("tin làng", err)
                data["news"], data["greet"] = None, None
            data["tour"] = not TOUR_TEST_OFF and event_core.is_new_player(data["wallet"])     # 1.26.1: hướng dẫn 3 bước
        except Exception as err:
            _warn("dựng khu vườn", err)
            showWarning(f"ことば畑: không dựng được khu vườn.\n\n{err!r}\n\nMenu Tools → ことば畑 · Báo lỗi để lấy thông tin gửi người làm ことば畑.",
                        parent=self)
            return
        self._js("render", data)
        if fed:
            self._js("toast", f"[i:paw] Đã cho {', '.join(fed['names'])} ăn · −{fed['cost']} xu")
        if paid:
            paid["message"] = mobile_message(paid)
            self._js("mobilePaid", paid)
        if frozen_now:
            n = len(frozen_now)
            msg = ("[i:snow] " + ("Hôm qua" if n == 1 else f"{n} ngày qua") + f" chưa ôn — đã dùng {n} vé giữ chuỗi, "
                   f"chuỗi {int(data['today'].get('streak', 0))} ngày vẫn còn.")
            self.web.eval(f"Garden.toast({json.dumps(msg, ensure_ascii=False)}, null, 6000)")
        # 1.12: báo Gemini — chưa có số hôm nay thì viết (chạy nền, mỗi ngày tối đa vài lần); 1.19.1: mọi báo đã tick
        try:
            ai_start_all("auto")
        except Exception as err:
            _warn("Gemini (tự viết)", err)
        try:      # 1.20: bài luyện viết "chờ lượt" → tự gửi lại một lần sau giờ đặt lại hạn mức
            fix_auto()
        except Exception as err:
            _warn("Gemini (sửa bài chờ lượt)", err)

    def _left_today(self) -> int | None:
        """Số thẻ còn phải học hôm nay trong deck đang xem (mới + đang học + ôn, theo giới hạn của deck)."""
        try:
            node = mw.col.sched.deck_due_tree(self.deck_id)
            if node is None:
                return None
            return int(node.new_count) + int(node.learn_count) + int(node.review_count)
        except Exception:
            return None

    def _on_esc(self) -> None:
        def done(used: Any) -> None:
            if not used:
                self.close()
        try:
            self.web.evalWithCallback(
                "(function(){var u=!!window.__kbEscUsed;window.__kbEscUsed=false;return u;})()", done)
        except Exception:
            self.close()

    def _js(self, fn: str, payload: Any = None) -> None:
        arg = "" if payload is None else json.dumps(payload, ensure_ascii=False)
        self.web.eval(f"Garden.{fn}({arg})")

    # -- ôn thẻ trong vườn --------------------------------------------------

    def _start_review(self) -> None:
        mw.col.decks.select(self.deck_id)
        self._next_card()

    def _next_card(self) -> None:
        av_player.stop_and_clear_queue()
        self._card = None
        try:
            queued = mw.col.sched.get_queued_cards(fetch_limit=1)
        except Exception as err:
            showWarning(f"ことば畑: không lấy được thẻ.\n\n{err!r}", parent=self)
            return
        if not queued.cards:
            self._shown_card = None
            # 1.18: gửi kèm số đếm (trước đây bảng ôn giữ số của thẻ cuối, vd. "0 1 0" dù đã hết thẻ)
            self._js("reviewDone", {"counts": [queued.new_count, queued.learning_count, queued.review_count]})
            return

        top = queued.cards[0]
        card = mw.col.get_card(top.card.id)
        card.start_timer()
        self._card = card
        self._shown_card = card
        self._states = top.states
        self._old_stage = _stage(card.nid, _deck_name(self.deck_id))
        question, self._type_info = core.type_question(
            mw.col, card, mw.prepare_card_text_for_display(card.question())
        )
        question = _card_will_show(question, card, "reviewQuestion")

        if top.queue == QueuedCards.NEW:
            idx, self._before = 0, "new"
        elif top.queue == QueuedCards.LEARNING:
            idx, self._before = 1, "learn"
        else:
            idx, self._before = 2, "review"

        payload = {
            "cid": card.id,
            "nid": card.nid,
            "question": question,
            "css": f"<style>{card.render_output().css}</style>",
            "bodyclass": theme_manager.body_classes_for_card_ord(card.ord),
            "base": mw.serverURL(),
            "labels": list(mw.col.sched.describe_next_states(top.states)),
            "counts": [queued.new_count, queued.learning_count, queued.review_count],
            "queue": idx,
        }
        self._js("showCard", payload)
        if card.autoplay():
            av_player.play_tags(card.question_av_tags())

    def _show_answer(self, typed: str) -> None:
        card = self._card
        if card is None:
            return
        try:
            answer = core.type_answer(
                mw.col, mw.prepare_card_text_for_display(card.answer()), self._type_info, typed
            )
            answer = _card_will_show(answer, card, "reviewAnswer")
        except Exception as err:
            showWarning(f"ことば畑: không hiện được mặt sau.\n\n{err!r}", parent=self)
            return
        self._js("showAnswer", {"cid": card.id, "answer": answer})
        if card.autoplay():
            av_player.stop_and_clear_queue()
            av_player.play_tags(card.answer_av_tags())

    def _answer(self, ease: int) -> None:
        card, states = self._card, self._states
        if card is None or self._busy or ease not in RATINGS:
            return
        self._busy = True
        self._card = None
        nid, old, deck = card.nid, self._old_stage, _deck_name(self.deck_id)
        before = getattr(self, "_before", None)
        gen = self._review_gen
        answer = mw.col.sched.build_answer(card=card, states=states, rating=RATINGS[ease])
        answer_started(card.id)

        def after(_changes: Any) -> None:
            self._busy = False
            info: dict[str, Any] | None = None
            try:
                info = _record_answer(nid, old, ease, deck, before, card.id)
            except Exception as err:
                _warn("record", err)
            finally:
                answer_finished(card.id)
            if _dialog is not self:      # 1.22.6: vườn đã đóng trong lúc lưu (xu vẫn đã cộng)
                return
            self.refresh()
            if info:
                self._js("celebrate", info)
            # 1.22.6: người dùng đã bấm Dừng / Esc / đổi deck trong lúc lưu → không mở lại bảng ôn (trước đây bảng ôn tự bật
            # lại, đổi deck thì còn hiện thẻ của deck cũ)
            if gen == self._review_gen:
                self._next_card()

        def failed(err: Exception) -> None:
            self._busy = False
            answer_finished(card.id)
            showWarning(f"ことば畑: không lưu được câu trả lời.\n\n{err!r}", parent=self)

        answer_card(parent=self, answer=answer).success(after).failure(failed).run_in_background()

    def _stop_review(self) -> None:
        av_player.stop_and_clear_queue()
        self._card = None
        self._shown_card = None
        self._review_gen += 1

    # -- cầu nối JS -> Python -------------------------------------------------

    def _on_bridge(self, cmd: str) -> Any:
        try:
            return self._dispatch(cmd)
        except Exception as err:
            # ghi vào nhật ký Báo lỗi rồi để Anki hiện hộp lỗi như trước
            try:
                ERRORS.add("Python", "lệnh " + ":".join(cmd.split(":", 2)[:2]),   # không ghi tham số (chữ đã gõ…)
                           f"{type(err).__name__}: {err}", traceback.format_exc(), VERSION)
            except Exception:
                pass
            raise

    def _dispatch(self, cmd: str) -> Any:
        if cmd in ("ready", "refresh"):
            self.refresh()
        elif cmd.startswith("deck:"):
            try:
                self.deck_id = int(cmd.split(":", 1)[1])
            except ValueError:
                return None
            # 1.25.3: deck chọn ở ô Deck của vườn thành deck hiện tại của Anki (như khi bấm Tưới ngay) — trước đây chỉ
            # xem rồi đóng vườn thì lần mở sau về deck cũ
            try:
                if mw.col.decks.get(self.deck_id, default=False):
                    mw.col.decks.select(self.deck_id)
            except Exception as err:
                _warn("chọn deck", err)
            self._stop_review()
            self.refresh()
        elif cmd == "rv:start":
            self._start_review()
        elif cmd.startswith("rv:show:"):
            self._show_answer(cmd[len("rv:show:"):])
        elif cmd.startswith("rv:ans:"):
            try:
                self._answer(int(cmd.rsplit(":", 1)[1]))
            except ValueError:
                pass
        elif cmd == "rv:stop":
            self._stop_review()
        elif cmd.startswith("game:"):
            self._on_game(cmd[len("game:"):])
        elif cmd.startswith("home:"):
            self._on_home(cmd[len("home:"):])
        elif cmd.startswith("craft:"):
            self._on_craft(cmd[len("craft:"):])
        elif cmd.startswith("fields:"):
            self._on_fields(cmd[len("fields:"):])
        elif cmd.startswith("paper:") or cmd.startswith("dict:"):
            self._on_paper(cmd)
        elif cmd.startswith("ai:"):
            self._on_ai(cmd[len("ai:"):])
        elif cmd.startswith("ui:"):
            self._on_ui(cmd[len("ui:"):])
        elif cmd.startswith("prefs:set:"):
            save_prefs(cmd[len("prefs:set:"):])
        elif cmd.startswith("base:"):
            self._on_base(cmd[len("base:"):])
        elif cmd.startswith("cal:"):
            self._on_cal(cmd[len("cal:"):])
        elif cmd.startswith("guest:"):
            self._on_guest(cmd[len("guest:"):])
        elif cmd.startswith("life:"):
            self._on_life(cmd[len("life:"):])
        elif cmd.startswith("find:") or cmd.startswith("ped:"):
            self._on_find(cmd)
        elif cmd.startswith("share:"):
            self._on_share(cmd[len("share:"):])
        elif cmd.startswith("snap:save:"):
            self._save_photo(cmd[len("snap:save:"):])
        elif cmd.startswith("play:") and self._shown_card is not None:
            play_clicked_audio(cmd, self._shown_card)
        elif cmd == "win:full":
            self.toggle_full_screen()
        elif cmd == "app:icon":
            self._js("appIcon", create_desktop_icon())
        elif cmd.startswith("app:jserr:"):
            self._js_error(cmd[len("app:jserr:"):])
        elif cmd.startswith("app:report:"):
            try:
                client = json.loads(cmd[len("app:report:"):] or "{}")
            except ValueError:
                client = {}
            show_report(self, client)
        return None

    def _js_error(self, raw: str) -> None:
        """Lỗi JavaScript trong trang vườn (garden.js gửi lên, đã gộp trùng phía trang)."""
        try:
            e = json.loads(raw)
        except ValueError:
            return
        if not isinstance(e, dict):
            return
        where = str(e.get("src") or "")[-60:]
        if e.get("line"):
            where += f":{e.get('line')}" + (f":{e.get('col')}" if e.get("col") else "")
        ERRORS.add("JS", where, str(e.get("msg") or "")[:300], str(e.get("stack") or "")[:3000], VERSION)

    def toggle_full_screen(self) -> None:
        """F11: toàn màn hình (ẩn cả thanh tiêu đề) ↔ trở lại như trước."""
        if self.isFullScreen():
            if self._was_maximized:
                self.showMaximized()
            else:
                self.showNormal()
        else:
            self._was_maximized = self.isMaximized()
            self.showFullScreen()

    # -- mini-game ---------------------------------------------------------

    def _on_game(self, cmd: str) -> None:
        if cmd == "open":
            self._stop_review()
        elif cmd == "stop":
            av_player.stop_and_clear_queue()
        elif cmd.startswith(("audio:", "exaudio:")):
            example = cmd.startswith("ex")
            try:
                nid = int(cmd.split(":", 1)[1])
                note, cfg = mw.col.get_note(nid), config()
                roles = core.note_roles(note, cfg)
                fname = (core.example_audio if example else core.note_audio)(note, cfg, roles)
                speech = ""
                if not fname and roles.get("lang") == "en" and en_tts_available():
                    # 1.17: từ / câu tiếng Anh không có audio → giọng tiếng Anh của máy
                    speech = (core._clean_example(note[roles["example"]], "en") if example and roles.get("example")
                              else core.note_details(note, cfg, roles)["word"])
            except Exception as err:
                _warn("example audio" if example else "game audio", err)
                return
            av_player.stop_and_clear_queue()
            if fname:
                av_player.play_file(fname)
            elif speech and speech != "?":
                _play(("tts_en", speech, 1.0))
        elif cmd.startswith("reward:"):
            try:
                parts = cmd.split(":")
                if len(parts) not in (4, 5):
                    return
                game, score, coins = parts[1], int(parts[2]), int(parts[3])
                win = len(parts) == 5 and parts[4] == "1"
                result = STATE.record_game(
                    game, score, coins, time.strftime("%Y-%m-%d"),
                    int(config()["game_daily_coins"]), win,
                )
            except Exception as err:
                _warn("game reward", err)
                return
            q = _quest_after("game", game=game, win=win)
            if q is not None:
                result["quests"] = q
                result["wallet"] = STATE.load()
            self._js("gameSaved", result)

    # -- báo 畑新聞 & chép chính tả --------------------------------------------

    def _paper_index(self, lang: str) -> dict[str, Any]:
        """Kệ báo của ngôn ngữ đang đọc (kèm các báo đã tick để chuyển).

        1.23: Kệ báo tiếng Nhật gộp số của cả hai nguồn (Claude Code / Gemini), xếp theo ngày, mỗi số ghi nguồn;
        trước đây chuyển nguồn thì các số của nguồn kia biến khỏi kệ."""
        lib = _library(lang)
        if lang == "ja":
            st, _view, book = paper_states(lang)
            rows: list[dict[str, Any]] = []
            srcs = _ja_sources()
            for src, slib in srcs:
                part = paper.index_view(slib, paper.source_view(st, book, src))
                for x in part["issues"]:
                    x.update(src=src, ref=x["date"] + "@" + src)
                rows += part["issues"]
            order = {src: i for i, (src, _l) in enumerate(srcs)}
            rows.sort(key=lambda x: (x["date"], -order.get(x["src"], 9)), reverse=True)
            view = {"enabled": bool(srcs), "issues": rows[:paper.MAX_ISSUES], "lang": "ja",
                    "multi": len({x["src"] for x in rows}) > 1}
        else:
            view = paper.index_view(lib, _paper_state(lang).load())
        view.update(source=paper_source() if lang == "ja" else ("gemini" if lib is not None else ""), lang=lang,
                    lang_name=LANG_NAME.get(lang, ""), langs=paper_langs(),
                    ai_busy=bool(_ai["running"]) and _ai.get("lang") == lang)
        view["sub"] = paper_sub_view()       # 1.25.1: gói báo (màn "Gói báo đã hết hạn" của tab Báo)
        return view

    def _on_paper(self, cmd: str) -> None:
        group, _, rest = cmd.partition(":")
        action, _, arg = rest.partition(":")
        # 1.19: báo theo ngôn ngữ đang đọc (thư mục + trạng thái riêng); lượt chép hằng ngày dùng trạng thái chung
        # và câu của báo tiếng Nhật như trước
        if group == "paper" and action == "open":       # 1.19.1: mở bảng Báo → báo có số chưa đọc
            self._paper_lang = ""
            return
        if group == "paper" and action in ("dich", "fb"):   # 1.23: "Dịch số này", "Kỳ này hay / Nhạt"
            self._paper_extra(action, arg)
            return
        lang = paper_lang(self)
        if group == "paper":
            self._paper_lang = lang            # giữ báo đang đọc (đọc hết số mới cũng không tự nhảy sang báo kia)
        lib = _library(lang) if group == "paper" else _library()
        src = paper_source() if lang == "ja" else "gemini"
        book: dict[str, Any] | None = None
        try:
            if action in ("stop",):
                av_player.stop_and_clear_queue()
                return
            if group == "paper" and action in ("issue", "q", "ct", "play"):
                # 1.23: Kệ báo gộp hai nguồn → mã số báo "ngày@nguồn" chọn đúng thư mục và đúng ô tiến độ
                payload0 = json.loads(arg) if action != "issue" else {}
                ref = arg if action == "issue" else str(payload0.get("d") or "")
                lib, src, date0 = paper_ref(lang, ref)
                if action == "issue":
                    arg = date0
                else:
                    payload0["d"] = date0
                    arg = json.dumps(payload0)
            if action == "play":
                self._paper_play(group, json.loads(arg), lib)
                return
            if group == "paper" and action == "lang":
                self._paper_lang = arg if arg in PAPER_LANGS else ""
                self._js("paperIndex", self._paper_index(paper_lang(self)))
                self._js("paperSummary", paper_summary(self))
                return
            if group == "paper":
                saved, st, book = paper_states(lang, src)
            else:
                saved = st = PAPER.load()
            if group == "paper" and action == "index":
                self._js("paperIndex", self._paper_index(lang))
                return
            if group == "paper" and action == "issue":
                if lib is None:
                    raise paper.PaperError(
                        "Báo tiếng %s do Gemini viết: dán khoá Gemini ở tab Nguồn báo." % ("Anh" if lang == "en" else "Việt")
                        if lang in ("en", "vi") else
                        "Chưa chọn nguồn báo: mở tab Nguồn báo để dán khoá Gemini hoặc chọn thư mục kotoba_daily.")
                voice = _voice()
                view = self._issue_view(lib, st, arg, voice, src, lang)
                if arg not in st["read"]:
                    paper.mark_read(st, arg)
                    save_paper_states(lang, saved, book)
                    if lang == "ja" and src == paper_source():
                        _write_progress(self._plants)
                self._open_issue = arg
                self._open_src = src
                self._js("paperIssue", view)
                self._js("paperSummary", paper_summary(self))
                pend = paper.issue_pending(lib, arg, voice)
                if pend:     # 1.13: câu chép của số này chưa có giọng đọc → nhờ Gemini tạo rồi vẽ lại
                    voice_start(pend, lambda: self._reissue(arg))
                return
            if group == "dict" and action == "open":
                self._dict_open(st, lib)
                return
            payload = json.loads(arg)
            variants = [v for v in payload.get("v", []) if isinstance(v, str)][:20]
            voice = _voice()
            if group == "paper" and action == "q" and lib is not None:
                res = paper.answer_question(lib, st, str(payload.get("d")), int(payload.get("i")), int(payload.get("c")),
                                            voice)
            elif group == "paper" and action == "ct" and lib is not None:
                res = paper.answer_issue_dictation(lib, st, str(payload.get("d")), int(payload.get("i")), variants,
                                                   _today(), voice)
            elif group == "dict" and action == "check":
                res = paper.answer_daily(st, _today(), str(payload.get("id")), variants, lib, _note_item, voice,
                                         _word_item)
            else:
                return
        except paper.PaperError as err:
            self._js("paperError", str(err))
            return
        except (ValueError, TypeError, KeyError, OSError) as err:
            _warn("paper", err)
            self._js("paperError", "Không làm được việc này.")
            return
        if group == "paper":
            save_paper_states(lang, saved, book)
        else:
            PAPER.save(saved)
        res["wallet"] = STATE.add_coins(res["gained"]) if res["gained"] else STATE.load()
        quests = None
        if res["ok"] and res["first"] and res["kind"] in ("ct", "dict"):
            quests = _quest_after("dict", n=1)
        if res["kind"] in ("q", "ct") and res["bonus"]:
            quests = _quest_after("paper") or quests
        if quests is not None:
            res["quests"] = quests
            res["wallet"] = STATE.load()
        if not res["ok"] and (group == "dict" or lang == "ja"):
            _write_progress(self._plants)
        if group == "paper" and lang == "ja" and res.get("date"):
            res["ref"] = res["date"] + "@" + src
        res["summary"] = paper_summary(self)
        self._js("paperResult", res)

    # -- 1.12: nguồn báo (Gemini / Claude Code) ------------------------------

    def _on_ai(self, cmd: str) -> None:
        action, _, arg = cmd.partition(":")
        flash: dict[str, Any] = {}
        refresh = False
        if action == "key":
            try:
                key = ai.clean_key((json.loads(arg or "{}") or {}).get("key"))
            except (ValueError, AttributeError):
                key = ""
            problem = ai.key_problem(key)
            if problem:
                flash = {"flash": problem, "ok": False}
            else:
                ai_test_key(key)
        elif action == "set":
            try:
                p = json.loads(arg or "{}")
            except ValueError:
                p = {}
            p = p if isinstance(p, dict) else {}
            changes: dict[str, Any] = {}
            if isinstance(p.get("langs"), list):         # 1.19.1: ô tick "Báo muốn nhận"
                cfg0 = config()
                before = wanted_langs(cfg0)
                changes["gemini_langs"] = clean_langs(p["langs"])
                if ai.clean_key(cfg0.get("gemini_key")) and not cfg0.get("gemini_wait_start"):
                    # 1.22.4: báo vừa tick thêm chờ chọn trình độ / deck rồi bấm "Bắt đầu viết", không viết ngay
                    old_w = cfg0.get("gemini_wait_langs") if isinstance(cfg0.get("gemini_wait_langs"), list) else []
                    changes["gemini_wait_langs"] = [x for x in changes["gemini_langs"] if x in old_w or x not in before]
                refresh = True
            if p.get("level") in ai.LEVELS:
                changes["gemini_level"] = p["level"]
            if p.get("level") in ai_en.LEVELS:          # 1.19: trình độ của báo tiếng Anh (A1–C1)
                changes["gemini_level_en"] = p["level"]
            if p.get("audio") in ai.AUDIO_MODES:
                changes["gemini_audio"] = p["audio"]
            if p.get("voice") in ai.VOICES:              # 1.19.1: một giọng chung cho cả hai báo
                changes["gemini_voice"] = changes["gemini_voice_en"] = p["voice"]
            if isinstance(p.get("auto"), bool):
                changes["gemini_auto"] = p["auto"]
            if p.get("dict_voice") in DICT_VOICE_MODES:
                changes["dict_voice"] = p["dict_voice"]
            if p.get("story") in story_core.MODES:          # 1.23: Truyện: Hay hơn / Tiết kiệm / Tắt
                changes["gemini_story"] = p["story"]
            if p.get("tone") in story_core.TONES:           # 1.23: Giọng truyện
                changes["gemini_story_tone"] = p["tone"]
                changes["gemini_story_tones"] = [p["tone"]]
            if isinstance(p.get("tones"), list):           # 1.25.1: chủ đề truyện chọn nhiều (ít nhất một)
                ts = story_core.norm_tones(p["tones"])
                changes["gemini_story_tones"] = ts
                changes["gemini_story_tone"] = ts[0]       # bản ≤ 1.25.0 đọc khoá này
            if p.get("source") in ("auto", "claude", "gemini"):
                changes["bao_source"] = p["source"]
                refresh = True
                if p["source"] == "claude":
                    conf = confirmed_sources()
                    conf["ja"] = "claude"
                    changes["paper_confirmed"] = conf
            if changes:
                save_config(**changes)
            if changes.get("gemini_audio") in ("chinh_ta", "ca_bai"):
                ai_start_all("audio")
        elif action == "decks":                           # 1.19.1: deck lấy từ cho báo (tối đa 5)
            try:
                p = json.loads(arg or "{}")
                words.save_src(mw.col, str(p.get("lang")), p.get("decks"), p.get("mode"))
                base = AI_DIRS.get(str(p.get("lang")), AI_DIR)
                if os.path.isdir(base):            # lý do "chưa đủ từ" cũ không còn đúng với deck mới chọn
                    st = ai.load_status(base)
                    if st.pop("thieu", None) is not None:
                        st["last_try"] = 0
                        ai.save_status(base, st)
            except (ValueError, TypeError, AttributeError) as err:
                _warn("chọn deck cho báo", err)
        elif action == "start":                           # 1.22.3: "Bắt đầu viết" sau khi dán khoá lần đầu
            cfg0 = config()
            conf = confirmed_sources(cfg0)
            for x in wanted_langs(cfg0):
                if _lang_source(cfg0, x) == "gemini":
                    conf[x] = "gemini"
            save_config(gemini_wait_start=False, gemini_wait_langs=[], paper_confirmed=conf)
            if not ai_start_all("manual"):
                flash = {"flash": _ai.get("why") or ("Gemini đang bận, thử lại sau." if _ai["running"] else
                                                     "Hôm nay đã có đủ báo rồi. Từ mai Gemini tự viết khi mở Anki."), "ok": not _ai["running"]}
        elif action in ("write", "audio"):
            try:
                lang = str((json.loads(arg or "{}") or {}).get("lang") or "ja")
            except (ValueError, AttributeError):
                lang = "ja"
            lang = lang if lang in PAPER_LANGS else "ja"
            if action == "write" and lang in ai_waiting():
                cfg0 = config()
                rest = [x for x in _old_waiting(cfg0) if x != lang]
                save_config(gemini_wait_start=False, gemini_wait_langs=rest)
            if action == "write" and _lang_source(config(), lang) == "gemini":
                confirm_source(lang, "gemini")   # 1.23: bấm "Viết" là xác nhận Gemini cho báo này
            if action == "write" and not ai_start("manual", self, lang):
                base = AI_DIRS[lang]
                flash = {"flash": _ai.get("why") or ("Hôm nay đã có báo rồi." if ai.has_issue(base, ai_today()) else
                                                     "Gemini đang bận, thử lại sau." if _ai["running"] else
                                                     "Chưa viết được: kiểm tra khoá và nguồn báo."), "ok": False}
            elif action == "audio" and not ai_start("audio", self, lang):
                flash = {"flash": "Không còn giọng đọc nào cần tạo.", "ok": True}
        elif action == "sub":                             # 1.25.1: gói báo — mua / gia hạn, Tự gia hạn
            try:
                p = json.loads(arg or "{}")
            except ValueError:
                p = {}
            p = p if isinstance(p, dict) else {}
            try:
                if p.get("buy") in more_core.PAPER_PLANS:
                    STATE.paper_sub_buy(p["buy"], ai_today())
                    plan = more_core.PAPER_PLANS[p["buy"]]
                    flash = {"flash": "✓ Đã mua gói báo %s · −%d xu." % (plan["name"], plan["price"]), "ok": True}
                    refresh = True
                    ai_start_all("auto")
                elif isinstance(p.get("auto"), bool):
                    STATE.paper_sub_auto(p["auto"])
            except core.HomeError as err:
                flash = {"flash": "✗ " + str(err), "ok": False}
        elif action == "forget":
            cfg = config()
            conf = {x: ("" if v == "gemini" else v) for x, v in confirmed_sources(cfg).items()}
            save_config(gemini_key="", gemini_wait_start=False, gemini_wait_langs=[], paper_confirmed=conf,
                        bao_source="auto" if cfg.get("bao_source") == "gemini" else cfg.get("bao_source", "auto"))
            flash = {"flash": "Đã xoá khoá. Các số báo cũ vẫn còn trong kệ.", "ok": True}
            refresh = True
        elif action == "keypage":
            openLink(ai.KEY_PAGE)
        elif action == "dir":
            flash = self._choose_bao_dir()
            refresh = bool(flash.get("ok"))
        self._js("aiStatus", ai_view(flash))
        if refresh:
            self.refresh()

    def _choose_bao_dir(self) -> dict[str, Any]:
        from aqt.qt import QFileDialog
        start = paper.resolve_dir(config().get("bao_dir")) or os.path.expanduser("~")
        path = QFileDialog.getExistingDirectory(self, "Chọn thư mục kotoba_daily", start)
        if not path:
            return {}
        if not any(os.path.exists(os.path.join(path, x)) for x in ("lo_trinh.json", "pham_vi.json", "bao")):
            return {"flash": "Thư mục này không giống bộ kotoba_daily (không có lo_trinh.json, pham_vi.json hay bao/).", "ok": False}
        save_config(bao_dir=path, bao_source="claude")
        return {"flash": "✓ Đã nối thư mục kotoba_daily.", "ok": True}

    def _dict_candidates(self, voice: paper.Voice | None = None) -> list[dict[str, Any]]:
        """Cây có câu ví dụ dùng được: có audio câu ví dụ, hoặc (1.13) có giọng dự phòng để đọc câu đó."""
        voice = voice or _voice()
        out = []
        for p in self._plants or []:
            if p.get("ex_audio") or ((p.get("has_ex") or p.get("cloze")) and voice.any()):
                out.append({"nid": p["nid"], "wilted": p.get("wilted"), "thirsty": p.get("thirsty"),
                            "audio": bool(p.get("ex_audio"))})
        return out

    def _word_candidates(self, voice: paper.Voice | None = None) -> list[dict[str, Any]]:
        """1.13: cây từ vựng để "nghe từ, gõ lại" khi deck không có (đủ) câu ví dụ: có audio của từ hoặc giọng dự phòng."""
        voice = voice or _voice()
        out = []
        for p in self._plants or []:
            if p.get("kind", "vocab") == "vocab" and (p.get("audio") or voice.any()):
                out.append({"nid": p["nid"], "wilted": p.get("wilted"), "thirsty": p.get("thirsty"),
                            "audio": bool(p.get("audio"))})
        return out

    def _dict_open(self, st: dict[str, Any] | None = None, lib: paper.Library | None = None,
                   start_voice: bool = True) -> None:
        """Lượt chép hôm nay: chọn (hoặc bỏ câu không nghe được rồi lấp chỗ), gửi sang trang, nhờ Gemini đọc câu thiếu."""
        st = st if st is not None else PAPER.load()
        lib = lib if lib is not None else _library()
        voice = _voice()
        if paper.build_daily(st, _today(), lib, self._dict_candidates(voice), _note_item, voice, _word_item,
                             self._word_candidates(voice)):
            PAPER.save(st)
        view = paper.daily_view(st, lib, _note_item, voice, _word_item)
        pend = paper.daily_pending(st, lib, _note_item, voice, _word_item) if start_voice else []
        started = bool(pend) and voice_start(pend, lambda: self._dict_open(start_voice=False))
        view["voicing"] = started or bool(_voice_job["running"])
        view["hint"] = self._dict_hint(voice, view)
        self._js("dictShow", view)

    def _dict_hint(self, voice: paper.Voice, view: dict[str, Any]) -> list[str]:
        """Giải thích khi lượt chép trống hoặc có câu chưa nghe được: thiếu gì và cách có."""
        if view["items"] and all(i["audio"] or i.get("done") or i.get("pending") for i in view["items"]):
            return []
        cfg = config()
        out: list[str] = []
        plants = self._plants or []
        if not plants:
            return ["Deck đang xem chưa có thẻ nào."]
        has_ex = any(p.get("has_ex") or p.get("cloze") for p in plants)
        vocab = any(p.get("kind", "vocab") == "vocab" for p in plants)
        if not has_ex and not vocab:
            return ["Deck chữ Hán / ngữ pháp này không có câu ví dụ để chép. Thêm câu ví dụ vào thẻ, hoặc dán khoá Gemini "
                    "ở tab Nguồn báo để chép câu trong báo."]
        out.append("Cần có tiếng để nghe:")
        ja = sum(1 for p in plants if (p.get("lang") or "ja") == "ja")
        en = sum(1 for p in plants if p.get("lang") == "en")
        lang = "ja" if ja * 2 >= len(plants) else ("en" if en * 2 >= len(plants) else "other")
        if lang == "other":     # 1.17: ngôn ngữ khác chỉ nghe được bằng audio của thẻ
            out.append("• Ngôn ngữ này chỉ chép được khi thẻ có audio (chọn đúng trường ở [i:gear] Cấu hình trường).")
            return out
        st = ai.load_status(AI_DIR) if os.path.isdir(AI_DIR) else {}
        if not ai.clean_key(cfg.get("gemini_key")):
            out.append("• Dán khoá Gemini (miễn phí) ở tab Nguồn báo để có giọng đọc.")
        elif _ai_opts(cfg)["dict_voice"] != "auto":
            out.append("• Bật “Giọng đọc cho câu không có audio: Tự động” ở tab Nguồn báo.")
        elif st.get("voice_fail_day") == ai_today():
            out.append("• Hôm nay Gemini chưa tạo được giọng đọc (%s). Hạn mức đặt lại lúc 15 giờ (giờ Việt Nam)."
                       % (st.get("voice_error") or "hết hạn mức"))
        if lang == "ja" and not voice.tts:
            out.append("• Hoặc cài giọng tiếng Nhật cho máy (Windows / macOS), cách cài ở tab Nguồn báo.")
        elif lang == "en" and not voice.tts_en:
            out.append("• Hoặc dùng giọng tiếng Anh của máy (Windows / macOS có sẵn).")
        out.append("• Hoặc thêm audio vào thẻ.")
        return out

    def _reissue(self, date: str) -> None:
        """Vẽ lại số báo đang mở sau khi Gemini tạo xong giọng đọc cho câu chép."""
        if getattr(self, "_open_issue", None) != date:
            return
        lang = paper_lang(self)
        src = getattr(self, "_open_src", "") or (paper_source() if lang == "ja" else "gemini")
        lib, src, _d = paper_ref(lang, date + "@" + src)
        if lib is None:
            return
        try:
            self._js("paperIssue", self._issue_view(lib, paper_states(lang, src)[1], date, _voice(), src, lang))
        except paper.PaperError:
            pass

    def _issue_view(self, lib: paper.Library, st: dict[str, Any], date: str, voice: paper.Voice, src: str,
                    lang: str) -> dict[str, Any]:
        """issue_view + mã số báo theo nguồn (Kệ báo gộp) + 1.23: tra nghĩa cho số cũ thiếu nghĩa.

        Số cũ (viết trước 1.23, theo phạm vi đã bị ghi đè) có từ gạch chân không ra nghĩa → tìm trong mọi deck (theo
        Cấu hình trường) và pham_vi.json của kotoba_daily. Số Gemini: ghi bổ sung vào chính số đó (một lần). Số
        Claude Code: chỉ bổ sung khi hiện, không ghi vào thư mục kotoba_daily."""
        extra: dict[str, list[str]] = {}
        try:
            miss = paper.missing_words(lib, date)
            if miss and mw.col:
                cfg = config()
                found = words.lookup(mw.col, cfg, lang, miss)
                if lang == "ja" and len(found) < len(miss):
                    cdir = paper.resolve_dir(cfg.get("bao_dir")) if _bao_dir_set(cfg) else None
                    if cdir and os.path.realpath(cdir) != os.path.realpath(lib.base):
                        voc = paper.Library(cdir).scope()["vocab"]
                        found.update({k: voc[k] for k in miss if k not in found and k in voc})
                gem = _is_gemini_dir(lib.base)
                if found and not (gem and paper.add_lookup(lib.base, date, found)):
                    extra = found
        except Exception as err:
            _warn("tra nghĩa số báo cũ", err)
        view = paper.issue_view(lib, st, date, voice, extra)
        ref = date + "@" + src if lang == "ja" else date
        view.update(src=src, ref=ref, src_name={"claude": "Claude Code", "gemini": "Gemini"}.get(src, ""))
        # 1.23: bản dịch (ẩn sẵn). Số Claude Code dịch bằng "Dịch số này" lưu ở user_files (kotoba_daily chỉ đọc)
        if src == "claude":
            saved = _claude_dich(date)
            for b, d in zip(view["bai"], saved):
                if d and not b.get("dich") and len(d) == len(b.get("doan") or []):
                    b["dich"] = d
        view["has_dich"] = any(b.get("dich") for b in view["bai"])
        view["can_dich"] = not view["has_dich"] and lang != "vi" and bool(ai.clean_key(config().get("gemini_key")))
        view["dich_busy"] = bool(_dich_job["running"]) and _dich_job.get("ref") == ref
        # 1.23: người đọc chấm truyện (chỉ truyện do Gemini viết — kỳ sau đọc phản hồi này)
        gem = _is_gemini_dir(lib.base)
        view["fb_ok"] = gem
        if gem:
            view["fb"] = {str(b["ky"]): story_core.feedback_of(ai.feedback_bases(AI_DIR_SHARED, lib.base, date, b["ky"])[0],
                                                               b["ky"])
                          for b in view["bai"] if b.get("loai") == "truyen" and isinstance(b.get("ky"), int)}
        return view

    def _paper_extra(self, action: str, arg: str) -> None:
        """1.23: "Dịch số này" (Gemini dịch số cũ, một lượt) và "Kỳ này hay / Nhạt" (phản hồi cho truyện)."""
        lang = paper_lang(self)
        try:
            p = json.loads(arg) if arg.startswith("{") else {"d": arg}
        except ValueError:
            return
        lib, src, date = paper_ref(lang, str(p.get("d") or ""))
        if lib is None or not paper.DATE_RE.match(date or ""):
            return
        ref = date + "@" + src if lang == "ja" else date
        if action == "fb":
            ky = p.get("k")
            gem = _is_gemini_dir(lib.base)
            # 1.25.2: số viết từ truyện chung → nhận xét ghi vào truyện chung (mọi báo cùng một kỳ; kỳ sau nhà văn đọc);
            # số cũ → thư mục của báo đó (+ truyện chung nếu kỳ ấy đã chép sang) — xem ai.feedback_bases
            if gem and isinstance(ky, int):
                done = [story_core.set_feedback(b, ky, str(p.get("y") or ""), str(p.get("g") or ""))
                        for b in ai.feedback_bases(AI_DIR_SHARED, lib.base, date, ky)]
                if any(done):
                    self._js("notice", {"msg": "Đã ghi nhận xét. Kỳ sau Gemini sẽ đọc.", "ms": 3000})
            self._reissue_ref(lang, lib, src, date)
            return
        if _dich_job["running"] or _ai["running"]:
            self._js("paperError", "Gemini đang bận, thử lại sau.")
            return
        key = ai.clean_key(config().get("gemini_key"))
        iss = lib.try_issue(date)
        if not key or not iss:
            return
        client = ai.Gemini(key, exhausted=_shared_exhausted())
        prefer = (ai.load_status(AI_DIR) if os.path.isdir(AI_DIR) else {}).get("model", "")
        _dich_job.update(running=True, ref=ref)
        base = lib.base

        def done(fut: Any) -> None:
            _dich_job.update(running=False, ref="")
            msg = ""
            try:
                dich = fut.result()
                gem = _is_gemini_dir(base)
                ok = ai.add_translation(base, date, dich) if gem else _save_claude_dich(date, dich)
                msg = "" if ok else "Bản dịch chưa dùng được, thử lại sau."
            except ai.AIError as err:
                msg = "Chưa dịch được: " + str(err)
            except Exception as err:
                _warn("dịch số báo", err)
                msg = "Chưa dịch được (%s)." % type(err).__name__
            if _dialog is self:
                if msg:
                    self._js("notice", {"msg": msg, "ms": 5000})
                if getattr(self, "_open_issue", None) == date:
                    self._reissue_ref(lang, lib, src, date)

        _bg(lambda: ai.translate_issue(client, iss, iss.get("lang", "ja"), prefer), done)
        self._reissue_ref(lang, lib, src, date)

    def _reissue_ref(self, lang: str, lib: paper.Library, src: str, date: str) -> None:
        try:
            self._js("paperIssue", self._issue_view(lib, paper_states(lang, src)[1], date, _voice(), src, lang))
        except paper.PaperError:
            pass

    def _paper_play(self, group: str, payload: dict[str, Any], lib: paper.Library | None) -> None:
        slow = bool(payload.get("s"))
        voice = _voice()
        target: tuple[str, Any, float] | None = None
        if group == "dict":
            target = paper.audio_for(str(payload.get("id")), slow, lib, _note_item, voice, _word_item)
        elif lib is not None:
            date, kind = str(payload.get("d")), payload.get("k")
            i, j = int(payload.get("i", 0)), int(payload.get("j", 0))
            iss = lib.try_issue(date)
            en = bool(iss and iss["lang"] == "en")
            if kind == "bai":
                au = lib.audio(date)
                rel = au["bai"][i][j] if i < len(au["bai"]) and j < len(au["bai"][i]) else None
                path = lib.audio_path(date, rel)
                if path:
                    target = ("file", path, 1.0)
                elif (voice.tts_en if en else voice.tts) and iss and i < len(iss["bai"]) and j < len(iss["bai"][i]["doan"]):
                    # 1.13: giọng của máy (1.19: báo tiếng Anh → giọng tiếng Anh)
                    target = ("tts_en" if en else "tts", paper.speech_text(iss["bai"][i]["doan"][j]), 1.0)
            elif kind == "ct" and iss and i < len(iss["chinh_ta"]):
                cv = paper.ct_voice(lib, date, i, iss["chinh_ta"][i]["cau"], voice, iss["lang"])
                if cv["audio"]:
                    target = paper.play_target(cv["how"], cv.get("data"), slow, lib, date, cv)
        av_player.stop_and_clear_queue()
        if target is None:
            self._js("paperError", "Câu này chưa có audio.")
            return
        _play(target)

    # -- nhà & cửa hàng ------------------------------------------------------

    def _on_home(self, cmd: str) -> None:
        parts = cmd.split(":")
        two = {  # lệnh dạng nhóm:việc:id
            ("style", "buy"): STATE.buy_style, ("style", "use"): STATE.use_style,
            ("wear", "buy"): STATE.buy_wear, ("wear", "on"): STATE.put_on, ("wear", "off"): STATE.take_off,
            ("face", "buy"): STATE.buy_face, ("face", "toggle"): STATE.toggle_face,
            ("craft", "copy"): STATE.craft_copy, ("craft", "del"): STATE.craft_delete,
            ("myseed", "del"): STATE.myseed_delete,
            ("nha", "open"): STATE.open_room,       # 1.24: mở rộng nhà kèm id gian (1.25: vẫn mở cả hai gian)
        }
        regrow = False   # đổi giống cây → dựng lại ruộng
        try:
            if parts[0] == "pet" and len(parts) >= 3 and parts[1] == "name":
                payload = json.loads(cmd.split(":", 2)[2])
                data = STATE.pet_name(str(payload.get("id")), payload.get("name"))
            elif parts[0] == "seed" and len(parts) >= 3 and parts[1] == "rule":
                payload = json.loads(cmd.split(":", 2)[2])
                data = STATE.seed_rule(str(payload.get("where")), payload.get("key"), payload.get("value"))
                regrow = True
            elif parts[0] == "seed" and len(parts) == 3 and parts[1] == "buy":
                data = STATE.seed_buy(parts[2])
            elif parts[0] == "repair" and len(parts) == 2 and parts[1] in ("all", "one"):
                data = STATE.repair(None if parts[1] == "all" else 1)
            elif parts[0] == "pet" and len(parts) == 3 and parts[1] == "buy":
                data = STATE.pet_buy(parts[2])
            elif parts[0] == "pet" and len(parts) == 3 and parts[1] == "feed":
                data = STATE.pet_feed(None if parts[2] == "all" else parts[2])
            elif parts[0] == "pet" and len(parts) == 3 and parts[1] == "auto":
                data = STATE.pet_auto(parts[2] == "1")
            elif parts[0] == "pet" and len(parts) == 4 and parts[1] == "move":
                data = STATE.pet_move(parts[2], parts[3])
            elif parts[0] == "uzone" and len(parts) == 3 and parts[1] == "del":
                data = STATE.zone_delete(parts[2])
            elif parts == ["nha", "open"]:          # 1.25: mở rộng nhà một lần (cả Bếp lẫn Phòng ngủ)
                data = STATE.open_rooms()
            elif parts[0] == "decor" and len(parts) == 3 and parts[1] == "buy":      # 1.30: giấy dán tường / sàn
                data = STATE.decor_buy(parts[2])
            elif parts[0] == "decor" and len(parts) == 5 and parts[1] == "use":
                data = STATE.decor_use(parts[2], parts[3], parts[4])
            elif parts[0] == "tile" and len(parts) == 3 and parts[1] == "del":
                data = STATE.tile_delete(parts[2])
            elif len(parts) == 3 and (parts[0], parts[1]) in two:
                data = two[(parts[0], parts[1])](parts[2])
                regrow = parts[0] == "myseed"      # 1.22: xoá giống tự vẽ → cây mang giống đó về cây gốc
            elif parts[0] == "zone" and len(parts) == 2:
                data = STATE.unlock_zone(parts[1])
            elif parts[0] == "theme" and len(parts) == 3 and parts[1] in ("buy", "streak"):
                stats = {"streak": 0, "day": 0}
                if parts[1] == "streak":   # chuỗi ngày tính lại từ lịch sử ôn, không tin số từ giao diện
                    stats = _daily_stats()
                data = STATE.unlock_theme(parts[2], "coins" if parts[1] == "buy" else "streak",
                                          stats["streak"], stats["day"])
            elif parts[0] == "theme" and len(parts) == 3 and parts[1] == "use":
                data = STATE.set_theme("pick", parts[2])
            elif parts[0] == "theme" and len(parts) == 2 and parts[1] in ("auto", "off"):
                data = STATE.set_theme(parts[1])
            elif parts[0] == "buy" and len(parts) == 2:
                data = STATE.buy(parts[1])
            elif parts[0] == "build" and len(parts) in (1, 2):
                # 1.22.5: "build:<bước>" — chỉ xây đúng bước người dùng bấm (lệnh lặp do bấm đúp không xây thêm bước sau)
                data = STATE.build(int(parts[1]) if len(parts) == 2 else None)
            elif parts[0] == "place" and len(parts) == 5:
                data = STATE.place(parts[1], parts[2], int(parts[3]), int(parts[4]))
            elif parts[0] == "move" and len(parts) == 5:
                data = STATE.move(parts[1], int(parts[2]), int(parts[3]), int(parts[4]))
            elif parts[0] == "take" and len(parts) == 3:
                data = STATE.take(parts[1], int(parts[2]))
            else:
                return
        except core.HomeError as err:
            self._js("homeError", str(err))
            return
        except (ValueError, OSError) as err:
            _warn("home", err)
            return
        out: dict[str, Any] = {"wallet": data, "action": parts[0],
                               "sub": parts[1] if len(parts) > 2 or parts[0] in ("theme", "repair") else ""}
        if parts[0] in ("craft", "myseed", "tile"):
            out["catalog"] = core.home_catalog(data, STATE.load_px())
        if regrow:
            self.refresh()
        self._js("home", out)

    # -- 1.28: chỗ lấp lánh (nhặt đồ), gánh hàng rong ----------------------------------

    def _on_find(self, cmd: str) -> None:
        """find:pick:<k>:<cảnh> — nhặt chỗ lấp lánh thứ k · ped:buy:<ô> — mua ở gánh hàng rong.
        Python xét lại mọi thứ (lượt ôn hôm nay, chỗ đã nhặt, phiên hôm nay, giá, xu) rồi mới ghi."""
        parts = cmd.split(":")
        today = cal_today()
        out: dict[str, Any] = {"ok": False}
        try:
            stats = _daily_stats()
            reviews = int(stats.get("reviews") or 0)
            wallet = STATE.load()
            zones = list((wallet.get("home") or {}).get("zones") or [])
            ev = EVENTS.load()
            if parts[:2] == ["find", "pick"] and len(parts) == 4 and parts[2].isdigit():
                res = finds.pick(ev, int(parts[2]), parts[3], reviews, zones, today)
                gift = res["reward"] if res["set_done"] else None
                if gift and gift not in core.FIND_ITEMS:
                    raise finds.FindError("Quà của bộ này chưa có trong danh mục.")
                EVENTS.save(ev)                       # ghi "đã nhặt" trước: lỗi ở bước sau không cho nhặt lại hai lần
                wallet = STATE.find_reward(res["coins"], gift)
                box = finds.box_view(ev, zones, today, {k: v["name"] for k, v in core.FIND_ITEMS.items()})
                st = next(x for x in box["sets"] if x["scene"] == parts[3])
                out = {"ok": True, "act": "pick", "k": int(parts[2]), "scene": parts[3],
                       "item": finds.item_view(res["id"], ev, today), "new": res["new"], "coins": res["coins"],
                       "set": {"name": st["name"], "n": st["n"], "total": st["total"], "done": res["set_done"],
                               "reward": gift or "", "reward_name": core.CATALOG[gift]["name"] if gift else ""}}
            elif parts[:2] == ["ped", "buy"] and len(parts) in (3, 4):
                if len(parts) == 4 and parts[3] != today.isoformat():
                    # bảng mở từ hôm qua (qua giờ đổi ngày của Anki): hàng của phiên đó không còn
                    raise finds.FindError("Phiên đó đã qua — mở lại bảng gánh hàng nhé.")
                if not finds.is_market(today):
                    raise finds.FindError("Hôm nay gánh hàng không ghé — phiên sau: " +
                                          event_core.short_date(finds.next_market(today), today) + ".")
                goods = {g["slot"]: g for g in _ped_goods(wallet, ev, today)}
                g = goods.get(parts[2])
                if g is None:
                    raise finds.FindError("Phiên này không có món đó.")
                if g["bought"]:
                    raise finds.FindError("Món này phiên này đã mua rồi.")
                if g["kind"] == "seed":
                    wallet = STATE.seed_buy_at(g["id"], g["now"])
                else:
                    wallet = STATE.buy_at(g["id"], g["now"])
                ds = today.isoformat()
                ev["ped"][ds] = sorted(set(ev["ped"].get(ds) or []) | {g["slot"]})
                finds.trim(ev, today)
                EVENTS.save(ev)
                out = {"ok": True, "act": "buy", "slot": g["slot"], "id": g["id"], "kind": g["kind"], "name": g["name"],
                       "paid": g["now"], "scene": g.get("scene", ""), "place": g.get("place", "")}
            else:
                return
        except (finds.FindError, core.HomeError) as err:
            out = {"ok": False, "msg": str(err)}
            wallet = None
        except Exception as err:
            _warn("nhặt đồ / gánh hàng", err)
            out = {"ok": False, "msg": "Không làm được (%s)." % type(err).__name__}
            wallet = None
        if wallet is not None:
            out["wallet"] = wallet
            try:
                out["finds"] = finds_view(wallet, reviews, save=False)
            except Exception as err:
                _warn("nhặt đồ / gánh hàng", err)
        self._js("finds", out)

    # -- 1.21: khách ghé vườn ------------------------------------------------------

    def _on_guest(self, cmd: str) -> None:
        """guest:met:<id>:<cảnh> — JS vừa cho người dùng thấy khách này (cửa sổ đang hiện). Python xét lại khách có được
        ghé cảnh đó không (đồ đã đặt, vùng, tháng) rồi mới ghi album; mỗi khách ghi một lần mỗi ngày."""
        parts = cmd.split(":")
        if len(parts) != 3 or parts[0] != "met" or parts[1] not in guests.GUESTS:
            return
        gid, scene = parts[1], parts[2]
        try:
            wallet = STATE.load()
            today = cal_today()
            if scene not in _guest_scenes(wallet) or guests.weight(gid, scene, wallet.get("home") or {}, today) <= 0:
                return
            _album, new, wrote = GUESTS.met(gid, scene, today)
            if not wrote:
                return
            view = guest_view(wallet, getattr(self, "_plants", None))
        except Exception as err:
            _warn("khách ghé vườn", err)
            return
        view["new"] = gid if new else ""
        self._js("guests", view)

    # -- 1.30: sinh hoạt của StackChan ---------------------------------------------------

    def _on_life(self, cmd: str) -> None:
        """life:seen:<việc>:<cảnh> — JS vừa cho người dùng thấy StackChan làm việc này (≥ 1,5 giây trên cảnh đang xem).
        Python xét lại việc đó có làm được ở cảnh đó không (đồ đã đặt, gian / vùng đã mở, tháng) rồi mới ghi sổ; mỗi việc
        ghi một lần mỗi ngày."""
        parts = cmd.split(":")
        if len(parts) != 3 or parts[0] != "seen" or parts[1] not in life_core.ACTS:
            return
        aid, scene = parts[1], parts[2]
        try:
            wallet = STATE.load()
            today = cal_today()
            home, scenes, pets_home = _life_ctx(wallet)
            if not life_core.can_do(aid, scene, home, scenes, today, pets_home):
                return
            _seen, new, wrote = LIFE.mark(aid, scene, today)
            if not wrote:
                return
            view = life_view(wallet)
        except Exception as err:
            _warn("sinh hoạt", err)
            return
        view["new"] = aid if new else ""
        self._js("life", view)

    # -- 1.22: mã chia sẻ thiết kế --------------------------------------------------

    def _on_share(self, cmd: str) -> None:
        """share:code:<id> (xuất mã, chép vào bộ nhớ tạm) · share:peek:<mã> (xem trước) · share:make:<mã> (làm, trả xu)."""
        what, _, arg = cmd.partition(":")
        try:
            if what == "code":
                code, name = STATE.share_code(arg)
                try:
                    from aqt import qt as _qt
                    _qt.QApplication.clipboard().setText(code)
                    copied = True
                except Exception:
                    copied = False
                self._js("shareCode", {"id": arg, "name": name, "code": code, "copied": copied})
            elif what == "peek":
                self._js("sharePeek", STATE.share_peek(arg))
            elif what == "make":
                data = STATE.share_make(arg)
                if data.get("share_t") == "g":
                    self.refresh()
                self._js("home", {"wallet": data, "action": "share", "sub": data.get("share_t"),
                                  "id": data.get("craft_id") or data.get("zone_id") or data.get("myseed_id"),
                                  "catalog": core.home_catalog(data, STATE.load_px())})
        except core.HomeError as err:
            if what == "peek":
                self._js("sharePeek", {"error": str(err)})
            else:
                self._js("homeError", str(err))
        except (ValueError, OSError) as err:
            _warn("mã chia sẻ", err)
            self._js("homeError", "Không đọc được mã này.")

    # -- 1.22: chụp ảnh vườn ------------------------------------------------------

    # -- 1.25.5: admin sửa hình gốc -------------------------------------------

    def _on_base(self, cmd: str) -> None:
        action, _, arg = cmd.partition(":")
        if action == "suggest":          # 1.25.7: ai cũng góp ý được — chỉ ghi ra file, không đổi hình trong vườn
            self._suggest_fix(arg)
            return
        if not admin_on():
            return
        try:
            if action == "save":
                p = json.loads(arg)
                store = mau.set_fix(mau.read(MAU_LOCAL), p.get("key"), p.get("frames"))
                mau.write(MAU_LOCAL, store)
                self._js("fixes", {"fixes": fixes_merged()["sua"], "saved": p.get("key")})
            elif action == "reset":
                mau.write(MAU_LOCAL, mau.remove(mau.read(MAU_LOCAL), arg))
                merged = fixes_merged()["sua"]
                self._js("fixes", {"fixes": merged, "reset": arg})
                if arg in merged:
                    self._js("toast", "Hình này còn bản sửa đi kèm gói.")
            elif action == "export":
                data = fixes_merged()
                if not data["sua"]:
                    self._js("toast", "Chưa có hình nào được sửa.")
                    return
                from aqt.utils import getSaveFile
                path = os.environ.get("KB_TEST_FIX_OUT") or getSaveFile(self, "Xuất bản sửa hình", "kotoba_batake_mau", "JSON",
                                                                         ".json", "mau_sua.json")
                if path:
                    mau.write(path, data)
                    self._js("toast", "Đã xuất %d hình: %s" % (len(data["sua"]), os.path.basename(path)))
            elif action == "import":
                path = os.environ.get("KB_TEST_FIX_IN")
                if path:
                    self._import_fixes(path)
                else:
                    getFile(self, "Nhập bản sửa hình", self._import_fixes, filter="Bản sửa hình (*.json)", key="kotoba_batake_mau")
        except (ValueError, mau.MauError) as err:
            self._js("toast", str(err) if isinstance(err, mau.MauError) else "Không lưu được hình này.")
        except OSError as err:
            showWarning(f"Không ghi được file bản sửa hình:\n{err}", parent=self)

    def _suggest_fix(self, arg: str) -> None:
        try:
            p = json.loads(arg)
            data = mau.set_fix({}, p.get("key"), p.get("frames"))
        except (ValueError, AttributeError, mau.MauError) as err:
            self._js("toast", str(err) if isinstance(err, mau.MauError) else "Không lưu được góp ý này.")
            self._js("baseSuggested", {"ok": False})
            return
        key = next(iter(data["sua"]))
        name = "gop_y_" + re.sub(r"[^A-Za-z0-9_]", "_", key) + ".json"
        from aqt.utils import getSaveFile
        path = os.environ.get("KB_TEST_FIX_OUT") or getSaveFile(self, "Lưu file góp ý hình", "kotoba_batake_mau", "JSON", ".json", name)
        if not path:
            self._js("baseSuggested", {"ok": False})
            return
        try:
            mau.write(path, data)
        except OSError as err:
            showWarning(f"Không ghi được file:\n{err}", parent=self)
            self._js("baseSuggested", {"ok": False})
            return
        self._js("baseSuggested", {"ok": True, "file": os.path.basename(path)})

    def _import_fixes(self, path: Any) -> None:
        if isinstance(path, (list, tuple)):
            path = path[0] if path else ""
        if not path:
            return
        try:
            with open(path, encoding="utf-8") as f:
                data = mau.parse_upload(f.read(mau.MAX_FILE + 1))
            mau.write(MAU_LOCAL, mau.merge(mau.read(MAU_LOCAL), data))
        except mau.MauError as err:
            self._js("toast", str(err))
            return
        except OSError as err:
            showWarning(f"Không đọc được file:\n{err}", parent=self)
            return
        self._js("fixes", {"fixes": fixes_merged()["sua"]})
        self._js("toast", "Đã nhập %d hình." % len(data["sua"]))

    def _save_photo(self, raw: str) -> None:
        """snap:save:{name, url} — JS đã vẽ ảnh (PNG data URL); hỏi chỗ lưu rồi ghi file."""
        import base64
        try:
            payload = json.loads(raw)
            url = str(payload.get("url") or "")
            prefix = "data:image/png;base64,"
            if not url.startswith(prefix) or len(url) > 24 * 1024 * 1024:
                raise ValueError("ảnh không hợp lệ")
            png = base64.b64decode(url[len(prefix):], validate=True)
            if not png.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("không phải PNG")
            name = re.sub(r"[^A-Za-z0-9_.-]", "_", str(payload.get("name") or "kotoba_batake.png"))[:80]
            if not name.lower().endswith(".png"):
                name += ".png"
        except (ValueError, TypeError) as err:      # binascii.Error là con của ValueError
            _warn("chụp ảnh vườn", err)
            self._js("toast", "Không chụp được ảnh này.")
            return
        from aqt.utils import getSaveFile
        path = os.environ.get("KB_TEST_PHOTO") or getSaveFile(self, "Lưu ảnh vườn", "kotoba_batake_photo", "Ảnh PNG", ".png", name)
        if not path:
            return
        try:
            with open(path, "wb") as f:
                f.write(png)
        except OSError as err:
            showWarning(f"Không lưu được ảnh:\n{err}", parent=self)
            return
        self._js("toast", "[i:camera] Đã lưu ảnh vườn: " + os.path.basename(path))

    # -- 1.14: giao diện tự chỉnh -------------------------------------------------

    # -- 1.20: Lịch hoa, nhật ký, luyện viết, cuốn nhật ký ---------------------

    def _on_cal(self, cmd: str) -> None:
        if not mw.col:
            return
        name, _, arg = cmd.partition(":")
        if name == "month":
            self._js("calView", cal_month(arg))
        elif name == "year":
            self._js("calView", cal_year(arg))
        elif name == "day":
            self._js("calView", dict(cal_day(arg), kind="day"))
        elif name == "book":
            self._js("calView", cal_book(arg))
        elif name == "freeze":          # 1.25.9: mua vé giữ chuỗi
            try:
                STATE.freeze_buy(cal_today())
                self._js("toast", "[i:snow] Đã mua 1 vé giữ chuỗi · −%d xu" % more_core.FREEZE_PRICE)
                sfx_ok = True
            except core.HomeError as err:
                self._js("toast", str(err))
                sfx_ok = False
            v = cal_month(arg)
            v["bought"] = sfx_ok
            self._js("calView", v)
        elif name in ("mood", "note", "draft"):
            try:
                p = json.loads(arg or "{}")
            except ValueError:
                return
            if isinstance(p, dict):
                self._cal_keep.pop(self._keep_key(name, p), None)
                self._js("calSaved", self._cal_save(name, p))
        elif name == "keep":            # 1.23 (KB-01): chữ đang gõ, chưa tới lần tự lưu
            try:
                p = json.loads(arg or "{}")
            except ValueError:
                return
            if isinstance(p, dict) and p.get("k") in ("note", "draft") and isinstance(p.get("t"), str):
                self._cal_keep[self._keep_key(p["k"], p)] = (p["k"], {k: p.get(k) for k in ("d", "lang", "t")})
        elif name == "lang":
            if arg in journal.WRITE_LANGS:
                save_config(journal_lang=arg)
                today = cal_today()
                w = JOURNAL.entry(today).get("w") or {}
                if w.get("st", "") == "" and w.get("lang") != arg:
                    cfg = config()
                    w2 = dict(w, lang=arg, goi_y=_hints(today.isoformat(), arg, int(w.get("gr") or 0), cfg))
                    goc, _cut = journal.clip_units(w2.get("goc", ""), arg, journal.WRITE_MAX[arg])
                    w2["goc"] = goc
                    JOURNAL.update(today, {"w": w2})
                self._js("calView", dict(cal_day(today.isoformat()), kind="day"))
        elif name == "hint":
            today = cal_today()
            w = JOURNAL.entry(today).get("w") or {}
            if w.get("st", "") == "":
                cfg = config()
                lang = w.get("lang") if w.get("goc") and w.get("lang") in journal.WRITE_LANGS else _write_lang(cfg)
                gr = int(w.get("gr") or 0) + 1
                JOURNAL.update(today, {"w": dict(w, lang=lang, gr=gr, goi_y=_hints(today.isoformat(), lang, gr, cfg))})
            self._js("calView", dict(cal_day(today.isoformat()), kind="day"))
        elif name == "fix":
            err = fix_start(arg)
            v = dict(cal_day(arg), kind="day")
            if err:
                v["flash"] = err
            self._js("calView", v)
        elif name == "seen":
            d = journal.parse_date(arg)
            w = (JOURNAL.entry(d).get("w") or {}) if d else {}
            if d and w.get("st") == "done" and not w.get("seen"):
                JOURNAL.update(d, {"w": dict(w, seen=True)})
                _push_journal()
        elif name == "pdf":
            try:
                p = json.loads(arg or "{}")
            except ValueError:
                return
            if isinstance(p, dict) and isinstance(p.get("html"), str):
                export_pdf(self, p["html"], str(p.get("name") or ""))
        elif name == "photo":
            today = cal_today()
            folder = _photo_dir()
            if journal.photo_due(folder, today):
                try:
                    journal.save_photo(folder, today, arg)
                except (journal.JournalError, ValueError, OSError) as err:
                    _warn("ảnh vườn", err)
                _push_journal()

    @staticmethod
    def _keep_key(name: str, p: dict[str, Any]) -> str:
        return "%s:%s:%s" % (name, p.get("d"), p.get("lang") if name == "draft" else "")

    def flush_unsaved(self) -> int:
        """1.23 (KB-01): lưu nốt chữ nhật ký / bản nháp luyện viết đang gõ dở (cửa sổ đóng trước lần tự lưu).
        Gọi khi đóng cửa sổ và khi đóng hồ sơ (collection còn mở). Trả về số mục đã lưu."""
        n = 0
        items = list(getattr(self, "_cal_keep", {}).values())
        self._cal_keep = {}
        if not mw.col:
            return 0
        for name, p in items[:20]:
            try:
                r = self._cal_save(name, p)
                n += 1 if r.get("ok") else 0
            except Exception as err:
                _warn("lưu nhật ký khi đóng vườn", err)
        return n

    def _cal_save(self, name: str, p: dict[str, Any]) -> dict[str, Any]:
        """Lưu sticker / nhật ký / bản nháp luyện viết (lưu ngay khi rời ô). Trả về phần cần vẽ lại."""
        today = cal_today()
        d = journal.parse_date(p.get("d"))
        if d is None or d > today:
            return {"ok": False, "msg": "Không ghi được cho ngày này."}
        out: dict[str, Any] = {"ok": True, "d": d.isoformat(), "kind": name}
        if name == "mood":
            m = p.get("m") if p.get("m") in journal.STICKERS else ""
            e = JOURNAL.update(d, {"m": m})
        elif name == "note":
            t = journal.clean_line(p.get("t"), journal.DIARY_MAX)
            e = JOURNAL.update(d, {"t": t})
            out["t"] = t
        else:
            if d != today:
                return {"ok": False, "msg": "Luyện viết chỉ cho hôm nay."}
            cur = JOURNAL.entry(d).get("w") or {}
            if cur.get("st", "") != "":
                return {"ok": False, "msg": "Bài đã gửi cho Gemini, tạm khoá."}
            cfg = config()
            lang = p.get("lang") if p.get("lang") in write_langs(cfg) else _write_lang(cfg)
            raw = journal.clean_line(p.get("t"), 2000)
            goc, cut = journal.clip_units(raw, lang, journal.WRITE_MAX[lang])
            w2 = dict(cur, lang=lang, goc=goc, st="")
            w2.pop("err", None)
            if not w2.get("goi_y") or cur.get("lang") != lang:
                w2["goi_y"] = _hints(d.isoformat(), lang, int(cur.get("gr") or 0), cfg)
            e = JOURNAL.update(d, {"w": w2})
            out.update(goc=goc, cut=cut, count=journal.count_units(goc, lang), max=journal.WRITE_MAX[lang],
                       used=journal.used_hints(goc, w2["goi_y"], lang), hints=w2["goi_y"])
        w = e.get("w") or {}
        out.update(mood=e.get("m", ""), note=bool(e.get("t") or w.get("goc")))
        if d == today:
            _push_journal()
        return out

    def _on_ui(self, cmd: str) -> None:
        action, _, arg = cmd.partition(":")
        try:
            if action == "set":
                ui = more_core.clean_ui(json.loads(arg))
            elif action == "preset":
                ui = more_core.ui_preset(arg, config().get("ui"))     # 1.25: giữ nhóm Màn chính
            else:
                return
        except (ValueError, more_core.MoreError) as err:
            _warn("giao diện", err)
            return
        save_config(ui=ui)
        self._js("uiSaved", ui)

    # -- cấu hình trường theo loại note (1.9) -----------------------------------

    def _on_fields(self, cmd: str) -> None:
        action, _, arg = cmd.partition(":")
        try:
            if action == "open":
                self._js("fieldsData", core.fields_panel(mw.col, self.deck_id, config()))
            elif action == "save":
                payload = json.loads(arg)
                mid = str(payload.get("mid", ""))
                model = mw.col.models.get(int(mid)) if mid.lstrip("-").isdigit() else None
                if not model:
                    self._js("fieldsError", "Không tìm thấy loại note này (có thể vừa bị xoá).")
                    return
                lang = payload.get("lang") or "ja"
                conf, err = fields_core.validate_save(
                    {"kind": payload.get("kind"), "f": payload.get("f"), "name": model["name"]},
                    [f["name"] for f in model["flds"]], lang)
                if conf is None:
                    self._js("fieldsError", err)
                    return
                FIELDS.set_model(mid, conf, lang)
                self.refresh()
                self._js("fieldsSaved", {"mid": mid, "panel": core.fields_panel(mw.col, self.deck_id, config())})
            elif action == "game":
                game, group, mode = arg.split(":")
                store = FIELDS.set_game(game, group, mode)
                self._js("gameModes", {"games": store["games"], "lang": store["games_lang"]})
        except (ValueError, TypeError, AttributeError) as err:
            _warn("fields", err)
            self._js("fieldsError", "Không lưu được cấu hình.")

    # -- xưởng chế tác ---------------------------------------------------------

    def _on_craft(self, cmd: str) -> None:
        if cmd == "pick":
            getFile(self, "Chọn ảnh để chuyển thành pixel art", self._craft_image,
                    filter="Ảnh (*.png *.jpg *.jpeg *.gif *.webp *.bmp)", key="kotoba_batake_image")
            return
        if cmd.startswith("zone:"):   # 1.14: vùng tự tạo (công trình 64×76 vẽ bằng Xưởng)
            try:
                data = STATE.zone_save(json.loads(cmd[len("zone:"):]))
            except core.HomeError as err:
                self._js("homeError", str(err))
                return
            except (ValueError, OSError) as err:
                _warn("vùng tự tạo", err)
                self._js("homeError", "Không lưu được vùng này.")
                return
            self._js("home", {"wallet": data, "action": "uzone", "sub": "save", "id": data.get("zone_id")})
            return
        if cmd.startswith("seed:"):   # 1.22: giống cây tự vẽ (5 giai đoạn 16×16)
            try:
                data = STATE.myseed_save(json.loads(cmd[len("seed:"):]))
            except core.HomeError as err:
                self._js("homeError", str(err))
                return
            except (ValueError, OSError) as err:
                _warn("giống cây tự vẽ", err)
                self._js("homeError", "Không lưu được giống cây này.")
                return
            self.refresh()           # cây mang giống này đổi hình ngay
            self._js("home", {"wallet": data, "action": "myseed", "sub": "save", "id": data.get("myseed_id"),
                              "catalog": core.home_catalog(data, STATE.load_px())})
            return
        if cmd.startswith("tile:"):   # 1.30: mẫu giấy dán tường / sàn tự vẽ (một ô 16×16 lặp lại)
            try:
                data = STATE.tile_save(json.loads(cmd[len("tile:"):]))
            except core.HomeError as err:
                self._js("homeError", str(err))
                return
            except (ValueError, OSError) as err:
                _warn("mẫu tường / sàn", err)
                self._js("homeError", "Không lưu được mẫu này.")
                return
            self._js("home", {"wallet": data, "action": "tile", "sub": "save", "id": data.get("tile_id"),
                              "catalog": core.home_catalog(data, STATE.load_px())})
            return
        if not cmd.startswith("save:"):
            return
        try:
            payload = json.loads(cmd[len("save:"):])
            data = STATE.craft_save(payload)
        except core.HomeError as err:
            self._js("homeError", str(err))
            return
        except (ValueError, OSError) as err:
            _warn("craft", err)
            self._js("homeError", "Không lưu được món đồ.")
            return
        self._js("home", {"wallet": data, "action": "craft", "sub": "save", "id": data.get("craft_id"),
                          "catalog": core.home_catalog(data, STATE.load_px())})

    def _craft_image(self, path: Any) -> None:
        import base64
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
                ".webp": "image/webp", ".bmp": "image/bmp"}
        try:
            path = str(path)
            kind = mime.get(os.path.splitext(path)[1].lower())
            if not kind:
                raise ValueError("Chỉ nhận ảnh PNG, JPG, GIF, WEBP hoặc BMP.")
            if os.path.getsize(path) > 12 * 1024 * 1024:
                raise ValueError("Ảnh lớn quá (tối đa 12 MB).")
            with open(path, "rb") as f:
                raw = f.read()
        except (OSError, ValueError) as err:
            self._js("homeError", str(err) if isinstance(err, ValueError) else "Không mở được ảnh này.")
            return
        url = f"data:{kind};base64," + base64.b64encode(raw).decode("ascii")
        self._js("craftImage", {"url": url, "name": os.path.basename(path)})

    def closeEvent(self, event: Any) -> None:
        global _dialog
        self.flush_unsaved()            # 1.23 (KB-01): chữ vừa gõ trong Lịch hoa không mất khi bấm X ngay
        _dialog = None
        try:
            if not self.isFullScreen():
                saveGeom(self, GEOM_KEY)
        except Exception as err:
            _warn("saveGeom", err)
        self._stop_review()
        self.web.cleanup()
        super().closeEvent(event)


_dialog: GardenDialog | None = None


def open_garden() -> None:
    global _dialog
    if not mw.col:
        return
    if _dialog is None:
        _dialog = GardenDialog()
        if config().get("open_maximized", True):
            _dialog.showMaximized()     # mở là to hết màn hình
        else:
            _dialog.show()              # mở đúng kích thước lần trước
    else:
        if _dialog.isMinimized():
            _dialog.setWindowState(_dialog.windowState() & ~Qt.WindowState.WindowMinimized)
        _dialog.show()
    _dialog.raise_()
    _dialog.activateWindow()


# ---------------------------------------------------------------------------
# Khi ôn ở màn ôn bình thường của Anki: vẫn tưới cây và cộng xu
# ---------------------------------------------------------------------------

_pre_stage: dict[int, int | None] = {}
_pre_kind: dict[int, str] = {}


def _card_will_show(text: str, card: Any, kind: str) -> str:
    """Cho các add-on khác (furigana, v.v.) chỉnh nội dung thẻ như ở màn ôn."""
    try:
        return gui_hooks.card_will_show(text, card, kind)
    except Exception as err:
        _warn("card_will_show", err)
        return text


def _will_answer(ease_tuple: tuple[bool, int], reviewer: Any, card: Any) -> tuple[bool, int]:
    try:
        _pre_stage[card.id] = _stage(card.nid, _deck_name())
        _pre_kind[card.id] = "new" if card.queue == 0 else "review" if card.queue == 2 else "learn"
        if ease_tuple and ease_tuple[0]:
            answer_started(card.id)      # 1.22.6: vườn làm mới lúc lượt này đang lưu thì không bù xu nhầm
    except Exception as err:  # không bao giờ chặn việc ôn
        _warn("will_answer", err)
    return ease_tuple


def _did_answer(reviewer: Any, card: Any, ease: int) -> None:
    try:
        try:
            info = _record_answer(card.nid, _pre_stage.pop(card.id, None), ease, _deck_name(),
                                  _pre_kind.pop(card.id, None), card.id)
        finally:
            answer_finished(card.id)
        if info["message"] and config()["show_tooltips"]:
            tooltip(info["message"], period=2500)
        if info.get("goal_bonus"):
            tooltip(f"ことば畑: xong mục tiêu hôm nay! +{info['goal_bonus']} xu", period=3000)
        q = info.get("quests") or {}
        for text in q.get("done") or []:
            tooltip(f"ことば畑: xong nhiệm vụ “{text}” +{core.QUEST_REWARD} xu", period=3000)
        if q.get("chest"):
            tooltip(f"ことば畑: mở rương nhiệm vụ! {q['chest'].get('name') or ''} +{q['chest']['coins']} xu", period=3500)
        if _dialog is not None:
            _dialog.refresh()
            _dialog._js("celebrate", info)
    except Exception as err:
        _warn("did_answer", err)


# ---------------------------------------------------------------------------
# Báo lỗi (1.11): thông tin chẩn đoán + nhật ký lỗi, để người dùng chép / lưu rồi gửi
# ---------------------------------------------------------------------------

_report_dialog: Any = None


def report_info(client: Any = None) -> dict[str, Any]:
    """Các dòng `nhãn: giá trị` của báo cáo. Mỗi mục đọc riêng: một mục hỏng không làm mất cả báo cáo."""
    rows: list[tuple[str, Any]] = []
    man = _manifest()
    rows.append(("Add-on", f"ことば畑 {VERSION} (mod {man.get('mod', '?')})"))
    try:
        from anki.utils import version_with_build
        anki_v = version_with_build()
    except Exception:
        anki_v = "?"
    try:
        from aqt import qt as _qt
        qt_v = _qt.qVersion() if hasattr(_qt, "qVersion") else "?"
        pyqt_v = getattr(_qt, "PYQT_VERSION_STR", "?")
    except Exception:
        qt_v = pyqt_v = "?"
    rows.append(("Anki", f"{anki_v} · Python {platform.python_version()} · Qt {qt_v} · PyQt {pyqt_v}"))
    os_name = platform.platform()
    if sys.platform.startswith("linux"):
        os_name = " · ".join(x for x in (diag.os_release(), os_name, os.environ.get("XDG_SESSION_TYPE", ""),
                                          os.environ.get("XDG_CURRENT_DESKTOP", "")) if x)
    rows.append(("Hệ điều hành", os_name))
    c = diag.clean_client(client)
    if c:
        if c.get("w"):
            rows.append(("Cửa sổ vườn", f"{c.get('w')}×{c.get('h')} px · màn hình {c.get('sw', '?')}×{c.get('sh', '?')}"
                                        f" · tỉ lệ {c.get('dpr', '?')}"))
        rows.append(("Trình duyệt nhúng", c.get("engine")))
        rows.append(("Đang mở", " · ".join(str(c[k]) for k in ("panel", "scene") if c.get(k))))
    cfg: dict[str, Any] = {}
    try:
        cfg = config()
        rows.append(("Cấu hình khác mặc định", diag.config_diff(cfg, core.DEFAULT_CONFIG) or "không"))
    except Exception as err:
        rows.append(("Cấu hình", f"không đọc được ({type(err).__name__})"))
    try:
        src = paper_source(cfg)
        if src == "gemini":
            st = ai.load_status(AI_DIR)
            rows.append(("Báo", f"Gemini · model {st.get('model') or '?'} · {_ai_opts(cfg)['level']} · giọng "
                                f"{_ai_opts(cfg)['audio']} · lỗi hôm nay: {st.get('error') or 'không'}"))
        else:
            rows.append(("Báo", {"claude": "Claude Code (kotoba_daily)", "": "chưa nối"}.get(src, src)))
        # 1.23: nguồn đã xác nhận, báo đang chờ "Bắt đầu viết", chế độ truyện
        o = _ai_opts(cfg)
        rows.append(("Báo · xác nhận", "nguồn đã xác nhận %s · chờ Bắt đầu viết: %s · truyện %s / giọng %s" % (
            json.dumps(confirmed_sources(cfg), ensure_ascii=False), ", ".join(ai_waiting(cfg)) or "không",
            o["story"], o["tone"])))
        if os.path.isdir(AI_DIR_EN):        # 1.19: báo tiếng Anh
            st = ai.load_status(AI_DIR_EN)
            rows.append(("Báo tiếng Anh", f"Gemini · model {st.get('model') or '?'} · {_ai_opts(cfg)['level_en']} · "
                                          f"lỗi hôm nay: {st.get('error') or 'không'}"))
        if os.path.isdir(AI_DIR_VI):        # 1.25.1: báo tiếng Việt
            st = ai.load_status(AI_DIR_VI)
            rows.append(("Báo tiếng Việt", f"Gemini · model {st.get('model') or '?'} · "
                                           f"lỗi hôm nay: {st.get('error') or 'không'}"))
        try:
            sv = paper_sub_view()
            rows.append(("Gói báo", "còn %s ngày (tới %s) · gói %s · tự gia hạn %s" % (
                sv.get("left"), sv.get("until") or "—", sv.get("plan"), "bật" if sv.get("auto") else "tắt")))
        except Exception:
            pass
    except Exception:
        pass
    col = mw.col
    if col is None:
        rows.append(("Collection", "chưa mở hồ sơ"))
    else:
        try:
            rows.append(("FSRS", "bật" if col.get_config("fsrs", False) else "tắt"))
        except Exception:
            pass
        try:
            st = core.daily_stats(col, STATE.frozen_days())
            rows.append(("Hôm nay", f"{st['reviews']} lượt ôn · chuỗi {st['streak']} ngày"))
        except Exception as err:
            rows.append(("Hôm nay", f"không đọc được ({type(err).__name__})"))
        try:
            w = STATE.load()
            home = w["home"]
            plants = len(_dialog._plants) if _dialog is not None and _dialog._plants is not None else "?"
            rows.append(("Vườn", f"{plants} cây ở deck đang xem · nhà bậc {home.get('house')} · "
                                 f"{len(home.get('zones') or [])} vùng · giao diện mùa: {w['season'].get('mode')}"
                                 f" ({len(w['season'].get('unlocked') or [])} đã mở)"))
            m = w.get("mobile")
            if not cfg.get("mobile_coins", True):
                mob = "tắt"
            elif m is None:
                mob = "chưa đặt mốc"
            else:
                mob = f"đã bù {m['total']['reviews']} lượt (+{m['total']['coins']} xu)"
            rows.append(("Bù xu điện thoại", mob))
        except Exception as err:
            rows.append(("Vườn", f"không đọc được ({type(err).__name__})"))
        try:
            store = FIELDS.load()
            rows.append(("Cấu hình trường", f"{len(store.get('models') or {})} loại note đã cấu hình"))
        except Exception:
            pass
    try:
        others = sorted(a.human_name() for a in mw.addonManager.all_addon_meta()
                        if getattr(a, "enabled", False) and getattr(a, "dir_name", "") != ADDON)
        rows.append(("Add-on khác đang bật", others or "không có"))
    except Exception:
        pass
    return {"rows": rows}


def report_text(client: Any = None) -> str:
    names: tuple[str, ...] = ()
    try:
        names = tuple(n for n in (getattr(mw.pm, "name", None),) if isinstance(n, str))
    except Exception:
        names = ()
    try:
        return diag.build_report(report_info(client), ERRORS.entries(), names=names)
    except Exception as err:       # tới báo cáo cũng lỗi: vẫn đưa ra thứ gì đó để gửi
        return diag.redact(f"ことば畑 {VERSION}: không tạo được báo cáo đầy đủ ({err!r})\n\n{traceback.format_exc()}",
                           names=names)


def _save_report(parent: Any, text: str) -> None:
    fname = time.strftime("kotoba_batake_bao_loi_%Y%m%d-%H%M.txt")
    try:
        from aqt.utils import getSaveFile
        path = getSaveFile(parent, "Lưu báo cáo lỗi", "kotoba_batake_report", "Văn bản", ".txt", fname)
    except Exception as err:          # không hỏi được chỗ lưu (vd. chưa mở hồ sơ): lưu vào thư mục nhà
        _warn("lưu báo cáo", err)
        path = os.path.join(os.path.expanduser("~"), fname)
    if not path:
        return
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        tooltip(f"Đã lưu: {os.path.basename(path)}", period=3000)
    except OSError as err:
        showWarning(f"Không lưu được file:\n{err}", parent=parent)


def show_report(parent: Any = None, client: Any = None) -> Any:
    """Cửa sổ Báo lỗi: báo cáo sửa được, nút Chép / Lưu ra file / Xoá nhật ký / Đóng. Không gửi gì lên mạng."""
    global _report_dialog
    from aqt import qt as _qt
    text = report_text(client)
    if _report_dialog is not None:
        try:
            _report_dialog.close()
        except Exception:
            pass
    dlg = _qt.QDialog(parent or mw)
    dlg.setWindowTitle("ことば畑 · Báo lỗi")
    lay = _qt.QVBoxLayout(dlg)
    intro = _qt.QLabel("Gửi nội dung dưới đây cho người làm ことば畑, kèm ảnh chụp màn hình nếu có. "
                       "Hãy ghi vài dòng ở mục “Mô tả lỗi”. Bạn sửa hay xoá bớt được trước khi gửi. "
                       "ことば畑 không tự gửi gì lên mạng.")
    intro.setWordWrap(True)
    lay.addWidget(intro)
    edit = _qt.QPlainTextEdit()
    edit.setPlainText(text)
    lay.addWidget(edit)
    row = _qt.QHBoxLayout()
    b_copy = _qt.QPushButton("Chép")
    b_save = _qt.QPushButton("Lưu ra file…")
    b_clear = _qt.QPushButton("Xoá nhật ký lỗi")
    b_close = _qt.QPushButton("Đóng")

    def copy() -> None:
        _qt.QApplication.clipboard().setText(edit.toPlainText())
        tooltip("Đã chép báo cáo — dán vào tin nhắn / email để gửi.", period=3000)

    def clear() -> None:
        ERRORS.clear()
        edit.setPlainText(report_text(client))
        tooltip("Đã xoá nhật ký lỗi.", period=2000)

    qconnect(b_copy.clicked, copy)
    qconnect(b_save.clicked, lambda: _save_report(dlg, edit.toPlainText()))
    qconnect(b_clear.clicked, clear)
    qconnect(b_close.clicked, dlg.close)
    for b in (b_copy, b_save, b_clear):
        row.addWidget(b)
    row.addStretch()
    row.addWidget(b_close)
    lay.addLayout(row)
    dlg.resize(760, 600)
    dlg.show()
    _report_dialog = dlg
    return dlg


def _on_report_menu() -> None:
    show_report(_dialog if _dialog is not None else mw, None)


# ---------------------------------------------------------------------------
# Mở nhanh (1.10): phím tắt, nút trên thanh trên cùng của Anki, biểu tượng ngoài Anki
# ---------------------------------------------------------------------------

SHORTCUT = "Ctrl+Shift+K"           # macOS: ⌘⇧K (Qt tự đổi Ctrl → Cmd)
USER_DIR = os.path.join(ADDON_DIR, "user_files")


def shortcut_label() -> str:
    return "⌘⇧K" if sys.platform == "darwin" else SHORTCUT


def create_desktop_icon() -> dict[str, Any]:
    """Tạo biểu tượng ことば畑 trên màn hình nền (xem launcher.py). Không ném lỗi."""
    res = launcher.create(ADDON_DIR, USER_DIR)
    print(f"[kotoba_batake] biểu tượng: {res}")
    return res


def _on_desktop_icon_menu() -> None:
    res = create_desktop_icon()
    if res["ok"]:
        tooltip(res["msg"] + " Bấm vào đó là vào thẳng khu vườn.", period=6000)
    else:
        showWarning(res["msg"])


def _open_from_ticket() -> None:
    """Biểu tượng ngoài Anki được bấm: mở vườn (sau khi Anki đã nhảy lên trước)."""
    try:
        mw.progress.single_shot(150, open_garden, False)
    except Exception:
        open_garden()


def _install_ticket_handler() -> None:
    """Bọc mw.handleImport: file vé kotoba_batake_open.apkg → mở vườn; file khác nhập như cũ."""
    orig = getattr(mw, "handleImport", None)
    if orig is None or getattr(orig, "_kotoba_batake", False):
        return

    def handle_import(path: str, *args: Any, **kwargs: Any) -> Any:
        if launcher.is_ticket(path):
            _open_from_ticket()
            return None
        return orig(path, *args, **kwargs)

    handle_import._kotoba_batake = True  # type: ignore[attr-defined]
    mw.handleImport = handle_import


def _toolbar_on() -> bool:
    try:
        return bool(core.merged_config(mw.addonManager.getConfig(__name__)).get("toolbar_button", True))
    except Exception:
        return True


def _toolbar_links(links: list[str], toolbar: Any) -> None:
    """Nút ことば畑 trên thanh trên cùng của Anki (cạnh Bộ thẻ · Thêm · Duyệt · Thống kê · Đồng bộ)."""
    if not _toolbar_on():
        return
    try:
        links.append(toolbar.create_link(
            "kotoba_batake", "ことば畑", open_garden,
            tip=f"Mở ことば畑 · Vườn từ vựng ({shortcut_label()})", id="kotoba_batake"))
    except Exception as err:
        _warn("toolbar", err)


_toolbar_css: str | None = None


def toolbar_css() -> str:
    """CSS gắn biểu tượng mầm pixel trước chữ ことば畑 trên thanh trên cùng."""
    global _toolbar_css
    if _toolbar_css is None:
        try:
            with open(os.path.join(ADDON_DIR, "icons", "toolbar.png"), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
            _toolbar_css = (
                "<style>#kotoba_batake{white-space:nowrap}"
                "#kotoba_batake::before{content:'';display:inline-block;width:16px;height:16px;"
                "margin-right:4px;vertical-align:-3px;image-rendering:pixelated;"
                f"background:url(data:image/png;base64,{b64}) center/16px 16px no-repeat}}</style>")
        except OSError:
            _toolbar_css = ""
    return _toolbar_css


def _toolbar_content(web_content: Any, context: Any) -> None:
    if type(context).__name__ != "TopToolbar" or not _toolbar_on():
        return
    try:
        web_content.head += toolbar_css()
    except Exception as err:
        _warn("toolbar css", err)


def _setup_menu() -> None:
    action = QAction("ことば畑 · Vườn từ vựng", mw)
    try:
        action.setShortcut(QKeySequence(SHORTCUT))
    except Exception as err:
        _warn("phím tắt", err)
    qconnect(action.triggered, open_garden)
    mw.form.menuTools.addAction(action)
    icon = QAction("ことば畑 · Tạo biểu tượng trên màn hình nền", mw)
    qconnect(icon.triggered, _on_desktop_icon_menu)
    mw.form.menuTools.addAction(icon)
    report = QAction("ことば畑 · Báo lỗi", mw)
    qconnect(report.triggered, _on_report_menu)
    mw.form.menuTools.addAction(report)


def _on_profile_open() -> None:
    # Lần đầu chạy bản đồng bộ: chuyển xu/nhà từ file cũ vào collection.
    try:
        if STATE.migrate():
            print("[kotoba_batake] đã chuyển dữ liệu sang collection (đồng bộ AnkiWeb)")
    except Exception as err:
        _warn("migrate", err)
    try:                                  # 1.28 (F09): số báo đã viết xong cho hồ sơ này lúc hồ sơ khác đang mở
        sub_pending_settle()
    except Exception as err:
        _warn("gói báo (chờ hồ sơ)", err)
    # 1.11: lần đầu chỉ đặt mốc; sau đó bù lượt ôn ở máy khác / điện thoại đã có sẵn trong collection
    res = mobile_catch_up()
    if res and config().get("show_tooltips", True):
        tooltip(mobile_message(res), period=5000)
    # 1.19.1: chưa chọn "Báo muốn nhận" lần nào → ghi lựa chọn mặc định một lần (máy đã có báo tiếng Anh thì giữ)
    try:
        if not isinstance((mw.addonManager.getConfig(__name__) or {}).get("gemini_langs"), list):
            save_config(gemini_langs=wanted_langs())
    except Exception as err:
        _warn("báo muốn nhận", err)
    # 1.12: dùng báo Gemini thì viết sẵn số hôm nay (đợi Anki mở xong cho khỏi chậm lúc khởi động)
    try:
        if ai.clean_key(config().get("gemini_key")):
            mw.progress.single_shot(8000, lambda: ai_start_all("auto"), True)
            mw.progress.single_shot(12000, fix_auto, True)       # 1.20: bài luyện viết "chờ lượt"
    except Exception as err:
        _warn("Gemini (mở hồ sơ)", err)


def _on_profile_close() -> None:
    """1.22.6: đổi hồ sơ / đóng hồ sơ khi vườn đang mở → đóng vườn theo (trước đây cửa sổ vườn còn mở mà collection đã
    đóng: bấm gì cũng lỗi, mở hồ sơ khác thì vườn vẫn trỏ vào deck của hồ sơ cũ; Anki ghi "Window should have been
    closed")."""
    global _report_dialog
    try:                                  # 1.25.3: lượt Undo còn chờ → ghi trước khi đóng (Redo cũng hết khi đóng)
        _flush_undo(force=True)
    except Exception as err:
        _warn("hoàn tác lượt ôn (đóng hồ sơ)", err)
    _ledger.clear()                       # 1.23: sổ phần thưởng (Undo) chỉ cho collection đang mở
    _day_total.update(key=None, v=0)      # 1.28: tổng ngày có ôn của hồ sơ này không sang hồ sơ khác
    _words_cache.clear()                  # 1.25.3: gợi ý luyện viết của hồ sơ này không sang hồ sơ khác
    _presence.update(t=0.0, v={}, col="")  # 1.25.9: ngôn ngữ có trong collection cũng vậy
    if _dialog is not None:
        try:
            _dialog.flush_unsaved()       # collection còn mở ở hook này → lưu được chữ đang gõ dở
            _dialog.close()
        except Exception as err:
            _warn("đóng vườn khi đóng hồ sơ", err)
    if _report_dialog is not None:
        try:
            _report_dialog.close()
        except Exception:
            pass
        _report_dialog = None


def _on_sync_finished() -> None:
    # Sau khi đồng bộ AnkiWeb: xu/nhà/nhiệm vụ có thể vừa được cập nhật từ máy khác,
    # và lượt ôn trên điện thoại vừa về → bù xu (vườn đang mở thì refresh tự bù và báo trong vườn).
    _day_total.update(key=None, v=0)      # 1.28 (F07): lịch sử ôn vừa đổi → mốc "N ngày có ôn" tính lại
    if _dialog is not None:
        try:
            _dialog.refresh()
        except Exception as err:
            _warn("refresh after sync", err)
        return
    res = mobile_catch_up()
    if res and config().get("show_tooltips", True):
        tooltip(mobile_message(res), period=5000)


_setup_menu()
_install_ticket_handler()
for _name, _fn in (("top_toolbar_did_init_links", _toolbar_links), ("webview_will_set_content", _toolbar_content)):
    _hook = getattr(gui_hooks, _name, None)      # bản Anki quá cũ không có móc này: bỏ qua
    if _hook is not None:
        _hook.append(_fn)
gui_hooks.profile_did_open.append(_on_profile_open)
gui_hooks.profile_will_close.append(_on_profile_close)
gui_hooks.av_player_did_end_playing.append(_reset_speed)
gui_hooks.sync_did_finish.append(_on_sync_finished)
gui_hooks.reviewer_will_answer_card.append(_will_answer)
gui_hooks.reviewer_did_answer_card.append(_did_answer)
if hasattr(gui_hooks, "state_did_undo"):          # 1.23 (KB-03): Undo lượt ôn → trả lại xu
    gui_hooks.state_did_undo.append(_on_undo)
if hasattr(gui_hooks, "operation_did_execute"):   # 1.25.3: lượt Undo chờ ghi → xem Redo / thao tác khác
    gui_hooks.operation_did_execute.append(_on_op)
if hasattr(gui_hooks, "sync_will_start"):
    gui_hooks.sync_will_start.append(_on_sync_start)
STATE.on_load = _undo_on_load
STATE.on_save = _undo_on_save
