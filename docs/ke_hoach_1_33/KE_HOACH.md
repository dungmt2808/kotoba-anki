# Kế hoạch báo tiếng Trung / tiếng Hàn (bản riêng sau 1.32.2, số bản dự kiến 1.33) — ảnh phác, chờ người dùng duyệt

Người dùng (phiên sau 17/11): "Báo tiếng Trung / tiếng Hàn: bản riêng sau đó, theo quyết định trên, cũng có ảnh phác trước".
Quyết định đã chốt 17/11 (PHAT_TRIEN.md mục 7 + 10.0c): **tối đa 2 báo** trong Nhật / Anh / Trung / Hàn (tiếng Việt vẫn đi
một mình); **mặc định 1 báo** theo deck đang chọn → deck ngôn ngữ trong tài khoản (≥ 2 ngôn ngữ: ôn nhiều nhất 30 ngày, chưa
ôn thì nhiều thẻ nhất; tab Nguồn báo gợi ý thêm báo thứ hai) → không có thì báo tiếng Việt; chỉ áp cho người chưa từng chọn
báo, không tự đổi theo deck.

Ảnh vẽ đè lên add-on 1.32.1 thật (`tests/anki/mock_133.js` + `mock_133_ghep.py`): số báo mẫu (`tests/anki/mock_133_bao.py`,
chữ Claude soạn — kể lại kỳ 2 "Lời kể lúc bình minh" ở mức HSK 2 / TOPIK 2, pinyin sinh bằng pypinyin) mở bằng **trình đọc
báo thật**, chỉ đổi đầu báo / ngày / nút bằng DOM. **Chưa phải mã thật. Mọi chi tiết dưới đây là Claude chọn.**

| Ảnh | Nội dung |
|---|---|
| `133_00_mac_dinh.png` | Bảng báo mặc định cho người chưa từng chọn báo (đúng quyết định 17/11) |
| `133_01_nguon_bao.png` | Tab Nguồn báo: "Báo muốn nhận" thêm **Tiếng Trung / Tiếng Hàn**, ghi "tối đa 2 báo"; đang xem deck tiếng Trung → tick sẵn Tiếng Trung; dòng gợi ý "Bạn cũng học tiếng Hàn — thêm báo tiếng Hàn? [Thêm] [Không]"; khối Báo tiếng Trung trình độ **HSK 1–6** (tiếng Hàn **TOPIK 1–6**), Lấy từ như báo Nhật / Anh |
| `133_02_bao_trung.png` | **菜园日报** (Báo Vườn rau): pinyin nằm trên từng chữ, nút **Ẩn pinyin**; bấm từ → pinyin + nghĩa + **Hán Việt** + đã học ở deck nào |
| `133_03_bao_han.png` | **텃밭 신문** (Báo Mảnh vườn): không phiên âm trên chữ; bấm từ có tiểu từ / đuôi dính → **từ gốc** (무서워서 → 무섭다) + phiên âm + nghĩa |
| `133_04_chep_trung.png` | Chép chính tả tiếng Trung (听写): gõ bằng bộ gõ, **chấm từng chữ**, gõ nhầm chữ cùng âm thì nói rõ |
| `133_05_chep_han.png` | Chép chính tả tiếng Hàn (받아쓰기): **chấm theo cụm** (chỗ cách), chỉ chỗ khác |

## Cách làm (dự kiến)

- **Một truyện**: báo Trung / Hàn là bước "kể lại" bản gốc tiếng Việt như báo Nhật / Anh (1.25.2) — **không thêm lượt gọi**
  so với hôm nay khi người dùng vẫn chọn tối đa 2 báo (mỗi báo tốn số lượt như báo tiếng Anh; quy tắc 1.31.5: sáng tác
  Hydrogen trước, soát Flash-Lite trước). Chạy lại `tests/core/test_1315.py` (đếm lượt) + Gemini thật nhiều ngày bằng khoá test.
- **Tiếng Trung**: Gemini ghi chữ + pinyin bằng số cho từng từ; **máy** soát (âm tiết hợp lệ, mỗi chữ một âm tiết, từ của deck
  khớp pinyin của deck — dùng lại `zh_core` của 1.32.2) rồi đặt dấu thanh; nối tra từ theo từ của deck (dò từ dài nhất, vì
  không có dấu cách) + từ mới Gemini đánh dấu. Giản / phồn thể theo deck (`fields_core` đã nhận ra). Thà không có báo còn
  hơn báo lỗi: soát hỏng thì không lưu (như báo Nhật).
- **Tiếng Hàn**: Gemini viết chữ trơn + danh sách (cụm → từ gốc) cho từ của deck / từ mới; **máy** chỉ nhận cặp khi cụm bắt
  đầu bằng gốc từ (hoặc theo luật bất quy tắc đã biết, vd. ㅂ → 워) + phần còn lại là tiểu từ / đuôi trong danh sách.
- **Chép chính tả**: câu có giọng đọc (Gemini TTS / giọng máy zh_CN, ko_KR); tiếng Trung chấm theo chữ (dấu câu không tính),
  tiếng Hàn theo cụm; xu như chép tiếng Nhật / Anh.
- **Dữ liệu** (đã phát hành 1.31.3 — giữ dữ liệu bản cũ): thư mục mới `user_files/bao_gemini_zh/`, `bao_gemini_ko/` (như
  `bao_gemini_en/`); trạng thái đọc ở khoá collection mới `kotoba_batake_paper_zh` / `_ko` (qua `backup_core.commit_config`,
  như `_paper_en`); trình độ `gemini_level_zh` / `_ko` ở config máy. `gemini_langs` thêm "zh" / "ko" — bản cũ (`clean_langs`
  chỉ giữ ja / en / vi) đọc vẫn không lỗi.
- **"Người chưa từng chọn báo"**: từ 1.19.1 add-on tự ghi `gemini_langs` lúc mở hồ sơ, nên không biết ai đã tự chọn. Claude đề
  xuất: coi là **chưa chọn** khi máy **chưa có khoá Gemini và chưa có số báo nào** (báo chưa từng chạy → đổi mặc định không làm
  mất gì); từ bản này tick ở "Báo muốn nhận" thì ghi thêm cờ `gemini_langs_chosen`. Người đang đọc báo giữ nguyên.

## Test sẽ thêm

- Core: mặc định báo (6 trường hợp của bảng + người đang đọc báo giữ nguyên + cờ đã chọn), `clean_langs` tối đa 2, soát pinyin
  (âm tiết, số chữ, khớp deck, đổi số → dấu), tách tiểu từ / đuôi Hàn, chấm chép chính tả (chữ / cụm, dấu câu), đếm lượt gọi.
- Gemini thật nhiều ngày (khoá test) cho HSK 2 / TOPIK 2; soát chữ bằng công cụ độc lập (pypinyin, bộ chuyển Hangul như 1.32).
- Anki thật: e2e đọc báo / tra từ / Ẩn pinyin / chép; `run_capnhat.sh` cài đè 1.31.3 → bản mới (người đang đọc báo Nhật giữ
  nguyên); bản cũ đọc dữ liệu mới không lỗi.
- Câu tiếng Trung / Hàn nên nhờ người giỏi tiếng đó đọc lại (như `lang_core.py`).
