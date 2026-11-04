# ことば畑 · Vườn từ vựng pixel + 畑新聞 (báo tiếng Nhật / tiếng Anh mỗi sáng)

README tổng hợp của cả dự án, viết để một phiên chat Claude hoặc Claude Code mới đọc là nắm được: dự án là gì, gồm những phần nào, chạy ra sao, đã chốt những gì và còn gì chưa làm.

Cập nhật: 2026-11-04. Add-on **1.19.0** (1.19.0: **báo tiếng Anh** *The Garden Gazette* do Gemini viết theo deck tiếng Anh đang xem, deck ngôn ngữ khác ghi "chưa hỗ trợ"; 1.18.0: **14 giao diện mùa đều có nhạc riêng** + Xem thử phát nhạc của chủ đề, sửa nút Tưới ngay còn số khi bảng ôn đã hết thẻ; 1.17.4: sửa dải chúc mừng ghi tên icon; 1.17.3: icon pixel thay emoji; 1.17.2: tab / nút cùng hàng đều nhau; 1.17.1: soát lại toàn bộ giao diện cho gọn; 1.17.0: deck **tiếng Anh** cho vườn / trò chơi / chép chính tả, furigana mọi kiểu, bảng Trò chơi trở lại kiểu 1.15 với drop-down, bỏ Hán Việt khỏi từ vựng; 1.16: 12 món hiếm mới, ôn tối "Đêm vườn", bảng Trò chơi sắp lại, vẽ cả cảnh nền vùng tự tạo; 1.15: màn chính gọn với một thẻ "Hôm nay", Xưởng có kẻ thẳng / chữ nhật / làm lại / cỡ bút, đỡ tốn CPU; 1.14 có giao diện tự chỉnh theo chế độ, sửa nhà, thú nuôi, giống cây, vùng tự tạo, hiệu ứng thành tích; bộ test trong `tests/`), bộ `kotoba_daily` bản 2.2 (`kiemtra.py` bắt romaji / chữ Trung / ngày đọc đặc biệt).

---

## 0. Đọc nhanh (cho phiên chat mới)

**Hai phần của dự án**
1. **Add-on Anki ことば畑** (gói `kotoba_batake`, bản 1.19.1): biến deck tiếng Nhật (từ vựng, chữ Hán, ngữ pháp) — từ 1.17 cả deck **tiếng Anh** — thành khu vườn pixel. Mỗi note là một cây lớn theo độ bền trí nhớ FSRS. Có xu, nhà, cửa hàng, mini-game, nhiệm vụ, từ 1.6 có **báo 畑新聞** và **chép chính tả hằng ngày**, từ 1.8 có **Giao diện mùa** (Tết, Giáng sinh, hoa anh đào, lá đỏ…), từ 1.9 có **Cấu hình trường theo loại note** và trò chơi theo loại note (từ vựng / chữ Hán / ngữ pháp), từ 1.10 có **nút mở nhanh** (thanh trên cùng của Anki, Ctrl+Shift+K, biểu tượng ngoài Anki) và Giao diện mùa phủ cả các vùng lẫn màn trò chơi, từ 1.11 **bù xu cho lượt ôn trên điện thoại** và nút **Báo lỗi**, từ 1.12 **báo do Gemini viết** (người dùng chỉ dán khoá Gemini, song song với cách Claude Code), từ 1.13 **Chép chính tả chạy với mọi deck** (câu ví dụ không có audio → giọng Gemini / giọng tiếng Nhật của máy; deck không có câu ví dụ → nghe từ, gõ lại) và báo Gemini đã sửa theo lần thử khoá thật, từ 1.14 **tự chỉnh giao diện** theo chế độ (vd. ẩn sân khi ôn thẻ), 4 chỗ tiêu xu mới (**sửa nhà, thú nuôi, giống cây, vùng tự tạo**) và **hiệu ứng thành tích** của vườn.
2. **Bộ `kotoba_daily`**: script Python và prompt để **Claude Code** (tác vụ lịch của Claude Desktop) mỗi sáng tự viết một số báo tiếng Nhật chỉ dùng ngữ pháp và từ vựng người học đã học, kèm audio VOICEVOX. Add-on đọc báo từ thư mục này.
3. **Nguồn báo thứ hai (1.12)**: add-on tự gọi **Gemini API** bằng khoá của người dùng, viết cùng định dạng `bao.json` vào `user_files/bao_gemini/`, kiểm tra + sửa + soát lần 2 rồi mới đưa vào hòm thư. Dành cho người không rành kỹ thuật (không cần Claude Code, VOICEVOX, PDF giáo trình). Từ 1.19 Gemini viết cả **báo tiếng Anh** (*The Garden Gazette*, `user_files/bao_gemini_en/`); từ 1.19.1 báo theo ô **Báo muốn nhận** (tiếng Nhật / tiếng Anh), mỗi số lấy 100 từ ở các deck người dùng chọn, **không theo deck đang xem**.

**Người dùng**
- Người Việt học tiếng Nhật, xưng "tớ". Trả lời bằng tiếng Việt, ưu tiên ví dụ cụ thể, bản mẫu, hình minh hoạ. Khi giải thích quá kỹ thuật, người dùng từng nói "chưa hình dung được": hãy cho xem thứ cụ thể trước rồi mới giải thích.
- Giáo trình GUNGUN của trung tâm: **N5 = chương 1–14, N4 = chương 15–33**. Đang học tới **chương 29** (kính ngữ: させてください, させていただけませんか, お〜します, お〜になる, お〜ください, 〜なさい).
- Máy: **Ubuntu 22.04**, **Anki 26.09.3** (Qt6, bật FSRS). Có sẵn một Claude Code trong thư mục tiếng Nhật chuyên đọc giáo trình và trích từ vựng ra file Anki. Dùng Claude Desktop (bản Linux beta) để đặt lịch. VOICEVOX chạy bằng Docker.

**Quy tắc vàng khi sửa**
- Python là nguồn sự thật cho xu, quyền sở hữu, chỗ đặt, chấm điểm. JS chỉ vẽ và gửi lệnh.
- Không bao giờ để xu hay game đụng tới lịch FSRS. Cây phải phản ánh trí nhớ thật.
- Dữ liệu từ deck và từ thư mục báo là **dữ liệu không tin cậy**: luôn làm sạch (`_clean_*`, `clean_issue`) và hiển thị bằng `textContent`.
- Giao diện, chú thích mã, tài liệu đều bằng **tiếng Việt** (kèm tiếng Nhật trang trí). Phong cách pixel: viền đen 3px, bóng cứng, không bo góc. **Không dùng emoji** (người dùng không thích): cần icon thì vẽ pixel 8×8 trong `web/icons.js` và viết `[i:tên]` trong chữ.
- Sửa xong phải chạy test và đóng gói theo mục 8.
- **Chữ trên giao diện (1.19.1, người dùng: "đơn giản, dễ hiểu, bỏ thông báo và diễn giải không cần thiết")**: mỗi thông báo một câu ngắn, nói điều cần biết; diễn giải (nếu thật cần) để ở chú thích rê chuột (`title`) hoặc khối thu gọn. Không dùng chữ "add-on" trên giao diện (viết theo hành động: "Gemini viết báo mỗi sáng"). Một khái niệm một tên, một hành động một động từ:

  | Khái niệm | Dùng | Không dùng lẫn |
  |---|---|---|
  | giao diện theo mùa / lễ hội | **Giao diện mùa** (tên tab, chip, nút, câu chữ; từng giao diện như "Mùa lá đỏ") | "Mùa & Lễ hội", "chủ đề", "giao diện theo mùa" |
  | bật / tắt | **Tự động / Tắt**, **Bật / Tắt** | "Thôi", "Đã tắt" lẫn "Tắt …" |
  | xem thử | **Xem thử / Dừng xem thử** | "Thôi xem thử" |
  | báo | **Báo** (tiếng Nhật / tiếng Anh) | "báo 畑新聞" trong câu chữ (畑新聞 chỉ là đầu báo trang trí) |
- **Nút chọn (1.19.1)**: nút đang chọn chỉ đổi nền vàng `#ffd23f`, giữ nguyên viền + bóng như nút bên cạnh; nút cùng hàng cùng font / cỡ chữ / đệm. `tests/anki/audit.js` đo "kiểu lệch" cho mọi hàng nút.

---

## 1. Giới thiệu

**ことば畑** mở bằng menu Tools → ことば畑 · Vườn từ vựng, từ 1.10 còn bằng nút **ことば畑** trên thanh trên cùng của Anki, phím **Ctrl+Shift+K**, hoặc **biểu tượng ngoài Anki** (màn hình nền / menu ứng dụng). Mỗi note của deck là một cây có 5 giai đoạn: Hạt giống → Mầm → Cây non → Ra hoa → Ra quả. Giai đoạn tính từ độ bền FSRS của thẻ yếu nhất. Cây khát khi có thẻ đến hạn và héo khi độ nhớ thấp. Ôn thẻ (trong vườn hoặc ở màn ôn thường của Anki) thì được xu. Xu dùng để xây nhà, trang trí, mở vùng mới, mua đồ cho linh vật StackChan và tự chế tác đồ pixel.

**畑新聞** là tờ báo làng của khu vườn. Mỗi sáng Claude Code đọc phạm vi đã học (giáo trình + tiến độ trong Anki), viết một số báo có tin làng, một kỳ truyện dài kỳ, お知らせ hoặc một cột ngắn, câu hỏi đọc hiểu và câu chép chính tả. Mọi chữ Hán đều có furigana. Báo vào hòm thư ngoài sân. Bấm vào từ để tra nghĩa, nghe giọng VOICEVOX, trả lời và chép để nhận xu.

```
Claude Code (6:00, tự chạy)                 Add-on ことば畑 (khi mở Anki)
  đọc: giáo trình → nguon/*.json               đọc: bao/<ngày>/bao.json + audio/
       pham_vi.json, tien_do.json, truyen.md         pham_vi.json (tra nghĩa)
  viết: bao/<ngày>/bao.json (+ audio, bao.html)  hiện: hòm thư, bảng 新聞, chép chính tả
                     ▲                                        │
                     └──────── tien_do.json ◄─────────────────┘
              (từ sắp héo, từ chép sai, các số chưa đọc)
```

---

## 2. Chức năng của add-on (đã có)

### 2.0 Mở nhanh (từ 1.10)
- Nút **ことば畑** (mầm pixel) trên thanh trên cùng của Anki, cạnh Bộ thẻ · Thêm · Duyệt · Thống kê · Đồng bộ (`toolbar_button`, mặc định bật). Phím **Ctrl+Shift+K** (macOS ⌘⇧K).
- **Biểu tượng ngoài Anki**: Tools → *ことば畑 · Tạo biểu tượng trên màn hình nền* (hoặc trong vườn ⚙ → *Tạo biểu tượng…*). Ubuntu: `kotoba-batake.desktop` ở màn hình nền + menu ứng dụng (thêm vào Dock được); Windows: `ことば畑.lnk` ở màn hình nền + menu Start (ghim vào thanh tác vụ được); macOS: `ことば畑.app` ở màn hình nền. Bấm là Anki tự mở (hoặc nhảy lên nếu đang chạy) và vào thẳng vườn.
- Cách làm: biểu tượng mở file vé `user_files/kotoba_batake_open.apkg` bằng Anki (như bấm đúp một file .apkg); add-on bọc `mw.handleImport`: gặp đúng file vé thì mở vườn, file khác vẫn nhập như cũ (`launcher.py`).

### 2.1 Khu vườn (màn chính)
- Tối đa `max_plants` cây (mặc định 400, ưu tiên cây đã học). Bấm cây để ghim thẻ thông tin: chữ, cách đọc (tiếng Anh: IPA), nghĩa, Hán Việt (chỉ chữ Hán, từ 1.17), nút nghe, số ngày tới hạn.
- Thanh trên: linh vật, chọn deck, xu, ⚙ cài đặt, Nhà, Trò chơi, Tưới ngay (1.15: số cây khát là con số nhỏ trên nút này).
- Góc phải trên của sân (1.15): **một thẻ "Hôm nay"** — "Hôm nay X/30 lượt · N ngày liền" + biểu tượng thời tiết (tooltip ghi buổi / thời tiết, bấm để đổi), thanh tiến độ, và các dòng việc chỉ hiện khi có: "Nhiệm vụ 0/3 ▸", "Báo mới N · Chép x/5 ▸", "🐾 thú đói · 🔧 Sửa nhà ▸", "⚠ Cấu hình trường ▸". Trước 1.15 đây là 6 chip rời (người dùng thấy rối). Gợi ý "Nhà & Cửa hàng ▸" chỉ hiện khi rê chuột lên sân.
- Phím tắt: **R** ôn, **T** trò chơi, **N** nhà, **Q** nhiệm vụ, **B** báo & chép chính tả, **← →** đổi cảnh ngoài trời (1.7), **Esc** đóng, **F11** toàn màn hình. Khi đang ôn thẻ thì R/T/N/B không có tác dụng (có chủ ý).
- Góc dưới trái sân (1.7): nút **◂ Tên cảnh · n/N ▸** đổi nhanh giữa sân nhà và các vùng đã mở. (Bản ≤ 1.14: sân thấp thì chip bên phải xếp 2 hàng.)

### 2.2 Ôn thẻ trong vườn ("Tưới ngay")
- Dùng scheduler v3 thật của Anki, ghi revlog như ôn bình thường. Thẻ hiện trong một iframe dựng một lần nên lật thẻ không giật. Hỗ trợ `[[type:...]]`, audio, CSS mẫu thẻ, hook `card_will_show`.
- Ôn ở màn ôn thường của Anki cũng được xu và tính nhiệm vụ (hook `reviewer_will/did_answer_card`).

### 2.3 Xu, mục tiêu ngày, nhiệm vụ
- +1 xu mỗi lần nhớ (Khó/Được/Dễ); cây lên giai đoạn được thêm `2 × giai_đoạn_mới`.
- Mục tiêu ngày 30 lượt → +15 xu.
- 3 nhiệm vụ mỗi ngày (+20 xu mỗi cái), xong cả 3 mở rương: +30 xu và 1 món hiếm.
- **Bù xu cho lượt ôn trên điện thoại (1.11, `mobile_coins`)**: lượt ôn không qua add-on (AnkiDroid, AnkiMobile, máy chưa cài add-on) được bù khi mở hồ sơ, sau đồng bộ và khi vườn làm mới: +1 xu / lượt nhớ được, cộng vào nhiệm vụ hôm nay (ôn thẻ đến hạn, học thẻ mới), thưởng mục tiêu ngày còn thiếu. 14 ngày gần nhất, không trả hai lần, chỉ tính từ lúc cài 1.11. Không bù thưởng lên giai đoạn, nhiệm vụ "tưới liền" / "giúp cây lớn". Thông báo 📱 trong vườn, tooltip ngoài vườn; ⚙ ghi tổng đã bù.

### 2.3b Báo lỗi (từ 1.11)
- ⚙ → **Báo lỗi…** hoặc menu **Tools → ことば畑 · Báo lỗi** (mở được cả khi vườn hỏng). Cửa sổ Qt có báo cáo sửa được: phiên bản add-on / Anki / Python / Qt, hệ điều hành, cửa sổ / màn hình, trình duyệt nhúng, cấu hình khác mặc định, tóm tắt vườn, add-on khác đang bật, chỗ mô tả lỗi, 15 lỗi mới nhất. Nút Chép / Lưu ra file… / Xoá nhật ký lỗi / Đóng.
- Nhật ký `user_files/errors.json` (không đồng bộ): lỗi Python đã bắt (`_warn`), lỗi lệnh cầu nối (vẫn ném ra cho Anki báo), lỗi JS của trang (`web/diag.js`, gộp trùng). Trang gặp lỗi JS lần đầu thì nhắc "⚠ Vườn vừa gặp lỗi…" một lần.
- Không có tên deck, nội dung thẻ, tên hồ sơ; thư mục nhà → `~`; `bao_dir` chỉ ghi "(đã đặt)". **Không gửi gì lên mạng.**

### 2.4 Năm mini-game (không ghi vào FSRS, tối đa 40 xu/ngày)
Nghe tìm cây (`listen`), Chợ sáng (`market`), Đuổi quạ (`crow`, gõ romaji/kana/kanji, 4 tốc độ), Lật cặp (`memory`), Điền vào câu (`cloze`, dùng câu ví dụ của note).

Từ 1.9: đầu menu chọn **loại note để ôn** (chỉ hiện loại có trong deck); mỗi trò có **chế độ** (mục đầu là mặc định, lưu trong collection). 1.17: bảng chọn trò trở lại kiểu 1.15 (thẻ to 3 cột); loại note, kiểu chơi, tốc độ quạ là **drop-down** dưới thẻ; thêm nhóm **Tiếng Anh** và **Ngôn ngữ khác**:

| Trò | Từ vựng | Chữ Hán | Ngữ pháp |
|---|---|---|---|
| Nghe tìm cây | Nghe → chọn chữ / nghĩa | Nghe → chọn kanji / Hán Việt | Nghe câu ví dụ → chọn mẫu |
| Chợ sáng | Trộn / Nghĩa → Từ / Từ → Nghĩa / Cách đọc → Từ | Hán Việt → Kanji / Nghĩa → Kanji / Kanji → Hán Việt / Kanji → On/Kun / Trộn | Trộn / Nghĩa → Mẫu / Mẫu → Nghĩa |
| Đuổi quạ | Nghĩa → gõ từ / Chữ → gõ cách đọc | Kanji → gõ On/Kun / Hán Việt → gõ âm hoặc chữ | không hỗ trợ |
| Lật cặp | Trộn / Từ ↔ Nghĩa / Từ ↔ Cách đọc | Kanji ↔ Hán Việt / Nghĩa / On/Kun / Trộn | Mẫu ↔ Nghĩa |
| Điền vào câu | điền từ | điền chữ Hán vào từ / câu ví dụ | điền mẫu (kể cả mẫu đã chia) |

**Tiếng Anh (1.17)**: Nghe tìm cây (audio của deck, không có thì giọng tiếng Anh của máy), Chợ sáng (Trộn / Nghĩa → Từ / Từ → Nghĩa / Phiên âm → Từ), Đuổi quạ **Nghĩa → gõ từ tiếng Anh** (chính tả, hoa thường không tính), Lật cặp (Trộn / Từ ↔ Nghĩa / Từ ↔ Phiên âm), Điền vào câu (nhận went / studying / stopped / cities / looked up / children / happier…). **Ngôn ngữ khác**: trò chung, không có Đuổi quạ.

Thiếu trường cần cho trò / chế độ thì nút đó bị khoá và ghi lý do ("Cần ít nhất 4 chữ có audio (hiện có 0). Chọn trường ở ⚙ Cấu hình trường.").

### 2.4b Cấu hình trường theo loại note (từ 1.9)
- Bảng **Cấu hình trường** (mở từ chip **⚠ Cấu hình trường ▸** ở góc sân, thông báo bật lên khi deck có loại note chưa cấu hình (bấm vào là mở), ⚙ → *Cấu hình trường…*, hoặc nút trong menu Trò chơi). Mỗi loại note (note type) chọn: **Từ vựng / Chữ Hán / Ngữ pháp / Khác** rồi chọn trường cho từng vai trò, có cột giá trị của 5 note mẫu và dòng "Trên cây: …", dòng "Trò chơi" báo trò nào chơi được.
- 1.17: thêm drop-down **Ngôn ngữ** (Tiếng Nhật / Tiếng Anh / Ngôn ngữ khác — tự đoán từ chữ của trường Từ, lưu ở khoá `lang` khi bấm Lưu); Loại cũng là drop-down; cảnh báo khi trường Từ có vẻ nhồi chung cả nghĩa.
- Vai trò: **Từ vựng** — Từ *, Cách đọc (furigana), Nghĩa *, Câu ví dụ, Dịch câu ví dụ, Audio của từ, Audio câu ví dụ (1.17 bỏ Âm Hán Việt, Loại từ). **Từ vựng tiếng Anh** — như trên, Cách đọc thành **Phiên âm (IPA)**. **Chữ Hán** — Kanji *, Hán Việt *, Nghĩa, Âm On (hoặc On/Kun chung), Âm Kun (nếu tách riêng), Ví dụ, Dịch ví dụ, Audio. **Ngữ pháp** — Cấu trúc *, Nghĩa *, Cách dùng / ghi chú, Ví dụ, Dịch ví dụ, Audio ví dụ. **Khác** — vẫn là cây nhưng không vào trò chơi. (* = bắt buộc.)
- Điền sẵn theo gợi ý tự động; lưu thì kiểm tra trường bắt buộc; có Hoàn tác / Dùng gợi ý tự động. Loại note chưa cấu hình vẫn chạy bằng cách đoán tên trường như ≤ 1.8; đã cấu hình thì chỉ dùng đúng trường đã chọn. Đổi tên / xoá trường đã chọn → báo lại.
- Cây ngữ pháp: bấm vào hiện cách dùng và nút ♪ Nghe ví dụ.

### 2.5 Nhà & Cửa hàng (10 tab theo thứ tự: Xây nhà · Trang trí sân · Nội thất · Vùng mới · Thú nuôi · Giống cây · Giao diện mùa · Tủ đồ · Xưởng · Kho đồ; 1.17.2 bỏ vạch ngăn nhóm, các tab bằng nhau)
Xây nhà 8 bậc (3.430 xu) → 3 kiểu nhà (minka, chashitsu, lâu đài mini); 39 món trang trí / nội thất (14 món mới ở 1.7: hướng dương, chong chóng gió, nhà chim, giếng, xích đu, đài phun nước, ikebana, đèn andon, radio, bể cá, bếp irori, lịch treo tường hiện đúng ngày, tranh chữ 学, tranh sóng lừng) và 6 món hiếm; 6 vùng mở lần lượt (Bãi biển 2.000, Đền trên núi 3.000, Phố lễ hội 4.000, và 1.7: **Rừng tre** 5.000, **Suối nước nóng** 6.000, **Ga làng quê** 7.000 có tàu chạy qua, mỗi vùng 6 món); tủ đồ StackChan (17 món đồ mặc, 7 biểu cảm); Xưởng chế tác (vẽ pixel 16/24/32 hoặc chuyển ảnh, 10 hiệu ứng, vẽ đối xứng, lật dọc, dịch hình); Kho đồ. Thẻ trong cửa hàng có dòng ✦ mô tả hiệu ứng và nhãn **Mới** (từ 1.8 chỉ dành cho đồ theo mùa). Tổng mua hết khoảng 55.000 xu (bản 1.6: 31.000), chưa tính Giao diện mùa (14 giao diện × 1000 xu).

### 2.5b Giao diện mùa (tab thứ 8, từ 1.8; tên cũ "Mùa & Lễ hội", đổi ở 1.19.1)
- **14 chủ đề**: 4 mùa (Xuân, Hạ, Thu, Đông) + Tết Nguyên Đán, Giáng sinh, お正月, Trung thu · お月見, Halloween, Mùa lá đỏ 紅葉, Thất Tịch 七夕, Lễ hội mùa hè 夏祭り, Mùa mưa 梅雨, Hoa anh đào 花見. Mỗi chủ đề kèm 2–4 món đồ (tổng 40 món: 36 ngoài trời, 4 trong nhà).
- **Mở khoá**: 1000 xu **hoặc** chuỗi ngày ôn liên tiếp (mùa 7 ngày, lễ hội 10 ngày; mỗi lần đổi dùng hết chuỗi đang có). Mở là được tặng các món của chủ đề; mua thêm được khi đã mở. Có nút **Xem thử** trước khi mở (1.18: cả chủ đề đã mở mà chưa dùng; Xem thử **phát luôn nhạc của chủ đề**).
- Hai nút **Tự động** (theo lịch, mặc định) / **Tắt**; bấm **Dùng ngay** ở một giao diện đã mở là chọn tay. Lịch: Giáng sinh 15/11–31/12, お正月 1–15/1, Tết từ 21 ngày trước mùng 1 tới rằm tháng Giêng, Trung thu 14 ngày trước – 3 ngày sau rằm tháng Tám (Tết và Trung thu tính bằng **âm lịch Việt Nam**), Halloween tháng 10, Mùa lá đỏ 1/11–10/12, Thất Tịch 25/6–7/7, Lễ hội mùa hè 15/7–31/8, Mùa mưa 1/6–10/7, Hoa anh đào 20/3–15/4, 4 mùa theo tháng. Trùng nhau thì lễ hội thắng mùa (thứ tự trong `season_core.THEMES`).
- **Đổi gì**: dải trang trí trên cùng trang, hạt rơi ở nền trang và trên ruộng, màu trang / chữ ことば畑 / cỏ ruộng; ở sân, mọi vùng và trong phòng: dây trang trí (đèn Noel, đèn lồng Tết, shimenawa, cờ Halloween, đèn ông sao…), màu đồi và đất, tuyết phủ (đông, Giáng sinh), hạt bay, trăng rằm có thỏ, trăng Halloween, Ngân Hà, pháo hoa đêm (Tết, lễ hội hè), diều, xe tuần lộc bay; thời tiết tự đổi nghiêng theo mùa; nhạc vườn riêng cho từng chủ đề (1.8: Giáng sinh, Tết, Halloween; 1.18: cả 14 chủ đề — các lễ Nhật dùng thang âm Nhật yo / in / miyako-bushi / Ryukyu, tiếng gảy kiểu koto / shamisen, chuông, mõ gỗ); chip chủ đề trên thanh trên cùng (chưa mở thì nhấp nháy mời mở khi lễ đang tới); linh vật chào theo mùa.
- **1.10**: cây và đất riêng của từng vùng theo chủ đề (rừng ở Đền đỏ / cam mùa thu và lá đỏ, điểm hoa mùa hoa anh đào / Tết, tuyết trên ngọn; Suối nước nóng cỏ xanh mùa xuân hè, cỏ úa mùa thu, tuyết mùa đông — không có chủ đề thì vẫn tuyết như cũ; lúa ở Ga làng quê chín theo chủ đề; cỏ Rừng tre / Ga pha màu đất chủ đề). **Màn trò chơi** theo giờ + thời tiết + chủ đề: Chợ sáng và Đuổi quạ có đêm (sao, trăng, trời dịu hơn vườn để vẫn đọc rõ), mây / mưa / tuyết, đất phủ tuyết, dây trang trí, hạt bay, pháo hoa; menu và 3 trò còn lại có nền pha màu chủ đề + hạt bay phía sau.

### 2.6 Trời, thời tiết, âm thanh
Giờ thật / giờ game / cố định, 6 buổi trong ngày, thời tiết đổi mỗi 3 giờ (mưa, giông, tuyết theo mùa), ban đêm có đèn và đom đóm. Âm thanh 8-bit và 3 bản nhạc nền chiptune tự soạn (+ 14 bản theo giao diện mùa, 1.18), **phát ngay khi mở vườn** (1.7). Hiệu ứng 1.7: vũng nước gợn sóng ở lớp mặt đất (không đè nhà), giọt nước bắn, cầu vồng khi vừa tạnh, tuyết đọng trên mái và đồ vật, giông làm đồ đung đưa mạnh, chim bay ban ngày, sao băng đêm quang, hạt theo mùa thật (hoa xuân, chuồn chuồn hè, lá đỏ thu).

### 2.6b Giao diện tự chỉnh (1.14) — ⚙ → *Giao diện & chế độ học…*
- Người dùng yêu cầu: "khi ôn thẻ, mọi người có thể không muốn nhìn khung cảnh nhà bên dưới vì chuyển động mất tập trung (nhưng tớ thì thích), hoặc mode học sẽ có giao diện khác, người dùng tự custom".
- 3 chế độ, mỗi chế độ một cột: **Màn chính**, **Khi ôn thẻ**, **Trò chơi & báo** (đang mở Trò chơi / Báo / Cấu hình trường). Mỗi chế độ chọn: cảnh sân và ruộng (chuyển động / đứng yên / mờ, đứng yên / ẩn), hạt bay theo mùa, mưa tuyết, thú nuôi trên sân, linh vật nói chuyện, hiệu ứng thành tích. Chung: màu bảng ôn (vàng vườn / trắng giấy / tối — thẻ cũng tối) và khung thẻ (vừa / to hết chỗ).
- 4 kiểu có sẵn: **Đầy đủ** (mặc định, y như cũ), **Tập trung khi ôn** (ôn thì ẩn sân + ruộng, tắt hạt bay / mưa / linh vật nói, khung thẻ to), **Dịu mắt** (đứng yên ở mọi màn), **Ôn buổi tối** (bảng ôn tối, sân + ruộng mờ).
- Nút **Ẩn vườn / Hiện vườn** trên bảng ôn bật tắt nhanh. Màn chính chọn "ẩn" sân thì chỉ ẩn hình, thẻ Hôm nay nằm ngang một hàng.
- Lưu ở `config.json` → `ui` (chỉ máy này, như âm thanh / trời). Nhà & Cửa hàng luôn đầy đủ.

### 2.6c Chỗ tiêu xu mới (1.14)
- **Sửa nhà** (đầu tab Xây nhà): có tường thì nhà cũ 1 nấc mỗi 7 ngày Anki: rêu bám → sơn bong → ngói lệch → mái dột (mưa thì nhỏ giọt, trong nhà có xô hứng). Tối đa 4 nấc, không bao giờ sập / mất đồ. 1 nấc ≈ 3% giá nhà (105 xu khi xây xong), sửa hết hoặc sửa 1 nấc; vắng ≥ 14 ngày rồi quay lại thì giảm 50% trong 7 ngày. Chip "🔧 Sửa nhà" ở góc sân từ nấc 2.
- **Thú nuôi** (tab Thú nuôi): Gà mái 500, Vịt con 600, Thỏ trắng 700, Rùa 800, Mèo mướp 900, Chó Shiba 1.200 xu; ăn 1–4 xu / ngày. Chạy trên sân / vùng / trong nhà (mèo, thỏ, rùa), ngủ ban đêm, mưa thì trú gần nhà. Quên cho ăn 1 ngày: đói (bong bóng bát cơm); 2 ngày: đi chơi, cho ăn là về — không chết, không bỏ đi. Thân thiết theo số ngày được cho ăn (7 / 21 quàng khăn / 50 lấp lánh). Đặt tên, chọn chỗ ở, cho cả nhà ăn, tự cho ăn khi mở vườn. Chip "🐾 … đói".
- **Giống cây** (tab Giống cây): 8 giống (Lúa, Củ cải, Hướng dương, Bí ngô, Tre, Anh đào, Phong lá đỏ, Bonsai thông; 600–1.500 xu), mỗi giống 5 hình. Gán theo tag → loại note → deck (deck con trước rồi deck cha) → cây gốc, hoặc *Trộn*. Chỉ đổi hình, cây vẫn lớn theo FSRS.
- **Vùng tự tạo** (cuối tab Vùng mới): 5.000 xu, tối đa 6. Tên, 8 kiểu nền, màu đất / đồi, công trình 64×76 vẽ bằng Xưởng (hoặc chuyển ảnh; 1.15 thêm kẻ thẳng, chữ nhật, cỡ bút 1–3, làm lại cho dễ vẽ hình to). **1.16: vẽ được cả cảnh nền 256×76** (lớp "Cảnh nền" trong Xưởng: vẽ đè lên nền có sẵn, nền thật hiện dưới lưới, phóng to ×1–×4 + cuộn, chuyển ảnh phong cảnh được; vẽ lại 50 xu; lưu ở khoá `zenv` của `kotoba_batake_more`). Đặt đồ ngoài trời, thả thú nuôi, có trong nút ◂ ▸. Sửa tên / nền miễn phí, vẽ lại công trình 50 xu; xoá thì đồ về kho.

### 2.6e Bản 1.16 (bản chốt)
- Người dùng: "không thích giao diện học thẻ màu đen", "sắp xếp các phần trong trò chơi bị lộn xộn", "đồ hiếm khi hoàn thành nhiệm vụ có bao nhiêu đồ, nếu ít thì nên vẽ thêm", "vẽ công trình chỉ vẽ được nhà chứ không vẽ được môi trường xung quanh hả".
- **Đồ hiếm**: trước chỉ 6 món (6 ngày đủ nhiệm vụ là hết) → thêm 12 món (Hươu Nara, Cầu cong đỏ, Tháp chùa năm tầng, Quầy mì yatai, Kappa, Miếu nhỏ hokora, Vườn đá cát cào; Mũ giáp kabuto, Đàn koto, Bình phong hạc, Mặt nạ cáo, Đàn shamisen), đều có chuyển động. Rương tặng 6 món cũ trước rồi tới món mới. Lưu cùng tầng `kotoba_batake_season` (bản 1.8–1.15 giữ hộ món lạ ở tầng này).
- **Ôn tối "Đêm vườn"**: chỉ hiện khi chọn Màu bảng *Đêm vườn* hoặc kiểu *Ôn buổi tối* (mặc định vẫn vàng). Thay xám đen bằng xanh đêm có sao + trăng, chữ kem, nút Lật thẻ vàng đèn lồng.
- **Bảng Trò chơi** (1.17 người dùng muốn trở lại kiểu 1.15 → đã đổi lại, kèm drop-down): 5 thẻ cùng cỡ (một hàng / 3 + 2 căn giữa / 2 cột theo cỡ cửa sổ), kiểu chơi + tốc độ quạ nằm trong thẻ, một nút Cấu hình trường (không còn băng cảnh báo to + nút trùng), xu game hôm nay thành ô nhỏ ở thanh trên.

### 2.6f Bản 1.17 — tiếng Anh, furigana mọi kiểu, Trò chơi kiểu cũ + drop-down
- Người dùng: "thêm hỗ trợ tiếng Anh, thêm cách xử lý nhiều kiểu định dạng furigana, phần trò chơi muốn giao diện cũ (1.15), các lựa chọn chỉnh dạng drop-down cho gọn, bỏ hẳn cái không cần thiết (vd. Hán Việt ở từ vựng), giao diện gọn gàng".
- **Furigana** (`text_core.py`): ngoặc vuông Anki + okurigana, ruby HTML (`<rb>`, `<rp>`, nhiều `<rt>`), Migaku `[かんじ;h,1]`, `漢字（かんじ）` / `【】` / hai dòng ở trường Từ (không tách `賛成(する)`), trường Cách đọc dạng `漢字[かんじ]`. Câu ví dụ ruby dùng được cho Điền vào câu, chép chính tả.
- **Tiếng Anh**: ngôn ngữ theo loại note (khoá `lang`, `games_lang` cấp trên cùng của `kotoba_batake_fields` để bản 1.16 không xoá), IPA, 5 trò chơi, chép chính tả chấm theo từ, giọng `en_US` của máy. Báo ở 1.17 vẫn chỉ tiếng Nhật (1.19 có báo tiếng Anh, mục 2.6g).
- **Gọn**: bảng Trò chơi về kiểu 1.15 + drop-down; Cấu hình trường dùng drop-down; Từ vựng bỏ Hán Việt + Loại từ; `hanviet_field` bỏ khỏi config.

### 2.6g Bản 1.19 — báo tiếng Anh (The Garden Gazette)
- Người dùng: "hiện thực phần báo Tiếng Anh nhé" (bước 6 cuối cùng của kế hoạch tiếng Anh 1.17; kế hoạch đã xong nên xoá `KE_HOACH_TIENG_ANH.md`) + "test lại phần báo Tiếng Nhật luôn" (khoá Gemini qua proxy của phiên Claude Code trên web).
- ~~**Ngôn ngữ báo theo deck đang xem**~~ (1.19.1 bỏ, xem 2.6h) (ngôn ngữ có nhiều cây nhất; bằng nhau thì tiếng Nhật). Tiếng Nhật: như cũ. Tiếng Anh: báo *The Garden Gazette* do **Gemini** viết (cần khoá; kotoba_daily chỉ tiếng Nhật). Ngôn ngữ khác: tab Báo ghi "Báo chưa hỗ trợ ngôn ngữ này — hiện có tiếng Nhật và tiếng Anh", chip chỉ "Chép x/5", không gọi Gemini. Kệ báo có nút **Đọc báo: tiếng Nhật / tiếng Anh** khi máy có báo của ngôn ngữ kia.
- **`ai_en.py`** (mới): phạm vi = từ tiếng Anh của deck đang xem (cần ≥ 10 từ có nghĩa), trình độ **CEFR A1–C1** (`gemini_level_en`, mặc định A2) + danh sách ngữ pháp CEFR tự soạn, truyện dài kỳ riêng "The Little Café by the Garden" (Linh, Hana, StackChan, Mr. Oakley, Ben ở Kotoba Village). **Gemini viết chữ trơn; máy tự nối tra từ** `{chữ trong bài||từ gốc}` theo dạng gốc (went → go, cities → city, looked after → look after; chống nhầm news / new, evening / even, corner / corn, teacher / teach, bed / be; tên riêng viết hoa giữa câu không nối). Kiểm tra máy: lẫn tiếng Việt / chữ Nhật, phần tiếng Việt có dấu, độ dài theo trình độ, ≥ 4 từ của deck, câu hỏi một đáp án, câu chép nguyên văn (ưu tiên câu không có tên riêng). Cùng khung `Job` của báo tiếng Nhật (viết → sửa máy → Gemini sửa → soát lần 2 → kiểm tra lại; bản soát bỏ hơn nửa số từ của deck thì giữ bản trước).
- **Lưu trữ**: thư mục `user_files/bao_gemini_en/`, `bao.json` có `"ngon_ngu": "en"`; trạng thái đọc ở khoá mới `kotoba_batake_paper_en` (báo Nhật / Anh cùng ngày có cùng id `p:<ngày>:<i>`; bản ≤ 1.18 không biết khoá này nên không xoá). Hạn mức Gemini đã hết của model dùng chung giữa báo Nhật / Anh / giọng đọc.
- **Thử Gemini thật** (04/11/2026, gói miễn phí): số tiếng Anh A2 ok bằng `gemini-3.6-flash` (bản đầu 0 lỗi máy, soát sửa 1 chỗ, 3 lượt gọi chữ, 3 giọng đọc `gemini-3.8-flash-tts` nghe lại khớp từng chữ trừ tên riêng → từ đó câu chép tránh tên riêng); số tiếng Nhật N4 theo giáo trình — xem `tests/README.md`.

### 2.6h Bản 1.19.1 — báo theo ô "Báo muốn nhận", chọn deck, nút chọn đều, chữ gọn
- Người dùng hỏi: "phải chọn deck xong mới viết báo được hả?" (lần cuối học deck tiếng Anh thì báo thành tiếng Anh; học N4 mà ôn deck N5; deck môn khác thì không có báo) → chốt (04/11): ô **Báo muốn nhận: ☑ Tiếng Nhật ☐ Tiếng Anh**; **chọn tối đa 5 deck, 100 note** mỗi số, không chọn thì ngẫu nhiên; **70% chưa thuộc / 30% đã thuộc** theo định nghĩa của người dùng: *chưa thuộc = hôm đó có lịch ôn, đã thuộc = hôm đó không có lịch ôn*; từ không liên quan nhau vẫn thành bài (Gemini chọn chủ đề theo khoảng 20 từ trọng tâm, không ép dùng hết).
- **`words_core.py`** (mới, chỉ import `anki`): đọc thẳng collection theo **loại note** (ngôn ngữ của loại note — Cấu hình trường / tự đoán — nên deck trộn hai thứ tiếng vẫn lấy đúng; không cần bảng gán deck → ngôn ngữ). `lang_decks` (deck có note của ngôn ngữ, kèm số note, kể cả deck con), `pick` (100 note: `is:due` → chưa thuộc, đã ôn mà không đến hạn → đã thuộc, thiếu nhóm này thì bù nhóm kia; ngẫu nhiên theo ngày; nhiều deck thì xoay vòng cho đều; đã học < 30 từ thì thêm thẻ mới **của chính các deck đã chọn**, không lấy deck khác; chữ Hán đơn / ngữ pháp không vào kho 100 từ; kèm danh sách mọi từ đã học ≤ 3000 để máy kiểm tra / nối tra từ), khoá collection mới `kotoba_batake_paper_src`.
- Lời nhắc chỉ gửi **100 từ** (`scope["kho"]`), đánh dấu **20 từ trọng tâm** trong nhóm phải ôn, dặn "dùng được bao nhiêu thì dùng, tối thiểu khoảng 8, đừng ép câu", chọn chủ đề theo nhóm từ (số đếm / giờ / giá → Thông báo; động từ / cảm xúc → Truyện; nơi chốn / thời tiết → Tin làng). Dùng ít từ trọng tâm chỉ là gợi ý cho bước soát. Deck đã chọn < 10 từ thì không gọi Gemini, khối báo ghi "Deck đã chọn mới có N từ — chọn thêm deck". Thử thật 04/11: số tiếng Nhật N4 ~4.900 token (1.19.0: ~30.000), dùng 10 / 20 từ trọng tâm; số tiếng Anh A2 ~3.800 token, dùng 31 / 70 từ phải ôn, 0 lỗi máy.
- Tự viết lần lượt các báo đã tick (`ai_start_all`; một việc nền một lúc, xong báo này thì báo kế tiếp). Hòm thư / chip Báo / nhiệm vụ cộng số chưa đọc của mọi báo đã tick; mở bảng Báo vào báo có số chưa đọc (tiếng Nhật trước) và giữ báo đó tới khi đóng bảng. Bỏ màn "Báo chưa hỗ trợ ngôn ngữ này", nút "Theo deck đang xem", `deck_lang`. Báo Gemini lấy từ chép sai thẳng từ trạng thái báo (`_loi_sai`), không qua `tien_do.json`; `tien_do.json` cho bộ kotoba_daily (Claude Code) vẫn ghi theo deck đang xem như cũ. Lượt Chép chính tả hằng ngày giữ nguyên (theo deck đang xem).
- Tab **Nguồn báo**: hàng *Báo muốn nhận*; thẻ Gemini có một khối cho mỗi báo đã tick (Hôm nay · Từ phải ôn "dùng 14 / 70 từ" · Trình độ · **Lấy từ: Mọi deck / Chọn deck (≤ 5) / Giáo trình**); một ô giọng chung. Máy đã có báo tiếng Anh của 1.19.0 thì lần đầu mở tự tick cả hai (`gemini_langs` ghi một lần).
- **Màn trống của bảng Báo** (người dùng gửi ảnh màn "Báo chưa hỗ trợ" của 1.19.0: "nút sắp xếp, bố cục chưa hợp lý"): hàng chuyển báo luôn ở trên cùng như Kệ báo; tiêu đề → một câu (nếu cần) → **một hàng nút** cách đều (Viết số hôm nay · Nguồn báo · Chép chính tả). Lượt chép: dòng hướng dẫn và nút Ẩn furigana theo ngôn ngữ của câu hôm nay (deck tiếng Hàn vẫn có câu báo tiếng Nhật), không theo deck đang xem.
- **Phần B / C**: nút chọn đều nhau (mục 0), chữ gọn theo bảng thuật ngữ (mục 0): tab "Giao diện mùa", nút Tự động / Tắt, Dừng xem thử, bỏ chữ "add-on", rút các câu > 100 ký tự còn một câu, hướng dẫn cài giọng vào khối thu gọn.

### 2.6d Hiệu ứng thành tích (1.14)
- **Xong hết thẻ hôm nay** (deck đang xem không còn thẻ mới / đang học / ôn, và hôm nay đã ôn): cầu vồng + giọt sương lấp lánh trên ruộng, cầu vồng trên trời sân. **Đạt mục tiêu ngày**. **Cả vườn xanh tốt / ra hoa / trĩu quả** (≥ 5 cây, không cây héo): lá lấp lánh / cánh hoa anh đào bay / đốm sáng vàng. **Mốc chuỗi ngày** (7, 14, 21, 30, 50, 100… ngày): pháo hoa trên sân. **Xong 3 nhiệm vụ**: đèn trời bay lên.
- Huy hiệu cạnh chú thích ruộng; dải chúc mừng + linh vật chúc mỗi thành tích một lần mỗi ngày; đang ôn thì để dành tới lúc đóng bảng ôn. Tắt được theo chế độ ở bảng Giao diện.

### 2.7 Báo 畑新聞 & chép chính tả (bản 1.6, 1.6.1)
- Nối báo bằng config `bao_dir` (đường dẫn thư mục `kotoba_daily`, có thể dùng `~`). Chưa nối thì tab Báo hiện hướng dẫn; tab Chép chính tả vẫn chạy bằng câu ví dụ trong deck.
- Mở bằng: bấm **hòm thư** ngoài sân (cờ đỏ dựng khi có số chưa đọc; chưa nối báo thì cờ thỉnh thoảng dựng cho vui như bản cũ), chip trên sân, hoặc phím **B**.
- Bảng **新聞** có 3 tab:
  - **Báo**: số mới nhất chưa đọc. Furigana ẩn/hiện; bấm từ gạch chân → nghĩa, bài đã học, giai đoạn của cây cùng tên; ▶ nghe từng đoạn; truyện có "Kỳ trước" và nhắc nếu kỳ trước chưa đọc (nút "Đọc kỳ trước"); câu hỏi đọc hiểu; chép chính tả của số đó (Nghe / Nghe chậm); mẫu câu ở cuối; dòng ghi công VOICEVOX.
  - **Chép chính tả**: lượt 5 câu mỗi ngày (xem mục 6). Gõ kana, kanji hoặc romaji. Từ 1.13 chạy với mọi kiểu deck (mục 2.7c).
  - **Kệ báo**: mọi số theo ngày (Mới / Đã đọc / Xong +N xu), đọc bù lúc nào cũng được.
- Hai loại nhiệm vụ mới: `paper` (đọc xong 1 số báo), `dict` (chép đúng 3 câu). Chỉ xuất hiện khi làm được hôm đó.
- Add-on ghi `<bao_dir>/tien_do.json` để báo hôm sau nhắc lại từ yếu và biết có bao nhiêu số chưa đọc.

### 2.7b Báo do Gemini viết (1.12) — tab **Nguồn báo**
- Bảng 新聞 có thêm tab **Nguồn báo** (mở cả từ ⚙ → *Nguồn báo (Gemini / Claude Code)…*). Chưa có nguồn nào thì tab Báo tự chuyển sang đây. Hai thẻ: **✦ Gemini** (dễ nhất) và **Claude Code** (bộ kotoba_daily, nút *Chọn thư mục…* thay cho sửa `bao_dir` bằng tay). Chọn một nguồn (`bao_source`).
- Gemini, 3 bước: *Mở trang lấy khoá ↗* (aistudio.google.com/apikey) → dán khoá → *Thử khoá*. Đúng thì lưu khoá (chỉ trên máy, không đồng bộ, không vào Báo lỗi) và viết luôn số hôm nay (1–2 phút, chạy nền; chip sân "Báo: Gemini đang viết…" rồi "Báo mới 1").
- Sau đó thẻ Gemini hiện: khoá (che), model, số hôm nay (*Đọc ngay* / *Viết số hôm nay* / *Tạo giọng đọc còn thiếu*), lỗi, phạm vi; chọn **trình độ** N5–N1 (khi theo deck), **lấy từ** giáo trình (kotoba_daily) / deck đang xem, **giọng đọc** (Câu chép chính tả / Cả bài / Tắt) + tên giọng, **tự viết mỗi ngày**; *Gemini đã viết và tự sửa những gì* (nhật ký); *Xoá khoá khỏi máy* (bấm 2 lần).
- Mỗi số: Gemini viết (JSON đúng khuôn) → máy tự sửa chỗ chắc chắn → máy kiểm tra (romaji, furigana, chữ Trung, ký tự lạ, cách đọc theo deck, `[3日|みっか]`, câu chép có trong bài, câu hỏi…) → gửi đúng danh sách lỗi cho Gemini sửa (≤ 2 lần) → **Gemini soát lần 2** như biên tập viên → kiểm tra lại. Còn lỗi thì **không lưu**. Khoảng 3–6 lượt gọi chữ + 4–6 lượt gọi giọng đọc mỗi ngày.
- Báo Gemini đọc / chấm / chép y như báo kotoba_daily (cùng `paper_core`). Dòng cuối ghi "Giọng đọc: Gemini TTS:Kore. Báo do Gemini (<model>) viết tự động…".
- **Sửa ở 1.13 (sau khi thử khoá thật, gói miễn phí)**:
  - *Giọng đọc*: model TTS 3.8 trả **file WAV** (có khối chữ ký C2PA ở cuối) chứ không phải PCM thô → 1.12 ghi cả header vào âm thanh (tiếng "bụp" đầu, ~0,13 s rè cuối, to gấp ~3 lần giọng). Giờ `decode_audio` nhận cả WAV lẫn `audio/l16`; mở vườn lần đầu thì tự sửa file cũ (`repair_audio`, chạy nền).
  - *Bản đọc chậm*: model TTS 3.8 đọc to luôn câu dặn tiếng Anh "Say slowly…" nên 1.12 luôn bỏ bản chậm. Giờ bản chậm **tạo ngay trên máy** (`stretch`, WSOLA thuần Python, 0,75×, không đổi cao độ, ~0,8 s cho một câu) — không tốn lượt gọi; số cũ được tạo bù.
  - *Chọn model*: thử **mọi** model chữ (cả Flash-Lite, trước chỉ 4 model Flash đầu), model đã chạy được (lúc Thử khoá / số trước) đi trước, nhớ model **hết hạn mức** tới giờ Google đặt lại (`retryDelay`, 0 giờ giờ Thái Bình Dương = 15 giờ ở Việt Nam) — kể cả tên gọi tắt trỏ sang model khác (`gemini-3.5-flash` dùng chung hạn mức `gemini-3.6-flash`, lấy từ `quotaDimensions`). Cả số dùng một model TTS.
  - *"Suy nghĩ" quá trần*: lượt sửa của `gemini-3-flash-preview` nghĩ 31.453 token / 32.768 → bài bị cắt, cả số hỏng, báo nhầm "quá dài". Giờ lượt sửa `thinkingLevel: low`, soát `medium` (2.5: `thinkingBudget`), trần 65.536 token; lượt sửa gọi hỏng thì giữ bản hiện có cho bước soát; thông báo ghi đúng lý do.
  - *Tra từ*: bước soát (3.6-flash) gỡ hết `{..|..|..}` của từ đã học (bản cuối chỉ còn 3 từ bấm được). Giờ máy **tự nối tra từ** cho `[漢字|よみ]` khớp từ trong phạm vi (cả 勉強します → 勉強する, 働きます → 働く, so cách đọc), tối đa 20 chỗ; bản soát làm rơi > ½ chỗ tra từ thì dùng bản trước soát; lời nhắc soát dặn giữ nguyên.
  - *Nội dung*: số thường bắt buộc đủ 3 bài; gợi ý cho bước soát: chữ Hán khó hơn N5/N4 (`hard_kanji`), chưa dùng mẫu câu trọng tâm, câu chép vắt qua 「」, ít chỗ tra từ; thiết lập nhân vật rõ (はなさん là 女将さん, không phải 店長; người mới đến nói よろしくお願いします).

### 2.7c Chép chính tả cho mọi deck (1.13)
- Lượt 5 câu mỗi ngày lấy theo thứ tự: câu chép sai đến hạn ôn → câu trong báo → câu ví dụ của deck (cây héo / khát trước, câu có audio thật trước) → **từ của deck** (`w:<nid>`: nghe từ, gõ lại — chỉ note từ vựng, từ 2–16 ký tự một cách viết, từ có chữ Hán phải có cách đọc kana; gõ kana hay chữ Hán đều đúng).
- Câu / từ **không có audio** đọc bằng *giọng dự phòng* (`paper_core.Voice`): giọng Gemini đã tạo (kho `user_files/bao_gemini/giong/`, bản thường + bản chậm) → **giọng tiếng Nhật của máy** (Windows / macOS, Anki phát bằng `TTSTag(lang="ja_JP")`, đọc chậm = `speed 0.7`) → nhờ Gemini tạo (luồng nền, vài giây; dòng hiện "⏳ đang tạo giọng đọc…", xong tự vẽ lại). Có giọng máy thì phát ngay, đồng thời vẫn nhờ Gemini tạo bản hay hơn. Gemini hết hạn mức giọng đọc trong ngày → câu chưa làm mà không nghe được thì bỏ ra, lấp câu khác.
- Câu trong báo thiếu audio (kotoba_daily không có VOICEVOX, Gemini hết hạn mức) cũng dùng giọng dự phòng; đoạn văn không có audio đọc bằng giọng máy. File audio của deck (mp3…) phát chậm bằng tốc độ của mpv khi Anki dùng mpv.
- Tuỳ chọn `dict_voice` (tab Nguồn báo → thẻ *Giọng đọc cho câu không có audio*): **Tự động** (mặc định) / **Chỉ giọng máy** (không gửi câu lên Google) / **Tắt**. Thẻ ghi máy có giọng tiếng Nhật chưa và cách cài (Windows: Cài đặt → Thời gian & ngôn ngữ → Giọng nói → Thêm giọng nói → Tiếng Nhật; macOS: Trợ năng → Nội dung đọc → Giọng hệ thống → Quản lý giọng nói).
- Không có gì để nghe thì tab Chép chính tả giải thích đúng trường hợp (deck chữ Hán / ngữ pháp không câu ví dụ; chưa có khoá Gemini; giọng Gemini hết hạn mức; máy chưa có giọng tiếng Nhật) kèm nút sang tab Nguồn báo.

---

## 3. Bộ `kotoba_daily` (viết báo mỗi sáng)

### 3.1 Cấu trúc thư mục
```
~/tieng-nhat/                     thư mục tiếng Nhật của người dùng (đường dẫn ví dụ)
  giao_trinh/...                  PDF giáo trình
  kotoba_daily/
    HUONG_DAN.md                  hướng dẫn cài đặt cho người dùng
    lo_trinh.json                 NGƯỜI DÙNG SỬA: giáo trình, đã học tới đâu, cài đặt
    truyen.md                     nhân vật + tóm tắt truyện dài kỳ ("Đã xảy ra")
    lich_su.md                    mỗi số báo một dòng "- NGAY | số N | mẫu: … | từ ôn: … | tóm tắt"
    pham_vi.json                  do tools/pham_vi.py tạo mỗi sáng
    tien_do.json                  do add-on ghi
    nguon/<id giáo trình>/<chương>.json   từ vựng, ngữ pháp, kanji từng chương
    bao/<YYYY-MM-DD>/bao.json     số báo (dữ liệu)
    bao/<YYYY-MM-DD>/bao.html     trang đọc bằng trình duyệt (tự chứa)
    bao/<YYYY-MM-DD>/audio/       WAV VOICEVOX + am_thanh.json
    prompts/bao_hang_ngay.md      hướng dẫn cho tác vụ lịch mỗi sáng
    prompts/trich_chuong.md       hướng dẫn trích một chương thành nguon/*.json
    tools/kb_markup.py            đọc cú pháp furigana (dùng chung)
    tools/pham_vi.py              tính phạm vi đã học → pham_vi.json
    tools/kiemtra.py              kiểm tra một số báo (LỖI / CẢNH BÁO / OK)
    tools/render.py + mau_bao.html   dựng bao.html
    tools/doc_voicevox.py         tạo audio, kiểm tra đọc sai
    vi_du/bao_mau.json (+ .html)  số báo mẫu (khuôn định dạng)
```
Chỉ dùng thư viện chuẩn Python (chạy được với Python 3.10 của Ubuntu 22.04).

### 3.2 Lộ trình (`lo_trinh.json`) — cấu hình khuyên dùng cho người dùng này
```json
{
 "nen_tang": "N5",
 "giao_trinh": [
  { "id": "gungun_n5", "ten": "GUNGUN N5", "trinh_do": "N5", "chuong_dau": 1,  "chuong_cuoi": 14, "da_hoc_den": 14, "thu_muc": "giao_trinh/GUNGUN_N5" },
  { "id": "gungun_n4", "ten": "GUNGUN N4", "trinh_do": "N4", "chuong_dau": 15, "chuong_cuoi": 33, "da_hoc_den": 29, "thu_muc": "giao_trinh/GUNGUN_N4" }
 ],
 "cai_dat": { "so_chuong_trong_tam": 3, "tu_moi_toi_da": 3, "tin_that": false, "khi_ton": "rut_gon", "giong": 2 }
}
```
- Học xong chương mới: tăng `da_hoc_den`. Sáng hôm sau tác vụ tự trích chương đó (tối đa 2 chương thiếu mỗi sáng, chương trọng tâm trước).
- Sang N3 hoặc thêm giáo trình song song: thêm một mục vào `giao_trinh`. Phạm vi = mọi chương đã học của mọi giáo trình. Trình độ báo = giáo trình cao nhất đã bắt đầu. Chương trọng tâm lấy từ giáo trình đang học dở (học xong hết thì lấy giáo trình cuối).
- `id` không đổi sau khi đã trích (thư mục `nguon/<id>/` và id mẫu câu `<id>:<chương>-<số>` dựa vào nó).
- `khi_ton`: `rut_gon` (mặc định, từ 3 số chưa đọc trở lên thì viết số ngắn, truyện tạm dừng), `dung` (không viết), `van_viet` (vẫn viết đủ).
- `tin_that: true`: mỗi số thêm một tin thật ở Nhật (đời sống, văn hoá, thời tiết), viết lại bằng lời mình, có link nguồn. Tắt mặc định vì tác vụ sẽ tự lên mạng khi không ai trông.

### 3.3 Mỗi sáng tác vụ làm gì (`prompts/bao_hang_ngay.md`)
0. `date +%F` → NGAY. Có `bao/NGAY/bao.json` hợp lệ rồi thì dừng.
1. `python3 kotoba_daily/tools/pham_vi.py`. Dòng `THIẾU` → trích tối đa 2 chương theo `trich_chuong.md`. Đọc `bao_ton.cach_viet` (`day_du` / `rut_gon` / `dung`).
2. Đọc `pham_vi.json`, `truyen.md`, `vi_du/bao_mau.json` (không đọc lại PDF).
3. Chọn 2–4 mẫu câu nhấn mạnh (phần lớn chương trọng tâm + 1 mẫu chương cũ, tránh lặp 3 số gần nhất), 8–20 từ đánh dấu (ưu tiên chương trọng tâm, từ sắp quên trong Anki), từ chép sai đưa vào câu chép chính tả.
4. Viết `bao/NGAY/bao.json`: `tin_lang`, `truyen` (kỳ = `truyen.ky_tiep_theo`, `ky_truoc` = 1 câu tiếng Việt), `thong_bao` (ngày chẵn) hoặc `cot` (ngày lẻ); 2–3 câu hỏi; 2–3 câu chép lấy nguyên văn từ bài.
5. Tự soát (ngữ pháp ngoài phạm vi, kính ngữ sai chủ ngữ, furigana từ nhiều cách đọc, câu hỏi hai đáp án).
6. `kiemtra.py` đến khi OK.
7. `doc_voicevox.py` (không có VOICEVOX thì bỏ qua) rồi `render.py`.
8. Thêm một dòng vào `lich_su.md`, 1–2 dòng vào "Đã xảy ra" của `truyen.md`.

Quy tắc nội dung chính: chỉ ngữ pháp trong phạm vi + trình độ nền tảng; tối đa 3 từ mới (khai báo trong `tu_moi`); viết hoàn toàn mới, không chép đoạn văn / ví dụ / tên nhân vật của giáo trình; độ dài N5 150–400, N4 280–700, N3 450–1000 ký tự (số rút gọn khoảng một nửa).

### 3.4 Cú pháp furigana trong `bao.json`
- `[漢字|かんじ]`: chữ Hán kèm cách đọc.
- `{表記|よみ|từ gốc}`: từ cần học, bấm được để tra. "Từ gốc" viết đúng như cột từ trong `pham_vi.json` (kể cả `〜`, `する`): `{名|めい|〜名}`, `{発表|はっぴょう|発表する}`, `{泊|と|泊まる}まり` (okurigana để ngoài), `{コート||コート}` (katakana để trống cách đọc).
- **Mọi chữ Hán phải có furigana** (`kiemtra.py` bắt lỗi). Không dùng `[ ] { } |` cho việc khác; trích lời dùng 「」.
- Ngày giờ, số đếm: số Ả Rập để ngoài, chỉ bọc chữ Hán (`11[月|がつ]19[日|にち]`, `5[人|にん]`); chỉ cụm đọc đặc biệt mới bọc cả số (`[3日|みっか]`, `[24日|にじゅうよっか]`). Furigana dài trùm cả cụm làm chữ bị giãn.

### 3.5 Truyện dài kỳ 『ことば村の小さな旅館』
Nhân vật (trong `truyen.md`): **スタックちゃん** (robot của khu vườn, xưng ぼく), **はなさん** (chủ quán trọ 「ことば屋」, nói kính ngữ), **リンさん** (cô gái Việt Nam mới đến làm ở quán, đang học tiếng Nhật), **村長** (trưởng làng). Đã có 3 kỳ viết trước cho ngày 2–4/11/2026 (gói `bao_doc_thu.zip`): Lin bắt đầu làm; quán kín chỗ, chị Hana dọn phòng tầng 2; khách hoá ra là StackChan cùng bạn robot; chị Hana sắp giao một việc quan trọng (kỳ 4 viết tiếp từ đây).

### 3.6 Đặt lịch và VOICEVOX
- Lịch: Claude Desktop → tab Code → **Scheduled** → New task → Set up manually; hướng dẫn: "Đọc và làm đúng theo file kotoba_daily/prompts/bao_hang_ngay.md"; Advanced settings → Only on this computer, Local folder = thư mục tiếng Nhật; Daily 6:00; bấm **Run now** một lần và chọn "always allow". Chỉ chạy khi app mở và máy thức; lỡ giờ thì chạy bù một lần. Tác vụ đám mây không hợp (không thấy file trên máy); `/loop` tự hết hạn sau 7 ngày.
- VOICEVOX bằng Docker (tự bật cùng máy):
  ```
  sudo apt install docker.io && sudo usermod -aG docker $USER     # rồi đăng nhập lại
  docker run -d --restart unless-stopped --name voicevox -p 127.0.0.1:50021:50021 voicevox/voicevox_engine:cpu-latest
  curl http://127.0.0.1:50021/version
  python3 kotoba_daily/tools/doc_voicevox.py --danh-sach-giong      # chọn id → cai_dat.giong
  ```
  Image khoảng 2 GB. Không chạy app VOICEVOX cùng lúc (trùng cổng 50021). Phải ghi công "VOICEVOX:<tên giọng>" (trang báo tự hiện). `doc_voicevox.py` tạo `bai_<i>_<j>.wav`, `ct_<k>.wav`, `ct_<k>_cham.wav` (tốc độ 0.95 và 0.75), so cách đọc VOICEVOX đoán (trường `kana` của `audio_query`) với furigana; từ lệch thì đọc lại từ đó bằng kana. Không thấy engine thì thoát mã 0 (báo vẫn dùng được, chỉ thiếu audio).

---

## 4. Kiến trúc add-on

```
┌──────────────────────── Anki (Python, Qt6) ─────────────────────────┐
│ __init__.py   GardenDialog(QDialog) → AnkiWebView.stdHtml(...)       │
│   hooks: reviewer_will/did_answer_card, profile_did_open,            │
│          sync_did_finish        menu: Tools → ことば畑                │
│   STATE = garden_core.GardenState   PAPER = paper_core.PaperState    │
│ garden_core.py  logic thuần (không import aqt → test được)           │
│ season_core.py  Giao diện mùa: lịch (âm lịch VN), chủ đề, 40 món      │
│ fields_core.py  cấu hình trường theo loại note, chế độ trò chơi (1.9)│
│ text_core.py    furigana mọi kiểu, chữ tiếng Anh (1.17)              │
│ paper_core.py   báo & chép chính tả (không import aqt)               │
└──────────────┬───────────────────────────────▲───────────────────────┘
   web.eval("Garden.fn(<json>)")               │ pycmd("nhóm:việc:tham_số")
┌──────────────▼───────────────────────────────┴───────────────────────┐
│ web/*.js (mỗi file là một IIFE gắn vào biến toàn cục), nạp theo thứ tự│
│ sky.js → season.js → fx.js → music.js → games.js → fields.js →      │
│ season_art.js → pets.js → home.js → craft.js → paper.js → seeds.js →  │
│ joy.js → ui.js                                                        │
│ → garden.js (Garden: điều phối, nhận mọi lệnh từ Python)             │
└───────────────────────────────────────────────────────────────────────┘
```

Nguyên tắc:
- Python kiểm tra lại mọi thứ (`check_spot`, `HomeError`, `PaperError` là câu tiếng Việt hiện cho người dùng).
- Không dùng CSS mặc định của Anki (`default_css=False`) để nút pixel không bị bo tròn.
- Các module JS không gọi chéo nhau lúc nạp; `Garden` gọi `X.init(helpers)` với `data()`, `send()`, `setWallet()`, `closeReview()`, `openPaper()`…
- Báo: Python **không gửi đáp án** câu hỏi và câu chép chính tả chưa làm sang JS; chấm ở Python, `paperResult` trả đáp án sau khi chấm. JS dựng chữ của báo bằng nút DOM / `textContent`, không dùng `innerHTML`.

### 4.1 Bản đồ file

| File | Dòng | Vai trò |
|---|---|---|
| `__init__.py` | ~900 | Cửa sổ, `refresh()`, ôn thẻ trong vườn, cầu nối (`_on_bridge`, `_on_game`, `_on_home`, `_on_craft`, `_on_paper`, `_on_fields`), phát audio báo, ghi `tien_do.json`, hook, menu; `config()` gộp `_fields`; 1.10: phím tắt `SHORTCUT`, nút trên thanh trên cùng (`_toolbar_links`, `_toolbar_content`), bọc `mw.handleImport` (`_install_ticket_handler`), `create_desktop_icon` |
| `more_core.py` | ~640 | 1.14, thuần Python: sửa nhà, thú nuôi, giống cây, vùng tự tạo (`clean_more`, `view` → `wallet.more_view`, `catalog_view` → `catalog.more`), giao diện tự chỉnh (`clean_ui`, `ui_preset`), hiệu ứng thành tích (`joy_view`) |
| `web/ui.js`, `web/pets.js`, `web/seeds.js`, `web/joy.js` | ~240 / 200 / 70 / 200 | 1.14: `GardenUI` (chế độ đang xem, lớp `kb-ui-*`, bảng Giao diện, nút Ẩn vườn), `GardenPets` (hình + đi lại của 6 thú), `GardenSeeds` (8 giống × 5 giai đoạn), `GardenJoy` (huy hiệu, dải chúc mừng, hiệu ứng trên ruộng / sân) |
| `ai_en.py` | ~1030 | 1.19, thuần Python: báo tiếng Anh — phạm vi từ deck tiếng Anh, ngữ pháp CEFR A1–C1, máy nối tra từ theo dạng gốc (`LinkIndex`, `link_texts`), `autofix`, `check`, lời nhắc viết / sửa / soát; `ai_core.Job` gọi khi `scope["lang"] == "en"` |
| `words_core.py` | ~330 | 1.19.1, chỉ import `anki`: chọn từ cho báo Gemini không theo deck đang xem — `model_infos` (ngôn ngữ / loại của từng loại note), `lang_decks`, `pick` (100 note 70 / 30 theo lịch ôn hôm nay, ngẫu nhiên theo ngày, xoay vòng giữa các deck), khoá `kotoba_batake_paper_src` (`load_src`, `save_src`) |
| `ai_core.py` | ~1150 | Báo do Gemini viết (1.12, thuần Python, `urllib`): client Gemini REST, chọn model, thử khoá, phạm vi từ deck / `pham_vi.json`, mẫu ngữ pháp JLPT N5–N3 tự soạn, `check` / `autofix`, lời nhắc viết / sửa / soát, `Job`, giọng đọc `make_audio`, nhật ký |
| `diag.py` | ~185 | Báo lỗi (1.11, thuần Python): `ErrorLog` (nhật ký `user_files/errors.json`, gộp trùng, giữ 40), `redact`, `build_report`, `config_diff`, `clean_client`. Cửa sổ Qt nằm trong `__init__.py` (`report_info`, `report_text`, `show_report`) |
| `launcher.py` | ~260 | Mở nhanh từ ngoài Anki (1.10, thuần Python): file vé `kotoba_batake_open.apkg`, `is_ticket`, `create()` tạo biểu tượng Windows (PowerShell → `.lnk` chạy `explorer.exe "vé"`, dự phòng `.url`) / macOS (`osacompile` → `.app`, thay `applet.icns`) / Linux (`.desktop` đúng đặc tả + `gio set metadata::trusted`) |
| `icons/` | | Biểu tượng mầm pixel: `kotoba.png` (Linux), `kotoba.ico` (Windows), `kotoba.icns` (macOS), `toolbar.png` (nút trên thanh Anki); vẽ bằng `tools/make_icons.py` lúc phát triển |
| `fields_core.py` | ~400 | Cấu hình trường (1.9, thuần Python): `KINDS`, `ROLES` (vai trò + bắt buộc theo loại note), 1.17 `LANGS` / `ROLE_LABELS` / `guess_lang`, `GAME_MODES` (khớp `MODES` của games.js, cả nhóm `en` / `xx`), `guess_kind`, `clean_store`, `conf_problem`, `validate_save`, `FieldStore` |
| `text_core.py` | ~330 | 1.17, thuần Python: furigana mọi kiểu về một dạng; tiếng Anh: tách IPA, các cách viết, dạng biến đổi + động từ bất quy tắc, chấm chép chính tả theo từ |
| `garden_core.py` | ~2300 | Cân bằng game, `CATALOG` (+ `ITEM_DESC`, gộp `SEASON_ITEMS`), cửa hàng / vùng / kiểu nhà / tủ đồ / xưởng, nhận diện trường note (1.9: `note_roles` theo cấu hình hoặc đoán, `fields_panel`, `guess_config`, `grammar_candidates`), `build_garden` (+ `note_types`, `kind` của cây), giai đoạn, nhiệm vụ (`_make_quests` nhận thêm `extra`), `GardenState` (+ `add_coins`), tách / gộp khoá mở rộng (`split_ext`, `merge_ext`, `LEGACY_*`), Giao diện mùa (`split_season`, `merge_season`, `_tier`, `unlock_theme`, `set_theme`) |
| `season_core.py` | ~410 | Giao diện mùa, thuần Python: âm lịch Việt Nam (`lunar_to_solar`, `tet_date`, `mid_autumn_date`), `THEMES` (thứ tự = ưu tiên), `SEASON_ITEMS`, `themes_view`, `clean_season`, `active_theme`, `streak_available` |
| `paper_core.py` | ~890 | Cú pháp furigana, `clean_issue`, `Library` (đọc thư mục báo, cache theo mtime, chặn đường dẫn audio và symlink ra ngoài), `issue_view`, chấm câu hỏi / chép, lượt chép hằng ngày (`build_daily`, `DICT_REVIEW_MAX=2`, `DICT_PAPER_MAX=4`), hàng ôn 1/3/7 ngày, `PaperState`, `progress_payload` / `write_progress` |
| `config.json` / `config.md` | | Cấu hình mặc định và hướng dẫn (Tools → Add-ons → Config) |
| `web/body.html` | ~210 | Khung HTML: thanh trên, bảng ôn, game, Nhà + Xưởng, bảng 新聞 (`#kb-paper`), sân, ruộng |
| `web/garden.css` | ~1180 | Toàn bộ CSS kiểu pixel (phần báo có tiền tố `kb-p-`) |
| `web/diag.js` | ~65 | `GardenDiag` (1.11, nạp đầu tiên): bắt lỗi JS (`error`, `unhandledrejection`), gộp trùng, gửi `app:jserr`; `client()` cho báo cáo |
| `web/garden.js` | ~970 | `Garden`: ruộng, thẻ ghim, bảng ôn, phím tắt, nhạc, chip báo (`drawPaperChip`), `openPaper` |
| `web/paper.js` | ~600 | `GardenPaper`: 3 tab Báo / Chép chính tả / Kệ báo, tra từ, câu hỏi, chép (romaji qua `GardenGames._typedKana`) |
| `web/home.js` | ~3620 | `GardenHome`: sprite (`SPR`, `FRAMES`, `BASE`), nhà, 7 cảnh ngoài trời + phòng, thời tiết theo lớp (vũng nước ở lớp mặt đất), đặt đồ, 8 tab cửa hàng (tab Giao diện mùa: `renderSeason`, `themeCard`); cờ hòm thư theo báo, bấm hòm thư mở báo (`mainItemAt`); nút đổi cảnh ◂ ▸ (`cycleMain`) |
| `web/games.js` | ~2160 | `GardenGames`: 5 mini-game, romaji → kana; 1.9: chọn loại note, bảng `MODES` (chế độ từng trò theo loại), `poolFor(def, kind, mode)`, lý do thiếu trường (`lackText`), `supportFor`; 1.10: `skyNow`, `paintSky`, `paintWeather` (trời / thời tiết của Chợ sáng, Đuổi quạ), `drawSeasonLayer` (nền theo chủ đề của menu và các trò còn lại) |
| `web/fields.js` | ~310 | `GardenFields` (1.9): bảng Cấu hình trường |
| `web/fx.js` | ~900 | `GardenFX`: StackChan, hạt, âm thanh 8-bit |
| `web/season.js` | ~650 | `GardenSeason` (1.8): chủ đề đang dùng + xem thử, bảng giao diện `VIS`, (1.10) `FOLIAGE` / `foliage()` cây và đất riêng của các vùng, `themeSky()`, dây trang trí `GARLAND`, hạt bay theo thời gian, pháo hoa, Ngân Hà, trăng to, dải trang trí trên cùng, hạt nền trang, cỏ ruộng, chip chủ đề |
| `web/season_art.js` | ~870 | `GardenSeasonArt` (1.8): sprite + chuyển động của 40 món theo mùa, cắm vào home.js qua `install()` |
| `web/sky.js`, `web/music.js`, `web/craft.js` | | Trời & thời tiết (nghiêng theo chủ đề); nhạc chiptune (+ 14 bản theo giao diện mùa; 1.18: `pluck`, lead `bell`, giọng `wood`, `trackFor` theo chủ đề đang dùng / đang Xem thử, `_offline` để đo độ to); trình vẽ pixel |

### 4.2 Cầu nối JS → Python (`pycmd`)

| Lệnh | Việc |
|---|---|
| `ready`, `refresh`, `deck:<id>` | dựng lại dữ liệu, đổi deck |
| `rv:start` / `rv:show:<gõ>` / `rv:ans:<1-4>` / `rv:stop`, `play:<q\|a>:<n>` | ôn thẻ trong vườn |
| `game:open`/`stop`/`audio:<nid>`/`exaudio:<nid>`/`reward:<game>:<điểm>:<xu>[:<thắng>]` | mini-game |
| `home:buy` / `build` / `place` / `move` / `take` / `zone` / `style:*` / `wear:*` / `face:*` / `craft:*` | Nhà & cửa hàng |
| `home:theme:buy:<id>` / `theme:streak:<id>` / `theme:use:<id>` / `theme:auto` / `theme:off` | Giao diện mùa: mở bằng xu / bằng chuỗi (Python tự tính chuỗi từ revlog), chọn tay, tự động, tắt |
| `craft:save:<json>`, `craft:pick`, `win:full` | xưởng, chọn ảnh, F11 |
| `app:icon` | 1.10: tạo biểu tượng ngoài Anki (`launcher.create`) → `Garden.appIcon({ok, kind, paths, msg})` |
| `app:jserr:<json>` / `app:report:<json>` | 1.11: ghi lỗi JS vào nhật ký / mở cửa sổ Báo lỗi kèm thông tin trang (cửa sổ, màn hình, bảng đang mở) |
| `fields:open`, `fields:save:{mid,kind,f}`, `fields:game:<game>:<loại>:<chế độ>` | 1.9: dữ liệu bảng Cấu hình trường; lưu cấu hình một loại note (Python kiểm tra loại, trường bắt buộc, trường có thật); lưu chế độ trò chơi |
| `paper:index`, `paper:issue:<ngày>` | kệ báo; mở một số (đánh dấu đã đọc, ghi lại `tien_do.json`); 1.19: theo ngôn ngữ báo đang xem |
| `paper:lang:<ja\|en\|>` | 1.19: chọn báo tiếng Nhật / tiếng Anh ở Kệ báo (trống = theo deck đang xem) |
| `paper:q:{d,i,c}` | trả lời câu hỏi |
| `paper:ct:{d,i,v}`, `dict:check:{id,v}` | chép chính tả (`v` = các cách hiểu chữ đã gõ) |
| `paper:play:{d,k:bai\|ct,i,j,s}`, `dict:play:{id,s}` | phát audio: file báo là đường dẫn tuyệt đối đã kiểm tra; câu ví dụ deck là tên file media |
| `dict:open`, `paper:stop` | lượt chép hôm nay; dừng audio |
| `home:repair:all\|one`, `home:pet:buy\|feed\|auto\|move\|name:…`, `home:seed:buy:<id>`, `home:seed:rule:{where, key, value}`, `craft:zone:{…}`, `home:uzone:del:<id>` | 1.14: sửa nhà, thú nuôi, giống cây (đổi luật thì dựng lại ruộng), vùng tự tạo |
| `ui:set:<json>`, `ui:preset:<full\|focus\|calm\|night>` | 1.14: lưu giao diện tự chỉnh vào `config.json` → `Garden.uiSaved` |
| `ai:status`, `ai:key:{key}`, `ai:set:{…}`, `ai:write`, `ai:audio`, `ai:forget`, `ai:keypage`, `ai:dir` | 1.12: tab Nguồn báo — dữ liệu, thử khoá (nền), lưu cài đặt, viết số hôm nay, tạo giọng đọc còn thiếu, xoá khoá, mở trang lấy khoá, chọn thư mục kotoba_daily |

Python → JS: `render`, `showCard`, `showAnswer`, `reviewDone`, `celebrate`, `mobilePaid` (1.11), `aiStatus` / `aiProgress` (1.12), `gameSaved`, `home`, `homeError`, `craftImage`, `fieldsData`, `fieldsSaved`, `fieldsError`, `gameModes`, `appIcon`, `paperIndex`, `paperIssue`, `paperSummary`, `dictShow`, `paperResult`, `paperError`, `toast`, `flip`, `key`, `fit`.

Audio báo phát bằng `aqt.sound.av_player.play_file(đường_dẫn_tuyệt_đối)`. Đây là cách chính thức: `SoundOrVideoTag.path()` của Anki 26.9.3 nhận đường dẫn tuyệt đối.

---

## 5. Dữ liệu & lưu trữ

### 5.1 Cấu hình add-on (`config.json`)
`word_field`… `example_audio_field` (ép tên trường, trống = tự nhận diện; từ 1.9 chỉ dùng cho loại note chưa cấu hình trong bảng Cấu hình trường), `stage_days` [3, 21, 90], `wilt_retrievability` 0.7, `max_plants` 400, `daily_goal` 30, `daily_bonus` 15, `game_daily_coins` 40, `effects`, `sound`, `music`, `music_volume`, `show_tooltips`, `open_maximized`, `toolbar_button` (1.10, nút ことば畑 trên thanh Anki), `mobile_coins` (1.11, bù xu cho lượt ôn trên điện thoại), **`bao_dir`** ("" = chưa nối báo); 1.12: `bao_source` (auto / claude / gemini), `gemini_key` (chỉ trên máy), `gemini_level`, `gemini_scope`, `gemini_audio`, `gemini_voice`, `gemini_auto`, `gemini_model`, `gemini_tts_model`; 1.19: `gemini_level_en` (A1–C1, mặc định A2), `gemini_voice_en` (báo tiếng Anh); 1.13: `dict_voice` (auto / may / tat — giọng cho câu chép không có audio); 1.14: `ui` (giao diện tự chỉnh theo chế độ, `more_core.clean_ui`).

### 5.2 Khoá trong cấu hình collection (đồng bộ AnkiWeb)

| Khoá | Nội dung | Sao lưu |
|---|---|---|
| `kotoba_batake_state` | ví: xu, nhà, đồ đặt ở từng cảnh, tủ đồ, xưởng, nhiệm vụ, kỷ lục game | `user_files/state.json` |
| `kotoba_batake_px` | điểm ảnh nén của món tự làm (RLE, bảng 32 màu) | `user_files/craft_px.json` |
| `kotoba_batake_paper` (1.6) | `read` {ngày: {q, ct, coins, bonus}}, `dict` {day, items, res, coins, bonus}, `queue` {id câu: {due, box}}, `seen`, `miss` {từ: ngày} | `user_files/paper.json` |
| `kotoba_batake_paper_en` (1.19) | như trên nhưng cho **báo tiếng Anh** (`read`, `queue`, `miss`; `dict` không dùng — lượt chép hằng ngày ở khoá cũ). Khoá riêng vì báo Nhật / Anh cùng ngày có cùng id `p:<ngày>:<i>` | `user_files/paper_en.json` |
| `kotoba_batake_ext` (1.7) | phần mới mà bản ≤ 1.6.1 không hiểu: `owned` đồ mới, `zones` vùng mới, `places` {cảnh: [đồ mới hoặc đồ ở vùng mới]}, `craft_fx` {cid: {fx, was}} | `user_files/ext.json` |
| `kotoba_batake_fields` (1.9) | `models`: {id loại note: {kind vocab/kanji/grammar/other, `f` {vai trò: tên trường}, name}}, `games`: {trò: {loại: chế độ}}; 1.17: `lang`: {id loại note: ja/en/other}, `games_lang`: {en/other: {trò: chế độ}} (cấp trên cùng để bản ≤ 1.16 giữ nguyên) | không (id loại note gắn với collection; chỉ ghi `user_files/fields.json` khi chạy không có collection) |
| `kotoba_batake_mobile` (1.11) | sổ bù xu: `start` (mốc, ms = id revlog), `days` {ngày Anki: {all, ok, rev, new}} = số lượt add-on **đã trả** (C), `goals` ngày đã nhận thưởng mục tiêu, `total`, `last`. Bù = R (đếm từ revlog, id > start, 14 ngày) − C, rồi C = max(C, R). Máy tính cộng C ngay khi trả xu (`record_desktop`) | `user_files/mobile.json` (chỉ sao lưu, có collection thì không đọc) |
| `kotoba_batake_more` (1.14) | `repair` {day, seen, back}, `pets` {id: {name, scene, fed, love, got}}, `pet_auto`, `seeds` {owned, deck, kind, tag}, `zones` [{id u<n>, name, bg, ground, hills, lm}], `znext`, `places` {u<n>: [đồ đặt ở vùng tự tạo]}. Tách trước tiên khi lưu (`split_more`), gắn lại sau cùng khi đọc (`attach_uzones`: vượt số đã có thì về kho); giữ khoá lạ của bản sau | `user_files/more.json` |
| `kotoba_batake_paper_src` (1.19.1) | deck lấy từ cho báo: `{"ja": {"decks": [id…]}, "en": {"decks": […]}}`, tối đa 5 deck mỗi báo; id deck đã xoá bị bỏ khi đọc; giữ khoá lạ của bản sau. Bản ≤ 1.19.0 không đụng | không (id deck gắn với collection) |
| `kotoba_batake_season` (1.8) | `unlocked` chủ đề đã mở, `mode` auto/pick/off, `pick`, `free_day` (ngày Anki của lần đổi chuỗi gần nhất), `owned` / `places` của **đồ theo mùa** | `user_files/season.json` |

Khoá báo **tách riêng** để bản cũ của add-on trên máy khác (vốn làm sạch và xoá khoá lạ trong ví) không xoá mất. Từ 1.7 đồ / vùng / hiệu ứng mới cũng vậy: ví chỉ giữ thứ bản 1.6.1 hiểu (`LEGACY_ITEMS`, `LEGACY_ZONES`, `LEGACY_FX`), phần mới ở `kotoba_batake_ext`; `load()` gộp lại (phần mới xếp sau), `save()` tách ra. Bản cũ đặt đồ vào ô của đồ mới thì đồ mới tự về kho. Collection có ví nhưng thiếu khoá mở rộng (vd. tải về từ máy chưa cài 1.7) thì không lấy `ext.json` của máy này. Từ 1.8 có thêm tầng thứ ba: đồ theo mùa và cài đặt Mùa & Lễ hội chỉ nằm ở `kotoba_batake_season` (không ở ví, không ở `ext`), nên bản 1.6.1 và 1.7.0 ở máy khác không xoá; thứ tự chuẩn món đặt: ví → ext → season (`_tier`). Khi lưu, phần của `kotoba_batake_season` mà bản này không hiểu (của bản mới hơn) được giữ nguyên (`keep_foreign_season`). Id câu chép: `p:<ngày>:<i>` (câu trong báo) hoặc `n:<nid>` (câu ví dụ của note). Ghi `col.set_config` không xoá undo.

### 5.3 File trao đổi giữa add-on và `kotoba_daily`

| File | Ai ghi | Ai đọc |
|---|---|---|
| `lo_trinh.json` | người dùng | `pham_vi.py` |
| `nguon/<id>/<chương>.json` | Claude Code (`trich_chuong.md`) | `pham_vi.py` |
| `pham_vi.json` | `pham_vi.py` | tác vụ sáng, `kiemtra.py`, `render.py`, add-on (tra nghĩa) |
| `bao/<ngày>/bao.json` | tác vụ sáng | `kiemtra.py`, `render.py`, `doc_voicevox.py`, add-on |
| `bao/<ngày>/audio/am_thanh.json` + WAV | `doc_voicevox.py` | `render.py`, add-on |
| `tien_do.json` | add-on (chỉ ghi khi nội dung đổi) | `pham_vi.py` |
| `lich_su.md`, `truyen.md` | tác vụ sáng | tác vụ sáng, `pham_vi.py` (đếm số báo) |

Add-on chỉ **ghi đúng một file** trong `bao_dir`: `tien_do.json`. Báo Gemini (1.12) nằm ở thư mục riêng `user_files/bao_gemini/` (1.19: báo tiếng Anh ở `user_files/bao_gemini_en/`, cùng cấu trúc, `bao.json` có `"ngon_ngu": "en"`) (cùng cấu trúc `bao/<ngày>/…`, thêm `truyen.json`, `lich_su.json`, `nhat_ky/`, `trang_thai.json` — từ 1.13 có `exhausted` {model: giờ hết chặn}, `voice_fail_day` — và `giong/` kho giọng Gemini cho câu không có audio, tự dọn sau 90 ngày / 2000 file), không đụng tới `bao_dir`.

### 5.4 Định dạng chính
`nguon/<id>/<chương>.json`:
```json
{"giao_trinh": "gungun_n4", "chuong": 29, "chu_de": "Kính ngữ…",
 "tu_vung": [{"w": "発表会", "r": "はっぴょうかい", "m": "buổi trình diễn"}],
 "ngu_phap": [{"id": "29-1", "mau": "Vさせてください", "nghia": "Hãy để tôi V", "vi_du": "(câu tự đặt)"}],
 "kanji": [{"k": "作", "hv": "TÁC"}]}
```
`bao.json` (id mẫu câu dạng `<id giáo trình>:<id>`):
```json
{"ngay": "2026-11-02", "so": 1, "rut_gon": false,
 "bai": [{"loai": "tin_lang|truyen|thong_bao|cot|tin_that", "tieu_de": "…", "doan": ["…"],
          "ky": 1, "ky_truoc": "(truyện)", "nguon": "https://… (tin thật)"}],
 "cau_hoi": [{"hoi": "…", "chon": ["…", "…", "…"], "dung": 0, "giai_thich": "tiếng Việt"}],
 "chinh_ta": [{"cau": "…", "them_dap_an": ["cách viết khác vẫn đúng"]}],
 "mau_cau": ["gungun_n4:29-1"], "tu_moi": [{"w": "紅葉", "r": "こうよう", "m": "lá đỏ"}],
 "tom_tat": "1–2 câu tiếng Việt"}
```
`am_thanh.json`: `{"credit": "VOICEVOX:四国めたん", "bai": [["audio/bai_1_1.wav", …]], "chinh_ta": [{"thuong": "audio/ct_1.wav", "cham": "audio/ct_1_cham.wav"}], "canh_bao": […]}`. Add-on chỉ chấp nhận đường dẫn dạng `audio/<tên>.(wav|mp3|ogg|m4a)` nằm thật trong thư mục số báo.

`tien_do.json`: `{"cap_nhat": "…", "sap_quen": [từ của cây đang héo / khát trong deck đang xem], "loi_sai": [từ chép sai trong 14 ngày], "chua_doc": [các ngày chưa đọc]}`.

---

## 6. Luật chơi & các con số

| Việc | Xu |
|---|---|
| Nhớ một thẻ (Khó/Được/Dễ) | +1; lên giai đoạn thêm `2 × giai_đoạn_mới` |
| Mục tiêu ngày 30 lượt | +15 |
| Mỗi nhiệm vụ / rương | +20 / +30 và 1 món hiếm |
| Mini-game | tối đa 15 xu/ván, 40 xu/ngày |
| Câu hỏi báo đúng ngay lần đầu | +2 (`Q_COINS`) |
| Câu chép trong báo đúng ngay lần đầu | +2 (`CT_COINS`) |
| Làm hết phần luyện tập của một số | +5 (`ISSUE_BONUS`); câu không có audio không tính |
| Lượt chép hằng ngày | +2 mỗi câu đúng ngay lần đầu, xong cả lượt +5 |

- Mỗi số báo chỉ nhận xu một lần, đọc lúc nào cũng được. Phần này **không** tính vào trần 40 xu của mini-game (mỗi ngày chỉ có một số báo nên không cày được).
- Lượt chép hằng ngày: 5 câu, chọn **một lần mỗi ngày Anki**, không đổi trong ngày. Thứ tự: câu chép sai đến hạn ôn (tối đa 2) → câu trong 7 số báo mới nhất chưa gặp (tối đa 4) → câu ví dụ của cây đang héo / khát trong deck (lấp chỗ trống). **Chỉ lấy câu có audio.** Câu sai quay lại sau 1, 3, 7 ngày; đúng đủ 3 lần thì thôi. Bỏ một ngày không bị dồn câu.
- Chấm chép chính tả: so ở mức kana (bỏ dấu câu, khoảng trắng; katakana → hiragana). Chấp nhận chữ gốc, toàn kana (từ furigana) và `them_dap_an`. Câu ví dụ trong deck không có furigana thì chỉ chấp nhận đúng chữ gốc.
- Nhiệm vụ `paper` / `dict` chỉ vào ô thứ ba khi làm được hôm đó (`_avail()` trả `(due, new, extra)`). Không có `extra` thì nhiệm vụ chọn ra **giống hệt bản 1.5** (có test so với `garden_core` của 1.5).
- 1.14 — chỗ tiêu xu đều: sửa nhà ~105 xu / tuần, thú nuôi 1–4 xu / ngày mỗi con (+ 4.700 xu nhận đủ 6 con), giống cây 7.500 xu cả 8, vùng tự tạo 5.000 xu × 6.
- Ước tính: mua hết mọi thứ khoảng 30.000 xu; làm đủ việc mỗi ngày khoảng 170–190 xu (chưa tính báo); chỉ ôn 30 thẻ khoảng 60 xu.

---

## 7. Quyết định đã chốt (đừng đảo ngược khi chưa hỏi người dùng)

- **Báo do Claude Code viết, add-on chỉ đọc.** ~~Add-on không gọi AI, không cần mạng, không cần khoá API.~~ **Đổi ở 1.12 theo yêu cầu người dùng** ("thêm tính năng điền Gemini Key song song với Claude Code, phù hợp với người non-tech nhất"): thêm nguồn Gemini **tuỳ chọn**, mặc định không bật gì (chưa dán khoá thì add-on không gọi mạng). Nguồn Claude Code giữ nguyên.
- **Báo không theo deck đang xem (1.19.1)** — người dùng chốt 04/11: ô "Báo muốn nhận", tối đa 5 deck, 100 note / số (tổng, không phải mỗi deck), 70% hôm nay có lịch ôn / 30% hôm nay không có lịch ôn, thiếu từ thì không lấy deck khác, ngôn ngữ theo loại note (không có bảng gán deck → ngôn ngữ).
- **Báo tiếng Anh (1.19)** — theo kế hoạch người dùng đã duyệt (`KE_HOACH_TIENG_ANH.md` mục 4.6, nay đã xoá): ~~ngôn ngữ báo = ngôn ngữ chiếm nhiều cây nhất trong deck đang xem~~ (1.19.1: theo ô tick); chỉ Gemini viết; ngôn ngữ khác không viết báo (không tốn lượt). Claude chọn thêm: Gemini viết chữ trơn, **máy** nối tra từ (Gemini hay làm hỏng / bỏ đánh dấu ở báo tiếng Nhật); truyện dài kỳ riêng cho bản tiếng Anh; nút chuyển ngôn ngữ ở Kệ báo; trạng thái đọc ở khoá riêng; lượt chép hằng ngày giữ nguyên (chưa lấy câu báo tiếng Anh).
- **Gemini (1.12)** — Claude tự chọn theo hướng A ở mục 10.1: khoá chỉ lưu trong config của add-on trên máy (không collection / AnkiWeb, không Báo lỗi, không gửi sang trang); add-on tự chọn model (tên model của Google đổi luôn) và tự đổi model khi hết hạn mức; báo Gemini **cùng định dạng `bao.json`** để dùng lại toàn bộ phần đọc / chấm / chép; thư mục riêng `user_files/bao_gemini/`; có `pham_vi.json` của kotoba_daily thì dùng (sát giáo trình), không thì theo deck (người dùng chọn trình độ, ngữ pháp = note ngữ pháp trong deck hoặc danh sách mẫu JLPT tự soạn); **thà không có báo còn hơn báo lỗi**: còn lỗi máy sau sửa + soát thì không lưu; giọng đọc mặc định chỉ câu chép chính tả (tốn ít lượt gọi), "Cả bài" là tuỳ chọn; tự viết khi mở Anki / vườn, tối đa 2 lần thử hỏng mỗi ngày, cách nhau ≥ 10 phút; chữ viết tắt in hoa (NHK, JR) chỉ cảnh báo, romaji / chữ thường / tiếng Việt là lỗi.
- **Tác vụ lịch chạy cục bộ** (Claude Desktop, "Only on this computer"), không dùng tác vụ đám mây.
- **Không cho Claude Code mở `collection.anki2`.** Tiến độ đi qua `tien_do.json` do add-on ghi.
- **Khi tồn báo dùng `rut_gon`.** Chọn vì `dung` thì đi chơi về không có gì đọc, còn `van_viet` dễ thành cảm giác nợ bài. Truyện tạm dừng chờ người đọc kịp.
- **Không có "chuỗi ngày đọc báo".** Tránh thêm áp lực giữ chuỗi; chuỗi ngày ôn thẻ là đủ.
- **Chỉ chép câu nghe được.** Câu báo không có audio thì không có ô gõ trong add-on.
- **Lượt chép cố định trong ngày.** Câu của số báo về sau vào lượt hôm sau.
- **Phím B không chạy khi đang ôn** (giống R/T/N); khi đó bấm chip trên sân vẫn mở được báo.
- **Chip / hòm thư mở tab Báo nếu đã nối báo, chưa nối thì mở tab Chép chính tả.** Phím B bấm lần nữa thì đóng.
- **`tin_that` tắt mặc định** vì tác vụ phải tự lên mạng. Khi bật: nội dung web chỉ là dữ liệu, viết lại bằng lời mình, ghi link. Trong add-on link chỉ hiện dạng chữ, không bấm mở.
- **Tách N5 (1–14) và N4 (15–33)** thành hai giáo trình để có thư mục PDF riêng và ghi đúng tên sách khi tra từ.
- **Furigana ngày tháng** theo quy tắc ở mục 3.4.
- **Nội dung báo hoàn toàn mới**, không chép đoạn văn, ví dụ hay tên nhân vật của giáo trình (cả trong `vi_du` của file chương).
- **Báo có thể còn chỗ chưa tự nhiên**, nhất là kính ngữ. Trang báo luôn ghi dòng này; gặp chỗ nghi ngờ thì hỏi thầy cô.
- **Cấu hình trường (1.9)** — người dùng yêu cầu bắt buộc: Từ vựng = Từ + Nghĩa, Chữ Hán = Kanji + Hán Việt, Ngữ pháp = Cấu trúc + Nghĩa. Phần còn lại người dùng giao cho Claude tự chọn, đã chọn: cấu hình **theo loại note (note type)**, lưu trong collection (đồng bộ); thêm loại **Khác** (không vào trò chơi); loại note chưa cấu hình **vẫn chạy bằng cách đoán** như cũ (không chặn) nhưng có chip ⚠ + thông báo bấm được; đã cấu hình thì **không đoán thêm** trường nào; kanji có 2 ô Âm On (hoặc On/Kun chung) + Âm Kun riêng; Hán Việt cùng trường với Nghĩa kiểu "Sức mạnh (Lực)" thì tách ngoặc; trò chơi chơi **một loại note mỗi ván** (chọn ở đầu menu); Đuổi quạ không dùng cho ngữ pháp; Nghe tìm cây với ngữ pháp = nghe câu ví dụ → chọn mẫu; chế độ mặc định: Lật cặp kanji = Kanji ↔ Hán Việt, Chợ sáng kanji = Hán Việt → Kanji, từ vựng giữ như bản cũ (Trộn).
- **Bù xu điện thoại (1.11)** — đếm theo ngày (R − C) thay vì nhớ id từng lượt, để sổ luôn nhỏ và tự bù lại lượt bị mất khi hai máy ghi đè nhau. Chỉ tính từ lúc cài 1.11 (không trả hồi tố), 14 ngày gần nhất. Bật mặc định.
- **Báo lỗi (1.11)** — add-on **không gửi gì lên mạng**; người dùng tự chép / lưu báo cáo rồi gửi. Cửa sổ là Qt thường (không phải trang pixel) để vẫn mở được khi trang vườn hỏng.
- **Mở nhanh (1.10)** — người dùng hỏi có cách nào có icon bấm là vào add-on, không phải vào Tools. Đã chọn: nút ことば畑 trên thanh trên cùng của Anki (bật mặc định, tắt bằng `toolbar_button`) + phím Ctrl+Shift+K + biểu tượng ngoài Anki **chỉ tạo khi người dùng bấm** (không tự ghi file lên màn hình nền). Biểu tượng dùng **đường mở file .apkg có sẵn của Anki** (file vé + bọc `mw.handleImport`) thay vì tìm đường dẫn chương trình Anki (khác nhau theo bản cài / launcher) hay sửa tham số dòng lệnh của Anki. Windows chạy qua `explorer.exe` để ghim được vào thanh tác vụ.
- **Mùa & Lễ hội ở vùng và trò chơi (1.10)** — không có chủ đề thì mọi cảnh giữ y như cũ (Suối nước nóng vẫn giữa tuyết, lúa theo tháng thật). Trò chơi theo giờ của vườn nhưng **ban đêm sáng dịu hơn vườn** để quạ và chữ vẫn rõ; menu / Nghe tìm cây / Lật cặp / Điền vào câu chỉ đổi nền nhạt + hạt bay phía sau, không đổi màu thẻ để không khó đọc.
- **Giao diện tự chỉnh + 4 chỗ tiêu xu + hiệu ứng thành tích (1.14)** — người dùng nêu ý, Claude chọn chi tiết theo hướng đã bàn ở mục 10.2: mặc định giữ y như cũ (người dùng thích chuyển động); cài đặt giao diện lưu trên máy (`config.json`), không đồng bộ; 3 chế độ (màn chính / ôn thẻ / trò chơi & báo), Nhà & Cửa hàng luôn đầy đủ. Sửa nhà: 1 nấc / 7 ngày Anki, 4 nấc, không sập / mất đồ, ~3% giá nhà / nấc, giảm 50% khi quay lại sau ≥ 14 ngày; **chưa** làm hư do giông (phải chuyển hàm thời tiết sang Python). Thú nuôi: 6 con (không làm cá koi vì "Ao cá koi" đã có cá bơi), quên ăn thì đi chơi, không chết, không phạt độ thân. Giống cây: ưu tiên tag → loại note → deck của thẻ. Vùng tự tạo: tối đa 6, 5.000 xu, công trình 64×76 (đúng khung nhà), khoá riêng. Tất cả dữ liệu mới ở khoá `kotoba_batake_more`.
- **Mùa & Lễ hội (1.8)** — người dùng giao cho Claude tự chọn, đã chọn như sau: mỗi chủ đề 1000 xu hoặc chuỗi 7 ngày (mùa) / 10 ngày (lễ hội); **mở là tặng luôn các món** của chủ đề (mua thêm khi đã mở); một chuỗi chỉ đổi được một chủ đề (`free_day`), ôn tiếp đủ ngày lại đổi được; mặc định **tự động theo lịch**, chỉ áp dụng chủ đề **đã mở** (chưa mở thì chỉ có chip mời + "Xem thử"); lễ hội ưu tiên hơn mùa, Giáng sinh ưu tiên hơn Mùa lá đỏ; Giáng sinh 15/11–31/12 đúng ý người dùng; Tết theo âm lịch Việt Nam, từ 21 ngày trước mùng 1 tới rằm tháng Giêng; mở chủ đề trái mùa thì dùng luôn (chuyển sang chọn tay); nhãn "Mới" chỉ cho đồ của bản mới nhất.

---

## 8. Phát triển, kiểm thử, đóng gói

**Môi trường**: venv Python có `anki==26.9.3` (cùng mã nguồn `aqt` 26.9.3 để tra API), `playwright` đúng bản khớp Chromium đã cài, Node (`node --check`), Pillow. Không cần PyQt.

**Bộ test cũ** (19 bộ, trong `tests/` của thư mục làm việc, xem README trong gói add-on): `test_core`, `test_fields`, `test_kanji`, `test_cloze`, `test_state`, `test_home`, `test_daily`, `test_sync_quest`, `test_endgame`, `bridge_test` (chạy `__init__.py` thật với aqt giả), các bộ e2e Playwright cho ôn thẻ, nhà, game, trời, bố cục, kanji, hiệu năng. Lệnh dạng `py X.py ADDON [DECK]`, in `ok`/`FAIL`, dòng cuối `TỔNG: TẤT CẢ OK`. **Lần làm 1.6 chưa chạy lại 19 bộ này** (không có trong phiên làm việc); thay vào đó có `e2e_regress.py` kiểm hồi quy.

**Bộ test 1.6** (`tests_kotoba_1.6.zip`, 178 kiểm tra, đều qua ở bản 1.6.1):

| Test | Số kiểm tra | Nội dung |
|---|---|---|
| `harness.py` | | collection anki thật (note có câu ví dụ furigana + audio), thư mục báo mẫu (3 số, audio giả, 1 số hỏng, đường dẫn audio độc hại), aqt giả, `FakeWeb` ghi lại mọi `Garden.*` |
| `test_paper.py` | 79 | cú pháp, 3000 gói báo rác, chặn đường dẫn / symlink, không lộ đáp án, chấm & xu, lượt hằng ngày (ưu tiên báo 4 câu), hàng ôn, `tien_do.json` ↔ `pham_vi.py`, nhiệm vụ không đổi so với 1.5, bản 1.5 đọc được ví của 1.6 |
| `test_bridge.py` | 37 | `__init__.py` thật: mọi lệnh `paper:*` / `dict:*`, audio, `bao_dir` sai |
| `e2e_paper.py` | 43 | trang thật trong Chromium nối `__init__.py` thật: hòm thư, chip, phím B, tra từ, câu hỏi, chép romaji, kệ báo, cờ hòm thư (đo pixel), cửa sổ hẹp |
| `e2e_regress.py` | 19 | game, nhà (Esc lần 1 thôi đặt đồ, lần 2 đóng), nhiệm vụ, ôn thẻ thật, thanh trên một dòng |

Biến môi trường: `KB_ADDON` (thư mục add-on), `KB_KIT` (thư mục `kotoba_daily`), `KB_ORIG_CORE` (`garden_core.py` của 1.5).

**Bộ test 1.10** (thêm vào, đều qua; chạy cả bộ bằng `run_all.sh ADDON PORT OUT`): `test_launch110.py ADDON AQT_DIR` (81: menu + phím tắt, link trên thanh trên cùng y như `Toolbar.create_link`, CSS chỉ ở `TopToolbar`, tắt được; file vé, bọc `mw.handleImport`; đọc mã nguồn **aqt 26.9.3 thật** để chắc mọi đường mở file — Anki đang chạy, chưa chạy, đang chọn hồ sơ — đều qua `self.handleImport`; Linux tạo `.desktop` thật và chạy bằng `gio launch` (GLib) với đường dẫn có dấu cách / `$` / `"`; Windows giải mã lệnh PowerShell đã sinh; macOS giả lập `osacompile` và chạy phần shell của AppleScript); `f_season110.js` (nút ⚙ Tạo biểu tượng, bảng ⚙ cuộn được, trò chơi ngày / đêm / tuyết / dây đèn lồng, lớp nền chủ đề, ô đáp án Điền vào câu, cây / đất của vùng theo chủ đề, hiệu năng). Bộ 1.7 / 1.8 / 1.9 chạy lại đều qua.

**Bộ test 1.12** (harness mới vì bộ cũ không có trong repo; đều qua trên bản đóng gói): `stubs/aqt/` + `server.py ADDON PORT WORKDIR [--kit KIT] [--gemini]` (`__init__.py` thật, collection Anki thật, trang như `stdHtml`, việc nền chạy luồng thật) + `mock_gemini.py` (máy chủ Gemini giả). `test_ai.py ADDON KIT` (77), `e2e_ai.js PORT SHOTS` (38: tab Nguồn báo từ đầu tới cuối), `e2e_tour.js PORT SHOTS` (28: vòng tính năng cũ ở 3 cỡ cửa sổ). Chạy `run_e2e.sh SCRIPT PORT RUNDIR SHOTDIR [--kit KIT] [--gemini]`. Chi tiết ở README trong gói add-on. Test không nằm trong repo (`.gitignore` chỉ giữ add-on, giáo trình, kotoba_daily).

**Bộ test 1.13** (lần đầu chạy trong **Anki 26.9.3 thật**: `pip install aqt==26.9.3` + PyQt6 6.12, `QT_QPA_PLATFORM=offscreen`, `QTWEBENGINE_REMOTE_DEBUGGING` → điều khiển webview bằng Chrome DevTools Protocol tự viết (`cdp.js`, Playwright không nối được QtWebEngine), add-on phụ `zz_kbtest` nhận lệnh Python qua HTTP 127.0.0.1 và ghi lại mọi lệnh phát âm thanh): `make_col.py` (5 kiểu deck: câu ví dụ + audio / câu ví dụ không audio / chỉ từ + audio từ / chỉ từ / kanji đơn), `test_dict.py ADDON` (lõi Chép chính tả × 4 cấu hình giọng × 5 deck, đều qua), `e2e.js SHOTS` (28/28: báo Gemini thật, ▶ Chậm, sửa file 1.12 + tạo bù bản chậm, deck D giọng máy + chấm đúng, deck B **Gemini TTS thật** tạo giọng trong lúc chờ, hướng dẫn khi trống, tab Nguồn báo, 1024×640, không lỗi JS), `e2e_tour.js` (phím N / Q / T / B / R + Esc, ôn thẻ thật ghi revlog). Gemini thật (khoá gói miễn phí) qua `run_job.py` (luồng `Job` + `make_audio` thật). **Từ 1.13.1 bộ test nằm trong `tests/` của repo** (xem `tests/README.md`: `run_all.sh` offline, `gemini/` Gemini thật, `anki/run_ui.sh` Anki thật).

**Bộ test 1.11** (thêm vào `run_all.sh`, cả 19 bộ đều qua trên bản đóng gói): `test_v111.py ADDON` (82: bù xu bằng scheduler v3 thật — mốc lần đầu, lượt "điện thoại" +1 / lượt nhớ, lượt máy tính không trả lại, nhiệm vụ `due` / `new`, ngày cũ trong / ngoài 14 ngày, revlog type 4 không tính, undo, 2 máy ghi đè nhau, mục tiêu ngày, `mobile_coins=false`, móc đồng bộ / mở hồ sơ; Báo lỗi — nhật ký, ẩn thông tin cá nhân, báo cáo, nút, menu); `qt_report111.py ADDON PYQT_DIR OUT.png` (cửa sổ Báo lỗi bằng **PyQt6 6.9 thật**, offscreen; cần `pip install --target ../../pyqt PyQt6` và gói `libegl1`); `f_v111.js PORT [SHOTDIR]` (thông báo 📱 + chip xu khi đồng bộ lúc vườn mở, ⚙ ghi đã bù / Đang tắt, lỗi JS → nhắc một lần, ⚙ → Báo lỗi gửi thông tin trang). `test_launch110.py` đổi một kiểm tra: menu Tools có 3 mục.

**Bộ test 1.9** (thêm vào, đều qua): `extra_models.py` (5 loại note mẫu: kanji On/Kun riêng, ngữ pháp có audio ví dụ, kanji "Sức mạnh (Lực)", tiếng Anh Front/Back/Sentence, tên trường lạ); `test_fields19.py ADDON OLD18` (86: chưa cấu hình thì đọc note **giống hệt `garden_core.py` của 1.8**, đoán loại / trường, lưu qua cầu nối thật kèm mọi lỗi, đã cấu hình thì không đoán thêm, On/Kun, tách ngoặc Hán Việt, cloze ngữ pháp, chép chính tả theo trường đã chọn, đổi tên trường, chế độ trò chơi hợp lệ / bị chặn, giữ khoá lạ, `MODES` JS khớp `GAME_MODES` Python, bản 1.8 không đụng khoá mới); `f_games.js` (chơi thử **mọi trò × mọi chế độ × 3 loại note** qua giao diện thật, chế độ còn sau khi tải lại, deck trộn 2 loại); `f_panel.js` (bảng Cấu hình trường: chip, thông báo, gợi ý, đổi loại, bắt buộc, lưu, hoàn tác, Esc, nút ở ⚙ / menu game, đổi tên trường, 2 cỡ cửa sổ); `f_extra.js` (bấm thông báo, đổi deck khi bảng mở, cây ngữ pháp). Bộ 1.7 / 1.8 chạy lại đều qua.

**Bộ test 1.8** (thêm vào bộ 1.7, đều qua): `test_season.py ADDON V170 ORIG` (250: lịch 14 chủ đề theo ngày mốc, Tết / Trung thu âm lịch 25 năm, mở khoá xu / chuỗi, lưu 3 tầng, chạy `garden_core.py` của **1.7.0 và 1.6.1 thật** trên cùng collection để chứng minh không mất chủ đề / đồ theo mùa; bản 1.8 cũng giữ nguyên phần lạ của bản mới hơn); `season_bridge.js` (đổi chuỗi qua cầu nối thật với revlog giả, mini-game khi có chủ đề); `season_shop.js` (23: tab Mùa & Lễ hội qua giao diện thật); `season_more.js` (nhạc theo chủ đề, hiệu năng 3–6,4 ms/khung, ảnh phòng / vùng); `season_narrow.js` (5 cỡ cửa sổ); `season_ui.js` (ảnh 14 chủ đề ngày / đêm). Bộ 1.7 chạy lại vẫn qua (`regress.js` đổi một kiểm tra vì vùng của 1.7 không còn nhãn "Mới").

**Bộ test 1.7** (viết lại từ đầu trong phiên 1.7 vì các bộ cũ không có trong repo; 195 kiểm tra, đều qua): `harness.py` + `stubs/aqt/` (aqt giả, `answer_card` chạy thật) + `server.py` (phục vụ trang đúng như `stdHtml`, `pycmd` → `__init__.py` thật trên collection Anki thật); `test_ext.py` (109: khoá mở rộng, chạy `garden_core.py` của 1.6.1 thật trên cùng collection để chứng minh bản cũ không xoá đồ / vùng mới); `regress.js` (42: nhạc, ôn thẻ thật, game, báo, nhiệm vụ, cài đặt, F11, mở vùng mới qua giao diện, mua / đặt / di chuyển / cất, nút ◂ ▸, quét vẽ 7 cảnh × 5 giờ × 5 thời tiết, cửa sổ hẹp); `craft_test.js` (44: toàn bộ luồng Xưởng + công cụ mới); `music_test.js`, `perf.js` (≤ 5 ms/khung mọi cảnh), `clip_check.js`, các script chụp ảnh `zones.js` / `panel.js` / `sheet.js` / `fx_test.js`.

**Đóng gói add-on**
```bash
# tăng "mod" (unix time) và "human_version" trong manifest.json
find kotoba_batake -name __pycache__ -prune -exec rm -rf {} +
rm -f kotoba_batake/user_files/state.json* kotoba_batake/user_files/craft_px.json* kotoba_batake/user_files/paper.json* kotoba_batake/user_files/ext.json* kotoba_batake/user_files/season.json* kotoba_batake/user_files/fields.json* kotoba_batake/user_files/mobile.json* kotoba_batake/user_files/errors.json* kotoba_batake/user_files/kotoba_batake_open.apkg
(cd kotoba_batake && zip -r -X -q ../out/kotoba_batake.ankiaddon . -x "*.pyc")
# giải nén ra thư mục tạm, chạy lại test trên bản giải nén (KB_ADDON=<thư mục giải nén>)
```
`user_files/` phải có trong gói (chỉ README.txt) để Anki giữ dữ liệu khi cập nhật. Add-on cài ở `~/.local/share/Anki2/addons21/kotoba_batake/`.

**Kiểm tra bộ `kotoba_daily`**: `python3 tools/pham_vi.py`, `python3 tools/kiemtra.py vi_du/bao_mau.json`, `python3 tools/render.py vi_du/bao_mau.json`. Khi cập nhật bộ cho người dùng: chỉ thay `tools/`, `prompts/`, `vi_du/`, `HUONG_DAN.md`; **không ghi đè** `lo_trinh.json`, `nguon/`, `bao/`, `truyen.md`, `lich_su.md`.

---

## 9. Hạn chế đã biết / chưa kiểm tra trên máy thật

- **Báo tiếng Anh (1.19)**: chỉ Gemini viết, phạm vi theo deck đang xem (chưa có giáo trình tiếng Anh kiểu kotoba_daily). Lượt Chép chính tả hằng ngày chưa lấy câu từ báo tiếng Anh (chép ngay trong số báo). Nối tra từ theo luật biến đổi + danh sách chống nhầm, hiếm khi vẫn có thể nối nhầm từ trông như dạng biến đổi. Ngôn ngữ khác chưa có báo.
- **Tiếng Anh (1.17)**: Ngôn ngữ khác chỉ có vườn + trò chung. Điền vào câu chưa nhận cụm từ tách rời ("look it up"). Giọng tiếng Anh của máy chỉ kiểm bằng giả lập (Linux không có giọng TTS). Deck nhồi nhiều thứ vào một trường (vd. `食べる (たべる) - ăn`), furigana tự chế (CSS riêng, cách đọc trong thuộc tính HTML) không tách được — có cảnh báo trong Cấu hình trường, vườn + ôn thẻ vẫn chạy.
- **Chưa chạy trên Anki thật**, chỉ kiểm bằng giả lập. Các phần chưa thử thật: cửa sổ trên GNOME/Wayland, phát WAV bằng `av_player`, VOICEVOX thật (`doc_voicevox.py` mới thử với máy chủ giả), `getFile`, dán ảnh Ctrl+V, kéo thả ảnh, và (1.7) nhạc tự phát nhờ `AnkiWebView.setPlaybackRequiresGesture(False)` — cùng cách màn ôn thẻ của Anki dùng; nếu QtWebEngine vẫn chặn thì nhạc bật ở thao tác đầu tiên như trước.
- **Điện thoại**: AnkiDroid / AnkiMobile không chạy add-on. Lượt ôn trên điện thoại vẫn làm cây lớn; từ 1.11 được bù xu, nhiệm vụ hôm nay và mục tiêu ngày sau khi đồng bộ, nhưng không có thưởng lên giai đoạn, nhiệm vụ "tưới liền" / "giúp cây lớn", và nhiệm vụ của ngày đã qua. Báo chỉ đọc được trên máy có thư mục `kotoba_daily` (hoặc mở `bao.html`).
- **Nhiều máy tính**: phải cập nhật add-on ở mọi máy. Muốn đọc báo ở máy khác thì đồng bộ thư mục `kotoba_daily` (ví dụ Syncthing).
- **Câu ví dụ trong deck**: file audio của deck chỉ đọc chậm được khi Anki dùng mpv (Windows / macOS / Linux có mpv); giọng Gemini / giọng máy thì luôn có bản chậm (1.13).
- **Esc trong Anki 26.x**: Anki gắn vào mọi webview "Esc → đóng cửa sổ" (không xét `preventDefault`), nên ở ≤ 1.12 bấm Esc để đóng Nhà / Trò chơi / Báo đóng luôn cả vườn. 1.13 thay `onEsc` của webview vườn: chỉ đóng cửa sổ khi trang không dùng phím Esc đó (`window.__kbEscUsed`).
- **Chép chính tả có thể lấy câu của số báo chưa đọc** (nghe trước khi đọc), người dùng đã đồng ý.
- **`tien_do.sap_quen` chỉ lấy theo deck đang xem.**
- **Đuổi quạ** không phóng to phần vẽ trên màn hình lớn (tránh pixel nhoè).
- **Cấu hình trường** gắn với id loại note + tên trường: đổi tên trường thì phải chọn lại (vườn báo). Một ván trò chơi chỉ dùng một loại note.
- **Biểu tượng ngoài Anki (1.10)**: Ubuntu / Linux đã thử bằng `gio launch` (GLib thật); Windows / macOS chỉ kiểm bằng giả lập (lệnh PowerShell / AppleScript sinh ra). Cần Anki được đăng ký mở file .apkg (bộ cài làm sẵn); Linux ưu tiên lệnh `anki` trong PATH, không có thì `xdg-open`. Anki ở chế độ an toàn (tắt add-on) mà bấm biểu tượng thì Anki báo file vé không phải deck. Nếu Anki hỏi chọn hồ sơ khi mở bằng biểu tượng, chọn xong là vào vườn.
- **Báo lỗi (1.11)**: chỉ ghi lỗi add-on bắt được (không có lỗi của mẫu thẻ hay add-on khác). Cửa sổ đã chạy bằng PyQt6 thật (offscreen) nhưng chưa thử trong Anki thật.
- **Báo Gemini đã thử với khoá thật (1.13, gói miễn phí, 11/2026)**: mỗi model chữ ~20 lượt / ngày, `gemini-3.8-flash-tts` ~10 lượt / ngày (các model TTS khác hạn mức riêng). Một số báo: 5–15 lượt gọi chữ (tuỳ model hết hạn mức), 30–110 giây; Flash viết tốt hơn Flash-Lite rõ (Flash-Lite hay quên mẫu câu trọng tâm, dùng từ sai nghĩa). Phát âm Gemini TTS rất chuẩn (nghe lại bằng model khác khớp từng chữ, cả 今日 / 明日 / 3日 / 1枚). Model trong danh sách có thể trả 404 (`gemini-2.5-flash`) hoặc 503 lúc đông — add-on tự đổi model. Bước soát vẫn bỏ sót lỗi tự nhiên (từ sai nghĩa, vai nhân vật).
- **1.14**: thú nuôi đi lại / hiệu ứng thành tích chỉ thử trong Anki thật trên Linux (offscreen); "xong thẻ hôm nay" tính theo deck đang xem trong vườn. Dải chúc mừng nhớ theo máy (`localStorage`), máy khác có thể chúc lại một lần. Nhà không hư do giông (chỉ theo ngày).
- **Giọng máy (TTS của hệ điều hành)**: đã kiểm đường phát (`TTSTag` ja_JP, tốc độ 0.7) và nhận diện giọng trong Anki thật, nhưng máy test là Linux (không có TTS) nên giọng được giả lập; chưa nghe thử trên Windows / macOS.
- **Giọng đọc khi không có VOICEVOX**: không cần cài add-on nào. Dùng Gemini thì giọng đọc lấy từ chính khoá Gemini. Không có giọng nào thì báo vẫn đọc được, câu chép trong báo không có ô gõ, lượt chép hằng ngày dùng câu ví dụ có audio của deck. Anki trên Linux không có giọng đọc hệ thống (bộ phát TTS của Anki chỉ có cho Windows / macOS — đã xem mã `aqt/tts.py` 26.9.3).
- **Chất lượng tiếng Nhật do AI viết** có thể còn gượng; `kiemtra.py` chỉ bắt lỗi hình thức (furigana, phạm vi từ, cấu trúc), không bắt lỗi ngữ pháp.

---

## 10. Chưa làm / ý tưởng đã bàn

Các ý dưới đây đã được bàn với người dùng nhưng **chưa làm**. Ghi kèm hướng thiết kế đã thống nhất để phiên sau làm cho khớp.

### 10.1 Liên quan đến báo
- ~~**Báo cho người không rành kỹ thuật**~~: **hướng A đã làm ở 1.12** (khoá Gemini, xem 2.7b). B (bảng tin từ deck không cần AI) và C (gói báo làm sẵn) vẫn để ngỏ. Ghi chép cũ: bộ `kotoba_daily` cần Claude Code + tài khoản Claude + VOICEVOX + giáo trình PDF, quá khó với người dùng thường. Các hướng đã cân nhắc:
  - **A. Khoá API của người dùng (Google Gemini, hạn mức miễn phí)**: add-on tự gọi API mỗi ngày một lần (chạy nền, `mw.taskman`), chỉ văn bản (không có VOICEVOX nên không có giọng đọc; chép chính tả dùng audio của deck). Khoá chỉ lưu trong config của add-on trên máy (không để trong collection vì collection đồng bộ lên AnkiWeb), có nút thử khoá, tên model sửa được. Lưu ý: hạn mức / model / điều khoản miễn phí hay đổi; bản miễn phí có thể dùng dữ liệu gửi lên để cải thiện sản phẩm (chỉ gửi danh sách từ đang học, không gửi gì khác); phải kiểm tra định dạng furigana như `kiemtra.py`. **Đảo quyết định đã chốt** "add-on không gọi AI, không cần mạng" ở mục 7 → chỉ làm khi người dùng đồng ý, và luôn là tuỳ chọn tắt sẵn. Không bao giờ nhúng khoá của người làm add-on vào gói chia sẻ.
  - **B. "Bảng tin từ deck" không cần AI**: ghép câu ví dụ (có audio) của từ sắp héo / đến hạn thành một trang đọc mỗi ngày + câu hỏi đơn giản. Không cần cài gì, chạy offline, nhưng không có truyện / bài viết mới.
  - **C. Gói báo làm sẵn**: người làm add-on dùng bộ `kotoba_daily` viết báo theo danh sách từ JLPT N5 / N4 chung (không dựa vào giáo trình có bản quyền), kèm audio VOICEVOX (ghi tên giọng theo điều khoản từng nhân vật), phát hành thành gói zip; người dùng chỉ tải về và chọn thư mục. Không cá nhân hoá theo từ yếu.
  - Đề xuất: B làm mặc định khi chia sẻ (Báo ẩn nếu chưa nối), A là tuỳ chọn cho ai có khoá, giữ `kotoba_daily` (Claude Code) cho người dùng này.
- **Số ôn tập cuối tuần** (đã đề xuất, chờ người dùng trả lời): số Chủ nhật dành cho các chương cũ. Hướng làm: thêm `cai_dat.on_tap_cuoi_tuan` vào `lo_trinh.json`; `pham_vi.py` xuất danh sách chương cũ chọn ngẫu nhiên theo ngày; prompt dùng danh sách đó thay cho chương trọng tâm vào Chủ nhật.
- **Radio / podcast do AI tạo**: Claude viết kịch bản hai người dẫn nói chuyện 3–5 phút quanh bài đọc; VOICEVOX đọc mỗi người một giọng; ghép bằng ffmpeg; có bản chậm; phụ đề chạy theo mốc thời gian. Radio là một món đồ trong phòng (có nốt nhạc bay ra khi phát).
- **Nhạc**: dễ nhất là Claude soạn chiptune theo đúng dạng dữ liệu nốt của `music.js`. Bài hát có lời dùng từ đã học thì cần phần mềm hát tổng hợp (VOICEVOX có chế độ hát nhưng chưa thử qua API); để sau cùng.
- **Bạn qua thư**: mỗi ngày nhận một lá thư; người dùng viết trả lời trong game; add-on ghi câu trả lời ra file; số hôm sau có phần sửa câu. Luyện viết, vẫn giữ luồng một chiều qua file.
- **Báo trả phí bằng xu** (chỗ tiêu xu đều): đăng ký báo theo tuần, mua kênh podcast. Hiện báo chỉ cho xu, chưa tốn xu.
- **Tách số báo thành nhiều kênh** (tin làng, truyện, tin thật) để chọn đọc; chưa cần.

### 10.2 Chỗ tiêu xu sau khi mua hết (thứ tự ưu tiên đã đề xuất: radio → bảo dưỡng nhà → giống cây → vùng / hiệu ứng tự chế)
**1.14 đã làm**: bảo dưỡng / sửa nhà, thú nuôi, giống cây cho ruộng, vùng tự tạo (xem 2.6c). Còn lại bên dưới: radio, hiệu ứng tự chế, làng & hàng xóm, gacha, vé nghỉ; nhà hư do giông; giống cây tự vẽ.
- **Radio, kênh và đĩa nhạc**:
  - Kênh từ vựng: phát audio của deck, chia theo từ sắp quên, từ mới tuần này, chỉ câu ví dụ.
  - Đĩa nhạc của người dùng: nhập mp3/ogg qua `getFile` vào `user_files/radio/`, file không đồng bộ, chỉ quyền sở hữu đĩa đồng bộ. Phát bằng `<audio>` (mở rộng `setWebExports`) để chỉnh âm lượng và tắt nhạc nền.
  - Podcast qua RSS: Python tải feed trong nền (`mw.taskman.run_in_background`).
  - Radio tự dừng khi ôn thẻ.
- **Bảo dưỡng / sửa nhà**:
  - Cơ chế: độ bền giảm chậm theo ngày Anki (khoảng 1 nấc mỗi tuần) và sau giông. Có 3–4 nấc hư: rêu, sơn bong, ngói lệch, dột khi mưa.
  - Giá: sửa tốn vài phần trăm giá trị bậc nhà.
  - Giới hạn bắt buộc: có trần, không bao giờ sập hay mất đồ; có giảm giá "mừng quay lại".
  - Phía Python: tính độ bền từ `col.sched.today` và ngày sửa gần nhất. Nếu cho giông làm hư thì phải port hàm thời tiết của `sky.js` sang Python, không để JS báo lên.
  - Đặt tên khoá khác `wear` (đã dùng cho tủ đồ). Thêm lệnh `home:repair`.
- **Vùng tự tạo**:
  - Đổi vùng từ mã cứng (`ZONES`, `OUTDOOR_SCENES`, `ZONE_IDS`, `drawZoneBg`, `LANDMARK`) sang dữ liệu. Mỗi vùng gồm tên, kiểu nền, bảng màu và công trình 64×76 vẽ bằng Xưởng.
  - Mã nén điểm ảnh phải nhận kích thước `w×h` (hiện chỉ nhận ảnh vuông `size²`).
  - Scene id động (`u1`, `u2`…) đi qua `check_spot` và `_clean_*`.
  - Lưu ở **khoá riêng** `kotoba_batake_zones` để bản cũ không xoá. Giá khoảng 5.000 xu/vùng, tối đa khoảng 6 vùng.
- **Hiệu ứng tự chế**, theo thứ tự dễ đến khó:
  - "Bùa" gắn hiệu ứng có sẵn cho đồ mua (khoảng 100 xu).
  - Hạt tự vẽ 3×3–7×7, chọn hướng, tần suất, tuổi thọ; chạy qua `emit()`, giới hạn 80 hạt/cảnh.
  - Đồ hoạt hình 2–4 khung.
  - Màu và bán kính ánh sáng ban đêm.
  - Mở rộng Xưởng để tự vẽ biểu cảm và đồ mặc cho StackChan.
- **Giống cây cho ruộng**: anh đào, tre, hướng dương, lúa, bonsai…; mỗi giống 5 hình; gán theo deck hoặc tag; về sau cho tự vẽ.
- **Thú nuôi** (mèo, gà, cá koi): cho ăn vài xu mỗi ngày; quên cho ăn thì chúng chỉ đi chơi, không chết.
- **Làng & hàng xóm**: xây nhà cho dân làng, nhà sau đắt gấp 1,5 lần nhà trước; dân làng nói câu ví dụ lấy từ những từ đã học.
- ~~**Chợ theo mùa**~~: đã làm ở 1.8 dưới dạng **Mùa & Lễ hội** (giao diện + 40 món theo 14 chủ đề). Có thể làm tiếp: mỗi năm thêm vài món mới cho từng lễ, chủ đề Setsubun / Hinamatsuri / Kodomo no hi / Valentine.
- **Máy gacha**: nếu làm thì phải có bảo hiểm, và trùng món thì đổi lại một phần xu.
- **Vé nghỉ giữ chuỗi ngày**: chỉ giữ con số chuỗi, không đụng lịch ôn.

- ~~**Giọng đọc hệ thống cho Windows / macOS**~~: **làm ở 1.13** (giọng dự phòng cho Chép chính tả và đoạn báo không có audio, mục 2.7c). Linux không có.
- **Gemini viết lại số hôm nay** (chưa làm): hiện chỉ viết khi chưa có số; muốn viết lại thì xoá thư mục `user_files/bao_gemini/bao/<ngày>/`.

### 10.3 Kỹ thuật
- ~~**Bù xu cho lượt ôn trên điện thoại**~~: đã làm ở 1.11 (đếm theo ngày, không cần nhớ id từng lượt — xem 5.2 `kotoba_batake_mobile`).
- **Chạy lại 19 bộ test cũ** trên bản 1.6.1, rồi gộp bộ test 1.6 vào thư mục `tests/` chung, theo quy ước `py X.py ADDON`.
- **Kiểm tra trên Anki thật** (xem mục 9) và sửa theo phản hồi của người dùng.

---

## 11. Lịch sử phiên bản
- **1.19.1**: người dùng hỏi báo có phụ thuộc deck đang xem không, rồi chốt (phiên 04/11 chỉ ghi kế hoạch `KE_HOACH_1_19_1.md`, phiên sau làm, xong thì xoá file): **báo theo ô "Báo muốn nhận"** (tiếng Nhật / tiếng Anh), **chọn tối đa 5 deck, 100 note mỗi số, 70% từ hôm nay phải ôn / 30% từ đã thuộc** (`words_core.py`, khoá `kotoba_batake_paper_src`), lời nhắc chỉ 100 từ + 20 từ trọng tâm, không ép dùng hết; hòm thư cộng mọi báo; bỏ màn "Báo chưa hỗ trợ"; tab Nguồn báo một khối cho mỗi báo. Người dùng: "tab chưa đều" → nút đang chọn giữ bóng, cùng font với hàng tab; `audit.js` đo kiểu lệch (66 → 0). Người dùng: "chữ phải đơn giản, bỏ diễn giải; Tắt lẫn Thôi" → bảng thuật ngữ (mục 0), tab "Giao diện mùa", Tự động / Tắt, Dừng xem thử, bỏ chữ "add-on", rút gọn các câu dài. Test mới: `tests/core/test_1191.py`, `e2e_119.js` viết lại. Thử Gemini thật: số tiếng Nhật ~4.900 token (trước ~30.000), số tiếng Anh ~3.800 token.
- **1.19.0**: người dùng: "hiện thực phần báo Tiếng Anh nhé … test lại phần báo Tiếng Nhật luôn" → báo tiếng Anh *The Garden Gazette* (`ai_en.py`, mục 2.6g): ngôn ngữ báo theo deck đang xem, Gemini viết theo từ của deck (CEFR A1–C1), máy tự nối tra từ theo dạng gốc, kiểm tra + soát như báo tiếng Nhật, thư mục `bao_gemini_en/` + khoá `kotoba_batake_paper_en`, nút chuyển báo Nhật / Anh ở Kệ báo, deck ngôn ngữ khác "chưa hỗ trợ". Đã thử bằng khoá Gemini thật cả số tiếng Anh A2 lẫn số tiếng Nhật N4. Xoá `KE_HOACH_TIENG_ANH.md` (kế hoạch tiếng Anh đã xong hết).
- **1.18.0**: người dùng: "soạn thêm một số nhạc nền và nút Xem thử phát luôn nhạc của chủ đề" → 11 bản mới (`web/music.js`), mỗi giao diện mùa một bản (trước chỉ Giáng sinh / Tết / Halloween, các chủ đề khác dùng bản vườn thường), độ to đo bằng OfflineAudioContext cho đều với bản cũ; Xem thử (cả chủ đề đã mở mà chưa dùng) phát nhạc của chủ đề thay hộp nhạc của Nhà, nhạc tắt thì chỉ nhắc. Người dùng cũng báo "học xong hết thẻ nhưng nút Tưới ngay vẫn còn số 1, deck lại báo ôn hết rồi" (ảnh: cây héo có giọt nước, bảng ôn "0 1 0") → tái hiện trên Anki thật: cây héo (R < 0.7) luôn bị đếm là khát kể cả khi Anki không cho ôn hôm nay (thẻ anh em bị hoãn tới mai, bấm Hoãn, thẻ héo mà Anki hẹn ôn ngày sau), deck chạm giới hạn ôn mỗi ngày và thẻ đang nằm trong deck lọc cũng vậy; bảng ôn giữ số đếm của thẻ cuối. Sửa: khát = `is:due` (trừ thẻ đang ở deck lọc khác), số trên nút = `water_now` (không quá số Anki còn cho ôn), cây có `held` (`buried` / `later` / `notdue` / `filtered`), giọt nước chỉ khi khát, màn hết thẻ nói lý do (`#kb-done-why`), số đếm về đúng. Test mới: `tests/core/test_118.py`, `tests/core/test_music.js`, `tests/anki/e2e_118.js`.
- **1.17.4**: người dùng thấy dải chúc mừng ghi "target Đạt mục tiêu hôm nay!" (và "rainbow …"): ở 1.17.3 huy hiệu đổi emoji thành tên icon nhưng `celebrate()` vẫn ghép tên đó vào chữ → giờ dùng `[i:tên]` + `GardenIcons.fill`; test mới bật cả 4 kiểu dải chúc mừng + huy hiệu cạnh ruộng.
- **1.17.3**: người dùng "không muốn các icon (🔥 9 ngày liền, 🔒 Mùa lá đỏ, 🌱 Giống cây…), game pixel thì hình pixel luôn; tab Giống cây nhảy lên để làm gì, để bình thường cũng ổn" → `web/icons.js`: 27 icon pixel 8×8 vẽ tay thay mọi emoji / ký hiệu kiểu icon (giữ dấu chữ ✓ ✕ ▸ ♪ ▶ ✦); bỏ việc ẩn khung xem trước ở tab Tủ đồ / Xưởng / Giống cây (thêm ở 1.17.1). Quy ước: chữ có `[i:tên]` thì `GardenIcons.fill` vẽ icon (dùng được cả cho câu Python gửi sang). **Không dùng emoji trong giao diện nữa.**
- **1.17.2**: người dùng chỉ ra hàng tab của Nhà "chưa đều nhau" (vạch ngăn nhóm từ 1.15 làm chỗ hở 18px, chỗ 4px) → 10 tab bằng nhau, khoảng cách đều; soát thêm mọi hàng nút / tab / chip bằng phép đo "hàng lệch" mới trong `audit.js`: thanh trên cùng các ô lệch 34–44px → đều 40px, ô thông tin ở đầu bảng (Ví, Điểm, Phím…) thấp hơn nút Thoát → bằng nhau.
- **1.17.1**: người dùng "kiểm tra lại hết giao diện và tính năng, bỏ cái thừa, làm đơn giản" → soát mọi màn hình bằng `tests/anki/audit.js` (2 cỡ cửa sổ, ảnh + đo chữ cắt / tràn / nút nhỏ / lỗi JS) rồi gọn lại: ⚙ cài đặt bớt chữ, nút Ẩn furigana chỉ ở chỗ có furigana, Nhà ẩn khung xem trước ở Tủ đồ / Xưởng / Giống cây + nút Mua thẳng hàng, bảng Giao diện gập phần nâng cao, Cấu hình trường một dòng nhắc, tốc độ quạ vừa ô ở 1024px, IPA không bọc ngoặc Nhật. Sửa: Cấu hình trường và vườn đoán ngôn ngữ lệch nhau; ô âm thanh hiện "bật" khi config tắt; hướng dẫn chép chính tả gợi ý cài giọng tiếng Nhật cho deck tiếng Anh.
- **1.17.0**: deck **tiếng Anh** (ngôn ngữ theo loại note, IPA, 5 trò chơi — Đuổi quạ gõ chính tả, Điền vào câu nhận dạng biến đổi, giọng `en_US` của máy —, chép chính tả chấm theo từ; ngôn ngữ khác chỉ trò chung; không tự viết báo cho deck không phải tiếng Nhật); **furigana mọi kiểu** (`text_core.py`); bảng Trò chơi **trở lại kiểu 1.15 + drop-down**; Cấu hình trường có drop-down Ngôn ngữ / Loại và cảnh báo trường nhồi chung; **bỏ Âm Hán Việt + Loại từ khỏi từ vựng**. Test mới: `tests/core/test_117.py` (có vòng chạy mã 1.16 thật), `tests/anki/e2e_117.js` (45 kiểm tra), 7 deck mẫu mới trong `make_col.py`. Báo tiếng Anh để bước sau.
- **1.16.0** (bản chốt): 12 món hiếm mới cho rương nhiệm vụ (lưu ở `SEASON_KEY`, test chạy mã 1.15 thật để chắc bản cũ không xoá); ôn tối "Đêm vườn"; bảng chọn Trò chơi sắp lại; vùng tự tạo vẽ được cảnh nền 256×76 (lớp riêng, phóng to + cuộn, lưu ở `zenv`). Test mới: `tests/core/test_116.py`, `tests/anki/e2e_116.js` (25 kiểm tra).
- **1.15.0** (bản chốt sau khi soát lại toàn bộ): người dùng thấy màn chính nhiều nút, rối → 6 chip trên sân gộp thành một thẻ "Hôm nay", số cây khát lên nút Tưới ngay, chú thích ruộng một dải, gợi ý Nhà chỉ hiện khi rê chuột; tab Nhà xếp nhóm, danh sách đồ cao hơn; Xưởng thêm kẻ thẳng (L), chữ nhật (H, Shift = tô kín), làm lại (Ctrl+Y), cỡ bút 1–3; bảng Trò chơi cuộn được ở cửa sổ thấp (hết cắt chữ); tự cho ăn thiếu xu vẫn báo "thiếu xu"; nhắc cấu hình trường một lần mỗi loại note; cầu vồng ruộng đủ vòm; đỡ tốn CPU (linh vật chỉ vẽ khi đổi, 3 vòng vẽ chung nhịp, nhấp nháy CSS có giới hạn: đứng yên 150 → ~30 ms/giây). Ảnh "thú đứng trên mái nhà" người dùng gửi là ảnh thử trước khi sửa vùng đi của thú ở 1.14; test mới mô phỏng 12.000 bước để chắc thú không vào chỗ nhà.
- **1.14.0**: **Giao diện tự chỉnh** theo chế độ (màn chính / khi ôn thẻ / trò chơi & báo; sân và ruộng chuyển động / đứng yên / mờ / ẩn, hạt bay, mưa tuyết, thú nuôi, linh vật nói, hiệu ứng; bảng ôn vàng / trắng / tối, khung thẻ to; 4 kiểu có sẵn; nút Ẩn vườn trên bảng ôn). **Chỗ tiêu xu mới**: sửa nhà, 6 thú nuôi, 8 giống cây cho ruộng, vùng tự tạo (công trình 64×76 vẽ bằng Xưởng). **Hiệu ứng thành tích**: xong thẻ hôm nay, đạt mục tiêu, cả vườn xanh / ra hoa / ra quả, mốc chuỗi ngày, xong 3 nhiệm vụ. Khoá collection riêng `kotoba_batake_more`. Test: `tests/core/test_more.py`, `tests/anki/e2e_114.js`.
- **1.13.1**: thử thêm báo Gemini thật (deck N5) và sửa: bản đầu JSON hỏng (bị cắt) thì **viết lại từ đầu** thay vì "sửa" một mẩu bài; lượt sửa trả JSON hỏng thì giữ bản trước; máy tự sửa lỗi máy móc khỏi tốn lượt gọi (`3[日|にち]` → `[3日|みっか]`, `2[人|にん]` → `[2人|ふたり]`, furigana chắc chắn cho 願い / 何を / 私 / từ chỉ có chữ Hán trong phạm vi); câu chép không còn nguyên văn trong bài (hay gặp sau bước soát) thì máy chọn câu trọn vẹn trong bài; `1日` chỉ cảnh báo (ついたち hay いちにち tuỳ nghĩa); bản soát được sửa 2 lượt. Thêm thư mục `tests/` vào repo.
- **1.13.0**: thử báo Gemini với khoá thật rồi sửa hết lỗi tìm được: giọng đọc TTS 3.8 bị lồng header WAV (tiếng bụp / rè) + tự sửa file cũ; bản đọc chậm tạo tại máy (trước luôn bị bỏ); thử mọi model kể cả Flash-Lite, nhớ model hết hạn mức tới giờ Google đặt lại, model đã chạy đi trước; lượt sửa / soát giới hạn "suy nghĩ" (trước bị cắt, hỏng cả số); tự nối tra từ cho từ đã học, chặn bước soát làm rơi tra từ; bắt buộc 3 bài, gợi ý chữ Hán khó / mẫu trọng tâm / câu chép vắt qua 「」. **Chép chính tả cho mọi deck**: câu ví dụ không có audio đọc bằng giọng Gemini (kho `giong/`) hoặc giọng tiếng Nhật của máy, deck không có câu ví dụ thì nghe từ – gõ từ, câu báo thiếu audio dùng giọng dự phòng, hướng dẫn rõ khi không có gì để nghe, tuỳ chọn `dict_voice`. Sửa: Esc để đóng bảng (Nhà / Trò chơi / Báo / ôn thẻ) đóng luôn cả cửa sổ vườn trên Anki 26.x.
- **1.12.0**: **Báo do Gemini viết** (tab Nguồn báo: dán khoá Gemini → add-on tự viết mỗi ngày, kiểm tra + sửa + soát lần 2, giọng đọc Gemini; song song với Claude Code, chọn thư mục kotoba_daily ngay trong giao diện). Sửa: phím **B** lần nữa không đóng bảng báo; thông báo "chưa cấu hình trường" che nút Lật thẻ / ô gõ trò chơi. `kotoba_daily` 2.2: `kiemtra.py` bắt romaji / chữ Trung / ngày đọc đặc biệt / cách đọc không khớp kana.
- **1.11.0**: **Bù xu cho lượt ôn trên điện thoại** (+1 / lượt nhớ, nhiệm vụ hôm nay, mục tiêu ngày; sổ ở khoá `kotoba_batake_mobile`; thông báo 📱; ⚙ ghi tổng đã bù; tắt bằng `mobile_coins`). **Báo lỗi** (nhật ký lỗi Python + JS, cửa sổ Báo lỗi từ ⚙ và menu Tools: thông tin máy + lỗi gần đây, ẩn thông tin cá nhân, Chép / Lưu ra file; nhắc một lần khi trang gặp lỗi).

**Add-on**
- **≤ 1.0**: vườn theo FSRS, ôn trong vườn (iframe chống giật, type-answer), note nhiều trường, 5 mini-game, xu, Nhà & Cửa hàng, nhạc nền, đồng bộ AnkiWeb, nhiệm vụ hằng ngày, đồ hiếm.
- **1.1**: deck kanji (Âm On/Kun, Hán Việt).
- **1.2**: trời theo giờ thật / giờ game / cố định, thời tiết, ban đêm; 4 tốc độ cho quạ.
- **1.3**: tự mở toàn màn hình, F11, nhớ kích thước; bỏ CSS mặc định của Anki; tự zoom theo cửa sổ.
- **1.4**: 3 vùng mới, 3 kiểu nhà, tủ đồ và biểu cảm StackChan, Xưởng chế tác.
- **1.5**: hiệu ứng đồ vật, nảy khi đặt đồ, sửa lỗi cảnh màn chính và xưởng, tối ưu.
- **1.6**: báo 畑新聞 (hòm thư, chip, phím B, furigana, tra từ, giọng đọc, truyện dài kỳ, câu hỏi, kệ báo đọc bù); chép chính tả hằng ngày (gõ romaji được, ôn câu sai 1/3/7 ngày); 2 loại nhiệm vụ mới; ghi `tien_do.json`; khoá collection riêng `kotoba_batake_paper`.
- **1.6.1**: lượt chép hằng ngày ưu tiên câu từ báo (tối đa 4).
- **1.7.0**: sửa vũng nước khi mưa / giông vẽ đè lên nhà; sửa nhạc nền chỉ bật sau lần bấm đầu tiên; sửa chip "Báo · Chép" bị cắt ở cửa sổ thấp (1366×768, 1280×800). Thêm 3 vùng (Rừng tre, Suối nước nóng, Ga làng quê có tàu chạy qua), 32 món mới, mô tả hiệu ứng + nhãn "Mới", nút ◂ ▸ / phím ← → đổi cảnh, biểu tượng cửa hàng to hơn; hiệu ứng trời (gợn vũng nước, giọt bắn, cầu vồng, tuyết đọng, gió giông, chim, sao băng, hạt theo mùa); Xưởng thêm 5 hiệu ứng, vẽ đối xứng, lật dọc, dịch hình, sửa vài lỗi nhỏ. Phần mới lưu ở khoá riêng `kotoba_batake_ext`.
- **1.9.0**: **Cấu hình trường theo loại note** (bảng pixel chọn loại Từ vựng / Chữ Hán / Ngữ pháp / Khác và trường cho từng vai trò, bắt buộc Từ + Nghĩa / Kanji + Hán Việt / Cấu trúc + Nghĩa, gợi ý tự động, note mẫu, chip ⚠ + thông báo khi có loại note chưa cấu hình); **trò chơi theo loại note** với chế độ riêng (Lật cặp Kanji ↔ Hán Việt / Nghĩa / On/Kun, Chợ sáng Hán Việt → Kanji…, nghe câu ví dụ → chọn mẫu ngữ pháp, điền mẫu ngữ pháp vào câu), thiếu trường thì báo lý do; cây ngữ pháp có cách dùng + nghe ví dụ. Khoá riêng `kotoba_batake_fields`.
- **1.10.0**: **Mở nhanh** — nút ことば畑 (mầm pixel) trên thanh trên cùng của Anki, phím Ctrl+Shift+K, **biểu tượng ngoài Anki** (Ubuntu: màn hình nền + menu ứng dụng; Windows: màn hình nền + menu Start; macOS: ứng dụng nhỏ) bấm là vào thẳng vườn; biểu tượng pixel mới. **Mùa & Lễ hội phủ hết**: cây / đất riêng của 6 vùng theo chủ đề; màn trò chơi theo giờ, thời tiết, chủ đề (trước đó trò chơi luôn là ban ngày có mặt trời dù vườn đang đêm). Sửa: bảng ⚙ tràn ở cửa sổ thấp (giờ cuộn được), ô đáp án Điền vào câu quá cao chữ nhỏ, gợi ý Đuổi quạ khó đọc trên trời tối.
- **1.8.0**: **Mùa & Lễ hội** — 14 giao diện theo mùa / lễ hội (4 mùa, Tết, Giáng sinh, お正月, Trung thu, Halloween, Mùa lá đỏ, Thất Tịch, Lễ hội mùa hè, Mùa mưa, Hoa anh đào), mở bằng 1000 xu hoặc chuỗi 7 / 10 ngày ôn, tự đổi theo lịch (Tết, Trung thu theo âm lịch VN) hoặc chọn tay / tắt, xem thử; giao diện đổi cả trang, ruộng, sân, vùng, phòng (dây trang trí, tuyết phủ, hạt rơi, trăng rằm, Ngân Hà, pháo hoa, diều, xe tuần lộc…), thời tiết nghiêng theo mùa, 3 bản nhạc vườn mới, chip chủ đề, linh vật chào; 40 món theo mùa có hoạt hình. Khoá riêng `kotoba_batake_season`.

**Bộ `kotoba_daily`**
- **Bản đầu**: lộ trình, trích chương, `pham_vi.py`, `kiemtra.py`, `render.py`, `doc_voicevox.py`, prompt hằng ngày, số báo mẫu.
- **Bản 2**: đọc `tien_do.json`; `khi_ton` (mặc định `rut_gon`) và số rút gọn; số kỳ truyện (`ky`, `ky_truoc`); chọn chương trọng tâm khi chuyển giáo trình; bỏ số báo hỏng.
- **Bản 2.1**: quy tắc furigana cho ngày tháng.
- **Bản 2.2** (cùng add-on 1.12): `kb_markup.problems` thêm lỗi chữ Latin / romaji / tiếng Việt trong câu Nhật (chữ viết tắt in hoa 2–5 chữ chỉ cảnh báo), chữ Hán ngoài bộ mã Nhật / giản thể, `3[日|にち]` → `[3日|みっか]`, `2[人|にん]` → `[2人|ふたり]`, cách đọc không chứa phần kana của chữ. HUONG_DAN nhắc cách Gemini. Chỉ thay `tools/kb_markup.py` + `HUONG_DAN.md`.
- **3 số đọc thử** viết sẵn cho 2, 3, 4/11/2026 (gói `bao_doc_thu.zip`, có một tin thật về lá đỏ). Chưa có audio.

---

## 12. Cách làm việc với dự án này (cho phiên chat mới)

1. **Đọc mã trước khi đề xuất.** Gói `.ankiaddon` là file zip. README chi tiết của add-on nằm trong gói, có bảng giao thức và hướng dẫn thêm món đồ, vùng, game.
2. **Giữ các nguyên tắc ở mục 0 và quyết định ở mục 7.** Muốn đổi thì hỏi người dùng trước.
3. **Thêm tính năng ở phía Python**: đặt logic vào `garden_core.py` hoặc `paper_core.py` (không import aqt). `__init__.py` chỉ nối lệnh. Luôn bắt lỗi tiếng Việt (`HomeError`, `PaperError`) và gửi `homeError` / `paperError`.
4. **Dữ liệu mới cần đồng bộ**: dùng khoá cấu hình collection **riêng** kèm hàm `_clean_*`. Đừng nhét khoá lạ vào ví, vì bản cũ sẽ xoá.
5. **Phía JS**: module IIFE mới gắn vào biến toàn cục, `init(helpers)` từ `garden.js`. Thêm vào danh sách nạp trong `__init__.py` (trước `garden.js`). CSS theo kiểu pixel, tiền tố riêng.
6. **Kiểm thử**: chạy bộ test 1.6 (và 19 bộ cũ nếu có). Thêm test cho tính năng mới. Đóng gói theo mục 8, rồi chạy lại test trên bản giải nén.
7. **Cập nhật tài liệu**: README trong gói add-on, `config.md`, file README tổng hợp này (mục 10 và 11), và `HUONG_DAN.md` nếu bộ `kotoba_daily` đổi.
8. **Giao tiếp với người dùng**: tiếng Việt, ngắn gọn, ưu tiên cho xem bản mẫu cụ thể. Mỗi lần chỉ hỏi một câu. Khi đưa file thì nói rõ cài vào đâu, chép đè phần nào, giữ nguyên phần nào.
