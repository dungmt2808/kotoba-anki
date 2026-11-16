# Báo cáo 1.31.4 — Ctrl+Z trong bảng ôn, nhận đúng deck tiếng Trung, cập nhật không mất dữ liệu (16/11/2026)

Bản đầu tiên sau khi phát hành công khai 1.31.3 (tối 15/11). Người dùng: "có người góp ý là thêm phím tắt Ctrl Z cho thẻ … làm 1.31.4 đi. nhưng nhớ hiện tại bây giờ đã phát hành addon rồi, nên khi update đảm bảo dữ liệu người dùng không bị mất nhé".

## 1. Đã làm

| | Trước (1.31.3) | Nay (1.31.4) |
|---|---|---|
| Chấm nhầm khi ôn trong vườn (Tưới ngay) | phải sang cửa sổ chính của Anki → Edit → Undo | **Ctrl+Z** (macOS: ⌘Z) hoặc nút **"↶ Hoàn tác"** ngay trong bảng ôn; thẻ vừa chấm hiện lại mặt trước, xu của lượt đó trả lại; hoàn tác được nhiều lượt liền, cả ở màn "Hết thẻ" |
| Sau lượt chấm có sửa note / chấm thẻ ở chỗ khác / đổi deck | (không có Ctrl+Z trong vườn) | Ctrl+Z ở vườn **không hoàn tác nhầm** thao tác kia — báo "Không có lượt chấm nào để hoàn tác." |
| Deck tiếng Trung dùng loại note "Basic" | bị đoán là deck chữ Hán **tiếng Nhật** → trò chơi tìm cách đọc kana, gõ pinyin ở Đuổi quạ bị chấm sai, từ tiếng Trung lọt vào báo tiếng Nhật | nhận là **"Ngôn ngữ khác"**; deck tiếng Nhật (kể cả deck chỉ chữ Hán) đoán y như cũ |

![Nút ↶ Hoàn tác sau khi chấm một thẻ](1314_01_nut_hoan_tac.png)

![Ctrl+Z: thẻ vừa chấm hiện lại, câu báo nằm trong bảng ôn](1314_02_sau_hoan_tac.png)

![Màn Hết thẻ vẫn hoàn tác được thẻ cuối](1314_03_het_the_hoan_tac.png)

![Sau khi cài đè 1.31.4 lên 1.31.3: vườn còn nguyên](1314_04_sau_khi_cap_nhat.png)

Chi tiết Claude chọn (người dùng chưa xem): nút chỉ hiện khi có lượt để hoàn tác; câu báo nằm trong bảng ôn dưới tên giai đoạn của chậu (bản đầu dùng thông báo nổi — đè lên nút Lật thẻ nên đã đổi); không có Redo trong vườn (Redo vẫn ở Edit của cửa sổ chính); Ctrl+Z chỉ có tác dụng khi bảng ôn đang mở.

## 2. Dữ liệu khi cập nhật (yêu cầu của người dùng)

- **Bản này không đổi gì của phần lưu trữ.** So với gói 1.31.3 đã phát hành (`e64eb22`): 58 / 66 file giống hệt từng byte (mọi kho lưu, sao lưu, đồng bộ, báo, nhật ký…); `config.json` giữ nguyên (không thêm / bỏ mục cấu hình); `garden_core.py` = bản cũ + đúng một hàm; `fields_core.py` chỉ đổi phần đoán ngôn ngữ; `__init__.py` không thêm / bỏ chỗ ghi dữ liệu nào (`core/test_1314.py` mục 1 kiểm tự động).
- Đổi cách đoán ngôn ngữ chỉ ảnh hưởng loại note **chưa lưu** ở Cấu hình trường; lựa chọn đã lưu giữ nguyên, lựa chọn deck của báo không bị lọc. 92 mẫu deck không phải tiếng Trung (chữ Hán N5 / N4, 1.693 từ tiếng Nhật của dữ liệu thử, tiếng Hàn, Anh, Việt) cho **đúng kết quả như mã 1.31.3 thật**.
- **Thử đúng đường cập nhật trong Anki thật** (`tests/anki/run_capnhat.sh`): Anki với gói 1.31.3 đã phát hành → ôn 3 thẻ trong vườn, xây nhà, mua / đặt đồ, mở Bãi biển, nuôi mèo, tường anh đào, mũ rơm, viết nhật ký, sổ sinh hoạt, ⚙ Mưa → cài đè gói 1.31.4 bằng trình quản lý add-on của Anki (cùng đường với *Install from file* / *Check for Updates*) → đóng Anki → mở lại:
  - 11 / 11 khoá dữ liệu trong collection giữ nguyên nội dung, 48 / 48 file trong `user_files/` không đổi, cấu hình add-on (⚙, khoá Gemini, mục tiêu ngày…) giữ nguyên;
  - vườn hiện đúng 93.124 xu, đồ trên sân, nhật ký, Mưa; ôn 1 thẻ rồi Ctrl+Z trên dữ liệu cũ: xu / lượt ôn về như trước.
- Máy chưa cập nhật (còn 1.31.3) đồng bộ AnkiWeb với máy đã cập nhật: `core/test_ban_cu.py` thêm 1.31.3 — mã 1.31.3 thật đọc, dùng, lưu vườn đầy đủ rồi bản mới đọc lại không mất gì.
- Anki giữ thư mục `user_files/` khi cài đè (`AddonManager._install` chuyển ra `files_backup` rồi trả lại; file trùng tên trong gói bị bỏ qua) — gói chỉ có `user_files/README.txt`.

## 3. Kết quả test

| Bộ | Kết quả |
|---|---|
| `core/test_1314.py` (mới, `ANKI_PY`) | 39 / 39 (không có gói anki: 27 / 27) |
| `core/test_ban_cu.py` (+ 1.31.3) | tất cả OK (7 bản cũ) |
| `tests/run_all.sh` (`ANKI_PY` = aqt 26.9.4) | **55 bộ, tất cả OK** (có `dong_bo/test_dong_bo.py` — máy chủ đồng bộ thật, `audit_20261114` 2.047 + 172 ca); lần đầu trượt 1 kiểm tra của trang web (hình ghi "xuất từ 1.31.3") → chạy `node site/tools/xuat_hinh.js` (chỉ đổi số bản) → `trang/test_trang.py` 35 / 35 |
| `anki/e2e_1314.js` (mới, Anki 26.9.4 thật) | **53 / 53** (13 kịch bản, cả phím Ctrl+Z thật qua Qt hoàn tác đúng một lượt, không có thông báo nổi đè nút Lật thẻ, bàn phím AZERTY / QWERTZ / Nga, bấm dồn, bấm lúc đang lưu, đóng vườn giữa chừng) |
| `anki/run_capnhat.sh` + `e2e_capnhat.js` (mới, 1.31.3 → 1.31.4) | **17 / 17** trên gói đã đóng (5 trước + 12 sau khi cập nhật) |
| Kịch bản cũ có ôn thẻ / Undo (Anki 26.9.4): `e2e.js`, `e2e_117.js`, `e2e_118.js`, `e2e_1253.js`, `e2e_1226.js`, `e2e_123.js` | `e2e.js` 24 / 24 · `e2e_118` 29 / 29 · `e2e_1253` (Undo / Redo ở cửa sổ chính) 39 / 39 · `e2e_1226` 40 / 40 · `e2e_123` 66 / 66 · `e2e_117` 53 / 55 — 2 kiểm tra bố cục (độ rộng tab Nhà 110 / 128, chiều cao ô Ví / nút Thoát) **trượt y hệt trên mã 1.31.3 gốc** ở máy test này → có từ trước, không do 1.31.4 (font của máy test; chưa sửa) |
| `core/test_1314.py` phần collection trên **Anki 23.10.1** (bản thấp nhất add-on hỗ trợ) | 38 / 38; thẻ vừa hoàn tác cũng lên đầu hàng đợi; `aqt` 23.10.1 có đúng `CollectionOp` / móc `state_did_undo` như 26.9.4 |

## 4. Rà soát lần cuối (người dùng: "kiểm tra lại lần cuối nhé")

Đọc lại toàn bộ thay đổi so với 1.31.3 và thử thêm các tình huống ngoài bộ test đã có:

| Tình huống | Kết quả |
|---|---|
| Bàn phím AZERTY (Pháp) bấm Ctrl+W, QWERTZ (Đức) bấm Ctrl+Y — cùng phím vật lý với Z của bàn phím Mỹ | **Lỗi ở bản đầu: hoàn tác nhầm.** Đã sửa: phím vật lý chỉ tính khi phím ra chữ không phải Latin (bàn phím Nga). QWERTZ Ctrl+Z, bàn phím Nga Ctrl+я vẫn hoàn tác |
| Bấm Ctrl+Z lần nữa khi lượt trước còn đang hoàn tác | chỉ một lượt; bấm lại sau khi xong thì lùi tiếp (như Edit → Undo của Anki) |
| Ctrl+Z đúng lúc lượt chấm đang lưu | lượt chấm vẫn lưu, không kẹt; Ctrl+Z sau đó hoàn tác đúng lượt ấy |
| Đóng cửa sổ vườn ngay khi đang hoàn tác | lượt vẫn hoàn tác, xu vẫn trả lại, mở lại vườn hiện đúng |
| Anki 23.10 (bản thấp nhất add-on hỗ trợ) | cùng cách hoàn tác (`CollectionOp`, móc `state_did_undo`, tên bước "Answer Card"); cú pháp chạy được trên Python 3.9 |
| Phần "hợp đồng dữ liệu" của test sẽ trượt ở mọi bản sau (vì bản sau sửa thêm file) | chỉ chạy khi add-on là 1.31.4; bản sau viết hợp đồng của mình (PHAT_TRIEN.md mục 7) |
| `docs/ANKIWEB.md` còn ghi bản 1.31.3 | đã sửa thành 1.31.4 |

Người đang dùng deck tiếng Trung mà chưa bấm Lưu ở Cấu hình trường: sau khi cập nhật, deck đó thành "Ngôn ngữ khác" → trò chơi của deck đó về chế độ mặc định của nhóm này (chế độ đã chọn cho nhóm tiếng Nhật vẫn lưu nguyên, không mất).

## 5. Nên thử trên máy thật (5 phút)

1. Cài đè 1.31.4 lên 1.31.3 đang dùng (Tools → Add-ons → *Install from file…*, hoặc khi đã đăng AnkiWeb: *Check for Updates*), khởi động lại Anki, mở vườn: xu, đồ, nhật ký, ⚙ như cũ.
2. Tưới ngay → chấm một thẻ → **Ctrl+Z**: thẻ vừa chấm hiện lại, số xu trên cùng giảm lại đúng số vừa cộng.
3. Chấm lại thẻ đó: xu cộng lại đúng một lần.
4. (macOS) thử ⌘Z; (Windows) thử với bộ gõ tiếng Việt đang bật.
5. Có deck tiếng Trung: mở ⚙ Cấu hình trường — loại note của deck đó ghi "Ngôn ngữ khác" (nếu trước đây đã bấm Lưu với "Tiếng Nhật" thì đổi tay).
