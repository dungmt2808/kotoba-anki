# Kiểm tra độc lập trước release · 12/11/2026

Báo cáo và bằng chứng: [`docs/kiem_thu/audit-2026-11-12/BAO_CAO.md`](../../docs/kiem_thu/audit-2026-11-12/BAO_CAO.md).

Các script này kiểm hành vi mong đợi, **trả mã 1 khi tái hiện lỗi**. Không sửa mã sản phẩm, không thêm vào `run_all.sh` để tránh biến các lỗi chưa sửa thành test xanh. Chỉ dùng dữ liệu tạm và hồ sơ Anki mới; không dùng profile cá nhân. Chưa gọi Gemini thật.

```bash
# Python thường, không cần Qt/network: 779 ca, seed 20261112.
python3 tests/audit_20261112/core_audit.py kotoba_batake --out /tmp/core-audit.json

# Cần Python có aqt/anki và Qt, Node >=22. Cổng chỉ bind loopback.
export ANKI_PY=/duong/dan/venv/bin/python
bash tests/audit_20261112/run_ui_audit.sh kotoba_batake /tmp/ui-audit

# Các nhánh mới của 1.26.1: hướng dẫn, Escape, đổi profile khi đang viết báo.
bash tests/audit_20261112/run_ui_audit.sh kotoba_batake /tmp/lifecycle-audit \
  "$PWD/tests/audit_20261112/lifecycle_audit.js"
```

Mỗi lần chạy UI tạo `/tmp/kotoba-audit-ui-*`, dùng single-instance key/user riêng và chỉ tắt tiến trình của chính nó. Có thể đổi `KB_CDP_PORT` và `KB_CTRL_PORT` nếu chạy hai phiên; không dùng `kill_anki.sh`. Runner xoá khoá Gemini trong cấu hình **hồ sơ thử** trước khi mở Anki. Lifecycle từ chối chạy trên thư mục không phải profile tạm của runner vì nó thay đổi revlog, tạo profile thứ hai và chuyển profile thật trong Anki.

| Script | Phạm vi |
|---|---|
| `core_audit.py` | 337 ca ngày/giờ ở UTC, Việt Nam, Nhật, New York, Berlin, Lord Howe; lịch sử 0–1000 ngày; 360 cấu hình vé đối chiếu với phép liệt kê độc lập; số dư 0/thiếu 1/vừa đủ/dư 1; giới hạn vé và xu game; bản ghi hỏng trong Bếp/Phòng ngủ; mã chia sẻ ba cỡ/ba loại/ảnh ngẫu nhiên và đầu vào hỏng. |
| `ui_audit.js` | 49 ca: kết quả sửa bài về ở 0/300/1000/1800 ms khi đang gõ nhật ký; kiểm chữ trên màn hình và chữ đã lưu; cập nhật revlog + hook sync; 11 mốc giờ chào; Tin làng nhiều mục và resize 1366×860 → 720×520; Escape và nhật ký lỗi. |
| `lifecycle_audit.js` | 10 ca: mở hướng dẫn từ Trò chơi/Lịch hoa/Nhà/Báo rồi đóng bảng; phím Escape qua Chromium; khởi chạy viết báo ở A rồi chuyển sang B trước khi hoàn tất, kiểm ví cả hai hồ sơ. |

`provider_stub.js` dùng để đối chiếu riêng ba bài cũ (`e2e.js`, `e2e_120.js`, `e2e_123.js`) khi môi trường chặn Gemini: chỉ giả danh sách model và cho prefetch giọng Gemini trả “không có”, giữ fallback giọng máy; nội dung assertion của các bài cũ giữ nguyên. Cài lại `show_tooltips=True` như fixture mặc định của bộ cũ. Kết quả này phải được báo riêng với lần chạy nguyên trạng, không coi là kiểm Gemini thật.

```bash
KB_BASELINE_SCENARIO=e2e_120.js bash tests/audit_20261112/run_ui_audit.sh \
  kotoba_batake /tmp/baseline-offline "$PWD/tests/audit_20261112/provider_stub.js"
```

Oracle ngày/giờ dùng lịch địa phương và `ZoneInfo`, thay vì lặp lại phép chia 86400 của add-on. Oracle vé duyệt các tập ngày có thể dùng vé, tối đa hoá số **ngày có ôn thật** trong chuỗi. Mô phỏng Gemini giữ callback rồi hoàn tất bằng `Future`; toàn bộ phần xử lý kết quả, lưu collection, vẽ lại giao diện và chuyển hồ sơ là mã add-on thật.

Ảnh/log/JSON được ghi vào thư mục output; các lần chạy có lỗi vẫn giữ chúng để kiểm chứng. Một nhóm có `harness/...` là lỗi thiết lập/kịch bản, cần xử lý trước khi dùng kết quả của nhóm đó để kết luận về sản phẩm.
