# Báo cáo 1.35.5 — sửa lỗi audit 19/11 + kiểm tra lần cuối trước phát hành (19/11/2026)

Người dùng: "sửa các lỗi nằm trên nhánh audit/release-review-1.35.4-2026-11-19. verify lại, và sửa lỗi. sau đó test lại lần
cuối, xem còn gì sai nữa không. đây là bản release cuối cùng rồi, nên cần cover hầu hết lỗi, UI, trước khi update bản mới"

Làm trên nhánh `claude/cool-shannon-bp1n0n` (gộp nhánh audit vào — chỉ thêm báo cáo
`docs/kiem_thu/audit-1.35.4-2026-11-19/BAO_CAO.md`). **Không thêm khoá collection, không thêm mục config.json** (test so với
1.35.4). **Cách sửa Claude chọn, người dùng chưa xem.**

## 1. Lỗi của nhánh audit — có đúng không?

Cách kiểm: đọc mã + đối chiếu mã nguồn `aqt` thật (26.9.4), viết test tái hiện đúng thao tác của báo cáo, chạy trên mã 1.35.4
(commit `875444c`) → đỏ, trên 1.35.5 → xanh: `tests/core/test_1355.py` (1.35.4: **đỏ 57 / 62**), `tests/anki/e2e_1355.js`
(Anki 26.9.4 thật; 1.35.4: **đỏ 19 / 24**), `tests/anki/e2e_1355z.js` (`ANKI_WEBSCALE=1.25`; 1.35.4: đỏ 8 / 10).

**Kết luận: 24 / 27 mục đúng và đã sửa; 1 mục (02) là hành vi đã chốt ở PHAT_TRIEN.md mục 7 — giữ nguyên; 2 ý không phải lỗi
(18 ý 1, 25 ý Esc) và 1 ý không tái hiện được (27 ý cuối).** Có 3 mục audit mô tả điều kiện chưa đúng nhưng lỗi vẫn có thật
(05, 08, 03) — ghi rõ ở bảng.

### 1.1 P1

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 01 | Khoá ghi lúc đồng bộ mở quá sớm (theo thanh tiến độ) → ghi chen vào bản cũ vừa tải về, đóng dấu "mới nhất", lúc so bản cũ thắng | **Đúng** (đối chiếu `aqt/taskman.py`, `aqt/sync.py` 26.9.4: `progress.finish()` chạy trước `on_done`, rồi mới tới hộp thoại lời nhắn máy chủ / chọn Tải lên–Tải về / báo lỗi, sau đó mới `sync_did_finish`). Anki thật: bản cũ mang về −1.000 xu + một lần cộng xu chen vào → 1.35.4 **mất 993 xu** | `_sync_hold()` giữ tới lúc so xong; **chốt an toàn** `_sync_watch`: Anki không bao giờ báo xong → hết thanh tiến độ + không còn hộp thoại chặn 120 giây thì tự so (như lúc đồng bộ xong) rồi mở khoá — không bao giờ khoá ghi mãi |
| 02 | Khôi phục bản sao lưu sạch (từ trước khi cài) → lần mở sau vườn của máy được trả lại | Hành vi đúng như audit tả, nhưng **đó là quyết định đã chốt 1.33.1** (mục 7: "bản nhập chưa có vườn (sao lưu từ trước khi cài) thì lần mở hồ sơ sau vẫn trả lại vườn của máy (không mất vườn)"). Ví cũng vẫn lấy lại từ file sao lưu của hồ sơ như mọi bản | **Không đổi.** Muốn khôi phục bản sao lưu sạch là xoá luôn vườn → hỏi người dùng (mục 5) |
| 03 | `streak_start` đọc thẳng `get_config` (bỏ qua bản chờ trả lại) rồi đặt mốc "bây giờ" đè mốc thật | **Đúng**, nhưng đoạn tái hiện của audit (chỉ mất `START_KEY`) không phải ca lỗi: lớp giữ dữ liệu vốn giữ bản mang về đó ("có từ trước khi có mốc"). Ca lỗi thật: collection mất **hết** dữ liệu vườn (tải về collection chưa từng có vườn) + đang có bản chờ → lần đọc sổ bù xu trả lại mốc thật, ngay sau đó bị đè bằng "bây giờ" (chuỗi ngày về 0, đổi "dòng" dữ liệu) | Đọc mốc qua `backup.read_config` (trả lại bản chờ trước), đọc lại một lần trước khi đặt mốc mới |
| 04A | `after_sync` gặp lỗi thoáng qua → không giữ bản chụp chờ | **Đúng** | Lỗi → `_hold` bản chụp (file `pending` + móc); ghi file cũng lỗi / chưa có collection → `sync_core.hold_later` giữ trong bộ nhớ |
| 04B | `settle` gỡ móc dù ghi "xong" ra file lỗi → lần đồng bộ sau dùng bản chờ cũ trên file | **Đúng** (lần đồng bộ sau chụp 999 xu cũ thay vì 1.004 xu mới) | Chỉ gỡ móc khi file hết "đang chờ"; `before_sync` thấy bản chờ đã cũ hơn collection (dấu mới hơn, cùng dòng) → chụp collection |
| 05 | Bật "User interface size" > 100% → cắt 20–33% mép phải | **Lỗi có thật, điều kiện sai**: "User interface size" của Anki (Qt6) đặt `QT_SCALE_FACTOR`, `app_zoom_factor()` vẫn = 1 → không bị. Bị khi có biến `ANKI_WEBSCALE` (Anki ghi trong hướng dẫn cho màn hình dpi cao) — Anki thật `ANKI_WEBSCALE=1.25` ở 1366 × 768: **cắt 342 px** | Phóng to bằng `QWebEngineView.setZoomFactor` (đặt lại sau mỗi lần nạp trang), bỏ CSS `body { zoom }`. Hệ số = 1 (đa số người dùng): không đổi gì |
| 06 | Tiếng Nhật dùng Claude Code → báo Trung / Hàn / Đức / Pháp / Việt chỉ còn "Nguồn: Claude Code" | **Đúng** (Anki thật: báo Trung 1 dòng, 0 nút) | Chỉ báo tiếng Nhật theo Claude Code (`lang === "ja"`) |
| 07 | Lịch hoa: (1) đổi tiếng / gợi ý / đã xem lúc đồng bộ ném `StoreFailed`, đổi tiếng ghi config trước; (2) Nhờ Gemini sửa ghi đè bài máy khác; (3) bài vừa về đã khoá → chữ gõ dở mất | **Đúng cả 3** (Anki thật: "LOCAL_UNSAVED_TEXT" đè bài máy khác và bị gửi) | (1) bắt lỗi, báo một dòng trong Lịch hoa (đang đồng bộ thì không ghi vào Báo lỗi), ghi nhật ký trước config; (2) gửi kèm `b` → xung đột thì không ghi / không gửi, trang đọc lại + báo chữ gõ dở; (3) ô chỉ đọc cũng báo chữ gõ dở + nút **Chép chữ gõ dở** (cả đoạn vào bộ nhớ tạm) |

### 1.2 P2

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 08 | Esc Esc nhanh khi có hộp hỏi / bảng ⚙ / thẻ cảnh → đóng cả cửa sổ vườn | **Lỗi có thật, ví dụ của audit không đúng**: hộp hỏi / ⚙ / thẻ cảnh bắt Esc ở capture + chặn hẳn → đúng một lớp (Anki thật: cửa sổ còn). Lần "tái hiện" ban đầu của tớ cũng đỏ — vì add-on test `zz_kbtest` đặt `ASK_TEST_OFF` (hộp hỏi không hiện, `then` chạy ngay), có lẽ audit cũng vậy. **Ca lỗi thật**: thẻ chỗ lấp lánh / gánh hàng rong mở từ cảnh **trong bảng Nhà** — một Esc đóng cả thẻ lẫn bảng Nhà, Esc thứ hai đóng cửa sổ (Anki thật) | Thẻ lấp lánh / gánh hàng / thẻ sinh hoạt bắt Esc ở capture + chặn hẳn; Nhà / Trò chơi / Báo / ⚙ Giao diện / Tin làng bỏ qua Esc lớp trên đã dùng (`defaultPrevented`) → **một Esc một lớp** |
| 09 | Bản gốc mồ côi sau "Bắt đầu truyện mới" + viết báo lỗi → ẩn cả hai nút; bấm lại → truyện cũ thật không lấy lại được | **Đúng** | "Đã có kỳ mới" chỉ tính kỳ **đã đăng**; Lấy lại truyện cũ cất bản gốc / bản nháp mồ côi sang `truyen_cu/<thư mục>_bo/` (không xoá); bấm lại cùng ngày → không cất thêm lần |
| 10 | "Bạn chưa đọc kỳ 3" chỉ sang kỳ 3 của bộ truyện khác (ngày còn sau số đang đọc) | **Đúng** | `Library.story_prev`: kỳ trước = số có truyện gần nhất trước ngày đó, phải đúng kỳ − 1 |
| 11 | Lật thẻ lúc đang đồng bộ → bảng ôn kẹt "đang lật" | **Đúng** (Anki thật) | Python trả `flipRetry` khi bỏ lệnh / dựng mặt sau lỗi; trang tự mở khoá sau 8 giây phòng hờ |
| 12 | Tưới ngay rồi mở Nhà ngay → hai bảng chồng nhau | **Đúng** (Anki thật) | Mở bảng lớn khác trước khi thẻ đầu tiên tới → huỷ lần mở bảng ôn |
| 13 | Điền vào câu tiếng Đức ("der Hund, -e") mất hết đáp án nhiễu | **Đúng** | Phần số nhiều ("-e", "¨-e") không còn là một cách viết của từ |
| 14 | Lật cặp với deck katakana + cách đọc → bàn trống 0/0, đồng hồ chạy mãi | **Đúng** | Chỉ nhận note ghép được (cách đọc chỉ khi có kanji); không cặp nào → báo một dòng |
| 15 | Äpfel / Ärzte / Ämter / Öfen không nhận ra; `[학교]에서` gạch chân "[학" | **Đúng** | Nguyên âm viết hoa đầu từ; tiếng Hàn bỏ ngoặc / dấu đóng sát chữ (cả `《친구》를`) |
| 16 | Từ mới chỉ nằm trong từ dài hơn (家 / 大家) → kiểm tra chắc chắn báo lỗi, gọi lại Gemini; `{食べる\|タベ\|食べる}` → "食べるべる" | **Đúng cả hai** | Sau khi nối chỗ tra từ, bỏ từ mới không có chỗ tra riêng (Trung / Hàn / Anh / Đức / Pháp); nhánh `{…}` đổi cách đọc katakana → hiragana như nhánh `[…]` |
| 17 | Đủ 5 deck con → không tick được deck cha; deck hết note của tiếng đó thành "deck ma" | **Đúng** (Anki thật) | Ô deck cha bấm được khi tick nó không vượt quá 5; deck không còn trong danh sách không tính |
| 18 | (1) Nhập .colpkg không xoá bản thử của Nhà; (2) đổi deck không xoá sổ Hoàn tác | (1) **Không phải lỗi**: bản thử là file theo hồ sơ (không thuộc collection), xu / đồ đổi thì thanh thử tự tính lại (`dataChanged`). (2) **Đúng** (Anki thật) | (2) đổi deck / nhập collection → bỏ sổ Hoàn tác của bảng ôn |
| 19 | Dán mã có chữ có dấu / emoji → `UnicodeEncodeError`; gói báo chờ xoá trước khi tính | **Đúng cả hai** | Mã ngoài ASCII → một câu báo (trang web báo cùng câu); chỉ bỏ khỏi file ngày đã tính xong |
| 20 | `{{c1::…}}` lọt vào câu ví dụ; từ NFD tiếng Nhật / Hàn không che được | **Đúng** | Bỏ cú pháp Cloze của Anki khi đọc trường; NFC cho từ + câu |
| 21 | Trang trí thử: bấm trúng thú / khách đã ẩn; mẫu tường / sàn mới dán lên nhà thật | **Đúng** | Đang thử thì không bắt thú / khách / chỗ lấp lánh; mẫu mới dán vào bản thử |

### 1.3 P3

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 22 | Esc "chết" trong ô tìm deck trống và ô nhập khác | **Đúng** (Anki thật) | Esc trong ô nhập = rời ô (có chữ ở ô tìm thì xoá chữ trước); Esc tiếp mới đóng bảng |
| 23 | Đuổi quạ: "→ undefined"; "(sich) freuen"; báo đủ từ mà không chơi được | **Đúng** | Không cách đọc thì không ghi mũi tên; gõ "sich freuen" cũng đúng; báo thiếu từ tính cả đáp án gõ được (≤ 24 ký tự) |
| 24 | `watchPops` bỏ sót thẻ nổi tạo muộn; `panelsOpen` thiếu Lịch hoa; `openSeason` không đóng Cấu hình trường / ⚙ Giao diện | **Đúng** | Thêm cả 4 thẻ nổi (nối lúc vừa tạo); Lịch hoa tính là bảng đang mở; chip chủ đề mùa đóng hai bảng đó |
| 25 | Cửa sổ Sửa thẻ: không đóng bằng Esc; lật thẻ khi cửa sổ còn mở thấy mặt sau cũ | Esc: **giữ như cửa sổ Edit của Anki** (QMainWindow, `Ctrl+Enter` đóng — Anki cũng vậy). Mặt sau cũ: **đúng** (Anki thật) | Lật thẻ: note đã đổi → nạp lại trước khi dựng mặt sau |
| 26 | Tre cỡ Lớn cắt ngang trời; đèn đêm vẫn chạy khi tắt hiệu ứng; Xưởng không vẽ lại lưới khi đổi màu nền | **Đúng** | Thân tre / tán lá từ mép trên của trời thêm; đèn đêm đứng yên như lớp ngày; vẽ lại lưới |
| 27 | errors.json hỏng → `ValueError`; nhật ký thiếu `compositionend`; truyen_chung.json sau bắt đầu lại; Lịch hoa ẩn số báo của nguồn tiếng Nhật không dùng nữa; tìm deck lặp tên đường dẫn; `[sth]` thành pinyin; loại 汉字 của deck tiếng Trung thành từ vựng; lời nhắc kể lại "mâu thuẫn" | 7 ý **đúng**. Ý cuối **không tái hiện được**: có bản gốc thì kỳ của lời nhắc = kỳ của bản gốc (`Job.run`), sau khi bắt đầu lại danh sách truyện rỗng nên "kỳ 1" khớp | Sửa 7 ý. Loại 汉字: sửa ở vườn (danh sách loại note); ở báo giữ "từ vựng" như cũ (để tra nghĩa chữ Hán đơn khi đọc báo, kho 100 từ vẫn bỏ chữ đơn) |

## 2. Kiểm tra lần cuối — thấy thêm

- **Đồng bộ lần nữa khi lần trước chưa báo xong** (cùng nhóm lỗi 01): bản chụp lần mới có thể chính là bản cũ lần trước vừa
  mang về → nay `_on_sync_start` thấy khoá còn bật thì so lần trước trước khi chụp lần mới.
- **Tên báo Đức / Pháp** (*Der Wortgarten*, *Le Jardin des Mots* — chữ Latin) dùng kiểu chữ của 畑新聞 (44 px, giãn chữ 3 px),
  lệch với *The Garden Gazette* / *Báo Làng Kotoba* (kiểu chữ Latin có chân) → cùng kiểu chữ Latin (`kb-p-name-en`). Cùng gốc
  với lỗi 06: chỗ chỉ tính "Anh / Việt là chữ Latin" có từ trước khi thêm Đức / Pháp.
- Tiếng Hàn: dấu đóng ngoặc giữa danh từ và tiểu từ (`《친구》를`, `'학교'에`) cũng làm mất chỗ tra từ (audit chỉ nêu ngoặc mở) → sửa
  cùng lúc với 15.
- Hai kịch bản cũ (`anki/e2e_1352.js` 12b, `anki/e2e_1253.js`) giả lập "dữ liệu mang về" bằng cách ghi qua add-on giữa lúc đồng
  bộ, hoặc bắt đầu đồng bộ mà không bao giờ báo xong — trước đây lọt qua đúng vì lỗi 01. Sửa kịch bản theo vòng đời thật (Anki
  ghi dữ liệu mang về ngoài khoá của vườn; đồng bộ bắt đầu thì có báo xong). `core/test_1312.py`, `anki/e2e_1312.js` (5b),
  `core/test_1352.py` sửa theo hành vi mới; `trang/ma_thu.py` thêm ca mã có chữ có dấu (trang web và add-on báo cùng câu).
- Không thấy gì thêm ở: đường lưu nhật ký khi khoá ghi (chữ vẫn chép ra file sao lưu của hồ sơ), cửa sổ vườn đóng trước khi Anki
  tải / đẩy toàn bộ (lưu nốt bị từ chối → file sao lưu giữ chữ), Python 3.9 (Anki 23.10: biên dịch + `test_1355.py` 62/62).

## 3. Đổi gì trong dữ liệu / hành vi người dùng thấy

- Không khoá collection mới, không mục config mới. File mới (chỉ khi cần): `user_files/bao_chung/truyen_cu/<thư mục>_bo/` khi
  Lấy lại truyện cũ có bản gốc mồ côi.
- Trong lúc Anki đồng bộ (kể cả lúc hộp thoại cuối của Anki còn mở) bấm trong vườn → "Anki đang đồng bộ — xong rồi bấm lại nhé"
  như lúc thanh tiến độ còn hiện (trước đây lúc hộp thoại đó mở thì vườn vẫn ghi).
- Esc: một lần một lớp; trong ô nhập thì rời ô trước.

## 4. Kết quả test

- `tests/run_all.sh` (aqt 26.9.4, `KB_OLD_1354` = mã 1.35.4) trên mã cuối: **TẤT CẢ OK** (`core/test_1355.py` 66/66 — gồm
  so khoá collection / mục config với 1.35.4). Lần chạy đầu trên gói đỏ 1 ca: dữ liệu hình của trang web còn ghi 1.35.4 → chạy
  lại `node site/tools/xuat_hinh.js` (chỉ đổi số bản), `trang/test_trang.py` 35/35.
- Anki 26.9.4, **57 kịch bản** (mọi `anki/e2e*.js` + `audit*.js`, trừ `e2e_capnhat` / `e2e_habanh` / `e2e_1312` / `e2e_1355z`
  chạy bằng trình riêng), 3 luồng `run_versions.sh`: **2.391 / 2.392** kiểm tra. Ca trượt duy nhất: `e2e_1253` "localStorage
  trống sau khi mở lại" — điều kiện của môi trường test, trượt y hệt trên 1.35.3 / 1.35.4 (báo cáo 1.35.4 mục 5).
  `e2e_1355` 25/25, `e2e_1354` 75/75, `e2e_1354b` 35/35, `e2e_135` 60/60, `e2e_134` 87/87, `e2e_1352` 33/33 (sau khi sửa
  kịch bản — mục 2), `e2e_1253` 38/39 (như trên).
- `e2e_1355z.js` với `ANKI_WEBSCALE=1.25`: 10/10 (mã 1.35.4: 2/10, cắt 342 px).
- Máy chủ đồng bộ thật của Anki (`tests/dong_bo/run_e2e.sh` → `e2e_1312.js`): **47/47**.
- `audit_20261114/run_ui_audit.sh` (`KB_AUDIT_BASELINE=1`): `e2e_128_fix` 26/26, `ui_audit` 191/191, `deep_ui_audit` 18/18,
  `lifecycle_audit` 7/7.
- Anki 23.10.1 (Python 3.9, PyQt6 6.6.0): `e2e_1355` 25/25, `e2e_1354` 75/75, `e2e_1354b` 35/35, `e2e_1322` 40/40,
  `e2e_1352` 33/33, `e2e_1253` 38/39 (như trên); `core/test_1355.py` 62/62.
- `run_capnhat.sh` 1.31.3 (dựng lại từ `fixtures/ban_cu/e64eb22.tar.gz`) → 1.35.5: **19/19** (cài đè bằng trình quản lý
  add-on của Anki, mọi khoá `kotoba_batake_*` + file `user_files/` + cấu hình giữ nguyên).
- Gói `kotoba_batake.ankiaddon` 1.35.5: 82 mục, khớp từng tệp với thư mục `kotoba_batake/`, cùng danh sách tệp với gói 1.35.4.

## 5. Câu hỏi cho người dùng

Mục 02: khôi phục **bản sao lưu từ trước khi cài** ことば畑 (File → Import .colpkg / Mở bản sao lưu): hiện vườn của máy **được
trả lại** ở lần mở hồ sơ sau (quyết định 1.33.1 — không mất vườn). Audit đề nghị ngược lại (bản sao lưu sạch = vườn trống).
Giữ như hiện tại hay đổi?

## 6. Xem trên máy thật

1. Đồng bộ AnkiWeb khi vườn đang mở, lúc Anki hỏi Tải lên / Tải về (đồng bộ toàn bộ) thì bấm thử trong vườn → "Anki đang đồng
   bộ…"; xong thì xu / đồ / nhật ký đúng.
2. Báo → Nguồn báo khi tiếng Nhật dùng Claude Code và có báo tiếng khác.
3. Bảng Nhà → bấm chỗ lấp lánh trên cảnh → Esc (chỉ đóng thẻ) → Esc (đóng Nhà).
4. Lịch hoa: gõ dở rồi đồng bộ từ máy khác đã gửi bài → dòng báo + Chép chữ gõ dở.
