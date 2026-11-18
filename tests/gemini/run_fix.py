"""1.20: Gemini thật sửa một bài luyện viết đúng như add-on (journal_core.run_fix → check_fix), in thời gian, model,
token, những gì máy đã cắt và kết quả 3 phần.

Chạy:  GEMINI_API_KEY=... python run_fix.py ADDON [--lang ja|en|zh|ko|de|fr] [--level N4|A2|HSK2|TOPIK2] [--text "…"] [--hints "a,b"] [--long]
       (1.35.1: thêm tiếng Trung / Hàn / Đức / Pháp)
       (môi trường có proxy tự chèn khoá thì không cần GEMINI_API_KEY; proxy cắt request > 30 giây thì thêm KB_STREAM=1)
--long: bài dài tối đa (60 ký tự / 30 từ, nhiều lỗi) để xem Gemini có giữ đúng giới hạn đầu ra không."""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup  # noqa: E402

SAMPLES = {
    "ja": "きのうは雨だったので、友だちと駅の近くのレストランを予約しました。寒いでしたが、料理はおいしいでした。",
    "en": "Yesterday it rain a lot, so I book a small restaurant near the station with my friend.",
    "zh": "我很喜欢吃苹果，昨天我买三个苹果，可是苹果不很甜。",
    "ko": "어제 친구하고 같이 영화을 봐요. 영화가 아주 재미있어요.",
    "de": "Gestern ich habe Tee getrunken und gehe mit meine Freund in Park.",
    "fr": "Hier, j'ai allé à le marché avec mon amie et nous avons acheté des pomme.",
}
LONG = {
    "ja": "きのうは雨だったので友だちと駅の近くのレストランを予約しました。寒いでしたが、料理はおいしいでした。また行きたいです。",
    "en": ("Yesterday it rain a lot, so my friend and I book a small restaurant near the station and we eats dinner "
           "together. The food was delicious and we was happy."),
    "zh": "我很喜欢吃苹果，昨天我和朋友去商店买三个苹果，可是苹果不很甜，我们很不高兴，明天我们要去别的商店买水果。",
    "ko": "어제 친구하고 같이 영화을 봐요. 영화가 아주 재미있어요. 그리고 저녁에 식당에서 밥을 먹었어요. 아주 맛있어요.",
    "de": ("Gestern ich habe Tee getrunken und gehe mit meine Freund in Park. Das Wetter war sehr schön und wir haben "
           "viel gelacht, aber ich bin müde."),
    "fr": ("Hier, j'ai allé à le marché avec mon amie et nous avons acheté des pomme. Il faisait beau et nous sommes "
           "très content, mais je suis fatigué."),
}
ap = argparse.ArgumentParser()
ap.add_argument("addon")
ap.add_argument("--lang", default="ja", choices=["ja", "en", "zh", "ko", "de", "fr"])
ap.add_argument("--level", default="")
ap.add_argument("--text", default="")
ap.add_argument("--hints", default="")
ap.add_argument("--long", action="store_true")
a = ap.parse_args()
ai = _setup.load(a.addon)
import journal_core as j  # noqa: E402

text = a.text or (LONG if a.long else SAMPLES)[a.lang]
text, cut = j.clip_units(j.clean_line(text, 2000), a.lang, j.WRITE_MAX[a.lang])
level = a.level or {"ja": "N4", "zh": "HSK2", "ko": "TOPIK2"}.get(a.lang, "A2")
hints = [h.strip() for h in a.hints.split(",") if h.strip()] or {
    "ja": ["予約する", "寒い"], "en": ["book", "rain"], "zh": ["苹果", "喜欢"], "ko": ["친구", "영화"], "de": ["der Tee", "gehen"],
    "fr": ["acheter", "la pomme"]}[a.lang]
print("BÀI (%d %s%s): %s" % (j.count_units(text, a.lang), j.WRITE_UNIT[a.lang], ", đã cắt" if cut else "", text))
client = ai.Gemini(_setup.key())
t0 = time.time()
names = ai.text_models(client.models())
print("THỨ TỰ MODEL:", j.fix_models(names, client)[:4])
try:
    res = j.run_fix(client, names, text, a.lang, level, hints)
except ai.AIError as e:
    print("LỖI (%s): %s → thông báo: Chưa sửa được: %s" % (e.kind, e, j.short_reason(e)))
    sys.exit(1)
print("MODEL: %s · %.1f giây · %d lượt gọi · token %s" % (res["model"], time.time() - t0, client.calls,
                                                           json.dumps(client.last_usage, ensure_ascii=False)))
print("GEMINI TRẢ VỀ:", json.dumps(res["raw"], ensure_ascii=False, indent=1))
clean, notes = j.check_fix(res["raw"], text, a.lang)
print("MÁY ĐÃ CẮT / BỎ:", notes or "không có")
segs = j.segments(clean["sua"], *j._marks(text, clean["sua"], a.lang, hints)) if clean["sua"] else []
print("1. CÂU ĐÃ SỬA:", "".join("[" + s[0] + "]" if "c" in s[1] else "~~" + s[0] + "~~" if s[1] == "d" else s[0] for s in segs) or "(ẩn)")
for e in clean["loi"]:
    print("2. LỖI: %s → %s — %s · %s  (quy tắc: %s)" % (e["goc"], e["sua"], e["loai"], e["giai_thich"], e["quy_tac"]))
if clean["con_lai"]:
    print("   còn lại:", clean["con_lai"])
if clean["tu_nhien"]:
    print("   tự nhiên hơn:", clean["tu_nhien"])
print("3. NHẬN XÉT:", clean["nhan_xet"])
print("ĐỘ DÀI: câu sửa %d/%d %s · giải thích %s/60 · nhận xét %d/100" % (
    j.count_units(clean["sua"], a.lang), j.fix_limit(j.count_units(text, a.lang), a.lang), j.WRITE_UNIT[a.lang],
    [len(e["giai_thich"]) for e in clean["loi"]], len(clean["nhan_xet"])))
