"""Viết một số báo bằng Gemini thật đúng như add-on (Thử khoá → Job.run → make_audio), in từng lượt gọi.

Chạy:  GEMINI_API_KEY=... python run_job.py ADDON OUT_DIR [--date 2026-11-03] [--scope PHAM_VI.json | --deck-n5]
                                            [--audio chinh_ta|ca_bai|tat] [--model TÊN] [--skip-test]
       1.19 báo tiếng Anh:  ... run_job.py ADDON OUT_DIR --lang en [--level A2] [--en-deck fixtures/en_deck_a2.json]
Kết quả: OUT_DIR/bao_gemini/ (tiếng Anh: OUT_DIR/bao_gemini_en/, cùng cấu trúc user_files/ của add-on) + nhật ký sửa lỗi."""
import argparse, datetime, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup

ap = argparse.ArgumentParser()
ap.add_argument("addon"); ap.add_argument("out")
ap.add_argument("--date", default=datetime.date.today().isoformat())
ap.add_argument("--scope", default=os.path.join(_setup.HERE, "..", "..", "kotoba_daily", "pham_vi.json"))
ap.add_argument("--deck-n5", action="store_true", help="giả lập người học N5 chỉ có deck (400 từ của giáo trình N5)")
ap.add_argument("--audio", default="chinh_ta"); ap.add_argument("--model", default=""); ap.add_argument("--skip-test", action="store_true")
ap.add_argument("--lang", default="ja", choices=["ja", "en"]); ap.add_argument("--level", default="A2")
ap.add_argument("--en-deck", default=os.path.join(_setup.HERE, "..", "fixtures", "en_deck_a2.json"))
ap.add_argument("--voice", default="Kore")
a = ap.parse_args()
ai = _setup.load(a.addon)
calls = []
orig = ai.Gemini._request


def logged(self, method, path, body=None, timeout=ai.TEXT_TIMEOUT, model=""):
    t = time.time()
    try:
        res = orig(self, method, path, body, timeout, model)
        um = res.get("usageMetadata", {}) if isinstance(res, dict) else {}
        calls.append({"goi": path[:60], "giay": round(time.time() - t, 1), "vao": um.get("promptTokenCount"),
                      "ra": um.get("candidatesTokenCount"), "nghi": um.get("thoughtsTokenCount")})
        return res
    except ai.AIError as e:
        calls.append({"goi": path[:60], "giay": round(time.time() - t, 1), "loi": str(e)[:120]})
        raise


ai.Gemini._request = logged
client = ai.Gemini(_setup.key())
raw = json.load(open(a.scope, encoding="utf-8")) if a.lang == "ja" else None
if a.lang == "en":                          # 1.19: deck tiếng Anh mẫu → cây như build_garden trả về
    import ai_en
    rows = json.load(open(a.en_deck, encoding="utf-8"))["tu_vung"]
    plants = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "lang": "en",
               "stage": 1 + i % 3, "stability": 5.0, "wilted": i % 25 == 0, "thirsty": False} for i, r in enumerate(rows)]
    scope = ai_en.scope_from_plants(plants, a.level)
elif a.deck_n5:
    rows = [r for r in raw["tu_vung"] if "n5" in str(r[3]).lower()][:400]
    plants = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "stage": 1 + i % 3,
               "stability": 5.0, "wilted": i % 20 == 0, "thirsty": False} for i, r in enumerate(rows)]
    scope = ai.scope_from_plants(plants, "N5")
else:
    scope = ai.scope_from_pham_vi(raw)
print("PHẠM VI:", ai.describe_scope(scope))
t0 = time.time()
prefer = ""
if not a.skip_test:
    r = ai.test_key(client); prefer = r["model"]; print("THỬ KHOÁ:", r["model"], "| model chữ:", r["models"][:4], "| TTS:", r["tts"])
base = os.path.join(a.out, "bao_gemini_en" if a.lang == "en" else "bao_gemini")
res = ai.Job(client, base, a.date, scope, {"max_new": 3, "short": False, "model": a.model, "prefer": prefer},
             lambda m: print("  >", m, flush=True)).run()
print("KẾT QUẢ:", json.dumps({k: v for k, v in res.items() if k != "exhausted"}, ensure_ascii=False))
if res.get("ok") and a.audio != "tat":
    print("GIỌNG ĐỌC:", ai.make_audio(client, base, a.date, a.audio, a.voice, "", lambda m: print("  >", m, flush=True)))
print("HẾT HẠN MỨC:", client.exhausted_state())
print("TỔNG: %.1f giây, %d lượt gọi" % (time.time() - t0, client.calls))
for c in calls:
    print("  ", json.dumps(c, ensure_ascii=False))
print("\nNHẬT KÝ (như tab Nguồn báo):")
for line in ai.log_summary(ai.last_log(base, a.date)):
    print("  ", line)
