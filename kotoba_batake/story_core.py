"""ことば畑 1.23 — truyện dài kỳ của báo Gemini theo quy trình mới (kế hoạch 1.23 mục 5c, đã thử với Gemini thật).

Trước 1.23 truyện viết chung một lượt với cả số báo, trong một khuôn JSON chặt kèm hàng chục quy tắc furigana, lời
nhắc chỉ ghi "một tình huống nhỏ trong ngày" và bảo nhồi từ trọng tâm → truyện nhạt, gượng ("có 2 cái đĩa, rửa đĩa").
Kỳ sau chỉ biết một câu tóm tắt của kỳ trước nên hay mâu thuẫn.

Quy trình mới (mỗi số báo thường, khi "Truyện: Hay hơn"):
  0. Lập mạch truyện cho một đợt 6–8 kỳ (mục tiêu, bí ẩn, các bước, kết) — khoảng mỗi tuần một lượt gọi.
  1. Nhà văn viết kỳ truyện (chữ trơn, chưa furigana): hồ sơ nhân vật, bước của mạch cho kỳ này, NGUYÊN VĂN kỳ trước,
     chỗ bỏ ngỏ, 1–2 mẫu ngữ pháp đang học làm chất liệu, một kỳ mẫu hay; kèm bản dịch tiếng Việt từng đoạn.
  2. Biên tập chấm 4 tiêu chí (có chuyện xảy ra, nhân vật, bất ngờ / hài, móc câu) + khớp kỳ trước + trình độ + tự
     nhiên, ghi góp ý cụ thể.
  3. Có tiêu chí dưới 4 thì viết lại một lần theo góp ý.
  4. Lượt viết số báo (ai_core.Job) chép truyện vào bài thứ 2, thêm furigana (tiếng Anh: máy chèn thẳng), viết các bài
     còn lại, câu hỏi, chép chính tả như cũ.
Hết lượt / lỗi giữa chừng: dùng bản nháp đã qua máy kiểm tra; không có bản nào thì để lượt viết số tự viết truyện như
bản cũ ("Tiết kiệm") — không bỏ cả số.

Bộ nhớ truyện ở thư mục báo Gemini (chỉ trên máy này, không đồng bộ):
  truyen.json      danh sách kỳ (định dạng cũ {ky, ngay, tom_tat} + thêm nguyen_van, nhan_vat_moi, bo_ngo, da_giai,
                   diem, phan_hoi) — bản 1.22 vẫn đọc / ghi được (giữ nguyên các khoá lạ của từng kỳ)
  truyen_mach.json mạch của đợt đang viết (file riêng: bản 1.22 không đụng tới)

File này không import aqt; phần gọi Gemini dùng Job của ai_core (truyền vào).
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

try:
    from . import paper_core as paper
except ImportError:  # chạy test
    import paper_core as paper  # type: ignore[no-redef]

MODES = ("hay", "tiet_kiem", "tat")          # Truyện: Hay hơn (mặc định) / Tiết kiệm (như cũ, ít lượt) / Tắt
# Chủ đề truyện (1.23: "Giọng truyện", một lựa chọn; 1.25.1: thêm 4 chủ đề, chọn được nhiều — mỗi đợt 6–8 kỳ theo một
# chủ đề trong số đã chọn, xoay vòng; người dùng: "chọn chủ đề họ muốn nghe (kinh dị, hài, dễ thương, hoặc chọn nhiều)")
TONES = ("am", "hai", "de_thuong", "kinh_di", "bi_an", "phieu_luu", "lang_man", "ky_ao")
TONE_NAME = {"am": "Ấm áp đời thường", "hai": "Hài", "de_thuong": "Dễ thương", "kinh_di": "Kinh dị nhẹ",
             "bi_an": "Bí ẩn", "phieu_luu": "Phiêu lưu", "lang_man": "Lãng mạn nhẹ", "ky_ao": "Kỳ ảo"}
TONE_TEXT = {
    "am": "Ấm áp đời thường: chuyện nhỏ trong làng và quán trọ nhưng CÓ CHUYỆN XẢY RA, cảm xúc dịu, xen chút hài.",
    "hai": "Hài: tình huống dở khóc dở cười, hiểu lầm, lời nói nhầm, thoại vui — vẫn nhẹ nhàng, không chế giễu ai.",
    "de_thuong": "Dễ thương: chuyện nhỏ đáng yêu (con vật, trẻ con, món quà nhỏ, hiểu lầm ngộ nghĩnh), thoại tươi vui, "
                 "kết ấm lòng.",
    "kinh_di": "Kinh dị nhẹ: chuyện lạ / chuyện ma trong làng (tiếng động ban đêm, bóng người bên giếng, đồ vật tự dời chỗ) "
               "gây rùng mình và tò mò; KHÔNG máu me, không bạo lực, không ai chết; lời giải có thể bất ngờ hoặc để lại "
               "một chút rợn.",
    "bi_an": "Bí ẩn: đồ vật lạ, dấu vết, câu hỏi chưa có lời đáp kéo dài nhiều kỳ; hồi hộp nhưng không đáng sợ.",
    "phieu_luu": "Phiêu lưu: nhân vật rời quán đi tìm / đi tới chỗ mới trong làng, gặp thử thách nhỏ, tự xoay xở.",
    "lang_man": "Lãng mạn nhẹ: cảm mến e thẹn, lá thư không ký tên, cuộc hẹn bị lỡ… trong sáng, nhẹ nhàng, không uỷ mị.",
    "ky_ao": "Kỳ ảo: một chút phép lạ như truyện cổ tích (cây biết nói, cánh cửa dẫn sang mùa khác, ngôi sao rơi xuống "
             "vườn) với luật lệ riêng nhất quán qua các kỳ.",
}


def norm_tones(raw: Any) -> list[str]:
    """Chủ đề đã chọn (chuỗi một chủ đề kiểu 1.23 hoặc danh sách) → danh sách hợp lệ, không rỗng."""
    if isinstance(raw, str):
        raw = [raw]
    out = [t for t in dict.fromkeys(raw if isinstance(raw, (list, tuple)) else []) if t in TONES]
    return out or ["am"]


def next_tone(tones: Any, arc: dict[str, Any] | None) -> str:
    """Chủ đề cho đợt mới: chủ đề kế tiếp (xoay vòng) sau chủ đề của đợt trước trong danh sách đã chọn."""
    ts = norm_tones(tones)
    prev = (arc or {}).get("giong")
    if prev in ts:
        return ts[(ts.index(prev) + 1) % len(ts)] if len(ts) > 1 else ts[0]
    return ts[0]


def tone_text(tones: Any, main: str | None = None) -> str:
    """Câu dặn chủ đề cho lời nhắc: chủ đề chính (của đợt) + các chủ đề khác người đọc thích (pha nhẹ)."""
    ts = norm_tones(tones)
    main = main if main in TONES else ts[0]
    rest = [t for t in ts if t != main]
    out = TONE_TEXT[main]
    if rest:
        out += " Người đọc cũng thích: %s — có thể pha nhẹ, nhưng giữ %s là chính." % (
            ", ".join(TONE_NAME[t] for t in rest), TONE_NAME[main])
    return out
ARC_LEN = (6, 8)            # số kỳ của một đợt
MAX_CALLS = 6               # trần số lượt gọi THÀNH CÔNG cho phần truyện của một số báo (mạch, nháp ×2, biên tập, viết lại)
MAX_REQUESTS = 24           # trần tổng số yêu cầu (kể cả lượt lỗi bận / hết hạn mức khi đổi model) — chặn chạy quá lâu
STORY_FILE = "truyen.json"
ARC_FILE = "truyen_mach.json"
FEEDBACK = ("hay", "nhat")

# ---------------------------------------------------------------------------
# Nhân vật, quy tắc, kỳ mẫu
# ---------------------------------------------------------------------------

BIBLE_JA = """TRUYỆN DÀI KỲ 『ことば村の小さな旅館』 — làng nhỏ ことば村 cạnh khu vườn ことば畑; mùa và thời tiết theo ngày thật ở Nhật.
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; giữ nhất quán qua mọi kỳ):
- リンさん: cô gái Việt Nam 22 tuổi mới đến làm ở quán trọ「ことば屋」. Muốn được はなさん tin tưởng giao việc một mình. Sợ nói sai làm
  khách buồn. Hay nhầm kính ngữ / mẫu câu (đúng mẫu người học đang học), nhầm xong tự nhận ra và sửa. Câu cửa miệng:「がんばります！」
- はなさん: bà chủ (女将さん) của ことば屋, khoảng 30 tuổi, điềm tĩnh, nói kính ngữ với khách, thân mật với Lin. Có một bí mật về quá
  khứ của quán, hé ra dần qua nhiều đợt (chưa kể hết). Gọi là はなさん hoặc 女将さん, KHÔNG gọi là 店長.
- スタックちゃん: robot nhỏ của khu vườn, tò mò, xưng ぼく, nói thân mật, hay vẽ tranh pixel. Hiểu câu nói thường ngày theo nghĩa đen
  (gây cười) — chỉ dùng câu nói đơn giản, KHÔNG dùng thành ngữ khó.
- 村長（そんちょう）: trưởng làng, hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách trọ có mục đích riêng, người đưa thư 郵便屋さん, con mèo hoang trắng.
Lời thoại trong「…」, ghi rõ ai nói; lời chào / nhờ vả hợp vai (Lin là người mới, nói よろしくお願いします với はなさん)."""

BIBLE_EN = """TRUYỆN DÀI KỲ "The Little Café by the Garden" — Kotoba Village, làng nhỏ ven biển nói tiếng Anh cạnh khu vườn Kotoba
Farm; mùa và thời tiết theo ngày thật ở Anh.
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; tên viết đúng như sau, giữ nhất quán):
- Linh: cô gái Việt Nam 22 tuổi mới đến làm ở quán "The Kettle Café". Muốn Hana tin tưởng giao quán một mình. Sợ khách cười
  tiếng Anh của mình. Đôi khi nhầm từ / thì (đúng mẫu người học đang học), nhầm xong tự sửa. Câu cửa miệng: "I can do this!"
- Hana: chủ The Kettle Café, khoảng 30 tuổi, điềm tĩnh, tốt bụng. Có một bí mật về quá khứ của quán, hé ra dần (chưa kể hết).
- StackChan: robot nhỏ của khu vườn, tò mò, câu ngắn, vui vẻ, hay vẽ tranh pixel. Hiểu câu nói thường ngày theo nghĩa đen
  (gây cười) — chỉ câu đơn giản ("Hold on", "Keep an eye on it"), không thành ngữ khó.
- Mr. Oakley: trưởng làng (the mayor), hiền, kể chuyện ngày xưa quá dài.
- Ben: người đưa thư vui tính, biết mọi tin trong làng.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách có mục đích riêng, một con mèo hoang trắng, một đứa trẻ trong làng.
Lời thoại trong ngoặc kép "…", ghi rõ ai nói (said Linh, Hana asked…)."""

RULES = """CÁCH VIẾT MỘT KỲ HAY (bắt buộc):
1. Một cảnh, 2–3 nhân vật. Mở đầu bằng hành động hoặc lời thoại, KHÔNG mở bằng tả thời tiết.
2. Có MỘT vấn đề cụ thể: nhân vật muốn gì, cái gì cản (hiểu lầm, đồ bị mất, khách khó tính, lời nói nhầm…); nhân vật tự xoay xở.
3. Dùng mẫu ngữ pháp đang học làm CHẤT LIỆU của chuyện (vd. nói nhầm mẫu → hiểu lầm → buồn cười), không chèn cho có.
4. Có ít nhất một chi tiết bất ngờ hoặc buồn cười, và một khoảnh khắc cảm xúc nhỏ.
5. Kết bằng một móc câu: câu hỏi chưa có lời đáp, vật lạ, câu nói bỏ dở. KHÔNG kết bằng bài học hay lời khuyên.
6. Không liệt kê đồ vật, không câu chỉ để dùng từ (kiểu「〜が2個あります」). Không lặp lại tình huống của các kỳ trước.
7. Nối tiếp kỳ trước: KHÔNG mâu thuẫn với chuyện đã xảy ra (đồ đã mở thì không "lần đầu mở" nữa…), giải quyết hoặc đẩy tiếp
   một chỗ bỏ ngỏ.
8. Thoại thể hiện tính cách, ghi rõ ai nói. Câu ngắn, tự nhiên, đúng trình độ: chỉ dùng từ trong DANH SÁCH TỪ và từ rất cơ
   bản; tối đa 2 từ ngoài danh sách (ghi vào tu_moi kèm nghĩa). Không thành ngữ / chữ Hán khó hơn trình độ."""

# Kỳ mẫu viết sẵn (theo kỳ 1 của bản Claude Code): chỉ để xem cách kể — nhầm mẫu câu thành chuyện, có vật lạ, móc câu
SAMPLE_JA = """「お客様、お名前をお書きします！」リンさんは大きな声で言いました。お客様は目を丸くして、「えっ、書いてくれるんですか」と聞きました。はなさんが小さな声で「リンさん、『お書きください』ですよ」と言いました。
リンさんの顔は真っ赤になりました。でも、お客様は笑って、古い地図をテーブルに出しました。「この村に、むかし小さな店がありましたか。」地図の山の中に、赤い丸が一つありました。
はなさんは地図を見て、少しの間、何も言いませんでした。それから「あら、ここは……」とだけ言いました。スタックちゃんが窓の外を見ると、山の上に白いけむりが一本、まっすぐ上がっていました。"""

SAMPLE_EN = """"Can I take your order?" Linh asked. The old man smiled. "Yes. One cup of tea, please. And one memory." Linh did not understand. "Sorry, we don't sell memories," she said. In the kitchen, Hana laughed softly.
The man put an old photo on the table. It showed The Kettle Café, but the sign was different. A young girl stood at the door with a red umbrella. "Do you know her?" he asked.
Hana came out and looked at the photo for a long time. Her finger stopped on the girl's face. "Where did you find this?" she whispered. Outside, the wind pushed the door open, and the little bell rang twice."""

# 1.25.1: báo tiếng Việt (người không học tiếng Nhật / tiếng Anh) — cùng nhân vật, viết bằng tiếng Việt, chất liệu là
# kiến thức trong thẻ người đọc đang ôn (không phải mẫu ngữ pháp)
BIBLE_VI = """TRUYỆN DÀI KỲ "Quán trọ nhỏ ở làng Kotoba" — làng nhỏ yên bình cạnh khu vườn Kotoba; mùa và thời tiết theo
ngày thật ở Việt Nam.
Nhân vật (mỗi người một điều muốn, một điều sợ, một câu cửa miệng; giữ nhất quán qua mọi kỳ):
- Lin: cô gái 22 tuổi mới đến làm ở quán trọ "Quán Kotoba". Muốn bà Hana tin tưởng giao quán một mình. Ham học, hay ghi
  chép vào cuốn sổ nhỏ, đôi khi nhớ nhầm một chi tiết rồi tự nhận ra và sửa. Câu cửa miệng: "Để em ghi lại đã!"
- Bà Hana: bà chủ quán, khoảng 30 tuổi, điềm tĩnh, hiểu biết nhiều chuyện. Có một bí mật về quá khứ của quán, hé ra dần.
- StackChan: robot nhỏ của khu vườn, tò mò, nói câu ngắn, xưng "tớ", hay vẽ tranh pixel. Hiểu câu nói thường ngày theo
  nghĩa đen (gây cười).
- Ông trưởng làng: hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ của đợt (mỗi đợt chọn một): một vị khách trọ có mục đích riêng, bác đưa thư, con mèo hoang trắng.
Lời thoại để trong ngoặc kép "…", ghi rõ ai nói."""

SAMPLE_VI = """"Bà Hana ơi, khách phòng số ba muốn ăn sáng bằng... một tấm bản đồ!" Lin chạy vào bếp, tay vẫn cầm cuốn sổ nhỏ. Bà Hana đặt ấm trà xuống. "Bản đồ à?" StackChan lập tức chui vào tủ, lôi ra một chiếc đĩa. "Tớ có đĩa. Bản đồ thì chưa nấu bao giờ."
Ông khách già trải lên bàn một tấm bản đồ cũ, mép giấy đã ngả vàng. Ở góc dưới có một vòng tròn đỏ, ngay chỗ khu vườn Kotoba bây giờ. "Ngày xưa, ở đây có một cái giếng," ông nói khẽ. "Tôi đã hứa sẽ quay lại."
Bà Hana nhìn vòng tròn đỏ rất lâu mà không nói gì. Lin định hỏi thì ngoài sân vang lên tiếng nước chảy róc rách — ở đúng chỗ chưa từng có cái giếng nào."""

RULES_VI = """CÁCH VIẾT MỘT KỲ HAY (bắt buộc):
1. Một cảnh, 2–3 nhân vật. Mở đầu bằng hành động hoặc lời thoại, KHÔNG mở bằng tả thời tiết.
2. Có MỘT vấn đề cụ thể: nhân vật muốn gì, cái gì cản (hiểu lầm, đồ bị mất, khách khó tính, nhớ nhầm…); nhân vật tự xoay xở.
3. Dùng nội dung 2–4 thẻ trong DANH SÁCH THẺ làm CHẤT LIỆU của chuyện (nhân vật nhắc tới, tranh luận, nhớ nhầm rồi
   sửa đúng theo thẻ…), đúng kiến thức ghi ở mặt sau; không chèn cho có, không giảng bài.
4. Có ít nhất một chi tiết bất ngờ hoặc buồn cười, và một khoảnh khắc cảm xúc nhỏ.
5. Kết bằng một móc câu: câu hỏi chưa có lời đáp, vật lạ, câu nói bỏ dở. KHÔNG kết bằng bài học hay lời khuyên.
6. Không liệt kê, không lặp lại tình huống của các kỳ trước.
7. Nối tiếp kỳ trước: KHÔNG mâu thuẫn với chuyện đã xảy ra, giải quyết hoặc đẩy tiếp một chỗ bỏ ngỏ.
8. Thoại thể hiện tính cách, ghi rõ ai nói. Tiếng Việt tự nhiên, đúng chính tả, có dấu; chữ trơn (không [ ] { } |,
   không markdown)."""

_S = {"type": "STRING"}
_SL = {"type": "ARRAY", "items": _S}
ARC_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {"ten": _S, "muc_tieu": _S, "bi_an": _S, "nhan_vat_phu": _S, "buoc": _SL, "ket": _S},
    "required": ["ten", "muc_tieu", "bi_an", "nhan_vat_phu", "buoc", "ket"],
    "propertyOrdering": ["ten", "muc_tieu", "bi_an", "nhan_vat_phu", "buoc", "ket"],
}
STORY_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "dan_y": {"type": "OBJECT", "properties": {"muon": _S, "tro_ngai": _S, "bat_ngo": _S, "moc_cau": _S},
                  "required": ["muon", "tro_ngai", "bat_ngo", "moc_cau"],
                  "propertyOrdering": ["muon", "tro_ngai", "bat_ngo", "moc_cau"]},
        "tieu_de": _S, "doan": _SL, "dich": _SL,
        "tu_moi": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"w": _S, "r": _S, "m": _S},
                                               "required": ["w", "r", "m"], "propertyOrdering": ["w", "r", "m"]}},
        "nho": {"type": "OBJECT", "properties": {"tom_tat": _S, "nhan_vat_moi": _SL, "bo_ngo": _SL, "da_giai": _SL},
                "required": ["tom_tat", "bo_ngo"], "propertyOrdering": ["tom_tat", "nhan_vat_moi", "bo_ngo", "da_giai"]},
    },
    "required": ["dan_y", "tieu_de", "doan", "dich", "tu_moi", "nho"],
    "propertyOrdering": ["dan_y", "tieu_de", "doan", "dich", "tu_moi", "nho"],
}
_I = {"type": "INTEGER"}
CRIT = ("su_kien", "nhan_vat", "bat_ngo", "moc_cau", "khop", "trinh_do", "tu_nhien")
EDIT_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {"diem": {"type": "OBJECT", "properties": {k: _I for k in CRIT}, "required": list(CRIT),
                            "propertyOrdering": list(CRIT)},
                   "loi": _SL, "goi_y": _SL},
    "required": ["diem", "loi", "goi_y"],
    "propertyOrdering": ["diem", "loi", "goi_y"],
}

# ---------------------------------------------------------------------------
# Bộ nhớ truyện
# ---------------------------------------------------------------------------


def _read(path: str, default: Any) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def _write(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def _str(v: Any, n: int) -> str:
    return v.strip()[:n] if isinstance(v, str) else ""


def _strs(v: Any, n: int, each: int) -> list[str]:
    return [x for x in (_str(s, each) for s in (v if isinstance(v, list) else [])[:n]) if x]


def clean_episode(raw: Any) -> dict[str, Any] | None:
    """Một kỳ trong truyen.json (đọc được cả định dạng cũ {ky, ngay, tom_tat})."""
    if not isinstance(raw, dict) or isinstance(raw.get("ky"), bool) or not isinstance(raw.get("ky"), int):
        return None
    out: dict[str, Any] = {"ky": raw["ky"], "ngay": _str(raw.get("ngay"), 10), "tom_tat": _str(raw.get("tom_tat"), 400),
                           "nguyen_van": _strs(raw.get("nguyen_van"), 6, 1500), "tieu_de": _str(raw.get("tieu_de"), 120),
                           "nhan_vat_moi": _strs(raw.get("nhan_vat_moi"), 6, 120), "bo_ngo": _strs(raw.get("bo_ngo"), 8, 200),
                           "da_giai": _strs(raw.get("da_giai"), 8, 200)}
    d = raw.get("diem")
    if isinstance(d, dict):
        out["diem"] = {k: int(v) for k, v in d.items() if k in CRIT and isinstance(v, int) and not isinstance(v, bool)}
    fb = raw.get("phan_hoi")
    if isinstance(fb, dict) and fb.get("y") in FEEDBACK:
        out["phan_hoi"] = {"y": fb["y"], "ghi": _str(fb.get("ghi"), 200)}
    return out


def load_story(base: str) -> list[dict[str, Any]]:
    raw = _read(os.path.join(base, STORY_FILE), [])
    out = [e for e in (clean_episode(x) for x in (raw if isinstance(raw, list) else [])) if e]
    return sorted(out, key=lambda e: e["ky"])[-60:]


def load_arc(base: str) -> dict[str, Any] | None:
    raw = _read(os.path.join(base, ARC_FILE), None)
    if not isinstance(raw, dict) or not isinstance(raw.get("tu_ky"), int):
        return None
    buoc = _strs(raw.get("buoc"), 10, 300)
    if not buoc:
        return None
    return {"ten": _str(raw.get("ten"), 120), "muc_tieu": _str(raw.get("muc_tieu"), 300), "bi_an": _str(raw.get("bi_an"), 300),
            "nhan_vat_phu": _str(raw.get("nhan_vat_phu"), 200), "buoc": buoc, "ket": _str(raw.get("ket"), 300),
            "tu_ky": raw["tu_ky"], "giong": raw.get("giong") if raw.get("giong") in TONES else "am",
            "dot": raw.get("dot") if isinstance(raw.get("dot"), int) else 1}


def arc_step(arc: dict[str, Any] | None, ky: int) -> int | None:
    """Vị trí của kỳ `ky` trong mạch (0…), None nếu mạch đã hết / chưa có."""
    if not arc:
        return None
    i = ky - arc["tu_ky"]
    return i if 0 <= i < len(arc["buoc"]) else None


def save_episode(base: str, date: str, ky: int, story: dict[str, Any], plain_title: str = "") -> None:
    """Ghi kỳ vừa đăng vào truyen.json (giữ định dạng danh sách cũ, thêm khoá mới)."""
    raw = _read(os.path.join(base, STORY_FILE), [])
    raw = raw if isinstance(raw, list) else []
    keep = [x for x in raw if isinstance(x, dict) and x.get("ky") != ky]
    nho = story.get("nho") if isinstance(story.get("nho"), dict) else {}
    item = {"ky": ky, "ngay": date, "tom_tat": _str(nho.get("tom_tat"), 300) or _str(story.get("tom_tat"), 300),
            "tieu_de": plain_title or _str(story.get("tieu_de"), 120),
            "nguyen_van": _strs(story.get("doan"), 6, 1500),
            "nhan_vat_moi": _strs(nho.get("nhan_vat_moi"), 6, 120), "bo_ngo": _strs(nho.get("bo_ngo"), 8, 200),
            "da_giai": _strs(nho.get("da_giai"), 8, 200)}
    if isinstance(story.get("diem"), dict):
        item["diem"] = story["diem"]
    keep.append(item)
    _write(os.path.join(base, STORY_FILE), keep[-60:])


def set_feedback(base: str, ky: int, y: str, note: str = "") -> bool:
    """Người đọc chấm kỳ `ky`: "hay" / "nhat" + một dòng ghi chú. Kỳ sau (nhà văn + biên tập) đọc phản hồi này."""
    if y not in FEEDBACK or not isinstance(ky, int):
        return False
    path = os.path.join(base, STORY_FILE)
    raw = _read(path, [])
    if not isinstance(raw, list):
        return False
    for x in raw:
        if isinstance(x, dict) and x.get("ky") == ky:
            x["phan_hoi"] = {"y": y, "ghi": re.sub(r"\s+", " ", note or "").strip()[:200]}
            _write(path, raw)
            return True
    raw.append({"ky": ky, "ngay": "", "tom_tat": "", "phan_hoi": {"y": y, "ghi": re.sub(r"\s+", " ", note or "").strip()[:200]}})
    _write(path, raw[-60:])
    return True


def feedback_of(base: str, ky: int) -> dict[str, Any] | None:
    for e in load_story(base):
        if e["ky"] == ky:
            return e.get("phan_hoi")
    return None


def open_threads(story: list[dict[str, Any]], arc: dict[str, Any] | None) -> list[str]:
    """Chỗ bỏ ngỏ còn mở (của đợt hiện tại): mọi bo_ngo trừ những gì kỳ sau ghi đã giải quyết."""
    eps = [e for e in story if not arc or e["ky"] >= arc["tu_ky"]]
    done = {x for e in eps for x in e.get("da_giai", [])}
    out: list[str] = []
    for e in eps:
        for x in e.get("bo_ngo", []):
            if x not in done and x not in out:
                out.append(x)
    return out[-8:]


# ---------------------------------------------------------------------------
# Lời nhắc
# ---------------------------------------------------------------------------


def _vocab(scope: dict[str, Any], lang: str, limit: int) -> str:
    rows = scope.get("kho") or scope.get("tu_vung") or []
    seen, words = set(), []
    for r in list(rows) + list(scope.get("tu_vung") or []):
        if isinstance(r, list) and r and isinstance(r[0], str) and r[0] not in seen:
            seen.add(r[0])
            words.append(r[0])
        if len(words) >= limit:
            break
    return (", " if lang == "en" else "、").join(words)


def _grammar(scope: dict[str, Any], n: int = 6) -> str:
    rows = [g for g in scope.get("ngu_phap") or [] if isinstance(g, dict)]
    focus = set((scope.get("trong_tam") or {}).get("ngu_phap") or [])
    pick = [g for g in rows if g.get("id") in focus][:n] or rows[-n:]
    return "\n".join("- %s: %s" % (g.get("mau", ""), g.get("nghia", "")) for g in pick)


def _ep_text(e: dict[str, Any]) -> str:
    return "\n".join(e.get("nguyen_van") or []) or e.get("tom_tat", "")


def _bible(lang: str) -> str:
    return BIBLE_EN if lang == "en" else BIBLE_VI if lang == "vi" else BIBLE_JA


def _first_ep(lang: str) -> str:
    return {"en": "Linh đến Kotoba Village và bắt đầu làm ở The Kettle Café.",
            "vi": "Lin đến làng Kotoba và bắt đầu làm ở Quán Kotoba."}.get(lang, "リンさん bắt đầu làm ở ことば屋.")


def _vi_items(scope: dict[str, Any], limit: int = 40) -> str:
    """1.25.1: thẻ người đọc đang ôn (báo tiếng Việt), ★ = đến hạn ôn hôm nay."""
    due = set(scope.get("can_on") or [])
    rows = [m for m in scope.get("muc") or [] if isinstance(m, dict)]
    rows = [m for m in rows if m.get("id") in due] + [m for m in rows if m.get("id") not in due]
    return "\n".join("#%s%s | %s | %s" % (m.get("id"), " ★" if m.get("id") in due else "", m.get("truoc", ""), m.get("sau", ""))
                     for m in rows[:limit])


def arc_prompt(lang: str, tone: str, story: list[dict[str, Any]], ky: int, season: str, tones: Any = None) -> str:
    prev = "\n".join("- Kỳ %d: %s" % (e["ky"], e["tom_tat"]) for e in story[-8:] if e.get("tom_tat")) or "(chưa có kỳ nào)"
    bible = _bible(lang)
    return "\n\n".join([
        bible, "CHỦ ĐỀ CỦA ĐỢT NÀY: " + tone_text(tones or [tone], tone),
        "CÁC KỲ ĐÃ ĐĂNG:\n" + prev,
        "HÔM NAY: %s. Đợt mới bắt đầu từ kỳ %d." % (season, ky),
        "Lập MẠCH TRUYỆN cho một đợt %d–%d kỳ (mỗi kỳ đăng một ngày): ten = tên đợt (tiếng Việt); muc_tieu = điều nhân vật "
        "chính muốn đạt trong đợt; bi_an = câu hỏi / bí ẩn kéo suốt đợt; nhan_vat_phu = nhân vật phụ của đợt (một người / con "
        "vật, kèm điều họ muốn); buoc = mỗi phần tử là MỘT kỳ (tiếng Việt, 1–2 câu: chuyện gì xảy ra, trở ngại, móc câu); "
        "ket = đợt kết thúc thế nào (giải được bí ẩn, có thay đổi nhỏ ở nhân vật, để lại một sợi chỉ cho đợt sau). "
        "Nối tiếp các kỳ đã đăng, không lặp lại chuyện cũ. Hợp mùa hiện tại." % ARC_LEN,
        "Trả về đúng một object JSON theo khuôn."])


def writer_prompt(lang: str, scope: dict[str, Any], ky: int, tone: str, arc: dict[str, Any] | None,
                  story: list[dict[str, Any]], season: str, problems: list[str] | None = None, tones: Any = None) -> str:
    level = scope.get("trinh_do", "A2" if lang == "en" else "N4")
    prev = [e for e in story if e["ky"] < ky]
    last = prev[-1] if prev else None
    step = arc_step(arc, ky)
    parts = [_bible(lang), "CHỦ ĐỀ TRUYỆN: " + tone_text(tones or [tone], tone)]
    if arc:
        parts.append("MẠCH CỦA ĐỢT「%s」: muốn: %s · bí ẩn: %s · nhân vật phụ: %s · kết: %s\nCác bước:\n%s" % (
            arc["ten"], arc["muc_tieu"], arc["bi_an"], arc["nhan_vat_phu"], arc["ket"],
            "\n".join("%s kỳ %d: %s" % ("→" if i == step else " ", arc["tu_ky"] + i, b) for i, b in enumerate(arc["buoc"]))))
        if step is not None:
            parts.append("KỲ NÀY (kỳ %d) theo bước: %s%s" % (ky, arc["buoc"][step],
                                                             " — đây là kỳ CUỐI của đợt: giải bí ẩn, kết ấm." if step == len(arc["buoc"]) - 1 else ""))
    eps = [e for e in prev if not arc or e["ky"] >= arc["tu_ky"]][-7:]
    if eps:
        parts.append("ĐÃ XẢY RA TRONG ĐỢT:\n" + "\n".join("- Kỳ %d: %s" % (e["ky"], e["tom_tat"]) for e in eps if e.get("tom_tat")))
    if last and last.get("nguyen_van"):
        parts.append("NGUYÊN VĂN KỲ TRƯỚC (kỳ %d, viết tiếp từ đây, không mâu thuẫn):\n%s" % (last["ky"], _ep_text(last)))
    elif not prev:
        parts.append("ĐÂY LÀ KỲ 1: " + _first_ep(lang))
    th = open_threads(story, arc)
    if th:
        parts.append("CHỖ BỎ NGỎ CÒN MỞ (giải quyết hoặc đẩy tiếp 1 chỗ):\n- " + "\n- ".join(th))
    fb = [e for e in prev[-4:] if e.get("phan_hoi")]
    if fb:
        parts.append("NGƯỜI ĐỌC NHẬN XÉT (lắng nghe):\n" + "\n".join(
            "- Kỳ %d: %s%s" % (e["ky"], "Hay" if e["phan_hoi"]["y"] == "hay" else "Nhạt",
                                ' — "%s"' % e["phan_hoi"]["ghi"] if e["phan_hoi"].get("ghi") else "") for e in fb))
    parts.append("HÔM NAY: %s. Viết KỲ %d." % (season, ky))
    lo, hi = story_length(lang, level)
    if lang == "vi":      # 1.25.1: báo tiếng Việt — chất liệu là thẻ người đọc đang ôn, không dịch, không từ mới
        items = _vi_items(scope)
        parts.append(RULES_VI + "\n9. Độ dài: 3 đoạn, mỗi đoạn %d–%d chữ (truyện là một bài trong số báo)." % (lo, hi))
        parts.append(("DANH SÁCH THẺ NGƯỜI ĐỌC ĐANG ÔN (#số | mặt trước | mặt sau; ★ = đến hạn ôn hôm nay):\n" + items)
                     if items else "NGƯỜI ĐỌC CHƯA CHỌN THẺ: viết truyện hay, có thể lồng một kiến thức chung chắc chắn đúng.")
        parts.append("VÍ DỤ MỘT KỲ HAY (chỉ xem cách kể: hiểu lầm thành chuyện, có vật lạ, móc câu; KHÔNG chép nội dung):\n"
                     + SAMPLE_VI)
        if problems:
            parts.append("BẢN TRƯỚC BỊ MÁY KIỂM TRA TRẢ LẠI (tránh các lỗi này):\n- " + "\n- ".join(problems[:12]))
        parts.append(
            "Trả về đúng một object JSON theo khuôn: dan_y (muon, tro_ngai, bat_ngo, moc_cau), tieu_de (ngắn, 3–10 chữ), "
            "doan = 3 đoạn tiếng Việt chữ trơn, dich = [] (để rỗng), tu_moi = [] (để rỗng), nho (tom_tat = 2 câu chuyện gì "
            "xảy ra; nhan_vat_moi; bo_ngo = chỗ bỏ ngỏ kỳ sau cần giải quyết; da_giai = chỗ bỏ ngỏ cũ kỳ này đã giải quyết).")
        return "\n\n".join(parts)
    parts.append("MẪU NGỮ PHÁP ĐANG HỌC (dùng 1–2 mẫu làm CHẤT LIỆU của chuyện):\n" + _grammar(scope))
    parts.append(RULES + "\n9. Độ dài: đúng 3 đoạn, mỗi đoạn %d–%d %s (truyện là một bài trong số báo, đừng viết dài hơn)." % (
        lo, hi, "từ tiếng Anh" if lang == "en" else "ký tự tiếng Nhật"))
    vocab = _vocab(scope, lang, 400)
    if vocab:
        parts.append(("DANH SÁCH TỪ ĐÃ HỌC (trình độ %s):\n" % level) + vocab)
    else:                 # 1.25.1: không dùng deck — viết theo trình độ
        parts.append("KHÔNG CÓ DANH SÁCH TỪ (người học chưa chọn deck): dùng từ thông dụng đúng trình độ %s, tối đa 2 từ "
                     "khó hơn (ghi vào tu_moi kèm nghĩa)." % level)
    parts.append("VÍ DỤ MỘT KỲ HAY (chỉ xem cách kể: nhầm mẫu câu thành chuyện, có vật lạ, móc câu; KHÔNG chép nội dung, "
                 "nhân vật phụ, đồ vật):\n" + (SAMPLE_EN if lang == "en" else SAMPLE_JA))
    if problems:
        parts.append("BẢN TRƯỚC BỊ MÁY KIỂM TRA TRẢ LẠI (tránh các lỗi này):\n- " + "\n- ".join(problems[:12]))
    parts.append(
        "Trả về đúng một object JSON theo khuôn: dan_y (tiếng Việt: muon, tro_ngai, bat_ngo, moc_cau), tieu_de (%s), "
        "doan = 3 đoạn %s, dich = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn (cùng số phần tử, không có chữ %s — tên riêng viết "
        "Latin: Lin, Hana, Stack-chan, quán Kotoba, làng Kotoba; không ghi chú trong ngoặc), tu_moi (≤ 2 từ ngoài danh sách: w, r = %s, m = nghĩa tiếng Việt), nho (tiếng Việt: tom_tat = 2 "
        "câu chuyện gì xảy ra; nhan_vat_moi; bo_ngo = chỗ bỏ ngỏ kỳ sau cần giải quyết; da_giai = chỗ bỏ ngỏ cũ kỳ này đã "
        "giải quyết)." % (
            "tiếng Anh, 3–8 từ" if lang == "en" else "tiếng Nhật, ngắn",
            "tiếng Anh (chữ trơn, không đánh dấu)" if lang == "en" else
            "tiếng Nhật (chữ Hán + kana, KHÔNG furigana, KHÔNG romaji, không [ ] { } |)",
            "Anh / Nhật" if lang == "en" else "Nhật",
            "phiên âm IPA /…/" if lang == "en" else "cách đọc bằng HIRAGANA"))
    return "\n\n".join(parts)


def editor_prompt(lang: str, scope: dict[str, Any], st: dict[str, Any], story: list[dict[str, Any]], ky: int,
                  warnings: list[str]) -> str:
    level = scope.get("trinh_do", "A2" if lang == "en" else "N4")
    prev = [e for e in story if e["ky"] < ky]
    last = prev[-1] if prev else None
    fb = [e for e in prev[-3:] if e.get("phan_hoi")]
    if lang == "vi":      # 1.25.1: truyện tiếng Việt — "trinh_do" chấm độ đúng kiến thức của thẻ
        items = _vi_items(scope)
        return "\n\n".join(x for x in [
            "Bạn là biên tập viên truyện tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki: khó tính nhưng công bằng.",
            "Chấm kỳ %d dưới đây, mỗi tiêu chí 1–5:\n"
            "- su_kien: có chuyện xảy ra (vấn đề cụ thể, nhân vật xoay xở), không phải cảnh sinh hoạt nhạt\n"
            "- nhan_vat: thoại và hành động đúng tính cách (theo hồ sơ), có cảm xúc\n"
            "- bat_ngo: có chi tiết bất ngờ / buồn cười\n"
            "- moc_cau: kết khiến người đọc muốn đọc kỳ sau, không kết bằng lời khuyên\n"
            "- khop: khớp kỳ trước, không mâu thuẫn chuyện đã xảy ra (kỳ 1 thì chấm 5)\n"
            "- trinh_do: kiến thức lấy từ thẻ ĐÚNG với mặt sau của thẻ, lồng tự nhiên (không giảng bài)\n"
            "- tu_nhien: tiếng Việt tự nhiên, đúng chính tả\n"
            "loi = lỗi cụ thể (chép câu sai → câu đúng, kể cả kiến thức sai so với thẻ); goi_y = góp ý cụ thể để viết lại "
            "hay hơn." % ky,
            BIBLE_VI,
            ("KỲ TRƯỚC (kỳ %d):\n%s" % (last["ky"], _ep_text(last))) if last else "",
            ("NGƯỜI ĐỌC NHẬN XÉT CÁC KỲ TRƯỚC:\n" + "\n".join(
                "- Kỳ %d: %s %s" % (e["ky"], e["phan_hoi"]["y"], e["phan_hoi"].get("ghi", "")) for e in fb)) if fb else "",
            ("THẺ NGƯỜI ĐỌC ĐANG ÔN:\n" + items) if items else "",
            ("MÁY KIỂM TRA GỢI Ý:\n- " + "\n- ".join(warnings[:10])) if warnings else "",
            "KỲ TRUYỆN:\n" + json.dumps({"tieu_de": st.get("tieu_de"), "doan": st.get("doan")}, ensure_ascii=False),
            "Trả về đúng một object JSON theo khuôn."] if x)
    return "\n\n".join(x for x in [
        "Bạn là biên tập viên truyện cho người Việt học %s trình độ %s: khó tính nhưng công bằng." % (
            "tiếng Anh" if lang == "en" else "tiếng Nhật", level),
        "Chấm kỳ %d dưới đây, mỗi tiêu chí 1–5:\n"
        "- su_kien: có chuyện xảy ra (vấn đề cụ thể, nhân vật xoay xở), không phải cảnh sinh hoạt nhạt\n"
        "- nhan_vat: thoại và hành động đúng tính cách (theo hồ sơ), có cảm xúc\n"
        "- bat_ngo: có chi tiết bất ngờ / buồn cười\n"
        "- moc_cau: kết khiến người đọc muốn đọc kỳ sau, không kết bằng lời khuyên\n"
        "- khop: khớp kỳ trước, không mâu thuẫn chuyện đã xảy ra (kỳ 1 thì chấm 5)\n"
        "- trinh_do: từ, ngữ pháp, chữ Hán đúng trình độ %s, không thành ngữ khó\n"
        "- tu_nhien: %s tự nhiên, không gượng vì nhồi từ\n"
        "loi = lỗi ngữ pháp / dùng từ CỤ THỂ (chép câu sai → câu đúng); goi_y = góp ý cụ thể để viết lại hay hơn." % (
            ky, level, "tiếng Anh" if lang == "en" else "tiếng Nhật"),
        BIBLE_EN if lang == "en" else BIBLE_JA,
        ("KỲ TRƯỚC (kỳ %d):\n%s" % (last["ky"], _ep_text(last))) if last else "",
        ("NGƯỜI ĐỌC NHẬN XÉT CÁC KỲ TRƯỚC:\n" + "\n".join(
            "- Kỳ %d: %s %s" % (e["ky"], e["phan_hoi"]["y"], e["phan_hoi"].get("ghi", "")) for e in fb)) if fb else "",
        ("MÁY KIỂM TRA GỢI Ý:\n- " + "\n- ".join(warnings[:10])) if warnings else "",
        "KỲ TRUYỆN:\n" + json.dumps({"tieu_de": st.get("tieu_de"), "doan": st.get("doan")}, ensure_ascii=False),
        "Trả về đúng một object JSON theo khuôn."] if x)


def rewrite_prompt(base_prompt: str, st: dict[str, Any], edit: dict[str, Any]) -> str:
    return (base_prompt + "\n\nBẢN NHÁP TRƯỚC:\n" + json.dumps({"tieu_de": st.get("tieu_de"), "doan": st.get("doan")},
                                                              ensure_ascii=False)
            + "\n\nĐIỂM CỦA BIÊN TẬP: " + json.dumps(edit.get("diem") or {}, ensure_ascii=False)
            + ("\nLỖI CẦN SỬA:\n- " + "\n- ".join(edit.get("loi") or []) if edit.get("loi") else "")
            + "\nGÓP Ý (sửa theo, viết lại CẢ KỲ cho hay hơn, giữ nhân vật và mạch):\n- " + "\n- ".join(edit.get("goi_y") or []))


# ---------------------------------------------------------------------------
# Máy kiểm tra
# ---------------------------------------------------------------------------

CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff]")
LATIN_RE = re.compile(r"[A-Za-z\uff21-\uff3a\uff41-\uff5a]")
VI_RE = re.compile(r"[A-Za-zÀ-ỹĐđ]")
VI_MARK = re.compile(r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]", re.I)
MARK_RE = re.compile(r"[\[\]{}|]")
KANA_RE = re.compile(r"^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc〜～・]+$")
# ghi chú lọt vào bản dịch (thử thật 05/11: "(dùng dạng thân mật …)")
NOTE_RE = re.compile(r"\s*[(（][^()（）]{0,80}?(?:dùng|dạng|nghĩa là|ghi chú|lưu ý|tức là|kính ngữ|thân mật|lịch sự|"
                     r"chữ Hán|furigana|tiếng Nhật|nguyên văn|dịch)[^()（）]{0,80}[)）]", re.I)
# độ dài MỖI đoạn (thử Gemini thật 07/11: đoạn 70–240 ký tự làm cả số N4 dài 1.380 ký tự, quá khung 280–700 → số hỏng)
LEN_JA = {"N5": (40, 110), "N4": (60, 150), "N3": (80, 190), "N2": (90, 220), "N1": (90, 240)}
LEN_EN = {"A1": (18, 55), "A2": (25, 70), "B1": (35, 90), "B2": (45, 110), "C1": (50, 130)}
LEN_VI = (60, 140)        # 1.25.1: chữ tiếng Việt mỗi đoạn (tiếng mẹ đẻ: dài hơn một chút)


def story_length(lang: str, level: str) -> tuple[int, int]:
    if lang == "vi":
        return LEN_VI
    return (LEN_EN.get(level, (25, 70)) if lang == "en" else LEN_JA.get(level, (60, 150)))


DRAFT_DIR = "truyen_nhap"     # kỳ truyện đã duyệt của hôm nay: lượt viết số hỏng thì lần thử sau dùng lại, khỏi tốn lượt


def _draft_path(base: str, date: str, ky: int) -> str:
    return os.path.join(base, DRAFT_DIR, "%s_%d.json" % (re.sub(r"[^0-9-]", "", date)[:10], int(ky)))


def load_draft(base: str, date: str, ky: int) -> dict[str, Any] | None:
    raw = _read(_draft_path(base, date, ky), None)
    if not isinstance(raw, dict) or check_story(raw, raw.get("_lang", "ja"), raw.get("_level", ""))[0]:
        return None
    return raw


def save_draft(base: str, date: str, ky: int, st: dict[str, Any]) -> None:
    try:
        _write(_draft_path(base, date, ky), st)
        folder = os.path.join(base, DRAFT_DIR)
        for name in sorted(os.listdir(folder))[:-6]:       # giữ vài ngày gần nhất
            os.remove(os.path.join(folder, name))
    except OSError:
        pass


# tên riêng hay bị để nguyên chữ Nhật trong bản dịch (hồ sơ nhân vật viết lẫn chữ Nhật; thử Gemini thật 07/11: cả bài mất
# nút Dịch) → đổi sang chữ Latin trước khi kiểm. Dài trước ngắn.
NAME_VI = (("スタックちゃん", "Stack-chan"), ("はなさん", "Hana"), ("リンさん", "Lin"), ("女将さん", "bà chủ"),
           ("村長さん", "trưởng làng"), ("郵便屋さん", "bác đưa thư"), ("「ことば屋」", "quán Kotoba"), ("ことば屋", "quán Kotoba"),
           ("ことば村", "làng Kotoba"), ("ことば畑", "vườn Kotoba"), ("田中様", "ông Tanaka"), ("田中さん", "Tanaka"),
           ("はな", "Hana"), ("リン", "Lin"), ("さん", ""), ("様", ""), ("ちゃん", ""))


def _latin_names(d: str) -> str:
    if not CJK_RE.search(d):
        return d
    for ja, vi in NAME_VI:
        d = d.replace(ja, vi)
    return re.sub(r"[ \t]{2,}", " ", d)


def clean_translation(dich: Any, n: int) -> list[str] | None:
    """Bản dịch tiếng Việt của n đoạn: bỏ ghi chú trong ngoặc; sai số đoạn / có chữ Nhật, Hán, Hàn / không phải tiếng
    Việt → None (đoạn đó / bài đó không có nút Dịch, cả số vẫn dùng được)."""
    if not isinstance(dich, list) or len(dich) != n or not n:
        return None
    out = []
    for d in dich:
        if not isinstance(d, str):
            return None
        d = _latin_names(NOTE_RE.sub("", d)).strip()
        if not d or len(d) > 1500 or CJK_RE.search(d) or MARK_RE.search(d) or not VI_RE.search(d):
            return None
        out.append(d)
    if not any(VI_MARK.search(d) for d in out):       # tiếng Việt phải có dấu (không phải bản tiếng Anh)
        return None
    return out


def check_story(st: Any, lang: str, level: str, bad_kanji: Any = None) -> tuple[list[str], list[str]]:
    """Kiểm tra bản truyện (chữ trơn) của nhà văn. Trả (lỗi, cảnh báo). Có lỗi thì không dùng bản này."""
    errs: list[str] = []
    warns: list[str] = []
    if not isinstance(st, dict):
        return ["không phải object JSON"], warns
    title = st.get("tieu_de")
    if not isinstance(title, str) or not title.strip() or len(title) > 80:
        errs.append("tieu_de: cần tiêu đề ngắn")
    doan = st.get("doan")
    if not isinstance(doan, list) or not 2 <= len(doan) <= 4 or not all(isinstance(p, str) and p.strip() for p in doan):
        return errs + ["doan: cần 3 đoạn"], warns
    lo, hi = story_length(lang, level)
    for j, p in enumerate(list(doan) + [title if isinstance(title, str) else ""]):
        where = "doan[%d]" % j if j < len(doan) else "tieu_de"
        if MARK_RE.search(p):
            errs.append(where + ": không dùng [ ] { } | (chữ trơn, chưa furigana)")
        if lang == "vi":       # 1.25.1: truyện tiếng Việt (chữ của thẻ — tiếng Hàn, chữ Hán… — được giữ nguyên)
            if len(p) >= 30 and not VI_MARK.search(p):
                errs.append(where + ": phải viết bằng tiếng Việt CÓ DẤU")
        elif lang == "en":
            if CJK_RE.search(p):
                errs.append(where + ": có chữ Nhật / Trung / Hàn trong bài tiếng Anh")
            if VI_MARK.search(p):
                errs.append(where + ": có chữ tiếng Việt trong bài tiếng Anh")
        else:
            if LATIN_RE.search(p):
                errs.append(where + ": có chữ Latin / romaji trong bài tiếng Nhật")
            if re.search(r"[\uac00-\ud7af]", p):
                errs.append(where + ": có chữ Hàn")
            bad = bad_kanji(p) if bad_kanji else []
            if bad:
                errs.append(where + ": chữ Hán không phải của tiếng Nhật: " + "".join(bad))
        if j >= len(doan):
            continue
        n = len(re.findall(r"[A-Za-z]+(?:['’][A-Za-z]+)*", p)) if lang == "en" else \
            len([w for w in p.split() if re.search(r"\w", w)]) if lang == "vi" else len(re.sub(r"\s", "", p))
        if n < lo * 0.7:
            errs.append(where + ": ngắn quá (%d, cần %d–%d)" % (n, lo, hi))
        elif n > hi * 1.35:
            errs.append(where + ": dài quá (%d, cần %d–%d)" % (n, lo, hi))
        elif not lo <= n <= hi:
            warns.append(where + ": độ dài %d (nên %d–%d)" % (n, lo, hi))
    if len(doan) != 3:
        warns.append("doan: nên đúng 3 đoạn")
    # từ mới chỉ là phần phụ: mục hỏng thì bỏ mục đó, không bỏ cả bản truyện (thử thật 07/11, Flash-Lite hai lần ghi
    # cách đọc 郵便屋さん bằng romaji → cả truyện rơi về "viết chung")
    tm = st.get("tu_moi") if isinstance(st.get("tu_moi"), list) and lang != "vi" else []
    good = []
    for w in tm:
        if not isinstance(w, dict) or not _str(w.get("w"), 40) or not _str(w.get("m"), 120):
            warns.append("tu_moi: bỏ mục thiếu w / m")
        elif lang != "en" and paper.KANJI_RE.search(w["w"]) and not KANA_RE.match(_str(w.get("r"), 60)):
            warns.append('tu_moi "%s": bỏ (cách đọc r không phải kana)' % w["w"])
        elif not VI_RE.search(w["m"]) or CJK_RE.search(w["m"]):
            warns.append('tu_moi "%s": bỏ (nghĩa m không phải tiếng Việt)' % w["w"])
        else:
            good.append(w)
    if len(good) > 2:
        warns.append("tu_moi: tối đa 2 từ mới (bỏ bớt)")
    st["tu_moi"] = good[:2]
    if lang != "vi" and clean_translation(st.get("dich"), len(doan)) is None:
        warns.append("dich: bản dịch thiếu / sai (không có nút Dịch cho truyện)")
    nho = st.get("nho") if isinstance(st.get("nho"), dict) else {}
    if not _str(nho.get("tom_tat"), 400):
        warns.append("nho.tom_tat: thiếu tóm tắt")
    return errs, warns


def scores_low(edit: Any) -> list[str]:
    d = edit.get("diem") if isinstance(edit, dict) else None
    if not isinstance(d, dict):
        return []
    return [k for k in CRIT if isinstance(d.get(k), int) and d[k] < 4]


# ---------------------------------------------------------------------------
# Chạy quy trình (gọi từ ai_core.Job, luồng nền)
# ---------------------------------------------------------------------------


def run(job: Any, ky: int, tone: str, season: str) -> dict[str, Any] | None:
    """Viết kỳ `ky` theo quy trình mới. Trả về bản truyện đã duyệt (chữ trơn + dịch + bộ nhớ + điểm) hoặc None.

    `job`: ai_core.Job (dùng job._gen, job.scope, job.base, job.c, job._note, job.progress, job.en, job.check_kanji).
    1.25.1: `tone` là danh sách chủ đề đã chọn (hoặc một chủ đề kiểu 1.23); mỗi đợt một chủ đề, xoay vòng."""
    lang = getattr(job, "lang", "") or ("en" if job.en else "ja")
    level = job.scope.get("trinh_do", "A2" if lang == "en" else "N4")
    tones = norm_tones(tone)
    story = load_story(job.base)
    arc = load_arc(job.base)
    cached = load_draft(job.base, job.date, ky)
    if cached:            # lần thử trước hôm nay đã có kỳ truyện duyệt xong (lượt viết số hỏng) → dùng lại
        job._note("truyen_dung_lai", ky=ky)
        return cached
    start = job.c.calls
    done = [0]               # lượt gọi THÀNH CÔNG (lượt lỗi bận / hết hạn mức không tốn hạn mức của Gemini)

    def left() -> int:
        if job.c.calls - start >= MAX_REQUESTS:
            return 0
        return MAX_CALLS - done[0]

    _gen0 = job._gen

    def gen(*a: Any, **k: Any) -> Any:
        r = _gen0(*a, **k)
        done[0] += 1
        return r
    if lang == "vi":
        system = ("Bạn là nhà văn viết truyện dài kỳ tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki. Viết hay như một "
                  "truyện thật, không như bài giảng.")
    else:
        system = ("Bạn là nhà văn viết truyện dài kỳ %s dễ đọc cho người Việt học %s trình độ %s. Viết hay như một truyện "
                  "thật, không như bài tập." % ("tiếng Anh" if lang == "en" else "tiếng Nhật",
                                                "tiếng Anh" if lang == "en" else "tiếng Nhật", level))
    # 0. mạch của đợt (1.25.1: đợt mới khi hết đợt, hoặc chủ đề của đợt không còn trong danh sách đã chọn)
    tone = arc["giong"] if arc and arc.get("giong") in tones and arc_step(arc, ky) is not None else next_tone(tones, arc)
    if arc_step(arc, ky) is None or (arc and arc.get("giong") != tone):
        job.progress("Gemini đang lập mạch truyện…")
        try:
            raw = gen(system, arc_prompt(lang, tone, story, ky, season, tones), ARC_SCHEMA, 0.9, thinking="low")
            buoc = _strs(raw.get("buoc") if isinstance(raw, dict) else None, ARC_LEN[1], 300)
            if len(buoc) >= 3:
                arc = {"ten": _str(raw.get("ten"), 120), "muc_tieu": _str(raw.get("muc_tieu"), 300),
                       "bi_an": _str(raw.get("bi_an"), 300), "nhan_vat_phu": _str(raw.get("nhan_vat_phu"), 200),
                       "buoc": buoc, "ket": _str(raw.get("ket"), 300), "tu_ky": ky, "giong": tone,
                       "dot": (arc or {}).get("dot", 0) + 1}
                _write(os.path.join(job.base, ARC_FILE), arc)
                job._note("mach_truyen", ten=arc["ten"], so_ky=len(buoc))
            else:
                job._note("mach_truyen_hong")
                arc = None
        except Exception as e:      # noqa: BLE001 — AIError của ai_core (không import để khỏi vòng)
            if getattr(e, "kind", "") == "key":
                raise
            job._note("mach_truyen_loi", ly_do=str(e)[:160])
            arc = None
    # 1. nhà văn
    job.progress("Gemini đang viết kỳ %d của truyện…" % ky)
    prompt = writer_prompt(lang, job.scope, ky, tone, arc, story, season, tones=tones)
    best: dict[str, Any] | None = None
    problems: list[str] = []
    for attempt in range(2):
        if left() <= 1:
            break
        try:
            draft = gen(system, prompt if not problems else writer_prompt(lang, job.scope, ky, tone, arc, story,
                                                                               season, problems, tones),
                             STORY_SCHEMA, 0.9, thinking="low")
        except Exception as e:      # noqa: BLE001
            if getattr(e, "kind", "") == "key":
                raise
            job._note("truyen_loi_goi", ly_do=str(e)[:160])
            break
        errs, warns = check_story(draft, lang, level, job.check_kanji if lang == "ja" else None)
        job._note("truyen_nhap", lan=attempt + 1, loi=errs[:12], canh_bao=warns[:8])
        if not errs:
            best = draft
            break
        problems = errs
    if best is None:
        return None
    warns = check_story(best, lang, level, job.check_kanji if lang == "ja" else None)[1] + job.story_hints(best)
    # 2. biên tập
    edit: dict[str, Any] = {}
    if left() > 1:
        job.progress("Biên tập đang đọc kỳ %d…" % ky)
        try:
            edit = gen("Bạn là biên tập viên truyện khó tính nhưng công bằng.",
                            editor_prompt(lang, job.scope, best, story, ky, warns), EDIT_SCHEMA, 0.3, thinking="low") or {}
            job._note("bien_tap", diem=edit.get("diem"), loi=(edit.get("loi") or [])[:8])
        except Exception as e:      # noqa: BLE001
            if getattr(e, "kind", "") == "key":
                raise
            job._note("bien_tap_loi", ly_do=str(e)[:160])
            edit = {}
    # 3. viết lại một lần nếu có tiêu chí dưới 4 (hoặc biên tập bắt được lỗi ngữ pháp)
    low = scores_low(edit)
    if (low or edit.get("loi")) and left() >= 1:
        job.progress("Gemini đang viết lại kỳ %d theo góp ý…" % ky)
        try:
            again = gen(system, rewrite_prompt(prompt, best, edit), STORY_SCHEMA, 0.8, thinking="low")
            errs2, _w2 = check_story(again, lang, level, job.check_kanji if lang == "ja" else None)
            job._note("viet_lai_truyen", tieu_chi_thap=low, loi=errs2[:12])
            if not errs2:
                best = again
                best["_viet_lai"] = True
        except Exception as e:      # noqa: BLE001
            if getattr(e, "kind", "") == "key":
                raise
            job._note("viet_lai_loi", ly_do=str(e)[:160])
    best["diem"] = edit.get("diem") if isinstance(edit.get("diem"), dict) else {}
    best["dich"] = clean_translation(best.get("dich"), len(best["doan"])) if lang != "vi" else None
    best["doan"] = [p.strip() for p in best["doan"]]
    best["tieu_de"] = best["tieu_de"].strip()
    best["ky"] = ky
    prev = [e for e in story if e["ky"] < ky]
    best["ky_truoc"] = prev[-1]["tom_tat"] if prev and ky > 1 else ""
    best["_lang"], best["_level"] = lang, level
    save_draft(job.base, job.date, ky, best)
    return best


_KEEP_CH = re.compile(r"[^\u3041-\u309f\u30a1-\u30ff\u3400-\u9fff\uf900-\ufaff々〆ヶA-Za-z0-9]")
_HAN = re.compile(r"[\u3400-\u9fff\uf900-\ufaff々]")


def _norm_story(s: str) -> str:
    import unicodedata
    return _KEEP_CH.sub("", unicodedata.normalize("NFKC", s or ""))       # giữ katakana: ピクセル ≠ ぴくせる


_HONOR = ("さん", "さま", "様", "ちゃん", "くん", "君")


def _ok_op(x: str, y: str, b: str, j1: int, j2: int, toks: list[Any]) -> bool:
    """Một chỗ khác giữa bài trong số báo (x) và bản đã duyệt (y, nằm ở b[j1:j2]) có chấp nhận được không."""
    if not x and not y:
        return True                                 # chỉ khác dấu câu
    if x and y and _HAN.search(y) and not _HAN.search(x) and len(x) <= 4 * len(y) + 2:
        return True                                 # chữ Hán → kana (封筒 → ふうとう)
    if x and y and _HAN.search(x) and not _HAN.search(y) and len(x) <= len(y):
        return True                                 # kana → chữ Hán (なに → 何)
    if (not y and x in _HONOR) or (not x and y in _HONOR):
        return True                                 # thêm / bớt kính xưng (村長 → 村長さん)
    if not x and len(y) <= 2 and 0 < j1 and j2 < len(b) and _HAN.match(b[j1 - 1]) and _HAN.match(b[j2]) \
            and any(b[j1 - 1] + b[j2] in t[1] and y in paper.to_hira(t[2] or "") for t in toks):
        return True                                 # bỏ okurigana trong cùng một từ: [入口|いりぐち] (入り口)
    return False


def story_diffs(raw_doan: list[str], plain: list[str]) -> list[tuple[int, list[tuple[str, str]]]]:
    """1.23 (thử Gemini thật 07/11: lượt viết số chép "落とした古い手紙を急いで拾い上げました" thành "落てしまいました",
    "驚いた" thành "驚った"): các chỗ bài truyện trong số báo chép SAI bản đã duyệt, theo từng đoạn. Bỏ qua chỗ đổi chữ Hán
    ↔ kana (bước soát được phép), dấu câu, số toàn khổ, kính xưng. Trả [(đoạn, [(gốc, chép), …]), …]."""
    import difflib
    out: list[tuple[int, list[tuple[str, str]]]] = []
    if len(raw_doan) != len(plain):
        return out
    for j, (p, o) in enumerate(zip(raw_doan, plain)):
        a, b = _norm_story(paper.surface(p) if isinstance(p, str) else ""), _norm_story(o)
        toks = [t for t in paper.tokenize(p) if t[0] != "plain"] if isinstance(p, str) else []
        bad: list[tuple[str, str]] = []
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if tag != "equal" and not _ok_op(a[i1:i2], b[j1:j2], b, j1, j2, toks):
                bad.append((b[j1:j2], a[i1:i2]))
        if bad:
            out.append((j, bad))
    return out


def _nc(c: str) -> str:
    import unicodedata
    n = unicodedata.normalize("NFKC", c)
    return n if len(n) == 1 else c


def restore_story(p: str, o: str) -> str:
    """1.23: máy tự chép lại cho đúng bản đã duyệt những chỗ sai máy vá chắc được (thử Gemini thật 07/11, Flash-Lite):
    ngoài ngoặc, không cần chữ Hán mới ([驚|おどろ]った → いた, [話|はな][始|はじ]め → [話|はな]し[始|はじ]め, ぴくせる → ピクセル);
    đuôi kana trong ngoặc mà cách đọc cũng có ([言い直す|いいなおす]ました → [言い直し|いいなおし]ました). Chỗ không vá được
    mà mất cả cụm, hoặc nằm sát chỗ cần vá, thì để nguyên cả đoạn (story_diffs vẫn báo). Trả đoạn đã vá (hoặc như cũ)."""
    import difflib
    if not isinstance(p, str) or not isinstance(o, str):
        return p
    units: list[tuple[str, str, Any]] = []       # (chữ gốc trong bài, mặt chữ, khớp ngoặc) — ngoặc là một khối
    pos = 0
    for m in paper.TOKEN_RE.finditer(p):
        units += [(c, c, None) for c in p[pos:m.start()]]
        units.append((m.group(0), m.group(4) if m.group(4) is not None else m.group(1), m))
        pos = m.end()
    units += [(c, c, None) for c in p[pos:]]
    a, amap, ustart = [], [], []
    for u, (_, surf, _) in enumerate(units):
        ustart.append(len(a))
        for c in surf:
            a.append(_nc(c))
            amap.append(u)
    A, B = "".join(a), "".join(_nc(c) for c in o)
    toks = [t for t in paper.tokenize(p) if t[0] != "plain"]
    edge = lambda i: i == len(A) or ustart[amap[i]] == i      # noqa: E731 — vị trí nằm giữa hai khối
    uend = lambda u: ustart[u] + len(units[u][1])            # noqa: E731
    edits: list[tuple[int, int, str]] = []
    skipped: list[tuple[int, int]] = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        x, y, text = _KEEP_CH.sub("", A[i1:i2]), _KEEP_CH.sub("", B[j1:j2]), o[j1:j2]
        if _ok_op(x, y, B, j1, j2, toks):
            continue
        if not _HAN.search(text) and edge(i1) and edge(i2):
            edits.append((amap[i1] if i1 < len(A) else len(units), amap[i2] if i2 < len(A) else len(units), text))
            continue
        u = amap[i1] if i1 < len(A) else -1
        m = units[u][2] if u >= 0 else None
        tail = A[i1:i2]
        if m is not None and i2 > i1 and i2 == uend(u) and not _HAN.search(text) \
                and re.fullmatch(r"[\u3041-\u3096]+", tail) and re.fullmatch(r"[\u3041-\u3096]*", text):
            ruby = m.group(4) is not None
            read = m.group(5) if ruby else m.group(2)
            if read.endswith(tail):                 # đuôi kana trong ngoặc, cách đọc cũng có → sửa cả hai
                surf2, read2 = units[u][1][:i1 - ustart[u]] + text, read[:len(read) - len(tail)] + text
                if not paper.KANJI_RE.search(surf2):
                    edits.append((u, u + 1, surf2))    # ngoặc chỉ có kana ({みんなで|みんなで|…}) → chữ trơn
                    continue
                raw = "[%s|%s]" % (surf2, read2) if ruby else "{%s|%s|%s}" % (surf2, read2, m.group(3))
                edits.append((u, u + 1, raw))
                continue
        if len(y) - len(x) >= 3 or len(x) + len(y) >= 6:
            return p            # mất / viết lại cả cụm mà máy không vá được → để nguyên, báo Gemini chép lại cả đoạn
        skipped.append((i1, i2))
    if not edits:
        return p
    spans = []
    for u1, u2, _ in edits:
        st = ustart[u1] if u1 < len(units) else len(A)
        spans.append((st, uend(u2 - 1) if u2 > u1 else st))
    for e1, e2 in skipped:      # chỗ không vá nằm sát chỗ vá (微笑み → 笑い) → vá dở dễ sai cách đọc: để nguyên cả đoạn
        if any(st - 2 <= e2 and e1 <= en + 2 for st, en in spans):
            return p
    out, u = [], 0
    for u1, u2, text in sorted(edits):
        out += [r for r, _, _ in units[u:u1]] + [text]
        u = u2
    out += [r for r, _, _ in units[u:]]
    return "".join(out)


def story_matches(raw_doan: list[str], plain: list[str]) -> float:
    """Độ giống (0–1) giữa bài truyện trong số báo (có furigana) và bản truyện đã duyệt (chữ trơn)."""
    import difflib
    a = paper.norm_answer("".join(paper.surface(p) for p in raw_doan if isinstance(p, str)))
    b = paper.norm_answer("".join(plain))
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
