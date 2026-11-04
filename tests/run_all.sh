#!/bin/bash
# run_all.sh [ADDON] — test offline (không mạng, không Qt). Không đưa ADDON thì giải nén gói ở gốc repo.
#   ANKI_PY=<python có gói anki> để chạy cả test_dict.py (collection Anki thật).
#   OLD_ADDON=<thư mục add-on bản 1.15> để test_116.py chạy cả vòng "máy khác còn bản cũ".
#   OLD116=<thư mục add-on bản 1.16> để test_117.py chạy mã 1.16 thật lưu đè cấu hình trường.
#   OLD118=<thư mục add-on bản 1.18> để test_119.py chạy mã 1.18 thật lưu trạng thái báo (khoá báo tiếng Anh vẫn còn).
#   OLD119=<thư mục add-on bản 1.19.0> để test_1191.py chạy mã 1.19.0 thật lưu trạng thái (khoá deck đã chọn còn nguyên).
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=${1:-$("$HERE/tools/unpack.sh")}
FAIL=0
echo "== core/test_offline.py"; python3 "$HERE/core/test_offline.py" "$ADDON" || FAIL=1
echo "== core/test_more.py"
OUT=$(python3 "$HERE/core/test_more.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_119.py"
OUT=$(python3 "$HERE/core/test_119.py" "$ADDON" ${OLD118:+"$OLD118"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_116.py"
OUT=$(python3 "$HERE/core/test_116.py" "$ADDON" ${OLD_ADDON:+"$OLD_ADDON"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
if "${ANKI_PY:-python3}" -c "import anki.collection" 2>/dev/null; then
  echo "== core/test_dict.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_dict.py" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_117.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_117.py" "$ADDON" ${OLD116:+"$OLD116"} 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_1191.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_1191.py" "$ADDON" ${OLD119:+"$OLD119"} 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_118.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_118.py" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
else
  echo "– bỏ qua core/test_dict.py, core/test_117.py, core/test_1191.py, core/test_118.py (cần gói anki: ANKI_PY=<python có anki==26.9.3>)"
fi
echo "== core/test_music.js"
OUT=$(node "$HERE/core/test_music.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
for f in "$ADDON"/web/*.js; do node --check "$f" || FAIL=1; done
[ $FAIL = 0 ] && echo "TỔNG: TẤT CẢ OK" || echo "TỔNG: CÓ LỖI"
exit $FAIL
