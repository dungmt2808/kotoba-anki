"""Báo 畑新聞 viết bằng khoá Gemini của người dùng (bản 1.12).

Cách thứ hai để có báo, song song với bộ `kotoba_daily` (Claude Code):
người dùng chỉ cần dán khoá Gemini API (lấy miễn phí ở aistudio.google.com/apikey),
add-on tự viết mỗi ngày một số báo vào thư mục riêng

    user_files/bao_gemini/bao/<YYYY-MM-DD>/bao.json     (cùng định dạng với kotoba_daily)
    user_files/bao_gemini/bao/<YYYY-MM-DD>/audio/...    giọng đọc Gemini (tuỳ chọn)
    user_files/bao_gemini/pham_vi.json                  từ / mẫu câu đã học (để tra nghĩa)
    user_files/bao_gemini/truyen.json, lich_su.json     để truyện và các số sau liền mạch
    user_files/bao_gemini/nhat_ky/<ngày>.json            máy đã sửa những lỗi gì

nên toàn bộ phần đọc báo, chấm câu hỏi, chép chính tả của paper_core dùng lại được nguyên vẹn.

Gemini hay sai hình thức (lẫn romaji, thiếu furigana, chữ Trung giản thể, đọc sai số đếm…),
nên mỗi số đi qua nhiều lớp kiểm tra:
  1. Gemini viết, bắt buộc trả JSON đúng khuôn (responseSchema).
  2. `autofix`: sửa máy móc những lỗi chắc chắn sửa đúng được (bỏ khoảng trắng, bỏ liên kết từ lạ…).
  3. `check`: kiểm tra như tools/kiemtra.py + romaji, ký tự lạ, chữ Trung, cách đọc so với deck,
     kana trong mặt chữ phải có trong cách đọc, ngày tháng / số người đọc đặc biệt.
  4. Còn lỗi → gửi lại đúng danh sách lỗi cho Gemini sửa (tối đa MAX_REPAIRS lần).
  5. Gọi lần 2 với vai biên tập viên (soát ngữ pháp, kính ngữ, furigana, câu hỏi hai đáp án…),
     bản soát lại phải qua bước 2–4 mới được dùng; hỏng thì giữ bản trước đó (đã sạch lỗi máy).
  6. Không qua được thì KHÔNG lưu số báo (thà không có còn hơn báo sai), ghi lý do vào nhật ký.

File này không import aqt; mạng dùng urllib của thư viện chuẩn. Khoá API không bao giờ ghi ra file
log hay gửi sang trang web (chỉ dạng che `AIza…abcd` / `AQ.A…abcd`).
"""

from __future__ import annotations

import array
import base64
import datetime
import hashlib
import io
import json
import math
import operator
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import wave
from typing import Any, Callable

try:
    from . import paper_core as paper
    from . import story_core      # 1.23: truyện dài kỳ theo quy trình mới
except ImportError:  # chạy test: thư mục add-on nằm trong sys.path
    import paper_core as paper  # type: ignore[no-redef]
    import story_core  # type: ignore[no-redef]

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
KEY_PAGE = "https://aistudio.google.com/apikey"
FOLDER = "bao_gemini"
LEVELS = ("N5", "N4", "N3", "N2", "N1")
AUDIO_MODES = ("chinh_ta", "ca_bai", "tat")
VOICES = ("Kore", "Leda", "Aoede", "Puck", "Charon", "Zephyr", "Fenrir", "Orus", "Callirrhoe", "Despina")
MAX_REPAIRS = 2            # số lần gửi lại danh sách lỗi cho Gemini sửa (trước bước soát)
MAX_AUTO_TRIES = 2         # số lần tự viết thất bại tối đa mỗi ngày (bấm tay thì không giới hạn)
MAX_MODELS = 8             # 1.13: số model viết chữ thử tối đa mỗi lượt (cả Flash-Lite, hạn mức riêng)
TEXT_TIMEOUT = 240
TTS_TIMEOUT = 120
MAX_OUT_TOKENS = 65536     # trần token trả về (tính cả token "suy nghĩ" của Gemini 2.5 / 3.x)
THINK_BUDGET = {"low": 2048, "medium": 8192, "high": 24576}   # Gemini 2.5 (thinkingBudget)
VOICE_DIR = "giong"        # 1.13: giọng Gemini cho câu không có audio (câu ví dụ của deck, câu báo thiếu audio)
LENGTH = {"N5": (150, 400), "N4": (280, 700), "N3": (450, 1000), "N2": (650, 1400), "N1": (650, 1600)}
LOAI_AI = ("tin_lang", "truyen", "thong_bao", "cot")


class AIError(Exception):
    """Lỗi hiện được cho người dùng (câu tiếng Việt). kind: key/quota/net/busy/model/bad/blocked/format."""

    def __init__(self, msg: str, kind: str = "other", retry_after: float | None = None, daily: bool = False,
                 quota_model: str = "") -> None:
        super().__init__(msg)
        self.kind = kind
        self.retry_after = retry_after
        self.daily = daily
        self.quota_model = quota_model    # model thật bị hết hạn mức (tên gọi tắt như gemini-3.5-flash trỏ sang model khác)


def next_reset(now: float | None = None) -> float:
    """Lần đặt lại hạn mức miễn phí kế tiếp của Gemini: 0 giờ giờ Thái Bình Dương ≈ 08:00 UTC (giờ mùa đông)."""
    now = time.time() if now is None else now
    day = 86400
    t = now - now % day + 8 * 3600
    return t if t > now else t + day


def mask_key(key: str) -> str:
    key = (key or "").strip()
    if not key:
        return ""
    return key[:4] + "…" + key[-4:] if len(key) > 10 else "…"


def clean_key(key: Any) -> str:
    """Khoá dán vào có thể kèm khoảng trắng, dấu nháy, xuống dòng."""
    if not isinstance(key, str):
        return ""
    return re.sub(r"[\s\"'`]", "", key)[:200]


def key_problem(key: str) -> str | None:
    if not key:
        return "Chưa dán khoá."
    # 1.22.2: AI Studio nay cấp khoá kiểu mới "AQ.…" (có dấu chấm); khoá cũ "AIza…" vẫn nhận
    if not re.match(r"^[A-Za-z0-9_\-.]{20,200}$", key):
        return "Khoá có ký tự lạ. Chép lại đúng chuỗi khoá (bắt đầu bằng AQ. hoặc AIza)."
    return None


# ---------------------------------------------------------------------------
# Gọi Gemini API (REST, thư viện chuẩn)
# ---------------------------------------------------------------------------


def _ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    try:   # bản Anki đóng gói đôi khi không thấy kho chứng chỉ của máy → dùng certifi nếu có
        if not ctx.cert_store_stats().get("x509_ca"):
            import certifi  # type: ignore[import-not-found]
            ctx.load_verify_locations(certifi.where())
    except Exception:
        pass
    return ctx


def _retry_delay(details: Any) -> tuple[float | None, bool, str]:
    """(số giây nên chờ, có phải hết hạn mức của cả ngày, model thật bị chặn) từ phần details của lỗi 429."""
    delay, daily, hit = None, False, ""
    for d in details if isinstance(details, list) else []:
        if not isinstance(d, dict):
            continue
        rd = d.get("retryDelay")
        if isinstance(rd, str):
            m = re.match(r"^([\d.]+)s$", rd.strip())
            if m:
                delay = float(m.group(1))
        for v in d.get("violations", []) if isinstance(d.get("violations"), list) else []:
            q = json.dumps(v) if isinstance(v, dict) else str(v)
            if "PerDay" in q or "per_day" in q.lower():
                daily = True
                dims = v.get("quotaDimensions") if isinstance(v, dict) else None
                if isinstance(dims, dict) and isinstance(dims.get("model"), str):
                    hit = dims["model"][:80]
    return delay, daily, hit


def explain_http(code: int, body: bytes, model: str = "") -> AIError:
    try:
        err = json.loads(body.decode("utf-8", "replace")).get("error", {})
    except (ValueError, AttributeError):
        err = {}
    status = str(err.get("status") or "")
    msg = str(err.get("message") or "")[:300]
    low = msg.lower()
    if code == 400 and ("api key not valid" in low or "api_key_invalid" in json.dumps(err).lower()):
        return AIError("Khoá Gemini không đúng. Chép lại khoá ở aistudio.google.com/apikey rồi dán lại.", "key")
    if code == 400 and "location is not supported" in low:
        return AIError("Gemini API chưa hỗ trợ khu vực mạng của bạn.", "key")
    if code == 401 and "access_token_type_unsupported" in json.dumps(err).lower():
        # 1.22.2: một số tài khoản bị Google từ chối khoá kiểu mới "AQ." (lỗi phía Google, chưa có cách khác)
        return AIError("Google chưa cho khoá này gọi Gemini API (ACCESS_TOKEN_TYPE_UNSUPPORTED). Xoá khoá cũ ở "
                       "aistudio.google.com/apikey, tạo khoá mới rồi dán lại.", "key")
    if code in (401, 403):
        return AIError("Khoá này không được dùng Gemini API (bị khoá, hết hạn hoặc chưa bật API).", "key")
    if code == 429:
        delay, daily, hit = _retry_delay(err.get("details"))
        when = "ngày mai" if daily else "vài phút nữa"
        return AIError("Hết hạn mức miễn phí của Gemini%s, thử lại %s." % ((" (" + model + ")") if model else "", when),
                       "quota", retry_after=delay, daily=daily, quota_model=hit)
    if code == 404:
        return AIError("Không có model %s (Google vừa đổi tên?). Xoá gemini_model trong Config để tự chọn." % (model or "?"), "model")
    if code >= 500:
        return AIError("Máy chủ Gemini đang bận (%d), thử lại sau." % code, "busy")
    if code == 400 and ("thinking" in low or "thinkinglevel" in low or "thinking_level" in low or "thinkingbudget" in low):
        return AIError("Model không nhận cấu hình suy nghĩ: " + msg, "thinking")
    if code == 400 and ("only be used for tts" in low or "tried to generate text" in low):
        return AIError("Model giọng đọc không đọc được câu này.", "bad")
    if "schema" in low or "response_schema" in low or "responseschema" in low:
        return AIError("Model không nhận khuôn JSON: " + msg, "schema")
    return AIError("Gemini từ chối yêu cầu (%d %s): %s" % (code, status, msg), "bad")


class Gemini:
    """Client nhỏ cho Gemini API. Khoá gửi bằng header x-goog-api-key (không nằm trong URL)."""

    def __init__(self, key: str, base: str | None = None, sleep: Callable[[float], None] = time.sleep,
                 exhausted: Any = None) -> None:
        self.key = clean_key(key)
        self.base = (base or API_BASE).rstrip("/")
        self.sleep = sleep
        self.calls = 0
        self.tokens = 0
        self.no_schema: set[str] = set()     # model không nhận responseSchema
        self.no_thinking: set[str] = set()   # model không nhận thinkingConfig
        self.out_limit: dict[str, int] = {}  # outputTokenLimit theo danh sách model
        # 1.13: model đã hết hạn mức ngày → thời điểm hết chặn (epoch). Nhớ qua trang_thai.json để khỏi gọi lại
        # cho tốn lượt. Google đặt lại hạn mức lúc 0 giờ giờ Thái Bình Dương (15 giờ ở Việt Nam), nên lưu theo giờ,
        # không theo ngày trên máy.
        now = time.time()
        self.exhausted: dict[str, float] = {
            k: float(v) for k, v in (exhausted.items() if isinstance(exhausted, dict) else [])
            if isinstance(k, str) and isinstance(v, (int, float)) and float(v) > now}
        self.versions: dict[str, str] = {}   # tên gọi → modelVersion thật (gemini-3.5-flash → gemini-3.6-flash)
        self.last_usage: dict[str, Any] = {}
        self._ctx: ssl.SSLContext | None = None

    def is_exhausted(self, model: str) -> bool:
        now = time.time()
        return any(self.exhausted.get(m, 0) > now for m in (model, self.versions.get(model, "")) if m)

    def mark_exhausted(self, model: str, retry_after: float | None = None) -> None:
        until = time.time() + retry_after if retry_after and retry_after > 0 else next_reset()
        self.exhausted[model] = max(self.exhausted.get(model, 0), until)

    def exhausted_state(self) -> dict[str, float]:
        now = time.time()
        return {k: round(v) for k, v in self.exhausted.items() if v > now}

    def _request(self, method: str, path: str, body: Any = None, timeout: float = TEXT_TIMEOUT, model: str = "") -> Any:
        url = self.base + path
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            "x-goog-api-key": self.key, "Content-Type": "application/json", "User-Agent": "kotoba-batake-anki-addon"})
        if self._ctx is None and url.startswith("https:"):
            self._ctx = _ssl_context()
        self.calls += 1
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=self._ctx if url.startswith("https:") else None) as r:
                raw = r.read()
        except urllib.error.HTTPError as e:
            err = explain_http(e.code, e.read() if e.fp else b"", model)
            if err.kind == "quota" and err.daily and model:
                self.mark_exhausted(model, err.retry_after)
                if err.quota_model:
                    self.mark_exhausted(err.quota_model, err.retry_after)
            raise err from None
        except (urllib.error.URLError, socket.timeout, ConnectionError, ssl.SSLError, OSError) as e:
            reason = getattr(e, "reason", e)
            if isinstance(reason, (socket.timeout, TimeoutError)) or "timed out" in str(reason):
                raise AIError("Gemini trả lời quá lâu (hết %d giây). Thử lại sau." % int(timeout), "busy") from None
            raise AIError("Không kết nối được tới Gemini (kiểm tra mạng): %s" % str(reason)[:120], "net") from None
        try:
            return json.loads(raw.decode("utf-8"))
        except ValueError:
            raise AIError("Gemini trả về dữ liệu lạ.", "bad") from None

    def _with_retry(self, fn: Callable[[], Any], tries: int = 3) -> Any:
        """Chờ rồi thử lại khi bị giới hạn theo phút (429 có retryDelay ngắn) hoặc máy chủ bận."""
        for attempt in range(tries):
            try:
                return fn()
            except AIError as e:
                last = attempt == tries - 1
                if e.kind == "quota" and not e.daily and e.retry_after is not None and e.retry_after <= 65 and not last:
                    self.sleep(e.retry_after + 1)
                    continue
                if e.kind == "busy" and not last:
                    self.sleep(4 * (attempt + 1))
                    continue
                raise
        raise AIError("Gemini không trả lời.", "busy")

    def models(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        token = ""
        for _ in range(10):
            q = "?pageSize=1000" + ("&pageToken=" + urllib.parse.quote(token) if token else "")
            res = self._with_retry(lambda: self._request("GET", "/models" + q, timeout=30))
            for m in res.get("models", []) if isinstance(res, dict) else []:
                if isinstance(m, dict) and isinstance(m.get("name"), str):
                    out.append(m)
                    if isinstance(m.get("outputTokenLimit"), int) and m["outputTokenLimit"] > 0:
                        self.out_limit[_short(m["name"])] = m["outputTokenLimit"]
            token = res.get("nextPageToken") if isinstance(res, dict) else ""
            if not token:
                break
        return out

    def _exhausted_error(self, model: str) -> AIError:
        return AIError("Hết hạn mức miễn phí của Gemini (%s), thử lại ngày mai." % model, "quota", daily=True)

    def generate(self, model: str, system: str, prompt: str, schema: dict[str, Any] | None = None,
                 temperature: float = 0.7, max_tokens: int = MAX_OUT_TOKENS, thinking: str | None = None) -> str:
        """thinking: None (mặc định của model) / "low" / "medium" / "high". Lượt sửa / soát để "low" / "medium"
        để model không "nghĩ" hết trần token rồi trả bài bị cắt (1.12 gặp: 31.000 token suy nghĩ / 32.768)."""
        if self.is_exhausted(model):
            raise self._exhausted_error(model)
        max_tokens = min(max_tokens, self.out_limit.get(model, max_tokens))
        cfg: dict[str, Any] = {"temperature": temperature, "maxOutputTokens": max_tokens,
                               "responseMimeType": "application/json"}
        if schema is not None and model not in self.no_schema:
            cfg["responseSchema"] = schema
        if thinking and model not in self.no_thinking:
            v = _version(model)
            if 2.5 <= v < 3:
                cfg["thinkingConfig"] = {"thinkingBudget": THINK_BUDGET.get(thinking, 8192)}
            elif v >= 3 or model.endswith("-latest"):
                cfg["thinkingConfig"] = {"thinkingLevel": thinking}
        body = {"systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": cfg}
        path = "/models/%s:generateContent" % urllib.parse.quote(model, safe="-._")
        try:
            res = self._with_retry(lambda: self._request("POST", path, body, model=model))
        except AIError as e:
            if e.kind == "schema" and "responseSchema" in cfg:
                self.no_schema.add(model)        # model cũ / lạ: bỏ khuôn, vẫn yêu cầu JSON và tự kiểm tra
                return self.generate(model, system, prompt, None, temperature, max_tokens, thinking)
            if e.kind == "thinking" and "thinkingConfig" in cfg:
                self.no_thinking.add(model)
                return self.generate(model, system, prompt, schema, temperature, max_tokens, thinking)
            raise
        self._remember(model, res)
        return _response_text(res, max_tokens)

    def _remember(self, model: str, res: Any) -> None:
        if not isinstance(res, dict):
            return
        mv = res.get("modelVersion")
        if isinstance(mv, str) and mv and mv != model:
            self.versions[model] = mv[:80]
        um = res.get("usageMetadata")
        self.last_usage = um if isinstance(um, dict) else {}
        try:
            self.tokens += int(self.last_usage.get("totalTokenCount") or 0)
        except (TypeError, ValueError):
            pass

    def speak(self, model: str, text: str, voice: str) -> tuple[bytes, int]:
        """Giọng đọc → (PCM 16-bit mono, tần số). Model TTS 3.8 trả file WAV (có khối C2PA ở cuối), model cũ
        trả PCM thô "audio/l16; rate=24000": cả hai đều bóc ra đúng mẫu âm thanh (1.12 ghi nhầm cả header)."""
        if self.is_exhausted(model):
            raise self._exhausted_error(model)
        body = {"contents": [{"role": "user", "parts": [{"text": text}]}],
                "generationConfig": {"responseModalities": ["AUDIO"],
                                     "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
        path = "/models/%s:generateContent" % urllib.parse.quote(model, safe="-._")
        res = self._with_retry(lambda: self._request("POST", path, body, timeout=TTS_TIMEOUT, model=model))
        self._remember(model, res)
        for part in _parts(res):
            inline = part.get("inlineData") or part.get("inline_data")
            if isinstance(inline, dict) and inline.get("data"):
                mime = str(inline.get("mimeType") or inline.get("mime_type") or "")
                try:
                    data = base64.b64decode(inline["data"])
                except (ValueError, TypeError):
                    raise AIError("Giọng đọc Gemini hỏng.", "bad") from None
                return decode_audio(data, mime)
        raise AIError("Gemini không trả về giọng đọc.", "bad")


def decode_audio(data: bytes, mime: str = "") -> tuple[bytes, int]:
    """Dữ liệu giọng đọc Gemini → (PCM 16-bit little-endian mono, tần số lấy mẫu)."""
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        try:
            with wave.open(io.BytesIO(data), "rb") as w:
                ch, sw, rate = w.getnchannels(), w.getsampwidth(), w.getframerate()
                frames = w.readframes(w.getnframes())
        except (wave.Error, EOFError) as err:
            raise AIError("Giọng đọc Gemini hỏng (%s)." % err, "bad") from None
        if sw != 2:
            raise AIError("Giọng đọc Gemini có định dạng lạ (%d bit)." % (sw * 8), "bad")
        if ch > 1:                       # trộn về mono
            s = array.array("h", frames)
            if sys.byteorder != "little":
                s.byteswap()
            mono = array.array("h", (sum(s[i:i + ch]) // ch for i in range(0, len(s) - ch + 1, ch)))
            if sys.byteorder != "little":
                mono.byteswap()
            frames = mono.tobytes()
        return frames, rate or 24000
    low = mime.lower()
    if low and not any(x in low for x in ("l16", "pcm", "raw")):
        raise AIError("Giọng đọc Gemini có định dạng lạ (%s)." % mime[:40], "bad")
    m = re.search(r"rate=(\d+)", low)
    if len(data) % 2:
        data = data[:-1]
    return data, int(m.group(1)) if m else 24000


def _parts(res: Any) -> list[dict[str, Any]]:
    if not isinstance(res, dict):
        raise AIError("Gemini trả về dữ liệu lạ.", "bad")
    fb = res.get("promptFeedback") or {}
    if isinstance(fb, dict) and fb.get("blockReason"):
        raise AIError("Gemini chặn yêu cầu (%s)." % fb.get("blockReason"), "blocked")
    cands = res.get("candidates") or []
    if not cands or not isinstance(cands[0], dict):
        raise AIError("Gemini không trả lời gì.", "bad")
    parts = ((cands[0].get("content") or {}).get("parts")) or []
    if not parts:
        reason = cands[0].get("finishReason") or "?"
        raise AIError("Gemini không trả lời gì (%s)." % reason, "blocked" if reason in ("SAFETY", "PROHIBITED_CONTENT") else "bad")
    return [p for p in parts if isinstance(p, dict)]


def _response_text(res: Any, max_tokens: int = MAX_OUT_TOKENS) -> str:
    parts = _parts(res)
    text = "".join(p.get("text", "") for p in parts if isinstance(p.get("text"), str) and not p.get("thought"))
    cand = res["candidates"][0]
    if cand.get("finishReason") == "MAX_TOKENS":
        um = res.get("usageMetadata") if isinstance(res.get("usageMetadata"), dict) else {}
        think = um.get("thoughtsTokenCount") or 0
        if isinstance(think, int) and think > max_tokens * 0.5:
            raise AIError("Gemini \"suy nghĩ\" quá lâu (%d token) nên chưa kịp viết xong, sẽ thử lại / đổi model." % think,
                          "format")
        raise AIError("Bài Gemini viết bị cắt giữa chừng (hết giới hạn token).", "format")
    if not text.strip():
        raise AIError("Gemini trả lời rỗng.", "bad")
    return text


# ---------------------------------------------------------------------------
# Chọn model (tên model của Google đổi luôn → hỏi danh sách rồi tự chọn)
# ---------------------------------------------------------------------------

_SKIP_TEXT = ("tts", "image", "live", "audio", "embedding", "vision", "learnlm", "robotics", "computer",
              "native", "aqa", "veo", "imagen", "nano", "banana", "omni", "deep-research", "gemma")


def _version(name: str) -> float:
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    return float(m.group(1)) if m else 0.0


def _short(name: str) -> str:
    return name.split("/")[-1]


def order_models(names: list[str], client: "Gemini | None" = None, prefer: Any = None,
                 limit: int = MAX_MODELS) -> list[str]:
    """Thứ tự thử: model đã chạy được lần trước → còn lại theo danh sách; bỏ model đã hết hạn mức hôm nay
    (kể cả tên gọi tắt trỏ sang model đã hết, vd. gemini-3.5-flash → gemini-3.6-flash)."""
    out = list(names)
    for p in reversed([x for x in (prefer if isinstance(prefer, list) else [prefer]) if isinstance(x, str) and x]):
        if p in out:
            out.remove(p)
            out.insert(0, p)
    if client is not None:
        out = [n for n in out if not client.is_exhausted(n)]
    return out[:limit]


def text_models(models: list[dict[str, Any]]) -> list[str]:
    """Model viết chữ, thứ tự thử: Flash mới nhất → Flash cũ hơn → Flash-Lite (hạn mức miễn phí rộng hơn) → Pro."""
    rows = []
    for m in models:
        n = _short(m.get("name", ""))
        if not n.startswith("gemini") or "generateContent" not in (m.get("supportedGenerationMethods") or []):
            continue
        if any(x in n for x in _SKIP_TEXT):
            continue
        lite = "lite" in n
        flash = "flash" in n
        pro = "pro" in n
        if not (flash or pro):
            continue
        group = 0 if (flash and not lite) else 1 if lite else 2
        latest = n.endswith("-latest")
        unstable = bool(re.search(r"preview|exp|\d{2}-\d{2}$", n))
        rows.append((group, 0 if latest else 1, -_version(n), 1 if unstable else 0, n))
    rows.sort()
    out: list[str] = []
    for r in rows:
        if r[-1] not in out:
            out.append(r[-1])
    return out


def tts_models(models: list[dict[str, Any]]) -> list[str]:
    rows = []
    for m in models:
        n = _short(m.get("name", ""))
        if "tts" not in n or "generateContent" not in (m.get("supportedGenerationMethods") or []):
            continue
        rows.append((0 if "flash" in n and "lite" not in n else 1 if "lite" in n else 2, -_version(n), n))
    rows.sort()
    return [r[-1] for r in rows]


def test_key(client: Gemini, prefer: Any = None) -> dict[str, Any]:
    """Thử khoá: hỏi danh sách model, gọi thử một câu rất ngắn. Trả về model sẽ dùng (Job dùng lại model này)."""
    models = client.models()
    texts, voices = text_models(models), tts_models(models)
    if not texts:
        raise AIError("Khoá đúng nhưng không thấy model Gemini nào viết được chữ.", "model")
    last: AIError | None = None
    order = order_models(texts, client, prefer)
    for name in order:
        try:
            out = client.generate(name, "Trả lời bằng JSON.", 'Trả về đúng {"ok": true}.',
                                  {"type": "OBJECT", "properties": {"ok": {"type": "BOOLEAN"}}, "required": ["ok"]},
                                  temperature=0, max_tokens=8192, thinking="low")
            parse_json(out)
            return {"model": name, "models": texts[:MAX_MODELS], "tts": voices[:4], "calls": client.calls}
        except AIError as e:
            if e.kind == "key":
                raise
            last = e
    if not order:
        raise AIError("Mọi model Gemini của khoá này đã hết hạn mức miễn phí hôm nay, thử lại ngày mai.", "quota",
                      daily=True)
    raise last or AIError("Không gọi được model nào.", "model")


# ---------------------------------------------------------------------------
# Phạm vi đã học (từ deck hoặc từ pham_vi.json của kotoba_daily)
# ---------------------------------------------------------------------------

# Mẫu ngữ pháp JLPT phổ biến (danh sách chung tự soạn, không lấy từ giáo trình nào).
# Dùng khi deck không có note ngữ pháp: Gemini chỉ được dùng ngữ pháp tới trình độ đã chọn.
GRAMMAR_TEXT = """
N5|〜は〜です / 〜じゃありません|A là B / A không phải là B
N5|〜も|cũng
N5|〜の|của, thuộc về
N5|これ・それ・あれ・どれ|cái này / đó / kia / nào
N5|〜ます / 〜ません / 〜ました / 〜ませんでした|thể lịch sự hiện tại, quá khứ
N5|〜を V|tân ngữ của động từ
N5|〜へ / 〜に 行きます|đi đến đâu
N5|〜で（場所・手段）|ở (nơi chốn), bằng (phương tiện)
N5|〜と|và, cùng với
N5|〜に（時間）|vào lúc
N5|〜から〜まで|từ … đến …
N5|〜があります / 〜がいます|có (đồ vật / người, con vật)
N5|〜ませんか|rủ rê: … không?
N5|〜ましょう|nào cùng …
N5|〜たいです|muốn làm
N5|〜がほしいです|muốn có
N5|い形容詞 / な形容詞|tính từ đuôi い / な
N5|〜くて / 〜で（形容詞）|nối tính từ: … và …
N5|〜が好きです / 上手です|thích / giỏi
N5|〜から（理由）|vì …
N5|〜てください|hãy làm …
N5|〜ています（進行）|đang làm
N5|〜てもいいです|làm … cũng được
N5|〜てはいけません|không được làm
N5|〜て、〜（順序）|làm … rồi …
N5|〜ないでください|xin đừng làm
N5|〜なければなりません|phải làm
N5|〜なくてもいいです|không làm cũng được
N5|〜たことがあります|đã từng làm
N5|〜たり〜たりします|lúc thì … lúc thì …
N5|〜より〜のほうが|… hơn …
N5|〜の中で〜がいちばん|trong … thì … nhất
N5|〜前に / 〜てから|trước khi / sau khi
N5|〜でしょう|có lẽ
N5|〜く / 〜になります|trở nên
N4|普通形（だ・である体の会話）|thể thông thường trong hội thoại thân mật
N4|〜と思います|tôi nghĩ là
N4|〜と言いました|đã nói là
N4|〜つもりです|định làm
N4|〜予定です|dự định
N4|〜ことができます / 可能形|có thể làm
N4|〜ことです（趣味）|sở thích là …
N4|〜とき|khi …
N4|〜と（条件）|hễ … thì …
N4|〜たら|nếu / sau khi … thì
N4|〜ば|nếu …
N4|〜なら|nếu là … thì
N4|〜ても|dù … cũng
N4|〜ながら|vừa … vừa …
N4|〜てしまいました|lỡ / làm xong mất
N4|〜ておきます|làm sẵn
N4|〜てあります|đã được làm sẵn (trạng thái)
N4|〜てみます|thử làm
N4|〜てあげます / 〜てくれます / 〜てもらいます|làm cho / được làm cho
N4|〜ようと思います（意向形）|định làm
N4|〜そうです（様態）|trông có vẻ
N4|〜そうです（伝聞）|nghe nói
N4|〜ようです / 〜みたいです|hình như
N4|〜かもしれません|có lẽ, không chừng
N4|〜はずです|chắc chắn là
N4|〜のに|thế mà
N4|〜ので|vì … nên
N4|〜し、〜し|vừa … lại vừa …
N4|〜ために|để …, vì …
N4|〜ように（目的）|để có thể …
N4|〜ようになります|trở nên có thể
N4|〜ようにしています|cố gắng làm (thói quen)
N4|〜すぎます|quá …
N4|〜やすい / 〜にくい|dễ / khó làm
N4|〜か（間接疑問）/ 〜かどうか|có … hay không
N4|受身形 〜られます|thể bị động
N4|使役形 〜させます|thể sai khiến
N4|〜させてください / 〜させていただけませんか|xin cho phép tôi làm
N4|〜なさい|hãy làm (mệnh lệnh nhẹ)
N4|お〜になります / 〜られます（尊敬）|tôn kính ngữ (hành động của người khác)
N4|お〜ください|xin mời (tôn kính)
N4|お〜します / ご〜します（謙譲）|khiêm nhường ngữ (hành động của mình)
N4|いらっしゃる・おっしゃる・召し上がる|động từ tôn kính đặc biệt
N4|まいる・申す・いただく・拝見する|động từ khiêm nhường đặc biệt
N4|〜ところです|đúng lúc sắp / đang / vừa
N4|〜ばかりです|vừa mới
N4|〜までに|trước (hạn)
N4|〜場合は|trong trường hợp
N3|〜ことにします / 〜ことになりました|quyết định / được quyết định
N3|〜ようにします / 〜ようにしてください|cố gắng / hãy cố gắng
N3|〜わけです / 〜わけではありません|thì ra là / không hẳn là
N3|〜はずがありません|không lẽ nào
N3|〜ことがあります|thỉnh thoảng có khi
N3|〜ばかり|toàn là
N3|〜さえ|ngay cả
N3|〜によって|tuỳ theo, do
N3|〜について / 〜に対して|về / đối với
N3|〜として|với tư cách
N3|〜うちに|trong lúc còn
N3|〜間に|trong khoảng
N3|〜たびに|mỗi lần
N3|〜ほど|đến mức
N3|〜くらい / 〜ぐらい|khoảng, đến mức
N3|〜らしい|có vẻ, đúng kiểu
N3|〜っぽい|có vẻ, hay
N3|〜ように見えます|trông như
N3|〜おかげで / 〜せいで|nhờ / tại vì
N3|〜ことになっています|theo quy định
N3|〜ても構いません|cũng không sao
N3|〜っけ|nhỉ (hỏi lại)
N3|〜ところに / 〜ところへ|đúng lúc
N3|〜ずに|không làm mà
N3|〜ばいい|nên làm, giá mà
N3|〜てほしい|muốn ai làm
N3|〜させられる（使役受身）|bị bắt làm
N3|〜ことはない|không cần phải
N3|〜わりに|so với … thì
N3|〜一方で|mặt khác
N3|〜とおりに|theo như
"""


def builtin_grammar(level: str) -> list[dict[str, str]]:
    """Mẫu ngữ pháp tới trình độ `level` (N4 = N5 + N4). N2 / N1: dùng hết danh sách."""
    upto = {"N5": 1, "N4": 2, "N3": 3, "N2": 3, "N1": 3}.get(level, 1)
    order = {"N5": 1, "N4": 2, "N3": 3}
    out, count = [], {}
    for line in GRAMMAR_TEXT.strip().splitlines():
        lv, mau, nghia = line.split("|")
        count[lv] = count.get(lv, 0) + 1
        if order[lv] <= upto:
            out.append({"id": "jlpt:%s-%02d" % (lv, count[lv]), "mau": mau, "nghia": nghia, "bai": "JLPT " + lv})
    return out


_TAG_RE = re.compile(r"<[^>]*>")
_MARK_CHARS = re.compile(r"[\[\]{}|]")
JP_CHAR_RE = re.compile(r"[\u3041-\u30ff\u3400-\u9fff]")


def _plain(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    s = _TAG_RE.sub(" ", value).replace("&nbsp;", " ").replace("&amp;", "&")
    s = _MARK_CHARS.sub("", s)
    return re.sub(r"\s+", " ", s).strip()[:limit]


def _kana_reading(value: Any) -> str:
    """Cách đọc lấy từ deck: chỉ dùng khi là kana thuần (bỏ furigana kiểu Anki, khoảng trắng)."""
    if not isinstance(value, str):
        return ""
    s = _TAG_RE.sub("", value)
    s = re.sub(r"[\s\u3000]", "", s)
    if "[" in s:          # 食[た]べる → lấy phần trong ngoặc + kana ngoài ngoặc thì phức tạp → bỏ
        return ""
    return s if s and DECK_READ_RE.match(s) else ""


# cách đọc trong đánh dấu furigana: chỉ kana; cách đọc lấy từ deck: cho phép thêm dấu tách nhiều cách đọc
KANA_ONLY_RE = re.compile(r"^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc\u30fd\u30fe〜～・]+$")
DECK_READ_RE = re.compile(r"^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc\u30fd\u30fe〜～・/／、,]+$")


def scope_from_plants(plants: list[dict[str, Any]], level: str, max_words: int = 1200) -> dict[str, Any]:
    """Phạm vi từ cây của deck đang xem (đã có từ / cách đọc / nghĩa / loại note)."""
    level = level if level in LEVELS else "N5"
    studied, fresh, grammar, focus, weak = [], [], [], [], []
    seen: set[str] = set()
    for p in plants:
        word = _plain(p.get("word"), 40)
        if not word or not JP_CHAR_RE.search(word):
            continue
        kind = p.get("kind") or "vocab"
        meaning = _plain(p.get("meaning"), 120)
        if kind == "grammar":
            if meaning:
                grammar.append({"id": "deck:%s" % p.get("nid"), "mau": word, "nghia": meaning, "bai": "deck"})
            continue
        if kind not in ("vocab",) or not meaning:
            continue
        key = paper.norm_key(word)
        if key in seen:
            continue
        seen.add(key)
        row = [word, _kana_reading(p.get("reading")), meaning, "deck"]
        learned = (p.get("stage") or 0) >= 1 or p.get("stability") is not None
        (studied if learned else fresh).append(row)
        if learned and (p.get("wilted") or p.get("thirsty")):
            weak.append(word)
        elif learned and (p.get("stage") or 0) == 1:
            focus.append(word)
    vocab = studied[:max_words]
    if len(vocab) < 30:              # mới bắt đầu học: cho dùng cả từ chưa ôn
        vocab += fresh[:max(0, 200 - len(vocab))]
    if not grammar:
        grammar = builtin_grammar(level)
    return {
        "nguon": "deck", "trinh_do": level, "nen_tang": "N5",
        "tu_vung": vocab, "ngu_phap": grammar,
        "trong_tam": {"tu": (weak[:6] + focus)[:24], "ngu_phap": []},
        "sap_quen": weak[:12], "loi_sai": [], "sach": {"deck": "deck đang học"},
        "so_tu_da_hoc": len(studied),
    }


def kho_ok(item: dict[str, Any]) -> bool:
    """1.19.1: note dùng được cho kho từ của báo tiếng Nhật (từ có chữ Nhật)."""
    return bool(JP_CHAR_RE.search(_plain(item.get("word"), 40)))


def scope_from_pick(pk: dict[str, Any], level: str) -> dict[str, Any]:
    """1.19.1: phạm vi từ words_core.pick — kho ≤ 100 từ cho lời nhắc, mọi từ đã học để kiểm tra / tra nghĩa."""
    level = level if level in LEVELS else "N5"

    def row(it: dict[str, Any]) -> list[str] | None:
        word = _plain(it.get("word"), 40)
        meaning = _plain(it.get("meaning"), 120)
        if not word or not meaning or not JP_CHAR_RE.search(word):
            return None
        return [word, _kana_reading(it.get("reading")), meaning, "deck"]

    kho, due = [], []
    for it in pk.get("kho", []):
        r = row(it)
        if r:
            kho.append(r)
            if it.get("due"):
                due.append(r[0])
    vocab, seen = [], set()
    for it in list(pk.get("kho", [])) + list(pk.get("all", [])):
        r = row(it)
        if r and paper.norm_key(r[0]) not in seen:
            seen.add(paper.norm_key(r[0]))
            vocab.append(r)
    grammar = [{"id": "deck:%s" % it.get("nid"), "mau": _plain(it.get("word"), 200), "nghia": _plain(it.get("meaning"), 200),
                "bai": "deck"} for it in pk.get("grammar", []) if _plain(it.get("word"), 200) and _plain(it.get("meaning"), 200)]
    if not grammar:
        grammar = builtin_grammar(level)
    decks = [d for d in pk.get("decks", []) if isinstance(d, str)]
    return {
        "nguon": "deck", "trinh_do": level, "nen_tang": "N5",
        "tu_vung": vocab, "kho": kho, "ngu_phap": grammar,
        "trong_tam": {"tu": due[:FOCUS_WORDS], "ngu_phap": []}, "can_on": due,
        "sap_quen": [], "loi_sai": [], "sach": {"deck": ", ".join(decks) if decks else "mọi deck"},
        "decks": decks, "so_tu_da_hoc": int(pk.get("n_learned") or len(vocab)),
    }


FOCUS_WORDS = 20      # 1.19.1: số từ trọng tâm dặn Gemini (trong nhóm từ phải ôn hôm nay)


def focus_used(raw: Any, scope: dict[str, Any]) -> list[int]:
    """[số từ phải ôn có trong bài, số từ phải ôn trong kho] — đếm theo {..|..|từ gốc} (đã gồm máy nối)."""
    due = {paper.norm_key(w) for w in scope.get("can_on", [])}
    if not isinstance(raw, dict) or not due:
        return [0, len(due)]
    used = {paper.norm_key(k) for t in _all_jp(raw) for k in paper.keys(t)}
    return [len(used & due), len(due)]


def scope_from_pham_vi(raw: Any) -> dict[str, Any] | None:
    """Dùng pham_vi.json của bộ kotoba_daily (phạm vi theo giáo trình, chính xác hơn deck)."""
    if not isinstance(raw, dict) or not isinstance(raw.get("tu_vung"), list):
        return None
    vocab = []
    for row in raw["tu_vung"][:5000]:
        if isinstance(row, list) and len(row) >= 3 and all(isinstance(x, str) for x in row[:3]):
            vocab.append([_plain(row[0], 40), _kana_reading(row[1]), _plain(row[2], 120),
                          _plain(row[3], 60) if len(row) > 3 and isinstance(row[3], str) else ""])
    vocab = [v for v in vocab if v[0]]
    grammar = []
    for g in raw.get("ngu_phap", [])[:3000] if isinstance(raw.get("ngu_phap"), list) else []:
        if isinstance(g, dict) and isinstance(g.get("id"), str):
            grammar.append({"id": g["id"][:80], "mau": _plain(g.get("mau"), 200), "nghia": _plain(g.get("nghia"), 200),
                            "bai": _plain(g.get("bai"), 60)})
    if not vocab:
        return None
    focus_words, focus_grammar = [], []
    for f in raw.get("trong_tam", []) if isinstance(raw.get("trong_tam"), list) else []:
        if isinstance(f, dict):
            focus_words += [w for w in f.get("tu_vung", []) if isinstance(w, str)]
            focus_grammar += [g for g in f.get("ngu_phap", []) if isinstance(g, str)]
    level = raw.get("trinh_do") if raw.get("trinh_do") in LEVELS else "N4"
    td = raw.get("tien_do") if isinstance(raw.get("tien_do"), dict) else {}
    sach = raw.get("sach") if isinstance(raw.get("sach"), dict) else {}
    return {
        "nguon": "kotoba_daily", "trinh_do": level,
        "nen_tang": raw.get("nen_tang") if raw.get("nen_tang") in LEVELS else "N5",
        "tu_vung": vocab, "ngu_phap": grammar,
        "trong_tam": {"tu": focus_words[-60:], "ngu_phap": focus_grammar[-40:]},
        "sap_quen": [w for w in td.get("sap_quen", []) if isinstance(w, str)][:12],
        "loi_sai": [w for w in td.get("loi_sai", []) if isinstance(w, str)][:12],
        "sach": {k: _plain(v, 60) for k, v in sach.items() if isinstance(k, str) and isinstance(v, str)},
        "so_tu_da_hoc": len(vocab),
    }


def describe_scope(scope: dict[str, Any]) -> str:
    if scope.get("nguon") == "kotoba_daily":
        return "%d từ, %d mẫu câu · trình độ %s · theo giáo trình (kotoba_daily)" % (
            len(scope.get("tu_vung", [])), len(scope.get("ngu_phap", [])), scope.get("trinh_do", "?"))
    decks = scope.get("decks") or []
    src = ("deck " + ", ".join(decks)) if decks else "mọi deck"
    kho = scope.get("kho")
    if kho is None:
        return "%d từ · trình độ %s · %s" % (len(scope.get("tu_vung", [])), scope.get("trinh_do", "?"), src)
    return "%d từ (%d từ phải ôn) · trình độ %s · %s" % (
        len(kho), len(scope.get("can_on", [])), scope.get("trinh_do", "?"), src)


# ---------------------------------------------------------------------------
# Kiểm tra bằng máy
# ---------------------------------------------------------------------------

# chữ Latin (romaji, tiếng Anh, tiếng Việt có dấu) và chữ Latin toàn khổ
LATIN_RE = re.compile(r"[A-Za-z\u00c0-\u024f\u1e00-\u1eff\uff21-\uff3a\uff41-\uff5a]+")
VI_LETTER_RE = re.compile(r"[A-Za-zÀ-ỹĐđ]")
HANGUL_RE = re.compile(r"[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]")
# chữ Hán có trong bộ mã Nhật (cp932) nhưng thật ra là chữ giản thể / dị thể gần như không dùng ở Nhật
SIMPLIFIED_IN_JIS = set("从气几坏广无网价儿决况听挂梦烟窗")
JOYO_OUTSIDE_CP932 = set("𠮟剝頰塡")
ALLOWED_JP = re.compile(
    r"[\u3000-\u303f\u3041-\u3096\u3099-\u309f\u30a0-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff"
    r"\uff01-\uff20\uff3b-\uff40\uff5b-\uff65\uff10-\uff19"
    r"0-9 !?.,:;%~\-()/+&\"'…‥・〜～◆◇■□●○◎★☆♪→←↑↓※〒℃°×÷＝\[\]{}|\U00020000-\U0002ffff]")
SPECIAL_DAY = {1: "ついたち", 2: "ふつか", 3: "みっか", 4: "よっか", 5: "いつか", 6: "むいか", 7: "なのか",
               8: "ようか", 9: "ここのか", 10: "とおか", 14: "じゅうよっか", 20: "はつか", 24: "にじゅうよっか"}
SPECIAL_PEOPLE = {1: "ひとり", 2: "ふたり"}


def _bad_kanji(text: str) -> list[str]:
    out = []
    for ch in paper.KANJI_RE.findall(text) + re.findall(r"[\U00020000-\U0002ffff]", text):
        if ch in SIMPLIFIED_IN_JIS:
            out.append(ch)
            continue
        if ch in JOYO_OUTSIDE_CP932 or ch in "々〆":
            continue
        try:
            ch.encode("cp932")
        except UnicodeEncodeError:
            out.append(ch)
    return list(dict.fromkeys(out))


def _subseq(small: str, big: str) -> bool:
    it = iter(big)
    return all(c in it for c in small)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, where: str, msg: str) -> None:
        self.errors.append("%s: %s" % (where, msg))

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append("%s: %s" % (where, msg))


def _deck_readings(scope: dict[str, Any]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for row in scope.get("tu_vung", []):
        w, r = row[0], row[1]
        if not w or not r or not paper.KANJI_RE.search(w):
            continue
        rs = {paper.to_hira(x) for x in re.split(r"[/／、,・]", r) if x}
        out.setdefault(w, set()).update(rs)
    return out


def check_jp(rep: Report, where: str, text: Any, ctx: dict[str, Any]) -> None:
    """Một chuỗi tiếng Nhật có đánh dấu furigana."""
    if not isinstance(text, str) or not text.strip():
        rep.err(where, "phải là chuỗi tiếng Nhật không rỗng")
        return
    toks = paper.tokenize(text)
    for i, t in enumerate(toks):
        if t[0] == "plain":
            s = t[1]
            bad = sorted(set(s) & set("{}[]|"))
            if bad:
                rep.err(where, "ký tự đánh dấu bị lẻ %s gần: …%s…" % ("".join(bad), s[:20]))
            kj = paper.KANJI_RE.findall(s)
            if kj:
                rep.err(where, "chữ Hán thiếu furigana: %s (trong: …%s…)" % ("".join(dict.fromkeys(kj)), s[:24]))
            m = re.match(r".*?(\d+)$", s)
            nxt = toks[i + 1] if i + 1 < len(toks) else None
            if m and nxt and nxt[0] in ("ruby", "word"):
                n = int(m.group(1))
                nr = paper.to_hira(nxt[2] or "")
                decimal = s.endswith("." + m.group(1))
                if nxt[1][:1] == "日" and nr.startswith("にち") and n in SPECIAL_DAY and not decimal:
                    if n == 1:      # 1日: ついたち (mùng 1) hay いちにち (một ngày) — tuỳ nghĩa, để bước soát xem
                        rep.warn(where, "1日 là ngày mùng 1 thì viết [1日|ついたち], là \"một ngày\" thì [1日|いちにち]")
                    else:
                        rep.err(where, "%s日 đọc đặc biệt, phải viết [%d日|%s]" % (n, n, SPECIAL_DAY[n]))
                if nxt[1][:1] == "人" and nr.startswith("にん") and n in SPECIAL_PEOPLE and not decimal:
                    rep.err(where, "%s人 đọc đặc biệt, phải viết [%d人|%s]" % (n, n, SPECIAL_PEOPLE[n]))
            continue
        surf, read = t[1], t[2]
        if not surf:
            rep.err(where, "đánh dấu có mặt chữ rỗng")
            continue
        if any(c in surf for c in "{}[]|"):
            rep.err(where, "đánh dấu lồng nhau: %s" % surf)
        if read and not paper.KANJI_RE.search(surf) and t[0] == "ruby":
            rep.warn(where, "[%s|%s] không có chữ Hán, không cần furigana" % (surf, read))
        if read and not KANA_ONLY_RE.match(read):
            rep.err(where, "cách đọc phải là kana (không romaji, không chữ Hán): %s|%s" % (surf, read))
            continue
        if paper.KANJI_RE.search(surf) and not read:
            rep.err(where, "chữ Hán thiếu cách đọc: %s" % surf)
            continue
        if not read:
            continue
        hira = paper.to_hira(read)
        kana_in = paper.to_hira("".join(c for c in surf if "\u3041" <= c <= "\u30ff"))
        if kana_in and not _subseq(kana_in.replace("ー", ""), hira):
            rep.err(where, "cách đọc %s không khớp phần kana trong %s" % (read, surf))
        n_kanji = len(paper.KANJI_RE.findall(surf))
        digits = re.findall(r"\d", surf)
        rest = len(hira) - len(kana_in)
        if n_kanji and (rest < n_kanji - 1 or rest > 5 * n_kanji + 4 * len(digits) + 1):
            rep.err(where, "cách đọc %s có độ dài lạ cho %s" % (read, surf))
        md = re.match(r"^(\d+)(日|人)$", surf)
        if md:
            n, unit = int(md.group(1)), md.group(2)
            table = SPECIAL_DAY if unit == "日" else SPECIAL_PEOPLE
            if n == 1 and unit == "日":
                if hira not in ("ついたち", "いちにち"):
                    rep.err(where, "1日 đọc là ついたち (mùng 1) hoặc いちにち (một ngày)")
            elif n in table and hira != table[n]:
                rep.err(where, "%s phải đọc là %s" % (surf, table[n]))
        if t[0] == "word" and not t[3].strip():
            rep.err(where, "thiếu từ gốc trong {%s|%s|}" % (surf, read))
        # cách đọc so với cách đọc trong deck / giáo trình
        want = ctx["readings"].get(surf) if len(surf) >= 2 else None    # chữ đơn (月, 日, 人…) nhiều cách đọc
        if want and hira not in want:
            rep.err(where, "%s đọc là %s (theo deck), không phải %s" % (surf, "/".join(sorted(want)), read))
        if t[0] == "word" and t[3] and t[3] != surf and t[3].startswith(surf):
            want2 = ctx["readings"].get(t[3])
            tail = t[3][len(surf):]
            if want2 and KANA_ONLY_RE.match(tail) and t[3] not in ("来る", "来ます") \
                    and not any(w.startswith(hira) for w in want2):
                rep.err(where, "%s (trong %s) đọc là %s…, không phải %s" % (surf, t[3], "/".join(sorted(want2)), read))
    surface = paper.surface(text)
    lat = LATIN_RE.findall(surface)
    acr = [x for x in lat if re.match(r"^[A-Z]{2,5}$", x)]         # NHK, JR, SNS: người Nhật vẫn viết vậy
    lat = [x for x in lat if x not in acr]
    if acr:
        rep.warn(where, "có chữ viết tắt Latin %s, người học có thể chưa đọc được" % " ".join(dict.fromkeys(acr)))
    if lat:
        rep.err(where, 'có chữ Latin (romaji / tiếng Anh / tiếng Việt) "%s" — viết bằng kana hoặc chữ Hán'
                % " ".join(dict.fromkeys(lat))[:40])
    if HANGUL_RE.search(surface):
        rep.err(where, "có chữ Hàn")
    odd = sorted({c for c in surface if not ALLOWED_JP.match(c) and not LATIN_RE.match(c)})
    if odd:
        rep.err(where, "có ký tự lạ %s (tiếng Việt / ký hiệu không dùng trong báo tiếng Nhật)" % "".join(odd[:8]))
    bad = _bad_kanji(surface)
    if bad:
        rep.err(where, "chữ Hán %s không dùng trong tiếng Nhật (có thể là chữ Trung giản thể)" % "".join(bad))
    if not re.search(r"[\u3041-\u30ff]", surface) and len(surface) > 6:
        rep.err(where, "câu không có kana nào (có phải tiếng Trung?)")
    for k in paper.keys(text):
        nk = paper.norm_key(k)
        ctx["used"].add(nk)
        if nk not in ctx["scope"] and nk not in ctx["new"]:
            rep.err(where, '"%s" không có trong phạm vi đã học; khai báo trong tu_moi hoặc đổi thành [..|..]' % k)


def check_vi(rep: Report, where: str, text: Any, required: bool = True) -> None:
    if not isinstance(text, str) or not text.strip():
        if required:
            rep.err(where, "cần một câu tiếng Việt")
        return
    if not VI_LETTER_RE.search(text):
        rep.err(where, "phải viết bằng tiếng Việt")
    if any(c in text for c in "{}|"):
        rep.err(where, "phần tiếng Việt không dùng ký tự đánh dấu { } |")


def check(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> Report:
    """Kiểm tra một số báo (dạng dict Gemini trả về). Lỗi = phải sửa, cảnh báo = gợi ý cho bước soát."""
    rep = Report()
    if not isinstance(raw, dict):
        rep.err("bao", "phải là một object JSON")
        return rep
    scope_keys = {paper.norm_key(v[0]) for v in scope.get("tu_vung", [])}
    grammar_ids = {g["id"] for g in scope.get("ngu_phap", [])}
    max_new = int(opts.get("max_new", 3))
    short = bool(opts.get("short"))
    new_words: dict[str, Any] = {}
    tm = raw.get("tu_moi", [])
    if not isinstance(tm, list):
        rep.err("tu_moi", "phải là danh sách")
        tm = []
    if len(tm) > max_new:
        rep.err("tu_moi", "có %d từ mới, tối đa %d" % (len(tm), max_new))
    for i, w in enumerate(tm):
        where = "tu_moi[%d]" % i
        if not isinstance(w, dict) or not isinstance(w.get("w"), str) or not w.get("w", "").strip():
            rep.err(where, "cần có w (từ) và m (nghĩa tiếng Việt)")
            continue
        r = w.get("r", "")
        if paper.KANJI_RE.search(w["w"]) and not (isinstance(r, str) and r.strip()):
            rep.err(where, "cần cách đọc r")
        if isinstance(r, str) and r and not KANA_ONLY_RE.match(r):
            rep.err(where, "r phải là kana")
        check_vi(rep, where + ".m", w.get("m"))
        if LATIN_RE.search(w["w"]):
            rep.err(where, "từ mới không được có romaji")
        nk = paper.norm_key(w["w"])
        if nk in scope_keys:
            rep.warn(where, '"%s" đã có trong phạm vi, không phải từ mới' % w["w"])
        new_words[nk] = w
    ctx = {"scope": scope_keys, "new": new_words, "used": set(), "readings": _deck_readings(scope)}

    bai = raw.get("bai")
    lo_n, hi_n = (1, 2) if short else (2, 4) if opts.get("no_story") else (3, 5)   # 1.13: số thường đủ 3 bài; 1.23: tắt truyện → 2
    if not isinstance(bai, list) or not lo_n <= len(bai) <= hi_n:
        rep.err("bai", "cần %d–%d bài" % (lo_n, hi_n))
        bai = bai if isinstance(bai, list) else []
    total = 0
    story_seen = False
    for i, b in enumerate(bai):
        where = "bai[%d]" % i
        if not isinstance(b, dict):
            rep.err(where, "phải là object")
            continue
        if b.get("loai") not in LOAI_AI:
            rep.err(where + ".loai", "phải là một trong %s" % ", ".join(LOAI_AI))
        if b.get("loai") == "truyen":
            story_seen = True
            if short:
                rep.err(where, "số rút gọn không viết tiếp truyện")
            ky = b.get("ky")
            if not isinstance(ky, int) or isinstance(ky, bool) or ky < 1:
                rep.err(where + ".ky", "truyện cần số kỳ (số nguyên ≥ 1)")
            elif opts.get("ky") and ky != opts["ky"]:
                rep.err(where + ".ky", "kỳ này phải là kỳ %d" % opts["ky"])
            if isinstance(ky, int) and ky > 1:
                check_vi(rep, where + ".ky_truoc", b.get("ky_truoc"))
        check_jp(rep, where + ".tieu_de", b.get("tieu_de"), ctx)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        if len(doan) > 6:
            rep.err(where + ".doan", "nhiều đoạn quá (tối đa 6)")
        for j, p in enumerate(doan):
            check_jp(rep, "%s.doan[%d]" % (where, j), p, ctx)
            if isinstance(p, str):
                total += len(paper.surface(p))
                if len(p) > 1400:
                    rep.err("%s.doan[%d]" % (where, j), "đoạn dài quá")
    if not short and opts.get("ky") and not story_seen:
        rep.err("bai", "thiếu bài truyện dài kỳ (loai \"truyen\", kỳ %d)" % opts["ky"])
    plain = opts.get("story_plain")
    if plain and story_seen and not short:      # 1.23: truyện đã viết + biên tập sẵn → bài truyện phải chép đúng
        sb = next(b for b in bai if isinstance(b, dict) and b.get("loai") == "truyen")
        if story_core.story_matches(sb.get("doan") or [], plain["doan"]) < 0.9:
            rep.err("bai[truyen]", "bài truyện phải chép NGUYÊN VĂN truyện đã viết sẵn (chỉ thêm đánh dấu furigana, không sửa "
                    "chữ, không thêm bớt câu):\n" + json.dumps({"tieu_de": plain["tieu_de"], "doan": plain["doan"]},
                                                             ensure_ascii=False))
    lo, hi = LENGTH.get(scope.get("trinh_do", "N4"), (280, 700))
    if short:
        lo, hi = lo // 3, hi // 2
    if total and total < lo * 0.6:
        rep.err("bai", "báo ngắn quá (%d ký tự), cần khoảng %d–%d" % (total, lo, hi))
    elif total > hi * 1.4:
        rep.err("bai", "báo dài quá (%d ký tự), cần khoảng %d–%d" % (total, lo, hi))
    elif total and not lo <= total <= hi:
        rep.warn("bai", "tổng %d ký tự, nên trong khoảng %d–%d" % (total, lo, hi))

    qs = raw.get("cau_hoi")
    want_q = (0, 1) if short else (2, 3)
    if not isinstance(qs, list) or not want_q[0] <= len(qs) <= want_q[1] + 1:
        rep.err("cau_hoi", "cần %d–%d câu hỏi" % want_q)
        qs = qs if isinstance(qs, list) else []
    for i, q in enumerate(qs):
        where = "cau_hoi[%d]" % i
        if not isinstance(q, dict):
            rep.err(where, "phải là object")
            continue
        check_jp(rep, where + ".hoi", q.get("hoi"), ctx)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 3 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_jp(rep, "%s.chon[%d]" % (where, j), o, ctx)
        norm = [paper.norm_answer(paper.surface(o)) for o in chon if isinstance(o, str)]
        if len(set(norm)) != len(norm):
            rep.err(where + ".chon", "có hai lựa chọn giống nhau")
        d = q.get("dung")
        if isinstance(d, bool) or not isinstance(d, int) or not 0 <= d < len(chon):
            rep.err(where + ".dung", "phải là vị trí (tính từ 0) của đáp án đúng")
        check_vi(rep, where + ".giai_thich", q.get("giai_thich"))
    if len(qs) >= 2 and len({q.get("dung") for q in qs if isinstance(q, dict)}) == 1:
        rep.warn("cau_hoi", "mọi câu đều có đáp án ở cùng một vị trí")

    ct = raw.get("chinh_ta")
    if not isinstance(ct, list) or not (1 if short else 2) <= len(ct) <= 4:
        rep.err("chinh_ta", "cần 2–3 câu chép chính tả")
        ct = ct if isinstance(ct, list) else []
    all_text = paper.norm_answer("".join(paper.surface(p) for b in bai if isinstance(b, dict)
                                         for p in (b.get("doan") or []) if isinstance(p, str)))
    for i, c in enumerate(ct):
        where = "chinh_ta[%d]" % i
        if not isinstance(c, dict):
            rep.err(where, "phải là object")
            continue
        check_jp(rep, where + ".cau", c.get("cau"), ctx)
        if isinstance(c.get("cau"), str):
            s = paper.norm_answer(paper.surface(c["cau"]))
            if not 6 <= len(s) <= 40:
                rep.err(where, "câu chép chính tả cần dài 6–40 ký tự (đang %d)" % len(s))
            if s and s not in all_text:
                rep.err(where, "câu chép chính tả phải chép nguyên văn một câu trong bài")
            elif s:
                sf = paper.surface(c["cau"]).strip().rstrip("。")
                paras = [paper.surface(p) for b in bai if isinstance(b, dict) for p in (b.get("doan") or [])
                         if isinstance(p, str)]
                if sf and not any(sf in p for p in paras):
                    rep.warn(where, "câu chép nên là MỘT câu trọn vẹn chép đúng cả dấu câu (không vắt qua 「」): %s" % sf[:30])
        extra = c.get("them_dap_an", [])
        if not isinstance(extra, list) or not all(isinstance(x, str) for x in extra):
            rep.err(where + ".them_dap_an", "phải là danh sách chuỗi")
        else:
            for x in extra:
                if LATIN_RE.search(x) or any(ch in x for ch in "{}[]|"):
                    rep.err(where + ".them_dap_an", "chỉ ghi cách viết khác bằng chữ Nhật, không đánh dấu, không romaji")

    mc = raw.get("mau_cau")
    if not isinstance(mc, list):
        rep.err("mau_cau", "phải là danh sách id mẫu câu")
    elif grammar_ids and not mc:      # chỉ thiếu phần "Mẫu câu trong số này" → không chặn cả số báo
        rep.warn("mau_cau", "chưa ghi id mẫu câu nhấn mạnh (lấy đúng id trong danh sách ngữ pháp)")
    else:
        for g in mc:
            if g not in grammar_ids:
                rep.err("mau_cau", 'id "%s" không có trong danh sách ngữ pháp' % g)
        focus = [g for g in scope.get("trong_tam", {}).get("ngu_phap", []) if g in grammar_ids]
        if focus and mc and not any(g in focus for g in mc):
            names = [r["mau"] for r in scope.get("ngu_phap", []) if r["id"] in focus][:5]
            rep.warn("mau_cau", "chưa dùng mẫu câu TRỌNG TÂM nào (%s): viết lại vài câu dùng 2–3 mẫu này, ghi id vào mau_cau"
                     % " / ".join(names))
    for nk, w in new_words.items():
        if nk not in ctx["used"]:
            rep.err("tu_moi", '"%s" khai báo là từ mới nhưng không được đánh dấu {..|..|%s} trong bài' % (w["w"], w["w"]))
    check_vi(rep, "tom_tat", raw.get("tom_tat"))
    if story_seen and not short:
        check_vi(rep, "tom_tat_truyen", raw.get("tom_tat_truyen"))
    # 1.13: gợi ý cho bước soát (không chặn): ít từ bấm tra được, chữ Hán khó hơn trình độ
    texts = _all_jp(raw)
    n_links = sum(len(paper.keys(t)) for t in texts)
    if not short and n_links < 5:
        rep.warn("bai", "chỉ có %d chỗ bấm tra từ; đánh dấu {表記|よみ|từ gốc} cho 8–20 từ có trong danh sách từ vựng" % n_links)
    focus = [w for w in scope.get("trong_tam", {}).get("tu", []) if w]
    if focus and scope.get("kho") and not short:
        used_f = {paper.norm_key(k) for t in texts for k in paper.keys(t)} & {paper.norm_key(w) for w in focus}
        if len(used_f) < min(4, len(focus)):
            rep.warn("bai", "mới dùng %d từ TRỌNG TÂM; nếu hợp thì đưa thêm vài từ (%s) vào bài, đừng ép câu"
                     % (len(used_f), "、".join(focus[:8])))
    hard = hard_kanji(texts, scope, [w.get("w", "") for w in new_words.values()])
    if hard:
        rep.warn("bai", "chữ Hán khó hơn trình độ %s (không có trong từ đã học): %s — đổi từ dễ hơn hoặc viết bằng kana "
                 "như trong danh sách từ vựng" % (scope.get("trinh_do", "?"), "、".join(hard[:8])))
    return rep


# Chữ Hán N5 + N4 (danh sách chung, gần đúng) — chỉ để gợi ý cho bước soát, không chặn số báo
BASIC_KANJI = set(
    "一二三四五六七八九十百千万円日月火水木金土曜本人今年時分半午前後上下中左右外大小高安新古長白先生学校友名何見"
    "行来出入食飲買休話聞読書言立会社国語英電車駅道店雨天気山川田口目耳手足父母男女子毎週東西南北間花魚"
    "悪暗医意以引院員運映営円屋音歌夏家画回界開海館顔帰起急究去業曲区空兄計建研験元工広考光降黄合黒才作産姉"
    "思止私使始市指死字自持事式室質写者借主首秋終習集住重春少場色心真親図世正西青赤切説洗走送早族村多太体待"
    "貸台代題達短知地池茶着注昼町鳥朝通低弟転点度冬答頭同動堂特肉売発飯病品不風服物文別勉歩方妹味民明門問夜"
    "野有用洋理旅料力林好近遠強弱楽薬"
    "畑")   # tên riêng của báo / làng: ことば畑, 畑新聞


def hard_kanji(texts: list[str], scope: dict[str, Any], extra: list[str] | None = None) -> list[str]:
    """Từ có chữ Hán ngoài (chữ Hán trong từ đã học ∪ từ mới đã khai báo ∪ chữ Hán N5–N4). Chỉ xét N5 / N4."""
    if scope.get("trinh_do") not in ("N5", "N4"):
        return []
    known = set(BASIC_KANJI)
    for w in [row[0] for row in scope.get("tu_vung", [])] + list(extra or []):
        known.update(paper.KANJI_RE.findall(w or ""))
    out: list[str] = []
    for t in texts:
        for tok in paper.tokenize(t):
            if tok[0] == "plain":
                continue
            ks = paper.KANJI_RE.findall(tok[1])
            if ks and any(k not in known and k not in "々" for k in ks) and tok[1] not in out:
                out.append(tok[1])
    return out


# ---------------------------------------------------------------------------
# Sửa máy móc (chỉ những chỗ chắc chắn sửa đúng)
# ---------------------------------------------------------------------------

_JP_SIDE = r"\u3040-\u30ff\u3400-\u9fff\uff01-\uff5e。、「」『』（）！？"
_GAP_RE = re.compile(r"(?<=[%s0-9\]\}])[ \t\u00a0]+(?=[%s\[\{])|(?<=[%s\]\}])[ \t\u00a0]+(?=[0-9])"
                     % (_JP_SIDE, _JP_SIDE, _JP_SIDE))
_ASCII_PUNCT = {"!": "！", "?": "？"}


LINK_MAX = 20          # 1.13: tổng số chỗ bấm tra được trong một số (tự nối thêm tới mức này)
LINK_PER_WORD = 1      # mỗi từ tự nối tối đa 1 chỗ (lần đầu xuất hiện)


def link_index(scope: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, list[Any]]]:
    """Chỉ mục từ trong phạm vi để nối [漢字|よみ] → {漢字|よみ|từ gốc}:
    (chỉ chữ Hán: 仕事; danh từ + する: 勉強する; chữ Hán + okurigana: 働く, 決める, 冷たい)."""
    exact: dict[str, Any] = {}
    suru: dict[str, Any] = {}
    stems: dict[str, list[Any]] = {}
    for row in scope.get("tu_vung", []):
        w, r = row[0], row[1] if len(row) > 1 else ""
        w2 = (w or "").strip().lstrip("〜～")
        if not w2 or not paper.KANJI_RE.search(w2) or re.search(r"[/／、,()（）\s〜～]", w2):
            continue
        rs = {paper.to_hira(x) for x in re.split(r"[/／、,・]", r or "") if x}
        if not re.search(r"[ぁ-ヿ]", w2):
            exact.setdefault(w2, (w, rs))
        elif w2.endswith("する") and not re.search(r"[ぁ-ヿ]", w2[:-2]):
            suru.setdefault(w2[:-2], (w, {x[:-2] for x in rs if x.endswith("する")}))
        else:
            m = re.match(r"^([㐀-鿿々]+)([ぁ-ゖ]{1,4})$", w2)
            if m:
                stems.setdefault(m.group(1), []).append((w, m.group(2), rs))
    return exact, suru, stems


def _link_for(surf: str, read: str, nxt: str, index: Any) -> str | None:
    """Từ gốc trong phạm vi ứng với [surf|read] + phần chữ ngay sau, hoặc None (không chắc thì không nối)."""
    exact, suru, stems = index
    hira = paper.to_hira(read)
    if surf in exact:
        w, rs = exact[surf]
        if not rs or hira in rs:
            return w
    if surf in suru and nxt[:1] in ("し", "す", "さ", "せ"):
        w, rs = suru[surf]
        if not rs or hira in rs:
            return w
    for w, tail, rs in stems.get(surf, []):
        fixed = tail[:-1]
        if not nxt.startswith(fixed) or len(nxt) <= len(fixed):
            continue
        if rs and not any(x.startswith(hira) and x[len(hira):] == tail for x in rs):
            continue
        return w
    return None


def _fix_special(s: str, notes: list[str]) -> str:
    """3[日|にち] → [3日|みっか], 2[人|にん] → [2人|ふたり], [4日|よんにち] → [4日|よっか]. 1日 để nguyên (ついたち / いちにち)."""
    def day(m: Any) -> str:
        n = int(m.group(1))
        table = SPECIAL_DAY if m.group(2) == "日" else SPECIAL_PEOPLE
        if n == 1 and m.group(2) == "日" or n not in table:
            return m.group(0)
        new = "[%d%s|%s]" % (n, m.group(2), table[n])
        if new != m.group(0):
            notes.append("sửa cách đọc ngày / số người đặc biệt")
        return new
    s = re.sub(r"(?<![\d.])(\d{1,2})\[(日|人)\|(?:にち|にん|か)\]", day, s)
    s = re.sub(r"(?<![\d.])(\d{1,2})\{(日|人)\|(?:にち|にん|か)\|[^{}|]*\}", day, s)
    return re.sub(r"\[(\d{1,2})(日|人)\|[^\]|]*\]", day, s)


# Furigana máy thêm được chắc chắn (chữ Hán Gemini quên đánh dấu): (chữ, cách đọc, chữ phải theo sau)
SAFE_READ = [("私", "わたし", ""), ("願", "ねが", "いうえっ"), ("下", "くだ", "さ"), ("何", "なに", "をがもか"),
             ("何", "なん", "でとだの人時回曜歳度月日年分個枚本")]


def _annotate(plain: str, index: Any, notes: list[str]) -> str:
    """Thêm furigana cho chữ Hán trơn khi chắc chắn: từ chỉ có chữ Hán trong phạm vi (một cách đọc), SAFE_READ."""
    exact = index[0] if index else {}
    out, i = [], 0
    while i < len(plain):
        if not paper.KANJI_RE.match(plain[i]):
            out.append(plain[i])
            i += 1
            continue
        j = i
        while j < len(plain) and paper.KANJI_RE.match(plain[j]):
            j += 1
        run, nxt, done = plain[i:j], plain[j:j + 1], False
        w = exact.get(run)
        if w and len(w[1]) == 1:
            out.append("[%s|%s]" % (run, next(iter(w[1]))))
            done = True
        else:
            for ch, read, after in SAFE_READ:
                if run == ch and (not after or (nxt and nxt in after)):
                    out.append("[%s|%s]" % (run, read))
                    done = True
                    break
        if done:
            notes.append("thêm furigana chắc chắn cho chữ Hán bị quên")
        else:
            out.append(run)
        i = j
    return "".join(out)


def _fix_jp(text: Any, scope_keys: set[str], new_keys: set[str], notes: list[str],
            linker: Callable[[str, str, str], str | None] | None = None, index: Any = None) -> Any:
    if not isinstance(text, str):
        return text
    text = _fix_special(text, notes)
    s = re.sub(r"\s*[\r\n]+\s*", "", text.strip())
    s2 = _GAP_RE.sub("", s)
    if s2 != s:
        notes.append("bỏ khoảng trắng giữa chữ Nhật")
        s = s2
    s2 = re.sub(r"(?<=[%s\]\}])[!?]" % _JP_SIDE, lambda m: _ASCII_PUNCT[m.group(0)], s)
    if s2 != s:
        notes.append("đổi !? sang dấu toàn khổ")
        s = s2
    out = []
    toks = paper.tokenize(s)
    for i, t in enumerate(toks):
        if t[0] == "plain":
            out.append(_annotate(t[1], index, notes) if paper.KANJI_RE.search(t[1]) else t[1])
        elif t[0] == "ruby":
            surf, read = t[1].strip(), t[2].strip()
            if read and not paper.KANJI_RE.search(surf):
                notes.append("bỏ furigana thừa trên %s" % surf)
                out.append(surf)
                continue
            read = paper.to_hira(read) if KANA_ONLY_RE.match(read or "x") else read
            nxt = toks[i + 1][1] if i + 1 < len(toks) and toks[i + 1][0] == "plain" else ""
            key = linker(surf, read, nxt) if linker and read and KANA_ONLY_RE.match(read) else None
            if key:
                notes.append("nối tra từ cho từ đã học")
                out.append("{%s|%s|%s}" % (surf, read, key))
            else:
                out.append("[%s|%s]" % (surf, read))
        else:
            surf, read, key = t[1].strip(), t[2].strip(), t[3].strip()
            nk = paper.norm_key(key)
            if key and nk not in scope_keys and nk not in new_keys:
                notes.append("bỏ liên kết tra từ của từ ngoài phạm vi %s" % key)
                out.append("[%s|%s]" % (surf, read) if paper.KANJI_RE.search(surf) and read else surf)
            else:
                out.append("{%s|%s|%s}" % (surf, read, key))
    return "".join(out)


def autofix(raw: Any, scope: dict[str, Any], opts: dict[str, Any]) -> tuple[Any, list[str]]:
    notes: list[str] = []
    if not isinstance(raw, dict):
        return raw, notes
    scope_keys = {paper.norm_key(v[0]) for v in scope.get("tu_vung", [])}
    max_new = int(opts.get("max_new", 3))
    tm = [w for w in raw.get("tu_moi", []) if isinstance(w, dict) and isinstance(w.get("w"), str) and w["w"].strip()] \
        if isinstance(raw.get("tu_moi"), list) else []
    # từ mới trùng phạm vi → không cần khai báo
    tm2 = [w for w in tm if paper.norm_key(w["w"]) not in scope_keys]
    if len(tm2) != len(tm):
        notes.append("bỏ khai báo từ mới đã có trong phạm vi")
    tm = tm2[:max_new]
    new_keys = {paper.norm_key(w["w"]) for w in tm}
    # 1.13: nối tra từ cho từ đã học mà Gemini chỉ ghi furigana [..|..] (bước soát lần 2 hay bỏ mất {..|..|..})
    index = link_index(scope)
    counts: dict[str, int] = {}
    for text in _all_jp(raw):
        for k in paper.keys(text):
            counts[paper.norm_key(k)] = counts.get(paper.norm_key(k), 0) + 1
    total = [sum(counts.values())]

    def linker(surf: str, read: str, nxt: str) -> str | None:
        if total[0] >= LINK_MAX:
            return None
        w = _link_for(surf, read, nxt, index)
        if not w or counts.get(paper.norm_key(w), 0) >= LINK_PER_WORD:
            return None
        counts[paper.norm_key(w)] = counts.get(paper.norm_key(w), 0) + 1
        total[0] += 1
        return w

    def fx(v: Any) -> Any:
        return _fix_jp(v, scope_keys, new_keys, notes, linker, index)

    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            b["tieu_de"] = fx(b.get("tieu_de"))
            if isinstance(b.get("doan"), list):
                b["doan"] = [fx(p) for p in b["doan"] if not (isinstance(p, str) and not p.strip())]
            if b.get("loai") == "truyen" and opts.get("ky") and isinstance(b.get("ky"), str) and b["ky"].isdigit():
                b["ky"] = int(b["ky"])
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            q["hoi"] = fx(q.get("hoi"))
            if isinstance(q.get("chon"), list):
                q["chon"] = [fx(o) for o in q["chon"]]
            if isinstance(q.get("dung"), str) and q["dung"].isdigit():
                q["dung"] = int(q["dung"])
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            c["cau"] = fx(c.get("cau"))
            if not isinstance(c.get("them_dap_an"), list):
                c["them_dap_an"] = []
            c["them_dap_an"] = [x.strip() for x in c["them_dap_an"] if isinstance(x, str) and x.strip()]
    # từ mới khai báo nhưng không dùng trong bài → bỏ khai báo
    used = set()
    for text in _all_jp(raw):
        used.update(paper.norm_key(k) for k in paper.keys(text))
    tm3 = [w for w in tm if paper.norm_key(w["w"]) in used]
    if len(tm3) != len(tm):
        notes.append("bỏ từ mới khai báo nhưng không dùng")
    for w in tm3:
        if isinstance(w.get("r"), str):
            w["r"] = re.sub(r"\s", "", w["r"])
    raw["tu_moi"] = tm3
    _fix_dictation(raw, opts, notes)
    if isinstance(raw.get("mau_cau"), list):
        ids = {g["id"] for g in scope.get("ngu_phap", [])}
        mc = [g for g in raw["mau_cau"] if isinstance(g, str)]
        fixed = [g if g in ids else _match_grammar(g, scope) for g in mc]
        fixed = [g for g in dict.fromkeys(fixed) if g]
        if fixed != mc:
            notes.append("sửa / bỏ id mẫu câu không có trong danh sách")
        raw["mau_cau"] = fixed
    return raw, list(dict.fromkeys(notes))


def _sentences(raw: dict[str, Any]) -> list[str]:
    """Câu trọn vẹn trong bài (đánh dấu giữ nguyên), 8–30 ký tự, không vắt qua 「」, để làm câu chép chính tả."""
    out = []
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        for p in (b.get("doan") or []) if isinstance(b, dict) else []:
            if not isinstance(p, str):
                continue
            for sent in re.split(r"(?<=[。！？])", p):
                c = sent.strip().lstrip("◆ 　")
                if c.startswith("「") and c.endswith("」"):
                    c = c[1:-1]
                c = c.strip("「」『』")
                if c.count("「") != c.count("」") or c.count("『") != c.count("』"):
                    continue
                if 8 <= len(paper.norm_answer(paper.surface(c))) <= 30 and c not in out:
                    out.append(c)
    return out


def _fix_dictation(raw: dict[str, Any], opts: dict[str, Any], notes: list[str]) -> None:
    """Câu chép không có nguyên văn trong bài (hay gặp sau bước soát sửa câu chữ) → bỏ; thiếu câu → máy chọn câu
    trọn vẹn trong bài (ưu tiên câu có từ bấm tra được). Câu chép bắt buộc lấy từ bài nên máy làm được, khỏi gọi Gemini."""
    if not isinstance(raw.get("bai"), list):
        return
    cts = raw.get("chinh_ta") if isinstance(raw.get("chinh_ta"), list) else []
    all_text = paper.norm_answer("".join(paper.surface(p) for b in raw["bai"] if isinstance(b, dict)
                                         for p in (b.get("doan") or []) if isinstance(p, str)))
    keep = []
    for c in cts:
        if isinstance(c, dict) and isinstance(c.get("cau"), str):
            n = paper.norm_answer(paper.surface(c["cau"]))
            if n and n in all_text and 6 <= len(n) <= 40:
                keep.append(c)
    want = 1 if opts.get("short") else 2
    if len(keep) >= want and len(keep) == len(cts):
        return
    have = {paper.norm_answer(paper.surface(c["cau"])) for c in keep}
    cands = [x for x in _sentences(raw) if paper.norm_answer(paper.surface(x)) not in have]
    cands.sort(key=lambda x: (-len(paper.keys(x)), -len(paper.surface(x))))
    for x in cands:
        if len(keep) >= max(want, min(3, len(cts))):
            break
        keep.append({"cau": x, "them_dap_an": []})
        have.add(paper.norm_answer(paper.surface(x)))
    notes.append("chọn lại câu chép chính tả từ bài (câu cũ không chép nguyên văn)")
    raw["chinh_ta"] = keep[:4]


def _match_grammar(gid: str, scope: dict[str, Any]) -> str | None:
    """Gemini hay viết mẫu câu thay cho id, hoặc bỏ mất tiền tố (N4-03 thay cho jlpt:N4-03)."""
    g = gid.strip()
    rows = scope.get("ngu_phap", [])
    same = [r["id"] for r in rows if r["mau"] == g]
    if len(same) == 1:
        return same[0]
    tail = [r["id"] for r in rows if ":" not in g and r["id"].endswith(":" + g)]
    return tail[0] if len(tail) == 1 else None


def _all_jp(raw: dict[str, Any]) -> list[str]:
    out = []
    for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
        if isinstance(b, dict):
            out.append(b.get("tieu_de"))
            out.extend(b.get("doan") or [])
    for q in raw.get("cau_hoi", []) if isinstance(raw.get("cau_hoi"), list) else []:
        if isinstance(q, dict):
            out.append(q.get("hoi"))
            out.extend(q.get("chon") or [])
    for c in raw.get("chinh_ta", []) if isinstance(raw.get("chinh_ta"), list) else []:
        if isinstance(c, dict):
            out.append(c.get("cau"))
    return [x for x in out if isinstance(x, str)]


def _link_count(raw: Any) -> int:
    """Số chỗ bấm tra từ {..|..|..} trong một số báo."""
    return sum(len(paper.keys(t)) for t in _all_jp(raw)) if isinstance(raw, dict) else 0


def parse_json(text: str) -> Any:
    s = text.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s)
    try:
        return json.loads(s)
    except ValueError:
        a, b = s.find("{"), s.rfind("}")
        if a >= 0 and b > a:
            try:
                return json.loads(s[a:b + 1])
            except ValueError:
                pass
    raise AIError("Gemini trả về JSON hỏng.", "format")


# ---------------------------------------------------------------------------
# Lời nhắc (prompt)
# ---------------------------------------------------------------------------

_S = {"type": "STRING"}
ISSUE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "bai": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "loai": {"type": "STRING", "enum": list(LOAI_AI)},
            "tieu_de": _S, "doan": {"type": "ARRAY", "items": _S},
            "dich": {"type": "ARRAY", "items": _S},          # 1.23: bản dịch tiếng Việt từng đoạn (ẩn sẵn)
            "ky": {"type": "INTEGER"}, "ky_truoc": _S},
            "required": ["loai", "tieu_de", "doan"],
            "propertyOrdering": ["loai", "ky", "ky_truoc", "tieu_de", "doan", "dich"]}},
        "cau_hoi": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "hoi": _S, "chon": {"type": "ARRAY", "items": _S}, "dung": {"type": "INTEGER"}, "giai_thich": _S},
            "required": ["hoi", "chon", "dung", "giai_thich"],
            "propertyOrdering": ["hoi", "chon", "dung", "giai_thich"]}},
        "chinh_ta": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "cau": _S, "them_dap_an": {"type": "ARRAY", "items": _S}},
            "required": ["cau"], "propertyOrdering": ["cau", "them_dap_an"]}},
        "mau_cau": {"type": "ARRAY", "items": _S},
        "tu_moi": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"w": _S, "r": _S, "m": _S},
                                               "required": ["w", "r", "m"], "propertyOrdering": ["w", "r", "m"]}},
        "tom_tat": _S,
        "tom_tat_truyen": _S,
    },
    "required": ["bai", "cau_hoi", "chinh_ta", "mau_cau", "tu_moi", "tom_tat"],
    "propertyOrdering": ["bai", "cau_hoi", "chinh_ta", "mau_cau", "tu_moi", "tom_tat", "tom_tat_truyen"],
}
REVIEW_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "van_de": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"cho": _S, "loi": _S, "sua": _S},
                                               "required": ["cho", "loi"], "propertyOrdering": ["cho", "loi", "sua"]}},
        "bao": ISSUE_SCHEMA,
    },
    "required": ["van_de", "bao"],
    "propertyOrdering": ["van_de", "bao"],
}

STORY_SETUP = """Truyện dài kỳ 『ことば村の小さな旅館』. ことば村 là làng nhỏ cạnh khu vườn ことば畑; mùa và thời tiết theo ngày thật ở Nhật.
Nhân vật (giữ nhất quán):
- スタックちゃん: robot nhỏ của khu vườn, tò mò, hay khoe tranh pixel tự vẽ. Xưng ぼく, nói thân mật.
- はなさん: bà chủ (女将さん) quán trọ nhỏ「ことば屋」, khoảng 30 tuổi, chu đáo, nói kính ngữ với khách.
  Gọi là はなさん (hoặc 女将さん); KHÔNG gọi là 店長.
- リンさん: cô gái Việt Nam mới đến làng, làm ở ことば屋, đang học tiếng Nhật, hay nhầm kính ngữ nhưng rất cố gắng.
- 村長（そんちょう）: trưởng làng, hiền, thích kể chuyện ngày xưa.
Mỗi kỳ là một tình huống nhỏ trong ngày ở quán trọ hoặc trong làng, kết hơi bỏ ngỏ.
Lời thoại: ghi rõ ai nói (「…」と[言|い]いました ngay sau tên người nói); lời chào / nhờ vả phải hợp vai
(người mới đến làm nói よろしくお願いします với chủ quán, không phải ngược lại)."""

RULES = """QUY TẮC ĐÁNH DẤU FURIGANA (máy sẽ kiểm tra, sai là phải viết lại):
- MỌI chữ Hán đều phải có furigana: [漢字|かんじ] hoặc {表記|よみ|từ gốc}. Cách đọc viết bằng HIRAGANA.
- {表記|よみ|từ gốc} dùng cho từ cần học: "từ gốc" chép ĐÚNG như cột từ trong danh sách từ vựng (kể cả 〜 và する).
  Ví dụ: {発表|はっぴょう|発表する}, {名|めい|〜名}. Từ katakana để trống cách đọc: {コート||コート}.
- Okurigana để NGOÀI ngoặc: {泊|と|泊まる}まり, [言|い]いました, [食|た]べます. Nhiều chữ Hán liền nhau bọc chung: [今週末|こんしゅうまつ].
- Số Ả Rập để ngoài, chỉ bọc chữ Hán: 11[月|がつ]19[日|にち], 2[時|じ], 5[人|にん].
  Ngày / số người đọc đặc biệt thì bọc cả số: [1日|ついたち] [2日|ふつか] [3日|みっか] [4日|よっか] [5日|いつか] [6日|むいか]
  [7日|なのか] [8日|ようか] [9日|ここのか] [10日|とおか] [14日|じゅうよっか] [20日|はつか] [24日|にじゅうよっか] [1人|ひとり] [2人|ふたり].
- Kana, tiểu từ, dấu câu, số để ngoài ngoặc. Không dùng [ ] { } | cho việc gì khác; trích lời dùng 「」.
- TUYỆT ĐỐI KHÔNG có chữ Latin / romaji trong phần tiếng Nhật (không "watashi", không "OK", không "StackChan": viết スタックちゃん, オーケー).
- Không dùng chữ Hán giản thể của tiếng Trung (们, 这, 说, 时…): chỉ dùng chữ Hán của tiếng Nhật. Không chèn tiếng Việt vào câu tiếng Nhật.
- Không cách chữ giữa các từ tiếng Nhật (không viết kiểu わたし は がくせい です).
- Cẩn thận từ nhiều cách đọc: 今日(きょう), 明日(あした), 昨日(きのう), 一日(ついたち / いちにち), 一人(ひとり), 何(なに / なん), 方(かた / ほう), 上手(じょうず), 大人(おとな), 今朝(けさ)."""


def _vocab_lines(scope: dict[str, Any], limit: int = 2000) -> str:
    """Danh sách từ gửi cho Gemini: từ trọng tâm / sắp quên trước, rồi từ mới học gần đây (cuối danh sách) trước từ cũ."""
    rows = scope["kho"] if scope.get("kho") else scope.get("tu_vung", [])    # 1.19.1: chỉ gửi kho ≤ 100 từ
    first = set(scope.get("trong_tam", {}).get("tu", [])) | set(scope.get("sap_quen", [])) | set(scope.get("loi_sai", []))
    ordered = [r for r in rows if r[0] in first] + [r for r in reversed(rows) if r[0] not in first]
    return "\n".join("%s|%s|%s" % (r[0], r[1], r[2]) for r in ordered[:limit])


def _grammar_lines(scope: dict[str, Any], focus_only: bool = False) -> str:
    rows = scope.get("ngu_phap", [])
    focus = set(scope.get("trong_tam", {}).get("ngu_phap", []))
    if focus_only and focus:
        rows = [g for g in rows if g["id"] in focus]
    return "\n".join("%s|%s|%s%s" % (g["id"], g["mau"], g["nghia"], " (TRỌNG TÂM)" if g["id"] in focus else "")
                     for g in rows[:400])


def season_text(date: datetime.date) -> str:
    m = date.month
    s = "xuân" if m in (3, 4, 5) else "hạ" if m in (6, 7, 8) else "thu" if m in (9, 10, 11) else "đông"
    return "ngày %d/%d/%d, mùa %s ở Nhật" % (date.day, date.month, date.year, s)


def system_prompt(level: str) -> str:
    lo, hi = LENGTH.get(level, (280, 700))
    return (
        "Bạn là người Nhật viết báo làng 『畑新聞』 cho người Việt Nam đang học tiếng Nhật trình độ %s.\n"
        "Viết tiếng Nhật tự nhiên như người Nhật viết cho người học: câu ngắn, ấm áp, hơi hài hước, không dịch từng chữ.\n"
        "Chỉ dùng ngữ pháp trong danh sách được cho (hoặc cơ bản hơn). Dùng từ trong danh sách từ vựng và từ rất cơ bản;\n"
        "từ ngoài danh sách chỉ khi thật cần, khai báo trong tu_moi.\n"
        "Kính ngữ: tôn kính ngữ chỉ cho hành động của người khác (khách, người trên); khiêm nhường ngữ chỉ cho hành động của mình.\n"
        "Nội dung hoàn toàn mới, không chép đoạn văn hay ví dụ của sách giáo khoa nào.\n"
        "Độ dài các đoạn (ký tự tiếng Nhật, không tính đánh dấu): %d–%d.\n\n%s\n\n"
        "Trả về đúng MỘT object JSON theo khuôn, không viết gì thêm." % (level, lo, hi, RULES))


def write_prompt(scope: dict[str, Any], opts: dict[str, Any], story_list: list[dict[str, Any]],
                 history: list[dict[str, Any]], date: datetime.date) -> str:
    level = scope.get("trinh_do", "N5")
    short = bool(opts.get("short"))
    ky = int(opts.get("ky") or 1)
    third = "thong_bao" if date.day % 2 == 0 else "cot"
    parts = ["HÔM NAY: %s. Số báo %d." % (season_text(date), int(opts.get("so") or 1))]
    if short:
        parts.append(
            "ĐÂY LÀ SỐ RÚT GỌN (người học còn nhiều số chưa đọc): chỉ 1 bài loai \"tin_lang\" ngắn (2 đoạn), "
            "chinh_ta 2 câu lấy nguyên văn từ bài, cau_hoi để rỗng hoặc 1 câu. KHÔNG viết truyện. "
            "Tin làng có thể nhắc nhẹ là các nhân vật đang chờ người đọc.")
    elif opts.get("no_story"):           # 1.23: Truyện: Tắt
        parts.append(
            "CẤU TRÚC: bai gồm đúng 2 bài theo thứ tự (KHÔNG có truyện dài kỳ):\n"
            "1. loai \"tin_lang\": tin trong làng ことば村 và khu vườn ことば畑, 2–3 đoạn.\n"
            "2. loai \"%s\": %s\n"
            "cau_hoi: 2–3 câu trắc nghiệm tiếng Nhật về nội dung bài, mỗi câu đúng 3 lựa chọn, CHỈ MỘT đáp án đúng, "
            "\"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" tiếng Việt chỉ ra câu trong bài.\n"
            "chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (8–30 ký tự, một câu trọn vẹn, không vắt qua dấu 「」); \"them_dap_an\": "
            "cách viết khác vẫn đúng (僕/ぼく, 下さい/ください), không đánh dấu." % (
                third, "お知らせ, 2–3 mục, mỗi mục là một đoạn bắt đầu bằng ◆, tiêu đề お[知|し]らせ."
                if third == "thong_bao" else "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu スタックちゃんの[一言|ひとこと]."))
    elif opts.get("story_plain"):        # 1.23: truyện đã viết + biên tập ở các lượt trước
        sp = opts["story_plain"]
        parts.append(
            "CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:\n"
            "1. loai \"tin_lang\": tin trong làng ことば村 và khu vườn ことば畑, dùng nhân vật của truyện, 2–3 đoạn (đừng kể lại truyện).\n"
            "2. loai \"truyen\", \"ky\": %d: CHÉP NGUYÊN VĂN truyện đã viết sẵn dưới đây (tiêu đề + %d đoạn), CHỈ THÊM đánh dấu "
            "furigana theo quy tắc ([漢字|かんじ], {表記|よみ|từ gốc} cho từ trong danh sách), không sửa chữ, không thêm bớt câu; "
            "\"dich\" để rỗng (máy tự điền).\n"
            "3. loai \"%s\": %s\n"
            "cau_hoi: 2–3 câu trắc nghiệm tiếng Nhật về nội dung CẢ SỐ (nên có 1 câu về truyện), mỗi câu đúng 3 lựa chọn, CHỈ "
            "MỘT đáp án đúng, \"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" tiếng Việt "
            "chỉ ra câu trong bài.\n"
            "chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (8–30 ký tự, một câu trọn vẹn, không vắt qua dấu 「」), lấy cả từ truyện; "
            "\"them_dap_an\": cách viết khác vẫn đúng (僕/ぼく, 下さい/ください), không đánh dấu.\n"
            "TRUYỆN ĐÃ VIẾT SẴN (kỳ %d):\n%s" % (
                ky, len(sp["doan"]), third, "お知らせ, 2–3 mục, mỗi mục là một đoạn bắt đầu bằng ◆, tiêu đề お[知|し]らせ."
                if third == "thong_bao" else "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu スタックちゃんの[一言|ひとこと].",
                ky, json.dumps({"tieu_de": sp["tieu_de"], "doan": sp["doan"]}, ensure_ascii=False)))
        if sp.get("tu_moi"):
            parts.append("Từ mới của truyện (đánh dấu {..|..|từ} và khai báo trong tu_moi): " +
                         "、".join("%s（%s）= %s" % (w.get("w"), w.get("r"), w.get("m")) for w in sp["tu_moi"] if isinstance(w, dict)))
    else:
        parts.append(
            "CẤU TRÚC: bai gồm đúng 3 bài theo thứ tự:\n"
            "1. loai \"tin_lang\": tin trong làng ことば村 và khu vườn ことば畑, dùng nhân vật của truyện, 2–3 đoạn.\n"
            "2. loai \"truyen\": kỳ %d của truyện dài kỳ, \"ky\": %d, 2–3 đoạn, kết hơi bỏ ngỏ; \"ky_truoc\": %s.\n"
            "3. loai \"%s\": %s\n"
            "cau_hoi: 2–3 câu trắc nghiệm tiếng Nhật về nội dung bài, mỗi câu đúng 3 lựa chọn, CHỈ MỘT đáp án đúng, "
            "\"dung\" là vị trí đáp án đúng tính từ 0 (đổi vị trí giữa các câu), \"giai_thich\" tiếng Việt chỉ ra câu trong bài.\n"
            "chinh_ta: 2–3 câu CHÉP NGUYÊN VĂN từ bài (8–30 ký tự, một câu trọn vẹn, không vắt qua dấu 「」), nên chứa mẫu câu trọng tâm; \"them_dap_an\": cách viết khác "
            "vẫn đúng (僕/ぼく, 下さい/ください), không đánh dấu.\n"
            "tom_tat_truyen: 1 câu tiếng Việt tóm tắt kỳ %d (để kỳ sau viết tiếp)." % (
                ky, ky, "\"\" (kỳ 1)" if ky == 1 else "1 câu tiếng Việt tóm tắt kỳ %d" % (ky - 1),
                third, "お知らせ, 2–3 mục, mỗi mục là một đoạn bắt đầu bằng ◆, tiêu đề お[知|し]らせ."
                if third == "thong_bao" else "cột ngắn của một nhân vật (1–2 đoạn), tiêu đề kiểu スタックちゃんの[一言|ひとこと].", ky))
    if not short:
        parts.append("dich: mỗi bài thêm \"dich\" = bản dịch tiếng Việt TỰ NHIÊN của từng đoạn (cùng số phần tử với doan; không "
                     "có chữ Nhật, không furigana, không ghi chú trong ngoặc). Người học bấm \"Dịch\" mới thấy.")
    parts.append(
        "mau_cau: 2–4 id lấy đúng từ DANH SÁCH NGỮ PHÁP (cột đầu), là các mẫu được nhấn mạnh; mỗi mẫu xuất hiện ít nhất 2 lần. "
        "Phần lớn là mẫu TRỌNG TÂM (nếu có), thêm 1 mẫu cũ để ôn.\n"
        "Đánh dấu {..|..|..} cho 8–20 từ đáng học (ưu tiên từ trọng tâm, từ sắp quên). tu_moi tối đa %d từ ngoài danh sách, "
        "mỗi từ phải được đánh dấu {..|..|từ} trong bài. tom_tat: 1–2 câu tiếng Việt tóm tắt số báo." % int(opts.get("max_new", 3)))
    tt = scope.get("trong_tam", {}).get("tu", [])
    if tt and scope.get("kho"):
        parts.append(
            "TỪ TRỌNG TÂM (người học phải ôn hôm nay): " + "、".join(tt[:FOCUS_WORDS]) + "\n"
            "Dùng được bao nhiêu thì dùng, tối thiểu khoảng 8 từ; từ nào không hợp thì bỏ, ĐỪNG ép câu. "
            "Nhìn danh sách rồi chọn chủ đề của số báo sao cho nhiều từ hợp nhau. Gợi ý: số đếm / giờ / ngày / giá / "
            "số lượng → お知らせ hoặc tin làng; động từ / tính từ / cảm xúc → truyện; nơi chốn / sự kiện / thời tiết → "
            "tin làng. Trợ số từ (〜枚, 〜本, 〜匹…) chỉ dùng một hai cái mỗi số.")
    elif tt:
        parts.append("TỪ TRỌNG TÂM (mới học / sắp quên, nên dùng vài từ): " + "、".join(tt[:30]))
    if scope.get("loi_sai"):
        parts.append("TỪ NGƯỜI HỌC HAY NGHE SAI (nên đưa vào câu chép chính tả): " + "、".join(scope["loi_sai"][:10]))
    recent = [h for h in history[-3:] if isinstance(h, dict)]
    if recent:
        parts.append("3 SỐ GẦN NHẤT ĐÃ NHẤN MẠNH (tránh lặp lại hết): " +
                     "; ".join("%s: %s" % (h.get("ngay"), ", ".join(h.get("mau", []))) for h in recent))
    if not short and not opts.get("no_story") and not opts.get("story_plain"):
        parts.append("TRUYỆN:\n" + STORY_SETUP)
        if opts.get("tone") in story_core.TONES:
            parts.append("GIỌNG TRUYỆN: " + story_core.TONE_TEXT[opts["tone"]])
        if story_list:
            parts.append("ĐÃ XẢY RA:\n" + "\n".join("- Kỳ %s (%s): %s" % (s.get("ky"), s.get("ngay"), s.get("tom_tat"))
                                                     for s in story_list[-10:]))
            last = story_list[-1]
            if last.get("nguyen_van"):     # 1.23: nguyên văn kỳ trước (trước chỉ một câu tóm tắt → hay mâu thuẫn)
                parts.append("NGUYÊN VĂN KỲ TRƯỚC (viết tiếp, không mâu thuẫn):\n" + "\n".join(last["nguyen_van"]))
            th = story_core.open_threads(story_list, None)
            if th:
                parts.append("CHỖ BỎ NGỎ CÒN MỞ: " + "; ".join(th[-4:]))
        else:
            parts.append("ĐÃ XẢY RA: (chưa có kỳ nào, đây là kỳ 1: リンさん bắt đầu làm ở ことば屋)")
    parts.append("DANH SÁCH NGỮ PHÁP (id|mẫu|nghĩa) — chỉ dùng ngữ pháp này và đơn giản hơn:\n" + _grammar_lines(scope))
    parts.append("DANH SÁCH TỪ VỰNG ĐÃ HỌC (từ|cách đọc|nghĩa) — từ gốc trong {..|..|từ gốc} phải chép đúng cột đầu:\n"
                 + _vocab_lines(scope))
    parts.append(
        "VÍ DỤ ĐỊNH DẠNG (chỉ xem cách đánh dấu, không chép nội dung):\n"
        '{"loai":"tin_lang","tieu_de":"スタックちゃん、[絵|え]を{発表|はっぴょう|発表する}","doan":["[昨日|きのう]の[夜|よる]、'
        '[村|むら]で[小|ちい]さな{発表会|はっぴょうかい|発表会}がありました。30{名|めい|〜名}の[人|ひと]が[来|き]ました。"]}')
    return "\n\n".join(parts)


def repair_prompt(raw: Any, errors: list[str]) -> str:
    return (
        "Máy kiểm tra tìm thấy các lỗi dưới đây trong số báo JSON. Sửa ĐÚNG các lỗi này (chữ Latin/romaji → kana hoặc chữ Hán "
        "kèm furigana; chữ Hán thiếu furigana → thêm [漢字|かんじ]; từ ngoài phạm vi → đổi thành [..|..] hoặc khai báo tu_moi…), "
        "giữ nguyên phần còn lại, rồi trả về TOÀN BỘ số báo JSON đã sửa.\n\nLỖI:\n- " + "\n- ".join(errors[:40]) +
        "\n\n" + RULES + "\n\nSỐ BÁO:\n" + json.dumps(raw, ensure_ascii=False))


def review_prompt(raw: Any, scope: dict[str, Any], warnings: list[str]) -> str:
    level = scope.get("trinh_do", "N5")
    return (
        "Bạn là biên tập viên người Nhật, soát lại số báo tiếng Nhật dưới đây dành cho người học trình độ %s trước khi in.\n"
        "Kiểm tra kỹ từng câu:\n"
        "1. Tiếng Nhật có tự nhiên và đúng ngữ pháp không (trợ từ, chia động từ, thể lịch sự / thông thường nhất quán trong một bài).\n"
        "2. Ngữ pháp có vượt trình độ %s / ngoài danh sách không → viết lại đơn giản hơn.\n"
        "3. Kính ngữ: tôn kính ngữ chỉ cho hành động của người khác, khiêm nhường ngữ chỉ cho hành động của mình.\n"
        "4. Furigana: cách đọc trong [..|..] và {..|..|..} có đúng với văn cảnh không (今日, 明日, 一日, 何, 方, số đếm, ngày tháng…).\n"
        "5. Còn chữ Latin / romaji, chữ Hán giản thể, chữ Hán thiếu furigana không.\n"
        "6. Mỗi câu hỏi có đúng MỘT đáp án đúng, đáp án đó có trong bài, \"dung\" chỉ đúng vị trí; giai_thich đúng.\n"
        "7. Câu chép chính tả có chép nguyên văn từ bài không.\n"
        "8. Tiêu đề, tom_tat, ky_truoc, giai_thich viết đúng nghĩa với bài.\n"
        "9. Lời thoại: rõ ai nói câu nào; lời chào / nhờ vả hợp vai; nhân vật nhất quán (はなさん là bà chủ quán 女将さん, "
        "không phải 店長).\n"
        "10. Kết hợp từ tự nhiên như người Nhật viết (không ghép từ lạ kiểu 明るい日; dùng いい天気 / 晴れた日…). "
        "Từ khó hơn trình độ %s (không phải từ rất cơ bản) → đổi từ dễ hơn.\n"
        "11. Số báo thường phải đủ 3 bài: tin_lang, truyen, rồi thong_bao hoặc cot.\n"
        "Ghi mỗi chỗ đã sửa vào van_de (cho = vị trí như bai[1].doan[0], loi = lỗi gì bằng tiếng Việt, sua = câu mới). "
        "Không có lỗi thì van_de rỗng. \"bao\" là toàn bộ số báo sau khi sửa (không có lỗi thì trả nguyên). "
        "Bài truyện (loai truyen) đã qua biên tập: chỉ sửa lỗi thật sự (ngữ pháp, furigana), không viết lại. \"dich\" (bản "
        "dịch tiếng Việt) giữ nguyên, chỉ sửa câu dịch của đoạn bạn vừa sửa.\n"
        "Giữ nguyên quy tắc đánh dấu, các id mau_cau, số kỳ truyện. GIỮ NGUYÊN mọi chỗ {表記|よみ|từ gốc}: đó là từ người học "
        "ĐÃ HỌC (bấm vào để tra nghĩa) — không đổi chúng thành [..|..], không đưa chúng vào tu_moi; tu_moi chỉ dành cho "
        "từ NGOÀI danh sách từ vựng.\n\n%s\n\n%s"
        "DANH SÁCH NGỮ PHÁP:\n%s\n\nSỐ BÁO:\n%s" % (
            level, level, level, RULES,
            ("GỢI Ý CỦA MÁY KIỂM TRA (xem và sửa nếu đúng là lỗi):\n- " + "\n- ".join(warnings[:20]) + "\n\n") if warnings else "",
            _grammar_lines(scope), json.dumps(raw, ensure_ascii=False)))


TRANSLATE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {"bai": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"dich": {"type": "ARRAY", "items": _S}},
                                                      "required": ["dich"]}}},
    "required": ["bai"],
}


def translate_issue(client: Gemini, issue: dict[str, Any], lang: str = "ja", prefer: Any = None) -> list[list[str] | None]:
    """1.23: "Dịch số này" cho số cũ (chưa có bản dịch): một lượt gọi, model nhẹ (Flash-Lite) trước. Trả về bản dịch
    tiếng Việt của từng bài (None = bài đó dịch hỏng, không có nút Dịch)."""
    arts = [{"tieu_de": paper.surface(b.get("tieu_de") or ""), "doan": [paper.surface(p) for p in b.get("doan") or []]}
            for b in issue.get("bai") or []]
    if not arts:
        return []
    names = text_models(client.models())
    lite = [n for n in names if "lite" in n] + [n for n in names if "lite" not in n]
    names = order_models(lite, client, [prefer]) if lite else []
    prompt = ("Dịch số báo %s dưới đây sang tiếng Việt cho người Việt đang học: dịch tự nhiên, đúng ý, giữ tên riêng, "
              "không thêm ghi chú hay giải thích trong ngoặc, không để chữ %s trong bản dịch. Mỗi bài trả về \"dich\" là "
              "danh sách bản dịch của TỪNG đoạn, đúng thứ tự và đúng số đoạn (không dịch tiêu đề).\n\nSỐ BÁO:\n%s" % (
                  "tiếng Anh" if lang == "en" else "tiếng Nhật", "Anh" if lang == "en" else "Nhật / Hán",
                  json.dumps({"bai": arts}, ensure_ascii=False)))
    last: AIError | None = None
    for name in names[:MAX_MODELS]:
        try:
            raw = parse_json(client.generate(name, "Bạn là người dịch báo cẩn thận.", prompt, TRANSLATE_SCHEMA, 0.2,
                                             thinking="low"))
        except AIError as e:
            last = e
            if e.kind in ("quota", "model", "busy", "format", "bad", "blocked"):
                continue
            raise
        rows = raw.get("bai") if isinstance(raw, dict) else None
        if not isinstance(rows, list):
            last = AIError("Gemini trả bản dịch sai định dạng.", "format")
            continue
        out: list[list[str] | None] = []
        for i, a in enumerate(arts):
            r = rows[i] if i < len(rows) and isinstance(rows[i], dict) else {}
            out.append(story_core.clean_translation(r.get("dich"), len(a["doan"])))
        if any(out):
            return out
        last = AIError("Bản dịch của Gemini không dùng được.", "format")
    raise last or AIError("Không gọi được Gemini.", "busy")


def add_translation(base: str, date: str, dich: list[list[str] | None]) -> bool:
    """Ghi bản dịch vào bao.json của số báo Gemini (thư mục của add-on)."""
    path = issue_path(base, date)
    raw = _read(path, None)
    if not isinstance(raw, dict) or not isinstance(raw.get("bai"), list):
        return False
    n = 0
    for b, d in zip(raw["bai"], dich):
        if isinstance(b, dict) and d and len(d) == len(b.get("doan") or []):
            b["dich"] = d
            n += 1
    if n:
        _write_json(path, raw)
    return bool(n)


# ---------------------------------------------------------------------------
# Thư mục báo của Gemini
# ---------------------------------------------------------------------------


def _write_json(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def _read(path: str, default: Any) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def ensure_dir(base: str) -> str:
    os.makedirs(os.path.join(base, "bao"), exist_ok=True)
    return base


def issue_path(base: str, date: str) -> str:
    return os.path.join(base, "bao", date, "bao.json")


def has_issue(base: str, date: str) -> bool:
    return os.path.isfile(issue_path(base, date))


def write_scope(base: str, scope: dict[str, Any]) -> None:
    """pham_vi.json để phần đọc báo tra nghĩa từ (cùng định dạng kotoba_daily)."""
    _write_json(os.path.join(base, "pham_vi.json"), {
        "_ghi_chu": "File này do ことば畑 (Gemini) tạo ra, đừng sửa tay.",
        "trinh_do": scope.get("trinh_do"), "nen_tang": scope.get("nen_tang"),
        "sach": scope.get("sach") or {}, "tu_vung": scope.get("tu_vung", []),
        "ngu_phap": [dict(g) for g in scope.get("ngu_phap", [])],
    })


def numbering(base: str, date: str) -> tuple[int, int]:
    """(số báo hôm nay, kỳ truyện tiếp theo) tính từ các số đã có (trừ số của chính ngày đó)."""
    root = os.path.join(base, "bao")
    n, ky = 0, 0
    try:
        names = sorted(x for x in os.listdir(root) if paper.DATE_RE.match(x) and x != date)
    except OSError:
        names = []
    for d in names:
        raw = _read(os.path.join(root, d, "bao.json"), None)
        if not isinstance(raw, dict):
            continue
        n += 1
        for b in raw.get("bai", []) if isinstance(raw.get("bai"), list) else []:
            if isinstance(b, dict) and b.get("loai") == "truyen" and isinstance(b.get("ky"), int):
                ky = max(ky, b["ky"])
    return n + 1, ky + 1


def tts_text(markup: str) -> str:
    """Chữ gửi cho giọng đọc: giữ chữ Hán (để đúng ngữ điệu) trừ số đếm / từ nhiều cách đọc thì dùng kana."""
    return paper.speech_text(markup)


def _wav(path: str, pcm: bytes, rate: int) -> float:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    os.replace(tmp, path)
    return len(pcm) / 2.0 / max(1, rate)


def _en_module() -> Any:
    """1.19: phần riêng của báo tiếng Anh (ai_en.py) — nạp khi cần (ai_en import lại ai_core)."""
    try:
        from . import ai_en
    except ImportError:
        import ai_en  # type: ignore[no-redef]
    return ai_en


class Job:
    """Viết một số báo. Chạy trong luồng nền (không đụng collection); progress(msg) để báo tiến độ.

    1.19: scope["lang"] == "en" → báo tiếng Anh (lời nhắc, sửa máy, kiểm tra của ai_en; cùng các bước còn lại)."""

    def __init__(self, client: Gemini, base: str, date: str, scope: dict[str, Any], opts: dict[str, Any],
                 progress: Callable[[str], None] | None = None) -> None:
        self.c = client
        self.base = base
        self.date = date
        self.scope = scope
        self.opts = dict(opts)
        self.progress = progress or (lambda msg: None)
        self.log: list[dict[str, Any]] = []
        self.models: list[str] = []
        self.model = ""
        self.en = _en_module() if scope.get("lang") == "en" else None
        self.story: dict[str, Any] | None = None     # 1.23: kỳ truyện đã viết + biên tập (quy trình mới)

    def check_kanji(self, text: str) -> list[str]:
        return _bad_kanji(text)

    def story_hints(self, st: dict[str, Any]) -> list[str]:
        """Gợi ý cho biên tập (không chặn): chữ Hán khó hơn trình độ trong truyện tiếng Nhật."""
        if self.en:
            return []
        hard = hard_kanji([st.get("tieu_de") or ""] + list(st.get("doan") or []), self.scope,
                          [w.get("w", "") for w in st.get("tu_moi") or [] if isinstance(w, dict)])
        return ["chữ Hán khó hơn trình độ (không có trong từ đã học): " + "、".join(hard[:8])] if hard else []

    def _story_fill(self, raw: Any) -> None:
        """1.23: điền phần máy biết chắc vào bài truyện của số báo: số kỳ, tóm tắt kỳ trước, bản dịch, tóm tắt truyện.
        Báo tiếng Anh: chèn thẳng truyện đã duyệt (chữ trơn, máy tự nối tra từ sau)."""
        st = self.story
        if not st or not isinstance(raw, dict) or not isinstance(raw.get("bai"), list):
            return
        bai = raw["bai"]
        idx = next((i for i, b in enumerate(bai) if isinstance(b, dict) and b.get("loai") == "truyen"), None)
        if idx is None and self.en:
            bai.insert(min(1, len(bai)), {"loai": "truyen"})
            idx = min(1, len(bai) - 1)
        if idx is None:
            return
        b = bai[idx]
        if self.en:
            b["tieu_de"], b["doan"] = st["tieu_de"], list(st["doan"])
        b["ky"] = st["ky"]
        if st["ky"] > 1 and not (isinstance(b.get("ky_truoc"), str) and VI_LETTER_RE.search(b["ky_truoc"])):
            b["ky_truoc"] = st.get("ky_truoc") or b.get("ky_truoc") or ""
        if st.get("dich") and isinstance(b.get("doan"), list) and len(b["doan"]) == len(st["dich"]):
            b["dich"] = list(st["dich"])
        nho = st.get("nho") if isinstance(st.get("nho"), dict) else {}
        if not (isinstance(raw.get("tom_tat_truyen"), str) and raw["tom_tat_truyen"].strip()) and nho.get("tom_tat"):
            raw["tom_tat_truyen"] = nho["tom_tat"]
        if self.en and st.get("tu_moi"):     # từ mới của truyện tiếng Anh (máy tự gạch chân)
            tm = raw.get("tu_moi") if isinstance(raw.get("tu_moi"), list) else []
            have = {w.get("w") for w in tm if isinstance(w, dict)}
            for w in st["tu_moi"]:
                if isinstance(w, dict) and w.get("w") not in have and len(tm) < int(self.opts.get("max_new", 3)):
                    tm.append({"w": w.get("w", ""), "r": w.get("r", ""), "m": w.get("m", "")})
            raw["tu_moi"] = tm

    def _note(self, step: str, **kw: Any) -> None:
        item = {"buoc": step, **kw}
        self.log.append(item)

    def _models(self) -> list[str]:
        if self.opts.get("model"):
            return [self.opts["model"]]
        if not self.models:
            self.models = text_models(self.c.models())
            if not self.models:
                raise AIError("Không thấy model Gemini nào viết được chữ.", "model")
        # 1.13: model đã chạy được (Thử khoá / số trước) trước; bỏ model hết hạn mức hôm nay; cả Flash-Lite
        names = order_models(self.models, self.c, [self.model, self.opts.get("prefer")])
        if not names:
            raise AIError("Mọi model Gemini của khoá này đã hết hạn mức miễn phí hôm nay, thử lại ngày mai.", "quota",
                          daily=True)
        return names

    def _gen(self, system: str, prompt: str, schema: dict[str, Any], temperature: float,
             thinking: str | None = None) -> Any:
        last: AIError | None = None
        for name in self._models():
            try:
                text = self.c.generate(name, system, prompt, schema, temperature, thinking=thinking)
                self.model = name
                try:
                    return parse_json(text)
                except AIError:
                    return {"_hong": text[:20000]}
            except AIError as e:
                last = e
                if e.kind in ("quota", "model", "busy", "format", "bad", "blocked"):
                    self._note("doi_model", model=name, ly_do=str(e)[:160])
                    continue        # model khác (vd. Flash-Lite có hạn mức riêng)
                raise
        raise last or AIError("Không gọi được Gemini.", "busy")

    def _clean(self, raw: Any) -> tuple[Any, Report]:
        if isinstance(raw, dict) and "_hong" in raw:
            rep = Report()
            rep.err("bao", "JSON hỏng, không đọc được")
            return raw, rep
        fix, chk = (self.en.autofix, self.en.check) if self.en else (autofix, check)
        self._story_fill(raw)
        raw, notes = fix(raw, self.scope, self.opts)
        if notes:
            self._note("may_sua", viec=notes)
        return raw, chk(raw, self.scope, self.opts)

    def _repair(self, raw: Any, rep: Report, system: str, rounds: int) -> tuple[Any, Report]:
        for i in range(rounds):
            if not rep.errors:
                break
            self.progress("Đang sửa %d lỗi (lần %d)…" % (len(rep.errors), i + 1))
            self._note("sua", lan=i + 1, loi=rep.errors[:40])
            if isinstance(raw, dict) and "_hong" in raw:
                prompt = "JSON dưới đây bị hỏng. Trả lại đúng nội dung đó dưới dạng JSON hợp lệ theo khuôn.\n\n" + raw["_hong"]
            elif self.en:
                prompt = self.en.repair_prompt(raw, rep.errors, self.scope)
            else:
                prompt = repair_prompt(raw, rep.errors)
            try:
                fixed = self._gen(system, prompt, ISSUE_SCHEMA, 0.2, thinking="low")
            except AIError as e:
                if e.kind == "key":
                    raise
                self._note("sua_loi_goi", lan=i + 1, ly_do=str(e)[:200])   # giữ bản hiện có, để bước soát thử tiếp
                break
            if isinstance(fixed, dict) and "_hong" in fixed and not (isinstance(raw, dict) and "_hong" in raw):
                self._note("sua_hong", lan=i + 1)        # bản sửa bị cắt / hỏng → giữ bản trước (ít lỗi hơn)
                continue
            raw, rep = self._clean(fixed)
        return raw, rep

    def run(self) -> dict[str, Any]:
        t0 = time.time()
        level = self.scope.get("trinh_do", "N5")
        ensure_dir(self.base)
        story = story_core.load_story(self.base)        # 1.23: đọc cả định dạng cũ, thêm nguyên văn / chỗ bỏ ngỏ
        history = _read(os.path.join(self.base, "lich_su.json"), [])
        history = history if isinstance(history, list) else []
        so, ky = numbering(self.base, self.date)
        self.opts.setdefault("so", so)
        mode = self.opts.get("story") if self.opts.get("story") in story_core.MODES else "hay"
        if self.opts.get("short"):
            self.opts["ky"] = None
        elif mode == "tat":                 # 1.23: Truyện: Tắt → số báo không có truyện, số kỳ giữ cho lần bật lại
            self.opts["ky"] = None
            self.opts["no_story"] = True
        else:
            self.opts.setdefault("ky", ky)
        day = datetime.date.fromisoformat(self.date)
        en = self.en
        system = en.system_prompt(level) if en else system_prompt(level)
        result: dict[str, Any] = {"ok": False, "date": self.date, "so": self.opts["so"], "lang": "en" if en else "ja"}
        try:
            if mode == "hay" and self.opts.get("ky"):
                # 1.23: mạch truyện → nhà văn → biên tập → viết lại (story_core); lỗi / hết lượt → truyện viết chung như cũ
                try:
                    self.story = story_core.run(self, int(self.opts["ky"]), str(self.opts.get("tone") or "am"),
                                                (en.season_text if en else season_text)(day))
                except AIError as e:
                    if e.kind == "key":
                        raise
                    self._note("truyen_bo_qua", ly_do=str(e)[:200])
                    self.story = None
                if self.story:
                    self.opts["story_plain"] = {k: self.story[k] for k in ("tieu_de", "doan")}
                    self.opts["story_plain"]["tu_moi"] = self.story.get("tu_moi") or []
                    result["story"] = {"diem": self.story.get("diem") or {}, "viet_lai": bool(self.story.get("_viet_lai"))}
                else:
                    self._note("truyen_viet_chung")
            self.progress("Gemini đang viết số %d%s…" % (self.opts["so"], " (tiếng Anh)" if en else ""))
            prompt = (en.write_prompt if en else write_prompt)(self.scope, self.opts, story, history, day)
            first = self._gen(system, prompt, ISSUE_SCHEMA, 0.8)
            if isinstance(first, dict) and "_hong" in first:
                # 1.13: JSON hỏng thường là bài bị cắt giữa chừng — "sửa" một mẩu bài chỉ ra một mẩu bài
                # (thử thật: 3.6-flash, hỏng cả số). Viết lại từ đầu một lần rồi mới sửa.
                self._note("viet_lai", model=self.model, ly_do="JSON hỏng (%d ký tự)" % len(first["_hong"]))
                self.progress("Bài bị hỏng, Gemini viết lại số %d…" % self.opts["so"])
                again = self._gen(system, prompt, ISSUE_SCHEMA, 0.7)
                if not (isinstance(again, dict) and "_hong" in again):
                    first = again
            raw, rep = self._clean(first)
            self._note("viet", model=self.model, loi=rep.errors[:40], canh_bao=rep.warnings[:20])
            raw, rep = self._repair(raw, rep, system, MAX_REPAIRS)
            good = raw if not rep.errors else None
            # soát lần 2 (biên tập viên)
            self.progress("Đang soát lần 2…")
            reviewed: Any = None
            try:
                rp = (en.review_prompt if en else review_prompt)(raw, self.scope, rep.warnings)
                res = self._gen(system, rp, REVIEW_SCHEMA, 0.1, thinking="medium")
                issues = res.get("van_de") if isinstance(res, dict) else None
                cand = res.get("bao") if isinstance(res, dict) else None
                self._note("soat", van_de=[i for i in issues if isinstance(i, dict)][:30] if isinstance(issues, list) else [])
                if isinstance(cand, dict) and cand.get("bai"):
                    cand, rep2 = self._clean(cand)
                    if rep2.errors:
                        self._note("soat_loi", loi=rep2.errors[:40])
                        cand, rep2 = self._repair(cand, rep2, system, 2)
                    count = (lambda r: en.deck_count(r, self.scope)) if en else _link_count
                    before = count(good) if good is not None else 0
                    after = count(cand) if not rep2.errors else 0
                    if not rep2.errors and good is not None and before >= 6 and after < before * 0.5:
                        # bản soát bỏ mất phần lớn chỗ bấm tra từ (1.12 gặp: 3.6-flash gỡ hết) → giữ bản trước;
                        # 1.19 tiếng Anh: bản soát đổi phần lớn từ của deck sang từ khác → giữ bản trước
                        self._note("soat_mat_tra_tu", truoc=before, sau=after)
                    elif not rep2.errors:
                        reviewed, rep = cand, rep2
            except AIError as e:
                if e.kind == "key":
                    raise
                self._note("soat_bo_qua", ly_do=str(e))
            final = reviewed if reviewed is not None else good
            if final is None:
                result["error"] = "Gemini viết còn %d lỗi sau %d lần sửa, chưa lưu số này." % (len(rep.errors), MAX_REPAIRS)
                result["loi"] = rep.errors[:20]
                return result
            if reviewed is None:
                self._note("dung_ban_truoc_soat")
            self._save(final, story, history)
            result.update(ok=True, title=paper.surface((final.get("bai") or [{}])[0].get("tieu_de", "") or ""),
                          warnings=rep.warnings[:20], model=self.model,
                          focus=(en.focus_used if en else focus_used)(final, self.scope))
            return result
        except AIError as e:
            result["error"] = str(e)
            result["kind"] = e.kind
            return result
        finally:
            result["calls"] = self.c.calls
            result["seconds"] = round(time.time() - t0, 1)
            result["exhausted"] = self.c.exhausted_state()
            self._note("ket_qua", ok=result.get("ok", False), loi=result.get("error", ""), goi=self.c.calls,
                       giay=result["seconds"])
            try:
                _write_json(os.path.join(self.base, "nhat_ky", self.date + ".json"),
                            {"ngay": self.date, "pham_vi": describe_scope(self.scope), "buoc": self.log})
            except OSError:
                pass

    def _save(self, raw: dict[str, Any], story: list[Any], history: list[Any]) -> None:
        out = {"ngay": self.date, "so": self.opts["so"], "rut_gon": bool(self.opts.get("short")),
               "may_viet": "Gemini (%s)" % self.model}
        if self.en:
            out["ngon_ngu"] = "en"          # 1.19: báo tiếng Anh (paper_core.clean_issue đọc khoá này)
        for k in ("bai", "cau_hoi", "chinh_ta", "mau_cau", "tu_moi", "tom_tat"):
            out[k] = raw.get(k, [] if k != "tom_tat" else "")
        for b in out["bai"]:
            if b.get("loai") != "truyen":
                b.pop("ky", None)
                b.pop("ky_truoc", None)
            # 1.23: bản dịch hỏng (sai số đoạn, lọt chữ Nhật…) → bỏ, bài đó không có nút Dịch, cả số vẫn dùng được
            d = story_core.clean_translation(b.get("dich"), len(b.get("doan") or []))
            if d:
                b["dich"] = d
            else:
                b.pop("dich", None)
        # 1.23: mỗi số tự mang bảng tra nghĩa (pham_vi.json chung bị ghi đè khi số sau viết theo phạm vi khác)
        out.update(paper.build_lookup(paper.issue_texts(out), out.get("mau_cau") or [], self.scope))
        write_scope(self.base, self.scope)
        _write_json(issue_path(self.base, self.date), out)
        sb = next((b for b in out["bai"] if b.get("loai") == "truyen"), None)
        ky = sb.get("ky") if sb else None
        if ky and isinstance(ky, int):
            # 1.23: bộ nhớ truyện ghi nguyên văn (chữ trơn), chỗ bỏ ngỏ, điểm biên tập — kỳ sau viết tiếp không mâu thuẫn
            ep: dict[str, Any] = dict(self.story) if self.story else {}
            ep["doan"] = [paper.surface(p) for p in sb.get("doan") or [] if isinstance(p, str)]
            nho = dict(ep.get("nho") or {}) if isinstance(ep.get("nho"), dict) else {}
            if isinstance(raw.get("tom_tat_truyen"), str) and raw["tom_tat_truyen"].strip() and not nho.get("tom_tat"):
                nho["tom_tat"] = raw["tom_tat_truyen"].strip()[:300]
            ep["nho"] = nho
            if nho.get("tom_tat"):
                story_core.save_episode(self.base, self.date, ky, ep, paper.surface(sb.get("tieu_de") or ""))
        words = [paper.norm_key(k) for t in _all_jp(out) for k in paper.keys(t)]
        history = [h for h in history if isinstance(h, dict) and h.get("ngay") != self.date]
        history.append({"ngay": self.date, "so": out["so"], "mau": out["mau_cau"],
                        "tu": list(dict.fromkeys(words))[:8], "tom_tat": out["tom_tat"][:200]})
        _write_json(os.path.join(self.base, "lich_su.json"), history[-60:])


# ---------------------------------------------------------------------------
# Giọng đọc Gemini
# ---------------------------------------------------------------------------

SLOW_SPEED = 0.75      # bản "Nghe chậm": tạo ngay trên máy từ bản thường (không tốn lượt gọi Gemini)


def _read_pcm(path: str) -> tuple[array.array, int] | None:
    try:
        with wave.open(path, "rb") as w:
            if w.getsampwidth() != 2 or w.getnchannels() != 1:
                return None
            rate = w.getframerate()
            s = array.array("h", w.readframes(w.getnframes()))
    except (OSError, wave.Error, EOFError):
        return None
    if sys.byteorder != "little":
        s.byteswap()
    return s, rate


def stretch(samples: Any, rate: int, speed: float = SLOW_SPEED, pause: float = 0.25) -> array.array:
    """Đọc chậm lại mà không đổi cao độ (WSOLA, thuần Python): speed 0.75 → dài thêm 1/3; thêm khoảng lặng hai đầu.

    1.12 nhờ Gemini đọc chậm bằng câu dặn tiếng Anh; model TTS 3.8 đọc to luôn câu dặn đó nên bản chậm luôn bị bỏ."""
    n = len(samples)
    if n < rate // 10 or not 0.4 <= speed < 1.0:
        return array.array("h", samples)
    win = max(64, int(rate * 0.030)) // 2 * 2       # cửa sổ 30 ms
    hs = win // 2                                    # bước tổng hợp
    ha = hs * speed                                  # bước phân tích
    tol = int(rate * 0.010)                          # tìm chỗ khớp trong ±10 ms
    step = max(1, rate // 8000)                      # so khớp trên bản lấy mẫu thưa (~8 kHz) cho nhanh
    hann = [0.5 - 0.5 * math.cos(2 * math.pi * k / win) for k in range(win)]
    x = list(samples) + [0] * (win + tol + 2)
    out = [0.0] * (int(n / speed) + 2 * win)
    prev, k = 0, 0
    mul = operator.mul
    while True:
        target = int(k * ha)
        if target + win >= n:
            break
        best = 0
        if k:
            nat = prev + hs                          # phần tiếp nối tự nhiên của khung trước
            ref = x[nat:nat + win:step]
            lo, hi = max(0, target - tol), min(n - win, target + tol)
            best, best_c = target, -1e30
            for cand in range(lo, hi + 1, step):
                c = sum(map(mul, ref, x[cand:cand + win:step]))
                if c > best_c:
                    best_c, best = c, cand
        o = k * hs
        seg = x[best:best + win]
        for j in range(win):
            out[o + j] += seg[j] * hann[j]
        prev = best
        k += 1
    used = min(len(out), k * hs + hs)
    pad = array.array("h", [0] * int(rate * pause))
    res = array.array("h", pad)
    res.extend(max(-32768, min(32767, int(v))) for v in out[:used])
    res.extend(pad)
    return res


def make_slow(src: str, dst: str, speed: float = SLOW_SPEED) -> bool:
    got = _read_pcm(src)
    if not got:
        return False
    s, rate = got
    slow = stretch(s, rate, speed)
    if sys.byteorder != "little":
        slow.byteswap()
    _wav(dst, slow.tobytes(), rate)
    return True


def fix_nested_wav(path: str) -> bool:
    """1.12 ghi nguyên file WAV của model TTS 3.8 vào trong một WAV khác (tiếng bụp đầu, rè cuối). Sửa tại chỗ."""
    try:
        with wave.open(path, "rb") as w:
            rate = w.getframerate()
            head = w.readframes(8)
            if head[:4] != b"RIFF":
                return False
            w.rewind()
            data = w.readframes(w.getnframes())
        pcm, inner_rate = decode_audio(data, "audio/wav")
    except (OSError, wave.Error, EOFError, AIError):
        return False
    _wav(path, pcm, inner_rate or rate)
    return True


def repair_audio(base: str) -> int:
    """Sửa giọng đọc của các số cũ trong thư mục báo Gemini: file bị lồng của bản 1.12, và tạo bù bản chậm
    (1.12 bỏ bản chậm khi model đọc to câu dặn). Trả về số file đã sửa / tạo."""
    fixed = 0
    for root in (os.path.join(base, "bao"), os.path.join(base, VOICE_DIR)):
        for dirpath, _dirs, files in os.walk(root):
            for f in files:
                if f.endswith(".wav") and fix_nested_wav(os.path.join(dirpath, f)):
                    fixed += 1
    try:
        dates = [d for d in os.listdir(os.path.join(base, "bao")) if paper.DATE_RE.match(d)]
    except OSError:
        dates = []
    for d in dates:
        folder = os.path.join(base, "bao", d)
        meta_path = os.path.join(folder, "audio", "am_thanh.json")
        meta = _read(meta_path, None)
        if not isinstance(meta, dict) or not isinstance(meta.get("chinh_ta"), list):
            continue
        changed = False
        for i, cur in enumerate(meta["chinh_ta"]):
            if not isinstance(cur, dict) or not isinstance(cur.get("thuong"), str):
                continue
            if isinstance(cur.get("cham"), str) and os.path.isfile(os.path.join(folder, cur["cham"])):
                continue
            src = os.path.join(folder, cur["thuong"])
            rel = "audio/ct_%d_cham.wav" % (i + 1)
            if paper.AUDIO_RE.match(cur["thuong"]) and os.path.isfile(src) and make_slow(src, os.path.join(folder, rel)):
                cur["cham"] = rel
                cur.pop("bo_cham", None)
                changed = True
                fixed += 1
        if changed:
            _write_json(meta_path, meta)
    return fixed


def audio_todo(base: str, date: str, mode: str) -> list[tuple[str, int, int, bool]]:
    """Các file còn thiếu: (loại "ct"/"bai", i, j, chậm?). Bản chậm của câu chép tạo tại máy (không gọi Gemini)."""
    if mode not in ("chinh_ta", "ca_bai"):
        return []
    raw = _read(issue_path(base, date), None)
    if not isinstance(raw, dict):
        return []
    have = _read(os.path.join(base, "bao", date, "audio", "am_thanh.json"), {})
    have = have if isinstance(have, dict) else {}
    folder = os.path.join(base, "bao", date)

    def exists(rel: Any) -> bool:
        return isinstance(rel, str) and os.path.isfile(os.path.join(folder, rel))
    todo = []
    cts = have.get("chinh_ta") if isinstance(have.get("chinh_ta"), list) else []
    for k, _c in enumerate(raw.get("chinh_ta", [])[:4]):
        cur = cts[k] if k < len(cts) and isinstance(cts[k], dict) else {}
        if not exists(cur.get("thuong")):
            todo.append(("ct", k, 0, False))
        if not exists(cur.get("cham")):
            todo.append(("ct", k, 0, True))
    if mode == "ca_bai":
        bai = have.get("bai") if isinstance(have.get("bai"), list) else []
        for i, b in enumerate(raw.get("bai", [])[:6]):
            row = bai[i] if i < len(bai) and isinstance(bai[i], list) else []
            for j, _p in enumerate((b.get("doan") or [])[:12]):
                if not exists(row[j] if j < len(row) else None):
                    todo.append(("bai", i, j, False))
    return todo


def _speak_any(client: Gemini, names: list[str], speech: str, voice: str) -> tuple[bytes, int, str]:
    """Đọc bằng model đầu tiên còn dùng được. Trả về (pcm, tần số, model đã dùng)."""
    err: AIError | None = None
    for name in names:
        if client.is_exhausted(name):
            continue
        try:
            pcm, rate = client.speak(name, speech, voice)
            return pcm, rate, name
        except AIError as e:
            err = e
            if e.kind in ("quota", "model", "busy", "bad", "blocked"):
                continue
            raise
    raise err or AIError("Hết hạn mức giọng đọc Gemini hôm nay (mọi model), thử lại ngày mai.", "quota", daily=True)


def _plausible(pcm: bytes, rate: int, text: str) -> bool:
    dur = len(pcm) / 2.0 / max(1, rate)
    kana_len = max(1, len(paper.norm_answer(paper.kana(text))))
    return 0.3 <= dur <= 1.2 * kana_len + 3


def make_audio(client: Gemini, base: str, date: str, mode: str, voice: str, model: str = "",
               progress: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Tạo các file giọng đọc còn thiếu. Hết hạn mức thì dừng, lần sau làm tiếp phần còn lại.

    Cả số dùng một model TTS (model đã dùng cho số này được ưu tiên) để giọng không đổi giữa chừng."""
    progress = progress or (lambda msg: None)
    folder = os.path.join(base, "bao", date)
    for dirpath, _d, files in os.walk(os.path.join(folder, "audio")):
        for f in files:
            if f.endswith(".wav"):
                fix_nested_wav(os.path.join(dirpath, f))
    todo = audio_todo(base, date, mode)
    out: dict[str, Any] = {"made": 0, "left": len(todo), "error": ""}
    if not todo:
        return out
    raw = _read(issue_path(base, date), {})
    voice = voice if voice in VOICES else VOICES[0]
    meta_path = os.path.join(folder, "audio", "am_thanh.json")
    meta = _read(meta_path, {})
    meta = meta if isinstance(meta, dict) else {}
    meta["credit"] = "Gemini TTS:%s" % voice
    meta.setdefault("bai", [])
    meta.setdefault("chinh_ta", [])
    names: list[str] | None = None
    api = [t for t in todo if not (t[0] == "ct" and t[3])]
    done_api = 0
    for kind, i, j, slow in todo:
        if kind == "ct":
            text = (raw.get("chinh_ta") or [])[i].get("cau", "")
        else:
            text = ((raw.get("bai") or [])[i].get("doan") or [])[j]
        if kind == "ct" and slow:           # bản chậm: kéo giãn bản thường ngay trên máy
            cur = _ct_meta(meta, i)
            src = os.path.join(folder, str(cur.get("thuong") or ""))
            rel = "audio/ct_%d_cham.wav" % (i + 1)
            if cur.get("thuong") and os.path.isfile(src) and make_slow(src, os.path.join(folder, rel)):
                cur["cham"] = rel
                cur.pop("bo_cham", None)
                out["made"] += 1
                _write_json(meta_path, meta)
            continue
        speech = tts_text(text)
        if not speech:
            continue
        done_api += 1
        progress("Đang tạo giọng đọc %d/%d…" % (done_api, len(api)))
        if names is None:
            names = [model] if model else order_models(tts_models(client.models()), client, meta.get("tts_model"), 6)
            if not names:
                out["error"] = "Khoá này chưa dùng được giọng đọc Gemini (không thấy model TTS)."
                break
        try:
            pcm, rate, used = _speak_any(client, names, speech, voice)
        except AIError as e:
            out["error"] = str(e)
            break
        if not _plausible(pcm, rate, text):
            out.setdefault("bad", []).append("%s %d" % (kind, i + 1))
            continue
        meta["tts_model"] = used
        rel = "audio/ct_%d.wav" % (i + 1) if kind == "ct" else "audio/bai_%d_%d.wav" % (i + 1, j + 1)
        _wav(os.path.join(folder, rel), pcm, rate)
        if kind == "ct":
            cur = _ct_meta(meta, i)
            cur["thuong"] = rel
            if make_slow(os.path.join(folder, rel), os.path.join(folder, "audio/ct_%d_cham.wav" % (i + 1))):
                cur["cham"] = "audio/ct_%d_cham.wav" % (i + 1)
                cur.pop("bo_cham", None)
        else:
            while len(meta["bai"]) <= i:
                meta["bai"].append([])
            while len(meta["bai"][i]) <= j:
                meta["bai"][i].append(None)
            meta["bai"][i][j] = rel
        out["made"] += 1
        _write_json(meta_path, meta)
    out["left"] = len(audio_todo(base, date, mode))
    return out


# ---------------------------------------------------------------------------
# 1.13: giọng Gemini cho câu không có audio (câu ví dụ / từ của deck, câu báo thiếu giọng đọc)
#   user_files/bao_gemini/giong/<khoá>.wav (+ <khoá>_cham.wav), khoá = sha1(giọng | chữ)
# ---------------------------------------------------------------------------


def voice_key(speech: str, voice: str) -> str:
    return hashlib.sha1(("%s|%s" % (voice, speech)).encode("utf-8")).hexdigest()[:20]


def cached_voice(base: str, speech: str, voice: str) -> tuple[str, str | None] | None:
    if not speech:
        return None
    p = os.path.join(base, VOICE_DIR, voice_key(speech, voice) + ".wav")
    if not os.path.isfile(p):
        return None
    slow = p[:-4] + "_cham.wav"
    return p, slow if os.path.isfile(slow) else None


def make_voices(client: Gemini, base: str, speeches: list[str], voice: str, model: str = "",
                progress: Callable[[str], None] | None = None, limit: int = 8) -> dict[str, Any]:
    """Tạo giọng đọc (bản thường qua Gemini, bản chậm tại máy) cho các câu chưa có trong kho."""
    progress = progress or (lambda msg: None)
    voice = voice if voice in VOICES else VOICES[0]
    todo = [s for s in dict.fromkeys(speeches) if s and not cached_voice(base, s, voice)][:limit]
    out: dict[str, Any] = {"made": 0, "left": len(todo), "error": ""}
    if not todo:
        return out
    names = [model] if model else order_models(tts_models(client.models()), client, None, 6)
    if not names:
        out["error"] = "Khoá này chưa dùng được giọng đọc Gemini (không thấy model TTS)."
        return out
    for n, speech in enumerate(todo):
        progress("Đang tạo giọng đọc cho câu chép %d/%d…" % (n + 1, len(todo)))
        try:
            pcm, rate, used = _speak_any(client, names, speech, voice)
        except AIError as e:
            out["error"] = str(e)
            break
        names = [used] + [x for x in names if x != used]
        if not _plausible(pcm, rate, speech):
            continue
        p = os.path.join(base, VOICE_DIR, voice_key(speech, voice) + ".wav")
        _wav(p, pcm, rate)
        make_slow(p, p[:-4] + "_cham.wav")
        out["made"] += 1
    out["left"] = len([s for s in todo if not cached_voice(base, s, voice)])
    prune_voices(base)
    return out


def prune_voices(base: str, keep_days: int = 90, max_files: int = 2000) -> None:
    """Dọn kho giọng đọc: bỏ file cũ hơn 90 ngày, giữ tối đa 2000 file."""
    folder = os.path.join(base, VOICE_DIR)
    try:
        files = [os.path.join(folder, f) for f in os.listdir(folder) if f.endswith(".wav")]
    except OSError:
        return
    now = time.time()
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    for i, p in enumerate(files):
        try:
            if i >= max_files or now - os.path.getmtime(p) > keep_days * 86400:
                os.remove(p)
        except OSError:
            pass


def _wav_dur(path: str) -> float | None:
    try:
        with wave.open(path, "rb") as w:
            return w.getnframes() / float(w.getframerate() or 1)
    except (OSError, wave.Error, EOFError):
        return None


def _ct_meta(meta: dict[str, Any], i: int) -> dict[str, Any]:
    while len(meta["chinh_ta"]) <= i:
        meta["chinh_ta"].append({})
    if not isinstance(meta["chinh_ta"][i], dict):
        meta["chinh_ta"][i] = {}
    return meta["chinh_ta"][i]


# ---------------------------------------------------------------------------
# Trạng thái nhỏ (lần thử trong ngày) — user_files/bao_gemini/trang_thai.json, không đồng bộ
# ---------------------------------------------------------------------------


def load_status(base: str) -> dict[str, Any]:
    st = _read(os.path.join(base, "trang_thai.json"), {})
    return st if isinstance(st, dict) else {}


def save_status(base: str, st: dict[str, Any]) -> None:
    try:
        _write_json(os.path.join(base, "trang_thai.json"), st)
    except OSError:
        pass


def last_log(base: str, date: str) -> dict[str, Any] | None:
    raw = _read(os.path.join(base, "nhat_ky", date + ".json"), None)
    return raw if isinstance(raw, dict) else None


def log_summary(log: dict[str, Any] | None) -> list[str]:
    """Nhật ký một lần viết → vài dòng tiếng Việt cho bảng Nguồn báo."""
    if not log:
        return []
    out = []
    auto: list[str] = []
    for s in log.get("buoc", []):
        b = s.get("buoc")
        if b == "viet":
            out.append("Viết bằng %s: máy kiểm tra thấy %d lỗi." % (s.get("model", "?"), len(s.get("loi", []))))
            for e in s.get("loi", [])[:4]:
                out.append("  · " + e[:120])
        elif b == "may_sua":
            for v in s.get("viec", []):
                v = re.sub(r" của từ ngoài phạm vi .*$", " của từ ngoài phạm vi", v)
                if v not in auto:
                    auto.append(v)
        elif b == "sua":
            out.append("Gửi lại %d lỗi cho Gemini sửa (lần %d)." % (len(s.get("loi", [])), s.get("lan", 1)))
        elif b == "soat":
            n = len(s.get("van_de", []))
            out.append("Soát lần 2: " + ("không thấy lỗi." if not n else "sửa %d chỗ." % n))
            for v in s.get("van_de", [])[:6]:
                out.append("  · %s: %s" % (v.get("cho", ""), v.get("loi", "")))
        elif b == "soat_loi":
            out.append("Bản soát lần 2 còn %d lỗi máy → sửa thêm." % len(s.get("loi", [])))
        elif b == "soat_mat_tra_tu":
            out.append("Bản soát lần 2 bỏ mất chỗ bấm tra từ / từ đã học (%s → %s) → dùng bản trước khi soát." % (
                s.get("truoc", "?"), s.get("sau", "?")))
        elif b == "sua_hong":
            out.append("Bản sửa lần %s bị hỏng (JSON) → giữ bản trước." % s.get("lan", "?"))
        elif b == "viet_lai":
            out.append("Bản đầu của %s hỏng (%s) → viết lại từ đầu." % (s.get("model", "?"), s.get("ly_do", "")))
        elif b == "doi_model":
            out.append("%s không dùng được (%s) → thử model khác." % (s.get("model", "?"), s.get("ly_do", "")[:90]))
        elif b == "sua_loi_goi":
            out.append("Lượt sửa lần %s không gọi được (%s) → giữ bản hiện có." % (s.get("lan", "?"),
                                                                                 s.get("ly_do", "")[:90]))
        elif b == "dung_ban_truoc_soat":
            out.append("Bản soát lần 2 không đạt, dùng bản trước khi soát (đã sạch lỗi máy).")
        elif b == "soat_bo_qua":
            out.append("Bỏ qua soát lần 2: %s" % s.get("ly_do", ""))
        elif b == "ket_qua":
            if auto:
                out.append("Máy tự sửa (không cần gọi Gemini): " + "; ".join(auto[:6]) + ("…" if len(auto) > 6 else ""))
            out.append(("✓ Xong" if s.get("ok") else "✗ Chưa xong: " + str(s.get("loi", ""))) +
                       " (%s lượt gọi, %s giây)" % (s.get("goi", "?"), s.get("giay", "?")))
    return out
