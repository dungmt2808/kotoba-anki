# Báo cáo 1.36.5 — kiểm tra 1.36.4 lần 2 trước phát hành + đánh giá mức độ hoàn thiện + tham khảo Memory Forest (27/11/2026)

Người dùng 27/11: "review, kiểm tra kỹ addon lần cuối, cuối tuần này sẽ release. kiểm tra các kịch bản, test ngoài bộ test đã có
sẵn. đánh giá mức độ hoàn thiện. về phần mỗi từ là 1 cây, tớ thấy addon này làm rất đẹp, ta có thể tham khảo không
https://ankiweb.net/shared/info/1255432496".

Bản kiểm tra: **1.36.4** (gói ở `master`, `d5da849`; AnkiWeb đang là 1.35.6). Lần 1 (26/11, `docs/kiem_thu/1.36.4/BAO_CAO.md`) đã chạy
bộ có sẵn + 6 kịch bản mới. Lần này chọn **những chỗ lần 1 chưa đụng tới**: bản Anki mới hơn / ở giữa, giờ đổi ngày khác 4:00, ngày
rất xa sau sự kiện, phiên ôn dài, đóng / mở vườn nhiều lần, cài chung với add-on phổ biến, đọc lại mã 1.35.6 → 1.36.4.
Tìm được **1 lỗi thật** (có từ 1.30.3, nặng lên từ 1.36.0 vì sự kiện Giáng sinh), đã sửa thành **1.36.5**: chỉ đổi `__init__.py`
(+ README, manifest), **không đổi lưu trữ**. Nhánh `claude/nice-lovelace-h8wwno`. **Cách sửa Claude chọn, người dùng chưa xem.**

## 1. Kết luận nhanh

| | |
|---|---|
| Phát hành cuối tuần được không | **Được — bản 1.36.5** (thay 1.36.4; gồm 1.36.0–1.36.4), sau khi người dùng xem ~10 phút trên máy thật (mục 9). Không còn lỗi nào đã biết làm mất dữ liệu, chặn thao tác hay bật hộp lỗi |
| Lỗi tìm được lần này | **1** (mục 2): đóng cửa sổ vườn không dừng đồng hồ 60 giây → "cửa sổ ma" chạy ngầm; sang ngày mới **nhận quà tủ lịch / cất đồ Noel thay người dùng** (người dùng không thấy bảng "Quà tặng" / "Cất đồ Noel"), lỗi JS, Anki khựng lại lúc đổi ngày |
| Bộ test có sẵn | đều đạt — trên 1.36.4 và trên 1.36.5 (mục 3) |
| Test mới ngoài bộ có sẵn | 7 nhóm (mục 4): 5 bản Anki chưa thử (có **Anki 26.11 beta**), giờ đổi ngày 0 / 23 giờ, ngày rất xa + đồng hồ lùi, phiên ôn dài 310 lượt, đóng / mở vườn, ổ đĩa đầy, cài chung với 6 add-on phổ biến (đọc mã + chạy thật, người dùng cho phép) |
| Mức độ hoàn thiện | **phần kỹ thuật ~96%** (mục 7); phần còn lại là xem bằng mắt trên Windows / macOS, AnkiWeb + điện thoại thật |
| Memory Forest | **tham khảo ý tưởng được, không chép mã / hình** (mục 8) — đề xuất 5 việc cho ruộng sau phát hành, cần ảnh phác duyệt trước |

## 2. Lỗi tìm được + cách sửa

### B1 — cửa sổ vườn đã đóng vẫn chạy ngầm (có từ 1.30.3; từ 1.36.0 nhận quà / cất đồ Giáng sinh thay người dùng)

- **Vì sao**: cửa sổ vườn (`GardenDialog`) có cha là cửa sổ chính của Anki và không tự huỷ khi đóng, nên đóng xong nó vẫn còn trong bộ
  nhớ. Từ 1.30.3 mỗi cửa sổ có đồng hồ 60 giây (`_day_timer`) để tự sang ngày khi vườn để mở qua đêm — nhưng `closeEvent` **không dừng
  đồng hồ**. Mỗi lần đóng / mở vườn để lại một "cửa sổ ma" vẫn xét sang ngày mỗi phút.
- **Ai gặp**: người để **Anki mở qua giờ đổi ngày** (để máy qua đêm, hoặc giờ đổi ngày 0:00 / buổi tối) sau khi đã đóng / mở vườn trong
  ngày. Khi sang ngày, **mỗi** cửa sổ ma dựng lại cả vườn trên trang đã dọn:
  1. **1/12**: cửa sổ ma tặng Tủ lịch + cây thông. Khi người dùng mở vườn, quà đã nhận xong nên **không còn thông báo "Lịch chờ Giáng
     sinh mở rồi! Quà tặng: …"**. Tương tự **1/1**: StackChan **cất đồ Noel trong cửa sổ ma**, người dùng không thấy bảng "Cất đồ Noel"
     (tuần lộc / bánh tự biến khỏi sân);
  2. lỗi JS "Garden is not defined" (8 dòng trong log Anki mỗi lần);
  3. dựng N lần cả vườn trên luồng chính → Anki khựng lại lúc đổi ngày (trong test với ~6 cửa sổ ma: trang **đứng hình > 30 giây** ở bước
     "mở vườn lần đầu vào 1/3/2027").
- **Tái hiện** (`tests/anki/e2e_dongvuon.js`, Anki 26.9.4): mở / đóng vườn 4 lần → **4 cửa sổ ma còn chạy đồng hồ**; vườn đang đóng,
  ngày Anki sang 1/12 → **kho có tủ lịch + cây thông, sổ đã ghi** trước khi người dùng mở vườn; mở vườn → **không có thông báo quà**.
  1.36.4: **đỏ 3/10**.
- **Sửa** (`__init__.py`, 2 chỗ): `closeEvent` dừng đồng hồ; `_check_day` chỉ chạy ở cửa sổ đang dùng **và** đang hiện
  (`_dialog is self and isVisible()`; cửa sổ bị ẩn thì `open_garden` gọi lại `_check_day` ngay khi hiện — như 1.30.3). Không xoá cửa
  sổ khi đóng (`deleteLater` / `WA_DeleteOnClose`) — thao tác chấm thẻ chạy nền còn giữ cửa sổ làm cha; để sau phát hành nếu cần.
- **Sau khi sửa**: `e2e_dongvuon` **10/10** (26.9.4) · **10/10** (23.10.1): 0 cửa sổ ma, vườn đóng thì không ai nhận quà, mở vườn
  thì có thông báo quà, cửa sổ đang mở vẫn tự sang ngày; không còn dòng "Garden is not defined". Kịch bản đồng hồ giả (giờ đổi ngày
  23:00) đi qua bước 1/3/2027: **bảng "Cất đồ Noel" hiện đúng một lần**.
- Test offline: `tests/core/test_1365.py` (mã: `closeEvent` dừng đồng hồ trước mọi việc, `_check_day` chỉ cửa sổ đang dùng + đang hiện,
  `open_garden` hiện rồi mới xét ngày; hợp đồng dữ liệu = 1.36.4) — 1.36.4 **đỏ 4**, 1.36.5 **72/72**. Đã thêm vào `run_all.sh`.

## 3. Bộ test có sẵn (môi trường dựng mới hôm nay)

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` trên gói **1.36.4** (`ANKI_PY` = aqt 26.9.4, `PY39` = aqt 23.10.1) | **83 mục, TỔNG: TẤT CẢ OK** (có `dong_bo/test_dong_bo.py` — máy chủ đồng bộ thật của Anki) |
| `tests/run_all.sh` trên gói **1.36.5** (thêm `core/test_1365.py`) | **84 mục, TỔNG: TẤT CẢ OK** (`core/test_1365.py` 72/72) |
| Anki thật trên gói 1.36.5, 26.9.4 — hồi quy hướng dẫn / màn chào / Giáng sinh / sang ngày / đồng bộ | **13 kịch bản đạt hết**: `e2e_1303` 49/49 (vườn để mở tự sang ngày — đúng chỗ đã sửa), `e2e_1362` 40/40, `e2e_136` 66/66, `e2e_1361` 81/81, `e2e_1363` 44/44, `e2e_tour` 12/12, `e2e_1352` 33/33, `e2e_nguoimoi_noel` 24/24, `e2e_126` 39/39 (chạy cùng 3 Anki khác: 38/39 — vòng tròn mở 0,4 giây bị lỡ khi máy quá tải; chạy riêng đạt), `e2e_1261` 41/41, `e2e_134` 87/87, `e2e_giaodien_noel` 97/97, `e2e_fuzz_noel` 5/5 · đồng bộ `e2e_1312` (qua `dong_bo/run_e2e.sh`): DONGBO_1312 |
| Cập nhật đè **1.35.6 (AnkiWeb) → 1.36.5** · hạ bản 1.36.5 → 1.35.6 → 1.36.5 · đồng hồ máy giả 4:00 (`run_dongho.sh`) | **23/23** (5 + 18: 12 khoá collection, file `user_files/`, xu, nhật ký y nguyên; tháng 12 trên dữ liệu 1.35.6 tặng tủ lịch, 3 ngăn chờ mở) · **33/33** (4 + 10 + 19: 1.35.6 chơi tiếp mà đồ / thiệp / hình vẽ / quả châu Giáng sinh còn nguyên) · DONGHO4 |

## 4. Kịch bản mới (ngoài bộ có sẵn)

| # | Kịch bản | Cái mới so với bộ cũ | Kết quả |
|---|---|---|---|
| K1 | **Anki 26.11 beta** (`aqt 26.11b1`, ra 11/2026 — có thể thành bản chính giữa mùa Giáng sinh) + 4 bản chưa thử từ 1.22.7: **24.06.3, 25.02.7** (Python 3.9), **25.09.5, 26.8.1** (Python 3.13) | Bộ cũ chỉ chạy 23.10.1 + 26.9.4 kể từ 1.23 | 26.11b1: 7 kịch bản **354/354** (`e2e_tour` 12, `e2e_136` 66, `e2e_1361` 81, `e2e_1362` 40, `e2e_1363` 44, `e2e_nguoimoi_noel` 24, `e2e_134` 87). 24.06.3 · 25.02.7 · 25.09.5 · 26.8.1: 5 kịch bản (`e2e_tour`, `e2e_136`, `e2e_1361`, `e2e_1363`, `e2e_nguoimoi_noel`) **227/227 mỗi bản** — 25.09.5 `e2e_1361` lần đầu trượt 1 kiểm tra chờ 4 giây khi máy chạy 4 Anki cùng lúc (tải 9,8), chạy riêng 81/81 |
| K2 | **"Next day starts at" 0 giờ / 23 giờ** với đồng hồ máy giả — `e2e_giodoingay.js` (qua `run_dongho.sh`, `KB_ROLLOVER`) | 1.36.4 chỉ thử 4:00 (mặc định) | 1.36.5: **0 giờ 54/54 · 23 giờ 56/56**. 0 giờ: vườn để mở qua 00:00 tự tặng tủ lịch + cây thông, ôn 23:55 thuộc 30/11, ôn 00:10 mở ngăn 1, mở bù ngăn 6, 18:00 ngày 24 ông già Noel, 00:00 ngày 25 thư + hộp quà, 00:00 ngày 1/1 cất đồ. 23 giờ: trưa 1/12 vẫn là ngày Anki 30/11 (chưa tặng), 23:00 tặng; 18:00 ngày 24 giờ máy (ngày Anki 23) ông vẫn ghé, sang 23:00 không chạy lại, ngăn 24 mở được sau khi ông đã ghé; 10:00 ngày 25 chưa có thư / hộp quà, 23:00 ngày 25 thư tự mở. Mỗi bước: không hộp thoại Qt nào bật lên. (Trên 1.36.4 bước "1/3/2027" đứng hình > 30 giây — do các cửa sổ ma của lỗi B1 cùng dựng lại vườn) |
| K3 | **Ngày rất xa / đồng hồ lùi** (trong K2): mở vườn lần đầu 1/3/2027 sau khi bỏ từ 26/12, Giáng sinh 2027, 1/6/2030, đồng hồ lùi 24/12/2025 | 1.36.4 chỉ lùi về 20/12 | trong K2 (cả hai giờ đổi ngày): **mở vườn lần đầu 1/3/2027 → StackChan cất đồ một lần, bảng "Cất đồ Noel" hiện**, mở lại không cất nữa; 24/12/2027: không tủ lịch mới, không chạy lại cảnh / thư, mở ngăn / làm thiệp bị từ chối bằng câu dễ hiểu, sổ + kho không đổi, tủ lịch 2026 còn làm kỷ niệm; 1/6/2030 mở được; đồng hồ lùi về 24/12/2025: Anki giữ ngày đã tính (31/5 – 1/6/2030), không sự kiện mới, sổ / kho / xu không đổi, chỉnh giờ lại thì như cũ. Offline: `core/test_1365.py` C (6 ngày xa × 6 kiểm tra) |
| K4 | **Phiên ôn dài** — `e2e_phiendai.js`: vườn Giáng sinh 20 ngăn, **310 lượt chấm** trong bảng ôn của vườn (mỗi lượt dựng lại cả vườn) + mở / đóng tủ lịch, bảng Nhà xen giữa | Chưa có test đo rò rỉ | **14/14** (895 giây): bộ nhớ JS sau dọn rác **3,9 → 4,6 MB**, phần tử DOM 595 → 631, bộ nghe window 30 → 30 / document 39 → 39, vòng vẽ 185 → 176 rAF/giây, setInterval mới 0, khung hình 16,7 → 16,7 ms; bấm chip Tủ lịch 6 lần đều mở đúng một lần; không lỗi JS / nhật ký |
| K5 | **Đóng / mở vườn nhiều lần rồi sang ngày** — `e2e_dongvuon.js` | Chưa có | tìm ra **B1** (mục 2): 1.36.4 đỏ 3/10 → 1.36.5 10/10 (26.9.4 + 23.10.1) |
| K6 | **Ổ đĩa đầy** khi ghi sổ Giáng sinh (`core/test_1365.py` A) | 1.31.1 đã thử OSError 28 cho ví / nhà, chưa cho sổ Giáng sinh | sổ vẫn vào collection, file sao lưu lỗi chỉ ghi nhật ký; không collection thì báo lỗi như cũ |
| K7 | **Cài chung với 6 add-on phổ biến** — `e2e_cungaddon.js` | Chưa có | đọc mã + chạy thật: **28/28**, không traceback (mục 6) |

Môi trường test: mở `ankiweb.net` trong mạng (để đọc trang Memory Forest) làm Anki tự hỏi AnkiWeb "có bản mới không" và so giờ máy chủ
với đồng hồ giả → hộp cảnh báo "đồng hồ sai" (của Anki, chỉ ở máy test) chặn phím / trang ở kịch bản đồng hồ giả. `mkbase.py` nay tắt
"Check for updates" trong hồ sơ test. Mỗi bước của `e2e_giodoingay.js` kiểm "không có hộp thoại Qt nào bật lên".

## 5. Đọc lại mã 1.35.6 → 1.36.4 (24 file, +5.939 dòng)

Đọc kỹ phần Python (cầu nối `le:*`, `_le_settle`, `le_view`, `_check_day`, `GardenState.le_apply`, `le_core` làm sạch / gộp hai máy /
ngày / ông già Noel / thư, `LeStore`) và các chỗ JS gắn bộ nghe sự kiện. Đọc mã không thấy lỗi mới ngoài những gì audit 24/11 (1.36.2) và
lần 1 (1.36.4) đã sửa — lỗi B1 (mục 2) tìm ra nhờ chạy kịch bản, không phải đọc mã 1.36 (nằm ở mã 1.30.3). Ghi lại vài điều đúng thiết kế, đáng biết:

- **Cây thông** là quà mở mùa nhưng cũng là món bán ở cửa hàng mùa (350 xu): sổ ghi "đã tặng" thì không tặng lại, kể cả khi ví mất
  cây (khôi phục ví cũ) — khác Tủ lịch / món của ngăn (sổ có mà kho thiếu thì bù). Tránh tặng hai lần; muốn có lại thì mua.
- **Ổ đĩa đầy / file sao lưu không ghi được**: dữ liệu chính nằm trong collection; file sao lưu (`le.json`, ví…) ghi lỗi chỉ in nhật
  ký, không làm hỏng lần lưu (`LeStore.save`, `GardenState._commit`); ghi file luôn qua file tạm rồi đổi tên. Đã có test lỗi ghi
  `OSError(28)` từ 1.31.1.
- **Giờ đổi ngày ≥ 12 giờ** (hiếm): ngăn / thư / hộp quà theo ngày Anki nên đi sau giờ máy (giờ đổi ngày 23:00 → ngăn 1 mở từ 23:00
  ngày 1/12, thư sáng 25 thành "tối 25 lúc 23:00"); riêng ông già Noel theo giờ máy 18:00 ngày 24 (audit #17e). Đúng quyết định đã
  chốt "các ngăn tính theo ngày Anki" — xem K2 ở mục 4.

## 6. Cài chung với add-on phổ biến — đọc mã + chạy thật

Tải 6 add-on từ AnkiWeb (27/11, bản cho Anki 26.09.4): **Memory Forest** 1.7.0 (1255432496), **Onigiri** (1011095603, 585 👍,
đổi giao diện cả cửa sổ chính), **AnkiConnect** (2055492159, Yomitan dùng), **Review Heatmap** (1771074083), **AJT Japanese**
(1344485230), **FSRS Helper** (759844606). Đầu tiên **đọc mã** của chúng, tìm chỗ có thể đụng ことば畑 (chạy mã của bên thứ ba lúc đầu bị chặn trong phiên); sau đó
**người dùng cho phép chạy thật** (27/11) → `tests/anki/e2e_cungaddon.js` (cài cả 6 add-on qua `KB_EXTRA_ADDONS` của `run_versions.sh`):

| Chỗ có thể đụng | Kết quả đọc mã |
|---|---|
| Tin nhắn từ trang vườn (`pycmd`) | vườn có cầu nối riêng (`set_bridge_command`) → không add-on nào nhận được lệnh của vườn; các bộ nghe `webview_did_receive_js_message` của Onigiri / Memory Forest đều lọc theo tiền tố của mình |
| Chèn CSS / JS vào trang (`webview_will_set_content`, `webview_did_inject_style_into_page`) | Onigiri / Memory Forest lọc theo `DeckBrowser` / `Overview` / `Reviewer` / thanh trên / thanh dưới hoặc so đúng webview → **không chèn vào cửa sổ vườn**. ことば畑 chỉ chèn CSS vào `TopToolbar` |
| Nút "ことば畑" trên thanh trên cùng | **Onigiri** gom link của mọi add-on (`top_toolbar_did_init_links`) vào thanh bên của nó và khi bấm thì gọi đúng `mw.toolbar.link_handlers["kotoba_batake"]` → vẫn mở được vườn; chỉ mất biểu tượng mầm (biểu tượng là CSS `::before` của thanh trên) |
| Phím tắt Ctrl+Shift+K (⌘⇧K) | không add-on nào dùng (Onigiri: Ctrl+K, Ctrl+Shift+P; FSRS Helper / AJT: phím khác) |
| Chấm thẻ trong bảng ôn của vườn | vườn chấm bằng `aqt.operations.scheduling.answer_card` (thao tác chuẩn của Anki) → add-on nghe `operation_did_execute` (AnkiConnect, Memory Forest khi làm mới) thấy như thường; không gọi móc `reviewer_did_answer_card` của cửa sổ ôn Anki nên add-on nghe móc đó (Onigiri, Memory Forest) không bị gọi với Reviewer giả |
| **FSRS Helper** bật "Display memory state" | thêm dòng D / S / R vào **mặt sau thẻ** qua `card_did_render` → bảng ôn của vườn cũng hiện (giống cửa sổ ôn của Anki). Trò chơi / Chép chính tả đọc trường của note, không đọc thẻ đã dựng → không lẫn chữ |
| **Memory Forest** bật "Show my forest on my phone" | tạo deck **"Memory Forest"** + **một note / một thẻ** (kiểu note "Memory Forest", ảnh rừng cập nhật mỗi lần đồng bộ) → nếu ruộng đang xem "mọi deck" hoặc deck đó thì thẻ này thành **một cây** và có trong Tưới ngay (vô hại — thẻ đó vốn để mở trên điện thoại); trò chơi có thể bốc trường "About" làm từ. Ghi lại, không sửa |
| Vá hàm của Anki (`wrap`, gán đè) | Review Heatmap: Thống kê / Cấu hình add-on; Onigiri: `DeckBrowser._renderPage` …; AJT: `models.update_dict`; FSRS Helper: `CollectionStats.todayStats` — không chỗ nào ことば畑 dùng |

→ Đọc mã: **không thấy chỗ xung đột**. Chạy thật (Anki 26.9.4, gói 1.36.5 + 6 add-on): `e2e_cungaddon` **28/28** — 6 add-on + ことば畑
đều nạp; Onigiri gom nút ことば畑 vào thanh bên và gọi đúng đường của nó → mở vườn; N / Esc; ôn 5 thẻ trong vườn (revlog +5);
AnkiConnect trả lời lúc vườn mở (`version`, `deckNames`, `addNote` vào deck đang xem → vườn dựng lại); Giáng sinh 1/12 tặng tủ lịch +
thông báo quà; đóng vườn → màn hình deck của Onigiri + Memory Forest dựng lại; 0 cửa sổ ma; nhật ký lỗi trống; **log Anki không có
traceback nào** (của cả 7 add-on). Kịch bản có sẵn chạy với 6 add-on: CUNGADDON2. (Màn hình deck có lớp "Welcome" của Onigiri lần đầu —
của Onigiri, không liên quan.)

## 7. Đánh giá mức độ hoàn thiện

Cập nhật từ đánh giá lần 1 (`docs/kiem_thu/1.36.4/BAO_CAO.md` mục 5):

| Hạng mục | Mức | Ghi chú |
|---|---|---|
| Tính năng của bản phát hành (Giáng sinh 1.36.0–1.36.3) | **Đủ theo kế hoạch đã chốt** | Như lần 1. Để sau: StackChan ăn bánh kem, ảnh kỷ niệm tự chụp, gửi quả châu qua mã, **năm sau bày lại** (sự kiện gắn năm 2026; K3: tháng 12/2027 không có gì xảy ra, không lỗi) |
| Giữ dữ liệu | **Rất cao** | + K3 (ngày rất xa, đồng hồ lùi: sổ / kho / xu không đổi), K6 (ổ đầy), B1 (không còn cửa sổ ma ghi sổ thay người dùng). Chưa thử AnkiWeb + điện thoại thật |
| Ngày giờ của sự kiện | **Cao → rất cao** | + giờ đổi ngày 0 / 23 giờ (K2). Giờ đổi ngày ≥ 12 giờ: ngăn / thư theo ngày Anki nên trễ so với giờ máy — đúng quyết định đã chốt, ghi lại ở mục 5 |
| Tương thích Anki | **Rất cao** | 7 bản: 23.10.1, 24.06.3, 25.02.7, 25.09.5, 26.8.1, 26.9.4, **26.11 beta**. Chỉ Linux không màn hình; **Windows / macOS chỉ người dùng thử được** |
| Chạy lâu / hiệu năng | **Cao** | K4: 310 lượt chấm không rò bộ nhớ / bộ nghe / vòng vẽ. Trước B1: mỗi lần đóng / mở vườn để lại một cửa sổ ma |
| Cài chung add-on khác | **Cao** | 6 add-on phổ biến (Memory Forest, Onigiri, AnkiConnect, Review Heatmap, AJT Japanese, FSRS Helper): đọc mã + chạy thật cùng nhau — không xung đột, không traceback (mục 6). Add-on khác ngoài 6 cái này chưa thử |
| Giao diện | **Cao** | Như lần 1 (4 cỡ cửa sổ, chữ 150%, Anki tối). Hình / chữ của 1.36.x **Claude chọn, người dùng chưa xem trên máy thật** |
| Test tự động | **Rất cao** | `run_all.sh` 84 mục (+ `core/test_1365.py`), > 115 kịch bản Anki thật (+ `e2e_dongvuon`, `e2e_giodoingay`, `e2e_phiendai`, `e2e_cungaddon`) |
| Tài liệu phát hành | **Đủ** | `docs/ANKIWEB.md` ghi số bản 1.36.5. Bài đăng cho 1.36 chưa có |

**Tổng: phần kỹ thuật ~96%** (lần 1 ~95%: thêm 5 bản Anki, giờ đổi ngày, ngày xa, chạy lâu, cài chung add-on khác, sửa B1). Phần còn
lại không làm được trong máy test: Windows / macOS, AnkiWeb + điện thoại thật, mắt người xem cảnh / chữ.

**Rủi ro còn lại (không chặn phát hành):** như lần 1 mục 5 (cảm nhận hình / chữ, Windows / macOS + bộ gõ, AnkiWeb thật, thông báo quà
tối 24 trùng cảnh ông già Noel); add-on khác ngoài 6 add-on đã thử.

## 8. Memory Forest (1255432496) — tham khảo được không?

Đọc trang AnkiWeb (27/11; cần mở `ankiweb.net` trong mạng của môi trường — đã thêm vào môi trường Default):
**Memory Forest: a forest and heatmap that grow with your reviews**, bản 1.7.0 cập nhật 16/11/2026, 104 👍 / 1 👎, Anki 2.1.45 →
26.09.4, mã nguồn trên GitHub, **giấy phép MIT**; có bản trả phí "Memory Forest Plus" (Patreon) ra phong cảnh mới trước.

### 8.1 Nó vẽ gì

- **Mỗi ngày học thẻ mới = một cây** (không phải mỗi từ). Cây lớn dần theo mức thuộc các thẻ của ngày đó: vài tuần → cây non, thuộc
  lâu → lớn nhiều năm thành cổ thụ. Bắt đầu quên → vài lá vàng, ôn lại → xanh lại. **Cây không bao giờ chết.** Ngày chỉ ôn không
  trồng cây nhưng giữ rừng khoẻ.
- Rừng nằm **dưới danh sách deck** (cửa sổ chính của Anki), kèm heatmap ngày học / chuỗi / số thẻ sắp tới. Rê chuột vào cây → ngày +
  mức nhớ; bấm ngày → mở thẻ của ngày đó.
- Nghỉ một tuần → **ao nước** ở chỗ những ngày thiếu; học đều → **thú tới ở** theo mốc; sau một năm → **căn nhà gỗ** ở bìa rừng.
- 12 phong cảnh (hồ chiều tà, thung lũng sương, cực quang, đèn lồng, rừng tre mưa, synthwave, đêm đầy sao…), đổi theo giờ trong ngày,
  thời tiết thật theo thành phố (tuỳ chọn). 3 "tính cách": Yên bình (mặc định, không phạt) / Hoang dã (bỏ 2 ngày có khói, 3 ngày cháy
  rừng) / Khắc nghiệt (một ngày không ôn → thiên thạch xoá rừng).
- Bản sao rừng lên điện thoại: bật "Show my forest on my phone" → add-on **tạo deck "Memory Forest" + một note** (kiểu note "Memory
  Forest") trong collection, AnkiDroid mở thẻ đó để xem ảnh rừng.

### 8.2 Vì sao trông đẹp hơn ruộng của ことば畑

Ruộng của mình: **mỗi note một cây**, 5 giai đoạn theo độ bền FSRS (Hạt giống → Mầm → Cây non → Ra hoa → Ra quả), héo khi R < 0,7 (giọt
nước), xếp **lưới đều theo thứ tự tạo thẻ** trên các dải đất (`docs/ke_hoach_vuon_gon/vg_00_hien_tai.png`). So với ảnh của Memory
Forest, khác nhau ở:

| | Memory Forest | Ruộng ことば畑 hiện tại |
|---|---|---|
| Chiều sâu | hàng xa **nhỏ dần + nhạt dần vào sương / màu trời**, cây trước che chân cây sau → đọc là "một khu rừng" | mọi hàng cùng cỡ, cùng độ đậm → đọc là "một bảng" |
| Từng cây | nhiều dáng (lá kim, tán tròn, cao / thấp), nhiều sắc xanh, lệch chỗ tự nhiên | cùng giai đoạn = cùng một hình, thẳng hàng |
| Lớn lên | cỡ tăng liên tục nhiều năm (cây lâu năm thành cổ thụ) | 5 nấc, tới "Ra quả" (≥ 90 ngày) là hết lớn |
| Thông tin | bằng **màu** (lá vàng = sắp quên), rất ít biểu tượng trên cảnh | bằng **biểu tượng** phủ lên (giọt nước, hạt) |
| Ánh sáng | chiều tà vàng, mặt hồ phản chiếu, trời có dải màu | sân có trời / giờ / thời tiết, nhưng ruộng là nền cỏ phẳng |
| Bố cục | tự do, có ao / sông / đường mòn | dải đất kẻ ngang (người dùng đã chê dải đất ở 17/11 — mục 10.0d) |

### 8.3 Tham khảo được không

- **Ý tưởng: được.** Ý tưởng (cây lớn theo mức nhớ, chiều sâu, màu thay biểu tượng…) không có bản quyền, và ことば畑 đã có sẵn đủ khung
  để làm theo cách riêng: cây theo FSRS, mùa, giờ trong ngày, thời tiết, thú nuôi, khách ghé, Lịch hoa (đã là "heatmap" của mình).
- **Mã / hình: không nên chép**, dù MIT cho phép dùng lại mã (phải giữ tên tác giả + giấy phép MIT; MIT hợp với AGPL của mình):
  1. hình cây / phong cảnh là **bản sắc** của Memory Forest — người dùng AnkiWeb thấy giống là mất điểm cho ことば畑 (và cả hai cùng
     trên AnkiWeb, nhiều người cài cả hai);
  2. phần đẹp nhất (phong cảnh Plus) là phần tác giả **bán** qua Patreon;
  3. mô hình dữ liệu khác hẳn (một ngày một cây ↔ một note một cây), mã vẽ không dùng thẳng được.
- **Không nên bê**: "một ngày một cây" (mất cái riêng "mỗi từ là một cây" của mình; Lịch hoa đã làm phần theo ngày), cháy rừng /
  thiên thạch (vườn của mình không phạt — chỉ héo rồi tươi lại khi tưới).

### 8.4 Đề xuất áp dụng cho ruộng (sau phát hành — làm ảnh phác cho người dùng duyệt trước, ghép với mục 10.0d)

1. **Ruộng có chiều sâu** — lựa chọn ⚙ "Ruộng: Phẳng (như cũ) / Có chiều sâu": hàng phía sau nhỏ dần + nhạt dần theo màu trời của giờ
   đó, cây hàng trước che chân cây hàng sau; bỏ dải đất kẻ ngang, mỗi gốc một ụ đất nhỏ.
2. **Mỗi cây một dáng** — lấy mã note làm hạt ngẫu nhiên: lệch chỗ ± 2 điểm ảnh, cao / thấp ± 10 %, 3–4 sắc lá cho cùng giai đoạn;
   giống cây tự vẽ vẫn giữ nguyên hình.
3. **Cây lớn tiếp sau "Ra quả"** — độ bền ≥ 1 năm → cây to hơn (cổ thụ, có thể vượt ô), để vườn của người học lâu khác vườn người mới.
4. **Sắp quên = lá ngả vàng** (R từ 0,8 xuống 0,7), héo hẳn mới có giọt nước → bớt biểu tượng trên ruộng.
5. **Ánh sáng theo giờ** cho ruộng như sân (chiều tà vàng, đêm xanh, đèn đom đóm).
6. Ghép với 10.0d: luống theo giai đoạn + biển gỗ (kiểu 01b người dùng đã chọn) — có chiều sâu thì luống "Ra quả" lùi về phía xa,
   luống cần tưới ở gần.

Chỉ đổi cách vẽ (không đổi dữ liệu / lưu trữ), mặc định giữ như cũ để không đổi vườn của người đang dùng.

## 9. Xem trên máy thật trước khi phát hành (~10 phút)

Như lần 1 (`docs/kiem_thu/1.36.4/BAO_CAO.md` mục 6), cài **1.36.5**:

1. Anki trên máy có **1.35.6** (bản AnkiWeb): Tools → Add-ons → Install from file → `kotoba_batake.ankiaddon` (1.36.5) → khởi động
   lại → vườn còn đủ xu / đồ / nhật ký.
2. (cần file `user_files/admin`) ⚙ → Xem thử sự kiện **1/12**: tủ lịch, Làm thiệp → thẻ ✎ Vẽ, Vẽ quả châu.
3. Xem thử **24/12 tối**: cảnh ông già Noel — xem hết một lần.
4. Xem thử **25/12**: thư; **1/1**: cất đồ, Album → Kỷ niệm. Dừng xem thử → vườn như cũ.
5. **Mới (B1)**: mở vườn → đóng (✕) → mở lại → đóng, vài lần — Anki vẫn nhẹ như thường. (Phần "sang ngày khi vườn đóng" cần để Anki
   mở qua 4:00 sáng — không cần thử, đã kiểm bằng `e2e_dongvuon` + đồng hồ máy giả.)
6. Đồng bộ AnkiWeb một lần, mở AnkiDroid / AnkiMobile ôn vài thẻ, đồng bộ lại → mở vườn trên máy tính: xu bù đúng, đồ còn.
7. (Tuỳ chọn) Nếu đang dùng add-on khác ngoài 6 add-on đã thử ở mục 6: mở vườn, ôn vài thẻ trong vườn, đóng vườn — add-on kia vẫn chạy
   như thường.

## 10. Lệnh chạy lại

```bash
ANKI_PY=~/.venv-anki/bin/python PY39=~/venvs/aqt-23.10.1/bin/python tests/run_all.sh /tmp/kb_1365     # gói đã giải nén
# Anki 26.11 beta + các bản ở giữa (mỗi bản một venv ~/venvs/aqt-<bản>; 26.11b1: uv pip install --prerelease=allow "aqt[qt6]==26.11b1")
KB_SLOT=1 tests/anki/run_versions.sh /tmp/kb_1365 OUT "26.11b1 24.06.3 25.02.7 25.09.5 26.8.1" "e2e_tour.js e2e_136.js e2e_1361.js e2e_1363.js e2e_nguoimoi_noel.js"
KB_SLOT=2 tests/anki/run_versions.sh /tmp/kb_1365 OUT "26.9.4 23.10.1" "e2e_dongvuon.js"
KB_SLOT=3 KB_EXTRA_ADDONS=<thư mục 6 add-on tải từ AnkiWeb, tên thư mục = mã> tests/anki/run_versions.sh /tmp/kb_1365 OUT "26.9.4" "e2e_cungaddon.js e2e_tour.js e2e_136.js e2e_1363.js"
KB_SLOT=2 KB_TIMEOUT=2700 tests/anki/run_versions.sh /tmp/kb_1365 OUT "26.9.4" "e2e_phiendai.js"
# giờ đổi ngày 0 / 23 giờ (đồng hồ máy giả — apt-get install faketime)
KB_ROLLOVER=0  KB_DONGHO_SCRIPT=e2e_giodoingay.js ANKI_PY=~/.venv-anki/bin/python tests/anki/run_dongho.sh /tmp/kb_1365 /tmp/kb_gio0
KB_ROLLOVER=23 KB_DONGHO_SCRIPT=e2e_giodoingay.js ANKI_PY=~/.venv-anki/bin/python tests/anki/run_dongho.sh /tmp/kb_1365 /tmp/kb_gio23
git show 676647f:kotoba_batake.ankiaddon > /tmp/kb_1356.ankiaddon                    # 1.35.6 (AnkiWeb)
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_capnhat.sh /tmp/kb_1356.ankiaddon kotoba_batake.ankiaddon /tmp/kb_capnhat
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_habanh.sh kotoba_batake.ankiaddon /tmp/kb_1356.ankiaddon /tmp/kb_habanh
```
