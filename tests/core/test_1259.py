"""Test offline cho 1.25.9 — lỗi của nhánh audit 11/11 (rà trên 1.25.3, kiểm lại trên 1.25.8) + vé giữ chuỗi + sửa được
khung động / hình dựng từ hình khác. python thường (stub anki) + node.

- F01: đồ tự làm ở Bếp / Phòng ngủ cất rồi không hiện lại, lưu lặp không nhân bản chỗ đặt; món của bản mới hơn vẫn giữ;
- F02: luyện viết tiếng Anh 30 từ dài không bị cắt ở 400 ký tự, cắt ký tự không cắt giữa từ;
- F09: file sao lưu điểm ảnh món tự làm có chủ — hồ sơ khác không đọc;
- F10: trần bù xu 1000 / ngày tính cho cả ngày, không theo từng lần đồng bộ;
- F12: nhiệm vụ thiếu id / text / reward bị bỏ, không KeyError;
- F13: mốc giai đoạn phải tăng dần;
- vé giữ chuỗi: làm sạch, mua (giá, tối đa, ngày mua), dùng vé (hôm qua, chỗ hổng giữa chuỗi, thiếu vé, mua sau khi quên),
  chuỗi tính cả ngày dùng vé (không cộng), chuỗi dài nhất của Lịch hoa, bản cũ lưu không mất vé;
- nối dây: F04 (IME), F05 (trần xu 0), F06 (trời cố định), F07 (hàng chờ thông báo), F08 (ngôn ngữ theo hồ sơ), khung
  thay thế ALT sửa được (node: nhãn fix.js, đăng ký nhóm "do").

Chạy: python test_1259.py THƯ_MỤC_ADD_ON
"""
import copy, datetime, json, os, re, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core
import journal_core as journal
import more_core as more

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1259_")
NODE = shutil.which("node")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*parts):
    return open(os.path.join(ADDON, *parts), encoding="utf-8").read()


class Col:
    """Collection giả: cấu hình + đường dẫn (định danh hồ sơ cho file sao lưu)."""
    def __init__(self, name):
        os.makedirs(os.path.join(TMP, "prof_" + name), exist_ok=True)
        self.path = os.path.join(TMP, "prof_" + name, "collection.anki2")
        self.conf = {}

    def get_config(self, key, default=None):
        return copy.deepcopy(self.conf.get(key, default))

    def set_config(self, key, value):
        self.conf[key] = copy.deepcopy(value)


def fresh(name, col=None):
    d = os.path.join(TMP, name)
    os.makedirs(d, exist_ok=True)
    st = core.GardenState(os.path.join(d, "state.json"), (lambda: col) if col else None)
    data = st.load()
    data["coins"] = 50000
    data["home"]["house"] = 7
    data["home"]["rooms"] = ["kitchen", "bedroom"]
    st.save(data)
    return st


def place_craft(st, scene, kind, size):
    data = st.craft_save({"name": "Mẫu", "kind": kind, "size": size, "fx": "none", "px": core.px_encode("r" * size * size)})
    cid = data["craft_id"]
    for y in range(4):
        for x in range(9):
            try:
                core.check_spot(data["home"], scene, cid, x, y, cat=core.full_catalog(data))
            except core.HomeError:
                continue
            st.place(scene, cid, x, y)
            return cid
    raise AssertionError("không tìm được chỗ đặt")


print("== F01: đồ tự làm ở Bếp / Phòng ngủ")
for scene in ("kitchen", "bedroom"):
    for kind, size in (("floor", 16), ("wall", 24), ("floor", 32)):
        st = fresh("f01_%s_%s_%d" % (scene, kind, size))
        cid = place_craft(st, scene, kind, size)
        counts = []
        for _ in range(3):
            st.save(st.load())
            raw = json.load(open(st._nha_path(), encoding="utf-8"))
            counts.append(len(raw.get("places", {}).get(scene, [])))
        st.take(scene, 0)
        after = st.load()
        ok(counts == [1, 1, 1] and after["home"][scene] == [] and after["home"]["owned"].get(cid) == 1,
           "%s %s %d: lưu lặp giữ 1 chỗ đặt %s, cất xong gian trống, món về kho" % (scene, kind, size, counts))
st = fresh("f01_foreign")
data = st.load()
st.save(data)
raw = json.load(open(st._nha_path(), encoding="utf-8"))
raw.setdefault("places", {}).setdefault("kitchen", []).append({"id": "zz_future", "x": 1, "y": 1})
raw["owned"] = dict(raw.get("owned") or {}, zz_future=1)
json.dump(raw, open(st._nha_path(), "w", encoding="utf-8"))
st.save(st.load())
raw2 = json.load(open(st._nha_path(), encoding="utf-8"))
ok(any(e.get("id") == "zz_future" for e in raw2["places"].get("kitchen", [])) and raw2["owned"].get("zz_future") == 1,
   "món của bản mới hơn (id lạ) ở Bếp vẫn giữ khi bản này lưu")
ok(core.known_item("c12") and core.known_item("chochin") and not core.known_item("zz_future") and not core.known_item("c")
   and not core.known_item(None), "known_item: món có sẵn + món Xưởng c<số>")

print("== F02: luyện viết tiếng Anh")
for word, n in (("extraordinarilylong", 30), ("internationalization", 30), ("a", 30), ("supercalifragilisticexpialidocious", 30)):
    text = " ".join([word] * n)
    got = journal.clean_writing({"lang": "en", "goc": text, "st": ""})["goc"]
    ok(got == text, "30 từ '%s…' (%d ký tự) giữ nguyên" % (word[:8], len(text)))
text31 = " ".join(["internationalization"] * 31)
got = journal.clean_writing({"lang": "en", "goc": text31, "st": ""})["goc"]
ok(journal.count_units(got, "en") == 30 and got.endswith("internationalization"), "31 từ → cắt còn 30, hết một từ trọn vẹn")
ja = "あ" * 60
ok(journal.clean_writing({"lang": "ja", "goc": ja, "st": ""})["goc"] == ja, "tiếng Nhật 60 ký tự giữ nguyên")
ok(journal.clip_chars("abc " * 400, 1200).endswith("abc") and len(journal.clip_chars("abc " * 400, 1200)) <= 1200,
   "clip_chars: cắt ở ranh giới từ, không quá trần")
ok(len(journal.clip_chars("x" * 5000, 1200)) == 1200, "clip_chars: một chuỗi liền (không dấu cách) cắt thẳng")
done = journal.clean_writing({"lang": "en", "goc": text, "st": "done", "sua": text, "tu_nhien": text, "loi": []})
ok(done["sua"] == text and done["tu_nhien"] == text, "bài đã sửa / cách nói tự nhiên dài cũng không bị cắt ở 400")

print("== F09: điểm ảnh món tự làm theo hồ sơ")
a, b = Col("A"), Col("B")
shared = os.path.join(TMP, "shared_px")
os.makedirs(shared, exist_ok=True)
sa = core.GardenState(os.path.join(shared, "state.json"), lambda: a)
sa.save_px({"c1": "pixels-A"})
ok(sa.load_px() == {"c1": "pixels-A"}, "hồ sơ A đọc đúng của mình")
a.conf.pop(core.PX_KEY, None)
ok(sa.load_px() == {"c1": "pixels-A"}, "A mất khoá trong collection → lấy lại từ file sao lưu (đúng chủ)")
sb = core.GardenState(os.path.join(shared, "state.json"), lambda: b)
ok(sb.load_px() == {}, "hồ sơ B (chưa có khoá) không nhận điểm ảnh của A")
raw = json.load(open(sa._px_path(), encoding="utf-8"))
ok(raw.get(core.OWNER_KEY) and "c1" in raw, "file sao lưu ghi chủ")
nocol = core.GardenState(os.path.join(shared, "state.json"))
ok(core.OWNER_KEY not in nocol.load_px(), "không có collection (test) → không lẫn khoá chủ vào danh sách món")

print("== F10: trần bù xu theo ngày")
for batches in ([600, 600], [800, 800], [1000, 1], [400, 400, 400], [999], [1500]):
    data = fresh("f10_" + "_".join(map(str, batches))).load()
    data["coins"] = 0
    data["mobile"] = core.new_mobile(1)
    cum = 0
    for nb in batches:
        cum += nb
        core.settle_mobile(data, {100: dict(day_all=cum, all=cum, ok=cum, rev=cum, new=0)}, 100, 100, 99999, 0)
    ok(data["coins"] == min(1000, cum), "đợt %s → %d xu (trần 1000 / ngày)" % (batches, data["coins"]))
m = core.clean_mobile({"start": 1, "days": {"100": {"all": 5, "ok": 5, "rev": 5, "new": 0, "paid": 700}}})
ok(m["days"]["100"]["paid"] == 700, "clean_mobile giữ số đã bù trong ngày")
m = core.clean_mobile({"start": 1, "days": {"100": {"all": 5, "ok": 5, "rev": 5, "new": 0, "paid": 10 ** 9}}})
ok(m["days"]["100"]["paid"] == core.MOBILE_DAY_CAP, "số đã bù quá lớn → chặn ở trần")
data = fresh("f10_two_days").load()
data["coins"] = 0
data["mobile"] = core.new_mobile(1)
core.settle_mobile(data, {99: dict(day_all=900, all=900, ok=900, rev=900, new=0),
                          100: dict(day_all=900, all=900, ok=900, rev=900, new=0)}, 100, 100, 99999, 0)
ok(data["coins"] == 1800, "hai ngày khác nhau: mỗi ngày trần riêng")

print("== F12: nhiệm vụ thiếu trường")
tpl = {"id": "100-0", "kind": "due", "target": 1, "reward": 20, "text": "Ôn 1 thẻ"}
for k in ("id", "reward", "text", "target"):
    q = dict(tpl)
    q.pop(k)
    data = fresh("f12_" + k).load()
    data["quest"] = core._clean_quest({"day": 100, "list": [q, dict(tpl, id="100-1")], "progress": {"due": 1}, "done": []})
    try:
        core.quest_view(data)
        core._settle_quests(data)
        good = [x["id"] for x in data["quest"]["list"]] == ["100-1"]
    except Exception as err:
        good = False
        print("    ", type(err).__name__, err)
    ok(good, "thiếu %s → bỏ nhiệm vụ đó, không ném lỗi, nhiệm vụ còn lại vẫn chạy" % k)
q = core._clean_quest({"day": 100, "list": [dict(tpl, reward=True), dict(tpl, target=0), dict(tpl, reward=-5)]})
ok(q["list"] == [], "reward bool / target 0 / reward âm → bỏ")

print("== F13: mốc giai đoạn")
for raw, want in (([90, 3, 21], [3, 21, 90]), ([3, 3, 90], [3, 21, 90]), ([3, 90, 21], [3, 21, 90]), ([5, 30, 120], [5, 30, 120]),
                  ([2.5, 10, 50], [2.5, 10, 50]), ([5], [5, 21, 90]), ([30], [3, 21, 90]), ("4,40,200", [4, 40, 200]),
                  ([0, 21, 90], [3, 21, 90])):
    got = core.merged_config({"stage_days": raw})["stage_days"]
    ok(got == want, "stage_days %r → %r" % (raw, got))

print("== Vé giữ chuỗi: làm sạch")
c = more.clean_freeze({"n": 5, "days": ["2026-11-01", "bad", "2026-10-30", "2026-11-01"], "since": "2026-10-01"})
ok(c == {"n": 2, "days": ["2026-10-30", "2026-11-01"], "since": "2026-10-01"}, "n tối đa 2, ngày hợp lệ không trùng, giữ ngày mua")
ok(more.clean_freeze({"n": True}) == {"n": 0, "days": [], "since": None}, "n sai kiểu → 0")
ok(more.clean_freeze({"n": 0, "since": "2026-10-01"})["since"] is None, "hết vé → bỏ ngày mua")
ok(more.clean_freeze(None) == {"n": 0, "days": [], "since": None} and more.empty_more()["freeze"]["n"] == 0, "mặc định 0 vé")

T = datetime.date(2026, 11, 12)


def fz(n, since, days=()):
    return {"n": n, "days": list(days), "since": since}


print("== Vé giữ chuỗi: dùng vé")
f = fz(1, "2026-11-01")
used = more.freeze_settle(f, {0, -2, -3, -4}, T)
ok(used == ["2026-11-11"] and f["n"] == 0 and f["since"] is None, "quên hôm qua, có 1 vé mua trước → dùng 1 vé")
ok(more.streak_with({0, -2, -3, -4}, more.frozen_rel(f["days"], T)) == 4, "chuỗi 4 ngày (ngày dùng vé nối chuỗi, không cộng)")
f = fz(1, "2026-11-01")
used = more.freeze_settle(f, {-2, -3}, T)
ok(used == ["2026-11-11"] and more.streak_with({-2, -3}, more.frozen_rel(f["days"], T)) == 2,
   "hôm nay chưa ôn, quên hôm qua → vẫn giữ chuỗi 2 ngày")
f = fz(1, "2026-11-12")
ok(more.freeze_settle(f, {-2, -3}, T) == [] and f["n"] == 1, "mua vé hôm nay sau khi đã quên hôm qua → không vá (giữ vé)")
f = fz(1, "2026-11-01")
ok(more.freeze_settle(f, {-3, -4}, T) == [] and f["n"] == 1, "quên 2 ngày mà chỉ có 1 vé → chuỗi đứt, giữ vé")
f = fz(2, "2026-11-01")
used = more.freeze_settle(f, {-3, -4}, T)
ok(used == ["2026-11-10", "2026-11-11"] and f["n"] == 0, "quên 2 ngày, có 2 vé → dùng cả 2")
f = fz(1, "2026-11-01")
used = more.freeze_settle(f, {0, -1, -2, -4, -5}, T)
ok(used == ["2026-11-09"] and more.streak_with({0, -1, -2, -4, -5}, more.frozen_rel(f["days"], T)) == 5,
   "mấy hôm không mở vườn, chỗ hổng nằm giữa chuỗi → vẫn vá")
f = fz(1, "2026-11-10")
ok(more.freeze_settle(f, {0, -1, -2, -4, -5}, T) == [], "chỗ hổng trước ngày mua vé → không vá")
f = fz(2, "2026-11-01")
ok(more.freeze_settle(f, set(), T) == [] and f["n"] == 2, "chưa ôn bao giờ → không dùng vé")
f = fz(1, "2026-11-01")
ok(more.freeze_settle(f, {0, -1, -2}, T) == [] and f["n"] == 1, "không quên ngày nào → không dùng vé")
f = fz(2, "2026-11-01")
used = more.freeze_settle(f, {0, -2, -4}, T)
ok(used == ["2026-11-09", "2026-11-11"] and f["n"] == 0, "hai chỗ hổng một ngày, 2 vé → vá cả hai")
f = fz(2, "2026-11-01", ["2026-11-11"])
used = more.freeze_settle(f, {0, -2, -3}, T)
ok(used == [] and f["n"] == 2, "ngày đã dùng vé không dùng lại")
ok(more.streak_with({-1, -2}, set()) == 2 and more.streak_with({0, -1}, set()) == 2 and more.streak_with({-2}, set()) == 0,
   "chuỗi không có vé như cũ")
ok(more.frozen_rel(["2026-11-12", "2026-11-13", "2026-11-11", 5], T) == {-1}, "ngày dùng vé hôm nay / ngày tới bị bỏ")

print("== Vé giữ chuỗi: Lịch hoa")
days = {"2026-11-08", "2026-11-09", "2026-11-11", "2026-11-12"}
ok(journal.streaks(days, T) == (2, 2), "không vé: chuỗi 2, dài nhất 2")
ok(journal.streaks(days, T, ["2026-11-10"]) == (4, 4), "vé ngày 10/11: chuỗi 4, dài nhất 4 (ngày dùng vé không cộng)")
ok(journal.streaks({"2026-11-10"}, T, ["2026-11-11"]) == (1, 1), "hôm nay chưa ôn, hôm qua dùng vé → chuỗi 1")

print("== Vé giữ chuỗi: mua (GardenState)")
st = fresh("freeze_buy")
d = st.load()
d["coins"] = 400
st.save(d)
d = st.freeze_buy(T)
ok(d["coins"] == 250 and d["more"]["freeze"]["n"] == 1 and d["more"]["freeze"]["since"] == "2026-11-12", "mua 1 vé: −150 xu, ngày mua")
d = st.freeze_buy(T + datetime.timedelta(days=3))
ok(d["coins"] == 100 and d["more"]["freeze"]["n"] == 2 and d["more"]["freeze"]["since"] == "2026-11-12",
   "mua vé thứ hai: ngày mua giữ của vé đầu")
try:
    st.freeze_buy(T)
    ok(False, "mua quá 2 vé phải báo lỗi")
except core.HomeError as err:
    ok("2" in str(err), "đủ 2 vé → không mua thêm (%s)" % err)
st2 = fresh("freeze_poor")
d = st2.load()
d["coins"] = 100
st2.save(d)
try:
    st2.freeze_buy(T)
    ok(False, "thiếu xu phải báo lỗi")
except core.HomeError:
    ok(st2.load()["coins"] == 100 and st2.load()["more"]["freeze"]["n"] == 0, "thiếu xu → không mua, không trừ xu")
used = st.freeze_settle({0, -2, -3}, T + datetime.timedelta(days=4))
ok(used == ["2026-11-15"] and st.load()["more"]["freeze"]["n"] == 1 and st.frozen_days() == ["2026-11-15"],
   "GardenState.freeze_settle: dùng vé, lưu lại")

print("== Vé giữ chuỗi: bản cũ (1.25.8) lưu không mất vé")
store = {"v": 1, "pets": {}}
prev = {"v": 1, "freeze": {"n": 2, "days": ["2026-11-01"], "since": "2026-10-30"}}
ok(core.keep_foreign_more(store, prev)["freeze"]["n"] == 2, "keep_foreign_more giữ khoá freeze của bản mới hơn")

print("== nối dây (F04 / F05 / F06 / F07 / F08, vé, khung ALT)")
init = src("__init__.py")
gjs = src("web", "garden.js")
ok("e.isComposing || e.keyCode === 229" in gjs and "e.stopPropagation(); }\n    }, true);" in gjs, "F04: phím lúc bộ gõ đang chọn chữ không tới phím tắt (window, capture)")
ok('typeof d.fx.game_daily_coins === "number"' in src("web", "games.js"), "F05: trần xu trò chơi 0 hiện 0")
ok("def _fixed_weather" in init and 'date == ai_today()' in init, "F06: trời cố định ở ⚙ → thời tiết trong báo hôm nay")
ok("toastPend" in gjs and "if (toastPend || (toastCur" in gjs, "F07: câu đang chờ 250 ms không bị câu mới xoá")
ok('_presence["col"] != path' in init and '_presence.update(t=0.0, v={}, col="")' in init, "F08: ngôn ngữ theo collection, xoá khi đóng hồ sơ")
ok("frozen_now = _freeze_settle()" in init and 'elif name == "freeze":' in init and "STATE.freeze_buy(cal_today())" in init,
   "vé: dùng khi làm mới vườn, mua ở Lịch hoa")
ok(init.count("_daily_stats()") >= 4 and "core.daily_stats(col, STATE.frozen_days())" in init, "mọi chỗ tính chuỗi có ngày dùng vé")
cjs = src("web", "calendar.js")
ok("function freezeRow" in cjs and 'H.send("cal:freeze:" + v.id)' in cjs and "kb-cal-fz" in cjs, "Lịch hoa: dòng vé + ô ngày dùng vé")
for f, names in (("rare_art.js", ("SHIKA_BOW", "KAPPA_BLINK", "KABUTO_SHINE")), ("nha_art.js", ("FRIDGE_OPEN", "BED_UP")),
                 ("home.js", ("FOUNTAIN_ICE", "RICE_GOLD"))):
    s = src("web", f)
    ok(not any(n in s for n in names), "%s: khung thay thế nằm ở ALT (không còn hằng riêng)" % f)
hjs = src("web", "home.js")
ok("ALT, GLOW" in hjs and "Object.keys(ALT[id] || {})" in hjs and "ALT[id][name] = r" in hjs, "home.js: nhóm \"do\" đưa ALT vào Sửa hình")

if NODE:
    js = src("web", "fix.js") + """
;const got = ["cui","chop","loe","mo","phong","bang","vang","spr","base","f2"].map((n, i) => GardenFix.label("do", n, i));
console.log(JSON.stringify(got));"""
    p = os.path.join(TMP, "fix_label.js")
    open(p, "w", encoding="utf-8").write(js)
    out = subprocess.run([NODE, p], capture_output=True, text=True)
    got = json.loads(out.stdout or "[]")
    ok(got == ["Cúi chào", "Chớp mắt", "Loé sáng", "Mở cửa", "Chăn phồng", "Đóng băng", "Mùa thu", "Chính", "Tĩnh", "Khung 2"],
       "fix.js: nhãn khung thay thế %s" % got)
    # rare_art / nha_art: install ghi khung vào ALT, frameOf trả về đúng khung đó (bản sửa áp vào ALT thì cảnh dùng bản sửa)
    stub = """
const grid=(w,h)=>Array.from({length:h},()=>Array(w).fill('.'));const rect=(g,x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(g[j]&&i>=0&&i<g[j].length)g[j][i]=c;};
const dot=(g,x,y,c)=>rect(g,x,y,1,1,c);const disc=(g,cx,cy,r,c)=>{};const outline=g=>g;const rows=g=>g.map(r=>r.join(''));
const gline=()=>{};const ellipseFill=()=>{};const box=()=>{};
const L={grid,rect,disc,dot,outline,rows,gline,ellipseFill,SPR:{},BASE:{},GLOW:{},EXTRA:{},P:{},box,ALT:{}};
"""
    for f, ids in (("rare_art.js", {"shika": "cui", "kappa": "chop", "kabuto": "loe"}),
                   ("nha_art.js", {"reizouko": "mo", "beddo": "phong"})):
        mod = "GardenRareArt" if f == "rare_art.js" else "GardenNhaArt"
        js = src("web", f) + stub + """
const api=%s.install(L);const out={};
for (const [id,n] of Object.entries(%s)) {
  const has=!!(L.ALT[id]&&L.ALT[id][n]); L.ALT[id][n]=['FIX'];
  let seen=false; for (let t=0;t<20000;t+=20){ const f=api.frameOf({id:id,x:0},t); if(f&&f[0]==='FIX'){seen=true;break;} }
  out[id]=[has,seen];
}
console.log(JSON.stringify(out));""" % (mod, json.dumps(ids))
        p = os.path.join(TMP, "alt_" + f)
        open(p, "w", encoding="utf-8").write(js)
        out = subprocess.run([NODE, p], capture_output=True, text=True)
        try:
            res = json.loads(out.stdout or "{}")
        except ValueError:
            res = {}
            print(out.stderr[-400:])
        ok(res and all(v == [True, True] for v in res.values()), "%s: khung thay thế ở ALT, cảnh dùng bản đã sửa %s" % (f, res))
else:
    print("  (bỏ qua phần node: không có node)")

shutil.rmtree(TMP, ignore_errors=True)
print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d mục trượt" % len(FAIL)))
sys.exit(1 if FAIL else 0)
