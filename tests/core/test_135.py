"""1.35 — tiếng Đức / tiếng Pháp như tiếng Anh / Trung / Nhật / Hàn (người dùng chốt 17/11): deck riêng, trò chơi, Ngôn ngữ
trong vườn, báo Der Wortgarten / Le Jardin des Mots. Kịch bản:

1. Lưu trữ Cấu hình trường: de / fr ở khoá mới lang3 / games_lang3 (bản 1.32–1.34 ghi lại lang2 / games_lang2 theo danh sách
   của nó → sẽ mất de / fr). Mã thật 1.31.3 (bản đã phát hành) + 1.34.1 (nếu repo có lịch sử) thay nhau lưu 3.000 lần với
   1.35: lựa chọn tiếng Đức / Pháp còn nguyên khi bản cũ lưu loại note khác, bản cũ chọn lại thì theo bản cũ.
2. eu_core: nhận từ của deck trong câu (chia động từ, số nhiều có umlaut, động từ tách, l' / d', tính từ bất quy tắc,
   động từ phản thân) + từ không được nhận nhầm; gõ không dấu (ä = ae, é = e); tách từ để chấm chép.
3. ai_de / ai_fr: số báo mẫu (Gemini giả) qua autofix + check → 0 lỗi, nối tra từ đúng dạng gốc; số báo hỏng → đúng lỗi
   (kana, chữ Hán, chữ Hàn, chữ Việt, từ mới không có trong bài, câu chép không có trong bài → máy chọn lại).
4. Cả quy trình (ai_core.Job + story_core.retell) với Gemini giả: 3 lượt gọi, số báo lưu được, trình đọc báo mở được,
   tra từ, chép chính tả chấm đúng (gõ không dấu cũng đúng, sai chữ thì sai).
5. Lời nhắc tiếng Đức / Pháp: không sót chữ của báo tiếng Anh (IPA, Kotoba Village, The Garden Gazette, "tiếng Anh"),
   không sót chỗ trống @…@; tên nhân vật đúng cột (Bürgermeister / maire), không tên tiếng Nhật.
6. story_core: đoán ngôn ngữ của bản truyện, kiểm tra truyện chữ Latin.
7. paper_core: tối đa 2 báo trong 6 tiếng, giọng máy tts_de / tts_fr, độ dài câu chép đếm theo từ.
8. Ngôn ngữ trong vườn: bảng EU đủ mục như bảng gốc, chính tả soát bằng hunspell (bảng đóng băng
   tests/fixtures/chu_135_ref.json — sinh lại bằng tests/tools/soat_chu_135.py), từ từ điển không có phải có lý do.
9. node test_135.js: Đuổi quạ gõ đáp án tiếng Đức / Pháp (hàm thật của games.js), glang.js, ngày tháng báo (paper.js).
10. Hợp đồng dữ liệu: khoá collection mới chỉ kotoba_batake_paper_de / _fr; config.json không thêm mục (gemini_level_de /
    _fr chỉ ghi khi đổi); manifest 1.35.0.

Chạy: python test_135.py ADDON   (python có gói anki — ANKI_PY — không bắt buộc)
"""
from __future__ import annotations

import copy
import datetime
import glob
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
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))
import ma_cu  # noqa: E402
import ai_core as ai  # noqa: E402
import ai_de  # noqa: E402
import ai_en  # noqa: E402
import ai_eu  # noqa: E402
import ai_fr  # noqa: E402
import eu_core as E  # noqa: E402
import lang_core as L  # noqa: E402
import paper_core as paper  # noqa: E402
import story_core as S  # noqa: E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


FIX = json.load(open(os.path.join(ROOT, "tests", "fixtures", "bao_135.json"), encoding="utf-8"))
TMP = tempfile.mkdtemp(prefix="kb135_")


def old_tree(commit: str) -> str | None:
    d = os.path.join(TMP, commit)
    try:
        data = ma_cu.archive(ROOT, commit)
    except OSError:
        return None
    os.makedirs(d, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as t:
        t.extractall(d)
    return os.path.join(d, "kotoba_batake")


def load_fields(folder: str, name: str):
    spec = importlib.util.spec_from_file_location(name, os.path.join(folder, "fields_core.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, folder)
    saved = sys.modules.pop("backup_core", None)
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.path.remove(folder)
        sys.modules.pop("backup_core", None)
        if saved is not None:
            sys.modules["backup_core"] = saved
    return mod


# =========================================================================================================================
print("== 1. Cấu hình trường: de / fr ở lang3 / games_lang3, bản cũ thay nhau lưu")
NEW = load_fields(ADDON, "fields_135")
ok(NEW.NEW_LANGS3 == ("de", "fr") and "de" in NEW.LANGS and "fr" in NEW.LANGS and NEW.GAME_GROUPS["de"] == "de",
   "fields_core biết tiếng Đức / tiếng Pháp (nhóm trò chơi riêng)")
raw = NEW.to_raw({"lang": {"101": "de", "102": "fr", "103": "zh", "104": "en"},
                  "games_lang": {"de": {"crow": "spell"}, "fr": {"market": "word-meaning"}, "zh": {"crow": "spell"}}})
ok(raw["lang"] == {"101": "other", "102": "other", "103": "other", "104": "en"} and raw["lang3"] == {"101": "de", "102": "fr"}
   and raw["lang2"] == {"103": "zh"}, "dạng lưu: de / fr → lang \"other\" (bản cũ hiểu) + lang3; zh vẫn ở lang2")
ok(raw["games_lang3"] == {"de": {"crow": "spell"}, "fr": {"market": "word-meaning"}} and "de" not in raw["games_lang2"]
   and raw["games_lang2"] == {"zh": {"crow": "spell"}}, "chế độ trò chơi de / fr ở games_lang3, không ở games_lang2")
back = NEW.clean_store(raw)
ok(back["lang"] == {"101": "de", "102": "fr", "103": "zh", "104": "en"} and back["games_lang"]["de"] == {"crow": "spell"},
   "đọc lại đúng như trước khi lưu")
odd = NEW.clean_store({"lang": {"201": "other", "202": "other", "203": "ja"}, "lang2": {"202": "other"},
                       "lang3": {"201": "fr", "202": "de", "203": "de", "204": "xx"},
                       "games_lang2": {"de": {"crow": "spell"}}, "games_lang3": {"zh": {"crow": "spell"}, "fr": {"crow": "nope"}}})
ok(odd["lang"] == {"201": "fr", "202": "other", "203": "ja"} and "202" in odd["fixed"],
   "lang3 chỉ dùng khi lang = other và lang2 chưa chọn (bản 1.32–1.34 chọn \"Ngôn ngữ khác\" / tiếng Nhật thì thắng)")
ok("de" not in odd["games_lang"] and "zh" not in odd["games_lang"] and "fr" not in odd["games_lang"],
   "games_lang2 không nhận de, games_lang3 không nhận zh, chế độ lạ bỏ")

OLD = {}
for commit, ver in (("e64eb22", "1.31.3"), ("fc9b1e5", "1.34.1")):
    tree = old_tree(commit)
    if tree:
        OLD[ver] = load_fields(tree, "fields_" + commit)
    else:
        print("  (không có mã %s — repo không có lịch sử commit %s: bỏ qua bản này)" % (ver, commit))
ok("1.31.3" in OLD, "nạp mã thật bản đã phát hành 1.31.3%s" % (" + 1.34.1" if "1.34.1" in OLD else ""))
rnd = random.Random(int(os.environ.get("KB_SEED", "135")))
MIDS = [str(3000 + i) for i in range(10)]
FIELDS = ["Wort", "Bedeutung", "Mot", "Sens", "Front", "Back", "Word", "Meaning"]
path = os.path.join(TMP, "fields.json")
json.dump({"tuong_lai": {"giu": 1}}, open(path, "w", encoding="utf-8"))
stores = {"new": NEW.FieldStore(path)}
stores.update({v: m.FieldStore(path) for v, m in OLD.items()})
who_list = ["new", "new"] + list(OLD)
expect: dict[str, str] = {}
expect_game: dict[tuple[str, str], str] = {}
fails: list[str] = []
writes = {w: 0 for w in stores}
old_over_eu = 0          # lượt bản cũ lưu trong lúc đang có loại note tiếng Đức / Pháp
for step in range(3000):
    who = rnd.choice(who_list)
    mod = NEW if who == "new" else OLD[who]
    st = stores[who]
    if who != "new" and any(x in ("de", "fr") for x in expect.values()):
        old_over_eu += 1
    mid = rnd.choice(MIDS)
    try:
        if rnd.random() < 0.75:
            langs = [x for x in ("ja", "en", "zh", "ko", "de", "fr", "other") if x in mod.LANGS]
            lang = rnd.choice(langs)
            kind = rnd.choice(mod.LANG_KINDS[lang])
            w, m = rnd.sample(FIELDS, 2)
            f = {"word": w, "meaning": m}
            if kind == "kanji":
                f["hanviet"] = "Hán Việt"
            conf, err = mod.validate_save({"kind": kind, "f": f}, FIELDS, lang)
            if conf is None:
                continue
            prev_raw = json.load(open(path, encoding="utf-8"))
            st.set_model(mid, conf, lang)
            writes[who] += 1
            if who == "new" or lang != "other":
                expect[mid] = lang
            elif who == "1.31.3":
                # 1.31.3 chỉ có "other" (không biết lang2 / lang3, giữ nguyên như khoá lạ): chọn "other" cho loại note từng là
                # tiếng Trung / Hàn / Đức / Pháp → lựa chọn đã lưu ở bản mới dùng lại (như zh / ko ở 1.32 — test_132b);
                # lang2 (zh / ko / "Ngôn ngữ khác" của 1.32–1.34) đứng trước lang3
                l2 = (prev_raw.get("lang2") or {}).get(mid)
                l3 = (prev_raw.get("lang3") or {}).get(mid)
                expect[mid] = l2 if l2 in ("zh", "ko", "other") else l3 if l3 in ("de", "fr") else "other"
            else:
                expect[mid] = "other"          # 1.32+ chọn "Ngôn ngữ khác" → lang2 = other (cố định)
        else:
            grp = rnd.choice([g for g in ("en", "zh", "de", "fr") if g in mod.GAME_GROUPS.values()])
            game = rnd.choice([g for g in mod.GAME_MODES if mod.GAME_MODES[g].get(grp)])
            mode = rnd.choice(mod.GAME_MODES[game][grp])
            lang = next(k for k, v in mod.GAME_GROUPS.items() if v == grp)
            st.set_game(game, grp, mode)
            expect_game[(lang, game)] = mode
            writes[who] += 1
    except Exception as err:      # noqa: BLE001
        fails.append("%d %s %r" % (step, who, err))
        break
    now = NEW.FieldStore(path).load()
    got = {mid: now["lang"].get(mid) for mid in expect}
    if got != expect:
        diff = {k: (expect[k], got[k]) for k in expect if expect[k] != got[k]}
        fails.append("bước %d (%s): %s" % (step, who, diff))
        break
    gl = now.get("games_lang") or {}
    bad_g = {k: v for k, v in expect_game.items() if (gl.get(k[0]) or {}).get(k[1]) != v}
    if bad_g:
        fails.append("bước %d (%s) trò chơi: %s" % (step, who, bad_g))
        break
fin = json.load(open(path, encoding="utf-8"))
ok(not fails, "3.000 lượt lưu (%s): ngôn ngữ từng loại note + chế độ trò chơi đúng sau mỗi lượt%s"
   % (", ".join("%s %d" % kv for kv in writes.items()), (" — " + fails[0]) if fails else ""))
ok(fin.get("tuong_lai") == {"giu": 1}, "khoá của bản sau này vẫn còn")
ok(old_over_eu >= 500, "%d lượt bản cũ lưu trong lúc có loại note tiếng Đức / Pháp (kịch bản có ý nghĩa)" % old_over_eu)

# =========================================================================================================================
print("== 2. eu_core: nhận từ của deck trong câu")
POS = [("de", "Die Blätter im Dorf sind sehr schön.", "das Blatt, ¨-er", "Blätter"),
       ("de", "Die Leute haben viele Fotos gemacht.", "machen", "gemacht"),
       ("de", "Der Bürgermeister ist in das Gasthaus gegangen.", "gehen", "gegangen"),
       ("de", "Er hat das Fest vorbereitet.", "vorbereiten", "vorbereitet"),
       ("de", "Sie hat ihn angerufen.", "anrufen", "angerufen"),
       ("de", "Da lief StackChan in das Gasthaus.", "laufen", "lief"),
       ("de", "Es hat rote Augen.", "das Auge, -n", "Augen"),
       ("de", "Ihre Hände zitterten.", "die Hand, ¨-e", "Hände"),
       ("de", "Ihre Hände zitterten.", "zittern", "zitterten"),
       ("de", "Das Gespenst trug Holzschuhe.", "der Holzschuh, -e", "Holzschuhe"),
       ("de", "Wir freuen uns sehr.", "sich freuen", "freuen"),
       ("de", "Er hat sich hingesetzt.", "sich hinsetzen", "hingesetzt"),
       ("de", "Die Häuser sind alt.", "das Haus", "Häuser"),
       ("de", "Sie war müde.", "sein", "war"),
       ("de", "Er isst einen Apfel.", "essen", "isst"),
       ("de", "Das Kind spielt im Garten.", "spielen", "spielt"),
       ("de", "Er spricht leise.", "sprechen", "spricht"),
       ("fr", "Les feuilles du village sont très belles.", "la feuille", "feuilles"),
       ("fr", "Les feuilles du village sont très belles.", "beau", "belles"),
       ("fr", "Les gens ont pris beaucoup de photos.", "prendre", "pris"),
       ("fr", "Le maire est allé à l'auberge.", "aller", "allé"),
       ("fr", "Le maire est allé à l'auberge.", "l'auberge (f)", "auberge"),
       ("fr", "Il a des yeux rouges.", "l'œil (m)", "yeux"),
       ("fr", "Ses mains tremblaient.", "trembler", "tremblaient"),
       ("fr", "Tout le monde a ri.", "rire", "ri"),
       ("fr", "Il s'est assis lentement.", "s'asseoir", "assis"),
       ("fr", "Je me lave les mains.", "se laver", "lave"),
       ("fr", "Elle voulait écrire l'histoire.", "l'histoire", "histoire"),
       ("fr", "Nous mangeons du pain.", "manger", "mangeons"),
       ("fr", "Les chevaux courent.", "le cheval", "chevaux"),
       ("fr", "Elle est heureuse.", "heureux", "heureuse"),
       ("fr", "Une robe blanche.", "blanc", "blanche"),
       ("fr", "Ils finissent le travail.", "finir", "finissent")]
NEG = [("de", "Die Ente schwimmt.", "die Ende"), ("de", "Wir essen Reis.", "das Ei"),
       ("de", "Das Gasthaus ist alt.", "der Gast"), ("de", "Er ist im Haus.", "das Haus, ¨-er im Garten"),
       ("de", "Die Blume ist rot.", "die Blumen­vase"), ("de", "Sie geht nach Hause.", "gehören"),
       ("de", "Ich habe Hunger.", "haben Sie"), ("de", "Das Rathaus ist groß.", "das Haus"),
       ("fr", "Le chaton dort.", "le chat"), ("fr", "Il porte un chapeau.", "le port"),
       ("fr", "La pomme de terre.", "la pomme d'amour"), ("fr", "Le printemps arrive.", "le temps"),
       ("fr", "Elle a peur.", "le pain"), ("fr", "Il parle.", "partir")]
bad = []
for lang, s, w, want in POS:
    pos = E.find_word(s, w, lang)
    if not pos or want.lower() not in s[pos[0]:pos[1]].lower():
        bad.append((w, s, pos and s[pos[0]:pos[1]]))
# giới hạn đã biết: động từ tách đứng rời ("Ich rufe dich an" — anrufen) không nối tra từ (không nối nhầm setzen / aufsetzen)
ok(E.find_word("Ich rufe dich morgen an.", "anrufen", "de") is None, "động từ tách đứng rời: không nối (giới hạn đã biết, không nối nhầm)")
ok(not bad, "%d dạng (số nhiều umlaut, Partizip, động từ tách, bất quy tắc, phản thân, l' / œil → yeux) được nhận%s"
   % (len(POS), (" — sai: %s" % bad[:4]) if bad else ""))
bad = [(w, s, E.find_word(s, w, lang)) for lang, s, w in NEG if E.find_word(s, w, lang)]
ok(not bad, "%d từ trùng đầu / nằm trong từ ghép không bị nhận nhầm (Rathaus ≠ Haus, chaton ≠ chat)%s"
   % (len(NEG), (" — sai: %s" % bad[:4]) if bad else ""))
ok(E.alternatives("der Hund, -e", "de") == ["der Hund", "Hund"] and E.alternatives("le chat (m)", "fr") == ["le chat", "chat"]
   and E.alternatives("gehen / laufen", "de") == ["gehen", "laufen"], "cách viết của deck: bỏ số nhiều / giống / tách nhiều từ")
ok(E.fold("Nächste Straße", "de") == "naechste strasse" and E.fold("Élève à l'école", "fr") == "eleve a l'ecole"
   and E.fold("cœur", "fr") == "coeur", "gõ không dấu: ä = ae, ß = ss, é = e, œ = oe")
ok(E.words("L'école d'Hana, c'est là-bas !", "fr") == ["l'", "école", "d'", "hana", "c'", "est", "là", "bas"],
   "tách từ tiếng Pháp: l' / d' / c' rời khỏi từ sau, gạch nối tách")
ok(E.words("„Hallo!“, sagte Lin.", "de") == ["hallo", "sagte", "lin"], "tách từ tiếng Đức: bỏ ngoặc „…“")

# =========================================================================================================================
print("== 3. ai_de / ai_fr: sửa máy + kiểm tra số báo mẫu")
DE_WORDS = [("das Wetter", "thời tiết"), ("das Dorf, ¨-er", "làng"), ("das Foto, -s", "ảnh"), ("das Fest, -e", "lễ hội"),
            ("vorbereiten", "chuẩn bị"), ("das Notizbuch", "sổ tay"), ("der Brunnen", "cái giếng"), ("die Angst", "nỗi sợ"),
            ("das Geräusch", "tiếng động"), ("das Auge, -n", "mắt"), ("die Geschichte", "câu chuyện"),
            ("das Gasthaus", "quán trọ"), ("die Katze, -n", "con mèo"), ("das Bild, -er", "bức tranh"),
            ("die Blume, -n", "bông hoa"), ("die Schule", "trường học"), ("das Krankenhaus", "bệnh viện"), ("süß", "dễ thương"),
            ("klar", "trong, quang"), ("schön", "đẹp"), ("machen", "làm"), ("das Blatt, ¨-er", "chiếc lá"), ("malen", "vẽ"),
            ("lachen", "cười"), ("zittern", "run"), ("gehen", "đi"), ("die Woche", "tuần")]
FR_WORDS = [("la feuille", "chiếc lá"), ("le village", "làng"), ("la photo", "ảnh"), ("la fête", "lễ hội"),
            ("préparer", "chuẩn bị"), ("le carnet", "sổ tay"), ("le puits", "cái giếng"), ("la peur", "nỗi sợ"),
            ("le bruit", "tiếng động"), ("l'œil (m)", "mắt"), ("l'histoire (f)", "câu chuyện"), ("l'auberge (f)", "quán trọ"),
            ("le chat", "con mèo"), ("le dessin", "bức vẽ"), ("la fleur", "bông hoa"), ("l'école (f)", "trường học"),
            ("l'hôpital (m)", "bệnh viện"), ("mignon", "dễ thương"), ("beau", "đẹp"), ("prendre", "lấy, chụp"),
            ("dessiner", "vẽ"), ("rire", "cười"), ("trembler", "run"), ("aller", "đi"), ("la semaine", "tuần"),
            ("l'automne (m)", "mùa thu"), ("la journée", "ngày")]
MODS = {"de": ai_de, "fr": ai_fr}
WORDS = {"de": DE_WORDS, "fr": FR_WORDS}
SCOPE = {}
for lang, mod in MODS.items():
    pk = {"kho": [{"word": w, "reading": "", "meaning": m, "due": i % 3 == 0} for i, (w, m) in enumerate(WORDS[lang])],
          "all": [], "decks": ["Deutsch A2" if lang == "de" else "Français A2"]}
    SCOPE[lang] = mod.scope_from_pick(pk, "A2")
sc = SCOPE["de"]
ok(sc["lang"] == "de" and sc["trinh_do"] == "A2" and len(sc["tu_vung"]) == len(DE_WORDS) and sc["trong_tam"]["tu"]
   and all(g["bai"] in ("A1", "A2") for g in sc["ngu_phap"]), "phạm vi tiếng Đức: từ của deck, từ phải ôn, ngữ pháp A1–A2")
ok(ai_de.LEVELS == ai_en.LEVELS and ai_de.DEFAULT_LEVEL == "A2" and ai_fr.MASTHEAD == "Le Jardin des Mots"
   and ai_de.MASTHEAD == "Der Wortgarten" and ai_de.FOLDER == "bao_gemini_de", "trình độ A1–C1, tên báo, thư mục riêng")


def issue_with_story(lang: str) -> dict:
    raw = copy.deepcopy(FIX[lang]["issue"])
    st = FIX[lang]["story"]
    raw["bai"].insert(1, {"loai": "truyen", "ky": 2, "ky_truoc": "Lin nghe tiếng guốc gỗ lách cách ở giếng cổ.",
                          "tieu_de": st["tieu_de"], "doan": list(st["doan"]), "dich": list(st["dich"])})
    raw["tu_moi"] = list(st["tu_moi"])
    return raw


OPTS = {"ky": 2, "story_plain": {"tieu_de": "x", "doan": ["x"]}}
FIXED = {}
for lang, mod in MODS.items():
    fixed, notes = mod.autofix(issue_with_story(lang), SCOPE[lang], OPTS)
    rep = mod.check(fixed, SCOPE[lang], OPTS)
    FIXED[lang] = fixed
    ok(not rep.errors, "%s: số báo mẫu 0 lỗi%s" % (lang, (" — " + "; ".join(rep.errors[:4])) if rep.errors else ""))
    ok(mod.deck_count(fixed, SCOPE[lang]) >= 12, "%s: dùng %d từ của deck" % (lang, mod.deck_count(fixed, SCOPE[lang])))
txt = json.dumps(FIXED["de"]["bai"], ensure_ascii=False)
links = {m.group(1): m.group(3) for m in re.finditer(r"\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}", txt)}
want = {"Blätter": "das Blatt", "gemacht": "machen", "gegangen": "gehen", "vorbereitet": "vorbereiten",
        "Holzschuhe": "der Holzschuh"}
miss = {k: links.get(k) for k, v in want.items() if links.get(k) != v}
ok(not miss, "de: nối tra từ về từ của deck (bỏ số nhiều: Blätter → das Blatt, gegangen → gehen, vorbereitet → vorbereiten, "
   "từ mới Holzschuhe)%s" % ((" — sai: %s" % miss) if miss else ""))
for lang in ("de", "fr"):
    twice = []
    for bb in FIXED[lang]["bai"]:
        ks = [k for t in [bb["tieu_de"]] + bb["doan"] for k in paper.keys(t)]
        twice += sorted({k for k in ks if ks.count(k) > 1})
    ok(not twice, "%s: mỗi từ của deck gạch chân một lần mỗi bài%s" % (lang, (" — lặp: %s" % twice[:5]) if twice else ""))
txt = json.dumps(FIXED["fr"]["bai"], ensure_ascii=False)
links = {m.group(1): m.group(3) for m in re.finditer(r"\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}", txt)}
want = {"feuilles": "la feuille", "pris": "prendre", "allé": "aller", "yeux": "l'œil", "sabots": "le sabot",
        "tremblaient": "trembler"}
miss = {k: links.get(k) for k, v in want.items() if links.get(k) != v}
ok(not miss, "fr: nối tra từ (feuilles → la feuille, pris → prendre, yeux → l'œil, từ mới sabots)%s"
   % ((" — sai: %s" % miss) if miss else ""))
pl = ai_eu.plain_issue(FIXED["de"])
plj = json.dumps(pl, ensure_ascii=False)
ok(re.search(r'\{[^{}"]*\|[^{}"]*\|', plj) is None and "Blätter" in plj and "{Bl" not in plj,
   "bản gửi Gemini sửa / soát: bỏ chỗ tra từ của máy (cả câu hỏi / lựa chọn)")


def errs_after(lang: str, mutate) -> list[str]:
    raw = issue_with_story(lang)
    mutate(raw)
    f, _n = MODS[lang].autofix(raw, SCOPE[lang], OPTS)
    return MODS[lang].check(f, SCOPE[lang], OPTS).errors


for lang, bad_txt, what in (("de", "Heute war das 天気 den ganzen Tag klar.", "chữ Hán"),
                            ("de", "Heute war das Wetter てんき klar.", "kana"),
                            ("fr", "Aujourd'hui, il a fait 날씨 toute la journée.", "chữ Hàn"),
                            ("de", "Heute war das Wetter den ganzen Tag đẹp lắm.", "chữ Việt"),
                            ("fr", "Aujourd'hui, il a fait beau, trời đẹp quá.", "chữ Việt")):
    e = errs_after(lang, lambda r: r["bai"][0]["doan"].__setitem__(0, bad_txt))
    ok(bool(e), "%s: %s trong bài → lỗi%s" % (lang, what, (": " + e[0][:70]) if e else ""))
raw = issue_with_story("de")
raw["tu_moi"].append({"w": "der Regenschirm", "r": "", "m": "cái ô"})
ok(any("Regenschirm" in x for x in ai_de.check(raw, SCOPE["de"], OPTS).errors), "từ mới không có trong bài → lỗi khi kiểm tra")
f, n = ai_de.autofix(raw, SCOPE["de"], OPTS)
ok([w["w"] for w in f["tu_moi"]] == ["der Holzschuh"] and any("từ mới" in x for x in n) and not ai_de.check(f, SCOPE["de"], OPTS).errors,
   "… máy tự bỏ từ mới đó (không tốn lượt Gemini sửa), giữ từ mới có trong bài")
# Gemini thật 17/11: khai "die Blätter" là từ mới trong khi deck có "das Blatt, ¨-er" → bỏ, tra từ trỏ về das Blatt
raw = issue_with_story("de")
raw["tu_moi"].append({"w": "die Blätter", "r": "/ˈblɛtɐ/", "m": "những chiếc lá"})
f, n = ai_de.autofix(raw, SCOPE["de"], OPTS)
ok([w["w"] for w in f["tu_moi"]] == ["der Holzschuh"] and any("dạng biến đổi" in x for x in n)
   and "{Blätter||das Blatt}" in json.dumps(f["bai"], ensure_ascii=False),
   "từ mới chỉ là dạng biến đổi của từ trong deck (die Blätter ← das Blatt) → máy bỏ, tra từ trỏ về das Blatt")
raw = issue_with_story("fr")
raw["tu_moi"].append({"w": "les yeux", "r": "", "m": "đôi mắt"})
f, n = ai_fr.autofix(raw, SCOPE["fr"], OPTS)
ok([w["w"] for w in f["tu_moi"]] == ["le sabot"] and "{yeux||l'œil}" in json.dumps(f["bai"], ensure_ascii=False),
   "fr: « les yeux » khai là từ mới → bỏ (deck có l'œil)")
e = errs_after("fr", lambda r: r["cau_hoi"][0].__setitem__("dung", 7))
ok(any("dung" in x for x in e), "đáp án ngoài danh sách → lỗi")
raw = issue_with_story("fr")
raw["chinh_ta"] = [{"cau": "Je n'aime pas les carottes.", "them_dap_an": []}]
f, n = ai_fr.autofix(raw, SCOPE["fr"], OPTS)
ok(all(ai_eu.in_text(c["cau"], f, "fr") for c in f["chinh_ta"]) and len(f["chinh_ta"]) >= 2
   and ai_fr.check(f, SCOPE["fr"], OPTS).errors == [], "câu chép không có trong bài → máy chọn câu trong bài, 0 lỗi")
raw = issue_with_story("de")
raw["bai"][0]["doan"][0] = raw["bai"][0]["doan"][0].replace("Wetter", "**Wetter**")
f, n = ai_de.autofix(raw, SCOPE["de"], OPTS)
ok("**" not in json.dumps(f, ensure_ascii=False) and not ai_de.check(f, SCOPE["de"], OPTS).errors,
   "dấu Markdown ** Gemini lỡ viết → máy bỏ")

# =========================================================================================================================
print("== 4. cả quy trình viết báo (Gemini giả)")
MODELS = json.load(open(os.path.join(ROOT, "tests", "fixtures", "gemini_models_20261116.json"), encoding="utf-8"))["models"]


class Fake(ai.Gemini):
    def __init__(self, lang):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.lang = lang
        self.kinds: list[str] = []
        self.prompts: list[str] = []

    def models(self):
        return MODELS

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        self.prompts.append(system + "\n" + prompt)
        f = FIX[self.lang]
        if schema is S.RETELL_SCHEMA:
            self.kinds.append("ke_lai")
            out = dict(f["story"])
            out["nho"] = {"tom_tat": "Lin sợ khi nghe chuyện ma."}
            return json.dumps(out, ensure_ascii=False)
        if schema is ai.REVIEW_SCHEMA:
            self.kinds.append("soat")
            return json.dumps({"van_de": [], "bao": f["issue"]}, ensure_ascii=False)
        self.kinds.append("viet")
        return json.dumps(f["issue"], ensure_ascii=False)


MASTER = {"ky": 2, "thoi_tiet": "nắng", "tin": [{"tieu_de": "Lá đỏ", "noi_dung": "Lá đỏ đẹp."}],
          "truyen": {"tieu_de": "Lời kể lúc bình minh", "ky_truoc": "Lin nghe tiếng guốc gỗ ở giếng cổ.",
                     "doan": ["Đoạn 1.", "Đoạn 2.", "Đoạn 3."], "nho": {"tom_tat": "Lin sợ."}}}
for lang, typed_ok, typed_bad in (("de", "Naechste Woche gibt es ein Herbstfest", "Nächste Woche gibt es kein Herbstfest"),
                                  ("fr", "la semaine prochaine il y a une fete d'automne",
                                   "La semaine prochaine, il y a une fête d'hiver.")):
    base, shared = os.path.join(TMP, "bao_" + lang), os.path.join(TMP, "chung_" + lang)
    fake = Fake(lang)
    date = "2026-11-17"
    jopts = {"max_new": 3, "story": "hay", "tone": "am", "tones": ["am"], "story_base": shared, "master": copy.deepcopy(MASTER),
             "_master_log": []}
    res = ai.Job(fake, base, date, SCOPE[lang], jopts).run()
    ok(res.get("ok") and res.get("lang") == lang, "%s: Job chạy xong (lượt gọi: %s)%s" % (
        lang, ", ".join(fake.kinds), "" if res.get("ok") else " — " + str(res.get("error")) + " " + str(res.get("loi"))[:300]))
    ok(fake.kinds == ["ke_lai", "viet", "soat"], "%s: đúng 3 lượt gọi (kể lại, viết, soát) như báo tiếng Anh" % lang)
    allp = "\n".join(fake.prompts)
    ok(not re.search(r"[぀-ヿ]", allp.replace("ことば", "")) or lang == "xx",
       "%s: lời nhắc không có tên / chữ tiếng Nhật" % lang)
    lib = paper.Library(base, lang)
    try:
        iss = lib.issue(date)
    except Exception as err:      # noqa: BLE001
        iss = None
        ok(False, "%s: đọc số báo lỗi %r" % (lang, err))
    if iss:
        ok(iss["lang"] == lang and len(iss["bai"]) == 3 and iss["bai"][1]["loai"] == "truyen", "%s: số báo 3 bài, có truyện" % lang)
        view = paper.issue_view(lib, paper.empty_state(), date)
        tu = view.get("tu") or {}
        ok(len(tu) >= 8, "%s: ô tra từ có %d từ" % (lang, len(tu)))
        cau = iss["chinh_ta"][0]["cau"]
        ok(paper.matches(cau, [], [paper.surface(cau)], lang=lang), "%s: chép đúng nguyên câu → đúng" % lang)
        ok(paper.matches(cau, [], [typed_ok], lang=lang), "%s: gõ không dấu / thiếu dấu câu (%s) → đúng" % (lang, typed_ok))
        ok(not paper.matches(cau, [], [typed_bad], lang=lang), "%s: sai một từ → chưa đúng" % lang)
        ok(paper.dict_len(cau, lang)[1] == "từ", "%s: độ dài câu chép đếm theo từ" % lang)
        sp = paper.speech_text(iss["bai"][0]["doan"][0], lang)
        ok("{" not in sp and "|" not in sp and len(sp) > 20, "%s: giọng đọc đọc chữ trơn (không đọc dấu tra từ)" % lang)
    else:
        results.extend([False] * 7)

# =========================================================================================================================
print("== 5. lời nhắc")
d = datetime.date(2026, 11, 17)
for lang, mod in MODS.items():
    sc = SCOPE[lang]
    prs = [mod.system_prompt("A2"),
           mod.write_prompt(sc, {"so": 1, "ky": 2, "max_new": 3}, [], [], d),
           mod.write_prompt(sc, {"so": 3, "ky": 2, "short": True, "story_plain": {"tieu_de": "T", "doan": ["a"]},
                                 "tin_goc": [{"tieu_de": "A", "noi_dung": "B"}]}, [], [], d),
           mod.write_prompt(sc, {"so": 4, "ky": 2, "story_goc": MASTER["truyen"]}, [], [], d),
           mod.repair_prompt(FIXED[lang], ["lỗi thử"], sc),
           mod.review_prompt(FIXED[lang], sc, ["cảnh báo thử"])]
    pr = "\n".join(prs)
    leaks = [x for x in ("@", "phiên âm IPA dạng /.../, m", "tiếng Anh", "Kotoba Village", "Garden Gazette", "Kotoba Inn", "Cambridge", "Oxford")
             if x in pr]
    ok(not leaks, "%s: không sót chữ của báo tiếng Anh / chỗ trống%s" % (lang, (" — " + str(leaks)) if leaks else ""))
    ok(mod.MASTHEAD in pr and ("Goethe" if lang == "de" else "DELF") in pr and "A2" in pr,
       "%s: lời nhắc có tên báo, khung thi (%s), trình độ" % (lang, "Goethe" if lang == "de" else "DELF"))
    ok(("tiếng Đức" if lang == "de" else "tiếng Pháp") in pr, "%s: lời nhắc nói đúng tên tiếng" % lang)
rp = S.retell_prompt("de", SCOPE["de"], MASTER["truyen"]) if S.retell_prompt.__code__.co_argcount >= 3 else ""
ok("Bürgermeister" in rp and "Gasthaus" in rp and "リン" not in rp and "Mayor" not in rp,
   "kể lại tiếng Đức: tên nhân vật cột tiếng Đức (der Bürgermeister, das Gasthaus Kotoba)")
rp = S.retell_prompt("fr", SCOPE["fr"], MASTER["truyen"])
ok("maire" in rp and "auberge" in rp and "リン" not in rp and "Mayor" not in rp, "kể lại tiếng Pháp: le maire, l'auberge Kotoba")
ok(len(S.NAMES[0]) == 7 and S.NAME_COL["de"] == 5 and S.NAME_COL["fr"] == 6 and all(len(r) == 7 for r in S.NAMES),
   "bảng tên nhân vật đủ 7 cột (ja, en, zh, ko, de, fr)")

# =========================================================================================================================
print("== 6. story_core")
for lang in ("de", "fr"):
    st = copy.deepcopy(FIX[lang]["story"])
    st["nho"] = {"tom_tat": "Lin sợ."}
    errs, warns = S.check_story(st, lang, "A2")
    ok(not errs, "%s: truyện mẫu 0 lỗi%s" % (lang, (" — " + "; ".join(errs[:3])) if errs else ""))
    st2 = copy.deepcopy(st)
    st2["doan"][0] = st2["doan"][0] + " 雨が降りました。"
    ok(any("Nhật" in x for x in S.check_story(st2, lang, "A2")[0]), "%s: lẫn chữ Nhật → lỗi" % lang)
    st3 = copy.deepcopy(st)
    st3["doan"][1] = "Lin sợ đến mức tay cứ run mãi, chị Hana không nói gì cả, chỉ rót trà ấm mời trưởng làng uống thôi."
    ok(any("tiếng Việt" in x for x in S.check_story(st3, lang, "A2")[0]), "%s: đoạn tiếng Việt → lỗi" % lang)
if hasattr(S, "text_lang"):
    got = [S.text_lang(FIX["de"]["story"]["doan"][1]), S.text_lang(FIX["fr"]["story"]["doan"][1]),
           S.text_lang("The mayor sat down slowly and drank his tea."), S.text_lang(FIX["de"]["story"]["dich"][1])]
    ok(got == ["de", "fr", "en", "vi"], "đoán tiếng của bản truyện: %s" % got)

# =========================================================================================================================
print("== 7. paper_core")
cases = [(["de", "fr"], ["de", "fr"]), (["ja", "de", "fr"], ["ja", "de"]), (["fr", "vi"], ["fr"]), (["vi"], ["vi"]),
         (["de", "de", "zh"], ["zh", "de"]), (["es", "fr"], ["fr"]), ("de", [])]
bad = [(a, paper.clean_paper_langs(a)) for a, b in cases if paper.clean_paper_langs(a) != b]
ok(not bad, "tối đa 2 báo trong Nhật / Anh / Trung / Hàn / Đức / Pháp%s" % ((" — sai: %s" % bad) if bad else ""))
ok(paper.PAPER_KEY_DE == "kotoba_batake_paper_de" and paper.PAPER_KEY_FR == "kotoba_batake_paper_fr"
   and {"de", "fr"} <= set(paper.LEARN_LANGS) and {"de", "fr"} <= set(paper.ISSUE_LANGS), "khoá báo + danh sách tiếng")
ok("tts_de" in paper.MACHINE_HOW and "tts_fr" in paper.MACHINE_HOW and "tts_de" in paper.VOICE_LABEL,
   "giọng máy tiếng Đức / Pháp (tts_de / tts_fr) cho câu không có audio")
ok(paper.dict_len("{Nächste|Nächste|nächst} Woche gibt es ein Herbstfest.", "de") == (6, "từ")
   and paper.dict_len("L'école d'Hana est là.", "fr")[0] == 6, "độ dài câu chép: đếm từ (tiếng Pháp tách l' / d')")

# =========================================================================================================================
print("== 8. Ngôn ngữ trong vườn: bảng EU")
TABLES = {"acts": L.ACTS, "finds": L.FINDS, "guests": L.GUESTS, "decor": L.DECOR, "seasons": L.SEASONS, "titles": L.TITLES,
          "say": L.SAY}
for lang in ("de", "fr"):
    miss = {k: sorted(set(t) - set(L.EU[lang].get(k, {}))) for k, t in TABLES.items()}
    extra = {k: sorted(set(L.EU[lang].get(k, {})) - set(t)) for k, t in TABLES.items()}
    miss = {k: v for k, v in miss.items() if v}
    extra = {k: v for k, v in extra.items() if v}
    ok(not miss and not extra, "%s: đủ mục như bảng gốc (%d mục)%s" % (
        lang, sum(len(L.EU[lang][k]) for k in TABLES), (" — thiếu %s, thừa %s" % (miss, extra)) if miss or extra else ""))
    empty = [(k, i) for k in TABLES for i, v in L.EU[lang][k].items() if not v.strip()]
    jp = [(k, i, v) for k in TABLES for i, v in L.EU[lang][k].items() if re.search(r"[぀-ヿ一-鿿]", v)]
    ok(not empty and not jp, "%s: không mục rỗng, không chữ Nhật%s" % (lang, (" — %s %s" % (empty[:3], jp[:3])) if empty or jp else ""))
    ok(all(lang in g for g in L.GAMES.values()) and L.ASK[lang] and all("%s" in a for a in L.ASK[lang])
       and set(L.TAGS[lang]) == set(L.TAGS["en"]) and all(v.get(lang) for v in L.VI_SUB.values()),
       "%s: tên trò chơi, câu Chợ sáng (có chỗ %%s), nhãn Lật cặp, câu kèm tiếng Việt" % lang)
b = L.bundle()
ok(b["eu"] is L.EU and "de" in b["choices"] and "fr" in b["choices"], "bảng gửi trang có EU + lựa chọn de / fr")
ok(L.item(L.ACTS, "neru", "de") == ("schlafen", "") and L.item(L.GUESTS, "suzume", "fr")[0] != ""
   and L.item(L.ACTS, "khong_co", "de") == ("", ""), "item(): de / fr lấy ở EU, mục lạ → rỗng")

# Chính tả: bảng đóng băng do tests/tools/soat_chu_135.py sinh bằng hunspell de_DE / fr
REF = json.load(open(os.path.join(ROOT, "tests", "fixtures", "chu_135_ref.json"), encoding="utf-8"))
WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœß]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿŒœß]+)*")


def all_words(lang: str) -> list[str]:
    out = set()
    for tb in L.EU[lang].values():
        for v in tb.values():
            out.update(WORD.findall(v))
    for g in L.GAMES.values():
        out.update(WORD.findall(g[lang]))
    for a in L.ASK[lang]:
        out.update(WORD.findall(a))
    return sorted(out)


# Từ hunspell không có — mỗi từ một lý do (từ ghép đúng của tiếng Đức, thán từ, từ mượn tiếng Nhật, tên riêng)
NGOAI_LE = {
    "de": {"Bambussprosse": "từ ghép (Bambus + Sprosse)", "Bambussprossen": "số nhiều của từ ghép trên",
           "Fischgrätparkett": "từ ghép (sàn gỗ xương cá)", "Hehe": "thán từ", "Hm": "thán từ", "Hä": "thán từ",
           "Juhu": "thán từ", "Kiefernzapfen": "từ ghép (quả thông)", "Kois": "số nhiều của Koi (cá koi)",
           "Kotatsu": "từ mượn tiếng Nhật", "Kotoba": "tên làng", "Mandschurenkranich": "tên loài (sếu đầu đỏ)",
           "Meerglas": "từ ghép (thuỷ tinh biển)", "Memory": "tên trò chơi lật cặp ở Đức", "Mooskugel": "từ ghép (bóng rêu)",
           "Onsen-Ei": "từ mượn (trứng onsen)", "Orakelzettel": "từ ghép (quẻ omikuji)", "Shoji-Wand": "từ mượn (vách shoji)",
           "Sikahirsch": "tên loài (hươu sika)", "Silberreiher": "tên loài (cò ngàng lớn)", "Snack": "từ mượn, Duden có",
           "Taiko-Trommel": "từ mượn (trống taiko)", "Takoyaki": "món ăn Nhật", "Tanabata": "lễ hội Nhật",
           "Tatami-Matten": "từ mượn (chiếu tatami)", "Wow": "thán từ", "Wunschtäfelchen": "từ ghép (thẻ ước ema)",
           "Yuzu": "tên quả", "Zikadenhülle": "từ ghép (xác ve sầu)", "streunende": "phân từ của streunen (Duden có)"},
    "fr": {"Hihi": "thán từ", "Kotoba": "tên làng", "Tanabata": "lễ hội Nhật", "kotatsu": "từ mượn tiếng Nhật",
           "shoji": "từ mượn tiếng Nhật", "sika": "tên loài (cerf sika)", "taiko": "từ mượn tiếng Nhật",
           "takoyaki": "món ăn Nhật", "zostérops": "tên loài (chim vành khuyên)"},
}
for lang in ("de", "fr"):
    ws = all_words(lang)
    frozen = sorted(set(REF[lang]["ok"]) | set(REF[lang]["unknown"]))
    ok(ws == frozen, "%s: chữ trong bảng = bảng đã soát bằng hunspell (%d từ)%s" % (
        lang, len(ws), "" if ws == frozen else " — đổi chữ thì chạy lại tests/tools/soat_chu_135.py: mới %s, bỏ %s"
        % (sorted(set(ws) - set(frozen))[:6], sorted(set(frozen) - set(ws))[:6])))
    nore = sorted(set(REF[lang]["unknown"]) - set(NGOAI_LE[lang]))
    ok(not nore, "%s: %d từ từ điển không có — từ nào cũng có lý do (từ ghép, thán từ, từ mượn)%s" % (
        lang, len(REF[lang]["unknown"]), (" — chưa có lý do: %s" % nore) if nore else ""))

# =========================================================================================================================
print("== 9. trang (node test_135.js)")
jf = os.path.join(TMP, "in135.json")
json.dump({"bundle": L.bundle()}, open(jf, "w", encoding="utf-8"), ensure_ascii=False)
r = subprocess.run(["node", os.path.join(HERE, "test_135.js"), ADDON, jf], capture_output=True, text=True)
print("\n".join("  " + x for x in r.stdout.strip().splitlines()))
if r.returncode:
    print(r.stderr[-2000:])
ok(r.returncode == 0, "core/test_135.js đạt hết")

# =========================================================================================================================
print("== 10. hợp đồng dữ liệu")


def coll_keys(folder: str) -> set[str]:
    out: set[str] = set()
    for f in glob.glob(os.path.join(folder, "*.py")):
        out |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', open(f, encoding="utf-8").read()))
    return out


rel = old_tree("e64eb22")
nk, rk = coll_keys(ADDON), coll_keys(rel)
ok(not (rk - nk), "không bỏ khoá collection nào của bản đã phát hành 1.31.3")
if "1.34.1" in OLD:
    prev = os.path.join(TMP, "fc9b1e5", "kotoba_batake")
    pk_ = coll_keys(prev)
    ok(sorted(nk - pk_) == ["kotoba_batake_paper_de", "kotoba_batake_paper_fr"] and not (pk_ - nk),
       "so với 1.34.1: chỉ thêm kotoba_batake_paper_de / _fr (%s)" % sorted(nk ^ pk_))
    c_new = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
    c_old = json.load(open(os.path.join(prev, "config.json"), encoding="utf-8"))
    ok(c_new == c_old, "config.json giống hệt 1.34.1 (gemini_level_de / _fr chỉ ghi khi đổi trình độ)")
cm = open(os.path.join(ADDON, "config.md"), encoding="utf-8").read()
ok("gemini_level_de" in cm and "gemini_level_fr" in cm, "config.md ghi gemini_level_de / _fr")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
ok('cfg.get("gemini_level_de") if cfg.get("gemini_level_de") in ai_de.LEVELS else ai_de.DEFAULT_LEVEL' in init
   and 'changes["gemini_level_" + lv_lang] = p["level"]' in init, "trình độ báo de / fr: mặc định A2, lưu khi đổi")
ok("if p.get(\"level\") in ai_en.LEVELS and lv_lang in (None, \"en\"):" in init,
   "đổi trình độ báo Đức / Pháp không đổi trình độ báo tiếng Anh (cùng A1–C1)")
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(str(man.get("human_version", "")).startswith("1.35"), "manifest: %s" % man.get("human_version"))

print("KẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
