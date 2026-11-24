# Báo cáo 1.36.0 — sự kiện Giáng sinh 2026 "Lịch chờ Giáng sinh" (24/11/2026)

Người dùng (24/11): "thực hiện triển khai phần sự kiện giáng sinh nhé, xem còn các trường hợp nào nữa không (người mới tải addon,
người đã có loại nhà mới, người tải giữa lúc sự kiện, người không chọn mùa giáng sinh,...) xử lý cho tất cả các trường hợp nhé".

Làm theo **bản gộp chốt 23/11** (`docs/ke_hoach_1_36/KE_HOACH.md`, phần của bản **1.36**). Phần của **1.36.1** (thiệp + điều ước,
đêm 24, sáng 25, cất đồ 1/1, Kỷ niệm ở Album) chưa làm — đúng lịch chia bản; riêng **mở hộp quà từ 25/12** đã đưa vào 1.36 để bản
này tự đủ nếu 1.36.1 ra muộn.

## 1. Đã làm

| Phần | Người dùng thấy gì | Mã |
|---|---|---|
| Tủ lịch 24 ngăn | Chip **Tủ lịch N/24** ở hàng dưới dải cảnh (vàng khi có ngăn chờ mở), nút trong thẻ Hôm nay, bấm cây thông / tủ lịch trên tường → bảng tủ gỗ 6 × 4. Ngăn đã mở thấy món; ngăn chờ mở viền vàng lấp lánh; ngăn hôm nay viền chấm ("ôn 1 thẻ"); ngăn lỡ màu xám (dấu xanh = mở bù được); **ngăn mai hé bóng món**. Bấm ngăn → thẻ kết quả + nút "Đặt ▸" / "Bày ra sân ▸" / "Dùng ở Tường & sàn ▸" / "Xem ở sân ▸" | `le_core.py`, `web/le.js` |
| Luật | Ngày có ≥ 1 lượt ôn (cả ôn trên điện thoại, cả trước lúc cài) hoặc đã dùng vé giữ chuỗi → mở ngăn ngày đó; ngăn chờ mở giữ tới hết 31/12; lỡ ngày → 15 lượt ôn trong một ngày mở bù 1 ngăn, tối đa 2 / ngày; **không có xu** | `le_core.door_state` / `open_door` |
| Quà mở mùa | Lần đầu mở vườn trong 1–31/12: **Tủ lịch 2026** tự treo tường phòng khách (cạnh cửa sổ) + **cây thông** (nếu chưa có cây nào) tự đặt ra sân; thông báo một lần | `__init__._le_settle`, `le_core.plan_sync`, `GardenState.le_apply` |
| Cây thông | Mọi cây `xmastree` về **dạng trơn** từ 1/12 rồi đầy dần: quả châu đỏ (2) / vàng (4) / xanh (9) / tím (12) / thêm đỏ (19), đèn cây (10), kim tuyến (16), kẹo gậy (22), ngôi sao (24); đủ ngăn = cây gốc từng điểm ảnh; 3 hộp quà dưới gốc | `le_art.tree`, `home.js sceneSprite`, `season_art.js` |
| Áo nhà | Vòng hoa cửa + nơ đèn lồng (1), dây lá thông + nơ dọc mép mái + đèn viền mái + đèn rủ (7), nến cửa sổ (14), ngôi sao trên mái (21) — theo **4 kiểu nhà** (gốc cấp 4–7, minka, nhà trà, lâu đài) | `le_art.houseGeo` / `houseLights`, `le.drawHouse` |
| Sân sáng đèn | Ban đêm: đèn viền mái, đèn rủ, cây thông + món cao (≥ 26 điểm ảnh) quấn đèn, đèn lối đi ở mép trước ô trống, dây đèn võng từ ống khói / nóc tới đỉnh cây / món cao, tuần lộc đèn sáng, quầng sáng dưới cây; ban ngày là dây đèn tắt. ≤ 400 bóng; **Dịu mắt / tắt hiệu ứng → đứng yên** | `le.drawLights` (sau lớp tối ban đêm) |
| Món quà | 11 món: tủ lịch, cây thông nhỏ để bàn, tất Noel, quả cầu tuyết, bánh kem dâu, gấu bông Noel, người tuyết, đèn ngủ ngôi sao, đèn lồng ngôi sao, tuần lộc đèn ×2, bàn nhỏ bánh quy + sữa; 5 mẫu tường / sàn Noel | `garden_core.LE_ITEMS`, `decor_core.NOEL_TILES`, `nha_art.js DECO` |
| Hộp quà bí mật | Ngăn 6 / 13 / 20 → hộp dưới gốc cây; bấm hộp trước 25/12 → lắc + câu đoán; **từ 25/12 mở được** (cả sau mùa) | `le_core.open_box` |
| Nhạc | ⚙ → Âm thanh → **Nhạc Giáng sinh** (khi giao diện Giáng sinh đang dùng): Nhạc vườn Noel · Jingle Bells · Silent Night · We Wish You a Merry Christmas · Deck the Halls · O Tannenbaum · Joy to the World · Đổi bài mỗi ngày | `music.js` |
| ⚙ | **Sự kiện mùa (Giáng sinh)** Bật / Tắt; admin: **Xem thử sự kiện** theo ngày (không ghi gì) | config `season_event`, `le:cfg`, `le:preview` |
| Tin làng | "Tủ lịch Giáng sinh: ngăn 5/12 chờ mở", "ôn 1 thẻ là mở ngăn …", "mở bù được 1 ngăn", "Hộp quà bí mật … mở được rồi!"; Sắp tới: "Lịch chờ Giáng sinh mở", "Mở hộp quà bí mật"; màn chào nhắc | `le_core.news_line` / `soon_line`, `event_core.news` |
| Trang web chung | Kho hình thêm nhóm "Giáng sinh 2026" (11 món) + 5 mẫu tường / sàn Noel | `site/tools/xuat_hinh.js` |

## 2. Các kiểu người dùng / trường hợp — đã xử lý

| # | Trường hợp | Cách xử lý | Test |
|---|---|---|---|
| 1 | **Người mới tải add-on** (nhà chưa xây, chưa có gì) | Tủ lịch vào **Kho đồ** (chưa có phòng), bảng ghi "xây nhà tới bước Lắp cửa là treo được (vẫn mở ngăn ở đây được)"; cây thông vẫn ra sân; mở ngăn bằng chip / thẻ Hôm nay; áo nhà chờ nhà có mái (câu nhắc) | e2e G, test_136.py F |
| 2 | **Nhà kiểu mới** (minka / nhà trà / lâu đài) | Áo nhà + đèn theo điểm neo riêng từng kiểu (mép mái, cửa, cửa sổ, nóc / ống khói) | test_136.js C + D, e2e G (ảnh 3 kiểu ban đêm) |
| 3 | **Nhà 3 gian**, tường phòng khách kín | Tủ lịch sang tường Bếp / Phòng ngủ; kín hết → Kho đồ + nút "Treo lên tường ▸" (báo "Hết chỗ trống" nếu vẫn kín) | `le_auto_spot` |
| 4 | **Tải / cập nhật giữa sự kiện** (vd. 10/12) | Lần mở vườn đầu tiên vẫn tặng; ngày 1–9 có ôn (trên điện thoại, hoặc trước khi cài) → 9 ngăn chờ mở ngay, không cần mở bù | e2e G, test_136.py E, `run_capnhat.sh` (1.31.3 → 1.36 rồi tới 3/12) |
| 5 | Mở vườn lần đầu sau 24/12 (25–31/12) | Vẫn tặng; ngăn đủ điều kiện mở được; hộp quà mở ngay | test_136.py C / D |
| 6 | Mở vườn lần đầu từ 1/1/2027 | Không tặng, không có gì (sự kiện đã qua) | test_136.py E |
| 7 | **Không chọn giao diện Giáng sinh** (chưa mở / chọn giao diện khác / Tắt giao diện mùa) | Sự kiện chạy độc lập: vẫn tủ lịch, cây thông (được tặng, đặt được dù chưa mở giao diện), áo nhà, đèn; chỉ phần nhạc Giáng sinh đi theo giao diện | e2e B (collection test chưa mở giao diện nào) |
| 8 | Không muốn sự kiện | ⚙ → Sự kiện mùa: Tắt → không tặng, không vẽ, không chip, lệnh `le:*` bị bỏ; dữ liệu giữ nguyên; Bật lại thấy đủ | e2e F, test_136.js D |
| 9 | Đã mua cây thông từ trước | Không tặng thêm; cây đang ở kho mà chưa đặt ở đâu → đặt một cây ra sân; cây ở vùng khác (Bãi biển…) giữ nguyên chỗ, cùng trạng thái; 2 cây cùng trạng thái | test_136.py E, test_136.js D |
| 10 | Sân kín chỗ | Cây / người tuyết / tuần lộc vào Kho đồ + gợi ý "Đặt cây thông ▸" / "Bày ra sân ▸" | e2e G, test_136.py F |
| 11 | Ôn trên điện thoại, không mở vườn | Ngăn của những ngày đó "chờ mở" (revlog đồng bộ về) | e2e G, test_136.py C |
| 12 | Quên ôn nhưng có vé giữ chuỗi | Ngày dùng vé → ngăn mở được như ngày có ôn | test_136.py C |
| 13 | Hai máy tính cùng mở ngăn / đồng bộ | Sổ gộp theo hợp (ngăn mở ở máy nào cũng tính); đồng bộ mang về bản cũ → `sync_core` trả lại như mọi khoá `kotoba_batake_*` | test_136.py G, `dong_bo/test_dong_bo.py` |
| 14 | Máy khác còn bản cũ (1.31.3…1.35.6) | Đồ `le_*` ở tầng NHA_KEY, mẫu Noel ở `decor.own` — bản cũ giữ hộ, không hiện; về 1.36 thấy lại đủ (chỗ đặt, tường đang dùng, sổ 21 ngăn) | test_136.py H (mã 1.31.3 thật), `run_habanh.sh` 30/30 |
| 15 | Khôi phục ví cũ / Anki tắt giữa hai lần ghi | Sổ ghi đã nhận mà kho thiếu → tự bù lần mở vườn sau (không tự bày) | test_136.py E |
| 16 | Lỗi ghi collection | Kho + sổ ghi cùng một lần: lỗi → không đổi gì, bấm lại được | test_136.py F2 |
| 17 | Đọc collection lỗi | Không tặng / không ghi; bảng vẫn vẽ (sổ trống tạm) | `LeStore._damaged` |
| 18 | Đang đồng bộ | Không tặng; bấm ngăn → câu "Anki đang đồng bộ…" như mọi lệnh | `_sync_hold` |
| 19 | Undo lượt ôn sau khi mở ngăn | Ngăn vẫn mở (không có xu nên không có gì để trả) | luật |
| 20 | Đổi giờ máy / lùi ngày | Theo ngày Anki; ngăn đã mở không mở lại, không mở trước ngày | test_136.py C |
| 21 | Dịu mắt / tắt hiệu ứng (issue #7) | Đèn đứng yên, bảng tủ lịch vẽ chậm lại | test_136.js E |
| 22 | Cửa sổ nhỏ (1024 × 700, 800 × 600) | Bảng không tràn, cuộn được khi thấp | e2e C (cả Anki 23.10.1) |
| 23 | Trang trí thử (1.34) | Đồ sự kiện chưa có / mẫu Noel chưa có → không "mua" được qua bản thử (giá 0) | test_136.py A2 |
| 24 | Ngôn ngữ trong vườn khác tiếng Việt | Tên mẫu Noel chưa có bản dịch → chỉ hiện tên tiếng Việt (không lẫn chữ Nhật); mô tả không dùng chữ Nhật | soát |
| 25 | Hồ sơ Anki khác | Sổ theo collection, file sao lưu theo hồ sơ | `LeStore` |
| 26 | Hết mùa (≥ 1/1/2027) | Không mở ngăn; cây / nhà / sân về như cũ; chip tới 15/1 rồi ẩn — bấm tủ lịch trên tường xem lại; hộp quà chưa mở vẫn mở được + nhắc | e2e H, test_136.py |
| 27 | Anki 23.10.1 / Python 3.9 | Chạy được (cú pháp, nạp module, cả kịch bản Anki thật) | e2e_136 trên 23.10.1, test_136.py trên Python 3.9 |

## 3. Kết quả test (24/11)

- `core/test_136.py` (offline): **157/157** — gồm 2.000 tháng ngẫu nhiên có đối chứng (không mở trước ngày, không mở hai lần, ≤ 2
  bù / ngày), lỗi ghi từng khoá, mã 1.31.3 thật đọc + lưu ví có đồ sự kiện. Cũng chạy trên Python 3.9: 157/157.
- `core/test_136.js` (Chromium, web/*.js thật): **18/18** — cây đủ ngăn = `SPR.xmastree` từng điểm ảnh, 360 lần vẽ (cảnh × kiểu nhà × cấp
  × ngăn × giờ × hiệu ứng × cỡ Lớn × ảnh chụp) không lỗi, sân kín món cao ≤ 400 bóng, vẽ đủ ngăn ban đêm 8,5 ms / khung.
- `anki/e2e_136.js` (Anki thật, ngày giả ghi thật): **66/66** trên Anki **26.9.4** và **66/66** trên Anki **23.10.1**.
- `anki/run_capnhat.sh` cài đè gói **1.31.3 đã phát hành** → 1.36.0: **5/5 + 18/18** (không mất khoá / file / cấu hình; thêm bước
  "tới 3/12 trên dữ liệu của bản cũ": tặng đúng, xu / đồ / chỗ đặt cũ y nguyên, 3 ngăn chờ mở).
- `anki/run_habanh.sh` 1.36 → 1.31.3 → 1.36 (đã mở 21 ngăn, dán tường Noel): **4/4 + 10/10 + 16/16**.
- `run_all.sh` (`ANKI_PY` = aqt 26.9.4) trên gói đã giải nén: xem mục 3b.
- Test cũ khoá cứng danh sách khoá collection / mục config (1.32.2 → 1.35.6) đã trừ `kotoba_batake_le` + `season_event` (như 1.35
  với `paper_de` / `_fr`); `test_1356.py` phần "so với 1.35.5" chỉ chạy đúng ở bản 1.35.6, bản sau chỉ cần không bỏ file / khoá.

## 4. Chi tiết Claude chọn (người dùng chưa xem) — đổi được dễ

1. Sự kiện **độc lập với giao diện mùa** (mục 2 #7). Muốn "chỉ khi dùng giao diện Giáng sinh" → một điều kiện ở `le_view`.
2. **Mọi** cây thông (cả cây mua từ tháng 11) về trơn từ 1/12 rồi đầy dần — theo bản chốt 19/11 "mọi cây cùng trạng thái".
3. Hộp quà mở được ngay từ 25/12 ở bản 1.36 (không đợi cảnh sáng 25 của 1.36.1) và sau mùa vẫn mở.
4. Lượt ôn **trước lúc cài** add-on vẫn tính ngăn (người cài giữa tháng không phải mở bù).
5. Chỗ tự bày: tủ lịch cạnh cửa sổ phòng khách; cây thông ô gần nhà nhất hàng giữa; người tuyết hàng trước gần nhà; tuần lộc hàng
   trước từ mép phải vào.
6. Nhạc Giáng sinh 7 bài — **bỏ The First Noel** (không chắc chép đúng giai điệu); chỉ chọn được khi giao diện Giáng sinh đang dùng.
7. Hình 11 món, tủ lịch, biểu tượng ngăn, áo nhà, đèn — vẽ mới (ảnh phác cũ chỉ là tạm). Đèn 3 màu: trắng ấm · vàng · xanh băng.
8. Chip "Tủ lịch" hiện tới 15/1/2027 (sau đó bấm tủ lịch trên tường để xem lại).
9. Câu chữ của bảng / thẻ kết quả / Tin làng.

## 5. Xem trên máy thật trước khi phát hành (~10 phút)

Hôm nay là tháng 11 nên cần **xem thử theo ngày**: tạo file rỗng `user_files/admin` trong thư mục add-on (như khi Sửa hình) →
mở vườn → ⚙ → **Xem thử sự kiện** → chọn ngày (không ghi gì vào vườn thật; chọn "Tắt" để thôi).

1. **1/12**: chip "Tủ lịch 0/24"… (xem thử dùng sổ giả: ngăn hôm nay chờ mở) → bấm chip → bảng tủ gỗ → bấm ngăn sáng → thẻ kết quả.
2. **7/12, 14/12, 21/12, 24/12**: dải cảnh ban ngày / ban đêm (⚙ → Trời & giờ → Cố định: Ban đêm) — cây đầy dần, áo nhà, đèn sân,
   dây võng, sao trên mái. Nếu nhà là minka / nhà trà / lâu đài: xem đèn có nằm đúng mép mái không.
3. **25/12**: bấm hộp quà ở bảng (xem thử: mở được, không vào kho thật).
4. **1/1**: cây / nhà về như cũ, bảng ghi "đã qua".
5. ⚙ → Sự kiện mùa: Tắt → chip mất, cây về đủ đồ; Bật lại.
6. Nếu đang dùng giao diện Giáng sinh: ⚙ → Âm thanh → Nhạc Giáng sinh → nghe thử từng bài (giai điệu có đúng không).
7. Xoá file `user_files/admin` khi xem xong.

Những thứ **tặng thật** (tủ lịch, cây thông) chỉ xảy ra từ 1/12 thật — xem thử không tặng gì: vườn chưa có cây thông thì lúc
xem thử không thấy phần cây (bảng ghi "Chưa có cây thông"), chưa có tủ lịch thì không thấy tủ trên tường.

## 6. Chưa làm (để 1.36.1, theo bản gộp chốt)
Xưởng thiệp + điều ước (PNG / mã), đêm 24 (ông già Noel, Silent Night), sáng 25 (thư viết sẵn, quả cầu tuyết, vụn bánh quy), cất đồ
1/1 (đèn sân / áo nhà = "Bộ Giáng sinh 2026"), Kỷ niệm Giáng sinh 2026 ở Album. Tên mẫu Noel theo Ngôn ngữ trong vườn (cần soát
chữ bằng công cụ của 1.32 / 1.35 như các mẫu khác).

## 7. Ảnh (Anki 26.9.4 thật, ngày giả)

| Ảnh | Nội dung |
|---|---|
| `136_01_ngay_1.png` | 1/12: tặng tủ lịch + cây thông (trơn), chip "Tủ lịch 0/24", dòng Hôm nay |
| `136_02_bang.png` / `136_02b_bang_800_anki23.png` | bảng tủ lịch (1366 × 860) / cửa sổ 800 × 600 trên Anki 23.10.1 |
| `136_03_mo_ngan_1.png` | mở ngăn 1 bằng chuột: thẻ kết quả "Vòng hoa cửa" |
| `136_04_ngay_5.png` | 5/12: ngăn 3, 5 mở; ngăn 2 mở bù; ngăn 4 lỡ (xám); ngăn 6 hé bóng hộp quà |
| `136_05_dem_17.png` | 17/12 ban đêm: cây có đèn, áo nhà, người tuyết, đèn lối đi |
| `136_06_trong_nha.png` | Trong nhà: tủ lịch trên tường, tường Noel "Sọc kẹo gậy" |
| `136_07_nguoi_moi.png` | người mới cài 10/12, nhà chưa xây: 10 ngăn chờ mở, tủ lịch ở Kho đồ |
| `136_08_minka/teahouse/castle.png` | ba kiểu nhà ban đêm, đủ 24 ngăn |
| `136_09_san_ngay_dem.png` | (Chromium) sân ngày / đêm đủ ngăn, cây trơn, cây nửa chừng |
| `136_10_bang_26_12.png` | (Chromium) bảng ngày 26/12: đủ 24 ngăn, 3 hộp quà đã mở |
