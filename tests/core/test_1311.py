"""Test offline 1.31.1 (python thường; ANKI_PY thì thêm collection Anki thật): sửa 8 lỗi của nhánh
audit/release-review-1.31-2026-11-14 — phần dữ liệu, kiểm rộng hơn bộ test của audit.

1. backup_core: đường dẫn sao lưu theo hồ sơ (F03), file chung cũ vẫn đọc được (đúng chủ), hai hồ sơ không ghi đè nhau,
   ho_so.txt; commit_config: bỏ qua khoá không đổi, lỗi một khoá → trả các khoá đã ghi về như cũ (khoá chưa có thì xoá),
   không trả về được → báo "partial".
2. Ma trận lỗi ghi (F06) cho MỌI thao tác của ví — mua đồ, xây nhà, mở vùng, kiểu nhà, đồ mặc, biểu cảm, đồ tự vẽ (tạo /
   sửa / xoá), món chế tác (tạo / sửa / nhân bản / xoá), giống cây tự vẽ, vùng tự tạo, giấy dán tường / sàn, mẫu tự vẽ, thú
   nuôi, hạt giống, vé giữ chuỗi, gói báo, đặt / dời / cất đồ, nhặt đồ, ôn thẻ, mục tiêu ngày, trò chơi: lỗi ở từng khoá
   (một lần / mãi) → ném StoreError + collection y như trước (xu, đồ, điểm ảnh); không lỗi → đọc lại đúng như đã báo.
   Móc Undo (on_save) chỉ chạy khi ví đã ghi được.
3. F04: ví có đồ có sẵn + đồ tự vẽ cùng "đang mặc" ở một chỗ (máy còn 1.30.3) → món có sẵn thắng, món tự vẽ còn trong tủ,
   lưu lại thì collection hết mâu thuẫn; bốn chỗ mặc; chỗ khác không bị đụng.
4. Nhật ký / album khách / sổ sinh hoạt / Hộp sưu tầm / báo: file sao lưu theo hồ sơ; nhật ký ghi collection lỗi → chữ
   vẫn ra file sao lưu của hồ sơ rồi báo lỗi; báo (PaperState) lỗi ghi → StoreError (trước: nuốt lỗi).
5. Soát mã các lỗi giao diện (F01 mã phiên / mã lệnh Xưởng, F02 bẫy focus hộp hỏi, F05 không vẽ khi Xưởng đã đóng,
   F07 thế hệ khoá Gemini, F08 trả thẻ khi chấm lỗi, nhật ký giữ chữ khi lưu lỗi) — hành vi thật kiểm ở tests/anki/e2e_1311.js
   và tests/audit_20261114/*.

Chạy: python test_1311.py THƯ_MỤC_ADD_ON
"""
import copy
import datetime as dt
import json
import os
import re
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection as _real  # noqa: F401
    REAL_ANKI = hasattr(_real, "Collection") and hasattr(_real.Collection, "set_config")
except ImportError:
    sys.path.insert(0, STUBS)
    REAL_ANKI = False
import backup_core as B
import garden_core as core
import journal_core as journal
import guest_core as guests
import life_core as life
import finds_core as finds
import paper_core as paper

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1311_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*p):
    with open(os.path.join(ADDON, *p), encoding="utf-8") as f:
        return f.read()


class Boom(OSError):
    pass


class Col:
    """Collection giả: cấu hình là dict (lưu dạng JSON như Anki), `path` theo hồ sơ, lỗi ghi theo khoá."""

    def __init__(self, name="Test"):
        self.path = os.path.join(TMP, "profiles", name, "collection.anki2")
        self.conf = {}
        self.fail = {}          # khoá → "once" | "always"
        self.fail_remove = False
        self.writes = []

    def get_config(self, key, default=None):
        return json.loads(self.conf[key]) if key in self.conf else default

    def set_config(self, key, val, **kw):
        mode = self.fail.get(key)
        if mode:
            if mode == "once":
                self.fail.pop(key)
            raise Boom(28, "đĩa đầy (giả) khi ghi " + key)
        self.writes.append(key)
        self.conf[key] = json.dumps(val, ensure_ascii=False)

    def remove_config(self, key):
        if self.fail_remove:
            raise Boom(28, "không xoá được " + key)
        self.conf.pop(key, None)


def raises(fn, cls=Exception, text=None):
    try:
        fn()
    except cls as err:
        return text is None or text in str(err)
    return False


# ---------------------------------------------------------------------------------------------------------------------
print("== 1. backup_core: sao lưu theo hồ sơ (F03)")
A, Bc = Col("A"), Col("B")
base = os.path.join(TMP, "uf")
os.makedirs(base, exist_ok=True)
pa = B.profile_path(os.path.join(base, "state.json"), A)
pb = B.profile_path(os.path.join(base, "state.json"), Bc)
ok(pa != pb and B.PROFILE_DIR in pa and pa.endswith("state.json"), "hai hồ sơ → hai đường dẫn sao lưu khác nhau")
ok(B.profile_path(os.path.join(base, "state.json"), None) == os.path.join(base, "state.json"),
   "không biết hồ sơ (không có collection) → file chung như cũ")
jp = B.profile_path(os.path.join(base, "journal", "2026_11.json"), A, keep=2)
ok(jp == os.path.join(base, B.PROFILE_DIR, B.profile_key(A), "journal", "2026_11.json"),
   "nhật ký: user_files/ho_so/<mã>/journal/2026_11.json (cùng thư mục hồ sơ với ví)")
B.write_backup(os.path.join(base, "state.json"), B.backup_payload({"coins": 1}, A), A)
B.write_backup(os.path.join(base, "state.json"), B.backup_payload({"coins": 2}, Bc), Bc)
ok(B.read_backup(os.path.join(base, "state.json"), A) == {"coins": 1}, "hồ sơ B lưu không ghi đè sao lưu của A")
ok(B.read_backup(os.path.join(base, "state.json"), Bc) == {"coins": 2}, "B đọc đúng của B")
note = os.path.join(base, B.PROFILE_DIR, B.profile_key(A), "ho_so.txt")
ok(os.path.isfile(note) and "A" in open(note, encoding="utf-8").read(), "ho_so.txt ghi tên thư mục hồ sơ (biết thư mục nào của ai)")
ok(not os.path.exists(os.path.join(base, "state.json")), "không ghi file chung khi biết hồ sơ")
# file chung cũ (≤ 1.31.0) của A: A còn đọc được khi chưa có file trong thư mục hồ sơ; B không đọc được
legacy = os.path.join(base, "more.json")
with open(legacy, "w", encoding="utf-8") as f:
    json.dump(B.backup_payload({"pets": {"x": 1}}, A), f)
ok(B.read_backup(legacy, A) == {"pets": {"x": 1}}, "file chung cũ đúng chủ A → A đọc được (nâng cấp không mất sao lưu)")
ok(B.read_backup(legacy, Bc) is None, "file chung cũ của A → B không đọc (1.23 KB-02 vẫn giữ)")
ok(B.read_backup(legacy, None) is not None, "không có collection → đọc nguyên file chung")
B.write_backup(legacy, B.backup_payload({"pets": {"y": 2}}, A), A)
ok(B.read_backup(legacy, A) == {"pets": {"y": 2}}, "có file trong thư mục hồ sơ → ưu tiên file đó (mới hơn)")
with open(B.profile_path(legacy, Bc), "w", encoding="utf-8") as f:
    f.write("{hỏng")
ok(B.read_backup(legacy, Bc) is None, "file hồng / JSON hỏng → None (không ném lỗi)")
with open(B.profile_path(legacy, Bc), "w", encoding="utf-8") as f:
    json.dump(B.backup_payload({"pets": {}}, A), f)
ok(B.read_backup(legacy, Bc) is None, "file trong thư mục B nhưng ghi chủ A (chép tay nhầm) → B không nhận")

print("== 1b. commit_config: một lần lưu nhiều khoá")
c = Col()
c.conf["k1"] = json.dumps({"a": 1})
done = B.commit_config(c, [("k1", {"a": 1}), ("k2", {"b": 2})])
ok(done == ["k2"] and c.writes == ["k2", B.REV_KEY],
   "khoá không đổi không ghi (đỡ ghi, giữ Redo của Anki); 1.31.2: có khoá được ghi thì đóng dấu phiên bản")
w0 = list(c.writes)
ok(B.commit_config(c, [("k1", {"a": 1}), ("k2", {"b": 2})]) == [] and c.writes == w0,
   "1.31.2: không khoá nào đổi → không ghi gì, kể cả dấu phiên bản (Redo của Anki còn nguyên)")
c = Col()
c.conf["k1"] = json.dumps({"v": "cũ"})
c.fail["k3"] = "once"
ok(raises(lambda: B.commit_config(c, [("k1", {"v": "mới"}), ("k2", {"v": 2}), ("k3", {"v": 3})]), B.StoreFailed),
   "khoá thứ ba lỗi → StoreFailed")
ok(c.get_config("k1") == {"v": "cũ"} and "k2" not in c.conf and "k3" not in c.conf,
   "khoá đã ghi trả về giá trị cũ, khoá chưa có thì xoá — collection y như trước")
c = Col()
c.fail["k2"] = "always"
c.fail_remove = True
try:
    B.commit_config(c, [("k1", {"v": 1}), ("k2", {"v": 2})])
    got = None
except B.StoreFailed as err:
    got = err
ok(got is not None and got.partial and str(got) == B.SAVE_PARTIAL, "không trả về được (xoá cũng lỗi) → partial + câu nhắc mở lại vườn")
ok(got is not None and not B.SAVE_FAILED.startswith("Anki báo lỗi khi lưu.") and "chưa đổi gì" in B.SAVE_FAILED,
   "câu lỗi thường nói rõ chưa đổi gì")


class Unreadable(Col):
    def get_config(self, key, default=None):
        if key == "k1":
            raise RuntimeError("đọc lỗi")
        return super().get_config(key, default)


c = Unreadable()
c.fail["k2"] = "once"
try:
    B.commit_config(c, [("k1", {"v": 1}), ("k2", {"v": 2})])
    got = None
except B.StoreFailed as err:
    got = err
ok(got is not None and got.partial, "khoá không đọc được giá trị cũ mà đã ghi → không trả về được → partial (không giả vờ)")

# ---------------------------------------------------------------------------------------------------------------------
print("== 2. ma trận lỗi ghi cho mọi thao tác của ví (F06)")
KEYS = [core.PX_KEY, core.EXT_KEY, core.SEASON_KEY, core.MORE_KEY, core.NHA_KEY, core.MOBILE_KEY, core.CONFIG_KEY]
SHELL = {"slot": "shell", "c": ["g", "G"], "name": "Vỏ"}
HAT = {"slot": "head", "px": "160r", "name": "Mũ"}
TILE = "256g"
SEED = ["", "256g", "256r", "", "256y"]
YARD = next(k for k, v in core.CATALOG.items() if not v.get("rare") and not v.get("only") and not v.get("zone")
            and not v.get("season") and v["scene"] == "yard")
ROOM = next(k for k, v in core.CATALOG.items() if not v.get("rare") and not v.get("only") and not v.get("zone")
            and not v.get("season") and v["scene"] == "room")
STYLE = next(s for s in core.HOUSE_STYLES if core.HOUSE_STYLES[s].get("price"))
WEAR0 = next(iter(core.WEAR))
FACE0 = next(iter(core.FACES))
PET0 = next(iter(core.more.PETS))
SEED0 = next(iter(core.more.SEEDS))
DECOR0 = next(d for d in core.decor.WALLS if d not in core.decor.HOUSE)
TODAY = dt.date(2026, 11, 15)


_FIX = [0]


def _spots():
    """Hai chỗ đặt hợp lệ cho món ở sân (theo luật đặt đồ thật)."""
    home = core._empty_home()
    home["house"] = len(core.HOUSE_LEVELS) - 1
    home["owned"][YARD] = 2
    out = []
    for y in range(0, 60, 2):
        for x in range(0, 300, 6):
            try:
                core.check_spot(home, "yard", YARD, x, y)
            except core.HomeError:
                continue
            out.append((x, y))
            home["yard"].append({"id": YARD, "x": x, "y": y})
            if len(out) == 3:
                return out
    return out


SPOTS = _spots()


def fixture(name):
    _FIX[0] += 1                 # mỗi lần một hồ sơ mới (cùng hồ sơ thì vườn trống sẽ lấy lại từ file sao lưu — đúng thiết kế)
    name = "%s_%d" % (name, _FIX[0])
    col = Col(name)
    st = core.GardenState(os.path.join(TMP, "s_" + name, "state.json"), col_getter=lambda: col)
    st.today_override = 1000
    d = st.load()
    d["coins"] = 100000
    d["home"].update(house=len(core.HOUSE_LEVELS) - 1, rooms=["kitchen", "bedroom"])
    d["home"]["owned"][YARD] = 2
    d["wear"]["owned"].append(WEAR0)
    d["mobile"] = core.new_mobile(1)
    st.save(d)
    st.place("yard", YARD, *SPOTS[0])                      # một cái đã đặt (dời / cất), một cái trong kho (đặt)
    st.mywear_save(dict(HAT, name="Mũ cũ"))               # w1 (để sửa / xoá)
    st.craft_save({"size": 16, "kind": "ground", "px": "256r", "name": "Ghế"})   # c1
    st.tile_save({"kind": "floor", "px": TILE, "name": "Sàn"})                    # t1
    st.myseed_save({"name": "Cà", "st": SEED})                                    # g1
    st.pet_buy(PET0)
    col.writes.clear()
    return col, st


OPS = [
    ("mua đồ sân", lambda s: s.buy(YARD)),
    ("mua nội thất", lambda s: s.buy(ROOM)),
    ("mở vùng", lambda s: s.unlock_zone(core.ZONES[0]["id"])),
    ("mua kiểu nhà", lambda s: s.buy_style(STYLE)),
    ("mua đồ mặc", lambda s: s.buy_wear(next(w for w in core.WEAR if w != WEAR0))),
    ("mặc đồ có sẵn (thay mũ tự vẽ)", lambda s: s.put_on(WEAR0)),
    ("cởi", lambda s: s.take_off("head")),
    ("mua biểu cảm", lambda s: s.buy_face(FACE0)),
    ("tạo vỏ tự vẽ", lambda s: s.mywear_save(SHELL)),
    ("tạo mũ tự vẽ", lambda s: s.mywear_save(dict(HAT, px="160g"))),
    ("vẽ lại mũ (50 xu)", lambda s: s.mywear_save({"id": "w1", "slot": "head", "px": "160y", "name": "Mũ cũ"})),
    ("đổi tên mũ (miễn phí)", lambda s: s.mywear_save({"id": "w1", "slot": "head", "px": "160r", "name": "Mũ đỏ"})),
    ("xoá mũ tự vẽ", lambda s: s.mywear_delete("w1")),
    ("chế tác món mới", lambda s: s.craft_save({"size": 16, "kind": "ground", "px": "256y", "name": "Bàn"})),
    ("vẽ lại món chế tác", lambda s: s.craft_save({"id": "c1", "size": 16, "kind": "ground", "px": "256g", "name": "Ghế"})),
    ("nhân bản món chế tác", lambda s: s.craft_copy("c1")),
    ("xoá món chế tác", lambda s: s.craft_delete("c1")),
    ("mẫu sàn tự vẽ", lambda s: s.tile_save({"kind": "wall", "px": TILE, "name": "Tường"})),
    ("xoá mẫu sàn", lambda s: s.tile_delete("t1")),
    ("mua giấy dán tường / sàn", lambda s: s.decor_buy(DECOR0)),
    ("giống cây tự vẽ", lambda s: s.myseed_save({"name": "Ớt", "st": SEED})),
    ("xoá giống cây", lambda s: s.myseed_delete("g1")),
    ("vùng tự tạo", lambda s: s.zone_save({"name": "Vùng", "bg": "day", "ground": "grass", "hills": "none", "px": "", "env": ""})),
    ("nuôi thú", lambda s: s.pet_buy(next(p for p in core.more.PETS if p != PET0))),
    ("mua hạt giống", lambda s: s.seed_buy(SEED0)),
    ("vé giữ chuỗi", lambda s: s.freeze_buy(TODAY)),
    ("gói báo", lambda s: s.paper_sub_buy("tuan", TODAY.isoformat())),
    ("đặt đồ", lambda s: s.place("yard", YARD, *SPOTS[1])),
    ("dời đồ", lambda s: s.move("yard", 0, *SPOTS[2])),
    ("cất đồ", lambda s: s.take("yard", 0)),
    ("nhặt đồ (+xu, quà)", lambda s: s.find_reward(3, next(iter(core.FIND_ITEMS)))),
    ("ôn thẻ (+xu)", lambda s: s.record_answer(3, 1, 2, day=1000, before="review")),
    ("mục tiêu ngày", lambda s: s.claim_goal(1000, 30, 30, 20)),
    ("trò chơi (+xu)", lambda s: s.record_game("memory", 10, 5, "2026-11-15", 40, True)),
]


def snap(col, st):
    d = st.load()
    return {"coins": d["coins"], "home": d["home"], "wear": d["wear"], "craft": d["craft"],
            "more": {k: v for k, v in d["more"].items()}, "px": st.load_px(),
            "conf": {k: col.conf.get(k) for k in KEYS}}


n_cases = n_bad = 0
for name, op in OPS:
    col, st = fixture("ctl")
    before = snap(col, st)
    try:
        rep = op(st)
        err = None
    except core.HomeError as e:
        rep, err = None, e
    if err is not None:
        ok(False, f"[{name}] thao tác đối chứng chạy được (lỗi: {err})")
        continue
    after = snap(col, st)
    changed = [k for k in KEYS if before["conf"][k] != after["conf"][k]]
    for key in changed:
        for mode in ("once", "always"):
            n_cases += 1
            col, st = fixture("f")
            before = snap(col, st)
            col.fail[key] = mode
            hooked = []
            st.on_save = lambda d: hooked.append(1)
            try:
                op(st)
                raised = None
            except core.StoreError as e:
                raised = e
            except Exception as e:     # lỗi khác loại = sai
                raised = e
            col.fail.clear()
            now = snap(col, st)
            good = (isinstance(raised, core.StoreError) and now == before and not hooked)
            if not good:
                n_bad += 1
                ok(False, f"[{name}] lỗi ghi {key} ({mode}) → StoreError + collection như cũ + chưa đánh dấu Undo "
                          f"(ném {type(raised).__name__}, đổi: {[k for k in now if now[k] != before[k]]})")
    # đối chứng: không lỗi → đọc lại đúng như đã báo
    col, st = fixture("ok")
    rep = op(st)
    if isinstance(rep, dict) and "coins" in rep:
        d = st.load()
        same = d["coins"] == rep["coins"] and d["home"] == rep["home"] and d["more"]["mywear"] == rep["more"]["mywear"]
        ok(same, f"[{name}] không lỗi: đọc lại khớp với kết quả đã báo")
ok(n_bad == 0, f"{n_cases} ca lỗi ghi (mỗi khoá thao tác đổi × một lần / mãi): đều báo lỗi, không còn nửa lần lưu")
ok(n_cases > 100, f"ma trận đủ rộng ({n_cases} ca)")

print("== 2b. sổ bù xu điện thoại + ví cùng một lần lưu")
col, st = fixture("mob")
d = st.load()
d["mobile"]["total"]["reviews"] = 7
d["coins"] += 70
col.fail[core.CONFIG_KEY] = "once"
ok(raises(lambda: st.save(d), core.StoreError), "ví lỗi → StoreError")
d2 = st.load()
ok(d2["mobile"]["total"]["reviews"] == 0 and d2["coins"] == d["coins"] - 70,
   "sổ bù xu trả về như cũ (không ghi \"đã bù\" mà xu chưa vào ví → không mất xu điện thoại)")

print("== 2c. không có collection (test / chưa mở hồ sơ): file là nơi lưu chính")
st = core.GardenState(os.path.join(TMP, "nocol", "state.json"))
d = st.load()
d["coins"] = 5
st.save(d)
ok(st.load()["coins"] == 5 and os.path.isfile(os.path.join(TMP, "nocol", "state.json")), "ghi / đọc file chung như cũ")

print("== 3. F04: đồ có sẵn + đồ tự vẽ cùng chỗ (máy còn 1.30.3)")
for slot, wid in (("head", "straw"), ("face", None), ("neck", None), ("shell", None)):
    wid = wid or next(w for w in core.WEAR if core.WEAR[w]["slot"] == slot)
    col, st = fixture("f04_" + slot)
    d = st.load()
    mine = d["more"]["mywear"]
    payload = SHELL if slot == "shell" else {"slot": slot, "px": "%dr" % (core.wear.GRID[slot][0] * core.wear.GRID[slot][1]),
                                             "name": "Tự vẽ"}
    nd = st.mywear_save(payload)
    new_id = nd["mywear_id"]
    # mã cũ (1.30.3) mua món có sẵn cùng chỗ: chỉ biết ví, giữ nguyên khoá "mywear" của more
    w = json.loads(col.conf[core.CONFIG_KEY])
    w.setdefault("wear", {}).setdefault("owned", []).append(wid)
    w["wear"].setdefault("on", {})[slot] = wid
    col.conf[core.CONFIG_KEY] = json.dumps(w)
    got = st.load()
    ok(got["wear"]["on"].get(slot) == wid and slot not in got["more"]["mywear"]["on"],
       f"{slot}: món có sẵn vừa mua ở máy cũ thắng, món tự vẽ không còn \"đang mặc\"")
    ok(new_id in got["more"]["mywear"]["items"], f"{slot}: món tự vẽ vẫn trong tủ")
    other = [s for s, v in got["more"]["mywear"]["on"].items()]
    ok(all(s != slot for s in other), f"{slot}: không chỗ nào có hai món")
    st.save(got)
    raw_more = json.loads(col.conf[core.MORE_KEY])
    ok(slot not in (raw_more.get("mywear") or {}).get("on", {}), f"{slot}: lưu lại → collection hết mâu thuẫn")
col, st = fixture("f04_keep")
st.mywear_save(SHELL)                   # vỏ tự vẽ đang mặc, mũ tự vẽ w1 đang mặc
w = json.loads(col.conf[core.CONFIG_KEY])
w["wear"]["owned"].append("straw")
w["wear"]["on"]["head"] = "straw"
col.conf[core.CONFIG_KEY] = json.dumps(w)
got = st.load()
ok(got["more"]["mywear"]["on"].get("shell") and got["wear"]["on"].get("head") == "straw" and "head" not in got["more"]["mywear"]["on"],
   "chỉ chỗ bị mâu thuẫn đổi — vỏ tự vẽ vẫn đang mặc")

# ---------------------------------------------------------------------------------------------------------------------
print("== 4. nhật ký, album khách, sổ sinh hoạt, Hộp sưu tầm, báo")
ja, jb = Col("JA"), Col("JB")
folder = os.path.join(TMP, "uf2", "journal")
sa = journal.JournalStore(folder, col_getter=lambda: ja)
sb = journal.JournalStore(folder, col_getter=lambda: jb)
day = dt.date(2026, 11, 15)
sa.update(day, {"t": "nhật ký riêng của A"})
sb.update(day, {"t": "nhật ký của B"})
ra = json.load(open(sa._backup_path(2026, 11), encoding="utf-8"))
ok(ra[day.isoformat()]["t"] == "nhật ký riêng của A" and sa._backup_path(2026, 11) != sb._backup_path(2026, 11),
   "F03: B viết cùng tháng không ghi đè sao lưu nhật ký của A")
ok(not os.path.exists(sa._shared_path(2026, 11)), "không ghi file chung journal/2026_11.json khi biết hồ sơ")
ja.fail[journal.month_key(2026, 11)] = "always"
ok(raises(lambda: sa.update(day, {"t": "chữ gõ lúc đĩa đầy"})), "collection lỗi → báo lỗi (không im lặng)")
ra = json.load(open(sa._backup_path(2026, 11), encoding="utf-8"))
ok(ra[day.isoformat()]["t"] == "chữ gõ lúc đĩa đầy", "…nhưng chữ đã ra file sao lưu của hồ sơ (cứu được)")
ja.fail.clear()
ok(sa.entry(day).get("t") == "nhật ký riêng của A", "collection vẫn giữ bản đã lưu trước đó (không nửa vời)")
nocol = journal.JournalStore(os.path.join(TMP, "uf3", "journal"))
nocol.update(day, {"t": "không collection"})
ok(nocol.entry(day).get("t") == "không collection", "không có collection: file chung là nơi lưu (như cũ)")

for mod, cls, fname, call in ((guests, "GuestStore", "guests.json", lambda s: s.met(next(iter(guests.GUESTS)), "yard", day)),
                              (life, "LifeStore", "life.json", lambda s: s.mark(next(iter(life.ACTS)), "yard", day))):
    ca, cb = Col(cls + "A"), Col(cls + "B")
    p = os.path.join(TMP, "uf4", fname)
    a = getattr(mod, cls)(p, col_getter=lambda: ca)
    b = getattr(mod, cls)(p, col_getter=lambda: cb)
    try:
        call(a)
        call(b)
        ok(os.path.isfile(B.profile_path(p, ca)) and os.path.isfile(B.profile_path(p, cb)) and not os.path.exists(p),
           f"{fname}: mỗi hồ sơ một file sao lưu, không ghi file chung")
    except Exception as err:
        ok(False, f"{fname}: ghi được ({type(err).__name__}: {err})")
ca, cb = Col("EvA"), Col("EvB")
p = os.path.join(TMP, "uf4", "events.json")
ea, eb = finds.EventStore(p, col_getter=lambda: ca), finds.EventStore(p, col_getter=lambda: cb)
ev = ea.load()
ea.save(ev)
eb.save(eb.load())
ok(os.path.isfile(B.profile_path(p, ca)) and os.path.isfile(B.profile_path(p, cb)), "events.json: mỗi hồ sơ một file sao lưu")

pc = Col("PaperA")
ps = paper.PaperState(os.path.join(TMP, "uf5", "paper.json"), col_getter=lambda: pc)
st0 = ps.load()
ps.save(st0)
ok(os.path.isfile(B.profile_path(os.path.join(TMP, "uf5", "paper.json"), pc)), "báo: sao lưu trong thư mục hồ sơ")
pc.fail[paper.PAPER_KEY] = "always"
ok(raises(lambda: ps.save(dict(st0, read={"2026-11-15": {"q": [1]}})), core.HomeError),
   "báo: ghi collection lỗi → StoreError (trước: chỉ in ra, câu trả lời mất mà vẫn cộng xu)")

# ---------------------------------------------------------------------------------------------------------------------
print("== 5. soát mã các lỗi giao diện")
craft = src("web", "craft.js")
ok("let session = 0, reqSeq = 0;" in craft and craft.count("session++;") == 6,
   "F01: sáu hàm mở Xưởng (vật phẩm, vùng, giống, hình gốc, mẫu tường / sàn, đồ StackChan) đều mở phiên mới")
ok(re.search(r"function finish\(p, legacyNew\)[\s\S]{0,500}r\.session === session && isOpen", craft) is not None,
   "F01: trả lời lưu chỉ đóng Xưởng nếu đúng phiên đang mở")
ok(re.search(r"sess !== session \|\| !isOpen", craft) is not None, "F01: hộp hỏi của phiên đã đóng không gửi lệnh")
ok(all(("savedWear: function (p) { return finish(p" in craft, "saved: function (p) { return finish(p" in craft,
            "savedZone: function (p) { return finish(p" in craft, "savedSeed: function (p) { return finish(p" in craft,
            "savedTile: function (p) { return finish(p" in craft)), "F01: cả 5 kiểu lưu (món, vùng, giống, mẫu, đồ) dùng finish")
init = src("__init__.py")
ok('"rid": rid' in init and "def _craft_rid" in init and '"craftError"' in init,
   "F01: Python trả lời / báo lỗi kèm mã lệnh")
ok("if (!cv || !isOpen) { return; }" in craft and "if (isOpen) { draw(); }" in craft,
   "F05: không vẽ khi Xưởng đã đóng (pointerleave sau Esc)")
home = src("web", "home.js")
ok('(flat.slice(j * size, (j + 1) * size) + ".".repeat(size)).slice(0, size)' in home, "F05: pxRows không vỡ với chuỗi thiếu")
ui = src("web", "ui.js")
ok(re.search(r'if \(e\.key === "Tab"\) \{\s*e\.preventDefault\(\)', ui) is not None and "askFrom" in ui
   and 'document.addEventListener("focusin"' in ui, "F02: Tab giữ trong hộp hỏi, trả focus, focus không ra nền")
ok("if (at === yes) { askClose(true); } else if (at === no) { askClose(false); }" in ui,
   "F02: Enter chỉ mua khi đang chọn nút Mua")
ok("if (e.isComposing || e.keyCode === 229) { return; }" in ui, "F02: phím của bộ gõ không đóng hộp / không mua")
ok('"key_gen"' in init and 'if gen != _ai.get("key_gen", 0):' in init and '_ai["key_gen"] = _ai.get("key_gen", 0) + 1' in init,
   "F07: xoá khoá làm kết quả thử khoá cũ không lưu lại khoá")
ok("rev0 = _last_rev(card.id)" in init and 'self._js("reviewRetry"' in init and "reviewRetry: reviewRetry" in src("web", "garden.js"),
   "F08: chấm lỗi (chưa vào revlog) → trả thẻ, chấm lại được")
ok('"store_error": True' in init and 'r.get("ok") or not r.get("store_error")' in init,
   "nhật ký: lưu lỗi → báo trong bảng + giữ chữ để lưu nốt khi đóng (không bật hộp lỗi của Anki)")
# 1.33.3 (audit 17/11 F02): + lỗi đọc / ghi của lớp lưu (StoreFailed); sổ + xu ghi cùng một lần (test_1333)
ok("except (core.HomeError, backup_core.StoreFailed) as err:\n            self._js(\"paperError\", str(err))\n            return" in init,
   "báo: lưu câu trả lời lỗi → báo lỗi, không cộng xu")
ok(re.search(r"def finished\(fpath: str, success: bool\)[\s\S]{0,500}os\.remove\(tmp\)", init) is not None,
   "xuất PDF cuốn nhật ký lớn: file tạm (cả cuốn nhật ký) được xoá khi xong")

# ---------------------------------------------------------------------------------------------------------------------
if REAL_ANKI:
    print("== 6. collection Anki thật")
    from anki.collection import Collection
    folder = os.path.join(TMP, "real", "Prof")
    os.makedirs(folder, exist_ok=True)
    col = Collection(os.path.join(folder, "collection.anki2"))
    try:
        st = core.GardenState(os.path.join(TMP, "real", "uf", "state.json"), col_getter=lambda: col)
        st.today_override = 1000
        d = st.load()
        d["coins"] = 1000
        st.save(d)
        orig = Collection.set_config
        hit = []

        def bad(self, key, val, *a, **kw):
            if key == core.MORE_KEY and not hit:
                hit.append(key)
                raise OSError(28, "giả")
            return orig(self, key, val, *a, **kw)
        Collection.set_config = bad
        try:
            r = raises(lambda: st.mywear_save(SHELL), core.StoreError)
        finally:
            Collection.set_config = orig
        ok(r and hit and st.load()["coins"] == 1000 and not st.load()["more"]["mywear"]["items"],
           "Anki thật: lỗi khoá more → StoreError, xu còn 1.000, không có món nửa vời")
        d = st.mywear_save(SHELL)
        ok(d["coins"] == 850 and st.load()["coins"] == 850, "Anki thật: hết lỗi thì lưu được, trừ đúng 150 xu một lần")
        ok(os.path.isfile(core.profile_path(os.path.join(TMP, "real", "uf", "more.json"), col)),
           "Anki thật: sao lưu vào user_files/ho_so/<mã>/")
        col.set_config("kb_test_absent_probe", {"x": 1})
        col.remove_config("kb_test_absent_probe")
        ok(col.get_config("kb_test_absent_probe", None) is None, "Anki thật: remove_config dùng được (trả về khoá chưa có)")
    finally:
        col.close()
else:
    print("== 6. (bỏ qua collection Anki thật: không có gói anki — chạy bằng ANKI_PY)")

print("KẾT QUẢ:", "TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
