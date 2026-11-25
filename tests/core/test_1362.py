"""1.36.2 — sửa lỗi nhánh audit/release-review-1.36.1-2026-11-24 (le_core.py + cầu nối).

A. #01 thiệp nhận: giữ → xoá → giữ lại bằng cùng mã, qua LeStore + collection (trước: thiệp vừa giữ lại mất ngay lúc lưu);
   hai máy: lần giữ / xoá sau thắng (dấu "t" tới giây); sổ 1.36.1 (không có "t") vẫn như cũ; thử ngẫu nhiên có đối chứng
   (hai máy thao tác + đồng bộ chen ngang → khớp mô hình "thao tác sau cùng thắng"; gộp giao hoán; làm sạch hai lần như một);
B. #15 cắt sổ mở bù / lượt nhờ sửa có tác dụng cả sau khi gộp với collection; gộp "mẫu cũ" (prev) giao hoán;
C. #17: Gemini về sau 18:00 ngày 24 không gắn vào thiệp ông đã mang đi (b); một chú tuần lộc đèn (c); ngăn / hộp có ngày ngoài
   mùa bị bỏ khi làm sạch (d); giờ đổi ngày của Anki sau 18 giờ — tối 24 vẫn xem cảnh đêm (e);
D. bản 1.36.1 (mã thật, tests/fixtures/le_1361) đọc + ghi sổ 1.36.2 → không lỗi, giữ thiệp nhận; 1.36.2 đọc sổ 1.36.1 y nguyên;
E. soát mã cầu nối: lệnh le:* bỏ lúc đồng bộ có trả lời (#04), le:keep + lưu nốt khi đóng (#05), Trang trí thử nhớ mẫu cũ (#07),
   18:00 ngày 24 dựng lại vườn (#11), Kỷ niệm từ 1/1 khi chỉ có thiệp (#12), xem thử không sang hồ sơ khác (#14), cất đồ ghi đúng
   mẫu trả lại (#17f); Esc của bảng Giáng sinh chặn ở pha capture (#02); phím tắt màn chính (#06); toast (#08);
F. hợp đồng dữ liệu: không thêm khoá collection / mục config; chỉ thêm trường "t" trong thiệp nhận.
Chạy: python test_1362.py THƯ_MỤC_ADD_ON
"""
import copy
import datetime as dt
import importlib.util
import json
import os
import random
import re
import subprocess
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import le_core as le

D = dt.date
T = dt.datetime
FAIL = []
PASS = [0]
TMP = tempfile.mkdtemp(prefix="kb1362_")
SEED = int(os.environ.get("KB_SEED", "1362"))


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


class Col:
    def __init__(self):
        self.conf = {}

    def get_config(self, k, default=None):
        return json.loads(json.dumps(self.conf.get(k, default)))

    def set_config(self, k, v):
        self.conf[k] = json.loads(json.dumps(v))

    def remove_config(self, k):
        self.conf.pop(k, None)


CARD = {"f": "den", "st": [{"s": "xmastree", "x": 6, "y": 22}], "t1": "Giáng sinh an lành!", "t2": "— Lan", "c": "ja",
        "w": "日本語が上手になりますように", "wl": "ja"}
D10, D24, D25 = D(2026, 12, 10), D(2026, 12, 24), D(2026, 12, 25)
CODES = [le.card_code(dict(CARD, t1="Bạn %d" % i)) for i in range(10)]

# =========================================================================================================
print("== A. thiệp nhận: xoá rồi giữ lại (audit #01)")
col = Col()
store = le.LeStore(os.path.join(TMP, "a.json"), lambda: col)
k0 = CODES[0]
e = store.load(); le.recv_add(e, k0, D10, T(2026, 12, 10, 9)); store.save(e)
e = store.load(); le.recv_del(e, k0, T(2026, 12, 10, 9, 5)); store.save(e)
ok(le.recv_list(store.load()) == [], "giữ → lưu → xoá → lưu: không còn")
e = store.load(); le.recv_add(e, k0, D(2026, 12, 11), T(2026, 12, 11, 8)); store.save(e)
got = le.recv_list(store.load())
ok([x["k"] for x in got] == [k0] and got[0]["at"] == "2026-12-11", "dán lại đúng mã đó → Giữ vào Album → lưu → đọc lại: CÓ thiệp (1.36.1: mất)")
# cùng một giây: giữ → xoá → giữ (dấu thời gian luôn sau lần trước)
col2 = Col(); s2 = le.LeStore(os.path.join(TMP, "a2.json"), lambda: col2)
tt = T(2026, 12, 12, 10, 0, 0)
for op in ("add", "del", "add", "del", "add"):
    e = s2.load()
    (le.recv_add(e, k0, D(2026, 12, 12), tt) if op == "add" else le.recv_del(e, k0, tt))
    s2.save(e)
ok(len(le.recv_list(s2.load())) == 1, "5 lần giữ / xoá trong cùng một giây → lần cuối (giữ) thắng")
ts = [x.get("t") for x in col2.conf[le.LE_KEY]["noel2026"]["recv"]]
ok(ts and all(isinstance(x, str) and le.DT_RE.match(x) for x in ts), "thiệp nhận có dấu thời gian tới giây \"t\": %s" % ts)

# hai máy
a, b = le.empty(), le.empty()
le.recv_add(a, k0, D10, T(2026, 12, 10, 9))
b = copy.deepcopy(a)
le.recv_del(b, k0, T(2026, 12, 10, 10))                 # máy B xoá sau
m = le.merge_ev(a, b)
ok(le.recv_list(m) == [] and le.merge_ev(b, a) == m, "máy B xoá sau → gộp: xoá (cả hai chiều như nhau)")
a = copy.deepcopy(m)                                        # máy A đồng bộ (thấy đã xoá) rồi dán lại mã đó
le.recv_add(a, k0, D(2026, 12, 11), T(2026, 12, 11, 9))
m = le.merge_ev(a, b)                                       # máy B còn dấu xoá cũ
ok([x["k"] for x in le.recv_list(m)] == [k0] and le.merge_ev(b, a) == m and le.recv_list(m)[0]["at"] == "2026-12-11",
   "máy A giữ lại sau lần xoá của B → gộp với dấu xoá cũ của B: còn, ngày nhận là ngày giữ lại")
# sổ 1.36.1 (không có "t"): xoá ở máy nào cũng xoá, ngày nhận sớm nhất (như 1.36.1)
o1 = {"open": {}, "bu": {}, "gift": {}, "box": {}, "recv": [{"k": k0, "at": "2026-12-10"}]}
o2 = {"open": {}, "bu": {}, "gift": {}, "box": {}, "recv": [{"k": k0, "at": "2026-12-12", "x": 1}]}
mo = le.merge_ev(o1, o2)
ok(le.recv_list(mo) == [] and mo["recv"][0]["at"] == "2026-12-10" and le.merge_ev(o2, o1) == mo, "hai sổ 1.36.1 (không có \"t\"): như 1.36.1")
# 1.36.2 giữ lại trên nền dấu xoá của 1.36.1 (đúng ca của audit: collection còn {"x": 1} không có "t")
e = le.clean_ev(o2); le.recv_add(e, k0, D(2026, 12, 13), T(2026, 12, 13, 9))
ok([x["k"] for x in le.recv_list(le.merge_ev(e, o2))] == [k0], "dấu xoá của bản 1.36.1 trong collection → 1.36.2 giữ lại được")

print("   thử ngẫu nhiên: hai máy, đồng bộ chen ngang, đối chiếu mô hình")
bad = []
for seed in range(SEED, SEED + 400):
    rnd = random.Random(seed)
    clock = T(2026, 12, 5, 8)
    m1, m2 = le.empty(), le.empty()
    ops = {}          # mã → [(t, còn?)] mọi thao tác ở cả hai máy
    for step in range(rnd.randint(3, 30)):
        who = rnd.choice((m1, m2))
        k = rnd.choice(CODES[:5])
        clock += dt.timedelta(seconds=rnd.choice([0, 0, 1, 7, 3600]))
        live = k in {x["k"] for x in le.recv_list(who)}
        (le.recv_del(who, k, clock) if live else le.recv_add(who, k, clock.date(), clock))
        ent = next(x for x in who["recv"] if x["k"] == k)
        ops.setdefault(k, []).append((ent["t"], not live))
        if rnd.random() < 0.3:          # đồng bộ: hai máy thành một bản
            mm = le.merge_ev(m1, m2)
            if mm != le.merge_ev(m2, m1):
                bad.append("seed %d: gộp không giao hoán" % seed)
                break
            m1, m2 = copy.deepcopy(mm), copy.deepcopy(mm)
    final = le.merge_ev(m1, m2)
    if final != le.merge_ev(m2, m1):
        bad.append("seed %d: gộp cuối không giao hoán" % seed)
    if le.clean_ev(json.loads(json.dumps(final))) != final:
        bad.append("seed %d: làm sạch hai lần khác" % seed)
    have = {x["k"] for x in le.recv_list(final)}
    for k, lst in ops.items():
        top = max(t for t, _ in lst)
        states = {v for t, v in lst if t == top}
        if len(states) == 1 and (k in have) != states.pop():
            bad.append("seed %d: %s… lệch thao tác sau cùng" % (seed, k[5:12]))
ok(not bad, "400 lượt ngẫu nhiên hai máy: gộp giao hoán, làm sạch hai lần như một, mỗi thiệp theo lần giữ / xoá có dấu thời gian sau cùng" +
   (" — " + "; ".join(bad[:3]) if bad else ""))

# =========================================================================================================
print("== B. cắt sổ sau khi gộp, gộp mẫu cũ (audit #15)")
col3 = Col(); s3 = le.LeStore(os.path.join(TMP, "b.json"), lambda: col3)
e = s3.load()
e["bu"] = {"2026-10-01": 1, "2026-12-20": 2}
e["fixn"] = {"2026-12-01": 5, "2026-12-19": 1, "2026-12-20": 2}
s3.save(e)
raw = col3.conf[le.LE_KEY]["noel2026"]
ok("2026-10-01" not in raw["bu"] and "2026-12-01" not in raw["fixn"] and raw["fixn"].get("2026-12-20") == 2,
   "ngày cũ (mở bù > 40 ngày, nhờ sửa > 3 ngày trước ngày mới nhất) không sống lại khi gộp với collection: %s %s" % (raw["bu"], raw["fixn"]))
e = s3.load(); le.fix_mark(e, D(2026, 12, 28)); s3.save(e)
ok(set(col3.conf[le.LE_KEY]["noel2026"]["fixn"]) == {"2026-12-28"}, "fix_mark cắt ngày cũ → lưu xong vẫn cắt (1.36.1: gộp trả lại)")
ok(le.makeup_left(s3.load(), D(2026, 12, 20), 30) == 0, "số ngăn bù hôm nay vẫn đúng sau khi cắt")
badp = []
rnd = random.Random(SEED)
VALS = ["", "w_go", "w_sakura", "f_go", "w1", "w2"]
for _ in range(500):
    pa = {k: rnd.choice(VALS) for k in rnd.sample(["room:wall", "room:floor", "kitchen:wall", "bedroom:floor"], rnd.randint(0, 4))}
    pb = {k: rnd.choice(VALS) for k in rnd.sample(["room:wall", "room:floor", "kitchen:wall", "bedroom:floor"], rnd.randint(0, 4))}
    ea, eb = dict(le.empty(), prev=pa), dict(le.empty(), prev=pb)
    if not pa:
        ea.pop("prev")
    if not pb:
        eb.pop("prev")
    x, y = le.merge_ev(ea, eb), le.merge_ev(eb, ea)
    if x != y:
        badp.append((pa, pb))
    for k in set(pa) & set(pb):
        if pa[k] != pb[k] and (x.get("prev") or {}).get(k) == "" and (pa[k] or pb[k]):
            badp.append(("rỗng thắng", pa, pb))
ok(not badp, "500 cặp \"mẫu cũ\" của hai máy: gộp giao hoán, mẫu thật thắng \"theo kiểu nhà\"" + (" — %s" % (badp[:1],) if badp else ""))

# =========================================================================================================
print("== C. ca biên (audit #17)")
e = le.empty()
le.save_card(e, 0, CARD, D(2026, 12, 20), T(2026, 12, 20, 9)); le.hang_card(e, 0, D24, T(2026, 12, 24, 17, 0))
ok(not le.fix_set(e, 0, le.cards(e)[0]["w"], {"sua": "x。"}, T(2026, 12, 24, 18, 0, 2)) and "fx" not in le.cards(e)[0],
   "(b) Gemini về lúc 18:00:02 cho thiệp đang treo → không sửa thiệp ông đã mang đi")
ok(le.fix_set(e, 0, le.cards(e)[0]["w"], {"sua": "x。"}, T(2026, 12, 24, 17, 59, 58)), "(b) trước 18:00 vẫn gắn được")
e1 = le.empty(); e1["open"] = {"21": {"d": "2026-12-21", "b": 0}}; e1["gift"] = {"tulich": "2026-12-01"}
f1, f2 = le.facts(e1, {"le_tuanloc": 1}), le.facts(e1, {"le_tuanloc": 2})
ok("deer1" in f1.split(",") and "deer" not in f1.split(",") and "deer" in f2.split(","), "(c) đếm tuần lộc đèn: 1 → deer1, 2 → deer (%s | %s)" % (f1, f2))
e1["santa"] = {"seen": "2026-12-24T19:00:00", "facts": f1}
L1 = " ".join(le.letter(e1, D25, T(2026, 12, 25, 9))["body"])
e1["santa"]["facts"] = f2
L2 = " ".join(le.letter(e1, D25, T(2026, 12, 25, 9))["body"])
e1["santa"]["facts"] = "deer"          # sổ 1.36.1
L3 = " ".join(le.letter(e1, D25, T(2026, 12, 25, 9))["body"])
ok("ngó mãi bạn tuần lộc" in L1 and "hai bạn" not in L1 and "hai bạn tuần lộc" in L2 and "hai bạn tuần lộc" in L3,
   "(c) thư: một chú → \"bạn tuần lộc đèn\", hai chú / sổ cũ → \"hai bạn tuần lộc đèn\"")
dirty = {"open": {"3": {"d": "2027-01-05", "b": 0}, "4": {"d": "2026-12-04", "b": 0}}, "box": {"1": "2026-12-20", "2": "2026-12-26", "3": "2027-02-01"}}
cd = le.clean_ev(dirty)
ok(set(cd["open"]) == {"4"} and set(cd["box"]) == {"2", "3"}, "(d) ngăn mở sau 31/12 / hộp mở trước 25/12 (dữ liệu bẩn) bị bỏ; hộp mở sau mùa vẫn giữ: %s %s"
   % (sorted(cd["open"]), sorted(cd["box"])))
ev_e = le.empty(); ev_e["gift"] = {"tulich": "2026-12-01"}
v23 = le.santa_view(ev_e, D(2026, 12, 23), T(2026, 12, 24, 19, 0))
v24 = le.santa_view(ev_e, D24, T(2026, 12, 24, 21, 0))
v23b = le.santa_view(ev_e, D(2026, 12, 23), T(2026, 12, 23, 23, 0))
ok(v23["due"] and v24["due"] and not v23b["due"] and not v23["morning"],
   "(e) giờ đổi ngày của Anki 20:00: 19:00 ngày 24 ngày Anki còn 23 → vẫn xem cảnh đêm; 23:00 ngày 23 thì chưa")
ev_e["santa"] = {"seen": "2026-12-24T19:00:00"}
ok(not le.santa_view(ev_e, D(2026, 12, 23), T(2026, 12, 24, 19, 30))["due"], "(e) đã xem rồi thì không chiếu lại")

import base64 as _b64, zlib as _zlib  # noqa: E402


def _pack(obj):
    z = _zlib.compress(json.dumps(obj, ensure_ascii=False).encode("utf-8"), 9)
    return le.CODE_PREFIX + _b64.urlsafe_b64encode(z).decode().rstrip("=") + ":" + ("%08x" % (_zlib.crc32(z) & 0xFFFFFFFF))[:6]


bad_c = []
for cc in ([], {}, [["ja"]], {"ja": 1}):
    try:
        r = le.decode_card(_pack({"f": "den", "st": [], "c": cc}))
        if not r or r["c"] != "":
            bad_c.append(repr(cc))
    except Exception as e:          # noqa: BLE001
        bad_c.append("%r → %s" % (cc, type(e).__name__))
ok(not bad_c, "(tìm thêm) mã thiệp sửa tay có câu chúc là mảng / đối tượng → đọc được, bỏ câu chúc (1.36.1: TypeError)" + (" — " + "; ".join(bad_c) if bad_c else ""))

# =========================================================================================================
print("== D. bản 1.36.1 (mã thật) chạy chen")
spec = importlib.util.spec_from_file_location("le_core_1361", os.path.join(HERE, "..", "fixtures", "le_1361", "le_core.py"))
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
ok(hasattr(old, "recv_add") and not hasattr(old, "_recv_newer"), "mã 1.36.1 thật (thiệp nhận chưa có dấu \"t\")")
col4 = Col()
s_new = le.LeStore(os.path.join(TMP, "d_new.json"), lambda: col4)
s_old = old.LeStore(os.path.join(TMP, "d_old.json"), lambda: col4)
e = s_new.load(); le.recv_add(e, CODES[1], D10, T(2026, 12, 10, 9)); le.recv_add(e, CODES[2], D10, T(2026, 12, 10, 9, 1))
le.save_card(e, 0, CARD, D10, T(2026, 12, 10, 9)); s_new.save(e)
eo = s_old.load()
ok(sorted(x["k"] for x in old.recv_list(eo)) == sorted(CODES[1:3]), "1.36.1 đọc sổ 1.36.2: thấy đủ thiệp nhận")
old.recv_del(eo, CODES[1]); s_old.save(eo)
en = s_new.load()
ok([x["k"] for x in le.recv_list(en)] == [CODES[2]], "1.36.1 xoá một thiệp → 1.36.2 thấy đã xoá")
le.recv_add(en, CODES[1], D(2026, 12, 11), T(2026, 12, 11, 9)); s_new.save(en)
ok(sorted(x["k"] for x in le.recv_list(s_new.load())) == sorted(CODES[1:3]), "1.36.2 giữ lại thiệp 1.36.1 vừa xoá → còn")
ok(le.cards(s_old.load())[0]["t1"] == CARD["t1"], "1.36.1 vẫn đọc được thiệp")
o_ev = old.simulate(D(2026, 12, 20))
ok(le.clean_ev(json.loads(json.dumps(o_ev))) == o_ev, "sổ 1.36.1 làm sạch bằng 1.36.2 ra y nguyên")

# =========================================================================================================
print("== E. soát mã cầu nối / trang")
INIT = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
WEB = lambda f: open(os.path.join(ADDON, "web", f), encoding="utf-8").read()  # noqa: E731
GARDEN, LEC, LEN, LEJ, DIAG, CSS = WEB("garden.js"), WEB("le_card.js"), WEB("le_noel.js"), WEB("le.js"), WEB("diag.js"), WEB("garden.css")
ok('if cmd.startswith("le:"):' in INIT and "self._le_dropped(cmd)" in INIT and '"sync": True' in INIT,
   "#04 lệnh le:* rơi vào lúc đồng bộ → trả lời {ok: False, sync: True} (Python không im lặng)")
ok('"le:keep:"))' in INIT and 'if action == "keep":' in INIT and "n += self._le_flush_keep()" in INIT and "def _le_flush_keep" in INIT,
   "#05 le:keep (chỉ bộ nhớ, đi được cả lúc đồng bộ) + flush_unsaved lưu nốt thiệp")
ok('H.send("le:keep:"' in LEC and "const pend = {}" in LEC and "armRetry(8000)" in LEC and "pend[k].sync" in LEC, "#04 / #05 trang: gửi bản giữ, nhớ bản chưa lưu xong theo từng ô, gửi lại sau đồng bộ")
ok("STATE.draft_apply(scene, sc[\"slots\"][n], extra=extra)" in INIT and "def draft_apply(self, scene: str, slot: Any, extra" in
   open(os.path.join(ADDON, "garden_core.py"), encoding="utf-8").read(), "#07 Trang trí thử nhớ mẫu tường / sàn cũ cùng một lần lưu")
ok("self._eve_seen = self._le_eve()" in INIT and "def _le_eve()" in INIT, "#11 qua 18:00 ngày 24 lúc vườn đang mở → dựng lại")
ok("any(le_core.filled(c) for c in le_core.cards(ev))" in INIT and "le_core.recv_list(ev)):" in INIT, "#12 từ 1/1 còn Kỷ niệm khi chỉ có thiệp / thiệp nhận")
ok(INIT.count("_le_preview.update(day=None, ev=None, now=None, pack=False, key=None)") >= 2, "#14 đổi hồ sơ / nhập .colpkg → bỏ xem thử")
ok("core.decor.usable(decor_w, t[3], t[1])" in INIT, "#17f cất đồ: mẫu cũ không còn → sổ ghi \"theo kiểu nhà\"")
# #02: Anki chỉ báo Esc cho Python qua bộ nghe ở document, pha bubble (aqt/webview.py) — bảng Giáng sinh chặn hẳn ở pha capture
# nên Python không được hỏi; hàng đợi __kbEscQ chỉ đếm Esc tới được pha bubble (thêm mục cho Esc đã chặn = mục thừa giữ cửa sổ lại)
esc_ok, esc_n = True, 0
for name, src in (("le.js", LEJ), ("le_card.js", LEC), ("le_noel.js", LEN)):
    for m in re.finditer(r'document\.addEventListener\("keydown", \(ev\) => \{(.*?)\n      \}, true\);', src, re.S):
        if "Escape" in m.group(1):
            esc_n += 1
            esc_ok = esc_ok and "stopImmediatePropagation" in m.group(1)
ok(esc_ok and esc_n >= 3 and "__kbEscTrap" not in DIAG + GARDEN and "if (e.defaultPrevented) { window.__kbEscQ.push(now); }" in GARDEN,
   "#02 bộ nghe Esc của bảng Giáng sinh ở pha capture + chặn hẳn (Anki không hỏi Python); hàng đợi Esc như 1.35.4")
ok("function leOpen()" in GARDEN and "if (leOpen()) { return; }" in GARDEN and "ev.stopPropagation(); paint(); markDirty();" in LEC,
   "#06 phím tắt màn chính không chạy khi bảng / cảnh Giáng sinh đang mở")
ok(re.search(r"\.kb-toast \{[^}]*z-index: 295;", CSS) is not None, "#08 thông báo nổi trên bảng Giáng sinh")
ok("function whereName(scene)" in LEJ and "tường Bếp" in LEJ, "#09 báo đúng gian khi tủ lịch tự treo sang Bếp / Phòng ngủ")
ok("if (!e.hidden && POP_CLOSE[id]) { closePops(id); }" in GARDEN and '"kb-sound-pop", "kb-deck-pop"' in LEN, "#10 bảng tạo muộn đóng bảng khác ngay lần đầu; cảnh đêm không bật đè ⚙")
ok("const mine = typeof res.i !== \"number\" || res.i === slot;" in LEC, "#13 trả lời xoá thiệp xét đúng ô")
ok("packLines(v.welcome.pack).length" in LEN, "#17a không bật bảng cất đồ trống")
ok("function normW(t)" in LEC and "draft.fx.for === w" in LEC, "#03 so bản Gemini sửa với điều ước đã chuẩn hoá")
# chuẩn hoá của trang = của Python (node chạy normW thật trên các chuỗi khó)
m = re.search(r"  const CTRL = (/.*?/g);\n.*?  function normW\(t\) \{.*?\n  \}", LEC, re.S)
SAMPLES = ["日本語が上手になりたいです。\n", "  hai  dấu   cách  ", "Tiếng Viẹt NFD", "a​b‮c﻿d", "x\ty\r\nz", "\u0000\u0007ok", "", "   "]
if m:
    src = m.group(0) + "\nconsole.log(JSON.stringify(%s.map(normW)));" % json.dumps(SAMPLES, ensure_ascii=False)
    r = subprocess.run(["node", "-e", src], capture_output=True, text=True, timeout=60)
    js = json.loads(r.stdout) if r.returncode == 0 else None
    py = [le._line(s, le.WISH_MAX) for s in SAMPLES]
    ok(js == py, "normW (trang) = le_core._line (Python) trên %d chuỗi khó (xuống dòng, khoảng trắng đôi, NFD, ký tự ẩn)%s"
       % (len(SAMPLES), "" if js == py else " — %r ≠ %r" % (js, py)))
else:
    ok(False, "tìm thấy normW trong le_card.js")

# =========================================================================================================
print("== F. hợp đồng dữ liệu")
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(open(os.path.join(ADDON, fn), encoding="utf-8").read()))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
old_keys = set()
old_cfg = None
try:
    for fn in subprocess.run(["git", "-C", ROOT, "ls-tree", "--name-only", "af1a72f", "kotoba_batake/"], capture_output=True,
                             text=True, check=True).stdout.split():
        if fn.endswith(".py"):
            old_keys |= set(KEY_RE.findall(subprocess.run(["git", "-C", ROOT, "show", "af1a72f:" + fn], capture_output=True,
                                                          text=True).stdout))
    old_cfg = json.loads(subprocess.run(["git", "-C", ROOT, "show", "af1a72f:kotoba_batake/config.json"], capture_output=True,
                                        text=True, check=True).stdout)
except Exception as err:      # noqa: BLE001 — không có lịch sử git (bản sao không lịch sử): so với fixture 1.36.1
    print("  (không có lịch sử git: %s — so với fixtures/le_1361)" % type(err).__name__)
if old_keys:
    ok(cur_keys <= old_keys, "không thêm khoá collection (so với 1.36.1): %s" % sorted(cur_keys - old_keys))
if old_cfg is not None:
    cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
    ok(set(cfg) == set(old_cfg), "config.json cùng các mục với 1.36.1: %s" % sorted(set(cfg) ^ set(old_cfg)))
e = le.empty(); le.recv_add(e, CODES[3], D10, T(2026, 12, 10, 9))
ok(set(e["recv"][0]) == {"k", "at", "t"}, "thiệp nhận chỉ thêm trường \"t\": %s" % sorted(e["recv"][0]))
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(man.get("human_version") == "1.36.2", "manifest: 1.36.2")

print()
print("KẾT QUẢ: %d/%d" % (PASS[0], PASS[0] + len(FAIL)))
if FAIL:
    print("HỎNG:")
    for f in FAIL:
        print("  - " + f)
    sys.exit(1)
