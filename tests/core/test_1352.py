"""1.35.2 — sửa lỗi nhánh audit/release-review-1.35.1-2026-11-18 + "Bắt đầu truyện mới" (người dùng 18/11: "Sửa các lỗi tìm
ra ở nhánh này, xem có đúng không. sau đó hiện thực tính năng reset báo nhé. vì bây giờ thêm ngôn ngữ mới nên tớ nghĩ cần
reset báo. test lại khi làm xong").

Phần A — mỗi mục tái hiện đúng lỗi của báo cáo audit (docs/kiem_thu/audit-1.35.1-2026-11-18/BAO_CAO.md) rồi kiểm cách sửa:
  01 Trang trí thử: lần đọc file ĐẦU TIÊN lỗi (các lần sau bình thường) → trước: báo thành công + mất bản thử các ô khác;
     nay: báo lỗi, file giữ nguyên từng byte (cả lệnh lưu ô lẫn chuyển ô).
  04 Chữ tách dấu (NFD) / Hangul tách nét đếm như chữ dựng sẵn (NFC) — Python và trang (node).
  05 Deck tiếng Đức / Pháp có TRƯỜNG nghĩa "Chinese" / "한국어" → Đức / Pháp (trước: Trung / Hàn); deck tiếng Trung thật vẫn
     đúng (cả deck để pinyin ở trường đầu).
  06 Điền vào câu: câu nhập bằng mã HTML dấu tách (Apre&#x300;s) che đúng "le chat".
  07 Kệ nhật ký có tháng chỉ có nhật ký (viết trước lượt ôn đầu tiên).
  08 Bộ đệm tra từ báo Đức / Pháp: lần thứ 20.001 không còn KeyError.
  09 Luyện viết tiếng Đức: tô chỗ sửa viết hoa (hund → Hund).
  10 Lịch hoa: dòng Báo ghi tên báo khi đọc 2 báo cùng ngày.
  11 README: luyện viết 6 tiếng.
  02 03 12 13 14 15: soát mã (chạy thật trong Anki ở tests/anki/e2e_1352.js).
Phần B — Bắt đầu truyện mới (story_core.restart_story / undo_restart / episode_base, Gemini giả chạy đúng ensure_master):
  truyện mới từ kỳ 1, số báo / file báo cũ không đổi, migrate_story không chép truyện cũ của từng báo về, hôm nay đã có bản
  gốc → giữ để các báo còn lại hôm nay kể cùng kỳ (truyện mới từ mai, kỳ báo thứ hai ghi vào thư mục cất), nhận xét Hay /
  Nhạt của số cũ vào thư mục cất, báo Claude Code: kỳ trước lúc bắt đầu lại không chép về, kỳ sau đánh số nối truyện mới;
  Lấy lại truyện cũ khi truyện mới chưa có kỳ nào; lỗi ghi giữa chừng → trả lại như cũ; bấm hai lần không cất truyện rỗng.
Phần C — hợp đồng dữ liệu: không thêm khoá collection / mục config.json; mã 1.31.3 đã phát hành chạy trên thư mục báo đã
  bắt đầu lại không lỗi và không kéo truyện cũ về.

Chạy: ${ANKI_PY} tests/core/test_1352.py ADDON
"""
from __future__ import annotations

import builtins
import datetime
import json
import os
import re
import shutil
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
import ai_core as ai  # noqa: E402
import ai_eu  # noqa: E402
import fields_core as F  # noqa: E402
import garden_core as core  # noqa: E402
import journal_core as J  # noqa: E402
import story_core as S  # noqa: E402

PASS = FAIL = 0


def ok(c, m):
    global PASS, FAIL
    if c:
        PASS += 1
    else:
        FAIL += 1
    print(("  ✓ " if c else "  ✗ ") + m)


init_src = open(os.path.join(ADDON, "__init__.py"), encoding="utf-8").read()
cal_src = open(os.path.join(ADDON, "web", "calendar.js"), encoding="utf-8").read()
TMP = tempfile.mkdtemp(prefix="kb1352_")

# ---------------------------------------------------------------------------
print("== A01. Trang trí thử: lần đọc đầu lỗi không làm mất bản thử")
if HAVE_ANKI:
    from anki.collection import Collection
    import draft_core as draft
    import backup_core as backup

    def new_state(name):
        folder = os.path.join(TMP, name)
        os.makedirs(folder)
        col = Collection(os.path.join(folder, "collection.anki2"))
        uf = os.path.join(folder, "user_files")
        os.makedirs(uf)
        return core.GardenState(os.path.join(uf, "state.json"), lambda: col), col

    st, col = new_state("draft1")
    target = backup.profile_path(st._draft_path(), col)

    def save(scene, slot, item):
        st.draft_store(draft.put(st.draft_load(), scene, slot, {"items": [{"id": item, "x": 6, "y": 1}]}))

    save("yard", 0, "bench")
    save("room", 1, "tv")
    before = open(target, "rb").read()
    real_open = builtins.open
    faults = [1]

    def open_once(path, mode="r", *a, **k):          # đúng như báo cáo: chỉ lần mở để ĐỌC đầu tiên của file bản thử lỗi
        if os.fspath(path) == target and mode == "r" and faults:
            faults.pop()
            raise OSError("QA: first read failed")
        return real_open(path, mode, *a, **k)

    builtins.open = open_once
    err = ""
    try:
        save("yard", 2, "lamp")
    except core.HomeError as e:
        err = str(e)
    finally:
        builtins.open = real_open
    got = {sc: [i + 1 for i, s in enumerate(d["slots"]) if s] for sc, d in st.draft_load()["scenes"].items()}
    ok(err and open(target, "rb").read() == before and got == {"yard": [1], "room": [2]} and not os.path.exists(target + ".hong"),
       "lưu ô (đọc lỗi một lần): báo lỗi \"%s…\", file giữ nguyên từng byte, còn đủ Sân bản 1 + Phòng bản 2 %s"
       % (err[:40], got))
    save("yard", 2, "lamp")
    got = {sc: [i + 1 for i, s in enumerate(d["slots"]) if s] for sc, d in st.draft_load()["scenes"].items()}
    ok(got == {"yard": [1, 3], "room": [2]}, "lần lưu sau (đọc bình thường): yard [1, 3], room [2] %s" % got)
    # lệnh chuyển ô (pick) — báo cáo: chỉ bấm chuyển ô cũng ghi kho trống
    before = open(target, "rb").read()
    faults[:] = [1]
    builtins.open = open_once
    err = ""
    try:
        st.draft_store(draft.pick(st.draft_load(), "yard", 1))
    except core.HomeError as e:
        err = str(e)
    finally:
        builtins.open = real_open
    ok(err and open(target, "rb").read() == before, "chuyển ô (đọc lỗi một lần): báo lỗi, không ghi gì")
    # lệnh đọc (get) — trang không nhận kho trống (ô trống → chép cảnh thật → lưu đè)
    faults[:] = [1]
    builtins.open = open_once
    err = ""
    try:
        st.draft_load()
    except core.HomeError as e:
        err = str(e)
    finally:
        builtins.open = real_open
    ok(err and st.draft_load(strict=False)["scenes"], "đọc lỗi: báo lỗi (không trả kho trống cho trang); strict=False vẫn đọc được")
    # file hỏng (không phải JSON) → vẫn như 1.35.1: giữ .hong rồi ghi bản mới
    with open(target, "w", encoding="utf-8") as f:
        f.write('{"v": 1, "scenes": {')
    save("yard", 0, "bench")
    ok(os.path.exists(target + ".hong") and st.draft_load()["scenes"]["yard"]["slots"][0], "file hỏng: .hong + bản mới (như 1.35.1)")
    st0, _c0 = new_state("draft0")
    ok(st0.draft_load() == draft.empty(), "chưa có file bản thử: trống, không lỗi")
    ok('self._js("homeDrafts", STATE.draft_load())' in init_src and "except (core.HomeError, draft_core.DraftError) as err:" in init_src,
       "cầu nối: lỗi đọc → homeError (trang giữ bản đang thấy, đọc lại tối đa một lần / 5 giây)")
else:
    print("  – bỏ qua (cần ANKI_PY)")

# ---------------------------------------------------------------------------
print("== A04. Chữ tách dấu (NFD) đếm như chữ dựng sẵn (NFC)")
fr_nfc = " ".join(["élève"] * 30)
fr_nfd = __import__("unicodedata").normalize("NFD", fr_nfc)
de_nfd = __import__("unicodedata").normalize("NFD", " ".join(["frühstücken"] * 30))
ko_nfd = __import__("unicodedata").normalize("NFD", " ".join(["학교"] * 20))
ok(J.count_units(fr_nfd, "fr") == 30 and J.count_units(de_nfd, "de") == 30 and J.count_units(ko_nfd, "ko") == 40,
   "Python đếm NFD: Pháp 30 từ, Đức 30 từ, Hàn 40 ký tự (trước: %s)" % "Pháp 90 · Hàn 100")
g1, cut1 = J.clip_units(J.clean_line(fr_nfd, 2000), "fr", 30)
g2, cut2 = J.clip_units(J.clean_line(ko_nfd, 2000), "ko", 60)
ok(not cut1 and g1 == fr_nfc and not cut2 and J.count_units(g2, "ko") == 40,
   "lưu: chữ NFD thành NFC, không cắt bài 30 từ (trước: còn 10 từ) / 20 cụm tiếng Hàn (trước: còn 12)")
node = shutil.which("node")
if node:
    js = r"""
const fs = require("fs"); global.document = { getElementById: () => null };
eval(fs.readFileSync(process.argv[1], "utf8") + "; global.C = GardenCal;");
const nfd = (s) => s.normalize("NFD");
const fr = Array(30).fill("élève").join(" "), ko = Array(20).fill("학교").join(" ");
console.log(JSON.stringify({ fr: C._units(nfd(fr), "fr"), ko: C._units(nfd(ko), "ko"), clip: C._clip(nfd(fr), "fr", 30) === fr,
  de: C._units(nfd(Array(30).fill("frühstücken").join(" ")), "de") }));
"""
    r = subprocess.run([node, "-e", js, os.path.join(ADDON, "web", "calendar.js")], capture_output=True, text=True)
    try:
        jr = json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        jr = {}
        print(r.stderr[-400:])
    ok(jr == {"fr": 30, "ko": 40, "clip": True, "de": 30}, "trang đếm NFD như Python: %s" % jr)
ok("nfcBox(ta);" in cal_src, "ô luyện viết đổi chữ NFD thành NFC khi gõ / dán (giữ con trỏ)")

# ---------------------------------------------------------------------------
print("== A05. Deck có trường nghĩa tiếng Trung / Hàn")
cases = [
    ("German Vocabulary QA", ["Wort", "Chinese", "Beispiel"], ["der Hund", "die Katze", "das Buch", "gehen", "spielen"], "de"),
    ("Vocab FR", ["Mot", "한국어", "Exemple"], ["le lit", "la porte", "lire", "porter", "l'école"], "fr"),
    ("Basic", ["Front", "Chinese"], ["apple", "house", "water", "book", "friend"], "en"),
    # không đổi (đối chứng của báo cáo + deck tiếng Trung / Hàn thật)
    ("Chinese HSK", ["Hanzi", "Pinyin", "Meaning"], ["你好", "谢谢", "学生", "书"], "zh"),
    ("Chinese", ["Pinyin", "Hanzi", "Meaning"], ["nǐ hǎo", "xièxie", "shū", "xuésheng"], "zh"),
    ("Basic", ["Front", "Pinyin", "Back"], ["ni3 hao3", "xie4xie", "shu1"], "zh"),
    ("Mandarin vocab", ["English", "Chinese"], ["hello", "thanks", "book"], "zh"),
    ("Korean vocabulary", ["Korean", "Romaja", "Nghĩa"], ["쉬다", "돕다", "가다"], "ko"),
    ("Basic", ["Front", "Korean"], ["학교", "사과", "친구"], "ko"),
    ("Basic", ["Front", "中文"], ["你好", "谢谢", "学生"], "zh"),
    ("Japanese", ["Expression", "Reading", "Chinese reading"], ["学生", "がくせい"], "ja"),
]
for name, keys, words, want in cases:
    got = F.guess_lang(name, keys, words)
    ok(got == want, "%s %s %s → %s" % (name, keys, words[:2], got))

# ---------------------------------------------------------------------------
print("== A06. Điền vào câu: câu nhập bằng mã HTML dấu tách")
c1 = core.make_cloze("Apre&#x300;s le di&#x302;ner, le chat dort.", "le chat", lang="fr")
c2 = core.make_cloze("Après le dîner, le chat dort.", "le chat", lang="fr")
c3 = core.make_cloze("Der Hu&#x308;gel und der Hund schla&#x308;ft.", "der Hund", lang="de")
ok(c1 and '<b class="kb-hl">le chat</b>' in c1["a"] and c1["q"] == c2["q"],
   "Pháp: che đúng \"le chat\" (trước: \", le ch\") — %s" % (c1 and c1["q"]))
ok(c3 and '<b class="kb-hl">der Hund</b>' in c3["a"], "Đức: che đúng \"der Hund\" — %s" % (c3 and c3["q"]))

# ---------------------------------------------------------------------------
print("== A07. Kệ nhật ký: tháng có viết mà chưa có lượt ôn")
sh = J.shelf(datetime.date(2026, 11, 2), datetime.date(2026, 11, 18), [(2026, 10)])
ok([b["id"] for b in sh][:2] == ["2026-10", "2026-11"], "kệ có Tháng 10 (nhật ký 31/10) trước Tháng 11: %s" % [b["id"] for b in sh])
ok("shelf = journal.shelf(first, today, extra)" in init_src and "JOURNAL.all_keys()" in init_src,
   "cal_book đưa các tháng có viết vào kệ (mở / xuất riêng được cuốn 2026-10)")

# ---------------------------------------------------------------------------
print("== A08. Bộ đệm tra từ báo Đức / Pháp đầy")
ai_eu._RX.clear()
err = None
try:
    for i in range(20001):
        ai_eu.find_links("Ein Apfel liegt im Garten.", ["Gartenwort%d" % i], "de")
    ai_eu.find_links("Le chat dort.", ["le chat"], "fr")
except KeyError as e:
    err = e
ok(err is None and len(ai_eu._RX) <= 20000, "20.002 mục từ khác nhau: không KeyError (bộ đệm %d mục)" % len(ai_eu._RX))
ok(ai_eu.find_links("Der Hund schläft.", ["der Hund"], "de") == [(0, 8, "der Hund")], "sau khi dọn vẫn tra đúng")

# ---------------------------------------------------------------------------
print("== A09. Luyện viết tiếng Đức: chỗ sửa viết hoa")
ch, _d = J.diff_marks("Ich sehe einen hund.", "Ich sehe einen Hund.", "de")
segs = J.segments("Ich sehe einen Hund.", ch, [], _d)
ok([s[0] for s in segs if "c" in s[1]] == ["Hund."], "tô \"Hund\" (trước: 0 chỗ): %s" % segs)
ch_en, _ = J.diff_marks("I like the book.", "I like the book.", "en")
ch_fr, _ = J.diff_marks("je suis là.", "Je suis là.", "fr")
ok(ch_en == [] and ch_fr == [], "tiếng Anh / Pháp giữ như cũ (không so hoa / thường)")

# ---------------------------------------------------------------------------
print("== A10. Lịch hoa: hai báo cùng ngày")
read = {"de": {"2026-11-18": {"ct": {"0": False, "1": False}}}, "fr": {"2026-11-18": {"ct": {"0": True}}}}
iss = {"de": {"2026-11-18": {"so": 1, "ct": 2}}, "fr": {"2026-11-18": {"so": 1, "ct": 2}}}
line = J.paper_line(read, iss, "2026-11-18")
ok(line == "báo tiếng Đức: đọc số 1 · chép đúng 0 / 2 câu; báo tiếng Pháp: đọc số 1 · chép đúng 1 / 2 câu", line)
ok(J.paper_line({"de": {"2026-11-18": {}}}, {}, "2026-11-18") == "đã đọc" and
   J.paper_line({"en": {"2026-11-18": {}}, "ja": {"2026-11-17": {}}}, {"en": {"2026-11-18": {"so": 3}}}, "2026-11-18") == "đọc số 3",
   "một báo trong ngày: như cũ (không ghi tên)")

# ---------------------------------------------------------------------------
print("== A11. README")
readme = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
ok("luyện viết** một hai câu bằng tiếng bạn đang học (Nhật, Anh, Trung, Hàn, Đức hoặc Pháp)" in readme,
   "README: luyện viết 6 tiếng")

# ---------------------------------------------------------------------------
print("== A02 · A03 · A12 · A13 · A14 · A15 (soát mã — chạy thật: tests/anki/e2e_1352.js)")
ok('lang = p.get("lang") if p.get("lang") in journal.WRITE_LANGS else _write_lang(cfg)' in init_src,
   "02: lưu bài giữ tiếng của ô đang viết (bỏ chọn báo Đức không chuyển bài sang tiếng Trung)")
ok('if cut and force != "cut":' in init_src and '(cut ? ":cut" : "")' in cal_src and 'yes: "Đổi và cắt bớt"' in cal_src,
   "03: đổi tiếng mà bài dài hơn giới hạn → hỏi trước; Python không cắt nếu không kèm \":cut\"")
ok('self._js("calStale")' in init_src and init_src.count("_dialog.cal_stale()") == 2 and "function mergeTyping()" in cal_src,
   "12: sau đồng bộ / nhập collection → bỏ chữ đang giữ, Lịch hoa đọc lại + so ba bên")
ok("err = self._fix_text(ds, p.get(\"t\"), p.get(\"lang\"))" in init_src and
   'H.send("cal:fix:" + JSON.stringify({ d: v.d, t: ta.value, lang: w.lang }));' in cal_src,
   "13: Nhờ Gemini sửa gửi kèm chữ đang thấy; lưu không được thì không gửi")
ok("self.cal_rollover(" in init_src and "d == today - datetime.timedelta(days=1)" in init_src,
   "14: sang ngày mới → lưu nốt chữ vào ngày cũ, Lịch hoa đọc lại (ô ngày cũ khoá)")
ok("if (r.ok && saveBad) { saveBad = false;" in cal_src, "15: lưu lại được → bỏ cảnh báo \"Chưa lưu được\"")

# ---------------------------------------------------------------------------
print("== B. Bắt đầu truyện mới")
MODELS = [{"name": "models/gemini-flash-lite-latest", "supportedGenerationMethods": ["generateContent"]}]
P = ("\"Chị Hana ơi, khách phòng số ba muốn ăn sáng bằng một tấm bản đồ!\" Lin chạy vào bếp, tay vẫn cầm cuốn sổ nhỏ. Chị "
     "Hana đặt ấm trà xuống, nhìn cô một lúc rồi bật cười. StackChan lập tức chui vào tủ bát, lôi ra một chiếc đĩa sứ trắng.")


class Fake(ai.Gemini):
    def __init__(self):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.asked = []
        self.n_arc = 0

    def models(self):
        return MODELS

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.calls += 1
        kind = "mach" if schema is S.ARC_SCHEMA else "bien_tap" if schema is S.EDIT_SCHEMA else "khac"
        self.asked.append((kind, prompt))
        if kind == "mach":
            self.n_arc += 1
            n = self.n_arc
            return json.dumps({"ten": "Đợt %d" % n, "muc_tieu": "m", "bi_an": "b", "nhan_vat_phu": "NV%d" % n,
                               "buoc": ["bước %d.%d" % (n, i) for i in range(7)], "ket": "k", "su_that_moi": []},
                              ensure_ascii=False)
        if kind == "bien_tap":
            return json.dumps({"diem": {k: 4 for k in S.CRIT}, "loi": [], "goi_y": []})
        m = re.search(r"Viết KỲ (\d+)", prompt)
        ky = int(m.group(1)) if m else 0
        return json.dumps({"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Kỳ %d" % ky,
                           "doan": [P, P, P], "nho": {"tom_tat": "Tóm tắt kỳ %d." % ky, "nhan_vat_moi": [], "bo_ngo": [],
                                                      "da_giai": []},
                           "tin": [{"tieu_de": "Chợ phiên", "noi_dung": "Sáng nay chợ phiên của làng đông vui."}],
                           "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay."]}},
                          ensure_ascii=False)


def day(fake, shared, date, second=False):
    """Một ngày: bản gốc (báo đầu tiên) rồi ghi kỳ vào bộ nhớ đúng như Job (ep_base = episode_base). second=True: báo thứ
    hai cùng ngày (đọc lại bản gốc, ghi lại kỳ)."""
    m, _log = ai.ensure_master(fake, shared, date, {"story": "hay", "tones": ["am"], "thoi_tiet": "nắng"})
    if m and m.get("truyen"):
        t = m["truyen"]
        S.save_episode(S.episode_base(shared, date), date, m["ky"],
                       {"doan": t["doan"], "nho": t.get("nho") or {}, "diem": t.get("diem") or {}}, t.get("tieu_de") or "")
    return m


ok("ep_base = story_core.episode_base(self.story_base, self.date) if self.story_base != self.base else self.story_base"
   in open(os.path.join(ADDON, "ai_core.py"), encoding="utf-8").read(),
   "Job ghi kỳ vào story_core.episode_base (như hàm day() của test)")
SH = os.path.join(TMP, "user_files", "bao_chung")
JA = os.path.join(TMP, "user_files", "bao_gemini")
os.makedirs(os.path.join(JA, "bao"))
f = Fake()
days = ["2026-11-%02d" % d for d in range(10, 15)]
for d in days:
    day(f, SH, d)
    os.makedirs(os.path.join(JA, "bao", d))
    json.dump({"ngay": d, "so": days.index(d) + 1, "truyen_chung": True,
               "bai": [{"loai": "truyen", "ky": days.index(d) + 1, "doan": ["x"]}]},
              open(os.path.join(JA, "bao", d, "bao.json"), "w", encoding="utf-8"))
ok(S.last_ky(SH) == 5 and S.story_state(SH, "2026-11-15")["ky"] == 5, "trước: truyện ở kỳ 5")
# truyện cũ của từng báo (≤ 1.25.1) còn trên máy — migrate_story không được chép về sau khi bắt đầu lại
S._write(os.path.join(JA, S.STORY_FILE), [{"ky": 1, "ngay": "2026-10-01", "tom_tat": "truyện rất cũ", "nguyen_van": ["x"]}])
snap = {p: open(os.path.join(dp, p), "rb").read() for dp, _ds, fs in os.walk(JA) for p in fs}
res = S.restart_story(SH, "2026-11-15")
ok(res["tu_ngay"] == "2026-11-15" and res["ky_cu"] == 5 and S.load_story(SH) == [] and S.last_ky(SH) == 0,
   "bắt đầu lại (hôm nay chưa có báo): truyện mới từ hôm nay, bộ nhớ trống")
arch = os.path.join(SH, S.ARCHIVE_DIR, res["thu_muc"])
ok(len(S.load_story(arch)) == 5 and os.path.isfile(os.path.join(arch, S.NOTE_FILE)) and
   len(os.listdir(os.path.join(arch, S.MASTER_DIR))) == 5 and not os.path.exists(os.path.join(SH, S.MASTER_DIR)),
   "truyện cũ cất đủ ở truyen_cu/%s (5 kỳ, sổ tay, 5 bản gốc)" % res["thu_muc"])
ok(ai.migrate_story(SH, [JA]) == "" and S.load_story(SH) == [], "migrate_story không chép truyện cũ của báo tiếng Nhật về")
ok({p: open(os.path.join(dp, p), "rb").read() for dp, _ds, fs in os.walk(JA) for p in fs} == snap,
   "thư mục báo tiếng Nhật (số báo, lịch sử) không đổi byte nào")
ok(ai.numbering(JA, "2026-11-15")[0] == 6, "số báo tiếp theo vẫn là số 6 (số báo không đánh lại)")
stt = S.story_state(SH, "2026-11-15")
ok(stt["ky"] == 0 and stt["undo"] and stt["reset"] and stt["reset"]["ky_cu"] == 5 and not stt["reset"]["cho"],
   "tab Nguồn báo: chưa có kỳ nào, Lấy lại được truyện cũ (kỳ 5): %s" % stt)
res2 = S.restart_story(SH, "2026-11-15")
ok(res2.get("same") and len(os.listdir(os.path.join(SH, S.ARCHIVE_DIR))) == 1, "bấm lần nữa: không cất thêm một truyện rỗng")
ok(S.undo_restart(SH) and S.last_ky(SH) == 5 and len(os.listdir(os.path.join(SH, S.MASTER_DIR))) == 5 and not S.resets(SH)
   and not os.path.exists(arch), "Lấy lại truyện cũ: đủ 5 kỳ + bản gốc, không còn thư mục cất rỗng")
m6 = day(f, SH, "2026-11-15")
ok(m6["ky"] == 6, "lấy lại xong viết tiếp: kỳ 6")
# bắt đầu lại khi hôm nay ĐÃ có bản gốc (báo đầu tiên đã viết)
calls0 = f.calls
res = S.restart_story(SH, "2026-11-15")
ok(res["tu_ngay"] == "2026-11-16" and os.path.isfile(S.master_path(SH, "2026-11-15")),
   "hôm nay đã có bản gốc kỳ 6 → giữ lại, truyện mới từ số ngày mai (16/11)")
arch = os.path.join(SH, S.ARCHIVE_DIR, res["thu_muc"])
m_second = day(f, SH, "2026-11-15", second=True)
ok(m_second["ky"] == 6 and f.calls == calls0, "báo thứ hai hôm nay kể cùng kỳ 6, không gọi Gemini thêm")
ok(S.load_story(SH) == [] and any(e["ky"] == 6 for e in S.load_story(arch)),
   "kỳ 6 của báo thứ hai ghi vào thư mục cất (truyện mới vẫn trống)")
stt = S.story_state(SH, "2026-11-15")
ok(stt["reset"]["cho"] and stt["undo"], "tab Nguồn báo: \"truyện mới bắt đầu từ số ngày 16/11\", còn lấy lại được")
m7 = day(f, SH, "2026-11-16")
ok(m7["ky"] == 1 and S.last_ky(SH) == 1, "ngày mai: kỳ 1 của truyện mới")
lap = [p for k, p in f.asked if k == "mach"][-1]
ok("Tóm tắt kỳ 6" not in lap and "Tóm tắt kỳ 5" not in lap, "lập mạch đợt mới không thấy tóm tắt truyện cũ")
w1 = [p for k, p in f.asked if k == "khac"][-1]
ok("Tóm tắt kỳ" not in w1, "nhà văn viết kỳ 1 không thấy kỳ cũ")
ok(not S.story_state(SH, "2026-11-16")["undo"] and not S.undo_restart(SH),
   "truyện mới đã có kỳ 1 → không lấy lại truyện cũ được (tránh lẫn hai truyện)")
# nhận xét Hay / Nhạt của số cũ
for d, so in (("2026-11-15", 6), ("2026-11-16", 7)):
    os.makedirs(os.path.join(JA, "bao", d), exist_ok=True)
    json.dump({"ngay": d, "so": so, "truyen_chung": True, "bai": [{"loai": "truyen", "ky": 6 if so == 6 else 1}]},
              open(os.path.join(JA, "bao", d, "bao.json"), "w", encoding="utf-8"))
fb_old = ai.feedback_bases(SH, JA, "2026-11-12", 3)
fb_6 = ai.feedback_bases(SH, JA, "2026-11-15", 6)
fb_new = ai.feedback_bases(SH, JA, "2026-11-16", 1)
ok(fb_new == [SH] and fb_6 == [arch] and fb_old and fb_old[0].startswith(os.path.join(SH, S.ARCHIVE_DIR)),
   "nhận xét: số mới → bộ nhớ đang viết; số 15/11 (kỳ 6) và số cũ hơn → thư mục cất của truyện đó")
S.set_feedback(fb_6[0], 6, "nhat", "chậm")
ok(S.feedback_of(arch, 6) == {"y": "nhat", "ghi": "chậm"} and S.last_ky(SH) == 1 and len(S.load_story(SH)) == 1,
   "bấm Nhạt ở số cũ: ghi vào truyện cũ, truyện mới không có thêm dòng nào")
# báo Claude Code (kotoba_daily)
KD = os.path.join(TMP, "kotoba_daily")
for d, ky in (("2026-11-15", 41), ("2026-11-17", 42)):
    os.makedirs(os.path.join(KD, "bao", d))
    json.dump({"ngay": d, "so": ky, "tom_tat": "Truyện kỳ %d: chuyện của Claude." % ky,
               "bai": [{"loai": "truyen", "ky": ky, "tieu_de": "第%d話" % ky, "doan": ["日本語"],
                        "dich": ["Bản dịch kỳ %d của Claude, dài đủ một câu để làm nguyên văn." % ky]}]},
              open(os.path.join(KD, "bao", d, "bao.json"), "w", encoding="utf-8"))
n = ai.import_claude_story(SH, KD, "2026-11-17")
st_new = S.load_story(SH)
ok(n == 1 and [e["ky"] for e in st_new] == [1, 2] and st_new[-1].get("ky_claude") == 42,
   "Claude Code: kỳ 41 (đăng trước lúc bắt đầu lại) không chép; kỳ 42 (17/11) thành kỳ 2 của truyện mới: %s"
   % [(e["ky"], e["ngay"]) for e in st_new])
# lỗi ghi giữa chừng → trả lại như cũ
sh2 = os.path.join(TMP, "u2", "bao_chung")
for d in ("2026-11-10", "2026-11-11"):
    day(f, sh2, d)
snap2 = sorted(os.listdir(sh2))
real_write = S._write


def bad_write(path, data):
    if path.endswith(S.STORY_FILE):
        raise OSError("đĩa đầy")
    return real_write(path, data)


S._write = bad_write
err = None
try:
    S.restart_story(sh2, "2026-11-12")
except OSError as e:
    err = e
finally:
    S._write = real_write
ok(err is not None and S.last_ky(sh2) == 2 and sorted(x for x in os.listdir(sh2) if x != S.ARCHIVE_DIR) == snap2
   and not S.resets(sh2), "ghi lỗi giữa chừng: báo lỗi, mọi file về chỗ cũ, truyện vẫn ở kỳ 2")
# __init__ / trang
ok('"truyen": story_view(),' in init_src and 'elif action == "restart":' in init_src and '"restart", "restart_undo")' in init_src,
   "cầu nối: ai:restart / ai:restart_undo, khoá khi Gemini đang viết; tab Nguồn báo nhận story_view()")
pj = open(os.path.join(ADDON, "web", "paper.js"), encoding="utf-8").read()
ok('title: "Bắt đầu truyện mới từ kỳ 1?", always: true' in pj and '"Lấy lại truyện cũ"' in pj,
   "tab Nguồn báo → Tuỳ chọn thêm: nút Bắt đầu truyện mới (hỏi trước) / Lấy lại truyện cũ")

# ---------------------------------------------------------------------------
print("== C. Hợp đồng dữ liệu")
KEY_RE = re.compile(r"\"(kotoba_batake_[a-z0-9_]+)\"")
cur_keys = set()
for fn in os.listdir(ADDON):
    if fn.endswith(".py"):
        cur_keys |= set(KEY_RE.findall(open(os.path.join(ADDON, fn), encoding="utf-8").read()))
BASE_COMMIT = "097f378"          # 1.35.1 (đầu nhánh audit 18/11)
old = subprocess.run(["git", "-C", ROOT, "show", BASE_COMMIT + ":kotoba_batake/config.json"], capture_output=True, text=True)
if old.returncode == 0:
    old_keys = set()
    ls = subprocess.run(["git", "-C", ROOT, "ls-tree", "--name-only", BASE_COMMIT, "kotoba_batake/"], capture_output=True,
                        text=True).stdout.split()
    for fn in ls:
        if fn.endswith(".py"):
            old_keys |= set(KEY_RE.findall(subprocess.run(["git", "-C", ROOT, "show", BASE_COMMIT + ":" + fn],
                                                          capture_output=True, text=True).stdout))
    ok(cur_keys == old_keys, "khoá collection kotoba_batake_* = 1.35.1 (%d khoá)" % len(cur_keys))
    ok(json.loads(old.stdout) == json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8")),
       "config.json giống hệt 1.35.1 (không thêm mục)")
else:
    print("  – bỏ qua so với 1.35.1 (repo không có commit %s)" % BASE_COMMIT)
try:
    import io as _io
    import tarfile as _tar
    import ma_cu
    OLD_DIR = tempfile.mkdtemp(prefix="kb1352_old_")
    _tar.open(fileobj=_io.BytesIO(ma_cu.archive(ROOT, "e64eb22"))).extractall(OLD_DIR)
except Exception as e:      # noqa: BLE001
    OLD_DIR = None
    print("  – không lấy được mã 1.31.3: %s" % e)
if OLD_DIR and HAVE_ANKI:
    code = r"""
import sys, json
sys.path.insert(0, sys.argv[1] + "/kotoba_batake")
import ai_core as ai, story_core as s
sh, ja = sys.argv[2], sys.argv[3]
print(json.dumps({"mig": ai.migrate_story(sh, [ja]), "ky": ai.next_ky(s.load_story(sh), "2026-11-18"),
                  "fb": ai.feedback_bases(sh, ja, "2026-11-12", 3)}))
"""
    pr = subprocess.run([sys.executable, "-c", code, OLD_DIR, SH, JA], capture_output=True, text=True)
    try:
        rr = json.loads(pr.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        rr = {}
        print(pr.stderr[-600:])
    ok(rr.get("mig") == "" and rr.get("ky") == 3,
       "mã 1.31.3 (máy khác / quay về bản cũ) trên thư mục đã bắt đầu lại: không chép truyện cũ về, viết tiếp kỳ 3: %s" % rr)
man = json.load(open(os.path.join(ADDON, "manifest.json"), encoding="utf-8"))
_hv2 = tuple(int(x) for x in re.findall(r"\d+", str(man.get("human_version", "")))[:3])
ok(_hv2 >= (1, 35, 2), "manifest: %s (≥ 1.35.2)" % man.get("human_version"))

shutil.rmtree(TMP, ignore_errors=True)
if OLD_DIR:
    shutil.rmtree(OLD_DIR, ignore_errors=True)
print("\nKẾT QUẢ: %d/%d" % (PASS, PASS + FAIL))
sys.exit(1 if FAIL else 0)
