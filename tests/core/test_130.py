"""Test offline 1.30 (python thường + node): tường & sàn từng gian (decor_core), sinh hoạt của StackChan (life_core), phần ví.

- Danh mục tường / sàn: 12 + 9 mẫu, id đúng dạng, giá > 0, mọi mẫu có hình trong web/nha_art.js (DECO), không thừa hình.
- clean(): dữ liệu rác / sai kiểu không hỏng, id của bản mới hơn được giữ, mẫu sai chỗ (tường ↔ sàn) bị bỏ, tối đa 12 mẫu tự vẽ.
- Ví: mua (thiếu xu, nhà chưa có cửa, mua trùng, id lạ), dùng (gian chưa mở, sai chỗ, chưa có, về Theo kiểu nhà), mẫu tự vẽ
  (tạo 250 xu, vẽ lại 50 xu, đổi tên miễn phí, hình trống / hỏng / màu lạ, đổi loại, đủ 12, xoá → gian về kiểu nhà); lưu ở
  khoá "decor" của MORE_KEY + điểm ảnh ở PX_KEY; mã 1.28 thật (git) đọc + lưu ví → về 1.30 mẫu / gian đang dùng còn nguyên.
- Danh mục sinh hoạt: mỗi việc có câu Nhật + kana + nghĩa, giờ hợp lệ, món cần có trong CATALOG, tư thế / đồ cầm tay có hình
  trong web/life.js, mỗi vùng ≥ 3 việc và có việc không cần đồ, nhóm trong sổ.
- can_do / doable: đồ đã đặt, gian / vùng đã mở, tháng, thú nuôi; open_scenes; hint.
- Sổ (LifeStore): lần đầu, cùng ngày không ghi lại, hôm sau +1 ngày, dữ liệu hỏng, khoá / việc lạ của bản sau giữ nguyên.
- Lịch cả ngày: giờ nào cũng có việc khi nhà đủ đồ; 22:30–5:30 có giường thì chỉ có "Ngủ".

Chạy: python test_130.py THƯ_MỤC_ADD_ON [THƯ_MỤC_1.28]
"""
import datetime as dt
import json, os, re, shutil, subprocess, sys, tempfile

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
import life_core as L

D = core.decor
FAIL = []
TMP = tempfile.mkdtemp(prefix="kb130_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def err(fn, *a):
    try:
        fn(*a)
    except (core.HomeError, D.DecorError, more_core.MoreError) as e:
        return str(e)
    return ""


def src(name):
    with open(os.path.join(ADDON, name), encoding="utf-8") as f:
        return f.read()


def new_state(name, coins=50000, level=7, rooms=True):
    st = core.GardenState(os.path.join(TMP, name, "state.json"))
    d = st.load(); d["coins"] = coins; st.save(d)
    for _ in range(level):
        st.build()
    if rooms:
        st.open_rooms()
    return st


PAL = core.CRAFT_PALETTE
TILE_A = more_core.px_encode(("k." * 8 + ".k" * 8) * 8)
TILE_B = more_core.px_encode(("rr.." * 4) * 16)

print("== danh mục tường / sàn")
ok(len(D.WALLS) == 12 and len(D.FLOORS) == 9, "12 giấy dán tường + 9 sàn")
ok(all(D.ID_RE.match(k) and k[0] == "w" for k in D.WALLS) and all(D.ID_RE.match(k) and k[0] == "f" for k in D.FLOORS), "id w_… / f_…")
ok(all(v["name"] and 100 <= v["price"] <= 600 and v.get("desc") for v in D.PRESETS.values()), "mỗi mẫu có tên, mô tả, giá 100–600 xu")
ok(len({v["name"] for v in D.PRESETS.values()}) == len(D.PRESETS), "tên mẫu không trùng nhau")
art = src("web/nha_art.js")
deco_ids = set(re.findall(r"^      ([wf]_[a-z0-9]+): function", art, re.M))
ok(deco_ids == set(D.PRESETS), "mọi mẫu có hình trong nha_art.js, không thừa hình (%s)" % ",".join(sorted(deco_ids ^ set(D.PRESETS))))
cat = D.catalog_view()
ok([w["id"] for w in cat["walls"]] == list(D.WALLS) and cat["tile"] == {"price": 250, "edit": 50, "max": 12, "w": 16}, "catalog_view giữ thứ tự + giá mẫu tự vẽ")

print("== clean(): dữ liệu rác")
for bad in (None, 3, "x", [], {"own": 5, "use": [], "mine": "?"}, {"own": [1, None, {"a": 1}], "use": {"room": 7, "kitchen": {"wall": ["w_kem"]}},
            "mine": {"items": {"t1": 5, "zz": {"kind": "wall"}, "t2": {"kind": "roof"}}, "next": "9"}}):
    c = D.clean(bad)
    ok(c == D.empty(), "rác %r → trống" % (bad if not isinstance(bad, dict) else list(bad)))
c = D.clean({"own": ["w_kem", "w_kem", "f_soi", "w_moi2027", "x_abc", "W_KEM"], "use": {"room": {"wall": "w_kem", "floor": "w_kem"},
             "kitchen": {"wall": "w_moi2027", "floor": "f_occho"}, "bedroom": {"wall": "t1", "floor": "t1"}, "attic": {"wall": "w_kem"}},
             "mine": {"items": {"t1": {"name": "<b>Sọc</b>\x00", "kind": "floor"}}, "next": 1}})
ok(c["own"] == ["w_kem", "f_soi", "w_moi2027"], "own: bỏ trùng / id sai dạng, giữ id của bản mới hơn")
ok(c["use"]["room"] == {"wall": "w_kem"}, "mẫu tường không dùng được cho sàn")
ok(c["use"]["kitchen"] == {"wall": "w_moi2027"}, "gian dùng mẫu của bản mới hơn: giữ nguyên; sàn chưa mua: bỏ")
ok(c["use"]["bedroom"] == {"floor": "t1"} and "attic" not in c["use"], "mẫu tự vẽ chỉ đúng loại; gian lạ bị bỏ")
ok(c["mine"]["items"]["t1"]["name"] == "bSọc/b" and c["mine"]["next"] == 2, "tên mẫu được làm sạch, next ≥ id lớn nhất + 1")
many = {"mine": {"items": {"t%d" % i: {"name": "m", "kind": "wall"} for i in range(1, 30)}}}
ok(len(D.clean(many)["mine"]["items"]) == D.TILE_MAX, "tối đa %d mẫu tự vẽ" % D.TILE_MAX)

print("== ví: mua + dùng")
st = new_state("a")
c0 = st.load()["coins"]
d = st.decor_buy("w_sakura")
ok(d["coins"] == c0 - D.WALLS["w_sakura"]["price"] and d["more"]["decor"]["own"] == ["w_sakura"], "mua Cánh anh đào: trừ đúng giá")
ok("đã có" in err(st.decor_buy, "w_sakura") and st.load()["coins"] == d["coins"], "mua trùng: báo đã có, không trừ lần hai")
ok("Không có" in err(st.decor_buy, "w_khongco") and "Không có" in err(st.decor_buy, "bench"), "id lạ / id món đồ: từ chối")
st.decor_use("room", "wall", "w_sakura")
ok(st.load()["more"]["decor"]["use"]["room"] == {"wall": "w_sakura"}, "dùng cho phòng chính")
ok("dành cho" in err(st.decor_use, "room", "floor", "w_sakura"), "mẫu tường cho sàn: từ chối, nói rõ")
ok("Chưa có" in err(st.decor_use, "room", "floor", "f_tatami"), "chưa mua: từ chối")
ok("Không có gian" in err(st.decor_use, "attic", "wall", "w_sakura") and "Không có gian" in err(st.decor_use, "room", "roof", "w_sakura"), "gian / chỗ lạ: từ chối")
st.decor_buy("f_tatami"); st.decor_use("kitchen", "floor", "f_tatami"); st.decor_use("bedroom", "wall", "w_sakura")
u = st.load()["more"]["decor"]["use"]
ok(u == {"room": {"wall": "w_sakura"}, "kitchen": {"floor": "f_tatami"}, "bedroom": {"wall": "w_sakura"}}, "một mẫu dùng cho nhiều gian")
c1 = st.load()["coins"]
st.decor_use("room", "wall", "none"); st.decor_use("kitchen", "floor", "")
ok(st.load()["more"]["decor"]["use"]["room"] == {} and st.load()["more"]["decor"]["use"]["kitchen"] == {} and st.load()["coins"] == c1,
   "về Theo kiểu nhà (\"none\" / trống), đổi qua lại không mất xu")
ok(st.load()["more"]["decor"]["own"] == ["w_sakura", "f_tatami"], "về kiểu nhà vẫn giữ mẫu đã mua")
poor = new_state("poor", coins=3430 + 2000 + 100)
ok("Chưa đủ xu" in err(poor.decor_buy, "w_sakura") and poor.load()["more"]["decor"]["own"] == [], "thiếu xu: không mua")
low = new_state("low", level=4, rooms=False)
ok("Lắp cửa" in err(low.decor_buy, "w_kem") and "Lắp cửa" in err(low.decor_use, "room", "wall", "none") and "Lắp cửa" in err(low.tile_save, {"kind": "wall", "px": TILE_A}),
   "nhà chưa có cửa: chưa mua / dùng / vẽ được")
noroom = new_state("noroom", rooms=False)
noroom.decor_buy("w_kem")
ok("Mở rộng nhà" in err(noroom.decor_use, "kitchen", "wall", "w_kem") and err(noroom.decor_use, "room", "wall", "w_kem") == "", "gian chưa mở: chỉ trang trí được phòng chính")

print("== ví: mẫu tự vẽ")
c2 = st.load()["coins"]
r = st.tile_save({"name": "Caro đen", "kind": "floor", "px": TILE_A})
ok(r["tile_id"] == "t1" and r["coins"] == c2 - D.TILE_PRICE and st.load_px()["t1"] == TILE_A, "tạo mẫu sàn: −250 xu, điểm ảnh ở PX_KEY")
ok(core.home_catalog(st.load(), st.load_px())["tiles"] == [{"id": "t1", "name": "Caro đen", "kind": "floor", "px": TILE_A}], "catalog.tiles gửi JS")
st.decor_use("room", "floor", "t1")
ok("dành cho" in err(st.decor_use, "room", "wall", "t1"), "mẫu sàn tự vẽ không dán lên tường")
r = st.tile_save({"id": "t1", "name": "Caro mới", "kind": "floor", "px": TILE_A})
ok(r["coins"] == c2 - D.TILE_PRICE and st.load()["more"]["decor"]["mine"]["items"]["t1"]["name"] == "Caro mới", "chỉ đổi tên: miễn phí")
r = st.tile_save({"id": "t1", "name": "Caro mới", "kind": "floor", "px": TILE_B})
ok(r["coins"] == c2 - D.TILE_PRICE - D.TILE_EDIT and st.load_px()["t1"] == TILE_B, "vẽ lại: −50 xu")
ok("Không đổi được" in err(st.tile_save, {"id": "t1", "name": "x", "kind": "wall", "px": TILE_B}), "không đổi mẫu sàn thành mẫu tường")
ok("Không tìm thấy" in err(st.tile_save, {"id": "t9", "name": "x", "kind": "wall", "px": TILE_B}), "sửa mẫu không có: từ chối")
for bad, why in ((more_core.px_encode("." * 256), "trống"), ("999k", "sai cỡ"), ("256?", "màu lạ"), (None, "thiếu"), (12, "sai kiểu")):
    ok(err(st.tile_save, {"name": "x", "kind": "wall", "px": bad}) != "", "hình %s: từ chối" % why)
ok(err(st.tile_save, {"name": "x", "kind": "roof", "px": TILE_A}) != "" and err(st.tile_save, "abc") != "", "loại lạ / payload sai kiểu: từ chối")
c3 = st.load()["coins"]
ok(st.load()["coins"] == c3 and len(st.load()["more"]["decor"]["mine"]["items"]) == 1, "các lần từ chối không trừ xu, không tạo mẫu")
for i in range(D.TILE_MAX - 1):
    st.tile_save({"name": "m%d" % i, "kind": "wall", "px": TILE_A})
ok(len(st.load()["more"]["decor"]["mine"]["items"]) == D.TILE_MAX and "xoá bớt" in err(st.tile_save, {"name": "x", "kind": "wall", "px": TILE_A}),
   "đủ %d mẫu: không tạo thêm" % D.TILE_MAX)
st.decor_use("bedroom", "wall", "t2")
st.tile_delete("t1"); st.tile_delete("t2")
dd = st.load()["more"]["decor"]
ok("t1" not in dd["mine"]["items"] and dd["use"]["room"] == {} and dd["use"]["bedroom"] == {} and "t1" not in st.load_px(),
   "xoá mẫu: gian đang dùng về Theo kiểu nhà, điểm ảnh bị xoá")
ok("Không tìm thấy" in err(st.tile_delete, "t1") and "Không tìm thấy" in err(st.tile_delete, "w_sakura"), "xoá mẫu không có / mẫu mua: từ chối")
r = st.tile_save({"name": "Lại", "kind": "wall", "px": TILE_A})
ok(r["tile_id"] not in ("t1", "t2"), "id mẫu đã xoá không dùng lại (%s)" % r["tile_id"])

print("== lưu ở MORE_KEY, bản cũ giữ hộ")
st.decor_use("room", "wall", "w_sakura")
raw = json.load(open(os.path.join(TMP, "a", "more.json"), encoding="utf-8"))
ok("decor" in raw and raw["decor"]["use"]["room"] == {"wall": "w_sakura"}, "khoá \"decor\" ở tầng trên cùng của MORE_KEY")
wal = json.load(open(os.path.join(TMP, "a", "state.json"), encoding="utf-8"))
ok("decor" not in json.dumps(wal), "ví (CONFIG_KEY) không lẫn dữ liệu tường / sàn")
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
if not OLD:
    repo = os.path.abspath(os.path.join(HERE, "..", ".."))
    o = os.path.join(TMP, "old128")
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", repo, "archive", "59e43c5", "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
        OLD = os.path.join(o, "kotoba_batake")
    except Exception as e:      # không có git / commit
        print("  (bỏ qua phần mã 1.28 thật: %s)" % e)
if OLD:
    before = st.load()
    script = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
data = st.load(); data["coins"] += 11; st.save(data)
st.buy("bench"); st.place("yard", "bench", 9, 2)
px = st.load_px(); st.save_px(px)
print(json.dumps({"decor": hasattr(core, "decor"), "coins": st.load()["coins"]}))
'''
    r = subprocess.run([sys.executable, "-c", script, OLD, STUBS, os.path.join(TMP, "a", "state.json")], capture_output=True, text=True)
    out = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else {}
    ok(r.returncode == 0 and out.get("decor") is False, "mã 1.28 thật chạy trên ví 1.30" + ("" if r.returncode == 0 else ": " + r.stderr[-300:]))
    after = st.load()
    ok(after["more"]["decor"] == before["more"]["decor"], "về 1.30 sau khi 1.28 lưu: mẫu đã mua / tự vẽ / gian đang dùng còn nguyên")
    ok(set(k for k in st.load_px() if k.startswith("t")) == set(before["more"]["decor"]["mine"]["items"]), "điểm ảnh mẫu tự vẽ còn nguyên sau khi 1.28 ghi PX_KEY")
    ok(after["coins"] == before["coins"] + 11 - core.CATALOG["bench"]["price"], "xu khớp với thao tác của bản cũ")

print("== danh mục sinh hoạt")
ok(len(L.ACTS) >= 60, "%d việc" % len(L.ACTS))
ok(all(a["name"] and a["ja"] and a["kana"] and a["vi"] for a in L.ACTS.values()), "mỗi việc có tên Việt, câu Nhật, cách đọc, nghĩa")
ok(all(re.fullmatch(r"[぀-ヿー]+", a["kana"]) for a in L.ACTS.values()), "cách đọc chỉ có kana")
ok(all(re.search(r"[぀-ヿ一-鿿]", a["ja"]) and not re.search(r"[A-Za-z]", a["ja"]) for a in L.ACTS.values()), "câu Nhật không có romaji")
ok(len({a["name"] for a in L.ACTS.values()}) == len(L.ACTS) and len({a["ja"] for a in L.ACTS.values()}) == len(L.ACTS), "tên / câu Nhật không trùng nhau")
bad_h = [k for k, a in L.ACTS.items() if not a["hours"] or any(not (0 <= h0 < h1 <= 24) for h0, h1 in a["hours"])]
ok(not bad_h, "giờ hợp lệ 0 ≤ từ < đến ≤ 24" + (" — sai: " + ",".join(bad_h) if bad_h else ""))
bad_n = sorted({i for a in L.ACTS.values() for i in a.get("need", ()) if i not in core.CATALOG})
ok(not bad_n, "món cần đều có trong CATALOG" + (" — lạ: " + ",".join(bad_n) if bad_n else ""))
bad_s = [k for k, a in L.ACTS.items() for i in a.get("need", ()) if (core.CATALOG[i]["scene"] == "room") != (a["where"] == "home")]
ok(not bad_s, "việc trong nhà cần đồ trong nhà, việc ngoài trời cần đồ ngoài trời" + (" — sai: " + ",".join(bad_s) if bad_s else ""))
ok(all(not a.get("months") or all(1 <= m <= 12 for m in a["months"]) for a in L.ACTS.values()), "tháng 1–12")
js = src("web/life.js")
props = set(re.findall(r"^    ([a-z0-9]+): \(g, h", js, re.M))
used = {a["prop"] for a in L.ACTS.values() if a.get("prop")} - {"towel", "ring"}
ok(used <= props, "đồ cầm tay đều có hình trong life.js" + (" — thiếu: " + ",".join(sorted(used - props)) if used - props else ""))
for z in L.ZONES:
    lst = [k for k, a in L.ACTS.items() if a["where"] == z]
    ok(len(lst) >= 3 and any(not L.ACTS[k].get("need") and not L.ACTS[k].get("months") for k in lst),
       "%s: %d việc, có việc không cần mua thêm đồ" % (z, len(lst)))
ok(sum(1 for a in L.ACTS.values() if a["where"] == "home") >= 25, "trong nhà nhiều việc nhất (ưu tiên trong nhà)")
ok({g for g, _n in L.GROUPS} == {L.group_of(k) for k in L.ACTS}, "nhóm trong sổ khớp danh mục")
ok(L.ACTS["onsen"]["name"] == "Tắm suối nước nóng" and L.ACTS["oyogu"]["name"] == "Tắm biển", "có Tắm suối nước nóng + Tắm biển (ví dụ người dùng nêu)")

print("== can_do / doable")
home = st.load()["home"]
SC = L.open_scenes(home, core.ROOM_UNLOCK_LEVEL)
ok(SC == ["yard", "room", "kitchen", "bedroom"], "cảnh tới được: sân + 3 gian (%s)" % ",".join(SC))
T = dt.date(2026, 11, 13)
ok(not L.can_do("neru", "bedroom", home, SC, T), "chưa có giường: chưa ngủ được")
st.buy("beddo"); st.place("bedroom", "beddo", 1, 2)
home = st.load()["home"]
ok(L.can_do("neru", "bedroom", home, SC, T) and not L.can_do("neru", "room", home, SC, T) and not L.can_do("neru", "yard", home, SC, T),
   "đặt giường ở Phòng ngủ: ngủ ở Phòng ngủ, không phải gian khác")
ok(L.can_do("souji", "room", home, SC, T) and L.can_do("mado", "kitchen", home, SC, T), "việc không cần đồ: làm được ngay")
ok(not L.can_do("oyogu", "beach", home, SC, T), "chưa mở Bãi biển: không bơi")
ok(not L.can_do("kotatsu", "room", home, SC, dt.date(2026, 7, 1)), "tháng 7 không ngồi bàn sưởi")
ok(not L.can_do("asobu", "room", home, SC, T) and L.can_do("asobu", "room", home, SC, T, True), "chơi với thú cưng cần thú đang ở trong nhà")
ok(not L.can_do("khongco", "room", home, SC, T) and not L.can_do("neru", "../x", home, SC, T) and not L.can_do("neru", None, home, SC, T), "việc / cảnh lạ: không")
for z in core.ZONE_IDS:
    st.unlock_zone(z)
home = st.load()["home"]
SC = L.open_scenes(home, core.ROOM_UNLOCK_LEVEL)
ok(L.can_do("oyogu", "beach", home, SC, T) and L.can_do("onsen", "onsen", home, SC, T) and L.can_do("omairi", "shrine", home, SC, T),
   "mở vùng là có việc đặc trưng ngay (bơi, tắm suối, viếng đền) — không cần mua thêm đồ")
can = L.doable(home, SC, T)
ok(all(len(can.get(z, [])) >= 2 for z in core.ZONE_IDS), "vùng nào cũng có ≥ 2 việc khi vừa mở")
ok(L.open_scenes({"house": "x", "zones": 5, "rooms": None}, 5) == ["yard"] and L.open_scenes(None, 5) == ["yard"], "nhà sai kiểu: chỉ còn sân, không ném lỗi")
ok(L.open_scenes({"house": 7, "uzones": ["u1", "u99x", 4]}, 5) == ["yard", "room", "u1"], "vùng tự tạo hợp lệ được tính")
st.buy("ashiyu") if False else None
ok(L.scene_ok("ashiyu", "u1") and L.scene_ok("ashiyu", "beach") and not L.scene_ok("ashiyu", "room"), "việc \"out\": mọi cảnh ngoài trời, cả vùng tự tạo")
names = {k: v["name"] for k, v in core.CATALOG.items()}
ok(L.hint("neru", names) == "22:30–5:30 · cần Giường + chăn đệm / Nệm futon", "gợi ý Ngủ: %s" % L.hint("neru", names))
ok("khi trời mưa" in L.hint("ame") and "tháng 3, 4" in L.hint("hanami", names) and "thú nuôi" in L.hint("asobu"), "gợi ý ghi thời tiết / tháng / thú nuôi")

print("== lịch cả ngày (đủ đồ)")
for sc, iid, x, y in [("kitchen", "nagashi", 2, 1), ("kitchen", "shokutaku", 3, 3), ("kitchen", "suihanki", 5, 1), ("room", "desk", 2, 1),
                      ("room", "shelf", 0, 1), ("room", "tea", 6, 1), ("room", "plant", 9, 1), ("room", "tv", 7, 1)]:
    st.buy(iid); st.place(sc, iid, x, y)
home = st.load()["home"]
can = L.doable(home, SC, T)


def at_hour(h, wet=False):
    out = []
    for sc, ids in can.items():
        for aid in ids:
            a = L.ACTS[aid]
            if any(h0 <= h < h1 for h0, h1 in a["hours"]) and (a.get("wx", "any") in ("any", "nosnow") or (a.get("wx") == "dry" and not wet) or (a.get("wx") == "rain" and wet)):
                out.append(aid)
    return out


empty = [h / 2 for h in range(48) if not at_hour(h / 2)]
ok(not empty, "giờ nào trong ngày cũng có việc" + (" — trống: " + ",".join(map(str, empty)) if empty else ""))
night = {aid for h in (22.5, 23, 0, 2, 4, 5) for aid in at_hour(h) if L.ACTS[aid]["where"] == "home"}
ok(night == {"neru"}, "22:30–5:30 trong nhà chỉ có Ngủ (%s)" % ",".join(sorted(night)))
ok("ryouri" in at_hour(7) and "taberu" in at_hour(7.5) and "ryouri" in at_hour(18) and "ocha" in at_hour(8) and "hon" in at_hour(20),
   "sáng nấu ăn + pha trà, tối nấu ăn + đọc sách")
ok("ame" in at_hour(15, True) and "ame" not in at_hour(15) and "oyogu" not in at_hour(12, True), "trời mưa: nghe mưa, không tắm biển")

print("== sổ Sinh hoạt (LifeStore)")
p = os.path.join(TMP, "life", "life.json")
ls = L.LifeStore(p)
seen, new, wrote = ls.mark("ocha", "kitchen", T)
ok(new and wrote and seen["ocha"] == {"d": "2026-11-13", "s": "kitchen", "l": "2026-11-13", "n": 1}, "lần đầu: ghi ngày + cảnh")
seen, new, wrote = ls.mark("ocha", "room", T)
ok(not new and not wrote and seen["ocha"]["s"] == "kitchen", "cùng ngày: không ghi lại")
seen, new, wrote = ls.mark("ocha", "room", T + dt.timedelta(days=1))
ok(not new and wrote and seen["ocha"]["n"] == 2 and seen["ocha"]["d"] == "2026-11-13" and seen["ocha"]["l"] == "2026-11-14", "hôm sau: +1 ngày, giữ ngày đầu")
seen, new, wrote = ls.mark("ocha", "room", T)
ok(not wrote, "ngày lùi lại (đổi đồng hồ): không ghi")
raw = json.load(open(p, encoding="utf-8"))
raw["seen"]["vieccuabansau"] = {"d": "2027-01-01", "n": 3}
raw["seen"]["neru"] = "hỏng"; raw["seen"]["hon"] = {"d": "13/11/2026"}; raw["seen"]["ocha"]["x2"] = 9; raw["moi"] = {"a": 1}
json.dump(raw, open(p, "w", encoding="utf-8"))
ok(set(ls.seen()) == {"ocha"}, "bản ghi hỏng / việc lạ không vào sổ đang đọc")
ls.mark("hon", "room", T)
raw = json.load(open(p, encoding="utf-8"))
ok(raw["moi"] == {"a": 1} and raw["seen"]["vieccuabansau"] == {"d": "2027-01-01", "n": 3} and raw["seen"]["ocha"]["x2"] == 9 and raw["seen"]["hon"]["d"] == "2026-11-13",
   "ghi: giữ khoá / việc lạ của bản sau, bản ghi hỏng được thay")
for bad in (None, 7, "x", {"seen": []}, {"seen": {"ocha": {"d": "2026-02-30"}}}, {"seen": {"ocha": {"d": "2026-11-13", "n": True, "s": "../../x", "l": "2020-01-01"}}}):
    cs = L.clean_seen(bad)
    ok(cs == {} or cs == {"ocha": {"d": "2026-11-13", "s": "room", "l": "2026-11-13", "n": 1}}, "clean_seen(%r) an toàn" % (bad if not isinstance(bad, dict) else "dict"))
v = L.view(ls.seen(), home, SC, T, False, names)
ok(v["total"] == len(L.ACTS) and v["seen"] == 2 and sum(g["total"] for g in v["groups"]) == v["total"], "view: tổng khớp danh mục, đã thấy 2")
ok([g["id"] for g in v["groups"]] == [g for g, _n in L.GROUPS] and all(g["open"] for g in v["groups"]), "8 nhóm theo thứ tự, vùng đã mở")
ok(set(v["defs"]) == set(L.ACTS) and all(k in v["defs"]["neru"] for k in ("name", "ja", "kana", "vi", "where", "need", "hours", "wx", "w", "pose", "prop", "at", "pet")),
   "defs gửi JS đủ trường")
ok(json.loads(json.dumps(v)) == v, "view là JSON thuần")
nb = L.new_between(ls.seen(), T, T)
ok([x["id"] for x in nb] == ["ocha", "hon"] and nb[0]["ja"] == "お茶を入れる", "new_between cho Lịch hoa (theo thứ tự sổ)")


class FakeCol:
    def __init__(self):
        self.conf = {}

    def get_config(self, k, d=None):
        return self.conf.get(k, d)

    def set_config(self, k, v):
        self.conf[k] = json.loads(json.dumps(v))


col = FakeCol()
lc = L.LifeStore(os.path.join(TMP, "life2", "life.json"), lambda: col)
lc.mark("neru", "bedroom", T)
ok(col.conf[L.LIFE_KEY]["seen"]["neru"]["d"] == "2026-11-13" and os.path.exists(os.path.join(TMP, "life2", "life.json")), "có collection: ghi khoá kotoba_batake_life + file sao lưu")
col.conf[L.LIFE_KEY] = "hỏng"
ok(lc.seen() == {} and lc.mark("neru", "bedroom", T)[1], "khoá collection hỏng: coi như sổ trống, ghi lại được")

print("== tham số sai kiểu từ trang (kịch bản bấm bừa e2e_fuzz.js tìm ra: home:seed:rule:null làm Anki bật hộp lỗi)")
stj = new_state("junk")
JUNK = [None, 0, -1, 3.5, True, "", "x", "ことば", [], [1], {}, {"a": 1}, "A" * 3000, float("nan"), 10 ** 30, ["a", {}], {"id": []}]
la = {}


def junk(name, fn, *a):
    try:
        fn(*a)
    except (core.HomeError, ValueError, OSError):       # ba loại cầu nối đã bắt → báo nhẹ, không hộp lỗi
        pass
    except Exception as e:                              # noqa: BLE001 — chính là thứ cần tìm
        la.setdefault((name, type(e).__name__), repr(a)[:90])


for j in JUNK:
    for name in ("zone_save", "myseed_save", "tile_save", "craft_save"):
        junk(name, getattr(stj, name), j)
    for k in ("name", "kind", "px", "id", "size", "fx", "st", "bg", "ground", "hills", "env", "lm"):
        base = {"name": "A", "kind": "wall", "px": "128k128.", "size": 16, "fx": "none", "st": ["128k128.", "", "", "", ""],
                "bg": "meadow", "ground": "#5ed35e", "hills": "#7ed98a"}
        base[k] = j
        for name in ("zone_save", "myseed_save", "tile_save", "craft_save"):
            junk(name + "{" + k + "}", getattr(stj, name), dict(base))
    for j2 in JUNK:
        junk("pet_name", stj.pet_name, str(j), j2)
        junk("decor_use", stj.decor_use, "room", str(j), str(j2))
        for w in ("deck", "kind", "tag", "x"):
            junk("seed_rule", stj.seed_rule, w, j, j2)
ok(not la, "hàm ví nhận JSON từ trang: dữ liệu sai kiểu chỉ ra HomeError / ValueError" + ("" if not la else " — lạ: " + json.dumps({"%s:%s" % k: v for k, v in la.items()}, ensure_ascii=False)[:400]))
init0 = src("__init__.py")
ok("def _json_obj(" in init0 and init0.count("_json_obj(") >= 11, "cầu nối đọc tham số JSON qua _json_obj (không phải đối tượng → ValueError đã bắt)")
weak = re.findall(r"= json\.loads\([^\n]*\)\n[^\n]*\b(?:payload0?|p)\.get\(", init0)
ok(not weak, "không còn chỗ json.loads rồi .get ngay mà chưa kiểm kiểu" + ("" if not weak else ": " + weak[0][:80]))

print("== nối dây")
init = src("__init__.py")
ok('f"{WEB_BASE}/life.js"' in init and init.index("life.js") < init.index('f"{WEB_BASE}/home.js"'), "life.js nạp trước home.js")
ok('cmd.startswith("life:")' in init and "life_core.can_do(aid, scene" in init, "life:seen đi qua can_do trước khi ghi sổ")
ok('parts[0] == "decor" and len(parts) == 3 and parts[1] == "buy"' in init and 'cmd.startswith("tile:")' in init, "lệnh home:decor:* / craft:tile")
ok('data["life"] = life_view(data["wallet"])' in init, "refresh gửi data.life")
home_js = src("web/home.js")
ok("decoOf(\"room\", opts)" in home_js and "decoOf(kind, opts)" in home_js and "if (opts && opts.style) { return null; }" in home_js,
   "ba gian vẽ theo mẫu riêng; ảnh xem thử kiểu nhà khác giữ nền thuần")
ok("GardenLife.place(sceneName" in home_js and "if (e.life) { GardenLife.draw(" in home_js, "StackChan xếp lớp cùng thú / khách")
ok("stack:" in src("web/icons.js") and "kb-life-chip" in src("web/body.html"), "icon pixel stack + chip trên dải cảnh (không emoji)")
for f in ("web/life.js", "web/home.js", "web/craft.js", "web/nha_art.js", "web/pets.js", "web/garden.js", "web/icons.js", "web/calendar.js"):
    r = subprocess.run(["node", "--check", os.path.join(ADDON, f)], capture_output=True, text=True)
    ok(r.returncode == 0, "node --check " + f + ("" if r.returncode == 0 else ": " + r.stderr[-200:]))
emoji = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
for f in ("life_core.py", "decor_core.py", "web/life.js"):
    hits = sorted(set(emoji.findall(re.sub(r"[♪✦✓✕⚙]", "", src(f)))))
    ok(not hits, "%s không dùng emoji%s" % (f, " — có: " + " ".join(hits) if hits else ""))

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
for m in FAIL:
    print("  ✗ " + m)
sys.exit(1 if FAIL else 0)
