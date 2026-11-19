"""1.35.4 — người dùng 19/11: "chuyển cảnh từ tưới sang vườn á (Esc) hay ngược lại thì nó bị giựt á. ngoài ra còn một số phần
dropdown á … "Mọi deck", "Chọn deck" và "Không chọn deck" trong báo … chuyển qua "không chọn deck" thì cái dropdown đó vẫn giữ
(và phần dropdown đó hình như chưa có gộp deck giống bên anki, giống phần chọn deck ở góc trên bên trái á)".

Test offline (không Qt; phần collection cần gói anki — ANKI_PY):
  A. Cây deck của báo (node, chạy đúng hàm của garden.js / paper.js):
     - Garden.deckTreeOf: thứ tự theo từng cấp như Anki ("A::B" ngay sau "A", "A B" / "A-B" / "A.B" không chen giữa), cấp tính
       theo deck cha có trong danh sách (thiếu deck cha giữa chừng vẫn đúng cha gần nhất), cờ có deck con, tên lá; 2.000 lần thử
       ngẫu nhiên so với cách sắp tham chiếu (theo từng cấp, không phân biệt hoa thường);
     - nhớ đóng / mở nhánh chung với ô deck ở thanh trên (prefs "kb-deck-fold"): chưa bấm thì theo Anki (col), bấm thì nhớ,
       chuỗi prefs ≤ 400 ký tự;
     - Garden.deckPhrase: khớp nguyên cụm, bỏ dấu, "::" như dấu cách.
  B. words_core.lang_decks gửi kèm "col" (deck đang thu gọn ở Anki) — collection Anki thật, deck lồng 3 cấp.
  C. Soát mã:
     - paper.js: ô "Lấy từ" ghi "Chọn deck…" khi danh sách đang mở (1.35.3: lấy theo chế độ đã lưu trước → kẹt "Không dùng deck");
       chọn Mọi deck / Không dùng deck vẽ lại ngay; ô tìm deck lọc tại chỗ (không vẽ lại cả tab mỗi phím);
     - garden.css: khung vườn rộng bằng cửa sổ (thanh cuộn không làm co cảnh / ruộng), Phóng to giữ bề ngang tự nhiên; hiệu ứng
       mới tắt khi giảm chuyển động; keyframe không ghi "to" (ruộng để Mờ không sáng lên rồi tối lại);
     - ui.js / greet.js / garden.js: đổi chế độ cùng khung hình (MutationObserver), mở bảng thì về đầu trang nếu bảng ở trên mép,
       mỗi lúc một bảng nổi; ruộng ẩn vẽ theo bề ngang cũ.
  D. Hợp đồng dữ liệu: không thêm khoá collection / mục config.json; khoá kotoba_batake_paper_src giữ nguyên dạng (bản 1.31.3
     đọc được), chỉ thêm prefs "kb-deck-fold" vốn có từ 1.34.
Kiểm thử giao diện thật (Anki 26.9.4, từng khung hình): tests/anki/e2e_1354.js.

Chạy: ${ANKI_PY} tests/core/test_1354.py ADDON
"""
from __future__ import annotations

import json
import os
import random
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
WEB = os.path.join(ADDON, "web")
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
    HAVE_ANKI = True
except ImportError:
    HAVE_ANKI = False
    sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))

PASS = FAIL = 0


def ok(cond, msg):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  ✓ " + msg)
    else:
        FAIL += 1
        print("  ✗ " + msg)


def read(name):
    with open(os.path.join(WEB, name), encoding="utf-8") as f:
        return f.read()


GARDEN, PAPER, UI, GREET, CSS = read("garden.js"), read("paper.js"), read("ui.js"), read("greet.js"), read("garden.css")

# ---------------------------------------------------------------------------------------------------------------------
print("== A. cây deck của báo (node, hàm thật của garden.js)")


def fn_src(src, name):
    """Thân một hàm `function name(...) {…}` trong mã (đếm ngoặc, bỏ qua chuỗi)."""
    i = src.index("function " + name + "(")
    j = src.index("{", i)
    depth, k, q = 0, j, None
    while k < len(src):
        c = src[k]
        if q:
            if c == "\\":
                k += 2
                continue
            if c == q:
                q = None
        elif c in "\"'":
            q = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[i:k + 1]
        k += 1
    raise ValueError(name)


NODE = """
var prefs = {};
var GardenPrefs = { get: function (k) { return prefs[k] || ""; }, set: function (k, v) { prefs[k] = String(v); } };
%s
var deckFoldCache = null;
%s
var cases = JSON.parse(require("fs").readFileSync(0, "utf8"));
var out = { trees: cases.trees.map(function (l) { return deckTreeOf(l).map(function (r) { return [r.id, r.name, r.full, r.depth, r.kids, r.parent ? r.parent.id : null]; }); }) };
// gập / mở: chưa bấm → theo Anki; bấm → nhớ
out.fold = [deckFoldOpen(1, false), deckFoldOpen(2, true)];
saveFold(1, false); saveFold(2, true);
deckFoldCache = null;
out.fold.push(deckFoldOpen(1, false), deckFoldOpen(2, true), prefs["kb-deck-fold"]);
for (var i = 0; i < 300; i++) { saveFold(1000000000000 + i, i %% 2 === 0); }
out.foldLen = prefs["kb-deck-fold"].length;
out.foldLast = deckFoldOpen(1000000000299, false);
out.foldFirstMem = deckFoldOpen(1000000000000, false);           // bấm đầu tiên: vẫn nhớ trong lúc đang mở vườn
deckFoldCache = null;
out.foldFirstSaved = deckFoldOpen(1000000000000, true);          // mở lại vườn: lần bấm cũ nhất (mở) không còn lưu → theo Anki (thu)
out.foldLastSaved = deckFoldOpen(1000000000299, true);
out.phrase = cases.phrase.map(function (x) {
  var phrase = deckNorm(x[1]).trim().replace(/\\s+/g, " ");
  return !!phrase && deckNorm(x[0]).replace(/\\s+/g, " ").indexOf(phrase) >= 0;
});
out.match = cases.phrase.map(function (x) { return deckMatch(x[0], x[1]); });
console.log(JSON.stringify(out));
"""
funcs = "\n".join(fn_src(GARDEN, n) for n in ("deckNorm", "deckMatch", "deckParts", "deckTreeOf", "deckFold", "saveFold", "deckFoldOpen"))


def ref_tree(lst):
    """Cách sắp tham chiếu: theo từng cấp (không phân biệt hoa thường), deck cha gần nhất có trong danh sách."""
    def key(d):
        return [p.lower() for p in d["name"].split("::")]
    arr = sorted(lst, key=lambda d: (key(d), len(key(d))))
    names = {d["name"] for d in arr}
    out = []
    depth = {}
    for d in arr:
        parts = d["name"].split("::")
        par = None
        for k in range(len(parts) - 1, 0, -1):
            cand = "::".join(parts[:k])
            if cand in names:
                par = cand
                break
        depth[d["name"]] = depth[par] + 1 if par else 0
        out.append((d["name"], depth[d["name"]]))
    return out


FIXED = [
    {"id": 1, "name": "JA"}, {"id": 2, "name": "JA B"}, {"id": 3, "name": "JA::N4"}, {"id": 4, "name": "JA::N5"},
    {"id": 5, "name": "JA::N5::Bài 1"}, {"id": 6, "name": "JA::N5::Bài 2"}, {"id": 7, "name": "JA-x"}, {"id": 8, "name": "JA.y"},
    {"id": 9, "name": "Ja::n6"}, {"id": 10, "name": "Lớn::300 từ"}, {"id": 11, "name": "Lớn"},
    {"id": 12, "name": "X::Y::Z"},            # thiếu "X::Y": Z là con của X
    {"id": 13, "name": "X"}, {"id": 14, "name": "Default"},
]
rnd = random.Random(1354)
ALPH = ["A", "B", "Bài 1", "Bài 10", "Bài 2", "Ä", "N4", "N5", "x y", "X-Y", "日本語", "한국어", "Ω"]
RANDOM = []
for _ in range(2000):
    names = {}
    for _ in range(rnd.randint(1, 18)):          # Anki không cho hai deck chỉ khác hoa / thường
        nm = "::".join(rnd.choice(ALPH) for _ in range(rnd.randint(1, 4)))
        names.setdefault(nm.lower(), nm)
    names = set(names.values())
    RANDOM.append([{"id": i + 1, "name": n} for i, n in enumerate(sorted(names, key=lambda _x: rnd.random()))])
PHRASE = [["JA::N4::Bài 17", "bai 17"], ["JA::N4::Bài 17", "n4 bai"], ["JA::N4::Bài 23", "bai 3"], ["JA::N4::Bài 30", "bai 3"],
          ["Tiếng Đức::Đồ ăn", "do an"], ["Tiếng Đức::Đồ ăn", "duc do"], ["A", ""]]
res = subprocess.run(["node", "-e", NODE % ("", funcs)], input=json.dumps({"trees": [FIXED] + RANDOM, "phrase": PHRASE}),
                     capture_output=True, text=True, timeout=120)
ok(res.returncode == 0, "chạy được các hàm cây deck của garden.js bằng node" + (": " + res.stderr[-300:] if res.returncode else ""))
out = json.loads(res.stdout) if res.returncode == 0 else {"trees": [[]], "fold": [], "phrase": [], "match": []}
t0 = out["trees"][0]
order = [r[2] for r in t0]
ok(order[:8] == ["Default", "JA", "JA::N4", "JA::N5", "JA::N5::Bài 1", "JA::N5::Bài 2", "Ja::n6", "JA B"] or
   order.index("JA::N5::Bài 2") < order.index("JA B"),
   "deck con ngay sau deck cha, \"JA B\" không chen giữa \"JA\" và \"JA::N4\" (" + " | ".join(order[:9]) + ")")
by = {r[2]: r for r in t0}
ok(by["JA::N5::Bài 1"][3] == 2 and by["JA::N5::Bài 1"][1] == "Bài 1" and by["JA"][4] and not by["JA B"][4],
   "cấp + tên lá + cờ có deck con: JA::N5::Bài 1 cấp 2 tên \"Bài 1\", JA có con, JA B không")
ok(by["X::Y::Z"][3] == 1 and by["X::Y::Z"][5] == 13 and by["X::Y::Z"][1] == "Y::Z",
   "thiếu deck cha giữa chừng (X::Y): X::Y::Z treo dưới X, cấp 1, ghi \"Y::Z\"")


def tree_bad(lst, got):
    """Cấu trúc cây: đủ deck, cha = deck tổ tiên gần nhất có trong danh sách, cấp = cấp cha + 1, cả nhánh con nằm liền
    ngay sau deck cha (thứ tự giữa các deck anh em theo cách so chữ của trình duyệt — "Ä" cạnh "A" — không xét ở đây)."""
    names = {d["name"] for d in lst}
    if sorted(r[2] for r in got) != sorted(names):
        return "thiếu / thừa deck"
    want = dict(ref_tree(lst))
    pos = {r[2]: i for i, r in enumerate(got)}
    byid = {r[0]: r for r in got}
    for i, r in enumerate(got):
        if r[3] != want[r[2]]:
            return "cấp sai: " + r[2]
        par = byid[r[5]][2] if r[5] else None
        parts = r[2].split("::")
        near = next(("::".join(parts[:k]) for k in range(len(parts) - 1, 0, -1) if "::".join(parts[:k]) in names), None)
        if par != near:
            return "cha sai: " + r[2]
        if par is not None and pos[par] >= i:
            return "deck con đứng trước deck cha: " + r[2]
    for i, r in enumerate(got):            # nhánh con liền khối ngay sau deck cha
        j = i + 1
        while j < len(got) and got[j][3] > r[3]:
            j += 1
        block = {x[2] for x in got[i + 1:j]}
        desc = {x[2] for x in got if x[2] != r[2] and x[2].startswith(r[2] + "::")}
        if block != desc:
            return "nhánh của %s không liền khối" % r[2]
    return None


bad = [b for b in (tree_bad(lst, got) for lst, got in zip(RANDOM, out["trees"][1:])) if b]
ok(not bad, "2.000 danh sách deck ngẫu nhiên (dấu, CJK, \"x y\", \"X-Y\", thiếu deck cha giữa chừng): cha / cấp đúng, cả nhánh con liền "
   "ngay sau deck cha (%d lệch%s)" % (len(bad), ": " + bad[0] if bad else ""))
f = out["fold"]
ok(f[:2] == [True, False], "chưa bấm lần nào: mở / thu theo Anki")
ok(f[2:4] == [False, True] and f[4] == "-1,+2", "bấm thu / mở → nhớ (prefs kb-deck-fold \"-1,+2\")")
ok(out["foldLen"] <= 400 and out["foldLast"] is False, "300 lần bấm: chuỗi nhớ ≤ 400 ký tự (%d), giữ lần bấm sau cùng (thu)" % out["foldLen"])
ok(out["foldFirstMem"] is True, "đang mở vườn: lần bấm đầu tiên (mở) vẫn nhớ sau 299 lần bấm khác (1.35.4: trước đây tự thu lại)")
ok(out["foldFirstSaved"] is False and out["foldLastSaved"] is False, "mở lại vườn: lần bấm cũ nhất về theo Anki, lần bấm sau cùng còn lưu")
ok(out["phrase"] == [True, True, False, True, True, True, False],
   "khớp nguyên cụm: \"bai 17\", \"n4 bai\", \"bai 3\" → Bài 30 (không Bài 23), bỏ dấu, \"::\" như dấu cách (\"duc do\" khớp \"Tiếng Đức::Đồ ăn\")")
ok(out["match"][2] and out["match"][5], "khớp rời từng từ vẫn tìm ra (Bài 23 với \"bai 3\")")

# ---------------------------------------------------------------------------------------------------------------------
print("== B. lang_decks gửi kèm \"col\" (deck đang thu gọn ở Anki)")
if HAVE_ANKI:
    from anki.collection import Collection
    import garden_core as core
    import words_core as words
    tmp = tempfile.mkdtemp()
    col = Collection(os.path.join(tmp, "c.anki2"))
    mm = col.models
    m = mm.new("Từ vựng 1354")
    for fld in ("Từ", "Cách đọc", "Nghĩa"):
        mm.add_field(m, mm.new_field(fld))
    t = mm.new_template("T"); t["qfmt"] = "{{Từ}}"; t["afmt"] = "{{Nghĩa}}"
    mm.add_template(m, t); mm.add(m); m = mm.by_name("Từ vựng 1354")
    for i, dn in enumerate(["JA::N5::Bài 1", "JA::N5::Bài 2", "JA B", "JA::N4"]):
        n = col.new_note(m); n["Từ"] = "日本" + str(i); n["Cách đọc"] = "にほん"; n["Nghĩa"] = "nhật bản"
        col.add_note(n, col.decks.id(dn))
    for dn, c in (("JA", True), ("JA::N5", False), ("JA B", True)):
        d = col.decks.get(col.decks.id_for_name(dn)); d["collapsed"] = c; col.decks.save(d)
    cfg = core.merged_config({}); cfg["_fields"] = {"models": {}, "games": {}}
    ld = words.lang_decks(col, cfg)
    ja = {d["name"]: d for d in ld["ja"]}
    ok(set(ja) >= {"JA", "JA::N5", "JA::N5::Bài 1", "JA B", "JA::N4"}, "deck tiếng Nhật đủ cả deck cha: " + ", ".join(sorted(ja)))
    ok(all(isinstance(d.get("col"), bool) for d in ld["ja"]), "mỗi deck có \"col\" kiểu bool")
    ok(ja["JA"]["col"] is True and ja["JA::N5"]["col"] is False and ja["JA B"]["col"] is True, "\"col\" theo màn Decks của Anki (JA thu, JA::N5 mở, JA B thu)")
    ok(ja["JA"]["notes"] == 3 and ja["JA::N5"]["notes"] == 2, "số note của deck cha vẫn tính cả deck con (JA 3, JA::N5 2)")
    ok(set(ld["ja"][0]) == {"id", "name", "notes", "col"}, "chỉ thêm khoá \"col\" vào mỗi dòng (id, name, notes như cũ)")
    col.close()
else:
    print("  – bỏ qua (không có gói anki — chạy với ANKI_PY)")

# ---------------------------------------------------------------------------------------------------------------------
print("== C. soát mã")
ok('const cur = deckOpen[lang] ? "pick" : mode === "level" ? "level" : picked.length ? "pick" : "all";' in PAPER,
   "Lấy từ: danh sách đang mở thì ô ghi \"Chọn deck…\" (1.35.3: theo chế độ đã lưu → kẹt \"Không dùng deck\")")
src_pick = fn_src(PAPER, "sourcePicker")
ok("drawSource();" in src_pick and "v.modes[lang] =" in src_pick and "v.picked[lang] = []" in src_pick,
   "chọn Mọi deck / Không dùng deck: vẽ lại ngay (không đợi Python), danh sách đóng liền tay")
dl = fn_src(PAPER, "deckList")
q_handler = re.search(r'q\.addEventListener\("input", \(\) => \{([^}]*)\}', dl)
ok(q_handler is not None and "drawSource" not in q_handler.group(1) and "apply()" in q_handler.group(1),
   "ô tìm deck lọc tại chỗ, không vẽ lại cả tab mỗi phím (bộ gõ đang ghép chữ không bị cắt)")
ok("Garden.deckTreeOf" in PAPER and "Garden.deckFoldOpen" in PAPER and "Garden.deckFoldSave" in PAPER,
   "danh sách deck của báo dùng chung cây + trí nhớ đóng / mở với ô deck ở thanh trên")
ok("coveredBy" in dl and "đã gồm" in dl and "!sub(x)" in dl, "tick deck cha: deck con \"đã gồm\" (khoá), deck con tick riêng được bỏ")
ok("html { overflow-x: hidden; }" in CSS and "#kb-app { width: 100vw; }" in CSS,
   "khung vườn rộng bằng cửa sổ: thanh cuộn hiện / ẩn không làm co cảnh sân + ruộng")
ok(re.search(r"#kb-app\.kb-ui-m-review\.kb-ui-zoom-on \{[^}]*width: auto", CSS) is not None,
   "Phóng to: bề ngang tự nhiên (lề 8 px, thanh cuộn không đè lên thẻ)")
rm = re.findall(r"prefers-reduced-motion: reduce\) \{ ([^{}]*)\{ animation: none; \} \}", CSS)
ok(any(all(c in x for c in (".kb-panel-in", ".kb-panel-fade", ".kb-garden-in", ".kb-garden-fade")) for x in rm),
   "hiệu ứng mới tắt khi máy bật giảm chuyển động")
kf = re.search(r"@keyframes kb-garden-in \{([^@]*?)\}\s*\n", CSS)
ok(kf is not None and " to " not in kf.group(1) and "to {" not in kf.group(1),
   "keyframe kb-garden-in không ghi \"to\" (ruộng để \"Mờ, đứng yên\" giữ độ mờ, không sáng lên rồi tối lại)")
ok("new MutationObserver" in UI and "apply();" in UI and "window.scrollTo(0, 0)" in UI,
   "ui.js: bảng hiện / ẩn → đổi chế độ ngay (không đợi vòng 200 ms), bảng ở trên mép → về đầu trang")
ok('"kb-panel"]' in GREET and "kb-garden-in" in GREET and "GardenUI._apply" in GREET,
   "greet.js: bảng ôn bật nhẹ, đóng bảng → vườn trồi lên (sau khi đổi chế độ)")
ok("function closePops(" in GARDEN and "watchPops();" in GARDEN, "garden.js: mỗi lúc một bảng nổi")
ok("function fieldWidth(" in GARDEN and "fieldSame()" in GARDEN, "garden.js: ruộng ẩn vẽ theo bề ngang cũ; đổi chế độ mà ruộng không đổi cỡ thì không vẽ lại")

# ---------------------------------------------------------------------------------------------------------------------
print("== D. hợp đồng dữ liệu")
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(open(os.path.join(ADDON, fn), encoding="utf-8").read()))
BASE_COMMIT = "906e176"          # 1.35.3
old = subprocess.run(["git", "-C", ROOT, "show", BASE_COMMIT + ":kotoba_batake/config.json"], capture_output=True, text=True)
if old.returncode == 0:
    old_keys = set()
    ls = subprocess.run(["git", "-C", ROOT, "ls-tree", "--name-only", BASE_COMMIT, "kotoba_batake/"], capture_output=True,
                        text=True).stdout.split()
    for fn in ls:
        if fn.endswith(".py"):
            old_keys |= set(KEY_RE.findall(subprocess.run(["git", "-C", ROOT, "show", BASE_COMMIT + ":" + fn],
                                                          capture_output=True, text=True).stdout))
    ok(cur_keys == old_keys, "khoá collection kotoba_batake_* = 1.35.3 (%d khoá)" % len(cur_keys))
    ok(json.loads(old.stdout) == json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")),
       "config.json giống hệt 1.35.3 (không thêm mục)")
    old_words = subprocess.run(["git", "-C", ROOT, "show", BASE_COMMIT + ":kotoba_batake/words_core.py"], capture_output=True, text=True).stdout
    with open(os.path.join(ADDON, "words_core.py"), encoding="utf-8") as fh:
        cur_words = fh.read()
    a = re.search(r"def save_src\(.*?\n\n\n", old_words, re.S)
    b = re.search(r"def save_src\(.*?\n\n\n", cur_words, re.S)
    ok(a and b and a.group(0) == b.group(0), "ghi deck của báo (words_core.save_src) giữ nguyên như 1.35.3 → bản 1.31.3 đọc được")
else:
    print("  – bỏ qua so với 1.35.3 (repo không có commit %s)" % BASE_COMMIT)
ok("kb-deck-fold" in GARDEN, "đóng / mở nhánh lưu ở prefs \"kb-deck-fold\" (có từ 1.34, dùng chung với ô deck ở thanh trên)")
ok("localStorage" not in fn_src(PAPER, "deckList"), "danh sách deck của báo không dùng localStorage")

print("\nKẾT QUẢ: %s (%d/%d)" % ("TẤT CẢ OK" if FAIL == 0 else "CÓ LỖI", PASS, PASS + FAIL))
sys.exit(0 if FAIL == 0 else 1)
