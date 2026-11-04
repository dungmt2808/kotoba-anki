# Kế hoạch 1.20 – 1.22: Lịch hoa, nhật ký, luyện viết, cuốn nhật ký · khách ghé vườn · tự vẽ giống cây, mã chia sẻ, chụp ảnh vườn

> **Trạng thái: CHƯA LÀM — thiết kế và mọi câu hỏi đã chốt với người dùng (04/11/2026), phiên sau làm luôn từ 1.20.** Viết sau khi xong 1.19.1, từ buổi người dùng và Claude cùng nghĩ ý rồi xem bản mẫu.
> **Bản thiết kế**: thư mục [`thiet_ke_1_20/`](thiet_ke_1_20/) — xem nhanh ảnh trong `thiet_ke_1_20/anh/`; mở `lich_hoa.html?v=month|year|book` và `hoa.html` bằng trình duyệt (đã kèm `garden.css`, `seeds.js` của gói và phần hình của cây gốc nên mở được ngay). Mã trong đó là mã **mẫu** (số liệu giả) để lấy hình, bố cục, màu, chữ — khi làm thì viết lại đúng kiến trúc add-on (Python giữ dữ liệu, JS chỉ vẽ).
> Làm xong thì **xoá file này, thư mục `thiet_ke_1_20/`**, dòng trỏ tới chúng ở `README.md` mục 0 và hai dòng `!/KE_HOACH_1_20.md`, `!/thiet_ke_1_20/` trong `.gitignore`. Làm dở thì cập nhật mục 10 "Tiến độ" rồi mới commit.
> Cách làm việc, môi trường, test: `README.md` mục 8, `tests/README.md` (giải nén gói → sửa → test offline + Anki thật → đóng gói). Quy tắc chữ / nút: `README.md` mục 0 (bảng thuật ngữ 1.19.1, nút đang chọn chỉ đổi nền).

---

## 0. Người dùng nói gì (giữ đúng tinh thần)

- "Anki thì để học là chính nên **trò chơi và luyện thẻ là đủ rồi**, còn lại là **tập trung vào giao diện và thành quả của việc học**." Tự vẽ đồ / vùng là để khi đã đủ xu, việc ôn **vẫn còn tạo ra giá trị**.
  → Không thêm mini-game, không thêm áp lực (không thanh năng lượng, không mất đồ / cây chết khi vắng, không bảng xếp hạng, không chuỗi bắt buộc). Không đụng lịch FSRS.
- Đã chọn: **Khách ghé vườn**; **Lịch hoa** ("giống heatmap add-on hay mood tracker trong app journal: lịch nho nhỏ, đánh dấu ngày nào ôn, mở bằng cách ấn vào chuỗi, có lịch mùa nào, lễ nào"); **nhật ký một dòng + sticker tâm trạng**; **luyện viết** ("nhật ký thì viết nhật ký hoặc luyện viết, **nên để riêng**"); **cuốn nhật ký** ("cuối tháng / cuối năm xuất thành một cuốn để đọc lại"); **tự vẽ giống cây**, **mã chia sẻ thiết kế**, **chụp ảnh vườn**.
- Nhật ký: **đồng bộ** qua AnkiWeb (người dùng chốt).
- Xem bản mẫu: "ổn, nhưng **hoa chưa đẹp**" → hoa vẽ lại theo đúng kiểu cây của ruộng (mục 2). Luyện viết: "nên **giới hạn khoảng 20–30 từ** một ngày, **gọi Gemini một lần**" → mục 4. Cách Gemini sửa: Claude đề xuất 3 phần (câu đã sửa · lỗi · nhận xét), người dùng bảo đánh giá lại lần cuối rồi viết kế hoạch → coi như chốt.
- Người dùng định **chia sẻ add-on** và mỗi mùa vẽ thêm đồ → dùng mã chia sẻ thiết kế để phát đồ mùa (mục 8.2). Trước khi đăng: không kèm dữ liệu giáo trình GUNGUN; kiểm tra giấy phép / tên **StackChan** (dự án robot có thật của người khác) hoặc đổi linh vật; ghi bản Anki hỗ trợ trong manifest.
- Giao diện mùa: **giữ mua một lần** (người dùng chốt 04/11: "giữ 1 lần"; thuê = mất thứ đã có, như đánh thuế việc học). Muốn có chỗ tiêu xu theo mùa thì dùng đồ dùng một mùa / một món mới mỗi năm hoặc gói đồ qua mã chia sẻ — không đổi cách mở khoá.
- Luyện viết: **không có xu** (người dùng chốt 04/11).

---

## 1. Lịch hoa (1.20) — `thiet_ke_1_20/anh/1_lich_thang.png`, `2_lich_nam.png`, `4_lich_thang_1024.png`

- **Mở**: bấm "· N ngày liền" / chuỗi ở thẻ Hôm nay (`web/garden.js` khoảng dòng 540; con trỏ tay + chú thích "Mở Lịch hoa"), phím tắt `L` (kiểm tra chưa trùng), nút ở ⚙. Bảng `kb-panel kb-game` như bảng Báo: tiêu đề **花暦 · Lịch hoa**, tab **Tháng · Năm · Cuốn nhật ký**, chip "Chuỗi N ngày", "Tháng này N ngày ôn", nút Thoát Esc.
- **Tháng** (bên trái):
  - Điều hướng ◂ Tháng 11 · 2026 ▸ (lùi tới tháng có lượt ôn đầu tiên, tiến tới 12 tháng sau để xem lịch mùa).
  - **Dải tên mùa / lễ** của tháng (màu + tên + ngày, ghi "ưu tiên hơn …" khi trùng) và dòng "Sắp tới: お正月 1/1 · Tết 16/1 – 20/2/2027 (theo âm lịch)". Ngày lấy từ `season_core` (đã tính âm lịch Tết / Trung thu) — hiện cả giao diện chưa mở khoá.
  - Lưới 7 cột (T2 → CN). Mỗi ô: số ngày, **cây** (mục 2) đứng trên đất, sticker tâm trạng góc trên phải, chấm xanh góc dưới phải nếu có nhật ký / luyện viết, **vạch màu** dưới đáy = giao diện mùa của ngày đó. Ngày tương lai: nền nhạt, viền nét đứt, vẫn có vạch màu. **Hôm nay**: số trong ô đen. **Ngày đang chọn**: nền vàng + bóng. Ngày không ôn: chỉ có đất, không đánh dấu xấu.
  - Chú giải: 5 mức cây + "nở rộ = đạt mục tiêu ngày (N lượt)" + "■ có nhật ký".
- **Khung ngày** (bên phải; dưới 1100px thì xếp xuống dưới lịch, giãn hết chiều ngang):
  1. Ngày + chip giao diện mùa; Ôn: N lượt · N thẻ mới; Lên Ra quả: N từ (vài từ đầu); Báo: đọc số N · chép đúng a / b câu.
  2. **Nhật ký** (mục 3). 3. **Luyện viết** (mục 4).
- **Năm**: điều hướng năm; chip tổng kết (ngày ôn, lượt ôn, từ ra quả mới, số ngày có nhật ký, tâm trạng hay gặp nhất); 12 tháng nhỏ (6 cột; dưới 1100px 4 cột) kiểu heatmap ô vuông xanh 5 mức (người dùng đồng ý giữ ô vuông ở màn năm), dải màu giao diện mùa dưới tên tháng, tháng hiện tại nền vàng; chú giải mức + màu các giao diện.
- **Số liệu** (không lưu thêm): đếm thẳng `revlog` theo ngày của Anki (`type < 4`, như `daily_stats` / bù xu điện thoại 1.11) → có cả ngày trước khi cài add-on và lượt ôn trên điện thoại. Một truy vấn gộp theo ngày cho cả năm. "Thẻ mới" = `type = 0` trong revlog. "Lên Ra quả" **gần đúng**: lượt ôn có `ivl ≥ 90` mà `lastIvl < 90` (revlog không lưu độ bền FSRS từng lượt) — ghi rõ là gần đúng trong mã. Báo đã đọc / câu chép: từ `PaperState` (`read`, `dict`).
- **Mức cây** theo **mục tiêu ngày** (`daily_goal`, mặc định 30): 0 lượt → đất; < 1/3 mục tiêu → mầm; < 2/3 → cây non; < mục tiêu → ra nụ; **≥ mục tiêu → nở rộ**. (Không thưởng "gấp đôi" để khỏi thành áp lực.)

## 2. Hoa theo mùa — `thiet_ke_1_20/anh/5_hoa_theo_mua.png`, `hoa.html`

- Dùng **đúng kiểu cây của ruộng**: hình 16×16 viền đen, bảng màu `PAL` của `seeds.js`; ô lịch vẽ đất như ô ruộng (`flower_art.js` trong bản mẫu). Mức 1–4 = giai đoạn 1–4 của loài (mầm → nở rộ / ra quả).
- **Mỗi giao diện mùa một loài** (không có giao diện mùa → cây gốc của vườn, `garden.js` `SPRITES`):

  | Giao diện mùa | Loài | Hình |
  |---|---|---|
  | Tết | **mai vàng** | mới |
  | Xuân, Hoa anh đào | anh đào | `seeds.js` `sakura` |
  | Mùa mưa | **cẩm tú cầu** | mới |
  | Thất Tịch | tre | `take` |
  | Hạ, Lễ hội mùa hè | hướng dương | `himawari` |
  | Mùa thu | **cúc** | mới |
  | Trung thu | lúa | `ine` |
  | Halloween | bí ngô | `kabocha` |
  | Mùa lá đỏ | lá phong | `momiji` |
  | Giáng sinh | **trạng nguyên** | mới |
  | Đông, お正月 | thông | `bonsai` |

- 4 loài mới (`thiet_ke_1_20/flowers.js`, dựng bằng script + tự kẻ viền) **còn đơn giản hơn loài cũ**: khi làm thì vẽ kỹ lại (cao bằng loài cũ, nhiều lá hơn ở giai đoạn 2–3, mai vàng nhiều hoa hơn), giữ bảng màu. Đặt vào `seeds.js` (thêm loài) để sau này dùng được cả làm giống cây ngoài ruộng.
- Màn năm dùng ô vuông xanh (không dùng cây), đã thống nhất.

## 3. Nhật ký một dòng + sticker tâm trạng (1.20)

- Khung "**Nhật ký** · không gửi cho Gemini": hàng **8 sticker** (Vui, Hào hứng, Thư thái, Bình thường, Mệt, Buồn, Bận, Ốm — hình mặt pixel 9×9 trong bản mẫu, vẽ ở `web/icons.js`, **không dùng emoji**), chọn một (bấm lại để bỏ); ô viết **2 dòng, tối đa 200 ký tự**, viết bằng ngôn ngữ nào cũng được; dưới ô: "Đồng bộ qua AnkiWeb" · "58 / 200 ký tự".
- **Không bao giờ gửi cho Gemini**, không chấm, không có xu. Sửa được ngày cũ (cả ngày trước khi cài, vì lịch có số liệu từ revlog).
- Lưu tự động khi rời ô (gõ xong không cần bấm Lưu).
- Ô nhỏ "Hôm nay thế nào?" trong thẻ Hôm nay (bấm mới mở Lịch hoa tại hôm nay, không tự bật lên).

## 4. Luyện viết (1.20) — để riêng với nhật ký

- **Ngôn ngữ**: báo đã tick ở 1.19.1 (tiếng Nhật / tiếng Anh). Tick cả hai thì có nút chọn **Tiếng Nhật / Tiếng Anh** ở góc khung (nhớ lựa chọn lần trước).
- **Giới hạn**: tiếng Nhật **60 ký tự** (không có dấu cách nên đếm ký tự; ≈ 20–30 từ), tiếng Anh **30 từ**. Bộ đếm "43 / 60 ký tự"; gõ quá thì không nhận thêm.
- **Gợi ý** (dòng "Thử dùng"): 2 từ phải ôn hôm nay của ngôn ngữ đó (`words_core.pick` 1.19.1, ngẫu nhiên theo ngày), nút "Đổi gợi ý". Dưới ô: "Đã dùng 2 / 2 từ gợi ý ✓" — máy đếm (tiếng Nhật: chữ hoặc gốc của từ có trong bài; tiếng Anh: dạng biến đổi qua `ai_en.LinkIndex`).
- **Gemini sửa 1 lần mỗi ngày** (một lượt gọi cho cả hai ngôn ngữ): nút "Nhờ Gemini sửa" → chạy nền như báo → xong thì nút thành "Đã sửa hôm nay" + "Gemini sửa 1 lần mỗi ngày · mai viết bài mới". Gọi lỗi (mạng, hết hạn mức, khoá sai) **không tính** lượt. Không có khoá: vẫn viết / lưu được, chỗ nút ghi "Dán khoá Gemini ở tab Nguồn báo để được sửa".
- Sau khi sửa: **khoá bài** của hôm đó (giữ bài gốc + bản sửa cho cuốn nhật ký). Luyện viết chỉ cho **hôm nay** (ngày cũ chỉ xem).
- **Kết quả 3 phần** (như ảnh `1_lich_thang.png`):
  1. **Câu đã sửa** — Gemini sửa **ít nhất có thể**, giữ ý và cách nói của người học (không viết lại thành bài khác). **Máy** tô xanh chỗ khác với bài gốc (so chuỗi: tiếng Nhật theo ký tự, tiếng Anh theo từ) và gạch chân từ đã học (dùng lại máy nối tra từ của báo) — không để Gemini tự đánh dấu.
  2. **Lỗi (tối đa 3)** — mỗi lỗi: "chỗ sai → sửa", loại (ngữ pháp / từ / trợ từ / chính tả / dạng chia), một câu giải thích tiếng Việt. Lỗi cùng quy tắc thì nói gộp ("Cùng quy tắc như lỗi trên").
  3. **Nhận xét** — 1–2 câu tiếng Việt: khen chỗ làm đúng (vd. dùng đúng từ gợi ý), nhắc một điều nên nhớ.
  - Bài không có lỗi: ghi "Không có lỗi" + một **cách nói tự nhiên hơn** (tuỳ chọn, ghi rõ là "tự nhiên hơn", không phải "sai").
- **Gemini** (`ai_core`, `responseSchema` JSON như báo): `{"sua": str, "loi": [{"goc": str, "sua": str, "loai": str, "giai_thich": str}] (≤ 3), "tu_nhien": str, "nhan_xet": str}`. Máy kiểm tra: `sua` đúng ngôn ngữ (dùng `check_jp` / `ai_en.check_en` mức nhẹ), không dài quá 2 lần bài gốc, `goc` có trong bài gốc, phần tiếng Việt có dấu; sai thì bỏ phần đó (không gọi lại — giữ 1 lượt / ngày). Lời nhắc dặn trình độ (N4 / A2… như báo) và "chỉ sửa lỗi thật, giữ cách nói của người học".
- **Lỗi lưu lại** (loại + quy tắc ngắn) → trang "Lỗi hay gặp tháng này" trong cuốn nhật ký.
- **Không có xu** (người dùng chốt 04/11), cả nhật ký lẫn luyện viết.

## 5. Cuốn nhật ký (1.20) — `thiet_ke_1_20/anh/3_cuon_nhat_ky.png`

- Hết tháng → tự đóng thành **một cuốn**; hết năm → thêm một cuốn dày gộp 12 tháng. Tháng đang chạy cũng xem được ("bản nháp").
- Tab **Cuốn nhật ký**: bên trái **Kệ sách** (gáy sách màu theo giao diện mùa của tháng, cuốn năm to hơn, cuốn đang mở viền vàng); bên phải sách mở hai trang, nút ◂ Trang trước · Trang sau ▸ · **Xuất PDF**.
- **Trang đầu**: "Tháng 10 · 2026", giao diện mùa + ngày chụp ảnh, **ảnh vườn** (mục 8.3), tổng kết (ngày ôn a / b, lượt ôn, từ ra quả mới, ngày ôn nhiều nhất, số ngày có nhật ký, số bài luyện viết), tâm trạng của tháng (sticker × số lần), **Lỗi hay gặp** (vd. "tính từ đuôi い (〜かった) ×4 · trợ từ に / で ×2").
- **Các trang sau**: mỗi ngày một dòng — ngày + thứ, cây, sticker, nhật ký, câu luyện viết đã sửa (màu xanh, ✎). **Chỉ ghi ngày có ôn hoặc có viết** (bỏ ngày trống cho cuốn gọn).
- **Kệ sách trong nhà**: món `shelf` đã có trong `garden_core.CATALOG` — đặt kệ trong phòng thì bấm vào là mở tab này; chưa có kệ thì mở từ Lịch hoa.
- **Xuất PDF**: dựng HTML của cuốn rồi `printToPdf` (QtWebEngine trong Anki), lưu bằng `getSaveFile` như Báo lỗi; khổ A5 dọc, mỗi tháng một file.

## 6. Lưu trữ

- **Nhật ký + luyện viết**: khoá collection **theo tháng** `kotoba_batake_journal_<yyyy>_<mm>` = `{ "<ngày yyyy-mm-dd>": {"m": sticker, "t": nhật ký, "w": {"lang", "goc", "sua", "loi", "tu_nhien", "nhan_xet", "goi_y"}, "u": thời điểm sửa} }`. Lý do theo tháng: AnkiWeb đồng bộ cả khoá một lần (ghi đè theo khoá) → khoá nhỏ thì hai máy viết khác tháng không đè nhau, mỗi lần lưu ít dữ liệu. Làm sạch khi đọc (`_clean_journal`: độ dài, kiểu, sticker hợp lệ), giữ khoá lạ của bản sau, bản ≤ 1.19.1 không đụng. Sao lưu `user_files/journal/<yyyy_mm>.json`.
- **Rủi ro đã biết**: viết cùng tháng trên hai máy mà chưa đồng bộ → máy đồng bộ sau thắng. Giảm rủi ro: lưu ngay khi rời ô; khi mở Lịch hoa sau đồng bộ thì đọc lại. Ghi vào README mục 9 (hạn chế đã biết).
- **Ảnh vườn tự chụp** (bìa cuốn nhật ký): chỉ trên máy này `user_files/anh_vuon/<yyyy-mm-dd>.png` (không đồng bộ, ~30 KB / tấm, giữ 1 tấm / tuần). Máy khác không có ảnh thì bìa vẽ bằng ảnh xem trước của giao diện mùa (`home.js` `themePreview`).
- Số liệu ôn: không lưu (đọc revlog).

## 7. Khách ghé vườn (1.21)

- Thỉnh thoảng có **khách** ghé (tanuki, cáo, chim sẻ, mèo hoang, bướm, đom đóm ban đêm, cò ở ao, hươu ở Đền…), **tuỳ đồ đã đặt** (ghế đá → mèo nằm, chuông gió → chim, ao → cò, lồng đèn → đom đóm) và mùa / giờ / thời tiết. Vườn nhiều cây "Ra quả" thì khách tới thường hơn (thành quả học hiện ra bằng sự sống, không bằng con số).
- **Album khách**: ảnh pixel từng khách + ngày gặp lần đầu; khách hiếm theo mùa. Không mất gì khi vắng, không phải cho ăn. Có thể tặng một món trang trí khi gặp lần đầu (tránh thành cày xu).

## 8. Sáng tạo (1.22)

### 8.1 Tự vẽ giống cây
- Trong Xưởng: vẽ hình cây cho **từng giai đoạn** (Hạt → Mầm → Cây non → Ra hoa → Ra quả; tối thiểu 3 hình, giai đoạn còn lại tự suy ra), 16×16 như `seeds.js`, viền đen tự kẻ như bản mẫu `flowers.js`.
- Thành **giống cây riêng**, gieo cho deck / loại note / tag như giống mua (luật gieo 1.14). Giá như món chế tác (vd. 500 xu), sửa 50 xu. Điểm ảnh lưu như món tự làm (`kotoba_batake_px`, `px_encode` / `px_decode`).

### 8.2 Mã chia sẻ thiết kế
- Món tự làm / vùng tự vẽ / giống cây tự vẽ → **xuất một đoạn chữ** (vd. `KB1:<loại>:<cỡ>:<tên>:<điểm ảnh nén>:<mã kiểm tra>`), nút Chép.
- **Dán mã** → xem trước → "Làm món này" **trả xu như tự chế tác** (giữ chỗ tiêu xu). Kiểm tra kỹ (dữ liệu không tin cậy): độ dài, bảng màu, cỡ, tên làm sạch, mã kiểm tra.
- Dùng để người dùng phát **gói đồ theo mùa** cho cộng đồng mà không ra bản add-on mới.

### 8.3 Chụp ảnh vườn
- Nút chụp ở vườn / Nhà: PNG cảnh đang xem, có khung + ngày + tên giao diện mùa; cỡ 1×, 2×, hình nền 1920×1080; lưu bằng `getSaveFile`.
- **Tự chụp mỗi tuần một tấm** (mục 6) — làm cùng 1.20 vì bìa cuốn nhật ký cần.

## 9. Đánh giá lần cuối (04/11) — đã sửa trong bản thiết kế / còn phải nhớ khi làm

Đã sửa trong bản mẫu:
- "Hôm nay" và "ngày đang chọn" cùng màu vàng, đứng cạnh nhau khó phân biệt → hôm nay = số trong ô đen, đang chọn = nền vàng.
- Mức cây theo số lượt cố định (1–9 / 10–29…) không hợp người đặt mục tiêu khác → theo `daily_goal`, **nở rộ = đạt mục tiêu ngày**.
- Dòng hướng dẫn dài → "Bấm một ngày để xem và viết nhật ký." (quy tắc chữ 1.19.1).
- Nhật ký "một dòng" mà cho 300 ký tự, ô một hàng bị cắt → 200 ký tự, ô 2 dòng; bỏ dòng "Hôm nay: Vui" (trùng sticker); ghi "Đồng bộ qua AnkiWeb".
- Luyện viết khi tick cả hai báo không biết viết tiếng nào → nút chọn Tiếng Nhật / Tiếng Anh.
- Cuốn nhật ký có dòng ngày trống ("04 CN —") → chỉ ghi ngày có ôn hoặc có viết; thêm "Lỗi hay gặp"; thứ tự ngày đúng.
- Cửa sổ 1024px: khung ngày dưới lịch, giãn hết chiều ngang (`4_lich_thang_1024.png`, không tràn ngang).

Phải nhớ khi làm:
- "Lên Ra quả" theo ngày chỉ **gần đúng** (revlog không lưu độ bền FSRS) — ghi rõ.
- Đồng bộ theo khoá tháng: hai máy viết cùng tháng chưa đồng bộ thì máy sau thắng (mục 6).
- Luyện viết khoá sau khi sửa; gọi lỗi không tính lượt; không có khoá vẫn viết được.
- 4 loài hoa mới cần vẽ kỹ lại (mục 2).
- Kiểm tra phím tắt `L` chưa trùng; `audit.js` thêm 3 màn Lịch hoa + màn 1024px; chữ theo bảng thuật ngữ (không "add-on", Bật / Tắt…).
- Gemini: luyện viết dùng chung hạn mức với báo (1 lượt / ngày, ít); chọn model như báo (`ai_core.Gemini`).

## 10. Thứ tự làm và tiến độ

- **1.20**: Lịch hoa (tháng + năm, hoa theo mùa) → Nhật ký + sticker → Luyện viết → Cuốn nhật ký (+ ảnh vườn tự chụp, Xuất PDF).
- **1.21**: Khách ghé vườn + album.
- **1.22**: Tự vẽ giống cây → Mã chia sẻ thiết kế → nút chụp ảnh vườn.

Mỗi phần: test offline (dữ liệu, làm sạch, đếm revlog theo ngày, bản cũ lưu đè không mất khoá mới — như `test_1191.py`), Gemini giả lập cho luyện viết + một lần Gemini thật, kịch bản Anki thật (`e2e_120.js`), `audit.js`, ảnh trước / sau gửi người dùng.

- [x] Chốt ý (04/11), đồng bộ nhật ký, thiết kế Lịch hoa / Nhật ký / Luyện viết / Cuốn nhật ký / hoa theo mùa (`thiet_ke_1_20/`)
- [x] Luyện viết không có xu; giao diện mùa giữ mua một lần (người dùng chốt 04/11)
- [ ] Lịch hoa (tháng, năm, hoa theo mùa, vẽ kỹ 4 loài mới)
- [ ] Nhật ký + sticker
- [ ] Luyện viết
- [ ] Cuốn nhật ký (+ ảnh vườn tự chụp, Xuất PDF)
- [ ] Khách ghé vườn
- [ ] Tự vẽ giống cây
- [ ] Mã chia sẻ thiết kế
- [ ] Chụp ảnh vườn
