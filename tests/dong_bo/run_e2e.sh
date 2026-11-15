#!/usr/bin/env bash
# run_e2e.sh [ADDON] OUT — kịch bản đồng bộ trong Anki thật (tests/anki/e2e_1312.js): một hồ sơ Anki dùng xong bỏ + máy chủ
# đồng bộ thật của Anki chạy cục bộ (không ra mạng) + "điện thoại" (tests/dong_bo/may_khac.py).
# Cần: ANKI_PY (python có aqt + anki), Node ≥ 22, thư viện Qt (xem tests/README.md).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
if [ $# -ge 2 ]; then ADDON=$(realpath "$1"); OUT=$(realpath -m "$2"); else ADDON="$ROOT/kotoba_batake"; OUT=$(realpath -m "${1:?thư mục kết quả}"); fi
PY=${ANKI_PY:-python3}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/kotoba-dongbo-XXXXXX")
mkdir -p "$OUT"
export KB_BASE="$WORK/base" KB_BASE_B="$WORK/base_b" KB_WORK="$WORK" KB_ADDON="$ADDON" ANKI_PY="$PY"
export KB_CDP_PORT=${KB_CDP_PORT:-12931} KB_CTRL_PORT=${KB_CTRL_PORT:-12932} KB_SYNC_PORT=${KB_SYNC_PORT:-12933}
export KB_SYNC_EP="http://127.0.0.1:$KB_SYNC_PORT/"
export ANKI_SINGLE_INSTANCE_KEY="kotoba-dongbo-$$" USER="kotoba-dongbo-$$" LOGNAME="kotoba-dongbo-$$"
export QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT
export QTWEBENGINE_DISABLE_SANDBOX=1 ANKI_NOHIGHDPI=1
export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
export NO_PROXY=127.0.0.1,localhost no_proxy=127.0.0.1,localhost

prepare() {     # prepare BASE — hồ sơ Test mới + add-on + add-on test, không khoá Gemini, không nhạc
  GEMINI_API_KEY="" bash "$ROOT/tests/anki/setup_base.sh" "$1" "$ADDON" >> "$OUT/setup.log" 2>&1
  "$PY" - "$1" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1]) / "addons21/kotoba_batake/meta.json"
d = json.loads(p.read_text())
d["config"].update(gemini_key="", gemini_auto=False, sound=False, music=False, mobile_coins=True, show_tooltips=False,
                   open_maximized=False, ui={"trans": "off"})
p.write_text(json.dumps(d, ensure_ascii=False))
PY
}
prepare "$KB_BASE"
prepare "$KB_BASE_B"

SYNC_USER1="u:p" SYNC_BASE="$WORK/srv" SYNC_PORT="$KB_SYNC_PORT" SYNC_HOST=127.0.0.1 RUST_LOG="anki=warn" \
  "$PY" -m anki.syncserver > "$OUT/syncserver.log" 2>&1 &
SRV=$!
cleanup() {
  kill "$SRV" 2>/dev/null || true
  # tắt mọi Anki của lần chạy này (kịch bản tự mở lại Anki vài lần); chờ tắt hẳn rồi mới xoá thư mục — Anki còn sống mà
  # thư mục đã mất thì lần chạy sau (cùng cổng) sẽ nói chuyện nhầm với nó
  "$PY" - "$WORK" <<'PY'
import os, pathlib, signal, sys, time
base = sys.argv[1].encode()
def mine():
    out = []
    for entry in pathlib.Path('/proc').iterdir():
        if not entry.name.isdecimal() or int(entry.name) == os.getpid():
            continue
        try:
            args = (entry / 'cmdline').read_bytes()
            if base in args and b'aqt' in args and b'run()' in args:
                out.append(int(entry.name))
        except (OSError, ProcessLookupError):
            pass
    return out
for sig in (signal.SIGTERM, signal.SIGKILL):
    for pid in mine():
        try:
            os.kill(pid, sig)
        except OSError:
            pass
    for _ in range(20):
        if not mine():
            break
        time.sleep(0.25)
PY
  rm -rf "$WORK"
}
trap cleanup EXIT
if curl --silent --noproxy '*' --max-time 2 -X POST "http://127.0.0.1:$KB_CTRL_PORT" -d 'result=1' >/dev/null 2>&1; then
  echo "Cổng $KB_CTRL_PORT đang có một Anki test khác trả lời — tắt nó hoặc đặt KB_CTRL_PORT / KB_CDP_PORT / KB_SYNC_PORT khác." >&2
  exit 2
fi

"$PY" -c 'import aqt; aqt.run()' -b "$KB_BASE" -p Test > "$OUT/anki.log" 2>&1 &
APID=$!
ready=0
for _ in $(seq 1 90); do
  if curl --silent --fail --noproxy '*' --max-time 2 -X POST "http://127.0.0.1:$KB_CTRL_PORT" -d 'result=bool(mw.col)' 2>/dev/null | grep -q true; then ready=1; break; fi
  kill -0 "$APID" 2>/dev/null || { tail -35 "$OUT/anki.log"; exit 2; }
  sleep 1
done
[ "$ready" = 1 ] || { tail -35 "$OUT/anki.log"; exit 2; }
node "$ROOT/tests/anki/e2e_1312.js" "$OUT"
