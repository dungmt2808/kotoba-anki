#!/bin/bash
# Bốn kịch bản UI sẵn có; đường dẫn ảnh tuyệt đối vì runner cd sang tests/anki.
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../../../.." && pwd)
AUDIT="$REPO/docs/kiem_thu/release-audit-2026-11-11"
export ANKI_PY=${ANKI_PY:-/workspace/kotoba-dev/venv/bin/python}
export GEMINI_API_KEY=''
export KB_BASE=/tmp/kb_release_regression_20261111
export KB_CDP_PORT=9336 KB_CTRL_PORT=9447 ANKI_SINGLE_INSTANCE_KEY=release-audit-regression
export KB_SCRIPTS='e2e_tour.js e2e_117.js e2e_125.js e2e_1251.js'
cd "$REPO"
bash tests/anki/run_ui.sh "$REPO/kotoba_batake" "$AUDIT/anh/regression" > "$AUDIT/logs/ui-existing.log" 2>&1
