# Thêm bản dịch tiếng Việt cho các số báo cũ (chạy một lần, khi cần)

Từ bản 2.3, mỗi số báo có bản dịch tiếng Việt ẩn sẵn (trường `dich`). Các số viết bằng bộ cũ chưa có. Nhiệm vụ này chỉ **thêm** bản dịch cho số cũ, không sửa gì khác.

Thư mục làm việc là thư mục tiếng Nhật; mọi file nằm trong `kotoba_daily/`. Chạy script theo dạng `python3 kotoba_daily/tools/<tên>.py ...`, đường dẫn số báo tính từ `kotoba_daily/`.

1. Liệt kê `kotoba_daily/bao/*/bao.json` (`ls kotoba_daily/bao`). Với từng số, mới nhất trước, tối đa 10 số mỗi lần chạy:
   - Chạy `python3 kotoba_daily/tools/kiemtra.py --chi-dich bao/<ngày>/bao.json`. In `OK` thì số đó đã có bản dịch, bỏ qua.
   - Còn lỗi: đọc số báo, thêm `dich` cho từng bài trong `bai` theo đúng quy tắc ở mục "Bản dịch tiếng Việt (`dich`)" của `kotoba_daily/prompts/bao_hang_ngay.md` (mỗi đoạn một bản, cùng thứ tự, tên riêng viết Latin, không có chữ Nhật). Đặt `dich` ngay sau `doan` của bài đó.
   - Không sửa `doan`, `tieu_de`, câu hỏi, chép chính tả hay bất kỳ trường nào khác, kể cả khi thấy chỗ chưa hay: số cũ đã có người đọc, có tiến độ và audio theo đúng chữ đó.
   - Chạy lại `kiemtra.py --chi-dich` đến khi `OK` (tối đa 3 lần), rồi `python3 kotoba_daily/tools/render.py bao/<ngày>/bao.json` để trang `bao.html` có nút Dịch.
2. Kết thúc bằng một câu: đã thêm bản dịch cho những số nào, còn bao nhiêu số chưa có (chạy lại nhiệm vụ này để làm tiếp).

Giới hạn: chỉ ghi vào `kotoba_daily/bao/`. Không xoá file. Lệnh được chạy: `ls`, `python3 kotoba_daily/tools/*.py`.
