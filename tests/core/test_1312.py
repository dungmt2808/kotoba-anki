"""Test offline 1.31.2 (python thường): kiểm tra lần cuối trước phát hành — các lỗi có thể làm mất dữ liệu.

1. Dấu phiên bản (`backup_core.touch_rev` / `put_config` / `commit_config`): mỗi lần ghi dữ liệu vườn đều đóng dấu, dấu sau
   luôn lớn hơn dấu trước kể cả khi đồng hồ chạy lùi; không khoá nào đổi thì không ghi gì; lỗi ghi dấu không làm hỏng lần lưu.
   Mọi kho của add-on (ví, nhật ký, album khách, sổ sinh hoạt, Hộp sưu tầm, cấu hình trường, deck của báo, mốc chuỗi) đều
   đóng dấu khi ghi.
2. `sync_core.decide`: bảng quyết định giữ / trả lại sau đồng bộ (mọi nhánh), chỉ trả lại khi chắc chắn bản mang về cũ hơn.
3. `sync_core.restore` / `before_sync` / `after_sync` / `on_open` với collection giả: trả lại như một lần lưu (lỗi giữa chừng
   → collection như cũ, báo "failed"), bản chụp + bản bị thay ra file của hồ sơ, không ghi gì vào collection khi không cần.
4. Nhật ký: collection không đọc được (đang đồng bộ toàn bộ) → không chép "tháng chỉ có hôm nay" đè lên bản sao lưu cả tháng.
5. Khoanh vùng hư hại: với một vườn đầy đủ, làm hỏng TỪNG nút của từng khoá lưu (15 kiểu giá trị rác) rồi đọc → lưu → đọc
   lại: không lỗi, và phần bị ảnh hưởng không rộng hơn khi làm hỏng cả khoá cấp một chứa nút đó (một bản ghi hỏng không kéo
   theo đồ ở chỗ khác — trước 1.31.2 một `id` sai kiểu trong phần mở rộng làm mất hết đồ mới + vùng mới).
6. Lưới an toàn: phần đọc ném lỗi bất ngờ → `_damaged`, `save()` từ chối ghi (StoreError), collection còn nguyên.
7. Soát mã `__init__.py`: nối dây đồng bộ (chụp trước / so sau / mở hồ sơ), việc lúc mở hồ sơ đợi lần tự đồng bộ, sổ Undo
   bỏ sau đồng bộ, thẻ đổi ở chỗ khác lúc đang ôn, lệnh cầu nối lúc collection đóng, `sync_guard` ở config.

Kịch bản với máy chủ đồng bộ thật của Anki: tests/dong_bo/test_dong_bo.py; trong Anki thật: tests/anki/e2e_1312.js.

Chạy: python test_1312.py THƯ_MỤC_ADD_ON
"""
import copy
import datetime as dt
import json
import os
import re
import shutil
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection as _real  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import backup_core as B
import garden_core as core
import journal_core as journal
import guest_core as guests
import life_core as life
import finds_core as finds
import fields_core as fields
import more_core
import sync_core as S

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1312_")
BS = [B] + ([core.backup] if core.backup is not B else [])      # garden_core có thể nạp bản backup_core riêng


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*p):
    with open(os.path.join(ADDON, *p), encoding="utf-8") as f:
        return f.read()


class Boom(OSError):
    pass


class _Db:
    def __init__(self, col):
        self.col = col

    def first(self, sql, *a):
        return (self.col.crt, self.col.scm)

    def all(self, sql, *a):
        return [(k, v) for k, v in self.col.conf.items() if k.startswith(S.PREFIX)]


class Col:
    """Collection giả: cấu hình là dict (lưu dạng JSON như Anki), `path` theo hồ sơ, lỗi ghi / đọc theo khoá."""

    def __init__(self, name="Test", crt=1_700_000_000):
        self.path = os.path.join(TMP, "profiles", name, "collection.anki2")
        self.conf = {}
        self.fail = {}          # khoá → "once" | "always"
        self.fail_read = False
        self.writes = []
        self.crt, self.scm = crt, crt * 1000
        self.db = _Db(self)

    def get_config(self, key, default=None):
        if self.fail_read:
            raise Boom(5, "collection đang đóng (giả)")
        return json.loads(self.conf[key]) if key in self.conf else default

    def set_config(self, key, val, **kw):
        mode = self.fail.get(key) or self.fail.get("*")
        if mode:
            if mode == "once":
                self.fail.pop(key, None)
            raise Boom(28, "đĩa đầy (giả) khi ghi " + key)
        self.writes.append(key)
        self.conf[key] = json.dumps(val, ensure_ascii=False)

    def remove_config(self, key):
        self.conf.pop(key, None)

    def all_config(self):
        if self.fail_read:
            raise Boom(5, "collection đang đóng (giả)")
        return {k: json.loads(v) for k, v in self.conf.items()}


def rev(c):
    return B.clean_rev(c.get_config(B.REV_KEY))


# =========================================================================================================================
print("== 1. Dấu phiên bản")
ok(B.clean_rev({"t": 5, "d": "ab"}) == {"v": 1, "t": 5, "d": "ab"} and B.clean_rev({"t": 5}) == {"v": 1, "t": 5, "d": ""},
   "clean_rev: dấu hợp lệ (thiếu mã máy → \"\")")
ok(all(B.clean_rev(x) is None for x in (None, 1, "x", [], {}, {"t": "5"}, {"t": 0}, {"t": -3}, {"t": True}, {"t": 1.5})),
   "clean_rev: dữ liệu rác / t không phải số nguyên dương → None")
c = Col()
r1 = B.touch_rev(c, now_ms=1000)
r2 = B.touch_rev(c, now_ms=1000)
r3 = B.touch_rev(c, now_ms=400)             # đồng hồ chạy lùi
r4 = B.touch_rev(c, floor=9000, now_ms=500)
ok(r1["t"] == 1000 and r2["t"] == 1001 and r3["t"] == 1002 and r4["t"] == 9001 and rev(c)["t"] == 9001,
   "touch_rev: dấu sau luôn lớn hơn dấu trước (cùng mili giây, đồng hồ lùi) và lớn hơn `floor`")
ok(r1["d"] == B.DEVICE and len(B.DEVICE) == 8, "dấu mang mã của lần chạy này (8 ký tự)")
c.fail[B.REV_KEY] = "always"
ok(B.touch_rev(c, now_ms=99999) is None and rev(c)["t"] == 9001, "ghi dấu lỗi → None, dấu cũ còn nguyên, không ném lỗi")
c2 = Col()
c2.fail[B.REV_KEY] = "always"
done = B.commit_config(c2, [("kotoba_batake_x", {"a": 1})])
ok(done == ["kotoba_batake_x"] and c2.get_config("kotoba_batake_x") == {"a": 1},
   "commit_config: ghi dấu lỗi không làm hỏng lần lưu (dữ liệu đã ghi, chỉ thiếu dấu)")
c3 = Col()
B.put_config(c3, "kotoba_batake_y", {"b": 2})
ok(c3.writes == ["kotoba_batake_y", B.REV_KEY] and rev(c3) is not None, "put_config: ghi khoá rồi đóng dấu")
w0 = list(c3.writes)
ok(B.commit_config(c3, [("kotoba_batake_y", {"b": 2})]) == [] and c3.writes == w0, "commit_config: không khoá nào đổi → không ghi gì (kể cả dấu)")
c3.fail["kotoba_batake_z"] = "always"
t0 = rev(c3)["t"]
try:
    B.commit_config(c3, [("kotoba_batake_y", {"b": 3}), ("kotoba_batake_z", 1)])
    raised = False
except B.StoreFailed:
    raised = True
ok(raised and c3.get_config("kotoba_batake_y") == {"b": 2} and rev(c3)["t"] == t0, "commit_config lỗi giữa chừng → dữ liệu + dấu như cũ")
c3.fail.clear()
try:
    c3.fail["kotoba_batake_w"] = "always"
    B.put_config(c3, "kotoba_batake_w", 1)
    raised = False
except Boom:
    raised = True
ok(raised and rev(c3)["t"] == t0, "put_config: lỗi ghi khoá → ném lỗi của Anki, không đóng dấu")

print("== 1a. Cổng tạm khoá ghi lúc Anki đang đồng bộ")
g = Col("Gate")
B.put_config(g, "kotoba_batake_a", {"n": 1})
conf0, writes0 = dict(g.conf), list(g.writes)
flag = [True]
B.GATE = lambda: flag[0]
for name, fn in (("commit_config", lambda: B.commit_config(g, [("kotoba_batake_a", {"n": 2})])),
                 ("put_config", lambda: B.put_config(g, "kotoba_batake_a", {"n": 3}))):
    try:
        fn()
        got = None
    except B.StoreFailed as e:
        got = str(e)
    ok(got == B.SYNCING and g.conf == conf0 and g.writes == writes0, f"đang đồng bộ: {name} từ chối ghi (StoreFailed, câu báo riêng), collection không đổi")
B.GATE = lambda: 1 / 0
ok(B.held() is False, "hàm cổng ném lỗi → coi như không khoá (không bao giờ khoá ghi vì lỗi của chính cổng)")
flag[0] = False
B.GATE = lambda: flag[0]
ok(B.commit_config(g, [("kotoba_batake_a", {"n": 2})]) == ["kotoba_batake_a"], "hết đồng bộ → ghi lại bình thường")
B.GATE = None
for _b in BS:
    _b.GATE = None

print("== 1b. Mọi kho của add-on đóng dấu khi ghi")
col = Col("Stamp")
uf = os.path.join(TMP, "uf_stamp")
st = core.GardenState(os.path.join(uf, "state.json"), col_getter=lambda: col)
st.today_override = 500
seen_t = [0]


def stamped(what, fn):
    fn()
    r = rev(col)
    good = r is not None and r["t"] > seen_t[0]
    ok(good, f"{what} → dấu mới")
    seen_t[0] = r["t"] if r else seen_t[0]


stamped("ví (add_coins)", lambda: st.add_coins(50))
stamped("mốc chuỗi (streak_start)", lambda: st.streak_start(col))
jr = journal.JournalStore(os.path.join(uf, "journal"), col_getter=lambda: col)
stamped("nhật ký", lambda: jr.update(dt.date(2026, 11, 15), {"t": "xin chào"}))
gs = guests.GuestStore(os.path.join(uf, "guests.json"), col_getter=lambda: col)
stamped("album khách", lambda: gs.met(list(guests.GUESTS)[0], "yard", dt.date(2026, 11, 15)))
ls = life.LifeStore(os.path.join(uf, "life.json"), col_getter=lambda: col)
stamped("sổ sinh hoạt", lambda: ls.mark(list(life.ACTS)[0], "room", dt.date(2026, 11, 15)))
ev = finds.EventStore(os.path.join(uf, "events.json"), col_getter=lambda: col)
stamped("Hộp sưu tầm", lambda: ev.save(dict(ev.load(), sets={"yard": "2026-11-15"})))
fs = fields.FieldStore(os.path.join(uf, "fields.json"), col_getter=lambda: col)
stamped("cấu hình trường", lambda: fs.save(dict(fs.load(), lang={"123": "en"})))
ws = src("words_core.py")
ok("backup.put_config(col, SRC_KEY, raw)" in ws and "col.set_config(" not in ws, "deck của báo (words_core.save_src) ghi qua put_config")
import paper_core as paper
ok("commit_config" in src("paper_core.py") and "col.set_config(" not in src("paper_core.py"), "trạng thái báo ghi qua commit_config (có đóng dấu)")
direct = []
for f in sorted(os.listdir(ADDON)):
    if f.endswith(".py") and f not in ("backup_core.py",):
        for i, line in enumerate(src(f).splitlines(), 1):
            if re.search(r"\bcol\.set_config\(|\.col\.set_config\(|mw\.col\.set_config\(", line):
                direct.append(f"{f}:{i}")
ok(not direct, "không còn chỗ nào ghi thẳng col.set_config ngoài backup_core" + (": " + ", ".join(direct) if direct else ""))
w0, t0 = list(col.writes), rev(col)["t"]
st.load(), jr.entry(dt.date(2026, 11, 15)), gs.album(), ls.seen(), ev.load(), fs.load()
st.save(st.load())
ok(col.writes == w0 and rev(col)["t"] == t0, "chỉ đọc / lưu lại y nguyên → không ghi gì, dấu không đổi")

# =========================================================================================================================
print("== 2. sync_core.decide: bảng quyết định")
START = S.START_KEY


def state(keys, crt=7, t=None, d="aa", scm=1):
    keys = dict(keys)
    if t is not None:
        keys[S.REV_KEY] = {"v": 1, "t": t, "d": d}
    return {"crt": crt, "scm": scm, "keys": keys, "h": S.digest(keys), "rev": S.clean_rev(keys.get(S.REV_KEY))}


W = "kotoba_batake_state"
mine = state({W: {"coins": 50}, START: {"v": 1, "ms": 1000}}, t=500)
cases = [
    ("máy này chưa có dữ liệu vườn", state({}), state({W: {"coins": 1}}, t=9), S.KEEP),
    ("không có bản chụp", None, state({W: {"coins": 1}}, t=9), S.KEEP),
    ("nội dung không đổi (dấu khác)", mine, state({W: {"coins": 50}, START: {"v": 1, "ms": 1000}}, t=100), S.KEEP),
    ("bản của máy này chưa có dấu", state({W: {"coins": 50}}), state({W: {"coins": 1}}, t=1), S.KEEP),
    ("bản mang về không còn khoá nào của vườn", mine, state({}), S.RESTORE),
    ("… kể cả khi collection vừa bị thay bằng collection khác", mine, state({}, crt=8, scm=2), S.RESTORE),
    ("collection khác (crt + scm khác) đã có vườn riêng", mine, state({W: {"coins": 1}, START: {"v": 1, "ms": 5000}}, crt=8, scm=2, t=1), S.KEEP),
    ("chỉ crt khác (đồng bộ thường mang crt của máy khác về): vẫn so như cùng collection", mine,
     state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, crt=8, t=499), S.RESTORE),
    ("bản mang về là vườn lập SAU (máy thứ hai vừa cài)", mine, state({W: {"coins": 0}, START: {"v": 1, "ms": 2000}}, t=900), S.RESTORE),
    ("vườn của máy này lập sau (máy này là máy vừa cài)", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 300}}, t=100), S.KEEP),
    ("bản mang về chưa có mốc (dữ liệu trước 1.31)", mine, state({W: {"coins": 9}}, t=100), S.KEEP),
    ("cùng dòng, bản mang về chưa có dấu", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}), S.RESTORE),
    ("cùng dòng, dấu cũ hơn (điện thoại giữ hộ bản cũ)", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, t=499), S.RESTORE),
    ("cùng dòng, dấu mới hơn (máy tính khác chơi sau)", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, t=501), S.KEEP),
    ("cùng dấu, nội dung khác (máy còn bản cũ sửa)", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, t=500), S.KEEP),
    ("cùng thời điểm, mã máy nhỏ hơn", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, t=500, d="a0"), S.RESTORE),
    ("cùng thời điểm, mã máy lớn hơn", mine, state({W: {"coins": 9}, START: {"v": 1, "ms": 1000}}, t=500, d="zz"), S.KEEP),
    ("hai bên đều chưa có mốc, dấu cũ hơn", state({W: {"coins": 50}}, t=500), state({W: {"coins": 9}}, t=10), S.RESTORE),
]
for name, b, a, want in cases:
    got, why = S.decide(b, a)
    ok(got == want, f"{name} → {want} ({why})")
ok(S.digest({}) == "" and S.digest({S.REV_KEY: {"t": 1}}) == "" and S.digest({"a": 1}) == S.digest({"a": 1, S.REV_KEY: {"t": 9}}),
   "digest không tính dấu phiên bản; không có dữ liệu → \"\"")
ok(S.digest({"a": {"x": 1, "y": 2}}) == S.digest({"a": {"y": 2, "x": 1}}) and S.digest({"a": 1}) != S.digest({"a": 2}), "digest không phụ thuộc thứ tự khoá")
ok(all(S.lineage({START: v}) is None for v in (None, 1, {}, {"ms": "5"}, {"ms": 0}, {"ms": True})) and S.lineage({START: {"ms": 7}}) == 7,
   "lineage: mốc hỏng → None")

# =========================================================================================================================
print("== 3. Chụp trước / so sau đồng bộ, mở hồ sơ (collection giả)")
UF = os.path.join(TMP, "uf_sync")
a = Col("May")
sa = core.GardenState(os.path.join(UF, "state.json"), col_getter=lambda: a)
sa.today_override = 500
sa.streak_start(a)
sa.add_coins(80)
ja = journal.JournalStore(os.path.join(UF, "journal"), col_getter=lambda: a)
ja.update(dt.date(2026, 11, 15), {"t": "nhật ký mới"})
w0 = list(a.writes)
before = S.before_sync(a, UF)
ok(a.writes == w0, "before_sync không ghi gì vào collection (không làm collection \"mới hơn\")")
rec = S.record_path(UF, a)
ok(os.path.exists(rec) and "ho_so" in rec and json.load(open(rec, encoding="utf-8"))["keys"] == before["keys"], "bản chụp ra file dong_bo.json trong thư mục hồ sơ")
good = dict(a.conf)
ok(S.after_sync(a, UF, before)["action"] == S.KEEP and a.conf == good and a.writes == w0, "đồng bộ không đổi gì → không ghi gì")
# "đồng bộ" mang về bản cũ: mất nhật ký, ví cũ, dấu cũ
old_conf = {k: v for k, v in good.items() if not k.startswith(journal.JOURNAL_PREFIX)}
old_conf[core.CONFIG_KEY] = json.dumps(dict(json.loads(good[core.CONFIG_KEY]), coins=3))
old_conf[B.REV_KEY] = json.dumps({"v": 1, "t": 5, "d": "zz"})
a.conf = dict(old_conf)
t_before = before["rev"]["t"]
res = S.after_sync(a, UF, before)
ok(res["action"] == S.RESTORE and sa.load()["coins"] == 80 and ja.entry(dt.date(2026, 11, 15)).get("t") == "nhật ký mới",
   "bản mang về cũ hơn → trả lại xu + nhật ký (" + res["why"] + ")")
ok(rev(a)["t"] > t_before, "bản vừa trả lại được đóng dấu mới hơn cả hai bản")
lost = S.record_path(UF, a, S.LOST)
ok(os.path.exists(lost) and json.load(open(lost, encoding="utf-8"))["keys"][core.CONFIG_KEY]["coins"] == 3, "bản bị thay chép ra dong_bo_bi_de.json")
ok(S.digest(json.load(open(rec, encoding="utf-8"))["keys"]) == S.digest(S.snapshot(a)), "bản chụp cập nhật theo bản đã trả lại")
# trả lại mà ghi lỗi giữa chừng → collection như bản mang về, báo failed, lần mở hồ sơ sau thử lại được
before2 = S.before_sync(a, UF)
a.conf = dict(old_conf)
a.fail[core.CONFIG_KEY] = "always"
res = S.after_sync(a, UF, before2)
ok(res["action"] == S.FAILED and a.conf == old_conf, "trả lại lỗi giữa chừng → \"failed\", collection y như bản mang về (không nửa nọ nửa kia)")
a.fail.clear()
res = S.on_open(a, UF)
ok(res["action"] == S.RESTORE and sa.load()["coins"] == 80 and ja.entry(dt.date(2026, 11, 15)).get("t") == "nhật ký mới",
   "lần mở hồ sơ sau: trả lại được từ bản chụp trong file")
ok(S.on_open(a, UF)["action"] == S.KEEP, "mở lần nữa → không còn gì phải trả")
# bản mới hơn từ máy khác → giữ, bản chụp theo bản mới
before3 = S.before_sync(a, UF)
newer = dict(a.conf)
newer[core.CONFIG_KEY] = json.dumps(dict(json.loads(newer[core.CONFIG_KEY]), coins=500))
newer[B.REV_KEY] = json.dumps({"v": 1, "t": rev(a)["t"] + 60000, "d": "bb"})
a.conf = dict(newer)
w0 = list(a.writes)
res = S.after_sync(a, UF, before3)
ok(res["action"] == S.KEEP and a.conf == newer and a.writes == w0 and sa.load()["coins"] == 500, "bản mang về mới hơn → giữ, không ghi gì vào collection")
ok(S.digest(json.load(open(rec, encoding="utf-8"))["keys"]) == S.digest(newer and S.snapshot(a)), "… bản chụp trong file theo bản mới")
# lỗi đọc collection lúc chụp / lúc so → không chặn đồng bộ, không trả lại bừa
a.fail_read = True
ok(S.before_sync(a, UF) is None, "before_sync lúc collection không đọc được → None (không ném lỗi)")
ok(S.after_sync(a, UF, before3)["action"] == S.FAILED and S.on_open(a, UF)["action"] == S.FAILED, "after_sync / on_open lúc không đọc được → \"failed\", không ném lỗi")
a.fail_read = False
ok(S.after_sync(a, UF, None)["action"] == S.KEEP, "không có bản chụp (lần chụp lỗi) → giữ bản mang về")
# hồ sơ khác trên cùng máy có bản chụp riêng
b = Col("HoSoKhac")
ok(S.read_record(UF, b) is None and S.record_path(UF, b) != S.record_path(UF, a), "hồ sơ khác: thư mục bản chụp riêng, chưa có gì")
ok(S.on_open(b, UF)["action"] == S.KEEP and b.conf == {}, "hồ sơ khác mở ra không nhận bản chụp của hồ sơ này")
# file bản chụp hỏng
open(rec, "w").write("{hỏng")
ok(S.read_record(UF, a) is None and S.on_open(a, UF)["action"] == S.KEEP, "file bản chụp hỏng → coi như chưa có")
# khôi phục bản sao lưu của Anki
S.write_record(UF, a, S.state_of(a))
older = dict(old_conf)
a.conf = dict(older)
res = S.on_open(a, UF, restoring_backup=True)
ok(res["action"] == S.KEEP and sa.load()["coins"] == 3 and rev(a)["t"] > json.loads(newer[B.REV_KEY])["t"],
   "vừa khôi phục bản sao lưu → giữ bản vừa khôi phục, đóng dấu mới hơn mọi bản đã thấy")
ok(S.on_open(a, UF)["action"] == S.KEEP and sa.load()["coins"] == 3, "lần mở sau cũng giữ bản đã khôi phục")
# collection giả không có đường dẫn hồ sơ (test khác) → không ghi file
nc = Col("X")
nc.path = ""
nc.conf[W] = json.dumps({"coins": 1})
ok(S.before_sync(nc, UF) is not None and not os.path.exists(os.path.join(UF, S.RECORD)), "không biết hồ sơ → không ghi bản chụp ra file chung")

# =========================================================================================================================
print("== 4. Nhật ký: collection không đọc được thì không đè bản sao lưu cả tháng")
jc = Col("NhatKy")
jd = os.path.join(TMP, "uf_j", "journal")
js = journal.JournalStore(jd, col_getter=lambda: jc)
for day in (3, 9, 12):
    js.update(dt.date(2026, 11, day), {"t": f"ngày {day}"})
bpath = js._backup_path(2026, 11)
ok(len(json.load(open(bpath, encoding="utf-8"))) == 3, "bản sao lưu tháng 11 có 3 ngày")
jc.fail_read = True
jc.fail["*"] = "always"
try:
    js.update(dt.date(2026, 11, 15), {"t": "viết lúc Anki đang đồng bộ toàn bộ"})
    raised = False
except Exception:
    raised = True
bk = json.load(open(bpath, encoding="utf-8"))
ok(raised, "collection đang đóng → báo lỗi (giao diện giữ chữ trong ô)")
ok(len(bk) == 4 and bk["2026-11-15"]["t"] == "viết lúc Anki đang đồng bộ toàn bộ" and bk["2026-11-03"]["t"] == "ngày 3",
   "bản sao lưu: thêm chữ vừa viết, 3 ngày cũ còn nguyên (trước 1.31.2: chỉ còn hôm nay)")
jc.fail_read = False
jc.fail.clear()
ok(len(js.month(2026, 11)) == 3, "collection không bị đụng")
js.update(dt.date(2026, 11, 15), {"t": "viết lại sau khi đồng bộ xong"})
ok(len(js.month(2026, 11)) == 4 and len(json.load(open(bpath, encoding="utf-8"))) == 4, "đồng bộ xong lưu lại bình thường")

# =========================================================================================================================
print("== 5. Khoanh vùng hư hại: làm hỏng từng nút của từng khoá lưu")
import datetime as _dt


def rich(path):
    """Vườn đầy đủ (như tests/core/test_ban_cu.py)."""
    s = core.GardenState(path)
    s.today_override = 500
    d = s.load()
    d["coins"] = 10 ** 6
    s.save(d)
    for _ in range(7):
        s.build()
    for z in core.ZONE_IDS:
        s.unlock_zone(z)
    s.open_rooms()
    s.buy_style("minka")
    s.use_style("classic")
    for sc, iid, x, y in [("yard", "bench", 6, 1), ("yard", "sunflower", 8, 1), ("yard", "pond", 10, 2), ("beach", "parasol", 6, 1),
                          ("onsen", "rotenburo", 7, 1), ("station", "vending", 6, 0), ("room", "desk", 2, 1), ("room", "radio", 1, 3),
                          ("room", "painting", 1, 0), ("kitchen", "nagashi", 2, 1), ("kitchen", "plant", 8, 2),
                          ("bedroom", "beddo", 1, 2), ("bedroom", "clock", 3, 0)]:
        s.buy(iid)
        s.place(sc, iid, x, y)
    s.find_reward(0, "tukinh")
    s.place("room", "tukinh", 6, 1)
    d = s.load()
    d["home"]["owned"]["shika"] = 1
    s.save(d)
    s.place("yard", "shika", 15, 0)
    s.unlock_theme(core.season.THEME_IDS[0], "coins")
    s.buy_wear("straw")
    s.buy_face("wink")
    s.decor_buy("w_sakura")
    s.decor_use("room", "wall", "w_sakura")
    t = s.tile_save({"name": "Sọc", "kind": "wall", "px": more_core.px_encode(("k." * 8) * 16)})
    s.decor_use("kitchen", "wall", t["tile_id"])
    cr = s.craft_save({"name": "Đèn", "size": 16, "kind": "floor", "fx": "hearts", "px": more_core.px_encode(("y" * 16) * 16)})
    s.place("bedroom", cr["craft_id"], 6, 2)
    s.pet_buy("neko")
    s.seed_buy(list(more_core.SEEDS)[0])
    cv = more_core.catalog_view()["uzone"]
    z = s.zone_save({"name": "Đảo", "bg": cv["bg"][0]["id"], "ground": cv["ground"][0], "hills": cv["hills"][0],
                     "px": more_core.px_encode(("k" * 64) * 3 + "." * (64 * 73)), "env": ""})
    s.buy("bench")
    s.place(z["zone_id"], "bench", 6, 1)
    s.myseed_save({"name": "Giống", "st": [more_core.px_encode(("g" * 16) * 16)] * 5})
    s.freeze_buy(_dt.date(2026, 11, 13))
    s.paper_sub_buy("tuan", "2026-11-13")
    s.mywear_save({"name": "Mũ", "slot": "head", "px": more_core.px_encode("." * 60 + "r" * 20 + "." * 80)})
    return s


def sections(dirpath):
    s = core.GardenState(os.path.join(dirpath, "state.json"))
    s.today_override = 500
    d = s.load()
    home, m = d["home"], d["more"]
    out = {"coins": d["coins"], "waters": d["waters"], "harvests": d["harvests"], "best": d["best"], "quest": d["quest"],
           "house": home["house"], "zones": home["zones"], "rooms": home.get("rooms"), "styles": home.get("styles"),
           "style": home.get("style"), "wear": d["wear"], "craft": d["craft"], "season": d["season"], "px": s.load_px()}
    for iid, n in home["owned"].items():
        out["owned:" + iid] = n
    for sc, v in home.items():
        if isinstance(v, list) and v and all(isinstance(e, dict) for e in v):
            for e in v:
                out[f"place:{sc}:{e['id']}:{e['x']}:{e['y']}"] = 1
    for k, v in m.items():
        if k != "repair":
            out["more:" + k] = v
    return out, s, d


base = os.path.join(TMP, "fz_base")
os.makedirs(base)
rich(os.path.join(base, "state.json"))
FILES = sorted(f for f in os.listdir(base) if f.endswith(".json"))
S0, _, _ = sections(base)
JUNK = [None, True, 0, -1, 1.5, "x", "", [], {}, [1, "a", None], {"a": 1}, "9" * 50, 10 ** 12, [[]], {"id": "bench", "x": 1, "y": 1}]


def paths(node, pre=()):
    yield pre
    if isinstance(node, dict):
        for k in list(node):
            yield from paths(node[k], pre + (k,))
    elif isinstance(node, list):
        for i in range(min(len(node), 4)):
            yield from paths(node[i], pre + (i,))


def setp(root, path, val):
    if not path:
        return val
    cur = root
    for k in path[:-1]:
        cur = cur[k]
    cur[path[-1]] = val
    return root


WORK = os.path.join(TMP, "fz_w")


def trial(fname, path, junk):
    shutil.rmtree(WORK, ignore_errors=True)
    shutil.copytree(base, WORK)
    J = setp(json.load(open(os.path.join(WORK, fname), encoding="utf-8")), path, copy.deepcopy(junk))
    json.dump(J, open(os.path.join(WORK, fname), "w", encoding="utf-8"))
    try:
        _s1, s, d = sections(WORK)
        s.save(d)
        s2, _, _ = sections(WORK)
    except Exception as e:      # noqa: BLE001
        return f"{type(e).__name__}: {str(e)[:80]}", None
    return None, {k for k in S0 if s2.get(k) != S0[k]}


n, exc, wide, top = 0, [], [], {}
for f in FILES:
    J0 = json.load(open(os.path.join(base, f), encoding="utf-8"))
    for k in (list(J0) if isinstance(J0, dict) else []):
        u = set()
        for junk in JUNK:
            n += 1
            err, lost_ = trial(f, (k,), junk)
            if err:
                exc.append((f, (k,), repr(junk)[:16], err))
            else:
                u |= lost_
        top[(f, k)] = u
    for p in paths(J0):
        if len(p) < 2:
            continue
        for junk in JUNK:
            n += 1
            err, lost_ = trial(f, p, junk)
            if err:
                exc.append((f, p, repr(junk)[:16], err))
            elif lost_ - top[(f, p[0])]:
                wide.append((f, p, repr(junk)[:16], sorted(lost_ - top[(f, p[0])])[:5]))
ok(len(S0) >= 55 and len(FILES) >= 6, f"vườn đầy đủ: {len(S0)} mục theo dõi trong {len(FILES)} khoá lưu ({', '.join(x[:-5] for x in FILES)})")
ok(not exc, f"{n} lượt làm hỏng một nút rồi đọc → lưu → đọc lại: không lượt nào ném lỗi" + (f" — {exc[:3]}" if exc else ""))
ok(not wide, "nút hỏng ở sâu không làm mất nhiều hơn khi hỏng cả khoá cấp một chứa nó" + (f" — {wide[:3]}" if wide else ""))
ok(not (top[("ext.json", "places")] & {k for k in S0 if k.startswith("owned:") or k == "zones"}),
   "phần mở rộng: chỗ đặt hỏng không làm mất đồ đang có / vùng đã mở")
ok(top[("state.json", "craft")] <= {k for k in S0 if k == "craft" or k.startswith(("owned:c", "place:"))} and "house" not in top[("state.json", "craft")],
   "ví: món tự làm hỏng không làm mất nhà / đồ mua")
ok(all(not (u - {k for k in S0 if k.startswith(("place:", "owned:", "rooms"))}) for (f, k), u in top.items() if f == "nha.json"),
   "nhà 3 gian hỏng chỉ ảnh hưởng đồ / gian của nó")
bad = {"id": [], "x": 1, "y": 1}
for fname, path in (("ext.json", ("places", "yard", 0)), ("state.json", ("home", "yard", 0)), ("season.json", ("places", "yard", 0)),
                    ("nha.json", ("places", "kitchen", 0))):
    err, lost_ = trial(fname, path, bad)
    kinds = sorted({k.split(":")[0] for k in (lost_ or [])})
    ok(err is None and len(lost_) <= 1 and kinds in ([], ["place"]), f"{fname}: một bản ghi đồ đặt có id là list → chỉ mất đúng bản ghi đó ({len(lost_ or [])} mục)")

# =========================================================================================================================
print("== 6. Lưới an toàn: phần đọc ném lỗi bất ngờ → không cho lưu")
dc = Col("Hong")
ds = rich(os.path.join(TMP, "uf_dmg", "state.json"))
full, full_px = ds.load(), ds.load_px()         # đọc từ file (chưa có collection)
ds.col_getter = lambda: dc
ds.save(full, px=full_px)                       # đưa vườn đầy đủ vào collection giả
snap0 = dict(dc.conf)
view0 = ds.load()
ok("_damaged" not in view0 and view0["home"]["house"] >= 1 and view0["home"]["owned"].get("bench"), "bình thường: không có `_damaged`")
for name, target, key in (("merge_ext", "merge_ext", core.EXT_KEY), ("merge_season", "merge_season", core.SEASON_KEY),
                          ("merge_nha", "merge_nha", core.NHA_KEY), ("_clean_home", "_clean_home", core.CONFIG_KEY),
                          ("attach_uzones", "attach_uzones", core.MORE_KEY), ("attach_nha", "attach_nha", core.NHA_KEY)):
    real = getattr(core, target)

    def boom(*a, **k):
        raise TypeError("lỗi giả trong " + name)

    setattr(core, target, boom)
    try:
        d = ds.load()
        got = d.get("_damaged")
        try:
            ds.add_coins(5)
            saved = True
        except core.StoreError as e:
            saved, msg = False, str(e)
    finally:
        setattr(core, target, real)
    ok(got == [key] and not saved and dc.conf == snap0 and msg == core.LOAD_DAMAGED,
       f"{name} ném lỗi → `_damaged` = [{key.replace('kotoba_batake_', '')}], lưu bị từ chối, collection còn nguyên")
ok(ds.load() == view0, "hết lỗi → đọc lại đúng như trước, không mất gì")
ok(issubclass(core.StoreError, core.HomeError) and "Báo lỗi" in core.LOAD_DAMAGED, "câu báo là HomeError (hiện trong bảng), nhắc gửi Báo lỗi")

# =========================================================================================================================
print("== 7. Soát mã __init__.py")
I = src("__init__.py")


def body(name):
    m = re.search(r"^def " + re.escape(name) + r"\(.*?(?=^def |^class |^[A-Za-z_]+ *[:=]|^_setup_menu\(|\Z)", I, re.S | re.M)
    return m.group(0) if m else ""


def method(name):
    m = re.search(r"^    def " + re.escape(name) + r"\(.*?(?=^    def |^def |^class )", I, re.S | re.M)
    return m.group(0) if m else ""


ok("sync_core.before_sync(mw.col, USER_DIR)" in body("_on_sync_start") and body("_on_sync_start").index("_flush_undo") < body("_on_sync_start").index("before_sync"),
   "sync_will_start: ghi phần Undo đang chờ rồi mới chụp")
fin = body("_on_sync_finished")
ok("_sync_guard_after()" in fin and fin.index("_sync_guard_after()") < fin.index("_ledger.clear()") < fin.index("mobile_catch_up"),
   "sync_did_finish: so / trả lại TRƯỚC, rồi bỏ sổ Undo, rồi mới bù xu")
ok("sync_core.after_sync(mw.col, USER_DIR, before)" in body("_sync_guard_after"), "… gọi sync_core.after_sync với bản chụp")
op = body("_on_profile_open")
ok("sync_core.on_open(mw.col, USER_DIR" in op and "restoring_backup" in op, "profile_did_open: sync_core.on_open (biết lúc đang khôi phục bản sao lưu)")
ok("_open_pending = True" in op and "if not _will_auto_sync():" in op and "STATE.migrate()" not in op and "mobile_catch_up()" not in op,
   "profile_did_open: việc ghi vào collection đợi lần tự đồng bộ lúc mở (không ghi trước đồng bộ)")
ot = body("_open_tasks")
ok(all(x in ot for x in ("STATE.migrate()", "sub_pending_settle()", "_streak_start()", "mobile_catch_up()")) and "_open_pending = False" in ot,
   "_open_tasks: chuyển dữ liệu cũ, gói báo chờ, mốc chuỗi, bù xu — chạy một lần")
ok("mw.can_auto_sync()" in body("_will_auto_sync") and "_open_tasks()" in fin and "_open_tasks()" in body("open_garden"),
   "chạy sau đồng bộ hoặc khi mở vườn nếu còn chờ")
ok('config().get("sync_guard", True)' in body("_sync_guard_on") and "_sync_guard_on()" in body("_on_sync_start") and "_sync_guard_on()" in body("_sync_guard_after"),
   "tắt được bằng config `sync_guard`")
ok(core.DEFAULT_CONFIG.get("sync_guard") is True and json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")).get("sync_guard") is True
   and "`sync_guard`" in src("config.md"), "`sync_guard` mặc định true ở DEFAULT_CONFIG, config.json; có trong config.md")
ok(core.merged_config({"sync_guard": "false"})["sync_guard"] is False and core.merged_config({"sync_guard": 0})["sync_guard"] is False
   and core.merged_config({})["sync_guard"] is True, "merged_config: sync_guard sai kiểu về đúng kiểu")
ans = method("_answer")
ok("_card_changed(card)" in ans and ans.index("_card_changed(card)") < ans.index("build_answer") and ans.count("_card_changed(card)") >= 2,
   "chấm thẻ: thẻ đã đổi ở chỗ khác → bỏ qua, lấy thẻ kế tiếp (trước khi chấm và khi lưu lỗi)")
ok(ans.index("build_answer") < ans.index("self._busy = True"), "build_answer chạy trước khi đặt `_busy` (lỗi ở đó không làm kẹt bảng ôn)")
# 1.33.3 (audit 17/11 F05): so dấu lịch ôn đủ cột + revlog lúc thẻ hiện ra (không chỉ `mod` theo giây) — test_1333
ok("_card_sig(card.id)" in body("_card_changed") and "select mod, type, queue, due" in body("_card_sig"),
   "_card_changed so dấu lịch ôn của thẻ trong collection (mod + cột lịch ôn + revlog)")
nc_ = method("_next_card")
ok("get_current_id() != self.deck_id" in nc_ and nc_.index("decks.select(self.deck_id)") < nc_.index("get_queued_cards"),
   "lấy thẻ: chọn lại deck của vườn nếu deck hiện tại của Anki đã đổi")
br = method("_on_bridge")
ok("_col_ready()" in br and '"cal:"' in br and br.index("_col_ready()") < br.index("self._dispatch(cmd)"),
   "cầu nối: collection đang đóng (đồng bộ toàn bộ) → bỏ lệnh, trừ nhật ký / cài đặt máy")
ok("getattr(col, \"db\", None) is not None" in body("_col_ready") and "_col_ready()" in method("refresh") and "_col_ready()" in method("_check_day"),
   "refresh / đồng hồ sang ngày không chạy khi collection đóng")
ok("_damage_warn(" in method("refresh") and "_damaged" in method("refresh"), "dữ liệu đọc hỏng → ghi nhật ký Báo lỗi + báo trong vườn")
ok("_answering.clear()" in body("_on_profile_close"), "đóng hồ sơ: bỏ danh sách lượt ôn đang lưu")
ok("backup_core.GATE = _sync_hold" in I and "_sync_running = True" in body("_on_sync_start")
   and body("_on_sync_start").index("before_sync") < body("_on_sync_start").index("_sync_running = True"),
   "sync_will_start: chụp xong thì khoá ghi (backup_core.GATE)")
ga = body("_sync_guard_after")
ok("_sync_running = False" in ga and ga.index("_sync_running = False") < ga.index("after_sync"), "so xong mới mở khoá — cùng một lượt xử lý, không việc nào chen vào")
# 1.35.5 (audit 19/11 #01): khoá giữ tới lúc so xong (Anki tắt thanh tiến độ TRƯỚC khi mở hộp thoại cuối + gọi
# sync_did_finish); cờ kẹt thì chốt an toàn _sync_watch tự so rồi mở khoá (trước đây: hết thanh tiến độ là hết khoá)
ok("return bool(_sync_running)" in body("_sync_hold") and "_on_sync_finished()" in body("_sync_watch")
   and "_sync_busy_now()" in body("_sync_watch") and "_sync_watch" in body("_on_sync_start"),
   "khoá tới lúc so xong; cờ kẹt (Anki không báo xong) → chốt an toàn tự so rồi mở khoá (không khoá ghi mãi)")
ok("_sync_hold()" in br and "_sync_hold()" in method("refresh"), "cầu nối + refresh: không chạy lúc đang đồng bộ")
ok(re.search(r"@_after_sync\ndef _ai_done\(", I) and re.search(r"@_after_sync\ndef _fix_done\(", I) and "_sync_flush()" in fin,
   "Gemini viết báo / sửa bài xong đúng lúc đồng bộ → đợi so xong mới ghi (kết quả không mất)")
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
# 1.31.3: bản sau 1.31.2 vẫn qua (trước đây so đúng "1.31.2" nên lên bản là test cũ báo sai)
_hv = tuple(int(x) for x in re.findall(r"\d+", str(man.get("human_version", "")))[:3])
ok(_hv >= (1, 31, 2) and re.search(r'VERSION\s*=', I) is not None, "manifest: bản " + str(man.get("human_version")) + " (≥ 1.31.2)")

shutil.rmtree(TMP, ignore_errors=True)
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else f"{len(FAIL)} LỖI"))
for f in FAIL:
    print("   ✗ " + f)
sys.exit(1 if FAIL else 0)
