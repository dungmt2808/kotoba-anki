"""1.31.4 (python thường; ANKI_PY = python có gói anki thì thêm phần collection Anki thật).

Bản đầu tiên sau khi phát hành công khai (16/11) — người dùng: "khi update đảm bảo dữ liệu người dùng không bị mất".
  1. Hợp đồng dữ liệu với bản đã phát hành 1.31.3 (gói ở commit e64eb22): mọi file của add-on ngoài 6 file có sửa giống
     hệt từng byte (mọi kho lưu, sao lưu, đồng bộ, báo, nhật ký… không đổi); garden_core.py = bản cũ + đúng một hàm mới;
     fields_core.py chỉ đổi cách đoán ngôn ngữ; __init__.py không bỏ dòng nào ngoài lệnh reviewDone; config.json giữ nguyên
     (không thêm / bỏ mục cấu hình nào).
  2. Đoán ngôn ngữ: deck tiếng Trung (giản thể / phồn thể) để loại note tên chung → "other" (1.31.3: "ja"); mọi deck
     không phải tiếng Trung cho kết quả y như mã 1.31.3 thật (chữ Hán N5 / N4, từ tiếng Nhật của dữ liệu thử, tiếng Hàn,
     tiếng Anh, tiếng Việt); chữ "chỉ tiếng Trung" không có trong bất kỳ dòng chữ Nhật nào của repo.
  3. Ctrl+Z trong bảng ôn: nút, phím, lệnh rv:undo, móc state_did_undo không báo hai lần.
  4. (ANKI_PY) garden_core.review_undo_target trên collection Anki thật: chỉ nhận lượt chấm của vườn khi nó là bước Undo
     kế tiếp của Anki và là dòng revlog mới nhất.
Chạy: python3 tests/core/test_1314.py ADDON  (hoặc ${ANKI_PY} …)
"""
from __future__ import annotations

import ast
import glob
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "kotoba_batake")
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
STUBS = os.path.join(HERE, "..", "stubs")
sys.path.insert(0, HERE)
import ma_cu  # noqa: E402

RELEASED = "e64eb22"         # gói 1.31.3 đã phát hành (16/11/2026)
CHANGED = {"__init__.py", "garden_core.py", "fields_core.py", "web/garden.js", "web/garden.css", "web/body.html",
           "manifest.json", "README.md"}

results: list[bool] = []


def ok(c: bool, m: str) -> None:
    results.append(bool(c))
    print(("  ✓ " if c else "  ✗ ") + m)


def read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


# ---------------------------------------------------------------------------
print("== 1. hợp đồng dữ liệu với bản đã phát hành 1.31.3 (" + RELEASED + ")")
OLD = None
try:
    tmp = tempfile.mkdtemp(prefix="kb1314_")
    with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, RELEASED))) as t:
        t.extractall(tmp)  # noqa: S202 — bản lưu của chính repo
    OLD = os.path.join(tmp, "kotoba_batake")
except Exception as e:      # chạy trên gói đã giải nén ngoài repo, không có git / bản lưu
    print("  (bỏ qua phần so với 1.31.3: %s)" % str(e)[:100])

VER = json.loads(read(os.path.join(ADDON, "manifest.json")).decode("utf-8")).get("human_version")
if OLD and VER != "1.31.4":      # bản sau đổi thêm file: hợp đồng là của riêng 1.31.4 — bản sau viết hợp đồng của mình
    print("  (bỏ qua: add-on là bản %s — phần này chỉ so 1.31.4 với 1.31.3)" % VER)
    OLD_CONTRACT = False
else:
    OLD_CONTRACT = bool(OLD)
if OLD_CONTRACT:
    def files(base: str) -> set[str]:
        out = set()
        for p in glob.glob(os.path.join(base, "**", "*"), recursive=True):
            r = os.path.relpath(p, base).replace(os.sep, "/")
            if os.path.isfile(p) and "__pycache__" not in r and not r.endswith(".pyc") and r != "meta.json" \
                    and not (r.startswith("user_files/") and r != "user_files/README.txt"):
                out.add(r)
        return out
    fo, fn = files(OLD), files(ADDON)
    ok(fo == fn, "cùng danh sách file với 1.31.3 (%d file; thêm: %s, bớt: %s)" % (len(fn), sorted(fn - fo)[:5], sorted(fo - fn)[:5]))
    same = [r for r in sorted(fo & fn) if r not in CHANGED and read(os.path.join(OLD, r)) == read(os.path.join(ADDON, r))]
    diff = [r for r in sorted(fo & fn) if r not in CHANGED and r not in same]
    ok(not diff, "%d file ngoài các file có sửa giống hệt 1.31.3 từng byte (kho lưu, sao lưu, đồng bộ, báo, nhật ký…)%s"
       % (len(same), "" if not diff else " — KHÁC: " + ", ".join(diff)))
    for must in ("backup_core.py", "sync_core.py", "more_core.py", "journal_core.py", "life_core.py", "finds_core.py",
                 "guest_core.py", "decor_core.py", "wear_core.py", "paper_core.py", "words_core.py", "share_core.py",
                 "config.json"):
        if must not in same:
            ok(False, must + " phải giữ nguyên")
    ok(json.loads(read(os.path.join(OLD, "config.json"))) == json.loads(read(os.path.join(ADDON, "config.json"))),
       "config.json giữ nguyên: không thêm / bỏ mục cấu hình (cấu hình người dùng đã chỉnh còn nguyên)")

    def top_defs(src: str) -> dict[str, str]:
        out: dict[str, str] = {}
        for n in ast.parse(src).body:
            if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name):
                k = n.targets[0].id
            elif isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name):
                k = n.target.id
            else:
                k = getattr(n, "name", None) or ast.unparse(n)[:60]
            out[k] = ast.unparse(n)
        return out
    go, gn = top_defs(read(os.path.join(OLD, "garden_core.py")).decode()), top_defs(read(os.path.join(ADDON, "garden_core.py")).decode())
    added = sorted(set(gn) - set(go))
    changed = sorted(k for k in go if k in gn and go[k] != gn[k])
    ok(added == ["review_undo_target"] and not changed and set(go) <= set(gn),
       "garden_core.py = 1.31.3 + đúng một hàm mới review_undo_target (thêm %s, đổi %s)" % (added, changed))
    fo_, fn_ = top_defs(read(os.path.join(OLD, "fields_core.py")).decode()), top_defs(read(os.path.join(ADDON, "fields_core.py")).decode())
    changed = sorted(k for k in fo_ if k in fn_ and fo_[k] != fn_[k])
    added = sorted(set(fn_) - set(fo_))
    ok(changed == ["guess_lang"] and set(added) == {"_ZH_ONLY", "_JA_HINT"} and set(fo_) <= set(fn_),
       "fields_core.py chỉ đổi guess_lang (+ _ZH_ONLY, _JA_HINT); FieldStore / clean_store / lưu cấu hình trường giữ nguyên")
    io_ = read(os.path.join(OLD, "__init__.py")).decode().splitlines()
    in_ = read(os.path.join(ADDON, "__init__.py")).decode().splitlines()
    import difflib
    removed = [l[1:].strip() for l in difflib.unified_diff(io_, in_, lineterm="", n=0) if l.startswith("-") and not l.startswith("---")]
    ok(removed == ['self._js("reviewDone", {"counts": [queued.new_count, queued.learning_count, queued.review_count]})'],
       "__init__.py chỉ thêm dòng (bỏ đúng 1 dòng: lệnh reviewDone, nay gửi kèm 'undo') — %d dòng bỏ" % len(removed))
    writes_old = sorted(l.strip() for l in io_ if re.search(r"set_config|commit_config|put_config|\.save\(", l))
    writes_new = sorted(l.strip() for l in in_ if re.search(r"set_config|commit_config|put_config|\.save\(", l))
    ok(writes_old == writes_new, "__init__.py: không thêm / bỏ chỗ ghi dữ liệu nào (%d dòng ghi giống hệt)" % len(writes_new))

# ---------------------------------------------------------------------------
print("== 2. đoán ngôn ngữ: deck tiếng Trung")
sys.path.insert(0, ADDON)
import fields_core as F  # noqa: E402

HSK1 = ["爱", "八", "爸爸", "杯子", "北京", "本", "不客气", "不", "菜", "茶", "吃", "出租车", "打电话", "大", "的", "点", "电脑",
        "电视", "电影", "东西", "都", "读", "对不起", "多", "多少", "儿子", "二", "饭店", "飞机", "分钟", "高兴", "个", "工作",
        "狗", "汉语", "好", "号", "喝", "和", "很", "后面", "回", "会", "几", "家", "叫", "今天", "九", "开", "看", "看见", "块",
        "来", "老师", "了", "冷", "里", "六", "妈妈", "吗", "买", "猫", "没关系", "没有", "米饭", "名字", "明天", "哪", "哪儿",
        "那", "呢", "能", "你", "年", "女儿", "朋友", "漂亮", "苹果", "七", "前面", "钱", "请", "去", "热", "人", "认识", "三",
        "商店", "上", "上午", "少", "谁", "什么", "十", "时候", "是", "书", "水", "水果", "睡觉", "说", "四", "岁", "他", "她",
        "太", "天气", "听", "同学", "喂", "我", "我们", "五", "喜欢", "下", "下午", "下雨", "先生", "现在", "想", "小", "小姐",
        "些", "写", "星期", "学生", "学习", "学校", "一", "衣服", "医生", "医院", "椅子", "有", "月", "在", "再见", "怎么",
        "怎么样", "这", "中国", "中午", "住", "桌子", "字", "昨天", "坐", "做"]
# 1.32: deck tiếng Trung / tiếng Hàn có ngôn ngữ riêng ("zh" / "ko" — lưu cho bản cũ là "other")
ZH = "zh" if "zh" in getattr(F, "LANGS", ()) else "other"
KO = "ko" if "ko" in getattr(F, "LANGS", ()) else "other"
TRAD = ["你好", "謝謝", "學生", "老師", "我們", "這個", "對不起", "說話", "電腦", "喜歡", "時間", "東西", "朋友", "國家", "來"]
ok(F.guess_lang("Basic", ["Front", "Back"], HSK1[:30]) == ZH, "HSK 1 (30 từ đầu, theo vần — ít chữ giản thể nhất) → Ngôn ngữ khác")
ok(all(F.guess_lang("Basic", ["Front", "Back"], HSK1[i:i + 30]) == ZH for i in range(0, len(HSK1) - 29, 10)),
   "mọi đoạn 30 từ liên tiếp của HSK 1 (%d từ) → Ngôn ngữ khác" % len(HSK1))
ok(F.guess_lang("Basic", ["Front", "Back"], TRAD) == ZH, "phồn thể (Đài Loan) → Ngôn ngữ khác")
ok(F.guess_lang("Basic", ["Front", "Back"], ["你好"]) == ZH, "deck mới có 1 từ 你好 → Ngôn ngữ khác")
ok(F.guess_lang("Từ vựng", ["Từ", "Nghĩa"], ["你好", "谢谢", "朋友"]) == ZH, "loại note tên tiếng Việt, trường tiếng Việt")
ok(F.guess_lang("Japanese Kanji", ["Kanji", "Meaning"], ["你", "们", "学"]) == "ja", "tên loại note ghi tiếng Nhật → vẫn tiếng Nhật")
ok(F.guess_lang("Basic", ["Front", "Back"], ["你好", "食べる", "飲む", "勉強する"]) == "ja", "có kana ở ≥ 20 % số từ → tiếng Nhật như cũ")

print("== 2b. mọi deck không phải tiếng Trung: kết quả y như mã 1.31.3")
N5 = list("日一国人年大十二本中長出三時行見月分後前生五間上東四今金九入学高円子外八六下来気小七山話女北午百書先名川千水半男西電校語土木聞食車何南万毎白天母火右読友左休父雨")
N4 = list("会同事自社発者地業方新場員立開手力問代明動京目通言理体田主題意不作用度強公持野以思家世多正安院心界教文元重近考画海売知道集別物使品計死特私始朝運終台広住真有口少町料工建空急止送切転研足究楽起着店病質待試族銀早映親験英医仕去味写字答夜音注帰古歌買悪図週室歩風紙黒花春赤青館屋色走秋夏習駅洋旅服夕借曜飲肉貸堂鳥飯勉冬昼茶弟牛魚兄犬妹姉漢")
samples: list[tuple[str, list[str], list[str]]] = [
    ("Basic", ["Front", "Back"], N5[:30]), ("Basic", ["Front", "Back"], N5[30:60]), ("Basic", ["Front", "Back"], N5[60:]),
    ("Basic", ["Front", "Back"], N4[:30]), ("Basic", ["Front", "Back"], N4[30:60]), ("Basic", ["Front", "Back"], N4[60:90]),
    ("Kanji", ["Kanji", "Hán Việt"], N4[90:120]), ("Basic", ["Front", "Back"], ["学生", "先生", "日本", "会社", "電話", "時間", "天気"]),
    ("Basic", ["Front", "Back"], ["사과", "학교", "물", "책", "친구"]), ("Basic", ["Front", "Back"], ["apple", "go", "study", "look up"]),
    ("Basic", ["Front", "Back"], ["xin chào", "cảm ơn", "trường học", "bạn bè"]), ("Basic", ["Front", "Back"], []),
    ("English", ["Word", "IPA"], []), ("Basic", ["Front", "Back"], ["学生", "がくせい"]),
]
# từ tiếng Nhật của dữ liệu thử (bảng phạm vi theo giáo trình, chữ của 8 số báo): từng nhóm 30 từ
pv = json.loads(read(os.path.join(ROOT, "tests", "fixtures", "pham_vi_thu.json")).decode("utf-8"))
words: list[str] = [e[0] for e in pv.get("tu_vung") or [] if isinstance(e, list) and e and isinstance(e[0], str)]
jw = [w for w in words if re.search(r"[぀-ヿ㐀-鿿]", w)]
for i in range(0, len(jw), 30):
    samples.append(("Basic", ["Front", "Back"], jw[i:i + 30]))
only_kanji = [w for w in jw if not re.search(r"[぀-ヿ]", w)]
for i in range(0, len(only_kanji), 30):
    samples.append(("Basic", ["Front", "Back"], only_kanji[i:i + 30]))
ok(len(jw) > 1000 and len(only_kanji) > 100, "dữ liệu thử có %d từ tiếng Nhật (%d từ chỉ chữ Hán)" % (len(jw), len(only_kanji)))
new = [F.guess_lang(*s) for s in samples]
ok(all(r == "ja" for s, r in zip(samples, new) if s[2] and re.search(r"[぀-ヿ一-鿿]", "".join(s[2]))),
   "mọi mẫu tiếng Nhật (%d mẫu: chữ Hán N5 / N4, từ của dữ liệu thử) vẫn là tiếng Nhật" % sum(
       1 for s in samples if s[2] and re.search(r"[぀-ヿ一-鿿]", "".join(s[2]))))
if OLD:
    code = ("import sys, json; sys.path.insert(0, sys.argv[1]); import fields_core as F\n"
            "print(json.dumps([F.guess_lang(*s) for s in json.loads(sys.stdin.read())]))")
    r = subprocess.run([sys.executable, "-c", code, OLD], input=json.dumps(samples), capture_output=True, text=True)
    old = json.loads(r.stdout) if r.returncode == 0 else None
    new = [("other" if x in ("zh", "ko") else x) for x in new]      # 1.32: bản cũ lưu / hiểu zh, ko là "other"
    ok(old == new, "%d mẫu không phải tiếng Trung: mã 1.31.3 thật cho đúng kết quả như 1.31.4%s"
       % (len(samples), "" if old == new else " — khác: " + str([(s[2][:3], a, b) for s, a, b in zip(samples, old or [], new) if a != b][:4])))
    r = subprocess.run([sys.executable, "-c", code, OLD], input=json.dumps([["Basic", ["Front", "Back"], HSK1[:30]]]),
                       capture_output=True, text=True)
    ok(r.returncode == 0 and json.loads(r.stdout) == ["ja"], "(đối chứng) mã 1.31.3 đoán deck HSK 1 là tiếng Nhật — lỗi đã sửa")

kana = re.compile(r"[ぁ-ゖァ-ヺ]")
hangul = re.compile(r"[\uac00-\ud7af]")
lines = hits = 0
for p in glob.glob(os.path.join(ROOT, "**", "*"), recursive=True):
    if "/.git/" in p or not os.path.isfile(p) or not p.endswith((".json", ".md", ".py", ".js", ".txt", ".html")) or p.endswith("test_1314.py"):
        continue
    # 1.32: bảng chữ tiếng Trung / tiếng Hàn (Ngôn ngữ trong vườn) và test / ảnh phác của nó có chữ Trung cạnh chữ Nhật
    if p.endswith(("lang_core.py", "test_132.py", "test_132.js", "e2e_132.js", "mock_132_steps.js", "tieng_nhap.py",
                   "LOI_NHAC_GEMINI.md", "demo_zhko.py", "test_132c.py", "test_132c.js", "e2e_132c.js", "test_133.py", "ai_zh.py", "tao_bao_133.py", "e2e_133.js")) or "/ke_hoach_1_32/" in p or "/kiem_thu/1.32" in p or "/kiem_thu/1.33" in p or "/fixtures/chu_132" in p:
        continue
    try:
        text = read(p).decode("utf-8")
    except Exception:
        continue
    for line in text.splitlines():
        if kana.search(line):
            if hangul.search(line):      # 1.33: bảng nhiều thứ tiếng (tên nhân vật, tên mục báo Nhật / Trung / Hàn)
                continue
            lines += 1
            hits += 1 if F._ZH_ONLY.search(line) else 0
ok(lines > 3000 and hits == 0, "chữ \"chỉ tiếng Trung\" không có trong %d dòng chữ Nhật nào của repo (gặp %d)" % (lines, hits))

# ---------------------------------------------------------------------------
print("== 3. Ctrl+Z trong bảng ôn (soát mã)")
body = read(os.path.join(ADDON, "web", "body.html")).decode()
gjs = read(os.path.join(ADDON, "web", "garden.js")).decode()
ini = read(os.path.join(ADDON, "__init__.py")).decode()
ok(re.search(r'<button[^>]*id="kb-rv-undo"[^>]*title="[^"]*Ctrl\+Z[^"]*"[^>]*hidden', body) is not None,
   "body.html: nút #kb-rv-undo ẩn sẵn, chú thích có Ctrl+Z")
ok('send("rv:undo")' in gjs and re.search(r'e\.ctrlKey \|\| e\.metaKey\) && !e\.shiftKey && !e\.altKey && \(k === "z"', gjs) is not None,
   "garden.js: Ctrl+Z / ⌘Z (không Shift / Alt) → rv:undo")
key_fn = gjs[gjs.index("function key(e)"):gjs.index("function key(e)") + 1400]
# 1.34: "đang gõ" = ô chữ / ô gõ đáp án / textarea / select / chỗ sửa được (typingIn) — vẫn xét trước Ctrl+Z
ok(key_fn.index("typingIn(e.target)") < key_fn.index("undoRate()"), "ô gõ đáp án (INPUT / TEXTAREA / SELECT) giữ Ctrl+Z của ô")
ok('(e.code === "KeyZ" && !latin)' in key_fn,
   "phím vật lý KeyZ chỉ khi phím ra chữ không phải Latin (AZERTY: Ctrl+W, QWERTZ: Ctrl+Y không hoàn tác nhầm)")
ok(gjs.count("setUndo(") >= 5 and "reviewUndo: reviewUndo" in gjs, "trang cập nhật nút ở showCard / reviewDone / closePanel / reviewUndo")
ok('elif cmd == "rv:undo":' in ini and "def _undo_review(self)" in ini, "__init__.py: lệnh rv:undo")
ok(re.search(r"if _undo_quiet:\s+# 1\.31\.4[^\n]*\n\s+return", ini) is not None and "gui_hooks.state_did_undo(out)" in ini,
   "Ctrl+Z của vườn vẫn gọi móc state_did_undo (add-on khác biết) mà không báo hai lần")
ok("CollectionOp(parent=self, op=lambda col: col.undo())" in ini, "hoàn tác bằng thao tác nền của Anki (như Edit → Undo)")

# ---------------------------------------------------------------------------
print("== 4. review_undo_target trên collection Anki thật")
try:
    from anki.collection import Collection
    from anki.scheduler.v3 import CardAnswer
    REAL = True
except Exception:
    REAL = False
if not REAL:
    print("  (bỏ qua: cần gói anki — ANKI_PY=<python có anki>)")
else:
    import garden_core as core

    col = Collection(os.path.join(tempfile.mkdtemp(prefix="kb1314c_"), "c.anki2"))
    did = col.decks.id("Default")
    other_did = col.decks.id("Khác")          # tạo deck trước (tạo deck cũng là một bước Undo)
    for i in range(6):
        n = col.new_note(col.models.by_name("Basic")); n["Front"], n["Back"] = "q%d" % i, "a"; col.add_note(n, did)

    def answer(rating=CardAnswer.GOOD) -> dict[str, int]:
        top = col.sched.get_queued_cards(fetch_limit=1).cards[0]
        c = col.get_card(top.card.id); c.start_timer()
        col.sched.answer_card(col.sched.build_answer(card=c, states=top.states, rating=rating))
        return {"cid": c.id, "rev": int(col.db.scalar("select max(id) from revlog where cid = ?", c.id))}

    stack: list[dict[str, int]] = []
    ok(core.review_undo_target(col, stack) is None, "sổ trống → không có gì để hoàn tác")
    e1 = answer(); stack.append(e1)
    ok(core.review_undo_target(col, stack) is e1, "vừa chấm ở vườn → hoàn tác được lượt đó")
    col.set_config("kotoba_batake_x", {"coins": 3})
    ok(core.review_undo_target(col, stack) is e1, "ghi xu sau lượt chấm (cấu hình, không có bước Undo) → vẫn hoàn tác được")
    e2 = answer(CardAnswer.AGAIN); stack.append(e2)
    ok(core.review_undo_target(col, stack) is e2, "hai lượt → lượt mới nhất trước")
    col.undo()                                      # Undo ở cửa sổ chính
    ok(core.review_undo_target(col, stack) is e1 and stack == [e1], "lượt mới nhất đã Undo ở cửa sổ chính → bỏ khỏi sổ, còn lượt trước")
    n = col.get_note(col.find_notes("")[0]); n["Back"] = "sửa"; col.update_note(n)
    ok(core.review_undo_target(col, stack) is None and stack == [e1], "sửa note sau lượt chấm (Undo kế tiếp: \"%s\") → không hoàn tác" % col.undo_status().undo)
    col.undo()                                      # bỏ chỗ sửa
    ok(core.review_undo_target(col, stack) is e1, "Undo chỗ sửa ở cửa sổ chính → lượt chấm lại hoàn tác được")
    other = answer()                                # chấm ở chỗ khác (không vào sổ của vườn)
    ok(core.review_undo_target(col, stack) is None, "lượt chấm ở chỗ khác sau lượt của vườn → không hoàn tác")
    col.undo()
    col.decks.select(other_did)
    ok(core.review_undo_target(col, stack) is None, "đổi deck (Undo kế tiếp: \"%s\") → không hoàn tác" % col.undo_status().undo)
    col.undo()
    ok(core.review_undo_target(col, stack) is e1, "trả deck → lượt chấm lại hoàn tác được")
    out = col.undo()
    ok(out.operation == col.tr.actions_answer_card() and not col.db.scalar("select count() from revlog where id = ?", e1["rev"]),
       "Undo lúc đó đúng là lượt chấm của vườn (\"%s\")" % out.operation)
    ok(core.review_undo_target(col, stack) is None and stack == [], "hết lượt → None, sổ trống")
    col.close()

print("\nKẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
