"""Test offline 1.22.5: chốt chặn lệnh trả xu bị gửi lặp (bấm đúp) phía Python, xu không bao giờ âm.

- "home:build:<bước>": chỉ xây đúng bước giao diện vừa bấm; lệnh lặp (cùng bước) không xây thêm bước sau, không trừ xu.
- "home:build" (không có bước, giao diện cũ) vẫn xây bước kế tiếp như trước.
- Mọi lệnh mua khi thiếu xu: HomeError, ví không đổi, xu không âm.

Chạy: python test_1225.py THƯ_MỤC_ADD_ON   (không có gói `anki` thì dùng tests/stubs)
"""
import json, os, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


class FakeCol:
    def __init__(self, today=100):
        self.conf = {}
        self.sched = type("S", (), {"today": today})()

    def get_config(self, key, default=None):
        v = self.conf.get(key, default)
        return json.loads(json.dumps(v)) if v is not None else default

    def set_config(self, key, value):
        self.conf[key] = json.loads(json.dumps(value))


def state(coins):
    col = FakeCol()
    st = core.GardenState(os.path.join(tempfile.mkdtemp(), "state.json"), lambda: col)
    d = st.load()
    d["coins"] = coins
    st.save(d)
    return st


def err(fn, *a):
    try:
        fn(*a)
    except core.HomeError as e:
        return str(e)
    return None


print("== xây nhà: lệnh lặp do bấm đúp")
L = core.HOUSE_LEVELS
st = state(10000)
st.build(1)
e = err(st.build, 1)                       # lệnh thứ hai của cú bấm đúp: vẫn "bước 1"
d = st.load()
ok(d["home"]["house"] == 1 and d["coins"] == 10000 - L[1][1], f"build:1 hai lần → chỉ xây bước 1, trừ {L[1][1]} xu (còn {d['coins']})")
ok(e is not None and "đã xây" in e, f"lần lặp báo: {e}")
st.build(2)
ok(st.load()["home"]["house"] == 2, "build:2 sau đó vẫn xây bước 2")
ok(err(st.build, 5) is not None and st.load()["home"]["house"] == 2, "build:5 khi bước kế tiếp là 3 → không xây")
ok(err(st.build, 0) is not None and err(st.build, -1) is not None, "build:0 / build:-1 → không xây")
st.build(None)
ok(st.load()["home"]["house"] == 3, "home:build (không có bước, giao diện cũ) vẫn xây bước kế tiếp")
for lv in range(4, len(L)):
    st.build(lv)
ok(err(st.build, len(L)) == "Nhà đã xây xong hết rồi!", "xây xong hết rồi thì báo như cũ")

print("== thiếu xu: mọi lệnh mua bị từ chối, ví không đổi, xu không âm")
st = state(0)
before = json.dumps(st.load(), sort_keys=True, default=str)
bad = []
for name, fn, args in [("xây", st.build, (1,)), ("mua đồ", st.buy, ("fence",)), ("mở vùng", st.unlock_zone, ("beach",)),
                       ("đồ mặc", st.buy_wear, (next(iter(core.WEAR)),)), ("biểu cảm", st.buy_face, (next(iter(core.FACES)),)),
                       ("giao diện mùa", st.unlock_theme, ("tet", "coins")), ("thú", st.pet_buy, ("neko",)),
                       ("giống", st.seed_buy, ("ine",))]:
    e = err(fn, *args)
    if not (e and "Chưa đủ xu" in e):
        bad.append(f"{name}: {e!r}")
after = st.load()
ok(not bad, "8 lệnh mua khi 0 xu đều báo \"Chưa đủ xu\"" + (": " + "; ".join(bad) if bad else ""))
ok(after["coins"] == 0 and json.dumps(after, sort_keys=True, default=str) == before, "ví không đổi, xu vẫn 0")
st = state(79)
ok(err(st.build, 1) is not None and st.load()["coins"] == 79, "79 xu (thiếu 1 xu) → không xây, còn 79 xu")
st = state(80)
st.build(1)
ok(st.load()["coins"] == 0 and st.load()["home"]["house"] == 1, "đúng 80 xu → xây được, còn 0 xu")

print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else f"{len(FAIL)} LỖI"))
sys.exit(1 if FAIL else 0)
