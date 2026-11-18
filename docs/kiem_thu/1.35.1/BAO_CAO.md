# Báo cáo 1.35.1 — kiểm tra lại 1.35: ngôn ngữ mới, logic ngôn ngữ, Trang trí thử (18/11/2026)

Người dùng: "kiểm tra lại thật kỹ logic, giao diện, tính năng, UI của addon này. test thêm ngoài những test đã có sẵn. các
ngôn ngữ mới được thêm vào (Trung, Hàn, Pháp, Đức) thì mọi thứ đã viết tự nhiên chưa (tên báo, đồ vật, stack-chan), logic
ngôn ngữ, xem nó đã bao gồm hầu hết các trường hợp chưa. test thật kỹ các trường hợp nhé, mất dữ liệu (trang trí thử,...)"

Làm trên nhánh `claude/addon-review-new-languages-y9hrzh` (từ 1.35.0, chưa gộp master). **Không đổi phần lưu trữ**: không
thêm khoá collection, không thêm mục config.json (test so với 1.35.0). **Cách sửa Claude chọn, người dùng chưa xem.**

## 1. Lỗi tìm được và đã sửa

### 1.1 Logic ngôn ngữ — tiếng Đức

| # | Lỗi (1.35.0) | Ví dụ | Sửa |
|---|---|---|---|
| D1 | **Ký hiệu từ điển "sở hữu cách + số nhiều"** làm hỏng từ: "der Hund, -(e)s, -e" thành "Hund -e" — không nối tra từ, Điền vào câu không tìm thấy, **Đuổi quạ gõ "Hund" bị chấm sai**, tra từ của báo ghi từ gốc "der Hund -e" | `der Name, -ns, -n`, `die Frau, -, -en` (kiểu Duden, rất hay gặp) | biểu thức bỏ số nhiều dừng ở dấu phẩy kế (`eu_core`, `games.js`, `paper.js`) |
| D2 | Không phân biệt hoa / thường: deck "der Morgen" (buổi sáng) nối cả "morgen" (ngày mai); deck "arm" (nghèo) nối "der Arm" (cánh tay); "essen" nối "das Essen" | „Wir sehen uns morgen." → tra ra "buổi sáng" | danh từ (viết hoa / có mạo từ) chỉ nhận chữ viết hoa; từ viết thường chỉ nhận chữ hoa ở đầu câu / sau ngoặc kép (`eu_core.context_ok`) |
| D3 | Động từ tách + bất quy tắc không nhận dạng quá khứ | aufgestanden, mitgenommen, angezogen, aufstand | gốc bất quy tắc sau tiền tố tách |
| D4 | Tiền tố tách còn thiếu | umgezogen, stattgefunden, kennengelernt | thêm um, durch, statt, kennen, wieder, frei, hoch, da, dar, nieder |
| D5 | Tiền tố không tách + bất quy tắc | bekam (bekommen), gefällt / gefiel (gefallen), verließ | gốc bất quy tắc sau be- / ge- / er- / ver- / ent- / emp- … (Partizip không có ge-) |
| D6 | Động từ mạnh A1–B1 còn thiếu | gegossen (gießen — có trong câu StackChan "die Blumen gießen"), angefangen, eingeladen, geschnitten, empfohlen | thêm ~40 động từ |
| D7 | Präteritum có -ete | arbeitete, wartete | thêm đuôi -ete / -eten / -etest |
| D8 | So sánh hơn / nhất | älter, kälteste, jünger, wärmer, besser, größte, höher | đuôi so sánh + umlaut cho tính từ một âm tiết + bảng bất quy tắc |
| D9 | "die Mutter, ¨" (số nhiều chỉ đổi umlaut) sinh thêm một "cách viết" là dấu "¨" | | bỏ phần chỉ có dấu ¨ |

### 1.2 Logic ngôn ngữ — tiếng Pháp

| # | Lỗi (1.35.0) | Ví dụ | Sửa |
|---|---|---|---|
| F1 | **Từ đồng hình khác nghĩa bị nối nhầm** | deck "le lit" (cái giường) nối "il **lit**" (đọc); "la porte" (cửa) nối "elle **porte**" (mặc); "l'été" (mùa hè) nối "il a **été**"; "le fait" nối "il **fait** beau"; "le bois" nối "je **bois**"; ngược lại "porter" nối "la **porte**" | danh từ không nhận ngay sau đại từ chủ ngữ / ne / qui; "été" không nhận sau avoir; động từ không nhận sau mạo từ / từ hạn định — trừ đại từ tân ngữ (je **la porte**, je l'**aime**) và nguyên mẫu (je vais le **faire**) |
| F2 | Danh từ có mạo từ mà đuôi -er / -ir / -re bị chia như động từ → mất số nhiều, có dạng sai | "le papier" không nhận "papiers"; "le cahier" ≠ "cahiers"; **"le soir" nối "soit" / "sois" / "soi"** | có mạo từ / ghi giống (m) (f) n.m. → chỉ thêm số nhiều; "-oir" không chia như nhóm 2 |
| F3 | Danh từ / tính từ ghi không mạo từ, đuôi -re / -er | "livre" ≠ "livres", "fenêtre" ≠ "fenêtres", "autre" ≠ "autres" | thêm số nhiều |
| F4 | Đổi e / é → è | lève (se lever), répète, achètera | thêm |
| F5 | Động từ có tiền tố của động từ bất quy tắc | devenu, obtenu, permis, décrit, reconnais, découvert | gốc + tiền tố (voir chỉ re- / pré- / entre-: không nhận nhầm pouvoir / savoir) |
| F6 | Thiếu đuôi | finissais, parleraient, construisent, aille / puisse / sache, se sent | thêm |
| F7 | Nháy cong ’ (Gemini hay viết) | aujourd’hui, d’accord không nối | nháy cong = nháy thẳng khi tìm |

### 1.3 Tiếng Trung / tiếng Hàn

| # | Lỗi (1.35.0) | Sửa |
|---|---|---|
| Z1 | **Từ một chữ của deck nối vào giữa từ ghép**: 家 trong 大家 ("mọi người" → tra ra "nhà"), 天 trong 今天, 生 trong 学生, 书 trong 图书馆 | dùng ranh giới từ Gemini đã đánh dấu `[大家|da4 jia1]`: chữ một mình nằm trong từ hai chữ không nối (trừ chữ hư / số: 不好, 一天, 我们的), nhóm dài chỉ chặn chữ ở giữa (很漂亮, 今天天气 vẫn nối); từ ≥ 2 chữ không đổi |
| K1 | Nguyên âm không gộp với 어: 쉬어요 (쉬다), 되어요 (되다) không nhận | nhận 어 / 었 sau thân ㅟ ㅢ ㅚ ㅐ ㅔ ㅕ |
| K2 | Động từ phụ viết liền: 도와줘요 (돕다), 해봐요, 먹어봐요 | ㅂ bất quy tắc ㅗ → 와 (돕다, 곱다); thân đã gộp + 주 / 줘 / 보 / 봐 / 드 / 있 / 버 / 놓 |

Không nhận nhầm (đã thử): 해가 ≠ 하다, 와인 ≠ 오다, 가게 ≠ 가다, 사과를 ≠ 사다, 주스 ≠ 주다.

### 1.4 Đoán ngôn ngữ deck (loại note chưa cấu hình)

| Deck | 1.35.0 đoán | 1.35.1 |
|---|---|---|
| tiếng Ý không có ò / ì (la casa, il cane, l'acqua, caffè) | **Tiếng Pháp** (đọc bằng giọng Pháp, vào báo tiếng Pháp) | Ngôn ngữ khác |
| tiếng Tây Ban Nha không dấu (el perro, la mesa) | **Tiếng Pháp** | Ngôn ngữ khác |
| tiếng Phần Lan (äiti, hyvää, tyttö), Estonia (õun, süüa) | **Tiếng Đức** | Ngôn ngữ khác |
| tiếng Hà Lan (de hond, het huis, een boek) | Tiếng Anh | Ngôn ngữ khác |
| deck Đức / Pháp thật, deck Pháp có câu "il pleut / il y a" | đúng | vẫn đúng |

Chỉ đổi kết quả đoán (không ghi gì vào collection); người dùng đã chọn ngôn ngữ ở Cấu hình trường thì giữ nguyên.

### 1.5 Mất dữ liệu — Trang trí thử

| # | Lỗi (1.34–1.35.0) | Sửa |
|---|---|---|
| T1 | **Sửa bản thử lúc Anki đang đồng bộ thì lệnh lưu bị bỏ** nhưng trang vẫn hiện món vừa dời → đóng vườn là mất lần sửa đó (1.34 cố ý bỏ, có ghi trong `e2e_134`) | bản thử chỉ là file trên máy → lệnh get / put / pick chạy cả lúc đồng bộ (khi `mw.col` còn); "Dùng bản này" (trả xu) vẫn bị chặn + báo một câu |
| T2 | File bản thử hỏng (ghi dở, sửa tay) → đọc ra trống → lần lưu kế **ghi đè, mất bản thử mọi cảnh** | giữ file hỏng thành `ban_thu.json.hong` (cứu được) rồi mới ghi |
| T3 | File bản thử có mà không đọc được (lỗi đĩa / quyền) → đọc ra trống → lần lưu kế ghi đè | không ghi, báo "Chưa đọc được bản thử đã lưu…" |
| T4 | Khi lưu lỗi, trang đọc lại → chép cảnh thật vào ô trống → lưu → lỗi → đọc lại… **vòng lặp không dứt** (tiếng "あれ？" liên tục) | đọc lại tối đa một lần / 5 giây |
| T5 | "Như cảnh thật" xoá ngay bản thử đang bày (một cú bấm nhầm là mất) | bản thử đã khác cảnh thật → hỏi trước (hộp hỏi như khi mua; Huỷ giữ nguyên) |

### 1.6 Câu chữ

| Chỗ | 1.35.0 | 1.35.1 | Vì sao |
|---|---|---|---|
| Chợ sáng tiếng Đức / Pháp | „**der Hund, -e**“, bitte! | „der Hund“, bitte! | khách nói cả ký hiệu số nhiều của deck |
| StackChan (Đức) khi chấm Khó | Schön versucht! | Gut gekämpft! | "Schön versucht" = "thử hay đấy" (ngụ ý chưa được), trong khi chấm Khó là vẫn nhớ |
| StackChan (Đức) あれ？ | Hä? | Nanu? | "Hä?" nghe cộc |
| StackChan (Đức) いい湯だな～ | Herrlich warmes Wasser~ | Ah, tut das gut~ | câu người Đức nói khi ngâm nước ấm |
| StackChan (Pháp) がんばって！ | Tu peux le faire ! | Courage ! | dịch từng chữ từ tiếng Anh |
| StackChan (Pháp) いい感じ！ (dán giấy tường) | Ça a l'air bien ! | Ça rend bien ! | |
| StackChan (Pháp) いい湯だな～ | Quelle bonne eau chaude~ | Ah, l'eau est bonne~ | |
| Sinh hoạt (Hàn) 窓 | 밖을 보다 | 창밖을 보다 | "nhìn ra cửa sổ" |
| Sinh hoạt (Hàn) 雪 | 눈을 보다 | 눈 구경을 하다 | 눈 vừa là "mắt" vừa là "tuyết" |
| Đồ nhặt (Hàn) 苔玉 | 이끼 공 | 이끼볼 | tên gọi thật |
| StackChan (Hàn) いい湯だな～ | 물 좋다~ | 따뜻해서 좋다~ | "물 좋다" còn là tiếng lóng khác nghĩa |

Đuổi quạ: động từ phản thân gõ không cần sich / se / s' (gõ "freuen" cho "sich freuen", "lever" cho "se lever") — như đã
bỏ mạo từ.

## 2. Soát độ tự nhiên (không sửa — ghi lại để người dùng / người giỏi tiếng đó xem)

- **Tên báo**: *Der Wortgarten* (Đức, "Vườn chữ"), *Le Jardin des Mots* (Pháp, "Khu vườn của chữ"), 词田晨报 (Trung, "Báo sáng
  Ruộng chữ" — kiểu tên như 北京晨报), 말밭 신문 (Hàn, "Báo Ruộng lời" — 말밭 là từ ghép tự đặt theo ことば畑, đọc tự nhiên). Cả bốn
  đều đúng ngữ pháp và đọc như tên báo thật; vẫn **chờ người dùng chọn** (phương án khác ở `docs/kiem_thu/1.35/BAO_CAO.md`
  mục 1 và `docs/kiem_thu/1.33/BAO_CAO.md` mục 1).
- **Bảng Ngôn ngữ trong vườn** (`lang_core.py`): Claude đọc lại hết ~200 mục × 4 tiếng. Tiếng Trung / Hàn / Đức / Pháp đều
  đúng nghĩa, đúng giống (der / die / das, le / la), đúng chính tả (hunspell de_DE / fr soát lại sau khi sửa); chỉ sửa các câu
  ở bảng trên. Vài chỗ dịch thoáng nhưng không sai, giữ nguyên: "đổi bày trí" → 换新装 ("thay áo mới" cho căn phòng), "nghe radio" → 听收音机
  (người trẻ hay nói 听广播), tanuki → 狸猫 (cách gọi tanuki quen thuộc ở Trung Quốc), "Tee kochen" (tiếng Đức nói thường ngày).
- Vẫn nên nhờ người giỏi tiếng Đức / Pháp / Trung / Hàn đọc lại `lang_core.py` + vài số báo thật.

## 3. Giới hạn còn lại (đã biết, không sửa)

- Tiếng Pháp: "je **la porte**" (đại từ tân ngữ + động từ) vẫn có thể nối vào danh từ "la porte" nếu deck có cả hai — câu
  không có dấu hiệu nào để máy biết (không dùng từ điển). Hiếm ở A1–B1.
- Tiếng Trung không có dấu cách: từ một chữ chỉ được chặn khi Gemini đánh dấu từ ghép (`[大家|…]`); chữ trơn không đánh dấu vẫn
  như cũ.
- Đổi tên hồ sơ Anki: bản thử (cũng như bản sao lưu theo hồ sơ) nằm ở thư mục theo mã của đường dẫn hồ sơ cũ → không thấy nữa
  (file vẫn còn; PHAT_TRIEN.md mục 9).
- Động từ tách tiếng Đức đứng rời ("Ich rufe dich an") vẫn không nối (như 1.35.0 — cố ý).

## 4. Kiểm thử

### 4.1 Kịch bản mới (ngoài bộ có sẵn)

- `tests/core/test_1351.py` (31 kiểm tra) + `tests/core/test_1351.js` (Đuổi quạ / Chợ sáng, hàm thật của `games.js` trong node):
  từng lỗi ở mục 1 (Đức 50 câu, Pháp 51 câu, nháy cong, 3.000 câu ngẫu nhiên không chồng / không cắt giữa chữ / đúng ngữ
  cảnh, 12 kiểu deck đoán ngôn ngữ, 10 ca tiếng Trung, 21 ca tiếng Hàn, Trang trí thử với collection Anki thật — file hỏng,
  file không đọc được, **chạy đúng mã `_on_bridge` của add-on** với Anki giả đang đồng bộ —, soát mã giao diện, câu chữ,
  hợp đồng dữ liệu so với 1.35.0). **Trên mã 1.35.0: đỏ 21 / 31** — test bắt đúng các lỗi; mã 1.35.1: 31 / 31.
- `tests/anki/e2e_1351.js` (Anki 26.9.4 thật, chuột / phím thật): đo chữ của Sổ sinh hoạt / Hộp sưu tầm / Album khách / thẻ
  trò chơi ở Đức / Pháp / Trung / Hàn (không tràn ô, không từ nào rộng hơn ô, trang không cuộn ngang) — **1.35.0 bẻ giữa 4
  từ Đức** ("Morgengymnas / tik machen", ảnh `so_sinh_hoat_de_truoc_sau.png`: trên là 1.35.0, dưới là 1.35.1); Trang trí thử
  lúc giả "Anki đang đồng bộ": đặt thử vẫn lưu, đóng vườn mở lại còn, "Dùng bản này" bị chặn + câu báo, đồng bộ xong dùng
  được (−220 xu đúng); "Như cảnh thật" hỏi trước, Huỷ giữ bản thử; file bản thử thành thư mục → đúng 3 lệnh rồi dừng (không
  lặp); không lỗi JS / nhật ký lỗi.

### 4.2 Kết quả

| Bộ | Kết quả |
|---|---|
| `tests/run_all.sh` (thư mục mã nguồn, `ANKI_PY` = aqt 26.9.4) | 68 bộ — một lần đỏ: `test_1314` quét thấy chính dòng báo cáo này có chữ kana cạnh chữ Trung → sửa câu trong báo cáo, chạy lại 32 / 32 |
| `tests/run_all.sh` trên **gói đã đóng** (giải nén, khớp thư mục mã nguồn từng file) | **68 bộ, TẤT CẢ OK** |
| `core/test_1351.py` | 31 / 31 (mã 1.35.0: 10 / 31) |
| Anki 26.9.4: `e2e_1351` (thư mục mã nguồn + gói đã đóng; tên trò chơi đo với deck Đức / Pháp) | 35 / 35 · 35 / 35 |
| Anki 26.9.4: `e2e_135` 60 / 60, `e2e_134` 87 / 87 (đổi theo hành vi mới: bản thử lưu được lúc đồng bộ, "Như cảnh thật" hỏi trước), `e2e_135_ngonngu` 5 / 5, `e2e_1333_ngonngu` 5 / 5, `e2e_132` 39 / 39, `e2e_133` 77 / 77 | đạt hết |
| `run_capnhat.sh` gói **1.31.3 đã phát hành** (`e64eb22`) → 1.35.1, cài đè bằng trình quản lý add-on | 19 / 19 |
| `run_habanh.sh` 1.35.1 → 1.31.3 → 1.35.1 (có deck tiếng Đức) | 26 / 26 |

### 4.3 Chưa chạy lần này

- Anki 23.10.1 (Python 3.9) — môi trường làm việc mới chưa có venv bản cũ; phần đổi ở 1.35.1 không dùng cú pháp mới
  (`run_all.sh` biên dịch mọi file bằng Python hiện có; nên chạy `PY39` ở lần sau).
- Gemini thật: 1.35.1 chỉ đổi phần máy nối tra từ / kiểm (không đổi lời nhắc, không thêm lượt gọi) — số báo mẫu và Gemini giả
  trong `test_135` / `test_133` vẫn 0 lỗi.

## 5. Việc người dùng cần làm

1. Đọc mục 1.6 (câu chữ đã sửa) và mục 2 (tên báo) — giữ hay đổi.
2. Xem trên máy thật: deck tiếng Đức / Pháp → báo (tra từ), Đuổi quạ, ⚙ Ngôn ngữ trong vườn → Tiếng Đức (Sổ sinh hoạt);
   Nhà → Trang trí thử → "Như cảnh thật" (giờ có hộp hỏi).
3. Gộp master khi thấy ổn (1.35.0 + 1.35.1 đều chưa gộp).
