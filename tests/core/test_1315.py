"""1.31.5 (cần gói anki: ${ANKI_PY}; Gemini giả, không gọi mạng).

Người dùng 16/11: "báo đã viết được 1 tháng, 3 tháng, 1 năm thì diễn biến câu chuyện thế nào, có được liền mạch không …
quan trọng là làm sao lượt gọi gemini vẫn dư … google vừa ra model mới tối ưu hơn, hydrogen".
  1. Chọn model: text_models nhận gemini-4-hydrogen (bỏ Argon / Carbon); role_order — sáng tác: Hydrogen → Flash → Lite,
     kiểm: Lite → Hydrogen → Flash; mỗi nhóm ≤ 3 model nên luôn còn Lite để lùi về; "model chạy được lần trước" chỉ ưu
     tiên trong cùng nhóm; thử khoá bằng Lite; các chỗ gọi đúng vai (sửa = kiểm, số tiếng Việt = kiểm, số Nhật / Anh +
     soát = sáng tác, truyện = sáng tác).
  2. Lùi model khi hết lượt: Hydrogen hết hạn mức ngày → Flash; Flash cũng hết (cả tên gọi tắt) → Lite; truyện vẫn ra.
  3. Giọng đọc cách nhau ≥ 21 giây (3 lượt / phút), kể cả hai client khác nhau.
  4. Sổ tay làng qua 1 năm (đúng luồng ensure_master + ghi kỳ như báo, Gemini giả): KHÔNG thêm lượt gọi (so với mã 1.31.4
     cùng kịch bản), ghi đủ mọi đợt / nhân vật phụ / sự thật (có trần), lời nhắc lập đợt cuối năm thấy đợt 1, nhà văn
     thấy sự thật + "đã N ngày trôi qua" khi nghỉ + "ngày này năm trước"; lời nhắc không phình (có trần); tóm tắt mọi kỳ
     giữ đủ trong khi truyen.json vẫn 60 kỳ.
  5. Lấp sổ tay từ bộ nhớ cũ; mã 1.31.3 đã phát hành chạy tiếp trên thư mục đó (đồng bộ / quay về bản cũ) không lỗi, rồi
     1.31.5 chạy tiếp không mất sổ tay.
  6. Thoại chưa trong ngoặc kép → cảnh báo cho biên tập (không thêm lượt).
Chạy: ${ANKI_PY} tests/core/test_1315.py ADDON
"""
from __future__ import annotations

import datetime
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "kotoba_batake")
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
import ma_cu  # noqa: E402

try:
    import anki.collection  # noqa: F401
except ImportError:
    print("  (bỏ qua: cần gói anki — ANKI_PY=<python có anki>)")
    print("\nKẾT QUẢ: 0/0")
    sys.exit(0)
import ai_core as ai  # noqa: E402
import story_core as S  # noqa: E402

results: list[bool] = []


def ok(c: bool, m: str) -> None:
    results.append(bool(c))
    print(("  ✓ " if c else "  ✗ ") + m)


MODELS = json.load(open(os.path.join(ROOT, "tests", "fixtures", "gemini_models_20261116.json"), encoding="utf-8"))["models"]

# ---------------------------------------------------------------------------
print("== 1. chọn model theo vai")
texts = ai.text_models(MODELS)
ok(texts[0] == "gemini-4-hydrogen" and not any("argon" in n or "carbon" in n for n in texts),
   "text_models: Hydrogen đầu tiên, không có Argon / Carbon (%s…)" % texts[:3])
viet, kiem = ai.role_order(texts, "viet"), ai.role_order(texts, "kiem")
ok(viet[0] == "gemini-4-hydrogen" and ai.model_class(viet[1]) == "f" and any(ai.model_class(n) == "l" for n in viet),
   "sáng tác: Hydrogen → Flash → … còn Flash-Lite để lùi về: %s" % viet)
ok(ai.model_class(kiem[0]) == "l" and kiem.index("gemini-4-hydrogen") < next(i for i, n in enumerate(kiem) if ai.model_class(n) == "f"),
   "kiểm: Flash-Lite → Hydrogen → Flash: %s" % kiem)
ok(all(len(x) <= ai.MAX_MODELS for x in (viet, kiem)) and sum(1 for n in viet if ai.model_class(n) == "f") <= ai.CLASS_CAP,
   "mỗi nhóm ≤ %d model ở lượt đầu, mỗi danh sách ≤ %d" % (ai.CLASS_CAP, ai.MAX_MODELS))
ok(ai.role_order(texts, "viet", prefer=["gemini-flash-lite-latest"])[0] == "gemini-4-hydrogen"
   and ai.role_order(texts, "viet", prefer=["gemini-3.8-flash"])[:2] == ["gemini-4-hydrogen", "gemini-3.8-flash"],
   "\"model chạy được lần trước\" chỉ ưu tiên trong cùng nhóm (Lite không chen lên đầu việc sáng tác)")
old_list = [m for m in MODELS if "hydrogen" not in m["name"]]
ok(ai.role_order(ai.text_models(old_list), "viet")[0] == "gemini-flash-latest", "khoá chưa có Hydrogen: như cũ (Flash đầu tiên)")
src = open(os.path.join(ADDON, "ai_core.py"), encoding="utf-8").read()
ok('role_order(texts, "kiem", client, prefer)' in src, "thử khoá bằng Flash-Lite (không tốn lượt của model viết hay)")
ok(src.count('role="kiem"') >= 1 and src.count("role=self._issue_role()") == 3 and 'return "kiem" if self.lang == "vi" else "viet"' in src,
   "chỗ gọi: sửa = kiểm; viết số / viết lại số / soát theo báo (tiếng Việt = kiểm, Nhật / Anh = sáng tác)")


class Fake(ai.Gemini):
    """Gemini giả: trả lời theo khuôn; model trong `dead` báo hết hạn mức ngày (429 PerDay)."""

    def __init__(self, dead=()):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.dead = set(dead)
        self.asked: list[tuple[str, str]] = []
        self.n_arc = 0

    def models(self):
        return MODELS

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        if self.is_exhausted(model):
            raise self._exhausted_error(model)
        self.calls += 1
        kind = ("mach" if schema is S.ARC_SCHEMA else "goc" if schema is S.MASTER_SCHEMA else
                "bien_tap" if schema is S.EDIT_SCHEMA else "khac")
        self.asked.append((kind, model))
        if model in self.dead:
            self.mark_exhausted(model, None)
            raise ai.AIError("Hết hạn mức miễn phí (%s)" % model, "quota", daily=True)
        return json.dumps(answer(self, kind, prompt), ensure_ascii=False)


P = ("\"Chị Hana ơi, khách phòng số ba muốn ăn sáng bằng một tấm bản đồ!\" Lin chạy vào bếp, tay vẫn cầm cuốn sổ nhỏ. Chị "
     "Hana đặt ấm trà xuống, nhìn cô một lúc rồi bật cười. StackChan lập tức chui vào tủ bát, lôi ra một chiếc đĩa sứ trắng. "
     "\"Tớ có đĩa. Bản đồ thì chưa nấu bao giờ,\" cậu nói rất nghiêm túc. Ngoài sân, gió cuối thu thổi lá vàng bay qua bậc thềm.")


def answer(fake, kind, prompt):
    if kind == "mach":
        fake.n_arc += 1
        n = fake.n_arc
        return {"ten": "Đợt thứ %d" % n, "muc_tieu": "m%d" % n, "bi_an": "bí ẩn %d" % n, "nhan_vat_phu": "Nhân vật phụ NV%d" % n,
                "buoc": ["bước %d.%d" % (n, i) for i in range(7)], "ket": "kết đợt %d" % n, "su_that_moi": ["Sự thật số %d" % n]}
    if kind == "bien_tap":
        return {"diem": {k: 4 for k in S.CRIT}, "loi": [], "goi_y": []}
    m = re.search(r"Viết KỲ (\d+)", prompt)
    ky = int(m.group(1)) if m else 0
    first = re.search(r"→ kỳ %d:" % ky, prompt) and ("bước %d.0" % fake.n_arc) in prompt.split("→ kỳ %d:" % ky)[1][:20]
    return {"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Kỳ %d" % ky,
            "doan": [P, P, P],
            "nho": {"tom_tat": "Kỳ %d thuộc đợt %d." % (ky, fake.n_arc), "nhan_vat_moi": ["NV%d" % fake.n_arc] if first else [],
                    "bo_ngo": ["chỉ %d" % ky], "da_giai": ["chỉ %d" % (ky - 1)]},
            "tin": [{"tieu_de": "Chợ phiên", "noi_dung": "Sáng nay chợ phiên của làng đông vui, có cả xe bí ngô to bằng cái ghế."},
                    {"tieu_de": "Cây hồng", "noi_dung": "Cây hồng sau quán đã chín đỏ, chị Hana hẹn cả làng hái vào cuối tuần."}],
            "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay. Quả to nhất cười với tớ."]}}


def day(fake, sh, date):
    """Một ngày: bản gốc (truyện + tin) rồi ghi kỳ vào bộ nhớ như báo làm."""
    m, _log = ai.ensure_master(fake, sh, date, {"story": "hay", "tones": ["bi_an", "am"], "thoi_tiet": "nắng"})
    if m and m.get("truyen"):
        t = m["truyen"]
        S.save_episode(sh, date, m["ky"], {"doan": t["doan"], "nho": t.get("nho") or {}, "diem": t.get("diem") or {}},
                       t.get("tieu_de") or "")
    return m


print("== 2. lùi model khi hết lượt")
sh = tempfile.mkdtemp(prefix="kb1315a_")
f = Fake()
day(f, sh, "2026-11-16")
ok({m for _k, m in f.asked} == {"gemini-4-hydrogen"}, "truyện (lập mạch, nhà văn, biên tập) dùng Hydrogen: %s" % sorted(set(f.asked)))
f = Fake(dead={"gemini-4-hydrogen"})
day(f, sh, "2026-11-17")
used = [m for k, m in f.asked if m not in f.dead]
ok(used and set(used) == {"gemini-flash-latest"} and f.asked[0][1] == "gemini-4-hydrogen",
   "Hydrogen hết lượt ngày → Flash (lần sau không thử lại Hydrogen): %s" % [m for _k, m in f.asked])
# như gói miễn phí 16/11: chỉ Hydrogen, 3.8 Flash (= gemini-flash-latest), 3.5 Flash Lite có hạn mức; Flash cũ bị từ chối
NO_FREE = {n for n in texts if ai.model_class(n) == "f"} | {"gemini-4-hydrogen"}
f = Fake(dead=NO_FREE)
m3 = day(f, sh, "2026-11-18")
asked = [m for _k, m in f.asked]
ok(m3 and m3["ky"] == 3 and {m for m in asked if m not in NO_FREE} == {"gemini-flash-lite-latest"}
   and all(asked.count(m) == 1 for m in NO_FREE if m in asked),
   "Hydrogen + mọi bản Flash hết lượt → Flash-Lite, truyện vẫn ra; model bị từ chối chỉ thử 1 lần (%d yêu cầu, %d bị "
   "từ chối)" % (len(asked), len([m for m in asked if m in NO_FREE])))

print("== 2b. model trả lời quá lâu → chuyển model ngay (thử thật 16/11: 3.8 Flash quá 240 giây nhiều lần)")
import socket as _socket
import urllib.request as _ur
_orig_open = _ur.urlopen
_ur.urlopen = lambda *a, **k: (_ for _ in ()).throw(_socket.timeout("timed out"))
try:
    try:
        ai.Gemini("x" * 39, sleep=lambda s: None)._request("POST", "/models/gemini-3.8-flash:generateContent", {}, timeout=240)
        ok(False, "quá thời gian phải báo lỗi")
    except ai.AIError as e:
        ok(e.kind == "busy" and e.slow, "hết thời gian chờ → lỗi \"bận\" có dấu chậm (%s, slow=%s)" % (e.kind, e.slow))
finally:
    _ur.urlopen = _orig_open
cnt = {"slow": 0, "busy": 0}
cl = ai.Gemini("x" * 39, sleep=lambda s: None)


def _raise(kind_slow):
    def f():
        cnt["slow" if kind_slow else "busy"] += 1
        raise ai.AIError("x", "busy", slow=kind_slow)
    return f


for flag in (True, False):
    try:
        cl._with_retry(_raise(flag))
    except ai.AIError:
        pass
ok(cnt == {"slow": 1, "busy": 3}, "model chậm: gọi 1 lần rồi thôi (không thử lại cùng model); 503 bận: vẫn thử lại 3 lần như cũ %s" % cnt)
f = Fake()
_g0 = Fake.generate


def _slow_flash(self, model, *a, **k):
    if model == "gemini-4-hydrogen":
        self.asked.append(("cham", model))
        raise ai.AIError("Gemini trả lời quá lâu", "busy", slow=True)
    return _g0(self, model, *a, **k)


Fake.generate = _slow_flash
try:
    m4 = day(f, tempfile.mkdtemp(prefix="kb1315s_"), "2026-11-19")
finally:
    Fake.generate = _g0
ok(m4 and [m for k, m in f.asked if k != "cham"] and all(m == "gemini-flash-latest" for k, m in f.asked if k != "cham")
   and [k for k, _m in f.asked].count("cham") == 1,
   "Hydrogen quá hạn một lần → chuyển ngay sang Flash, các bước sau không chờ Hydrogen nữa, truyện vẫn ra (%s)" % [
       (k, m.replace("gemini-", "")) for k, m in f.asked])

print("== 3. giọng đọc cách nhau ≥ %d giây" % ai.TTS_GAP)
waits: list[float] = []


class FakeTTS(ai.Gemini):
    def _request(self, method, path, body=None, timeout=0, model=""):
        import base64
        pcm = b"\x00\x01" * 24000
        return {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "audio/l16; rate=24000",
                                                                       "data": base64.b64encode(pcm).decode()}}]}}]}


ai._TTS_LAST[0] = 0.0
c1, c2 = FakeTTS("x" * 39, sleep=waits.append), FakeTTS("x" * 39, sleep=waits.append)
c1.speak("gemini-3.8-flash-tts", "こんにちは", "Kore")
c1.speak("gemini-3.8-flash-tts", "ありがとう", "Kore")
c2.speak("gemini-3.8-flash-tts", "さようなら", "Kore")
ok(len(waits) == 2 and all(w > ai.TTS_GAP - 1 for w in waits), "3 câu liền (2 client): chờ %s giây trước câu 2 và 3" % [round(w, 1) for w in waits])

# ---------------------------------------------------------------------------
print("== 4. Sổ tay làng qua 1 năm (Gemini giả, đúng luồng add-on)")
SIM = r'''
import json, os, sys, re, datetime
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])
import ai_core as ai, story_core as S
MODELS = json.load(open(sys.argv[4], encoding="utf-8"))["models"]
exec(open(sys.argv[5], encoding="utf-8").read().split("#--FAKE--")[1])
sh = sys.argv[3]
f = Fake()
d = datetime.date(2026, 1, 1)
prompts = {}
WANT = ("2026-01-01", "2026-03-09", "2026-03-20", "2026-03-21", "2027-01-02")
while d <= datetime.date(2027, 1, 2):
    if datetime.date(2026, 3, 10) <= d < datetime.date(2026, 3, 20):    # nghỉ 10 ngày
        d += datetime.timedelta(days=1); continue
    f.last_writer = ""
    day(f, sh, d.isoformat())
    if d.isoformat() in WANT:
        prompts[d.isoformat()] = f.last_writer
    d += datetime.timedelta(days=1)
print(json.dumps({"calls": f.calls, "kinds": [k for k, _m in f.asked]}))
'''
FAKE_SRC = "#--FAKE--\n" + "\n".join([
    "import json, re",
    "class Fake(ai.Gemini):",
    "    def __init__(self):",
    "        super().__init__('x' * 39, sleep=lambda s: None); self.asked = []; self.n_arc = 0; self.last_arc = ''; self.last_writer = {}",
    "    def models(self):",
    "        return MODELS",
    "    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):",
    "        self.calls += 1",
    "        kind = 'mach' if schema is S.ARC_SCHEMA else 'goc' if schema is S.MASTER_SCHEMA else 'bien_tap' if schema is S.EDIT_SCHEMA else 'khac'",
    "        self.asked.append((kind, model))",
    "        if kind == 'mach': self.last_arc = prompt",
    "        if kind == 'goc': self.last_writer = prompt",
    "        return json.dumps(answer(self, kind, prompt), ensure_ascii=False)",
    "P = " + repr(P),
    "def answer(fake, kind, prompt):",
] + ["    " + ln for ln in open(__file__, encoding="utf-8").read().split("def answer(fake, kind, prompt):\n")[1].split("\n\ndef day(")[0].splitlines()]
  + ["def day(fake, sh, date):"] + ["    " + ln for ln in open(__file__, encoding="utf-8").read().split("def day(fake, sh, date):\n")[1].split("\n\nprint(")[0].splitlines()[1:]])
fake_file = os.path.join(tempfile.mkdtemp(prefix="kb1315f_"), "fake.py")
open(fake_file, "w", encoding="utf-8").write(FAKE_SRC)

STUBS = os.path.join(HERE, "..", "stubs")
SIM_DUMP = SIM.replace('print(json.dumps({"calls": f.calls, "kinds": [k for k, _m in f.asked]}))',
                       'print(json.dumps({"calls": f.calls, "kinds": [k for k, _m in f.asked], "arc": f.last_arc, '
                       '"writer": prompts}))')


def simulate(addon_dir: str, out: str) -> dict:
    r = subprocess.run([sys.executable, "-c", SIM_DUMP, addon_dir, STUBS, out,
                        os.path.join(ROOT, "tests", "fixtures", "gemini_models_20261116.json"), fake_file],
                       capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:])
    return json.loads(r.stdout.strip().splitlines()[-1])


sh_new = tempfile.mkdtemp(prefix="kb1315n_")
new = simulate(ADDON, sh_new)
OLD = None
try:
    tmp = tempfile.mkdtemp(prefix="kb1315o_")
    with tarfile.open(fileobj=io.BytesIO(ma_cu.archive(ROOT, "e64eb22"))) as t:
        t.extractall(tmp)  # noqa: S202 — bản lưu của chính repo
    OLD = os.path.join(tmp, "kotoba_batake")
except Exception as e:      # chạy ngoài repo
    print("  (bỏ qua so với 1.31.3: %s)" % str(e)[:80])
if OLD:
    old = simulate(OLD, tempfile.mkdtemp(prefix="kb1315m_"))
    from collections import Counter
    ok(new["calls"] == old["calls"] and Counter(new["kinds"]) == Counter(old["kinds"]),
       "KHÔNG thêm lượt gọi: 1 năm (%d ngày viết) — 1.31.5 %d lượt %s = mã 1.31.3 %d lượt" % (
           len([k for k in new["kinds"] if k == "goc"]), new["calls"], dict(Counter(new["kinds"])), old["calls"]))
nb = S.load_notebook(sh_new)
sums = S.load_summaries(sh_new)
story = S.load_story(sh_new)
n_arcs = len([k for k in new["kinds"] if k == "mach"])
ok(len(nb["dot"]) == n_arcs - 1 and nb["dot"][0]["ten"] == "Đợt thứ 1" and nb["dot"][0]["tu_ky"] == 1,
   "sổ tay ghi đủ %d đợt đã xong (đợt 1 từ kỳ 1: \"%s\")" % (len(nb["dot"]), nb["dot"][0]["ten"]))
ok(len(nb["su_that"]) == S.NOTE_FACTS and nb["su_that"][-1] == "Sự thật số %d" % n_arcs,
   "điều đã thành sự thật: giữ %d điều mới nhất (cuối: \"%s\")" % (S.NOTE_FACTS, nb["su_that"][-1]))
ok(0 < len(nb["nhan_vat"]) <= S.NOTE_CHARS, "nhân vật phụ đã gặp: %d (trần %d)" % (len(nb["nhan_vat"]), S.NOTE_CHARS))
ok(len(sums) == len(set(e["ky"] for e in sums)) == len([k for k in new["kinds"] if k == "goc"]) and len(story) == 60,
   "tóm tắt giữ đủ %d kỳ; truyen.json vẫn 60 kỳ (bản cũ đọc như trước)" % len(sums))
arc_p = new["arc"]
ok("SỔ TAY LÀNG" in arc_p and "Các đợt cũ hơn: Đợt thứ 1;" in arc_p and "Sự thật số %d" % (n_arcs - 1) in arc_p
   and "Nhân vật phụ đã gặp:" in arc_p, "lập đợt cuối năm: thấy đợt 1 (đợt cũ chỉ ghi tên), sự thật, nhân vật phụ")
ok(len(arc_p) < 16000, "lời nhắc lập đợt cuối năm có trần: %d ký tự" % len(arc_p))
w = new["writer"]
ok("THỜI GIAN: kỳ trước" in w["2026-03-20"] and "11 ngày trôi qua" in w["2026-03-20"]
   and "THỜI GIAN" not in w["2026-03-09"] and "THỜI GIAN" not in w["2026-03-21"],
   "nghỉ 10 ngày (10–19/3): ngày 20/3 nhà văn biết đã 11 ngày trôi qua; ngày thường không có dòng này")
last_w = w["2027-01-02"]
ok("NGÀY NÀY NĂM TRƯỚC" in last_w and "SỔ TAY LÀNG — điều đã thành sự thật" in last_w,
   "nhà văn ngày 02/01/2027: có \"ngày này năm trước\" + sự thật")
w1 = w["2026-01-01"]
ok(w1 and "SỔ TAY LÀNG" not in w1 and "NGÀY NÀY NĂM TRƯỚC" not in w1, "kỳ 1: chưa có gì trong sổ tay thì lời nhắc như cũ")
growth = len(last_w) - len(re.sub(r"\n\nSỔ TAY LÀNG[\s\S]*?(?=\n\nNGƯỜI ĐỌC|\n\nHÔM NAY)", "", last_w))
ok(0 < growth < 1500, "lời nhắc nhà văn mỗi ngày dài thêm %d ký tự (< 1.500)" % growth)

print("== 5. bộ nhớ cũ, bản cũ chạy chen")
sh_old = tempfile.mkdtemp(prefix="kb1315b_")
S._write(os.path.join(sh_old, S.STORY_FILE), [
    {"ky": k, "ngay": "2026-10-%02d" % k, "tom_tat": "Kỳ cũ %d" % k, "nguyen_van": [P, P, P],
     "nhan_vat_moi": ["Bà bán hoa"] if k == 3 else [], "bo_ngo": [], "da_giai": []} for k in range(1, 21)])
f = Fake()
day(f, sh_old, "2026-11-01")
nb = S.load_notebook(sh_old)
ok(len(S.load_summaries(sh_old)) == 21 and any(c["ten"] == "Bà bán hoa" and c["ky"] == 3 for c in nb["nhan_vat"]),
   "lần đầu chạy trên bộ nhớ 1.31.4: lấp tóm tắt 20 kỳ cũ + nhân vật phụ cũ vào sổ tay, rồi viết kỳ 21")
if OLD:
    code = ("import sys, json; sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2])\n"
            "exec(open(sys.argv[4], encoding='utf-8').read().split('#--FAKE--')[1].replace('MODELS', 'json.load(open(sys.argv[5]))[\"models\"]'))\n"
            "import ai_core as ai, story_core as S\n"
            "f = Fake(); m = day(f, sys.argv[3], '2026-11-02'); print(json.dumps({'ky': m and m['ky']}))")
    r = subprocess.run([sys.executable, "-c", code.replace("exec(", "import ai_core as ai, story_core as S\nexec("), OLD, STUBS, sh_old,
                        fake_file, os.path.join(ROOT, "tests", "fixtures", "gemini_models_20261116.json")],
                       capture_output=True, text=True, timeout=300)
    okd = r.returncode == 0 and json.loads(r.stdout.strip().splitlines()[-1])["ky"] == 22
    ok(okd, "mã 1.31.3 đã phát hành viết tiếp kỳ 22 trên thư mục đó (máy chưa cập nhật / quay về bản cũ)%s" % (
        "" if okd else ": " + r.stderr[-300:]))
    nb_before = S.load_notebook(sh_old)
    f = Fake()
    day(f, sh_old, "2026-11-03")
    sums = S.load_summaries(sh_old)
    ok([e["ky"] for e in sums][-3:] == [21, 22, 23] and S.load_notebook(sh_old)["nhan_vat"] == nb_before["nhan_vat"],
       "1.31.5 chạy lại: sổ tay còn nguyên, tóm tắt có cả kỳ 22 của bản cũ (lấy từ truyen.json)")

print("== 6. thoại trong ngoặc kép")
st = {"tieu_de": "Kỳ thử", "doan": [P.replace('"', ""), P.replace('"', ""), P.replace('"', "")]}
_e, warns = S.check_story(st, "vi", "")
ok(any("ngoặc kép" in x for x in warns), "thoại không có ngoặc kép → cảnh báo cho biên tập (không thêm lượt gọi)")
_e, warns = S.check_story({"tieu_de": "Kỳ thử", "doan": [P, P, P]}, "vi", "")
ok(not any("ngoặc kép" in x for x in warns), "có ngoặc kép → không cảnh báo")
ok('Thoại đặt trong ngoặc kép' in S.RULES_VI, "luật viết của bản gốc dặn đặt thoại trong ngoặc kép")

print("\nKẾT QUẢ: %d/%d" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
