"""Test offline 1.25.8 — truyện chung giữa báo Claude Code (kotoba_daily) và Gemini (add-on), người dùng hỏi 11/11:
"bình thường claude sẽ soạn báo cho mình, nhưng hôm khác gemini soạn thì câu chuyện có đồng bộ không".

- Claude → Gemini: `ai.claude_episodes` đọc số báo thật kỳ 1–8 (bản dịch = nguyên văn, "Đã xảy ra" của truyen.md = tóm tắt
  + chỗ bỏ ngỏ, tên kana → Latin), `import_claude_story` chép sang bộ nhớ chung (giữ số kỳ, bỏ mạch cũ, bản gốc 3 ngày
  gần nhất có tin làng), Gemini viết kỳ 9 nối đúng kỳ 8; chép lại không trùng; bộ nhớ chung có truyện riêng cũ hơn →
  đánh số tiếp; Claude đã viết hôm nay → bản gốc hôm nay = kỳ của Claude (báo tiếng Anh kể lại, không viết truyện khác).
- Gemini → Claude: `export_story_for_claude` ghi kotoba_daily/truyen_chung.json (chỉ kỳ Gemini viết);
  tools/pham_vi.py: kỳ tiếp theo, `ky_them`, `ban_goc_hom_nay`; file hỏng không làm hỏng pham_vi.json.
- Dữ liệu hỏng: số báo JSON lỗi, số rút gọn, bản dịch có chữ Nhật, thiếu truyen.md, không có thư mục.
- Nối dây trong __init__.py + lời nhắc của Claude.

Chạy: python test_1258.py THƯ_MỤC_ADD_ON
"""
import json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai
import story_core as story

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


TMP = tempfile.mkdtemp(prefix="kb1258_")
KD = os.path.join(TMP, "kotoba_daily")
shutil.copytree(os.path.join(REPO, "kotoba_daily"), KD, ignore=shutil.ignore_patterns("audio", "*.html", "__pycache__"))
for f in ("truyen_chung.json",):
    if os.path.exists(os.path.join(KD, f)):
        os.remove(os.path.join(KD, f))

P = ("Sáng hôm ấy, Lin mang túi hạt giống xuống vườn Kotoba. StackChan chạy theo sau, tay ôm cuốn sổ vẽ, miệng hỏi liên "
     "tục rằng hạt này sẽ mọc thành cây gì. Bà Hana đứng ở hiên quán, nhìn hai người rồi mỉm cười. Ông Ken nói hồi nhỏ "
     "ông từng gieo hạt cùng bà Hana ở chỗ quán cũ trên núi, và ông vẫn nhớ mùi đất sau cơn mưa đầu đông năm đó.")
MASTER = {"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Hạt giống đầu đông",
          "doan": [P, P, P], "nho": {"tom_tat": "Lin gieo túi hạt của bà Hana ở vườn Kotoba.", "bo_ngo": ["hạt sẽ mọc thành cây gì"]},
          "tin": [{"tieu_de": "Gió lạnh đầu đông", "noi_dung": "Sáng nay gió lạnh thổi qua làng, mọi nhà đều phơi chăn sớm."},
                  {"tieu_de": "Trưởng làng và tấm vé số", "noi_dung": "Trưởng làng vẫn chưa dám mở tấm vé số mua tuần trước."}],
          "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay. Quả to nhất cười với tớ."]}}
ARC = {"ten": "Hạt giống đầu đông", "muc_tieu": "gieo hạt", "bi_an": "cây gì", "nhan_vat_phu": "ông Ken",
       "buoc": ["b%d" % i for i in range(1, 8)], "ket": "cây nảy mầm"}


class Fake(ai.Gemini):
    def __init__(self):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.asked = []

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        kind = ("mach" if schema is story.ARC_SCHEMA else "goc" if schema is story.MASTER_SCHEMA else
                "bien_tap" if schema is story.EDIT_SCHEMA else "?")
        self.asked.append((kind, prompt))
        if kind == "mach":
            return json.dumps(ARC, ensure_ascii=False)
        if kind == "goc":
            return json.dumps(MASTER, ensure_ascii=False)
        return json.dumps({"diem": {k: 4 for k in story.CRIT}, "loi": [], "goi_y": []}, ensure_ascii=False)


OPTS = {"max_new": 3, "story": "hay", "tones": ["am"], "thoi_tiet": "sáng nắng, chiều nhiều mây"}

print("== tên tiếng Nhật trong tóm tắt của Claude → tên Latin")
for a, b in (("bà はな và ông けん gặp lại", "bà Hana và ông Ken gặp lại"), ("けんちゃん viết thư", "Ken-chan viết thư"),
             ("はなさん cười", "chị Hana cười"), ("bà はな cười", "bà Hana cười"), ("hỏi 村長（そんちょう）", "hỏi trưởng làng"), ("スタックちゃん vẽ", "StackChan vẽ"),
             ("ở ことば屋", "ở Quán Kotoba"), ("nói nhầm お書きします", "nói nhầm お書きします"), ("「はな」", "「はな」"),
             ("きょうこ", "Kyouko"), ("まっちゃ", "Maccha")):
    ok(ai.vi_names(a) == b, "%r → %r (%r)" % (a, b, ai.vi_names(a)))

print("== Claude → Gemini: đọc 8 số báo thật của kotoba_daily")
eps = ai.claude_episodes(KD, "2026-11-30")
ok([e["ky"] for e in eps] == list(range(1, 9)) and [e["ngay"] for e in eps][-1] == "2026-11-08", "8 kỳ, ngày 01 → 08/11")
ok(all(e["nguyen_van"] and not story.CJK_RE.search("".join(e["nguyen_van"])) for e in eps), "nguyên văn = bản dịch tiếng Việt (không chữ Nhật)")
e8 = eps[-1]
ok("hộp thiếc" in e8["tom_tat"] and "Ken" in e8["tom_tat"] and not story.CJK_RE.search(e8["tom_tat"].split("「")[0]),
   "tóm tắt kỳ 8 lấy từ \"Đã xảy ra\" của truyen.md, tên Latin: " + e8["tom_tat"][:90])
ok(e8["bo_ngo"] == ["đó là gì"] and eps[1]["bo_ngo"] and "bà của chị Hana" in eps[1]["bo_ngo"][0], "chỗ bỏ ngỏ: %s / %s" % (e8["bo_ngo"], eps[1]["bo_ngo"]))
ok(e8["tin"] and story.clean_news(e8["tin"]) and e8["muc3"] and e8["tieu_de_vi"].startswith("Trong hộp thiếc"),
   "tin làng + thông báo của số (bản dịch), tiêu đề tiếng Việt: %r" % e8["tieu_de_vi"])
ok([e["ky"] for e in ai.claude_episodes(KD, "2026-11-05")] == [1, 2, 3, 4, 5], "chỉ lấy số tới ngày đang viết")

print("== chép sang bộ nhớ chung rồi Gemini viết ngày 09/11")
SH = os.path.join(TMP, "bao_chung")
ok(ai.import_claude_story(SH, KD, "2026-11-09") == 8, "bộ nhớ chung trống: chép 8 kỳ")
mem = story.load_story(SH)
ok([e["ky"] for e in mem] == list(range(1, 9)) and all(e.get("nguon") == "claude" for e in mem), "giữ đúng số kỳ của Claude, đánh dấu nguồn")
ok(story.load_master(SH, "2026-11-08") and story.load_master(SH, "2026-11-08")["truyen"]["tieu_de"].startswith("Trong hộp thiếc")
   and not story.load_master(SH, "2026-11-01"), "bản gốc cho 3 ngày gần nhất (tiêu đề tiếng Việt), không viết lại cả 8 ngày")
ok(any("08-08" in x or "11-08" in x for x in story.recent_news(SH, "2026-11-09")), "tin làng của số Claude vào lịch sử tin (nối tin)")
ok(ai.import_claude_story(SH, KD, "2026-11-09") == 0 and len(story.load_story(SH)) == 8, "chép lại lần nữa: không trùng")
f = Fake()
m, log = ai.ensure_master(f, SH, "2026-11-09", dict(OPTS, story_base=SH))
arcp = next((p for k, p in f.asked if k == "mach"), "")
goc = next((p for k, p in f.asked if k == "goc"), "")
ok(m and m["ky"] == 9, "Gemini viết kỳ 9 (%s)" % (m and m["ky"]))
ok("Kỳ 8:" in arcp and "hộp thiếc" in arcp and "Đợt mới bắt đầu từ kỳ 9" in arcp and "(chưa có kỳ nào)" not in arcp,
   "lập mạch nối tiếp kỳ 1–8 của Claude (trước 1.25.8: \"chưa có kỳ nào … bắt đầu từ kỳ 1\")")
ok("hộp thiếc" in goc and ("túi nhỏ" in goc or "lá thư" in goc), "lời nhắc viết kỳ 9 có nguyên văn kỳ 8 (bản dịch)")
# số báo lưu xong thì Job ghi kỳ vào bộ nhớ chung (ai.Job._save → save_episode với bản gốc)
story.save_episode(SH, "2026-11-09", 9, {"doan": m["truyen"]["doan"], "nho": m["truyen"]["nho"]}, m["truyen"]["tieu_de"])

print("== Gemini → Claude: truyen_chung.json + pham_vi.py")
ok(ai.export_story_for_claude(SH, KD), "ghi kotoba_daily/truyen_chung.json")
tc = json.load(open(os.path.join(KD, ai.CLAUDE_EXPORT), encoding="utf-8"))
ok([r["ky"] for r in tc["ky"]] == [9] and tc["ky"][0]["ngay"] == "2026-11-09" and tc["ky"][0]["doan"] == MASTER["doan"],
   "chỉ có kỳ Gemini viết (kỳ 9), không chép ngược kỳ của Claude")
ok(not ai.export_story_for_claude(SH, KD), "không đổi gì thì không ghi lại")


def pham_vi(today):
    r = subprocess.run([sys.executable, os.path.join(KD, "tools", "pham_vi.py")], capture_output=True, text=True,
                       env=dict(os.environ, KB_TODAY=today), cwd=TMP)
    pv = json.load(open(os.path.join(KD, "pham_vi.json"), encoding="utf-8"))
    return r, pv["truyen"]


r, t = pham_vi("2026-11-10")
ok(t["ky_tiep_theo"] == 10 and [x["ky"] for x in t["ky_them"]] == [9] and not t["ban_goc_hom_nay"]
   and "kỳ 9 (2026-11-09) đã đăng trong add-on" in r.stdout, "hôm sau: Claude viết kỳ 10, biết kỳ 9 đã đăng ở add-on: " + r.stdout.strip().splitlines()[-1])
r, t = pham_vi("2026-11-09")
ok(t["ky_tiep_theo"] == 9 and t["ban_goc_hom_nay"] and t["ban_goc_hom_nay"]["ky"] == 9 and not t["ky_them"]
   and "kể lại kỳ này" in r.stdout, "cùng ngày (Gemini viết trước cho báo tiếng Anh): Claude kể lại kỳ 9")
open(os.path.join(KD, ai.CLAUDE_EXPORT), "w").write("{hỏng")
r, t = pham_vi("2026-11-10")
ok(r.returncode == 0 and t["ky_tiep_theo"] == 9 and t["ky_them"] == [] and "truyen_chung.json" in r.stdout,
   "truyen_chung.json hỏng: báo lỗi, vẫn ra pham_vi.json (kỳ tiếp theo theo số của Claude)")
ai.export_story_for_claude(SH, KD)

print("== Claude viết kỳ 10 hôm sau → Gemini ngày kế tiếp nối kỳ 10")
d10 = os.path.join(KD, "bao", "2026-11-10")
os.makedirs(d10, exist_ok=True)
iss = json.load(open(os.path.join(KD, "bao", "2026-11-08", "bao.json"), encoding="utf-8"))
iss["ngay"] = "2026-11-10"
for b in iss["bai"]:
    if b["loai"] == "truyen":
        b["ky"] = 10
        b["dich"] = ["Mầm cây đầu tiên nhú lên dưới lớp đất ẩm, Lin reo lên gọi cả quán ra xem."] + b["dich"][1:]
iss["tom_tat"] = "Truyện kỳ 10: mầm cây đầu tiên nhú lên trong vườn Kotoba."
json.dump(iss, open(os.path.join(d10, "bao.json"), "w"), ensure_ascii=False)
ok(ai.import_claude_story(SH, KD, "2026-11-11") == 1, "chép thêm đúng 1 kỳ (kỳ 10)")
mem = story.load_story(SH)
ok([e["ky"] for e in mem][-3:] == [8, 9, 10] and mem[-1]["nguon"] == "claude" and mem[-2].get("nguon") != "claude"
   and "mầm cây" in mem[-1]["tom_tat"], "bộ nhớ chung: 8 (Claude) → 9 (Gemini) → 10 (Claude): " + mem[-1]["tom_tat"][:60])
ok(not os.path.exists(os.path.join(SH, story.ARC_FILE)), "có kỳ mới từ Claude: bỏ mạch cũ để lập mạch nối tiếp")
f2 = Fake()
m2, _l = ai.ensure_master(f2, SH, "2026-11-11", dict(OPTS, story_base=SH))
ok(m2 and m2["ky"] == 11 and "Mầm cây đầu tiên" in next((p for k, p in f2.asked if k == "goc"), ""), "Gemini ngày 11/11: kỳ 11, nối kỳ 10 (%s)" % (m2 and m2["ky"]))

print("== Claude đã viết hôm nay → báo tiếng Anh kể lại đúng kỳ của Claude")
SH2 = os.path.join(TMP, "bao_chung2")
ai.import_claude_story(SH2, KD, "2026-11-08")
f3 = Fake()
m3, l3 = ai.ensure_master(f3, SH2, "2026-11-08", dict(OPTS, story_base=SH2))
ok(m3 and m3["ky"] == 8 and m3["truyen"]["doan"] == eps[-1]["nguyen_van"] and not [k for k, _p in f3.asked if k in ("mach", "goc")],
   "bản gốc 08/11 = kỳ 8 của Claude, không gọi Gemini viết truyện khác")
story.save_episode(SH2, "2026-11-08", 8, {"doan": m3["truyen"]["doan"], "nho": m3["truyen"]["nho"]}, m3["truyen"]["tieu_de"])
ok(story.load_story(SH2)[-1].get("nguon") == "claude" and not ai.export_story_for_claude(SH2, os.path.join(TMP, "kd_rong")),
   "báo tiếng Anh lưu lại kỳ 8: vẫn là kỳ của Claude (không ghi ngược sang truyen_chung.json)")

print("== bộ nhớ chung đã có truyện riêng cũ hơn")
SH3 = os.path.join(TMP, "bao_chung3")
os.makedirs(SH3)
json.dump([{"ky": 1, "ngay": "2026-10-30", "tom_tat": "Guốc gỗ tự xoay ở quán.", "nguyen_van": [P]},
           {"ky": 2, "ngay": "2026-11-05", "tom_tat": "Bóng ma hình vuông.", "nguyen_van": [P]}],
          open(os.path.join(SH3, story.STORY_FILE), "w"), ensure_ascii=False)
json.dump(ARC | {"tu_ky": 1}, open(os.path.join(SH3, story.ARC_FILE), "w"), ensure_ascii=False)
ok(ai.import_claude_story(SH3, KD, "2026-11-09") == 3, "chỉ chép các kỳ Claude đăng sau kỳ cuối (05/11): 06, 07, 08")
mem3 = story.load_story(SH3)
ok([(e["ky"], e.get("ky_claude")) for e in mem3] == [(1, None), (2, None), (6, 6), (7, 7), (8, 8)],
   "số kỳ của Claude lớn hơn → giữ: %s" % [(e["ky"], e.get("ky_claude")) for e in mem3])
SH4 = os.path.join(TMP, "bao_chung4")
os.makedirs(SH4)
json.dump([{"ky": k, "ngay": "2026-10-%02d" % (10 + k), "tom_tat": "x", "nguyen_van": [P]} for k in range(1, 13)],
          open(os.path.join(SH4, story.STORY_FILE), "w"), ensure_ascii=False)
ai.import_claude_story(SH4, KD, "2026-11-09")
ok([e["ky"] for e in story.load_story(SH4)][-8:] == list(range(13, 21)), "số kỳ của Claude nhỏ hơn → đánh số tiếp (13…20)")

os.makedirs(os.path.join(TMP, "kd_rong"), exist_ok=True)

print("== dữ liệu hỏng")
KB = os.path.join(TMP, "kd_hong")
os.makedirs(os.path.join(KB, "bao", "2026-11-01"))
os.makedirs(os.path.join(KB, "bao", "2026-11-02"))
os.makedirs(os.path.join(KB, "bao", "2026-11-03"))
os.makedirs(os.path.join(KB, "bao", "khong-phai-ngay"))
open(os.path.join(KB, "bao", "2026-11-01", "bao.json"), "w").write("{hỏng")
json.dump({"rut_gon": True, "bai": [{"loai": "tin_lang", "tieu_de": "x", "doan": ["x"]}]}, open(os.path.join(KB, "bao", "2026-11-02", "bao.json"), "w"))
json.dump({"bai": [{"loai": "truyen", "ky": 3, "tieu_de": "t", "doan": ["あ"], "dich": ["có chữ あ Nhật"]}, "lạ", {"loai": "truyen", "ky": True}]},
          open(os.path.join(KB, "bao", "2026-11-03", "bao.json"), "w"), ensure_ascii=False)
e_h = ai.claude_episodes(KB, "2026-11-30")
ok(len(e_h) == 1 and e_h[0]["ky"] == 3 and e_h[0]["nguyen_van"] == [] and e_h[0]["tom_tat"] == "",
   "JSON hỏng / số rút gọn / thư mục lạ bỏ qua; bản dịch có chữ Nhật → không dùng làm nguyên văn; thiếu truyen.md vẫn chạy")
SH5 = os.path.join(TMP, "bao_chung5")
ok(ai.import_claude_story(SH5, KB, "2026-11-30") == 1 and not story.load_master(SH5, "2026-11-03"),
   "kỳ không có bản dịch: vào bộ nhớ (tóm tắt) nhưng không làm bản gốc")
ok(ai.import_claude_story(SH5, None, "2026-11-30") == 0 and ai.import_claude_story(SH5, os.path.join(TMP, "khong_co"), "2026-11-30") == 0
   and not ai.export_story_for_claude(SH5, None), "không có thư mục kotoba_daily: không làm gì")
ok(not ai.export_story_for_claude(SH5, KB) and not os.path.exists(os.path.join(KB, ai.CLAUDE_EXPORT)),
   "chưa có kỳ Gemini nào: không tạo truyen_chung.json")

print("== nối dây")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
i_m, i_i, i_e = (init.find(x) for x in ("ai.migrate_story(AI_DIR_SHARED", "ai.import_claude_story(AI_DIR_SHARED", "ai.ensure_master(client"))
ok(0 < i_m < i_i < i_e, "trước khi viết: chép truyện cũ của Gemini → nối kỳ của Claude → bản gốc")
ok("ai.export_story_for_claude(AI_DIR_SHARED, claude_story)" in init and "def _claude_story_dir" in init, "sau khi viết: ghi truyen_chung.json")
pr = open(os.path.join(REPO, "kotoba_daily", "prompts", "bao_hang_ngay.md"), encoding="utf-8").read()
ok("ky_them" in pr and "ban_goc_hom_nay" in pr and "(add-on)" in pr, "lời nhắc của Claude: nối kỳ add-on, kể lại kỳ hôm nay, ghi vào truyen.md")

shutil.rmtree(TMP, ignore_errors=True)
print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d mục trượt" % len(FAIL)))
sys.exit(1 if FAIL else 0)
