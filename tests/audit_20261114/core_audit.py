"""Independent 1.31 audit: corrupt storage, money boundaries, pixel roundtrips,
and actual 1.30.3 code changing outfits after 1.31 has equipped a custom item.

Uses temporary files only. Exit 1 denotes a reproduced behavioral failure.
Run: ANKI_PY=... python tests/audit_20261114/core_audit.py [ADDON] --out result.json
"""
from __future__ import annotations

import argparse
import copy
import io
import json
import os
from pathlib import Path
import random
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", nargs="?", default=str(ROOT / "kotoba_batake"))
ap.add_argument("--out", required=True)
args = ap.parse_args()
sys.path.insert(0, str(Path(args.addon).resolve()))
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, str(ROOT / "tests/stubs"))
import garden_core as core

SEED = 20261114
RESULTS = []


def check(case, actual, expected, detail=None):
    row = dict(case=case, passed=actual == expected, actual=actual, expected=expected)
    if detail is not None:
        row["detail"] = detail
    RESULTS.append(row)
    if not row["passed"]:
        print("FAIL " + json.dumps(row, ensure_ascii=False))


def fresh(base, name, coins=100000):
    folder = Path(base) / name
    folder.mkdir()
    state = core.GardenState(str(folder / "state.json"))
    state.today_override = 1000
    data = state.load()
    data["coins"] = coins
    data["home"].update(house=7, rooms=["kitchen", "bedroom"])
    state.save(data)
    return state


def paths(obj, prefix=()):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield prefix + (key,)
            yield from paths(value, prefix + (key,))
    elif isinstance(obj, list):
        for key, value in enumerate(obj):
            yield prefix + (key,)
            yield from paths(value, prefix + (key,))


def corruption(base):
    st = fresh(base, "corruption")
    st.mywear_save(dict(name="Audit hat", slot="head", px="160r"))
    st.mywear_save(dict(name="Audit shell", slot="shell", c=["r", "k"]))
    st.tile_save(dict(name="Audit wall", kind="wall", px="256r"))
    st.craft_save(dict(name="Audit chair", kind="floor", size=16, px="256r"))
    st.pet_buy("shiba")
    folder = Path(st.path).parent
    snapshots = {p.name: p.read_text() for p in folder.glob("*.json")}
    bads = [None, True, False, 0, -1, 1.5, "", "bad", [], {}, [None], {"x": []}]
    for fname, src in snapshots.items():
        original = json.loads(src)
        for at in list(paths(original)):
            for index, bad in enumerate(bads):
                obj = copy.deepcopy(original)
                target = obj
                for key in at[:-1]:
                    target = target[key]
                target[at[-1]] = copy.deepcopy(bad)
                for name, text in snapshots.items():
                    (folder / name).write_text(text)
                (folder / fname).write_text(json.dumps(obj))
                error = ""
                try:
                    loaded = st.load()
                    px = st.load_px()
                    core.home_catalog(loaded, px)
                except Exception as exc:
                    error = type(exc).__name__ + ": " + str(exc)
                check("corrupt/" + fname + "/" + "/".join(map(str, at)) + "/" + str(index), error, "")


def money(base):
    for slot in core.wear.SLOTS:
        price = core.wear.SHELL_PRICE if slot == "shell" else core.wear.PRICE
        payload = dict(name="Audit " + slot, slot=slot)
        if slot == "shell":
            payload["c"] = ["r", "k"]
        else:
            w, h, _ = core.wear.GRID[slot]
            payload["px"] = str(w * h) + "r"
        for coins in (0, price - 1, price, price + 1, 100000):
            st = fresh(base, f"money-{slot}-{coins}", coins)
            before, px_before = st.load(), st.load_px()
            rejected = False
            try:
                st.mywear_save(payload)
            except core.HomeError:
                rejected = True
            after, px_after = st.load(), st.load_px()
            check(f"money/{slot}/{coins}/debit", [rejected, after["coins"]],
                  [coins < price, coins if coins < price else coins - price])
            if rejected:
                check(f"money/{slot}/{coins}/rejection-atomic", [after, px_after], [before, px_before])
                continue
            wid = next(iter(after["more"]["mywear"]["items"]))
            old_coins = after["coins"]
            rename = dict(payload, id=wid, name="Đổi tên miễn phí")
            st.mywear_save(rename)
            check(f"money/{slot}/{coins}/rename-free", st.load()["coins"], old_coins)
            new_payload = dict(rename)
            if slot == "shell":
                new_payload["c"] = ["g", "k"]
            else:
                new_payload["px"] = payload["px"][:-1] + "g"
            before, px_before = st.load(), st.load_px()
            try:
                st.mywear_save(new_payload)
                rejected = False
            except core.HomeError:
                rejected = True
            check(f"money/{slot}/{coins}/edit-debit", [rejected, st.load()["coins"]],
                  [old_coins < core.wear.EDIT, old_coins if old_coins < core.wear.EDIT else old_coins - core.wear.EDIT])
            if rejected:
                check(f"money/{slot}/{coins}/edit-atomic", [st.load(), st.load_px()], [before, px_before])
            st.mywear_delete(wid)
            check(f"money/{slot}/{coins}/delete-cleans-refs", [wid in st.load_px(), bool(st.load()["more"]["mywear"]["on"])], [False, False])


def pixels():
    rng = random.Random(SEED)
    palette = core.CRAFT_PALETTE
    colors = ["."] + list(palette)
    for slot, (w, h, _) in core.wear.GRID.items():
        for color in colors:
            flat = color * (w * h)
            encoded = core.more.px_encode(flat)
            check(f"pixels/{slot}/solid-{color}", core.more.px_decode_wh(encoded, w, h, palette), flat)
        for index in range(w * h):
            flat = ["."] * (w * h)
            flat[index] = rng.choice(list(palette))
            encoded = core.more.px_encode("".join(flat))
            check(f"pixels/{slot}/single-pixel-{index}", core.more.px_decode_wh(encoded, w, h, palette), "".join(flat))


def mixed_versions(base):
    # The existing compatibility test only adds coins/buys furniture on old code.
    # Here an actual old version explicitly buys a replacement for the same slot.
    blob = subprocess.check_output(["git", "archive", "36bb57b", "kotoba_batake"], cwd=ROOT)
    old_root = Path(base) / "old"
    old_root.mkdir()
    with tarfile.open(fileobj=io.BytesIO(blob)) as tf:
        for entry in tf.getmembers():
            if entry.isfile() and entry.name.endswith(".py"):
                output = old_root / entry.name
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(tf.extractfile(entry).read())
    python = os.environ.get("ANKI_PY", sys.executable)
    for slot, builtin in (("head", "straw"), ("face", "glasses"), ("neck", "bow"), ("shell", "sky")):
        st = fresh(base, "mixed-" + slot)
        payload = dict(name="Custom " + slot, slot=slot)
        if slot == "shell":
            payload["c"] = ["r", "k"]
        else:
            w, h, _ = core.wear.GRID[slot]
            payload["px"] = str(w * h) + "r"
        wid = st.mywear_save(payload)["mywear_id"]
        program = (
            "import sys; sys.path.insert(0,sys.argv[1]); sys.path.insert(1,sys.argv[4]); "
            "import garden_core as c; s=c.GardenState(sys.argv[2]); s.today_override=1000; s.buy_wear(sys.argv[3])"
        )
        subprocess.run([python, "-c", program, str(old_root / "kotoba_batake"), st.path, builtin, str(ROOT / "tests/stubs")],
                       check=True, capture_output=True, text=True)
        loaded = st.load()
        normal = loaded["wear"]["on"].get(slot)
        custom = loaded["more"]["mywear"]["on"].get(slot)
        check("mixed-version/" + slot + "/one-item-per-slot", [normal, custom], [builtin, None],
              {"new_version": "1.31.0", "old_commit": "36bb57b", "operation": "buy_wear(" + builtin + ")", "custom_id": wid})
        check("mixed-version/" + slot + "/custom-design-preserved", wid in loaded["more"]["mywear"]["items"], True)


with tempfile.TemporaryDirectory(prefix="kotoba-audit-131-") as base:
    for name, fn in (("corruption", lambda: corruption(base)), ("money", lambda: money(base)),
                     ("pixels", pixels), ("mixed-versions", lambda: mixed_versions(base))):
        try:
            fn()
        except Exception as exc:
            check("harness/" + name, type(exc).__name__ + ": " + str(exc), "completed")

out = dict(seed=SEED, cases=len(RESULTS), passed=sum(r["passed"] for r in RESULTS),
           failed=sum(not r["passed"] for r in RESULTS), results=RESULTS)
Path(args.out).parent.mkdir(parents=True, exist_ok=True)
Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print("CORE AUDIT {passed}/{cases}; {failed} failed".format(**out))
sys.exit(1 if out["failed"] else 0)
