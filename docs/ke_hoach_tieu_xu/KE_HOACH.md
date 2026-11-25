# Kế hoạch: chỗ tiêu xu kiểu Stardew Valley (25/11, **ảnh phác — chờ người dùng duyệt / chọn**)

Người dùng 25/11: có người chơi "sắp phá đảo", chính người dùng học gần 1 tháng đã mua nhà thứ 2 → "nghĩ các việc thêm để tiêu xu
đi bạn" → "tham khảo thêm Stardew Valley" → **"làm ảnh phác đi, tớ chưa hình dung được. làm sao mà ấn tượng và thú vị"**.

Ảnh vẽ đè lên vườn thật trong **Anki 26.9.4** (`tests/anki/mock_tieu_xu.js` + mã trong trang `tests/anki/mock_tieu_xu_page.js`;
add-on chưa đổi). Hình dùng lại đồ / khách / StackChan có sẵn của vườn; nhà văn hoá, tháp đồng hồ, thư viện, nhà kính, guồng nước,
cầu đá, bến thuyền, món ăn, hoa ép, hũ ủ, bình tưới vẽ mới bằng mã. **Mọi chi tiết (tên, giá, số) Claude chọn.**

| Ảnh | Nội dung | Giống gì ở Stardew |
|---|---|---|
| `tx_01_lang_truoc_sau.png` | Vùng mới **«Làng»** (trong ◂ cảnh ▸): lúc mở là làng bỏ hoang (nhà văn hoá dột, tháp đồng hồ hỏng, cầu gãy, thuyền chìm, nhà kính vỡ) → góp đủ thì sống lại (đèn lồng, StackChan câu cá, guồng nước quay, nhà kính đầy hoa, khách ghé) | Thị trấn Pelican được sửa dần |
| `tx_02_nha_van_hoa_goi_gop.png` | **Nhà văn hoá**: 6 phòng → 6 công trình. Mỗi gói gồm món sưu tầm / nông sản / mốc học (thuộc 100 từ, ôn 14 ngày, đọc 5 số báo) / xu. **Kho bạc** chỉ góp xu (2.500 · 5.000 · 10.000 · 25.000) → tháp đồng hồ. **Bảng việc làng** mỗi tuần (Sếu cần lúa, Bác Tanuki muốn bạn ôn 150 lượt Kanji, chị Hana cần canh miso) | Trung tâm cộng đồng + Kho bạc + Special Orders |
| `tx_03_tho_moc_tanuki.png` | **Bác Tanuki thợ mộc**: xây công trình / nâng nhà mất 1–3 **ngày có ôn**, giàn giáo hiện trên cảnh. Nâng nhà: Bếp lớn 8.000 · Hầm ủ 12.000 · Gác mái 15.000 · Hiên gỗ engawa 6.000 | Thợ mộc Robin |
| `tx_04_tang_qua_ban_be.png` | **Bạn bè**: tặng quà khách ghé vườn (2 lần / tuần / bạn), mỗi bạn thích món khác nhau. Cứ 2 tim một **thư bằng tiếng đang học** (có phiên âm, nghĩa, "Thêm vào deck") + một **cảnh tim** (Cáo và StackChan ngắm trăng ở núi lá đỏ). Tim không giảm khi vắng | Tặng quà dân làng, cảnh tim |
| `tx_05_bep_mon_nhat.png` | **Bếp**: từ lên Ra quả cho **nông sản** theo giống cây (gạo, củ cải, bí ngô, măng, anh đào). Sách công thức 12 món Nhật (おにぎり, みそしる, たこやき…; công thức mới 300–1.500 xu, có món chỉ gánh hàng bán). Sổ món ăn; StackChan ăn sáng món bạn nấu | Nấu ăn + công thức |
| `tx_06_so_ep_hoa.png` | **Sổ ép hoa**: mỗi từ đã thuộc ép được một bông (20 xu); trang sổ có từ, cách đọc, nghĩa, ngày ép; bấm nghe lại từ. Chỗ tiêu xu **lớn dần theo số từ thuộc** | Bảo tàng / bộ sưu tập |
| `tx_07_ham_u_lo_ren.png` | **Hầm ủ**: umeshu / takuan / miso chín sau N ngày có ôn, để lâu lên hạng Bạc → Vàng → Iridi (hũ 500 xu). **Lò rèn**: bình tưới Đồng 2.000 / Bạc 5.000 / Vàng 10.000 / Iridi 25.000 — chỉ đổi hình + hiệu ứng nước khi Tưới, **không thêm xu** | Thùng ủ / hầm, nâng dụng cụ ở Clint |
| `tx_08_tuong_vang_hoan_hao.png` | Đích cuối: **Tượng StackChan vàng** 500.000 xu ở quảng trường làng (sáng ban đêm) + **% Vườn hoàn hảo** (đồ, công trình, sưu tầm, món ăn, tim, hoa ép, giao diện mùa, sự kiện) | Đồng hồ vàng + chỉ số Hoàn hảo |

## Giữ luật cũ của vườn
- Không quay thưởng may rủi, không nhân đôi xu, không làm đổi lịch ôn FSRS.
- Không phạt khi vắng: tim không giảm, hũ chỉ chín chậm lại, giàn giáo đứng đó chờ.
- "Ngày có ôn" (như tủ lịch Giáng sinh) — ôn trên điện thoại cũng tính.
- Bình tưới, tượng vàng chỉ để ngắm; không che cây héo (cây héo là tín hiệu thẻ đến hạn).

## Ước tính
Nhà văn hoá cả 6 phòng ≈ 60–80 nghìn xu + đồ sưu tầm + mốc học; nâng nhà ≈ 41 nghìn; lò rèn 42 nghìn; tượng vàng 500 nghìn;
sổ ép hoa ~20 xu × số từ thuộc (người ôn nhiều ~100–200 xu / ngày); bếp / hũ ủ / quà tặng tiêu đều mỗi tuần.

## Đối chiếu với vườn hiện tại (người dùng 25/11: "những cái trên có đồng bộ với những cái hiện tại của mình không")

Khớp sẵn: hình pixel + bảng màu + khung bảng của vườn; «Làng» là một cảnh nữa trong ◂ cảnh ▸ như các vùng; món của Gói bờ biển là món
thật ở Hộp sưu tầm (`finds_core`: vỏ sò, sao biển, ốc xoắn, thuỷ tinh biển); khách (mèo, tanuki, cáo, hươu, sếu…) là khách ghé vườn có
sẵn (`guests.js`); "ngày có ôn" như tủ lịch Giáng sinh (ôn điện thoại cũng tính); mốc học đếm từ lúc mở (như chuỗi ngày từ 1.31);
StackChan nấu / ăn là việc sinh hoạt có sẵn (`life_core` `ryouri` cần bồn rửa + bếp lò, `taberu` cần bàn ăn); bình tưới đã có trong
chậu cây lúc ôn thẻ (`fx.js` `CAN`) — chỉ đổi màu; nông sản / ép hoa móc vào lúc cây lên giai đoạn (chỗ đang cộng `2 × giai đoạn` xu);
gánh hàng rong bán công thức; Tin làng báo việc mới; dữ liệu mới đi qua `backup_core` + đồng bộ như mọi khoá.

**Lệch — khi làm thật phải chỉnh:**
1. **Cỡ cảnh**: ảnh làng vẽ 320 × 96, cảnh của vườn là **256 × 76** → bớt công trình mỗi cảnh hoặc tách 2 cảnh (Làng · bờ ao, Làng ·
   quảng trường).
2. **Nhà đã có gian Bếp** (`kitchen`, đồ bồn rửa / bếp lò / nồi cơm / tủ lạnh / bàn ăn) → **bỏ "Bếp lớn 8.000 xu"**; nấu ăn dùng gian
   Bếp + đồ bếp người chơi đã đặt; ảnh bếp thật vẽ đúng gian Bếp của người chơi (không phải tranh vẽ riêng).
3. **Hộp sưu tầm là bộ sưu tập, không phải kho** (mỗi món một lần, nhặt trùng +3 xu) → gói **chỉ cần "đã nhặt"** (không lấy khỏi hộp),
   hoặc góp món nhặt trùng thay cho +3 xu. Món ở vùng chưa mua (vd. Bãi biển) → gói cho chọn món ở cảnh người chơi đã có.
4. **Sổ ép hoa dùng hoa của chính cây đó** (giống cây của từ: anh đào, hướng dương, phong, lúa…, cây gốc, giống tự vẽ) — ảnh phác vẽ
   cẩm tú cầu / bìm bìm / bồ công anh là hoa không có trong vườn. Nông sản cũng theo giống: cần thêm nông sản cho cây gốc, bonsai, phong,
   hướng dương và giống tự vẽ.
5. **Ngôn ngữ**: vườn có 7 tiếng (Ngôn ngữ trong vườn + deck Anh / Trung / Hàn / Đức / Pháp). Thư tim, tên món phải theo tiếng của
   người chơi như thư ông già Noel (`le_core.letter`), không chỉ tiếng Nhật. Thư viết sẵn cho ~15 khách × 5 thư × 6 tiếng là nhiều chữ.
6. **"Thêm vào deck"**: add-on **chưa bao giờ tự thêm thẻ** vào collection của người dùng → bỏ, hoặc chỉ "chép từ".
7. **Bảng việc làng trùng Nhiệm vụ hằng ngày** (3 nhiệm vụ + rương) → gộp thành phần "Tuần này" trong bảng Nhiệm vụ; yêu cầu kiểu "ôn
   150 lượt" có thể khiến ôn trước hạn (trái luật "không đụng FSRS") → đổi thành "ôn hết thẻ đến hạn 5 ngày trong tuần".
8. **Thú nuôi đã có độ thân** (Mới về / Quen hơi / Thân thiết / Tri kỷ theo ngày cho ăn) → tim của khách nên cùng cách gọi / cùng thang,
   tránh hai kiểu thân thiết khác nhau; "Mèo" vừa là thú nuôi vừa là khách — đặt tên khách khác (mèo hoang).
9. **Xây có thời gian chờ** chỉ cho công trình làng + gian mới; xây nhà / mua đồ hiện có vẫn ngay lập tức (không đổi cái cũ).
10. **Bảng Nhà đã 11 tab** (đang chờ người dùng chọn giữ / gộp) → đồ của Làng mở bằng nút riêng ở cảnh Làng; Sổ ép hoa, Sổ món ăn, Bạn
    bè vào Album (cạnh Khách, Sổ sinh hoạt, Hộp sưu tầm, Kỷ niệm) — không thêm tab.
11. Chị Hana là nhân vật trong truyện báo (chỉ có chữ); quyết định 1.30: không thêm nhân vật người có hình → chỉ ghi tên trên giấy dán.
12. Hầm ủ / gác mái là gian mới: phải vẽ cho cả 4 kiểu nhà (classic, minka, teahouse, castle) như hai gian hiện có.

## Câu hỏi cho người dùng
1. Thích phần nào, làm phần nào trước? Claude đề xuất bản đầu: **Làng + Nhà văn hoá (2–3 phòng đầu) + Sổ ép hoa + nông sản / Bếp**.
2. Bạn trong làng là **khách ghé vườn** (mèo, tanuki, cáo…) như ảnh, hay thêm cả nhân vật trong truyện báo (chị Hana…)?
3. Thư tim viết sẵn (máy, không tốn lượt Gemini) hay nhờ Gemini viết theo trình độ của bạn?
4. Giá có cần nặng / nhẹ hơn không?
