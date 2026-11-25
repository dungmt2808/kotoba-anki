# Kế hoạch: vẽ tay cho Giáng sinh — vẽ lên thiệp + quả châu tự vẽ (25/11, **chờ người dùng duyệt ảnh phác**)

Người dùng 25/11: "giáng sinh hiện tại có nên thêm tự vẽ cái nào không, thiệp/đồ trang trí. để người đó có thể có 1 cái gì đó
riêng với mỗi người chơi" → Claude đề xuất (1) vẽ lên thiệp, (2) quả châu tự vẽ treo lên cây → **"1 và 2 luôn nhé. duyệt trước
rồi làm"**.

Ảnh phác vẽ đè lên vườn thật trong **Anki 26.9.4** (`tests/anki/mock_ve_tay.js`: giao diện mẫu chèn vào trang, hình vẽ tay mẫu do
Claude vẽ; add-on chưa đổi). **Mọi chi tiết Claude chọn** — người dùng xem rồi sửa / duyệt.

| Ảnh | Nội dung |
|---|---|
| `vt_01_xuong_thiep_ve.png` | Xưởng thiệp: thẻ mới **"✎ Vẽ"** cạnh Có sẵn / Tủ lịch / Đồ của bạn — Bút · Tẩy · cỡ 1 / 2 / 3 · Hoàn tác · 32 màu của Xưởng · Xoá hình vẽ · dòng "Mã thiệp: 1.412 / 6.000 ký tự". Hình vẽ (bông tuyết, trái tim, ngôi sao, dây đèn, con mèo, chữ ký "LAN") nằm **trên sticker, dưới chữ** |
| `vt_02_tu_lich_nut.png` | Bảng tủ lịch thêm nút **"Vẽ quả châu ▸"** cạnh "Làm thiệp điều ước ▸" |
| `vt_03_qua_chau_tu_ve.png` | **Quả châu tự vẽ**: 3 quả, mỗi quả lưới 8 × 8 (móc vàng tự thêm), Bút · Tẩy · Hoàn tác · Xoá · 32 màu, xem trước ngay trên cây thông của bạn; mỗi quả treo / gỡ riêng |
| `vt_04_cay_ngoai_san.png` | Cây thông ngoài sân treo 3 quả châu tự vẽ (ảnh phóng to ×4: chạng vạng + ban đêm) |

## 1. Vẽ lên thiệp

- Thẻ **"✎ Vẽ"** trong phần sticker (mặt trước). Đang ở thẻ Vẽ: kéo chuột trên thiệp là vẽ; không chọn / kéo sticker (về thẻ
  Có sẵn để dời sticker). Bút / Tẩy, cỡ 1 · 2 · 3 điểm, **Hoàn tác** (≥ 30 bước trong lúc mở xưởng), **Xoá hình vẽ** (hỏi trước),
  32 màu của Xưởng (cùng bảng màu món tự làm). Mặt sau (điều ước) không vẽ.
- Thứ tự lớp: nền khung → sticker → **hình vẽ** → viền khung → chữ (lời chúc, câu chúc, ký tên luôn đọc được).
- Hình vẽ đi theo thiệp mọi nơi: ảnh PNG, mã thiệp `KBC1:` (bạn bè dán vào thấy cả hình vẽ — kể cả trên trang web), thiệp nhỏ
  treo trên cây, cảnh tối 24, thư sáng 25, Album → Kỷ niệm.
- Mã thiệp tối đa 6.000 ký tự: dòng "Mã thiệp: N / 6.000" cập nhật khi vẽ; vẽ dày quá thì nút Chép mã báo "hình vẽ nhiều quá để
  gửi bằng mã — gửi ảnh PNG nhé" (thiệp vẫn lưu, vẫn treo được). Thiệp chỉ có sticker như bây giờ: mã không đổi.

## 2. Quả châu tự vẽ

- Nút **"Vẽ quả châu ▸"** trong bảng tủ lịch, dùng được từ 1/12 tới 31/12 (cả khi chưa mở ngăn cây nào). Không tốn xu.
- **3 quả**, mỗi quả **8 × 8 điểm**, nền trong suốt; móc vàng tự thêm phía trên. Mỗi quả bật / tắt "treo trên cây" riêng.
- Treo ở **3 chỗ cố định** trên cây thông (trái dưới, phải dưới, giữa trên — đè lên quả châu / đèn của tủ lịch), trên **mọi
  cây thông** đang đặt (như các phần cây của tủ lịch). Có trong cảnh tối 24; thư sáng 25 thêm một câu nhắc quả châu cháu tự vẽ.
- Ngày 1/1 StackChan cất cùng đồ Noel (cây về trơn); quả châu giữ ở **Album → Kỷ niệm** (xem, lưu ảnh PNG).
- Chưa gửi được qua mã (để sau nếu cần).

## 3. Dữ liệu (chỉ thêm trường trong `kotoba_batake_le` → `noel2026`, bản chưa phát hành nên không có máy nào chạy bản cũ)

- Thiệp: thêm `"d"` = hình vẽ 120 × 80 nén theo hàng (như điểm ảnh món tự làm), mã màu của Xưởng; làm sạch khi đọc (sai cỡ / màu
  lạ → bỏ hình vẽ, giữ thiệp). Mã thiệp mang `"d"`; trang web (`site/thiep.js`) vẽ được.
- Quả châu: `"orn": [{"p": 64 ký tự, "on": 0 | 1, "at"} | null × 3]`; hai máy gộp theo lần sửa sau (dấu thời gian `_bump` như thiệp).
- Không thêm khoá collection, không thêm mục config.

## 4. Test sẽ làm

- Python: làm sạch / nén / giải nén hình vẽ (dữ liệu bừa, cỡ sai, màu lạ), mã thiệp có hình vẽ (≤ 6.000, quá dài báo), gộp hai
  máy (thiệp + quả châu, ngẫu nhiên có đối chứng), 1/1 cất, thư nhắc quả châu.
- Chromium: vẽ bằng chuột (bút / tẩy / cỡ / hoàn tác), thứ tự lớp (chữ trên hình vẽ), trang web vẽ thiệp có hình vẽ giống hệt add-on.
- Anki thật (26.9.4 + 23.10.1): vẽ thiệp bằng chuột thật → lưu → mở lại; chép mã → dán ở Kỷ niệm; quả châu → cây ngoài sân;
  cảnh tối 24; cài đè 1.31.3 → bản mới; hạ bản.
