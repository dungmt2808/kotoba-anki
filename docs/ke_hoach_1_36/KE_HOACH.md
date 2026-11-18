# Kế hoạch 1.36 — Giáng sinh: Lịch chờ Giáng sinh, trang trí cây thông + ngôi nhà, thiệp điều ước (18/11; **ảnh phác bản 2, chưa làm**)

Người dùng (18/11, sau 1.35.2):

> tớ nghĩ phiên bản này là phiên bản cuối cùng rồi. nhưng ta có nên cho thêm sự kiện mỗi mùa không nhỉ, sắp tới là noel
>
> quà mỗi ngày sẽ là gì nhỉ. với lại nếu mà ví dụ có ý tưởng gì mỗi ngày, mỗi người đều có thể thiết kế, trang trí gì đó thì
> đến ngày 24 có thể có thành phẩm được không, ngoài những đồ có sẵn.
>
> cũng được á. với lại trang trí thiệp, ghi điều ước, sau đó đến ngày 24 ông già noel đến lấy thì sao
>
> (xem ảnh phác bản 1) cái treo từ nó không hay lắm. tớ muốn nó là kỷ niệm để người dùng kỷ niệm luôn, chỉ mang mục đích trang
> trí. với lại hình như cây thông trang trí nhiều quá nhìn không đẹp lắm. với lại trang trí nhà được không nhỉ

Bản 2 sửa theo góp ý: **bỏ "mỗi món gắn một từ"** (đồ chỉ để trang trí, giữ làm kỷ niệm; rê chuột chỉ thấy tên món + ngày mở
ô), **cây thưa** (10 chỗ treo đặt sẵn, 24/12 chỉ có 7 món + dây kim tuyến + dây đèn + ngôi sao — bản 1 có 22 món), **trang trí cả
nhà**: 24 ô chia **Cây 10 · Ngoài nhà 7 · Trong nhà 7**; thư của ông già Noel không liệt kê từ nữa mà nhắc đồ bạn đã bày.

Hiện có cho Noel: giao diện mùa Giáng sinh (15/11–31/12: tuyết, đèn, xe tuần lộc bay đêm, nhạc, 4 món), câu chào 24–25/12, Mũ
Noel cho StackChan — **chỉ để ngắm, không có việc gì để mong chờ mỗi ngày** (đúng chỗ còn thiếu số 3 ở
`KE_HOACH_Y_TUONG_HANG_NGAY.md`: "sự kiện có lịch, ngoài giao diện mùa").

Ảnh phác vẽ đè lên vườn thật của 1.35.2 trong **Anki 26.9.4 thật** (giao diện mùa Giáng sinh thật, trời / tuyết / đêm thật, nhà và
3 gian thật của add-on): `tests/anki/mock_136.js` + `mock_136_art.js` (tranh pixel tạm, bảng màu + hàm vẽ của add-on) +
`mock_136_ui.js` (bảng tạm) + `mock_136_ghep.py`; bộ thẻ mẫu `setup_demo.sh`. **Mọi chi tiết Claude chọn — chờ người dùng duyệt.**

| Ảnh | Nội dung |
|---|---|
| `136_01_lich.png` | **Lịch chờ Giáng sinh** (giả hôm nay 10/12): 24 ô cửa, ô đã mở hiện món + nhãn Cây / Nhà / Trong nhà, ô lỡ ngày (ôn thêm 15 lượt để mở bù), ô hôm nay, ô tự vẽ (Chủ nhật), ô 24 ngôi sao; mở từ chip Giáng sinh / dòng nhắc trong thẻ Hôm nay / bấm cây ở sân |
| `136_02_cay.png` | 1/12 cây trống, **10 chỗ treo đặt sẵn** → mở ô → bấm chấm để treo, chọn màu; 24/12 cây xong, rê chuột: "Quả châu đỏ · mở ngày 1/12" |
| `136_03_nha.png` | **Ngoài nhà** (14/12): vòng hoa cửa, đèn mái nhà, cột băng, hình dán cửa sổ tự vẽ, người tuyết — mỗi món vài chỗ đặt sẵn (Cạnh cửa / Góc sân / Cạnh cây thông), cất vào kho được |
| `136_04_trong_nha.png` | **Trong nhà** (23/12): vòng hoa tường, tất Noel, tranh tự vẽ 16 × 16, cây thông nhỏ, hộp quà, bánh khúc cây, bát yuzu (冬至) — đặt như đồ nội thất, gian nào cũng được |
| `136_05_tu_ve.png` | **Chủ nhật tự vẽ**: 6/12 món treo cây 8 × 8, 13/12 hình dán cửa sổ 8 × 8, 20/12 tranh tường 16 × 16 (bút / tẩy / đổ màu như Xưởng), "Lấy món có sẵn" nếu không muốn vẽ |
| `136_06_thiep.png` | **Thiệp điều ước**: mặt trước trang trí (giấy, sticker, hình 16 × 16), mặt sau viết điều ước (tiếng Việt hoặc tiếng đang học — tiếng nước ngoài có "Nhờ Gemini sửa" như Luyện viết), treo thiệp lên cây |
| `136_07_dem_24.png` | **Đêm 24/12**: ngôi sao lên đỉnh, cây + nhà sáng đèn (đèn mái, nến cửa sổ) = thành phẩm; ông già Noel đáp xe tuần lộc xuống sân lấy thiệp; StackChan đội mũ Noel + thú nuôi ra xem |
| `136_08_sang_25.png` | **Sáng 25/12**: hộp quà dưới gốc, dấu chân + vết xe trên tuyết; **quả cầu tuyết có cây của bạn bên trong** + **thư trả lời** nhắc điều ước + đồ đã bày; **Kỷ niệm Giáng sinh 2026** ở tab Album |

## 1. 24 ô cửa (Chủ nhật 6 / 13 / 20 tự vẽ)

| Cây (10) | Ngoài nhà (7) | Trong nhà (7) |
|---|---|---|
| 1 Quả châu đỏ · 2 Dây kim tuyến · 4 Chuông vàng · 6 **Tự vẽ** món treo 8 × 8 · 8 Bông tuyết · 10 Dây đèn · 15 Nơ đỏ · 18 Quả châu xanh · 22 Thiên thần · 24 **Ngôi sao** | 3 Vòng hoa cửa · 5 Đèn mái nhà · 12 Cột băng · 13 **Tự vẽ** hình dán cửa sổ 8 × 8 · 14 Người tuyết · 17 Kẹo gậy lối đi · 19 Nến cửa sổ | 7 Vòng hoa tường · 9 Tất Noel · 11 Cây thông nhỏ · 16 Bánh khúc cây · 20 **Tự vẽ** tranh tường 16 × 16 · 21 Bát yuzu (冬至) · 23 Hộp quà |

## 2. Luật (theo "FOMO lành mạnh", `KE_HOACH_Y_TUONG_HANG_NGAY.md` mục 1)

- **Mở ô**: ngày Anki d (4h sáng, `ngay_core`) có ≥ 1 lượt ôn (đếm revlog như sổ bù xu — ôn trên điện thoại cũng tính) → mở được ô
  d, từ ngày d trở đi (không mở trước). Ô của ngày đã lỡ: mỗi 15 lượt ôn thêm trong một ngày sau đó mở bù 1 ô (đề xuất tối đa 2
  ô bù / ngày). Mở được tới hết 31/12; cây / nhà vẫn "xong" dù thiếu món, ngôi sao có khi mở ô 24 (kể cả mở bù).
- **Đồ chỉ để trang trí, giữ làm kỷ niệm**: không gắn từ, không cho xu, không có chuỗi ngày, không đếm ngược. Mỗi món nhớ ngày
  mở ô (rê chuột thấy "mở ngày 3/12").
- **Chỗ đặt**: cây 10 chỗ treo đặt sẵn (không rối); đồ ngoài nhà vài chỗ đặt sẵn mỗi món; đồ trong nhà đặt như đồ nội thất (ô
  trống, gian nào cũng được). Dời / cất vào kho được tới hết mùa. "Để vườn treo hộ" cho ai không muốn chọn.
- **Tắt được**: ⚙ → "Sự kiện mùa: Bật / Tắt" (tắt thì không có cây, lịch, đồ bày, ông già Noel; dữ liệu giữ nguyên).
- **Ông già Noel**: lần đầu mở vườn từ **18:00 ngày 24/12** (giờ máy) tới hết 31/12 → cảnh đêm ~10 giây (bỏ qua được, có "Xem
  lại"). Chưa viết thiệp thì ông vẫn ghé, để quà, thư không trích điều ước. Mở vườn sáng 25 → cảnh sáng 25 (hộp quà, dấu chân)
  + nút "Xem lại đêm qua".
- **Thư trả lời**: câu viết sẵn (theo Ngôn ngữ trong vườn) + trích điều ước + nhắc vài món đã bày (ngôi sao, vòng hoa cửa, người
  tuyết…) — **không gọi Gemini**. "Nhờ Gemini sửa" thiệp chỉ khi người dùng bấm (1 lượt Flash-Lite như Luyện viết).
- **Kỷ niệm Giáng sinh 2026** (tab Album): đêm 24 vườn tự chụp ảnh sân + ảnh trong nhà (như nút chụp ảnh vườn), kèm thiệp, thư, lịch
  24 ô. Từ 1/1 hỏi một lần: **cất bộ đồ Noel vào Kho đồ** (giữ mãi, mùa sau bày lại được) hay để thêm. Năm sau có lịch mới, món mới.

## 3. Dữ liệu (đã phát hành → giữ dữ liệu bản 1.31.3 – 1.35.2)

- Khoá collection **mới** `kotoba_batake_le` (bản cũ không đụng): `{"v": 1, "noel2026": {"doors": {"1": {"o": món, "at": chỗ đặt
  (cây / nhà: mã chỗ đặt sẵn; trong nhà: cảnh + ô), "c": màu, "d": ngày mở}}, "px": {"6": "mã 8×8", "13": "mã 8×8", "20": "mã
  16×16"}, "card": {"paper", "st": [...], "px": "mã 16×16", "t": chữ, "lang", "sig", "hung"}, "santa": {"seen", "gift"}, "keep":
  "kho" | "bay"}}`; làm sạch khi đọc, giữ khoá lạ; ghi qua `backup_core.commit_config` (dấu phiên bản + `sync_core` như mọi khoá
  `kotoba_batake_*`); sao lưu theo hồ sơ `user_files/ho_so/<mã>/le.json`.
- Đồ trong nhà dùng chỗ đặt của đồ nội thất nhưng lưu ở khoá mới (như món gánh hàng 1.28 ở tầng giữ khoá lạ): bản cũ không vẽ
  được thì bỏ qua chứ không xoá; ô bị đồ Noel chiếm vẫn là ô trống với bản cũ (đặt đè được — khi về bản mới, món Noel trùng ô
  thì tự cất vào kho, không mất).
- Ảnh kỷ niệm lưu ở `user_files/ho_so/<mã>/ky_niem/` (không đồng bộ — như ảnh vườn); phần chữ (thiệp, thư) ở khoá trên nên máy
  khác vẫn xem được.
- Test bắt buộc trước khi ra bản: `tests/anki/run_capnhat.sh` (cài đè 1.31.3 thật), hợp đồng dữ liệu (chỉ thêm khoá
  `kotoba_batake_le`, `config.json` chỉ thêm `season_event`), `run_habanh.sh` (bản cũ đặt đồ vào ô của đồ Noel rồi lên lại),
  máy chủ đồng bộ thật (`tests/dong_bo/`): điện thoại ôn → máy tính mở ô; hai máy tính cùng bày đồ.

## 4. Mã (dự kiến)

- `le_core.py` (thuần Python, test offline bằng ngày giả): lịch ô cửa của từng sự kiện (Noel 1–24/12; khung dùng lại cho Tết:
  cây mai / đào + lì xì + câu đối), mở ô / mở bù, chỗ đặt sẵn, làm sạch dữ liệu, thư trả lời.
- `web/le.js` + `web/le_art.js`: cây, 24 món (vẽ lại cho đẹp — tranh trong ảnh phác là tạm), đồ ngoài nhà vẽ theo khung nhà
  64 × 76 (mọi kiểu nhà ở `STYLE_DRAW` cần chỗ đặt riêng), đồ trong nhà theo ô 16 × 16, lịch, khung tự vẽ (lõi vẽ của Xưởng), thiệp,
  cảnh đêm 24 / sáng 25, quả cầu tuyết, trang Kỷ niệm.
- Cầu nối: `le:view`, `le:open`, `le:place`, `le:draw`, `le:card`, `le:santa`, `le:keep`.
- Hai phiên: (1) khung + lịch + cây + đồ nhà / trong nhà + chỗ đặt + test dữ liệu / đồng bộ; (2) tự vẽ + thiệp + đêm 24 + sáng 25 +
  quả cầu tuyết + Kỷ niệm + cài đè 1.31.3 + kịch bản Anki thật. **Lịch bắt đầu 1/12 → nên phát hành trước ~28/11** để người dùng
  kịp cập nhật qua AnkiWeb.

## 5. Còn để ngỏ (hỏi lần lượt, sau khi người dùng duyệt ảnh)

- Tên: "Lịch chờ Giáng sinh" (Claude chọn; khác: "Lịch Mùa Vọng", "24 ngày chờ Noel").
- Mở bù: 15 lượt / ô, tối đa 2 ô / ngày.
- Nhà kiểu khác (nhà gỗ, nhà Nhật… ở Xây nhà): đồ ngoài nhà cần chỗ đặt riêng cho từng kiểu — ảnh phác chỉ vẽ nhà gốc.
- 4 phần nhỏ đã đề xuất trước (StackChan sinh hoạt tháng 12, khách tuần lộc, gánh hàng bán đồ Noel, một dòng "đêm Giáng sinh"
  trong lời nhắc báo): làm sau cùng, không kịp thì bỏ.
- Tết (mùng 1 = 6/2/2027): cùng khung, ảnh phác riêng khi tới.
