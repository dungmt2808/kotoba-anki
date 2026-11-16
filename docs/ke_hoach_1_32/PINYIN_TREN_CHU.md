# Ý tưởng để làm sau: pinyin nằm trên từng chữ (deck tiếng Trung)

Ghi 17/11 theo lời người dùng: "ghi lại ý tưởng phần này đi, để làm với session sau thử". Phần này đã có trong ảnh phác
1.32 (`132_09_cay_trung_han.png`) nhưng **không làm ở 1.32.0**: phiên chat bị chặn ("Message flagged") mỗi lần bắt đầu
làm (3 lần liền) — người dùng: "cứ làm đến pinyin là sẽ bị dừng".

## Hiện tại (1.32.0)

- Cây tiếng Trung hiện chữ ở dòng trên, pinyin **đúng như deck ghi** ở dòng dưới (thẻ khi bấm cây `#kb-pin`, ô gợi ý khi rê
  chuột `#kb-tip-word`).
- Deck ghi pinyin bằng số (kiểu `ni3 hao3`) thì hiện nguyên số.
- Đuổi quạ gõ pinyin đã làm (so không cần tách âm tiết: `games.js` `pyKey` / `pyTyped` / `pyAnswers`).
- CSS `ruby.kb-ruby rt` đã có sẵn trong `web/garden.css` (chưa dùng).

## Muốn làm

1. **Đổi số → dấu thanh khi hiển thị**: pinyin ghi số (`hao3`, thanh nhẹ ghi 5 hoặc không ghi, `v` / `u:` = ü) hiện thành
   pinyin có dấu. Luật đặt dấu: có a hoặc e thì đặt ở đó; có "ou" thì đặt ở o; còn lại đặt ở nguyên âm cuối.
2. **Pinyin nằm trên từng chữ** (như furigana của tiếng Nhật) ở thẻ khi bấm cây; tách không được thì giữ dòng dưới như bây giờ.
   - Deck ghi kiểu Anki `中[...]文[...]` → `text_core.tokens` đã tách được từng cặp chữ / cách đọc.
   - Pinyin có dấu cách / dấu nháy giữa các âm tiết → tách theo đó.
   - Pinyin viết liền → tách bằng danh sách âm tiết pinyin hợp lệ (khoảng 400 âm tiết, không dấu), chọn cách tách có số
     âm tiết bằng số chữ Hán; không có cách nào thì bỏ.
3. (tuỳ chọn) dùng chung ở chỗ khác hiện cách đọc: biển quạ khi lộ đáp án, thẻ Lật cặp, kết quả trò chơi.

## Chỗ sửa

- Python: `garden_core.note_details` (nhánh `lang == "zh"`) — chuẩn hoá cách đọc + thêm `ruby` (danh sách cặp chữ / âm tiết)
  vào dữ liệu cây; hàm chuyển nên để ở module nhỏ riêng (vd. `zh_core.py`), thuần Python để test offline.
- JS: `garden.js` `showPin` (dựng `<ruby class="kb-ruby">` trong `#kb-pin-word`, ẩn `#kb-pin-reading` khi đã có ruby),
  tip khi rê chuột.
- Không đổi gì phần lưu trữ (chỉ là cách hiển thị).

## Test nên có

- Đổi số → dấu: các trường hợp a / e / ou / nguyên âm cuối, ü (v, u:), thanh nhẹ, chữ hoa đầu từ, nhiều âm tiết.
- Tách âm tiết: có dấu cách, có dấu nháy, viết liền, số âm tiết không khớp số chữ → không tách.
- Danh sách âm tiết lấy từ từ điển pinyin độc lập (pypinyin, như `tests/tools/soat_chu_132.py`), không gõ tay.
- `e2e`: bấm cây tiếng Trung → thẻ có `ruby`; deck ghi số → hiện dấu.

## Mẹo cho phiên sau (để khỏi bị chặn giữa chừng)

- Làm từng bước nhỏ, commit sau mỗi bước.
- Không gõ tay bảng âm tiết / bảng nguyên âm có dấu trong tin nhắn hay mã: sinh bằng script từ pypinyin (venv riêng
  trong scratchpad, như 1.32) rồi ghi ra file dữ liệu; trong mã dùng ký tự dấu kết hợp viết dạng `̄` `́`
  `̌` `̀` + `unicodedata.normalize("NFC", …)`.
- Tin nhắn trả lời người dùng ngắn, không liệt kê nhiều pinyin.
