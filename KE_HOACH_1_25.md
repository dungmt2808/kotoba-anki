# Kế hoạch ことば畑 1.25 — nhà 3 gian làm lại cho đẹp (đã chọn bố cục A, đang duyệt nội thất, chưa làm)

Ngày 07/11/2026. Người dùng xem 1.24.0 trên máy thật (Ubuntu, cửa sổ ~1920 px, ảnh chụp màn hình trong cuộc trò chuyện):

> "tớ nghĩ là 2000 mua một lần mở rộng 2 gian luôn (tại vì tự nhiên mua 1 cái rồi mở rộng có 1 bên sáng, 1 bên mờ nhìn rất kỳ. nhưng sao tớ thấy thiết kế này chưa đẹp lắm (tớ không thích cái thừa 2 bên lắm (ruy băng nữa, có thể bật tắt không). đổi thiết kế, của 3 căn với phong cách tương tự nhau, tương đồng về thiết kế. đổi nhà cũng đổi giao diện 3 gian trong nhà luôn và không cần mua lại 2 gian nữa. chốt trước, ghi kế hoạch rồi làm sau."

Trả lời bốn câu hỏi chốt (cùng ngày):
- **Hai bên dải cảnh**: "kéo dài 2 gian bên cũng ổn, hoặc có thể giảm cái kích thước UI bên phần vườn còn 3/4 so với hiện tại thôi (chỉ là ý kiến). và kéo dài 2 bên thì thanh thông báo có thể che phần lớn giao diện nhà bên phải" → làm theo mục 3 (kéo dài + đặt 3 gian tránh thẻ Hôm nay).
- **Ruy băng (dây trang trí mùa)**: một nút ẩn tất cả.
- **Cửa sổ**: mỗi gian một cửa sổ.
- **Phong cách**: cùng nền theo kiểu nhà, mỗi gian một điểm nhấn.

> **Bàn giao:** mã nguồn ở `kotoba_batake/` (đóng gói `tests/tools/pack.py`). Nhà 3 gian của 1.24 (`PHAT_TRIEN.md` mục 2.6r): Python — `garden_core.py` (`SIDE_ROOMS`, `NHA_KEY`, `open_room`, `check_spot`, `split_nha` / `merge_nha` / `attach_nha`); JS — `web/home.js` (`drawRoom`, `drawSideRoom`, `lockedRoom`, `drawHouse3`, `houseRoomAt`, `roomPreview`, tab Xây nhà "Mở rộng nhà"), `web/nha_art.js` (hình 12 món + `bg` nền hai gian bên, chưa theo kiểu nhà). Dây trang trí mùa ở `web/season.js` (`band` dải trên cùng cửa sổ, `garland` trong cảnh ngoài trời, `room` trong phòng, hàm `garland()` / `room()`). Cài đặt giao diện chung: `web/ui.js` (`GLOB_DEF`, nhóm "Màn chính") + `more_core.clean_ui`. Công cụ test nhiều xu có "Mở Bếp + Phòng ngủ". Test 1.24: `tests/core/test_124.py`, `tests/anki/e2e_124.js`, `tests/anki/shots_124.js`.

## 1. Mở rộng nhà một lần: 2.000 xu → cả Bếp lẫn Phòng ngủ

- Tab **Xây nhà** (nhà đã xây xong, bước 7): **một** thẻ "Mở rộng nhà: Bếp + Phòng ngủ · 2.000 xu" (thay hai thẻ của 1.24), tiêu đề nhóm "Mở rộng nhà · một lần mở cả Bếp lẫn Phòng ngủ", ảnh nhỏ là cả nhà 3 gian theo kiểu nhà đang dùng (ảnh phác `125_f_the_mo_rong_nha.png`). Lệnh `home:nha:open` không kèm id; `GardenState.open_rooms()` mở cả hai; bấm đúp → "đã mở rồi", không trừ lần hai.
- Chưa mở: hai gian bên **cùng tối như nhau**, hai biển giống hệt nhau (đối xứng): dòng 1 tên gian ("Bếp" / "Phòng ngủ"), dòng 2 giá chung "Mở rộng nhà: cả 2 gian · 2.000 xu"; bấm biển bên nào cũng mở cả hai (không còn cảnh một bên sáng một bên tối). Ảnh phác: `docs/ke_hoach_1_25/125_d_*`, `125_e_1366_chua_mo_rong.png`.
- Dữ liệu giữ nguyên `kotoba_batake_nha` (`rooms`). Đọc dữ liệu 1.24 chỉ có một gian → coi như mở cả hai. 1.24 chưa phát hành (chỉ có trên nhánh thử) nên **không hoàn xu** cho ai đã mở hai gian với giá 4.000.
- Công cụ test: giữ "Mở Bếp + Phòng ngủ".

## 2. Ba gian cùng phong cách, theo kiểu nhà

- Ba gian dùng **chung một nền** theo kiểu nhà đang dùng: tường, xà trên, cột ngăn, chân tường, sàn, cửa sổ. Mỗi gian thêm **một điểm nhấn** để nhận ra gian nào. **Đổi kiểu nhà** (tab Xây nhà → Kiểu nhà) đổi luôn cả ba gian; gian đã mở giữ nguyên, không mua lại.
- Nền dự kiến (vẽ thử rồi chỉnh, xem mục 5):

| Kiểu nhà | Nền chung của 3 gian | Điểm nhấn Bếp | Điểm nhấn Phòng ngủ |
|---|---|---|---|
| Nhà gỗ mái đỏ (classic) | tường kem hồng sọc dọc, xà nâu, sàn gỗ ván, cửa sổ kính rèm hồng | dải gạch men trắng ở nửa dưới tường | viền giấy dán tường hoa nhỏ, rèm dày hơn |
| Minka mái tranh | tường đất ngà, cột + xà gỗ sẫm, chiếu tatami, cửa sổ shoji | sàn đất nện (doma) thay tatami | tatami + rèm noren ở cửa sổ |
| Nhà trà chashitsu | tường giấy vàng nhạt, cửa sổ tròn, tatami | sàn gỗ thông, kệ tre 2 tầng vẽ trên tường (hộp trà, chén, bát — nền, không phải đồ) | hốc tường tokonoma vẽ ở nền (tranh cuộn, bậc gỗ, bình hoa) |
| Lâu đài mini | tường trắng viền vàng, cột đen, sàn gỗ sẫm, cửa sổ shoji khung đen | sàn đá lát xám | thảm đỏ viền vàng vẽ ở sàn (nằm dưới đồ) |

- **Cửa sổ ở cả ba gian**: mỗi gian bên một cửa sổ 2 ô cùng kiểu với phòng chính (Bếp cột 3–4, Phòng ngủ cột 4–5 — đối xứng quanh phòng chính). Ô có cửa sổ không treo được đồ (như phòng chính). Đồ treo tường đang đặt ở các ô đó (từ 1.24) **tự về kho** khi đọc dữ liệu — không mất món.
- Xà trên và chân tường liền một mạch qua cột ngăn; cột ngăn cùng màu gỗ của kiểu nhà.
- Bảng Nhà vẽ từng gian theo kiểu nhà; tab Xây nhà: ảnh nhỏ của thẻ "Mở rộng nhà" và của từng kiểu nhà có thêm ba gian bên trong (để thấy trước khi mua kiểu).

## 3. Dải cảnh "Trong nhà" kín bề ngang, thẻ Hôm nay không che đồ

- **Bỏ khoảng gỗ tối** hai bên (và trên / dưới khi dải cao hơn nhà): tường + sàn của Bếp **kéo dài sang trái**, của Phòng ngủ **kéo dài sang phải**, xà kéo lên trên, sàn kéo xuống dưới cho kín khung. Phần kéo dài chỉ để nhìn (không đặt đồ); bấm vào thì như bấm gian bên cạnh.
- **Thẻ "Hôm nay"** (góc phải trên dải cảnh) không che đồ: ba gian thật (456 điểm ảnh nghệ thuật) đặt trong phần **bên trái thẻ**; phần nằm dưới thẻ là phần Phòng ngủ kéo dài. Cỡ phóng = số nguyên lớn nhất để ba gian vừa phần không bị che, **tối thiểu ×2**; cửa sổ hẹp tới mức ×2 cũng không vừa (khoảng < 1.200 px) thì để thẻ che phần cuối Phòng ngủ như 1.24.
- Ảnh chụp nguyên nhà: cỡ thường / lớn như 1.24; hình nền 1920 × 1080 kín khung bằng phần kéo dài (thay nền gỗ tối).
- Ý kiến "giảm UI phần vườn còn 3/4": không cần để lấp hai bên nữa (mục này đã lấp); ghi ở mục 6 để thêm nếu cậu vẫn thấy dải cảnh to.

## 4. Một nút ẩn dây trang trí mùa ("ruy băng")

- ⚙ → Giao diện → nhóm **Màn chính**: "Dây trang trí: **Hiện** / **Ẩn** (dải trên cùng, sân, trong nhà)" (mặc định Hiện; nhãn ngắn cho vừa cột như "Cỡ cảnh", "Cảnh hiện").
- Ẩn: dải trang trí trên cùng cửa sổ (`band`), dây trong cảnh ngoài trời (`garland`), dây trong các gian (`room`). Vẫn giữ: màu trang / trời của giao diện mùa, hạt rơi, đồ theo mùa, nhạc.
- Lưu ở config `ui` (khoá chung mới, như `scene` / `start`; `more_core.clean_ui` hiểu khoá này) — mỗi máy một lựa chọn, không đồng bộ.

## 5. Cách làm và kiểm tra

1. Dựng **ảnh phác** 4 kiểu nhà × cả nhà 3 gian (ngày, đêm) bằng hình thật trong Anki để người dùng duyệt màu / điểm nhấn trước khi hoàn thiện; chỉnh theo góp ý. **Đã vẽ 07/11, chờ chốt** — xem mục 5a.
2. Mã:
   - Python: `open_rooms` (một lần, hai gian), cửa sổ gian bên trong `check_spot`, đồ treo ở ô cửa sổ về kho khi đọc, đọc dữ liệu 1.24 một gian → hai gian; `home_catalog` giá + cửa sổ gian bên.
   - JS: nền chung theo kiểu nhà cho cả ba gian (gộp `drawRoom` / `drawSideRoom`, nền theo kiểu ở `nha_art.js`), cửa sổ gian bên, biển giá chung, `drawHouse3` kéo dài + đặt tránh thẻ Hôm nay, `houseRoomAt` theo bố cục mới; `season.js` + `ui.js` nút ẩn dây trang trí.
3. Test:
   - `tests/core/test_125.py`: mở một lần trừ 2.000 xu, bấm đúp; dữ liệu 1.24 một gian → hai gian; cửa sổ gian bên cấm treo; đồ treo cũ ở ô cửa sổ về kho, không mất món; đổi kiểu nhà không mất gian / đồ; `clean_ui` giữ khoá mới; mã 1.24 thật (git) mở cùng dữ liệu.
   - `tests/anki/e2e_125.js` (Anki thật): một thẻ Mở rộng; trước khi mở hai gian cùng tối; sau khi mở cùng sáng; 4 kiểu nhà × 3 gian đổi theo kiểu; dải cảnh không còn vùng gỗ tối ở 1024 / 1366 / 1920 px; thẻ Hôm nay không che đồ Phòng ngủ ở 1366 / 1920 px; nút ẩn dây trang trí (dải trên cùng, sân, trong nhà); cửa sổ 720 × 520.
   - Chạy lại bộ cũ (26.9.4 đầy đủ + 23.10.1), `audit_full` / `audit_edge`; ảnh trước / sau 1.24 ↔ 1.25 (`tools/compare_shots.py … 125`), báo cáo `docs/kiem_thu/1.25/`.
4. Tài liệu: `PHAT_TRIEN.md` (mục 2.6s, 5.2 nếu đổi dữ liệu, 6 cân bằng xu: mở rộng nhà 2.000 thay 4.000), README, `config.md` (nút ẩn dây trang trí), `tests/README.md`; xoá file kế hoạch này khi xong.

## 5a. Ảnh phác (07/11, chờ người dùng chốt)

Vẽ trong Anki thật 26.9.4 bằng chính hàm vẽ của add-on (`GardenHome._lib()` — cổng chỉ cho test / ảnh phác) + `tests/anki/mock_125_lib.js` (nền 3 gian theo kiểu nhà, phần kéo dài, biển giá), phủ lên dải cảnh ở màn chính thật (thẻ Hôm nay, nút ◂ ▸ vẫn nằm trên). Chạy lại: `KB_SCRIPTS=mock_125.js anki/run_ui.sh ../kotoba_batake OUT` (trong `tests/`, cần `ANKI_PY`). Đồ bày mẫu giống nhau ở cả 4 kiểu; giao diện mùa xem thử "Mùa lá đỏ" để thấy dây trang trí.

Ảnh ở `docs/ke_hoach_1_25/`:

| Ảnh | Nội dung |
|---|---|
| `125_00_so_sanh_4_kieu_nha.png` | 4 kiểu nhà xếp chồng (ban ngày, 1920 px) — để so nhanh |
| `125_a_{classic,minka,teahouse,castle}_ngay.png` | từng kiểu, cả màn chính 1920 × 1080: ba gian ×3 nằm bên trái thẻ Hôm nay, phần dưới thẻ là Phòng ngủ kéo dài, không còn khoảng gỗ tối |
| `125_b_{classic,minka}_dem.png` | 21 giờ: cửa sổ ba gian cùng tối, đèn sáng quầng |
| `125_c_an_day_trang_tri.png` | nút "Dây trang trí: Ẩn" — mất dải trên cùng cửa sổ và dây trong nhà; hạt rơi, màu mùa vẫn còn |
| `125_d_chua_mo_rong{,_minka}.png` | chưa mở rộng: hai gian bên tối như nhau, hai biển đối xứng |
| `125_e_1366_*.png` | cửa sổ 1366 × 768: cỡ ×2, ba gian vẫn tránh được thẻ Hôm nay; trần cắt bớt 12 điểm ảnh như 1.24 |
| `125_f_the_mo_rong_nha.png` | tab Xây nhà: một thẻ "Mở rộng nhà: Bếp + Phòng ngủ" 2.000 xu |
| `125_g_nut_an_day_trang_tri.png` | ⚙ → Giao diện → Màn chính: dòng mới "Dây trang trí: Hiện / Ẩn" (khung đỏ đứt nét = dòng thêm) |

Số đo (1920 px): dải cảnh 1866 × 304 px CSS, phần không bị thẻ che 1575 px → ×3, ba gian rộng 1368 px, kéo dài trái 34 điểm ảnh nghệ thuật, trần thêm 13. 1366 px: 1312 × 152, phần trống 1021 px → ×2.

Còn để ý khi làm thật: nút ◂ Trong nhà ▸ + 📷 ở góc trái dưới vẫn che một phần Bếp (như 1.24) — ở 1366 px che mép bàn ăn; ban đêm phòng chỉ tối nhẹ (cùng công thức `drawNight` của 1.24).

## 5b. Lượt 2 — bố cục khác (07/11) → **người dùng chọn A**

Góp ý sau ảnh phác 5a:

> "tớ thấy bố cục này vẫn không ổn lắm, nó vừa đối xứng, vừa bất đối xứng (chỉ cần cửa sổ ở giữa là được). thà để như cũ, rồi 2 bên là màu sắc của cỏ bên ngoài vườn thì tớ nghĩ cũng ổn (tớ không biết cái nào ưng nữa), còn thiết kế bố cục nào khác không"

→ Bỏ hướng "kéo dài gian bên + đẩy nhà sang trái" (mục 3, ảnh 5a) và cửa sổ ở gian bên (mục 2). Vẽ ba phương án, đều **đối xứng**, nhà ở giữa dải, **chỉ phòng chính có cửa sổ** (như 1.24), giữ "cùng nền theo kiểu nhà + mỗi gian một điểm nhấn" (Minka: Phòng ngủ đổi rèm noren thành cửa lùa fusuma vẽ sóng chàm vì không còn cửa sổ). Ảnh ở `docs/ke_hoach_1_25/bo_cuc/` (driver `tests/anki/mock_125_bo_cuc.js`, hàm `stripA` / `stripB` trong `mock_125_lib.js`):

| Phương án | Mô tả | Ưu | Nhược |
|---|---|---|---|
| **A** — như 1.24, hai bên là vườn | Cỡ như 1.24 (×3 ở 1920, ×2 cắt trần ở 1366). Hai bên nhà là vườn: trời theo giờ + đồi + cỏ theo mùa, chân trời ngang mép sàn; tường ngoài hai đầu; mái hiên phía trên trần (màu mái theo kiểu nhà). | Gần 1.24 nhất, đồ to như cũ; nút ◂ Trong nhà ▸ + 📷 nằm trên phần vườn, không che Bếp | Thẻ Hôm nay che mép Phòng ngủ (~10 px ở 1920, ~1/4 gian ở 1366) |
| **A+** — A + thẻ Hôm nay thu gọn | Ở cảnh Trong nhà, thẻ Hôm nay còn một dòng "Hôm nay 0/30 · 3 việc ▾" + thanh tiến độ (rộng 176 px), nằm gọn trong phần vườn bên phải; bấm ▾ mở đủ như cũ | Không che gì ở cả 1920 và 1366 | Phải bấm một lần mới thấy Nhiệm vụ / Báo / Nhật ký |
| **B** — nhà búp bê | Cả nhà có mái (ống khói, cửa sổ áp mái), móng đá, đứng giữa vườn; thẻ Hôm nay nằm trên trời | Cân đối, dễ thương nhất; thấy rõ "cái nhà" đổi theo kiểu | Nhỏ hơn: ×2 ở 1920; màn ≤ 1366 px chỉ vừa ×1 → phải tự về A / A+ |

| Ảnh | Nội dung |
|---|---|
| `00_so_sanh_bo_cuc_1920.png`, `00_so_sanh_bo_cuc_1366.png` | A / A+ / B xếp chồng, có chú thích |
| `A_{classic,minka,teahouse,castle}_ngay.png`, `A_classic_dem.png`, `A_classic_chua_mo_rong.png` | A ở 4 kiểu nhà, ban đêm, chưa mở rộng (hai biển đối xứng) |
| `A+_classic_the_gon.png`, `A+_1366_the_gon.png` | thẻ Hôm nay thu gọn |
| `B_{classic,minka,castle}_ngay.png`, `B_classic_dem.png`, `B_1366_classic.png` | nhà búp bê |

**Chốt (07/11):** "A là ổn" → bố cục A (nhà giữa dải như 1.24, hai bên là vườn, mái hiên phía trên, chỉ phòng chính có cửa sổ). Mục 3 (kéo dài gian bên, đẩy nhà tránh thẻ Hôm nay) và cửa sổ gian bên ở mục 2 **bỏ**. Thẻ Hôm nay giữ như cũ (A+ không chọn).

## 5c. Lượt 3 — nội thất v2 của 4 kiểu nhà (07/11, chờ duyệt)

Góp ý: "thiết kế lại giao diện bên trong từng ngôi nhà đẹp hơn nhé, tớ vẫn chưa ưng các thiết kế đó." → vẽ lại nền cả ba gian (thay bảng ở mục 2). Chung cho mọi kiểu: tường có lớp (phần trên / nẹp / ốp chân tường), bóng đổ dưới xà và ở mép sàn, sàn có vân (ván so le 3 tông màu, chiếu có sợi + viền), cột ngăn có mép sáng và đai ở hai đầu, vệt nắng từ cửa sổ xuống sàn ban ngày. Điểm nhấn từng gian đặt giữa / bên trái để thẻ Hôm nay không che.

| Kiểu nhà | Nền chung | Phòng chính (cửa sổ) | Bếp | Phòng ngủ |
|---|---|---|---|---|
| Nhà gỗ mái đỏ | xà nâu, giấy dán tường hoa nhỏ, nẹp gỗ, ốp ván dọc, chân tường kem, sàn gỗ mật ong | ốp xanh lá mạ; cửa sổ kính khung trắng, rèm hồng có nếp + dây buộc, diềm rèm, chậu hoa ở bậu | gạch men trắng viền xanh tới giữa tường, sàn ô cờ kem / đỏ gạch | giấy dán tím nhạt hoa tím, ốp hồng |
| Minka mái tranh | xà gỗ sẫm, tường đất trát lốm đốm, thanh ngang nageshi, ốp ván chân tường, chiếu tatami viền đen | cửa sổ nửa mở: nửa kính nhìn trời, nửa shoji | sàn đất nện + bậc gỗ agari, tường ám khói, hai dây hồng treo khô | ô thoáng ranma + bốn cánh fusuma vẽ sóng chàm (seigaiha) kín tường |
| Nhà trà | trần đan tre ajiro, tường đất vàng có sợi rơm, giấy dán chân tường koshibari, cột gỗ mộc, tatami viền nâu | cửa sổ tròn song tre không đều | sàn gỗ thông nhạt + kệ tre 2 tầng (hộp trà, chén, bát) | hốc tokonoma giữa gian: cột gỗ mộc, tranh cuộn chữ, bình hoa, bậc gỗ |
| Lâu đài mini | xà sơn đen đinh vàng, vữa trắng, nageshi đen đinh vàng, fusuma lá vàng, tatami viền gấm đỏ chấm vàng, cột đen đai vàng | cửa sổ hình chuông katōmado viền vàng; fusuma vẽ tùng xanh + mây vàng | ốp gỗ sơn đen viền vàng, sàn gỗ sẫm bóng có vệt phản chiếu | fusuma vàng vẽ cành anh đào |

Ảnh ở `docs/ke_hoach_1_25/noi_that/` (driver `tests/anki/mock_125_noi_that.js`, hàm `WALLS` / `windowV2` / `post2` trong `mock_125_lib.js`):
- `00_noi_that_4_kieu_co_do.png`, `00_noi_that_4_kieu_trong.png` — 4 kiểu xếp chồng, phóng ×4 (có đồ / chưa bày đồ), có chú thích
- `Z_{kiểu}_x4[_trong].png` — từng kiểu phóng ×4
- `N_{kiểu}_{ngay,dem,trong}.png` — trên màn chính 1920 px (bố cục A), ban ngày / 21 giờ / chưa bày đồ

Khi làm thật: chuyển `WALLS` / `windowV2` / `post2` / `garden` / `eave` từ ảnh phác sang `web/nha_art.js` (nền 3 gian theo kiểu) + `home.js` (`drawRoom`, `drawHouse3`); phòng chính 1.24 lấy luôn nền mới (ảnh chụp, bảng Nhà, xem trước ở tab Xây nhà cùng một hàm).

## 6. Còn mở / để sau

- **Cỡ cảnh "Nhỏ" (≈ 3/4)** ở ⚙ → Màn chính (ý kiến của người dùng): không cần cho việc lấp hai bên; thêm nếu sau 1.25 vẫn thấy dải cảnh to.
- Màu / điểm nhấn từng kiểu nhà ở mục 2 là dự kiến: chốt lại theo ảnh phác (mục 5.1).
