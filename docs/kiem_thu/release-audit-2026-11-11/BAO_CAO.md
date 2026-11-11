# Rà soát trước phát hành — ことば畑 1.25.3

**Bản dựng lại ngày 11/11/2026. Không sửa mã ứng dụng.**

Mã được kiểm tra: commit `1984446d6917192426510c4cd685e2797641defd`, phiên bản 1.25.3. Nhánh `master` đã có thay đổi sau commit này; các kết luận dưới đây chỉ áp dụng cho commit nêu trên, chưa chứng minh tình trạng của bản mới hơn.

File của lượt kiểm tra trước không còn trong workspace. Báo cáo này được dựng lại từ danh sách phát hiện đã ghi nhận, kèm **kịch bản, log và ảnh mới**. Không dùng lại con số 217 ca / 415 ảnh của lượt trước làm kết quả cho bản dựng lại. Các ca chưa chạy lại được ghi rõ, không coi là đã xác nhận mới.

> Trạng thái tạm thời: đang bổ sung kiểm thử giao diện và ảnh mới. Kết quả lõi đã được lưu lên nhánh để tránh mất bản duy nhất.

## Kết quả hiện có

- Bộ offline có sẵn: `tests/run_all.sh`, dùng Python có Anki 26.09.4, kết thúc **TỔNG: TẤT CẢ OK**. [Log](logs/offline-existing.log).
- 111 kịch bản lõi bổ sung: **72 PASS, 39 FAIL, 0 ERROR**. Nhiều ca FAIL cùng tái hiện một lỗi ở các phòng / cỡ / cách chia đợt khác nhau, không phải 39 lỗi độc lập. [JSON đầy đủ](logs/core-extra.json), [script chạy lại](kich_ban/audit_core.py).
- Các kết quả giao diện, ảnh và bảng toàn bộ kịch bản được bổ sung ở bản hoàn tất.

## Danh sách phát hiện

P1: cần xử lý trước phát hành rộng; P2: nên xử lý trong đợt ổn định; P3: lỗi giới hạn / cấu hình / diễn đạt. Phân loại là đánh giá kỹ thuật cho phiên bản này.

### F01 · P1 · Đồ tự làm trong Bếp / Phòng ngủ xuất hiện lại sau khi cất

**Đã tái hiện lại:** 12 tổ hợp 2 gian × đồ sàn / tường × cỡ 16/24/32. Lưu lặp làm dữ liệu placement thô tăng `2 → 3 → 4`; cất xong đọc lại vẫn có món ở chỗ cũ. Đối chứng ở sân / phòng chính không tái hiện.

**Cách tái hiện:** xây xong và mở rộng nhà; tạo một món nội thất trong Xưởng; đặt ở Bếp hoặc Phòng ngủ; cất vào kho; đóng / mở lại cảnh. Kiểm tra thêm `kotoba_batake_nha.places` sau mỗi lần lưu.

**Kỳ vọng:** cất là bỏ placement, món có trong kho; lưu lặp không thêm bản sao.

**Nguyên nhân:** `garden_core.py:keep_foreign_nha` coi mọi id ngoài `CATALOG` là dữ liệu của phiên bản tương lai. Id `c1`, `c2` của Xưởng cũng ngoài `CATALOG`, nên placement cũ được ghép trở lại.

**Đề xuất sửa:** phân biệt mẫu tự làm hiện tại với id thực sự chưa hiểu (truyền danh mục đầy đủ / tập id craft hiện tại vào hàm giữ dữ liệu); tránh ghép placement đã biết và chống nhân đôi. Giữ khả năng đọc dữ liệu bản mới hơn. Test lại đặt → di chuyển → cất → lưu → mở lại và máy cũ lưu đè.

### F02 · P1 · Luyện viết tiếng Anh hợp lệ bị mất chữ khi lưu

**Đã tái hiện lại:** 21, 29 và 30 từ dài (419/579/599 ký tự) bị còn 400 ký tự. Bài 20 từ / 399 ký tự và Nhật 60 ký tự giữ nguyên.

**Cách tái hiện:** nhập tối đa 30 từ tiếng Anh sao cho tổng dài hơn 400 ký tự; rời ô / đóng rồi mở Lịch hoa. Bài có thể kết thúc giữa một từ.

**Nguyên nhân:** `journal_core.py:clean_writing` gọi `clean_line(..., 400)` trước khi cắt theo giới hạn 30 từ. Giao diện đếm từ nhưng lưu trữ còn trần ký tự độc lập.

**Đề xuất sửa:** thống nhất quy tắc nhập và lưu; với tiếng Anh cắt theo từ trước, đặt giới hạn dung lượng phù hợp và công khai nếu cần. Đừng âm thầm cắt giữa từ. Kiểm tra cả `goc`, bài đã sửa và luồng gửi Gemini.

### F03 · P2 · Cài đặt có thể mất khi đóng cửa sổ trong 250 ms

Phát hiện lượt trước, đang xác nhận lại trong QtWebEngine. `web/prefs.js` gom thay đổi trong 250 ms; `pagehide` / `beforeunload` không bảo đảm chạy trước khi Qt hủy webview.

**Tái hiện:** đổi thời tiết / âm lượng rồi đóng vườn ngay (<250 ms), mở lại và đọc config `prefs`. So với chờ >500 ms và dùng `GardenPrefs.flush()`.

**Đề xuất sửa:** flush có xác nhận ở vòng đời đóng Qt / cầu nối, hoặc ghi ngay các cài đặt ít thay đổi; kiểm tra đóng vườn, thoát Anki và đổi hồ sơ. Không chỉ thêm một sự kiện DOM nữa.

### F04 · P2 · Esc trong lúc gõ IME có thể đóng bảng

Phát hiện bằng sự kiện DOM mô phỏng lượt trước; **chưa kiểm chứng bộ gõ thật của Windows / macOS / Linux**. `calendar.js:onKey` kiểm tra Esc trước loại ô nhập và trạng thái composition.

**Tái hiện:** mở Nhật ký / Luyện viết, bắt đầu composition, gửi Esc với `isComposing=true`. Kỳ vọng Esc hủy chọn chữ trước, không đóng bảng / làm mất ngữ cảnh nhập.

**Đề xuất sửa:** chặn phím tắt khi đang composition (`isComposing`, trạng thái composition và tương thích mã 229 khi cần); kiểm tra ở bảng Lịch hoa, Xưởng, tìm deck và màn ôn. Xác nhận lại với bộ gõ hệ điều hành trước khi kết luận đã sửa.

### F05 · P3 · Trần xu game bằng 0 nhưng menu hiển thị 40

Phát hiện lượt trước, đang xác nhận lại. `games.js` dùng `(d.fx && d.fx.game_daily_coins) || 40`, làm giá trị 0 hợp lệ rơi về 40. Kỳ vọng hiển thị 0 và khớp việc Python không trả xu.

**Đề xuất sửa:** chỉ dùng mặc định khi thiếu / sai kiểu, giữ 0; thử các giá trị 0, 1, 40, 200.

### F06 · P2 · Thời tiết trong dữ liệu gửi viết báo có thể khác vườn

Phát hiện lượt trước, đang xác nhận lại. Chọn tuyết / mưa cố định ở vườn rồi đối chiếu `_village_weather(date)` / `thoi_tiet` gửi tác vụ báo. Hàm lấy thời tiết tính theo ngày, chưa đọc lựa chọn thủ công của người dùng.

**Đề xuất sửa:** xác định một nguồn thời tiết thống nhất cho cảnh và lời nhắc báo; gửi snapshot tại lúc bắt đầu tác vụ, có quy tắc rõ cho số báo ngày cũ / máy khác. Không cần gọi Gemini thật để kiểm tra dữ liệu đầu vào.

### F07 · P2 · Hàng chờ thông báo có thể đánh mất thông báo

Phát hiện lượt trước, đang xác nhận lại. `garden.js:toastNext` lấy một phần tử khỏi hàng chờ rồi chờ 250 ms mới hiện. Thông báo mới chen vào khoảng này gọi `showToast`, xóa timer đã giữ phần tử trước đó.

**Tái hiện:** hiện A bấm được, xếp B sau A; bấm A; trong 100 ms hiện C; đợi qua 250 ms. B phải còn lượt xuất hiện.

**Đề xuất sửa:** coi khoảng chuyển tiếp là trạng thái đang bận; chỉ lấy phần tử khỏi hàng khi hiển thị thật, dùng một bộ điều phối timer và giữ giới hạn hàng chờ.

### F08 · P2 · Cache ngôn ngữ dùng chung khi đổi hồ sơ

Phát hiện lượt trước, đang xác nhận lại. `_lang_presence` cache kết quả 60 giây trong biến module `_presence`, không gắn định danh collection. Hồ sơ chỉ có tiếng Hàn có thể nhận trạng thái Nhật / Anh của hồ sơ vừa đóng.

**Đề xuất sửa:** gắn cache với đường dẫn / định danh collection, hủy khi đổi hồ sơ và thay đổi mapping; kiểm tra A có Nhật → B chỉ Hàn và chiều ngược lại.

### F09 · P2 · Kho điểm ảnh dự phòng của hồ sơ khác được đọc vào hồ sơ mới

**Đã tái hiện lại:** A ghi `craft_px.json`; B có ví riêng nhưng chưa có `PX_KEY`, `load_px()` trả điểm ảnh của A. Metadata craft của B vẫn trống, nên **chưa chứng minh B thấy / sở hữu được món A trên giao diện**.

**Nguyên nhân:** `GardenState.load_px` luôn đọc file dự phòng dùng chung khi collection không có `PX_KEY`, thiếu kiểm tra chủ sở hữu như ví và các kho khác.

**Đề xuất sửa:** tách backup theo hồ sơ hoặc gắn chủ sở hữu; chỉ nhập backup khi điều kiện migration hợp lệ. Test hồ sơ mới, mất khóa riêng, import backup và khôi phục dữ liệu cũ.

### F10 · P2 · Trần bù xu 1000/ngày áp dụng theo từng đợt

**Đã tái hiện lại:** `[600,600] → 1200`, `[800,800] → 1600`, `[1000,1] → 1001` trong cùng ngày. Một đợt 1500 bị chặn 1000 đúng; gọi lặp không có lượt mới không trả thêm.

**Nguyên nhân:** `settle_mobile` lấy `min(delta['ok'], MOBILE_DAY_CAP)` mỗi lần, không trừ phần trần đã dùng trong ngày.

**Đề xuất sửa:** lưu / tính lượng đã trả theo ngày, giới hạn phần còn lại; quy tắc phải độc lập cách chia lần đồng bộ. Thử Undo, nhiều máy, ngày cũ và mục tiêu ngày để tránh sửa sai sổ xu.

### F11 · P2 · Revlog tương lai trong ngày được tính vào lượt đã ôn

Phát hiện lượt trước, đang xác nhận lại bằng collection thật. `revlog_by_day` bỏ ngày tương lai (`rel > 0`) nhưng không bỏ thời điểm tương lai còn trong hôm nay.

**Đề xuất sửa:** xác định chính sách đồng hồ lệch và giới hạn timestamp so với hiện tại; chưa đến thời điểm thì hoãn trả, không đánh dấu đã xử lý. Kiểm tra sát giờ đổi ngày Anki và đồng hồ hai máy lệch nhau.

### F12 · P3 · Nhiệm vụ thiếu trường bắt buộc gây KeyError

**Đã tái hiện lại:** `_clean_quest` nhận nhiệm vụ thiếu `id` / `reward` / `text`; `quest_view` hoặc `_settle_quests` ném `KeyError`. Cần dữ liệu hỏng / sửa tay / bản cũ, không phải đường tạo nhiệm vụ bình thường.

**Đề xuất sửa:** kiểm tra đầy đủ schema, loại và biên của các trường trước khi nhận; tái tạo nhiệm vụ lỗi mà không mất ví / nhà / thưởng đã trả. Thêm test trên dữ liệu collection bị khuyết trường.

### F13 · P3 · Config mốc giai đoạn không buộc tăng dần

**Đã tái hiện lại:** `[90,3,21]`, `[3,90,21]`, `[3,3,90]` qua `merged_config` nguyên trạng. Giai đoạn có thể nhảy hoặc không bao giờ xuất hiện. Cần chỉnh config thủ công.

**Đề xuất sửa:** nhận đúng 3 số dương tăng nghiêm ngặt; sai thì dùng mặc định và báo ngắn trong cấu hình. Test cả FSRS và fallback `ivl`.

## Đánh giá giao diện và điều kiện phát hành

Phong cách pixel, bảng màu và cảnh mùa có cá tính rõ. Các nhóm nhà, báo, nhật ký tạo cảm giác thành quả học tập. Điểm cần kiểm tra kỹ trước release là mật độ chức năng đối với người mới, đường tìm tác vụ trong 11 tab Nhà, nhãn / trạng thái khi không có deck hoặc chưa có khóa, độ vừa cửa sổ thấp, phím tắt và độ tương phản khi tối.

Ưu tiên cải tiến: hướng dẫn ngắn theo tác vụ đầu tiên (chọn deck → ôn → xem cây), gợi ý nhóm chức năng / tìm món trong Nhà, phân biệt nút chính và phụ, luôn có dấu hiệu đã lưu cho nơi dễ mất dữ liệu. Các thay đổi bố cục nhà / cỡ cảnh đã được người dùng chốt trong `PHAT_TRIEN.md` không bị coi là lỗi chỉ vì khác sở thích người đánh giá.

**Trước release:** xử lý hai P1; xử lý cài đặt / cache hồ sơ / hàng chờ; chạy lại hồi quy với bản sẽ đóng gói; một vòng dùng thật nhiều ngày và kiểm thử Windows / macOS. Chưa đánh dấu release ready chỉ vì các test có sẵn đều qua.

## Phạm vi chưa chứng minh

- Windows / macOS, bộ gõ IME thật, màn hình DPI cao và nhiều màn hình.
- AnkiWeb thật / AnkiDroid / AnkiMobile, xung đột hai máy, khôi phục backup thật.
- Gemini thật, hạn mức / retry / model đang phục vụ / chất lượng nội dung dài ngày. Test giả lập không thay thế xác nhận dịch vụ thật.
- Độ bền khi Anki / máy bị kill giữa ghi file, dùng liên tục nhiều ngày, tải dữ liệu rất lớn.
- Các thay đổi trên `master` sau commit được rà soát.

## Chạy lại và đọc minh chứng

Script trong `kich_ban/` chỉ tạo dữ liệu giả trong `/tmp`; không dùng hồ sơ cá nhân. Python: `/workspace/kotoba-dev/venv/bin/python` (Anki 26.09.4, Qt 6.12.0), Node 24.22.1, Linux Qt offscreen. Sửa đường dẫn Python theo máy của người chạy.

```bash
ANKI_PY=/path/to/venv/bin/python bash tests/run_all.sh
/path/to/venv/bin/python docs/kiem_thu/release-audit-2026-11-11/kich_ban/audit_core.py "$PWD"
```

Mỗi ca có id, hành động, kỳ vọng, kết quả thực tế và trạng thái trong JSON. Ảnh log sẽ được ghi rõ là ảnh log; ảnh sản phẩm lấy từ QtWebEngine thật. Không dùng hình dựng làm minh chứng giao diện đã chạy.
