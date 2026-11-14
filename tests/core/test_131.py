"""Test offline 1.31 (python thường + node): ba việc người dùng yêu cầu 14/11.

1. Chuỗi ngày khi mới cài ("chuỗi người dùng anki có đồng bộ với chuỗi trong kotoba không, nếu có thì phải đổi lại, tất cả
   khi mới cài add-on thì chuỗi sẽ là 0"): collection giả (sqlite thật, revlog thật) có 40 ngày ôn liền trước khi cài —
   - không có mốc (≤ 1.30.3 / STREAK_TEST_ALL): chuỗi 41 (đọc cả lịch sử Anki — đúng là lỗi người dùng nói);
   - mốc = lúc cài: chuỗi 0, lượt ôn hôm nay vẫn đếm, ôn sau mốc → 1, cả ngày cài chỉ tính lượt sau mốc;
   - streak_start: tạo một lần (bây giờ / lúc lập sổ bù xu điện thoại của bản cũ), không đổi khi gọi lại, mốc hỏng → đặt lại,
     không có collection → None; vé giữ chuỗi không nối sang ngày trước mốc; "Liền lâu nhất" của Lịch hoa năm chỉ tính từ mốc;
   - nối dây ở __init__.py: mọi chỗ tính chuỗi (Hôm nay, Lịch hoa tháng / năm, Tin làng, Giao diện mùa, vé, Báo lỗi) qua
     _daily_stats / _streak_start; mở hồ sơ đặt mốc trước khi lập sổ bù xu.
2. Chỉ nút "Nhà & Cửa hàng" mở bảng Nhà ("ấn vào đâu có cũng vào thẳng cửa hàng thì không tiện lắm"): soát mã — bấm cảnh
   không gọi open(), nút là <button> bấm được, thú / khách mở thẻ nhỏ, Esc đóng thẻ, chú thích cũ đã bỏ.
3. Đồ tự vẽ cho StackChan + StackChan sinh hoạt mặc đồ: wear_core (làm sạch, giá, sửa, xoá, mặc, giới hạn 12, dữ liệu hỏng),
   ví (mua đồ có sẵn thay món tự vẽ cùng chỗ và ngược lại, cởi, xoá trả PX_KEY), JSON qua lại, mã thật của 1.30.3 (git) đọc +
   lưu vườn có đồ tự vẽ → 1.31 đọc lại không mất; node: bản vẽ nhỏ của 13 món có sẵn (16 cột, màu có trong bảng), thu nhỏ
   món tự vẽ, StackChan sinh hoạt vẽ đồ ở mọi tư thế, fx.js vẽ món tự vẽ / vỏ hai màu.

Chạy: python test_131.py THƯ_MỤC_ADD_ON
"""
import datetime as dt
import json, os, re, sqlite3, subprocess, sys, tempfile, time

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
import journal_core as journal
import more_core

W = core.wear          # bản garden_core nạp (đã gán W.more = more_core)

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb131_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*p):
    with open(os.path.join(ADDON, *p), encoding="utf-8") as f:
        return f.read()


class DB:
    def __init__(self):
        self.c = sqlite3.connect(":memory:")
        self.c.execute("create table revlog (id integer primary key, cid int, usn int, ease int, ivl int, lastIvl int, factor int, time int, type int)")

    def list(self, sql, *a):
        return [r[0] for r in self.c.execute(sql, a)]

    def all(self, sql, *a):
        return [list(r) for r in self.c.execute(sql, a)]

    def scalar(self, sql, *a):
        r = self.c.execute(sql, a).fetchone()
        return r[0] if r else None

    def execute(self, sql, *a):
        self.c.execute(sql, a)


class Sched:
    def __init__(self):
        now = dt.datetime.now()
        cut = now.replace(hour=4, minute=0, second=0, microsecond=0)
        if now >= cut:
            cut += dt.timedelta(days=1)
        self.day_cutoff = int(time.mktime(cut.timetuple()))
        self.today = 1000


class FakeCol:
    def __init__(self, path):
        self.db = DB()
        self.sched = Sched()
        self.conf = {}
        self.path = path

    def get_config(self, k, default=None):
        return json.loads(json.dumps(self.conf[k])) if k in self.conf else default

    def set_config(self, k, v):
        self.conf[k] = json.loads(json.dumps(v))

    def remove_config(self, k):
        self.conf.pop(k, None)

    def review(self, ms, n=1):
        for i in range(n):
            self.db.execute("insert into revlog values (?,?,?,?,?,?,?,?,?)", ms + i, 1, -1, 3, 5, 2, 2500, 4000, 1)


# ---------------------------------------------------------------------------------------------------------------------
print("== 1. chuỗi ngày khi mới cài")
col = FakeCol(os.path.join(TMP, "a", "collection.anki2"))
Dd = core.ngay.days_of(col)
now_ms = int(time.time() * 1000)
for b in range(1, 41):                      # 40 ngày liền tới hôm qua, 6 lượt / ngày
    col.review(Dd.rel_start(-b) * 1000 + 5 * 3600 * 1000, 6)
morning = Dd.rel_start(0) * 1000 + 60 * 1000
col.review(morning, 5)                      # sáng nay, trước khi cài
old = core.daily_stats(col, ())
ok(old["streak"] == 41 and old["reviews"] == 5, "không có mốc (như ≤ 1.30.3): chuỗi đọc cả lịch sử Anki = %d ngày" % old["streak"])
st = core.GardenState(os.path.join(TMP, "a", "state.json"), col_getter=lambda: col)
start = st.streak_start(col, now_ms=max(now_ms, morning + 10000))
ok(isinstance(start, int) and core.clean_start(col.get_config(core.START_KEY)) == start, "streak_start lần đầu: ghi mốc vào collection (%s)" % core.START_KEY)
new = core.daily_stats(col, (), start)
ok(new["streak"] == 0 and new["reviews"] == 5, "mới cài: chuỗi 0, lượt hôm nay vẫn 5 (mục tiêu ngày không đổi)")
col.review(start + 1000)
s1 = core.daily_stats(col, (), start)
ok(s1["streak"] == 1 and s1["reviews"] == 6, "ôn một lượt sau mốc: chuỗi 1 ngày")
ok(st.streak_start(col) == start and st.streak_start(col, now_ms=start + 10 ** 9) == start, "gọi lại: mốc không đổi")
days, _today = core.review_days(col, 400, start)
ok(days == {0}, "review_days từ mốc: chỉ hôm nay (%s)" % sorted(days))
days_all, _t = core.review_days(col, 400)
ok(len(days_all) == 41, "review_days không mốc: 41 ngày (giữ nguyên cho chỗ khác dùng)")
# hôm sau: chuỗi 1 (hôm nay chưa ôn → tính tới hôm qua) — giả bằng mốc ở hôm qua + lượt hôm qua sau mốc
col2 = FakeCol(os.path.join(TMP, "b", "collection.anki2"))
D2 = core.ngay.days_of(col2)
for b in range(1, 31):
    col2.review(D2.rel_start(-b) * 1000 + 8 * 3600 * 1000, 3)
start2 = D2.rel_start(-1) * 1000 + 9 * 3600 * 1000          # cài lúc 9 giờ hôm qua (sau lượt 8 giờ)
ok(core.daily_stats(col2, (), start2)["streak"] == 0, "cài hôm qua sau khi đã ôn, hôm qua không ôn thêm: chuỗi 0")
col2.review(start2 + 3600 * 1000)
ok(core.daily_stats(col2, (), start2)["streak"] == 1, "ôn thêm hôm qua sau khi cài, hôm nay chưa ôn: chuỗi 1 (tính tới hôm qua)")
# người dùng bản cũ: sổ bù xu điện thoại có sẵn → mốc = lúc lập sổ
col3 = FakeCol(os.path.join(TMP, "c", "collection.anki2"))
D3 = core.ngay.days_of(col3)
for b in range(0, 25):
    col3.review(D3.rel_start(-b) * 1000 + 6 * 3600 * 1000 if b else int(time.time() * 1000) - 5000, 2)
led = D3.rel_start(-10) * 1000 + 3600 * 1000
col3.set_config(core.MOBILE_KEY, core.new_mobile(led))
st3 = core.GardenState(os.path.join(TMP, "c", "state.json"), col_getter=lambda: col3)
m3 = st3.streak_start(col3)
ok(m3 == led, "đã dùng bản cũ (sổ bù xu lập 10 ngày trước): mốc = lúc lập sổ")
ok(core.daily_stats(col3, (), m3)["streak"] == 11, "… chuỗi = 10 ngày trước + hôm nay = 11")
col3.set_config(core.START_KEY, {"v": 1, "ms": "hỏng"})
ok(st3.streak_start(col3) == led, "mốc hỏng (sai kiểu) → đặt lại theo sổ bù xu")
col3.set_config(core.MOBILE_KEY, core.new_mobile(int(time.time() * 1000) + 10 ** 8))
col3.remove_config(core.START_KEY)
m4 = st3.streak_start(col3, now_ms=int(time.time() * 1000))
ok(abs(m4 - int(time.time() * 1000)) < 5000, "sổ bù xu ghi thời điểm tương lai (đồng hồ máy sai) → mốc = bây giờ")
ok(core.GardenState(os.path.join(TMP, "d", "state.json")).streak_start() is None, "không có collection: None (đếm hết như cũ)")
ok(core.clean_start(True) is None and core.clean_start(-5) is None and core.clean_start({"ms": 10 ** 15}) is None and core.clean_start(123) == 123,
   "clean_start: bool / âm / quá lớn → None")
# vé giữ chuỗi: không vá chỗ hổng nối sang ngày trước mốc
col4 = FakeCol(os.path.join(TMP, "e", "collection.anki2"))
D4 = core.ngay.days_of(col4)
col4.review(D4.rel_start(-3) * 1000 + 3600 * 1000 * 6, 3)   # ngày −3 (trước mốc)
start4 = D4.rel_start(-2) * 1000                              # cài đầu ngày −2, chưa ôn gì sau đó
fz = {"n": 2, "days": [], "since": (D4.today - dt.timedelta(days=5)).isoformat()}
d4, t4 = core.review_days(col4, 400, start4)
ok(more_core.freeze_settle(fz, d4, t4) == [] and fz["n"] == 2, "vé giữ chuỗi không dùng để nối sang ngày ôn trước khi cài")
fz2 = {"n": 2, "days": [], "since": (D4.today - dt.timedelta(days=5)).isoformat()}
d4b, t4b = core.review_days(col4, 400)
ok(len(more_core.freeze_settle(fz2, d4b, t4b)) == 2, "(so sánh: không mốc thì vé vá hai ngày −2, −1)")
# Lịch hoa năm: Liền lâu nhất chỉ từ mốc
sd = core.streak_iso_days(col, start, D4.today.replace(month=1, day=1), D4.today.replace(month=12, day=31))
y = Dd.today.year
counts = journal.revlog_days(col, dt.date(y, 1, 1), dt.date(y, 12, 31))
yv_old = journal.year_view(y, Dd.today, counts, {}, 30, None, 0)
yv_new = journal.year_view(y, Dd.today, counts, {}, 30, None, 1, (), sd)
ok(yv_new["sum"]["best"] == 1 and yv_old["sum"]["best"] >= min(41, Dd.today.timetuple().tm_yday),
   "Lịch hoa năm: Liền lâu nhất %d (không mốc %d) — hoa / số ngày đã ôn giữ nguyên (%d)" % (yv_new["sum"]["best"], yv_old["sum"]["best"], yv_new["sum"]["days"]))
ok(yv_new["sum"]["days"] == yv_old["sum"]["days"], "số ngày đã ôn trong năm không đổi (lịch sử thật)")
ok(core.streak_iso_days(col, 10 ** 13, dt.date(y, 1, 1), dt.date(y, 1, 2)) == set(), "streak_iso_days: mốc sau khoảng → rỗng")

init = src("__init__.py")
ok("def _streak_start(" in init and "core.daily_stats(col, STATE.frozen_days(), _streak_start(col))" in init, "_daily_stats truyền mốc tính chuỗi")
ok(init.count("_daily_stats(") >= 8 and "core.daily_stats(col, STATE.frozen_days())" not in init, "không còn chỗ gọi daily_stats thiếu mốc (Báo lỗi cũng qua _daily_stats)")
ok("core.review_days(mw.col, start_ms=_streak_start())" in init, "vé giữ chuỗi dùng ngày ôn từ mốc")
ok(re.search(r"_streak_start\(\)\n\s+# 1\.11: lần đầu chỉ đặt mốc;[^\n]*\n\s+res = mobile_catch_up\(\)", init) is not None, "mở hồ sơ: đặt mốc trước khi lập sổ bù xu")
ok("core.streak_iso_days(mw.col, _streak_start()" in init, "Lịch hoa năm: Liền lâu nhất từ mốc")
ok("STREAK_TEST_ALL = False" in init and "if STREAK_TEST_ALL:" in init, "bản phát hành: STREAK_TEST_ALL = False (chỉ add-on test bật)")
zz = open(os.path.join(HERE, "..", "anki", "zz_kbtest", "__init__.py"), encoding="utf-8").read()
ok("_kb.STREAK_TEST_ALL = True" in zz, "add-on test bật STREAK_TEST_ALL cho kịch bản cũ (collection mẫu có lịch sử ôn)")
ok("review_day_total" in init and "core.review_day_total(mw.col, before_today=True)" in init, "tổng ngày học (mốc 100 ngày) vẫn theo lịch sử thật")

# ---------------------------------------------------------------------------------------------------------------------
print("== 2. chỉ nút \"Nhà & Cửa hàng\" mở bảng Nhà")
home = src("web", "home.js")
body = src("web", "body.html")
css = src("web", "garden.css")
m = re.search(r'\$\("kb-yard"\)\.addEventListener\("click", \(ev\) => \{(.*?)\n      \}\);', home, re.S)
clk = m.group(1) if m else ""
ok(m is not None and "open(" not in clk.replace("H.openPaper", "") and "openFromMain" not in clk, "bấm cảnh không gọi open() (không mở bảng Nhà)")
ok("sceneCard(\"pet\"" in clk and "sceneCard(\"guest\"" in clk and "GardenLife.poke" in clk and "GardenFinds.hit" in clk and "H.openPaper" in clk,
   "bấm thú / khách → thẻ nhỏ; StackChan / chỗ lấp lánh / hòm thư giữ việc riêng")
ok('<button type="button" id="kb-yard-home" class="kb-yard-hint"' in body and 'title="Bấm để vào Nhà' not in body, "nhãn là <button> id kb-yard-home; khung cảnh bỏ chú thích \"Bấm để vào\"")
ok(re.search(r"\.kb-yard-hint \{[^}]*pointer-events: none", css) is None and ".kb-yard-hint:focus-visible" in css, "nút bấm được (không pointer-events: none), hiện khi Tab tới")
ok(re.search(r"\.kb-yard-wrap \{[^}]*cursor: pointer", css) is None, "khung cảnh không còn con trỏ bàn tay ở mọi chỗ")
ok('yh.addEventListener("click", (ev) => { ev.stopPropagation(); closeSceneCard(); openFromMain(); })' in home and 'const hb = $("kb-house")' in home,
   "nút mở bảng Nhà như nút Nhà ở thanh trên (đóng bảng khác trước)")
ok("bấm để bày đồ" not in home and "(bấm để chăm)" not in home and "bấm để xem Album khách" not in home, "chú thích rê chuột không hứa \"bấm để …\" nữa")
ok('if (ev.key === "Escape" && sc && !sc.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true; closeSceneCard(); }' in home,
   "Esc đóng thẻ nhỏ, không đóng cửa sổ vườn")
ok("closeSceneCard();\n    if (typeof GardenFinds" in home, "mở bảng Nhà thì đóng thẻ nhỏ")

# ---------------------------------------------------------------------------------------------------------------------
print("== 3. wear_core: đồ tự vẽ cho StackChan")
P = core.CRAFT_PALETTE
hat = more_core.px_encode("." * 20 * 3 + "r" * 20 + ("." * 4 + "r" * 12 + "." * 4) * 2 + "." * 20 * 2)
ok(W.px_code(hat, "head", P) is not None and W.px_code(hat, "face", P) is None, "mã điểm ảnh đúng cỡ lưới của chỗ mặc (mũ 20×8, mặt 20×9)")
dec = W.empty()
px = {}
cost, wid, code = W.save(dec, {"name": "Mũ đỏ", "slot": "head", "px": hat}, px, P)
px[wid] = code
ok((cost, wid) == (200, "w1") and dec["items"]["w1"] == {"name": "Mũ đỏ", "slot": "head"} and dec["next"] == 2, "tạo mũ: 200 xu, id w1")
ok(W.save(dec, {"id": "w1", "name": "Mũ", "slot": "head", "px": hat}, px, P)[0] == 0 and dec["items"]["w1"]["name"] == "Mũ", "đổi tên (hình như cũ): miễn phí")
hat2 = more_core.px_encode("y" + "." * 159)
ok(W.save(dec, {"id": "w1", "name": "Mũ", "slot": "head", "px": hat2}, px, P)[0] == 50, "vẽ lại: 50 xu")
c2, w2, code2 = W.save(dec, {"slot": "shell", "c": ["g", "G"]}, px, P)
ok((c2, w2, code2) == (150, "w2", None) and dec["items"]["w2"]["c"] == ["g", "G"] and dec["items"]["w2"]["name"] == "Đồ của tớ", "vỏ: 150 xu, hai màu, không có điểm ảnh, tên mặc định")
ok(W.save(dec, {"id": "w2", "slot": "shell", "c": ["g", "G"]}, px, P)[0] == 0 and W.save(dec, {"id": "w2", "slot": "shell", "c": ["y", "G"]}, px, P)[0] == 50,
   "vỏ: giữ màu miễn phí, đổi màu 50 xu")


def werr(*a):
    try:
        W.save(*a)
    except W.WearError as e:
        return str(e)
    return ""


ok("trống" in werr(dec, {"slot": "head", "px": more_core.px_encode("." * 160)}, px, P), "hình trống → từ chối")
ok("lỗi" in werr(dec, {"slot": "head", "px": "zz"}, px, P) and "lỗi" in werr(dec, {"slot": "head", "px": hat.replace("r", "#")}, px, P),
   "mã hỏng / màu ngoài bảng → từ chối")
ok("lỗi" in werr(dec, {"slot": "neck", "px": hat}, px, P), "hình sai cỡ (mũ 20×8 lưu vào chỗ cổ 20×5) → từ chối")
ok("Chọn chỗ mặc" in werr(dec, {"slot": "hat", "px": hat}, px, P) and "không hợp lệ" in werr(dec, None, px, P) and "không hợp lệ" in werr(dec, [1], px, P),
   "chỗ mặc lạ / payload không phải đối tượng → từ chối")
ok("hai màu" in werr(dec, {"slot": "shell", "c": ["g"]}, px, P) and "hai màu" in werr(dec, {"slot": "shell", "c": ["#", "x"]}, px, P)
   and "hai màu" in werr(dec, {"slot": "shell", "c": [".", "g"]}, px, P), "vỏ: thiếu màu / màu lạ / trong suốt → từ chối")
ok("Không tìm thấy" in werr(dec, {"id": "w99", "slot": "head", "px": hat}, px, P) and "Không đổi được chỗ" in werr(dec, {"id": "w1", "slot": "neck",
   "px": more_core.px_encode("r" * 100)}, px, P), "sửa: id lạ / đổi chỗ mặc → từ chối")
big = W.empty()
for i in range(12):
    W.save(big, {"slot": "shell", "c": ["g", "G"]}, {}, P)
ok("12 món" in werr(big, {"slot": "shell", "c": ["g", "G"]}, {}, P) and len(big["items"]) == 12, "tối đa 12 món")
W.delete(big, "w3")
ok(W.save(big, {"slot": "shell", "c": ["g", "G"]}, {}, P)[1] == "w13", "xoá rồi tạo: id mới (không dùng lại id cũ — điểm ảnh máy khác chưa đồng bộ không lẫn)")
ok(W.put_on(dec, "w1") == "head" and dec["on"] == {"head": "w1"}, "mặc w1 → chỗ Mũ")
W.delete(dec, "w1")
ok("w1" not in dec["items"] and dec["on"] == {}, "xoá món đang mặc → cởi ra")
try:
    W.delete(dec, "w1")
    ok(False, "xoá lần hai phải lỗi")
except W.WearError:
    ok(True, "xoá món không còn → lỗi tiếng Việt")
# làm sạch dữ liệu hỏng / của bản sau
raw = {"items": {"w1": {"name": "<b>A</b>" * 9, "slot": "head"}, "w2": {"slot": "shell", "c": ["g", "zz"]}, "x9": {"slot": "head"},
                 "w3": {"slot": "tail"}, "w4": "hỏng", "w5": {"slot": "neck"}}, "next": "a", "on": {"head": "w1", "neck": "w9", "shell": "w2", "tail": "w3"}}
c = W.clean(raw, P)
ok(sorted(c["items"]) == ["w1", "w5"] and "<" not in c["items"]["w1"]["name"] and ">" not in c["items"]["w1"]["name"]
   and len(c["items"]["w1"]["name"]) <= 24, "clean: bỏ id sai dạng / chỗ lạ / vỏ màu hỏng, tên bỏ <> và ≤ 24 ký tự")
ok(c["on"] == {"head": "w1"} and c["next"] == 6, "clean: chỉ giữ món đang mặc có thật đúng chỗ; next ≥ id lớn nhất + 1")
for bad in (None, 5, "x", [], {"items": []}, {"items": {"w1": None}}, {"on": "head"}):
    ok(W.clean(bad, P) == W.empty() or (isinstance(bad, dict) and W.clean(bad, P)["items"] == {}), "clean(%r) không ném lỗi" % (bad,))
iv = W.items_view({"items": {"w1": {"name": "M", "slot": "head"}, "w2": {"name": "V", "slot": "shell", "c": ["g", "G"]}}, "next": 3, "on": {}},
                  {"w1": hat}, P)
ok(iv[0]["rows"][3] == "r" * 20 and len(iv[0]["rows"]) == 8 and iv[0]["dy"] == -5 and iv[1]["hex"] == [P["g"], P["G"]], "items_view: hàng điểm ảnh đã giải nén + dy, vỏ có mã màu")
ok(W.items_view({"items": {"w1": {"name": "M", "slot": "head"}}, "next": 2, "on": {}}, {}, P)[0]["rows"] == [], "điểm ảnh chưa đồng bộ tới máy này: rows rỗng (vẽ như chưa mặc)")

print("== ví: đồ tự vẽ + đồ có sẵn")
st = core.GardenState(os.path.join(TMP, "w", "state.json"))
d = st.load(); d["coins"] = 2000; st.save(d)
r = st.mywear_save({"name": "Mũ", "slot": "head", "px": hat})
ok(r["coins"] == 1800 and r["mywear_id"] == "w1" and r["more"]["mywear"]["on"]["head"] == "w1" and st.load_px().get("w1"), "tạo mũ: trừ 200 xu, mặc luôn, điểm ảnh ở PX_KEY")
r = st.buy_wear("straw")
ok(r["wear"]["on"]["head"] == "straw" and "head" not in r["more"]["mywear"]["on"], "mua Mũ rơm: mặc Mũ rơm, cởi mũ tự vẽ")
r = st.put_on("w1")
ok(r["more"]["mywear"]["on"]["head"] == "w1" and "head" not in r["wear"]["on"], "mặc lại mũ tự vẽ: ví bỏ Mũ rơm ở chỗ đó")
r = st.put_on("straw")
ok(r["wear"]["on"]["head"] == "straw" and "head" not in r["more"]["mywear"]["on"], "mặc Mũ rơm đã có: bỏ mũ tự vẽ")
r = st.take_off("head")
ok("head" not in r["wear"]["on"] and "head" not in r["more"]["mywear"]["on"], "cởi chỗ Mũ: cả hai đều cởi")
r = st.mywear_save({"slot": "shell", "c": ["p", "R"]})
ok(r["coins"] == 1800 - 120 - 150 and r["more"]["mywear"]["on"]["shell"] == "w2", "tạo vỏ: 150 xu, mặc luôn")
r = st.mywear_save({"id": "w1", "name": "Mũ mới", "slot": "head", "px": hat})
ok(r["coins"] == 1530 and "head" not in r["more"]["mywear"]["on"], "đổi tên món không mặc: miễn phí, không tự mặc")
for bad, why in ((lambda: st.put_on("w9"), "id lạ"), (lambda: st.put_on("crown"), "đồ có sẵn chưa mua"), (lambda: st.mywear_delete("w9"), "xoá id lạ"),
                 (lambda: st.mywear_save({"slot": "head"}), "thiếu hình"), (lambda: st.take_off("tail"), "chỗ lạ")):
    try:
        bad()
        ok(False, why + ": phải lỗi")
    except core.HomeError:
        ok(True, why + ": HomeError tiếng Việt")
d = st.load(); d["coins"] = 100; st.save(d)
try:
    st.mywear_save({"slot": "head", "px": hat})
    ok(False, "thiếu xu phải lỗi")
except core.HomeError as e:
    ok("Thiếu" in str(e) and len(st.load()["more"]["mywear"]["items"]) == 2, "thiếu xu: từ chối, không tạo món (%s)" % e)
r = st.mywear_delete("w1")
ok("w1" not in r["more"]["mywear"]["items"] and "w1" not in st.load_px(), "xoá: bỏ khỏi danh sách và PX_KEY")
cat = core.home_catalog(st.load(), st.load_px())
ok(cat["mywear"]["price"] == 200 and cat["mywear"]["grid"]["head"] == {"w": 20, "h": 8, "dy": -5} and [e["id"] for e in cat["mywears"]] == ["w2"],
   "danh mục gửi sang trang: giá, lưới từng chỗ, món tự vẽ")
blob = json.loads(json.dumps(st.load()))
ok(blob["more"]["mywear"]["items"]["w2"]["c"] == ["p", "R"], "JSON qua lại giữ nguyên")

print("== máy khác còn 1.30.3 (mã thật từ git) đọc + lưu vườn có đồ tự vẽ")
st5 = core.GardenState(os.path.join(TMP, "old", "state.json"))
d = st5.load(); d["coins"] = 5000; st5.save(d)
st5.buy_wear("bow"); st5.mywear_save({"name": "Mũ", "slot": "head", "px": hat}); st5.mywear_save({"slot": "shell", "c": ["g", "G"]})
before = st5.load()
px_before = dict(st5.load_px())
SCRIPT = r'''
import sys, json
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import garden_core as core
st = core.GardenState(sys.argv[3])
d = st.load(); d["coins"] += 7; st.save(d)
st.buy_wear("glasses")
st.save_px(st.load_px())
print(json.dumps({"coins": st.load()["coins"], "wear": st.load()["wear"], "mywear": "mywear" in st.load()["more"]}))
'''
o = os.path.join(TMP, "old130")
try:
    os.makedirs(o)
    arch = subprocess.run(["git", "-C", REPO, "archive", "36bb57b", "kotoba_batake"], capture_output=True, check=True).stdout
    subprocess.run(["tar", "-x", "-C", o], input=arch, check=True)
    rr = subprocess.run([sys.executable, "-c", SCRIPT, os.path.join(o, "kotoba_batake"), STUBS, st5.path], capture_output=True, text=True)
    out = json.loads(rr.stdout.strip().splitlines()[-1]) if rr.returncode == 0 else None
    ok(out is not None and out["mywear"] is False and out["wear"]["on"].get("neck") == "bow" and out["wear"]["on"].get("face") == "glasses",
       "1.30.3 chạy được trên ví 1.31 (không biết đồ tự vẽ, mặc thêm Kính tròn)" + ("" if out else ": " + rr.stderr[-300:]))
    after = st5.load()
    ok(after["more"]["mywear"] == before["more"]["mywear"] and st5.load_px().get("w1") == px_before.get("w1") and "w1" in px_before,
       "1.31 đọc lại: đồ tự vẽ + điểm ảnh còn nguyên")
    ok(after["wear"]["on"].get("face") == "glasses" and after["coins"] == before["coins"] - 100 + 7, "thao tác của bản cũ giữ đúng (Kính tròn, xu)")
except Exception as e:     # chạy trên gói giải nén ngoài repo
    print("  (bỏ qua: %s)" % str(e)[:80])

print("== nối dây: cầu nối, Tủ đồ, Xưởng, linh vật, StackChan sinh hoạt")
ok('if cmd.startswith("wear:"):' in init and "STATE.mywear_save(_json_obj(" in init and '("mywear", "del"): STATE.mywear_delete' in init
   and '("craft", "myseed", "tile", "mywear")' in init, "__init__: craft:wear: (JSON phải là đối tượng), home:mywear:del, danh mục gửi lại")
craft = src("web", "craft.js")
ok("function openWear(w, slot)" in craft and "commit(\"craft:wear:\"" in craft and "wearGuide()" in craft and "drawWearPreview" in craft
   and "GardenLife.preview(ctx" in craft, "Xưởng: chế độ đồ, hình mờ của thân dưới lưới, xem trước hai StackChan")
ok('b.setAttribute("data-wear-new", slot)' in home and "GardenCraft.openWear(" in home and 'H.send("home:mywear:del:"' in home,
   "Tủ đồ: Tự vẽ (Mũ / Mặt / Cổ / Vỏ), Sửa, Xoá hai lần")
fx = src("web", "fx.js")
ok("function shellOf(id)" in fx and "mine.on" in fx and "wearOn: function ()" in fx and "mineSigStr" in fx, "linh vật góc trái: đang mặc = có sẵn + tự vẽ, vẽ lại khi món đổi")
life = src("web", "life.js")
ok("const MINI_WEAR = {" in life and "function wearOver(" in life and life.count("wearOver(ctx") >= 5, "StackChan sinh hoạt: bản vẽ nhỏ + vẽ đồ ở mọi tư thế")
mini_ids = set(re.findall(r"^    (\w+): \{ dy:", life[life.index("const MINI_WEAR"):life.index("const WPAL")], re.M))
ok(mini_ids == {k for k, v in core.WEAR.items() if v["slot"] != "shell"}, "mọi đồ có sẵn (trừ vỏ — đổi màu) có bản vẽ nhỏ: %d món" % len(mini_ids))

print("== node: vẽ đồ trên StackChan sinh hoạt / linh vật")
rnode = subprocess.run(["node", os.path.join(HERE, "test_131.js"), ADDON], capture_output=True, text=True)
print("\n".join("    " + x for x in rnode.stdout.strip().splitlines()))
ok(rnode.returncode == 0 and "TẤT CẢ OK" in rnode.stdout, "test_131.js" + ("" if rnode.returncode == 0 else ": " + rnode.stderr[-300:]))

print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d mục trượt" % len(FAIL)))
sys.exit(1 if FAIL else 0)
