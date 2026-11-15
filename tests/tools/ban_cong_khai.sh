#!/bin/bash
# ban_cong_khai.sh [THU_MUC_RA] — dựng bản sạch cho repo công khai mới (15/11, người dùng chọn "cách A": repo cũ đổi tên +
# để riêng tư, repo mới cùng tên `kotoba-anki` chỉ có bản hiện tại, không mang lịch sử — lịch sử cũ còn file PDF giáo trình).
#
# Lấy đúng các file đang theo dõi ở HEAD (git archive), bỏ dữ liệu riêng của người dùng trong kotoba_daily/ (trích từ giáo trình
# có bản quyền, báo + giọng đọc VOICEVOX, tiến độ học), rồi tạo một repo git mới một commit ở THU_MUC_RA (nhánh master).
# Không đụng tới thư mục làm việc hiện tại. Kiểm: không còn file giáo trình / PDF, test không cần lịch sử git
# (tests/core/ma_cu.py lấy bản add-on cũ từ tests/fixtures/ban_cu/).
# Đẩy lên (sau khi đã tạo repo mới trống trên GitHub):  git -C THU_MUC_RA push -u <url repo mới> master
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT=${1:-/tmp/kotoba-anki-cong-khai}
rm -rf "$OUT"; mkdir -p "$OUT"
git -C "$ROOT" archive HEAD | tar -x -C "$OUT"
cd "$OUT"
rm -rf kotoba_daily/bao kotoba_daily/pham_vi.json kotoba_daily/tien_do.json kotoba_daily/lich_su.md kotoba_daily/truyen_chung.json
find kotoba_daily/nguon -mindepth 1 -maxdepth 1 ! -name README.md -exec rm -rf {} +
# kiểm lần cuối: không có PDF / thư mục giáo trình / dữ liệu trích theo chương sách
BAD=$(find . -iname "*.pdf" -o -ipath "*giao_trinh*" -o -ipath "./kotoba_daily/nguon/*/*" | head -5)
if [ -n "$BAD" ]; then echo "CÒN FILE KHÔNG ĐƯỢC CÔNG KHAI:"; echo "$BAD"; exit 1; fi
git init -q -b master
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-$(git -C "$ROOT" config user.name || echo kotoba-anki)}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-$(git -C "$ROOT" config user.email || echo noreply@example.com)}" \
    commit -q -F - <<MSG
ことば畑 — bản công khai đầu tiên (add-on 1.31.3)

Repo làm lại từ bản 1.31.3, không mang lịch sử của repo phát triển cũ.
Không kèm dữ liệu riêng của bộ kotoba_daily (trích từ giáo trình, báo +
giọng đọc, tiến độ học); bản add-on cũ cho test ở tests/fixtures/ban_cu/.
${MSG_THEM}
MSG
echo "Bản sạch: $OUT ($(git ls-files | wc -l) file, $(du -sh --exclude=.git . | cut -f1))"
