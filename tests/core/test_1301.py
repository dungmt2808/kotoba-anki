"""Test offline 1.30.1 (python thường): các việc người dùng nêu ngày 14/11 sau khi xem 1.30 trên máy thật.

- Tường & sàn: nền theo kiểu nhà của gian khác (Sàn Bếp cho phòng chính, Sàn phòng chính cho Bếp, tường từng gian) dùng được
  miễn phí cho gian nào cũng được, không mua được / không cần mua, sai chỗ bị từ chối, chọn nền của chính gian đó = Theo kiểu
  nhà, clean() giữ, có hình trong web/nha_art.js (HOUSE_DECO), cửa hàng vẽ ảnh nhỏ "Theo kiểu nhà" theo đúng gian.
- Hỏi trước khi trả xu: mọi nút trả xu đi qua GardenUI.ask (home.js pay() đều có câu hỏi, gánh hàng, vé giữ chuỗi, gói báo,
  Xưởng), chặn bấm đúp 0,45 giây, tắt được ở ⚙ (ui.buyask), add-on test tắt cho kịch bản cũ (ASK_TEST_OFF).
- Thu gọn bảng Hôm nay: ui.today (open / mini) được làm sạch, giữ khi bấm kiểu giao diện có sẵn; nút ở hàng nút góc dải cảnh.
- Liên hệ: email ở Báo lỗi (nút Gửi email…), ⚙, file góp ý hình; không gửi gì lên mạng.
- Câu chữ: Tin làng không còn "ngày có ôn", Lịch hoa ghi "đã ôn N/M ngày", "Đổi N ngày ôn liền"; không còn chữ "add-on" ở
  chú thích Góp ý hình.
- Khách đi bộ vào / về bằng mép phải (không đi ngang qua nhà); thú trong nhà đi theo gian (pets.js HSEG).

Chạy: python test_1301.py THƯ_MỤC_ADD_ON
"""
import json, os, re, sys, tempfile

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
import event_core

D = core.decor
FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1301_")


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


def new_state(name, coins=50000, rooms=True):
    st = core.GardenState(os.path.join(TMP, name, "state.json"))
    d = st.load(); d["coins"] = coins; st.save(d)
    for _ in range(7):
        st.build()
    if rooms:
        st.open_rooms()
    return st


print("== tường & sàn: nền theo kiểu nhà của gian khác")
ok(set(D.HOUSE) == {"w_hroom", "w_hkitchen", "w_hbedroom", "f_hroom", "f_hkitchen"}, "5 mẫu nhà: 3 tường + sàn phòng chính / Bếp")
ok(all(D.ID_RE.match(k) and k[0] == v["slot"][0] and v["room"] in D.ROOMS for k, v in D.HOUSE.items()), "id đúng dạng w_… / f_…, gian hợp lệ")
ok(not set(D.HOUSE) & set(D.PRESETS), "không trùng id mẫu bán")
ok(D.house_id("bedroom", "floor") == "f_hroom" and D.house_id("kitchen", "floor") == "f_hkitchen" and D.house_id("bedroom", "wall") == "w_hbedroom",
   "nền của Phòng ngủ = sàn phòng chính (giống nhau ở cả 4 kiểu nhà)")
cat = D.catalog_view()
ok([h["id"] for h in cat["house"]] == list(D.HOUSE) and cat["house_same"] == {"floor:bedroom": "f_hroom"}, "catalog_view gửi danh sách mẫu nhà")
art = src("web/nha_art.js")
m = re.search(r"const HOUSE_DECO = \{([^}]*)\}", art)
js_house = dict(re.findall(r"(\w+): \"(\w+)\"", m.group(1))) if m else {}
ok(js_house == {k: v["room"] for k, v in D.HOUSE.items()}, "nha_art.js HOUSE_DECO khớp decor_core.HOUSE")
ok("decoPaint(c, 0, W, deco, style, W)" in art and "houseKind" in art, "nền nhà vẽ bằng hàm nền của kiểu nhà đang dùng")
home = src("web/home.js")
ok("swatchCanvas(\"\", slot, room)" in home and "NHA.houseKind" in home, "ảnh nhỏ \"Theo kiểu nhà\" vẽ đúng gian đang trang trí (không luôn là phòng chính)")
ok("dc.house_same" in home and "it.id !== own" in home, "không hiện ô trùng với nền của chính gian đó")

st = new_state("a")
c0 = st.load()["coins"]
ok("có sẵn" in err(st.decor_buy, "f_hkitchen") and st.load()["coins"] == c0, "mẫu nhà không mua được / không trừ xu")
st.decor_use("room", "floor", "f_hkitchen")
st.decor_use("kitchen", "floor", "f_hroom")
st.decor_use("kitchen", "wall", "w_hbedroom")
u = st.load()["more"]["decor"]["use"]
ok(u["room"] == {"floor": "f_hkitchen"} and u["kitchen"] == {"floor": "f_hroom", "wall": "w_hbedroom"} and st.load()["coins"] == c0,
   "Sàn Bếp cho phòng chính, Sàn phòng chính + Tường Phòng ngủ cho Bếp: miễn phí")
ok(st.load()["more"]["decor"]["own"] == [], "không ghi vào danh sách đã mua")
st.decor_use("bedroom", "floor", "f_hroom")
ok(st.load()["more"]["decor"]["use"]["bedroom"] == {}, "chọn nền của chính gian đó (Phòng ngủ ← sàn phòng chính) = Theo kiểu nhà")
st.decor_use("kitchen", "floor", "f_hkitchen")
ok("floor" not in st.load()["more"]["decor"]["use"]["kitchen"], "Bếp ← Sàn Bếp = về Theo kiểu nhà")
ok("dành cho" in err(st.decor_use, "room", "wall", "f_hkitchen") and "dành cho" in err(st.decor_use, "room", "floor", "w_hroom"),
   "mẫu nhà sai chỗ (sàn ↔ tường): từ chối")
noroom = new_state("noroom", rooms=False)
ok("Mở rộng nhà" in err(noroom.decor_use, "kitchen", "floor", "f_hroom"), "gian chưa mở: vẫn chưa trang trí được")
noroom.decor_use("room", "wall", "w_hkitchen")
ok(noroom.load()["more"]["decor"]["use"]["room"] == {"wall": "w_hkitchen"}, "nhà chưa mở rộng vẫn lấy được tường Bếp cho phòng chính")
c = D.clean({"own": [], "use": {"room": {"wall": "w_hbedroom", "floor": "f_hkitchen"}, "kitchen": {"floor": "w_hroom"}}})
ok(c["use"]["room"] == {"wall": "w_hbedroom", "floor": "f_hkitchen"} and c["use"]["kitchen"] == {}, "clean(): giữ mẫu nhà đúng chỗ, bỏ sai chỗ")

print("== hỏi trước khi trả xu")
ui = src("web/ui.js")
ok("function ask(o)" in ui and "ASK_GUARD = 450" in ui and "ask: ask" in ui, "GardenUI.ask có sẵn, chặn bấm 0,45 giây")
ok('window.addEventListener("keydown"' in ui and "askClose(false, true)" in ui, "Esc (cố ý) đóng ngay; phím bắt ở window trước mọi phím tắt khác")
ok('glob("buyask") === "off"' in ui and "d.ask_off" in ui, "tắt được ở ⚙ (ui.buyask) và bởi add-on test")
calls = re.findall(r'pay\("[^"]+"(?: \+ [^,]+)?, (\{)', home)
ok(len(re.findall(r'\bpay\("', home)) == len(calls) and len(calls) >= 17, "mọi lệnh trả xu ở Nhà có câu hỏi (%d chỗ)" % len(calls))
ok("GardenUI.ask(Object.assign({}, q, { then: go }))" in home, "pay() gửi lệnh sau khi đồng ý")
for f, cmd in (("web/finds.js", "ped:buy:"), ("web/calendar.js", "cal:freeze:"), ("web/paper.js", "ai:sub:")):
    s = src(f)
    ok("GardenUI.ask(" in s and cmd in s, "%s: %s hỏi trước" % (f, cmd))
craft = src("web/craft.js")
ok("function commit(cmd, what, yes)" in craft and craft.count("commit(\"craft:") == 4 and "price > 0" in craft,
   "Xưởng: tạo / vẽ lại (tốn xu) hỏi sau khi kiểm hình, đổi tên miễn phí lưu ngay")
init = src("__init__.py")
ok("ASK_TEST_OFF = False" in init and 'data["ask_off"] = True' in init, "bản phát hành: luôn hỏi (ASK_TEST_OFF mặc định False)")
zz = open(os.path.join(HERE, "..", "anki", "zz_kbtest", "__init__.py"), encoding="utf-8").read()
ok("_kb.ASK_TEST_OFF = True" in zz, "add-on test tắt hộp hỏi cho kịch bản cũ")

print("== cài đặt giao diện mới: today / buyask")
d = more_core.ui_default()
ok(d["today"] == "open" and d["buyask"] == "on", "mặc định: bảng Hôm nay mở, hỏi trước khi trả xu")
c = more_core.clean_ui({"today": "mini", "buyask": "off"})
ok(c["today"] == "mini" and c["buyask"] == "off", "lưu được Thu gọn / Tắt")
c = more_core.clean_ui({"today": "x", "buyask": True})
ok(c["today"] == "open" and c["buyask"] == "on", "giá trị lạ về mặc định")
ok(more_core.ui_preset("calm", {"today": "mini", "buyask": "off"})["today"] == "mini"
   and more_core.ui_preset("full", {"buyask": "off"})["buyask"] == "off", "bấm kiểu có sẵn không đổi hai mục này")
body = src("web/body.html")
ok('id="kb-today-tog"' in body and body.index('id="kb-today-tog"') > body.index('id="kb-yard-snap"')
   and body.index('id="kb-today-tog"') < body.index('class="kb-yard-side"'), "nút thu gọn nằm ở hàng nút góc dải cảnh (cạnh chụp ảnh)")
ok('id="kb-today-hide"' in body, "nút \"–\" trên bảng Hôm nay")
css = src("web/garden.css")
ok(".kb-ui-today-mini .kb-yard-side .kb-today { display: none !important; }" in css, "thu gọn: ẩn bảng")
ok('"kb-ui-today-" + glob("today")' in ui, "lớp kb-ui-today-* theo cài đặt")

print("== liên hệ")
EMAIL = "maitrongdung10@gmail.com"
ok('CONTACT_EMAIL = "%s"' % EMAIL in init and "Gửi email…" in init and "def open_mail(" in init, "Báo lỗi: email + nút Gửi email…")
ok('cmd == "app:mail"' in init, "⚙ → Gửi thư (lệnh app:mail)")
ok(EMAIL in body and 'id="kb-mail"' in body, "⚙ có dòng Góp ý, báo lỗi + email")
ok(EMAIL in src("web/garden.js"), "lưu file Góp ý hình → nhắc gửi qua email")
ok("QDesktopServices.openUrl" in init and "urlopen" not in init.split("def open_mail")[1].split("def show_report")[0],
   "chỉ mở chương trình thư của máy, không tự gửi lên mạng")

print("== câu chữ")
n = event_core._milestones(97, False, 0) + event_core._milestones(100, True, 0) + event_core._milestones(0, False, 28)
txt = " | ".join(x["text"] + " / " + x.get("short", "") for x in n)
ok("ngày có ôn" not in txt and "ngày học" in txt and "ngày liền" in txt, "Tin làng: " + txt)
cal = src("web/calendar.js")
ok('"đã ôn " + v.reviewed + "/" + passed + " ngày"' in cal and '"Ôn liền"' in cal, "Lịch hoa: \"Tháng này · đã ôn N/M ngày\", \"Ôn liền\"")
ok("Đổi chuỗi" not in home and '"Đổi " + t.streak + " ngày ôn liền"' in home, "Giao diện mùa: \"Đổi N ngày ôn liền\" (chuỗi không đứt)")
ok('người làm add-on"' not in home and 'người làm add-on."' not in src("web/garden.js") and "người làm ことば畑" in home,
   "không còn chữ \"add-on\" ở chú thích Góp ý hình / thông báo lưu file")

print("== đường đi của khách / thú")
g = src("web/guests.js")
ok("!walker(def)" in g and "rightEdge(scene) + 14" in g and "walker(a.def) ? rightEdge(a.scene) + 18" in g,
   "khách đi bộ vào / về bằng mép phải phần cảnh đang thấy")
ok("visTo:" in home, "dải cảnh màn chính báo mép phải đang thấy cho khách")
p = src("web/pets.js")
ok("const HSEG = {" in p and "houseSegs(data)" in p, "thú trong nhà đi dạo theo gian, không vào gian chưa mở")

print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
