/* ことば畑 – 1.25.5: bản sửa hình gốc (chế độ admin).
   Python đặt window.__kbFix = {"<nhóm>:<id>": {khung: [hàng]}} (gói + máy người sửa, xem mau_core.py) trước mọi script.
   Mỗi file hình đăng ký nhóm của mình: do (home.js), thu (pets.js), giong (seeds.js), khach (guests.js).
   Bản sửa chỉ được áp khi cùng cỡ với hình gốc và mọi màu có trong bảng màu của nhóm; hình gốc giữ lại để "Về gốc". */
var GardenFix = (function () {
  "use strict";

  let fixes = {};
  const groups = {};   // nhóm → {frames(id) → {khung: hàng}, set(id, khung, hàng), pal(id)}
  const orig = {};     // khoá → {khung: hàng gốc} (lấy lúc áp bản sửa lần đầu)
  const LABEL = {
    thu: { walk0: "Đi 1", walk1: "Đi 2", sit: "Ngồi", sleep: "Ngủ" },
    giong: { 0: "Hạt", 1: "Mầm", 2: "Cây non", 3: "Ra hoa", 4: "Ra quả" }
  };

  function load(src) {
    fixes = {};
    if (!src || typeof src !== "object") { return; }
    Object.keys(src).forEach((k) => { if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) { fixes[k] = src[k]; } });
  }
  load(typeof window !== "undefined" ? window.__kbFix : null);

  const isRows = (r) => Array.isArray(r) && r.length > 0 && typeof r[0] === "string";
  function fits(rows, base, pal) {
    return isRows(rows) && rows.length === base.length && rows.every((r) => typeof r === "string" && r.length === base[0].length &&
      r.split("").every((c) => c === "." || pal[c] !== undefined));
  }
  function current(group, id) {
    const api = groups[group];
    if (!api) { return {}; }
    try { return api.frames(id) || {}; } catch (e) { return {}; }
  }
  function original(group, id) { return orig[group + ":" + id] || current(group, id); }

  function applyKey(group, id) {
    const api = groups[group], k = group + ":" + id, fx = fixes[k];
    if (!api) { return; }
    const cur = current(group, id);
    if (!Object.keys(cur).length) { return; }
    if (!orig[k]) {
      if (!fx) { return; }
      orig[k] = Object.assign({}, cur);
    }
    const base = orig[k], pal = api.pal(id) || {};
    Object.keys(base).forEach((name) => {
      const want = fx && fits(fx[name], base[name], pal) ? fx[name].slice() : base[name];
      if (cur[name] !== want) { try { api.set(id, name, want); } catch (e) { /* bỏ qua */ } }
    });
  }
  function applyGroup(group) {
    const seen = {};
    Object.keys(fixes).concat(Object.keys(orig)).forEach((k) => {
      const i = k.indexOf(":");
      if (i > 0 && k.slice(0, i) === group && !seen[k]) { seen[k] = 1; applyKey(group, k.slice(i + 1)); }
    });
  }

  return {
    register: function (group, api) { groups[group] = api; applyGroup(group); },
    // Python gửi bộ bản sửa mới (sau Lưu / Về gốc / Nhập file): áp lại mọi nhóm, hình không còn bản sửa về gốc
    set: function (src) { load(src); Object.keys(groups).forEach(applyGroup); },
    has: function (group, id) { return !!fixes[group + ":" + id]; },
    editable: function (group, id) { return Object.keys(current(group, id)).length > 0; },
    frames: current,
    original: original,
    pal: function (group, id) { return groups[group] ? groups[group].pal(id) || {} : {}; },
    label: function (group, name, i) {
      if (group === "do") { return name === "spr" ? "Chính" : name === "base" ? "Tĩnh" : "Khung " + name.slice(1); }
      return (LABEL[group] && LABEL[group][name]) || String(i + 1);
    },
    count: function () { return Object.keys(fixes).length; },
    _fixes: function () { return fixes; }
  };
})();
