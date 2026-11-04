# Hình pixel của 1.14 (giống cây, thú nuôi)

Dựng bằng hình cơ bản (`spr.py`: điểm, đường, hình tròn, elip + tự viền đen) thay vì gõ tay từng điểm ảnh.

```bash
cd tests/tools/art
python3 seeds.py   # → seeds.json (8 giống × 5 giai đoạn, 16×16) + seeds.png (ảnh xem thử)
python3 pets.py    # → pets.json (6 thú × walk0/walk1/sit/sleep, 16×13) + pets.png
```
Cần Pillow. Sửa xong thì chép mảng trong `seeds.json` vào `SPR` của `web/seeds.js`, `pets.json` vào `SPR` của `web/pets.js` (cùng thứ tự khoá), rồi đóng gói lại.

## Món hiếm 1.16 (`web/rare_art.js`)
Hình được dựng thẳng trong JS bằng các hàm `grid / rect / disc / ellipseFill / gline / outline` giống home.js. Xem trước:
```bash
node tests/tools/art/rare_dump.js ADDON/web/rare_art.js ADDON/web/home.js /tmp/rare.json && python3 tests/tools/art/rare_render.py /tmp/rare.json /tmp/rare.png
```
Ảnh có cả khung hoạt hình (hươu cúi chào, kappa chớp mắt, kabuto loé) và vài món cũ để so cỡ.

## Khách ghé vườn 1.21 (`web/guests.js`)
```bash
cd tests/tools/art
python3 guests.py [ẢNH.png]   # → guests.json (15 khách × 2–5 khung, mặt quay sang phải) + ảnh xem thử ×6 trên nền cỏ
```
Bảng màu = `spr.PAL` + vài màu riêng (nâu chim sẻ / tanuki, tím dơi, trắng xám cò / sếu). Chân chim / hươu vẽ bằng màu `k` (không tự viền thêm) cho mảnh. Sửa xong thì chép `guests.json` vào `SPR` của `web/guests.js` (`core/test_121.py` kiểm tra hai bên khớp nhau). Đom đóm không có hình (chấm sáng vẽ trong JS).
