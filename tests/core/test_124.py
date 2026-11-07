"""Test offline 1.24: nhà 3 gian (Bếp · phòng chính · Phòng ngủ).

- Danh mục 12 món mới (Bếp / Phòng ngủ), mở gian 2.000 xu sau khi xây xong nhà, bấm đúp không trừ hai lần.
- Đặt / di chuyển / cất đồ ở từng gian (9 ô, không cửa sổ), đồ ngoài trời không vào nhà, gian chưa mở không đặt được.
- Lưu: hai gian bên + đồ mới chỉ ở khoá riêng NHA_KEY (ví / EXT / SEASON không lẫn), giữ khoá lạ của bản sau.
- Bản 1.23 mở cùng dữ liệu (mã 1.23 thật): không mất gian / đồ mới; đặt thêm món tưởng còn trong kho → khi về 1.24 món ở
  gian bên về kho trước, không mất món nào.

Chạy: python test_124.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.23]
Không đưa thư mục 1.23 thì lấy từ git (commit 1.23.0 cuối) nếu được, không thì bỏ qua phần đó.
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


TMP = tempfile.mkdtemp(prefix="kb124_")


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


print("== danh mục 1.24")
ok(len(core.NHA_ITEMS) == 12 and all(v["scene"] == "room" and v["group"] in ("kitchen", "bedroom") for v in core.NHA_ITEMS.values()),
   "12 món mới, đều là đồ trong nhà, nhóm Bếp / Phòng ngủ")
ok(sum(1 for v in core.NHA_ITEMS.values() if v["group"] == "kitchen") == 6 and all(100 <= v["price"] <= 400 for v in core.NHA_ITEMS.values()),
   "6 món Bếp + 6 món Phòng ngủ, giá 100–400 xu (tổng %d xu)" % sum(v["price"] for v in core.NHA_ITEMS.values()))
cat = core.home_catalog()
ok(cat["side"] == {"cols": 9, "rows": 4} and [r["id"] for r in cat["rooms"]] == ["kitchen", "bedroom"]
   and all(r["price"] == 2000 for r in cat["rooms"]) and cat["nha_unlock"] == 7, "home_catalog: gian bên 9 × 4, Bếp / Phòng ngủ 2.000 xu, mở sau bước 7")
ok(all(any(i["id"] == k and i.get("group") for i in cat["items"]) for k in core.NHA_ITEMS), "món mới có trong danh mục gửi giao diện (kèm nhóm)")

print("== mở gian")
d, st = fresh("open", coins=5000, house=6)
ok("Xây xong nhà" in err(st.open_room, "kitchen") and st.load()["coins"] == 5000, "nhà chưa xây xong → chưa mở rộng được, không trừ xu")
data = st.load(); data["home"]["house"] = 7; st.save(data)
st.open_room("bedroom")
data = st.load()
ok(data["coins"] == 3000 and data["home"]["rooms"] == ["bedroom"], "mở Phòng ngủ trước (thứ tự nào cũng được): trừ 2.000 xu")
ok("đã mở rồi" in err(st.open_room, "bedroom") and st.load()["coins"] == 3000, "bấm đúp: báo đã mở, không trừ lần hai")
ok("Không có gian" in err(st.open_room, "attic"), "gian lạ → lỗi")
data = st.load(); data["coins"] = 1500; st.save(data)
ok("Chưa đủ xu" in err(st.open_room, "kitchen") and st.load()["home"]["rooms"] == ["bedroom"], "thiếu xu → không mở")
data = st.load(); data["coins"] = 2000; st.save(data)
st.open_room("kitchen")
ok(st.load()["home"]["rooms"] == ["kitchen", "bedroom"] and st.load()["coins"] == 0, "mở nốt Bếp: danh sách gian theo thứ tự Bếp, Phòng ngủ")

print("== đặt / di chuyển / cất đồ ở từng gian")
d, st = fresh("place", owned={"plant": 3, "clock": 1, "futon": 1, "fence": 2, "reizouko": 1, "hoshizora": 1})
ok("không đặt ở đây" in err(st.place, "kitchen", "plant", 0, 1), "gian chưa mở → không đặt được")
st.open_room("kitchen")
st.place("kitchen", "reizouko", 0, 1)
st.place("kitchen", "plant", 8, 3)
ok("ngoài căn phòng" in err(st.place, "kitchen", "futon", 8, 2), "gian bên chỉ 9 ô: món rộng 2 ô ở cột 8 → ngoài phòng")
st.place("kitchen", "clock", 4, 0)
ok(any(e["id"] == "clock" and e["x"] == 4 for e in st.load()["home"]["kitchen"]), "gian bên không có cửa sổ: đồ treo tường đặt ở cột 4 được")
ok("treo tường" in err(st.place, "kitchen", "hoshizora", 1, 2), "đồ treo tường mới (dây đèn sao) chỉ trên tường")
ok("không đặt ở đây" in err(st.place, "kitchen", "fence", 1, 1), "đồ ngoài trời không vào nhà")
ok("đã có đồ" in err(st.place, "kitchen", "plant", 0, 1), "ô đã có đồ → không đặt chồng")
st.place("room", "plant", 2, 2)
st.place("room", "hoshizora", 0, 0)
data = st.load()
ok(core.placed_count(data["home"], "plant") == 2, "đếm đồ đã đặt tính cả gian bên (chậu cây: 1 ở Bếp + 1 ở phòng chính)")
ok("không còn món" in err(st.place, "kitchen", "reizouko", 3, 1), "hết món trong kho → không đặt thêm")
st.move("kitchen", 0, 2, 2)
ok(st.load()["home"]["kitchen"][0] == {"id": "reizouko", "x": 2, "y": 2}, "di chuyển trong Bếp")
st.take("kitchen", 0)
data = st.load()
ok(not any(e["id"] == "reizouko" for e in data["home"]["kitchen"]) and data["home"]["owned"]["reizouko"] == 1, "cất vào kho: còn món, hết chỗ đặt")

print("== lưu: khoá riêng NHA_KEY")
w, ext, sea, nha = read(d, "wallet.json"), read(d, "ext.json"), read(d, "season.json"), read(d, "nha.json")
blob = json.dumps([w, ext, sea])
ok("kitchen" not in blob and "reizouko" not in blob and "hoshizora" not in blob and "rooms" not in json.dumps(w["home"]),
   "ví / EXT / SEASON không có gian bên hay món mới (bản cũ không thấy, không xoá được)")
ok(nha["rooms"] == ["kitchen"] and nha["owned"] == {"reizouko": 1, "hoshizora": 1}
   and [e["id"] for e in nha["places"]["kitchen"]] == ["plant", "clock"] and [e["id"] for e in nha["places"]["room"]] == ["hoshizora"],
   "NHA_KEY: gian đã mở, sở hữu món mới, đồ ở Bếp, món mới ở phòng chính")
ok([e["id"] for e in w["home"]["room"]] == ["plant"], "phòng chính trong ví giữ nguyên đồ cũ (bản cũ vẫn đọc đúng)")
nha["future"] = {"x": 1}
nha["rooms"].append("attic")
nha["places"]["attic"] = [{"id": "piano", "x": 0, "y": 1}]
nha["owned"]["piano"] = 1
json.dump(nha, open(os.path.join(d, "nha.json"), "w", encoding="utf-8"))
data = st.load(); data["coins"] += 1; st.save(data)
nha2 = read(d, "nha.json")
ok(nha2.get("future") == {"x": 1} and "attic" in nha2["rooms"] and nha2["places"].get("attic") and nha2["owned"].get("piano") == 1
   and st.load()["home"]["rooms"] == ["kitchen"], "giữ khoá / gian / món lạ của bản sau, bản này chỉ hiện gian mình biết")

print("== đồng bộ với bản cũ: vượt số đồ đã có → món ở gian bên về kho trước")
d2, st2 = fresh("over", owned={"plant": 2})
st2.open_room("bedroom")
st2.place("bedroom", "plant", 1, 1)
st2.place("room", "plant", 1, 1)
w = read(d2, "wallet.json")
w["home"]["room"].append({"id": "plant", "x": 5, "y": 2})        # máy khác (bản cũ) đặt thêm chậu cây "còn trong kho"
json.dump(w, open(os.path.join(d2, "wallet.json"), "w", encoding="utf-8"))
data = st2.load()
ok(len(data["home"]["room"]) == 2 and data["home"]["bedroom"] == [] and data["home"]["owned"]["plant"] == 2,
   "2 chậu ở phòng chính (1 do bản cũ) + 1 ở Phòng ngủ > 2 đã có → chậu ở Phòng ngủ về kho, không mất món nào")

OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
if not OLD:
    repo = os.path.abspath(os.path.join(HERE, "..", ".."))
    o = os.path.join(TMP, "old123")
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", repo, "archive", "ba0aa5a", "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
        OLD = os.path.join(o, "kotoba_batake")
    except Exception as e:      # không có git / commit
        print("  (bỏ qua phần mã 1.23 thật: %s)" % e)
if OLD:
    print("== mã 1.23 thật mở cùng dữ liệu (%s)" % ("git ba0aa5a" if "old123" in OLD else OLD))
    d3, st3 = fresh("old", owned={"plant": 2, "reizouko": 1})
    st3.open_room("kitchen")
    st3.place("kitchen", "plant", 0, 1)
    st3.place("kitchen", "reizouko", 3, 1)
    script = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
data = st.load()
h = data["home"]
out = {"has_kitchen": "kitchen" in h, "owned": h["owned"], "free_plant": h["owned"].get("plant", 0) - core.placed_count(h, "plant")}
st.place("room", "plant", 6, 2)       # bản cũ tưởng cả 2 chậu cây còn trong kho, đặt hết
st.place("room", "plant", 7, 2)
data = st.load(); data["coins"] += 7; st.save(data)
print(json.dumps(out))
'''
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(d3, "wallet.json")], capture_output=True, text=True)
    old = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {}
    ok(r.returncode == 0 and not old.get("has_kitchen") and "reizouko" not in old.get("owned", {}) and old.get("free_plant") == 2,
       "bản 1.23 không thấy Bếp / tủ lạnh; tưởng 2 chậu cây còn trong kho" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    data = st3.load()
    ok(data["home"]["rooms"] == ["kitchen"] and data["home"]["owned"].get("reizouko") == 1
       and [e["id"] for e in data["home"]["kitchen"]] == ["reizouko"],
       "về 1.24: Bếp và tủ lạnh còn nguyên sau khi bản 1.23 lưu")
    ok(data["home"]["owned"]["plant"] == 2 and [e["id"] for e in data["home"]["room"]] == ["plant", "plant"] and core.placed_count(data["home"], "plant") == 2,
       "bản cũ đặt cả 2 chậu ở phòng chính (vượt số đã có) → giữ 2 chậu đó, chậu ở Bếp về kho; vẫn đúng 2 chậu")
    ok(data["coins"] == 18007, "xu bản cũ cộng thêm vẫn còn (20.000 − 2.000 mở Bếp + 7)")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
