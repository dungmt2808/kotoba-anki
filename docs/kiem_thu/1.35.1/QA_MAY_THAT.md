# QA trên máy thật — ことば畑 1.35.1

Không cần biết tiếng Đức / Pháp / Trung / Hàn: chỉ cần so màn hình với cột **"Phải thấy"** ở các bảng. Mỗi kết quả trong danh
sách này Claude đã chạy thử trong Anki thật với đúng bộ thẻ mẫu (`tests/anki/e2e_qa1351.js`, 21 / 21 đạt — cùng bộ thẻ trên
1.35.0 trượt 9 ca).

**Thời gian**: phần **A + B + D** khoảng 35 phút (bắt buộc); phần **C** (báo, tốn lượt Gemini) và **E** (đồng bộ) làm nếu có
thời gian.

Gặp gì lạ: chụp màn hình + trong vườn bấm ⚙ → *Báo lỗi · góp ý · khác* → **Báo lỗi** → *Chép báo cáo* → gửi tớ.

---

## 0. Chuẩn bị (5 phút)

1. **Sao lưu**: Anki → *File → Create Backup* (Tạo bản sao lưu).
2. **Ghi lại vườn hiện tại** (để so ở phần A): mở vườn, chụp màn hình: số xu, sân, Trong nhà; Nhà → *Album* (3 mục); nếu đã có
   bản *Trang trí thử* thì chụp cả bản đó.
3. **Tải 2 file** từ nhánh `claude/addon-review-new-languages-y9hrzh`:
   - gói add-on: <https://github.com/dungmt2808/kotoba-anki/raw/claude/addon-review-new-languages-y9hrzh/kotoba_batake.ankiaddon>
   - bộ thẻ mẫu: <https://github.com/dungmt2808/kotoba-anki/raw/claude/addon-review-new-languages-y9hrzh/docs/kiem_thu/1.35.1/qa/the_mau_QA_1351.apkg>
4. **Cài đè**: *Tools → Add-ons → Install from file…* → chọn `kotoba_batake.ankiaddon` → khởi động lại Anki.
5. Kiểm bản: vườn → ⚙ → *Báo lỗi* → dòng **Add-on** ghi `ことば畑 1.35.1`.

## A. Dữ liệu cũ còn nguyên — hồ sơ thật (5 phút) ⭐ quan trọng nhất

| # | Làm | Phải thấy |
|---|---|---|
| A1 | Mở vườn | Số xu **giống hệt** ảnh ở bước 0.2; sân, nhà, đồ đặt, thú nuôi như cũ |
| A2 | Nhà → *Album* → Khách ghé vườn / Hộp sưu tầm / Sinh hoạt | Số đếm (vd. "Sinh hoạt · 23/67") như trước |
| A3 | Lịch hoa → một ngày có nhật ký | Nhật ký còn chữ |
| A4 | ⚙ | Cài đặt như cũ (nền trang, ngôn ngữ trong vườn, cỡ thẻ…) |
| A5 | Nhà → *Trang trí thử* → Bản 1 / 2 / 3 | Bản thử cũ (nếu có) còn nguyên |
| A6 | *Tưới ngay* ôn 2 thẻ | Ôn bình thường, được xu như trước |

## B. Bộ thẻ mẫu 4 tiếng — hồ sơ thử (15 phút)

Làm ở **hồ sơ riêng** để thẻ mẫu không lẫn vào bộ thẻ thật: *File → Switch Profile → Add* → đặt tên `QA` → mở hồ sơ đó →
*File → Import…* → chọn `the_mau_QA_1351.apkg` → mở vườn (Ctrl+Shift+K). Bộ mẫu có 5 deck trong `QA 1.35.1`.
Thông báo hồng "Có loại note … chưa cấu hình trường" là **bình thường** (máy đã tự đoán; không cần lưu).

### B1. Vườn tự nhận ngôn ngữ của deck

Ở ô **Deck** (trên cùng) chọn lần lượt từng deck rồi mở ⚙ → dòng *Ngôn ngữ trong vườn*:

| Deck | Phải thấy ở ⚙ |
|---|---|
| QA 1.35.1 › Tiếng Đức | "Tự theo deck · đang: **Tiếng Đức**" |
| QA 1.35.1 › Tiếng Pháp | "… đang: **Tiếng Pháp**" |
| QA 1.35.1 › Tiếng Trung | "… đang: **Tiếng Trung**" |
| QA 1.35.1 › Tiếng Hàn | "… đang: **Tiếng Hàn**" |
| QA 1.35.1 › Tiếng Ý (phải là Ngôn ngữ khác) | **không** phải Tiếng Pháp / Đức / Anh (bản 1.35.0 nhận nhầm là Tiếng Pháp) |

### B2. Cấu hình trường tự nhận câu ví dụ

Chọn deck Tiếng Đức → ⚙ → *Cấu hình trường…* → loại note `QA Deutsch Wortschatz`:

| Ô | Phải thấy |
|---|---|
| Ngôn ngữ | Tiếng Đức |
| Câu ví dụ | Beispiel |
| Dịch câu ví dụ | Beispiel Übersetzung |

(Bản 1.35.0 để trống hai ô câu ví dụ → trò Điền vào câu không có câu nào.) Không cần bấm Lưu. Deck Pháp / Trung / Hàn tương
tự: `Exemple` / `例句` / `예문`.

### B3. Trò chơi → **5. Điền vào câu** ⭐

Chọn từng deck → *Trò chơi* → *Điền vào câu*. Câu hiện ra phải có **ô trống (dấu ？) ở đúng chỗ** như bảng — trong bảng ô
trống viết là ＿ (đáp án đúng = từ ở cột đầu). Không cần làm hết, mỗi tiếng xem 3–4 câu, nhất là các dòng **in đậm** (từ "bẫy" đã sửa).

| Tiếng Đức — từ (nghĩa) | Phải thấy |
|---|---|
| **der Morgen (buổi sáng)** | Am ＿ trinke ich Kaffee. |
| **morgen (ngày mai)** | Wir sehen uns ＿. |
| **der Hund, -(e)s, -e (con chó)** | Die ＿ spielen im Garten. |
| **aufstehen (thức dậy)** | Er ist um sechs Uhr ＿. |
| **alt (cũ, già)** | Mein Bruder ist ＿ als ich. |
| gut (tốt) | Das Essen ist heute ＿. |
| das Haus, ¨-er (ngôi nhà) | Die ＿ im Dorf sind alt. |

| Tiếng Pháp — từ (nghĩa) | Phải thấy |
|---|---|
| **le lit (cái giường)** | Le chat dort sur ＿. |
| **lire (đọc)** | Il ＿ un livre le soir. |
| **la porte (cái cửa)** | Elle ouvre ＿. |
| **porter (mặc, mang)** | Elle ＿ une robe rouge. |
| **l'été (mùa hè)** | Cet ＿, il fait très chaud. |
| le papier (giấy) | Je n'ai plus de ＿. |
| aujourd'hui (hôm nay) | ＿, il pleut. |

| Tiếng Trung — từ (nghĩa) | Phải thấy |
|---|---|
| 家 (nhà) | 我在＿吃饭。 |
| 大家 (mọi người) | ＿好！ |
| 天气 (thời tiết) | 今天＿很好。 |
| 喝 (uống) | 我＿茶。 |

| Tiếng Hàn — từ (nghĩa) | Phải thấy |
|---|---|
| **쉬다 (nghỉ ngơi)** | 주말에 집에서 ＿. |
| **돕다 (giúp đỡ)** | 친구를 ＿. |
| 학교 (trường học) | ＿에서 공부해요. |
| 사과 (quả táo) | ＿를 샀어요. |

(Bản 1.35.0: cả 4 tiếng **không có câu nào** — trò này báo "chưa đủ từ".)

### B4. Trò chơi → **3. Đuổi quạ**, chế độ "Nghĩa → gõ từ tiếng Đức / tiếng Pháp"

Quạ mang nghĩa tiếng Việt bay tới; gõ đúng chữ ở cột giữa (copy cũng được) → quạ bay đi.

| Quạ mang | Gõ | Ghi chú |
|---|---|---|
| con chó (deck Đức) | `Hund` | deck ghi "der Hund, -(e)s, -e" — bản 1.35.0 chấm **sai** |
| vui mừng (Đức) | `freuen` | không cần gõ "sich" |
| cô bé (Đức) | `Maedchen` | không có ä vẫn đúng |
| con đường (Đức) | `Strasse` | ß gõ ss |
| trường học (deck Pháp) | `ecole` | không dấu, không cần "l'" |
| ngồi (Pháp) | `asseoir` | không cần "s'" |
| thức dậy (Pháp) | `lever` | không cần "se" |

Gõ thử một chữ sai (vd. `Katze` khi quạ mang "con chó") → quạ **không** bay đi.

### B5. Trò chơi → **2. Chợ sáng** (deck Đức hoặc Pháp)

Chơi 1 ván. Bong bóng của khách khi hỏi bằng chữ Đức / Pháp phải là kiểu **„der Hund“, bitte!** — **không** còn đuôi
", -e" / ", -(e)s, -e" / "(m)" trong ngoặc.

### B6. Ngôn ngữ trong vườn → Tiếng Đức

Làm ở **hồ sơ thật** (hồ sơ `QA` mới tạo chưa có việc nào trong Sổ sinh hoạt): ⚙ → *Ngôn ngữ trong vườn* → **Tiếng Đức** →
Nhà → *Album* → **Sinh hoạt**: mọi ô chữ Đức đọc trọn từ, **không từ nào bị bẻ
đôi giữa chữ** (so với ảnh `so_sinh_hoat_de_truoc_sau.png` cùng thư mục: trên = 1.35.0 "Morgengymnas / tik", dưới = 1.35.1).
Đổi sang Tiếng Pháp / Trung / Hàn xem lướt; StackChan góc trái nói câu ngắn bằng đúng tiếng đó. Xong đặt lại *Tự theo deck*.

### B7. Luyện viết tiếng Trung / Hàn / Đức / Pháp (mới ở 1.35.1) ⭐

Luyện viết chọn tiếng theo **báo đã tick** (không cần viết báo). Ở hồ sơ `QA`: vườn → *Báo* → tab *Nguồn báo* → *Báo muốn
nhận*: tick **Tiếng Đức + Tiếng Pháp** (bỏ tick khác) → mở **Lịch hoa** (phím L) → hôm nay → khung **Luyện viết**:

| Làm | Phải thấy |
|---|---|
| Nhìn đầu khung | Hai nút **Tiếng Đức · Tiếng Pháp**; "tối đa 30 từ"; bộ đếm "0 / 30 từ" |
| Bấm **Tiếng Đức** | Chữ mờ trong ô: *Schreib ein, zwei Sätze…*; "Gợi ý:" 2 từ của deck Đức, **không** kèm ", -e" / "(m)" |
| Bấm **Tiếng Pháp** | Chữ mờ: *Écris une ou deux phrases…* |
| (Tiếng Đức) dán: `Gestern ich habe Tee getrunken und gehe in Park.` → **Gửi Gemini sửa** (cần khoá, 1 lần / ngày, ~10–60 giây) | "Câu đã sửa" kiểu **Gestern habe ich Tee getrunken und bin in den Park gegangen.**, chỗ sửa tô xanh; phần "Lỗi" có giải thích **tiếng Việt có dấu** |

Đổi tick sang **Tiếng Trung + Tiếng Hàn** → khung có nút Tiếng Trung / Tiếng Hàn, đếm "… / 60 ký tự", chữ mờ *写一两句话吧…* /
*한두 문장을 써 보세요…*; gõ quá 60 ký tự thì tự cắt + báo "Đã cắt bớt".

(Bản 1.35.0: người chỉ học 4 tiếng này **không có** khung Luyện viết; người có cả deck Nhật thì chỉ viết được tiếng Nhật.)

## C. Báo tiếng Đức / Pháp (tuỳ chọn — tốn ~6 lượt Gemini, chờ ~5–10 phút)

Ở hồ sơ `QA`: vườn → *Báo* → tab **Nguồn báo** → dán khoá Gemini → *Báo muốn nhận*: chỉ tick **Tiếng Đức** (hoặc Đức + Pháp)
→ *Lấy từ*: deck `QA 1.35.1::Tiếng Đức` → **Bắt đầu viết** → đợi báo vào hòm thư.

| Làm | Phải thấy |
|---|---|
| Mở số báo | Đầu báo **Der Wortgarten**; ngày hôm test bằng tiếng Đức (kiểu "Mittwoch, 18. November 2026"); "Nr. 1" |
| Nhìn bài | Toàn chữ Latin (không chữ Nhật / Trung / Hàn); có từ gạch chân |
| Bấm một từ gạch chân | Hiện **từ đúng như trong deck** + nghĩa tiếng Việt của deck (vd. bài viết "Hunde" → **der Hund** · con chó; nghĩa phải là một dòng của cột Bedeutung) |
| Chép chính tả cuối báo | Gõ lại câu nghe được, thay ä bằng ae → vẫn **Đúng rồi** |

Báo tiếng Pháp tương tự: **Le Jardin des Mots**, ngày kiểu "mercredi 18 novembre 2026", "N° 1".

## D. Trang trí thử — không mất bản thử (5 phút) ⭐

Làm ở hồ sơ thật (đặt thử không tốn xu tới khi bấm "Dùng bản này") hoặc hồ sơ `QA`.

| # | Làm | Phải thấy |
|---|---|---|
| D1 | Nhà → **Trang trí thử** → ở thẻ một món chưa có bấm *Đặt thử* → bấm một ô trên cảnh | Món hiện mờ, khung đứt, chữ "thử"; thanh dưới cảnh "1 món chưa có · N xu"; **xu không đổi** |
| D2 | Đóng vườn (Esc tới khi đóng) → mở lại → Nhà → Trang trí thử | Món thử **vẫn còn** |
| D3 | Bấm **Như cảnh thật** | **Hộp hỏi** "Bản 1 về giống cảnh thật?" (bản 1.35.0 xoá luôn, không hỏi) |
| D4 | Bấm **Huỷ** | Món thử vẫn còn |
| D5 | Bấm **Như cảnh thật** → **Về giống cảnh thật** | Bản thử về giống cảnh thật |
| D6 | Đặt thử lại 1 món → **Dùng bản này · N xu** → đồng ý | Xu giảm **đúng N**; món bày đúng chỗ; thoát thử |

## E. Đồng bộ AnkiWeb (tuỳ chọn, nếu cậu có dùng)

0. (Nếu còn máy khác chạy bản 1.31.3) Viết luyện viết tiếng Đức ở máy 1.35.1 → đồng bộ → máy cũ mở Lịch hoa: bài vẫn đủ chữ
   (máy cũ ghi là tiếng Anh — bình thường); máy cũ viết nhật ký cùng tháng → đồng bộ về máy mới: bài tiếng Đức còn nguyên.

1. Đang ở Trang trí thử thì bấm **Sync** của Anki; trong lúc thanh đồng bộ còn chạy, dời một món thử.
   Phải thấy: món dời vẫn còn sau khi đóng / mở vườn (bản 1.35.0 mất lần dời đó).
2. Đồng bộ xong → mở Anki trên điện thoại, ôn 1 thẻ, đồng bộ → máy tính đồng bộ lại → mở vườn: xu / đồ / nhật ký **không**
   lùi về bản cũ.

## F. Kết thúc

1. Vườn → ⚙ → *Báo lỗi*: phần nhật ký **không có lỗi mới** trong lúc test (có thì *Chép báo cáo* gửi tớ).
2. Xoá hồ sơ thử nếu muốn: *File → Switch Profile* → chọn `QA` → *Delete*.
3. Mọi thứ ổn → nhắn tớ "gộp master" để gộp 1.35.0 + 1.35.1.

**Nếu cần quay lại bản cũ**: cài lại gói 1.31.3 (bản trên AnkiWeb) như bước 0.4 — dữ liệu vườn giữ nguyên (đã thử hạ bản rồi
lên lại trong Anki thật: 26 / 26).
