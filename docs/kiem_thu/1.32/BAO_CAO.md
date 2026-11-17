# Báo cáo 1.32.0 / 1.32.1 — Ngôn ngữ trong vườn + deck tiếng Trung / tiếng Hàn (17/11/2026)

Người dùng: "làm 1 lần cho 3 tiếng Trung, Hàn, Anh luôn đi. sau đó kiểm tra lại thật kỹ nha. thêm các bộ test nữa. phác
thảo trước đi" → ảnh phác `docs/ke_hoach_1_32/` → "oke, triển khai nhé. Tiếng trong vườn -> Ngôn ngữ trong vườn … khi làm
xong nhớ thêm các bộ test … vì đây là các ngôn ngữ tớ không học nên cũng không biết review sao".

## 1. Đã làm

- **⚙ → Ngôn ngữ trong vườn**: Tự theo deck · Tiếng Nhật · Tiếng Anh · Tiếng Trung · Tiếng Hàn · Chỉ tiếng Việt (không
  có câu giải thích, theo yêu cầu). Đổi: câu StackChan nói, sinh hoạt, Sổ sinh hoạt, đồ nhặt, Hộp sưu tầm, Album khách,
  tường / sàn, tên mùa, tiêu đề bảng, màn chào, dải chúc mừng, Lịch hoa. Trò chơi theo ngôn ngữ của deck đang chơi.
- **Deck tiếng Trung / tiếng Hàn**: ngôn ngữ riêng trong Cấu hình trường, Pinyin / phiên âm, Hán Việt, 5 trò chơi có chế độ
  riêng, Đuổi quạ gõ pinyin, giọng máy zh_CN / ko_KR.
- **Không làm**: pinyin nằm trên từng chữ, đổi pinyin ghi số sang dấu khi hiển thị — phiên chat bị chặn mỗi lần làm phần
  này. Cây tiếng Trung hiện pinyin của deck ở dòng dưới chữ như trước.

## 2. Soát chữ tiếng Trung / tiếng Hàn bằng công cụ độc lập (thay cho người đọc lại)

| Kiểm tra | Cách soát | Kết quả |
|---|---|---|
| Pinyin của 258 câu tiếng Trung | so từng âm tiết, từng thanh với từ điển pypinyin 0.55 (bảng đối chiếu `tests/fixtures/chu_132_ref.json`) | khớp; **bắt được 2 chữ đa âm**: 弹 trong 弹乐器 (đúng *tán*, từ điển *dàn*) → đổi thành 演奏乐器; 长椅 (đúng *cháng*, từ điển *zhǎng*) → ghi ngoại lệ có lý do. 24 chỗ thanh nhẹ (衣服, 东西, 谢谢…) đúng cách viết chuẩn |
| Chữ giản thể | mã hoá GB2312 + OpenCC phồn → giản không đổi chữ nào | đạt |
| Phiên âm 169 mục tiếng Hàn | bộ chuyển Hangul → Romaja viết riêng (`tests/core/hangul_rr.py`: nối âm, mũi hoá, ㄹ, bật hơi; tự kiểm bằng 신라 silla, 종로 jongno, 좋다 jota…) | khớp; 3 từ có biến âm "thêm ㄴ" (댓잎, 그림엽서, 삼잎) đổi sang từ đơn giản để chắc đúng |
| Âm tiết tiếng Hàn | Hangul hợp lệ, có trong bảng 2.350 âm tiết thông dụng (EUC-KR) | đạt |
| Tiếng Anh | chữ Latin, sinh hoạt viết như động từ nguyên mẫu | đạt |

## 3. Kết quả test

| Bộ | Kết quả |
|---|---|
| `core/test_132.py` (mới) | **73 / 73** + `core/test_132.js` **53 / 53**: đủ mục 3 tiếng, mọi câu tiếng Nhật trong mã trang đổi được ở cả 4 ngôn ngữ ("Chỉ tiếng Việt" không còn chữ Nhật), cách lưu với mã 1.31.3 / 1.31.5 thật, so pinyin khi gõ Đuổi quạ (`xia4yu3`, `xiayu`, `xià yǔ`, `lv4` = `lǜ`…) |
| `anki/e2e_132.js` (mới, Anki thật) | **39 / 39** |
| `anki/run_capnhat.sh` 1.31.3 (đã phát hành) → 1.32.0 | **17 / 17**: mọi khoá collection, mọi file `user_files/`, cấu hình add-on giữ nguyên |
| `tests/run_all.sh` (`ANKI_PY` = aqt 26.9.4, có `test_132`, `test_ban_cu` thêm 1.31.5) | **TẤT CẢ OK** (lần đầu đỏ 2 bộ do đổi có chủ đích: `test_117` / `test_1314` kỳ vọng deck tiếng Trung / Hàn là "Ngôn ngữ khác" → sửa kỳ vọng; `test_1255` soát thứ tự nạp `fix.js` → `glang.js` nạp sau `icons.js`) |
| Kịch bản Anki thật cũ có liên quan | `e2e_128` 72 / 72 (Hộp sưu tầm, gánh hàng) · `e2e_1314` 53 / 53 (Ctrl+Z) |

Ảnh từ `e2e_132.js`: `132_e2e_01_tieng_trung.png` (vườn tự sang tiếng Trung), `132_e2e_02_hop_han.png` (Hộp sưu tầm
tiếng Hàn), `132_e2e_03_chi_tieng_viet.png`, `132_e2e_04_cau_hinh_trung.png`, `132_e2e_05_duoi_qua_pinyin.png`.

## 4. Dữ liệu khi cập nhật

- Lựa chọn Ngôn ngữ trong vườn chỉ ở cài đặt riêng máy (config `prefs`, khoá `kb-glang`); collection không thêm khoá.
- Deck tiếng Trung / Hàn trong Cấu hình trường: `lang[mid] = "other"` (bản ≤ 1.31 chạy như "Ngôn ngữ khác"),
  `lang2` / `f2` / `games_lang2` cho phần mới — mã 1.31.3 và 1.31.5 thật đọc, lưu đè rồi 1.32 đọc lại vẫn đủ.
- Deck tiếng Trung / Hàn chưa cấu hình: trước nhận là "Ngôn ngữ khác", nay là Tiếng Trung / Tiếng Hàn (có trò chơi riêng).

## 5. Nên thử trên máy thật

1. ⚙ → Ngôn ngữ trong vườn → lần lượt từng mục; bấm StackChan, mở Nhà → Album.
2. Deck tiếng Trung / tiếng Hàn (nếu có): Cấu hình trường tự nhận; Trò chơi → Đuổi quạ.
3. Windows có giọng đọc tiếng Trung / Hàn thì Nghe tìm cây đọc được khi deck không có audio.

## 6. Kiểm tra lần cuối → 1.32.1

Người dùng: "kiểm tra lại logic, giao diện, tính năng, lần cuối nhé. test kỹ hơn, tạo kịch bản test ngoài các test đã có
sẵn, có làm mất dữ liệu không".

### Lỗi tìm được và đã sửa

| # | Lỗi | Sửa |
|---|---|---|
| 1 | **Deck tiếng Trung / Hàn đã cấu hình ở bản cũ kẹt ở "Ngôn ngữ khác"**: bản ≤ 1.31 chỉ có lựa chọn đó, và vườn nhắc cấu hình loại note chưa cấu hình → hầu hết người có deck tiếng Trung đã lưu "other" | `"other"` lưu từ bản cũ + deck đoán ra tiếng Trung / Hàn → dùng tiếng Trung / Hàn (`fields_core.effective_lang`); chọn "Ngôn ngữ khác" ở 1.32 thì ghi `lang2[mid] = "other"` để giữ đúng lựa chọn (bản cũ giữ nguyên khoá này) |
| 2 | **Chữ của người dùng bị "dịch" nhầm**: câu "lên giai đoạn" có từ vựng của cây — từ すごい (N5) thành "Amazing"; tên vùng / món / thú tự đặt trùng câu tiếng Nhật cũng vậy | phần chữ của người dùng bọc dấu cô lập U+2068…U+2069 (`kbKeep` / `keep`), `glang.js` không đổi phần đó |
| 3 | **Tên tường / sàn tràn khỏi thẻ** khi hiện tiếng Anh / Trung dài (hemp-leaf pattern, 木板墙 mùbǎn qiáng) | CSS: tên không phải tiếng Nhật được xuống dòng |
| 4 | Bong bóng StackChan có thể hiện rỗng (câu chỉ có phần tiếng Nhật mà bản tiếng Việt để trống) | bong bóng rỗng thì không hiện |

### Kịch bản test mới (ngoài các test có sẵn)

| Bộ | Kết quả |
|---|---|
| `core/test_132b.py` — mã thật 1.31.3 (đã phát hành), 1.31.5 và 1.32 thay nhau lưu Cấu hình trường trên cùng một kho, **3.000 thao tác × 6 hạt ngẫu nhiên**; dữ liệu hỏng (8 kiểu); deck tiếng Trung cấu hình ở bản cũ; chữ người dùng; glang.js 20.000 chuỗi ngẫu nhiên | **28 / 28** (cả 6 hạt) — không mất loại note, ngôn ngữ, Hán Việt, chế độ trò chơi, khoá lạ của bản sau |
| `anki/e2e_132b.js` (Anki thật) — đổi ngôn ngữ 40 lần xen mở mọi bảng rồi đóng mở lại vườn: **61 mục dữ liệu (collection + user_files) không đổi một byte**; Album đầy đủ (67 + 42 + 16 + 15 + 28 ô) ở 5 ngôn ngữ × 2 cỡ cửa sổ: không chữ tràn ô, không kana; không lỗi JS; đổi ngôn ngữ giữa lúc chơi Đuổi quạ; deck cấu hình ở bản cũ; Lịch hoa; màn chào Giáng sinh; deck cha nhiều ngôn ngữ | **20 / 20** |
| `anki/run_capnhat.sh` 1.31.3 → 1.32.1 — thêm: bản cũ có deck tiếng Trung đã lưu Cấu hình trường + chế độ Đuổi quạ | **19 / 19** — deck nhận lại là tiếng Trung, Cấu hình trường trong collection không đổi |
| `anki/e2e_132.js` | **39 / 39** |

Hai lần "đỏ" trong lúc viết test là kỳ vọng của test chưa đúng, không phải lỗi add-on: (a) máy cũ cấu hình lại loại
Chữ Hán thành Từ vựng → cấu hình cũ (gồm Hán Việt) được thay — đúng ý người dùng ở máy cũ; (b) máy cũ đổi deck tiếng Hàn
sang Tiếng Anh rồi về "Ngôn ngữ khác" → 1.32 hiểu là tiếng Hàn (ở bản cũ "Ngôn ngữ khác" là lựa chọn duy nhất cho tiếng Hàn).

### Bộ đầy đủ + kịch bản cũ

- `tests/run_all.sh` (có `test_132`, `test_132b`): **TẤT CẢ OK**.
- Kịch bản Anki thật cũ: `e2e_117` 53 / 55, `e2e_130` 75 / 76 — 3 kiểm tra bố cục (độ rộng tab Nhà 110 / 128, chiều cao ô Ví /
  nút Thoát, chip sinh hoạt "Uống sữa sau khi tắm" bị "…") **trượt y hệt trên mã 1.31.5 gốc** ở máy test này: máy test không
  có phông DotGothic16 / Noto CJK nên chữ rộng hơn (đã ghi ở báo cáo 1.31.4). Không do 1.32; chip bị cắt vẫn hiện đủ tên khi
  rê chuột.
