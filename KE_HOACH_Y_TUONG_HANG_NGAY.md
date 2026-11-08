# Ý tưởng "mỗi ngày vào vườn có gì mới" (đã chốt lộ trình 07/11)

> **Lộ trình người dùng chốt 07/11/2026** (chi tiết bản gần nhất ở `KE_HOACH_1_26.md` mục 0): **1.26** màn chào khi mở vườn (thú nuôi ra chào, lần mở đầu mỗi ngày) + hiệu ứng chuyển cảnh + ý 1 Bảng tin làng · **1.27** ý 2 cây lấp lánh, 3 rút quẻ, 4 lịch trời Nhật + 歳時記, 5 kỷ niệm & mốc học · **1.28** ý 6 nhặt đồ + Hộp sưu tầm, 7 gánh hàng rong · **1.29** Nhạc làng (chuông làng tự soạn, nhạc theo buổi) + thêm hiệu ứng. Ý 8–14 chưa chọn; radio trùng với báo nên không làm. Câu hỏi ở mục 7 hỏi lại khi làm bản tương ứng.

Ngày 06/11/2026. Chỉ là ý tưởng để người dùng chọn, **chưa sửa mã**, **không làm chung với 1.23** (1.23 đã nặng, xem `KE_HOACH_1_23.md`). Người dùng hỏi: "có thể lấy ý tưởng từ các game pixel xưa… người dùng mong mỗi ngày vào vườn được trải nghiệm gì mới… FOMO lành mạnh… đánh giá theo mức độ khó và đáng triển khai".

Mức khó:
- **Dễ**: dùng lại hệ thống có sẵn, ít hình mới (dưới khoảng 10), không đổi dữ liệu cũ.
- **Vừa**: cần khoá dữ liệu mới, 15–60 hình pixel mới, giao diện mới.
- **Khó**: nhiều hình người / động vật có chuyển động, đổi hệ thống cũ (thời tiết sang Python, thức ăn thú nuôi), hoặc tốn thêm lượt Gemini.

Mức đáng làm: **Nên làm** · **Có thể** · **Để sau** · **Không nên**.

---

## 0. Vườn đang có gì mỗi ngày

- **Việc phải làm:** báo mới mỗi sáng, lượt chép 5 câu, 3 nhiệm vụ và rương đồ hiếm, mục tiêu ngày, thú nuôi đói, nhà cũ dần mỗi tuần.
- **Thay đổi tự nhiên:**
  - thời tiết đổi mỗi 3 giờ, 6 buổi trong ngày;
  - khách ghé theo khung 4 phút (tuỳ đồ đặt, mùa, giờ, thời tiết);
  - giao diện mùa theo lịch; sao băng đêm quang; cầu vồng sau mưa.
- **Ghi lại:** nhật ký, sticker, luyện viết, Lịch hoa, ảnh vườn mỗi tuần, hiệu ứng thành tích.

Nhận xét: phần lớn là **việc phải làm**, hoặc **đổi nhỏ khó nhận ra** (khách ghé, thời tiết: không ai báo là có). Còn thiếu bốn thứ:
1. Một chỗ cho biết "hôm nay có gì".
2. Thứ để **khám phá, sưu tầm** mỗi ngày.
3. **Sự kiện có lịch** để mong chờ, ngoài giao diện mùa.
4. **Lý do ghé các vùng đã mua.** Người dùng từng thấy vùng chỉ xem được trong bảng Nhà là "phí"; 1.23 cho đổi cảnh ở màn chính, nhưng vào vùng vẫn chưa có gì để làm.

---

## 1. Luật "FOMO lành mạnh" (áp dụng cho mọi ý bên dưới)

1. **Lỡ không mất gì đã có.** Vắng chỉ là hôm đó không nhận thêm. Giống quyết định của khách ghé và thú nuôi: không phạt.
2. **Lỡ rồi sẽ quay lại.** Đồ thường quay lại trong khoảng một tháng, đồ theo mùa năm sau có lại. Không có đồ "chỉ một lần".
3. **Học là chìa khoá, không phải canh giờ.**
   - Phần lớn quà mở theo **lượt ôn hôm nay**. Lượt ôn trên điện thoại cũng tính (đếm từ revlog như bù xu).
   - Không bắt mở vườn đúng giờ nào. Cảnh ban đêm chỉ để ngắm, đêm nào cũng có.
4. **Không thêm chuỗi ngày mới** (giữ quyết định "không có chuỗi ngày đọc báo"). Không đếm ngược, không chữ đỏ "sắp hết", không thông báo ngoài vườn.
5. **Xu thêm ít**, tổng tối đa khoảng 20 xu một ngày. Hiện làm đủ việc được khoảng 170–190 xu một ngày (PHAT_TRIEN mục 6). Đồ chỉ có ở sự kiện đều là đồ trang trí.
6. **Biết trước:** Bảng tin và Lịch hoa ("Sắp tới") ghi sự kiện sắp tới, để người dùng mong chờ thay vì lo.
7. **Tắt được:** ⚙ → Giao diện → "Sự kiện làng", theo từng chế độ như thú nuôi và khách.
8. **Không đụng FSRS:** không khuyến khích ôn sớm thẻ chưa đến hạn. Thưởng theo lượt ôn thì tính **cả khi bấm Lại**, để không ai bấm "Được" cho có.

---

## 2. Bảng ý tưởng

| # | Ý tưởng | Lấy cảm hứng từ | Mỗi ngày có gì mới | Khó | Đáng làm |
|---|---|---|---|---|---|
| 1 | **Bảng tin làng** | TV / loa sáng của game nông trại cổ | Một dòng "hôm nay ở làng có gì" | Dễ | **Nên làm** (nền cho mọi ý khác) |
| 2 | **Cây lấp lánh** | Ô "may mắn" trong game nông trại | 3 cây cần tưới hôm nay phát sáng | Dễ | **Nên làm** |
| 3 | **Rút quẻ omikuji** | Thầy bói / vận may mỗi ngày | Một quẻ, một từ may mắn, gợi ý khách | Dễ | **Nên làm** |
| 4 | **Lịch trời Nhật**: 二十四節気, trăng thật, mưa sao băng, sổ 歳時記 | Lễ hội theo lịch của game nông trại | Trăng đổi mỗi đêm, tiết khí mỗi khoảng 15 ngày, sao băng vài lần một năm | Dễ → Vừa | **Nên làm** |
| 5 | **Kỷ niệm và mốc học** | Sinh nhật nhân vật trong game cổ | Ngày đặc biệt của riêng người dùng | Dễ | **Nên làm** |
| 6 | **Nhặt đồ theo vùng + Hộp sưu tầm** | Đào hoá thạch, nhặt vỏ sò, chỗ đào lấp lánh | Mỗi 10 lượt ôn mở một chỗ lấp lánh ở sân hoặc một vùng | Vừa | **Nên làm** (đáng nhất về lâu dài) |
| 7 | **Gánh hàng rong** | Người bán hàng rong ghé làng | 2 phiên một tuần, hàng mỗi phiên khác nhau | Vừa | **Nên làm** (chỗ tiêu xu khi đã mua hết) |
| 8 | Bóng bay quà | Bóng bay quà bay ngang trời | Một bóng một ngày khi đang ở màn chính | Dễ | Có thể |
| 9 | Thẻ đóng dấu tháng (kiểu ラジオ体操) | Thẻ đóng dấu nghỉ hè của trẻ em Nhật | Mỗi ngày đạt mục tiêu được một dấu, không cần liền | Dễ | Có thể (chồng Lịch hoa) |
| 10 | Hái quả từ cây Ra quả | Cây ăn quả cho quả mỗi ngày | Tối đa 3 quả một ngày từ cây đã thuộc lâu | Vừa | Có thể |
| 11 | Hiện tượng hiếm theo thời tiết (狐の嫁入り, 初雪, 朝霧) | Thời tiết hiếm của game cổ | Thỉnh thoảng có cảnh lạ, ghi vào 歳時記 | Vừa | Có thể |
| 12 | Nhân vật trong truyện ghé vườn | Dân làng ghé chơi theo thứ trong tuần | Lin / はなさん / 村長 ghé, nói một câu ví dụ của từ bạn đang học | Khó | Có thể (sau khi truyện 1.23 ổn) |
| 13 | Thư trong chai ở Bãi biển | Thư trôi dạt vào bờ | Thỉnh thoảng có thư, trả lời bằng Luyện viết | Vừa → Khó | Để sau |
| 14 | Nấu ăn ở Bếp (nhà 3 gian 1.23) | Nấu ăn trong game nông trại | Nấu quả hái được thành món theo mùa | Khó | Để sau |

Ví dụ một ngày khi có đợt 1 và đợt 2. Thứ bảy 07/11/2026 là 立冬 (Lập đông, khoảng 7/11):
- Mở vườn, Bảng tin ghi: "立冬 · Lập đông — 3 cây lấp lánh — Mai (Chủ nhật) gánh hàng ghé Ga".
- Ôn 10 thẻ: hiện một chỗ lấp lánh ở Bãi biển. Bấm nhặt được 貝殻 (かいがら, vỏ sò), bộ Bãi biển 4/6.
- Ghé Đền rút quẻ:
  - 中吉;
  - 学問「こつこつ続ければ実る」;
  - 待ち人「水のそばに来る」 (gợi ý: hôm nay cò ghé mép ao);
  - từ may mắn: 予約.
- Đêm: trăng lưỡi liềm cuối tháng, đúng pha trăng thật (trăng non 9/11). Lịch hoa ghi "Sắp tới: 17/11 mưa sao băng Sư Tử".

---

## 3. Chi tiết từng ý

### 3.1 Bảng tin làng · Dễ · Nên làm
- **Ở đâu:** một dòng trong thẻ "Hôm nay" (như dòng "Báo mới"), chỉ hiện khi hôm nay có sự kiện. Ví dụ: "立冬 · Gánh hàng ghé Ga · 3 cây lấp lánh ▸". Bấm vào mở bảng nhỏ liệt kê việc hôm nay và "Sắp tới" (7 ngày).
- **Không dùng emoji** (quy tắc dự án): icon pixel 8×8 trong `web/icons.js`.
- **Radio trong phòng** (món đã có từ 1.7): bấm thì đọc bảng tin bằng tiếng Nhật đơn giản kèm dòng dịch. Phần này tuỳ chọn.
- **Báo Gemini:** thêm sự kiện hôm nay vào lời nhắc ("Hôm nay là 立冬, gánh hàng ghé làng") để Tin làng nhắc tới. Một dòng trong lời nhắc, không tốn thêm lượt gọi.
- **Lịch hoa:** dải "Sắp tới" thêm sự kiện. Khung ngày ghi "Đã nhặt …, quẻ …".

### 3.2 Cây lấp lánh · Dễ · Nên làm
- **Chọn cây:** mỗi ngày Anki chọn 3 cây trong số **thẻ đến hạn hôm nay** của deck đang xem, ưu tiên cây khát lâu nhất. Chọn cố định theo ngày bằng hàm băm (ngày + id thẻ) nên mở lại vẫn là 3 cây đó. Đổi deck thì 3 cây khác, nhưng trần chung 3 lần một ngày.
- **Trên ruộng:** cây có ánh vàng nhấp nháy. Bấm cây thì thẻ thông tin ghi "Tưới cây này hôm nay để nhận giọt sương vàng".
- **Thưởng:** ôn thẻ đó hôm nay, **bấm gì cũng được, cả Lại**, nhận 3 xu và hiệu ứng giọt sương vàng. Ôn ở màn ôn thường hay trên điện thoại cũng tính: xét revlog khi bù xu.
- **Vì sao hợp:** không tạo thêm việc (vốn là thẻ phải ôn), nhắc tưới cây khát lâu, mỗi ngày nhìn ruộng có cái mới.

### 3.3 Rút quẻ omikuji · Dễ · Nên làm
- **Ở đâu:** đã mở Đền trên núi thì ở hộp quẻ cạnh torii (có hoạt cảnh lắc ống quẻ); chưa mở thì từ Bảng tin.
- **Cố định:** một quẻ mỗi ngày, theo hàm băm của collection + ngày, nên mở lại không đổi quẻ.
- **Mức quẻ:** 大吉 · 吉 · 中吉 · 小吉 · 末吉. Có 凶 hay không thì hỏi người dùng (mục 6). Nếu có thì rất hiếm, StackChan buộc quẻ lên cây như ở đền thật.
- **Nội dung (tiếng Nhật N5–N4, có furigana, kèm dòng dịch):**
  - 学問 (học hành): một câu động viên;
  - 待ち人: **gợi ý khách** hôm nay (máy biết khách nào có thể ghé, theo `guest_core.weight`);
  - 失せ物: gợi ý **vùng có chỗ lấp lánh** (khi có ý 6);
  - **Từ may mắn:** một từ đến hạn hôm nay. Bấm vào ra thẻ thông tin như bấm cây.
- **Hiệu ứng:** gần như chỉ để vui. Có thể cho 大吉 làm khách ghé thường hơn một chút trong ngày, không cho xu.
- **Công sức chính:** soạn kho câu, khoảng 10 câu cho mỗi mục × mức quẻ. Soạn một lần, người dùng duyệt.

### 3.4 Lịch trời Nhật + sổ 歳時記 · Dễ (phần lịch) → Vừa (phần hình) · Nên làm
- **Trăng thật:**
  - tính pha trăng từ ngày thật (công thức chu kỳ 29,53 ngày, sai dưới nửa ngày);
  - đêm nào trăng cũng khác đêm trước;
  - đêm tròn ghi 満月, có 三日月, 十三夜;
  - giao diện Trung thu và Halloween đang vẽ trăng tròn thì giữ nguyên.
- **二十四節気:**
  - 24 tiết khí, mỗi tiết khoảng 15 ngày, dùng bảng ngày tra sẵn cho 2026–2036 (không tự tính thiên văn);
  - ngày đổi tiết: Bảng tin ghi tên Nhật + cách đọc + tên Việt (立冬 りっとう · Lập đông), StackChan chào một câu;
  - một số tiết có chi tiết nhỏ: 冬至 thả quả yuzu ở suối nước nóng / bồn tắm, 立春 có chim vành khuyên.
- **Mưa sao băng:** Quadrantids 3/1, Lyrids 22/4, Perseids 12/8, Orionids 21/10, Leonids 17/11, Geminids 14/12. Ngày cố định, lệch một ngày cũng không sao. Đêm đó sao băng dày hơn hẳn; bấm một ngôi sao thì ghi "đã ước" vào sổ.
- **Sổ 歳時記:** sổ từ mùa, tab nhỏ trong Album hoặc Lịch hoa. Mỗi tiết khí, tên trăng, mưa sao băng mà người dùng **đã thấy khi mở vườn** thành một trang: chữ Nhật, cách đọc, nghĩa, ngày thấy. Là bộ sưu tập học được từ vựng mùa và không cho xu.
  - Hình 歳時記 chỉ là trang trí và không cho xu, nên JS báo "đã thấy" là được, không cần Python xét lại.

### 3.5 Kỷ niệm và mốc học · Dễ · Nên làm
- **Mốc:**
  - một năm làm vườn, tính từ lượt ôn đầu tiên;
  - 100 / 365 ngày có ôn, **không cần liền**;
  - 1.000 / 10.000 / 50.000 lượt ôn;
  - 100 / 500 / 1.000 cây Ra quả;
  - sinh nhật người dùng: tuỳ chọn, nhập ở ⚙, lưu trong collection.
- **Ngày đó:**
  - bánh trên bàn trong phòng, StackChan đội mũ tiệc, dải chúc;
  - tặng một món kỷ niệm có ghi ngày (khung ảnh, cúp nhỏ) để bày trong nhà, đúng hướng "thành quả của việc học" người dùng chốt ở 1.20;
  - bìa cuốn nhật ký ghi mốc của tháng.
- Dùng lại khung hiệu ứng thành tích (mục 2.6d). Mốc chuỗi ngày đã có, không làm lại.

### 3.6 Nhặt đồ theo vùng + Hộp sưu tầm · Vừa · Nên làm
- **Chỗ lấp lánh:**
  - mỗi **10 lượt ôn hôm nay** mở một chỗ, tối đa 3 một ngày (30 lượt = mục tiêu ngày mặc định);
  - chỗ hiện ở sân hoặc một vùng đã mua, ưu tiên vùng lâu chưa ghé;
  - đến hết ngày Anki thì mất, không dồn sang hôm sau.
- **Đồ theo cảnh:** mỗi cảnh khoảng 6 món, cả thảy khoảng 42 món, mỗi món có tên Nhật + cách đọc + nghĩa (học thêm từ). Ví dụ:
  - Sân: hạt giống lạ, đá cuội, lông chim;
  - Bãi biển: 貝殻, ヒトデ, ガラスの欠片;
  - Đền: 紅葉の押し葉, お守り, 鈴;
  - Rừng tre: 竹の子 (chỉ mùa xuân), てんとう虫;
  - Suối nước nóng: 温泉卵, 湯の花;
  - Ga: 古い切符, 切手;
  - Phố lễ hội: ヨーヨー, うちわ;
  - đồ theo mùa (蛍の瓶 mùa hè, 落ち葉 mùa thu) năm sau có lại.
- **Hộp sưu tầm:**
  - tab trong Album (hoặc đổi tên "Album khách" thành "Album" có hai phần);
  - đủ một bộ thì tặng một món trang trí, ví dụ bộ Bãi biển được chuông gió vỏ sò;
  - một món "Tủ kính" trong phòng bày đồ đã nhặt.
- **Bảo hiểm:** món chưa có được ưu tiên. Trùng thì đổi 3 xu, để không ai phải cày.
- **Giải quyết "vùng phí":** có lý do ghé vùng mỗi ngày, cũng là lý do mua vùng (chỗ tiêu xu). Chỗ lấp lánh hiện cả ở màn chính (nút ◂ ▸) và màn Ngắm cảnh của 1.23.
- **Chỗ đặt:** tránh đồ và mép phải sân (thẻ "Hôm nay"), dùng lại cách khách tránh ô có đồ (1.21).

### 3.7 Gánh hàng rong · Vừa · Nên làm
- **Lịch:** phiên cố định **thứ Tư và Chủ nhật** để biết trước, như chợ phiên. Hàng mỗi phiên chọn theo hàm băm của **ngày**, không theo collection, nên mọi người cùng thấy một phiên hàng và cộng đồng Facebook bàn được ("phiên này có X") mà không cần máy chủ.
- **Ở đâu:** đã mở Ga làng quê thì người bán xuống tàu ở Ga, chưa mở thì đứng ở cổng sân. Bảng tin ghi phiên hôm nay và phiên sau.
- **Hàng:**
  - một món **chỉ có ở gánh hàng**: kho khoảng 16–24 món, mỗi món quay lại trong khoảng 8 phiên (4 tuần);
  - hai món cửa hàng giảm 25%;
  - một giống cây hoặc đồ theo mùa.
- **Mua:** qua Python như cửa hàng (so giá, trừ xu). Đây là chỗ tiêu xu cho người đã mua hết (khoảng 30.000 xu).

### 3.8 – 3.14 (Có thể / Để sau), ghi ngắn
- **Bóng bay quà (Dễ):**
  - một bóng một ngày, hiện lúc ngẫu nhiên khi ở màn chính ít nhất 2 phút, không hiện khi đang ôn;
  - bay khoảng 30 giây; bấm được 10 xu hoặc một sticker nhật ký mới (hiện chỉ có 8 sticker);
  - chế độ "Dịu mắt" thì tắt.
  - Rủi ro: làm phân tâm.
- **Thẻ đóng dấu tháng (Dễ):**
  - mỗi ngày đạt mục tiêu được một dấu, không cần liền; 10 / 20 / đủ tháng có quà nhỏ;
  - mỗi tháng một thẻ có hình mùa; cuốn nhật ký có trang thẻ dấu.
  - Chồng với Lịch hoa (cây nở theo ngày đạt mục tiêu) và mở giao diện mùa bằng chuỗi → nên gộp vào Lịch hoa thay vì làm bảng mới.
- **Hái quả (Vừa):**
  - mỗi ngày tối đa 3 cây Ra quả có quả; loại quả theo giống cây;
  - bấm hái được một quả, dùng cho thú ăn thay xu hoặc bán 2 xu;
  - đúng nghĩa đen của "thành quả học".
  - Phải sửa luồng thức ăn của thú nuôi (`kotoba_batake_more`).
- **Hiện tượng hiếm theo thời tiết (Vừa):**
  - 狐の嫁入り: mưa bóng mây, đoàn đèn cáo đi qua Đền;
  - 初雪: tuyết đầu mùa, lần đầu có tuyết trong mùa;
  - 朝霧: sương sớm; 木枯らし1号: gió lạnh đầu đông, lá bay ngang; cầu vồng đôi;
  - tất cả ghi vào 歳時記.
  - Cần thêm kiểu thời tiết và hình. Không cho xu nên JS tự báo được. Nếu muốn cho quà thì phải chuyển hàm thời tiết sang Python: việc đã ghi từ 1.14, chưa làm.
- **Nhân vật trong truyện ghé vườn (Khó):**
  - Lin, はなさん, 村長 ghé theo ngày cố định trong tuần;
  - bấm thì nói **một câu ví dụ của từ bạn đang học**, lấy từ deck, có audio + dịch, không gọi Gemini;
  - mỗi tuần một món quà nhỏ.
  - Cần vẽ 3 nhân vật người, mỗi nhân vật 3–4 khung, và khớp nhân vật của truyện 1.23. Truyện tiếng Anh có bộ nhân vật khác (Linh, Mr. Oakley, Ben).
- **Thư trong chai (Vừa → Khó):**
  - thư soạn sẵn theo mẫu, có từ của người dùng; trả lời bằng Luyện viết.
  - Trùng nhiều với Luyện viết và ý "Bạn qua thư" (PHAT_TRIEN 10.1); dùng Gemini thì tốn lượt.
- **Nấu ăn ở Bếp (Khó):** chỉ làm sau nhà 3 gian (1.23) và Hái quả. Quả thành món theo mùa (おでん mùa đông, かき氷 mùa hè) để bày bàn hoặc làm sticker nhật ký.

---

## 4. Không nên làm (và vì sao)

| Ý | Vì sao không |
|---|---|
| Câu cá / bắt côn trùng thành **trò chơi mới** | Trái hướng người dùng chốt ở 1.20 ("trò chơi và luyện thẻ là đủ"). Cá và côn trùng có thể là **đồ sưu tầm** ở ý 6. |
| Máy gacha quay bằng xu | Dễ thành cờ bạc nhỏ, làm lệch kinh tế xu. Rương nhiệm vụ đã có đồ hiếm. |
| Nhân đôi xu theo ngày / "giờ vàng" | Khiến dồn ôn vào một ngày, trong khi ôn đều mỗi ngày mới tốt cho trí nhớ. |
| Điểm danh liên tục 7 ngày (đứt là về 0) | Thêm áp lực chuỗi, trái quyết định "không thêm chuỗi". Nếu muốn thì dùng thẻ dấu không cần liền (ý 9). |
| Bảng xếp hạng / sự kiện chung online | Add-on không gửi gì lên mạng (quyết định đã chốt). Thay bằng "mọi người cùng thấy một phiên hàng" (ý 7). |
| Đồ chỉ có một lần, đếm ngược, thông báo ngoài Anki | FOMO xấu: lo lắng thay vì mong chờ. |

---

## 5. Gợi ý thứ tự

- **Đợt 1 (bản sau 1.23, nhẹ, gần như toàn Dễ): ý 1, 2, 3, 4 (trăng, tiết khí, sao băng, 歳時記), 5.**
  - Mỗi ngày có ít nhất: bảng tin, quẻ, 3 cây lấp lánh, trăng khác đêm trước.
  - Khoảng 15 ngày có một tiết khí; vài tháng có một đêm sao băng.
  - Hình mới ít: hộp quẻ, pha trăng, bánh / cúp kỷ niệm, icon bảng tin.
- **Đợt 2: ý 6 (nhặt đồ + Hộp sưu tầm) và 7 (gánh hàng).** Cần vẽ khoảng 42 món sưu tầm, 16–24 món gánh hàng và người bán. Nên làm sau 1.23 vì cần đổi cảnh ở màn chính và màn Ngắm cảnh.
- **Sau đó:** 8 – 14 tuỳ người dùng thấy đợt 1 – 2 thế nào.

---

## 6. Ảnh hưởng chung nếu làm (đọc trước khi sửa mã)

- **Mã mới:**
  - `event_core.py` thuần Python: chọn sự kiện theo ngày Anki, tính pha trăng, tra tiết khí, chọn cây lấp lánh / quẻ / hàng. Có test offline bằng ngày giả, nhiều năm, ngày đổi giờ 4h.
  - `web/events.js` vẽ.
  - Python là nguồn sự thật cho mọi thứ có xu hoặc đồ.
- **Dữ liệu:**
  - khoá collection mới `kotoba_batake_events` (đồng bộ AnkiWeb): ghi theo ngày (đã nhặt, đã mua, đã rút quẻ), giữ 14 ngày như sổ bù xu, cộng với Hộp sưu tầm và sổ 歳時記;
  - hai máy nhận cùng ngày thì gộp kiểu hợp, không trả quà hai lần.
- **Bản cũ ở máy khác:**
  - bản cũ **xoá id lạ trong ví** khi lưu (`garden_core.py` dòng 289). Đồ mới (gánh hàng, quà bộ sưu tầm, kỷ niệm) phải lưu ở tầng bản cũ giữ hộ, như đồ hiếm 1.16 ở `kotoba_batake_season`;
  - phải chạy mã 1.22 / 1.23 thật để kiểm tra như đã làm ở 1.16 và 1.22.
- **Lượt ôn ngoài vườn:** cây lấp lánh và chỗ lấp lánh đếm theo revlog (điện thoại, màn ôn thường), dùng chung đường với bù xu (`mobile_coins`).
- **Thời tiết đang chỉ ở JS** (`sky.js`). Ý nào cho quà theo thời tiết (măng sau mưa, 狐の嫁入り) phải chuyển hàm thời tiết và độ nghiêng của giao diện mùa sang Python. Ý không cho quà thì JS báo được.
- **Chỗ đặt:** chỗ lấp lánh, gánh hàng, bóng bay tránh đồ, khách, thú nuôi và thẻ "Hôm nay". Phải hiện đúng ở dải cảnh màn chính, Ngắm cảnh (1.23) và ảnh chụp vườn.
- **Giao diện:**
  - dòng Bảng tin làm thẻ "Hôm nay" có thêm một dòng → kiểm tra lại sân thấp (cửa sổ dưới 860 px, 1.22.1 đã từng cắt dòng);
  - chế độ "Tập trung khi ôn" và "Dịu mắt" phải tắt bóng bay và lấp lánh nhấp nháy.
- **Kinh tế xu:**
  - thêm tối đa khoảng 20 xu một ngày (cây lấp lánh 9, bóng bay 10, đồ trùng 3);
  - gánh hàng là chỗ tiêu;
  - cập nhật bảng xu ở PHAT_TRIEN mục 6 và bản test nhiều xu (1.23 mục 5).
- **Gian lận:** chỉnh đồng hồ máy để xem trước hoặc nhận lại. Giống xu (1.23 mục 5): không chặn được hết, không đáng chặn. Python ghi đã nhận theo ngày nên mở lại không nhận lại.
- **Báo:** sự kiện vào lời nhắc Gemini chỉ là một dòng, không thêm lượt gọi. Bộ Claude Code (kotoba_daily) đọc sự kiện qua `tien_do.json` nếu muốn, vì add-on không ghi vào thư mục đó ngoài file này.
- **Test:**
  - thêm test offline cho `event_core.py`;
  - e2e trong Anki thật: Bảng tin, quẻ, cây lấp lánh khi ôn trong vườn / màn thường / bù điện thoại, nhặt đồ ở vùng, mua ở gánh hàng;
  - `audit_full.js` mua mọi món gánh hàng;
  - chạy trên 23.10 và 26.9.4.

---

## 7. Câu hỏi cho người dùng (khi chọn làm)

1. Chọn những ý nào? Đề xuất: đợt 1 = 1, 2, 3, 4, 5; đợt 2 = 6, 7.
2. Quẻ có 凶 không (có thì rất hiếm, buộc lên cây)?
3. Gánh hàng ghé thứ Tư + Chủ nhật được không, hay muốn ngày khác?
4. Chỗ lấp lánh mở theo **lượt ôn** (mỗi 10 lượt) hay theo **mục tiêu ngày** (đạt mục tiêu mới có)?
5. Có cho nhập sinh nhật không?
6. Bộ sưu tầm nên có tên Nhật + cách đọc + nghĩa (học thêm từ), hay chỉ tên Việt cho nhẹ?
