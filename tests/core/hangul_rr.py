"""Chuyển chữ Hàn (Hangul) → phiên âm Latinh theo Romaja quốc ngữ (Revised Romanization, 2000) — CHỈ dùng trong test
(core/test_132.py soát cột phiên âm tiếng Hàn của kotoba_batake/lang_core.py). Viết độc lập với bảng chữ: tách âm tiết
thành phụ âm đầu / nguyên âm / phụ âm cuối rồi áp các luật biến âm mà Romaja ghi lại:
nối âm (phụ âm cuối sang âm tiết bắt đầu bằng ㅇ), trung hoà phụ âm cuối (ㄱㄲㅋ→k, ㄷㅅㅆㅈㅊㅌㅎ→t, ㅂㅍ→p, phụ âm
cuối kép), mũi hoá (k/t/p + ㄴ/ㅁ → ng/n/m), ㄹ (ㄴ+ㄹ, ㄹ+ㄴ, ㄹ+ㄹ → ll; ㅁ/ㅇ + ㄹ → n; k/p + ㄹ → ng n / m n),
bật hơi với ㅎ (ㅎ + ㄱㄷㅈ → k t ch; danh từ + 하다 giữ "h" như cách Romaja ghi danh từ), ㅎ cuối trước nguyên âm thì
câm. Không ghi căng hoá (Romaja không ghi). Không xử lý thêm ㄴ (그림엽서 → geurimnyeopseo) — bảng chữ tránh các từ đó.
"""
from __future__ import annotations

L_INIT = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu",
          "ui", "i"]
# phụ âm cuối: (chữ jamo đầu dùng cho jamo gốc, âm khi đứng cuối / trước phụ âm, jamo chuyển sang âm tiết sau khi nối âm)
T_JAMO = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ",
          "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]
INIT_JAMO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]
NEUTRAL = {"ㄱ": "k", "ㄲ": "k", "ㅋ": "k", "ㄳ": "k", "ㄺ": "k", "ㄷ": "t", "ㅅ": "t", "ㅆ": "t", "ㅈ": "t", "ㅊ": "t",
           "ㅌ": "t", "ㅎ": "t", "ㅂ": "p", "ㅍ": "p", "ㅄ": "p", "ㄿ": "p", "ㄴ": "n", "ㄵ": "n", "ㄶ": "n", "ㄹ": "l",
           "ㄼ": "l", "ㄽ": "l", "ㄾ": "l", "ㅀ": "l", "ㅁ": "m", "ㄻ": "m", "ㅇ": "ng", "": ""}
# nối âm: phụ âm cuối (kép) → (phần ở lại, jamo sang âm tiết sau)
LIAISON = {"ㄳ": ("ㄱ", "ㅅ"), "ㄵ": ("ㄴ", "ㅈ"), "ㄶ": ("", "ㄴ"), "ㄺ": ("ㄹ", "ㄱ"), "ㄻ": ("ㄹ", "ㅁ"), "ㄼ": ("ㄹ", "ㅂ"),
           "ㄽ": ("ㄹ", "ㅅ"), "ㄾ": ("ㄹ", "ㅌ"), "ㄿ": ("ㄹ", "ㅍ"), "ㅀ": ("", "ㄹ"), "ㅄ": ("ㅂ", "ㅅ"), "ㅎ": ("", "")}
INIT_ROMA = dict(zip(INIT_JAMO, L_INIT))


def _split(ch: str) -> tuple[str, int, str] | None:
    c = ord(ch) - 0xAC00
    if not 0 <= c < 11172:
        return None
    return INIT_JAMO[c // 588], (c % 588) // 28, T_JAMO[c % 28]


def _word(word: str) -> str:
    syl = [_split(ch) for ch in word]
    if any(s is None for s in syl):
        raise ValueError("không phải âm tiết Hangul: %r" % word)
    s = [[a, v, t] for a, v, t in syl]          # [phụ âm đầu, nguyên âm, phụ âm cuối] (jamo)
    out = []
    for i, (ini, vow, fin) in enumerate(s):
        nxt = s[i + 1] if i + 1 < len(s) else None
        head = "l" if ini == "ㄹㄹ" else "r" if (ini == "ㄹ" and i == 0) else INIT_ROMA[ini]
        tail = ""
        if fin:
            if nxt and nxt[0] == "ㅇ" and fin != "ㅇ":            # nối âm
                stay, move = LIAISON.get(fin, ("", fin))
                if move:
                    nxt[0] = move if move != "ㄹ" else "ㄹ"
                fin = stay
                tail = NEUTRAL[fin] if fin else ""
                if fin == "ㄹ" and stay:
                    tail = "l"
            elif nxt:
                n0 = nxt[0]
                base = NEUTRAL[fin]
                if fin == "ㅎ" and n0 in ("ㄱ", "ㄷ", "ㅈ"):         # ㅎ + ㄱㄷㅈ → bật hơi
                    nxt[0] = {"ㄱ": "ㅋ", "ㄷ": "ㅌ", "ㅈ": "ㅊ"}[n0]
                    tail = ""
                elif base in ("k", "t", "p") and n0 in ("ㄴ", "ㅁ"):    # mũi hoá
                    tail = {"k": "ng", "t": "n", "p": "m"}[base]
                elif n0 == "ㄹ":
                    if base in ("l", "n"):
                        tail, nxt[0] = "l", "ㄹㄹ"
                    elif base in ("m", "ng"):
                        tail, nxt[0] = base, "ㄴ"
                    elif base in ("k", "p"):
                        tail, nxt[0] = {"k": "ng", "p": "m"}[base], "ㄴ"
                    else:
                        tail = base
                elif base == "l" and n0 == "ㄴ":
                    tail, nxt[0] = "l", "ㄹㄹ"
                else:
                    tail = base
            else:
                tail = NEUTRAL[fin]
        out.append(head + VOWELS[vow] + tail)
    return "".join(out)


def romanize(text: str) -> str:
    """Mỗi từ (cách nhau bởi dấu cách) phiên âm riêng; dấu câu giữ nguyên."""
    words = []
    for w in text.split(" "):
        core = "".join(ch for ch in w if _split(ch))
        rest = "".join(ch for ch in w if not _split(ch))
        words.append((_word(core) if core else "") + rest)
    return " ".join(words)
