#!/bin/bash
# run_versions.sh ADDON OUT "BẢN…" ["KỊCH BẢN…"] — chạy kịch bản UI trên nhiều bản Anki (1.22.7: kiểm tra tương thích).
#
# Mỗi bản Anki một venv ở $KB_VENVS/aqt-<bản> (mặc định ~/venvs), tạo một lần:
#   uv venv --python 3.9  ~/venvs/aqt-23.10.1 && uv pip install --python ~/venvs/aqt-23.10.1/bin/python "aqt[qt6]==23.10.1"
#   uv venv --python 3.13 ~/venvs/aqt-26.9.4  && uv pip install --python ~/venvs/aqt-26.9.4/bin/python  "aqt[qt6]==26.9.4"
# (bộ cài Anki ≤ 25.02 chạy Python 3.9, từ 25.07 trình khởi chạy dùng Python 3.13). Muốn đúng Qt của bộ cài thời đó thì
# ghim thêm, vd. 23.10: "PyQt6==6.6.0" "PyQt6-Qt6==6.6.0" "PyQt6-WebEngine==6.6.0" "PyQt6-WebEngine-Qt6==6.6.0"
# rồi đặt tên venv aqt-23.10.1-qt66.
#
# Các bản chạy lần lượt trên cùng một bộ cổng; muốn chạy song song thì gọi nhiều lần với KB_SLOT khác nhau (1, 2, 3…):
# mỗi slot có cổng CDP / điều khiển riêng, khoá một phiên riêng (ANKI_SINGLE_INSTANCE_KEY, USER) và thư mục Anki riêng,
# dòng lệnh "import aqt as A; A.run()" để kill_anki.sh của run_ui.sh không tắt nhầm.
# KB_TIMEOUT (giây, mặc định 900): giới hạn mỗi kịch bản — e2e_phiendai.js (300 lượt chấm) cần ~1.800.
# Kết quả: OUT/<bản>/<kịch bản>.out (+ ảnh chụp), mỗi kịch bản một dòng tóm tắt ra màn hình.
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=$(cd "$1" && pwd); OUT=$2; VERSIONS=$3
SCRIPTS=${4:-"e2e_tour.js e2e_114.js e2e_118.js e2e_120.js e2e_122.js e2e_1226.js"}
VENVS=${KB_VENVS:-$HOME/venvs}; slot=${KB_SLOT:-1}
export KB_CDP_PORT=$((9500 + slot)) KB_CTRL_PORT=$((9600 + slot)) ANKI_SINGLE_INSTANCE_KEY=kbv$slot USER=kbv$slot LOGNAME=kbv$slot
BASE=/tmp/kb_anki_v$slot
FAIL=0
# 1.36.6: máy người dùng không có RUST_BACKTRACE; có biến này (máy test cloud đặt sẵn) thì mỗi lần Anki báo "không có khoá" ghi cả
# ngăn xếp (~60 ms) → vườn dựng lại mất ~2 giây mỗi lượt chấm, thời gian đo trong test sai hẳn máy thật
unset RUST_BACKTRACE
for v in $VERSIONS; do
  PY=$VENVS/aqt-$v/bin/python
  [ -x "$PY" ] || { echo "$v: không có venv $VENVS/aqt-$v"; FAIL=1; continue; }
  mkdir -p "$OUT/$v"
  for s in $SCRIPTS; do
    ANKI_PY=$PY "$HERE/setup_base.sh" "$BASE" "$ADDON" > "$OUT/$v/setup_${s%.js}.log" 2>&1 || { echo "$v $s: dựng thư mục Anki LỖI"; FAIL=1; continue; }
    # 1.36.5: KB_EXTRA_ADDONS = thư mục chứa add-on khác (mỗi add-on một thư mục, đặt tên theo mã AnkiWeb) → cài chung (e2e_cungaddon.js)
    if [ -n "$KB_EXTRA_ADDONS" ]; then cp -r "$KB_EXTRA_ADDONS"/. "$BASE/addons21/"; fi
    (
      export QT_QPA_PLATFORM=offscreen QTWEBENGINE_REMOTE_DEBUGGING=$KB_CDP_PORT QTWEBENGINE_DISABLE_SANDBOX=1 ANKI_NOHIGHDPI=1
      export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
      exec "$PY" -c "import aqt as A; A.run()" -b "$BASE" -p Test > "$OUT/$v/anki_${s%.js}.log" 2>&1
    ) &
    APID=$!
    ready=0
    for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && { ready=1; break; }; sleep 1; done
    if [ $ready = 0 ]; then echo "$v $s: Anki không mở được"; kill -9 $APID 2>/dev/null; FAIL=1; continue; fi
    (cd "$HERE" && timeout ${KB_TIMEOUT:-900} node "$s" "$OUT/$v") > "$OUT/$v/${s%.js}.out" 2>&1 || FAIL=1
    echo "$v $s: $(grep -E 'KẾT QUẢ|LỖI' "$OUT/$v/${s%.js}.out" | tail -1)"
    kill $APID 2>/dev/null; sleep 3; kill -9 $APID 2>/dev/null; sleep 1
  done
done
exit $FAIL
