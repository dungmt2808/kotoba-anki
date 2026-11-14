"""Test offline 1.30 (python thường + git): ma trận "máy khác còn bản cũ" — một vườn đầy đủ của 1.30 (đồ của mọi tầng lưu,
nhà 3 gian, tường & sàn + mẫu tự vẽ, món tự làm, thú, giống, vùng tự tạo, giống tự vẽ, vé giữ chuỗi, gói báo, đồ mặc, giao
diện mùa) được MÃ THẬT của từng bản cũ (lấy từ git) đọc, dùng (cộng xu, mua + đặt một ghế gỗ) rồi lưu; sau đó 1.30 đọc lại:
không được mất gì. Đây là tình huống thật khi đồng bộ AnkiWeb giữa hai máy mà một máy chưa cập nhật.

Bản cũ thử: 1.23.0 (ba0aa5a) · 1.24.0 (bc66f66) · 1.25.0 (1912fb7) · 1.26.1 (6021c57) · 1.28.0 (59e43c5).
Ngoại lệ đã ghi trong tài liệu: bản ≤ 1.23 không biết hai gian bên (đồ ở đó vẫn nằm nguyên vì bản cũ không đụng khoá NHA).

Chạy: python test_ban_cu.py THƯ_MỤC_ADD_ON
"""
import json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import garden_core as core
import more_core

D = core.decor
FAIL = []
TMP = tempfile.mkdtemp(prefix="kbold_")
OLD = [("1.23.0", "ba0aa5a"), ("1.24.0", "bc66f66"), ("1.25.0", "1912fb7"), ("1.26.1", "6021c57"), ("1.28.0", "59e43c5")]


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def rich(path):
    """Vườn đầy đủ của 1.30."""
    st = core.GardenState(path)
    st.today_override = 500
    d = st.load(); d["coins"] = 10 ** 6; st.save(d)
    for _ in range(7):
        st.build()
    for z in core.ZONE_IDS:
        st.unlock_zone(z)
    st.open_rooms()
    st.buy_style("minka"); st.use_style("classic")
    put = [("yard", "bench", 6, 1), ("yard", "sunflower", 8, 1), ("yard", "pond", 10, 2), ("beach", "parasol", 6, 1), ("onsen", "rotenburo", 7, 1),
           ("station", "vending", 6, 0), ("room", "desk", 2, 1), ("room", "radio", 1, 3), ("room", "painting", 1, 0),
           ("kitchen", "nagashi", 2, 1), ("kitchen", "plant", 8, 2), ("bedroom", "beddo", 1, 2), ("bedroom", "clock", 3, 0)]
    for sc, iid, x, y in put:
        st.buy(iid); st.place(sc, iid, x, y)
    st.find_reward(0, "tukinh"); st.place("room", "tukinh", 6, 1)
    st.find_reward(0, "ashiyu"); st.place("yard", "ashiyu", 13, 1)
    d = st.load(); d["home"]["owned"]["shika"] = 1; st.save(d); st.place("yard", "shika", 15, 0)        # món hiếm 1.16 (tầng SEASON)
    theme = core.season.THEME_IDS[0]
    st.unlock_theme(theme, "coins")
    st.buy_wear("straw"); st.buy_face("wink")
    st.decor_buy("w_sakura"); st.decor_buy("f_tatami")
    st.decor_use("room", "wall", "w_sakura"); st.decor_use("bedroom", "floor", "f_tatami")
    t = st.tile_save({"name": "Sọc", "kind": "wall", "px": more_core.px_encode(("k." * 8) * 16)})
    st.decor_use("kitchen", "wall", t["tile_id"])
    c = st.craft_save({"name": "Đèn", "size": 16, "kind": "floor", "fx": "hearts", "px": more_core.px_encode(("y" * 16) * 16)})
    st.place("bedroom", c["craft_id"], 6, 2)
    st.pet_buy("neko"); st.pet_move("neko", "room"); st.seed_buy(list(more_core.SEEDS)[0])
    cv = more_core.catalog_view()["uzone"]
    z = st.zone_save({"name": "Đảo", "bg": cv["bg"][0]["id"], "ground": cv["ground"][0], "hills": cv["hills"][0],
                      "px": more_core.px_encode(("k" * 64) * 3 + "." * (64 * 73)), "env": ""})
    st.buy("bench"); st.place(z["zone_id"], "bench", 6, 1)
    st.myseed_save({"name": "Giống", "st": [more_core.px_encode(("g" * 16) * 16)] * 5})
    import datetime as dt
    st.freeze_buy(dt.date(2026, 11, 13))
    st.paper_sub_buy("tuan", "2026-11-13")
    return st


def view(st):
    d = st.load()
    home = d["home"]
    scenes = sorted(k for k, v in home.items() if isinstance(v, list) and v and all(isinstance(e, dict) for e in v))
    m = d["more"]
    return {
        "owned": dict(home["owned"]), "places": {sc: sorted((e["id"], e["x"], e["y"]) for e in home[sc]) for sc in scenes},
        "house": home["house"], "zones": home["zones"], "rooms": home["rooms"], "styles": home["styles"], "style": home["style"],
        "wear": d["wear"], "craft": d["craft"], "season_unlocked": d["season"]["unlocked"],
        "decor": m[D.DECOR_KEY], "pets": sorted(m["pets"]), "seeds": m["seeds"]["owned"], "uzones": [z["id"] for z in m["zones"]],
        "myseeds": sorted(m["myseeds"]["items"]), "freeze": m["freeze"]["n"], "sub": m["paper_sub"].get("until"),
        "px": dict(st.load_px()),
    }


SCRIPT = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
st.today_override = 500
d = st.load(); d["coins"] += 77; st.save(d)
st.buy("fence"); st.place("yard", "fence", 4, 0)
st.save(st.load())
px = st.load_px(); st.save_px(px)
d = st.load()
print(json.dumps({"coins": d["coins"], "decor": hasattr(core, "decor"), "rooms": d["home"].get("rooms")}))
'''

print("== vườn 1.30 đầy đủ qua tay từng bản cũ")
for ver, commit in OLD:
    o = os.path.join(TMP, "old_" + ver)
    try:
        os.makedirs(o)
        arch = subprocess.run(["git", "-C", REPO, "archive", commit, "kotoba_batake"], capture_output=True, check=True).stdout
        subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
    except Exception as e:      # không có git / commit (vd. chạy trên gói đã giải nén ngoài repo)
        print("  (bỏ qua %s: %s)" % (ver, str(e)[:80]))
        continue
    st = rich(os.path.join(TMP, "w_" + ver, "state.json"))
    before = view(st)
    r = subprocess.run([sys.executable, "-c", SCRIPT, os.path.join(o, "kotoba_batake"), STUBS, st.path], capture_output=True, text=True)
    if r.returncode != 0:
        ok(False, "%s: mã cũ chạy lỗi trên ví 1.30: %s" % (ver, r.stderr[-400:]))
        continue
    out = json.loads(r.stdout.strip().splitlines()[-1])
    after = view(st)
    want = json.loads(json.dumps(before))
    want["owned"]["fence"] = want["owned"].get("fence", 0) + 1
    want["places"]["yard"] = sorted(want["places"]["yard"] + [["fence", 4, 0]])
    got = json.loads(json.dumps(after))
    diff = [k for k in want if want[k] != got[k]]
    ok(not diff, "%s (%s): 1.30 đọc lại không mất gì%s" % (ver, commit, "" if not diff else " — khác: " + ", ".join(
        "%s: %s → %s" % (k, json.dumps(want[k], ensure_ascii=False)[:160], json.dumps(got[k], ensure_ascii=False)[:160]) for k in diff)))
    c_now = st.load()["coins"]
    ok(c_now == out["coins"] and out["decor"] is False, "%s: xu khớp với thao tác của bản cũ (%d), bản cũ không biết tường & sàn" % (ver, c_now))

print("== hai lượt qua lại 1.28 ↔ 1.30")
o = os.path.join(TMP, "old_1.28.0", "kotoba_batake")
if os.path.isdir(o):
    st = rich(os.path.join(TMP, "w_pp", "state.json"))
    base = view(st)
    for i in range(3):
        r = subprocess.run([sys.executable, "-c", SCRIPT.replace('st.buy("fence"); st.place("yard", "fence", 4, 0)', ''), o, STUBS, st.path], capture_output=True, text=True)
        st.decor_use("room", "floor", "f_tatami" if i % 2 == 0 else "none")
    now = view(st)
    keep = [k for k in base if k not in ("decor",) and base[k] != now[k]]
    ok(r.returncode == 0 and not keep and now["decor"]["own"] == base["decor"]["own"] and now["decor"]["mine"] == base["decor"]["mine"],
       "3 vòng 1.28 lưu → 1.30 đổi sàn: không trôi dữ liệu" + ("" if not keep else " — khác: " + ",".join(keep)))

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
for m in FAIL:
    print("  ✗ " + m)
sys.exit(1 if FAIL else 0)
