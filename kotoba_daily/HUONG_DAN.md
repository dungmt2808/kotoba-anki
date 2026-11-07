# Báo tiếng Nhật mỗi sáng (畑新聞)

Mỗi sáng, Claude Code đọc phạm vi bạn đã học trong giáo trình rồi viết một số báo nhỏ chỉ dùng ngữ pháp và từ vựng đó. Số báo có furigana, bấm vào từ để tra nghĩa, có câu hỏi đọc hiểu và chép chính tả. Nếu máy có VOICEVOX thì có thêm giọng đọc.

Báo đọc được ở hai nơi: trong add-on ことば畑 (từ bản 1.6: hòm thư ngoài sân, phím **B**) và bằng trình duyệt (file `bao.html`).

> **Không muốn cài Claude Code?** Từ add-on ことば畑 1.12 có cách dễ hơn: mở báo (phím **B**) → tab **Nguồn báo** → dán khoá Gemini (lấy miễn phí ở aistudio.google.com/apikey) → **Thử khoá**. Add-on tự viết báo mỗi ngày theo từ trong deck của bạn, kèm giọng đọc Gemini, không cần cài gì thêm. Nếu đã có thư mục này, Gemini dùng luôn phạm vi theo giáo trình trong `pham_vi.json`. Bộ `kotoba_daily` (Claude Code) vẫn là cách cho báo sát giáo trình nhất và có giọng VOICEVOX.

## Trong thư mục có gì

```
kotoba_daily/
  HUONG_DAN.md          file này
  lo_trinh.json         BẠN SỬA: giáo trình nào, đã học đến chương mấy
  truyen.md             nhân vật và tóm tắt truyện dài kỳ (bạn sửa được)
  lich_su.md            mỗi số báo một dòng, Claude tự ghi
  pham_vi.json          do script tạo ra mỗi sáng, đừng sửa tay
  nguon/<giáo trình>/<chương>.json    từ vựng, ngữ pháp, kanji của từng chương
  bao/<ngày>/bao.json   số báo của ngày đó (dữ liệu)
  bao/<ngày>/bao.html   trang để đọc
  bao/<ngày>/audio/     giọng đọc (nếu có VOICEVOX)
  prompts/              hướng dẫn cho Claude Code (bao_hang_ngay.md mỗi sáng; them_ban_dich.md thêm bản dịch cho số cũ)
  tools/                các script kiểm tra và dựng trang (Python có sẵn trên Ubuntu)
  vi_du/                số báo mẫu
```

## Cài đặt (làm một lần)

### 1. Chép thư mục

Chép cả thư mục `kotoba_daily/` vào thư mục tiếng Nhật, nơi Claude Code của bạn đang làm việc với giáo trình. Ví dụ:

```
~/tieng-nhat/
  giao_trinh/...        (PDF giáo trình của bạn)
  kotoba_daily/         (thư mục này)
```

### 2. Sửa `lo_trinh.json`

```json
{
 "nen_tang": "N5",
 "giao_trinh": [
  {
   "id": "gungun_n4",
   "ten": "GUNGUN N4",
   "trinh_do": "N4",
   "chuong_dau": 1,
   "chuong_cuoi": 33,
   "da_hoc_den": 29,
   "thu_muc": "giao_trinh/GUNGUN_N4"
  }
 ],
 "cai_dat": { "so_chuong_trong_tam": 3, "tu_moi_toi_da": 3, "tin_that": false, "khi_ton": "rut_gon", "giong": 2 }
}
```

- `thu_muc`: đường dẫn tới thư mục chứa PDF các chương, tính từ thư mục tiếng Nhật. Nếu PDF chia thành nhiều thư mục (Q1, Q2), ghi thư mục cha chứa cả hai.
- `chuong_dau`, `chuong_cuoi`: số chương đầu và cuối của giáo trình. Nếu quyển Q2 đánh số tiếp từ Q1 (ví dụ 15–33) mà bạn muốn tách riêng, có thể ghi thành hai giáo trình.
- `da_hoc_den`: chương bạn đã học xong. Đây là chỗ bạn sẽ sửa thường xuyên nhất.
- `nen_tang`: trình độ coi như đã biết hết (ngữ pháp và từ cơ bản), dù không có file chương. Bạn học N5 ở nơi khác thì để `"N5"`.

`id` chỉ dùng chữ thường không dấu, số và dấu gạch dưới. Đừng đổi `id` sau khi đã trích chương, vì thư mục `nguon/<id>/` dựa vào nó.

### 3. Trích các chương đã học

Chương 29 đã có sẵn (`nguon/gungun_n4/29.json`). Các chương còn lại cần trích một lần. Mở Claude Code trong thư mục tiếng Nhật và gõ:

> Chạy python3 kotoba_daily/tools/pham_vi.py, rồi làm theo kotoba_daily/prompts/trich_chuong.md cho tất cả các chương THIẾU.

Nếu Claude Code của bạn đã có file từ vựng trích cho Anki thì nó sẽ dùng lại phần đó. Xong thì chạy lại lệnh dưới, không còn dòng `THIẾU` là được:

```
python3 kotoba_daily/tools/pham_vi.py
```

Nếu không trích hết trong một lần cũng không sao: tác vụ hằng ngày tự trích thêm 2 chương thiếu mỗi sáng.

### 4. Chạy thử một lần bằng tay

Trong Claude Code, gõ:

> Làm theo kotoba_daily/prompts/bao_hang_ngay.md

Xem nó làm từng bước, duyệt các quyền nó xin. Xong thì mở `kotoba_daily/bao/<ngày hôm nay>/bao.html` bằng trình duyệt.

### 5. Đặt lịch mỗi sáng trong Claude Desktop

1. Mở Claude Desktop, vào tab **Code**, bấm **Scheduled** ở thanh bên (bản cũ gọi là **Routines**).
2. Bấm **New task**. Nếu hiện menu thì chọn **Set up manually** (hoặc **Local** nếu được hỏi Local hay Cloud).
3. **Name**: `bao-tieng-nhat`.
4. Ô hướng dẫn: `Đọc và làm đúng theo file kotoba_daily/prompts/bao_hang_ngay.md`
5. Mở **Advanced settings**, tab **General**, bật **Only on this computer**, rồi chọn **Local folder** là thư mục tiếng Nhật (thư mục chứa `kotoba_daily/`, không phải chính `kotoba_daily/`).
6. **Trigger**: chọn **Daily**, giờ 6:00 (hoặc giờ bạn thích).
7. Chọn chế độ quyền và model trong ô hướng dẫn, rồi bấm **Create**.
8. Ở trang chi tiết của tác vụ, bấm **Run now** một lần. Khi nó xin quyền chạy lệnh hay ghi file, chọn **always allow**. Các lần sau sẽ tự chạy, không hỏi nữa.

Lưu ý: tác vụ chỉ chạy khi app Claude Desktop đang mở và máy đang thức. Nếu lỡ giờ (máy tắt), lúc mở lại nó chạy bù một lần. Ngày nào không chạy thì chỉ là không có báo, không hỏng gì.

Muốn sửa cách viết báo thì sửa file `prompts/bao_hang_ngay.md`, không cần tạo lại tác vụ.

### 6. Giọng đọc VOICEVOX (tuỳ chọn, nên có)

Không có VOICEVOX thì báo vẫn dùng được, nhưng phần chép chính tả sẽ phải dùng giọng của trình duyệt (trên Ubuntu thường không có giọng tiếng Nhật).

Cách gọn nhất là chạy VOICEVOX engine bằng Docker:

```
sudo apt install docker.io
sudo docker run -d --restart unless-stopped --name voicevox -p 127.0.0.1:50021:50021 voicevox/voicevox_engine:cpu-latest
curl http://127.0.0.1:50021/version
```

Lệnh cuối in ra số phiên bản là được. Từ giờ engine tự bật cùng máy. (Cách khác: cài app VOICEVOX cho Linux từ trang chủ; engine chạy khi app đang mở.)

Chọn giọng:

```
python3 kotoba_daily/tools/doc_voicevox.py --danh-sach-giong
```

Rồi ghi số id vào `cai_dat.giong` trong `lo_trinh.json`.

Điều khoản VOICEVOX yêu cầu ghi công khi dùng giọng đọc, dạng `VOICEVOX:<tên giọng>`. Trang báo tự hiện dòng này. Nếu bạn chia sẻ audio ra ngoài, xem thêm điều khoản riêng của từng giọng trên trang VOICEVOX.

## Khi học thêm

### Học xong một chương

Sửa `da_hoc_den` trong `lo_trinh.json` (ví dụ 29 → 30) và để PDF chương mới vào `thu_muc`. Sáng hôm sau tác vụ tự trích chương 30 rồi mới viết báo. Ba chương gần nhất (`so_chuong_trong_tam`) được nhấn mạnh nhiều nhất; các chương cũ vẫn được dùng để ôn.

### Học xong GUNGUN N4, sang giáo trình N3

Đặt `da_hoc_den` của N4 bằng `chuong_cuoi`, rồi thêm giáo trình mới vào danh sách:

```json
"giao_trinh": [
  { "id": "gungun_n4", "ten": "GUNGUN N4", "trinh_do": "N4", "chuong_dau": 1, "chuong_cuoi": 33, "da_hoc_den": 33, "thu_muc": "giao_trinh/GUNGUN_N4" },
  { "id": "gungun_n3", "ten": "GUNGUN N3", "trinh_do": "N3", "chuong_dau": 1, "chuong_cuoi": 30, "da_hoc_den": 1, "thu_muc": "giao_trinh/GUNGUN_N3" }
]
```

Toàn bộ N4 vẫn nằm trong phạm vi để ôn. Trình độ của báo lấy theo giáo trình cao nhất bạn đang học, nên báo tự dài và khó hơn khi sang N3.

### Học hai giáo trình song song

Ví dụ thêm một quyển luyện kanji hay đọc hiểu: cứ thêm một mục nữa vào `giao_trinh` với `da_hoc_den` riêng. Phạm vi là tất cả các chương đã học của mọi giáo trình cộng lại.

## Tuỳ chỉnh (`cai_dat`)

- `so_chuong_trong_tam`: số chương gần nhất được nhấn mạnh (mặc định 3).
- `tu_moi_toi_da`: số từ ngoài phạm vi được phép trong một số báo (mặc định 3).
- `tin_that`: `true` thì mỗi số có thêm một tin thật ở Nhật, viết lại cho dễ, có link nguồn. Mặc định tắt, vì khi bật, tác vụ sẽ đọc các trang web bên ngoài trong lúc tự chạy.
- `khi_ton`: làm gì khi bạn để dồn từ 3 số báo chưa đọc trở lên (add-on báo cho biết qua `tien_do.json`):
  - `rut_gon` (mặc định): vẫn có số mới nhưng ngắn, chỉ tin làng và chép chính tả; truyện tạm dừng chờ bạn đọc kịp.
  - `dung`: không viết số mới cho tới khi bạn đọc bớt.
  - `van_viet`: vẫn viết đủ như thường.
- `giong`: id giọng VOICEVOX.

Bạn cũng có thể sửa `truyen.md` để đổi nhân vật hoặc hướng câu chuyện.

## Đọc trong add-on ことば畑 (bản 1.6 trở lên)

1. Trong vườn: phím **B** → tab **Nguồn báo** → thẻ **Claude Code** → **Chọn thư mục…** → chọn thư mục này (từ bản 1.12). Bản cũ hơn: Tools → Add-ons → chọn ことば畑 → Config, sửa dòng `"bao_dir"` thành đường dẫn tới thư mục này, ví dụ `"bao_dir": "~/tieng-nhat/kotoba_daily"`, bấm Save rồi mở lại vườn.
2. Có số báo chưa đọc thì cờ đỏ trên hòm thư ngoài sân dựng lên, chip "Báo mới" hiện ở góc sân. Bấm hòm thư, bấm chip, hoặc nhấn phím **B** để mở.
3. Bảng 新聞 có 4 tab: **Báo** (số mới nhất chưa đọc), **Chép chính tả** (lượt 5 câu mỗi ngày, lấy từ báo và từ câu ví dụ trong deck), **Kệ báo** (mọi số cũ, đọc bù lúc nào cũng được), **Nguồn báo** (Claude Code hay Gemini).

Add-on ghi lại file `tien_do.json` trong thư mục này để số báo hôm sau biết từ nào bạn sắp quên, từ nào bạn chép sai, và còn bao nhiêu số chưa đọc:

```json
{ "cap_nhat": "2026-11-02T07:00", "sap_quen": ["満席", "泊まる"], "loi_sai": ["発表する"], "chua_doc": ["2026-11-01"] }
```

Add-on chỉ đọc các file trong thư mục này và chỉ ghi đúng một file `tien_do.json`.

## Bản dịch tiếng Việt (từ bản 2.3)

Mỗi số báo có sẵn bản dịch tiếng Việt từng đoạn, ẩn đi để bạn tự đọc tiếng Nhật trước:

- Trong add-on ことば畑 (bản 1.23 trở lên): nút **Dịch** cuối mỗi đoạn, nút **Hiện bản dịch** ở đầu bảng để mở cả số.
- Trong `bao.html`: cũng có nút **Dịch** cuối đoạn và **Hiện bản dịch** cạnh "Ẩn furigana".

Số báo viết trước bản 2.3 chưa có bản dịch. Muốn thêm: trong Claude Code (đứng ở thư mục tiếng Nhật) gõ "Đọc và làm đúng theo file kotoba_daily/prompts/them_ban_dich.md" — mỗi lần làm tối đa 10 số, chỉ thêm bản dịch, không sửa chữ của số cũ. Hoặc trong add-on bấm **Dịch số này** (cần khoá Gemini; bản dịch lưu trong add-on, không ghi vào thư mục này).

## Cập nhật bộ này lên bản mới

Chỉ chép đè `tools/`, `prompts/`, `vi_du/` và `HUONG_DAN.md` từ bản mới. **Không** chép đè `lo_trinh.json`, `truyen.md`, `lich_su.md`, `nguon/`, `bao/` (dữ liệu của bạn). Tác vụ lịch không cần sửa: nó luôn đọc `prompts/bao_hang_ngay.md` mới nhất.

## Gỡ rối

- Không có báo sáng nay: app Desktop có mở và máy có thức lúc 6:00 không? Xem lịch sử chạy ở trang chi tiết của tác vụ; dòng bị bỏ qua sẽ ghi lý do.
- Tác vụ đứng mãi: có thể đang chờ duyệt quyền. Mở phiên chạy đó từ trang chi tiết tác vụ, duyệt và chọn always allow.
- `kiemtra.py` báo lỗi mà Claude không sửa được: mở `bao/<ngày>/bao.json`, đọc dòng LỖI (có ghi vị trí như `bai[1].doan[0]`). Từ bản 2.2, `kiemtra.py` còn bắt chữ Latin / romaji trong câu tiếng Nhật (chữ viết tắt in hoa như NHK chỉ cảnh báo), chữ Hán giản thể của tiếng Trung, ngày / số người đọc đặc biệt (`[3日|みっか]`, `[2人|ふたり]`) và cách đọc không khớp phần kana trong chữ (`[食べ物|たもの]`). Từ bản 2.3, `kiemtra.py` kiểm cả bản dịch `dich` (mỗi đoạn một bản, không có chữ Nhật — tên riêng viết Latin như Lin, Hana, Stack-chan).
- Furigana sai hay câu nghe lạ: báo do AI viết nên đôi khi có chỗ chưa tự nhiên, nhất là kính ngữ. Gặp chỗ nghi ngờ thì hỏi thầy cô, và có thể thêm một dòng nhắc vào `prompts/bao_hang_ngay.md`.
- Thử các script bằng tay (đứng trong thư mục tiếng Nhật):

```
python3 kotoba_daily/tools/pham_vi.py
python3 kotoba_daily/tools/kiemtra.py vi_du/bao_mau.json
python3 kotoba_daily/tools/kiemtra.py --chi-dich bao/<ngày>/bao.json      # chỉ kiểm bản dịch
python3 kotoba_daily/tools/render.py vi_du/bao_mau.json
```
