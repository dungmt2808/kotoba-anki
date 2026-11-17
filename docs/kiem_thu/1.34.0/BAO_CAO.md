# Báo cáo 1.34.0 — góp ý về bảng ôn, ô chọn deck dạng cây, Trang trí thử (17/11/2026)

Góp ý người dùng chuyển lại sau khi phát hành; ảnh phác `docs/ke_hoach_1_34/` được duyệt ("oke, triển khai đi, xong nhớ
test kỹ nha"). Chi tiết kỹ thuật: PHAT_TRIEN.md mục 2.6z16. **Chi tiết Claude chọn, bạn chưa xem trên máy thật.**
Ảnh trong thư mục này chụp từ **Anki 26.9.4 thật** khi chạy kịch bản `tests/anki/e2e_134.js`.

## 1. Từng góp ý → đã làm gì

| Góp ý | Kết quả |
|---|---|
| Phím 1, 2, 3, 4 cho 4 mức nhớ | **Đã có từ trước**, chỉ là nút không ghi số nên tưởng chưa có → số 1 · 2 · 3 · 4 ở góc từng nút (`134_01_phim.png`) |
| Space / Enter lật thẻ | Đã có từ trước (mặt sau: Space / Enter = Được, như Anki). Sửa thêm 2 chỗ phím không chạy (mục 2) |
| Replay Audio | Nút **Nghe lại** + phím **R** (và **F5**, như Anki). Mặt sau theo tuỳ chọn deck "Skip question when replaying answer". Thẻ không có âm thanh thì nút ẩn |
| Thẻ tự lật (thẻ chọn đáp án…) | Mẫu thẻ gọi lệnh lật / chấm của Anki (`pycmd("ans")`, `"ease1".."ease4"`) → vườn hiểu như Anki: lật chỉ ở mặt trước, chấm chỉ khi đã lật |
| Nút phóng to, bớt viền trên / dưới cho thẻ dài | Nút **Phóng to** + phím **F**: ẩn thanh trên, vườn, đầu bảng ôn một dòng mỏng. Cửa sổ 1366 × 860: thẻ 570 → 732 px; 1024 × 640: 350 → 512 px. **Esc lần 1 thu nhỏ, lần 2 dừng**. Nhớ cho lần sau (`134_05_phong_to.png`, `134_05b_phong_to_1024.png`) |
| Ẩn vườn → Hiện vườn: vùng học không lùi lên, vườn chỉ còn chút xíu | **Lỗi có thật**: Ẩn vườn đổi luôn cỡ khung thẻ sang "To hết chỗ" và lưu, Hiện vườn không trả về (đo ở 1600 × 1000: vườn 60 px → 10 px). Nay Hiện vườn về đúng như lúc đầu, cả máy đã lỡ bấm ở bản cũ (`134_06_hien_vuon.png`) |
| Chọn deck gọn như Anki (nhiều deck con) | Một nút gọn "T134 › Cây › **Unit 3** ▾" → **cây deck như màn Decks của Anki**: ▸ / ▾, số thẻ Mới / Học / Ôn, mở sẵn nhánh đang xem, gõ để tìm, ↑ ↓ ← → Enter Esc, phím / (`134_08_cay_deck.png`) |
| Trang trí nhà: lưu bản trang trí để đặt thử đồ, khỏi phải mua mới thử được | Nút **Trang trí thử** trong bảng Nhà: đặt thử cả đồ chưa mua (vẽ mờ, chữ "thử"), **3 bản mỗi cảnh** tự lưu, "Như cảnh thật", tường & sàn; **Dùng bản này** hỏi một lần rồi mua đủ món còn thiếu + bày đúng như bản thử (`134_09_trang_tri_thu.png`, `134_09b_da_dung.png`) |

## 2. "Tìm thêm một số trường hợp" — đã thử trên bản đang phát hành, rồi sửa

Thử trong Anki thật trên 1.33.3 (`tests/anki/probe_1334.js`, chuột / phím thật):

| Trường hợp | Bản cũ (1.33.3) | 1.34.0 |
|---|---|---|
| **Giữ phím Space** ~0,4 giây (máy lặp phím) | lật rồi **chấm "Được" liền 3 thẻ**, chưa kịp xem mặt sau | chỉ lật; giữ phím 3 chỉ chấm một thẻ |
| Bấm ô chọn (radio) trong thẻ trắc nghiệm rồi nhấn Space | **không lật** (mọi ô nhập bị coi là "đang gõ") | lật; chỉ ô chữ / ô gõ đáp án mới chặn phím |
| Bàn phím số khi tắt NumLock | không chấm | chấm được |
| Mẫu thẻ đếm giờ rồi tự lật, mà bạn chấm trước khi hết giờ | (vườn chưa hiểu tự lật) | hẹn giờ của thẻ cũ bị dọn khi sang thẻ mới → **thẻ sau không bị lật nhầm** |
| Mẫu thẻ gọi "chấm Được" khi đang ở mặt trước | — | bỏ qua, như Anki |
| Thẻ dài, đang bấm ngoài thẻ | phím mũi tên không cuộn | ↑ ↓ PageUp PageDown cuộn khung thẻ |
| Đang dùng bộ gõ (Space để đổi kana → kanji) | không lật | **giữ như cũ** (quyết định 1.25.9) — Space của bộ gõ không lật thẻ |

Trang trí thử / ô deck — trường hợp đã thử (đều đúng): món ở cảnh khác (mua thêm, không lấy sang), số tối đa, quà rương /
món gánh hàng / món tự làm không mua thêm được, đồ giao diện mùa chưa mở, chỗ đặt sai (đè, cửa sổ, đồ treo tường dưới sàn,
ngoài phòng), thiếu xu, xu đổi giữa lúc thử, bấm đúp "Dùng bản này" (trừ một lần), Anki đang đồng bộ đúng lúc lưu bản thử,
lỗi ghi ở từng khoá dữ liệu vườn (không đổi gì), bản thử hỏng / của hồ sơ khác, deck lọc, deck "Default" trống, đổi deck.

**Lỗi tự tìm ra trong lúc test bản mới (đã sửa trước khi đóng gói)**:
1. File bản thử có số "vô cực" làm phần làm sạch dừng vì lỗi (thử 3.000 bản thử rác ngẫu nhiên bắt được).
2. Xu đổi trong lúc đang thử (vd. vừa bù xu điện thoại) mà nút vẫn ghi "Thiếu … xu" (kịch bản Anki thật bắt được).
3. Một lần lưu bản thử bị bỏ vì Anki đang đồng bộ → "Dùng bản này" có thể dùng bản cũ hơn bản đang thấy → nay gửi kèm bản
   đang thấy (Python lưu rồi vẫn tự xét lại mọi thứ).
4. **Ctrl+1…4** (Anki dùng để gắn cờ thẻ) từng chấm thẻ trong vườn như phím 1…4 → nay chỉ phím số trơn mới chấm.

## 3. Dữ liệu (đã phát hành nên phải giữ dữ liệu cũ)

- Không thêm / đổi khoá nào trong collection. Bản thử là **file theo hồ sơ trên máy** (`user_files/ho_so/<mã>/ban_thu.json`)
  — không đồng bộ sang máy khác (bản nháp). "Dùng bản này" lưu đồ đạc như nút Mua / Đặt bây giờ.
- Phóng to / đóng mở nhánh deck: cài đặt theo máy (config `ui.zoom`, `prefs` `kb-deck-fold`), không ghi cờ thu gọn của Anki.
- Mã **1.31.3 đã phát hành** mở cùng collection sau khi dùng bản thử: đọc + lưu bình thường, không mất gì (`core/test_134.py`).

## 4. Kết quả test

| Bộ | Kết quả |
|---|---|
| `core/test_134.py` (mới, collection Anki thật) — bản thử rác ngẫu nhiên 3.000, dùng bản thử mọi đường lỗi, lỗi ghi từng khoá, **600 bản thử ngẫu nhiên có đối chứng**, mã 1.31.3 thật mở cùng collection, cây deck | **78/78** |
| `anki/e2e_134.js` (mới, Anki thật, chuột / phím thật) | **85/85** trên Anki 26.9.4 và **85/85** trên Anki 23.10.1 |
| Bộ test offline `run_all.sh` (65 bộ) trên gói đã đóng | **TẤT CẢ OK** (4 bộ cũ sửa theo cách viết mã mới) |
| 43 kịch bản Anki thật cũ + mới (Anki 26.9.4) | 1.795 / 1.795 (2 ca trượt khi chạy 3 Anki song song, chạy lại riêng thì đạt) |
| Bộ audit cũ (UI 191 + 18 + 7, Xưởng 42, báo 26) | đạt hết |
| Đồng bộ thật (máy chủ đồng bộ của Anki chạy ở máy, `e2e_1312`) | **47/47** |
| **Cài đè** bản đã phát hành 1.31.3 → 1.34.0 trong Anki thật (xu, đồ, nhật ký, cài đặt, mọi khoá dữ liệu) | **19/19** |
| Anki 23.10.1 (bản thấp nhất hỗ trợ): `e2e_1322`, `e2e_1314` | 40/40, 53/53 |


## 5. Cần bạn xem trên máy thật

1. Bảng ôn: số 1–4 trên nút, nút Nghe lại, **Phóng to** (F) với một thẻ dài, Ẩn vườn → Hiện vườn.
2. Một deck thẻ trắc nghiệm / tự lật bạn hay dùng (người góp ý nói tới) — bấm đáp án xem có tự lật không.
3. Ô deck: cây deck với deck thật của bạn (nhiều deck con).
4. Nhà → **Trang trí thử**: đặt thử vài món, đổi Bản 1 / 2 / 3, "Dùng bản này".

Chọn mặc định Claude đặt (đổi được): phím **F** cho Phóng to; **Esc lần 1 thu nhỏ**; **3 bản** thử mỗi cảnh; bản thử chỉ ở
máy này; thú / khách / StackChan không hiện lúc thử; ảnh chụp lúc thử là cảnh thật. Chưa làm "Auto Advance" của Anki (tự lật /
tự chấm sau N giây theo tuỳ chọn deck) — cần thì làm ở bản sau.
