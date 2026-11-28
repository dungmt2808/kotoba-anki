# Báo cáo 1.36.6 — ảnh trong thẻ "nháy" khi sang thẻ ở bảng ôn của vườn (27/11/2026)

Người dùng chuyển góp ý của một người chơi (27/11): "bác ơi, lúc t học lâu lâu nó giật giật kiểu mất ảnh cái hiện lại á là do máy
hả bác". Bản gốc: **1.36.5** (chưa phát hành). Sửa thành **1.36.6**: chỉ đổi `web/garden.js` (+ README, manifest), **không đổi lưu
trữ, không đổi file Python**. Nhánh `claude/nice-lovelace-h8wwno`. **Cách sửa Claude chọn, người dùng chưa xem.**

## 1. Kết luận

**Không phải do máy của người chơi.** Bảng ôn của vườn ("Tưới ngay") thay nội dung khung thẻ **ngay lập tức** khi sang thẻ mới, nên
chữ của thẻ mới hiện trước, ảnh tải xong mới "bật" vào — ảnh của thẻ cũ biến mất, vùng ảnh trống một lúc rồi ảnh mới hiện. Ảnh càng
nặng / máy càng chậm (ổ cứng, nhiều tab, máy yếu) thì khoảng trống càng dài nên chỉ "lâu lâu" thấy rõ. Màn ôn của chính Anki không bị
vì nó **tải sẵn + giải mã ảnh trước rồi mới thay** (chờ tối đa 0,2 giây). 1.36.6 làm y như Anki.

## 2. Đo trong Anki thật (`tests/anki/e2e_nhayanh.js`, Anki 26.9.4)

4–6 thẻ có ảnh JPEG 640 × 360 (ảnh nhiễu, giải mã nặng như ảnh chụp), mỗi thẻ một ảnh; quay màn hình từng khung (`Page.startScreencast`)
lúc **lật thẻ** và lúc **chấm → sang thẻ mới**, đếm khung mà vùng ảnh trống (`nhayanh_phan_tich.py`), và đầu dò trong trang đếm khung
"đã có chữ của thẻ mới mà ảnh chưa tải xong".

| | Lật thẻ: khung ảnh trống | Sang thẻ mới: khung ảnh trống | Sang thẻ mới: khung có chữ mà ảnh chưa tải |
|---|---|---|---|
| Vườn **1.36.5** (5 lần) | 0 / 177 | **3** / 255 | **8** |
| Màn ôn **của Anki** (đối chứng, 5 lần) | 0 | 0 | 0 |
| Vườn **1.36.6** (5 lần) | 0 / 204 | **0** / 306 | **0** |

Lật thẻ không trống khung nào trên máy test (vẽ bằng CPU, giải mã ảnh đồng bộ). Máy có GPU có thể giải mã ảnh của `{{FrontSide}}` vừa
dựng lại chậm một nhịp; 1.36.6 cũng chờ giải mã ảnh của mặt sau trước khi thay (ảnh đã có trong bộ nhớ đệm nên gần như tức thì).

## 3. Cách sửa

`FRAME_JS` (khung thẻ dựng một lần cho cả buổi ôn) có thêm `__kbPre(html, done)`: đọc HTML của mặt sắp hiện bằng `<template>` (không
tải ảnh, không chạy script), tải sẵn từng ảnh bằng `new Image()` + `decode()`, xong hết (hoặc lỗi) hoặc quá **200 ms** thì mới thay
`#qa` — như `preloadResources` trong màn ôn của Anki. Giữ nguyên:
- hai lần hiện liền nhau (`__kbSeq`) → chỉ mặt sau cùng được hiện, mặt cũ không lóe lên;
- sang thẻ mới thì hẹn giờ của mẫu thẻ cũ (đếm ngược tự lật…) vẫn dọn **ngay**, trước lúc chờ ảnh;
- script của mẫu thẻ chạy đúng một lần sau khi thay; mặt không có ảnh thay ngay như cũ.

## 4. Test

| Bộ | Kết quả |
|---|---|
| `tests/core/test_1366.js` (mới, Chromium, khung thẻ thật lấy từ `web/garden.js`; ảnh trả chậm 120 ms / 150 ms / 1,5 giây / lỗi 404) | 1.36.6: **12/12** · 1.36.5: **đỏ 6/12** (lúc thay, ảnh còn chưa tải) |
| `tests/anki/e2e_nhayanh.js` (mới, Anki thật + đối chứng màn ôn Anki) | gói 1.36.6: **5/5** trên Anki 26.9.4 và 23.10.1 — lật 0 / 110 và 0 / 80 khung trống, sang thẻ mới 0 / 161 và 0 / 115, khung thiếu ảnh 0; màn ôn Anki 0 |
| Hồi quy bảng ôn trên gói 1.36.6 | 26.9.4: `e2e_tour` 12/12, `e2e_134` (bảng ôn: phím, tự lật / tự chấm, Phóng to) 87/87, `e2e_1322` (✎ Sửa thẻ lúc ôn) 40/40, `e2e_1314` (Ctrl+Z) 53/53, `e2e_1354` (Tưới ↔ vườn) 75/75, `e2e_1361` 81/81 · 23.10.1 (Chromium 112): `e2e_tour` 12/12, `e2e_134` 87/87, `e2e_1322` 40/40, `e2e_1314` 53/53 |
| `tests/run_all.sh` trên gói 1.36.6 | **85 mục, TỔNG: TẤT CẢ OK** (`core/test_1366.js` 12/12) |

## 5. Thêm: vì sao test trên máy cloud đo "2 giây mỗi lượt chấm"

Lúc dò, mỗi lần chấm thẻ trong vườn mất ~2 giây (Anki đứng hình). Nguyên nhân là **môi trường test**: máy cloud đặt sẵn `RUST_BACKTRACE=1`,
nên mỗi lần Anki báo "không có khoá cấu hình" (vườn đọc vài chục khoá chưa có mỗi lần dựng lại: báo, nhật ký, Cấu hình trường… của
người chưa dùng) thì phần lõi Rust ghi lại cả ngăn xếp — ~60 ms mỗi lần (khoá có sẵn: 0,01 ms). Không có biến đó (như máy người dùng):
**chấm → thẻ mới ~45 ms** (dựng vườn ~17 ms, vẽ ~10 ms, khung hình dài nhất 25–53 ms). `run_versions.sh` / `run_anki.sh` nay `unset
RUST_BACKTRACE` để đo giống máy thật. Người dùng tự đặt `RUST_BACKTRACE` (lập trình viên Rust) sẽ thấy vườn chậm như vậy — hiếm, ghi
lại; muốn tránh hẳn thì đọc khoá thiếu một lần mỗi lần dựng vườn (để sau).

## 6. Câu trả lời gợi ý cho người chơi

> Không phải do máy bạn đâu nhé. Lỗi ở bảng ôn của vườn: khi sang thẻ mới nó hiện chữ trước rồi ảnh mới tải xong hiện sau, ảnh nặng thì
> thấy như ảnh biến mất rồi hiện lại. Bản 1.36.6 đã sửa — tải sẵn ảnh rồi mới đổi thẻ, giống màn ôn của Anki. Cập nhật add-on là hết nhé!

## 7. Xem trên máy thật (~2 phút)

Ôn trong vườn (Tưới ngay) một deck có ảnh (ảnh lớn càng dễ thấy): chấm liền vài thẻ — chữ và ảnh của thẻ mới hiện cùng lúc, không còn
khoảng trống chỗ ảnh; lật thẻ ảnh mặt trước đứng yên.
