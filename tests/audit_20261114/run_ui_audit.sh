#!/usr/bin/env bash
# Run one scenario in a NEW disposable profile. Never stop another Anki profile.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
ADDON=$(realpath "${1:-$ROOT/kotoba_batake}")
OUT=$(realpath -m "${2:?output directory required}")
SCRIPT=$(realpath "${3:-$HERE/ui_audit.js}")
PY=${ANKI_PY:-python3}
BASE=$(mktemp -d "${TMPDIR:-/tmp}/kotoba-audit-ui-XXXXXX")
mkdir -p "$OUT"
export KB_BASE="$BASE" KB_AUDIT_DISPOSABLE=1
export KB_CDP_PORT=${KB_CDP_PORT:-10931} KB_CTRL_PORT=${KB_CTRL_PORT:-10932}
export ANKI_SINGLE_INSTANCE_KEY="kotoba-audit-$$" USER="kotoba-audit-$$" LOGNAME="kotoba-audit-$$"
export QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT
export QTWEBENGINE_DISABLE_SANDBOX=1 ANKI_NOHIGHDPI=1
export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
# Never copy the environment's real API credential into test profile metadata.
GEMINI_API_KEY="" ANKI_PY="$PY" bash "$ROOT/tests/anki/setup_base.sh" "$BASE" "$ADDON" > "$OUT/setup.log" 2>&1
"$PY" - "$BASE" "${KB_AUDIT_BASELINE:-0}" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1]) / "addons21/kotoba_batake/meta.json"
d = json.loads(p.read_text())
baseline = sys.argv[2] == "1"
d["config"].update(
    gemini_key="AIzaAuditLocalOnlyKey000000000000000000000" if baseline else "",
    gemini_auto=False, sound=False, music=False, mobile_coins=baseline,
    show_tooltips=baseline, ui={"trans": "off"},
)
p.write_text(json.dumps(d, ensure_ascii=False))
PY
cleanup() {
  # e2e_1253 restarts its own process. Select by this unique, generated base path.
  "$PY" - "$BASE" <<'PY'
import os, pathlib, signal, sys
base = sys.argv[1].encode()
for entry in pathlib.Path('/proc').iterdir():
    if not entry.name.isdecimal() or int(entry.name) == os.getpid():
        continue
    try:
        args = (entry / 'cmdline').read_bytes().split(b'\0')
        if base in args and any(b'aqt' in arg and b'run()' in arg for arg in args):
            os.kill(int(entry.name), signal.SIGTERM)
    except (OSError, ProcessLookupError):
        pass
PY
}
trap cleanup EXIT
"$PY" -c 'import aqt; aqt.run()' -b "$BASE" -p Test > "$OUT/anki.log" 2>&1 &
APID=$!
ready=0
for attempt in $(seq 1 60); do
  if curl --silent --fail --max-time 2 -X POST "http://127.0.0.1:$KB_CTRL_PORT" -d 'result=bool(mw.col)' | rg -q 'true'; then
    ready=1; break
  fi
  kill -0 "$APID" 2>/dev/null || { tail -35 "$OUT/anki.log"; exit 2; }
  sleep 1
done
[ "$ready" = 1 ] || { tail -35 "$OUT/anki.log"; exit 2; }
node "$SCRIPT" "$OUT"
