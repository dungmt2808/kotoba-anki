"""Báo tiếng Pháp (1.35) — phần chung ở ai_eu.py; file này chỉ chọn ngôn ngữ "fr" để có cùng giao diện hàm với ai_en / ai_ko
(ai_core.Job, __init__ gọi theo mô-đun của từng ngôn ngữ). Không import aqt."""
from __future__ import annotations

import datetime
from typing import Any

try:
    from . import ai_eu as _eu
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_eu as _eu  # type: ignore[no-redef]

LANG = "fr"
FOLDER = _eu.INFO[LANG]["folder"]
MASTHEAD = _eu.INFO[LANG]["masthead"]
LEVELS = _eu.LEVELS
DEFAULT_LEVEL = _eu.DEFAULT_LEVEL
LENGTH = _eu.LENGTH
SENT_WORDS = _eu.SENT_WORDS
DICT_WORDS = _eu.DICT_WORDS
LINK_MAX = _eu.LINK_MAX
STORY_SETUP = _eu.STORY_SETUP[LANG]
RULES = _eu.rules(LANG)
season_text = _eu.season_text
clean_vi = _eu.clean_vi
check_vi = _eu.check_vi
plain_issue = _eu.plain_issue
link_count = _eu.link_count


def builtin_grammar(level: str) -> list[dict[str, str]]:
    return _eu.builtin_grammar(LANG, level)


def deck_word(raw: Any) -> str:
    return _eu.deck_word(raw, LANG)


def kho_ok(item: dict[str, Any]) -> bool:
    return bool(_eu.deck_word(item.get("word"), LANG))


def scope_from_pick(pk: dict[str, Any], level: str) -> dict[str, Any]:
    return _eu.scope_from_pick(LANG, pk, level)


def words(s: str) -> list[str]:
    return _eu.words(s, LANG)


def find_links(s: str, words_: list[str]) -> list[tuple[int, int, str]]:
    return _eu.find_links(s, words_, LANG)


def deck_used(texts: list[str], scope: dict[str, Any], extra: list[str] | None = None) -> set[str]:
    return _eu.deck_used(texts, scope, LANG, extra)


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    return _eu.autofix(LANG, raw, scope, opts)


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    return _eu.check(LANG, raw, scope, opts)


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    return _eu.deck_count(LANG, raw, scope)


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    return _eu.focus_used(LANG, raw, scope)


def system_prompt(level: str) -> str:
    return _eu.system_prompt(LANG, level)


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    return _eu.write_prompt(LANG, scope, opts, story, history, date)


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    return _eu.repair_prompt(LANG, raw, errors, scope)


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    return _eu.review_prompt(LANG, raw, scope, warnings)
