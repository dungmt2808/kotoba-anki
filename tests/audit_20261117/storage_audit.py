"""Audit 17/11: lỗi ĐỌC tại API Anki, ngoài các test lỗi ghi / làm sạch có sẵn.

Chỉ dùng collection Anki thật trong thư mục tạm. Không sửa mã sản phẩm.
Exit 1 = bất biến bảo toàn dữ liệu trượt; exit 2 = lỗi thiết lập.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import copy
import datetime as dt
import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", type=Path)
ap.add_argument("--out", type=Path, required=True)
args = ap.parse_args()
sys.path.insert(0, str(args.addon.resolve()))
from anki.collection import Collection
import garden_core as core
import backup_core as backup
import guest_core as guests
import life_core as life
import finds_core as finds
import journal_core as journal
import paper_core as paper

ROWS = []
DAY = dt.date(2026, 11, 17)


def check(case, passed, **detail):
    row = {"case": case, "passed": bool(passed), **detail}
    ROWS.append(row)
    print(("PASS " if passed else "FAIL ") + json.dumps(row, ensure_ascii=False))


@contextmanager
def unreadable(col, key, persistent=False):
    original = Collection.get_config
    hits = []

    def faulty(self, name, *a, **kw):
        if self is col and name == key and (persistent or not hits):
            hits.append(name)
            raise OSError("AUDIT: không đọc được khoá collection")
        return original(self, name, *a, **kw)

    Collection.get_config = faulty
    try:
        yield hits
    finally:
        Collection.get_config = original


def main(base):
    folder = base / "HoSoThu"
    folder.mkdir()
    col = Collection(str(folder / "collection.anki2"))
    state = core.GardenState(str(base / "user_files/state.json"), lambda: col)
    state.today_override = 500
    d = state.load()
    d["coins"] = 100000
    d["home"].update(house=7, rooms=["kitchen", "bedroom"])
    state.save(d)
    for iid, sc, x, y in [("bench", "yard", 6, 1), ("sunflower", "yard", 8, 1),
                           ("nagashi", "kitchen", 2, 1), ("beddo", "bedroom", 1, 2)]:
        state.buy(iid)
        state.place(sc, iid, x, y)
    state.pet_buy("neko")
    state.buy_wear("straw")
    state.unlock_theme(core.season.THEME_IDS[0], "coins")
    state.mywear_save({"name": "Mũ kiểm thử", "slot": "head", "px": "160r"})
    initial = copy.deepcopy(col.all_config())
    healthy = copy.deepcopy(state.load())
    check("control/healthy-roundtrip", healthy["home"]["house"] == 7 and
          bool(healthy["more"]["pets"]) and bool(healthy["more"]["mywear"]["items"]))

    def restore():
        current = col.all_config()
        for key in current:
            if key.startswith("kotoba_batake_") and key not in initial:
                col.remove_config(key)
        for key, value in initial.items():
            if key.startswith("kotoba_batake_"):
                col.set_config(key, copy.deepcopy(value))
        # Sao lưu mới và đúng chủ: ngay cả điều kiện thuận lợi này cũng phải an toàn.
        state.save(copy.deepcopy(healthy))

    for key in (core.CONFIG_KEY, core.EXT_KEY, core.SEASON_KEY, core.MORE_KEY, core.NHA_KEY):
        for persistent in (False, True):
            restore()
            before = copy.deepcopy(col.all_config())
            error = ""
            with unreadable(col, key, persistent) as hits:
                try:
                    state.add_coins(1)
                except Exception as exc:
                    error = type(exc).__name__ + ": " + str(exc)
            after = col.all_config()
            changed = [k for k in before if k.startswith("kotoba_batake_") and
                       k != backup.REV_KEY and before[k] != after.get(k)]
            expected = copy.deepcopy(before)
            if not error:
                expected[core.CONFIG_KEY]["coins"] += 1
            protected = all(after.get(k) == v for k, v in expected.items()
                            if k.startswith("kotoba_batake_") and k != backup.REV_KEY)
            check("read-failure/wallet/" + key + ("/persistent" if persistent else "/once"),
                  bool(hits) and protected, fault_hits=len(hits), error=error,
                  changed_keys=changed,
                  before={k: before[k] for k in changed}, after={k: after.get(k) for k in changed})

    # Các sổ nền cũng không được biến lỗi đọc thành sổ trống rồi ghi đè.
    for name, cls, key, map_key, ids, method in [
        ("guests", guests.GuestStore, guests.GUEST_KEY, "met", guests.ORDER, "met"),
        ("life", life.LifeStore, life.LIFE_KEY, "seen", life.ORDER, "mark"),
    ]:
        for persistent in (False, True):
            restore()
            store = cls(str(base / "user_files" / (name + ".json")), lambda: col)
            getattr(store, method)(ids[0], "room" if name == "life" else "yard", DAY - dt.timedelta(days=1))
            before = copy.deepcopy(col.get_config(key))
            error = ""
            with unreadable(col, key, persistent) as hits:
                try:
                    getattr(store, method)(ids[1], "yard", DAY)
                except Exception as exc:
                    error = type(exc).__name__ + ": " + str(exc)
            after = col.get_config(key)
            check("read-failure/" + name + ("/persistent" if persistent else "/once"),
                  bool(hits) and after.get(map_key, {}).get(ids[0]) == before[map_key][ids[0]],
                  fault_hits=len(hits), error=error, before=before, after=after)

    # Đối chứng: nhật ký đã có đọc strict=True; cùng lỗi phải giữ toàn bộ tháng.
    restore()
    js = journal.JournalStore(str(base / "user_files/journal"), lambda: col)
    js.update(DAY - dt.timedelta(days=1), {"t": "Nhật ký hôm trước phải còn."})
    key = journal.month_key(DAY.year, DAY.month)
    before = copy.deepcopy(col.get_config(key))
    error = ""
    with unreadable(col, key) as hits:
        try:
            js.update(DAY, {"t": "Dòng đang gõ."})
        except Exception as exc:
            error = type(exc).__name__
    check("control/journal-refuses-unread-month", bool(error) and col.get_config(key) == before,
          error=error, fault_hits=len(hits), before=before, after=col.get_config(key))

    # Đọc tiến độ báo mới đồng bộ về, nhưng sao lưu cục bộ còn cũ.
    restore()
    ps = paper.PaperState(str(base / "user_files/paper_en.json"), lambda: col, paper.PAPER_KEY_EN)
    old = paper.empty_state()
    paper.mark_read(old, "2026-11-15")
    ps.save(old)
    newer = copy.deepcopy(old)
    paper.mark_read(newer, "2026-11-16")
    col.set_config(ps.key, newer)  # như khi Anki tải tiến độ mới về, trước lần sao lưu cục bộ kế tiếp
    with unreadable(col, ps.key) as hits:
        data = ps.load()
        paper.mark_read(data, DAY.isoformat())
        ps.save(data)
    after = col.get_config(ps.key)
    check("read-failure/paper/stale-local-backup", "2026-11-16" in after["read"],
          fault_hits=len(hits), before=sorted(newer["read"]), after=sorted(after["read"]))

    restore()
    key = core.CONFIG_KEY
    wallet = col.get_config(key)
    wallet["coins"] += 100  # số dư mới đồng bộ về chưa có trong file sao lưu
    col.set_config(key, wallet)
    with unreadable(col, key) as hits:
        state.add_coins(1)
    check("read-failure/wallet/stale-local-backup", col.get_config(key)["coins"] == wallet["coins"] + 1,
          fault_hits=len(hits), expected_coins=wallet["coins"] + 1, actual_coins=col.get_config(key)["coins"])

    restore()
    px = col.get_config(core.PX_KEY)
    px["w1"] = "160g"  # bản sửa hình mới từ máy khác
    col.set_config(core.PX_KEY, px)
    with unreadable(col, core.PX_KEY) as hits:
        state.mywear_save({"name": "Vỏ mới", "slot": "shell", "c": ["r", "k"]})
    check("read-failure/pixels/stale-local-backup", col.get_config(core.PX_KEY).get("w1") == "160g",
          fault_hits=len(hits), expected="160g", actual=col.get_config(core.PX_KEY).get("w1"))

    restore()
    es = finds.EventStore(str(base / "user_files/events.json"), lambda: col)
    ev = finds.clean(None)
    fid = finds.BY_SCENE["yard"][0]
    ev["found"][fid] = {"d": DAY.isoformat(), "n": 1}
    es.save(ev)
    with unreadable(col, finds.EVENT_KEY) as hits:
        ev = es.load()
        finds.ensure_day(ev, [], DAY)
        es.save(ev)
    check("read-failure/collection/retain-known-items", fid in es.load()["found"],
          fault_hits=len(hits), expected_found=fid, actual_found=list(es.load()["found"]))

    # Mốc dùng để bù xu cũng phải được giữ: lỗi đọc một lần không được khởi tạo lại sổ.
    restore()
    d = state.load()
    d["mobile"] = core.new_mobile(1000000000000)
    state.save(d)
    key = core.MOBILE_KEY
    before = col.get_config(key)
    with unreadable(col, key) as hits:
        state.add_coins(1)
    check("read-failure/mobile/ledger-retained", col.get_config(key) == before,
          fault_hits=len(hits), before=before, after=col.get_config(key))
    col.close()


try:
    with tempfile.TemporaryDirectory(prefix="kb-read-audit-") as folder:
        main(Path(folder))
except Exception as exc:
    import traceback
    traceback.print_exc()
    ROWS.append({"case": "harness", "passed": False, "error": str(exc)})
finally:
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"tested_commit": "9ef5272f6af34c78168d2b8851259add29bf2561",
                                   "results": ROWS}, ensure_ascii=False, indent=2) + "\n")
failures = sum(not row["passed"] for row in ROWS)
print(f"READ STORAGE AUDIT {len(ROWS)-failures}/{len(ROWS)}; {failures} failed")
sys.exit(2 if any(r["case"] == "harness" for r in ROWS) else 1 if failures else 0)
