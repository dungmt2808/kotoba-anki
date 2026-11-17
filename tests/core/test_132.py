"""1.32 — "Ngôn ngữ trong vườn" + deck tiếng Trung / tiếng Hàn. Người dùng không học tiếng Trung / tiếng Hàn nên test soát
chữ bằng công cụ độc lập thay cho người đọc lại:

1. Bảng chữ (kotoba_batake/lang_core.py) đủ mọi sinh hoạt / đồ nhặt / khách / tường-sàn / mùa — thêm mục mới mà quên
   dịch là đỏ; không thừa mã lạ.
2. Tiếng Anh: chữ Latin, không chữ Hán / kana / Hangul.
3. Tiếng Trung: chỉ chữ giản thể (mã hoá được bằng GB2312 — bảng chữ giản thể chuẩn; OpenCC phồn → giản không đổi chữ
   nào), không kana / Hangul; pinyin khớp từ điển pinyin độc lập (pypinyin, bảng đối chiếu tests/fixtures/chu_132_ref.json
   do tests/tools/soat_chu_132.py tạo): đúng âm tiết từng chữ, đúng thanh điệu (cho phép thanh nhẹ ở từ hai âm tiết như
   衣服 yīfu, biến điệu của 一 / 不); chữ đa âm từ điển đọc sai thì ghi lý do ở NGOAI_LE.
4. Tiếng Hàn: âm tiết Hangul hợp lệ, có trong bảng chữ Hàn thông dụng (EUC-KR), phiên âm khớp bộ chuyển Hangul → Romaja
   viết riêng trong test (core/hangul_rr.py: nối âm, mũi hoá, ㄹ, bật hơi…).
5. Mọi câu tiếng Nhật trong mã trang (web/*.js, event_core, tiêu đề bảng) đổi được sang Anh / Trung / Hàn / chỉ tiếng Việt
   (chạy web/glang.js thật trong node, core/test_132.js) — "Chỉ tiếng Việt" không còn chữ Nhật nào.
6. Cấu hình trường tiếng Trung / tiếng Hàn: đoán ngôn ngữ, vai trò Pinyin / Hán Việt, lưu cho bản cũ hiểu được
   (lang = "other" + lang2 / f2 / games_lang2) — chạy mã 1.31.3 (đã phát hành) và 1.31.5 thật: đọc, lưu đè rồi bản mới
   đọc lại vẫn đủ; bản cũ đổi sang ngôn ngữ khác thì lựa chọn đó thắng.
7. Trò chơi: Python (GAME_MODES) và games.js cùng danh sách chế độ cho tiếng Trung / tiếng Hàn.

Chạy: python test_132.py ADDON   (python có gói anki — ANKI_PY — cho phần 6b; không có thì bỏ qua phần đó)
"""
from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
import hangul_rr  # noqa: E402
import ma_cu  # noqa: E402
import lang_core as L  # noqa: E402
import fields_core as F  # noqa: E402
import life_core, finds_core, guest_core, decor_core, season_core, event_core  # noqa: E401,E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


TABLES = {"ACTS": L.ACTS, "FINDS": L.FINDS, "GUESTS": L.GUESTS, "DECOR": L.DECOR, "SEASONS": L.SEASONS, "TITLES": L.TITLES}
KANA = re.compile(r"[\u3040-\u30ff]")
HAN = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
HANGUL = re.compile(r"[\uac00-\ud7a3]")
JAMO = re.compile(r"[\u1100-\u11ff\u3130-\u318f]")

# ---------------------------------------------------------------------------
print("== 1. bảng chữ đủ mục")
decor_ids = set(decor_core.WALLS) | set(decor_core.FLOORS)
season_ids = {t["id"] for t in season_core.THEMES} if hasattr(season_core, "THEMES") else set()
want = {"ACTS": set(life_core.ACTS) | {"_idle"}, "FINDS": set(finds_core.FINDS), "GUESTS": set(guest_core.GUESTS),
        "DECOR": decor_ids, "SEASONS": season_ids}
for name, ids in want.items():
    have = set(TABLES[name])
    ok(ids and have == ids, "%s: %d mục, đủ đúng như bảng gốc%s" % (name, len(have), "" if have == ids else
       " — thiếu %s, thừa %s" % (sorted(ids - have)[:6], sorted(have - ids)[:6])))
ok(all(len(r) == 5 and all(isinstance(x, str) and x == x.strip() for x in r) for t in TABLES.values() for r in t.values()),
   "mỗi mục đủ 5 ô (Anh, Trung, pinyin, Hàn, phiên âm), không khoảng trắng thừa")
ok(all(r[0] and r[1] and r[2] and r[3] and r[4] for t in TABLES.values() for r in t.values()), "không ô nào trống")
ok(all(len(r) == 5 and r[0] and r[1] and r[2] and r[3] for r in L.SAY.values()), "%d câu StackChan nói: đủ Anh / Trung / pinyin / Hàn" % len(L.SAY))
ok(all(set(g) == {"ja", "en", "zh", "ko"} and all(g.values()) for g in L.GAMES.values()) and set(L.GAMES) == {"listen", "market", "crow", "memory", "cloze"},
   "tên 5 trò chơi đủ 4 tiếng")
ok(all(len(v) == 3 and all(x.count("%s") == 1 for x in v) for v in L.ASK.values()) and set(L.ASK) == set(L.LANGS),
   "khách ở Chợ sáng: 3 câu mỗi tiếng, mỗi câu một chỗ %s")
b = L.bundle()
ok(len(json.dumps(b, ensure_ascii=False)) < 60000 and b["pref"] == "kb-glang", "bảng gửi cho trang gọn (%d ký tự)" % len(json.dumps(b, ensure_ascii=False)))

# ---------------------------------------------------------------------------
print("== 2. tiếng Anh")
en = [(n, k, r[0]) for n, t in TABLES.items() for k, r in t.items()] + [("SAY", k, r[0]) for k, r in L.SAY.items()]
bad = [x for x in en if HAN.search(x[2]) or KANA.search(x[2]) or HANGUL.search(x[2]) or not re.search(r"[A-Za-z]", x[2])]
ok(not bad, "%d câu tiếng Anh: chữ Latin, không chữ Hán / kana / Hangul%s" % (len(en), "" if not bad else " — " + str(bad[:4])))
acts_en = [r[0] for k, r in L.ACTS.items()]
ok(all(x[0].islower() for x in acts_en), "sinh hoạt tiếng Anh viết như động từ nguyên mẫu (chữ thường đầu: read a book)")

# ---------------------------------------------------------------------------
print("== 3. tiếng Trung")
zh_rows = [(n, k, r[1], r[2]) for n, t in TABLES.items() for k, r in t.items()] + [("SAY", k, r[1], r[2]) for k, r in L.SAY.items()]
zh_rows += [("GAMES", k, g["zh"], "") for k, g in L.GAMES.items()]
zh_rows += [("ASK", str(i), x.replace("%s", ""), "") for i, x in enumerate(L.ASK["zh"])]


def gb_ok(s: str) -> bool:
    try:
        s.encode("gb2312")
        return True
    except UnicodeEncodeError:
        return False


bad = [x[:3] for x in zh_rows if not gb_ok(x[2])]
ok(not bad, "%d câu tiếng Trung chỉ có chữ giản thể (mã hoá được bằng GB2312)%s" % (len(zh_rows), "" if not bad else " — " + str(bad[:4])))
bad = [x[:3] for x in zh_rows if KANA.search(x[2]) or HANGUL.search(x[2]) or re.search(r"[A-Za-z]", x[2])]
ok(not bad, "không kana / Hangul / chữ Latin lẫn vào chữ Trung%s" % ("" if not bad else " — " + str(bad[:4])))
REF = json.load(open(os.path.join(ROOT, "tests", "fixtures", "chu_132_ref.json"), encoding="utf-8"))
items = REF["items"]
missing = sorted({x[2] for x in zh_rows if x[0] not in ("ASK",) and x[2] not in items})
ok(not missing, "mọi câu tiếng Trung có trong bảng đối chiếu (%s, %d câu)%s" % (REF["cong_cu"], len(items),
   "" if not missing else " — chưa có: %s · chạy tests/tools/soat_chu_132.py" % missing[:5]))
t2s_bad = [t for t, v in items.items() if v["t2s"] != t]
ok(not t2s_bad, "OpenCC phồn → giản không đổi chữ nào (đã là giản thể)%s" % ("" if not t2s_bad else " — " + str(t2s_bad[:4])))

TONE = {"\u0304": 1, "\u0301": 2, "\u030c": 3, "\u0300": 4}
# chữ đa âm mà từ điển (pypinyin) chọn cách đọc mặc định sai trong ngữ cảnh này: (câu, chữ) → lý do
NGOAI_LE = {("在长椅上休息", "长"): "长椅 (ghế dài) đọc cháng (dài); từ điển chọn zhǎng (lớn lên)"}
SANDHI = set("一不")     # biến điệu: 一 yī → yí / yì, 不 bù → bú


def py_letters(py: str) -> list[list]:
    out: list[list] = []
    for ch in unicodedata.normalize("NFD", py.lower()):
        if "a" <= ch <= "z":
            out.append([ch, 0])
        elif ch == "\u0308" and out:
            out[-1][0] = "v"
        elif ch in TONE and out:
            out[-1][1] = TONE[ch]
    return out


def compare(zh: str, py: str) -> tuple[list[str], list[str]]:
    """(lỗi, chữ đọc thanh nhẹ) khi so pinyin của bảng với từ điển."""
    ref = items[zh]["py"]
    letters = py_letters(py)
    hanzi = [c for c in zh if HAN.match(c)]
    if len(ref) != len(hanzi):
        return ["từ điển không đọc đủ chữ (%d / %d)" % (len(ref), len(hanzi))], []
    errs, neutral, i = [], [], 0
    for k, syl in enumerate(ref):
        base = syl.rstrip("012345")
        tone = int(syl[-1]) if syl[-1].isdigit() else 0
        seg = letters[i:i + len(base)]
        i += len(base)
        if "".join(c[0] for c in seg) != base:
            if (zh, hanzi[k]) in NGOAI_LE:
                return [], []
            return ["âm tiết khác từ điển: %r ≠ %s" % (py, " ".join(ref))], []
        t = max([c[1] for c in seg] or [0])
        if t == tone or (zh, hanzi[k]) in NGOAI_LE:
            continue
        if t == 0 and k > 0:
            neutral.append(hanzi[k])
        elif hanzi[k] in SANDHI:
            continue
        else:
            errs.append("%s: thanh %d, từ điển %d" % (hanzi[k], t, tone))
    if i != len(letters):
        errs.append("thừa chữ cái trong %r" % py)
    return errs, neutral


all_errs, all_neutral, n = [], [], 0
for name, key, zh, py in zh_rows:
    if not py or zh not in items:
        continue
    n += 1
    e, nt = compare(zh, py)
    all_errs += ["%s.%s %s %s: %s" % (name, key, zh, py, x) for x in e]
    all_neutral += nt
ok(n > 200 and not all_errs, "%d câu: pinyin khớp từ điển từng âm tiết, từng thanh điệu%s" % (n, "" if not all_errs else " — " + "; ".join(all_errs[:4])))
ok(len(all_neutral) <= 40, "thanh nhẹ chỉ ở âm tiết sau của từ (衣服 yīfu, 东西 dōngxi…): %d chỗ" % len(all_neutral))
ok(all(not re.search(r"\d", r[2]) for t in TABLES.values() for r in t.values()), "pinyin ghi dấu thanh, không ghi số")
used = {(z, c) for z, c in NGOAI_LE}
ok(all(any(x[2] == z for x in zh_rows) for z, _c in used), "mọi ngoại lệ đa âm còn dùng (%d)" % len(used))

# ---------------------------------------------------------------------------
print("== 4. tiếng Hàn")
ko_rows = [(n, k, r[3], r[4]) for n, t in TABLES.items() for k, r in t.items()]
ko_say = [("SAY", k, r[3]) for k, r in L.SAY.items()] + [("GAMES", k, g["ko"]) for k, g in L.GAMES.items()]
ko_all = [x[:3] for x in ko_rows] + ko_say


def ko_ok(s: str) -> bool:
    return bool(HANGUL.search(s)) and not HAN.search(s) and not KANA.search(s) and not JAMO.search(s) and \
        not re.search(r"[A-Za-z]", s.replace("TV", ""))


bad = [x for x in ko_all if not ko_ok(x[2])]
ok(not bad, "%d câu tiếng Hàn: âm tiết Hangul hợp lệ, không chữ Hán / kana / jamo rời%s" % (len(ko_all), "" if not bad else " — " + str(bad[:4])))


def euc_ok(s: str) -> bool:
    try:
        s.encode("euc-kr")
        return True
    except UnicodeEncodeError:
        return False


bad = [x for x in ko_all if not euc_ok(x[2])]
ok(not bad, "mọi âm tiết có trong bảng chữ Hàn thông dụng (EUC-KR, 2.350 âm tiết)%s" % ("" if not bad else " — " + str(bad[:4])))
bad = [(x[0], x[1], x[2], x[3], hangul_rr.romanize(x[2])) for x in ko_rows if hangul_rr.romanize(x[2]) != x[3]]
ok(not bad, "%d mục: phiên âm khớp bộ chuyển Hangul → Romaja (nối âm, mũi hoá, ㄹ, bật hơi)%s" % (len(ko_rows), "" if not bad else " — " + str(bad[:3])))
for w, r in [("신라", "silla"), ("종로", "jongno"), ("좋다", "jota"), ("백로", "baengno"), ("학년", "hangnyeon"), ("많이", "mani"),
             ("읽다", "ikda"), ("설날", "seollal"), ("끓이다", "kkeurida"), ("불꽃놀이", "bulkkonnori"), ("밖을", "bakkeul")]:
    ok(hangul_rr.romanize(w) == r, "(bộ chuyển tự kiểm) %s → %s" % (w, hangul_rr.romanize(w)))

# ---------------------------------------------------------------------------
print("== 5. câu tiếng Nhật trong mã trang đổi được (web/glang.js chạy trong node)")
JP = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")
LIT = re.compile(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`')
# chữ Nhật không phải lời nói / trang trí của vườn (không đổi theo Ngôn ngữ trong vườn) — kèm lý do
KHONG_DOI = {
    "paper.js": "báo và chép chính tả theo ngôn ngữ của số báo",
    "fields.js": "ví dụ cách ghi trường trong deck tiếng Nhật",
}
# games.js: bảng chuyển romaji → kana (trước mục "Chọn từ"; 1.32.1: tìm dòng thay cho số cố định 700 — thêm mã phía trên
# đẩy bảng xuống) và chữ gốc đã đổi qua GardenLang.game / ask / tag (bảng GAMES / ASK / TAGS)
GAMES_GOC = {g["ja"] for g in L.GAMES.values()} | set(L.ASK["ja"]) | set(L.TAGS["ja"].values()) | {"する"}
KHONG_DOI_CHU = {"ことば畑", "ことば畑 · ", "お正月", "一、二文を書いてみよう…"}     # tên add-on, tên lễ, ô luyện viết tiếng Nhật
_g = open(os.path.join(ADDON, "web", "games.js"), encoding="utf-8").read().split("\n")
KANA_END = next((i for i, x in enumerate(_g, 1) if x.strip() == "// Chọn từ"), 700)
lits: list[tuple[str, int, str]] = []
for fn in sorted(os.listdir(os.path.join(ADDON, "web"))):
    if not fn.endswith(".js") or fn == "glang.js":
        continue
    src = open(os.path.join(ADDON, "web", fn), encoding="utf-8").read()
    src = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), src, flags=re.S)
    for i, line in enumerate(src.split("\n"), 1):
        line = re.sub(r"(?<![:\"'\\])//.*$", "", line)
        for m in LIT.finditer(line):
            s = next(g for g in m.groups() if g is not None)
            if JP.search(s):
                lits.append((fn, i, s))
body = open(os.path.join(ADDON, "web", "body.html"), encoding="utf-8").read()
for m in re.finditer(r'class="kb-(?:g-title|quest-head)">([^<]+)', body):
    lits.append(("body.html", 0, m.group(1).replace("&amp;", "&").strip()))
for d in ("2027-01-01", "2026-12-25", "2026-10-31", "2026-09-25", "2026-08-19"):
    import datetime as _dt
    try:
        f = event_core.festival(_dt.date.fromisoformat(d)) if hasattr(event_core, "festival") else None
    except Exception:
        f = None
    if f and f.get("hi"):
        lits.append(("event_core.py", 0, f["hi"]))
check = [x for x in lits if x[0] not in KHONG_DOI and x[2] not in KHONG_DOI_CHU
         and not (x[0] == "games.js" and (x[1] < KANA_END or x[2] in GAMES_GOC)) and not x[2].startswith("Tools → Add-ons → ")
         and "ことば畑 → Config" not in x[2] and "người làm ことば畑" not in x[2]]
defs = re.findall(r'\{ id: "([a-z]+)", jp: "([^"]+)"', gsrc0 := open(os.path.join(ADDON, "web", "games.js"), encoding="utf-8").read())
ok(sorted(defs) == sorted((k, g["ja"]) for k, g in L.GAMES.items()), "tên tiếng Nhật của 5 trò chơi khớp bảng GAMES: %s" % defs)
ok(len(lits) > 150 and len(check) > 90, "%d chuỗi có chữ Nhật trong mã trang, %d chuỗi là lời nói / tiêu đề cần đổi" % (len(lits), len(check)))
with tempfile.TemporaryDirectory() as td:
    jf = os.path.join(td, "in.json")
    json.dump({"bundle": b, "lits": [[a, i, s] for a, i, s in check]}, open(jf, "w", encoding="utf-8"), ensure_ascii=False)
    r = subprocess.run(["node", os.path.join(HERE, "test_132.js"), ADDON, jf], capture_output=True, text=True)
    print(r.stdout.rstrip())
    if r.returncode != 0 or "✗" in r.stdout:
        print(r.stderr[-2000:])
    m = re.search(r"JS: (\d+)/(\d+)", r.stdout)
    ok(r.returncode == 0 and m and m.group(1) == m.group(2), "web/glang.js + games.js (node): %s" % (m.group(0) if m else "không chạy được"))

# ---------------------------------------------------------------------------
print("== 6. Cấu hình trường tiếng Trung / tiếng Hàn")
ok(F.guess_lang("Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa"], ["你好", "谢谢", "学生"]) == "zh", "deck HSK (giản thể) → Tiếng Trung")
ok(F.guess_lang("Basic", ["Front", "Back"], ["謝謝", "學生", "說話", "電腦"]) == "zh", "deck phồn thể → Tiếng Trung")
ok(F.guess_lang("Korean vocabulary", ["Korean", "Romaja", "Nghĩa"], ["안녕하세요", "학교"]) == "ko", "deck Hangul → Tiếng Hàn")
ok(F.guess_lang("Basic", ["Front", "Back"], ["학교", "친구", "사과"]) == "ko", "deck Hangul (tên Basic) → Tiếng Hàn")
ok(F.guess_lang("Basic", ["Front", "Back"], ["学生", "先生", "食べる"]) == "ja", "deck tiếng Nhật vẫn là tiếng Nhật")
ok(F.guess_lang("Basic", ["Front", "Back"], ["日", "月", "火", "水"]) == "ja", "deck kanji một chữ (không kana) vẫn là tiếng Nhật")
ok(F.guess_lang("Basic", ["Front", "Back"], ["apple", "book"]) == "en", "deck tiếng Anh vẫn là tiếng Anh")
kz = {k["id"]: k for k in F.kinds_view("zh")}
ok(list(kz) == ["vocab", "kanji", "other"], "tiếng Trung có loại Từ vựng / Chữ Hán / Khác")
ok([r["id"] for r in kz["vocab"]["roles"]][:4] == ["word", "reading", "meaning", "hanviet"] and kz["vocab"]["roles"][1]["label"] == "Pinyin",
   "Từ vựng tiếng Trung: Từ (chữ Hán) / Pinyin / Nghĩa / Hán Việt (nếu có) …")
ok(kz["vocab"]["jp"] == "词汇" and "kun" not in [r["id"] for r in kz["kanji"]["roles"]], "chữ trang trí 词汇; Chữ Hán tiếng Trung không có Âm Kun")
kk = {k["id"]: k for k in F.kinds_view("ko")}
ok(list(kk) == ["vocab", "other"] and "hanviet" in [r["id"] for r in kk["vocab"]["roles"]] and kk["vocab"]["roles"][1]["label"].startswith("Phiên âm"),
   "Từ vựng tiếng Hàn: Từ (Hangul) / Phiên âm (romaja) / Nghĩa / Hán Việt (nếu có)")
c, err = F.validate_save({"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa", "hanviet": "HV"}},
                         ["Hanzi", "Pinyin", "Nghĩa", "HV"], "zh")
ok(c and c["f"].get("hanviet") == "HV" and not err, "lưu cấu hình tiếng Trung có Hán Việt")
c2, err2 = F.validate_save({"kind": "kanji", "f": {"word": "Hanzi", "meaning": "Nghĩa"}}, ["Hanzi", "Nghĩa"], "ko")
ok(c2 is None and "Tiếng Hàn" in err2, "tiếng Hàn không có loại Chữ Hán: " + err2)

print("== 6a. cách lưu: bản ≤ 1.31 thấy \"Ngôn ngữ khác\", phần mới ở lang2 / f2 / games_lang2")
store = F.clean_store(None)
store["lang"].update({"111": "zh", "222": "ko", "333": "en"})
store["models"]["111"] = {"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa", "hanviet": "HV"}}
store["models"]["222"] = {"kind": "vocab", "f": {"word": "Korean", "meaning": "Nghĩa"}}
store["games_lang"] = {"zh": {"crow": "pinyin"}, "en": {"crow": "spell"}}
raw = F.to_raw(store)
ok(raw["lang"] == {"111": "other", "222": "other", "333": "en"} and raw["lang2"] == {"111": "zh", "222": "ko"},
   "lang: zh / ko ghi là other, lựa chọn thật ở lang2")
ok("hanviet" not in raw["models"]["111"]["f"] and raw["f2"] == {"111": {"hanviet": "HV"}}, "Hán Việt của từ vựng tiếng Trung ở f2")
ok(raw["games_lang"] == {"en": {"crow": "spell"}} and raw["games_lang2"] == {"zh": {"crow": "pinyin"}}, "chế độ trò chơi tiếng Trung ở games_lang2")
back = F.clean_store(raw)
ok(back["lang"] == store["lang"] and back["models"]["111"]["f"].get("hanviet") == "HV" and back["games_lang"]["zh"] == {"crow": "pinyin"},
   "đọc lại đủ như trước khi lưu")
ok(set(F.to_raw(F.clean_store(None))) >= {"lang2", "f2", "games_lang2"}, "luôn ghi đủ 3 khoá mới (kể cả rỗng) — keep_foreign không mang lại giá trị cũ")
raw2 = json.loads(json.dumps(raw))
raw2["lang"]["111"] = "en"
ok(F.clean_store(raw2)["lang"]["111"] == "en", "bản cũ đổi loại note sang Tiếng Anh → lựa chọn đó thắng lang2")

print("== 6b. mã bản cũ thật đọc / lưu đè cấu hình 1.32")
for commit, name in (("e64eb22", "1.31.3 (đã phát hành)"), ("d5efb47", "1.31.5")):
    with tempfile.TemporaryDirectory() as td:
        with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, commit))) as t:
            t.extractall(td)
        old_dir = os.path.join(td, "kotoba_batake")
        path = os.path.join(td, "fields.json")
        json.dump(raw, open(path, "w", encoding="utf-8"), ensure_ascii=False)
        code = ("import sys, json\nsys.path.insert(0, sys.argv[1])\nimport fields_core as F\nst = F.FieldStore(sys.argv[2])\n"
                "s = st.load()\nlang = dict(s['lang'])\ns['models']['999'] = {'kind': 'vocab', 'f': {'word': 'Front', 'meaning': 'Back'}}\n"
                "st.save(s)\nprint(json.dumps({'lang': lang, 'raw': json.load(open(sys.argv[2], encoding='utf-8'))}))")
        r = subprocess.run([sys.executable, "-c", code, old_dir, path], capture_output=True, text=True)
        out = json.loads(r.stdout) if r.returncode == 0 else {}
        ok(out.get("lang") == {"111": "other", "222": "other", "333": "en"}, "%s đọc: deck tiếng Trung / Hàn là \"Ngôn ngữ khác\"" % name)
        raw3 = out.get("raw") or {}
        ok(raw3.get("lang2") == raw["lang2"] and raw3.get("f2") == raw["f2"] and raw3.get("games_lang2") == raw["games_lang2"],
           "%s lưu đè (thêm một loại note): giữ nguyên lang2 / f2 / games_lang2" % name)
        new = F.clean_store(raw3)
        ok(new["lang"].get("111") == "zh" and new["models"]["111"]["f"].get("hanviet") == "HV" and "999" in new["models"],
           "1.32 đọc lại sau bản cũ: vẫn Tiếng Trung + Hán Việt, có cả loại note bản cũ vừa thêm")

# ---------------------------------------------------------------------------
print("== 7. trò chơi: Python và games.js cùng chế độ")
gsrc = open(os.path.join(ADDON, "web", "games.js"), encoding="utf-8").read()
for game, per in F.GAME_MODES.items():
    m = re.search(r"\n    %s: \{(.*?)\n    \}" % game, gsrc[gsrc.index("const MODES = {"):], re.S)
    for grp in ("zh", "ko", "de", "fr"):      # 1.35: + tiếng Đức / tiếng Pháp
        js_ids = []
        if m:
            g = re.search(r"\n      %s: \[(.*?)\](?:,\n      [a-z]+: \[|\n)" % grp, m.group(1) + "\n", re.S)
            js_ids = re.findall(r'\{ id: "([a-z-]+)"', g.group(1)) if g else []
        ok(js_ids == per.get(grp, []), "%s / %s: %s" % (game, grp, js_ids))

print("\nKẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
