"""Báo 畑新聞 bản tiếng Việt — "Báo Làng Kotoba" (1.25.1; 1.25.2 làm lại theo "Một làng, một truyện").

Người dùng (08/11): "báo Tiếng Việt chỉ đơn giản là truyện và tin tức là được, không cần phải theo nội dung deck … quan
trọng là câu chuyện hay, để người đọc mong chờ số mới" → chọn "Một làng, một truyện": mỗi ngày làng có MỘT bản gốc tiếng
Việt (kỳ truyện + tin làng + mục thứ ba, `story_core` / `ai_core.ensure_master`, thư mục chung `bao_chung/`). Báo tiếng
Nhật / tiếng Anh kể lại bản gốc theo trình độ; báo tiếng Việt (dành cho người không học tiếng Nhật / tiếng Anh) in thẳng
truyện của bản gốc, Gemini viết bài tin làng + mục thứ ba từ tin của bản gốc và 2–3 câu hỏi đọc hiểu (nhận xu).

Không có giọng đọc, chép chính tả, bản dịch, furigana, mẫu câu, chỗ tra từ (tiếng mẹ đẻ). Dùng chung khung `ai_core.Job`
(thư mục `user_files/bao_gemini_vi/`, khoá đọc `kotoba_batake_paper_vi`).

File này không import aqt (test được bằng python thường).
"""

from __future__ import annotations

import copy
import datetime
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
# số chữ (tách theo khoảng trắng) của tin làng + mục thứ ba (truyện của bản gốc chèn thẳng, không tính)
LENGTH = (200, 600)
SHORT_LENGTH = (90, 320)
QUESTIONS = (2, 4)

VI_MARK_RE = re.compile(r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]", re.I)
MARKUP_RE = re.compile(r"[\[\]{}|]")


def scope(level: str = "") -> dict[str, Any]:
    """Báo tiếng Việt không lấy từ deck."""
    return {"lang": "vi", "nguon": "lang", "trinh_do": "", "tu_vung": [], "kho": [], "ngu_phap": [],
            "trong_tam": {"tu": [], "ngu_phap": []}, "can_on": [], "sap_quen": [], "loi_sai": [], "sach": {}, "decks": []}


def build_lookup(texts: list[str], scope: dict[str, Any]) -> dict[str, Any]:
    return {"tra_tu": {}, "tra_mau": {}, "tra_sach": {}}


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    return [0, 0]


def deck_count(raw: Any, scope: dict[str, Any]) -> int:
    return 0


def link_count(raw: Any) -> int:
    return 0


# ---------------------------------------------------------------------------
# Sửa máy
# ---------------------------------------------------------------------------

def words(s: str) -> list[str]:
    return [w for w in re.split(r"\s+", paper.surface(s or "")) if re.search(r"\w", w)]


def clean_vi(s: Any) -> Any:
    """Chuỗi tiếng Việt: bỏ mọi đánh dấu / markdown, gộp khoảng trắng."""
    if not isinstance(s, str):
        return s
    s = paper.surface(s)
    s = re.sub(r"\*\*|__|(?<!\w)\*(?!\s)|^#+\s*", "", s)
    s = s.replace("{", "").replace("}", "").replace("[", "(").replace("]", ")").replace("|", "/")
    return re.sub(r"[ \t]+", " ", s).strip()


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    """Sửa chắc chắn đúng: bỏ chép chính tả / mẫu câu / từ mới / bản dịch (báo tiếng Việt không có), bỏ đánh dấu, đổi
    "dung" dạng chuỗi số."""
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    for k in ("chinh_ta", "mau_cau", "tu_moi"):
        if raw.get(k):
            notes.append("bỏ %s (báo tiếng Việt không có)" % k)
        raw[k] = []

    def vi(v: Any) -> Any:
        if isinstance(v, str) and (MARKUP_RE.search(v) or "**" in v):
            notes.append("bỏ ký tự đánh dấu / markdown")
        return clean_vi(v)
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if not isinstance(b, dict):
            continue
        b["tieu_de"] = vi(b.get("tieu_de"))
        if isinstance(b.get("doan"), list):
            b["doan"] = [vi(p) for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
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
    return raw, list(dict.fromkeys(notes))


def plain_issue(raw: Any) -> Any:
    return copy.deepcopy(raw)


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

def check_text(rep: Any, where: str, value: Any, required: bool = True) -> None:
    if not isinstance(value, str) or not value.strip():
        if required:
            rep.err(where, "cần một chuỗi tiếng Việt không rỗng")
        return
    if MARKUP_RE.search(value):
        rep.err(where, "không dùng ký tự [ ] { } |")
    if len(value.strip()) >= 30 and not VI_MARK_RE.search(value):
        rep.err(where, 'phải viết bằng tiếng Việt CÓ DẤU: "%s…"' % value.strip()[:40])


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Any:
    """Kiểm tra một số báo tiếng Việt. Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = ai.Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    short = bool(opts.get("short"))
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
        check_text(rep, where + ".tieu_de", b.get("tieu_de"))
        if isinstance(b.get("tieu_de"), str) and len(b["tieu_de"]) > 100:
            rep.err(where + ".tieu_de", "tiêu đề dài quá (tối đa khoảng 12 chữ)")
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 7:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 7)")
        for j, p in enumerate(doan):
            check_text(rep, "%s.doan[%d]" % (where, j), p)
            if isinstance(p, str):
                total += 0 if (opts.get("story_plain") and b.get("loai") == "truyen") else len(words(p))
                if len(p) > 1500:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    lo, hi = SHORT_LENGTH if short else LENGTH
    if not short and not opts.get("story_plain") and story_seen:      # truyện viết chung trong số (không có bản gốc)
        lo, hi = int(lo * 1.6), int(hi * 1.8)
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
        check_text(rep, where + ".hoi", q.get("hoi"))
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
        check_text(rep, where + ".giai_thich", q.get("giai_thich"))
    if len(qs) >= 3 and len({q.get("dung") for q in qs if isinstance(q, dict)}) == 1:
        rep.warn("cau_hoi", "mọi câu đều có đáp án ở cùng một vị trí")
    check_text(rep, "tom_tat", raw.get("tom_tat"))
    if story_seen and not short:
        check_text(rep, "tom_tat_truyen", raw.get("tom_tat_truyen"), required=False)
    return rep


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

STORY_SETUP = """Truyện dài kỳ "Quán trọ nhỏ ở làng Kotoba" (truyện chung của báo làng). Làng Kotoba là làng nhỏ yên bình
cạnh khu vườn Kotoba, bốn mùa rõ rệt theo lịch thật.
Nhân vật (giữ nhất quán): Lin (cô gái Việt Nam mới đến làm ở Quán Kotoba, ham học, câu cửa miệng "Để em ghi lại đã!"),
bà Hana (bà chủ quán, điềm tĩnh, có một bí mật về quá khứ của quán), StackChan (robot nhỏ của khu vườn, xưng "tớ", hiểu
câu nói theo nghĩa đen), ông trưởng làng (thích kể chuyện ngày xưa quá dài).
Mỗi kỳ là một tình huống nhỏ trong làng hoặc ở quán, kết hơi bỏ ngỏ. Lời thoại để trong ngoặc kép, ghi rõ ai nói."""

RULES = """QUY TẮC (máy sẽ kiểm tra, sai là phải viết lại):
- Viết HOÀN TOÀN bằng tiếng Việt có dấu, tự nhiên như báo / truyện Việt Nam.
- Chữ trơn: không dùng [ ] { } |, không markdown (* _ #).
- Đây là báo vui của làng: câu rõ, ấm áp, hơi hài hước."""


def season_text(date: datetime.date) -> str:
    m = date.month
    s = "xuân" if m in (3, 4, 5) else "hạ" if m in (6, 7, 8) else "thu" if m in (9, 10, 11) else "đông"
    days = ("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật")
    return "%s, ngày %d/%d/%d, mùa %s" % (days[date.weekday()], date.day, date.month, date.year, s)


def system_prompt(level: str = "") -> str:
    lo, hi = LENGTH
    return (
        "Bạn là người viết báo làng \"%s\" (bản tiếng Việt của 畑新聞) — báo vui hằng ngày của một làng nhỏ, có truyện dài "
        "kỳ khiến người đọc mong số sau.\n"
        "Viết tiếng Việt tự nhiên, ấm áp, hơi hài hước; câu rõ ràng. Nội dung hoàn toàn mới.\n"
        "Độ dài tin làng + bài thứ ba (không tính truyện): khoảng %d–%d chữ.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (MASTHEAD, lo, hi, RULES))


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    short = bool(opts.get("short"))
    ky = int(opts.get("ky") or 1)
    lo, hi = LENGTH
    third = "thong_bao" if date.day % 2 == 0 else "cot"
    parts = ["HÔM NAY: %s. Số báo %d.%s" % (season_text(date), int(opts.get("so") or 1),
                                           (" Thời tiết ở làng: %s." % opts["thoi_tiet"]) if opts.get("thoi_tiet") else "")]
    third_text = ("loai \"thong_bao\": Thông báo của làng — 2–3 mục, mỗi mục một đoạn ngắn bắt đầu bằng \"◆ \"; tiêu đề "
                  "\"Thông báo của làng\"." if third == "thong_bao" else
                  "loai \"cot\": cột ngắn của một nhân vật (StackChan, bà Hana hoặc ông trưởng làng), 1–2 đoạn, giọng riêng "
                  "của nhân vật; tiêu đề kiểu \"Góc của StackChan\".")
    qtext = ("cau_hoi: %d–%d câu trắc nghiệm tiếng Việt về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn "
             "ngắn, CHỈ MỘT đáp án đúng, \"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" "
             "1 câu chỉ ra bài nói gì." % QUESTIONS)
    if short:
        parts.append(
            "ĐÂY LÀ SỐ RÚT GỌN (người đọc còn nhiều số chưa đọc): chỉ 1 bài loai \"tin_lang\" ngắn (2–3 đoạn), cau_hoi để "
            "rỗng hoặc 1 câu. KHÔNG viết truyện. Tin làng có thể nhắc nhẹ là các nhân vật đang chờ người đọc.")
    elif opts.get("no_story") or opts.get("story_plain"):
        sp = opts.get("story_plain")
        parts.append(
            "CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG viết truyện dài kỳ%s):\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba, 3–4 đoạn%s.\n2. %s\nTiêu đề ngắn kiểu tiêu đề báo (4–10 chữ).\n%s%s" % (
                ": máy tự chèn truyện hôm nay làm bài giữa" if sp else "", " (đừng kể lại truyện)" if sp else "",
                third_text, qtext,
                ("\nĐỘ DÀI: hai bài này tổng khoảng %d–%d chữ.\nTRUYỆN HÔM NAY (kỳ %d, để đặt câu hỏi):\n%s" % (
                    lo, hi, ky, json.dumps({"tieu_de": sp["tieu_de"], "doan": sp["doan"]}, ensure_ascii=False))) if sp else ""))
    else:
        parts.append(
            "CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:\n"
            "1. loai \"tin_lang\": tin trong làng Kotoba, 3–4 đoạn.\n"
            "2. loai \"truyen\": kỳ %d của truyện dài kỳ, \"ky\": %d, 3 đoạn (mỗi đoạn 60–140 chữ), kết bằng một móc câu.\n"
            "3. %s\nTiêu đề ngắn kiểu tiêu đề báo (4–10 chữ).\n%s\n"
            "tom_tat_truyen: 1 câu tóm tắt kỳ %d (để kỳ sau viết tiếp)." % (ky, ky, third_text, qtext, ky))
    news = ai.master_news(opts, "tiếng Việt").replace("KỂ LẠI đúng các tin này bằng tiếng Việt đúng trình độ",
                                                       "viết từ đúng các tin này (được viết dài hơn, thêm chi tiết đời thường)")
    if news:
        parts.append(news)
    goc = ai.story_goc_text(opts, "tiếng Việt")
    if goc:
        parts.append(goc.replace("KỂ LẠI đúng chuyện này bằng tiếng Việt đúng trình độ", "CHÉP NGUYÊN VĂN chuyện này"))
    parts.append("chinh_ta, mau_cau, tu_moi: để rỗng []. tom_tat: 1–2 câu tóm tắt số báo.")
    recent = [h for h in history[-3:] if isinstance(h, dict)]
    if recent:
        parts.append("3 SỐ GẦN NHẤT (tránh lặp lại): " +
                     "; ".join("%s: %s" % (h.get("ngay"), h.get("tom_tat", "")[:100]) for h in recent))
    if not short and not opts.get("no_story") and not opts.get("story_plain") and not opts.get("story_goc"):
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
    parts.append(
        "VÍ DỤ ĐỊNH DẠNG (chỉ xem hình thức, không chép nội dung):\n"
        '{"loai":"tin_lang","tieu_de":"Chợ phiên đầu đông","doan":["Sáng nay chợ phiên đông hơn mọi tuần. Bác đưa thư '
        'kể rằng có người mang tới cả một xe bí ngô to bằng cái ghế."]}')
    return "\n\n".join(parts)


def repair_prompt(raw: Any, errors: list[str], scope: dict[str, Any]) -> str:
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo tiếng Việt (JSON). Sửa ĐÚNG các lỗi này, giữ nguyên phần còn "
        "lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\nLỖI:\n- " + "\n- ".join(errors[:40]) + "\n\n" + RULES +
        "\n\nSỐ BÁO:\n" + json.dumps(raw, ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    return (
        "Bạn là biên tập viên, soát lại số báo tiếng Việt dưới đây trước khi in.\nKiểm tra kỹ:\n"
        "1. Tiếng Việt tự nhiên, đúng chính tả, có dấu.\n"
        "2. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "3. Tiêu đề, tom_tat viết đúng với bài; nhân vật nhất quán (bà Hana là chủ quán, Lin là nhân viên mới).\n"
        "4. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì, sua = câu mới). Không có lỗi thì "
        "van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). Bài truyện (loai truyen) đã qua "
        "biên tập: chỉ sửa lỗi chính tả thật sự, không viết lại. chinh_ta, mau_cau, tu_moi để rỗng.\n\n%s\n\n%s"
        "SỐ BÁO:\n%s" % (
            RULES,
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            json.dumps(raw, ensure_ascii=False)))
