"""Vòng 2: thử lại sau lỗi khôi phục đồng bộ, và tiến trình dừng giữa lúc lưu.

Collection/scheduler Anki thật, file trong thư mục tạm. Không sửa mã sản phẩm.
Exit 1 = bất biến trượt; exit 2 = lỗi thiết lập.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import copy
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", type=Path)
ap.add_argument("--out", type=Path, required=True)
args = ap.parse_args()
sys.path.insert(0, str(args.addon.resolve()))
from anki.collection import Collection
import garden_core as core
import backup_core as backup
import journal_core as journal
import sync_core as sync

ROWS = []
DAY = dt.date(2026, 11, 17)


def check(case, actual, expected, detail=None):
    row = dict(case=case, passed=actual == expected, actual=actual, expected=expected)
    if detail is not None:
        row["detail"] = detail
    ROWS.append(row)
    print(("PASS " if row["passed"] else "FAIL ") + json.dumps(row, ensure_ascii=False), flush=True)


@contextmanager
def fail_write_once(col, target):
    original = Collection.set_config
    hits = []

    def faulty(self, key, value, *a, **kw):
        if self is col and key == target and not hits:
            hits.append(key)
            raise OSError("AUDIT: lỗi ghi một lần khi trả lại bản mới")
        return original(self, key, value, *a, **kw)

    Collection.set_config = faulty
    try:
        yield hits
    finally:
        Collection.set_config = original


def make_sync_case(base):
    base.mkdir()
    col = Collection(str(base / "collection.anki2"))
    user = base / "user_files"
    state = core.GardenState(str(user / "state.json"), lambda: col)
    state.today_override = col.sched.today
    data = state.load()
    data["coins"] = 1000
    data["home"]["house"] = 7
    state.save(data)
    backup.put_config(col, core.START_KEY, {"ms": 1000000000000})
    diary = journal.JournalStore(str(user / "journal"), lambda: col)
    diary.update(DAY, {"t": "Nhật ký bản cũ"})
    old = copy.deepcopy(sync.state_of(col))
    state.pet_buy("neko")
    data = state.load()
    data["coins"] = 2000
    state.save(data)
    diary.update(DAY, {"t": "Nhật ký bản mới cần giữ"})
    mine = sync.before_sync(col, str(user))
    assert mine is not None
    for key, value in old["keys"].items():
        col.set_config(key, value)  # mô phỏng cấu hình cũ vừa mang về; không giả logic sync_core
    return col, user, state, diary, old, mine


def recovery_matrix(base):
    targets = (core.CONFIG_KEY, core.MORE_KEY, journal.month_key(DAY.year, DAY.month))
    for i, target in enumerate(targets):
        for route in ("reopen", "sync-again", "edit-after-failure"):
            folder = base / f"restore-{i}-{route}"
            col, user, state, diary, old, mine = make_sync_case(folder)
            prefix = f"restore/{target}/{route}"
            with fail_write_once(col, target) as hits:
                failed = sync.after_sync(col, str(user), mine)
            record = sync.read_record(str(user), col)
            check(prefix + "/fault-reached", [len(hits), failed["action"]], [1, sync.FAILED], failed)
            check(prefix + "/good-checkpoint-survives-first-error", record["h"], mine["h"])
            if route == "sync-again":
                before2 = sync.before_sync(col, str(user))
                record2 = sync.read_record(str(user), col)
                sync.after_sync(col, str(user), before2)
            else:
                record2 = record
            if route == "edit-after-failure":
                time.sleep(0.03)
                state.add_coins(1)  # một thao tác vườn hợp lệ sau lỗi; không thay dấu phiên bản bằng tay
            path = col.path
            col.close()
            col = Collection(path)
            state.col_getter = lambda: col
            diary.col_getter = lambda: col
            reopened = sync.on_open(col, str(user))
            actual = dict(coins=state.load()["coins"], pets=list(state.load()["more"]["pets"]),
                          diary=diary.entry(DAY).get("t"))
            expected = dict(coins=2001 if route == "edit-after-failure" else 2000,
                            pets=["neko"], diary="Nhật ký bản mới cần giữ")
            check(prefix + "/eventual-recovery", actual, expected,
                  dict(first_error=failed, checkpoint_after_retry_coins=record2["keys"][core.CONFIG_KEY]["coins"],
                       on_open=reopened))
            col.close()

    # Lỗi lúc chụp trước đồng bộ cũng không nên xóa bản chụp tốt có sẵn.
    col, user, state, diary, old, mine = make_sync_case(base / "snapshot-read-error")
    for key, value in mine["keys"].items():
        col.set_config(key, value)
    original = Collection.all_config

    def failed_read(self, *a, **kw):
        if self is col:
            raise OSError("AUDIT: không chụp được trước đồng bộ")
        return original(self, *a, **kw)

    Collection.all_config = failed_read
    try:
        before = sync.before_sync(col, str(user))
    finally:
        Collection.all_config = original
    check("snapshot-read-error/returns-no-live-snapshot", before, None)
    for key, value in old["keys"].items():
        col.set_config(key, value)
    result = sync.after_sync(col, str(user), before)
    result2 = sync.on_open(col, str(user))
    check("snapshot-read-error/retains-last-good-local-version", state.load()["coins"], 2000,
          dict(after_sync=result, on_open=result2, checkpoint_coins=sync.read_record(str(user), col)["keys"][core.CONFIG_KEY]["coins"]))
    col.close()


CRASH_CHILD = r'''
import os,sys
sys.path.insert(0,sys.argv[1])
from anki.collection import Collection
import garden_core as core
col=Collection(sys.argv[2])
state=core.GardenState(sys.argv[3],lambda:col)
col.decks.select(col.decks.id_for_name("Audit crash"))
queued=col.sched.get_queued_cards(fetch_limit=1).cards[0]
card=col.get_card(queued.card.id);card.start_timer()
col.sched.answer_card(col.sched.build_answer(card=card,states=queued.states,rating=3))
target=sys.argv[4]
original=Collection.set_config
def stop_after_write(self,key,value,*a,**kw):
    result=original(self,key,value,*a,**kw)
    if self is col and key==target:
        os._exit(73)  # dừng sau một lần ghi đã trả về; không ném exception cho rollback
    return result
Collection.set_config=stop_after_write
state.record_answer(3,0,0,day=col.sched.today,before="new")
col.close()
'''


def crash_matrix(base):
    for i, target in enumerate(("none", core.MOBILE_KEY, core.CONFIG_KEY, backup.REV_KEY)):
        folder = base / f"crash-{i}"
        folder.mkdir()
        path = folder / "collection.anki2"
        col = Collection(str(path))
        model = col.models.new("Audit crash model")
        for name in ("Front", "Back"):
            col.models.add_field(model, col.models.new_field(name))
        template = col.models.new_template("T1")
        template["qfmt"] = "{{Front}}"
        template["afmt"] = "{{FrontSide}}<hr>{{Back}}"
        col.models.add_template(model, template)
        col.models.add(model)
        model = col.models.by_name("Audit crash model")
        note = col.new_note(model)
        note["Front"], note["Back"] = "Crash audit", "Thẻ kiểm thử"
        col.add_note(note, col.decks.id("Audit crash"))
        store_path = folder / "user_files/state.json"
        state = core.GardenState(str(store_path), lambda: col)
        data = state.load()
        data["coins"] = 1000
        data["mobile"] = core.new_mobile(int(time.time() * 1000) - 60000)
        state.save(data)
        col.close()
        run = subprocess.run([sys.executable, "-c", CRASH_CHILD, str(args.addon.resolve()),
                              str(path), str(store_path), target], capture_output=True, text=True, timeout=30)
        prefix = "process-stop/" + target
        check(prefix + "/stopped-at-requested-point", run.returncode, 0 if target == "none" else 73,
              {"stderr": run.stderr[-1500:]})
        col = Collection(str(path))
        state = core.GardenState(str(store_path), lambda: col)
        revlog_before = col.db.scalar("select count() from revlog")
        check(prefix + "/real-review-is-durable", revlog_before, 1)
        before = state.load()
        schedule_sql = "select id,nid,did,type,queue,due,ivl,factor,reps,lapses,left,odue,odid,data from cards order by id"
        schedule_before = col.db.all(schedule_sql)
        caught = state.mobile_catch_up(col, goal=999, bonus=0)
        after = state.load()
        check(prefix + "/review-is-paid-after-recovery", after["coins"], 1001,
              dict(coins_before_recovery=before["coins"], mobile=before.get("mobile"), catch_up=caught))
        check(prefix + "/recovery-does-not-change-scheduling",
              {"revlog": col.db.scalar("select count() from revlog"), "cards": col.db.all(schedule_sql)},
              {"revlog": revlog_before, "cards": schedule_before})
        col.close()


try:
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="kb-recovery-round2-", dir=args.out.parent.resolve()) as folder:
        recovery_matrix(Path(folder))
        crash_matrix(Path(folder))
except Exception as exc:
    import traceback
    traceback.print_exc()
    ROWS.append(dict(case="harness", passed=False, error=str(exc)))
finally:
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(dict(tested_commit="9ef5272f6af34c78168d2b8851259add29bf2561", results=ROWS),
                                   ensure_ascii=False, indent=2) + "\n")
failed = sum(not row["passed"] for row in ROWS)
print(f"RECOVERY ROUND2 {len(ROWS)-failed}/{len(ROWS)}; {failed} failed")
raise SystemExit(2 if any(r["case"] == "harness" for r in ROWS) else 1 if failed else 0)
