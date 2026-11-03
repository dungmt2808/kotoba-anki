"""CHỈ cho môi trường test có proxy cắt request quá 30 giây (vd. Claude Code trên web).

Đổi generateContent (chữ) sang streamGenerateContent?alt=sse rồi gộp lại thành đúng dạng phản hồi thường;
bật includeThoughts để dữ liệu chảy liên tục. Prompt, kiểm tra, sửa, chọn model, TTS giữ nguyên code add-on.
Bật bằng KB_STREAM=1. Máy người dùng không cần (add-on chờ tới 240 giây)."""
import json, socket, ssl, urllib.error, urllib.request
import ai_core as ai

_orig = ai.Gemini._request


def _request(self, method, path, body=None, timeout=ai.TEXT_TIMEOUT, model=""):
    if not (method == "POST" and path.endswith(":generateContent") and "tts" not in path):
        return _orig(self, method, path, body, timeout, model)
    body = json.loads(json.dumps(body))
    body.setdefault("generationConfig", {}).setdefault("thinkingConfig", {})["includeThoughts"] = True
    url = self.base + path.replace(":generateContent", ":streamGenerateContent") + "?alt=sse"
    req = urllib.request.Request(url, data=json.dumps(body, ensure_ascii=False).encode(), method="POST", headers={
        "x-goog-api-key": self.key, "Content-Type": "application/json", "User-Agent": "kotoba-batake-anki-addon"})
    if self._ctx is None:
        self._ctx = ai._ssl_context()
    self.calls += 1
    try:
        r = urllib.request.urlopen(req, timeout=timeout, context=self._ctx)
    except urllib.error.HTTPError as e:
        err = ai.explain_http(e.code, e.read() if e.fp else b"", model)
        if err.kind == "quota" and err.daily and model:
            self.mark_exhausted(model, err.retry_after)
            if err.quota_model:
                self.mark_exhausted(err.quota_model, err.retry_after)
        raise err from None
    except (urllib.error.URLError, socket.timeout, ConnectionError, ssl.SSLError, OSError) as e:
        raise ai.AIError("Không kết nối được tới Gemini: %s" % str(getattr(e, "reason", e))[:120], "net") from None
    think, text, fr, usage, pf, mv = [], [], None, {}, None, None
    with r:
        for line in r:
            line = line.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            ch = json.loads(line[5:])
            pf = ch.get("promptFeedback") or pf
            usage = ch.get("usageMetadata") or usage
            mv = ch.get("modelVersion") or mv
            for c in ch.get("candidates", [])[:1]:
                fr = c.get("finishReason") or fr
                for p in (c.get("content") or {}).get("parts", []):
                    if isinstance(p.get("text"), str):
                        (think if p.get("thought") else text).append(p["text"])
    parts = ([{"text": "".join(think), "thought": True}] if think else []) + ([{"text": "".join(text)}] if text else [])
    res = {"candidates": [{"content": {"parts": parts, "role": "model"}, "finishReason": fr}], "usageMetadata": usage,
           "modelVersion": mv}
    if pf:
        res["promptFeedback"] = pf
    return res


ai.Gemini._request = _request
