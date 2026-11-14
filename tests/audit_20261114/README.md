# Audit độc lập 1.31.0 · 14/11/2026

Các test này tìm hành vi ngoài bộ kiểm thử theo phiên bản. Không sửa mã sản phẩm;
test trượt được giữ nguyên làm minh chứng và để kiểm lại sau khi sửa.

- `core_audit.py`: 2.047 kiểm tra. Dữ liệu lưu sai kiểu ở từng trường lồng nhau;
  tiền vừa thiếu/vừa đủ, sửa/đổi tên/xoá đồ StackChan; từng màu và từng vị trí
  điểm ảnh; **mã thật 1.30.3** mua đồ cùng chỗ đang mặc đồ tự vẽ của 1.31.
- `ui_audit.js`: Anki/QtWebEngine thật, chuột và bàn phím qua CDP. Bốn kích thước
  cửa sổ, 11 tab Nhà, chín chế độ Xưởng; modal mua hàng bằng bàn phím; phản hồi
  lưu Xưởng về trễ giữa hai phiên vẽ; Esc trong lưới Mũ/Mặt/Cổ trống; tham số JSON lồng sai kiểu. Có kiểm tra
  flags của sản phẩm; không mặc định bỏ qua xác nhận mua như các test cũ.
- `lifecycle_audit.js`: đổi **hồ sơ Anki thật**, kiểm collection và file sao lưu
  nhật ký; quan sát việc các hồ sơ dùng chung thư viện báo. Quan sát báo dùng
  chung được ghi là rủi ro thiết kế, không tự coi là một assertion lỗi.
- `run_ui_audit.sh`: tạo hồ sơ mới; không đọc collection người dùng. Chỉ dừng
  tiến trình có đúng đường dẫn hồ sơ tạm của lần chạy. Không chép khoá Gemini
  thật từ môi trường vào hồ sơ test. `KB_AUDIT_BASELINE=1` bật cấu hình fixture
  mà các bài cũ cần: bù xu và khoá giả; vẫn tắt tự gọi Gemini.
- `baseline_provider.js`: chỉ dành cho `e2e.js`, `e2e_120.js`, `e2e_123.js`;
  thay danh sách model/không có prefetch TTS, giữ nguyên assertions gốc.

```bash
ANKI_PY=/path/to/python-with-aqt
export ANKI_PY
"$ANKI_PY" tests/audit_20261114/core_audit.py kotoba_batake \
  --out work/audit/core.json

bash tests/audit_20261114/run_ui_audit.sh kotoba_batake work/audit/ui \
  "$PWD/tests/audit_20261114/ui_audit.js"

KB_CDP_PORT=10941 KB_CTRL_PORT=10942 \
bash tests/audit_20261114/run_ui_audit.sh kotoba_batake work/audit/lifecycle \
  "$PWD/tests/audit_20261114/lifecycle_audit.js"

# Bài cũ: không đổi assertions, chỉ dùng cấu hình fixture phù hợp.
KB_AUDIT_BASELINE=1 KB_CDP_PORT=11101 KB_CTRL_PORT=11102 \
bash tests/audit_20261114/run_ui_audit.sh kotoba_batake work/audit/e2e_131 \
  "$PWD/tests/anki/e2e_131.js"
```

Exit code `1` = assertion hành vi trượt; `2` = lỗi thiết lập/chạy. Những mục
`harness/...` phải được xử lý trước khi tính kết quả sản phẩm. Đọc JSON và log,
không dùng riêng exit code: một vài bài cũ vẫn exit 0 dù có assertion trượt.

Riêng `e2e_1253.js` cũ gọi `kill_anki.sh` để tự khởi động lại. Chỉ chạy bài này
khi không có phiên Anki khác đang dùng chung môi trường; không chạy đồng thời
với các bài UI khác. Runner mới truyền `KB_BASE` đúng hồ sơ của nó và dọn cả
tiến trình khởi động lại.

Trong test lỗi lưu trễ, `_js` chỉ giữ lại thông báo `home/mywear/save`, rồi phát
lại sau khi người dùng mở bản vẽ tiếp. Lệnh, thanh toán, lưu collection, vẽ và
bộ xử lý thông báo là mã sản phẩm thật. Đây là mô phỏng thứ tự callback; không
phải khẳng định mọi lần lưu thực tế đều trễ. Test IME tạo `KeyboardEvent` với
`isComposing/keyCode=229`; chưa thay thế kiểm chứng bộ gõ Windows/macOS thật.

Bản cũ được lấy từ git commit `36bb57b`, cần lịch sử repo đầy đủ. Tất cả state,
collection và nội dung nhật ký/báo trong test đều là dữ liệu tổng hợp.

Môi trường đã chạy: Anki 26.9.4 / Python 3.13.5 / Qt 6.12.0; Anki 23.10.1 /
Python 3.12.14 / PyQt 6.6.1 / Qt 6.6.3 / PyQt6-WebEngine 6.6.0. Cài trong venv
riêng, không hạ phiên bản môi trường đang dùng. Bộ mới có 188 kiểm tra UI mỗi
phiên bản và 7 kiểm tra vòng đời mỗi phiên bản; tổng cùng bộ core là 2.437.

Log bằng chứng đã che khoá thật nếu có và bỏ khoảng trắng cuối dòng để git
không báo lỗi định dạng. Các giá trị, assertions, stack lỗi và kết quả được giữ.

Báo cáo và bằng chứng: [BAO_CAO.md](../../docs/kiem_thu/audit-1.31-2026-11-14/BAO_CAO.md).
