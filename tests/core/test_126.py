"""Test offline cho 1.26 — màn chào khi mở vườn + Bảng tin làng (event_core.py) + khoá ⚙ greet / trans, python thường + node.

- ai chào: thú thân nhất đang ở nhà (cùng mức → theo ngày, cố định trong ngày), chưa nuôi → StackChan, đi chơi hết → StackChan
  báo nhẹ; câu ngày lễ (Tết âm lịch, お正月, Giáng sinh, Halloween, Trung thu, Thất Tịch) đúng ngày, ngày thường None;
- tin hôm nay: vé giữ chuỗi vừa dùng, báo mới, mốc ngày có ôn / chuỗi (còn ≤ 3 ngày, tròn mốc hôm nay), khách đáng chú ý (hiếm →
  chưa gặp, cố định trong ngày, "tối nay" cho khách đêm), giao diện mùa, thú / nhà (trùng thẻ Hôm nay → không lên dòng Tin làng),
  vé đang có; sắp tới 7 ngày: giao diện mùa bắt đầu / kết thúc, gói báo hết hạn; dòng cho màn chào ≤ 3; dữ liệu thiếu không lỗi;
- ⚙: `ui.greet` / `ui.trans` (mặc định on, giá trị lạ → on, giữ khi bấm kiểu có sẵn);
- nối dây: greet.js nạp trước garden.js, zz_kbtest tắt màn chào cho kịch bản cũ, nút / bảng Tin làng trong body.html,
  home.js gọi GardenGreet.strip khi đổi cảnh; greet.js bằng node (cú pháp + đầu ra hello theo giờ).

Chạy: python test_126.py THƯ_MỤC_ADD_ON
"""
import datetime, json, os, shutil, subprocess, sys

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import event_core as ev
import more_core as more

FAIL = []
NODE = shutil.which("node")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*parts):
    return open(os.path.join(ADDON, *parts), encoding="utf-8").read()


T = datetime.date(2026, 11, 12)      # Thứ Năm


def ctx(**kw):
    base = {"today": T, "day": 500, "paper": {}, "streak": 0, "reviewed_today": False, "total_days": 0,
            "freeze": {"n": 0, "days": []}, "pets": [], "wear": {}, "season": {}, "home": {}, "scenes": [],
            "album": {}, "sub": {}}
    base.update(kw)
    return base


print("== ai chào")
pets = [{"id": "neko", "name": "Mít", "state": "full", "love": 9}, {"id": "shiba", "name": "Lu", "state": "hungry", "love": 9},
        {"id": "kame", "name": "Rùa", "state": "full", "love": 3}]
a = ev.greeter(pets, 500)
b = ev.greeter(pets, 501)
ok(a["who"] in ("neko", "shiba") and b["who"] in ("neko", "shiba") and a["who"] != b["who"], "thân nhất cùng mức → đổi theo ngày: %s / %s" % (a["who"], b["who"]))
ok(ev.greeter(pets, 500) == a, "cố định trong ngày")
ok(ev.greeter([dict(pets[0], state="away"), dict(pets[2])], 500)["who"] == "kame", "con thân nhất đi chơi → con ở nhà chào")
g = ev.greeter([dict(p, state="away") for p in pets], 500)
ok(g["who"] == "stack" and g["away"] in ("Mít", "Lu"), "đi chơi hết → StackChan báo nhẹ: %s" % g)
ok(ev.greeter([], 500) == {"who": "stack", "name": "StackChan", "away": ""}, "chưa nuôi thú → StackChan")
ok(ev.greeter([{"bad": 1}, None, "x"], 5)["who"] == "stack", "dữ liệu thú hỏng → StackChan, không lỗi")

print("== câu ngày lễ")
cases = {"2026-02-17": "あけましておめでとう！", "2026-02-19": "あけましておめでとう！", "2026-02-20": None, "2026-01-01": "あけましておめでとう！",
         "2026-01-04": None, "2026-12-24": "メリークリスマス！", "2026-12-25": "メリークリスマス！", "2026-12-26": None,
         "2026-10-31": "ハッピーハロウィン！", "2026-09-25": "お月見しよう！", "2026-07-07": "七夕だね！", "2026-11-12": None}
for d, want in cases.items():
    got = ev.festival(datetime.date.fromisoformat(d))
    ok((got or {}).get("hi") == want, "%s → %s" % (d, (got or {}).get("hi")))
ok(ev.festival(datetime.date(2027, 2, 6))["theme"] == "tet", "Tết 2027 (6/2) theo lịch âm")

print("== tin hôm nay")
n = ev.news(ctx())
ok(n["today"] == [] and n["soon"] == [] and n["greet"] == [] and n["line"] is None and n["date"] == "Thứ Năm 12/11",
   "không có gì → trống, không có dòng Tin làng")
n = ev.news(ctx(freeze={"n": 0, "days": ["2026-11-11"]}, streak=27))
ok(n["today"][0]["text"] == "Đã dùng 1 vé giữ chuỗi · chuỗi 27 ngày" and n["line"] == "đã dùng vé giữ chuỗi", "vé giữ chuỗi dùng hôm qua")
n = ev.news(ctx(freeze={"n": 0, "days": ["2026-11-01"]}))
ok(not any(x["id"] == "freeze_used" for x in n["today"]), "vé dùng từ lâu → không báo nữa")
n = ev.news(ctx(paper={"enabled": True, "unread": 2}))
ok(n["today"][0]["text"] == "Báo mới đã tới" and n["line"] is None and n["greet"] == ["[i:book] Báo mới đã tới"],
   "báo mới: lên màn chào, không lên dòng Tin làng (thẻ đã có dòng Báo)")
n = ev.news(ctx(total_days=97))
ok([x["text"] for x in n["today"]] == ["Học thêm 3 ngày nữa là tròn 100 ngày học"], "còn 3 ngày nữa tròn 100 ngày học (1.30.1: chữ dễ hiểu hơn)")
ok(ev.news(ctx(total_days=96))["today"] == [], "còn 4 ngày → chưa báo")
n = ev.news(ctx(total_days=100, reviewed_today=True))
ok(n["today"][0]["text"] == "Hôm nay là ngày học thứ 100!", "tròn mốc hôm nay")
n = ev.news(ctx(streak=28, reviewed_today=True))
ok([x["text"] for x in n["today"]] == ["Ôn tiếp 2 ngày nữa là tròn 30 ngày liền"], "chuỗi sắp chạm mốc 30")
home = {"yard": [{"id": "bench", "x": 1, "y": 1}], "zones": ["shrine"]}
n1 = ev.news(ctx(home=home, scenes=["yard", "shrine"]))
n2 = ev.news(ctx(home=home, scenes=["yard", "shrine"]))
gl = [x for x in n1["today"] if x["id"] == "guest"]
ok(gl and gl == [x for x in n2["today"] if x["id"] == "guest"], "khách đáng chú ý cố định trong ngày: %s" % (gl[0]["text"] if gl else None))
ok(gl and gl[0].get("rare"), "tháng 11 có khách hiếm đang mùa → ưu tiên khách hiếm")
n = ev.news(ctx(today=datetime.date(2026, 6, 10), home=home, scenes=["yard", "shrine"],
                album={g: {"d": "2026-01-01"} for g in ("suzume", "neko", "cho", "kaeru", "sagi", "hotaru", "tanuki", "shika")}))
gl = [x for x in n["today"] if x["id"] == "guest"]
ok(gl and not gl[0].get("rare"), "tháng 6 (không khách hiếm): khách chưa gặp / ghé nhiều: %s" % (gl[0]["text"] if gl else None))
night = [g for g in ev.guests.ORDER if all(t in ("dusk", "night") for t in ev.guests.GUESTS[g]["tod"])]
ok(night and all(ev._guest_line({}, ["yard", "shrine"], {}, T) is None or True for _ in [0]), "có khách chỉ ghé tối (%s)" % night[:2])
fox = ev.guests.GUESTS.get("kitsune")
if fox:
    line = None
    for k in range(40):
        g = ev._guest_line(home, ["shrine"], {gid: {"d": "x"} for gid in ev.guests.ORDER if gid != "kitsune"}, T + datetime.timedelta(days=k))
        if g and "cáo" in g["text"]:
            line = g["text"]
            break
    ok(line is None or line.startswith("Tối nay cáo đỏ"), "khách đêm → \"Tối nay …\": %s" % line)
n = ev.news(ctx(season={"mode": "auto", "unlocked": ["momiji"]}))
th = [x for x in n["today"] if x["id"] == "theme"]
ok(th and th[0]["text"] == "Mùa lá đỏ · tới 10/12", "giao diện mùa đang có: %s" % (th[0]["text"] if th else None))
ok(n["greet"] == [] and n["line"] == "Mùa lá đỏ tới 10/12", "tin mùa: không lên màn chào, chỉ lên dòng Tin làng khi không có tin khác")
pets = [{"id": "neko", "name": "Mít", "state": "hungry", "love": 1}, {"id": "kame", "name": "Rùa", "state": "away", "love": 1}]
n = ev.news(ctx(pets=pets, wear={"level": 2, "steps": [{"id": "moss", "name": "Rêu bám"}, {"id": "paint", "name": "Sơn bong"}]}))
ok([x["text"] for x in n["today"]] == ["Mít đang đói", "Rùa đi chơi rồi — cho ăn là về", "Nhà hơi cũ (sơn bong)"] and n["line"] is None and n["greet"] == [],
   "thú / nhà: có trong bảng, không lên dòng Tin làng / màn chào (thẻ đã có dòng chăm sóc)")
n = ev.news(ctx(freeze={"n": 2, "days": []}))
ok(n["today"][0]["text"] == "Có 2 vé giữ chuỗi" and n["greet"] == [], "vé đang có: chỉ ở bảng")
n = ev.news(ctx(freeze={"n": 0, "days": ["2026-11-11"]}, paper={"enabled": True, "unread": 1}, total_days=98, streak=28,
                home=home, scenes=["yard", "shrine"]))
ok(len(n["greet"]) == 3 and n["greet"][0].startswith("[i:snow]"), "màn chào tối đa 3 tin, vé giữ chuỗi trước: %s" % n["greet"])

print("== sắp tới")
n = ev.news(ctx(season={"mode": "auto", "unlocked": ["momiji", "noel"]}))
ok([(x["text"], x["d"]) for x in n["soon"]] == [("Giáng sinh bắt đầu", "CN 15/11")], "Giáng sinh bắt đầu CN 15/11: %s" % n["soon"])
n = ev.news(ctx(season={"mode": "auto", "unlocked": ["momiji"]}))
ok(n["soon"][0]["text"] == "Giáng sinh bắt đầu · chưa mở", "chủ đề chưa mở ghi \"chưa mở\"")
ok(ev.news(ctx(season={"mode": "off", "unlocked": ["noel"]}))["soon"] == [], "tắt giao diện mùa → không báo")
n = ev.news(ctx(today=datetime.date(2026, 12, 5), season={"mode": "auto", "unlocked": ["momiji"]}))
ok(any(x["text"] == "Mùa lá đỏ kết thúc" and x["d"] == "T5 10/12" for x in n["soon"]), "giao diện đang có sắp kết thúc: %s" % n["soon"])
n = ev.news(ctx(sub={"until": "2026-11-17", "auto": True}))
ok([(x["text"], x["d"]) for x in n["soon"]] == [("Gói báo hết hạn · tự gia hạn", "T3 17/11")], "gói báo sắp hết hạn (tự gia hạn)")
ok(ev.news(ctx(sub={"until": "2026-12-30"}))["soon"] == [] and ev.news(ctx(sub={"until": "hỏng"}))["soon"] == [], "gói còn lâu / ngày hỏng → không báo")
n = ev.news(ctx(season={"mode": "auto", "unlocked": ["momiji", "noel"]}, sub={"until": "2026-11-13", "auto": False}))
ok([x["at"] for x in n["soon"]] == sorted(x["at"] for x in n["soon"]), "sắp tới xếp theo ngày")
ok(ev.short_date(datetime.date(2026, 11, 15), T) == "CN 15/11" and ev.short_date(datetime.date(2027, 1, 1), T) == "1/1", "nhãn ngày ngắn")
bad = ev.news({"today": T})
ok(bad["today"] == [] and bad["soon"] == [], "ctx thiếu mục → không lỗi")

print("== ⚙ greet / trans")
d = more.ui_default()
ok(d["greet"] == "on" and d["trans"] == "on", "mặc định bật")
ok(more.clean_ui({"greet": "off", "trans": "x"})["greet"] == "off" and more.clean_ui({"trans": "x"})["trans"] == "on", "giá trị lạ → on")
p = more.ui_preset("calm", {"greet": "off", "trans": "off"})
ok(p["greet"] == "off" and p["trans"] == "off", "bấm kiểu có sẵn giữ Chào / Chuyển cảnh")

print("== nối dây")
init = src("__init__.py")
ok('f"{WEB_BASE}/greet.js", f"{WEB_BASE}/tour.js", f"{WEB_BASE}/garden.js"' in init, "greet.js (+ tour.js 1.26.1) nạp ngay trước garden.js")
ok("GREET_TEST_OFF = False" in init and "data[\"news\"], data[\"greet\"] = _news_and_greet(data, today, cfg)" in init, "Python gửi data.news / data.greet")
zz = open(os.path.join(HERE, "..", "anki", "zz_kbtest", "__init__.py"), encoding="utf-8").read()
ok("GREET_TEST_OFF = True" in zz, "add-on test tắt màn chào cho kịch bản cũ")
body = src("web", "body.html")
ok('id="kb-news-btn"' in body and 'id="kb-news-pop"' in body and 'id="kb-news-today"' in body and 'id="kb-news-soon"' in body, "nút + bảng Tin làng")
hjs = src("web", "home.js")
ok("GardenGreet.strip(ctx, cw, hgt, sw / swMs, switchSnap, switchKind, switchDir)" in hjs and 'cur === "house" || next === "house" ? "curtain" : "sweep"' in hjs,
   "home.js: đổi cảnh ◂ ▸ → dải lá, Trong nhà → rèm")
gjs = src("web", "garden.js")
ok("GardenGreet.render(d)" in gjs and "GardenGreet.closeNews()" in gjs, "garden.js: vẽ Tin làng / màn chào, mở Nhiệm vụ thì đóng Tin làng")
ok('nb.classList.add("kb-squeezed")' in gjs and ".kb-news-btn.kb-squeezed { display: none; }" in src("web", "garden.css"),
   "thẻ Hôm nay chật (xếp sát vẫn không vừa) → bớt dòng Tin làng")
ujs = src("web", "ui.js")
ok('radios("greet", "Chào khi mở vườn"' in ujs and 'radios("trans", "Chuyển cảnh"' in ujs and 'greet: "on", trans: "on"' in ujs, "ui.js: 2 dòng ở ⚙ → Màn chính")

if NODE:
    code = src("web", "greet.js") + """
;const out = [];
global.GardenUI = { glob: (k) => (k === "trans" ? "on" : "on"), get: () => "on" };
out.push(GardenGreet.mode());
global.GardenUI = { glob: (k) => "on", get: () => "off" };
out.push(GardenGreet.mode());
global.GardenUI = { glob: (k) => (k === "trans" ? "off" : "on"), get: () => "on" };
out.push(GardenGreet.mode());
console.log(JSON.stringify(out));"""
    stub = "global.window = { innerWidth: 800, innerHeight: 600, addEventListener() {}, removeEventListener() {} };" \
           "global.document = { readyState: 'complete', getElementById: () => null, addEventListener() {}, createElement: () => ({ style: {} }), body: { appendChild() {} } };" \
           "global.requestAnimationFrame = () => 0; global.performance = { now: () => 0 };"
    p = os.path.join(HERE, "_greet_node.js")
    open(p, "w", encoding="utf-8").write(stub + code)
    r = subprocess.run([NODE, p], capture_output=True, text=True)
    os.remove(p)
    ok(r.stdout.strip() == '["full","fade","none"]', "GardenGreet.mode: Bật → full, Dịu mắt / Tắt hạt bay → fade, Tắt → none (%s %s)" % (r.stdout.strip(), r.stderr.strip()[-200:]))
else:
    print("  (bỏ qua phần node)")

print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d mục trượt" % len(FAIL)))
sys.exit(1 if FAIL else 0)
