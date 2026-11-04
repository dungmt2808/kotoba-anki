"""Test lõi bản 1.21: khách ghé vườn + Album khách (guest_core).

Kiểm tra:
  - ai được ghé cảnh nào: theo loại cảnh (sân / vùng / vùng tự tạo / trong nhà), món bắt buộc (`need`) trừ cảnh `free`,
    món thích (×3), tháng (khách theo mùa, khách hiếm);
  - tần suất theo số cây Ra quả (0,3 → 0,85), nhãn "thỉnh thoảng / khá thường / rất thường";
  - làm sạch album (kiểu sai, ngày hỏng, cảnh lạ, khách lạ), ghi lần gặp: lần đầu, mỗi khách một lần mỗi ngày, đếm ngày
    đã ghé, giữ khoá lạ của bản sau (cả mức khoá lẫn mức từng khách), sao lưu khi không có collection;
  - dữ liệu gửi JS (`view`), khách gặp lần đầu trong khoảng ngày (Lịch hoa / cuốn nhật ký);
  - ví thật của GardenState (đồ đặt ở sân, vùng, phòng) → cảnh có khách;
  - hình trong web/guests.js khớp tests/tools/art/guests.json, mỗi khách có hình (trừ đom đóm vẽ bằng chấm sáng);
  - có thư mục bản 1.20.0 (đối số 2): mã 1.20.0 thật lưu ví / báo / cấu hình / nhật ký → khoá album còn nguyên.

Chạy: python test_121.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.20.0]   (cần gói anki: ANKI_PY=…)
"""
import datetime
import importlib.util
import json
import os
import re
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
sys.path.insert(0, ADDON)
import garden_core as core  # noqa: E402
import guest_core as g  # noqa: E402
from anki.collection import Collection  # noqa: E402

FAIL = []
D = datetime.date


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


NOV, JUL, OCT, JAN = D(2026, 11, 4), D(2026, 7, 10), D(2026, 10, 20), D(2027, 1, 15)
home = {"yard": [{"id": "bench", "x": 5, "y": 2}, {"id": "pond", "x": 8, "y": 1}, {"id": "flowers", "x": 11, "y": 2}],
        "beach": [], "shrine": [], "bamboo": [], "u1": [{"id": "tanuki", "x": 6, "y": 0}],
        "room": [{"id": "furin", "x": 2, "y": 0}], "station": [{"id": "rice", "x": 6, "y": 1}]}

print("== ai được ghé cảnh nào")
ok(len(g.GUESTS) == 16 and g.ORDER[0] == "suzume", "16 khách, album theo thứ tự định sẵn")
ok(all(set(v) >= {"name", "ja", "kind", "where", "tod", "wx", "w", "hint"} for v in g.GUESTS.values()), "khách nào cũng đủ trường")
ok(all(v["wx"] in g.WX and set(v["tod"]) <= set(g.TODS) for v in g.GUESTS.values()), "thời tiết / buổi hợp lệ")
ok(all(not v["hint"].startswith("Hiếm") for v in g.GUESTS.values()), "gợi ý không lặp chữ \"Hiếm\" (đã có nhãn)")
ok(g.weight("suzume", "yard", home, NOV) == 30, "chim sẻ ở sân có bụi hoa: 10 × 3 = 30")
ok(g.weight("suzume", "beach", home, NOV) == 10, "chim sẻ ở Bãi biển không có món thích: 10")
ok(g.weight("suzume", "room", home, NOV) == 0, "chim sẻ không vào trong nhà")
ok(g.weight("neko", "yard", home, NOV) == 18, "mèo hoang thích ghế gỗ (×3)")
ok(g.weight("sagi", "yard", home, NOV) == 7 and g.weight("sagi", "shrine", home, NOV) == 0,
   "cò cần ao / ruộng: sân có ao → ghé, Đền không có → không")
ok(g.weight("sagi", "beach", home, NOV) == 7, "cò ở Bãi biển không cần ao (cảnh free)")
ok(g.weight("sagi", "station", home, NOV) == 7, "ruộng lúa nhỏ ở Ga cũng gọi được cò")
ok(g.weight("hotaru", "yard", home, NOV) == 0 and g.weight("hotaru", "yard", home, JUL) == 8, "đom đóm chỉ tháng 5–8")
ok(g.weight("hotaru", "bamboo", home, JUL) == 8 and g.weight("hotaru", "beach", home, JUL) == 0,
   "đom đóm ở Rừng tre không cần đèn / ao, Bãi biển trống thì không")
ok(g.weight("cho", "yard", home, NOV) == 0 and g.weight("cho", "yard", home, JUL) == 21, "bướm tháng 3–9, thích hoa")
ok(g.weight("kaeru", "yard", home, JUL) == 27 and g.weight("kaeru", "yard", home, NOV) == 0, "ếch tháng 4–10, thích ao")
ok(g.weight("kitsune", "shrine", home, NOV) == 5 and g.weight("kitsune", "yard", home, NOV) == 0,
   "cáo ở Đền; sân không có torii / tượng cáo thì không")
ok(g.weight("kitsune", "yard", {"yard": [{"id": "torii", "x": 6, "y": 1}]}, NOV) == 5, "sân có cổng torii → cáo ghé")
ok(g.weight("shika", "shrine", home, NOV) == 7 and g.weight("shika", "yard", home, NOV) == 0, "hươu ở Đền trên núi")
ok(g.weight("kamome", "beach", home, NOV) == 9 and g.weight("kamome", "yard", home, NOV) == 0, "hải âu chỉ ở Bãi biển")
ok(g.weight("tanuki", "u1", home, NOV) == 15 and g.weight("tanuki", "beach", home, NOV) == 0,
   "tanuki ở vùng tự tạo có tượng tanuki (×3), không ra Bãi biển")
ok(g.weight("mejiro", "room", home, NOV) == 8 and g.weight("mejiro", "room", {"room": []}, NOV) == 0,
   "vành khuyên cần chuông gió fūrin trong nhà")
ok(g.weight("komori", "yard", home, OCT) == 6 and g.weight("komori", "yard", home, NOV) == 0, "dơi hiếm: chỉ tháng 10")
ok(g.weight("tsuru", "yard", home, JAN) == 9 and g.weight("tsuru", "yard", home, NOV) == 0, "sếu hiếm: tháng 12–2, thích ao")
ok(g.weight("okojo", "yard", home, NOV) == 6 and g.weight("okojo", "yard", home, JUL) == 0, "chồn tuyết hiếm: tháng 11–3")
ok(g.weight("nope", "yard", home, NOV) == 0 and g.weight("suzume", "../x", home, NOV) == 0, "khách / cảnh lạ → 0")
ok(g.scenes_of(home, ["beach", "shrine"], ["u1", "bad"], True) == ["yard", "beach", "shrine", "u1", "room"],
   "cảnh có khách: sân, vùng đã mở (đúng thứ tự), vùng tự tạo, trong nhà (đã mở phòng)")
ok(g.scenes_of(home, [], [], False) == ["yard"], "chưa mở vùng / phòng → chỉ sân")

print("== tần suất theo số cây Ra quả")
ok(g.rate(0) == 0.3 and g.rate(150) == 0.85 and g.rate(9999) == 0.85 and g.rate(-5) == 0.3, "0 cây 0,3 → 150 cây 0,85 (chặn hai đầu)")
ok(g.rate(75) == 0.575, "75 cây: 0,575")
ok([g.rate_label(n) for n in (0, 60, 140)] == ["thỉnh thoảng", "khá thường", "rất thường"], "nhãn tần suất")

print("== làm sạch album")
junk = {"met": {"suzume": {"d": "2026-11-04", "s": "yard", "n": 3, "l": "2026-11-06", "zz": 1}, "neko": {"d": "hỏng"},
                "sagi": {"d": "2026-02-30"}, "lol": {"d": "2026-11-04"}, "cho": "x", "tanuki": {"d": "2026-11-01", "s": "../x", "n": "abc"},
                "shika": {"d": "2026-11-05", "l": "2026-11-01", "n": -4}}, "future_key": [1]}
a = g.clean_album(junk)
ok(sorted(a) == ["shika", "suzume", "tanuki"], "bỏ ngày hỏng / khách lạ / kiểu sai: %s" % sorted(a))
ok(a["suzume"] == {"d": "2026-11-04", "s": "yard", "l": "2026-11-06", "n": 3}, "mục hợp lệ giữ nguyên (bỏ khoá lạ khi đọc)")
ok(a["tanuki"]["s"] == "yard" and a["tanuki"]["n"] == 1, "cảnh lạ → sân, số ngày hỏng → 1")
ok(a["shika"]["l"] == "2026-11-05" and a["shika"]["n"] == 1, "ngày ghé cuối trước ngày gặp đầu → bằng ngày gặp đầu; n ≥ 1")
ok(g.clean_album("x") == {} and g.clean_album({"met": []}) == {}, "dữ liệu sai kiểu → album trống")

print("== ghi lần gặp (collection Anki thật)")
tmp = tempfile.mkdtemp()
col = Collection(os.path.join(tmp, "c.anki2"))
col.set_config(g.GUEST_KEY, {"met": {"neko": {"d": "2026-11-01", "s": "yard", "n": 1, "l": "2026-11-01", "pose": "lie"}},
                             "v2": {"x": 1}})
st = g.GuestStore(os.path.join(tmp, "guests.json"), col_getter=lambda: col)
al, new, wrote = st.met("suzume", "yard", NOV)
ok(new and wrote and al["suzume"] == {"d": "2026-11-04", "s": "yard", "n": 1, "l": "2026-11-04"}, "gặp lần đầu: ngày + cảnh")
al, new, wrote = st.met("suzume", "beach", NOV)
ok(not new and not wrote and al["suzume"]["n"] == 1, "cùng ngày gặp lại: không ghi thêm")
al, new, wrote = st.met("suzume", "beach", D(2026, 11, 6))
ok(not new and wrote and al["suzume"]["n"] == 2 and al["suzume"]["l"] == "2026-11-06" and al["suzume"]["s"] == "yard",
   "hôm khác: +1 ngày ghé, giữ cảnh gặp lần đầu")
al, new, wrote = st.met("neko", "beach", NOV)
raw = col.get_config(g.GUEST_KEY)
ok(raw.get("v2") == {"x": 1} and raw["met"]["neko"].get("pose") == "lie" and raw["met"]["neko"]["n"] == 2,
   "giữ khoá lạ của bản sau (mức khoá + mức từng khách)")
ok(json.load(open(os.path.join(tmp, "guests.json")))["met"]["suzume"]["n"] == 2, "sao lưu user_files/guests.json")
st2 = g.GuestStore(os.path.join(tmp, "guests.json"), col_getter=lambda: None)
ok(st2.album()["suzume"]["n"] == 2, "không có collection: đọc bản sao lưu")

print("== dữ liệu gửi JS, khách mới theo ngày")
v = g.view(st.album(), home, ["yard", "beach", "room"], NOV, 42)
ok(v["total"] == 16 and v["met"] == 2 and v["fruit"] == 42 and v["rate_label"] == "khá thường" and v["today"] == "2026-11-04",
   "tổng / đã gặp / cây Ra quả / nhãn tần suất / hôm nay")
ok(set(v["cand"]) == {"yard", "beach", "room"} and ["mejiro", 8] in v["cand"]["room"], "khách theo từng cảnh (có cả phòng)")
ok(all(w > 0 for lst in v["cand"].values() for _, w in lst), "không gửi khách trọng số 0")
ok(not any(x[0] == "cho" for x in v["cand"]["yard"]), "khách ngoài mùa không có trong danh sách hôm nay")
e = {x["id"]: x for x in v["list"]}
ok(e["suzume"]["met"] and e["suzume"]["d"] == "2026-11-04" and e["suzume"]["n"] == 2 and not e["cho"]["met"] and
   e["cho"]["season"] is False and e["okojo"]["rare"] is True, "danh sách album: đã gặp, ngày, số ngày, ngoài mùa, hiếm")
ok(set(v["defs"]["sagi"]["spot"]) >= {"pond", "rice"} and v["defs"]["hotaru"]["kind"] == "swarm", "defs: chỗ đứng (món thích + món cần), kiểu")
nb = g.new_between(st.album(), D(2026, 11, 1), D(2026, 11, 30))
ok([x["id"] for x in nb] == ["neko", "suzume"] and nb[0]["name"] == "Mèo hoang", "khách mới trong tháng theo ngày gặp")
ok(g.new_between(st.album(), D(2026, 11, 4), D(2026, 11, 4)) == [{"id": "suzume", "name": "Chim sẻ", "d": "2026-11-04"}],
   "khách mới của một ngày (khung ngày Lịch hoa)")

print("== ví thật của GardenState → cảnh có khách")
gs = core.GardenState(os.path.join(tmp, "s.json"), col_getter=lambda: col)
w = gs.load()
w["coins"] = 50000
w["home"]["house"] = 7
w["home"]["zones"] = ["beach", "shrine"]
w["home"]["owned"].update({"pond": 1, "torii": 1, "furin": 1})
gs.save(w)
gs.place("yard", "pond", 8, 1)
gs.place("shrine", "torii", 6, 1)
gs.place("room", "furin", 2, 0)
w = gs.load()
hm = w["home"]
scenes = g.scenes_of(hm, hm["zones"], [], hm["house"] >= core.ROOM_UNLOCK_LEVEL)
v = g.view({}, hm, scenes, NOV, 0)
ok(scenes == ["yard", "beach", "shrine", "room"], "ví: sân, Bãi biển, Đền, trong nhà")
ok(any(x[0] == "sagi" for x in v["cand"]["yard"]) and any(x[0] == "mejiro" for x in v["cand"]["room"]),
   "ao ở sân gọi cò, chuông gió trong nhà gọi vành khuyên")
ok(dict(v["cand"]["shrine"]).get("kitsune") == 5 and dict(v["cand"]["shrine"]).get("fukuro") == 12,
   "Đền: cáo; cổng torii làm cú ghé thường hơn (×3)")
col.close()

print("== hình trong web/guests.js")
src = open(os.path.join(ADDON, "web", "guests.js"), encoding="utf-8").read()
m = re.search(r"const SPR = (\{.*?\n  \});", src, re.S)
spr = json.loads(m.group(1)) if m else {}
art = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "art", "guests.json")
ok(spr and spr == json.load(open(art, encoding="utf-8")), "SPR khớp tests/tools/art/guests.json")
ok(set(spr) | {"hotaru"} == set(g.GUESTS), "khách nào cũng có hình (đom đóm vẽ bằng chấm sáng)")
ok(all(len({len(r) for r in rows}) == 1 for f in spr.values() for rows in f.values()), "mỗi khung: các hàng dài bằng nhau")
pal = set(re.search(r"const PAL = (\{.*?\});", src, re.S).group(1).replace('"', " ").split()) | {"."}
ok(all(ch in pal or ch == "." for f in spr.values() for rows in f.values() for r in rows for ch in r),
   "mọi điểm ảnh dùng màu có trong bảng màu")
ok(all(len(f[next(iter(f))]) <= 21 and len(f[next(iter(f))][0]) <= 18 for f in spr.values()), "hình không to quá một ô rưỡi")

if OLD:
    print("== mã 1.20.0 thật lưu ví / báo / cấu hình trường / nhật ký → khoá album còn nguyên")
    col = Collection(os.path.join(tmp, "c2.anki2"))
    col.set_config(g.GUEST_KEY, {"met": {"sagi": {"d": "2026-11-04", "s": "yard", "n": 2, "l": "2026-11-05"}}})
    before = col.get_config(g.GUEST_KEY)
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stubs"))

    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    old_core = load("old_garden_core", os.path.join(OLD, "garden_core.py"))
    old_paper = load("old_paper_core", os.path.join(OLD, "paper_core.py"))
    old_fields = load("old_fields_core", os.path.join(OLD, "fields_core.py"))
    old_journal = load("old_journal_core", os.path.join(OLD, "journal_core.py"))
    gs = old_core.GardenState(os.path.join(tmp, "s2.json"), col_getter=lambda: col)
    wal = gs.load()
    wal["coins"] = wal.get("coins", 0) + 5
    gs.save(wal)
    ps = old_paper.PaperState(os.path.join(tmp, "p.json"), col_getter=lambda: col)
    ps.save(ps.load())
    fs = old_fields.FieldStore(os.path.join(tmp, "f.json"), col_getter=lambda: col)
    fs.save(fs.load())
    js = old_journal.JournalStore(os.path.join(tmp, "j"), col_getter=lambda: col)
    js.update(NOV, {"m": "vui", "t": "x"})
    ok(col.get_config(g.GUEST_KEY) == before, "khoá %s không đổi sau khi bản 1.20.0 lưu" % g.GUEST_KEY)
    col.close()

print("KẾT QUẢ:", "OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
