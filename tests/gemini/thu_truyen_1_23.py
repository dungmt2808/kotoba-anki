"""Bản thử lời nhắc truyện mới cho Gemini (kế hoạch 1.23, mục 5c; CHƯA đưa vào add-on):
hồ sơ nhân vật + 8 quy tắc "một kỳ hay" → dàn ý + 3 đoạn + bản dịch → biên tập chấm 4 tiêu chí → viết lại nếu < 4.
Chạy: GEMINI_API_KEY=... KB_STREAM=1 python thu_truyen_1_23.py ADDON OUT.json   [KB_MODEL=gemini-3.5-flash]
(môi trường có proxy tự chèn khoá thì bỏ GEMINI_API_KEY). Lần chạy 05/11/2026: docs/ke_hoach_1_23/thu_truyen_gemini_0511.json.
Phiên làm 1.23: dùng làm điểm xuất phát cho quy trình thật (có responseSchema, giới hạn số lần thử, máy kiểm tra bản dịch)."""
import json, os, sys, re, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup
ai = _setup.load(sys.argv[1])
OUT = sys.argv[2]
pv = json.load(open(os.path.join(_setup.HERE, '..', '..', 'kotoba_daily', 'pham_vi.json'), encoding='utf-8'))
scope = ai.scope_from_pham_vi(pv)
vocab = scope['tu_vung']
grammar = scope['ngu_phap']
focus_g = [g for g in grammar if str(g.get('bai', '')).endswith(('27', '28', '29'))][:6] or grammar[-6:]
words = '、'.join(r[0] for r in vocab[:600])
gram = '\n'.join('- %s: %s' % (g['mau'], g['nghia']) for g in focus_g)

BIBLE = """TRUYỆN DÀI KỲ 『ことば村の小さな旅館』 — làng nhỏ ことば村 cạnh khu vườn ことば畑, mùa và thời tiết theo ngày thật ở Nhật.
Nhân vật (mỗi người có điều muốn, điều sợ, câu cửa miệng; giữ nhất quán):
- リンさん: cô gái Việt Nam 22 tuổi mới đến làm ở quán trọ ことば屋. Muốn được はなさん tin tưởng giao việc một mình. Sợ nói sai làm khách giận. Hay nhầm kính ngữ (đúng mẫu ngữ pháp người học đang học), nhầm xong tự sửa được. Câu cửa miệng: 「がんばります！」
- はなさん: bà chủ quán (女将さん), khoảng 30 tuổi, điềm tĩnh, nói kính ngữ với khách, thân mật với Lin. Có một bí mật nhỏ về quá khứ của quán (chưa kể).
- スタックちゃん: robot nhỏ của khu vườn, tò mò, nói thân mật, xưng ぼく, hay vẽ tranh pixel và hiểu sai thành ngữ theo nghĩa đen (gây cười).
- 村長（そんちょう）: trưởng làng, hiền, thích kể chuyện ngày xưa, hay kể quá dài.
- Nhân vật phụ có thể thêm: một vị khách trọ mỗi đợt (có mục đích riêng), người đưa thư, con mèo hoang.
Giọng truyện: ấm áp, dí dỏm nhẹ, có một chút bí ẩn kéo dài nhiều kỳ."""

RULES = """CÁCH VIẾT MỘT KỲ HAY (bắt buộc):
1. Một cảnh, 2–3 nhân vật. Mở đầu bằng hành động hoặc lời thoại, không mở bằng tả thời tiết.
2. Có MỘT vấn đề cụ thể: nhân vật muốn gì, cái gì cản (hiểu lầm, đồ bị mất, khách khó tính, lời nói nhầm…). Nhân vật tự xoay xở.
3. Dùng mẫu ngữ pháp đang học làm CHẤT LIỆU của chuyện (ví dụ Lin nói nhầm kính ngữ → khách hiểu lầm → buồn cười), không chèn cho có.
4. Có ít nhất một chi tiết bất ngờ hoặc buồn cười, và một khoảnh khắc cảm xúc nhỏ.
5. Kết bằng một móc câu: một câu hỏi chưa có lời đáp, một vật lạ, một câu nói bỏ dở. Không kết bằng bài học hay lời khuyên.
6. Không liệt kê đồ vật, không câu kiểu「〜が2個あります」 chỉ để dùng từ. Không lặp lại tình huống của các kỳ trước.
7. Thoại thể hiện tính cách; ghi rõ ai nói. Câu ngắn, tự nhiên, đúng trình độ N4: chỉ dùng từ trong DANH SÁCH TỪ và từ cơ bản N5; tối đa 2 từ ngoài danh sách (ghi vào tu_moi kèm nghĩa).
8. Độ dài: 3 đoạn, mỗi đoạn 90–150 ký tự tiếng Nhật."""

SCHEMA_NOTE = """Trả về đúng một object JSON:
{"dan_y": {"muon": "nhân vật muốn gì (tiếng Việt)", "tro_ngai": "...", "bat_ngo": "...", "moc_cau": "..."},
 "tieu_de": "tiêu đề tiếng Nhật", "doan": ["đoạn 1 tiếng Nhật (chữ Hán + kana, KHÔNG furigana)", "đoạn 2", "đoạn 3"],
 "dich": ["bản dịch tiếng Việt tự nhiên của đoạn 1", "đoạn 2", "đoạn 3"],
 "tu_moi": [{"w": "từ", "r": "cách đọc", "m": "nghĩa"}],
 "nho": "2 câu tiếng Việt cho mục ĐÃ XẢY RA: chuyện gì, nhân vật mới, CHỖ BỎ NGỎ nào cần kỳ sau giải quyết"}"""

CRITIC = """Bạn là biên tập viên truyện cho người học tiếng Nhật N4. Chấm kỳ truyện dưới đây theo 4 tiêu chí, mỗi tiêu chí 1–5:
- su_kien: có chuyện xảy ra (vấn đề cụ thể, nhân vật xoay xở), không phải cảnh sinh hoạt nhạt
- nhan_vat: thoại và hành động đúng tính cách, có cảm xúc
- bat_ngo: có chi tiết bất ngờ / buồn cười
- moc_cau: kết khiến người đọc muốn đọc kỳ sau, không kết bằng lời khuyên
Và kiểm tra: tiếng Nhật tự nhiên, đúng trình độ N4, không gượng vì nhồi từ.
Trả về JSON: {"diem": {"su_kien": n, "nhan_vat": n, "bat_ngo": n, "moc_cau": n}, "goi_y": ["sửa cụ thể 1", "..."]}"""

client = ai.Gemini(_setup.key())
t = ai.test_key(client, "")
models = t["models"]
pro = [m for m in models if "pro" in m]
model = os.environ.get("KB_MODEL") or (pro or models)[0]
print("model:", model, "| có:", models[:6])
calls = 0


def gen(system, prompt, temp=0.9, thinking=None):
    global calls
    last = None
    for m in [model] + [x for x in models if x != model]:
        try:
            calls += 1
            raw = client.generate(m, system, prompt, None, temperature=temp, thinking=thinking or "low")
            print("   dùng", m); return json.loads(raw), m
        except Exception as e:   # hết hạn mức / lỗi model → thử model sau
            last = e
            print("  ", m, "lỗi:", str(e)[:120])
    raise last


SYSTEM = "Bạn là nhà văn viết truyện dài kỳ tiếng Nhật dễ đọc cho người Việt học tiếng Nhật N4. Viết hay như một truyện thật, không như bài tập."
memory = []
out = []
for ky in (1, 2):
    mem = "\n".join("- Kỳ %d: %s" % (i + 1, x) for i, x in enumerate(memory)) or "(chưa có kỳ nào: đây là kỳ 1, リンさん bắt đầu làm ở ことば屋)"
    prompt = "\n\n".join([
        BIBLE, "ĐÃ XẢY RA:\n" + mem,
        "HÔM NAY: ngày %d tháng 11, mùa thu lá đỏ. Viết KỲ %d." % (4 + ky, ky),
        "MẪU NGỮ PHÁP ĐANG HỌC (dùng 1–2 mẫu làm chất liệu chuyện):\n" + gram,
        RULES, "DANH SÁCH TỪ ĐÃ HỌC:\n" + words, SCHEMA_NOTE])
    story, m1 = gen(SYSTEM, prompt)
    crit, _ = gen("Bạn là biên tập viên khó tính nhưng công bằng.", CRITIC + "\n\nKỲ TRUYỆN:\n" + json.dumps({k: story.get(k) for k in ("tieu_de", "doan")}, ensure_ascii=False), temp=0.3)
    score = crit.get("diem", {})
    rewritten = False
    if score and min(score.values()) < 4:
        story2, _ = gen(SYSTEM, prompt + "\n\nBẢN NHÁP TRƯỚC:\n" + json.dumps({k: story.get(k) for k in ("tieu_de", "doan")}, ensure_ascii=False)
                        + "\n\nGÓP Ý CỦA BIÊN TẬP (sửa theo, viết lại cả kỳ):\n- " + "\n- ".join(crit.get("goi_y", [])))
        crit2, _ = gen("Bạn là biên tập viên khó tính nhưng công bằng.", CRITIC + "\n\nKỲ TRUYỆN:\n" + json.dumps({k: story2.get(k) for k in ("tieu_de", "doan")}, ensure_ascii=False), temp=0.3)
        out.append({"ky": ky, "ban_nhap": story, "cham_nhap": crit, "ban_sua": story2, "cham_sua": crit2})
        story = story2
        rewritten = True
    else:
        out.append({"ky": ky, "ban_nhap": story, "cham_nhap": crit})
    memory.append(story.get("nho", ""))
    print("kỳ", ky, "điểm nháp", score, "viết lại" if rewritten else "")
json.dump({"model": model, "calls": calls, "ky": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("xong, lượt gọi:", calls)
