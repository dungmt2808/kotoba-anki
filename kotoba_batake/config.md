**ことば畑 · Vườn từ vựng** — mỗi từ là một cây, lớn theo trí nhớ FSRS.

**Cấu hình trường theo loại note** (từ 1.9 — nên dùng cách này): trong vườn bấm ⚙ → *Cấu hình trường…* (hoặc chip ⚠ ở góc sân khi có loại note chưa cấu hình). Chọn ngôn ngữ (Tiếng Nhật / Tiếng Anh / khác — 1.17, tự đoán nếu chưa chọn) và loại note là Từ vựng / Chữ Hán / Ngữ pháp / Khác rồi chọn trường cho từng vai trò (bắt buộc: Từ + Nghĩa; Kanji + Hán Việt; Cấu trúc + Nghĩa). Furigana kiểu `漢字[かんじ]`, ruby HTML, Migaku, `漢字（かんじ）` đều tự hiểu; tiếng Anh có thể kèm IPA (`apple /ˈæp.əl/`). Trò chơi đổi theo loại note và có chế độ riêng (vd. Lật cặp: Kanji ↔ Hán Việt / Nghĩa / On/Kun). Cấu hình lưu trong collection nên đồng bộ qua AnkiWeb.

**Trường của thẻ — cách cũ** (chỉ dùng cho loại note *chưa* cấu hình ở trên; để trống = tự đoán theo tên trường phổ biến)
- `word_field`, `reading_field`, `meaning_field`: trường chứa từ, cách đọc, nghĩa (Vocab/Word/Kanji/単語…, Reading/読み/Âm On/Âm Kun…, Meaning/Nghĩa/意味…). Deck kanji có 2 trường Âm On + Âm Kun thì lấy cả hai.
- `audio_field`: âm thanh của từ (Audio/Sound/音声…), dùng cho “Nghe tìm cây” và nút ♪.
- `example_field`, `example_audio_field`: câu ví dụ và audio câu ví dụ (Example/例文…, Example_Audio…), dùng cho game “Điền vào câu”. Câu ví dụ có thể viết furigana kiểu `漢字[かんじ]` hoặc ruby HTML.

**Khu vườn**
- `stage_days`: độ bền trí nhớ FSRS (ngày) để cây lên **Cây non**, **Ra hoa**, **Ra quả**. Mặc định `[3, 21, 90]`.
- `wilt_retrievability`: cây **héo** khi xác suất nhớ thấp hơn mức này. Mặc định `0.7`. Héo chỉ đổi màu cây; giọt nước và số trên nút Tưới ngay chỉ tính thẻ Anki cho ôn ngay (từ 1.18).
- `max_plants`: số cây tối đa hiển thị trong một deck. Mặc định `400`; deck lớn hơn thì ưu tiên hiện cây đã học.

**Xu, mục tiêu, nhiệm vụ**
- `daily_goal`: số lượt ôn mỗi ngày để hoàn thành mục tiêu (tính cả ôn ở màn ôn của Anki). Mặc định `30`; tối thiểu `10` (1.23: đặt 1–9 thì tính là 10; `0` / số âm thì về `30`).
- `daily_bonus`: xu thưởng khi đạt mục tiêu ngày. Mặc định `15`, tối đa `100` (1.23: trước đây cho tới 100.000; đặt cao hơn thì tính là 100).
- `game_daily_coins`: số xu tối đa kiếm từ mini-game mỗi ngày. Mặc định `40`, tối đa `200` (1.23).
- Nhiệm vụ hằng ngày (3 cái, đổi mỗi ngày) được chọn theo số thẻ đến hạn / thẻ mới bạn đang có. Xong cả 3 mở rương quà có đồ hiếm.
- Xu, nhà, đồ đạc, kỷ lục, nhiệm vụ được lưu trong collection nên **đồng bộ qua AnkiWeb**; bản sao lưu nằm ở `user_files/state.json`.
- `mobile_coins` (từ 1.11): **bù xu cho lượt ôn trên điện thoại** (AnkiDroid / AnkiMobile) hoặc máy chưa cài add-on. Sau khi đồng bộ, add-on đếm lượt ôn mới trong lịch sử ôn của Anki: +1 xu mỗi lượt nhớ được (Khó / Được / Dễ), tính vào nhiệm vụ hôm nay (ôn thẻ đến hạn, học thẻ mới) và thưởng mục tiêu ngày còn thiếu. Bù trong 14 ngày gần nhất, không bao giờ trả hai lần; chỉ tính lượt ôn từ lúc cài bản 1.11. Thưởng cây lên giai đoạn và nhiệm vụ “tưới liền” chỉ tính khi ôn trên máy tính. Mặc định `true`; `false` để tắt.

**Báo 畑新聞 & chép chính tả** (từ bản 1.6)
- `bao_dir`: đường dẫn thư mục `kotoba_daily` (cách nâng cao, xem **Báo do Claude Code viết** ở dưới), ví dụ `"~/tieng-nhat/kotoba_daily"`. Để trống nếu không dùng (mặc định): tab Nguồn báo chỉ hiện Gemini; tab Chép chính tả vẫn chạy với câu ví dụ / từ của deck.
- Mở bảng báo: bấm hòm thư ngoài sân, chip "Báo mới" ở góc sân, hoặc phím **B**. Báo cũ nằm ở tab Kệ báo, đọc bù lúc nào cũng được.
- Mỗi câu hỏi / câu chép đúng ngay lần đầu +2 xu; làm hết phần luyện tập của một số báo +5; xong lượt chép 5 câu mỗi ngày +5. Add-on ghi file `tien_do.json` trong `bao_dir` để báo hôm sau nhắc lại từ bạn sắp quên hoặc chép sai.

**Báo do Gemini viết** (từ bản 1.12) — cách dễ nhất, không cần Claude Code
- Cài trong vườn: mở báo (phím **B**) → tab **Nguồn báo** → dán khoá Gemini (lấy miễn phí ở aistudio.google.com/apikey) → **Thử khoá**. Không cần sửa tay các mục dưới đây.
- `bao_source`: nguồn báo — `"auto"` (có `bao_dir` thì dùng kotoba_daily, không thì Gemini), `"claude"`, `"gemini"`. `"claude"` mà `bao_dir` trống thì như `"auto"`.
- `gemini_key`: khoá Gemini API. **Chỉ lưu trên máy này** (không đồng bộ AnkiWeb, không ghi vào Báo lỗi). Đừng chia sẻ file cấu hình có khoá.
- `gemini_langs` (1.19.1): báo muốn nhận, ví dụ `["ja"]` (mặc định), `["ja", "en"]`, `["en"]`. Mỗi sáng Gemini viết một số cho mỗi báo trong danh sách, **không phụ thuộc deck đang xem**. Chưa có khoá này thì add-on ghi một lần: `["ja"]`, thêm `"en"` nếu máy đã có báo tiếng Anh. Deck lấy từ (tối đa 5 cho mỗi báo) chọn ở tab Nguồn báo, lưu trong collection (đồng bộ AnkiWeb).
- `gemini_level`: trình độ báo tiếng Nhật `"N5"`…`"N1"`.
- `gemini_audio`: giọng đọc Gemini — `"chinh_ta"` (chỉ câu chép chính tả, ít lượt gọi), `"ca_bai"` (cả từng đoạn), `"tat"`. `gemini_voice`: tên giọng (`"Kore"`, `"Leda"`, `"Aoede"`…).
- `gemini_level_en` (1.19): trình độ `"A1"`…`"C1"` của **báo tiếng Anh** (The Garden Gazette), lưu ở `user_files/bao_gemini_en/`. Giọng đọc dùng chung `gemini_voice` (`gemini_voice_en` của bản 1.19.0 vẫn được đọc nếu có).
- `gemini_auto`: tự viết số hôm nay khi mở Anki / mở vườn (mỗi ngày tối đa 2 lần thử). `false` = chỉ viết khi bấm **Viết số hôm nay**.
- `gemini_wait_start` (1.22.3, add-on tự đặt): `true` sau khi dán khoá lần đầu và **Thử khoá** đúng — chưa tự viết, chờ bạn chọn báo muốn nhận / trình độ / deck rồi bấm **Bắt đầu viết** ở tab Nguồn báo (bấm xong thành `false`). Đặt `false` bằng tay cũng được.
- `gemini_wait_langs` (1.22.4, add-on tự đặt): báo vừa tick thêm ở "Báo muốn nhận" khi đã có khoá, ví dụ `["en"]` — báo đó chưa tự viết, chờ bạn chọn trình độ / deck rồi bấm **Bắt đầu viết**; các báo khác vẫn tự viết như cũ.
- `gemini_scope`: không dùng nữa (1.23: báo Gemini luôn lấy từ deck — mọi deck hoặc deck đã chọn ở tab Nguồn báo; mỗi số 100 từ, khoảng 70% từ hôm nay phải ôn và 30% từ đã thuộc). Báo Claude Code (kotoba_daily) vẫn theo giáo trình.
- `paper_confirmed` (1.23, tự ghi): nguồn đã xác nhận của từng báo, vd. `{"ja": "claude", "en": "gemini"}`. Nguồn vừa thành Gemini mà chưa xác nhận (bấm "Dùng Gemini", thư mục kotoba_daily tạm không thấy) thì chờ bấm "Bắt đầu viết", không tự viết. Không cần sửa tay.
- `gemini_model`, `gemini_tts_model`: để trống cho add-on tự chọn model mới nhất (Google hay đổi tên model).
- `gemini_story` (1.23): truyện dài kỳ — `"hay"` (mặc định: lập mạch truyện, Gemini viết, biên tập chấm điểm, viết lại khi nhạt; thêm 2–3 lượt gọi mỗi số), `"tiet_kiem"` (viết chung một lượt với cả số báo như bản cũ), `"tat"` (số báo không có truyện). Đổi ở tab Nguồn báo.
- `gemini_story_tone` (1.23): giọng truyện — `"am"` (Ấm áp đời thường, mặc định), `"hai"` (Hài), `"bi_an"` (Bí ẩn nhẹ), `"phieu_luu"` (Phiêu lưu).
- Bản dịch tiếng Việt (1.23): mỗi bài báo có bản dịch ẩn sẵn — bấm **Dịch** cuối đoạn hoặc **Hiện bản dịch** ở đầu bảng Báo. Số cũ chưa có bản dịch: **Dịch số này** (Gemini dịch một lần). Dưới truyện có **Kỳ này hay / Nhạt** + một dòng nhận xét: Gemini đọc khi viết kỳ sau (dòng bạn gõ được gửi lên Google).
- Mỗi số (1.23, Truyện: Hay hơn): Gemini lập mạch truyện (mỗi đợt 6–8 kỳ) → viết kỳ truyện → biên tập chấm điểm, nhạt thì viết lại → Gemini viết cả số (chép truyện, thêm furigana) → máy kiểm tra (romaji, furigana, chữ Trung, cách đọc theo deck, số đếm…) → máy tự nối tra từ cho từ đã học → gửi lại lỗi cho Gemini sửa (tối đa 2 lần) → Gemini soát lần 2 như biên tập viên → kiểm tra lại. Còn lỗi thì **không lưu** số đó. Khoảng 5–8 lượt gọi chữ (Tiết kiệm: 3–5) + 2–3 lượt gọi giọng đọc mỗi ngày (bản đọc chậm tạo ngay trên máy, không tốn lượt).
- Bản miễn phí: mỗi model khoảng 20 lượt viết / ngày, model giọng đọc khoảng 10 lượt / ngày. Model nào hết hạn mức thì add-on nhớ và dùng model khác (cả Flash-Lite) tới khi Google đặt lại hạn mức (0 giờ giờ Thái Bình Dương = 15 giờ ở Việt Nam).
- Gửi lên Google: danh sách từ / mẫu câu đang học, truyện các kỳ trước, dòng nhận xét truyện bạn gõ (1.23), nội dung báo và câu / từ cần giọng đọc. Bản miễn phí của Gemini có thể dùng dữ liệu gửi lên để cải thiện sản phẩm.

**Báo do Claude Code viết** (tuỳ chọn, cho người đã dùng Claude Code) — mặc định ẩn
- Thay cho Gemini, báo tiếng Nhật có thể do **Claude Code** (tác vụ lịch của Claude Desktop) viết mỗi sáng theo đúng giáo trình bạn đang học, kèm giọng đọc VOICEVOX nếu có. Cần: Claude Code chạy trên máy, Python 3, PDF giáo trình của bạn.
- Cách cài: tải thư mục `kotoba_daily` ở https://github.com/dungmt2808/kotoba-anki (thư mục `kotoba_daily/`), làm theo `HUONG_DAN.md` trong đó, rồi đặt `bao_dir` ở trên thành đường dẫn thư mục đó và mở lại vườn. Từ lúc này tab **Nguồn báo** có thêm thẻ **Claude Code** (chọn thư mục, đổi qua lại với Gemini).
- Xoá `bao_dir` (để `""`) thì thẻ Claude Code ẩn lại, báo tiếng Nhật về Gemini; các số báo cũ trong thư mục không bị xoá.

**Giọng đọc cho câu không có audio** (từ bản 1.13) — để Chép chính tả chạy với mọi deck
- `dict_voice`: `"auto"` (mặc định: giọng Gemini nếu có khoá, trong lúc chờ dùng giọng tiếng Nhật của máy), `"may"` (chỉ giọng của máy, không gửi câu lên Google), `"tat"` (chỉ chép câu / từ có sẵn audio).
- Lượt chép mỗi ngày lấy: câu chép sai đến hạn ôn → câu trong báo → câu ví dụ của deck → **từ của deck** (nghe từ, gõ lại) khi deck không có câu ví dụ. Câu không có audio thì đọc bằng giọng Gemini (lưu sẵn trong `user_files/bao_gemini/giong/`) hoặc giọng của máy.
- Giọng tiếng Nhật của máy: Windows → Cài đặt → Thời gian & ngôn ngữ → Giọng nói → Thêm giọng nói → Tiếng Nhật; macOS → Trợ năng → Nội dung đọc → Giọng hệ thống → Quản lý giọng nói → Tiếng Nhật. Mở lại Anki sau khi cài.

**Giao diện tự chỉnh** (từ bản 1.14) — sửa trong vườn: ⚙ → *Giao diện & chế độ học…*
- `ui`: `{}` = như cũ (mọi thứ chuyển động). Mỗi chế độ `main` (màn chính), `review` (khi ôn thẻ), `panel` (Trò chơi / Báo / Cấu hình trường) có: `yard` và `field` = `"full"` (chuyển động) / `"still"` (đứng yên) / `"dim"` (mờ, đứng yên) / `"hide"` (ẩn); `sky`, `weather`, `pets`, `mascot`, `joy` = `"on"` / `"off"`. Chung: `card` = `"normal"` / `"tall"` (khung thẻ to hết chỗ), `theme` = `"garden"` / `"paper"` (màu bảng ôn; 1.23 bỏ `"night"` — Đêm vườn, config cũ về `"garden"`), `scene` = `"normal"` / `"large"` (1.23: cỡ dải cảnh ở màn chính Vừa / Lớn), `start` = `"last"` / `"yard"` (1.23: mở vườn ở cảnh đang chọn / luôn về Sân vườn).
- Ví dụ ẩn sân + ruộng khi ôn thẻ: `"ui": {"review": {"yard": "hide", "field": "hide"}, "card": "tall"}`. Nhanh hơn: bấm nút **Ẩn vườn** trên bảng ôn.

**Hiệu ứng & âm thanh**
- `effects`: hiệu ứng (bình tưới, lấp lánh, bướm, pháo giấy…). Mặc định `true`.
- `sound`: âm thanh 8-bit. Mặc định `true`.
- `music`, `music_volume`: nhạc nền 8-bit và âm lượng (`0`–`1`). Mở vườn là có nhạc ngay (từ 1.7). Nhạc tự tắt khi ôn thẻ và khi chơi game có audio. Mỗi giao diện Mùa & Lễ hội có bản nhạc vườn riêng; nút Xem thử trong Nhà phát nhạc của chủ đề (1.18). Có thể chỉnh nhanh bằng nút ⚙.
- `show_tooltips`: hiện thông báo nhỏ ở màn ôn của Anki khi cây lên giai đoạn / xong nhiệm vụ.

**Mở nhanh** (từ 1.10)
- Nút **ことば畑** (có mầm pixel) trên thanh trên cùng của Anki, cạnh Bộ thẻ · Thêm · Duyệt · Thống kê · Đồng bộ: bấm một lần là vào vườn. `toolbar_button`: `false` để ẩn nút này (cần khởi động lại Anki).
- Phím tắt **Ctrl+Shift+K** (macOS: **⌘⇧K**) ở cửa sổ chính của Anki.
- **Biểu tượng ngoài Anki**: menu Tools → *ことば畑 · Tạo biểu tượng trên màn hình nền* (hoặc trong vườn bấm ⚙ → *Tạo biểu tượng…*). Bấm biểu tượng đó là Anki tự mở (hoặc nhảy lên nếu đang chạy) và vào thẳng khu vườn. Windows: lối tắt ở màn hình nền và menu Start (chuột phải → Ghim vào thanh tác vụ); macOS: ứng dụng nhỏ ことば畑 ở màn hình nền (kéo vào Dock được); Linux: biểu tượng ở màn hình nền và menu ứng dụng. Biểu tượng mở file `user_files/kotoba_batake_open.apkg` bằng Anki — đó là “vé” mở vườn, không phải deck, đừng xoá.

**Lịch hoa, nhật ký, luyện viết** (từ 1.20)
- Không cần sửa config: mở bằng phím **L**, bấm “· N ngày liền” ở thẻ Hôm nay hoặc ⚙ → *Lịch hoa & nhật ký…*. Nhật ký đồng bộ qua AnkiWeb (khoá `kotoba_batake_journal_<năm>_<tháng>` trong collection) và không bao giờ gửi cho Gemini. Luyện viết dùng khoá Gemini ở tab Nguồn báo (Gemini sửa 1 lần mỗi ngày); `journal_lang` chỉ là ngôn ngữ luyện viết bạn chọn lần trước (`ja` / `en`). Ảnh vườn tự chụp mỗi tuần ở `user_files/anh_vuon/` (chỉ máy này).

**Khách ghé vườn** (từ 1.21)
- Không cần sửa config. Khách ghé tuỳ đồ đã đặt, vùng, mùa, giờ và thời tiết; vườn đang xem nhiều cây Ra quả thì ghé thường hơn. Album khách ở Nhà → tab *Album khách* (đồng bộ qua AnkiWeb, khoá `kotoba_batake_guests`). Ẩn cùng thú nuôi ở ⚙ → *Giao diện & chế độ học…* → "Thú nuôi, khách trên sân".

**Báo lỗi** (từ 1.11)
- Gặp lỗi: trong vườn bấm ⚙ → *Báo lỗi…*, hoặc menu Tools → *ことば畑 · Báo lỗi* (dùng được cả khi vườn không mở lên). Cửa sổ hiện thông tin máy (bản Anki, hệ điều hành, kích thước màn hình…) và các lỗi add-on ghi nhận gần đây; ghi thêm vài dòng mô tả rồi bấm *Chép* hoặc *Lưu ra file* để gửi cho người làm add-on. Báo cáo không có tên deck, nội dung thẻ hay đường dẫn cá nhân; add-on không tự gửi gì lên mạng. Nhật ký lỗi nằm ở `user_files/errors.json`.

**Cửa sổ**
- `open_maximized`: mở vườn là phóng to hết màn hình. Mặc định `true`. Đặt `false` thì vườn mở đúng kích thước lần trước bạn để.
- Phím **F11** trong vườn: toàn màn hình (ẩn cả thanh tiêu đề), bấm lại để thoát.

**Trời & thời tiết** (chỉnh trong nút ⚙ hoặc bấm vào chip thời tiết ở góc vườn — không cần sửa config)
- *Giờ thật*: trời theo đồng hồ máy. *Giờ game*: 1 ngày trong vườn dài 6 / 12 / 24 / 60 phút. *Cố định*: luôn một buổi (sáng, trưa, chiều, hoàng hôn, đêm…).
- Thời tiết *Tự động* đổi mỗi 3 giờ (mùa mưa tháng 5–10 hay mưa hơn, tuyết chỉ tháng 12–2), hoặc chọn cố định Nắng / Nhiều mây / Mưa / Giông / Tuyết.
- Ban đêm đèn lồng, đèn bàn, cửa sổ sáng lên và có đom đóm trên ruộng; trời mưa thì bướm trốn đi.
- Từ 1.7: mưa thì có vũng nước gợn sóng và giọt nước bắn trên mặt đất; vừa tạnh mưa có cầu vồng; tuyết đọng trên mái nhà và đồ vật; giông thì đồ đung đưa mạnh hơn; ban ngày có đàn chim bay, đêm quang có sao băng; theo mùa thật có cánh hoa (tháng 3–4), chuồn chuồn (6–8), lá đỏ (9–11).

**Sau khi mua hết đồ** (trong bảng Nhà & Cửa hàng)
- *Vùng mới* (tab “Vùng mới”, mở lần lượt): Bãi biển 2.000 xu → Đền trên núi 3.000 xu → Phố lễ hội 4.000 xu → Rừng tre 5.000 xu → Suối nước nóng 6.000 xu → Ga làng quê 7.000 xu (3 vùng sau có từ 1.7). Mỗi vùng có cảnh riêng theo giờ & thời tiết và 6 món đồ riêng (30–600 xu). Đồ ngoài trời đặt được ở mọi vùng; màn chính hiện vùng bạn xem gần nhất, đổi nhanh bằng nút ◂ ▸ ở góc dưới sân hoặc phím ← →.
- *Kiểu nhà* (tab “Xây nhà”, sau khi xây đủ 7 bước): nhà mái tranh minka 1.500 xu, nhà trà chashitsu 2.000 xu, lâu đài mini 3.000 xu. Trong nhà cũng đổi theo (chiếu tatami, cửa sổ tròn…). Đổi qua lại miễn phí.
- *Tủ đồ StackChan* (tab “Tủ đồ”): mũ, phụ kiện, khăn, vỏ màu (60–300 xu) và biểu cảm mới (60–150 xu, bật/tắt được).
- *Xưởng chế tác* (tab “Xưởng”): tự vẽ pixel hoặc chọn / dán một tấm ảnh để tự chuyển thành pixel art rồi sửa lại. 16×16 = 200 xu, 24×24 = 350 xu, 32×32 = 500 xu; sửa = 50 xu; làm thêm 1 cái = nửa giá. Tối đa 60 mẫu. Mỗi món chọn được hiệu ứng: đung đưa, nhún nhảy, bay lơ lửng, lấp lánh, phát sáng ban đêm, và từ 1.7: tim bay, nốt nhạc, bong bóng, nhấp nháy sáng, xoay tròn. Có vẽ đối xứng (phím M), lật dọc, dịch hình bằng phím mũi tên. Món tự làm cũng đồng bộ qua AnkiWeb.
- Đồ vật có hiệu ứng riêng: ấm trà bốc hơi, lá phong rơi, chim đậu ghế, hòm thư có thư, gợn nước ao, lửa cáo ban đêm ở đền, hồ cá sủi bọt, pháo hoa buổi tối… Đồ vừa đặt sẽ nảy lên kèm bụi lấp lánh.
- 1.7 thêm 14 món cho sân và trong nhà (hướng dương, chong chóng gió, xích đu, đài phun nước, radio, bể cá, bếp irori, lịch treo tường…) và 18 món của 3 vùng mới; món mới có nhãn “Mới” và dòng ✦ mô tả hiệu ứng.
- *Mùa & Lễ hội* (tab “Mùa & Lễ hội”, từ 1.8): 14 giao diện theo mùa và lễ hội — Xuân, Hạ, Thu, Đông, Tết Nguyên Đán, Giáng sinh, năm mới Nhật お正月, Trung thu, Halloween, Mùa lá đỏ, Thất Tịch, Lễ hội mùa hè, Mùa mưa, Hoa anh đào. Mở bằng 1000 xu hoặc bằng chuỗi ngày ôn liên tiếp (mùa: 7 ngày, lễ hội: 10 ngày), được tặng kèm các món đồ của chủ đề (40 món). Mặc định tự đổi theo lịch (vd. Giáng sinh 15/11–31/12; Tết từ 3 tuần trước mùng 1 tới rằm tháng Giêng, tính theo âm lịch); có thể chọn tay một chủ đề hoặc tắt, và bấm “Xem thử” trước khi mở. Chủ đề đổi cả trang: dải trang trí trên cùng, tuyết / cánh hoa / lá rơi, màu ruộng và sân, dây đèn, pháo hoa, trăng rằm… Giáng sinh, Tết và Halloween có nhạc riêng.
- Nếu dùng Anki trên nhiều máy tính, nên cập nhật add-on ở tất cả các máy. Từ 1.7, vùng / đồ mới được lưu ở một khoá riêng nên bản cũ ở máy khác không xoá mất (bản cũ chỉ không nhìn thấy chúng); Mùa & Lễ hội (1.8) cũng vậy.

Mini-game chỉ để luyện thêm, **không** ghi vào lịch ôn FSRS. Mỗi trò chơi theo loại note đang chọn ở đầu menu (từ vựng / chữ Hán / ngữ pháp); thiếu trường cần thiết thì trò đó hiện lý do thay vì chơi. Trò Đuổi quạ có 4 tốc độ bay: Rất chậm (×0.6 điểm), Chậm (×0.8), Vừa, Nhanh (×1.25). Phím tắt ở màn chính: R ôn, T trò chơi, N nhà, Q nhiệm vụ, B báo & chép chính tả, L Lịch hoa & nhật ký, ← → đổi cảnh ngoài trời.
