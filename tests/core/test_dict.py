"""Test lõi Chép chính tả (1.13) với collection Anki thật — cần gói `anki` (pip install anki==26.9.3).

Chạy: python test_dict.py THƯ_MỤC_ADD_ON
"""
import os, sys, json, shutil, tempfile
ADDON = sys.argv[1]
sys.path.insert(0, ADDON); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_col
import garden_core as core, paper_core as paper
from anki.collection import Collection
tmp = tempfile.mkdtemp(); path = os.path.join(tmp, "c.anki2"); make_col.build(path)
col = Collection(path)
cfg = core.merged_config({})
FAIL = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: FAIL.append(msg)
def note_item(nid): return paper.note_dict_item(col.get_note(nid), cfg)
def word_item(nid): return paper.note_word_item(col.get_note(nid), cfg)
def cands(plants, voice):
    ex = [{"nid": p["nid"], "wilted": p["wilted"], "thirsty": p["thirsty"], "audio": p["ex_audio"]} for p in plants
          if p.get("ex_audio") or ((p.get("has_ex") or p.get("cloze")) and voice.any())]
    ws = [{"nid": p["nid"], "wilted": p["wilted"], "thirsty": p["thirsty"], "audio": p["audio"]} for p in plants
          if p.get("kind", "vocab") == "vocab" and (p.get("audio") or voice.any())]
    return ex, ws
cache = {}
VOICES = {
    "không giọng": paper.Voice(),
    "giọng máy": paper.Voice(tts=True),
    "Gemini (chưa tạo)": paper.Voice(cached=lambda s: cache.get(s), gen=True),
    "giọng máy + Gemini": paper.Voice(cached=lambda s: cache.get(s), tts=True, gen=True, mpv=True),
}
for dname in make_col.DECKS:
    did = col.decks.id_for_name(dname)
    plants = core.build_garden(col, did, cfg)["plants"]
    print("\n==", dname, "| cây:", len(plants), "| has_ex:", sum(1 for p in plants if p.get("has_ex")),
          "| ex_audio:", sum(1 for p in plants if p.get("ex_audio")), "| audio từ:", sum(1 for p in plants if p.get("audio")),
          "| kind:", sorted(set(p.get("kind") for p in plants)))
    for vname, voice in VOICES.items():
        st = paper.empty_state()
        ex, ws = cands(plants, voice)
        paper.build_daily(st, 100, None, ex, note_item, voice, word_item, ws)
        view = paper.daily_view(st, None, note_item, voice, word_item)
        kinds = [(i["src"], "nghe" if i["audio"] else ("chờ" if i["pending"] else "—"), i["voice"] or "") for i in view["items"]]
        print("   %-20s %d câu: %s" % (vname, len(view["items"]), kinds))
        for i in view["items"]:
            t = paper.audio_for(i["id"], False, None, note_item, voice, word_item)
            ts = paper.audio_for(i["id"], True, None, note_item, voice, word_item) if i["slow"] else None
            if i["audio"]:
                ok(t is not None, "%s %s phát được: %s" % (vname, i["id"], t and (t[0], str(t[1])[:30], t[2])))
            if ts:
                ok(ts[2] < 1 or ts[0] == "file", "%s %s bản chậm: %s" % (vname, i["id"], (ts[0], ts[2])))
        pend = paper.daily_pending(st, None, note_item, voice, word_item)
        if voice.gen:
            ok(len(pend) == len([i for i in view["items"] if not i["audio"] or i["voice"] == "giọng máy"]),
               "%s: %d câu cần Gemini tạo" % (vname, len(pend)))
        # trả lời đúng bằng kana và bằng chữ Hán
        for i in view["items"][:2]:
            info = paper.resolve(i["id"], None, note_item, voice, word_item)
            ans = paper.kana(info["markup"])
            r = paper.answer_daily(st, 100, i["id"], [ans], None, note_item, voice, word_item)
            ok(r["ok"], "%s trả lời kana '%s' → đúng" % (i["id"], ans))
# Gemini tạo xong → lần mở sau dùng giọng Gemini; tạo hỏng → bỏ câu chờ, lấp câu khác
print("\n== Gemini tạo xong / hỏng trong ngày (deck D: chỉ từ, không gì cả)")
did = col.decks.id_for_name("D::Chỉ từ, không gì cả"); plants = core.build_garden(col, did, cfg)["plants"]
v = VOICES["Gemini (chưa tạo)"]; st = paper.empty_state(); ex, ws = cands(plants, v)
paper.build_daily(st, 200, None, ex, note_item, v, word_item, ws)
items0 = list(st["dict"]["items"]); pend = paper.daily_pending(st, None, note_item, v, word_item)
ok(len(items0) == 5 and len(pend) == 5, "5 từ đang chờ Gemini: %s" % pend)
for sp in pend[:3]: cache[sp] = ("/tmp/x.wav", "/tmp/x_cham.wav")
view = paper.daily_view(st, None, note_item, v, word_item)
ok(sum(1 for i in view["items"] if i["audio"]) == 3 and view["pending"] == 2, "3 câu đã có giọng Gemini, 2 còn chờ")
v_fail = paper.Voice(cached=lambda s: cache.get(s), gen=False)   # Gemini hết hạn mức hôm nay
changed = paper.build_daily(st, 200, None, *cands(plants, v_fail)[:1], note_item, v_fail, word_item, cands(plants, v_fail)[1])
ok(changed and len(st["dict"]["items"]) == 3, "hết hạn mức → bỏ 2 câu không nghe được, còn %d" % len(st["dict"]["items"]))
# ID mới qua clean_state
st2 = paper.clean_state(json.loads(json.dumps(st)))
ok(st2["dict"]["items"] == st["dict"]["items"], "id 'w:<nid>' giữ được qua clean_state")
# note_word_item: kanji đơn bị bỏ; từ có cách đọc
didE = col.decks.id_for_name("E::Kanji đơn")
ok(all(word_item(p["nid"]) is None for p in core.build_garden(col, didE, cfg)["plants"]), "kanji đơn không thành bài nghe từ")
w = word_item(core.build_garden(col, did, cfg)["plants"][2]["nid"])
ok(w and w["markup"] == "[食べる|たべる]" and paper.matches(w["markup"], [], ["たべる"]) and paper.matches(w["markup"], [], ["食べる"]),
   "từ 食べる: gõ たべる hoặc 食べる đều đúng (%s)" % (w and w["markup"]))
col.close(); shutil.rmtree(tmp)
print("\nKẾT QUẢ:", "OK" if not FAIL else "%d lỗi" % len(FAIL))
sys.exit(1 if FAIL else 0)
