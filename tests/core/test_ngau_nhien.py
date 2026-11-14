"""Test offline 1.30 (python thường): "người dùng ngẫu nhiên" — hàng nghìn thao tác ngẫu nhiên qua GardenState (đúng các hàm
cầu nối gọi), sau MỖI thao tác kiểm lại bất biến của ví. Mục đích: bắt lỗi logic do tổ hợp tính năng mà test từng bản không
đi tới (đặt đồ ↔ gian bên ↔ vùng tự tạo ↔ xoá mẫu ↔ đổi kiểu nhà ↔ qua ngày …).

Thao tác: xây nhà, mở rộng nhà, mở vùng, mua / đặt / di chuyển / cất đồ (cả id và toạ độ rác), kiểu nhà, đồ mặc, biểu cảm,
tường & sàn (mua / dùng / mẫu tự vẽ / xoá), Xưởng (tạo / sửa / +1 / xoá mẫu), thú nuôi, giống cây, sửa nhà, vé giữ chuỗi, vùng
tự tạo, giống tự vẽ, giao diện mùa, quà nhặt đồ, mua ở gánh hàng, cộng xu, qua ngày.

Bất biến sau mỗi thao tác:
  1. Thao tác bị từ chối (HomeError) thì ví KHÔNG đổi gì (so từng byte dữ liệu đọc lại).
  2. Lỗi khác HomeError = lỗi của add-on (test trượt, in thao tác + dấu vết).
  3. Xu là số nguyên ≥ 0; thao tác thành công không bao giờ làm xu tăng (trừ cộng xu / quà); mua thì trừ đúng giá niêm yết.
  4. Mỗi món: số đã đặt ≤ số đang có; không món lạ; không hai món chồng ô (dựng lại từng cảnh bằng check_spot).
  5. Đọc lại hai lần ra cùng dữ liệu; lưu-rồi-đọc không đổi dữ liệu (ổn định, không "trôi").
  6. Tường / sàn đang dùng đều là mẫu đang có và đúng chỗ; mẫu tự vẽ ≤ 12 và đều có điểm ảnh; món tự làm đều có điểm ảnh.
  7. File sao lưu trên đĩa đọc được (JSON hợp lệ).

Chạy: python test_ngau_nhien.py THƯ_MỤC_ADD_ON [SỐ_HẠT] [SỐ_BƯỚC]      (mặc định 12 hạt × 350 bước)
"""
import datetime as dt
import json, os, random, shutil, sys, tempfile, traceback

ADDON = os.path.abspath(sys.argv[1])
SEEDS = int(sys.argv[2]) if len(sys.argv) > 2 else 12
STEPS = int(sys.argv[3]) if len(sys.argv) > 3 else 350
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core
import more_core
import season_core

D = core.decor
FAIL = []
TMP = tempfile.mkdtemp(prefix="kbrand_")
PALCH = list(core.CRAFT_PALETTE)
ITEMS = list(core.CATALOG)
SCENES = list(core.ALL_SCENES) + list(core.SIDE_IDS) + ["u1", "u2", "attic", ""]
PETS = list(more_core.PETS)
SEEDIDS = list(more_core.SEEDS)
THEMES = list(season_core.THEME_IDS)
PRESETS = list(D.PRESETS)


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def rnd_px(rng, n):
    """Mã điểm ảnh n×n ngẫu nhiên (vài màu, có ô trống)."""
    cols = rng.sample(PALCH, 3)
    flat = "".join(rng.choice(cols + ["."]) for _ in range(n * n))
    if not flat.strip("."):
        flat = cols[0] + flat[1:]
    return more_core.px_encode(flat)


def snap(st):
    d = st.load()
    d.pop("more_view", None)
    return json.dumps(d, sort_keys=True, ensure_ascii=False), d


def placed_total(home, iid):
    return sum(1 for sc in home if isinstance(home[sc], list) for e in home[sc] if isinstance(e, dict) and e.get("id") == iid)


def check_invariants(st, where):
    s1, d = snap(st)
    s2, _ = snap(st)
    if s1 != s2:
        return "đọc hai lần ra khác nhau"
    if not isinstance(d["coins"], int) or isinstance(d["coins"], bool) or d["coins"] < 0:
        return "xu không hợp lệ: %r" % (d["coins"],)
    home, cat = d["home"], core.full_catalog(d)
    for iid, n in home["owned"].items():
        if iid not in cat:
            return "món lạ trong kho: %s" % iid
        if not isinstance(n, int) or n <= 0:
            return "số món sai: %s = %r" % (iid, n)
        if placed_total(home, iid) > n:
            return "đặt %d > có %d: %s" % (placed_total(home, iid), n, iid)
    for sc in core.scene_names(home):
        fake = dict(home)
        fake[sc] = []
        for e in home.get(sc, []):
            if e["id"] not in home["owned"]:
                return "đặt món không có trong kho: %s ở %s" % (e["id"], sc)
            try:
                core.check_spot(dict(fake, house=len(core.HOUSE_LEVELS)), sc, e["id"], e["x"], e["y"], cat=cat)
            except core.HomeError as err:
                return "chỗ đặt không hợp lệ ở %s: %s (%s)" % (sc, e, err)
            fake[sc] = fake[sc] + [e]
    dec = d["more"][D.DECOR_KEY]
    if D.clean(dec) != dec:
        return "decor không ở dạng sạch"
    for room in D.ROOMS:
        for slot, did in dec["use"][room].items():
            if not D.usable(dec, did, slot):
                return "gian %s dùng mẫu không có: %s" % (room, did)
    px = st.load_px()
    if len(dec["mine"]["items"]) > D.TILE_MAX:
        return "quá %d mẫu tự vẽ" % D.TILE_MAX
    for tid in dec["mine"]["items"]:
        if not D.tile_code(px.get(tid), core.CRAFT_PALETTE):
            return "mẫu %s thiếu điểm ảnh" % tid
    for cid, meta in d["craft"]["items"].items():
        if core.px_decode(px.get(cid), meta["size"]) is None:
            return "món tự làm %s thiếu điểm ảnh" % cid
    if any(z not in core.ZONE_IDS for z in home["zones"]) or home["zones"] != core.ZONE_IDS[:len(home["zones"])]:
        return "vùng mở không theo thứ tự: %r" % home["zones"]
    if home["rooms"] not in ([], list(core.SIDE_IDS)):
        return "gian bên mở lẻ: %r" % home["rooms"]
    # lưu rồi đọc lại: không đổi
    st.save(st.load())
    s3, _ = snap(st)
    if s3 != s1:
        return "lưu-rồi-đọc làm đổi dữ liệu"
    base = os.path.dirname(st.path)
    for f in os.listdir(base):
        if f.endswith(".json"):
            try:
                json.load(open(os.path.join(base, f), encoding="utf-8"))
            except ValueError:
                return "file %s hỏng" % f
    return ""


def run_seed(seed):
    rng = random.Random(seed)
    st = core.GardenState(os.path.join(TMP, "s%d" % seed, "state.json"))
    st.today_override = 100
    d = st.load(); d["coins"] = [0, 300, 20000, 60000, 400000, 400000][seed % 6]; st.save(d)
    stats = {"ok": 0, "từ chối": 0}

    def owned_item():
        own = list(st.load()["home"]["owned"])
        return rng.choice(own) if own and rng.random() < 0.85 else rng.choice(ITEMS + ["c1", "c99", "khongco"])

    def scene_of(iid):
        dd = st.load()
        cat = core.full_catalog(dd)
        if iid in cat and rng.random() < 0.8:
            good = [sc for sc in core.scene_names(dd["home"]) if core.fits_scene(cat[iid], sc)]
            if good:
                return rng.choice(good)
        return rng.choice(SCENES)

    def spot(sc):                   # 80 %: ô trong vùng đặt được của cảnh; còn lại: toạ độ bất kỳ (cả ngoài khung)
        if rng.random() < 0.2:
            return rng.randint(-1, 17), rng.randint(-1, 4)
        if core.is_room(sc):
            return rng.randint(0, 9), rng.randint(0, 3)
        return rng.randint(4, 15), rng.randint(0, 2)

    def a_place():
        iid = owned_item()
        sc = scene_of(iid)
        return st.place(sc, iid, *spot(sc))

    def a_move():
        dd = st.load(); sc = rng.choice(list(core.scene_names(dd["home"])) + ["attic"])
        n = len(dd["home"].get(sc) or [])
        return st.move(sc, rng.randint(-1, n) if rng.random() < 0.2 else rng.randint(0, max(0, n - 1)), *spot(sc))

    def a_take():
        dd = st.load(); sc = rng.choice(list(core.scene_names(dd["home"])) + ["attic"])
        n = len(dd["home"].get(sc) or [])
        return st.take(sc, rng.randint(-1, n) if rng.random() < 0.2 else rng.randint(0, max(0, n - 1)))

    def a_tile():
        dd = st.load(); mine = list(dd["more"][D.DECOR_KEY]["mine"]["items"])
        p = {"name": rng.choice(["Sọc", "", "<x>", "Mẫu " * 9]), "kind": rng.choice(["wall", "floor", "roof"]), "px": rnd_px(rng, 16)}
        if mine and rng.random() < 0.4:
            p["id"] = rng.choice(mine + ["t999"])
            if rng.random() < 0.7:
                p["kind"] = dd["more"][D.DECOR_KEY]["mine"]["items"].get(p["id"], {}).get("kind", "wall")
        if rng.random() < 0.1:
            p["px"] = rng.choice(["", "zz", None, 5, "300k"])
        return st.tile_save(p)

    def a_decor_use():
        dd = st.load()["more"][D.DECOR_KEY]
        pool = dd["own"] + list(dd["mine"]["items"]) + ["none", "", "w_khongco", "t9", "bench"]
        return st.decor_use(rng.choice(list(D.ROOMS) + ["attic"]), rng.choice(["wall", "floor", "x"]), rng.choice(pool))

    def a_craft():
        dd = st.load(); mine = list(dd["craft"]["items"])
        size = rng.choice([16, 24, 32, 20])
        p = {"name": "Món", "size": size, "kind": rng.choice(["ground", "floor", "wall", "sky"]), "fx": rng.choice(list(core.CRAFT_FX) + ["zz"]),
             "px": rnd_px(rng, size if size in (16, 24, 32) else 16)}
        if mine and rng.random() < 0.35:
            cid = rng.choice(mine); meta = dd["craft"]["items"][cid]
            p.update(id=cid, size=meta["size"], kind=meta["kind"], px=rnd_px(rng, meta["size"]))
        return st.craft_save(p)

    def a_craft_del():
        mine = list(st.load()["craft"]["items"])
        return st.craft_delete(rng.choice(mine + ["c999"]))

    def a_craft_copy():
        mine = list(st.load()["craft"]["items"])
        return st.craft_copy(rng.choice(mine + ["c999"]))

    def a_zone():
        zs = st.load()["more"]["zones"]
        cv = more_core.catalog_view()["uzone"]
        p = {"name": "Vùng", "bg": rng.choice([b["id"] for b in cv["bg"]] + ["x"]), "ground": rng.choice(cv["ground"]), "hills": rng.choice(cv["hills"]),
             "px": more_core.px_encode(("k" * 64) * 4 + "." * (64 * 72)), "env": ""}
        if zs and rng.random() < 0.3:
            p["id"] = rng.choice(zs)["id"]
        return st.zone_save(p)

    def a_zone_del():
        zs = [z["id"] for z in st.load()["more"]["zones"]]
        return st.zone_delete(rng.choice(zs + ["u9"]))

    def a_myseed():
        return st.myseed_save({"name": "Giống", "st": [rnd_px(rng, 16) if rng.random() < 0.8 else "" for _ in range(5)]})

    def a_day():
        st.today_override += rng.choice([1, 1, 1, 2, 9, 20])
        st.touch()
        return st.load()

    def a_theme():
        return st.unlock_theme(rng.choice(THEMES + ["x"]), rng.choice(["coins", "coins", "streak", "?"]), rng.randint(0, 12), st.today_override, dt.date(2026, 11, 13))

    def a_ped():
        iid = rng.choice(ITEMS + ["khongco"])
        return st.buy_at(iid, rng.choice([0, 50, 210]))

    actions = [
        (8, "xây", lambda: st.build()), (3, "mở rộng", lambda: st.open_rooms()),
        (3, "mở vùng", lambda: st.unlock_zone(rng.choice(core.ZONE_IDS + ["x"]))),
        (14, "mua", lambda: st.buy(rng.choice(ITEMS + ["khongco"]))), (16, "đặt", a_place), (6, "chuyển", a_move), (6, "cất", a_take),
        (2, "mua kiểu nhà", lambda: st.buy_style(rng.choice(list(core.HOUSE_STYLES) + ["x"]))),
        (2, "dùng kiểu nhà", lambda: st.use_style(rng.choice(list(core.HOUSE_STYLES) + ["x"]))),
        (2, "mua đồ mặc", lambda: st.buy_wear(rng.choice(list(core.WEAR) + ["x"]))),
        (1, "mặc", lambda: st.put_on(rng.choice(list(core.WEAR)))), (1, "cởi", lambda: st.take_off(rng.choice(list(core.WEAR_SLOTS) + ["x"]))),
        (1, "mua biểu cảm", lambda: st.buy_face(rng.choice(list(core.FACES) + ["x"]))),
        (1, "bật / tắt biểu cảm", lambda: st.toggle_face(rng.choice(list(core.FACES)))),
        (6, "mua tường / sàn", lambda: st.decor_buy(rng.choice(PRESETS + ["w_khongco", "bench"]))), (7, "dùng tường / sàn", a_decor_use),
        (4, "vẽ mẫu", a_tile), (2, "xoá mẫu", lambda: st.tile_delete(rng.choice(list(st.load()["more"][D.DECOR_KEY]["mine"]["items"]) + ["t999"]))),
        (4, "chế tác", a_craft), (2, "xoá món tự làm", a_craft_del), (2, "+1 món tự làm", a_craft_copy),
        (2, "nhận thú", lambda: st.pet_buy(rng.choice(PETS + ["x"]))), (2, "cho ăn", lambda: st.pet_feed(rng.choice(PETS + [None]))),
        (1, "chuyển thú", lambda: st.pet_move(rng.choice(PETS), rng.choice(SCENES))), (1, "đặt tên thú", lambda: st.pet_name(rng.choice(PETS), rng.choice(["Mochi", "", "<b>", "x" * 99]))),
        (2, "mua giống", lambda: st.seed_buy(rng.choice(SEEDIDS + ["x"]))),
        (1, "luật giống", lambda: st.seed_rule(rng.choice(["deck", "kind", "tag", "x"]), rng.choice(["1", "vocab", "tag1", 5]), rng.choice(SEEDIDS + ["mix", "", "g1"]))),
        (2, "sửa nhà", lambda: st.repair(rng.choice([None, 1]))),
        (1, "vé giữ chuỗi", lambda: st.freeze_buy(dt.date(2026, 11, 13) + dt.timedelta(days=st.today_override - 100))),
        (1, "vùng tự tạo", a_zone), (1, "xoá vùng tự tạo", a_zone_del), (1, "giống tự vẽ", a_myseed),
        (2, "giao diện mùa", a_theme), (1, "chọn giao diện", lambda: st.set_theme(rng.choice(["auto", "off", "pick", "x"]), rng.choice(THEMES))),
        (2, "quà nhặt đồ", lambda: st.find_reward(rng.choice([0, 3]), rng.choice(list(core.FIND_ITEMS) + [None, "bench"]))),
        (2, "gánh hàng", a_ped), (5, "cộng xu", lambda: st.add_coins(rng.choice([0, 1, 50, 2000, 6000]))), (4, "qua ngày", a_day),
    ]
    weights = [a[0] for a in actions]
    earn = {"cộng xu", "quà nhặt đồ"}
    for step in range(STEPS):
        _w, name, fn = rng.choices(actions, weights)[0]
        before, dbefore = snap(st)
        try:
            fn()
            stats["ok"] += 1
            after, dafter = snap(st)
            if name not in earn and dafter["coins"] > dbefore["coins"]:
                return "hạt %d bước %d (%s): xu tăng %d → %d" % (seed, step, name, dbefore["coins"], dafter["coins"]), stats
        except core.HomeError:
            stats["từ chối"] += 1
            after, _ = snap(st)
            if after != before:
                return "hạt %d bước %d (%s): bị từ chối mà ví vẫn đổi" % (seed, step, name), stats
        except Exception:
            return "hạt %d bước %d (%s): %s" % (seed, step, name, traceback.format_exc()[-900:]), stats
        bad = check_invariants(st, name)
        if bad:
            return "hạt %d bước %d (sau %s): %s" % (seed, step, name, bad), stats
    return "", stats


print("== %d hạt × %d bước thao tác ngẫu nhiên" % (SEEDS, STEPS))
tot_ok = tot_no = 0
for seed in range(SEEDS):
    bad, stats = run_seed(seed)
    tot_ok += stats["ok"]; tot_no += stats["từ chối"]
    ok(not bad, "hạt %d: %d thao tác được, %d bị từ chối, bất biến giữ nguyên%s" % (seed, stats["ok"], stats["từ chối"], "" if not bad else " — " + bad))
ok(tot_ok > SEEDS * STEPS * 0.2, "đủ thao tác thành công để có ý nghĩa (%d được / %d bị từ chối)" % (tot_ok, tot_no))

print("== mua trừ đúng giá niêm yết (mọi món bán ở cửa hàng, mọi mẫu tường / sàn)")
st = core.GardenState(os.path.join(TMP, "gia", "state.json"))
d = st.load(); d["coins"] = 10 ** 7; st.save(d)
for _ in range(7):
    st.build()
for z in core.ZONE_IDS:
    st.unlock_zone(z)
wrong = []
for iid, it in core.CATALOG.items():
    if it.get("rare") or it.get("only") or it.get("season"):
        continue
    c0 = st.load()["coins"]
    st.buy(iid)
    if c0 - st.load()["coins"] != it["price"]:
        wrong.append(iid)
ok(not wrong, "cửa hàng: mọi món trừ đúng giá" + (" — sai: " + ",".join(wrong) if wrong else ""))
wrong = []
for did, it in D.PRESETS.items():
    c0 = st.load()["coins"]
    st.decor_buy(did)
    if c0 - st.load()["coins"] != it["price"]:
        wrong.append(did)
ok(not wrong and len(st.load()["more"][D.DECOR_KEY]["own"]) == len(D.PRESETS), "tường / sàn: mọi mẫu trừ đúng giá")
total = sum(v["price"] for v in D.PRESETS.values())
ok(5000 <= total <= 8000, "mua hết 21 mẫu tường / sàn: %d xu" % total)

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
for m in FAIL:
    print("  ✗ " + m)
sys.exit(1 if FAIL else 0)
