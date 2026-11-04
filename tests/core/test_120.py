"""Test lõi bản 1.20: 花暦 · Lịch hoa, nhật ký + sticker, luyện viết (Gemini giả lập), cuốn nhật ký (journal_core).

Kiểm tra:
  - đếm chữ / cắt bài luyện viết (60 ký tự tiếng Nhật, 30 từ tiếng Anh, dán cả đoạn dài);
  - làm sạch dữ liệu nhật ký (kiểu sai, sticker lạ, chữ quá dài, ngày ngoài tháng, giữ khoá lạ của bản sau khi ghi);
  - mức cây theo mục tiêu ngày, chuỗi ngày, giao diện mùa theo ngày (Tết âm lịch, Giáng sinh ưu tiên hơn lá đỏ);
  - đếm revlog theo ngày trên collection Anki thật (bỏ type 4, thẻ mới, "lên Ra quả" gần đúng), lịch tháng / năm,
    tổng kết + dòng của cuốn nhật ký, kệ sách;
  - Gemini sửa bài: lời nhắc ghi rõ từng giới hạn + ví dụ JSON, máy cắt đầu ra quá mọi giới hạn, Flash-Lite trước,
    hết hạn mức thì sang model khác, mọi model hết → "chờ lượt", khoá sai dừng ngay; đánh dấu chỗ sửa / chữ bị bỏ;
  - ảnh vườn tự chụp (1 tấm / tuần, chặn dữ liệu lạ);
  - có thư mục bản 1.19.1 (đối số 2): mã 1.19.1 thật lưu ví / báo / cấu hình trường → khoá nhật ký còn nguyên.

Chạy: python test_120.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.19.1]   (cần gói anki: ANKI_PY=…)
"""
import datetime
import importlib.util
import json
import os
import sys
import tempfile
import time

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
sys.path.insert(0, ADDON)
import ai_core as ai  # noqa: E402
import journal_core as j  # noqa: E402
import season_core as season  # noqa: E402
from anki.collection import Collection  # noqa: E402

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


D = datetime.date
print("== đếm chữ / cắt bài luyện viết")
ok(j.count_units("きのう 友だちと\n", "ja") == 7, "tiếng Nhật đếm ký tự, không tính khoảng trắng")
ok(j.count_units("I'm going to the well-known park.", "en") == 6, "tiếng Anh đếm từ (I'm, well-known là một từ)")
long_en = ("Yesterday it rain a lot, so my friend and I book a small restaurant near the station and we eats dinner "
           "together. The food was delicious and we was happy today too.")
cut, was = j.clip_units(long_en, "en", 30)
ok(was and j.count_units(cut, "en") == 30 and cut.endswith("happy"), "dán đoạn 32 từ → cắt ở từ thứ 30 (%r)" % cut[-20:])
cut, was = j.clip_units("あ" * 50 + " " + "い" * 30, "ja", 60)
ok(was and j.count_units(cut, "ja") == 60, "tiếng Nhật cắt ở ký tự thứ 60 (không tính khoảng trắng)")
ok(j.clip_units("Hello world.", "en", 30) == ("Hello world.", False), "bài ngắn giữ nguyên")
cut, _ = j.clip_units("one two three. four", "en", 3)
ok(cut == "one two three.", "giữ dấu câu dính sau từ cuối")

print("== làm sạch dữ liệu nhật ký")
ok(j.clean_line("a\r\nb\t c\x00​", 50) == "a b c", "xuống dòng / tab / ký tự điều khiển → một dòng")
ok(len(j.clean_line("x" * 500, 200)) == 200, "nhật ký tối đa 200 ký tự")
bad = {"2026-11-03": {"m": "lol", "t": 123, "w": "x"}, "2026-11-04": {"m": "vui", "t": "  Hôm nay vui  ", "zz": 1},
       "2026-12-01": {"m": "vui"}, "xx": {}, "2026-11-05": "hỏng",
       "2026-11-06": {"w": {"lang": "fr", "goc": "あ" * 80, "st": "done", "sua": "い", "loi": [{"goc": "a", "loai": "lạ"}] * 9,
                            "nhan_xet": "n" * 400}}}
cm = j.clean_month(bad, 2026, 11)
ok(set(cm) == {"2026-11-04", "2026-11-06"}, "chỉ nhận ngày đúng tháng của khoá, bỏ mục hỏng / rỗng (%s)" % sorted(cm))
ok(cm["2026-11-04"] == {"m": "vui", "t": "Hôm nay vui"}, "khoá lạ không vào dữ liệu hiện, chữ được làm sạch")
w = cm["2026-11-06"]["w"]
ok(w["lang"] == "ja" and len(w["goc"]) == 60, "ngôn ngữ lạ → ja, bài cắt còn 60 ký tự")
ok(len(w["loi"]) == 3 and all(e["loai"] == "ngữ pháp" for e in w["loi"]), "tối đa 3 lỗi, loại lạ → ngữ pháp")
ok(len(w["nhan_xet"]) <= j.NOTE_MAX + 40, "nhận xét đã lưu bị chặn độ dài")
ok(j.clean_entry({"m": "vui", "w": {"lang": "en", "goc": "", "goi_y": ["a", 3, "b", "c"]}})["w"]["goi_y"] == ["a", "b"],
   "gợi ý: tối đa 2 từ, bỏ giá trị không phải chữ")

print("== mức cây, chuỗi ngày")
ok([j.level(n, 30) for n in (0, 1, 9, 10, 19, 20, 29, 30, 99)] == [0, 1, 1, 2, 2, 3, 3, 4, 4], "mức theo mục tiêu 30")
ok([j.level(n, 60) for n in (19, 20, 40, 59, 60)] == [1, 2, 3, 3, 4], "mức theo mục tiêu 60 (nở rộ = đạt mục tiêu)")
ok(j.level(5, 0) == 1 and j.level(30, -3) == 4, "mục tiêu không hợp lệ → 30")
today = D(2026, 11, 4)
days = {(today - datetime.timedelta(days=i)).isoformat() for i in (1, 2, 3, 5, 6, 7, 8, 9)}
ok(j.streaks(days, today) == (3, 5), "chuỗi hiện tại (hôm nay chưa ôn → tính tới hôm qua) và chuỗi dài nhất")
ok(j.streaks(days | {today.isoformat()}, today)[0] == 4, "hôm nay đã ôn → chuỗi +1")

print("== giao diện mùa theo ngày")
sp = j.theme_spans(2026, 2027)
ok(j.theme_on(D(2026, 11, 20), sp) == "noel" and j.theme_on(D(2026, 11, 10), sp) == "momiji", "Giáng sinh ưu tiên hơn lá đỏ")
tet = season.tet_date(2027)
ok(j.theme_on(tet, sp) == "tet" and j.theme_on(tet - datetime.timedelta(days=21), sp) == "tet"
   and j.theme_on(tet - datetime.timedelta(days=22), sp) != "tet", "Tết theo âm lịch: từ 21 ngày trước mùng 1")
ok(all(j.theme_on(D(2026, m, 15), sp) for m in range(1, 13)), "ngày nào cũng có giao diện mùa theo lịch")
bands = j.month_bands(2026, 11, sp)
ok([b["id"] for b in bands] == ["momiji", "noel"] and bands[1]["over"] == ["Mùa lá đỏ"],
   "dải tháng 11: Mùa lá đỏ, Giáng sinh (ưu tiên hơn Mùa lá đỏ); Mùa thu không thắng ngày nào nên không hiện")
up = j.upcoming(D(2026, 11, 30), j.theme_spans(2026, 2028))
ok([u["id"] for u in up] == ["shogatsu", "tet"] and up[1]["lunar"], "Sắp tới sau tháng 11: お正月, Tết (âm lịch)")
ok(j.SPECIES["tet"] == "mai" and j.SPECIES["noel"] == "poinsettia" and j.SPECIES["tsuyu"] == "ajisai"
   and j.SPECIES["autumn"] == "kiku" and set(j.SPECIES) == set(season.THEME_IDS), "mỗi giao diện mùa một loài hoa")
seeds_js = open(os.path.join(ADDON, "web", "seeds.js"), encoding="utf-8").read()
for sp_id in set(j.SPECIES.values()):
    ok(("    %s: [" % sp_id) in seeds_js, "seeds.js có loài %s" % sp_id)

print("== từ gợi ý, từ đã dùng, đánh dấu chỗ sửa")
ok(j.jp_forms("予約する") == ["予約する", "予約"] and j.jp_forms("寒い") == ["寒い", "寒"], "gốc của する-động từ / tính từ い")
ok(j.jp_find("銀行に行きます", "行") == [(3, 4)], "gốc một chữ Hán: không khớp 銀行, khớp 行きます")
ok(j.used_hints("友だちとレストランを予約しました。寒いでしたが", ["予約する", "寒い"], "ja") == ["予約する", "寒い"],
   "tiếng Nhật: dùng dạng chia vẫn tính là đã dùng")
ok(j.used_hints("I booked a table because it was raining.", ["book", "rain"], "en") == ["book", "rain"],
   "tiếng Anh: dạng biến đổi (booked, raining) tính là đã dùng")
items = [{"word": "予約する", "due": True}, {"word": "賛成(する)", "due": True}, {"word": "寒い", "due": True},
         {"word": "とても長い長い長い言葉です", "due": True}, {"word": "犬", "due": False}, {"word": "猫", "due": True, "kind": "kanji"}]
h1 = j.pick_hints(items, "ja", "2026-11-04:ja:0")
ok(sorted(h1) == ["予約する", "寒い"], "gợi ý: từ phải ôn, bỏ từ có ngoặc / quá dài / không phải từ vựng (%s)" % h1)
ok(j.pick_hints(items, "ja", "2026-11-04:ja:0") == h1, "cùng ngày cùng gợi ý")
ok(j.pick_hints([{"word": "犬", "due": False}], "ja", "x") == ["犬"], "không có từ phải ôn thì lấy từ đã thuộc")
goc = "きのうは雨だったので、友だちと駅の近くのレストランを予約しました。寒いでしたが、料理はおいしいでした。"
sua = "きのうは雨だったので、友だちと駅の近くのレストランを予約しました。寒かったですが、おいしかったです。"
segs = j.segments(sua, *j._marks(goc, sua, "ja", ["予約する"]))
ok(["かったです", "c"] in segs and ["料理は", "d"] in segs and ["予約", "u"] in segs,
   "câu đã sửa: tô chỗ sửa (かったです), hiện chữ bị bỏ (料理は), gạch chân từ đã học")
ok("".join(s[0] for s in segs if s[1] != "d") == sua, "ghép lại (trừ chữ bị bỏ) đúng câu đã sửa")
g2, s2 = "Yesterday it rain a lot so my friend and I book a table.", "Yesterday it rained a lot, so I booked a table."
segs = j.segments(s2, *j._marks(g2, s2, "en", ["book"]))
ok(["rained", "c"] in segs and ["booked", "cu"] in segs and any(x[1] == "d" and "friend" in x[0] for x in segs),
   "tiếng Anh: so theo từ (lot ↔ lot, không tính dấu phẩy), chữ bị bỏ, từ đã học")

print("== Gemini sửa bài: lời nhắc + máy cắt đầu ra")
pr = j.fix_prompt(goc, "ja", "N4", ["予約する", "寒い"])
for s in ("tối đa 3 lỗi", "tối đa 60 ký tự", "tối đa 100 ký tự", "tối đa 15 ký tự", "tối đa 30 ký tự", "Cùng quy tắc như lỗi trên",
          "予約する, 寒い", "N4", '"loi": [{"goc"', "không bỏ bớt"):
    ok(s in pr, "lời nhắc có: %s" % s)
ok("tối đa 5 từ" in j.fix_prompt("I go school yesterday.", "en", "A2", []), "tiếng Anh: chỗ sai tối đa 5 từ")
ok("không emoji" in j.fix_system("ja", "N4") and "không đánh dấu furigana" in j.fix_system("ja", "N4"), "lời dặn hệ thống")
huge = {"sua": sua + "そして、とても楽しかったです。また行きたいです。", "loi": [
    {"goc": "寒いでした", "sua": "寒かったです", "loai": "Ngữ pháp", "quy_tac": "tính từ đuôi い (〜かった) và rất nhiều chữ thừa",
     "giai_thich": "Tính từ đuôi い: quá khứ là bỏ い + かった(です). Câu thứ hai không cần thiết nên phải bị cắt đi."},
    {"goc": "おいしいでした", "sua": "おいしかったです", "loai": "grammar", "quy_tac": "x", "giai_thich": "Cung quy tac nhu loi tren nhe"},
    {"goc": "không có trong bài", "sua": "x", "loai": "từ", "quy_tac": "", "giai_thich": "Lỗi bịa."},
    {"goc": "雨", "sua": "あめ", "loai": "chính tả", "quy_tac": "", "giai_thich": "Viết lại."},
    {"goc": "駅", "sua": "えき", "loai": "chính tả", "quy_tac": "", "giai_thich": "Lỗi thứ năm."}],
    "con_lai": "Còn rất nhiều lỗi khác nữa mà máy phải cắt cho ngắn lại vì quá sáu mươi ký tự. Câu hai.",
    "tu_nhien": "寒かったです。",
    "nhan_xet": "Bạn dùng đúng 予約する. Câu nối bằng ので rất tự nhiên và dễ hiểu. Nhớ quá khứ của tính từ い nhé bạn."}
res, notes = j.check_fix(huge, goc, "ja")
ok(j.count_units(res["sua"], "ja") <= j.fix_limit(j.count_units(goc, "ja"), "ja") <= 72, "câu đã sửa ≤ bài gốc + 20%% (%d)" % j.count_units(res["sua"], "ja"))
ok(res["sua"].endswith("。"), "cắt câu đã sửa ở dấu hết câu")
ok(len(res["loi"]) == 3, "tối đa 3 lỗi (bỏ lỗi không có trong bài, lỗi thứ 4 trở đi)")
ok(res["loi"][0]["giai_thich"] == "Tính từ đuôi い: quá khứ là bỏ い + かった(です)." and len(res["loi"][0]["giai_thich"]) <= 60,
   "giải thích: 1 câu ≤ 60 ký tự")
ok(len(res["loi"][0]["quy_tac"]) <= 30, "quy tắc ≤ 30 ký tự")
ok(res["loi"][1]["giai_thich"] == "" and res["loi"][1]["loai"] == "ngữ pháp", "giải thích không dấu bị bỏ, loại grammar → ngữ pháp")
ok(len(res["con_lai"]) <= 60 and len(res["nhan_xet"]) <= 100 and res["nhan_xet"].count(".") <= 2, "còn lại ≤ 60, nhận xét ≤ 2 câu ≤ 100")
ok(res["tu_nhien"] == "", "có lỗi thì bỏ cách nói tự nhiên hơn")
ok(any("không có trong bài" in n for n in notes) and any("cắt nhận xét" in n for n in notes), "ghi nhật ký những gì đã cắt / bỏ")
res, notes = j.check_fix({"sua": sua * 3, "loi": [], "nhan_xet": "Tốt."}, goc, "ja")
ok(res["sua"] == "" and any("dài gấp" in n for n in notes), "câu đã sửa dài quá 2 lần bài gốc → chỉ hiện lỗi + nhận xét")
res, _ = j.check_fix({"sua": "Hôm qua trời mưa.", "loi": [], "nhan_xet": "Tốt."}, goc, "ja")
ok(res["sua"] == "", "câu đã sửa sai ngôn ngữ → bỏ")
res, _ = j.check_fix({"sua": "I go to school.", "loi": [], "tu_nhien": "I went to school.", "nhan_xet": "Bai viet tot lam ban oi."},
                     "I go to school.", "en")
ok(res["tu_nhien"] == "I went to school." and res["nhan_xet"] == "", "không lỗi → giữ cách nói tự nhiên; nhận xét không dấu → bỏ")
try:
    j.check_fix("không phải JSON", goc, "ja")
    ok(False, "dữ liệu lạ phải báo lỗi")
except j.JournalError:
    ok(True, "dữ liệu lạ → JournalError")
res, _ = j.check_fix({"sua": sua, "loi": [
    {"goc": "寒いでした", "sua": "寒かったです", "loai": "dạng chia", "quy_tac": "tính từ đuôi い", "giai_thich": "Tính từ đuôi い: bỏ い + かった."},
    {"goc": "おいしいでした", "sua": "おいしかったです", "loai": "dạng chia", "quy_tac": "Cùng quy tắc như lỗi trên.", "giai_thich": "Cùng quy tắc như lỗi trên."}],
    "nhan_xet": "Tốt."}, goc, "ja")
ok([e["quy_tac"] for e in res["loi"]] == ["tính từ đuôi い"] * 2, "lỗi \"cùng quy tắc như lỗi trên\" dùng quy tắc của lỗi trước (gom Lỗi hay gặp)")
ok(j.norm_loai("Chia động từ") == "dạng chia" and j.norm_loai("particle") == "trợ từ" and j.norm_loai("???") == "ngữ pháp",
   "chuẩn hoá loại lỗi")


class FakeClient:
    """Gemini giả: mỗi model trả về một trong: ok / quota / key / bad."""

    def __init__(self, plan):
        self.plan = plan
        self.calls = []
        self.exhausted = {}
        self.tokens = 0

    def is_exhausted(self, m):
        return self.exhausted.get(m, 0) > time.time()

    def generate(self, model, system, prompt, schema=None, **kw):
        self.calls.append(model)
        what = self.plan.get(model, "ok")
        if what == "quota":
            self.exhausted[model] = time.time() + 3600
            raise ai.AIError("hết hạn mức", "quota", daily=True)
        if what == "key":
            raise ai.AIError("khoá sai", "key")
        if what == "bad":
            return "{hỏng"
        return json.dumps({"sua": sua, "loi": [], "con_lai": "", "tu_nhien": "", "nhan_xet": "Tốt."}, ensure_ascii=False)


names = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"]
ok(j.fix_models(names)[:2] == ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"], "bài sửa dùng Flash-Lite trước (không tranh lượt với báo)")
c = FakeClient({})
r = j.run_fix(c, names, goc, "ja", "N4", [])
ok(r["model"] == "gemini-flash-lite-latest" and c.calls == ["gemini-flash-lite-latest"], "gọi đúng 1 lần, model Flash-Lite")
c = FakeClient({"gemini-flash-lite-latest": "quota", "gemini-3.1-flash-lite": "quota"})
r = j.run_fix(c, names, goc, "ja", "N4", [])
ok(r["model"] == "gemini-3.6-flash", "Flash-Lite hết hạn mức → sang Flash")
c = FakeClient({n: "quota" for n in names})
try:
    j.run_fix(c, names, goc, "ja", "N4", [])
    ok(False, "mọi model hết hạn mức phải báo quota")
except ai.AIError as e:
    ok(e.kind == "quota" and e.daily, "mọi model hết hạn mức → quota (bài chuyển sang \"chờ lượt\")")
c = FakeClient({"gemini-flash-lite-latest": "key"})
try:
    j.run_fix(c, names, goc, "ja", "N4", [])
    ok(False, "khoá sai phải dừng")
except ai.AIError as e:
    ok(e.kind == "key" and len(c.calls) == 1, "khoá sai → dừng ngay, không thử model khác")
c = FakeClient({"gemini-flash-lite-latest": "bad"})
r = j.run_fix(c, names, goc, "ja", "N4", [])
ok(r["model"] == "gemini-3.1-flash-lite", "JSON hỏng → thử model kế tiếp")
c = FakeClient({})
c.exhausted["gemini-flash-lite-latest"] = time.time() + 999
ok(j.fix_models(names, c)[0] == "gemini-3.1-flash-lite", "bỏ model đã biết hết hạn mức (dùng chung với báo)")
ok(j.short_reason(ai.AIError("x", "net")) == "mất mạng" and j.short_reason(ai.AIError("x", "quota", daily=True)) == "hết lượt miễn phí",
   "lý do ngắn cho thông báo")

print("== trạng thái bài luyện viết")
now = time.time()
ok(j.stale_wait({"st": "wait", "sent": now - 700}, now) and not j.stale_wait({"st": "wait", "sent": now - 100}, now),
   "cờ \"đang sửa\" quá 10 phút → coi như chưa sửa")
ok(not j.stale_wait({"st": "wait", "sent": now - 700}, now, running=True), "đang có việc nền thì không mở khoá")
v = j.writing_view(None, "en", ["ja", "en"], True, False, ["book", "rain"], [])
ok(v["lang"] == "en" and v["max"] == 30 and v["unit"] == "từ" and not v["locked"] and not v["key"], "hôm nay chưa viết: ô mở, chưa có khoá")
ok(j.writing_view(None, "ja", ["ja"], False, True, [], []) is None, "ngày cũ chưa viết → không có khung luyện viết")
v = j.writing_view({"lang": "ja", "goc": goc, "st": "done", "sua": sua, "loi": [], "nhan_xet": "x"}, "en", ["ja", "en"], True, True, [], [])
ok(v["lang"] == "ja" and v["locked"] and v["fix"]["segs"], "đã sửa: khoá bài, giữ ngôn ngữ của bài, có câu đã sửa")
v = j.writing_view({"lang": "ja", "goc": goc, "st": "queue"}, "ja", ["ja"], True, True, [], [], time.time() + 3600)
ok(v["locked"] and v["reset"], "chờ lượt: khoá bài, ghi giờ tự sửa")

print("== collection thật: revlog theo ngày, nhật ký theo tháng")
tmp = tempfile.mkdtemp()
col = Collection(os.path.join(tmp, "c.anki2"))
m = col.models.by_name("Basic")
did = col.decks.id("Test")
cids = []
for i in range(6):
    n = col.new_note(m)
    n["Front"], n["Back"] = "語%d" % i, "nghĩa %d" % i
    col.add_note(n, did)
    cids += n.card_ids()
day0 = int(col.sched.day_cutoff) - 86400
at = j.anki_today(col)


def rl(back, cid, typ, ivl=1, last=1, k=0):
    col.db.execute("insert into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)",
                   (day0 - back * 86400 + 3600 * 10 + k) * 1000 + k, cid, -1, 3, ivl, last, 2500, 3000, typ)


for k in range(12):
    rl(0, cids[k % 6], 1, 5, 3, k)                 # hôm nay 12 lượt
rl(1, cids[0], 0, 1, 0, 1); rl(1, cids[0], 0, 1, 0, 2); rl(1, cids[1], 1, 95, 60, 3); rl(1, cids[1], 4, 0, 0, 4)
rl(40, cids[2], 1, 120, 80, 1)
c = j.revlog_days(col, at - datetime.timedelta(days=45), at, 90)
ok(c[at.isoformat()]["n"] == 12, "hôm nay 12 lượt")
y1 = (at - datetime.timedelta(days=1)).isoformat()
ok(c[y1] == {"n": 3, "new": 1, "fruit": 1}, "hôm qua: 3 lượt (bỏ type 4), 1 thẻ mới (đếm thẻ, không đếm lượt), 1 lên Ra quả (%s)" % c.get(y1))
ok(c[(at - datetime.timedelta(days=40)).isoformat()]["fruit"] == 1, "lượt ivl 120 / lastIvl 80 → lên Ra quả")
ok(j.first_review_day(col) == at - datetime.timedelta(days=40), "ngày ôn đầu tiên")
ok(j.fruit_cards(col, at - datetime.timedelta(days=1), 90) == [cids[1]], "thẻ lên Ra quả của một ngày")
store = j.JournalStore(os.path.join(tmp, "journal"), col_getter=lambda: col)
col.set_config(j.month_key(at.year, at.month), {"zz_ban_sau": {"x": 1}, at.isoformat(): {"m": "vui", "khoa_la": [1, 2]}})
e = store.update(at, {"t": "Hôm nay vui", "w": {"lang": "ja", "goc": "テスト", "st": ""}})
raw = col.get_config(j.month_key(at.year, at.month))
ok(raw.get("zz_ban_sau") == {"x": 1} and raw[at.isoformat()].get("khoa_la") == [1, 2], "ghi nhật ký giữ khoá lạ của bản sau (mức tháng + mức ngày)")
ok(e == {"m": "vui", "t": "Hôm nay vui", "w": {"lang": "ja", "goc": "テスト", "st": ""}}, "đọc lại đúng mục đã ghi")
ok(os.path.isfile(os.path.join(tmp, "journal", "%04d_%02d.json" % (at.year, at.month))), "sao lưu user_files/journal/<yyyy_mm>.json")
store.update(at, {"m": "", "t": "", "w": None})
ok(at.isoformat() in col.get_config(j.month_key(at.year, at.month)), "xoá hết mục đã biết mà còn khoá lạ → giữ ngày đó")
store.update(at, {"m": "met"})
mv = j.month_view(at.year, at.month, at, c, store.month(at.year, at.month), 30, j.first_review_day(col))
ok(len(mv["days"]) == j.month_days(at.year, at.month) and mv["first_wd"] == D(at.year, at.month, 1).weekday(), "lịch tháng: đủ ngày, đúng thứ của ngày 1")
td = next(x for x in mv["days"] if x["d"] == at.isoformat())
ok(td["n"] == 12 and td["lv"] == 2 and td["mood"] == "met" and td["sp"] == j.SPECIES[td["th"]], "ô hôm nay: 12 lượt = cây non, sticker, loài theo giao diện mùa")
ok(mv["prev"] and mv["next"], "lùi được tới tháng có lượt ôn đầu tiên, tiến được")
mv0 = j.month_view(at.year, at.month, at, c, {}, 30, at)
ok(mv0["prev"] == "" or (at.day <= 1), "không có lượt ôn cũ hơn thì không lùi")
far = j.add_months(at.year, at.month, 12)
ok(j.month_view(far[0], far[1], at, {}, {}, 30, None)["next"] == "", "tiến tối đa 12 tháng")
plain = j.month_view(at.year, at.month, at, c, {}, 30, None, plain=True)
ok(all(x["sp"] == "goc" for x in plain["days"]), "Giao diện mùa Tắt → cây gốc của vườn")
yv = j.year_view(at.year, at, c, store.months([(at.year, k) for k in range(1, 13)]), 30, j.first_review_day(col))
ok(len(yv["months"]) == 12 and yv["sum"]["reviews"] >= 15 and yv["sum"]["mood"][0] == "met", "lịch năm: 12 tháng, tổng lượt, tâm trạng hay gặp")
ok(all(sum(s[1] for s in mo["strip"]) == j.month_days(at.year, mo["m"]) for mo in yv["months"]), "dải màu mỗi tháng phủ đủ số ngày")
col.close()

print("== cuốn nhật ký")
counts = {"2026-10-01": {"n": 40, "new": 2, "fruit": 3}, "2026-10-02": {"n": 5, "new": 0, "fruit": 0}}
ents = {"2026-10-03": {"m": "vui", "t": "Vui"},
        "2026-10-05": {"w": {"lang": "ja", "goc": goc, "st": "done", "sua": sua, "loi": [
            {"goc": "寒いでした", "sua": "寒かったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い (〜かった)", "giai_thich": ""},
            {"goc": "おいしいでした", "sua": "おいしかったです", "loai": "ngữ pháp", "quy_tac": "Tính từ đuôi い (〜かった)", "giai_thich": ""},
            {"goc": "x", "sua": "y", "loai": "tự nhiên hơn", "quy_tac": "と思います", "giai_thich": ""}]}},
        "2026-10-07": {"m": "vui"}, "2026-10-08": {"m": "met"}}
st = j.month_summary(2026, 10, D(2026, 11, 4), counts, ents)
ok(st["days"] == 2 and st["of"] == 31 and st["reviews"] == 45 and st["fruit"] == 3 and st["best"] == "1/10 · 40", "tổng kết tháng")
ok(st["moods"][0] == ("vui", 2) and st["errors"] == [["tính từ đuôi い (〜かった)", 2]], "tâm trạng hay gặp, lỗi hay gặp (gom theo quy tắc, bỏ \"tự nhiên hơn\")")
ok(st["writes"] == 1 and st["sentences"] == 2, "số bài luyện viết · số câu")
rows = j.book_rows(2026, 10, D(2026, 11, 4), counts, ents, 30)
ok([r["d"][-2:] for r in rows] == ["01", "02", "03", "05", "07", "08"], "chỉ ghi ngày có ôn hoặc có viết")
ok(rows[3]["w"] == sua and rows[0]["label"] == "01 T5", "dòng có câu luyện viết đã sửa, nhãn ngày + thứ")
sh = j.shelf(D(2025, 11, 20), D(2026, 11, 4))
ok([b["id"] for b in sh][:2] == ["2025-11", "2025-12"] and sh[-2]["id"] == "2026-11" and sh[-2]["draft"] and sh[-1]["id"] == "2025"
   and sh[-1]["year"], "kệ sách: mỗi tháng một cuốn (tháng này là bản nháp) + cuốn năm cho năm đã hết")

print("== ảnh vườn tự chụp")
import base64  # noqa: E402
import struct  # noqa: E402
import zlib  # noqa: E402


def png(w=4, h=2):
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * w for _ in range(h))
    ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)  # noqa: E731
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")


pdir = os.path.join(tmp, "anh")
url = "data:image/png;base64," + base64.b64encode(png()).decode()
ok(j.photo_due(pdir, D(2026, 11, 4)), "chưa có ảnh → cần chụp")
j.save_photo(pdir, D(2026, 11, 2), url)
ok(not j.photo_due(pdir, D(2026, 11, 4)) and j.photo_due(pdir, D(2026, 11, 9)), "mỗi tuần một tấm")
j.save_photo(pdir, D(2026, 11, 4), url)
ok(j.photos(pdir) == ["2026-11-04"], "giữ 1 tấm / tuần (tấm cũ cùng tuần bị thay)")
ok(j.month_photo(pdir, 2026, 11)[0] == "2026-11-04" and j.month_photo(pdir, 2026, 10) is None, "ảnh bìa theo tháng")
for junk in ("data:image/jpeg;base64,AAAA", "data:image/png;base64,QUJD", "javascript:alert(1)",
             "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"x" * 500_000).decode()):
    try:
        j.decode_png(junk)
        ok(False, "phải chặn: %s" % junk[:30])
    except (j.JournalError, ValueError):
        ok(True, "chặn ảnh lạ / quá lớn: %s…" % junk[:24])

if OLD:
    print("== mã 1.19.1 thật lưu ví / báo / cấu hình trường → khoá nhật ký còn nguyên")
    col = Collection(os.path.join(tmp, "c2.anki2"))
    key = j.month_key(2026, 11)
    col.set_config(key, {"2026-11-04": {"m": "vui", "t": "x", "w": {"lang": "ja", "goc": "テスト", "st": "done", "sua": "テスト"}}})
    before = col.get_config(key)
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stubs"))

    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    old_core = load("old_garden_core", os.path.join(OLD, "garden_core.py"))
    old_paper = load("old_paper_core", os.path.join(OLD, "paper_core.py"))
    old_fields = load("old_fields_core", os.path.join(OLD, "fields_core.py"))
    gs = old_core.GardenState(os.path.join(tmp, "s.json"), col_getter=lambda: col)
    wal = gs.load()
    wal["coins"] = wal.get("coins", 0) + 5
    gs.save(wal)
    ps = old_paper.PaperState(os.path.join(tmp, "p.json"), col_getter=lambda: col)
    ps.save(ps.load())
    fs = old_fields.FieldStore(os.path.join(tmp, "f.json"), col_getter=lambda: col)
    fs.save(fs.load())
    ok(col.get_config(key) == before, "khoá %s không đổi sau khi bản 1.19.1 lưu" % key)
    col.close()

print("KẾT QUẢ:", "OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
