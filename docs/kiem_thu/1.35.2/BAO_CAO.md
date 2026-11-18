# Báo cáo 1.35.2 — sửa lỗi audit 18/11 + Bắt đầu truyện mới (18/11/2026)

Người dùng: "[audit/release-review-1.35.1-2026-11-18] Sửa các lỗi tìm ra ở nhánh này, xem có đúng không. sau đó hiện thực
tính năng reset báo nhé. vì bây giờ thêm ngôn ngữ mới nên tớ nghĩ cần reset báo. test lại khi làm xong"

Làm trên nhánh `claude/addon-review-new-languages-y9hrzh` (gộp nhánh audit vào trước — chỉ thêm báo cáo
`docs/kiem_thu/audit-1.35.1-2026-11-18/BAO_CAO.md`). **Không thêm khoá collection, không thêm mục config.json** (test so với
1.35.1). Thư mục báo có thêm file `user_files/bao_chung/bat_dau_lai.json` + thư mục `truyen_cu/` khi bấm Bắt đầu truyện mới
(chỉ trên máy này, như mọi file báo). **Cách sửa + cách làm tính năng Claude chọn, người dùng chưa xem.**

## 1. Lỗi của nhánh audit — có đúng không?

**Cả 15 lỗi đều đúng.** Cách kiểm: viết test tái hiện đúng thao tác của báo cáo, chạy trên mã 1.35.1 (commit `097f378`) → đỏ;
trên mã 1.35.2 → xanh. Ngoài ra thấy thêm 2 chỗ khi làm (mục 1.4).

| # | Mức | Lỗi (audit) | Đúng? Tái hiện trên mã 1.35.1 | Sửa |
|---|---|---|---|---|
| 01 | P1 | Trang trí thử: lần **đọc** file bản thử đầu tiên lỗi → coi như kho trống, ghi đè → mất bản thử các ô / cảnh khác (cả khi chỉ bấm chuyển ô) | Đúng: còn mỗi `yard [3]` (đúng như đoạn tái hiện của audit); bấm chuyển ô cũng ghi kho trống | `draft_load` phân biệt "chưa có file" (trống) với "có file mà không đọc được" (`HomeError`) → lệnh lưu / chuyển ô / đọc báo lỗi, không ghi gì; trang giữ bản đang thấy |
| 02 | P1 | Bỏ chọn báo Đức khi đang viết bài tiếng Đức → lần lưu sau chuyển bài sang tiếng Trung, cắt ở 60 ký tự | Đúng (soát mã + Anki thật) | Lưu giữ đúng tiếng của ô đang viết (trang hiện theo tiếng đã lưu) |
| 03 | P1 | Bấm đổi tiếng trong Luyện viết → cắt bài ngay, không hỏi, đổi lại không lấy lại được | Đúng | Bài dài hơn giới hạn của tiếng mới → **hỏi trước** ("Đổi sang Tiếng Trung? … Muốn giữ nguyên bài thì bấm Huỷ"); Python không cắt nếu lệnh không kèm `:cut` (trang cũ / bấm trước khi hỏi) |
| 12 | P1 | Lịch hoa đang mở + File → Import .colpkg / đồng bộ mang về bản khác → ô vẫn hiện bản cũ, gõ tiếp là ghi bản cũ đè bản vừa nhận (máy B nhận lại chữ cũ của máy A) | Đúng (Anki thật: nhập .colpkg + đồng bộ) | (1) đồng bộ / nhập xong → bỏ chữ cũ đang chờ lưu nốt, Lịch hoa đọc lại và **so ba bên**: ô collection không đổi → giữ chữ đang gõ dở (lưu tiếp); ô vừa đổi → hiện bản mới, chữ gõ dở báo lại một dòng. (2) mỗi lần lưu gửi kèm "chữ lúc bắt đầu sửa" — collection đã khác thì **không ghi đè** (chặn cả lần tự lưu tới ngay sau đồng bộ — Claude tìm thấy khi chạy kịch bản) |
| 13 | P1 | Nhờ Gemini sửa khi lần lưu bài mới lỗi → gửi **bài cũ**, khoá bài, mất lượt của ngày | Đúng | Nút gửi kèm chữ đang thấy; Python lưu trước, lưu không được thì **không gửi**, báo "Chưa lưu được bài vừa viết nên chưa gửi (không tính lượt)"; ô giữ câu mới, chưa khoá |
| 04 | P2 | Chữ có dấu viết tách (NFD — "é" = e + dấu) / Hangul tách nét: 30 từ Pháp chỉ giữ 10, 20 cụm Hàn giữ 12 | Đúng: Python đếm 90 từ, trang đếm 90 | Đổi về chữ dựng sẵn (NFC) khi đếm / cắt / lưu (Python + trang, ô tự đổi khi gõ / dán, giữ con trỏ) |
| 05 | P2 | Deck tiếng Đức có trường nghĩa "Chinese" → cây hiện 狗 猫 书 (tiếng Trung); deck Pháp có trường "한국어" → tiếng Hàn | Đúng: `zh`, `ko` | Chữ của note là chữ Latin mà chỉ có **trường** tên Chinese / 中文 / 한국어 → theo chữ (Đức / Pháp / Anh). Vẫn tin tên loại note (Mandarin…), trường pinyin / hanzi / hangul / romaja — deck Trung / Hàn thật (cả deck để pinyin ở trường đầu) không đổi |
| 06 | P2 | Điền vào câu che ", le ch" thay vì "le chat" khi câu nhập bằng mã HTML dấu tách (`Apre&#x300;s`) | Đúng | Cắt câu trên chữ NFC như bộ tìm |
| 07 | P2 | Nhật ký viết trước lượt ôn đầu tiên: kệ không có cuốn tháng đó | Đúng | Kệ thêm mọi tháng có nhật ký / luyện viết |
| 08 | P2 | Bộ đệm tra từ báo Đức / Pháp: lần thứ 20.001 → `KeyError` | Đúng | Dọn bộ đệm trước khi thêm (không dọn mất khoá vừa thêm) |
| 14 | P2 | Sang ngày mới đúng lúc đang chờ tự lưu → chữ gõ trước lúc đổi ngày mất, ô vẫn cho gõ mà không lưu được | Đúng | Sang ngày → lưu nốt chữ đang chờ vào ngày cũ (bài hôm qua còn nhận lần lưu cuối, không gửi sửa được nữa), Lịch hoa đọc lại: ô ngày cũ khoá, báo "Đã sang ngày mới — chữ đang gõ đã lưu vào ngày 18/11." |
| 09 | P3 | Luyện viết tiếng Đức không tô chỗ sửa viết hoa (hund → Hund) | Đúng: 0 chỗ tô | Tiếng Đức so cả hoa / thường (Anh / Pháp như cũ) |
| 10 | P3 | Hai báo cùng ngày: "đọc số 1 · chép đúng 0 / 2 câu · đọc số 1 · …" không biết báo nào | Đúng | "báo tiếng Đức: đọc số 1 · chép đúng 0 / 2 câu; báo tiếng Pháp: …" (một báo trong ngày: như cũ) |
| 11 | P3 | README: luyện viết chỉ ghi Nhật / Anh | Đúng | README + `docs/ANKIWEB.md` ghi 6 tiếng (cả câu mở đầu và bước chọn báo) |
| 15 | P3 | Cảnh báo đỏ "Chưa lưu được" còn sau khi lưu lại được | Đúng | Lưu lại được → "Đã lưu." |

Phụ thuộc mạng của 2 kịch bản test (audit mục "Độ tin cậy của các bài Gemini giả"): đúng — hồ sơ mới chưa có danh sách model
thì `fix_start` hỏi Gemini thật trước hàm giả. `e2e_qa1351.js` / `e2e_120.js` nay thay luôn danh sách model.

### 1.4 Thấy thêm khi làm

- **Lần tự lưu tới ngay sau đồng bộ** (kịch bản 12b): chữ gõ < 0,8 giây trước khi đồng bộ xong vẫn ghi đè bản vừa nhận → sửa
  bằng "chữ lúc bắt đầu sửa" (mục 12 (2)). Lúc đóng cửa sổ cũng vậy: chữ chờ lưu nốt mà ngày đó vừa đổi ở chỗ khác thì không
  ghi đè (ghi vào nhật ký lỗi để cứu tay).
- Dòng Báo của Lịch hoa ghi "tiếng Anh" cả khi hôm đó chỉ đọc một báo (đếm báo đã đọc ở mọi ngày) → chỉ ghi tên khi hôm đó đọc
  từ 2 báo.

## 2. Bắt đầu truyện mới ("reset báo")

**Chỗ bấm:** vườn → Báo → tab **Nguồn báo** → **Tuỳ chọn thêm** → dòng **Truyện dài kỳ** ("đang ở kỳ N") → **Bắt đầu
truyện mới** → hộp hỏi → **Bắt đầu truyện mới**.

**Làm gì:** mọi báo (Nhật, Anh, Trung, Hàn, Đức, Pháp, Việt) cùng kể **một truyện mới từ kỳ 1** — người mới đọc báo tiếng
Đức / Pháp không phải vào giữa truyện kỳ 40.

| Thứ | Sau khi bắt đầu lại |
|---|---|
| Bộ nhớ truyện chung (`user_files/bao_chung/`: truyện, mạch đợt, Sổ tay làng, tóm tắt mọi kỳ, tin làng, bản gốc mỗi ngày) | **Cất** (không xoá) vào `bao_chung/truyen_cu/<ngày>_<n>/` |
| Số báo cũ ở Kệ báo, tiến độ đọc / chép | Giữ nguyên |
| Số báo (số 1, 2…) của từng báo | Đánh tiếp (không về số 1 — Kệ báo không có hai "số 1") |
| Xu, gói báo, trình độ, deck lấy từ, chủ đề truyện | Không đổi |
| Hôm nay **chưa** có số báo nào | Số tới là kỳ 1 |
| Hôm nay **đã** có số báo (bản gốc hôm nay đã viết) | Bản gốc hôm nay giữ lại: báo còn lại hôm nay kể **cùng kỳ** với báo đã đọc; truyện mới từ **số ngày mai**. Kỳ đó ghi vào thư mục cất (không lẫn vào truyện mới) |
| Nhận xét Hay / Nhạt ở số cũ | Ghi vào truyện cũ (thư mục cất), không lẫn vào truyện mới |
| Truyện cũ của từng báo (bản ≤ 1.25.1) | Không bị chép về (`truyen.json` rỗng chặn `migrate_story`) |
| Báo Claude Code (kotoba_daily) | Kỳ Claude đăng trước lúc bắt đầu lại không chép về; kỳ sau đó đánh số nối truyện mới. Truyện riêng của Claude (`truyen.md`) **không** tự bắt đầu lại |

**Lấy lại truyện cũ:** khi truyện mới **chưa có kỳ nào**, dòng Truyện dài kỳ có nút **Lấy lại truyện cũ** (trả mọi file về chỗ
cũ, báo viết tiếp kỳ N+1). Đã có kỳ 1 thì không lấy lại được (tránh lẫn hai truyện) — truyện cũ vẫn nằm ở thư mục cất.

**An toàn:** khoá khi Gemini đang viết báo (như các lựa chọn khác của báo); bấm hai lần không cất thêm một truyện rỗng; lỗi
ghi file giữa chừng → mọi file về chỗ cũ, báo "Chưa cất được truyện cũ … truyện giữ nguyên". Mã 1.31.3 đã phát hành (máy
khác / quay về bản cũ) chạy trên thư mục đã bắt đầu lại: không kéo truyện cũ về, viết tiếp đúng kỳ.

**Lưu ý:** thư mục báo dùng chung mọi hồ sơ Anki trên máy (như câu hỏi R01 còn ngỏ) → bắt đầu lại là truyện của mọi hồ sơ trên
máy này. Máy khác có truyện riêng (bộ nhớ truyện không đồng bộ — như trước).

## 3. Kiểm thử

| Bộ | Kết quả |
|---|---|
| `core/test_1352.py` (mới) | **68/68**; trên mã 1.35.1: lỗi 01, 04, 05, 06, 07, 08, 09, 10 + soát mã 02/03/12/13/14/15 + phần B **đỏ** |
| `anki/e2e_1352.js` (mới, Anki 26.9.4 thật) | **33/33** — 02, 03 (hộp hỏi, Huỷ, lệnh cũ), 12a (Import .colpkg thật), 12b (đồng bộ: giữ chữ gõ dở / báo lại khi cùng ô vừa đổi / lần lưu tới sau đồng bộ), 13 (hai lần ghi lỗi), 15, 14 (sang ngày), 01 (một lần đọc lỗi qua `_on_draft`), B (Nguồn báo → Bắt đầu truyện mới → khoá khi đang viết → Lấy lại) |
| Toàn bộ test có sẵn + gói cuối | xem mục 4 |

Ảnh: `docs/kiem_thu/1.35.2/` — `hoi_doi_tieng.png` (hỏi trước khi đổi tiếng cắt bài), `truyen_dai_ky.png` (dòng Truyện dài
kỳ), `hoi_truyen_moi.png` (hộp hỏi), `da_bat_dau_lai.png` (sau khi bấm), `dong_bo_lich_hoa.png` (chữ gõ dở báo lại).

## 4. Kết quả gói cuối

Chạy trên gói `kotoba_batake.ankiaddon` 1.35.2 đã giải nén (đúng thứ người dùng cài), Anki 26.9.4:

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` (offline + collection thật + máy chủ đồng bộ thật + trang web) | **69 bộ — TẤT CẢ OK** (gồm `test_1352` 68/68, `test_1351` 47/47, đồng bộ 172/172…) |
| `e2e_1352` (mới) | 33/33 |
| `e2e_qa1351` (tập dượt QA 4 tiếng + luyện viết) | 39/39 |
| `e2e_120` (Lịch hoa, nhật ký, luyện viết Nhật / Anh, Gemini giả) | 103/103 |
| `e2e_1351` (Trang trí thử lúc đồng bộ, Như cảnh thật hỏi trước) | 35/35 |
| `e2e_135` (tiếng Đức / Pháp, báo) | 60/60 |
| `e2e_134` (Trang trí thử, bảng ôn, cây deck) | 87/87 |
| `e2e_1332` (khoá lựa chọn báo khi đang viết) | 36/36 |
| `e2e_1331` (Import .colpkg khi vườn mở) | 43/43 |
| `e2e_133` (báo Trung / Hàn) | 77/77 |
| `e2e_123` | 66/66 |
| `e2e_1303` (bấm bừa 500 phím / 300 chuột, đổi cỡ cửa sổ, tương phản) | 49/49 |
| `run_capnhat.sh` — cài đè 1.31.3 (gói đã phát hành `e64eb22`) → 1.35.2 bằng trình quản lý add-on | 19/19 |
| `run_habanh.sh` — 1.35.2 → 1.31.3 → 1.35.2 | 26/26 |
| `dong_bo/run_e2e.sh` (`e2e_1312`, máy chủ đồng bộ thật + "điện thoại") | **47/47** (audit: 46/47 — ca đọc thông báo sớm) |
| **Đối chứng**: `e2e_1352` trên mã 1.35.1 | lỗi 02 tái hiện y như audit (bài tiếng Đức còn 14 từ, mở lại "60 / 60 ký tự"), lỗi 03 không có hộp hỏi → kịch bản dừng; các lỗi còn lại tái hiện ở `test_1352` (đỏ trên mã 1.35.1) |

Trước khi sửa, 3 test cũ chỉ soát chữ trong mã phải chỉnh theo mã mới: `test_1303` (thứ tự hai dòng trong `_check_day` — giữ
nguyên thứ tự, việc mới đặt sau), `test_1332` (`AI_LOCKED` thêm 2 lệnh), `test_1351` (manifest ≥ 1.35.1); trang web xuất lại
hình theo bản 1.35.2 (`node site/tools/xuat_hinh.js`). `e2e_1312` (đồng bộ qua giao diện Anki): audit ghi trượt 1 ca vì đọc
thông báo ở 500 ms trong khi thông báo xếp hàng tới sau ~1,2 giây → kịch bản nay chờ tối đa 5 giây.

## 5. Cần thử trên máy thật

`docs/kiem_thu/1.35.1/QA_MAY_THAT.md` mục **G** (mới): Bắt đầu truyện mới / Lấy lại truyện cũ, đổi tiếng Luyện viết hỏi trước.
