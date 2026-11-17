#!/bin/bash
# run_habanh.sh GÓI_MỚI GÓI_CŨ [SHOTS] — 1.34.1: hạ bản rồi lên lại trong Anki thật (xem e2e_habanh.js).
#   vd. git show e64eb22:kotoba_batake.ankiaddon > /tmp/cu.ankiaddon   (1.31.3 đã phát hành)
#       ANKI_PY=~/.venv-anki/bin/python tests/anki/run_habanh.sh kotoba_batake.ankiaddon /tmp/cu.ankiaddon /tmp/kb_habanh
HERE=$(cd "$(dirname "$0")" && pwd)
NEW=$(realpath "$1"); OLD=$(realpath "$2"); SHOTS=${3:-/tmp/kb_shots_habanh}; mkdir -p "$SHOTS"
export KB_CDP_PORT=${KB_CDP_PORT:-9333} KB_CTRL_PORT=${KB_CTRL_PORT:-9444}
BASE=${KB_BASE:-/tmp/kb_anki_habanh}
SRC=$(mktemp -d); (cd "$SRC" && python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall('.')" "$NEW")
start() {
  "$HERE/run_anki.sh" "$BASE" "$KB_CDP_PORT" "$SHOTS/anki_habanh_$1.log" &
  for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && return 0; sleep 1; done
  return 1
}
stop() {
  for i in $(seq 1 60); do curl -s -m 2 -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = 1' >/dev/null 2>&1 || break; sleep 1; done
  "$HERE/kill_anki.sh"
}
"$HERE/kill_anki.sh"
"$HERE/setup_base.sh" "$BASE" "$SRC" >/dev/null || exit 2
rm -rf "$SRC"
FAIL=0
for ph in p1 p2 p3; do
  start "$ph" || { echo "Anki ($ph) không mở được"; exit 2; }
  PKG=$OLD; [ "$ph" = p2 ] && PKG=$NEW
  echo "== e2e_habanh.js $ph"
  (cd "$HERE" && timeout 600 node e2e_habanh.js "$ph" "$SHOTS" "$PKG") || FAIL=1
  stop
done
exit $FAIL
