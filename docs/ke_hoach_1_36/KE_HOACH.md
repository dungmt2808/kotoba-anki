# Kế hoạch 1.36 — Giáng sinh: Lịch chờ Giáng sinh, cây thông của riêng mình, thiệp điều ước (18/11; **ảnh phác, chưa làm**)

Người dùng (18/11, sau 1.35.2):

> tớ nghĩ phiên bản này là phiên bản cuối cùng rồi. nhưng ta có nên cho thêm sự kiện mỗi mùa không nhỉ, sắp tới là noel
>
> quà mỗi ngày sẽ là gì nhỉ. với lại nếu mà ví dụ có ý tưởng gì mỗi ngày, mỗi người đều có thể thiết kế, trang trí gì đó thì
> đến ngày 24 có thể có thành phẩm được không, ngoài những đồ có sẵn.
>
> cũng được á. với lại trang trí thiệp, ghi điều ước, sau đó đến ngày 24 ông già noel đến lấy thì sao

Hiện có cho Noel: giao diện mùa Giáng sinh (15/11–31/12: tuyết, đèn, xe tuần lộc bay đêm, nhạc, 4 món), câu chào 24–25/12, Mũ
Noel cho StackChan — **chỉ để ngắm, không có việc gì để mong chờ mỗi ngày** (đúng chỗ còn thiếu số 3 ở
`KE_HOACH_Y_TUONG_HANG_NGAY.md`: "sự kiện có lịch, ngoài giao diện mùa").

Ảnh phác vẽ đè lên vườn thật của 1.35.2 trong **Anki 26.9.4 thật** (giao diện mùa Giáng sinh thật, trời / tuyết / đêm thật của
add-on): `tests/anki/mock_136.js` + `mock_136_art.js` (tranh pixel tạm: cây thông, 24 món, ông già Noel…, dùng bảng màu + hàm vẽ
của add-on) + `mock_136_ui.js` (bảng tạm) + `mock_136_ghep.py`; bộ thẻ mẫu `setup_demo.sh`; từ gắn món là từ thật của deck mẫu
"Tiếng Nhật::N5 · Từ vựng". **Mọi chi tiết Claude chọn — chờ người dùng duyệt.**

| Ảnh | Nội dung |
|---|---|
| `136_01_lich.png` | **Lịch chờ Giáng sinh** (giả hôm nay 10/12): 24 ô cửa, ô đã mở hiện món + từ, ô lỡ ngày (ôn thêm 15 lượt để mở bù), ô hôm nay, ô tự vẽ (Chủ nhật), ô 24 ngôi sao; cây thu nhỏ "8 / 24 món"; mở từ chip Giáng sinh / dòng nhắc trong thẻ Hôm nay / bấm cây ở sân |
| `136_02_treo_mon.png` | 1/12 cây trống → mở ô → **bấm chấm trắng để treo**, chọn màu, **gắn một từ của hôm đó**; 13/12 rê chuột lên món thấy ngày + từ |
| `136_03_tu_ve.png` | Chủ nhật 6 / 13 / 20: **tự vẽ món treo 8 × 8** (khuôn tròn / chuông / sao / tự do, bút / tẩy / đổ màu như Xưởng), xem ngay trên cây |
| `136_04_thiep.png` | **Thiệp điều ước**: mặt trước trang trí (giấy, sticker, hình 16 × 16), mặt sau viết điều ước (tiếng Việt hoặc tiếng đang học — tiếng nước ngoài có "Nhờ Gemini sửa" như Luyện viết), treo thiệp lên cây |
| `136_05_dem_24.png` | **Đêm 24/12**: ngôi sao lên đỉnh, cây sáng đèn = thành phẩm; ông già Noel đáp xe tuần lộc xuống sân lấy thiệp ("ホッホッホー！メリークリスマス！"); StackChan đội mũ Noel + thú nuôi ra xem |
| `136_06_sang_25.png` | **Sáng 25/12**: hộp quà dưới gốc, dấu chân + vết xe trên tuyết; **quả cầu tuyết có cây thông của bạn bên trong** + **thư trả lời** ghép điều ước + 24 từ trên cây; từ 26/12 "Cây thông 2026" vào Kho đồ, trang "Giáng sinh 2026" trong Cuốn nhật ký |

## 1. Luật (theo "FOMO lành mạnh", `KE_HOACH_Y_TUONG_HANG_NGAY.md` mục 1)

- **Mở ô**: ngày Anki d (4h sáng, `ngay_core`) có ≥ 1 lượt ôn (đếm revlog như sổ bù xu — ôn trên điện thoại cũng tính) → mở được ô
  d, từ ngày d trở đi (không mở trước). Ô của ngày đã lỡ: mỗi 15 lượt ôn thêm trong một ngày sau đó mở bù 1 ô (đề xuất tối đa 2
  ô bù / ngày). Mở được tới hết 31/12; cây vẫn "xong" dù thiếu món (chỉ thưa hơn), ngôi sao luôn có nếu mở ô 24 (kể cả mở bù).
- **Không thêm chuỗi** ngày, không đếm ngược, không chữ đỏ "sắp hết", **không cho xu** (quà là đồ trang trí).
- **Từ gắn món**: mặc định thẻ bấm **Lại** nhiều nhất hôm đó (không có thì thẻ ôn nhiều lần nhất), đổi được trong các thẻ đã ôn
  hôm đó; lưu nid + chữ hiển thị (note bị xoá vẫn đọc được). Deck tiếng Anh / Trung / Hàn / Đức / Pháp lấy trường từ theo
  `fields_core` như trò chơi.
- **Tắt được**: ⚙ → "Sự kiện mùa: Bật / Tắt" (tắt thì không có cây, lịch, ông già Noel; dữ liệu giữ nguyên).
- **Ông già Noel**: lần đầu mở vườn từ **18:00 ngày 24/12** (giờ máy) tới hết 31/12 → cảnh đêm ~10 giây (bỏ qua được, có "Xem
  lại"). Chưa viết thiệp thì ông vẫn ghé, để quà, thư không trích điều ước. Mở vườn sáng 25 → thấy cảnh sáng 25 (hộp quà, dấu
  chân) + nút "Xem lại đêm qua".
- **Thư trả lời**: câu viết sẵn (theo Ngôn ngữ trong vườn) + trích điều ước + danh sách từ trên cây — **không gọi Gemini**.
  "Nhờ Gemini sửa" thiệp chỉ khi người dùng bấm (1 lượt Flash-Lite như Luyện viết).

## 2. Dữ liệu (đã phát hành → giữ dữ liệu bản 1.31.3 – 1.35.2)

- Khoá collection **mới** `kotoba_batake_le` (bản cũ không đụng): `{"v": 1, "noel2026": {"doors": {"1": {"o": món, "s": chỗ
  treo, "c": màu, "w": {"nid", "t"}, "d": ngày mở}}, "px": {"6": "mã 8×8", …}, "card": {"paper", "st": [...], "px": "mã 16×16",
  "t": chữ, "lang", "sig", "hung"}, "santa": {"seen", "gift"}}}`; làm sạch khi đọc, giữ khoá lạ; ghi qua
  `backup_core.commit_config` (dấu phiên bản + `sync_core` như mọi khoá `kotoba_batake_*`); sao lưu theo hồ sơ
  `user_files/ho_so/<mã>/le.json`.
- Cây thông + quả cầu tuyết là món đặt được: cây tạm ở sân tháng 12 (tự đặt ở ô trống, dời được), từ 26/12 thành món "Cây thông
  2026" (`le` + năm, vẽ từ dữ liệu ô cửa) — lưu chỗ đặt ở tầng giữ khoá lạ như món gánh hàng (1.28), bản cũ không vẽ được thì
  bỏ qua chứ không xoá.
- Trang "Giáng sinh 2026" trong Cuốn nhật ký đọc từ `kotoba_batake_le` (không chép sang khoá nhật ký).
- Test bắt buộc trước khi ra bản: `tests/anki/run_capnhat.sh` (cài đè 1.31.3 thật), hợp đồng dữ liệu (chỉ thêm khoá
  `kotoba_batake_le`, `config.json` chỉ thêm `season_event`), `run_habanh.sh`, máy chủ đồng bộ thật (`tests/dong_bo/`): điện
  thoại ôn → máy tính mở ô; hai máy tính cùng treo món.

## 3. Mã (dự kiến)

- `le_core.py` (thuần Python, test offline bằng ngày giả): lịch ô cửa của từng sự kiện (Noel 1–24/12; khung dùng lại cho Tết:
  cây mai / đào + lì xì), mở ô / mở bù, chọn từ gắn, làm sạch dữ liệu, thư trả lời.
- `web/le.js` + `web/le_art.js`: cây, 24 món (vẽ lại cho đẹp — tranh trong ảnh phác là tạm), lịch, treo món, khung 8 × 8 (dùng
  lõi vẽ của Xưởng), thiệp (16 × 16 + sticker có sẵn của nhật ký), cảnh đêm 24 / sáng 25, quả cầu tuyết.
- Cầu nối: `le:view`, `le:open`, `le:hang`, `le:draw`, `le:card`, `le:santa`.
- Hai phiên: (1) khung + lịch + cây + treo + từ gắn + test dữ liệu / đồng bộ; (2) tự vẽ + thiệp + đêm 24 + sáng 25 + quả cầu
  tuyết + nhật ký + cài đè 1.31.3 + kịch bản Anki thật. **Lịch bắt đầu 1/12 → nên phát hành trước ~28/11** để người dùng kịp cập
  nhật qua AnkiWeb.

## 4. Còn để ngỏ (hỏi lần lượt, sau khi người dùng duyệt ảnh)

- Tên: "Lịch chờ Giáng sinh" (Claude chọn; khác: "Lịch Mùa Vọng", "24 ngày chờ Noel").
- Mở bù: 15 lượt / ô, tối đa 2 ô / ngày.
- 4 phần nhỏ đã đề xuất trước (StackChan sinh hoạt tháng 12, khách tuần lộc, gánh hàng bán đồ Noel, một dòng "đêm Giáng sinh"
  trong lời nhắc báo): làm sau cùng, không kịp thì bỏ — cảnh đêm 24 đã có StackChan + thú nuôi.
- Tết (mùng 1 = 6/2/2027): cùng khung, ảnh phác riêng khi tới.
