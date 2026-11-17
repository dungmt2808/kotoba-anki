"""Viết một số báo bằng Gemini thật đúng như add-on (Thử khoá → Job.run → make_audio), in từng lượt gọi.

Chạy:  GEMINI_API_KEY=... python run_job.py ADDON OUT_DIR [--date 2026-11-03] [--scope PHAM_VI.json | --deck-n5]
                                            [--audio chinh_ta|ca_bai|tat] [--model TÊN] [--skip-test]
       1.19 báo tiếng Anh:  ... run_job.py ADDON OUT_DIR --lang en [--level A2] [--en-deck fixtures/en_deck_a2.json]
       1.33 báo tiếng Trung / tiếng Hàn:  ... --lang zh --level HSK2 | --lang ko --level TOPIK2 (deck mẫu ở tests/fixtures)
       1.25.1 báo tiếng Việt: ... --lang vi [--vi-deck fixtures/vi_deck.json]; không dùng deck: --no-deck (ja / en / vi);
              chủ đề truyện: --tones kinh_di,hai
Kết quả: OUT_DIR/bao_gemini/ (tiếng Anh: OUT_DIR/bao_gemini_en/, cùng cấu trúc user_files/ của add-on) + nhật ký sửa lỗi."""
import argparse, datetime, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup

ap = argparse.ArgumentParser()
ap.add_argument("addon"); ap.add_argument("out")
ap.add_argument("--date", default=datetime.date.today().isoformat())
# 15/11: mặc định pham_vi.json của kotoba_daily trên máy; repo công khai không kèm → bảng thử ở tests/fixtures
_PV = os.path.join(_setup.HERE, "..", "..", "kotoba_daily", "pham_vi.json")
ap.add_argument("--scope", default=_PV if os.path.isfile(_PV) else os.path.join(_setup.HERE, "..", "fixtures", "pham_vi_thu.json"))
ap.add_argument("--deck-n5", action="store_true", help="giả lập người học N5 chỉ có deck (400 từ của giáo trình N5)")
ap.add_argument("--audio", default="chinh_ta"); ap.add_argument("--model", default=""); ap.add_argument("--skip-test", action="store_true")
ap.add_argument("--lang", default="ja", choices=["ja", "en", "vi", "zh", "ko"]); ap.add_argument("--level", default="A2")
ap.add_argument("--vi-deck", default=os.path.join(_setup.HERE, "..", "fixtures", "vi_deck.json"))
ap.add_argument("--no-deck", action="store_true", help="1.25.1: Không dùng deck — Gemini viết theo trình độ")
ap.add_argument("--tones", default="am", help="1.25.1: chủ đề truyện, vd. kinh_di,hai")
ap.add_argument("--story", default="hay")
# 1.33: đúng luồng add-on từ 1.25.2 — bản gốc tiếng Việt chung (OUT/bao_chung) rồi mỗi báo kể lại; chạy zh rồi ko cùng ngày
# thì báo sau đọc lại bản gốc (không gọi thêm)
ap.add_argument("--master", action="store_true", help="viết / đọc bản gốc chung trước (Một làng, một truyện)")
ap.add_argument("--en-deck", default=os.path.join(_setup.HERE, "..", "fixtures", "en_deck_a2.json"))
# 1.33: báo tiếng Trung (HSK) / tiếng Hàn (TOPIK) — deck mẫu tests/tools/tao_deck_133.py
ap.add_argument("--zh-deck", default=os.path.join(_setup.HERE, "..", "fixtures", "zh_deck_hsk2.json"))
ap.add_argument("--ko-deck", default=os.path.join(_setup.HERE, "..", "fixtures", "ko_deck_topik2.json"))
ap.add_argument("--voice", default="Kore")
ap.add_argument("--pick", action="store_true", help="1.19.1: kho 100 từ (70 phải ôn / 30 đã thuộc) như words_core.pick")
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
raw = json.load(open(a.scope, encoding="utf-8")) if a.lang == "ja" and not a.no_deck else None
if a.no_deck:                               # 1.25.1: không dùng deck
    import ai_en, ai_vi
    empty = {"kho": [], "all": [], "grammar": [], "decks": []}
    scope = (ai_en.scope_from_pick(empty, a.level) if a.lang == "en" else ai_vi.scope_from_pick(empty) if a.lang == "vi"
             else ai.scope_from_pick(empty, a.level if a.level in ai.LEVELS else "N4"))
    scope["khong_deck"] = True
elif a.lang in ("zh", "ko"):                 # 1.33: kho như words_core.pick (70 từ phải ôn / còn lại đã thuộc)
    import random
    mod = __import__("ai_" + a.lang)
    rows = json.load(open(a.zh_deck if a.lang == "zh" else a.ko_deck, encoding="utf-8"))["tu_vung"]
    items = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "hanviet": r[3] if len(r) > 3 else "",
              "kind": "vocab", "learned": True, "due": False} for i, r in enumerate(rows)]
    rng = random.Random(a.date + a.lang)
    kho = rng.sample(items, min(100, len(items)))
    for it in kho[:int(len(kho) * 0.7)]:
        it["due"] = True
    lv = a.level if a.level in mod.LEVELS else mod.DEFAULT_LEVEL
    scope = mod.scope_from_pick({"kho": kho, "all": items, "grammar": [], "decks": ["Mẫu " + lv], "n_learned": len(items)}, lv)
elif a.lang == "vi":                        # 1.25.1: thẻ kiến thức mẫu → kho như words_core.pick
    import ai_vi
    the = json.load(open(a.vi_deck, encoding="utf-8"))["the"]
    pk = {"kho": [{"nid": i, "word": t[0], "meaning": t[1], "kind": "vocab", "due": bool(t[3]), "learned": True}
                  for i, t in enumerate(the)], "decks": sorted({t[2] for t in the}), "n_learned": len(the)}
    scope = ai_vi.scope_from_pick(pk)
elif a.lang == "en":                          # 1.19: deck tiếng Anh mẫu → cây như build_garden trả về
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
if a.pick and a.lang not in ("vi", "zh", "ko") and not a.no_deck:     # 1.19.1: lời nhắc chỉ gửi 100 từ, kiểm tra dùng mọi từ đã học
    import random
    rows = [r for r in scope["tu_vung"] if r[0]]
    items = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "learned": True, "due": False}
             for i, r in enumerate(rows)]
    rng = random.Random(a.date)
    kho = rng.sample(items, min(100, len(items)))
    for it in kho[:70]:
        it["due"] = True
    pk = {"kho": kho, "all": items, "grammar": [], "decks": ["Mẫu"], "n_learned": len(items)}
    if a.lang == "en":
        scope = ai_en.scope_from_pick(pk, a.level)
    else:
        scope = ai.scope_from_pick(pk, "N4" if not a.deck_n5 else "N5")
print("PHẠM VI:", ai.describe_scope(scope))
t0 = time.time()
prefer = ""
if not a.skip_test:
    r = ai.test_key(client); prefer = r["model"]; print("THỬ KHOÁ:", r["model"], "| model chữ:", r["models"][:4], "| TTS:", r["tts"])
base = os.path.join(a.out, {"en": "bao_gemini_en", "vi": "bao_gemini_vi", "zh": "bao_gemini_zh", "ko": "bao_gemini_ko"}.get(a.lang, "bao_gemini"))
tones = [t for t in a.tones.split(",") if t]
jopts = {"max_new": ai.NO_DECK_NEW if a.no_deck and a.lang != "vi" else 3, "short": False,
         "model": a.model, "prefer": prefer, "story": a.story, "tones": tones, "tone": tones[0] if tones else "am"}
if a.master:
    shared = os.path.join(a.out, ai.SHARED_FOLDER)
    jopts.update(story_base=shared, thoi_tiet="sáng nắng nhẹ, chiều nhiều mây")
    n0 = client.calls
    m, mlog = ai.ensure_master(client, shared, a.date, jopts, lambda m: print("  >", m, flush=True))
    print("BẢN GỐC:", "kỳ %s" % m["ky"] if m else "không có", "| lượt gọi: %d" % (client.calls - n0), "| nhật ký:", mlog)
    jopts.update(master=m, _master_log=mlog)
res = ai.Job(client, base, a.date, scope, jopts, lambda m: print("  >", m, flush=True)).run()
print("KẾT QUẢ:", json.dumps({k: v for k, v in res.items() if k != "exhausted"}, ensure_ascii=False))
if res.get("ok") and a.audio != "tat" and a.lang != "vi":
    print("GIỌNG ĐỌC:", ai.make_audio(client, base, a.date, a.audio, a.voice, "", lambda m: print("  >", m, flush=True)))
print("HẾT HẠN MỨC:", client.exhausted_state())
print("TỔNG: %.1f giây, %d lượt gọi" % (time.time() - t0, client.calls))
for c in calls:
    print("  ", json.dumps(c, ensure_ascii=False))
print("\nNHẬT KÝ (như tab Nguồn báo):")
for line in ai.log_summary(ai.last_log(base, a.date)):
    print("  ", line)
