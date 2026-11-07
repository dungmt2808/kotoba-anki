"""Test offline cho phần 1.14 (more_core + GardenState): sửa nhà, thú nuôi, giống cây, vùng tự tạo,
giao diện tự chỉnh, hiệu ứng thành tích, và tương thích với bản cũ (khoá collection riêng MORE_KEY).

Chạy: python test_more.py THƯ_MỤC_ADD_ON   (không có gói `anki` thì dùng tests/stubs)
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
import more_core as more

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def raises(fn, *a):
    try:
        fn(*a)
    except (core.HomeError, more.MoreError) as err:
        return str(err)
    return None


class FakeCol:
    """Collection giả: chỉ có get_config / set_config và sched.today."""
    def __init__(self, today=100):
        self.conf = {}
        self.sched = type("S", (), {"today": today})()

    def get_config(self, key, default=None):
        v = self.conf.get(key, default)
        return json.loads(json.dumps(v)) if v is not None else default

    def set_config(self, key, value):
        self.conf[key] = json.loads(json.dumps(value))


def state(col):
    st = core.GardenState(os.path.join(tempfile.mkdtemp(), "state.json"), lambda: col)
    return st


print("== sửa nhà")
m = more.empty_more()
ok(more.wear_cap(2) == 0 and more.wear_cap(3) == 2 and more.wear_cap(7) == 4, "trần nấc hư: chưa tường 0, có tường 2, có mái 4")
ok(more.touch_repair(m, 7, 100) and m["repair"]["day"] == 100, "mở vườn lần đầu có nhà: bắt đầu tính tuổi nhà từ hôm nay")
ok(more.wear_level(m, 7, 106) == 0 and more.wear_level(m, 7, 107) == 1 and more.wear_level(m, 7, 121) == 3, "1 nấc / 7 ngày")
ok(more.wear_level(m, 7, 500) == 4 and more.wear_level(m, 3, 500) == 2, "không vượt trần (nhà không bao giờ sập)")
ok(more.wear_unit(3430) == 105 and more.wear_unit(100) == 15, "giá 1 nấc ≈ 3% giá nhà, tối thiểu 15 xu")
cost, n = more.repair_cost(m, 7, 3430, 121, 1)
ok((cost, n) == (105, 1), "sửa 1 nấc: 105 xu")
more.apply_repair(m, 7, 121, 1)
ok(more.wear_level(m, 7, 121) == 2, "sửa 1 nấc: còn 2 nấc")
ok(more.wear_level(m, 7, 128) == 3, "  … phần ngày lẻ vẫn giữ (7 ngày sau lại thêm 1 nấc)")
m2 = more.empty_more(); m2["repair"]["day"] = 0
more.apply_repair(m2, 7, 400, 1)
ok(more.wear_level(m2, 7, 400) == 3, "vắng rất lâu (nấc 4) rồi sửa 1 nấc → đúng 3 nấc (không bị tính dồn)")
m3 = more.empty_more(); m3["repair"] = {"day": 0, "seen": 0, "back": None}
more.touch_repair(m3, 7, 40)
ok(m3["repair"]["back"] == 40 and more.back_discount(m3, 45) and not more.back_discount(m3, 47), "vắng ≥ 14 ngày: giảm 50% trong 7 ngày")
ok(more.repair_cost(m3, 7, 3430, 40, None)[0] == 210, "  sửa hết 4 nấc khi được giảm: 210 xu thay vì 420")

print("== thú nuôi")
m = more.empty_more()
ok(more.buy_pet(m, "neko", 10) == 900 and more.pet_state(m["pets"]["neko"], 10) == "full", "nhận nuôi: về là đã no")
ok(raises(more.buy_pet, m, "neko", 10) is not None and raises(more.buy_pet, m, "rong", 10) is not None, "không nuôi trùng / không có con lạ")
ok(more.pet_state(m["pets"]["neko"], 11) == "hungry" and more.pet_state(m["pets"]["neko"], 12) == "away", "quên 1 ngày: đói · 2 ngày: đi chơi (không chết)")
cost, ids = more.feed_cost(m, None, 12)
more.apply_feed(m, ids, 12)
ok(cost == 3 and m["pets"]["neko"]["love"] == 2 and more.pet_state(m["pets"]["neko"], 12) == "full", "cho ăn 3 xu → về nhà, thân thêm 1")
ok(more.feed_cost(m, None, 12) == (0, []), "đã ăn hôm nay thì không tính tiền nữa")
ok(more.love_info(0)["name"] == "Mới về" and more.love_info(21)["name"] == "Thân thiết" and more.love_info(50)["next"] is None, "mức thân thiết")
more.rename_pet(m, "neko", "  Mi<b>mi&  ")
ok(m["pets"]["neko"]["name"] == "Mibmi", "tên được làm sạch (bỏ < > &)")
ok(raises(more.move_pet, m, "neko", "beach", ["yard"]) is not None, "chưa mở vùng thì không chuyển tới được")
more.buy_pet(m, "shiba", 12)
ok(raises(more.move_pet, m, "shiba", "room", ["yard", "room"]) is not None, "chó chỉ ở ngoài trời")
more.move_pet(m, "neko", "room", ["yard", "room"])
ok(m["pets"]["neko"]["scene"] == "room", "mèo vào nhà được")
junk = more.clean_more({"pets": {"neko": {"name": 5, "scene": "../x", "fed": "a", "love": -3}, "ghost": {}}}, core.CRAFT_PALETTE)
ok(list(junk["pets"]) == ["neko"] and junk["pets"]["neko"]["scene"] == "yard" and junk["pets"]["neko"]["love"] == 0, "dữ liệu thú rác → làm sạch")

print("== giống cây")
m = more.empty_more()
ok(raises(more.set_seed_rule, m, "deck", "5", "sakura") is not None, "chưa mua giống thì không gieo được")
more.buy_seed(m, "sakura"); more.buy_seed(m, "ine")
more.set_seed_rule(m, "deck", "10", "ine")
more.set_seed_rule(m, "kind", "kanji", "sakura")
more.set_seed_rule(m, "tag", "N5", "sakura")
sd = m["seeds"]
ok(more.resolve_seed(sd, 1, "vocab", [], [11, 10]) == "ine", "deck cha có luật → cây của deck con theo luật đó")
ok(more.resolve_seed(sd, 1, "kanji", [], [10]) == "sakura", "loại note thắng deck")
ok(more.resolve_seed(sd, 1, "vocab", ["n5::bai3"], [10]) == "sakura", "tag (kể cả tag con, không phân biệt hoa thường) thắng tất cả")
ok(more.resolve_seed(sd, 1, "vocab", [], [99]) is None, "không có luật → cây gốc")
more.set_seed_rule(m, "deck", "99", "mix")
picks = {more.resolve_seed(sd, n, "vocab", [], [99]) for n in range(1, 60)}
ok(picks == {None, "sakura", "ine"} and more.resolve_seed(sd, 7, "vocab", [], [99]) == more.resolve_seed(sd, 7, "vocab", [], [99]),
   "Trộn: mỗi cây một giống (cả cây gốc), cố định theo note")
more.set_seed_rule(m, "tag", "N5", "")
ok(sd["tag"] == [], "bỏ luật tag")
plants = [{"nid": 1, "kind": "kanji", "stage": 2}, {"nid": 2, "kind": "vocab", "stage": 1, "v": "old"}]
more.apply_seeds(plants, [{"tags": [], "decks": [5]}, {"tags": [], "decks": [5]}], sd)
ok(plants[0].get("v") == "sakura" and "v" not in plants[1], "apply_seeds gắn / bỏ plant.v")
junk = more.clean_more({"seeds": {"owned": ["sakura", "xx"], "deck": {"1": "xx", "2": "sakura", "a": "mix"}, "kind": {"vocab": "mix"},
                                   "tag": [["a b<", "sakura"], [1], ["ab", "nope"]]}}, core.CRAFT_PALETTE)
ok(junk["seeds"] == {"owned": ["sakura"], "deck": {"2": "sakura"}, "kind": {"vocab": "mix"}, "tag": [["ab", "sakura"]]}, "luật gieo rác → làm sạch")

print("== vùng tự tạo")
m = more.empty_more()
flat = "." * (64 * 76 - 10) + "k" * 10
cost, zid = more.save_zone(m, {"name": "Đồi <gió>", "bg": "lake", "ground": more.UZONE_GROUND[2], "hills": "#123456", "px": more.px_encode(flat)}, core.CRAFT_PALETTE)
z = m["zones"][0]
ok(cost == 5000 and zid == "u1" and z["name"] == "Đồi gió" and z["bg"] == "lake" and z["hills"] == more.UZONE_HILLS[0], "tạo vùng 5.000 xu; tên / màu lạ được làm sạch")
ok(more.px_decode_wh(z["lm"], 64, 76, core.CRAFT_PALETTE) == flat, "công trình 64×76 lưu đúng")
ok(more.save_zone(m, {"id": "u1", "name": "Đồi mới", "bg": "town", "px": z["lm"]}, core.CRAFT_PALETTE)[0] == 0, "đổi tên / nền không đổi hình: miễn phí")
ok(more.save_zone(m, {"id": "u1", "name": "Đồi mới", "px": ""}, core.CRAFT_PALETTE)[0] == 50, "vẽ lại công trình: 50 xu")
ok(raises(more.save_zone, m, {"px": "5q"}, core.CRAFT_PALETTE) is not None, "màu lạ trong hình → lỗi")
ok(raises(more.save_zone, m, {"px": "100k"}, core.CRAFT_PALETTE) is not None, "sai kích thước hình → lỗi")
for i in range(5):
    more.save_zone(m, {"name": str(i)}, core.CRAFT_PALETTE)
ok(len(m["zones"]) == 6 and raises(more.save_zone, m, {"name": "7"}, core.CRAFT_PALETTE) is not None, "tối đa 6 vùng")
more.buy_pet(m, "neko", 1); m["pets"]["neko"]["scene"] = "u2"
more.delete_zone(m, "u2")
ok(len(m["zones"]) == 5 and m["pets"]["neko"]["scene"] == "yard", "xoá vùng: thú ở đó về sân")
_, nz = more.save_zone(m, {"name": "x"}, core.CRAFT_PALETTE)
ok(nz == "u7", "id vùng không dùng lại (u2 đã xoá → vùng mới là u7)")
ok(more.is_uzone("u12") and not more.is_uzone("u0") and not more.is_uzone("yard") and not more.is_uzone("u1x"), "nhận diện id vùng tự tạo")

print("== GardenState: lưu ở khoá riêng, bản cũ không xoá")
col = FakeCol(100)
st = state(col)
d = st.load(); d["coins"] = 20000; d["home"]["house"] = 7; st.save(d)
st.touch()
ok(col.conf[more.MORE_KEY]["repair"]["day"] == 100, "touch(): ghi tuổi nhà vào MORE_KEY")
st.pet_buy("neko"); st.seed_buy("sakura"); st.seed_rule("kind", "vocab", "sakura")
r = st.zone_save({"name": "Vùng A", "bg": "snow"})
st.buy("fence"); st.buy("fence")
st.place("u1", "fence", 5, 1); st.place("yard", "fence", 6, 0)
w = col.conf[core.CONFIG_KEY]
ok("u1" not in w["home"] and "uzones" not in w["home"] and "more" not in w and "more_view" not in w, "ví (bản 1.6.1 đọc) không có gì của 1.14")
ok(not any(k in json.dumps(col.conf.get(core.EXT_KEY)) for k in ("u1", "uzones")), "EXT_KEY cũng không")
ok(col.conf[more.MORE_KEY]["places"] == {"u1": [{"id": "fence", "x": 5, "y": 1}]}, "đồ đặt ở vùng tự tạo nằm ở MORE_KEY")
d = st.load()
ok(d["home"]["u1"] == [{"id": "fence", "x": 5, "y": 1}] and d["home"]["uzones"] == ["u1"] and d["coins"] == 20000 - 900 - 1200 - 5000 - 30,
   "đọc lại: vùng + đồ + xu đúng")
ok(d["more_view"]["pets"][0]["state"] == "full" and d["more_view"]["wear"]["level"] == 0, "more_view tính sẵn cho giao diện")
ok(raises(st.place, "u1", "fence", 5, 1) is not None, "kho hết hàng rào → không đặt thêm được")
ok(raises(st.place, "u9", "flowers", 5, 1) is not None, "vùng chưa tạo → không đặt được")
# bản cũ (1.13) ở máy khác: đọc ví + ext + season, đặt hàng rào thứ 2 chỗ khác rồi lưu (không đụng MORE_KEY)
w = col.conf[core.CONFIG_KEY]; w["home"]["yard"].append({"id": "fence", "x": 8, "y": 2}); col.set_config(core.CONFIG_KEY, w)
d = st.load()
ok(d["home"]["u1"] == [] and core.placed_count(d["home"], "fence") == 2, "bản cũ đặt trùng món ở chỗ khác → món ở vùng tự tạo về kho (không vượt số đã có)")
before = json.dumps(col.conf[more.MORE_KEY], sort_keys=True)
st.save(st.load())
ok(col.conf[more.MORE_KEY]["pets"] == json.loads(before)["pets"], "lưu lại không mất thú nuôi")
col.conf[more.MORE_KEY]["future_key"] = {"x": 1}
st.save(st.load())
ok(col.conf[more.MORE_KEY].get("future_key") == {"x": 1}, "giữ khoá lạ của bản mới hơn")
col.sched.today = 121
r = st.repair()
ok(r["repaired"] == 3 and r["more_view"]["wear"]["level"] == 0, "sửa hết 3 nấc sau 21 ngày")
ok(raises(st.repair) == "Nhà đang như mới, chưa cần sửa.", "nhà mới thì không sửa")
col.sched.today = 123
d = st.load(); d["more"]["pet_auto"] = True; d["coins"] = 2; st.save(d)
ok(st.touch() is None and st.load()["more"]["pets"]["neko"]["fed"] != 123, "tự cho ăn: thiếu xu thì không trừ")
d = st.load(); d["coins"] = 50; st.save(d)
fed = st.touch()
ok(fed and fed["cost"] == 3 and st.load()["coins"] == 47, "tự cho ăn khi mở vườn: trừ 3 xu")
r = st.zone_delete("u1")
ok("u1" not in r["home"] and r["home"]["uzones"] == [], "xoá vùng")
# collection có ví nhưng chưa có MORE_KEY (vd. tải về từ máy chưa cài 1.14): không lấy file sao lưu của máy này
col2 = FakeCol(5); col2.set_config(core.CONFIG_KEY, {"coins": 7})
st2 = core.GardenState(st.path, lambda: col2)
ok(st2.load()["more"]["pets"] == {}, "collection chưa có MORE_KEY → không dùng more.json của máy khác")

print("== giao diện tự chỉnh")
ui = more.clean_ui({"review": {"yard": "hide", "field": "bay", "x": 1}, "card": "tall", "theme": "neon"})
ok(ui["review"]["yard"] == "hide" and ui["review"]["field"] == "full" and ui["card"] == "tall" and ui["theme"] == "garden", "làm sạch: giữ giá trị hợp lệ, bỏ giá trị lạ")
ok(more.clean_ui(None) == more.ui_default() and more.ui_default()["main"]["yard"] == "full", "mặc định = như cũ (mọi thứ chuyển động)")
f = more.ui_preset("focus")
ok(f["review"]["yard"] == "hide" and f["review"]["field"] == "hide" and f["main"]["yard"] == "full" and f["card"] == "tall", "kiểu “Tập trung khi ôn”")
ok(raises(more.ui_preset, "night") is not None and raises(more.ui_preset, "xx") is not None,
   "1.23: bỏ kiểu “Ôn buổi tối”; kiểu lạ → lỗi")
old_night = more.clean_ui({"review": {"yard": "dim", "field": "dim", "sky": "off", "weather": "off", "mascot": "off",
                                      "pets": "off"}, "theme": "night", "card": "tall"})
ok(old_night["theme"] == "garden" and old_night["review"]["yard"] == "full" and old_night["review"]["sky"] == "on"
   and old_night["review"]["pets"] == "off" and old_night["card"] == "tall",
   "1.23: config cũ “Ôn buổi tối” → Vàng vườn, các mục của kiểu đó về mặc định, mục tự chỉnh khác giữ nguyên")

print("== hiệu ứng thành tích")
P = lambda st, w=False: {"stage": st, "wilted": w}
j = more.joy_view([P(3)] * 6, 0, 12, 30, 7, True, 50)
ok(j["done"] and not j["goal"] and j["grown"] == "flower" and j["streak_mark"] == 7 and j["quests"], "xong thẻ, cả vườn ra hoa, mốc 7 ngày, xong nhiệm vụ")
ok(not more.joy_view([P(4)] * 6, 0, 0, 30, 0, False, 1)["done"], "chưa ôn lượt nào thì chưa tính “xong thẻ”")
ok(more.joy_view([P(4)] * 6, 3, 40, 30, 8, False, 1)["grown"] == "fruit" and more.joy_view([P(4)] * 6, 3, 40, 30, 8, False, 1)["goal"], "cả vườn ra quả, đạt mục tiêu")
ok(more.joy_view([P(4)] * 5 + [P(4, True)], 0, 1, 30, 1, False, 1)["grown"] is None, "có cây héo thì không tính “cả vườn”")
ok(more.joy_view([P(4)] * 4, 0, 1, 30, 1, False, 1)["grown"] is None, "ít hơn 5 cây thì không tính")

print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
