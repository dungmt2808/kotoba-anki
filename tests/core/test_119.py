"""Test offline cho 1.19: báo 畑新聞 tiếng Anh (The Garden Gazette) — ai_en + phần theo ngôn ngữ của paper_core.

Chạy: python test_119.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.18]
Không cần mạng, không cần Qt; không có gói `anki` thì dùng tests/stubs. Có thư mục bản 1.18 thì chạy cả mã 1.18 thật
đọc + lưu trạng thái báo → khoá mới của báo tiếng Anh vẫn còn.
"""
import copy, importlib.util, json, os, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai
import ai_en
import paper_core as paper

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


DECK = json.load(open(os.path.join(HERE, "..", "fixtures", "en_deck_a2.json"), encoding="utf-8"))["tu_vung"]
PLANTS = [{"nid": i, "word": w, "reading": r, "meaning": m, "kind": "vocab", "lang": "en", "stage": 1 + i % 3,
           "stability": 4.0, "wilted": i % 25 == 0, "thirsty": False} for i, (w, r, m) in enumerate(DECK)]
PLANTS += [{"nid": 900, "word": "学生", "reading": "がくせい", "meaning": "học sinh", "kind": "vocab", "lang": "ja", "stage": 2},
           {"nid": 901, "word": "flow", "reading": "", "meaning": "chảy", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 902, "word": "corn", "reading": "", "meaning": "ngô", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 903, "word": "even", "reading": "", "meaning": "thậm chí", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 904, "word": "be", "reading": "", "meaning": "thì, là", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 905, "word": "rose", "reading": "", "meaning": "hoa hồng", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 906, "word": "ice-cream", "reading": "", "meaning": "kem", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 907, "word": "Monday", "reading": "", "meaning": "thứ Hai", "kind": "vocab", "lang": "en", "stage": 1},
           {"nid": 908, "word": "to grow (v)", "reading": "[ɡrəʊ]", "meaning": "trồng, lớn lên", "kind": "vocab",
            "lang": "en", "stage": 1},
           {"nid": 909, "word": "학교", "reading": "", "meaning": "trường học", "kind": "vocab", "lang": "other", "stage": 1}]
SCOPE = ai_en.scope_from_plants(PLANTS, "A2")

print("== phạm vi từ deck tiếng Anh")
words = {r[0] for r in SCOPE["tu_vung"]}
ok(SCOPE["lang"] == "en" and SCOPE["trinh_do"] == "A2", "lang en, trình độ A2")
ok("学生" not in words and "학교" not in words and "apple" in words and "to grow (v)" in words,
   "chỉ lấy cây tiếng Anh (%d từ)" % len(words))
row = next(r for r in SCOPE["tu_vung"] if r[0] == "to grow (v)")
ok(row[1] == "/ɡrəʊ/", "IPA trong [..] chuẩn về /…/: %s" % row[1])
ok(all(g["bai"] in ("CEFR A1", "CEFR A2") for g in SCOPE["ngu_phap"]) and len(SCOPE["ngu_phap"]) > 20,
   "ngữ pháp A1 + A2 (%d mẫu)" % len(SCOPE["ngu_phap"]))
ok(SCOPE["trong_tam"]["ngu_phap"] and all(g.startswith("cefr:A2-") for g in SCOPE["trong_tam"]["ngu_phap"]),
   "mẫu trọng tâm = mẫu đúng trình độ A2")
ok(ai_en.scope_from_plants(PLANTS, "B1")["ngu_phap"][-1]["bai"] == "CEFR B1", "B1 có thêm mẫu B1")
ok(ai_en.scope_from_plants(PLANTS, "Z9")["trinh_do"] == "A2", "trình độ lạ → A2")
ok("trình độ A2" in ai.describe_scope(SCOPE), "mô tả phạm vi: " + ai.describe_scope(SCOPE))

print("== máy nối tra từ (dạng gốc)")
idx = ai_en.LinkIndex(SCOPE)
cases = {"went": "go", "goes": "go", "going": "go", "gone": "go", "cities": "city", "bigger": "big", "happier": "happy",
         "studied": "study", "made": "make", "making": "make", "baked": "bake", "brought": "bring", "leaves": "leaf",
         "carried": "carry", "smiling": "smile", "visited": "visit", "Monday": "Monday", "bridges": "bridge",
         "painted": "paint", "children": None, "flowers": "flower", "corners": None}
bad = [(t, idx.lookup(t), want) for t, want in cases.items() if idx.lookup(t) != want]
ok(not bad, "biến đổi → từ gốc (went → go, cities → city, bigger → big…): %s" % (bad or "đúng hết"))
nots = ["news", "evening", "bed", "best", "corner", "flower" if False else "flow", "seed", "wedding", "is", "was", "the"]
wrong = [(t, idx.lookup(t)) for t in ["news", "evening", "bed", "best", "corner", "seed", "wedding", "is", "was", "teacher"]
         if idx.lookup(t) not in (None,) and not (t == "evening" and idx.lookup(t) == "evening")]
ok(not wrong, "không nối nhầm news→new, evening→even, bed/best→be, corner→corn, teacher→teach, is/was→be: %s"
   % (wrong or "đúng"))
ok(idx.lookup("flowing") == "flow" and idx.lookup("flower") == "flower", "flowing → flow nhưng flower vẫn là flower")
s = "Mrs. Rose looked after the old bridge on Monday. Rose painted it. They went to the city for ice-cream. Linh's new bike is bigger."
spans = {s[a:b]: k for a, b, k in idx.spans(s)}
ok("Rose" in spans and spans.get("looked after") == "look after", "cụm từ: looked after → look after")
ok([k for a, b, k in idx.spans(s) if s[a:b] == "Rose" and a < 10] == [], "Mrs. Rose (tên riêng sau Mrs.) không nối")
ok(spans.get("ice-cream") == "ice-cream" and spans.get("bigger") == "big" and spans.get("new") == "new",
   "từ có gạch nối, so sánh hơn, từ sau sở hữu cách: %s" % {k: spans.get(k) for k in ("ice-cream", "bigger", "new")})
out = ai_en.link_texts([s], set(), idx, [])[0]
ok("{looked after||look after}" in out and "{went||go}" in out and out.count("{Rose||rose}") == 1,
   "đánh dấu {chữ||từ gốc}, mỗi từ một chỗ: " + out[:90])
ok(paper.surface(out) == s and paper.keys(out)[:3] == ["look after", "old", "bridge"], "surface() trả lại đúng chữ, keys() ra từ gốc")
title = ai_en.link_texts(["StackChan Paints the Old Bridge"], {0}, idx, [])[0]
ok(title == "StackChan {Paints||paint} the {Old||old} {Bridge||bridge}", "tiêu đề viết hoa từng chữ vẫn nối: " + title)
ok(ai_en.sentences('"Good morning," said Linh. Mr. Oakley smiled! Is it new? Yes.') ==
   ['"Good morning," said Linh.', 'Mr. Oakley smiled!', 'Is it new?', 'Yes.'], "tách câu (không tách sau Mr.)")

ISSUE = {
    "bai": [
        {"loai": "tin_lang", "tieu_de": "StackChan Paints the **Old Bridge**", "doan": [
            "Yesterday StackChan went to the old bridge with a big box of paints. He painted a happy sun on the bridge.",
            "Many people from the village came to see it. \"It is new and beautiful!\" said Ben. Even Mr. Oakley smiled.",
            "In the evening, the wind was cold, but StackChan was not tired. He always wants to try again."]},
        {"loai": "truyen", "ky": 1, "ky_truoc": "", "tieu_de": "A New Job for Linh", "doan": [
            "Linh arrived in Kotoba Village on Monday. She was nervous, but Hana smiled at her.",
            "\"Can you make tea?\" Hana asked. \"Yes, I can,\" said Linh. She made tea for three customers. "
            "Then she read the menu again and again.",
            "Later, a man came into the café. He looked very sad and hungry. What was his problem?"]},
        {"loai": "cot", "tieu_de": "StackChan's Corner", "doan": [
            "Hello, friends! Today I want to bake a cake for the festival. Hana will look after me in the kitchen. "
            "I usually make mistakes, but I always learn something new. Wish me luck!"]}],
    "cau_hoi": [
        {"hoi": "What did StackChan paint?", "chon": ["A happy sun", "A big tree", "A new bike"], "dung": 0,
         "giai_thich": "Bài 1 viết: He painted a happy sun on the bridge."},
        {"hoi": "Who asked Linh to make tea?", "chon": ["Ben", "Hana", "Mr. Oakley"], "dung": 1,
         "giai_thich": "Hana hỏi Linh: \"Can you make tea?\""}],
    "chinh_ta": [{"cau": "She made tea for three customers.", "them_dap_an": []},
                 {"cau": "Hana will look after me in the kitchen.", "them_dap_an": []}],
    "mau_cau": ["cefr:A2-01", "can / can't", "cefr:Z9-99"],
    "tu_moi": [{"w": "spaceship", "r": "", "m": "tàu vũ trụ"}, {"w": "city", "r": "", "m": "thành phố"},
               {"w": "nervous", "r": "nɜːvəs", "m": "lo lắng"}],
    "tom_tat": "StackChan vẽ mặt trời lên cây cầu cũ; Linh bắt đầu làm ở quán The Kettle Café.",
    "tom_tat_truyen": "Linh đến làng và bắt đầu làm ở quán; cuối kỳ có một vị khách buồn bước vào.",
}
SCOPE2 = copy.deepcopy(SCOPE)
SCOPE2["tu_vung"] = [r for r in SCOPE2["tu_vung"] if r[0] != "nervous"]

print("== máy sửa + kiểm tra số báo tốt")
raw, notes = ai_en.autofix(copy.deepcopy(ISSUE), SCOPE2, {"max_new": 3, "ky": 1})
ok(paper.surface(raw["bai"][0]["tieu_de"]) == "StackChan Paints the Old Bridge", "bỏ markdown ** trong tiêu đề")
ok([w["w"] for w in raw["tu_moi"]] == ["nervous"] and raw["tu_moi"][0]["r"] == "/nɜːvəs/",
   "từ mới: bỏ từ đã có trong deck (city) và từ không dùng (spaceship), IPA chuẩn /…/: %s" % raw["tu_moi"])
ok(raw["mau_cau"] == ["cefr:A2-01", "cefr:A1-05"], "id mẫu câu: sửa \"can / can't\" → cefr:A1-05, bỏ id lạ: %s" % raw["mau_cau"])
keys = [k for b in raw["bai"] for t in [b["tieu_de"]] + b["doan"] for k in paper.keys(t)]
ok("nervous" in keys and "go" in keys and len(keys) == len(set(keys)) and len(keys) <= ai_en.LINK_MAX,
   "nối tra từ: %d chỗ, mỗi từ một chỗ, có từ mới nervous" % len(keys))
ok("evening" in keys and "even" in keys, "evening (từ của deck) nối evening, Even đầu câu nối even")
rep = ai_en.check(raw, SCOPE2, {"max_new": 3, "ky": 1})
ok(not rep.errors, "số báo tốt: không lỗi (%s)" % rep.errors)
raw2, notes2 = ai_en.autofix(copy.deepcopy(raw), SCOPE2, {"max_new": 3, "ky": 1})
ok(json.dumps(raw2, ensure_ascii=False) == json.dumps(raw, ensure_ascii=False) and not notes2,
   "sửa máy lần 2 không đổi gì (ổn định qua các lượt sửa / soát): %s" % notes2)
ct = [c["cau"] for c in raw["chinh_ta"]]
ok(paper.keys(ct[1]) == ["look after", "kitchen"] or "look after" in paper.keys(ct[1]),
   "câu chép cũng nối từ của deck (để ghi từ chép sai): %s" % ct[1])
plain = ai_en.plain_issue(raw)
ok("||" not in json.dumps(plain, ensure_ascii=False) and "||" in json.dumps(raw, ensure_ascii=False),
   "bản gửi Gemini sửa / soát không có đánh dấu tra từ")
LINK_RE = __import__("re").compile(r"\{[^{}]*\|\|[^{}]*\}")
ok(not LINK_RE.search(ai_en.repair_prompt(raw, ["x"], SCOPE2)) and not LINK_RE.search(ai_en.review_prompt(raw, SCOPE2, [])),
   "lời nhắc sửa / soát dùng chữ trơn")
ok("evening /ˈiːv.nɪŋ/ = buổi tối" in ai_en.review_prompt(raw, SCOPE2, []) and "\nflow = chảy" in
   ai_en.write_prompt(SCOPE2, {}, [], [], __import__("datetime").date(2026, 11, 4)), "danh sách từ: \"từ /IPA/ = nghĩa\"")

print("== kiểm tra bắt lỗi")


def errs(mod, opts=None):
    r = copy.deepcopy(ISSUE)
    mod(r)
    r, _n = ai_en.autofix(r, SCOPE2, opts or {"max_new": 3, "ky": 1})
    return ai_en.check(r, SCOPE2, opts or {"max_new": 3, "ky": 1}).errors


e = errs(lambda r: r["bai"][0]["doan"].__setitem__(0, "Hôm qua StackChan went to the cầu with paints."))
ok(any("tiếng Việt" in x for x in e), "lẫn tiếng Việt trong bài → lỗi")
e = errs(lambda r: r["bai"][1]["doan"].__setitem__(0, "Linh arrived in 東京 on Monday."))
ok(any("Nhật / Trung / Hàn" in x for x in e), "lẫn chữ Nhật → lỗi")
e = errs(lambda r: r["cau_hoi"][0].__setitem__("giai_thich", "Because he painted a happy sun on the bridge."))
ok(any("giai_thich" in x and "tiếng Việt" in x for x in e), "giải thích viết tiếng Anh → lỗi")
e = errs(lambda r: r["cau_hoi"][1].__setitem__("dung", 5))
ok(any("dung" in x for x in e), "đáp án đúng ngoài phạm vi → lỗi")
e = errs(lambda r: r["cau_hoi"][1].__setitem__("chon", ["Ben", "ben", "Hana"]))
ok(any("giống nhau" in x for x in e), "hai lựa chọn giống nhau → lỗi")
e = errs(lambda r: r["bai"].pop(1))
ok(any("bai" in x for x in e), "thiếu bài truyện / chỉ 2 bài → lỗi: %s" % e[:2])
e = errs(lambda r: [b.__setitem__("doan", b["doan"][:1]) for b in r["bai"]] and None or
         [r["bai"][i].__setitem__("doan", ["Hi."]) for i in range(3)])
ok(any("ngắn quá" in x for x in e), "báo ngắn quá → lỗi")
few = copy.deepcopy(ISSUE)
few["bai"] = [{"loai": "tin_lang", "tieu_de": "Quiet Day", "doan": ["Nothing happened in Kotoba Village today. " * 8]},
              {"loai": "truyen", "ky": 1, "tieu_de": "Linh", "doan": ["Linh sat there. She said hi to Hana. " * 8]},
              {"loai": "cot", "tieu_de": "Corner", "doan": ["Hello! This is all. " * 10]}]
few["chinh_ta"] = []
r3, _n = ai_en.autofix(few, SCOPE2, {"max_new": 3, "ky": 1})
e = ai_en.check(r3, SCOPE2, {"max_new": 3, "ky": 1}).errors
ok(any("DANH SÁCH TỪ VỰNG" in x for x in e), "gần như không dùng từ của deck → lỗi (gửi Gemini viết lại)")
ok("DANH SÁCH TỪ VỰNG ĐÃ HỌC" in ai_en.repair_prompt(r3, e, SCOPE2), "lời nhắc sửa kèm danh sách từ khi thiếu từ của deck")
direct = copy.deepcopy(raw)
direct["chinh_ta"][0]["cau"] = "She drank coffee with five friends."
e = ai_en.check(direct, SCOPE2, {"max_new": 3, "ky": 1}).errors
ok(any("nguyên văn" in x for x in e), "câu chép không có trong bài → lỗi")
fixed, n = ai_en.autofix(copy.deepcopy(direct), SCOPE2, {"max_new": 3, "ky": 1})
ok(all(ai_en.in_text(c["cau"], fixed) for c in fixed["chinh_ta"]) and len(fixed["chinh_ta"]) >= 2 and
   any("chọn lại câu chép" in x for x in n), "máy chọn lại câu chép trọn vẹn trong bài: %s"
   % [paper.surface(c["cau"]) for c in fixed["chinh_ta"]])
lo, hi = ai_en.DICT_WORDS["A2"]
ok(all(lo <= len(ai_en.words(c["cau"])) <= hi for c in fixed["chinh_ta"]), "câu máy chọn dài %d–%d từ" % (lo, hi))

print("== Job với Gemini giả lập")
good = copy.deepcopy(ISSUE)
first = copy.deepcopy(ISSUE)
first["bai"][0]["doan"][0] = "Hôm qua StackChan went to the cầu with a big box of paints."


class Fake(ai.Gemini):
    def __init__(self, review=None, good_issue=None, first_issue=None):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.prompts, self.review = [], review
        self.good, self.first = good_issue or good, first_issue or first

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.prompts.append((system, prompt))
        if len(self.prompts) == 1:
            return json.dumps(self.first, ensure_ascii=False)
        if "van_de" in json.dumps(schema or {}):
            return json.dumps({"van_de": [{"cho": "bai[0].doan[0]", "loi": "x", "sua": "y"}], "bao": self.review or self.good},
                              ensure_ascii=False)
        return json.dumps(self.good, ensure_ascii=False)


f = Fake()
d = tempfile.mkdtemp()
res = ai.Job(f, d, "2026-11-04", SCOPE2, {"max_new": 3, "story": "tiet_kiem"}).run()
steps = [x["buoc"] for x in ai.last_log(d, "2026-11-04")["buoc"]]
ok(res.get("ok") and res.get("lang") == "en", "viết → sửa lỗi tiếng Việt → soát → lưu (%s)" % (res.get("error") or steps))
ok("Bạn là người bản xứ" in f.prompts[0][0] and "The Garden Gazette" in f.prompts[0][0] and "A2" in f.prompts[0][0],
   "lời nhắc hệ thống tiếng Anh, trình độ A2")
ok("Máy kiểm tra tìm thấy" in f.prompts[1][1] and "tiếng Việt" in f.prompts[1][1], "lượt sửa gửi đúng lỗi")
saved = json.load(open(os.path.join(d, "bao", "2026-11-04", "bao.json"), encoding="utf-8"))
ok(saved.get("ngon_ngu") == "en" and saved["so"] == 1, "bao.json ghi ngon_ngu: en, số 1")
pv = json.load(open(os.path.join(d, "pham_vi.json"), encoding="utf-8"))
ok(len(pv["tu_vung"]) == len(SCOPE2["tu_vung"]) and pv["tu_vung"][0][3] == "deck", "pham_vi.json để tra nghĩa từ")
story = json.load(open(os.path.join(d, "truyen.json"), encoding="utf-8"))
ok(story and story[0]["ky"] == 1, "truyện kỳ 1 được ghi để kỳ sau viết tiếp")
# bản soát đổi gần hết từ của deck → giữ bản trước khi soát
swap = copy.deepcopy(ISSUE)
swap["bai"] = [{"loai": b["loai"], "ky": b.get("ky"), "tieu_de": "Quiet News", "doan": [
    "Linh and Hana went to the market. It was cold, so they bought bread and milk. Nothing much happened there. "
    "Somebody sat by the door and said hello to everybody nearby. Then everybody sat down for a while."] * 2}
    for b in ISSUE["bai"]]
swap["chinh_ta"] = [{"cau": "Linh and Hana went to the market.", "them_dap_an": []},
                    {"cau": "It was cold, so they bought bread and milk.", "them_dap_an": []}]
swap["bai"] = [{k: v for k, v in b.items() if v is not None} for b in swap["bai"]]
f2 = Fake(review=swap)
d2 = tempfile.mkdtemp()
res2 = ai.Job(f2, d2, "2026-11-04", SCOPE2, {"max_new": 3, "story": "tiet_kiem"}).run()
steps2 = [x["buoc"] for x in ai.last_log(d2, "2026-11-04")["buoc"]]
saved2 = json.load(open(os.path.join(d2, "bao", "2026-11-04", "bao.json"), encoding="utf-8"))
ok(res2.get("ok") and ("soat_mat_tra_tu" in steps2 or "dung_ban_truoc_soat" in steps2) and
   "Bridge" in paper.surface(saved2["bai"][0]["tieu_de"]),
   "bản soát bỏ gần hết từ của deck → dùng bản trước khi soát (%s)" % steps2)
log = "\n".join(ai.log_summary(ai.last_log(d, "2026-11-04")))
ok("Soát lần 2" in log and "✓ Xong" in log, "nhật ký cho tab Nguồn báo")
g2 = copy.deepcopy(good)
g2["bai"][1]["ky"], g2["bai"][1]["ky_truoc"] = 2, "Linh bắt đầu làm ở quán; có một vị khách buồn bước vào."
res3 = ai.Job(Fake(good_issue=g2, first_issue=g2), d, "2026-11-05", SCOPE2, {"max_new": 3, "story": "tiet_kiem"}).run()
ok(res3.get("so") == 2 and ai.numbering(d, "2026-11-06") == (3, 3), "đánh số riêng cho thư mục báo tiếng Anh")

print("== đọc báo tiếng Anh (paper_core)")
lib = paper.Library(d, "en")
iss = lib.issue("2026-11-04")
ok(iss["lang"] == "en" and paper.clean_issue({"bai": [{"tieu_de": "a", "doan": ["x"]}]}, "2026-11-04")["lang"] == "ja",
   "clean_issue: ngon_ngu en → lang en; không ghi → ja")
st = paper.empty_state()
v = paper.issue_view(lib, st, "2026-11-04", paper.Voice(tts_en=True))
ok(v["lang"] == "en" and v["chinh_ta"][0]["lang"] == "en" and v["chinh_ta"][0]["unit"] == "từ",
   "issue_view: lang en, câu chép đếm theo từ (%s %s)" % (v["chinh_ta"][0]["len"], v["chinh_ta"][0]["unit"]))
ok(v["tu"].get("go", {}).get("m") == "đi" and v["tu"].get("go", {}).get("r") == "/ɡəʊ/" and
   v["tu"].get("nervous", {}).get("moi"), "bấm từ: went → go (đi, /ɡəʊ/); nervous là từ mới")
ok(all(v["chinh_ta"][i]["audio"] for i in range(len(v["chinh_ta"]))) and all(all(a["audio"]) for a in v["bai"]),
   "không có file audio: giọng tiếng Anh của máy đọc được câu chép + từng đoạn")
ok("tiếng Anh" in v["voice_note"], "ghi chú giọng dự phòng: " + v["voice_note"])
vj = paper.issue_view(lib, st, "2026-11-04", paper.Voice(tts=True))
ok(not any(c["audio"] for c in vj["chinh_ta"]) and not any(any(a["audio"]) for a in vj["bai"]),
   "máy chỉ có giọng tiếng Nhật → không đọc báo tiếng Anh bằng giọng Nhật")
cv = paper.ct_voice(lib, "2026-11-04", 0, iss["chinh_ta"][0]["cau"], paper.Voice(tts_en=True), "en")
tgt = paper.play_target(cv["how"], cv.get("data"), True, lib, "2026-11-04", cv)
ok(tgt and tgt[0] == "tts_en" and tgt[2] == 0.7 and "||" not in tgt[1], "phát chậm câu chép: %s" % (tgt,))
sent = paper.surface(iss["chinh_ta"][0]["cau"])
typed = sent.lower().replace(".", "").replace(",", "")
r = paper.answer_issue_dictation(lib, st, "2026-11-04", 0, [typed], 100, paper.Voice(tts_en=True))
ok(r["ok"] and r["gained"] == paper.CT_COINS and r["lang"] == "en", 'chép "%s" (chữ thường, không dấu câu) → đúng +2 xu' % typed)
r = paper.answer_issue_dictation(lib, st, "2026-11-04", 1, ["hana will look at me in kitchen"], 100, paper.Voice(tts_en=True))
ok(not r["ok"] and "p:2026-11-04:1" in st["queue"] and any(k in st["miss"] for k in ("look after", "kitchen")),
   "chép sai → vào hàng ôn + ghi từ chép sai (từ gốc): %s" % list(st["miss"])[:3])
q = paper.answer_question(lib, st, "2026-11-04", 0, 0, paper.Voice(tts_en=True))
ok(q["ok"] and q["gained"] == paper.Q_COINS, "trả lời câu hỏi tiếng Anh đúng +2 xu")
ix = paper.index_view(lib, st)
ok(ix["lang"] == "en" and ix["issues"][0]["lang"] == "en", "kệ báo: lang en")
ok(paper.matches("{Went||go} home, didn't she?", [], ["went home did not she"], lang="en"),
   "chấm câu có đánh dấu tra từ: bỏ đánh dấu trước khi so (didn't = did not)")

print("== trạng thái đọc báo tiếng Anh: khoá riêng trong collection")


class FakeCol:
    def __init__(self):
        self.conf = {}

    def get_config(self, k, default=None):
        return copy.deepcopy(self.conf.get(k, default))

    def set_config(self, k, v):
        self.conf[k] = copy.deepcopy(v)


col = FakeCol()
tmp = tempfile.mkdtemp()
P_JA = paper.PaperState(os.path.join(tmp, "paper.json"), col_getter=lambda: col)
P_EN = paper.PaperState(os.path.join(tmp, "paper_en.json"), col_getter=lambda: col, key=paper.PAPER_KEY_EN)
sj, se = P_JA.load(), P_EN.load()
paper.mark_read(sj, "2026-11-04")
se["read"]["2026-11-04"] = {"q": {"0": 1}, "ct": {}, "coins": 2, "bonus": False}
P_JA.save(sj)
P_EN.save(se)
ok(set(col.conf) == {"kotoba_batake_paper", "kotoba_batake_paper_en"}, "hai khoá: kotoba_batake_paper + kotoba_batake_paper_en")
ok(P_EN.load()["read"]["2026-11-04"]["coins"] == 2 and P_JA.load()["read"]["2026-11-04"]["coins"] == 0,
   "báo Nhật và báo Anh cùng ngày không đụng nhau")
if OLD:
    spec = importlib.util.spec_from_file_location("old_paper", os.path.join(OLD, "paper_core.py"),
                                                  submodule_search_locations=[])
    sys.path.insert(0, OLD)
    for m in ("garden_core", "text_core", "fields_core", "season_core", "more_core"):
        sys.modules.pop(m, None)
    old = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old)
    sys.path.remove(OLD)
    OP = old.PaperState(os.path.join(tmp, "paper_old.json"), col_getter=lambda: col)
    so = OP.load()
    paper.mark_read(so, "2026-11-05")
    OP.save(so)
    ok(col.conf["kotoba_batake_paper_en"]["read"]["2026-11-04"]["coins"] == 2 and "2026-11-05" in
       col.conf["kotoba_batake_paper"]["read"], "mã 1.18 thật đọc + lưu trạng thái báo → khoá báo tiếng Anh vẫn nguyên")
else:
    print("  – bỏ qua vòng chạy mã 1.18 thật (không có thư mục bản cũ)")

print("\nKẾT QUẢ:", "TẤT CẢ OK" if not FAIL else "%d lỗi" % len(FAIL))
sys.exit(1 if FAIL else 0)
