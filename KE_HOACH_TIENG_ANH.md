# Kế hoạch: hỗ trợ deck tiếng Anh (dự kiến bản 1.17)

> **Trạng thái: LÀM DỞ — bản 1.17.0 đã xong bước 1–5, 7 (và một phần 8); còn bước 6 (báo tiếng Anh).** Viết lúc add-on ở bản 1.16.0 (03/11/2026), sau khi đọc code và chạy thử. Xem mục 7 "Tiến độ" ở cuối file.
> **Làm xong toàn bộ thì xoá file này**, dòng trỏ tới nó ở `README.md` mục 0 và dòng `!/KE_HOACH_TIENG_ANH.md` trong `.gitignore`. Ghi tóm tắt vào mục 11 (lịch sử) của
> `README.md` và của README trong gói. Làm dở thì cập nhật mục "Tiến độ" ở cuối file rồi mới commit.

Người dùng chọn **ưu tiên tiếng Anh trước**. Chế độ "Môn học" cho sinh viên (thẻ hỏi–đáp dài) để sau, **không** nằm trong kế hoạch này.

---

## 0. Mục tiêu và luật chung

1. Mỗi **loại note** có một ngôn ngữ: `ja` (tiếng Nhật, mặc định — giữ y như cũ), `en` (tiếng Anh, mới), hoặc `other:<mã>` (ngôn ngữ khác, vd. `other:ko`, `other:zh`, `other:?`).
2. Hỗ trợ theo ngôn ngữ:

   | Phần | `ja` | `en` | `other` |
   |---|---|---|---|
   | Vườn, ôn trong vườn, xu, nhà, thú, nhiệm vụ | như cũ | có | có |
   | Chợ sáng, Lật cặp | như cũ | có | có (chung, không đặc thù ngôn ngữ) |
   | Nghe tìm cây | như cũ | có (audio deck, không có thì giọng đọc tiếng Anh) | chỉ khi deck có audio |
   | Đuổi quạ | như cũ (romaji → kana) | **có, kiểu gõ chính tả** | ẩn, ghi "chưa hỗ trợ ngôn ngữ này" |
   | Điền vào câu | như cũ | **có, nhận dạng biến đổi từ tiếng Anh** | khớp chuỗi chính xác (như hiện tại) |
   | Chép chính tả | như cũ | **có, chấm theo từ** | chỉ khi deck có audio câu ví dụ, chấm chung (bỏ dấu câu, hoa thường) |
   | Báo 畑新聞 | như cũ (Gemini + kotoba_daily) | **có, chỉ Gemini** | **bỏ qua**: tab Báo ghi "Báo chưa hỗ trợ tiếng X — hiện có tiếng Nhật và tiếng Anh, có thể thêm sau". Không gọi Gemini, không hiện "Báo mới". |

3. **Người học tiếng Nhật không thấy gì thay đổi**, trừ phần sửa lỗi furigana ở Bước 1.
4. **Dữ liệu cũ giữ nguyên.** Bản ≤ 1.16 ở máy khác (đồng bộ AnkiWeb) **không được xoá** dữ liệu mới. Xem mục 3.
5. Thiết kế theo **bảng ngôn ngữ** (`LANGS` trong Python, bảng tương ứng trong JS) để sau này thêm tiếng Hàn / Trung chỉ là thêm một mục: tên, cách đoán, nhãn trường, chế độ trò chơi, bộ chấm, có báo hay không.

---

## 1. Cách làm việc (cho phiên chat mới)

- Mã nguồn add-on **không nằm rời trong repo**, chỉ có gói `kotoba_batake.ankiaddon` ở gốc repo.
  Giải nén: `tests/tools/unpack.sh` (mặc định ra `/tmp/kb_src/kotoba_batake`). Sửa ở đó.
  Đóng gói lại: `python3 tests/tools/pack.py <thư mục>` (tự tăng `mod`; nhớ sửa `human_version` trong `manifest.json`).
- Test: đọc `tests/README.md`.
  - Offline: `tests/run_all.sh <thư mục>` (`ANKI_PY=…` để chạy cả test cần gói anki; `OLD_ADDON=<bản cũ>` cho test tương thích).
  - Anki thật (offscreen + CDP): `tests/anki/run_ui.sh <thư mục> <thư mục ảnh>`. Cần venv `aqt==26.9.3`, Node ≥ 22.
  - Khi xong mỗi bước: chạy lại **toàn bộ** test cũ (e2e.js, e2e_tour.js, e2e_114.js, e2e_115.js, e2e_116.js) để chắc tiếng Nhật không hỏng.
- Quy tắc của dự án: `README.md` mục 0 ("Quy tắc vàng") và mục 12. Giao diện + chú thích mã bằng tiếng Việt.
- Thử báo Gemini thật: session cloud có proxy tới `generativelanguage.googleapis.com` (khoá dùng giá trị giả, proxy tự thay). **Không** ghi khoá thật vào file.

---

## 2. Hiện trạng (đọc ở bản 1.16) — những chỗ phải đụng

| File | Chỗ | Ghi chú |
|---|---|---|
| `fields_core.py` | `KINDS`, `ROLES` (nhãn kiểu Nhật: Furigana, Hán Việt), `GAME_MODES`, `guess_kind`, `FieldStore`, `clean_model`, `clean_store`, `keep_foreign` | Khoá collection `kotoba_batake_fields`. **`clean_model` dựng lại mỗi loại note chỉ với `kind`, `f`, `name`** → khoá lạ đặt trong `models[mid]` sẽ bị bản cũ xoá. Chỉ khoá lạ **cấp trên cùng** được `keep_foreign` giữ. |
| `garden_core.py` | `_clean` (cắt độ dài), `WORD_NAMES` / `READING_NAMES` / `MEANING_NAMES`, `plain_word`, `_FURI_RE`, `_CJK_GAP`, `furigana_tokens`, `_clean_example`, `note_details`, `cloze_candidates` (cắt okurigana kiểu Nhật), `make_cloze`, `build_garden` | Độ dài: từ 60 (ngữ pháp 80), nghĩa 80, cách đọc 60, Hán Việt 30, ghi chú 120, dịch ví dụ 160. |
| `web/games.js` | `readingsOf`, `kanaVariants`, `typedKana`, `normKana` (Đuổi quạ chỉ nhận kana), `poolFor` / `fits` / `modeList`, `labelOf`, chữ mô tả trò ("tiếng Nhật", "romaji"…), `showMenu` ("Ôn loại note") | Bảng chế độ trong JS phải khớp `fields_core.GAME_MODES`. |
| `paper_core.py` | `anki_to_markup` (câu ví dụ → cú pháp báo `[漢字|かんじ]`), `_accepted` / `matches` (chấm theo kana), `Voice` (giọng máy `ja_JP`), `daily_*` (chép chính tả hằng ngày) | |
| `ai_core.py` | `LEVELS` N5–N1, `check_jp`, `autofix`, `system_prompt` / `write_prompt` / `review_prompt` (viết tiếng Nhật), `scope_from_plants`, `Job`, `make_audio` | Thư mục báo Gemini: `user_files/bao_gemini/`. |
| `__init__.py` | `_ai_scope` (lấy cây của deck đang chọn), các lệnh `paper:*`, `dict:*`, `fields:*` | |
| `web/paper.js`, `web/fields.js` | giao diện báo (nút Ẩn furigana…), bảng Cấu hình trường | |

---

## 3. Lưu trữ và tương thích (quyết định trước khi code)

- **Ngôn ngữ của loại note**: khoá cấp trên cùng **`lang: {"<mid>": "ja" | "en" | "other:<mã>"}`** trong `kotoba_batake_fields`. Không đặt trong `models[mid]` (bản ≤ 1.16 xoá). Chưa có mục cho `mid` nào thì **tự đoán** mỗi lần (mục 4.2), người dùng chọn tay thì mới ghi.
- **Vai trò trường cho tiếng Anh dùng lại mã cũ** để bản cũ không xoá cấu hình: `word`, `reading` (= **phiên âm IPA**, chỉ đổi nhãn), `meaning`, `pos`, `example`, `ex_meaning`, `audio`, `ex_audio`. Không thêm mã vai trò mới. Nếu thật sự cần mã mới thì để ở khoá cấp trên cùng riêng (vd. `roles_ext`).
- **Chế độ trò chơi tiếng Anh**: khoá cấp trên cùng **`games_en: {game: mode}`**. `clean_store` của bản cũ chỉ nhận chế độ có trong `GAME_MODES` của nó, nên không để chung trong `games`.
- **Báo tiếng Anh**: thư mục riêng `user_files/bao_gemini_en/` (số báo, trạng thái, giọng đọc, nhật ký). Báo tiếng Nhật vẫn ở `user_files/bao_gemini/`, không di chuyển. Tiến độ đọc / chép trong collection: giữ khoá cũ cho tiếng Nhật, thêm khoá riêng cho tiếng Anh (hoặc khoá con cấp trên cùng). Phải kiểm tra lại cách `PaperState` lưu trước khi chốt.
- Config mới (`config.json`): `gemini_level_en` (mặc định `A2`), `gemini_voice_en` (một giọng Gemini nghe rõ tiếng Anh). Không đổi tên khoá cũ.
- **Test tương thích** giống `tests/core/test_116.py`: chạy **mã 1.16 thật** (`OLD_ADDON`) đọc + lưu cấu hình trường / dữ liệu → bản mới đọc lại vẫn còn `lang`, `games_en`.

---

## 4. Thiết kế

### 4.1 Chuẩn hoá furigana — làm đơn giản lại (Bước 1, chỉ ảnh hưởng tiếng Nhật)

Hiện tại furigana được xử lý rải rác (`plain_word`, `_FURI_RE`, `furigana_tokens`, `_clean_example`, `anki_to_markup`, `readingsOf` trong JS) và **chỉ hiểu kiểu ngoặc vuông của Anki**. Chạy thử trên 1.16:

| Kiểu deck | Ví dụ | Kết quả 1.16 | Nên là |
|---|---|---|---|
| Ngoặc vuông Anki | `日本[にほん] 語[ご]` | 日本語 / にほんご ✓ | giữ |
| Ngoặc vuông + okurigana | ` 食[た]べる` | 食べる / đọc **"た"** ✗ | たべる |
| Migaku (kèm trọng âm) | `漢字[かんじ;h,1]` | đọc **"かんじ;h,1"** ✗ | かんじ (bỏ phần sau `;`) |
| HTML ruby (Yomitan `{furigana}`, nhiều deck Core) | `<ruby>漢字<rt>かんじ</rt></ruby>` | từ **"漢字かんじ"** ✗ (dính chữ) | 漢字 / かんじ |
| Ruby có `<rb>`, `<rp>` | `<ruby><rb>漢字</rb><rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>` | **"漢字(かんじ)"** ✗ | 漢字 / かんじ |
| Ngoặc tròn sau chữ | `漢字（かんじ）` | giữ nguyên cả ngoặc trên biển cây ✗ | tách (xem luật dưới) |
| Hai dòng trong trường Từ | `漢字<br>かんじ` | "漢字 / かんじ" ✗ | tách nếu dòng 2 toàn kana |
| Trường Cách đọc riêng | `かんじ` | ✓ | giữ (luôn ưu tiên) |
| Trường Cách đọc dạng ngoặc vuông | `漢字[かんじ]` | **mất cách đọc** ✗ (lấy phần chữ, trùng từ → bỏ) | かんじ |
| Câu ví dụ dạng ruby HTML | `<ruby>漢字<rt>かんじ</rt></ruby>を…` | "漢字かんじを…" ✗ → Điền vào câu, Chép chính tả, cú pháp báo đều sai | chuẩn hoá trước khi dùng |
| Trường Cách đọc bằng romaji | `kanji` | không dùng được cho trò chơi | để sau (có thể đổi romaji → kana bằng bảng đã có trong games.js) |

**Đề xuất:** một hàm duy nhất, gọi ngay lúc đọc trường, mọi chỗ khác dùng kết quả của nó:

```
normalize(raw_html, lang) -> list[(chữ, cách_đọc | None)]
   1. lang != "ja": không xử lý furigana (tiếng Anh xem 4.3).
   2. <ruby>…<rt>…</rt></ruby> (bỏ <rp>, lấy <rb> nếu có) → token, LÀM TRƯỚC khi bỏ thẻ HTML.
   3. Bỏ thẻ HTML còn lại (<br>, </div> → xuống dòng), bỏ [sound:…].
   4. Ngoặc vuông Anki: ` ?(chữ)[đọc]` → token; bỏ phần sau ";" trong ngoặc (Migaku).
   5. Chỉ với trường Từ và khi KHÔNG có trường Cách đọc:
      - "chữ（kana）" / "chữ(kana)": tách nếu trong ngoặc toàn kana, trước ngoặc có chữ Hán,
        và trong ngoặc KHÔNG phải đuôi kiểu (する)(な)(の)(に)(と)(だ)(たる).
      - Hai dòng "chữ ⏎ kana": tách nếu dòng 2 toàn kana.
   Từ token suy ra: surface() = nối chữ; kana() = nối cách đọc + kana ngoài ngoặc (食[た]べる → たべる);
   markup() = cú pháp báo [chữ|đọc].
```

- Đặt trong module mới nhỏ (vd. `text_core.py`), thay cho `plain_word` / `furigana_tokens` / `_clean_example` ở `garden_core`, `paper_core`, `ai_core`. JS chỉ nhận dữ liệu đã sạch, không tự đoán furigana nữa (`readingsOf` chỉ còn tách nhiều cách đọc On / Kun).
- **Không cố hiểu mọi kiểu.** Kiểu lạ (CSS riêng, `<span class="furi">`…) thì hiện chữ nguyên văn, và người dùng chọn trường Cách đọc riêng trong Cấu hình trường. Ghi rõ điều này trong README.
- Test (`tests/core/test_117.py`): đủ mọi dòng của bảng trên, cộng các câu ví dụ thật trong `tests/fixtures`.

### 4.2 Đoán ngôn ngữ của loại note (Bước 2)

- Lấy tối đa 30 note mẫu của loại note (như `guess_kind` đang làm), đếm ký tự ở trường Từ:
  - có kana (ぁ-ヿ) → `ja`;
  - phần lớn chữ Latin (a-z, có thể có dấu cách, gạch nối) → `en` (tạm coi mọi chữ Latin là tiếng Anh; tiếng Pháp / Tây Ban Nha… để `other` khi có dấu đặc trưng như é, ñ, ü chiếm nhiều);
  - Hangul → `other:ko`;
  - chỉ chữ Hán, không kana: nếu tên trường / loại note có pinyin, hanzi, chinese, 拼音 → `other:zh`; còn lại `ja` (giữ cách cũ cho deck kanji).
- Tên trường gợi ý cho `en`: `english`, `ipa`, `phonetic`, `pronunciation`, `definition`, `sentence`.
- Bảng Cấu hình trường: thêm ô chọn **Ngôn ngữ** cho mỗi loại note (Tiếng Nhật / Tiếng Anh / Ngôn ngữ khác — chưa hỗ trợ đầy đủ). Đổi ngôn ngữ thì nhãn vai trò đổi theo.
- Gửi sang JS: `note_types[].lang`; mỗi cây có `lang` (hoặc tra theo `mid`).

### 4.3 Trường và chữ tiếng Anh (Bước 3)

- Nhãn vai trò khi `en`: Từ (Word), **Phiên âm (IPA)**, Nghĩa, Loại từ, Câu ví dụ, Dịch câu ví dụ, Audio từ, Audio câu ví dụ. Không có Hán Việt / Kun. Loại note tiếng Anh: Từ vựng hoặc Khác (Ngữ pháp tiếng Anh để sau).
- Tên trường hay gặp: Từ = word, term, front, vocabulary; IPA = ipa, phonetic(s), pronunciation; Nghĩa = meaning, definition, vietnamese, back; Ví dụ = example, sentence, usage.
- **Không bỏ chữ trong `[...]`** như furigana. Nếu trường Từ có `run [rʌn]` hoặc `apple /ˈæp.əl/` mà trong ngoặc giống IPA (có ký tự IPA hoặc nằm giữa `/ /`) → tách ra làm phiên âm; ngoặc khác (`take [sth] off`) thì giữ nguyên.
- Deck nhồi chung "nghĩa + IPA + ví dụ" trong một trường: chỉ lấy dòng đầu làm nghĩa (đã có `_clean` đổi xuống dòng thành " / "); không cố tách sâu hơn.

### 4.4 Trò chơi tiếng Anh (Bước 4)

- **Ôn loại note** trong menu tách theo ngôn ngữ: "Từ vựng · Nhật · 120", "Từ vựng · Anh · 80". Deck trộn hai thứ tiếng thì đáp án nhiễu không lẫn tiếng.
- **Chợ sáng, Lật cặp**: chế độ `mix`, `meaning-word`, `word-meaning` (+ `ipa-word` khi có IPA). Thêm **tự co cỡ chữ** trong thùng hàng / thẻ lật cho từ và nghĩa dài (có lợi cho cả tiếng Nhật).
- **Nghe tìm cây**: audio của deck; không có thì giọng đọc tiếng Anh (giọng máy `en_US` qua `TTSTag` như `paper_core.Voice`, hoặc giọng Gemini nếu đã dán khoá).
- **Đuổi quạ** (chế độ mới, lưu ở `games_en`):
  - "Nghĩa → gõ từ tiếng Anh" (luyện chính tả, mặc định), "Nghe → gõ từ" (khi có audio / giọng đọc).
  - Ô gõ **không** đổi sang kana. So sánh sau khi: chữ thường, bỏ khoảng trắng thừa, coi `-` / dấu cách / `'` `’` như nhau. Nhận nhiều đáp án nếu trường Từ có `,` `;` `/`.
  - Biển quạ dài (cụm từ, nghĩa dài) cắt như hiện tại (~34 ký tự) và co chữ.
- **Điền vào câu**:
  - Không phân biệt hoa thường, tìm theo ranh giới từ (`\b`).
  - Biến đổi thường gặp: -s / -es / -ies, -ed / -d / -ied, gấp đôi phụ âm (stop → stopped), -ing (bỏ e: make → making), -er / -est.
  - Bảng ~200 động từ bất quy tắc (go/went/gone…) trong file dữ liệu riêng (vd. `data/en_irregular.json`).
  - Cụm từ nhiều chữ: chỉ khi các chữ đứng liền nhau trong câu (look up ✓, look it up ✗ — giai đoạn đầu bỏ qua).
- Tất cả chữ mô tả trò chơi ("Gõ từ tiếng Nhật (romaji, kana…)") lấy theo ngôn ngữ.

### 4.5 Chép chính tả (Bước 5)

- `en`: bộ chấm **theo từ**: chữ thường, bỏ dấu câu, đổi nháy cong thành nháy thẳng, bảng rút gọn (don't = do not, it's = it is, I'm = I am, can't = cannot…). Báo lại từ đúng / sai / thiếu / thừa. Audio: audio câu ví dụ của deck, không có thì giọng đọc tiếng Anh.
- `other`: chỉ bật khi deck có audio câu ví dụ; bộ chấm chung (bỏ dấu câu và khoảng trắng, chữ thường). Không có audio thì ẩn, ghi "chưa có giọng đọc cho ngôn ngữ này".
- `ja`: giữ nguyên.

### 4.6 Báo 畑新聞 (Bước 6)

- **Ngôn ngữ của báo = ngôn ngữ chiếm đa số trong deck đang chọn** ở vườn (theo `note_types[].lang` × số cây).
  - `ja`: như cũ.
  - `en`: báo tiếng Anh do Gemini viết (không có kotoba_daily cho tiếng Anh).
  - `other`: **không viết báo**. Tab Báo hiện: "Báo chưa hỗ trợ tiếng <tên> — hiện có tiếng Nhật và tiếng Anh, có thể thêm sau." Chip trên thẻ Hôm nay chỉ còn "Chép x/5" (nếu chép chính tả dùng được).
- Báo tiếng Anh:
  - Trình độ CEFR **A1–C1** (thay N5–N1). Cấu trúc giữ như báo tiếng Nhật (tin làng + truyện dài kỳ + câu hỏi + câu chép chính tả) để dùng lại `paper.js`, kệ báo, hòm thư.
  - Phạm vi: từ đã học của deck tiếng Anh (`scope_from_plants` thêm nhánh `en`), từ sắp quên, từ chép sai.
  - Prompt riêng (`system_prompt_en`, `write_prompt_en`, `review_prompt_en`): bài tiếng Anh, chú nghĩa tiếng Việt, ưu tiên từ trong deck, không lẫn tiếng Việt trong câu tiếng Anh.
  - Bộ soát `check_en`: đúng khung JSON, độ dài theo trình độ, số từ của deck được dùng ≥ ngưỡng, câu hỏi có đáp án hợp lệ, câu chép chính tả ngắn vừa phải, không có chữ ngoài bảng chữ cái Latin (trừ dấu câu). Có bước sửa + soát lần 2 như tiếng Nhật.
  - Bấm vào từ để tra: nối từ trong bài với từ của deck theo **dạng gốc** (dùng ngược bảng biến đổi + động từ bất quy tắc ở 4.4).
  - Giọng đọc: Gemini TTS tiếng Anh + bản đọc chậm (`stretch()` có sẵn). Không có nút "Ẩn furigana" khi báo là tiếng Anh.
- Tài khoản có cả deck Nhật và Anh: mỗi ngôn ngữ một số báo mỗi ngày (thư mục riêng), tự viết theo deck đang chọn khi mở vườn / mở Báo. Kệ báo chỉ hiện số báo của ngôn ngữ đang xem (có thể thêm nút chuyển ngôn ngữ).

### 4.7 Mức hỗ trợ deck — ranh giới (người dùng đã đồng ý, ghi cho người dùng thấy)

Nguyên tắc: **tự hiểu kiểu phổ biến, còn lại để người dùng chọn trường; không đoán bừa** (tách sai còn tệ hơn không tách, vì trò chơi sẽ hỏi sai đáp án). **Vườn + ôn thẻ luôn chạy với mọi deck** (ôn dùng chính mẫu thẻ của Anki); mức hỗ trợ chỉ ảnh hưởng trò chơi, biển cây, chép chính tả, báo.

Một câu cho người dùng: *mỗi note là một mục cần nhớ, mỗi loại thông tin ở một trường riêng, chữ thuần hoặc HTML đơn giản, furigana theo kiểu phổ biến — đạt điều này là dùng được hết; thiếu chỗ nào thì mất tính năng ở chỗ đó.*

| Mức | Gồm | Ghi chú |
|---|---|---|
| **1. Tự nhận** | Mỗi note một từ / chữ Hán / mẫu ngữ pháp; từ, nghĩa, cách đọc (IPA với tiếng Anh), ví dụ, audio ở các trường riêng; tên trường thông dụng (không khớp thì trường đầu = Từ, trường kế = Nghĩa); furigana: ngoặc vuông Anki, HTML ruby, Migaku, ngoặc tròn khi chắc chắn (sau Bước 1), hoặc trường Cách đọc riêng; audio `[sound:…]` | |
| **2. Chọn một lần trong Cấu hình trường** | Tên trường lạ; hai trường trông giống nhau; On / Kun tách hai trường; deck nhiều loại note; ngôn ngữ đoán sai | mỗi loại note chọn một lần, dùng cho mọi deck |
| **3. Chạy nhưng thiếu tính năng** | Thiếu cách đọc → không Đuổi quạ (tiếng Nhật) / kiểu chơi theo cách đọc; thiếu audio → giọng máy hoặc khoá Nghe tìm cây; thiếu câu ví dụ → không Điền vào câu, Chép chính tả chuyển sang nghe từ; chữ quá dài → cắt "…" (từ 60, nghĩa 80) | trò bị khoá luôn ghi lý do (đã có ở menu Trò chơi) |
| **4. Không hỗ trợ** | Nhồi nhiều thứ vào một trường (vd. Front = `食べる (たべる) - ăn`; trừ 2 luật đơn giản ở 4.1: hai dòng chữ ⏎ kana, ngoặc tròn chứa kana); furigana tự chế (CSS riêng, cách đọc trong thuộc tính HTML, chữ trong ảnh); một note chứa danh sách nhiều từ; thẻ chỉ có ảnh / Cloze / Image Occlusion (ôn được, không vào trò chơi); đáp án dài kiểu môn học; ngôn ngữ ngoài Nhật / Anh (chỉ vườn + trò chung, không báo) | deck phải sửa lại, hoặc chỉ dùng vườn + ôn |

Việc cần làm cho phần này:
- **Bảng Cấu hình trường** (Bước 2): một dòng gợi ý ngắn ở đầu bảng, vd. *"Add-on tự hiểu khi mỗi loại thông tin nằm ở một trường riêng (furigana kiểu 漢字[かんじ] hoặc ruby cũng được). Trường nhồi chung kiểu “食べる (たべる) - ăn” thì không tách được — chọn trường gần đúng nhất hoặc sửa deck."* Thêm cảnh báo riêng cho từng loại note khi thấy dấu hiệu nhồi chung ở trường Từ (vd. đa số note có ` - ` / ` – ` / `:` rồi tới chữ Latin có dấu tiếng Việt, hoặc vừa có kana vừa có chữ Việt): *"Trường Từ có vẻ chứa cả nghĩa — trò chơi có thể hiện sai"*. Chỉ cảnh báo, không tự tách.
- **README trong gói + README repo** (Bước 8): thêm mục "Deck thế nào thì dùng được" với bảng 4 mức ở trên (viết cho người dùng, có ví dụ trường). Mục "Hạn chế" trỏ tới mục này.
- **Test**: deck mẫu "nhồi chung" (Bước 7) phải hiện cảnh báo ở Cấu hình trường và vẫn mọc cây + ôn được bình thường.

---

## 5. Các bước (mỗi bước một commit, chạy hết test trước khi sang bước sau)

1. **Chuẩn hoá furigana** (4.1) + `test_117.py` phần furigana. Chạy lại toàn bộ test tiếng Nhật.
2. **Ngôn ngữ của loại note** (4.2, 3): đoán, lưu `lang`, ô chọn trong Cấu hình trường, gửi sang JS. Test tương thích với mã 1.16 thật. Thêm dòng gợi ý "mức hỗ trợ" + cảnh báo trường nhồi chung trong Cấu hình trường (4.7).
3. **Trường và chữ tiếng Anh** (4.3): nhãn, tên trường gợi ý, tách IPA, không bỏ `[...]`.
4. **Trò chơi** (4.4): nhóm loại note theo ngôn ngữ, Đuổi quạ tiếng Anh, Điền vào câu tiếng Anh, giọng đọc cho Nghe tìm cây, tự co chữ, chữ mô tả theo ngôn ngữ, ẩn trò không hỗ trợ cho `other`.
5. **Chép chính tả** (4.5).
6. **Báo** (4.6): báo tiếng Anh bằng Gemini + thông báo "chưa hỗ trợ" cho ngôn ngữ khác. Thử với Gemini thật qua proxy.
7. **Dữ liệu test**: thêm vào `tests/core/make_col.py` các deck mẫu:
   - tiếng Anh Basic (Front / Back);
   - tiếng Anh đầy đủ (Word / IPA / Meaning / Example / Example meaning / Audio);
   - tiếng Anh nhồi chung (Front: từ + IPA, Back: nghĩa + ví dụ cùng một trường);
   - tiếng Nhật nhồi chung (Front = `食べる (たべる) - ăn`) để thử cảnh báo ở 4.7;
   - tiếng Hàn (để thử nhánh `other`);
   - tiếng Nhật dạng ruby HTML và dạng ngoặc tròn (cho Bước 1).

   Viết `tests/anki/e2e_117.js`, thêm vào `run_ui.sh`, cập nhật `tests/README.md`.
8. **Đóng gói 1.17.0**: cập nhật README (gói, repo, tests) — thêm mục **"Deck thế nào thì dùng được"** (bảng 4 mức ở 4.7) và mục "Hạn chế": ngôn ngữ khác chưa có báo, kiểu furigana lạ thì chọn trường Cách đọc. **Xoá file kế hoạch này + dòng trỏ trong README mục 0 + dòng ngoại lệ trong `.gitignore`**, commit, push.

Ước lượng: bước 1–4 cỡ một bản như 1.15 / 1.16; bước 5 nhỏ hơn; bước 6 cỡ bản 1.12 (báo Gemini đầu tiên) nhưng dùng lại được nhiều khung.

---

## 6. Rủi ro / chỗ dễ sai

- Deck tiếng Anh rất đa dạng → tự đoán trường kém hơn deck tiếng Nhật. Có ô chọn tay trong Cấu hình trường; nên thử với vài deck thật (hỏi người dùng có deck mẫu không).
- Đoán nhầm ngôn ngữ (deck kanji chỉ có chữ Hán bị coi là tiếng Trung) → mặc định nghiêng về `ja`, người dùng sửa tay được.
- Thay `plain_word` / `furigana_tokens` có thể làm lệch câu chép chính tả và cú pháp báo cũ → chạy lại `test_offline.py`, `test_dict.py`, `e2e.js` (báo, chép chính tả) sau Bước 1.
- Bản cũ ở máy khác: chỉ dùng khoá cấp trên cùng mới (`lang`, `games_en`), không thêm mã vai trò, không đổi định dạng `models[mid]`.
- Không để Gemini tự viết báo cho ngôn ngữ chưa hỗ trợ (tốn lượt, bài không soát được).

---

## 7. Tiến độ

- [x] Bước 1 — Chuẩn hoá furigana (1.17: `text_core.py`; mọi dòng ở bảng 4.1 trừ "Cách đọc bằng romaji" — để sau)
- [x] Bước 2 — Ngôn ngữ của loại note (khoá `lang`, `guess_lang`, drop-down Ngôn ngữ + Loại, dòng gợi ý + cảnh báo trường nhồi chung). Lưu ý: ngôn ngữ khác lưu là `other` (không có mã con `other:ko`) cho gọn.
- [x] Bước 3 — Trường và chữ tiếng Anh (nhãn IPA, `guess_roles_lang`, tách IPA, không bỏ `[...]`)
- [x] Bước 4 — Trò chơi (nhóm `en` / `xx`, chế độ ở `games_lang`; Đuổi quạ `spell`; Điền vào câu nhận dạng biến đổi; giọng `en_US` của máy cho Nghe tìm cây + nút ♪). Chưa làm: "Nghe → gõ từ" cho Đuổi quạ, tự co chữ trong thùng hàng / thẻ lật, cụm từ tách rời ("look it up").
- [x] Bước 5 — Chép chính tả (tiếng Anh chấm theo từ, `tts_en`; ngôn ngữ khác chỉ khi có audio). Chưa làm: báo lại từ sai / thiếu / thừa.
- [ ] **Bước 6 — Báo tiếng Anh.** 1.17 chỉ làm phần chặn: deck đang xem không phải tiếng Nhật thì không tự viết báo (`_deck_is_japanese` trong `__init__.py`), tab Báo ghi "báo hiện chỉ tiếng Nhật". Khi làm tiếp, chú ý: trạng thái đọc / câu chép của báo khoá theo ngày (`p:<ngày>:<i>`, `PaperState.read`) — báo Nhật và báo Anh cùng ngày sẽ đụng nhau, cần khoá riêng (bản ≤ 1.17 `clean_state` bỏ id lạ, nên phải để ở khoá collection riêng, không chung `kotoba_batake_paper`).
- [x] Bước 7 — Dữ liệu test + e2e (`make_col.py` thêm 7 deck; `tests/core/test_117.py`; `tests/anki/e2e_117.js`)
- [ ] Bước 8 — Đóng gói: 1.17.0 đã đóng gói + README (mục "Deck thế nào thì dùng được" ở README trong gói, mục 10). Còn: **xoá file này** + dòng trỏ ở README mục 0 + dòng ngoại lệ trong `.gitignore` khi bước 6 xong.

Ngoài kế hoạch, 1.17 còn làm theo yêu cầu người dùng: bảng Trò chơi trở lại kiểu 1.15 với drop-down; bỏ Âm Hán Việt + Loại từ khỏi Từ vựng.
