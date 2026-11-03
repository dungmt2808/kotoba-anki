#!/bin/bash
# run_all.sh [ADDON] — test offline (không mạng, không Qt). Không đưa ADDON thì giải nén gói ở gốc repo.
#   ANKI_PY=<python có gói anki> để chạy cả test_dict.py (collection Anki thật).
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=${1:-$("$HERE/tools/unpack.sh")}
FAIL=0
echo "== core/test_offline.py"; python3 "$HERE/core/test_offline.py" "$ADDON" || FAIL=1
if "${ANKI_PY:-python3}" -c "import anki.collection" 2>/dev/null; then
  echo "== core/test_dict.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_dict.py" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
else
  echo "– bỏ qua core/test_dict.py (cần gói anki: ANKI_PY=<python có anki==26.9.3>)"
fi
for f in "$ADDON"/web/*.js; do node --check "$f" || FAIL=1; done
[ $FAIL = 0 ] && echo "TỔNG: TẤT CẢ OK" || echo "TỔNG: CÓ LỖI"
exit $FAIL
