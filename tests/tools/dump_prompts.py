"""Xuất nguyên văn lời nhắc (prompt) add-on gửi Gemini khi viết báo — dùng phạm vi mẫu nhỏ (vài từ / vài thẻ) để dễ
đọc; danh sách từ thật mỗi số khoảng 100 từ (tiếng Việt: 60 thẻ).

Chạy: python3 tests/tools/dump_prompts.py kotoba_batake docs/LOI_NHAC_GEMINI.md
"""
import datetime, os, sys

ADDON, OUT = os.path.abspath(sys.argv[1]), sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai
import ai_en
import ai_vi
import story_core as story

DAY = datetime.date(2026, 11, 8)
TONES = ["kinh_di", "hai"]

ja_pick = {"kho": [{"word": w, "reading": r, "meaning": m, "due": i < 5} for i, (w, r, m) in enumerate([
    ("予約", "よやく", "đặt trước"), ("案内", "あんない", "hướng dẫn"), ("届ける", "とどける", "giao, đưa tới"),
    ("忘れ物", "わすれもの", "đồ bỏ quên"), ("暖かい", "あたたかい", "ấm áp"), ("駅", "えき", "nhà ga"),
    ("手紙", "てがみ", "lá thư"), ("静か", "しずか", "yên tĩnh")])], "all": [], "grammar": [], "decks": ["N4 · Từ vựng"]}
ja = ai.scope_from_pick(ja_pick, "N4")
en_pick = {"kho": [{"word": w, "reading": r, "meaning": m, "due": i < 4} for i, (w, r, m) in enumerate([
    ("borrow", "/ˈbɒr.əʊ/", "mượn"), ("lighthouse", "/ˈlaɪt.haʊs/", "ngọn hải đăng"), ("whisper", "/ˈwɪs.pər/", "thì thầm"),
    ("receipt", "/rɪˈsiːt/", "hoá đơn"), ("crowded", "/ˈkraʊ.dɪd/", "đông đúc"), ("umbrella", "/ʌmˈbrel.ə/", "cái ô")])],
    "all": [], "decks": ["English A2"]}
en = ai_en.scope_from_pick(en_pick, "A2")
vi_pick = {"kho": [{"word": f, "meaning": b, "due": i < 3} for i, (f, b) in enumerate([
    ("Ngô Quyền", "Đánh bại quân Nam Hán trên sông Bạch Đằng năm 938"),
    ("Ty thể", "Bào quan tạo năng lượng (ATP) cho tế bào"),
    ("사랑", "tình yêu"), ("Định luật Ohm", "I = U / R"), ("Hoàng thành Thăng Long", "Di sản văn hóa thế giới, UNESCO 2010")])],
    "decks": ["Lịch sử", "Sinh học", "Tiếng Hàn"]}
vi = ai_vi.scope_from_pick(vi_pick)
nd = ai.scope_from_pick({"kho": [], "all": [], "grammar": [], "decks": []}, "N3")
nd["khong_deck"] = True

STORY_OK = {"tieu_de": "（truyện đã duyệt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"], "tu_moi": []}
ARC = {"ten": "Tấm bản đồ cũ", "muc_tieu": "tìm cái giếng", "bi_an": "giếng ở đâu", "nhan_vat_phu": "ông khách già",
       "buoc": ["Kỳ 1: …", "Kỳ 2: …", "Kỳ 3: …", "Kỳ 4: …", "Kỳ 5: …", "Kỳ 6: …"], "ket": "…", "tu_ky": 1, "giong": "kinh_di"}

parts = ["# Lời nhắc (prompt) gửi Gemini khi viết báo — nguyên văn", "",
         "Xuất bằng `tests/tools/dump_prompts.py` từ mã 1.25.1 (ngày mẫu 08/11/2026, chủ đề truyện: Kinh dị nhẹ + Hài). "
         "Danh sách từ / thẻ ở đây rút gọn còn vài mục; mỗi số thật gửi khoảng 100 từ (báo tiếng Việt: 60 thẻ).", "",
         "Mỗi số báo thường (Truyện: Hay hơn) gọi Gemini theo thứ tự: **0. lập mạch** (khoảng mỗi tuần một lần) → "
         "**1. nhà văn** viết kỳ truyện → **2. biên tập** chấm 7 tiêu chí → (điểm < 4: **viết lại** một lần) → "
         "**3. viết cả số** (chép truyện đã duyệt + tin làng + bài thứ ba + câu hỏi) → máy kiểm tra → **sửa** (≤ 2 lần) → "
         "**4. soát lần 2**. Gemini trả JSON theo khuôn (schema) cố định của từng bước.", ""]


def block(title, text):
    parts.extend(["### " + title, "", "```text", text.strip(), "```", ""])


def section(title, lang, scope, level):
    parts.extend(["## " + title, ""])
    system = ("Bạn là nhà văn viết truyện dài kỳ tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki. Viết hay như một "
              "truyện thật, không như bài giảng." if lang == "vi" else
              "Bạn là nhà văn viết truyện dài kỳ %s dễ đọc cho người Việt học %s trình độ %s. Viết hay như một truyện thật, "
              "không như bài tập." % (("tiếng Anh",) * 2 + (level,) if lang == "en" else ("tiếng Nhật",) * 2 + (level,)))
    block("0. Lập mạch truyện (system: như bước 1)", story.arc_prompt(lang, "kinh_di", [], 1, (ai_en if lang == "en" else ai_vi if lang == "vi" else ai).season_text(DAY), TONES))
    block("1. Nhà văn — system", system)
    block("1. Nhà văn — lời nhắc", story.writer_prompt(lang, scope, 1, "kinh_di", ARC, [], (ai_en if lang == "en" else ai_vi if lang == "vi" else ai).season_text(DAY), tones=TONES))
    block("2. Biên tập — lời nhắc (system: \"Bạn là biên tập viên truyện khó tính nhưng công bằng.\")",
          story.editor_prompt(lang, scope, {"tieu_de": "（kỳ truyện）", "doan": ["…"]}, [], 1, []))
    mod = ai_en if lang == "en" else ai_vi if lang == "vi" else ai
    block("3. Viết cả số — system", mod.system_prompt(level))
    block("3. Viết cả số — lời nhắc", mod.write_prompt(scope, {"so": 12, "ky": 1, "story_plain": STORY_OK, "max_new": 3, "tones": TONES}, [], [], DAY))
    review = mod.review_prompt({"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}, scope, []) if lang != "ja" else \
        ai.review_prompt({"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}, scope, [])
    block("4. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)", review)


section("Báo tiếng Nhật (畑新聞, N4, theo deck)", "ja", ja, "N4")
section("Báo tiếng Anh (The Garden Gazette, A2, theo deck)", "en", en, "A2")
section("Báo tiếng Việt (Báo Làng Kotoba, thẻ bất kỳ) — mới ở 1.25.1", "vi", vi, "")
parts.extend(["## Không dùng deck (tiếng Nhật N3) — đoạn khác với khi có deck", ""])
block("3. Viết cả số — lời nhắc (Tiết kiệm: truyện viết chung trong lượt này)",
      ai.write_prompt(nd, {"so": 1, "ky": 1, "max_new": ai.NO_DECK_NEW, "tones": TONES}, [], [], DAY))
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
open(OUT, "w", encoding="utf-8").write("\n".join(parts))
print("ghi", OUT, sum(len(p) for p in parts), "ký tự")
