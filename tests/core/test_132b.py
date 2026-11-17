"""1.32 — kiểm tra lần cuối, kịch bản NGOÀI các test có sẵn (người dùng 17/11: "kiểm tra lại logic, giao diện, tính năng,
lần cuối nhé. test kỹ hơn, tạo kịch bản test ngoài các test đã có sẵn, có làm mất dữ liệu không").

1. Hai máy, ba bản: mã THẬT của 1.31.3 (đã phát hành), 1.31.5 và 1.32 thay nhau đọc / lưu Cấu hình trường trên cùng một
   kho (như đồng bộ AnkiWeb giữa máy đã cập nhật và máy chưa) — 3.000 thao tác ngẫu nhiên (lưu loại note với ngôn ngữ / loại /
   trường ngẫu nhiên, đổi chế độ trò chơi). Sau MỖI thao tác:
   - không loại note nào đã lưu bị mất cấu hình; trường Từ / Nghĩa đúng bản lưu sau cùng;
   - ngôn ngữ 1.32 thấy = lựa chọn sau cùng (bản cũ ghi "other" cho deck tiếng Trung không làm mất tiếng Trung; bản cũ chọn
     Tiếng Anh / Nhật thì thắng);
   - Hán Việt (vai trò mới) và chế độ trò chơi tiếng Trung / Hàn còn nguyên qua lần lưu của bản cũ;
   - khoá lạ của bản sau này (vd. 2.x) còn nguyên; bản cũ đọc được (chỉ thấy ja / en / other);
   - 1.32 đọc → lưu → đọc lại không đổi gì (ổn định).
2. Dữ liệu hỏng / lạ trong khoá cấu hình (lang2 / f2 / games_lang2 sai kiểu, mã loại note lạ, quá nhiều mục): không lỗi,
   chỉ bỏ phần hỏng, phần tốt giữ nguyên; bản cũ vẫn đọc được thứ 1.32 ghi ra.
3. Deck tiếng Trung đã cấu hình ở bản cũ ("Ngôn ngữ khác" — bản cũ chưa có lựa chọn nào khác): 1.32 nhận lại là tiếng
   Trung; người dùng chọn "Ngôn ngữ khác" ở 1.32 thì giữ, kể cả khi máy cũ lưu đè.
4. Chữ của người dùng không bị đổi: từ vựng / tên tự đặt trùng câu tiếng Nhật của StackChan (すごい, えへへ…) giữ nguyên ở
   mọi ngôn ngữ (dấu cô lập U+2068 / U+2069); mã trang bọc đúng các chỗ ghép tên vào câu nói.
5. glang.js với chuỗi ngẫu nhiên (node): không lỗi, không ra "undefined", chuỗi không có chữ Nhật giữ nguyên.

Chạy: python test_132b.py ADDON
"""
from __future__ import annotations

import copy
import importlib.util
import io
import json
import os
import random
import re
import subprocess
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
import ma_cu  # noqa: E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


def load_fields(folder: str, name: str):
    """Nạp fields_core.py của một bản dưới tên riêng (ba bản cùng chạy trong một tiến trình)."""
    spec = importlib.util.spec_from_file_location(name, os.path.join(folder, "fields_core.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, folder)            # backup_core của đúng bản đó
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.path.remove(folder)
        sys.modules.pop("backup_core", None)
    return mod


TMP = tempfile.mkdtemp(prefix="kb132b_")
OLD = {}
for commit, ver in (("e64eb22", "1.31.3"), ("d5efb47", "1.31.5")):
    d = os.path.join(TMP, commit)
    os.makedirs(d)
    with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, commit))) as t:
        t.extractall(d)
    OLD[ver] = load_fields(os.path.join(d, "kotoba_batake"), "fields_" + commit)
NEW = load_fields(ADDON, "fields_new")
ok(NEW.NEW_LANGS == ("zh", "ko") and all("zh" not in m.LANGS for m in OLD.values()), "nạp mã thật 1.31.3, 1.31.5 (không biết zh / ko) và 1.32")

# ---------------------------------------------------------------------------
print("== 1. ba bản thay nhau lưu Cấu hình trường (3.000 thao tác ngẫu nhiên)")
rnd = random.Random(int(os.environ.get("KB_SEED", "1322")))
MIDS = [str(1000 + i) for i in range(12)]
FIELDS = ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt", "Word", "Meaning", "Front", "Back"]
path = os.path.join(TMP, "fields.json")
json.dump({"tuong_lai": {"giu": [1, 2, 3]}}, open(path, "w", encoding="utf-8"))      # khoá của một bản sau này
stores = {"new": NEW.FieldStore(path)}
stores.update({v: m.FieldStore(path) for v, m in OLD.items()})
expect_model: dict[str, dict] = {}       # mid → {"word", "meaning", "hv": Hán Việt mong đợi | None}
expect_lang: dict[str, str] = {}         # mid → ngôn ngữ 1.32 phải thấy
expect_games: dict[str, str] = {}        # "zh:crow" → chế độ
fails: list[str] = []
writes = {"new": 0, "1.31.3": 0, "1.31.5": 0}
for step in range(3000):
    who = rnd.choice(["new", "new", "1.31.3", "1.31.5"])
    st, mod = stores[who], (NEW if who == "new" else OLD[who])
    mid = rnd.choice(MIDS)
    op = rnd.random()
    try:
        if op < 0.7:
            langs = ["ja", "en", "zh", "ko", "other"] if who == "new" else ["ja", "en", "other"]
            lang = rnd.choice(langs)
            kinds = mod.LANG_KINDS[lang]
            kind = rnd.choice(kinds)
            word, meaning = rnd.sample(FIELDS, 2)
            f = {"word": word}
            req = mod.required(kind)
            if "meaning" in req or rnd.random() < 0.7:
                f["meaning"] = meaning
            if kind == "kanji":
                f["hanviet"] = "Hán Việt"
            hv = None
            if who == "new" and lang in ("zh", "ko") and kind == "vocab" and rnd.random() < 0.6:
                f["hanviet"] = "Hán Việt"
                hv = "Hán Việt"
            conf, err = mod.validate_save({"kind": kind, "f": f}, FIELDS, lang)
            if conf is None:
                continue
            l2_before = (json.load(open(path, encoding="utf-8")).get("lang2") or {}).get(mid)
            st.set_model(mid, conf, lang)
            writes[who] += 1
            prev = expect_model.get(mid) or {}
            if kind == "kanji":
                hv = "Hán Việt"
            elif who != "new" and prev.get("hv"):
                # Hán Việt của từ vựng tiếng Trung / Hàn nằm ở f2 → còn sau khi máy cũ lưu lại loại note đó (vẫn từ vựng,
                # vẫn "other"); Hán Việt của loại Chữ Hán nằm trong cấu hình → máy cũ cấu hình lại là thay luôn (đúng ý)
                hv = prev["hv"] if (kind == "vocab" and prev.get("kind") == "vocab" and expect_lang.get(mid) in ("zh", "ko")
                                    and lang == "other") else None
            expect_model[mid] = {"word": f["word"], "meaning": f.get("meaning"), "hv": hv, "kind": kind}
            if who == "new":
                expect_lang[mid] = lang
            elif lang == "other" and l2_before in ("zh", "ko"):
                # bản cũ chỉ có "other" cho deck tiếng Trung / Hàn → lựa chọn tiếng Trung / Hàn đã lưu ở 1.32 vẫn dùng
                expect_lang[mid] = l2_before
            else:
                expect_lang[mid] = lang
        else:
            grp = rnd.choice(["vocab", "kanji", "en", "xx"] + (["zh", "ko"] if who == "new" else []))
            game = rnd.choice(list(mod.GAME_MODES))
            modes = mod.GAME_MODES[game].get(grp) or []
            if not modes:
                continue
            m = rnd.choice(modes)
            st.set_game(game, grp, m)
            writes[who] += 1
            if grp in ("zh", "ko"):
                expect_games[grp + ":" + game] = m
    except Exception as e:      # noqa: BLE001
        fails.append("bước %d (%s): lỗi %r" % (step, who, e))
        break
    if os.environ.get("KB_DEBUG_MID") and mid == os.environ["KB_DEBUG_MID"]:
        print("   [debug] bước", step, who, "op", round(op, 2), json.dumps(json.load(open(path, encoding="utf-8")).get("models", {}).get(mid)),
              "f2", json.load(open(path, encoding="utf-8")).get("f2", {}).get(mid), "lang", json.load(open(path, encoding="utf-8")).get("lang", {}).get(mid),
              json.load(open(path, encoding="utf-8")).get("lang2", {}).get(mid), "exp", expect_model.get(mid), expect_lang.get(mid))
    raw = json.load(open(path, encoding="utf-8"))
    if raw.get("tuong_lai") != {"giu": [1, 2, 3]}:
        fails.append("bước %d (%s): mất khoá của bản sau" % (step, who))
    seen = NEW.clean_store(raw)
    for k, e in expect_model.items():
        c = seen["models"].get(k)
        if not c or c["f"].get("word") != e["word"] or c["f"].get("meaning") != e["meaning"]:
            fails.append("bước %d (%s): loại note %s: %r ≠ %r" % (step, who, k, c, e))
        elif e["hv"] and c["f"].get("hanviet") != e["hv"] and NEW.LANG_KINDS.get(seen["lang"].get(k), ()) and \
                "hanviet" in NEW.role_ids(c["kind"], seen["lang"].get(k)):
            fails.append("bước %d (%s): mất Hán Việt của %s" % (step, who, k))
    for k, lang in expect_lang.items():
        if seen["lang"].get(k) != lang:
            fails.append("bước %d (%s): ngôn ngữ %s: %r ≠ %r" % (step, who, k, seen["lang"].get(k), lang))
    for key, m in expect_games.items():
        g, game = key.split(":")
        if (seen["games_lang"].get(g) or {}).get(game) != m:
            fails.append("bước %d (%s): mất chế độ %s" % (step, who, key))
    for v, om in OLD.items():
        o = om.clean_store(raw)
        if any(x not in ("ja", "en", "other") for x in o["lang"].values()):
            fails.append("bước %d: bản %s thấy ngôn ngữ lạ" % (step, v))
    again = NEW.clean_store(NEW.to_raw(seen))
    if again != seen:
        fails.append("bước %d: đọc → ghi → đọc lại khác nhau" % step)
    if len(fails) > 5:
        break
ok(not fails, "3.000 bước (1.32 ghi %d, 1.31.3 ghi %d, 1.31.5 ghi %d): không mất loại note / ngôn ngữ / Hán Việt / chế độ "
   "trò chơi / khoá lạ, ổn định%s" % (writes["new"], writes["1.31.3"], writes["1.31.5"], "" if not fails else " — " + "; ".join(fails[:3])))
ok(len(expect_model) == len(MIDS) and min(writes.values()) > 300, "đủ %d loại note, cả ba bản đều ghi nhiều lần" % len(expect_model))

# ---------------------------------------------------------------------------
print("== 2. dữ liệu hỏng / lạ")
good = NEW.to_raw({"models": {"1": {"kind": "vocab", "f": {"word": "Hanzi", "meaning": "Nghĩa", "hanviet": "HV"}}},
                   "lang": {"1": "zh"}, "games": {}, "games_lang": {"zh": {"crow": "pinyin"}}})
bad_cases = {
    "lang2 là chuỗi": dict(good, lang2="zh"),
    "lang2 có giá trị lạ": dict(good, lang2={"1": "zh", "2": "fr", "x": "ko", "3": None, "4": ["ko"]}),
    "f2 là danh sách": dict(good, f2=["HV"]),
    "f2 của loại note không còn": dict(good, f2={"1": {"hanviet": "HV"}, "999": {"hanviet": "HV"}}),
    "f2 có vai trò lạ / sai kiểu": dict(good, f2={"1": {"hanviet": "HV", "bay": "x", "word": 5}}),
    "games_lang2 sai kiểu": dict(good, games_lang2={"zh": {"crow": "pinyin", "bay": "x", "market": 5}, "ko": {"crow": "khong_co"},
                                                    "fr": {"crow": "spell"}, "en": "spell"}),
    "fixed là chuỗi": dict(good, fixed="1"),
    "quá nhiều loại note": dict(good, lang2={str(i): "zh" for i in range(5000)}),
}
for name, raw in bad_cases.items():
    try:
        st = NEW.clean_store(copy.deepcopy(raw))
        okk = st["models"]["1"]["f"].get("word") == "Hanzi" and st["lang"].get("1") in ("zh", "other")
        out = NEW.to_raw(st)
        old_ok = all(m.clean_store(json.loads(json.dumps(out)))["models"]["1"]["f"]["word"] == "Hanzi" for m in OLD.values())
        ok(okk and old_ok and len(json.dumps(out)) < 400000, "%s: không lỗi, phần tốt giữ nguyên, bản cũ đọc được" % name)
    except Exception as e:      # noqa: BLE001
        ok(False, "%s: lỗi %r" % (name, e))
st = NEW.clean_store(bad_cases["f2 có vai trò lạ / sai kiểu"])
ok(st["models"]["1"]["f"] == {"word": "Hanzi", "meaning": "Nghĩa", "hanviet": "HV"}, "f2 không ghi đè được trường đã cấu hình, vai trò lạ bị bỏ")
ok(NEW.clean_store(bad_cases["games_lang2 sai kiểu"])["games_lang"] == {"zh": {"crow": "pinyin"}}, "chế độ trò chơi lạ bị bỏ, chế độ tốt giữ")

# ---------------------------------------------------------------------------
print("== 3. deck tiếng Trung đã cấu hình ở bản cũ")
p3 = os.path.join(TMP, "f3.json")
old = OLD["1.31.3"].FieldStore(p3)
conf, _e = OLD["1.31.3"].validate_save({"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa"}}, FIELDS, "other")
old.set_model("77", conf, "other")
st = NEW.FieldStore(p3).load()
ok(st["lang"]["77"] == "other" and "77" not in st["fixed"], "1.31.3 lưu deck tiếng Trung là \"other\" (bản cũ không có lựa chọn khác)")
ok(NEW.effective_lang(st, "77", "zh") == "zh", "1.32 đoán ra tiếng Trung → dùng tiếng Trung (không kẹt ở Ngôn ngữ khác)")
ok(NEW.effective_lang(st, "77", "ja") == "other", "deck đoán ra không phải tiếng Trung / Hàn → vẫn Ngôn ngữ khác như người dùng chọn")
ok(NEW.effective_lang(st, "88", "zh") is None, "loại note chưa cấu hình → dùng ngôn ngữ đoán được")
newst = NEW.FieldStore(p3)
c2, _e = NEW.validate_save({"kind": "vocab", "f": {"word": "Hanzi", "meaning": "Nghĩa"}}, FIELDS, "other")
newst.set_model("77", c2, "other")
raw3 = json.load(open(p3, encoding="utf-8"))
ok(raw3["lang"]["77"] == "other" and raw3["lang2"].get("77") == "other", "chọn \"Ngôn ngữ khác\" ở 1.32 → ghi lang2 = other")
ok(NEW.effective_lang(newst.load(), "77", "zh") == "other", "→ giữ Ngôn ngữ khác dù deck đoán ra tiếng Trung")
c3, _e = OLD["1.31.3"].validate_save({"kind": "vocab", "f": {"word": "Pinyin", "meaning": "Nghĩa"}}, FIELDS, "other")
old.set_model("77", c3, "other")
ok(NEW.effective_lang(newst.load(), "77", "zh") == "other" and newst.load()["models"]["77"]["f"]["word"] == "Pinyin",
   "máy cũ lưu đè loại note đó: vẫn giữ Ngôn ngữ khác, cấu hình mới của máy cũ được dùng")
newst.set_model("77", c2, "zh")
ok(NEW.effective_lang(newst.load(), "77", "ja") == "zh" and "77" not in newst.load()["fixed"], "chọn lại Tiếng Trung → bỏ dấu \"Ngôn ngữ khác\"")
old.set_model("77", c3, "en")
ok(NEW.effective_lang(newst.load(), "77", "zh") == "en", "máy cũ chọn Tiếng Anh → Tiếng Anh thắng")

# ---------------------------------------------------------------------------
print("== 4. chữ của người dùng không bị đổi")
fx = open(os.path.join(ADDON, "web", "fx.js"), encoding="utf-8").read()
home = open(os.path.join(ADDON, "web", "home.js"), encoding="utf-8").read()
ok("kbKeep(name)" in fx and "\\u2068" in fx, "fx.js: từ vựng của cây trong câu \"lên giai đoạn\" được bọc giữ nguyên")
joined = re.findall(r'mood\("[a-z]+", \d+, "[^"]*" \+ ([^;]+)\);', home)
bare = [x for x in joined if not x.startswith("keep(")]
ok(joined and not bare, "home.js: mọi câu StackChan ghép tên (vùng, món, thú, giao diện mùa) đều bọc keep(…)%s" % ("" if not bare else " — " + str(bare[:3])))
sys.path.insert(0, ADDON)
import lang_core  # noqa: E402
with tempfile.TemporaryDirectory() as td:
    jf = os.path.join(td, "b.json")
    json.dump(lang_core.bundle(), open(jf, "w", encoding="utf-8"), ensure_ascii=False)
    code = r"""
const fs = require('fs');
global.GardenPrefs = { get: () => null, set() {} };
eval(fs.readFileSync(process.argv[1] + '/web/glang.js', 'utf8').replace('var GardenLang', 'global.GardenLang'));
const G = global.GardenLang; G.setData({ gl: JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), plants: [] });
const out = {};
const K = (s) => '⁨' + s + '⁩';
out.keep = ['en', 'zh', 'ko', 'vi'].map((l) => G.line('やった！ ' + K('すごい') + ' → Ra quả', l));
out.keep2 = G.line('よろしくね！ Chào ' + K('えへへ'), 'en');
out.open = G.line('やった！ ' + '⁨' + 'すごい', 'en');
// chuỗi ngẫu nhiên: không lỗi, không "undefined", chuỗi không có chữ Nhật giữ nguyên
let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pool = Object.keys(G._parts ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).say : {}).concat(['a', ' ', '!', 'Mưa', '⁨', '⁩', '学', 'す', 'ー', '～', '♪', '%s', '<b>', '"']);
let bad = 0, n = 0, plain = 0;
for (let i = 0; i < 4000; i++) {
  let s = ''; const L = 1 + Math.floor(r() * 6);
  for (let j = 0; j < L; j++) { s += pool[Math.floor(r() * pool.length)]; }
  for (const l of ['ja', 'en', 'zh', 'ko', 'vi']) {
    n++;
    try { const o = G.line(s, l); if (typeof o !== 'string' || /undefined|null/.test(o) && !/undefined|null/.test(s)) bad++;
      if (!/[぀-ヿ㐀-鿿]/.test(s) && l !== 'vi' && o !== s.replace(/\s{2,}/g, ' ').trim() && l !== 'ja') plain++; }
    catch (e) { bad++; }
  }
}
out.fuzz = { bad, n, plain };
console.log(JSON.stringify(out));
"""
    r = subprocess.run(["node", "-e", code, ADDON, jf], capture_output=True, text=True)
    res = json.loads(r.stdout) if r.returncode == 0 else {}
    if r.returncode:
        print(r.stderr[-1500:])
K = "⁨すごい⁩"
ok(res.get("keep") == ["Yay! %s → Ra quả" % K, "太好了！ %s → Ra quả" % K, "해냈다! %s → Ra quả" % K, "Tuyệt! %s → Ra quả" % K],
   "từ vựng すごい trong câu \"lên giai đoạn\" giữ nguyên ở Anh / Trung / Hàn / chỉ tiếng Việt: %s" % res.get("keep"))
ok(res.get("keep2") == "Nice to meet you! Chào ⁨えへへ⁩", "tên thú tự đặt えへへ giữ nguyên")
ok(res.get("open") == "Yay! ⁨すごい", "dấu cô lập thiếu dấu đóng: phần sau vẫn giữ nguyên, không lỗi")
fz = res.get("fuzz") or {}
ok(fz.get("n") == 20000 and fz.get("bad") == 0 and fz.get("plain") == 0,
   "glang.js: %s chuỗi ngẫu nhiên × 5 ngôn ngữ — không lỗi / undefined, chuỗi không có chữ Nhật giữ nguyên" % fz.get("n"))

print("\nKẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
