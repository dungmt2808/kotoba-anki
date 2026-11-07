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
e, _w = story.check_story(dict(PLAIN, tu_moi=[{"w": "落とし物", "r": "otoshimono", "m": "đồ đánh rơi"}]), "ja", "N4", ai._bad_kanji)
ok(any("kana" in x for x in e), "từ mới đọc bằng romaji (thử thật: \"orugōru\") → lỗi")
ok(story.clean_translation(["U哇, cái hộp!"], 1) is None, "bản dịch lọt chữ Trung (thử thật: \"U哇\") → bỏ")
ok(story.clean_translation(["Hello there"], 1) is None, "bản dịch không phải tiếng Việt → bỏ")
ok(story.clean_translation(["Một", "hai"], 1) is None, "sai số đoạn → bỏ")
ok(story.story_matches(sb["doan"], PLAIN["doan"]) > 0.99 and story.story_matches(sb["doan"], ["全然違う話です。"] * 3) < 0.5,
   "so bài truyện có furigana với bản chữ trơn")
ok(paper.clean_issue(saved, "2026-11-07")["bai"][1]["dich"] == st_art["dich"], "clean_issue giữ bản dịch hợp lệ")
bad_d = json.loads(json.dumps(saved)); bad_d["bai"][1]["dich"] = ["một", "hai"]
ok(paper.clean_issue(bad_d, "2026-11-07")["bai"][1]["dich"] == [], "bản dịch sai số đoạn trong bao.json → không hiện")
old_fmt = [{"ky": 1, "ngay": "2026-11-01", "tom_tat": "cũ"}]
ai._write_json(os.path.join(sd4, "truyen.json"), old_fmt)
ok(story.load_story(sd4)[0]["tom_tat"] == "cũ", "đọc được truyen.json định dạng cũ (1.22)")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
