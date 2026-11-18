# QA trước phát hành Kotoba Batake 1.35.1

**Kết luận ngày 18/11/2026 — nên hoãn phát hành 1.35.1.** Hai lượt kiểm tra ghi nhận 15 lỗi, gồm 5 P1, 6 P2 và 4 P3. Cả 5 lỗi P1 đã tái hiện trên Anki 23.10.1 và 26.9.4. Lượt cuối phát hiện Lịch hoa có thể ghi đè nhật ký vừa khôi phục hoặc vừa nhận từ máy khác, và Luyện viết có thể gửi bài cũ nếu lần lưu bài mới thất bại. Các bước tái hiện và đối chứng nằm ở mục 12 và 13.

**Bản đã kiểm** là nhánh `claude/addon-review-new-languages-y9hrzh` của `dungmt2808/kotoba-anki`, commit `ab07dbbb88258655b4c99f4aa9636f3437a7e2ff`. Toàn bộ 79 tệp trong `kotoba_batake.ankiaddon` khớp từng byte với mã nguồn. Gói qua kiểm CRC, SHA-256 là `1b0949f8afd132070f597e4d4decd4c73d098c4f0492824b88da53e5a2b2c5dd`. [Commit đã kiểm](https://github.com/dungmt2808/kotoba-anki/commit/ab07dbbb88258655b4c99f4aa9636f3437a7e2ff)

## P1 · Lỗi cần chặn phát hành

### 01 · Trang trí thử ghi đè các ô khác sau một lần đọc tệp thất bại

**Tái hiện.** Trong hồ sơ thử, lưu một ghế ở Sân, bản 1, và một TV ở Phòng, bản 2. Lưu một món vào bản 3 của Sân. Ngay trong thao tác cuối, mô phỏng lỗi I/O chỉ ở lần mở để đọc đầu tiên của đúng tệp `ban_thu.json` theo hồ sơ. Các lần mở để đọc và ghi tiếp theo hoạt động bình thường.

| Điều kiện | Kết quả khi đọc lại tệp |
|---|---|
| Đọc bình thường | Có cả ba bản |
| Lỗi đúng lần đọc đầu | Thao tác báo thành công, chỉ còn Sân bản 3. Hai bản cũ biến mất, không có tệp `.hong` |
| Mọi lần đọc đều lỗi | Add-on báo lỗi. Hai bản cũ còn đủ, tệp giữ nguyên từng byte |

**Bằng chứng.** Tái hiện hai lần với collection Anki riêng và một lần qua bộ xử lý `home:draft:put` trong Anki 26.9.4. Lần đọc đầu trả về kho trống. Lần mở lại trước khi ghi xác nhận JSON hợp lệ nhưng bỏ qua nội dung vừa đọc, rồi ghi cả kho mới lên tệp. Kỳ vọng thao tác giữ các ô khác hoặc báo chưa lưu. [Đọc tệp](../../../kotoba_batake/backup_core.py#L198) · [Ghi bản thử](../../../kotoba_batake/garden_core.py#L3676) · [Lệnh lưu](../../../kotoba_batake/__init__.py#L4323)

**Lượt cuối, chỉ bấm chuyển ô cũng mất bản đã lưu.** Chuẩn bị Sân bản 1 có ghế, Sân bản 2 có đèn và Phòng bản 1 có TV. Cảnh Sân thật đang trống. Trong **Trang trí thử**, chuyển 1 → 2 → 1 bình thường giữ đủ ba bản. Bấm lại nút **2**, đồng thời mô phỏng đúng một lần đọc tệp thất bại. Lệnh `pick` ghi kho trống, giao diện tự tạo lại bản 1 từ cảnh thật. Kiểm tra tệp trên đĩa và các nút chọn chỉ còn Sân bản 1 trống. Cả ghế, đèn và TV trong các bản thử đều mất, không có tệp `.hong`. Kết quả giống nhau ở hai bản Anki. [Nút chuyển bản](../../../kotoba_batake/web/home.js#L3863) · [Tạo lại ô trống](../../../kotoba_batake/web/home.js#L3764) · [Ghi khi chuyển ô](../../../kotoba_batake/__init__.py#L4326)

### 02 · Bỏ chọn một báo làm lần sửa kế tiếp đổi tiếng và cắt bài đang viết

1. Chọn hai báo Đức và Trung. Trong Lịch hoa → Luyện viết, chọn tiếng Đức. Nhập đoạn bên dưới, đợi tự lưu. Ô hiển thị **24 / 30 từ**.
2. Đóng Lịch hoa. Vào Báo → Nguồn báo, bỏ dấu chọn **Tiếng Đức**, giữ **Tiếng Trung**. Mở lại Lịch hoa. Ô vẫn mang ngôn ngữ `de` và còn đủ bài.
3. Thêm ` Ja.` vào cuối, đợi tự lưu rồi đóng và mở lại cửa sổ vườn.

> Heute gehe ich mit meiner Freundin in den großen Garten und wir trinken gemeinsam Kaffee unter dem alten Baum am Ende des langen Weges.

**Thực tế.** Bài trong collection đổi sang `zh`, dừng giữa từ ở “… wir trinken g”. Mở lại thấy **60 / 60 ký tự**. Trước khi mở lại, ô còn hiển thị cách đếm tiếng Đức. Kỳ vọng sửa nội dung trong ô tiếng Đức giữ ngôn ngữ và phần văn bản đã có. Đã tái hiện bằng chính ô chọn báo và thao tác bàn phím. Khi nạp bài, giao diện dùng tiếng đã lưu. Khi ghi, Python lấy tiếng báo còn được chọn. [Mở bài](../../../kotoba_batake/__init__.py#L2383) · [Lưu bài](../../../kotoba_batake/__init__.py#L4769)

### 03 · Bấm đổi tiếng ngay trong Luyện viết cũng cắt bản nháp

**Tái hiện.** Giữ cả hai báo Đức và Trung. Nhập và đợi lưu đoạn 24 từ ở mục 02. Bấm **Tiếng Trung**, bấm lại **Tiếng Đức**, sau đó đóng và mở Lịch hoa. Không cần sửa hoặc gửi bài.

**Thực tế.** Ngay lần bấm đầu, add-on cắt bài ở ký tự thứ 60 không tính khoảng trắng và lưu đè. Đổi lại tiếng Đức chỉ còn **14 / 30 từ**, kết thúc ở chữ `g` của `gemeinsam`. Giao diện không hỏi trước. Kỳ vọng người dùng có thể quay lại nguyên văn hoặc có quyền hủy một thay đổi sẽ cắt bài. Lệnh đổi tiếng bỏ qua cờ báo văn bản đã bị cắt. [Nút đổi tiếng](../../../kotoba_batake/web/calendar.js#L502) · [Ghi đè khi đổi tiếng](../../../kotoba_batake/__init__.py#L4672)

### 12 · Lịch hoa ghi đè nhật ký và bài viết vừa khôi phục hoặc vừa đồng bộ

**Nhập bản sao lưu.** Trong Lịch hoa, lưu dòng nhật ký A và bài `Ich lese ein Buch.`, rồi xuất collection ra `.colpkg`. Đổi hai ô thành dòng B và `Heute trinke ich Tee.`, đợi tự lưu. Giữ Lịch hoa mở, nhập lại gói A qua trình nhập collection của Anki. Đọc collection ngay sau khi nhập thấy đúng A. Hai ô trên màn hình vẫn cho sửa B. Gõ thêm một dấu `!` ở cuối mỗi ô, đợi lưu, đóng rồi mở lại Lịch hoa.

| Thời điểm | Trong collection | Trên màn hình |
|---|---|---|
| Vừa nhập, Lịch hoa vẫn mở | Nhật ký A và `Ich lese ein Buch.` | Nhật ký B và `Heute trinke ich Tee.` |
| Thêm `!` rồi mở lại | Nhật ký B kèm `!` và `Heute trinke ich Tee.!` | Cùng nội dung B vừa ghi đè |
| Đối chứng đóng Lịch hoa trước khi nhập, mở lại rồi thêm `!` | Nhật ký A kèm `!` và `Ich lese ein Buch.!` | Cùng nội dung A đã sửa |

**Đồng bộ hai máy.** Mô phỏng hai máy bằng hai tiến trình dùng hai collection riêng. Cả hai kết nối với máy chủ đồng bộ thật của Anki chạy cục bộ, bật lớp giữ dữ liệu mặc định. Máy A giữ Lịch hoa mở với `Ich bin in Berlin.`. Máy B nhận đúng câu này, sửa thành `Ich bin in Leipzig.` và sửa cả dòng nhật ký rồi đồng bộ lên. Máy A đồng bộ xuống thành công. Trong collection A là `Leipzig`, trên màn hình A vẫn là `Berlin`. Sau khi thêm `!` rồi đồng bộ hai bên, chính máy B nhận lại `Ich bin in Berlin.!` và dòng nhật ký cũ của A kèm `!`. Ở lượt đóng Lịch hoa trước khi đồng bộ, cả hai máy giữ `Ich bin in Leipzig.!` và dòng nhật ký mới của B.

Hai thao tác và cả hai đối chứng cho cùng kết quả trên Anki 23.10.1 và 26.9.4. Ca lỗi bắt đầu từ hai ô đã lưu xong, chưa có xung đột soạn thảo. Khi dữ liệu thay đổi, người dùng cần thấy nội dung vừa nhận trước khi được phép ghi tiếp. Cả hai đường đều dựng lại cửa sổ vườn, nhưng hai ô Lịch hoa đang mở vẫn giữ nội dung cũ. [Sau khi nhập collection](../../../kotoba_batake/__init__.py#L3416) · [Sau khi đồng bộ](../../../kotoba_batake/__init__.py#L5512) · [Dựng lại màn vườn](../../../kotoba_batake/web/garden.js#L1411)

### 13 · Nút “Nhờ Gemini sửa” gửi câu cũ và dùng hết lượt khi lưu bản mới thất bại

1. Trong Luyện viết tiếng Đức, lưu câu `Ich lese ein Buch.`.
2. Thay cả câu bằng `Heute trinke ich Tee.` rồi bấm ngay **Nhờ Gemini sửa**. Trên hồ sơ thử, làm cho hai lần ghi kế tiếp vào khóa nhật ký tháng qua `journal.backup.put_config` ném `OSError`. Cho mọi lần ghi sau chạy bình thường. Dùng danh sách model lưu sẵn và phản hồi sửa bài mẫu để ghi nhận chính xác văn bản đi vào hàm sửa.
3. Khi hiện **Đã sửa hôm nay**, đọc lại bài trong collection, tệp sao lưu tháng của hồ sơ và ô sau khi đóng mở Lịch hoa.

| Điều kiện | Câu mà hàm sửa nhận | Dữ liệu và lượt sửa sau khi mở lại |
|---|---|---|
| Mọi lần ghi thành công | `Heute trinke ich Tee.` | Bài mới đã sửa |
| Hai lần ghi liên tiếp thất bại | `Ich lese ein Buch.` | Collection và tệp sao lưu tháng cùng giữ bài cũ. Bài bị khóa, lượt sửa trong ngày đã dùng |
| Một lần ghi thất bại, đợi báo lỗi, rời ô để lưu lại thành công rồi mới gửi | `Heute trinke ich Tee.` | Bài mới đã sửa |

Với đúng một lần ghi lỗi và bấm gửi ngay, kết quả phụ thuộc việc giao diện kịp thử lưu lại. Đã ghi nhận cả hai kết quả trên 26.9.4. Với hai lần lỗi liên tiếp, cả hai bản Anki đều gửi bài cũ. Nút gửi yêu cầu lưu rồi gửi tiếp lệnh sửa chỉ kèm ngày. Python đọc bản trong collection tại thời điểm ấy. Lượt được đo là quyền gửi một bài mỗi ngày của add-on. Khi chưa lưu được câu đang thấy, người dùng cần giữ được câu ấy và còn lượt gửi lại. [Thao tác nút gửi](../../../kotoba_batake/web/calendar.js#L632) · [Chọn nội dung để sửa](../../../kotoba_batake/__init__.py#L2473) · [Ghi kết quả và khóa lượt](../../../kotoba_batake/__init__.py#L2538)

## P2 · Lỗi chức năng đã tái hiện

| Mã | Cách tái hiện | Thực tế và kết quả cần có |
|---|---|---|
| 04 · Dấu tổ hợp làm Luyện viết cắt sớm | Trong ô tiếng Pháp, dán 30 lần từ `élève`, cách nhau một khoảng trắng. So sánh văn bản Unicode NFC (chữ và dấu dựng sẵn) với NFD (chữ và dấu tách rời). Làm tương tự với `frühstücken` và `학교`. | Hai cách viết nhìn giống nhau. Bản NFC giữ **30/30** từ Pháp và Đức. Với NFD, ô báo **30 / 30 từ** khi mới giữ **10 từ** trong collection. Với 20 cụm tiếng Hàn, NFC giữ **20**, NFD giữ **12**. Tái hiện ở cả ô nhập thật và bộ đếm Python. Kỳ vọng văn bản tương đương có cùng giới hạn. [Đếm phía giao diện](../../../kotoba_batake/web/calendar.js#L465) · [Đếm phía lưu trữ](../../../kotoba_batake/journal_core.py#L339) |
| 05 · Deck song ngữ lấy nhầm cả ngôn ngữ lẫn mặt thẻ | Tạo loại note `German Vocabulary QA` có trường `Wort`, `Chinese`, `Beispiel`. Thêm năm từ `der Hund`, `die Katze`, `das Buch`, `gehen`, `spielen` kèm nghĩa tiếng Trung. Chọn deck trong vườn, để tự nhận trường. | Cả **5/5 cây** mang `zh` và hiện lần lượt **狗, 猫, 书, 走, 玩**. Các câu ví dụ Đức không tạo được ô trống. Cần hiển thị năm từ của trường `Wort` với ngôn ngữ `de`. Ở bộ đoán độc lập, loại note tiếng Pháp có trường dịch `한국어` cũng bị nhận là tiếng Hàn. Hai đối chứng có từ nguồn thực sự là Trung và Hàn đều đúng. [Thứ tự xét dấu hiệu](../../../kotoba_batake/fields_core.py#L475) |
| 06 · Điền vào câu che nhầm chữ trên thẻ nhập từ HTML | Trên note tiếng Pháp, đặt từ `le chat` rồi nhập vào trường câu ví dụ ở chế độ HTML đoạn `Apre&#x300;s le di&#x302;ner, le chat dort.`. Mở deck và xem câu của cây trong trò Điền vào câu. | Câu hiển thị là “Après le dîner, le chat dort.” nhưng câu hỏi che **“, le ch”** và để lộ **“at”**. Cùng câu viết dấu dựng sẵn che đúng **“le chat”**. Cũng tái hiện với `der Hund`. Bộ tìm trả vị trí trong chuỗi đã chuẩn hóa, bộ dựng câu lại cắt chuỗi gốc. [Tìm vị trí](../../../kotoba_batake/eu_core.py#L454) · [Dựng câu](../../../kotoba_batake/garden_core.py#L1615) |
| 07 · Nhật ký viết trước lượt ôn đầu tiên không lên kệ khi sang tháng | Trên hồ sơ chưa có lượt ôn, viết nhật ký ngày 31/10. Mở **Cuốn nhật ký** vào 18/11. Đã dùng đồng hồ thử của add-on để tái hiện qua hai tháng và nhập chữ qua giao diện. | Collection vẫn chứa dòng ngày 31/10. Kệ chỉ có **Tháng 11 · 2026 (bản nháp)**. Yêu cầu mở cuốn `2026-10` cũng trả về tháng 11, nên người dùng không thể chọn cuốn tháng 10 để đọc hoặc xuất riêng. Kỳ vọng kệ tính cả tháng có viết. [Lọc kệ sách](../../../kotoba_batake/__init__.py#L2417) · [Danh sách tháng có nhật ký](../../../kotoba_batake/journal_core.py#L581) |
| 08 · Tra từ báo Đức/Pháp phát sinh ngoại lệ khi bộ nhớ đệm đầy | Trong cùng tiến trình, gọi bộ nối từ của báo với 20.001 mục từ khác nhau. Phép đo dùng `ai_eu.find_links("Ein Apfel liegt im Garten.", [f"Gartenwort{i}"], "de")` với `i` từ 0 đến 20.000. | 20.000 lần đầu hoàn tất. Lần 20.001 ném `KeyError: ('de', 'Gartenwort20000')`. Thử lại chính từ đó thành công. Khi đầy, hàm xóa cả khóa vừa thêm rồi truy xuất lại khóa ấy. Hai ngôn ngữ dùng chung bộ đệm. Đã đo ở hàm sản phẩm, chưa đo tần suất người dùng thực tế đạt ngưỡng này. [Bộ đệm tra từ](../../../kotoba_batake/ai_eu.py#L263) |

Để tạo đúng đầu vào NFD ở mục 04, biểu thức JavaScript `Array(30).fill("élève").join(" ").normalize("NFD")` sinh đoạn có cùng hình thức hiển thị với bản NFC.

### 14 · Qua giờ đổi ngày của Anki, ô Luyện viết vẫn cho gõ nhưng chữ mới không được lưu

Trên ngày 18/11, lưu `Ich lese ein Buch.`, đặt con trỏ cuối câu và thêm ` Heute Abend.`. Khi cầu nối đã nhận đủ câu nhưng còn trong khoảng tự lưu 800 ms, cho đồng hồ ngày của add-on và ngày của bộ lập lịch Anki sang 19/11 trong hồ sơ thử. Gọi cùng hàm kiểm tra ngày mà cửa sổ đang mở chạy mỗi phút.

Cả hai bản Anki đều xóa câu đang chờ lưu khỏi bộ nhớ đệm. Ô vẫn cho gõ và còn nút gửi. Khi ghi, bảng báo “Luyện viết chỉ cho hôm nay.”. Đọc lại collection sau khi tự lưu chỉ thấy câu cũ của 18/11. Cụm `Heute Abend.` và phần gõ tiếp sau khi đổi ngày đều thiếu. Đóng rồi mở Lịch hoa, ô cho ngày 19/11 trống. Ở lượt đợi 1,15 giây trước khi đổi ngày, cụm từ đã được lưu đúng cho 18/11. Ô Nhật ký vẫn lưu được vào ngày cũ trong cả hai trường hợp.

Cần giữ phần chữ đã nhận trước thời điểm chuyển ngày và cập nhật trạng thái của ô khi ngày cũ hết hạn. Phép thử mô phỏng mốc ngày của Anki, còn thao tác gõ, bộ đếm tự lưu, cửa sổ Qt và collection đều chạy thật. [Bộ hẹn tự lưu](../../../kotoba_batake/web/calendar.js#L571) · [Vườn chuyển ngày](../../../kotoba_batake/__init__.py#L2908) · [Xử lý bản đang chờ](../../../kotoba_batake/__init__.py#L4657) · [Kiểm tra ngày trước khi ghi](../../../kotoba_batake/__init__.py#L4764)

## P3 · Giao diện và hướng dẫn phát hành

- **09 · Kết quả luyện viết không tô thay đổi viết hoa tiếng Đức.** Gửi “Ich sehe einen hund.” và dùng phản hồi Gemini giả sửa đúng thành “Ich sehe einen Hund.”. Giao diện hiện dòng `hund → Hund`, nhưng trong “Câu đã sửa” có **0** phần được tô. Trong tiếng Đức, viết hoa danh từ chính là phần người học cần thấy. Bộ so sánh đổi cả hai từ về chữ thường. [So sánh từ](../../../kotoba_batake/journal_core.py#L811) · [Hiển thị](../../../kotoba_batake/web/calendar.js#L647)
- **10 · Lịch hoa không phân biệt tiến độ hai báo.** Mở số 1 của *Der Wortgarten* và số 1 của *Le Jardin des Mots* từ tab Nguồn báo. Mỗi số có hai câu chép. Dòng Báo trong Lịch hoa ghi nguyên văn “đọc số 1 · chép đúng 0 / 2 câu · đọc số 1 · chép đúng 0 / 2 câu”. Trên hồ sơ chỉ có lịch sử đọc, dòng đó thành “đã đọc · đã đọc”. Kỳ vọng mỗi tiến độ cho biết tên hoặc ngôn ngữ của báo. Hàm tạo nhãn chỉ thêm tên tiếng Anh khi có nhiều báo. [Dòng tiến độ](../../../kotoba_batake/journal_core.py#L1273)
- **11 · README chính giới thiệu thiếu bốn tiếng luyện viết.** Phần Lịch hoa chỉ nêu tiếng Nhật hoặc tiếng Anh. Cùng gói đã lưu được cả bài Trung, Hàn, Đức và Pháp trong Anki. [README phát hành](../../../README.md#L134) · [Các ngôn ngữ được hỗ trợ](../../../kotoba_batake/journal_core.py#L77)

- **15 · Cảnh báo “Chưa lưu được” vẫn hiện sau khi đã lưu thành công.** Trong ô Nhật ký hoặc Luyện viết, làm cho đúng một lần ghi tháng thất bại. Chờ cảnh báo đỏ, rời ô để thử lưu, rồi thêm `!` và đợi thêm ít nhất 5 giây sau lần tự lưu kế tiếp. Collection đã có đủ nội dung mới kèm `!`. Cảnh báo đỏ vẫn yêu cầu “thử lại sau”. Đóng mở Lịch hoa thì cảnh báo mới biến mất. Tái hiện riêng cho cả hai ô trên cả hai bản Anki. Khi tiếp tục gửi một bài đã lưu lại thành công, bảng thậm chí có thể hiện đồng thời “Chưa lưu được” và “Đã sửa hôm nay”. Cần xóa cảnh báo của thao tác trước khi lần thử lại đã thành công. [Xử lý kết quả ghi](../../../kotoba_batake/web/calendar.js#L703)

## Các bộ test và điều kiện chạy

Chạy trên Linux với hồ sơ và collection dùng một lần, múi giờ Việt Nam. Dùng gói đã giải nén cho các bài tự động và trình cài add-on của Anki cho các ca chuyển phiên bản.

| Phép kiểm | Kết quả của lượt QA này |
|---|---|
| `tests/run_all.sh` trên gói phát hành | **59/59 kịch bản**, exit 0. Gồm kiểm lõi, collection Anki thật, máy chủ đồng bộ cục bộ và trang web trên Chromium. Hai đợt kiểm dữ liệu đạt 779/779 và 2.047/2.047, kiểm lỗi lưu trữ 172/172, phục hồi 45/45. |
| Anki 26.9.4 · Python 3.12.14 · Qt 6.12 | Trang trí và giao diện bốn tiếng 35/35, tiếng Đức/Pháp và báo 60/60, bảng ôn/cây deck/bản thử 87/87, ngôn ngữ vườn 5/5, mở vườn và ôn thẻ thật 12/12, sửa thẻ và pinyin 40/40. Phục hồi dữ liệu 18/18, khóa lựa chọn khi đang viết báo 36/36. |
| Anki 23.10.1 · Python 3.9.25 · Qt 6.6 | Chạy lại trên cùng gói. Trang trí và chữ dài đạt 35/35, trộn ngôn ngữ 5/5, ôn thẻ thật 12/12. Kiểm riêng bằng Python 3.9 đạt 66/66. |
| Cài đè và quay lại phiên bản cũ | Cài 1.31.3 → 1.35.1 bằng trình quản lý add-on đạt 19/19. Chu trình 1.35.1 → 1.31.3 → 1.35.1 đạt 26/26. Có đóng và mở lại Anki, so collection, `user_files`, cấu hình và tiến độ. |
| Thử ngẫu nhiên bổ sung | 1.120 lệnh giao diện với seed `20261118` giữ bất biến ví và đồ, không có ngoại lệ JavaScript chưa xử lý. Ba seed mới `20261118, 11835, 74001`, mỗi seed 600 thao tác có lỗi đọc/ghi mô phỏng, cho kết quả ví khớp đối chứng cả ba lượt. |
| Bố cục | Đo và xem ảnh QtWebEngine ở 1366×768, 1024×640 và 800×600. Lịch chuyển từ hai cột sang một cột. Cả ba cỡ đều cuộn tới ô viết, nhận focus và nhập được, không tràn ngang. |
| Đồng bộ qua giao diện Anki | `e2e_1312` đạt **46/47** ở cả ba lượt, gồm lần chạy lại cuối trên 26.9.4. Cả ba cùng trượt ở một ca. Ca đó đọc ô thông báo sau 500 ms, khi hướng dẫn cấu hình trường còn hiển thị. Theo dõi DOM thấy đúng câu “Thẻ này vừa được ôn hoặc sửa ở chỗ khác — sang thẻ kế tiếp.” xuất hiện **1,16 giây sau thời điểm kiểm tra**. Các kiểm tra thẻ không bị chấm hai lần, ví, nhật ký và tải toàn bộ collection đều đạt. [Assertion thời gian](../../../tests/anki/e2e_1312.js#L231) · [Hàng chờ thông báo](../../../kotoba_batake/web/garden.js#L1378) |

### Lượt kiểm tra cuối trên cùng commit

- Giải nén lại gói, đối chiếu CRC và nội dung của 79 tệp. Cài vào hồ sơ mới cho mỗi kịch bản giao diện. Đã tái hiện cả năm P1 trên Anki 23.10.1 và 26.9.4, gồm cả thao tác bỏ chọn báo Đức bằng ô chọn thật. Với lỗi 12, cả hai phiên bản đều được thử qua trình nhập `.colpkg` và đồng bộ hai collection, với đối chứng đóng Lịch hoa trước mỗi thao tác.
- **Đính chính số lượng hồi quy.** `tests/run_all.sh` gọi **59 kịch bản**. Báo cáo đầu đếm thêm chín tiêu đề bên trong `test_offline.py` nên ghi thành 68. Lượt đầu và lượt cuối với seed `83101` đều đạt **59/59**, mã thoát 0. Riêng bộ lưu trữ nhận danh sách seed, trong khi ba chương trình hồi quy khác yêu cầu một số nguyên. Lần truyền danh sách vào toàn bộ trình chạy làm ba chương trình dừng ở bước đọc tham số.
- Kiểm thêm **1.140 thao tác lưu trữ** có đối chứng với seed `83101`, `31042`, `95138`, mỗi seed 380 thao tác. Các lượt tương ứng phát sinh 68, 68 và 69 lần lỗi đọc/ghi mô phỏng. Ví cuối mỗi lượt khớp đối chứng. Bộ này đạt **83/83**. [Phép kiểm lưu trữ](../../../tests/core/test_1333.py#L488)
- Trên 26.9.4, kịch bản nhập, xuất, khôi phục và **Check Database** đạt **43/43**, bao gồm ví, lượt ôn và nguồn báo. Trên 23.10.1 kịch bản đạt **40/40**. Kịch bản bỏ qua đường “Mở bản sao lưu” của Anki trên phiên bản này vì thiếu hàm `_start_restore_backup`. Phần nhập `.colpkg` vẫn chạy. Kịch bản giao diện trên 26.9.4 đạt **49/49** với seed `83101`, gồm 500 phím, 300 lượt bấm chuột, 24 lần đổi cỡ từ 720×520 đến 2560×1440 và kiểm độ tương phản. Các lượt chạy đều dùng hồ sơ mới. [Kịch bản khôi phục có sẵn](../../../tests/anki/e2e_1331.js) · [Kịch bản giao diện](../../../tests/anki/e2e_1303.js)
- Cài lại bằng trình quản lý add-on và khởi động lại Anki qua các bước. Nâng từ 1.31.3 đạt **19/19**. Chu trình 1.35.1 → 1.31.3 → 1.35.1 đạt **26/26**. [Kịch bản nâng bản](../../../tests/anki/e2e_capnhat.js) · [Kịch bản hạ rồi nâng lại](../../../tests/anki/e2e_habanh.js)

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
