# Vườn đỡ rối mắt khi nhiều cây — ảnh phác (17/11, chờ người dùng chọn)

Người dùng: "nếu vườn cây có nhiều cây quá thì có vẻ nhìn hơi rối mắt. có thể chỉnh vườn to lên hoặc giảm max_plan trong
config xuống, nhưng còn cách nào khác không" → "chưa biết, vẽ thử được không". Ảnh vẽ bằng chính `Garden.render` của add-on
với thứ tự cây khác + lối đi / nhãn / lớp mờ vẽ đè (`tests/anki/mock_vuon_gon.js`), vườn mẫu 300 cây giống người học lâu
(`tests/anki/demo_nhieu_cay.py`: 20 hạt giống, 15 mầm, 50 cây non, 85 ra hoa, 130 ra quả, 24 cây cần tưới).

Nguyên nhân rối: cây đang xếp theo thứ tự tạo thẻ (`garden_core.build_garden`: `order by id`) → mọi giai đoạn xen kẽ, giọt
nước "khát" rải khắp ruộng.

| Ảnh | Cách |
|---|---|
| `vg_00_hien_tai.png` | hiện tại |
| `vg_01_luong_giai_doan.png` | 1. xếp thành luống theo giai đoạn, lối đi + nhãn "Ra quả · 130" giữa các luống |
| `vg_02_can_tuoi_len_dau.png` | 1b + 4. luống "Cần tưới hôm nay" lên đầu (giọt nước chỉ ở luống đó), rồi các luống theo giai đoạn |
| `vg_03_loc_ra_hoa.png` | 2. bấm "Ra hoa" ở hàng chú thích → chỉ cây ra hoa sáng, cây khác mờ (thứ tự như cũ) |
| `vg_04_vuon_qua.png` | 3. vườn quả: cây Ra quả chưa tới hạn gom thành một khung nhỏ ở đầu ruộng (bấm để xem đủ), ruộng chính chỉ còn cây đang lớn — cả vườn vừa một màn hình |

Chỉ đổi cách hiển thị (không đổi dữ liệu); chọn ở ⚙ (vd. "Sắp ruộng: Như cũ / Theo giai đoạn / Cần tưới lên đầu").
Ghi chú: luống thêm lối đi + chỗ trống cuối luống → ruộng dài thêm khoảng 2–4 hàng.

## Kiểu ngăn luống (17/11)

Người dùng xem `vg_01`: "mình thấy không đẹp á. cái dải dài này có vẻ làm vườn không đẹp" (dải đất kẻ ngang cả ruộng giữa
các luống) → vẽ lại 3 kiểu không có dải đất (`node mock_vuon_gon.js OUT kieu`):

| Ảnh | Kiểu |
|---|---|
| `vg_01b_bien_go.png` | chỉ biển gỗ nhỏ cắm ở đầu luống; luống mới bắt đầu hàng mới (khoảng cỏ cuối luống trước tự làm chỗ ngăn) |
| `vg_01c_da_lat.png` | biển gỗ + vài viên đá lát cách quãng trên cỏ |
| `vg_01d_vien_hoa.png` | biển gỗ + viền hoa dại nhỏ trên cỏ |
