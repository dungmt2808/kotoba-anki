/* ことば畑 – trời & thời tiết cho khu vườn.
   3 chế độ giờ: theo giờ thật, giờ game (1 ngày = N phút), cố định.
   Thời tiết tự đổi theo từng khung 3 giờ (có thể chọn cố định).
   Các phần khác chỉ đọc GardenSky.state(). */
var GardenSky = (function () {
  "use strict";
  // 1.30.3: nền trang có hai kiểu, chọn ở ⚙ → "Nền trang" (cfg.page):
  //   "paper" Giấy ấm (mặc định) — ngày kem, chạng vạng tím hồng (+ cam lúc bình minh / hoàng hôn), đêm xanh chàm;
  //           đi qua màu tím hồng ở giữa để không ra xám đục (người dùng: "nền buổi tối màu xám không đẹp")
  //   "sky"   Trời xanh — như 1.30.2 trở về trước: xanh trời theo độ sáng
  const PAGE_DAY = "#efe2c6", PAGE_TWI = "#8a7396", PAGE_NIGHT = "#232a4a";
  // độ "ngày" của nền trang theo độ sáng: tối hẳn khi đêm, sáng hẳn từ sáng sớm, chuyển êm lúc bình minh / hoàng hôn
  function pageDay(light) { const t = Math.max(0, Math.min(1, (light - 0.3) / 0.5)); return t * t * (3 - 2 * t); }

  // Màu trời theo giờ: [giờ, màu trên, màu dưới, độ sáng 0–1]
  const KEYS = [
    [0, "#141433", "#26265a", 0.22],
    [4.6, "#1d1f4d", "#33366e", 0.28],
    [5.5, "#5b4f8f", "#ff9f8a", 0.5],
    [6.6, "#78b8f0", "#ffd9a8", 0.78],
    [8.5, "#6ec6ff", "#c4ecff", 0.95],
    [12, "#58b9ff", "#bfe9ff", 1],
    [15.5, "#6ec6ff", "#d2efff", 0.97],
    [17.2, "#7fb0ea", "#ffd0a0", 0.86],
    [18.2, "#f28a6a", "#ffc27a", 0.7],
    [19.1, "#5a4a8a", "#ff9f8a", 0.48],
    [20.3, "#24245a", "#3b3b7a", 0.3],
    [24, "#141433", "#26265a", 0.22]
  ];
  const WEATHER = {
    sunny: { label: "Nắng", icon: "sun", clouds: 2, grey: 0, rain: 0, snow: 0, dim: 0 },
    cloudy: { label: "Nhiều mây", icon: "cloud", clouds: 6, grey: 0.35, rain: 0, snow: 0, dim: 0.08 },
    rain: { label: "Mưa", icon: "rain", clouds: 7, grey: 0.55, rain: 1, snow: 0, dim: 0.15 },
    storm: { label: "Giông", icon: "storm", clouds: 9, grey: 0.72, rain: 1.8, snow: 0, dim: 0.25 },
    snow: { label: "Tuyết", icon: "snow", clouds: 5, grey: 0.4, rain: 0, snow: 1, dim: 0.06 }
  };
  const PHASE_LABEL = { night: "Ban đêm", dawn: "Bình minh", morning: "Buổi sáng", noon: "Buổi trưa",
    afternoon: "Buổi chiều", dusk: "Hoàng hôn" };

  const DEFAULTS = { mode: "real", dayMinutes: 24, fixedHour: 9, weather: "auto", page: "paper" };
  let cfg = Object.assign({}, DEFAULTS);
  // 1.25.3: đọc qua GardenPrefs (config của add-on) — localStorage mất khi tắt Anki; giá trị lạ thì về mặc định
  function clean(s) {
    const out = Object.assign({}, DEFAULTS);
    if (!s || typeof s !== "object") { return out; }
    if (["real", "game", "fixed"].indexOf(s.mode) >= 0) { out.mode = s.mode; }
    const dm = Number(s.dayMinutes);
    if (isFinite(dm) && dm >= 2 && dm <= 1440) { out.dayMinutes = Math.round(dm); }
    const fh = Number(s.fixedHour);
    if (s.fixedHour !== null && s.fixedHour !== "" && isFinite(fh) && fh >= 0 && fh < 24) { out.fixedHour = fh; }
    if (s.weather === "auto" || (typeof s.weather === "string" && Object.prototype.hasOwnProperty.call(WEATHER, s.weather))) { out.weather = s.weather; }
    if (s.page === "paper" || s.page === "sky") { out.page = s.page; }
    return out;
  }
  function loadRaw() {
    try { return typeof GardenPrefs !== "undefined" ? GardenPrefs.get("kb-sky") : localStorage.getItem("kb-sky"); } catch (e) { return null; }
  }
  try { cfg = clean(JSON.parse(loadRaw() || "{}")); } catch (e) { /* dùng mặc định */ }

  // ---- tiện ích màu ----
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function toHex(a) { return "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return toHex(a.map((v, i) => v + (b[i] - v) * t)); }
  function shade(c, k) { return toHex(hex(c).map((v) => v * k)); }
  function pageColor(light, phase, grey) {
    if (cfg.page === "sky") { return mix(shade("#6ec6ff", 0.35 + 0.65 * light), "#9aa6b8", grey * 0.6); }
    const t = pageDay(light);
    let c = t < 0.5 ? mix(PAGE_NIGHT, PAGE_TWI, t * 2) : mix(PAGE_TWI, PAGE_DAY, (t - 0.5) * 2);
    if (phase === "dusk" || phase === "dawn") { c = mix(c, "#e9a77e", 0.3); }
    return mix(c, "#b3aca3", grey * 0.5 * (0.3 + 0.7 * t));      // mưa / mây: xám nhẹ, ban đêm vẫn giữ màu chàm
  }

  // ---- giờ ----
  function hourNow(t) {
    t = t || Date.now();
    if (cfg.mode === "fixed") { return Number(cfg.fixedHour) || 0; }
    if (cfg.mode === "game") {
      const len = Math.max(2, Number(cfg.dayMinutes) || 24) * 60000;
      return ((t % len) / len) * 24;
    }
    const d = new Date(t);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }
  function phaseOf(h) {
    if (h < 5) { return "night"; }
    if (h < 7) { return "dawn"; }
    if (h < 11) { return "morning"; }
    if (h < 14) { return "noon"; }
    if (h < 17.5) { return "afternoon"; }
    if (h < 19.6) { return "dusk"; }
    return "night";
  }

  // ---- thời tiết: tự đổi mỗi khung 3 giờ, ổn định trong khung ----
  function rand(seed) {
    let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function weatherAuto(t) {
    let key, month;
    if (cfg.mode === "game") {
      const len = Math.max(2, Number(cfg.dayMinutes) || 24) * 60000;
      const block = Math.floor(t / (len / 8));          // 8 khung 3 giờ mỗi ngày game
      key = block; month = (Math.floor(t / len) % 12) + 1;
    } else {
      const d = new Date(t);
      key = (d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate()) * 8 + Math.floor(d.getHours() / 3);
      month = d.getMonth() + 1;
    }
    const r = rand(key);
    const rainy = month >= 5 && month <= 10;           // mùa mưa
    const winter = month === 12 || month <= 2;
    const table = [["sunny", rainy ? 0.36 : 0.5], ["cloudy", 0.24], ["rain", rainy ? 0.28 : 0.16],
      ["storm", rainy ? 0.08 : 0.03], ["snow", winter ? 0.08 : 0]];
    // giao diện theo mùa có thể nghiêng thời tiết: mùa mưa hay mưa, Giáng sinh / mùa đông hay có tuyết
    const bias = typeof GardenSeason !== "undefined" && GardenSeason && GardenSeason.weatherBias ? GardenSeason.weatherBias() : null;
    if (bias && bias.rain) { table[2][1] *= bias.rain; table[3][1] *= Math.sqrt(bias.rain); table[0][1] /= Math.sqrt(bias.rain); }
    if (bias && bias.snow) { table[4][1] += bias.snow; }
    const total = table.reduce((s, x) => s + x[1], 0);
    let acc = 0;
    for (let i = 0; i < table.length; i++) {
      acc += table[i][1] / total;
      if (r < acc) { return table[i][0]; }
    }
    return "sunny";
  }

  let cache = null, cacheAt = 0, flashUntil = 0, nextFlash = 0;
  let wetSeenAt = 0;            // lần cuối thấy mưa / giông (để hiện cầu vồng khi vừa tạnh)
  const RAINBOW_MS = 150000;    // cầu vồng mờ dần trong 2,5 phút

  // Độ đậm cầu vồng 0–1: vừa tạnh mưa (đang mở vườn), hoặc khung 3 giờ trước mưa mà giờ đã quang.
  function rainbowOf(t, weather, light, wet) {
    if (wet) { wetSeenAt = t; return 0; }
    if (weather === "snow" || light < 0.55) { return 0; }
    if (wetSeenAt && t - wetSeenAt < RAINBOW_MS) { return 1 - (t - wetSeenAt) / RAINBOW_MS; }
    if (cfg.weather !== "auto") { return 0; }
    let block, frac;
    if (cfg.mode === "game") {
      const len = Math.max(2, Number(cfg.dayMinutes) || 24) * 60000;
      block = len / 8; frac = (t % block) / block;
    } else {
      const d = new Date(t);
      block = 3 * 3600000; frac = ((d.getHours() % 3) + d.getMinutes() / 60) / 3;
    }
    const prev = weatherAuto(t - block);
    return (prev === "rain" || prev === "storm") && frac < 0.3 ? 1 - frac / 0.3 : 0;
  }
  const listeners = [];
  let lastKey = "";

  function compute(t) {
    const h = hourNow(t);
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) { i++; }
    const a = KEYS[i], b = KEYS[i + 1];
    const k = (h - a[0]) / (b[0] - a[0] || 1);
    const weather = cfg.weather !== "auto" && WEATHER[cfg.weather] ? cfg.weather : weatherAuto(t);
    const W = WEATHER[weather];
    let light = a[3] + (b[3] - a[3]) * k;
    let top = mix(a[1], b[1], k), bottom = mix(a[2], b[2], k);
    if (W.grey) {
      const g = light > 0.5 ? "#8a94a6" : "#3a3f55";
      top = mix(top, g, W.grey); bottom = mix(bottom, light > 0.5 ? "#b8c0cc" : "#4a5068", W.grey);
    }
    light = Math.max(0.15, light - W.dim);
    const phase = phaseOf(h);
    // chớp khi giông
    if (weather === "storm" && t > nextFlash) {
      nextFlash = t + 3500 + rand(Math.floor(t / 1000)) * 7000;
      flashUntil = t + 180;
    }
    const sunK = (h - 5.8) / (18.8 - 5.8);
    const moonH = h >= 18 ? h - 18 : h + 6;                // 18h → 6h hôm sau
    const night = light < 0.45;
    const clearNight = weather === "sunny" && night;     // đêm không mây: "Trời quang", không phải "Nắng"
    const fieldDark = Math.min(0.5, Math.max(0, 0.6 - light) / 0.45 * 0.45);
    const rainbow = rainbowOf(t, weather, light, weather === "rain" || weather === "storm");
    return {
      hour: h, phase: phase, phaseLabel: PHASE_LABEL[phase], weather: weather,
      weatherLabel: clearNight ? "Trời quang" : W.label, icon: clearNight ? "moon" : W.icon,
      top: top, bottom: bottom, light: light, night: night, fieldDark: fieldDark,
      field: mix("#5ed35e", "#0b0b2a", fieldDark),
      tod: light < 0.45 ? "night" : (phase === "dawn" || phase === "dusk") ? "dusk" : "day",
      clouds: W.clouds, rain: W.rain, snow: W.snow, flash: t < flashUntil ? 1 - (flashUntil - t) / 180 : 0,
      sun: sunK > 0 && sunK < 1 ? { x: sunK, y: Math.sin(Math.PI * sunK) } : null,
      moon: moonH >= 0.6 && moonH <= 11.4 ? { x: moonH / 12, y: Math.sin(Math.PI * moonH / 12) } : null,
      ground: mix(shade("#5ed35e", 0.45 + 0.55 * light), "#e8f0f6", W.snow ? 0.75 : 0),
      grass: shade("#45bf4a", 0.45 + 0.55 * light),
      hills: mix(shade("#7ed98a", 0.4 + 0.6 * light), "#f2f6fa", W.snow ? 0.7 : 0),
      page: pageColor(light, phase, W.grey), pageMode: cfg.page,
      mode: cfg.mode, rainbow: rainbow
    };
  }

  function state() {
    const t = Date.now();
    if (!cache || t - cacheAt > 200) {
      cache = compute(t); cacheAt = t;
      const key = cache.phase + "|" + cache.weather;
      if (key !== lastKey) {
        const prev = lastKey;
        lastKey = key;
        if (prev) { listeners.forEach((fn) => { try { fn(cache, prev); } catch (e) { /* bỏ qua */ } }); }
      }
    }
    return cache;
  }

  function save() {
    try {
      const v = JSON.stringify(cfg);
      if (typeof GardenPrefs !== "undefined") { GardenPrefs.set("kb-sky", v); } else { localStorage.setItem("kb-sky", v); }
    } catch (e) { /* bỏ qua */ }
  }

  return {
    state: state,
    settings: () => Object.assign({}, cfg),
    set: function (k, v) { const next = Object.assign({}, cfg); next[k] = v; cfg = clean(next); save(); cache = null; return state(); },
    onChange: function (fn) { listeners.push(fn); },
    mix: mix, shade: shade,
    WEATHER: WEATHER, PHASE_LABEL: PHASE_LABEL,
    // cho test
    _compute: compute, _weatherAuto: weatherAuto
  };
})();
