# Báo cáo 1.33.4 → phát hành ở 1.34.1 — kiểm tra thêm: so đáp án với bộ gõ / deck thật, đoán ngôn ngữ deck (17/11/2026 tối)

Người dùng: "test kỹ giúp tớ addon này và tính năng vừa hiện thực. test thêm nhiều kịch bản, những bộ test ngoài bộ test
có sẵn. test kỹ giúp tớ nhé. đây gần như là lần release cuối cùng rồi. và nếu thêm tiếng Đức hoặc reset báo lại từ đầu thì
có làm nhiều không. vì bản trước release có người nhờ tớ thêm tiếng Đức".

**Cách làm**: phiên này bắt đầu ở 1.32.1 (lúc đó là bản mới nhất của nhánh); trong lúc test, phiên khác đẩy 1.32.2 → 1.33.3
lên cùng nhánh (và 1.34.0 lên master). Đã gộp, chạy bộ test mới trên mã 1.33.3: **mọi lỗi tìm được vẫn còn** → sửa ở **1.33.4**, gộp master 1.34.0 thành **1.34.1** (mục 4). Chi tiết lỗi, kịch
bản và kết quả trên 1.32.1: `docs/kiem_thu/1.32/BAO_CAO.md` mục 7. Mục này là kết quả chạy lại trên 1.33.4.

## 1. Lỗi đã sửa (tóm tắt — đủ ở `docs/kiem_thu/1.32/BAO_CAO.md` mục 7)

| # | Lỗi | Sửa |
|---|---|---|
| 1–3 | Đuổi quạ: gõ tiếng Việt kiểu **tổ hợp** không bao giờ đúng ("quả táo" → "qua ta o"); Hangul tách nét / chữ toàn khổ sai; tiếng Hàn viết liền / cách (사과주스 ↔ 사과 주스) bị tính sai | `games.js` `enNorm` NFKC, `noSpace` cho gõ chữ tiếng Trung / Hàn |
| 4 | Pinyin nhiều cách đọc ghi `hǎo，hào` / `hǎo、hào` / `xíng（háng）` → đáp án dính "haohao", gõ "hao" không đúng | `pyAnswers` tách dấu câu Trung + ngoặc |
| 5 | Ô gõ chấm + xoá lúc bộ gõ còn đang ghép chữ (dễ để chữ thừa) | không chấm lúc `isComposing` |
| 6 | Deck tiếng Nhật có trường nghĩa **"中文"** / **"Korean"** → nhận là tiếng Trung / Hàn — với báo tiếng Trung của 1.33, **từ tiếng Nhật lọt vào danh sách deck của báo tiếng Trung** | có kana → tiếng Nhật trước khi xét tên trường |
| 7 | Deck kanji có trường **"Chinese reading"** → tiếng Trung, biển cây hiện âm On (ニチ) thay cho 日 | dấu hiệu tiếng Nhật chắc chắn → đoán theo chữ |
| 8 | **Deck tiếng Đức / Pháp ít dấu → "Tiếng Anh"** (giọng đọc tiếng Anh, từ lọt vào báo tiếng Anh) | → "Ngôn ngữ khác" |
| 9 | Deck chữ Nga / Thái / Ả Rập / Hindi → "Tiếng Nhật" | → "Ngôn ngữ khác" |

Chỉ đổi cách **đoán** cho loại note chưa cấu hình (không ghi collection) và cách **so đáp án** của Đuổi quạ — không đổi phần
lưu trữ. Ai đã chọn ngôn ngữ ở Cấu hình trường vẫn giữ.

## 2. Kết quả trên 1.33.4 (gói đã đóng, giải nén)

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` (65 bộ, `ANKI_PY` = aqt 26.9.4, `PY39` = aqt 23.10.1) | **TẤT CẢ OK** (`test_132c` 60/60 — trên mã 1.33.3 đỏ 19; `test_133` 96/96; `test_1333` 83/83) |
| Anki 26.9.4: `e2e_132c` 23/23, `e2e_133` 77/77, `e2e_1333_ngonngu` 5/5, `e2e_1322` 40/40, `e2e_132` 39/39, `e2e_132b` 20/20, `e2e_1251` 49/49, `e2e_117` 55/55, `e2e_1314` 53/53 | đạt |
| `run_capnhat.sh` 1.31.3 (đã phát hành) → 1.33.4 | **19 / 19** |
| `run_habanh.sh` 1.33.4 → 1.31.3 → 1.33.4 (hạ bản rồi lên lại) | **23 / 23** |
| Anki 23.10.1: `e2e_132c`, `e2e_133`, `e2e_132b` | **23/23, 77/77, 20/20** |

Hai lần "đỏ" trong lúc chạy là do test, không phải add-on: (a) `e2e_132b` — khách ghé thật trong lúc test (theo khung 4
phút giờ thật) được ghi "gặp hôm nay", test giả định "chỉ xem thì không ghi gì" → ghi sẵn lượt gặp hôm nay trước khi chụp;
(b) `e2e_habanh` — bản cũ ghi lại cấu hình add-on theo thứ tự khoá của nó (nội dung y nguyên) → so theo nội dung.

## 3. Tiếng Đức / "reset báo lại từ đầu" — ước lượng (chưa làm, chờ người dùng chọn)

Ghi ở `PHAT_TRIEN.md` mục 10.0c. Tóm tắt:

| Việc | Công sức | Ghi chú |
|---|---|---|
| Deck tiếng Đức chơi được như "Ngôn ngữ khác" | **đã có ở 1.33.4** | cây, xu, 5 trò chơi (Đuổi quạ gõ từ / gõ nghĩa); không còn bị nhận là tiếng Anh |
| Deck tiếng Đức riêng (der / die / das, số nhiều, giọng máy de_DE, Đuổi quạ nhận ae / oe / ue / ss) | ~1 phiên | như phần deck tiếng Trung / Hàn của 1.32, nhẹ hơn vì chữ Latin |
| Ngôn ngữ trong vườn tiếng Đức | ~½ phiên | ~270 câu / tên; cần người biết tiếng Đức đọc lại |
| Báo tiếng Đức | ~1–2 phiên + chạy Gemini thật nhiều ngày | khung nhiều báo của 1.33 dùng lại được; khó ở nối tra từ (chia động từ, cách, động từ tách, danh từ ghép) |
| "Reset báo": nút bắt đầu truyện mới | ~½ phiên | cất bộ nhớ truyện vào thư mục sao lưu, số báo cũ vẫn đọc được, không mất xu / tiến độ; thêm tiếng Đức **không** cần reset |

## 4. Gộp master 1.34.0 → 1.34.1

Người dùng: "gộp với master đi ạ". Master đã có 1.34.0 (bảng ôn theo góp ý, ô chọn deck dạng cây, Trang trí thử — phiên
khác) → gộp vào nhánh, phần sửa thành 1.34.1, chạy lại trên gói 1.34.1: RESULT_1341
