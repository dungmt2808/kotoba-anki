#!/bin/bash
# do_cpu.sh ADDON OUT [still] — mở vườn trong Anki thật ở tỉ lệ 125% (như máy người báo lỗi issue #7), cửa sổ 1384 × 1018,
# đo CPU khi vườn mở đứng yên / rê chuột qua ruộng / đóng vườn + đếm lệnh vẽ canvas mỗi giây. "still" = ⚙ Cảnh sân + Ruộng cây "Đứng yên".
# Cần ANKI_PY (venv aqt 26.9.4), Node ≥ 22. KB_SCALE đổi tỉ lệ (mặc định 1.25). Kết quả: OUT/ket_qua.json, ảnh OUT/vuon.png.
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=$(cd "$1" && pwd); OUT=${2:-/tmp/kb_do_cpu}; mkdir -p "$OUT"
export KB_CDP_PORT=${KB_CDP_PORT:-9333} KB_CTRL_PORT=${KB_CTRL_PORT:-9444}
BASE=${KB_BASE:-/tmp/kb_do_base}
"$HERE/kill_anki.sh" >/dev/null 2>&1; sleep 1
"$HERE/setup_base.sh" "$BASE" "$ADDON" >/dev/null || exit 2
if [ "$3" = still ]; then
"${ANKI_PY:-python3}" - "$BASE" <<'PY'
import json, sys
p = sys.argv[1] + "/addons21/kotoba_batake/meta.json"; m = json.load(open(p))
ui = m["config"].setdefault("ui", {})
for k in ("main", "review", "panel"):
    ui.setdefault(k, {}).update(yard="still", field="still")
json.dump(m, open(p, "w"), ensure_ascii=False)
PY
fi
(
  export QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT QTWEBENGINE_DISABLE_SANDBOX=1
  export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*" QT_SCALE_FACTOR=${KB_SCALE:-1.25}
  exec "${ANKI_PY:-python3}" -c "import aqt; aqt.run()" -b "$BASE" -p Test > "$OUT/anki.log" 2>&1
) &
for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && break; sleep 1; done
(cd "$HERE" && timeout 300 node do_cpu.js "$OUT"); R=$?
"$HERE/kill_anki.sh" >/dev/null 2>&1
exit $R
