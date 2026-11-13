#!/usr/bin/env bash
# Start only a new disposable profile, and stop only our own Anki process.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
ADDON=${1:-$ROOT/kotoba_batake}
OUT=${2:-/tmp/kotoba-audit-ui-results}
PY=${ANKI_PY:-python3}
SCRIPT=${3:-$HERE/ui_audit.js}
mkdir -p "$OUT"
BASE=$(mktemp -d /tmp/kotoba-audit-ui-XXXXXX)
export KB_CDP_PORT=${KB_CDP_PORT:-9933} KB_CTRL_PORT=${KB_CTRL_PORT:-9944}
export KB_AUDIT_DISPOSABLE=1 ANKI_SINGLE_INSTANCE_KEY="kotoba-audit-$$"
# Anki 23.10 uses the OS-user environment for its single-instance socket.
export USER="kotoba-audit-$$" LOGNAME="kotoba-audit-$$"
export QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT
export QTWEBENGINE_DISABLE_SANDBOX=1 ANKI_NOHIGHDPI=1
export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
ANKI_PY="$PY" bash "$ROOT/tests/anki/setup_base.sh" "$BASE" "$ADDON" > "$OUT/setup.log" 2>&1
"$PY" - "$BASE" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1]) / "addons21/kotoba_batake/meta.json"
d = json.loads(p.read_text())
d["config"].update(gemini_key="", gemini_auto=False, sound=False, music=False,
                   mobile_coins=False, show_tooltips=False, ui={"trans": "off"})
p.write_text(json.dumps(d, ensure_ascii=False))
PY
"$PY" -c 'import aqt as A; A.run()' -b "$BASE" -p Test > "$OUT/anki.log" 2>&1 &
APID=$!
cleanup() { kill "$APID" 2>/dev/null || true; }
trap cleanup EXIT
ready=0
for attempt in $(seq 1 60); do
  if curl --silent --fail --max-time 2 -X POST "http://127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' | rg -q 'true'; then
    ready=1
    break
  fi
  kill -0 "$APID" 2>/dev/null || { tail -40 "$OUT/anki.log"; exit 2; }
  sleep 1
done
[ "$ready" = 1 ] || { tail -40 "$OUT/anki.log"; exit 2; }
node "$SCRIPT" "$OUT"
