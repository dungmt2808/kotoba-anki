#!/bin/bash
# run_capnhat.sh GÓI_CŨ GÓI_MỚI [SHOTS] — 1.31.4: cập nhật add-on đúng như người dùng (repo đã phát hành công khai 16/11):
#   1. Anki mới với GÓI_CŨ (vd. 1.31.3 đã phát hành: `git show e64eb22:kotoba_batake.ankiaddon > /tmp/cu.ankiaddon`),
#      chơi đủ thứ (ôn thẻ trong vườn, xây nhà, mua / đặt đồ, thú, tường, nhật ký, sổ sinh hoạt, cài đặt ⚙) → chụp dữ liệu;
#   2. cài đè GÓI_MỚI bằng trình quản lý add-on của Anki (mw.addonManager.install — cùng đường với Tools → Add-ons →
#      Install from file / Check for Updates), đóng Anki đàng hoàng (bản cũ còn trong bộ nhớ chạy móc đóng hồ sơ);
#   3. mở lại Anki (bản mới) → so: mọi khoá kotoba_batake_* của collection, mọi file trong user_files/, cấu hình add-on;
#      vườn mở đúng xu / đồ / nhật ký / cài đặt; tính năng mới chạy trên dữ liệu cũ.
# Cần ANKI_PY (python có aqt), Node ≥ 22, thư viện Qt.
HERE=$(cd "$(dirname "$0")" && pwd)
OLD=$(realpath "$1"); NEW=$(realpath "$2"); SHOTS=${3:-/tmp/kb_shots_capnhat}; mkdir -p "$SHOTS"
export KB_CDP_PORT=${KB_CDP_PORT:-9333} KB_CTRL_PORT=${KB_CTRL_PORT:-9444}
BASE=${KB_BASE:-/tmp/kb_anki_capnhat}
SRC=$(mktemp -d); (cd "$SRC" && python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall('.')" "$OLD")
start() {
  "$HERE/run_anki.sh" "$BASE" "$KB_CDP_PORT" "$SHOTS/anki_capnhat_$1.log" &
  for i in $(seq 1 90); do curl -s -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = bool(mw.col)' 2>/dev/null | grep -q true && return 0; sleep 1; done
  return 1
}
"$HERE/kill_anki.sh"
"$HERE/setup_base.sh" "$BASE" "$SRC" >/dev/null || exit 2
rm -rf "$SRC"
start 1 || { echo "Anki (bản cũ) không mở được"; exit 2; }
echo "== e2e_capnhat.js — trước khi cập nhật"
(cd "$HERE" && timeout 600 node e2e_capnhat.js truoc "$SHOTS" "$NEW"); RC=$?
if [ $RC != 0 ]; then "$HERE/kill_anki.sh"; exit $RC; fi
# bước trước đóng Anki bằng mw.close(); chờ thoát hẳn (không thì mới giết)
for i in $(seq 1 60); do curl -s -m 2 -X POST "127.0.0.1:$KB_CTRL_PORT" -d 'result = 1' >/dev/null 2>&1 || break; sleep 1; done
"$HERE/kill_anki.sh"
start 2 || { echo "Anki (sau khi cập nhật) không mở được"; exit 2; }
echo "== e2e_capnhat.js — sau khi cập nhật"
(cd "$HERE" && timeout 600 node e2e_capnhat.js sau "$SHOTS" "$NEW"); RC=$?
"$HERE/kill_anki.sh"
exit $RC
