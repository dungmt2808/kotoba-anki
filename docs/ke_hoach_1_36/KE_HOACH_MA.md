# Kế hoạch mã 1.36 — sự kiện Giáng sinh (19/11, **chưa làm**)

Người dùng (19/11): "bạn tìm hiểu chi tiết rồi lên kế hoạch thôi nhá, hiện tại chưa cần tiến hành". Thiết kế đã chốt ở
`KE_HOACH.md` (mục **BẢN CHỐT**, ảnh `ban2/`–`ban5/`). File này là kế hoạch **viết mã**: chỗ nào trong mã phải đụng, dữ liệu
lưu ra sao để không mất dữ liệu bản đã phát hành, thứ tự làm, test, rủi ro, phần cắt bớt nếu trễ. Chưa viết dòng mã nào của add-on.

## 0. Nguyên tắc
- **Giữ dữ liệu của bản đã phát hành (1.31.3) và mọi bản sau**: chỉ thêm khoá collection mới `kotoba_batake_le`; đồ mới ở tầng
  `NHA_KEY` như `FIND_ITEMS` (1.28) — bản ≥ 1.24 giữ hộ món lạ (`keep_foreign_nha`); không đổi khoá / cấu trúc cũ.
- Mọi lần ghi qua `backup_core.commit_config` / `put_config` (dấu phiên bản, `sync_core` tự chụp mọi khoá `kotoba_batake_*`) và
  **ghi cùng một lần với ví** (`STATE.<việc>(…, extra=[LE.write(ev)])`, như `find_reward` của 1.28) — không bao giờ "đã mở ngăn"
  mà món chưa vào kho.
- Python xét lại mọi thứ (ngày, lượt ôn, ngăn đã mở, chỗ đặt); JS chỉ vẽ và gửi lệnh. Lỗi là câu tiếng Việt (`HomeError`).
- Không thêm xu, không gọi Gemini (trừ nút "Nhờ Gemini sửa" thiệp — người dùng bấm mới gọi, 1 lượt Flash-Lite như Luyện viết).
- Tắt được (⚙ "Sự kiện mùa"); tắt thì không tặng, không vẽ, dữ liệu giữ nguyên.

## 1. Điểm móc vào mã hiện có (đã dò 19/11)

| Chỗ | File / hàm | Làm gì |
|---|---|---|
| Chọn hình của món | `web/home.js` `sceneSprite(e, …)` | `xmastree` khi sự kiện đang chạy → hình **cây trơn + các quả châu đã mở** (`GardenLe.treeSprite()`), dựng từ `SPR.xmastree` (bỏ điểm ảnh trang trí, như `xtree` ở `tests/anki/mock_136_art.js`) |
| Hiệu ứng của món | `drawItemExtra` → `season_art.js` FX `xmastree` (đèn `TREE_LIGHTS`) | chỉ chạy khi ngăn 10 (dây đèn) đã mở; ngôi sao chỉ khi ngăn 24 |
| Sau khi vẽ nhà | `drawOutdoor` ngay sau `drawHouse(…)` / `drawWear` | áo nhà (mái tuyết, dây lá thông, vòng hoa, hình dán cửa sổ) — `GardenLe.drawHouse(ctx, S, ox, oy, home, now, tod)` |
| Lớp đồ trên sân | vòng `placedSorted(...).forEach(drawItem)` | không đổi; người tuyết / tuần lộc đèn là **món thường** (đặt ô như mọi món) |
| Trước lớp tối ban đêm | trước `drawNight(…)` | dây đèn tắt (ban ngày) |
| Sau lớp tối ban đêm | ngay sau `drawNight(…)` (cả nhánh thời tiết tắt) | **lớp sáng**: viền mái, đèn băng, đèn quấn theo hình món (`itemBox` + sprite), dây đèn võng, quầng sáng trên tuyết — như `drawIllumBusy` của ảnh phác; ảnh chụp vườn (`opts.photo`) vẽ luôn |
| Đèn có sẵn | mảng `lights` (vòng sáng vàng của `drawNight`) | không dùng cho đèn sự kiện (màu khác) — vẽ riêng sau `drawNight` |
| Trong nhà | món tường / sàn của phòng (`ROOM_COLS` 10 × 4, cửa sổ ô 4–5) | tủ lịch là món **tường**; hộp nhạc, đèn ngủ… là món sàn — dùng sẵn hệ đặt đồ |
| Màn chào / hiệu ứng | `web/greet.js` (`show`, chuyển cảnh `strip`) | cảnh đêm 24 dựng như màn chào riêng (`GardenLe.santa()`), bỏ qua được, "Xem lại" |
| Nhạc | `web/music.js` (`melody("E5:4 …")`, `track`, `THEME_TRACK.noel`) | thêm **phát một lần** `GardenMusic.musicBox(câu)` (dừng nhạc nền, phát N câu đầu của Silent Night, trả nhạc nền) |
| Tab Album | `home.js` `renderAlbum` (khách / Hộp sưu tầm / Sổ sinh hoạt) | thêm phần **Kỷ niệm** (`albumView === "le"`) |
| Tin làng / Hôm nay | `event_core.news(ctx)`, `_news_and_greet` | dòng "Lịch chờ Giáng sinh: ô 10/12 chưa mở ▸"; trước 1/12: "1/12 mở Lịch chờ Giáng sinh" |
| Chip Giáng sinh | `season.js` chip `#kb-theme-chip` → `G.openSeason` | trong tháng 12 bấm chip mở tủ lịch (giữ đường vào Giao diện mùa trong bảng) |
| Dữ liệu cho JS | `__init__.py` `refresh()` (cạnh `data["finds"]`, `data["life"]`) | `data["le"] = le_view(...)` |
| Cầu nối | `_on_bridge` (`cmd.startswith("find:")` …) | `le:*` → `_on_le` |
| Lưu cùng ví | `STATE.find_reward(coins, gift, extra=[EVENTS.write(ev)])` | `STATE.le_apply(gifts, takes, extra=[LE.write(ev)])` |
| Tường / sàn | `decor_core` (`WALLS`, `FLOORS`, mẫu tự vẽ `t<n>` vẽ từ điểm ảnh) + `nha_art.js DECO` | 5 mẫu Noel là **mẫu điểm ảnh 16 × 16 có sẵn** (vẽ như mẫu tự vẽ), id `n_*`, sở hữu ở `kotoba_batake_le` |
| Kiểu nhà | `home.js STYLE_DRAW` (minka, teahouse, castle; nhà gốc ở `drawHouse`) | bảng điểm mái / cửa / cửa sổ / ống khói cho từng kiểu (đo từ mã vẽ) |
| Ngày Anki | `journal.anki_today(col)` (`cal_today`), `ngay_core.Days`, `journal.revlog_days(col, start, end)` | ngày có ôn của 1–24/12 (ôn ở điện thoại cũng có trong revlog) |

## 2. Dữ liệu

### 2.1 Khoá `kotoba_batake_le`
```
{"v": 1,
 "noel2026": {
   "open":  {"1": {"d": "2026-12-01", "b": 0}, "4": {"d": "2026-12-07", "b": 1}},   # ngăn đã mở: ngày mở, mở bù?
   "bu":    {"2026-12-07": 1},                 # số ngăn mở bù theo ngày (≤ 2) — giữ 40 ngày
   "gift":  {"tulich": "2026-12-01", "tree": "2026-12-01"},   # đã tặng (không tặng lại khi đồng bộ / cài lại)
   "px":    {"17": "<mã 8×8>"},                # hình dán cửa sổ tự vẽ
   "card":  {"paper": "do", "st": [{"s": "star", "x": 3, "y": 4}], "px": "<mã 16×16>", "t": "…", "lang": "vi",
             "sig": "…", "hung": true, "at": "2026-12-20"},
   "santa": {"seen": "2026-12-24T19:02", "box": "2026-12-25"},   # đã xem cảnh đêm 24 / đã mở hộp quà
   "decor": {"w": ["n_tuyet", "n_keo", "n_do"], "f": ["n_caro", "n_len"], "prev": {"room": {"wall": "w_go"}}},
   "keep":  ""                                  # "" | "cat" (đã cất 1/1) | "giu"
 }}
```
- **Gộp hai máy**: `payload()` đọc lại khoá trên collection rồi lấy **hợp** `open` / `gift` / `bu` (ngày nào nhiều hơn thắng),
  `card` theo `at` mới hơn, khoá lạ giữ nguyên (như `finds_core.EventStore.payload`). Đọc lỗi → `_damaged`, không ghi.
- Sao lưu `user_files/ho_so/<mã>/le.json` (`backup.write_backup`). Ảnh kỷ niệm `user_files/ho_so/<mã>/ky_niem/2026_*.png`
  (không đồng bộ — máy khác thấy chữ, không thấy ảnh).

### 2.2 Đồ mới `LE_ITEMS` (garden_core, tầng 3 như `FIND_ITEMS`, `only: "le"`, không bán)
| id | Tên | Cảnh / chỗ | Ngăn |
|---|---|---|---|
| `le_tulich26` | Tủ lịch Giáng sinh 2026 | phòng · tường | tặng 1/12 |
| `le_hopnhac` | Hộp nhạc | phòng · sàn | 3 |
| `le_tat` | Tất Noel | phòng · tường | 5 |
| `le_cautuyet` | Quả cầu tuyết | phòng · sàn | hộp 6 (mở 25/12) |
| `le_banhkem` | Bánh kem dâu | phòng · sàn (ăn sáng 25) | 11 |
| `le_gaubong` | Gấu bông Noel | phòng · sàn | hộp 13 |
| `le_denngu` | Đèn ngủ ngôi sao | phòng · sàn | 18 |
| `le_longden` | Đèn lồng ngôi sao | phòng · tường | hộp 20 |
| `le_nguoituyet` | Người tuyết | sân · đất | 21 |
| `le_tuanloc` ×2 | Tuần lộc đèn | sân · đất | 21 |
| `le_banhquy` | Bánh quy + sữa | phòng · sàn (vụn bánh sáng 25) | 23 |

Cây thông dùng `xmastree` có sẵn (tầng 2 `SEASON_KEY`); chưa có thì 1/12 tặng 1 cây (kể cả chưa mở giao diện Giáng sinh).
Tự bày: tủ lịch → ô tường trống của phòng khách (không thì Kho đồ); cây → 2 ô trống gần nhà nhất; người tuyết / tuần lộc → ô trống
(luật bản 5); đồ trong nhà → Kho đồ + "Đặt ▸" (người dùng chọn ô). Hết ô → Kho đồ + một câu nhắc.

### 2.3 Cấu hình
`config.json` thêm `"season_event": true` (+ `config.md`). Không đổi mục cũ. Giả ngày cho người dùng xem trước (mục 6): chỉ khi có
file `user_files/admin`.

### 2.4 Hợp đồng dữ liệu (test)
Khoá collection mới chỉ có `kotoba_batake_le`; `config.json` chỉ thêm `season_event`; các file ngoài danh sách sửa giống hệt
1.35.2; mã 1.31.3 thật mở collection đã có dữ liệu 1.36 (đồ `le_*` ở tầng 3, tường `n_*` đang dùng) → không xoá gì, về 1.36 thấy
lại đủ.

## 3. Python

### 3.1 `le_core.py` (mới, thuần Python, test offline bằng ngày giả)
- `NOEL` — 24 ngăn `{d, kind: cay|nha|san|trong|qua, id, name, desc, item?, balls?}` (bảng ở `KE_HOACH.md`).
- `event_id(day)` → `"noel2026"` trong 15/11–15/1; `phase(day, now)` → `pre` (15–30/11) · `advent` (1–24/12) · `eve`
  (24/12 ≥ 18:00) · `after` (25–31/12) · `pack` (≥ 1/1) · `None`.
- `door_states(ev, day, reviewed_days, reviews_today)` → mỗi ngăn: `open` · `today` · `ready` (ngày đã qua có ôn, chưa mở — ôn
  điện thoại) · `miss` · `tomorrow` (hé bóng) · `future`; `makeup_left` = `min(2, reviews_today // 15) − bu[hôm nay]`,
  `makeup_next` (lượt cần cho ngăn bù kế).
- `open_door(ev, d, day, reviewed_days, reviews_today)` → `{gifts: [món], layer}` hoặc `LeError` ("Ôn thêm 6 lượt nữa để mở
  bù", "Ngăn này mở từ 12/12"…).
- `tree_state(ev)` (quả châu, dây đèn, dây kim tuyến, kẹo gậy, sao), `house_state(ev)` (vòng hoa, mái, hình dán), `yard_level(ev)`
  (0–3), `music_lines(ev)` (số câu đã học = số ngăn đã mở từ ngăn 3, ≤ 24).
- Thiệp: `clean_card`, `card_editable(now)` (tới 18:00 24/12), kiểm điểm ảnh (bảng màu `CRAFT_PALETTE`, như `px_decode_wh`).
- Ông già Noel: `santa_due(ev, now)`, `boxes_open(day)`, `letter(ev, card, lang)` — câu viết sẵn theo Ngôn ngữ trong vườn
  (`lang_core`: lời chào + ký tên theo tiếng; thân thư tiếng Việt), trích điều ước (cắt 120 ký tự), nhắc ≤ 3 món đã bày.
- Hết mùa: `pack_plan(ev, home, decor)` → món gỡ khỏi chỗ đặt (về Kho), tường / sàn trả mẫu cũ; `rebuy_plan` năm sau.
- `clean_le(raw)`, `LeStore` (read / load / write / save / payload gộp hai máy), `view(...)` cho JS.

### 3.2 `garden_core.py`
- `LE_ITEMS` + `TIER3_ITEMS |= LE_ITEMS`; giá 0, `only: "le"` (ẩn khỏi cửa hàng / gánh hàng).
- `GardenState.le_apply(give, place, take, decor, extra)` — một lần lưu: thêm món, tự đặt (`check_spot`), cất món (1/1), tường /
  sàn; lỗi → không đổi gì.
- Hình cây trơn không cần Python. `home_catalog` gửi thêm tên / chỗ của `LE_ITEMS`.

### 3.3 `decor_core.py`
- `NOEL_TILES` (5 mẫu 16 × 16 điểm ảnh, id `n_*`) — `use()` nhận `n_*` khi `kotoba_batake_le` có sở hữu (truyền vào từ
  `__init__`); `catalog_view` / `tiles_view` thêm nhóm "Giáng sinh". Bản cũ gặp `n_*` đang dùng → "Theo kiểu nhà" (không mất sở
  hữu vì sở hữu ở khoá `le`).

### 3.4 `__init__.py`
- `LE = le_core.LeStore(...)` như `EVENTS`; `le_now()` / `le_today()` (giờ máy + ngày Anki; **giả ngày** cho test + admin).
- `le_view(wallet, today_stats)` → `data["le"]` (tắt / ngoài mùa → `None`).
- Việc tự động khi mở vườn (`refresh`, **không** ở `profile_did_open` — tránh ghi trước lần tự đồng bộ): tặng 1/12, đặt cây, cất
  đồ 1/1 (một lần, ghi `keep`).
- `_on_le`: `le:open:<d>`, `le:place:<món>`, `le:shake:<hộp>`, `le:card` (JSON), `le:cardfix` (Gemini, 1 lượt), `le:santa:seen`,
  `le:box:open`, `le:keep:<cat|giu>`, `le:decor:<room>:<slot>:<id>`, `le:sticker` (JSON 8 × 8).
- Tin làng (`event_core`), Lịch hoa ("Mở ngăn 7 · Mái tuyết" trong ô ngày), ⚙ "Sự kiện mùa" (`ui.js` radios → config).
- Ảnh kỷ niệm: đêm 24 lúc cảnh ông già Noel chạy, JS vẽ ảnh sân + trong nhà (như nút chụp ảnh, không hỏi chỗ lưu) → `le:photo`
  ghi file theo hồ sơ.

## 4. JS
- `web/le.js` (`GardenLe`, nạp trước `garden.js`): bảng **tủ lịch** (canvas tủ gỗ như `drawCabinet` của ảnh phác, bấm ngăn →
  `le:open`, hiệu ứng ngăn trượt + lấp lánh + chuông, ngăn mai hé bóng), dòng Hôm nay, chip, hộp quà (lắc: rung + bong bóng chữ),
  thiệp (bảng 2 mặt: giấy 4 kiểu, sticker có sẵn của nhật ký, lưới 16 × 16 — dùng lõi vẽ của Xưởng / mẫu tường), cảnh đêm 24,
  thư + quả cầu tuyết sáng 25, cảnh cất đồ 1/1, phần Kỷ niệm ở Album.
- `web/le_art.js` (`GardenLeArt`, `install(L)` như `finds_art.js`): hình 11 món, tủ lịch nhỏ, áo nhà (nhà gốc đủ; 3 kiểu khác
  viền mái + đèn băng + vòng hoa theo bảng điểm), đèn quấn (`wrapLights`: mép trên hình mỗi 3 cột, rắc trong tán món cao ≥ 28),
  dây võng (móc ống khói + đỉnh món ≥ 30), tuần lộc đèn (viền điểm ảnh), quầng sáng, ông già Noel + xe đáp (`SPR.sleigh`).
- `home.js`: 5 móc ở mục 1 (mỗi móc một dòng `if (typeof GardenLe !== "undefined") …`).
- `music.js`: `musicBox(n)` + bè Silent Night (soạn 8-bit, bản quyền đã hết).
- `garden.css`: lớp `kb-le-*` (theo biến `:root`).

## 5. Hình cần vẽ (vẽ lại cho đẹp — tranh trong ảnh phác là tạm)
Tủ lịch (món tường 16 × 20 + bảng lớn), 11 món, 3 hộp quà, cây trơn (tự dựng), áo nhà gốc + 3 bảng điểm, tuần lộc đèn, người
tuyết, ông già Noel (đứng / cầm thiệp / vẫy), StackChan đội mũ Noel (có sẵn `santa` của Tủ đồ), bánh quy / sữa / vụn bánh,
thiệp 4 giấy, quả cầu tuyết, 5 mẫu tường / sàn 16 × 16. Kho hình trang web (`node site/tools/xuat_hinh.js`) chạy lại sau khi vẽ.

## 6. Ngày giờ, xem trước khi tới tháng 12
- Ngăn theo **ngày Anki** (qua 4h sáng như mọi phần khác); đêm 24 theo **giờ máy** (18:00); hết mùa theo ngày Anki ≥ 1/1.
- **Giả ngày** để người dùng xem trên máy thật trước 1/12 (19–28/11 vẫn là tháng 11): chỉ khi có file `user_files/admin`, ⚙ →
  "Xem thử sự kiện: ngày 1/12 … 1/1" — mọi lệnh `le:*` dùng ngày giả, **không ghi vào khoá thật** (ghi khoá
  `kotoba_batake_le_thu`, xoá khi tắt xem thử). Test Anki thật dùng cùng cơ chế (`zz_kbtest`).

## 7. Trường hợp cần xử lý (sẽ có test)
1. Cài / cập nhật giữa tháng (vd. 10/12): ngăn 1–9 có ôn → mở được ngay; không ôn → mở bù.
2. Ôn ở điện thoại, không mở vườn → ngăn "đã ôn, chờ mở" (không cần mở bù).
3. Hai máy tính cùng mở ngăn / cùng sửa thiệp → hợp; đồng bộ trả lại (`sync_core`) không làm mất ngăn.
4. Máy còn 1.31.3 / 1.35.2 chạy chen: đồ `le_*` giữ ở tầng 3, tường `n_*` về "Theo kiểu nhà" bên đó, về 1.36 thấy lại.
5. Chưa xây nhà / chưa có phòng (dưới bước "Lắp cửa"): tủ lịch + đồ trong nhà vào Kho, vẫn mở ngăn được từ chip / Hôm nay.
6. Sân hết ô: cây / người tuyết / tuần lộc vào Kho + nhắc; dời / cất như đồ thường.
7. Cây `xmastree` đặt ở vùng khác (Bãi biển…) hoặc có 2 cây: mọi cây cùng trạng thái.
8. Nhà kiểu minka / nhà trà / lâu đài: không có mái tuyết vẽ thêm, viền mái theo bảng điểm.
9. Tắt sự kiện giữa tháng → không vẽ / không tặng; bật lại thấy đủ; tắt khi đã cất đồ → không cất lại.
10. Undo lượt ôn sau khi mở ngăn → ngăn vẫn mở (không lấy lại đồ).
11. Đêm 24 không mở vườn → lần đầu mở tới 31/12 vẫn xem; mở lần đầu ngày 2/1 → bỏ cảnh, thư vẫn trong Kỷ niệm.
12. Đổi giờ máy / múi giờ: ngăn chỉ mở khi ngày Anki ≥ ngày ngăn; lùi giờ không mở lại ngăn đã mở.
13. Ngôn ngữ trong vườn tiếng Anh / Trung / Hàn / Đức / Pháp / chỉ tiếng Việt: lời chào, ký tên thư đúng tiếng.
14. Chế độ Dịu mắt / tắt hiệu ứng: không nhấp nháy, không chạy đuổi; ảnh chụp vườn có đèn.
15. Trang trí thử (1.34): đồ `le_*` hiện như đồ thật; bản thử không mua được đồ `only: "le"`.
16. Đọc collection lỗi (`_damaged`) → không ghi, không tặng lại.
17. Năm 2027: `noel2027` mới, tủ 2026 còn nguyên trong Kho, "Bộ Giáng sinh 2026" bày lại được.
18. Collection mới tinh / hồ sơ thứ hai: sự kiện của từng hồ sơ riêng.

## 8. Kiểm thử
- `tests/core/test_136.py`: mọi ngày 15/11 → 2/1 với revlog giả (ngày có / không ôn, điện thoại), mở bù (15 / 30 / 45 lượt, trần
  2), lỗi ghi ở từng khoá (`commit_config`), hai máy gộp ngẫu nhiên có đối chứng (như `test_1333`), mã 1.31.3 / 1.35.2 thật chạy
  chen, hợp đồng dữ liệu, tường / sàn, cất đồ 1/1, năm sau.
- `tests/core/test_136.js`: quấn đèn cho **mọi** món ngoài trời có sẵn + món tự vẽ (không bóng nào ra ngoài hình), ô trống, dây
  võng luôn trên các món, cây trơn đúng từng ngăn, bảng điểm 4 kiểu nhà.
- `tests/anki/e2e_136.js` (Anki thật, giả ngày): 1/12 tặng + tự bày, mở ngăn bằng chuột, ngăn mai hé bóng, mở bù, hộp quà lắc,
  thiệp lưu / sửa / Gemini giả, đêm 24, sáng 25, 1/1 cất đồ, Kỷ niệm, tắt sự kiện; ảnh chụp từng bước → `docs/kiem_thu/1.36/`.
- `run_capnhat.sh` 1.31.3 → 1.36, `run_habanh.sh` (1.36 → 1.31.3 → 1.36), `tests/dong_bo/` (điện thoại ôn → máy tính mở ngăn),
  `run_all.sh` đủ bộ, đóng gói `tests/tools/pack.py`.

## 9. Thứ tự làm, lịch, cắt bớt nếu trễ
| Ngày | Việc | Mức |
|---|---|---|
| 1 | `le_core.py` + `test_136.py` (ngày giả), `LE_ITEMS`, `le_apply`, `LeStore`, cầu nối, giả ngày | P0 |
| 2 | tủ lịch (món + bảng + mở ngăn), dòng Hôm nay / chip / Tin làng, cây trơn → đầy, tự bày | P0 |
| 3 | sân sáng đèn (lớp sáng, quấn đèn, dây võng, ô trống), áo nhà gốc, `test_136.js` | P0 |
| 4 | đồ trong nhà + hộp quà lắc + bánh quy / sữa; thiệp; đêm 24; sáng 25 + thư + quả cầu tuyết | P1 |
| 5 | hộp nhạc học dần, tường / sàn Noel, 3 kiểu nhà khác, Kỷ niệm + ảnh tự chụp, cất đồ 1/1 | P2 |
| 6–7 | `e2e_136.js`, cài đè 1.31.3, hạ bản, đồng bộ thật, báo cáo + danh sách xem trên máy thật | P0 |
| 8 | người dùng xem (giả ngày) → sửa → phát hành 29–30/11 | |

Trễ thì cắt theo thứ tự: StackChan ăn bánh kem (P3) → 3 kiểu nhà khác chỉ có đèn sân → hộp nhạc chỉ phát cả bài đêm 24 → ảnh kỷ
niệm tự chụp (giữ thiệp + thư) → tường / sàn Noel. **Không cắt**: test giữ dữ liệu, cài đè 1.31.3, giả ngày cho người dùng xem.

## 10. Rủi ro
- **Ít thời gian thử trên máy thật**: người dùng chỉ xem được bằng giả ngày; 1/12 là ngày thật đầu tiên → bản vá 1.36.1 nếu cần
  trước 24/12 (đêm 24 là phần dễ lỗi nhất: giờ máy, nhiều màn chào chồng nhau).
- **AnkiWeb**: người dùng cập nhật khi Anki tự kiểm tra (thường lúc mở Anki) — phát hành 29–30/11 thì phần lớn kịp 1/12.
- **Hiệu năng**: lớp sáng vẽ mỗi khung hình; quấn đèn tính sẵn theo bố cục sân (chỉ tính lại khi đồ đổi), bóng đèn ≤ ~400.
- **Tường / sàn khi máy khác còn bản cũ**: gian về "Theo kiểu nhà" bên đó (không mất sở hữu) — ghi vào hướng dẫn.
- **Phiên chat bị chặn** (như pinyin 1.32): không dự kiến, nhưng chia việc nhỏ, đẩy thường xuyên.
