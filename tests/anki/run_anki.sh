#!/bin/bash
# run_anki.sh BASE CDP_PORT LOG — chạy Anki thật không cửa sổ (offscreen), mở cổng Chrome DevTools cho webview.
export QT_QPA_PLATFORM=offscreen
export QTWEBENGINE_REMOTE_DEBUGGING=$2
export QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --remote-allow-origins=*"
export QTWEBENGINE_DISABLE_SANDBOX=1
export ANKI_NOHIGHDPI=1
exec "${ANKI_PY:-python3}" -c "import aqt; aqt.run()" -b "$1" -p Test > "$3" 2>&1
