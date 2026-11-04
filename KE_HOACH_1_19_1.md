# Kế hoạch 1.19.1: báo không phụ thuộc deck đang xem + soát giao diện và chữ

> **Trạng thái: CHƯA LÀM.** Viết ngày 04/11/2026, ngay sau bản 1.19.0 (báo tiếng Anh). Người dùng dặn: phiên này chỉ kiểm tra và ghi lại, **phiên sau mới làm**.
> Làm xong thì **xoá file này**, dòng trỏ tới nó ở `README.md` mục 0, và dòng `!/KE_HOACH_1_19_1.md` trong `.gitignore`. Ghi tóm tắt vào mục 11 (lịch sử) của `README.md` và của README trong gói. Nếu làm dở thì cập nhật mục 6 "Tiến độ" rồi mới commit.

Có ba phần, làm theo thứ tự A → B → C. Mỗi phần một commit, chạy hết test trước khi sang phần sau.

---

## 0. Người dùng nói gì

1. Hỏi: "Phải chọn deck xong mới viết báo được hả?" Ba tình huống người dùng lo:
   - Có cả deck tiếng Anh và tiếng Nhật, chủ yếu muốn báo tiếng Nhật, nhưng lần cuối học deck tiếng Anh → báo bị viết thành tiếng Anh.
   - Đang học N4 nhưng lần cuối ôn deck N5 → báo có bị viết theo N5 không?
   - Lần cuối học deck môn khác (không phải ngoại ngữ) → có bị bỏ không viết báo không?
2. Đã đồng ý: thêm ô **"Báo muốn nhận: ☑ Tiếng Nhật ☐ Tiếng Anh"**.
3. Muốn: **chọn được deck lấy từ vựng, tối đa 5 deck, 100 note**. Không chọn thì mặc định **ngẫu nhiên**. Hỏi thêm: có cần người dùng tự quy định deck nào thuộc ngôn ngữ nào không (trả lời ở 2.3).
4. Giao diện chưa ổn. Ví dụ hai ảnh người dùng gửi: hàng nút "Đọc báo: Báo tiếng Nhật · 2 mới | Báo tiếng Anh" ở Kệ báo, và màn "Báo chưa hỗ trợ ngôn ngữ này". Nhận xét: **"tab chưa đều"**. Cần kiểm tra lại các mục khác.
5. Chữ trong app phải **đơn giản, dễ hiểu**. Bỏ thông báo và nội dung không cần thiết, không cần diễn giải. Ví dụ "Add-on không nhờ Gemini viết báo cho deck này…" là thừa, vì dòng "không hỗ trợ" đã đủ. Một ví dụ khác: ở giao diện mùa, nút ghi "Tắt giao diện" nhưng chỗ khác lại diễn giải là "Thôi …", tức không thống nhất. Người dùng nói còn vài chỗ nữa nhưng không nhớ hết, nên **phải tự soát cả app**.

---

## 1. Cách làm việc (cho phiên mới)

- Mã add-on chỉ có trong gói `kotoba_batake.ankiaddon`.
  - Giải nén: `tests/tools/unpack.sh` (ra `/tmp/kb_src/kotoba_batake`).
  - Đóng gói: `python3 tests/tools/pack.py <thư mục>`. Nhớ đổi `human_version` thành **1.19.1** trong `manifest.json`.
- Test: đọc `tests/README.md`.
  - Offline: `OLD118=<bản 1.18> ANKI_PY=… tests/run_all.sh <thư mục>`.
  - Anki thật: `ANKI_PY=~/.venv-anki/bin/python tests/anki/run_ui.sh <thư mục> <ảnh>` (8 kịch bản, khoảng 25 phút).
  - Soát giao diện: `KB_SCRIPTS=audit.js tests/anki/run_ui.sh …`.
- Môi trường Claude Code trên web (container mới mỗi phiên):
  - `python3 -m venv ~/.venv-anki && ~/.venv-anki/bin/pip install aqt==26.9.3`.
  - `apt-get update` **trước**, rồi `apt-get install -y libegl1 libgl1 libopengl0 libxkbcommon0 libxkbcommon-x11-0 libfontconfig1 libdbus-1-3 libxcb-cursor0 libxcb-icccm4 libxcb-keysyms1 libxcb-shape0 libxcb-xinerama0 libxcb-randr0 libxcb-render-util0 libxcb-image0 libxshmfence1 libxkbfile1 fonts-noto-cjk libnss3`.
  - Bản 1.18 để test tương thích: `git show adbd491:kotoba_batake.ankiaddon > /tmp/a118.ankiaddon` rồi giải nén.
- Gemini thật: proxy của phiên tự chèn khoá (header `x-goog-api-key`, khoá giả trong code). Dùng `KB_STREAM=1 python3 -u tests/gemini/run_job.py … [--lang en]`. Hạn mức miễn phí khoảng 20 lượt / ngày / model chữ. Ngày 04/11 các model 3.7 / 3.8 / flash-latest báo bận (502 / 503) rất nhiều.
- Quy tắc của dự án: `README.md` mục 0 (quy tắc vàng) và mục 12. Không emoji, giao diện tiếng Việt.

---

## 2. Phần A — Báo không phụ thuộc deck đang xem

### 2.1 Bản 1.19.0 đang chạy thế nào (đã kiểm trong code)

- Ngôn ngữ báo = ngôn ngữ có nhiều cây nhất trong **deck đang xem ở vườn**. Mở vườn thì deck đang xem là deck chọn lần cuối trong Anki (`GardenDialog.__init__`: `mw.col.decks.current()`). Code: `deck_lang` / `paper_lang` (`__init__.py` khoảng dòng 193–230), `ai_start(…, lang=None)` (khoảng dòng 700), nút chuyển ngôn ngữ đọc báo `_paper_pick` ở Kệ báo.
- Lúc mở Anki (vườn chưa mở) thì `_on_profile_open` (khoảng dòng 2097) vẫn gọi `ai_start("auto", None)`, và vì không có vườn nên lấy tiếng Nhật. Nhưng `_ai_scope` lấy từ vựng từ **deck đang chọn trong Anki** (`build_garden(current deck)`), chỉ khi có `pham_vi.json` của kotoba_daily mới theo giáo trình.
- **Trình độ không lấy theo deck**: `gemini_level` (N5–N1) và `gemini_level_en` (A1–C1) là ô người dùng chọn. **Từ vựng** thì lấy theo deck đang xem.
- `scope_from_plants` (`ai_core.py:675`, `ai_en.py:152`) dùng danh sách cây của vườn, nên **tối đa `max_plants` = 400 cây** của deck đang xem.
- Hệ quả với ba tình huống:
  1. Lần cuối học deck tiếng Anh → mở vườn thì tự viết báo tiếng Anh, chip và hòm thư báo số tiếng Anh. Lúc mở Anki vẫn viết báo tiếng Nhật, nhưng danh sách từ lấy từ deck tiếng Anh nên **gần như rỗng**.
  2. Học N4 mà ôn deck N5 → trình độ vẫn N4, nhưng chỉ dùng từ N5, và "từ trọng tâm" cũng là từ N5. Chỗ này đã có từ 1.12.
  3. Deck môn khác → tuỳ `fields_core.guess_lang`:
     - chữ Việt có dấu → "other" → không viết báo khi đang xem deck đó;
     - chữ Latin không dấu → đoán là "en" → có thể viết báo tiếng Anh từ các thuật ngữ đó;
     - toàn số / công thức → "ja".
     Ngoài ra, lúc mở Anki báo tiếng Nhật vẫn tự viết với danh sách từ rỗng.

### 2.2 Đã chốt với người dùng

- **Báo không còn phụ thuộc deck đang xem.** Người dùng tick ngôn ngữ muốn nhận: ☑ Tiếng Nhật (mặc định) ☐ Tiếng Anh. Mỗi sáng viết **một số cho mỗi ngôn ngữ đã tick**.
- **Chọn deck lấy từ vựng**: tối đa **5 deck** cho mỗi ngôn ngữ, mỗi số dùng **100 note**. Không chọn deck thì lấy **ngẫu nhiên** trong mọi deck cùng ngôn ngữ.
- **Tỉ lệ (người dùng chốt 04/11): khoảng 70% từ chưa thuộc, 30% từ đã thuộc** (100 từ → 70 + 30), trong mỗi nhóm chọn ngẫu nhiên.
- Trình độ vẫn là ô chọn riêng cho từng ngôn ngữ (N4 / A2…).

### 2.3 Trả lời "có cần quy định deck nào thuộc ngôn ngữ nào không"

**Không cần.** Ngôn ngữ đã gắn với **loại note** (khoá `lang` trong `kotoba_batake_fields`, tự đoán bằng `guess_lang`, sửa được ở Cấu hình trường). Vì vậy:
- Khi lấy từ, chỉ lấy note có loại note đúng ngôn ngữ, kể cả trong deck trộn hai thứ tiếng.
- Danh sách deck để chọn chỉ hiện các deck có note của ngôn ngữ đó (kèm số note).
- Đoán sai thì sửa một lần ở Cấu hình trường (đã có từ 1.17). Không thêm bảng gán deck → ngôn ngữ.

### 2.4 Thiết kế

- **Lưu trữ**
  - `config.json` (máy này, giống các ô Gemini khác): `gemini_langs: ["ja"]`. Mặc định `["ja"]`. Riêng máy đã dùng 1.19.0 và có số trong `user_files/bao_gemini_en/` thì thêm `"en"` một lần, để báo tiếng Anh không tự dưng biến mất.
  - Deck đã chọn: khoá collection **mới, cấp trên cùng** `kotoba_batake_paper_src = {"ja": {"decks": [did…]}, "en": {"decks": […]}}`. Lý do: id deck gắn với collection, cần đồng bộ AnkiWeb. Bản ≤ 1.19.0 không đụng khoá lạ. Làm sạch: bỏ id không còn tồn tại, tối đa 5.
- **Phạm vi (từ vựng gửi Gemini)**: hàm mới, ví dụ `scope_notes(col, lang, deck_ids, limit=100, seed=ngày)` trong `garden_core.py` hoặc module riêng. Đọc thẳng từ collection (không qua `build_garden`, không bị giới hạn 400 cây, không phụ thuộc deck đang xem).
  - Lấy note thuộc loại note đúng `lang`, trong các deck đã chọn (kể cả deck con); không chọn deck thì lấy mọi deck.
  - Chỉ lấy note "đã học" (có thẻ đã ôn ≥ 1 lần / có trạng thái FSRS). Chưa đủ 30 thì thêm note mới, giống `scope_from_plants` hiện nay.
  - Chọn 100 note theo tỉ lệ **70% chưa thuộc / 30% đã thuộc**, ngẫu nhiên có hạt giống theo ngày (cùng ngày thử lại thì ra cùng danh sách). Chọn 5 deck thì chia đều (mỗi deck 20, deck thiếu thì bù từ deck khác).
  - **Thuộc / chưa thuộc** tính theo giai đoạn cây (độ bền FSRS, `stage_days` = [3, 21, 90]):
    - **Chưa thuộc**: cây Mầm / Cây non (độ bền < 21 ngày), cộng mọi cây đang héo hoặc khát dù đã lớn (sắp quên), cộng từ chép sai 14 ngày gần đây.
    - **Đã thuộc**: cây Ra hoa / Ra quả (≥ 21 ngày) và không héo, không khát.
    - Hạt giống (thẻ chưa ôn lần nào) không tính là từ đã học; chỉ dùng khi tổng từ đã học < 30, như hiện nay.
  - Trong nhóm chưa thuộc, lấy trước cây héo / khát và từ chép sai (tối đa khoảng một nửa của 70), phần còn lại ngẫu nhiên. Đánh dấu nhóm này là "từ trọng tâm" trong lời nhắc (như `trong_tam.tu` hiện nay).
  - Một nhóm không đủ thì lấy bù từ nhóm kia (vd. mới học, gần như chưa có từ đã thuộc → 100 từ chưa thuộc).
  - Giữ thêm danh sách **mọi từ đã học** của ngôn ngữ đó (chỉ chữ + cách đọc + nghĩa, tối đa khoảng 3000) để:
    - kiểm tra (`check` tiếng Nhật: từ trong `{..|..|..}` phải đã học, `_deck_readings`, `hard_kanji`);
    - máy nối tra từ (tiếng Anh `LinkIndex`; tiếng Nhật `link_index`);
    - ghi vào `pham_vi.json` để bấm tra nghĩa.
    Lời nhắc chỉ gửi **100 từ**, nên prompt nhỏ hơn hẳn. Số tiếng Nhật ngày 04/11 gửi 30.000 token, bị chậm, và 2 model trả rỗng.
  - kotoba_daily (`pham_vi.json`) vẫn là một lựa chọn cho tiếng Nhật: "Lấy từ: Giáo trình (kotoba_daily)". Khi chọn giáo trình thì bỏ qua deck.
  - Bỏ `_ai_scope` / `_ai_scope_en` dựa trên `dialog._plants`. `tien_do.json` (từ sắp quên gửi kotoba_daily) cũng nên tính theo deck đã chọn thay cho deck đang xem.
- **Tự viết**: `ai_start` không nhận `dialog` để đoán ngôn ngữ nữa; nó chạy lần lượt các ngôn ngữ đã tick (vẫn một việc nền một lúc). `_ai_done` xong ngôn ngữ này thì bắt đầu ngôn ngữ kế tiếp. `_on_profile_open` và `refresh()` gọi cùng một hàm. Giữ giới hạn số lần thử mỗi ngày và "vừa thử < 10 phút" cho từng thư mục (đã có trong `trang_thai.json` riêng của mỗi thư mục).
- **Hòm thư / chip Báo / nhiệm vụ "đọc báo"**: cộng số chưa đọc của mọi ngôn ngữ đã tick. Mở bảng Báo thì vào ngôn ngữ có số chưa đọc (tiếng Nhật trước).
- **Kệ báo**: chỉ hiện nút chuyển Nhật / Anh khi tick cả hai. Bỏ "Theo deck đang xem", `_paper_pick`, `paper_lang(dialog)`, `deck_lang`. Ngôn ngữ đang đọc chỉ là trạng thái của bảng Báo (JS gửi `paper:index:<lang>` / `paper:issue:<lang>:<ngày>`, hoặc giữ `paper:lang:<x>`).
- **Bỏ hẳn màn "Báo chưa hỗ trợ ngôn ngữ này"** (`drawOther`, `paper.js` khoảng dòng 263). Deck đang xem không còn ảnh hưởng tới báo nên không cần.
- **Tab Nguồn báo**: thẻ Gemini có một hàng cho mỗi ngôn ngữ, ví dụ:
  ```
  ☑ Báo tiếng Nhật   Trình độ [N4 ▾]   Lấy từ [Ngẫu nhiên (tất cả deck) ▾ / Chọn deck… (tối đa 5)]   Hôm nay: ✓ Số 3 [Đọc]
  ☐ Báo tiếng Anh    Trình độ [A2 ▾]   Lấy từ [ … ]                                              Hôm nay: chưa có [Viết]
  ```
  - Ngôn ngữ chưa có deck nào thì không tick được, chỉ ghi "chưa có deck tiếng Anh".
  - Chọn deck: danh sách có ô tick (chỉ các deck có note của ngôn ngữ đó, kèm số note); tick tới 5 thì khoá các ô còn lại.
  - Nhật ký "Gemini đã viết và tự sửa những gì" cho từng ngôn ngữ (đã tách thư mục). Giọng đọc: một ô giọng chung là đủ (bỏ `gemini_voice_en` khỏi giao diện nhưng vẫn đọc config cũ).
- **Lượt Chép chính tả hằng ngày**: giữ nguyên.

### 2.5 Câu hỏi còn mở (hỏi người dùng đầu phiên, trước khi code)

1. ~~"Ngẫu nhiên" là ngẫu nhiên hoàn toàn, hay có ưu tiên?~~ **Đã chốt 04/11: 70% từ chưa thuộc, 30% từ đã thuộc** (xem 2.4). Còn nên xác nhận lại với người dùng: cách hiểu "thuộc" = cây Ra hoa / Ra quả (≥ 21 ngày) và không héo có đúng ý không.
2. **"100 note" là tổng mỗi số báo**, hay mỗi deck? Ghi ở trên đang hiểu là tổng.
3. Khi chọn deck mà deck đó chỉ có vài từ đã học (< 30) thì có bù thêm từ deck khác cùng ngôn ngữ không. Đề xuất: không bù, chỉ cảnh báo "deck này mới có N từ đã học".

### 2.6 Test

- `test_119.py` / test mới `test_1191.py`:
  - chọn 100 note theo deck / ngẫu nhiên (cùng ngày ra cùng danh sách, ngày khác ra khác);
  - deck trộn ngôn ngữ chỉ lấy đúng ngôn ngữ;
  - id deck đã xoá bị bỏ;
  - tối đa 5 deck;
  - tick ngôn ngữ, `ai_start` chạy lần lượt;
  - mã 1.19.0 thật lưu đè → khoá `kotoba_batake_paper_src` còn nguyên.
- `e2e_119.js` viết lại theo ô tick, không còn theo deck đang xem:
  - đang xem deck tiếng Anh mà chỉ tick tiếng Nhật → chỉ có báo tiếng Nhật;
  - tick cả hai → hòm thư cộng số chưa đọc của cả hai;
  - xem deck tiếng Hàn → báo vẫn bình thường.
- Gemini thật: một số tiếng Nhật với 100 từ (so thời gian / số token với 30.000 token của 1.19.0), một số tiếng Anh.

---

## 3. Phần B — Giao diện chưa đều

### 3.1 Lỗi trong ảnh người dùng gửi

- **Nút đang chọn trông lệch so với nút bên cạnh.** `.kb-ai-chip.is-on` (`garden.css:1380`) thay bóng đổ pixel ngoài của `.kb-btn` bằng `box-shadow: inset 0 -3px 0 #c99a00`. Kết quả là nút đang chọn mất bóng, viền dưới dày hơn, nhìn như thấp / lệch hơn nút bên cạnh.
  - Lỗi này có ở **mọi hàng chip của tab Nguồn báo** (Trình độ A1…C1 / N5…N1, Giọng đọc báo, Lấy từ, Giọng cho câu không có audio — Dùng) và ở hàng "Đọc báo:" của Kệ báo.
- **Font khác nhau**: chip trong `.kb-ai` / `.kb-p-empty` dùng `Noto Sans` (`garden.css:1190`, `1355`), trong khi hàng tab của bảng (Báo / Chép chính tả / Kệ báo / Nguồn báo) dùng font pixel. Hai hàng nút ngay trên dưới nhau mà khác font.
- **Nhãn "Đọc báo:"** dùng `.kb-ai-k { min-width: 88px }`. Ở màn "chưa hỗ trợ" nhãn từng bị đẩy vào giữa; 1.19.0 đã sửa căn trái nhưng nhãn vẫn rộng thừa.
- Cách sửa đề xuất: **một kiểu "nhóm nút chọn" dùng chung** cho cả app, giống `.kb-h-tab` / `.kb-p-tab`:
  - cùng font pixel, cùng cỡ chữ, cùng chiều cao;
  - nút đang chọn chỉ đổi màu nền (vàng `#ffd23f`), giữ nguyên viền và bóng.
  - Áp cho mọi `chips()` trong `paper.js` và các nhóm nút chọn khác. Tìm thêm các lớp có `.is-on` / `.kb-h-mode-on` / `.kb-ai-chip`.

### 3.2 Soát lại toàn bộ (người dùng: "kiểm tra lại các mục khác")

- `audit.js` hiện chỉ đo chiều cao / mép / khoảng cách của các nút cùng hàng nên **không bắt được** lỗi 3.1. Cần đo thêm cho các phần tử cùng hàng (nút, tab, chip, select):
  - `box-shadow`, `border-width`, `font-family`, `font-size`, `padding` khác nhau → in "kiểu lệch";
  - nhãn dính vào hàng nút mà rộng thừa (> 40px khoảng trống).
- Thêm vào `audit.js` các màn chưa có: Báo / Kệ báo / Nguồn báo khi có báo tiếng Anh (deck `M::Tiếng Anh A2`), Kệ báo có hàng chuyển ngôn ngữ, tab Nguồn báo khi chưa có khoá, Cấu hình trường của loại note tiếng Anh, bảng Trò chơi với deck tiếng Anh.
- Lần chạy `audit.js` ngày 04/11 (gói 1.19.0, 1366×768 và 1024×700): không tràn ngang, không chữ < 11px, không nút < 18px. Chỉ có dòng tóm tắt ở Kệ báo bị cắt "…" (cố ý). Phần còn lại phải soát bằng mắt trên ảnh chụp.
- Xem kỹ bằng mắt (ảnh ở thư mục ảnh của `audit.js`): ⚙ cài đặt, Nhà (10 tab, nhất là Mùa & Lễ hội), Trò chơi + 5 trò, Báo (4 tab), Cấu hình trường, Giao diện. Ghi lại từng chỗ "chưa đều" kèm ảnh trước / sau.

---

## 4. Phần C — Chữ trong app: đơn giản, bỏ diễn giải

### 4.1 Nguyên tắc (người dùng đã cho phép bỏ thẳng tay)

- Mỗi thông báo **một câu ngắn**, nói điều cần biết, không giải thích lý do bên trong. Diễn giải chi tiết (nếu thật cần) để ở chú thích khi rê chuột (`title`) hoặc khối "Chi tiết" thu gọn.
- **Không dùng chữ "add-on"** trong giao diện. Viết theo hành động, ví dụ "Gemini viết báo mỗi sáng".
- **Một khái niệm một tên, một hành động một động từ** (bảng thuật ngữ, ghi vào README mục 0 khi chốt):

  | Khái niệm | Dùng | Không dùng lẫn |
  |---|---|---|
  | giao diện theo mùa / lễ hội | **Giao diện mùa** (tab: "Giao diện mùa"?) | "chủ đề", "giao diện theo mùa", "Mùa & Lễ hội" (chọn **một**, hỏi người dùng) |
  | bật / tắt | **Bật / Tắt** | "Thôi", "Đã tắt" lẫn "Tắt …" |
  | xem thử | **Xem thử / Dừng xem thử** | "Thôi xem thử" |
  | báo | **Báo** (tiếng Nhật / tiếng Anh) | "畑新聞" chỉ là chữ trang trí |
  | loại note, trường | giữ như README | |

### 4.2 Chỗ đã thấy (gói 1.19.0; số dòng có thể lệch vài dòng)

- **Giao diện mùa** (`web/home.js` khoảng 3893–3960, `web/season.js` khoảng 594):
  - Đang dùng lẫn "Chưa dùng giao diện mùa nào", "Tắt giao diện mùa" → "✓ Đã tắt", "Đã tắt giao diện theo mùa: vườn dùng giao diện thường.", "Thôi xem thử" (2 chỗ + câu gợi ý "bấm “Thôi xem thử” hoặc đóng bảng Nhà để trở lại"), "Mở chủ đề: 1000 xu…", "Đang xem thử “…” trên cả vườn · …", chip "Mùa lá đỏ tới rồi ▸", chú thích chip "bấm để đổi giao diện theo mùa".
  - → Thống nhất tên và động từ theo 4.1; nút: "Tự động" / "Tắt"; bỏ câu mô tả chế độ (`MODE_TEXT`) hoặc rút còn vài chữ.
- **Báo** (`web/paper.js`):
  - màn "Báo chưa hỗ trợ ngôn ngữ này" + câu "Add-on không nhờ Gemini…" (khoảng dòng 263–272) và dòng hướng dẫn trùng ý (khoảng dòng 120) → **bỏ** (phần A bỏ luôn cả màn này);
  - dòng hướng dẫn tab Nguồn báo "Chọn cách nhận báo mỗi sáng: Gemini (dán khoá, dễ nhất) hoặc Claude Code (bộ kotoba_daily)." trùng với tiêu đề hai thẻ → bỏ;
  - phụ đề thẻ Gemini "Add-on tự viết báo … bằng khoá Google của bạn · dễ nhất, miễn phí" → "Gemini viết báo · miễn phí";
  - hai đoạn ghi chú cuối thẻ Gemini (quyền riêng tư; "Mỗi số: Gemini viết → máy kiểm tra (…) → …") dài 200–270 ký tự → mỗi đoạn còn 1 câu, phần còn lại cho vào "Chi tiết";
  - hàng "Model: tự chọn khi viết" → chỉ hiện khi người dùng ép model;
  - bước 3 của ô dán khoá ("Khoá dùng được là add-on tự viết số đầu tiên…") → "Khoá đúng thì báo số đầu tiên về sau 1–2 phút.";
  - thẻ "Giọng đọc cho câu không có audio": hướng dẫn cài giọng Windows / macOS 230 ký tự → thu vào "Cách cài giọng";
  - lời mở đầu khi chưa có nguồn báo (khoảng dòng 520–521) → 1 câu;
  - ghi chú số rút gọn "Số ngắn: bạn còn vài số chưa đọc nên…" → "Số ngắn vì bạn còn số chưa đọc.";
  - "Xu ở đây 0" ở đầu bảng → "Xu nhận: 0" (khó hiểu);
  - các câu "Câu này chưa có giọng đọc… Xem tab Nguồn báo → Giọng đọc." / "Cài VOICEVOX trên máy viết báo…" → ngắn lại.
- **Lượt chép chính tả trống** (`__init__.py` `_dict_hint`, khoảng dòng 1455): 3–5 gạch đầu dòng dài (cài giọng Windows / macOS, giải thích chữ Hán…) → còn 1–2 dòng, chi tiết thu gọn.
- **Cấu hình trường** (`web/fields.js` khoảng dòng 181): "Chưa cấu hình — đã điền sẵn theo gợi ý, kiểm tra rồi bấm Lưu. Mỗi loại thông tin nên ở một trường riêng (furigana …; tiếng Anh có thể kèm IPA)." và dòng "Mỗi note là một từ: chữ, cách đọc, nghĩa, ví dụ, audio." → "Đã điền sẵn — kiểm tra rồi bấm Lưu."; bỏ dòng thứ hai; nút cam "1 loại note của deck chưa cấu hình" có thể gọn hơn.
- **Trò chơi** (`web/games.js`, mô tả 80–106 ký tự): câu "10 câu, trả lời càng nhanh càng nhiều điểm" lặp ở nhiều trò → bỏ hoặc đưa vào chú thích; "Tốc độ quạ — chậm thì ít điểm hơn (Rất chậm ×0.6, …)" → để trong `title`.
- **Vườn** (`web/garden.js` khoảng 759–768): lý do cây còn chờ (deck lọc, hoãn, giới hạn ôn…) mỗi câu trên 100 ký tự → còn nửa.
- **Nhà / Xưởng** (`web/home.js`, `web/craft.js`): hướng dẫn Xưởng 137–161 ký tự (dòng 543, 611 của craft.js; 3868 của home.js) → gọn lại; mô tả vùng (3387–3391) là chữ trang trí, có thể giữ.
- **Giao diện** (`web/ui.js:182`): "“Trò chơi & báo” = lúc mở Trò chơi, Báo / Chép chính tả, Cấu hình trường. Nhà & Cửa hàng luôn chuyển động đầy đủ." → bỏ hoặc cho vào `title`.
- **Chú thích nút** có chữ "add-on" (`web/body.html:35, 37`, `web/garden.js:281`) → viết lại không có "add-on" (chú thích thì được dài hơn chữ hiện sẵn, nhưng vẫn gọn).

### 4.3 Cách soát hết (không bỏ sót)

- Trích mọi chuỗi có chữ Việt dài ≥ 25 ký tự trong `web/*.js`, `web/body.html`, và các chuỗi Python gửi sang trang (`toast`, `flash`, `PaperError`, `HomeError`, `_dict_hint`, `mobile_message`, `fields_core` / `garden_core` thông báo lỗi).
- Lập bảng: chuỗi cũ → chuỗi mới / bỏ. **Cho người dùng xem bảng** (hoặc ảnh trước / sau của vài màn chính) trước khi sửa hàng loạt.
- Test e2e đang so một số câu chữ (vd. `e2e_117.js` tìm "don't = do not", "chứa cả nghĩa"; `e2e_118.js` tìm "nhạc nền đang tắt"; `e2e_119.js` tìm "hiện có báo tiếng Nhật và tiếng Anh"…) → sửa test cùng lúc, chạy lại cả 8 kịch bản.

---

## 5. Thứ tự làm

1. Hỏi người dùng 3 câu ở 2.5 và chốt bảng thuật ngữ 4.1 (tên "Giao diện mùa" hay "Mùa & Lễ hội"…).
2. Phần A (báo theo ô tick + chọn deck) → test → commit.
3. Phần B (kiểu nút chọn dùng chung, `audit.js` đo thêm, soát mọi màn) → test → commit.
4. Phần C (chữ) → test → commit.
5. Đóng gói **1.19.1**, cập nhật README (repo, gói, `tests/README.md`), **xoá file này** + dòng `.gitignore` + dòng trỏ ở README mục 0, commit, push.

---

## 6. Tiến độ

- [ ] Hỏi người dùng các câu còn lại ở 2.5 (câu 1 đã chốt: 70% chưa thuộc / 30% đã thuộc) + bảng thuật ngữ 4.1
- [ ] Phần A — báo theo ô tick "Báo muốn nhận", chọn tối đa 5 deck / 100 note, bỏ phụ thuộc deck đang xem
- [ ] Phần B — nút chọn đều nhau, `audit.js` đo kiểu lệch, soát mọi màn
- [ ] Phần C — chữ đơn giản, thống nhất thuật ngữ, bỏ diễn giải thừa
- [ ] Đóng gói 1.19.1 + README + xoá file kế hoạch
