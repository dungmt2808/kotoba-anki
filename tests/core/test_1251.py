"""Test offline 1.25.1: báo tiếng Việt, gói báo bằng xu, chủ đề truyện chọn nhiều, báo không cần deck.

- Báo tiếng Việt (ai_vi): mục #số từ thẻ bất kỳ (HTML, cloze, [sound:] bỏ), đánh dấu {chữ||#số} (sửa các kiểu lệch,
  bỏ số không có, máy nối thêm mặt trước), không chép chính tả / mẫu câu / từ mới / dịch, kiểm tra tiếng Việt có dấu,
  số mục dùng, câu hỏi; bảng tra "#số" → mặt trước / mặt sau; Job viết trọn một số (mạch → nhà văn → biên tập → số →
  soát) với Gemini giả; paper_core đọc số tiếng Việt (không giọng đọc, không câu chép).
- Gói báo (more_core + GardenState): tặng thử 7 ngày một lần, mua tuần 100 / tháng 300 xu cộng dồn, trần 60 ngày, thiếu
  xu, tự gia hạn khi hết hạn (đủ xu), tắt tự gia hạn → hết hạn; dữ liệu cũ không có gói → sạch.
- Chủ đề truyện: chọn nhiều, mỗi đợt một chủ đề xoay vòng, đợt đang chạy giữ chủ đề nếu còn trong danh sách.
- Không dùng deck: lời nhắc tiếng Nhật / tiếng Anh viết theo trình độ, cho khai báo tới 12 từ mới; kiểm tra không báo
  "từ ngoài phạm vi"; bảng tra giữ 12 từ mới.
- Mã 1.25.0 thật (git) mở cùng dữ liệu có gói báo: lưu lại không mất gói.

Chạy: python test_1251.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.25.0]
"""
import datetime, json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import ai_core as ai
import ai_en
import ai_vi
import garden_core as core
import more_core
import paper_core as paper
import story_core as story

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


TMP = tempfile.mkdtemp(prefix="kb1251_")

print("== báo tiếng Việt: mục từ thẻ")
ok(ai_vi.clean_text("<b>Ngô&nbsp;Quyền</b><br>[sound:a.mp3]", 120) == "Ngô Quyền", "bỏ HTML, &nbsp;, [sound:]")
ok(ai_vi.clean_text("Năm {{c1::938}} có trận {{c2::Bạch Đằng::sông}}", 120) == "Năm 938 có trận Bạch Đằng", "cloze → chữ bên trong")
ok(ai_vi.clean_text("a<div>b</div>c", 120) == "a · b · c", "xuống dòng → ·")
ok(ai_vi.clean_text("x" * 300, 120).endswith("…") and len(ai_vi.clean_text("x" * 300, 120)) == 120, "cắt dài + …")
ok(not ai_vi.kho_ok({"word": "<img src=a.png>", "meaning": "ảnh"}), "thẻ chỉ có ảnh ở mặt trước: bỏ")
pk = {"kho": [{"word": "Ngô Quyền", "meaning": "Đánh thắng quân Nam Hán trên sông Bạch Đằng năm 938", "due": True},
              {"word": "sông Bạch Đằng", "meaning": "Nơi diễn ra ba trận thủy chiến lớn (938, 981, 1288)", "due": True},
              {"word": "Lý Thường Kiệt", "meaning": "Tác giả bài thơ Nam quốc sơn hà (theo truyền thuyết)", "due": False},
              {"word": "ngô quyền", "meaning": "trùng", "due": False},
              {"word": "사랑", "meaning": "tình yêu (tiếng Hàn)", "due": False},
              {"word": "Ty thể", "meaning": "Bào quan tạo năng lượng ATP cho tế bào", "due": True},
              {"word": "Định luật Ohm", "meaning": "I = U / R", "due": False},
              {"word": "Hà Nội", "meaning": "Thủ đô của Việt Nam", "due": False}],
      "decks": ["Lịch sử VN", "Sinh học"], "n_learned": 30}
sc = ai_vi.scope_from_pick(pk)
ok([m["id"] for m in sc["muc"]] == [1, 2, 3, 4, 5, 6, 7] and sc["muc"][3]["truoc"] == "사랑", "7 mục đánh số 1…7, bỏ mặt trước trùng (không phân biệt hoa thường)")
ok(sc["can_on"] == [1, 2, 5] and sc["lang"] == "vi", "mục đến hạn ôn hôm nay = trọng tâm")
ok("#1 ★ | Ngô Quyền |" in ai_vi.item_lines(sc) and ai_vi.item_lines(sc).splitlines()[0].startswith("#1 ★"), "danh sách thẻ gửi Gemini: ★ trước")

print("== đánh dấu {chữ||#số}")
notes = []
items = ai_vi._items(sc)
s = ai_vi.fix_marks("Năm 938, {Ngô Quyền|#1} và [sông Bạch Đằng|2] cùng {ai đó||#99} và **đậm**", items, notes)
ok(s == "Năm 938, {Ngô Quyền||#1} và {sông Bạch Đằng||#2} cùng ai đó và đậm", "sửa kiểu lệch, bỏ số không có, bỏ markdown: " + s)
ok(ai_vi.fix_marks("Giá {x} | y", items, []) == "Giá x / y", "ký tự đánh dấu lạ ngoài đánh dấu")
leak = ai_vi.fix_marks("◆ Thẻ #1: {Ngô Quyền||#1} - đánh thắng (#2) năm 938 ở thẻ số #3.", items, [])
ok(leak == "◆ {Ngô Quyền||#1} - đánh thắng năm 938 ở .", "bỏ số thẻ lộ ra bài (thử thật: \"Thẻ #1: …\"): " + leak)
t = ai_vi._auto_link(["Hôm nay ở Hà Nội trời đẹp. Hà Nội đông vui.", "Cô Lin học về ty thể."], items)
ok(t[0] == "Hôm nay ở {Hà Nội||#7} trời đẹp. Hà Nội đông vui." and "{ty thể||#5}" in t[1],
   "máy nối mặt trước có nguyên văn (lần đầu, cả chữ thường): %s" % t)
ok(ai_vi._auto_link(["Hà Nộiii"], items) == ["Hà Nộiii"], "không cắt giữa chữ")
lim = ai_vi._limit_links(["{a||#1} {a||#1} {a||#1} {a||#1}"])
ok(lim == ["{a||#1} {a||#1} {a||#1} a"], "mỗi mục tối đa 3 chỗ")


def vi_issue(n_items=6, diac=True):
    para = ("Sáng nay, StackChan dựng một mô hình nhỏ ngoài vườn. \"Năm 938, {Ngô Quyền||#1} cắm cọc gỗ dưới lòng "
            "{sông Bạch Đằng||#2}!\" cậu reo lên. Bà Hana mỉm cười, kể thêm rằng con sông ấy còn chứng kiến những trận "
            "thủy chiến lớn khác. Lin ghi chép rất chăm chỉ vào cuốn sổ nhỏ, rồi hỏi mãi không thôi về ngày xưa của làng ta. ")
    para2 = ("Buổi chiều, cả làng ra chợ. Ông trưởng làng kể về {Ty thể||#5} như một nhà máy điện tí hon trong tế bào, "
             "còn {Định luật Ohm||#6} thì được bác thợ điện giải thích bằng ấm nước. Mọi người cười vang, rồi ai nấy "
             "đều nhớ được bài học hôm nay. Lũ trẻ chạy theo, đòi nghe thêm chuyện về {Hà Nội||#7} ngày xưa. ")
    if not diac:
        para = para.replace("á", "a").replace("ầ", "a").replace("ư", "u").replace("ờ", "o").replace("ộ", "o").replace("ả", "a")
        para = "".join(c for c in para if not ai_vi.VI_MARK_RE.match(c))
    return {"bai": [{"loai": "tin_lang", "tieu_de": "StackChan dựng lại trận {Bạch Đằng||#2}", "doan": [para, para2, para]},
                    {"loai": "truyen", "ky": 1, "tieu_de": "Tấm bản đồ cũ", "doan": [para2, para, para2]},
                    {"loai": "cot", "tieu_de": "Sổ tay StackChan", "doan": ["◆ " + para, "◆ " + para2]}],
            "cau_hoi": [{"hoi": "Ai cắm cọc gỗ ở sông Bạch Đằng năm 938?", "chon": ["Ngô Quyền", "Lý Thường Kiệt", "Trần Hưng Đạo"],
                         "dung": 0, "giai_thich": "Tin làng kể Ngô Quyền cắm cọc năm 938."},
                        {"hoi": "Ty thể làm gì?", "chon": ["Tạo năng lượng", "Chứa nước", "Phân chia"], "dung": 0,
                         "giai_thich": "Ông trưởng làng ví ty thể như nhà máy điện."},
                        {"hoi": "Định luật Ohm nói về gì?", "chon": ["Khối lượng", "Dòng điện", "Ánh sáng"], "dung": "1",
                         "giai_thich": "Bác thợ điện giải thích bằng ấm nước."}],
            "chinh_ta": [{"cau": "abc"}], "mau_cau": ["x"], "tu_moi": [{"w": "a", "m": "b"}],
            "tom_tat": "Làng ôn lại trận Bạch Đằng và chuyện ty thể.", "tom_tat_truyen": "Lin tìm thấy tấm bản đồ cũ."}


raw, notes = ai_vi.autofix(vi_issue(), sc, {"ky": 1})
ok(raw["chinh_ta"] == [] and raw["mau_cau"] == [] and raw["tu_moi"] == [] and raw["cau_hoi"][2]["dung"] == 1,
   "autofix: bỏ chép chính tả / mẫu câu / từ mới, \"dung\" chuỗi → số")
rep = ai_vi.check(raw, sc, {"ky": 1})
ok(not rep.errors, "số báo tốt: không lỗi (%s)" % rep.errors[:3])
ok(ai_vi.deck_count(raw, sc) == 5 and ai_vi.focus_used(raw, sc) == [3, 3], "đếm mục dùng (5) và mục trọng tâm (3/3)")
bad = ai_vi.autofix(vi_issue(diac=False), sc, {"ky": 1})[0]
ok(any("CÓ DẤU" in e for e in ai_vi.check(bad, sc, {"ky": 1}).errors), "tiếng Việt không dấu → lỗi")
b2 = vi_issue()
b2["bai"][0]["doan"][0] += " {nhầm||#55}"
ok(any("không trỏ tới mục" in e for e in ai_vi.check(b2, sc, {"ky": 1}).errors), "kiểm tra (chưa sửa máy): số không có → lỗi")
b3 = ai_vi.autofix(vi_issue(), sc, {"ky": 1})[0]
b3["cau_hoi"] = b3["cau_hoi"][:1]
ok(any("câu hỏi" in e for e in ai_vi.check(b3, sc, {"ky": 1}).errors), "thiếu câu hỏi (cần 3–4) → lỗi")
b4 = ai_vi.autofix(vi_issue(), sc, {"ky": 1})[0]
for b in b4["bai"]:
    b["tieu_de"] = paper.surface(b["tieu_de"])
    b["doan"] = [paper.surface(p) for p in b["doan"]]
big = dict(sc, muc=sc["muc"] + [{"id": n, "truoc": "Mục %d" % n, "sau": "nội dung %d" % n, "due": False} for n in range(8, 30)])
ok(any("chỉ nhắc tới" in e for e in ai_vi.check(b4, big, {"ky": 1}).errors), "không dùng thẻ nào (danh sách dài) → lỗi")
nd = ai_vi.scope_from_pick({"kho": []})
nd["khong_deck"] = True
ok(not any("chỉ nhắc tới" in e for e in ai_vi.check(b4, nd, {"ky": 1}).errors), "Không dùng deck: không đòi dùng thẻ")
lk = ai_vi.build_lookup(paper.issue_texts(raw), sc)
ok(lk["tra_tu"]["#1"] == ["Ngô Quyền", "", "Đánh thắng quân Nam Hán trên sông Bạch Đằng năm 938", "deck"]
   and "#3" not in lk["tra_tu"] and lk["tra_sach"] == {"deck": "Lịch sử VN, Sinh học"}, "bảng tra: chỉ mục có trong bài")
wp = ai_vi.write_prompt(sc, {"so": 3, "ky": 1, "tones": ["kinh_di", "hai"]}, [], [], datetime.date(2026, 11, 8))
ok("DANH SÁCH THẺ" in wp and "{cụm chữ trong bài||#số" in ai_vi.system_prompt() and "Kinh dị nhẹ" in wp and "Hài" in wp
   and "Chủ Nhật, ngày 8/11/2026" in wp, "lời nhắc: danh sách thẻ, cách đánh dấu, chủ đề, ngày tiếng Việt")
ok("NGƯỜI ĐỌC CHƯA CHỌN THẺ" in ai_vi.write_prompt(nd, {"so": 1, "ky": 1}, [], [], datetime.date(2026, 11, 8)),
   "lời nhắc Không dùng deck: kiến thức chung")

print("== paper_core đọc số tiếng Việt")
base = os.path.join(TMP, "bao_gemini_vi")
saved = dict(raw, ngay="2026-11-08", so=3, ngon_ngu="vi", may_viet="Gemini (gemini-3.6-flash)", chinh_ta=[{"cau": "x"}])
saved.update(lk)
long_back = "dài " * 70
saved["tra_tu"]["#2"] = ["sông Bạch Đằng " * 5, "", long_back, "deck"]
ai._write_json(ai.issue_path(base, "2026-11-08"), saved)
lib = paper.Library(base, "vi")
iss = lib.issue("2026-11-08")
ok(iss["lang"] == "vi" and iss["chinh_ta"] == [], "lang vi, không có câu chép (kể cả khi file có)")
ok(len(iss["tra_tu"]["#2"][0]) > 40 and len(iss["tra_tu"]["#2"][2]) > 160, "bảng tra tiếng Việt giữ mặt trước / mặt sau dài hơn")
voice = paper.Voice(tts=True, tts_en=True)
v = paper.issue_view(lib, paper.empty_state(), "2026-11-08", voice)
ok(not any(any(b["audio"]) for b in v["bai"]) and v["voice_note"] == "" and v["chinh_ta"] == [],
   "không giọng đọc (kể cả máy có giọng), không câu chép")
ok(v["tu"]["#1"]["w"] == "Ngô Quyền" and v["tu"]["#1"]["m"].startswith("Đánh thắng") and v["tu"]["#1"]["bai"] == "Lịch sử VN, Sinh học",
   "bấm chữ gạch chân → mặt trước / mặt sau / deck")
st = paper.empty_state()
r1 = paper.answer_question(lib, st, "2026-11-08", 0, 0, voice)
r2 = paper.answer_question(lib, st, "2026-11-08", 1, 0, voice)
r3 = paper.answer_question(lib, st, "2026-11-08", 2, 1, voice)
ok(r1["ok"] and r3["bonus"] == paper.ISSUE_BONUS and st["read"]["2026-11-08"]["coins"] == 3 * paper.Q_COINS + paper.ISSUE_BONUS,
   "trả lời đủ 3 câu → +2 mỗi câu + 5 (không có câu chép vẫn nhận thưởng làm hết)")
ok(paper.index_view(lib, st)["issues"][0]["lang"] == "vi", "Kệ báo: số ghi lang vi")


print("== Job viết trọn một số tiếng Việt (Gemini giả)")
ARC = {"ten": "Tấm bản đồ cũ", "muc_tieu": "tìm cái giếng", "bi_an": "giếng ở đâu", "nhan_vat_phu": "ông khách",
       "buoc": ["b%d" % i for i in range(1, 8)], "ket": "tìm thấy"}
p1 = ("\"Bà Hana ơi, khách phòng ba muốn ăn sáng bằng một tấm bản đồ!\" Lin chạy vào bếp, tay vẫn cầm cuốn sổ nhỏ. "
      "Bà Hana đặt ấm trà xuống, nhìn cô rất lâu. StackChan lập tức chui vào tủ, lôi ra một chiếc đĩa sứ trắng. \"Tớ có đĩa. "
      "Bản đồ thì chưa nấu bao giờ,\" cậu nói rất nghiêm túc. Lin bật cười, rồi chợt nhớ ra Ngô Quyền từng vẽ bản đồ sông.")
PLAIN_VI = {"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Tấm bản đồ cũ",
            "doan": [p1, p1, p1], "dich": [], "tu_moi": [],
            "nho": {"tom_tat": "Lin nhận một tấm bản đồ lạ.", "bo_ngo": ["cái giếng ở đâu"]}}


class FakeVi(ai.Gemini):
    def __init__(self):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.asked = []

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        kind = ("mach" if schema is story.ARC_SCHEMA else "truyen" if schema is story.STORY_SCHEMA else
                "bien_tap" if schema is story.EDIT_SCHEMA else "soat" if "van_de" in json.dumps(schema or {}) else "so")
        self.asked.append((kind, system, prompt))
        if kind == "mach":
            return json.dumps(ARC, ensure_ascii=False)
        if kind == "truyen":
            return json.dumps(PLAIN_VI, ensure_ascii=False)
        if kind == "bien_tap":
            return json.dumps({"diem": {k: 4 for k in story.CRIT}, "loi": [], "goi_y": []}, ensure_ascii=False)
        two = vi_issue()
        two["bai"] = [two["bai"][0], two["bai"][2]]
        if kind == "soat":
            return json.dumps({"van_de": [], "bao": two}, ensure_ascii=False)
        return json.dumps(two, ensure_ascii=False)


vd = tempfile.mkdtemp(prefix="kb1251v_")
fv = FakeVi()
res = ai.Job(fv, vd, "2026-11-08", sc, {"max_new": 3, "story": "hay", "tones": ["kinh_di", "de_thuong"]}).run()
kinds = [k for k, _s, _p in fv.asked]
ok(res.get("ok") and res.get("lang") == "vi", "viết được số tiếng Việt (%s)" % (res.get("error") or res.get("loi") or "ok"))
ok(kinds == ["mach", "truyen", "bien_tap", "so", "soat"], "mạch → nhà văn → biên tập → viết số → soát: %s" % kinds)
wpv = next(p for k, _s, p in fv.asked if k == "truyen")
ok("Quán trọ nhỏ ở làng Kotoba" in wpv and "Kinh dị nhẹ" in wpv and "DANH SÁCH THẺ" in wpv and "MẪU NGỮ PHÁP" not in wpv,
   "lời nhắc nhà văn tiếng Việt: truyện riêng, chủ đề, thẻ (không mẫu ngữ pháp)")
ok("nhà văn viết truyện dài kỳ tiếng Việt" in next(s for k, s, _p in fv.asked if k == "truyen"), "system nhà văn tiếng Việt")
out = json.load(open(ai.issue_path(vd, "2026-11-08"), encoding="utf-8"))
art = [b["loai"] for b in out["bai"]]
ok(out["ngon_ngu"] == "vi" and art == ["tin_lang", "truyen", "cot"] and out["chinh_ta"] == [], "bao.json: ngon_ngu vi, 3 bài (truyện máy chèn), không câu chép")
stb = out["bai"][1]
ok(stb["ky"] == 1 and "dich" not in stb and "{Ngô Quyền||#1}" in stb["doan"][0], "truyện: không bản dịch, máy nối mục có nguyên văn (Ngô Quyền)")
ok("#1" in out["tra_tu"] and out["tra_tu"]["#1"][0] == "Ngô Quyền", "bảng tra của số có mục #1")
ok(story.load_arc(vd)["giong"] == "kinh_di", "đợt 1 theo chủ đề đầu tiên đã chọn (Kinh dị nhẹ)")
log = json.load(open(os.path.join(vd, "nhat_ky", "2026-11-08.json"), encoding="utf-8"))
ok("thẻ" in log["pham_vi"], "nhật ký: phạm vi ghi theo thẻ (%s)" % log["pham_vi"])


print("== chủ đề truyện chọn nhiều")
ok(story.norm_tones(["xx", "hai", "hai", "kinh_di"]) == ["hai", "kinh_di"] and story.norm_tones([]) == ["am"]
   and story.norm_tones("bi_an") == ["bi_an"], "làm sạch: bỏ lạ / trùng, rỗng → Ấm áp, chuỗi kiểu 1.23 vẫn đọc")
ok(story.next_tone(["hai", "kinh_di", "de_thuong"], {"giong": "kinh_di"}) == "de_thuong"
   and story.next_tone(["hai", "kinh_di"], {"giong": "kinh_di"}) == "hai"
   and story.next_tone(["hai"], {"giong": "am"}) == "hai" and story.next_tone(["hai", "ky_ao"], None) == "hai",
   "đợt mới: chủ đề kế tiếp, xoay vòng")
tt = story.tone_text(["hai", "kinh_di"], "kinh_di")
ok(tt.startswith("Kinh dị nhẹ:") and "KHÔNG máu me" in tt and "cũng thích: Hài" in tt, "câu dặn: chủ đề chính + pha nhẹ chủ đề khác")
ok(set(story.TONES) >= {"am", "hai", "bi_an", "phieu_luu"} and len(story.TONES) == 8, "8 chủ đề, giữ id cũ của 1.23")
# đợt đang chạy giữ chủ đề nếu còn trong danh sách; bỏ chủ đề đó → đợt mới
fv2 = FakeVi()
ai.Job(fv2, vd, "2026-11-09", sc, {"max_new": 3, "story": "hay", "tones": ["de_thuong", "kinh_di"]}).run()
ok([k for k, _s, _p in fv2.asked][0] == "truyen" and story.load_arc(vd)["giong"] == "kinh_di", "kỳ 2: đợt kinh dị vẫn chạy (còn trong danh sách)")
fv3 = FakeVi()
ai.Job(fv3, vd, "2026-11-10", sc, {"max_new": 3, "story": "hay", "tones": ["hai"]}).run()
ok([k for k, _s, _p in fv3.asked][0] == "mach" and story.load_arc(vd)["giong"] == "hai", "bỏ chủ đề của đợt → lập đợt mới theo chủ đề mới")
jp_scope = {"tu_vung": [], "kho": [], "ngu_phap": ai.builtin_grammar("N4"), "trinh_do": "N4", "khong_deck": True}
jp = ai.write_prompt(jp_scope, {"so": 1, "ky": 2, "tones": ["kinh_di", "hai"], "max_new": 12}, [], [], datetime.date(2026, 11, 8))
ok("CHỦ ĐỀ TRUYỆN: Kinh dị nhẹ" in jp, "báo tiếng Nhật (Tiết kiệm): chủ đề đã chọn")


print("== Không dùng deck (theo trình độ)")
ok("NGƯỜI HỌC CHƯA CÓ DECK" in jp and "8–12" in jp and "DANH SÁCH TỪ VỰNG ĐÃ HỌC" not in jp, "lời nhắc tiếng Nhật: tự chọn 8–12 từ, không danh sách từ")
jraw = {"bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]のニュース", "doan": ["[今日|きょう]は{雪|ゆき|雪}が{降|ふ|降る}りました。" * 12]},
                {"loai": "truyen", "ky": 1, "tieu_de": "[雪|ゆき]の[日|ひ]", "doan": ["[今日|きょう]は{寒|さむ|寒い}いです。" * 12]},
                {"loai": "cot", "tieu_de": "[一言|ひとこと]", "doan": ["[今日|きょう]は{寒|さむ|寒い}いです。" * 6]}],
        "cau_hoi": [{"hoi": "[何|なに]が[降|ふ]りましたか。", "chon": ["[雪|ゆき]", "[雨|あめ]", "[花|はな]"], "dung": 0,
                     "giai_thich": "Bài nói tuyết rơi."},
                    {"hoi": "[今日|きょう]はどうですか。", "chon": ["[寒|さむ]い", "[暑|あつ]い", "[暖|あたた]かい"], "dung": 0,
                     "giai_thich": "Bài nói hôm nay lạnh."}],
        "chinh_ta": [{"cau": "[今日|きょう]は{雪|ゆき|雪}が{降|ふ|降る}りました。", "them_dap_an": []},
                     {"cau": "[今日|きょう]は{寒|さむ|寒い}いです。", "them_dap_an": []}],
        "mau_cau": [], "tu_moi": [{"w": "雪", "r": "ゆき", "m": "tuyết"}, {"w": "降る", "r": "ふる", "m": "rơi"},
                                  {"w": "寒い", "r": "さむい", "m": "lạnh"}],
        "tom_tat": "Tuyết rơi ở làng.", "tom_tat_truyen": "Trời lạnh."}
jrep = ai.check(jraw, jp_scope, {"max_new": 12, "ky": 1})
ok(not any("phạm vi" in e or "tu_moi" in e for e in jrep.errors), "kiểm tra: từ khai báo trong tu_moi không bị coi là ngoài phạm vi (%s)" % jrep.errors[:2])
many = dict(jraw, tu_moi=[{"w": "語%d" % i, "r": "ご", "m": "từ"} for i in range(12)])
ok(not any("tối đa" in e for e in ai.check(many, jp_scope, {"max_new": 12, "ky": 1}).errors), "cho khai báo 12 từ mới")
ok(any("tối đa 3" in e for e in ai.check(many, jp_scope, {"max_new": 3, "ky": 1}).errors), "có deck: vẫn tối đa 3")
cl = paper.clean_issue(dict(many, ngay="2026-11-08"), "2026-11-08")
ok(len(cl["tu_moi"]) == 12, "paper_core giữ 12 từ mới (bảng tra của số không deck)")
en_scope = ai_en.scope_from_pick({"kho": [], "all": [], "decks": []}, "B1")
en_scope["khong_deck"] = True
ep = ai_en.write_prompt(en_scope, {"so": 1, "ky": 1, "max_new": 12}, [], [], datetime.date(2026, 11, 8))
ok("NGƯỜI HỌC CHƯA CÓ DECK" in ep and "B1" in ep and "DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/" not in ep, "lời nhắc tiếng Anh theo trình độ B1")
ok(ai.describe_scope(en_scope) == "không dùng deck · trình độ B1", "nhật ký: không dùng deck · trình độ")
wpj = story.writer_prompt("ja", jp_scope, 1, "am", None, [], "mùa thu")
ok("KHÔNG CÓ DANH SÁCH TỪ" in wpj and "N4" in wpj, "nhà văn tiếng Nhật không deck: dùng từ thông dụng đúng trình độ")


print("== gói báo")
D = datetime.date(2026, 11, 8)
sub = more_core.clean_sub(None)
ok(sub == {"until": None, "plan": "tuan", "auto": True, "trial": None, "paid": None}, "chưa có gói: sạch, tự gia hạn bật")
ok(more_core.clean_sub({"until": "hỏng", "plan": "nam", "auto": 0, "trial": 5}) == {"until": None, "plan": "tuan", "auto": True, "trial": None, "paid": None},
   "dữ liệu lạ → mặc định")
ok(more_core.sub_trial(sub, D) and sub["until"] == "2026-11-14" and more_core.sub_left(sub, D) == 7, "tặng thử 7 ngày (8 → 14/11)")
ok(not more_core.sub_trial(sub, D + datetime.timedelta(days=30)), "chỉ tặng thử một lần")
ok(more_core.sub_left(sub, datetime.date(2026, 11, 14)) == 1 and more_core.sub_left(sub, datetime.date(2026, 11, 15)) == 0,
   "ngày cuối còn báo; hôm sau hết")
ok(more_core.sub_buy(sub, "tuan", D) == 100 and sub["until"] == "2026-11-21", "mua tuần khi còn gói: cộng vào sau ngày cuối (21/11)")
ok(more_core.sub_buy(sub, "thang", D) == 300 and sub["until"] == "2026-12-21" and sub["plan"] == "thang", "mua tháng: +30 ngày, gói = tháng")
try:
    more_core.sub_buy(sub, "thang", D)
    capped = False
except more_core.MoreError as e:
    capped = "gần hết" in str(e)
ok(capped, "trần 60 ngày phía trước (còn 44 + 30 > 60 → báo, không trừ)")
s2 = more_core.clean_sub({"until": "2026-11-01", "trial": "2026-10-25"})
more_core.sub_buy(s2, "tuan", D)
ok(s2["until"] == "2026-11-14", "đang hết hạn: tính từ hôm nay (8 → 14/11)")
v = more_core.sub_view(more_core.clean_sub({"until": "2026-11-14", "trial": "2026-11-08"}), D)
ok(v["in_trial"] and v["left"] == 7 and v["plans"][0]["price"] == 100 and v["plans"][1]["price"] == 300, "xem: đang dùng thử, giá 100 / 300")


def fresh(name, coins):
    d = os.path.join(TMP, name)
    os.makedirs(d)
    st = core.GardenState(os.path.join(d, "wallet.json"))
    data = st.load()
    data["coins"] = coins
    st.save(data)
    return d, st


d1, st1 = fresh("sub1", 250)
ok(st1.paper_sub_ensure("2026-11-08") == ("trial", 0) and st1.load()["coins"] == 250, "số báo đầu tiên: tặng thử, không trừ xu")
ok(st1.paper_sub_ensure("2026-11-10") == ("ok", 0), "đang dùng thử: viết được")
ok(st1.paper_sub_ensure("2026-11-15") == ("renewed", 100) and st1.load()["coins"] == 150
   and st1.load()["more"]["paper_sub"]["until"] == "2026-11-21", "hết thử + tự gia hạn + đủ xu → gia hạn tuần, −100")
st1.paper_sub_auto(False)
ok(st1.paper_sub_ensure("2026-11-22") == ("expired", 0) and st1.load()["coins"] == 150, "tắt tự gia hạn → hết hạn, không trừ")
st1.paper_sub_auto(True)
data = st1.load()
data["coins"] = 50
st1.save(data)
ok(st1.paper_sub_ensure("2026-11-22") == ("expired", 0), "tự gia hạn nhưng thiếu xu → hết hạn")
try:
    st1.paper_sub_buy("tuan", "2026-11-22")
    poor = ""
except core.HomeError as e:
    poor = str(e)
ok("Chưa đủ xu" in poor and st1.load()["coins"] == 50 and st1.load()["more"]["paper_sub"]["until"] == "2026-11-21",
   "mua khi thiếu xu: báo lỗi, không đổi gói")
data = st1.load()
data["coins"] = 1000
st1.save(data)
st1.paper_sub_buy("thang", "2026-11-22")
ok(st1.load()["coins"] == 700 and st1.load()["more"]["paper_sub"]["until"] == "2026-12-21", "mua tháng khi đã hết hạn: 22/11 → 21/12, −300")
raw_more = json.load(open(os.path.join(d1, "more.json"), encoding="utf-8")) if os.path.isfile(os.path.join(d1, "more.json")) else None
ok(raw_more is None or "paper_sub" in json.dumps(raw_more), "gói báo lưu ở tầng MORE_KEY")

OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
if not OLD:
    repo = os.path.abspath(os.path.join(HERE, "..", ".."))
    o = os.path.join(TMP, "old1250")
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", repo, "archive", "1912fb7", "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
        OLD = os.path.join(o, "kotoba_batake")
    except Exception as e:
        print("  (bỏ qua phần mã 1.25.0 thật: %s)" % e)
if OLD:
    print("== mã 1.25.0 thật mở cùng dữ liệu có gói báo")
    script = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
data = st.load()
data["coins"] += 5
st.save(data)
print(json.dumps({"coins": data["coins"]}))
'''
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(d1, "wallet.json")], capture_output=True, text=True)
    ok(r.returncode == 0, "1.25.0 đọc + lưu được" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    after = st1.load()
    ok(after["coins"] == 705 and after["more"]["paper_sub"]["until"] == "2026-12-21" and after["more"]["paper_sub"]["plan"] == "thang",
       "về 1.25.1: gói báo còn nguyên sau khi 1.25.0 lưu (xu +5)")

shutil.rmtree(TMP, ignore_errors=True)
shutil.rmtree(vd, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
