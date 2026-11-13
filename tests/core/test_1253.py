"""Test offline cho 1.25.3 (python thường, thiếu gói `anki` thì dùng tests/stubs; phần JS chạy bằng node):

- cài đặt riêng máy (trời & giờ, nhạc, âm lượng, tắt tiếng, cảnh màn chính…) — trước chỉ ở localStorage, mà webview của
  Anki dùng profile không lưu → tắt Anki là mất: `more_core.clean_prefs / merge_prefs`, `web/prefs.js` (đọc bản Python
  đưa vào, gom thay đổi gửi một lệnh `prefs:set`), `sky.js` / `music.js` / `fx.js` / `games.js` đọc qua GardenPrefs,
  giá trị lạ về mặc định;
- Undo lượt ôn lùi cả chuỗi "Tưới liền N cây" (audit BUG-02): `undo_reward` với `streak0 / streak_cur0`, Undo hai lượt
  liền, ván trò chơi sau Undo không trả lại thưởng nhiệm vụ chuỗi;
- ảnh vườn theo hồ sơ (audit BUG-06): `journal.profile_photo_dir` — hồ sơ mới tinh không nhận ảnh của hồ sơ khác, ảnh cũ
  về hồ sơ đầu tiên đã có ví;
- dữ liệu sai kiểu (audit BUG-07 + mới): fuzz mọi hàm làm sạch với 19 giá trị sai kiểu ở mọi nút → không ném lỗi;
  `GardenState.load()` với một món đặt hỏng **không xoá nhà** (1.25.2: nhà về cấp 0, lần lưu sau mất hết);
- lựa chọn trò chơi không có hai đáp án cùng đúng (audit BUG-04): `GardenGames._choices` với từ đồng nghĩa / đồng âm;
- trời phía trên mái ở cỡ cảnh Lớn (ảnh người dùng 10/11): `drawHouseScene` dùng cùng đường chân trời + mưa phía trên mái.

Chạy: python test_1253.py THƯ_MỤC_ADD_ON
"""
import copy, json, os, re, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import fields_core as fields
import garden_core as core
import journal_core as journal
import season_core as season
import words_core as words
more, share = core.more, core.share        # garden_core nạp hai file này dưới tên riêng (share.more = more)

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1253_")
NODE = shutil.which("node")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def node(src):
    """Chạy đoạn JS (biến ADDON có sẵn), trả về JSON in ra ở dòng cuối."""
    path = os.path.join(TMP, "t.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("const fs = require('fs'), vm = require('vm'), path = require('path'); const ADDON = %s;\n" % json.dumps(ADDON) + src)
    r = subprocess.run([NODE, path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        print(r.stderr[-800:])
        return None
    return json.loads(r.stdout.strip().splitlines()[-1])


class FakeCol:
    def __init__(self, path="/tmp/kb1253/ho_so/collection.anki2"):
        self.conf = {}
        self.sched = type("S", (), {"today": 100})()
        self.path = path

    def get_config(self, k, d=None):
        return copy.deepcopy(self.conf.get(k, d))

    def set_config(self, k, v):
        self.conf[k] = copy.deepcopy(v)


# ---------------------------------------------------------------------------
print("== cài đặt riêng máy: clean_prefs / merge_prefs")
ok(core.DEFAULT_CONFIG.get("prefs") == {} and json.load(open(os.path.join(ADDON, "config.json")))["prefs"] == {},
   'config mặc định có "prefs": {} (config.json + DEFAULT_CONFIG)')
ok(more.clean_prefs(None) == {} and more.clean_prefs([1]) == {} and more.clean_prefs("x") == {}, "kiểu sai → {}")
p = more.clean_prefs({"kb-sky": '{"mode":"fixed"}', "kb-music": "0", "kb-music-vol": 0.35, "KB-X": "1", "kb-": "1",
                      "kb-ok-key": True, "kb-list": [1], "kb-long": "x" * 401, "other": "1", "kb-a b": "1"})
ok(p == {"kb-sky": '{"mode":"fixed"}', "kb-music": "0", "kb-music-vol": "0.35"},
   "chỉ giữ khoá kb-… hợp lệ, giá trị chuỗi / số (số → chuỗi), bỏ bool / danh sách / quá 400 ký tự: " + json.dumps(p))
p = more.clean_prefs({"kb-joy-100-stage": "1", "kb-joy-101-stage": "1", "kb-joy-101-done": "1", "kb-sky": "{}"})
ok(sorted(p) == ["kb-joy-101-done", "kb-joy-101-stage", "kb-sky"], "dải chúc mừng chỉ giữ ngày mới nhất")
big = {"kb-k%d" % i: str(i) for i in range(200)}
p = more.clean_prefs(big)
ok(len(p) == more.PREF_MAX_KEYS and "kb-k199" in p and "kb-k0" not in p, "tối đa 120 khoá, giữ các khoá ghi sau cùng")
m = more.merge_prefs({"kb-sky": "a", "kb-music": "1"}, {"kb-sky": "b", "kb-music": None, "kb-crow-mode": "jp", 5: "x"})
ok(m == {"kb-sky": "b", "kb-crow-mode": "jp"}, "gộp: ghi đè, null = xoá, khoá lạ bỏ: " + json.dumps(m))
m = more.merge_prefs(big, {"kb-new": "1"})
ok("kb-new" in m and len(m) == more.PREF_MAX_KEYS, "đã đầy 120 khoá: khoá vừa ghi vẫn được giữ")
src = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
_pos = lambda n: src.find('f"{WEB_BASE}/%s"' % n)
ok(0 < _pos("diag.js") < _pos("prefs.js") < _pos("sky.js") < _pos("fx.js") < _pos("music.js") < _pos("games.js"),
   "prefs.js nạp ngay sau diag.js, trước sky.js / music.js / fx.js / games.js")
ok("head += prefs_script()" in src and 'elif cmd.startswith("prefs:set:")' in src, "trang nhận cài đặt trong <head>, lệnh prefs:set")
web = os.path.join(ADDON, "web")
left = []
for fn in sorted(os.listdir(web)):
    if fn.endswith(".js") and fn != "prefs.js":
        for i, line in enumerate(open(os.path.join(web, fn), encoding="utf-8"), 1):
            if "localStorage" in line and "GardenPrefs" not in line:
                left.append("%s:%d" % (fn, i))
ok(not left, "không còn chỗ nào chỉ dùng localStorage (mọi chỗ qua GardenPrefs, localStorage chỉ là đường lùi)" +
   ("" if not left else ": " + ", ".join(left)))

if NODE:
    print("== prefs.js (node)")
    r = node(r"""
const sent = [], ls = {};
const store = { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } };
const timers = [];
const ctx = { window: { __kbPrefs: { "kb-sky": '{"mode":"fixed","fixedHour":18.4,"weather":"rain"}', "kb-music": "0", "kb-bad": 5 },
  addEventListener() {} }, localStorage: store, pycmd: (c) => sent.push(c), console,
  setTimeout: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimeout() {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ADDON, 'web/prefs.js'), 'utf8') + '\nthis.P = GardenPrefs;', ctx);
(async () => {
const P = ctx.P, out = {}, tick = () => new Promise((r) => setImmediate(r));
out.given = P.get("kb-sky"); out.music = P.get("kb-music"); out.bad = P.get("kb-bad"); out.none = P.get("kb-none");
P.set("kb-music", "1"); P.set("kb-music-vol", 0.4); P.set("kb-sky", null);
out.beforeFlush = sent.length; out.lsMusic = ls["kb-music"]; out.afterSet = P.get("kb-music"); out.skyGone = P.get("kb-sky");
await tick();
out.sent = sent.slice();
P.set("kb-music-vol", 0.5); P.set("kb-music-vol", 0.6);        // dồn dập ngay sau lệnh trước → gom bằng hẹn giờ
await tick();
out.burstBefore = sent.length; out.timers = timers.length;
timers.forEach((f) => f());
out.burst = sent.slice(1);
ls["kb-main-scene"] = "beach"; out.direct = P.get("kb-main-scene");
console.log(JSON.stringify(out));
})();
""")
    ok(r and r["given"] == '{"mode":"fixed","fixedHour":18.4,"weather":"rain"}' and r["music"] == "0" and r["bad"] is None and r["none"] is None,
       "đọc cài đặt Python đưa vào (localStorage trống như sau khi mở lại Anki); giá trị không phải chuỗi bỏ")
    ok(r and r["beforeFlush"] == 0 and r["lsMusic"] == "1" and r["afterSet"] == "1" and r["skyGone"] is None,
       "set(): đổi ngay trong trang + localStorage; null = xoá")
    want = {"kb-music": "1", "kb-music-vol": "0.4", "kb-sky": None}
    ok(r and len(r["sent"]) == 1 and r["sent"][0].startswith("prefs:set:") and json.loads(r["sent"][0][10:]) == want,
       "cuối lượt xử lý: một lệnh prefs:set gửi cả ba thay đổi (1.25.4: chờ 250 ms → đóng cửa sổ ngay là mất) " + (r["sent"][0] if r and r["sent"] else ""))
    ok(r and r["burstBefore"] == 1 and r["timers"] == 1 and len(r["burst"]) == 1 and json.loads(r["burst"][0][10:]) == {"kb-music-vol": "0.6"},
       "thay đổi dồn dập (kéo thanh âm lượng) gom một lệnh sau 250 ms, giữ giá trị cuối")
    ok(r and r["direct"] == "beach", "chỗ nào ghi thẳng localStorage (test cũ) vẫn đọc được")

    print("== sky.js / music.js / fx.js / games.js đọc qua GardenPrefs (node)")
    r = node(r"""
const out = {};
function load(prefs, files) {
  const sent = [], timers = [];
  const ctx = { window: { __kbPrefs: prefs, addEventListener() {} }, document: { addEventListener() {}, getElementById() { return null; } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, pycmd: (c) => sent.push(c), console, navigator: {},
    setTimeout: (fn) => { timers.push(fn); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {} };
  vm.createContext(ctx);
  let code = fs.readFileSync(path.join(ADDON, 'web/prefs.js'), 'utf8');
  files.forEach((f) => { code += '\n' + fs.readFileSync(path.join(ADDON, 'web/' + f), 'utf8'); });
  vm.runInContext(code + '\nthis.S = typeof GardenSky !== "undefined" ? GardenSky : null; this.M = typeof GardenMusic !== "undefined" ? GardenMusic : null; this.F = typeof GardenFx !== "undefined" ? GardenFx : null; this.G = typeof GardenGames !== "undefined" ? GardenGames : null; this.P = GardenPrefs;', ctx);
  ctx.flush = async () => { await new Promise((r) => setImmediate(r)); timers.splice(0).forEach((f) => f()); return sent; };
  return ctx;
}
(async () => {
let c = load({ "kb-sky": '{"mode":"fixed","fixedHour":18.4,"weather":"rain","dayMinutes":60}' }, ['sky.js']);
out.sky = c.S.settings(); out.skyW = c.S.state().weather; out.skyH = c.S.state().hour;
c.S.set("weather", "snow"); c.S.set("mode", "game");
const s1 = await c.flush(); out.skySent = s1.length === 1 ? JSON.parse(JSON.parse(s1[0].slice(10))["kb-sky"]) : s1;
c = load({ "kb-sky": '{"mode":"sao","fixedHour":99,"weather":"bão","dayMinutes":-3}' }, ['sky.js']);
out.skyBad = c.S.settings();
c.S.set("fixedHour", "abc"); out.skyBadSet = c.S.settings().fixedHour;
c = load({ "kb-sky": '{không phải json' }, ['sky.js']); out.skyJunk = c.S.settings();
c = load({ "kb-music": "0", "kb-music-vol": "0.25" }, ['music.js']);
out.music = [c.M.enabled(), c.M.volume()];
c = load({ "kb-crow-mode": "jp", "kb-crow-speed": "slow" }, ['games.js']);
c.G._setCrowMode("vi"); out.crow = (await c.flush()).map((x) => JSON.parse(x.slice(10)));
c = load({}, ['games.js']);
out.crowSpeedProto = (c.P.set("kb-crow-speed", "constructor"), null);
console.log(JSON.stringify(out));
})();
""")
    ok(r and r["sky"] == {"mode": "fixed", "dayMinutes": 60, "fixedHour": 18.4, "weather": "rain"} and r["skyW"] == "rain"
       and abs(r["skyH"] - 18.4) < 1e-9, "mở lại Anki: trời / giờ lấy đúng cài đặt đã lưu (Cố định 18:24, Mưa)")
    ok(r and r["skySent"] == {"mode": "game", "dayMinutes": 60, "fixedHour": 18.4, "weather": "snow"},
       "đổi Thời tiết + Giờ game → một lệnh prefs:set mang kb-sky mới")
    ok(r and r["skyBad"] == {"mode": "real", "dayMinutes": 24, "fixedHour": 9, "weather": "auto"} and r["skyBadSet"] == 9,
       "giá trị lạ (chế độ / giờ 99 / thời tiết lạ / số phút âm, set chữ) → mặc định")
    ok(r and r["skyJunk"] == {"mode": "real", "dayMinutes": 24, "fixedHour": 9, "weather": "auto"}, "chuỗi không phải JSON → mặc định")
    ok(r and r["music"] == [False, 0.25], "nhạc nền Tắt + âm lượng 25% đọc lại được")
    ok(r and r["crow"] == [{"kb-crow-mode": "vi"}], "Đuổi quạ: đổi chế độ ghi qua prefs:set")

    print("== trò chơi: không có hai đáp án cùng đúng (audit BUG-04, node)")
    r = node(r"""
const ctx = { window: { addEventListener() {} }, document: { addEventListener() {}, getElementById() { return null; } },
  localStorage: { getItem: () => null, setItem() {} }, console, navigator: {}, setTimeout, clearTimeout, setInterval, clearInterval };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ADDON, 'web/games.js'), 'utf8') + '\nthis.G = GardenGames;', ctx);
const items = [
  { nid: 1, word: "big", meaning: "to lớn", reading: "bɪɡ" }, { nid: 2, word: "large", meaning: "to lớn", reading: "lɑːdʒ" },
  { nid: 3, word: "small", meaning: "nhỏ", reading: "smɔːl" }, { nid: 4, word: "little", meaning: "nhỏ", reading: "ˈlɪtl" },
  { nid: 5, word: "shop", meaning: "cửa hàng", reading: "ʃɒp" }, { nid: 6, word: "store", meaning: "cửa hàng", reading: "stɔː" },
  { nid: 7, word: "begin", meaning: "bắt đầu", reading: "bɪˈɡɪn" }, { nid: 8, word: "start", meaning: "bắt đầu", reading: "stɑːt" },
  { nid: 9, word: "橋", meaning: "cây cầu", reading: "はし" }, { nid: 10, word: "箸", meaning: "đôi đũa", reading: "はし" },
  { nid: 11, word: "雨", meaning: "mưa", reading: "あめ" }, { nid: 12, word: "飴", meaning: "kẹo", reading: "あめ" },
  { nid: 13, word: "apple", meaning: "quả táo", reading: "ˈæpl" }, { nid: 14, word: "book", meaning: "quyển sách", reading: "bʊk" }];
let bad = 0, badOld = 0, n = 0;
for (let k = 0; k < 400; k++) {
  for (const t of items) {
    // Chợ sáng Nghĩa → Từ: hỏi nghĩa, chọn từ
    const o = ctx.G._choices(t, items, 4, "word", "vocab", "meaning");
    n++;
    if (o.filter((p) => p.meaning === t.meaning).length > 1) { bad++; }
    const old = ctx.G._choices(t, items, 4, "word", "vocab");
    if (old.filter((p) => p.meaning === t.meaning).length > 1) { badOld++; }
    // Nghe tìm cây: nghe cách đọc, chọn chữ
    const l = ctx.G._choices(t, items, 6, "word", "vocab", "reading");
    if (l.filter((p) => p.reading === t.reading).length > 1) { bad++; }
  }
}
console.log(JSON.stringify({ bad: bad, badOld: badOld, n: n }));
""")
    ok(r and r["bad"] == 0, "Chợ sáng (hỏi nghĩa) + Nghe tìm cây (nghe cách đọc): %s câu, %s câu có hai đáp án cùng đúng"
       % (r and r["n"], r and r["bad"]))
    ok(r and r["badOld"] > 0, "đối chứng: cách chọn cũ (không xét mặt câu hỏi) ra %s câu hai đáp án đúng" % (r and r["badOld"]))
    games_src = open(os.path.join(ADDON, "web", "games.js"), encoding="utf-8").read()
    ok("choices(target, pickFrom, Math.min(4, pickFrom.length), key, kind, ask)" in games_src
       and 'kind === "grammar" ? null : "reading")' in games_src and "crowAnswers(c)" in games_src,
       "Chợ sáng truyền mặt câu hỏi, Nghe tìm cây tránh từ đồng âm, Đuổi quạ nhận cả từ cùng chữ trên biển")
else:
    print("– bỏ qua phần JS (không có node)")

# ---------------------------------------------------------------------------
print("== Undo lùi chuỗi tưới (audit BUG-02)")


def quest_wallet(streak, cur):
    return {"coins": 100, "waters": 10, "harvests": 0, "home": core._empty_home(), "mobile": None,
            "quest": {"day": 100, "list": [{"id": "100-0", "kind": "streak", "target": 10, "reward": 20, "text": "Tưới liền 10 cây"},
                                           {"id": "100-1", "kind": "due", "target": 50, "reward": 20, "text": "Tưới 50 cây"}],
                      "progress": {"streak": streak, "streak_cur": cur, "new": 10}, "done": ["100-0"], "chest": False, "chest_item": None}}


d = quest_wallet(10, 10)
e10 = {"gained": 1, "quest_coins": 20, "quest_done": ["100-0"], "qday": 100, "before": "new", "ease": 3, "day": 100,
       "streak0": 9, "streak_cur0": 9}
take = core.undo_reward(d, e10)
pr = d["quest"]["progress"]
ok(take == 21 and pr["streak"] == 9 and pr["streak_cur"] == 9 and pr["new"] == 9 and "100-0" not in d["quest"]["done"],
   "Undo lượt thứ 10: chuỗi 10 → 9, nhiệm vụ chuỗi bỏ hoàn thành, trừ 21 xu: " + json.dumps(pr))
res = core._settle_quests(d)
ok(not res.get("done") and d["coins"] == 79 and "100-0" not in d["quest"]["done"], "ván trò chơi sau đó (_settle_quests): không trao lại thưởng chuỗi (1.25.2: +20 xu)")
e9 = {"gained": 1, "qday": 100, "before": "new", "ease": 3, "day": 100, "streak0": 8, "streak_cur0": 8}
core.undo_reward(d, e9)
ok(d["quest"]["progress"]["streak"] == 8 and d["quest"]["progress"]["streak_cur"] == 8, "Undo thêm lượt thứ 9: chuỗi về 8")
d = quest_wallet(12, 3)          # chuỗi dài nhất 12 đã xong từ trước, chuỗi đang tưới 3
core.undo_reward(d, {"gained": 1, "qday": 100, "before": "review", "ease": 3, "day": 100, "streak0": 12, "streak_cur0": 2})
ok(d["quest"]["progress"]["streak"] == 12 and d["quest"]["progress"]["streak_cur"] == 2,
   "chuỗi dài nhất đã có từ trước không bị giảm, chuỗi đang tưới 3 → 2")
d = quest_wallet(5, 0)            # Undo một lượt "Lại" (cắt chuỗi) → chuỗi đang tưới về như trước lượt đó
core.undo_reward(d, {"gained": 0, "qday": 100, "before": "review", "ease": 1, "day": 100, "streak0": 5, "streak_cur0": 5})
ok(d["quest"]["progress"]["streak_cur"] == 5, "Undo lượt bấm Lại: chuỗi đang tưới 0 → 5 như trước")
d = quest_wallet(10, 10)
core.undo_reward(d, {"gained": 1, "qday": 100, "before": "new", "ease": 3, "day": 100})
ok(d["quest"]["progress"]["streak"] == 10, "sổ của bản cũ (không có streak0) → không đụng chuỗi")
d = quest_wallet(10, 10)
core.undo_reward(d, {"gained": 1, "qday": 99, "before": "new", "ease": 3, "day": 99, "streak0": 1, "streak_cur0": 1})
ok(d["quest"]["progress"]["streak"] == 10, "lượt của ngày nhiệm vụ khác → không đụng chuỗi hôm nay")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok('"streak0": streak0 if sday0 == qday else 0' in init, "sổ phần thưởng ghi chuỗi trước lượt ôn")
ok("STATE.on_load = _undo_on_load" in init and "STATE.on_save = _undo_on_save" in init and "_redo_possible()" in init
   and "gui_hooks.operation_did_execute.append(_on_op)" in init and "_flush_undo(force=True)" in init,
   "Undo không ghi ngay (giữ Redo của Anki): ví đọc ra đã trừ, ghi khi hết Redo / lần ghi ví sau / đồng bộ / đóng hồ sơ")

print("== GardenState.on_load / on_save (móc cho Undo)")
col = FakeCol()
st = core.GardenState(os.path.join(TMP, "s1", "state.json"), col_getter=lambda: col)
st.today_override = 100
w = st.load(); w["coins"] = 50; st.save(w)
calls = []
st.on_load = lambda data: data.__setitem__("coins", data["coins"] - 7)
st.on_save = lambda data: calls.append(data["coins"])
ok(st.load()["coins"] == 43 and col.conf[core.CONFIG_KEY]["coins"] == 50, "on_load áp vào ví đọc ra, collection chưa đổi")
st.save(st.load())
ok(calls == [43] and col.conf[core.CONFIG_KEY]["coins"] == 43, "on_save chạy trước khi ghi")
st.on_load = lambda data: 1 / 0
ok(st.load()["coins"] == 43, "móc on_load lỗi → vẫn đọc được ví")

# ---------------------------------------------------------------------------
print("== ảnh vườn theo hồ sơ (audit BUG-06)")
root = os.path.join(TMP, "anh_vuon")
os.makedirs(root)
png = b"\x89PNG\r\n\x1a\n" + b"0" * 32
for ds in ("2026-11-02", "2026-11-09"):
    open(os.path.join(root, ds + ".png"), "wb").write(png)
kA, kB = "a" * 16, "b" * 16
fB = journal.profile_photo_dir(root, kB, adopt=False)
ok(fB == os.path.join(root, kB) and journal.photos(fB) == [] and journal.month_photo(fB, 2026, 11) is None,
   "hồ sơ B mới tinh (chưa có ví): không thấy ảnh của hồ sơ khác, bìa nhật ký dùng hình mặc định")
ok(journal.photo_due(fB, __import__("datetime").date(2026, 11, 10)), "hồ sơ B: tới lượt tự chụp ảnh của chính nó")
fA = journal.profile_photo_dir(root, kA, adopt=True)
ok(journal.photos(fA) == ["2026-11-02", "2026-11-09"] and journal.photos(root) == [], "hồ sơ A (đã có ví): nhận ảnh cũ của bản ≤ 1.25.2")
ok(journal.month_photo(fA, 2026, 11)[0] == "2026-11-09", "bìa tháng 11 của A là ảnh của A")
journal.save_photo(fB, __import__("datetime").date(2026, 11, 10), "data:image/png;base64," + __import__("base64").b64encode(png).decode())
ok(journal.photos(fB) == ["2026-11-10"] and journal.photos(fA) == ["2026-11-02", "2026-11-09"], "B chụp ảnh: chỉ vào thư mục của B")
ok(journal.profile_photo_dir(root, "", True) == root and journal.profile_photo_dir(root, "../x", True) == root,
   "không biết hồ sơ / mã lạ → thư mục chung như cũ")
ok("journal.month_photo(_photo_dir(), y, m)" in init and "journal.photo_due(_photo_dir(), today)" in init
   and "PHOTO_DIR, today" not in init, "mọi chỗ đọc / ghi ảnh vườn dùng thư mục của hồ sơ đang mở")
ok("_words_cache.clear()" in init and 'k = (ds, lang, str(getattr(mw.col, "path", "") or ""), mine)' in init,
   "gợi ý luyện viết: khoá nhớ tạm có hồ sơ + deck đã chọn, đổi hồ sơ thì xoá (audit BUG-05)")

# ---------------------------------------------------------------------------
print("== dữ liệu sai kiểu (audit BUG-07 + fuzz)")
BAD = [None, True, False, 0, 1, -1, 1.5, float("nan"), "", "x", [], [None], [[]], {}, {"x": []}, {"x": {}}, [1, 2], 10 ** 30, "\u0000"]


def nodes(x, path=()):
    yield path
    if isinstance(x, dict):
        for k, v in x.items():
            yield from nodes(v, path + (k,))
    elif isinstance(x, list):
        for i, v in enumerate(x[:4]):
            yield from nodes(v, path + (i,))


def setp(x, path, val):
    if not path:
        return val
    y = copy.deepcopy(x)
    cur = y
    for p_ in path[:-1]:
        cur = cur[p_]
    cur[path[-1]] = val
    return y


def fuzz(name, fn, sample):
    errs, n = {}, 0
    for path in list(nodes(sample)):
        for bad in BAD:
            n += 1
            try:
                fn(setp(sample, path, bad))
            except Exception as err:
                errs.setdefault(type(err).__name__ + ": " + str(err)[:60], (path, repr(bad)))
    ok(not errs, "%s: %d lần gọi với dữ liệu sai kiểu, không ném lỗi%s" % (name, n, "" if not errs else " — " + json.dumps(
        {k: str(v) for k, v in list(errs.items())[:3]}, ensure_ascii=False)))


more_sample = {"repair": {"day": 3, "seen": 2, "back": 1}, "pets": {"neko": {"name": "Mi", "scene": "yard", "fed": 3, "love": 2, "got": 1}},
               "pet_auto": True, "seeds": {"owned": ["sakura"], "deck": {"123": "sakura"}, "kind": {"vocab": "sakura"}, "tag": [["n5", "sakura"]]},
               "zones": [{"id": "u1", "name": "A", "bg": "meadow", "ground": "grass", "hills": "green", "lm": ""}], "znext": 2,
               "places": {"u1": [{"id": "flowers", "x": 5, "y": 1}]}, "zenv": {"u1": ""},
               "paper_sub": {"until": "2026-11-20", "plan": "tuan", "auto": True, "trial": True, "paid": 100}}
fuzz("more.clean_more", lambda d: more.clean_more(d, core.CRAFT_PALETTE), more_sample)
fuzz("share.clean_myseeds", share.clean_myseeds, {"items": {"g1": {"name": "G"}}, "next": 2,
                                                  "rules": {"deck": {"1": "g1"}, "kind": {"vocab": "g1"}, "tag": [["a", "g1"]]}})
fuzz("fields.clean_store", fields.clean_store, {"models": {"123": {"kind": "vocab", "f": {"word": "Front"}, "name": "Basic"}},
                                                "games": {"market": {"vocab": "mix"}}, "lang": {"123": "ja"}, "games_lang": {"en": {"market": "mix"}}})
fuzz("_clean_quest", core._clean_quest, {"day": 5, "list": [{"kind": "due", "target": 10}], "progress": {"due": 3, "streak": 2},
                                         "done": ["due"], "chest": False, "chest_item": None})
fuzz("_clean_home", lambda d: core._clean_home(d, core.full_catalog({"craft": core._clean_craft(None)})),
     {"house": 3, "style": "minka", "styles": ["minka"], "owned": {"bench": 1}, "yard": [{"id": "bench", "x": 5, "y": 1}],
      "room": [{"id": "lamp", "x": 1, "y": 0}], "zones": ["beach"]})
fuzz("_clean_wear", core._clean_wear, {"owned": ["leaf"], "on": {"head": "leaf"}, "faces": ["wink"], "faces_off": []})
fuzz("_clean_craft", core._clean_craft, {"items": {"c1": {"name": "T", "size": 16, "kind": "ground", "fx": "sway"}}, "next": 2})
fuzz("season.clean_season", season.clean_season, {"unlocked": ["xmas"], "mode": "auto", "pick": "xmas", "free_day": 3,
                                                  "owned": {"x": 1}, "places": {"yard": [{"id": "x", "x": 5, "y": 1}]}})
fuzz("clean_mobile", core.clean_mobile, {"start": 1, "days": {"5": {"all": 3, "ok": 2, "rev": 1, "new": 1}}, "goals": [5], "total": 3, "last": 1})
fuzz("clean_ui", more.clean_ui, {"main": {"yard": "full"}, "scene": "large"})
fuzz("clean_prefs", more.clean_prefs, {"kb-sky": "{}", "kb-joy-5-x": "1"})
fuzz("words.clean_src", lambda d: words.clean_src(d, lambda i: True), {"ja": {"decks": [1, 2], "mode": "deck"}, "en": {"decks": []}})
for bad in ([], {}, [None], {"x": []}):
    m = more.clean_more({"seeds": {"owned": ["ine"], "kind": {"vocab": bad}, "deck": {"1": bad}, "tag": [["a", bad]]}}, core.CRAFT_PALETTE)
    ok(m["seeds"]["owned"] == ["ine"] and m["seeds"]["kind"] == {} and m["seeds"]["deck"] == {} and m["seeds"]["tag"] == [],
       "luật giống %s → chỉ bỏ luật hỏng, giữ giống đã mua (1.25.2: TypeError, không dựng được vườn)" % json.dumps(bad))

print("== một món đặt hỏng không xoá nhà")
col = FakeCol()
st = core.GardenState(os.path.join(TMP, "s2", "state.json"), col_getter=lambda: col)
st.today_override = 100
w = st.load(); w["coins"] = 10 ** 6; st.save(w)
for _ in range(7):
    st.build()
st.buy("fence"); st.place("yard", "fence", 5, 1)
for bad in ([], {}, ["x"]):
    col.conf[core.CONFIG_KEY]["home"]["yard"].append({"id": bad, "x": 1, "y": 1})
    w = st.load()
    st.save(w)
    hh = col.conf[core.CONFIG_KEY]["home"]
    ok(w["home"]["house"] == 7 and hh["house"] == 7 and [e["id"] for e in hh["yard"]] == ["fence"],
       "món ngoài sân có id %s → bỏ món đó, nhà cấp 7 + hàng rào còn nguyên sau khi lưu (1.25.2: nhà về 0)" % json.dumps(bad))
col.conf[core.CONFIG_KEY]["wear"] = {"owned": 5, "on": {"head": ["x"]}}
col.conf[core.CONFIG_KEY]["craft"] = {"items": {"c1": {"size": [16], "kind": {}, "name": "x"}}, "next": 2}
w = st.load()
ok(w["home"]["house"] == 7 and w["wear"]["owned"] == [] and w["craft"]["items"] == {}, "tủ đồ / món tự làm sai kiểu → trống, nhà vẫn còn")
col.conf[core.MORE_KEY] = dict(col.conf.get(core.MORE_KEY) or {}, zones=[{"id": "u1", "name": "Z", "bg": ["x"], "ground": {}, "hills": [1]}])
w = st.load()
ok(w["more"]["zones"] and w["more"]["zones"][0]["bg"] == more.UZONE_DEFAULT["bg"], "vùng tự tạo có nền sai kiểu → nền mặc định, vẫn mở vườn")

# ---------------------------------------------------------------------------
print("== trời phía trên mái ở cỡ cảnh Lớn (home.js)")
home = open(os.path.join(ADDON, "web", "home.js"), encoding="utf-8").read()
body = home[home.index("function drawHouseScene("):home.index("// Kiểm tra chỗ đặt")]
ok("gardenBand(ctx, S, hx - 4, hx + HOUSE3.W + 4, -1, hz + 1, hz, st, 0)" in body and "Math.min(hz, hy + 1)" not in body,
   "dải trời phía trên nhà dùng cùng đường chân trời hz với hai bên (1.25.2: hy + 1 → khối chữ nhật sáng hơn)")
ok("drawWeather(ctx, S, 0, 0, now, hx - 4, hx + HOUSE3.W + 4, hy, st)" in body, "mưa / tuyết / chớp cả phía trên mái (1.25.2: chỉ hai bên)")
if NODE:
    r = node(r"""
// dựng lại công thức dải màu của gardenBand: màu ở cùng một hàng y phải giống nhau giữa hai bên và phía trên mái
function bands(y0, hz, y) { const n = 7; for (let b = 0; b < n; b++) { const a = y0 + Math.floor((hz - y0) * b / n), c = y0 + Math.floor((hz - y0) * (b + 1) / n); if (y >= a && y < c) { return b; } } return -1; }
const out = [];
for (const hy of [20, 40, 64, 120]) {
  const hz = hy + 40;
  let diffNew = 0, diffOld = 0;
  for (let y = 0; y < hy; y++) { if (bands(-1, hz, y) !== bands(-1, hz, y)) diffNew++; if (bands(-1, Math.min(hz, hy + 1), y) !== bands(-1, hz, y)) diffOld++; }
  out.push([hy, diffNew, diffOld]);
}
console.log(JSON.stringify(out));
""")
    ok(r and all(x[1] == 0 for x in r) and any(x[2] > 0 for x in r),
       "mọi hàng phía trên mái cùng màu với hai bên (cách cũ lệch %s hàng ở các độ cao %s)" % (
           [x[2] for x in r] if r else "?", [x[0] for x in r] if r else "?"))

print("== 1.25.4: cỡ cảnh Lớn ×5 (người dùng chọn A'), bỏ bụi cây vuông cạnh nhà, đèn lồng giấy")
mainy = home[home.index("function drawMainYard("):home.index("// Bảng Nhà & Cửa hàng")]
ok("Math.round(big * 5 / 7)" in mainy and "padTop: pad" in mainy and "const hgt = (YARD.H + pad) * S" in mainy,
   "Lớn: điểm ảnh bằng 5/7 trước (×7 → ×5), dải cao như cũ, phần thêm là trời (padTop)")
outd = home[home.index("function drawOutdoor("):home.index("function houseStyle(")]
ok("drawSky(ctx, S, ox, oy - P0, now, bx0, bx1, YARD.SKY + P0, st)" in outd and "drawWeather(ctx, S, ox, oy - P0" in outd
   and outd.count("sea.garland(ctx, S, ox, oy - P0") == 2 and "skyPad = P0" in outd,
   "trời / mưa / dây trang trí trải cả phần trời thêm, cả ở các vùng (skyPad)")
ok(home.count("drawSky(ctx, S, ox, oy - skyPad, now, x0, x1, G0 + skyPad, st)") == 2, "nền vùng có sẵn + vùng tự tạo dùng trời cao")
ok(home.count("/ mainView.S - (mainView.oy || 0)") == 4, "bấm vào thú / khách / đồ / chỗ lấp lánh (1.28) trên màn chính tính cả độ lệch dọc")
band = home[home.index("function gardenBand("):home.index("function roofOver(")]
ok("box(ctx, bx + 1, by + 3, 12, 6, P.k, S)" not in band, "dải Trong nhà: bỏ bụi cây vuông xanh sát tường (giữ hoa nhỏ)")
cho = home[home.index("SPR.chochin = ["):home.index("SPR.maneki")]
rows = re.findall(r'"([^"]+)"', re.sub(r"//[^\n]*", "", cho))
ok(len(rows) == 18 and rows[11] == "....kbk..." and len(set(map(len, rows))) == 1, "đèn lồng giấy: cán nối liền thân (hàng 12: ....kbk...)")

shutil.rmtree(TMP, ignore_errors=True)
print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
