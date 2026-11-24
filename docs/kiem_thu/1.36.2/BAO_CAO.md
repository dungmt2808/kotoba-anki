# Báo cáo 1.36.2 — sửa lỗi audit 24/11 của sự kiện Giáng sinh + tìm thêm lỗi (24/11/2026)

Người dùng: "sửa các lỗi đã được tìm ra ở nhánh audit/release-review-1.36.1-2026-11-24. và tìm thêm còn lỗi nào nữa không, test
kỹ. còn việc gì chưa làm nữa không"

Làm trên nhánh `claude/dazzling-davinci-k0rrza` (gộp nhánh audit vào — chỉ thêm báo cáo
`docs/kiem_thu/audit-1.36.1-2026-11-24/BAO_CAO.md`). **Không thêm khoá collection, không thêm mục config.json** (test so với
1.36.1); dữ liệu chỉ thêm trường `"t"` (lúc giữ / xoá, tới giây) trong mỗi thiệp nhận của `kotoba_batake_le`. **Cách sửa Claude
chọn, người dùng chưa xem.**

## 1. Lỗi của nhánh audit — có đúng không?

Cách kiểm: đọc mã, viết test tái hiện đúng thao tác của báo cáo, chạy trên mã 1.36.1 (commit `af1a72f`) → đỏ, trên 1.36.2 →
xanh. Kịch bản Anki thật `tests/anki/e2e_1362.js` chạy trên gói 1.36.1: **đỏ 20 kiểm tra** ở phần A–F (xem mục 4); trên 1.36.2: xanh hết.

**Kết luận: 16 / 17 mục đúng và đã sửa (mục 16 là ngưỡng đo tốc độ phụ thuộc máy — đổi cách đo); mục 02 không xảy ra trong
Anki thật — giữ nguyên mã, thêm test khoá hành vi** (xem dòng 02).

### 1.1 P1

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 01 | Thiệp bạn gửi đã xoá → dán lại mã → Giữ vào Album → mất ngay lúc lưu (dấu "đã xoá" trong collection luôn thắng khi gộp) | **Đúng** (Anki thật: mở lại vườn không còn thiệp) | Mỗi thiệp nhận có dấu `"t"` (lúc giữ / xoá, tới giây, luôn sau lần trước — `_bump`); gộp hai bản: lần giữ / xoá sau thắng (`_recv_newer`). Sổ 1.36.1 (không có `"t"`) gộp như cũ; bản 1.36.2 giữ lại trên dấu xoá cũ được. Ngày nhận: sớm nhất, trừ lúc vừa giữ lại sau khi xoá |
| 02 | Esc hai lần nhanh trên bảng Giáng sinh / hộp hỏi đóng luôn cửa sổ vườn (các bảng chặn hẳn sự kiện nên hàng đợi Esc của 1.35.4 rỗng) | **Không xảy ra trong Anki thật.** Anki (26.9.4 và 23.10.1, `aqt/webview.py`) chỉ báo Esc cho Python bằng bộ nghe gắn ở `document` **pha bubble** sau mọi file của trang; các bảng Giáng sinh / hộp hỏi chặn Esc ở **pha capture** (`stopImmediatePropagation`) nên bộ nghe đó không chạy — đo trong Anki thật: Esc Esc nhanh trên xưởng thiệp / tủ lịch có thẻ / cảnh đêm / hộp hỏi → Esc tới Python **0 lần**, cửa sổ còn (cả trên gói 1.36.1). Mô phỏng của audit gọi `_on_esc` cho mọi Esc | Không đổi mã. Đã thử sửa theo gợi ý (đếm cả Esc đã chặn vào hàng đợi) → **sinh mục thừa**: Esc sau đó ở màn chính không đóng cửa sổ (phải bấm hai lần) — hoàn tác. Thêm test khoá hành vi: Chromium có bộ nghe kiểu Anki (`test_1362.js` A), Anki thật đếm số lần Esc tới Python (`e2e_1362.js` A) + Esc ở màn chính sau đó vẫn đóng cửa sổ |
| 03 | "Nhờ Gemini sửa" trừ lượt nhưng bản sửa không hiện khi điều ước có xuống dòng / khoảng trắng thừa / chữ tách dấu | **Đúng** | Trang so bản sửa với điều ước **đã chuẩn hoá như Python** (`normW` = `le_core._line`: NFC, xuống dòng → dấu cách, gộp khoảng trắng, bỏ ký tự ẩn) — test so hai bên trên 8 chuỗi khó |
| 04 | Lệnh `le:*` bị bỏ lúc Anki đồng bộ không có trả lời: nút "Gemini đang sửa…" kẹt, sửa thiệp rồi đổi ô thì mất, ngăn tủ lịch vẽ như đã mở + khoá 8 giây | **Đúng** (Anki thật, bản 1.36.1: thiệp 1 mất chữ sau đồng bộ) | Python trả lời ngay `{ok: false, sync: true}` (`_le_dropped`) cho mọi lệnh `le:*` bị bỏ → nút / ngăn / thông báo gỡ đúng. Xưởng thiệp nhớ **bản chưa lưu xong theo từng ô** (`pend`): đồng bộ xong (vườn dựng lại) gửi lại ngay, chậm nhất 8 giây; quay lại ô đó vẫn thấy chữ đang sửa. Thiệp tự lưu là lệnh tự động — không báo "Anki đang đồng bộ" lặp lại (xưởng tự ghi một dòng) |
| 05 | Đóng cửa sổ vườn / hồ sơ trong 0,8 giây sau khi sửa thiệp → mất lần sửa cuối | **Đúng** (Anki thật, bản 1.36.1: mất) | Như Lịch hoa: mỗi lần sửa trang gửi `le:keep` (chỉ giữ trong bộ nhớ Python, đi được cả lúc đồng bộ); đóng cửa sổ / hồ sơ → `flush_unsaved` lưu nốt (`_le_flush_keep`). Đang đồng bộ → xếp hàng, so xong mới lưu (đúng hồ sơ). Lưu xong lần tự lưu thì bỏ bản giữ |

### 1.2 P2

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 06 | Phím tắt màn chính rò vào bảng Giáng sinh: mũi tên dời sticker đổi cảnh phía sau; N / R / T / B / L đóng xưởng / mở bảng ôn sau lưng cảnh đêm | **Đúng** (Anki thật) | `mainKey` bỏ qua khi tủ lịch / xưởng thiệp / cảnh đêm / thư / cất đồ đang mở; phím mũi tên / Delete trên thiệp dừng lan |
| 07 | Trang trí thử dán tường / sàn Noel không nhớ mẫu cũ → 1/1 về "theo kiểu nhà" | **Đúng** (Anki thật) | `draft_apply(..., extra)` — sổ sự kiện nhớ mẫu cũ của mọi chỗ dùng mẫu Noel, cùng một lần lưu với ví |
| 08 | Thông báo nổi (z-index 5) bị xưởng thiệp / bảng Giáng sinh che | **Đúng** (cửa sổ 1024 × 680) | `.kb-toast` z-index 295 (trên bảng nổi và cảnh đêm, dưới màn chào / hộp hỏi) |
| 09 | Tủ lịch tự treo sang Bếp / Phòng ngủ nhưng báo "ra sân" / "phòng khách" | **Đúng** | Báo đúng gian (`whereName`: tường phòng khách / tường Bếp / tường Phòng ngủ / sân) |
| 10 | (a) bảng tạo muộn mở lần đầu không đóng bảng nổi khác; (b) cảnh đêm tự bật đè lên ⚙ | **Đúng** (Anki thật: ⚙ + tủ lịch chồng nhau) | (a) `watchPops`: phần tử mới đã hiện lúc được theo dõi → đóng bảng khác ngay; (b) cảnh đêm / thư / cất đồ đợi khi ⚙, cây deck, Tin làng, Nhiệm vụ, gánh hàng, Chụp ảnh còn mở |
| 11 | Để vườn mở qua 18:00 ngày 24 → không tự sang tối 24 | **Đúng** | Đồng hồ 60 giây (`_check_day`) thấy vừa qua 18:00 ngày 24 (giờ máy) → dựng lại vườn một lần: cảnh ông già Noel tự chạy, thiệp đang treo khoá, bánh quy còn vụn |
| 12 | Từ 1/1 chỉ có thiệp đã làm / thiệp nhận (chưa mở ngăn, chưa nhận quà) → mất Album → Kỷ niệm | **Đúng** | `le_view` giữ khi còn thiệp / thiệp nhận |
| 13 | Trả lời xoá thiệp / lỗi lưu không xét đúng ô → đã sang ô khác thì ô đó bị xoá trắng / bị đánh dấu | **Đúng** | Xét `res.i === slot`; lỗi lưu theo từng ô (`pend`) |

### 1.3 P3

| # | Lỗi (audit) | Đúng? | Sửa |
|---|---|---|---|
| 14 | Xem thử (admin) không bỏ khi đổi hồ sơ / nhập .colpkg → thấy thiệp của hồ sơ trước | **Đúng** | Bỏ xem thử ở `_on_profile_close` và `_on_collection_load`; bản giữ thiệp sửa dở của collection cũ cũng bỏ |
| 15 | Cắt sổ mở bù / lượt nhờ sửa vô tác dụng (gộp với collection làm sống lại); gộp "mẫu cũ" không giao hoán | **Đúng** | Sau khi gộp cắt lại theo ngày mới nhất của chính sổ (40 ngày / 3 ngày — gộp A + B = B + A); "mẫu cũ" khác nhau ở hai máy → mẫu thật thắng "theo kiểu nhà", rồi theo tên |
| 16 | Đo tốc độ vẽ 19,8 ms / khung trên máy ảo (ngưỡng 12) | Ngưỡng phụ thuộc máy chạy test | Đo thêm cùng cảnh **không có sự kiện** trên cùng máy: sự kiện chỉ thêm ~1,6 ms / khung (máy này 9,5 → 11,1 ms) — phần lớn là cảnh thường. Test xét phần thêm (< 5 ms) và tổng (< 12 ms hoặc < 1,6 × cảnh thường) |
| 17a | 1/1 chỉ nhận quà mở mùa → bảng "đã cất đồ" danh sách trống | **Đúng** | Không bật bảng khi không có gì để cất (sổ vẫn ghi đã cất) |
| 17b | Gemini về sau 18:00 ngày 24 vẫn sửa thiệp ông già Noel đã mang đi | **Đúng** | `fix_set` từ chối; câu "Ông già Noel đã mang thiệp này đi lúc 18:00 — bản sửa không gắn thêm được nữa" |
| 17c | Một chú tuần lộc đèn mà thư viết "hai bạn" | **Đúng** | `facts` ghi `deer1` khi chỉ một chú → "bạn tuần lộc đèn"; sổ 1.36.1 (`deer`) như cũ |
| 17d | Làm sạch không chặn ngày mở ngăn > 31/12, ngày mở hộp < 25/12 | **Đúng** | Bỏ khi đọc (hộp mở sau mùa vẫn giữ) |
| 17e | Giờ đổi ngày của Anki sau 18 giờ → tối 24 ngày Anki còn 23 | **Đúng** | Cảnh đêm cũng chạy khi ngày máy là 24 mà ngày Anki còn 23 (đã xem thì thôi) |
| 17f | Mẫu cũ (tự vẽ) đã xoá trước 1/1 mà bảng cất đồ ghi "về mẫu dùng trước đó" | **Đúng** | Lúc cất đồ, mẫu cũ không còn dùng được → sổ ghi "theo kiểu nhà" ngay (bảng ghi đúng) |

## 2. Tìm thêm — thấy và sửa

| Lỗi | Sửa |
|---|---|
| Bản giữ để lưu nốt (#05) / bản chờ gửi lại (#04) lấy từ lúc **Xem thử** có thể lưu thiệp sửa lúc xem thử vào sổ thật khi tắt xem thử rồi đóng cửa sổ | Xem thử: không giữ; bật / tắt Xem thử → bỏ bản giữ (Python) và bản chờ (trang) |
| (khi thử sửa #02) Đếm cả Esc đã chặn vào hàng đợi → Esc hợp lệ ở màn chính ngay sau đó bị coi là "đã dùng" | Không đưa vào; test khoá (Esc ở màn chính sau các lớp Giáng sinh vẫn đóng cửa sổ) |
| Gửi lại thiệp tự động lúc đồng bộ dài → "Anki đang đồng bộ" bật lặp mỗi lần gửi | `le:card:` là lệnh tự động (không báo); xưởng thiệp ghi một dòng; gửi lại khi vườn dựng lại sau đồng bộ |
| Xoá thiệp bị bỏ lúc đồng bộ → chữ đang sửa trên thiệp đó không còn được lưu | Chưa xoá được thì đánh dấu chưa lưu (lần lưu sau giữ chữ đang thấy) |
| Gemini sửa xong điều ước của thiệp khác (đã đổi ô) mà báo "xem bên dưới" | Báo "… của thiệp N — mở thiệp đó để xem" |
| Đóng cửa sổ vườn giữa lúc đồng bộ → bản giữ bị bỏ | Xếp hàng sau đồng bộ (`_sync_wait`), lưu đúng hồ sơ lúc giữ |
| Thông báo nổi cũng bị Nhiệm vụ / Tin làng / gánh hàng (z-index 60) che | Cùng sửa #08 |

## 3. Đổi gì người dùng thấy

- Phím tắt không mở bảng khác sau lưng bảng / cảnh Giáng sinh; mũi tên dời sticker không đổi cảnh phía sau.
- Sửa thiệp rồi đóng cửa sổ ngay, hoặc sửa lúc Anki đang đồng bộ: không mất chữ (đồng bộ xong tự lưu).
- Thiệp nhận xoá rồi dán lại mã: giữ lại được.
- Để vườn mở qua 18:00 ngày 24: cảnh ông già Noel tự chạy.
- Thông báo nổi luôn thấy được (trên các bảng nổi).
- Thư: "bạn tuần lộc đèn" khi chỉ bày một chú.

## 4. Kết quả test

| Test | Kết quả |
|---|---|
| `tests/core/test_1362.py` (mới) | **47/47** (cũng 47/47 trên Python 3.9) |
| `tests/core/test_1362.js` (mới, Chromium) | **24/24** |
| `tests/anki/e2e_1362.js` (mới, Anki 26.9.4 thật) | **40/40** · Anki 23.10.1: **40/40** · gói đã giải nén: **40/40** |
| `e2e_1362.js` trên gói **1.36.1** (đối chứng) | **đỏ 20**: phím tắt rò (R / N trong cảnh đêm, mũi tên đổi cảnh, N trong xưởng), gõ rồi đóng ngay mất chữ, lưu thiệp lúc đồng bộ + đổi ô mất chữ, nút Gemini kẹt, mở ngăn không trả lời, đóng cửa sổ lúc đồng bộ mất chữ, thiệp nhận giữ lại mất (Anki thật), Trang trí thử không nhớ mẫu cũ → 1/1 về theo kiểu nhà, cất đồ ghi mẫu đã xoá, bảng cất đồ trống, qua 18:00 không tự sang tối 24. **Xanh trên cả bản cũ**: 4 kiểu Esc Esc nhanh (Esc tới Python 0 lần — mục 02) |
| `tests/anki/e2e_1361.js`, `e2e_136.js` (không sửa) | `e2e_1361.js` **81/81**, `e2e_136.js` **66/66** |
| `tests/run_all.sh` (bộ đầy đủ) | trên gói đã giải nén: **80 mục, TẤT CẢ OK** (8 phút 34 giây) |
| `tests/anki/run_capnhat.sh` (cài đè 1.31.3 → 1.36.2) · `run_habanh.sh` (hạ bản 1.31.3 rồi lên lại) | **5/5 + 18/18** · **4/4 + 10/10 + 18/18** |

Test cũ đổi: `core/test_136.js` mục G (đo phần sự kiện thêm vào thay vì tổng — #16).

## 5. Còn chưa làm / chờ người dùng

- **Xem trên máy thật rồi phát hành** 1.36.0 + 1.36.1 + 1.36.2 cùng lúc (~30/11–2/12): ⚙ → Xem thử sự kiện (cần file
  `user_files/admin`): 10/12 (tủ lịch, xưởng thiệp), 24/12 tối · ông già Noel, 25/12 · thư, 1/1 · cất đồ — danh sách ở
  `docs/kiem_thu/1.36/BAO_CAO.md` mục 5 và `docs/kiem_thu/1.36.1/BAO_CAO.md` mục 5. Mọi chi tiết hình / chữ / cách bày của 1.36.x
  là Claude chọn.
- Phần của kế hoạch Giáng sinh chưa làm (PHAT_TRIEN.md mục 10.0f): StackChan ăn bánh kem sáng 25, ảnh kỷ niệm tự chụp đêm 24,
  trang web "Xem mã" mở mã thiệp, "1/12 năm sau bày lại Bộ Giáng sinh 2026", Tô tranh theo số (sau Noel).
- Câu hỏi cũ còn chờ trả lời: khôi phục bản sao lưu sạch (1.35.5 mục 5), giữ hay gộp 11 tab Nhà (1.33.2), báo Gemini riêng từng
  hồ sơ (R01, 1.31.1), StackChan ở chế độ Tiếng Nhật không xen câu tiếng Việt (1.33.3); vườn gọn kiểu ngăn luống 01b đã chọn nhưng
  chưa làm (mục 10.0d); thử đồng bộ AnkiWeb + điện thoại thật (1.31.2 mục 4).

## 6. Xem trên máy thật (1.36.2)

1. Mở tủ lịch → mở một ngăn → bấm Esc hai lần thật nhanh: thẻ kết quả rồi tủ lịch đóng, cửa sổ vườn còn (như 1.36.1 — để chắc).
2. Xưởng thiệp: chọn một sticker → bấm ← → vài lần: sticker dời, cảnh phía sau **không đổi**.
3. Gõ lời chúc rồi bấm ✕ cửa sổ vườn ngay → mở lại: chữ còn.
4. Album → Kỷ niệm → dán mã thiệp của bạn → Giữ → Xoá → dán lại → Giữ → đóng / mở vườn: thiệp còn.
5. (admin) Xem thử 24/12 tối → Bỏ qua → Esc Esc nhanh: cảnh đóng, cửa sổ còn.
