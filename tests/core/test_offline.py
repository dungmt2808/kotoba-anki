"""Test offline cho các phần sửa ở 1.13 trong ai_core / paper_core (không gọi mạng, không cần Qt);
1.22.2: khoá Gemini kiểu mới "AQ." (nhận, che trong Báo lỗi, gửi bằng header, lỗi 401 ACCESS_TOKEN_TYPE_UNSUPPORTED).

Chạy: python test_offline.py THƯ_MỤC_ADD_ON
Không có gói `anki` thì dùng tests/stubs (ai_core chỉ cần garden_core import được).
"""
import array, json, math, os, struct, sys, tempfile, time, wave

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai
import paper_core as paper

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def tone_pcm(secs=1.0, rate=24000, freq=220):
    return struct.pack("<%dh" % int(rate * secs), *(int(6000 * math.sin(2 * math.pi * freq * i / rate)) for i in range(int(rate * secs))))


def wav_bytes(pcm, rate=24000, extra=b""):
    """WAV như model TTS 3.8 trả về: fmt + data + (tuỳ chọn) khối C2PA ở cuối."""
    fmt = struct.pack("<HHIIHH", 1, 1, rate, rate * 2, 2, 16)
    body = b"WAVE" + b"fmt " + struct.pack("<I", len(fmt)) + fmt + b"data" + struct.pack("<I", len(pcm)) + pcm
    if extra:
        body += b"C2PA" + struct.pack("<I", len(extra)) + extra
    return b"RIFF" + struct.pack("<I", len(body)) + body


print("== giải mã giọng đọc Gemini")
pcm = tone_pcm(1.0)
got, rate = ai.decode_audio(wav_bytes(pcm, extra=b"\x00jumbc2pa" + b"\x11" * 6000), "audio/wav")
ok(got == pcm and rate == 24000, "WAV + khối C2PA → đúng PCM, bỏ header và C2PA")
got, rate = ai.decode_audio(pcm, "audio/l16; rate=24000; channels=1")
ok(got == pcm and rate == 24000, "audio/l16 → giữ nguyên PCM")
try:
    ai.decode_audio(b"ID3....", "audio/mpeg")
    ok(False, "định dạng lạ phải báo lỗi")
except ai.AIError:
    ok(True, "định dạng lạ (audio/mpeg) → AIError")

print("== sửa file lồng của 1.12 + tạo bù bản chậm")
tmp = tempfile.mkdtemp()
base = os.path.join(tmp, "bao_gemini")
folder = os.path.join(base, "bao", "2026-11-02")
os.makedirs(os.path.join(folder, "audio"))
inner = wav_bytes(tone_pcm(1.2), extra=b"\x22" * 6064)
ai._wav(os.path.join(folder, "audio", "ct_1.wav"), inner, 24000)          # đúng cách 1.12 đã ghi
ai._wav(os.path.join(folder, "audio", "bai_1_1.wav"), inner, 24000)
json.dump({"credit": "Gemini TTS:Kore", "bai": [["audio/bai_1_1.wav"]],
           "chinh_ta": [{"thuong": "audio/ct_1.wav", "bo_cham": True}]}, open(os.path.join(folder, "audio", "am_thanh.json"), "w"))
n1, n2 = ai.repair_audio(base), ai.repair_audio(base)
meta = json.load(open(os.path.join(folder, "audio", "am_thanh.json")))
w = wave.open(os.path.join(folder, "audio", "ct_1.wav"))
d = w.readframes(w.getnframes())
ok(n1 == 3 and n2 == 0, "lần 1 sửa 2 file + tạo 1 bản chậm (%d), lần 2 không làm gì (%d)" % (n1, n2))
ok(d[:4] != b"RIFF" and b"C2PA" not in d and abs(w.getnframes() / 24000 - 1.2) < 0.01, "file đã sửa chỉ còn tiếng (1,20 s)")
ok(meta["chinh_ta"][0].get("cham") == "audio/ct_1_cham.wav" and "bo_cham" not in meta["chinh_ta"][0], "am_thanh.json có bản chậm, bỏ cờ bo_cham")

print("== bản đọc chậm tại máy (WSOLA)")
src = array.array("h", tone_pcm(2.0))
t = time.time()
slow = ai.stretch(src, 24000, 0.75)
dt = time.time() - t
dur = len(slow) / 24000
ok(2.0 / 0.75 + 0.3 < dur < 2.0 / 0.75 + 0.7, "2,0 s → %.2f s (0,75× + 0,25 s lặng mỗi đầu)" % dur)
ok(max(abs(x) for x in slow[12000:-12000]) > 3000, "giữa bản chậm vẫn có tiếng")
ok(dt < 5, "kéo giãn 2 s mất %.2f s" % dt)

print("== chọn model, hạn mức")
c = ai.Gemini("x" * 39, exhausted={"gemini-3.6-flash": time.time() + 3600, "gemini-old": time.time() - 10})
c.versions["gemini-3.5-flash"] = "gemini-3.6-flash"
order = ai.order_models(["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview",
                         "gemini-flash-lite-latest", "gemini-old"], c, ["gemini-3-flash-preview"])
ok(order[0] == "gemini-3-flash-preview", "model đã chạy được đi trước: %s" % order)
ok("gemini-3.6-flash" not in order and "gemini-3.5-flash" not in order, "bỏ model hết hạn mức + tên gọi tắt trỏ sang nó")
ok("gemini-old" in order and "gemini-flash-lite-latest" in order, "hết chặn rồi thì dùng lại; có Flash-Lite")
err = ai.explain_http(429, json.dumps({"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "message": "quota", "details": [
    {"@type": "type.googleapis.com/google.rpc.QuotaFailure", "violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
     "quotaDimensions": {"model": "gemini-3.6-flash"}}]},
    {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "3404s"}]}}).encode(), "gemini-3.5-flash")
ok(err.kind == "quota" and err.daily and err.retry_after == 3404 and err.quota_model == "gemini-3.6-flash",
   "429 theo ngày: chờ 3404 s, model thật gemini-3.6-flash")
r = ai.next_reset(time.mktime((2026, 11, 3, 7, 0, 0, 0, 0, 0)) - time.timezone)
ok(time.gmtime(r)[3] == 8, "giờ đặt lại hạn mức mặc định: 08:00 UTC (= 15:00 giờ Việt Nam)")
try:
    ai._response_text({"candidates": [{"content": {"parts": [{"text": "{"}]}, "finishReason": "MAX_TOKENS"}],
                       "usageMetadata": {"thoughtsTokenCount": 31453}}, 32768)
except ai.AIError as e:
    ok("suy nghĩ" in str(e) and e.kind == "format", "MAX_TOKENS vì nghĩ quá nhiều → thông báo đúng lý do")

print("== tự nối tra từ + kiểm tra (số N4 thật của 1.12)")
scope = ai.scope_from_pham_vi(json.load(open(os.path.join(REPO, "kotoba_daily", "pham_vi.json"), encoding="utf-8")))
raw = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_112_n4.json"), encoding="utf-8"))
before = ai._link_count(raw)
fixed, notes = ai.autofix(json.loads(json.dumps(raw)), scope, {"max_new": 3, "ky": 1})
after = ai._link_count(fixed)
keys = sorted(set(k for t in ai._all_jp(fixed) for k in paper.keys(t)))
ok(before == 5 and 12 <= after <= 25, "chỗ tra từ %d → %d" % (before, after))
ok({"働く", "勉強", "仕事"} <= set(keys), "nối được 働きます → 働く, 勉強します → 勉強(する), 仕事: %s" % "、".join(keys[:12]))
ok("{働|はたら|働く}きます" in "".join(ai._all_jp(fixed)), "giữ okurigana ngoài ngoặc: {働|はたら|働く}きます")
fixed["tom_tat_truyen"] = "tóm tắt kỳ 1"
rep = ai.check(fixed, scope, {"max_new": 3, "ky": 1})
ok(not rep.errors, "sau khi nối, không có lỗi máy: %s" % rep.errors[:3])
ok(any("khó hơn trình độ" in w and "挨拶" in w for w in rep.warnings), "gợi ý chữ Hán khó (挨拶…)")
lite = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_113_n4_lite.json"), encoding="utf-8"))
lite["tom_tat_truyen"] = "x"
rep2 = ai.check(lite, scope, {"max_new": 3, "ky": 1})
ok(any("TRỌNG TÂM" in w for w in rep2.warnings), "số Flash-Lite: nhắc chưa dùng mẫu câu trọng tâm")
ok(any("vắt qua" in w for w in rep2.warnings), "số Flash-Lite: nhắc câu chép vắt qua 「」")
two = json.loads(json.dumps(fixed))
two["bai"] = two["bai"][:2]
ok(any("cần 3–5 bài" in e for e in ai.check(two, scope, {"max_new": 3, "ky": 1}).errors), "số thường chỉ 2 bài → lỗi")
ok(paper.speech_text("[今日|きょう]は[3日|みっか]、[天気|てんき]") == "きょうはみっか、天気", "chữ gửi giọng đọc: từ dễ đọc sai dùng kana")

print("== máy tự sửa lỗi máy móc (khỏi tốn lượt nhờ Gemini sửa)")
notes = []
ok(ai._fix_special("11[月|がつ]3[日|にち]と2[人|にん]、[4日|よんにち]、1[日|にち]", notes) ==
   "11[月|がつ][3日|みっか]と[2人|ふたり]、[4日|よっか]、1[日|にち]", "3日 / 2人 / 4日 đọc đặc biệt; 1日 để nguyên (ついたち hay いちにち)")
ann = ai._annotate("よろしくお願いします。何を食べますか。私は仕事です", ai.link_index(scope), [])
ok(ann == "よろしくお[願|ねが]いします。[何|なに]を食べますか。[私|わたし]は[仕事|しごと]です",
   "thêm furigana chắc chắn: 願い, 何を, 私, 仕事 (từ trong phạm vi); 食 không chắc thì để Gemini: %s" % ann)
w1 = ai.check({"bai": [{"loai": "tin_lang", "tieu_de": "x[村|むら]", "doan": ["1[日|にち]に3[回|かい]です。"]}]}, scope, {"short": True})
ok(not any("1日" in e for e in w1.errors) and any("1日" in w for w in w1.warnings), "1[日|にち] chỉ là cảnh báo, không chặn số báo")
d = json.loads(json.dumps(fixed))
d["chinh_ta"] = [{"cau": "これは[本|ほん]にない[文|ぶん]です。", "them_dap_an": []}]       # câu không có trong bài, thiếu câu
notes = []
ai._fix_dictation(d, {}, notes)
all_txt = paper.norm_answer("".join(paper.surface(p) for b in d["bai"] for p in b["doan"]))
ok(len(d["chinh_ta"]) >= 2 and all(paper.norm_answer(paper.surface(c["cau"])) in all_txt for c in d["chinh_ta"]),
   "câu chép không có trong bài → máy chọn %d câu trọn vẹn trong bài: %s" % (len(d["chinh_ta"]), [paper.surface(c["cau"])[:14] for c in d["chinh_ta"]]))
ok(all(c["cau"].count("「") == c["cau"].count("」") for c in d["chinh_ta"]), "câu máy chọn không vắt qua 「」 (ngoặc tên riêng đủ cặp thì được)")

print("== bản đầu JSON hỏng → viết lại từ đầu (không \"sửa\" một mẩu bài)")
good = json.loads(json.dumps(fixed))


class FakeGemini(ai.Gemini):
    """Lượt 1 trả JSON bị cắt, các lượt sau trả số báo tốt."""
    def __init__(self):
        super().__init__("x" * 39, sleep=lambda s: None)
        self.prompts = []

    def models(self):
        return [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]

    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.prompts.append(prompt[:40])
        if len(self.prompts) == 1:
            return json.dumps(good, ensure_ascii=False)[:900]          # bị cắt giữa chừng
        if "van_de" in json.dumps(schema or {}):
            return json.dumps({"van_de": [], "bao": good}, ensure_ascii=False)
        return json.dumps(good, ensure_ascii=False)


fg = FakeGemini()
jobdir = tempfile.mkdtemp()
res = ai.Job(fg, jobdir, "2026-11-03", scope, {"max_new": 3, "ky": 1}).run()
steps = [x["buoc"] for x in ai.last_log(jobdir, "2026-11-03")["buoc"]]
ok(res.get("ok"), "bản đầu hỏng → viết lại → lưu được số báo (%s)" % res.get("error", "ok"))
ok("viet_lai" in steps and fg.prompts[1] == fg.prompts[0], "lượt 2 dùng lại đúng lời nhắc viết (không phải lời nhắc sửa): %s" % steps)

print("== lượt sửa trả JSON hỏng → giữ bản trước")
bad = json.loads(json.dumps(good)); bad["bai"][0]["doan"][0] = bad["bai"][0]["doan"][0].replace("[村|むら]", "村", 1)


class FakeRepair(FakeGemini):
    def generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
        self.prompts.append(prompt[:40])
        if len(self.prompts) == 1:
            return json.dumps(bad, ensure_ascii=False)                  # bản đầu: 1 lỗi (村 thiếu furigana)
        if len(self.prompts) == 2:
            return '{"bai": [{"loai": "tin_lang", "tieu_de"'               # lượt sửa 1: bị cắt
        if "van_de" in json.dumps(schema or {}):
            return json.dumps({"van_de": [], "bao": good}, ensure_ascii=False)
        return json.dumps(good, ensure_ascii=False)


fr = FakeRepair()
jd2 = tempfile.mkdtemp()
res2 = ai.Job(fr, jd2, "2026-11-03", scope, {"max_new": 3, "ky": 1}).run()
steps2 = [x["buoc"] for x in ai.last_log(jd2, "2026-11-03")["buoc"]]
ok(res2.get("ok") and "sua_hong" in steps2, "bản sửa hỏng bị bỏ qua, sửa lần 2 xong → lưu được số (%s)" % steps2)

print("== khoá Gemini kiểu mới \"AQ.\" (1.22.2)")
# AI Studio nay chỉ cấp khoá "AQ.…" (có dấu chấm); bản ≤ 1.22.1 từ chối vì "ký tự lạ". Khoá giả, không gọi mạng thật.
import http.server, threading
import diag
AQ = "AQ.Ab8RN6Ka" + "x7Yq-Pz_Lm2Nv8Rt4Wb1Kc9Df3Gh6Jk0Sa5Ue"
AIZA = "AIzaSy" + "D3m0K3yF0rT3st1ngOnly-abcdefghi"
ok(ai.clean_key('  "' + AQ[:20] + "\n" + AQ[20:] + '"  ') == AQ, "dán khoá AQ. có nháy / xuống dòng → làm sạch, giữ dấu chấm")
ok(ai.key_problem(AQ) is None and ai.key_problem(AIZA) is None, "khoá AQ. và khoá AIza cũ đều nhận")
ok(ai.key_problem("AQ.abc <script>xyz12345678") is not None and "AQ." in (ai.key_problem("AQ.abc <script>xyz12345678") or ""),
   "khoá có ký tự lạ vẫn bị từ chối, câu báo nhắc cả AQ. và AIza")
m = ai.mask_key(AQ)
ok(m.startswith("AQ.A") and m.endswith(AQ[-4:]) and AQ[8:30] not in m, "khoá AQ. hiện dạng che: " + m)
rep = diag.redact("HTTP 401 khi gọi với khoá " + AQ + " và " + AIZA)
ok(AQ not in rep and AQ[3:20] not in rep and "AQ.…(đã ẩn)" in rep and AIZA not in rep, "Báo lỗi che cả khoá AQ. lẫn AIza")
e = ai.explain_http(401, json.dumps({"error": {"code": 401, "status": "UNAUTHENTICATED", "message": "Request had invalid authentication credentials.",
    "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "ACCESS_TOKEN_TYPE_UNSUPPORTED"}]}}).encode())
ok(e.kind == "key" and "tạo khoá mới" in str(e), "401 ACCESS_TOKEN_TYPE_UNSUPPORTED → hướng dẫn tạo khoá mới")
seen = {}


class _H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        seen["key"] = self.headers.get("x-goog-api-key"); seen["path"] = self.path
        out = json.dumps({"models": [{"name": "models/gemini-flash-latest", "supportedGenerationMethods": ["generateContent"]}]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)


srv = http.server.HTTPServer(("127.0.0.1", 0), _H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
try:
    ai.Gemini(AQ, base="http://127.0.0.1:%d/v1beta" % srv.server_port).models()
except ai.AIError:
    pass
srv.shutdown()
ok(seen.get("key") == AQ and "AQ." not in (seen.get("path") or "") and "key=" not in (seen.get("path") or ""),
   "khoá AQ. gửi nguyên vẹn bằng header x-goog-api-key, không nằm trong URL")

print("\nKẾT QUẢ:", "OK" if not FAIL else "%d lỗi" % len(FAIL))
sys.exit(1 if FAIL else 0)
