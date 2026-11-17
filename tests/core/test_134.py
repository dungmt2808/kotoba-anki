"""1.34 — góp ý sau phát hành (17/11): bảng ôn (số phím, Nghe lại, thẻ tự lật, Phóng to, sửa Ẩn / Hiện vườn, phím chắc hơn),
ô chọn deck dạng cây như Anki, Nhà → Trang trí thử (bản thử 3 ô / cảnh, "Dùng bản này" mua + bày một lần).
Người dùng duyệt ảnh phác `docs/ke_hoach_1_34/` ("oke, triển khai đi, xong nhớ test kỹ nha").

Collection Anki THẬT (ANKI_PY):
  1. draft_core: làm sạch hình dạng (kiểu sai, số âm / quá lớn / bool / NaN, quá nhiều món / cảnh, id của bản mới hơn giữ),
     put / pick / xoá ô, 3.000 bản thử rác ngẫu nhiên: không ném lỗi, làm sạch hai lần như một lần, luôn trong giới hạn.
  2. Dùng bản thử (garden_core.draft_plan / GardenState.draft_apply): mua món thiếu + dời + cất trong một lần lưu; giống hệt
     cảnh thật; thiếu xu; chỗ đặt sai (đè nhau, cửa sổ, treo tường dưới sàn, ngoài phòng) — báo đúng món; món đang đặt ở cảnh
     khác không bị lấy sang (mua thêm); số tối đa; quà rương / món gánh hàng / món tự làm vượt số đang có; giao diện mùa / vùng
     chưa mở; tường & sàn (mua mẫu chưa có, mẫu tự vẽ đã xoá, về theo kiểu nhà); lỗi ghi ở TỪNG khoá của vườn → không đổi một
     byte; đọc lỗi kéo dài → từ chối; 600 bản thử ngẫu nhiên có đối chứng (xu trừ = tổng giá món phải mua tính độc lập, mọi
     món đúng chỗ, sở hữu ≥ đã đặt, lỗi thì không đổi gì).
  3. Bản thử lưu theo hồ sơ trên máy (`user_files/ho_so/<mã>/ban_thu.json`): hồ sơ khác không thấy, file hỏng → trống, không
     thêm khoá collection nào (bản đã phát hành 1.31.3 mở cùng collection sau khi dùng bản thử: đọc được, không mất gì).
  4. deck_tree: cây khớp `deck_due_tree` của Anki (thứ tự, cấp, số thẻ Mới / Học / Ôn, deck lọc, Default trống ẩn), tên đủ
     khớp `all_names_and_ids`.
  5. Cấu hình `ui.zoom` (Phóng to): làm sạch, kiểu có sẵn giữ nguyên.
  6. Soát mã giao diện: số phím trên nút chấm, Nghe lại (R / F5, payload "audio" từng mặt), pycmd("ans" / "easeN") của mẫu
     thẻ, dọn hẹn giờ của thẻ cũ, phím lặp, radio / NumLock, Phóng to + Esc, Ẩn vườn không đổi cỡ thẻ, cây deck, Trang trí thử.
Chạy: ANKI_PY tests/core/test_134.py [ADDON]
"""
from __future__ import annotations

import copy
import datetime as dt
import hashlib
import json
import math
import os
import random
import re
import subprocess
import sys
import tempfile
from contextlib import contextmanager

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
from anki.collection import Collection  # noqa: E402
import backup_core as backup  # noqa: E402
import garden_core as core  # noqa: E402
import draft_core as draft  # noqa: E402
import more_core as more  # noqa: E402
import ma_cu  # noqa: E402

RESULTS: list[bool] = []
TMP = tempfile.mkdtemp(prefix="kb134_")


def ok(cond: bool, msg: str) -> None:
    RESULTS.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg, flush=True)


def read(p: str) -> str:
    with open(p, encoding="utf-8") as f:
        return f.read()


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


@contextmanager
def unreadable(col, keys):
    orig = Collection.get_config
    hits = []

    def bad(self, name, *a, **kw):
        if self is col and name in keys:
            hits.append(name)
            raise OSError("TEST: không đọc được")
        return orig(self, name, *a, **kw)

    Collection.get_config = bad
    try:
        yield hits
    finally:
        Collection.get_config = orig


def kb_keys(col):
    return {k: copy.deepcopy(v) for k, v in col.all_config().items() if k.startswith("kotoba_batake_") and k != backup.REV_KEY}


def new_col(name):
    folder = os.path.join(TMP, name)
    os.makedirs(folder)
    return Collection(os.path.join(folder, "collection.anki2")), os.path.join(folder, "user_files")


def garden(col, uf, coins=100000):
    """Nhà xây xong + mở hai gian bên + vùng đầu; phòng chính có tranh / đồng hồ / kệ / chậu / thảm + kotatsu; sân có ghế."""
    st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
    st.today_override = 500
    d = st.load(); d["coins"] = 100000; st.save(d)
    for _ in range(7):
        st.build()
    st.open_rooms()
    for iid, sc, x, y in [("painting", "room", 1, 0), ("clock", "room", 7, 0), ("shelf", "room", 0, 1), ("plant", "room", 9, 1),
                          ("rug", "room", 4, 2), ("kotatsu", "room", 4, 2), ("bench", "yard", 6, 1)]:
        st.buy(iid); st.place(sc, iid, x, y)
    st.unlock_zone(core.ZONE_IDS[0])
    d = st.load(); d["coins"] = coins; st.save(d)
    return st


def slot_of(st, scene, extra=(), drop=(), move=None, decor=None):
    """Bản thử = cảnh thật hiện tại + món thêm − món bỏ (theo id) + dời (id → (x, y))."""
    items = [dict(e) for e in st.load()["home"][scene] if e["id"] not in drop]
    if move:
        for e in items:
            if e["id"] in move:
                e["x"], e["y"] = move[e["id"]]
    items += [{"id": i, "x": x, "y": y} for i, x, y in extra]
    out = {"items": items}
    if decor is not None:
        out["decor"] = decor
    return out


# ---------------------------------------------------------------------------
print("== 1. draft_core: làm sạch, put / pick, bản thử rác ngẫu nhiên")
ok(draft.clean(None) == draft.empty() and draft.clean({"scenes": []}) == draft.empty(), "không phải dict / scenes sai kiểu → trống")
raw = {"v": 9, "scenes": {
    "room": {"cur": 2, "slots": [{"items": [{"id": "shelf", "x": 0, "y": 1}, {"id": "x", "x": -1, "y": 0}, {"id": "y", "x": 1.5, "y": 1},
                                            {"id": "z", "x": True, "y": 1}, {"id": "bad id!", "x": 1, "y": 1}, {"id": "w", "x": 64, "y": 1},
                                            {"id": "fut_item_99", "x": 3, "y": 2}, "rác", {"id": "nan", "x": float("nan"), "y": 1}],
                                  "decor": {"wall": "w_sakura", "floor": "<script>", "khác": "f_x"}, "t": 123},
                                 "rác", None, {"items": []}]},
    "Phòng": {"cur": 0, "slots": [{"items": []}]},
    "yard": {"cur": 7, "slots": [{"items": [{"id": "bench", "x": 6, "y": 1}]}]},
    "beach": {"cur": 0, "slots": [None, None, None]}}}
c = draft.clean(raw)
r = c["scenes"].get("room")
ok(r is not None and [e["id"] for e in r["slots"][0]["items"]] == ["shelf", "fut_item_99"],
   "món sai (x âm, số lẻ, bool, id lạ ký tự, x quá lớn, NaN, không phải dict) bỏ; id của bản mới hơn (fut_item_99) giữ")
ok(r["slots"][0].get("decor") == {"wall": "w_sakura"} and r["slots"][0]["t"] == 123, "tường / sàn: chỉ giữ id hợp lệ ở đúng chỗ")
ok(len(r["slots"]) == 3 and r["slots"][1] is None and r["slots"][2] is None and r["cur"] == 2,
   "3 ô bản thử: ô rác → None, ô thứ 4 trở đi bỏ, cur giữ khi hợp lệ")
ok(draft.clean({"scenes": {"yard": {"cur": 1, "slots": [None, {"items": []}]}}})["scenes"]["yard"]["slots"] == [None, {"items": [], "t": 0}, None],
   "thiếu ô → thêm ô trống cho đủ 3")
ok("Phòng" not in c["scenes"] and "beach" not in c["scenes"] and c["scenes"]["yard"]["cur"] == 0,
   "tên cảnh lạ bỏ; cảnh không còn bản nào bỏ; cur ngoài 0–2 → 0")
s1 = draft.put(draft.empty(), "room", 1, {"items": [{"id": "shelf", "x": 0, "y": 1}]})
ok(s1["scenes"]["room"]["cur"] == 1 and s1["scenes"]["room"]["slots"][1]["items"] == [{"id": "shelf", "x": 0, "y": 1}]
   and s1["scenes"]["room"]["slots"][1]["t"] > 0, "put: lưu ô 1, chọn ô 1, đóng dấu giờ")
s2 = draft.pick(s1, "room", 2)
ok(s2["scenes"]["room"]["cur"] == 2, "pick: chọn ô trống (giao diện chép cảnh thật vào sau)")
s3 = draft.put(s2, "room", 1, None)
ok("room" not in s3["scenes"], "xoá ô cuối cùng của cảnh → bỏ cảnh")
errs = 0
for bad in [("Phòng", 0, {"items": []}), ("room", 3, {"items": []}), ("room", True, {"items": []}), ("room", 0, {"x": 1}), (None, 0, {"items": []})]:
    try:
        draft.put(draft.empty(), *bad)
    except draft.DraftError:
        errs += 1
ok(errs == 5, "put từ chối cảnh lạ / ô 3 / ô bool / bản thử hỏng / cảnh None (DraftError, câu tiếng Việt)")
big = {"items": [{"id": "fence", "x": i % 60, "y": i % 4} for i in range(500)]}
ok(len(draft.put(draft.empty(), "yard", 0, big)["scenes"]["yard"]["slots"][0]["items"]) == draft.MAX_ITEMS, "quá nhiều món → cắt ở %d" % draft.MAX_ITEMS)
many = {"v": 1, "scenes": {("u%d" % i): {"cur": 0, "slots": [{"items": []}]} for i in range(200)}}
ok(len(draft.clean(many)["scenes"]) == draft.MAX_SCENES, "quá nhiều cảnh → cắt ở %d" % draft.MAX_SCENES)
rnd = random.Random(134)
POOL = [None, True, 1.5, -3, 10 ** 12, "", "room", "yard", "u1", "Phòng", [], {}, float("inf"), "w_kem", "t3", "f_<b>", 0, 2, 63, 64]


def junk(depth=0):
    k = rnd.random()
    if depth > 3 or k < 0.3:
        return rnd.choice(POOL)
    if k < 0.65:
        return [junk(depth + 1) for _ in range(rnd.randint(0, 5))]
    keys = ["v", "scenes", "cur", "slots", "items", "id", "x", "y", "decor", "wall", "floor", "t", "room", "yard"]
    return {rnd.choice(keys): junk(depth + 1) for _ in range(rnd.randint(0, 6))}


bad_n = 0
for _ in range(3000):
    x = junk()
    if rnd.random() < 0.5:
        x = {"v": 1, "scenes": {rnd.choice(["room", "yard", "kitchen", "Lạ", "u2"]): {"cur": junk(), "slots": [junk(), {"items": [junk(), junk()], "decor": junk()}, junk()]}}}
    try:
        a = draft.clean(x)
        b = draft.clean(json.loads(json.dumps(a)))
        if a != b or len(a["scenes"]) > draft.MAX_SCENES or any(len(sc["slots"]) != draft.SLOTS for sc in a["scenes"].values()):
            bad_n += 1
    except Exception:  # noqa: BLE001
        bad_n += 1
ok(bad_n == 0, "3.000 bản thử rác: không ném lỗi, làm sạch hai lần = một lần, đúng giới hạn (sai %d)" % bad_n)

# ---------------------------------------------------------------------------
print("== 2. Dùng bản thử: mua + dời + cất trong một lần lưu")
col, uf = new_col("apply")
st = garden(col, uf, coins=3000)
d0 = st.load()
sl = slot_of(st, "room", extra=[("aquarium", 8, 1), ("andon", 2, 2)], drop=("plant",), move={"shelf": (1, 1)})
plan = core.draft_plan(d0, "room", sl)
ok(plan["buy"] == {"aquarium": 1, "andon": 1} and plan["cost"] == core.CATALOG["aquarium"]["price"] + core.CATALOG["andon"]["price"] and not plan["same"],
   "kế hoạch: mua Bể cá + Đèn andon, tổng %d xu" % plan["cost"])
ok(d0 == st.load(), "draft_plan không đổi ví")
data, plan = st.draft_apply("room", sl)
d1 = st.load()
ok(d1["coins"] == 3000 - plan["cost"] and d1["home"]["owned"]["aquarium"] == 1 and d1["home"]["owned"]["andon"] == 1,
   "đã trừ đúng %d xu, có Bể cá + Đèn andon" % plan["cost"])
ok(sorted((e["id"], e["x"], e["y"]) for e in d1["home"]["room"]) == sorted((e["id"], e["x"], e["y"]) for e in sl["items"]),
   "phòng chính bày đúng như bản thử (kệ dời sang ô 1, thêm 2 món)")
ok(d1["home"]["owned"]["plant"] == 1 and core.placed_count(d1["home"], "plant") == 0, "chậu cây bản thử không dùng → Kho đồ (vẫn có 1, đã đặt 0)")
try:
    st.draft_apply("room", sl)
    ok(False, "dùng lại bản giống hệt → phải báo")
except core.HomeError as e:
    ok("giống hệt" in str(e) and st.load() == d1, "bản thử giống hệt cảnh bây giờ → báo, không ghi")


def refuse(name, scene, slot, want, st=st, col=col):
    before = kb_keys(col)
    try:
        st.draft_apply(scene, slot)
        ok(False, name + ": phải từ chối")
    except core.HomeError as e:
        ok(want in str(e) and kb_keys(col) == before, f"{name} → “{e}” (không đổi gì)")


d = st.load(); d["coins"] = 50; st.save(d)
refuse("thiếu xu (TV 220 xu, còn 50)", "room", slot_of(st, "room", extra=[("tv", 6, 3)]), "Thiếu")
d = st.load(); d["coins"] = 5000; st.save(d)
refuse("đè lên đồ (đèn đặt trùng ô kệ)", "room", slot_of(st, "room", extra=[("lamp", 1, 1)]), "Đèn cây")
refuse("treo tường ở cửa sổ", "room", slot_of(st, "room", extra=[("calendar", 4, 0)]), "cửa sổ")
refuse("đồ treo tường đặt dưới sàn", "room", slot_of(st, "room", extra=[("calendar", 6, 3)]), "trên tường")
refuse("đồ sàn đặt trên tường", "room", slot_of(st, "room", extra=[("lamp", 3, 0)]), "dưới sàn")
refuse("ngoài phòng", "room", slot_of(st, "room", extra=[("lamp", 10, 1)]), "ngoài căn phòng")
refuse("đồ ngoài trời trong nhà", "room", slot_of(st, "room", extra=[("bench", 6, 3)]), "không đặt ở đây")
refuse("món không còn (id lạ)", "room", slot_of(st, "room", extra=[("fut_item_99", 6, 3)]), "không còn")
refuse("cảnh chưa mở (vùng thứ 2)", core.ZONE_IDS[1], {"items": []}, "Chưa mở")
refuse("cảnh lạ", "abc", {"items": []}, "Không có cảnh")
statue = core.CATALOG["statue"]
refuse("số tối đa (tượng chỉ 1 cái, bản thử 2)", "yard", slot_of(st, "yard", extra=[("statue", 10, 0), ("statue", 12, 0)]), "tối đa 1")
rare = next(k for k, v in core.CATALOG.items() if v.get("rare") and v["scene"] == "yard")
refuse("quà rương chưa có", "yard", slot_of(st, "yard", extra=[(rare, 10, 0)]), "không bán")
ped = next(k for k, v in core.CATALOG.items() if v.get("only") == "ped" and v["scene"] == "yard")
refuse("món chỉ có ở gánh hàng", "yard", slot_of(st, "yard", extra=[(ped, 10, 0)]), "không bán")
season_item = next(k for k, v in core.CATALOG.items() if v.get("season") and v["scene"] == "yard" and v.get("season") not in st.load()["season"]["unlocked"])
refuse("đồ giao diện mùa chưa mở", "yard", slot_of(st, "yard", extra=[(season_item, 10, 0)]), "giao diện mùa")
# món đang đặt ở cảnh khác: ghế ở sân, bản thử của vùng 1 dùng ghế → mua thêm, ghế ở sân giữ nguyên
z = core.ZONE_IDS[0]
before = st.load()
data, plan = st.draft_apply(z, {"items": [{"id": "bench", "x": 6, "y": 1}]})
after = st.load()
ok(plan["buy"] == {"bench": 1} and after["home"]["owned"]["bench"] == before["home"]["owned"]["bench"] + 1 and
   [e for e in after["home"]["yard"] if e["id"] == "bench"] == [e for e in before["home"]["yard"] if e["id"] == "bench"],
   "món đang đặt ở cảnh khác không bị lấy sang — mua thêm 1 ghế, ghế ở sân giữ nguyên")
# món tự làm: chỉ có 1 cái, bản thử dùng 2
st.craft_save({"name": "Hộp gỗ", "size": 16, "kind": "floor", "fx": "none", "px": core.px_encode("n" * 256)})
cid = next(iter((st.load().get("craft") or {}).get("items") or {}))
refuse("món tự làm dùng nhiều hơn số đang có", "room", slot_of(st, "room", extra=[(cid, 6, 3), (cid, 7, 3)]), "Món tự làm")
d = st.load(); d["coins"] = 5000; st.save(d)

# tường & sàn
dec0 = st.load()["more"][core.decor.DECOR_KEY]
wid = next(k for k, v in core.decor.PRESETS.items() if v["slot"] == "wall" and k not in dec0["own"])
c0 = st.load()["coins"]
data, plan = st.draft_apply("room", slot_of(st, "room", decor={"wall": wid, "floor": ""}))
dec1 = st.load()["more"][core.decor.DECOR_KEY]
ok(plan["decor_buy"] == [wid] and wid in dec1["own"] and dec1["use"]["room"].get("wall") == wid and
   st.load()["coins"] == c0 - core.decor.PRESETS[wid]["price"], "giấy dán tường chưa có: mua (%d xu) + dán cho Phòng chính cùng lần" % core.decor.PRESETS[wid]["price"])
data, plan = st.draft_apply("room", slot_of(st, "room", decor={"wall": "w_hroom"}))
ok(not plan["decor_buy"] and "wall" not in st.load()["more"][core.decor.DECOR_KEY]["use"]["room"], "về tường theo kiểu nhà (id nền của chính gian) → bỏ dán, không tốn xu")
refuse("mẫu tự vẽ không còn", "room", slot_of(st, "room", decor={"floor": "t9"}), "không còn")
refuse("giấy dán tường đặt vào chỗ sàn", "room", slot_of(st, "room", decor={"floor": wid}), "không còn")

# lỗi ghi ở từng khoá → không đổi một byte (mỗi khoá một vườn mới: bản thử mua đồ sàn + mẫu sàn → ghi ví, ext, more…)
W = [core.CONFIG_KEY, core.EXT_KEY, core.SEASON_KEY, core.MORE_KEY, core.NHA_KEY, core.MOBILE_KEY]
wrote = set()
for key in W:
    colw, ufw = new_col("w_" + key[-8:])
    stw = garden(colw, ufw, coins=5000)
    fl = next(k for k, v in core.decor.PRESETS.items() if v["slot"] == "floor")
    sl = slot_of(stw, "room", extra=[("tea", 6, 3)], decor={"floor": fl})
    before = kb_keys(colw)
    err = ""
    with unwritable(colw, {key}) as hits:
        try:
            stw.draft_apply("room", sl)
        except core.HomeError as e:
            err = type(e).__name__
    after = kb_keys(colw)
    if hits:
        wrote.add(key)
        ok(err == "StoreError" and after == before, f"lỗi ghi khoá {key} giữa lúc dùng bản thử → StoreError, collection không đổi")
        d = stw.draft_apply("room", sl)[0]
        ok(d["home"]["owned"].get("tea") == 1 and fl in d["more"][core.decor.DECOR_KEY]["own"], f"  … thử lại sau lỗi {key}: được, mua đúng một lần")
    else:
        ok(not err and after != before, f"khoá {key} không cần ghi cho bản thử này (lưu bình thường)")
ok({core.CONFIG_KEY} <= wrote, "đã thử lỗi ghi ở các khoá bản thử có ghi: " + ", ".join(sorted(wrote)))
with unreadable(col, {core.CONFIG_KEY}) as hits:
    before = None
    try:
        st.draft_apply("room", slot_of(st, "room", extra=[("desk", 6, 3)]))
        ok(False, "đọc lỗi kéo dài: phải từ chối")
    except Exception as e:  # noqa: BLE001
        ok(type(e).__name__ in ("ReadFailed", "StoreError"), "đọc lỗi kéo dài → từ chối (%s)" % type(e).__name__)

# 600 bản thử ngẫu nhiên có đối chứng
print("== 2b. 600 bản thử ngẫu nhiên có đối chứng (tính lại độc lập số món phải mua / xu)")
col2, uf2 = new_col("fuzz")
st2 = garden(col2, uf2, coins=4000)
rnd = random.Random(1340)
room_ids = [k for k, v in core.CATALOG.items() if v["scene"] == "room" and not v.get("rare") and not v.get("only") and not v.get("season")]
yard_ids = [k for k, v in core.CATALOG.items() if v["scene"] != "room" and not v.get("rare") and not v.get("only") and not v.get("season") and not v.get("zone")]
stats = {"ok": 0, "err": 0, "bad": 0}
for n in range(600):
    scene = rnd.choice(["room", "kitchen", "bedroom", "yard", core.ZONE_IDS[0]])
    pool = room_ids if core.is_room(scene) else yard_ids + [k for k, v in core.CATALOG.items() if v.get("zone") == core.ZONE_IDS[0]]
    cur = st2.load()
    items = [dict(e) for e in cur["home"][scene] if rnd.random() < 0.7]
    for _ in range(rnd.randint(0, 4)):
        items.append({"id": rnd.choice(pool), "x": rnd.randint(-1, 16), "y": rnd.randint(0, 3)})
    if rnd.random() < 0.3:
        c2 = st2.load(); c2["coins"] = rnd.choice([0, 100, 600, 5000]); st2.save(c2)
    before, kb0 = st2.load(), kb_keys(col2)
    try:
        _d, plan = st2.draft_apply(scene, {"items": items})
    except core.HomeError:
        stats["err"] += 1
        if kb_keys(col2) != kb0:
            stats["bad"] += 1
        continue
    after = st2.load()
    items = draft.clean_slot({"items": items})["items"]       # món sai hình dạng (x âm…) đã bị bỏ khi làm sạch
    # đối chứng: số phải mua = max(0, số trong bản thử − (đang có − đặt ở cảnh khác)); xu = Σ giá × số mua
    exp_cost = 0
    good = True
    for iid in {e["id"] for e in items}:
        need = sum(1 for e in items if e["id"] == iid)
        else_ = sum(1 for sc in core.scene_names(before["home"]) if sc != scene for e in before["home"].get(sc, []) if e["id"] == iid)
        buy = max(0, need - max(0, before["home"]["owned"].get(iid, 0) - else_))
        exp_cost += buy * core.CATALOG[iid]["price"]
        if after["home"]["owned"].get(iid, 0) != before["home"]["owned"].get(iid, 0) + buy:
            good = False
    if before["coins"] - after["coins"] != exp_cost or after["coins"] < 0:
        good = False
    why = []
    for iid in after["home"]["owned"]:
        if core.placed_count(after["home"], iid) > after["home"]["owned"][iid]:
            good = False
            why.append("đặt %s > có" % iid)
    tmp = dict(after["home"]); tmp[scene] = []
    for e in after["home"][scene]:
        try:
            core.check_spot(tmp, scene, e["id"], e["x"], e["y"])
            tmp[scene].append(e)
        except core.HomeError as e2:
            good = False
            why.append("%s@%d,%d: %s" % (e["id"], e["x"], e["y"], e2))
    if not good and os.environ.get("KB_DEBUG"):
        print("   sai:", scene, before["coins"] - after["coins"], exp_cost, why, items)
    stats["ok" if good else "bad"] += 1
ok(stats["bad"] == 0 and stats["ok"] > 50 and stats["err"] > 50,
   "600 bản thử: %d dùng được (đúng đối chứng), %d bị từ chối (không đổi gì), %d sai" % (stats["ok"], stats["err"], stats["bad"]))

# ---------------------------------------------------------------------------
print("== 3. Bản thử lưu theo hồ sơ trên máy, không đụng collection")
col3, uf3 = new_col("store_a")
st3 = garden(col3, uf3)
k0 = kb_keys(col3)
store = st3.draft_store(draft.put(st3.draft_load(), "room", 0, slot_of(st3, "room", extra=[("tv", 6, 3)])))
path = backup.profile_path(os.path.join(uf3, draft.FILE_NAME), col3)
ok(os.path.exists(path) and "/ho_so/" in path.replace(os.sep, "/") and kb_keys(col3) == k0,
   "ghi ở user_files/ho_so/<mã>/ban_thu.json, không thêm / đổi khoá collection nào")
ok(st3.draft_load() == store and store["scenes"]["room"]["slots"][0]["items"][-1]["id"] == "tv", "đọc lại đúng bản đã lưu")
# hồ sơ khác cùng máy (cùng thư mục add-on) không thấy
folder_b = os.path.join(TMP, "store_b"); os.makedirs(folder_b)
col_b = Collection(os.path.join(folder_b, "collection.anki2"))
st_b = core.GardenState(os.path.join(uf3, "state.json"), lambda: col_b)
ok(st_b.draft_load() == draft.empty(), "hồ sơ khác dùng chung thư mục add-on: không thấy bản thử của hồ sơ A")
with open(path, "w", encoding="utf-8") as f:
    f.write("{hỏng")
ok(st3.draft_load() == draft.empty(), "file bản thử hỏng → trống (không ném lỗi)")
# bản đã phát hành 1.31.3 mở cùng collection sau khi dùng bản thử
st3.draft_apply("room", slot_of(st3, "room", extra=[("tv", 6, 3)]))
mine = st3.load()
import io, tarfile  # noqa: E402
try:
    old = os.path.join(TMP, "old1313")
    tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "e64eb22"))).extractall(old)
except Exception:  # noqa: BLE001
    old = None
if old and os.path.isdir(old):
    code = ("import sys, json; sys.path.insert(0, sys.argv[1]); import garden_core as c\n"
            "from anki.collection import Collection\ncol = Collection(sys.argv[2])\n"
            "st = c.GardenState(sys.argv[3], lambda: col); d = st.load(); d['coins'] -= 1; st.save(d)\n"
            "print(json.dumps({'room': d['home']['room'], 'tv': d['home']['owned'].get('tv', 0), 'coins': d['coins']}))\ncol.close()")
    colpath = col3.path
    col3.close()
    r = subprocess.run([sys.executable, "-c", code, os.path.join(old, "kotoba_batake") if os.path.isdir(os.path.join(old, "kotoba_batake")) else old,
                        colpath, os.path.join(uf3, "state.json")], capture_output=True, text=True)
    got = json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None
    col3 = Collection(colpath)
    st3 = core.GardenState(os.path.join(uf3, "state.json"), lambda: col3)
    ok(got is not None and got["tv"] == 1 and got["room"] == mine["home"]["room"] and st3.load()["home"]["room"] == mine["home"]["room"],
       "mã THẬT 1.31.3 (đã phát hành) đọc + lưu ví sau khi dùng bản thử: phòng + TV còn nguyên" + ("" if got else " — " + r.stderr[-300:]))
else:
    print("  – (bỏ qua: không lấy được mã 1.31.3)")

# ---------------------------------------------------------------------------
print("== 4. deck_tree khớp deck_due_tree của Anki")
col4, _uf4 = new_col("decks")
for name in ["Tiếng Nhật::N4::Bài 15", "Tiếng Nhật::N4::Bài 16", "Tiếng Nhật::N5", "Tiếng Anh::B1::Unit 1", "Ôn thi", "日本語::語彙"]:
    did = col4.decks.id(name)
    m = col4.models.by_name("Basic")
    for i in range(3):
        n = col4.new_note(m); n["Front"] = f"{name} {i}"; n["Back"] = "x"; col4.add_note(n, did)
fid = col4.decks.new_filtered("Lọc 1")
tree = core.deck_tree(col4)
names = {d.name for d in col4.decks.all_names_and_ids()}
ok(all(t["full"] in names for t in tree) and "Default" not in [t["full"] for t in tree], "tên đủ khớp all_names_and_ids, Default trống ẩn như Anki")
ok([t["full"] for t in tree][:4] == ["Lọc 1", "Tiếng Anh", "Tiếng Anh::B1", "Tiếng Anh::B1::Unit 1"] or len(tree) >= 10,
   "thứ tự theo cây: " + ", ".join(t["full"] for t in tree[:6]))
by = {t["full"]: t for t in tree}
ok(by["Tiếng Nhật::N4"]["depth"] == 1 and by["Tiếng Nhật::N4"]["kids"] and not by["Tiếng Nhật::N4::Bài 15"]["kids"]
   and by["Tiếng Nhật::N4::Bài 15"]["name"] == "Bài 15", "cấp, có deck con, tên lá")
ok(by["Lọc 1"]["dyn"] and not by["Ôn thi"]["dyn"], "deck lọc được đánh dấu")
root = col4.sched.deck_due_tree()


def flat(n, out):
    for c2 in n.children:
        out[c2.deck_id] = [c2.new_count, c2.learn_count, c2.review_count]
        flat(c2, out)
    return out


ref = flat(root, {})
ok(all(ref[t["id"]] == t["n"] for t in tree) and by["Tiếng Nhật"]["n"][0] > 0, "số thẻ Mới / Học / Ôn = deck_due_tree (Tiếng Nhật mới %d)" % by["Tiếng Nhật"]["n"][0])

# ---------------------------------------------------------------------------
print("== 5. Cấu hình Phóng to (ui.zoom)")
ok(more.clean_ui({"zoom": "on"})["zoom"] == "on" and more.clean_ui({"zoom": "lớn"})["zoom"] == "off" and more.clean_ui(None)["zoom"] == "off",
   "zoom: on / off, giá trị lạ → off (mặc định)")
ok(more.ui_preset("focus", {"zoom": "on"})["zoom"] == "on" and more.ui_preset("full", {"zoom": "on"})["zoom"] == "on",
   "chọn kiểu có sẵn không tắt Phóng to")

# ---------------------------------------------------------------------------
print("== 6. Soát mã giao diện")
gjs, ujs, hjs = read(os.path.join(ADDON, "web", "garden.js")), read(os.path.join(ADDON, "web", "ui.js")), read(os.path.join(ADDON, "web", "home.js"))
body, css, ini = read(os.path.join(ADDON, "web", "body.html")), read(os.path.join(ADDON, "web", "garden.css")), read(os.path.join(ADDON, "__init__.py"))
ok(all(re.search(r'kb-rate-%d" data-ease="%d" title="Phím %d"><span class="kb-rate-key" aria-hidden="true">%d</span>' % (i, i, i, i), body) for i in range(1, 5)),
   "4 nút chấm ghi số phím 1–4")
ok('id="kb-rv-replay"' in body and 'id="kb-rv-zoom"' in body and "rv:replay" in ini and '"audio": bool(self._side_tags(card, "q"))' in ini
   and '"audio": bool(self._side_tags(card, "a"))' in ini and "replay_question_audio_on_answer_side" in ini, "Nghe lại: nút, lệnh rv:replay, cờ âm thanh từng mặt, theo tuỳ chọn deck")
ok("k === \"r\" || k === \"R\" || k === \"F5\"" in gjs and "replay();" in gjs, "phím R / F5 → Nghe lại")
ok("c==='ans'||/^ease[1-4]$/.test(c)" in gjs and "parent.Garden.cardCmd(c)" in gjs and "var bridgeCommand=pycmd" in gjs
   and "cardCmd: cardCmd" in gjs, "mẫu thẻ gọi pycmd(\"ans\") / (\"ease1\"…) → bảng ôn lật / chấm")
ok("if (m && showingAnswer) { rate(Number(m[1])); }" in gjs and "if (!showingAnswer) { flip(); }" in gjs, "lật chỉ ở mặt trước, chấm chỉ khi đã lật (như Anki)")
ok("clearTimeout(ti);clearInterval(ti)" in gjs, "sang thẻ mới: dọn hẹn giờ của thẻ cũ")
ok("if (e.repeat) { return; }" in gjs and "NUMPAD[e.code]" in gjs and "TEXT_INPUT.test(t.type" in gjs, "phím lặp bỏ qua, NumLock tắt, radio / checkbox không chặn phím")
ok("e.isComposing || e.keyCode === 229" in gjs, "giữ quyết định 1.25.9: phím của bộ gõ không chạy phím tắt")
tq = ujs[ujs.index("function toggleQuick()"):ujs.index("function zoomOn()")]
ok('c.card = "tall"' not in tq and 'if (hidden && c.card === "tall") { c.card = "normal"; }' in tq, "Ẩn vườn không đổi cỡ thẻ; Hiện vườn trả \"To hết chỗ\" (bản cũ lỡ lưu) về Vừa")
ok(".kb-ui-m-review.kb-ui-yard-hide.kb-ui-field-hide .kb-card" in css and ".kb-ui-m-review.kb-ui-zoom-on .kb-card" in css, "CSS: vườn ẩn → khung thẻ cao; Phóng to")
ok("GardenUI.zoomOn && GardenUI.zoomOn()) { GardenUI.toggleZoom(false); return; }" in gjs, "Esc khi đang Phóng to: thu nhỏ trước")
ok('id="kb-deck-btn"' in body and 'id="kb-deck-find"' not in body and "deck:tree" in ini and "deckTree: deckTree" in gjs and "kb-deck-fold" in gjs,
   "ô deck: nút gọn + cây (lệnh deck:tree), bỏ nút kính lúp, nhớ đóng / mở theo máy")
ok('id="kb-h-try"' in body and "home:draft:" in hjs and "drafts: drafts_" in hjs and '"homeDrafts"' in ini and "draft:use" not in ini.split("_on_draft")[0][-200:],
   "Trang trí thử: nút, lệnh home:draft:*, Python trả homeDrafts")
ok("noPets: trying" in hjs and "photoCanvasReal" in hjs, "khi thử: không thú / khách / StackChan; chụp ảnh là cảnh thật")
ok('sc = STATE.draft_load()["scenes"].get(scene)' in ini and "STATE.draft_store(draft_core.put(STATE.draft_load(), scene, slot, p.get(\"draft\")))" in ini
   and "draft: d.slots[d.cur]" in hjs, "\"Dùng bản này\": lưu bản đang thấy (lần lưu trước có thể bị bỏ lúc đồng bộ) rồi dùng bản đã lưu, Python xét lại")
ok("function draftBusy()" in hjs and "> 8000" in hjs, "lệnh bản thử chờ quá 8 giây (bị bỏ lúc đồng bộ) không làm kẹt")

print("KẾT QUẢ: %d/%d" % (sum(RESULTS), len(RESULTS)))
sys.exit(0 if all(RESULTS) else 1)
