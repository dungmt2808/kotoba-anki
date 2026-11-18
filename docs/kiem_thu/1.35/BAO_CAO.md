# Báo cáo 1.35.0 — tiếng Đức và tiếng Pháp như Anh / Trung / Nhật / Hàn (17/11/2026 đêm)

Người dùng: "gộp với master đi ạ. tớ nghĩ làm tiếng Đức và tiếng Pháp tương tự như Anh, Trung, Nhật, Hàn luôn á"
(trước đó: "bản trước release có người nhờ tớ thêm tiếng Đức"). 1.34.1 đã gộp master (PR #6); 1.35.0 làm trên nhánh
`claude/awesome-carson-o6xyi6`, **chưa gộp master**.

**Mọi chi tiết Claude chọn, người dùng chưa xem** (không có ảnh phác — làm theo đúng cách tiếng Trung / Hàn đã được duyệt):
tên báo, câu chữ tiếng Đức / Pháp trong vườn, danh sách ngữ pháp A1–C1.

## 1. Đã làm

| Phần | Như tiếng nào | Chỗ sửa chính |
|---|---|---|
| Deck tiếng Đức / tiếng Pháp: ngôn ngữ riêng trong Cấu hình trường, tự nhận deck (der / die / das, ä ö ü ß · le / la / l', é è ç), giọng máy `de_DE` / `fr_FR` | tiếng Anh 1.17, Trung / Hàn 1.32 | `fields_core.py`, `eu_core.py` (mới), `garden_core.py`, `text_core.py`, `__init__.py` |
| Trò chơi: nhóm de / fr ở cả 5 trò; Đuổi quạ gõ chữ **không cần mạo từ, gõ không dấu cũng được** (ä = ae hoặc a, ß = ss, é = e, œ = oe) | tiếng Anh | `web/games.js` (`euFold`, `euAnswers`) |
| Ngôn ngữ trong vườn: ⚙ Tiếng Đức / Tiếng Pháp — StackChan nói, sinh hoạt, đồ nhặt, khách, tường / sàn, mùa, tên bảng, tên trò chơi, câu Chợ sáng, nhãn Lật cặp | Trung / Hàn 1.32 | `lang_core.py` (`EU`), `web/glang.js` |
| Báo **Der Wortgarten** (Đức) / **Le Jardin des Mots** (Pháp), A1–C1, kể lại "Một làng, một truyện", tra từ nhận dạng chia / số nhiều, chép chính tả gõ không dấu đúng | tiếng Anh 1.19, Trung / Hàn 1.33 | `ai_eu.py` (mới) + `ai_de.py` / `ai_fr.py`, `ai_core.py`, `story_core.py`, `paper_core.py`, `words_core.py`, `web/paper.js` |

Tên báo đổi ở `ai_eu.INFO[lang]["masthead"]` + `web/paper.js` `MAST` (2 chỗ). Gợi ý khác nếu người dùng muốn: Đức —
*Das Wortbeet*, *Kotoba-Dorfblatt*, *Der Gartenbote*; Pháp — *La Gazette du Jardin*, *L'Écho du Village*, *Le Potager des Mots*.

## 2. Giữ dữ liệu của bản đã phát hành

- **Cấu hình trường**: de / fr lưu ở **khoá mới `lang3` / `games_lang3`** trong `kotoba_batake_fields`, còn `lang` ghi
  "other" → bản 1.31.3 (đã phát hành) hiểu là "Ngôn ngữ khác". Không dùng `lang2` / `games_lang2` (của tiếng Trung / Hàn) vì
  bản 1.32–1.34 ghi lại hai khoá đó theo danh sách của nó → sẽ làm mất de / fr. `lang3` chỉ được dùng khi `lang` vẫn
  "other" và `lang2` không chọn gì cho loại note đó: máy khác còn bản 1.32–1.34 chọn lại tiếng Trung / Hàn / "Ngôn ngữ khác"
  thì lựa chọn đó thắng. Thử bằng mã thật 1.31.3 + 1.34.1 thay nhau lưu với 1.35 (mục 3).
- **Báo**: khoá collection mới **`kotoba_batake_paper_de` / `_fr`** (tiến độ đọc / câu hỏi / chép của từng báo), số báo ở
  `user_files/bao_gemini_de` / `_fr`. Không đổi khoá nào khác. `gemini_level_de` / `_fr` **không thêm vào config.json**
  (chỉ ghi khi người dùng đổi trình độ; chưa đổi → A2), config.json giống hệt 1.34.1.
- Đổi trình độ báo Đức / Pháp không đổi trình độ báo tiếng Anh (cùng A1–C1): lệnh `ai:set` kèm `lang`.

## 3. Kiểm thử

### 3.1 Kịch bản mới

- `tests/core/test_135.py` (98 kiểm tra) + `tests/core/test_135.js` (22):
  - **mã thật 1.31.3 + 1.34.1 thay nhau lưu Cấu hình trường 3.000 lượt với 1.35** (đổi hạt bằng `KB_SEED`; đã chạy 8 hạt) —
    ngôn ngữ từng loại note + chế độ trò chơi đúng sau mỗi lượt; ~1.200 lượt bản cũ lưu trong lúc đang có loại note Đức / Pháp;
  - `eu_core` nhận 33 dạng (Blätter → Blatt, gegangen → gehen, vorbereitet → vorbereiten, angerufen → anrufen, hingesetzt,
    Häuser, isst, spricht · feuilles, belles → beau, pris → prendre, allé, yeux → l'œil, assis → s'asseoir, chevaux,
    heureuse, blanche, finissent…) + 14 ca không nhận nhầm (Rathaus ≠ Haus, Gasthaus ≠ Gast, chaton ≠ chat, porte ≠ le port,
    printemps ≠ temps…);
  - số báo mẫu (`tests/fixtures/bao_135.json`, Claude viết tay theo cùng cốt truyện của `bao_133.json`) qua sửa máy + kiểm
    → 0 lỗi; số báo hỏng (chữ Hán, kana, Hangul, chữ Việt, từ mới không có trong bài, đáp án sai chỗ, câu chép không có trong
    bài, Markdown) → đúng lỗi / máy tự sửa;
  - cả quy trình `ai_core.Job` + kể lại với Gemini giả: đúng 3 lượt mỗi báo, trình đọc báo, tra từ, chép chính tả gõ không
    dấu đúng, sai một từ vẫn sai;
  - lời nhắc không sót chữ của báo tiếng Anh, tên nhân vật đúng cột tiếng Đức / Pháp;
  - bảng `lang_core.EU` đủ mục như bảng gốc, chính tả = bảng hunspell de_DE / fr đóng băng (`tests/fixtures/chu_135_ref.json`);
    39 từ từ điển không có (từ ghép, thán từ, từ mượn tiếng Nhật, tên loài) — mỗi từ có lý do;
  - JS: Đuổi quạ 27 cách gõ đúng + 10 cách gõ sai + 5.000 từ ngẫu nhiên, `glang.js`, ngày báo;
  - hợp đồng dữ liệu (so với mã 1.31.3 và 1.34.1).
- `tests/anki/e2e_135.js` (Anki thật) — xem mục 3.3.

### 3.2 Bộ test có sẵn

- `tests/run_all.sh` trên **gói đã đóng** (`ANKI_PY` = aqt 26.9.4, `PY39` = aqt 23.10.1): **67 bộ, TẤT CẢ OK** (`test_135`
  100/100, `test_132c` 66/66; sau khi chạy lại `node site/tools/xuat_hinh.js` cho bản 1.35.0).
- Test cũ đổi theo 1.35 (ý nghĩa không đổi): 2 khoá báo mới được trừ ra khi so khoá collection với bản cũ (`test_1191`,
  `test_1322`, `test_133`, `test_1331`, `test_1332`); "ngôn ngữ lạ" thử bằng "es" thay "fr"; Báo muốn nhận 7 ô thay 5
  (`e2e_119`, `e2e_1251`, `e2e_133`, `e2e_1332`); tab Nguồn báo ≤ 18 chỗ bấm (thêm 2 ô, `e2e_1331`); `test_132.js` soát cả
  de / fr không còn chữ Nhật.

### 3.3 Anki thật (gói đã đóng)

| Kịch bản | Kết quả |
|---|---|
| `e2e_135` (mới) — Anki 26.9.4 / Anki 23.10.1 | **60/60 · 60/60** |
| `e2e_135_ngonngu` (mới: quét ~800 câu chữ, deck Nhật / Đức / Pháp × 5 chế độ Ngôn ngữ trong vườn) | **5/5** |
| `run_capnhat.sh` 1.31.3 (đã phát hành) → 1.35.0 (cài đè bằng trình quản lý add-on) | **19/19** |
| `run_habanh.sh` 1.35.0 → 1.31.3 → 1.35.0 (thêm deck tiếng Đức: bản cũ ghi đè vẫn giữ `lang3` / `games_lang3`, lên lại vẫn là Tiếng Đức) | **26/26** |
| `e2e_133` 77, `e2e_119` 55, `e2e_1251` 49, `e2e_1331` 43, `e2e_1332` 36, `e2e_132c` 23, `e2e_132b` 20, `e2e_134` 85, `e2e_1333_ngonngu` 5, `e2e_117` 55, `e2e_132` 39, `e2e_1322` 40 | **đạt hết** |

Lần "đỏ" trong lúc chạy: (a) `e2e_1332` (đủ 2 báo → "2 ô mờ") và `e2e_132` ("6 mục" Ngôn ngữ trong vườn) đếm theo 1.34 → sửa
thành 4 ô / 8 mục; (b) `e2e_1322` một lần 39/40 (Undo ở cửa sổ chính sau khi sửa thẻ, lúc máy chạy 3 Anki cùng lúc) — chạy lại
2 lần đều 40/40, phần này 1.35 không đụng; (c) `e2e_135_ngonngu` lần đầu báo "Génial !", "À bientôt !" là câu chỉ có tiếng
Việt — bộ lọc của test coi é / à / ô là chữ Việt → sửa test (chỉ tính chữ riêng của tiếng Việt).

### 3.4 Gemini thật (khoá tài khoản thử, 17/11)

`tests/gemini/run_job.py --lang de|fr --level A2 --master` (deck mẫu `tests/fixtures/de_deck_a2.json` / `fr_deck_a2.json`, 77 từ):

| Báo | Kết quả |
|---|---|
| Bản gốc chung (kỳ 1) | ra kỳ 1 + 2 tin làng; máy chủ Gemini rất bận lúc chạy (503, ngắt luồng, Hydrogen / flash-latest quá 240 giây) → tự đổi model tới 3.5 Flash-Lite. Phần này 1.35 không đổi. |
| Der Wortgarten (Đức, A2) | **ra số 1**: kể lại đạt ngay lần đầu, viết số máy kiểm **0 lỗi**, soát lần 2 không thấy lỗi; máy tự chọn lại câu chép, bỏ id mẫu câu sai. Nối tra từ đúng: bringt → bringen, lacht → lachen, schreibt → schreiben, warmes → warm, Blätter… |
| Le Jardin des Mots (Pháp, A2) | **ra số 1** (20 lượt, dùng lại bản gốc): kể lại đạt lần đầu, viết số bằng Hydrogen máy kiểm **0 lỗi**, soát lần 2 đổi 3 từ khó hơn A2 (nuageux, facteur, tiroir), máy thấy 1 lỗi sau soát → Gemini sửa 1 lần → xong. Nối tra từ: levées → se lever, chaudes → chaud, d'automne → l'automne, acheté → acheter, voisines → la voisine; 3 câu hỏi có đáp án trong bài, 3 câu chép nguyên văn. |

Hai số báo đọc tự nhiên, đúng trình độ A2, cùng kể kỳ 1 của bản gốc (Lin chào nhầm "Entschuldigung" / "Pardon !" thay "Danke"
/ "Merci !", StackChan đội đĩa, chiếc ngăn kéo khoá dưới bàn trà). Claude đọc thấy ổn; vẫn nên nhờ người giỏi tiếng Đức / Pháp
đọc vài số thật.

Tìm thấy nhờ Gemini thật: Gemini khai **"die Blätter" là từ mới** trong khi deck có "das Blatt, ¨-er" → tra từ trỏ về từ
mới thay vì từ của deck → **sửa**: máy bỏ khai báo từ mới chỉ là dạng biến đổi của từ trong deck (lỗi 6 ở mục 4).

## 4. Lỗi tìm được trong lúc test (đã sửa)

| # | Lỗi | Sửa |
|---|---|---|
| 1 | "le port" (bến cảng) nhận nhầm chữ "porte" (cửa / mang) — luật tính từ giống cái áp cho cả danh từ | từ của deck có mạo từ là danh từ → chỉ thêm số nhiều |
| 2 | "s'asseoir" / "sich freuen" không nhận "assis" / "freuen"; "beau" không nhận "belles", "l'œil" không nhận "yeux" | bỏ đại từ phản thân khi so, bảng tính từ / danh từ bất quy tắc tiếng Pháp |
| 3 | Động từ tách có tiền tố hin / her / heim… (hinsetzen) không nhận Partizip "hingesetzt" | thêm tiền tố tách |
| 4 | Bản gửi Gemini sửa / soát còn dấu tra từ của máy ở câu hỏi / lựa chọn | `ai_eu.plain_issue` bỏ cả ở câu hỏi |
| 5 | Lời nhắc soát viết "Tiếng đức" / "Tiếng pháp" (`capitalize()` hạ chữ) | viết hoa chữ đầu, giữ phần còn lại |
| 6 | (Gemini thật) từ mới "die Blätter" trong khi deck có "das Blatt, ¨-er" → tra từ không về từ của deck | bỏ khai báo từ mới chỉ là dạng biến đổi của từ trong deck |
| 7 | (Anki thật) tra "Blätter" ở báo ra đúng "das Blatt" nhưng không hiện trạng thái cây trong vườn (cây ghi "das Blatt, ¨-er") | trang báo so cả dạng đã bỏ số nhiều / giống khi tìm cây |
| 8 | (quét chữ trong Anki thật) khách Chợ sáng tiếng Pháp nói "Un « apprendre », s'il vous plaît !" — "Un" sai với động từ / danh từ giống cái | mẫu câu "Je voudrais « %s », s'il vous plaît !" |

## 5. Giới hạn đã biết

- Động từ tách **đứng rời** ("Ich rufe dich morgen an" — anrufen) không gạch chân để tra (nối "rufe" về "anrufen" dễ nối
  nhầm setzen / aufsetzen…). Viết liền (anrufen, angerufen, anzurufen) thì nhận.
- Từ ghép tiếng Đức chỉ nhận khi deck có đúng từ ghép đó (Rathaus không nối về Haus — cố ý).
- Câu chữ tiếng Đức / Pháp của Ngôn ngữ trong vườn do Claude viết, đã soát chính tả bằng hunspell nhưng **nên nhờ người giỏi
  tiếng Đức / Pháp đọc lại** (`lang_core.py`, khối `EU`), cùng vài số báo Gemini thật.

## 6. Việc người dùng cần làm

1. Chọn tên báo (giữ Der Wortgarten / Le Jardin des Mots hay đổi).
2. Xem trên máy thật: deck tiếng Đức / Pháp → cây, ⚙ Ngôn ngữ trong vườn → Tiếng Đức / Tiếng Pháp, Đuổi quạ, tab Nguồn báo
   (7 ô), một số báo tiếng Đức / Pháp.
3. Gộp master khi thấy ổn (chưa gộp).
