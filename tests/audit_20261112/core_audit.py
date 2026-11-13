"""Independent release audit, 2026-11-12. Does not change production source.

Run: python3 tests/audit_20261112/core_audit.py [ADDON] --out /tmp/core.json
An exit code of 1 means a behavioral expectation failed; see the linked audit.
Uses temporary state and SQLite, never an existing Anki profile or a network API.
"""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import itertools
import json
import os
from pathlib import Path
import random
import sqlite3
import sys
import tempfile
import time
from types import SimpleNamespace
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", nargs="?", default=str(ROOT / "kotoba_batake"))
ap.add_argument("--out", default="/tmp/kotoba-core-audit.json")
args = ap.parse_args()
sys.path.insert(0, str(Path(args.addon).resolve()))
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, str(ROOT / "tests" / "stubs"))
import garden_core as core
import more_core as more
import journal_core as journal
share = core.share  # garden_core wires its independently loaded helper modules.

RESULTS = []


def check(case, actual, expected, finding=None, detail=None):
    row = {"case": case, "pass": actual == expected, "actual": actual, "expected": expected}
    if finding:
        row["finding"] = finding
    if detail:
        row["detail"] = detail
    RESULTS.append(row)
    if not row["pass"]:
        print("FAIL " + json.dumps(row, ensure_ascii=False, default=str))


class DB:
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.execute("create table revlog(id integer,cid integer,type integer,ivl integer,lastIvl integer)")

    def list(self, sql, *params):
        return [r[0] for r in self.conn.execute(sql, params)]

    def scalar(self, sql, *params):
        return self.conn.execute(sql, params).fetchone()[0]

    def all(self, sql, *params):
        return self.conn.execute(sql, params).fetchall()

    def add(self, stamp, cid=1, kind=1):
        self.conn.execute("insert into revlog values(?,?,?,?,?)", (int(stamp * 1000), cid, kind, 90, 30))


def col_for(today, zone="UTC"):
    cutoff = dt.datetime.combine(today + dt.timedelta(days=1), dt.time(4), ZoneInfo(zone)).timestamp()
    return SimpleNamespace(db=DB(), sched=SimpleNamespace(day_cutoff=int(cutoff), today=1000))


def time_buckets():
    old_tz = os.environ.get("TZ")
    try:
        # Both directions of one-hour DST, half-hour DST, and three control zones.
        zones = {
            "UTC": ("2026-03-08", "2026-11-01"),
            "Asia/Ho_Chi_Minh": ("2026-03-08", "2026-11-01"),
            "Asia/Tokyo": ("2026-03-08", "2026-11-01"),
            "America/New_York": ("2026-03-08", "2026-11-01"),
            "Europe/Berlin": ("2026-03-29", "2026-10-25"),
            "Australia/Lord_Howe": ("2026-04-05", "2026-10-04"),
        }
        for zone, dates in zones.items():
            os.environ["TZ"] = zone
            time.tzset()
            for ds in dates:
                today = dt.date.fromisoformat(ds)
                for ago, hh, mm in itertools.product((0, 1, 2), (0, 3, 4, 12, 23), (1, 30)):
                    wall = dt.datetime.combine(today - dt.timedelta(days=ago), dt.time(hh, mm), ZoneInfo(zone))
                    # Only history already available at noon on the tested Anki day.
                    if wall > dt.datetime.combine(today, dt.time(12, 30), ZoneInfo(zone)):
                        continue
                    col = col_for(today, zone)
                    col.db.add(wall.timestamp())
                    expected_date = wall.date() - dt.timedelta(days=int(hh < 4))
                    expected_rel = (expected_date - today).days
                    base = "time/%s/%s/%s" % (zone, ds, wall.strftime("%d-%H:%M"))
                    days, actual_today = core.review_days(col)
                    buckets = journal.revlog_days(col, today - dt.timedelta(days=4), today)
                    check(base, {"day": actual_today.isoformat(), "rel": sorted(days), "calendar": sorted(buckets)},
                          {"day": today.isoformat(), "rel": [expected_rel], "calendar": [expected_date.isoformat()]}, "F02")
                    col.db.conn.close()
        # Cost consequence, not only a display assertion.
        os.environ["TZ"] = "America/New_York"
        time.tzset()
        today = dt.date(2026, 11, 1)
        col = col_for(today, "America/New_York")
        for day, hour, minute in ((31, 4, 30), (1, 12, 0)):
            col.db.add(dt.datetime(2026, 10 if day == 31 else 11, day, hour, minute, tzinfo=ZoneInfo("America/New_York")).timestamp())
        fz = {"n": 1, "since": "2026-10-30", "days": []}
        used = more.freeze_settle(fz, core.review_days(col)[0], today)
        check("time/DST/must-not-spend-ticket-on-reviewed-day", {"used": used, "stock": fz["n"]}, {"used": [], "stock": 1}, "F02")
        col.db.conn.close()
    finally:
        if old_tz is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = old_tz
        time.tzset()


def long_streaks():
    old_tz = os.environ.get("TZ")
    os.environ["TZ"] = "UTC"
    time.tzset()
    try:
        for n in (0, 1, 7, 30, 399, 400, 401, 402, 500, 730, 1000):
            col = col_for(dt.date(2026, 11, 12))
            start = col.sched.day_cutoff - 86400
            for i in range(n):
                col.db.add(start - i * 86400 + 3600, cid=i + 1)
            check("streak/consecutive-%d-days" % n, core.daily_stats(col)["streak"], n, "F03")
            check("total/all-time-%d-days" % n, core.review_day_total(col), n)
            col.db.conn.close()
    finally:
        if old_tz is None:
            os.environ.pop("TZ", None)
        else:
            os.environ["TZ"] = old_tz
        time.tzset()


def reference_streak(reviewed, covered):
    # Independent oracle: enumerate which gaps tickets could cover, then maximize
    # the number of *real study days*. No simulated version of freeze_settle.
    start = 0 if 0 in reviewed else -1
    connected = []
    for d in range(start, -25, -1):
        if d not in reviewed and d not in covered:
            break
        connected.append(d)
    return len(set(connected) & reviewed)


def freeze_model():
    rng = random.Random(20261112)
    today = dt.date(2026, 11, 12)
    for trial in range(40):
        reviewed = {d for d in range(-12, 1) if rng.random() < 0.68}
        for stock, age in itertools.product(range(3), (0, 3, 12)):
            fz = {"n": stock, "days": [], "since": (today - dt.timedelta(days=age)).isoformat()}
            eligible = sorted(set(range(-age, 0)) - reviewed)
            choices = [set(c) for k in range(stock + 1) for c in itertools.combinations(eligible, k)]
            best = max(reference_streak(reviewed, c) for c in choices)
            used = more.freeze_settle(fz, reviewed, today)
            actual = more.streak_with(reviewed, more.frozen_rel(fz["days"], today))
            valid = all(-age <= (dt.date.fromisoformat(x) - today).days < 0 for x in used)
            again = more.freeze_settle(fz, reviewed, today)
            check("freeze/model/%d/stock%d/age%d" % (trial, stock, age),
                  [actual, stock - fz["n"], valid, again], [best, len(used), True, []],
                  detail={"reviews": sorted(reviewed)})


def fresh(base, name, coins=20000):
    folder = Path(base) / name
    folder.mkdir()
    state = core.GardenState(str(folder / "state.json"))
    state.today_override = 1000
    data = state.load()
    data["coins"] = coins
    data["home"]["house"] = 7
    data["home"]["rooms"] = ["kitchen", "bedroom"]
    state.save(data)
    return state


def malformed_room_records(base):
    for scene, bad in itertools.product(("kitchen", "bedroom"), ([], {}, None, 5, "future-item")):
        label = scene + "-" + type(bad).__name__
        st = fresh(base, label)
        item = st.craft_save({"name": "Audit chair", "kind": "floor", "size": 16, "fx": "none", "px": "256r"})["craft_id"]
        st.place(scene, item, 0, 1)
        before = copy.deepcopy(st.load()["home"])
        path = Path(st._nha_path())
        raw = json.loads(path.read_text())
        raw["places"].setdefault(scene, []).append({"id": bad, "x": 7, "y": 2})
        path.write_text(json.dumps(raw))
        loaded = st.load()
        st.add_coins(1)  # Ordinary next save must not erase the purchased expansion.
        after = st.load()["home"]
        check("rooms/one-bad-id/" + label,
              {"rooms_on_load": loaded["home"]["rooms"], "rooms_after_save": after["rooms"], "valid_item_after_save": after[scene]},
              {"rooms_on_load": before["rooms"], "rooms_after_save": before["rooms"], "valid_item_after_save": before[scene]}, "F06")


def money_and_state(base):
    today = dt.date(2026, 11, 12)
    for cost, op in ((150, lambda s: s.freeze_buy(today)),
                     (200, lambda s: s.craft_save({"name": "audit", "kind": "floor", "size": 16, "px": "256r"})),
                     (500, lambda s: s.myseed_save({"name": "audit", "st": ["256r"] * 3 + ["", ""]})),
                     (100, lambda s: s.paper_sub_buy("tuan", today.isoformat()))):
        for coins in (0, cost - 1, cost, cost + 1):
            st = fresh(base, "funds-%d-%d" % (cost, coins), coins)
            before = copy.deepcopy(st.load())
            rejected = False
            try:
                op(st)
            except core.HomeError:
                rejected = True
            after = st.load()
            check("funds/%d/coins%d" % (cost, coins),
                  [rejected, after["coins"], after == before if rejected else True],
                  [coins < cost, coins if coins < cost else coins - cost, True])
    st = fresh(base, "ticket-limit")
    for _ in range(2):
        st.freeze_buy(today)
    coins = st.load()["coins"]
    for n in range(5):
        try:
            st.freeze_buy(today)
        except core.HomeError:
            pass
        check("ticket-cap/repeated-%d" % n, [st.load()["more"]["freeze"]["n"], st.load()["coins"]], [2, coins])
    st = fresh(base, "game-cap")
    for n in range(20):
        st.record_game(core.GAMES[n % len(core.GAMES)], n, 10, today.isoformat(), 40)
    check("game/cap-across-all-modes", [st.load()["game_coins"], st.load()["coins"]], [40, 20040])
    st.record_game("crow", 1, 50, (today + dt.timedelta(days=1)).isoformat(), 0)
    check("game/zero-cap-on-next-day", [st.load()["game_coins"], st.load()["coins"]], [0, 20040])


def share_inputs():
    rng = random.Random(126)
    def parse(code):
        return share.parse_code(code, core.CRAFT_PALETTE, core.CRAFT_PRICES, core.CRAFT_KINDS, core.CRAFT_FX)
    for size, kind, fx in itertools.product((16, 24, 32), core.CRAFT_KINDS, ("none", "glow")):
        flat = "".join(rng.choice(".rgwy") for _ in range(size * size))
        meta = {"name": "Ghế mùa đông ☃", "size": size, "kind": kind, "fx": fx}
        code = share.code_item(meta, core.px_encode(flat))
        got = parse(" \n".join(code[i:i + 60] for i in range(0, len(code), 60)))
        check("share/roundtrip/%s/%s/%s" % (size, kind, fx),
              [got["size"], got["kind"], got["fx"], core.px_decode(got["px"], size)], [size, kind, fx, flat])
    malformed = (None, [], "", "KB2:x", "KB1:broken", "z" * (share.CODE_MAX * 2 + 1),
                 share.make_code("m", "16", "x", ["floor", "none", "9999r"]),
                 share.make_code("m", "16", "x", ["floor", "none", "r" * (share.DATA_MAX + 1)]),
                 share.code_item({"name": "x", "size": 16, "kind": "floor"}, "256r")[:-1] + "!")
    for i, code in enumerate(malformed):
        rejected = False
        try:
            parse(code)
        except share.ShareError:
            rejected = True
        check("share/reject-%d" % i, rejected, True)


with tempfile.TemporaryDirectory(prefix="kotoba-audit-core-") as tmp:
    for name, fn in (("time-buckets", time_buckets), ("long-streaks", long_streaks), ("freeze-model", freeze_model),
                     ("room-corruption", lambda: malformed_room_records(tmp)),
                     ("funds-and-state", lambda: money_and_state(tmp)), ("share-inputs", share_inputs)):
        try:
            fn()
        except Exception as exc:
            check("harness/" + name, type(exc).__name__ + ": " + str(exc), "completed")

out = {"seed": 20261112, "addon": str(Path(args.addon).resolve()), "cases": len(RESULTS),
       "passed": sum(r["pass"] for r in RESULTS), "failed": sum(not r["pass"] for r in RESULTS), "results": RESULTS}
Path(args.out).parent.mkdir(parents=True, exist_ok=True)
Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str) + "\n")
print("CORE AUDIT: {passed}/{cases} passed; {failed} failed. {out}".format(**out, out=args.out))
sys.exit(1 if out["failed"] else 0)
