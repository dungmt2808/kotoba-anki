#!/bin/bash
# run_anki.sh BASE CDP_PORT LOG — chạy Anki thật không cửa sổ (offscreen), mở cổng Chrome DevTools cho webview.
export QT_QPA_PLATFORM=offscreen
# 1.36.6: máy người dùng không có RUST_BACKTRACE; có biến này (máy test cloud đặt sẵn) thì mỗi lần Anki báo "không có khoá" ghi cả
# ngăn xếp (~60 ms) → vườn dựng lại mất ~2 giây mỗi lượt chấm, thời gian đo trong test sai hẳn máy thật
unset RUST_BACKTRACE
export QTWEBENGINE_REMOTE_DEBUGGING=$2
export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
export QTWEBENGINE_DISABLE_SANDBOX=1
export ANKI_NOHIGHDPI=1
exec "${ANKI_PY:-python3}" -c "import aqt; aqt.run()" -b "$1" -p Test > "$3" 2>&1
