# QA trước phát hành Kotoba Batake 1.35.4

**Kết luận ngày 19/11/2026 — nên hoãn phát hành bản cuối 1.35.4 để vá các lỗi P1.** Đợt kiểm tra chuyên sâu toàn bộ mã nguồn (khoảng 63.500 dòng Python/JS/CSS), gói `.ankiaddon` và chạy thử các kịch bản ngoài bộ test có sẵn ghi nhận **27 mục** gồm **7 P1**, **14 P2** và **6 nhóm P3**. Dù toàn bộ bộ test tự động có sẵn đều xanh (`tests/run_all.sh` thoát `0`), các kịch bản ngoài test có sẵn tái hiện được lỗi mất dữ liệu đồng bộ/khôi phục, cắt mất 20–33% giao diện khi bật tỉ lệ phóng to UI Scale của Anki, ẩn toàn bộ báo Gemini ngoài tiếng Anh khi tiếng Nhật dùng Claude Code, và 3 lỗi mất chữ/ngoại lệ trong Lịch hoa.

**Bản đã kiểm** là nhánh `master` của `dungmt2808/kotoba-anki`, commit `875444c472054645b3cc776689e8830b3a58d582` (`manifest.json`: phiên bản `1.35.4`, `min_point_version: 231000`, `max_point_version: 260904`, `mod: 1795058892`). Toàn bộ **79 tệp** trong `kotoba_batake.ankiaddon` khớp từng byte với thư mục `kotoba_batake/`, qua kiểm CRC, SHA-256 là `b7c3c5e667d05f9efd201756b92af43982410c084e167066e0e252fc60da90a3`. [Commit đã kiểm](https://github.com/dungmt2808/kotoba-anki/commit/875444c472054645b3cc776689e8830b3a58d582)

---

## P1 · Lỗi cần chặn phát hành

### 01 · `_sync_hold()` mở khóa quá sớm theo `mw.progress.busy()`, làm đồng bộ ghi đè mất dữ liệu vườn mới hơn

**Cơ chế lỗi.** Lớp bảo vệ đồng bộ đặt `_sync_running = True` ở `sync_will_start` và chỉ tắt cờ + gọi `sync_core.after_sync()` ở `sync_did_finish`. Tuy nhiên `_sync_hold()` lại kiểm tra `bool(mw.progress.busy())` thay vì giữ khóa trọn vòng đời cho tới `sync_did_finish`.

Đối chiếu mã nguồn `aqt` thật trên cả **Anki 23.10.1** và **Anki 26.9.4**:
- Trong `aqt/taskman.py#L109-L111`, `self.mw.progress.finish()` chạy **trước** callback `on_done(fut)`.
- Trong `aqt/sync.py#L119-L202`, `on_done` của đồng bộ có thể mở hộp thoại chặn người dùng (thông báo từ máy chủ `showText(out.server_message)`, hộp thoại chọn chiều đồng bộ toàn phần `ask_user_dialog` tải xuống/tải lên, hoặc cảnh báo sau khi tải) trong khi `mw.progress.busy() == False` và `sync_did_finish` **chưa hề chạy**.

**Tái hiện.** Trong khoảng thời gian giữa lúc `mw.progress.finish()` chạy và lúc `sync_did_finish` chạy (ví dụ người dùng đang nhìn hộp thoại đồng bộ hoặc một tác vụ nền `@_after_sync` như `_ai_done` / `_fix_done`, hay thao tác từ cửa sổ Vườn đang mở):
1. `_sync_hold()` trả về `False` dù `_sync_running == True` và `after_sync()` chưa chạy.
2. Mọi lệnh ghi qua `backup_core.put_config` (hoặc callback `@_after_sync`) đi thẳng vào collection vừa tải xuống bản cũ, và `backup_core.put_config` đóng dấu `rev.t` mới lớn hơn `before.rev.t`.
3. Khi `sync_did_finish` chạy `after_sync(mw.col, USER_DIR, before)`, hàm `decide(before, cur)` thấy `cur.rev.t > before.rev.t` → trả về `KEEP`, **vĩnh viễn ghi đè dữ liệu vườn mới hơn trước đồng bộ bằng bản cũ**.

**Kỳ vọng.** Khóa ghi đồng bộ phải giữ kín cho đến khi `_sync_guard_after()` chạy xong trong `sync_did_finish` (hoặc dùng thêm một cơ chế hết hạn an toàn thay vì phụ thuộc `mw.progress.busy()`). [Hàm giữ đồng bộ](../../../kotoba_batake/__init__.py#L1063-L1086) · [Hook trước/sau đồng bộ](../../../kotoba_batake/__init__.py#L1118-L1143) · [Cầu nối chặn lệnh](../../../kotoba_batake/__init__.py#L3510-L3521)

---

### 02 · Khôi phục bản sao lưu sạch (trước khi cài add-on) bị hồi sinh lại dữ liệu vườn cũ sau khi khởi động lại

**Tái hiện.** Thực hiện trực tiếp bằng `sync_core.on_open` trên collection Anki thật (đã tái hiện giống nhau trên **Anki 23.10.1** và **Anki 26.9.4**):
1. Hồ sơ đang có dữ liệu vườn (`kotoba_batake_home`, `kotoba_batake_rev`, `kotoba_batake_start`...) và tệp `dong_bo.json` đã lưu bản chụp (`rec["h"] != ""`).
2. Người dùng khôi phục một bản sao lưu sạch (`.colpkg` hoặc bản sao lưu tự động của Anki trước khi cài Kotoba Batake), tức `cur["h"] == ""` và không có `kotoba_batake_*` trong collection.
3. Khi mở bản sao lưu, `on_open(col, user_dir, restoring_backup=True)` chạy nhánh `if cur["h"] and cur["h"] != rec["h"]:`. Vì `cur["h"] == ""`, nhánh này **bị bỏ qua hoàn toàn** — `dong_bo.json` cũ (kể cả cờ `pending=True` nếu đang có) giữ nguyên trên đĩa, và `_on_collection_load` cũng không xóa `backup_core.PENDING`.
4. Lần mở Anki kế tiếp (`restoring_backup=False`), `on_open` thấy `not cur["h"]` → `decide()` trả về `RESTORE` → **hồi sinh toàn bộ dữ liệu vườn cũ đè lên bản sao lưu sạch** (nếu trước đó `backup.PENDING` đang bật thì thậm chí bị ghi đè ngay ở lần ghi đầu tiên mà không cần khởi động lại).

**Kỳ vọng.** Khi `restoring_backup=True`, kể cả `cur["h"] == ""`, phải cập nhật/xóa bản chụp `dong_bo.json` cũ và xóa `backup_core.PENDING` để tôn trọng bản sao lưu người dùng vừa chọn. [Xử lý mở hồ sơ](../../../kotoba_batake/sync_core.py#L318-L337) · [Quyết định đồng bộ](../../../kotoba_batake/sync_core.py#L131-L134) · [Hook nạp collection](../../../kotoba_batake/__init__.py#L5642-L5675)

---

### 03 · `GardenState.streak_start()` bỏ qua `backup.settle()` rồi ghi đè mốc chuỗi đã khôi phục, làm mất chuỗi ngày và gãy `lineage` đồng bộ

**Tái hiện.** Đã tái hiện bằng collection Anki thật trên cả **Anki 23.10.1** và **Anki 26.9.4**:
1. Giả lập trạng thái sau khi khôi phục đồng bộ thất bại một phần (`backup.PENDING` đang được gài để trả lại bản chụp có `START_KEY = T0 = 1700000000000`, trong khi collection tạm thời mất `START_KEY`).
2. Gọi `GardenState.streak_start()`.
3. Dòng 4099 gọi thẳng `col.get_config(START_KEY, None)` thay vì `backup.read_config(...)` → **không kích hoạt `backup.settle()`** → thấy `v is None`.
4. Dòng 4107 gọi `backup.read_config(col, MOBILE_KEY)` → lúc này `settle()` mới chạy và **khôi phục đúng `START_KEY = T0`** vào collection.
5. Tuy nhiên `streak_start()` vẫn tiếp tục luồng cũ (`v` vẫn là `None`) và dòng 4114 gọi `backup.put_config(col, START_KEY, {"v": 1, "ms": now})` → **ghi đè `T0` bằng `now` (`1795062528117`)**.

**Hậu quả.** Chuỗi ngày ôn bị đặt lại về hôm nay, đồng thời `START_KEY` chính là định danh `lineage` của lớp bảo vệ đồng bộ (`sync_core.py#L140-L142`) nên máy này bị coi là một "dòng dữ liệu khác" ở các lần đồng bộ sau. [Đọc và đặt mốc chuỗi](../../../kotoba_batake/garden_core.py#L4092-L4117) · [Dòng dữ liệu đồng bộ](../../../kotoba_batake/sync_core.py#L140-L142)

---

### 04 · `sync_core.after_sync()` và `settle()` mất trạng thái bảo vệ chờ khôi phục khi gặp lỗi DB/đĩa thoáng qua

Đã tái hiện cả hai nhánh trên **Anki 23.10.1** và **Anki 26.9.4**:

| Nhánh lỗi | Tái hiện | Thực tế | Kỳ vọng |
|---|---|---|---|
| **A. Lỗi thoáng qua trong `after_sync`** | `before_sync` đã chụp bản mới; khi `after_sync` chạy, `state_of(col)` ném ngoại lệ (hoặc `mw.col` tạm thời là `None` trong `_sync_guard_after`) | `after_sync` bắt `Exception` và trả về `FAILED` nhưng **không gọi `_hold(user_dir, col, before)`** (`backup.PENDING` vẫn là `None`, `dong_bo.json` có `pending=False`); `_sync_guard_after` xóa mất `_sync_before`. Lần ghi tiếp theo tự do ghi đè lên bản cũ mà không có cơ chế giữ lại. | Gọi `_hold()` khi `before` khác `None` để giữ bản chụp an toàn cho đến lần ghi/mở sau. |
| **B. Lỗi ghi `dong_bo.json` trong `settle()`** | `backup.PENDING` đang bật; khi `settle()` khôi phục xong vào collection, `write_record()` bên trong `_apply()` gặp `OSError` (bị nuốt nội bộ) | Dòng 260 trong `settle()` **xóa `backup.PENDING = None` vô điều kiện** dù `dong_bo.json` trên đĩa vẫn còn `pending=True` với bản chụp cũ. Ở lần đồng bộ tiếp theo, `before_sync()` đọc lại bản `pending=True` cũ trên đĩa thay vì chụp dữ liệu mới hiện tại. | Chỉ xóa `backup.PENDING` khi đã xác nhận tệp `dong_bo.json` không còn `pending=True` (như `_apply` ở dòng 299), hoặc xử lý lỗi `write_record` tường minh. |

[Hàm settle](../../../kotoba_batake/sync_core.py#L257-L261) · [Hàm _apply và after_sync](../../../kotoba_batake/sync_core.py#L298-L316) · [Gọi sau đồng bộ](../../../kotoba_batake/__init__.py#L1133-L1143)

---

### 05 · Bật tỉ lệ phóng to giao diện của Anki (UI Scale > 100%) làm cắt cụt 20–33% bên phải toàn bộ cửa sổ Vườn

**Tái hiện.** Mở Anki với thiết lập **Preferences → Appearance → User interface size** khác `100%` (rất phổ biến trên laptop Windows 125%/150% và màn hình HiDPI), sau đó mở Vườn. Đã tái hiện trực tiếp trên **Anki 26.9.4 QtWebEngine** ở kích thước `1366×768`:
- Python chèn `<style>body { zoom: 1.25; }</style>` vào trang (`__init__.py#L2936-L2938`).
- Trong `garden.css#L43-L45`, `body` đặt `overflow-x: clip`, trong khi `#kb-app` đặt `width: 100vw; height: 100vh`.
- Trong Chromium/QtWebEngine, đơn vị `vw`/`vh` không co theo CSS `zoom`, nên `#kb-app` bị phóng rộng lên `1366 × 1.25 = 1708px` (`clippedPx = 342px`, `bodyOverflowX = "clip"`).

**Thực tế.** Khoảng 20% (ở 125%) đến 33% (ở 150%) toàn bộ cạnh phải giao diện — bao gồm nút đóng, thanh công cụ góc phải, phần cuối các bảng Báo / Lịch hoa / Nhà — bị cắt mất hoàn toàn và **không có thanh cuộn ngang** để kéo sang.

**Kỳ vọng.** Dùng `width: 100%; height: 100%` (hoặc dùng `setZoomFactor()` của `QWebEngineView` thay vì CSS `body { zoom }`) để toàn bộ bố cục khớp đúng khung cửa sổ ở mọi mức UI Scale. [Chèn zoom](../../../kotoba_batake/__init__.py#L2936-L2938) · [Khung #kb-app](../../../kotoba_batake/web/garden.css#L43-L45)

---

### 06 · Chọn Claude Code cho báo tiếng Nhật làm ẩn hoàn toàn toàn bộ báo Gemini các tiếng khác (`zh`, `ko`, `de`, `fr`, `vi`)

**Tái hiện.** Đã tái hiện trực tiếp trên **Anki 26.9.4 QtWebEngine**:
1. Cấu hình `bao_source = "claude"` (có thư mục `bao_dir` hợp lệ) và bật thêm ít nhất một ngôn ngữ báo Gemini ngoài tiếng Anh, ví dụ `gemini_langs = ["ja", "zh"]` (hoặc `ko`, `de`, `fr`, `vi`).
2. Mở **Báo → Nguồn báo**.

**Thực tế.** Trong `paper.js#L798`, điều kiện viết `if (!en && v.source === "claude")` thay vì chỉ áp dụng cho tiếng Nhật (`lang === "ja"`). Kết quả là khối **Báo tiếng Trung** (cũng như Hàn, Đức, Pháp, Việt) chỉ hiện đúng một dòng `Nguồn: Claude Code (thẻ bên dưới)` và **mất toàn bộ nút Viết báo, Đọc báo, chọn Trình độ, chọn Deck**.

**Kỳ vọng.** Claude Code chỉ dùng cho báo tiếng Nhật (`lang === "ja"`); mọi ngôn ngữ Gemini khác (`en`, `zh`, `ko`, `de`, `fr`, `vi`) phải hiển thị đầy đủ giao diện quản lý báo Gemini. [Khối ngôn ngữ trong Nguồn báo](../../../kotoba_batake/web/paper.js#L789-L802)

---

### 07 · Lịch hoa: 3 lỗi đồng bộ/xung đột gây ngoại lệ không bắt, ghi đè bài từ máy khác và mất chữ đang gõ

Cả 3 tình huống đều đã tái hiện trực tiếp trên **Anki 26.9.4 QtWebEngine**:

1. **Ngoại lệ `StoreFailed` không được bắt khi bấm đổi tiếng / gợi ý / đánh dấu đã xem lúc `_sync_hold()` đang bật:**
   - `_on_cal()` không bọc `try/except backup_core.StoreFailed` cho `cal:lang:`, `cal:hint` và `cal:seen:`.
   - Khi `_sync_hold() == True`, gọi `d._on_cal("lang:en")`, `d._on_cal("hint")`, `d._on_cal("seen:...")` đều ném thẳng ngoại lệ `StoreFailed: Anki đang đồng bộ nên chưa lưu được.` ra giao diện lỗi của Anki. Riêng `cal:lang:` còn kịp ghi thay đổi ngôn ngữ vào `config.json` trước khi ghi vào `JOURNAL` bị lỗi, khiến cấu hình và bài viết lệch nhau.
2. **`cal:fix` ("Nhờ Gemini sửa") bỏ qua kiểm tra xung đột 3 chiều (`b`):**
   - `cal:text` gửi kèm bản gốc `b` để phát hiện máy khác vừa sửa bài, nhưng `cal:fix` chỉ gửi `{d, t, l}` (không gửi `b`) và `_fix_text()` ghi đè trực tiếp bài đang có trong collection.
   - Đã tái hiện: máy khác đồng bộ về `"OTHER_DEVICE_TEXT"`, trên màn hình cục bộ đang gõ `"LOCAL_UNSAVED_TEXT"`, bấm **Nhờ Gemini sửa** → `"OTHER_DEVICE_TEXT"` bị ghi đè im lặng bởi `"LOCAL_UNSAVED_TEXT"`.
3. **`mergeTyping()` âm thầm xóa mất chữ người dùng đang gõ khi đồng bộ trả về ngày đã khóa (`st = "done"`):**
   - Khi người dùng đang gõ `"UNSAVED_USER_TYPING_12345"` trong ô Luyện viết và một lượt đồng bộ tải về trạng thái ngày hôm nay đã được máy khác sửa xong (`st = "done"`), `cal_stale()` vẽ lại bảng ở chế độ khóa (`ta.readOnly = true`) và gọi `mergeTyping()`.
   - Đã tái hiện: `taReadOnly: true, unsavedPreserved: false` — đoạn chữ chưa lưu bị vứt bỏ hoàn toàn mà không có cảnh báo hay lưu tạm cho người dùng sao chép lại.

[Xử lý lệnh Lịch hoa](../../../kotoba_batake/__init__.py#L4745-L4841) · [Ghi bài trước khi sửa](../../../kotoba_batake/__init__.py#L4929-L4932) · [Gửi lệnh sửa và gộp chữ đang gõ](../../../kotoba_batake/web/calendar.js#L363-L404) · [Lệnh cal:fix](../../../kotoba_batake/web/calendar.js#L715-L722)

---

## P2 · Lỗi chức năng đã tái hiện

| Mã | Hiện tượng và cách tái hiện | Nguyên nhân và vị trí mã nguồn |
|---|---|---|
| **08 · Nhấn `Esc` nhanh 2 lần khi có hộp thoại xác nhận vẫn đóng cả cửa sổ Vườn** | Mở bảng Nhà (`#kb-home`), kích hoạt hộp thoại `GardenUI.ask(...)` (hoặc mở `#kb-sound-pop`, `#kb-scene-card`, `GardenGreet`), sau đó nhấn `Esc` nhanh 2 lần liên tiếp. Đã tái hiện trên **Anki 26.9.4**: cửa sổ Vườn bị đóng luôn (`alive=false`) thay vì chỉ đóng hộp thoại rồi đóng bảng Nhà. | Cơ chế `__kbEscQ` mới ở 1.35.4 bỏ sót các listener `keydown` của `GardenUI.ask`, `#kb-sound-pop`, `#kb-scene-card` và `GardenGreet` (chúng vẫn chạy ở bubble phase mà không ghi nhận vào hàng đợi đóng của `Esc`). [ui.js](../../../kotoba_batake/web/ui.js#L320) · [garden.js](../../../kotoba_batake/web/garden.js#L1362) · [garden.js Esc](../../../kotoba_batake/web/garden.js#L1845-L1851) · [home.js](../../../kotoba_batake/web/home.js#L5872) · [greet.js](../../../kotoba_batake/web/greet.js#L190) · [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L3136-L3141) |
| **09 · Tệp `ban_goc/<hôm_nay>.json` mồ côi khi viết lại truyện bị lỗi làm hỏng `undo_restart()` và `restart_story()` cùng ngày** | Đã tái hiện trên **Anki 23.10.1** và **26.9.4**: (A) Chọn "Đổi sang truyện khác" (`story_restart`) → tạo `ban_goc/<today>.json`, sau đó quá trình gọi Gemini viết lại thất bại (mất mạng/hết quota) → tệp `ban_goc/<today>.json` còn sót dù số báo hôm nay chưa thay đổi; giao diện ẩn cả hai nút "Đổi truyện" và "Quay lại truyện cũ" và `undo_restart()` hỏng. (B) Nếu bấm `restart_story()` lần nữa cùng ngày, bản chụp gốc bị ghi đè làm mất truyện ban đầu. | `story_restart` lưu `ban_goc` trước khi Gemini chạy xong nhưng không dọn tệp này khi tác vụ lỗi/hủy. [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L1813-L1818) · [ai_core.py](../../../kotoba_batake/ai_core.py#L2298) · [story_core.py](../../../kotoba_batake/story_core.py#L1684-L1694) · [paper.js](../../../kotoba_batake/web/paper.js#L1029-L1043) |
| **10 · `Library.story_index()` đè lẫn số kỳ giữa các bộ truyện sau khi đổi truyện** | Đã tái hiện trên **Anki 23.10.1** và **26.9.4**: Bộ truyện 1 có kỳ 1..4 (kỳ 4 ngày `2026-11-13`), sau đó đổi sang Bộ truyện 2 có kỳ 1..3 (kỳ 3 ngày `2026-11-16`). Khi mở kỳ 4 của Bộ truyện 1, cảnh báo *"Bạn chưa đọc kỳ 3"* dẫn tới `2026-11-16` (kỳ 3 của Bộ truyện 2, thậm chí là ngày ở tương lai so với số đang đọc). | `story_index()` lập chỉ mục phẳng `{ky: ngay}` không phân biệt `truyen_id` / bộ truyện. [paper_core.py](../../../kotoba_batake/paper_core.py#L595-L603) · [paper_core.py](../../../kotoba_batake/paper_core.py#L899-L902) · [paper.js](../../../kotoba_batake/web/paper.js#L1240-L1246) |
| **11 · Màn ôn thẻ bị kẹt vĩnh viễn (`flipping = true`) nếu lệnh `rv:show:` rơi đúng lúc `_sync_hold()` hoặc `_show_answer()` ném lỗi** | Đã tái hiện trên **Anki 26.9.4**: mở màn ôn thẻ, khi `_sync_hold() == True` nhấn `Space` để lật mặt sau. Lệnh `rv:show:` bị bỏ qua im lặng ở Python, trong khi phía JS đã khóa `flipping = true` và không bao giờ nhận lại `showAnswer()` để mở khóa → không thể lật thẻ hay chấm điểm nữa (`answerShown=false`). | `flipping` chỉ được gỡ khi Python gọi lại `showAnswer`; khi bridge chặn hoặc ném lỗi, JS không có cơ chế khôi phục. [garden.js](../../../kotoba_batake/web/garden.js#L1057-L1063) · [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L3511-L3521) · [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L3246-L3259) |
| **12 · Bấm `R` (Tưới ngay) rồi mở ngay bảng khác (`N`/`T`/`B`/`L`) làm 2 bảng lớn chồng đè nhau** | Đã tái hiện trên **Anki 26.9.4**: bấm nút **Tưới ngay** (`rv:start` chạy bất đồng bộ qua Python) và bấm ngay mở **Nhà** (`GardenHome.open()`). Khi Python trả `showCard()` về, `#kb-panel` mở đè lên mà không đóng `#kb-home` → kết quả `{"reviewOpen":true,"homeOpen":true}`. | `showCard()` mở `#kb-panel` mà không gọi `closeOthers("review")` (hoặc hủy mở nếu người dùng đã chuyển sang bảng khác). [garden.js](../../../kotoba_batake/web/garden.js#L1026-L1035) · [garden.js](../../../kotoba_batake/web/garden.js#L1136-L1152) · [garden.js](../../../kotoba_batake/web/garden.js#L1775-L1812) |
| **13 · Trò `Điền vào câu` tiếng Đức lọc sạch mọi đáp án nhiễu trên deck có ghi số nhiều (`der Hund, -e`)** | Trên deck danh từ tiếng Đức chuẩn dạng `der Hund, -e`, `die Frau, -en`, `das Kind, -er`, `der Baum, ¨-e`: câu hỏi `Điền vào câu` chỉ còn **1 nút đáp án duy nhất** (mất hết đáp án nhiễu). | `wordForms()` tách theo dấu phẩy `,` biến `der Hund, -e` thành phần phụ `"-e"`, `"-en"`, `"-er"`. Hàm `clozeChoices()` loại mọi từ có bất kỳ phần phụ nào là chuỗi con của nhau → `"-e"` trùng chuỗi con với `"-en"`, `"-er"`, `"¨-e"` nên gần như mọi danh từ số nhiều đều bị loại. [wordForms](../../../kotoba_batake/web/games.js#L258-L272) · [clozeChoices](../../../kotoba_batake/web/games.js#L2344-L2357) |
| **14 · Trò `Lật cặp` treo bàn chơi trống `0/0` với deck tiếng Nhật katakana kèm cách đọc hiragana** | Trên deck tiếng Nhật chứa các thẻ từ katakana có trường cách đọc hiragana (ví dụ `コーヒー` / `こーひー`), chọn trò **Lật cặp** chế độ **Từ ↔ Cách đọc**. Trò chơi mở bàn trống không có thẻ nào (`0/0`), đồng hồ vẫn chạy và không thể kết thúc. | `has(p, "reading")` ở dòng 619 không kiểm tra `HAS_KANJI.test(p.word)` nên `poolFor()` vẫn cho vào chơi; nhưng `runMemory()` ở dòng 2160 lại lọc `HAS_KANJI.test(p.word)` khiến `chosen = []`, `cards = []`. [has()](../../../kotoba_batake/web/games.js#L619) · [poolFor()](../../../kotoba_batake/web/games.js#L816) · [runMemory()](../../../kotoba_batake/web/games.js#L2156-L2185) |
| **15 · Lỗi nối từ & tạo chỗ trống trên tiếng Đức (nguyên âm hoa đầu từ) và tiếng Hàn (dấu ngoặc trước từ)** | Đã tái hiện trên **Anki 23.10.1** và **26.9.4**: (1) `eu_core._de_umlaut` chỉ đổi nguyên âm thường (`ä/ö/ü`), bỏ sót chữ hoa đầu từ `Ä/Ö/Ü` nên số nhiều biến âm như `Äpfel` (`Apfel`), `Ärzte` (`Arzt`), `Ämter` (`Amt`), `Öfen` (`Ofen`) trả về chuỗi rỗng `""` và không khớp từ. (2) `ko_core.find_links` trên chuỗi có dấu câu sát đầu từ như `"[학교]에서"` tính lệch chỉ số ký tự, che nhầm `[학` và để lộ `교]`. | Bảng chuyển đổi thiếu `Ä/Ö/Ü` trong `eu_core.py`; `ko_core.py` cắt dấu câu nhưng tính vị trí gốc chưa bù độ dài tiền tố dấu câu. [eu_core.py](../../../kotoba_batake/eu_core.py#L181-L191) · [ko_core.py](../../../kotoba_batake/ko_core.py#L20) · [ko_core.py find_links](../../../kotoba_batake/ko_core.py#L188-L198) |
| **16 · Lỗi hậu xử lý báo Gemini: `autofix()` giữ lại `tu_moi` bị che khiến `check()` chắc chắn trượt; `_fix_jp()` làm hỏng okurigana khi đọc là katakana** | Đã tái hiện bằng Python: (1) Trong `ai_zh.autofix()` (và tương tự ở `ai_en`, `ai_eu`, `ai_ko`), khi từ mới ngắn như `"家"` chỉ xuất hiện bên trong từ dài hơn trong deck (như `"大家"`), `autofix()` vẫn giữ `"家"` trong `tu_moi` vì chỉ kiểm tra `w in t`, rồi bước nối từ ưu tiên ghép `"大家"` làm `"家"` không có link riêng → `check()` báo lỗi `tu_moi: "家" khai báo là từ mới nhưng không có trong bài` và ép gọi lại Gemini. (2) Trong `ai_core._fix_jp()`, nhánh `{surf\|read\|key}` quên gọi `to_hira(read)` trước `_split_kana` → `{食べる\|タベ\|食べる}` bị biến thành `{食\|タベ\|食べる}べる` (lặp `べる`). | `autofix` lọc `tu_moi` bằng kiểm tra chuỗi con trước bước gắn link; nhánh `{...}` của `_fix_jp` không chuẩn hóa katakana sang hiragana như nhánh `[...]`. [ai_zh.py](../../../kotoba_batake/ai_zh.py#L441) · [ai_eu.py](../../../kotoba_batake/ai_eu.py#L397-L412) · [ai_ko.py](../../../kotoba_batake/ai_ko.py#L293-L312) · [ai_core.py](../../../kotoba_batake/ai_core.py#L1591-L1618) |
| **17 · Bộ chọn deck báo (1.35.4): khóa luôn ô deck cha khi đã chọn 5 deck con; deck mất hết note ngôn ngữ đó trở thành "deck ma" không bỏ tick được** | (1) Khi người dùng đã chọn 5 deck con cùng thuộc một deck cha, muốn tick deck cha để gom 5 deck con thành 1 lựa chọn duy nhất: dù hàm `tick()` có logic gom con, ô checkbox của deck cha lại bị `cb.disabled = true` (`picked.length >= max`) nên không bấm được. (2) Nếu một deck đã chọn bị chuyển ngôn ngữ hoặc xóa hết note của ngôn ngữ đang chọn, nó biến mất khỏi danh sách `decks` từ `words_core` nhưng ID vẫn kẹt trong `picked` chiếm 1/5 suất và người dùng không còn checkbox nào để bỏ chọn. | Điều kiện `cb.disabled` không xét trường hợp `tick(r, true)` sẽ làm giảm tổng số deck; giao diện không render mục cho ID trong `picked` vắng mặt trong `rows`. [tick & disabled](../../../kotoba_batake/web/paper.js#L676-L684) · [checkbox](../../../kotoba_batake/web/paper.js#L712-L717) · [words_core.py](../../../kotoba_batake/words_core.py#L80-L97) |
| **18 · Nhập `.colpkg` khi Vườn đang mở không xóa trạng thái `drafts`/`trying` của Nhà; đổi deck không xóa `_undo_stack`** | (1) Khi nhập collection mới trong lúc Vườn đang mở, `GardenHome` giữ nguyên biến cục bộ `trying` và `drafts` của hồ sơ/collection cũ. (2) Đã tái hiện trực tiếp trên **Anki 26.9.4**: ôn 1 thẻ ở deck A (`len(_undo_stack) = 1`), chuyển sang deck B (`len(_undo_stack)` vẫn là `1`) — bấm hoàn tác (`rv:undo`) sẽ hoàn tác nhầm thẻ của deck A dù đang đứng ở deck B. | Đường tải lại collection không gọi reset trạng thái `trying`/`drafts` trong `home.js`; đổi deck chỉ tải lại dữ liệu mà không xóa `_undo_stack`. [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L3476-L3495) · [rv:undo](../../../kotoba_batake/__init__.py#L3541-L3554) · [home.js](../../../kotoba_batake/web/home.js#L16-L17) · [home.js](../../../kotoba_batake/web/home.js#L5990) |
| **19 · `share_core.parse_code()` ném `UnicodeEncodeError` chưa bắt khi dán chuỗi tiếng Việt/emoji; `sub_pending_settle()` xóa `goi_bao_cho.json` trước khi chắc chắn áp dụng xong** | (1) Đã tái hiện trên **Anki 23.10.1** và **26.9.4**: dán chuỗi chứa ký tự ngoài ASCII (như mã kèm tiếng Việt hoặc emoji) vào ô nhập mã chia sẻ → `base64.urlsafe_b64decode(s)` ném `UnicodeEncodeError` thay vì `ShareError` vì `parse_code` chỉ bắt `(ValueError, binascii.Error)`. (2) `sub_pending_settle()` xóa tệp `goi_bao_cho.json` trước khi gọi `paper_sub_ensure()`; nếu `paper_sub_ensure()` lỗi (ví dụ lúc `_sync_hold()` hoặc lỗi ghi), gói đăng ký chờ bị mất vĩnh viễn. | Thiếu `UnicodeEncodeError` trong `except` của `parse_code`; thứ tự xóa tệp trước khi ghi thành công trong `sub_pending_settle`. [share_core.py](../../../kotoba_batake/share_core.py#L268-L269) · [share_core.py](../../../kotoba_batake/share_core.py#L308-L313) · [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L4559-L4575) · [\_\_init\_\_.py](../../../kotoba_batake/__init__.py#L1916-L1931) |
| **20 · Cú pháp Cloze của Anki (`{{c1::...}}`) lọt nguyên văn vào `Điền vào câu`/mặt thẻ; `make_cloze` thiếu chuẩn hóa NFC cho từ tiếng Nhật và tiếng Hàn** | Đã tái hiện trên **Anki 23.10.1** và **26.9.4**: (1) Trên thẻ kiểu Cloze của Anki (`I like {{c1::apples::fruit}}.`), `text_core.clean()` không gỡ thẻ `{{c1::...}}` nên ký hiệu `{{c1::` lọt thẳng vào câu ví dụ và làm hỏng việc tìm từ trong `make_cloze`. (2) Khi `word` tiếng Nhật (dakuten tách rời NFD như `が` = `か` + `\u3099`) hoặc tiếng Hàn (Hangul Jamo NFD từ macOS) khác dạng chuẩn hóa với câu ví dụ NFC, `make_cloze` không khớp được từ để tạo ô trống. | `clean()` chưa xử lý cú pháp cloze Anki; nhánh JA/KO của `make_cloze` chưa áp `unicodedata.normalize("NFC", ...)` đồng bộ giữa `word` và `sentence`. [text_core.py](../../../kotoba_batake/text_core.py#L106-L115) · [text_core.py](../../../kotoba_batake/text_core.py#L201-L207) · [garden_core.py](../../../kotoba_batake/garden_core.py#L1618-L1648) |
| **21 · Chế độ `Trang trí thử` (Draft Mode): thú cưng/khách/món nhặt ẩn vẫn bắt cú click trên canvas; tạo tường/sàn tự vẽ mới ghi thẳng vào phòng thật** | (1) Khi bật **Trang trí thử**, thú cưng, khách và vật phẩm lấp lánh được ẩn khỏi hình vẽ canvas, nhưng `onCanvasClick()` không kiểm tra `!trying` → bấm vào vùng trống nơi thú cưng/khách đang đứng ngoài cảnh thật sẽ bất ngờ nhảy sang tab Thú cưng/Album khách. (2) Khi đang ở **Trang trí thử** và mở Xưởng vẽ tạo một mẫu tường/sàn mới rồi lưu, callback áp dụng trực tiếp mẫu mới lên phòng thật ở nền thay vì chỉ áp lên bản thử. | Thiếu điều kiện `!trying` trong `onCanvasClick` và trong nhánh áp mẫu mới từ Xưởng vẽ. [home.js ẩn đối tượng](../../../kotoba_batake/web/home.js#L3581-L3582) · [onCanvasClick](../../../kotoba_batake/web/home.js#L4032-L4048) · [áp mẫu xưởng](../../../kotoba_batake/web/home.js#L5768-L5777) |

---

## P3 · Giao diện, trải nghiệm và trường hợp biên ít gặp

- **22 · Phím `Esc` "chết" khi đang focus trong ô tìm deck (1.35.4) và một số ô nhập liệu khác.** Đã tái hiện trên **Anki 26.9.4**: bấm vào ô tìm deck `.kb-ai-dq` khi ô đang trống rồi nhấn `Esc` — không đóng bảng Báo cũng không bỏ focus (`{"paperOpen":true,"dqFocused":true}`) vì handler gọi `e.stopPropagation()` vô điều kiện dù `q.value` rỗng. Hiện tượng tương tự xảy ra ở các ô nhập liệu trong bảng Báo và bảng Nhà. [paper.js](../../../kotoba_batake/web/paper.js#L764) · [paper.js](../../../kotoba_batake/web/paper.js#L1321) · [home.js](../../../kotoba_batake/web/home.js#L5031)
- **23 · Các trường hợp biên của trò `Đuổi quạ`.** (a) Khi thẻ Kanji không có `reading`, hàm `showReveal` hiển thị nguyên văn chuỗi `" → undefined"` ([games.js](../../../kotoba_batake/web/games.js#L1936)). (b) `euAnswers` xóa nội dung trong ngoặc đơn `(sich)` của động từ `"(sich) freuen"` nên người học gõ đúng `"sich freuen"` lại bị chấm sai ([games.js](../../../kotoba_batake/web/games.js#L305)). (c) Thông báo thiếu từ `lackText()` và danh sách chế độ không tính bộ lọc `typeable()` (`> 24` ký tự), nên có thể báo đủ từ nhưng vẫn không chơi được ([games.js](../../../kotoba_batake/web/games.js#L836), [games.js](../../../kotoba_batake/web/games.js#L1179)).
- **24 · Đồng bộ trạng thái các bảng và popover nổi.** `watchPops` bỏ sót các popover động (`#kb-scene-card`, `#kb-life-card`, `#kb-ped-pop`, `#kb-find-card`, [garden.js](../../../kotoba_batake/web/garden.js#L1742-L1769)); `panelsOpen()` bỏ sót `#kb-cal` khiến đồng ruộng có thể bị co lại khi làm mới/đổi cỡ lúc Lịch hoa đang mở ([garden.js](../../../kotoba_batake/web/garden.js#L194-L197)); `openSeason()` không đóng `#kb-fields` và `#kb-ui` ([garden.js](../../../kotoba_batake/web/garden.js#L1923-L1931)).
- **25 · Cửa sổ sửa thẻ `EditCardWindow` (`edit_win.py`).** Đã tái hiện trên **Anki 26.9.4**: không hỗ trợ phím `Esc` để đóng cửa sổ (`stillOpen=true`, chỉ đóng bằng `Ctrl+Return`/`Ctrl+Enter`, [edit_win.py](../../../kotoba_batake/edit_win.py#L51-L78)). Ngoài ra, nếu người dùng để mở `EditCardWindow`, sửa nội dung mặt sau rồi quay lại màn ôn thẻ lật mặt sau khi cửa sổ sửa vẫn mở, mặt sau có thể hiển thị dữ liệu cũ chưa kịp nạp lại ([__init__.py](../../../kotoba_batake/__init__.py#L3246-L3263)).
- **26 · Hoàn thiện đồ họa Canvas & Xưởng vẽ.** Cảnh `bamboo` ở chế độ **Cỡ cảnh: Lớn** (`padTop > 0`) bị cắt ngang giữa trời thay vì vẽ phủ hết phần trời mở rộng ([home.js](../../../kotoba_batake/web/home.js#L1697-L1714)); lớp phát sáng ban đêm trong `season.js` vẫn vẽ dù người dùng đã tắt hiệu ứng (`effects: false`, [season.js](../../../kotoba_batake/web/season.js#L525-L527)); trong Xưởng vẽ, bấm chọn màu nền/đất/đồi không vẽ lại `#kb-cf-grid` ngay lập tức ([craft.js](../../../kotoba_batake/web/craft.js#L920), [craft.js](../../../kotoba_batake/web/craft.js#L1316)).
- **27 · Các lỗi biên mức ảnh hưởng thấp.**
  - `diag.ErrorLog.entries()` ném `ValueError` nếu tệp `errors.json` bị hỏng trường `count`/`first`/`last` thành chuỗi không phải số (đã tái hiện, [diag.py](../../../kotoba_batake/diag.py#L47-L60)).
  - Ô nhật ký `diaryCard` thiếu sự kiện `compositionend` cho bộ gõ IME tiếng Việt/Nhật/Trung/Hàn ([calendar.js](../../../kotoba_batake/web/calendar.js#L503-L513)).
  - `story_restart` và `undo_restart` không cập nhật tệp chia sẻ `kotoba_daily/truyen_chung.json` ([__init__.py](../../../kotoba_batake/__init__.py#L1397-L1428)).
  - `_paper_day()` ẩn lịch sử đọc báo tiếng Nhật từ nguồn không còn được chọn (ví dụ chuyển từ Claude Code sang Gemini hoặc ngược lại, [__init__.py](../../../kotoba_batake/__init__.py#L2362-L2377)).
  - Khi tìm kiếm trong cây deck có deck trung gian bị lọc mất, phần đường dẫn cha bị lặp tên ([paper.js](../../../kotoba_batake/web/paper.js#L720-L722)).
  - `zh_core.bracket_pairs` nhận nhầm ghi chú tiếng Anh trong ngoặc vuông như `[sth]` thành `reading` (đã tái hiện, [zh_core.py](../../../kotoba_batake/zh_core.py#L179-L204)).
  - `build_garden` và `words_core` đổi nhầm thẻ `kanji` tiếng Trung sang `vocab` ([garden_core.py](../../../kotoba_batake/garden_core.py#L2518), [words_core.py](../../../kotoba_batake/words_core.py#L164)).
  - Nếu gọi `retell` bị lỗi cùng ngày sau `restart_story`, prompt gửi lại cho Gemini có thể mâu thuẫn khi vừa đính `story_goc` vừa ghi *"đây là kỳ 1"* ([ai_core.py](../../../kotoba_batake/ai_core.py#L2826), [ai_core.py](../../../kotoba_batake/ai_core.py#L2058-L2072), [ai_en.py](../../../kotoba_batake/ai_en.py#L1106-L1116)).

---

## Các bộ test đã chạy, phạm vi sạch lỗi và ngoài phạm vi

### Bộ test tự động và kiểm chứng thực tế

| Phép kiểm | Môi trường | Kết quả |
|---|---|---|
| Kiểm tra đóng gói `kotoba_batake.ankiaddon` | Python `zipfile` + `sha256` | **ĐẠT** — CRC OK, 79/79 tệp khớp từng byte với `kotoba_batake/`. |
| `tests/run_all.sh` (toàn bộ bộ test hồi quy có sẵn) | Anki 26.9.4 · Python 3.12 · Node | **ĐẠT** — mã thoát `0`, `TỔNG: TẤT CẢ OK`. |
| `tests/core/test_1354.py` + kiểm cú pháp AST/compileall Python 3.9 | Anki 23.10.1 · Python 3.9.25 | **ĐẠT** — 39/39 OK; 0 lỗi cú pháp (`isinstance(x, A\|B)`, `zip(strict=)`…). |
| Kịch bản tái hiện lỗi lõi ngoài bộ test (01–04, 09, 10, 15, 16, 19, 20, 27) | Cả **Anki 23.10.1** và **Anki 26.9.4** | Tái hiện nhất quán trên cả hai phiên bản Anki. |
| Kịch bản tái hiện giao diện & cầu nối trực tiếp (05–08, 11, 12, 18, 22, 25) | **Anki 26.9.4 QtWebEngine** (CDP + `zz_kbtest`) | Tái hiện trực tiếp trên cửa sổ Vườn thật. |

### Các hạng mục đã rà soát và xác nhận sạch lỗi

- **Bảo mật (XSS & Path Traversal):** Đã rà soát toàn bộ JS và Python. `make_cloze` thoát HTML bằng `html.escape`, bộ hiển thị markdown `md()` trong `paper.js` dùng `createTextNode`, `calendar.js` dựng DOM bằng `textContent`, `prefs_script()`/`fix_script()` thoát `<` và `>`. Các mô-đun lưu tệp (`wear_core`, `decor_core`, `share_core`, `draft_core`, `more_core`) đều kiểm tra regex ID chặt chẽ, không có lỗ hổng vượt thư mục.
- **Khả năng tương thích & vá lỗi các bản gần đây:** Đã kiểm chứng các bản vá 1.35.1–1.35.4 gồm cơ chế chống hỏng `draft_load` (1.35.2), bảo vệ khóa `_damaged`, nút ẩn/hiện vườn `#kb-g-garden` (1.35.3), đồng bộ khóa dịch thuật 7 ngôn ngữ trong `lang_core.py` và `web/glang.js` (100% đủ khóa), cách ly văn bản người dùng bằng `U+2068..U+2069`, và tương thích cú pháp/API với Anki 23.10.1 (Python 3.9).
- **Các nghi ngờ đã kiểm chứng trực tiếp và loại trừ (không phải lỗi):**
  - Nhấn `Esc` 1 lần trên các popover capture-phase (`#kb-deck-pop`, `#kb-snap-pop`, `#kb-fields`) đã kiểm chứng sống trên Anki 26.9.4: **không** đóng cửa sổ Vườn (listener `pycmd("close")` của Anki chạy ở bubble phase nên `stopImmediatePropagation()` chặn được).
  - Nhấn `Esc` bên trong iframe mặt thẻ `#kb-card` (kể cả khi đang focus `#typeans`) đã kiểm chứng sống trên Anki 26.9.4: **không** đóng cửa sổ Vườn (`alive=true, panelClosed=true`).
  - Chuỗi giao diện tiếng Việt không nằm trong `web/glang.js` là **đúng thiết kế** (`glang.js` chỉ dịch cụm từ không khí vườn theo ngôn ngữ học).

### Ngoài phạm vi kiểm tra của đợt này

- Chưa gọi máy chủ Gemini API thật, máy chủ AnkiWeb thật và chưa kiểm tra trên thiết bị di động (AnkiDroid / AnkiMobile).
- Chưa chạy các kịch bản giao diện QtWebEngine trực tiếp trên bản Anki 23.10.1 (mới kiểm lõi + tái hiện lỗi lõi trên 23.10.1 và kiểm giao diện trực tiếp trên 26.9.4).
- Ghi chú nhỏ về kho mã nguồn: thư mục gốc của repository chưa có tệp `LICENSE` (chỉ có `kotoba_batake/LICENSE.txt` bên trong add-on).

---

## Tái hiện tối thiểu cho các lỗi P1 cốt lõi (02, 03, 04)

Chạy từ thư mục gốc repository bằng Python có cài gói `anki` (chạy được trên cả Anki 23.10.1 và 26.9.4, không làm thay đổi mã nguồn hay hồ sơ thật):

```bash
PYTHONPATH=kotoba_batake python - <<'PYTHON'
import tempfile
from pathlib import Path
from unittest.mock import patch
from anki.collection import Collection
import backup_core, garden_core, sync_core

with tempfile.TemporaryDirectory() as tmp:
    udir = str(Path(tmp) / "user_files")
    # --- Lỗi 02: khôi phục bản sao lưu sạch (cur["h"] == "") bị hồi sinh dữ liệu cũ ---
    c1 = Collection(str(Path(tmp) / "c1.anki2"))
    try:
        backup_core.put_config(c1, garden_core.START_KEY, {"v": 1, "ms": 1700000000000})
        backup_core.put_config(c1, garden_core.CONFIG_KEY, {"v": 1, "coins": 500})
        sync_core.write_record(udir, c1, sync_core.state_of(c1))
        # Giả lập khôi phục bản sao lưu sạch trước khi cài add-on
        for k in list(sync_core.snapshot(c1).keys()):
            c1.remove_config(k)
        r_restore = sync_core.on_open(c1, udir, restoring_backup=True)
        r_next = sync_core.on_open(c1, udir, restoring_backup=False)
        print("Loi 02:", r_restore["action"], "->", r_next["action"], "state =", c1.get_config(garden_core.CONFIG_KEY))
    finally:
        c1.close()

    # --- Lỗi 03: streak_start() bỏ qua settle() rồi ghi đè START_KEY đã khôi phục ---
    c2 = Collection(str(Path(tmp) / "c2.anki2"))
    try:
        backup_core.put_config(c2, garden_core.START_KEY, {"v": 1, "ms": 1700000000000})
        backup_core.put_config(c2, garden_core.MOBILE_KEY, {"v": 1, "start": 0})
        snap2 = sync_core.state_of(c2)
        c2.remove_config(garden_core.START_KEY)
        sync_core._hold(udir, c2, snap2)
        st = garden_core.GardenState(str(Path(tmp) / "state.json"), lambda: c2)
        got = st.streak_start(col=c2)
        print("Loi 03: expected=1700000000000, got=", got, "in_col=", c2.get_config(garden_core.START_KEY))
    finally:
        backup_core.PENDING = None
        c2.close()

    # --- Lỗi 04B: settle() xóa PENDING dù write_record() gặp OSError ---
    c3 = Collection(str(Path(tmp) / "c3.anki2"))
    try:
        backup_core.put_config(c3, garden_core.START_KEY, {"v": 1, "ms": 1700000000000})
        backup_core.put_config(c3, garden_core.CONFIG_KEY, {"v": 1, "coins": 999})
        snap3 = sync_core.state_of(c3)
        c3.set_config(garden_core.CONFIG_KEY, {"v": 1, "coins": 1})
        sync_core._hold(udir, c3, snap3)
        with patch.object(sync_core, "write_record", side_effect=lambda *a, **kw: None):
            sync_core.settle(c3, udir)
        print("Loi 04B: PENDING=", backup_core.PENDING, "disk_pending=", bool(sync_core._pending(udir, c3)))
    finally:
        backup_core.PENDING = None
        c3.close()
PYTHON
```
