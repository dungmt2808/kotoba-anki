"""Test offline 1.23 (phần báo): bảng tra nghĩa theo từng số, Kệ báo gộp hai nguồn (sổ tiến độ theo nguồn).

- 5b: số báo Gemini cũ bấm từ gạch chân không ra nghĩa vì mọi số tra chung một pham_vi.json, bị ghi đè khi số sau
  viết theo phạm vi khác. Nay mỗi số mang `tra_tu` / `tra_mau`; không có nghĩa thì vẫn hiện cách đọc.
- 4: tiến độ đọc của nguồn thứ hai (không phải nguồn mặc định) ở khoá riêng `kotoba_batake_paper_nguon`.

Chạy: python test_123.py THƯ_MỤC_ADD_ON   (không có gói `anki` thì dùng tests/stubs)
"""
import json, os, shutil, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import paper_core as paper
import ai_core as ai

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


TMP = tempfile.mkdtemp(prefix="kb123_")


def scope_of(rows, gram=None):
    return {"tu_vung": rows, "ngu_phap": gram or [], "sach": {"deck": "Dũng Mori N4"}, "trinh_do": "N4"}


def issue(date, words, mau=None):
    doan = "今日は" + "、".join("{%s|%s|%s}" % (w, r, w) for w, r in words) + "の話です。"
    return {"ngay": date, "so": 1, "bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]のニュース", "doan": [doan]}],
            "cau_hoi": [], "chinh_ta": [], "mau_cau": mau or [], "tu_moi": [], "tom_tat": ""}


print("== 5b: số cũ vẫn tra được nghĩa sau khi pham_vi.json bị ghi đè")
base = os.path.join(TMP, "bao_gemini")
ai.ensure_dir(base)
s1 = scope_of([["日本", "にほん", "Nhật Bản", "deck"], ["中国", "ちゅうごく", "Trung Quốc", "deck"],
               ["韓国", "かんこく", "Hàn Quốc", "deck"]],
              [{"id": "deck:1", "mau": "〜てください", "nghia": "hãy làm …", "bai": "deck"}])
raw = issue("2026-11-01", [("日本", "にほん"), ("中国", "ちゅうごく"), ("韓国", "かんこく")], ["deck:1"])
raw.update(paper.build_lookup(paper.issue_texts(raw), raw["mau_cau"], s1))
ai._write_json(ai.issue_path(base, "2026-11-01"), raw)
ai.write_scope(base, s1)
ok(set(raw["tra_tu"]) == {"日本", "中国", "韓国"}, "build_lookup chỉ ghi từ có trong số (3 từ)")
ok(raw["tra_mau"].get("deck:1", [""])[0] == "〜てください", "mẫu câu của số cũng vào tra_mau")
# số sau viết theo deck khác → pham_vi.json bị ghi đè, không còn 3 từ kia
ai.write_scope(base, scope_of([["交番", "こうばん", "đồn cảnh sát", "deck"]]))
lib = paper.Library(base)
v = paper.issue_view(lib, paper.empty_state(), "2026-11-01")
ok(all(v["tu"][k]["m"] for k in ("日本", "中国", "韓国")), "sau khi pham_vi.json đổi: cả 3 từ vẫn có nghĩa (1.22.8: '(không có nghĩa)')")
ok(v["tu"]["日本"]["r"] == "にほん" and v["tu"]["日本"]["bai"] == "Dũng Mori N4", "cách đọc + nguồn 'Dũng Mori N4' theo tra_sach của số")
ok(v["mau"] and v["mau"][0]["nghia"] == "hãy làm …", "mẫu câu tra theo tra_mau của số")

print("== 5b: số cũ (trước 1.23, không có tra_tu)")
old = issue("2026-11-02", [("交番", "こうばん"), ("落とし物", "おとしもの")])
ai._write_json(ai.issue_path(base, "2026-11-02"), old)
lib = paper.Library(base)
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02")
ok(v["tu"]["交番"]["m"] == "đồn cảnh sát", "từ còn trong pham_vi.json chung vẫn tra được như cũ")
ok(v["tu"]["落とし物"]["m"] == "" and v["tu"]["落とし物"]["r"] == "おとしもの" and v["tu"]["落とし物"].get("thieu"),
   "không có ở đâu: vẫn hiện cách đọc trong dấu {…|よみ|…} + cờ 'thiếu' (không để trống)")
ok(paper.missing_words(lib, "2026-11-02") == ["落とし物"], "missing_words: chỉ 落とし物")
ok(paper.missing_words(lib, "2026-11-01") == [], "số có tra_tu: không thiếu từ nào")
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02", extra={"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]})
ok(v["tu"]["落とし物"]["m"] == "đồ đánh rơi", "extra (tìm trong deck) lấp chỗ thiếu khi hiện")
ok(paper.add_lookup(base, "2026-11-02", {"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]}),
   "add_lookup ghi bổ sung vào bao.json của số đó")
ok(not paper.add_lookup(base, "2026-11-02", {"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]}),
   "ghi lần hai: không ghi lại (một lần)")
lib = paper.Library(base)
ok(paper.missing_words(lib, "2026-11-02") == [], "sau khi bổ sung: không còn từ thiếu")
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02")
ok(v["tu"]["落とし物"]["m"] == "đồ đánh rơi", "mở lại số: nghĩa đã nằm trong chính số đó")
ok(not paper.add_lookup(base, "../x", {"a": ["a", "", "b", ""]}), "ngày sai định dạng: không ghi")

print("== clean_lookup (dữ liệu không tin cậy)")
c = paper.clean_lookup({"tra_tu": {"a": ["a", "r", "m"], "b": "x", "": ["", "", ""], "c": [1, 2, 3],
                                   "d": ["d" * 99, "r" * 99, "m" * 999, "bai"]},
                        "tra_mau": {"g": ["mẫu", "nghĩa"], "h": 5}, "tra_sach": {"deck": "D", "x": 3}})
ok(set(c["tra_tu"]) == {"a", "d"} and len(c["tra_tu"]["d"][2]) == 160, "tra_tu: bỏ mục sai kiểu, cắt độ dài")
ok(c["tra_mau"] == {"g": ["mẫu", "nghĩa", ""]} and c["tra_sach"] == {"deck": "D"}, "tra_mau / tra_sach sạch")
big = {"tra_tu": {str(i): ["w", "r", "m"] for i in range(2000)}}
ok(len(paper.clean_lookup(big)["tra_tu"]) == paper.TRA_MAX, "tối đa %d mục" % paper.TRA_MAX)
ok(paper.clean_issue(issue("2026-11-03", [("本", "ほん")]), "2026-11-03")["tra_tu"] == {}, "số không có tra_tu: bảng rỗng")

print("== báo tiếng Anh cũng mang bảng tra")
en_raw = {"ngay": "2026-11-01", "ngon_ngu": "en", "so": 1,
          "bai": [{"loai": "tin_lang", "tieu_de": "Village", "doan": ["We {walked||walk} to the {station||station}."]}],
          "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
lk = paper.build_lookup(paper.issue_texts(en_raw), [], {"tu_vung": [["walk", "/wɔːk/", "đi bộ", "deck"],
                                                                     ["station", "/ˈsteɪʃn/", "nhà ga", "deck"],
                                                                     ["apple", "", "táo", "deck"]]})
ok(set(lk["tra_tu"]) == {"walk", "station"}, "từ gốc tiếng Anh: walk, station (không có apple)")

print("== 4: sổ tiến độ theo nguồn (Kệ báo gộp)")
st = paper.clean_state({"read": {"2026-11-04": {"q": {"0": 1}, "ct": {}, "coins": 2, "bonus": False}}})
book = paper.clean_book(None)
ok(book["mac_dinh"] == "" and book["read"] == {"claude": {}, "gemini": {}}, "sổ mới rỗng")
book["mac_dinh"] = "claude"
same = paper.source_view(st, book, "claude")
ok(same is st, "nguồn mặc định (claude) dùng thẳng trạng thái cũ (bản 1.22 đọc được)")
gv = paper.source_view(st, book, "gemini")
ok(gv is not st and gv["read"] == {} and gv["queue"] is st["queue"] and gv["miss"] is st["miss"],
   "nguồn kia: ô đọc riêng, hàng chờ chép sai / từ chép sai dùng chung")
paper.mark_read(gv, "2026-11-04")
gv["read"]["2026-11-04"]["coins"] = 7
ok(book["read"]["gemini"]["2026-11-04"]["coins"] == 7 and st["read"]["2026-11-04"]["coins"] == 2,
   "số Gemini và số Claude Code cùng ngày 04/11: tiến độ / xu tách riêng")
again = paper.clean_book(json.loads(json.dumps(book)))
ok(again["mac_dinh"] == "claude" and again["read"]["gemini"]["2026-11-04"]["coins"] == 7, "lưu → đọc lại giữ nguyên")
ok(paper.clean_book({"mac_dinh": "x", "read": {"gemini": {"bad": {}}, "lạ": {}}})
   == {"mac_dinh": "", "read": {"claude": {}, "gemini": {}}}, "sổ sai kiểu: về rỗng, bỏ khoá lạ")
ok(paper.source_view(st, None, "gemini") is st and paper.source_view(st, paper.clean_book(None), "gemini") is st,
   "chưa có sổ / chưa có nguồn mặc định: như cũ")

# bản 1.22 đọc khoá cũ: chỉ thấy phần của nguồn mặc định, không lỗi với số có tra_tu
print("== tương thích bản cũ")
ok(paper.clean_state(json.loads(json.dumps(st)))["read"].keys() == {"2026-11-04"}, "khoá cũ không có dữ liệu lạ")
full = issue("2026-11-05", [("日本", "にほん")])
full["tra_tu"] = {"日本": ["日本", "にほん", "Nhật Bản", "deck"]}
ok(paper.clean_issue(full, "2026-11-05")["bai"], "bao.json có thêm tra_tu vẫn đọc bình thường")

print("== 5c: truyện theo quy trình mới (Gemini giả trả lời theo khuôn được hỏi)")
import story_core as story
REPO = os.path.join(HERE, "..", "..")
scope = ai.scope_from_pham_vi(json.load(open(os.path.join(REPO, "kotoba_daily", "pham_vi.json"), encoding="utf-8")))
raw0 = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_112_n4.json"), encoding="utf-8"))
fixed, _n = ai.autofix(json.loads(json.dumps(raw0)), scope, {"max_new": 3, "ky": 1})
fixed["tom_tat_truyen"] = "Lin bắt đầu làm ở ことば屋."
sb = next(b for b in fixed["bai"] if b["loai"] == "truyen")
PLAIN = {"dan_y": {"muon": "Lin muốn làm tốt", "tro_ngai": "nói nhầm", "bat_ngo": "khách có bản đồ", "moc_cau": "hộp đỏ"},
         "tieu_de": paper.surface(sb["tieu_de"]), "doan": [paper.surface(p) for p in sb["doan"]],
         "dich": ["Lin bắt đầu làm việc ở quán trọ.", "Có một vị khách đến (dùng dạng lịch sự).", "Hộp đỏ khẽ rung lên."],
         "tu_moi": [], "nho": {"tom_tat": "Kỳ 1: Lin bắt đầu làm, có vị khách lạ.", "nhan_vat_moi": ["ông khách đội mũ"],
                                "bo_ngo": ["chiếc hộp đỏ là của ai"], "da_giai": []}}
ARC = {"ten": "Chiếc hộp đỏ", "muc_tieu": "Lin muốn tự đón khách", "bi_an": "hộp đỏ của ai", "nhan_vat_phu": "ông khách",
       "buoc": ["Lin đón khách đầu tiên", "hộp đỏ rung", "tìm chủ hộp", "bản đồ cũ", "lên núi", "gặp ông cụ", "mở hộp"],
       "ket": "hộp là của mẹ はなさん"}


class FakeStory(ai.Gemini):
    def __init__(self, low_first=True, bad_story=False):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.asked = []
        self.low_first = low_first
        self.bad_story = bad_story

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        kind = ("mach" if schema is story.ARC_SCHEMA else "truyen" if schema is story.STORY_SCHEMA else
                "bien_tap" if schema is story.EDIT_SCHEMA else "soat" if "van_de" in json.dumps(schema or {}) else "so")
        self.asked.append((kind, prompt))
        if kind == "mach":
            return json.dumps(ARC, ensure_ascii=False)
        if kind == "truyen":
            if self.bad_story:
                return json.dumps(dict(PLAIN, doan=["Lin wa genki desu."]), ensure_ascii=False)
            return json.dumps(PLAIN, ensure_ascii=False)
        if kind == "bien_tap":
            low = self.low_first and sum(1 for k, _p in self.asked if k == "bien_tap") == 1
            return json.dumps({"diem": {k: (3 if low and k == "bat_ngo" else 4) for k in story.CRIT},
                               "loi": [], "goi_y": ["thêm chi tiết bất ngờ"]}, ensure_ascii=False)
        if kind == "soat":
            return json.dumps({"van_de": [], "bao": fixed}, ensure_ascii=False)
        return json.dumps(fixed, ensure_ascii=False)


sd = tempfile.mkdtemp(prefix="kb123s_")
fs = FakeStory()
res = ai.Job(fs, sd, "2026-11-07", scope, {"max_new": 3, "story": "hay", "tone": "bi_an"}).run()
kinds = [k for k, _p in fs.asked]
ok(res.get("ok"), "viết được số báo có truyện mới (%s)" % res.get("error", "ok"))
ok(kinds[:4] == ["mach", "truyen", "bien_tap", "truyen"] and kinds[4] == "so",
   "thứ tự: lập mạch → nhà văn → biên tập → viết lại (điểm bất ngờ 3 < 4) → viết số: %s" % kinds)
ok(len(kinds) <= 7, "tổng lượt gọi %d (cũ: 2, thêm 3–4 cho truyện)" % len(kinds))
wp = dict(fs.asked)["truyen"]
ok("Bí ẩn nhẹ" in wp and "MẠCH CỦA ĐỢT" in wp and "VÍ DỤ MỘT KỲ HAY" in wp and "ĐÂY LÀ KỲ 1" in wp,
   "lời nhắc nhà văn: giọng truyện, mạch, kỳ mẫu, kỳ 1")
issue_prompt = next(p for k, p in fs.asked if k == "so")
ok("TRUYỆN ĐÃ VIẾT SẴN" in issue_prompt and "CHÉP NGUYÊN VĂN" in issue_prompt, "lượt viết số nhận truyện đã duyệt, chép nguyên văn + furigana")
saved = json.load(open(ai.issue_path(sd, "2026-11-07"), encoding="utf-8"))
st_art = next(b for b in saved["bai"] if b["loai"] == "truyen")
ok(st_art.get("dich") == ["Lin bắt đầu làm việc ở quán trọ.", "Có một vị khách đến.", "Hộp đỏ khẽ rung lên."],
   "bản dịch truyện vào số báo, đã bỏ ghi chú trong ngoặc \"(dùng dạng lịch sự)\"")
arc = story.load_arc(sd)
ok(arc and arc["tu_ky"] == 1 and len(arc["buoc"]) == 7 and arc["giong"] == "bi_an", "truyen_mach.json: mạch 7 kỳ từ kỳ 1")
eps = story.load_story(sd)
ok(eps and eps[-1]["ky"] == 1 and eps[-1]["nguyen_van"] == PLAIN["doan"] and eps[-1]["bo_ngo"] == ["chiếc hộp đỏ là của ai"],
   "truyen.json: nguyên văn + chỗ bỏ ngỏ của kỳ 1")
ok(res.get("story", {}).get("viet_lai") is True, "kết quả ghi đã viết lại theo góp ý")

print("== kỳ 2: nhà văn nhận nguyên văn kỳ trước, chỗ bỏ ngỏ, nhận xét người đọc")
ok(story.set_feedback(sd, 1, "nhat", "muốn có thêm スタックちゃん"), "ghi nhận xét kỳ 1: Nhạt")
fs2 = FakeStory(low_first=False)
res2 = ai.Job(fs2, sd, "2026-11-08", scope, {"max_new": 3, "story": "hay", "tone": "bi_an"}).run()
k2 = [k for k, _p in fs2.asked]
ok(k2[:3] == ["truyen", "bien_tap", "so"], "mạch còn hạn: không lập lại; điểm ≥ 4: không viết lại — %s" % k2)
wp2 = dict(fs2.asked)["truyen"]
ok("NGUYÊN VĂN KỲ TRƯỚC" in wp2 and PLAIN["doan"][0][:15] in wp2 and "chiếc hộp đỏ là của ai" in wp2,
   "kỳ 2 nhận nguyên văn kỳ 1 + chỗ bỏ ngỏ")
ok("muốn có thêm スタックちゃん" in wp2 and "Nhạt" in wp2, "kỳ 2 đọc nhận xét người đọc")
ok("→ kỳ 2" in wp2, "lời nhắc đánh dấu bước của mạch cho kỳ 2")

print("== nhà văn trả bài hỏng (romaji) → dùng truyện viết chung như cũ, số báo vẫn về")
sd3 = tempfile.mkdtemp(prefix="kb123s_")
fs3 = FakeStory(bad_story=True)
res3 = ai.Job(fs3, sd3, "2026-11-07", scope, {"max_new": 3, "story": "hay"}).run()
k3 = [k for k, _p in fs3.asked]
ok(res3.get("ok") and k3.count("truyen") == 2 and "bien_tap" not in k3, "2 lần viết đều hỏng → bỏ qua, viết chung: %s" % k3)
ok("TRUYỆN ĐÃ VIẾT SẴN" not in next(p for k, p in fs3.asked if k == "so"), "lượt viết số tự viết truyện (Tiết kiệm)")

print("== Truyện: Tắt")
sd4 = tempfile.mkdtemp(prefix="kb123s_")
two = json.loads(json.dumps(fixed))
two["bai"] = [b for b in two["bai"] if b["loai"] != "truyen"]
two.pop("tom_tat_truyen", None)


class FakeOff(FakeStory):
    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        self.asked.append(("x", prompt))
        if "van_de" in json.dumps(schema or {}):
            return json.dumps({"van_de": [], "bao": two}, ensure_ascii=False)
        return json.dumps(two, ensure_ascii=False)


fo = FakeOff()
res4 = ai.Job(fo, sd4, "2026-11-07", scope, {"max_new": 3, "story": "tat"}).run()
ok(res4.get("ok") and "KHÔNG có truyện" in fo.asked[0][1] and len(fo.asked) == 2,
   "tắt truyện: số 2 bài, 2 lượt gọi (%s)" % res4.get("error", "ok"))

print("== máy kiểm tra truyện / bản dịch")
e, _w = story.check_story(dict(PLAIN, doan=["リンさんは watashi です" * 5] * 3), "ja", "N4", ai._bad_kanji)
ok(any("romaji" in x for x in e), "romaji trong truyện → lỗi")
tm_st = dict(PLAIN, tu_moi=[{"w": "落とし物", "r": "otoshimono", "m": "đồ đánh rơi"}, {"w": "鍵", "r": "かぎ", "m": "chìa khoá"}])
e, _w = story.check_story(tm_st, "ja", "N4", ai._bad_kanji)
ok(not e and any("kana" in x for x in _w) and tm_st["tu_moi"] == [{"w": "鍵", "r": "かぎ", "m": "chìa khoá"}],
   "từ mới đọc bằng romaji (thử thật: \"orugōru\", 郵便屋さん) → bỏ mục đó, không bỏ cả bản truyện")
ok(story.clean_translation(["U哇, cái hộp!"], 1) is None, "bản dịch lọt chữ Trung (thử thật: \"U哇\") → bỏ")
ok(story.clean_translation(["Lin chào はなさん ở ことば屋 rồi cùng スタックちゃん đi."], 1) == ["Lin chào Hana ở quán Kotoba rồi cùng Stack-chan đi."],
   "tên riêng để chữ Nhật trong bản dịch (thử thật: cả bài mất nút Dịch) → đổi sang chữ Latin")
ok(story.clean_translation(["Lin thấy một chữ 葉 lạ."], 1) is None, "còn chữ Nhật khác ngoài tên riêng → vẫn bỏ")
ok(story.clean_translation(["Hello there"], 1) is None, "bản dịch không phải tiếng Việt → bỏ")
ok(story.clean_translation(["Một", "hai"], 1) is None, "sai số đoạn → bỏ")
ok(story.story_matches(sb["doan"], PLAIN["doan"]) > 0.99 and story.story_matches(sb["doan"], ["全然違う話です。"] * 3) < 0.5,
   "so bài truyện có furigana với bản chữ trơn")
PL = ["郵便屋さんは落とした古い手紙を急いで拾い上げました。", "はなさんは少し驚いたような顔をしました。", "ことば屋の入り口で深呼吸をしました。"]
ok(story.story_diffs(["[郵便屋|ゆうびんや]さんは[落|お]てしまいました。", "はなさんは{少|すこ|少し}[驚|おどろ]ったような[顔|かお]をしました。",
                      "ことば[屋|や]の[入口|いりぐち]で[深呼吸|しんこきゅう]をしました。"], PL) == [
    (0, [("と", "て"), ("手紙を急いで拾い上げ", "")]), (1, [("し", ""), ("い", "っ")])],
   "chép sai truyện đã duyệt theo từng đoạn (thử thật: 落てしまいました, 少困った, 驚った); [入口|いりぐち] cho 入り口 thì được")
ok(story.story_diffs(["[郵便屋|ゆうびんや]さんは[落|お]とした[古|ふる]い[手紙|てがみ]をいそいで[拾|ひろ]い[上|あ]げました！",
                      "はなさんは[少|すこ]し[驚|おどろ]いたような[顔|かお]をしました。", "ことばやの[入|い]り[口|ぐち]でしんこきゅうをしました"], PL) == [],
   "chữ Hán → kana, katakana / dấu câu khác → không tính là chép sai")
ok(story.restore_story("[話|はな][始|はじ]めました。[村長|そんちょう]さんは[笑|わら]った。", "話し始めました。村長は笑った。")
   == "[話|はな]し[始|はじ]めました。[村長|そんちょう]さんは[笑|わら]った。"
   and story.restore_story("はなさんは[驚|おどろ]ったような[顔|かお]。", "はなさんは驚いたような顔。") == "はなさんは[驚|おどろ]いたような[顔|かお]。"
   and story.restore_story("それと{見|み|見る}て", "それを見て") == "それを{見|み|見る}て",
   "máy tự chép lại chỗ sai ngoài ngoặc (話し始め, 驚いた, それを); thêm さん thì để nguyên")
ok(story.restore_story("「あ、いらっしゃいませ！」と[言い直す|いいなおす]ました。", "「あ、いらっしゃいませ！」と言い直しました。")
   == "「あ、いらっしゃいませ！」と[言い直し|いいなおし]ました。"
   and story.restore_story("そのぴくせる[画|が]を[見|み]て", "そのピクセル画を見て") == "そのピクセル[画|が]を[見|み]て"
   and story.restore_story("[言|い]って{みんなで|みんなで|みんなで}[困|こま]らせてしまいました。", "言ってみんなを困らせました。")
   == "[言|い]ってみんなを[困|こま]らせました。",
   "vá đuôi kana trong ngoặc (言い直すました → 言い直しました), katakana bị đổi sang hiragana (ぴくせる → ピクセル)")
ok(story.restore_story("「どこで[聞|き]ましたか」", "「どこで見ましたか」") == "「どこで[聞|き]ましたか」"
   and story.story_diffs(["「どこで[聞|き]ましたか」"], ["「どこで見ましたか」"]) == [(0, [("見", "聞")])],
   "đổi chữ Hán (見 → 聞) máy không vá được nhưng vẫn báo (trước đây \"đổi 1–2 chữ Hán\" được bỏ qua)")
ok(story.restore_story("[郵便屋|ゆうびんや]さんは[落|お]てしまいました。", PL[0]) == "[郵便屋|ゆうびんや]さんは[落|お]てしまいました。",
   "đoạn thiếu cả câu có chữ Hán → không vá dở, để Gemini chép lại")
def story_errs(doan0):
    plain = {"tieu_de": "古い手紙", "doan": [PL[0], "はなさんは少し驚いた。", "リンさんは笑いました。"]}
    raw = {"bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]", "doan": ["[村|むら]です。"]},
                   {"loai": "truyen", "ky": 1, "tieu_de": "[古|ふる]い[手紙|てがみ]", "doan": [doan0, "はなさんは[少|すこ]し[驚|おどろ]いた。",
                                                                                       "リンさんは[微笑|ほほえ]みました。"]}],
           "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
    r = ai.check(raw, {"trinh_do": "N4", "tu_vung": [], "ngu_phap": []}, {"story_plain": plain, "ky": 1})
    return [e for e in r.errors if "chép sai truyện" in e], [w for w in r.warnings if "chép sai truyện" in w]
KJ = {"tieu_de": "朝", "doan": ["今日は元気な声で朝の挨拶をしました。", "お茶を急いで運んで、大きな音を立てました。", "外の窓から風鈴の音が聞こえました。"]}
def kanji_err(doan):
    raw = {"bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]", "doan": ["[村|むら]です。"]}, {"loai": "truyen", "ky": 1, "tieu_de": "[朝|あさ]",
                                                                                             "doan": doan}],
           "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
    return any("chữ Hán của bản đã duyệt" in e for e in ai.check(raw, {"trinh_do": "N4", "tu_vung": [], "ngu_phap": []},
                                                                 {"story_plain": KJ, "ky": 1}).errors)
ok(kanji_err(["きょうはげんきなこえであさのあいさつをしました。", "おちゃをいそいではこんで、おおきなおとをたてました。", "そとのまどからふうりんのおとがきこえました。"])
   and not kanji_err(["[今日|きょう]は[元気|げんき]な[声|こえ]で[朝|あさ]のあいさつをしました。", "お[茶|ちゃ]を[急|いそ]いで[運|はこ]んで、[大|おお]きな[音|おと]を[立|た]てました。",
                      "[外|そと]の[窓|まど]から[風鈴|ふうりん]の[音|おと]が[聞|き]こえました。"]),
   "bước soát đổi gần hết chữ Hán của truyện sang kana (thử thật: 11 / 43) → lỗi; đổi vài chữ (挨拶 → あいさつ) thì được")
e1, w1 = story_errs("[郵便屋|ゆうびんや]さんは[落|お]てしまいました。")
ok(len(e1) == 1 and len(w1) == 1, "mất cả cụm (落てしまいました) → lỗi; đổi chữ nhỏ (笑い → 微笑み) → chỉ cảnh báo, không chặn số báo")
ok(paper.clean_issue(saved, "2026-11-07")["bai"][1]["dich"] == st_art["dich"], "clean_issue giữ bản dịch hợp lệ")
bad_d = json.loads(json.dumps(saved)); bad_d["bai"][1]["dich"] = ["một", "hai"]
ok(paper.clean_issue(bad_d, "2026-11-07")["bai"][1]["dich"] == [], "bản dịch sai số đoạn trong bao.json → không hiện")
old_fmt = [{"ky": 1, "ngay": "2026-11-01", "tom_tat": "cũ"}]
ai._write_json(os.path.join(sd4, "truyen.json"), old_fmt)
ok(story.load_story(sd4)[0]["tom_tat"] == "cũ", "đọc được truyen.json định dạng cũ (1.22)")

print("== máy tự đưa kana ra ngoài ngoặc furigana (thử Gemini thật 07/11: [お願|ねが] làm cả số không lưu)")
fx = lambda t: ai._fix_jp(t, {"お茶"}, set(), [])
ok(fx("[お願|ねが]いします") == "お[願|ねが]いします" and fx("[ご飯|はん]") == "ご[飯|はん]" and fx("[食べ|た]ます") == "[食|た]べます",
   "[お願|ねが] → お[願|ねが], [ご飯|はん] → ご[飯|はん], [食べ|た] → [食|た]べ")
ok(fx("[お願|おねが]いします") == "[お願|おねが]いします" and fx("{お茶|おちゃ|お茶}を") == "{お茶|おちゃ|お茶}を"
   and fx("[取り消し|とりけし]") == "[取り消し|とりけし]", "cách đọc đã có kana đó thì để nguyên")
print("== dạng từ điển trong ngoặc + phần chia viết tiếp (thử Gemini thật 07/11: \"開くくと\", \"緊張するしていました\")")
KV = {paper.norm_key(x) for x in ["開く", "優しい", "緊張する", "驚く", "間違える", "持つ", "行く", "書く", "読む"]}
sf = lambda t: paper.surface(ai._fix_jp(t, KV, set(), []))
ok(sf("ドアが{開く|ひら|開く}くと") == "ドアが開くと" and sf("{優しい|やさ|優しい}しく") == "優しく"
   and sf("{緊張する|きんちょう|緊張する}していました") == "緊張していました", "bỏ kana lặp: 開くく → 開く, 優しいしく → 優しく, するして → して")
ok(sf("{驚く|おどろ|驚く}いた") == "驚いた" and sf("{持つ|も|持つ}っていた") == "持っていた" and sf("{間違える|まちが|間違える}えちゃった") == "間違えちゃった"
   and sf("{書く|か|書く}かない") == "書かない" and sf("{読む|よ|読む}んで") == "読んで", "động từ nhóm 1 / 2: bỏ đuôi dạng từ điển khi phần chia viết tiếp")
ok(sf("ドアを{開く|ひら|開く}と") == "ドアを開くと" and sf("{行く|い|行く}ことにしました") == "行くことにしました"
   and sf("{行く|い|行く}つもり") == "行くつもり" and sf("[食べる|た]。") == "食べる。", "dạng từ điển đứng trước trợ từ / こと / つもり / 。 → giữ")
ok(ai._fix_jp("{落|お}として", set(), set(), []) == "[落|お]として" and ai._fix_jp("[学生|がくせい|学生]", {"学生"}, set(), []) == "{学生|がくせい|学生}",
   "nhầm ngoặc: {落|お} → [落|お], [学生|がくせい|学生] → {学生|…}")
ok(paper.surface(ai._fix_jp("この[葉|はっ]ぱの[色|いろ]", set(), set(), [])) == "この葉っぱの色"
   and ai._fix_jp("この[葉|はっ]ぱ", set(), set(), []) == "この[葉|は]っぱ" and ai._fix_jp("[学|がっ][校|こう]", set(), set(), []) == "[学|がっ][校|こう]",
   "[葉|はっ]ぱ → [葉|は]っぱ (chữ hiện \"葉ぱ\"); [学|がっ][校|こう] để nguyên")
KO = {paper.norm_key(x) for x in ["少し", "困った", "古い", "過ごす", "召し上がる", "優しい", "静か", "落とす", "書く", "見つめる", "案内する"]}
so = lambda t: paper.surface(ai._fix_jp(t, KO, set(), []))
ok(so("{少|すこ|少し}[困|こま]った") == "少し困った" and so("{困|こま|困った}た[顔|かお]") == "困った顔" and so("{古|ふる|古い}[店|みせ]") == "古い店"
   and so("{優|やさ|優しい}い[人|ひと]") == "優しい人" and so("{少|すこ|少し}ずつ") == "少しずつ" and so("{静|しず|静か}に") == "静かに"
   and so("「{召|めし|召し上がる}[上|うえ]がって」") == "「召し上がって」",
   "okurigana chỉ nằm trong từ gốc (Flash-Lite: 少困った, 困た, 古店) → máy chèn lại")
ok(ai._fix_jp("{過|す|過ごす}ぎていました", KO, set(), []) == "[過|す]ぎていました" and ai._fix_jp("{落|お|落とす}ちました", KO, set(), []) == "[落|お]ちました"
   and so("{書|か|書く}かない") == "書かない" and so("{見|み|見つめる}つめて") == "見つめて" and so("{案内|あんない|案内する}を") == "案内を",
   "từ gốc lệch hẳn chữ viết (過ぎて ↔ 過ごす) → bỏ liên kết, giữ chữ; chia đúng thì để nguyên")
RD = {"今週末": {"こんしゅうまつ"}, "今日": {"きょう", "こんにち"}}
ok(ai._fix_jp("[今週末|こんしうまつ]に", set(), set(), [], readings=RD) == "[今週末|こんしゅうまつ]に"
   and ai._fix_jp("[今日|こんにち]は", set(), set(), [], readings=RD) == "[今日|こんにち]は",
   "cách đọc khác deck (Flash-Lite: こんしうまつ, sửa 3 lần không xong) → lấy cách đọc của deck; deck có nhiều cách đọc thì để nguyên")
def base_err(t, k):
    raw = {"bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]", "doan": [t]}], "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
    return any("từ gốc là" in e for e in ai.check(raw, {"trinh_do": "N4", "tu_vung": [[k, "", "x", "deck"]], "ngu_phap": []}, {"short": True}).errors)
ok(base_err("「{召|めし|召し上がる}[上|うえ]がってください」", "召し上がる") and base_err("[紙|かみ]が{落|お|落とす}ちました。", "落とす"),
   "từ gốc không khớp chữ viết tiếp (召上がって, 落ちました ↔ 落とす) → báo lỗi cho Gemini sửa")
ok(not any(base_err(t, k) for t, k in [("{見|み|見つめる}つめていました。", "見つめる"), ("{持|も|持ってくる}って[行|い]きました。", "持ってくる"),
                                        ("{案内|あんない|案内する}をしました。", "案内する"), ("{優|やさ|優しい}しさ。", "優しい"),
                                        ("{始|はじ|始まる}まりました。", "始まる"), ("{召し|めし|召し上がる}[上|あ]がって。", "召し上がる")]),
   "chia đúng (見つめて, 持って, 案内を, 優しさ, 始まり, 召し上がって) → không báo")
ok(not any("không khớp phần kana" in e for e in ai.check({"bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]",
                                                                  "doan": [ai._fix_jp("よろしく[お願|ねが]いします。", set(), set(), [])]}]},
                                                        {"tu_vung": []}, {"short": True}).errors), "sau khi tự sửa: hết lỗi")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
