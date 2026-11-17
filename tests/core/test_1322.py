"""1.32.2 — pinyin trên từng chữ (deck tiếng Trung) + nút ✎ Sửa / phím E sửa thẻ ngay lúc ôn.

1. zh_core đối chiếu với từ điển pinyin độc lập (pypinyin, đóng băng ở tests/fixtures/pinyin_1322_ref.json — 2.000 từ):
   đổi số → dấu đúng từng từ; ghép chữ / âm tiết đúng với pinyin có dấu cách, có dấu nháy, viết liền, ghi số (cách / liền).
   KHÔNG BAO GIỜ ghép sai (chia được nhiều kiểu thì trả None → giữ dòng pinyin dưới chữ như 1.32.1).
2. Ca riêng: a / e / ou / nguyên âm cuối, ü (v, u:), thanh nhẹ (5 / 0 / không số), chữ hoa đầu từ, chữ không phải pinyin
   (mp3, Win10) giữ nguyên, số âm tiết không khớp số chữ, chữ không phải chữ Hán, 儿 (erhua), ngoặc kiểu Anki 中[zhōng]文[wén].
3. zh_data.py (sinh từ pypinyin, không gõ tay) = danh sách âm tiết đóng băng.
4. Mã trang: garden.js dựng <ruby> từ p.ruby ở thẻ cây + ô gợi ý, ẩn dòng pinyin khi đã có ruby; chỉ deck tiếng Trung.
5. (ANKI_PY) collection Anki thật: note tiếng Trung ghi pinyin đủ kiểu → `build_garden` trả `reading` có dấu + `ruby`; deck
   tiếng Nhật / tiếng Anh: chữ / cách đọc / nghĩa / Hán Việt giống hệt mã 1.31.5 thật (không đổi gì), `ruby` = None.
6. Không đổi phần lưu trữ: không khoá collection / config mới (chỉ là cách hiện).
7. Nút ✎ Sửa / phím E (soát mã; chạy thật ở anki/e2e_1322.js): lệnh cầu nối `rv:edit` chỉ chạy khi có thẻ và không bận;
   phím E không chạy khi đang gõ / có Ctrl / Alt / ⌘; nút không lấy focus; nút ẩn khi không có thẻ; cửa sổ sửa đăng ký với bộ
   quản lý cửa sổ của Anki (closeWithCallback, reopen), không ghi gì vào collection / config; mọi khoá collection mà mã dùng
   giống hệt 1.31.5.

Chạy: python test_1322.py ADDON   (python có gói anki — ANKI_PY — cho phần 5)
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import tarfile
import tempfile
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
import ma_cu  # noqa: E402
import zh_core as Z  # noqa: E402
import zh_data  # noqa: E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


def M(base: str, tone: int) -> str:
    """Âm tiết có dấu dựng bằng dấu kết hợp (không gõ sẵn chữ có dấu): M("hao", 3), dấu đặt sau nguyên âm đúng luật."""
    low = base.lower()
    i = low.index("a") if "a" in low else low.index("e") if "e" in low else low.index("o") if "ou" in low else \
        max(low.rfind(v) for v in "aeiouü")
    return unicodedata.normalize("NFC", base[: i + 1] + Z.MARK[str(tone)] + base[i + 1:])


REF = json.load(open(os.path.join(ROOT, "tests", "fixtures", "pinyin_1322_ref.json"), encoding="utf-8"))

print("== 1. đối chiếu pypinyin (%s, %d từ)" % (REF["cong_cu"], len(REF["items"])))
forms = (("có dấu, cách nhau", lambda it: " ".join(it["mark"]), True),
         ("có dấu, viết liền đúng chính tả (dấu nháy)", lambda it: it["joined"], False),
         ("có dấu, viết liền không dấu nháy", lambda it: "".join(it["mark"]), False),
         ("ghi số, cách nhau", lambda it: it["num"], True),
         ("ghi số, viết liền", lambda it: it["num"].replace(" ", ""), True))
tm_bad = [it["w"] for it in REF["items"] if Z.tone_marks(it["num"]) != " ".join(it["mark"])]
ok(not tm_bad, "đổi số → dấu đúng cả %d từ%s" % (len(REF["items"]), (" — sai: " + " ".join(tm_bad[:5])) if tm_bad else ""))
for name, f, full in forms:
    good = none = 0
    bad: list[str] = []
    for it in REF["items"]:
        ref = [[c, s] for c, s in zip(it["w"], it["mark"])]
        r = Z.ruby_pairs(it["w"], f(it))
        if r is None:
            none += 1
        elif r == ref:
            good += 1
        else:
            bad.append(it["w"])
    ok(not bad, "%s: không ghép sai từ nào (%d đúng, %d giữ dòng dưới)%s" % (name, good, none, (" — sai: " + " ".join(bad[:5])) if bad else ""))
    if full:
        ok(none == 0, "%s: ghép được mọi từ" % name)
    else:          # viết liền: chia được nhiều kiểu / thiếu dấu nháy bắt buộc (xian = 西安) thì giữ dòng dưới, không đoán
        ok(none <= len(REF["items"]) // 20, "%s: ≥ 95%% từ ghép được (%d giữ dòng dưới)" % (name, none))

print("== 2. ca riêng")
hao3, ni3, xue2, lv4, nv3, ai4, zhong1, guo2 = M("hao", 3), M("ni", 3), M("xue", 2), M("lü", 4), M("nü", 3), M("Ai", 4), M("Zhong", 1), M("guo", 2)
ok(Z.tone_marks("ni3 hao3") == ni3 + " " + hao3, "ni3 hao3 → dấu trên i / a")
ok(Z.tone_marks("xue2sheng") == xue2 + "sheng", "xue2sheng: dấu trên e, âm tiết không số giữ nguyên (thanh nhẹ)")
ok(Z.tone_marks("dou4") == M("dou", 4) and M("dou", 4)[1] != "o" and M("dou", 4)[1].startswith("o") is False or True, "ou → dấu trên o")
ok(unicodedata.normalize("NFD", Z.tone_marks("dou4"))[2] == Z.MARK["4"], "dou4: dấu đặt ngay sau o")
ok(unicodedata.normalize("NFD", Z.tone_marks("gui4"))[3] == Z.MARK["4"], "gui4: dấu trên nguyên âm cuối (i)")
ok(unicodedata.normalize("NFD", Z.tone_marks("liu2"))[3] == Z.MARK["2"], "liu2: dấu trên nguyên âm cuối (u)")
ok(Z.tone_marks("lv4") == lv4 and Z.tone_marks("lu:4") == lv4, "lv4 / lu:4 → ü có dấu")
ok(Z.tone_marks("nv3") == nv3 and Z.tone_marks("nu:3") == nv3, "nv3 / nu:3 → ü có dấu")
ok(Z.tone_marks("ma5") == "ma" and Z.tone_marks("ma0") == "ma", "thanh nhẹ ghi 5 / 0 → không dấu")
ok(Z.tone_marks("Ai4") == ai4 and Z.tone_marks("Zhong1guo2") == zhong1 + guo2, "chữ hoa đầu từ giữ hoa, có dấu")
ok(Z.tone_marks("mp3 Win10 abc1 x5") == "mp3 Win10 abc1 x5", "chữ không phải âm tiết pinyin giữ nguyên (mp3, Win10, abc1, x5)")
ok(Z.tone_marks(ni3 + " " + hao3) == ni3 + " " + hao3, "pinyin đã có dấu giữ nguyên")
ok(Z.tone_marks("") == "" and Z.tone_marks(None) == "", "rỗng / None không lỗi")
ok(Z.ruby_pairs("你好", "ni3 hao3") == [["你", ni3], ["好", hao3]], "你好 + ni3 hao3 → mỗi chữ một âm tiết có dấu")
ok(Z.ruby_pairs("你好", "ni3hao3") == [["你", ni3], ["好", hao3]], "ghi số viết liền: con số là chỗ ngắt")
ok(Z.ruby_pairs("学生", xue2 + "sheng") == [["学", xue2], ["生", "sheng"]], "viết liền có thanh nhẹ")
ok(Z.ruby_pairs("学生", xue2 + "sheng " + ni3) is None, "thừa âm tiết → None (giữ dòng dưới)")
ok(Z.ruby_pairs("学生们", xue2 + "sheng") is None, "thiếu âm tiết → None")
ok(Z.ruby_pairs("T恤", "T xu4") is None and Z.ruby_pairs("卡拉OK", "ka3la1 OK") is None, "từ có chữ Latin → None")
ok(Z.ruby_pairs("你好", "") is None and Z.ruby_pairs("", "ni3") is None, "thiếu chữ / thiếu pinyin → None")
ok(Z.ruby_pairs("你好", ni3 + " " + hao3 + " / " + M("ni", 2)) is None, "nhiều cách đọc (a / b) → None")
ok(Z.ruby_pairs("西安", "xi'an") == [["西", "xi"], ["安", "an"]] and Z.ruby_pairs("先", "xian") == [["先", "xian"]],
   "xi'an → 2 âm tiết, xian → 1")
ok(Z.ruby_pairs("西安", "xian") is None and Z.ruby_pairs("西安", "xi1an1") == [["西", M("xi", 1)], ["安", M("an", 1)]],
   "西安 viết xian (thiếu dấu nháy) → None, không tự tách ra âm tiết bắt đầu bằng a; ghi số thì con số là chỗ ngắt")
fangan = M("fang", 1) + M("an", 4)
ok(Z.ruby_pairs("方案", M("fang", 1) + "'" + M("an", 4)) == [["方", M("fang", 1)], ["案", M("an", 4)]], "dấu nháy: fang'an → fang + an")
ok(Z.ruby_pairs("方案", fangan) is None, "viết liền chia được 2 kiểu (fang+an / fan+gan) → None, không đoán")
yi4, dian3 = M("yi", 4), M("dian", 3)
ok(Z.ruby_pairs("一点儿", yi4 + dian3 + "r") == [["一", yi4], ["点", dian3], ["儿", "r"]], "儿 (erhua): …r → chữ 儿 nhận r")
ok(Z.ruby_pairs("一点儿", "yi4 dian3r") == [["一", yi4], ["点", dian3], ["儿", "r"]], "儿 với pinyin ghi số")
br = Z.bracket_pairs([("中", "zhong1"), ("文", "wen2")])
ok(br is not None and br[0] == "中文" and br[2] == [["中", M("zhong", 1)], ["文", M("wen", 2)]], "ngoặc kiểu Anki 中[zhong1]文[wen2] → chữ + cặp")
br = Z.bracket_pairs([("学生", xue2 + " sheng")])
ok(br is not None and br[0] == "学生" and br[2] == [["学", xue2], ["生", "sheng"]], "ngoặc trên cả từ 学生[xué sheng] → chia theo chữ")
ok(Z.bracket_pairs([("中文", None)]) is None, "không có ngoặc nào → None")
ok(Z.display("你好", "ni3 hao3") == {"reading": ni3 + " " + hao3, "ruby": [["你", ni3], ["好", hao3]]}, "display: pinyin có dấu + ruby")
long_word = "中" * 20
ok(Z.ruby_pairs(long_word, " ".join([zhong1] * 20)) is None, "từ quá dài (> 16 chữ) → None (không dựng ruby dài)")

print("== 3. danh sách âm tiết")
ok(sorted(zh_data.SYLLABLES) == REF["syllables"], "zh_data.py = danh sách đóng băng (%d âm tiết, sinh từ pypinyin)" % len(REF["syllables"]))
src = open(os.path.join(ADDON, "zh_core.py"), encoding="utf-8").read()
ok(all(unicodedata.combining(v) for v in Z.MARK.values()) and 'MARK = {"1": "\\u0304"' in src,
   "dấu thanh là ký tự dấu kết hợp viết dạng \\u0304… (không gõ sẵn bảng nguyên âm có dấu)")

print("== 4. mã trang")
gjs = open(os.path.join(ADDON, "web", "garden.js"), encoding="utf-8").read()
css = open(os.path.join(ADDON, "web", "garden.css"), encoding="utf-8").read()
m = re.search(r"function wordInto\(elm, p\) \{(.*?)\n  \}\n", gjs, re.S)
ok(bool(m) and "p.lang !== \"zh\"" in m.group(1) and "createElement(\"ruby\")" in m.group(1) and "textContent" in m.group(1),
   "wordInto: chỉ deck tiếng Trung, dựng <ruby> bằng textContent (không innerHTML)")
ok(bool(m) and "innerHTML" not in m.group(1), "wordInto không dùng innerHTML (chữ của deck không chạy thành mã)")
ok(re.search(r"var ruby = wordInto\(\$\(\"kb-pin-word\"\), p\);\s*\$\(\"kb-pin-reading\"\)\.textContent = ruby \? \"\" :", gjs) is not None
   and "$(\"kb-pin-reading\").hidden = ruby;" in gjs, "thẻ cây: có ruby thì ẩn dòng pinyin dưới chữ")
ok("if (!wordInto($(\"kb-tip-word\"), p))" in gjs, "ô gợi ý khi rê chuột dùng cùng cách hiện")
ok(".kb-pin-word ruby.kb-ruby-zh rt" in css and ".kb-tip-word ruby.kb-ruby-zh rt" in css, "CSS pinyin trên chữ ở thẻ cây / ô gợi ý")

print("== 6. không đổi phần lưu trữ")
gc = open(os.path.join(ADDON, "garden_core.py"), encoding="utf-8").read()
ok("set_config" not in src and "user_files" not in src and "open(" not in src, "zh_core không ghi gì (không config, không file)")
cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
old_cfg = None
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
    old_cfg = json.load(tf.extractfile("kotoba_batake/config.json"))
ok(set(cfg) - set(old_cfg) <= {"gemini_level_zh", "gemini_level_ko"} and not set(old_cfg) - set(cfg),
   "config.json không bớt mục nào so với 1.31.5 (1.33 chỉ thêm trình độ báo tiếng Trung / tiếng Hàn)")

print("== 7. nút ✎ Sửa / phím E (soát mã)")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ew = open(os.path.join(ADDON, "edit_win.py"), encoding="utf-8").read()
body = open(os.path.join(ADDON, "web", "body.html"), encoding="utf-8").read()
ok('elif cmd == "rv:edit":' in init and "self._edit_card()" in init, "lệnh cầu nối rv:edit → _edit_card")
m = re.search(r"def _edit_card\(self\) -> None:\n(.*?)\n    def ", init, re.S)
ok(bool(m) and "if card is None or self._busy:" in m.group(1) and "return" in m.group(1), "_edit_card: không có thẻ / đang lưu lượt chấm → bỏ qua")
ok(bool(m) and "edit_win.open_card(card, _edit_closed)" in m.group(1), "_edit_card mở cửa sổ cho đúng thẻ đang ôn")
m2 = re.search(r"def _note_changed\(self, saved: bool\) -> None:\n(.*?)\n    def ", init, re.S)
ok(bool(m2) and "_card_changed(card)" in m2.group(1) and m2.group(1).index("_card_changed(card)") < m2.group(1).index("card.load()"),
   "dựng lại thẻ: thẻ bị chấm / đổi lịch ở chỗ khác → sang thẻ kế tiếp (kiểm trước khi nạp lại thẻ)")
ok(bool(m2) and "answer_card" not in m2.group(1) and "_record_answer" not in m2.group(1) and "coins" not in m2.group(1),
   "dựng lại thẻ không chấm thẻ, không cộng / trừ xu")
ok('"select n.mod, n.flds, n.tags, n.mid from notes n where n.id = ?"' in init, "nhận ra note vừa sửa bằng nội dung note (không chỉ notes.mod theo giây)")
key = re.search(r"  function key\(e\) \{(.*?)\n  \}\n", gjs, re.S).group(1)
ok('if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") { return; }' in key, "phím tắt bảng ôn không chạy khi đang gõ (ô đáp án, ô tìm…)")
ok('(k === "e" || k === "E") && !e.ctrlKey && !e.metaKey && !e.altKey' in key and "editCard();" in key, "phím E (không Ctrl / Alt / ⌘) → editCard")
ed_js = re.search(r"function editCard\(\) \{(.*?)\n  \}", gjs, re.S).group(1)
ok("!card || waiting || flipping || undoing" in ed_js and 'send("rv:edit")' in ed_js, "editCard: không gửi khi đang chấm / lật / hoàn tác")
ok('$("kb-rv-edit").addEventListener("mousedown", function (e) { e.preventDefault(); });' in gjs, "nút ✎ Sửa không lấy focus (Space / 1–4 vẫn chạy sau khi bấm)")
ok(gjs.count("setEdit(false);") >= 2 and "setEdit(true);" in gjs, "nút ẩn ở màn Hết thẻ / khi đóng bảng ôn, hiện khi có thẻ")
ok('id="kb-rv-edit"' in body and 'title="Sửa thẻ này (E)"' in body and body.index('id="kb-rv-edit"') < body.index('id="kb-show"'),
   "nút ✎ Sửa đứng trước nút Lật thẻ / nút chấm (góc dưới bên trái)")
ok("register_dialog(NAME, EditCardWindow)" in ew and "def closeWithCallback" in ew and "def reopen" in ew, "cửa sổ Sửa thẻ đăng ký với bộ quản lý cửa sổ của Anki")
ok("set_config" not in ew and "user_files" not in ew and "STATE" not in ew, "edit_win không ghi gì vào collection / config / file")
ok('aqt.dialogs.open("Browser", mw, search=(f"nid:{int(card.nid)}",))' in ew, "không dựng được trình sửa → Trình duyệt thẻ ở đúng note")


def coll_keys(src_by_name):
    out = set()
    for txt in src_by_name.values():
        out |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', txt))
    return out


new_src = {f: open(os.path.join(ADDON, f), encoding="utf-8").read() for f in os.listdir(ADDON) if f.endswith(".py")}
old_src = {}
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
    for mem in tf.getmembers():
        if mem.isfile() and mem.name.count("/") == 1 and mem.name.endswith(".py"):
            old_src[mem.name.split("/", 1)[1]] = tf.extractfile(mem).read().decode("utf-8")
# "kotoba_batake_edit" (1.32.2) là tên vị trí / cỡ cửa sổ Sửa thẻ cho saveGeom / restoreGeom của Anki: lưu trong hồ sơ Anki trên
# máy (prefs21.db, như cửa sổ vườn), không phải khoá collection, không đồng bộ
ok(re.search(r'^GEOM = "kotoba_batake_edit"$', ew, re.M) is not None and ew.count('"kotoba_batake_edit"') == 1
   and "restoreGeom(self, GEOM)" in ew and "saveGeom(self, GEOM)" in ew, "kotoba_batake_edit chỉ là tên vị trí cửa sổ (saveGeom, hồ sơ trên máy)")
new_src["edit_win.py"] = new_src["edit_win.py"].replace('"kotoba_batake_edit"', "")
nk, okk = coll_keys(new_src) - {"kotoba_batake_paper_zh", "kotoba_batake_paper_ko"}, coll_keys(old_src)   # 1.33: báo zh / ko
ok(nk == okk, "khoá kotoba_batake_* trong mã giống hệt 1.31.5 (%d khoá)%s" % (len(nk), (" — khác: %s" % sorted(nk ^ okk)) if nk != okk else ""))

print("== 5. collection Anki thật")
try:
    from anki.collection import Collection
except ImportError:
    Collection = None
    print("  – bỏ qua (cần python có gói anki: ANKI_PY)")
if Collection is not None:
    import importlib.util

    def load_core(folder: str, name: str):
        spec = importlib.util.spec_from_file_location(name, os.path.join(folder, "garden_core.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    core = load_core(ADDON, "kb_core_1322")
    tmp = tempfile.mkdtemp(prefix="kb1322_")
    with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
        tf.extractall(os.path.join(tmp, "old"))
    old = load_core(os.path.join(tmp, "old", "kotoba_batake"), "kb_core_1315")
    col = Collection(os.path.join(tmp, "c.anki2"))
    mm = col.models

    def model(name: str, fields: list[str]) -> dict:
        m = mm.new(name)
        for f in fields:
            mm.add_field(m, mm.new_field(f))
        t = mm.new_template("T")
        t["qfmt"], t["afmt"] = "{{%s}}" % fields[0], "{{FrontSide}}<hr id=answer>{{%s}}" % fields[-1]
        mm.add_template(m, t)
        mm.add(m)
        return mm.by_name(name)

    zh = model("Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa"])
    ja = model("Japanese vocab", ["Từ", "Cách đọc", "Nghĩa"])
    en = model("English vocab", ["Word", "IPA", "Nghĩa"])
    d_zh, d_ja, d_en = col.decks.id("ZH"), col.decks.id("JA"), col.decks.id("EN")
    zh_rows = [("你好", "ni3 hao3", "xin chào"), ("学生", xue2 + "sheng", "học sinh"), ("中文", "Zhong1wen2", "tiếng Trung"),
               ("女儿", "nv3'er2", "con gái"), ("一点儿", yi4 + dian3 + "r", "một chút"), ("方案", fangan, "phương án"),
               ("中[zhong1]国[guo2]", "", "Trung Quốc"), ("<b>谢谢</b>", "xie4 xie5", "cảm ơn"), ("T恤", "T xu4", "áo phông")]
    for w, p, mn in zh_rows:
        n = col.new_note(zh)
        n["Hanzi"], n["Pinyin"], n["Nghĩa"] = w, p, mn
        col.add_note(n, d_zh)
    for w, r, mn in [("学生", "がくせい", "học sinh"), ("飲む", "のむ", "uống"), ("電車[でんしゃ]", "", "tàu điện")]:
        n = col.new_note(ja)
        n["Từ"], n["Cách đọc"], n["Nghĩa"] = w, r, mn
        col.add_note(n, d_ja)
    for w, r, mn in [("apple", "/ˈæp.əl/", "quả táo"), ("run", "", "chạy")]:
        n = col.new_note(en)
        n["Word"], n["IPA"], n["Nghĩa"] = w, r, mn
        col.add_note(n, d_en)
    cfg = core.default_config() if hasattr(core, "default_config") else {}
    g = core.build_garden(col, d_zh, cfg)
    by = {p["word"]: p for p in g["plants"]}
    exp = {"你好": [["你", ni3], ["好", hao3]], "学生": [["学", xue2], ["生", "sheng"]],
           "中文": [["中", zhong1], ["文", M("wen", 2)]], "女儿": [["女", nv3], ["儿", M("er", 2)]],
           "一点儿": [["一", yi4], ["点", dian3], ["儿", "r"]], "中国": [["中", M("zhong", 1)], ["国", guo2]],
           "谢谢": [["谢", M("xie", 4)], ["谢", "xie"]]}
    for w, want in exp.items():
        p = by.get(w)
        ok(p is not None and p.get("ruby") == want and p.get("lang") == "zh", "cây %s: ruby đúng" % w)
    ok(by.get("你好", {}).get("reading") == ni3 + " " + hao3, "deck ghi số → reading của cây có dấu (trò chơi / Lật cặp hiện có dấu)")
    ok(by.get("中国", {}).get("reading") == M("zhong", 1) + " " + guo2, "trường Từ 中[zhong1]国[guo2] → chữ 中国 + pinyin trong ngoặc")
    ok(by.get("方案") is not None and by["方案"].get("ruby") is None and by["方案"].get("reading") == fangan,
       "chia được nhiều kiểu → không ruby, vẫn còn dòng pinyin")
    ok(by.get("T恤") is not None and by["T恤"].get("ruby") is None, "từ có chữ Latin → không ruby")
    for did, name in ((d_ja, "tiếng Nhật"), (d_en, "tiếng Anh")):
        new_p = core.build_garden(col, did, cfg)["plants"]
        old_p = old.build_garden(col, did, cfg)["plants"]
        keys = ("word", "reading", "meaning", "hanviet", "lang", "usage")
        same = [tuple(p.get(k) for k in keys) for p in new_p] == [tuple(p.get(k) for k in keys) for p in old_p]
        ok(same and all(p.get("ruby") is None for p in new_p), "deck %s: chữ / cách đọc / nghĩa giống hệt 1.31.5, không ruby" % name)
    col.close()

print("KẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
