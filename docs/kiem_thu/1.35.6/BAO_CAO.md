# 1.35.6 — nút "Ẩn vườn / Hiện vườn" trên bảng Báo (19/11 khuya)

Người dùng: "giúp tớ thêm phần báo có mục ẩn vườn, hiện vườn nhé. sau đó test kỹ thêm, vì đây là bản release cuối rồi."

**Cách bày Claude chọn, người dùng chưa xem trên máy thật.** Không đổi lưu trữ / config / file Python nào (test so với 1.35.5
từng byte) — cập nhật đè từ 1.31.3 hay 1.35.5 đều giữ nguyên dữ liệu.

## 1. Đã làm

| | |
|---|---|
| **Nút** | Bảng 新聞 có nút **Ẩn vườn** ngay trước nút Thoát (cùng kiểu với nút của bảng ôn và bảng Trò chơi). Bấm → sân + ruộng ẩn, khung báo cao kín cửa sổ (cửa sổ 1850 × 1130: 760 → 880 px; 1920 × 1080: 760 → 830 px), nút thành **Hiện vườn**. Bấm lại → về như cũ. |
| **Dùng chung với Trò chơi** | Như nút của Trò chơi (1.35.3), nút đổi chế độ "Trò chơi & báo" ở ⚙ → Giao diện: ẩn ở Báo thì Trò chơi / Lịch hoa cũng ẩn và ngược lại; hai nút luôn cùng chữ. Bảng ôn (chế độ "Khi ôn thẻ") và màn chính không đổi. Nhớ qua lần mở lại Báo và lần đóng / mở cửa sổ vườn (lưu ở `config.json` → `ui.panel`, giá trị có từ 1.14 — bản 1.31.3 đọc được). |
| **Không làm gián đoạn** | Bài đang đọc không vẽ lại, giữ nguyên chỗ đang cuộn; đang gõ chép chính tả mà bấm nút thì ô gõ vẫn giữ con trỏ và chữ, gõ tiếp được ngay. |

## 2. Test kỹ tìm thêm (đã sửa)

1. **Hàng trên cùng của tab Báo xuống dòng ở cửa sổ ~1024–1110 px.** Tab Báo (Ẩn furigana + Hiện bản dịch + Xu) cần
   ~1.044 px; bản 1.35.5 vừa khít cửa sổ 1024 px (thừa 2 px), thêm nút là thành 2 hàng (36 → 75 px), khung báo bị đẩy xuống.
   Sửa (`paper.js fitTop`): hàng xuống dòng mà bỏ phần chữ Việt của tiêu đề bớt được một hàng thì tiêu đề chỉ còn **新聞**
   (các tab ngay cạnh đã ghi "Báo", "Chép chính tả"); không bớt được (cửa sổ rất hẹp) thì giữ tiêu đề đủ như 1.35.5. **Đo
   thật, không đặt ngưỡng px**: font giao diện là font của máy (DotGothic16 không đi kèm gói) nên bề rộng chữ khác nhau giữa
   Windows / macOS / Linux. Lần thử đầu dùng ngưỡng 1110 px cố định — test 6 kiểu font cho thấy với font kiểu mono ở cửa sổ
   ~700 px hàng thành 3 dòng → đổi sang đo.
   Phụ: cửa sổ ~800 px, tab Kệ báo / Nguồn báo nay một hàng (1.35.5: hai).
2. **Dòng "Đang hiện N/M từ (ưu tiên từ đã học)." còn nằm dưới bảng lúc Ẩn vườn.** Đây là chú thích của ruộng (`#kb-note`,
   hiện khi deck nhiều từ hơn `max_plants`, hoặc "Deck này chưa có thẻ nào để gieo."). Ruộng ẩn mà dòng này vẫn hiện dưới
   bảng Báo / Trò chơi / **bảng ôn** → trang dài hơn cửa sổ 22–40 px, phải cuộn (cả nút Ẩn vườn của Trò chơi 1.35.3 và của
   bảng ôn). Sửa: ruộng ẩn thì dòng này ẩn theo; ruộng hiện thì như cũ.

## 3. Test

| Test | Kết quả | Mã 1.35.5 |
|---|---|---|
| `core/test_1356.py` (offline): so với 1.35.5 — cùng 78 file, mọi `.py` / `config.json` giống hệt, 29 khoá collection như cũ, body.html = 1.35.5 + nút, garden.css chỉ thêm dòng; `clean_ui` của 1.35.6 + **1.31.3 đã phát hành** giữ `ui.panel` Ẩn; soát mã | 23/23 | đỏ 11 |
| `core/test_1356.js` (Chromium, mã add-on thật): `ui:set`, lớp `kb-ui-*`, hai nút cùng chữ, mousedown, khung báo 12 chiều cao × ẩn / hiện, **4.716 bố cục hàng trên cùng** (131 bề ngang 700 → 2000 px × 6 kiểu font × 6 trạng thái nút) | 13/13 | không chạy được (không có nút) |
| `anki/e2e_1356.js` (Anki 26.9.4 thật) — mục 1 + 2, 5 cỡ cửa sổ × ẩn / hiện × 4 tab, chuột thật qua CDP | 36/36 | — |
| _(điền sau khi chạy)_ | | |

## 4. Câu hỏi cho người dùng

Lịch hoa (và Cấu hình trường) cũng thuộc chế độ "Trò chơi & báo" nên **ẩn vườn theo** khi cậu bấm Ẩn vườn ở Báo / Trò chơi,
nhưng chưa có nút riêng để hiện lại (phải về Báo / Trò chơi hoặc ⚙ → Giao diện). Có muốn thêm nút như vậy cho Lịch hoa không?

## 5. Xem trên máy thật

1. Báo → **Ẩn vườn**: khung báo kéo tới gần đáy cửa sổ, không phải cuộn trang; **Hiện vườn** về như cũ.
2. Ẩn vườn ở Báo → Thoát → Trò chơi: vườn cũng ẩn, nút ghi "Hiện vườn".
3. Thu cửa sổ Anki còn ~1000 px: hàng trên cùng của Báo vẫn một hàng (tiêu đề còn 新聞); kéo rộng ra → tiêu đề đủ lại.
4. Chép chính tả: đang gõ dở thì bấm Ẩn / Hiện vườn → gõ tiếp được ngay.
