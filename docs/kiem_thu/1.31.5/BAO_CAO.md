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

## 4. Kết quả test

| Bộ | Kết quả |
|---|---|
| `core/test_1315.py` (mới, Gemini giả) | KQ_1315 |
| `tests/run_all.sh` (`ANKI_PY` = aqt 26.9.4) | KQ_RUNALL |
| `anki/run_capnhat.sh` 1.31.3 (đã phát hành) → 1.31.5 | KQ_CAPNHAT |
| Kịch bản Anki thật có báo (Gemini giả): `e2e_1251`, `e2e_123`; Ctrl+Z `e2e_1314` | KQ_E2E |

## 5. Dữ liệu khi cập nhật

- Không đổi khoá nào trong collection, không thêm mục `config.json`.
- Hai file mới (`so_tay.json`, `truyen_tom_tat.json`) chỉ ở thư mục truyện chung trên máy; bản cũ không biết thì không đụng. Lần đầu chạy, 1.31.5 lấp sổ tay từ bộ nhớ truyện sẵn có (≤ 60 kỳ).
- Máy còn bản cũ viết thêm kỳ: 1.31.5 vẫn lấy được tóm tắt kỳ đó (từ truyen.json), sổ tay giữ nguyên (`core/test_1315.py` mục 5, chạy mã 1.31.3 thật).

## 6. Nên thử trên máy thật

1. Cài đè 1.31.5, mở Anki, để báo tự viết số hôm nay. Tab Nguồn báo → nhật ký: các bước truyện ghi model `gemini-4-hydrogen`.
2. Vào AI Studio xem hạn mức: Hydrogen vài lượt, Flash Lite vài lượt, 3.8 Flash gần như không đụng; giọng đọc không còn vượt mức mỗi phút.
3. Sau khoảng một tuần (hết một đợt): thư mục `user_files/bao_chung/` có `so_tay.json` ghi đợt vừa xong.
