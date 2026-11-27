"""1.36.5 — kiểm tra 1.36.4 lần 2 (27/11), phần chạy nhanh không cần Anki của các kịch bản mới (Anki thật: tests/anki/e2e_dongvuon.js,
e2e_giodoingay.js, e2e_phiendai.js — docs/kiem_thu/1.36.5/BAO_CAO.md):

A. ổ đĩa đầy khi ghi sổ Giáng sinh: file sao lưu `le.json` lỗi (OSError 28) → sổ vẫn vào collection, không ném lỗi; không có
   collection (file là nơi lưu chính) → ném lỗi như cũ;
B. "Next day starts at" 0 / 4 / 23 giờ: ngày Anki (ngay_core.Days) đúng nghĩa add-on dùng (ngày Anki D bắt đầu lúc giờ đổi ngày của D),
   múi giờ Việt Nam;
C. ngày rất xa / đồng hồ lùi (2025, 14/11/2026, 3/2027, 24/12/2027, 2030): mọi hàm dựng data.le chạy được, không tặng / không cất lại,
   ông già Noel / thư không tự bật năm sau; lần đầu mở vườn tháng 3/2027 vẫn cất đồ một lần;
D. giờ đổi ngày 23:00: 18:00 ngày 24 giờ máy (ngày Anki 23) ông già Noel vẫn ghé; đã xem rồi thì sang ngày Anki 24 không chạy lại;
E. LỖI 1.36.5: cửa sổ vườn đã đóng vẫn chạy đồng hồ 60 giây (closeEvent không dừng _day_timer; cửa sổ có cha là cửa sổ chính nên
   còn sống) → sang ngày mới cửa sổ ma dựng lại vườn + nhận quà / cất đồ Giáng sinh thay người dùng. Mã: closeEvent dừng đồng hồ,
   _check_day chỉ chạy ở cửa sổ đang dùng + đang hiện (Anki thật: e2e_dongvuon.js — 1.36.4 đỏ 3/10);
F. hợp đồng dữ liệu = 1.36.4 (d5da849): không thêm / đổi khoá collection, config.json y nguyên, chỉ đổi __init__.py / manifest / README.
Chạy: python test_1365.py THƯ_MỤC_ADD_ON
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile
import time

ADDON = os.path.abspath(sys.argv[1])
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
REF = "d5da849"          # 1.36.4 (gói ở master trước lần kiểm tra này)
sys.path.insert(0, ADDON)
import le_core as le  # noqa: E402
import ngay_core as ngay  # noqa: E402

FAIL = []
PASS = [0]


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


class FakeCol:
    def __init__(self):
        self.conf = {}

    def get_config(self, key, default=None):
        v = self.conf.get(key, default)
        return json.loads(json.dumps(v)) if v is not None else default

    def set_config(self, key, value):
        self.conf[key] = json.loads(json.dumps(value))


D = dt.date
T = dt.datetime

# =========================================================================================================
print("== A. ổ đĩa đầy khi ghi sổ Giáng sinh")
tmp = tempfile.mkdtemp()
col = FakeCol()
store = le.LeStore(os.path.join(tmp, "le.json"), col_getter=lambda: col)
ev = store.load()
ev["open"]["1"] = {"d": "2026-12-01", "b": 0}
real_write = le.backup.write_backup


def full(*a, **k):
    raise OSError(28, "No space left on device")


le.backup.write_backup = full
try:
    store.save(ev)
    ok(True, "file sao lưu lỗi ENOSPC → save() không ném lỗi")
except OSError as err:
    ok(False, "file sao lưu lỗi ENOSPC → save() ném %r" % err)
got = (col.conf.get(le.LE_KEY) or {}).get(le.EV_ID) or {}
ok(got.get("open", {}).get("1", {}).get("d") == "2026-12-01", "sổ đã vào collection (dữ liệu chính)")
ok(not os.path.exists(os.path.join(tmp, "le.json")), "không có file dở dang")
nocol = le.LeStore(os.path.join(tmp, "le2.json"), col_getter=lambda: None)
try:
    nocol.save(le.empty())
    ok(False, "không collection + ổ đầy → phải báo lỗi")
except OSError:
    ok(True, "không collection (file là nơi lưu chính) + ổ đầy → ném OSError như cũ")
le.backup.write_backup = real_write
store.save(ev)
ok(os.path.exists(os.path.join(tmp, "le.json")), "ổ trống lại → lần lưu sau ghi được file sao lưu")

# =========================================================================================================
print("== B. ngày Anki theo giờ đổi ngày 0 / 4 / 23 (giờ Việt Nam)")
os.environ["TZ"] = "Asia/Ho_Chi_Minh"
time.tzset()


def anki_day(now, roll):
    """Ngày Anki như Anki tính mốc day_cutoff: lần giờ đổi ngày kế tiếp sau `now`."""
    cut = now.replace(hour=roll, minute=0, second=0, microsecond=0)
    if cut <= now:
        cut += dt.timedelta(days=1)
    return ngay.Days(int(time.mktime(cut.timetuple()))).today


for now, roll, want, why in [
        (T(2026, 12, 1, 0, 10), 0, D(2026, 12, 1), "0 giờ: 00:10 ngày 1/12 là ngày 1/12"),
        (T(2026, 11, 30, 23, 55), 0, D(2026, 11, 30), "0 giờ: 23:55 ngày 30/11 là ngày 30/11"),
        (T(2026, 12, 1, 2, 30), 4, D(2026, 11, 30), "4 giờ (mặc định): 02:30 ngày 1/12 còn là 30/11"),
        (T(2026, 12, 1, 4, 0), 4, D(2026, 12, 1), "4 giờ: 04:00 ngày 1/12 là 1/12"),
        (T(2026, 12, 1, 12, 0), 23, D(2026, 11, 30), "23 giờ: trưa 1/12 còn là 30/11"),
        (T(2026, 12, 1, 23, 5), 23, D(2026, 12, 1), "23 giờ: 23:05 ngày 1/12 là 1/12"),
        (T(2026, 12, 24, 18, 0), 23, D(2026, 12, 23), "23 giờ: 18:00 ngày 24 là ngày Anki 23"),
        (T(2026, 12, 25, 10, 0), 23, D(2026, 12, 24), "23 giờ: 10:00 ngày 25 là ngày Anki 24 (thư chưa có)"),
        (T(2027, 3, 1, 10, 0), 23, D(2027, 2, 28), "23 giờ: 1/3/2027 10:00 là 28/2"),
]:
    got = anki_day(now, roll)
    ok(got == want, "%s (%s)" % (why, got))

# =========================================================================================================
print("== C. ngày rất xa / đồng hồ lùi")
names = {}
played = le.simulate(D(2026, 12, 26))              # cả mùa: 24 ngăn, quà, hộp
le.mark_seen(played, T(2026, 12, 24, 18, 5), "star,lights")
le.mark_read(played, D(2026, 12, 25), "star,lights")
for today, now in [(D(2025, 12, 24), T(2025, 12, 24, 19)), (D(2026, 11, 14), T(2026, 11, 14, 9)),
                   (D(2027, 3, 1), T(2027, 3, 1, 10)), (D(2027, 12, 24), T(2027, 12, 24, 19)),
                   (D(2027, 12, 25), T(2027, 12, 25, 9)), (D(2030, 6, 1), T(2030, 6, 1, 10))]:
    ph = le.phase(today)
    e = json.loads(json.dumps(played))
    before = json.dumps(e, sort_keys=True)
    try:
        v = le.view(e, today, [], [], 0, names)
        v.update(le.view_more(e, today, now, {}))
        news, soon = le.news_line(e, today, [], [], 0, now), le.soon_line(today)
        good = True
    except Exception as err:            # noqa: BLE001
        good, v, news, soon = False, {}, None, None
        print("     lỗi:", repr(err))
    ok(good, "%s: dựng data.le được (phase %s)" % (today, ph))
    sv = v.get("santa") or {}
    ok(not sv.get("due") and not sv.get("morning"), "%s: ông già Noel / thư không tự bật" % today)
    ok(not v.get("card_edit") and not v.get("hang_edit") and not v.get("orn_edit"), "%s: không sửa thiệp / quả châu" % today)
    plan = le.plan_sync(e, {k: 9 for k in le.expected_items(e)}, {}, le.expected_tiles(e), today)
    ok(plan is None, "%s: kho đủ → không tặng / bù gì (%s)" % (today, plan))
    ok(json.dumps(e, sort_keys=True) == before, "%s: sổ không đổi" % today)
    ok(soon is None, "%s: không có dòng \"Sắp tới\"" % today)
ok(le.phase(D(2025, 12, 24)) is None and le.phase(D(2030, 6, 1)) == "done", "2025 → không có sự kiện; 2030 → kỷ niệm")
e = json.loads(json.dumps(played))
ok(le.pack_due(e, D(2027, 3, 1)), "chưa mở vườn từ 26/12 tới 1/3/2027 → lần mở đầu tiên cất đồ")
le.mark_pack(e, D(2027, 2, 28), le.pack_plan(e, {"le_tuanloc": 1}, {}))
ok(not le.pack_due(e, D(2027, 3, 1)) and not le.pack_due(e, D(2027, 12, 24)), "đã cất → không cất lại (cả Giáng sinh 2027)")
ok(e["pack"]["items"] == {"le_tuanloc": 1}, "cất tuần lộc đang bày")
fresh = le.empty()
ok(le.plan_sync(fresh, {}, {}, [], D(2027, 12, 1)) is None and fresh == le.empty(),
   "1/12/2027 (người chưa từng chơi mùa 2026): không tặng tủ lịch 2026, không ghi sổ")
ok(le.plan_sync(fresh, {}, {}, [], D(2025, 12, 1)) is None, "đồng hồ lùi 1/12/2025: không tặng")
try:
    le.open_door(json.loads(json.dumps(played)), "24", D(2027, 12, 24), ["2027-12-24"], [], 30)
    ok(False, "mở ngăn năm 2027 phải bị từ chối")
except le.LeError as err:
    ok(True, "mở ngăn 24 ngày 24/12/2027 → từ chối: " + str(err))
try:
    le.save_card(json.loads(json.dumps(played)), 1, {"f": "den", "st": [], "t1": "x", "t2": "", "c": "vi", "w": "", "wl": "vi"},
                 D(2027, 12, 20), T(2027, 12, 20, 10))
    ok(False, "làm thiệp năm 2027 phải bị từ chối")
except le.LeError as err:
    ok(True, "làm thiệp 20/12/2027 → từ chối: " + str(err))

# =========================================================================================================
print("== D. giờ đổi ngày 23:00 — ông già Noel theo giờ máy")
e = le.simulate(D(2026, 12, 23))
sv = le.santa_view(e, D(2026, 12, 23), T(2026, 12, 24, 18, 0))
ok(sv["came"] and sv["due"], "18:00 ngày 24 giờ máy, ngày Anki 23 → cảnh đêm (audit #17e)")
ok(not le.santa_view(e, D(2026, 12, 23), T(2026, 12, 24, 17, 59))["due"], "17:59 → chưa")
le.mark_seen(e, T(2026, 12, 24, 18, 1), "")
ok(not le.santa_view(e, D(2026, 12, 24), T(2026, 12, 24, 23, 5))["due"], "đã xem; 23:05 sang ngày Anki 24 → không chạy lại")
ok(le.letter(e, D(2026, 12, 24), T(2026, 12, 25, 10)) is None, "10:00 ngày 25 (ngày Anki 24) → chưa có thư")
ok(le.letter(e, D(2026, 12, 25), T(2026, 12, 25, 23, 1)) is not None, "23:01 ngày 25 (ngày Anki 25) → có thư")

# =========================================================================================================
print("== E. cửa sổ vườn đã đóng không chạy ngầm (mã)")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ce = init[init.index("    def closeEvent(self, event: Any) -> None:"):]
ce = ce[:ce.index("\n\n\n")]
ok("self._day_timer.stop()" in ce, "closeEvent dừng đồng hồ 60 giây")
ok("self._day_timer.stop()" in ce and ce.index("self._day_timer.stop()") < ce.index("self.flush_unsaved()"),
   "dừng đồng hồ trước mọi việc khác (lưu nốt lỗi cũng đã dừng)")
cd = init[init.index("    def _check_day(self) -> None:"):]
cd = cd[:cd.index("        try:")]
ok(re.search(r"if _dialog is not self or not self\.isVisible\(\):\s*\n\s*return", cd) is not None,
   "_check_day: chỉ cửa sổ đang dùng + đang hiện")
og = init[init.index("def open_garden() -> None:"):]
og = og[:og.index("\n\n\n")]
ok(og.index("_dialog.show()") < og.index("_dialog._check_day()"), "open_garden: hiện cửa sổ rồi mới xét sang ngày (cửa sổ ẩn mở lại vẫn sang ngày)")
ok(init.count("QTimer(self)") == 1, "chỉ một đồng hồ gắn với cửa sổ vườn (đã dừng khi đóng)")

# =========================================================================================================
print("== F. hợp đồng dữ liệu = 1.36.4 (%s)" % REF)
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(open(os.path.join(ADDON, fn), encoding="utf-8").read()))
try:
    names = subprocess.run(["git", "-C", ROOT, "ls-tree", "-r", "--name-only", REF, "kotoba_batake/"], capture_output=True,
                           text=True, check=True).stdout.split()
except Exception as err:      # noqa: BLE001
    names = []
    print("  (không có lịch sử git: %s)" % type(err).__name__)
if names:
    old_keys, changed = set(), []
    for fn in names:
        rel = fn[len("kotoba_batake/"):]
        old = subprocess.run(["git", "-C", ROOT, "show", REF + ":" + fn], capture_output=True).stdout
        if rel.endswith(".py"):
            old_keys |= set(KEY_RE.findall(old.decode("utf-8")))
        p = os.path.join(ADDON, rel)
        if not os.path.exists(p):
            changed.append(rel + " (mất)")
        elif open(p, "rb").read() != old:
            changed.append(rel)
    ok(cur_keys == old_keys, "khoá collection trong mã = 1.36.4: %s" % sorted(cur_keys ^ old_keys))
    old_cfg = json.loads(subprocess.run(["git", "-C", ROOT, "show", REF + ":kotoba_batake/config.json"], capture_output=True,
                                        text=True, check=True).stdout)
    ok(json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")) == old_cfg, "config.json y nguyên 1.36.4")
    allowed = {"__init__.py", "manifest.json", "README.md"}
    ok(set(changed) <= allowed, "chỉ đổi: %s (ngoài danh sách: %s)" % (sorted(changed), sorted(set(changed) - allowed)))
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(tuple(int(x) for x in man.get("human_version", "0").split(".")) >= (1, 36, 5), "manifest: 1.36.5 (" + man.get("human_version", "") + ")")

print("\nKẾT QUẢ: %d/%d%s" % (PASS[0], PASS[0] + len(FAIL), " — TẤT CẢ OK" if not FAIL else ""))
sys.exit(1 if FAIL else 0)
