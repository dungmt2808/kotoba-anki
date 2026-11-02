# ことば畑 · Vườn từ vựng pixel + 畑新聞 (báo tiếng Nhật mỗi sáng)

README tổng hợp của cả dự án, viết để một phiên chat Claude hoặc Claude Code mới đọc là nắm được: dự án là gì, gồm những phần nào, chạy ra sao, đã chốt những gì và còn gì chưa làm.

Cập nhật: 2026-11-01. Add-on **1.10.0**, bộ `kotoba_daily` bản có `tien_do.json` / số rút gọn / số kỳ truyện.

---

## 0. Đọc nhanh (cho phiên chat mới)

**Hai phần của dự án**
1. **Add-on Anki ことば畑** (gói `kotoba_batake`, bản 1.10.0): biến deck tiếng Nhật (từ vựng, chữ Hán, ngữ pháp) thành khu vườn pixel. Mỗi note là một cây lớn theo độ bền trí nhớ FSRS. Có xu, nhà, cửa hàng, mini-game, nhiệm vụ, từ 1.6 có **báo 畑新聞** và **chép chính tả hằng ngày**, từ 1.8 có **giao diện Mùa & Lễ hội** (Tết, Giáng sinh, hoa anh đào, lá đỏ…), từ 1.9 có **Cấu hình trường theo loại note** và trò chơi theo loại note (từ vựng / chữ Hán / ngữ pháp), từ 1.10 có **nút mở nhanh** (thanh trên cùng của Anki, Ctrl+Shift+K, biểu tượng ngoài Anki) và Mùa & Lễ hội phủ cả các vùng lẫn màn trò chơi.
2. **Bộ `kotoba_daily`**: script Python và prompt để **Claude Code** (tác vụ lịch của Claude Desktop) mỗi sáng tự viết một số báo tiếng Nhật chỉ dùng ngữ pháp và từ vựng người học đã học, kèm audio VOICEVOX. Add-on đọc báo từ thư mục này.

**Người dùng**
- Người Việt học tiếng Nhật, xưng "tớ". Trả lời bằng tiếng Việt, ưu tiên ví dụ cụ thể, bản mẫu, hình minh hoạ. Khi giải thích quá kỹ thuật, người dùng từng nói "chưa hình dung được": hãy cho xem thứ cụ thể trước rồi mới giải thích.
- Giáo trình GUNGUN của trung tâm: **N5 = chương 1–14, N4 = chương 15–33**. Đang học tới **chương 29** (kính ngữ: させてください, させていただけませんか, お〜します, お〜になる, お〜ください, 〜なさい).
- Máy: **Ubuntu 22.04**, **Anki 26.09.3** (Qt6, bật FSRS). Có sẵn một Claude Code trong thư mục tiếng Nhật chuyên đọc giáo trình và trích từ vựng ra file Anki. Dùng Claude Desktop (bản Linux beta) để đặt lịch. VOICEVOX chạy bằng Docker.

**Quy tắc vàng khi sửa**
- Python là nguồn sự thật cho xu, quyền sở hữu, chỗ đặt, chấm điểm. JS chỉ vẽ và gửi lệnh.
- Không bao giờ để xu hay game đụng tới lịch FSRS. Cây phải phản ánh trí nhớ thật.
- Dữ liệu từ deck và từ thư mục báo là **dữ liệu không tin cậy**: luôn làm sạch (`_clean_*`, `clean_issue`) và hiển thị bằng `textContent`.
- Giao diện, chú thích mã, tài liệu đều bằng **tiếng Việt** (kèm tiếng Nhật trang trí). Phong cách pixel: viền đen 3px, bóng cứng, không bo góc.
- Sửa xong phải chạy test và đóng gói theo mục 8.

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
- Tối đa `max_plants` cây (mặc định 400, ưu tiên cây đã học). Bấm cây để ghim thẻ thông tin: chữ, cách đọc, nghĩa, Hán Việt, nút nghe, số ngày tới hạn.
- Thanh trên: linh vật, chọn deck, xu, số cây khát, ⚙ cài đặt, Nhà, Trò chơi, Tưới ngay.
- Chip trên sân: thời tiết và giờ, "Hôm nay X/30 lượt · N ngày liền", "Nhiệm vụ 0/3 ▸", "Báo mới N · Chép x/5 ▸".
- Phím tắt: **R** ôn, **T** trò chơi, **N** nhà, **Q** nhiệm vụ, **B** báo & chép chính tả, **← →** đổi cảnh ngoài trời (1.7), **Esc** đóng, **F11** toàn màn hình. Khi đang ôn thẻ thì R/T/N/B không có tác dụng (có chủ ý).
- Góc dưới trái sân (1.7): nút **◂ Tên cảnh · n/N ▸** đổi nhanh giữa sân nhà và các vùng đã mở. Sân thấp (cửa sổ cao < 860px) thì chip bên phải xếp 2 hàng để không bị cắt.

### 2.2 Ôn thẻ trong vườn ("Tưới ngay")
- Dùng scheduler v3 thật của Anki, ghi revlog như ôn bình thường. Thẻ hiện trong một iframe dựng một lần nên lật thẻ không giật. Hỗ trợ `[[type:...]]`, audio, CSS mẫu thẻ, hook `card_will_show`.
- Ôn ở màn ôn thường của Anki cũng được xu và tính nhiệm vụ (hook `reviewer_will/did_answer_card`).

### 2.3 Xu, mục tiêu ngày, nhiệm vụ
- +1 xu mỗi lần nhớ (Khó/Được/Dễ); cây lên giai đoạn được thêm `2 × giai_đoạn_mới`.
- Mục tiêu ngày 30 lượt → +15 xu.
- 3 nhiệm vụ mỗi ngày (+20 xu mỗi cái), xong cả 3 mở rương: +30 xu và 1 món hiếm.

### 2.4 Năm mini-game (không ghi vào FSRS, tối đa 40 xu/ngày)
Nghe tìm cây (`listen`), Chợ sáng (`market`), Đuổi quạ (`crow`, gõ romaji/kana/kanji, 4 tốc độ), Lật cặp (`memory`), Điền vào câu (`cloze`, dùng câu ví dụ của note).

Từ 1.9: đầu menu chọn **loại note để ôn** (chỉ hiện loại có trong deck); mỗi trò có **chế độ** (nút nhỏ dưới thẻ trò, mục đầu là mặc định, lưu trong collection):

| Trò | Từ vựng | Chữ Hán | Ngữ pháp |
|---|---|---|---|
| Nghe tìm cây | Nghe → chọn chữ / nghĩa | Nghe → chọn kanji / Hán Việt | Nghe câu ví dụ → chọn mẫu |
| Chợ sáng | Trộn / Nghĩa → Từ / Từ → Nghĩa / Cách đọc → Từ | Hán Việt → Kanji / Nghĩa → Kanji / Kanji → Hán Việt / Kanji → On/Kun / Trộn | Trộn / Nghĩa → Mẫu / Mẫu → Nghĩa |
| Đuổi quạ | Nghĩa → gõ từ / Chữ → gõ cách đọc | Kanji → gõ On/Kun / Hán Việt → gõ âm hoặc chữ | không hỗ trợ |
| Lật cặp | Trộn / Từ ↔ Nghĩa / Từ ↔ Cách đọc | Kanji ↔ Hán Việt / Nghĩa / On/Kun / Trộn | Mẫu ↔ Nghĩa |
| Điền vào câu | điền từ | điền chữ Hán vào từ / câu ví dụ | điền mẫu (kể cả mẫu đã chia) |

Thiếu trường cần cho trò / chế độ thì nút đó bị khoá và ghi lý do ("Cần ít nhất 4 chữ có audio (hiện có 0). Chọn trường ở ⚙ Cấu hình trường.").

### 2.4b Cấu hình trường theo loại note (từ 1.9)
- Bảng **Cấu hình trường** (mở từ chip **⚠ Cấu hình trường ▸** ở góc sân, thông báo bật lên khi deck có loại note chưa cấu hình (bấm vào là mở), ⚙ → *Cấu hình trường…*, hoặc nút trong menu Trò chơi). Mỗi loại note (note type) chọn: **Từ vựng / Chữ Hán / Ngữ pháp / Khác** rồi chọn trường cho từng vai trò, có cột giá trị của 5 note mẫu và dòng "Trên cây: …", dòng "Trò chơi" báo trò nào chơi được.
- Vai trò: **Từ vựng** — Từ *, Cách đọc (furigana), Nghĩa *, Âm Hán Việt, Câu ví dụ, Dịch câu ví dụ, Audio của từ, Audio câu ví dụ, Loại từ. **Chữ Hán** — Kanji *, Hán Việt *, Nghĩa, Âm On (hoặc On/Kun chung), Âm Kun (nếu tách riêng), Ví dụ, Dịch ví dụ, Audio. **Ngữ pháp** — Cấu trúc *, Nghĩa *, Cách dùng / ghi chú, Ví dụ, Dịch ví dụ, Audio ví dụ. **Khác** — vẫn là cây nhưng không vào trò chơi. (* = bắt buộc.)
- Điền sẵn theo gợi ý tự động; lưu thì kiểm tra trường bắt buộc; có Hoàn tác / Dùng gợi ý tự động. Loại note chưa cấu hình vẫn chạy bằng cách đoán tên trường như ≤ 1.8; đã cấu hình thì chỉ dùng đúng trường đã chọn. Đổi tên / xoá trường đã chọn → báo lại.
- Cây ngữ pháp: bấm vào hiện cách dùng và nút ♪ Nghe ví dụ.

### 2.5 Nhà & Cửa hàng (8 tab)
Xây nhà 8 bậc (3.430 xu) → 3 kiểu nhà (minka, chashitsu, lâu đài mini); 39 món trang trí / nội thất (14 món mới ở 1.7: hướng dương, chong chóng gió, nhà chim, giếng, xích đu, đài phun nước, ikebana, đèn andon, radio, bể cá, bếp irori, lịch treo tường hiện đúng ngày, tranh chữ 学, tranh sóng lừng) và 6 món hiếm; 6 vùng mở lần lượt (Bãi biển 2.000, Đền trên núi 3.000, Phố lễ hội 4.000, và 1.7: **Rừng tre** 5.000, **Suối nước nóng** 6.000, **Ga làng quê** 7.000 có tàu chạy qua, mỗi vùng 6 món); tủ đồ StackChan (17 món đồ mặc, 7 biểu cảm); Xưởng chế tác (vẽ pixel 16/24/32 hoặc chuyển ảnh, 10 hiệu ứng, vẽ đối xứng, lật dọc, dịch hình); Kho đồ. Thẻ trong cửa hàng có dòng ✦ mô tả hiệu ứng và nhãn **Mới** (từ 1.8 chỉ dành cho đồ theo mùa). Tổng mua hết khoảng 55.000 xu (bản 1.6: 31.000), chưa tính Mùa & Lễ hội (14 chủ đề × 1000 xu).

### 2.5b Mùa & Lễ hội (tab thứ 8, từ 1.8)
- **14 chủ đề**: 4 mùa (Xuân, Hạ, Thu, Đông) + Tết Nguyên Đán, Giáng sinh, お正月, Trung thu · お月見, Halloween, Mùa lá đỏ 紅葉, Thất Tịch 七夕, Lễ hội mùa hè 夏祭り, Mùa mưa 梅雨, Hoa anh đào 花見. Mỗi chủ đề kèm 2–4 món đồ (tổng 40 món: 36 ngoài trời, 4 trong nhà).
- **Mở khoá**: 1000 xu **hoặc** chuỗi ngày ôn liên tiếp (mùa 7 ngày, lễ hội 10 ngày; mỗi lần đổi dùng hết chuỗi đang có). Mở là được tặng các món của chủ đề; mua thêm được khi đã mở. Có nút **Xem thử** trước khi mở.
- **Tự động theo lịch** (mặc định), hoặc chọn tay / tắt. Lịch: Giáng sinh 15/11–31/12, お正月 1–15/1, Tết từ 21 ngày trước mùng 1 tới rằm tháng Giêng, Trung thu 14 ngày trước – 3 ngày sau rằm tháng Tám (Tết và Trung thu tính bằng **âm lịch Việt Nam**), Halloween tháng 10, Mùa lá đỏ 1/11–10/12, Thất Tịch 25/6–7/7, Lễ hội mùa hè 15/7–31/8, Mùa mưa 1/6–10/7, Hoa anh đào 20/3–15/4, 4 mùa theo tháng. Trùng nhau thì lễ hội thắng mùa (thứ tự trong `season_core.THEMES`).
- **Đổi gì**: dải trang trí trên cùng trang, hạt rơi ở nền trang và trên ruộng, màu trang / chữ ことば畑 / cỏ ruộng; ở sân, mọi vùng và trong phòng: dây trang trí (đèn Noel, đèn lồng Tết, shimenawa, cờ Halloween, đèn ông sao…), màu đồi và đất, tuyết phủ (đông, Giáng sinh), hạt bay, trăng rằm có thỏ, trăng Halloween, Ngân Hà, pháo hoa đêm (Tết, lễ hội hè), diều, xe tuần lộc bay; thời tiết tự đổi nghiêng theo mùa; nhạc vườn riêng cho Giáng sinh, Tết, Halloween; chip chủ đề trên thanh trên cùng (chưa mở thì nhấp nháy mời mở khi lễ đang tới); linh vật chào theo mùa.
- **1.10**: cây và đất riêng của từng vùng theo chủ đề (rừng ở Đền đỏ / cam mùa thu và lá đỏ, điểm hoa mùa hoa anh đào / Tết, tuyết trên ngọn; Suối nước nóng cỏ xanh mùa xuân hè, cỏ úa mùa thu, tuyết mùa đông — không có chủ đề thì vẫn tuyết như cũ; lúa ở Ga làng quê chín theo chủ đề; cỏ Rừng tre / Ga pha màu đất chủ đề). **Màn trò chơi** theo giờ + thời tiết + chủ đề: Chợ sáng và Đuổi quạ có đêm (sao, trăng, trời dịu hơn vườn để vẫn đọc rõ), mây / mưa / tuyết, đất phủ tuyết, dây trang trí, hạt bay, pháo hoa; menu và 3 trò còn lại có nền pha màu chủ đề + hạt bay phía sau.

### 2.6 Trời, thời tiết, âm thanh
Giờ thật / giờ game / cố định, 6 buổi trong ngày, thời tiết đổi mỗi 3 giờ (mưa, giông, tuyết theo mùa), ban đêm có đèn và đom đóm. Âm thanh 8-bit và 3 bản nhạc nền chiptune tự soạn, **phát ngay khi mở vườn** (1.7). Hiệu ứng 1.7: vũng nước gợn sóng ở lớp mặt đất (không đè nhà), giọt nước bắn, cầu vồng khi vừa tạnh, tuyết đọng trên mái và đồ vật, giông làm đồ đung đưa mạnh, chim bay ban ngày, sao băng đêm quang, hạt theo mùa thật (hoa xuân, chuồn chuồn hè, lá đỏ thu).

### 2.7 Báo 畑新聞 & chép chính tả (bản 1.6, 1.6.1)
- Nối báo bằng config `bao_dir` (đường dẫn thư mục `kotoba_daily`, có thể dùng `~`). Chưa nối thì tab Báo hiện hướng dẫn; tab Chép chính tả vẫn chạy bằng câu ví dụ trong deck.
- Mở bằng: bấm **hòm thư** ngoài sân (cờ đỏ dựng khi có số chưa đọc; chưa nối báo thì cờ thỉnh thoảng dựng cho vui như bản cũ), chip trên sân, hoặc phím **B**.
- Bảng **新聞** có 3 tab:
  - **Báo**: số mới nhất chưa đọc. Furigana ẩn/hiện; bấm từ gạch chân → nghĩa, bài đã học, giai đoạn của cây cùng tên; ▶ nghe từng đoạn; truyện có "Kỳ trước" và nhắc nếu kỳ trước chưa đọc (nút "Đọc kỳ trước"); câu hỏi đọc hiểu; chép chính tả của số đó (Nghe / Nghe chậm); mẫu câu ở cuối; dòng ghi công VOICEVOX.
  - **Chép chính tả**: lượt 5 câu mỗi ngày (xem mục 6). Gõ kana, kanji hoặc romaji.
  - **Kệ báo**: mọi số theo ngày (Mới / Đã đọc / Xong +N xu), đọc bù lúc nào cũng được.
- Hai loại nhiệm vụ mới: `paper` (đọc xong 1 số báo), `dict` (chép đúng 3 câu). Chỉ xuất hiện khi làm được hôm đó.
- Add-on ghi `<bao_dir>/tien_do.json` để báo hôm sau nhắc lại từ yếu và biết có bao nhiêu số chưa đọc.

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
│ season_core.py  Mùa & Lễ hội: lịch (âm lịch VN), chủ đề, 40 món      │
│ fields_core.py  cấu hình trường theo loại note, chế độ trò chơi (1.9)│
│ paper_core.py   báo & chép chính tả (không import aqt)               │
└──────────────┬───────────────────────────────▲───────────────────────┘
   web.eval("Garden.fn(<json>)")               │ pycmd("nhóm:việc:tham_số")
┌──────────────▼───────────────────────────────┴───────────────────────┐
│ web/*.js (mỗi file là một IIFE gắn vào biến toàn cục), nạp theo thứ tự│
│ sky.js → season.js → fx.js → music.js → games.js → fields.js →      │
│ season_art.js → home.js → craft.js → paper.js                         │
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
| `launcher.py` | ~260 | Mở nhanh từ ngoài Anki (1.10, thuần Python): file vé `kotoba_batake_open.apkg`, `is_ticket`, `create()` tạo biểu tượng Windows (PowerShell → `.lnk` chạy `explorer.exe "vé"`, dự phòng `.url`) / macOS (`osacompile` → `.app`, thay `applet.icns`) / Linux (`.desktop` đúng đặc tả + `gio set metadata::trusted`) |
| `icons/` | | Biểu tượng mầm pixel: `kotoba.png` (Linux), `kotoba.ico` (Windows), `kotoba.icns` (macOS), `toolbar.png` (nút trên thanh Anki); vẽ bằng `tools/make_icons.py` lúc phát triển |
| `fields_core.py` | ~280 | Cấu hình trường (1.9, thuần Python): `KINDS`, `ROLES` (vai trò + bắt buộc theo loại note), `GAME_MODES` (khớp `MODES` của games.js), `guess_kind`, `clean_store`, `conf_problem`, `validate_save`, `FieldStore` |
| `garden_core.py` | ~2300 | Cân bằng game, `CATALOG` (+ `ITEM_DESC`, gộp `SEASON_ITEMS`), cửa hàng / vùng / kiểu nhà / tủ đồ / xưởng, nhận diện trường note (1.9: `note_roles` theo cấu hình hoặc đoán, `fields_panel`, `guess_config`, `grammar_candidates`), `build_garden` (+ `note_types`, `kind` của cây), giai đoạn, nhiệm vụ (`_make_quests` nhận thêm `extra`), `GardenState` (+ `add_coins`), tách / gộp khoá mở rộng (`split_ext`, `merge_ext`, `LEGACY_*`), Mùa & Lễ hội (`split_season`, `merge_season`, `_tier`, `unlock_theme`, `set_theme`) |
| `season_core.py` | ~410 | Mùa & Lễ hội, thuần Python: âm lịch Việt Nam (`lunar_to_solar`, `tet_date`, `mid_autumn_date`), `THEMES` (thứ tự = ưu tiên), `SEASON_ITEMS`, `themes_view`, `clean_season`, `active_theme`, `streak_available` |
| `paper_core.py` | ~890 | Cú pháp furigana, `clean_issue`, `Library` (đọc thư mục báo, cache theo mtime, chặn đường dẫn audio và symlink ra ngoài), `issue_view`, chấm câu hỏi / chép, lượt chép hằng ngày (`build_daily`, `DICT_REVIEW_MAX=2`, `DICT_PAPER_MAX=4`), hàng ôn 1/3/7 ngày, `PaperState`, `progress_payload` / `write_progress` |
| `config.json` / `config.md` | | Cấu hình mặc định và hướng dẫn (Tools → Add-ons → Config) |
| `web/body.html` | ~210 | Khung HTML: thanh trên, bảng ôn, game, Nhà + Xưởng, bảng 新聞 (`#kb-paper`), sân, ruộng |
| `web/garden.css` | ~1180 | Toàn bộ CSS kiểu pixel (phần báo có tiền tố `kb-p-`) |
| `web/garden.js` | ~970 | `Garden`: ruộng, thẻ ghim, bảng ôn, phím tắt, nhạc, chip báo (`drawPaperChip`), `openPaper` |
| `web/paper.js` | ~600 | `GardenPaper`: 3 tab Báo / Chép chính tả / Kệ báo, tra từ, câu hỏi, chép (romaji qua `GardenGames._typedKana`) |
| `web/home.js` | ~3620 | `GardenHome`: sprite (`SPR`, `FRAMES`, `BASE`), nhà, 7 cảnh ngoài trời + phòng, thời tiết theo lớp (vũng nước ở lớp mặt đất), đặt đồ, 8 tab cửa hàng (tab Mùa & Lễ hội: `renderSeason`, `themeCard`); cờ hòm thư theo báo, bấm hòm thư mở báo (`mainItemAt`); nút đổi cảnh ◂ ▸ (`cycleMain`) |
| `web/games.js` | ~2160 | `GardenGames`: 5 mini-game, romaji → kana; 1.9: chọn loại note, bảng `MODES` (chế độ từng trò theo loại), `poolFor(def, kind, mode)`, lý do thiếu trường (`lackText`), `supportFor`; 1.10: `skyNow`, `paintSky`, `paintWeather` (trời / thời tiết của Chợ sáng, Đuổi quạ), `drawSeasonLayer` (nền theo chủ đề của menu và các trò còn lại) |
| `web/fields.js` | ~310 | `GardenFields` (1.9): bảng Cấu hình trường |
| `web/fx.js` | ~900 | `GardenFX`: StackChan, hạt, âm thanh 8-bit |
| `web/season.js` | ~650 | `GardenSeason` (1.8): chủ đề đang dùng + xem thử, bảng giao diện `VIS`, (1.10) `FOLIAGE` / `foliage()` cây và đất riêng của các vùng, `themeSky()`, dây trang trí `GARLAND`, hạt bay theo thời gian, pháo hoa, Ngân Hà, trăng to, dải trang trí trên cùng, hạt nền trang, cỏ ruộng, chip chủ đề |
| `web/season_art.js` | ~870 | `GardenSeasonArt` (1.8): sprite + chuyển động của 40 món theo mùa, cắm vào home.js qua `install()` |
| `web/sky.js`, `web/music.js`, `web/craft.js` | | Trời & thời tiết (nghiêng theo chủ đề); nhạc chiptune (+ bản Giáng sinh / Tết / Halloween); trình vẽ pixel |

### 4.2 Cầu nối JS → Python (`pycmd`)

| Lệnh | Việc |
|---|---|
| `ready`, `refresh`, `deck:<id>` | dựng lại dữ liệu, đổi deck |
| `rv:start` / `rv:show:<gõ>` / `rv:ans:<1-4>` / `rv:stop`, `play:<q\|a>:<n>` | ôn thẻ trong vườn |
| `game:open`/`stop`/`audio:<nid>`/`exaudio:<nid>`/`reward:<game>:<điểm>:<xu>[:<thắng>]` | mini-game |
| `home:buy` / `build` / `place` / `move` / `take` / `zone` / `style:*` / `wear:*` / `face:*` / `craft:*` | Nhà & cửa hàng |
| `home:theme:buy:<id>` / `theme:streak:<id>` / `theme:use:<id>` / `theme:auto` / `theme:off` | Mùa & Lễ hội: mở bằng xu / bằng chuỗi (Python tự tính chuỗi từ revlog), chọn tay, tự động, tắt |
| `craft:save:<json>`, `craft:pick`, `win:full` | xưởng, chọn ảnh, F11 |
| `app:icon` | 1.10: tạo biểu tượng ngoài Anki (`launcher.create`) → `Garden.appIcon({ok, kind, paths, msg})` |
| `fields:open`, `fields:save:{mid,kind,f}`, `fields:game:<game>:<loại>:<chế độ>` | 1.9: dữ liệu bảng Cấu hình trường; lưu cấu hình một loại note (Python kiểm tra loại, trường bắt buộc, trường có thật); lưu chế độ trò chơi |
| `paper:index`, `paper:issue:<ngày>` | kệ báo; mở một số (đánh dấu đã đọc, ghi lại `tien_do.json`) |
| `paper:q:{d,i,c}` | trả lời câu hỏi |
| `paper:ct:{d,i,v}`, `dict:check:{id,v}` | chép chính tả (`v` = các cách hiểu chữ đã gõ) |
| `paper:play:{d,k:bai\|ct,i,j,s}`, `dict:play:{id,s}` | phát audio: file báo là đường dẫn tuyệt đối đã kiểm tra; câu ví dụ deck là tên file media |
| `dict:open`, `paper:stop` | lượt chép hôm nay; dừng audio |

Python → JS: `render`, `showCard`, `showAnswer`, `reviewDone`, `celebrate`, `gameSaved`, `home`, `homeError`, `craftImage`, `fieldsData`, `fieldsSaved`, `fieldsError`, `gameModes`, `appIcon`, `paperIndex`, `paperIssue`, `paperSummary`, `dictShow`, `paperResult`, `paperError`, `toast`, `flip`, `key`, `fit`.

Audio báo phát bằng `aqt.sound.av_player.play_file(đường_dẫn_tuyệt_đối)`. Đây là cách chính thức: `SoundOrVideoTag.path()` của Anki 26.9.3 nhận đường dẫn tuyệt đối.

---

## 5. Dữ liệu & lưu trữ

### 5.1 Cấu hình add-on (`config.json`)
`word_field`… `example_audio_field` (ép tên trường, trống = tự nhận diện; từ 1.9 chỉ dùng cho loại note chưa cấu hình trong bảng Cấu hình trường), `stage_days` [3, 21, 90], `wilt_retrievability` 0.7, `max_plants` 400, `daily_goal` 30, `daily_bonus` 15, `game_daily_coins` 40, `effects`, `sound`, `music`, `music_volume`, `show_tooltips`, `open_maximized`, `toolbar_button` (1.10, nút ことば畑 trên thanh Anki), **`bao_dir`** ("" = chưa nối báo).

### 5.2 Khoá trong cấu hình collection (đồng bộ AnkiWeb)

| Khoá | Nội dung | Sao lưu |
|---|---|---|
| `kotoba_batake_state` | ví: xu, nhà, đồ đặt ở từng cảnh, tủ đồ, xưởng, nhiệm vụ, kỷ lục game | `user_files/state.json` |
| `kotoba_batake_px` | điểm ảnh nén của món tự làm (RLE, bảng 32 màu) | `user_files/craft_px.json` |
| `kotoba_batake_paper` (1.6) | `read` {ngày: {q, ct, coins, bonus}}, `dict` {day, items, res, coins, bonus}, `queue` {id câu: {due, box}}, `seen`, `miss` {từ: ngày} | `user_files/paper.json` |
| `kotoba_batake_ext` (1.7) | phần mới mà bản ≤ 1.6.1 không hiểu: `owned` đồ mới, `zones` vùng mới, `places` {cảnh: [đồ mới hoặc đồ ở vùng mới]}, `craft_fx` {cid: {fx, was}} | `user_files/ext.json` |
| `kotoba_batake_fields` (1.9) | `models`: {id loại note: {kind vocab/kanji/grammar/other, `f` {vai trò: tên trường}, name}}, `games`: {trò: {loại: chế độ}} | không (id loại note gắn với collection; chỉ ghi `user_files/fields.json` khi chạy không có collection) |
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

Add-on chỉ **ghi đúng một file** trong `bao_dir`: `tien_do.json`.

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
- Ước tính: mua hết mọi thứ khoảng 30.000 xu; làm đủ việc mỗi ngày khoảng 170–190 xu (chưa tính báo); chỉ ôn 30 thẻ khoảng 60 xu.

---

## 7. Quyết định đã chốt (đừng đảo ngược khi chưa hỏi người dùng)

- **Báo do Claude Code viết, add-on chỉ đọc.** Add-on không gọi AI, không cần mạng, không cần khoá API.
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
- **Mở nhanh (1.10)** — người dùng hỏi có cách nào có icon bấm là vào add-on, không phải vào Tools. Đã chọn: nút ことば畑 trên thanh trên cùng của Anki (bật mặc định, tắt bằng `toolbar_button`) + phím Ctrl+Shift+K + biểu tượng ngoài Anki **chỉ tạo khi người dùng bấm** (không tự ghi file lên màn hình nền). Biểu tượng dùng **đường mở file .apkg có sẵn của Anki** (file vé + bọc `mw.handleImport`) thay vì tìm đường dẫn chương trình Anki (khác nhau theo bản cài / launcher) hay sửa tham số dòng lệnh của Anki. Windows chạy qua `explorer.exe` để ghim được vào thanh tác vụ.
- **Mùa & Lễ hội ở vùng và trò chơi (1.10)** — không có chủ đề thì mọi cảnh giữ y như cũ (Suối nước nóng vẫn giữa tuyết, lúa theo tháng thật). Trò chơi theo giờ của vườn nhưng **ban đêm sáng dịu hơn vườn** để quạ và chữ vẫn rõ; menu / Nghe tìm cây / Lật cặp / Điền vào câu chỉ đổi nền nhạt + hạt bay phía sau, không đổi màu thẻ để không khó đọc.
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

**Bộ test 1.9** (thêm vào, đều qua): `extra_models.py` (5 loại note mẫu: kanji On/Kun riêng, ngữ pháp có audio ví dụ, kanji "Sức mạnh (Lực)", tiếng Anh Front/Back/Sentence, tên trường lạ); `test_fields19.py ADDON OLD18` (86: chưa cấu hình thì đọc note **giống hệt `garden_core.py` của 1.8**, đoán loại / trường, lưu qua cầu nối thật kèm mọi lỗi, đã cấu hình thì không đoán thêm, On/Kun, tách ngoặc Hán Việt, cloze ngữ pháp, chép chính tả theo trường đã chọn, đổi tên trường, chế độ trò chơi hợp lệ / bị chặn, giữ khoá lạ, `MODES` JS khớp `GAME_MODES` Python, bản 1.8 không đụng khoá mới); `f_games.js` (chơi thử **mọi trò × mọi chế độ × 3 loại note** qua giao diện thật, chế độ còn sau khi tải lại, deck trộn 2 loại); `f_panel.js` (bảng Cấu hình trường: chip, thông báo, gợi ý, đổi loại, bắt buộc, lưu, hoàn tác, Esc, nút ở ⚙ / menu game, đổi tên trường, 2 cỡ cửa sổ); `f_extra.js` (bấm thông báo, đổi deck khi bảng mở, cây ngữ pháp). Bộ 1.7 / 1.8 chạy lại đều qua.

**Bộ test 1.8** (thêm vào bộ 1.7, đều qua): `test_season.py ADDON V170 ORIG` (250: lịch 14 chủ đề theo ngày mốc, Tết / Trung thu âm lịch 25 năm, mở khoá xu / chuỗi, lưu 3 tầng, chạy `garden_core.py` của **1.7.0 và 1.6.1 thật** trên cùng collection để chứng minh không mất chủ đề / đồ theo mùa; bản 1.8 cũng giữ nguyên phần lạ của bản mới hơn); `season_bridge.js` (đổi chuỗi qua cầu nối thật với revlog giả, mini-game khi có chủ đề); `season_shop.js` (23: tab Mùa & Lễ hội qua giao diện thật); `season_more.js` (nhạc theo chủ đề, hiệu năng 3–6,4 ms/khung, ảnh phòng / vùng); `season_narrow.js` (5 cỡ cửa sổ); `season_ui.js` (ảnh 14 chủ đề ngày / đêm). Bộ 1.7 chạy lại vẫn qua (`regress.js` đổi một kiểm tra vì vùng của 1.7 không còn nhãn "Mới").

**Bộ test 1.7** (viết lại từ đầu trong phiên 1.7 vì các bộ cũ không có trong repo; 195 kiểm tra, đều qua): `harness.py` + `stubs/aqt/` (aqt giả, `answer_card` chạy thật) + `server.py` (phục vụ trang đúng như `stdHtml`, `pycmd` → `__init__.py` thật trên collection Anki thật); `test_ext.py` (109: khoá mở rộng, chạy `garden_core.py` của 1.6.1 thật trên cùng collection để chứng minh bản cũ không xoá đồ / vùng mới); `regress.js` (42: nhạc, ôn thẻ thật, game, báo, nhiệm vụ, cài đặt, F11, mở vùng mới qua giao diện, mua / đặt / di chuyển / cất, nút ◂ ▸, quét vẽ 7 cảnh × 5 giờ × 5 thời tiết, cửa sổ hẹp); `craft_test.js` (44: toàn bộ luồng Xưởng + công cụ mới); `music_test.js`, `perf.js` (≤ 5 ms/khung mọi cảnh), `clip_check.js`, các script chụp ảnh `zones.js` / `panel.js` / `sheet.js` / `fx_test.js`.

**Đóng gói add-on**
```bash
# tăng "mod" (unix time) và "human_version" trong manifest.json
find kotoba_batake -name __pycache__ -prune -exec rm -rf {} +
rm -f kotoba_batake/user_files/state.json* kotoba_batake/user_files/craft_px.json* kotoba_batake/user_files/paper.json* kotoba_batake/user_files/ext.json* kotoba_batake/user_files/season.json* kotoba_batake/user_files/fields.json* kotoba_batake/user_files/kotoba_batake_open.apkg
(cd kotoba_batake && zip -r -X -q ../out/kotoba_batake.ankiaddon . -x "*.pyc")
# giải nén ra thư mục tạm, chạy lại test trên bản giải nén (KB_ADDON=<thư mục giải nén>)
```
`user_files/` phải có trong gói (chỉ README.txt) để Anki giữ dữ liệu khi cập nhật. Add-on cài ở `~/.local/share/Anki2/addons21/kotoba_batake/`.

**Kiểm tra bộ `kotoba_daily`**: `python3 tools/pham_vi.py`, `python3 tools/kiemtra.py vi_du/bao_mau.json`, `python3 tools/render.py vi_du/bao_mau.json`. Khi cập nhật bộ cho người dùng: chỉ thay `tools/`, `prompts/`, `vi_du/`, `HUONG_DAN.md`; **không ghi đè** `lo_trinh.json`, `nguon/`, `bao/`, `truyen.md`, `lich_su.md`.

---

## 9. Hạn chế đã biết / chưa kiểm tra trên máy thật

- **Chưa chạy trên Anki thật**, chỉ kiểm bằng giả lập. Các phần chưa thử thật: cửa sổ trên GNOME/Wayland, phát WAV bằng `av_player`, VOICEVOX thật (`doc_voicevox.py` mới thử với máy chủ giả), `getFile`, dán ảnh Ctrl+V, kéo thả ảnh, và (1.7) nhạc tự phát nhờ `AnkiWebView.setPlaybackRequiresGesture(False)` — cùng cách màn ôn thẻ của Anki dùng; nếu QtWebEngine vẫn chặn thì nhạc bật ở thao tác đầu tiên như trước.
- **Điện thoại**: AnkiDroid / AnkiMobile không chạy add-on. Lượt ôn trên điện thoại vẫn làm cây lớn, nhưng không được xu hay nhiệm vụ. Báo chỉ đọc được trên máy có thư mục `kotoba_daily` (hoặc mở `bao.html`).
- **Nhiều máy tính**: phải cập nhật add-on ở mọi máy. Muốn đọc báo ở máy khác thì đồng bộ thư mục `kotoba_daily` (ví dụ Syncthing).
- **Câu ví dụ trong deck không có bản đọc chậm.**
- **Chép chính tả có thể lấy câu của số báo chưa đọc** (nghe trước khi đọc), người dùng đã đồng ý.
- **`tien_do.sap_quen` chỉ lấy theo deck đang xem.**
- **Đuổi quạ** không phóng to phần vẽ trên màn hình lớn (tránh pixel nhoè).
- **Cấu hình trường** gắn với id loại note + tên trường: đổi tên trường thì phải chọn lại (vườn báo). Một ván trò chơi chỉ dùng một loại note.
- **Biểu tượng ngoài Anki (1.10)**: Ubuntu / Linux đã thử bằng `gio launch` (GLib thật); Windows / macOS chỉ kiểm bằng giả lập (lệnh PowerShell / AppleScript sinh ra). Cần Anki được đăng ký mở file .apkg (bộ cài làm sẵn); Linux ưu tiên lệnh `anki` trong PATH, không có thì `xdg-open`. Anki ở chế độ an toàn (tắt add-on) mà bấm biểu tượng thì Anki báo file vé không phải deck. Nếu Anki hỏi chọn hồ sơ khi mở bằng biểu tượng, chọn xong là vào vườn.
- **Chất lượng tiếng Nhật do AI viết** có thể còn gượng; `kiemtra.py` chỉ bắt lỗi hình thức (furigana, phạm vi từ, cấu trúc), không bắt lỗi ngữ pháp.

---

## 10. Chưa làm / ý tưởng đã bàn

Các ý dưới đây đã được bàn với người dùng nhưng **chưa làm**. Ghi kèm hướng thiết kế đã thống nhất để phiên sau làm cho khớp.

### 10.1 Liên quan đến báo
- **Số ôn tập cuối tuần** (đã đề xuất, chờ người dùng trả lời): số Chủ nhật dành cho các chương cũ. Hướng làm: thêm `cai_dat.on_tap_cuoi_tuan` vào `lo_trinh.json`; `pham_vi.py` xuất danh sách chương cũ chọn ngẫu nhiên theo ngày; prompt dùng danh sách đó thay cho chương trọng tâm vào Chủ nhật.
- **Radio / podcast do AI tạo**: Claude viết kịch bản hai người dẫn nói chuyện 3–5 phút quanh bài đọc; VOICEVOX đọc mỗi người một giọng; ghép bằng ffmpeg; có bản chậm; phụ đề chạy theo mốc thời gian. Radio là một món đồ trong phòng (có nốt nhạc bay ra khi phát).
- **Nhạc**: dễ nhất là Claude soạn chiptune theo đúng dạng dữ liệu nốt của `music.js`. Bài hát có lời dùng từ đã học thì cần phần mềm hát tổng hợp (VOICEVOX có chế độ hát nhưng chưa thử qua API); để sau cùng.
- **Bạn qua thư**: mỗi ngày nhận một lá thư; người dùng viết trả lời trong game; add-on ghi câu trả lời ra file; số hôm sau có phần sửa câu. Luyện viết, vẫn giữ luồng một chiều qua file.
- **Báo trả phí bằng xu** (chỗ tiêu xu đều): đăng ký báo theo tuần, mua kênh podcast. Hiện báo chỉ cho xu, chưa tốn xu.
- **Tách số báo thành nhiều kênh** (tin làng, truyện, tin thật) để chọn đọc; chưa cần.

### 10.2 Chỗ tiêu xu sau khi mua hết (thứ tự ưu tiên đã đề xuất: radio → bảo dưỡng nhà → giống cây → vùng / hiệu ứng tự chế)
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

### 10.3 Kỹ thuật
- **Bù xu cho lượt ôn trên điện thoại**: sau khi đồng bộ, quét revlog và bù xu, nhiệm vụ. Cần ghi nhớ id các lượt đã tính trên máy tính.
- **Chạy lại 19 bộ test cũ** trên bản 1.6.1, rồi gộp bộ test 1.6 vào thư mục `tests/` chung, theo quy ước `py X.py ADDON`.
- **Kiểm tra trên Anki thật** (xem mục 9) và sửa theo phản hồi của người dùng.

---

## 11. Lịch sử phiên bản

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
