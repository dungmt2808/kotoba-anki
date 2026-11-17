# Audit độc lập 1.33.2 · 17/11/2026

Kiểm hành vi ngoài bộ test hiện có, không sửa mã sản phẩm. Báo cáo:
[BAO_CAO.md](../../docs/kiem_thu/audit-1.33.2-2026-11-17/BAO_CAO.md).

Các test dùng collection/hồ sơ Anki mới và dữ liệu tổng hợp. Không gọi Gemini thật. Cần Python có `aqt`/`anki`, Node >=22 và các thư viện Qt như `tests/README.md`.

## Bộ mới

| File | Phạm vi |
|---|---|
| `storage_audit.py` | 21 assertion: lỗi đọc API một lần/kéo dài ở các kho; sao lưu cũ; tiến độ và dữ liệu không liên quan phải được giữ; đối chứng nhật ký, mobile và điểm ảnh |
| `ui_audit.js` | 53 assertion: checkbox đổi báo qua trạng thái rỗng/tiếng Việt, kho báo sau xóa khóa, lỗi ghi trả thưởng và thử lại, mua ghế khi kho thú đọc lỗi, 15 màn ở các mức zoom + tên deck dài, dùng `ai_start` thật kiểm lần nhập khóa đầu tiên |
| `review_race.js` | 7 assertion: scheduler thật chấm thẻ trong cùng giây, không dựa vào `mod` để bỏ sót trạng thái mới, hai lần thử lại; đối chứng backend phát thông báo khi nhận ra thẻ đổi |

**81 assertion mỗi bản Anki.** Trên nguồn/gói tại `9ef5272`, 30 assertion trượt ứng với 5 lỗi chính. Kết quả giống nhau trên Anki 26.09.4 và 23.10.1. Exit `1` là lỗi hành vi đã tái hiện, exit `2` là lỗi thiết lập. Giữ nguyên assertions khi sửa sản phẩm.

```bash
export ANKI_PY=/path/to/python-with-aqt
mkdir -p work/audit-20261117

"$ANKI_PY" tests/audit_20261117/storage_audit.py kotoba_batake \
  --out work/audit-20261117/storage.json

KB_CDP_PORT=11941 KB_CTRL_PORT=11942 \
  bash tests/audit_20261114/run_ui_audit.sh kotoba_batake \
  work/audit-20261117/ui "$PWD/tests/audit_20261117/ui_audit.js"

KB_CDP_PORT=12411 KB_CTRL_PORT=12412 \
  bash tests/audit_20261114/run_ui_audit.sh kotoba_batake \
  work/audit-20261117/review "$PWD/tests/audit_20261117/review_race.js"
```

Thay đường dẫn `kotoba_batake` bằng thư mục giải nén gói để kiểm đúng artifact phát hành. Runner UI sao chép sang hồ sơ dùng một lần, không dùng collection cá nhân. Trong `review_race`, đồng hồ chỉ được chờ tới đầu giây để tạo điều kiện cạnh tranh; ca lỗi chính không đặt giả `cards.mod`. Hàm cảnh báo được thu lại để tránh modal chặn runner.

## Chạy bộ có sẵn

```bash
bash tests/run_all.sh kotoba_batake

# Chạy tuần tự từng lệnh, hoặc ba shell riêng để chạy các shard song song.
"$ANKI_PY" tests/audit_20261117/run_regression.py kotoba_batake work/audit-20261117/regression --shard 0
"$ANKI_PY" tests/audit_20261117/run_regression.py kotoba_batake work/audit-20261117/regression --shard 1
"$ANKI_PY" tests/audit_20261117/run_regression.py kotoba_batake work/audit-20261117/regression --shard 2

# Đồng bộ thật bằng máy chủ cục bộ; không dùng AnkiWeb.
KB_CDP_PORT=12101 KB_CTRL_PORT=12102 KB_SYNC_PORT=12103 \
  bash tests/dong_bo/run_e2e.sh kotoba_batake work/audit-20261117/sync

# Cài đè thật; helper mới chỉ dừng tiến trình của chính nó.
git show e64eb22:kotoba_batake.ankiaddon > work/audit-20261117/old-1.31.3.ankiaddon
"$ANKI_PY" tests/audit_20261117/run_upgrade.py \
  work/audit-20261117/old-1.31.3.ankiaddon kotoba_batake.ankiaddon work/audit-20261117/upgrade
```

`run_regression.py` chạy 39 bài gốc, giữ nguyên assertions, có kiểm cả dấu trượt trong log vì một số bài cũ exit 0 khi có assertion trượt. Ba bài cần giả model/giọng dùng `baseline_provider.js` có sẵn. Các bài có runner nhiều pha hoặc helper dừng mọi Anki được tách ra; `e2e_1332` đã chạy riêng.

`trace_1223.js` chỉ thêm quan sát vào test cũ, không đổi assertions/hàm giả; giúp phân biệt fake ghi nhận một lời gọi lúc chưa có khóa với việc tạo job Gemini thật:

```bash
KB_AUDIT_BASELINE=1 KB_CDP_PORT=12401 KB_CTRL_PORT=12402 \
  bash tests/audit_20261114/run_ui_audit.sh kotoba_batake \
  work/audit-20261117/trace "$PWD/tests/audit_20261117/trace_1223.js"
```

Đợt audit này dùng Python 3.12.14; Anki 26.09.4 + Qt 6.12.0 và Anki 23.10.1 + PyQt6 6.6.1 / Qt 6.6.3 / PyQt6-WebEngine 6.6.0, mỗi bản trong venv riêng. Đặt `TZ=Asia/Ho_Chi_Minh` trước khi khởi động Anki.
