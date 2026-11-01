# Nhiệm vụ: trích một chương giáo trình thành `nguon/<giáo trình>/<chương>.json`

Mọi đường dẫn tính từ thư mục `kotoba_daily/`. Chương cần trích là các dòng `THIẾU` mà `python3 tools/pham_vi.py` in ra (hoặc chương người dùng chỉ định).

## Tìm nguồn

1. Mở `lo_trinh.json`, tìm giáo trình có `id` tương ứng. Trường `thu_muc` là thư mục chứa PDF (tính từ thư mục tiếng Nhật, tức thư mục cha của `kotoba_daily/`).
2. Tìm file của đúng chương đó (tên file thường có số chương, ví dụ `CHƯƠNG_29`). Nếu không chắc file nào, liệt kê thư mục rồi chọn file có số chương khớp. Không tìm thấy thì dừng chương đó và ghi lý do.
3. Nếu dự án đã có sẵn file từ vựng trích cho Anki của chương này (do công cụ trích từ vựng trước đó tạo), dùng lại phần từ vựng đó cho khớp với thẻ Anki, chỉ đổi sang định dạng dưới đây.

## Định dạng

Xem file mẫu `nguon/gungun_n4/29.json`. Cấu trúc:

```json
{
 "giao_trinh": "<id giáo trình, đúng như lo_trinh.json>",
 "chuong": 29,
 "chu_de": "<một dòng tiếng Việt tóm tắt chủ đề ngữ pháp của chương>",
 "tu_vung": [ {"w": "発表会", "r": "はっぴょうかい", "m": "buổi trình diễn"} ],
 "ngu_phap": [ {"id": "29-1", "mau": "Vさせてください", "nghia": "Hãy để tôi V", "vi_du": "その仕事、私にやらせてください。"} ],
 "kanji": [ {"k": "作", "hv": "TÁC"} ]
}
```

Quy tắc:

- `tu_vung`: lấy toàn bộ phần 語彙 của chương (mọi phần A, B, …). `w` viết đúng dạng từ điển như trong sách, giữ `〜` nếu sách có (`〜名`). Động từ nhóm III ghi kèm する (`発表する`). `r` là cách đọc bằng hiragana; từ chỉ có kana (katakana hoặc hiragana) thì để `""`. `m` là nghĩa tiếng Việt ngắn gọn.
- `ngu_phap`: mỗi mẫu câu trong phần 文型 là một mục. `id` dạng `<chương>-<số thứ tự>`. `mau` là công thức ngắn như sách viết. `nghia` là nghĩa và cách dùng bằng tiếng Việt, một câu. `vi_du` là **một câu ví dụ ngắn do bạn tự đặt**, không chép câu trong sách. Nếu chương có bảng dạng đặc biệt (ví dụ tôn kính ngữ đặc biệt), gộp thành một mục riêng.
- `kanji`: các chữ trong phần 漢字 của chương, kèm âm Hán Việt nếu sách có.
- Không chép đoạn văn, hội thoại hay bài đọc của sách vào file.

## Kiểm tra

Ghi file vào `nguon/<id>/<chương>.json` (tạo thư mục nếu chưa có), rồi chạy `python3 tools/pham_vi.py`. Nếu có dòng `LỖI` cho file vừa ghi thì sửa đến khi hết lỗi. Chỉ ghi vào thư mục `nguon/`, không sửa file nào khác.
