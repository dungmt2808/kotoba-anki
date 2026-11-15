# Kiểm tra lần cuối 1.25.6 (11/11/2026)

Yêu cầu: "chạy kiểm tra lần cuối nhé, kiểm tra kỹ logic, giao diện, tính năng. các test mà hiện chưa có trong bộ test".

## Lỗi tìm thấy và đã sửa
| Lỗi | Tái hiện | Sửa |
|---|---|---|
| Đổi cài đặt ⚙ rồi đóng cửa sổ vườn ngay → **không lưu** | chọn Tuyết, đóng ngay: config `prefs` vẫn trống | `prefs.js` gửi ngay cuối lượt xử lý (cùng một lần bấm gộp một lệnh), dồn dập thì gom 250 ms |
| Hình gốc: "Xoá hết" rồi Lưu → món biến mất khỏi vườn của mọi người | — | không cho lưu khung trống ("Khung này đang trống.") |

## Kịch bản mới (chưa có trong bộ test trước đó)
- Đổi cài đặt rồi đóng cửa sổ ngay; Undo lượt ôn rồi đóng hồ sơ ngay (ghi trước khi đóng, sổ phần thưởng xoá); tốc độ vẽ cỡ Lớn ×5 lúc giông ban đêm (7,1 ms / khung).
- Sửa hình gốc cho nội thất (kotatsu 32 × 17), treo tường (tranh cuộn 13 × 30), đồ theo mùa (cây hồng 32 × 40), món hiếm (hươu 17 × 23), đồ gian bếp (tủ lạnh 15 × 28); khung trống không lưu được.
- Soát bằng Python / node: config `admin` sai kiểu ("true", 1, "tắt"…), khoá đặc biệt (`constructor`, `__proto__`) trong file bản sửa và trong cài đặt — không làm hỏng hình, không đụng đối tượng gốc của trang; mọi khoá cài đặt thật đều qua bộ làm sạch.

## Kết quả
- `tests/run_all.sh` **TẤT CẢ OK**.
- Anki **26.9.4**, mọi kịch bản: `e2e` 24/24 · `e2e_tour` 12/12 · `e2e_114` 34/34 · `e2e_115` 21/21 · `e2e_116` 15/15 · `e2e_117` 55/55 · `e2e_118` 29/29 · `e2e_119` 55/55 · `e2e_120` 103/103 · `e2e_121` 46/46 · `e2e_122` 64/64 · `e2e_1223` 49/49 · `e2e_1226` 40/40 · `e2e_1228` 26/26 · `e2e_123` 65/65 · `e2e_124` 23/23 · `e2e_125` 30/30 · `e2e_1251` 48/48 · `e2e_1253` **39/39** · `e2e_1255` **40/40** · `e2e_kit23` 10/10 · `audit_edge` 58/58 · `audit_full` 181/181 — **0 mục trượt**; `audit.js` không lỗi JS, nhật ký lỗi trống (cảnh báo "nút nhỏ 8" ở Xưởng vùng = ô màu đất / đồi, "cắt 1" ở Kệ báo = tên số rút gọn "…", đều có từ 1.25.2).
- Anki **23.10.1** (bản cũ nhất hỗ trợ, Qt 6.6.1): `e2e_1253` 39/39 · `e2e_1255` 40/40 · `e2e_tour` 12/12 · `e2e_123` 65/65 · `e2e_125` 30/30.
- Chưa chạy: Windows / macOS, đồng bộ AnkiWeb thật, Gemini / giọng đọc thật (proxy của môi trường chặn).
