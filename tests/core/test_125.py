"""Test offline 1.25: nhà 3 gian làm lại — mở rộng nhà một lần, ba gian theo kiểu nhà, nút ẩn dây trang trí.

- Mở rộng nhà một lần: 2.000 xu được cả Bếp lẫn Phòng ngủ (chưa xây xong / thiếu xu / bấm đúp không trừ hai lần);
  lệnh cũ kèm id gian của 1.24 vẫn chạy (mở cả hai).
- Dữ liệu 1.24 mới mở một gian → coi như mở cả hai, đồ đặt ở gian đó còn nguyên, không hoàn xu.
- Đổi kiểu nhà không mất gian / đồ (ba gian chỉ đổi giao diện).
- Cài đặt giao diện: khoá chung mới "deco" (Dây trang trí: on / off), mặc định on, giá trị lạ → on.
- Mã 1.24 thật (git) mở cùng dữ liệu: thấy cả hai gian, lưu lại không mất gì; dữ liệu 1.24 một gian → 1.25 mở cả hai.

Chạy: python test_125.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.24]
Không đưa thư mục 1.24 thì lấy từ git (commit 1.24.0) nếu được, không thì bỏ qua phần đó.
"""
import json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import garden_core as core
import more_core

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def err(fn, *a):
    try:
        fn(*a)
    except core.HomeError as e:
        return str(e)
    return ""


TMP = tempfile.mkdtemp(prefix="kb125_")


def fresh(name, coins=20000, house=7, owned=None):
    d = os.path.join(TMP, name)
    os.makedirs(d)
    st = core.GardenState(os.path.join(d, "wallet.json"))
    data = st.load()
    data["coins"], data["home"]["house"] = coins, house
    data["home"]["owned"].update(owned or {})
    st.save(data)
    return d, st


def read(d, f):
    try:
        return json.load(open(os.path.join(d, f), encoding="utf-8"))
    except OSError:
        return None


def write(d, f, obj):
    json.dump(obj, open(os.path.join(d, f), "w", encoding="utf-8"))


print("== danh mục")
cat = core.home_catalog()
ok(cat["nha_price"] == 2000 and core.NHA_PRICE == 2000 and all("price" not in r for r in cat["rooms"]),
   "home_catalog: một giá mở rộng nhà 2.000 xu (không còn giá từng gian)")
ok([r["id"] for r in cat["rooms"]] == ["kitchen", "bedroom"] and cat["side"] == {"cols": 9, "rows": 4},
   "hai gian bên Bếp / Phòng ngủ, 9 × 4 ô, không cửa sổ (như 1.24)")

print("== mở rộng nhà một lần")
d, st = fresh("open", coins=5000, house=6)
ok("Xây xong nhà" in err(st.open_rooms) and st.load()["coins"] == 5000 and st.load()["home"]["rooms"] == [],
   "nhà chưa xây xong 7 bước → chưa mở rộng được, không trừ xu")
data = st.load(); data["home"]["house"] = 7; data["coins"] = 1500; st.save(data)
ok("Chưa đủ xu" in err(st.open_rooms) and st.load()["home"]["rooms"] == [] and st.load()["coins"] == 1500, "thiếu xu → không mở gian nào")
data = st.load(); data["coins"] = 5000; st.save(data)
st.open_rooms()
data = st.load()
ok(data["coins"] == 3000 and data["home"]["rooms"] == ["kitchen", "bedroom"] and data["home"]["kitchen"] == [] and data["home"]["bedroom"] == [],
   "2.000 xu → mở cả Bếp lẫn Phòng ngủ cùng lúc")
ok("đã mở rộng rồi" in err(st.open_rooms) and st.load()["coins"] == 3000, "bấm đúp: báo đã mở, không trừ lần hai")
ok("đã mở rộng rồi" in err(st.open_room, "kitchen") and "Không có gian" in err(st.open_room, "attic"),
   "lệnh cũ kèm id: gian đã mở → báo đã mở; gian lạ → lỗi")
ok(read(d, "nha.json")["rooms"] == ["kitchen", "bedroom"], "NHA_KEY lưu cả hai gian")
d2, st2 = fresh("open_old_cmd", coins=2000)
st2.open_room("kitchen")
ok(st2.load()["home"]["rooms"] == ["kitchen", "bedroom"] and st2.load()["coins"] == 0, "lệnh cũ home:nha:open:kitchen (1.24) → mở cả hai, trừ đúng 2.000")

print("== dữ liệu 1.24 mới mở một gian → mở cả hai")
d3, st3 = fresh("one", coins=7000, owned={"beddo": 1, "plant": 1})
nha = {"v": 1, "rooms": ["bedroom"], "owned": {"beddo": 1}, "places": {"bedroom": [{"id": "beddo", "x": 2, "y": 3}, {"id": "plant", "x": 6, "y": 2}]}}
write(d3, "nha.json", nha)
data = st3.load()
ok(data["home"]["rooms"] == ["kitchen", "bedroom"], "1.24 chỉ có Phòng ngủ → 1.25 thấy cả Bếp lẫn Phòng ngủ")
ok([e["id"] for e in data["home"]["bedroom"]] == ["beddo", "plant"] and data["home"]["kitchen"] == [], "đồ đặt ở Phòng ngủ còn nguyên, Bếp trống")
ok(data["coins"] == 7000, "không hoàn / không trừ xu")
data["coins"] += 1; st3.save(data)
ok(read(d3, "nha.json")["rooms"] == ["kitchen", "bedroom"], "lưu lại: NHA_KEY ghi cả hai gian")
ok("đã mở rộng rồi" in err(st3.open_rooms), "đã có cả hai gian → không mua lại")
d4, st4 = fresh("future")
write(d4, "nha.json", {"v": 1, "rooms": ["kitchen", "attic"], "owned": {}, "places": {"attic": [{"id": "piano", "x": 0, "y": 1}]}})
data = st4.load(); data["coins"] += 1; st4.save(data)
n4 = read(d4, "nha.json")
ok(st4.load()["home"]["rooms"] == ["kitchen", "bedroom"] and "attic" in n4["rooms"] and n4["places"].get("attic"),
   "gian lạ của bản sau giữ nguyên trong NHA_KEY, bản này hiện đủ hai gian mình biết")
d5, st5 = fresh("none")
write(d5, "nha.json", {"v": 1, "rooms": ["attic"], "owned": {}, "places": {}})
ok(st5.load()["home"]["rooms"] == [], "chỉ có gian lạ → chưa mở rộng (không tự mở)")

print("== đổi kiểu nhà: ba gian chỉ đổi giao diện")
d6, st6 = fresh("style", coins=50000, owned={"reizouko": 1, "beddo": 1, "plant": 2})
st6.open_rooms()
st6.place("kitchen", "reizouko", 0, 1)
st6.place("bedroom", "beddo", 2, 3)
st6.place("room", "plant", 6, 2)
before = st6.load()["home"]
coins0 = st6.load()["coins"]
for s in ("minka", "teahouse", "castle"):
    st6.buy_style(s)
st6.use_style("minka"); st6.use_style("castle"); st6.use_style("classic")
after = st6.load()["home"]
ok(after["rooms"] == ["kitchen", "bedroom"] and after["kitchen"] == before["kitchen"] and after["bedroom"] == before["bedroom"]
   and after["room"] == before["room"], "mua / đổi 3 kiểu nhà: vẫn đủ hai gian, đồ ở ba gian không đổi chỗ")
ok(st6.load()["coins"] == coins0 - sum(core.HOUSE_STYLES[s]["price"] for s in ("minka", "teahouse", "castle")),
   "đổi kiểu chỉ trừ giá kiểu nhà, không trừ thêm cho hai gian")

print("== cài đặt giao diện: Dây trang trí")
ok(more_core.UI_GLOBAL.get("deco") == ("on", "off") and more_core.ui_default()["deco"] == "on", "khoá chung mới deco: on / off, mặc định on (Hiện)")
ok(more_core.clean_ui({"deco": "off"})["deco"] == "off" and more_core.clean_ui({"deco": "maybe"})["deco"] == "on"
   and more_core.clean_ui({"scene": "large"})["deco"] == "on", "clean_ui giữ off, giá trị lạ / thiếu → on")
ok(all(more_core.ui_preset(p)["deco"] == "on" for p in more_core.UI_PRESETS), "các kiểu có sẵn không đụng tới dây trang trí")
raw = more_core.clean_ui({"deco": "off", "card": "tall", "main": {"yard": "hide"}})
ok(raw["card"] == "tall" and raw["main"]["yard"] == "hide" and raw["deco"] == "off", "khoá mới không làm mất các khoá cũ")

OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
if not OLD:
    repo = os.path.abspath(os.path.join(HERE, "..", ".."))
    o = os.path.join(TMP, "old124")
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", repo, "archive", "bc66f66", "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
        OLD = os.path.join(o, "kotoba_batake")
    except Exception as e:      # không có git / commit
        print("  (bỏ qua phần mã 1.24 thật: %s)" % e)
if OLD:
    print("== mã 1.24 thật mở cùng dữ liệu (%s)" % ("git bc66f66" if "old124" in OLD else OLD))
    script = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
mode = sys.argv[4]
if mode == "read":
    data = st.load()
    h = data["home"]
    out = {"ver": hasattr(core, "SIDE_IDS"), "rooms": h.get("rooms"), "kitchen": [e["id"] for e in h.get("kitchen", [])],
           "bedroom": [e["id"] for e in h.get("bedroom", [])]}
    data["coins"] += 5
    st.save(data)
else:                       # 1.24 mở một gian (Phòng ngủ) rồi đặt giường
    st.open_room("bedroom")
    st.place("bedroom", "beddo", 2, 3)
    out = {"rooms": st.load()["home"]["rooms"], "coins": st.load()["coins"]}
print(json.dumps(out))
'''
    d7, st7 = fresh("old_read", coins=10000, owned={"reizouko": 1, "beddo": 1})
    st7.open_rooms()
    st7.place("kitchen", "reizouko", 0, 1)
    st7.place("bedroom", "beddo", 2, 3)
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(d7, "wallet.json"), "read"], capture_output=True, text=True)
    old = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {}
    ok(r.returncode == 0 and old.get("ver") and old.get("rooms") == ["kitchen", "bedroom"] and old.get("kitchen") == ["reizouko"]
       and old.get("bedroom") == ["beddo"], "1.24 đọc dữ liệu 1.25: thấy cả hai gian và đồ trong đó" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    data = st7.load()
    ok(data["home"]["rooms"] == ["kitchen", "bedroom"] and [e["id"] for e in data["home"]["kitchen"]] == ["reizouko"]
       and [e["id"] for e in data["home"]["bedroom"]] == ["beddo"] and data["coins"] == 8005,
       "về 1.25 sau khi 1.24 lưu: gian, đồ, xu (10.000 − 2.000 + 5) còn nguyên")
    d8, st8 = fresh("old_one", coins=6000, owned={"beddo": 1})
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(d8, "wallet.json"), "one"], capture_output=True, text=True)
    old = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {}
    ok(r.returncode == 0 and old.get("rooms") == ["bedroom"] and old.get("coins") == 4000,
       "1.24 thật mở một gian (Phòng ngủ, 2.000 xu)" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    data = st8.load()
    ok(data["home"]["rooms"] == ["kitchen", "bedroom"] and [e["id"] for e in data["home"]["bedroom"]] == ["beddo"] and data["coins"] == 4000,
       "1.25 đọc: mở cả hai gian, giường còn ở Phòng ngủ, xu giữ nguyên (không hoàn)")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
