"""Test lõi bản 1.22: giống cây tự vẽ + mã chia sẻ thiết kế (share_core) trên collection Anki thật.

Kiểm tra:
  - làm sạch "myseeds" (kiểu sai, id lạ, quá 12 giống, luật trỏ tới giống không có, tag trùng / quá 12, "next");
  - hình 5 giai đoạn: tối thiểu 3, mã hỏng / sai cỡ / màu lạ, giai đoạn trống;
  - tạo giống 500 xu, sửa hình 50 xu, đổi tên miễn phí, thiếu xu, tối đa 12, xoá giống → bỏ luật + điểm ảnh;
  - luật gieo: giống tự vẽ lưu ở myseeds, giống mua / "Trộn" ở seeds như cũ, đặt một bên thì xoá bên kia, hai bên cùng
    có luật một chỗ thì seeds thắng, giới hạn 12 luật tag tính chung; cây nhận đúng giống (tag → loại note → deck);
  - lưu: tên ở MORE_KEY["myseeds"], điểm ảnh ở PX_KEY["g1"] = "mã0|…|mã4"; render (home_catalog) có myseeds + giá;
  - 1.22.1: sửa món tự làm chỉ đổi tên / hiệu ứng thì miễn phí, vẽ lại hình 50 xu;
  - mã chia sẻ cho món tự làm / vùng tự tạo / giống tự vẽ: xuất → đọc lại đúng, dán có xuống dòng / dấu cách vẫn đọc,
    sửa một ký tự → mã kiểm tra không khớp, bản mới hơn (KB2), không phải mã, mã cụt, "bom nén", tên có thẻ HTML,
    màu / loại / nền lạ (mã tự dựng có mã kiểm tra đúng), làm từ mã trừ xu như tự chế tác;
  - có thư mục bản 1.21.0 (đối số 2): mã 1.21.0 thật lưu ví / đặt luật / chế tác → "myseeds" và PX_KEY["g1"] còn nguyên;
    luật bản cũ đặt sau cho cùng deck thắng luật giống tự vẽ.

Chạy: python test_122.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.21.0]   (cần gói anki: ANKI_PY=…)
"""
import base64
import importlib.util
import os
import sys
import tempfile
import zlib

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
sys.path.insert(0, ADDON)
import garden_core as core  # noqa: E402
from anki.collection import Collection  # noqa: E402

share = core.share
more = core.more
PAL = core.CRAFT_PALETTE
FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def raises(fn, text):
    try:
        fn()
    except (core.HomeError, share.ShareError, more.MoreError) as err:
        return text in str(err)
    return False


tmp = tempfile.mkdtemp()
SPR = core.px_encode("." * 200 + "g" * 8 + "." * 8 + "k" * 40)
SPR2 = core.px_encode("." * 180 + "r" * 20 + "." * 16 + "G" * 40)

print("== làm sạch myseeds")
c = share.clean_myseeds(None)
ok(c == {"items": {}, "next": 1, "rules": {"deck": {}, "kind": {}, "tag": []}}, "không có / sai kiểu → rỗng")
raw = {"items": {"g1": {"name": "<b>Cà</b> chua"}, "x5": {"name": "lạ"}, "g0": {}, "g3": "sai", "g7": {"name": ""}},
       "next": 2, "rules": {"deck": {"123": "g1", "abc": "g1", "456": "g9"}, "kind": {"vocab": "g7", "lạ": "g1", "kanji": "ine"},
                            "tag": [["N5", "g1"], ["n5", "g7"], ["có cách", "g1"], ["x", "g9"], "sai"]}}
c = share.clean_myseeds(raw)
ok(sorted(c["items"]) == ["g1", "g7"] and c["items"]["g1"]["name"] == "bCà/b chua" and c["items"]["g7"]["name"] == "Giống của tớ",
   "giữ g1 / g7, bỏ id lạ, tên bỏ ký tự < > (tên trống → “Giống của tớ”)")
ok(c["next"] == 8, "next ≥ id lớn nhất + 1")
ok(c["rules"]["deck"] == {"123": "g1"} and c["rules"]["kind"] == {"vocab": "g7"}, "luật deck / loại note: bỏ id deck hỏng, giống không có, loại lạ")
ok(c["rules"]["tag"] == [["N5", "g1"], ["cócách", "g1"]], "luật tag: bỏ trùng (không phân biệt hoa thường), bỏ dấu cách, bỏ giống không có")
many = share.clean_myseeds({"items": {f"g{i}": {"name": str(i)} for i in range(1, 20)}})
ok(len(many["items"]) == share.MYSEED_MAX, "tối đa %d giống" % share.MYSEED_MAX)

print("== hình 5 giai đoạn")
ok(share.check_stages(["", SPR, SPR, "", SPR], PAL) == ["", SPR, SPR, "", SPR], "3 giai đoạn đã vẽ → hợp lệ")
ok(raises(lambda: share.check_stages(["", SPR, "", "", SPR], PAL), "Vẽ ít nhất 3"), "2 giai đoạn → “Vẽ ít nhất 3 giai đoạn”")
ok(raises(lambda: share.check_stages(["", SPR, SPR, "256.", SPR], PAL), "Vẽ ít nhất 3") is False and
   share.check_stages(["", SPR, SPR, "256.", SPR], PAL)[3] == "", "giai đoạn toàn ô trống = chưa vẽ")
ok(raises(lambda: share.check_stages(["", SPR, SPR, "255.Z", SPR], PAL), "“Ra hoa” bị lỗi"), "màu lạ → báo đúng giai đoạn")
ok(raises(lambda: share.check_stages(["", SPR, SPR, "100k", SPR], PAL), "bị lỗi"), "sai cỡ → lỗi")
ok(raises(lambda: share.check_stages([SPR] * 4, PAL), "Thiếu hình"), "thiếu giai đoạn → lỗi")

col = Collection(os.path.join(tmp, "c.anki2"))
st = core.GardenState(os.path.join(tmp, "s.json"), col_getter=lambda: col)
w = st.load()
w["coins"] = 20000
st.save(w)

print("== tạo / sửa / xoá giống tự vẽ")
d = st.myseed_save({"name": "Cà chua", "st": ["", SPR, SPR, "", SPR]})
ok(d["myseed_id"] == "g1" and d["coins"] == 19500, "tạo giống g1, trừ 500 xu")
stored = col.get_config(more.MORE_KEY)
px = col.get_config(core.PX_KEY)
ok(stored["myseeds"]["items"] == {"g1": {"name": "Cà chua"}}, "tên lưu ở MORE_KEY[\"myseeds\"]")
ok(px.get("g1") == "|".join(["", SPR, SPR, "", SPR]), "điểm ảnh ở PX_KEY[\"g1\"] = mã0|…|mã4")
ok(os.path.exists(os.path.join(tmp, "craft_px.json")) and os.path.exists(os.path.join(tmp, "more.json")), "có file sao lưu")
d = st.myseed_save({"id": "g1", "name": "Cà chua bi", "st": ["", SPR, SPR, "", SPR]})
ok(d["coins"] == 19500 and d["more"]["myseeds"]["items"]["g1"]["name"] == "Cà chua bi", "đổi tên, giữ hình → miễn phí")
d = st.myseed_save({"id": "g1", "name": "Cà chua bi", "st": [SPR2, SPR, SPR, "", SPR]})
ok(d["coins"] == 19450, "đổi hình → 50 xu")
ok(raises(lambda: st.myseed_save({"id": "g9", "name": "x", "st": ["", SPR, SPR, "", SPR]}), "Không tìm thấy"), "sửa giống không có → lỗi")
w = st.load(); w["coins"] = 100; st.save(w)
ok(raises(lambda: st.myseed_save({"name": "x", "st": ["", SPR, SPR, "", SPR]}), "Chưa đủ xu"), "thiếu xu → không tạo")
ok(sorted(st.load()["more"]["myseeds"]["items"]) == ["g1"] and "g2" not in st.load_px(), "thiếu xu thì không lưu gì")
w = st.load(); w["coins"] = 20000; st.save(w)
view = core.home_catalog(st.load(), st.load_px())
ok(view["myseeds"] == [{"id": "g1", "name": "Cà chua bi", "st": [SPR2, SPR, SPR, "", SPR], "drawn": 4}], "render: catalog.myseeds có hình + số giai đoạn đã vẽ")
ok(view["myseed"]["price"] == 500 and view["myseed"]["edit"] == 50 and view["myseed"]["min"] == 3 and len(view["myseed"]["stages"]) == 5,
   "render: giá 500 / sửa 50 / tối thiểu 3 / tên 5 giai đoạn")

print("== luật gieo")
d = st.seed_buy("ine")
d = st.seed_rule("deck", "111", "g1")
m = d["more"]
ok(m["seeds"]["deck"] == {} and m["myseeds"]["rules"]["deck"] == {"111": "g1"}, "giống tự vẽ → luật ở myseeds, không đụng seeds")
d = st.seed_rule("deck", "111", "ine")
m = d["more"]
ok(m["seeds"]["deck"] == {"111": "ine"} and m["myseeds"]["rules"]["deck"] == {}, "đổi sang giống mua → xoá luật bên myseeds")
d = st.seed_rule("deck", "111", "g1")
ok(d["more"]["seeds"]["deck"] == {} and d["more"]["myseeds"]["rules"]["deck"] == {"111": "g1"}, "đổi lại giống tự vẽ → xoá luật bên seeds")
d = st.seed_rule("kind", "kanji", "g1")
d = st.seed_rule("tag", "N5", "g1")
d = st.seed_rule("tag", "bai29", "ine")
d = st.seed_rule("deck", "222", "mix")
m = d["more"]
comb = share.combined(m["seeds"], m["myseeds"])
ok(comb["owned"] == ["ine", "g1"] and comb["deck"] == {"111": "g1", "222": "mix"} and comb["kind"] == {"kanji": "g1"}
   and comb["tag"] == [["bai29", "ine"], ["N5", "g1"]], "gộp luật hai bên (tag của seeds trước)")
both = dict(m["seeds"], deck={"111": "ine"})
ok(share.combined(both, m["myseeds"])["deck"]["111"] == "ine", "hai bên cùng có luật một deck → seeds thắng (luật bản cũ đặt sau)")
plants = [{"nid": 1, "kind": "vocab"}, {"nid": 2, "kind": "kanji"}, {"nid": 3, "kind": "vocab"}, {"nid": 4, "kind": "vocab"},
          {"nid": 5, "kind": "vocab"}]
meta = [{"tags": [], "decks": [111]}, {"tags": [], "decks": [333]}, {"tags": ["N5::bai1"], "decks": [333]},
        {"tags": ["bai29"], "decks": [111]}, {"tags": [], "decks": [333]}]
more.apply_seeds(plants, meta, comb)
ok([p.get("v") for p in plants] == ["g1", "g1", "g1", "ine", None], "cây nhận giống: deck → g1, loại Chữ Hán → g1, tag N5::… → g1, tag bai29 → Lúa, còn lại cây gốc")
mixed = [{"nid": n, "kind": "vocab"} for n in range(1, 40)]
more.apply_seeds(mixed, [{"tags": [], "decks": [222]}] * 39, comb)
ok({p.get("v") for p in mixed} == {None, "ine", "g1"}, "“Trộn” chọn cả giống tự vẽ")
for i in range(10):
    st.seed_rule("tag", "t%d" % i, "g1" if i % 2 else "ine")
ok(raises(lambda: st.seed_rule("tag", "thêm", "g1"), "Tối đa 12") and raises(lambda: st.seed_rule("tag", "thêm2", "ine"), "Tối đa 12"),
   "12 luật tag tính chung hai bên")
ok(raises(lambda: st.seed_rule("deck", "111", "g8"), "Không tìm thấy"), "giống tự vẽ không có → lỗi")

print("== xoá giống")
d = st.myseed_save({"name": "Hoa", "st": ["", SPR, SPR, SPR, ""]})
d = st.seed_rule("deck", "444", "g2")
d = st.myseed_delete("g1")
m = d["more"]
ok(sorted(m["myseeds"]["items"]) == ["g2"] and m["myseeds"]["rules"]["deck"] == {"444": "g2"} and m["myseeds"]["rules"]["kind"] == {}
   and all(r[1] != "g1" for r in m["myseeds"]["rules"]["tag"]), "xoá g1 → bỏ mọi luật trỏ tới g1, giữ luật của g2")
ok("g1" not in st.load_px() and "g2" in st.load_px(), "điểm ảnh của g1 bị xoá")
ok(st.load()["more"]["myseeds"]["next"] == 3, "id không dùng lại (next = 3)")
for i in range(11):
    st.myseed_save({"name": "s%d" % i, "st": ["", SPR, SPR, SPR, ""]}) if len(st.load()["more"]["myseeds"]["items"]) < 12 else None
ok(len(st.load()["more"]["myseeds"]["items"]) == 12 and raises(lambda: st.myseed_save({"name": "x", "st": ["", SPR, SPR, SPR, ""]}), "Đã có 12"),
   "đủ 12 giống → không tạo thêm")

print("== mã chia sẻ")
w = st.load(); w["coins"] = 50000; st.save(w)
d = st.craft_save({"name": "Táo <đỏ>", "size": 24, "kind": "wall", "fx": "glow", "px": core.px_encode("." * 500 + "r" * 76)})
cid = d["craft_id"]
# 1.22.1: sửa món chỉ đổi tên / hiệu ứng thì miễn phí (như vùng / giống tự vẽ), vẽ lại hình mất 50 xu
c0 = st.load()["coins"]
st.craft_save({"id": cid, "name": "Táo đỏ to", "size": 24, "kind": "wall", "fx": "sparkle", "px": core.px_encode("." * 500 + "r" * 76)})
m = st.load()["craft"]["items"][cid]
ok(st.load()["coins"] == c0 and m["name"] == "Táo đỏ to" and m["fx"] == "sparkle", "sửa món: chỉ đổi tên + hiệu ứng → miễn phí")
st.craft_save({"id": cid, "name": "Táo <đỏ>", "size": 24, "kind": "wall", "fx": "glow", "px": core.px_encode("." * 499 + "R" + "r" * 76)})
ok(st.load()["coins"] == c0 - core.CRAFT_EDIT_PRICE, "sửa món: vẽ lại hình → trừ %d xu" % core.CRAFT_EDIT_PRICE)
st.craft_save({"id": cid, "name": "Táo <đỏ>", "size": 24, "kind": "wall", "fx": "glow", "px": core.px_encode("." * 500 + "r" * 76)})
code, name = st.share_code(cid)
ok(code.startswith("KB1:m:24:") and name == "Táo đỏ" and code.count(":") == 5, "món tự làm → KB1:m:24:…")
p = st.share_peek(code)
ok(p == {"t": "m", "name": "Táo đỏ", "size": 24, "kind": "wall", "fx": "glow", "px": core.px_encode("." * 500 + "r" * 76), "price": 350},
   "đọc lại đúng tên / cỡ / loại / hiệu ứng / hình, giá 350")
ok(st.share_peek("\n  " + code[:20] + "\n" + code[20:50] + " " + code[50:] + "  \n")["name"] == "Táo đỏ", "mã bị xuống dòng / dấu cách vẫn đọc được")
bad = code[:-1] + ("1" if code[-1] != "1" else "2")
ok(raises(lambda: st.share_peek(bad), "mã kiểm tra không khớp"), "sửa một ký tự → “mã kiểm tra không khớp”")
mid = code[:15] + ("A" if code[15] != "A" else "B") + code[16:]
ok(raises(lambda: st.share_peek(mid), "mã kiểm tra không khớp"), "sửa ở giữa mã → cũng không khớp")
ok(raises(lambda: st.share_peek("KB2:m:16:a:b:c"), "mới hơn"), "KB2 → “bản ことば畑 mới hơn”")
ok(raises(lambda: st.share_peek("chào bạn"), "không phải mã thiết kế"), "chữ thường → “không phải mã thiết kế”")
ok(raises(lambda: st.share_peek(code[:30]), "thiếu một đoạn"), "mã cụt → “thiếu một đoạn”")
ok(raises(lambda: st.share_peek(""), "Dán mã"), "ô trống → nhắc dán mã")
ok(raises(lambda: st.share_peek("KB1:" + "A" * 300000), "dài quá"), "mã quá dài → từ chối trước khi đọc")


def forge(kind, size, name, data):
    head = ":".join(["KB1", kind, size, base64.urlsafe_b64encode(name.encode()).decode().rstrip("="),
                     base64.urlsafe_b64encode(zlib.compress(data.encode() if isinstance(data, str) else data)).decode().rstrip("=")])
    return head + ":" + share._crc(head)


ok(raises(lambda: st.share_peek(forge("m", "16", "x", b"a" * 5_000_000)), "quá nhiều dữ liệu"), "“bom nén” (5 MB khi giải nén) → từ chối")
ok(raises(lambda: st.share_peek(forge("m", "16", "x", "ground,none,255.Z")), "bị hỏng"), "màu lạ trong hình → hỏng")
ok(raises(lambda: st.share_peek(forge("m", "20", "x", "ground,none," + SPR)), "không hợp lệ"), "cỡ lạ → không hợp lệ")
ok(raises(lambda: st.share_peek(forge("m", "16", "x", "roof,none," + SPR)), "loại đặt lạ"), "loại đặt lạ → không hợp lệ")
ok(st.share_peek(forge("m", "16", "x", "ground,fireworks," + SPR))["fx"] == "none", "hiệu ứng lạ → “Không”")
ok(st.share_peek(forge("m", "16", "<script>alert(1)</script>" + "a" * 50, "ground,none," + SPR))["name"] == ("scriptalert(1)/script" + "a" * 50)[:24],
   "tên có thẻ HTML → bỏ ký tự < > và cắt 24 ký tự")
ok(raises(lambda: st.share_peek(forge("z", "64x76", "v", "flower,ff0000,7ed98a,,")), "nền / màu lạ"), "vùng có màu đất ngoài bảng → không hợp lệ")
ok(raises(lambda: st.share_peek(forge("z", "64x76", "v", "flower,5ed35e,7ed98a,,")), "chưa vẽ gì"), "vùng chưa vẽ gì → từ chối")
ok(raises(lambda: st.share_peek(forge("g", "16", "g", ",".join(["", SPR, "", "", SPR]))), "bị hỏng"), "giống mới vẽ 2 giai đoạn → từ chối")
ok(raises(lambda: st.share_peek(forge("q", "16", "x", "a")), "mới hơn"), "loại thiết kế lạ → “bản mới hơn”")
c0 = st.load()["coins"]
d = st.share_make(code)
ok(d["share_t"] == "m" and d["coins"] == c0 - 350 and d["craft"]["items"][d["craft_id"]]["kind"] == "wall"
   and d["home"]["owned"][d["craft_id"]] == 1, "làm món từ mã: trừ 350 xu, món mới vào kho")
d = st.zone_save({"name": "Đồi <hồng>", "bg": "flower", "ground": "#ffc4d6", "hills": "#ff7fa0",
                  "px": core.px_encode("." * (64 * 70) + "p" * (64 * 6)), "env": core.px_encode("." * (256 * 70) + "w" * (256 * 6))})
zcode, zname = st.share_code(d["zone_id"])
zp = st.share_peek(zcode)
ok(zcode.startswith("KB1:z:64x76:") and zp["t"] == "z" and zp["name"] == "Đồi hồng" and zp["bg"] == "flower" and zp["ground"] == "#ffc4d6"
   and zp["lm"] and zp["env"] and zp["price"] == 5000, "vùng tự tạo → mã → đọc lại nền / màu / công trình / cảnh nền, giá 5000")
n0 = len(st.load()["more"]["zones"])
d = st.share_make(zcode)
z = next(x for x in d["more"]["zones"] if x["id"] == d["zone_id"])
ok(len(d["more"]["zones"]) == n0 + 1 and z["env"] == zp["env"] and z["lm"] == zp["lm"] and d["zone_id"] in d["home"]["uzones"],
   "tạo vùng từ mã: có cả công trình + cảnh nền, đặt đồ được")
ok(raises(lambda: st.share_code("u98"), "Không tìm thấy"), "vùng không có → lỗi")
gid = sorted(st.load()["more"]["myseeds"]["items"], key=lambda g: int(g[1:]))[0]
gcode, _ = st.share_code(gid)
ok(gcode.startswith("KB1:g:16:") and st.share_peek(gcode)["st"] == share.stages_of(st.load_px(), gid, PAL), "giống tự vẽ → mã → đọc lại 5 giai đoạn")
ok(raises(lambda: st.share_make(gcode), "Đã có 12"), "đủ 12 giống → làm từ mã cũng bị chặn (không trừ xu)")
ok(raises(lambda: st.share_code("c999"), "Không tìm thấy"), "id lạ → lỗi")
col.close()

if OLD:
    print("== mã 1.21.0 thật lưu ví / đặt luật / chế tác → giống tự vẽ còn nguyên")
    tmp2 = tempfile.mkdtemp()        # thư mục riêng: không lấy file sao lưu của vòng trên
    col = Collection(os.path.join(tmp2, "c2.anki2"))
    new = core.GardenState(os.path.join(tmp2, "n2.json"), col_getter=lambda: col)
    w = new.load(); w["coins"] = 9000; new.save(w)
    new.seed_buy("ine")
    new.myseed_save({"name": "Cà chua", "st": ["", SPR, SPR, "", SPR]})
    new.seed_rule("deck", "777", "g1")
    new.seed_rule("tag", "N5", "g1")
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stubs"))

    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    old_core = load("old121_garden_core", os.path.join(OLD, "garden_core.py"))
    gs = old_core.GardenState(os.path.join(tmp2, "o2.json"), col_getter=lambda: col)
    wal = gs.load()
    ok("myseeds" not in wal["more"], "bản 1.21.0 không biết khoá myseeds (không đọc)")
    wal["coins"] += 5
    gs.save(wal)
    gs.seed_rule("deck", "888", "ine")
    gs.craft_save({"name": "Ghế", "size": 16, "kind": "ground", "px": SPR})
    stored = col.get_config(more.MORE_KEY)
    ok(stored.get("myseeds", {}).get("items") == {"g1": {"name": "Cà chua"}} and stored["myseeds"]["rules"]["deck"] == {"777": "g1"},
       "sau khi bản 1.21.0 lưu ví / đặt luật / chế tác: myseeds còn nguyên (cả luật)")
    ok(col.get_config(core.PX_KEY).get("g1") == "|".join(["", SPR, SPR, "", SPR]), "PX_KEY[\"g1\"] còn nguyên")
    gs.seed_rule("deck", "777", "ine")          # máy còn bản cũ đặt luật cho cùng deck sau đó
    m = new.load()["more"]
    comb = share.combined(m["seeds"], m["myseeds"])
    ok(comb["deck"]["777"] == "ine" and comb["deck"]["888"] == "ine" and comb["tag"] == [["N5", "g1"]],
       "luật bản cũ đặt sau cho cùng deck thắng; luật tag của giống tự vẽ vẫn còn")
    ok(new.load()["coins"] == wal["coins"] - 200, "ví đọc lại đúng sau khi bản cũ chế tác (−200 xu)")
    col.close()

print("KẾT QUẢ:", "OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
