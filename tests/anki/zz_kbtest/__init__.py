"""Add-on chỉ dùng để test: nhận đoạn Python qua HTTP 127.0.0.1:9444 rồi chạy ở luồng chính của Anki;
ghi lại mọi lệnh phát âm thanh (máy test không có loa / mpv)."""
import json, os, threading, time, traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from aqt import mw, gui_hooks
from aqt.sound import av_player

LOG = []


def _play_tags(tags):
    for t in tags:
        LOG.append({"t": round(time.time(), 2), "tag": repr(t)})


av_player.play_tags = _play_tags
av_player.stop_and_clear_queue = lambda: LOG.append({"t": round(time.time(), 2), "tag": "STOP"})


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        code = self.rfile.read(int(self.headers["Content-Length"])).decode("utf-8")
        box, ev = {}, threading.Event()

        def run():
            try:
                g = {"mw": mw, "LOG": LOG, "json": json, "os": os}
                exec(code, g)
                box["r"] = g.get("result")
            except Exception:
                box["err"] = traceback.format_exc()
            ev.set()
        mw.taskman.run_on_main(run)
        ev.wait(120)
        out = json.dumps(box, default=str, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(out)


def _start():
    srv = HTTPServer(("127.0.0.1", int(os.environ.get("KB_CTRL_PORT", "9444"))), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()


gui_hooks.profile_did_open.append(_start)
