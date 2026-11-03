# Hình pixel của 1.14 (giống cây, thú nuôi)

Dựng bằng hình cơ bản (`spr.py`: điểm, đường, hình tròn, elip + tự viền đen) thay vì gõ tay từng điểm ảnh.

```bash
cd tests/tools/art
python3 seeds.py   # → seeds.json (8 giống × 5 giai đoạn, 16×16) + seeds.png (ảnh xem thử)
python3 pets.py    # → pets.json (6 thú × walk0/walk1/sit/sleep, 16×13) + pets.png
```
Cần Pillow. Sửa xong thì chép mảng trong `seeds.json` vào `SPR` của `web/seeds.js`, `pets.json` vào `SPR` của `web/pets.js` (cùng thứ tự khoá), rồi đóng gói lại.
