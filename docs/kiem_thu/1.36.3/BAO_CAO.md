# Báo cáo 1.36.3 — vẽ tay cho Giáng sinh: vẽ lên thiệp + quả châu tự vẽ (25/11/2026)

Người dùng 25/11: "giáng sinh hiện tại có nên thêm tự vẽ cái nào không, thiệp/đồ trang trí. để người đó có thể có 1 cái gì đó
riêng với mỗi người chơi" → Claude đề xuất (1) vẽ lên thiệp, (2) quả châu tự vẽ → "1 và 2 luôn nhé. duyệt trước rồi làm" → ảnh
phác `docs/ke_hoach_ve_tay/` → **"duyệt"**.

Làm đúng như ảnh phác đã duyệt. Nhánh `claude/dazzling-davinci-k0rrza`. **Không thêm khoá collection, không thêm mục config.json**
(test so với 1.36.2); dữ liệu chỉ thêm `"d"` trong thiệp và `"orn"` trong sổ `kotoba_batake_le`.

## 1. Đã làm

### 1.1 Vẽ lên thiệp
- Xưởng thiệp (tủ lịch → Làm thiệp điều ước ▸) có thẻ **"✎ Vẽ"** cạnh Có sẵn / Tủ lịch / Đồ của bạn. Ở thẻ Vẽ: kéo chuột trên thiệp
  là vẽ (không chọn / kéo sticker); về thẻ khác thì kéo sticker như cũ.
- **Bút / Tẩy**, cỡ **1 · 2 · 3**, **Hoàn tác** (nút, hoặc Ctrl+Z khi đang ở thiệp; 30 bước, mỗi nét một bước), **Xoá hình vẽ** (hỏi
  trước), **32 màu** của Xưởng (cùng bảng màu món tự làm). Chuột kéo nhanh vẫn ra nét liền (nối các điểm chuột).
- Lớp: nền khung → sticker → **hình vẽ** → viền khung → chữ (lời chúc, câu chúc luôn đọc được). Mặt sau (điều ước) không vẽ.
- Hình vẽ đi theo thiệp: **ảnh PNG**, **mã thiệp `KBC1:`** (bạn dán vào vườn hoặc trang web đều thấy hình vẽ), thư sáng 25, Album →
  Kỷ niệm. Thiệp nhỏ treo trên cây vẫn là hình thiệp chung (như trước — không có sticker).
- Dòng **"Mã thiệp: N / 6.000 ký tự"** cập nhật sau mỗi lần lưu. Vẽ dày quá (vd. tô nhiễu kín thiệp) → dòng đỏ, "Chép mã thiệp" báo
  "Hình vẽ nhiều quá để gửi bằng mã — lưu ảnh PNG gửi bạn nhé." Thiệp vẫn lưu, vẫn treo, vẫn lưu ảnh. Thiệp chỉ có sticker: mã như cũ.

### 1.2 Quả châu tự vẽ
- Tủ lịch → **"Vẽ quả châu ▸"** (1/12 – 31/12, cả khi chưa mở ngăn cây nào); Album → Kỷ niệm cũng có nút. Không tốn xu.
- **3 quả**, mỗi quả lưới **8 × 8**, nền trong suốt, móc vàng tự thêm. Bút / Tẩy / Hoàn tác / Xoá, 32 màu, xem trước ngay trên cây
  thông. Quả mới vẽ **tự treo**; nút "Gỡ quả N khỏi cây" / "Treo quả N lên cây". Lưu ảnh PNG.
- Treo ở **3 chỗ cố định** trên **mọi cây thông** ngoài sân (trái dưới, phải dưới, giữa trên), trước thiệp nhỏ đang treo.
- **Tối 24** ông già Noel thấy (sổ chụp `"orn"` lúc ông ghé) → **thư sáng 25** thêm: "Quả châu cháu tự vẽ treo trên cây, ông nhìn là
  nhận ra ngay — chẳng nhà nào có quả giống thế."
- Từ 1/1 (hết mùa): cây không còn quả; quả châu ở **Album → Kỷ niệm** (xem, mở bảng chỉ xem, lưu ảnh). Chưa gửi được quả châu qua mã.

### 1.3 Lưu như thiệp (không mất bản đang vẽ)
- Tự lưu (thiệp như 1.36.1; quả châu sau 0,6 giây). Đóng cửa sổ vườn / hồ sơ ngay sau khi vẽ: bản đang vẽ đã gửi `le:keep` → Python
  lưu nốt. Anki đang đồng bộ: lệnh bị bỏ có trả lời → trang báo một câu, giữ bản vẽ, đồng bộ xong tự gửi lại.
- Esc: chỉ đóng bảng quả châu (cửa sổ vườn còn); phím tắt màn chính không chạy khi bảng mở.

### 1.4 Trang web
- `site/thiep.js` đọc + vẽ hình vẽ trong mã thiệp, giống hệt add-on (test so từng điểm ảnh trên 720 thiệp có hình vẽ ngẫu nhiên).
- Mục Giáng sinh 2026: thêm bước "✎ Vẽ" ở cách làm thiệp + hỏi đáp "Quả châu tự vẽ là gì?"; thiệp mẫu có hình vẽ (bông tuyết, tim).

## 2. Dữ liệu

| Chỗ | Thêm | Ghi chú |
|---|---|---|
| thiệp (`noel2026.cards[i]`) | `"d"`: hình vẽ 120 × 80 nén theo hàng ("5.3kky", màu của Xưởng, "." trong suốt) | làm sạch khi đọc: hỏng / màu lạ / trống → bỏ hình vẽ, giữ thiệp; dạng gọn duy nhất ≤ 9.600 ký tự |
| sổ (`noel2026.orn`) | `[{p: 64 ký tự, on: 0 \| 1, at} \| {at} (đã xoá) \| null] × 3` | chỉ có khi đã vẽ; hai máy gộp từng quả theo lần sửa sau |

- Bản **1.31.3** (đã phát hành) không đọc `kotoba_batake_le` → không đụng (test hạ bản / lên lại có hình vẽ + quả châu).
- Bản **1.36.2** (chưa phát hành) ghi sổ 1.36.3: quả châu giữ (khoá lạ của sổ được giữ), **hình vẽ trên thiệp mất** (1.36.2 làm sạch
  thiệp). Vì 1.36.0–1.36.2 chưa phát hành: **phát hành thẳng 1.36.3**, không phát hành 1.36.2 riêng.

## 3. Test

| Test | Kết quả |
|---|---|
| `tests/core/test_1363.py` (mới) | **63/63** (4 hạt giống) — giải mã chặt 13 kiểu hỏng, 300 hình ngẫu nhiên, `code_len` = mã thật, quả châu luật ngày, 400 lần hai máy + đồng bộ chen ngang có đối chứng, LeStore, **mã 1.36.2 thật** chạy chen, hợp đồng dữ liệu |
| `tests/core/test_1363.js` (mới, Chromium) | **23/23** (ca "thả chuột ngoài cửa sổ" và "bảng Nhà dựng lại khi đang gõ mã thiệp" đỏ trên mã trước khi sửa) |
| `tests/anki/e2e_1363.js` (mới, Anki thật, chuột thật) | 26.9.4: **43/43** (thư mục) · gói đã giải nén: **44/44** (thêm cửa sổ 1024 × 680) · 23.10.1: **SO_V2** |
| `tests/trang/kiem_tra_trang.js` · `test_trang.py` | **119/119** · **44/44** (thêm hình vẽ: 720 lần vẽ, mã sửa tay / hỏng có hình vẽ) |
| test cũ: `e2e_1361.js`, `e2e_1362.js`, `e2e_136.js` | 26.9.4: **81/81**, **40/40**, **SO_136** · 23.10.1: **SO_V_OLD** |
| `tests/run_all.sh` (bộ đầy đủ, gói đã giải nén) | **SO_RUNALL** |
| `run_capnhat.sh` (1.31.3 → 1.36.3) · `run_habanh.sh` (1.36.3 → 1.31.3 → 1.36.3, có hình vẽ + quả châu) | **SO_CN** · **SO_HB** |

Lần chạy đầu / rà lại mã bắt được (đã sửa, có test đỏ trên mã trước khi sửa):
- dòng "Mã thiệp" dùng `toLocaleString` (dự án bỏ từ 1.30.3 vì cách nhóm số tuỳ máy — `test_1303.py`) → `kbXu`;
- kéo chuột nhanh trên lưới quả châu nhảy cóc ô → nối ô;
- nhấn chuột trên thiệp / lưới, kéo ra ngoài cửa sổ vườn rồi thả ở đó (trang không nhận "mouseup") → đưa chuột vào lại vẫn đang vẽ →
  di chuột mà nút trái không còn giữ thì kết thúc nét;
- **có từ trước (1.36.1)**: bảng Nhà dựng lại danh sách mỗi khi dữ liệu vườn đổi (khách ghé vườn, tự lưu…) → ô đang gõ (mã thiệp ở
  Album → Kỷ niệm, tên thú…) mất con trỏ. Anki 23.10.1 chạy chậm bắt được (gõ mã giữa lúc "Khách mới ghé vườn") → dựng lại thì giữ
  con trỏ + vị trí gõ ở ô đang gõ;
- phần trang web làm sáng 25/11: mục "giang-sinh" chưa có trong `diag.SITE_PARTS` (`test_1313.py`) → thêm; một dòng test có chữ Nhật +
  chữ Trung cùng dòng (`test_1314.py` soát chữ) → tách dòng.

## 4. Claude chọn (ngoài ảnh phác)

Hoàn tác 30 bước + Ctrl+Z; quả châu tự lưu sau 0,6 giây; câu thư sáng 25 về quả châu; quả châu chưa gửi qua mã; ông già Noel chỉ "thấy"
quả châu khi có quả đang treo **và** cây thông đang bày ngoài sân.

## 5. Xem trên máy thật (1.36.3)

(⚙ → Xem thử sự kiện cần file `user_files/admin`; hoặc đợi 1/12.)
1. Tủ lịch → Làm thiệp điều ước ▸ → thẻ **✎ Vẽ** → vẽ vài nét, đổi màu / cỡ, Tẩy, Hoàn tác, Ctrl+Z → về thẻ Có sẵn kéo sticker được.
2. Đóng cửa sổ vườn ngay sau khi vẽ → mở lại: nét vẽ còn.
3. Chép mã thiệp → dán ở Album → Kỷ niệm (hoặc trang web, mục Giáng sinh → Xem thiệp): thấy hình vẽ. Lưu ảnh PNG: có hình vẽ.
4. Tủ lịch → **Vẽ quả châu ▸** → vẽ một quả → đóng bảng → cây thông ngoài sân có quả (phóng to cảnh để nhìn rõ).
5. (Xem thử 24/12 tối) cảnh ông già Noel → (25/12) thư có câu về quả châu.

## 6. Còn chưa làm / chờ người dùng

- Xem trên máy thật rồi phát hành **1.36.3** (gồm 1.36.0–1.36.2) ~30/11–2/12.
- Gửi quả châu qua mã (nếu người chơi muốn), các ý còn lại ở PHAT_TRIEN.md mục 10.0f; nội dung dài hạn mục 10.0g (chờ chọn).
