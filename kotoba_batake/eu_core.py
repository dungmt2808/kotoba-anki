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
        if _PLURAL_DE.match(part):
            continue
        part = re.sub(r",\s*(?:¨|̈)?\s*-\S*", " ", part)         # số nhiều dính sau dấu phẩy
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
    "steigen stieg stiegen gestiegen|wenden wandte gewandt|rennen rannte gerannt|senden sandte gesandt"
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
    "dernier dernière dernières|fou folle folles|œil yeux|ciel cieux|travail travaux"
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
    m = re.search(r"(au|a|o|u)(?=[^aeiouäöüAEIOUÄÖÜ]*(?:e[lnr])?$)", w)
    if not m:
        return ""
    v = m.group(1)
    rep = "äu" if v == "au" else _UMLAUT[v]
    return w[:m.start()] + rep + w[m.end():]


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
        stem = w[:-2] if low.endswith("en") else w[:-1]
        sep = re.match(r"^(ab|an|auf|aus|bei|ein|mit|nach|vor|weg|zu|zurück|fern|los|vorbei|hin|her|heim|fest|teil|"
                       r"zusammen|weiter|hinaus|heraus|herein|hinein)(.+)$", low)
        for suf in ("e", "st", "t", "et", "est", "en", "te", "test", "ten", "tet", "end", "ende", "enden"):
            out.append(stem + suf)
        if sep and len(sep.group(2)) > 3:              # anrufen → angerufen, anzurufen
            pre, rest = sep.group(1), w[len(sep.group(1)):]
            out += [pre + "ge" + rest[:-2] + "t", pre + "ge" + rest, pre + "zu" + rest]
        elif not low.startswith(("be", "ge", "er", "ver", "zer", "ent", "emp", "miss")) and not low.endswith("ieren"):
            out += ["ge" + stem + "t", "ge" + stem + "et", "ge" + w]
        else:
            out += [stem + "t"]
        return out
    for suf in ("e", "en", "er", "es", "em", "ere", "eren", "erer", "st", "ste", "sten", "ster"):   # tính từ
        out.append(w + suf)
    if low.endswith("e"):
        out += [w + "n", w + "r", w + "s", w + "m"]
    return out


def _fr_forms(w: str, noun: bool = False) -> list[str]:
    """noun: từ của deck có mạo từ (le port, la porte) → danh từ, chỉ thêm số nhiều (không thêm giống cái -e: le port ≠
    porte)."""
    out = [w]
    low = w.lower()
    if low in _FR_IRR:
        out += _FR_IRR[low]
    if low.endswith("er") and len(low) > 3:          # động từ nhóm 1
        st = w[:-2]
        out += [st + x for x in ("e", "es", "ons", "ez", "ent", "é", "ée", "és", "ées", "ais", "ait", "ions", "iez",
                                 "aient", "erai", "eras", "era", "erons", "erez", "eront", "erais", "erait", "ant")]
        if st.endswith("g"):
            out += [st + "eons", st + "eais", st + "eait", st + "eant"]
        if st.endswith("c"):
            out += [st[:-1] + "çons", st[:-1] + "çais", st[:-1] + "çait"]
    elif low.endswith("ir") and len(low) > 3:        # nhóm 2 (finir)
        st = w[:-2]
        out += [st + x for x in ("is", "it", "issons", "issez", "issent", "i", "ie", "is", "ies", "issait", "issaient",
                                 "irai", "ira", "iront", "issant")]
    elif low.endswith("re") and len(low) > 3:        # nhóm 3 (vendre)
        st = w[:-2]
        out += [st + x for x in ("s", "", "ons", "ez", "ent", "u", "ue", "us", "ues", "ait", "aient", "rai", "ra")]
    elif noun:                                       # danh từ: số nhiều
        out += [w + "s", w + "x"]
        if low.endswith("al"):
            out.append(w[:-2] + "aux")
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


def forms(word: str, lang: str) -> list[str]:
    """Mọi dạng để tìm từ / cụm từ của deck trong câu (dài trước). Cụm từ: biến đổi chữ đầu (động từ) và chữ cuối."""
    out: list[str] = []
    fx = _de_forms if lang == "de" else _fr_forms
    if lang == "fr":
        alts0 = alternatives(word, lang)
        # có mạo từ → danh từ; ghi "(e)" / "(ne)" (ami(e), chien(ne)) → vẫn nhận giống cái
        noun = bool(alts0) and strip_article(alts0[0], lang) != alts0[0] and not re.search(r"\((?:e|ne|se|ve|le)\)", nfc(word))
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


def find_word(sentence: str, word: str, lang: str) -> tuple[int, int] | None:
    """Vị trí của từ (kể cả dạng biến đổi, không phân biệt hoa thường) trong câu; tiếng Pháp nhận cả sau l' / d' / qu'."""
    fs = forms(word, lang)
    if not fs:
        return None
    body = "|".join(re.escape(f).replace(r"\ ", r"\s+") for f in fs)
    m = re.search(r"(?<![%s])(?:%s)(?![%s])" % (LETTERS, body, LETTERS), nfc(sentence), re.I)
    return (m.start(), m.end()) if m else None


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
