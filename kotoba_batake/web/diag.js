/* ことば畑 1.11 – Báo lỗi: bắt lỗi JavaScript của trang vườn, gộp lỗi trùng, gửi sang Python ghi nhật ký
   (user_files/errors.json). Nạp đầu tiên để bắt cả lỗi của các file sau. Không gửi gì lên mạng. */
var GardenDiag = (function () {
  "use strict";

  var MAX = 30;             // mỗi lần mở vườn gửi tối đa 30 lỗi khác nhau (lỗi lặp mỗi khung hình chỉ gửi 1 lần)
  var seen = {};
  var count = 0;
  var listeners = [];

  function send(cmd, tries) {
    tries = tries || 0;
    if (typeof pycmd === "function") {
      try { pycmd(cmd); } catch (e) { /* không làm gì */ }
    } else if (tries < 100) {
      setTimeout(function () { send(cmd, tries + 1); }, 50);
    }
  }

  function file(src) {
    src = String(src || "");
    return src.split("?")[0].split("/").pop().slice(0, 60);
  }

  function report(msg, src, line, col, stack) {
    msg = String(msg || "").slice(0, 300);
    var key = msg + "|" + file(src) + "|" + (line || 0);
    if (seen[key] || count >= MAX) { return false; }
    seen[key] = true;
    count++;
    send("app:jserr:" + JSON.stringify({
      msg: msg, src: file(src), line: line || 0, col: col || 0, stack: String(stack || "").slice(0, 3000)
    }));
    var first = count === 1;
    listeners.forEach(function (fn) { try { fn(first, msg); } catch (e) { /* bỏ qua */ } });
    return true;
  }

  window.addEventListener("error", function (e) {
    if (!e || !e.message) { return; }     // lỗi tải ảnh / file không có message: bỏ qua
    report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    report("Promise: " + ((r && r.message) || String(r)), "", 0, 0, r && r.stack);
  });

  // Thông tin phía trang cho báo cáo (không có nội dung thẻ / tên deck)
  function client(extra) {
    var out = {
      w: window.innerWidth, h: window.innerHeight,
      sw: (window.screen && screen.width) || 0, sh: (window.screen && screen.height) || 0,
      dpr: window.devicePixelRatio || 1, ua: navigator.userAgent
    };
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  return {
    onError: function (fn) { listeners.push(fn); },
    count: function () { return count; },
    client: client,
    report: report,
    send: send
  };
})();
