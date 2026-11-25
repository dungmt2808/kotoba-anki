# Trang web chung: Kho hình & Mã cộng đồng

Địa chỉ (sau khi bật ở mục 1): **https://dungmt2808.github.io/kotoba-anki/**

Trang có 6 mục:

| Mục | Có gì |
|---|---|
| **Giáng sinh 2026** (1.36.2) | Sự kiện mùa: lịch (15/11 → 1/1), luật mở ngăn / mở bù, quà kể theo nhóm (Cây · Nhà · Sân · Trong nhà · Hộp quà) — **không nói ngăn nào ra quà gì, không lộ món trong 3 hộp quà bí mật, không tả cảnh tối 24**, cách làm thiệp, **Xem thiệp bạn gửi** (dán mã `KBC1:…` hoặc mở đường dẫn `#thiep/<mã>` → thiệp vẽ ngay trên trình duyệt, tải PNG), nhạc Giáng sinh, hỏi đáp. Từ 15/11 tới hết 31/12 trang mở thẳng mục này (theo ngày trên máy người xem). |
| **Kho hình** | Mọi hình pixel của vườn (343 hình, 16 nhóm: đồ sân, nội thất, đồ vùng, đồ mùa, đồ hiếm, Hộp sưu tầm, quà đủ bộ, gánh hàng rong, thú nuôi, khách, cây & giống cây, StackChan, tường & sàn, nhà, cảnh các vùng, biểu tượng). Tìm được bằng tiếng Việt không dấu / tiếng Nhật. Bấm vào hình: xem lớn, xem từng khung (đi, ngồi, ngủ…), bảng màu, tải PNG ×1 / ×8 / dải khung. |
| **Mã cộng đồng** | Thiết kế người chơi gửi, đã duyệt: món tự làm, vùng tự tạo, giống cây tự vẽ. Nút **Chép mã** → dán vào ô "Dán mã thiết kế" ở tab Xưởng. |
| **Xem mã** | Dán một mã `KB1:…` để xem hình ngay trên trình duyệt (không gửi đi đâu). Có nút "Gửi mã này lên trang". |
| **Gửi thiết kế** | Hướng dẫn lấy mã trong vườn + nút **Gửi qua GitHub** (mở sẵn mẫu issue đã điền mã) hoặc **Gửi qua email** (thư tới email liên hệ của add-on, mã điền sẵn). |
| **Báo lỗi** | Cách lấy báo cáo trong Anki, nút **Báo lỗi qua GitHub** (mẫu issue "Báo lỗi / góp ý"), **Gửi email**, **Xem các lỗi đã báo**, Góp ý hình. |

Từ add-on **1.31.3**: ở tab **Xưởng**, ô "Dán mã thiết kế" có nút **"Mã cộng đồng ▸"**, thẻ "Mã chia sẻ" có **"Gửi lên trang ▸"** (mở trang bằng trình duyệt của máy). Cửa sổ **Tools → ことば畑 · Báo lỗi** có nút **"Gửi qua GitHub…"**: chép báo cáo rồi mở mẫu issue Báo lỗi — người dùng dán vào ô "Báo cáo của add-on".

Hình trong Kho hình **xuất thẳng từ mã của add-on** (không vẽ lại), nên luôn giống trong game.

---

## 1. Bật trang (làm một lần)

1. Gộp nhánh có thư mục `site/` vào `master`.
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions → "Trang web (GitHub Pages)" → Run workflow** (hoặc chờ lần sau có thay đổi trong `site/` trên `master`). Chạy xong, đường dẫn trang hiện ở bước *deploy*.
4. Tạo nhãn duyệt: **Issues → Labels → New label**, tên **`duyet`** (màu tuỳ thích). Nên tạo thêm nhãn **`chia-se`** và **`bao-loi`** — hai mẫu issue tự gắn hai nhãn này (nhãn chưa có thì GitHub bỏ qua), để lọc thiết kế đang chờ / lỗi đã báo; nút "Xem các lỗi đã báo" của trang lọc theo `bao-loi`.

## 2. Duyệt thiết kế người chơi gửi

**Gửi qua GitHub** (issue mẫu "Chia sẻ thiết kế"):

1. Mở issue, chép mã, dán vào mục **Xem mã** của trang để xem hình.
2. Ổn thì **gắn nhãn `duyet`** vào issue (làm được cả trên app GitHub điện thoại).
3. Khoảng 1–2 phút sau: máy kiểm mã bằng đúng hàm của add-on → thêm vào `site/data/cong_dong.json` → trả lời "Đã đăng…" kèm đường dẫn → đóng issue → cập nhật trang (vài phút).
   Mã hỏng / trùng: máy trả lời lý do và gỡ nhãn — người gửi sửa issue (Edit) rồi gắn lại nhãn là được.

**Nhận qua email / Facebook / tin nhắn:**
**Actions → "Đăng mã thiết kế" → Run workflow** → dán mã, tên người vẽ (để trống = Ẩn danh), ghi chú → **Run workflow**. Kết quả xem ở trang tóm tắt của lần chạy.

**Trên máy (hoặc nhờ Claude Code):**

```bash
python3 site/tools/them_ma.py them "KB1:…" --tac-gia "Mai" --ghi-chu "Đèn lồng cá chép"
```

rồi commit + push lên `master`.

## 3. Gỡ một mã

Mỗi mã có id (ở cuối đường dẫn `…/#ma/<id>`, ví dụ `m-1a2b3c4d`).

```bash
python3 site/tools/them_ma.py xoa m-1a2b3c4d
```

```bash
python3 site/tools/them_ma.py danh-sach
```

Hoặc sửa thẳng `site/data/cong_dong.json` trên GitHub: xoá cả khối `{ … }` của mã đó (nhớ dấu phẩy giữa các khối).

## 4. Cập nhật Kho hình khi add-on đổi hình / thêm đồ

```bash
node site/tools/xuat_hinh.js
```

rồi commit `site/data/` + `site/hinh/`. Lệnh này nạp `kotoba_batake/web/*.js` trong Chromium, đọc tên / giá từ Python của add-on, áp cả bản sửa hình gốc `kotoba_batake/mau_sua.json` (nếu có). Từ 1.36.2 cũng sinh `site/data/su_kien.json` (mục Giáng sinh: ngày / luật / 24 ngăn / câu chúc từ `le_core.py`, hình sticker + StackChan đội mũ Noel để vẽ thiệp) và đánh dấu `secret` cho các món trong hộp quà bí mật ở Kho hình (trang hiện hình bóng "Quà bí mật", đường dẫn mã ẩn `bi_mat_N`, tới ngày mở hộp theo ngày trên máy người xem). Quên chạy thì `tests/trang/test_trang.py` báo (bản trong `hinh.json` khác bản trong `manifest.json`).

## 5. Cấu trúc

| File | Việc |
|---|---|
| `site/index.html`, `style.css`, `app.js` | Giao diện (không cần build, chỉ HTML + JS) |
| `site/ve.js` | Vẽ hình pixel, giải mã `KB1:` trên trình duyệt, vẽ vùng tự tạo y như add-on |
| `site/thiep.js` (1.36.2) | Đọc mã thiệp `KBC1:` như `le_core.decode_card`, vẽ mặt trước thiệp y như `web/le_card.js` `drawCard` (test so từng điểm ảnh) |
| `site/data/su_kien.json` | Mục Giáng sinh 2026 (sinh bằng `xuat_hinh.js` — không có món trong hộp quà bí mật) |
| `site/data/hinh.json`, `site/hinh/` | Kho hình (sinh bằng `xuat_hinh.js`) |
| `site/data/thong_tin.json` | Bản add-on, email liên hệ, bảng màu + giá của Xưởng (sinh bằng `xuat_hinh.js`) |
| `site/data/cong_dong.json` | Mã cộng đồng đã duyệt (sửa bằng `them_ma.py` hoặc tay) |
| `site/tools/` | Công cụ (không đưa lên trang): `xuat_hinh.js`, `xuat_ten.py`, `them_ma.py` |
| `.github/ISSUE_TEMPLATE/chia_se_thiet_ke.yml` | Mẫu issue "Chia sẻ thiết kế" |
| `.github/ISSUE_TEMPLATE/bao_loi.yml`, `config.yml` | Mẫu issue "Báo lỗi / góp ý"; trang chọn mẫu có đường dẫn tới trang web |
| `kotoba_batake/diag.py` (`SITE_URL`, `REPO_URL`, `ISSUE_BUG_URL`, `SITE_PARTS`) | Đường dẫn add-on dùng để mở trang — đổi repo thì sửa ở đây và `REPO` trong `site/app.js` (test so hai chỗ) |
| `.github/workflows/dang_ma.yml` | Gắn nhãn `duyet` / chạy tay → đăng mã |
| `.github/workflows/trang_web.yml` | Đưa `site/` lên GitHub Pages |
| `tests/trang/` | Test: `test_trang.py` (Python) + `kiem_tra_trang.js` (Chromium) — đã có trong `tests/run_all.sh` |

## 6. Giới hạn hiện tại

- Mã chia sẻ chỉ có cho **món tự làm, vùng tự tạo, giống cây tự vẽ** (như add-on). Đồ mặc tự vẽ cho StackChan và mẫu tường / sàn tự vẽ chưa có mã.
- Trang không có tài khoản, không có bình luận / thích: mọi người xem + chép mã; gửi qua GitHub cần tài khoản GitHub (không có thì gửi email).
- Kho hình là ảnh lúc trời trong, chưa đặt đồ (không có thời tiết, ban đêm, hiệu ứng động ngoài các khung hình).
- Tên tác giả hiện đúng như người gửi ghi (đã làm sạch ký tự lạ); ngày là ngày duyệt.
