"""Tạo bảng ca kiểm thử, ảnh log có nhãn, metadata và kiểm tra liên kết.
Ảnh log là ảnh kết quả JSON thật, không phải ảnh giao diện sản phẩm.
"""
import hashlib
import html
import json
import os
import re
import subprocess
from collections import Counter
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
from PyQt6.QtCore import QSizeF
from PyQt6.QtGui import QColor, QFont, QImage, QPainter, QTextDocument
from PyQt6.QtWidgets import QApplication

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
BASE = "1984446d6917192426510c4cd685e2797641defd"
app = QApplication([])
core = json.loads((ROOT / "logs/core-extra.json").read_text())
ui = json.loads((ROOT / "logs/ui-extra.json").read_text())
all_cases = core + ui
counts = Counter(x["status"] for x in all_cases)
assert counts["ERROR"] == 0
assert len({x["id"] for x in all_cases}) == len(all_cases)
assert len(set(x["finding"] for x in all_cases if x["status"] == "FAIL")) == 13

titles = {
"F01":"Đồ tự làm trở lại sau khi cất", "F02":"Bài hợp lệ bị cắt khi lưu", "F03":"Đóng nhanh làm mất cài đặt",
"F04":"Esc trong composition đóng Lịch hoa", "F05":"Trần 0 hiển thị thành 40", "F06":"Thời tiết vườn khác lời nhắc báo",
"F07":"Thông báo rơi khỏi hàng chờ", "F08":"Cache ngôn ngữ qua hồ sơ", "F09":"Kho điểm ảnh dùng backup hồ sơ khác",
"F10":"Trần bù xu phụ thuộc chia đợt", "F11":"Revlog tương lai được tính sớm", "F12":"Nhiệm vụ khuyết trường gây KeyError",
"F13":"Mốc giai đoạn không tăng dần",
}
for fid, title in titles.items():
    samples = [x for x in all_cases if x["finding"] == fid and x["status"] == "FAIL"][:3]
    blocks = []
    for x in samples:
        actual = x['actual']
        if isinstance(actual,dict) and isinstance(actual.get('text'),str) and len(actual['text'])>120:
            actual=dict(actual, text=actual['text'][:80]+' … [đầy đủ trong JSON]', tail=actual['text'][-40:])
        blocks.append("<h3>" + html.escape(x["id"]+" · "+x["name"]) + "</h3><p><b>Kỳ vọng:</b> " + html.escape(x["expected"]) + "</p><pre>" + html.escape(json.dumps(actual, ensure_ascii=False, indent=2)) + "</pre>")
    doc = QTextDocument()
    doc.setDefaultFont(QFont("Noto Sans", 13))
    doc.setHtml("<html><style>body{color:#17243a}h1{font-size:23px}h2{color:#b32932}h3{font-size:16px}pre{font-family:monospace;font-size:13px;white-space:pre-wrap;background:#f0f3f8;}p{line-height:1.3}</style><body><p><b>ẢNH LOG KIỂM THỬ · KHÔNG PHẢI ẢNH GIAO DIỆN</b></p><h1>"+fid+" · "+title+"</h1><p>ことば畑 1.25.3 · commit 1984446 · chạy lại 11/11/2026<br>Nguồn: logs/core-extra.json và logs/ui-extra.json</p><h2>FAIL — kết quả thực tế khác kỳ vọng</h2>"+"".join(blocks)+"</body></html>")
    doc.setTextWidth(1070)
    img = QImage(1130, int(doc.size().height())+60, QImage.Format.Format_ARGB32)
    img.fill(QColor("white"))
    painter=QPainter(img)
    painter.translate(30,30)
    doc.drawContents(painter)
    painter.end()
    assert img.save(str(ROOT / "anh" / (fid.lower()+"-log.png")))

report = (ROOT / "BAO_CAO.md").read_text()
report = report.split("\n<!-- GENERATED -->")[0]
report = re.sub(r'\*\*Đã hoàn tất bản dựng lại:\*\* .*?trong Git để tải cả nhánh được\.',
    "> Trạng thái tạm thời: đang bổ sung kiểm thử giao diện và ảnh mới. Kết quả lõi đã được lưu lên nhánh để tránh mất bản duy nhất.", report)
report = re.sub(r'- \d+ kịch bản lõi bổ sung:.*?\[script chạy lại\]\(kich_ban/audit_core.py\)\.',
    f"- {len(core)} kịch bản lõi bổ sung: **{sum(x['status']=='PASS' for x in core)} PASS, {sum(x['status']=='FAIL' for x in core)} FAIL, 0 ERROR**. Nhiều ca FAIL cùng tái hiện một lỗi ở các phòng / cỡ / cách chia đợt khác nhau, không phải từng lỗi độc lập. [JSON đầy đủ](logs/core-extra.json), [script chạy lại](kich_ban/audit_core.py).", report)
report = report.replace("> Trạng thái tạm thời: đang bổ sung kiểm thử giao diện và ảnh mới. Kết quả lõi đã được lưu lên nhánh để tránh mất bản duy nhất.",
    f"**Đã hoàn tất bản dựng lại:** {len(all_cases)} ca bổ sung, {counts['PASS']} PASS / {counts['FAIL']} FAIL / 0 ERROR, quy về 13 phát hiện độc lập. Ảnh và dữ liệu nằm cùng báo cáo trong Git để tải cả nhánh được.")
report = report.replace("- Các kết quả giao diện, ảnh và bảng toàn bộ kịch bản được bổ sung ở bản hoàn tất.",
    f"- {len(ui)} ca giao diện / tích hợp bổ sung: {sum(x['status']=='PASS' for x in ui)} PASS / {sum(x['status']=='FAIL' for x in ui)} FAIL / 0 ERROR. [JSON](logs/ui-extra.json), [script](kich_ban/audit_ui.js).\n- Ma trận giao diện gồm 44 ca Nhà (11 tab × 4 cỡ), 28 ca màn chức năng (7 màn × 4 cỡ), 28 ca cảnh mùa (14 giao diện × ngày/đêm). PASS chỉ chứng minh điều kiện đo trong từng ca, không chứng minh mọi nội dung / tương tác của màn đó.")
for old, new in [
("Phát hiện lượt trước, đang xác nhận lại trong QtWebEngine.", "**Đã xác nhận lại trong QtWebEngine thật:** đóng sau 0 / 50 / 150 ms không ghi config; chờ 350 ms giữ được. Flush chủ động là đối chứng PASS."),
("Phát hiện bằng sự kiện DOM mô phỏng lượt trước;", "**Đã xác nhận lại bằng sự kiện DOM composition trong QtWebEngine:** Lịch hoa đóng khi nhận Esc có `isComposing=true`;"),
("Phát hiện lượt trước, đang xác nhận lại. `games.js`", "**Đã xác nhận lại trên giao diện:** cấu hình 0 hiện `0/40`; 1 / 40 / 200 hiện đúng. `games.js`"),
("Phát hiện lượt trước, đang xác nhận lại. Chọn tuyết", "**Đã xác nhận lại:** cảnh được đặt mưa / tuyết nhưng `_village_weather` trả `cả ngày nắng`; nắng là đối chứng PASS. Chọn tuyết"),
("Phát hiện lượt trước, đang xác nhận lại. `garden.js:toastNext`", "**Đã xác nhận lại:** sau A, B đã xếp hàng, C chen trong 80 ms; chỉ C hiện và sau khi C hết hạn B vẫn không trở lại. `garden.js:toastNext`"),
("Phát hiện lượt trước, đang xác nhận lại. `_lang_presence`", "**Đã xác nhận lại ở kiểm thử tích hợp có kiểm soát:** thay nguồn `model_infos` Nhật → Hàn, gọi hook đóng hồ sơ thật; B vẫn nhận `ja=true`. Chưa thay thế thử đổi hai hồ sơ người dùng bằng UI. `_lang_presence`"),
("Phát hiện lượt trước, đang xác nhận lại bằng collection thật.", "**Đã xác nhận lại bằng collection Anki thật:** 3 timestamp ở tương lai +60 / +300 / +900 giây trong cùng ngày đều được đếm. Dòng được xóa trong `finally` sau mỗi ca."),
]:
    if old in report:
        report = report.replace(old,new)

sources = {
"F01":("garden_core.py",791),"F02":("journal_core.py",350),"F03":("web/prefs.js",34),
"F04":("web/calendar.js",995),"F05":("web/games.js",1016),"F06":("__init__.py",1187),
"F07":("web/garden.js",1110),"F08":("__init__.py",1546),"F09":("garden_core.py",2900),
"F10":("garden_core.py",2445),"F11":("garden_core.py",2404),"F12":("garden_core.py",2275),"F13":("garden_core.py",1041),
}
for fid,(filename,line) in sources.items():
    if f"![{fid} · ảnh log kết quả chạy lại]" in report:
        continue
    key = re.search(r"^### "+fid+r" .*?$",report,re.M)
    insertion = f"\n\n[Mã liên quan](../../../kotoba_batake/{filename}#L{line}) · [Dữ liệu các ca](logs/core-extra.json) / [ca UI](logs/ui-extra.json)\n\n![{fid} · ảnh log kết quả chạy lại](anh/{fid.lower()}-log.png)\n\n*Ảnh trên là log của kịch bản chạy thật, không phải ảnh giao diện.*"
    assert key
    report = report[:key.end()] + insertion + report[key.end():]

report += "\n<!-- GENERATED -->\n\n## Hồi quy với các kịch bản UI có sẵn\n\n"
reg_log=(ROOT/'logs/ui-existing.log').read_text()
parts=re.split(r'^== (e2e[^\n]+)\n',reg_log,flags=re.M)
regression=[]
for i in range(1,len(parts),2):
    block=parts[i+1]
    summaries=re.findall(r'KẾT QUẢ: (\d+)/(\d+)',block)
    assert summaries, 'Kịch bản chưa hoàn tất: '+parts[i]
    passed,total=map(int,summaries[-1])
    regression.append(dict(script=parts[i],passed=passed,failed=total-passed))
assert len(regression)==4 and all(x['failed']==0 for x in regression)
report += '| Script có sẵn | PASS | FAIL |\n|---|---|---|\n'
for x in regression:
    report+=f"| `{x['script']}` | {x['passed']} | {x['failed']} |\n"
report += "\n[Log hồi quy](logs/ui-existing.log) · [Lệnh chạy lại](kich_ban/run_regression.sh). Những kiểm tra này không cộng vào 235 ca bổ sung. Không sửa các script gốc. Log lần gọi runner ban đầu có tên file nhập sai `e2e_1252.js` (file không có); đã sửa danh sách gọi, dùng đường dẫn ảnh tuyệt đối và chạy lại bốn script hiện có. Không coi lỗi gọi runner là lỗi sản phẩm. [Log lần gọi đầu](logs/ui-launcher-first-attempt.log).\n\n## Ảnh giao diện minh chứng và đánh giá\n\n"
images = [
("F01 · Bếp sau thao tác cất, món vẫn ở gian", "f01-kitchen-sau-cat.png"),
("F02 · trước lưu: 30 / 30 từ", "f02-bai-viet-truoc-luu.png"),
("F02 · mở lại: chỉ còn 20 / 30 từ", "f02-bai-viet-sau-mo-lai.png"),
("F04 · ô Nhật ký đang nhận composition trước Esc", "f04-ime-truoc-esc.png"),
("F04 · sau Esc bảng đã đóng", "f04-ime-sau-esc.png"),
("F05 · menu hiện trần 40 dù cấu hình 0", "f05-tran-xu-game-0.png"),
("F06 · cảnh tuyết thủ công; log đối chiếu lời nhắc ở trên", "f06-vuon-tuyet.png"),
("F07 · C hiện thay B đã xếp hàng", "f07-thong-bao-bi-chen.png"),
("Nhà 720×520 · 11 tab xuống hai hàng, phần danh sách ngắn", "layout-720x520-craft.png"),
("Nhà 1366×768 · Kho đồ", "layout-1366x768-inv.png"),
("Màn cấu hình trường 1024×640", "screen-1024x640-fields.png"),
("Lịch hoa 1920×1080", "screen-1920x1080-calendar.png"),
("Giao diện mùa Xuân ban ngày", "theme-spring-10.png"),
("Giao diện mùa Đông ban đêm", "theme-winter-22.png"),
]
for caption,name in images:
    assert (ROOT/"anh"/name).is_file(), name
    report += f"**{caption}**\n\n![{caption}](anh/{name})\n\n"
report += """### Nhận xét qua ảnh và phép đo

| Mục | Đánh giá | Cải tiến nên cân nhắc |
|---|---|---|
| Bản sắc | Màu, khung pixel, nhà và mùa đồng nhất; ngày/đêm có khác biệt rõ | Giữ cách vẽ và tên gọi nhất quán khi thêm màn mới |
| Cửa sổ nhỏ | 11 tab vẫn thấy được ở 720×520, không tràn ngang; tab xuống 2 hàng, vùng danh sách ngắn | Tìm món / nhóm tab theo tác vụ; thử lại Windows scale 125–200% trước khi chốt |
| Người mới | Chọn deck, Nhà, Trò chơi, báo, Lịch hoa cùng xuất hiện từ đầu; cấu hình trường là một bước nhận thức nữa | Hướng dẫn 3 bước ngắn, một hành động chính mỗi trạng thái trống |
| Dữ liệu nhập | Nhật ký và Luyện viết phân tách; giới hạn được hiện nhưng lưu chưa nhất quán (F02) | Sửa mất dữ liệu trước; thêm xác nhận đã lưu nhẹ, không thêm hộp thoại liên tục |
| Thông báo | Có liên kết mở tác vụ, nhưng lỗi hàng chờ và toast có thể che nội dung phía dưới | Sửa F07; xem vị trí và cách đóng bằng bàn phím, ưu tiên thông báo quan trọng |
| Bàn phím / IME | Có phím tắt và Esc, nhưng F04 làm hỏng thao tác gõ chọn chữ | Thử bộ gõ thật và quản lý focus khi đóng / mở bảng |
| Khả năng tiếp cận | Chưa có kiểm định WCAG / screen reader, chưa đo tương phản toàn bộ trạng thái | Kiểm tra focus nhìn thấy, nhãn icon, zoom 200%, giảm chuyển động, chữ Nhật / Việt trên từng OS |

Không đề xuất thay đổi bố cục nhà đã chốt chỉ vì sở thích. Ảnh offscreen và phép đo tràn ngang không thay thế thử cảm giác sử dụng bằng chuột / bàn phím trong nhiều ngày.

## Các ca phải bổ sung trên bản release (CHƯA CHẠY trong môi trường này)

| ID | Kịch bản | Kỳ vọng cần xác nhận |
|---|---|---|
| M01 | Cài mới từ AnkiWeb, không có khóa Gemini / không deck | Mở được, hướng dẫn đúng, không gọi mạng |
| M02 | Nâng từ 1.22 / 1.23 / 1.24 trên backup hồ sơ thật | Giữ ví, nhà, Xưởng, báo, nhật ký và mapping |
| M03 | Windows 11 + Microsoft Japanese IME, Esc / Enter / đổi bảng | Không mất composition, không kích hoạt phím tắt nhầm |
| M04 | macOS + Japanese IME, trackpad, Retina | Bố cục và thao tác đúng |
| M05 | Linux IBus / Fcitx, tiếng Việt Telex và tiếng Nhật | Gõ, lưu, phím tắt không xung đột |
| M06 | Windows scale 125 / 150 / 200%, cửa sổ laptop thấp | Không mất nút quan trọng; cuộn tới mọi chức năng |
| M07 | macOS / Windows giọng TTS thật, không có giọng, audio bị lỗi | Phát đúng / báo lỗi rõ; không treo |
| M08 | Gemini thật: khóa AIza / AQ, 401 / 403 / 429 / timeout | Không lộ khóa, retry / chờ đúng, không tính thành công giả |
| M09 | Báo Nhật + Anh + Việt nhiều ngày, từ vựng, bản dịch, truyện | Nội dung đúng phạm vi, liên tục và an toàn khi thiếu dữ liệu |
| M10 | Hết gói báo, ít xu, bật / tắt tự gia hạn, tick thêm ngôn ngữ | Không thu hai lần, không tự gọi khi chưa cho bắt đầu |
| M11 | Tắt mạng giữa tác vụ AI, đóng vườn, khởi động lại | Giữ bản nháp / trạng thái đúng, không có tác vụ ma |
| M12 | Gửi luyện viết và viết báo cùng lúc | Không mất kết quả / thông báo; hạn mức từng loại đúng |
| M13 | Đồng bộ AnkiWeb A → điện thoại → A | Lượt ôn / xu / mục tiêu không trùng, FSRS giữ nguyên |
| M14 | Hai máy viết nhật ký cùng tháng rồi đồng bộ khác thứ tự | Hành vi xung đột đúng tài liệu, không nhận nhầm hồ sơ |
| M15 | Hai máy khác phiên bản chỉnh nhà / Xưởng rồi đồng bộ | Không mất món lạ, không hồi sinh món đã cất |
| M16 | Giờ máy lệch ±1h / ±1 ngày, đổi timezone, DST | Ngày Anki và trần xu không sai; lượt tương lai được hoãn |
| M17 | Dùng vườn qua mốc đổi ngày Anki khi đang ôn / viết | Nhiệm vụ, thưởng và nhật ký chuyển ngày đúng |
| M18 | Collection 100k+ note, nhiều template / deck lọc / media | Mở và đổi deck ở thời gian chấp nhận; không treo UI |
| M19 | Xưởng đầy 60 mẫu, nhiều vùng / giống, mã chia sẻ lớn | Có thể tìm, sửa, xóa; báo giới hạn rõ |
| M20 | Kill Anki giữa lưu, đĩa đầy, thư mục chỉ đọc | Không ghi file nửa chừng / mất ví; khôi phục hợp lý |
| M21 | Backup / restore hồ sơ, đổi tên / đường dẫn hồ sơ | Ảnh, quota, cache và dữ liệu riêng đúng chủ |
| M22 | Zoom 200%, chỉ bàn phím, screen reader | Mọi hành động chính truy cập được, nhãn / focus rõ |
| M23 | Chế độ tối, giảm chuyển động, tắt hiệu ứng / âm thanh | Chữ đọc được, tắt đúng ở mọi màn |
| M24 | Đóng / mở liên tiếp và dùng thật 7 ngày | Không tích lũy timer / rò bộ nhớ / tác vụ nền |
| M25 | Gói .ankiaddon cuối khớp mã đã test, cài trên Anki cũ nhất hỗ trợ | Không thiếu asset / lỗi API; kết quả áp dụng đúng gói phát hành |

Các ca M01–M25 là kế hoạch kiểm thử, **không được cộng vào số PASS**.

## Thứ tự ổn định trong 1–2 tuần

1. Hai ngày đầu: F01 / F02 và hồi quy vòng đời dữ liệu; không thêm tính năng trước khi ngăn mất chữ và phục hồi đồ sai.
2. Ngày 3–5: F03 / F07 / F08 / F09, rồi F06 / F10 / F11; test lại đóng nhanh, hai hồ sơ và nhiều đợt đồng bộ.
3. Ngày 6–8: kiểm thử OS / IME / DPI, cài gói thật, các luồng Gemini và đồng bộ thật trong bảng M.
4. Phần thời gian còn lại: dùng thử có giám sát với vài người mới, ghi chỗ bối rối, đóng băng chức năng và chạy hồi quy trên đúng gói phát hành.

Điều kiện đề xuất để giới thiệu rộng: không còn P1, lỗi dữ liệu / hồ sơ đã xử lý hoặc có quyết định rõ, các luồng cài mới–ôn–đồng bộ–mở lại chạy được trên nền tảng hỗ trợ. Đây là đề xuất ưu tiên, không phải xác nhận phiên bản mới trên master đã đạt.

## Danh mục đầy đủ các ca bổ sung đã chạy

Kết quả FAIL thể hiện kỳ vọng chưa đạt. Chi tiết đầu vào / đầu ra đầy đủ nằm trong JSON; bảng rút gọn để tìm id và tái hiện. Các biến thể cùng một lỗi không được tính thành lỗi độc lập.

| ID | Kịch bản | Kỳ vọng | Kết quả | Phát hiện |
|---|---|---|---|---|
"""
def cell(s):
    return str(s).replace("|","\\|").replace("\n"," ")
for x in all_cases:
    report += "| "+" | ".join(cell(x[k]) for k in ["id","name","expected","status","finding"])+" |\n"

status = subprocess.check_output(["git","diff","--name-only",BASE,"--","kotoba_batake","tests","kotoba_batake.ankiaddon"],cwd=REPO,text=True)
assert not status.strip(), "Mã sản phẩm / test có sẵn đã thay đổi: "+status
hashes = {str(p.relative_to(REPO)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (REPO/"kotoba_batake").rglob('*') if p.is_file() and '__pycache__' not in p.parts}
meta = dict(baseline=BASE,version="1.25.3",python="3.13.5",anki="26.09.4",qt="6.12.0",node="24.22.1",cases=len(all_cases),counts=dict(counts),findings=13,regression=regression,source_sha256=hashes,package_sha256=hashlib.sha256((REPO/'kotoba_batake.ankiaddon').read_bytes()).hexdigest(),images=len(list((ROOT/'anh').rglob('*.png'))))
(ROOT/"logs/audit-metadata.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2))
(ROOT/"BAO_CAO.md").write_text(report)
missing=[]
for target in re.findall(r'\]\(([^)]+)\)',report):
    if target.startswith(('http:','https:','#')):continue
    if not (ROOT/target.split('#')[0]).resolve().is_file():missing.append(target)
assert not missing, missing
print(json.dumps(dict(cases=len(all_cases),counts=dict(counts),images=meta['images'],links_ok=True,product_unchanged=True),ensure_ascii=False))
