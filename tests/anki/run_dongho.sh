#!/bin/bash
# run_dongho.sh ADDON [SHOTS] — 1.36.4: Anki thật chạy với ĐỒNG HỒ MÁY GIẢ (libfaketime), không dùng ngày giả kb.LE_TEST.
#   Lịch ôn của Anki, revlog, giờ đổi ngày (4:00), giờ máy của trang (JS Date) và giờ máy của Python cùng một đồng hồ — như
#   người dùng thật đi hết mùa Giáng sinh. Múi giờ Việt Nam (TZ=Asia/Ho_Chi_Minh). Kịch bản: e2e_dongho.js.
#   Cần: apt-get install faketime (libfaketime), ANKI_PY (python có aqt), Node ≥ 22, thư viện Qt.
#   1.36.5: KB_DONGHO_SCRIPT (kịch bản khác, vd. e2e_giodoingay.js) + KB_DONGHO_START (giờ máy lúc mở Anki) — mặc định như 1.36.4.
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=$(realpath "$1"); SHOTS=${2:-/tmp/kb_shots_dongho}; mkdir -p "$SHOTS"
export KB_CDP_PORT=${KB_CDP_PORT:-9333} KB_CTRL_PORT=${KB_CTRL_PORT:-9444}
BASE=${KB_BASE:-/tmp/kb_anki_dongho}
LIB=${KB_FAKETIME_LIB:-/usr/lib/x86_64-linux-gnu/faketime/libfaketimeMT.so.1}   # bản đa luồng: Anki (Rust + Qt) nhiều luồng
[ -f "$LIB" ] || { echo "thiếu libfaketime ($LIB) — apt-get install faketime"; exit 2; }
export KB_FT_FILE=${KB_FT_FILE:-/tmp/kb_dongho_time.txt}
echo "@${KB_DONGHO_START:-2026-11-30 21:00:00}" > "$KB_FT_FILE"
"$HERE/kill_anki.sh"
"$HERE/setup_base.sh" "$BASE" "$ADDON" >/dev/null || exit 2
(
  export LD_PRELOAD="$LIB" FAKETIME_TIMESTAMP_FILE="$KB_FT_FILE" FAKETIME_CACHE_DURATION=1 FAKETIME_DONT_FAKE_MONOTONIC=1
  export TZ=Asia/Ho_Chi_Minh
  exec "$HERE/run_anki.sh" "$BASE" "$KB_CDP_PORT" "$SHOTS/anki_dongho.log"
) &
for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && break; sleep 1; done
(cd "$HERE" && timeout 1800 node "${KB_DONGHO_SCRIPT:-e2e_dongho.js}" "$SHOTS"); RC=$?
"$HERE/kill_anki.sh"
exit $RC
