# Kiểm tra ことば畑 1.23.0 — 07/11/2026

Kiểm tra lần cuối sau khi làm bản 1.23.0 (người dùng: "sau khi làm xong kiểm tra lại giao diện, logic, tính năng lại lần cuối"). Anki thật chạy không cửa sổ (Qt offscreen) trong Claude Code trên web, điều khiển bằng CDP; hồ sơ thử mới cho từng kịch bản, không dùng collection học thật.

## 1. Kết quả

| Bộ | Anki 26.9.4 | Anki 23.10.1 (Qt 6.6) |
|---|---|---|
| `tests/run_all.sh` (offline, cả phần cần gói `anki`, có `core/test_123.py` mới) | TẤT CẢ OK | — |
| `e2e_123.js` (mới: báo, KB-01/02/03, giao diện tối, Ngắm cảnh, bản dịch) | **74/74** → KQ_123 | KQ_123_2310 |
| `e2e.js` · `e2e_tour.js` · `e2e_114` · `e2e_115` · `e2e_116` · `e2e_117` · `e2e_118` · `e2e_119` | 24/24 · 12/12 · 34/34 · 21/21 · 15/15 · 55/55 · 29/29 · 55/55 | `e2e_tour` 12/12 |
| `e2e_120` · `e2e_121` · `e2e_122` · `e2e_1223` · `e2e_1226` · `e2e_1228` | 103/103 · 46/46 · KQ_122 · 49/49 · 40/40 · 26/26 | `e2e_1226` KQ_1226_2310 · `e2e_1228` KQ_1228_2310 |
| `audit_edge.js` (ít xu, bấm đúp, cửa sổ nhỏ) · `audit_full.js` (1.000.000 xu, mua / dùng mọi thứ) | 58/58 · 180/180 | — |

- `e2e_116` còn 15 kiểm tra (trước 18): bỏ 3 kiểm tra giao diện "Đêm vườn" đã xoá theo yêu cầu.
- Lần chạy đầu `e2e_122` trượt 1/64: nút **Ngắm** mới làm thanh trên của bảng Nhà tràn ở cửa sổ 1024 px → chuyển nút xuống góc khung xem, chạy lại (bảng trên).

## 2. Ba lỗi của báo cáo 06/11 (nhánh `audit/addon-1.22.8-2026-11-06`)

| Mã | Lỗi | 1.23.0 (kiểm trong `e2e_123.js`, Anki thật) |
|---|---|---|
| KB-01 | Gõ nhật ký / luyện viết rồi bấm X ngay → mất phần vừa gõ | Mở lại vẫn còn "NHẬT KÝ ĐÃ LƯU DÒNG VỪA VIẾT" và bản nháp "いい天気です。" |
| KB-02 | Hồ sơ Anki mới nhận xu / nhà của hồ sơ khác | Hồ sơ mới: 0 xu, chưa có nhà, không có tiến độ báo; quay về hồ sơ cũ ví còn nguyên |
| KB-03 | Ôn rồi Undo lặp lại vẫn được cộng xu | 3 vòng ôn + Undo: xu, số lần tưới, revlog về đúng như trước (1.22.8: +9 xu) |

## 3. Ảnh trước / sau (1.22.8 ↔ 1.23.0)

Chụp bằng `tests/anki/shots_123.js` trên cả hai bản, ghép bằng `tests/tools/compare_shots.py … 123`.

![Chậu cây ở bảng ôn lúc 22 giờ](a_chau_cay_toi.png)

![Bảng Giao diện: bỏ Ôn buổi tối, thêm Màn chính](b_kieu_giao_dien.png)

![Thẻ Gemini: bỏ Giáo trình](c_the_gemini.png)

![Số Gemini cũ: bấm 学生 ra nghĩa](d_tra_nghia.png)

![Kệ báo gộp hai nguồn](e_ke_bao.png)

![Ngắm cảnh](f_ngam_canh.png)

Thêm (chỉ bản mới): [chờ "Bắt đầu viết" khi chuyển sang Gemini](123_01_cho_bat_dau_viet.png) · [bản dịch](123_05_ban_dich.png) · [Sắp xếp đồ trên khung lớn](123_12_sap_xep_do.png) · [màn chính cỡ Lớn](123_13_man_chinh_co_lon.png).

## 4. Truyện Gemini thật (`tests/gemini/run_story.py`)

KQ_TRUYEN

## 5. Chưa kiểm / giới hạn

- Windows / macOS, máy thật có loa, đồng bộ AnkiWeb giữa hai máy thật: chưa chạy (như các bản trước).
- Anki 23.10.1 chạy với Python 3.13 (bộ cài thật dùng 3.9); cú pháp Python 3.9 kiểm bằng `ast.parse(feature_version=(3, 9))`.
- Gemini thật trong môi trường test đi qua proxy hay báo "máy chủ bận" (503) / cắt luồng: số lượt gọi và thời gian ở mục 4 cao hơn máy người dùng.
- Nhà 3 gian (Bếp · Phòng ngủ) chưa làm: để 1.24 (`KE_HOACH_1_24.md`).
