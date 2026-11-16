# Kế hoạch 1.32 — "Ngôn ngữ trong vườn" + deck tiếng Trung / tiếng Hàn (ảnh phác 16/11)

> **Đã duyệt và làm ở 1.32.0** (người dùng đổi tên thành "Ngôn ngữ trong vườn", bỏ câu giải thích dưới ô chọn). Không làm: pinyin nằm trên từng chữ (ảnh 09) — phiên chat bị chặn mỗi lần làm phần này; cây tiếng Trung hiện pinyin của deck ở dòng dưới chữ. Chữ 3 tiếng ở `kotoba_batake/lang_core.py`. Kết quả: `docs/kiem_thu/1.32/BAO_CAO.md`.

Người dùng (16/11): "làm 1 lần cho 3 tiếng Trung, Hàn, Anh luôn đi. sau đó kiểm tra lại thật kỹ nha. thêm các bộ test nữa.
phác thảo trước đi". Ảnh vẽ đè lên vườn thật của 1.31.5 (`tests/anki/mock_132.js`), **chưa phải mã thật**. Chữ tiếng
Anh / Trung / Hàn: bản nháp `kotoba_batake/lang_core.py` (Claude soạn — câu tiếng Trung / Hàn nên nhờ người giỏi tiếng đó đọc lại).

## A. Tiếng trong vườn

| Ảnh | Nội dung |
|---|---|
| `132_01_cai_dat.png` | ⚙ → **Tiếng trong vườn**: Tự theo deck (mặc định) · Tiếng Nhật · Tiếng Anh · Tiếng Trung · Tiếng Hàn · Chỉ tiếng Việt |
| `132_02_sinh_hoat_5_tieng.png` | Bấm StackChan đang đọc sách: 本を読む → read a book → 看书 kàn shū → 책을 읽다 chaegeul ikda → Đọc sách |
| `132_03_stackchan_noi.png` | StackChan nói: phần tiếng Nhật đổi theo tiếng đã chọn (tiếng Trung kèm pinyin nhỏ), phần tiếng Việt giữ nguyên |
| `132_04_so_sinh_hoat_trung.png` | Sổ sinh hoạt bằng tiếng Trung (chữ + pinyin + tên tiếng Việt) |
| `132_05_hop_suu_tam_han.png` | Hộp sưu tầm bằng tiếng Hàn (chữ + phiên âm + nghĩa) |
| `132_06_khach_anh.png` | Album khách bằng tiếng Anh (Chim sẻ sparrow, Mèo hoang stray cat…) |

Đổi theo tiếng đã chọn (≈ 240 mục mỗi tiếng): 67 sinh hoạt, 42 đồ nhặt, 16 khách, 21 tường / sàn, 14 tên mùa,
~70 câu StackChan nói (khi ôn, thời tiết, buổi, mùa, lễ, mua đồ…), 7 chữ trang trí ở tiêu đề bảng (おうち → Home / 我的家 / 우리 집).

- **Tự theo deck**: tiếng của phần lớn cây đang mọc trong vườn (deck tiếng Trung → tiếng Trung). Deck "Ngôn ngữ khác"
  (Pháp, Đức…) → giữ tiếng Nhật như hiện nay.
- **Chỉ tiếng Việt**: bỏ hẳn phần tiếng nước ngoài; câu chỉ có tiếng Nhật (ドンマイ！) có câu tiếng Việt riêng (Không sao đâu!).
- **Trò chơi** theo tiếng của deck đang chơi (khách ở Chợ sáng hỏi "请给我「苹果」！" với deck tiếng Trung, tên trò 赶乌鸦…).
- **Không đổi**: giao diện vẫn tiếng Việt; thẻ, báo, chép chính tả; chữ vẽ trong tranh pixel (学, ゆ, ことば畑, 畑新聞) và
  bối cảnh làng Nhật (omamori, kotatsu… dịch nghĩa, không đổi đồ vật).
- Lưu ở cấu hình add-on trên máy này (như các mục ⚙ khác), **không ghi gì vào collection**. Sổ sinh hoạt / Hộp sưu tầm /
  Album khách lưu theo mã như cũ → đổi tiếng qua lại không mất gì, bản 1.31.x đọc vẫn đúng.

## B. Deck tiếng Trung / tiếng Hàn (bước 1, như tiếng Anh ở 1.17)

| Ảnh | Nội dung |
|---|---|
| `132_07_cau_hinh_trung.png` | Cấu hình trường: ngôn ngữ **Tiếng Trung** (tự nhận), vai trò Chữ Hán / **Pinyin** / Nghĩa / **Hán Việt (nếu có)**; loại "Chữ Hán" cho deck một chữ |
| `132_08_cau_hinh_han.png` | **Tiếng Hàn**: Hangul / Phiên âm (romaja) / Nghĩa / Hán Việt nếu deck có Hanja |
| `132_09_cay_trung_han.png` | Bấm cây: pinyin nằm **trên chữ như furigana** (学 xué 生 sheng), Hán Việt cạnh nghĩa; tiếng Hàn có phiên âm |
| `132_10_duoi_qua_pinyin.png` | Đuổi quạ: Nghĩa → **gõ pinyin** — `xia4yu3`, `xiayu` hay `xià yǔ` đều được; tiếng Hàn gõ bằng bộ gõ Hàn |

- Pinyin deck ghi số (`ni3 hao3`) tự đổi thành dấu (`nǐ hǎo`); deck ghi kiểu Anki `中[zhōng]文[wén]` đọc được sẵn.
  Pinyin không tách được đúng số chữ → hiện một dòng dưới chữ (như tiếng Anh).
- Nghe tìm cây / chép chính tả: không có audio thì đọc bằng **giọng tiếng Trung / tiếng Hàn của máy** (nếu máy có).
- 5 trò chơi: Chợ sáng, Lật cặp (thêm cặp Chữ ↔ Pinyin, Chữ ↔ Hán Việt), Đuổi quạ, Nghe tìm cây, Điền vào câu (deck có câu ví dụ).
- **Báo tiếng Trung / tiếng Hàn chưa làm** (bước 2 — đụng quyết định "tối đa 2 báo", hỏi sau).

## Giữ dữ liệu khi cập nhật (đã phát hành 1.31.3)

- Ngôn ngữ mới của loại note **không ghi đè** mục `lang` cũ: `lang[mid]` vẫn là "other" (bản 1.31.x hiểu là "Ngôn ngữ
  khác", chạy như hôm nay), "zh" / "ko" nằm ở khoá cấp trên mới `lang2` (bản cũ giữ nguyên khoá lạ — `keep_foreign`).
  Máy còn 1.31.x lưu Cấu hình trường không xoá lựa chọn tiếng Trung / Hàn. Vai trò mới (Hán Việt cho loại Từ vựng) cũng
  ở khoá riêng, vì bản cũ làm sạch `models[mid]` theo danh sách vai trò của nó và sẽ bỏ vai trò lạ.
- Không thêm khoá collection nào khác. Lựa chọn Tiếng trong vườn ở config của add-on.

## Test sẽ thêm

- `core/test_132.py`: đủ chữ cho mọi mục ở cả 3 tiếng (thêm việc / đồ mới mà quên dịch → test đỏ), mọi câu StackChan
  trong mã JS đều có bản dịch, pinyin đúng dạng (âm tiết hợp lệ, số chữ Hán = số âm tiết ở sinh hoạt / đồ nhặt), phiên âm
  Hàn khớp bộ chuyển Hangul → romaja viết riêng cho test; đổi số → dấu thanh (`lü4` → `lǜ`, `nu:3`, thanh nhẹ); đoán ngôn
  ngữ (Trung giản / phồn, Hàn, Nhật toàn kanji, Hán Việt); hợp đồng dữ liệu với 1.31.3 / 1.31.5 (`lang2`, bản cũ ghi đè).
- `core/test_132.js` (Chromium): mọi chỗ hiện chữ đổi đúng tiếng, "Chỉ tiếng Việt" không còn chữ Nhật nào trên trang.
- `anki/e2e_132.js` (Anki thật): đổi tiếng ở ⚙ → bong bóng / thẻ sinh hoạt / Sổ / Hộp / Album đổi ngay; deck tiếng Trung
  + tiếng Hàn: Cấu hình trường tự nhận, cây có pinyin, 5 trò chơi chạy, Đuổi quạ gõ pinyin; tắt / mở lại vẫn giữ.
- `anki/run_capnhat.sh` cài đè 1.31.3 → 1.32 (17 kiểm tra cũ + lựa chọn mới); `test_ban_cu.py` thêm 1.31.5; bản cũ đọc
  dữ liệu 1.32 (có `lang2`) không lỗi, không mất gì.
