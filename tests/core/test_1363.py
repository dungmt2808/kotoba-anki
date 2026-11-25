"""1.36.3 — vẽ tay cho Giáng sinh: vẽ lên thiệp ("d") + quả châu tự vẽ ("orn"), le_core.py + cầu nối.

A. hình vẽ trên thiệp: giải mã chặt (chữ số ASCII, lặp ≥ 1, không số đứng cuối, đủ 9.600 ô, màu của Xưởng), làm sạch ra dạng gọn
   duy nhất, vẽ kín thiệp vẫn lưu được (dạng gọn ≤ 9.600 ký tự < D_MAX), thử ngẫu nhiên mã hoá ↔ giải mã;
B. mã thiệp có hình vẽ: card_code / decode_card giữ hình vẽ, code_len = độ dài mã thật, hình quá chi tiết → báo (không gửi mã
   hỏng / không lặng lẽ bỏ hình), thiệp nhiều nhất (12 sticker + chữ dài + hình vẽ kín) vẫn dưới giới hạn giải nén;
C. quả châu: làm sạch, lưu (1/12 – 31/12), xoá = dấu thời gian, treo / không treo, gộp hai máy theo lần sửa sau từng quả (thử
   ngẫu nhiên có đối chứng; gộp giao hoán; làm sạch hai lần như một), LeStore + collection, sổ chưa có quả châu không thêm khoá;
D. ông già Noel thấy quả châu (facts "orn" khi cây đang bày), thư nhắc tới; view_more;
E. bản 1.36.2 (mã thật, tests/fixtures/le_1362) đọc + ghi sổ 1.36.3 → không lỗi, giữ quả châu; 1.36.3 đọc sổ 1.36.2 y nguyên;
F. soát mã cầu nối / trang: le:orn, le:keep {o}, lưu nốt khi đóng, ảnh PNG quả châu, mã thiệp báo độ dài, trang web vẽ được;
G. hợp đồng dữ liệu: không thêm khoá collection / mục config; chỉ thêm "d" trong thiệp và "orn" trong sổ.
Chạy: python test_1363.py THƯ_MỤC_ADD_ON
"""
import base64
import datetime as dt
import importlib.util
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import zlib

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import le_core as le
import garden_core as core

D = dt.date
T = dt.datetime
FAIL = []
PASS = [0]
TMP = tempfile.mkdtemp(prefix="kb1363_")
SEED = int(os.environ.get("KB_SEED", "1363"))
rnd = random.Random(SEED)
N_CELLS = le.CARD_W * le.CARD_H


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


def raises(fn, text=None):
    try:
        fn()
    except le.LeError as e:
        return text is None or text in str(e)
    return False


class Col:
    def __init__(self):
        self.conf = {}

    def get_config(self, k, default=None):
        return json.loads(json.dumps(self.conf.get(k, default)))

    def set_config(self, k, v):
        self.conf[k] = json.loads(json.dumps(v))

    def remove_config(self, k):
        self.conf.pop(k, None)


def rdraw(strokes=None):
    cells = ["."] * N_CELLS
    for _ in range(strokes if strokes is not None else rnd.randint(1, 12)):
        x, y, c = rnd.randrange(le.CARD_W), rnd.randrange(le.CARD_H), rnd.choice(le.DRAW_CHARS)
        for _ in range(rnd.randint(1, 60)):
            x = max(0, min(le.CARD_W - 1, x + rnd.choice((-1, 0, 1))))
            y = max(0, min(le.CARD_H - 1, y + rnd.choice((-1, 0, 1))))
            cells[y * le.CARD_W + x] = c
    return "".join(cells)


def rorn():
    return "".join(rnd.choice(le.DRAW_CHARS + "....") for _ in range(64))


def pack(obj):
    z = zlib.compress(json.dumps(obj, ensure_ascii=False).encode("utf-8"), 9)
    return le.CODE_PREFIX + base64.urlsafe_b64encode(z).decode().rstrip("=") + ":" + ("%08x" % (zlib.crc32(z) & 0xFFFFFFFF))[:6]


CARD = {"f": "tuyet", "st": [{"s": "xmastree", "x": 6, "y": 22}], "t1": "Giáng sinh an lành!", "t2": "— Lan", "c": "vi",
        "w": "Đọc được báo tiếng Nhật", "wl": "vi"}
D0, D10, D31, D1 = D(2026, 11, 30), D(2026, 12, 10), D(2026, 12, 31), D(2027, 1, 1)

# =========================================================================================================
print("== A. hình vẽ trên thiệp: giải mã chặt, dạng gọn")
ok(set(le.DRAW_CHARS) == set(core.CRAFT_PALETTE) and len(le.DRAW_CHARS) == 32 and "." not in le.DRAW_CHARS,
   "32 màu của Xưởng (garden_core.CRAFT_PALETTE), \".\" là trong suốt")
flat = rdraw()
code = le._px_encode(flat)
ok(le._px_decode(code, N_CELLS) == flat, "mã hoá → giải mã ra đúng hình (%d ký tự)" % len(code))
bad = {
    "chữ số Unicode (²)": "²k9599.",
    "chữ số Ả Rập (٣)": "٣k9597.",
    "lặp 0 lần": "0k9600.",
    "số đứng cuối": "9600.5",
    "thiếu ô": "9599.",
    "thừa ô": "9601.",
    "màu lạ": "9599.X",
    "chữ hoa không phải màu (Z)": "9599.Z",
    "dấu cách": "9599. ",
    "số quá 5 chữ số": "000009600.",
    "chuỗi rỗng": "",
    "không phải chuỗi": 9600,
    "dài quá 3 × số ô": "." * 9600 + "0" * 20000,
}
wrong = [k for k, v in bad.items() if le._px_decode(v, N_CELLS) is not None]
ok(not wrong, "giải mã từ chối %d kiểu hỏng%s" % (len(bad), (" — nhận nhầm: " + ", ".join(wrong)) if wrong else ""))
ok(le._px_decode("05k9595.", N_CELLS) == "k" * 5 + "." * 9595, "số có 0 đứng đầu (05) vẫn là 5 — trang web đọc giống hệt (kiem_tra_trang)")
ok(le.clean_drawing("kk9598.") == "2k9598.", "làm sạch ra dạng gọn duy nhất (kk → 2k)")
ok(le.clean_drawing("9600.") == "" and le.clean_drawing(None) == "" and le.clean_drawing("9601.") == "",
   "hình trống / không có / hỏng → không lưu hình vẽ")
full = "".join(le.DRAW_CHARS[(x + y) % 2] for y in range(le.CARD_H) for x in range(le.CARD_W))     # bàn cờ: mỗi ô một lần
noise = "".join(rnd.choice(le.DRAW_CHARS) for _ in range(N_CELLS))
ok(len(le._px_encode(full)) == N_CELLS <= le.D_MAX and le.clean_drawing(le._px_encode(full)) == le._px_encode(full)
   and le.clean_drawing(le._px_encode(noise)), "vẽ kín thiệp (bàn cờ / nhiễu): dạng gọn ≤ %d ký tự ≤ D_MAX %d — luôn lưu được"
   % (N_CELLS, le.D_MAX))
mism = 0
for _ in range(300):
    f = rdraw()
    c = le._px_encode(f)
    if le._px_decode(c, N_CELLS) != f or le.clean_drawing(c) != (c if f.strip(".") else "") or le.clean_drawing(le.clean_drawing(c) or None) != le.clean_drawing(c):
        mism += 1
ok(mism == 0, "300 hình ngẫu nhiên: mã hoá ↔ giải mã, làm sạch hai lần như một")

# =========================================================================================================
print("== B. mã thiệp có hình vẽ")
dr = le._px_encode(rdraw(6))
c1 = dict(CARD, d=dr)
cc = le.clean_card(c1)
ok(cc["d"] == dr and le.filled(le.clean_card(dict(CARD, d="9600."))) and "d" not in le.clean_card(dict(CARD, d="9600.")),
   "clean_card giữ hình vẽ; hình trống không thêm trường \"d\"")
code1 = le.card_code(c1)
back = le.decode_card(code1)
ok(back and back["d"] == dr and "w" not in back, "mã thiệp mang hình vẽ (không mang điều ước) — bạn nhận thấy đúng hình")
ok(le.code_len(c1) == len(code1) and le.code_len({"f": "x"}) == 0, "code_len = độ dài mã thật (%d); thiệp trống = 0" % len(code1))
diff = 0
for _ in range(60):
    cx = dict(CARD, d=le._px_encode(rdraw()), t1="x" * rnd.randint(0, 40))
    try:
        if le.code_len(cx) != len(le.card_code(cx)):
            diff += 1
    except le.LeError:
        if le.code_len(cx) <= le.CODE_MAX:
            diff += 1
ok(diff == 0, "60 thiệp ngẫu nhiên: code_len khớp mã thật / báo quá dài đúng lúc")
cn = dict(CARD, d=le._px_encode(noise))
ok(le.code_len(cn) > le.CODE_MAX and raises(lambda: le.card_code(cn), "lưu ảnh PNG"),
   "hình nhiễu kín thiệp: mã > %d ký tự → báo \"lưu ảnh PNG gửi bạn\" (không đưa mã hỏng)" % le.CODE_MAX)
ev = le.empty()
saved = le.save_card(ev, 0, cn, D10, T(2026, 12, 10, 9))
ok(saved.get("d") == le._px_encode(noise), "hình quá chi tiết để gửi mã vẫn lưu trên thiệp (lưu ảnh PNG được)")
big = {"f": "qua", "st": [{"s": "presents", "x": i * 9, "y": i * 5, "m": 1, "z": 2} for i in range(le.STICKERS_MAX)],
       "t1": "Ẩ" * le.T1_MAX, "t2": "Ữ" * le.T2_MAX, "c": "ja", "d": le._px_encode(full)}
cb = le.card_code(big)
raw_len = len(zlib.decompress(base64.urlsafe_b64decode(cb[len(le.CODE_PREFIX):].rpartition(":")[0] + "==")))
ok(le.decode_card(cb) is not None and le.decode_card(cb)["d"] == big["d"] and raw_len < 16000,
   "thiệp nhiều nhất (12 sticker, chữ dài, vẽ kín bàn cờ): giải nén %d byte < 16.000 → bạn đọc được" % raw_len)
ok(le.decode_card(pack(dict(big, d="²" + big["d"]))) is not None and "d" not in le.decode_card(pack(dict(big, d="²" + big["d"]))),
   "mã sửa tay có hình vẽ hỏng: thiệp vẫn đọc, bỏ hình vẽ")
sv = le.save_card(le.empty(), 1, dict(CARD, d="0k9600."), D10, T(2026, 12, 10, 9))
ok(le.filled(sv) and "d" not in sv, "hình vẽ hỏng từ trang (không phải chi tiết quá) → lưu thiệp không có hình, không báo nhầm")

# =========================================================================================================
print("== C. quả châu tự vẽ")
P1 = "..kkkk.." * 2 + ".kUUUUk." * 4 + "..kkkk.." * 2
ok(len(P1) == 64 and le.clean_orn({"p": P1, "on": 1, "at": "2026-12-01T09:00:00"}) == {"p": P1, "on": 1, "at": "2026-12-01T09:00:00"},
   "làm sạch quả châu đúng giữ nguyên")
bad_o = [({"p": P1[:63]}, "63 ô"), ({"p": P1 + "."}, "65 ô"), ({"p": P1[:-1] + "X"}, "màu lạ"), ({"p": "." * 64}, "trống"),
         ({"p": 5}, "số"), ("chuỗi", "không phải đối tượng"), ({"p": list(P1)}, "mảng")]
ok(all(le.clean_orn(o) is None for o, _ in bad_o), "quả châu hỏng / trống → bỏ (%s)" % ", ".join(n for _, n in bad_o))
ok(le.clean_orn({"p": "." * 64, "at": "2026-12-02T10:00:00"}) == {"at": "2026-12-02T10:00:00"}, "quả châu đã xoá giữ dấu thời gian")
ok([le.clean_orn({"p": P1, "on": v})["on"] for v in (1, True, "1", 2, None)] == [1, 1, 0, 0, 0], "\"on\" chỉ nhận 1 / true")
ev = le.empty()
ok(raises(lambda: le.save_orn(ev, 0, P1, 1, D0, T(2026, 11, 30, 9)), "1/12") and raises(lambda: le.save_orn(ev, 0, P1, 1, D1, T(2027, 1, 1, 9)), "Album")
   and raises(lambda: le.save_orn(ev, 3, P1, 1, D10, T(2026, 12, 10))) and raises(lambda: le.save_orn(ev, "x", P1, 1, D10, T(2026, 12, 10)))
   and raises(lambda: le.save_orn(ev, -1, P1, 1, D10, T(2026, 12, 10))) and raises(lambda: le.save_orn(ev, 0, P1[:60], 1, D10, T(2026, 12, 10)), "hỏng"),
   "vẽ quả châu 1/12 – 31/12; ô 0–2; hình hỏng báo lỗi")
ok("orn" not in ev, "lưu lỗi không đổi sổ")
r0 = le.save_orn(ev, 0, P1, 1, D10, T(2026, 12, 10, 9))
r0b = le.save_orn(ev, 0, P1, 0, D10, T(2026, 12, 10, 9))
ok(r0 == {"p": P1, "on": 1, "at": "2026-12-10T09:00:00"} and r0b["at"] == "2026-12-10T09:00:01" and le.hung_orns(ev) == [],
   "hai lần lưu cùng giây: dấu thời gian lần sau vẫn sau (gộp không thua bản cũ); bỏ treo → cây không có")
le.save_orn(ev, 2, P1, True, D31, T(2026, 12, 31, 23, 59))
ok(le.hung_orns(ev) == [(2, P1)] and le.orns(ev)[1] is None, "treo quả số 3 (31/12 vẫn vẽ được); ô giữa trống")
rx = le.save_orn(ev, 2, "." * 64, 1, D31, T(2026, 12, 31, 23, 59, 30))
ok(rx is None and le.orns(ev)[2] == {"at": "2026-12-31T23:59:30"} and le.hung_orns(ev) == [], "tẩy hết = xoá quả châu (dấu thời gian, máy khác không trả lại)")
ce = le.clean_ev(json.loads(json.dumps(ev)))
ok(ce["orn"] == ev["orn"] and le.clean_ev(ce) == ce, "làm sạch sổ có quả châu: y nguyên, hai lần như một")
ok("orn" not in le.clean_ev({"open": {}, "orn": [None, "x", {"p": 3}]}) and "orn" not in le.clean_ev(le.empty()),
   "sổ chưa có quả châu (hoặc rác) không thêm khoá \"orn\"")
ok(le.clean_ev({"orn": [{"p": P1, "on": 1}] * 7})["orn"] == [{"p": P1, "on": 1}] * 3, "quá 3 quả → chỉ giữ 3")

# gộp hai máy: thử ngẫu nhiên có đối chứng. Mô hình: mỗi quả = lần lưu có dấu thời gian lớn nhất trong mọi lần lưu ở hai máy
# (dấu thời gian của một máy luôn tăng — _bump; trùng giây ở hai máy chưa thấy nhau: chọn cố định theo nội dung như _newer)
bad_m, bad_comm, steps = [], 0, 0
for trial in range(400):
    A, B = le.empty(), le.empty()
    writes = [[] for _ in range(le.ORN_N)]
    t = T(2026, 12, 1, 8)
    for _ in range(rnd.randint(1, 14)):
        t += dt.timedelta(seconds=rnd.choice((0, 1, 2, 30, 3600)))
        who = rnd.choice((A, B))
        if rnd.random() < 0.75:
            i = rnd.randrange(le.ORN_N)
            p = rorn() if rnd.random() < 0.85 else "." * 64
            le.save_orn(who, i, p, rnd.choice((0, 1)), t.date(), t)
            writes[i].append(json.loads(json.dumps(le.orns(who)[i])))
        else:      # đồng bộ: hai máy gộp với nhau
            m = le.merge_ev(A, B)
            A, B = json.loads(json.dumps(m)), json.loads(json.dumps(m))
        steps += 1
    ab, ba = le.merge_ev(A, B), le.merge_ev(B, A)
    if ab != ba or le.clean_ev(ab) != ab:
        bad_comm += 1
    want = [max(w, key=lambda o: (o["at"], json.dumps(o, sort_keys=True, ensure_ascii=False))) if w else None for w in writes]
    if le.orns(ab) != want:
        bad_m.append(trial)
ok(not bad_m and bad_comm == 0, "400 lần thử (%d thao tác, hai máy + đồng bộ chen ngang): mỗi quả theo lần lưu sau cùng, gộp giao hoán, "
   "làm sạch như một%s" % (steps, (" — lệch ở lần %s" % bad_m[:5]) if bad_m else ""))
# LeStore + collection
col = Col()
store = le.LeStore(os.path.join(TMP, "c.json"), lambda: col)
e = store.load(); le.save_orn(e, 1, P1, 1, D10, T(2026, 12, 10, 9)); le.save_card(e, 0, dict(CARD, d=dr), D10, T(2026, 12, 10, 9)); store.save(e)
e2 = store.load()
ok(le.hung_orns(e2) == [(1, P1)] and le.cards(e2)[0]["d"] == dr, "LeStore: quả châu + hình vẽ thiệp lưu vào collection, đọc lại đúng")
col_b = Col(); col_b.conf = json.loads(json.dumps(col.conf))
sb = le.LeStore(os.path.join(TMP, "c_b.json"), lambda: col_b)
eb = sb.load(); le.save_orn(eb, 1, "." * 64, 1, D10, T(2026, 12, 10, 10)); sb.save(eb)       # máy B xoá sau
e3 = store.load(); le.save_orn(e3, 0, P1, 0, D10, T(2026, 12, 10, 11))
col.conf = json.loads(json.dumps(col_b.conf))          # đồng bộ mang bản B về rồi máy A lưu bản đang mở
store.save(e3)
ok(le.orns(store.load())[1] == {"at": "2026-12-10T10:00:00"} and le.orn_filled(le.orns(store.load())[0]),
   "máy B xoá quả 2, máy A (đang mở bản cũ) vẽ quả 1 rồi lưu → quả 2 vẫn xoá, quả 1 còn")

# =========================================================================================================
print("== D. ông già Noel thấy quả châu")
ev = le.empty(); ev["gift"] = {"tulich": "2026-12-01", "tree": "2026-12-01"}
le.save_orn(ev, 0, P1, 1, D10, T(2026, 12, 10))
ok("orn" in le.facts(ev, {le.TREE: 1}).split(",") and "orn" not in le.facts(ev, {}).split(","),
   "facts có \"orn\" khi quả châu đang treo và cây thông đang bày (cất cây thì không)")
le.save_orn(ev, 0, P1, 0, D10, T(2026, 12, 10, 1))
ok("orn" not in le.facts(ev, {le.TREE: 1}).split(","), "vẽ mà không treo → ông không thấy")
le.save_orn(ev, 0, P1, 1, D10, T(2026, 12, 10, 2))
ev["santa"] = {"seen": "2026-12-24T19:00:00", "facts": le.facts(ev, {le.TREE: 1})}
lt = le.letter(ev, D(2026, 12, 25), T(2026, 12, 25, 8), {le.TREE: 1})
body = json.dumps(lt, ensure_ascii=False)
ok(lt and "Quả châu cháu tự vẽ" in body, "thư sáng 25 nhắc quả châu tự vẽ")
ev2 = dict(ev, santa={"seen": "2026-12-24T19:00:00", "facts": "tree"})
ok("Quả châu" not in json.dumps(le.letter(ev2, D(2026, 12, 25), T(2026, 12, 25, 8), {le.TREE: 1}), ensure_ascii=False),
   "thư theo những gì ông thấy lúc ghé (chụp lại) — treo sau đó không đổi thư")
v = le.view_more(ev, D10, T(2026, 12, 10, 9), {le.TREE: 1})
ok(v["orn"][0] == {"p": P1, "on": 1} and v["orn"][1] is None and v["orn_edit"] and v["orn_spots"] == [list(x) for x in le.ORN_SPOTS]
   and v["code_max"] == le.CODE_MAX and v["d_max"] == le.D_MAX and "at" not in v["orn"][0], "view_more: quả châu (không lộ dấu thời gian), chỗ treo, giới hạn")
ok(not le.view_more(ev, D1, T(2027, 1, 1, 9))["orn_edit"] and not le.view_more(ev, D0, T(2026, 11, 30, 9))["orn_edit"],
   "ngoài 1/12 – 31/12 không vẽ được (xem vẫn được)")
spots_ok = all(0 <= x and x + le.ORN_W <= 32 and 0 <= y and y + le.ORN_W <= 44 for x, y in le.ORN_SPOTS)
ok(spots_ok and len(set(le.ORN_SPOTS)) == le.ORN_N, "3 chỗ treo nằm trong cây 32 × 44, không trùng")

# =========================================================================================================
print("== E. bản 1.36.2 (mã thật) chạy chen")
spec = importlib.util.spec_from_file_location("le_core_1362", os.path.join(HERE, "..", "fixtures", "le_1362", "le_core.py"))
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
ok(hasattr(old, "_recv_newer") and not hasattr(old, "save_orn"), "mã 1.36.2 thật (chưa có quả châu)")
col4 = Col()
s_new = le.LeStore(os.path.join(TMP, "e_new.json"), lambda: col4)
s_old = old.LeStore(os.path.join(TMP, "e_old.json"), lambda: col4)
e = s_new.load(); le.save_orn(e, 0, P1, 1, D10, T(2026, 12, 10, 9)); le.save_card(e, 1, dict(CARD, d=dr), D10, T(2026, 12, 10, 9))
s_new.save(e)
try:
    eo = s_old.load()
    ok(old.cards(eo)[1]["t1"] == CARD["t1"], "1.36.2 đọc sổ 1.36.3: thấy thiệp (không lỗi)")
    old.recv_add(eo, le.card_code(CARD), D10, T(2026, 12, 10, 9, 30)); s_old.save(eo)
    en = s_new.load()
    ok(le.hung_orns(en) == [(0, P1)], "1.36.2 ghi sổ → quả châu vẫn còn (khoá lạ của bản sau được giữ)")
    ok(len(le.recv_list(en)) == 1, "1.36.3 thấy thiệp nhận 1.36.2 vừa thêm")
    ok(le.cards(en)[1].get("d") is None or le.cards(en)[1].get("d") == dr,
       "thiệp có hình vẽ qua tay 1.36.2: %s (1.36.0–1.36.2 chưa phát hành — phát hành thẳng 1.36.3)"
       % ("giữ hình vẽ" if le.cards(en)[1].get("d") == dr else "mất hình vẽ, thiệp còn"))
except Exception as err:      # noqa: BLE001
    ok(False, "1.36.2 đọc / ghi sổ 1.36.3: %s: %s" % (type(err).__name__, err))
o_ev = old.simulate(D(2026, 12, 20))
ok(le.clean_ev(json.loads(json.dumps(o_ev))) == o_ev, "sổ 1.36.2 làm sạch bằng 1.36.3 ra y nguyên")
o2 = old.empty(); old.save_card(o2, 0, CARD, D10, T(2026, 12, 10, 9))
ok(le.clean_ev(json.loads(json.dumps(o2))) == o2, "thiệp 1.36.2 (không hình vẽ) đọc bằng 1.36.3 y nguyên")

# =========================================================================================================
print("== F. soát mã cầu nối / trang")
INIT = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
WEB = lambda f: open(os.path.join(ADDON, "web", f), encoding="utf-8").read()  # noqa: E731
LEC, LEO, LEJ, LEN, GARDEN, CSS = WEB("le_card.js"), WEB("le_orn.js"), WEB("le.js"), WEB("le_noel.js"), WEB("garden.js"), WEB("garden.css")
ok("le_core.save_orn(" in INIT and '"orn"' in INIT and '"o%d"' in INIT, "le:orn lưu quả châu; le:keep nhớ quả châu chưa lưu (khoá \"o<i>\")")
ok(re.search(r"def _le_save_kept\(.*?save_orn\(", INIT, re.S) is not None, "đóng vườn / đồng bộ xong: lưu nốt quả châu chưa lưu (_le_save_kept)")
ok("le_core.code_len(" in INIT and "codeLen" in LEC,
   "lưu thiệp trả về độ dài mã (đồng hồ \"Mã thiệp: N / 6.000\")")
ok("/le_orn.js" in INIT and "Lưu ảnh quả châu" in INIT, "nạp le_orn.js; lưu ảnh PNG quả châu")
ok('v["draw_pal"] = core.CRAFT_PALETTE' in INIT, "trang nhận bảng màu của Xưởng")
ok("strokeStart" in LEC and "pxEncode" in LEC and "kb-le-dundo" in LEC and "eraser" in LEC,
   "xưởng thiệp có thẻ ✎ Vẽ (bút, tẩy, hoàn tác)")
ok("function drawLayer" in LEC and re.search(r"drawLayer\(ctx", LEC) is not None, "hình vẽ vẽ trên thiệp (trên sticker, dưới chữ)")
ok("kb-le-ornpop" in LEO and "le:orn:" in LEO and "le:keep:" in LEO and "armRetry" in LEO, "bảng quả châu: lưu, giữ bản chưa lưu, gửi lại sau đồng bộ")
ok("kb-le-to-orn" in LEJ and "GardenLeOrn.hung()" in LEJ, "tủ lịch có nút Vẽ quả châu; cây ngoài sân treo quả châu")
ok("kb-le-mem-orn" in LEN and "GardenLeOrn" in LEN, "Album → Kỷ niệm có quả châu")
ok('"kb-le-ornpop"' in GARDEN and "GardenLeOrn" in GARDEN, "bảng quả châu: phím tắt màn chính tạm nghỉ, đóng các bảng nổi khác")
ok(".kb-le-ornpop" in CSS and ".kb-le-drawbox" in CSS, "kiểu chữ / khung cho thẻ Vẽ và bảng quả châu")
SITE = open(os.path.join(ROOT, "site", "thiep.js"), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, "site", "thiep.js")) else ""
if SITE:
    ok("pxDecode" in SITE and "draw_pal" in SITE, "trang web (site/thiep.js) vẽ được hình trên mã thiệp bạn gửi")

# =========================================================================================================
print("== G. hợp đồng dữ liệu")
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(open(os.path.join(ADDON, fn), encoding="utf-8").read()))
old_keys, old_cfg = set(), None
try:
    for fn in subprocess.run(["git", "-C", ROOT, "ls-tree", "--name-only", "595a51c", "kotoba_batake/"], capture_output=True,
                             text=True, check=True).stdout.split():
        if fn.endswith(".py"):
            old_keys |= set(KEY_RE.findall(subprocess.run(["git", "-C", ROOT, "show", "595a51c:" + fn], capture_output=True,
                                                          text=True).stdout))
    old_cfg = json.loads(subprocess.run(["git", "-C", ROOT, "show", "595a51c:kotoba_batake/config.json"], capture_output=True,
                                        text=True, check=True).stdout)
except Exception as err:      # noqa: BLE001
    print("  (không có lịch sử git: %s)" % type(err).__name__)
if old_keys:
    ok(cur_keys <= old_keys, "không thêm khoá collection (so với 1.36.2): %s" % sorted(cur_keys - old_keys))
if old_cfg is not None:
    cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
    ok(set(cfg) == set(old_cfg), "config.json cùng các mục với 1.36.2: %s" % sorted(set(cfg) ^ set(old_cfg)))
ev = le.empty(); le.save_card(ev, 0, dict(CARD, d=dr), D10, T(2026, 12, 10)); le.save_orn(ev, 0, P1, 1, D10, T(2026, 12, 10))
ok(set(ev) == {"open", "bu", "gift", "box", "cards", "orn"} and set(ev["cards"][0]) == {"f", "st", "t1", "t2", "c", "d", "w", "wl", "at"}
   and set(ev["orn"][0]) == {"p", "on", "at"}, "chỉ thêm \"d\" trong thiệp và \"orn\" ({p, on, at}) trong sổ")
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(tuple(int(x) for x in man.get("human_version", "0").split(".")) >= (1, 36, 3), "manifest: từ 1.36.3 (" + man.get("human_version", "") + ")")

print()
print("KẾT QUẢ: %d/%d" % (PASS[0], PASS[0] + len(FAIL)))
if FAIL:
    print("HỎNG:")
    for f in FAIL:
        print("  - " + f)
    sys.exit(1)
