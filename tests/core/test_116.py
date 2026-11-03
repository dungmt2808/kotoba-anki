"""Test offline cho phần 1.16: 12 món hiếm mới của rương nhiệm vụ (danh mục, thứ tự nhận, hình có đủ, lưu ở SEASON_KEY,
bản cũ ở máy khác không xoá), cảnh nền tự vẽ của vùng tự tạo (lưu ở khoá riêng trong MORE_KEY, giá, bản 1.15 không xoá).

Chạy: python test_116.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_BẢN_1.15]
      (có bản 1.15 thì chạy cả vòng "máy khác còn bản cũ": bản cũ đọc + mua + lưu, bản mới đọc lại)
"""
import json, os, re, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else None
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core
import more_core as more

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


class FakeCol:
    def __init__(self, today=100, conf=None):
        self.conf = conf or {}
        self.sched = type("S", (), {"today": today})()

    def get_config(self, key, default=None):
        v = self.conf.get(key, default)
        return json.loads(json.dumps(v)) if v is not None else default

    def set_config(self, key, value):
        self.conf[key] = json.loads(json.dumps(value))


def state(col):
    return core.GardenState(os.path.join(tempfile.mkdtemp(), "state.json"), lambda: col)


NEW = list(core.RARE_116)
print("== món hiếm mới")
rare = [k for k, v in core.CATALOG.items() if v.get("rare")]
ok(len(rare) == 18 and len(NEW) == 12, f"18 món hiếm (6 cũ + 12 mới), có {len(rare)}")
ok(core.RARE_ORDER[:6] == ["koinobori", "daruma", "momiji", "furin", "tanuki", "kokeshi"], "6 món cũ vẫn nhận trước, đúng thứ tự cũ")
ok(sorted(core.RARE_ORDER) == sorted(rare) and len(set(core.RARE_ORDER)) == 18, "RARE_ORDER gồm đúng 18 món, không trùng")
ok(all(core.CATALOG[k]["price"] == 0 and core.CATALOG[k].get("desc") for k in NEW), "món mới không bán, có dòng mô tả")
yard = [k for k in NEW if core.CATALOG[k]["scene"] == "yard"]
room = [k for k in NEW if core.CATALOG[k]["scene"] == "room"]
ok(len(yard) == 7 and len(room) == 5, f"7 món ngoài sân, 5 món trong nhà ({len(yard)} / {len(room)})")
art = open(os.path.join(ADDON, "web", "rare_art.js"), encoding="utf-8").read()
ok(all(re.search(r"SPR\." + k + r"\s*=", art) for k in NEW), "rare_art.js có hình cho cả 12 món")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok(init.index("rare_art.js") < init.index("/home.js"), "rare_art.js nạp trước home.js")

print("== rương nhiệm vụ trao lần lượt cả 18 món, hết thì +100 xu")
data = state(FakeCol()).load()
got = []
for day in range(1, 21):
    data["quest"] = {"day": day, "list": [{"id": "a", "kind": "rev", "target": 1, "reward": 20, "text": "x"}],
                     "progress": {"rev": 1}, "done": [], "chest": False, "chest_item": None}
    res = core._settle_quests(data)
    got.append(res["chest"]["id"])
ok(got[:18] == core.RARE_ORDER, "18 ngày xong nhiệm vụ: nhận đủ 18 món theo RARE_ORDER")
ok(got[18] is None and got[19] is None, "ngày 19, 20: không còn món → rương cho thêm 100 xu")
ok(all(data["home"]["owned"].get(k) == 1 for k in rare), "mỗi món hiếm có 1 cái")

print("== lưu ở SEASON_KEY (bản 1.8–1.15 giữ hộ món lạ ở tầng này)")
col = FakeCol()
st = state(col)
d = st.load(); d["coins"] = 100; d["home"]["owned"].update({"shika": 1, "kabuto": 1, "yatai": 1}); d["home"]["house"] = 7
st.save(d)
st.place("yard", "shika", 6, 1); st.place("room", "kabuto", 2, 2); st.place("yard", "yatai", 9, 0)
sea = col.conf[core.SEASON_KEY]
ok(sea["owned"].get("shika") == 1 and sea["owned"].get("kabuto") == 1, "sở hữu món mới nằm ở SEASON_KEY")
ok({e["id"] for e in sea["places"].get("yard", [])} == {"shika", "yatai"} and sea["places"]["room"][0]["id"] == "kabuto",
   "chỗ đặt món mới nằm ở SEASON_KEY")
wallet, ext = col.conf.get(core.CONFIG_KEY) or {}, col.conf.get(core.EXT_KEY) or {}
ok(not any(k in json.dumps(wallet) or k in json.dumps(ext) for k in ("shika", "kabuto", "yatai")), "ví và EXT_KEY không có món mới")
d2 = state(col).load()
ok([e["id"] for e in d2["home"]["yard"] if e["id"] in NEW] == ["shika", "yatai"] and d2["home"]["owned"]["kabuto"] == 1,
   "đọc lại: món mới còn đủ, đúng chỗ")

print("== cảnh nền tự vẽ của vùng tự tạo")
col = FakeCol(conf={})
st = state(col)
d = st.load(); d["coins"] = 6000; st.save(d)
W, H = more.ENV_W, more.ENV_H
env = more.px_encode("." * (W * 40) + "g" * (W * (H - 40)))
d = st.zone_save({"name": "Đồi của tớ", "bg": "meadow", "ground": more.UZONE_GROUND[0], "hills": more.UZONE_HILLS[0], "px": "", "env": env})
zid = d["zone_id"]
ok(d["coins"] == 1000, "tạo vùng có cảnh nền: vẫn 5.000 xu")
stored = col.conf[more.MORE_KEY]
ok(stored.get("zenv", {}).get(zid) == env and "env" not in json.dumps(stored.get("zones")), "cảnh nền lưu ở khoá riêng zenv (không nằm trong zones)")
view = [z for z in more.catalog_view()["uzone"].keys()]
ok(more.catalog_view()["uzone"].get("env_w") == W and more.catalog_view()["uzone"].get("env_h") == H, f"danh mục báo cỡ cảnh nền {W}×{H}")
d = st.load()
z = [z for z in d["more"]["zones"] if z["id"] == zid][0]
ok(z.get("env") == env, "đọc lại: cảnh nền gắn vào vùng")
c0 = d["coins"]
d = st.zone_save({"id": zid, "name": "Đồi của tớ", "bg": "lake", "ground": z["ground"], "hills": z["hills"], "px": z["lm"], "env": env})
ok(d["coins"] == c0, "đổi nền có sẵn, giữ cảnh nền: miễn phí")
env2 = more.px_encode("." * (W * 30) + "b" * (W * (H - 30)))
d = st.zone_save({"id": zid, "name": "Đồi của tớ", "bg": "lake", "ground": z["ground"], "hills": z["hills"], "px": z["lm"], "env": env2})
ok(d["coins"] == c0 - more.UZONE_EDIT, f"vẽ lại cảnh nền: {more.UZONE_EDIT} xu")
bad = None
try:
    st.zone_save({"id": zid, "name": "x", "bg": "lake", "ground": z["ground"], "hills": z["hills"], "px": z["lm"], "env": "9999q"})
except core.HomeError as err:
    bad = str(err)
ok(bool(bad), "cảnh nền hỏng / màu lạ → báo lỗi, không lưu (" + str(bad) + ")")
d = st.zone_save({"id": zid, "name": "Đồi của tớ", "bg": "lake", "ground": z["ground"], "hills": z["hills"], "px": z["lm"], "env": ""})
ok(zid not in (col.conf[more.MORE_KEY].get("zenv") or {}), "xoá trắng cảnh nền → bỏ khỏi zenv")
d = st.zone_save({"id": zid, "name": "Đồi của tớ", "bg": "lake", "ground": z["ground"], "hills": z["hills"], "px": z["lm"], "env": env})
st.zone_delete(zid)
ok(zid not in (col.conf[more.MORE_KEY].get("zenv") or {}), "xoá vùng → xoá luôn cảnh nền")

if OLD:
    print("== máy khác còn bản 1.15: đọc, mua, lưu → bản mới đọc lại không mất gì")
    col = FakeCol()
    st = state(col)
    d = st.load(); d["coins"] = 9000; d["home"]["house"] = 7; d["home"]["owned"].update({"shika": 1, "koto": 1}); st.save(d)
    st.place("yard", "shika", 6, 1); st.place("room", "koto", 1, 3)
    d = st.load(); d["coins"] = 9000; st.save(d)
    d = st.zone_save({"name": "Hồ", "bg": "lake", "ground": more.UZONE_GROUND[0], "hills": more.UZONE_HILLS[0], "px": "", "env": env})
    zid = d["zone_id"]
    script = r'''
import json, os, sys, tempfile
sys.path.insert(0, sys.argv[1])
sys.path.insert(1, sys.argv[2])
import garden_core as core
conf = json.load(open(sys.argv[3]))
class C:
    def __init__(s): s.conf = conf; s.sched = type("S", (), {"today": 101})()
    def get_config(s, k, d=None): v = s.conf.get(k, d); return json.loads(json.dumps(v)) if v is not None else d
    def set_config(s, k, v): s.conf[k] = json.loads(json.dumps(v))
col = C()
st = core.GardenState(os.path.join(tempfile.mkdtemp(), "state.json"), lambda: col)
d = st.load()
seen = sorted(k for k in d["home"]["owned"] if k in ("shika", "koto"))
st.buy("fence"); st.place("yard", "fence", 4, 0)
d = st.load(); z = d["more"]["zones"][0]
st.zone_save({"id": z["id"], "name": "Hồ (máy cũ)", "bg": z["bg"], "ground": z["ground"], "hills": z["hills"], "px": z["lm"]})
json.dump({"conf": col.conf, "seen": seen}, open(sys.argv[3], "w"))
'''
    tmp = tempfile.mktemp(suffix=".json")
    json.dump(col.conf, open(tmp, "w"))
    r = subprocess.run([sys.executable, "-c", script, OLD, os.path.join(HERE, "..", "stubs"), tmp], capture_output=True, text=True)
    ok(r.returncode == 0, "bản 1.15 chạy được trên dữ liệu của bản mới" + (": " + r.stderr[-300:] if r.returncode else ""))
    if r.returncode == 0:
        back = json.load(open(tmp))
        ok(back["seen"] == [], "bản 1.15 không thấy 2 món mới (không hiện, không lỗi)")
        col2 = FakeCol(conf=back["conf"])
        d = state(col2).load()
        ok(d["home"]["owned"].get("shika") == 1 and d["home"]["owned"].get("koto") == 1, "bản mới đọc lại: vẫn có Hươu Nara + Đàn koto")
        ok(any(e["id"] == "shika" and (e["x"], e["y"]) == (6, 1) for e in d["home"]["yard"])
           and any(e["id"] == "koto" for e in d["home"]["room"]), "món mới vẫn ở đúng chỗ đã đặt")
        ok(any(e["id"] == "fence" for e in d["home"]["yard"]), "món bản cũ vừa mua cũng có")
        z = [z for z in d["more"]["zones"] if z["id"] == zid][0]
        ok(z["name"] == "Hồ (máy cũ)" and z.get("env") == env, "bản cũ đổi tên vùng → bản mới vẫn còn cảnh nền tự vẽ")

print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else f"{len(FAIL)} LỖI"))
sys.exit(1 if FAIL else 0)
