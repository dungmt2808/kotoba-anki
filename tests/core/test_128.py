"""Test offline 1.28 (python thường): chỗ lấp lánh + Hộp sưu tầm, gánh hàng rong (finds_core) và phần ví (garden_core).

- Danh mục: 42 món / 7 bộ × 6, tên Nhật + cách đọc + nghĩa, quà đủ bộ + 8 món gánh hàng nằm trong FIND_ITEMS (tầng NHA_KEY),
  bộ Sân vườn không có món theo mùa, mọi món có hình trong web/finds_art.js, mọi món trang trí mới có hình.
- Chỗ lấp lánh: biên 0 / 9 / 10 / 19 / 20 / 29 / 30 / 31 / 999 lượt, chốt cảnh một lần mỗi ngày, ưu tiên vùng còn thiếu,
  vùng tự tạo không có chỗ; nhặt: chỗ chưa mở / đã nhặt / sai cảnh / số lạ bị từ chối, món chưa có trước (bảo hiểm),
  món theo mùa chỉ trong mùa, đủ bộ tặng quà đúng một lần, trùng +3 xu; 1.000 ngày ngẫu nhiên không vượt 20 xu / ngày.
- Gánh hàng: cả năm 2026–2027 chỉ thứ Tư + Chủ nhật, số phiên tăng đều, món riêng mỗi món đúng một lần mỗi 8 phiên, hàng cố
  định theo ngày, giá giảm 25 % làm tròn 5 xu.
- Dữ liệu hỏng / sai kiểu không làm hỏng (clean), sổ ngày giữ 14 ngày, EventStore giữ khoá lạ + món lạ của bản sau.
- Ví: buy() không bán món riêng / quà, buy_at() (giá gánh hàng, vùng / nhà / tối đa / thiếu xu), seed_buy_at(), find_reward();
  đồ mới lưu ở NHA_KEY; mã 1.26.1 thật (git) đọc + lưu ví có đồ mới → về 1.28 vẫn còn (sở hữu + chỗ đặt).
- Tin làng: dòng chỗ lấp lánh / gánh hàng hôm nay / phiên sau / "Ôn thêm … lượt".

Chạy: python test_128.py THƯ_MỤC_ADD_ON [THƯ_MỤC_1.26.1]
"""
import datetime as dt
import json, os, random, re, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import event_core as ev
import finds_core as f
import garden_core as core
import more_core

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb128_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def err(fn, *a):
    try:
        fn(*a)
    except (f.FindError, core.HomeError, more_core.MoreError) as e:
        return str(e)
    return ""


D = dt.date

print("== danh mục món nhặt / quà / gánh hàng")
ok(len(f.FINDS) == 42 and all(len(f.BY_SCENE[sc]) == 6 for sc in f.SCENES), "42 món, 7 bộ × 6")
ok(all(x["ja"] and x["kana"] and x["vi"] for x in f.FINDS.values()), "mỗi món có tên Nhật + cách đọc + nghĩa")
ok(all(re.fullmatch(r"[぀-ヿ一-鿿ー]+", x["kana"].replace("ス", "ス")) for x in f.FINDS.values()),
   "cách đọc chỉ có kana / chữ Nhật (không romaji)")
ok(not any(f.FINDS[x].get("m") for x in f.BY_SCENE["yard"]), "bộ Sân vườn không có món theo mùa (chưa mở vùng vẫn đủ bộ quanh năm)")
ok(all(len(x["m"]) >= 3 for x in f.FINDS.values() if x.get("m")), "món theo mùa có ít nhất 3 tháng")
ok(all(r in core.FIND_ITEMS and core.FIND_ITEMS[r]["only"] == "set" and core.FIND_ITEMS[r]["set"] == sc
       for sc, r in f.SET_REWARD.items()) and len(set(f.SET_REWARD.values())) == 7, "7 quà đủ bộ có trong FIND_ITEMS, mỗi bộ một quà")
ok(all(p in core.FIND_ITEMS and core.FIND_ITEMS[p]["only"] == "ped" and core.FIND_ITEMS[p]["price"] > 0 for p in f.PED_ONLY)
   and len(f.PED_ONLY) == 8, "8 món riêng của gánh hàng có giá")
ok(set(core.FIND_ITEMS) <= core.TIER3_ITEMS and set(core.FIND_ITEMS) <= set(core.CATALOG), "đồ mới lưu ở tầng NHA_KEY (bản cũ giữ hộ)")
ok(len(core.FIND_ITEMS) == 15 and not (set(core.FIND_ITEMS) & set(core.NHA_ITEMS)), "15 món mới, không trùng id cũ")
art = open(os.path.join(ADDON, "web", "finds_art.js"), encoding="utf-8").read()
miss_find = [k for k in f.FINDS if not re.search(r"\bF\." + re.escape(k) + r"\s*=", art)]
miss_item = [k for k in core.FIND_ITEMS if not re.search(r"\bITEMS\." + re.escape(k) + r"\s*=", art)]
ok(not miss_find, "mọi món nhặt có hình (F.<id>)" + (" — thiếu " + ", ".join(miss_find) if miss_find else ""))
ok(not miss_item, "mọi món trang trí mới có hình (ITEMS.<id>)" + (" — thiếu " + ", ".join(miss_item) if miss_item else ""))
icons = open(os.path.join(ADDON, "web", "icons.js"), encoding="utf-8").read()
ok("sparkle:" in icons and "peddler:" in icons, "icon pixel sparkle / peddler (không emoji)")

print("== số chỗ lấp lánh theo lượt ôn hôm nay")
for n, want in [(0, 0), (9, 0), (10, 1), (19, 1), (20, 2), (29, 2), (30, 3), (31, 3), (999, 3), (-5, 0), ("x", 0)]:
    ok(f.open_count(n) == want, "%r lượt → %d chỗ" % (n, want))
ok(f.next_at(0) == 10 and f.next_at(15) == 20 and f.next_at(29) == 30 and f.next_at(30) is None, "lượt cần cho chỗ kế tiếp")

print("== chốt cảnh của ngày")
d = f.clean(None)
today = D(2026, 11, 12)
ok(f.ensure_day(d, [], today) and d["days"]["2026-11-12"]["spots"] == ["yard"] * 3, "chưa mở vùng: cả 3 chỗ ở Sân vườn")
ok(not f.ensure_day(d, ["beach", "shrine"], today) and d["days"]["2026-11-12"]["spots"] == ["yard"] * 3,
   "mở vùng giữa ngày: cảnh của ngày không đổi (đã chốt)")
d2 = f.clean(None)
f.ensure_day(d2, ["beach", "shrine"], today)
sp = d2["days"]["2026-11-12"]["spots"]
ok(set(sp) == {"yard", "beach", "shrine"}, "ba cảnh khác nhau khi có ≥ 3 cảnh (%s)" % ",".join(sp))
d3 = f.clean(None)
for fid in f.BY_SCENE["yard"] + f.BY_SCENE["beach"]:
    d3["found"][fid] = {"d": "2026-11-01", "n": 1}
f.ensure_day(d3, ["beach", "shrine"], today)
ok(d3["days"]["2026-11-12"]["spots"][0] == "shrine", "vùng còn thiếu món lên trước vùng đã đủ")
ok("u1" not in f.candidate_scenes(["beach", "u1"]) and f.candidate_scenes(["station", "beach"]) == ["yard", "beach", "station"],
   "vùng tự tạo không có chỗ lấp lánh; thứ tự cảnh cố định")
plans = {tuple(f.plan_spots(f.clean(None), list(f.SCENES[1:]), today + dt.timedelta(days=i))) for i in range(20)}
ok(len(plans) > 5, "đủ vùng: thứ tự cảnh đổi theo ngày (%d kiểu / 20 ngày)" % len(plans))

print("== nhặt")
d = f.clean(None)
z = []
ok("Ôn thêm 10" in err(f.pick, d, 1, "yard", 0, z, today), "0 lượt: chỗ 1 chưa mở")
ok("Ôn thêm 1 lượt" in err(f.pick, d, 2, "yard", 19, z, today), "19 lượt: chỗ 2 còn thiếu 1 lượt")
r = f.pick(d, 1, "yard", 10, z, today)
ok(r["new"] and r["coins"] == 0 and r["id"] in f.BY_SCENE["yard"] and d["found"][r["id"]] == {"d": "2026-11-12", "n": 1},
   "10 lượt: nhặt chỗ 1 → món mới của Sân vườn (%s)" % r["id"])
ok("nhặt rồi" in err(f.pick, d, 1, "yard", 30, z, today), "nhặt lại chỗ 1 → từ chối")
ok("đổi chỗ" in err(f.pick, d, 2, "beach", 30, z, today), "sai cảnh → từ chối")
ok(err(f.pick, d, 0, "yard", 30, z, today) and err(f.pick, d, 4, "yard", 30, z, today) and err(f.pick, d, "1", "yard", 30, z, today),
   "số chỗ 0 / 4 / chuỗi → từ chối")
r2 = f.pick(d, 2, "yard", 30, z, today)
r3 = f.pick(d, 3, "yard", 30, z, today)
ok(len({r["id"], r2["id"], r3["id"]}) == 3, "ba chỗ cùng ngày → ba món khác nhau (bảo hiểm)")
# đủ bộ Sân vườn
day = today
gifts = []
for i in range(1, 6):
    day = today + dt.timedelta(days=i)
    for k in (1, 2, 3):
        rr = f.pick(d, k, "yard", 30, z, day)
        if rr["set_done"]:
            gifts.append((day, rr["reward"]))
ok(len(gifts) == 1 and gifts[0][1] == "tukinh" and gifts[0][0] == today + dt.timedelta(days=1),
   "món thứ 6 (ngày thứ 2) → đủ bộ, quà Tủ kính đúng một lần")
ok(d["sets"] == {"yard": "2026-11-13"}, "ghi ngày nhận quà")
dups = [f.pick(d, 1, "yard", 30, z, today + dt.timedelta(days=9))]
ok(all(not x["new"] and x["coins"] == 3 and not x["set_done"] for x in dups), "đủ rồi: trùng +3 xu, không quà nữa")
# theo mùa
d = f.clean(None)
z = ["beach"]
for fid in f.BY_SCENE["beach"]:
    if fid != "sakuragai":
        d["found"][fid] = {"d": "2026-01-01", "n": 1}
nov = D(2026, 11, 14)
f.ensure_day(d, z, nov)
d["days"][nov.isoformat()]["spots"] = ["beach"] * 3
got = f.pick(d, 1, "beach", 30, z, nov)
ok(got["id"] != "sakuragai" and not got["new"] and got["coins"] == 3, "tháng 11: sò hoa anh đào (tháng 3–6) chưa nhặt được → trùng +3 xu")
apr = D(2027, 4, 10)
f.ensure_day(d, z, apr)
d["days"][apr.isoformat()]["spots"] = ["beach"] * 3
got = f.pick(d, 1, "beach", 30, z, apr)
ok(got["id"] == "sakuragai" and got["new"] and got["set_done"] and got["reward"] == "kaifurin",
   "tháng 4 năm sau: nhặt được sò hoa anh đào → đủ bộ Bãi biển, quà chuông gió vỏ sò")
ok(f.season_text("sakuragai") == "tháng 3–6" and f.season_text("koishi") == "" and all(f.season_text(x) for x in f.FINDS if f.FINDS[x].get("m")),
   "nhãn mùa cho mọi món theo mùa")
# xác suất / kinh tế: 1.000 ngày ngẫu nhiên, mọi vùng, xu thêm ≤ 20 / ngày, không lỗi
rnd = random.Random(20261113)
d = f.clean(None)
zones_all = list(f.SCENES[1:])
worst, total_coins, sets_done = 0, 0, 0
day = D(2026, 1, 1)
for i in range(1000):
    day = day + dt.timedelta(days=1)
    reviews = rnd.choice([0, 5, 12, 25, 30, 60])
    f.ensure_day(d, zones_all, day)
    c = 0
    for k in (1, 2, 3):
        sc = d["days"][day.isoformat()]["spots"][k - 1]
        if k <= f.open_count(reviews):
            rr = f.pick(d, k, sc, reviews, zones_all, day)
            c += rr["coins"]
            sets_done += 1 if rr["set_done"] else 0
    worst = max(worst, c)
    total_coins += c
    f.trim(d, day)
ok(worst <= 9 and worst <= 20, "1.000 ngày: xu thêm nhiều nhất %d / ngày (≤ 20)" % worst)
ok(sets_done == 7 and len(d["found"]) == 42, "1.000 ngày: đủ 7 bộ, 42 món")
ok(len(d["days"]) <= f.KEEP_DAYS + 1, "sổ ngày chỉ giữ 14 ngày (%d)" % len(d["days"]))

print("== gánh hàng rong")
days = [D(2026, 1, 1) + dt.timedelta(days=i) for i in range(730)]
mk = [x for x in days if f.is_market(x)]
ok(all(x.weekday() in (2, 6) for x in mk) and len(mk) in (208, 209), "2026–2027: chỉ thứ Tư + Chủ nhật (%d phiên)" % len(mk))
nos = [f.market_no(x) for x in mk]
ok(nos == list(range(nos[0], nos[0] + len(nos))), "số phiên tăng đều từng phiên")
ok(f.market_no(D(2026, 1, 4)) == 0 and f.market_no(D(2026, 1, 7)) == 1 and f.market_no(D(2026, 1, 11)) == 2, "phiên 0 = CN 04/01/2026")
ok(f.next_market(D(2026, 11, 12)) == D(2026, 11, 15) and f.next_market(D(2026, 11, 15)) == D(2026, 11, 18)
   and f.next_market(D(2026, 11, 15), after=False) == D(2026, 11, 15), "phiên kế tiếp")
seq = [f.ped_only_of(n) for n in range(0, 400)]
ok(all(sorted(seq[i:i + 8]) == sorted(f.PED_ONLY) for i in range(0, 400, 8)), "món riêng: mỗi vòng 8 phiên đủ 8 món")
gaps = {}
last = {}
for i, x in enumerate(seq):
    if x in last:
        gaps.setdefault(x, []).append(i - last[x])
    last[x] = i
ok(max(max(v) for v in gaps.values()) <= 15, "một món quay lại sau nhiều nhất 15 phiên (≈ 7,5 tuần)")
shop = [k for k, v in core.CATALOG.items() if v["price"] > 0 and not v.get("rare") and not v.get("only") and not v.get("season")]
s1 = f.stock(D(2026, 11, 18), shop, list(more_core.SEEDS))
s2 = f.stock(D(2026, 11, 18), list(shop), list(more_core.SEEDS))
ok(s1 == s2 and [g["slot"] for g in s1] == ["x1", "d1", "d2", "d3", "s1"], "hàng cố định theo ngày, 5 ô x1 d1 d2 d3 s1")
ok(len({g["id"] for g in s1[1:4]}) == 3 and all(g["id"] in shop for g in s1[1:4]), "3 món giảm giá khác nhau, đều là món cửa hàng")
ok(len({tuple(g["id"] for g in f.stock(x, shop, list(more_core.SEEDS))) for x in mk[:40]}) == 40, "40 phiên liền: phiên nào cũng khác")
ok([f.disc(p) for p in (15, 25, 60, 90, 160, 1000, 1500)] == [10, 20, 45, 70, 120, 750, 1125], "giảm 25 % làm tròn 5 xu")
ok(f.disc(1) == 5, "giá rất nhỏ vẫn ≥ 5 xu")

print("== dữ liệu hỏng / sai kiểu")
bad = {"found": {"koishi": {"d": "2026-13-40"}, "kaigara": {"d": "2026-11-01", "n": "x"}, "hitode": [], "zzz": {"d": "2026-11-01"},
                 "makigai": {"d": "2026-11-01", "n": 10 ** 9}},
       "days": {"2026-11-01": {"spots": ["yard", "nowhere", 3], "picked": [1, True, 9, "2", 2]}, "xx": {}, "2026-11-02": "x"},
       "sets": {"yard": "2026-11-01", "moon": "2026-11-01", "beach": 5}, "ped": {"2026-11-01": ["x1", "z99", 3, "../"], "bad": ["x1"]}}
c = f.clean(bad)
ok(set(c["found"]) == {"kaigara", "makigai"} and c["found"]["kaigara"]["n"] == 1 and c["found"]["makigai"]["n"] == 100000,
   "found: bỏ ngày sai / kiểu sai / id lạ; số lần có trần")
ok(c["days"] == {"2026-11-01": {"spots": ["yard"], "picked": [1, 2]}}, "days: bỏ cảnh lạ, số chỗ sai, bool")
ok(c["sets"] == {"yard": "2026-11-01"} and c["ped"] == {"2026-11-01": ["x1"]}, "sets / ped: bỏ khoá lạ, ô lạ")
for junk in (None, [], "x", 5, {"found": "x", "days": [], "sets": None, "ped": 3}):
    ok(f.clean(junk) == {"found": {}, "days": {}, "sets": {}, "ped": {}}, "clean(%r) → rỗng" % (junk,))
d = f.clean(bad)
d["days"]["2026-11-01"]["spots"] = ["yard"]       # ngày cũ ghi thiếu chỗ → ensure_day chốt lại đủ 3 (giữ chỗ đã nhặt)
f.ensure_day(d, [], D(2026, 11, 1))
ok(d["days"]["2026-11-01"]["spots"] == ["yard"] * 3 and d["days"]["2026-11-01"]["picked"] == [1, 2], "ngày thiếu chỗ → chốt lại, giữ chỗ đã nhặt")

print("== EventStore: khoá collection + sao lưu, giữ phần của bản sau")


class Col:
    def __init__(self):
        self.conf = {}

    def get_config(self, k, default=None):
        return json.loads(json.dumps(self.conf.get(k, default)))

    def set_config(self, k, v):
        self.conf[k] = json.loads(json.dumps(v))


col = Col()
col.conf[f.EVENT_KEY] = {"v": 2, "future": {"x": 1}, "found": {"koishi": {"d": "2026-11-01", "n": 1, "note": "z"}, "newthing": {"d": "2026-11-02"}}}
store = f.EventStore(os.path.join(TMP, "events.json"), col_getter=lambda: col)
data = store.load()
f.ensure_day(data, [], D(2026, 11, 3))
f.pick(data, 1, "yard", 10, [], D(2026, 11, 3))
store.save(data)
raw = col.conf[f.EVENT_KEY]
ok(raw.get("future") == {"x": 1} and raw["found"].get("newthing") == {"d": "2026-11-02"} and raw["found"]["koishi"].get("note") == "z",
   "lưu giữ khoá lạ, món lạ và trường lạ của từng món (bản sau)")
ok(json.load(open(os.path.join(TMP, "events.json"), encoding="utf-8"))["found"].keys() == raw["found"].keys(), "sao lưu user_files/events.json")
nocol = f.EventStore(os.path.join(TMP, "events.json"), col_getter=lambda: None)
ok(len(nocol.load()["found"]) == len(data["found"]), "không có collection: đọc file sao lưu")
boxv = f.box_view(store.load(), ["beach"], D(2026, 11, 3), {k: v["name"] for k, v in core.FIND_ITEMS.items()})
ok(boxv["total"] == 42 and len(boxv["sets"]) == 7 and boxv["sets"][1]["open"] and not boxv["sets"][2]["open"]
   and boxv["sets"][0]["reward_name"] == "Tủ kính sưu tầm", "box_view: 7 bộ, vùng đã mở / chưa mở, tên quà")
ok(f.new_between(store.load(), D(2026, 11, 3), D(2026, 11, 3))[0]["id"] in f.BY_SCENE["yard"], "new_between cho Lịch hoa")

print("== ví: cửa hàng / gánh hàng / quà")


def fresh(name, coins=5000, house=7, zones=None):
    p = os.path.join(TMP, name)
    os.makedirs(p)
    st = core.GardenState(os.path.join(p, "wallet.json"))
    data = st.load()
    data["coins"], data["home"]["house"] = coins, house
    data["home"]["zones"] = zones or []
    st.save(data)
    return p, st


p1, st = fresh("w1")
ok("gánh hàng rong" in err(st.buy, "denkeoquan") and "Hộp sưu tầm" in err(st.buy, "tukinh"), "cửa hàng không bán món riêng / quà")
ok(st.load()["coins"] == 5000, "bị từ chối: xu giữ nguyên")
st.buy_at("denkeoquan", 280)
ok(st.load()["coins"] == 4720 and st.load()["home"]["owned"]["denkeoquan"] == 1, "buy_at món riêng 280 xu")
st.buy_at("bench", f.disc(90))
ok(st.load()["coins"] == 4720 - 70 and st.load()["home"]["owned"]["bench"] == 1, "buy_at Ghế gỗ giảm còn 70 xu")
ok("Bãi biển" in err(st.buy_at, "crab", 70), "món của vùng chưa mở → từ chối")
ok(err(st.buy_at, "tukinh", 1) and err(st.buy_at, "shika", 1) and err(st.buy_at, "tulip", 10) and err(st.buy_at, "nope", 1),
   "buy_at không bán quà / món hiếm / đồ theo mùa / id lạ")
p2, st2 = fresh("w2", coins=50, house=2)
ok("Lắp cửa" in err(st2.buy_at, "nonla", 120), "nhà chưa có cửa → không mua nội thất")
ok(err(st2.buy_at, "luunuoc", 160).startswith("Thiếu ") and st2.load()["coins"] == 50, "thiếu xu → từ chối, xu giữ nguyên")
p3, st3 = fresh("w3", coins=3000)
st3.buy_at("statue", f.disc(1000))
ok("một cái" in err(st3.buy_at, "statue", 750), "món tối đa 1 cái: không mua lần hai")
st3.seed_buy_at("ine", f.disc(600))
ok(st3.load()["coins"] == 3000 - 750 - 450 and "ine" in st3.load()["more"]["seeds"]["owned"], "seed_buy_at: giống Lúa 450 xu")
ok("đã có" in err(st3.seed_buy_at, "ine", 450).lower() and st3.load()["coins"] == 1800, "giống đã có → từ chối, xu giữ")
st3.find_reward(3)
st3.find_reward(0, "kaifurin")
st3.find_reward(0, "not_an_item")
w = st3.load()
ok(w["coins"] == 1803 and w["home"]["owned"]["kaifurin"] == 1 and "not_an_item" not in w["home"]["owned"], "find_reward: +3 xu, quà vào kho, id lạ bỏ qua")
st3.place("room", "kaifurin", 2, 0)
st3.place("yard", "statue", 6, 1)
nha = json.load(open(os.path.join(p3, "nha.json"), encoding="utf-8"))
ok(nha["owned"].get("kaifurin") == 1 and any(e["id"] == "kaifurin" for e in nha["places"].get("room", [])), "quà + chỗ đặt lưu ở nha.json (NHA_KEY)")
wal = json.load(open(os.path.join(p3, "wallet.json"), encoding="utf-8"))
ok("kaifurin" not in json.dumps(wal), "ví của bản cũ (wallet) không chứa id mới")
cat = core.home_catalog()
it = {x["id"]: x for x in cat["items"]}
ok(it["tukinh"]["only"] == "set" and it["tukinh"]["set"] == "yard" and it["denkeoquan"]["only"] == "ped" and it["denkeoquan"]["price"] == 280,
   "home_catalog gửi only / set / giá cho giao diện")

OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
if not OLD:
    repo = os.path.abspath(os.path.join(HERE, "..", ".."))
    o = os.path.join(TMP, "old1261")
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", repo, "archive", "6021c57", "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
        OLD = os.path.join(o, "kotoba_batake")
    except Exception as e:      # không có git / commit
        print("  (bỏ qua phần mã 1.26.1 thật: %s)" % e)
if OLD:
    print("== mã 1.26.1 thật đọc + lưu ví có đồ mới của 1.28")
    script = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
data = st.load()
data["coins"] += 7
st.place("yard", "bench", 8, 2) if data["home"]["owned"].get("bench", 0) - sum(1 for e in data["home"]["yard"] if e["id"] == "bench") > 0 else None
data = st.load(); data["coins"] += 0
st.save(data)
print(json.dumps({"known": "kaifurin" in core.CATALOG, "coins": st.load()["coins"]}))
'''
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(p3, "wallet.json")], capture_output=True, text=True)
    out = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else {}
    ok(r.returncode == 0 and out.get("known") is False, "1.26.1 không biết món mới" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    w = st3.load()
    ok(w["home"]["owned"].get("kaifurin") == 1 and any(e["id"] == "kaifurin" for e in w["home"]["room"])
       and w["home"]["owned"].get("statue") == 1, "về 1.28 sau khi 1.26.1 lưu: quà + chỗ đặt trong nhà còn nguyên")

print("== Tin làng")
ctx = {"today": D(2026, 11, 18), "day": 1000, "paper": {}, "streak": 3, "reviewed_today": True, "total_days": 40, "freeze": {},
       "pets": [], "wear": {}, "season": {}, "home": {}, "scenes": ["yard"], "album": {}, "sub": {},
       "finds": {"reviews": 25, "open": 2, "max": 3, "next": 30,
                 "spots": [{"k": 1, "scene": "beach", "open": True, "picked": False}, {"k": 2, "scene": "yard", "open": True, "picked": False},
                           {"k": 3, "scene": "beach", "open": False, "picked": False}],
                 "ped": {"today": True, "scene": "station", "next_iso": "2026-11-22"}}}
nw = ev.news(ctx)
texts = [x["text"] for x in nw["today"]]
ok("2 chỗ lấp lánh: Bãi biển · Sân vườn" in texts and "Gánh hàng rong ghé Ga làng quê hôm nay" in texts, "hôm nay: " + " | ".join(texts))
ok(nw["line"] == "2 chỗ lấp lánh ở 2 nơi", "dòng thẻ Hôm nay ưu tiên chỗ lấp lánh (%s)" % nw["line"])
ok(any(x["id"] == "ped_next" and x["d"] == "CN 22/11" for x in nw["soon"]), "Sắp tới: phiên gánh hàng CN 22/11")
ctx["finds"]["spots"] = [dict(s, picked=True) for s in ctx["finds"]["spots"]]
ctx["finds"]["ped"] = {"today": False, "scene": "yard", "next_iso": "2026-11-22"}
nw = ev.news(ctx)
ok(any(x["text"] == "Ôn thêm 5 lượt nữa mở một chỗ lấp lánh" for x in nw["today"]) and "lấp lánh" not in (nw["line"] or ""),
   "nhặt hết chỗ đã mở: 'Ôn thêm 5 lượt…' (không lên dòng thẻ Hôm nay)")
ctx["finds"] = {}
ok(ev.news(ctx)["today"] is not None, "không có dữ liệu nhặt đồ: Tin làng vẫn chạy")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
