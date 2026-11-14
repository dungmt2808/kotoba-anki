"""Final-pass fault injection at real Anki collection/config persistence boundaries.

All collections and backup files are temporary. A failed assertion denotes
false success or a purchase which does not survive a read after a write error.
No source files or Anki installation files are modified.
"""
from __future__ import annotations
import argparse
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", nargs="?", default=str(ROOT / "kotoba_batake"))
ap.add_argument("--out", required=True)
args = ap.parse_args()
sys.path.insert(0, str(Path(args.addon).resolve()))
from anki.collection import Collection
import garden_core as core

RESULTS = []

def check(case, actual, expected, detail=None):
    row = {"case": case, "pass": actual == expected, "actual": actual, "expected": expected}
    if detail is not None:
        row["detail"] = detail
    RESULTS.append(row)
    if not row["pass"]:
        print("FAIL " + json.dumps(row, ensure_ascii=False))

def fresh(base, index):
    folder = Path(base) / str(index)
    folder.mkdir()
    col = Collection(str(folder / "collection.anki2"))
    state = core.GardenState(str(folder / "state.json"), col_getter=lambda: col)
    state.today_override = 1000
    data = state.load()
    data["coins"] = 1000
    data["home"].update(house=7, rooms=["kitchen", "bedroom"])
    state.save(data)
    state.save_px({})  # A valid existing config prevents the stale value falling back to a new file.
    return col, state

def purchase_matrix(base):
    specs = [
        ("shell", lambda s: s.mywear_save({"slot":"shell", "c":["g","G"], "name":"Fault shell"}),
         (core.CONFIG_KEY, core.MORE_KEY)),
        ("hat", lambda s: s.mywear_save({"slot":"head", "px":"160r", "name":"Fault hat"}),
         (core.CONFIG_KEY, core.MORE_KEY, core.PX_KEY)),
        ("hat-edit", lambda s: s.mywear_save({"id":"w1","slot":"head","px":"160g","name":"Edited hat"}),
         (core.CONFIG_KEY, core.MORE_KEY, core.PX_KEY)),
        ("floor", lambda s: s.tile_save({"kind":"floor", "px":"256g", "name":"Fault floor"}),
         (core.CONFIG_KEY, core.MORE_KEY, core.PX_KEY)),
        ("furniture", lambda s: s.craft_save({"size":16,"kind":"floor","px":"256r","name":"Fault chair"}),
         (core.CONFIG_KEY, core.NHA_KEY, core.PX_KEY)),
        ("subscription", lambda s: s.paper_sub_buy("tuan", "2026-11-14"),
         (core.CONFIG_KEY, core.MORE_KEY)),
    ]
    index = 0
    for name, operation, keys in specs:
        for fail_key in (None, *keys):
            for failure_kind in ("none",) if fail_key is None else ("one-shot", "persistent"):
                index += 1
                col, state = fresh(base, index)
                if name == "hat-edit":
                    state.mywear_save({"slot":"head","px":"160r","name":"Original hat"})
                original = Collection.set_config
                fired = []
                def failing(self, key, value, *a, **kw):
                    if self is col and key == fail_key and (failure_kind == "persistent" or not fired):
                        fired.append(key)
                        raise OSError(28, "Synthetic storage full at collection.set_config")
                    return original(self, key, value, *a, **kw)
                error, reported = "", None
                console = io.StringIO()
                try:
                    with contextlib.redirect_stdout(console), patch.object(Collection, "set_config", failing):
                        reported = operation(state)
                except Exception as exc:
                    error = type(exc).__name__ + ": " + str(exc)
                try:
                    actual = state.load()
                    if reported is None:
                        durable = None
                        reported_coins = None
                    else:
                        reported_coins = reported["coins"]
                        durable = (actual["coins"] == reported["coins"]
                                   and actual["home"] == reported["home"]
                                   and actual["more"]["mywear"] == reported["more"]["mywear"]
                                   and actual["more"]["decor"] == reported["more"]["decor"]
                                   and actual["craft"] == reported["craft"]
                                   and actual["more"]["paper_sub"] == reported["more"]["paper_sub"])
                        if name == "hat" and reported.get("mywear_id"):
                            durable = durable and bool(state.load_px().get(reported["mywear_id"]))
                        if name == "hat-edit":
                            durable = durable and state.load_px().get("w1") == "160g"
                        if name == "floor" and reported.get("tile_id"):
                            durable = durable and bool(state.load_px().get(reported["tile_id"]))
                        if name == "furniture" and reported.get("craft_id"):
                            durable = durable and bool(state.load_px().get(reported["craft_id"]))
                    # Do not require all failed writes to be rejected if the API
                    # implements successful recovery. It must never claim success
                    # while the reloaded data disagrees with that claim.
                    check(f"persistence/{name}/{fail_key or 'control'}/{failure_kind}/no-false-success",
                          bool(error) or bool(durable), True,
                          {"fault_injected":bool(fired), "raised":error, "durable":durable,
                           "reported_coins":reported_coins,"actual_coins":actual["coins"],
                           "mywear_ids":list(actual["more"]["mywear"]["items"]),
                           "pixel_ids":list(state.load_px()), "actual_pixels":state.load_px(),
                           "expected_edited_hat":"160g" if name=="hat-edit" else None,
                           "console":console.getvalue()})
                    if fail_key:
                        check(f"persistence/{name}/{fail_key}/{failure_kind}/fault-reached", bool(fired), True)
                    persisted_before_close = {
                        "coins":actual["coins"], "mywear":actual["more"]["mywear"],
                        "decor":actual["more"]["decor"], "craft":actual["craft"],
                        "home":actual["home"], "pixels":state.load_px(),
                    }
                    db_path = col.path
                    col.close()
                    col = Collection(db_path)
                    state.col_getter = lambda: col
                    reopened = state.load()
                    check(f"persistence/{name}/{fail_key or 'control'}/{failure_kind}/confirmed-after-reopen",
                          {"coins":reopened["coins"],"mywear":reopened["more"]["mywear"],
                           "decor":reopened["more"]["decor"],"craft":reopened["craft"],
                           "home":reopened["home"],"pixels":state.load_px()},persisted_before_close)
                finally:
                    col.close()

def backup_only_failure(base):
    col, state = fresh(base, "backup-only")
    with patch.object(core.os, "replace", side_effect=OSError(28, "Synthetic backup full")):
        with contextlib.redirect_stdout(io.StringIO()):
            reported = state.mywear_save({"slot":"head","px":"160r","name":"Main database still works"})
    wid = reported["mywear_id"]
    actual = state.load()
    check("persistence/backup-only-error/collection-remains-authoritative",
          [actual["coins"],wid in actual["more"]["mywear"]["items"],wid in state.load_px()],
          [800,True,True])
    col.close()

def sqlite_backend_failure(base):
    """Make SQLite itself fail, without replacing Python's set_config method."""
    col, state = fresh(base, "sqlite-trigger")
    try:
        for event in ("INSERT", "UPDATE"):
            col.db.execute(
                f"CREATE TRIGGER audit_fail_more_{event.lower()} BEFORE {event} ON config "
                "WHEN NEW.key = 'kotoba_batake_more' BEGIN "
                "SELECT RAISE(ABORT, 'Synthetic SQLITE failure'); END"
            )
        console = io.StringIO()
        with contextlib.redirect_stdout(console):
            reported = state.mywear_save({"slot":"shell","c":["g","G"],"name":"SQLite failure"})
        actual = state.load()
        check("persistence/sqlite-trigger/backend-error-reached", "SqliteFailure" in console.getvalue(), True,
              {"console":console.getvalue()})
        check("persistence/sqlite-trigger/no-false-success",
              [actual["coins"],list(actual["more"]["mywear"]["items"])],
              [reported["coins"],list(reported["more"]["mywear"]["items"])])
        for event in ("insert", "update"):
            col.db.execute(f"DROP TRIGGER audit_fail_more_{event}")
        recovered = state.mywear_save({"slot":"shell","c":["g","G"],"name":"After SQLite recovered"})
        actual = state.load()
        check("persistence/sqlite-trigger/normal-write-works-after-fault-removed",
              [actual["coins"],list(actual["more"]["mywear"]["items"])],
              [recovered["coins"],list(recovered["more"]["mywear"]["items"])])
    finally:
        col.close()

with tempfile.TemporaryDirectory(prefix="kotoba-deep-storage-") as base:
    for name, fn in (("matrix", lambda: purchase_matrix(base)), ("backup-only", lambda: backup_only_failure(base)),
                     ("sqlite-backend", lambda: sqlite_backend_failure(base))):
        try:
            fn()
        except Exception as exc:
            check("harness/"+name,type(exc).__name__+": "+str(exc),"completed")
out = {"cases":len(RESULTS),"passed":sum(r["pass"] for r in RESULTS),
       "failed":sum(not r["pass"] for r in RESULTS),"results":RESULTS}
Path(args.out).parent.mkdir(parents=True,exist_ok=True)
Path(args.out).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print("DEEP STORAGE {passed}/{cases}; {failed} failed".format(**out))
sys.exit(1 if out["failed"] else 0)
