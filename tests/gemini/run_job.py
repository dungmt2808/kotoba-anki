"""Viết một số báo bằng Gemini thật đúng như add-on (Thử khoá → Job.run → make_audio), in từng lượt gọi.

Chạy:  GEMINI_API_KEY=... python run_job.py ADDON OUT_DIR [--date 2026-11-03] [--scope PHAM_VI.json | --deck-n5]
                                            [--audio chinh_ta|ca_bai|tat] [--model TÊN] [--skip-test]
Kết quả: OUT_DIR/bao_gemini/ (cùng cấu trúc user_files/bao_gemini/ của add-on) + nhật ký sửa lỗi."""
import argparse, datetime, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup

ap = argparse.ArgumentParser()
ap.add_argument("addon"); ap.add_argument("out")
ap.add_argument("--date", default=datetime.date.today().isoformat())
ap.add_argument("--scope", default=os.path.join(_setup.HERE, "..", "..", "kotoba_daily", "pham_vi.json"))
ap.add_argument("--deck-n5", action="store_true", help="giả lập người học N5 chỉ có deck (400 từ của giáo trình N5)")
ap.add_argument("--audio", default="chinh_ta"); ap.add_argument("--model", default=""); ap.add_argument("--skip-test", action="store_true")
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
raw = json.load(open(a.scope, encoding="utf-8"))
if a.deck_n5:
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
base = os.path.join(a.out, "bao_gemini")
res = ai.Job(client, base, a.date, scope, {"max_new": 3, "short": False, "model": a.model, "prefer": prefer},
             lambda m: print("  >", m, flush=True)).run()
print("KẾT QUẢ:", json.dumps({k: v for k, v in res.items() if k != "exhausted"}, ensure_ascii=False))
if res.get("ok") and a.audio != "tat":
    print("GIỌNG ĐỌC:", ai.make_audio(client, base, a.date, a.audio, "Kore", "", lambda m: print("  >", m, flush=True)))
print("HẾT HẠN MỨC:", client.exhausted_state())
print("TỔNG: %.1f giây, %d lượt gọi" % (time.time() - t0, client.calls))
for c in calls:
    print("  ", json.dumps(c, ensure_ascii=False))
print("\nNHẬT KÝ (như tab Nguồn báo):")
for line in ai.log_summary(ai.last_log(base, a.date)):
    print("  ", line)
