"""Bọc e2e_capnhat.js gốc: cài đè thật, chỉ dừng tiến trình do mình tạo.

Không dùng kill_anki.sh vì có các hồ sơ test khác chạy song song.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("old", type=Path)
ap.add_argument("new", type=Path)
ap.add_argument("out", type=Path)
args = ap.parse_args()
out = args.out.resolve()
out.mkdir(parents=True, exist_ok=True)
py = os.environ.get("ANKI_PY", "python3")
env = dict(os.environ, GEMINI_API_KEY="", KB_CDP_PORT="12301", KB_CTRL_PORT="12302",
           ANKI_SINGLE_INSTANCE_KEY="kb-upgrade-" + str(os.getpid()),
           USER="kb-upgrade-" + str(os.getpid()), LOGNAME="kb-upgrade-" + str(os.getpid()),
           QT_QPA_PLATFORM="offscreen", QTWEBENGINE_REMOTE_DEBUGGING="12301",
           QTWEBENGINE_DISABLE_SANDBOX="1", ANKI_NOHIGHDPI="1",
           QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*")


def stop(proc):
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


with tempfile.TemporaryDirectory(prefix="kotoba-audit-upgrade-") as temp:
    temp = Path(temp)
    src, base = temp / "old", temp / "base"
    with ZipFile(args.old.resolve()) as z:
        z.extractall(src)
    env["KB_BASE"] = str(base)
    with (out / "setup.log").open("w") as log:
        subprocess.run(["bash", str(ROOT / "tests/anki/setup_base.sh"), str(base), str(src)],
                       env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    results = []
    for phase in ("truoc", "sau"):
        proc = None
        try:
            with (out / ("anki_" + phase + ".log")).open("w") as log:
                proc = subprocess.Popen([py, "-c", "import aqt; aqt.run()", "-b", str(base), "-p", "Test"],
                                        env=env, stdout=log, stderr=subprocess.STDOUT)
                ready = False
                for attempt in range(60):
                    if proc.poll() is not None:
                        raise RuntimeError("Anki thoát khi khởi động")
                    try:
                        req = urllib.request.Request("http://127.0.0.1:12302", data=b"result=bool(mw.col)")
                        with urllib.request.urlopen(req, timeout=2) as response:
                            ready = json.load(response).get("r") is True
                        if ready:
                            break
                    except OSError:
                        pass
                    time.sleep(1)
                if not ready:
                    raise RuntimeError("Hồ sơ chưa mở")
                with (out / (phase + ".log")).open("w") as test_log:
                    run = subprocess.run(["node", str(ROOT / "tests/anki/e2e_capnhat.js"), phase,
                                          str(out), str(args.new.resolve())], env=env,
                                         stdout=test_log, stderr=subprocess.STDOUT, timeout=300)
                results.append({"phase": phase, "exit_code": run.returncode})
                print(json.dumps(results[-1]), flush=True)
                if run.returncode:
                    break
                if phase == "truoc":
                    try:
                        proc.wait(timeout=30)
                    except subprocess.TimeoutExpired:
                        raise RuntimeError("Bản cũ chưa đóng xong sau khi cài đè")
        finally:
            stop(proc)
    (out / "upgrade.json").write_text(json.dumps(results, indent=2) + "\n")
    raise SystemExit(1 if len(results) != 2 or any(r["exit_code"] for r in results) else 0)
