# Kế hoạch: Vườn 3D bằng khối (voxel) — "hướng 2"

Ghi 15/11/2026. Người dùng hỏi có làm được game 3D kiểu Play Together không; Claude đưa 3 hướng, người dùng chọn **hướng 2**:
"ghi lại ý tưởng hướng 2 đi, cách làm. tớ chỉ cần trang trí nhà, sinh hoạt, nuôi động vật, đi qua lại giữa các vùng là được".

**Trạng thái: mới là ý tưởng + cách làm, chưa viết mã.** Chưa đặt số bản. Bước đầu tiên là một **bản thử nhỏ** để người dùng mở trên
máy thật (mục 8, bước 0). Các chỗ ghi "Claude đề xuất" là chưa chốt — hỏi người dùng (mục 9), mỗi lần một câu.

## 1. Phạm vi

**Làm** (người dùng chốt 15/11):
1. **Trang trí nhà** — trong nhà 3 gian và sân: xem, đặt, dời, cất đồ trong cảnh 3D; tường / sàn từng gian.
2. **Sinh hoạt** — StackChan làm 67 việc như bản 2D (giờ, đồ đã đặt, thời tiết, vùng), đi tới đúng món đồ, mặc đúng bộ đồ.
3. **Nuôi động vật** — 6 thú đi lại, ngủ, tìm chỗ ưa thích, bấm vào thấy thẻ nhỏ.
4. **Đi qua lại giữa các vùng** — sân, 6 vùng, vùng tự tạo nằm trên một bản đồ làng nhỏ, đi bộ sang được.

**Không làm** (ít nhất ở đợt này): chơi chung online (cần máy chủ — hướng 3), ôn thẻ trong 3D (bảng ôn 2D vẫn phủ lên như bây giờ),
trò chơi, báo, Lịch hoa (giữ 2D), khách ghé vườn (để sau — hỏi người dùng), điện thoại (AnkiDroid / AnkiMobile không chạy add-on).

## 2. Ý chính

- **Một chế độ xem mới, cùng dữ liệu**: nút **3D / 2D** ở hàng ngay dưới dải cảnh (quyết định 1.30.2: không nút nào đè lên cảnh).
  Mọi thứ mua / đặt / mặc / nuôi ở 3D là **cùng một ví, cùng lệnh cầu nối** như 2D — chuyển qua lại không mất gì, máy chỉ có 2D
  (không có WebGL, bản cũ) vẫn thấy đúng đồ đã đặt.
- **Python không đổi luật** (quy tắc vàng: Python là nguồn sự thật cho xu, quyền sở hữu, chỗ đặt). `check_spot`, `place` / `move` /
  `take`, `life_core.can_do`, thú nuôi, vùng… dùng nguyên. 3D chỉ là cách vẽ + cách bấm mới.
- **Hình 3D tự dựng từ tranh pixel có sẵn**: mỗi điểm ảnh của tranh (16 px mỗi ô) thành một khối vuông nhỏ, đẩy dày ra phía sau
  (như bánh quy cắt khuôn). Nên **đồ tự vẽ ở Xưởng, giống cây tự vẽ, đồ tự vẽ cho StackChan, mẫu tường / sàn tự vẽ, công trình vùng
  tự tạo đều tự có bản 3D** — không phải vẽ lại 160 món.

## 3. Đã kiểm chứng (15/11)

- Anki 26.9.4 trong máy test **không màn hình** (offscreen, không card đồ hoạ): trang vườn **không có WebGL**, kể cả khi bật vẽ bằng
  phần mềm (`--enable-unsafe-swiftshader`). → Chưa chứng minh được 3D chạy trong Anki: **phải thử trên máy thật** (bản thử, mục 8).
- Chromium của Playwright trong cùng máy: **có WebGL2** (SwiftShader, vẽ bằng CPU). → Trang 3D **test tự động được ngoài Anki** (mục 7).
- Máy có card đồ hoạ: trình duyệt của Anki (QtWebEngine = Chromium) thường có WebGL. Người đặt Anki vẽ bằng phần mềm (Tuỳ chọn →
  Video driver: Software) có thể không có → nút 3D ẩn, dùng 2D như cũ.

## 4. Thế giới 3D lấy từ dữ liệu có sẵn

Lưới đặt đồ của bản 2D đã có chiều sâu, chuyển thẳng sang mặt sàn 3D:

| Cảnh | Lưới hiện có (`garden_core`) | Trong 3D |
|---|---|---|
| Sân | 16 cột × 3 hàng (`YARD_COLS`, `YARD_ROWS`), cột 0–3 là nhà (`HOUSE_COLS`) | Mặt đất 16 × 3 ô trước nhà, mỗi ô 16 × 16 khối |
| Phòng chính | 10 × 4 (`ROOM_COLS`, `ROOM_ROWS`), hàng 0 là tường, cửa sổ cột 4–5 | Hàng 0 = bức tường sau (đồ treo tường), hàng 1–3 = sàn |
| Bếp, Phòng ngủ | 9 × 4 (`SIDE_COLS`, `SIDE_ROWS`) | Hai gian hai bên, nối cửa với phòng chính |
| 6 vùng | `ZONES` (beach, shrine, festival, bamboo, onsen, station), lưới như sân | Khu đất quanh làng, nối bằng đường đất |
| Vùng tự tạo | công trình 64 × 76 px + cảnh nền 256 × 76 px (`more_core` `LANDMARK_W/H`, `ENV_W/H`) | Công trình thành khối; cảnh nền thành tấm phông phía xa |

- **Đồ đạc**: `CATALOG` 160 món — `w` (số ô rộng), `place` = `ground` / `floor` (đứng trên đất / sàn), `wall` (treo tường, hàng 0),
  `rug` (thảm, nằm dưới đồ khác — `_layer`). Tranh ở `web/home.js` (`SPR`), `nha_art.js`, `finds_art.js`, `season_art.js`,
  `rare_art.js`; món tự làm ở `kotoba_batake_px`.
- **Nhà**: 8 bước xây (`HOUSE_LEVELS`) + 4 kiểu nhà (`HOUSE_STYLES`: classic, minka, teahouse, castle) → mỗi kiểu một bộ khối mái /
  tường / cửa. Trong nhà nhìn kiểu **nhà búp bê**: cắt bỏ tường phía trước (và mái khi vào trong) để thấy cả 3 gian.
- **Tường / sàn từng gian** (`decor_core`, 12 + 9 mẫu + mẫu tự vẽ 16 × 16): dán lặp lên mặt tường / sàn như giấy dán (ảnh lặp, không
  cần khối).
- **Giờ, thời tiết, giao diện mùa**: lấy từ `GardenSky` (màu trời, hướng nắng, đêm có đèn) và `GardenSeason` (đồ theo mùa đã đặt).

## 5. Cách làm từng phần

### 5.1 Tệp mới (phía JS) — Python gần như không đổi

| Tệp | Việc |
|---|---|
| `web/vendor/three.module.min.js` | Thư viện vẽ 3D **Three.js** (giấy phép MIT), ghim đúng một bản, nằm trong gói (không tải từ mạng). Claude đề xuất dùng Three.js vì có sẵn camera, ánh sáng, bóng đổ, chọn vật bằng tia; nặng thêm ~0,7 MB cho gói (hiện 0,86 MB). Phương án nhẹ hơn: tự viết bộ vẽ WebGL cho khối (~1.000 dòng) — quyết ở bản thử |
| `web/vox.js` | Biến tranh pixel thành khối (mục 5.2), nhớ đệm theo id + mã điểm ảnh |
| `web/world3d.js` (`GardenWorld`) | Cảnh, camera, vòng vẽ, bấm chọn ô / đồ, chế độ đặt đồ, chuyển vùng |
| `web/actors3d.js` | StackChan + 6 thú dạng khối: tư thế, đi theo đường, bong bóng chữ |
| `garden.css`, `body.html` | Khung vẽ 3D, nút 3D / 2D, gợi ý điều khiển |
| `__init__.py` | Thêm tệp vào danh sách nạp; `setWebExports` cho `.js` đã có (thêm `.mjs` nếu dùng). Không thêm luật mới |

Khi nào cần lưu thêm dữ liệu riêng của 3D (vd. **hướng xoay đồ**), dùng **khoá collection riêng** (`kotoba_batake_3d`, có `_clean`,
giữ khoá lạ) — đúng mục 12.4: không nhét vào ví, bản cũ / bản 2D không đụng tới. Cài đặt góc nhìn, chất lượng là riêng máy → config
`prefs` như các cài đặt ⚙ khác.

### 5.2 Từ tranh pixel ra khối

- Mỗi điểm ảnh có màu → một khối 1 × 1 × 1; đẩy dày theo loại đồ: treo tường 1–2 khối, thảm 1 khối, đồ đứng (ghế, tủ, cây, đèn)
  dày bằng khoảng nửa bề rộng, đặt giữa ô. Màu lấy đúng bảng 32 màu của Xưởng (`CRAFT_PALETTE`).
- **Viền mực** (`k` sát ô trống) là nét vẽ của tranh 2D: bỏ khi dựng khối (khối đã có ánh sáng + bóng); viền bên trong tranh (mắt,
  khe tủ) giữ lại.
- Gộp mặt khuất, gộp các mặt cùng màu liền nhau thành một mặt lớn → ít đa giác, máy yếu vẫn chạy.
- Món nhìn nghiêng bị "mỏng" quá (vd. cây cao một nét) có thể chỉnh tay: tệp `web/vox_sua.js` ghi độ dày / cách đẩy riêng từng
  món (như `mau_sua.json` của admin sửa hình gốc).
- StackChan: thân hộp + đầu màn hình dựng từ hình 20 cột của linh vật góc trái; **đồ đang mặc** (đồ có sẵn + đồ tự vẽ, `wearOn`)
  dựng khối cùng cách, gắn lên đầu / mặt / cổ / vỏ.

### 5.3 Trang trí nhà

- Bảng Nhà & Cửa hàng 2D giữ nguyên (mua, Kho đồ, Xưởng). Bấm **Đặt** → quay lại cảnh 3D ở chế độ đặt: rê chuột trên sàn hiện bóng
  món, ô xanh / đỏ theo luật sẵn có (`spotError` của `home.js` — cùng luật với `check_spot`), bấm để đặt → lệnh `home:place:…` như
  2D. Bấm món đã đặt → thẻ nhỏ **Dời / Cất / Xoay** (Xoay là mới, chỉ 3D).
- Tường / sàn: tab Nội thất → Tường & sàn như 2D; 3D đổi ngay khi chọn.
- Camera — **người dùng chốt 15/11: xoay tự do** ("muốn xoay tự do"): kéo chuột để xoay quanh, lăn chuột để phóng to / thu nhỏ, kéo chuột phải (hoặc Shift + kéo) để dời. Giới hạn: không xoay xuống dưới mặt đất (góc cúi tối đa ~80°, thấp nhất ~15°), không phóng quá gần / quá xa; nút **Về góc mặc định** (góc chéo từ trên xuống). Vì xoay được mọi phía nên **tường nào quay về phía camera thì tự ẩn / mờ** (và mái khi nhìn vào trong nhà) — nhà búp bê theo góc nhìn, không cố định một bức tường trước.

### 5.4 Sinh hoạt

- Danh mục 67 việc dùng nguyên `life_core` (giờ `hours`, món cần `need`, thời tiết, vùng `where`); chọn việc như `life.js` hiện nay.
- 15 tư thế (thống kê từ `ACTS`): với đồ (12), ngồi (12), cầm (10), nấu (7), đứng (6), đọc (5), ngủ / ăn (3), quét / vẫy (2), vươn
  vai / bơi / cầu nguyện / đi / tắm (1). Mỗi tư thế là vài khung khối (như hình 2D có 2 khung).
- Chỗ làm việc theo `at` (side 29, spot 15, front 8, on 4, roam 4, window 2, shore 2…): `on` = ngồi lên ghế / nằm lên giường, `side`
  = đứng cạnh món đồ, `window` = đứng ở cửa sổ… StackChan **đi tới đó** theo đường trên lưới ô (tìm đường tránh đồ, kiểu A* trên lưới
  16 × 3 / 10 × 4 — rất nhỏ, chạy tức thì).
- Câu tiếng Nhật của việc hiện bong bóng trên đầu như 2D; Sổ sinh hoạt ghi qua lệnh `life:seen` như cũ (Python xét lại `can_do`).

### 5.5 Nuôi động vật

- 6 thú (`more_core.PETS`: gà, vịt, thỏ, rùa, mèo, Shiba) — khối dựng từ hình trong `pets.js`; đi dạo, ngồi, ngủ ban đêm ở chỗ êm,
  trời mưa chạy vào gần nhà, ghé món ưa thích (`favSpot` của `pets.js` dùng lại cách chọn).
- Bấm thú → nhảy lên + tim + thẻ nhỏ (như 1.31: tên, tình trạng, nút Thú nuôi ▸ / Cho ăn ▸). Cho ăn, đặt tên, chuyển vùng vẫn qua bảng
  Thú nuôi (lệnh có sẵn).

### 5.6 Đi qua lại giữa các vùng

- Bản đồ làng: sân + nhà ở giữa, 6 vùng xếp quanh theo thứ tự mở khoá, vùng tự tạo ở rìa; nối bằng đường đất. Vùng chưa mở: có rào +
  bảng "Mở ở tab Vùng mới".
- Người dùng **điều khiển StackChan**: Claude đề xuất **bấm lên đất để đi tới** (tự tìm đường) + phím mũi tên / WASD. Đi tới cuối
  đường là sang vùng bên cạnh, camera trượt theo. Để yên khoảng 20 giây thì StackChan tự sinh hoạt tiếp như bản 2D.
- Mỗi vùng chỉ dựng khi tới gần (vùng xa vẽ đơn giản hoặc ẩn) → máy yếu vẫn nhẹ.

### 5.7 Nhẹ máy, dịu mắt

- Vẽ tối đa 30 khung / giây; **dừng vẽ** khi cửa sổ ẩn, đang ôn thẻ, hoặc bảng khác che kín.
- ⚙ **Chất lượng 3D: Thấp / Vừa** — Thấp: bóng tròn dưới chân thay bóng đổ thật, không hạt mưa / tuyết.
- Kiểu **Dịu mắt** / cảnh **Đứng yên** đã có → không hiệu ứng nhấp nháy, thú đi chậm.
- Không có WebGL hoặc vẽ quá chậm (đo vài giây đầu) → tự về 2D, nút 3D ghi lý do khi rê chuột.

## 6. Dữ liệu và đồng bộ

- Không thêm khoá nào cho tới khi có Xoay đồ; khi thêm thì là khoá riêng `kotoba_batake_3d` (đồng bộ AnkiWeb, lưu qua
  `backup_core.commit_config` như mọi khoá khác — 1.31.1).
- Máy còn 2D / bản cũ: thấy đúng đồ, đúng chỗ (chỉ không có hướng xoay). Máy đổi chỗ đồ ở 2D thì 3D cũng đổi theo (cùng lưới ô).

## 7. Kiểm thử

1. **Node, không cần trình duyệt**: dựng khối từ **mọi** tranh có sẵn (160 món, 6 thú, StackChan, 17 đồ mặc, 4 kiểu nhà × 8 bước) và
   từ tranh tự vẽ ngẫu nhiên — không lỗi, số mặt dưới mức trần, màu đúng bảng 32 màu.
2. **Trang 3D trong Chromium (Playwright + SwiftShader, đã thử: có WebGL2)**: kịch bản Anki thật xuất dữ liệu vườn (`Garden._data()`
   của vài vườn mẫu: nhà đủ bước, đủ vùng, nhiều đồ, thú, đồ tự vẽ) ra JSON; trang thử nạp đúng các tệp `web/` của add-on + JSON đó, `pycmd`
   giả ghi lại lệnh gửi đi → chụp ảnh từng cảnh, đặt / dời / cất đồ bằng chuột thật (kiểm lệnh `home:place:…` gửi đúng), StackChan đi
   giữa vùng, sinh hoạt theo giờ cố định, thú bấm được, cửa sổ nhỏ 720 × 520.
3. **Anki thật không màn hình** (không có WebGL): nút 3D ẩn, 2D chạy y như cũ — cả bộ kịch bản cũ phải còn đạt.
4. **Máy thật của người dùng**: mượt không (đếm khung / giây hiện ở ⚙), đẹp không, card đồ hoạ nào.

## 8. Các bước (mỗi bước người dùng xem rồi mới làm bước sau)

| Bước | Nội dung | Người dùng xem gì |
|---|---|---|
| **0. Bản thử** | Sân + nhà nhìn ngoài + đồ đã đặt ở sân (dựng khối tự động) + StackChan bấm-để-đi + xoay camera. **Chỉ đọc**, không ghi gì | Mở trên máy thật: có chạy không, mượt không, có thích kiểu khối không |
| 1. Trong nhà | 3 gian kiểu nhà búp bê, tường / sàn, đặt / dời / cất / xoay đồ | Ảnh + thử đặt đồ |
| 2. Sinh hoạt + thú | 67 việc, 15 tư thế, đồ mặc; 6 thú | Ảnh từng giờ trong ngày |
| 3. Các vùng | Bản đồ làng, đi qua lại, vùng tự tạo | Đi một vòng làng |
| 4. Hoàn thiện | Ngày đêm, thời tiết, giao diện mùa, chụp ảnh 3D, ⚙ chất lượng, tự về 2D khi chậm | Danh sách kiểm tra máy thật |

## 9. Cần người dùng chọn (hỏi lần lượt, mỗi lần một câu)

1. ~~Góc nhìn~~ — **đã chốt 15/11: xoay tự do** (mục 5.3).
2. Điều khiển: **bấm-để-đi + phím** (Claude đề xuất) hay chỉ một kiểu?
3. Độ mịn: **1 điểm ảnh = 1 khối** (giống tranh nhất, Claude đề xuất) hay khối to hơn (thô hơn, nhẹ máy hơn)?
4. 3D là **chế độ phụ** bên cạnh 2D (Claude đề xuất) hay thay hẳn màn chính?
5. Có cần **khách ghé vườn** trong 3D không (chưa trong phạm vi)?

## 10. Rủi ro

- WebGL tắt trong Anki ở một số máy (vẽ bằng phần mềm, card đồ hoạ cũ) → chỉ có 2D. Chưa thử được trên máy thật nào.
- Tranh pixel vẽ nhìn thẳng; đẩy dày ra khối có món trông "mỏng" hoặc lạ khi xoay → cần chỉnh tay một số món (`vox_sua.js`).
- Máy yếu + cửa sổ to: nặng hơn 2D rõ; phải giữ đường lùi về 2D.
- Khối lượng lớn (cỡ bản 1.30 trở lên), nhiều phần (nhà 4 kiểu × 8 bước, 6 vùng, 15 tư thế) → chia bước như mục 8.
- Liên quan quyết định 04/11 "học là chính, không thêm mini-game / áp lực": 3D chỉ là cách ngắm và bày vườn, không thêm nhiệm vụ /
  xu mới.
