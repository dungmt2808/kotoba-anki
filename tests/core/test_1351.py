"""1.35.1 — kiểm tra lại 1.35 (người dùng 17/11: "kiểm tra lại thật kỹ logic, giao diện, tính năng … các ngôn ngữ mới được
thêm vào (Trung, Hàn, Pháp, Đức) thì mọi thứ đã viết tự nhiên chưa … logic ngôn ngữ, xem nó đã bao gồm hầu hết các trường
hợp chưa … mất dữ liệu (trang trí thử, …)"). Kịch bản ngoài bộ test có sẵn — mỗi mục là một lỗi tìm thấy ở 1.35.0:

1. Tiếng Đức — hoa / thường: "der Morgen" (buổi sáng) không nối "morgen" (ngày mai); "arm" (nghèo) không nối "der Arm";
   đầu câu vẫn nối. Động từ tách / không tách + bất quy tắc (aufgestanden, kennengelernt, umgezogen, stattgefunden,
   mitgenommen, bekam, gefällt), động từ mạnh còn thiếu (gegossen, angefangen), Präteritum -ete, so sánh (älter, kälteste,
   besser, größte). "die Mutter, ¨" không sinh cách viết "¨".
2. Tiếng Pháp — từ đồng hình khác nghĩa: "le lit" không nối "il lit", "la porte" không nối "elle porte", "l'été" không nối
   "a été", "porter" không nối "la porte"; đại từ tân ngữ (je la porte) / nguyên mẫu (je vais le faire) vẫn nối. Danh từ có
   mạo từ không chia như động từ (le papier → papiers, le soir ≠ soit / sois), danh từ ghi không mạo từ có số nhiều
   (livres, fenêtres, autres), e / é → è (lève, répète), động từ có tiền tố (devenu, obtenu, permis), nhóm 2 (finissais),
   nháy cong (aujourd’hui, d’accord).
3. Nối tra từ của báo (ai_eu.find_links) cùng luật với eu_core.find_word; 3.000 câu ngẫu nhiên: không lỗi, không chồng,
   chỗ nối luôn ở ranh giới chữ, luôn là một dạng của từ gốc.
4. Đoán ngôn ngữ deck: tiếng Ý / Tây Ban Nha không dấu, Phần Lan, Estonia, Hà Lan, Thổ Nhĩ Kỳ → "Ngôn ngữ khác" (1.35.0:
   Pháp / Đức / Anh); deck Đức / Pháp thật vẫn đúng.
5. Tiếng Trung: từ một chữ của deck (家, 天, 生) không nối vào giữa từ Gemini đã đánh dấu (大家, 今天, 学生); chữ hư / số
   ([不好], [一天]) và cụm dài ([今天天气]) vẫn nối.
6. Tiếng Hàn: 쉬어요 (쉬다), 되어요 (되다), 도와줘요 (돕다), 마셔 봐요; không nối nhầm 해가 (하다), 와인 (오다), 가게 (가다).
7. Trang trí thử — mất dữ liệu: file bản thử hỏng → giữ lại `.hong` rồi mới ghi; file không đọc được → không ghi đè (bản
   thử các cảnh khác còn nguyên); lệnh bản thử (get / put / pick) chạy được lúc Anki đang đồng bộ (trước: bị bỏ, đóng vườn
   là mất lần sửa), lệnh khác vẫn bị chặn + báo một câu; "Dùng bản này" vẫn bị chặn lúc đồng bộ.
8. Giao diện (soát mã): "Như cảnh thật" hỏi trước khi bỏ bản thử đã khác cảnh thật; lệnh bản thử lỗi không đọc lại liên tục.
9. Câu chữ: các câu đã sửa (Nanu? / Courage ! / 창밖을 보다…), Đuổi quạ nhận động từ phản thân không cần sich / se (node).
10. Hợp đồng dữ liệu: không thêm khoá collection / mục config.json so với 1.35.0.

Chạy: python test_1351.py ADDON   (cần gói anki — ANKI_PY — cho mục 7)
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
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
    HAVE_ANKI = True
except ImportError:
    HAVE_ANKI = False
    sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))
import ai_eu  # noqa: E402
import ai_zh  # noqa: E402
import eu_core as E  # noqa: E402
import fields_core as F  # noqa: E402
import ko_core as K  # noqa: E402
import lang_core as L  # noqa: E402

PASS = FAIL = 0


def ok(cond, msg):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  ✓", msg)
    else:
        FAIL += 1
        print("  ✗", msg)


def found(s, w, lang):
    sp = E.find_word(s, w, lang)
    return s[sp[0]:sp[1]] if sp else None


def links(s, w, lang):
    return [s[a:b] for a, b, _ in ai_eu.find_links(s, [w], lang)]


def check_cases(title, cases):
    """(lang, câu, từ deck, chữ phải tìm thấy | None) — find_word và nối tra từ của báo phải cùng kết quả."""
    bad = []
    for lang, s, w, want in cases:
        got, ln = found(s, w, lang), links(s, w, lang)
        good = (got is None and want is None and not ln) or (want is not None and got is not None and
                                                              want.lower() in got.lower() and got in ln)
        if not good:
            bad.append("%s ‹%s› → find %r, nối %r (cần %r)" % (w, s, got, ln, want))
    ok(not bad, "%s: %d ca%s" % (title, len(cases), (" — sai: " + "; ".join(bad[:3])) if bad else ""))


# =========================================================================================================================
print("== 1. Tiếng Đức: hoa / thường, động từ tách + bất quy tắc, so sánh")
check_cases("hoa / thường (danh từ ≠ trạng từ / tính từ cùng chữ)", [
    ("de", "Wir sehen uns morgen.", "der Morgen", None),
    ("de", "Am Morgen trinke ich Kaffee.", "der Morgen", "Morgen"),
    ("de", "Am Morgen trinke ich Kaffee.", "morgen", None),
    ("de", "Morgen fahren wir nach Berlin.", "morgen", "Morgen"),          # đầu câu: chữ hoa vẫn là "morgen"
    ("de", "Mein Arm tut weh.", "arm", None),
    ("de", "Ich bin heute arm.", "arm", "arm"),
    ("de", "„Arm bin ich nicht“, sagt er.", "arm", "Arm"),                # sau dấu mở ngoặc kép
    ("de", "Das Essen ist fertig.", "essen", None),
    ("de", "Essen ist fertig.", "essen", "Essen"),
    ("de", "Die Kinder spielen.", "das Kind, -er", "Kinder"),
    ("de", "DIE KINDER SPIELEN.", "das Kind, -er", "KINDER"),
    ("de", "Die Mütter warten.", "die Mutter, ¨", "Mütter"),
])
check_cases("động từ tách / không tách + bất quy tắc, động từ mạnh, Präteritum -ete", [
    ("de", "Er ist um acht Uhr aufgestanden.", "aufstehen", "aufgestanden"),
    ("de", "Wir haben uns gestern kennengelernt.", "kennenlernen", "kennengelernt"),
    ("de", "Sie ist letztes Jahr umgezogen.", "umziehen", "umgezogen"),
    ("de", "Das Fest hat gestern stattgefunden.", "stattfinden", "stattgefunden"),
    ("de", "Er hat das Buch mitgenommen.", "mitnehmen", "mitgenommen"),
    ("de", "Sie hat einen Mantel angezogen.", "anziehen", "angezogen"),
    ("de", "Als er aufstand, regnete es.", "aufstehen", "aufstand"),
    ("de", "Er bekam einen Brief.", "bekommen", "bekam"),
    ("de", "Das Bild gefällt mir.", "gefallen", "gefällt"),
    ("de", "Sie verließ das Haus.", "verlassen", "verließ"),
    ("de", "Er hat die Blumen gegossen.", "gießen", "gegossen"),
    ("de", "Wir haben angefangen.", "anfangen", "angefangen"),
    ("de", "Er hat uns eingeladen.", "einladen", "eingeladen"),
    ("de", "Er arbeitete viel.", "arbeiten", "arbeitete"),
    ("de", "Das hat er mir empfohlen.", "empfehlen", "empfohlen"),
    ("de", "Ich verstehe das nicht.", "stehen", None),                     # không tách khỏi tiền tố
    ("de", "Ich habe ein Geschenk bekommen.", "kommen", None),
    ("de", "Das Rathaus ist groß.", "das Haus", None),
])
check_cases("so sánh hơn / nhất (umlaut, bất quy tắc)", [
    ("de", "Mein Bruder ist älter als ich.", "alt", "älter"),
    ("de", "Das ist der kälteste Tag.", "kalt", "kälteste"),
    ("de", "Sie ist jünger als ich.", "jung", "jünger"),
    ("de", "Heute ist es wärmer.", "warm", "wärmer"),
    ("de", "Das ist die größte Stadt.", "groß", "größte"),
    ("de", "Das Essen war besser als gestern.", "gut", "besser"),
    ("de", "Er hat das beste Bild gemalt.", "gut", "beste"),
    ("de", "Der Berg ist höher.", "hoch", "höher"),
    ("de", "Das ist ein kleineres Haus.", "klein", "kleineres"),
])
ok(E.alternatives("die Mutter, ¨", "de") == ["die Mutter", "Mutter"] and E.alternatives("der Vater, ¨-", "de")
   == ["der Vater", "Vater"], "số nhiều chỉ đổi umlaut (\"die Mutter, ¨\") không thành một cách viết \"¨\"")
GEN = [("der Hund, -(e)s, -e", "Die Hunde bellen.", "Hunde"), ("der Name, -ns, -n", "Wie ist dein Name?", "Name"),
       ("die Frau, -, -en", "Die Frauen lachen.", "Frauen"), ("das Kind, -(e)s, -er", "Das Kind spielt.", "Kind")]
bad = [(w, E.alternatives(w, "de"), found(s, w, "de")) for w, s, want in GEN
       if E.alternatives(w, "de")[:2] != [w.split(",")[0], w.split(",")[0].split()[1]] or want not in (found(s, w, "de") or "")]
ok(not bad, "ký hiệu từ điển sở hữu cách + số nhiều (\"der Hund, -(e)s, -e\", \"die Frau, -, -en\") → der Hund / Hund "
   "(1.35.0: \"Hund -e\", không nối được)%s" % ((" — sai: %s" % bad[:2]) if bad else ""))
ok(ai_eu.deck_word("der Hund, -(e)s, -e", "de") == "der Hund", "từ gốc khi tra từ của báo: \"der Hund\" (không phải \"der Hund -e\")")

# =========================================================================================================================
print("== 2. Tiếng Pháp: từ đồng hình, danh từ / động từ, số nhiều, e → è, tiền tố, nháy cong")
check_cases("từ đồng hình khác nghĩa", [
    ("fr", "Il lit un livre.", "le lit", None),
    ("fr", "Il lit un livre dans son lit.", "le lit", "lit"),
    ("fr", "Il lit un livre.", "lire", "lit"),
    ("fr", "Le lit est grand.", "lire", None),
    ("fr", "Elle porte une robe.", "la porte", None),
    ("fr", "Elle ouvre la porte.", "la porte", "porte"),
    ("fr", "Elle ouvre la porte.", "porter", None),
    ("fr", "Je la porte tous les jours.", "porter", "porte"),             # đại từ tân ngữ
    ("fr", "Je vais le faire demain.", "faire", "faire"),                 # nguyên mẫu sau le
    ("fr", "Il fait beau.", "le fait", None),
    ("fr", "Je bois du thé.", "le bois", None),
    ("fr", "La maison est en bois.", "le bois", "bois"),
    ("fr", "Je bois du thé.", "boire", "bois"),
    ("fr", "Il a été content.", "l'été", None),
    ("fr", "Il n'a jamais été là.", "l'été", None),
    ("fr", "Cet été, il fait chaud.", "l'été", "été"),
    ("fr", "L'été a été chaud.", "l'été", "été"),
    ("fr", "Elle est médecin.", "le médecin", "médecin"),                 # nghề sau être (không mạo từ) vẫn nối
    ("fr", "Il a faim.", "la faim", "faim"),
    ("fr", "Je l'aime beaucoup.", "aimer", "aime"),
    ("fr", "Le dîner est prêt.", "dîner", "dîner"),
    ("fr", "Il doit partir.", "le devoir", None),
    ("fr", "Les enfants finissent leurs devoirs.", "le devoir", "devoirs"),
])
check_cases("danh từ / số nhiều / chia động từ", [
    ("fr", "Je n'ai plus de papiers.", "le papier", "papiers"),
    ("fr", "Les cahiers sont sur la table.", "le cahier", "cahiers"),
    ("fr", "Les soirs d'été sont longs.", "le soir", "soirs"),
    ("fr", "Soit, il est venu.", "le soir", None),
    ("fr", "Sois sage !", "soir (m)", None),
    ("fr", "J'ai trois livres.", "livre", "livres"),
    ("fr", "Les fenêtres sont ouvertes.", "fenêtre", "fenêtres"),
    ("fr", "Les autres enfants jouent.", "autre", "autres"),
    ("fr", "Les journaux sont là.", "le journal", "journaux"),
    ("fr", "Je me lève tôt.", "se lever", "lève"),
    ("fr", "Il répète la phrase.", "répéter", "répète"),
    ("fr", "Elle achètera du pain.", "acheter", "achètera"),
    ("fr", "Il est devenu médecin.", "devenir", "devenu"),
    ("fr", "Elle a obtenu son diplôme.", "obtenir", "obtenu"),
    ("fr", "Il m'a permis de sortir.", "permettre", "permis"),
    ("fr", "Elle décrit la maison.", "décrire", "décrit"),
    ("fr", "Je reconnais cette voix.", "reconnaître", "reconnais"),
    ("fr", "Je finissais mes devoirs.", "finir", "finissais"),
    ("fr", "Ils parleraient demain.", "parler", "parleraient"),
    ("fr", "Elle se sent bien.", "se sentir", "sent"),
    ("fr", "Il faut que j'aille au marché.", "aller", "aille"),
    ("fr", "Ils construisent une maison.", "construire", "construisent"),
    ("fr", "C'est le meilleur gâteau.", "bon", "meilleur"),
    ("fr", "Il peut venir.", "pouvoir", "peut"),
    ("fr", "Il veut voir la mer.", "voir", "voir"),
])
check_cases("nháy cong (Gemini / bộ gõ viết ’)", [
    ("fr", "Aujourd’hui, il pleut.", "aujourd'hui", "Aujourd’hui"),
    ("fr", "D’accord, on y va.", "d'accord", "D’accord"),
    ("fr", "L’école est fermée.", "l'école", "école"),
])
ok(E.find_word("Je peux venir.", "voir", "fr") is None and E.find_word("Il sait tout.", "voir", "fr") is None,
   "\"voir\" không nhận pouvoir / savoir (tiền tố của voir chỉ re- / pré- / entre-)")

# =========================================================================================================================
print("== 3. Nối tra từ của báo = luật của eu_core; 3.000 câu ngẫu nhiên")
random.seed(int(os.environ.get("KB_SEED", "1351")))
DECK = {"de": ["der Morgen", "morgen", "arm", "der Arm", "aufstehen", "gehen", "das Haus, ¨-er", "das Kind, -er", "gut",
               "alt", "kennenlernen", "sich freuen", "die Stadt, ¨-e", "essen", "das Essen", "anrufen", "groß"],
        "fr": ["le lit", "lire", "la porte", "porter", "l'été", "le papier", "le soir", "livre", "se lever", "devenir",
               "faire", "le fait", "boire", "le bois", "aujourd'hui", "finir", "bon", "l'école"]}
FILL = {"de": ["und", "sehr", "heute", "Ich", "Wir", "die", "der", "nicht", "im", "Garten", "schnell", ",", ".", "„", "“"],
        "fr": ["et", "très", "il", "elle", "je", "la", "le", "les", "un", "ne", "pas", ",", ".", "«", "»", "’", "l'"]}
problems = []
for _ in range(3000):
    lang = random.choice(("de", "fr"))
    toks = []
    for _k in range(random.randint(2, 14)):
        if random.random() < 0.45:
            w = random.choice(DECK[lang])
            fs = E.forms(w, lang)
            toks.append(random.choice(fs) if fs else w)
        else:
            toks.append(random.choice(FILL[lang]))
        if random.random() < 0.1:
            toks[-1] = toks[-1].upper() if random.random() < 0.5 else toks[-1].capitalize()
    s = " ".join(toks)
    try:
        got = ai_eu.find_links(s, DECK[lang], lang)
    except Exception as err:          # noqa: BLE001
        problems.append("lỗi %s: %r" % (type(err).__name__, s))
        continue
    end = -1
    for a, b, w in got:
        seg = s[a:b]
        if a < end:
            problems.append("chồng: %r" % s)
        end = b
        if (a > 0 and re.match(r"[%s]" % E.LETTERS, s[a - 1])) or (b < len(s) and re.match(r"[%s]" % E.LETTERS, s[b])):
            problems.append("cắt giữa chữ: %r trong %r" % (seg, s))
        norm = lambda x: re.sub(r"\s+", " ", x.replace("’", "'")).lower()      # noqa: E731
        if norm(seg) not in {norm(f) for f in E.forms(w, lang)}:
            problems.append("không phải dạng của %s: %r" % (w, seg))
        if not hasattr(E, "context_ok"):
            problems.append("không có eu_core.context_ok (mã trước 1.35.1)")
        elif not E.context_ok(s, a, b, w, lang):
            problems.append("sai ngữ cảnh: %r → %s" % (seg, w))
ok(not problems, "3.000 câu: không lỗi, không chồng, không cắt giữa chữ, chỗ nối là một dạng của từ gốc, đúng ngữ cảnh%s"
   % ((" — " + "; ".join(problems[:3])) if problems else ""))
# chép chính tả vẫn tách từ như cũ (không đổi ở 1.35.1)
ok(E.words("L’école d’Hana, c’est là-bas !", "fr") == ["l'", "école", "d'", "hana", "c'", "est", "là", "bas"],
   "chép chính tả tiếng Pháp: nháy cong tách như nháy thẳng")

# =========================================================================================================================
print("== 4. Đoán ngôn ngữ deck (loại note chưa cấu hình)")
DECKS = {
    "other": {
        "Ý không dấu": ["la casa", "il cane", "l'acqua", "lo zaino", "gli amici", "la mela", "il libro", "una sedia", "l'albero",
                        "la finestra", "il gatto", "perché", "città", "caffè", "la scuola", "il treno", "la strada", "un uomo"],
        "Ý chỉ il / la / l'": ["il cane", "il gatto", "la casa", "l'acqua", "il libro", "la mela", "il giorno", "la notte",
                               "il mare", "la città", "il tempo", "la ragazza", "il ragazzo", "la sera", "il pane", "un amico"],
        "Tây Ban Nha không dấu": ["el perro", "la mesa", "la casa", "el gato", "los libros", "las flores", "una silla",
                                  "el agua", "la puerta", "el coche", "la calle", "un hombre", "la mujer", "el chico"],
        "Phần Lan": ["äiti", "isä", "tyttö", "poika", "hyvää", "kiitos", "päivä", "yö", "kesä", "talvi", "järvi", "metsä",
                     "koira", "kissa", "kävellä", "syödä", "juoda", "lähteä", "tänään", "huomenna"],
        "Estonia": ["ema", "isa", "tüdruk", "poiss", "õun", "päev", "öö", "suvi", "talv", "järv", "mets", "koer", "kass",
                    "jõgi", "süüa", "juua", "täna", "homme", "tänan"],
        "Hà Lan": ["de hond", "het huis", "de kat", "een boek", "de tafel", "het water", "de straat", "een man", "de vrouw",
                   "het kind", "de school", "de trein", "de appel", "de boom", "het raam", "de deur", "de fiets", "ijs"],
        "Thổ Nhĩ Kỳ": ["çocuk", "güzel", "öğretmen", "kitap", "ev", "su", "çay", "üç", "bir", "iki", "gün", "gece", "köpek",
                       "kedi", "okul", "araba", "kapı", "pencere", "çiçek", "ağaç"],
    },
    "de": {"Đức": ["der Hund", "die Katze", "das Haus", "gehen", "schön", "der Tisch", "die Tür", "das Fenster", "essen",
                   "trinken", "groß", "klein", "die Straße", "der Zug", "die Schule", "der Apfel", "der Baum", "die Sonne"],
           "Đức (động từ)": ["gehen", "kommen", "fahren", "schlafen", "hören", "sprechen", "lesen", "schreiben", "spielen",
                             "kaufen", "zählen", "müssen", "können", "möchten", "öffnen", "grüßen"]},
    "fr": {"Pháp": ["le chien", "la maison", "le chat", "un livre", "la table", "l'eau", "la rue", "un homme", "la femme",
                    "l'enfant", "l'école", "le train", "la pomme", "l'arbre", "la fenêtre", "la porte", "la chaise"],
           "Pháp (câu có il …)": ["il pleut", "il fait beau", "il y a", "le matin", "la nuit", "un ami", "le chat",
                                  "la voiture", "le pain", "un café", "la ville", "le jour", "la mer", "le temps",
                                  "la fille", "le garçon", "il faut", "le soir", "la plage"]},
    "en": {"Anh": ["dog", "house", "cat", "book", "table", "water", "street", "man", "woman", "child", "school", "train",
                   "apple", "tree", "window", "door", "chair", "bike", "sun", "moon"]},
}
bad = []
for want, group in DECKS.items():
    for name, ws in group.items():
        got = F.guess_lang("Basic", ["Front", "Back"], ws)
        if got != want:
            bad.append("%s → %s (cần %s)" % (name, got, want))
ok(not bad, "%d kiểu deck đoán đúng ngôn ngữ (Ý / Tây Ban Nha / Phần Lan / Estonia / Hà Lan / Thổ Nhĩ Kỳ → Ngôn ngữ khác)%s"
   % (sum(len(g) for g in DECKS.values()), (" — sai: " + "; ".join(bad)) if bad else ""))
ok(F.guess_lang("German", ["Front", "Back"], DECKS["other"]["Phần Lan"]) == "de"
   and F.guess_lang("Italiano", ["Front", "Back"], DECKS["fr"]["Pháp"]) == "fr",
   "tên loại note vẫn thắng (\"German\" → Đức); chữ Pháp rõ ràng thắng tên \"Italiano\" lạc chỗ")


# =========================================================================================================================
print("== 5. Tiếng Trung: từ một chữ không nối vào giữa từ ghép Gemini đánh dấu")


def zl(markup, deck):
    cs, _p = ai_zh.chars(markup)
    text = "".join(c for c, _s in cs)
    if not hasattr(ai_zh, "word_groups"):          # mã trước 1.35.1: không có ranh giới từ
        return [(text[a:b], a) for a, b, _w in ai_zh.find_links(text, deck, set(), [0])]
    return [(text[a:b], a) for a, b, _w in ai_zh.find_links(text, deck, set(), [0], groups=ai_zh.word_groups(markup))]


ZH = [("[大家|da4 jia1][都|dou1][在|zai4][家|jia1]。", ["家"], [("家", 4)]),
      ("[今天|jin1 tian1][天气|tian1 qi4][很|hen3][好|hao3]。", ["天"], []),
      ("[他|ta1][是|shi4][学生|xue2 sheng5]。", ["生"], []),
      ("[图书馆|tu2 shu1 guan3]", ["书"], []),
      ("[我们|wo3 men5][的|de5][学|xue2][生|sheng5]", ["学生"], [("学生", 3)]),        # từ của deck qua nhiều nhóm
      ("[今天天气|jin1 tian1 tian1 qi4][很|hen3][好|hao3]", ["今天", "天气"], [("今天", 0), ("天气", 2)]),
      ("[不好|bu4 hao3]", ["好"], [("好", 1)]),
      ("[一天|yi1 tian1]", ["天"], [("天", 1)]),
      ("[很漂亮|hen3 piao4 liang4]", ["很"], [("很", 0)]),
      ("大家都在家。", ["家"], [("家", 1)])]                                          # không đánh dấu: như cũ
bad = [(m, zl(m, d), want) for m, d, want in ZH if zl(m, d) != want]
ok(not bad, "%d ca (大|家, 今|天, 学|生, 图|书|馆 không nối; 不好 / 一天 / 很漂亮 / 今天天气 vẫn nối)%s"
   % (len(ZH), (" — sai: %s" % bad[:2]) if bad else ""))

# =========================================================================================================================
print("== 6. Tiếng Hàn: nguyên âm không gộp, động từ phụ")
KO_POS = [("쉬어요", "쉬다"), ("쉬었어요", "쉬다"), ("되어요", "되다"), ("돼요", "되다"), ("도와줘요", "돕다"), ("도와주세요", "돕다"),
          ("마셔", "마시다"), ("해봐요", "하다"), ("먹어봐요", "먹다"), ("가르쳐 줘요", "가르치다"), ("배워요", "배우다")]
KO_NEG = [("해가", "하다"), ("와인", "오다"), ("가게", "가다"), ("사과를", "사다"), ("가방을", "가다"), ("나무가", "나"),
          ("보다", "보내다"), ("주스", "주다"), ("간주", "가다"), ("간보다", "가다")]
bad = [t for t, w in KO_POS if not K.match(t.split()[0], w)] + ["≠ " + t for t, w in KO_NEG if K.match(t, w)]
ok(not bad, "%d dạng nhận được + %d chữ không nhận nhầm%s" % (len(KO_POS), len(KO_NEG), (" — sai: %s" % bad) if bad else ""))

# =========================================================================================================================
print("== 6b. Điền vào câu của deck tiếng Trung / Hàn + tên trường câu ví dụ Đức / Pháp / Trung / Hàn")
if HAVE_ANKI:
    import garden_core as G  # noqa: E402
    BL = '<span class="kb-blank">\u3000？\u3000</span>'
    CL = [("주말에 집에서 쉬어요.", "쉬다", "ko", "주말에 집에서 _."), ("친구를 도와줘요.", "돕다", "ko", "친구를 _."),
          ("밥을 먹었어요.", "먹다", "ko", "밥을 _."), ("학교에서 공부해요.", "학교", "ko", "_에서 공부해요."),
          ("사과를 샀어요.", "사과", "ko", "_를 샀어요."), ("가방을 샀어요.", "가다", "ko", None),
          ("我在家吃饭。", "家", "zh", "我在_吃饭。"), ("今天天气很好。", "天气", "zh", "今天_很好。"), ("我喝茶。", "喝", "zh", "我_茶。"),
          ("I went home.", "go", "en", "I _ home."), ("который час", "кот", "xx", None)]
    bad = []
    for ex, w, lang, want in CL:
        c = G.make_cloze(ex, w, lang=lang)
        got = c["q"].replace(BL, "_") if c else None
        if got != want:
            bad.append("%s / %s → %r (cần %r)" % (w, ex, got, want))
    ok(not bad, "Điền vào câu: %d câu (1.35.0: tiếng Trung / Hàn không câu nào có ô trống — \\w gồm cả chữ Hán / Hangul)%s"
       % (len(CL), (" — sai: " + "; ".join(bad[:3])) if bad else ""))
    EXF = [(["Wort", "Bedeutung", "Beispiel", "Beispiel Übersetzung"], "de", ("Bedeutung", "Beispiel", "Beispiel Übersetzung")),
           (["Mot", "Sens", "Exemple", "Traduction de l'exemple"], "fr", ("Sens", "Exemple", "Traduction de l'exemple")),
           (["Hanzi", "Pinyin", "Nghĩa", "Hán Việt", "例句", "例句翻译"], "zh", ("Nghĩa", "例句", "例句翻译")),
           (["Korean", "Romaja", "Nghĩa", "예문", "예문 번역"], "ko", ("Nghĩa", "예문", "예문 번역")),
           (["Front", "Back", "Example", "Example meaning"], "en", ("Back", "Example", "Example meaning")),
           (["Word", "Meaning", "Phrase"], "en", ("Meaning", None, None))]
    bad = []
    for keys, lang, want in EXF:
        r = G.guess_roles_lang(keys, {}, lang)
        if (r["meaning"], r["example"], r["ex_meaning"]) != want:
            bad.append("%s → %s" % (keys, (r["meaning"], r["example"], r["ex_meaning"])))
    ok(not bad, "tự nhận trường câu ví dụ / dịch câu: Beispiel, Exemple, 例句, 예문 (deck tiếng Anh như cũ)%s"
       % ((" — sai: " + "; ".join(bad)) if bad else ""))
else:
    print("  – bỏ qua (cần ANKI_PY)")

# =========================================================================================================================
print("== 7. Trang trí thử: không mất bản thử")
init_src = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
if HAVE_ANKI:
    from anki.collection import Collection  # noqa: E402
    import backup_core as backup  # noqa: E402
    import draft_core as draft  # noqa: E402
    import garden_core as core  # noqa: E402
    TMP = tempfile.mkdtemp(prefix="kb1351_")

    def new_state(name):
        folder = os.path.join(TMP, name)
        os.makedirs(folder)
        col = Collection(os.path.join(folder, "collection.anki2"))
        uf = os.path.join(folder, "user_files")
        os.makedirs(uf)
        st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
        st.today_override = 500
        return st, col, uf

    st, col, uf = new_state("a")
    s1 = {"items": [{"id": "bench", "x": 6, "y": 1}]}
    s2 = {"items": [{"id": "tv", "x": 6, "y": 3}]}
    store = st.draft_store(draft.put(st.draft_load(), "yard", 0, s1))
    store = st.draft_store(draft.put(store, "room", 1, s2))
    target = backup.profile_path(os.path.join(uf, draft.FILE_NAME), col)
    with open(target, "w", encoding="utf-8") as f:
        f.write('{"v": 1, "scenes": {"yard": ')                           # file hỏng (ghi dở / sửa tay)
    broken = open(target, encoding="utf-8").read()
    st.draft_store(draft.put(st.draft_load(), "zone_x", 0, s1) if False else draft.put(st.draft_load(), "yard", 2, s1))
    ok(os.path.exists(target + ".hong") and open(target + ".hong", encoding="utf-8").read() == broken
       and st.draft_load()["scenes"]["yard"]["slots"][2]["items"][0]["id"] == "bench",
       "file bản thử hỏng → giữ nguyên thành ban_thu.json.hong (cứu được) rồi mới ghi bản mới")
    # file không đọc được (thư mục / lỗi đĩa) → không ghi đè
    st2, col2, uf2 = new_state("b")
    st2.draft_store(draft.put(st2.draft_load(), "yard", 0, s1))
    st2.draft_store(draft.put(st2.draft_load(), "room", 0, s2))
    t2 = backup.profile_path(os.path.join(uf2, draft.FILE_NAME), col2)
    keep = open(t2, encoding="utf-8").read()
    real_open = open
    import builtins  # noqa: E402

    def flaky_open(path, *a, **k):
        if os.path.abspath(str(path)) == os.path.abspath(t2) and (not a or "r" in a[0]) and "w" not in (a[0] if a else "r"):
            raise PermissionError(13, "Permission denied")
        return real_open(path, *a, **k)
    builtins.open = flaky_open
    try:
        seen = st2.draft_load()                          # đọc lỗi → trống (như 1.34), trang chép cảnh thật vào ô trống
        err = ""
        try:
            st2.draft_store(draft.put(seen, "yard", 0, s2))
        except core.HomeError as e:
            err = str(e)
    finally:
        builtins.open = real_open
    ok(seen == draft.empty() and "Chưa đọc được bản thử" in err and open(t2, encoding="utf-8").read() == keep,
       "file bản thử không đọc được → không ghi đè (bản thử của sân + phòng còn nguyên), báo một câu: " + err[:60])
    # hồ sơ chưa mở (không biết hồ sơ) → không ghi lẫn vào file chung
    st3 = core.GardenState(os.path.join(uf, "state.json"), lambda: None)
    ok(backup.profile_path(st3._draft_path(), None) == st3._draft_path(), "không biết hồ sơ → đường dẫn chung (lệnh bản thử "
       "lúc đồng bộ chỉ chạy khi mw.col còn)")
else:
    print("  – bỏ qua phần collection thật (cần ANKI_PY)")

# cầu nối: chạy đúng mã _on_bridge với Anki giả (đang đồng bộ)
src = init_src[init_src.index("    def _on_bridge(self, cmd: str) -> Any:"):init_src.index("    def _dispatch(self, cmd: str) -> Any:")]
cls_src = init_src[init_src.index("    AUTO_CMDS = "):init_src.index("    _sync_note = 0.0")]


class _MW:
    col = object()


env = {"Any": object, "time": __import__("time"), "traceback": __import__("traceback"), "SYNC_MSG": "SYNC", "VERSION": "x",
       "ERRORS": None, "mw": _MW, "_col_ready": lambda: True, "_sync_hold": lambda: True}
exec("class Bridge:\n" + cls_src + "    _sync_note = 0.0\n" + src, env)        # noqa: S102


class Fake(env["Bridge"]):
    def __init__(self):
        self.sent, self.ran, self._card = [], [], None

    def _js(self, name, arg=None):
        self.sent.append((name, arg))

    def _dispatch(self, cmd):
        self.ran.append(cmd)


b = Fake()
for c in ('home:draft:put:{"scene":"yard","slot":0,"draft":{"items":[]}}', 'home:draft:pick:{"scene":"yard","slot":1}',
          "home:draft:get"):
    b._on_bridge(c)
blocked = Fake()
blocked._on_bridge('home:draft:use:{"scene":"yard","slot":0}')
blocked2 = Fake()
blocked2._on_bridge("home:buy:bench")
ok(len(b.ran) == 3 and not b.sent, "đang đồng bộ: lệnh bản thử get / put / pick vẫn chạy (chỉ ghi file trên máy)")
ok(not blocked.ran and blocked.sent == [("toast", "SYNC")] and not blocked2.ran,
   "đang đồng bộ: \"Dùng bản này\" (trả xu) và lệnh khác vẫn bị chặn + báo một câu")
env["_MW"] = None
_MW.col = None
b2 = Fake()
b2._on_bridge('home:draft:put:{"scene":"yard","slot":0,"draft":{"items":[]}}')
ok(not b2.ran, "đang đồng bộ mà không có collection (mw.col = None) → lệnh bản thử vẫn chờ (không ghi nhầm file chung)")
_MW.col = object()

# =========================================================================================================================
print("== 8. Giao diện (soát mã)")
home = open(os.path.join(ADDON, "web", "home.js"), encoding="utf-8").read()
rs = home[home.index("  function resetSlot() {"):home.index("  function useDraft() {")]
ok("GardenUI.ask(" in rs and "!p.same" in rs and "d2.cur !== n" in rs,
   "\"Như cảnh thật\": bản thử đã khác cảnh thật thì hỏi trước; đồng ý lúc đã đổi cảnh / bản thì không làm")
er = home[home.index("  function error(msg, rid) {"):home.index("  function error(msg, rid) {") + 700]
ok("draftErrAt" in er and "> 5000" in er, "lệnh bản thử lỗi: đọc lại tối đa một lần / 5 giây (không lặp vô tận)")

# =========================================================================================================================
print("== 9. Câu chữ + Đuổi quạ (node)")
EU = L.EU
ok(EU["de"]["say"]["あれ？"] == "Nanu?" and EU["de"]["say"]["がんばった！"] == "Gut gekämpft!"
   and EU["fr"]["say"]["がんばって！"] == "Courage !" and EU["fr"]["say"]["いい感じ！"] == "Ça rend bien !"
   and L.ACTS["mado"][3] == "창밖을 보다" and L.ACTS["yuki"][3] == "눈 구경을 하다" and L.FINDS["kokedama"][3] == "이끼볼",
   "câu đã sửa cho tự nhiên (Nanu? / Gut gekämpft! / Courage ! / Ça rend bien ! / 창밖을 보다 / 눈 구경을 하다 / 이끼볼)")
fr_say = " ".join(EU["fr"]["say"].values())
ok(not re.search(r"[A-Za-zÀ-ÿ][!?;:]", fr_say.replace("~", "")) and not re.search(r"\s[,.]", fr_say),
   "tiếng Pháp: khoảng trắng trước ! ? : ; như chính tả Pháp, không trước , .")
de_say = " ".join(EU["de"]["say"].values())
ok(not re.search(r"\s[!?.,]", de_say), "tiếng Đức: không có khoảng trắng trước dấu câu")
r = subprocess.run(["node", os.path.join(HERE, "test_1351.js"), ADDON], capture_output=True, text=True)
print(r.stdout.rstrip())
ok(r.returncode == 0, "node test_1351.js (Đuổi quạ: động từ phản thân, đáp án cũ vẫn đúng)" + ("" if r.returncode == 0 else
                                                                                               " — " + r.stderr[-300:]))

# =========================================================================================================================
print("== 10. Hợp đồng dữ liệu so với 1.35.0")
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")


def keys_of(text):
    return set(KEY_RE.findall(text))


cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= keys_of(open(os.path.join(ADDON, fn), encoding="utf-8").read())
old = subprocess.run(["git", "-C", ROOT, "show", "b5fc017:kotoba_batake/config.json"], capture_output=True, text=True)
if old.returncode == 0:
    old_keys = set()
    ls = subprocess.run(["git", "-C", ROOT, "ls-tree", "--name-only", "b5fc017", "kotoba_batake/"], capture_output=True,
                        text=True).stdout.split()
    for fn in ls:
        if fn.endswith(".py"):
            old_keys |= keys_of(subprocess.run(["git", "-C", ROOT, "show", "b5fc017:" + fn], capture_output=True,
                                               text=True).stdout)
    ok(cur_keys == old_keys, "khoá collection kotoba_batake_* trong mã = 1.35.0 (%d khoá)%s" % (
        len(cur_keys), "" if cur_keys == old_keys else " — mới %s, bỏ %s" % (sorted(cur_keys - old_keys), sorted(old_keys - cur_keys))))
    ok(json.loads(old.stdout) == json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")),
       "config.json giống hệt 1.35.0 (không thêm mục)")
else:
    print("  – bỏ qua so với 1.35.0 (repo không có commit b5fc017)")
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
ok(man.get("human_version") == "1.35.1", "manifest: 1.35.1")

print("\nKẾT QUẢ: %d/%d" % (PASS, PASS + FAIL))
sys.exit(1 if FAIL else 0)
