# Ảnh phác: Thiệp Giáng sinh + Tô tranh theo số (21/11)

Người dùng (21/11), sau khi bàn "trò vẽ vời hợp với add-on, không phải học từ vựng": **"2 và 1 trước đi, phác thử giúp tớ"**
— (2) thiệp Giáng sinh tự làm cho sự kiện tháng 12, (1) tô tranh theo số. **Chưa viết mã.** Ảnh vẽ đè lên vườn / bảng Trò
chơi / bảng Nhà thật của 1.35.6 trong Anki 26.9.4 (`tests/anki/mock_thiep_to_mau.js` + `mock_thiep_to_mau_ghep.py`); hình
trên thiệp và tranh tô là hình pixel có sẵn của add-on (`GardenHome._lib().SPR`, StackChan đội Mũ Noel bằng `paintFace`).
**Mọi chi tiết Claude chọn, người dùng chưa duyệt.**

Nguyên tắc chung (đã bàn 20–21/11): trò vẽ là **phần thưởng sau khi học**, không thay việc học; thưởng nhỏ, có trần; không
dùng làm "giờ nghỉ" (nghỉ thật là rời màn hình); không cần máy chủ — phần cộng đồng diễn ra ở nhóm Facebook (đăng ảnh thiệp,
thi thiệp đẹp) và bằng mã chia sẻ như Xưởng.

## 1. Thiệp Giáng sinh (sự kiện 1/12 – 31/12)

| Ảnh | Nội dung |
|---|---|
| `t1_loi_vao.jpg` | chip Giáng sinh có nhãn "Sự kiện"; thẻ Hôm nay có dòng "Giáng sinh: làm thiệp · quà 5/24" |
| `t2_xuong_thiep.jpg` | xưởng làm thiệp: thiệp 120 × 80 điểm, lời chúc 2 dòng + câu chúc bằng 6 tiếng, 4 khung, 12 sticker (6 có sẵn, 6 mở ở lịch mở quà), Lưu ảnh PNG / Chép mã / Treo trong nhà / Gửi lên trang |
| `t3_treo_thiep.jpg` | dây treo thiệp trên tường phòng (tối đa 6 tấm); nút "Nhận thiệp" trên bảng Nhà; dán mã thiệp của bạn → xem trước → treo |

- **Lịch mở quà 24 ô** (1/12 → 24/12): ngày nào đạt mục tiêu ôn thì mở 1 ô. Ô có sticker cho thiệp, vài ô có món trang trí
  Noel giới hạn hoặc ít xu. Ngày quên ôn thì ô đó mở bù được bằng **vé giữ chuỗi** sẵn có (hoặc để trống — hỏi người dùng).
- **Làm thiệp không tốn xu**, lưu tối đa 3 thiệp. Sau 31/12 thiệp vẫn xem được (Album), dây treo thiệp cất vào Kho đồ.
- **Ảnh PNG** để đăng nhóm (có thể ghi "ことば畑" nhỏ ở góc — hỏi người dùng). **Mã thiệp** `KB1:` như mã thiết kế của Xưởng:
  chỉ có hình + chữ trên thiệp, không có gì về deck; trang web chung "Xem mã" mở được thiệp.
- Câu chúc theo tiếng: メリークリスマス · Merry Christmas · 圣诞快乐 · 메리 크리스마스 · Frohe Weihnachten · Joyeux Noël (+ tiếng
  Việt); chip đầu là tiếng của deck đang xem.

## 2. Tô tranh theo số (塗り絵)

| Ảnh | Nội dung |
|---|---|
| `c1_tro_choi.jpg` | ô "6. Tô tranh" ở chỗ trống của bảng Trò chơi; ô chọn bộ tranh |
| `c2_man_to.jpg` | màn tô: tranh 32 × 44 ô có số, ô của số đang chọn sáng vàng; bảng màu đánh số + "còn N ô"; tiến độ tự lưu; bấm từng ô / kéo tô liền / tìm ô còn sót / phóng to |
| `c3_treo_tranh.jpg` | tô xong: +10 xu, tranh vào Kho đồ; treo ở tường gian nào cũng được (khung gỗ) |

- **Tranh lấy từ hình có sẵn của vườn** (160 món đồ + hình mùa / khách / thú): không cần vẽ thêm. Bộ đầu "Mùa đông" 12 bức
  (cây thông, người tuyết, kamakura, thỏ tuyết…), sau đó Tết, hoa anh đào… theo giao diện mùa.
- **Mở tranh**: đạt mục tiêu ngày → mở 1 bức mới (tô dở thì tô tiếp bao lâu cũng được). Thưởng +10 xu cho bức đầu tiên tô xong
  mỗi ngày (tính chung trần 40 xu / ngày của trò chơi — hỏi người dùng).
- **Không ghi lịch ôn, không cần Cấu hình trường**, chạy với mọi deck (kể cả "Ngôn ngữ khác").
- Tô nhầm số: ô không nhận màu, không phạt. Phím 1–9 chọn số, Z hoàn tác.

## 3. Lưu dữ liệu (dự kiến — giữ hợp đồng dữ liệu với 1.31.3, PHAT_TRIEN.md mục 7, 8)

- **Chỉ thêm khoá mới**, không đổi khoá cũ: thiệp + lịch mở quà + tiến độ tô tranh ở một khoá mới trong `kotoba_batake_more`
  (hoặc khoá collection riêng), ghi qua `backup_core.commit_config` / `put_config` (dấu phiên bản đồng bộ như mọi khoá khác).
- Thiệp 120 × 80 lưu dạng chỉ số màu nén (vài KB); tiến độ tô = dãy bit (32 × 44 ô ≈ 180 byte / tranh).
- Tranh tô xong / dây treo thiệp là món nội thất mới (đặt bằng cơ chế đồ treo tường sẵn có). Bản 1.35.x mở cùng collection
  phải bỏ qua món lạ mà không xoá (đã có `_is_ext_entry` / giữ khoá lạ) — sẽ có test cài đè `run_capnhat.sh` + mã cũ chạy chen.

## 4. Ước lượng

- Thiệp + lịch mở quà + nhận thiệp bằng mã: cỡ một bản như 1.34 (xưởng thiệp dùng lại bút / bảng màu của Xưởng, mã chia sẻ
  dùng lại `share_core`). Cần ra **trước 1/12** để kịp sự kiện.
- Tô tranh: nhỏ hơn (sinh tranh từ hình có sẵn, màn tô, treo tường). Có thể ra ngay sau, hoặc cùng bản nếu kịp.

## 5. Câu hỏi cho người dùng

1. **Lịch mở quà 24 ô**: giữ ý này làm "sự kiện" chính không? Ngày quên ôn: cho mở bù (bằng vé giữ chuỗi) hay để trống?
2. **Tô tranh**: mở 1 bức / ngày khi đạt mục tiêu là được chưa, hay cho mua thêm bằng xu?
3. **Thứ tự ra bản**: thiệp + lịch mở quà trước (kịp 1/12), tô tranh sau — hay gộp một bản?
4. Ảnh PNG của thiệp có ghi "ことば畑" nhỏ ở góc không?
