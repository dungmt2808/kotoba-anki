# Báo cáo 1.35.4 — chuyển cảnh Tưới ↔ vườn, ô "Lấy từ" của báo, cây deck, bảng nổi (19/11/2026)

Người dùng: "giúp tớ sửa phần chuyển cảnh được không, ví dụ chuyển cảnh từ tưới sang vườn á (Esc) hay ngược lại thì nó bị
giựt á. ngoài ra còn một số phần dropdown á. ví dụ dropdown "Mọi deck", "Chọn deck" và "Không chọn deck" trong báo, thì tớ
thấy lúc tớ chọn phần "Chọn deck" đi, thì nó sẽ hiện ra dropdown các deck. nhưng khi tớ chuyển qua "không chọn deck" thì cái
dropdown đó vẫn giữ (và phần dropdown đó hình như chưa có gộp deck giống bên anki, giống phần chọn deck ở góc trên bên trái
á). sau đó kiểm tra lại thật kỹ, test thêm các kịch bản mà ngoài bộ test, testcase. vì tớ nghĩ thứ 7 tớ sẽ release bản tiếp
theo."

**Không thêm khoá collection, không thêm mục config.json** (test so với 1.35.3); khoá deck của báo `kotoba_batake_paper_src`
ghi y như cũ (bản 1.31.3 đọc được). Trạng thái đóng / mở nhánh deck lưu ở prefs `kb-deck-fold` có từ 1.34 (dùng chung với ô
deck ở thanh trên). **Cách sửa + cách bày Claude chọn, người dùng chưa xem trên máy.**

## 1. "Tưới ↔ vườn bị giựt" — tìm ra 5 nguyên nhân

Cách tìm: quay **từng khung hình** (Chrome DevTools screencast + `requestAnimationFrame`) trong Anki 26.9.4 thật lúc bấm Tưới
ngay / Esc, ở 4 cỡ cửa sổ, vườn 8 cây và 300 cây, có / không Phóng to, Ẩn vườn.

| # | Nguyên nhân (mã 1.35.3) | Người dùng thấy | Sửa ở 1.35.4 |
|---|---|---|---|
| 1 | Chế độ giao diện (Màn chính / Khi ôn thẻ / Trò chơi & báo) chỉ đổi theo **vòng 200 ms** (`ui.js setInterval(apply, 200)`) | Bảng ôn hiện / ẩn trước, tới 0,2 giây sau bố cục mới đổi lần nữa. **Phóng to** hoặc **Tập trung khi ôn**: Esc / Dừng → **trang trống một nhịp** (thanh trên, sân, ruộng còn mang lớp ẩn của chế độ ôn) rồi vườn mới hiện; mở bảng ôn khi đang Phóng to → thấy thanh trên + vườn chớp qua rồi mới thành thẻ to | Bảng nào hiện / ẩn là đổi chế độ **ngay trong cùng khung hình** (`MutationObserver` chạy trước khi trình duyệt vẽ). Vòng 200 ms vẫn giữ cho các thay đổi khác |
| 2 | Mở bảng ôn → trang cao hơn cửa sổ → **thanh cuộn dọc hiện ra**, cả trang hẹp lại 14 px; Esc → thanh cuộn mất, nở ra lại | Cảnh sân + ruộng co lại / nở ra và vẽ lại; ở cửa sổ rộng (1920) ruộng còn **xếp lại số cột 0,1 giây sau** (1872 → 1800 px) — giựt hai nhịp. Ảnh `03_esc_mep_phai_1353.png`: khung 171 ms sau Esc cảnh sân còn hẹp, có dải tối ở mép phải | Khung vườn luôn rộng bằng cả cửa sổ (`#kb-app { width: 100vw }`, `html { overflow-x: hidden }`): thanh cuộn (khi có) chỉ nằm đè lên lề phải 16 px vốn trống. Phóng to giữ bề ngang tự nhiên (lề chỉ 8 px). **Không dùng** `scrollbar-gutter: stable` vì để lại một dải 14 px không có nền mùa ở mép phải màn chính |
| 3 | **Ruộng đang ẩn** lúc ôn (Ẩn vườn / Tập trung khi ôn): mỗi lượt chấm thẻ vẽ lại ruộng với bề ngang 0 → **4 cột** | Esc về: ruộng 4 cột (216 px) một nhịp rồi mới xếp lại đủ cột | Ruộng ẩn thì vẽ theo bề ngang đo lần trước (`fieldWidth`); đổi chế độ mà ruộng không đổi cỡ thì **không vẽ lại** (`fieldSame` — vườn 300 cây mất ~26 ms / lần vẽ, đúng giữa hiệu ứng) |
| 4 | Bảng ôn **không có hiệu ứng** — mở Nhà / Trò chơi / Báo / Lịch hoa thì có (bật nhẹ từ 1.26) | Cắt cứng: cả màn đổi trong một khung hình | Bảng ôn **bật nhẹ** như các bảng khác; đóng bảng mà không mở bảng khác (Esc, Dừng, Đóng…) thì **vườn trồi lên nhẹ** (0,28 s, mờ → rõ + nhích 14 px). ⚙ Dịu mắt / Tắt hạt bay: chỉ mờ dần, không nhún (cả các bảng khác — đúng như chú thích của `greet.js` từ 1.26 mà trước đây chưa làm); ⚙ Chuyển cảnh: Tắt và máy bật "giảm chuyển động": không hiệu ứng. Chuyển thẳng ôn → Trò chơi: bảng Trò chơi bật nhẹ, vườn đứng yên |
| 5 | Đang **cuộn xuống ruộng** (vườn nhiều cây) mà mở bảng: trình duyệt "neo cuộn" giữ ruộng đứng yên | Bấm R / Tưới ngay / T / N / B / L → bảng mở ra **nằm hẳn ngoài màn hình phía trên** (đầu bảng ở −800 px), chỉ thấy vườn nhảy | Bảng vừa mở mà đầu bảng ở trên mép cửa sổ → về đầu trang (mọi bảng lớn) |

Ảnh `02_phong_to_dung_truoc_sau.png`: hàng trên mã 1.35.3 (khung 39 ms trống trơn), hàng dưới 1.35.4.

## 2. Ô "Lấy từ" của báo + danh sách deck

| | 1.35.3 | 1.35.4 |
|---|---|---|
| Lỗi người dùng gặp | Ô lấy lựa chọn theo **chế độ đã lưu**: đang "Không dùng deck" mà chọn "Chọn deck…" → danh sách mở nhưng ô vẫn ghi "Không dùng deck"; chọn lại "Không dùng deck" là chọn đúng giá trị đang ghi → trình duyệt không báo đổi → **danh sách không đóng được** (ảnh `01_lay_tu_truoc_sau.png`, hàng trên) | Danh sách đang mở thì ô luôn ghi "Chọn deck…"; chọn Mọi deck / Không dùng deck là danh sách **đóng liền tay** (vẽ lại ngay, không đợi Python) |
| Danh sách deck | Phẳng, xếp theo chữ: "A", "A::Có câu…", "JA", "JA B", "JA::N4" ("JA B" chen giữa deck cha và deck con) | **Cây như ô deck ở thanh trên**: deck con thụt vào dưới deck cha, chỉ ghi tên của chính deck, ▸ / ▾ thu gọn — lúc đầu theo Anki, bấm thì nhớ chung với ô deck ở thanh trên; nhánh có deck đã chọn tự mở; ← / → thu / mở nhánh như Anki |
| Deck cha / con | Tick cả "N5" lẫn "N5::Bài 1" (thừa — deck cha đã lấy cả deck con), tốn chỗ trong 5 deck | Tick deck cha → deck con hiện **"đã gồm"** (đánh dấu, khoá); deck con đã tick riêng được bỏ (đỡ tốn chỗ). Chân danh sách: "tick deck cha là lấy cả deck con" |
| Tìm deck | Vẽ lại cả tab mỗi phím | Lọc tại chỗ (bộ gõ tiếng Việt / Nhật đang ghép chữ không bị cắt), danh sách phẳng có đường dẫn "JA › N5 › Bài 1", **khớp nguyên cụm lên trước** như ô deck ở thanh trên |
| Tên deck đã chọn | "JA::N5" | "JA › N5" |
| Bàn phím | Tick bằng Space → vẽ lại, focus về đầu trang | Focus ở lại đúng ô vừa tick / ô thả xuống vừa đổi |

Ảnh `01_lay_tu_truoc_sau.png`: hàng dưới — tick N5, Bài 1 / Bài 2 "đã gồm".

## 3. "Một số phần dropdown" khác — rà hết các ô thả xuống / bảng nổi

- **Ô thả xuống** (`<select>`) ở Trò chơi (Ôn, Kiểu chơi, Tốc độ quạ), Nhà (Chỗ ở của thú, Giống cây), Cấu hình trường,
  ⚙ → Giao diện, Nguồn báo (Trình độ, Giọng đọc → ô giọng, Truyện, "Dùng" → dòng Gemini): đổi xong đều vẽ lại phần phụ thuộc
  ngay, không còn chỗ nào kẹt như ô "Lấy từ" (thử từng ô trong Anki thật).
- **Bảng nổi** (⚙, ô chọn deck ở thanh trên, Nhiệm vụ, Tin làng, Chụp ảnh): **lỗi cùng loại "vẫn giữ"** — mở bảng này rồi bấm
  nút bảng kia thì **hai bảng chồng lên nhau** (18 / 20 cặp; các nút này chặn sự kiện click nên bảng kia không tự đóng); mở bảng
  lớn bằng phím tắt (T / N / R…) thì bảng nổi nằm đè lên bảng đó. 1.35.4: **mỗi lúc một bảng nổi**, mở bảng lớn thì bảng nổi
  tự đóng (`garden.js watchPops`). Esc khi ⚙ đang mở vẫn chỉ đóng ⚙ (từ 1.30.3).

## 4. Thấy thêm khi chạy kịch bản ngoài bộ test (đã sửa)

- **Bấm vội R / Esc**: đóng bảng ôn giữa lúc đang bật nhẹ → trình duyệt huỷ hoạt ảnh (không có `animationend`) → lớp hiệu ứng
  kẹt lại; nếu sau đó tắt Chuyển cảnh thì lần mở sau bảng vẫn nhún một lần. Sửa: bảng ẩn là gỡ lớp, nghe cả `animationcancel`.
- **R rồi Esc ngay** (đổi ý trước khi thẻ kịp hiện): Esc lúc đó ở màn chính → **đóng luôn cả cửa sổ vườn**. Sửa: Esc trong 3 giây
  sau R / Tưới ngay mà thẻ chưa hiện = huỷ mở bảng ôn (thẻ Python gửi tới muộn bị bỏ qua, gửi `rv:stop`).
- **Esc hai lần nhanh** (có từ 1.13; thấy khi bấm vội ở Anki 23.10.1 lúc máy bận): Anki gửi "close" cho mỗi lần Esc, add-on hỏi
  lại trang "Esc này trang đã dùng chưa" qua **một cờ** đọc-rồi-xoá; hai Esc liền nhau (vd. đang Phóng to: Esc thu nhỏ rồi Esc
  đóng bảng ôn) mà Python hỏi sau cả hai thì lần hỏi thứ hai đọc phải cờ đã xoá → **đóng cả cửa sổ vườn**. Máy bận thì mỗi lần
  hỏi trễ tới 2,7 giây (đo được). Sửa: hàng đợi `window.__kbEscQ` — mỗi Esc trang đã dùng một mục (giữ 10 giây), mỗi lần hỏi
  lấy một mục; hết mục thì theo cờ như cũ (Esc ở màn chính vẫn đóng cửa sổ như thiết kế).
- **Khung vườn rộng bằng cửa sổ** làm `scrollWidth` lớn hơn phần nhìn thấy 14 px (lề nằm dưới thanh cuộn) — không cuộn ngang
  được, nhưng kịch bản cũ `e2e_1322` đo "không tràn ngang" bằng số này. Thêm `body { overflow-x: clip }`: trang không còn
  "rộng hơn phần nhìn thấy", cảnh vẫn giữ bề ngang.
- **Mở nhiều nhánh deck** (có từ 1.34, cả ô deck ở thanh trên): bộ nhớ đóng / mở chỉ lưu được ~26 lần bấm (prefs ≤ 400 ký tự)
  và **xoá luôn trong bộ nhớ đang dùng** → mở tới nhánh thứ ~27 thì nhánh mở đầu tiên tự thu lại. Sửa: trong lúc vườn đang mở
  thì nhớ hết; chỉ phần **lưu** giữ những lần bấm sau cùng.

## 5. Kiểm thử

Mọi số dưới đây chạy trên **gói đã đóng** (`kotoba_batake.ankiaddon` → giải nén), Anki 26.9.4.

- **Mới** `tests/core/test_1354.py` (offline, 35): cây deck của báo chạy đúng hàm của `garden.js` bằng node — thứ tự theo cấp,
  thiếu deck cha giữa chừng, **2.000 danh sách deck ngẫu nhiên** (dấu, CJK, "x y", "X-Y") cha / cấp đúng, nhánh con liền khối
  ngay sau deck cha; nhớ đóng / mở (300 lần bấm: lưu ≤ 400 ký tự, trong phiên vẫn nhớ lần đầu); khớp nguyên cụm; `lang_decks`
  gửi kèm `col` (collection Anki thật); soát mã; hợp đồng dữ liệu (khoá collection + config.json = 1.35.3, `save_src` y hệt).
- **Mới** `tests/anki/e2e_1354.js` (75, Anki thật): A. ghi **từng khung hình** lúc mở / đóng bảng ôn ở 1920 × 1080, 1366 × 768,
  1024 × 640 với vườn 300 cây — chế độ đổi cùng khung hình, không khung trống, cảnh + ruộng giữ bề ngang; Phóng to → Dừng /
  Esc; Ẩn vườn + chấm 3 thẻ → Esc; hiệu ứng (bật nhẹ / trồi lên / Dịu mắt / giảm chuyển động / Tắt / ôn → Trò chơi); cuộn
  xuống rồi R / Tưới ngay / T / N / B / L. B. bảng nổi từng cặp + mở bảng lớn. C. ô "Lấy từ" (13 lần đổi + đúng ca người dùng),
  cây deck (thứ tự, ▸ / ▾, nhớ chung với thanh trên, tick cha / con, tối đa 5, tìm, bàn phím, Xong / Đổi, báo tiếng Anh).
  **Mã 1.35.3: đỏ 22 rồi dừng ở phần cây** (không có cây).
- **Mới** `tests/anki/e2e_1354b.js` (Anki thật) — **kịch bản ngoài bộ test**: R rồi Esc ngay (6 lần); Phóng to → Esc Esc thật
  nhanh (4 lần); bấm vội R / Esc 40 lần + Esc khi bảng đang bật
  nhẹ dở; đổi cỡ cửa sổ lúc đang ôn; đổi deck lúc đang ôn; cỡ cảnh Lớn + Giáng sinh; cửa sổ 800 × 600 (bảng + nút nằm trọn,
  thanh cuộn không đè); Anki chế độ tối; báo đang viết (khoá) rồi viết xong; xoá / đổi tên deck lúc danh sách đang mở; tên deck
  có "…" `<b>` & khoảng trắng đôi, 60 ký tự; 204 deck lồng 3 cấp (mở danh sách 14 ms, mỗi phím tìm < 30 ms, mở hết / thu hết);
  đổi "Lấy từ" 12 lần liên tục không chờ; Esc ở ⚙. Tìm ra các lỗi ở mục 4 (lần đầu đỏ 4 / 31; trên Anki 23.10.1 cửa sổ vườn
  đóng khi bấm vội) → sửa.
- `core/test_1354.py` mục C2: giả lập hàng đợi Esc bằng chính mã của `garden.js` + câu hỏi của `_on_esc` — hai Esc đã dùng, Python
  hỏi trễ 2,7 giây → cả hai "đã dùng"; Esc đã dùng rồi Esc ở màn chính → lần sau đóng cửa sổ; mục cũ quá 10 giây không giữ cửa sổ.
- Kịch bản cũ đổi theo cây deck: `e2e_119` (tìm deck theo tên đầy đủ; phần "tối đa 5" đổi thành "tick hết deck cha → deck con
  khoá" vì bộ deck tiếng Anh chỉ có 4 nhánh — tối đa 5 ở `e2e_1354`), `e2e_1223` (mở nhánh N4 trước khi cuộn, Esc về đúng số
  dòng của cây), `core/test_1261.py` (luật "giảm chuyển động" gộp thêm lớp mới).
- `run_all.sh` (`ANKI_PY` = aqt 26.9.4; thêm `core/test_1354.py` 39/39) trên gói cuối đã giải nén: **TỔNG: TẤT CẢ OK**.
- Toàn bộ kịch bản Anki thật, Anki 26.9.4, 3 luồng song song, mỗi kịch bản một hồ sơ mới (55 kịch bản, gói trước phần sửa Esc):
  **2.352 / 2.357**. 5 ca trượt, đều đã xử lý: `e2e_1322` 2 ca "không tràn ngang" (khung vườn rộng bằng cửa sổ làm `scrollWidth`
  tính cả lề dưới thanh cuộn → thêm `body { overflow-x: clip }`; gói cuối **40/40**), `e2e_1354b` 1 ca "Esc Esc thật nhanh" (gói
  đó chưa có hàng đợi Esc — chính là bằng chứng lỗi có cả ở 26.9.4: 2/4 lần đóng nhầm cửa sổ; gói cuối **35/35**), `e2e_1332` 1 ca
  đợi chữ "đang viết báo" 4 giây lúc máy chạy 4 Anki (gói cuối chạy riêng **36/36**), `e2e_1253` 1 ca điều kiện của môi trường test
  ("localStorage trống sau khi tắt hẳn Anki" — để tái hiện máy người dùng; trượt y hệt trên mã 1.35.3, đã ghi là hay trượt khi
  chạy song song).
- Gói cuối (sau phần sửa Esc), Anki 26.9.4: `e2e_1354` 75/75, `e2e_1354b` 35/35, `e2e_1322` 40/40, `e2e_1332` 36/36, `e2e_134`
  87/87, `e2e_1303` 49/49, `e2e_1253` 38/39 (ca môi trường như trên). **Anki 23.10.1** (bản thấp nhất hỗ trợ): `e2e_1354` 75/75,
  `e2e_1354b` 35/35.
- Cập nhật đè bản đã phát hành 1.31.3 → 1.35.4 bằng trình quản lý add-on của Anki (`run_capnhat.sh`, gói 1.31.3 dựng lại từ
  `tests/fixtures/ban_cu/e64eb22.tar.gz`): **19/19** — không mất khoá collection (12), file `user_files/` (48), xu, đồ, nhật ký,
  sổ sinh hoạt, cài đặt ⚙; mở vườn bằng bản mới đúng số xu, Ctrl+Z trên dữ liệu cũ đúng.
- Bộ audit giao diện (`audit_20261114/run_ui_audit.sh`, hồ sơ tạm): `e2e_128_fix` 26/26, `ui_audit` 191/191, `deep_ui_audit` 18/18,
  `lifecycle_audit` 7/7.

## 6. Việc của người dùng trước khi phát hành thứ 7

Trên máy thật (vài phút):
1. Mở vườn → Tưới ngay → Esc vài lần (cả khi đang **Phóng to** F và khi bấm **Ẩn vườn**): vườn hiện ngay, không chớp trống,
   không nhảy ngang. Thấy hiệu ứng bật nhẹ / trồi lên là có hiệu ứng mới — **muốn bỏ thì ⚙ → Giao diện → Chuyển cảnh: Tắt**.
2. Báo → Nguồn báo → Lấy từ: Chọn deck… → Không dùng deck → Chọn deck… → Mọi deck: danh sách đóng / mở đúng ô.
3. Mở danh sách deck: cây có giống ô deck ở góc trên trái không; tick một deck cha xem deck con "đã gồm".
4. Mở ⚙ rồi bấm ô deck (hoặc Nhiệm vụ): chỉ còn một bảng.
