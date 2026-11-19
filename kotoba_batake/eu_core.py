"""ことば畑 1.35 — tiếng Đức / tiếng Pháp: cách viết của từ trong deck, dạng biến đổi để tìm trong câu (Điền vào câu, nối
tra từ của báo), tách từ để chấm chép chính tả, chữ "gấp" để so đáp án gõ không dấu. Thuần Python, không import anki.

Deck tiếng Đức hay ghi danh từ kèm mạo từ và số nhiều ("der Hund, -e", "die Stadt, ¨-e"), tiếng Pháp kèm mạo từ / giống
("le chat", "l'école", "maison (f)"). Máy không cần từ điển: bỏ mạo từ / ghi chú, sinh dạng biến đổi theo quy tắc (đuôi danh
từ / tính từ / động từ có quy tắc) + bảng động từ bất quy tắc hay gặp ở A1–B1. Không nhận động từ tách của tiếng Đức khi
phần tách đứng cuối câu ("ruft … an"), chỉ dạng liền ("anrufen", "angerufen").
"""
from __future__ import annotations

import re
import unicodedata

LANGS = ("de", "fr")

DE_ARTICLES = ("der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines")
FR_ARTICLES = ("le", "la", "les", "un", "une", "des", "du", "de la", "de l'", "l'", "d'")
# ghi chú hay gặp trong deck: giống / từ loại / số nhiều
_NOTE_RE = re.compile(r"(?i)\((?:m|f|n|pl|sg|nm|nf|m\.|f\.|n\.|m/f|adj|adv|v|vt|vi|verb|nom|nomen|verbe|adjektiv|"
                      r"masc|fem|neutr|[^()]{0,3})\)")
_FR_TAG_RE = re.compile(r"(?i)\b(?:n\.\s?[mf]\.?|adj\.?|v\.|loc\.|adv\.)(?=\s|$)")
_PLURAL_DE = re.compile(r"^\s*(?:¨|̈)?\s*-")          # ", -e" · ", ¨-er" · ", -" (số nhiều của tiếng Đức)
LETTERS = r"A-Za-zÀ-ÖØ-öø-ÿŒœÆæẞß"


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")


def strip_article(word: str, lang: str) -> str:
    w = nfc(word).strip()
    low = w.lower()
    arts = DE_ARTICLES if lang == "de" else FR_ARTICLES
    for a in sorted(arts, key=len, reverse=True):
        if a.endswith("'"):
            if low.startswith(a) or low.startswith(a.replace("'", "’")):
                return w[len(a):].strip()
        elif low.startswith(a + " "):
            return w[len(a) + 1:].strip()
    return w


def alternatives(word: str, lang: str) -> list[str]:
    """Các cách viết của từ trong deck: 「der Hund, -e」 → der Hund, Hund · 「le chat (m)」 → le chat, chat ·
    「gehen / laufen」 → hai từ. Bỏ phần số nhiều / ghi chú giống, từ loại."""
    w = re.sub(r"\[[^\]]*\]|/[^/\s][^/]*/", " ", nfc(word))     # phiên âm [..] /../
    out: list[str] = []

    def add(x: str) -> None:
        x = " ".join(x.replace("’", "'").split()).strip(" .!?;:,")
        if x and x.lower() not in [o.lower() for o in out]:
            out.append(x)
    for part in re.split(r"[;/|]|,(?!\s*(?:¨|̈)?\s*-)", w):
        if _PLURAL_DE.match(part) or part.strip(" ¨̈-–") == "":     # 1.35.1: "die Mutter, ¨" (số nhiều chỉ đổi umlaut)
            continue
        part = re.sub(r",\s*(?:¨|̈)?\s*-[^\s,]*", " ", part)      # số nhiều / sở hữu cách sau dấu phẩy (1.35.1: dừng ở
        # dấu phẩy kế — "der Hund, -(e)s, -e" từng thành "Hund -e")
        core = _FR_TAG_RE.sub(" ", _NOTE_RE.sub(" ", part))
        core = re.sub(r"\([^)]*\)", " ", core)
        add(core)
        base = strip_article(" ".join(core.split()), lang)
        if base:
            add(base)
            refl = re.match(r"(?i)^(?:sich\s+|se\s+|s'|s’)(.+)$", base)    # sich freuen → freuen · s'asseoir → asseoir
            if refl and ((lang == "de") == base.lower().startswith("sich")):
                add(refl.group(1))
    return out


# ---------------------------------------------------------------------------
# Dạng biến đổi
# ---------------------------------------------------------------------------

DE_IRREGULAR = (
    "sein bin bist ist sind seid war warst waren wart gewesen wäre|haben habe hast hat habt hatte hattest hatten gehabt hätte|"
    "werden werde wirst wird werdet wurde wurden geworden würde|können kann kannst könnt konnte konnten gekonnt könnte|"
    "müssen muss musst müsst musste mussten gemusst|wollen will willst wollt wollte wollten gewollt|"
    "dürfen darf darfst dürft durfte durften|sollen soll sollst sollt sollte sollten|mögen mag magst mögt mochte möchte möchten|"
    "wissen weiß weißt wisst wusste wussten gewusst|gehen ging gingen gegangen|kommen kam kamen gekommen|"
    "sehen sieht siehst sah sahen gesehen|essen isst aß aßen gegessen|trinken trank tranken getrunken|"
    "sprechen spricht sprichst sprach sprachen gesprochen|nehmen nimmt nimmst nahm nahmen genommen|"
    "geben gibt gibst gab gaben gegeben|lesen liest las lasen gelesen|fahren fährt fährst fuhr fuhren gefahren|"
    "schlafen schläft schläfst schlief schliefen geschlafen|laufen läuft läufst lief liefen gelaufen|"
    "finden fand fanden gefunden|bleiben blieb blieben geblieben|schreiben schrieb schrieben geschrieben|"
    "stehen stand standen gestanden|sitzen saß saßen gesessen|liegen lag lagen gelegen|tun tut tat taten getan|"
    "helfen hilft hilfst half halfen geholfen|treffen trifft triffst traf trafen getroffen|"
    "vergessen vergisst vergaß vergaßen|bringen brachte brachten gebracht|denken dachte dachten gedacht|"
    "kennen kannte kannten gekannt|rufen rief riefen gerufen|halten hält hältst hielt hielten gehalten|"
    "fallen fällt fiel fielen gefallen|tragen trägt trug trugen getragen|waschen wäscht wusch gewaschen|"
    "werfen wirft warf warfen geworfen|singen sang sangen gesungen|beginnen begann begannen begonnen|"
    "schwimmen schwamm schwammen geschwommen|fliegen flog flogen geflogen|ziehen zog zogen gezogen|"
    "verlieren verlor verloren|gewinnen gewann gewannen|verstehen verstand verstanden|bitten bat baten gebeten|"
    "sterben stirbt starb gestorben|wachsen wächst wuchs gewachsen|vergessen vergaß|schließen schloss geschlossen|"
    "lassen lässt ließ ließen gelassen|heißen hieß hießen geheißen|scheinen schien schienen geschienen|"
    "steigen stieg stiegen gestiegen|wenden wandte gewandt|rennen rannte gerannt|senden sandte gesandt|"
    # 1.35.1: động từ mạnh hay gặp A1–B1 còn thiếu (+ làm gốc cho động từ có tiền tố: anfangen, einladen, anbieten…)
    "fangen fängt fängst fing fingen gefangen|gießen goss gossen gegossen|schneiden schnitt schnitten geschnitten|"
    "springen sprang sprangen gesprungen|hängen hing hingen gehangen|brennen brannte brannten gebrannt|"
    "nennen nannte nannten genannt|schlagen schlägt schlug schlugen geschlagen|bieten bot boten geboten|"
    "stehlen stiehlt stahl stahlen gestohlen|laden lädt lud luden geladen|leihen lieh liehen geliehen|"
    "schreien schrie schrien geschrien|gleichen glich glichen geglichen|frieren fror froren gefroren|"
    "riechen roch rochen gerochen|schieben schob schoben geschoben|greifen griff griffen gegriffen|"
    "streiten stritt stritten gestritten|leiden litt litten gelitten|reiten ritt ritten geritten|"
    "treiben trieb trieben getrieben|schweigen schwieg schwiegen geschwiegen|lügen log logen gelogen|"
    "braten brät briet brieten gebraten|raten rät riet rieten geraten|fressen frisst fraß fraßen gefressen|"
    "messen misst maß maßen gemessen|treten tritt trat traten getreten|"
    "empfehlen empfiehlt empfahl empfahlen empfohlen|genießen genoss genossen|schießen schoss schossen geschossen|"
    "fließen floss flossen geflossen|binden band banden gebunden|sinken sank sanken gesunken|"
    "zwingen zwang zwangen gezwungen|weisen wies wiesen gewiesen|scheiden schied schieden geschieden|"
    "backen backte backten gebacken|erschrecken erschrickt erschrak erschraken erschrocken|"
    "gelingen gelingt gelang gelangen gelungen|"
    # tính từ bất quy tắc (so sánh hơn / nhất)
    "gut besser bessere besseren besserer besseres besserem beste besten bester bestes bestem|"
    "viel mehr meiste meisten meister meistes|hoch hohe hohen hoher hohes hohem höher höhere höheren höherer höchste "
    "höchsten höchster höchstes|nah nahe nahen naher näher nähere näheren nächste nächsten nächster nächstes|"
    "gern gerne lieber liebsten|groß größer größere größeren größerer größeres größte größten größter größtes größtem"
)
FR_IRREGULAR = (
    "être suis es est sommes êtes sont été étais était étions étiez étaient serai sera seront serait soit|"
    "avoir ai as a avons avez ont eu avais avait avions aviez avaient aurai aura auront aurait ait|"
    "aller vais vas va allons allez vont allé allée allés allées allait allaient irai ira iront irait|"
    "faire fais fait faisons faites font faisait faisaient fera feront ferait fasse|"
    "venir viens vient venons venez viennent venu venue venus venues venait venaient viendra viendrait|"
    "prendre prends prend prenons prenez prennent pris prise prenait prenaient prendra|"
    "pouvoir peux peut pouvons pouvez peuvent pu pouvait pouvaient pourra pourrait|"
    "vouloir veux veut voulons voulez veulent voulu voulait voulaient voudra voudrait|"
    "voir vois voit voyons voyez voient vu vue voyait voyaient verra verrait|"
    "savoir sais sait savons savez savent su savait savaient saura saurait|dire dis dit disons dites disent disait|"
    "mettre mets met mettons mettez mettent mis mise mettait|devoir dois doit devons devez doivent dû devait devra devrait|"
    "boire bois boit buvons buvez boivent bu buvait|lire lis lit lisons lisez lisent lu lisait|"
    "écrire écris écrit écrivons écrivez écrivent écrivait|partir pars part partons partez partent parti partie partait|"
    "sortir sors sort sortons sortez sortent sorti sortie sortait|dormir dors dort dormons dormez dorment dormi dormait|"
    "connaître connais connaît connaissons connaissez connaissent connu connaissait|"
    "comprendre comprends comprend comprenons comprenez comprennent compris comprenait|"
    "apprendre apprends apprend apprenons apprenez apprennent appris apprenait|"
    "attendre attends attend attendons attendez attendent attendu attendait|"
    "entendre entends entend entendons entendez entendent entendu entendait|"
    "répondre réponds répond répondons répondez répondent répondu répondait|"
    "vendre vends vend vendons vendez vendent vendu vendait|perdre perds perd perdons perdez perdent perdu perdait|"
    "ouvrir ouvre ouvres ouvrons ouvrez ouvrent ouvert ouvrait|offrir offre offrons offrez offrent offert|"
    "courir cours court courons courez courent couru courait|mourir meurt meurent mort morte|naître né née nés|"
    "vivre vis vit vivons vivez vivent vécu vivait|suivre suis suit suivons suivez suivent suivi|"
    "croire crois croit croyons croyez croient cru croyait|recevoir reçois reçoit recevons recevez reçoivent reçu|"
    "tenir tiens tient tenons tenez tiennent tenu tenait|plaire plaît plu|pleuvoir pleut plu pleuvait|"
    "falloir faut fallu fallait faudra|asseoir assieds assied asseyons assis|rire ris rit rions riez rient ri|"
    "conduire conduis conduit conduisons conduisez conduisent conduisait|"
    "manger mange manges mangeons mangez mangent mangé mangeait mangeaient|"
    "commencer commence commençons commencé commençait|acheter achète achètes achetons achetez achètent acheté|"
    "appeler appelle appelles appelons appelez appellent appelé|jeter jette jetons jetez jettent jeté|"
    "préférer préfère préfères préférons préférez préfèrent préféré|payer paie paye payons payez paient payé|"
    "envoyer envoie envoyons envoyez envoient envoyé enverra|essayer essaie essaye essayons essayez essaient essayé|"
    # tính từ / danh từ bất quy tắc
    "beau beaux bel belle belles|nouveau nouveaux nouvel nouvelle nouvelles|vieux vieil vieille vieilles|"
    "blanc blanche blanches|long longue longues|gentil gentille gentilles|doux douce douces|faux fausse fausses|"
    "frais fraîche fraîches|sec sèche sèches|cher chère chères|premier première premières|"
    "dernier dernière dernières|fou folle folles|œil yeux|ciel cieux|travail travaux|"
    # 1.35.1: động từ nhóm 3 còn thiếu (+ làm gốc cho động từ có tiền tố: ressentir, desservir, apparaître…) và giả định
    "sentir sens sent sentons sentez sentent senti sentie sentait sentaient sentira|"
    "servir sers sert servons servez servent servi servie servait servaient servira|"
    "mentir mens ment mentons mentez mentent menti mentait|paraître parais paraît paraissons paraissez paraissent paru "
    "paraissait|battre bats bat battons battez battent battu battait|valoir vaut valent valu valait vaudra vaudrait|"
    "aller aille ailles aillent|pouvoir puisse puisses puissent|vouloir veuille veuillent|savoir sache saches sachent|"
    "venir vienne viennes|prendre prenne prennes prennent|faire fasses fassent fit firent|dire dise disent dit|"
    "mettre mette mettent|voir voie voient vit virent|être fut furent sois soient|avoir eut eurent aie aies aient|"
    "bon bonne bonnes meilleur meilleure meilleurs meilleures|bien mieux|mauvais mauvaise mauvaises pire pires|"
    "public publique publiques|grec grecque grecques|frais fraîche|roux rousse rousses|jaloux jalouse jalouses"
)


def _table(raw: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for row in raw.split("|"):
        ws = row.split()
        if ws:
            out.setdefault(ws[0], []).extend(ws[1:])
    return out


_DE_IRR = _table(DE_IRREGULAR)
_FR_IRR = _table(FR_IRREGULAR)
_UMLAUT = {"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}


def _de_umlaut(w: str) -> str:
    """Hand → Hände, Apfel → Äpfel, Haus → Häuser: đổi nguyên âm cuối a / o / u / au sang umlaut."""
    # 1.35.5 (audit 19/11 #15): cả nguyên âm viết hoa đầu danh từ (Apfel → Äpfel, Arzt → Ärzte, Ofen → Öfen, Amt → Ämter)
    m = re.search(r"([Aa]u|[aouAOU])(?=[^aeiouäöüAEIOUÄÖÜ]*(?:e[lnr])?$)", w)
    if not m:
        return ""
    v = m.group(1)
    rep = ("Äu" if v[0] == "A" else "äu") if v in ("au", "Au") else _UMLAUT[v]
    return w[:m.start()] + rep + w[m.end():]


# động từ tách / không tách của tiếng Đức (1.35.1: thêm um, durch, statt, kennen, wieder…: umziehen → umgezogen, stattfinden
# → stattgefunden, kennenlernen → kennengelernt)
_DE_SEP = re.compile(r"^(zurück|zusammen|weiter|hinaus|heraus|herein|hinein|vorbei|kennen|statt|nieder|wieder|durch|"
                     r"ab|an|auf|aus|bei|ein|mit|nach|vor|weg|zu|um|fern|los|hin|her|heim|fest|teil|frei|hoch|dar|da)(.+)$")
_DE_INSEP = ("be", "ge", "er", "ver", "zer", "ent", "emp", "miss")
_DE_VERB_SUF = ("e", "st", "t", "et", "est", "en", "te", "test", "ten", "tet", "ete", "etest", "eten", "etet", "end", "ende",
                "enden", "ender", "endes")
_DE_ADJ_SUF = ("e", "en", "er", "es", "em", "ere", "eren", "erer", "eres", "erem", "st", "ste", "sten", "ster", "stes", "stem",
               "este", "esten", "ester", "estes", "estem")
_DE_CMP_SUF = ("er", "ere", "eren", "erer", "eres", "erem", "ste", "sten", "ster", "stes", "stem", "este", "esten", "ester",
               "estes", "estem")
_ONE_VOWEL = re.compile(r"^[^aeiouäöüy]*(?:au|a|o|u)[^aeiouäöüy]*$")


def _de_verb_stem(w: str) -> str:
    return w[:-2] if w.lower().endswith("en") else w[:-1]


def _de_forms(w: str) -> list[str]:
    out = [w]
    low = w.lower()
    if low in _DE_IRR:
        out += _DE_IRR[low]
    if w[:1].isupper():                              # danh từ (viết hoa): số nhiều / sở hữu
        for suf in ("e", "en", "n", "er", "s", "es", "ern"):
            out.append(w + suf)
        u = _de_umlaut(w)
        if u:
            out += [u, u + "e", u + "er", u + "en", u + "ern"]
        return out
    if low.endswith(("en", "ern", "eln")) and len(low) > 3:     # động từ
        stem = _de_verb_stem(w)
        out += [stem + suf for suf in _DE_VERB_SUF]
        sep = _DE_SEP.match(low)
        insep = next((p for p in _DE_INSEP if low.startswith(p) and len(low) - len(p) > 3), "")
        if sep and len(sep.group(2)) > 3:              # anrufen → angerufen, anzurufen; aufstehen → aufgestanden
            pre, rest = w[:len(sep.group(1))], w[len(sep.group(1)):]
            out += [pre + "ge" + _de_verb_stem(rest) + "t", pre + "ge" + rest, pre + "zu" + rest]
            out += [pre + f for f in _DE_IRR.get(rest.lower(), [])]
        elif insep:                                     # bekommen → bekam, gefallen → gefällt (Partizip không có ge-)
            out += [stem + "t"]
            rest = w[len(insep):]
            out += [w[:len(insep)] + (f[2:] if f.startswith("ge") and len(f) > 4 else f)
                    for f in _DE_IRR.get(rest.lower(), [])]
        elif not low.endswith("ieren"):
            out += ["ge" + stem + "t", "ge" + stem + "et", "ge" + w]
        else:
            out += [stem + "t"]
        return out
    out += [w + suf for suf in _DE_ADJ_SUF]          # tính từ (+ so sánh: kleiner, kleinste)
    if low.endswith("e"):
        out += [w + "n", w + "r", w + "s", w + "m"]
    if _ONE_VOWEL.match(low):                        # alt → älter, älteste · warm → wärmer · jung → jünger
        u = _de_umlaut(w)
        if u:
            out += [u + suf for suf in _DE_CMP_SUF]
    return out


# 1.35.1: động từ nhóm 3 có tiền tố (devenir, obtenir, permettre, décrire, reconnaître, découvrir…) — gốc + đuôi ở bảng
_FR_PREFIXABLE = ("venir", "tenir", "prendre", "mettre", "faire", "partir", "sortir", "lire", "dire", "connaître", "paraître",
                  "vivre", "suivre", "ouvrir", "offrir", "sentir", "servir", "dormir", "courir", "écrire", "battre", "voir")
_FR_VOIR_PRE = ("re", "pré", "entre")          # revoir, prévoir — không phải pouvoir / savoir / devoir / recevoir
_FR_GENDER_NOTE = re.compile(r"(?i)\((?:m|f|n|nm|nf|n\.\s?m\.?|n\.\s?f\.?|m\.|f\.|masc\.?|fém\.?|fem\.?|pl\.?)\)|"
                             r"(?:^|\s)n\.\s?[mf]\.?(?=\s|$)")


def _fr_forms(w: str, noun: bool = False) -> list[str]:
    """noun: từ của deck có mạo từ / ghi giống (le port, la porte, soir (m)) → danh từ, chỉ thêm số nhiều (không thêm giống
    cái -e: le port ≠ porte; không chia như động từ: le papier ≠ papie, le soir ≠ soit)."""
    out = [w]
    low = w.lower()
    if low in _FR_IRR:
        out += _FR_IRR[low]
    if noun:                                         # danh từ: số nhiều
        out += [w + "s", w + "x"]
        if low.endswith(("al", "ail")):
            out.append(w[:-2 if low.endswith("al") else -3] + "aux")
        return out
    if low not in _FR_IRR:
        for base in _FR_PREFIXABLE:
            pre = low[:-len(base)] if low.endswith(base) else ""
            if pre and len(pre) <= 6 and (base != "voir" or pre in _FR_VOIR_PRE):
                out += [w[:len(pre)] + f for f in [base] + _FR_IRR.get(base, [])]
                break
    if low.endswith("er") and len(low) > 3:          # động từ nhóm 1
        st = w[:-2]
        out += [st + x for x in ("e", "es", "ons", "ez", "ent", "é", "ée", "és", "ées", "ais", "ait", "ions", "iez",
                                 "aient", "erai", "eras", "era", "erons", "erez", "eront", "erais", "erait", "erions",
                                 "eriez", "eraient", "ant", "a", "èrent")]
        if st.endswith("g"):
            out += [st + "eons", st + "eais", st + "eait", st + "eaient", st + "eant", st + "ea"]
        if st.endswith("c"):
            out += [st[:-1] + "çons", st[:-1] + "çais", st[:-1] + "çait", st[:-1] + "çaient", st[:-1] + "çant"]
        m = re.search(r"([eé])([^aeiouyéèêëàâîïôûù]+)$", st)     # lever → lève, répéter → répète (e / é → è)
        if m and m.start() > 0:
            st2 = st[:m.start()] + "è" + m.group(2)
            out += [st2 + x for x in ("e", "es", "ent")]
            if m.group(1) == "e":
                out += [st2 + x for x in ("erai", "eras", "era", "erons", "erez", "eront", "erais", "erait", "eraient")]
        out.append(w + "s")                          # từ ghi không mạo từ nhưng là danh từ (papier → papiers)
    elif low.endswith("ir") and not low.endswith("oir") and len(low) > 3:     # nhóm 2 (finir); "-oir" là nhóm 3 / danh từ
        st = w[:-2]
        out += [st + x for x in ("is", "it", "issons", "issez", "issent", "i", "ie", "ies", "issais", "issait", "issions",
                                 "issiez", "issaient", "irai", "iras", "ira", "irons", "irez", "iront", "irais", "irait",
                                 "irions", "iriez", "iraient", "issant", "isse", "issent")]
        out.append(w + "s")
    elif low.endswith("uire") and len(low) > 4:      # construire, traduire → construit, traduisons
        st = w[:-2]
        out += [st + x for x in ("s", "t", "te", "ts", "tes", "sons", "sez", "sent", "sait", "saient", "sant", "rai", "ra")]
    elif low.endswith("re") and len(low) > 3:        # nhóm 3 (vendre)
        st = w[:-2]
        out += [st + x for x in ("s", "", "ons", "ez", "ent", "u", "ue", "us", "ues", "ait", "aient", "rai", "ra")]
        out.append(w + "s")                          # danh từ / tính từ ghi không mạo từ (livre → livres, autre → autres)
    else:                                            # tính từ (hoặc danh từ không ghi mạo từ)
        out += [w + "s", w + "e", w + "es", w + "x"]
        if low.endswith("al"):
            out.append(w[:-2] + "aux")
        if low.endswith(("eau", "eu")):
            out.append(w + "x")
        if low.endswith("eux"):
            out += [w[:-1] + "se", w[:-1] + "ses"]
        if low.endswith("if"):
            out += [w[:-1] + "ve", w[:-1] + "ves"]
        if low.endswith("er"):
            out += [w[:-2] + "ère", w[:-2] + "ères"]
        if low.endswith(("en", "on")):
            out += [w + "ne", w + "nes"]
    return out


def _fr_is_noun(word: str, alts0: list[str], lang: str = "fr") -> bool:
    """Từ của deck tiếng Pháp là danh từ: có mạo từ (le / la / l' / un…) hoặc ghi giống (m) / (f) / n.m. — không tính
    "(e)" / "(ne)" của ami(e), chien(ne) (vẫn nhận giống cái)."""
    w = nfc(word)
    if re.search(r"\((?:e|ne|se|ve|le)\)", w):
        return False
    return (bool(alts0) and strip_article(alts0[0], lang) != alts0[0]) or bool(_FR_GENDER_NOTE.search(w))


def forms(word: str, lang: str) -> list[str]:
    """Mọi dạng để tìm từ / cụm từ của deck trong câu (dài trước). Cụm từ: biến đổi chữ đầu (động từ) và chữ cuối."""
    out: list[str] = []
    fx = _de_forms if lang == "de" else _fr_forms
    if lang == "fr":
        noun = _fr_is_noun(word, alternatives(word, lang), lang)
        fx = (lambda x: _fr_forms(x, noun))      # noqa: E731
    for alt in alternatives(word, lang):
        parts = alt.split()
        if not parts:
            continue
        if len(parts) == 1:
            out += fx(parts[0])
            continue
        out.append(" ".join(parts))
        out += [" ".join([f] + parts[1:]) for f in fx(parts[0])]
        out += [" ".join(parts[:-1] + [f]) for f in fx(parts[-1])]
    seen: list[str] = []
    for f in out:
        f = f.strip()
        if f and f.lower() not in [x.lower() for x in seen]:
            seen.append(f)
    return sorted(seen, key=len, reverse=True)


def pattern(fs: list[str]) -> str:
    """Biểu thức tìm một trong các dạng `fs` (dài trước) theo ranh giới chữ; dấu nháy thẳng / cong như nhau (Gemini và bộ
    gõ hay viết aujourd’hui, d’accord)."""
    body = "|".join(re.escape(f).replace(r"\ ", r"\s+").replace("'", "['’]") for f in fs)
    return r"(?<![%s])(?:%s)(?![%s])" % (LETTERS, body, LETTERS)


# ---------------------------------------------------------------------------
# Ngữ cảnh (1.35.1): không nối nhầm từ cùng mặt chữ khác nghĩa
# ---------------------------------------------------------------------------

_FR_SUBJ = {"je", "j'", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "ne", "n'", "me", "m'", "te", "t'", "se",
            "s'", "qui", "ça"}
_FR_DET = {"le", "la", "les", "l'", "un", "une", "des", "du", "au", "aux", "ce", "cet", "cette", "ces", "mon", "ma", "mes",
           "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs", "chaque", "quel",
           "quelle", "quels", "quelles"}
_FR_AVOIR = {"a", "ai", "as", "avons", "avez", "ont", "avait", "avais", "avaient", "avions", "aviez", "aura", "aurai", "auras",
             "aurons", "aurez", "auront", "aurait", "aurais", "auraient", "ait", "aient", "avoir", "ayant", "eu"}
_FR_ADV = {"pas", "jamais", "déjà", "toujours", "bien", "tous", "toutes", "tout", "souvent", "vraiment", "très", "plus",
           "trop", "encore", "aussi", "peut-être", "rarement", "beaucoup"}
_TOKEN_BACK = re.compile(r"([%s]+['’]?|['’])\s*$" % LETTERS)


def _prev_tokens(text: str, start: int, n: int = 4) -> list[str]:
    """`n` chữ ngay trước vị trí `start` (gần nhất trước), chữ thường, nháy cong → thẳng; dừng ở dấu câu."""
    out: list[str] = []
    head = text[:start]
    while len(out) < n:
        m = _TOKEN_BACK.search(head)
        if not m:
            break
        out.append(m.group(1).lower().replace("’", "'"))
        head = head[:m.start()]
    return out


def word_kind(word: str, lang: str) -> str:
    """Loại của từ trong deck để xét ngữ cảnh: "noun" / "verb" / "other"."""
    alts = alternatives(word, lang)
    if not alts:
        return "other"
    base = strip_article(alts[0], lang)
    if lang == "de":
        if base != alts[0] or (len(base.split()) == 1 and base[:1].isupper()):
            return "noun"
        return "verb" if len(base.split()) == 1 and base.lower().endswith(("en", "ern", "eln")) else "other"
    if _fr_is_noun(word, alts, lang):
        return "noun"
    b = re.sub(r"(?i)^(?:se\s+|s['’])", "", base)
    return "verb" if len(b.split()) == 1 and b.lower().endswith(("er", "ir", "re", "oir")) else "other"


def context_ok(text: str, start: int, end: int, word: str, lang: str, kind: str | None = None) -> bool:
    """Chỗ khớp [start, end) có đúng là từ này không (xét hoa / thường và chữ đứng trước):
    - tiếng Đức: danh từ viết hoa (der Morgen) không nhận "morgen" (ngày mai); từ viết thường (arm, essen) không nhận chữ
      viết hoa giữa câu (der Arm, das Essen) — đầu câu / sau dấu ngoặc kép thì nhận;
    - tiếng Pháp: danh từ (le lit, la porte, l'été) không nhận khi đứng ngay sau đại từ chủ ngữ / ne (il lit, il porte) hay
      "été" sau avoir (il a été); động từ (lire, porter) không nhận khi đứng sau mạo từ / từ hạn định (le lit, la porte) —
      trừ đại từ tân ngữ (je la porte, il le fait)."""
    kind = kind or word_kind(word, lang)
    m = text[start:end]
    if not m:
        return False
    if lang == "de":
        alts = alternatives(word, lang)
        base = strip_article(alts[0], lang) if alts else ""
        if kind == "noun" and base[:1].isupper():
            core = strip_article(m, lang)            # chỗ khớp có thể kèm mạo từ ("Die Mütter") → xét chữ của danh từ
            return core[:1].isupper()
        if base[:1].islower() and m[:1].isupper():
            head = text[:start].rstrip()
            return not head or head[-1] in ".!?…:;„“\"«»‚‘(–—-\n"
        return True
    prev = _prev_tokens(text, start)
    if kind == "noun":
        if prev and prev[0] in _FR_SUBJ:
            return False
        if fold(m, "fr") in ("ete", "etes"):
            for t in prev:
                if t in _FR_AVOIR:
                    return False
                if t not in _FR_ADV and t not in ("n'", "ne"):
                    break
        return True
    if kind == "verb" and prev and prev[0] in _FR_DET:
        plain = {fold(re.sub(r"(?i)^(?:se\s+|s['’])", "", strip_article(a, lang)), lang) for a in alternatives(word, lang)}
        if fold(m, lang) in plain | {x + "s" for x in plain}:
            return True                              # đúng chữ của deck (livre, fenêtre ghi không mạo từ) / số nhiều
        if prev[0] not in ("le", "la", "les", "l'"):
            return False                             # un / du / mon / ce… + chữ = danh từ (du pouvoir, un dîner)
        # đại từ tân ngữ: je la porte, ne le fais pas (nguyên mẫu sau le / la / les — je vais le faire — đã nhận ở trên)
        return len(prev) > 1 and prev[1] in _FR_SUBJ
    return True


def find_word(sentence: str, word: str, lang: str) -> tuple[int, int] | None:
    """Vị trí của từ (kể cả dạng biến đổi, không phân biệt hoa thường) trong câu; tiếng Pháp nhận cả sau l' / d' / qu'.
    1.35.1: bỏ chỗ khớp sai ngữ cảnh (context_ok) — tìm tiếp chỗ sau."""
    fs = forms(word, lang)
    if not fs:
        return None
    s = nfc(sentence)
    kind = word_kind(word, lang)
    for m in re.finditer(pattern(fs), s, re.I):
        if context_ok(s, m.start(), m.end(), word, lang, kind):
            return (m.start(), m.end())
    return None


def words(s: str, lang: str) -> list[str]:
    """Câu → các từ để chấm chép chính tả (chữ thường, bỏ dấu câu; tiếng Pháp tách l' / d' / j' / qu' khỏi từ sau)."""
    s = nfc(s).replace("’", "'").replace("‘", "'").lower()
    if lang == "fr":
        s = re.sub(r"\b(l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu)'", r"\1' ", s)
    s = re.sub(r"[-‐–—]+", " ", s)
    s = re.sub(r"[^\w' ]+", " ", s)
    return [w.strip() for w in s.split() if w.strip("'")]


def fold(s: str, lang: str) -> str:
    """Chữ để so đáp án gõ không dấu: tiếng Đức ä → ae, ö → oe, ü → ue, ß → ss; tiếng Pháp bỏ dấu, œ → oe, æ → ae."""
    s = nfc(s).lower()
    if lang == "de":
        s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss").replace("ẞ", "ss")
    s = s.replace("œ", "oe").replace("æ", "ae")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
