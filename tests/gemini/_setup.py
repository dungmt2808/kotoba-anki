"""Dùng chung cho các script Gemini thật: nạp add-on, khoá, (tuỳ chọn) đường truyền streaming."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))


def load(addon: str):
    sys.path.insert(0, os.path.abspath(addon))
    try:
        import anki.collection  # noqa: F401
    except ImportError:
        sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
    import ai_core as ai
    if os.environ.get("KB_STREAM") == "1":      # môi trường có proxy cắt request > 30 s
        import stream_patch  # noqa: F401
    return ai


def key() -> str:
    """Khoá lấy từ GEMINI_API_KEY (không bao giờ ghi ra file). Môi trường có proxy tự chèn khoá thì để trống."""
    return os.environ.get("GEMINI_API_KEY") or "AIzaDUMMY-proxy-injects-the-real-key-00"
