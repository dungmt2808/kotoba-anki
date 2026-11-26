"""1.36.4 — kiểm tra lần cuối trước phát hành (26/11): 2 lỗi tìm được bằng kịch bản ngoài bộ test có sẵn.

A. người mới cài trong mùa Giáng sinh: `_le_settle` tặng tủ lịch + cây thông TRƯỚC khi xét "người mới" → `is_new_player` thấy
   "đã có đồ" → không bao giờ có hướng dẫn 3 bước (Anki thật: tests/anki/e2e_nguoimoi_noel.js). Sửa: quà sự kiện ("le_…",
   "xmastree") không tính là đồ; mọi ca cũ của test_1261 giữ nguyên;
B. cảnh ông già Noel tối 24 / thư sáng 25 / cất đồ 1/1 tự bật khi màn chào còn che: `idle()` của le_noel.js xét màn chào
   (#kb-greet) và lớp chuyển cảnh (#kb-trans) bằng offsetParent — hai lớp đều position: fixed nên offsetParent luôn null, phép
   kiểm không bao giờ chặn. Sửa: GardenGreet.isGreeting() + getClientRects; hướng dẫn 3 bước (tour.js) chờ các lớp Giáng sinh;
   chạy hàm thật bằng node với DOM giả (đúng thứ tự: màn chào → cảnh đêm; lớp chuyển cảnh → chờ);
C. hợp đồng dữ liệu = 1.36.3 (6ce0b75): không thêm / đổi khoá collection, config.json y nguyên, chỉ đổi đúng các file đã sửa.
Chạy: python test_1364.py THƯ_MỤC_ADD_ON
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
import event_core as ev  # noqa: E402

FAIL = []
PASS = [0]
REF = "6ce0b75"        # 1.36.3 (bản người dùng định phát hành trước lần kiểm tra này)


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(msg)


def src(rel):
    with open(os.path.join(ADDON, rel), encoding="utf-8") as f:
        return f.read()


# =========================================================================================================
print("== A. người mới + quà sự kiện")
NEW = {"coins": 0, "waters": 0, "harvests": 0, "home": {"house": 0, "owned": {}}}
ok(ev.is_new_player(NEW), "hồ sơ mới (như 1.26.1)")
for owned, want, why in [
        ({"le_tulich": 1, "xmastree": 1}, True, "vừa nhận Tủ lịch + cây thông lúc mở vườn trong mùa"),
        ({"le_tulich": 1}, True, "chỉ có tủ lịch (cây thông ở Kho / đã có từ trước)"),
        ({"le_tulich": 1, "xmastree": 1, "le_tat": 1, "le_cautuyet": 1}, True, "món của ngăn tủ lịch / hộp quà"),
        ({"lantern": 1}, False, "đã mua đồ (như 1.26.1)"),
        ({"lantern": 1, "le_tulich": 1, "xmastree": 1}, False, "đồ mua + quà sự kiện → không phải người mới"),
        ({"xmastree": 1, "chair": 2}, False, "cây thông + ghế đã mua"),
        ({"": 1}, False, "khoá lạ (chuỗi rỗng) vẫn tính là đồ"),
]:
    w = dict(NEW, home={"house": 0, "owned": owned})
    ok(ev.is_new_player(w) is want, "%s → %s" % (why, "hướng dẫn" if want else "không"))
for k, v in (("coins", 3), ("waters", 1), ("harvests", 1)):
    ok(not ev.is_new_player(dict(NEW, home={"house": 0, "owned": {"le_tulich": 1, "xmastree": 1}}, **{k: v})),
       "có quà sự kiện + %s = %d → không" % (k, v))
ok(not ev.is_new_player(dict(NEW, home={"house": 2, "owned": {"le_tulich": 1}})), "đã xây nhà → không")
ok(not ev.is_new_player(None) and not ev.is_new_player({"coins": "x"}) and ev.is_new_player({}), "dữ liệu lạ không lỗi")
ok(ev.is_new_player({"home": {"owned": ["le_tulich"]}}) is False and ev.is_new_player({"home": {"owned": None}}),
   "owned sai kiểu: danh sách (khác rỗng) = có đồ, None = chưa có")
init = src("__init__.py")
ok(init.index("_le_settle(data[\"wallet\"]") < init.index("event_core.is_new_player(data[\"wallet\"])"),
   "(lý do lỗi) _le_settle chạy trước khi xét người mới — nên is_new_player phải bỏ qua quà sự kiện")

# =========================================================================================================
print("== B. lớp Giáng sinh và màn chào / hướng dẫn")
noel = src("web/le_noel.js")
m = re.search(r"function idle\(\) \{(.*?)\n  \}", noel, re.S)
body = m.group(1) if m else ""
code = re.sub(r"//[^\n]*", "", body)          # bỏ chú thích
ok(bool(body) and "offsetParent" not in code, "idle() không còn xét lớp position: fixed bằng offsetParent")
ok("GardenGreet.isGreeting()" in body and "getClientRects" in body, "idle() hỏi GardenGreet.isGreeting() + getClientRects")
css = src("web/garden.css")
ok(re.search(r"\.kb-greet \{[^}]*position: fixed", css) and re.search(r"\.kb-trans \{[^}]*position: fixed", css),
   "(lý do lỗi) .kb-greet / .kb-trans là position: fixed")
tour = src("web/tour.js")
tb = re.search(r"function busy\(\) \{(.*?)\n  \}", tour, re.S)
tb = tb.group(1) if tb else ""
ok(all(x in tb for x in ("kb-le-show", "kb-le-letter", "kb-le-packpop")), "hướng dẫn 3 bước chờ cảnh tối 24 / thư / cất đồ")

# hàm thật bằng node: DOM giả tối thiểu (offsetParent của phần tử fixed = null như trình duyệt)
JS = r"""
const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const els = {};
function mk(id, fixed) { return { id, hidden: false, style: {}, fixed, get offsetParent() { return this.fixed ? null : {}; },
  getClientRects() { return this.hidden ? [] : [1]; } }; }
global.window = global; global.document = { hidden: false, getElementById: (id) => els[id] || null,
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: {} };
global.getComputedStyle = (e) => ({ display: e.hidden ? 'none' : 'block', visibility: 'visible' });
global.addEventListener = () => {};
let greeting = false;
global.GardenGreet = { isGreeting: () => greeting };
const m = code.match(/function idle\(\) \{[\s\S]*?\n  \}/);
const $ = (id) => document.getElementById(id);
const idle = eval('(' + m[0] + ')');
const out = {};
out.empty = idle();
els['kb-greet'] = mk('kb-greet', true); greeting = true;
out.greet = idle();
greeting = false; els['kb-greet'].hidden = true;
out.greetDone = idle();
delete els['kb-greet'];
els['kb-trans'] = mk('kb-trans', true);
out.trans = idle();
els['kb-trans'].style.opacity = '0';
out.transFaded = idle();
els['kb-trans'].hidden = true; els['kb-trans'].style.opacity = '';
out.transOff = idle();
els['kb-home'] = mk('kb-home', false);
out.home = idle();
console.log(JSON.stringify(out));
"""
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
    f.write(JS)
    jsf = f.name
try:
    r = subprocess.run(["node", jsf, os.path.join(ADDON, "web", "le_noel.js")], capture_output=True, text=True, timeout=60)
    res = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else None
except (OSError, ValueError, subprocess.TimeoutExpired) as err:
    res = None
    print("  (node: %s)" % err)
if res is None:
    ok(False, "chạy idle() bằng node: %s" % (r.stderr.strip()[:300] if 'r' in dir() else "không chạy được"))
else:
    ok(res["empty"] is True, "không có gì che → cảnh được bật")
    ok(res["greet"] is False, "màn chào đang hiện (position: fixed) → chờ (1.36.3: bật luôn dưới màn chào)")
    ok(res["greetDone"] is True, "màn chào xong → bật")
    ok(res["trans"] is False and res["transFaded"] is True and res["transOff"] is True,
       "lớp chuyển cảnh đang chạy → chờ; mờ hẳn / ẩn → bật")
    ok(res["home"] is False, "bảng Nhà đang mở → chờ (như 1.36.2)")
os.unlink(jsf)

# =========================================================================================================
print("== C. hợp đồng dữ liệu = 1.36.3 (%s)" % REF)
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(src(fn)))
try:
    names = subprocess.run(["git", "-C", ROOT, "ls-tree", "-r", "--name-only", REF, "kotoba_batake/"], capture_output=True,
                           text=True, check=True).stdout.split()
except Exception as err:      # noqa: BLE001
    names = []
    print("  (không có lịch sử git: %s)" % type(err).__name__)
if names:
    old_keys = set()
    changed = []
    for fn in names:
        rel = fn[len("kotoba_batake/"):]
        old = subprocess.run(["git", "-C", ROOT, "show", REF + ":" + fn], capture_output=True).stdout
        if rel.endswith(".py"):
            old_keys |= set(KEY_RE.findall(old.decode("utf-8")))
        p = os.path.join(ADDON, rel)
        if os.path.exists(p):
            with open(p, "rb") as f:
                if f.read() != old:
                    changed.append(rel)
        else:
            changed.append(rel + " (mất)")
    ok(cur_keys == old_keys, "khoá collection trong mã = 1.36.3: %s" % sorted(cur_keys ^ old_keys))
    old_cfg = json.loads(subprocess.run(["git", "-C", ROOT, "show", REF + ":kotoba_batake/config.json"], capture_output=True,
                                        text=True, check=True).stdout)
    ok(json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")) == old_cfg, "config.json y nguyên 1.36.3")
    allowed = {"event_core.py", "web/le_noel.js", "web/tour.js", "manifest.json", "README.md"}
    ok(set(changed) <= allowed, "chỉ đổi: %s (ngoài danh sách: %s)" % (sorted(changed), sorted(set(changed) - allowed)))
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(tuple(int(x) for x in man.get("human_version", "0").split(".")) >= (1, 36, 4), "manifest: 1.36.4 (" + man.get("human_version", "") + ")")

print()
print("KẾT QUẢ: %d/%d" % (PASS[0], PASS[0] + len(FAIL)))
if FAIL:
    print("HỎNG:")
    for f in FAIL:
        print("  - " + f)
    sys.exit(1)
