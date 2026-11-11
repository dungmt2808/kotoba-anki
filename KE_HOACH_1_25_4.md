# Kế hoạch 1.25.4 — admin sửa hình gốc + cỡ cảnh Lớn bớt "pixel bự" (11/11, CHƯA LÀM — chờ người dùng chọn)

Người dùng (11/11, sau 1.25.3): "tớ nghĩ là ra bản mới cho người dùng add-on luôn, ví dụ có 1 vài thiết kế có sẵn, có những chi tiết
bị thiếu, như cái đèn này, thiếu 1 pixel viền đen chỗ cái cán rất khó chịu, nên nhiều khi tớ và người dùng khác muốn sửa nó …
thứ 2 là nếu được thì tăng số lượng pixel lên được không, vì coi giao diện cỡ cảnh lớn thì mọi thứ nó bị chi tiết quá, tự nhiên
pixel nó bự lên nên nhìn không đẹp lắm, hoặc có cách khác tốt hơn cũng được."

Đã làm ngay ở 1.25.3: đèn lồng giấy (`SPR.chochin`) nối liền cán với thân (ảnh `docs/ke_hoach_1_25_4/03_den_long_truoc_sau.png`).
Công cụ soát viền: `tests/tools/art/dump_all.js` (lấy 266 hình có sẵn bằng chính `web/*.js`) + `check_outline.py` (khuyết viền /
lộ màu) — nhạy, nhiều chỗ cố ý (khe giữa chân, nan rào, bậc cây thông), dùng để soát bằng mắt, không phải danh sách lỗi.

## 1. Admin sửa hình gốc → ra bản mới (người dùng chọn hướng "bản mới cho mọi người")

Ảnh phác: `docs/ke_hoach_1_25_4/02_admin_sua_hinh_goc.png` (chụp trong Anki thật, nút + Xưởng nạp sẵn hình gốc).

- Bật `"admin": true` trong config (Tools → Add-ons → Config) — chỉ máy người sửa; người dùng thường không thấy gì khác.
- Mỗi món có sẵn (đồ sân / nội thất / món hiếm / đồ theo mùa, thú nuôi, giống cây, khách) có nút **Sửa hình gốc** → Xưởng mở
  sẵn đúng hình (nhiều khung: thú 4 khung, giống 5 giai đoạn, đồ động như chong chóng nhiều khung), đúng bảng màu của nhóm đó
  (đồ dùng bảng `P` của home.js; thú / giống / khách có bảng riêng). Không tốn xu.
- Lưu → bản sửa ở `user_files/mau_sua.json` (máy này), trang thay hình ngay (`SPR[id]` / khung) — thấy trên sân, Nhà, ảnh chụp.
- **Xuất bản sửa** → một file `.json` (id, nhóm, khung, các hàng điểm ảnh, bản gốc để so). Người dùng khác cũng bật admin, sửa,
  gửi file cho chủ dự án duyệt.
- Phát hành: chép file vào `kotoba_batake/mau_sua.json` (đi kèm gói) — add-on nạp lúc mở trang, đè lên hình trong mã — hoặc
  chạy `tests/tools/art/ap_dung_mau.py` ghi thẳng vào `web/*.js` cho hình gõ tay; đóng gói, đăng AnkiWeb → mọi người cập nhật
  là thấy. Test: bản sửa sai cỡ / màu lạ / id lạ bị bỏ; hình gốc không đổi khi không có bản sửa.

## 2. Cỡ cảnh Lớn: điểm ảnh bự

Ảnh phác: `docs/ke_hoach_1_25_4/01_co_lon_3_cach.png` (cùng vườn, 1850 × 1000).

| Cách | Làm gì | Ưu / nhược |
|---|---|---|
| Hiện tại | Lớn = phóng tới ×7 | nhà / cây to, viền dày, "pixel bự" |
| **A (đề xuất)** · Thấy rộng hơn ×4 (hoặc A' ×5) | Giữ cỡ điểm ảnh như Vừa; dải cao hơn dành cho trời (mây, mặt trời) + bãi cỏ phía trước | không phải vẽ lại; Vừa / Lớn cùng độ mịn; hai bên sân còn trống (sau có thể thêm lối đi, hàng rào xa) |
| B · Làm mịn tự động (Scale3x) | Vẽ cảnh 1 điểm ảnh / ô, máy chia mỗi điểm thành 3 × 3 và bo cạnh chéo, rồi phóng ×2 | khung nhìn như hiện tại, cây / hòm thư tròn hơn; nét hơi "mềm", tốn thêm vài ms mỗi khung |
| C · Vẽ lại chi tiết gấp đôi | ~270 hình × 4 lần số điểm ảnh | đẹp nhất nhưng rất lâu, không đề xuất |

Chờ người dùng chọn A / A' / B (có thể là tuỳ chọn trong ⚙ → Màn chính → Cỡ cảnh).
