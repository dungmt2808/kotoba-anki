#!/usr/bin/env python3
"""Tạo audio cho một số báo bằng VOICEVOX (chạy trên máy, miễn phí).

Chạy:
  python3 tools/doc_voicevox.py bao/2026-11-02/bao.json      tạo audio cho số báo
  python3 tools/doc_voicevox.py --danh-sach-giong             xem các giọng và số id

Tạo ra trong thư mục số báo:
  audio/bai_<i>_<j>.wav        đọc từng đoạn của từng bài
  audio/ct_<k>.wav, ct_<k>_cham.wav   câu chép chính tả, tốc độ thường và chậm
  audio/am_thanh.json          danh sách file + dòng ghi công (bắt buộc) "VOICEVOX:<tên giọng>"

Không thấy VOICEVOX thì in thông báo và thoát mã 0 (báo vẫn dùng được, chỉ không có audio).
Giọng mặc định lấy từ lo_trinh.json → cai_dat.giong, đổi tạm bằng --giong <id>.

Kiểm tra đọc sai: so cách đọc VOICEVOX đoán (trường "kana" của audio_query) với furigana trong bài.
Từ nào lệch thì đọc lại câu đó, thay từ ấy bằng kana. Đây chỉ là phép so gần đúng.
"""
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kb_markup as M  # noqa: E402

BASE = Path(__file__).resolve().parent.parent
SPEED_NORMAL = 0.95
SPEED_SLOW = 0.75

ROWS = {
    "ア": "アカサタナハマヤラワガザダバパァャヮ",
    "イ": "イキシチニヒミリギジヂビピィ",
    "ウ": "ウクスツヌフムユルグズヅブプゥュヴ",
    "エ": "エケセテネヘメレゲゼデベペェ",
    "オ": "オコソトノホモヨロヲゴゾドボポォョ",
}
VOWEL_OF = {ch: v for v, chars in ROWS.items() for ch in chars}


def _kata_only(s):
    return "".join(ch for ch in M.to_kata(s) if "\u30a1" <= ch <= "\u30fc")


def _expand(s, merge_diphthong):
    out, prev = [], None
    for ch in s:
        if ch == "ー":
            if not prev:
                continue
            ch = prev
        elif merge_diphthong and ch == "ウ" and prev == "オ":
            ch = "オ"
        elif merge_diphthong and ch == "イ" and prev == "エ":
            ch = "エ"
        out.append(ch)
        prev = VOWEL_OF.get(ch)
    return "".join(out)


def variants(s):
    """Ba cách viết một chuỗi kana để so: nguyên dạng, đổi ー thành nguyên âm,
    và gộp thêm オウ → オオ, エイ → エエ (トウキョウ = トーキョー, センセイ = センセー)."""
    k = _kata_only(s)
    return (k, _expand(k, False), _expand(k, True))


class Engine:
    def __init__(self, url):
        self.url = url.rstrip("/")

    def _req(self, path, params=None, body=None, method="GET", raw=False):
        url = self.url + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data, headers = None, {}
        if method == "POST":
            data = json.dumps(body).encode("utf-8") if body is not None else b""
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=120) as r:
            content = r.read()
        return content if raw else json.loads(content.decode("utf-8"))

    def alive(self):
        try:
            self._req("/version")
            return True
        except (urllib.error.URLError, OSError, ValueError):
            return False

    def speakers(self):
        return self._req("/speakers")

    def query(self, text, speaker):
        return self._req("/audio_query", {"text": text, "speaker": speaker}, method="POST")

    def synth(self, q, speaker):
        return self._req("/synthesis", {"speaker": speaker}, body=q, method="POST", raw=True)


def misread_tokens(tokens, kana_from_engine):
    """Các token có furigana mà cách đọc không xuất hiện trong kana VOICEVOX đoán."""
    if not kana_from_engine:
        return [], 0
    got = variants(kana_from_engine)
    bad, checked = [], 0
    for i, t in enumerate(tokens):
        if t[0] in ("ruby", "word") and t[2] and M.KANJI_RE.search(t[1]):
            checked += 1
            want = variants(t[2])
            if not any(w and w in g for w, g in zip(want, got)):
                bad.append(i)
    return bad, checked


def speak(engine, text_markup, speaker, speed, out_path, warnings, where):
    tokens = M.tokenize(text_markup)
    text = "".join(t[1] for t in tokens)
    q = engine.query(text, speaker)
    bad, checked = misread_tokens(tokens, q.get("kana", ""))
    if len(bad) > 3 and len(bad) > 0.4 * checked:
        # Lệch quá nhiều thường là do phép so không hợp với câu này, không phải đọc sai thật.
        warnings.append("%s: không kiểm tra được cách đọc, giữ nguyên" % where)
        bad = []
    if bad:
        fixed = "".join(M.to_hira(t[2]) if i in bad else t[1] for i, t in enumerate(tokens))
        warnings.append("%s: có thể đọc sai %s, đã đọc lại bằng kana" % (
            where, ", ".join("%s(%s)" % (tokens[i][1], tokens[i][2]) for i in bad)))
        q = engine.query(fixed, speaker)
    q["speedScale"] = speed
    out_path.write_bytes(engine.synth(q, speaker))


def credit_for(speakers, style_id):
    for sp in speakers:
        for st in sp.get("styles", []):
            if st.get("id") == style_id:
                return "VOICEVOX:%s" % sp.get("name", "?"), st.get("name", "")
    return None, None


def main():
    ap = argparse.ArgumentParser(description="Tạo audio cho số báo bằng VOICEVOX")
    ap.add_argument("bao", nargs="?", help="đường dẫn bao.json")
    ap.add_argument("--giong", type=int, help="id giọng (xem --danh-sach-giong)")
    ap.add_argument("--may", default="http://127.0.0.1:50021", help="địa chỉ VOICEVOX engine")
    ap.add_argument("--danh-sach-giong", action="store_true")
    args = ap.parse_args()

    engine = Engine(args.may)
    if not engine.alive():
        print("Không thấy VOICEVOX ở %s, bỏ qua phần audio." % args.may)
        return 0

    speakers = engine.speakers()
    if args.danh_sach_giong:
        for sp in speakers:
            for st in sp.get("styles", []):
                print("%4s  %s (%s)" % (st.get("id"), sp.get("name"), st.get("name")))
        return 0
    if not args.bao:
        ap.print_help()
        return 2

    style = args.giong
    if style is None:
        try:
            style = int(json.loads((BASE / "lo_trinh.json").read_text(encoding="utf-8"))
                        .get("cai_dat", {}).get("giong", 2))
        except Exception:  # noqa: BLE001
            style = 2
    credit, style_name = credit_for(speakers, style)
    if not credit:
        print("LỖI không có giọng id %d. Xem: python3 tools/doc_voicevox.py --danh-sach-giong" % style)
        return 1

    path = Path(args.bao)
    if not path.exists():
        path = BASE / args.bao
    bao = json.loads(path.read_text(encoding="utf-8"))
    out_dir = path.parent / "audio"
    out_dir.mkdir(exist_ok=True)

    warnings, result = [], {"giong": style, "credit": credit, "bai": [], "chinh_ta": []}
    try:
        for i, b in enumerate(bao.get("bai", [])):
            files = []
            for j, p in enumerate(b.get("doan", [])):
                name = "bai_%d_%d.wav" % (i + 1, j + 1)
                speak(engine, p, style, SPEED_NORMAL, out_dir / name, warnings, "bai[%d].doan[%d]" % (i, j))
                files.append("audio/" + name)
            result["bai"].append(files)
        for k, c in enumerate(bao.get("chinh_ta", [])):
            n1, n2 = "ct_%d.wav" % (k + 1), "ct_%d_cham.wav" % (k + 1)
            speak(engine, c["cau"], style, SPEED_NORMAL, out_dir / n1, warnings, "chinh_ta[%d]" % k)
            speak(engine, c["cau"], style, SPEED_SLOW, out_dir / n2, [], "chinh_ta[%d]" % k)
            result["chinh_ta"].append({"thuong": "audio/" + n1, "cham": "audio/" + n2})
    except (urllib.error.URLError, OSError, ValueError) as e:
        print("LỖI khi gọi VOICEVOX: %s. Báo vẫn dùng được, chỉ thiếu audio." % e)
        return 1

    result["canh_bao"] = warnings
    (out_dir / "am_thanh.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    for w in warnings:
        print("CẢNH BÁO %s" % w)
    print("Đã tạo audio (%s, %s) trong %s" % (credit, style_name, out_dir))
    return 0


if __name__ == "__main__":
    sys.exit(main())
