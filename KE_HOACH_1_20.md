# Kế hoạch 1.20: Lịch hoa, nhật ký, khách ghé vườn, tự vẽ giống cây, chia sẻ thiết kế, chụp ảnh vườn

> **Trạng thái: CHƯA LÀM.** Viết 04/11/2026 sau khi xong 1.19.1, từ buổi người dùng và Claude cùng nghĩ ý (brainstorm). Làm xong thì **xoá file này**, dòng trỏ tới nó ở `README.md` mục 0 và dòng `!/KE_HOACH_1_20.md` trong `.gitignore`. Làm dở thì cập nhật mục 8 "Tiến độ" rồi mới commit.
> **Bản mẫu giao diện** (người dùng đã xem 04/11): `KE_HOACH_1_20_mau.html` — mở bằng trình duyệt sau khi chép `garden.css` của gói (`tests/tools/unpack.sh` → `/tmp/kb_src/kotoba_batake/web/garden.css`) vào cạnh file; `?v=month` (Lịch hoa tháng + khung ngày: Nhật ký / Luyện viết), `?v=year` (cả năm), `?v=book` (Cuốn nhật ký + Kệ sách). Xoá cùng file kế hoạch khi làm xong.
> Cách làm việc, môi trường, test: như `README.md` mục 8 và `tests/README.md` (giải nén gói → sửa → test offline + Anki thật → đóng gói).

---

## 0. Người dùng nói gì (giữ đúng tinh thần)

- "Anki thì để học là chính nên **trò chơi và luyện thẻ là đủ rồi**, còn lại là **tập trung vào giao diện và thành quả của việc học**." Lý do người dùng thêm tự vẽ đồ và vẽ vùng: để khi đã đủ xu, việc ôn **vẫn còn tạo ra giá trị**.
- → **Không thêm mini-game mới, không thêm áp lực** (không thanh năng lượng, không mất đồ / cây chết khi vắng, không bảng xếp hạng, không chuỗi bắt buộc). Không có gì đụng tới lịch FSRS.
- Đã chọn:
  1. **Khách ghé vườn** (kiểu Neko Atsume) — "ý 1 hay đó".
  2. **Lịch hoa** — "thiết kế giống heatmap add-on hay mood tracker trong app journal: một giao diện lịch nho nhỏ, đánh dấu ngày nào ôn (mở bằng cách ấn vào chuỗi), có lịch mùa nào, lễ nào luôn".
  3. **Nhật ký một dòng** + **sticker tâm trạng** — "nhật ký thì người dùng có thể viết nhật ký hoặc luyện viết luôn (**nên để riêng**)".
  4. **Cuốn nhật ký** — "cuối năm hoặc cuối tháng thì **xuất nó thành một cuốn** để người dùng đọc lại".
  5. **Tự vẽ giống cây**, **mã chia sẻ thiết kế**, **chụp ảnh vườn** — "cũng ổn luôn".
- Giao diện mùa: Claude đề nghị **giữ mua một lần** (thuê là mất thứ đã có, như đánh thuế việc học). Muốn có chỗ tiêu xu theo mùa thì dùng đồ dùng một mùa / món mới mỗi năm (mục 6). Người dùng chưa trả lời: **hỏi lại trước khi đổi gì ở phần mùa**.
- Người dùng định **chia sẻ add-on** và mỗi mùa vẽ thêm đồ: dùng mã chia sẻ thiết kế để phát đồ mùa mà không cần ra bản add-on mới (mục 5.2). Trước khi đăng: không kèm dữ liệu giáo trình GUNGUN, kiểm tra giấy phép / tên **StackChan** (dự án robot có thật của người khác), ghi bản Anki hỗ trợ trong manifest.

---

## 1. Lịch hoa (làm trước — nền cho nhật ký và cuốn nhật ký)

- **Mở**: bấm chữ "· N ngày liền" / chuỗi ở thẻ Hôm nay (`web/garden.js` khoảng dòng 540), hoặc phím tắt (chọn phím chưa dùng, ví dụ `L`). Bảng nổi nhỏ (không chiếm cả màn như bảng Báo).
- **Xem tháng** (mặc định) — bản mẫu đã cho người dùng xem:
  ```
    ◂   Tháng 11 · 2026   ▸                       [Tháng] [Năm]
    ════ Mùa lá đỏ 紅葉 (1/11 – 10/12) ═════════════════════
     T2    T3    T4    T5    T6    T7    CN
                                           .1
     o2    O3    @4    .5    o6    O7    O8
  ```
  - Mỗi ô là **một bông hoa pixel**: không ôn = chỉ có đất; ôn càng nhiều hoa càng to / đậm (4–5 mức như heatmap; ngưỡng theo `daily_goal`, vd. < 25% / < 100% / ≥ 100% / ≥ 200% mục tiêu). Ngày trống **không bị đánh dấu xấu**.
  - Ô có thêm **sticker tâm trạng** (mục 2) ở góc, chấm nhỏ nếu có nhật ký / luyện viết.
  - **Dải mùa / lễ** ngang phía trên (màu theo giao diện mùa, `season_core.themes_view` có sẵn ngày bắt đầu / kết thúc, kể cả âm lịch Tết / Trung thu); ngày lễ có biểu tượng nhỏ. Hiện cả mùa chưa mở khoá (chỉ là lịch).
  - Hôm nay viền vàng.
- **Xem năm**: 12 tháng nhỏ kiểu heatmap (giống add-on Review Heatmap), dải màu mùa dưới mỗi tháng.
- **Bấm một ngày** → khung chi tiết: số lượt ôn, thẻ mới, từ lên "Ra quả" hôm đó (nếu tính được từ revlog), số báo đã đọc / câu chép đúng, giao diện mùa hôm đó, sticker, nhật ký, luyện viết (sửa / viết được ngay).
- **Dữ liệu ôn**: đếm thẳng từ `revlog` theo ngày của Anki (như `daily_stats`, `mobile` 1.11) → thấy cả ngày trước khi cài add-on, cả lượt ôn trên điện thoại. Không lưu thêm gì cho phần này. Một truy vấn gộp theo ngày cho cả năm (`select (id/1000 - cutoff) / 86400 …, count() from revlog where type < 4 group by …`), làm ở `garden_core` hoặc module mới `journal_core.py`.

## 2. Nhật ký một dòng + sticker tâm trạng (phần riêng tư)

- **Nhật ký**: viết tự do, **ngôn ngữ nào cũng được** (thường là tiếng Việt), ngắn (gợi ý một dòng, tối đa khoảng 300 ký tự). **Không bao giờ gửi cho Gemini**, không chấm, không có xu.
- **Sticker tâm trạng**: chọn một (có thể cho tối đa 2) trong khoảng 12 hình pixel vẽ ở `web/icons.js` (vui, bình thường, mệt, buồn, bận, ốm, hào hứng, thư thái, căng thẳng, đi chơi, thi cử, ngày lễ). Không dùng emoji.
- Viết / chọn ở: khung chi tiết ngày của Lịch hoa; và một ô nhỏ "Hôm nay thế nào?" trong thẻ Hôm nay (bấm mới mở, không tự bật lên).
- Sửa được ngày cũ.

## 3. Luyện viết (để riêng với nhật ký)

- Viết **bằng ngôn ngữ đang học** (tiếng Nhật / tiếng Anh, theo các báo đã tick ở 1.19.1), 1–3 câu.
- **Gợi ý đề** (bấm mới hiện, không bắt buộc): dùng 1–2 từ phải ôn hôm nay (`words_core.pick` có sẵn), hoặc trả lời một câu hỏi về số báo hôm nay.
- **Sửa câu**: có khoá Gemini thì bấm "Nhờ Gemini sửa" (1 lượt gọi, chạy nền như báo). Hiện câu đã sửa + giải thích ngắn bằng tiếng Việt, gạch chân từ đã học (dùng lại máy nối tra từ của báo). Không có khoá thì chỉ lưu.
- Tuỳ chọn sau: báo sáng hôm sau có mục nhỏ "Góc sửa câu" lấy câu hôm qua (hỏi người dùng trước).
- Có xu không? **Chưa chốt** (Claude nghiêng về không có xu, để không thành "cày"; hỏi người dùng).

## 4. Cuốn nhật ký (cuối tháng / cuối năm)

- Hết tháng → tự đóng thành **một cuốn** (hết năm → một cuốn dày gộp 12 tháng).
- **Trong cuốn**: bìa (ảnh vườn chụp tự động trong tháng — mục 5.3 — + tên giao diện mùa của tháng), trang tổng kết (số ngày ôn, tổng lượt, từ thuộc mới, ngày ôn nhiều nhất, sticker hay dùng nhất, số báo đã đọc), rồi mỗi ngày một dòng: ngày · hoa · sticker · nhật ký · luyện viết (câu gốc → câu đã sửa).
- **Đọc lại trong add-on**: sách xếp trên **Kệ sách** trong nhà (món `shelf` đã có ở `garden_core.CATALOG`: đặt kệ sách thì bấm vào là mở kệ nhật ký; chưa có kệ thì mở từ Lịch hoa). Giao diện lật trang pixel.
- **Xuất file** để giữ / in: HTML một file (ảnh nhúng sẵn) và / hoặc PDF (`QWebEnginePage.printToPdf` của Qt trong Anki), lưu bằng `getSaveFile` như Báo lỗi.

## 5. Sáng tạo

### 5.1 Tự vẽ giống cây
- Trong Xưởng: vẽ hình cây cho **từng giai đoạn** (Hạt → Mầm → Cây non → Ra hoa → Ra quả; có thể chỉ bắt vẽ 3 hình, các giai đoạn còn lại tự suy ra), cỡ như cây hiện có.
- Thành **giống cây riêng**, gieo được cho deck / loại note / tag như giống mua (`more_core` seeds, luật gieo 1.14). Giá: như món chế tác (vd. 500 xu) + sửa 50 xu.
- Lưu điểm ảnh như món tự làm (`kotoba_batake_px`, mã nén có sẵn `px_encode` / `px_decode`).

### 5.2 Mã chia sẻ thiết kế
- Món tự làm / vùng tự vẽ / giống cây tự vẽ → **xuất một đoạn chữ** (vd. `KB1:<loại>:<cỡ>:<tên>:<điểm ảnh nén>:<kiểm tra>`), có nút Chép.
- **Dán mã** → xem trước → "Làm món này" **trả xu như tự chế tác** (giữ chỗ tiêu xu). Kiểm tra kỹ (dữ liệu không tin cậy): độ dài, bảng màu, cỡ, tên làm sạch, mã kiểm tra.
- Dùng để người dùng phát **gói đồ theo mùa** cho cộng đồng mà không cần ra bản add-on mới.

### 5.3 Chụp ảnh vườn
- Nút chụp trong vườn / Nhà: xuất PNG cảnh đang xem (sân, phòng, vùng), có khung + ngày + tên giao diện mùa; chọn cỡ (1×, 2×, hình nền 1920×1080).
- **Chụp tự động mỗi tuần một tấm** (nhỏ, lưu ở `user_files/`, không đồng bộ) → làm bìa cuốn nhật ký và "vườn lớn lên" trong tổng kết năm.

## 6. Khách ghé vườn (kiểu Neko Atsume)

- Thỉnh thoảng có **khách** ghé (tanuki, cáo, chim sẻ, mèo hoang, bướm, đom đóm ban đêm, hươu ở Đền…), **tuỳ đồ đã đặt** (vd. ghế đá → mèo nằm, chuông gió → chim, ao → cò, lồng đèn → đom đóm) và mùa / giờ / thời tiết. Vườn có nhiều cây "Ra quả" thì khách tới thường hơn (thành quả học hiện ra bằng sự sống, không bằng con số).
- **Album khách**: ảnh pixel từng khách + lần đầu gặp; khách hiếm theo mùa. Không mất gì khi vắng, không phải cho ăn.
- Có thể tặng quà nhỏ khi gặp lần đầu (một món trang trí), tránh thành cày xu.

## 7. Câu cần hỏi người dùng khi làm (mỗi lần một câu)

1. ~~Nhật ký / luyện viết có đồng bộ AnkiWeb không?~~ **Đã chốt 04/11: đồng bộ** — lưu trong collection, khoá theo năm `kotoba_batake_journal_<năm>` (cho nhỏ; bản cũ không đụng khoá lạ), ghi rõ ở giao diện "đồng bộ qua AnkiWeb". Sao lưu `user_files/journal_<năm>.json` như các khoá khác.
2. Luyện viết có xu không?
3. Cuốn nhật ký: chỉ đọc trong add-on, hay thêm xuất PDF / HTML?
4. Giao diện mùa: giữ mua một lần + đồ dùng một mùa (mục 0)?

## 8. Thứ tự làm và tiến độ

Đề nghị chia bản:
- **1.20**: Lịch hoa → Nhật ký + sticker → Luyện viết → Cuốn nhật ký (cần chụp ảnh tự động cho bìa: làm phần chụp của 5.3 cùng lúc).
- **1.21**: Khách ghé vườn + album.
- **1.22**: Tự vẽ giống cây → Mã chia sẻ thiết kế → nút chụp ảnh vườn (phần còn lại của 5.3).

Mỗi phần: test offline (dữ liệu, làm sạch, bản cũ lưu đè không mất khoá mới — như `test_1191.py`) + kịch bản Anki thật + `audit.js` (thêm màn mới) + ảnh trước / sau.

- [x] Hỏi câu 7.1 (đồng bộ nhật ký) — đồng bộ
- [x] Bản mẫu giao diện Lịch hoa / Nhật ký / Cuốn nhật ký (`KE_HOACH_1_20_mau.html`)
- [ ] Lịch hoa
- [ ] Nhật ký + sticker
- [ ] Luyện viết
- [ ] Cuốn nhật ký (+ chụp ảnh tự động)
- [ ] Khách ghé vườn
- [ ] Tự vẽ giống cây
- [ ] Mã chia sẻ thiết kế
- [ ] Chụp ảnh vườn
