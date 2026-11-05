# Script vẽ phác thảo giao diện 1.23 (không phải test)

Dựng ảnh trong `docs/ke_hoach_1_23/` bằng cách chèn tạm DOM / CSS vào trang vườn thật đang chạy (không sửa mã add-on).
Cần Anki mẫu đang chạy: `tests/anki/setup_demo.sh BASE ADDON` → `run_anki.sh BASE 9333 LOG &` → `KB_ONLY=setup node tests/anki/readme_media.js OUT`.

1. `mock_assets.js`: chụp ảnh "bây giờ", hình 1× của phòng / sân / bãi biển (lấy từ canvas), popup món đồ, thẻ Kho đồ → `/tmp/kb_mock/`.
2. `mock_empty.js`, `mock_emptyyard.js`: phòng trống, sân trống (tạm cất đồ, chụp, đặt lại).
3. Ghép hình bằng Python (PIL) trong phiên 05/11 → `/tmp/kb_mock/build/`. Đoạn ghép chưa lưu thành file; xem lịch sử phiên nếu cần.
4. `mock_build.js` (ảnh 0a–5), `mock_ab.js` (hướng A / B), `mock_paper.js` (thẻ Gemini 6a / 6b) → `/tmp/kb_mock/out/`, rồi pngquant vào `docs/ke_hoach_1_23/`.

Đường dẫn trong script là đường dẫn tuyệt đối của phiên đó (`/home/user/kotoba-anki`, `/tmp/kb_mock`). Khi làm thật bản 1.23 thì bỏ thư mục này.
