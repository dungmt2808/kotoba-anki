# Kế hoạch 1.32.2 — sửa thẻ ngay lúc ôn trong vườn (chưa làm)

Góp ý của một người dùng (17/11, người dùng chuyển lời): "thêm phần chỉnh sửa thẻ ngay lúc học thẻ luôn … thường học thẻ
anki sẽ có nút chỉnh sửa bên góc dưới bên trái". Người dùng: "tớ nghĩ tớ sẽ làm ở session sau". Claude đề xuất làm thẳng
(nút nhỏ giống Anki) rồi gửi ảnh chụp, không cần ảnh phác — **người dùng chưa trả lời có cần ảnh phác không, hỏi lại**.

## Làm gì

1. **Nút "✎ Sửa"** ở góc dưới bên trái bảng ôn (Tưới ngay), hiện ở cả mặt trước và mặt sau; **phím E** như Anki (trong vườn
   chưa dùng; không bắt khi đang gõ trong ô đáp án / có Ctrl / Alt; nút không giữ focus như nút Hoàn tác 1.31.4).
2. Bấm → mở **cửa sổ sửa note của chính Anki** cho note của thẻ đang ôn.
   - Anki 26.x: `aqt.editcurrent` dùng `mw.reviewer.card` (chỉ khi Anki đang ở màn ôn) → không dùng được thẳng; tự dựng
     cửa sổ nhỏ có `aqt.editor.Editor` (hoặc `NewEditor` / `editcurrent_legacy` tuỳ bản) với `set_note(card.note())`.
   - Bản Anki nào không dựng được → mở Trình duyệt thẻ ở đúng note (`aqt.dialogs.open("Browse", mw, search=("nid:…",))`).
   - Chạy được từ Anki 23.10 tới 26.x (`manifest.json` min / max của add-on).
3. Lưu xong → thẻ đang ôn hiện lại nội dung mới ở đúng mặt đang xem (nạp lại `card` / note rồi dựng lại mặt trước / mặt
   sau); cây trong vườn cập nhật chữ / nghĩa. Lượt ôn đang dở giữ nguyên: không bỏ qua thẻ (`_card_changed` so `cards.mod`,
   sửa note chỉ đổi `notes.mod` → không bị coi là "đổi ở chỗ khác"), không cộng / trừ xu, không thêm revlog.
4. Đang lưu lượt chấm / đang hoàn tác → nút tạm khoá (`_busy`). Đóng vườn khi cửa sổ sửa đang mở → cửa sổ sửa vẫn lưu
   như Anki (`call_after_note_saved`).
5. Undo: lần sửa là thao tác "Update Note" của Anki — hoàn tác được ở Edit → Undo của cửa sổ chính. Ctrl+Z trong vườn giữ
   như 1.31.4 (chỉ hoàn tác lượt chấm khi đó là bước Undo kế tiếp — vừa sửa note thì báo "không có gì để hoàn tác").
6. Không đổi phần lưu trữ của vườn (không khoá collection mới, không mục config mới).

## Test

- `core/test_1322.py`: soát mã (lệnh cầu nối `rv:edit`, phím E không bắt trong ô gõ, nút không giữ focus), không đổi lưu trữ.
- `anki/e2e_1322.js` (Anki 26.9.4 thật): mở cửa sổ sửa từ mặt trước / mặt sau / phím E; đổi trường Nghĩa → lưu → thẻ đang ôn
  hiện chữ mới, cây cập nhật, revlog / xu không đổi; huỷ → không đổi; sửa xong chấm thẻ bình thường; sửa rồi Ctrl+Z trong
  vườn → không hoàn tác nhầm; Undo ở cửa sổ chính trả lại chữ cũ; đóng vườn khi đang sửa; mở 2 lần liền chỉ một cửa sổ.
- Anki 23.10 (`~/.venv-anki2310`): mở được cửa sổ sửa (hoặc Trình duyệt thẻ).
- `anki/run_capnhat.sh` 1.31.3 → 1.32.2; `tests/run_all.sh`.
