"""Xuất nguyên văn lời nhắc (prompt) add-on gửi Gemini khi viết báo — dùng phạm vi mẫu nhỏ (vài từ) để dễ đọc; danh
sách từ thật mỗi số khoảng 100 từ.

1.25.2 "Một làng, một truyện": mỗi ngày viết MỘT bản gốc tiếng Việt (truyện + tin làng), báo Nhật / Anh kể lại, báo
tiếng Việt in thẳng bản gốc.

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
WEATHER = story.village_weather(DAY)

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
vi = ai_vi.scope()
nd = ai.scope_from_pick({"kho": [], "all": [], "grammar": [], "decks": []}, "N3")
nd["khong_deck"] = True

MASTER = {"ky": 12, "thoi_tiet": WEATHER,
          "truyen": {"tieu_de": "（truyện bản gốc tiếng Việt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"],
                     "ky_truoc": "（tóm tắt kỳ 11）", "nho": {"tom_tat": "（tóm tắt kỳ 12）"}},
          "tin": [{"tieu_de": "（tin 1）", "noi_dung": "（nội dung tin 1）"}, {"tieu_de": "（tin 2）", "noi_dung": "（nội dung tin 2）"}],
          "muc3": {"tieu_de": "（thông báo của làng）", "doan": ["◆ （mục 1）", "◆ （mục 2）"]}}
PLAIN = {"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"], "tu_moi": []}
ARC = {"ten": "Tiếng gõ trong đêm", "muc_tieu": "tìm ra ai gõ", "bi_an": "bóng trắng bên giếng", "nhan_vat_phu": "mèo trắng",
       "buoc": ["Kỳ 12: …", "Kỳ 13: …", "Kỳ 14: …", "Kỳ 15: …", "Kỳ 16: …", "Kỳ 17: …"], "ket": "…", "tu_ky": 12,
       "giong": "kinh_di"}
EP = [{"ky": 11, "ngay": "2026-11-07", "tom_tat": "（tóm tắt kỳ 11）", "nguyen_van": ["（nguyên văn kỳ 11, đoạn 1）", "（đoạn 2）"],
       "bo_ngo": ["（chỗ bỏ ngỏ）"], "phan_hoi": {"y": "hay", "ghi": "（dòng nhận xét của người đọc）"}}]

parts = ["# Lời nhắc (prompt) gửi Gemini khi viết báo — nguyên văn", "",
         "Xuất bằng `tests/tools/dump_prompts.py` từ mã 1.25.2 (ngày mẫu 08/11/2026, chủ đề truyện: Kinh dị nhẹ + Hài, thời "
         "tiết của vườn hôm đó: %s). Danh sách từ ở đây rút gọn còn vài từ; mỗi số thật gửi khoảng 100 từ." % WEATHER, "",
         "**Một làng, một truyện (1.25.2):** mỗi ngày Gemini viết **một bản gốc tiếng Việt** cho cả làng — kỳ truyện dài kỳ + "
         "2–3 tin làng + mục thứ ba (thông báo / cột của một nhân vật). Thứ tự gọi: **0. lập mạch** (khoảng mỗi tuần) → "
         "**1. nhà văn** (bản gốc) → **2. biên tập** chấm 7 tiêu chí → (điểm < 4: **viết lại** một lần). Rồi mỗi báo: "
         "**3. kể lại** truyện bằng tiếng Nhật / tiếng Anh theo trình độ (báo tiếng Việt in thẳng bản gốc) → **4. viết cả "
         "số** (chép truyện + furigana, tin làng kể lại từ tin bản gốc, câu hỏi, câu chép) → máy kiểm tra → **sửa** (≤ 2 lần) "
         "→ **5. soát lần 2**. Gemini trả JSON theo khuôn cố định của từng bước. Báo thứ hai trong ngày không viết lại bản gốc.",
         "", "Bản gốc thấy được: nguyên văn kỳ trước, tóm tắt các kỳ trong đợt, mạch đợt, chỗ bỏ ngỏ, nhận xét Hay / Nhạt của "
         "người đọc, ngày + mùa, thời tiết của vườn, tin làng mấy số trước (để tin nối tin).", ""]


def block(title, text):
    parts.extend(["### " + title, "", "```text", text.strip(), "```", ""])


parts.extend(["## Bản gốc chung (tiếng Việt) — viết một lần mỗi ngày", ""])
mscope = {"lang": "vi", "trinh_do": "", "thoi_tiet": WEATHER, "muc3": "thong_bao",
          "tin_truoc": ["11-07 · （tin hôm qua: chợ phiên sắp mở）", "11-07 · （tin hôm qua: cây hồng chín）"]}
season = ai_vi.season_text(DAY)
block("0. Lập mạch truyện", story.arc_prompt("vi", "kinh_di", EP, 12, season, TONES))
block("1. Nhà văn — system", "Bạn là nhà văn viết truyện dài kỳ tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki. Viết hay "
      "như một truyện thật, không như bài giảng.")
block("1. Nhà văn — lời nhắc (bản gốc: truyện + tin làng + mục thứ ba)", story.writer_prompt("vi", mscope, 12, "kinh_di", ARC, EP,
                                                                                              season, tones=TONES))
block("2. Biên tập — lời nhắc (system: \"Bạn là biên tập viên truyện khó tính nhưng công bằng.\")",
      story.editor_prompt("vi", mscope, {"tieu_de": "（kỳ truyện）", "doan": ["…"]}, EP, 12, []))

for title, lang, scope, mod, level in (("Báo tiếng Nhật (畑新聞, N4)", "ja", ja, ai, "N4"),
                                       ("Báo tiếng Anh (The Garden Gazette, A2)", "en", en, ai_en, "A2"),
                                       ("Báo tiếng Việt (Báo Làng Kotoba — chỉ khi không học Nhật / Anh)", "vi", vi, ai_vi, "")):
    parts.extend(["## " + title, ""])
    if lang != "vi":
        block("3. Kể lại truyện — lời nhắc", story.retell_prompt(lang, scope, {"ky": 12, **MASTER["truyen"]}))
    block("4. Viết cả số — system", mod.system_prompt(level))
    opts = {"so": 30, "ky": 12, "story_plain": PLAIN, "max_new": 3, "tones": TONES, "thoi_tiet": WEATHER,
            "tin_goc": MASTER["tin"], "muc3_goc": MASTER["muc3"]}
    block("4. Viết cả số — lời nhắc", mod.write_prompt(scope, opts, EP, [], DAY))
    review = (mod.review_prompt if lang != "ja" else ai.review_prompt)({"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}, scope, [])
    block("5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)", review)

parts.extend(["## Không dùng deck (tiếng Nhật N3) — đoạn khác với khi có deck", ""])
block("4. Viết cả số — lời nhắc (không có bản gốc: truyện viết chung trong lượt này)",
      ai.write_prompt(nd, {"so": 1, "ky": 1, "max_new": ai.NO_DECK_NEW, "tones": TONES, "thoi_tiet": WEATHER}, [], [], DAY))
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
open(OUT, "w", encoding="utf-8").write("\n".join(parts))
print("ghi", OUT, sum(len(p) for p in parts), "ký tự")
