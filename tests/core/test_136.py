"""Test offline 1.36 (python thường): sự kiện Giáng sinh 2026 — tủ lịch 24 ngăn (le_core) + phần ví (garden_core) + tường /
sàn Noel (decor_core) + Tin làng (event_core) + soát mã cầu nối (__init__.py).

A. Danh mục: 24 ngăn (cây 9 · nhà 2 · sân 3 · trong nhà 7 · hộp quà 3), món của ngăn có trong LE_ITEMS (tầng NHA_KEY, giá 0,
   only = "le", không bán ở cửa hàng / gánh hàng / Trang trí thử), 5 mẫu tường / sàn Noel không bán, có hình trong JS.
B. Giai đoạn theo ngày Anki: 14/11 → None, 15–30/11 pre, 1–24/12 advent, 25–31/12 after, từ 1/1/2027 done.
C. Luật mở ngăn: mọi ngày 1/12 → 2/1 với lượt ôn giả ngẫu nhiên (có đối chứng: tự tính lại từ luật) — không ngăn nào mở
   trước ngày, mỗi ngăn một lần, ngày có ôn / vé giữ chuỗi mở được (cả ngày đã qua: ôn ở điện thoại, cài muộn), lỡ ngày
   15 lượt mở bù 1 ngăn, ≤ 2 ngăn bù / ngày, hết 31/12 không mở thêm; câu lỗi tiếng Việt.
D. Hộp quà bí mật: lắc (câu đoán), mở từ 25/12, sau mùa vẫn mở được, mở hai lần / chưa có hộp → lỗi.
E. plan_sync — các kiểu người dùng: mới cài (nhà trống, không cây), đã có cây (đã đặt / trong kho / ở vùng khác / 2 cây),
   cài giữa tháng (10/12, 25/12), chưa từng mở vườn trong tháng 12 mà tới 1/1, kho thiếu món sổ đã ghi (khôi phục ví cũ),
   gọi lại lần hai → không làm gì.
F. GardenState.le_apply: nhà chưa có phòng (tủ lịch vào kho), nhà có phòng (treo tường cạnh cửa sổ), sân hết chỗ (cây vào
   kho), tuần lộc ×2, mẫu Noel vào "decor.own", tối đa 1 tủ lịch, đồ lưu ở NHA_KEY; lỗi ghi → không đổi gì.
G. LeStore: khoá lạ của bản sau giữ nguyên, hai máy gộp theo hợp, đọc lỗi → không ghi, sao lưu file theo hồ sơ.
H. Mã 1.31.3 thật (bản đã phát hành) mở ví có đồ le_* + tường Noel đang dùng → lưu → 1.36 đọc lại không mất gì.
I. Tin làng / thẻ Hôm nay: dòng tủ lịch (chờ mở, ôn 1 thẻ, hộp quà, mở bù), "Sắp tới".
J. Soát mã: lệnh le:* đi qua Python, ghi cùng một lần (extra=[LE.write]), sự kiện tắt không tặng, giả ngày chỉ admin / test.

Chạy: python test_136.py THƯ_MỤC_ADD_ON
"""
import ma_cu  # mã bản cũ từ git hoặc tests/fixtures/ban_cu
import copy
import datetime as dt
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import backup_core as backup
import event_core as ev_core
import garden_core as core
import le_core as le

D = dt.date
DEC = core.decor
FAIL = []
PASS = [0]
TMP = tempfile.mkdtemp(prefix="kb136_")
SEED = int(os.environ.get("KB_SEED", "136"))


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


def err(fn, *a, **k):
    try:
        fn(*a, **k)
    except (le.LeError, core.HomeError, DEC.DecorError) as e:
        return str(e)
    return ""


def read(rel):
    try:
        with open(os.path.join(ADDON, rel), encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


class Col:
    """Collection giả: cấu hình collection như Anki (sao chép giá trị khi đọc / ghi)."""

    def __init__(self):
        self.conf = {}
        self.fail_set = None          # khoá ghi lỗi (thử lỗi ghi)
        self.fail_get = None

    def get_config(self, k, default=None):
        if self.fail_get and k == self.fail_get:
            raise RuntimeError("đọc lỗi (giả)")
        return json.loads(json.dumps(self.conf.get(k, default)))

    def set_config(self, k, v):
        if self.fail_set and k == self.fail_set:
            raise RuntimeError("ghi lỗi (giả)")
        self.conf[k] = json.loads(json.dumps(v))

    def remove_config(self, k):
        self.conf.pop(k, None)


# =========================================================================================================
print("== A. danh mục")
ok(sorted(le.DOORS) == list(range(1, 25)), "24 ngăn 1 → 24")
kinds = {}
for d, x in le.DOORS.items():
    kinds[x["kind"]] = kinds.get(x["kind"], 0) + 1
ok(kinds == {"cay": 9, "nha": 2, "san": 3, "trong": 7, "qua": 3}, "cây 9 · nhà 2 · sân 3 · trong nhà 7 · hộp quà 3: %s" % kinds)
ok([d for d in le.DOORS if le.DOORS[d]["kind"] == "qua"] == [6, 13, 20], "hộp quà bí mật ở ngăn 6 / 13 / 20 (Chủ nhật)")
ok(all(D(2026, 12, d).weekday() == 6 for d in (6, 13, 20)), "6 / 13 / 20/12/2026 là Chủ nhật")
ok(le.DOORS[24]["part"] == "star" and le.DOORS[23]["item"] == {"le_banhquy": 1}, "ngăn 24 ngôi sao, ngăn 23 bàn bánh quy + sữa")
items_used = set()
for x in le.DOORS.values():
    items_used |= set((x.get("item") or {}).keys())
ok(items_used | {"le_tulich"} == set(core.LE_ITEMS), "món của các ngăn + tủ lịch = LE_ITEMS (%d món)" % len(core.LE_ITEMS))
ok(all(v["price"] == 0 and v["only"] == "le" for v in core.LE_ITEMS.values()), "món sự kiện: giá 0, only = le")
ok(set(core.LE_ITEMS) <= core.TIER3_ITEMS and set(core.LE_ITEMS) <= set(core.CATALOG), "món sự kiện lưu ở tầng NHA_KEY (bản ≥ 1.24 giữ hộ)")
ok(core.LE_ITEMS["le_tulich"]["place"] == "wall" and core.LE_ITEMS["le_tulich"].get("max") == 1, "tủ lịch treo tường, tối đa 1")
ok(core.LE_ITEMS["le_nguoituyet"]["scene"] == "yard" and core.LE_ITEMS["le_tuanloc"]["scene"] == "yard", "người tuyết / tuần lộc ở sân")
ok(not (set(core.LE_ITEMS) & set(core.NHA_ITEMS)) and not (set(core.LE_ITEMS) & set(core.FIND_ITEMS)), "không trùng id cũ")
tiles = set()
for x in le.DOORS.values():
    tiles |= set(x.get("tiles") or [])
ok(tiles == set(DEC.NOEL_TILES) == set(le.WALLS) | set(le.FLOORS), "5 mẫu tường / sàn Noel = ngăn 8 + 15")
ok(all(DEC.PRESETS[t]["slot"] == ("wall" if t.startswith("w_") else "floor") for t in DEC.NOEL_TILES), "mẫu Noel đúng chỗ tường / sàn")
ok(le.TREE in core.CATALOG and core.CATALOG[le.TREE].get("season") == "noel", "cây thông = xmastree của giao diện mùa (có sẵn)")
art = read("web/le_art.js")
miss = [k for k in core.LE_ITEMS if not re.search(r"\bITEMS\." + re.escape(k) + r"\s*=", art)]
ok(not miss, "mọi món sự kiện có hình trong web/le_art.js" + (" — thiếu " + ", ".join(miss) if miss else ""))
nha_art = read("web/nha_art.js")
miss = [k for k in DEC.NOEL_TILES if ('"' + k + '"') not in nha_art and (k + ":") not in nha_art]
ok(not miss, "mọi mẫu tường / sàn Noel có hình (nha_art.js)" + (" — thiếu " + ", ".join(miss) if miss else ""))

print("== A2. không bán ở đâu cả")
p0 = os.path.join(TMP, "shop")
os.makedirs(p0)
st = core.GardenState(os.path.join(p0, "wallet.json"))
d0 = st.load(); d0["coins"] = 10 ** 6; d0["home"]["house"] = 7; st.save(d0)
for iid in core.LE_ITEMS:
    ok("Lịch chờ Giáng sinh" in err(st.buy, iid), "cửa hàng không bán %s" % iid)
    ok(err(st.buy_at, iid, 10) != "", "gánh hàng không bán %s" % iid)
for t in DEC.NOEL_TILES:
    ok("Lịch chờ Giáng sinh" in err(st.decor_buy, t), "không mua được mẫu %s" % t)
ok(st.load()["coins"] == 10 ** 6, "không mất xu nào")
plan_err = err(core.draft_plan, st.load(), "room", {"items": [], "decor": {"wall": "w_noelkeo"}})
ok("Lịch chờ Giáng sinh" in plan_err, "Trang trí thử: tường Noel chưa có → không mua được qua \"Dùng bản này\" (%s)" % plan_err[:60])
plan_err = err(core.draft_plan, st.load(), "room", {"items": [{"id": "le_banhkem", "x": 2, "y": 1}]})
ok("không bán" in plan_err, "Trang trí thử: món sự kiện chưa có → không mua được (%s)" % plan_err[:60])
ped = [k for k, v in core.CATALOG.items() if int(v.get("price") or 0) > 0 and not v.get("rare") and not v.get("only") and not v.get("season")]
ok(not (set(core.LE_ITEMS) & set(ped)), "gánh hàng rong không bày món sự kiện")

# =========================================================================================================
print("== B. giai đoạn theo ngày")
for day, want in [(D(2026, 11, 14), None), (D(2026, 11, 15), "pre"), (D(2026, 11, 30), "pre"), (D(2026, 12, 1), "advent"),
                  (D(2026, 12, 24), "advent"), (D(2026, 12, 25), "after"), (D(2026, 12, 31), "after"), (D(2027, 1, 1), "done"),
                  (D(2027, 12, 10), "done"), (D(2025, 12, 10), None)]:
    ok(le.phase(day) == want, "%s → %s" % (day, want))
ok(le.active(D(2026, 12, 1)) and le.active(D(2026, 12, 31)) and not le.active(D(2026, 11, 30)) and not le.active(D(2027, 1, 1)),
   "trong mùa: 1/12 → 31/12")

# =========================================================================================================
print("== C. luật mở ngăn")
e = le.empty()
day = D(2026, 12, 5)
ok("mở từ 7/12" in err(le.open_door, e, 7, day, ["2026-12-05"], [], 1), "ngăn tương lai → \"mở từ 7/12\"")
ok("Ôn ít nhất 1 thẻ" in err(le.open_door, e, 5, day, [], [], 0), "hôm nay chưa ôn → ôn 1 thẻ")
ok("ôn thêm 15 lượt" in err(le.open_door, e, 3, day, [], [], 0), "lỡ ngày, 0 lượt → ôn thêm 15 lượt")
ok("ôn thêm 1 lượt" in err(le.open_door, e, 3, day, [], [], 14), "lỡ ngày, 14 lượt → ôn thêm 1 lượt")
r = le.open_door(e, 3, day, [], [], 15)
ok(r["makeup"] and e["open"]["3"] == {"d": "2026-12-05", "b": 1} and e["bu"] == {"2026-12-05": 1}, "15 lượt → mở bù ngăn 3")
ok("ôn thêm 15 lượt" in err(le.open_door, e, 2, day, [], [], 15), "ngăn bù thứ hai cần 30 lượt")
le.open_door(e, 2, day, [], [], 30)
ok("đủ 2 ngăn" in err(le.open_door, e, 1, day, [], [], 999), "≤ 2 ngăn bù / ngày (cả 999 lượt)")
ok(le.makeup_next(e, day, 999) is None and le.makeup_left(e, day, 999) == 0, "makeup_next None khi đã đủ")
r = le.open_door(e, 4, day, ["2026-12-04"], [], 0)
ok(not r["makeup"] and r["item"] == {}, "ngày 4 có ôn (điện thoại / trước lúc cài) → mở được, không tính bù")
r = le.open_door(e, 1, day, [], ["2026-12-01"], 0)
ok(not r["makeup"], "ngày 1 đã dùng vé giữ chuỗi → mở được, không tính bù")
ok("mở rồi" in err(le.open_door, e, 1, day, ["2026-12-01"], [], 0), "mở lại ngăn đã mở → lỗi")
r = le.open_door(e, 5, day, ["2026-12-05"], [], 1)
ok(r["item"] == {"le_tat": 1} and r["kind"] == "trong", "ngăn 5 → tất Noel vào kho")
ok("Không có ngăn" in err(le.open_door, e, 25, day, [], [], 1) and "Không có ngăn" in err(le.open_door, e, "x", day, [], [], 1),
   "ngăn 25 / \"x\" → không có")
ok("từ 1/12" in err(le.open_door, le.empty(), 1, D(2026, 11, 30), ["2026-11-30"], [], 5), "30/11 → tủ lịch mở từ 1/12")
ok("đã qua" in err(le.open_door, le.empty(), 1, D(2027, 1, 1), ["2026-12-01"], [], 5), "1/1 → mùa đã qua")
e2 = le.empty()
r = le.open_door(e2, 6, D(2026, 12, 6), ["2026-12-06"], [], 1)
ok(r["item"] == {} and r["box"] == 1, "ngăn 6 → hộp quà số 1 (món chưa vào kho)")
e3 = le.empty()
le.open_door(e3, 2, D(2026, 12, 31), [], [], 15)
ok(e3["open"]["2"]["b"] == 1, "31/12 vẫn mở bù được")

print("== C2. 2.000 tháng ngẫu nhiên có đối chứng")
rng = random.Random(SEED)
bad = []
for trial in range(2000):
    e = le.empty()
    reviewed, frozen = set(), set()
    start = D(2026, 12, 1) + dt.timedelta(days=rng.choice([0, 0, 0, 3, 9, 15, 24, 28]))     # cài / mở vườn lần đầu
    for k in range(31):
        dd = D(2026, 12, 1) + dt.timedelta(days=k)
        rv = rng.choice([0, 0, 1, 5, 14, 15, 20, 29, 30, 31, 60])
        if rv:
            reviewed.add(dd.isoformat())
        elif rng.random() < 0.1:
            frozen.add(dd.isoformat())
        if dd < start or rng.random() < 0.15:          # chưa cài / hôm đó không mở vườn (vẫn có thể ôn ở điện thoại)
            continue
        for _ in range(rng.randint(0, 6)):
            dn = rng.randint(1, 24)
            before = copy.deepcopy(e)
            st_ = le.door_state(e, dn, dd, reviewed, frozen)
            try:
                res = le.open_door(e, dn, dd, reviewed, frozen, rv)
            except le.LeError:
                if e != before:
                    bad.append("lỗi mà vẫn sửa sổ")
                # đối chứng: đúng là không mở được
                if st_ in ("ready",) or (st_ == "miss" and le.makeup_left(before, dd, rv) > 0):
                    bad.append("mở được mà báo lỗi: ngăn %d ngày %s (%s)" % (dn, dd, st_))
                continue
            if st_ not in ("ready", "miss"):
                bad.append("mở ngăn %d trạng thái %s" % (dn, st_))
            if res["makeup"] != (st_ == "miss"):
                bad.append("cờ mở bù sai")
            if D(2026, 12, dn) > dd:
                bad.append("mở trước ngày")
    for ds, n in e["bu"].items():
        if n > 2:
            bad.append("quá 2 ngăn bù ngày %s" % ds)
    for k, v in e["open"].items():
        if v["d"] < D(2026, 12, int(k)).isoformat() or v["d"] > "2026-12-31":
            bad.append("ngày mở sai %s %s" % (k, v))
    if le.clean_ev(json.loads(json.dumps(e))) != {kk: vv for kk, vv in e.items()}:
        bad.append("clean_ev(sổ thật) khác sổ")
ok(not bad, "2.000 tháng: không mở trước ngày, không mở hai lần, ≤ 2 bù / ngày, đúng như luật (%s)" % bad[:3])

print("== C3. làm sạch dữ liệu hỏng")
junk = {"open": {"1": {"d": "2026-11-30"}, "2": {"d": "2026-12-02", "b": True}, "02": {"d": "2026-12-05"}, "25": {"d": "2026-12-30"},
                 "3": "x", "4": {"d": "hôm qua"}, "5": {"d": "2026-12-05", "b": "1"}},
        "bu": {"2026-12-05": 7, "x": 1, "2026-12-06": True, "2026-12-07": -1}, "gift": {"tulich": "2026-12-01", "tree": 5, "x": "2026-12-01"},
        "box": {"1": "2026-12-25", "4": "2026-12-25", "2": None}, "khac": 1}
c = le.clean_ev(junk)
ok(c["open"] == {"2": {"d": "2026-12-02", "b": 1}, "5": {"d": "2026-12-05", "b": 0}}, "open: bỏ ngày trước ngăn / số lạ / kiểu sai")
ok(c["bu"] == {"2026-12-05": 2} and c["gift"] == {"tulich": "2026-12-01"} and c["box"] == {"1": "2026-12-25"}, "bu / gift / box")
for j in (None, [], "x", 5, {"open": [], "bu": "x", "gift": None, "box": 3}):
    ok(le.clean_ev(j) == le.empty(), "clean_ev(%r) → trống" % (j,))
ok(le.clean({"noel2026": junk, "noel2027": {"x": 1}}) == {"noel2026": c}, "clean cả khoá")

# =========================================================================================================
print("== D. hộp quà bí mật")
e = le.empty()
for dn in (6, 13):
    le.open_door(e, dn, D(2026, 12, dn), [D(2026, 12, dn).isoformat()], [], 1)
bx = le.boxes(e, D(2026, 12, 14))
ok([b["n"] for b in bx] == [1, 2] and not any(b["can"] for b in bx) and all(len(b["shake"]) == 2 for b in bx), "2 hộp dưới gốc cây, lắc được, chưa mở được")
ok("25/12" in err(le.open_box, e, 1, D(2026, 12, 24)), "24/12 → mở từ sáng 25/12")
ok("ngăn 20/12" in err(le.open_box, e, 3, D(2026, 12, 25)), "hộp 3 chưa có (ngăn 20 chưa mở)")
got = le.open_box(e, 1, D(2026, 12, 25))
ok(got == {"le_cautuyet": 1} and e["box"] == {"1": "2026-12-25"}, "25/12 mở hộp 1 → quả cầu tuyết")
ok("mở rồi" in err(le.open_box, e, 1, D(2026, 12, 26)), "mở hộp lần hai → lỗi")
got = le.open_box(e, 2, D(2027, 2, 3))
ok(got == {"le_gaubong": 1}, "hết mùa (3/2/2027) vẫn mở được hộp đã có")
ok(err(le.open_box, e, 9, D(2026, 12, 25)) and err(le.open_box, e, "a", D(2026, 12, 25)), "hộp lạ → lỗi")

# =========================================================================================================
print("== E. plan_sync — các kiểu người dùng")
T1 = D(2026, 12, 1)
e = le.empty()
p = le.plan_sync(e, {}, {}, [], T1)
ok(p and p["give"] == {"le_tulich": 1, "xmastree": 1} and p["auto"] == ["le_tulich", "xmastree"] and p["welcome"],
   "người mới (không có gì): tặng tủ lịch + cây thông, tự bày cả hai")
ok(le.plan_sync(e, {"le_tulich": 1, "xmastree": 1}, {"le_tulich": 1, "xmastree": 1}, [], T1) is None, "gọi lại lần hai → không làm gì")
e = le.empty()
p = le.plan_sync(e, {"xmastree": 1}, {"xmastree": 1}, [], T1)
ok(p["give"] == {"le_tulich": 1} and p["auto"] == ["le_tulich"], "đã mua cây và đặt rồi → chỉ tặng tủ lịch")
e = le.empty()
p = le.plan_sync(e, {"xmastree": 2}, {}, [], T1)
ok(p["give"] == {"le_tulich": 1} and p["auto"] == ["le_tulich", "xmastree"], "có 2 cây trong kho, chưa đặt → không tặng, đặt 1 cây ra sân")
e = le.empty()
p = le.plan_sync(e, {"xmastree": 1}, {"xmastree": 1}, [], T1)       # cây đặt ở Bãi biển (placed đếm mọi cảnh)
ok("xmastree" not in p["auto"], "cây đang ở vùng khác → không dời, không tặng thêm")
e = le.empty()
p = le.plan_sync(e, {"le_tulich": 1}, {}, [], T1)
ok(p["give"] == {"xmastree": 1} and p["auto"] == ["le_tulich", "xmastree"], "đã có tủ lịch (máy khác tặng) → không tặng lại tủ lịch")
e = le.empty()
p = le.plan_sync(e, {}, {}, [], D(2026, 12, 10))
ok(p["welcome"] and e["gift"] == {"tulich": "2026-12-10", "tree": "2026-12-10"}, "cài giữa tháng (10/12) → vẫn tặng")
v = le.view(e, D(2026, 12, 10), ["2026-12-0%d" % k for k in range(1, 10)] + ["2026-12-10"], [], 3)
ok(v["ready"] == list(range(1, 11)), "cài 10/12: ngày 1–9 đã ôn (điện thoại / trước lúc cài) + hôm nay → 10 ngăn chờ mở")
e = le.empty()
ok(le.plan_sync(e, {}, {}, [], D(2027, 1, 1)) is None and e["gift"] == {}, "mở vườn lần đầu từ 1/1/2027 → không tặng gì")
ok(le.plan_sync(le.empty(), {}, {}, [], D(2026, 11, 25)) is None, "trước 1/12 → không tặng")
e = le.empty()
for dn in (3, 5, 17, 21, 8):
    le.open_door(e, dn, D(2026, 12, 21), [D(2026, 12, dn).isoformat()], [], 0)
le.mark_gifts(e, ["tulich", "tree"], T1)
exp = le.expected_items(e)
ok(exp == {"le_tulich": 1, "le_caynho": 1, "le_tat": 1, "le_nguoituyet": 1, "le_tuanloc": 2}, "món phải có theo sổ: %s" % exp)
p = le.plan_sync(e, {"le_tulich": 1, "le_tat": 1, "le_tuanloc": 1}, {"le_tulich": 1}, ["w_noelkeo"], D(2026, 12, 22))
ok(p and p["give"] == {"le_caynho": 1, "le_nguoituyet": 1, "le_tuanloc": 1} and p["auto"] == [] and not p["welcome"]
   and p["tiles"] == ["w_noeltuyet", "w_noeldo"], "kho thiếu món sổ đã ghi (khôi phục ví cũ) → bù đủ, không tự bày: %s" % p)
p = le.plan_sync(e, {"le_tulich": 1, "le_tat": 1, "le_tuanloc": 2, "le_caynho": 1, "le_nguoituyet": 1}, {}, list(le.WALLS), D(2027, 1, 5))
ok(p is None, "sau mùa: đủ hết → không làm gì")
ok(le.auto_list({"le_tuanloc": 2, "le_tat": 1, "le_nguoituyet": 1}) == ["le_nguoituyet", "le_tuanloc", "le_tuanloc"],
   "tự bày: người tuyết + 2 tuần lộc (đồ sân), tất Noel vào kho")

# =========================================================================================================
print("== F. GardenState.le_apply")


def fresh(name, house=0, coins=0):
    pth = os.path.join(TMP, name)
    os.makedirs(pth)
    s = core.GardenState(os.path.join(pth, "wallet.json"))
    s.today_override = 500
    dd = s.load(); dd["coins"] = coins; dd["home"]["house"] = house; s.save(dd)
    return s


s = fresh("f_new", house=0)
w, placed = s.le_apply({"le_tulich": 1, "xmastree": 1}, ["le_tulich", "xmastree"], [])
ok(w["home"]["owned"].get("le_tulich") == 1 and not any(e_["id"] == "le_tulich" for e_ in w["home"]["room"]),
   "nhà chưa có phòng: tủ lịch nằm trong Kho đồ")
ok(placed == [{"id": "xmastree", "scene": "yard", "x": 4, "y": 1}], "cây thông tự đặt ở sân, ô gần nhà nhất hàng giữa: %s" % placed)
s = fresh("f_house", house=7)
w, placed = s.le_apply({"le_tulich": 1}, ["le_tulich"], [])
ok(placed == [{"id": "le_tulich", "scene": "room", "x": 3, "y": 0}], "nhà có phòng: tủ lịch treo tường cạnh cửa sổ (3, 0)")
w, placed = s.le_apply({"le_tulich": 1}, ["le_tulich"], [])
ok(w["home"]["owned"]["le_tulich"] == 1 and placed == [], "tặng tủ lịch lần hai → vẫn 1 cái, không treo thêm")
d = s.load()
d["home"]["room"].append({"id": "clock", "x": 6, "y": 0})
d["home"]["owned"]["clock"] = 1
s.save(d)
w, placed = s.le_apply({"le_tuanloc": 2}, ["le_tuanloc", "le_tuanloc"], [])
ok([(x["x"], x["y"]) for x in placed] == [(15, 2), (14, 2)], "2 tuần lộc: hàng trước, từ mép phải sân vào")
s = fresh("f_full", house=7)
d = s.load()
for y in range(3):
    for x in range(4, 16):
        d["home"]["yard"].append({"id": "fence", "x": x, "y": y})
d["home"]["owned"]["fence"] = 36
s.save(d)
w, placed = s.le_apply({"xmastree": 1, "le_nguoituyet": 1}, ["xmastree", "le_nguoituyet"], [])
ok(placed == [] and w["home"]["owned"]["xmastree"] == 1 and w["home"]["owned"]["le_nguoituyet"] == 1, "sân hết chỗ → cây + người tuyết vào kho")
w, placed = s.le_apply({}, [], ["w_noelkeo", "f_noellen", "w_kem"])
ok(w["more"]["decor"]["own"] == ["w_noelkeo", "f_noellen"], "mẫu Noel vào decor.own (mẫu thường không tặng được)")
s.decor_use("room", "wall", "w_noelkeo")
ok(s.load()["more"]["decor"]["use"]["room"] == {"wall": "w_noelkeo"}, "dùng được tường Noel cho phòng chính")
raw_nha = json.load(open(os.path.join(TMP, "f_full", "nha.json"), encoding="utf-8")) if os.path.exists(os.path.join(TMP, "f_full", "nha.json")) else None
ok(raw_nha is None or "le_nguoituyet" in json.dumps(raw_nha), "đồ sự kiện nằm ở file tầng NHA")
ok(err(s.le_apply, {"khong_co": 1}, [], []) != "", "món lạ → lỗi")

print("== F2. lỗi ghi → không đổi gì (collection giả)")
col = Col()
uf = os.path.join(TMP, "f_col")
os.makedirs(uf)
sc_ = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
sc_.today_override = 500
dd = sc_.load(); dd["home"]["house"] = 7; sc_.save(dd)
store = le.LeStore(os.path.join(uf, "le.json"), lambda: col)
before = copy.deepcopy(col.conf)
evx = store.load()
le.open_door(evx, 3, D(2026, 12, 3), ["2026-12-03"], [], 1)
for bad_key in (core.NHA_KEY, le.LE_KEY):
    col.fail_set = bad_key
    try:
        sc_.le_apply({"le_caynho": 1}, [], [], extra=[store.write(evx)])
        ok(False, "lỗi ghi %s phải báo lỗi" % bad_key)
    except (core.StoreError, backup.StoreFailed):
        same = {k: v for k, v in col.conf.items() if k != backup.REV_KEY} == {k: v for k, v in before.items() if k != backup.REV_KEY}
        ok(same, "lỗi ghi %s → collection y như trước (không có món mà chưa ghi ngăn, không ghi ngăn mà thiếu món)" % bad_key)
col.fail_set = None
sc_.le_apply({"le_caynho": 1}, [], [], extra=[store.write(evx)])
ok(col.conf[le.LE_KEY]["noel2026"]["open"]["3"]["d"] == "2026-12-03" and sc_.load()["home"]["owned"].get("le_caynho") == 1,
   "không lỗi → ngăn 3 + cây thông nhỏ cùng ghi")

# =========================================================================================================
print("== G. LeStore")
col = Col()
col.conf[le.LE_KEY] = {"v": 3, "noel2027": {"open": {"1": {}}}, "noel2026": {"open": {"1": {"d": "2026-12-01", "b": 0, "note": "z"}},
                                                                             "moi": [1, 2]}}
store = le.LeStore(os.path.join(TMP, "g", "le.json"), lambda: col)
os.makedirs(os.path.join(TMP, "g"))
e = store.load()
le.open_door(e, 2, D(2026, 12, 2), ["2026-12-02"], [], 1)
# máy khác (đồng bộ) vừa mở ngăn 3 trong lúc này
col.conf[le.LE_KEY]["noel2026"]["open"]["3"] = {"d": "2026-12-03", "b": 0}
store.save(e)
raw = col.conf[le.LE_KEY]
ok(raw.get("noel2027") == {"open": {"1": {}}} and raw["noel2026"].get("moi") == [1, 2], "giữ khoá lạ của bản sau (năm khác, trường mới)")
ok(sorted(raw["noel2026"]["open"]) == ["1", "2", "3"], "hai máy cùng mở ngăn → gộp theo hợp")
ok(backup.REV_KEY in col.conf, "đóng dấu phiên bản (sync_core giữ được khi đồng bộ)")
ok(os.path.exists(os.path.join(TMP, "g", "le.json")) or any("le.json" in f for _r, _d, fs in os.walk(os.path.join(TMP, "g")) for f in fs),
   "có file sao lưu le.json")
col.fail_get = le.LE_KEY
e = store.load()
ok(e.get("_damaged") and e["open"] == {}, "đọc lỗi → sổ trống có dấu _damaged (vẫn vẽ được)")
try:
    store.write(e)
    ok(False, "đọc lỗi → write phải từ chối")
except backup.ReadFailed:
    ok(True, "đọc lỗi → write từ chối (không ghi sổ trống đè sổ thật)")
col.fail_get = None
merged = le.merge_ev({"open": {"1": {"d": "2026-12-05", "b": 1}}, "bu": {"2026-12-05": 1}, "gift": {"tulich": "2026-12-03"}, "box": {}},
                     {"open": {"1": {"d": "2026-12-01", "b": 0}, "4": {"d": "2026-12-04", "b": 0}}, "bu": {"2026-12-05": 2},
                      "gift": {"tulich": "2026-12-01", "tree": "2026-12-01"}, "box": {"1": "2026-12-26"}})
ok(merged["open"]["1"]["d"] == "2026-12-01" and "4" in merged["open"] and merged["bu"]["2026-12-05"] == 2
   and merged["gift"] == {"tulich": "2026-12-01", "tree": "2026-12-01"} and merged["box"] == {"1": "2026-12-26"},
   "merge_ev: ngày sớm hơn thắng, bù lấy lớn hơn, quà / hộp theo hợp")

# =========================================================================================================
print("== H. mã 1.31.3 thật (bản đã phát hành) mở ví có đồ sự kiện")
SCRIPT = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
st.today_override = 500
d = st.load(); d["coins"] += 77; st.save(d)
st.buy("fence"); st.place("yard", "fence", 4, 2)
d = st.load()
print(json.dumps({"coins": d["coins"], "le": {k: v for k, v in d["home"]["owned"].items() if k.startswith("le_")},
                  "use": d["more"]["decor"]["use"]["room"]}))
'''
try:
    o = os.path.join(TMP, "old1313")
    os.makedirs(o)
    subprocess.run(["tar", "-x", "-C", o], input=ma_cu.archive(REPO, "e64eb22"), check=True)
    OLD = os.path.join(o, "kotoba_batake")
except Exception as ex:      # noqa: BLE001
    OLD = None
    print("  (bỏ qua: không lấy được mã 1.31.3: %s)" % str(ex)[:80])
if OLD:
    s = fresh("h", house=7, coins=1000)
    s.le_apply({"le_tulich": 1, "le_tuanloc": 2, "le_banhquy": 1, "xmastree": 1}, ["le_tulich", "le_tuanloc", "xmastree"],
               ["w_noelkeo", "f_noelcaro"])
    s.place("room", "le_banhquy", 2, 2)
    s.decor_use("room", "wall", "w_noelkeo"); s.decor_use("room", "floor", "f_noelcaro")
    before = s.load()
    rr = subprocess.run([sys.executable, "-c", SCRIPT, OLD, STUBS, s.path], capture_output=True, text=True)
    ok(rr.returncode == 0, "mã 1.31.3 chạy được trên ví có đồ sự kiện" + ("" if rr.returncode == 0 else ": " + rr.stderr[-300:]))
    if rr.returncode == 0:
        outo = json.loads(rr.stdout.strip().splitlines()[-1])
        ok(outo["le"] == {}, "1.31.3 không biết đồ le_* (không hiện, không bán) — %s" % outo["le"])
        after = s.load()
        keep_items = all(after["home"]["owned"].get(k) == before["home"]["owned"].get(k) for k in core.LE_ITEMS)
        pl = lambda dd_: sorted((sc, e_["id"], e_["x"], e_["y"]) for sc in ("yard", "room") for e_ in dd_["home"][sc] if e_["id"].startswith("le_") or e_["id"] == "xmastree")
        ok(keep_items and pl(after) == pl(before), "1.36 đọc lại: đủ đồ sự kiện + chỗ đặt (%d chỗ)" % len(pl(after)))
        ok(after["more"]["decor"]["use"]["room"] == {"wall": "w_noelkeo", "floor": "f_noelcaro"}
           and {"w_noelkeo", "f_noelcaro"} <= set(after["more"]["decor"]["own"]), "tường / sàn Noel đang dùng còn nguyên")
        ok(after["coins"] == before["coins"] + 77 - 15 and any(e_["id"] == "fence" for e_ in after["home"]["yard"]),
           "thao tác của 1.31.3 (xu, mua + đặt rào) vẫn còn")

# =========================================================================================================
print("== I. Tin làng / thẻ Hôm nay")
nl = le.news_line(None, D(2026, 11, 25), [], [])
ok(nl and nl["id"] == "le_pre" and "1/12" in nl["text"] and nl.get("low"), "25/11: \"1/12 mở Lịch chờ Giáng sinh\" (ít ưu tiên)")
nl = le.news_line(None, D(2026, 11, 30), [], [])
ok(nl and nl["text"].startswith("Mai mở") and not nl.get("low"), "30/11: \"Mai mở Lịch chờ Giáng sinh\"")
e = le.empty()
nl = le.news_line(e, D(2026, 12, 3), [], [])
ok(nl["id"] == "le_wait" and "ngăn 3/12" in nl["text"], "chưa ôn hôm nay → ôn 1 thẻ là mở ngăn 3/12")
nl = le.news_line(e, D(2026, 12, 3), ["2026-12-01", "2026-12-03"], [])
ok(nl["id"] == "le_ready" and "2 ngăn" in nl["text"], "2 ngăn chờ mở")
le.open_door(e, 1, D(2026, 12, 3), ["2026-12-01"], [], 0); le.open_door(e, 3, D(2026, 12, 3), ["2026-12-03"], [], 1)
nl = le.news_line(e, D(2026, 12, 3), ["2026-12-01", "2026-12-03"], [], 3)
ok(nl and nl["id"] == "le_makeup_next" and "12 lượt" in nl["text"] and nl.get("low"), "ngày 2 lỡ, 3 lượt → ôn thêm 12 lượt mở bù (%s)" % (nl or {}).get("text"))
nl = le.news_line(e, D(2026, 12, 3), ["2026-12-01", "2026-12-03"], [], 15)
ok(nl and nl["id"] == "le_makeup", "15 lượt → mở bù được 1 ngăn")
le.open_door(e, 6, D(2026, 12, 26), ["2026-12-06"], [], 0)
nl = le.news_line(e, D(2026, 12, 26), ["2026-12-01", "2026-12-03", "2026-12-06"], [], 0)
ok(nl and nl["id"] == "le_box", "26/12, 0 lượt: hộp quà mở được → nhắc mở hộp (trước dòng \"ôn thêm … mở bù\")")
nl = le.news_line(e, D(2026, 12, 26), ["2026-12-01", "2026-12-03", "2026-12-06", "2026-12-26"], [], 15)
ok(nl and nl["id"] == "le_makeup", "26/12, 15 lượt: mở bù được → nhắc mở bù trước hộp quà")
nl = le.news_line(e, D(2027, 1, 3), [], [], 0)
ok(nl and nl["id"] == "le_box", "3/1/2027: hộp quà chưa mở → nhắc")
ok(le.soon_line(D(2026, 11, 26))["text"] == "Lịch chờ Giáng sinh mở" and le.soon_line(D(2026, 12, 20))["at"] == "2026-12-25"
   and le.soon_line(D(2026, 12, 26)) is None, "Sắp tới: ngày mở tủ lịch / mở hộp quà")
ctx = {"today": D(2026, 12, 3), "le": {"id": "le_ready", "text": "Tủ lịch Giáng sinh: ngăn 3/12 chờ mở", "short": "ngăn 3/12"},
       "le_soon": {"at": "2026-12-25", "text": "Mở hộp quà bí mật"}}
nw = ev_core.news(ctx)
ok(any(x["id"] == "le_ready" and x["icon"] == "gift" for x in nw["today"]) and nw["line"] != "ngăn 3/12", "Tin làng có dòng tủ lịch (thẻ Hôm nay có nút riêng)")
ok(any("Tủ lịch" in g for g in nw["greet"]), "màn chào nhắc ngăn chờ mở")
nw = ev_core.news({"today": D(2026, 12, 20), "le_soon": {"at": "2026-12-25", "text": "Mở hộp quà bí mật"}})
ok(any(x["id"] == "le_soon" for x in nw["soon"]), "Sắp tới: Mở hộp quà bí mật")
v = le.view(le.simulate(D(2026, 12, 12), reviewed=False), D(2026, 12, 12), ["2026-12-%02d" % k for k in range(1, 13)], [], 30)
ok(v["opened"] == 11 and v["ready"] == [12] and v["doors"][12]["peek"] and v["doors"][12]["name"] and not v["doors"][13]["name"],
   "xem thử 12/12: 11 ngăn mở, ngăn 12 chờ mở, ngăn 13 hé bóng, ngăn 14 kín")
v = le.view(le.simulate(D(2026, 12, 26)), D(2026, 12, 26), [], [], 0)
ok(v["opened"] == 24 and all(b["opened"] for b in v["boxes"]) and v["phase"] == "after", "xem thử 26/12: đủ 24 ngăn, hộp quà đã mở")

# =========================================================================================================
print("== J. soát mã cầu nối")
INIT = read("__init__.py")
ok('cmd.startswith("le:")' in INIT and "def _on_le(self, cmd" in INIT, "lệnh le:* có đường riêng")
ok(INIT.count("extra=[LE.write(ev)]") >= 3, "mở ngăn / mở hộp / tặng quà ghi sổ CÙNG một lần với kho (extra=[LE.write(ev)])")
ok("if not le_on():\n            return" in INIT and "if not le_on(cfg):\n        return None" in INIT, "Sự kiện mùa tắt → không lệnh, không data.le")
ok("if not admin_on():\n                return" in INIT, "Xem thử sự kiện chỉ cho admin (file user_files/admin)")
ok("le_view(data[\"wallet\"], today, cfg)" in INIT and "_le_settle(data[\"wallet\"], le_today())" in INIT, "refresh: tặng / bù rồi mới dựng data.le")
ok("profile_did_open" not in INIT[INIT.find("def _le_settle"):INIT.find("def le_view")], "tặng quà lúc mở vườn (refresh), không lúc mở hồ sơ")
ok("_sync_hold()" in INIT[INIT.find("def _le_settle"):INIT.find("def le_view")], "đang đồng bộ → không tặng / bù")
ok(f'"{"le_art.js"}"' in INIT or "le_art.js" in INIT and "le.js" in INIT, "nạp le_art.js + le.js trước home.js")
ok(INIT.find("le_art.js") < INIT.find("/home.js"), "le_art.js nạp trước home.js (gắn hình vào SPR)")
cfgj = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
ok(cfgj.get("season_event") is True and core.DEFAULT_CONFIG.get("season_event") is True, "config.json + mặc định: season_event = true")
ok("season_event" in read("config.md"), "config.md giải thích season_event")
keys = set(re.findall(r"\"(kotoba_batake_[a-z0-9_]+)\"", "\n".join(read(n) for n in os.listdir(ADDON) if n.endswith(".py"))))
ok("kotoba_batake_le" in keys, "khoá collection mới kotoba_batake_le")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: %d/%d%s" % (PASS[0], PASS[0] + len(FAIL), "" if not FAIL else " — CÓ LỖI"))
sys.exit(1 if FAIL else 0)
