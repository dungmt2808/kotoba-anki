"""Test offline 1.22.6: config người dùng sửa tay sai kiểu (Tools → Add-ons → Config) không làm vườn hỏng.

Anki chỉ kiểm tra JSON đúng cú pháp, không kiểm tra kiểu: "daily_goal": "" / "max_plants": "nhiều" / "music_volume": "to"
làm `int()` / `float()` lỗi → "không dựng được khu vườn"; "effects": "false" (chuỗi) thì `bool("false")` = True → vẫn bật.
`merged_config` đưa mọi mục về đúng kiểu của mặc định (đọc được thì đổi, không đọc được thì dùng mặc định, số kẹp trong
khoảng hợp lý), mục lạ (không có trong mặc định) giữ nguyên.

Chạy: python test_1226.py THƯ_MỤC_ADD_ON   (không có gói `anki` thì dùng tests/stubs)
"""
import os, sys

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


m = core.merged_config
D = core.DEFAULT_CONFIG

print("== mặc định")
ok(m(None) == D and m({}) == D, "không có config → đúng mặc định")
ok(m({"daily_goal": None})["daily_goal"] == 30, "giá trị null → mặc định")
ok(m(dict(D)) == D, "config mặc định đọc lại không đổi")

print("== số")
ok(m({"daily_goal": ""})["daily_goal"] == 30, '"daily_goal": "" → 30 (trước: ValueError, vườn không mở)')
ok(m({"daily_goal": "45"})["daily_goal"] == 45 and isinstance(m({"daily_goal": "45"})["daily_goal"], int), '"45" → 45 (int)')
ok(m({"daily_goal": 0})["daily_goal"] == 30 and m({"daily_goal": -5})["daily_goal"] == 30, "mục tiêu 0 / âm → 30 (như Lịch hoa)")
ok(m({"daily_goal": 12.7})["daily_goal"] == 12, "12.7 → 12")
ok(m({"max_plants": "nhiều"})["max_plants"] == 400, '"max_plants": "nhiều" → 400')
ok(m({"max_plants": 0})["max_plants"] == 1 and m({"max_plants": 10 ** 9})["max_plants"] == 5000, "max_plants kẹp 1…5000")
ok(m({"music_volume": "to"})["music_volume"] == 0.5, '"music_volume": "to" → 0.5')
ok(m({"music_volume": 7})["music_volume"] == 1.0 and m({"music_volume": -1})["music_volume"] == 0.0, "âm lượng kẹp 0…1")
ok(m({"music_volume": "0,3"})["music_volume"] == 0.3, '"0,3" (dấu phẩy kiểu Việt) → 0.3')
ok(m({"wilt_retrievability": "0.7"})["wilt_retrievability"] == 0.7, '"0.7" → 0.7')
ok(m({"wilt_retrievability": True})["wilt_retrievability"] == 0.7, "true cho ô số → mặc định")
ok(m({"daily_bonus": -100})["daily_bonus"] == 0 and m({"game_daily_coins": -1})["game_daily_coins"] == 0, "thưởng / trần xu âm → 0")
ok(m({"game_daily_coins": "40"})["game_daily_coins"] == 40, '"40" → 40')
ok(m({"daily_goal": float("nan")})["daily_goal"] == 30 and m({"max_plants": float("inf")})["max_plants"] == 400, "NaN / vô cực → mặc định")
ok(m({"daily_goal": [30]})["daily_goal"] == 30 and m({"daily_goal": {"a": 1}})["daily_goal"] == 30, "danh sách / object cho ô số → mặc định")

print("== bật / tắt")
ok(m({"effects": "false"})["effects"] is False, '"effects": "false" → false (trước: bool("false") = True, vẫn bật)')
ok(m({"sound": "False", "music": "tắt"})["sound"] is False and m({"music": "tắt"})["music"] is False, '"False" / "tắt" → false')
ok(m({"effects": "true"})["effects"] is True and m({"mobile_coins": "bật"})["mobile_coins"] is True, '"true" / "bật" → true')
ok(m({"effects": 0})["effects"] is False and m({"effects": 1})["effects"] is True, "0 / 1 → false / true")
ok(m({"effects": "có lẽ"})["effects"] is True and m({"open_maximized": [1]})["open_maximized"] is True, "chữ lạ / danh sách → mặc định")

print("== stage_days")
ok(m({"stage_days": "3,21,90"})["stage_days"] == [3, 21, 90], '"3,21,90" → [3, 21, 90] (trước: so chuỗi với số → lỗi)')
ok(m({"stage_days": [2.5, 21, 90]})["stage_days"] == [2.5, 21, 90], "số lẻ giữ nguyên")
ok(m({"stage_days": [3]})["stage_days"] == [3], "ít hơn 3 số giữ nguyên (stage_of tự bù mặc định)")
ok(m({"stage_days": [0, 21, 90]})["stage_days"] == [3, 21, 90], "số ≤ 0 → mặc định")
ok(m({"stage_days": ["a", 2, 3]})["stage_days"] == [3, 21, 90], "chữ → mặc định")
ok(m({"stage_days": 5})["stage_days"] == [3, 21, 90] and m({"stage_days": []})["stage_days"] == [3, 21, 90], "một số / rỗng → mặc định")
for sd in ("3,21,90", [3], [2.5, 21, 90]):
    st = m({"stage_days": sd})["stage_days"]
    card = type("C", (), {"type": 2, "ivl": 30, "memory_state": None})()
    try:
        core.stage_of(card, st)
        good = True
    except Exception:
        good = False
    ok(good, f"stage_of chạy được với stage_days {sd!r}")

print("== chữ / object / mục lạ")
ok(m({"word_field": 5})["word_field"] == "" and m({"bao_dir": None})["bao_dir"] == "", "ô chữ nhận số → mặc định")
ok(m({"ui": "abc"})["ui"] == {} and m({"ui": {"card": "night"}})["ui"] == {"card": "night"}, "ui không phải object → {}")
ok(m({"gemini_langs": ["en"], "journal_lang": "ja"})["gemini_langs"] == ["en"], "mục không có trong mặc định giữ nguyên")
d = m({"daily_goal": "abc"})
ok(D["daily_goal"] == 30 and d is not D, "không sửa DEFAULT_CONFIG")

print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
