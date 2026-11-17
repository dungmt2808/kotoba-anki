# Báo cáo 1.31.5 — báo bền hơn mà vẫn dư lượt Gemini (16/11/2026)

Người dùng: "báo đã viết được 1 tháng, 3 tháng, 1 năm thì diễn biến câu chuyện thế nào, có được liền mạch không" → "nghĩ thêm đi bạn, quan trọng là làm sao lượt gọi gemini vẫn dư … google vừa ra model mới tối ưu hơn, hydrogen" → ảnh hạn mức AI Studio → "oke".

## 1. Hạn mức và cách chia việc

Hạn mức miễn phí (ảnh AI Studio của người dùng, 16/11):

| Model | Mỗi phút | Mỗi ngày | 1.31.5 dùng cho |
|---|---|---|---|
| Gemini 4 Hydrogen | 5 | 20 | **sáng tác**: lập đợt, viết truyện, biên tập, viết lại, kể lại sang Nhật / Anh, viết + soát số báo Nhật / Anh |
| Gemini 3.8 Flash | 5 | 20 | dự phòng khi Hydrogen hết lượt |
| Gemini 3.5 Flash Lite | 15 | 500 | **kiểm**: Gemini sửa sau máy kiểm, số báo tiếng Việt, thử khoá, dịch số cũ, luyện viết |
| Gemini 3.8 Flash TTS | 3 | 10 | giọng đọc — nay cách nhau ≥ 21 giây (trước tạo liền 8 câu, đã vượt mức phút 5/3) |

Một ngày có báo Nhật + báo Anh cần khoảng 8–12 lượt chữ: Hydrogen ~6/20, Lite vài lượt / 500, 3.8 Flash gần như còn nguyên để dự phòng. Trước 1.31.5, add-on bỏ qua Hydrogen (tên không có "flash" / "pro") và dồn mọi việc vào 3.8 Flash — chậm (91 giây một kỳ truyện so với 13 giây của Hydrogen) và sát trần 20 lượt.

Không cần thêm khoá Gemini: hạn mức tính theo **project**, thêm khoá cùng project không thêm lượt. Khoá của tài khoản khác chỉ dùng để test (để test không ăn vào lượt báo của người dùng).

## 2. Sổ tay làng — truyện nhớ cả năm, không thêm lượt gọi

| | 1.31.4 | 1.31.5 |
|---|---|---|
| Lập đợt mới (mỗi tuần) thấy | tóm tắt 8 kỳ gần nhất | + sổ tay: mọi đợt đã viết (24 đợt gần nhất đủ một dòng, cũ hơn chỉ tên), nhân vật phụ đã gặp, điều đã thành sự thật |
| Nhà văn mỗi ngày thấy | kỳ trước + các kỳ trong đợt | + điều đã thành sự thật, "đã N ngày trôi qua" khi nghỉ, "ngày này năm trước" (cho tin làng) |
| Lưu tóm tắt | 60 kỳ gần nhất | mọi kỳ (truyen.json vẫn 60 kỳ cho bản cũ) |
| Lượt gọi 1 năm (Gemini giả, 357 ngày viết) | 765 | **765** |

Ai ghi sổ tay: máy tự ghi khi hết một đợt (tên, cách kết, nhân vật phụ — dữ liệu đã có sẵn); "điều đã thành sự thật" do Gemini trả kèm **trong chính lượt lập đợt mới**.

Mô phỏng 365 kỳ (`tests/tools/mo_phong_truyen.py`): lúc lập đợt 14 (khoảng 3 tháng), Gemini thấy nhân vật phụ + sợi chỉ của **cả 13 đợt trước** (1.31.4: chỉ 2 đợt gần nhất).

## 3. Gemini thật (khoá của người dùng, 7 / 20 lượt Hydrogen)

Một ngày bản gốc, bộ nhớ dựng sẵn: đợt "Căn phòng số 0" vừa xong (chìa khoá số 0 → căn phòng đầy thư → góc đọc thư, còn một lá thư chưa có người nhận). **4 lượt, 37 giây, cả 4 qua Hydrogen.** Sổ tay ghi đợt vừa xong; đợt mới "Bưu kiện mùa lá đỏ" (bác đưa thư muốn giao bưu kiện cuối cùng trước khi nghỉ hưu); kỳ 22:

> "Cháu pha giúp bác ấm trà nóng nhé, ngoài đường sương mù lạnh quá!" Bác đưa thư bước vào Quán Kotoba, tay ôm một gói bưu kiện nhỏ bọc giấy nâu. […] Tên và địa chỉ người nhận đã biến mất hoàn toàn, chỉ còn sót lại một hình vẽ chiếc lá phong đỏ rất rõ nét ở góc giấy.
>
> Lin rút cuốn sổ nhỏ từ túi tạp dề ra: "Để em ghi lại đã! Chắc chắn có manh mối gì đó." StackChan từ góc đọc thư chạy lại […] "Tớ biết lá phong đỏ! Nó mọc ở ngoài vườn. Vậy gói này gửi cho cái cây ạ?"
>
> […] "Hình vẽ này..." chị nói khẽ, giọng hơi run. "Ngày xưa, có một người hay ngồi ở hiên sau của quán cũng thích vẽ lá phong như thế."

Thoại có ngoặc kép, StackChan ở "góc đọc thư" của đợt trước, móc câu tốt.

**Lỗi thấy khi thử thật, đã sửa**: lần đầu Gemini ghi vào sổ tay "Bác đưa thư **đã** nghỉ hưu…" — lấy từ đợt mới đang lập, không phải chuyện đã xảy ra. Sửa: khuôn bắt viết "điều đã thành sự thật" **trước** mạch mới, lời dặn chỉ lấy từ các kỳ đã đăng, ở thì quá khứ, không chắc thì để trống; đợt đầu tiên không ghi. Thử lại (1 lượt): "Căn phòng số 0 sau bức tường giả đã trở thành góc đọc thư của quán." · "Quán vẫn còn một lá thư cũ chưa có người nhận." — đúng.

### Gemini thật 10 ngày liền (khoá test, 16/11)

`tests/gemini/run_so_tay.py`, nghỉ 4 ngày sau ngày thứ 6. Toàn văn truyện: [truyen_that_10_ngay.md](truyen_that_10_ngay.md).

| Ngày | Kỳ | Truyện | Model |
|---|---|---|---|
| 01/11 | 1 | Lin nhặt được chiếc hộp gỗ khắc chìa khoá gãy dưới gốc phong; vị khách áo khoác dạ nhìn nó rất lâu | Hydrogen ×3 (lập đợt, viết, biên tập) |
| 02/11 | 2 | Lin nói nhầm khi làm thủ tục cho vị khách; StackChan vẽ tranh pixel có bóng người dưới gốc phong | Hydrogen ×3 (có viết lại) |
| 03/11 | 3 | Ông trưởng làng kể lan man, vừa nhắc tới "người bạn cũ của chị Hana" thì phải đi nấu cơm | Hydrogen ×3 (có viết lại) |
| 04/11 | 4 | Vị khách dò hỏi lối ra sau vườn; chị Hana điềm tĩnh lạ thường | Hydrogen ×2 |
| 05/11 | 5 | StackChan tìm thấy chìa khoá trong kho củi; trong hộp có thư phai mực + nửa tấm ảnh chàng trai trẻ | Hydrogen hết lượt giữa chừng → **3.8 Flash** |
| 06/11, 11–13/11 | — | 3.8 Flash quá 240 giây / mất kết nối → không có bản gốc | 3.8 Flash |
| 14/11 | 6 | Nhờ StackChan, Lin nhận ra vị khách chính là chàng trai trong ảnh 50 năm trước | 3.8 Flash (453 giây) |

Truyện liền mạch qua cả 6 kỳ và 9 ngày, kỳ nào cũng có ngoặc kép. Chưa tới lần kết đợt (đợt đầu ≥ 6 kỳ) nên phần ghi đợt + sự thật của sổ tay đã thử ở lần chạy 1 ngày bên trên.

**Lỗi thấy được, đã sửa**: model quá thời gian chờ thì add-on thử lại **cùng model** tới 3 lần (tới 12 phút, có thể vẫn tính vào hạn mức) và ở bước sau lại thử nó đầu tiên. Nay: quá thời gian → chuyển ngay sang model sau; model đó bị đẩy xuống cuối cho các bước còn lại của lần viết (`AIError.slow`, `Gemini.slow`).

## 4. Kết quả test

| Bộ | Kết quả |
|---|---|
| `core/test_1315.py` (mới, Gemini giả) | **32 / 32** (1 năm: 765 lượt = mã 1.31.3; lùi Hydrogen → Flash → Lite; model chậm → chuyển ngay; giọng đọc 21 giây; bản cũ chen giữa không mất sổ tay) |
| `tests/run_all.sh` (`ANKI_PY` = aqt 26.9.4) | **56 bộ, tất cả OK** (có `dong_bo/test_dong_bo.py` — máy chủ đồng bộ thật); lần đầu trượt 1 kiểm tra trang web (hình ghi "xuất từ 1.31.4") → `node site/tools/xuat_hinh.js` (chỉ đổi số bản) → `trang/test_trang.py` 35 / 35 |
| `anki/run_capnhat.sh` 1.31.3 (đã phát hành) → 1.31.5 | **17 / 17** trên gói đã đóng: mọi khoá collection, mọi file `user_files/`, cấu hình add-on giữ nguyên |
| Kịch bản Anki thật có báo (Gemini giả): `e2e_1251`, `e2e_123`; Ctrl+Z `e2e_1314` | `e2e_1251` 48 / 48 · `e2e_123` 66 / 66 · `e2e_1314` 53 / 53 |

## 5. Dữ liệu khi cập nhật

- Không đổi khoá nào trong collection, không thêm mục `config.json`.
- Hai file mới (`so_tay.json`, `truyen_tom_tat.json`) chỉ ở thư mục truyện chung trên máy; bản cũ không biết thì không đụng. Lần đầu chạy, 1.31.5 lấp sổ tay từ bộ nhớ truyện sẵn có (≤ 60 kỳ).
- Máy còn bản cũ viết thêm kỳ: 1.31.5 vẫn lấy được tóm tắt kỳ đó (từ truyen.json), sổ tay giữ nguyên (`core/test_1315.py` mục 5, chạy mã 1.31.3 thật).

## 6. Nên thử trên máy thật

1. Cài đè 1.31.5, mở Anki, để báo tự viết số hôm nay. Tab Nguồn báo → nhật ký: các bước truyện ghi model `gemini-4-hydrogen`.
2. Vào AI Studio xem hạn mức: Hydrogen vài lượt, Flash Lite vài lượt, 3.8 Flash gần như không đụng; giọng đọc không còn vượt mức mỗi phút.
3. Sau khoảng một tuần (hết một đợt): thư mục `user_files/bao_chung/` có `so_tay.json` ghi đợt vừa xong.
