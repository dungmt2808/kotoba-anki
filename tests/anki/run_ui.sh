#!/bin/bash
# run_ui.sh ADDON SHOTS — chạy test giao diện trong Anki thật (mỗi kịch bản một lần mở Anki mới).
# Cần: ANKI_PY (python có aqt==26.9.3), Node ≥ 22, thư viện Qt (xem tests/README.md).
# Tuỳ chọn: KB_REAL_GEMINI=1 (+ GEMINI_API_KEY) để chạy cả bước Gemini TTS thật.
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=$(cd "$1" && pwd); SHOTS=${2:-/tmp/kb_shots}; mkdir -p "$SHOTS"
export KB_CDP_PORT=${KB_CDP_PORT:-9333} KB_CTRL_PORT=${KB_CTRL_PORT:-9444}
BASE=${KB_BASE:-/tmp/kb_anki_base}
FAIL=0
for script in ${KB_SCRIPTS:-e2e.js e2e_tour.js e2e_114.js e2e_115.js e2e_116.js e2e_117.js e2e_118.js e2e_119.js}; do
  "$HERE/kill_anki.sh"
  "$HERE/setup_base.sh" "$BASE" "$ADDON" >/dev/null || exit 2
  "$HERE/run_anki.sh" "$BASE" "$KB_CDP_PORT" "$SHOTS/anki_${script%.js}.log" &
  for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && break; sleep 1; done
  echo "== $script"
  (cd "$HERE" && timeout 600 node "$script" "$SHOTS") || FAIL=1
done
"$HERE/kill_anki.sh"
echo "Ảnh chụp: $SHOTS"
exit $FAIL
