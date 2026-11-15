#!/bin/bash
# run_release.sh ADDON OUT — kịch bản sâu release_sync.js: (a) máy 1 dùng một ngày → đóng Anki, (b) máy 1 mở lại,
# (c) máy 2 = Anki mới + add-on mới cài (user_files trống) + collection chép từ máy 1 (như sau khi đồng bộ AnkiWeb).
# Chạy song song được với Anki khác: KB_SLOT (mặc định 7) → cổng 95xx / 96xx riêng, dòng lệnh "import aqt as A; A.run()"
# để kill_anki.sh của kịch bản khác không tắt nhầm.
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=$(cd "$1" && pwd); OUT=${2:-/tmp/kb_release}; mkdir -p "$OUT"
slot=${KB_SLOT:-7}
export KB_CDP_PORT=$((9500 + slot)) KB_CTRL_PORT=$((9600 + slot)) ANKI_SINGLE_INSTANCE_KEY=kbrel$slot USER=kbrel$slot LOGNAME=kbrel$slot
PY=${ANKI_PY:-python3}
B1=/tmp/kb_release_m1_$slot; B2=/tmp/kb_release_m2_$slot
start() {   # start BASE LOG
  QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT QTWEBENGINE_DISABLE_SANDBOX=1 ANKI_NOHIGHDPI=1 \
  QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*" \
    "$PY" -c "import aqt as A; A.run()" -b "$1" -p Test > "$2" 2>&1 &
  echo $! > "$1/.pid"
  for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && return 0; sleep 1; done
  echo "Anki không mở được"; tail -20 "$2"; return 1
}
stop() {    # stop BASE: chờ Anki tự thoát (pha a đã gọi mw.close), quá 30 giây thì tắt
  local pid; pid=$(cat "$1/.pid" 2>/dev/null)
  for i in $(seq 1 60); do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.5; done
  kill "$pid" 2>/dev/null; sleep 2; kill -9 "$pid" 2>/dev/null; return 0
}
FAIL=0
"$HERE/setup_base.sh" "$B1" "$ADDON" >/dev/null || exit 2
start "$B1" "$OUT/anki_a.log" || exit 2
(cd "$HERE" && timeout 300 node release_sync.js a "$OUT") || FAIL=1
stop "$B1"
start "$B1" "$OUT/anki_b.log" || exit 2
(cd "$HERE" && timeout 300 node release_sync.js b "$OUT") || FAIL=1
curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'mw.close()' >/dev/null 2>&1; stop "$B1"
# máy 2: thư mục Anki mới, add-on mới cài (không có user_files của máy 1), collection của máy 1
rm -rf "$B2"; "$PY" "$HERE/mkbase.py" "$B2" >/dev/null; mkdir -p "$B2/Test" "$B2/addons21/kotoba_batake"
cp "$B1/Test/collection.anki2" "$B2/Test/"; [ -d "$B1/Test/collection.media" ] && cp -r "$B1/Test/collection.media" "$B2/Test/"
(cd "$ADDON" && tar --exclude=__pycache__ --exclude=meta.json --exclude=user_files -cf - .) | (cd "$B2/addons21/kotoba_batake" && tar -xf -)
mkdir -p "$B2/addons21/kotoba_batake/user_files"; cp "$ADDON/user_files/README.txt" "$B2/addons21/kotoba_batake/user_files/" 2>/dev/null
cp -r "$HERE/zz_kbtest" "$B2/addons21/"
cp "$B1/addons21/kotoba_batake/meta.json" "$B2/addons21/kotoba_batake/meta.json"
"$PY" - "$B2/addons21/kotoba_batake/meta.json" <<'PY'
import json, sys
m = json.load(open(sys.argv[1])); m["config"].pop("prefs", None); m["config"].pop("paper_confirmed", None)   # máy mới: cài đặt riêng máy trống
json.dump(m, open(sys.argv[1], "w"), ensure_ascii=False)
PY
start "$B2" "$OUT/anki_c.log" || exit 2
(cd "$HERE" && timeout 300 node release_sync.js c "$OUT") || FAIL=1
curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'mw.close()' >/dev/null 2>&1; stop "$B2"
exit $FAIL
