# Báo cáo 1.36.4 — kiểm tra lần cuối trước phát hành cuối tuần + đánh giá mức độ hoàn thiện (26/11/2026)

Người dùng 26/11: "review, kiểm tra kỹ addon lần cuối, cuối tuần này sẽ release. kiểm tra các kịch bản, test ngoài bộ test đã có
sẵn. đánh giá mức độ hoàn thiện".

Bản kiểm tra: **1.36.3** (gói ở `master`, chưa phát hành; AnkiWeb đang là **1.35.6**). Tìm được **2 lỗi thật** (một lỗi có từ 1.36.0, một
lỗi có từ 1.36.1), đã sửa thành **1.36.4**. **Không đổi lưu trữ**: khoá collection và `config.json` giống hệt 1.36.3; chỉ đổi
`event_core.py`, `web/le_noel.js`, `web/tour.js` (+ README, manifest). → **Phát hành 1.36.4 thay cho 1.36.3** (gồm 1.36.0–1.36.3).
Nhánh `claude/kind-euler-amy5ds`. **Cách sửa Claude chọn, người dùng chưa xem.**

## 1. Kết luận nhanh

| | |
|---|---|
| Có phát hành cuối tuần được không | **Được — bản 1.36.4**, sau khi người dùng xem ~10 phút trên máy thật (mục 6). Không còn lỗi nào đã biết làm mất dữ liệu, chặn thao tác hay bật hộp lỗi |
| Lỗi tìm được lần này | 2 (mục 3): người mới cài trong tháng 12 **không bao giờ có hướng dẫn 3 bước**; cảnh ông già Noel tối 24 / thư sáng 25 **chạy dưới màn chào** (mất mấy giây đầu) |
| Bộ test có sẵn trên gói 1.36.3 | đều đạt (mục 2) |
| Test mới ngoài bộ có sẵn | 6 kịch bản (mục 4): đồng hồ máy giả, cập nhật từ bản AnkiWeb thật, quét giao diện, bấm bừa, người mới trong mùa, dữ liệu tối đa |
| Mức độ hoàn thiện | **phần kỹ thuật ~95%** (mục 5); phần còn lại là việc người dùng xem bằng mắt trên Windows / macOS + AnkiWeb + điện thoại thật |

## 2. Bộ test có sẵn (trên gói 1.36.3 đã giải nén, môi trường mới dựng hôm nay)

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` (`ANKI_PY` = aqt 26.9.4) | **82 mục, TẤT CẢ OK** |
| Anki **23.10.1** (Python 3.9, PyQt6 6.6): `e2e_136.js` · `e2e_1361.js` · `e2e_1362.js` · `e2e_1363.js` | **66/66 · 81/81 · 40/40 · 44/44** |
| **Cập nhật đè từ bản đang trên AnkiWeb (1.35.6 → 1.36.3)** — `run_capnhat.sh` với gói 1.35.6 lấy từ git (`676647f`), cài bằng trình quản lý add-on của Anki | **5/5 + 18/18** — 12 khoá collection, 48 file `user_files/`, cấu hình, xu, nhật ký y nguyên; tháng 12 trên dữ liệu 1.35.6 tặng tủ lịch, 3 ngăn chờ mở |
| **Hạ bản 1.36.3 → 1.35.6 → lên lại** (`run_habanh.sh`, như một máy còn 1.35.6 dùng chung collection) | **4/4 + 10/10 + 19/19** — 1.35.6 chơi tiếp (mua, đặt, Cấu hình trường, nhật ký) mà đồ Giáng sinh, tường Noel, 21 ngăn, thiệp + hình vẽ, quả châu, thiệp nhận còn nguyên |

Trước đây `run_capnhat.sh` / `run_habanh.sh` chỉ chạy với **1.31.3**. Lần này chạy thêm với **1.35.6**, bản người dùng thật đang có.

## 3. Lỗi tìm được + cách sửa

### B1 — người mới cài trong mùa Giáng sinh không có hướng dẫn 3 bước (có từ 1.36.0)
- **Ai gặp**: mọi người cài ことば畑 lần đầu từ 1/12 tới 31/12 (sự kiện là lý do chính để giới thiệu bản này, nên rất có thể là
  nhiều người mới).
- **Vì sao**: `refresh()` gọi `_le_settle` (tặng Tủ lịch 2026 + cây thông) **trước** khi xét `event_core.is_new_player`. Hồ sơ vừa có
  `owned` = {tủ lịch, cây thông} nên bị coi là "đã có đồ", không còn là người mới, và không bao giờ hiện hướng dẫn (các lần mở sau
  cũng vậy).
- **Tái hiện** (`tests/anki/e2e_nguoimoi_noel.js`, Anki 26.9.4, màn chào + hướng dẫn bật như người dùng thật): cài 28/11 và 2/1 thì có
  hướng dẫn; cài 1/12, tối 24/12, sáng 25/12 thì **không có**. Trên 1.36.3: **đỏ 6 / 16**.
- **Sửa**: `is_new_player` bỏ qua món sự kiện (`_event_gift`: id `le_…` và `xmastree`). Đồ mua thật vẫn tính như 1.26.1.

### B2 — cảnh ông già Noel tối 24 / thư sáng 25 / cất đồ 1/1 bật dưới màn chào (có từ 1.36.1)
- **Ai gặp**: người bật "Chào khi mở vườn" (**mặc định bật**) mở vườn **lần đầu trong ngày** vào tối 24 (cũng vậy với thư sáng 25 và
  bảng cất đồ 1/1).
- **Vì sao**: `idle()` của `web/le_noel.js` xét màn chào `#kb-greet` và lớp chuyển cảnh `#kb-trans` bằng `offsetParent`. Hai lớp này
  là `position: fixed`, nên `offsetParent` **luôn null** và phép kiểm không bao giờ chặn. Cảnh (z-index 280) chạy ngay bên dưới màn chào
  (z-index 300). Màn chào tự tắt sau ~4–5 giây, nên người dùng **mất đoạn đầu** (xe tuần lộc đáp xuống), vì cảnh chỉ tự chạy một lần.
  Bộ test cũ không gặp vì kịch bản cũ tắt màn chào (`zz_kbtest`).
- **Ảnh** (1.36.3, 2 giây sau khi mở vườn — cảnh đang chạy phía sau): `anh/01_1363_man_chao_che_canh_dem.png`; 1.36.4:
  `anh/02_1364_man_chao_canh_cho.png` → `anh/03_1364_het_chao_canh_chay_tu_dau.png`.
- **Sửa**: `idle()` hỏi `GardenGreet.isGreeting()` + `getClientRects` (đúng cho lớp fixed). Ngoài ra `tour.js busy()` chờ các lớp
  Giáng sinh (cảnh, thư, cất đồ, tủ lịch, thiệp, quả châu), để hướng dẫn của người mới không đè lên cảnh. Người mới tối 24: màn chào →
  hướng dẫn → (Xong / Bỏ qua) → cảnh ông già Noel.

### Test cho hai lỗi
- `tests/core/test_1364.py` (**28/28**; mã 1.36.3: **đỏ 9**): `is_new_player` 14 ca; **hàm `idle()` thật chạy bằng node với DOM giả**
  (phần tử fixed có `offsetParent` = null như trình duyệt); `tour.js busy`; hợp đồng dữ liệu = 1.36.3 (khoá collection, `config.json`,
  danh sách file đổi). Đã thêm vào `run_all.sh`.
- `tests/anki/e2e_nguoimoi_noel.js` (Anki thật): 1.36.3 **đỏ 6/16** → 1.36.4 **22/22** trên 26.9.4, **24/24** trên 23.10.1 (thêm ca người mới tối
  24 bấm "Bỏ qua" hướng dẫn → cảnh ông già Noel tự chạy).

## 4. Kịch bản mới ngoài bộ test có sẵn

| # | Kịch bản | Cái mới so với bộ cũ | Kết quả |
|---|---|---|---|
| K1 | **Đồng hồ máy giả** — `tests/anki/run_dongho.sh` + `e2e_dongho.js` | Bộ cũ dùng ngày giả `kb.LE_TEST` (chỉ add-on thấy). Lần này chạy Anki thật dưới **libfaketime** (bản đa luồng), **múi giờ Việt Nam**: lịch ôn của Anki, revlog, giờ đổi ngày 4:00, `datetime.now()` của Python và `Date` của trang cùng một đồng hồ. Đi từ 30/11 21:00 tới 2/1, **để vườn mở qua giờ đổi ngày** (đồng hồ 60 giây thật của vườn tự dựng lại) | 26.9.4 trên 1.36.3: **56/58** — 2 ca đỏ là kỳ vọng sai của test (đếm revlog trước khi lượt chấm chạy nền xong; ngày 1/1 không có món phải cất nên đúng ra không bật bảng trống), đã sửa test. 23.10.1 trên 1.36.3: lượt đầu dừng ở bước 25/12 04:05 (thư chưa mở sau 80 giây — máy đang chạy 4 việc; đồng hồ của vườn 60 giây + dựng lại) → nâng ngưỡng chờ lên 150 giây. Kết quả trên 1.36.4: mục 4.1 |
| K2 | Quét giao diện mọi bảng Giáng sinh — `e2e_giaodien_noel.js` | Tủ lịch (12/12, 25/12), xưởng thiệp (4 thẻ + mặt sau), quả châu, cảnh tối 24 (đang chạy + khung cuối), thư, cất đồ, Album → Kỷ niệm × cửa sổ 1366 / 1024 / 800 (+ 720 × 540), Anki giao diện tối, vườn tiếng Nhật, **chữ 150%** (`ANKI_WEBSCALE=1.5`). Đo: bảng trong cửa sổ hoặc cuộn được, mọi nút / ô với tới được, chữ không tràn nút, nút không đè nhau, độ tương phản chữ | 1.36.3: **97/97** (chữ 100%); chữ 150%: 95/97 — 2 ca là bảng Nhà → Kỷ niệm ở khung 683 × 427 phải **cuộn trang** (bố cục chung của bảng Nhà có từ trước, không phải lỗi; test tính cả cuộn trang). 1.36.4: **97/97** cả chữ 100% lẫn 150% |
| K3 | Bấm bừa lệnh `le:*` — `e2e_fuzz_noel.js` | Bộ bấm bừa cũ (1.30) chưa có lệnh Giáng sinh. 1.290 lệnh đúng / sai (ngăn / hộp / ô lạ, JSON hỏng, thiệp sai kiểu, chuỗi 5.000 ký tự, mã thiệp sửa hỏng, quả châu sai cỡ, `le:keep` rác, bật / tắt sự kiện, xem thử khi không phải admin) qua 34 ngày (1/12 → 3/1, giờ ngẫu nhiên cả 17:59 / 18:00 ngày 24) | **Bất biến giữ hết**: xu không đổi (7.777), món sự kiện = đúng sổ, đặt ≤ có, sổ luôn sạch, ngăn chỉ mở đúng ngày / ≤ 31/12, mở bù ≤ 2 / ngày, hộp từ 25/12, thiệp ông già Noel đã mang đi không đổi; không lỗi JS. Nhật ký lỗi chỉ có dòng của lệnh **JSON hỏng** — trang không bao giờ gửi kiểu này (luôn `JSON.stringify`), cầu nối đã bắt và trả lời "không làm được" → để nguyên (nới `except` sẽ nuốt lỗi thật) |
| K4 | Người mới cài trong mùa — `e2e_nguoimoi_noel.js` | Màn chào + hướng dẫn **bật** (kịch bản cũ tắt cả hai) | Tìm ra **B1 + B2**. 1.36.3: đỏ 6/16. 1.36.4: **22/22** (+ người mới tối 24 bấm "Bỏ qua" hướng dẫn → cảnh tự chạy) |
| K5 | Dữ liệu Giáng sinh tối đa (Python, `le_core`) | 3 thiệp vẽ kín + 24 thiệp nhận có hình vẽ (mã ~5.300 ký tự) | Khoá `kotoba_batake_le` **115 KB**; làm sạch 15 ms, gộp hai máy 31 ms, `view_more` 7 ms → mỗi lần dựng vườn thêm ≤ ~50 ms ở mức tối đa (bình thường < 5 ms). Chấp nhận được |
| K6 | Cập nhật từ 1.35.6 + máy còn 1.35.6 | mục 2 | đạt |

Đã kiểm thêm trong K1 (Anki thật, giờ thật):
- Ôn lúc 01:00 ngày 1/12 vẫn tính cho ngày 30/11 (giờ đổi ngày 4:00), nên ngăn 1 vẫn chờ ôn. Ôn lúc 02:30 ngày 3/12 tính cho ngăn 2,
  là mở thường chứ không phải mở bù. Mở bù tính theo ngày Anki: 03:00 ngày 7/12 vẫn là "hôm nay đủ 2 ngăn", 04:10 thì mở bù tiếp được.
- Vườn để mở qua 4:00 ngày 1/12 tự tặng tủ lịch + cây thông. Qua 18:00 ngày 24 thì ông già Noel tự ghé và thiệp khoá. Qua 4:00 ngày
  25/12 thì thư tự mở. Qua 4:00 ngày 1/1 thì tự cất đồ. Mỗi lần mất 22–119 giây (đồng hồ 60 giây của vườn, bỏ qua một nhịp khi Anki đang bận), không phải đóng / mở vườn.
- 00:40 ngày 25/12 (ngày Anki còn là 24) thì hộp quà chưa mở được và chưa có thư.
- Đồng hồ máy lùi về 20/12 sau khi đã cất đồ: không lỗi, sổ / kho không đổi, không tặng lại. Anki giữ ngày đã tính tới khi đồng hồ
  vượt lại mốc.

### 4.1 Chạy lại trên gói 1.36.4

| Bộ | 26.9.4 | 23.10.1 |
|---|---|---|
| `tests/run_all.sh` (gói đã giải nén, 83 mục) | **TẤT CẢ OK** (sau khi xuất lại dữ liệu trang web cho số bản 1.36.4 — `node site/tools/xuat_hinh.js`, chỉ đổi dòng `version`) | — |
| Mới: `e2e_nguoimoi_noel` · `e2e_giaodien_noel` · `e2e_fuzz_noel` | **22/22 · 97/97 · 5/5** | **24/24** · — · **5/5** |
| Mới: `e2e_dongho` (đồng hồ máy giả) | **59/59** (tự dựng lại sau 45 / 66 / 72 / 70 giây) | **59/59** (22 / 119 / 59 / 50 giây — 119: một nhịp 60 giây của vườn bỏ qua lúc Anki bận, đúng thiết kế) |
| Hồi quy hướng dẫn / màn chào: `e2e_1261` · `e2e_126` | **41/41 · 39/39** | **41/41** · — |
| Hồi quy Giáng sinh: `e2e_136` · `e2e_1361` · `e2e_1362` · `e2e_1363` | **66/66 · 81/81 · 40/40 · 44/44** | **66/66 · 81/81 · 40/40 · 44/44** |
| Cập nhật đè 1.35.6 → 1.36.4 · hạ bản 1.36.4 → 1.35.6 → 1.36.4 · cập nhật đè 1.31.3 → 1.36.4 | **23/23 · 33/33 · 23/23** | — |
| Chữ 150% (`ANKI_WEBSCALE=1.5`) `e2e_giaodien_noel` | **97/97** | — |

## 5. Đánh giá mức độ hoàn thiện

| Hạng mục | Mức | Ghi chú |
|---|---|---|
| Tính năng của bản phát hành (sự kiện Giáng sinh 1.36.0–1.36.3) | **Đủ theo kế hoạch đã chốt 23/11 + vẽ tay 25/11** | Còn để sau, không cần cho bản này: StackChan ăn bánh kem, ảnh kỷ niệm tự chụp, gửi quả châu qua mã, **năm sau bày lại** (sự kiện gắn năm 2026 — tháng 12/2027 không có gì xảy ra, cần một bản mới) |
| Giữ dữ liệu (cập nhật, hạ bản, đồng bộ, lỗi ghi) | **Rất cao** | Cập nhật từ 1.31.3 và 1.35.6, hạ về hai bản đó, máy chủ đồng bộ thật của Anki (47–74 ca), 2.047 + 172 ca dữ liệu hỏng / lỗi ghi, bấm bừa có bất biến. Chưa thử **AnkiWeb + điện thoại thật** (mục 4 của `1.31.2/BAO_CAO.md` — vẫn nên làm một lần) |
| Ngày giờ của sự kiện | **Cao** | Lần này thử với đồng hồ thật + giờ Việt Nam + giờ đổi ngày (K1). Giờ 18:00 ngày 24 tính theo giờ máy, các ngăn tính theo ngày Anki (đã chốt) |
| Tương thích Anki | **Cao** | 23.10.1 + 26.9.4 (bản mới nhất add-on ghi). Chỉ chạy Linux không màn hình. **Windows / macOS chỉ người dùng thử được** |
| Giao diện | **Cao** | K2: 4 cỡ cửa sổ, chữ 150%, Anki tối, vườn tiếng Nhật. Đo bằng máy, không thay được mắt người. Nhiều chi tiết hình / chữ của 1.36.x **Claude chọn, người dùng chưa xem trên máy thật** |
| Người mới | **Cao sau 1.36.4** | Trước 1.36.4, người mới trong tháng 12 không có hướng dẫn (B1) |
| Test tự động | **Rất cao** | `run_all.sh` 83 mục (thêm `test_1364.py`), > 110 kịch bản Anki thật, 6 kịch bản mới lần này |
| Tài liệu phát hành | **Đủ** | README (trang giới thiệu) có mục Giáng sinh. `docs/ANKIWEB.md` lần này **thêm dòng Giáng sinh vào mô tả** + số bản 1.36.4 (trước còn ghi 1.31.4). Bài đăng Facebook cho 1.36 chưa có (bài 1.35.6 đã mời đón sự kiện) |

**Rủi ro còn lại (không chặn phát hành):**
1. Cảm nhận hình / chữ / nhịp của cảnh tối 24, thư, xưởng thiệp trên màn hình thật: chỉ người dùng xem được (mục 6).
2. Windows / macOS (font, cỡ chữ của hệ điều hành, bộ gõ tiếng Việt khi gõ lời chúc / điều ước): đã đo bằng máy ở chữ 150% và giữ con
   trỏ khi gõ, nhưng chưa thử bộ gõ thật.
3. AnkiWeb + điện thoại thật: lớp giữ dữ liệu đã thử với máy chủ đồng bộ đi kèm Anki (cùng mã phía máy khách), chưa thử AnkiWeb thật.
4. Tối 24, người mở vườn lần đầu trong tháng (chưa nhận quà): thông báo "Quà tặng: tủ lịch…" (7 giây) hiện cùng lúc với cảnh ông già
   Noel (z-index thông báo cao hơn từ 1.36.2) — không che cảnh, chỉ ghi lại (`anh/03_…`).

## 6. Xem trên máy thật trước khi phát hành (~10 phút)

1. Anki trên máy có **1.35.6** (bản AnkiWeb): Tools → Add-ons → Install from file → `kotoba_batake.ankiaddon` (1.36.4) → khởi động
   lại → vườn còn đủ xu / đồ / nhật ký.
2. (cần file `user_files/admin`) ⚙ → Xem thử sự kiện **1/12**: bảng tủ lịch, Làm thiệp → thẻ ✎ Vẽ vẽ vài nét, Vẽ quả châu.
3. Xem thử **24/12 tối**: cảnh ông già Noel — xem hết một lần (nhạc nếu bật).
4. Xem thử **25/12**: thư; **1/1**: cất đồ, Album → Kỷ niệm. Dừng xem thử → vườn như cũ.
5. Đồng bộ AnkiWeb một lần, mở AnkiDroid / AnkiMobile ôn vài thẻ, đồng bộ lại → mở vườn trên máy tính: xu bù đúng, đồ còn.

(B1 / B2 cần ngày tháng 12 thật nên không xem được bằng "Xem thử" — đã kiểm bằng K1 / K4.)

## 7. Còn chờ người dùng (không chặn phát hành)

Như trước: ảnh phác chỗ tiêu xu kiểu Stardew (`docs/ke_hoach_tieu_xu/`), R01 (báo Gemini riêng từng hồ sơ hay chung), mục 5 của
`1.35.5/BAO_CAO.md` (khôi phục bản sao lưu sạch), giữ / gộp 11 tab Nhà, Tô tranh theo số, vườn 3D — PHAT_TRIEN.md mục 10.

## 8. Lệnh chạy lại

```bash
ANKI_PY=~/.venv-anki/bin/python tests/run_all.sh /tmp/kb_new                       # gói đã giải nén
KB_SLOT=2 tests/anki/run_versions.sh /tmp/kb_new OUT "26.9.4 23.10.1" "e2e_nguoimoi_noel.js e2e_giaodien_noel.js e2e_fuzz_noel.js"
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_dongho.sh /tmp/kb_new /tmp/kb_dongho  # cần: apt-get install faketime
git show 676647f:kotoba_batake.ankiaddon > /tmp/kb_1356.ankiaddon                    # 1.35.6 (AnkiWeb)
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_capnhat.sh /tmp/kb_1356.ankiaddon kotoba_batake.ankiaddon /tmp/kb_capnhat
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_habanh.sh kotoba_batake.ankiaddon /tmp/kb_1356.ankiaddon /tmp/kb_habanh
```
