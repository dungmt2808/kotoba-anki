import re, html
def ids2str(ids): return "(" + ",".join(str(i) for i in ids) + ")"
def strip_html(s): return html.unescape(re.sub(r"<[^>]*>", "", s or ""))
