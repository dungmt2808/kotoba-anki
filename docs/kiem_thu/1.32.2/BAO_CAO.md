# Báo cáo kiểm thử 1.32.2 — nút ✎ Sửa / phím E sửa thẻ ngay lúc ôn, pinyin trên từng chữ

Người dùng (sau khi xem ảnh phác `docs/ke_hoach_1_32/1322_*.png`): "tớ thấy giao diện ổn rồi. làm tiếp, sau khi làm thì
test thiệt kỹ nha". Bản làm đúng như ảnh phác; **chi tiết Claude chọn** (PHAT_TRIEN.md mục 2.6z11, mục 7).

## 1. Đã làm

| Phần | Nội dung |
|---|---|
| Nút ✎ Sửa / phím E | Góc dưới bên trái bảng ôn (cả hai mặt), cao bằng nút Lật thẻ / nút chấm; E không chạy khi đang gõ / có Ctrl / Alt / ⌘; nút không lấy focus |
| Cửa sổ Sửa thẻ | Cửa sổ sửa note của chính Anki (`edit_win.py`), đăng ký với bộ quản lý cửa sổ của Anki: một cửa sổ, đóng hồ sơ thì lưu rồi đóng; không dựng được → Trình duyệt thẻ ở đúng note |
| Sau khi lưu | Thẻ hiện chữ mới ở đúng mặt đang xem, "Đã lưu thẻ.", cây cập nhật; không tính lượt ôn, không xu, không revlog |
| Pinyin trên từng chữ | Thẻ cây + ô gợi ý của deck tiếng Trung; ghi số → dấu thanh; chia được nhiều kiểu → giữ dòng dưới như 1.32.1 |
| Lưu trữ | Không khoá collection / config mới |

## 2. Lỗi tìm ra trong lúc test (đã sửa)

1. **Hai lần sửa note trong cùng một giây không được nhận ra** (e2e): `notes.mod` tính theo giây — sửa ở cửa sổ chính bằng
   Undo rồi sửa ở Trình duyệt thẻ ngay sau đó, thẻ đang ôn không dựng lại. Sửa: so nội dung note (mod + chữ các trường +
   tag + mtime kiểu note).
2. **Pinyin viết liền bị chia sai** (đối chiếu 2.000 từ với pypinyin): "zàngáo" (藏獒, deck bỏ dấu nháy) thành zàn + gáo;
   "xuésheng" cho từ 3 chữ thành xu + é + sheng. Sửa: theo chính tả pinyin (âm tiết bắt đầu bằng a / e / o giữa từ phải
   có dấu nháy), chia được nhiều kiểu thì không đoán; pinyin ghi số dùng con số làm chỗ ngắt → **0 / 2.000 ghép sai**.
3. Hai kịch bản test cũ lỗi thời từ trước (trượt y hệt trên mã 1.32.1 gốc): `anki/e2e_1251.js` chờ "Nghĩa → gõ từ" cho deck
   tiếng Hàn (từ 1.32.0 là "Nghĩa → gõ chữ Hàn"), `audit_20261112/ui_audit.js` chờ câu Tin làng cũ ("Còn 3 ngày nữa…" →
   1.30.3 đổi thành "Học thêm 3 ngày nữa…"). Đã cập nhật kịch bản.

## 3. Kết quả

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` (offline, `ANKI_PY` = Anki 26.9.4; 60 bộ, có `core/test_1322.py`) | **TẤT CẢ OK** |
| `core/test_1322.py` | **69 / 69** — 2.000 từ pypinyin × 5 cách viết (cách / nháy / liền / số cách / số liền): 0 ghép sai; ca riêng (a / e / ou, ü, thanh nhẹ, chữ hoa, mp3, 儿, ngoặc Anki); soát mã nút Sửa; khoá collection = 1.31.5; deck Nhật / Anh giống hệt mã 1.31.5 |
| `anki/e2e_1322.js` — **Anki 26.9.4** | **40 / 40** |
| `anki/e2e_1322.js` — **Anki 23.10.1** (bản cũ nhất add-on hỗ trợ) | **40 / 40** |
| `anki/run_capnhat.sh` cài đè **1.31.3 (đã phát hành) → 1.32.2** | **19 / 19** (5 trước + 14 sau) |
| 45 kịch bản Anki thật (mọi kịch bản cũ + `e2e_1322`, mỗi kịch bản một hồ sơ mới) | **2.071 / 2.071** |

`e2e_1322.js` đi qua: nút ở mặt trước / mặt sau (vị trí, cỡ), phím E / nút mở đúng note, mở 2 lần vẫn một cửa sổ, đóng không
sửa → không báo gì, sửa → chữ mới đúng mặt + "Đã lưu thẻ." + cây cập nhật, revlog / xu / cards.mod không đổi, sửa xong chấm
bình thường, vừa sửa thì nút ↶ Hoàn tác ẩn + Ctrl+Z không hoàn tác nhầm, Edit → Undo ở cửa sổ chính trả chữ cũ, E trong ô gõ /
ô đáp án / Ctrl+E / Alt+E / ⌘E không mở, đang lưu lượt chấm thì bỏ qua, sửa ở Trình duyệt thẻ khi đang ôn, cửa sổ chuyển note
khi bấm E ở thẻ kế tiếp, đóng vườn khi đang sửa, note bị xoá khi đang sửa, không dựng được trình sửa → Trình duyệt thẻ, Anki
đóng mọi cửa sổ (như đóng hồ sơ) → lưu rồi đóng, không khoá collection mới, bố cục 1366 / 1024 / 720 px; pinyin: 你好 (ghi
số), 学生 (thanh nhẹ), 中[zhong1]国[guo2], fangan (không đoán), 一点儿, ô gợi ý, chữ HTML trong trường, deck tiếng Nhật.

Kịch bản dừng giữa chừng khi chạy 3 Anki song song (`e2e_125`, `e2e_115`, `e2e_128_fix`: trang không trả lời kịp / cổng
chưa nhả; `e2e_1314` một ca Ctrl+Z chen giữa lúc lưu) đều **đạt khi chạy riêng** — đã tính vào bảng trên.

Ảnh: `1322_nut_sua_truoc.png`, `1322_nut_sua_sau.png`, `1322_da_luu.png`, `1322_720.png`, `1322_pin_ni_hao.png`.

## 4. Nên xem trên máy thật

1. Ôn vài thẻ trong vườn, bấm ✎ Sửa (hoặc E) ở mặt trước và mặt sau → cửa sổ "Sửa thẻ · ことば畑" mở đúng thẻ.
2. Sửa một trường → bấm Close → thẻ hiện chữ mới, chấm tiếp bình thường.
3. Deck tiếng Trung: bấm cây → pinyin nằm trên từng chữ.
