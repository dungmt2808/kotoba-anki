"""1.32.1 — kiểm tra lần cuối trước phát hành (17/11), kịch bản NGOÀI các bộ test đã có:

1. Đuổi quạ so đáp án với dữ liệu deck / bộ gõ "bẩn" (core/test_132c.js — hàm thật của web/games.js chạy trong node):
   gõ tiếng Việt kiểu tổ hợp, Hangul tách nét, tiếng Hàn viết liền / cách, pinyin nhiều cách đọc ghi bằng dấu câu Trung /
   ngoặc, 20.000 chuỗi ngẫu nhiên; ô gõ không chấm lúc bộ gõ đang ghép chữ.
2. Đoán ngôn ngữ trên ~25 kiểu deck có thật ngoài đời (HSK, giản / phồn thể, deck người Việt làm, TTMIK, Core 2k, deck tiếng
   Nhật làm cho người Trung / Hàn có trường nghĩa "中文" / "Korean", deck kanji có trường "Chinese reading", bộ thủ, tiếng
   Đức, tiếng Quảng Đông…) — thuần Python, không cần Anki.
3. Cùng các kiểu deck đó trên collection Anki thật (ANKI_PY): ngôn ngữ, trường nào là Từ / Pinyin / Nghĩa / Hán Việt, chữ
   lấy ra (pinyin tô màu bằng HTML, <br>, &nbsp;).
4. Mã add-on chạy trên Python 3.9 (Anki 23.10 — bản thấp nhất add-on nhận, min_point_version 231000): biên dịch mọi file,
   nạp các module thuần Python, gọi thử hàm 1.32. Cần PY39=<python 3.9> (không có thì bỏ qua).

Chạy: python test_132c.py ADDON   (ANKI_PY cho phần 3, PY39 cho phần 4)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
import fields_core as F  # noqa: E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


# ---------------------------------------------------------------------------
print("== 1. Đuổi quạ: so đáp án (node)")
r = subprocess.run(["node", os.path.join(HERE, "test_132c.js"), ADDON], capture_output=True, text=True)
print("\n".join("  " + x for x in r.stdout.strip().splitlines()))
if r.returncode:
    print(r.stderr[-2000:])
ok(r.returncode == 0, "core/test_132c.js đạt hết")

# ---------------------------------------------------------------------------
# Kiểu deck: (tên loại note, các trường, {trường: [giá trị của từng note]}, ngôn ngữ mong đợi, vai trò mong đợi)
HSK = ["我", "你", "好", "是", "不", "人", "们", "这", "说", "吃", "喝", "看", "书", "谢谢", "学生", "老师", "朋友", "喜欢",
       "电脑", "飞机", "医院", "天气", "下雨", "东西", "时候", "认识", "汉语", "饭馆", "苹果", "水果"]
HSK_PY = ["wǒ", "nǐ", "hǎo", "shì", "bù", "rén", "men", "zhè", "shuō", "chī", "hē", "kàn", "shū", "xièxie", "xuésheng",
          "lǎoshī", "péngyou", "xǐhuan", "diànnǎo", "fēijī", "yīyuàn", "tiānqì", "xià yǔ", "dōngxi", "shíhou", "rènshi",
          "Hànyǔ", "fànguǎn", "píngguǒ", "shuǐguǒ"]
TOCFL = ["我", "你們", "謝謝", "學生", "老師", "朋友", "喜歡", "電腦", "飛機", "醫院", "天氣", "東西", "時候", "認識", "說話",
         "這個", "國家", "學校", "會", "來", "讀書", "買", "賣", "點", "邊", "氣", "雞", "廣告", "聽", "從"]
KO = ["안녕하세요", "감사합니다", "학생", "친구", "학교", "고양이", "날씨", "바다", "사랑", "커피", "사과", "물", "밥", "책",
      "집", "가다", "오다", "먹다", "마시다", "보다"]
CORE2K = ["一", "二", "人", "大きい", "小さい", "食べる", "飲む", "見る", "行く", "来る", "学生", "先生", "日本", "今日",
          "明日", "水", "山", "川", "本", "車", "経済", "説明", "時間", "電話", "勉強", "新聞", "天気", "友達", "家族", "会社"]
CORE2K_KANA = ["いち", "に", "ひと", "おおきい", "ちいさい", "たべる", "のむ", "みる", "いく", "くる", "がくせい", "せんせい",
               "にほん", "きょう", "あした", "みず", "やま", "かわ", "ほん", "くるま", "けいざい", "せつめい", "じかん",
               "でんわ", "べんきょう", "しんぶん", "てんき", "ともだち", "かぞく", "かいしゃ"]
KANJI1 = ["日", "月", "火", "水", "木", "金", "土", "山", "川", "田", "人", "口", "目", "耳", "手", "足", "力", "男", "女",
          "子", "学", "生", "先", "名", "気", "国", "語", "読", "話", "時"]
RADICALS = ["一", "丨", "丶", "丿", "乙", "亅", "二", "亠", "人", "儿", "入", "八", "冂", "冖", "冫", "几", "凵", "刀", "力",
            "勹", "匕", "匚", "匸", "十", "卜", "卩", "厂", "厶", "又", "口", "气", "网"]
DE = ["der Hund", "die Katze", "das Haus", "gehen", "kommen", "schön", "das Mädchen", "groß", "klein", "essen", "trinken",
      "der Apfel", "die Straße", "heute", "morgen", "danke", "bitte", "lernen", "sprechen", "das Buch"]
CANTO = ["你好", "唔該", "多謝", "係", "唔係", "佢", "我哋", "食飯", "飲茶", "邊度", "幾多錢", "好味", "靚", "嘢", "冇"]
VN = ["Nhà Lý", "Trần Hưng Đạo", "Điện Biên Phủ", "Lê Lợi", "Quang Trung", "Bạch Đằng", "Chi Lăng", "Ngô Quyền"]
EN = ["apple", "banana", "look up", "take off", "beautiful", "go", "went", "child", "children", "run"]
MEAN = ["nghĩa %d" % i for i in range(40)]

DECKS = [
    # (mô tả, tên loại note, trường, dữ liệu, ngôn ngữ mong đợi, {vai trò: trường} mong đợi)
    ("HSK: Hanzi / Pinyin / English", "HSK 1-6", ["Hanzi", "Pinyin", "English", "Audio"],
     {"Hanzi": HSK, "Pinyin": HSK_PY, "English": ["meaning"] * 30}, "zh", {"word": "Hanzi", "reading": "Pinyin", "meaning": "English"}),
    ("giản / phồn thể: Simplified / Traditional / Pinyin / Meaning", "Chinese Vocab", ["Simplified", "Traditional", "Pinyin", "Meaning"],
     {"Simplified": HSK, "Traditional": TOCFL, "Pinyin": HSK_PY, "Meaning": MEAN}, "zh", {"word": "Simplified", "reading": "Pinyin", "meaning": "Meaning"}),
    ("Spoonfed Chinese: Hanzi / Pinyin / English / Audio (câu)", "Spoonfed", ["Hanzi", "Pinyin", "English", "Audio"],
     {"Hanzi": ["我是学生。", "你好吗？", "他不说话。"], "Pinyin": ["Wǒ shì xuésheng.", "Nǐ hǎo ma?", "Tā bù shuōhuà."]}, "zh", {"word": "Hanzi", "reading": "Pinyin"}),
    ("deck người Việt làm: Tiếng Trung / Phiên âm / Nghĩa / Hán Việt", "Từ vựng tiếng Trung", ["Tiếng Trung", "Phiên âm", "Nghĩa", "Hán Việt", "Ví dụ"],
     {"Tiếng Trung": HSK, "Phiên âm": HSK_PY, "Nghĩa": MEAN, "Hán Việt": ["NGÃ"] * 30}, "zh",
     {"word": "Tiếng Trung", "reading": "Phiên âm", "meaning": "Nghĩa", "hanviet": "Hán Việt"}),
    ("Basic Front / Back, chữ giản thể, không gợi ý", "Basic", ["Front", "Back"], {"Front": HSK, "Back": MEAN}, "zh", {"word": "Front"}),
    ("Basic, chữ phồn thể (Đài Loan, TOCFL)", "Basic-tw", ["Front", "Back"], {"Front": TOCFL, "Back": MEAN}, "zh", {"word": "Front"}),
    ("deck tiếng Trung tên trường 漢字 / 拼音 (phồn thể), mỗi note một chữ thông dụng", "漢字", ["漢字", "拼音", "意思"],
     {"漢字": ["一", "二", "三", "人", "大", "小", "中", "山", "水", "火"], "拼音": ["yī", "èr", "sān", "rén", "dà", "xiǎo", "zhōng", "shān", "shuǐ", "huǒ"]},
     "zh", {"word": "漢字", "reading": "拼音"}),
    ("deck tiếng Trung cho người Nhật: 中文 / 拼音 / 日本語", "中国語単語", ["中文", "拼音", "日本語"],
     {"中文": HSK, "拼音": HSK_PY, "日本語": ["わたし"] * 30}, "zh", {"word": "中文", "reading": "拼音"}),
    ("TTMIK: Korean / English / Audio", "TTMIK", ["Korean", "English", "Audio"], {"Korean": KO, "English": ["x"] * 20}, "ko",
     {"word": "Korean", "meaning": "English"}),
    ("deck tiếng Hàn người Việt làm: Từ vựng / Phiên âm / Nghĩa", "Tiếng Hàn sơ cấp", ["Từ vựng", "Phiên âm", "Nghĩa"],
     {"Từ vựng": KO, "Phiên âm": ["x"] * 20, "Nghĩa": MEAN}, "ko", {"word": "Từ vựng", "reading": "Phiên âm", "meaning": "Nghĩa"}),
    ("Basic, chữ Hàn, không gợi ý", "Basic-ko", ["Front", "Back"], {"Front": KO, "Back": MEAN}, "ko", {"word": "Front"}),
    ("Core 2k (tiếng Nhật)", "Core 2000", ["Vocabulary-Kanji", "Vocabulary-Furigana", "Vocabulary-Kana", "Vocabulary-English"],
     {"Vocabulary-Kanji": CORE2K, "Vocabulary-Kana": CORE2K_KANA}, "ja", {}),
    ("deck tiếng Nhật làm cho người Trung: 単語 / 読み / 中文", "日语单词", ["単語", "読み", "中文"],
     {"単語": [w + "る" if i % 3 == 0 else w for i, w in enumerate(CORE2K)], "読み": CORE2K_KANA, "中文": ["意思"] * 30}, "ja", {"word": "単語"}),
    ("deck tiếng Nhật cho người Hàn: Japanese / Reading / Korean", "Japanese for Koreans", ["Japanese", "Reading", "Korean"],
     {"Japanese": ["食べる", "飲む", "見る", "行く", "来る", "大きい", "あおい", "きれい"], "Korean": ["먹다"] * 8}, "ja", {}),
    ("deck kanji có trường Chinese reading (âm On) / Japanese reading", "Kanji (RTK)", ["Kanji", "Keyword", "Chinese reading", "Japanese reading"],
     {"Kanji": KANJI1, "Chinese reading": ["ニチ"] * 30, "Japanese reading": ["ひ"] * 30}, "ja", {"word": "Kanji"}),
    ("deck bộ thủ (部首) — có 气 / 网 viết như giản thể", "部首 Radicals", ["Radical", "Meaning"], {"Radical": RADICALS}, "ja", {}),
    ("deck kanji đơn không gợi ý (Front / Back)", "Basic-kanji", ["Front", "Back"], {"Front": KANJI1}, "ja", {}),
    ("deck tiếng Anh", "English vocab", ["Word", "IPA", "Meaning"], {"Word": EN}, "en", {"word": "Word", "reading": "IPA", "meaning": "Meaning"}),
    ("deck kiến thức tiếng Việt (lịch sử)", "Lịch sử", ["Câu hỏi", "Trả lời"], {"Câu hỏi": VN}, "other", {}),
    ("deck tiếng Anh có cụm động từ (die out, look up…)", "Phrasal verbs", ["Front", "Back"],
     {"Front": ["die out", "die down", "look up", "give up", "run out", "take off", "die", "go on"]}, "en", {}),
    # 1.32.1: trước đây tiếng Đức → Tiếng Anh (giọng đọc tiếng Anh, từ lọt vào báo tiếng Anh); chữ Nga / Thái → Tiếng Nhật
    ("deck tiếng Đức: Deutsch / Nghĩa", "Deutsch A1", ["Deutsch", "Nghĩa"], {"Deutsch": DE}, "other", {}),
    ("deck tiếng Đức không gợi ý (Front / Back)", "Basic-de", ["Front", "Back"], {"Front": DE}, "other", {}),
    ("deck tiếng Đức, từ không umlaut (der / die / das)", "Basic-de2", ["Front", "Back"],
     {"Front": [w for w in DE if not any(c in w for c in "äöüß")]}, "other", {}),
    ("deck tiếng Pháp ít dấu: Français / Nghĩa", "Français A1", ["Français", "Nghĩa"],
     {"Français": ["bonjour", "merci", "maison", "chat", "chien", "pain", "livre", "rouge"]}, "other", {}),
    ("deck tiếng Nga (chữ Kirin)", "Basic-ru", ["Front", "Back"], {"Front": ["привет", "спасибо", "дом", "кошка", "собака"]}, "other", {}),
    ("deck tiếng Thái", "Basic-th", ["Front", "Back"], {"Front": ["สวัสดี", "ขอบคุณ", "บ้าน", "แมว"]}, "other", {}),
]
INFO = [   # không phải lỗi, ghi lại cách đoán hiện tại (người dùng chọn lại được ở Cấu hình trường)
    ("deck tiếng Quảng Đông (粵語) — đọc giọng phổ thông, chọn \"Ngôn ngữ khác\" nếu muốn", "Cantonese", ["Front", "Back"], {"Front": CANTO}),
]


def first_word_field(fields: list[str]) -> str:
    return fields[0]


print("== 2. đoán ngôn ngữ trên các kiểu deck có thật (thuần Python)")
for desc, name, fields, data, want, _roles in DECKS:
    wf = next((f for f in _roles.values() if f == _roles.get("word")), None) or fields[0]
    words = data.get(wf) or next(iter(data.values()))
    got = F.guess_lang(name, fields, list(words))
    ok(got == want, "%s → %s%s" % (desc, F.LANG_NAMES.get(got, got), "" if got == want else " (mong đợi %s)" % F.LANG_NAMES[want]))
for desc, name, fields, data in INFO:
    words = data.get(fields[0]) or next(iter(data.values()))
    print("  · (ghi lại) %s → %s" % (desc, F.LANG_NAMES.get(F.guess_lang(name, fields, list(words)))))
# hàm đoán không bao giờ lỗi với dữ liệu lạ
bad = 0
for name, keys, words in [("", [], []), (None, [], [None, "", "?"]), ("x", ["中文"], [""]), ("x" * 5000, ["a"] * 300, ["語"] * 3000),
                          ("Korean", ["Kanji"], ["日"]), ("漢字", ["kana"], ["ア"]), ("", [""], ["​", "﻿"])]:
    try:
        assert F.guess_lang(name, keys, [w for w in words if w is not None]) in F.LANGS
    except Exception as e:  # noqa: BLE001
        bad += 1
        print("    lỗi:", name and name[:20], keys[:2], repr(e)[:80])
ok(bad == 0, "dữ liệu lạ (rỗng, rất dài, chữ vô hình) không làm hàm đoán lỗi")

# ---------------------------------------------------------------------------
print("== 3. cùng các kiểu deck trên collection Anki thật")
try:
    from anki.collection import Collection
    REAL = True
except Exception:
    REAL = False
if not REAL:
    print("  (bỏ qua: cần gói anki — ANKI_PY=<python có anki>)")
else:
    import garden_core as core
    col = Collection(os.path.join(tempfile.mkdtemp(prefix="kb132c_"), "c.anki2"))
    mm = col.models
    made = {}
    for desc, name, fields, data, want, roles in DECKS + [(d, n, f, dt, None, {}) for d, n, f, dt in INFO]:
        m = mm.new(name)
        for f in fields:
            mm.add_field(m, mm.new_field(f))
        t = mm.new_template("T1")
        t["qfmt"] = "{{%s}}" % fields[0]
        t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[-1]
        mm.add_template(m, t)
        mm.add(m)
        m = mm.by_name(name)
        did = col.decks.id("T::" + name)
        n_notes = max(len(v) for v in data.values())
        nids = []
        for i in range(n_notes):
            n = col.new_note(m)
            for f, vals in data.items():
                if i < len(vals):
                    n[f] = vals[i]
            for f in fields:
                if not n[f]:
                    n[f] = "x%d" % i if f not in ("Audio",) else ""
            col.add_note(n, did)
            nids.append(n.id)
        made[name] = (desc, want, roles, nids)
    core._LANG_GUESS.clear()
    cfg = {"_fields": F.clean_store(None)}
    for name, (desc, want, roles, nids) in made.items():
        note = col.get_note(nids[0])
        rl = core.note_roles(note, cfg)
        if want is None:
            print("  · (ghi lại) %s → %s" % (desc, F.LANG_NAMES.get(rl["lang"])))
            continue
        wrong = {r: (rl.get(r), f) for r, f in roles.items() if rl.get(r) != f}
        ok(rl["lang"] == want and not wrong, "%s → %s%s" % (desc, F.LANG_NAMES.get(rl["lang"]),
                                                           ", trường: " + ", ".join("%s=%s" % (r, rl.get(r)) for r in roles) if roles else "")
           + ("" if not wrong else " — SAI: %s" % wrong))

    # chữ lấy ra từ trường "bẩn": pinyin tô màu (add-on Chinese Support), <br>, &nbsp;, [sound:…]
    m = mm.by_name("HSK 1-6")
    n = col.new_note(m)
    n["Hanzi"] = '<span style="color:#000">你好</span>'
    n["Pinyin"] = '<span class="tone3">nǐ</span>&nbsp;<span class="tone3">hǎo</span>'
    n["English"] = "hello<br>hi"
    n["Audio"] = "[sound:nihao.mp3]"
    col.add_note(n, col.decks.id("T::HSK 1-6"))
    det = core.note_details(n, cfg)
    ok(det["word"] == "你好" and det["reading"] == "nǐ hǎo" and det["meaning"] == "hello / hi",
       "pinyin tô màu bằng HTML → %r, nghĩa có <br> → %r" % (det["reading"], det["meaning"]))
    m = mm.by_name("Từ vựng tiếng Trung")
    n = col.new_note(m)
    n["Tiếng Trung"], n["Phiên âm"], n["Nghĩa"], n["Hán Việt"] = "学生", "xuésheng", "học sinh", "HỌC SINH"
    col.add_note(n, col.decks.id("T::Từ vựng tiếng Trung"))
    det = core.note_details(n, cfg)
    ok(det["hanviet"] == "HỌC SINH" and det["meaning"] == "học sinh", "Hán Việt lấy từ trường \"Hán Việt\": %r" % det["hanviet"])
    col.close()

# ---------------------------------------------------------------------------
print("== 4. Python 3.9 (Anki 23.10)")
PY39 = os.environ.get("PY39") or ""
if not PY39 or not os.path.exists(PY39):
    print("  (bỏ qua: đặt PY39=<python 3.9>, vd. venv aqt 23.10.1)")
else:
    code = r'''
import sys, os, py_compile, json, glob, importlib
addon = sys.argv[1]
sys.path.insert(0, addon)
bad = []
for f in sorted(glob.glob(os.path.join(addon, "*.py"))):
    try:
        compile(open(f, encoding="utf-8").read(), f, "exec")
    except Exception as e:
        bad.append("%s: %s" % (os.path.basename(f), str(e)[:200]))
mods = ["lang_core", "fields_core", "text_core", "life_core", "finds_core", "guest_core", "decor_core", "season_core",
        "event_core", "story_core", "backup_core", "sync_core", "ngay_core", "wear_core", "more_core", "share_core"]
imp = []
for m in mods:
    try:
        importlib.import_module(m)
    except Exception as e:
        imp.append("%s: %r" % (m, e))
try:
    import anki  # noqa
    import garden_core  # noqa
except Exception as e:
    imp.append("garden_core: %r" % e)
import fields_core as F, lang_core as L
st = F.clean_store({"lang": {"1": "other"}, "lang2": {"1": "zh"}, "models": {"1": {"kind": "vocab", "f": {"word": "A", "meaning": "B"}}},
                    "f2": {"1": {"hanviet": "C"}}, "games_lang2": {"zh": {"crow": "pinyin"}}})
raw = F.to_raw(st)
calls = [st["lang"]["1"] == "zh", st["models"]["1"]["f"].get("hanviet") == "C", raw["lang2"] == {"1": "zh"},
         F.guess_lang("HSK", ["Hanzi", "Pinyin"], ["你好"]) == "zh", F.guess_lang("x", ["単語", "中文"], ["たべる"]) == "ja",
         len(json.dumps(L.bundle(), ensure_ascii=False)) > 10000]
print(json.dumps({"ver": sys.version.split()[0], "bad": bad, "imp": imp, "calls": calls}))
'''
    r = subprocess.run([PY39, "-c", code, ADDON], capture_output=True, text=True)
    try:
        out = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception:
        out = {"ver": "?", "bad": [r.stderr[-500:]], "imp": [], "calls": []}
    ok(out["ver"].startswith("3.9"), "chạy bằng Python %s" % out["ver"])
    ok(not out["bad"], "mọi file .py biên dịch được trên Python 3.9" + ("" if not out["bad"] else ": " + "; ".join(out["bad"][:3])))
    ok(not out["imp"], "nạp được các module thuần Python + garden_core (anki 23.10)" + ("" if not out["imp"] else ": " + "; ".join(out["imp"][:3])))
    ok(out["calls"] and all(out["calls"]), "hàm 1.32 / 1.32.1 chạy đúng trên Python 3.9: %s" % out["calls"])

print("\nKẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
