/* ことば畑 – 1.25.3: cài đặt riêng máy này (trời & giờ, nhạc, âm lượng, tắt tiếng, cảnh màn chính, Đuổi quạ,
   hiện bản dịch, đã nhắc cấu hình trường, dải chúc mừng hôm nay).
   Trước đây chỉ nằm ở localStorage, mà Anki 26.x dựng webview bằng profile không lưu (QWebEngineProfile() không tên)
   và đổi cổng máy chủ nội bộ mỗi lần mở → tắt Anki là mất. Nay Python đặt sẵn window.__kbPrefs (config "prefs")
   trong <head> trước mọi script; ghi thì gửi pycmd("prefs:set:{…}") ngay cuối lượt xử lý (các thay đổi của cùng một lần bấm
   gộp một lệnh; 1.25.5: trước đây chờ 250 ms nên đổi xong đóng cửa sổ ngay là mất); thay đổi dồn dập (kéo thanh âm lượng)
   thì gom, tối đa một lệnh mỗi 250 ms.
   Không có Python (test bằng node / trình duyệt thường) thì vẫn dùng localStorage như cũ. */
var GardenPrefs = (function () {
  "use strict";

  const mem = {};
  const given = typeof window !== "undefined" && window.__kbPrefs && typeof window.__kbPrefs === "object" ? window.__kbPrefs : null;
  if (given) { Object.keys(given).forEach((k) => { if (typeof given[k] === "string") { mem[k] = given[k]; } }); }
  let pending = {}, timer = null, queued = false, lastSent = 0;

  function store() { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; } }

  // Trong một phiên, set() ghi cả localStorage lẫn bản nhớ nên hai nơi giống nhau; mở lại Anki thì localStorage trống
  // → lấy bản Python đưa vào. Đọc localStorage trước để chỗ nào (kể cả test) ghi thẳng localStorage vẫn có hiệu lực.
  function get(k) {
    const ls = store();
    let v = null;
    try { v = ls ? ls.getItem(k) : null; } catch (e) { v = null; }
    if (v !== null) { return v; }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    const keys = Object.keys(pending);
    if (!keys.length) { return; }
    const out = pending;
    pending = {};
    lastSent = Date.now();
    try { if (typeof pycmd === "function") { pycmd("prefs:set:" + JSON.stringify(out)); } } catch (e) { /* bỏ qua */ }
  }

  function set(k, v) {
    const val = v === null || v === undefined ? null : String(v);
    if (val === null) { delete mem[k]; } else { mem[k] = val; }
    const ls = store();
    try { if (ls) { if (val === null) { ls.removeItem(k); } else { ls.setItem(k, val); } } } catch (e) { /* bỏ qua */ }
    pending[k] = val;
    if (timer || queued) { return; }
    const wait = 250 - (Date.now() - lastSent);
    if (wait > 0) { timer = setTimeout(flush, wait); return; }
    queued = true;
    Promise.resolve().then(() => { queued = false; flush(); });
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
  }

  return {
    get: get,
    set: set,
    remove: function (k) { set(k, null); },
    flush: flush,
    // cho test
    _pending: () => Object.assign({}, pending),
    _given: () => !!given
  };
})();
