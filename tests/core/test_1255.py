"""Test offline cho 1.25.5 — admin sửa hình gốc (mau_core.py + nối dây), python thường + node.

- `mau_core`: làm sạch (khoá / khung / hàng / cỡ / số lượng), gộp gói + máy (máy thắng từng khung), lưu / bỏ một hình, đọc / ghi
  file (file hỏng → trống), file nhập (sai định dạng, trống, quá lớn), fuzz giá trị sai kiểu;
- nối dây: config `admin` mặc định tắt, lệnh `base:*` chỉ chạy khi bật, `fix.js` nạp trước các file hình, bốn nhóm đăng ký,
  `pack.py` đóng cả `mau_sua.json` ở gốc thư mục add-on (bản sửa đi kèm gói) nhưng bỏ bản của máy trong user_files/;
- `fix.js` (node): chỉ áp khi cùng cỡ + màu có trong bảng màu, giữ hình gốc, set() bỏ bản sửa thì về gốc.

Chạy: python test_1255.py THƯ_MỤC_ADD_ON
"""
import copy, json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import garden_core as core
import mau_core as mau

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1255_")
NODE = shutil.which("node")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


LAMP = ["...kkkk...", "..kRRRRk..", "...kkkk...", "....kbk..."]
print("== mau_core: làm sạch")
c = mau.clean({"v": 1, "sua": {"do:chochin": {"spr": LAMP}, "thu:shiba": {"sit": ["kk", "kk"], "walk0": ["k", "kk"]},
                               "xx:bad": {"spr": LAMP}, "do:": {"spr": LAMP}, "do:1abc": {"spr": LAMP},
                               "giong:ine": {"0": ["k.", ".k"], "bad name!": ["k"]}, "khach:neko": {"stand": ["k<"]},
                               "do:empty": {}}})
ok(sorted(c["sua"]) == ["do:chochin", "giong:ine", "thu:shiba"], "giữ khoá hợp lệ, bỏ nhóm lạ / id rỗng / id bắt đầu bằng số / ký tự lạ / khoá không còn khung: "
   + json.dumps(sorted(c["sua"])))
ok(c["sua"]["thu:shiba"] == {"sit": ["kk", "kk"]} and c["sua"]["giong:ine"] == {"0": ["k.", ".k"]}, "bỏ khung có hàng không đều / tên khung lạ")
ok(mau.clean(None) == {"v": 1, "sua": {}} and mau.clean([1]) == {"v": 1, "sua": {}} and mau.clean({"sua": "x"}) == {"v": 1, "sua": {}}, "kiểu sai → trống")
ok(not mau.clean({"sua": {"do:a": {"spr": ["k" * 65]}}})["sua"] and not mau.clean({"sua": {"do:a": {"spr": ["k"] * 65}}})["sua"],
   "quá 64 cột / 64 hàng → bỏ")
big = {"sua": {"do:a%d" % i: {"spr": ["k"]} for i in range(mau.MAX_KEYS + 50)}}
ok(len(mau.clean(big)["sua"]) == mau.MAX_KEYS, "tối đa %d hình" % mau.MAX_KEYS)
many = {"sua": {"do:a": {"f%d" % i: ["k"] for i in range(40)}}}
ok(len(mau.clean(many)["sua"]["do:a"]) == mau.MAX_FRAMES, "tối đa %d khung mỗi hình" % mau.MAX_FRAMES)

print("== mau_core: gộp, lưu, bỏ")
base = {"sua": {"do:chochin": {"spr": LAMP, "base": LAMP}, "do:fence": {"spr": ["kk"]}}}
over = {"sua": {"do:chochin": {"spr": ["k"] * 4}, "thu:shiba": {"sit": ["k"]}}}
m = mau.merge(base, over)
ok(m["sua"]["do:chochin"] == {"spr": ["k"] * 4, "base": LAMP} and "do:fence" in m["sua"] and "thu:shiba" in m["sua"],
   "gộp gói + máy: máy thắng từng khung, khung khác của gói giữ")
s = mau.set_fix(base, "do:chochin", {"spr": ["kk"]})
ok(s["sua"]["do:chochin"] == {"spr": ["kk"]}, "lưu một hình: thay hết khung cũ của hình đó")
for bad_key, bad_frames in (("xx:a", {"spr": ["k"]}), (None, {"spr": ["k"]}), ("do:a", {}), ("do:a", {"spr": ["k", "kk"]})):
    try:
        mau.set_fix({}, bad_key, bad_frames)
        ok(False, "lưu %r / %r phải báo lỗi" % (bad_key, bad_frames))
    except mau.MauError as err:
        ok(bool(str(err)), "lưu khoá / hình hỏng → MauError: " + str(err))
ok("do:fence" not in mau.remove(base, "do:fence")["sua"] and mau.remove(base, None)["sua"].keys() == base["sua"].keys(), "bỏ một hình")

print("== mau_core: file")
p = os.path.join(TMP, "a", "mau_sua.json")
mau.write(p, over)
ok(mau.read(p) == mau.clean(over), "ghi rồi đọc lại đúng")
open(p, "w").write("{hỏng")
ok(mau.read(p) == mau.clean(None) and mau.read(os.path.join(TMP, "khong_co.json")) == mau.clean(None), "file hỏng / không có → trống")
for text, want in (("{hỏng", "định dạng"), (json.dumps({"sua": {}}), "không có hình"), ("x" * (mau.MAX_FILE + 1), "quá lớn"), (None, "quá lớn")):
    try:
        mau.parse_upload(text)
        ok(False, "file nhập %r phải báo lỗi" % str(text)[:20])
    except mau.MauError as err:
        ok(want in str(err), "file nhập hỏng → " + str(err))
ok(mau.parse_upload(json.dumps(over))["sua"].keys() == mau.clean(over)["sua"].keys(), "file nhập đúng → đọc được")

print("== mau_core: fuzz")
BAD = [None, True, 0, -1, 1.5, "", "x", [], [None], {}, {"x": []}, [1, 2], "\u0000", "k" * 70]
sample = {"v": 1, "sua": {"do:chochin": {"spr": LAMP, "f1": LAMP}, "thu:shiba": {"sit": ["kk", "kk"]}}}


def nodes(x, path=()):
    yield path
    if isinstance(x, dict):
        for k, v in x.items():
            yield from nodes(v, path + (k,))
    elif isinstance(x, list):
        for i, v in enumerate(x[:3]):
            yield from nodes(v, path + (i,))


errs, n = {}, 0
for path in list(nodes(sample)):
    for bad in BAD:
        y = copy.deepcopy(sample)
        if path:
            cur = y
            for k in path[:-1]:
                cur = cur[k]
            cur[path[-1]] = bad
        else:
            y = bad
        for fn in (mau.clean, lambda v: mau.merge(v, sample), lambda v: mau.merge(sample, v)):
            n += 1
            try:
                r = fn(y)
                json.dumps(r)
                assert all(mau.KEY_RE.match(k) for k in r["sua"])
            except Exception as err:
                errs.setdefault(type(err).__name__ + str(err)[:40], path)
ok(not errs, "%d lần gọi với dữ liệu sai kiểu: không ném lỗi, kết quả luôn sạch %s" % (n, "" if not errs else json.dumps(errs, default=str)[:200]))

print("== nối dây")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok(core.DEFAULT_CONFIG.get("admin") is False and json.load(open(os.path.join(ADDON, "config.json")))["admin"] is False, "config admin mặc định tắt")
ok('if not config().get("admin"):\n            return' in init, "lệnh base:* chỉ chạy khi bật admin")
ok('f"{WEB_BASE}/prefs.js", f"{WEB_BASE}/fix.js", f"{WEB_BASE}/icons.js"' in init and "head += fix_script()" in init,
   "fix.js nạp trước mọi file hình, bản sửa có sẵn trong <head>")
web = os.path.join(ADDON, "web")
for f, g in (("home.js", "do"), ("pets.js", "thu"), ("seeds.js", "giong"), ("guests.js", "khach")):
    ok('GardenFix.register("%s"' % g in open(os.path.join(web, f), encoding="utf-8").read(), "%s đăng ký nhóm %s" % (f, g))
home = open(os.path.join(web, "home.js"), encoding="utf-8").read()
ok(home.count("fixBtn(") >= 5 and '"Sửa hình"' in home, "nút \"Sửa hình\" ở thẻ đồ / thú / giống / khách")
body = open(os.path.join(web, "body.html"), encoding="utf-8").read()
ok(all(('>%s</button>' % t) in body for t in ("Về gốc", "Xuất file", "Nhập file")), "Xưởng: Về gốc · Xuất file · Nhập file (chữ ngắn)")
# pack.py: mau_sua.json ở gốc add-on vào gói, bản trong user_files/ thì không
src = os.path.join(TMP, "src", "kotoba_batake")
shutil.copytree(ADDON, src, ignore=shutil.ignore_patterns("__pycache__", "meta.json"))
mau.write(os.path.join(src, "mau_sua.json"), over)
mau.write(os.path.join(src, "user_files", "mau_sua.json"), base)
pack = os.path.join(HERE, "..", "tools", "pack.py")
out = os.path.join(TMP, "goi.ankiaddon")
r = subprocess.run([sys.executable, pack, src, out], capture_output=True, text=True)
if r.returncode == 0 and os.path.exists(out):
    import zipfile
    names = zipfile.ZipFile(out).namelist()
    ok("mau_sua.json" in names and "user_files/mau_sua.json" not in names, "gói có mau_sua.json đi kèm, không có bản của máy (user_files)")
else:
    print("  – bỏ qua kiểm tra gói (pack.py không nhận thư mục / đường ra): " + (r.stderr or r.stdout)[-160:])

if NODE:
    print("== fix.js (node)")
    js = os.path.join(TMP, "t.js")
    open(js, "w", encoding="utf-8").write(r"""
const fs = require('fs'), vm = require('vm');
const ctx = { window: { __kbFix: {
  "do:lamp": { spr: ["k.", "kk"] },          // đúng cỡ, đúng màu
  "do:big": { spr: ["kkk", "kkk"] },         // sai cỡ
  "do:col": { spr: ["kX", "kk"] },           // màu lạ
  "thu:cat": { sit: ["kk", "k."] } } }, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8') + '\nthis.F = GardenFix;', ctx);
const SPR = { lamp: ["..", ".k"], big: ["..", ".."], col: ["..", ".."] }, CAT = { sit: ["..", ".."], walk0: ["..", ".."] };
ctx.F.register("do", { frames: (id) => SPR[id] ? { spr: SPR[id] } : {}, set: (id, n, r) => { SPR[id] = r; }, pal: () => ({ k: "#000" }) });
ctx.F.register("thu", { frames: (id) => id === "cat" ? { sit: CAT.sit, walk0: CAT.walk0 } : {}, set: (id, n, r) => { CAT[n] = r; }, pal: () => ({ k: "#000" }) });
const out = { lamp: SPR.lamp.join("|"), big: SPR.big.join("|"), col: SPR.col.join("|"), sit: CAT.sit.join("|"), walk: CAT.walk0.join("|"),
  orig: ctx.F.original("do", "lamp").spr.join("|"), has: ctx.F.has("do", "lamp"), lab: [ctx.F.label("do", "spr", 0), ctx.F.label("thu", "sit", 2), ctx.F.label("giong", "4", 4)] };
ctx.F.set({ "do:big": { spr: ["kk", "kk"] } });
out.after = [SPR.lamp.join("|"), SPR.big.join("|"), CAT.sit.join("|")];
console.log(JSON.stringify(out));
""")
    rr = subprocess.run([NODE, js, os.path.join(web, "fix.js")], capture_output=True, text=True)
    o = json.loads(rr.stdout.strip().splitlines()[-1]) if rr.returncode == 0 else None
    if o is None:
        print(rr.stderr[-500:])
    ok(o and o["lamp"] == "k.|kk" and o["sit"] == "kk|k." and o["walk"] == "..|..", "áp bản sửa đúng cỡ + màu; khung không sửa giữ nguyên")
    ok(o and o["big"] == "..|.." and o["col"] == "..|..", "sai cỡ / màu lạ → giữ hình gốc")
    ok(o and o["orig"] == "..|.k" and o["has"], "giữ hình gốc để Về gốc / so khi lưu")
    ok(o and o["lab"] == ["Chính", "Ngồi", "Ra quả"], "tên khung ngắn: " + json.dumps(o and o["lab"], ensure_ascii=False))
    ok(o and o["after"] == ["..|.k", "kk|kk", "..|.."], "set(): hình không còn bản sửa về gốc, bản sửa mới được áp")
else:
    print("– bỏ qua phần node")

shutil.rmtree(TMP, ignore_errors=True)
print()
print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
