"""Đóng bản mẫu thành một HTML không cần mạng hay máy chủ; không đóng gói add-on."""
from pathlib import Path

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="nha.css">', "<style>\n" + (root / "nha.css").read_text() + "\n</style>")
for name in ("sprites.js", "nha.js"):
    script = (root / name).read_text().replace("</script", r"<\/script")
    html = html.replace('<script src="' + name + '"></script>', "<script>\n" + script + "\n</script>")
(root / "XEM_THU.html").write_text(html)
print("XEM_THU.html:", len(html.encode()), "bytes; HTML/CSS/Canvas/JS, không có tài nguyên ngoài.")
