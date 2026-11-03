"""Phân tích WAV của một số báo (độ dài, đỉnh, lặng đầu / cuối, header lồng) + nhờ model khác nghe lại (ASR) để dò đọc sai.

Chạy: GEMINI_API_KEY=... python audio_check.py ADDON THƯ_MỤC_SỐ_BÁO [asr]
"""
import urllib.error
import sys, os, json, wave, struct, base64, math, time, urllib.request, re
ADDON, FOLDER = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import _setup
ASR = len(sys.argv) > 3 and sys.argv[3] == "asr"
ai = _setup.load(ADDON)
import paper_core as paper
raw = json.load(open(os.path.join(FOLDER, "bao.json")))
meta = json.load(open(os.path.join(FOLDER, "audio", "am_thanh.json")))
def stats(path):
    with wave.open(path) as w:
        n, rate, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
        data = w.readframes(n)
    s = struct.unpack("<%dh" % (len(data)//2), data)
    peak = max(abs(x) for x in s) if s else 0
    rms = math.sqrt(sum(x*x for x in s)/len(s)) if s else 0
    thr = 300
    lead = next((i for i,x in enumerate(s) if abs(x) > thr), len(s)) / rate
    trail = next((i for i,x in enumerate(reversed(s)) if abs(x) > thr), len(s)) / rate
    clip = sum(1 for x in s if abs(x) >= 32700)
    # khoảng lặng dài nhất ở giữa (cửa sổ 20ms)
    win = int(rate*0.02); longest = cur = 0
    for k in range(0, len(s)-win, win):
        e = max(abs(x) for x in s[k:k+win])
        cur = cur + 1 if e < thr else 0
        longest = max(longest, cur)
    return dict(dur=round(n/rate,2), rate=rate, ch=ch, sw=sw, peak=peak, rms=round(rms), lead=round(lead,2), trail=round(trail,2), clip=clip, gap=round(longest*0.02,2))
items = []
for k, c in enumerate(meta.get("chinh_ta", [])):
    txt = raw["chinh_ta"][k]["cau"]
    for kind in ("thuong", "cham"):
        if c.get(kind): items.append(("ct%d_%s" % (k+1, kind), c[kind], txt))
    if c.get("bo_cham"): items.append(("ct%d_cham" % (k+1), None, txt))
for i, row in enumerate(meta.get("bai", [])):
    for j, rel in enumerate(row or []):
        items.append(("bai%d_%d" % (i+1, j+1), rel, raw["bai"][i]["doan"][j]))
def asr(path):
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    body = {"contents": [{"role": "user", "parts": [{"inlineData": {"mimeType": "audio/wav", "data": b64}},
            {"text": "Chép lại CHÍNH XÁC những gì giọng đọc nói, bằng HIRAGANA (katakana cho từ ngoại lai), không thêm gì, không sửa lỗi người đọc. Chỉ trả về phần chép."}]}],
            "generationConfig": {"temperature": 0}}
    req = urllib.request.Request(ai.API_BASE + "/models/gemini-3.1-flash-lite:generateContent", data=json.dumps(body).encode(),
          headers={"x-goog-api-key": _setup.key(), "Content-Type": "application/json"}, method="POST")
    for k in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.loads(r.read())
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 5: raise
            time.sleep(25)
    return "".join(p.get("text","") for p in res["candidates"][0]["content"]["parts"] if not p.get("thought")).strip()
def norm(s):
    s = paper.to_hira(s)
    return re.sub(r"[\s、。「」！？!?・ー〜…,.]", "", s)
import difflib
out = []
for name, rel, txt in items:
    expect = paper.kana(txt)
    row = {"name": name, "text": paper.surface(txt), "expect_kana": expect}
    if rel is None:
        row["missing"] = "bo_cham (bản chậm bị bỏ)"; out.append(row); continue
    p = os.path.join(FOLDER, rel)
    row.update(stats(p)); row["sec_per_kana"] = round(row["dur"]/max(1,len(norm(expect))),3)
    if ASR:
        try:
            heard = asr(p); row["heard"] = heard
            a, b = norm(expect), norm(heard)
            row["sim"] = round(difflib.SequenceMatcher(None, a, b).ratio(), 3)
            diffs = []
            for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
                if op != "equal": diffs.append("%s:'%s'→'%s'" % (op, a[max(0,i1-3):i2+3], b[max(0,j1-3):j2+3]))
            row["diff"] = diffs[:8]
        except Exception as e:
            row["heard_err"] = str(e)[:200]
    out.append(row)
    print(json.dumps(row, ensure_ascii=False), flush=True)
json.dump(out, open(os.path.join(FOLDER, "audio_check.json"), "w"), ensure_ascii=False, indent=1)
