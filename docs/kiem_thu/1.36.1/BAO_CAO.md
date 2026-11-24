# Báo cáo 1.36.1 — thiệp Giáng sinh + điều ước, ông già Noel tối 24, thư sáng 25, cất đồ 1/1, Kỷ niệm (24/11 tối)

Người dùng (24/11): **"triển khai nốt 1.36 đi"** → làm phần **1.36.1** của bản gộp chốt 23/11 (`docs/ke_hoach_1_36/KE_HOACH.md`):
xưởng thiệp + điều ước + PNG / mã, đêm 24 (ông già Noel, Silent Night), sáng 25 (thư viết sẵn, bánh quy còn vụn), cất đồ 1/1,
Kỷ niệm Giáng sinh 2026 ở Album, và phần "nếu kịp": **nhận thiệp của bạn bằng mã**. 1.36.0 (tủ lịch 24 ngăn…) xem
`docs/kiem_thu/1.36/BAO_CAO.md`. **Mọi chi tiết hình / chữ / cách bày Claude chọn — người dùng chưa xem.**

Phát hành: gói `kotoba_batake.ankiaddon` đã là **1.36.1** (gồm cả 1.36.0) — có thể phát hành một lần ~30/11 – 2/12.

## 1. Đã làm

### Thiệp Giáng sinh (`web/le_card.js`, `le_core.py`)
- Vào từ: bảng tủ lịch → **"Làm thiệp điều ước ▸"**, dòng "treo thiệp trước 18:00" / "làm thiệp" ở thẻ Hôm nay, Album → Kỷ niệm.
- **3 thiệp**, mỗi thiệp 120 × 80 điểm ảnh: **4 khung** (Đèn nháy, Tuyết trắng, Cành thông, Giấy quà); **sticker** là hình có sẵn
  của vườn — 6 hình (cây thông Noel, hộp quà, người tuyết, **StackChan đội mũ Noel**, vòng hoa, xe tuần lộc), tab "Tủ lịch" (món
  đã mở: tủ lịch, cây thông nhỏ, tất, người tuyết, bánh kem… — quà trong hộp có sau khi mở hộp), tab "Đồ của bạn" (đồ có hình sẵn
  bạn đang có; đồ tự làm ở Xưởng không dùng được vì bạn bè không có hình đó). Bấm để thêm, **kéo trên thiệp để dời**, Lật / To – nhỏ
  (hình nhỏ ≤ 24 điểm) / Lên trên / Bỏ, phím mũi tên dời từng điểm (Shift: 4 điểm), Delete để bỏ; tối đa 12 sticker.
- **Lời chúc** 2 dòng (28 ký tự / dòng; dòng 2 ở góc dưới phải — ký tên) + **câu chúc 7 tiếng** bấm là thêm (tiếng của deck đang xem
  lên đầu): メリークリスマス · Giáng sinh an lành · Merry Christmas · 圣诞快乐 · 메리 크리스마스 · Frohe Weihnachten · Joyeux Noël.
- **Mặt sau "Điều ước"** (160 ký tự): chọn viết bằng tiếng Việt hoặc 6 tiếng của vườn. Tiếng nước ngoài có **"Nhờ Gemini sửa"** — một
  lượt khi bấm (Flash-Lite như Luyện viết, dùng chung lời nhắc + cách kiểm), tối đa 5 lần / ngày; bản sửa hiện ngay dưới ô (câu đã
  sửa, lỗi, nhận xét) + nút "Dùng bản sửa".
- **Tự lưu** ~0,8 giây sau mỗi lần sửa, đóng bảng là lưu nốt. Không tốn xu.
- **Treo lên cây cho ông già Noel** (mỗi lúc một thiệp, đổi / gỡ được) tới **18:00 ngày 24 (giờ máy)** — thiệp nhỏ treo trên cây
  thông ở sân. Lúc 18:00 thiệp đang treo là thiệp **ông già Noel mang đi**: từ đó chỉ xem / lưu ảnh / chép mã (không sửa, không xoá).
  Hai thiệp kia sửa được tới hết 31/12; sau đó chỉ xem.
- **Lưu ảnh PNG** 480 × 320, chữ **ことば畑** nhỏ ở góc dưới trái (hỏi chỗ lưu như chụp ảnh vườn).
- **Chép mã thiệp** `KBC1:…` (vào bộ nhớ tạm + hiện ô chọn sẵn để chép tay): chỉ có hình + chữ mặt trước — **không có điều ước**,
  không có gì về deck.

### Ông già Noel (`web/le_noel.js`)
- **Tối 24** — lần đầu mở vườn trong ngày Anki 24 từ 18:00 (giờ máy): cảnh ~13 giây vẽ trên **chính sân vườn của bạn** (nhà, cây,
  đèn, đồ, thú nuôi như thật; trời đêm có tuyết **tạm thời** — không đổi cài đặt trời; **Silent Night** nếu nhạc đang bật): xe tuần
  lộc bay tới đáp cạnh cây thông → ông xuống xe, tới cây **lấy thiệp đang treo** (không treo thiệp thì ông để thư dưới gốc) → vẫy
  **StackChan đội mũ Noel** đứng ở cửa → lên xe bay đi để lại vệt sao. Nút **Bỏ qua** → khung cuối + **Xem lại** / **Đóng**; Esc
  như Bỏ qua rồi Đóng. Không mở vườn tối 24 thì không mất gì (xem dưới).
- **Sáng 25** — lần đầu mở vườn ngày Anki 25 – 31/12: **thư của ông già Noel** tự mở: phong bì, lời chào + ký tên **theo Ngôn ngữ
  trong vườn** (Gửi cháu yêu · メリークリスマス！ · Merry Christmas! · …), thân thư tiếng Việt viết sẵn (không gọi Gemini): ông thấy
  gì trong vườn (≤ 3 thứ: ngôi sao / cây sáng đèn, dây đèn võng / đèn lối đi, vòng hoa cửa, người tuyết; nhắc tuần lộc đèn), cảm ơn
  bánh quy + sữa (nếu bày bàn bánh quy), đã đọc điều ước (khen nếu viết tiếng nước ngoài) + **trích điều ước** + hình thiệp, chưa
  treo thiệp thì "năm sau treo một tấm cho ông nhé", số ngăn tủ lịch đã mở, hộp quà còn dưới gốc. Nút **Xem lại đêm qua ▸**,
  **Mở hộp quà ▸**. Thư "chụp" lại thứ ông thấy lúc ông ghé — dọn đồ sau đó thư không đổi.
- **Bàn bánh quy** chỉ còn vụn + cốc sữa cạn + tờ giấy cảm ơn từ lúc ông ghé tới lúc cất đồ. Thư nằm dưới gốc cây (hình phong bì) tới
  lúc đọc.
- Tối 24 (18:00 – nửa đêm) nhạc vườn đang là "Nhạc vườn Noel" / "Đổi bài mỗi ngày" thì phát Silent Night.

### Cất đồ 1/1
- Lần đầu mở vườn từ ngày Anki 1/1/2027 (Sự kiện mùa Bật): cảnh ngắn StackChan đội mũ Noel + thùng đồ Noel, danh sách đã cất:
  **tuần lộc đèn, bàn bánh quy, bánh kem** đang bày → Kho đồ (vẫn của bạn, bày lại được); gian đang dùng **tường / sàn Noel → mẫu
  dùng trước đó** (vườn nhớ lúc bạn đổi sang mẫu Noel; không nhớ được / mẫu cũ không còn → theo kiểu nhà). Áo nhà, đèn sân, cây thông
  đã về như cũ từ 1/1 (1.36.0). **Ở lại**: cây thông, người tuyết, tủ lịch, tất, cây thông nhỏ, đèn ngủ, quả cầu tuyết, gấu bông, đèn
  lồng. Một lần (máy khác đã cất thì thôi).

### Album → Kỷ niệm
- Chip **Kỷ niệm** (khi đã dùng sự kiện): **Giáng sinh 2026** — tủ lịch nhỏ 24 ngăn (rê chuột: ngăn nào mở ngày nào), Mở tủ lịch ▸,
  Thư của ông già Noel ▸, Xem lại đêm 24 ▸, Đồ Noel đã cất ▸; **Thiệp của bạn** (Sửa / Xem, Lưu ảnh, Chép mã); **Thiệp bạn gửi**:
  dán mã `KBC1:…` → **Xem thiệp** → **Giữ vào Album** (tối đa 12; Lưu ảnh, Chép mã, Xoá).

### Admin xem thử (⚙ → Xem thử sự kiện, cần file `user_files/admin`)
Thêm **24/12 tối · ông già Noel**, **25/12 · thư**, **1/1 · cất đồ**. Thiệp thật được chép vào sổ giả (thư trích đúng điều ước của
bạn); làm / treo thiệp khi xem thử chỉ ở bộ nhớ; cất đồ chỉ hiện "Xem thử — không cất thật".

## 2. Các kiểu người dùng / trường hợp — đã xử lý

| Trường hợp | Xử lý |
|---|---|
| Không làm thiệp / không treo | Tối 24 ông vẫn ghé, để thư; thư nhắc "năm sau treo một tấm" |
| Treo rồi đổi ý | Đổi / gỡ tới 17:59 ngày 24; từ 18:00 khoá (Python xét giờ máy, không tin trang) |
| Không mở vườn tối 24 | Mở lần đầu ngày 25 – 31 → thư trước, cảnh xem bằng "Xem lại đêm qua" |
| Mở lần đầu từ 1/1 | Không tự mở cảnh / thư; cất đồ; thư + xem lại ở Album → Kỷ niệm |
| Ôn trên điện thoại, mở vườn máy tính muộn | Như trên — cảnh / thư theo lần mở vườn đầu tiên |
| Anki qua 4h sáng (ngày Anki 24 lúc 1–3 giờ sáng 25) | Vẫn là "tối 24" → cảnh đêm |
| Hai máy tính cùng làm thiệp / treo thiệp | Từng thiệp lấy lần sửa sau (xoá cũng là một lần sửa); thiệp treo lấy lần chọn sau; đã xem / đã đọc / đã cất ở máy nào cũng tính |
| Lưu hai lần trong cùng một giây, đồng hồ máy lùi | Lần sửa mới luôn có dấu thời gian sau lần trước (lỗi thật tìm được khi thử trong Anki — đã sửa) |
| Máy kia còn 1.36.0 | 1.36.0 mở ngăn / ghi sổ vẫn giữ nguyên thiệp, thiệp nhận, ông già Noel, cất đồ (test bằng mã 1.36.0 thật) |
| Máy kia còn 1.31.3 – 1.35 | Không đọc khoá `kotoba_batake_le`; hạ bản rồi lên lại thiệp còn nguyên (Anki thật) |
| Sự kiện mùa Tắt | Không cảnh, không thư, không cất đồ, xưởng thiệp không mở; Bật lại (vd. giữa tháng 1) → cất đồ lúc đó |
| Chưa có cây thông ở sân | Xe đáp giữa sân, ông để thư trong sân |
| Nhà chưa xây / sân kín / cây ở hàng sau / sát mép | Xe đáp trong sân, không đè nhà (7 kiểu sân đã thử) |
| Ngôn ngữ trong vườn tiếng Anh / Nhật / Trung / Hàn / Đức / Pháp / chỉ tiếng Việt | Lời chào + ký tên thư theo tiếng đó |
| Điều ước tiếng Việt | Không có nút Nhờ Gemini sửa |
| Chưa có khoá Gemini / hết lượt / mất mạng | Câu báo ngắn, không gắn bản sửa, không tính lượt |
| Gemini trả về khi điều ước đã đổi | Bỏ kết quả, báo "bấm lại" |
| Đang đồng bộ AnkiWeb | Lệnh bị chặn (câu "Anki đang đồng bộ…"), thiệp vẫn trong trang; lần lưu không được trả lời thì 6 giây sau tự gửi lại |
| Đọc collection lỗi | Không ghi gì, báo "chưa đọc được dữ liệu sự kiện" |
| Dán mã hỏng / thiếu / mã khác (KB1) | "Mã thiệp không đúng…"; mã nén bom / quá dài cũng bị từ chối |
| Dán mã có xuống dòng / khoảng trắng | Vẫn đọc được |
| Thiệp đã có trong Album | "Thiệp này đã có trong Album rồi"; xoá rồi dán lại → hiện lại |
| Thiệp có sticker máy mình không có (bản sau / đồ lạ) | Bỏ qua hình đó, phần còn lại vẫn vẽ |
| Nhạc tắt | Cảnh không bật nhạc |
| Dịu mắt / tắt hiệu ứng | Cảnh vẫn chạy (chuyển động là nội dung) nhưng không nháy đèn, không mờ dần, không vệt sao |
| Cửa sổ nhỏ (800 × 600, 600 px) | Xưởng thiệp xếp một cột, thiệp thu nhỏ; cảnh thu về ×2 |
| Đang mở bảng khác / màn chào | Cảnh / thư / cất đồ chờ tới lúc không có bảng nào mở |
| Esc | Một lớp mỗi lần: rời ô nhập → bỏ chọn sticker → đóng bảng (lưu nốt); cảnh: Bỏ qua → Đóng; cửa sổ vườn không đóng |
| Trang trí thử | Ảnh / cảnh luôn là vườn thật |

## 3. Kết quả test (24/11 tối)

| Bộ | Kết quả |
|---|---|
| `core/test_1361.py` (mới, offline) | **120/120** (Python 3.13 và 3.9; 400 lượt hai máy ngẫu nhiên × 6 hạt giống) |
| `core/test_1361.js` (mới, Chromium) | **33/33** |
| `anki/e2e_1361.js` (mới, Anki thật, ngày + giờ giả, Gemini giả) | **81/81** Anki 26.9.4 (cả trên gói đã giải nén) · **81/81** Anki 23.10.1 |
| `anki/e2e_136.js` (1.36.0) | 66/66 |
| `anki/run_habanh.sh` 1.36.1 → 1.31.3 → 1.36.1 (thêm thiệp đã treo, thiệp nhận, ông đã ghé) | 4/4 + 10/10 + 18/18 |
| `anki/run_capnhat.sh` gói 1.31.3 đã phát hành → 1.36.1 | 5/5 + 18/18 |
| `run_all.sh` (`ANKI_PY` = aqt 26.9.4) trên gói đã giải nén | **78 mục, TẤT CẢ OK** (lượt đầu bắt 4 chỗ lệch quy ước — màu `#1b1b2f` viết cứng, chữ "Thôi", dòng mã vừa chữ Nhật vừa chữ chỉ-tiếng-Trung, dòng `AUTO_CMDS` test 1.33.2 so từng chữ — đã sửa) |

Lỗi tìm được khi chạy trong Anki thật (đã sửa, có test): (1) bản sửa của Gemini lưu cùng giây với lần tự lưu → khi gộp với bản
trong collection, bản cùng dấu thời gian thắng → mất bản sửa; (2) cảnh "cất đồ" không hiện vì Python chỉ báo ở lần dựng vườn đầu,
lần dựng thứ hai ngay sau đó không còn; (3) ngày 24 "treo thiệp trước 18:00" bị dòng "N ngăn chờ mở" che — nay hạn hôm nay lên trước;
(4) tủ lịch nhỏ ở Kỷ niệm bị ép vào một cột của lưới Album.

## 4. Chi tiết Claude chọn (người dùng chưa xem) — đổi được dễ
- **3 thiệp**, một thiệp treo; thiệp là bố cục (khung + sticker + chữ) — **không có bút vẽ tự do** như ảnh phác 21/11 (cho gọn, mã
  ngắn); không có "Vẽ sticker riêng ở Xưởng".
- Mã thiệp **không có điều ước**; tối đa 12 thiệp nhận.
- "Nhờ Gemini sửa" ≤ 5 lần / ngày, không sửa điều ước tiếng Việt, điều ước dài quá giới hạn của Luyện viết thì không nhờ sửa được.
- Cảnh đêm vẽ trên **sân thật** (không phải tranh vẽ sẵn); ông già Noel / xe / thư / thùng đồ là hình Claude vẽ; StackChan đội Mũ Noel
  có sẵn của Tủ đồ.
- Thời điểm: cảnh tự chạy lần đầu mở vườn **tối 24** (ngày Anki 24, từ 18:00 giờ máy); 25 – 31/12 **thư trước**, cảnh bằng "Xem lại";
  từ 1/1 không tự mở gì.
- Thư: thân **tiếng Việt**, chỉ lời chào + ký tên theo Ngôn ngữ trong vườn; ông xưng "ông", gọi "cháu".
- Cất đồ 1/1: **chỉ tuần lộc đèn + bàn bánh quy + bánh kem** về Kho đồ; cây thông + người tuyết + đồ trong nhà ở lại. Kế hoạch bản 4
  có "1/12 năm sau hỏi bày lại Bộ Giáng sinh 2026" — chưa làm (năm sau).
- Silent Night tự phát tối 24 chỉ khi đang chọn "Nhạc vườn Noel" / "Đổi bài mỗi ngày" (chọn bài khác thì giữ bài đó).
- Chữ ことば畑 ở góc dưới trái ảnh PNG.

## 5. Xem trên máy thật trước khi phát hành (~10 phút)
Tạo file rỗng `user_files/admin` trong thư mục add-on → mở vườn → ⚙ → **Xem thử sự kiện**:
1. **14/12** (hoặc ngày bất kỳ 1–23/12): chip "Tủ lịch" → **Làm thiệp điều ước ▸** → Làm thiệp mới: kéo sticker, đổi khung, gõ lời
   chúc, bấm câu chúc; mặt sau viết điều ước (chọn tiếng Nhật → "Nhờ Gemini sửa" gọi Gemini thật nếu đã dán khoá — xem thử thì báo
   "không gọi Gemini"); **Treo lên cây** → nhìn cây thông ở sân có thiệp nhỏ; **Lưu ảnh PNG**; **Chép mã** → Album → Kỷ niệm → dán mã
   → Xem thiệp. (Xem thử không lưu thiệp vào vườn thật.)
2. **24/12 tối · ông già Noel**: cảnh tự chạy — xem xe đáp, ông lấy thiệp, StackChan, xe bay đi; thử Bỏ qua / Xem lại.
3. **25/12 · thư**: thư tự mở — đọc lời trong thư; đổi ⚙ → Ngôn ngữ trong vườn → lời chào / ký tên đổi theo.
4. **1/1 · cất đồ**: cảnh StackChan cất đồ + danh sách (xem thử không cất thật).
5. Chọn "Tắt" ở Xem thử, xoá file `user_files/admin`.

Lưu ý: thiệp làm khi đang xem thử chỉ ở bộ nhớ (tắt xem thử là mất); thiệp thật làm được từ 1/12 thật.

## 6. Chưa làm
StackChan ăn bánh kem sáng 25 (P3 — kế hoạch cắt đầu tiên khi trễ), ảnh kỷ niệm tự chụp đêm 24, trang web "Xem mã" mở mã thiệp,
"1/12 năm sau bày lại Bộ Giáng sinh 2026", Tô tranh theo số (sau Noel).

## 7. Ảnh (Anki 23.10.1 thật, ngày + giờ giả — trừ ảnh 00 vẽ bằng Chromium)

| Ảnh | Nội dung |
|---|---|
| `1361_00_thiep_4_khung.png` | 4 khung thiệp (ảnh PNG có chữ ことば畑), mặt sau điều ước có dấu "Ông già Noel đã nhận", ông già Noel (đứng / đi / vẫy / cầm thiệp / ngồi xe) |
| `1361_01_xuong_thiep.png` | Xưởng thiệp: khung Giấy quà, câu chúc tiếng Nhật, sticker tất Noel vừa kéo + Lật, tab sticker Tủ lịch |
| `1361_02_dieu_uoc.png` | Mặt sau: điều ước tiếng Nhật, Gemini (giả) sửa — câu đã sửa, lỗi, nhận xét, "Dùng bản sửa" |
| `1361_03_thiep_tren_cay.png` | Thiệp nhỏ treo trên cây thông ở sân |
| `1361_04_nhan_thiep.png` | Album → Kỷ niệm: dán mã thiệp của bạn → xem trước → Giữ vào Album |
| `1361_05_dem_24_*.png` | Tối 24 trên sân thật: xe tuần lộc bay tới, ông lấy thiệp, vẫy StackChan |
| `1361_06_thu.png` | Sáng 25: thư của ông già Noel (lời chào theo Ngôn ngữ trong vườn, trích điều ước, hình thiệp) |
| `1361_07_cat_do.png` | 1/1: StackChan cất đồ Noel + danh sách |
| `1361_08_ky_niem.png` | Album → Kỷ niệm: tủ lịch 24 ngăn, thư, xem lại đêm 24, đồ đã cất |
