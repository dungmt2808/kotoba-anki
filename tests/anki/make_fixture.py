"""Thư mục báo Gemini mẫu cho test giao diện: số 03/11 (viết bằng 1.13, audio sạch + bản chậm) và số 02/11
(viết bằng 1.12: file WAV lồng có khối C2PA, cờ bo_cham) — audio là âm thử tổng hợp, không cần file lớn trong repo.

1.19: thêm THƯ_MỤC_BAO_GEMINI_EN → số báo tiếng Anh thật (Gemini viết, tests/fixtures/bao_119_en_a2.json) cùng ngày 03/11
(để thử báo Nhật / Anh cùng ngày không đụng nhau), audio câu chép là âm thử + bản chậm, đoạn văn không có audio.

Chạy: python make_fixture.py ADDON THƯ_MỤC_BAO_GEMINI [THƯ_MỤC_BAO_GEMINI_EN]"""
import json, math, os, shutil, struct, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ADDON, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import ai_core as ai


def tone(secs, freq):
    return struct.pack("<%dh" % int(24000 * secs), *(int(5000 * math.sin(2 * math.pi * freq * i / 24000)) for i in range(int(24000 * secs))))


def tts38(pcm):
    """Đúng dạng model TTS 3.8 trả về: WAV + khối C2PA."""
    fmt = struct.pack("<HHIIHH", 1, 1, 24000, 48000, 2, 16)
    c2pa = b"\x00jumbc2pa" + b"\x33" * 6055
    body = b"WAVE" + b"fmt " + struct.pack("<I", 16) + fmt + b"data" + struct.pack("<I", len(pcm)) + pcm + b"C2PA" + struct.pack("<I", len(c2pa)) + c2pa
    return b"RIFF" + struct.pack("<I", len(body)) + body


shutil.rmtree(OUT, ignore_errors=True)
for date, src, nested in (("2026-11-03", "bao_113_n4_lite.json", False), ("2026-11-02", "bao_112_n4.json", True)):
    folder = os.path.join(OUT, "bao", date)
    os.makedirs(os.path.join(folder, "audio"))
    raw = json.load(open(os.path.join(HERE, "..", "fixtures", src), encoding="utf-8"))
    json.dump(raw, open(os.path.join(folder, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
    meta = {"credit": "Gemini TTS:Kore", "bai": [], "chinh_ta": []}
    for i, b in enumerate(raw["bai"]):
        row = []
        for j, _p in enumerate(b["doan"]):
            rel = "audio/bai_%d_%d.wav" % (i + 1, j + 1)
            pcm = tone(1.5, 200 + 30 * i + 10 * j)
            ai._wav(os.path.join(folder, rel), tts38(pcm) if nested else pcm, 24000)   # 1.12 ghi nguyên WAV vào WAV
            row.append(rel)
        meta["bai"].append(row)
    for k, _c in enumerate(raw["chinh_ta"]):
        rel = "audio/ct_%d.wav" % (k + 1)
        pcm = tone(1.2, 330 + 40 * k)
        ai._wav(os.path.join(folder, rel), tts38(pcm) if nested else pcm, 24000)
        cur = {"thuong": rel}
        if nested:
            cur["bo_cham"] = True
        else:
            ai.make_slow(os.path.join(folder, rel), os.path.join(folder, "audio/ct_%d_cham.wav" % (k + 1)))
            cur["cham"] = "audio/ct_%d_cham.wav" % (k + 1)
        meta["chinh_ta"].append(cur)
    json.dump(meta, open(os.path.join(folder, "audio", "am_thanh.json"), "w"), ensure_ascii=False)
ai.write_scope(OUT, ai.scope_from_pham_vi(json.load(open(os.path.join(HERE, "..", "..", "kotoba_daily", "pham_vi.json"), encoding="utf-8"))))
print("fixture:", OUT)

if len(sys.argv) > 3:
    import ai_en
    EN = os.path.abspath(sys.argv[3])
    shutil.rmtree(EN, ignore_errors=True)
    folder = os.path.join(EN, "bao", "2026-11-03")
    os.makedirs(os.path.join(folder, "audio"))
    raw = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_119_en_a2.json"), encoding="utf-8"))
    raw["ngay"] = "2026-11-03"
    json.dump(raw, open(os.path.join(folder, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
    meta = {"credit": "Gemini TTS:Kore", "bai": [], "chinh_ta": []}
    for k, _c in enumerate(raw["chinh_ta"]):
        rel = "audio/ct_%d.wav" % (k + 1)
        ai._wav(os.path.join(folder, rel), tone(1.2, 360 + 40 * k), 24000)
        ai.make_slow(os.path.join(folder, rel), os.path.join(folder, "audio/ct_%d_cham.wav" % (k + 1)))
        meta["chinh_ta"].append({"thuong": rel, "cham": "audio/ct_%d_cham.wav" % (k + 1)})
    json.dump(meta, open(os.path.join(folder, "audio", "am_thanh.json"), "w"), ensure_ascii=False)
    rows = json.load(open(os.path.join(HERE, "..", "fixtures", "en_deck_a2.json"), encoding="utf-8"))["tu_vung"]
    plants = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "lang": "en", "stage": 2}
              for i, r in enumerate(rows)]
    ai.write_scope(EN, ai_en.scope_from_plants(plants, "A2"))
    print("fixture en:", EN)
