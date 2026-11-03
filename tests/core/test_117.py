"""Test lõi bản 1.17: furigana mọi kiểu, deck tiếng Anh / ngôn ngữ khác, bỏ Hán Việt khỏi từ vựng,
lưu ngôn ngữ + chế độ trò chơi theo ngôn ngữ (và bản 1.16 thật ở máy khác không xoá), chép chính tả tiếng Anh.

Chạy: python test_117.py THƯ_MỤC_ADD_ON [THƯ_MỤC_ADD_ON_1.16]   (cần gói anki: ANKI_PY=…)
"""
import importlib.util
import os
import sys
import tempfile

ADDON = sys.argv[1]
OLD = sys.argv[2] if len(sys.argv) > 2 else ""
sys.path.insert(0, ADDON)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_col  # noqa: E402
import fields_core as fields  # noqa: E402
import garden_core as core  # noqa: E402
import paper_core as paper  # noqa: E402
import text_core as text  # noqa: E402
from anki.collection import Collection  # noqa: E402

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


print("== furigana: mọi kiểu đưa về một dạng")
CASES = [
    ("日本[にほん] 語[ご]", "日本語", "にほんご"),
    (" 食[た]べる", "食べる", "たべる"),                                           # okurigana ngoài ngoặc
    ("漢字[かんじ;h,1]", "漢字", "かんじ"),                                         # Migaku
    ("です[;k]", "です", ""),
    ("<ruby>漢字<rt>かんじ</rt></ruby>", "漢字", "かんじ"),                        # Yomitan {furigana}
    ("<ruby><rb>漢字</rb><rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>", "漢字", "かんじ"),
    ("<ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>", "漢字", "かんじ"),
    ("<ruby><rb>漢</rb><rb>字</rb><rt>かん</rt><rt>じ</rt></ruby>", "漢字", "かんじ"),
    ("漢字（かんじ）", "漢字", "かんじ"),
    ("漢字(かんじ)", "漢字", "かんじ"),
    ("漢字【かんじ】", "漢字", "かんじ"),
    ("漢字<br>かんじ", "漢字", "かんじ"),
    ("賛成(する)", "賛成(する)", ""),                                              # đuôi kiểu (する) giữ nguyên
    ("静か（な）", "静か（な）", ""),
    ("<b>今日</b>[きょう]", "今日", "きょう"),
    ("食べる", "食べる", ""),
    ("たべる[sound:a.mp3]", "たべる", ""),
]
for raw, word, reading in CASES:
    got = text.split_word(raw)
    ok(got == (word, reading), "%-55s → %s" % (raw, got))
ok(text.reading_field("漢字[かんじ]") == "かんじ", "trường Cách đọc dạng 漢字[かんじ] → かんじ (1.16 mất cách đọc)")
ok(text.reading_field("<ruby>漢字<rt>かんじ</rt></ruby>") == "かんじ", "trường Cách đọc dạng ruby → かんじ")
ok(text.reading_field("Kun: ちから<br>On: リョク") == "Kun: ちから / On: リョク", "trường Cách đọc nhiều dòng giữ như cũ")
ex = text.ja_example('<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>します。[sound:x.mp3]')
ok(ex == "漢字[かんじ]を 勉強[べんきょう]します。", "câu ví dụ ruby → ngoặc vuông: " + ex)
mk, full = paper.anki_to_markup('<ruby>私<rt>わたし</rt></ruby>は<ruby>学生<rt>がくせい</rt></ruby>です。')
ok(mk == "[私|わたし]は[学生|がくせい]です。" and full, "câu ruby → cú pháp báo (chép chính tả): " + mk)
mk2, _ = paper.anki_to_markup("私[わたし;h]は 学生[がくせい;k,0]です")
ok(mk2 == "[私|わたし]は[学生|がくせい]です", "câu Migaku → cú pháp báo: " + mk2)

print("== tiếng Anh")
ok(text.en_split_ipa("apple /ˈæp.əl/") == ("apple", "/ˈæp.əl/"), "tách IPA giữa / /")
ok(text.en_split_ipa("run [rʌn]") == ("run", "/rʌn/"), "tách IPA trong [ ]")
ok(text.en_split_ipa("take [sth] off") == ("take [sth] off", ""), "[sth] không phải IPA → giữ")
ok(text.en_alternatives("to go (v)") == ["to go", "go"], "to go (v) → to go, go")
ok(text.en_alternatives("(be) able to") == ["able to", "be able to"], "(be) able to")
for sent, word, hit in [("She went home.", "go", "went"), ("He is studying.", "study", "studying"),
                        ("The car stopped.", "stop", "stopped"), ("Big cities are noisy.", "city", "cities"),
                        ("I looked up the word.", "look up", "looked up"), ("The children run.", "child", "children"),
                        ("She is happier now.", "happy", "happier"), ("I have a cat.", "cat", "cat")]:
    sp = text.find_word(sent, word)
    ok(sp is not None and sent[sp[0]:sp[1]] == hit, "tìm %r trong %r → %r" % (word, sent, sent[sp[0]:sp[1]] if sp else None))
ok(text.find_word("Concatenate it.", "cat") is None, "không bắt nhầm giữa từ (concatenate ≠ cat)")
ok(text.en_words("I don't think it's OK!") == text.en_words("i do not think it is ok"), "don't = do not, it's = it is, bỏ dấu câu")
ok(paper.matches("The children don't like rain.", [], ["the children do not like rain"], False, "en"), "chấm câu tiếng Anh theo từ")
ok(not paper.matches("The children don't like rain.", [], ["the child do not like rain"], False, "en"), "sai một từ → sai")

print("== đoán ngôn ngữ")
for name, keys, words, want in [
        ("Basic", ["Front", "Back"], ["apple", "run", "look up"], "en"),
        ("Basic", ["Front", "Back"], ["食べる", "日本", "水"], "ja"),
        ("Kanji", ["Kanji"], ["水", "火", "力"], "ja"),
        ("Basic", ["Front", "Back"], ["안녕", "사랑"], "other"),
        ("Basic", ["Front", "Back"], ["cái bàn", "con mèo", "đẹp"], "other"),
        ("Chinese", ["Hanzi", "Pinyin"], ["水", "火"], "other"),
        ("EN", ["Front"], ["apple /ˈæp.əl/ - quả táo", "go /ɡoʊ/ - đi"], "en"),
        ("x", ["Front"], [], "ja")]:
    ok(fields.guess_lang(name, keys, words) == want, "%s %s → %s" % (name, words[:2], want))

print("== collection thật: deck mẫu 1.17")
tmp = tempfile.mkdtemp()
path = os.path.join(tmp, "c.anki2")
make_col.build(path)
col = Collection(path)
cfg = core.merged_config({})


def garden(dname, tts=False):
    c = dict(cfg, _tts={"en": tts})
    return core.build_garden(col, col.decks.id_for_name(dname), c)


g = garden("A::Có câu ví dụ + audio")
ok(all(p["hanviet"] == "" for p in g["plants"]) and all("pos" not in p for p in g["plants"]), "từ vựng: không còn Hán Việt / loại từ")
ok([p["lang"] for p in g["plants"]] == ["ja"] * 8 and g["note_types"][0]["lang"] == "ja", "deck tiếng Nhật cũ: lang = ja")
g = garden("E::Kanji đơn")
ok([p["hanviet"] for p in g["plants"]] == ["HỌC", "SINH", "THỰC", "THIÊN"], "chữ Hán vẫn có Hán Việt")
g = garden("G::Tiếng Anh đầy đủ")
ok(g["note_types"][0]["lang"] == "en" and g["plants"][0]["reading"] == "/ˈæp.əl/", "deck tiếng Anh: lang en, IPA giữ dấu / /")
ok([bool(p["audio"]) for p in g["plants"]] == [True] * 5 + [False] * 3, "audio: chỉ từ có file (máy không có giọng tiếng Anh)")
g2 = garden("G::Tiếng Anh đầy đủ", tts=True)
ok(all(p["audio"] and p["ex_audio"] for p in g2["plants"]) and g2["tts"] == {"en": True}, "máy có giọng tiếng Anh → mọi từ / câu nghe được")
ok(all(p["cloze"] for p in g["plants"]), "Điền vào câu: mọi câu tiếng Anh che được từ")
g = garden("F::Tiếng Anh Basic")
ok(g["note_types"][0]["lang"] == "en" and g["plants"][0]["meaning"] == "quả táo", "Basic Front/Back tiếng Anh tự nhận")
g = garden("J::Tiếng Hàn")
ok(g["note_types"][0]["lang"] == "other" and g["plants"][0]["word"] == "사과", "tiếng Hàn → ngôn ngữ khác")
g = garden("K::Nhật ruby HTML")
ok([p["word"] for p in g["plants"]] == ["学生", "先生", "食べる", "天気", "図書館"], "ruby HTML: chữ sạch")
ok([p["reading"] for p in g["plants"]] == ["がくせい", "せんせい", "たべる", "てんき", "としょかん"], "ruby HTML: cách đọc")
fp = core.fields_panel(col, col.decks.id_for_name("H::Tiếng Anh nhồi chung"), cfg)
by = {m["name"]: m for m in fp["models"]}
ok(by["EN nhồi chung KB"]["crammed"] and by["Nhật nhồi chung KB"]["crammed"], "cảnh báo trường Từ nhồi chung (Anh + Nhật)")
ok(not by["English KB"]["crammed"] and not by["Từ vựng KB"]["crammed"], "deck chuẩn không bị cảnh báo")
ok(by["English KB"]["guess"]["f"] == {"word": "Word", "reading": "IPA", "meaning": "Meaning", "example": "Example",
                                      "ex_meaning": "Example meaning", "audio": "Audio"}, "gợi ý trường tiếng Anh đúng")
ok(set(fp["langs"]["kinds"]["en"][0]["roles"][1].values()) >= {"Phiên âm (IPA)"}, "nhãn vai trò tiếng Anh: Phiên âm (IPA)")

print("== lưu ngôn ngữ, chế độ trò chơi theo ngôn ngữ")
store = fields.FieldStore(os.path.join(tmp, "f.json"), lambda: col)
mid_en = str(col.models.by_name("English KB")["id"])
mid_ko = str(col.models.by_name("Tiếng Hàn KB")["id"])
conf, err = fields.validate_save({"kind": "kanji", "f": {"word": "Word"}}, ["Word"], "en")
ok(conf is None and "Từ vựng hoặc Khác" in err, "tiếng Anh không chọn được loại Chữ Hán: " + err)
EN_F = {"word": "Word", "reading": "IPA", "meaning": "Meaning", "example": "Example", "ex_meaning": "Example meaning", "audio": "Audio"}
conf, err = fields.validate_save({"kind": "vocab", "f": EN_F}, list(EN_F.values()), "en")
store.set_model(mid_en, conf, "en")
store.set_model(mid_ko, {"kind": "vocab", "f": {"word": "Front", "meaning": "Back"}}, "other")
store.set_game("crow", "en", "spell")
store.set_game("market", "xx", "word-meaning")
store.set_game("market", "vocab", "reading-word")
s = store.load()
ok(s["lang"] == {mid_en: "en", mid_ko: "other"}, "khoá lang: " + str(s["lang"]))
ok(s["games_lang"] == {"en": {"crow": "spell"}, "other": {"market": "word-meaning"}} and s["games"]["market"]["vocab"] == "reading-word",
   "games_lang tách khỏi games")
try:
    store.set_game("crow", "xx", "spell")
    ok(False, "Đuổi quạ cho ngôn ngữ khác phải bị chặn")
except ValueError:
    ok(True, "Đuổi quạ không có chế độ cho ngôn ngữ khác")
g = core.build_garden(col, col.decks.id_for_name("G::Tiếng Anh đầy đủ"), dict(cfg, _fields=s))
ok(g["game_modes_lang"] == s["games_lang"] and g["note_types"][0]["configured"], "vườn gửi game_modes_lang sang trang")

if OLD:
    print("== máy khác còn bản 1.16: đọc + lưu cấu hình trường bằng mã 1.16 thật")
    spec = importlib.util.spec_from_file_location("fields_116", os.path.join(OLD, "fields_core.py"))
    old = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old)
    ostore = old.FieldStore(os.path.join(tmp, "o.json"), lambda: col)
    mid_v = str(col.models.by_name("Từ vựng KB")["id"])
    ostore.set_model(mid_v, {"kind": "vocab", "f": {"word": "Từ", "meaning": "Nghĩa", "hanviet": "Nghĩa"}})
    ostore.set_game("memory", "vocab", "reading")
    s2 = store.load()
    ok(s2["lang"] == {mid_en: "en", mid_ko: "other"} and s2["games_lang"] == s["games_lang"],
       "bản 1.16 lưu đè → lang + games_lang vẫn còn")
    ok(s2["models"][mid_v]["f"] == {"word": "Từ", "meaning": "Nghĩa"}, "bản mới đọc lại: bỏ Hán Việt khỏi từ vựng")
    ok(s2["games"]["memory"]["vocab"] == "reading", "chế độ trò chơi do bản 1.16 lưu vẫn đọc được")
    s3 = old.clean_store(col.get_config(fields.KEY))
    ok(s3["models"][mid_en]["kind"] == "vocab", "bản 1.16 vẫn đọc được loại note tiếng Anh (là từ vựng)")

print("== chép chính tả tiếng Anh")
cfg2 = dict(cfg, _fields=store.load())
nid = col.find_notes('"deck:G::Tiếng Anh đầy đủ" Word:child')[0]
item = paper.note_dict_item(col.get_note(nid), cfg2)
ok(item and item["lang"] == "en" and item["markup"] == "The children don't like rain.", "câu ví dụ tiếng Anh: " + str(item and item["markup"]))
w = paper.note_word_item(col.get_note(nid), cfg2)
ok(w and w["markup"] == "child" and w["lang"] == "en", "nghe từ, gõ lại: child")


def ni(n):
    return paper.note_dict_item(col.get_note(n), cfg2)


v = paper.Voice(tts_en=True)
st = paper.empty_state()
paper.build_daily(st, 100, None, [{"nid": nid, "wilted": False, "thirsty": False, "audio": False}], ni, v)
view = paper.daily_view(st, None, ni, v)
ok(view["items"] and view["items"][0]["lang"] == "en" and view["items"][0]["voice"] == "giọng máy", "câu không có audio → giọng máy")
t = paper.audio_for("n:%d" % nid, True, None, ni, v)
ok(t and t[0] == "tts_en" and t[2] == 0.7, "phát bằng giọng tiếng Anh, chậm 0.7: " + str(t))
res = paper.answer_daily(st, 100, "n:%d" % nid, ["the children do not like rain"], None, ni, v)
ok(res["ok"] and res["gained"] == paper.DICT_COINS + paper.DICT_BONUS, "gõ chữ thường, mở rút gọn → đúng, +2 xu (+5 làm hết lượt)")
ok(paper.Voice(tts=True).how("사과", "other")[0] is None, "ngôn ngữ khác: không đọc bằng giọng máy tiếng Nhật")
ok(paper.Voice(tts=True).how("apple", "en")[0] is None, "máy chỉ có giọng Nhật thì không đọc câu tiếng Anh")
nid_ja = col.find_notes('"deck:K::Nhật ruby HTML"')[0]
it = paper.note_dict_item(col.get_note(nid_ja), cfg2)
ok(it and it["markup"] == "[私|わたし]は[学生|がくせい]です。", "câu ví dụ ruby của deck Nhật vẫn chép được: " + str(it and it["markup"]))
col.close()

print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
