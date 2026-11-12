# Kế hoạch ことば畑 1.26 — màn chào + hiệu ứng chuyển cảnh + Bảng tin làng (đã chốt, ảnh phác làm lại 12/11 trên 1.25.9, chờ duyệt)

Ngày 07/11/2026. Người dùng: "tớ nghĩ bây giờ cũng xong khoảng 70-80% rồi, chốt những cái mình sẽ phát triển tiếp đi, nhằm FOMO lành mạnh, dễ thương, chill. 1 tính năng tớ nghĩ là nhỏ nhưng có thể sẽ hiệu quả (như là mới khởi động game thì chưa hiển thị vùng liền), sẽ có 1 NPC hoặc con vật ra chào mình, hiệu ứng chuyển cảnh,..."

## 0. Lộ trình đã chốt (07/11)

| Bản | Nội dung | Chi tiết |
|---|---|---|
| **1.26** | Màn chào khi mở vườn + hiệu ứng chuyển cảnh + Bảng tin làng | file này |
| 1.27 | Cây lấp lánh, rút quẻ omikuji, lịch trời Nhật (trăng thật, 二十四節気, mưa sao băng, sổ 歳時記), kỷ niệm & mốc học | `KE_HOACH_Y_TUONG_HANG_NGAY.md` ý 2, 3, 4, 5 |
| 1.28 | Nhặt đồ theo vùng + Hộp sưu tầm, gánh hàng rong | ý 6, 7 |
| 1.29 | **Nhạc làng** (tự soạn chuông làng, nhạc nền theo buổi) + **thêm hiệu ứng** | mục 6 dưới đây |

Người dùng chọn: ai chào = **thú nuôi của mình**; chào **lần mở đầu mỗi ngày**; làm **màn chào trước**. Sau 1.28: "soạn thêm hiệu ứng thôi … Nhạc làng" (không chọn thư trong hòm thư, ngày này năm trước, chấm điểm vườn; radio trùng với báo). Luật "FOMO lành mạnh" ở `KE_HOACH_Y_TUONG_HANG_NGAY.md` mục 1 áp dụng cho mọi bản.

## 1. Màn chào

- **Khi nào:** lần mở vườn đầu tiên của mỗi ngày Anki (giờ qua ngày của Anki). Các lần mở sau trong ngày chỉ có hiệu ứng chuyển cảnh ngắn. Mở thẳng vào bảng ôn / báo (nút nhanh có đích) thì không chào.
- **Màn hình:** vườn chưa hiện ngay. Cả cửa sổ là một cảnh nhỏ: trời theo giờ + dải cỏ (màu giao diện mùa), thú nuôi chạy vào từ mép, nhảy lên vẫy chào, bong bóng lời:
  - câu chào theo buổi: おはよう！ / こんにちは！ / こんばんは！ + dòng tiếng Việt nhỏ, có tên thú ("Mít: Chào buổi sáng!");
  - dưới bong bóng 1–3 dòng **tin hôm nay** (lấy từ Bảng tin, mục 3), ví dụ "Báo mới đã tới", "Hôm nay cáo có thể ghé Đền".
- **Ai chào:** thú thân nhất (cùng mức thì chọn theo ngày, cố định trong ngày). Chưa nuôi thú → **StackChan** (mặc đồ đang mặc). Thú đang "đi chơi" (đói 2 ngày) → StackChan chào, nói nhẹ "Mít đi chơi rồi, cho ăn là về" — không trách.
- **Kết thúc:** tự vào vườn sau ~4 giây (rê chuột lên màn chào thì dừng đếm), hoặc bấm / phím bất kỳ → hiệu ứng chuyển cảnh vào vườn. Không có nút phụ, không chữ hướng dẫn dài (chỉ một dòng mờ "bấm để vào vườn").
- **Vé giữ chuỗi (1.25.9):** vừa dùng vé lúc mở vườn → báo ngay trên màn chào ("Đã dùng 1 vé giữ chuỗi · chuỗi 27 ngày", thú nói "Hôm qua bận hả? Chuỗi vẫn còn nè!") thay cho thông báo nhỏ ở góc; tắt màn chào thì vẫn là thông báo nhỏ như 1.25.9.
- **Câu chào theo giao diện mùa (đề xuất, chờ duyệt):** đang bật giao diện mùa có ngày lễ thì đổi câu chào và bày vài món của mùa hai bên (Giáng sinh: メリークリスマス！ + cây thông, hộp quà, xe tuần lộc, tuyết; Tết: あけましておめでとう！…); mùa thường giữ おはよう / こんにちは / こんばんは.
- **Âm thanh:** một tiếng chuông nhỏ có sẵn (1.29 thay bằng chuông làng tự soạn). Theo nút tắt tiếng của vườn.
- **Lưu:** "đã chào hôm nay" theo máy (`localStorage`, theo số ngày Anki) — không đồng bộ, không đụng dữ liệu collection.

## 2. Hiệu ứng chuyển cảnh (kiểu game pixel cũ, ngắn, không chặn bấm)

| Lúc | Hiệu ứng | Dài |
|---|---|---|
| Màn chào → vườn | vòng tròn mở dần từ giữa (iris) | ~0,6 giây |
| Mở vườn các lần sau | iris ngắn | ~0,4 giây |
| Đổi cảnh ◂ ▸ ở màn chính (thay mờ tối hiện tại) | quét ngang theo giao diện mùa (lá / cánh hoa / bông tuyết; không có giao diện mùa thì ô vuông pixel) | ~0,35 giây |
| Vào / ra cảnh "Trong nhà" | rèm kéo | ~0,35 giây |
| Mở / đóng bảng Nhà, Trò chơi, Báo, Lịch hoa | bật nhẹ (phóng 96 % → 100 %) | ~0,15 giây |

- ⚙ → Giao diện → Màn chính: **Chào khi mở vườn: Bật / Tắt**, **Chuyển cảnh: Bật / Tắt** (khoá chung mới `greet`, `trans` trong `ui`, giữ khi bấm kiểu có sẵn như `deco`). Kiểu "Dịu mắt" và "Tắt hạt bay" thì chuyển cảnh chỉ còn mờ dần.

## 3. Bảng tin làng

- **Một dòng** trong thẻ Hôm nay: "Tin làng ▸" kèm tin đầu tiên, chỉ hiện khi có tin chưa nằm sẵn trong thẻ (không lặp Nhiệm vụ / Báo / thú đói). Bấm → bảng nhỏ:
  - **Hôm nay:** khách có thể ghé (khách nặng ký nhất theo đồ / vùng / tháng, `guest_core.weight`), giao diện mùa đang có, nhà cần sửa, thú cần cho ăn, mốc sắp chạm (vd. "còn 3 ngày nữa đủ 100 ngày có ôn"), số vé giữ chuỗi đang có (1.25.9);
  - **Sắp tới (7 ngày):** giao diện mùa sắp bắt đầu / kết thúc, gói báo sắp hết hạn (1.25.1, ghi "tự gia hạn" nếu bật). 1.27 thêm tiết khí, quẻ, sao băng; 1.28 thêm phiên gánh hàng.
- **Nguồn tin:** Python, module mới `event_core.py` (thuần, test offline bằng ngày giả) tổng hợp theo ngày Anki từ dữ liệu có sẵn; JS chỉ vẽ. Không khoá dữ liệu mới ở 1.26.
- Chữ ngắn, một tin một dòng (người dùng: "không cần giải thích dài dòng").

## 4. Cách làm

1. **Ảnh phác** trong Anki thật (như 1.25): màn chào (thú / StackChan, sáng / tối, có / không tin), 3 kiểu chuyển cảnh (ảnh từng khung), dòng Tin làng + bảng nhỏ → người dùng duyệt.
2. Mã: `web/greet.js` (màn chào + chuyển cảnh, dùng hình thú của `pets.js`, StackChan, trời của `sky.js`), `event_core.py` + dữ liệu tin trong `data`, thẻ Hôm nay (`garden.js`), ⚙ (`ui.js`, `more_core.UI_GLOBAL` + `UI_KEEP_ON_PRESET`).
3. Test: `tests/core/test_126.py` (tin theo ngày, khách gợi ý cố định trong ngày, sắp tới 7 ngày, khoá `greet` / `trans`); `tests/anki/e2e_126.js` (lần mở đầu có màn chào + thú đúng, tự vào sau ~4 s, bấm bỏ qua, lần mở thứ hai không chào, chưa nuôi thú → StackChan, thú đi chơi, tắt ở ⚙, mở thẳng bảng ôn không chào, chuyển cảnh ◂ ▸ / Trong nhà không chặn bấm, Dịu mắt, 720 × 520, không lỗi JS); chạy lại bộ cũ (26.9.4 đầy đủ + 23.10.1), `audit_full` / `audit_edge` (màn chào không chặn kịch bản cũ: test đặt sẵn "đã chào").
4. Tài liệu: `PHAT_TRIEN.md` mục 2.6u (2.6t là bản 1.25.1), `config.md` (`ui.greet`, `ui.trans`), README, `tests/README.md`; xoá file này khi xong.

## 5. Câu hỏi để lúc làm ảnh phác (không chặn kế hoạch)

- Câu chào có đổi theo giao diện mùa / ngày lễ không (vd. Tết: あけましておめでとう)? Đề xuất: có, vài câu theo mùa.
- Thú có món quà nhỏ thỉnh thoảng (sticker nhật ký) khi chào không? Đề xuất: chưa, để 1.28 (gắn với Hộp sưu tầm).

## 5b. Ảnh phác giao diện 1.26 → 1.29

07/11 người dùng: "soạn trước giao diện cho các phần trên đi" → ảnh phác 1.26 → 1.29 trên vườn bản 1.22 (`mock_126.js`). **12/11** người dùng: "làm ảnh phác đi" → **làm lại phần 1.26** trên giao diện 1.25.9 (nhà 3 gian, thẻ Hôm nay mới, Trong nhà ở ◂ ▸, vé giữ chuỗi), cửa sổ 1366 × 860: `tests/anki/mock_126_v2.js` (+ `mock_126_lib.js`) trên bộ thẻ mẫu `setup_demo.sh`, chuyển cảnh ghép bằng `mock_126_v2_ghep.py`. Ảnh 1.27 → 1.29 vẫn là bản 07/11. Ảnh ở `docs/ke_hoach_1_26/`:

| Ảnh | Bản | Nội dung |
|---|---|---|
| `126_01_chao_sang.png` | 1.26 | màn chào sáng: mèo "Mít" nhảy vẫy, おはよう！, 3 tin hôm nay, "bấm để vào vườn" + chấm đếm |
| `126_02_chao_toi_stackchan.png` | 1.26 | chưa nuôi thú → StackChan chào, buổi tối có sao |
| `126_03_chao_thu_di_choi.png` | 1.26 | thú đang đi chơi → StackChan báo nhẹ |
| `126_04_chao_ve_giu_chuoi.png` | 1.26 (mới 12/11) | quên ôn hôm qua → màn chào báo đã dùng vé giữ chuỗi, chuỗi 27 ngày vẫn còn |
| `126_05_chao_theo_mua.png` | 1.26 (đề xuất 12/11) | câu chào theo giao diện mùa: Giáng sinh メリークリスマス！ + đồ của mùa + tuyết |
| `126_06_tin_lang.png` | 1.26 | dòng "Tin làng ▸" trong thẻ Hôm nay + bảng Hôm nay (khách, mùa, nhà, mốc, vé giữ chuỗi) / Sắp tới (giao diện mùa, gói báo) |
| `126_07_cai_dat.png` | 1.26 | ⚙ → Màn chính: Chào khi mở vườn, Chuyển cảnh (khung đỏ = dòng mới) |
| `126_08_chuyen_iris.png` · `126_09_chuyen_la.png` · `126_10_chuyen_rem.png` · `126_11_bat_nhe.png` | 1.26 | khung hình chuyển cảnh: vòng tròn (màn chào → vườn), dải lá (◂ ▸ giữa các vùng), rèm (Sân vườn ⇄ Trong nhà), bật nhẹ khi mở bảng |
| `127_01_cay_lap_lanh.png` | 1.27 | 3 cây đến hạn phát sáng + thẻ cây "Cây lấp lánh" |
| `127_02_que.png` | 1.27 | hộp quẻ ở Đền + tờ quẻ 中吉 (学問 / 待ち人 / 失せ物 / từ may mắn) |
| `127_03_dem_sao_bang.png` | 1.27 | trăng lưỡi liềm thật + mưa sao băng, dòng Tin làng |
| `127_04_saijiki.png` | 1.27 | sổ 歳時記 (đã thấy / chưa thấy) |
| `127_05_moc_hoc.png` | 1.27 | mốc 100 ngày có ôn: dải chúc, mũ tiệc StackChan, bánh trong nhà |
| `128_01_nhat_do.png` | 1.28 | chỗ lấp lánh ở Bãi biển + nhặt được 貝殻 |
| `128_02_hop_suu_tam.png` | 1.28 | Album · Hộp sưu tầm (tên Nhật + cách đọc, ô chưa nhặt) |
| `128_03_ganh_hang.png` | 1.28 | gánh hàng rong ở Ga + bảng hàng (món hiếm, −25 %, giống cây) |
| `129_01_chuong_lang.png` | 1.29 | bảng soạn chuông làng 16 nốt + nhạc theo buổi |
| `129_02_hieu_ung.png` | 1.29 | nắng xiên + sương sớm, bụi lấp lánh khi đặt đồ |

## 6. Ghi chú cho 1.29 (Nhạc làng + thêm hiệu ứng)

- **Chuông làng:** tự soạn 8–16 nốt trên bảng nốt pixel (dùng bộ phát của `music.js`), phát ở màn chào, khi có báo mới, khi đủ mục tiêu ngày. Lưu trong collection (đồng bộ).
- **Nhạc nền theo buổi:** sáng / trưa / chiều / tối / đêm mỗi buổi một bài (giao diện mùa vẫn ưu tiên nhạc riêng).
- **Hiệu ứng thêm** (chọn khi làm): nắng xiên buổi sáng, sương sớm, gió thổi lá ngang, bụi lấp lánh khi mua / đặt đồ, cây lên giai đoạn có vòng sáng, đom đóm theo mùa ở vùng, pháo hoa nhỏ khi xong 3 nhiệm vụ.
