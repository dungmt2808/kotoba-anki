"""1.33.3 — kiểm chứng + sửa các lỗi của nhánh audit/release-review-1.33.2-2026-11-17, kịch bản NGOÀI các test có sẵn
(người dùng 17/11: "kiểm chứng và sửa một số lỗi được tìm ra ở nhánh audit-1.33.2-2026-11-17. tìm thêm xem còn lỗi nào nữa
không, tạo thêm các kịch bản và test ngoài các test đã có sẵn, ưu tiên các lỗi làm mất dữ liệu, UI").

Collection Anki THẬT (ANKI_PY), lỗi đưa vào API `get_config` / `set_config`, tiến trình con dừng bằng os._exit giữa hai lần ghi.
  1. F01 — đọc lỗi KÉO DÀI (mọi lần đọc khoá đó đều lỗi) ở từng kho: thao tác ghi từ chối, collection + file sao lưu không
     đổi một byte; vẽ vườn vẫn được (khoá hỏng ghi ở `_damaged`). Đọc lỗi MỘT lần: đọc lại được, không mất gì.
  2. F06 — trả lại dữ liệu sau đồng bộ bị lỗi: bản chụp tốt giữ kèm dấu "đang chờ"; lần đọc / ghi / đồng bộ / mở hồ sơ sau
     trả lại trước; lỗi kéo dài thì chặn ghi; người dùng tự khôi phục bản sao lưu của Anki thì bỏ chờ.
  3. F02 / F07 — lưu chung một lần: đã nhặt + xu, phiên gánh hàng + xu + món, câu báo + xu — lỗi ghi ở BẤT KỲ khoá nào →
     không đổi gì; thử lại → đúng một lần.
  4. F02 mở rộng — Anki tắt đột ngột giữa sổ bù xu và ví (tiến trình con os._exit ở từng ranh giới ghi, 3 lượt ôn liền):
     xu trả đúng một lần; mã THẬT của bản 1.31.3 đã phát hành đọc / ghi xen kẽ không làm sai.
  5. Soát mã: F03 (luật "báo mới từ mai" xét mọi báo), F04 (đọc báo cũ không cần khoá), F05 (dấu thẻ đủ cột lịch ôn +
     revlog), P3 (nhãn sau Undo), ngôn ngữ (StackChan không nói câu chỉ có tiếng Việt khi chọn tiếng nước ngoài, tiêu đề
     bảng trò chơi theo deck).
Chạy: ANKI_PY tests/core/test_1333.py [ADDON]
"""
from __future__ import annotations

import copy
import datetime as dt
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile
import time
from contextlib import contextmanager

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
from anki.collection import Collection  # noqa: E402
import backup_core as backup  # noqa: E402  (trước garden_core: cùng một module trạng thái — xem garden_core 1.33.3)
import garden_core as core  # noqa: E402
import guest_core as guests  # noqa: E402
import life_core as life  # noqa: E402
import finds_core as finds  # noqa: E402
import paper_core as paper  # noqa: E402
import journal_core as journal  # noqa: E402
import fields_core as fields  # noqa: E402
import sync_core as sync  # noqa: E402
import ma_cu  # noqa: E402

RESULTS: list[bool] = []
DAY = dt.date(2026, 11, 17)
TMP = tempfile.mkdtemp(prefix="kb1333_")


def ok(cond: bool, msg: str) -> None:
    RESULTS.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg, flush=True)


@contextmanager
def unreadable(col, keys, times=10 ** 9):
    """Mọi lần đọc các khoá `keys` lỗi (`times` lần đầu)."""
    orig = Collection.get_config
    hits = []

    def bad(self, name, *a, **kw):
        if self is col and name in keys and len(hits) < times:
            hits.append(name)
            raise OSError("TEST: không đọc được")
        return orig(self, name, *a, **kw)

    Collection.get_config = bad
    try:
        yield hits
    finally:
        Collection.get_config = orig


@contextmanager
def unwritable(col, keys, times=1):
    orig = Collection.set_config
    hits = []

    def bad(self, name, value, *a, **kw):
        if self is col and name in keys and len(hits) < times:
            hits.append(name)
            raise OSError("TEST: không ghi được")
        return orig(self, name, value, *a, **kw)

    Collection.set_config = bad
    try:
        yield hits
    finally:
        Collection.set_config = orig


def kb_keys(col):
    return {k: copy.deepcopy(v) for k, v in col.all_config().items() if k.startswith("kotoba_batake_") and k != backup.REV_KEY}


def files_of(folder):
    out = {}
    for root, _d, names in os.walk(folder):
        for n in names:
            p = os.path.join(root, n)
            if n.endswith(".tmp"):
                continue
            out[os.path.relpath(p, folder)] = hashlib.sha1(open(p, "rb").read()).hexdigest()
    return out


def new_col(name):
    folder = os.path.join(TMP, name)
    os.makedirs(folder)
    return Collection(os.path.join(folder, "collection.anki2")), os.path.join(folder, "user_files")


def rich_garden(col, uf):
    st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
    st.today_override = 500
    d = st.load(); d["coins"] = 100000; d["mobile"] = core.new_mobile(1_000_000_000_000); st.save(d)
    for _ in range(7):
        st.build()
    st.open_rooms()
    for iid, sc, x, y in [("bench", "yard", 6, 1), ("nagashi", "kitchen", 2, 1), ("beddo", "bedroom", 1, 2)]:
        st.buy(iid); st.place(sc, iid, x, y)
    st.unlock_zone(core.ZONE_IDS[0])
    st.pet_buy("neko"); st.buy_wear("straw")
    st.unlock_theme(core.season.THEME_IDS[0], "coins")
    st.mywear_save({"name": "Mũ thử", "slot": "head", "px": "160r"})
    return st


# ---------------------------------------------------------------------------
print("== 1. F01 — đọc lỗi kéo dài ở từng kho: không ghi, không đổi một byte; vườn vẫn vẽ được")
col, uf = new_col("f01")
st = rich_garden(col, uf)
gs = guests.GuestStore(os.path.join(uf, "guests.json"), lambda: col)
ls = life.LifeStore(os.path.join(uf, "life.json"), lambda: col)
es = finds.EventStore(os.path.join(uf, "events.json"), lambda: col)
ps = paper.PaperState(os.path.join(uf, "paper_en.json"), lambda: col, paper.PAPER_KEY_EN)
fs = fields.FieldStore(os.path.join(uf, "fields.json"), lambda: col)
js_ = journal.JournalStore(os.path.join(uf, "journal"), lambda: col)
gs.met(guests.ORDER[0], "yard", DAY - dt.timedelta(days=1))
ls.mark(life.ORDER[0], "room", DAY - dt.timedelta(days=1))
ev = es.load(); ev["found"][finds.BY_SCENE["yard"][0]] = {"d": DAY.isoformat(), "n": 1}; es.save(ev)
p0 = paper.empty_state(); paper.mark_read(p0, "2026-11-16"); ps.save(p0)
mid = str(col.models.all_names_and_ids()[0].id)
fs.set_model(mid, {"kind": "vocab", "f": {"word": "Front", "meaning": "Back"}, "name": "Basic"}, "ja")
js_.update(DAY - dt.timedelta(days=1), {"t": "Hôm qua phải còn."})

W = [core.CONFIG_KEY, core.EXT_KEY, core.SEASON_KEY, core.MORE_KEY, core.NHA_KEY, core.MOBILE_KEY]
OPS = [("cộng xu", lambda: st.add_coins(1)), ("mua + đặt ghế", lambda: (st.buy("bench"), st.place("yard", "bench", 9, 1))),
       ("thú nuôi", lambda: st.pet_buy("ahiru")), ("đồ tự vẽ", lambda: st.mywear_save({"name": "Vỏ", "slot": "shell", "c": ["r", "k"]}))]
for key in W + [core.PX_KEY]:
    for name, op in OPS:
        if key == core.PX_KEY and name != "đồ tự vẽ":
            continue
        before, fb = kb_keys(col), files_of(uf)
        err = ""
        with unreadable(col, {key}) as hits:
            try:
                op()
            except Exception as e:  # noqa: BLE001
                err = type(e).__name__
        ok(bool(hits) and err in ("StoreError", "ReadFailed") and kb_keys(col) == before and files_of(uf) == fb,
           f"{key} đọc lỗi kéo dài · {name}: từ chối ({err}), collection + file sao lưu không đổi")
with unreadable(col, {core.CONFIG_KEY, core.MORE_KEY}):
    d = st.load()
ok(set(d.get("_damaged") or []) >= {core.CONFIG_KEY, core.MORE_KEY}, "vẽ vườn khi đọc lỗi: load() vẫn chạy, ghi khoá hỏng: %s" % d.get("_damaged"))
with unreadable(col, {core.PX_KEY}):
    view_px = st.load_px(strict=False)
ok(view_px == {}, "điểm ảnh đọc lỗi: chỉ để vẽ danh mục → {} (không ném lỗi)")
for name, store, key, op in [
        ("album khách", gs, guests.GUEST_KEY, lambda: gs.met(guests.ORDER[1], "yard", DAY)),
        ("sổ sinh hoạt", ls, life.LIFE_KEY, lambda: ls.mark(life.ORDER[1], "yard", DAY)),
        ("Hộp sưu tầm", es, finds.EVENT_KEY, lambda: (lambda e: (finds.ensure_day(e, [], DAY), es.save(e)))(es.load())),
        ("tiến độ báo", ps, paper.PAPER_KEY_EN, lambda: (lambda s: (paper.mark_read(s, DAY.isoformat()), ps.save(s)))(ps.load())),
        ("Cấu hình trường", fs, fields.KEY, lambda: fs.set_model(mid, {"kind": "vocab", "f": {"word": "Back", "meaning": "Front"}, "name": "Basic"}, "ja")),
        ("nhật ký", js_, journal.month_key(DAY.year, DAY.month), lambda: js_.update(DAY, {"t": "Dòng mới"}))]:
    before = kb_keys(col)
    err = ""
    with unreadable(col, {key}) as hits:
        try:
            op()
        except Exception as e:  # noqa: BLE001
            err = type(e).__name__
    ok(bool(hits) and bool(err) and kb_keys(col) == before, f"{name} đọc lỗi kéo dài: từ chối ({err}), collection không đổi")
with unreadable(col, {guests.GUEST_KEY, life.LIFE_KEY, finds.EVENT_KEY, paper.PAPER_KEY_EN, fields.KEY}):
    shown = [gs.album(), ls.seen(), es.load().get("_damaged"), ps.load().get("_damaged"), fs.load().get("_damaged")]
ok(shown[0] == {} and shown[1] == {} and shown[2] is True and shown[3] is True and shown[4] is True,
   "chỉ để xem (Album / Sổ / Hộp / Kệ báo / Cấu hình trường) khi đọc lỗi: hiện trống tạm, có dấu _damaged, không ném lỗi")
# đọc lỗi MỘT lần: đọc lại được → làm được, không mất gì
c0 = col.get_config(core.CONFIG_KEY)["coins"]
for key in W:
    with unreadable(col, {key}, times=1) as hits:
        st.add_coins(1)
    ok(len(hits) == 1, f"{key} đọc lỗi một lần → đọc lại được, cộng xu bình thường")
d = st.load()
ok(d["coins"] == c0 + len(W) and "neko" in d["more"]["pets"] and d["home"]["house"] == 7 and d["more"]["mywear"]["items"],
   "sau %d lần đọc lỗi một lần: xu đúng (+%d), thú / nhà / đồ tự vẽ còn nguyên" % (len(W), len(W)))
with unreadable(col, {journal.month_key(DAY.year, DAY.month)}, times=1):
    js_.update(DAY, {"t": "Dòng đang gõ"})
m = js_.month(DAY.year, DAY.month)
ok(m.get((DAY - dt.timedelta(days=1)).isoformat(), {}).get("t") == "Hôm qua phải còn." and m.get(DAY.isoformat(), {}).get("t") == "Dòng đang gõ",
   "nhật ký đọc lỗi một lần: giữ cả tháng + lưu dòng mới (audit: đối chứng 'từ chối' nay đọc lại được)")
col.close()

# ---------------------------------------------------------------------------
print("== 2. F06 — trả lại dữ liệu sau đồng bộ bị lỗi ghi")


def sync_case(name):
    col, uf = new_col(name)
    st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
    st.today_override = 500
    d = st.load(); d["coins"] = 1000; d["home"]["house"] = 7; st.save(d)
    backup.put_config(col, core.START_KEY, {"ms": 1_000_000_000_000})
    old = copy.deepcopy(sync.state_of(col))
    st.pet_buy("neko")
    d = st.load(); d["coins"] = 2000; st.save(d)
    mine = sync.before_sync(col, uf)
    for k, v in old["keys"].items():
        col.set_config(k, v)                         # như cấu hình cũ vừa mang về
    return col, uf, st, mine


col, uf, st, mine = sync_case("f06a")
with unwritable(col, {core.CONFIG_KEY}):
    r = sync.after_sync(col, uf, mine)
rec = sync.read_record(uf, col)
ok(r["action"] == sync.FAILED and rec["pending"] and rec["h"] == mine["h"] and backup.PENDING is not None,
   "trả lại lỗi → bản chụp tốt còn nguyên, kèm dấu đang chờ (file) + móc chờ")
again = sync.before_sync(col, uf)
ok(again is not None and again["h"] == mine["h"] and sync.read_record(uf, col)["h"] == mine["h"],
   "đồng bộ lại khi còn chờ: before_sync dùng bản chờ (không chụp bản cũ đè lên)")
before = kb_keys(col)
with unwritable(col, {core.CONFIG_KEY}, times=10 ** 6):
    err = ""
    try:
        st.add_coins(1)
    except Exception as e:  # noqa: BLE001
        err = str(e)
ok(err == backup.RESTORE_PENDING and kb_keys(col) == before and sync.read_record(uf, col)["pending"],
   "trả lại vẫn lỗi (kéo dài) → thao tác vườn bị chặn với câu giải thích, không đóng dấu mới lên bản cũ")
d = st.load()
ok(d["coins"] == 2000 and "neko" in d["more"]["pets"] and not sync.read_record(uf, col)["pending"] and backup.PENDING is None,
   "hết lỗi: lần đọc kế tiếp trả lại bản tốt (2.000 xu, có mèo), bỏ dấu chờ")
st.add_coins(1)
ok(st.load()["coins"] == 2001, "thao tác sau đó cộng lên bản tốt: 2.001 xu")
col.close()

col, uf, st, mine = sync_case("f06b")
with unwritable(col, {core.MORE_KEY}):
    sync.after_sync(col, uf, mine)
err = ""
try:
    backup.put_config(col, core.START_KEY, {"ms": 1_000_000_000_000})   # ghi thẳng, không đọc trước
except backup.StoreFailed as e:
    err = str(e)
ok(err == backup.RESTORED_RETRY and st.load()["coins"] == 2000, "ghi thẳng (không đọc trước) khi còn chờ: trả lại trước rồi từ chối lần ghi tính từ bản cũ")
col.close()

col, uf, st, mine = sync_case("f06c")
with unwritable(col, {core.CONFIG_KEY}):
    sync.after_sync(col, uf, mine)
backup.GATE = lambda: True                     # Anki đang đồng bộ
try:
    coins_mid = st.load()["coins"]
    still = sync.read_record(uf, col)["pending"]
finally:
    backup.GATE = None
ok(coins_mid == 1000 and still, "đang đồng bộ: không trả lại giữa chừng (after_sync làm), đọc vẫn được")
r = sync.after_sync(col, uf, sync.before_sync(col, uf))
ok(r["action"] == sync.RESTORE and st.load()["coins"] == 2000 and not sync.read_record(uf, col)["pending"],
   "đồng bộ xong: after_sync trả lại bản chờ")
col.close()

col, uf, st, mine = sync_case("f06d")
with unwritable(col, {core.CONFIG_KEY}):
    sync.after_sync(col, uf, mine)
r = sync.on_open(col, uf, restoring_backup=True)          # người dùng tự khôi phục bản sao lưu của Anki
ok(st.load()["coins"] == 1000 and not sync.read_record(uf, col)["pending"],
   "người dùng tự khôi phục bản sao lưu của Anki: giữ bản vừa khôi phục, bỏ chờ (lớp bảo vệ không đè ngược)")
col.close()
backup.PENDING = None

col, uf, st, mine = sync_case("f06e")
orig = Collection.all_config
Collection.all_config = lambda self, *a, **kw: (_ for _ in ()).throw(OSError("TEST")) if self is col else orig(self, *a, **kw)
try:
    b = sync.before_sync(col, uf)
finally:
    Collection.all_config = orig
r = sync.after_sync(col, uf, b)
ok(b is None and r["action"] == sync.RESTORE and st.load()["coins"] == 2000,
   "không chụp được trước đồng bộ: so với bản chụp gần nhất của máy → vẫn trả lại (trước: ghi bản cũ đè bản chụp)")
col.close()

# ---------------------------------------------------------------------------
print("== 3. F02 / F07 — lưu chung một lần (lỗi ghi ở bất kỳ khoá nào → không đổi gì)")
col, uf = new_col("f02")
st = rich_garden(col, uf)
es = finds.EventStore(os.path.join(uf, "events.json"), lambda: col)
ps = paper.PaperState(os.path.join(uf, "paper_en.json"), lambda: col, paper.PAPER_KEY_EN)
ev = es.load()
fid = finds.BY_SCENE["yard"][0]
for key in (core.CONFIG_KEY, finds.EVENT_KEY):
    e2 = copy.deepcopy(ev); e2["found"][fid] = {"d": DAY.isoformat(), "n": 2}
    before = kb_keys(col)
    with unwritable(col, {key}) as hits:
        try:
            st.find_reward(3, None, extra=[es.write(e2)])
        except Exception:  # noqa: BLE001
            pass
    ok(bool(hits) and kb_keys(col) == before, f"nhặt trùng (+3 xu + sổ đã nhặt), {key} ghi lỗi → không đổi gì (nhặt lại được)")
c0 = st.load()["coins"]
e2 = copy.deepcopy(ev); e2["found"][fid] = {"d": DAY.isoformat(), "n": 2}
st.find_reward(3, None, extra=[es.write(e2)])
ok(st.load()["coins"] == c0 + 3 and es.load()["found"][fid]["n"] == 2, "thử lại: +3 xu đúng một lần, sổ ghi đã nhặt")
item = next(k for k, v in core.CATALOG.items() if not v.get("rare") and v.get("only") is None and not v.get("season") and v.get("price", 0) > 0
            and k not in core.LEGACY_ITEMS)          # món ghi ở tầng EXT (khoá riêng) — lần lưu ghi cả EXT, ví, sổ phiên
for i, key in enumerate((core.CONFIG_KEY, core.EXT_KEY, finds.EVENT_KEY)):
    e3 = es.load(); e3["ped"][DAY.isoformat()] = ["d%d" % (i + 2)]
    before = kb_keys(col)
    with unwritable(col, {key}) as hits:
        try:
            st.buy_at(item, 165, extra=[es.write(e3)])
        except Exception:  # noqa: BLE001
            pass
    ok(bool(hits) and kb_keys(col) == before, f"gánh hàng rong: mua {item} 165 xu, {key} ghi lỗi → xu / món / sổ phiên không đổi")
c0, n0 = st.load()["coins"], st.load()["home"]["owned"].get(item, 0)
e3 = es.load(); e3["ped"][DAY.isoformat()] = ["d1"]
st.buy_at(item, 165, extra=[es.write(e3)])
d = st.load()
ok(d["coins"] == c0 - 165 and d["home"]["owned"].get(item, 0) == n0 + 1 and es.load()["ped"].get(DAY.isoformat()) == ["d1"],
   "thử lại: trừ 165 xu đúng một lần, có món, sổ phiên ghi đã mua (lần bấm sau bị chặn)")
for key in (core.CONFIG_KEY, paper.PAPER_KEY_EN):
    s2 = ps.load(); s2.setdefault("q", {})["x"] = 1
    before = kb_keys(col)
    with unwritable(col, {key}) as hits:
        try:
            st.add_coins(2, extra=[ps.write(s2)])
        except Exception:  # noqa: BLE001
            pass
    ok(bool(hits) and kb_keys(col) == before, f"báo: câu trả lời đúng +2 xu, {key} ghi lỗi → câu chưa tính, xu không đổi (trả lời lại được)")
col.close()

# ---------------------------------------------------------------------------
print("== 4. F02 mở rộng — Anki tắt đột ngột giữa sổ bù xu và ví (tiến trình con)")
CHILD = r'''
import os, sys
sys.path.insert(0, sys.argv[1])
from anki.collection import Collection
import garden_core as core
col = Collection(sys.argv[2])
st = core.GardenState(sys.argv[3], lambda: col)
col.decks.select(col.decks.id_for_name("Ôn"))
q = col.sched.get_queued_cards(fetch_limit=1).cards[0]
card = col.get_card(q.card.id); card.start_timer()
col.sched.answer_card(col.sched.build_answer(card=card, states=q.states, rating=3))
target = sys.argv[4]
orig = Collection.set_config
def stop(self, key, value, *a, **kw):
    r = orig(self, key, value, *a, **kw)
    if self is col and key == target:
        os._exit(73)
    return r
Collection.set_config = stop
st.record_answer(3, 0, 0, day=col.sched.today, before="new")
col.close()
'''


def crash_col(name, n_cards=3):
    folder = os.path.join(TMP, name); os.makedirs(folder)
    path = os.path.join(folder, "collection.anki2")
    col = Collection(path)
    m = col.models.new("Ôn thử")
    for f in ("Front", "Back"):
        col.models.add_field(m, col.models.new_field(f))
    t = col.models.new_template("T1"); t["qfmt"] = "{{Front}}"; t["afmt"] = "{{Back}}"
    col.models.add_template(m, t); col.models.add(m); m = col.models.by_name("Ôn thử")
    for i in range(n_cards):
        n = col.new_note(m); n["Front"], n["Back"] = "Thẻ %d" % i, "x"; col.add_note(n, col.decks.id("Ôn"))
    sp = os.path.join(folder, "user_files", "state.json")
    st = core.GardenState(sp, lambda: col)
    d = st.load(); d["coins"] = 1000; d["mobile"] = core.new_mobile(int(time.time() * 1000) - 60000); st.save(d)
    col.close()
    return path, sp


def child(path, sp, target, addon=ADDON):
    return subprocess.run([sys.executable, "-c", CHILD, addon, path, sp, target], capture_output=True, text=True, timeout=60).returncode


for target in ("none", core.MOBILE_KEY, core.CONFIG_KEY, backup.REV_KEY):
    path, sp = crash_col("crash_" + target.replace("kotoba_batake_", ""))
    codes = [child(path, sp, target if i == 1 else "none") for i in range(3)]      # lượt 2 dừng ở `target`
    col = Collection(path)
    st = core.GardenState(sp, lambda: col)
    st.mobile_catch_up(col, goal=999, bonus=0)
    coins, revs = st.load()["coins"], col.db.scalar("select count() from revlog")
    st.mobile_catch_up(col, goal=999, bonus=0)
    ok(codes[1] == (0 if target == "none" else 73) and revs == 3 and coins == 1003 and st.load()["coins"] == 1003,
       f"3 lượt ôn, lượt 2 dừng sau khi ghi {target}: bù xu → 1.003 xu (đúng một lần mỗi lượt), bù lần nữa không đổi (thực tế {coins})")
    col.close()

# mã THẬT của bản 1.31.3 đã phát hành chạy xen: không biết số lần lưu của sổ / ví → bỏ, không làm sai
old = os.path.join(TMP, "old_1313")
os.makedirs(old)
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "e64eb22"))) as t:
    t.extractall(old)  # noqa: S202 — bản lưu của chính repo
OLD = os.path.join(old, "kotoba_batake")
path, sp = crash_col("old_mix", n_cards=5)
# (giới hạn đã biết: bản cũ chạy NGAY sau lần dừng, trước khi bản mới mở lại, thì bản cũ coi sổ là đúng — mất 1 xu đó)
codes = [child(path, sp, "none"), child(path, sp, "none", addon=OLD), child(path, sp, core.MOBILE_KEY), child(path, sp, "none"),
         child(path, sp, "none", addon=OLD)]
col = Collection(path)
st = core.GardenState(sp, lambda: col)
st.mobile_catch_up(col, goal=999, bonus=0)
ok(codes == [0, 0, 73, 0, 0] and st.load()["coins"] == 1005,
   "xen bản 1.31.3 thật: mới → cũ → mới (dừng giữa sổ và ví) → mới → cũ: 5 lượt = 1.005 xu (thực tế %s)" % st.load()["coins"])
col.close()
col, uf = new_col("mob_unchanged")
st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
d = st.load(); d["mobile"] = core.new_mobile(1_000_000_000_000); st.save(d)
m1 = col.get_config(core.MOBILE_KEY)
writes = []
orig = Collection.set_config
Collection.set_config = lambda self, k, v, *a, **kw: (writes.append(k), orig(self, k, v, *a, **kw))[1]
try:
    st.add_coins(1); st.add_coins(1)
finally:
    Collection.set_config = orig
ok(core.MOBILE_KEY not in writes and col.get_config(core.MOBILE_KEY) == m1 and col.get_config(core.CONFIG_KEY)["mob"]["n"] == m1["n"],
   "cộng xu (sổ không đổi): không ghi sổ bù xu, số lần lưu của sổ và ví khớp (%s)" % m1.get("n"))
col.close()

# ---------------------------------------------------------------------------
print("== 5. soát mã: F03 / F04 / F05 / P3 + ngôn ngữ")
src = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok("if _wrote_today(list(AI_DIRS)):" in src, "F03: báo vừa tick thêm xét mọi báo đã viết xong hôm nay (không chỉ báo đang tick)")
lib = src[src.index("def _library("):src.index("def _source_lib(")]
ok("if not ai.clean_key(cfg.get(\"gemini_key\")):" in lib and "lib.issues()" in lib and lib.index("lib.issues()") < lib.index("return _libraries[base]"),
   "F04: chưa có / đã xoá khoá Gemini mà máy còn số báo → vẫn đọc được")
ok("card._kb_sig = _card_sig(card.id)" in src and "reps, lapses, left" in src and "_last_rev(cid)" in src[src.index("def _card_sig"):src.index("def _card_changed")],
   "F05: dấu thẻ lúc hiện ra gồm cột lịch ôn + revlog (không chỉ cards.mod theo giây)")
ok("d._edit_wait = time.time()" in src and "EDIT_SAVE_WINDOW" in src and "self._note_seen_at = time.time()" in src
   and "if saved and time.time() - getattr(self, \"_note_seen_at\", 0.0) < EDIT_SAVE_WINDOW:" in src,
   "P3: 'Đã lưu thẻ.' chỉ khi lần lưu của cửa sổ Sửa thẻ còn đang tới (đã tới trước lúc đóng → hết chờ)")
fx = open(os.path.join(ADDON, "web", "fx.js"), encoding="utf-8").read()
ok(fx.count("say(pick(SAY.") == 0 and fx.count("pickSay(") >= 5, "StackChan: mọi chỗ bốc câu qua pickSay (đúng ngôn ngữ)")
games = open(os.path.join(ADDON, "web", "games.js"), encoding="utf-8").read()
ok('dataset.kbLang = glFor(kind)' in games and "f.pickSay(thanks, gameLang)" in games, "Trò chơi: tiêu đề theo deck; khách Chợ sáng cảm ơn theo tiếng của deck")
fn = re.search(r"  function pick\(list\).*?\n  function pickSay\(list, lang\) \{.*?\n  \}\n", fx, re.S).group(0)
SAYS = re.search(r"  var SAY = \{.*?\n  \};", fx, re.S).group(0)
node = subprocess.run(["node", "-e", """
let lang = 'en'; global.GardenLang = { cur: () => lang };
%s
%s
const out = {}; for (const l of ['ja', 'en', 'zh', 'ko', 'vi']) { lang = l; const s = new Set();
  for (const k of Object.keys(SAY)) for (let i = 0; i < 400; i++) s.add(pickSay(SAY[k])); out[l] = Array.from(s); }
console.log(JSON.stringify(out));""" % (fn, SAYS.replace("var SAY", "global.SAY"))], capture_output=True, text=True)
got = json.loads(node.stdout or "{}")
VI = re.compile(r"[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]", re.I)
JP = re.compile(r"[぀-ヿ㐀-鿿]")
for l in ("ja", "en", "zh", "ko"):
    vi_only = [t for t in got.get(l, []) if not JP.search(t) and VI.search(t)]
    ok(got.get(l) and not vi_only, f"StackChan ở chế độ {l}: {len(got.get(l, []))} câu, không câu nào chỉ có tiếng Việt {vi_only[:3]}")
ok(any(VI.search(t) and not JP.search(t) for t in got.get("vi", [])), "Chỉ tiếng Việt: vẫn có các câu tiếng Việt riêng")
lits = []
for fn in sorted(os.listdir(os.path.join(ADDON, "web"))):
    if fn.endswith(".js"):
        for m_ in re.finditer(r'(?:GardenFX\.say|[^.\w]say|mood)\((?:"[a-z]+", \d+, )?(?:[^"(]*\? )?"([^"]+)"', open(os.path.join(ADDON, "web", fn), encoding="utf-8").read()):
            lits.append((fn, m_.group(1)))
vi_only = [(f, t) for f, t in lits if not JP.search(t) and VI.search(t)]
ok(len(lits) > 15 and not vi_only, "%d câu StackChan viết sẵn trong mã trang: câu nào cũng có phần theo Ngôn ngữ trong vườn %s" % (len(lits), vi_only[:3]))
gl = open(os.path.join(ADDON, "web", "glang.js"), encoding="utf-8").read()
ok("const own = e.dataset.kbLang" in gl, "glang.applyTitles: bảng có ngôn ngữ riêng (data-kb-lang) giữ ngôn ngữ đó khi đổi Ngôn ngữ trong vườn")

# ---------------------------------------------------------------------------
print("== 6. thử ngẫu nhiên có đối chứng: vườn A bị lỗi đọc / ghi ngẫu nhiên, vườn B không lỗi chỉ làm lại thao tác A làm được")
import random  # noqa: E402

SEEDS = [int(x) for x in os.environ.get("KB_SEED", "1333,7,42").split(",")]
N_OPS = int(os.environ.get("KB_OPS", "260"))
STATE_KEYS = [core.CONFIG_KEY, core.EXT_KEY, core.SEASON_KEY, core.MORE_KEY, core.NHA_KEY, core.MOBILE_KEY, core.PX_KEY,
              finds.EVENT_KEY, guests.GUEST_KEY, life.LIFE_KEY, paper.PAPER_KEY_EN, journal.month_key(DAY.year, DAY.month)]


def garden_pair(tag):
    out = []
    for side in ("A", "B"):
        col, uf = new_col("fz_%s_%s" % (tag, side))
        st = core.GardenState(os.path.join(uf, "state.json"), lambda c=col: c)
        st.today_override = 500
        d = st.load(); d["coins"] = 60000; d["mobile"] = core.new_mobile(1_000_000_000_000); st.save(d)
        st.build(); st.build()
        out.append({"col": col, "uf": uf, "st": st,
                    "es": finds.EventStore(os.path.join(uf, "events.json"), lambda c=col: c),
                    "gs": guests.GuestStore(os.path.join(uf, "guests.json"), lambda c=col: c),
                    "ls": life.LifeStore(os.path.join(uf, "life.json"), lambda c=col: c),
                    "ps": paper.PaperState(os.path.join(uf, "paper_en.json"), lambda c=col: c, paper.PAPER_KEY_EN),
                    "js": journal.JournalStore(os.path.join(uf, "journal"), lambda c=col: c)})
    return out


def fz_ops(g, r, i):
    st, es = g["st"], g["es"]
    shop = [k for k, v in core.CATALOG.items() if not v.get("rare") and v.get("only") is None and not v.get("season")
            and 0 < v.get("price", 0) <= 400][:12]
    fid = finds.BY_SCENE["yard"][r % len(finds.BY_SCENE["yard"])]
    ds = (DAY - dt.timedelta(days=r % 9)).isoformat()

    def pick():
        e = es.load(); e["found"][fid] = {"d": ds, "n": (e["found"].get(fid) or {}).get("n", 0) + 1}
        st.find_reward(2, None, extra=[es.write(e)])

    def ped():
        e = es.load(); e["ped"][ds] = sorted(set(e["ped"].get(ds) or []) | {"d%d" % (r % 4)})
        st.buy_at(shop[r % len(shop)], 50 + r % 90, extra=[es.write(e)])

    def paper_q():
        s2 = g["ps"].load(); s2.setdefault("q", {})["k%d" % (r % 20)] = 1
        st.add_coins(1 + r % 3, extra=[g["ps"].write(s2)])

    def answer():
        st.record_answer(1 + r % 4, r % 5, (r + 1) % 5, day=500, before="review" if r % 2 else "new")

    def wear():
        st.mywear_save({"name": "Mũ %d" % r, "slot": "head", "px": "160" + "rgbk"[r % 4]})

    def place():           # đặt một món đang có trong kho (mua là thao tác riêng)
        own = [k for k, n in st.load()["home"]["owned"].items() if n and k in shop]
        if not own:
            raise core.HomeError("kho trống")
        st.place("yard", own[r % len(own)], 1 + r % 14, r % 3)

    ops = [("cộng xu", lambda: st.add_coins(1 + r % 5)), ("mua", lambda: st.buy(shop[r % len(shop)])), ("đặt", place), ("nhặt", pick), ("gánh hàng", ped),
           ("câu báo", paper_q), ("lượt ôn", answer), ("đồ tự vẽ", wear), ("thú", lambda: st.pet_buy(["neko", "ahiru", "usagi", "kame"][r % 4])),
           ("khách", lambda: g["gs"].met(guests.ORDER[r % len(guests.ORDER)], "yard", DAY - dt.timedelta(days=r % 30))),
           ("sinh hoạt", lambda: g["ls"].mark(life.ORDER[r % len(life.ORDER)], "yard", DAY - dt.timedelta(days=r % 30))),
           ("nhật ký", lambda: g["js"].update(DAY - dt.timedelta(days=r % 15), {"t": "dòng %d" % r})),
           ("vùng", lambda: st.unlock_zone(core.ZONE_IDS[r % len(core.ZONE_IDS)]))]
    return ops[i % len(ops)]


def snap(col):
    return {k: v for k, v in kb_keys(col).items() if k in STATE_KEYS or k.startswith("kotoba_batake_journal")}


for seed in SEEDS:
    rnd = random.Random(seed)
    A, B = garden_pair(str(seed))
    bad, faults, refused, done_ok = [], 0, 0, 0
    for step in range(N_OPS):
        i, r = rnd.randrange(13), rnd.randrange(10 ** 6)
        mode = rnd.choice(["none", "none", "read1", "readN", "write1"])
        key = rnd.choice(STATE_KEYS)
        name, opA = fz_ops(A, r, i)
        before = snap(A["col"])
        ctx = unreadable(A["col"], {key}, 1) if mode == "read1" else unreadable(A["col"], {key}) if mode == "readN" \
            else unwritable(A["col"], {key}) if mode == "write1" else contextmanager(lambda: (yield []))()
        err = None
        with ctx as hits:
            try:
                opA()
            except Exception as e:  # noqa: BLE001
                err = e
        faults += bool(hits)
        if err is not None:
            refused += 1
            if snap(A["col"]) != before:
                bad.append("bước %d %s (%s %s): báo lỗi %s mà dữ liệu đã đổi" % (step, name, mode, key, type(err).__name__))
            continue
        done_ok += 1
        _n, opB = fz_ops(B, r, i)
        try:
            opB()
        except Exception as e:  # noqa: BLE001
            bad.append("bước %d %s: A làm được (%s %s) mà B không lỗi lại báo %s" % (step, name, mode, key, type(e).__name__))
            continue
        sa, sb = snap(A["col"]), snap(B["col"])
        if sa != sb:
            diff = sorted(k for k in set(sa) | set(sb) if sa.get(k) != sb.get(k))
            bad.append("bước %d %s (%s %s): A khác B ở %s" % (step, name, mode, key, diff))
            break
    ok(not bad and faults > N_OPS // 8 and done_ok > N_OPS // 3,
       "hạt %d: %d thao tác, %d lần gặp lỗi đọc / ghi, %d thao tác từ chối không đổi gì, %d thao tác làm được khớp đối chứng%s"
       % (seed, N_OPS, faults, refused, done_ok, "" if not bad else " — " + " | ".join(bad[:3])))
    for g in (A, B):
        g["col"].close()

print("\nKẾT QUẢ: %d/%d" % (sum(RESULTS), len(RESULTS)))
sys.exit(0 if all(RESULTS) else 1)
