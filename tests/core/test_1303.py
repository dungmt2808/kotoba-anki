"""Test offline 1.30.3 (python thường + node): giao diện ấm hơn, câu chữ đồng bộ, vườn mở qua ngày mới, Esc ở bảng ⚙.

- Bảng màu: mọi màu khung / chữ / nền bảng của garden.css đi qua biến ở :root (không còn #1b1b2f rời rạc); chữ chính / chữ
  phụ / chữ mờ đủ tương phản (WCAG ≥ 4,5:1, chữ rất mờ ≥ 3:1) trên mọi nền giấy; mực vẫn đủ đậm cho viền pixel; nền trang theo
  giờ (sky.js) ngày sáng ấm, đêm tối, chữ trên nền trang (tên vườn có viền) vẫn đọc được; ô chọn / thanh kéo cùng một màu.
- Câu chữ: soát mọi chuỗi giao diện trong web/*.js + body.html — không còn "add-on" (trừ đường dẫn menu Tools → Add-ons và
  khu Sửa hình của người làm add-on), "Thôi xem thử", "Mùa & Lễ hội", "nhấn", "click", emoji màu; mọi chỗ ghép số với " xu"
  đều qua kbXu (một kiểu viết số "4.860 xu"); nút / chú thích thiếu xu là "Thiếu N xu"; nút huỷ là "Huỷ".
- Số xu: kbXu (JS) và garden_core.xu (Python) cùng kết quả; câu báo thiếu xu của Python "Thiếu N xu (cần M xu)."
- Vườn để mở qua ngày mới: GardenDialog có đồng hồ 60 giây + _check_day, mở lại cửa sổ đang mở cũng xét ngày; greet.js chào
  ngày mới (không chào đè lên bảng đang mở).
- Esc khi bảng ⚙ đang mở chỉ đóng bảng ⚙ (1.30.2: Anki đóng cả cửa sổ vườn).
- Ô cỏ trống có hoa dại / cỏ ba lá (chỉ ô không có cây, không có giao diện mùa).

Chạy: python test_1303.py THƯ_MỤC_ADD_ON
"""
import json, os, re, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, STUBS)
import garden_core as core

WEB = os.path.join(ADDON, "web")
FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def read(name):
    with open(os.path.join(WEB, name), encoding="utf-8") as f:
        return f.read()


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = hex2rgb(c)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


css = read("garden.css")

print("== bảng màu ấm (biến ở :root)")
root = re.search(r":root\s*\{(.*?)\}", css, re.S).group(1)
tok = dict(re.findall(r"--(kb-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", root))
need = ["kb-ink", "kb-ink-2", "kb-ink-3", "kb-ink-4", "kb-line", "kb-paper", "kb-paper-warm", "kb-butter", "kb-cream",
        "kb-cream-2", "kb-mist", "kb-green", "kb-peach", "kb-lilac", "kb-accent", "kb-off"]
ok(all(k in tok for k in need), "đủ biến màu: " + ", ".join(k for k in need if k not in tok) if not all(k in tok for k in need) else "đủ %d biến màu" % len(need))
body = css[css.index("}", css.index(":root")) + 1:]
ok("#1b1b2f" not in body.lower(), "garden.css: không còn mực #1b1b2f rời rạc ngoài :root (đổi tông ở một chỗ)")
ok(not re.search(r"rgba\(27,\s*27,\s*47", body), "nền mờ / bóng dùng rgba(var(--kb-ink-rgb), …)")
rgb = re.search(r"--kb-ink-rgb:\s*(\d+),\s*(\d+),\s*(\d+)", root)
ok(rgb and tuple(int(x) for x in rgb.groups()) == hex2rgb(tok["kb-ink"]), "--kb-ink-rgb khớp --kb-ink")
surfaces = ["kb-paper", "kb-paper-warm", "kb-butter", "kb-cream", "kb-cream-2", "kb-mist"]
for name, lim in (("kb-ink", 10), ("kb-ink-2", 4.5), ("kb-ink-3", 4.5), ("kb-ink-4", 3.0)):
    worst = min((contrast(tok[name], tok[s]), s) for s in surfaces)
    ok(worst[0] >= lim, "chữ --%s trên mọi nền giấy ≥ %.1f:1 (thấp nhất %.2f trên --%s)" % (name, lim, worst[0], worst[1]))
for name in ("kb-green", "kb-peach", "kb-lilac", "kb-off"):
    ok(contrast(tok["kb-ink"], tok[name]) >= 7, "chữ mực trên nút --%s ≥ 7:1 (%.2f)" % (name, contrast(tok["kb-ink"], tok[name])))
ok(lum(tok["kb-ink"]) < 0.04, "mực đủ đậm cho viền pixel (độ sáng %.3f)" % lum(tok["kb-ink"]))
r, g, b = hex2rgb(tok["kb-ink"])
ok(r > b, "mực tông ấm (nâu, đỏ > lam): " + tok["kb-ink"])
ok(re.search(r'input\[type="radio"\], input\[type="checkbox"\], input\[type="range"\]\s*\{\s*accent-color:\s*var\(--kb-accent\)', css)
   and not re.search(r"accent-color:\s*#", css), "mọi ô chọn / ô đánh dấu / thanh kéo cùng --kb-accent")
ok(".kb-say {" in css and re.search(r"\.kb-say \{[^}]*top:\s*64px", css), "bong bóng lời linh vật ở dưới linh vật (không đè tên vườn / chip)")

print("== nền trang theo giờ (sky.js)")
sky = read("sky.js")
day = re.search(r'PAGE_DAY = "(#[0-9a-f]{6})", PAGE_NIGHT = "(#[0-9a-f]{6})"', sky)
ok(day is not None, "sky.js có PAGE_DAY / PAGE_NIGHT")
if day:
    d, n = day.groups()
    ok(lum(d) > 0.6 and hex2rgb(d)[0] > hex2rgb(d)[2], "nền trang ban ngày sáng, ấm: " + d)
    ok(lum(n) < 0.05, "nền trang ban đêm tối: " + n)
    ok(contrast(tok["kb-ink"], d) >= 7, "viền / bóng mực nổi trên nền trang ban ngày (%.2f)" % contrast(tok["kb-ink"], d))
    ok(contrast(tok["kb-paper"], n) >= 7, "thẻ giấy nổi trên nền trang ban đêm (%.2f)" % contrast(tok["kb-paper"], n))
js = r"""
const fs = require('fs'), vm = require('vm');
const ctx = { console, Date, Math, localStorage: { getItem: () => null, setItem: () => 0 } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2] + '/web/sky.js', 'utf8') + ';this.S = GardenSky;', ctx);
const S = ctx.S, out = {};
for (const h of [3, 6, 9, 12.5, 18.4, 22]) { S.set('mode', 'fixed'); S.set('fixedHour', h); S.set('weather', 'sunny'); out[h] = S.state().page; }
S.set('weather', 'rain'); S.set('fixedHour', 12.5); out.rain = S.state().page;
console.log(JSON.stringify(out));
"""
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
    f.write(js)
try:
    pages = json.loads(subprocess.run(["node", f.name, ADDON], capture_output=True, text=True, timeout=60).stdout)
except Exception as e:
    pages = {}
    print("    node lỗi:", e)
ok(pages and lum(pages["12.5"]) > 0.6 and lum(pages["3"]) < 0.06, "trưa sáng (%s), 3 giờ sáng tối (%s)" % (pages.get("12.5"), pages.get("3")))
ok(pages and hex2rgb(pages["18.4"])[0] - hex2rgb(pages["18.4"])[2] > hex2rgb(pages["12.5"])[0] - hex2rgb(pages["12.5"])[2],
   "hoàng hôn ấm hơn ban trưa (%s / %s)" % (pages.get("18.4"), pages.get("12.5")))
ok(pages and contrast(pages["rain"], pages["12.5"]) < 1.9, "trời mưa chỉ xám nhẹ đi (%s)" % pages.get("rain"))

print("== câu chữ trên giao diện")
VI = re.compile(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.I)
STR = re.compile(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`|>([^<>]+)<')
COLOR_EMOJI = re.compile("[\U0001F300-\U0001FAFF\U0001F000-\U0001F2FF☀-⛿✀-➿]")
ALLOWED_SYM = set("✓✗✕♪✦♥★☆♨⚙✎☑☐")
issues = {"add-on": [], "thôi": [], "mùa & lễ hội": [], "nhấn / click": [], "emoji": [], "xu chưa qua kbXu": [], "còn thiếu": [],
          "toLocaleString": []}
files = [n for n in sorted(os.listdir(WEB)) if n.endswith(".js")] + ["body.html"]
total = 0
for name in files:
    for i, line in enumerate(read(name).split("\n"), 1):
        s = line.strip()
        if s.startswith(("//", "*", "/*")):
            continue
        code = re.sub(r"\s//\s.*$", "", line) if name.endswith(".js") else line
        for m in STR.finditer(code):
            t = next(g for g in m.groups() if g is not None)
            if not VI.search(t):
                continue
            total += 1
            where = "%s:%d %s" % (name, i, t[:50])
            low = t.lower()
            if "add-on" in low and "tools → add-ons" not in low and "mau_sua" not in low and "bản add-on" not in low:
                issues["add-on"].append(where)
            if re.search(r"(^|\s)thôi(\s|$)", low) and "thôi!" not in low and "thôi ♪" not in low:
                issues["thôi"].append(where)
            if "mùa & lễ hội" in low:
                issues["mùa & lễ hội"].append(where)
            if re.search(r"\bnhấn\b|\bclick\b", low):
                issues["nhấn / click"].append(where)
            if any(ch not in ALLOWED_SYM for ch in COLOR_EMOJI.findall(t)):
                issues["emoji"].append(where)
            if "còn thiếu " in low and " xu" in low:
                issues["còn thiếu"].append(where)
        if name.endswith(".js"):
            n_xu = len(re.findall(r'\+\s*" xu', code))
            if n_xu and len(re.findall(r"kbXu\(", code)) < n_xu:
                issues["xu chưa qua kbXu"].append("%s:%d %s" % (name, i, s[:90]))
            if "toLocaleString" in code:
                issues["toLocaleString"].append("%s:%d" % (name, i))
ok(total > 1500, "đã soát %d chuỗi tiếng Việt trên giao diện" % total)
for k, v in issues.items():
    ok(not v, "không còn %s%s" % (k, (": " + " | ".join(v[:4])) if v else ""))
ui = read("ui.js")
ok('el("button", "kb-btn kb-ask-no", "Huỷ")' in ui, "hộp hỏi: nút huỷ là \"Huỷ\" (như mọi nút huỷ khác)")
home = read("home.js")
ok("Chưa có nhà · xây ở tab Xây nhà" in home and "bấm món đồ để dời chỗ hoặc cất kho" in home, "gợi ý cảnh Nhà ngắn gọn")
ok('"Mở vườn ở"' in ui and '"Như cũ:' not in ui, "⚙ Giao diện: \"Mở vườn ở\", bỏ \"Như cũ\"")

print("== số xu một kiểu viết")
ok(core.xu(4860) == "4.860" and core.xu(1000000) == "1.000.000" and core.xu(999) == "999" and core.xu(0) == "0"
   and core.xu(-1500) == "-1.500" and core.xu("x") == "x", "garden_core.xu: 4.860, 1.000.000, 999, 0, -1.500, chữ giữ nguyên")
js2 = r"""
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[2] + '/web/icons.js', 'utf8');
const fn = src.slice(src.indexOf('function kbXu('), src.indexOf('var GardenIcons'));     // chỉ lấy hàm kbXu (phần icon cần DOM)
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fn + ';this.F = kbXu;', ctx);
console.log(JSON.stringify([4860, 1000000, 999, 0, -1500, 12.6, "x", null].map(ctx.F)));
"""
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
    f.write(js2)
r = subprocess.run(["node", f.name, ADDON], capture_output=True, text=True, timeout=60)
try:
    got = json.loads(r.stdout)
except Exception:
    got = r.stdout + r.stderr
ok(got == ["4.860", "1.000.000", "999", "0", "-1.500", "13", "x", "0"], "kbXu (JS) cùng kiểu: " + json.dumps(got, ensure_ascii=False))
st = core.GardenState(os.path.join(tempfile.mkdtemp(prefix="kb1303_"), "w.json")) if hasattr(core, "GardenState") else None
src = open(os.path.join(ADDON, "garden_core.py"), encoding="utf-8").read()
ok(src.count('raise HomeError(f"Thiếu {xu(') == 3 and "Chưa đủ xu" not in src, "Python: 3 chỗ báo thiếu xu đều \"Thiếu N xu (cần M xu).\"")

print("== vườn để mở qua ngày mới, Esc ở bảng ⚙")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok("self._day_timer = QTimer(self)" in init and "self._day_timer.start(60_000)" in init and "def _check_day(self)" in init,
   "GardenDialog: đồng hồ 60 giây gọi _check_day")
ok(re.search(r"if day != self\._day_seen:\s*\n\s*self\._day_seen = day[^\n]*\n\s*self\.refresh\(\)", init) is not None, "_check_day: ngày Anki đổi → ghi ngày rồi dựng lại vườn (lỗi thì không thử lại mỗi phút)")
ok("_dialog._check_day()" in init, "mở lại cửa sổ vườn đang mở cũng xét ngày mới")
ok(re.search(r"self\._js\(\"render\", data\)\s*\n\s*try:\s*\n\s*self\._day_seen = _today\(\)", init) is not None, "ghi ngày đã dựng sau mỗi lần dựng vườn")
greet = read("greet.js")
ok("function busy()" in greet and "!greet && !busy()" in greet and "lastDay" in greet, "greet.js: chào ngày mới, không chào đè lên bảng đang mở")
garden = read("garden.js")
ok(re.search(r'if \(e\.key !== "Escape" \|\| pop\.hidden \|\| e\.isComposing\) \{ return; \}\s*\n\s*e\.preventDefault\(\); e\.stopImmediatePropagation\(\); window\.__kbEscUsed = true;', garden) is not None,
   "Esc ở bảng ⚙: chỉ đóng bảng ⚙, báo Python là trang đã dùng Esc")
ok("drawGrass(ctx, ox, oy, seed, s, deco)" in garden and "e >= plants.length" in garden and "if (deco && !f)" in garden,
   "ô cỏ trống có hoa dại / cỏ ba lá (chỉ ô không có cây, không có giao diện mùa)")

print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d lỗi" % len(FAIL)))
sys.exit(1 if FAIL else 0)
