#!/bin/bash
# run_all.sh [ADDON] — test offline (không mạng, không Qt). Không đưa ADDON thì dùng mã nguồn kotoba_batake/ ở gốc repo (từ 1.23).
#   ANKI_PY=<python có gói anki> để chạy cả test_dict.py (collection Anki thật).
#   OLD_ADDON=<thư mục add-on bản 1.15> để test_116.py chạy cả vòng "máy khác còn bản cũ".
#   OLD116=<thư mục add-on bản 1.16> để test_117.py chạy mã 1.16 thật lưu đè cấu hình trường.
#   OLD118=<thư mục add-on bản 1.18> để test_119.py chạy mã 1.18 thật lưu trạng thái báo (khoá báo tiếng Anh vẫn còn).
#   OLD119=<thư mục add-on bản 1.19.0> để test_1191.py chạy mã 1.19.0 thật lưu trạng thái (khoá deck đã chọn còn nguyên).
#   OLD1191=<thư mục add-on bản 1.19.1> để test_120.py chạy mã 1.19.1 thật lưu ví / báo / cấu hình (khoá nhật ký còn nguyên).
#   OLD120=<thư mục add-on bản 1.20.0> để test_121.py chạy mã 1.20.0 thật lưu ví / báo / cấu hình / nhật ký (khoá album còn nguyên).
#   OLD121=<thư mục add-on bản 1.21.0> để test_122.py chạy mã 1.21.0 thật lưu ví / đặt luật / chế tác (giống tự vẽ còn nguyên).
#   OLD123=<thư mục add-on bản 1.23.0> cho test_124.py (không đặt thì lấy từ git, commit ba0aa5a).
#   OLD124=<thư mục add-on bản 1.24.0> cho test_125.py (không đặt thì lấy từ git, commit bc66f66).
#   OLD125=<thư mục add-on bản 1.25.0> cho test_1251.py (không đặt thì lấy từ git, commit 1912fb7).
#   OLD1261=<thư mục add-on bản 1.26.1> cho test_128.py (không đặt thì lấy từ git, commit 6021c57).
#   OLD128=<thư mục add-on bản 1.28.0> cho test_130.py (không đặt thì lấy từ git, commit 59e43c5).
HERE=$(cd "$(dirname "$0")" && pwd)
ADDON=${1:-$HERE/../kotoba_batake}
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
echo "== core/test_1225.py"
OUT=$(python3 "$HERE/core/test_1225.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1226.py"
OUT=$(python3 "$HERE/core/test_1226.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_123.py"
OUT=$(python3 "$HERE/core/test_123.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_124.py"
OUT=$(python3 "$HERE/core/test_124.py" "$ADDON" ${OLD123:+"$OLD123"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_125.py"
OUT=$(python3 "$HERE/core/test_125.py" "$ADDON" ${OLD124:+"$OLD124"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1251.py"
OUT=$(python3 "$HERE/core/test_1251.py" "$ADDON" ${OLD125:+"$OLD125"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1253.py"
OUT=$(python3 "$HERE/core/test_1253.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1255.py"
OUT=$(python3 "$HERE/core/test_1255.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1258.py"
OUT=$(python3 "$HERE/core/test_1258.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1259.py"
OUT=$(python3 "$HERE/core/test_1259.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_126.py"
OUT=$(python3 "$HERE/core/test_126.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1261.py"
OUT=$(python3 "$HERE/core/test_1261.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_128.py"
OUT=$(python3 "$HERE/core/test_128.py" "$ADDON" ${OLD1261:+"$OLD1261"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_130.py"
OUT=$(python3 "$HERE/core/test_130.py" "$ADDON" ${OLD128:+"$OLD128"} 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1301.py (1.30.1: sàn / tường theo kiểu nhà, hỏi trước khi trả xu, thu gọn bảng Hôm nay, liên hệ, câu chữ)"
OUT=$(python3 "$HERE/core/test_1301.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1301.js (1.30.1: khách không đi ngang qua nhà, thú trong nhà đi theo gian)"
OUT=$(node "$HERE/core/test_1301.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1303.py (1.30.3: bảng màu ấm + độ tương phản, câu chữ đồng bộ, số xu một kiểu, vườn mở qua ngày mới, Esc ở ⚙)"
OUT=$(python3 "$HERE/core/test_1303.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_131.py (1.31: chuỗi từ lúc cài, chỉ nút Nhà & Cửa hàng mở bảng Nhà, đồ tự vẽ cho StackChan + StackChan sinh hoạt mặc đồ)"
OUT=$(python3 "$HERE/core/test_131.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1311.py (1.31.1: 8 lỗi của audit 14/11 — lưu như một lần (lỗi ghi → không trừ xu, không nửa món), sao lưu theo hồ sơ, đồ mặc trùng chỗ, soát mã Xưởng / hộp hỏi / khoá / chấm thẻ)"
OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_1311.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1312.py (1.31.2: dấu phiên bản, giữ dữ liệu vườn khi đồng bộ, khoanh vùng hư hại từng nút, lưới an toàn khi đọc hỏng, nối dây đồng bộ / ôn thẻ)"
OUT=$(python3 "$HERE/core/test_1312.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_ngau_nhien.py (1.30: thao tác ngẫu nhiên + bất biến của ví)"
OUT=$(python3 "$HERE/core/test_ngau_nhien.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_ban_cu.py (1.30: mã thật của 1.23 – 1.28 đọc + lưu vườn 1.30)"
OUT=$(python3 "$HERE/core/test_ban_cu.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
echo "== audit_20261112/core_audit.py (1.28: lỗi đã sửa → giữ làm kiểm tra hồi quy)"
OUT=$(python3 "$HERE/audit_20261112/core_audit.py" "$ADDON" --out "${TMPDIR:-/tmp}/kb_core_audit.json" 2>&1); RC=$?
echo "$OUT" | grep -E "^FAIL|CORE AUDIT"; [ $RC = 0 ] || FAIL=1
echo "== core/test_kit.py (bộ kotoba_daily)"
OUT=$(python3 "$HERE/core/test_kit.py" "$ADDON" 2>&1); RC=$?
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
  echo "== core/test_120.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_120.py" "$ADDON" ${OLD1191:+"$OLD1191"} 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_121.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_121.py" "$ADDON" ${OLD120:+"$OLD120"} 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_122.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_122.py" "$ADDON" ${OLD121:+"$OLD121"} 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  echo "== core/test_118.py"
  OUT=$("${ANKI_PY:-python3}" "$HERE/core/test_118.py" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
  # 1.31.1: các lỗi của nhánh audit/release-review-1.31-2026-11-14 đã sửa → giữ bộ test của audit làm kiểm tra hồi quy
  echo "== audit_20261114/core_audit.py (dữ liệu hỏng, xu, điểm ảnh, mã thật 1.30.3 mặc trùng chỗ)"
  OUT=$("${ANKI_PY:-python3}" "$HERE/audit_20261114/core_audit.py" "$ADDON" --out "${TMPDIR:-/tmp}/kb_core_audit_1114.json" 2>&1); RC=$?
  echo "$OUT" | grep -E "^FAIL|CORE AUDIT" | cut -c1-300; [ $RC = 0 ] || FAIL=1
  echo "== audit_20261114/deep_storage_audit.py (lỗi ghi collection Anki thật ở từng khoá, trigger SQLite)"
  OUT=$("${ANKI_PY:-python3}" "$HERE/audit_20261114/deep_storage_audit.py" "$ADDON" --out "${TMPDIR:-/tmp}/kb_deep_storage_1114.json" 2>&1); RC=$?
  echo "$OUT" | grep -E "^FAIL|DEEP STORAGE" | cut -c1-300; [ $RC = 0 ] || FAIL=1
  # 1.31.2: nhiều máy thật (collection Anki) + máy chủ đồng bộ thật của Anki chạy cục bộ (không ra mạng; ~4 phút)
  echo "== dong_bo/test_dong_bo.py (máy chủ đồng bộ thật của Anki: điện thoại đè cấu hình cũ, hai máy tính, đồng bộ toàn bộ, ngẫu nhiên)"
  OUT=$("${ANKI_PY:-python3}" "$HERE/dong_bo/test_dong_bo.py" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
else
  echo "– bỏ qua core/test_dict.py, core/test_117.py, core/test_1191.py, core/test_120.py, core/test_121.py, core/test_122.py, core/test_118.py, dong_bo/test_dong_bo.py (cần gói anki: ANKI_PY=<python có anki==26.9.3>)"
fi
echo "== core/test_guests.js"
OUT=$(node "$HERE/core/test_guests.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_life.js"
OUT=$(node "$HERE/core/test_life.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_colors.js"
OUT=$(node "$HERE/core/test_colors.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_music.js"
OUT=$(node "$HERE/core/test_music.js" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
for f in "$ADDON"/web/*.js; do node --check "$f" || FAIL=1; done
echo "== core/test_1313.py (1.31.3: Xưởng mở trang web chung — chỉ mục có tên; Báo lỗi → Gửi qua GitHub)"
OUT=$(python3 "$HERE/core/test_1313.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1314.py (1.31.4: hợp đồng dữ liệu với bản đã phát hành 1.31.3, deck tiếng Trung không còn nhận là tiếng Nhật, Ctrl+Z trong bảng ôn)"
OUT=$("${ANKI_PY:-python3}" -W ignore "$HERE/core/test_1314.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1315.py (1.31.5: Gemini 4 Hydrogen + chia việc theo model, giọng đọc ≤ 3 / phút, Sổ tay làng 1 năm không thêm lượt gọi)"
OUT=$("${ANKI_PY:-python3}" -W ignore "$HERE/core/test_1315.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
echo "== core/test_132.py (1.32: Ngôn ngữ trong vườn — soát chữ Anh / Trung / Hàn bằng công cụ độc lập; deck tiếng Trung / Hàn, lưu cho bản cũ)"
OUT=$("${ANKI_PY:-python3}" -W ignore "$HERE/core/test_132.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|JS:"; [ $RC = 0 ] || FAIL=1
echo "== core/test_132b.py (1.32: kiểm tra lần cuối — 3 bản (1.31.3, 1.31.5, 1.32) thay nhau lưu Cấu hình trường 3.000 lần, dữ liệu hỏng, deck tiếng Trung cấu hình ở bản cũ, chữ người dùng không bị dịch)"
OUT=$("${ANKI_PY:-python3}" -W ignore "$HERE/core/test_132b.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
echo "== core/test_1322.py (1.32.2: pinyin trên từng chữ — đối chiếu 2.000 từ pypinyin, không bao giờ ghép sai; deck Nhật / Anh không đổi)"
OUT=$("${ANKI_PY:-python3}" -W ignore "$HERE/core/test_1322.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ|bỏ qua"; [ $RC = 0 ] || FAIL=1
# trang web chung (site/, GitHub Pages): đăng mã, dữ liệu trang khớp add-on (đổi hình mà quên `node site/tools/xuat_hinh.js` là báo)
echo "== trang/test_trang.py (trang web: đăng / gỡ mã, biểu mẫu issue, GitHub Actions, dữ liệu khớp add-on)"
OUT=$(python3 "$HERE/trang/test_trang.py" "$ADDON" 2>&1); RC=$?
echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
if node -e "require('playwright')" 2>/dev/null; then
  echo "== trang/kiem_tra_trang.js (trang web trong Chromium: vùng vẽ khớp add-on từng điểm ảnh, giải mã = add-on, chạy cả trang)"
  OUT=$(node "$HERE/trang/kiem_tra_trang.js" "$ADDON" 2>&1); RC=$?
  echo "$OUT" | grep -E "✗|KẾT QUẢ"; [ $RC = 0 ] || FAIL=1
else
  echo "– bỏ qua trang/kiem_tra_trang.js (cần Playwright + Chromium)"
fi
[ $FAIL = 0 ] && echo "TỔNG: TẤT CẢ OK" || echo "TỔNG: CÓ LỖI"
exit $FAIL
