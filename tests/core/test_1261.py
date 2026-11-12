"""Test offline 1.26.1 (python thường + node) — những gì sửa sau lần thử Gemini thật 12/11 + yêu cầu người dùng:

- Gói báo: chỉ xem trước khi Gemini viết (`paper_sub_ensure(..., commit=False)` không ghi, không trừ xu), tặng thử / gia
  hạn khi số báo đã viết xong (`_ai_done`) — Gemini lỗi / hết hạn mức / khoá bị thu hồi thì không mất xu, gói thử chưa bắt
  đầu; khoá hỏng hẳn không bị trừ xu mỗi tuần.
- Model Google còn liệt kê nhưng gọi thì 404 (gemini-2.5-flash, gặp khi thử thật): bỏ qua 3 ngày, không thử lại ở mỗi
  bước; nhật ký không bảo "Xoá gemini_model trong Config" khi người dùng không đặt model; luyện viết cũng bỏ qua.
- Tên nhân vật: chủ quán ~30 tuổi là "chị Hana" (như bản dịch của báo Claude Code), "bà Hana" là bà của chị Hana.
- Người mới (`event_core.is_new_player`) → hướng dẫn 3 bước; người đang dùng thì không.
- Chuyển cảnh chậm hơn 1.26.0; hiệu ứng bật nhẹ của bảng có tên riêng (`kb-panel-in`) — 1.26.0 định nghĩa lại `kb-pop`
  nên bong bóng linh vật / Combo / nút Nhiệm vụ mất kiểu nảy cũ và không theo "giảm chuyển động".
- Nối dây tour.js (nạp trước garden.js, nút ⚙ Hướng dẫn 3 bước, zz_kbtest tắt cho kịch bản cũ) + chạy tour.js bằng node.

Chạy: python test_1261.py THƯ_MỤC_ADD_ON
"""
import json, os, re, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai
import event_core as ev
import garden_core as core
import journal_core as journal
import story_core as story

FAIL = []
NODE = shutil.which("node")
TMP = tempfile.mkdtemp(prefix="kb1261_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*parts):
    return open(os.path.join(ADDON, *parts), encoding="utf-8").read()


print("== mọi file Python của add-on biên dịch được (kể cả __init__.py — cần aqt nên các test khác không nạp)")
import py_compile
for fn in sorted(os.listdir(ADDON)):
    if fn.endswith(".py"):
        try:
            py_compile.compile(os.path.join(ADDON, fn), cfile=os.path.join(TMP, fn + "c"), doraise=True)
            bad = ""
        except py_compile.PyCompileError as e:
            bad = str(e)[:200]
        ok(not bad, fn + (" — " + bad if bad else ""))

print("== gói báo: xem trước, trừ xu sau khi số báo đã viết xong")


def fresh(name, coins, sub=None):
    d = os.path.join(TMP, name)
    os.makedirs(d)
    st = core.GardenState(os.path.join(d, "wallet.json"))
    data = st.load()
    data["coins"] = coins
    if sub is not None:
        data["more"]["paper_sub"] = sub
    st.save(data)
    return st


st = fresh("trial", 250)
ok(st.paper_sub_ensure("2026-11-08", commit=False) == ("trial", 0) and not st.load()["more"]["paper_sub"].get("trial"),
   "chưa có gói: xem trước → 'trial' nhưng chưa bắt đầu gói thử")
ok(st.paper_sub_ensure("2026-11-09", commit=False) == ("trial", 0), "Gemini lỗi hôm qua → hôm nay vẫn còn quà tặng thử")
ok(st.paper_sub_ensure("2026-11-09") == ("trial", 0) and st.load()["more"]["paper_sub"]["until"] == "2026-11-15",
   "số đầu tiên viết xong → tặng 7 ngày tính từ hôm đó (9 → 15/11)")
ok(st.paper_sub_ensure("2026-11-12", commit=False) == ("ok", 0) and st.paper_sub_ensure("2026-11-12") == ("ok", 0), "đang dùng thử")
st = fresh("renew", 250, {"until": "2026-11-15", "plan": "tuan", "auto": True, "trial": "2026-11-09"})
ok(st.paper_sub_ensure("2026-11-16", commit=False) == ("renewed", 100) and st.load()["coins"] == 250
   and st.load()["more"]["paper_sub"]["until"] == "2026-11-15", "hết hạn + Tự gia hạn: xem trước → 'renewed' nhưng chưa trừ xu")
for _ in range(5):        # khoá hỏng / Gemini hết hạn mức cả tuần: mỗi lần mở vườn đều xem trước, không trừ
    st.paper_sub_ensure("2026-11-16", commit=False)
ok(st.load()["coins"] == 250, "Gemini lỗi nhiều lần: không trừ xu lần nào")
ok(st.paper_sub_ensure("2026-11-16") == ("renewed", 100) and st.load()["coins"] == 150
   and st.load()["more"]["paper_sub"]["until"] == "2026-11-22", "số báo viết xong → gia hạn −100 xu tới 22/11")
ok(st.paper_sub_ensure("2026-11-16") == ("ok", 0) and st.load()["coins"] == 150, "báo thứ hai cùng ngày: không trừ thêm")
st = fresh("poor", 40, {"until": "2026-11-15", "plan": "tuan", "auto": True, "trial": "2026-11-09"})
ok(st.paper_sub_ensure("2026-11-16", commit=False) == ("expired", 0), "thiếu xu → hết hạn (không viết)")
st = fresh("off", 900, {"until": "2026-11-15", "plan": "thang", "auto": False, "trial": "2026-11-09"})
ok(st.paper_sub_ensure("2026-11-16", commit=False) == ("expired", 0) and st.load()["coins"] == 900, "tắt Tự gia hạn → hết hạn")
init = src("__init__.py")
ok("sub, price = paper_sub_ensure(date, commit=False)" in init, "ai_start chỉ xem gói (commit=False)")
done = init[init.index("def _ai_done("):init.index("def _ai_done(") + 900]
ok('if res.get("ok") and not res.get("audio_only") and ai.has_issue(base, date):\n        paper_sub_ensure(date)' in done,
   "_ai_done: số mới đã có trong thư mục → mới tặng thử / gia hạn")
ok("if not commit:\n        return res, price" in init, "xem trước không hiện thông báo 'Đã gia hạn'")

print("== model còn trong danh sách nhưng gọi thì 404 (gemini-2.5-flash)")


class FakeC:
    def __init__(self):
        self.calls = []
        self.exhausted = {}
        self.versions = {}

    def is_exhausted(self, m):
        import time
        return self.exhausted.get(m, 0) > time.time()

    def mark_exhausted(self, m, retry_after=None):
        import time
        self.exhausted[m] = time.time() + (retry_after or 3600)

    def exhausted_state(self):
        return dict(self.exhausted)

    def models(self):
        return [{"name": "models/" + n, "supportedGenerationMethods": ["generateContent"]} for n in ("gemini-2.5-flash", "gemini-flash-lite-latest")]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls.append(model)
        if model in ("gemini-2.5-flash", "gemini-2.0-flash-lite"):
            raise ai.explain_http(404, b"{}", model)
        return json.dumps({"x": 1})


e404 = ai.explain_http(404, b"{}", "gemini-2.5-flash")
ok(e404.kind == "model" and "Config" not in str(e404), "404: 'Google không còn model …', không bảo xoá gemini_model: " + str(e404))
c = FakeC()
job = ai.Job(c, os.path.join(TMP, "j"), "2026-11-12", {}, {"story": "tat"}, lambda m: None)
job.models = ["gemini-2.5-flash", "gemini-flash-lite-latest"]
r1 = job._gen("s", "p", {}, 0.5)
r2 = job._gen("s", "p", {}, 0.5)
ok(r1 == {"x": 1} and r2 == {"x": 1} and c.calls == ["gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-flash-lite-latest"],
   "bước sau không thử lại model 404: " + str(c.calls))
ok(c.is_exhausted("gemini-2.5-flash") and c.exhausted["gemini-2.5-flash"] - __import__("time").time() > 2 * 86400,
   "nhớ bỏ qua ≥ 2 ngày (lưu cùng chỗ hết hạn mức, ngày sau cũng không thử)")
c2 = FakeC()
job2 = ai.Job(c2, os.path.join(TMP, "j2"), "2026-11-12", {}, {"story": "tat", "model": "gemini-2.5-flash"}, lambda m: None)
try:
    job2._gen("s", "p", {}, 0.5)
    ok(False, "model do người dùng đặt mà 404 → phải báo lỗi")
except ai.AIError as e:
    ok("Xoá gemini_model trong Config" in str(e) and not c2.is_exhausted("gemini-2.5-flash"),
       "model do người dùng đặt (gemini_model) 404 → nhắc xoá gemini_model, không tự bỏ qua")
class FakeBusy(FakeC):
    def generate(self, model, *a, **k):
        self.calls.append(model)
        if model == "gemini-2.5-pro":
            raise ai.explain_http(404, b"{}", model)
        raise ai.explain_http(503, b"{}", model)


cb = FakeBusy()
cb.sleep = lambda s: None
jb = ai.Job(cb, os.path.join(TMP, "jb"), "2026-11-12", {}, {"story": "tat"}, lambda m: None)
jb.models = ["gemini-3.1-flash-lite", "gemini-2.5-pro"]
try:
    jb._gen("s", "p", {}, 0.5)
    ok(False, "mọi model hỏng → phải báo lỗi")
except ai.AIError as e:
    ok(e.kind == "busy" and "bận" in str(e), "mọi model hỏng, model cuối 404 → báo lý do thật (máy chủ bận): " + str(e))
c3 = FakeC()
out = journal.run_fix(c3, ["gemini-2.0-flash-lite", "gemini-flash-lite-latest"], "きのうは雨でした。", "ja", "N4", [])
ok(out["model"] == "gemini-flash-lite-latest" and c3.is_exhausted("gemini-2.0-flash-lite"), "luyện viết: model 404 → model sau, bỏ qua lần tới")

print("== máy tự sửa lỗi Flash-Lite hay mắc (thử thật 10/11: bản soát còn 7 lỗi, lượt sửa không gọi được → mất báo)")
raw = {"bai": [{"loai": "tin_lang", "tieu_de": "[天気|てんき]", "doan": ["[今日|きょう]は[雨|あめ]です。"]}],
       "cau_hoi": [{"hoi": "[天気|てんき]は？", "chon": ["[雨|あめ]", "はれ", "ゆき"], "dung": 0,
                    "giai_thich": "Bài viết 「{天気|てんき|天気}は[雨|あめ]」 nghĩa là trời mưa."},
                   {"hoi": "だれ？", "chon": ["リン", "はな", "スタックちゃん"], "dung": 1, "giai_thich": "Chị Hana | chủ quán."}],
       "chinh_ta": [{"cau": "[今日|きょう]は[雨|あめ]です。", "them_dap_an": ["[今日|きょう]は雨です。", "kyou wa ame desu", "きょうは雨です。"]}],
       "mau_cau": [], "tu_moi": [], "tom_tat": "Tin {thời tiết} hôm nay.", "tom_tat_truyen": ""}
fixed, notes = ai.autofix(json.loads(json.dumps(raw)), {"tu_vung": [], "ngu_phap": []}, {"max_new": 3})
gt = [q["giai_thich"] for q in fixed["cau_hoi"]]
ok(gt[0] == "Bài viết 「天気は雨」 nghĩa là trời mưa." and not any(c in gt[1] for c in "{}[]|"), "giải thích tiếng Việt: gỡ đánh dấu, giữ chữ: " + str(gt))
ok(fixed["chinh_ta"][0]["them_dap_an"] == ["今日は雨です。", "きょうは雨です。"], "cách viết khác: gỡ đánh dấu, bỏ romaji: " + str(fixed["chinh_ta"][0]["them_dap_an"]))
ok(fixed["tom_tat"] == "Tin thời tiết hôm nay.", "tóm tắt: gỡ { }")
ok(any("phần tiếng Việt" in n for n in notes) and any("cách viết khác" in n for n in notes), "nhật ký ghi máy đã sửa: " + str(notes))
rep = ai.check(fixed, {"tu_vung": [], "ngu_phap": [], "trinh_do": "N4"}, {"max_new": 3})
bad = [e for e in rep.errors if "giai_thich" in e or "them_dap_an" in e or e.startswith("tom_tat")]
ok(not bad, "kiểm tra không còn lỗi ở các chỗ đó: " + str(bad))
okjs = src("ai_core.py")
ok("left = rep2.errors if rep2 is not None and len(rep2.errors) < len(rep.errors) else rep.errors" in okjs,
   "thông báo 'còn N lỗi' theo bản gần xong nhất")

print("== dòng 'Kỳ trước' dài: cắt ở chỗ hết câu / hết từ, có dấu …")
import paper_core as paper
T = ("Trong hộp thiếc có một túi nhỏ và lá thư Ken-chan viết năm 10 tuổi gửi chính mình lúc lớn (hỏi đã biết nấu ăn chưa, đã "
     "quay lại gặp Hana chưa). Bà Hana kể mùa hè năm ấy hai bà cháu cùng nhặt hạt cây; sau khi Ken-chan về thị trấn, bà gieo một "
     "hạt và nó thành chính cái cây họ hẹn gặp. Trời tối dần, Hana giục về làng trước khi mưa; bà Hana trao túi hạt cho Lin.")
c = paper.clip(T, 300)
ok(len(c) <= 300 and c.endswith("…") and "Trời tối dần, Ha" not in c and c.rstrip(" …").endswith("họ hẹn gặp."),
   "tóm tắt 360 ký tự → hết câu: …" + c[-40:])
ok(paper.clip("Ngắn thôi.", 300) == "Ngắn thôi." and paper.clip(None, 300) == "", "chữ ngắn / không phải chữ giữ nguyên")
w = paper.clip("từ " * 200, 300)
ok(len(w) <= 300 and w.endswith("từ…"), "không có dấu câu → cắt ở hết từ")
m = story.clean_master({"ngay": "2026-11-09", "ky": 9, "truyen": {"tieu_de": "x", "doan": ["a"], "ky_truoc": T}, "tin": []})
ok(m is None or (m["truyen"]["ky_truoc"] == c), "bản gốc: 'Kỳ trước' cắt theo câu")
ok('"ky_truoc": clip(b.get("ky_truoc"), 300)' in src("paper_core.py"), "số báo: 'Kỳ trước' cắt theo câu")

print("== tên nhân vật: chị Hana (chủ quán ~30 tuổi), bà Hana = bà của chị Hana")
ok("- Chị Hana: chủ quán, khoảng 30 tuổi" in story.BIBLE_VI and "- Bà Hana:" not in story.BIBLE_VI, "truyện chung: chủ quán là chị Hana")
ok(story.NAMES[1][0].startswith("chị Hana") and "おばあさん" in story.NAMES[1][1], "bảng tên kể lại: chị Hana ↔ はなさん (không おばあさん)")
ok(not re.search(r"\b[Bb]à Hana\b", story.SAMPLE_VI) and "Chị Hana" in story.SAMPLE_VI, "văn mẫu: Chị Hana")
for a, b in (("はなさん cười", "chị Hana cười"), ("bà はな nhớ ông けん", "bà Hana nhớ ông Ken"), ("bà はなさん gọi", "bà Hana gọi")):
    ok(ai.vi_names(a) == b, "tóm tắt của Claude: %r → %r (%r)" % (a, b, ai.vi_names(a)))
vi = src("ai_vi.py")
ok("bà Hana" not in vi, "báo tiếng Việt: không còn 'bà Hana' cho chủ quán")

print("== người mới → hướng dẫn 3 bước")
NEW = {"coins": 0, "waters": 0, "harvests": 0, "home": {"house": 0, "owned": {}}}
ok(ev.is_new_player(NEW), "hồ sơ mới (0 xu, chưa tưới, chưa xây nhà)")
for k, v in (("coins", 3), ("waters", 1), ("harvests", 1)):
    ok(not ev.is_new_player(dict(NEW, **{k: v})), "đã có %s = %d → không hướng dẫn" % (k, v))
ok(not ev.is_new_player(dict(NEW, home={"house": 2, "owned": {}})), "đã xây nhà → không")
ok(not ev.is_new_player(dict(NEW, home={"house": 0, "owned": {"lantern": 1}})), "đã có đồ → không")
ok(not ev.is_new_player(None) and not ev.is_new_player({"coins": "x"}) and ev.is_new_player({}), "dữ liệu lạ không lỗi")
ok('data["tour"] = not TOUR_TEST_OFF and event_core.is_new_player(data["wallet"])' in init, "Python gửi data.tour")
ok(init.index('f"{WEB_BASE}/tour.js"') < init.index('f"{WEB_BASE}/garden.js"'), "tour.js nạp trước garden.js")
zz = open(os.path.join(HERE, "..", "anki", "zz_kbtest", "__init__.py"), encoding="utf-8").read()
ok("_kb.TOUR_TEST_OFF = True" in zz, "zz_kbtest tắt hướng dẫn cho kịch bản cũ")
body = src("web", "body.html")
ok('id="kb-tour-open"' in body and body.index('id="kb-tour-open"') < body.index('id="kb-ui-open"'), "⚙ có nút Hướng dẫn 3 bước")
gjs = src("web", "garden.js")
ok("GardenTour.render(d)" in gjs and "GardenTour.open()" in gjs, "garden.js vẽ / mở hướng dẫn")

print("== chuyển cảnh chậm hơn 1.26.0, tên hiệu ứng bảng riêng")
gr = src("web", "greet.js")
m = re.search(r"const T = \{ close: (\d+), open: (\d+), first: (\d+), fade: (\d+), out: (\d+) \};", gr)
ok(m is not None and int(m.group(1)) >= 1.5 * 260 and int(m.group(2)) >= 1.5 * 360 and int(m.group(3)) >= 1.5 * 400
   and int(m.group(4)) >= 1.5 * 300, "màn chào → vườn / mở vườn chậm hơn ≥ 1,5 lần: " + (m.group(0) if m else "?"))
ok("irisClose(260" not in gr and "irisOpen(360" not in gr and "irisOpen(400" not in gr, "không còn số 1.26.0 viết cứng")
hjs = src("web", "home.js")
m2 = re.search(r"const SWITCH_MS = \{ sweep: (\d+), curtain: (\d+) \}, SWITCH_FADE_MS = (\d+);", hjs)
ok(m2 is not None and int(m2.group(1)) >= 550 and int(m2.group(2)) >= int(m2.group(1)) and int(m2.group(3)) >= 500,
   "đổi cảnh ◂ ▸ / Trong nhà / mờ dần chậm hơn (1.26.0: 350 / 350 / 380 ms): " + (m2.group(0) if m2 else "?"))
css = src("web", "garden.css")
ok(len(re.findall(r"@keyframes kb-pop\b", css)) == 1 and len(re.findall(r"^\.kb-pop \{", css, re.M)) == 1,
   "chỉ một @keyframes kb-pop (bong bóng linh vật / Combo / nút Nhiệm vụ giữ kiểu nảy cũ)")
ok(".kb-panel-in { animation: kb-panel-in" in css and "prefers-reduced-motion: reduce) { .kb-panel-in { animation: none; } }" in css,
   "bảng bật nhẹ: lớp kb-panel-in, tắt khi giảm chuyển động")
ok('classList.add("kb-panel-in")' in gr and 'classList.add("kb-pop")' not in gr, "greet.js dùng kb-panel-in")
ok(re.search(r"\.kb-greet-out \{ animation: kb-greet-out \.4\d?s", css) is not None, "màn chào mờ dần (Dịu mắt) chậm hơn")

print("== tour.js bằng node (DOM giả)")
if NODE:
    harness = r"""
const fs = require('fs');
const els = {};
function mk(id, tag) {
  const e = { tagName: tag || 'div', hidden: false, children: [], style: { setProperty() {} }, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { if (on === undefined ? !this._s.has(c) : on) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, _text: '', get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
    appendChild(c) { this.children.push(c); c.parentNode = this; if (c.id) els[c.id] = c; return c; }, addEventListener(t, f) { (this._on = this._on || {})[t] = f; },
    querySelector(sel) { return find(this, sel); }, querySelectorAll(sel) { return findAll(this, sel); }, closest() { return els['kb-deck-label']; },
    getBoundingClientRect() { return { left: 100, top: 20, right: 300, bottom: 50, width: 200, height: 30 }; }, offsetParent: {}, offsetWidth: 320, offsetHeight: 120, value: '1' };
  let _id = id;
  Object.defineProperty(e, 'id', { get() { return _id; }, set(v) { _id = v; els[v] = e; } });
  if (id) els[id] = e; return e;
}
function walk(n, out) { (n.children || []).forEach((c) => { out.push(c); walk(c, out); }); return out; }
function match(e, sel) { if (sel.startsWith('.')) { return (e.className || '').split(' ').includes(sel.slice(1)); } const [t, c] = sel.split(' '); return false; }
function findAll(n, sel) { const parts = sel.split(' '); let cur = [n]; parts.forEach((p) => { cur = [].concat(...cur.map((x) => walk(x, []).filter((e) => match(e, p)))); }); return cur; }
function find(n, sel) { return findAll(n, sel)[0] || null; }
['kb-app', 'kb-deck', 'kb-deck-label', 'kb-review', 'kb-legend', 'kb-panel', 'kb-game', 'kb-home', 'kb-paper', 'kb-cal'].forEach((i) => mk(i));
['kb-panel', 'kb-game', 'kb-home', 'kb-paper', 'kb-cal'].forEach((i) => { els[i].hidden = true; });
const prefs = {};
global.window = { innerWidth: 1100, innerHeight: 800, addEventListener() {} };
global.document = { getElementById: (i) => els[i] || null, createElement: (t) => { const e = mk(null, t); Object.defineProperty(e, 'className', { get() { return [...this.classList._s].join(' '); }, set(v) { this.classList._s = new Set(String(v).split(' ').filter(Boolean)); } }); return e; },
  body: els['kb-app'], addEventListener() {} };
global.GardenPrefs = { get: (k) => prefs[k] || null, set: (k, v) => { prefs[k] = v; } };
let greeting = true;
global.GardenGreet = { isGreeting: () => greeting };
const timers = [];
global.setTimeout = (f) => { timers.push(f); return timers.length; };
global.clearTimeout = () => {};
global.setInterval = () => 1; global.clearInterval = () => {};
const flush = () => { while (timers.length) timers.shift()(); };
eval(fs.readFileSync(process.argv[2], 'utf-8') + '; global.GardenTour = GardenTour;');
const out = {};
GardenTour.render({ tour: true });
for (let i = 0; i < 3; i++) { const f = timers.shift(); if (f) f(); }
out.waitGreet = GardenTour._state().step;            // đang chào → chưa hiện
greeting = false; flush();
out.s1 = GardenTour._state();
els['kb-deck'].value = '2'; GardenTour.render({ tour: true });
out.s2 = GardenTour._state().step;
els['kb-next'] = null;
document.getElementById('kb-tour-next')._on.click({ stopPropagation() {} });
out.s3 = GardenTour._state().step;
document.getElementById('kb-tour-next')._on.click({ stopPropagation() {} });
out.done = [GardenTour._state().step, prefs['kb-tour-done']];
GardenTour.render({ tour: true });
out.again = GardenTour._state().step;
GardenTour.open(); out.reopen = GardenTour._state().step;
console.log(JSON.stringify(out));
"""
    hp = os.path.join(TMP, "tour_harness.js")
    open(hp, "w", encoding="utf-8").write(harness)
    r = subprocess.run([NODE, hp, os.path.join(ADDON, "web", "tour.js")], capture_output=True, text=True, timeout=30)
    try:
        o = json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        o = {}
        print(r.stdout[-800:], r.stderr[-1500:])
    ok(o.get("waitGreet") == -1, "đang có màn chào → hướng dẫn chờ")
    ok((o.get("s1") or {}).get("step") == 0 and "Chọn deck" in (o.get("s1") or {}).get("text", ""), "hết màn chào → bước 1 Chọn deck")
    ok(o.get("s2") == 1, "đổi deck → tự sang bước 2")
    ok(o.get("s3") == 2, "Tiếp → bước 3")
    ok(o.get("done") == [-1, "1"], "Xong → nhớ kb-tour-done")
    ok(o.get("again") == -1, "mở lại vườn: không hiện nữa")
    ok(o.get("reopen") == 0, "⚙ Hướng dẫn 3 bước: mở lại từ bước 1")
    r = subprocess.run([NODE, "--check", os.path.join(ADDON, "web", "tour.js")], capture_output=True, text=True)
    ok(r.returncode == 0, "tour.js đúng cú pháp")
else:
    print("  (không có node: bỏ qua)")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d mục trượt" % len(FAIL)))
sys.exit(1 if FAIL else 0)
