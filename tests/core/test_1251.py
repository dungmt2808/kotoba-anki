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
import datetime, json, os, re, shutil, subprocess, sys, tempfile

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

print("== báo tiếng Việt: chỉ truyện + tin làng (1.25.2, không lấy thẻ)")
sc = ai_vi.scope()
ok(sc["lang"] == "vi" and not sc["kho"] and not sc["tu_vung"] and ai_vi.deck_count({}, sc) == 0, "phạm vi rỗng: không lấy thẻ")
P = ("Sáng nay chợ phiên của làng Kotoba đông hơn mọi tuần. Bác đưa thư kể rằng có người mang tới cả một xe bí ngô "
     "to bằng cái ghế, còn StackChan thì đứng cạnh vẽ lại từng quả bằng những ô vuông màu cam. Bà Hana mua một quả nhỏ "
     "để nấu chè, và hẹn cả làng tối nay qua quán nếm thử. Ai cũng cười vì cái ghế bí ngô.")


def vi_issue(diac=True):
    para = P if diac else "".join(c for c in P if not ai_vi.VI_MARK_RE.match(c))
    return {"bai": [{"loai": "tin_lang", "tieu_de": "Chợ phiên {đầu đông||#1}", "doan": [para, para]},
                    {"loai": "truyen", "ky": 1, "tieu_de": "Tấm bản đồ cũ", "doan": [P, P, P]},
                    {"loai": "cot", "tieu_de": "Góc của **StackChan**", "doan": ["◆ " + P]}],
            "cau_hoi": [{"hoi": "Ai mang tới xe bí ngô?", "chon": ["Bác đưa thư kể có người mang tới", "Bà Hana", "StackChan"],
                         "dung": 0, "giai_thich": "Tin làng kể bác đưa thư thấy xe bí ngô."},
                        {"hoi": "Bà Hana mua bí để làm gì?", "chon": ["Làm đèn", "Nấu chè", "Vẽ tranh"], "dung": "1",
                         "giai_thich": "Bà Hana mua một quả để nấu chè."}],
            "chinh_ta": [{"cau": "abc"}], "mau_cau": ["x"], "tu_moi": [{"w": "a", "m": "b"}],
            "tom_tat": "Chợ phiên đông vui, bí ngô to bằng cái ghế.", "tom_tat_truyen": "Lin thấy tấm bản đồ cũ."}


SP = {"tieu_de": "Tấm bản đồ cũ", "doan": [P, P, P]}
raw, notes = ai_vi.autofix(vi_issue(), sc, {"ky": 1, "story_plain": SP})
ok(raw["chinh_ta"] == [] and raw["mau_cau"] == [] and raw["tu_moi"] == [] and raw["cau_hoi"][1]["dung"] == 1
   and raw["bai"][0]["tieu_de"] == "Chợ phiên đầu đông" and raw["bai"][2]["tieu_de"] == "Góc của StackChan",
   "autofix: bỏ câu chép / mẫu câu / từ mới, bỏ đánh dấu + markdown, \"dung\" chuỗi → số")
rep = ai_vi.check(raw, sc, {"ky": 1, "story_plain": SP})
ok(not rep.errors, "số báo tốt (truyện chèn sẵn không tính độ dài): không lỗi (%s)" % rep.errors[:3])
ok(any("CÓ DẤU" in e for e in ai_vi.check(ai_vi.autofix(vi_issue(False), sc, {})[0], sc, {"ky": 1}).errors), "không dấu → lỗi")
b3 = ai_vi.autofix(vi_issue(), sc, {})[0]
b3["cau_hoi"] = b3["cau_hoi"][:1]
ok(any("câu hỏi" in e for e in ai_vi.check(b3, sc, {"ky": 1, "story_plain": SP}).errors), "1 câu hỏi (cần 2–4) → lỗi")
b4 = ai_vi.autofix(vi_issue(), sc, {})[0]
b4["bai"][0]["doan"][0] += " {x}"
ok(any("[ ] { } |" in e for e in ai_vi.check(b4, sc, {"ky": 1, "story_plain": SP}).errors), "còn ký tự đánh dấu → lỗi")
wp = ai_vi.write_prompt(sc, {"so": 3, "ky": 4, "story_plain": SP, "thoi_tiet": "sáng mưa, chiều nắng",
                             "tin_goc": [{"tieu_de": "Chợ phiên", "noi_dung": "Có xe bí ngô to."}]}, [], [], datetime.date(2026, 11, 8))
ok("Chủ Nhật, ngày 8/11/2026, mùa thu" in wp and "Thời tiết ở làng: sáng mưa, chiều nắng" in wp
   and "TIN HÔM NAY CỦA LÀNG" in wp and "Chợ phiên: Có xe bí ngô to." in wp and "DANH SÁCH THẺ" not in wp,
   "lời nhắc báo tiếng Việt: ngày, thời tiết của vườn, tin của bản gốc, không thẻ")
v = paper.clean_issue(dict(raw, ngon_ngu="vi"), "2026-11-08")
ok(v["lang"] == "vi" and v["chinh_ta"] == [] and v["tra_tu"] == {}, "paper_core: số tiếng Việt, không câu chép, không bảng tra")


print("== thời tiết của làng = trời trong vườn (sky.js)")
D8 = datetime.date(2026, 11, 8)
ok(story.weather_at(D8, 9) in story._WEATHER_VI and story.weather_at(D8, 9) == story.weather_at(D8, 10)
   and story.weather_at(D8, 9) == story.weather_at(D8, 11), "cùng khung 3 giờ (9–12) cùng thời tiết, ổn định")
vt = story.village_weather(D8)
ok(vt.startswith("cả ngày ") or vt.startswith("sáng "), "câu thời tiết: " + vt)
ok(any(story.weather_at(datetime.date(2026, 6, d), 9, "tsuyu") == "rain" for d in range(1, 30))
   and sum(story.weather_at(datetime.date(2026, 6, d), 9, "tsuyu") == "rain" for d in range(1, 30))
   >= sum(story.weather_at(datetime.date(2026, 6, d), 9) == "rain" for d in range(1, 30)), "giao diện Mùa mưa: mưa nhiều hơn")
node = shutil.which("node")
if node:
    js = os.path.join(TMP, "sky.js")
    open(js, "w").write("""const vm = require('vm'), fs = require('fs');
const ctx = { window: {}, document: { getElementById() { return null; } }, localStorage: { getItem() { return null; }, setItem() {} }, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(process.argv[2], 'utf8') + ';this.GS = GardenSky;', ctx);
const out = []; for (let i = 0; i < 40; i++) for (const h of [9, 15]) out.push(ctx.GS._weatherAuto(new Date(2026, 9, 1 + i, h, 0).getTime()));
console.log(JSON.stringify(out));""")
    r = subprocess.run([node, js, os.path.join(ADDON, "web", "sky.js")], capture_output=True, text=True)
    jsw = json.loads(r.stdout) if r.returncode == 0 else []
    pyw = [story.weather_at(datetime.date(2026, 10, 1) + datetime.timedelta(days=i), h) for i in range(40) for h in (9, 15)]
    ok(jsw == pyw, "80 khung (01/10 → 09/11, 9 giờ / 15 giờ): Python ra đúng thời tiết như sky.js" + ("" if r.returncode == 0 else ": " + r.stderr[-200:]))


print("== Một làng, một truyện: bản gốc chung, báo Nhật / Anh kể lại, báo Việt in bản gốc (Gemini giả)")
REPO = os.path.join(HERE, "..", "..")
JA_SCOPE = ai.scope_from_pham_vi(json.load(open(os.path.join(REPO, "kotoba_daily", "pham_vi.json"), encoding="utf-8")))
JA_RAW = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_112_n4.json"), encoding="utf-8"))
JA_FIXED, _n = ai.autofix(json.loads(json.dumps(JA_RAW)), JA_SCOPE, {"max_new": 3, "ky": 1})
JA_FIXED["tom_tat_truyen"] = "Lin bắt đầu làm ở ことば屋."
_jsb = next(b for b in JA_FIXED["bai"] if b["loai"] == "truyen")
JA_TELL = {"tieu_de": paper.surface(_jsb["tieu_de"]), "doan": [paper.surface(p) for p in _jsb["doan"]],
           "dich": ["Lin bắt đầu làm việc ở quán trọ.", "Có một vị khách đến.", "Hộp đỏ khẽ rung lên."][:len(_jsb["doan"])],
           "tu_moi": []}
EN_ISSUE = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_119_en_a2.json"), encoding="utf-8"))
EN_DECK = json.load(open(os.path.join(HERE, "..", "fixtures", "en_deck_a2.json"), encoding="utf-8"))["tu_vung"]
EN_SCOPE = ai_en.scope_from_plants([{"nid": i, "word": w, "reading": r, "meaning": m, "kind": "vocab", "lang": "en",
                                     "stage": 2, "stability": 4.0} for i, (w, r, m) in enumerate(EN_DECK)], "A2")
_esb = next(b for b in EN_ISSUE["bai"] if b["loai"] == "truyen")
EN_TELL = {"tieu_de": paper.surface(_esb["tieu_de"]), "doan": [paper.surface(p) for p in _esb["doan"]],
           "dich": ["Lin đến làng tuần này.", "Hôm qua cô phục vụ trà."][:len(_esb["doan"])], "tu_moi": []}
MASTER = {"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Tấm bản đồ cũ",
          "doan": [P, P, P], "nho": {"tom_tat": "Lin nhận một tấm bản đồ lạ.", "bo_ngo": ["cái giếng ở đâu"]},
          "tin": [{"tieu_de": "Chợ phiên đầu đông", "noi_dung": "Sáng nay chợ phiên đông vui, có cả xe bí ngô to bằng cái ghế."},
                  {"tieu_de": "Cây hồng chín", "noi_dung": "Cây hồng sau quán đã chín đỏ, bà Hana hẹn hái vào cuối tuần."}],
          "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay. Quả to nhất cười với tớ."]}}
ARC = {"ten": "Tấm bản đồ cũ", "muc_tieu": "tìm cái giếng", "bi_an": "giếng ở đâu", "nhan_vat_phu": "ông khách",
       "buoc": ["b%d" % i for i in range(1, 8)], "ket": "tìm thấy"}


class FakeVillage(ai.Gemini):
    """Trả lời theo khuôn được hỏi; số báo theo đúng báo hỏi (system prompt)."""

    def __init__(self, fail_master=False, fail_retell=False):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.asked = []
        self.fail_master, self.fail_retell = fail_master, fail_retell

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        kind = ("mach" if schema is story.ARC_SCHEMA else "goc" if schema is story.MASTER_SCHEMA else
                "ke_lai" if schema is story.RETELL_SCHEMA else "bien_tap" if schema is story.EDIT_SCHEMA else
                "truyen" if schema is story.STORY_SCHEMA else "soat" if "van_de" in json.dumps(schema or {}) else "so")
        lang = "vi" if "Báo Làng Kotoba" in system else "en" if "Garden Gazette" in system or "tiếng Anh" in system else "ja"
        self.asked.append((kind, lang, prompt))
        if kind == "mach":
            return json.dumps(ARC, ensure_ascii=False)
        if kind == "goc":
            if self.fail_master:
                raise ai.AIError("Mọi model bận.", "busy")
            return json.dumps(MASTER, ensure_ascii=False)
        if kind == "bien_tap":
            return json.dumps({"diem": {k: 4 for k in story.CRIT}, "loi": [], "goi_y": []}, ensure_ascii=False)
        if kind == "ke_lai":
            if self.fail_retell:
                return "{hỏng"
            return json.dumps(EN_TELL if lang == "en" else JA_TELL, ensure_ascii=False)
        m = re.search(r'"ky": (\d+)', prompt)
        if lang == "vi":
            iss = ai_vi.autofix(vi_issue(), sc, {})[0]
            iss["bai"] = [iss["bai"][0], iss["bai"][2]]
        elif lang == "en":
            iss = json.loads(json.dumps(EN_ISSUE))
        else:
            iss = json.loads(json.dumps(JA_FIXED))
        for b in iss["bai"]:
            if b.get("loai") == "truyen" and m:
                b["ky"] = int(m.group(1))
        if kind == "soat":
            return json.dumps({"van_de": [], "bao": iss}, ensure_ascii=False)
        return json.dumps(iss, ensure_ascii=False)


SH = os.path.join(TMP, "bao_chung")
JA_DIR, EN_DIR, VI_DIR = (os.path.join(TMP, x) for x in ("bao_gemini", "bao_gemini_en", "bao_gemini_vi"))
D = "2026-11-08"
OPTS = {"max_new": 3, "story": "hay", "tones": ["kinh_di", "hai"], "thoi_tiet": "sáng mưa, chiều nhiều mây", "story_base": SH}


def run_lang(fake, base, scope, date=D, opts=None):
    o = dict(OPTS, **(opts or {}))
    m, mlog = ai.ensure_master(fake, SH, date, o)
    o.update(master=m, _master_log=mlog)
    return ai.Job(fake, base, date, scope, o).run(), m


f1 = FakeVillage()
r_ja, m1 = run_lang(f1, JA_DIR, JA_SCOPE)
k1 = [k for k, _l, _p in f1.asked]
ok(r_ja.get("ok") and m1 and m1["ky"] == 1, "báo tiếng Nhật đầu tiên trong ngày: viết bản gốc rồi số báo (%s)" % (r_ja.get("error") or r_ja.get("loi") or "ok"))
ok(k1[:3] == ["mach", "goc", "bien_tap"] and "ke_lai" in k1 and k1.index("ke_lai") < k1.index("so"),
   "thứ tự: lập mạch → bản gốc (truyện + tin) → biên tập → kể lại bằng tiếng Nhật → viết số: %s" % k1)
gp = next(p for k, _l, p in f1.asked if k == "goc")
ok("THỜI TIẾT HÔM NAY Ở LÀNG (khớp với trời trong vườn): sáng mưa, chiều nhiều mây" in gp and "TIN LÀNG HÔM NAY" in gp
   and "Kinh dị nhẹ" in gp and "DANH SÁCH THẺ" not in gp and "MỤC THỨ BA (muc3): THÔNG BÁO" in gp,
   "lời nhắc bản gốc: thời tiết của vườn, tin làng, chủ đề, mục thứ ba (08/11 ngày chẵn: thông báo), không thẻ")
rp = next(p for k, _l, p in f1.asked if k == "ke_lai")
ok("KỂ LẠI kỳ 1" in rp and P[:40] in rp and "Lin → リンさん" in rp and "N4" in rp, "lời nhắc kể lại: bản gốc tiếng Việt, bảng tên, trình độ")
jp_issue_prompt = next(p for k, _l, p in f1.asked if k == "so")
ok("TIN HÔM NAY CỦA LÀNG" in jp_issue_prompt and "Chợ phiên đầu đông" in jp_issue_prompt and "Thời tiết ở làng: sáng mưa" in jp_issue_prompt
   and "TRUYỆN ĐÃ VIẾT SẴN" in jp_issue_prompt, "lượt viết số tiếng Nhật: truyện đã kể lại + tin làng của bản gốc + thời tiết")
ok(story.load_master(SH, D) and story.load_master(SH, D)["tin"][0]["tieu_de"] == "Chợ phiên đầu đông", "bản gốc lưu ở bao_chung/ban_goc/2026-11-08.json")
mem = story.load_story(SH)
ok(mem and mem[-1]["ky"] == 1 and mem[-1]["nguyen_van"] == MASTER["doan"], "bộ nhớ truyện chung ghi kỳ 1 bằng BẢN GỐC (tiếng Việt)")
ok(not os.path.isfile(os.path.join(JA_DIR, story.STORY_FILE)), "thư mục báo tiếng Nhật không còn bộ nhớ truyện riêng")
ja_out = json.load(open(ai.issue_path(JA_DIR, D), encoding="utf-8"))
ok(next(b for b in ja_out["bai"] if b["loai"] == "truyen")["ky"] == 1, "số tiếng Nhật: truyện kỳ 1")
log1 = ai.log_summary(ai.last_log(JA_DIR, D))
ok(any("Truyện chung hôm nay: kỳ 1" in x for x in log1) and any("Kể lại truyện" in x for x in log1),
   "nhật ký báo tiếng Nhật ghi bước bản gốc + kể lại: " + " | ".join(log1[:3]))
ok(story.set_feedback(SH, 1, "hay", "rùng mình thật"), "nhận xét \"Kỳ này hay\" ghi vào truyện chung")

f2 = FakeVillage()
r_en, m2 = run_lang(f2, EN_DIR, EN_SCOPE)
k2 = [k for k, _l, _p in f2.asked]
ok(r_en.get("ok") and m2["ky"] == 1 and "goc" not in k2 and "mach" not in k2 and k2[0] == "ke_lai",
   "báo tiếng Anh cùng ngày: KHÔNG viết bản gốc lần nữa, chỉ kể lại + viết số: %s (%s)" % (k2, r_en.get("error") or "ok"))
ok("Lin → Lin" in next(p for k, _l, p in f2.asked if k == "ke_lai") and "the Kotoba Inn" in next(p for k, _l, p in f2.asked if k == "ke_lai"),
   "kể lại tiếng Anh: tên chung (Lin, the Kotoba Inn)")
en_out = json.load(open(ai.issue_path(EN_DIR, D), encoding="utf-8"))
ok(next(b for b in en_out["bai"] if b["loai"] == "truyen")["ky"] == 1, "số tiếng Anh: cùng kỳ 1")
ok((story.feedback_of(SH, 1) or {}).get("y") == "hay", "báo thứ hai lưu lại kỳ 1 — nhận xét đã ghi vẫn còn")
ok(len([e for e in story.load_story(SH) if e["ky"] == 1]) == 1, "bộ nhớ chung chỉ một kỳ 1")

f3 = FakeVillage()
r_vi, m3 = run_lang(f3, VI_DIR, sc)
k3 = [k for k, _l, _p in f3.asked]
vi_out = json.load(open(ai.issue_path(VI_DIR, D), encoding="utf-8"))
vsb = next(b for b in vi_out["bai"] if b["loai"] == "truyen")
ok(r_vi.get("ok") and k3 == ["so", "soat"], "báo tiếng Việt cùng ngày: không viết truyện / kể lại, chỉ viết số: %s (%s)" % (k3, r_vi.get("error") or "ok"))
ok(vsb["doan"] == MASTER["doan"] and vsb["tieu_de"] == MASTER["tieu_de"] and [b["loai"] for b in vi_out["bai"]] == ["tin_lang", "truyen", "cot"],
   "số tiếng Việt: truyện = nguyên văn bản gốc, 3 bài")
vp = next(p for k, _l, p in f3.asked if k == "so")
ok("Cây hồng chín" in vp and "viết từ đúng các tin này" in vp, "lượt viết số tiếng Việt: viết tin làng từ tin của bản gốc")

print("== ngày hôm sau: kỳ 2 nối kỳ 1, tin nối tin")
f4 = FakeVillage()
r4, m4 = run_lang(f4, JA_DIR, JA_SCOPE, date="2026-11-09")
gp4 = next(p for k, _l, p in f4.asked if k == "goc")
ok(m4 and m4["ky"] == 2 and "NGUYÊN VĂN KỲ TRƯỚC (kỳ 1" in gp4 and P[:30] in gp4, "kỳ 2: nhà văn nhận nguyên văn kỳ 1 (tiếng Việt)")
ok("TIN MẤY SỐ TRƯỚC" in gp4 and "11-08 · Chợ phiên đầu đông" in gp4, "tin làng hôm sau nhận tin của số trước để nối tiếp")
ok("rùng mình thật" in gp4, "nhận xét của người đọc tới tay nhà văn kỳ sau")
ok("MỤC THỨ BA (muc3): CỘT NGẮN" in gp4, "09/11 ngày lẻ: mục thứ ba là cột của nhân vật")

print("== khi không viết được bản gốc / không kể lại được")
f5 = FakeVillage(fail_master=True)
m5, log5 = ai.ensure_master(f5, SH, "2026-11-10", OPTS)
ok(m5 is None and any(x.get("buoc") == "ban_goc_khong_co" for x in log5), "Gemini bận khi viết bản gốc → không có bản gốc, ghi nhật ký")
o5 = dict(OPTS, master=None, _master_log=log5)
r5 = ai.Job(f5, JA_DIR, "2026-11-10", JA_SCOPE, o5).run()
k5 = [k for k, _l, _p in f5.asked]
ok("truyen" not in k5 and "mach" not in k5[1:] and r5.get("ok"), "báo tiếng Nhật tự viết truyện trong lượt viết số (không chạy cả quy trình truyện riêng): %s (%s)" % (k5, r5.get("error") or "ok"))
ok([e["ky"] for e in story.load_story(SH)][-1] == 3, "kỳ 3 (báo tự viết) vẫn vào bộ nhớ chung")
f6 = FakeVillage()
m6, _l6 = ai.ensure_master(f6, SH, "2026-11-10", OPTS)
ok(m6 and m6["ky"] == 3 and not f6.asked and m6["truyen"]["lang"] == "ja", "báo khác cùng ngày: lấy luôn kỳ 3 đã có làm bản gốc (không gọi Gemini, không lệch chuyện)")
f7 = FakeVillage(fail_retell=True)
r7, m7 = run_lang(f7, EN_DIR, EN_SCOPE, date="2026-11-11")
ok(any(k == "ke_lai" for k, _l, _p in f7.asked) and "TRUYỆN HÔM NAY (bản gốc tiếng Việt, kỳ 4" in next(p for k, _l, p in f7.asked if k == "so"),
   "kể lại riêng hỏng → lượt viết số tự kể lại truyện chung (kỳ 4)")

print("== chuyển sang truyện chung lần đầu")
OLDJ = os.path.join(TMP, "old_ja")
story.save_episode(OLDJ, "2026-11-05", 7, {"doan": ["リンさんは…"], "nho": {"tom_tat": "Kỳ 7 cũ"}}, "古い地図")
SH2 = os.path.join(TMP, "bao_chung2")
ok(ai.migrate_story(SH2, [os.path.join(TMP, "khong_co"), OLDJ]) == OLDJ and story.load_story(SH2)[-1]["ky"] == 7,
   "chép bộ nhớ truyện của báo tiếng Nhật sang truyện chung (nối tiếp kỳ 7, không bắt đầu lại)")
ok(ai.migrate_story(SH2, [OLDJ]) == "", "đã có truyện chung thì không chép đè")
ok(ai.next_ky(story.load_story(SH2), "2026-11-08") == 8, "kỳ tiếp theo: 8")


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
# đợt đang chạy giữ chủ đề nếu còn trong danh sách; bỏ chủ đề đó → đợt mới (bản gốc chung)
ok(story.load_arc(SH)["giong"] == "kinh_di", "đợt 1 theo chủ đề đầu tiên đã chọn (Kinh dị nhẹ)")
fa = FakeVillage()
ai.ensure_master(fa, SH, "2026-11-12", dict(OPTS, tones=["de_thuong", "kinh_di"]))
ok([k for k, _l, _p in fa.asked][0] == "goc" and story.load_arc(SH)["giong"] == "kinh_di", "đợt kinh dị vẫn chạy (còn trong danh sách)")
fb2 = FakeVillage()
ai.ensure_master(fb2, SH, "2026-11-13", dict(OPTS, tones=["hai"]))
ok([k for k, _l, _p in fb2.asked][0] == "mach" and story.load_arc(SH)["giong"] == "hai", "bỏ chủ đề của đợt → lập đợt mới theo chủ đề mới")
ft = FakeVillage()
ai.ensure_master(ft, SH, "2026-11-14", dict(OPTS, tones=["hai"], story="tiet_kiem"))
ok([k for k, _l, _p in ft.asked] == ["goc"], "Truyện: Tiết kiệm → chỉ nhà văn (không biên tập / viết lại): %s" % [k for k, _l, _p in ft.asked])
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
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
