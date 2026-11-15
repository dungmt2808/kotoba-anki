# Chuyển sang repo công khai mới (cách A, chọn 15/11)

> **Đã làm xong 15/11**: repo cũ → `dungmt2808/kotoba-anki-cu` (riêng tư); repo `dungmt2808/kotoba-anki` mới nhận bản sạch làm commit
> đầu. Phần dưới giữ lại để biết đã làm gì / làm lại khi cần.

**Vì sao**: lịch sử git của repo `kotoba-anki` hiện tại còn **file PDF giáo trình GUNGUN** (commit `86ee0dd`, đã xoá khỏi thư mục ở
`8d933b3` nhưng vẫn tải lại được từ lịch sử). Cách A: repo cũ đổi tên + để **riêng tư** (giữ nguyên toàn bộ lịch sử cho bạn),
repo mới **cùng tên** `kotoba-anki` công khai, chỉ có bản hiện tại — một commit, không lịch sử. Địa chỉ trang web
(`dungmt2808.github.io/kotoba-anki`), link trong add-on, README, mô tả AnkiWeb **giữ nguyên**.

Repo mới **không kèm** dữ liệu riêng của bộ `kotoba_daily`: `nguon/` (trích từ sách), `bao/` (báo + giọng đọc VOICEVOX),
`pham_vi.json`, `tien_do.json`, `lich_su.md` — `.gitignore` bỏ qua các file này. Bản dựng bằng `tests/tools/ban_cong_khai.sh`
(kiểm không còn PDF / thư mục giáo trình; toàn bộ test chạy được không cần lịch sử git).

> **Nếu bạn đang dùng bộ `kotoba_daily` (báo Claude Code) trên máy**: thư mục đó có thể là bản clone của repo cũ. **Đừng** đổi
> remote / `git pull` repo mới vào thư mục đó — git sẽ xoá báo, dữ liệu giáo trình, tiến độ trên máy. Muốn làm việc với repo mới
> thì clone vào **thư mục khác**; thư mục cũ cứ dùng như cũ.

## Các bước (làm liền một lượt, ~5 phút — giữa bước 1 và 3 trang web / link tạm không vào được)

1. **Đổi tên repo cũ**: GitHub → repo `kotoba-anki` → **Settings → General → Repository name** → `kotoba-anki-cu` → **Rename**.
2. **Để riêng tư**: cùng trang Settings, kéo xuống **Danger Zone → Change repository visibility → Make private**.
3. **Tạo repo mới**: <https://github.com/new> → tên **`kotoba-anki`**, **Public**, **không** tick "Add a README", .gitignore,
   license (repo phải trống) → **Create repository**.
4. **Cho Claude vào repo mới** (chỉ cần nếu GitHub App "Claude" cài cho *Only select repositories*): <https://github.com/settings/installations>
   → Claude → **Configure** → Repository access → thêm `kotoba-anki` (repo mới).
5. **Nhắn Claude "đẩy lên"** → Claude chạy `tests/tools/ban_cong_khai.sh` rồi đẩy nhánh `master` lên repo mới.
   (Nếu máy của Claude chỉ được đẩy nhánh `claude/…`: Claude đẩy nhánh đó, bạn vào **Settings → General → Default branch**,
   đổi tên nhánh mặc định thành `master`.)
6. **Bật lại trên repo mới**:
   - **Settings → Pages → Source: GitHub Actions**; rồi **Actions → "Trang web (GitHub Pages)" → Run workflow**.
   - **Issues → Labels**: tạo `duyet`, `chia-se`, `bao-loi`.
7. **Kiểm**: trang <https://dungmt2808.github.io/kotoba-anki/> mở được; ảnh trong README hiện; mở
   `https://github.com/dungmt2808/kotoba-anki/commits/master` thấy đúng **một** commit.

## Repo cũ `kotoba-anki-cu` (riêng tư) dùng làm gì

- **Kho lưu trữ**: toàn bộ lịch sử phát triển trước 15/11 (mọi commit, PR #1 – #31, báo cáo kiểm thử) — tra lại thay đổi cũ,
  lấy lại bản add-on cũ bất kỳ (`git archive <commit> kotoba_batake`). Repo riêng tư miễn phí, **không nên xoá**.
- **Dữ liệu riêng của bộ `kotoba_daily`** (giáo trình trích, báo + giọng đọc, tiến độ) vẫn nằm ở đó và trong thư mục trên máy.
- **Không phát triển tiếp ở đó**: mọi thay đổi add-on / trang web làm ở repo mới. Muốn tránh nhầm thì Settings → General →
  **Archive this repository** (chỉ đọc, gỡ archive lại được).
- **Không bao giờ** đẩy nhánh / commit của repo cũ sang repo mới (lịch sử cũ còn file PDF giáo trình).

## Sau đó

- Phiên Claude Code sau làm việc với repo mới (cùng tên nên không phải đổi gì). Lịch sử cũ ở `kotoba-anki-cu` (riêng tư).
- Còn chọn **giấy phép** (LICENSE) — chưa có thì người khác chỉ được xem mã, không được dùng lại.
- Đăng AnkiWeb: `docs/ANKIWEB.md`.
