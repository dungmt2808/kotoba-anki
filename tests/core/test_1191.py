"""Test lõi bản 1.19.1: báo không phụ thuộc deck đang xem — chọn 100 từ theo deck đã chọn (words_core).

Dựng collection Anki thật: deck tiếng Nhật N5 / N4, deck tiếng Anh, deck trộn hai thứ tiếng, deck tiếng Hàn,
deck chữ Hán đơn, deck ngữ pháp. Đặt lịch ôn bằng set_due_date: "0" = hôm nay phải ôn (chưa thuộc),
"10" = đã ôn, hôm nay không có lịch (đã thuộc). Kiểm tra:
  - danh sách deck theo ngôn ngữ (theo loại note, không theo tên deck);
  - 100 từ: 70% chưa thuộc / 30% đã thuộc, thiếu nhóm này thì bù nhóm kia; cùng ngày ra cùng danh sách;
  - chọn deck: chỉ lấy deck đó (kể cả deck con), nhiều deck thì chia đều; deck trộn chỉ lấy đúng ngôn ngữ;
  - id deck đã xoá bị bỏ, tối đa 5 deck, khoá collection giữ phần lạ;
  - mới học < 30 từ thì dùng thêm thẻ mới; chữ Hán đơn / ngữ pháp không vào kho 100 từ;
  - phạm vi gửi Gemini (ai_core / ai_en.scope_from_pick): lời nhắc chỉ có 100 từ, kiểm tra dùng mọi từ đã học.
Có thư mục bản 1.19.0 (đối số 2) thì chạy mã 1.19.0 thật lưu cấu hình / trạng thái → khoá deck đã chọn còn nguyên.

Chạy: python test_1191.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.19.0]   (cần gói anki: ANKI_PY=…)
"""
import datetime
import importlib.util
import os
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
OLD = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else ""
sys.path.insert(0, ADDON)
import ai_core as ai  # noqa: E402
import ai_en  # noqa: E402
import garden_core as core  # noqa: E402
import words_core as words  # noqa: E402
from anki.collection import Collection  # noqa: E402

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


tmp = tempfile.mkdtemp()
col = Collection(os.path.join(tmp, "c.anki2"))
mm = col.models


def model(name, flds):
    m = mm.new(name)
    for f in flds:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("Thẻ 1")
    t["qfmt"], t["afmt"] = "{{%s}}" % flds[0], "{{FrontSide}}<hr id=answer>{{%s}}" % flds[1]
    mm.add_template(m, t)
    mm.add(m)
    return mm.by_name(name)


JA = model("Từ vựng tiếng Nhật", ["Từ", "Cách đọc", "Nghĩa"])
EN = model("English vocab", ["Word", "IPA", "Meaning"])
KO = model("Tiếng Hàn", ["Từ", "Nghĩa"])
KANJI = model("Kanji", ["Kanji", "Hán Việt", "Nghĩa"])
GRAM = model("Ngữ pháp", ["Cấu trúc", "Nghĩa", "Cách dùng"])
KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ"
DUE, LATER = {}, {}


def deck(name):
    return col.decks.id(name)


def add(m, did, vals, state):
    n = col.new_note(m)
    for k, v in zip(n.keys(), vals):
        n[k] = v
    col.add_note(n, did)
    (DUE if state == "due" else LATER if state == "later" else {}).setdefault(did, []).extend(n.card_ids())
    return n.id


def ja_word(i):
    return "語" + KANA[i % len(KANA)] + KANA[(i // len(KANA)) % len(KANA)] + "る"


NOTES = {}
d_n5, d_n4 = deck("JA::N5"), deck("JA::N4")
d_n4c = deck("JA::N4::Bài 1")         # deck con
d_en, d_mix, d_ko, d_kanji, d_gram = deck("EN A2"), deck("Trộn"), deck("Hàn"), deck("Kanji đơn"), deck("Ngữ pháp N4")
for i in range(90):                    # N5: 60 phải ôn hôm nay, 30 đã thuộc
    NOTES[add(JA, d_n5, [ja_word(i), "ご", "nghĩa N5 %d" % i], "due" if i < 60 else "later")] = "n5"
for i in range(90, 150):               # N4: 20 phải ôn, 30 đã thuộc, 10 mới; một nửa ở deck con
    st = "due" if i < 110 else "later" if i < 140 else "new"
    NOTES[add(JA, d_n4c if i % 2 else d_n4, [ja_word(i), "ご", "nghĩa N4 %d" % i], st)] = "n4"
EN_WORDS = ["apple", "garden", "river", "happy", "cook", "travel", "window", "teacher", "rain", "market", "letter",
            "bread", "village", "quiet", "bridge", "carry", "evening", "kitchen", "lucky", "paint", "ticket", "visit",
            "warm", "young", "answer", "basket", "cloud", "dance", "early", "favourite", "goat", "hill"]
for i, w in enumerate(EN_WORDS):
    NOTES[add(EN, d_en, [w, "", "nghĩa " + w], "due" if i < 12 else "later")] = "en"
for i in range(6):                     # deck trộn: 6 từ Nhật + 6 từ Anh
    NOTES[add(JA, d_mix, ["混" + KANA[i] + "ぜる", "", "trộn %d" % i], "due")] = "mix_ja"
    NOTES[add(EN, d_mix, ["mixed%s" % "abcdef"[i], "", "trộn en %d" % i], "due")] = "mix_en"
for i, w in enumerate(["사과", "학교", "물", "책", "친구", "바다", "하늘", "나무", "꽃", "별", "산", "집"]):
    add(KO, d_ko, [w, "nghĩa " + w], "due")
for i, k in enumerate("山川水火木金土日月人口目"):
    add(KANJI, d_kanji, [k, "SƠN", "núi %d" % i], "due")
for i in range(5):
    NOTES[add(GRAM, d_gram, ["〜てもいい%d" % i, "được phép %d" % i, "Vて + もいい"], "later")] = "gram"
for did, cids in DUE.items():
    col.sched.set_due_date(cids, "0")
for did, cids in LATER.items():
    col.sched.set_due_date(cids, "10")
CFG = core.merged_config({})
CFG["_fields"] = {"models": {}, "games": {}}

print("== deck theo ngôn ngữ")
ld = words.lang_decks(col, CFG)
names = {k: {d["name"]: d["notes"] for d in v} for k, v in ld.items()}
ok(names["ja"].get("JA::N5") == 90 and names["ja"].get("JA::N4") == 60 and names["ja"].get("JA::N4::Bài 1") == 30,
   "deck tiếng Nhật kèm số note (deck cha tính cả deck con): %s" % {k: v for k, v in names["ja"].items() if k.startswith("JA")})
ok(names["ja"].get("Trộn") == 6 and names["en"].get("Trộn") == 6, "deck trộn: 6 note Nhật, 6 note Anh")
ok("Hàn" not in names["ja"] and "Hàn" not in names["en"], "deck tiếng Hàn không có ở hai danh sách")
ok(names["en"].get("EN A2") == 32 and "JA::N5" not in names["en"], "deck tiếng Anh: 32 note, không có deck Nhật")

print("== 100 từ ngẫu nhiên (không chọn deck)")
pk = words.pick(col, CFG, "ja", [], "2026-11-05", eligible=ai.kho_ok)
kho = pk["kho"]
due = [it for it in kho if it["due"]]
ok(len(kho) == 100 and len(due) == 70, "100 từ: %d phải ôn + %d đã thuộc" % (len(due), len(kho) - len(due)))
ok(all(NOTES.get(it["nid"]) in ("n5", "n4", "mix_ja") for it in kho), "chỉ note tiếng Nhật (kể cả ở deck trộn)")
ok(not any(len(it["word"]) == 1 for it in kho) and not any(NOTES.get(it["nid"]) == "gram" for it in kho),
   "không có chữ Hán đơn, không có note ngữ pháp trong kho")
ok(len(pk["grammar"]) == 5 and pk["grammar"][0]["word"].startswith("〜てもいい"), "note ngữ pháp đã học → danh sách ngữ pháp")
ok(not any(it["learned"] is False for it in kho), "đã học ≥ 30 từ → không dùng thẻ mới")
again = words.pick(col, CFG, "ja", [], "2026-11-05", eligible=ai.kho_ok)
other = words.pick(col, CFG, "ja", [], "2026-11-06", eligible=ai.kho_ok)
ok([it["nid"] for it in again["kho"]] == [it["nid"] for it in kho], "cùng ngày → cùng danh sách")
ok([it["nid"] for it in other["kho"]] != [it["nid"] for it in kho], "ngày khác → danh sách khác")
ok(len(pk["focus"]) == words.FOCUS and all(it["due"] for it in kho if it["word"] in pk["focus"]),
   "%d từ trọng tâm, đều là từ phải ôn" % len(pk["focus"]))
ok(len(pk["all"]) >= 140, "danh sách mọi từ đã học: %d từ" % len(pk["all"]))

print("== chọn deck")
pk5 = words.pick(col, CFG, "ja", [d_n4], "2026-11-05", eligible=ai.kho_ok)
ok(all(NOTES.get(it["nid"]) == "n4" for it in pk5["kho"]) and len(pk5["kho"]) == 50,
   "chỉ deck N4 (kể cả deck con): %d từ đã học" % len(pk5["kho"]))
ok(sum(1 for it in pk5["kho"] if it["due"]) == 20, "N4 chỉ có 20 từ phải ôn → 20 + 30 đã thuộc")
two = words.pick(col, CFG, "ja", [d_n5, d_n4], "2026-11-05", eligible=ai.kho_ok)
first20 = [NOTES[it["nid"]] for it in two["kho"] if it["due"]][:20]
ok(first20.count("n5") == 10 and first20.count("n4") == 10, "hai deck: xoay vòng cho đều (%s)" % first20[:6])
mix = words.pick(col, CFG, "en", [d_mix], "2026-11-05", eligible=ai_en.kho_ok)
ok({NOTES[it["nid"]] for it in mix["kho"]} == {"mix_en"}, "deck trộn, báo tiếng Anh: chỉ 6 từ tiếng Anh")
ok(len(mix["kho"]) < words.MIN_WORDS, "deck đã chọn chỉ có %d từ (< %d → không viết báo)" % (len(mix["kho"]), words.MIN_WORDS))
en = words.pick(col, CFG, "en", [], "2026-11-05", eligible=ai_en.kho_ok)
ok(len(en["kho"]) == 38 and sum(1 for it in en["kho"] if it["due"]) == 18,
   "tiếng Anh không chọn deck: 38 từ (18 phải ôn), cả deck trộn")
ko = words.pick(col, CFG, "en", [d_ko], "2026-11-05", eligible=ai_en.kho_ok)
ok(not ko["kho"], "deck tiếng Hàn chọn cho báo tiếng Anh: không có từ")

print("== mới học (< 30 từ đã học) → thêm thẻ mới")
fresh_deck = deck("JA mới")
for i in range(40):
    add(JA, fresh_deck, ["新" + KANA[i] + "い", "", "mới %d" % i], "due" if i < 5 else "new")
col.sched.set_due_date(DUE[fresh_deck], "0")
fr = words.pick(col, CFG, "ja", [fresh_deck], "2026-11-05", eligible=ai.kho_ok)
ok(fr["fresh"] and len(fr["kho"]) == 40 and sum(1 for it in fr["kho"] if it["due"]) == 5,
   "5 từ đã học + 35 thẻ mới của chính deck đó (%d)" % len(fr["kho"]))

print("== khoá collection")
ok(words.load_src(col) == {"ja": {"decks": []}, "en": {"decks": []}}, "chưa chọn → rỗng")
col.set_config(words.SRC_KEY, {"ja": {"decks": [d_n5, 999999, d_n5, "x", d_n4], "ghi_chu": "giữ"},
                               "ko": {"decks": [d_ko]}, "_sau": 1})
ok(words.load_src(col)["ja"]["decks"] == [d_n5, d_n4], "bỏ id deck không còn, trùng, sai kiểu")
saved = words.save_src(col, "en", [d_en, d_mix, d_n5, d_n4, d_n4c, d_ko, d_gram])
raw = col.get_config(words.SRC_KEY)
ok(len(saved) == 5 and raw["en"]["decks"] == saved, "tối đa 5 deck")
ok(raw.get("_sau") == 1 and raw.get("ko") == {"decks": [d_ko]} and raw["ja"].get("ghi_chu") == "giữ",
   "giữ phần lạ của khoá (bản sau)")
col.decks.remove([d_en])
ok(d_en not in words.load_src(col)["en"]["decks"], "xoá deck → id tự bỏ khi đọc")
try:
    words.save_src(col, "ko", [d_ko])
    ok(False, "ngôn ngữ lạ phải bị từ chối")
except ValueError:
    ok(True, "ngôn ngữ lạ bị từ chối")

print("== phạm vi gửi Gemini")
sc = ai.scope_from_pick(pk, "N4")
ok(len(sc["kho"]) == 100 and len(sc["tu_vung"]) >= 140, "kho 100 từ, tu_vung (kiểm tra) %d từ" % len(sc["tu_vung"]))
ok(len(sc["trong_tam"]["tu"]) == 20 and len(sc["can_on"]) == 70, "20 từ trọng tâm / 70 từ phải ôn")
ok(sc["ngu_phap"][0]["id"].startswith("deck:"), "ngữ pháp lấy từ note ngữ pháp đã học")
prompt = ai.write_prompt(sc, {"so": 1, "ky": 1}, [], [], datetime.date(2026, 11, 5))
kho_words = {r[0] for r in sc["kho"]}
outside = [r[0] for r in sc["tu_vung"] if r[0] not in kho_words]
ok(all(w in prompt for w in list(kho_words)[:30]) and not any(("\n%s|" % w) in prompt for w in outside),
   "lời nhắc chỉ có 100 từ của kho")
ok("tối thiểu khoảng 8 từ" in prompt and "ĐỪNG ép câu" in prompt, "dặn dùng được bao nhiêu thì dùng, đừng ép câu")
desc = ai.describe_scope(sc)
ok("100 từ (70 từ phải ôn)" in desc and "mọi deck" in desc, "mô tả: " + desc)
sc2 = ai.scope_from_pick(two, "N4")
ok("deck JA::N5, JA::N4" in ai.describe_scope(sc2), "mô tả có tên deck: " + ai.describe_scope(sc2))
w0, w1 = sc["trong_tam"]["tu"][0], sc["trong_tam"]["tu"][1]
raw_issue = {"bai": [{"loai": "tin_lang", "tieu_de": "x", "doan": ["{%s|ご|%s}と{%s|ご|%s}。" % (w0, w0, w1, w1)]}]}
ok(ai.focus_used(raw_issue, sc) == [2, 70], "đếm từ phải ôn có trong bài: %s" % ai.focus_used(raw_issue, sc))
rep = ai.check(raw_issue, sc, {"short": False})
ok(any("TRỌNG TÂM" in w for w in rep.warnings), "dùng ít từ trọng tâm chỉ là cảnh báo")

esc = ai_en.scope_from_pick(en, "A2")
ok(esc["lang"] == "en" and len(esc["kho"]) == 38 and len(esc["can_on"]) == 18, "báo tiếng Anh: kho 38, 18 từ phải ôn")
ep = ai_en.write_prompt(esc, {"so": 1, "ky": 1}, [], [], datetime.date(2026, 11, 5))
ok("TỪ TRỌNG TÂM (người học phải ôn hôm nay)" in ep, "lời nhắc tiếng Anh có từ trọng tâm hôm nay")
fu = ai_en.focus_used({"bai": [{"loai": "tin_lang", "tieu_de": "Hi", "doan": [
    "We %s and %s today." % (esc["can_on"][0], esc["can_on"][1])]}], "cau_hoi": [], "chinh_ta": []}, esc)
ok(fu[0] >= 2 and fu[1] == 18, "đếm từ phải ôn (tiếng Anh): %s" % fu)

if OLD:
    print("== mã 1.19.0 thật lưu cấu hình / trạng thái báo → khoá deck đã chọn còn nguyên")
    before = col.get_config(words.SRC_KEY)
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stubs"))

    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    old_paper = load("old_paper_core", os.path.join(OLD, "paper_core.py"))
    old_fields = load("old_fields_core", os.path.join(OLD, "fields_core.py"))
    ps = old_paper.PaperState(os.path.join(tmp, "p.json"), col_getter=lambda: col)
    st = ps.load()
    st["read"]["2026-11-05"] = {"q": {}, "ct": {}, "coins": 3, "bonus": False}
    ps.save(st)
    fs = old_fields.FieldStore(os.path.join(tmp, "f.json"), col_getter=lambda: col)
    fs.save(fs.load())
    ok(col.get_config(words.SRC_KEY) == before, "khoá %s không đổi" % words.SRC_KEY)

col.close()
print("KẾT QUẢ:", "OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
