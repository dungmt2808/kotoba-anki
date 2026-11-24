"""1.36.1 — thiệp + điều ước, ông già Noel (đêm 24, thư sáng 25), cất đồ 1/1, thiệp nhận bằng mã (le_core.py).

A. thiệp: làm sạch (dữ liệu bừa / quá dài / ký tự điều khiển / NFD / sticker ngoài khung), lưu / xoá / treo theo ngày Anki + giờ
   máy (xưởng mở 1/12 – 31/12, treo tới 18:00 ngày 24, thiệp ông già Noel đã mang đi thì khoá), bản Gemini sửa chỉ giữ của sổ;
B. mã thiệp "KBC1:": làm rồi đọc lại đúng, không có điều ước, mã hỏng / sửa tay / quá dài / nén bom → None; thiệp nhận: trùng,
   tối đa 12, xoá rồi nhận lại;
C. ông già Noel: cảnh đêm (ngày Anki 24, từ 18:00), thư (ngày Anki 25–31), không gì từ 1/1 (thư vẫn ở Kỷ niệm); thư nhắc đúng thứ
   đã bày, chụp lại lúc ông ghé (dọn đồ sau đó thư không đổi), lời chào / ký tên đủ 7 tiếng;
D. cất đồ 1/1: một lần, món đang bày (tuần lộc đèn, bánh) → Kho đồ, tường / sàn Noel → mẫu cũ (nhớ lúc đổi sang mẫu Noel);
   GardenState.le_apply(unplace, tiles_set) + decor_use(extra) ghi một lần;
E. gộp hai máy: thiệp theo lần sửa sau (xoá cũng là một lần sửa), thiệp treo theo lần chọn sau, đã xem / đã đọc / đã cất ở máy nào
   cũng tính, thiệp nhận xoá ở máy nào cũng xoá; thử ngẫu nhiên có đối chứng (gộp giao hoán, làm sạch hai lần như một);
F. bản 1.36.0 (mã thật, tests/fixtures/le_1360) đọc + ghi sổ 1.36.1 → giữ nguyên phần 1.36.1; sổ 1.36.0 làm sạch ra y nguyên;
G. Tin làng: nhắc treo thiệp trước 18:00 ngày 24, thư của ông, "làm thiệp" (ít ưu tiên);
H. hợp đồng dữ liệu: không thêm khoá collection / mục config; view_more ra JSON được.
Chạy: python test_1361.py THƯ_MỤC_ADD_ON
"""
import copy
import datetime as dt
import importlib.util
import json
import os
import random
import sys
import tempfile
import unicodedata

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import backup_core as backup
import garden_core as core
import le_core as le

D = dt.date
T = dt.datetime
FAIL = []
PASS = [0]
TMP = tempfile.mkdtemp(prefix="kb1361_")
SEED = int(os.environ.get("KB_SEED", "1361"))


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


def err(fn, *a, **k):
    try:
        fn(*a, **k)
    except (le.LeError, core.HomeError) as e:
        return str(e)
    return ""


class Col:
    def __init__(self):
        self.conf = {}
        self.fail_set = None
        self.fail_get = None

    def get_config(self, k, default=None):
        if self.fail_get and k == self.fail_get:
            raise RuntimeError("đọc lỗi (giả)")
        return json.loads(json.dumps(self.conf.get(k, default)))

    def set_config(self, k, v):
        if self.fail_set and k == self.fail_set:
            raise RuntimeError("ghi lỗi (giả)")
        self.conf[k] = json.loads(json.dumps(v))

    def remove_config(self, k):
        self.conf.pop(k, None)


CARD = {"f": "den", "st": [{"s": "xmastree", "x": 6, "y": 22}, {"s": "stackchan", "x": 86, "y": 43, "m": 1}],
        "t1": "Giáng sinh an lành!", "t2": "— Lan", "c": "ja", "w": "日本語が上手になりますように", "wl": "ja"}
D1, D10, D24, D25, D31, J1 = D(2026, 12, 1), D(2026, 12, 10), D(2026, 12, 24), D(2026, 12, 25), D(2026, 12, 31), D(2027, 1, 1)
NOW10 = T(2026, 12, 10, 20, 0)
EVE_BEFORE, EVE_AT = T(2026, 12, 24, 17, 59), T(2026, 12, 24, 18, 0)

# =========================================================================================================
print("== A. thiệp")
c = le.clean_card(CARD)
ok(le.filled(c) and c["st"][1]["m"] == 1 and c["c"] == "ja" and c["wl"] == "ja" and "at" not in c, "thiệp đúng → giữ nguyên các trường")
for junk in (None, 5, "x", [], {"f": "khung_la"}, {"st": [1, 2]}):
    cj = le.clean_card(junk)
    ok(cj is None or not le.filled(cj), "dữ liệu bừa %r → không phải thiệp" % (junk,))
ok(le.clean_card({"at": "2026-12-03T10:00:00"}) == {"at": "2026-12-03T10:00:00"}, "ô trống có dấu thời gian (đã xoá) giữ dấu")
big = dict(CARD, t1="A" * 200, t2="B\n\x00\x07" * 50, w="Ư" * 500, st=[{"s": "xmastree", "x": i, "y": 0} for i in range(40)], c="xx", wl="ru")
cb = le.clean_card(big)
ok(len(cb["t1"]) == le.T1_MAX and len(cb["t2"]) <= le.T2_MAX and "\n" not in cb["t2"] and "\x00" not in cb["t2"], "chữ quá dài / xuống dòng / ký tự điều khiển → cắt, bỏ")
ok(len(cb["w"]) == le.WISH_MAX and len(cb["st"]) == le.STICKERS_MAX and cb["c"] == "" and cb["wl"] == "vi", "điều ước ≤ 160 · ≤ 12 sticker · câu chúc lạ → bỏ · tiếng lạ → tiếng Việt")
nfd = unicodedata.normalize("NFD", "Giáng sinh an lành")
ok(le.clean_card(dict(CARD, t1=nfd))["t1"] == "Giáng sinh an lành", "chữ NFD (dấu tách rời) → NFC")
ok(le.clean_card(dict(CARD, t1="a‮b​c"))["t1"] == "abc", "ký tự đổi chiều chữ / độ rộng 0 → bỏ")
st = le.clean_card(dict(CARD, st=[{"s": "Xmas", "x": 1, "y": 1}, {"s": "a" * 50, "x": 1, "y": 1}, {"s": "ok", "x": 9999, "y": -9999},
                                   {"s": "ok2", "x": float("nan"), "y": 1}, {"s": "ok3", "x": True, "y": 1}, {"s": "ok4", "x": 3.6, "y": 2, "z": 2, "m": 0}]))["st"]
ok(st == [{"s": "ok", "x": le.CARD_W, "y": -48}, {"s": "ok4", "x": 4, "y": 2, "z": 2}], "sticker: id lạ / NaN / True → bỏ, toạ độ kẹp vào khung, làm tròn: %s" % st)

ev = le.empty()
ok("1/12" in err(le.save_card, ev, 0, CARD, D(2026, 11, 30), T(2026, 11, 30, 9)), "30/11 → xưởng thiệp mở từ 1/12")
ok("đã qua" in err(le.save_card, ev, 0, CARD, J1, T(2027, 1, 1, 9)), "1/1 → mùa đã qua, không sửa được")
ok(err(le.save_card, ev, 3, CARD, D10, NOW10) != "" and err(le.save_card, ev, "x", CARD, D10, NOW10) != "", "ô 3 / ô lạ → lỗi")
ok("khung" in err(le.save_card, ev, 0, {"t1": "x"}, D10, NOW10), "thiệp không có khung → lỗi")
c0 = le.save_card(ev, 0, dict(CARD, fx={"for": CARD["w"], "sua": "bịa"}), D10, NOW10)
ok(c0["at"] == "2026-12-10T20:00:00" and "fx" not in c0, "lưu thiệp: đóng dấu giờ, bản sửa trang gửi kèm → bỏ (không tin trang)")
ok(le.fix_set(ev, 0, CARD["w"], {"sua": "日本語が上手になりますように。", "nx": "Tốt", "loi": [{"goc": "a", "sua": "b", "gt": "c"}] * 5}),
   "Gemini sửa xong, điều ước chưa đổi → gắn vào thiệp")
ok(len(le.cards(ev)[0]["fx"]["loi"]) == 3 and le.cards(ev)[0]["fx"]["for"] == CARD["w"], "bản sửa: ≤ 3 lỗi, nhớ điều ước gốc")
le.save_card(ev, 0, dict(CARD, t1="Đổi chữ"), D10, T(2026, 12, 10, 20, 5))
ok(le.cards(ev)[0].get("fx"), "sửa chữ mặt trước (điều ước giữ nguyên) → bản sửa vẫn còn")
le.save_card(ev, 0, dict(CARD, w="Khác"), D10, T(2026, 12, 10, 20, 6))
ok("fx" not in le.cards(ev)[0], "đổi điều ước → bỏ bản sửa cũ")
ok(not le.fix_set(ev, 0, CARD["w"], {"sua": "x"}), "kết quả Gemini về khi điều ước đã đổi → không gắn")
ok("chưa có thiệp" in err(le.hang_card, ev, 1, D10, NOW10), "treo ô trống → lỗi")
le.hang_card(ev, 0, D10, NOW10)
ok(le.hang_index(ev) == 0, "treo thiệp 1 lên cây")
le.save_card(ev, 1, CARD, D10, T(2026, 12, 11, 8))
le.hang_card(ev, 1, D(2026, 12, 11), T(2026, 12, 11, 8))
ok(le.hang_index(ev) == 1, "treo thiệp 2 → thay thiệp 1 (mỗi lúc một thiệp)")
le.hang_card(ev, -1, D(2026, 12, 11), T(2026, 12, 11, 9))
ok(le.hang_index(ev) == -1, "gỡ khỏi cây")
le.hang_card(ev, 0, D24, EVE_BEFORE)
ok(le.hang_index(ev) == 0 and le.taken_index(ev, EVE_BEFORE) == -1, "17:59 ngày 24 vẫn treo / đổi được")
ok("ghé rồi" in err(le.hang_card, ev, 1, D24, EVE_AT), "18:00 ngày 24 → không đổi thiệp trên cây nữa")
ok(le.taken_index(ev, EVE_AT) == 0, "ông già Noel mang thiệp 1 đi")
ok("mang thiệp" in err(le.save_card, ev, 0, CARD, D24, EVE_AT) and "kỷ niệm" in err(le.delete_card, ev, 0, D24, EVE_AT),
   "thiệp ông đã mang đi → không sửa, không xoá")
le.save_card(ev, 1, dict(CARD, t1="Thiệp 2"), D25, T(2026, 12, 25, 9))
ok(le.cards(ev)[1]["t1"] == "Thiệp 2", "thiệp khác vẫn sửa được tới 31/12")
le.delete_card(ev, 1, D25, T(2026, 12, 25, 10))
ok(le.cards(ev)[1] == {"at": "2026-12-25T10:00:00"} and not le.filled(le.cards(ev)[1]), "xoá thiệp → ô trống có dấu thời gian")
ev2 = le.empty()
le.save_card(ev2, 2, CARD, D10, NOW10); le.hang_card(ev2, 2, D10, NOW10); le.delete_card(ev2, 2, D10, T(2026, 12, 10, 21))
ok(le.hang_index(ev2) == -1 and ev2["hang"]["i"] == -1, "xoá thiệp đang treo → gỡ khỏi cây")
ok(le.fix_left(ev, D10) == le.FIX_PER_DAY, "chưa nhờ sửa: còn 5 lượt")
for _ in range(7):
    le.fix_mark(ev, D10)
ok(le.fix_left(ev, D10) == 0 and le.fix_left(ev, D(2026, 12, 11)) == 5, "5 lượt / ngày, sang ngày mới có lại")
le.fix_mark(ev, D(2026, 12, 20))
ok(list(ev["fixn"]) == ["2026-12-20"], "sổ lượt sửa chỉ giữ vài ngày gần đây")

# =========================================================================================================
print("== B. mã thiệp")
code = le.card_code(CARD)
back = le.decode_card(code)
ok(code.startswith("KBC1:") and back and back["t1"] == CARD["t1"] and back["st"] == le.clean_card(CARD)["st"], "làm mã rồi đọc lại đúng thiệp")
ok("w" not in back and "wl" not in back and "fx" not in back and CARD["w"] not in json.dumps(back, ensure_ascii=False), "mã không có điều ước")
ok(le.decode_card("  " + code[:20] + "\n" + code[20:] + " ") == back, "dán mã có xuống dòng / khoảng trắng vẫn đọc được")
bad = [None, "", "KB1:abc", "KBC1:", "KBC1:@@@:000000", code[:-1] + ("0" if code[-1] != "0" else "1"), code[:30] + "A" + code[31:],
       "KBC1:" + "A" * 7000 + ":000000"]
ok(all(le.decode_card(b) is None for b in bad), "mã sai / sửa tay / quá dài → None")
import base64
import zlib
bomb = zlib.compress(b"[" * 200000, 9)
bcode = "KBC1:" + base64.urlsafe_b64encode(bomb).decode().rstrip("=") + ":" + ("%08x" % (zlib.crc32(bomb) & 0xFFFFFFFF))[:6]
ok(len(bcode) < le.CODE_MAX and le.decode_card(bcode) is None, "mã nén bom (200 KB khi giải nén) → None")
junk_json = zlib.compress(json.dumps({"f": "den", "st": "x", "t1": 5}).encode(), 9)
jcode = "KBC1:" + base64.urlsafe_b64encode(junk_json).decode().rstrip("=") + ":" + ("%08x" % (zlib.crc32(junk_json) & 0xFFFFFFFF))[:6]
ok(le.decode_card(jcode) == {"f": "den", "st": [], "t1": "", "t2": "", "c": ""}, "mã đúng khuôn nhưng trường bừa → làm sạch")
ok("Thiệp trống" in err(le.card_code, {"st": []}), "chép mã thiệp trống → lỗi")
ev = le.empty()
le.recv_add(ev, code, D25)
ok(len(le.recv_list(ev)) == 1 and le.recv_list(ev)[0]["card"]["t1"] == CARD["t1"], "nhận thiệp bằng mã → vào Album")
ok("đã có" in err(le.recv_add, ev, " " + code, D25), "nhận lại cùng thiệp → báo đã có")
ok("không đúng" in err(le.recv_add, ev, "KBC1:xyz", D25), "mã sai → báo")
for i in range(15):
    e_ = err(le.recv_add, ev, le.card_code(dict(CARD, t1="Bạn %d" % i)), D25)
ok(len(le.recv_list(ev)) == le.RECV_MAX and "tối đa" in e_, "giữ tối đa 12 thiệp nhận")
k0 = le.recv_list(ev)[-1]["k"]
le.recv_del(ev, k0)
ok(len(le.recv_list(ev)) == 11 and "Không còn" in err(le.recv_del, ev, k0), "xoá thiệp nhận")
le.recv_add(ev, k0, D(2026, 12, 26))
ok(len(le.recv_list(ev)) == 12 and le.recv_list(ev)[0]["k"] == k0, "nhận lại thiệp đã xoá → hiện lại (mới nhất trước)")
cl = le.clean_ev(json.loads(json.dumps(ev)))
ok(cl["recv"] == ev["recv"], "thiệp nhận làm sạch ra y nguyên")

# =========================================================================================================
print("== C. ông già Noel, thư")
for today, now, due, morn in [(D(2026, 12, 23), T(2026, 12, 23, 23), False, False), (D24, EVE_BEFORE, False, False),
                              (D24, EVE_AT, True, False), (D24, T(2026, 12, 25, 3, 30), True, False),
                              (D25, T(2026, 12, 25, 9), False, True), (D31, T(2026, 12, 31, 23), False, True),
                              (J1, T(2027, 1, 1, 9), False, False)]:
    sv = le.santa_view(le.empty(), today, now)
    ok(sv["due"] == due and sv["morning"] == morn, "ngày Anki %s, giờ máy %s → cảnh đêm %s · thư %s" % (today, now, due, morn))
ev = le.empty()
le.mark_seen(ev, EVE_AT, "star")
ok(not le.santa_view(ev, D24, T(2026, 12, 24, 19))["due"], "đã xem cảnh đêm → không tự chiếu lại")
le.mark_seen(ev, T(2026, 12, 24, 20), "khac")
ok(ev["santa"] == {"seen": "2026-12-24T18:00:00", "facts": "star"}, "xem lại không đổi lần xem đầu / thứ ông thấy")
le.mark_read(ev, D25, "khac")
ok(not le.santa_view(ev, D(2026, 12, 26), T(2026, 12, 26, 9))["morning"] and ev["santa"]["read"] == "2026-12-25", "đọc thư rồi → không tự mở lại")

ev = le.simulate(D25)
ok(le.letter(ev, D24, EVE_AT) is None and le.letter(ev, D25, T(2026, 12, 24, 17)) is None, "thư chỉ có từ ngày Anki 25, sau khi ông ghé")
ok(le.letter(le.empty(), D25, T(2026, 12, 25, 9)) is None, "chưa dùng tủ lịch / thiệp → không có thư")
pl = {"le_tuanloc": 2, "le_banhquy": 1, "le_nguoituyet": 1, "xmastree": 1}
L1 = le.letter(ev, D25, T(2026, 12, 25, 9), pl)
txt = " ".join(L1["body"])
ok("ngôi sao" in txt and "dây đèn võng" in txt and "vòng hoa" in txt, "thư nhắc ≤ 3 thứ đã bày (sao, dây võng, vòng hoa)")
ok("bánh quy" in txt and "tuần lộc" in txt, "có bàn bánh quy + tuần lộc đèn → cảm ơn bánh, nhắc tuần lộc")
ok("chưa thấy thiệp" in txt and L1["wish"] == "", "không treo thiệp → thư nhắc năm sau treo")
ok(set(L1["greet"]) == set(L1["sign"]) == set(le.WISH_LANGS), "lời chào + ký tên đủ 7 tiếng (theo Ngôn ngữ trong vườn)")
le.save_card(ev, 0, CARD, D10, NOW10); le.hang_card(ev, 0, D10, NOW10)
L2 = le.letter(ev, D25, T(2026, 12, 25, 9), pl)
ok(L2["wish"] == CARD["w"] and "tiếng Nhật" in " ".join(L2["body"]) and L2["card"] == 0, "treo thiệp có điều ước tiếng Nhật → thư trích điều ước, khen viết tiếng Nhật")
le.mark_read(ev, D25, le.facts(ev, pl))
L3 = le.letter(ev, D(2026, 12, 28), T(2026, 12, 28, 9), {})
ok(L3["body"] == L2["body"] or ("bánh quy" in " ".join(L3["body"]) and "tuần lộc" in " ".join(L3["body"])),
   "dọn đồ sau khi ông ghé → thư không đổi (chụp lại thứ ông thấy)")
ok(le.letter(ev, J1, T(2027, 1, 3, 9), {}) is not None, "sau 1/1 thư vẫn đọc lại được (Kỷ niệm)")
ev3 = le.simulate(D(2026, 12, 12))
L4 = le.letter(ev3, D25, T(2026, 12, 25, 9), {})
ok("12 ngăn" in " ".join(L4["body"]) and "ngôi sao" not in " ".join(L4["body"]), "mở 12 ngăn (chưa có sao) → thư không nói tới ngôi sao")

# =========================================================================================================
print("== D. cất đồ 1/1")
ev = le.simulate(D25)
ok(not le.pack_due(ev, D31) and le.pack_due(ev, J1) and not le.pack_due(le.empty(), J1), "cất đồ: từ ngày Anki 1/1, chỉ khi đã dùng sự kiện")
ok(le.remember_prev(ev, "room", "wall", "w_go") and not le.remember_prev(ev, "room", "wall", "w_noelkeo"), "đổi sang tường Noel → nhớ mẫu cũ; Noel → Noel không ghi đè")
ok(not le.remember_prev(ev, "room", "wall", "w_go"), "nhớ lại cùng mẫu → không đổi sổ")
le.remember_prev(ev, "kitchen", "floor", "")
ok(not le.remember_prev(ev, "phong_la", "wall", "w_go"), "gian lạ → bỏ qua")
use = {"room": {"wall": "w_noelkeo", "floor": "f_go"}, "kitchen": {"floor": "f_noellen"}, "bedroom": {"wall": "w_noeldo"}}
plan = le.pack_plan(ev, {"le_tuanloc": 2, "le_banhquy": 1, "le_tat": 1, "xmastree": 1}, use)
ok(plan["items"] == {"le_tuanloc": 2, "le_banhquy": 1}, "cất: tuần lộc đèn + bánh (tất, cây thông ở lại): %s" % plan["items"])
ok(plan["tiles"] == [["room", "wall", "w_noelkeo", "w_go"], ["kitchen", "floor", "f_noellen", ""], ["bedroom", "wall", "w_noeldo", ""]],
   "tường / sàn Noel → mẫu cũ (không nhớ → theo kiểu nhà): %s" % plan["tiles"])
le.mark_pack(ev, J1, plan)
ok(not le.pack_due(ev, D(2027, 1, 2)), "cất một lần")
cl = le.clean_ev(json.loads(json.dumps(ev)))
ok(cl["pack"] == ev["pack"] and cl["prev"] == ev["prev"], "sổ cất đồ / mẫu cũ làm sạch ra y nguyên")

pth = os.path.join(TMP, "pack")
os.makedirs(pth)
col = Col()
s = core.GardenState(os.path.join(pth, "wallet.json"), lambda: col)
s.today_override = 500
d = s.load(); d["home"]["house"] = 7; d["coins"] = 999; s.save(d)
s.le_apply({"le_tuanloc": 2, "le_banhquy": 1, "le_tat": 1}, ["le_tuanloc", "le_tuanloc"], ["w_noelkeo", "f_noellen"])
s.place("room", "le_banhquy", 2, 2)
s.place("room", "le_tat", 6, 0)
store = le.LeStore(os.path.join(pth, "le.json"), lambda: col)
evs = store.load()
evs["gift"]["tulich"] = "2026-12-01"
dec = s.load()["more"]["decor"]
ok(le.remember_prev(evs, "room", "wall", dec["use"]["room"].get("wall", "")), "dùng tường Noel lần đầu → sổ nhớ mẫu đang dùng")
s.decor_use("room", "wall", "w_noelkeo", extra=[store.write(evs)])
s.decor_use("room", "floor", "f_noellen")
ok(col.conf[le.LE_KEY]["noel2026"]["prev"] == {"room:wall": ""} and s.load()["more"]["decor"]["use"]["room"] == {"wall": "w_noelkeo", "floor": "f_noellen"},
   "decor_use(extra) ghi sổ mẫu cũ cùng lần với ví")
evs = store.load()
w0 = s.load()
plc = {}
for sc in core.scene_names(w0["home"]):
    for e_ in w0["home"][sc]:
        plc[e_["id"]] = plc.get(e_["id"], 0) + 1
plan = le.pack_plan(evs, plc, w0["more"]["decor"]["use"])
le.mark_pack(evs, J1, plan)
before = copy.deepcopy(col.conf)
col.fail_set = le.LE_KEY
try:
    s.le_apply({}, [], [], extra=[store.write(evs)], unplace=plan["items"], tiles_set=plan["tiles"])
    ok(False, "lỗi ghi sổ phải báo lỗi")
except (core.StoreError, backup.StoreFailed):
    ok({k: v for k, v in col.conf.items() if k != backup.REV_KEY} == {k: v for k, v in before.items() if k != backup.REV_KEY},
       "lỗi ghi sổ khi cất đồ → ví / sổ y như trước")
col.fail_set = None
w1, _ = s.le_apply({}, [], [], extra=[store.write(evs)], unplace=plan["items"], tiles_set=plan["tiles"])
ids = [e_["id"] for sc in core.scene_names(w1["home"]) for e_ in w1["home"][sc]]
ok("le_tuanloc" not in ids and "le_banhquy" not in ids and "le_tat" in ids, "cất: tuần lộc đèn + bánh rời chỗ, tất Noel ở lại")
ok(w1["home"]["owned"].get("le_tuanloc") == 2 and w1["home"]["owned"].get("le_banhquy") == 1, "món đã cất vẫn trong Kho đồ (không mất)")
ok(w1["more"]["decor"]["use"]["room"] == {} and set(w1["more"]["decor"]["own"]) >= {"w_noelkeo", "f_noellen"},
   "phòng về theo kiểu nhà, mẫu Noel vẫn sở hữu")
ok(store.load()["pack"]["at"] == "2027-01-01", "sổ ghi đã cất")
HW = next(k for k, v in core.decor.HOUSE.items() if v["slot"] == "wall" and k != core.decor.house_id("room", "wall"))
d = s.load(); d["more"]["decor"]["use"]["room"]["wall"] = HW; s.save(d)
w2, _ = s.le_apply({}, [], [], tiles_set=[["room", "wall", "w_noelkeo", "w_go"]])
ok(w2["more"]["decor"]["use"]["room"] == {"wall": HW}, "gian đã đổi sang mẫu khác (máy khác) → không trả đè")
d = s.load(); d["more"]["decor"]["use"]["room"]["wall"] = "w_noelkeo"; s.save(d)
w3, _ = s.le_apply({}, [], [], tiles_set=[["room", "wall", "w_noelkeo", "khong_co"]])
ok(w3["more"]["decor"]["use"]["room"] == {}, "mẫu cũ không còn dùng được → theo kiểu nhà")
w4, _ = s.le_apply({}, [], [], tiles_set=[["room", "wall", "w_noelkeo", HW]])
d = s.load(); d["more"]["decor"]["use"]["room"]["wall"] = "w_noelkeo"; s.save(d)
w4, _ = s.le_apply({}, [], [], tiles_set=[["room", "wall", "w_noelkeo", HW]])
ok(w4["more"]["decor"]["use"]["room"] == {"wall": HW}, "mẫu cũ còn dùng được → trả lại đúng mẫu đó")

# =========================================================================================================
print("== E. gộp hai máy")
a, b = le.empty(), le.empty()
le.save_card(a, 0, dict(CARD, t1="Máy A"), D10, T(2026, 12, 10, 9))
le.save_card(b, 0, dict(CARD, t1="Máy B"), D10, T(2026, 12, 10, 10))
le.save_card(a, 1, dict(CARD, t1="A2"), D10, T(2026, 12, 10, 11))
le.save_card(b, 1, CARD, D10, T(2026, 12, 10, 8)); le.delete_card(b, 1, D10, T(2026, 12, 10, 12))
le.hang_card(a, 0, D10, T(2026, 12, 10, 13)); le.hang_card(b, 0, D10, T(2026, 12, 10, 9)); le.hang_card(b, -1, D10, T(2026, 12, 10, 9, 30))
le.mark_seen(a, T(2026, 12, 24, 19), "x"); le.mark_read(b, D25, "y")
le.recv_add(a, code, D25); le.recv_add(b, code, D(2026, 12, 26)); le.recv_del(b, le.recv_list(b)[0]["k"])
m1, m2 = le.merge_ev(a, b), le.merge_ev(b, a)
ok(le.cards(m1)[0]["t1"] == "Máy B" and not le.filled(le.cards(m1)[1]), "thiệp: lần sửa sau thắng (xoá ở máy B sau → xoá)")
ok(le.hang_index(m1) == 0, "thiệp treo: lần chọn sau thắng")
ok(m1["santa"].get("seen") and m1["santa"].get("read"), "đã xem cảnh / đã đọc thư ở máy nào cũng tính")
ok(le.recv_list(m1) == [] and m1["recv"][0]["at"] == "2026-12-25", "thiệp nhận xoá ở máy B → xoá cả hai")
strip = lambda x: json.dumps({k: x[k] for k in ("cards", "hang", "santa", "recv") if k in x}, sort_keys=True)
ok(strip(m1) == strip(m2), "gộp giao hoán (A+B = B+A)")
rng = random.Random(SEED)
bad = []
STK = ["xmastree", "presents", "stackchan", "le_tat", "wreath"]
for n in range(400):
    evs2 = [le.empty(), le.empty()]
    model = {"cards": [None, None, None], "hang": None}
    t0 = T(2026, 12, 1, 8)
    for step in range(rng.randint(3, 25)):
        m = rng.randrange(2)
        t0 += dt.timedelta(minutes=rng.randint(1, 300))
        if t0 >= le.EVE:
            break
        today = t0.date()
        e_ = evs2[m]
        op = rng.random()
        i = rng.randrange(3)
        try:
            if op < 0.45:
                cc = dict(CARD, t1="t%d" % step, st=[{"s": rng.choice(STK), "x": rng.randint(-60, 140), "y": rng.randint(-60, 100)}])
                le.save_card(e_, i, cc, today, t0)
            elif op < 0.6:
                le.delete_card(e_, i, today, t0)
            elif op < 0.8:
                le.hang_card(e_, rng.choice([i, -1]), today, t0)
            elif op < 0.9:
                le.recv_add(e_, le.card_code(dict(CARD, t1="r%d" % rng.randrange(5))), today)
            else:
                lst = le.recv_list(e_)
                if lst:
                    le.recv_del(e_, rng.choice(lst)["k"])
        except le.LeError:
            pass
        if rng.random() < 0.3:          # đồng bộ: hai máy cùng thấy bản gộp
            g = le.merge_ev(evs2[0], evs2[1])
            evs2 = [copy.deepcopy(g), copy.deepcopy(g)]
    g1, g2 = le.merge_ev(evs2[0], evs2[1]), le.merge_ev(evs2[1], evs2[0])
    if strip(g1) != strip(g2):
        bad.append((n, "không giao hoán"))
    gg = le.clean_ev(json.loads(json.dumps(g1)))
    if strip(gg) != strip(le.clean_ev(json.loads(json.dumps(gg)))):
        bad.append((n, "làm sạch hai lần khác một lần"))
    for i in range(3):        # đối chứng: thiệp gộp = bản có dấu thời gian mới nhất trong hai máy
        want = max((evs2[0].get("cards") or [None] * 3)[i], (evs2[1].get("cards") or [None] * 3)[i], key=lambda c_: (c_ or {}).get("at") or "")
        if le.filled(want) != le.filled(le.cards(g1)[i]) or (want and (want.get("t1") != (le.cards(g1)[i] or {}).get("t1"))):
            bad.append((n, "thiệp %d" % i))
    if le.hang_index(g1) >= 0 and not le.filled(le.cards(g1)[le.hang_index(g1)]):
        bad.append((n, "treo thiệp trống"))
    if len(le.recv_list(g1)) > le.RECV_MAX:
        bad.append((n, "quá 12 thiệp nhận"))
ok(not bad, "400 lượt hai máy ngẫu nhiên (KB_SEED=%d): gộp giao hoán, làm sạch ổn định, thiệp theo lần sửa sau%s" % (SEED, "" if not bad else " — " + str(bad[:3])))

# =========================================================================================================
print("== E2. lưu hai lần trong cùng một giây / đồng hồ lùi (qua LeStore + collection)")
col = Col()
store2 = le.LeStore(os.path.join(TMP, "e2.json"), lambda: col)
t = T(2026, 12, 10, 20, 0, 0)
for k_ in range(3):
    e_ = store2.load(); le.save_card(e_, 0, dict(CARD, t1="lần %d" % k_), D10, t); store2.save(e_)
ok(le.cards(store2.load())[0]["t1"] == "lần 2", "3 lần lưu trong cùng giây → bản cuối thắng (%s)" % le.cards(store2.load())[0]["at"])
e_ = store2.load(); le.save_card(e_, 0, dict(CARD, t1="đồng hồ lùi"), D10, T(2026, 12, 10, 19)); store2.save(e_)
ok(le.cards(store2.load())[0]["t1"] == "đồng hồ lùi", "đồng hồ máy lùi 1 giờ → lần lưu mới vẫn thắng")
e_ = store2.load()
ok(le.fix_set(e_, 0, CARD["w"], {"sua": "x。"}, t), "Gemini sửa xong cùng giây với lần lưu")
store2.save(e_)
ok((le.cards(store2.load())[0].get("fx") or {}).get("sua") == "x。", "bản sửa của Gemini ghi được vào collection (không thua bản cùng dấu)")
e_ = store2.load(); le.hang_card(e_, 0, D10, t); store2.save(e_)
e_ = store2.load(); le.hang_card(e_, -1, D10, t); store2.save(e_)
ok(le.hang_index(store2.load()) == -1, "treo rồi gỡ trong cùng giây → gỡ")

print("== F. bản 1.36.0 (mã thật) chạy chen")
spec = importlib.util.spec_from_file_location("le_core_1360", os.path.join(HERE, "..", "fixtures", "le_1360", "le_core.py"))
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
ok(not hasattr(old, "save_card") and hasattr(old, "LeStore"), "mã 1.36.0 thật (không có phần thiệp)")
e136 = le.simulate(D(2026, 12, 20))
ok(le.clean_ev(json.loads(json.dumps(e136))) == e136, "sổ 1.36.0 làm sạch bằng 1.36.1 ra y nguyên (không thêm khoá)")
col = Col()
store_new = le.LeStore(os.path.join(TMP, "f_new.json"), lambda: col)
evn = store_new.load()
le.save_card(evn, 0, CARD, D10, NOW10); le.hang_card(evn, 0, D10, NOW10); le.recv_add(evn, code, D10)
le.mark_seen(evn, EVE_AT, "star"); evn["pack"] = {"at": "2027-01-01", "items": {}, "tiles": []}
store_new.save(evn)
snap = json.loads(json.dumps(col.conf[le.LE_KEY]["noel2026"]))
store_old = old.LeStore(os.path.join(TMP, "f_old.json"), lambda: col)
evo = store_old.load()
old.open_door(evo, 11, D(2026, 12, 11), ["2026-12-11"], [], 0)
store_old.save(evo)
after = col.conf[le.LE_KEY]["noel2026"]
ok(all(after.get(k) == snap.get(k) for k in ("cards", "hang", "recv", "santa", "pack")), "1.36.0 mở ngăn + ghi sổ → thiệp, thiệp nhận, ông già Noel, cất đồ còn nguyên")
ok("11" in after["open"], "ngăn 1.36.0 vừa mở có trong sổ")
evn2 = store_new.load()
ok(le.cards(evn2)[0]["t1"] == CARD["t1"] and le.hang_index(evn2) == 0 and "11" in evn2["open"], "về 1.36.1 thấy đủ (thiệp + ngăn mở ở 1.36.0)")

# =========================================================================================================
print("== G. Tin làng")
ev = le.simulate(D24)
nl = le.news_line(ev, D24, [d.isoformat() for d in (D(2026, 12, x) for x in range(1, 25))], [], 3, EVE_BEFORE)
ok(nl and nl["id"] == "le_eve_card" and "18:00" in nl["text"] and not nl.get("low"), "24/12 chưa treo thiệp → nhắc treo trước 18:00")
le.save_card(ev, 0, CARD, D24, T(2026, 12, 24, 10)); le.hang_card(ev, 0, D24, T(2026, 12, 24, 10))
ok((le.news_line(ev, D24, [], [], 3, EVE_BEFORE) or {}).get("id") != "le_eve_card", "đã treo → không nhắc")
evr = le.simulate(D(2026, 12, 21))
nl = le.news_line(evr, D(2026, 12, 21), [], [], 0, T(2026, 12, 21, 9))
ok(nl is None or nl["id"] != "le_letter", "trước 25 không có dòng thư")
ev5 = le.simulate(D25)
nl = le.news_line(ev5, D25, [], [], 0, T(2026, 12, 25, 9))
ok(nl and nl["id"] == "le_letter", "25/12 chưa đọc thư → \"Ông già Noel để lại thư\"")
le.mark_read(ev5, D25, "")
ok((le.news_line(ev5, D25, [], [], 0, T(2026, 12, 25, 9)) or {}).get("id") != "le_letter", "đọc rồi → thôi")
evc = le.empty(); evc["open"] = {"1": {"d": "2026-12-01", "b": 0}}; evc["gift"] = {"tulich": "2026-12-01"}
nl = le.news_line(evc, D(2026, 12, 2), ["2026-12-02"], [], 0, T(2026, 12, 2, 9))
ok(nl and nl["id"] == "le_ready", "ngăn chờ mở vẫn ưu tiên hơn")
evc["open"]["2"] = {"d": "2026-12-02", "b": 0}
nl = le.news_line(evc, D(2026, 12, 2), ["2026-12-02"], [], 0, T(2026, 12, 2, 9))
ok(nl and nl["id"] == "le_card" and nl.get("low"), "không còn gì → \"làm thiệp Giáng sinh\" (ít ưu tiên, chỉ ở Tin làng)")
ok(le.news_line(evc, D(2026, 12, 2), ["2026-12-02"], [], 0) is None, "không có giờ máy (gọi kiểu 1.36.0) → như 1.36.0")

# =========================================================================================================
print("== H. hợp đồng dữ liệu, view")
src = open(os.path.join(ADDON, "le_core.py"), encoding="utf-8").read()
import re
ok(set(re.findall(r"kotoba_batake_[a-z0-9_]+", src)) == {"kotoba_batake_le"} and 'LE_KEY = "kotoba_batake_le"' in src, "le_core chỉ dùng khoá kotoba_batake_le")
cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
ok("season_event" in cfg and not any(k.startswith(("card", "santa", "noel", "le_")) for k in cfg), "config.json không thêm mục mới cho 1.36.1")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
import re
keys = set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', init))
ok("kotoba_batake_le_card" not in keys and not any(k.startswith("kotoba_batake_le_") for k in keys), "không thêm khoá collection mới")
ev = le.simulate(D25)
le.save_card(ev, 0, CARD, D10, NOW10); le.hang_card(ev, 0, D10, NOW10); le.recv_add(ev, code, D25)
vm = le.view_more(ev, D25, T(2026, 12, 25, 9), {"le_banhquy": 1})
js = json.loads(json.dumps(vm, ensure_ascii=False))
ok(js["hang"] == 0 and js["taken"] == 0 and not js["hang_edit"] and js["card_edit"] and js["santa"]["morning"] and js["letter"]["wish"] == CARD["w"],
   "view_more: thiệp đã treo + ông đã nhận, thư có điều ước, xưởng còn sửa được thiệp khác")
ok(js["eaten"] and len(js["recv"]) == 1 and "le_cautuyet" not in js["stickers"] and "le_tulich" in js["stickers"], "bánh đã ăn, thiệp nhận, sticker món đã nhận (hộp chưa mở → chưa có)")
vm2 = le.view_more(le.empty(), J1, T(2027, 1, 1, 9))
ok(not vm2["card_edit"] and not vm2["hang_edit"] and vm2["letter"] is None, "sau mùa, chưa dùng → không sửa thiệp, không có thư")
sticky = le.stickers(le.simulate(D(2026, 12, 26)))
ok(sticky[0] == "le_tulich" and "le_cautuyet" in sticky and "le_banhquy" in sticky, "sau khi mở hộp quà → sticker quả cầu tuyết")

print()
print("KẾT QUẢ: %d/%d" % (PASS[0], PASS[0] + len(FAIL)))
if FAIL:
    print("HỎNG:")
    for f in FAIL:
        print("  - " + f)
    sys.exit(1)
