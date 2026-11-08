"""Báo 畑新聞 bản tiếng Việt — "Báo Làng Kotoba" (bản 1.25.1), do Gemini viết bằng khoá của người dùng.

Dành cho người không học tiếng Nhật / tiếng Anh (deck lịch sử, y khoa, luật, tiếng Hàn…): báo viết bằng tiếng Việt,
đan nội dung các thẻ đang ôn (mặt trước / mặt sau) vào tin làng, truyện dài kỳ và "Góc ôn bài"; câu hỏi hỏi lại kiến
thức có trong số báo. Tiếng mẹ đẻ nên **không** có giọng đọc, chép chính tả, bản dịch, furigana, mẫu câu.

Dùng chung khung của báo tiếng Nhật / tiếng Anh (ai_core.Job, bao.json, paper_core), chỉ khác:
  - thư mục riêng  user_files/bao_gemini_vi/ , trạng thái đọc ở khoá collection `kotoba_batake_paper_vi`;
  - mỗi số lấy tối đa 60 thẻ (words_core.pick, ngôn ngữ "vi"): mỗi thẻ thành một MỤC có số (#1, #2…);
  - Gemini đánh dấu chỗ nhắc tới một mục bằng {chữ trong bài||#số}; máy sửa các kiểu đánh dấu lệch, bỏ số không có,
    tự nối thêm chỗ nhắc nguyên văn mặt trước của thẻ; bảng tra nghĩa của số báo: "#số" → [mặt trước, "", mặt sau, deck];
  - bộ kiểm tra `check`: đúng khung, tiếng Việt có dấu, độ dài, số mục được dùng, câu hỏi một đáp án, đánh dấu đúng.
  - "Không dùng deck": không có mục nào → báo làng + truyện + một góc kiến thức chung, câu hỏi về nội dung bài.

File này không import aqt (test được bằng python thường).
"""

from __future__ import annotations

import copy
import datetime
import html
import json
import re
from typing import Any

try:
    from . import ai_core as ai
    from . import paper_core as paper
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import ai_core as ai  # type: ignore[no-redef]
    import paper_core as paper  # type: ignore[no-redef]

FOLDER = "bao_gemini_vi"
LEVELS: tuple[str, ...] = ()          # tiếng mẹ đẻ: không chọn trình độ
DEFAULT_LEVEL = ""
MASTHEAD = "Báo Làng Kotoba"
ITEMS = 60             # số thẻ gửi Gemini mỗi số (thẻ kiến thức dài hơn từ vựng)
FOCUS = 15             # số mục trọng tâm (thẻ hôm nay đến hạn ôn) dặn Gemini dùng
FRONT_MAX = 120
BACK_MAX = 240
LINK_MAX = 30          # tổng số chỗ bấm tra trong một số
LINK_PER_ITEM = 3      # mỗi mục tối đa 3 chỗ trong cả số (thường mỗi bài một lần nhắc đầu tiên)
# số chữ (tách theo khoảng trắng) của cả phần bài, số thường 3 bài — người dùng: "nội dung có thể dài hơn một chút"
LENGTH = (420, 950)
SHORT_LENGTH = (120, 380)
QUESTIONS = (3, 4)

KEY_RE = re.compile(r"^#(\d{1,3})$")
CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff]")
VI_MARK_RE = re.compile(r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]", re.I)
# các kiểu đánh dấu Gemini hay viết lệch: {chữ|#3} {chữ||3} [chữ|#3] {chữ | | #3}
# số thẻ lộ ra bài (thử Gemini thật 08/11: "◆ Thẻ #1: {Ngô Quyền||#1} - …") — số chỉ được nằm trong đánh dấu
NUM_LEAK = (re.compile(r"(?i)\bthẻ\s*(?:số\s*)?#\s*\d{1,3}\s*[:：\-–—]?\s*"), re.compile(r"\s*[(（]\s*#\d{1,3}\s*[)）]"),
            re.compile(r"#\d{1,3}\b"))
LOOSE_MARK = re.compile(r"[\{\[]\s*([^{}\[\]|#\n]{1,90}?)\s*\|{1,2}\s*#?\s*(\d{1,3})\s*[\}\]]")
CLOZE_RE = re.compile(r"\{\{c\d+::(.*?)(?:::[^}]*)?\}\}", re.S)
SOUND_RE = re.compile(r"\[sound:[^\]]*\]")


# ---------------------------------------------------------------------------
# Mục (thẻ) → phạm vi của số báo
# ---------------------------------------------------------------------------

def clean_text(value: Any, limit: int) -> str:
    """Chữ của một trường thẻ: bỏ HTML, [sound:…], cloze {{c1::…}} → chữ bên trong, ký tự đánh dấu của báo."""
    if not isinstance(value, str):
        return ""
    s = SOUND_RE.sub(" ", value)
    s = CLOZE_RE.sub(lambda m: m.group(1), s)
    s = re.sub(r"<br\s*/?>|</?(?:div|p|li)\b[^>]*>", " · ", s, flags=re.I)
    s = re.sub(r"<[^>]*>", " ", s)
    s = html.unescape(s).replace("\u00a0", " ")
    s = re.sub(r"[\[\]{}|]", "", s)
    s = re.sub(r"(?:\s*·\s*)+", " · ", s)
    s = re.sub(r"\s+", " ", s).strip(" ·")
    if len(s) > limit:
        s = s[:limit - 1].rstrip() + "…"
    return s


def kho_ok(item: dict[str, Any]) -> bool:
    """Thẻ dùng được cho báo tiếng Việt: có chữ ở cả mặt trước lẫn mặt sau (thẻ chỉ có ảnh / audio thì bỏ)."""
    return bool(clean_text(item.get("word"), FRONT_MAX)) and bool(clean_text(item.get("meaning"), BACK_MAX))


def scope_from_pick(pk: dict[str, Any], level: str = "") -> dict[str, Any]:
    """Phạm vi từ words_core.pick: mỗi thẻ một mục có số (#1…), mục đến hạn ôn hôm nay đi trước."""
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    for it in pk.get("kho", []):
        front = clean_text(it.get("word"), FRONT_MAX)
        back = clean_text(it.get("meaning"), BACK_MAX)
        if not front or not back or front.lower() in seen:
            continue
        seen.add(front.lower())
        items.append({"id": len(items) + 1, "truoc": front, "sau": back, "due": bool(it.get("due"))})
        if len(items) >= ITEMS:
            break
    decks = [d for d in pk.get("decks", []) if isinstance(d, str)]
    due = [m["id"] for m in items if m["due"]]
    return {
        "lang": "vi", "nguon": "deck", "trinh_do": "", "muc": items,
        "tu_vung": [], "kho": [[m["truoc"], "", m["sau"], "deck"] for m in items], "ngu_phap": [],
        "trong_tam": {"tu": [], "ngu_phap": []}, "can_on": due[:FOCUS],
        "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(items)),
    }


def _items(scope: dict[str, Any]) -> dict[int, dict[str, Any]]:
    return {m["id"]: m for m in scope.get("muc") or [] if isinstance(m, dict) and isinstance(m.get("id"), int)}


def build_lookup(texts: list[str], scope: dict[str, Any]) -> dict[str, Any]:
    """Bảng tra của số báo: chỉ các mục thật sự được đánh dấu trong bài."""
    items = _items(scope)
    book = (scope.get("sach") or {}).get("deck", "")
    tu: dict[str, list[str]] = {}
    for t in texts:
        for k in paper.keys(t or ""):
            m = KEY_RE.match(k)
            if m and int(m.group(1)) in items and k not in tu:
                it = items[int(m.group(1))]
                tu[k] = [it["truoc"], "", it["sau"], "deck"]
    return {"tra_tu": tu, "tra_mau": {}, "tra_sach": {"deck": book} if book else {}}


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    """[số mục đến hạn ôn có trong bài, số mục đến hạn ôn đã gửi]."""
    due = set(scope.get("can_on") or [])
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    return [len(used_ids(raw) & due), len(due)]


def used_ids(raw: Any) -> set[int]:
    out: set[int] = set()
    if not isinstance(raw, dict):
        return out
    for t in _issue_texts(raw)[0]:
        for k in paper.keys(t):
            m = KEY_RE.match(k)
            if m:
                out.add(int(m.group(1)))
    return out


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    """Số mục (thẻ) được dùng trong bài — để so bản soát lần 2 với bản trước."""
    return len(used_ids(raw) & set(_items(scope)))


def link_count(raw: Any) -> int:
    if not isinstance(raw, dict):
        return 0
    return sum(len(paper.keys(t)) for t in _issue_texts(raw)[0])


# ---------------------------------------------------------------------------
# Sửa máy
# ---------------------------------------------------------------------------

def words(s: str) -> list[str]:
    return [w for w in re.split(r"\s+", paper.surface(s or "")) if re.search(r"\w", w)]


def _issue_texts(raw: dict[str, Any]) -> tuple[list[str], list[tuple[int, str | int]]]:
    texts: list[str] = []
    where: list[tuple[int, str | int]] = []
    for bi, b in enumerate(raw.get("bai", []) if isinstance(raw.get("bai"), list) else []):
        if not isinstance(b, dict):
            continue
        if isinstance(b.get("tieu_de"), str):
            texts.append(b["tieu_de"])
            where.append((bi, "tieu_de"))
        for j, p in enumerate(b.get("doan") or [] if isinstance(b.get("doan"), list) else []):
            if isinstance(p, str):
                texts.append(p)
                where.append((bi, j))
    return texts, where


def clean_vi(s: Any) -> Any:
    """Chuỗi tiếng Việt không đánh dấu (tóm tắt, giải thích, lựa chọn…)."""
    if not isinstance(s, str):
        return s
    s = paper.surface(s)
    s = re.sub(r"\*\*|__|(?<!\w)\*(?!\s)|^#+\s*", "", s)
    return re.sub(r"\s+", " ", s.replace("{", "").replace("}", "").replace("[", "(").replace("]", ")")
                  .replace("|", "/")).strip()


def fix_marks(s: Any, items: dict[int, dict[str, Any]], notes: list[str]) -> Any:
    """Chuẩn hoá đánh dấu của Gemini thành {chữ||#số}; số không có trong danh sách → bỏ đánh dấu (giữ chữ)."""
    if not isinstance(s, str):
        return s

    def norm(m: Any) -> str:
        txt, n = m.group(1).strip(), int(m.group(2))
        if n not in items or not txt:
            notes.append("bỏ đánh dấu trỏ tới mục không có")
            return txt
        return "{%s||#%d}" % (txt, n)
    out = LOOSE_MARK.sub(norm, s)
    # mọi đánh dấu hợp lệ giữ nguyên; ký tự đánh dấu lạ còn sót ngoài đánh dấu → bỏ
    parts = []
    for t in paper.tokenize(out):
        if t[0] == "word":
            m = KEY_RE.match(t[3].strip())
            if m and int(m.group(1)) in items and t[1].strip():
                parts.append("{%s||#%d}" % (t[1].strip(), int(m.group(1))))
            else:
                notes.append("bỏ đánh dấu sai khuôn")
                parts.append(t[1])
        elif t[0] == "ruby":
            notes.append("bỏ đánh dấu sai khuôn")
            parts.append(t[1])
        else:
            p = t[1]
            if re.search(r"#\s*\d", p):
                notes.append("bỏ số thẻ (#…) lộ ra bài")
                for rx in NUM_LEAK:
                    p = rx.sub("", p)
            if any(c in p for c in "{}[]|"):
                notes.append("bỏ ký tự đánh dấu lạ")
                p = p.replace("{", "").replace("}", "").replace("[", "(").replace("]", ")").replace("|", "/")
            parts.append(p)
    s2 = "".join(parts)
    s2 = re.sub(r"\*\*|__", "", s2)
    return re.sub(r"[ \t]+", " ", s2).strip()


def _limit_links(texts: list[str]) -> list[str]:
    """Mỗi mục tối đa LINK_PER_ITEM chỗ, cả số tối đa LINK_MAX chỗ (thừa thì thành chữ trơn)."""
    count: dict[str, int] = {}
    total = 0
    out = []
    for t in texts:
        parts = []
        for tok in paper.tokenize(t):
            if tok[0] == "word":
                k = tok[3]
                if count.get(k, 0) < LINK_PER_ITEM and total < LINK_MAX:
                    count[k] = count.get(k, 0) + 1
                    total += 1
                    parts.append("{%s||%s}" % (tok[1], k))
                else:
                    parts.append(tok[1])
            else:
                parts.append(tok[1])
        out.append("".join(parts))
    return out


def _auto_link(texts: list[str], items: dict[int, dict[str, Any]], total: int | None = None) -> list[str]:
    """Máy nối thêm: mặt trước ngắn (2–40 ký tự) của một mục có NGUYÊN VĂN trong bài (một bài: tiêu đề + các đoạn)
    mà bài đó chưa đánh dấu → đánh dấu lần xuất hiện đầu tiên (ngoài các chỗ đã đánh dấu, không cắt giữa chữ, không
    phân biệt hoa thường)."""
    used = {k for t in texts for k in paper.keys(t)}
    total = sum(len(paper.keys(t)) for t in texts) if total is None else total
    out = list(texts)
    for n, it in sorted(items.items()):
        key = "#%d" % n
        front = it["truoc"]
        if key in used or not 2 <= len(front) <= 40 or total >= LINK_MAX:
            continue
        pat = re.compile(("(?<!\\w)" if front[0].isalnum() and not CJK_RE.match(front[0]) else "") + re.escape(front) +
                         ("(?!\\w)" if front[-1].isalnum() and not CJK_RE.match(front[-1]) else ""), re.I)
        for i, t in enumerate(out):
            done = False
            parts = []
            for tok in paper.tokenize(t):
                if tok[0] == "plain" and not done:
                    m = pat.search(tok[1])
                    if m:
                        parts.append(tok[1][:m.start()] + "{%s||%s}" % (m.group(0), key) + tok[1][m.end():])
                        done = True
                        continue
                parts.append(tok[1] if tok[0] == "plain" else "{%s||%s}" % (tok[1], tok[3]) if tok[0] == "word"
                             else tok[1])
            if done:
                out[i] = "".join(parts)
                used.add(key)
                total += 1
                break
    return out


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: bỏ chép chính tả / mẫu câu / từ mới (báo tiếng Việt không có), chuẩn hoá đánh dấu, đổi
    "dung" dạng chuỗi số, bỏ markdown; máy nối thêm chỗ nhắc nguyên văn mặt trước của thẻ."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    items = _items(scope)
    for k in ("chinh_ta", "mau_cau", "tu_moi"):
        if raw.get(k):
            notes.append("bỏ %s (báo tiếng Việt không có)" % k)
        raw[k] = []
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if not isinstance(b, dict):
            continue
        b["tieu_de"] = fix_marks(b.get("tieu_de"), items, notes)
        if isinstance(b.get("doan"), list):
            b["doan"] = [fix_marks(p, items, notes) for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
        if isinstance(b.get("ky"), str) and b["ky"].isdigit():
            b["ky"] = int(b["ky"])
        if isinstance(b.get("ky_truoc"), str):
            b["ky_truoc"] = clean_vi(b["ky_truoc"])
        b.pop("dich", None)
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            q["hoi"] = clean_vi(q.get("hoi"))
            if isinstance(q.get("chon"), list):
                q["chon"] = [clean_vi(o) for o in q["chon"]]
            if isinstance(q.get("dung"), str) and q["dung"].isdigit():
                q["dung"] = int(q["dung"])
            q["giai_thich"] = clean_vi(q.get("giai_thich"))
    for k in ("tom_tat", "tom_tat_truyen"):
        if isinstance(raw.get(k), str):
            raw[k] = clean_vi(raw[k])
    texts, where = _issue_texts(raw)
    if items:       # máy nối thêm theo từng bài (tin làng, truyện, góc ôn bài đều gạch chân được thẻ đó)
        total = sum(len(paper.keys(t)) for t in texts)
        for bi in dict.fromkeys(b for b, _slot in where):
            idx = [i for i, (b, _slot) in enumerate(where) if b == bi]
            linked = _auto_link([texts[i] for i in idx], items, total)
            total += sum(len(paper.keys(t)) for t in linked) - sum(len(paper.keys(texts[i])) for i in idx)
            for i, t in zip(idx, linked):
                texts[i] = t
    texts = _limit_links(texts)
    bai = raw.get("bai")
    for (bi, slot), s in zip(where, texts):
        if slot == "tieu_de":
            bai[bi]["tieu_de"] = s
        else:
            bai[bi]["doan"][slot] = s
    return raw, list(dict.fromkeys(notes))


def plain_issue(raw: Any) -> Any:
    """Bản gửi Gemini sửa / soát: GIỮ đánh dấu {chữ||#số} (Gemini được dặn giữ nguyên)."""
    return copy.deepcopy(raw)


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

def _foreign_ok(s: str, items: dict[int, dict[str, Any]]) -> list[str]:
    """Cụm chữ Nhật / Trung / Hàn không có trong thẻ nào (bài tiếng Việt nhắc nguyên văn từ của thẻ thì được)."""
    hay = " ".join(it["truoc"] + " " + it["sau"] for it in items.values())
    return [m.group(0) for m in re.finditer(r"[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff]+", s)
            if m.group(0) not in hay]


def check_text(rep: Any, where: str, value: Any, ctx: dict[str, Any], required: bool = True) -> None:
    """Một chuỗi tiếng Việt của bài (có thể có đánh dấu {chữ||#số})."""
    if not isinstance(value, str) or not value.strip():
        if required:
            rep.err(where, "cần một chuỗi tiếng Việt không rỗng")
        return
    for t in paper.tokenize(value):
        if t[0] == "plain" and any(c in t[1] for c in "{}[]|"):
            rep.err(where, "có ký tự đánh dấu lạ gần: …%s…" % t[1][:24])
        elif t[0] == "ruby":
            rep.err(where, "đánh dấu sai khuôn (chỉ dùng {chữ||#số})")
        elif t[0] == "word":
            m = KEY_RE.match(t[3])
            if not m or int(m.group(1)) not in ctx["items"]:
                rep.err(where, 'đánh dấu "%s" không trỏ tới mục nào trong DANH SÁCH THẺ' % t[3])
            else:
                ctx["used"].add(int(m.group(1)))
    s = paper.surface(value)
    if re.search(r"#\s*\d", s):
        rep.err(where, "lộ số thẻ (#…) trong bài — số chỉ nằm trong đánh dấu {chữ||#số}")
    if len(s) >= 30 and not VI_MARK_RE.search(s):
        rep.err(where, 'phải viết bằng tiếng Việt CÓ DẤU: "%s…"' % s[:40])
    odd = _foreign_ok(s, ctx["items"])
    if odd:
        rep.warn(where, "có chữ Nhật / Trung / Hàn không có trong thẻ: %s" % "、".join(odd[:4]))


def check_vi(rep: Any, where: str, value: Any, required: bool = True) -> None:
    if not isinstance(value, str) or not value.strip():
        if required:
            rep.err(where, "cần một câu tiếng Việt")
        return
    if len(value.strip()) >= 15 and not VI_MARK_RE.search(value):
        rep.err(where, "phải viết bằng tiếng Việt (có dấu)")
    if any(c in value for c in "{}|"):
        rep.err(where, "phần này không dùng ký tự { } |")


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Việt. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = ai.Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    short = bool(opts.get("short"))
    items = _items(scope)
    ctx: dict[str, Any] = {"items": items, "used": set()}
    bai = raw.get("bai")
    lo_n, hi_n = (1, 2) if short else (2, 4) if opts.get("no_story") else (3, 5)
    if not isinstance(bai, list) or not lo_n <= len(bai) <= hi_n:
        rep.err("bai", "cần %d–%d bài" % (lo_n, hi_n))
        bai = bai if isinstance(bai, list) else []
    total = 0
    story_seen = False
    for i, b in enumerate(bai):
        where = "bai[%d]" % i
        if not isinstance(b, dict):
            rep.err(where, "phải là object")
            continue
        if b.get("loai") not in ai.LOAI_AI:
            rep.err(where + ".loai", "phải là một trong %s" % ", ".join(ai.LOAI_AI))
        if b.get("loai") == "truyen":
            story_seen = True
            if short:
                rep.err(where, "số rút gọn không viết tiếp truyện")
            ky = b.get("ky")
            if not isinstance(ky, int) or isinstance(ky, bool) or ky < 1:
                rep.err(where + ".ky", "truyện cần số kỳ (số nguyên ≥ 1)")
            elif opts.get("ky") and ky != opts["ky"]:
                rep.err(where + ".ky", "kỳ này phải là kỳ %d" % opts["ky"])
            if isinstance(ky, int) and ky > 1:
                check_vi(rep, where + ".ky_truoc", b.get("ky_truoc"))
        check_text(rep, where + ".tieu_de", b.get("tieu_de"), ctx)
        if isinstance(b.get("tieu_de"), str) and len(paper.surface(b["tieu_de"])) > 100:
            rep.err(where + ".tieu_de", "tiêu đề dài quá (tối đa khoảng 12 chữ)")
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 7:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 7)")
        for j, p in enumerate(doan):
            check_text(rep, "%s.doan[%d]" % (where, j), p, ctx)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else len(words(p))
                if len(p) > 1500:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = SHORT_LENGTH if short else LENGTH
    if opts.get("story_plain") and story_seen and not short:     # truyện viết sẵn không tính vào độ dài
        lo, hi = int(lo * 0.45), int(hi * 0.7)
    elif opts.get("no_story") and not short:
        lo, hi = int(lo * 0.6), int(hi * 0.75)
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d chữ), cần khoảng %d–%d chữ" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d chữ), cần khoảng %d–%d chữ" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d chữ, nên trong khoảng %d–%d" % (total, lo, hi))

    qs = raw.get("cau_hoi")
    want_q = (0, 1) if short else QUESTIONS
    if not isinstance(qs, list) or not want_q[0] <= len(qs) <= want_q[1]:
        rep.err("cau_hoi", "cần %d–%d câu hỏi" % want_q)
        qs = qs if isinstance(qs, list) else []
    for i, q in enumerate(qs):
        where = "cau_hoi[%d]" % i
        if not isinstance(q, dict):
            rep.err(where, "phải là object")
            continue
        check_vi(rep, where + ".hoi", q.get("hoi"))
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            if not isinstance(o, str) or not o.strip():
                rep.err("%s.chon[%d]" % (where, j), "lựa chọn rỗng")
            elif len(o) > 160:
                rep.err("%s.chon[%d]" % (where, j), "lựa chọn dài quá (tối đa khoảng 20 chữ)")
        norm = [re.sub(r"\W+", " ", o).strip().lower() for o in chon if isinstance(o, str)]
        if len(set(norm)) != len(norm):
            rep.err(where + ".chon", "có hai lựa chọn giống nhau")
        d = q.get("dung")
        if isinstance(d, bool) or not isinstance(d, int) or not 0 <= d < len(chon):
            rep.err(where + ".dung", "phải là vị trí (tính từ 0) của đáp án đúng")
        check_vi(rep, where + ".giai_thich", q.get("giai_thich"))
    if len(qs) >= 3 and len({q.get("dung") for q in qs if isinstance(q, dict)}) == 1:
        rep.warn("cau_hoi", "mọi câu đều có đáp án ở cùng một vị trí")
    check_vi(rep, "tom_tat", raw.get("tom_tat"))
    if story_seen and not short:
        check_vi(rep, "tom_tat_truyen", raw.get("tom_tat_truyen"))
    # số mục (thẻ) được dùng
    n_items = len(items)
    used = ctx["used"]
    need = 2 if short else min(5, max(1, n_items // 3))
    if n_items >= 6 and len(used) < need:
        rep.err("bai", "chỉ nhắc tới %d mục trong DANH SÁCH THẺ; đưa thêm nội dung của ít nhất %d thẻ vào bài (đúng kiến "
                "thức ghi ở mặt sau) và đánh dấu {chữ||#số}" % (len(used), need))
    elif n_items >= 12 and not short and len(used) < 8:
        rep.warn("bai", "mới dùng %d thẻ; nên dùng 8–15 thẻ" % len(used))
    due = set(scope.get("can_on") or [])
    if due and not short and len(used & due) < min(4, len(due)):
        rep.warn("bai", "mới dùng %d thẻ TRỌNG TÂM (đến hạn ôn hôm nay): %s" % (
            len(used & due), ", ".join("#%d" % n for n in sorted(due)[:8])))
    return rep


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

STORY_SETUP = """Truyện dài kỳ "Quán trọ nhỏ ở làng Kotoba". Làng Kotoba là làng nhỏ yên bình cạnh khu vườn Kotoba;
mùa và thời tiết theo ngày thật ở Việt Nam.
Nhân vật (giữ nhất quán):
- Lin: cô gái 22 tuổi mới đến làm ở quán trọ nhỏ "Quán Kotoba", ham học, hay hỏi, đôi khi nhớ nhầm nhưng tự sửa.
- Bà Hana: bà chủ quán, khoảng 30 tuổi, điềm tĩnh, hiểu biết, có một bí mật về quá khứ của quán.
- StackChan: robot nhỏ của khu vườn, tò mò, nói câu ngắn, hay vẽ tranh pixel, hiểu câu nói theo nghĩa đen (gây cười).
- Ông trưởng làng: hiền, thích kể chuyện ngày xưa, hay kể quá dài.
Mỗi kỳ là một tình huống nhỏ trong làng hoặc ở quán, kết hơi bỏ ngỏ.
Lời thoại để trong ngoặc kép "…" hoặc sau dấu gạch đầu dòng, ghi rõ ai nói."""

RULES = """QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Viết HOÀN TOÀN bằng tiếng Việt có dấu, tự nhiên như báo / truyện Việt Nam; chữ của thẻ (từ tiếng nước ngoài, thuật ngữ)
  được viết nguyên văn như trong thẻ.
- Mỗi lần bài nhắc tới nội dung một thẻ trong DANH SÁCH THẺ, đánh dấu cụm chữ đó bằng {cụm chữ trong bài||#số của thẻ},
  ví dụ: Năm 938, {Ngô Quyền||#12} đánh tan quân Nam Hán trên {sông Bạch Đằng||#13}. Mỗi thẻ đánh dấu 1–2 chỗ.
  Số thẻ CHỈ nằm trong đánh dấu: không viết "Thẻ #12", "(#12)" hay số thẻ ra bài.
  Không dùng [ ] { } | cho việc gì khác; không markdown (* _ #).
- Kiến thức phải ĐÚNG với mặt sau của thẻ: không bịa thêm số liệu, tên, ngày tháng trái với thẻ. Không chắc thì viết
  chung chung hơn.
- Đây là báo vui cho người đang ôn bài, không phải sách giáo khoa: câu rõ, ấm áp, hơi hài hước."""


def season_text(date: datetime.date) -> str:
    m = date.month
    s = "xuân" if m in (1, 2, 3) else "hạ" if m in (4, 5, 6) else "thu" if m in (7, 8, 9) else "đông"
    days = ("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật")
    return "%s, ngày %d/%d/%d, mùa %s ở Việt Nam" % (days[date.weekday()], date.day, date.month, date.year, s)


def system_prompt(level: str = "") -> str:
    lo, hi = LENGTH
    return (
        "Bạn là người viết báo làng \"%s\" (bản tiếng Việt của 畑新聞) cho người Việt đang ôn bài bằng thẻ Anki "
        "(lịch sử, khoa học, y khoa, luật, ngoại ngữ… tuỳ thẻ của họ).\n"
        "Mục đích: đọc báo vui mà nhớ lại kiến thức trong thẻ. Đan nội dung các thẻ vào tin làng, truyện, góc ôn bài một "
        "cách tự nhiên, đúng kiến thức.\n"
        "Viết tiếng Việt tự nhiên, ấm áp, hơi hài hước; câu rõ ràng. Nội dung hoàn toàn mới.\n"
        "Độ dài phần bài của cả số báo: khoảng %d–%d chữ.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (MASTHEAD, lo, hi, RULES))


def item_lines(scope: dict[str, Any], limit: int = ITEMS) -> str:
    """Danh sách thẻ gửi Gemini: "#số | mặt trước | mặt sau", thẻ trọng tâm (đến hạn ôn) đánh dấu ★."""
    due = set(scope.get("can_on") or [])
    rows = [m for m in scope.get("muc") or [] if isinstance(m, dict)]
    rows = [m for m in rows if m["id"] in due] + [m for m in rows if m["id"] not in due]
    return "\n".join("#%d%s | %s | %s" % (m["id"], " ★" if m["id"] in due else "", m["truoc"], m["sau"])
                     for m in rows[:limit])


def no_deck_text() -> str:
    return ("NGƯỜI ĐỌC CHƯA CHỌN THẺ: không có DANH SÁCH THẺ, không đánh dấu {..||#..}. Viết tin làng, truyện và một góc "
            "kiến thức chung thú vị, chắc chắn đúng (thiên nhiên, lịch sử, khoa học đời thường…) hợp mùa hiện tại; câu "
            "hỏi hỏi về nội dung trong bài.")


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    short = bool(opts.get("short"))
    ky = int(opts.get("ky") or 1)
    has_items = bool(scope.get("muc"))
    parts = ["HÔM NAY: %s. Số báo %d." % (season_text(date), int(opts.get("so") or 1))]
    third = ("3. loai \"cot\": \"Góc ôn bài\" — StackChan hoặc bà Hana kể lại / giải thích 3–5 thẻ (ưu tiên thẻ ★) một "
             "cách dễ nhớ (mẹo nhớ, so sánh, chuyện vui), mỗi thẻ một đoạn ngắn bắt đầu bằng \"◆ \"; tiêu đề kiểu "
             "\"Sổ tay StackChan\"." if has_items else
             "3. loai \"cot\": \"Góc kiến thức\" — 3–4 điều thú vị (mỗi điều một đoạn ngắn bắt đầu bằng \"◆ \"), tiêu đề "
             "kiểu \"StackChan tò mò\".")
    qtext = ("cau_hoi: %d–%d câu trắc nghiệm tiếng Việt hỏi lại KIẾN THỨC CỦA THẺ có trong số báo (đáp án tìm được trong "
             "bài), mỗi câu đúng 3 lựa chọn ngắn, CHỈ MỘT đáp án đúng, \"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí "
             "giữa các câu), \"giai_thich\" 1 câu chỉ ra bài nói gì." % QUESTIONS)
    if short:
        parts.append(
            "ĐÂY LÀ SỐ RÚT GỌN (người đọc còn nhiều số chưa đọc): chỉ 1 bài loai \"tin_lang\" ngắn (2–3 đoạn) nhắc lại "
            "vài thẻ, cau_hoi để rỗng hoặc 1 câu. KHÔNG viết truyện. Tin làng có thể nhắc nhẹ là các nhân vật đang chờ "
            "người đọc.")
    elif opts.get("no_story") or opts.get("story_plain"):
        sp = opts.get("story_plain")
        parts.append(
            "CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ%s):\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba và khu vườn Kotoba, dùng nhân vật của truyện, 3–4 đoạn%s.\n%s\n"
            "Tiêu đề ngắn kiểu tiêu đề báo (4–10 chữ).\n%s%s" % (
                ": máy tự chèn truyện đã viết sẵn làm bài giữa" if sp else "", " (đừng kể lại truyện)" if sp else "",
                third.replace("3. ", "2. "), qtext,
                ("\nĐỘ DÀI: hai bài này tổng khoảng %d–%d chữ (truyện không tính).\nTRUYỆN ĐÃ VIẾT SẴN (kỳ %d, để đặt câu "
                 "hỏi):\n%s" % (int(LENGTH[0] * 0.45), int(LENGTH[1] * 0.7), ky,
                                json.dumps({"tieu_de": sp["tieu_de"], "doan": sp["doan"]}, ensure_ascii=False))) if sp else ""))
    else:
        parts.append(
            "CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba và khu vườn Kotoba, dùng nhân vật của truyện, 3–4 đoạn.\n"
            "2. loai \"truyen\": kỳ %d của truyện dài kỳ, \"ky\": %d, 3–4 đoạn, kết hơi bỏ ngỏ; \"ky_truoc\": %s.\n%s\n"
            "Tiêu đề ngắn kiểu tiêu đề báo (4–10 chữ).\n%s\n"
            "tom_tat_truyen: 1 câu tóm tắt kỳ %d (để kỳ sau viết tiếp)." % (
                ky, ky, "\"\" (kỳ 1)" if ky == 1 else "1 câu tóm tắt kỳ %d" % (ky - 1), third, qtext, ky))
    parts.append("chinh_ta, mau_cau, tu_moi: để rỗng []. tom_tat: 1–2 câu tóm tắt số báo.")
    if has_items:
        due = scope.get("can_on") or []
        parts.append(
            "DÙNG THẺ: nhắc tới nội dung của khoảng 8–15 thẻ khác nhau (ưu tiên thẻ ★ — người đọc phải ôn hôm nay), dùng "
            "được bao nhiêu thì dùng, đừng ép câu. Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều thẻ hợp nhau."
            + (" Thẻ ★: %s." % ", ".join("#%d" % n for n in due[:FOCUS]) if due else ""))
    else:
        parts.append(no_deck_text())
    recent = [h for h in history[-3:] if isinstance(h, dict)]
    if recent:
        parts.append("3 SỐ GẦN NHẤT (tránh lặp lại chủ đề): " +
                     "; ".join("%s: %s" % (h.get("ngay"), h.get("tom_tat", "")[:100]) for h in recent))
    if not short and not opts.get("no_story") and not opts.get("story_plain"):
        parts.append("TRUYỆN:\n" + STORY_SETUP)
        tone = ai.story_core.tone_text(opts.get("tones") or opts.get("tone"))
        if tone:
            parts.append("CHỦ ĐỀ TRUYỆN: " + tone)
        if story:
            parts.append("ĐÃ XẢY RA:\n" + "\n".join("- Kỳ %s (%s): %s" % (s.get("ky"), s.get("ngay"), s.get("tom_tat"))
                                                     for s in story[-10:]))
            if story[-1].get("nguyen_van"):
                parts.append("NGUYÊN VĂN KỲ TRƯỚC (viết tiếp, không mâu thuẫn):\n" + "\n".join(story[-1]["nguyen_van"]))
        else:
            parts.append("ĐÃ XẢY RA: (chưa có kỳ nào, đây là kỳ 1: Lin đến làng Kotoba và bắt đầu làm ở Quán Kotoba)")
    if has_items:
        parts.append("DANH SÁCH THẺ NGƯỜI ĐỌC ĐANG ÔN (#số | mặt trước | mặt sau; ★ = đến hạn ôn hôm nay):\n" + item_lines(scope))
    parts.append(
        "VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):\n"
        '{"loai":"tin_lang","tieu_de":"StackChan vẽ lại trận Bạch Đằng","doan":["Chiều qua, StackChan bày cả hộp màu ra '
        'sân. \\"Năm 938, {Ngô Quyền||#12} cắm cọc gỗ dưới lòng sông!\\" cậu reo lên, rồi cắm luôn bút chì xuống luống rau."]}')
    return "\n\n".join(parts)


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo tiếng Việt (JSON). Sửa ĐÚNG các lỗi này, giữ nguyên phần còn "
        "lại (giữ các đánh dấu {chữ||#số} đúng), rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\n"
        "LỖI:\n- " + "\n- ".join(errors[:40]) + "\n\n" + RULES +
        ("\n\nDANH SÁCH THẺ (#số | mặt trước | mặt sau):\n" + item_lines(scope) if scope.get("muc") else "") +
        "\n\nSỐ BÁO:\n" + json.dumps(raw, ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    return (
        "Bạn là biên tập viên, soát lại số báo tiếng Việt dưới đây trước khi in. Người đọc dùng báo để ôn lại thẻ Anki.\n"
        "Kiểm tra kỹ:\n"
        "1. KIẾN THỨC: mọi chỗ nhắc tới thẻ có đúng với mặt sau của thẻ không (số liệu, tên, ngày tháng, định nghĩa). Sai "
        "→ sửa cho đúng thẻ. Không bịa thêm chi tiết trái với thẻ.\n"
        "2. Đánh dấu {chữ||#số}: số có đúng thẻ được nhắc tới không; GIỮ NGUYÊN các đánh dấu đúng (người đọc bấm vào để "
        "xem lại thẻ), không gỡ bỏ.\n"
        "3. Tiếng Việt tự nhiên, đúng chính tả, có dấu; không lẫn tiếng Anh không cần thiết.\n"
        "4. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "5. Tiêu đề, tom_tat, ky_truoc viết đúng với bài; nhân vật nhất quán (bà Hana là chủ quán, Lin là nhân viên mới).\n"
        "6. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì, sua = câu mới). Không có lỗi thì "
        "van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Bài truyện (loai truyen) đã qua "
        "biên tập: chỉ sửa lỗi thật sự, không viết lại. chinh_ta, mau_cau, tu_moi để rỗng.\n\n%s\n\n%s%s"
        "SỐ BÁO:\n%s" % (
            RULES,
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            ("DANH SÁCH THẺ (#số | mặt trước | mặt sau):\n" + item_lines(scope) + "\n\n") if scope.get("muc") else "",
            json.dumps(raw, ensure_ascii=False)))
