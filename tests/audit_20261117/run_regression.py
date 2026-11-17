"""Chạy các kịch bản UI có sẵn với hồ sơ riêng; không đổi assertions.

Dùng --shard 0, 1, 2 trong ba tiến trình nếu muốn chạy song song. Bỏ riêng
e2e_1253 (runner cũ tắt mọi Anki), đồng bộ thật và cập nhật (runner nhiều pha).
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("addon", type=Path)
ap.add_argument("out", type=Path)
ap.add_argument("--shard", type=int, default=0, choices=range(3))
args = ap.parse_args()
out = args.out.resolve()
out.mkdir(parents=True, exist_ok=True)
skip = {"e2e_1253.js", "e2e_1312.js", "e2e_capnhat.js", "e2e_1332.js"}
scripts = [p for p in sorted((ROOT / "tests/anki").glob("e2e*.js")) if p.name not in skip][args.shard::3]
results = []
for script in scripts:
    name = script.stem
    env = dict(os.environ, KB_AUDIT_BASELINE="1", KB_REAL_GEMINI="0",
               KB_CDP_PORT=str(12001 + args.shard * 10), KB_CTRL_PORT=str(12002 + args.shard * 10))
    target = script
    if script.name in ("e2e.js", "e2e_120.js", "e2e_123.js"):
        target = ROOT / "tests/audit_20261114/baseline_provider.js"
        env["KB_BASELINE_SCENARIO"] = script.name
    log = out / (name + ".log")
    with log.open("w") as f:
        try:
            run = subprocess.run(["bash", str(ROOT / "tests/audit_20261114/run_ui_audit.sh"),
                                  str(args.addon.resolve()), str(out / name), str(target)],
                                 cwd=ROOT, env=env, stdout=f, stderr=subprocess.STDOUT, timeout=600)
            rc = run.returncode
        except subprocess.TimeoutExpired:
            rc = 124
    text = log.read_text()
    failed_assertions = re.findall(r"(?m)^\s*(?:✗|FAIL(?:\s|:)).*$", text)
    summary = re.findall(r"(?m)^.*(?:KẾT QUẢ|AUDIT|TỔNG:).*$", text)[-3:]
    row = dict(script=script.name, exit_code=rc, passed=rc == 0 and not failed_assertions,
               failed_assertions=failed_assertions, summary=summary)
    results.append(row)
    (out / ("regression-" + str(args.shard) + ".json")).write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(row, ensure_ascii=False), flush=True)
raise SystemExit(1 if any(not r["passed"] for r in results) else 0)
