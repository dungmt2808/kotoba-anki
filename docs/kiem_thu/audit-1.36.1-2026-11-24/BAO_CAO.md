# Báo cáo QA & Kiểm tra phát hành cuối — ことば畑 1.36.1 (24/11/2026)

- **Phạm vi kiểm tra**: toàn bộ bản **1.36.1** (commit `c2bc70e` trên `master`), tập trung kỹ vào **sự kiện Giáng sinh 2026** (1.36.0 + 1.36.1: tủ lịch 24 ngăn, cây thông, áo nhà, đèn sân, hộp quà, nhạc Giáng sinh, xưởng thiệp + điều ước + Gemini sửa, mã thiệp `KBC1:`, cảnh ông già Noel đêm 24, thư sáng 25, cất đồ 1/1, Album → Kỷ niệm, Xem thử admin), đồng thời kiểm tra hồi quy toàn hệ thống, đồng bộ AnkiWeb, lưu trữ, giao diện và tương tác bàn phím/chuột.
- **Nguyên tắc nhánh này**: chỉ ghi báo cáo lỗi, **không sửa bất kỳ file mã nguồn hay file test nào của add-on**.
- **Phương pháp kiểm tra**:
  1. Đối chiếu gói `kotoba_batake.ankiaddon` với thư mục mã nguồn `kotoba_batake/`.
  2. Chạy toàn bộ bộ test sẵn `tests/run_all.sh` (gồm cả bộ test chạy với `anki.collection` thật, máy chủ đồng bộ thật của Anki, bộ hồi quy audit cũ, trang web `site/`, và các test Chromium/Playwright).
  3. Soát mã thủ công toàn bộ 21 file thay đổi trong 1.36 / 1.36.1 và các điểm nối với lõi (`__init__.py`, `garden_core.py`, `decor_core.py`, `sync_core.py`, `backup_core.py`, `garden.js`, `home.js`, `ui.js`, `garden.css`, `body.html`, `glang.js`, `music.js`, `sky.js`, `paper.js`).
  4. Viết và chạy kịch bản QA đối kháng ngoài bộ test sẵn:
     - **Python + `anki.collection` thật (Anki 26.9.4)**: 12 kịch bản kiểm tra lưu trữ `LeStore`, gộp 2 máy, `draft_apply`, `sync_core`, giới hạn ngày/giờ, dữ liệu bẩn/fuzz mã `KBC1:`.
     - **Playwright + Chromium trên `body.html` + `garden.css` + đủ 31 file JS thật (đúng thứ tự nạp của Anki)**: 19 kịch bản tương tác bàn phím/Esc, rớt lệnh khi đồng bộ (`_sync_hold`), chuẩn hoá chữ Gemini, lớp phủ `z-index`, `watchPops`, tự động bày đồ, bố cục 4 cỡ cửa sổ (`1366×860`, `1024×700`, `800×600`, `600×500`) và stress test Album → Kỷ niệm đủ 12 thiệp nhận.

---

## 1. Tóm tắt đánh giá phát hành

| Mức độ | Số mục | Nhận định |
|---|---:|---|
| **P1** (nên sửa trước phát hành) | **5** | Có lỗi hỏng tính năng đã công bố (xoá rồi nhận lại thiệp bị mất ngay khi lưu), mất kết quả Gemini sửa điều ước (vẫn trừ lượt), bấm Esc 2 lần nhanh đóng luôn cửa sổ vườn, kẹt vĩnh viễn nút "Gemini đang sửa…" / mất chữ khi đồng bộ, và nguy cơ mất bản sửa thiệp khi bấm `✕` cửa sổ ngay |
| **P2** (nên sửa trước phát hành) | **8** | Rò phím tắt `mainKey` (bấm mũi tên dời sticker làm đổi cảnh vườn phía sau; bấm `R`/`N` khi đang xem cảnh đêm 24 hoặc xưởng thiệp), Trang trí thử dán tường/sàn Noel không nhớ mẫu cũ cho ngày 1/1, toast bị che dưới Xưởng thiệp (`z-index: 5 < 65`), báo nhầm phòng khi treo tủ lịch ở Bếp/Phòng ngủ, `watchPops` bỏ sót lần mở đầu bảng tạo muộn & cảnh đêm tự bật đè lên ⚙, để vườn mở qua 18:00 ngày 24 không tự chuyển, 1/1 ẩn Kỷ niệm khi chỉ có thiệp/thiệp nhận, `cdel` không kiểm `res.i` |
| **P3** (nhỏ / ca biên / tối ưu) | **4** | `_le_preview` không xoá khi đổi hồ sơ (chỉ admin), `trim()` trên `bu`/`fixn` bị `merge_ev` hoàn tác & `prev` chưa giao hoán, tốc độ vẽ sân kín ban đêm trên render phần mềm (19,8 ms/khung), và vài ca biên nhỏ về ngày/câu chữ |

**Khuyến nghị**: Nên sửa ít nhất **5 mục P1** và các mục **P2 (#06 – #13)** rồi đóng gói lại `kotoba_batake.ankiaddon` trước khi phát hành bản cuối. Phần nền tảng lõi (đồng bộ AnkiWeb `sync_core`, lưu nhiều khoá nguyên tử `backup_core`, tương thích bản cũ 1.31.3–1.36.0, giao diện 4 cỡ màn hình của các bảng Giáng sinh, bố cục Album → Kỷ niệm, trang web `site/`, nút Ẩn vườn của Báo 1.35.6) đang rất vững.

---

## 2. Kết quả bộ test sẵn & kiểm tra gói

- **Gói `kotoba_batake.ankiaddon` vs `kotoba_batake/`**: **Khớp 100%** (0 file thiếu, 0 file thừa, 0 khác biệt nội dung).
- **Chạy `bash tests/run_all.sh`** (đầy đủ cả phần cần `anki.collection` và Playwright/Chromium):
  - **77 / 78 mục ĐẠT** (gồm `test_136.py` 157/157, `test_1361.py` 120/120, `test_1361.js` 33/33, `test_trang.py` 35/35, `kiem_tra_trang.js` 56/56, `test_1356.js` 15/15, `test_1355.py` 64/64, `test_1333.py` 83/83, `test_134.py` 78/78, `audit_20261114` 2047/2047 + 172/172, `audit_20261117/recovery_round2` 45/45, `dong_bo/test_dong_bo.py` OK).
  - **1 mục không đạt ngưỡng trên VM**: `core/test_136.js` (17/18) — `sân kín đồ + đủ ngăn ban đêm: 19.8 ms / khung (< 12)` (xem mục **#16**).

---

## 3. Chi tiết lỗi tìm thấy

### 3.1 P1 — Cần sửa trước phát hành

#### #01 (P1) — Thiệp bạn gửi đã xoá không thể nhận lại được sau khi lưu
- **Vị trí**: `kotoba_batake/le_core.py:827-838` (`_merge_more`), `1015-1024` (`recv_add`), `1267` (`LeStore.payload`).
- **Hiện tượng**: Người dùng nhận thiệp của bạn bằng mã `KBC1:…` ở *Album → Kỷ niệm*, sau đó bấm **Xoá**, rồi dán lại đúng mã đó và bấm **Giữ vào Album**. Báo cáo 1.36.1 mục 2 ghi *"xoá rồi dán lại → hiện lại"*, nhưng thực tế ngay khi lưu vào collection, **thiệp vừa giữ lại biến mất hoàn toàn** (và từ đó trở đi không bao giờ giữ lại được mã đó nữa).
- **Nguyên nhân**:
  - `recv_add()` (`le_core.py:1021-1023`) gỡ khoá `"x"` khỏi mục tương ứng trong `ev["recv"]`.
  - Khi lưu, `LeStore.payload(ev)` (`le_core.py:1267`) gọi `merge_ev(ev, cur)` với `cur` là bản đang nằm trong collection — bản này vẫn còn dấu xoá `"x": 1`.
  - Trong `_merge_more()` (`le_core.py:829-837`), `by` được khởi tạo từ `other` (`cur`, đang có `"x": 1`), rồi duyệt `out` (`ev`, không có `"x"`): chỉ có `if e.get("x"): cur["x"] = 1` mà **không bao giờ xoá `"x"`** khi bản mới vừa thêm lại. Do đó `"x": 1` từ collection đè ngược trở lại và xoá luôn thiệp vừa nhận!
- **Vì sao bộ test sẵn không bắt được**: `tests/core/test_1361.py` chỉ gọi `recv_add` → `recv_del` → `recv_add` trên dict `ev` trong bộ nhớ, không đi qua `LeStore.save()` + `LeStore.load()`.
- **Tái hiện đã xác nhận (Anki 26.9.4 thật)**: `recv_add` → `LeStore.save()` → `recv_del` → `LeStore.save()` → `recv_add` → `LeStore.save()` → `LeStore.load()` trả về `recv_list = []` (collection vẫn giữ `{"k": "KBC1:…", "at": "2026-12-10", "x": 1}`).
- **Hướng sửa gợi ý**: Đổi dấu thời gian của mỗi mục `recv` sang timestamp chính xác tới giây (`_bump`, như `cards`/`hang`) để `_merge_more` lấy trạng thái (còn hay `"x": 1`) của lần thao tác mới hơn (đồng thời giữ tương thích ngược với chuỗi ngày `YYYY-MM-DD` của 1.36.1 nếu đã lưu).

---

#### #02 (P1) — Nhấn Esc 2 lần nhanh trong các bảng Giáng sinh (và hộp hỏi `GardenUI.ask`) đóng luôn cả cửa sổ vườn
- **Vị trí**:
  - `kotoba_batake/web/le.js:761`
  - `kotoba_batake/web/le_card.js:652`
  - `kotoba_batake/web/le_noel.js:511,517`
  - `kotoba_batake/web/ui.js:322` (`GardenUI.ask`), `kotoba_batake/web/garden.js:1395` (`#kb-sound-pop`), `kotoba_batake/web/finds.js:438-439`
  - Đối chiếu: `kotoba_batake/web/garden.js:1909-1915` và `kotoba_batake/__init__.py:3427-3432` (`_on_esc`).
- **Hiện tượng**: Các bảng Giáng sinh mới đều có 2–3 lớp Esc (Xưởng thiệp: rời ô nhập → bỏ chọn sticker → đóng xưởng; Cảnh đêm 24: Bỏ qua → Đóng; Tủ lịch có thẻ kết quả: đóng thẻ → đóng tủ; Hộp hỏi "Xoá thiệp?" trên Xưởng thiệp: Huỷ → đóng xưởng). Khi người dùng bấm **Esc 2 lần nhanh**, cửa sổ vườn (`GardenDialog`) bị **đóng hẳn** thay vì chỉ đóng 2 lớp bảng.
- **Nguyên nhân**:
  - 1.35.4 đã thêm hàng đợi `window.__kbEscQ` ở listener `window.addEventListener("keydown", ...)` **pha bubble** (`garden.js:1909`) để chống đóng nhầm cửa sổ khi bấm Esc 2 lần nhanh.
  - Tuy nhiên tất cả bộ nghe Esc của `le.js`, `le_card.js`, `le_noel.js`, `ui.js` (`askBox`), `finds.js` đều gắn ở **pha capture** và gọi `ev.stopImmediatePropagation()`, đồng thời chỉ đặt biến boolean đơn `window.__kbEscUsed = true`.
  - Vì `stopImmediatePropagation()` chặn sự kiện trước pha bubble, `garden.js:1909` **không bao giờ chạy** → `window.__kbEscQ` luôn rỗng (`[]`). Khi 2 phím Esc đến liên tiếp trước khi callback Qt `evalWithCallback` đầu tiên trả về, cả hai cùng đặt `window.__kbEscUsed = true`; callback `_on_esc` lần 1 đọc `true` rồi xoá về `false`, callback lần 2 đọc `q.length === 0 && __kbEscUsed === false` → gọi `self.close()`.
- **Tái hiện đã xác nhận (Playwright trên toàn bộ `body.html` + `garden.js` + đoạn JS `_on_esc` của `__init__.py`)**:
  - Cả 4 ca (Xưởng thiệp, Cảnh đêm 24, Tủ lịch có thẻ kết quả, `GardenUI.ask` trên Xưởng thiệp) đều cho `qLenAfter2Esc = 0`, `py1 = true`, `py2 = false` (đóng toàn bộ `GardenDialog`).
- **Hướng sửa gợi ý**: Tạo hàm chung (vd. `window.__kbMarkEsc()` hoặc đẩy `Date.now()` vào `window.__kbEscQ`) và gọi ở mọi bộ nghe Esc pha capture có dùng `stopImmediatePropagation()`.

---

#### #03 (P1) — "Nhờ Gemini sửa" điều ước tốn lượt nhưng bản sửa BIẾN MẤT nếu điều ước có dấu cách thừa, xuống dòng, hoặc 2 dấu cách liền nhau
- **Vị trí**: `kotoba_batake/web/le_card.js:332,494,607` và `kotoba_batake/le_core.py:621-628,694,954`.
- **Hiện tượng**: Ô điều ước (`#kb-le-wish`) là `<textarea rows="3">`. Nếu người dùng gõ điều ước rồi bấm Enter cuối câu (hoặc xuống dòng giữa 2 câu, hoặc lỡ có dấu cách đầu/cuối, hoặc chữ tách dấu NFD trên macOS) rồi bấm **"Nhờ Gemini sửa"**:
  - Gemini chạy thành công, **bị trừ 1/5 lượt sửa trong ngày**.
  - Thanh thông báo hiện `"Gemini đã sửa điều ước — xem bên dưới."`
  - Nhưng vùng `#kb-le-fixres` bên dưới **hoàn toàn trống rỗng** — không thấy câu đã sửa, không thấy danh sách lỗi, không thấy nút "Dùng bản sửa"!
- **Nguyên nhân**:
  - `le_card.js:332` gán `draft.w = wi.value.replace(/\n/g, " ")` (không trim, không gộp 2 dấu cách thành 1, không chuẩn hoá NFC).
  - Python `le_core._line()` (`le_core.py:621-628`) chuẩn hoá NFC, trim đầu/cuối và gộp nhiều dấu cách liên tiếp → lưu `c["w"]` và `c["fx"]["for"]` theo chuỗi đã chuẩn hoá.
  - Khi `le:fixed` về, `le_card.js:607` chỉ gán `draft.fx = c.fx` (giữ nguyên `draft.w` chưa chuẩn hoá).
  - `renderFix()` (`le_card.js:494`) kiểm tra `draft.fx.for === (draft.w || "")` → **luôn `false`** khi có bất kỳ dấu cách thừa / `\n` cuối dòng / khoảng trắng đôi / NFD nào!
- **Tái hiện đã xác nhận (Python + Playwright)**:
  - Gõ `"日本語が上手になりたいです。\n"` vào `#kb-le-wish` → `draft.w = "日本語が上手になりたいです。 "` vs `fx.for = "日本語が上手になりたいです。"` → `#kb-le-cnote` báo `"Gemini đã sửa điều ước — xem bên dưới."` trong khi `#kb-le-fixres.innerHTML === ""`.
- **Hướng sửa gợi ý**: Chuẩn hoá cùng quy tắc (NFC + gộp khoảng trắng + trim) khi so sánh `draft.fx.for` với `draft.w` (và khi `le:fixed` trả về thành công có thể đồng bộ `draft.w = c.w` nếu chuỗi chuẩn hoá khớp).

---

#### #04 (P1) — Lệnh `le:*` bị chặn lúc Anki đang đồng bộ (`_sync_hold`) gây kẹt vĩnh viễn nút "Gemini đang sửa…", mất bản sửa Thiệp khi đổi ô, và kẹt mở trắng ngăn Tủ lịch
- **Vị trí**: `kotoba_batake/__init__.py:3816-3828` (`_on_bridge`), `kotoba_batake/web/le_card.js:253-263,511-516`, `kotoba_batake/web/le.js:567-570,327-337`.
- **Hiện tượng & nguyên nhân**: Khi `_sync_hold()` là `True`, `_on_bridge` chặn mọi lệnh `le:*`, chỉ hiện toast `SYNC_MSG` và **không gửi phản hồi `Garden.le(...)`** về trang (khác với `rv:ans:` / `rv:show:` có `reviewRetry` / `flipRetry`). Gây ra 3 lỗi nặng:
  1. **(4a) Kẹt vĩnh viễn nút "Nhờ Gemini sửa"**: `askFix()` (`le_card.js:514`) đặt `fixWait = true` (biến toàn cục chung cho cả 3 thiệp) trước khi gửi `le:fix:<i>`. Không có phản hồi từ Python → `fixWait` **kẹt `true` mãi mãi** dù đồng bộ đã xong, dù đổi sang Thiệp 2/3, dù đóng mở lại Xưởng thiệp — nút mãi mờ với chữ `"Gemini đang sửa…"` cho đến khi đóng hẳn cửa sổ vườn.
  2. **(4b) Mất bản sửa Thiệp khi đổi ô trong lúc đồng bộ**: Người dùng sửa Thiệp 1 rồi bấm sang Thiệp 2 (`loadSlot(1)`). `loadSlot(1)` gọi `flush()` gửi `le:card` cho `slot = 0` và hẹn retry 6 giây với điều kiện `slot === s0` (`le_card.js:262`), rồi đổi ngay `slot = 1`. Khi đồng bộ làm rớt `le:card`, 6 giây sau retry thấy `1 !== 0` nên tự huỷ → **mọi chỉnh sửa ở Thiệp 1 mất sạch** khi quay lại ô 1.
  3. **(4c) Ngăn Tủ lịch kẹt ở trạng thái mở trắng**: `clickDoor()` (`le.js:568`) đặt `anim = {d, t0}` và tăng `pending++` trước khi gửi `le:open:<d>`. Khi Python bỏ qua lệnh, `anim` không bao giờ được xoá → sau 420 ms ngăn `d` trượt mở hết và vẽ thành **ô màu kem trống rỗng (`#f7e7c6`)** trông như đã mở dù trạng thái vẫn là `"ready"`, đồng thời khoá click ngăn khác suốt 8 giây.
- **Tái hiện đã xác nhận (Playwright)**:
  - `B4a`: mở Thiệp 2 sau khi `le:fix:0` bị bỏ → `#kb-le-fix` bị `disabled: true`, chữ `"Gemini đang sửa…"`.
  - `B4b`: sau 500 ms pixel giữa ngăn 1 trên `#kb-le-cab` là `#f7e7c6` (màu ngăn đã mở) dù `doors[0].state === "ready"`.
  - `C4`: sửa Thiệp 1 → bấm Thiệp 2 → đợi 6,3 giây → `sentAfter6sRetry === 1` (không retry) → quay lại Thiệp 1 mất sạch chữ vừa sửa.
- **Hướng sửa gợi ý**:
  - Ở `_on_bridge`: khi bỏ qua `le:*` (trừ `AUTO_CMDS`), trả ngay `self._js("le", {"ok": False, "act": ..., "msg": SYNC_MSG})` để JS gỡ `fixWait`, `anim`, `pending` và giữ `dirty` (hoặc lưu hàng đợi thiệp chưa ack theo từng `slot` thay vì kiểm `slot === s0`).

---

#### #05 (P1) — Đóng cửa sổ vườn / đóng hồ sơ Anki trong vòng 0,8 giây sau khi sửa thiệp có thể mất nội dung vừa gõ
- **Vị trí**: `kotoba_batake/__init__.py:5482-5496` (`flush_unsaved`), `5677-5688` (`closeEvent`), `6244-6249` (`_on_profile_close`), `kotoba_batake/web/le_card.js:247-263,659`.
- **Hiện tượng**: Lịch hoa (1.23 KB-01) gửi `cal:keep:` lúc đang gõ để `flush_unsaved()` ghi đồng bộ trong Python khi đóng cửa sổ (`closeEvent`) hoặc đóng hồ sơ (`_on_profile_close`) trước `self.web.cleanup()`. Xưởng thiệp chỉ tự lưu sau debounce 800 ms và nghe `window.beforeunload` gọi `pycmd("le:card:...")` bất đồng bộ. Nếu người dùng gõ điều ước / kéo sticker xong rồi bấm ngay nút `✕` cửa sổ vườn (hoặc đóng Anki / đổi hồ sơ) trong vòng < 0,8 giây, `self.web.cleanup()` huỷ WebEngine trước khi lệnh `pycmd` bất đồng bộ kịp về Python → mất lần sửa cuối.
- **Hướng sửa gợi ý**: Giữ bản nháp gần nhất phía Python (tương tự `_cal_keep` → `flush_unsaved()`) hoặc gửi `le:card` ngắn hơn / flush đồng bộ trước `self.web.cleanup()`.

---

### 3.2 P2 — Lỗi chức năng / tương tác / hiển thị cần khắc phục

#### #06 (P2) — Phím tắt màn chính (`mainKey`) rò vào khi đang mở Xưởng thiệp, Tủ lịch, Cảnh đêm 24, Thư, Cất đồ
- **Vị trí**: `kotoba_batake/web/garden.js:431-465` (`mainKey`), `kotoba_batake/web/le_card.js:389-395`.
- **Hiện tượng**:
  1. Trong **Xưởng thiệp**, đang chọn sticker và bấm phím mũi tên `←` / `→` để dịch sticker từng điểm ảnh → **cảnh vườn phía sau tự chuyển liên tục** (`Sân vườn → Trong nhà → Bãi biển`) theo từng nhát bấm vì `le_card.js:393` chỉ gọi `ev.preventDefault()` mà không `ev.stopPropagation()`, còn `mainKey` không kiểm tra `e.defaultPrevented` hay `GardenLeCard.isOpen()`.
  2. Trong **Xưởng thiệp** hoặc **Tủ lịch** (khi focus ở canvas / nút, không ở ô nhập): bấm `N` / `T` / `B` / `L` / `R` → đóng luôn Xưởng thiệp / Tủ lịch và mở thẳng Nhà / Trò chơi / Báo / Lịch hoa / Ôn thẻ.
  3. Trong **Cảnh đêm 24 (`#kb-le-show`)**: bấm `R` / `N` / `T` / `B` / `L` gửi thẳng `rv:start` (mở bảng ôn + phát âm thanh thẻ phía sau cảnh đêm!) hoặc mở bảng lớn phía sau lớp phủ `#kb-le-show` (`z-index: 280`), trong khi `#kb-le-show` cũng không nằm trong `POP_CLOSE`.
- **Tái hiện đã xác nhận (Playwright)**:
  - `C1`: bấm `ArrowRight` trên `#kb-le-cardcv` khi đang chọn sticker → `xBefore: 6 → xAfter: 7`, đồng thời `#kb-yard-name` đổi từ `"Sân vườn · 1/3"` sang `"Trong nhà · 2/3"`.
  - `B2` / `C7`: bấm `r` trong `#kb-le-show` gửi `["rv:start"]` khi show vẫn mở; bấm `n` trong Xưởng thiệp đóng Xưởng thiệp và mở `#kb-home`.
- **Hướng sửa gợi ý**: Thêm kiểm tra ở đầu `mainKey(e)`: bỏ qua khi `GardenLe.isOpen()`, `GardenLeCard.isOpen()`, `GardenLeNoel.isShowing()`, hoặc `#kb-le-letter` / `#kb-le-packpop` đang hiện; và gọi `ev.stopPropagation()` trong bộ nghe phím mũi tên / Delete của `#kb-le-cardcv`.

---

#### #07 (P2) — Áp dụng tường / sàn Noel qua "Trang trí thử" (1.34) không lưu mẫu cũ vào `ev["prev"]` → ngày 1/1 mất mẫu tường/sàn cũ
- **Vị trí**: `kotoba_batake/__init__.py:4718` (`_on_draft`), `kotoba_batake/garden_core.py:3874-3893` (`draft_apply`).
- **Hiện tượng**: Khi dán giấy dán tường hoặc sàn Noel qua *Nội thất → Tường & sàn* (`home:decor:use`), `__init__.py:4635` gọi `_le_prev_write(...)` để nhớ mẫu đang dùng trước đó vào `ev["prev"]`. Nhưng khi người dùng áp dụng mẫu Noel qua **Nhà → Trang trí thử → Dùng bản này** (`home:draft:use`), `draft_apply` không ghi `ev["prev"]`. Tới 1/1/2027, StackChan cất đồ sẽ trả gian đó về **"Theo kiểu nhà"** (`""`) thay vì mẫu tường/sàn cũ (vd. *Cánh anh đào* 300 xu).
- **Tái hiện đã xác nhận (Anki 26.9.4 thật)**: `qa_python.py` `A4_draft_apply_noel_prev` — phòng đang dùng `w_sakura`, dùng Trang trí thử chuyển sang `w_noeltuyet` → `pack_plan` trả `[['room', 'wall', 'w_noeltuyet', '']]` (mất `'w_sakura'`).
- **Hướng sửa gợi ý**: Cho `GardenState.draft_apply(..., extra=None)` nhận `extra`, và ở `_on_draft` (`action == "use"`) kiểm tra `decor_use` của bản thử: nếu có mẫu nằm trong `le_core.NOEL_TILES` thì gọi `_le_prev_write` cho các gian/chỗ tương ứng và truyền vào `extra` để ghi cùng một lần lưu.

---

#### #08 (P2) — Thông báo nổi `#kb-toast` bị Xưởng thiệp và các bảng Giáng sinh che khuất hoàn toàn (`z-index: 5 < 65`)
- **Vị trí**: `kotoba_batake/web/garden.css:355` (`.kb-toast`), `2381` (`.kb-le-pop`), `2481` (`.kb-le-show`).
- **Hiện tượng**: `.kb-toast` ở `bottom: 24px; left: 50%; z-index: 5`, thấp hơn `.kb-le-pop` / `.kb-le-cardpop` (`z-index: 65`) và `.kb-le-show` (`z-index: 280`). Khi người dùng đang mở Xưởng thiệp ở cửa sổ `1024×700` hoặc `800×600` (bảng rộng 980 px kéo sát đáy cửa sổ) rồi bấm **"Lưu ảnh PNG"**, thông báo `"Đã lưu ảnh thiệp: …"` (và cả `SYNC_MSG` lúc đồng bộ hoặc báo lỗi JS) bị nằm khuất hoàn toàn **phía sau** bảng Xưởng thiệp.
- **Tái hiện đã xác nhận (Playwright)**: `B6_toast_behind_christmas_popups` ở `1024×680` — `toastRect: 584..656`, `popRect: 56..628`, `document.elementFromPoint()` tại tâm `#kb-toast` trả về `#kb-le-cardpop`.
- **Hướng sửa gợi ý**: Nâng `z-index` của `.kb-toast` lên cao hơn các bảng nổi (vd. `z-index: 295`, vẫn dưới `.kb-ask` `9000` và `.kb-greet` `300`).

---

#### #09 (P2) — Tự động bày Tủ lịch sang Bếp / Phòng ngủ báo sai vị trí là "ra sân" hoặc "phòng khách"
- **Vị trí**: `kotoba_batake/web/le.js:627,647,746`.
- **Hiện tượng**: Khi tường Phòng chính kín chỗ, `garden_core.le_auto_spot` tự động treo `le_tulich` sang tường `"kitchen"` hoặc `"bedroom"`. Tuy nhiên `le.js` chỉ kiểm tra `p.scene === "room"` rồi rơi hết phần còn lại vào nhánh `"sân"`:
  - `le.js:647` (nút **Treo lên tường ▸** → `le:auto:le_tulich`): báo `"Đã bày Tủ lịch Giáng sinh 2026 ra sân."` dù vừa treo trong Bếp/Phòng ngủ.
  - `le.js:627` (`le:open`): ghi `"(sân)"` thay vì `"(Bếp)"` / `"(Phòng ngủ)"`.
  - `le.js:746` (toast quà mở mùa lần đầu): kiểm tra `pl.indexOf("le_tulich") >= 0` rồi luôn báo `"tủ lịch treo ở phòng khách"` dù thực tế treo ở Bếp/Phòng ngủ.
- **Tái hiện đã xác nhận (Playwright)**: `B5_tulich_kitchen_bedroom_wrong_room_msg`.
- **Hướng sửa gợi ý**: Ánh xạ đủ 4 cảnh `{ room: "tường phòng chính", kitchen: "tường Bếp", bedroom: "tường Phòng ngủ", yard: "sân" }`.

---

#### #10 (P2) — `watchPops` bỏ sót lần mở đầu tiên của bảng nổi tạo muộn; cảnh đêm 24 / thư tự bật đè lên bảng ⚙
- **Vị trí**: `kotoba_batake/web/garden.js:1824-1832` (`watchPops`), `kotoba_batake/web/le_noel.js:318-327` (`idle`).
- **Hiện tượng**:
  - **(10a)** Các bảng tạo muộn (`#kb-le-pop`, `#kb-le-cardpop`, `#kb-le-letter`, `#kb-le-packpop`, `#kb-scene-card`, `#kb-life-card`, `#kb-find-card`, `#kb-ped-pop`) được `build()` tạo với `hidden = true`, gắn vào `#kb-app`, rồi `open()` đặt `hidden = false` ngay trong cùng lượt đồng bộ — trước khi `MutationObserver` (`childList`) kịp gọi `hook()`. Do đó **ở lần mở đầu tiên**, `closePops()` không chạy: nếu bảng ⚙ (`#kb-sound-pop`), cây Deck (`#kb-deck-pop`), Nhiệm vụ hoặc Tin làng đang mở, **hai bảng nổi chồng lên nhau**. Từ lần mở thứ 2 trở đi mới tự đóng bảng kia.
  - **(10b)** `le_noel.js:322` (`idle()`) không kiểm tra `#kb-sound-pop`, `#kb-deck-pop`, `#kb-news-pop`, `#kb-quest-pop`, `#kb-ped-pop`. Khi người dùng (hoặc admin chọn Xem thử trong ⚙) đang mở ⚙, sau 1,2 giây cảnh đêm 24 tự bật đè lên và giữ `#kb-sound-pop` mở phía sau.
- **Tái hiện đã xác nhận (Playwright)**:
  - `C2_watchPops_first_lazy_open`: lần mở 1 `{soundOpen: true, leOpen: true}`, lần mở 2 `{soundOpen: false, leOpen: true}`.
  - `C3_auto_santa_show_interrupts_settings`: `{showOpenedWhileSettingsOpen: true, soundStillOpenBehindShow: true}`.
- **Hướng sửa gợi ý**: Trong `watchPops`'s `childList` observer, khi `hook()` gặp phần tử mới đã ở trạng thái `!e.hidden`, gọi luôn `closePops(POP_CLOSE[id] ? id : null)`. Đồng thời thêm các bảng nổi (`#kb-sound-pop`, `#kb-deck-pop`, `#kb-news-pop`, `#kb-quest-pop`, `#kb-ped-pop`) vào danh sách `busy` của `le_noel.js` (hoặc đóng `#kb-sound-pop` khi chọn Xem thử sự kiện).

---

#### #11 (P2) — Để cửa sổ vườn mở qua mốc 18:00 ngày 24/12 không tự chuyển sang tối 24
- **Vị trí**: `kotoba_batake/__init__.py:3230-3253` (`_check_day`).
- **Hiện tượng**: `_day_timer` chạy mỗi 60 giây chỉ so `day != self._day_seen` (ngày Anki đổi, mặc định 4:00 sáng). Nếu người dùng mở vườn lúc 17:45 ngày 24/12 và để qua 18:00:
  - Cảnh ông già Noel không tự phát.
  - Xưởng thiệp vẫn hiện thiệp đang treo ở trạng thái cho sửa / gỡ (bấm lưu mới bị Python trả lỗi).
  - Bàn bánh quy vẫn còn nguyên chưa chuyển sang khay vụn.
- **Hướng sửa gợi ý**: Trong `_check_day()`, theo dõi thêm cờ `self._eve_seen = le_core.came(le_now())` (khi `le_on()` và không ở chế độ xem thử): khi chuyển từ `False → True` thì gọi `self.refresh()`.

---

#### #12 (P2) — Từ 1/1/2027, người dùng chỉ có thiệp đã làm hoặc thiệp nhận từ bạn bè bị ẩn hoàn toàn Album → Kỷ niệm
- **Vị trí**: `kotoba_batake/__init__.py:2894` (`le_view`) vs `kotoba_batake/web/le_noel.js:364` (`hasAlbum`).
- **Hiện tượng**: Khi sang 1/1/2027 (`ph == "done"`), `__init__.py:2894` kiểm tra `if ph == "done" and not ev["open"] and not ev["gift"]: return None`, bỏ sót `ev.get("cards")` và `ev.get("recv")`. Nếu người dùng có thiệp đã nhận từ bạn bè hoặc thiệp tự làm nhưng chưa có `open`/`gift` (vd. đồng bộ hoặc tắt mở sự kiện), `data.le` thành `None` và tab **Kỷ niệm** biến mất hoàn toàn (trái với điều kiện `hasAlbum()` ở `le_noel.js:364`).
- **Tái hiện đã xác nhận (Python)**: `qa_python.py` `A9_jan1_hides_recv_or_cards`.
- **Hướng sửa gợi ý**: Đổi điều kiện dòng 2894 thành `if ph == "done" and not (ev["open"] or ev["gift"] or any(le_core.filled(c) for c in le_core.cards(ev)) or le_core.recv_list(ev)): return None`.

---

#### #13 (P2) — Phản hồi xoá thiệp (`le:cdel`) và lỗi lưu (`le:card`) không kiểm tra `res.i === slot`
- **Vị trí**: `kotoba_batake/web/le_card.js:598,617-619`.
- **Hiện tượng**:
  - `le_card.js:618`: khi nhận `res.act === "cdel"` (`res.ok === true`), đặt thẳng `draft = null; dirty = false; sel = -1;` cho `slot` hiện tại mà không kiểm tra `res.i === slot` (dù Python đã gửi `out["i"] = int(arg)` ở `__init__.py:4922`). Nếu người dùng vừa xác nhận xoá Thiệp 1 rồi bấm nhanh sang Thiệp 2 trước khi phản hồi về, Thiệp 2 bị xoá trắng trên màn hình xưởng thiệp.
  - `le_card.js:598`: khi `res.act === "card"` trả `!res.ok`, đặt `dirty = true` mà không kiểm tra `res.i === slot` — nếu người dùng đã chuyển sang ô khác, ô mới bị đánh dấu `dirty`.
- **Tái hiện đã xác nhận (Playwright)**: `B8_cdel_wipes_switched_slot` (`beforeSlot1 = "Card 2"` → `afterSlot1 = null`).
- **Hướng sửa gợi ý**: Kiểm tra `res.i === slot` ở cả `cdel` và `!res.ok` của `card`.

---

### 3.3 P3 — Lỗi nhỏ / ca biên / hiệu năng

#### #14 (P3) — `_le_preview` không bị xoá khi đổi hồ sơ Anki hoặc `File → Import .colpkg` (chỉ admin)
- **Vị trí**: `kotoba_batake/__init__.py:2763,4829-4836,6228-6290`.
- **Hiện tượng**: Khi admin bật *Xem thử sự kiện* ở Hồ sơ A, `_le_preview["ev"]` chép bản sao `cards`, `hang`, `recv` thật của Hồ sơ A vào biến toàn cục cấp module. Khi đóng/đổi sang Hồ sơ B (`_on_profile_close`) hoặc nhập `.colpkg` (`_on_collection_load`), `_le_preview` không bị reset → mở vườn ở Hồ sơ B thấy thiệp/điều ước của Hồ sơ A.
- **Hướng sửa gợi ý**: Reset `_le_preview.update(day=None, ev=None, now=None, pack=False)` trong `_on_profile_close` và `_on_collection_load`.

#### #15 (P3) — `trim()` trên `bu` / `fixn` vô tác dụng khi lưu qua `LeStore.save()`, và gộp `prev` chưa giao hoán
- **Vị trí**: `kotoba_batake/le_core.py:200-201,212-214,824-826,839-844,940-944,1267`.
- **Chi tiết**:
  - `open_door()` gọi `trim(ev, today)` và `fix_mark()` lọc `fixn` giữ 3 ngày, nhưng `LeStore.payload(ev)` gọi `merge_ev(ev, cur)` lấy hợp với `cur` trong collection → các ngày cũ trong `bu` và `fixn` được phục hồi lại nguyên vẹn (`A2_trim_fixn_bu`). (Dữ liệu thực tế tối đa 31 ngày nên không phình lớn, chỉ là mã cắt tỉa không có tác dụng.)
  - `_merge_more()` cho `prev` (`out["prev"] = dict(prv, **(out.get("prev") or {}))`) không giao hoán: `merge_ev(A, B) != merge_ev(B, A)` khi 2 máy có `prev` khác nhau cùng gian (`A3_merge_prev_commutativity`).

#### #16 (P3) — Hiệu năng vẽ sân kín đồ + đủ 24 ngăn ban đêm ở máy không GPU / render phần mềm
- **Vị trí**: `kotoba_batake/web/le.js:211-256`, kiểm chứng bởi `tests/core/test_136.js`.
- **Chi tiết**: Khi chạy `tests/run_all.sh` trên môi trường Linux VM (Chromium headless, render phần mềm), mục đo tốc độ vẽ ở `core/test_136.js` đạt **19,8 ms / khung** (vượt ngưỡng `< 12 ms / khung`). Với người dùng laptop yếu hoặc không tăng tốc phần cứng (issue #7), cần lưu ý tốc độ vẽ khi sân đặt kín món cao + đủ 24 ngăn ban đêm (chế độ Dịu mắt / tắt hiệu ứng vẫn giữ đèn đứng yên tốt).

#### #17 (P3) — Các ca biên nhỏ về ngày/giờ và câu chữ
- **(17a)** **Ngày 1/1 khi người dùng chỉ nhận quà mở mùa (0 ngăn đã mở, 0 món/tường Noel đang bày)**: `pack_due()` vẫn trả `True` (`le_core.py:1155`) → bật hộp thoại *"Năm mới rồi — StackChan đã cất đồ Noel vào hộp."* với danh sách `<ul>` hoàn toàn trống (`A11`). Có thể chỉ bật hộp thoại khi `packLines` có ít nhất 1 mục (vẫn đánh dấu `pack` để không lặp).
- **(17b)** **`fix_set()` sau 18:00 ngày 24**: Nếu bấm "Nhờ Gemini sửa" lúc 17:59:58 cho thiệp đang treo và Gemini về lúc 18:00:02, `fix_set()` không kiểm tra `taken_index(ev, now) == i` nên vẫn sửa và tăng `at` của thiệp đã khoá (`A5`).
- **(17c)** **Thư ông già Noel khi chỉ đặt 1 chú tuần lộc đèn**: `le_core.py:1059,1121` chỉ lưu cờ `"deer"` (không đếm số lượng) nên đặt 1 con vẫn viết *"hai bạn tuần lộc đèn trong sân"* (`A12`).
- **(17d)** **`clean_ev()` chưa giới hạn cận trên của ngày `open` (`<= END`) và cận dưới của ngày `box` (`>= BOX_DAY`)** (`le_core.py:167,180`) khi đọc dữ liệu bẩn (`A8`).
- **(17e)** **Giờ đổi ngày Anki đặt > 18h (hiếm, vd. 20:00)**: lúc 19:00 ngày 24/12, ngày Anki vẫn là 23/12 trong khi `came(now)` đã `True` → khoá treo thiệp sớm trên ngày Anki 23/12 (`A6`).
- **(17f)** **Mẫu tường/sàn tự vẽ trong `prev` đã bị xoá trước 1/1**: `garden_core.le_apply` xử lý an toàn (trả về Theo kiểu nhà), nhưng dòng mô tả ở `le_noel.js:279` vẫn ghi `"về mẫu dùng trước đó"` vì chỉ kiểm tra `t[3]` khác rỗng.

---

## 4. Các kịch bản ngoài bộ test đã kiểm tra và ĐẠT

Để tiện theo dõi phạm vi đã soát:
- **Gói phát hành**: `kotoba_batake.ankiaddon` khớp từng byte với thư mục `kotoba_batake/`.
- **Đồng bộ AnkiWeb (`sync_core` + `kotoba_batake_le`)**: mô phỏng điện thoại ghi đè cấu hình cũ (mất `kotoba_batake_le` và `kotoba_batake_rev`) trên collection Anki 26.9.4 thật → `sync_core.after_sync` phục hồi nguyên vẹn `kotoba_batake_le` (`A10_sync_protects_le`: PASS).
- **Bảo mật & fuzz mã thiệp `KBC1:`**: kiểm tra `None`, số, chuỗi rỗng, sai tiền tố `KB1:`, sai CRC, base64 lỗi, payload > 6.000 ký tự, bom giải nén zlib (> 16 KB) → đều bị `decode_card` từ chối an toàn, không lỗi.
- **Bố cục phản hồi (responsive) ở 4 cỡ cửa sổ (`1366×860`, `1024×700`, `800×600`, `600×500`)**:
  - Cả 5 màn Giáng sinh (Tủ lịch, Xưởng thiệp mặt trước & mặt sau, Thư ông già Noel, Cất đồ 1/1, Cảnh đêm 24) đều nằm gọn trong khung nhìn, không tràn ngang, nút `✕` không bị cắt (`B10`: PASS).
  - *Album → Kỷ niệm* với tối đa **12 thiệp nhận + 2 thiệp tự làm** ở `1024×700`, `800×600`, `600×500`: không tràn ngang, đủ 14 thẻ, 0 lỗi JS (`C5`, `C8`: PASS).
- **Chép mã thiệp từ Album → Kỷ niệm (khi xưởng thiệp đóng)**: `le_card.js` và `le_noel.js` đều gọi `H.toast`, nhưng `garden.js` `toast()` có khử trùng tin giống nhau nên chỉ hiện 1 lần (`C6`: PASS).
- **Mẫu tường/sàn Noel trong Nhà & Trang trí thử**: mẫu chưa sở hữu không hiện nút Mua, `draft_plan` chặn không cho mua giá 0; thẻ "+ Tự vẽ tường/sàn" không bị `tryDecorCards` biến thành nút "Đặt thử".
- **Bánh quy đã ăn sau 1/1**: `le.js:775` (`eaten`) kiểm tra `v.phase !== "done"` nên bày lại bánh quy trong năm 2027 vẫn có bánh nguyên, không kẹt vụn vĩnh viễn.
- **Cây thông tặng khi chưa mở giao diện mùa Giáng sinh**: `GardenState.place()` cho đặt lại `xmastree` từ Kho đồ mà không đòi mở khoá giao diện mùa.
- **0 lỗi runtime JS** khi nạp đủ 31 file JS thật với dữ liệu thực từ `garden_core.home_catalog` + `lang_core.bundle`.
