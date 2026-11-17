"""1.33 — báo tiếng Trung / tiếng Hàn (người dùng duyệt ảnh phác docs/ke_hoach_1_33/; quyết định 17/11: tối đa 2 báo,
mặc định 1 báo theo deck). Không cần mạng, không cần pypinyin (dữ liệu đóng băng ở tests/fixtures/).

1. Quy tắc "tối đa 2 báo" (paper_core.clean_paper_langs): Nhật / Anh / Trung / Hàn tối đa 2, tiếng Việt đi một mình.
2. Bảng cách đọc chữ Hán (zh_data.READINGS_RAW, sinh từ pypinyin): mọi chữ của 2.000 từ đối chiếu (pinyin_1322_ref.json)
   có cách đọc đúng trong bảng; soát từng chỗ [chữ|pinyin] (sai âm, sai thanh, thiếu / thừa âm tiết, 一 / 不, thanh nhẹ, 儿).
3. Tiếng Hàn (ko_core): nhận từ của deck khi có tiểu từ / đuôi (kể cả bất quy tắc), KHÔNG nhận nhầm danh từ trùng đầu
   (가방 ≠ 가다, 가게 ≠ 가다, 사자 ≠ 사다…); chấm chép theo cụm (đúng / sai cụm / chỉ khác chỗ cách).
4. ai_zh: số báo mẫu (Gemini giả) qua autofix + check → 0 lỗi; pinyin ghép theo từng chữ có dấu, nối tra từ của deck một
   lần; số báo hỏng → đúng lỗi (pinyin sai, chữ nhiều cách đọc thiếu pinyin, pinyin Latin trong bài, kana, Hangul, chữ phồn
   thể trong báo giản thể, câu chép không có trong bài → máy chọn lại).
5. ai_ko: như trên (Hán tự, Latin, kana, chữ Việt; nối tra từ 축제가 → {축제||축제}가, 무서워서 → 무섭다).
6. Cả quy trình (ai_core.Job + story_core.retell) với Gemini giả cho báo tiếng Trung và tiếng Hàn: số báo lưu được, trình
   đọc báo mở được (paper_core.Library / issue_view), tra từ có Hán Việt, chép chính tả chấm theo chữ / cụm, giọng đọc
   đọc chữ (không đọc pinyin).
7. Lời nhắc: báo tiếng Anh giống hệt từng chữ mã 1.31.5 thật; tiếng Trung / Hàn không sót chỗ trống @…@, không sót chữ
   "tiếng Anh" / IPA.
8. Hợp đồng dữ liệu: khoá collection mới chỉ kotoba_batake_paper_zh / _ko; config.json chỉ thêm gemini_level_zh / _ko.
10. 4 số báo Gemini thật (tests/fixtures/bao_133_that.json): mọi chữ Hán có âm tiết đúng bảng, chữ Hàn sạch, đủ chỗ tra từ,
   câu hỏi / câu chép hợp lệ, trình đọc báo mở được, bảng tra từ có Hán Việt.
9. Sửa sau khi soát: chấm chép theo dãy chung dài nhất; bản gốc lấy từ kỳ báo khác tự viết mang đúng ngôn ngữ; báo
   tiếng Nhật vẫn soát cách đọc từ mới toàn kana.

Chạy: python test_133.py ADDON
"""
from __future__ import annotations

import copy
import datetime
import io
import json
import os
import re
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
import ai_en  # noqa: E402
import ai_ko  # noqa: E402
import ai_zh  # noqa: E402
import ko_core as K  # noqa: E402
import paper_core as paper  # noqa: E402
import story_core as S  # noqa: E402
import zh_core as Z  # noqa: E402

results: list[bool] = []


def ok(cond: bool, msg: str) -> None:
    results.append(bool(cond))
    print(("  ✓ " if cond else "  ✗ ") + msg)


FIX = json.load(open(os.path.join(ROOT, "tests", "fixtures", "bao_133.json"), encoding="utf-8"))
REF = json.load(open(os.path.join(ROOT, "tests", "fixtures", "pinyin_1322_ref.json"), encoding="utf-8"))

print("== 1. tối đa 2 báo")
cases = [(["ja", "en"], ["ja", "en"]), (["vi"], ["vi"]), (["ja", "vi"], ["ja"]), (["zh", "ko", "ja"], ["zh", "ko"]),
         (["ko", "zh"], ["zh", "ko"]), ("x", []), (["en", "en", "zh"], ["en", "zh"]), ([], []), (["vi", "zh"], ["zh"]),
         (["ja", "en", "zh", "ko", "vi"], ["ja", "en"]), ([1, None, "zz", "ko"], ["ko"])]
bad = [(a, paper.clean_paper_langs(a)) for a, b in cases if paper.clean_paper_langs(a) != b]
ok(not bad, "11 trường hợp (giữ 2 báo có trước, tiếng Việt đi một mình, dữ liệu lạ)%s" % (" — sai: %s" % bad if bad else ""))

print("== 2. bảng cách đọc chữ Hán")
miss = []
for it in REF["items"]:
    for c, s in zip(it["w"], it["mark"]):
        if not Z.syllable_ok(c, s):
            miss.append((c, s))
rare = [(c, s) for c, s in miss if not Z.known(c)]
wrong = [(c, s) for c, s in miss if Z.known(c)]
n_chars = sum(len(it["w"]) for it in REF["items"])
ok(not wrong and len(rare) <= n_chars // 100, "mọi chữ thường dùng của 2.000 từ đối chiếu có cách đọc đúng trong bảng (%d chữ; "
   "%d chữ hiếm ngoài GB2312 / Big5 → báo lỗi \"chữ ít dùng\" cho Gemini đổi)%s" % (n_chars, len(rare), (" — sai: %s" % wrong[:5]) if wrong else ""))
ok(len(Z.readings("好")) >= 2 and Z.readings("學") and Z.readings("学"), "bảng có chữ giản thể lẫn phồn thể, chữ nhiều cách đọc")
ok(Z.word_problem("你好", "ni3 hao3") == "" and Z.word_problem("朋友", "peng2 you5") == "", "pinyin đúng (cả thanh nhẹ)")
ok("đọc là" in Z.word_problem("你好", "ni3 hai3"), "âm sai → lỗi chỉ đúng chữ và cách đọc đúng")
ok("1 âm tiết" in Z.word_problem("学生", "xue2"), "thiếu âm tiết → lỗi")
ok(Z.word_problem("一个", "yi2 ge4") == "" and Z.word_problem("不是", "bu2 shi4") == "", "一 / 不 đổi thanh được nhận")
ok(Z.word_problem("一点儿", "yi4 dian3 r") == "", "儿 đọc r")
ok(Z.word_problem("你好", "ni3 hao2") != "", "sai thanh (hao2) → lỗi")
ok(Z.fill_reading("你") is not None and Z.fill_reading("好") is None, "tự điền chữ một cách đọc, không điền chữ nhiều cách đọc")
ok(Z.is_simplified_text(["学生", "你好"]) and not Z.is_simplified_text(["學生", "們"]), "nhận deck giản thể / phồn thể")

print("== 3. tiếng Hàn: nhận từ của deck")
pos = [("축제가", "축제"), ("축제를", "축제"), ("학교에서는", "학교"), ("친구들에게", "친구"), ("무서워서", "무섭다"),
       ("먹었어요", "먹다"), ("가요", "가다"), ("갔어요", "가다"), ("와요", "오다"), ("마셔요", "마시다"), ("공부했어요", "공부하다"),
       ("몰라요", "모르다"), ("바빠요", "바쁘다"), ("들어요", "듣다"), ("사세요", "살다"), ("그래요", "그렇다"), ("갑니다", "가다"),
       ("예뻐서", "예쁘다"), ("추워요", "춥다"), ("좋아요", "좋다"), ("봤어요", "보다"), ("읽었어요", "읽다"), ("귀여워요", "귀엽다")]
neg = [("눈물", "눈"), ("가방", "가다"), ("사과", "사다"), ("오늘", "오다"), ("가을", "가다"), ("하나", "하다"), ("사람", "살다"),
       ("오리", "오다"), ("가게", "가다"), ("사자", "사다"), ("가지", "가다"), ("가구", "가다"), ("보리", "보다"), ("먹이", "먹다")]
bad = [(e, w) for e, w in pos if not K.match(e, w)] + [(e, w) for e, w in neg if K.match(e, w)]
ok(not bad, "%d dạng chia / tiểu từ được nhận, %d danh từ trùng đầu không bị nhận nhầm%s" % (len(pos), len(neg),
                                                                                       (" — sai: %s" % bad) if bad else ""))
g = K.grade("린은 무서워서 손이 떨렸어요.", "린은 무서워서 손이 떨렷어요")
ok(not g["ok"] and g["right"] == 3 and g["total"] == 4 and g["marks"][3] == ["떨렸어요", False], "chấm theo cụm: sai 1 cụm → 3/4")
g = K.grade("린은 무서워서 손이 떨렸어요.", "린은무서워서 손이떨렸어요")
ok(g["ok"] and g["spacing"], "chỉ khác chỗ cách → đúng (ghi chú khác chỗ cách)")
ok(K.grade("다음 주에 가을 축제가 있어요.", "다음 주에 가을 축제가 있어요")["ok"], "thiếu dấu chấm cuối câu → vẫn đúng")
z = paper.grade_answer("[今天|jīn tiān]天气很好。", "今天天气很好", "zh")
ok(z["ok"] and z["total"] == 6, "tiếng Trung: bỏ dấu câu, đúng cả câu")
z = paper.grade_answer("[林|lín]很害怕。", "林很害帕", "zh")
ok(not z["ok"] and z["right"] == 3 and z["marks"][3] == ["怕", False], "tiếng Trung: gõ nhầm chữ cùng âm → 3/4, tô đúng chữ sai")
ok(paper.speech_text("[学|xué][生|sheng]{害怕|hài pà|害怕}。", "zh") == "学生害怕。", "giọng đọc báo tiếng Trung đọc chữ, không đọc pinyin")
ok(paper.dict_len("{축제||축제}가 있어요.", "ko") == (2, "cụm") and paper.dict_len("[林|lín]很害怕。", "zh") == (4, "chữ"),
   "độ dài câu chép: tiếng Hàn đếm cụm, tiếng Trung đếm chữ")

print("== 4. ai_zh: sửa máy + kiểm tra")
ZH_WORDS = [("天气", "tian1qi4", "thời tiết", "thiên khí"), ("漂亮", "piao4liang5", "đẹp", "phiêu lượng"),
            ("害怕", "hai4pa4", "sợ", "hại phạ"), ("本子", "ben3zi5", "cuốn sổ", "bản tử"), ("眼睛", "yan3jing5", "mắt", ""),
            ("节日", "jie2ri4", "ngày lễ", "tiết nhật"), ("准备", "zhun3bei4", "chuẩn bị", "chuẩn bị"),
            ("声音", "sheng1yin1", "âm thanh", "thanh âm"), ("衣服", "yi1fu5", "quần áo", "y phục"),
            ("故事", "gu4shi5", "câu chuyện", "cố sự"), ("学校", "xue2xiao4", "trường học", "học hiệu"),
            ("医院", "yi1yuan4", "bệnh viện", "y viện"), ("商店", "shang1dian4", "cửa hàng", "thương điếm"),
            ("星期", "xing1qi1", "tuần", "tinh kỳ"), ("下午", "xia4wu3", "buổi chiều", "hạ ngọ"),
            ("明天", "ming2tian1", "ngày mai", "minh thiên"), ("早上", "zao3shang5", "buổi sáng", "tảo thượng"),
            ("红色", "hong2se4", "màu đỏ", "hồng sắc"), ("今天", "jin1tian1", "hôm nay", "kim thiên"),
            ("旅店", "lv3dian4", "quán trọ", "lữ điếm"), ("音乐会", "yin1yue4hui4", "buổi hòa nhạc", "âm nhạc hội"),
            ("昨天", "zuo2tian1", "hôm qua", "tạc thiên")]
pk = {"kho": [{"word": w, "reading": r, "meaning": m, "hanviet": hv, "due": i % 3 == 0} for i, (w, r, m, hv) in enumerate(ZH_WORDS)],
      "all": [], "decks": ["Tiếng Trung::HSK 2"]}
zscope = ai_zh.scope_from_pick(pk, "HSK2")
ok(zscope["lang"] == "zh" and not zscope["phon_the"] and zscope["tu_vung"][0][1] == Z.tone_marks("tian1 qi4")
   and "THIÊN KHÍ" in zscope["tu_vung"][0][2], "phạm vi: từ + pinyin có dấu + nghĩa · HÁN VIỆT, deck giản thể")


def zh_issue_with_story() -> dict:
    raw = copy.deepcopy(FIX["zh"]["issue"])
    st = FIX["zh"]["story"]
    raw["bai"].insert(1, {"loai": "truyen", "ky": 2, "ky_truoc": "Lin nghe tiếng guốc gỗ lách cách ở giếng cổ.",
                          "tieu_de": st["tieu_de"], "doan": list(st["doan"]), "dich": list(st["dich"])})
    raw["tu_moi"] = [{"w": "木屐", "r": "mu4 ji1", "m": "guốc gỗ"}]
    return raw


opts = {"ky": 2, "story_plain": {"tieu_de": "x", "doan": ["x"]}}
fixed, notes = ai_zh.autofix(zh_issue_with_story(), zscope, opts)
rep = ai_zh.check(fixed, zscope, opts)
ok(not rep.errors, "số báo mẫu: 0 lỗi%s" % ((" — " + "; ".join(rep.errors[:4])) if rep.errors else ""))
p0 = fixed["bai"][0]["doan"][0]
ok(p0.startswith("{今天|jīn tiān|今天}{天气|tiān qì|天气}[很|hěn][好|hǎo]"), "pinyin có dấu, theo từng chữ; từ của deck → chỗ tra từ: " + p0[:60])
keys = [k for b in fixed["bai"] for t in [b["tieu_de"]] + b["doan"] for k in paper.keys(t)]
ok(keys.count("今天") == 1 and "害怕" in keys and "木屐" in keys, "mỗi từ của deck gạch chân một lần trong bài; từ mới cũng tra được")
ok(all(paper.keys(c["cau"]) or True for c in fixed["chinh_ta"]) and "{" in fixed["cau_hoi"][0]["chon"][0],
   "câu hỏi / lựa chọn cũng tra được từ của deck")
pl = ai_zh.plain_issue(fixed)
plj = json.dumps(pl, ensure_ascii=False)
ok(re.search(r"\{[^{}\[\]|]*\|[^{}\[\]|]*\|", plj) is None and "[今天|jin1 tian1]" in plj and "[很|hen3]" in plj
   and not re.search(r"\[[^|\]]+\|[^\]]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]", plj),
   "bản gửi Gemini sửa / soát: bỏ chỗ tra từ của máy, pinyin ghi số như lời dặn (Gemini thật 17/11: người soát tưởng "
   "dấu thanh là sai quy tắc)")
# từ mới luôn được nối dù đã hết LINK_MAX chỗ (Gemini thật 17/11: báo tiếng Hàn tốn 3 lượt sửa vô ích)
links = ai_zh.find_links("今天天气很好" * 3 + "木屐", ["今天", "天气", "很好", "木屐"], set(), [ai_zh.LINK_MAX], must={"木屐"})
ok([w for _a, _b, w in links] == ["木屐"], "zh: hết chỗ nối → vẫn nối từ mới (木屐), không nối thêm từ của deck")
kl = ai_ko._link_one("오늘 날씨가 좋아요. 나막신이 있어요.", ["오늘", "날씨", "나막신"], set(), [ai_ko.LINK_MAX], must={"나막신"})
ok(kl == "오늘 날씨가 좋아요. {나막신||나막신}이 있어요.", "ko: hết chỗ nối → vẫn nối từ mới: " + kl)


def zh_err(mutate) -> list[str]:
    raw = zh_issue_with_story()
    mutate(raw)
    f, _n = ai_zh.autofix(raw, zscope, opts)
    return ai_zh.check(f, zscope, opts).errors


e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[今天|jin1 tian1][天气|tian1 qi4][很|hen3][好|hai3]。"))
ok(any("好 đọc là" in x for x in e), "pinyin sai (好 hai3) → lỗi chỉ đúng chỗ: " + (e[0][:70] if e else ""))
e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[今天|jin1 tian1]天气很好。"))
ok(any("thiếu pinyin" in x for x in e), "chữ nhiều cách đọc không có pinyin → lỗi")
e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[今天|jin1 tian1] tianqi [很|hen3][好|hao3]。"))
ok(any("Latin" in x for x in e), "pinyin viết thẳng trong bài (Latin) → lỗi")
e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[今天|jin1 tian1]はいい[天气|tian1 qi4]。"))
ok(any("kana" in x for x in e), "lẫn kana → lỗi")
e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[今天|jin1 tian1] 날씨 [很|hen3][好|hao3]。"))
ok(any("chữ Hàn" in x for x in e), "lẫn chữ Hàn → lỗi")
e = zh_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "[學生|xue2 sheng5][很|hen3][好|hao3]。"))
ok(any("phồn thể" in x for x in e), "chữ phồn thể trong báo giản thể → lỗi")
raw = zh_issue_with_story()
raw["chinh_ta"] = [{"cau": "[我|wo3][喜欢|xi3 huan5][猫|mao1]。", "them_dap_an": []}]
f, n = ai_zh.autofix(raw, zscope, opts)
ok(any("chọn lại câu chép" in x for x in n) and all(ai_zh.in_text(c["cau"], f) for c in f["chinh_ta"]) and len(f["chinh_ta"]) >= 2,
   "câu chép không có trong bài → máy chọn câu trong bài (giữ pinyin)")
ok(ai_zh.check(f, zscope, opts).errors == [], "sau khi chọn lại: 0 lỗi")

print("== 5. ai_ko: sửa máy + kiểm tra")
KO_WORDS = [("날씨", "nalssi", "thời tiết"), ("마을", "maeul", "làng"), ("사진", "sajin", "ảnh"), ("축제", "chukje", "lễ hội"),
            ("준비", "junbi", "chuẩn bị"), ("수첩", "sucheop", "sổ tay"), ("우물", "umul", "cái giếng"), ("무섭다", "museopda", "sợ"),
            ("소리", "sori", "âm thanh"), ("눈", "nun", "mắt"), ("이야기", "iyagi", "câu chuyện"), ("여관", "yeogwan", "quán trọ"),
            ("고양이", "goyangi", "con mèo"), ("그림", "geurim", "bức tranh"), ("꽃", "kkot", "hoa"), ("학교", "hakgyo", "trường học"),
            ("병원", "byeongwon", "bệnh viện"), ("귀엽다", "gwiyeopda", "dễ thương"), ("맑다", "makda", "trong, quang"),
            ("예쁘다", "yeppeuda", "đẹp"), ("찍다", "jjikda", "chụp"), ("단풍", "danpung", "lá đỏ")]
kscope = ai_ko.scope_from_pick({"kho": [{"word": w, "reading": r, "meaning": m, "due": i % 4 == 0}
                                        for i, (w, r, m) in enumerate(KO_WORDS)], "all": [], "decks": ["Tiếng Hàn"]}, "TOPIK2")


def ko_issue_with_story() -> dict:
    raw = copy.deepcopy(FIX["ko"]["issue"])
    st = FIX["ko"]["story"]
    raw["bai"].insert(1, {"loai": "truyen", "ky": 2, "ky_truoc": "Lin nghe tiếng guốc gỗ lách cách ở giếng cổ.",
                          "tieu_de": st["tieu_de"], "doan": list(st["doan"]), "dich": list(st["dich"])})
    raw["tu_moi"] = [{"w": "나막신", "r": "namaksin", "m": "guốc gỗ"}]
    return raw


fixed, notes = ai_ko.autofix(ko_issue_with_story(), kscope, opts)
rep = ai_ko.check(fixed, kscope, opts)
ok(not rep.errors, "số báo mẫu: 0 lỗi%s" % ((" — " + "; ".join(rep.errors[:4])) if rep.errors else ""))
txt = json.dumps(fixed["bai"], ensure_ascii=False)
ok("{날씨||날씨}가" in txt and "{축제||축제}가" in txt and "{무서워서||무섭다}" in txt and "{예뻐서||예쁘다}" in txt,
   "nối tra từ: 날씨가 → {날씨||날씨}가, 무서워서 → 무섭다, 예뻐서 → 예쁘다")
ok("{나막신||나막신}" in txt, "từ mới (나막신) cũng tra được")


def ko_err(mutate) -> list[str]:
    raw = ko_issue_with_story()
    mutate(raw)
    f, _n = ai_ko.autofix(raw, kscope, opts)
    return ai_ko.check(f, kscope, opts).errors


ok(any("Hán tự" in x for x in ko_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "오늘은 天氣가 맑았어요."))), "Hán tự → lỗi")
ok(any("Latin" in x for x in ko_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "오늘은 nalssi가 맑았어요."))), "Latin → lỗi")
ok(any("kana" in x for x in ko_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "오늘은 てんき가 맑았어요."))), "kana → lỗi")
ok(any("tiếng Việt" in x for x in ko_err(lambda r: r["bai"][0]["doan"].__setitem__(0, "오늘은 thời tiết 맑았어요."))),
   "chữ Việt → lỗi")

print("== 6. cả quy trình viết báo (Gemini giả)")
MODELS = json.load(open(os.path.join(ROOT, "tests", "fixtures", "gemini_models_20261116.json"), encoding="utf-8"))["models"]


class Fake(ai.Gemini):
    def __init__(self, lang):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.lang = lang
        self.kinds: list[str] = []

    def models(self):
        return MODELS

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
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
for lang, scope, words_, voice_check in (("zh", zscope, ZH_WORDS, "害怕"), ("ko", kscope, KO_WORDS, "무섭다")):
    tmp = tempfile.mkdtemp(prefix="kb133_")
    base, shared = os.path.join(tmp, "bao_" + lang), os.path.join(tmp, "chung")
    fake = Fake(lang)
    date = "2026-11-16"
    jopts = {"max_new": 3, "story": "hay", "tone": "am", "tones": ["am"], "story_base": shared, "master": copy.deepcopy(MASTER),
             "_master_log": []}
    res = ai.Job(fake, base, date, scope, jopts).run()
    ok(res.get("ok") and res.get("lang") == lang, "%s: Job chạy xong (lượt gọi: %s)%s" % (lang, ", ".join(fake.kinds),
                                                                                       "" if res.get("ok") else " — " + str(res.get("error")) + " " + str(res.get("loi"))[:300]))
    ok(fake.kinds == ["ke_lai", "viet", "soat"], "%s: đúng 3 lượt gọi (kể lại, viết, soát) — không thêm lượt" % lang)
    lib = paper.Library(base, lang)
    try:
        iss = lib.issue(date)
    except Exception as err:      # noqa: BLE001
        iss = None
        ok(False, "%s: đọc số báo lỗi %r" % (lang, err))
    if iss:
        ok(iss["lang"] == lang and len(iss["bai"]) == 3 and iss["bai"][1]["loai"] == "truyen", "%s: số báo 3 bài, có truyện" % lang)
        st0 = paper.empty_state() if hasattr(paper, "empty_state") else {}
        view = paper.issue_view(lib, st0, date, paper.Voice(), {}, {}) if paper.issue_view.__code__.co_argcount >= 6 else \
            paper.issue_view(lib, st0, date)
        tu = view.get("tu") or {}
        ok(any(voice_check in (k or "") or voice_check in (v.get("w") or "") for k, v in tu.items()), "%s: tra từ có %s" % (lang, voice_check))
        if lang == "zh":
            hv = [v["m"] for v in tu.values() if "HẠI PHẠ" in (v.get("m") or "")]
            ok(bool(hv), "zh: ô tra từ có Hán Việt (HẠI PHẠ)")
            ok("[" in iss["bai"][1]["doan"][0] and "ā" not in "" and re.search(r"\[[^|]\|[^\]]+\]", iss["bai"][1]["doan"][0]) is not None,
               "zh: truyện có pinyin theo từng chữ")
        cau = iss["chinh_ta"][0]["cau"]
        typed = paper.surface(cau)
        ok(paper.matches(cau, [], [typed], lang=lang), "%s: chép đúng nguyên câu → đúng" % lang)
        ok(not paper.matches(cau, [], [typed[:-3] + "x"], lang=lang), "%s: chép sai → chưa đúng" % lang)

print("== 7. lời nhắc")
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
    old_src = tf.extractfile("kotoba_batake/ai_en.py").read().decode("utf-8")
tmpd = tempfile.mkdtemp(prefix="kb133_en_")
for f in ("ai_en.py",):
    open(os.path.join(tmpd, "ai_en_131.py"), "w", encoding="utf-8").write(old_src)
sys.path.insert(0, tmpd)
import importlib  # noqa: E402
old_en = importlib.import_module("ai_en_131")
sys.path.pop(0)
escope = ai_en.scope_from_pick({"kho": [{"word": "apple", "reading": "/ˈæp.əl/", "meaning": "quả táo", "due": True}],
                                "all": [{"word": "go", "reading": "", "meaning": "đi"}], "decks": ["EN"]}, "A2")
same = 0
total = 0
for short in (False, True):
    for sp in (None, {"tieu_de": "T", "doan": ["a"]}):
        for day in (1, 2):
            o = {"so": 3, "ky": 2, "short": short, "max_new": 3, "tin_goc": [{"tieu_de": "A", "noi_dung": "B"}]}
            if sp:
                o["story_plain"] = sp
            d = datetime.date(2026, 11, day)
            total += 1
            same += old_en.write_prompt(escope, dict(o), [], [], d) == ai_en.write_prompt(escope, dict(o), [], [], d)
ok(same == total, "lời nhắc báo tiếng Anh giống hệt từng chữ mã 1.31.5 (%d/%d trường hợp)" % (same, total))
for name, mod, sc in (("zh", ai_zh, zscope), ("ko", ai_ko, kscope)):
    pr = mod.write_prompt(sc, {"so": 1, "ky": 2}, [], [], datetime.date(2026, 11, 2)) + \
        mod.write_prompt(sc, {"so": 1, "ky": 2, "story_plain": {"tieu_de": "T", "doan": ["a"]}}, [], [], datetime.date(2026, 11, 1))
    ok("@" not in pr and "IPA" not in pr and "tiếng Anh" not in pr and "Kotoba Village" not in pr,
       "lời nhắc %s: không sót chỗ trống / chữ của báo tiếng Anh" % name)
ok("[chữ|pinyin ghi số]" in ai_zh.rules(True) and "GIẢN THỂ" in ai_zh.rules(True) and "PHỒN THỂ" in ai_zh.rules(False),
   "lời nhắc tiếng Trung dặn pinyin theo từ, giản / phồn thể theo deck")

print("== 8. hợp đồng dữ liệu")
init = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
allp = {f: open(os.path.join(ADDON, f), encoding="utf-8").read() for f in os.listdir(ADDON) if f.endswith(".py")}
new_keys = set()
for t in allp.values():
    new_keys |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', t))
old_keys = set()
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
    for m in tf.getmembers():
        if m.isfile() and m.name.count("/") == 1 and m.name.endswith(".py"):
            old_keys |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', tf.extractfile(m).read().decode("utf-8")))
diff = sorted(new_keys - old_keys - {"kotoba_batake_edit"})       # kotoba_batake_edit: vị trí cửa sổ (1.32.2, hồ sơ máy)
ok(diff == ["kotoba_batake_paper_ko", "kotoba_batake_paper_zh"] and not (old_keys - new_keys),
   "khoá collection mới chỉ kotoba_batake_paper_zh / _ko, không bỏ khoá nào: %s" % diff)
cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "d5efb47")), mode="r:*") as tf:
    old_cfg = json.load(tf.extractfile("kotoba_batake/config.json"))
ok(sorted(set(cfg) - set(old_cfg)) == ["gemini_level_ko", "gemini_level_zh"] and not set(old_cfg) - set(cfg),
   "config.json chỉ thêm gemini_level_zh / gemini_level_ko")

print("== 9. sửa sau khi soát (16/11)")
# chấm chép: thiếu / thừa một chữ / cụm không làm cả phần sau thành sai (so theo dãy chung dài nhất)
g = paper.grade_answer("[今天|jin1 tian1][天气|tian1 qi4]很好。", "今天气很好", "zh")
ok([m[1] for m in g["marks"]] == [True, False, True, True, True, True] and g["right"] == 5 and not g["ok"],
   "zh: thiếu một chữ ở đầu → chỉ chữ đó sai (5/6), phần sau vẫn đúng")
g = paper.grade_answer("今天天气很好", "今天天气真很好", "zh")
ok(all(m[1] for m in g["marks"]) and not g["ok"], "zh: thừa một chữ → mọi chữ của câu đúng vẫn xanh, cả câu chưa đúng")
g = K.grade("다음 주에 가을 축제가 있어요.", "다음 가을 축제가 있어요")
ok([m[1] for m in g["marks"]] == [True, False, True, True, True] and g["right"] == 4, "ko: thiếu một cụm → chỉ cụm đó sai (4/5)")
g = K.grade("다음 주에 가을 축제가 있어요.", "다음주에 가을 축제가 있어요")
ok(g["ok"] and g["spacing"], "ko: chỉ khác chỗ cách → đúng, kèm nhắc cách chữ")
# kỳ truyện do báo khác tự viết (bản gốc hỏng) → bản gốc mang đúng ngôn ngữ (trước: chữ Hán → "ja", Hangul / Anh → "vi")
for text, want in (("林拿着本子，很紧张地说。", "zh"), ("린은 수첩을 들고 말했어요.", "ko"), ("リンはノートを持って言った。", "ja"),
                   ("Lin cầm cuốn sổ.", "vi"), ("Lin holds the notebook.", "en")):
    m = S.clean_master(S.master_from_episode({"ky": 4, "nguyen_van": [text]}, "2026-11-16"))
    ok(m and m["truyen"]["lang"] == want, "kỳ truyện %s → bản gốc %s" % (text[:12], want))
# báo tiếng Nhật: cách đọc từ mới vẫn phải toàn kana (biến KANA_RE không bị đè)
ok(S.KANA_RE.match("かいてき") and not S.KANA_RE.match("かい的") and not S.KANA_RE.match("快適"),
   "báo tiếng Nhật: soát cách đọc từ mới toàn kana như 1.32")

# câu chép báo tiếng Trung / tiếng Hàn: giọng zh_CN / ko_KR của máy là "có tiếng" (trước: chỉ tts / tts_en → "chưa có giọng")
v_xx = paper.Voice(tts_xx={"zh": True, "ko": True})
for lang, cau in (("zh", "[今|jīn][天|tiān]很好。"), ("ko", "오늘 날씨가 좋아요.")):
    h = v_xx.how(cau, lang)
    ok(h[0] == "tts_" + lang and paper.VOICE_LABEL.get(h[0]) == "giọng máy", "%s: câu chép phát bằng giọng máy %s" % (lang, h[0]))
src_pc = open(os.path.join(ADDON, "paper_core.py"), encoding="utf-8").read()
ok(src_pc.count('"tts_en", "tts_zh", "tts_ko")') >= 4, "mọi chỗ coi giọng máy là có tiếng đều có tts_zh / tts_ko")

print("== 10. 4 số báo Gemini thật (17–18/11, tests/fixtures/bao_133_that.json)")
REAL = json.load(open(os.path.join(ROOT, "tests", "fixtures", "bao_133_that.json"), encoding="utf-8"))["so"]
for ref, iss in sorted(REAL.items()):
    lang = ref.split("/")[0]
    texts = [x for b in iss["bai"] for x in [b["tieu_de"]] + b["doan"]] + [q["hoi"] for q in iss["cau_hoi"]] + \
        [c for q in iss["cau_hoi"] for c in q["chon"]] + [c["cau"] for c in iss["chinh_ta"]]
    if lang == "zh":
        han = bad = 0
        for t in texts:
            cs, probs = ai_zh.chars(t)
            bad += len(probs)
            for c, syl in cs:
                if Z.is_han(c):
                    han += 1
                    bad += 0 if syl and Z.syllable_ok(c, syl) else 1
        ok(han > 300 and bad == 0, "%s: %d chữ Hán, mỗi chữ một âm tiết là cách đọc của chữ đó (lỗi %d)" % (ref, han, bad))
    else:
        probs = [e for t in texts for e in S.ko_text_problems(paper.surface(t))]
        ok(not probs, "%s: chữ Hàn sạch (không Hán tự / kana / Latin lạ) %s" % (ref, probs[:2]))
    nlinks = sum(len([t for t in paper.tokenize(x) if t[0] == "word"]) for x in texts)
    ok(nlinks >= 8, "%s: %d chỗ gạch chân tra từ" % (ref, nlinks))
    ok(all(0 <= q["dung"] < len(q["chon"]) == 3 for q in iss["cau_hoi"]) and 2 <= len(iss["cau_hoi"]) <= 4,
       "%s: %d câu hỏi, mỗi câu 3 lựa chọn, đáp án đúng chỗ" % (ref, len(iss["cau_hoi"])))
    body = "".join(paper.surface(x) for b in iss["bai"] for x in b["doan"])
    cts = [paper.surface(c["cau"]) for c in iss["chinh_ta"]]
    ok(cts and all(c in body for c in cts) and all(paper.grade_answer(c["cau"], paper.surface(c["cau"]), lang)["ok"]
                                                    for c in iss["chinh_ta"]),
       "%s: câu chép chép nguyên văn trong bài, gõ đúng → đúng" % ref)
    tmp = tempfile.mkdtemp(prefix="kb133r_")
    os.makedirs(os.path.join(tmp, "bao", iss["ngay"]))
    json.dump(iss, open(os.path.join(tmp, "bao", iss["ngay"], "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
    lib = paper.Library(tmp, lang)
    view = paper.issue_view(lib, paper.empty_state() if hasattr(paper, "empty_state") else {}, iss["ngay"], paper.Voice(tts_xx={lang: True}))
    ok(view["lang"] == lang and len(view["bai"]) == 3 and all(c["audio"] for c in view["chinh_ta"]) and
       sum(1 for w in view["tu"].values() if w.get("m")) >= 8,
       "%s: trình đọc báo mở được — 3 bài, câu chép có giọng máy, %d từ tra được nghĩa" % (ref, len(view["tu"])))
hv = [v for v in REAL["zh/2026-11-17"]["tra_tu"].values() if isinstance(v, list) and re.search(r" · [A-ZÀ-Ỹ]{2,}", " ".join(map(str, v)))]
ok(len(hv) >= 5, "báo tiếng Trung thật: bảng tra từ có âm Hán Việt (%d từ, vd. %s)" % (len(hv), hv[:1]))

print("KẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
