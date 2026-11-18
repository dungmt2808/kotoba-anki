# QA trước phát hành Kotoba Batake 1.35.1

**Kết luận ngày 18/11/2026 — nên hoãn phát hành.** Ba thao tác dưới đây có thể ghi đè dữ liệu đã lưu. Hai thao tác ở Luyện viết xảy ra với một bài hợp lệ, qua giao diện thông thường. Kết quả 68/68 bộ hồi quy, cập nhật đè 19/19 và hạ bản rồi nâng lại 26/26 vẫn đạt trên cùng gói.

**Bản đã kiểm** là nhánh `claude/addon-review-new-languages-y9hrzh` của `dungmt2808/kotoba-anki`, commit `ab07dbbb88258655b4c99f4aa9636f3437a7e2ff`. Toàn bộ 79 tệp trong `kotoba_batake.ankiaddon` khớp từng byte với mã nguồn. Gói qua kiểm CRC, SHA-256 là `1b0949f8afd132070f597e4d4decd4c73d098c4f0492824b88da53e5a2b2c5dd`. [Commit đã kiểm](https://github.com/dungmt2808/kotoba-anki/commit/ab07dbbb88258655b4c99f4aa9636f3437a7e2ff)

## P1 · Dữ liệu đã lưu bị mất

### 01 · Trang trí thử ghi đè các ô khác sau một lần đọc tệp thất bại

**Tái hiện.** Trong hồ sơ thử, lưu một ghế ở Sân, bản 1, và một TV ở Phòng, bản 2. Lưu một món vào bản 3 của Sân. Ngay trong thao tác cuối, mô phỏng lỗi I/O chỉ ở lần mở để đọc đầu tiên của đúng tệp `ban_thu.json` theo hồ sơ. Các lần mở để đọc và ghi tiếp theo hoạt động bình thường.

| Điều kiện | Kết quả khi đọc lại tệp |
|---|---|
| Đọc bình thường | Có cả ba bản |
| Lỗi đúng lần đọc đầu | Thao tác báo thành công, chỉ còn Sân bản 3. Hai bản cũ biến mất, không có tệp `.hong` |
| Mọi lần đọc đều lỗi | Add-on báo lỗi. Hai bản cũ còn đủ, tệp giữ nguyên từng byte |

**Bằng chứng.** Tái hiện hai lần với collection Anki riêng và một lần qua bộ xử lý `home:draft:put` trong Anki 26.9.4. Lần đọc đầu trả về kho trống. Lần mở lại trước khi ghi xác nhận JSON hợp lệ nhưng bỏ qua nội dung vừa đọc, rồi ghi cả kho mới lên tệp. Kỳ vọng thao tác giữ các ô khác hoặc báo chưa lưu. [Đọc tệp](../../../kotoba_batake/backup_core.py#L198) · [Ghi bản thử](../../../kotoba_batake/garden_core.py#L3676) · [Lệnh lưu](../../../kotoba_batake/__init__.py#L4323)

### 02 · Bỏ chọn một báo làm lần sửa kế tiếp đổi tiếng và cắt bài đang viết

1. Chọn hai báo Đức và Trung. Trong Lịch hoa → Luyện viết, chọn tiếng Đức. Nhập đoạn bên dưới, đợi tự lưu. Ô hiển thị **24 / 30 từ**.
2. Đóng Lịch hoa. Vào Báo → Nguồn báo, bỏ dấu chọn **Tiếng Đức**, giữ **Tiếng Trung**. Mở lại Lịch hoa. Ô vẫn mang ngôn ngữ `de` và còn đủ bài.
3. Thêm ` Ja.` vào cuối, đợi tự lưu rồi đóng và mở lại cửa sổ vườn.

> Heute gehe ich mit meiner Freundin in den großen Garten und wir trinken gemeinsam Kaffee unter dem alten Baum am Ende des langen Weges.

**Thực tế.** Bài trong collection đổi sang `zh`, dừng giữa từ ở “… wir trinken g”. Mở lại thấy **60 / 60 ký tự**. Trước khi mở lại, ô còn hiển thị cách đếm tiếng Đức. Kỳ vọng sửa nội dung trong ô tiếng Đức giữ ngôn ngữ và phần văn bản đã có. Đã tái hiện bằng chính ô chọn báo và thao tác bàn phím. Khi nạp bài, giao diện dùng tiếng đã lưu. Khi ghi, Python lấy tiếng báo còn được chọn. [Mở bài](../../../kotoba_batake/__init__.py#L2383) · [Lưu bài](../../../kotoba_batake/__init__.py#L4769)

### 03 · Bấm đổi tiếng ngay trong Luyện viết cũng cắt bản nháp

**Tái hiện.** Giữ cả hai báo Đức và Trung. Nhập và đợi lưu đoạn 24 từ ở mục 02. Bấm **Tiếng Trung**, bấm lại **Tiếng Đức**, sau đó đóng và mở Lịch hoa. Không cần sửa hoặc gửi bài.

**Thực tế.** Ngay lần bấm đầu, add-on cắt bài ở ký tự thứ 60 không tính khoảng trắng và lưu đè. Đổi lại tiếng Đức chỉ còn **14 / 30 từ**, kết thúc ở chữ `g` của `gemeinsam`. Giao diện không hỏi trước. Kỳ vọng người dùng có thể quay lại nguyên văn hoặc có quyền hủy một thay đổi sẽ cắt bài. Lệnh đổi tiếng bỏ qua cờ báo văn bản đã bị cắt. [Nút đổi tiếng](../../../kotoba_batake/web/calendar.js#L502) · [Ghi đè khi đổi tiếng](../../../kotoba_batake/__init__.py#L4672)

## P2 · Lỗi chức năng đã tái hiện

| Mã | Cách tái hiện | Thực tế và kết quả cần có |
|---|---|---|
| 04 · Dấu tổ hợp làm Luyện viết cắt sớm | Trong ô tiếng Pháp, dán 30 lần từ `élève`, cách nhau một khoảng trắng. So sánh văn bản Unicode NFC (chữ và dấu dựng sẵn) với NFD (chữ và dấu tách rời). Làm tương tự với `frühstücken` và `학교`. | Hai cách viết nhìn giống nhau. Bản NFC giữ **30/30** từ Pháp và Đức. Với NFD, ô báo **30 / 30 từ** khi mới giữ **10 từ** trong collection. Với 20 cụm tiếng Hàn, NFC giữ **20**, NFD giữ **12**. Tái hiện ở cả ô nhập thật và bộ đếm Python. Kỳ vọng văn bản tương đương có cùng giới hạn. [Đếm phía giao diện](../../../kotoba_batake/web/calendar.js#L465) · [Đếm phía lưu trữ](../../../kotoba_batake/journal_core.py#L339) |
| 05 · Deck song ngữ lấy nhầm cả ngôn ngữ lẫn mặt thẻ | Tạo loại note `German Vocabulary QA` có trường `Wort`, `Chinese`, `Beispiel`. Thêm năm từ `der Hund`, `die Katze`, `das Buch`, `gehen`, `spielen` kèm nghĩa tiếng Trung. Chọn deck trong vườn, để tự nhận trường. | Cả **5/5 cây** mang `zh` và hiện lần lượt **狗, 猫, 书, 走, 玩**. Các câu ví dụ Đức không tạo được ô trống. Cần hiển thị năm từ của trường `Wort` với ngôn ngữ `de`. Ở bộ đoán độc lập, loại note tiếng Pháp có trường dịch `한국어` cũng bị nhận là tiếng Hàn. Hai đối chứng có từ nguồn thực sự là Trung và Hàn đều đúng. [Thứ tự xét dấu hiệu](../../../kotoba_batake/fields_core.py#L475) |
| 06 · Điền vào câu che nhầm chữ trên thẻ nhập từ HTML | Trên note tiếng Pháp, đặt từ `le chat` rồi nhập vào trường câu ví dụ ở chế độ HTML đoạn `Apre&#x300;s le di&#x302;ner, le chat dort.`. Mở deck và xem câu của cây trong trò Điền vào câu. | Câu hiển thị là “Après le dîner, le chat dort.” nhưng câu hỏi che **“, le ch”** và để lộ **“at”**. Cùng câu viết dấu dựng sẵn che đúng **“le chat”**. Cũng tái hiện với `der Hund`. Bộ tìm trả vị trí trong chuỗi đã chuẩn hóa, bộ dựng câu lại cắt chuỗi gốc. [Tìm vị trí](../../../kotoba_batake/eu_core.py#L454) · [Dựng câu](../../../kotoba_batake/garden_core.py#L1615) |
| 07 · Nhật ký viết trước lượt ôn đầu tiên không lên kệ khi sang tháng | Trên hồ sơ chưa có lượt ôn, viết nhật ký ngày 31/10. Mở **Cuốn nhật ký** vào 18/11. Đã dùng đồng hồ thử của add-on để tái hiện qua hai tháng và nhập chữ qua giao diện. | Collection vẫn chứa dòng ngày 31/10. Kệ chỉ có **Tháng 11 · 2026 (bản nháp)**. Yêu cầu mở cuốn `2026-10` cũng trả về tháng 11, nên người dùng không thể chọn cuốn tháng 10 để đọc hoặc xuất riêng. Kỳ vọng kệ tính cả tháng có viết. [Lọc kệ sách](../../../kotoba_batake/__init__.py#L2417) · [Danh sách tháng có nhật ký](../../../kotoba_batake/journal_core.py#L581) |
| 08 · Tra từ báo Đức/Pháp phát sinh ngoại lệ khi bộ nhớ đệm đầy | Trong cùng tiến trình, gọi bộ nối từ của báo với 20.001 mục từ khác nhau. Phép đo dùng `ai_eu.find_links("Ein Apfel liegt im Garten.", [f"Gartenwort{i}"], "de")` với `i` từ 0 đến 20.000. | 20.000 lần đầu hoàn tất. Lần 20.001 ném `KeyError: ('de', 'Gartenwort20000')`. Thử lại chính từ đó thành công. Khi đầy, hàm xóa cả khóa vừa thêm rồi truy xuất lại khóa ấy. Hai ngôn ngữ dùng chung bộ đệm. Đã đo ở hàm sản phẩm, chưa đo tần suất người dùng thực tế đạt ngưỡng này. [Bộ đệm tra từ](../../../kotoba_batake/ai_eu.py#L263) |

Để tạo đúng đầu vào NFD ở mục 04, biểu thức JavaScript `Array(30).fill("élève").join(" ").normalize("NFD")` sinh đoạn có cùng hình thức hiển thị với bản NFC.

## P3 · Giao diện và hướng dẫn phát hành

- **09 · Kết quả luyện viết không tô thay đổi viết hoa tiếng Đức.** Gửi “Ich sehe einen hund.” và dùng phản hồi Gemini giả sửa đúng thành “Ich sehe einen Hund.”. Giao diện hiện dòng `hund → Hund`, nhưng trong “Câu đã sửa” có **0** phần được tô. Trong tiếng Đức, viết hoa danh từ chính là phần người học cần thấy. Bộ so sánh đổi cả hai từ về chữ thường. [So sánh từ](../../../kotoba_batake/journal_core.py#L811) · [Hiển thị](../../../kotoba_batake/web/calendar.js#L647)
- **10 · Lịch hoa không phân biệt tiến độ hai báo.** Mở số 1 của *Der Wortgarten* và số 1 của *Le Jardin des Mots* từ tab Nguồn báo. Mỗi số có hai câu chép. Dòng Báo trong Lịch hoa ghi nguyên văn “đọc số 1 · chép đúng 0 / 2 câu · đọc số 1 · chép đúng 0 / 2 câu”. Trên hồ sơ chỉ có lịch sử đọc, dòng đó thành “đã đọc · đã đọc”. Kỳ vọng mỗi tiến độ cho biết tên hoặc ngôn ngữ của báo. Hàm tạo nhãn chỉ thêm tên tiếng Anh khi có nhiều báo. [Dòng tiến độ](../../../kotoba_batake/journal_core.py#L1273)
- **11 · README chính giới thiệu thiếu bốn tiếng luyện viết.** Phần Lịch hoa chỉ nêu tiếng Nhật hoặc tiếng Anh. Cùng gói đã lưu được cả bài Trung, Hàn, Đức và Pháp trong Anki. [README phát hành](../../../README.md#L134) · [Các ngôn ngữ được hỗ trợ](../../../kotoba_batake/journal_core.py#L77)

## Các bộ test và điều kiện chạy

Chạy trên Linux với hồ sơ và collection dùng một lần, múi giờ Việt Nam. Dùng gói đã giải nén cho các bài tự động và trình cài add-on của Anki cho các ca chuyển phiên bản.

| Phép kiểm | Kết quả của lượt QA này |
|---|---|
| `tests/run_all.sh` trên gói phát hành | **68/68 bộ**, exit 0. Gồm kiểm lõi, collection Anki thật, máy chủ đồng bộ cục bộ và trang web trên Chromium. Hai đợt kiểm dữ liệu đạt 779/779 và 2.047/2.047, kiểm lỗi lưu trữ 172/172, phục hồi 45/45. |
| Anki 26.9.4 · Python 3.12.14 · Qt 6.12 | Trang trí và giao diện bốn tiếng 35/35, tiếng Đức/Pháp và báo 60/60, bảng ôn/cây deck/bản thử 87/87, ngôn ngữ vườn 5/5, mở vườn và ôn thẻ thật 12/12, sửa thẻ và pinyin 40/40. Phục hồi dữ liệu 18/18, khóa lựa chọn khi đang viết báo 36/36. |
| Anki 23.10.1 · Python 3.9.25 · Qt 6.6 | Chạy lại trên cùng gói. Trang trí và chữ dài đạt 35/35, trộn ngôn ngữ 5/5, ôn thẻ thật 12/12. Kiểm riêng bằng Python 3.9 đạt 66/66. |
| Cài đè và quay lại phiên bản cũ | Cài 1.31.3 → 1.35.1 bằng trình quản lý add-on đạt 19/19. Chu trình 1.35.1 → 1.31.3 → 1.35.1 đạt 26/26. Có đóng và mở lại Anki, so collection, `user_files`, cấu hình và tiến độ. |
| Thử ngẫu nhiên bổ sung | 1.120 lệnh giao diện với seed `20261118` giữ bất biến ví và đồ, không có ngoại lệ JavaScript chưa xử lý. Ba seed mới `20261118, 11835, 74001`, mỗi seed 600 thao tác có lỗi đọc/ghi mô phỏng, cho kết quả ví khớp đối chứng cả ba lượt. |
| Bố cục | Đo và xem ảnh QtWebEngine ở 1366×768, 1024×640 và 800×600. Lịch chuyển từ hai cột sang một cột. Cả ba cỡ đều cuộn tới ô viết, nhận focus và nhập được, không tràn ngang. |
| Đồng bộ qua giao diện Anki | `e2e_1312` đạt **46/47** ở hai lượt. Ca trượt đọc ô thông báo sau 500 ms, khi hướng dẫn cấu hình trường còn hiển thị. Theo dõi DOM thấy đúng câu “Thẻ này vừa được ôn hoặc sửa ở chỗ khác — sang thẻ kế tiếp.” xuất hiện **1,16 giây sau thời điểm kiểm tra**. Các kiểm tra thẻ không bị chấm hai lần, ví, nhật ký và tải toàn bộ collection đều đạt. [Assertion thời gian](../../../tests/anki/e2e_1312.js#L231) · [Hàng chờ thông báo](../../../kotoba_batake/web/garden.js#L1378) |

### Độ tin cậy của các bài Gemini giả

Trên hồ sơ mới không có danh sách model lưu sẵn, `e2e_qa1351` đạt **36/39**. Ba kiểm tra phần sửa bài trượt. `e2e_120` cũng dừng khi nút của trạng thái “đang sửa” biến mất. Python gọi `client.models()` **trước** hàm sửa bài mà hai bài test đã thay bằng Gemini giả. Nhật ký thử ghi nhận kết nối bị từ chối trước khi chạy hàm giả.

Đối chứng trên hai hồ sơ mới khác, chỉ nạp trước danh sách gồm `gemini-flash-lite-latest` vào trạng thái thử nghiệm. Giữ nguyên mã và assertions. Hai kịch bản lần lượt đạt **39/39** và **103/103**. Cần tính tới phụ thuộc mạng còn sót này khi dùng các bài trên làm điều kiện phát hành. [Liệt kê model](../../../kotoba_batake/__init__.py#L2504) · [Kịch bản bốn tiếng](../../../tests/anki/e2e_qa1351.js#L153) · [Kịch bản nhật ký](../../../tests/anki/e2e_120.js#L44)

### Tái hiện tối thiểu cho lỗi 01

Chạy từ thư mục gốc của repo bằng Python có cài gói `anki`. Đoạn này tạo collection và tệp bản thử trong thư mục tạm. Chuỗi đọc → cập nhật một ô → ghi là chuỗi mà lệnh lưu của giao diện gọi.

```bash
PYTHONPATH=kotoba_batake python - <<'PYTHON'
import builtins
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

from anki.collection import Collection
import draft_core
import garden_core

with tempfile.TemporaryDirectory() as temp:
    col = Collection(str(Path(temp) / "collection.anki2"))
    try:
        state = garden_core.GardenState(str(Path(temp) / "user_files/state.json"), lambda: col)
        target = garden_core.backup.profile_path(state._draft_path(), col)
        def save(scene, slot, item):
            draft = {"items": [{"id": item, "x": 6, "y": 1}]}
            state.draft_store(draft_core.put(state.draft_load(), scene, slot, draft))

        save("yard", 0, "bench")
        save("room", 1, "tv")
        real_open = builtins.open
        faults = [1]
        def open_for_test(path, mode="r", *args, **kwargs):
            if os.fspath(path) == target and mode == "r" and faults:
                faults.pop()
                raise OSError("QA: first read failed")
            return real_open(path, mode, *args, **kwargs)

        with patch("builtins.open", side_effect=open_for_test):
            save("yard", 2, "lamp")
        for scene, data in state.draft_load()["scenes"].items():
            print(scene, [i + 1 for i, slot in enumerate(data["slots"]) if slot])
    finally:
        col.close()
PYTHON
```

Bản 1.35.1 in đúng một dòng `yard [3]`. Nếu cả hai bản trước được bảo toàn, đầu ra phải có `yard [1, 3]` và `room [2]`.

### Phạm vi còn chưa xác minh

Gemini và giọng đọc Gemini qua dịch vụ thật, giọng hệ điều hành Windows/macOS, AnkiWeb công cộng và thiết bị di động vật lý chưa được kiểm trong lượt này. Các lượt báo và luyện viết dùng phản hồi mẫu. Đồng bộ dùng máy chủ Anki cục bộ với collection thật. Giao diện đã được kiểm bằng chuột/phím và ảnh trong Anki/QtWebEngine chạy offscreen. Phiên Cloud Desktop dùng chung trả lỗi khi khởi tạo công cụ điều khiển.
