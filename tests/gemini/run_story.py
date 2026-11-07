"""1.23 (kế hoạch mục 5c): viết N số báo liên tiếp bằng Gemini thật theo quy trình truyện mới, đúng như add-on
(Job.run: lập mạch → nhà văn → biên tập → viết lại → viết số → máy kiểm tra → sửa → soát), rồi xuất truyện + bản
dịch + điểm biên tập ra file để người dùng đọc.

Chạy:  KB_STREAM=1 python run_story.py ADDON OUT_DIR [--days 5] [--start 2026-11-08] [--tone am] [--lang ja|en]
                                             [--mode hay|tiet_kiem] [--prefer gemini-3.5-flash]
       (môi trường có proxy tự chèn khoá thì không cần GEMINI_API_KEY)
Kết quả: OUT_DIR/bao_gemini[_en]/ (như user_files/ của add-on), OUT_DIR/truyen.md (đọc), OUT_DIR/ket_qua.json."""
import argparse, datetime, json, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup

ap = argparse.ArgumentParser()
ap.add_argument("addon"); ap.add_argument("out")
ap.add_argument("--days", type=int, default=5); ap.add_argument("--start", default="2026-11-08")
ap.add_argument("--tone", default="am"); ap.add_argument("--lang", default="ja", choices=["ja", "en"])
ap.add_argument("--mode", default="hay"); ap.add_argument("--prefer", default="gemini-3.5-flash")
ap.add_argument("--level", default="")
a = ap.parse_args()
ai = _setup.load(a.addon)
import paper_core as paper   # noqa: E402
import story_core as story   # noqa: E402

client = ai.Gemini(_setup.key())
if a.lang == "en":
    import ai_en   # noqa: E402
    rows = json.load(open(os.path.join(_setup.HERE, "..", "fixtures", "en_deck_a2.json"), encoding="utf-8"))["tu_vung"]
    items = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "learned": True, "due": False}
             for i, r in enumerate(rows)]
else:
    raw = json.load(open(os.path.join(_setup.HERE, "..", "..", "kotoba_daily", "pham_vi.json"), encoding="utf-8"))
    full = ai.scope_from_pham_vi(raw)
    items = [{"nid": i, "word": r[0], "reading": r[1], "meaning": r[2], "kind": "vocab", "learned": True, "due": False}
             for i, r in enumerate(full["tu_vung"]) if r[0]]
base = os.path.join(a.out, "bao_gemini_en" if a.lang == "en" else "bao_gemini")
os.makedirs(base, exist_ok=True)
out = []
t_all = time.time()
for k in range(a.days):
    date = (datetime.date.fromisoformat(a.start) + datetime.timedelta(days=k)).isoformat()
    rng = random.Random(date)
    kho = rng.sample(items, min(100, len(items)))
    for it in kho[:70]:
        it["due"] = True
    pk = {"kho": kho, "all": items, "grammar": [], "decks": ["Mẫu"], "n_learned": len(items)}
    scope = ai_en.scope_from_pick(pk, a.level or "A2") if a.lang == "en" else ai.scope_from_pick(pk, a.level or "N4")
    if a.lang == "ja":      # mẫu ngữ pháp đang học: các bài cuối của giáo trình (kính ngữ chương 27–29)
        scope["ngu_phap"] = full["ngu_phap"]
        scope["trong_tam"]["ngu_phap"] = [g["id"] for g in full["ngu_phap"] if str(g.get("bai", "")).endswith(("27", "28", "29"))][:6]
    c0, t0 = client.calls, time.time()
    print("== %s" % date, flush=True)
    res = ai.Job(client, base, date, scope, {"max_new": 3, "short": False, "prefer": a.prefer, "story": a.mode,
                                             "tone": a.tone}, lambda m: print("  >", m, flush=True)).run()
    steps = [x for x in (ai.last_log(base, date) or {}).get("buoc", [])]
    item = {"ngay": date, "ok": res.get("ok"), "loi": res.get("error", ""), "goi": client.calls - c0,
            "giay": round(time.time() - t0, 1), "model": res.get("model"), "truyen": res.get("story"),
            "buoc": [s.get("buoc") for s in steps]}
    for s in steps:
        if s.get("buoc") in ("bien_tap", "truyen_nhap", "viet_lai_truyen", "mach_truyen"):
            item.setdefault("chi_tiet", []).append(s)
    if res.get("ok"):
        iss = paper.clean_issue(json.load(open(ai.issue_path(base, date), encoding="utf-8")), date)
        sb = next((b for b in iss["bai"] if b["loai"] == "truyen"), None)
        if sb:
            item.update(ky=sb["ky"], tieu_de=paper.surface(sb["tieu_de"]), doan=[paper.surface(p) for p in sb["doan"]],
                        dich=sb.get("dich") or [])
        item["co_dich"] = [bool(b.get("dich")) for b in iss["bai"]]
    out.append(item)
    print("  KẾT QUẢ:", json.dumps({k2: item[k2] for k2 in ("ok", "loi", "goi", "giay", "truyen") if k2 in item},
                                   ensure_ascii=False), flush=True)
json.dump({"model_uu_tien": a.prefer, "che_do": a.mode, "giong": a.tone, "tong_goi": client.calls,
           "tong_giay": round(time.time() - t_all), "so": out, "mach": story.load_arc(base)},
          open(os.path.join(a.out, "ket_qua.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
arc = story.load_arc(base) or {}
md = ["# Thử truyện Gemini thật — quy trình 1.23 (%s, giọng %s)" % (a.mode, story.TONE_NAME.get(a.tone, a.tone)), "",
      "Mạch đợt: **%s** — %s · bí ẩn: %s · kết: %s" % (arc.get("ten", "?"), arc.get("muc_tieu", ""), arc.get("bi_an", ""),
                                                        arc.get("ket", "")), ""]
for it in out:
    sc = (it.get("truyen") or {}).get("diem") or {}
    md.append("## Kỳ %s · %s — %s" % (it.get("ky", "?"), it["ngay"], it.get("tieu_de", it.get("loi", ""))))
    md.append("")
    md.append("*%d lượt gọi, %.0f giây · điểm biên tập: %s%s*" % (it["goi"], it["giay"],
              ", ".join("%s %s" % (k2, v) for k2, v in sc.items()) or "—",
              " · đã viết lại theo góp ý" if (it.get("truyen") or {}).get("viet_lai") else ""))
    md.append("")
    for j, p in enumerate(it.get("doan") or []):
        md.append(p)
        md.append("")
        if j < len(it.get("dich") or []):
            md.append("> " + it["dich"][j])
            md.append("")
open(os.path.join(a.out, "truyen.md"), "w", encoding="utf-8").write("\n".join(md))
print("TỔNG: %d lượt gọi, %.0f giây → %s" % (client.calls, time.time() - t_all, os.path.join(a.out, "truyen.md")))
