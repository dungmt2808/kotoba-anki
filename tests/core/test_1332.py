"""1.33.2 — việc chạy song song + câu chữ gọn (offline, soát mã; chạy thật ở anki/e2e_1332.js).

Người dùng: "ví dụ hành động gemini đang viết báo đi. xong người dùng lại bỏ 1 tick ngôn ngữ để chọn ngôn ngữ khác thì lúc
đó sẽ xử lý sao … đang viết báo thì không được chọn đổi ngôn ngữ báo. viết xong rồi thì được chọn, nhưng số đó để ngày mai.
rà lại những chỗ diễn đạt dài dòng … chỗ nào nhiều nút hoặc nhiều thao tác quá cũng rút gọn bớt".

1. Python khoá khi Gemini đang viết (`ai_busy`): `ai:set` bỏ các mục đổi số đang viết (báo / trình độ / truyện / chủ đề /
   giọng đọc / nguồn), `ai:decks`, `ai:forget`, `ai:dir`, `ai:start`, đổi khoá (khi đã có khoá) bị từ chối với BUSY_MSG;
   mục không đổi số đang viết (Tự viết, giọng câu chép, gói báo) vẫn được.
2. "Từ mai": tick báo mới khi hôm nay đã viết xong số của báo khác → `gemini_later` = ngày mai, xác nhận nguồn Gemini (mai tự
   viết, không chờ "Bắt đầu viết"); `ai_start` từ chối báo "từ mai"; hôm nay chưa viết gì → chờ "Bắt đầu viết" như 1.22.4.
3. Giao diện (web/paper.js): mọi lựa chọn đó khoá + dòng "Gemini đang viết báo — xong mới đổi được."; báo xếp hàng "viết sau
   báo đang viết"; báo "từ mai" không có nút Viết.
4. Đồng bộ đang chạy: lệnh người dùng bấm → một câu "Anki đang đồng bộ — xong rồi bấm lại nhé." (≤ 1 lần / 3 giây, lệnh tự động
   không báo); chấm thẻ → trả lượt (`reviewRetry`) để bảng ôn không kẹt.
5. Câu chữ rút gọn (đúng danh sách đã sửa) + ⚙ gom "Báo lỗi · góp ý · khác" vào một dòng thu gọn (id cũ còn đủ).
6. Hợp đồng dữ liệu: khoá collection như 1.33.0; config.json không thêm mục (`gemini_later` chỉ ghi khi dùng).

Chạy: python test_1332.py ADDON
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

ADDON = os.path.abspath(sys.argv[1])
FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*p):
    with open(os.path.join(ADDON, *p), encoding="utf-8") as f:
        return f.read()


def func(code, head):
    m = re.search(re.escape(head) + r"\n(.*?)\n(?=\S|    def |\n    def )", code, re.S)
    return m.group(1) if m else ""


init = src("__init__.py")
pj = src("web/paper.js")

print("== 1. Python khoá khi Gemini đang viết")
ok('BUSY_MSG = "Gemini đang viết báo — xong mới đổi được."' in init, "câu BUSY_MSG")
ab = re.search(r"def ai_busy\(\) -> bool:\n(.*?)\n\n\n", init, re.S)
ok(bool(ab) and 'return bool(_ai["running"])' in ab.group(1), "ai_busy = việc nền đang chạy (hàng chờ sót lại không khoá mãi)")
ok('AI_LOCKED_SET = ("langs", "level", "story", "tone", "tones", "audio", "voice", "source")' in init, "ai:set khoá: báo / trình độ / truyện / chủ đề / giọng đọc / nguồn")
ok('AI_LOCKED = ("decks", "forget", "dir", "start")' in init, "khoá cả: deck lấy từ, xoá khoá, thư mục Claude Code, Bắt đầu viết")
on_ai = init[init.index("    def _on_ai(self, cmd: str) -> None:"):init.index("    def _choose_bao_dir(self)")]
ok("busy = ai_busy()" in on_ai and 'if busy and (action in self.AI_LOCKED or (action == "key" and ai.clean_key(config().get("gemini_key")))):' in on_ai,
   "lệnh bị khoá → trả BUSY_MSG, không làm gì (đổi khoá chỉ khoá khi đã có khoá)")
ok("p = {k: v for k, v in p.items() if k not in self.AI_LOCKED_SET}" in on_ai, "ai:set: bỏ mục bị khoá, vẫn lưu mục khác (Tự viết, giọng câu chép)")
ok('flash = {"flash": BUSY_MSG, "ok": False} if busy else {"flash": "Không còn giọng đọc nào cần tạo.", "ok": True}' in on_ai,
   '"Tạo giọng đọc" khi bận nói đúng lý do')
ok('"sub"' not in "".join(re.findall(r"AI_LOCKED[_A-Z]* = \(.*?\)", init)), "mua gói báo không bị khoá")

print("== 2. Báo vừa thêm sau khi đã viết xong → từ mai")
ok("def ai_later(" in init and "def _wrote_today(" in init, "ai_later / _wrote_today")
st = re.search(r"def ai_start\(reason: str.*?\n(.*?)\n    o = _ai_opts\(cfg\)", init, re.S).group(1)
ok("if lang in ai_later(cfg):" in st and '"Báo %s bắt đầu từ mai."' in st, "ai_start từ chối báo \"từ mai\" (mọi lý do: tự viết, Viết, Bắt đầu viết)")
ok("if _wrote_today(before):" in on_ai and "later[x] = tomorrow" in on_ai and 'conf[x] = "gemini"' in on_ai,
   "tick báo mới khi hôm nay đã viết xong báo khác → từ mai + xác nhận nguồn (mai tự viết)")
ok('changes["gemini_wait_langs"] = [x for x in new if (x in old_w or x not in before) and x not in later]' in on_ai,
   "hôm nay chưa viết gì → báo mới chờ \"Bắt đầu viết\" như 1.22.4; báo \"từ mai\" không chờ")
ok('"later": "" if today else ai_later().get(lang, ""),' in init and 'and not langs[x]["later"]] if key else []' in init,
   "dữ liệu tab: báo \"từ mai\" không lọt vào danh sách chờ")

print("== 3. Giao diện tab Nguồn báo khi đang viết")
ok('const BUSY = "Gemini đang viết báo — xong mới đổi được.";' in pj and "function lock(e, busy)" in pj, "hàm lock()")
for what, needle in (("ô Báo muốn nhận", 'if (busy) { cb.disabled = true; lab.classList.add("is-off"); lab.title = BUSY; }'),
                     ("dòng đang viết", 'el("span", "kb-ai-hint kb-ai-busyhint", BUSY)'),
                     ("Trình độ", 'aiRow(rows, "Trình độ", lock(pick('), ("Lấy từ", 'aiRow(rows, "Lấy từ", lock(sourcePicker(v, lang), busy));'),
                     ("Viết", 'lock(btn("kb-ai-main", L.error ? "Viết lại" : "Viết"'), ("Tạo giọng đọc", 'lock(btn("", "Tạo giọng đọc ('),
                     ("Đổi khoá", 'lock(btn("", "Đổi khoá"'), ("Xoá khoá", "det.appendChild(lock(f, busy));"),
                     ("Truyện", 'aiRow(opts, "Truyện", lock(pick('), ("Chủ đề truyện", "lock(b, true)"),
                     ("giọng đọc", "lock(voice, busy);"), ("Dùng Claude Code", 'lock(btn("", "Dùng Claude Code"')):
    ok(needle in pj, "khoá: " + what)
ok('"bắt đầu từ mai"' in pj and '"[i:hourglass] viết sau báo đang viết"' in pj, 'báo "từ mai" / báo xếp hàng')
ok("if (deckOpen[lang] && !busy)" in pj, "đang viết → ẩn danh sách chọn deck")

print("== 4. Đang đồng bộ: báo một câu, bảng ôn không kẹt")
br = init[init.index("    def _on_bridge(self, cmd: str) -> Any:"):init.index("    def _dispatch(self, cmd: str) -> Any:")]
ok('SYNC_MSG = "Anki đang đồng bộ — xong rồi bấm lại nhé."' in init and 'self._js("toast", SYNC_MSG)' in br, "câu báo khi đồng bộ")
ok("time.time() - self._sync_note > 3" in br and "not cmd.startswith(self.AUTO_CMDS)" in br, "≤ 1 lần / 3 giây, lệnh tự động không báo")
ok('AUTO_CMDS = ("ready", "refresh", "life:", "guest:", "ai:status", "paper:index", "game:exaudio")' in init, "danh sách lệnh tự động")
ok('if cmd.startswith("rv:ans:") and self._card is not None:\n                self._js("reviewRetry", {"cid": self._card.id})' in br, "chấm thẻ lúc đồng bộ → trả lượt (reviewRetry)")

print("== 5. Câu chữ gọn + ⚙ thu gọn")
NEW = {"web/paper.js": ["Nghe rồi gõ lại bằng chữ Hàn · Enter để kiểm tra.", "Bấm từ gạch chân để tra nghĩa · gạch chấm: từ mới",
                        "Máy kiểm tra từng số, còn lỗi thì không đưa vào hòm thư. Hết lượt miễn phí thì mai viết tiếp."],
       "web/games.js": ["Quạ mang nghĩa bay tới. Gõ đúng từ để đuổi.", "Câu ví dụ bị che một từ. Chọn từ đúng để điền."],
       "web/calendar.js": ["Thường 10–60 giây · đóng bảng được, xong sẽ báo."]}
OLD = ["Không tính hoa thường, dấu câu.", "trộm hạt", "Có thể đóng bảng hoặc làm việc khác", "nhận cả dạng biến đổi",
       "Gemini viết truyện → biên tập chấm → viết cả số"]
for f, xs in NEW.items():
    s = src(f)
    ok(all(x in s for x in xs), "câu mới ở " + f)
alljs = "".join(open(p, encoding="utf-8").read() for p in glob.glob(os.path.join(ADDON, "web", "*.js")))
for x in OLD:
    ok(x not in alljs, "không còn câu dài: " + x)
body = src("web/body.html")
d = body[body.index('<details class="kb-set-more">'):body.index("</details>", body.index('<details class="kb-set-more">'))]
ok("<summary>Báo lỗi · góp ý · khác</summary>" in d and all(x in d for x in ('id="kb-app-icon"', 'id="kb-report"', 'id="kb-mail"', 'id="kb-app-key"', 'id="kb-mobile-now"')),
   "⚙: Tạo biểu tượng, Báo lỗi, Góp ý, email, phím tắt, ôn trên điện thoại ở dòng thu gọn")
ok(all(x in body[:body.index('<details class="kb-set-more">')] for x in ('id="kb-cal-open"', 'id="kb-tour-open"', 'id="kb-ui-open"', 'id="kb-fields-open"', 'id="kb-paper-src"')),
   "⚙: 5 nút hay dùng vẫn ở ngoài")

print("== 6. Hợp đồng dữ liệu")
KEYS_1330 = ["kotoba_batake_edit", "kotoba_batake_events", "kotoba_batake_ext", "kotoba_batake_fields", "kotoba_batake_guests",
             "kotoba_batake_image", "kotoba_batake_journal_", "kotoba_batake_life", "kotoba_batake_mau", "kotoba_batake_mobile",
             "kotoba_batake_more", "kotoba_batake_nha", "kotoba_batake_paper", "kotoba_batake_paper_en", "kotoba_batake_paper_ko",
             "kotoba_batake_paper_nguon", "kotoba_batake_paper_src", "kotoba_batake_paper_vi", "kotoba_batake_paper_zh",
             "kotoba_batake_pdf", "kotoba_batake_photo", "kotoba_batake_px", "kotoba_batake_report", "kotoba_batake_rev",
             "kotoba_batake_season", "kotoba_batake_start", "kotoba_batake_state"]
keys = set()
for f in glob.glob(os.path.join(ADDON, "*.py")):
    keys |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', open(f, encoding="utf-8").read()))
ok(sorted(keys) == KEYS_1330, "khoá collection = 1.33.0")
cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
ok(len(cfg) == 39 and "gemini_later" not in cfg, "config.json 39 mục, không thêm gemini_later (chỉ ghi khi dùng)")

print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
