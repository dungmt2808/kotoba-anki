"""16/11: so các model Gemini trên đúng lời nhắc bản gốc tiếng Việt (nhà văn + biên tập) của add-on — kỳ 42 giữa đợt
"Căn phòng số 0" (nối kỳ trước, có mạch, tin làng mấy số trước). Mỗi model 2 lượt gọi. In thời gian, token, tiêu đề;
ghi cả truyện ra OUT/ket_qua.json để đọc so.
Chạy: KB_STREAM=1 ${ANKI_PY} tests/gemini/so_model.py OUT gemini-4-hydrogen gemini-flash-latest gemini-flash-lite-latest
      (proxy tự chèn khoá thì không cần GEMINI_API_KEY)"""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import _setup
ai = _setup.load(os.path.join(HERE, "..", "..", "kotoba_batake"))
OUT = sys.argv.pop(1)
os.makedirs(OUT, exist_ok=True)
import story_core as S

usage = {}
_orig = ai.Gemini._request
def _req(self, method, path, body=None, timeout=ai.TEXT_TIMEOUT, model=""):
    r = _orig(self, method, path, body, timeout, model)
    if isinstance(r, dict):
        usage["last"] = r.get("usageMetadata") or {}
    return r
ai.Gemini._request = _req

c = ai.Gemini(_setup.key())
prev = {"ky": 41, "ngay": "2026-11-15", "tom_tat": "Lin tìm thấy một chiếc chìa khoá đồng nhỏ dưới bậc thềm quán. StackChan quả quyết đó là chìa khoá của 'phòng số 0' mà quán không hề có.",
        "nguyen_van": ["Sáng sớm, Lin quét bậc thềm thì nghe 'keng' một tiếng. Dưới khe gỗ là một chiếc chìa khoá đồng nhỏ, đầu khắc số 0.",
                       "\"Quán mình làm gì có phòng số không,\" chị Hana nói, xoay chiếc chìa trong tay. StackChan thì đã chạy khắp hành lang, gõ vào từng bức tường.",
                       "Đến tối, khi Lin tắt đèn, cô thấy một vệt sáng mảnh lọt ra từ chân tường cuối hành lang — đúng chỗ chưa từng có cánh cửa nào."],
        "bo_ngo": ["Vệt sáng ở chân tường cuối hành lang là gì?"], "da_giai": [], "nhan_vat_moi": []}
arc = {"ten": "Căn phòng số 0", "muc_tieu": "Lin muốn biết chiếc chìa khoá số 0 mở cái gì", "bi_an": "Quán có một căn phòng bị quên?",
       "nhan_vat_phu": "Bác thợ mộc già Tomo, người dựng quán năm xưa, muốn giữ một lời hứa cũ",
       "buoc": ["Lin nhặt được chìa khoá số 0", "Vệt sáng sau bức tường; StackChan nghe tiếng gõ", "Hỏi bác Tomo, bác lảng tránh",
                "Tìm thấy bản vẽ cũ của quán", "Mở được bức tường giả", "Bên trong là căn phòng nhỏ đầy thư", "Bác Tomo kể lời hứa; kết ấm"],
       "ket": "Căn phòng được mở thành góc đọc thư của quán; còn một lá thư chưa có người nhận", "tu_ky": 41, "giong": "bi_an", "dot": 6}
scope = {"lang": "vi", "trinh_do": "", "thoi_tiet": "sáng sương mù, chiều nắng nhẹ", "tin_truoc": ["Chợ phiên cuối tuần sẽ dời sang sáng Chủ nhật vì sương mù."], "muc3": "cot"}
prompt = S.writer_prompt("vi", scope, 42, "bi_an", arc, [prev], "cuối thu, tháng 11", tones=["bi_an", "am"])
system = "Bạn là nhà văn viết truyện dài kỳ tiếng Việt cho người đọc đang ôn bài bằng thẻ Anki. Viết hay như một truyện thật, không như bài giảng."
out = {}
for m in sys.argv[1:]:
    t = time.time()
    try:
        txt = c.generate(m, system, prompt, S.MASTER_SCHEMA, 0.9, thinking="low")
        d = ai.parse_json(txt); dt = time.time() - t; u = dict(usage.get("last") or {})
        t2 = time.time()
        ed = ai.parse_json(c.generate(m, "Bạn là biên tập viên truyện khó tính nhưng công bằng.",
                                      S.editor_prompt("vi", scope, d, [prev], 42, []), S.EDIT_SCHEMA, 0.3, thinking="low"))
        out[m] = {"giay": round(dt, 1), "giay_bien_tap": round(time.time() - t2, 1), "token_vao": u.get("promptTokenCount"),
                  "token_ra": u.get("candidatesTokenCount"), "token_nghi": u.get("thoughtsTokenCount"),
                  "tieu_de": d.get("tieu_de"), "doan": d.get("doan"), "tin": [x.get("tieu_de") for x in d.get("tin") or []],
                  "diem_tu_cham": (ed.get("diem") or {}), "loi": ed.get("loi"), "goi_y": ed.get("goi_y")}
    except Exception as e:
        out[m] = {"loi": "%s: %s" % (type(e).__name__, str(e)[:300]), "giay": round(time.time() - t, 1)}
    print(m, json.dumps({k: v for k, v in out[m].items() if k not in ("doan",)}, ensure_ascii=False))
json.dump(out, open(os.path.join(OUT, "ket_qua.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("lượt gọi:", c.calls)
