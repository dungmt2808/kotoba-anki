# Kế hoạch 1.34 — góp ý về bảng ôn, ô chọn deck, trang trí thử (17/11, **ảnh phác, chưa làm**)

Người dùng chuyển góp ý sau khi phát hành:

> Về phần thẻ học: thêm phím tắt 1,2,3,4 cho 4 mức Nhớ · Space / Enter lật thẻ · Replay Audio · một số thẻ tự lật (thẻ chọn
> đáp án…) · nút phóng to, tắt bớt viền trên / dưới cho thẻ dài · Ẩn vườn rồi Hiện vườn thì vùng học không lùi lên, vườn chỉ
> hiện một chút xíu · tìm thêm một số trường hợp có thể xảy ra. Chỗ chọn deck gọn hơn, dropdown giống Anki cho người có nhiều
> deck con. Trang trí nhà: lưu lại bản trang trí, dùng để đặt thử đồ — hiện tại phải mua mới đặt thử được.
> **Phác hoạ trước rồi mới bắt đầu triển khai.**

Ảnh phác vẽ đè lên vườn thật của 1.33.3 trong **Anki 26.9.4 thật** (`tests/anki/mock_134.js` + `mock_134_ghep.py`, bộ thẻ mẫu
`demo_1334.py`: 38 deck có deck con, thẻ trắc nghiệm tự lật, thẻ bài đọc dài). Đồ "đặt thử" vẽ bằng chính hàm vẽ đồ của
add-on; thẻ tự lật dùng `Garden.flip()` thật; số thẻ của cây deck lấy từ `deck_due_tree()` của Anki. **Mọi chi tiết Claude
chọn — chờ người dùng duyệt.** Số bản: **1.34.0** (có tính năng mới; "1.27" / "1.29" vẫn là tên bản trong lộ trình).

| Ảnh | Nội dung |
|---|---|
| `134_01_phim_nghe_lai.png` | Số phím **1 · 2 · 3 · 4** ghi trên 4 nút chấm; nút **Nghe lại** (R) và **Phóng to** (F) ở đầu bảng ôn |
| `134_02_tu_lat.png` | Thẻ trắc nghiệm: bấm đáp án → bây giờ không lật → 1.34 tự lật như Anki |
| `134_03_phong_to.png` | Thẻ bài đọc dài: bình thường → **Phóng to** (ẩn thanh trên, chậu cây nhỏ lại, ẩn vườn; thẻ cao thêm ~200 px) |
| `134_04_an_hien_vuon.png` | Lỗi Ẩn / Hiện vườn đo ở cửa sổ 1600 × 1000: thấy 60 px vườn → ẩn → hiện lại chỉ còn 10 px → 1.34 về đúng |
| `134_05_chon_deck.png` | Ô Deck: danh sách phẳng 38 deck → nút gọn "Tiếng Nhật › N4 › **Bài 17** ▾" + cây deck như Anki, gõ để tìm |
| `134_06_trang_tri_thu.png` | Nhà → **Trang trí thử**: đồ chưa mua hiện mờ có chữ "thử", 3 bản lưu sẵn, "Dùng bản này · 550 xu" |
| `134_07_dung_ban_thu.png` | "Dùng bản này" → hộp hỏi một lần (liệt kê món phải mua) → mua + bày đúng như bản thử |

## 1. Đã thử trên bản hiện tại (1.33.3, Anki 26.9.4 thật — `tests/anki/probe_1334.js`)

| # | Thử | Kết quả bây giờ |
|---|---|---|
| a | Phím **Space / Enter / 1–4** | **Đã chạy từ 1.x** (Space lật, mặt sau Space = Được) — nhưng nút chấm không ghi số nên người dùng tưởng chưa có |
| b | Ẩn vườn → Hiện vườn (cửa sổ 1600 × 1000) | Khung thẻ 660 → 710 px và **giữ 710 px** khi hiện lại; vườn từ 60 px còn 10 px. Nguyên nhân: `toggleQuick` (`web/ui.js`) đặt cỡ thẻ "Cao" lúc ẩn mà không trả lại lúc hiện, và lưu luôn vào cài đặt |
| c | Thẻ trắc nghiệm gọi `pycmd("ans")` khi bấm đáp án | **Không lật** — cầu nối Python không biết lệnh `ans` / `ease1…4` của Anki |
| d | **Giữ phím Space ~0,4 giây** | **Chấm "Được" liền 3 thẻ** (phím lặp: lật → chấm → lật → chấm…) — chưa kịp nhìn mặt sau |
| e | Bấm vào ô chọn (radio) trong thẻ rồi nhấn Space | **Không lật** — bảng ôn coi mọi ô `INPUT` là "đang gõ chữ" |
| f | Bàn phím số khi NumLock tắt (End = 1…) | Không chấm |
| g | Phím R khi đang ôn | Không làm gì (Anki: R / F5 phát lại âm thanh) |

## 2. Làm gì

**Bảng ôn (Tưới ngay)**
1. **Ghi số phím** 1 · 2 · 3 · 4 ở góc nút chấm (như chữ "Space" trên nút Lật thẻ, "E" trên nút Sửa). Không đổi phím.
2. **Nghe lại** (nút + phím **R**, **F5** như Anki): phát lại âm thanh của mặt đang xem; mặt sau theo tuỳ chọn deck của Anki
   "Skip question when replaying answer". Thẻ không có âm thanh → nút ẩn, phím không làm gì.
3. **Thẻ tự lật / tự chấm**: hiểu lệnh của mẫu thẻ như Anki — `pycmd("ans")` lật (chỉ khi đang ở mặt trước), `pycmd("ease1…4")`
   chấm (chỉ khi đã lật). Lệnh đến lúc đang chờ thẻ kế / đang hoàn tác → bỏ qua. Sang thẻ mới thì **dọn hẹn giờ của thẻ cũ**
   (mẫu thẻ đếm ngược rồi tự lật) để thẻ cũ không lật nhầm thẻ mới.
4. **Phóng to** (nút + phím **F**): ẩn thanh trên cùng, đầu bảng ôn một dòng mỏng (chậu cây nhỏ, số thẻ, Nghe lại, Hoàn tác,
   Thu nhỏ, Dừng), ẩn vườn; thẻ chiếm gần hết cửa sổ, nút chấm thấp lại. Bấm lại / F / **Esc** là thu nhỏ (Esc lần nữa mới
   Dừng — như Nhà: Esc lần 1 thôi đặt đồ). Nhớ theo máy (config `ui`, như cỡ thẻ). F11 vẫn là toàn màn hình.
5. **Sửa Ẩn / Hiện vườn**: Ẩn vườn chỉ ẩn sân + ruộng — khung thẻ tự cao ra khi vườn ẩn (CSS theo trạng thái ẩn), không ghi
   đè cỡ thẻ đã chọn ở ⚙. Người đã lỡ bấm ở bản cũ (cài đặt đang "Cao" do nút này) → Hiện vườn trả về "Vừa".
6. **Phím chắc hơn**: bỏ qua phím lặp khi giữ phím (lật / chấm chỉ một lần mỗi lần nhấn); chỉ coi là "đang gõ" khi ở ô chữ /
   ô gõ đáp án / textarea / chỗ sửa được — bấm radio, checkbox, nút trong thẻ thì phím vẫn chạy; nhận bàn phím số theo vị trí
   phím (NumLock tắt vẫn chấm); bộ gõ tiếng Việt đang bật (Chromium gửi "Process") thì đọc mã phím vật lý.

**Ô chọn deck**
7. Thay ô thả xuống + nút kính lúp bằng **một nút gọn**: "Tiếng Nhật › N4 › **Bài 17** ▾" (tên dài cắt "…", rê chuột thấy đủ).
   Bấm (hoặc phím **/**) → **cây deck như màn Decks của Anki**: ▸ / ▾ thu gọn, thụt lề theo cấp, số thẻ **Mới / Học / Ôn** cùng
   màu với bảng ôn, deck đang xem tô vàng, mở sẵn nhánh của deck đang xem. Gõ chữ là lọc (cách so như 1.22.3: bỏ dấu, "::"
   như dấu cách, khớp nguyên cụm lên trước). Phím ↑ ↓ chọn, ← → đóng / mở nhánh, Enter mở deck, Esc đóng.
   - Đóng / mở nhánh: lúc đầu theo Anki; bấm trong vườn thì nhớ **theo máy** (không ghi vào collection — không đụng đồng bộ).
   - Số thẻ tính lúc mở cây (một lần `deck_due_tree`), không làm chậm lúc vẽ vườn. Deck "Default" trống ẩn như Anki.

**Trang trí thử (bảng Nhà)**
8. Nút **"Trang trí thử"** ở thanh trên bảng Nhà (cạnh Chụp ảnh). Bật lên: cảnh đang xem thành **bản thử** — đặt / dời / cất
   đồ tuỳ ý; mọi món bán được có nút **"Đặt thử"** (kể cả chưa mua, thiếu xu); món chưa có vẽ mờ, khung đứt + chữ "thử". Tường &
   sàn (1.30) cũng thử trong bản thử (thay "Xem thử" từng mẫu).
9. **3 bản thử mỗi cảnh** (Bản 1 · 2 · 3), tự lưu — tắt Anki mở lại vẫn còn. Vườn thật không đổi gì cho tới khi bấm **"Dùng
   bản này · N xu"** → hộp hỏi một lần (liệt kê món phải mua) → Python kiểm lại (giá, xu, số món tối đa, chỗ đặt) rồi **mua +
   bày trong cùng một lần lưu**; món đang đặt mà bản thử không dùng → Kho đồ. Thiếu xu → nút "Thiếu N xu" như nút Mua.
10. Thoát thử / đóng Nhà → về cảnh thật, bản thử giữ nguyên.

## 3. Trường hợp tìm thêm (sẽ thành test)

- Bảng ôn: giữ phím Space / Enter / 1–4; bấm Space hai lần thật nhanh; mẫu thẻ gọi `ans` hai lần, gọi lúc đang lưu lượt chấm,
  gọi `ease3` ở mặt trước, gọi sau khi đã Dừng; thẻ đếm ngược 3 giây rồi tự lật mà người dùng chấm trước đó (không lật nhầm thẻ
  mới); thẻ có radio / checkbox / `<select>` / ô gõ đáp án; nghe lại khi đang phát, khi deck tắt tự phát, mặt sau có / không
  phát lại câu hỏi; Phóng to ở cửa sổ 1024 × 640, ở màn "Hết thẻ", rồi Dừng / đổi deck / mở Nhà; Ẩn vườn → đổi cỡ thẻ ở ⚙ →
  Hiện vườn; người đã lỡ bấm ở bản cũ; Ctrl+Z / E / Esc khi đang phóng to.
- Ô chọn deck: 300 deck; tên dài / chữ Nhật / emoji; deck lọc (Filtered); deck đang xem bị xoá hoặc đổi tên ở cửa sổ chính lúc
  vườn đang mở; chọn deck cha (ôn cả deck con như Anki); đang ôn thì đổi deck; hướng dẫn 3 bước (bước 1 khung bao ô Deck).
- Trang trí thử: món đã đủ số tối đa; món của gian / vùng / giao diện mùa chưa mở, quà rương, món gánh hàng rong (không thử
  được nếu chưa có); xu đổi giữa lúc thử (bù xu điện thoại sau đồng bộ); món đang đặt ở cảnh khác; cảnh hết chỗ; bấm đúp "Dùng
  bản này"; Anki đang đồng bộ; khách / thú / StackChan sinh hoạt không dùng đồ thử; Chụp ảnh khi đang thử chụp cảnh thật; bản
  cũ (1.33.3) mở cùng collection không thấy gì lạ.

## 4. Lưu dữ liệu (giữ dữ liệu của bản đã phát hành — PHAT_TRIEN.md mục 7)

- Bảng ôn, ô deck: chỉ thêm khoá vào config `ui` / `prefs` của máy (bản cũ bỏ qua khoá lạ). Không đổi collection.
- Bản thử: **file theo hồ sơ trên máy** `user_files/ho_so/<mã>/ban_thu.json` (Claude chọn) — không vào collection nên không
  đổi "hợp đồng dữ liệu", không đồng bộ sang máy khác. "Dùng bản này" ghi đồ đạc như nút Mua / Đặt bây giờ (`commit_config`).
- Test: thêm `core/test_134.py` + `anki/e2e_134.js`; chạy `run_capnhat.sh` 1.31.3 → 1.34.0 và các kịch bản cũ.

## 5. Claude chọn (người dùng chưa xem — đổi được)

Tên nút "Nghe lại" / "Phóng to" / "Trang trí thử"; phím F; Esc lần 1 thu nhỏ; 3 bản thử mỗi cảnh; bản thử lưu theo máy; số
thẻ ở cây deck chỉ 3 cột (không có thanh tiến độ); không thêm nút "Auto Advance" (tự lật / tự chấm theo giây của tuỳ chọn deck
Anki 23.12+) — mẫu thẻ tự lật thì đã chạy; nếu cần Auto Advance thì làm bản sau.
