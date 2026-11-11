#!/bin/bash
# Hồ sơ test biệt lập. Tuyệt đối không đổi BASE thành đường dẫn hồ sơ cá nhân.
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../../../.." && pwd)
AUDIT="$REPO/docs/kiem_thu/release-audit-2026-11-11"
export ANKI_PY=${ANKI_PY:-/workspace/kotoba-dev/venv/bin/python}
export KB_CTRL_PORT=9446 KB_CDP_PORT=9335 ANKI_SINGLE_INSTANCE_KEY=release-audit-rebuild
export GEMINI_API_KEY=''
BASE=/tmp/kb_release_rebuild_20261111
"$ANKI_PY" "$AUDIT/kich_ban/audit_core.py" "$REPO" > "$AUDIT/logs/core-extra.log" 2>&1
"$REPO/tests/anki/setup_base.sh" "$BASE" "$REPO/kotoba_batake" > "$AUDIT/logs/setup.log" 2>&1
"$REPO/tests/anki/run_anki.sh" "$BASE" "$KB_CDP_PORT" "$AUDIT/logs/anki-extra.log" &
ANKI_AUDIT_PID=$!
trap 'kill "$ANKI_AUDIT_PID" 2>/dev/null || true' EXIT
for i in $(seq 1 90); do
  if curl -sf -X POST "http://127.0.0.1:$KB_CTRL_PORT" -d 'result=bool(mw.col)' >/dev/null; then break; fi
  sleep 1
done
node "$AUDIT/kich_ban/audit_ui.js" > "$AUDIT/logs/ui-extra.log" 2>&1
