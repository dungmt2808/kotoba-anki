# Báo cáo kiểm thử 1.33.0 — báo tiếng Trung / tiếng Hàn

Người dùng (sau khi xem ảnh phác `docs/ke_hoach_1_33/`): "Báo Vườn Rau nghe không hay, đặt những tên hay hơn được không.
với lại tớ thấy giao diện ổn rồi. làm tiếp, sau khi làm thì test thiệt kỹ nha". Số báo / báo mặc định theo quyết định
người dùng chốt 17/11 (PHAT_TRIEN.md mục 7, 10.0c). Chi tiết: PHAT_TRIEN.md mục 2.6z12. **Chi tiết Claude chọn.**

## 1. Tên báo — chờ bạn chọn

Đang dùng (Claude đề xuất, thay "Báo Vườn Rau"):

| Báo | Tên đang dùng | Nghĩa | Phương án khác |
|---|---|---|---|
| Tiếng Trung | **词田晨报** | Báo sáng Ruộng Chữ (词 = chữ / từ, 田 = ruộng — như ことば畑) | 言叶村报 (Báo Làng Kotoba) · 小村晨报 (Báo sáng Làng Nhỏ) |
| Tiếng Hàn | **말밭 신문** | Báo Ruộng Lời (말 = lời / chữ, 밭 = ruộng) | 코토바 마을 소식 (Tin Làng Kotoba) · 아침 마을 신문 (Báo sáng của làng) |

Đổi tên chỉ cần sửa 3 chỗ: `ai_zh.MASTHEAD`, `ai_ko.MASTHEAD`, `web/paper.js` `MAST` (tên Gemini đọc trong lời nhắc cũng tự đổi).

## 2. Đã làm

| Phần | Nội dung |
|---|---|
| Báo muốn nhận | 5 ô (Nhật / Anh / Trung / Hàn / Chỉ tiếng Việt), tối đa 2 báo học tiếng — đủ 2 thì ô còn lại mờ; dòng gợi ý "Bạn cũng học tiếng X — thêm báo tiếng X?" + nút Không |
| Báo mặc định | Người chưa từng dùng báo: theo deck đang chọn → tiếng ôn nhiều nhất 30 ngày → nhiều thẻ nhất → báo tiếng Việt; dán khoá lần đầu thì giữ lựa chọn lúc đó |
| Báo tiếng Trung 词田晨报 | HSK 1–6, giản / phồn thể theo deck; pinyin trên từng chữ (máy soát từng âm tiết với bảng cách đọc 15.437 chữ), Ẩn / Hiện pinyin, tra từ có pinyin + nghĩa + âm Hán Việt + cây trong vườn |
| Báo tiếng Hàn 말밭 신문 | TOPIK 1–6; tra từ nhận cả từ có tiểu từ / đuôi (축제가 → 축제, 무서워서 → 무섭다) |
| Chép chính tả | Tiếng Trung chấm từng chữ, tiếng Hàn chấm theo cụm (khác chỗ cách vẫn đúng); chưa đúng → "Gần đúng — x/y" + tô xanh / hồng chỗ sai |
| Giọng đọc | Gemini TTS hoặc giọng máy zh_CN / ko_KR |
| Lưu trữ | Khoá collection mới chỉ `kotoba_batake_paper_zh` / `_ko`; config thêm `gemini_level_zh` / `_ko` |

## 3. Lỗi tìm ra trong lúc test (đã sửa)

Kịch bản Anki thật `e2e_133.js`:
1. Khối báo ở tab Nguồn báo chỉ ghi "Báo" (bảng tên thiếu tiếng Trung / Hàn).
2. **"Bắt đầu viết" chỉ viết báo đầu tiên** khi tắt Tự viết — báo thứ hai phải đợi (cách cũ từ 1.19.1, với 2 báo dễ thấy hơn). Nay viết lần lượt mọi báo đã chọn; báo trước lỗi thì dừng (khỏi tốn lượt).
3. Câu chép trong số báo tiếng Trung / Hàn báo "chưa có giọng đọc" dù máy có giọng zh_CN / ko_KR.
4. Lượt **Chép hằng ngày** luôn hỏi "máy có giọng tiếng Nhật không" cho mọi deck → deck Trung / Hàn / Anh có giọng của tiếng đó vẫn bị bỏ.
5. Từ có gạch chân hiện pinyin cả cụm trên cả từ ("jīn tiān" trên 今天) thay vì từng chữ như ảnh phác.
6. Kệ báo ghi số báo Trung / Hàn kiểu báo Nhật (第N号).

Soát mã / kịch bản cũ:
7. Biến `KANA_RE` bị đặt trùng tên trong `story_core` → phép soát "cách đọc từ mới toàn kana" của **báo tiếng Nhật** yếu đi (lỗi do chính 1.33, bắt trước khi ra bản).
8. `e2e_120` (kịch bản cũ): người **đã dùng báo** nhưng config chưa có lựa chọn (máy từ bản ≤ 1.19.0) bị đổi sang "theo deck" — nay giữ như cũ.
9. Bản gốc truyện lấy từ kỳ báo khác tự viết (khi bản gốc tiếng Việt hỏng) mang sai ngôn ngữ (chữ Hán → "Nhật", Hangul → "Việt") → báo tiếng Việt có thể in nguyên văn kỳ tiếng Hàn.
10. Chấm chép theo vị trí: thiếu một chữ đầu câu là cả câu bị tô sai → so theo dãy chung dài nhất.
11. Dòng gợi ý chép tiếng Trung / Hàn còn câu của tiếng Anh ("don't = do not").

Gemini thật:
12. Người soát (Gemini) thấy pinyin đã đổi sang dấu thanh, tưởng sai quy tắc "ghi số" và sửa cả bài → bản gửi soát đổi lại về ghi số + nói rõ máy đã tách theo chữ. Ngày 2: không còn phàn nàn.
13. Báo Hàn tốn 3 lượt sửa vô ích: máy hết chỗ nối tra từ (tối đa 24) trước bài có từ mới, rồi tự báo "từ mới không có trong bài" → từ mới luôn được nối.
14. Lời nhắc báo Trung / Hàn ghi "HÔM NAY: Sunday, …" (khuôn của báo Anh) → thứ bằng tiếng Việt.

## 4. Kết quả

| Bộ | Kết quả |
|---|---|
| `core/test_133.py` (2 báo, 2.000 từ đối chiếu pinyin, tiếng Hàn nhận / không nhận nhầm, cả quy trình với Gemini giả = đúng 3 lượt mỗi báo, lời nhắc tiếng Anh giống hệt 1.31.5, hợp đồng dữ liệu, các chỗ sửa, 4 số báo Gemini thật) | **96 / 96** |
| `anki/e2e_133.js` — Anki 26.9.4 thật, Gemini giả chạy đúng đường đi của add-on (không gọi mạng) | **@E2E@** |
| `anki/run_capnhat.sh` cài đè **1.31.3 (đã phát hành) → 1.33.0** | **19 / 19** (không mất khoá / file / xu / nhật ký; chỉ thêm 2 mục mặc định mới của config) |
| Kịch bản Anki thật (mọi kịch bản cũ + `e2e_133`, mỗi kịch bản một hồ sơ mới) | **@UI@** |
| `tests/run_all.sh` (offline, Anki 26.9.4) | **@ALL@** |
| Gemini thật (khoá test) 2 ngày × 2 báo | xem mục 5 |

## 5. Gemini thật (khoá tài khoản test, 17/11)

Chạy đúng luồng add-on: bản gốc tiếng Việt chung → mỗi báo kể lại → viết số → máy kiểm → soát (`tests/gemini/run_job.py --lang zh|ko --master`, deck mẫu HSK 2 / TOPIK 2).

| Ngày | Báo | Lượt gọi | Ghi chú |
|---|---|---|---|
| 17/11 | Bản gốc (kỳ 1) | 3 (+1 lần máy chủ bận) | lập mạch đợt mới 6 kỳ + viết + biên tập (điểm 4–5) |
| 17/11 | Trung HSK 2 | 3 (+1 lần máy chủ bận) | 0 lỗi máy; người soát phàn nàn dấu thanh → sửa (mục 3.12) |
| 17/11 | Hàn TOPIK 2 | 6 (+1 lỗi) | 3 lượt sửa vô ích → sửa (mục 3.13) |
| 18/11 | Bản gốc (kỳ 2) | 3 | nối kỳ 1 |
| 18/11 | Trung HSK 2 | 4 | Gemini quên pinyin ở tiêu đề (có chữ nhiều cách đọc 落 / 和, máy không tự điền) → kể lại lần 2; soát chỉ tách câu dài cho hợp HSK 2 |
| 18/11 | Hàn TOPIK 2 | 3 (+8 lần thử model khác) | **Hydrogen hết hạn mức** của khoá test → tự chuyển model (Flash quá 240 giây / 503 → 3.8 Flash viết, Flash-Lite soát), vẫn ra số, 0 lỗi máy |

Nội dung: hai báo kể cùng một kỳ truyện (Lin mang hộp gỗ ra vườn, trưởng làng nhận ra chiếc hộp của người bạn cũ, móc câu "설마 이 상자를 보낸 사람이..."); tiếng Trung có biến điệu 一 (yí gè), thanh nhẹ (早上 zǎo shang); tiếng Hàn dùng kính ngữ với trưởng làng (오셨어요, 앉으셨어요); câu hỏi có đáp án trong bài, câu chép là câu trọn vẹn trong bài.

Ảnh (số báo Gemini thật mở trong Anki thật): `133_that_trung_1711.png`, `133_that_trung_truyen.png` (bấm 笑 → xiào · cười · TIẾU · cây trong vườn), `133_that_han_truyen.png` (낙엽 từ mới; 마시러 → 마시다, 오셨어요 → 오다 được gạch chân). Ảnh kịch bản: `133_nguon_bao_hai_bao.png`, `133_chep_trung.png`, `133_chep_han.png`.

## 6. Hạn chế đã biết

- Máy chỉ biết một âm tiết là **một cách đọc hợp lệ** của chữ, không biết có đúng văn cảnh không (地 dì / de, 得 dé / de / děi, 行 xíng / háng…) — dựa vào Gemini soát. **Nên nhờ người giỏi tiếng Trung / tiếng Hàn đọc vài số báo thật.**
- Báo phồn thể hiện bằng phông giản thể (cùng `lang="zh"`; chữ vẫn đúng, nét có thể theo kiểu Đại lục).
- Giọng máy zh_CN / ko_KR: máy test (Linux) không có, chỉ kiểm được đường đi (không nghe thật).

## 7. Nên xem trên máy thật

1. Mở báo (B) → Nguồn báo: Báo muốn nhận có 5 ô; tick 2 báo thì ô thứ ba mờ.
2. Tick Tiếng Trung (deck tiếng Trung) → Bắt đầu viết → đọc báo: pinyin trên từng chữ, nút Ẩn pinyin, bấm từ gạch chân.
3. Tab Chép chính tả của số báo: gõ thiếu một chữ → "Gần đúng" + chữ sai tô hồng.
4. Tên báo: chọn một tên ở mục 1 (hoặc đặt tên khác).
