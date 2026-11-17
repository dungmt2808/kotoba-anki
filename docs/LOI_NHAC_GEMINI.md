# Lời nhắc (prompt) gửi Gemini khi viết báo — nguyên văn

Xuất bằng `tests/tools/dump_prompts.py` (mã 1.33; ngày mẫu 08/11/2026, chủ đề truyện: Kinh dị nhẹ + Hài, thời tiết của vườn hôm đó: cả ngày nhiều mây). Danh sách từ ở đây rút gọn còn vài từ; mỗi số thật gửi khoảng 100 từ.

**Một làng, một truyện (1.25.2):** mỗi ngày Gemini viết **một bản gốc tiếng Việt** cho cả làng — kỳ truyện dài kỳ + 2–3 tin làng + mục thứ ba (thông báo / cột của một nhân vật). Thứ tự gọi: **0. lập mạch** (khoảng mỗi tuần) → **1. nhà văn** (bản gốc) → **2. biên tập** chấm 7 tiêu chí → (điểm < 4: **viết lại** một lần). Rồi mỗi báo: **3. kể lại** truyện bằng tiếng Nhật / Anh / Trung / Hàn theo trình độ (báo tiếng Việt in thẳng bản gốc) → **4. viết cả số** (chép truyện + furigana, tin làng kể lại từ tin bản gốc, câu hỏi, câu chép) → máy kiểm tra → **sửa** (≤ 2 lần) → **5. soát lần 2**. Gemini trả JSON theo khuôn cố định của từng bước. Báo thứ hai trong ngày không viết lại bản gốc.

Bản gốc thấy được: nguyên văn kỳ trước, tóm tắt các kỳ trong đợt, mạch đợt, chỗ bỏ ngỏ, nhận xét Hay / Nhạt của người đọc, ngày + mùa, thời tiết của vườn, tin làng mấy số trước (để tin nối tin).

## Bản gốc chung (tiếng Việt) — viết một lần mỗi ngày

### 0. Lập mạch truyện

```text
TRUYỆN DÀI KỲ "Quán trọ nhỏ ở làng Kotoba" — làng nhỏ yên bình cạnh khu vườn Kotoba, bốn mùa rõ rệt theo lịch
thật. Mỗi kỳ được in trong báo làng bằng tiếng Việt, tiếng Nhật và tiếng Anh (bản tiếng Nhật / tiếng Anh kể lại cho người
mới học).
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; giữ nhất quán qua mọi kỳ):
- Lin: cô gái Việt Nam 22 tuổi mới đến làm ở quán trọ "Quán Kotoba". Muốn chị Hana tin tưởng giao quán một mình. Đang
  học tiếng của làng, hay ghi chép vào cuốn sổ nhỏ, đôi khi nói nhầm một câu (lời chào, cách nói lịch sự) rồi tự sửa.
  Câu cửa miệng: "Để em ghi lại đã!"
- Chị Hana: chủ quán, khoảng 30 tuổi (Lin gọi là "chị Hana"; "bà" chỉ dành cho người già, vd. bà của chị Hana),
  điềm tĩnh, nói năng lịch sự với khách, thân mật với Lin. Có một bí mật về quá
  khứ của quán, hé ra dần qua nhiều đợt.
- StackChan: robot nhỏ của khu vườn, tò mò, nói câu ngắn, xưng "tớ", hay vẽ tranh pixel. Hiểu câu nói thường ngày theo
  nghĩa đen (gây cười).
- Ông trưởng làng: hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách trọ có mục đích riêng, bác đưa thư, con mèo hoang trắng.
Tên gọi giữ đúng như trên: ông trưởng làng KHÔNG có tên riêng (không đặt tên kiểu "Soncho"), quán gọi là "Quán Kotoba"
(không phiên âm kiểu "Kotobaya"); không tự thêm tên riêng cho nhân vật chính.
Lời thoại để trong ngoặc kép "…", ghi rõ ai nói.

CHỦ ĐỀ CỦA ĐỢT NÀY: Kinh dị nhẹ: chuyện lạ / chuyện ma trong làng (tiếng động ban đêm, bóng người bên giếng, đồ vật tự dời chỗ) gây rùng mình và tò mò; KHÔNG máu me, không bạo lực, không ai chết; lời giải có thể bất ngờ hoặc để lại một chút rợn. Người đọc cũng thích: Hài — có thể pha nhẹ, nhưng giữ Kinh dị nhẹ là chính.

CÁC KỲ ĐÃ ĐĂNG:
- Kỳ 11: （tóm tắt kỳ 11）

HÔM NAY: Chủ Nhật, ngày 8/11/2026, mùa thu. Đợt mới bắt đầu từ kỳ 12.

Lập MẠCH TRUYỆN cho một đợt 6–8 kỳ (mỗi kỳ đăng một ngày): ten = tên đợt (tiếng Việt); muc_tieu = điều nhân vật chính muốn đạt trong đợt; bi_an = câu hỏi / bí ẩn kéo suốt đợt; nhan_vat_phu = nhân vật phụ của đợt (một người / con vật, kèm điều họ muốn); buoc = mỗi phần tử là MỘT kỳ (tiếng Việt, 1–2 câu: chuyện gì xảy ra, trở ngại, móc câu); ket = đợt kết thúc thế nào (giải được bí ẩn, có thay đổi nhỏ ở nhân vật, để lại một sợi chỉ cho đợt sau). Nối tiếp các kỳ đã đăng, không lặp lại chuyện cũ. Hợp mùa hiện tại. su_that_moi (viết TRƯỚC khi lập mạch mới) = 0–3 điều ĐÃ XẢY RA trong CÁC KỲ ĐÃ ĐĂNG ở trên và đáng nhớ lâu dài (quan hệ giữa nhân vật, thay đổi ở quán / làng, điều Lin học được) — mỗi điều một câu ngắn ở thì quá khứ; CHỈ lấy từ các kỳ đã đăng, KHÔNG lấy gì của đợt mới đang lập, không bịa thêm, không lặp điều đã có trong sổ tay; không chắc thì để trống.

Trả về đúng một object JSON theo khuôn.
```

### 1. Nhà văn — system

```text
Bạn là nhà văn viết truyện dài kỳ tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki. Viết hay như một truyện thật, không như bài giảng.
```

### 1. Nhà văn — lời nhắc (bản gốc: truyện + tin làng + mục thứ ba)

```text
TRUYỆN DÀI KỲ "Quán trọ nhỏ ở làng Kotoba" — làng nhỏ yên bình cạnh khu vườn Kotoba, bốn mùa rõ rệt theo lịch
thật. Mỗi kỳ được in trong báo làng bằng tiếng Việt, tiếng Nhật và tiếng Anh (bản tiếng Nhật / tiếng Anh kể lại cho người
mới học).
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; giữ nhất quán qua mọi kỳ):
- Lin: cô gái Việt Nam 22 tuổi mới đến làm ở quán trọ "Quán Kotoba". Muốn chị Hana tin tưởng giao quán một mình. Đang
  học tiếng của làng, hay ghi chép vào cuốn sổ nhỏ, đôi khi nói nhầm một câu (lời chào, cách nói lịch sự) rồi tự sửa.
  Câu cửa miệng: "Để em ghi lại đã!"
- Chị Hana: chủ quán, khoảng 30 tuổi (Lin gọi là "chị Hana"; "bà" chỉ dành cho người già, vd. bà của chị Hana),
  điềm tĩnh, nói năng lịch sự với khách, thân mật với Lin. Có một bí mật về quá
  khứ của quán, hé ra dần qua nhiều đợt.
- StackChan: robot nhỏ của khu vườn, tò mò, nói câu ngắn, xưng "tớ", hay vẽ tranh pixel. Hiểu câu nói thường ngày theo
  nghĩa đen (gây cười).
- Ông trưởng làng: hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách trọ có mục đích riêng, bác đưa thư, con mèo hoang trắng.
Tên gọi giữ đúng như trên: ông trưởng làng KHÔNG có tên riêng (không đặt tên kiểu "Soncho"), quán gọi là "Quán Kotoba"
(không phiên âm kiểu "Kotobaya"); không tự thêm tên riêng cho nhân vật chính.
Lời thoại để trong ngoặc kép "…", ghi rõ ai nói.

CHỦ ĐỀ TRUYỆN: Kinh dị nhẹ: chuyện lạ / chuyện ma trong làng (tiếng động ban đêm, bóng người bên giếng, đồ vật tự dời chỗ) gây rùng mình và tò mò; KHÔNG máu me, không bạo lực, không ai chết; lời giải có thể bất ngờ hoặc để lại một chút rợn. Người đọc cũng thích: Hài — có thể pha nhẹ, nhưng giữ Kinh dị nhẹ là chính.

MẠCH CỦA ĐỢT「Tiếng gõ trong đêm」: muốn: tìm ra ai gõ · bí ẩn: bóng trắng bên giếng · nhân vật phụ: mèo trắng · kết: …
Các bước:
→ kỳ 12: Kỳ 12: …
  kỳ 13: Kỳ 13: …
  kỳ 14: Kỳ 14: …
  kỳ 15: Kỳ 15: …
  kỳ 16: Kỳ 16: …
  kỳ 17: Kỳ 17: …

KỲ NÀY (kỳ 12) theo bước: Kỳ 12: …

NGUYÊN VĂN KỲ TRƯỚC (kỳ 11, viết tiếp từ đây, không mâu thuẫn):
（nguyên văn kỳ 11, đoạn 1）
（đoạn 2）

NGƯỜI ĐỌC NHẬN XÉT (lắng nghe):
- Kỳ 11: Hay — "（dòng nhận xét của người đọc）"

HÔM NAY: Chủ Nhật, ngày 8/11/2026, mùa thu. Viết KỲ 12.

THỜI TIẾT HÔM NAY Ở LÀNG (khớp với trời trong vườn): cả ngày nhiều mây

CÁCH VIẾT MỘT KỲ HAY (bắt buộc):
1. Một cảnh, 2–3 nhân vật. Mở đầu bằng hành động hoặc lời thoại, KHÔNG mở bằng tả thời tiết.
2. Có MỘT vấn đề cụ thể: nhân vật muốn gì, cái gì cản (hiểu lầm, đồ bị mất, khách khó tính, nói nhầm…); nhân vật tự xoay xở.
3. Hợp mùa và thời tiết hôm nay (chi tiết nhỏ trong cảnh, không tả dài).
4. Có ít nhất một chi tiết bất ngờ hoặc buồn cười, và một khoảnh khắc cảm xúc nhỏ.
5. Kết bằng một móc câu: câu hỏi chưa có lời đáp, vật lạ, câu nói bỏ dở — để người đọc mong số sau. KHÔNG kết bằng bài
   học hay lời khuyên.
6. Không liệt kê, không lặp lại tình huống của các kỳ trước.
7. Nối tiếp kỳ trước: KHÔNG mâu thuẫn với chuyện đã xảy ra, giải quyết hoặc đẩy tiếp một chỗ bỏ ngỏ.
8. Thoại đặt trong ngoặc kép "…", thể hiện tính cách, ghi rõ ai nói. Tiếng Việt tự nhiên, đúng chính tả, có dấu; chữ
   trơn (không [ ] { } |, không markdown).
9. Chuyện sẽ được kể lại bằng tiếng Nhật / tiếng Anh cho người mới học: tránh chơi chữ chỉ có trong tiếng Việt, thành
   ngữ khó dịch; câu thoại ngắn, rõ.
10. Độ dài: 3 đoạn, mỗi đoạn 60–140 chữ (truyện là một bài trong số báo).

VÍ DỤ MỘT KỲ HAY (chỉ xem cách kể: hiểu lầm thành chuyện, có vật lạ, móc câu; KHÔNG chép nội dung):
"Chị Hana ơi, khách phòng số ba muốn ăn sáng bằng... một tấm bản đồ!" Lin chạy vào bếp, tay vẫn cầm cuốn sổ nhỏ. Chị Hana đặt ấm trà xuống. "Bản đồ à?" StackChan lập tức chui vào tủ, lôi ra một chiếc đĩa. "Tớ có đĩa. Bản đồ thì chưa nấu bao giờ."
Ông khách già trải lên bàn một tấm bản đồ cũ, mép giấy đã ngả vàng. Ở góc dưới có một vòng tròn đỏ, ngay chỗ khu vườn Kotoba bây giờ. "Ngày xưa, ở đây có một cái giếng," ông nói khẽ. "Tôi đã hứa sẽ quay lại."
Chị Hana nhìn vòng tròn đỏ rất lâu mà không nói gì. Lin định hỏi thì ngoài sân vang lên tiếng nước chảy róc rách — ở đúng chỗ chưa từng có cái giếng nào.

TIN LÀNG HÔM NAY (in cùng số báo với kỳ truyện): 2–3 tin vặt có thật trong đời sống làng (chợ phiên, mùa màng, thời tiết, khách lạ, chuẩn bị lễ hội…), mỗi tin 2–3 câu, có thể nhắc nhẹ tới nhân vật nhưng KHÔNG kể lại truyện. Có tin NỐI TIẾP tin mấy hôm trước khi hợp (vd. hôm qua báo sắp có chợ phiên → hôm nay kể chợ phiên ra sao); không lặp lại nguyên tin cũ.
TIN MẤY SỐ TRƯỚC:
- 11-07 · （tin hôm qua: chợ phiên sắp mở）
- 11-07 · （tin hôm qua: cây hồng chín）

MỤC THỨ BA (muc3): THÔNG BÁO CỦA LÀNG — 2–3 mục, mỗi mục một đoạn ngắn bắt đầu bằng "◆ " (giờ giấc, việc chung, lời nhắc); tieu_de kiểu "Thông báo của làng".

Trả về đúng một object JSON theo khuôn: dan_y (muon, tro_ngai, bat_ngo, moc_cau), tieu_de (ngắn, 3–10 chữ), doan = 3 đoạn truyện tiếng Việt chữ trơn, nho (tom_tat = 2 câu chuyện gì xảy ra; nhan_vat_moi; bo_ngo = chỗ bỏ ngỏ kỳ sau cần giải quyết; da_giai = chỗ bỏ ngỏ cũ kỳ này đã giải quyết), tin = 2–3 tin (tieu_de, noi_dung), muc3 (tieu_de, doan).
```

### 2. Biên tập — lời nhắc (system: "Bạn là biên tập viên truyện khó tính nhưng công bằng.")

```text
Bạn là biên tập viên truyện dài kỳ của báo làng: khó tính nhưng công bằng. Truyện in bằng tiếng Việt và được kể lại bằng tiếng Nhật / tiếng Anh cho người mới học.

Chấm kỳ 12 dưới đây, mỗi tiêu chí 1–5:
- su_kien: có chuyện xảy ra (vấn đề cụ thể, nhân vật xoay xở), không phải cảnh sinh hoạt nhạt
- nhan_vat: thoại và hành động đúng tính cách (theo hồ sơ), có cảm xúc
- bat_ngo: có chi tiết bất ngờ / buồn cười
- moc_cau: kết khiến người đọc muốn đọc kỳ sau, không kết bằng lời khuyên
- khop: khớp kỳ trước, không mâu thuẫn chuyện đã xảy ra (kỳ 1 thì chấm 5)
- trinh_do: dễ kể lại bằng tiếng Nhật / tiếng Anh đơn giản (không chơi chữ tiếng Việt, thành ngữ khó, câu quá dài)
- tu_nhien: tiếng Việt tự nhiên, đúng chính tả
loi = lỗi cụ thể (chép câu sai → câu đúng); goi_y = góp ý cụ thể để viết lại hay hơn.

TRUYỆN DÀI KỲ "Quán trọ nhỏ ở làng Kotoba" — làng nhỏ yên bình cạnh khu vườn Kotoba, bốn mùa rõ rệt theo lịch
thật. Mỗi kỳ được in trong báo làng bằng tiếng Việt, tiếng Nhật và tiếng Anh (bản tiếng Nhật / tiếng Anh kể lại cho người
mới học).
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; giữ nhất quán qua mọi kỳ):
- Lin: cô gái Việt Nam 22 tuổi mới đến làm ở quán trọ "Quán Kotoba". Muốn chị Hana tin tưởng giao quán một mình. Đang
  học tiếng của làng, hay ghi chép vào cuốn sổ nhỏ, đôi khi nói nhầm một câu (lời chào, cách nói lịch sự) rồi tự sửa.
  Câu cửa miệng: "Để em ghi lại đã!"
- Chị Hana: chủ quán, khoảng 30 tuổi (Lin gọi là "chị Hana"; "bà" chỉ dành cho người già, vd. bà của chị Hana),
  điềm tĩnh, nói năng lịch sự với khách, thân mật với Lin. Có một bí mật về quá
  khứ của quán, hé ra dần qua nhiều đợt.
- StackChan: robot nhỏ của khu vườn, tò mò, nói câu ngắn, xưng "tớ", hay vẽ tranh pixel. Hiểu câu nói thường ngày theo
  nghĩa đen (gây cười).
- Ông trưởng làng: hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách trọ có mục đích riêng, bác đưa thư, con mèo hoang trắng.
Tên gọi giữ đúng như trên: ông trưởng làng KHÔNG có tên riêng (không đặt tên kiểu "Soncho"), quán gọi là "Quán Kotoba"
(không phiên âm kiểu "Kotobaya"); không tự thêm tên riêng cho nhân vật chính.
Lời thoại để trong ngoặc kép "…", ghi rõ ai nói.

KỲ TRƯỚC (kỳ 11):
（nguyên văn kỳ 11, đoạn 1）
（đoạn 2）

NGƯỜI ĐỌC NHẬN XÉT CÁC KỲ TRƯỚC:
- Kỳ 11: hay （dòng nhận xét của người đọc）

KỲ TRUYỆN:
{"tieu_de": "（kỳ truyện）", "doan": ["…"]}

Trả về đúng một object JSON theo khuôn.
```

## Báo tiếng Nhật (畑新聞, N4)

### 3. Kể lại truyện — lời nhắc

```text
KỂ LẠI kỳ 12 của truyện dài kỳ dưới đây bằng tiếng Nhật trình độ N4 cho người Việt đang học. Đây là cùng một câu chuyện in trong báo làng bằng nhiều thứ tiếng: GIỮ ĐÚNG sự việc, nhân vật, lời thoại chính, chi tiết bất ngờ và móc câu cuối; không thêm chuyện mới, không bỏ móc câu.

Viết lại cho hợp trình độ: câu ngắn, tự nhiên như sách đọc cho người học; được rút gọn chi tiết phụ. Chỗ nhân vật nói nhầm (lời chào, cách nói lịch sự) thì cho nhầm theo kiểu của tiếng Nhật (vd. nhầm kính ngữ).

TÊN GỌI (dùng đúng):
- Lin → リンさん
- chị Hana (chủ quán, khoảng 30 tuổi) → はなさん（女将さん; không gọi おばあさん）
- StackChan → スタックちゃん
- ông trưởng làng (không có tên riêng) → 村長さん
- Quán Kotoba (quán trọ) → ことば屋（旅館）
- làng Kotoba → ことば村
- vườn Kotoba → ことば畑
- bác đưa thư → 郵便屋さん
- con mèo hoang trắng → 白いのらねこ

Độ dài: đúng 3 đoạn như bản gốc, mỗi đoạn 60–150 ký tự tiếng Nhật.

TỪ NGƯỜI HỌC ĐÃ HỌC (trình độ N4) — dùng khi hợp, ĐỪNG ép câu:
予約、案内、届ける、忘れ物、暖かい、駅、手紙、静か

MẪU NGỮ PHÁP ĐANG HỌC (dùng 1–2 mẫu trong lời thoại nếu tự nhiên):
- 〜ばかりです: vừa mới
- 〜までに: trước (hạn)
- 〜場合は: trong trường hợp

BẢN GỐC:
{"tieu_de": "（truyện bản gốc tiếng Việt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

Trả về đúng một object JSON theo khuôn: tieu_de (tiếng Nhật, ngắn), doan = các đoạn tiếng Nhật (chữ Hán + kana, KHÔNG furigana, KHÔNG romaji, không [ ] { } |), dich = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn bạn vừa viết (cùng số phần tử, không có chữ Nhật; tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba, làng Kotoba; không ghi chú trong ngoặc), tu_moi (≤ 2 từ khó ngoài danh sách: w, r = cách đọc bằng HIRAGANA, m = nghĩa tiếng Việt).
```

### 4. Viết cả số — system

```text
Bạn là người Nhật viết báo làng 『畑新聞』 cho người Việt Nam đang học tiếng Nhật trình độ N4.
Viết tiếng Nhật tự nhiên như người Nhật viết cho người học: câu ngắn, ấm áp, hơi hài hước, không dịch từng chữ.
Chỉ dùng ngữ pháp trong danh sách được cho (hoặc cơ bản hơn). Dùng từ trong danh sách từ vựng và từ rất cơ bản;
từ ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.
Kính ngữ: tôn kính ngữ chỉ cho hành động của người khác (khách, người trên); khiêm nhường ngữ chỉ cho hành động của mình.
Nội dung hoàn toàn mới, không chép đoạn văn hay ví dụ của sách giáo khoa nào.
Độ dài các đoạn (ký tự tiếng Nhật, không tính đánh dấu): 280–700.

QUY TẮC ĐÁNH DẤU FURIGANA (máy sẽ kiểm tra, sai là phải viết lại):
- MỌI chữ Hán đều phải có furigana: [漢字|かんじ] hoặc {表記|よみ|từ gốc}. Cách đọc viết bằng HIRAGANA.
- {表記|よみ|từ gốc} dùng cho từ cần học: "từ gốc" chép ĐÚNG như cột từ trong danh sách từ vựng (kể cả 〜 và する).
  Ví dụ: {発表|はっぴょう|発表する}, {名|めい|〜名}. Từ katakana để trống cách đọc: {コート||コート}.
- Okurigana để NGOÀI ngoặc: {泊|と|泊まる}まり, [言|い]いました, [食|た]べます. Nhiều chữ Hán liền nhau bọc chung: [今週末|こんしゅうまつ].
- Số Ả Rập để ngoài, chỉ bọc chữ Hán: 11[月|がつ]19[日|にち], 2[時|じ], 5[人|にん].
  Ngày / số người đọc đặc biệt thì bọc cả số: [1日|ついたち] [2日|ふつか] [3日|みっか] [4日|よっか] [5日|いつか] [6日|むいか]
  [7日|なのか] [8日|ようか] [9日|ここのか] [10日|とおか] [14日|じゅうよっか] [20日|はつか] [24日|にじゅうよっか] [1人|ひとり] [2人|ふたり].
- Kana, tiểu từ, dấu câu, số để ngoài ngoặc. Không dùng [ ] { } | cho việc gì khác; trích lời dùng 「」.
- TUYỆT ĐỐI KHÔNG có chữ Latin / romaji trong phần tiếng Nhật (không "watashi", không "OK", không "StackChan": viết スタックちゃん, オーケー).
- Không dùng chữ Hán giản thể của tiếng Trung (们, 这, 说, 时…): chỉ dùng chữ Hán của tiếng Nhật. Không chèn tiếng Việt vào câu tiếng Nhật.
- Không cách chữ giữa các từ tiếng Nhật (không viết kiểu わたし は がくせい です).
- Cẩn thận từ nhiều cách đọc: 今日(きょう), 明日(あした), 昨日(きのう), 一日(ついたち / いちにち), 一人(ひとり), 何(なに / なん), 方(かた / ほう), 上手(じょうず), 大人(おとな), 今朝(けさ).

Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm.
```

### 4. Viết cả số — lời nhắc

```text
HÔM NAY: ngày 8/11/2026, mùa thu ở Nhật. Số báo 30. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:
1. loai "tin_lang": tin trong làng ことば村 và khu vườn ことば畑, dùng nhân vật của truyện, 2–3 đoạn (đừng kể lại truyện).
2. loai "truyen", "ky": 12: CHÉP NGUYÊN VĂN truyện đã viết sẵn dưới đây (tiêu đề + 3 đoạn), CHỈ THÊM đánh dấu furigana theo quy tắc ([漢字|かんじ], {表記|よみ|từ gốc} cho từ trong danh sách), không sửa chữ, không thêm bớt câu; "dich" để rỗng (máy tự điền).
3. loai "thong_bao": お知らせ, 2–3 mục, mỗi mục là một đoạn bắt đầu bằng ◆, tiêu đề お[知|し]らせ.
cau_hoi: 2–3 câu trắc nghiệm tiếng Nhật về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" tiếng Việt chỉ ra câu trong bài.
chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (8–30 ký tự, một câu trọn vẹn, không vắt qua dấu 「」), lấy cả từ truyện; "them_dap_an": cách viết khác vẫn đúng (僕/ぼく, 下さい/ください), không đánh dấu.
TRUYỆN ĐÃ VIẾT SẴN (kỳ 12):
{"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

ĐỘ DÀI: hai bài còn lại (tin_lang + bài 3, KHÔNG tính truyện) tổng khoảng 112–525 ký tự.

TIN HÔM NAY CỦA LÀNG (bản gốc tiếng Việt — báo làng in bằng nhiều thứ tiếng, mọi bản đăng cùng tin):
- （tin 1）: （nội dung tin 1）
- （tin 2）: （nội dung tin 2）
→ Bài tin_lang KỂ LẠI đúng các tin này bằng tiếng Nhật đúng trình độ (được rút gọn, gộp, chọn 2–3 tin); KHÔNG bịa tin khác.
MỤC THỨ BA (bản gốc): （thông báo của làng） — ◆ （mục 1） / ◆ （mục 2）
→ Bài thứ 3 kể lại mục này bằng tiếng Nhật (giữ ý, giữ dạng ◆ nếu có).

dich: mỗi bài thêm "dich" = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn (cùng số phần tử với doan; không có chữ Nhật — tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba; không furigana, không ghi chú trong ngoặc). Người học bấm "Dịch" mới thấy.

mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. Phần lớn là mẫu TRỌNG TÂM (nếu có), thêm 1 mẫu cũ để ôn.
Đánh dấu {..|..|..} cho 8–20 từ đáng học (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa 3 từ ngoài danh sách, mỗi từ phải được đánh dấu {..|..|từ} trong bài. tom_tat: 1–2 câu tiếng Việt tóm tắt số báo.

TỪ TRỌNG TÂM (người học phải ôn hôm nay): 予約、案内、届ける、忘れ物、暖かい
Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / số lượng → お知らせ hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / thời tiết → tin làng. Trợ số từ (〜枚, 〜本, 〜匹…) chỉ dùng một hai cái mỗi số.

DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:
jlpt:N5-01|〜は〜です / 〜じゃありません|A là B / A không phải là B
jlpt:N5-02|〜も|cũng
jlpt:N5-03|〜の|của, thuộc về
jlpt:N5-04|これ・それ・あれ・どれ|cái này / đó / kia / nào
jlpt:N5-05|〜ます / 〜ません / 〜ました / 〜ませんでした|thể lịch sự hiện tại, quá khứ
jlpt:N5-06|〜を V|tân ngữ của động từ
jlpt:N5-07|〜へ / 〜に 行きます|đi đến đâu
jlpt:N5-08|〜で（場所・手段）|ở (nơi chốn), bằng (phương tiện)
jlpt:N5-09|〜と|và, cùng với
jlpt:N5-10|〜に（時間）|vào lúc
jlpt:N5-11|〜から〜まで|từ … đến …
jlpt:N5-12|〜があります / 〜がいます|có (đồ vật / người, con vật)
jlpt:N5-13|〜ませんか|rủ rê: … không?
jlpt:N5-14|〜ましょう|nào cùng …
jlpt:N5-15|〜たいです|muốn làm
jlpt:N5-16|〜がほしいです|muốn có
jlpt:N5-17|い形容詞 / な形容詞|tính từ đuôi い / な
jlpt:N5-18|〜くて / 〜で（形容詞）|nối tính từ: … và …
jlpt:N5-19|〜が好きです / 上手です|thích / giỏi
jlpt:N5-20|〜から（理由）|vì …
jlpt:N5-21|〜てください|hãy làm …
jlpt:N5-22|〜ています（進行）|đang làm
jlpt:N5-23|〜てもいいです|làm … cũng được
jlpt:N5-24|〜てはいけません|không được làm
jlpt:N5-25|〜て、〜（順序）|làm … rồi …
jlpt:N5-26|〜ないでください|xin đừng làm
jlpt:N5-27|〜なければなりません|phải làm
jlpt:N5-28|〜なくてもいいです|không làm cũng được
jlpt:N5-29|〜たことがあります|đã từng làm
jlpt:N5-30|〜たり〜たりします|lúc thì … lúc thì …
jlpt:N5-31|〜より〜のほうが|… hơn …
jlpt:N5-32|〜の中で〜がいちばん|trong … thì … nhất
jlpt:N5-33|〜前に / 〜てから|trước khi / sau khi
jlpt:N5-34|〜でしょう|có lẽ
jlpt:N5-35|〜く / 〜になります|trở nên
jlpt:N4-01|普通形（だ・である体の会話）|thể thông thường trong hội thoại thân mật
jlpt:N4-02|〜と思います|tôi nghĩ là
jlpt:N4-03|〜と言いました|đã nói là
jlpt:N4-04|〜つもりです|định làm
jlpt:N4-05|〜予定です|dự định
jlpt:N4-06|〜ことができます / 可能形|có thể làm
jlpt:N4-07|〜ことです（趣味）|sở thích là …
jlpt:N4-08|〜とき|khi …
jlpt:N4-09|〜と（条件）|hễ … thì …
jlpt:N4-10|〜たら|nếu / sau khi … thì
jlpt:N4-11|〜ば|nếu …
jlpt:N4-12|〜なら|nếu là … thì
jlpt:N4-13|〜ても|dù … cũng
jlpt:N4-14|〜ながら|vừa … vừa …
jlpt:N4-15|〜てしまいました|lỡ / làm xong mất
jlpt:N4-16|〜ておきます|làm sẵn
jlpt:N4-17|〜てあります|đã được làm sẵn (trạng thái)
jlpt:N4-18|〜てみます|thử làm
jlpt:N4-19|〜てあげます / 〜てくれます / 〜てもらいます|làm cho / được làm cho
jlpt:N4-20|〜ようと思います（意向形）|định làm
jlpt:N4-21|〜そうです（様態）|trông có vẻ
jlpt:N4-22|〜そうです（伝聞）|nghe nói
jlpt:N4-23|〜ようです / 〜みたいです|hình như
jlpt:N4-24|〜かもしれません|có lẽ, không chừng
jlpt:N4-25|〜はずです|chắc chắn là
jlpt:N4-26|〜のに|thế mà
jlpt:N4-27|〜ので|vì … nên
jlpt:N4-28|〜し、〜し|vừa … lại vừa …
jlpt:N4-29|〜ために|để …, vì …
jlpt:N4-30|〜ように（目的）|để có thể …
jlpt:N4-31|〜ようになります|trở nên có thể
jlpt:N4-32|〜ようにしています|cố gắng làm (thói quen)
jlpt:N4-33|〜すぎます|quá …
jlpt:N4-34|〜やすい / 〜にくい|dễ / khó làm
jlpt:N4-35|〜か（間接疑問）/ 〜かどうか|có … hay không
jlpt:N4-36|受身形 〜られます|thể bị động
jlpt:N4-37|使役形 〜させます|thể sai khiến
jlpt:N4-38|〜させてください / 〜させていただけませんか|xin cho phép tôi làm
jlpt:N4-39|〜なさい|hãy làm (mệnh lệnh nhẹ)
jlpt:N4-40|お〜になります / 〜られます（尊敬）|tôn kính ngữ (hành động của người khác)
jlpt:N4-41|お〜ください|xin mời (tôn kính)
jlpt:N4-42|お〜します / ご〜します（謙譲）|khiêm nhường ngữ (hành động của mình)
jlpt:N4-43|いらっしゃる・おっしゃる・召し上がる|động từ tôn kính đặc biệt
jlpt:N4-44|まいる・申す・いただく・拝見する|động từ khiêm nhường đặc biệt
jlpt:N4-45|〜ところです|đúng lúc sắp / đang / vừa
jlpt:N4-46|〜ばかりです|vừa mới
jlpt:N4-47|〜までに|trước (hạn)
jlpt:N4-48|〜場合は|trong trường hợp

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ|cách đọc|nghĩa) — từ gốc trong {..|..|từ gốc} phải chép đúng cột đầu:
予約|よやく|đặt trước
案内|あんない|hướng dẫn
届ける|とどける|giao, đưa tới
忘れ物|わすれもの|đồ bỏ quên
暖かい|あたたかい|ấm áp
静か|しずか|yên tĩnh
手紙|てがみ|lá thư
駅|えき|nhà ga

VÍ DỤ ĐỊNH DẠNG (chỉ xem cách đánh dấu, không chép nội dung):
{"loai":"tin_lang","tieu_de":"スタックちゃん、[絵|え]を{発表|はっぴょう|発表する}","doan":["[昨日|きのう]の[夜|よる]、[村|むら]で[小|ちい]さな{発表会|はっぴょうかい|発表会}がありました。30{名|めい|〜名}の[人|ひと]が[来|き]ました。"]}
```

### 5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)

```text
Bạn là biên tập viên người Nhật, soát lại số báo tiếng Nhật dưới đây dành cho người học trình độ N4 trước khi in.
Kiểm tra kỹ từng câu:
1. Tiếng Nhật có tự nhiên và đúng ngữ pháp không (trợ từ, chia động từ, thể lịch sự / thông thường nhất quán trong một bài).
2. Ngữ pháp có vượt trình độ N4 / ngoài danh sách không → viết lại đơn giản hơn.
3. Kính ngữ: tôn kính ngữ chỉ cho hành động của người khác, khiêm nhường ngữ chỉ cho hành động của mình.
4. Furigana: cách đọc trong [..|..] và {..|..|..} có đúng với văn cảnh không (今日, 明日, 一日, 何, 方, số đếm, ngày tháng…).
5. Còn chữ Latin / romaji, chữ Hán giản thể, chữ Hán thiếu furigana không.
6. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, "dung" chỉ đúng vị trí; giai_thich đúng.
7. Câu chép chính tả có chép nguyên văn từ bài không.
8. Tiêu đề, tom_tat, ky_truoc, giai_thich viết đúng nghĩa với bài.
9. Lời thoại: rõ ai nói câu nào; lời chào / nhờ vả hợp vai; nhân vật nhất quán (はなさん là bà chủ quán 女将さん, không phải 店長).
10. Kết hợp từ tự nhiên như người Nhật viết (không ghép từ lạ kiểu 明るい日; dùng いい天気 / 晴れた日…). Từ khó hơn trình độ N4 (không phải từ rất cơ bản) → đổi từ dễ hơn.
11. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.
Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). Không có lỗi thì van_de rỗng. "bao" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự (ngữ pháp, furigana), không viết lại. "dich" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.
Giữ nguyên quy tắc đánh dấu, các id mau_cau, số kỳ truyện. GIỮ NGUYÊN mọi chỗ {表記|よみ|từ gốc}: đó là từ người học ĐÃ HỌC (bấm vào để tra nghĩa) — không đổi chúng thành [..|..], không đưa chúng vào tu_moi; tu_moi chỉ dành cho từ NGOÀI danh sách từ vựng.

QUY TẮC ĐÁNH DẤU FURIGANA (máy sẽ kiểm tra, sai là phải viết lại):
- MỌI chữ Hán đều phải có furigana: [漢字|かんじ] hoặc {表記|よみ|từ gốc}. Cách đọc viết bằng HIRAGANA.
- {表記|よみ|từ gốc} dùng cho từ cần học: "từ gốc" chép ĐÚNG như cột từ trong danh sách từ vựng (kể cả 〜 và する).
  Ví dụ: {発表|はっぴょう|発表する}, {名|めい|〜名}. Từ katakana để trống cách đọc: {コート||コート}.
- Okurigana để NGOÀI ngoặc: {泊|と|泊まる}まり, [言|い]いました, [食|た]べます. Nhiều chữ Hán liền nhau bọc chung: [今週末|こんしゅうまつ].
- Số Ả Rập để ngoài, chỉ bọc chữ Hán: 11[月|がつ]19[日|にち], 2[時|じ], 5[人|にん].
  Ngày / số người đọc đặc biệt thì bọc cả số: [1日|ついたち] [2日|ふつか] [3日|みっか] [4日|よっか] [5日|いつか] [6日|むいか]
  [7日|なのか] [8日|ようか] [9日|ここのか] [10日|とおか] [14日|じゅうよっか] [20日|はつか] [24日|にじゅうよっか] [1人|ひとり] [2人|ふたり].
- Kana, tiểu từ, dấu câu, số để ngoài ngoặc. Không dùng [ ] { } | cho việc gì khác; trích lời dùng 「」.
- TUYỆT ĐỐI KHÔNG có chữ Latin / romaji trong phần tiếng Nhật (không "watashi", không "OK", không "StackChan": viết スタックちゃん, オーケー).
- Không dùng chữ Hán giản thể của tiếng Trung (们, 这, 说, 时…): chỉ dùng chữ Hán của tiếng Nhật. Không chèn tiếng Việt vào câu tiếng Nhật.
- Không cách chữ giữa các từ tiếng Nhật (không viết kiểu わたし は がくせい です).
- Cẩn thận từ nhiều cách đọc: 今日(きょう), 明日(あした), 昨日(きのう), 一日(ついたち / いちにち), 一人(ひとり), 何(なに / なん), 方(かた / ほう), 上手(じょうず), 大人(おとな), 今朝(けさ).

DANH SÁCH NGỮ PHÁP:
jlpt:N5-01|〜は〜です / 〜じゃありません|A là B / A không phải là B
jlpt:N5-02|〜も|cũng
jlpt:N5-03|〜の|của, thuộc về
jlpt:N5-04|これ・それ・あれ・どれ|cái này / đó / kia / nào
jlpt:N5-05|〜ます / 〜ません / 〜ました / 〜ませんでした|thể lịch sự hiện tại, quá khứ
jlpt:N5-06|〜を V|tân ngữ của động từ
jlpt:N5-07|〜へ / 〜に 行きます|đi đến đâu
jlpt:N5-08|〜で（場所・手段）|ở (nơi chốn), bằng (phương tiện)
jlpt:N5-09|〜と|và, cùng với
jlpt:N5-10|〜に（時間）|vào lúc
jlpt:N5-11|〜から〜まで|từ … đến …
jlpt:N5-12|〜があります / 〜がいます|có (đồ vật / người, con vật)
jlpt:N5-13|〜ませんか|rủ rê: … không?
jlpt:N5-14|〜ましょう|nào cùng …
jlpt:N5-15|〜たいです|muốn làm
jlpt:N5-16|〜がほしいです|muốn có
jlpt:N5-17|い形容詞 / な形容詞|tính từ đuôi い / な
jlpt:N5-18|〜くて / 〜で（形容詞）|nối tính từ: … và …
jlpt:N5-19|〜が好きです / 上手です|thích / giỏi
jlpt:N5-20|〜から（理由）|vì …
jlpt:N5-21|〜てください|hãy làm …
jlpt:N5-22|〜ています（進行）|đang làm
jlpt:N5-23|〜てもいいです|làm … cũng được
jlpt:N5-24|〜てはいけません|không được làm
jlpt:N5-25|〜て、〜（順序）|làm … rồi …
jlpt:N5-26|〜ないでください|xin đừng làm
jlpt:N5-27|〜なければなりません|phải làm
jlpt:N5-28|〜なくてもいいです|không làm cũng được
jlpt:N5-29|〜たことがあります|đã từng làm
jlpt:N5-30|〜たり〜たりします|lúc thì … lúc thì …
jlpt:N5-31|〜より〜のほうが|… hơn …
jlpt:N5-32|〜の中で〜がいちばん|trong … thì … nhất
jlpt:N5-33|〜前に / 〜てから|trước khi / sau khi
jlpt:N5-34|〜でしょう|có lẽ
jlpt:N5-35|〜く / 〜になります|trở nên
jlpt:N4-01|普通形（だ・である体の会話）|thể thông thường trong hội thoại thân mật
jlpt:N4-02|〜と思います|tôi nghĩ là
jlpt:N4-03|〜と言いました|đã nói là
jlpt:N4-04|〜つもりです|định làm
jlpt:N4-05|〜予定です|dự định
jlpt:N4-06|〜ことができます / 可能形|có thể làm
jlpt:N4-07|〜ことです（趣味）|sở thích là …
jlpt:N4-08|〜とき|khi …
jlpt:N4-09|〜と（条件）|hễ … thì …
jlpt:N4-10|〜たら|nếu / sau khi … thì
jlpt:N4-11|〜ば|nếu …
jlpt:N4-12|〜なら|nếu là … thì
jlpt:N4-13|〜ても|dù … cũng
jlpt:N4-14|〜ながら|vừa … vừa …
jlpt:N4-15|〜てしまいました|lỡ / làm xong mất
jlpt:N4-16|〜ておきます|làm sẵn
jlpt:N4-17|〜てあります|đã được làm sẵn (trạng thái)
jlpt:N4-18|〜てみます|thử làm
jlpt:N4-19|〜てあげます / 〜てくれます / 〜てもらいます|làm cho / được làm cho
jlpt:N4-20|〜ようと思います（意向形）|định làm
jlpt:N4-21|〜そうです（様態）|trông có vẻ
jlpt:N4-22|〜そうです（伝聞）|nghe nói
jlpt:N4-23|〜ようです / 〜みたいです|hình như
jlpt:N4-24|〜かもしれません|có lẽ, không chừng
jlpt:N4-25|〜はずです|chắc chắn là
jlpt:N4-26|〜のに|thế mà
jlpt:N4-27|〜ので|vì … nên
jlpt:N4-28|〜し、〜し|vừa … lại vừa …
jlpt:N4-29|〜ために|để …, vì …
jlpt:N4-30|〜ように（目的）|để có thể …
jlpt:N4-31|〜ようになります|trở nên có thể
jlpt:N4-32|〜ようにしています|cố gắng làm (thói quen)
jlpt:N4-33|〜すぎます|quá …
jlpt:N4-34|〜やすい / 〜にくい|dễ / khó làm
jlpt:N4-35|〜か（間接疑問）/ 〜かどうか|có … hay không
jlpt:N4-36|受身形 〜られます|thể bị động
jlpt:N4-37|使役形 〜させます|thể sai khiến
jlpt:N4-38|〜させてください / 〜させていただけませんか|xin cho phép tôi làm
jlpt:N4-39|〜なさい|hãy làm (mệnh lệnh nhẹ)
jlpt:N4-40|お〜になります / 〜られます（尊敬）|tôn kính ngữ (hành động của người khác)
jlpt:N4-41|お〜ください|xin mời (tôn kính)
jlpt:N4-42|お〜します / ご〜します（謙譲）|khiêm nhường ngữ (hành động của mình)
jlpt:N4-43|いらっしゃる・おっしゃる・召し上がる|động từ tôn kính đặc biệt
jlpt:N4-44|まいる・申す・いただく・拝見する|động từ khiêm nhường đặc biệt
jlpt:N4-45|〜ところです|đúng lúc sắp / đang / vừa
jlpt:N4-46|〜ばかりです|vừa mới
jlpt:N4-47|〜までに|trước (hạn)
jlpt:N4-48|〜場合は|trong trường hợp

SỐ BÁO:
{"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}
```

## Báo tiếng Anh (The Garden Gazette, A2)

### 3. Kể lại truyện — lời nhắc

```text
KỂ LẠI kỳ 12 của truyện dài kỳ dưới đây bằng tiếng Anh trình độ A2 cho người Việt đang học. Đây là cùng một câu chuyện in trong báo làng bằng nhiều thứ tiếng: GIỮ ĐÚNG sự việc, nhân vật, lời thoại chính, chi tiết bất ngờ và móc câu cuối; không thêm chuyện mới, không bỏ móc câu.

Viết lại cho hợp trình độ: câu ngắn, tự nhiên như sách đọc cho người học; được rút gọn chi tiết phụ. Chỗ nhân vật nói nhầm (lời chào, cách nói lịch sự) thì cho nhầm theo kiểu của tiếng Anh.

TÊN GỌI (dùng đúng):
- Lin → Lin
- chị Hana (chủ quán, khoảng 30 tuổi) → Hana (not "Grandma")
- StackChan → StackChan
- ông trưởng làng (không có tên riêng) → the mayor
- Quán Kotoba (quán trọ) → the Kotoba Inn
- làng Kotoba → Kotoba Village
- vườn Kotoba → Kotoba Farm
- bác đưa thư → the postman
- con mèo hoang trắng → the white stray cat

Độ dài: đúng 3 đoạn như bản gốc, mỗi đoạn 25–70 từ tiếng Anh.

TỪ NGƯỜI HỌC ĐÃ HỌC (trình độ A2) — dùng khi hợp, ĐỪNG ép câu:
borrow, lighthouse, whisper, receipt, crowded, umbrella

BẢN GỐC:
{"tieu_de": "（truyện bản gốc tiếng Việt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

Trả về đúng một object JSON theo khuôn: tieu_de (tiếng Anh, 3–8 từ), doan = các đoạn tiếng Anh (chữ trơn, không đánh dấu), dich = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn bạn vừa viết (cùng số phần tử, không có chữ Anh; tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba, làng Kotoba; không ghi chú trong ngoặc), tu_moi (≤ 2 từ khó ngoài danh sách: w, r = phiên âm IPA /…/, m = nghĩa tiếng Việt).
```

### 4. Viết cả số — system

```text
Bạn là người bản xứ nói tiếng Anh, viết báo làng "The Garden Gazette" (bản tiếng Anh của 畑新聞) cho người Việt Nam đang học tiếng Anh trình độ A2 (CEFR).
Viết tiếng Anh tự nhiên, đúng ngữ pháp như người bản xứ viết cho người học: câu ngắn và rõ (trung bình khoảng 12 từ một câu), ấm áp, hơi hài hước; không dịch từng chữ từ tiếng Việt.
Chỉ dùng ngữ pháp tới trình độ A2 (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.
Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.
Độ dài phần bài của cả số báo: 160–340 từ tiếng Anh.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Anh: không chữ Việt, không chữ Nhật /
  Trung / Hàn, không phiên âm trong bài.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được chia động từ, số nhiều, so sánh (go → went, city → cities).
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU.
- Tên riêng viết đúng như phần nhân vật. Dấu câu, ngoặc kép như tiếng Anh thông thường.

Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm.
```

### 4. Viết cả số — lời nhắc

```text
HÔM NAY: Sunday, ngày 8/11/2026, mùa thu. Số báo 30. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ: máy tự chèn truyện đã viết sẵn làm bài giữa):
1. loai "tin_lang": tin trong làng Kotoba Village và khu vườn Kotoba Farm, 2–3 đoạn (đừng kể lại truyện).
2. loai "thong_bao": Notices — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng "◆ ", tiêu đề "Village Notices".
Tiêu đề viết kiểu tiêu đề báo tiếng Anh, ngắn (3–8 từ).
cau_hoi: 2–3 câu trắc nghiệm TIẾNG ANH về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn tiếng Anh ngắn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" tiếng Việt chỉ ra câu nào trong bài cho biết đáp án.
chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài hoặc truyện (một câu trọn vẹn, 4–14 từ, chép đúng cả dấu câu), nên chứa từ trong danh sách từ vựng, KHÔNG có tên riêng và không phải lời thoại trong ngoặc kép; "them_dap_an": thường để rỗng.
ĐỘ DÀI: hai bài này tổng khoảng 64–255 từ (truyện không tính).
TRUYỆN ĐÃ VIẾT SẴN (kỳ 12, để đặt câu hỏi / câu chép):
{"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

TIN HÔM NAY CỦA LÀNG (bản gốc tiếng Việt — báo làng in bằng nhiều thứ tiếng, mọi bản đăng cùng tin):
- （tin 1）: （nội dung tin 1）
- （tin 2）: （nội dung tin 2）
→ Bài tin_lang KỂ LẠI đúng các tin này bằng tiếng Anh đúng trình độ (được rút gọn, gộp, chọn 2–3 tin); KHÔNG bịa tin khác.
MỤC THỨ BA (bản gốc): （thông báo của làng） — ◆ （mục 1） / ◆ （mục 2）
→ Bài thứ 3 kể lại mục này bằng tiếng Anh (giữ ý, giữ dạng ◆ nếu có).

dich: mỗi bài thêm "dich" = bản dịch tiếng Việt TỰ NHIÊN (có dấu) của từng đoạn (cùng số phần tử với doan; không ghi chú trong ngoặc). Người học bấm "Dịch" mới thấy.

mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. Phần lớn là mẫu TRỌNG TÂM (đúng trình độ A2), thêm 1 mẫu thấp hơn để ôn.
Dùng 10–20 từ khác nhau trong DANH SÁCH TỪ VỰNG ĐÃ HỌC (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa 3 từ ngoài danh sách thật sự cần (w = từ tiếng Anh như viết trong bài ở dạng gốc, r = phiên âm IPA dạng /.../, m = nghĩa tiếng Việt). tom_tat: 1–2 câu tiếng Việt tóm tắt số báo.

TỪ TRỌNG TÂM (người học phải ôn hôm nay): borrow, lighthouse, whisper, receipt
Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / số lượng → Village Notices hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / thời tiết → tin làng.

DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:
cefr:A1-01|be: am / is / are|động từ to be
cefr:A1-02|present simple: I work / she works|thì hiện tại đơn
cefr:A1-03|present continuous: I am working|thì hiện tại tiếp diễn
cefr:A1-04|there is / there are|có (cái gì ở đâu)
cefr:A1-05|can / can't|có thể / không thể
cefr:A1-06|have got / has got|có (sở hữu)
cefr:A1-07|like / love / hate + -ing|thích / ghét làm gì
cefr:A1-08|imperatives: Come in! / Don't run!|câu mệnh lệnh
cefr:A1-09|possessive 's and my / your / his / her|sở hữu
cefr:A1-10|this / that / these / those|này / kia
cefr:A1-11|prepositions of place: in / on / under / next to|giới từ chỉ nơi chốn
cefr:A1-12|prepositions of time: at / on / in|giới từ chỉ thời gian
cefr:A1-13|a / an / the|mạo từ
cefr:A1-14|some / any|một vài / nào
cefr:A1-15|was / were|quá khứ của be
cefr:A1-16|questions: What / Where / When / Who / How|câu hỏi Wh-
cefr:A1-17|let's + verb|hãy cùng …
cefr:A1-18|would like|muốn (lịch sự)
cefr:A2-01|past simple (regular and irregular verbs)|thì quá khứ đơn (TRỌNG TÂM)
cefr:A2-02|past continuous: was / were + -ing|thì quá khứ tiếp diễn (TRỌNG TÂM)
cefr:A2-03|going to (plans)|dự định sẽ (TRỌNG TÂM)
cefr:A2-04|will (decisions, predictions, offers)|sẽ (TRỌNG TÂM)
cefr:A2-05|comparatives: bigger / more beautiful than|so sánh hơn (TRỌNG TÂM)
cefr:A2-06|superlatives: the biggest / the most beautiful|so sánh nhất (TRỌNG TÂM)
cefr:A2-07|present perfect: have / has + past participle (ever, never, just)|thì hiện tại hoàn thành (TRỌNG TÂM)
cefr:A2-08|must / mustn't / have to|phải / không được (TRỌNG TÂM)
cefr:A2-09|should / shouldn't|nên / không nên (TRỌNG TÂM)
cefr:A2-10|adverbs of frequency: always / usually / sometimes / never|trạng từ chỉ tần suất (TRỌNG TÂM)
cefr:A2-11|much / many / a lot of / a few / a little|lượng từ (TRỌNG TÂM)
cefr:A2-12|too / enough|quá / đủ (TRỌNG TÂM)
cefr:A2-13|first conditional: If it rains, we will …|câu điều kiện loại 1 (TRỌNG TÂM)
cefr:A2-14|verb + to-infinitive: want to / decide to|động từ + to V (TRỌNG TÂM)
cefr:A2-15|because / so / but|vì / nên / nhưng (TRỌNG TÂM)
cefr:A2-16|might / may (possibility)|có lẽ (TRỌNG TÂM)
cefr:A2-17|object pronouns: me / him / her / us / them|đại từ tân ngữ (TRỌNG TÂM)
cefr:A2-18|time clauses: when / before / after|khi / trước khi / sau khi (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/ = nghĩa):
borrow /ˈbɒr.əʊ/ = mượn
lighthouse /ˈlaɪt.haʊs/ = ngọn hải đăng
whisper /ˈwɪs.pər/ = thì thầm
receipt /rɪˈsiːt/ = hoá đơn
umbrella /ʌmˈbrel.ə/ = cái ô
crowded /ˈkraʊ.dɪd/ = đông đúc

VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):
{"loai":"tin_lang","tieu_de":"StackChan Paints the Old Bridge","doan":["Yesterday afternoon, StackChan carried a small box of paints to the old bridge. \"I want to make it happy,\" he said."]}
```

### 5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)

```text
Bạn là biên tập viên người bản xứ, soát lại số báo tiếng Anh dưới đây dành cho người Việt học tiếng Anh trình độ A2 trước khi in.
Kiểm tra kỹ từng câu:
1. Tiếng Anh có tự nhiên và đúng ngữ pháp không (thì, mạo từ a/an/the, giới từ, chia động từ, số ít / số nhiều).
2. Ngữ pháp và độ dài câu có vượt trình độ A2 không → viết lại đơn giản, tách câu dài.
3. Từ khó hơn trình độ A2 (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai báo trong tu_moi (kèm nghĩa tiếng Việt).
4. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.
5. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, "dung" chỉ đúng vị trí; giai_thich đúng.
6. Câu chép chính tả có chép nguyên văn một câu trong bài không.
7. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.
8. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (Hana là bà chủ the Kotoba Inn, Lin là nhân viên mới).
9. Kết hợp từ tự nhiên như người bản xứ viết.
10. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.
Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). Không có lỗi thì van_de rỗng. "bao" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết lại. "dich" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Anh: không chữ Việt, không chữ Nhật /
  Trung / Hàn, không phiên âm trong bài.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được chia động từ, số nhiều, so sánh (go → went, city → cities).
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU.
- Tên riêng viết đúng như phần nhân vật. Dấu câu, ngoặc kép như tiếng Anh thông thường.

DANH SÁCH NGỮ PHÁP:
cefr:A1-01|be: am / is / are|động từ to be
cefr:A1-02|present simple: I work / she works|thì hiện tại đơn
cefr:A1-03|present continuous: I am working|thì hiện tại tiếp diễn
cefr:A1-04|there is / there are|có (cái gì ở đâu)
cefr:A1-05|can / can't|có thể / không thể
cefr:A1-06|have got / has got|có (sở hữu)
cefr:A1-07|like / love / hate + -ing|thích / ghét làm gì
cefr:A1-08|imperatives: Come in! / Don't run!|câu mệnh lệnh
cefr:A1-09|possessive 's and my / your / his / her|sở hữu
cefr:A1-10|this / that / these / those|này / kia
cefr:A1-11|prepositions of place: in / on / under / next to|giới từ chỉ nơi chốn
cefr:A1-12|prepositions of time: at / on / in|giới từ chỉ thời gian
cefr:A1-13|a / an / the|mạo từ
cefr:A1-14|some / any|một vài / nào
cefr:A1-15|was / were|quá khứ của be
cefr:A1-16|questions: What / Where / When / Who / How|câu hỏi Wh-
cefr:A1-17|let's + verb|hãy cùng …
cefr:A1-18|would like|muốn (lịch sự)
cefr:A2-01|past simple (regular and irregular verbs)|thì quá khứ đơn (TRỌNG TÂM)
cefr:A2-02|past continuous: was / were + -ing|thì quá khứ tiếp diễn (TRỌNG TÂM)
cefr:A2-03|going to (plans)|dự định sẽ (TRỌNG TÂM)
cefr:A2-04|will (decisions, predictions, offers)|sẽ (TRỌNG TÂM)
cefr:A2-05|comparatives: bigger / more beautiful than|so sánh hơn (TRỌNG TÂM)
cefr:A2-06|superlatives: the biggest / the most beautiful|so sánh nhất (TRỌNG TÂM)
cefr:A2-07|present perfect: have / has + past participle (ever, never, just)|thì hiện tại hoàn thành (TRỌNG TÂM)
cefr:A2-08|must / mustn't / have to|phải / không được (TRỌNG TÂM)
cefr:A2-09|should / shouldn't|nên / không nên (TRỌNG TÂM)
cefr:A2-10|adverbs of frequency: always / usually / sometimes / never|trạng từ chỉ tần suất (TRỌNG TÂM)
cefr:A2-11|much / many / a lot of / a few / a little|lượng từ (TRỌNG TÂM)
cefr:A2-12|too / enough|quá / đủ (TRỌNG TÂM)
cefr:A2-13|first conditional: If it rains, we will …|câu điều kiện loại 1 (TRỌNG TÂM)
cefr:A2-14|verb + to-infinitive: want to / decide to|động từ + to V (TRỌNG TÂM)
cefr:A2-15|because / so / but|vì / nên / nhưng (TRỌNG TÂM)
cefr:A2-16|might / may (possibility)|có lẽ (TRỌNG TÂM)
cefr:A2-17|object pronouns: me / him / her / us / them|đại từ tân ngữ (TRỌNG TÂM)
cefr:A2-18|time clauses: when / before / after|khi / trước khi / sau khi (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ /phiên âm/ = nghĩa):
borrow /ˈbɒr.əʊ/ = mượn
lighthouse /ˈlaɪt.haʊs/ = ngọn hải đăng
whisper /ˈwɪs.pər/ = thì thầm
receipt /rɪˈsiːt/ = hoá đơn
umbrella /ʌmˈbrel.ə/ = cái ô
crowded /ˈkraʊ.dɪd/ = đông đúc

SỐ BÁO:
{"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}
```

## Báo tiếng Trung (词田晨报, HSK 2, giản thể) — 1.33

### 3. Kể lại truyện — lời nhắc

```text
KỂ LẠI kỳ 12 của truyện dài kỳ dưới đây bằng tiếng Trung giản thể trình độ HSK2 cho người Việt đang học. Đây là cùng một câu chuyện in trong báo làng bằng nhiều thứ tiếng: GIỮ ĐÚNG sự việc, nhân vật, lời thoại chính, chi tiết bất ngờ và móc câu cuối; không thêm chuyện mới, không bỏ móc câu.

Viết lại cho hợp trình độ: câu ngắn, tự nhiên như sách đọc cho người học; được rút gọn chi tiết phụ. Chỗ nhân vật nói nhầm (lời chào, cách nói lịch sự) thì cho nhầm theo kiểu của tiếng Trung (vd. nhầm lượng từ, nhầm 了).

TÊN GỌI (dùng đúng):
- Lin → 林
- chị Hana (chủ quán, khoảng 30 tuổi) → 哈娜（旅店老板娘，三十岁左右）
- StackChan → StackChan
- ông trưởng làng (không có tên riêng) → 村长
- Quán Kotoba (quán trọ) → 言叶旅店
- làng Kotoba → 言叶村
- vườn Kotoba → 言叶菜园
- bác đưa thư → 邮递员
- con mèo hoang trắng → 白色的流浪猫

Độ dài: đúng 3 đoạn như bản gốc, mỗi đoạn 45–110 chữ Hán.

TỪ NGƯỜI HỌC ĐÃ HỌC (trình độ HSK2) — dùng khi hợp, ĐỪNG ép câu:
天气、旅店、准备、害怕、漂亮、朋友

MẪU NGỮ PHÁP ĐANG HỌC (dùng 1–2 mẫu trong lời thoại nếu tự nhiên):
- V + 过: đã từng …
- V + 着: (trạng thái) đang …
- 正在 + V + 呢: đang …

BẢN GỐC:
{"tieu_de": "（truyện bản gốc tiếng Việt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

Trả về đúng một object JSON theo khuôn: tieu_de (tiếng Trung, ngắn), doan = các đoạn tiếng Trung giản thể (chữ Hán + dấu câu Trung Quốc ，。！？“”, không chữ Latin trừ tên StackChan). MỌI chữ Hán viết kèm pinyin ghi số theo TỪ, dạng [chữ|pinyin]: [学生|xue2 sheng5][在|zai4][看书|kan4 shu1]。 — mỗi chữ một âm tiết, 5 = thanh nhẹ, ü viết v, đúng cách đọc theo văn cảnh; 一 / 不 ghi thanh theo chữ sau; không dùng { }, dich = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn bạn vừa viết (cùng số phần tử, không có chữ Trung; tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba, làng Kotoba; không ghi chú trong ngoặc), tu_moi (≤ 2 từ khó ngoài danh sách: w, r = pinyin ghi số, vd. hai4 pa4, m = nghĩa tiếng Việt).
```

### 4. Viết cả số — system

```text
Bạn là người Trung Quốc bản xứ, viết báo làng "词田晨报" (bản tiếng Trung của 畑新聞) cho người Việt Nam đang học tiếng Trung trình độ HSK 2.
Viết tiếng Trung tự nhiên, đúng ngữ pháp: câu ngắn và rõ (trung bình khoảng 11 chữ một câu), ấm áp, hơi hài hước; không dịch từng chữ từ tiếng Việt.
Chỉ dùng ngữ pháp tới trình độ HSK 2 (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.
Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.
Độ dài phần bài của cả số báo: 220–450 chữ Hán.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Trung chữ GIẢN THỂ: không kana, không chữ Hàn / Việt, không chữ Latin (trừ tên StackChan), dấu câu Trung Quốc ，。！？“”.
- MỌI chữ Hán viết kèm pinyin theo TỪ, dạng [chữ|pinyin ghi số]: [学生|xue2 sheng5][在|zai4][看书|kan4 shu1]。 Mỗi chữ một âm tiết, cách nhau dấu cách; số 1–4 là thanh, 5 là thanh nhẹ; ü viết v (女 = nv3). Dấu câu, chữ số và StackChan để ngoài ngoặc. Ghi đúng cách đọc theo văn cảnh (长大 = zhang3 da4, 很长 = hen3 chang2); 一 / 不 ghi thanh theo chữ sau (一个 = yi2 ge4, 不是 = bu2 shi4).
- KHÔNG dùng { } và không markdown (* _ #): máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi.
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU, không kèm chữ Hán.

Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm.
```

### 4. Viết cả số — lời nhắc

```text
HÔM NAY: Chủ Nhật, ngày 8/11/2026, mùa thu. Số báo 30. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ: máy tự chèn truyện đã viết sẵn làm bài giữa):
1. loai "tin_lang": tin trong làng 言叶村 và khu vườn 言叶菜园, 2–3 đoạn (đừng kể lại truyện).
2. loai "thong_bao": 村里通知 — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng "◆ ", tiêu đề "村里通知".
Tiêu đề viết kiểu tiêu đề báo tiếng Trung, ngắn.
cau_hoi: 2–3 câu trắc nghiệm TIẾNG TRUNG về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn tiếng Trung ngắn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" tiếng Việt chỉ ra câu nào trong bài cho biết đáp án.
chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài hoặc truyện (một câu trọn vẹn, 5–12 chữ Hán, chép đúng cả dấu câu), nên chứa từ trong danh sách từ vựng, không phải lời thoại trong ngoặc kép; "them_dap_an": thường để rỗng.
ĐỘ DÀI: hai bài này tổng khoảng 88–337 chữ Hán (truyện không tính).
TRUYỆN ĐÃ VIẾT SẴN (kỳ 12, để đặt câu hỏi / câu chép):
{"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

TIN HÔM NAY CỦA LÀNG (bản gốc tiếng Việt — báo làng in bằng nhiều thứ tiếng, mọi bản đăng cùng tin):
- （tin 1）: （nội dung tin 1）
- （tin 2）: （nội dung tin 2）
→ Bài tin_lang KỂ LẠI đúng các tin này bằng tiếng Trung đúng trình độ (được rút gọn, gộp, chọn 2–3 tin); KHÔNG bịa tin khác.
MỤC THỨ BA (bản gốc): （thông báo của làng） — ◆ （mục 1） / ◆ （mục 2）
→ Bài thứ 3 kể lại mục này bằng tiếng Trung (giữ ý, giữ dạng ◆ nếu có).

dich: mỗi bài thêm "dich" = bản dịch tiếng Việt TỰ NHIÊN (có dấu) của từng đoạn (cùng số phần tử với doan; không ghi chú trong ngoặc). Người học bấm "Dịch" mới thấy.

mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. Phần lớn là mẫu TRỌNG TÂM (đúng trình độ HSK 2), thêm 1 mẫu thấp hơn để ôn.
Dùng 10–20 từ khác nhau trong DANH SÁCH TỪ VỰNG ĐÃ HỌC (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa 3 từ ngoài danh sách thật sự cần (w = từ tiếng Trung chỉ gồm chữ Hán, r = pinyin ghi số, m = nghĩa tiếng Việt). tom_tat: 1–2 câu tiếng Việt tóm tắt số báo.

TỪ TRỌNG TÂM (người học phải ôn hôm nay): 天气、旅店、准备、害怕
Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / số lượng → 村里通知 hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / thời tiết → tin làng.

DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:
zh1-01|A 是 B|A là B
zh1-02|有 / 没有|có / không có
zh1-03|……吗？|câu hỏi có / không
zh1-04|……呢？|còn … thì sao?
zh1-05|N 的 N|của (sở hữu)
zh1-06|很 + tính từ|rất …
zh1-07|不 / 没 + V|không / chưa (phủ định)
zh1-08|在 + nơi chốn|ở …
zh1-09|想 + V|muốn …
zh1-10|会 + V|biết / sẽ …
zh1-11|V + 了|đã … (hoàn thành)
zh1-12|几 / 多少|mấy / bao nhiêu
zh2-01|V + 过|đã từng … (TRỌNG TÂM)
zh2-02|V + 着|(trạng thái) đang … (TRỌNG TÂM)
zh2-03|正在 + V + 呢|đang … (TRỌNG TÂM)
zh2-04|要 / 快要 + V + 了|sắp … rồi (TRỌNG TÂM)
zh2-05|A 比 B + tính từ|A … hơn B (TRỌNG TÂM)
zh2-06|因为……，所以……|vì … nên … (TRỌNG TÂM)
zh2-07|虽然……，但是……|tuy … nhưng … (TRỌNG TÂM)
zh2-08|可以 + V|có thể … (TRỌNG TÂM)
zh2-09|V + 得 + bổ ngữ|… (làm) thế nào (说得很好) (TRỌNG TÂM)
zh2-10|一边……一边……|vừa … vừa … (TRỌNG TÂM)
zh2-11|就|ngay / thì (TRỌNG TÂM)
zh2-12|还|còn, vẫn (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ pinyin = nghĩa):
天气 tiān qì = thời tiết · THIÊN KHÍ
旅店 lǚ diàn = quán trọ · LỮ ĐIẾM
准备 zhǔn bèi = chuẩn bị
害怕 hài pà = sợ · HẠI PHẠ
朋友 péng you = bạn bè · BẰNG HỮU
漂亮 piào liang = đẹp · PHIÊU LƯỢNG

VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):
{"loai":"tin_lang","tieu_de":"[今天|jin1 tian1]StackChan[去|qu4][画|hua4][画|hua4]","doan":["[下午|xia4 wu3]，StackChan[带|dai4][着|zhe5][一|yi4][盒|he2][颜料|yan2 liao4][去|qu4][了|le5][老|lao3][桥|qiao2]。“[我|wo3][想|xiang3][让|rang4][它|ta1][开心|kai1 xin1]！”[他|ta1][说|shuo1]。"]}

PINYIN: mọi chữ Hán ở tiêu đề, bài, câu hỏi, lựa chọn và câu chép đều viết dạng [chữ|pinyin ghi số] theo từ (xem QUY TẮC). Truyện đã viết sẵn ở trên đã có pinyin; câu hỏi / câu chép lấy từ truyện thì chép cả pinyin.
```

### 5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)

```text
Bạn là biên tập viên người Trung Quốc, soát lại số báo tiếng Trung dưới đây dành cho người Việt học tiếng Trung trình độ HSK 2 trước khi in.
Kiểm tra kỹ từng câu:
1. Tiếng Trung có tự nhiên và đúng ngữ pháp không (lượng từ, 了 / 过 / 着, trật tự từ, bổ ngữ).
2. PINYIN: mỗi chữ đúng cách đọc theo văn cảnh (chữ nhiều cách đọc, thanh nhẹ, 一 / 不 đổi thanh), mỗi chữ một âm tiết.
3. Ngữ pháp và độ dài câu có vượt trình độ HSK 2 không → viết lại đơn giản, tách câu dài.
4. Từ khó hơn trình độ HSK 2 (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai báo trong tu_moi (kèm pinyin và nghĩa tiếng Việt).
5. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.
6. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, "dung" chỉ đúng vị trí; giai_thich đúng.
7. Câu chép chính tả có chép nguyên văn một câu trong bài không.
8. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.
9. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (哈娜 là chủ 言叶旅店, 林 là nhân viên mới).
10. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.
Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). Không có lỗi thì van_de rỗng. "bao" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên), giữ dạng [chữ|pinyin]. Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết lại. "dich" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.
Trong SỐ BÁO, máy đã tách pinyin theo từng chữ ([今|jin1][天|tian1]): đó là đúng, đừng ghép lại hay báo lỗi chỗ này; câu bạn sửa thì ghi theo từ hoặc theo chữ đều được.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Trung chữ GIẢN THỂ: không kana, không chữ Hàn / Việt, không chữ Latin (trừ tên StackChan), dấu câu Trung Quốc ，。！？“”.
- MỌI chữ Hán viết kèm pinyin theo TỪ, dạng [chữ|pinyin ghi số]: [学生|xue2 sheng5][在|zai4][看书|kan4 shu1]。 Mỗi chữ một âm tiết, cách nhau dấu cách; số 1–4 là thanh, 5 là thanh nhẹ; ü viết v (女 = nv3). Dấu câu, chữ số và StackChan để ngoài ngoặc. Ghi đúng cách đọc theo văn cảnh (长大 = zhang3 da4, 很长 = hen3 chang2); 一 / 不 ghi thanh theo chữ sau (一个 = yi2 ge4, 不是 = bu2 shi4).
- KHÔNG dùng { } và không markdown (* _ #): máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi.
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU, không kèm chữ Hán.

DANH SÁCH NGỮ PHÁP:
zh1-01|A 是 B|A là B
zh1-02|有 / 没有|có / không có
zh1-03|……吗？|câu hỏi có / không
zh1-04|……呢？|còn … thì sao?
zh1-05|N 的 N|của (sở hữu)
zh1-06|很 + tính từ|rất …
zh1-07|不 / 没 + V|không / chưa (phủ định)
zh1-08|在 + nơi chốn|ở …
zh1-09|想 + V|muốn …
zh1-10|会 + V|biết / sẽ …
zh1-11|V + 了|đã … (hoàn thành)
zh1-12|几 / 多少|mấy / bao nhiêu
zh2-01|V + 过|đã từng … (TRỌNG TÂM)
zh2-02|V + 着|(trạng thái) đang … (TRỌNG TÂM)
zh2-03|正在 + V + 呢|đang … (TRỌNG TÂM)
zh2-04|要 / 快要 + V + 了|sắp … rồi (TRỌNG TÂM)
zh2-05|A 比 B + tính từ|A … hơn B (TRỌNG TÂM)
zh2-06|因为……，所以……|vì … nên … (TRỌNG TÂM)
zh2-07|虽然……，但是……|tuy … nhưng … (TRỌNG TÂM)
zh2-08|可以 + V|có thể … (TRỌNG TÂM)
zh2-09|V + 得 + bổ ngữ|… (làm) thế nào (说得很好) (TRỌNG TÂM)
zh2-10|一边……一边……|vừa … vừa … (TRỌNG TÂM)
zh2-11|就|ngay / thì (TRỌNG TÂM)
zh2-12|还|còn, vẫn (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ pinyin = nghĩa):
天气 tiān qì = thời tiết · THIÊN KHÍ
旅店 lǚ diàn = quán trọ · LỮ ĐIẾM
准备 zhǔn bèi = chuẩn bị
害怕 hài pà = sợ · HẠI PHẠ
朋友 péng you = bạn bè · BẰNG HỮU
漂亮 piào liang = đẹp · PHIÊU LƯỢNG

SỐ BÁO:
{"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}
```

## Báo tiếng Hàn (말밭 신문, TOPIK 2) — 1.33

### 3. Kể lại truyện — lời nhắc

```text
KỂ LẠI kỳ 12 của truyện dài kỳ dưới đây bằng tiếng Hàn trình độ TOPIK2 cho người Việt đang học. Đây là cùng một câu chuyện in trong báo làng bằng nhiều thứ tiếng: GIỮ ĐÚNG sự việc, nhân vật, lời thoại chính, chi tiết bất ngờ và móc câu cuối; không thêm chuyện mới, không bỏ móc câu.

Viết lại cho hợp trình độ: câu ngắn, tự nhiên như sách đọc cho người học; được rút gọn chi tiết phụ. Chỗ nhân vật nói nhầm (lời chào, cách nói lịch sự) thì cho nhầm theo kiểu của tiếng Hàn (vd. nhầm kính ngữ, nhầm tiểu từ).

TÊN GỌI (dùng đúng):
- Lin → 린
- chị Hana (chủ quán, khoảng 30 tuổi) → 하나 씨 (여관 주인, 30대)
- StackChan → 스택짱
- ông trưởng làng (không có tên riêng) → 촌장님
- Quán Kotoba (quán trọ) → 코토바 여관
- làng Kotoba → 코토바 마을
- vườn Kotoba → 코토바 텃밭
- bác đưa thư → 우체부 아저씨
- con mèo hoang trắng → 하얀 길고양이

Độ dài: đúng 3 đoạn như bản gốc, mỗi đoạn 15–40 cụm (어절).

TỪ NGƯỜI HỌC ĐÃ HỌC (trình độ TOPIK2) — dùng khi hợp, ĐỪNG ép câu:
날씨, 여관, 준비하다, 무섭다, 예쁘다, 친구

MẪU NGỮ PHÁP ĐANG HỌC (dùng 1–2 mẫu trong lời thoại nếu tự nhiên):
- V-(으)ㄹ 거예요: sẽ
- V-(으)세요: hãy… (lịch sự)
- V/A-지만: nhưng

BẢN GỐC:
{"tieu_de": "（truyện bản gốc tiếng Việt）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

Trả về đúng một object JSON theo khuôn: tieu_de (tiếng Hàn, ngắn), doan = các đoạn tiếng Hàn (chỉ Hangul, KHÔNG Hán tự, không phiên âm Latin, không [ ] { } |), dich = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn bạn vừa viết (cùng số phần tử, không có chữ Hàn; tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba, làng Kotoba; không ghi chú trong ngoặc), tu_moi (≤ 2 từ khó ngoài danh sách: w, r = phiên âm romaja, m = nghĩa tiếng Việt).
```

### 4. Viết cả số — system

```text
Bạn là người Hàn bản xứ, viết báo làng "말밭 신문" (bản tiếng Hàn của 畑新聞) cho người Việt Nam đang học tiếng Hàn trình độ TOPIK 2.
Viết tiếng Hàn tự nhiên, đúng ngữ pháp và cách chữ: câu ngắn và rõ (trung bình khoảng 6 cụm 어절 một câu), ấm áp, hơi hài hước; không dịch từng chữ từ tiếng Việt.
Chỉ dùng ngữ pháp tới trình độ TOPIK 2 (danh sách được cho, hoặc đơn giản hơn). Dùng THẬT NHIỀU từ trong danh sách từ vựng đã học, còn lại là từ rất cơ bản; từ khó ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.
Nội dung hoàn toàn mới, không chép đoạn văn của sách giáo khoa nào.
Độ dài phần bài của cả số báo: 130–280 cụm (어절).

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Hàn (Hangul): không Hán tự (漢字), không
  chữ Nhật / Việt / Latin, không phiên âm. StackChan viết 스택짱.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được thêm tiểu từ và chia đuôi bình thường (축제가, 무서워서).
- Văn kể dùng đuôi -아요 / -어요 hoặc -습니다 thống nhất trong một bài; viết cách chữ (띄어쓰기) chuẩn.
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU.

Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm.
```

### 4. Viết cả số — lời nhắc

```text
HÔM NAY: Chủ Nhật, ngày 8/11/2026, mùa thu. Số báo 30. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ: máy tự chèn truyện đã viết sẵn làm bài giữa):
1. loai "tin_lang": tin trong làng 코토바 마을 và khu vườn 코토바 텃밭, 2–3 đoạn (đừng kể lại truyện).
2. loai "thong_bao": 마을 소식 — 2–3 mục thông báo của làng, mỗi mục là một đoạn bắt đầu bằng "◆ ", tiêu đề "마을 소식".
Tiêu đề viết kiểu tiêu đề báo tiếng Hàn, ngắn.
cau_hoi: 2–3 câu trắc nghiệm TIẾNG HÀN về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn tiếng Hàn ngắn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" tiếng Việt chỉ ra câu nào trong bài cho biết đáp án.
chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài hoặc truyện (một câu trọn vẹn, 3–7 cụm 어절, chép đúng cả dấu câu), nên chứa từ trong danh sách từ vựng, không phải lời thoại trong ngoặc kép; "them_dap_an": thường để rỗng.
ĐỘ DÀI: hai bài này tổng khoảng 52–210 cụm 어절 (truyện không tính).
TRUYỆN ĐÃ VIẾT SẴN (kỳ 12, để đặt câu hỏi / câu chép):
{"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

TIN HÔM NAY CỦA LÀNG (bản gốc tiếng Việt — báo làng in bằng nhiều thứ tiếng, mọi bản đăng cùng tin):
- （tin 1）: （nội dung tin 1）
- （tin 2）: （nội dung tin 2）
→ Bài tin_lang KỂ LẠI đúng các tin này bằng tiếng Hàn đúng trình độ (được rút gọn, gộp, chọn 2–3 tin); KHÔNG bịa tin khác.
MỤC THỨ BA (bản gốc): （thông báo của làng） — ◆ （mục 1） / ◆ （mục 2）
→ Bài thứ 3 kể lại mục này bằng tiếng Hàn (giữ ý, giữ dạng ◆ nếu có).

dich: mỗi bài thêm "dich" = bản dịch tiếng Việt TỰ NHIÊN (có dấu) của từng đoạn (cùng số phần tử với doan; không ghi chú trong ngoặc). Người học bấm "Dịch" mới thấy.

mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. Phần lớn là mẫu TRỌNG TÂM (đúng trình độ TOPIK 2), thêm 1 mẫu thấp hơn để ôn.
Dùng 10–20 từ khác nhau trong DANH SÁCH TỪ VỰNG ĐÃ HỌC (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa 3 từ ngoài danh sách thật sự cần (w = từ tiếng Hàn ở dạng từ điển — danh từ, hoặc động / tính từ đuôi 다; r = phiên âm romaja; m = nghĩa tiếng Việt). tom_tat: 1–2 câu tiếng Việt tóm tắt số báo.

TỪ TRỌNG TÂM (người học phải ôn hôm nay): 날씨, 여관, 준비하다, 무섭다
Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / số lượng → 마을 소식 hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / thời tiết → tin làng.

DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:
ko1-01|N이에요 / 예요|là N
ko1-02|N은 / 는|chủ đề (còn N thì…)
ko1-03|N이 / 가 있어요 / 없어요|có / không có N
ko1-04|V/A-아요 / 어요|đuôi thân mật lịch sự (hiện tại)
ko1-05|V/A-았어요 / 었어요|đã (quá khứ)
ko1-06|N에 가다 / 오다|đi / đến N
ko1-07|N에서 V|làm V ở N
ko1-08|V-고 싶다|muốn V
ko1-09|안 V/A|không (phủ định)
ko1-10|N을 / 를|tân ngữ
ko1-11|V/A-고|và, rồi
ko2-01|V-(으)ㄹ 거예요|sẽ (TRỌNG TÂM)
ko2-02|V-(으)세요|hãy… (lịch sự) (TRỌNG TÂM)
ko2-03|V/A-지만|nhưng (TRỌNG TÂM)
ko2-04|V/A-아서 / 어서|vì… nên; rồi (nối hành động) (TRỌNG TÂM)
ko2-05|V-(으)ㄹ 수 있다 / 없다|có thể / không thể (TRỌNG TÂM)
ko2-06|V-고 있다|đang (TRỌNG TÂM)
ko2-07|V/A-(으)면|nếu (TRỌNG TÂM)
ko2-08|V-(으)러 가다|đi để làm V (TRỌNG TÂM)
ko2-09|N보다|hơn N (so sánh) (TRỌNG TÂM)
ko2-10|V-아 / 어 주다|làm giúp (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):
날씨 = thời tiết
여관 = quán trọ
준비하다 = chuẩn bị
무섭다 = sợ
친구 = bạn bè
예쁘다 = đẹp

VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):
{"loai":"tin_lang","tieu_de":"스택짱, 오래된 다리를 칠하다","doan":["어제 오후에 스택짱은 작은 물감 상자를 들고 오래된 다리에 갔어요. \"다리를 행복하게 해 주고 싶어요!\" 스택짱이 말했어요."]}
```

### 5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)

```text
Bạn là biên tập viên người Hàn, soát lại số báo tiếng Hàn dưới đây dành cho người Việt học tiếng Hàn trình độ TOPIK 2 trước khi in.
Kiểm tra kỹ từng câu:
1. Tiếng Hàn có tự nhiên và đúng ngữ pháp không (tiểu từ 이/가, 은/는, 을/를, đuôi câu, kính ngữ, cách chữ 띄어쓰기).
2. Ngữ pháp và độ dài câu có vượt trình độ TOPIK 2 không → viết lại đơn giản, tách câu dài.
3. Từ khó hơn trình độ TOPIK 2 (không có trong danh sách từ vựng, không phải từ rất cơ bản) → đổi từ dễ hơn, hoặc khai báo trong tu_moi (kèm nghĩa tiếng Việt).
4. GIỮ các từ trong danh sách từ vựng đã học (đừng đổi sang từ đồng nghĩa): đó là từ người học đang ôn.
5. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, "dung" chỉ đúng vị trí; giai_thich đúng.
6. Câu chép chính tả có chép nguyên văn một câu trong bài không.
7. Tiêu đề, tom_tat, ky_truoc, giai_thich (tiếng Việt có dấu) viết đúng nghĩa với bài.
8. Lời thoại: rõ ai nói câu nào; nhân vật nhất quán (하나 씨 là chủ 코토바 여관, 린 là nhân viên mới).
9. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.
Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). Không có lỗi thì van_de rỗng. "bao" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Giữ nguyên các id mau_cau, số kỳ truyện. Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự, không viết lại. "dich" (bản dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Bài, tiêu đề, câu hỏi, lựa chọn, câu chép chính tả viết HOÀN TOÀN bằng tiếng Hàn (Hangul): không Hán tự (漢字), không
  chữ Nhật / Việt / Latin, không phiên âm. StackChan viết 스택짱.
- Chữ trơn, KHÔNG đánh dấu gì: không [ ] { } |, không markdown (* _ #). Máy tự gạch chân từ đã học để người đọc bấm tra.
- Dùng từ trong DANH SÁCH TỪ VỰNG ĐÃ HỌC đúng nghĩa đã ghi; được thêm tiểu từ và chia đuôi bình thường (축제가, 무서워서).
- Văn kể dùng đuôi -아요 / -어요 hoặc -습니다 thống nhất trong một bài; viết cách chữ (띄어쓰기) chuẩn.
- Phần tiếng Việt (giai_thich, tom_tat, ky_truoc, tom_tat_truyen, nghĩa m trong tu_moi) viết tiếng Việt CÓ DẤU.

DANH SÁCH NGỮ PHÁP:
ko1-01|N이에요 / 예요|là N
ko1-02|N은 / 는|chủ đề (còn N thì…)
ko1-03|N이 / 가 있어요 / 없어요|có / không có N
ko1-04|V/A-아요 / 어요|đuôi thân mật lịch sự (hiện tại)
ko1-05|V/A-았어요 / 었어요|đã (quá khứ)
ko1-06|N에 가다 / 오다|đi / đến N
ko1-07|N에서 V|làm V ở N
ko1-08|V-고 싶다|muốn V
ko1-09|안 V/A|không (phủ định)
ko1-10|N을 / 를|tân ngữ
ko1-11|V/A-고|và, rồi
ko2-01|V-(으)ㄹ 거예요|sẽ (TRỌNG TÂM)
ko2-02|V-(으)세요|hãy… (lịch sự) (TRỌNG TÂM)
ko2-03|V/A-지만|nhưng (TRỌNG TÂM)
ko2-04|V/A-아서 / 어서|vì… nên; rồi (nối hành động) (TRỌNG TÂM)
ko2-05|V-(으)ㄹ 수 있다 / 없다|có thể / không thể (TRỌNG TÂM)
ko2-06|V-고 있다|đang (TRỌNG TÂM)
ko2-07|V/A-(으)면|nếu (TRỌNG TÂM)
ko2-08|V-(으)러 가다|đi để làm V (TRỌNG TÂM)
ko2-09|N보다|hơn N (so sánh) (TRỌNG TÂM)
ko2-10|V-아 / 어 주다|làm giúp (TRỌNG TÂM)

DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ = nghĩa):
날씨 = thời tiết
여관 = quán trọ
준비하다 = chuẩn bị
무섭다 = sợ
친구 = bạn bè
예쁘다 = đẹp

SỐ BÁO:
{"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}
```

## Báo tiếng Việt (Báo Làng Kotoba — chỉ khi không học Nhật / Anh)

### 4. Viết cả số — system

```text
Bạn là người viết báo làng "Báo Làng Kotoba" (bản tiếng Việt của 畑新聞) — báo vui hằng ngày của một làng nhỏ, có truyện dài kỳ khiến người đọc mong số sau.
Viết tiếng Việt tự nhiên, ấm áp, hơi hài hước; câu rõ ràng. Nội dung hoàn toàn mới.
Độ dài tin làng + bài thứ ba (không tính truyện): khoảng 200–600 chữ.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Viết HOÀN TOÀN bằng tiếng Việt có dấu, tự nhiên như báo / truyện Việt Nam.
- Chữ trơn: không dùng [ ] { } |, không markdown (* _ #).
- Đây là báo vui của làng: câu rõ, ấm áp, hơi hài hước.

Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm.
```

### 4. Viết cả số — lời nhắc

```text
HÔM NAY: Chủ Nhật, ngày 8/11/2026, mùa thu. Số báo 30. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ: máy tự chèn truyện hôm nay làm bài giữa):
1. loai "tin_lang": tin trong làng Kotoba, 3–4 đoạn (đừng kể lại truyện).
2. loai "thong_bao": Thông báo của làng — 2–3 mục, mỗi mục một đoạn ngắn bắt đầu bằng "◆ "; tiêu đề "Thông báo của làng".
Tiêu đề ngắn kiểu tiêu đề báo (4–10 chữ).
cau_hoi: 2–4 câu trắc nghiệm tiếng Việt về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn ngắn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" 1 câu chỉ ra bài nói gì.
ĐỘ DÀI: hai bài này tổng khoảng 200–600 chữ.
TRUYỆN HÔM NAY (kỳ 12, để đặt câu hỏi):
{"tieu_de": "（truyện đã kể lại bằng tiếng của báo）", "doan": ["（đoạn 1）", "（đoạn 2）", "（đoạn 3）"]}

TIN HÔM NAY CỦA LÀNG (bản gốc tiếng Việt — báo làng in bằng nhiều thứ tiếng, mọi bản đăng cùng tin):
- （tin 1）: （nội dung tin 1）
- （tin 2）: （nội dung tin 2）
→ Bài tin_lang viết từ đúng các tin này (được viết dài hơn, thêm chi tiết đời thường) (được rút gọn, gộp, chọn 2–3 tin); KHÔNG bịa tin khác.
MỤC THỨ BA (bản gốc): （thông báo của làng） — ◆ （mục 1） / ◆ （mục 2）
→ Bài thứ 3 kể lại mục này bằng tiếng Việt (giữ ý, giữ dạng ◆ nếu có).

chinh_ta, mau_cau, tu_moi: để rỗng []. tom_tat: 1–2 câu tóm tắt số báo.

VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):
{"loai":"tin_lang","tieu_de":"Chợ phiên đầu đông","doan":["Sáng nay chợ phiên đông hơn mọi tuần. Bác đưa thư kể rằng có người mang tới cả một xe bí ngô to bằng cái ghế."]}
```

### 5. Soát lần 2 — lời nhắc (cuối lời nhắc là cả số báo JSON)

```text
Bạn là biên tập viên, soát lại số báo tiếng Việt dưới đây trước khi in.
Kiểm tra kỹ:
1. Tiếng Việt tự nhiên, đúng chính tả, có dấu.
2. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, "dung" chỉ đúng vị trí; giai_thich đúng.
3. Tiêu đề, tom_tat viết đúng với bài; nhân vật nhất quán (chị Hana là chủ quán, Lin là nhân viên mới).
4. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.
Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì, sua = câu mới). Không có lỗi thì van_de rỗng. "bao" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi chính tả thật sự, không viết lại. chinh_ta, mau_cau, tu_moi để rỗng.

QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Viết HOÀN TOÀN bằng tiếng Việt có dấu, tự nhiên như báo / truyện Việt Nam.
- Chữ trơn: không dùng [ ] { } |, không markdown (* _ #).
- Đây là báo vui của làng: câu rõ, ấm áp, hơi hài hước.

SỐ BÁO:
{"bai": [{"loai": "tin_lang", "tieu_de": "…", "doan": ["…"]}]}
```

## Không dùng deck (tiếng Nhật N3) — đoạn khác với khi có deck

### 4. Viết cả số — lời nhắc (không có bản gốc: truyện viết chung trong lượt này)

```text
HÔM NAY: ngày 8/11/2026, mùa thu ở Nhật. Số báo 1. Thời tiết ở làng: cả ngày nhiều mây.

CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:
1. loai "tin_lang": tin trong làng ことば村 và khu vườn ことば畑, dùng nhân vật của truyện, 2–3 đoạn.
2. loai "truyen": kỳ 1 của truyện dài kỳ, "ky": 1, 2–3 đoạn, kết hơi bỏ ngỏ; "ky_truoc": "" (kỳ 1).
3. loai "thong_bao": お知らせ, 2–3 mục, mỗi mục là một đoạn bắt đầu bằng ◆, tiêu đề お[知|し]らせ.
cau_hoi: 2–3 câu trắc nghiệm tiếng Nhật về nội dung bài, mỗi câu đúng 3 lựa chọn, CHỈ MỘT đáp án đúng, "dung" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), "giai_thich" tiếng Việt chỉ ra câu trong bài.
chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (8–30 ký tự, một câu trọn vẹn, không vắt qua dấu 「」), nên chứa mẫu câu trọng tâm; "them_dap_an": cách viết khác vẫn đúng (僕/ぼく, 下さい/ください), không đánh dấu.
tom_tat_truyen: 1 câu tiếng Việt tóm tắt kỳ 1 (để kỳ sau viết tiếp).

dich: mỗi bài thêm "dich" = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn (cùng số phần tử với doan; không có chữ Nhật — tên riêng viết Latin: Lin, Hana, Stack-chan, quán Kotoba; không furigana, không ghi chú trong ngoặc). Người học bấm "Dịch" mới thấy.

mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. Phần lớn là mẫu TRỌNG TÂM (nếu có), thêm 1 mẫu cũ để ôn.
Đánh dấu {..|..|..} cho 8–20 từ đáng học (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa 12 từ ngoài danh sách, mỗi từ phải được đánh dấu {..|..|từ} trong bài. tom_tat: 1–2 câu tiếng Việt tóm tắt số báo.

NGƯỜI HỌC CHƯA CÓ DECK (không có danh sách từ đã học): viết bằng từ thông dụng đúng trình độ N3. Chọn 8–12 từ đáng học trong số (đúng trình độ, hợp chủ đề), khai báo trong tu_moi (w = từ, r = cách đọc HIRAGANA, m = nghĩa tiếng Việt) và đánh dấu {表記|よみ|từ} ở chỗ dùng; mọi chữ Hán khác dùng [漢字|かんじ].

TRUYỆN:
Truyện dài kỳ 『ことば村の小さな旅館』. ことば村 là làng nhỏ cạnh khu vườn ことば畑; mùa và thời tiết theo ngày thật ở Nhật.
Nhân vật (giữ nhất quán):
- スタックちゃん: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ. Xưng ぼく, nói thân mật.
- はなさん: bà chủ (女将さん) quán trọ nhỏ「ことば屋」, khoảng 30 tuổi, chu đáo, nói kính ngữ với khách.
  Gọi là はなさん (hoặc 女将さん); KHÔNG gọi là 店長.
- リンさん: cô gái Việt Nam mới đến làng, làm ở ことば屋, đang học tiếng Nhật, hay nhầm kính ngữ nhưng rất cố gắng.
- 村長（そんちょう）: trưởng làng, hiền, thích kể chuyện ngày xưa.
Mỗi kỳ là một tình huống nhỏ trong ngày ở quán trọ hoặc trong làng, kết hơi bỏ ngỏ.
Lời thoại: ghi rõ ai nói (「…」と[言|い]いました ngay sau tên người nói); lời chào / nhờ vả phải hợp vai
(người mới đến làm nói よろしくお願いします với chủ quán, không phải ngược lại).

CHỦ ĐỀ TRUYỆN: Kinh dị nhẹ: chuyện lạ / chuyện ma trong làng (tiếng động ban đêm, bóng người bên giếng, đồ vật tự dời chỗ) gây rùng mình và tò mò; KHÔNG máu me, không bạo lực, không ai chết; lời giải có thể bất ngờ hoặc để lại một chút rợn. Người đọc cũng thích: Hài — có thể pha nhẹ, nhưng giữ Kinh dị nhẹ là chính.

ĐÃ XẢY RA: (chưa có kỳ nào, đây là kỳ 1: リンさん bắt đầu làm ở ことば屋)

DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:
jlpt:N5-01|〜は〜です / 〜じゃありません|A là B / A không phải là B
jlpt:N5-02|〜も|cũng
jlpt:N5-03|〜の|của, thuộc về
jlpt:N5-04|これ・それ・あれ・どれ|cái này / đó / kia / nào
jlpt:N5-05|〜ます / 〜ません / 〜ました / 〜ませんでした|thể lịch sự hiện tại, quá khứ
jlpt:N5-06|〜を V|tân ngữ của động từ
jlpt:N5-07|〜へ / 〜に 行きます|đi đến đâu
jlpt:N5-08|〜で（場所・手段）|ở (nơi chốn), bằng (phương tiện)
jlpt:N5-09|〜と|và, cùng với
jlpt:N5-10|〜に（時間）|vào lúc
jlpt:N5-11|〜から〜まで|từ … đến …
jlpt:N5-12|〜があります / 〜がいます|có (đồ vật / người, con vật)
jlpt:N5-13|〜ませんか|rủ rê: … không?
jlpt:N5-14|〜ましょう|nào cùng …
jlpt:N5-15|〜たいです|muốn làm
jlpt:N5-16|〜がほしいです|muốn có
jlpt:N5-17|い形容詞 / な形容詞|tính từ đuôi い / な
jlpt:N5-18|〜くて / 〜で（形容詞）|nối tính từ: … và …
jlpt:N5-19|〜が好きです / 上手です|thích / giỏi
jlpt:N5-20|〜から（理由）|vì …
jlpt:N5-21|〜てください|hãy làm …
jlpt:N5-22|〜ています（進行）|đang làm
jlpt:N5-23|〜てもいいです|làm … cũng được
jlpt:N5-24|〜てはいけません|không được làm
jlpt:N5-25|〜て、〜（順序）|làm … rồi …
jlpt:N5-26|〜ないでください|xin đừng làm
jlpt:N5-27|〜なければなりません|phải làm
jlpt:N5-28|〜なくてもいいです|không làm cũng được
jlpt:N5-29|〜たことがあります|đã từng làm
jlpt:N5-30|〜たり〜たりします|lúc thì … lúc thì …
jlpt:N5-31|〜より〜のほうが|… hơn …
jlpt:N5-32|〜の中で〜がいちばん|trong … thì … nhất
jlpt:N5-33|〜前に / 〜てから|trước khi / sau khi
jlpt:N5-34|〜でしょう|có lẽ
jlpt:N5-35|〜く / 〜になります|trở nên
jlpt:N4-01|普通形（だ・である体の会話）|thể thông thường trong hội thoại thân mật
jlpt:N4-02|〜と思います|tôi nghĩ là
jlpt:N4-03|〜と言いました|đã nói là
jlpt:N4-04|〜つもりです|định làm
jlpt:N4-05|〜予定です|dự định
jlpt:N4-06|〜ことができます / 可能形|có thể làm
jlpt:N4-07|〜ことです（趣味）|sở thích là …
jlpt:N4-08|〜とき|khi …
jlpt:N4-09|〜と（条件）|hễ … thì …
jlpt:N4-10|〜たら|nếu / sau khi … thì
jlpt:N4-11|〜ば|nếu …
jlpt:N4-12|〜なら|nếu là … thì
jlpt:N4-13|〜ても|dù … cũng
jlpt:N4-14|〜ながら|vừa … vừa …
jlpt:N4-15|〜てしまいました|lỡ / làm xong mất
jlpt:N4-16|〜ておきます|làm sẵn
jlpt:N4-17|〜てあります|đã được làm sẵn (trạng thái)
jlpt:N4-18|〜てみます|thử làm
jlpt:N4-19|〜てあげます / 〜てくれます / 〜てもらいます|làm cho / được làm cho
jlpt:N4-20|〜ようと思います（意向形）|định làm
jlpt:N4-21|〜そうです（様態）|trông có vẻ
jlpt:N4-22|〜そうです（伝聞）|nghe nói
jlpt:N4-23|〜ようです / 〜みたいです|hình như
jlpt:N4-24|〜かもしれません|có lẽ, không chừng
jlpt:N4-25|〜はずです|chắc chắn là
jlpt:N4-26|〜のに|thế mà
jlpt:N4-27|〜ので|vì … nên
jlpt:N4-28|〜し、〜し|vừa … lại vừa …
jlpt:N4-29|〜ために|để …, vì …
jlpt:N4-30|〜ように（目的）|để có thể …
jlpt:N4-31|〜ようになります|trở nên có thể
jlpt:N4-32|〜ようにしています|cố gắng làm (thói quen)
jlpt:N4-33|〜すぎます|quá …
jlpt:N4-34|〜やすい / 〜にくい|dễ / khó làm
jlpt:N4-35|〜か（間接疑問）/ 〜かどうか|có … hay không
jlpt:N4-36|受身形 〜られます|thể bị động
jlpt:N4-37|使役形 〜させます|thể sai khiến
jlpt:N4-38|〜させてください / 〜させていただけませんか|xin cho phép tôi làm
jlpt:N4-39|〜なさい|hãy làm (mệnh lệnh nhẹ)
jlpt:N4-40|お〜になります / 〜られます（尊敬）|tôn kính ngữ (hành động của người khác)
jlpt:N4-41|お〜ください|xin mời (tôn kính)
jlpt:N4-42|お〜します / ご〜します（謙譲）|khiêm nhường ngữ (hành động của mình)
jlpt:N4-43|いらっしゃる・おっしゃる・召し上がる|động từ tôn kính đặc biệt
jlpt:N4-44|まいる・申す・いただく・拝見する|động từ khiêm nhường đặc biệt
jlpt:N4-45|〜ところです|đúng lúc sắp / đang / vừa
jlpt:N4-46|〜ばかりです|vừa mới
jlpt:N4-47|〜までに|trước (hạn)
jlpt:N4-48|〜場合は|trong trường hợp
jlpt:N3-01|〜ことにします / 〜ことになりました|quyết định / được quyết định
jlpt:N3-02|〜ようにします / 〜ようにしてください|cố gắng / hãy cố gắng
jlpt:N3-03|〜わけです / 〜わけではありません|thì ra là / không hẳn là
jlpt:N3-04|〜はずがありません|không lẽ nào
jlpt:N3-05|〜ことがあります|thỉnh thoảng có khi
jlpt:N3-06|〜ばかり|toàn là
jlpt:N3-07|〜さえ|ngay cả
jlpt:N3-08|〜によって|tuỳ theo, do
jlpt:N3-09|〜について / 〜に対して|về / đối với
jlpt:N3-10|〜として|với tư cách
jlpt:N3-11|〜うちに|trong lúc còn
jlpt:N3-12|〜間に|trong khoảng
jlpt:N3-13|〜たびに|mỗi lần
jlpt:N3-14|〜ほど|đến mức
jlpt:N3-15|〜くらい / 〜ぐらい|khoảng, đến mức
jlpt:N3-16|〜らしい|có vẻ, đúng kiểu
jlpt:N3-17|〜っぽい|có vẻ, hay
jlpt:N3-18|〜ように見えます|trông như
jlpt:N3-19|〜おかげで / 〜せいで|nhờ / tại vì
jlpt:N3-20|〜ことになっています|theo quy định
jlpt:N3-21|〜ても構いません|cũng không sao
jlpt:N3-22|〜っけ|nhỉ (hỏi lại)
jlpt:N3-23|〜ところに / 〜ところへ|đúng lúc
jlpt:N3-24|〜ずに|không làm mà
jlpt:N3-25|〜ばいい|nên làm, giá mà
jlpt:N3-26|〜てほしい|muốn ai làm
jlpt:N3-27|〜させられる（使役受身）|bị bắt làm
jlpt:N3-28|〜ことはない|không cần phải
jlpt:N3-29|〜わりに|so với … thì
jlpt:N3-30|〜一方で|mặt khác
jlpt:N3-31|〜とおりに|theo như

VÍ DỤ ĐỊNH DẠNG (chỉ xem cách đánh dấu, không chép nội dung):
{"loai":"tin_lang","tieu_de":"スタックちゃん、[絵|え]を{発表|はっぴょう|発表する}","doan":["[昨日|きのう]の[夜|よる]、[村|むら]で[小|ちい]さな{発表会|はっぴょうかい|発表会}がありました。30{名|めい|〜名}の[人|ひと]が[来|き]ました。"]}
```
