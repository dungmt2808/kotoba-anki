/* ことば畑 – 1.14: hiệu ứng thành tích của vườn. Python tính (data.joy): xong hết thẻ hôm nay, đạt mục tiêu ngày,
   cả vườn xanh / ra hoa / ra quả, chuỗi ngày ôn (mốc 7, 14, 30, 100… ngày), xong 3 nhiệm vụ. File này chỉ vẽ:
   huy hiệu cạnh chú thích ruộng, dải chúc mừng (mỗi thành tích một lần mỗi ngày), hiệu ứng trên ruộng và trên sân. */
var GardenJoy = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let G = null;
  let joy = null, prev = null;
  let doneAt = 0;           // lúc thấy "xong thẻ" (cầu vồng hiện ~25 giây rồi mờ dần)
  const motes = [], petals = [];

  function hash(n) { const s = Math.sin(n * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); }
  function on() { return typeof GardenUI === "undefined" || !GardenUI.allow || GardenUI.allow("joy"); }

  const GROWN = {
    green: ["leaf", "Cả vườn xanh tốt", "Mọi cây đã thành cây non!", "is-done"],
    flower: ["blossom", "Cả vườn ra hoa", "Mọi cây đều đã ra hoa — trí nhớ bền ghê!", "is-pink"],
    fruit: ["apple", "Cả vườn trĩu quả", "Mọi cây đều ra quả! Mùa thu hoạch rồi", "is-gold"]
  };
  function badges(j) {
    const out = [];
    if (j.done) { out.push(["rainbow", "Xong thẻ hôm nay", "is-done", "done", "Tưới xong cả vườn hôm nay rồi! お疲れさま"]); }
    else if (j.goal) { out.push(["target", "Đạt mục tiêu ngày", "is-done", "goal", "Đạt mục tiêu hôm nay! すごい"]); }
    if (j.done && j.goal) { out.push(["target", "Đạt mục tiêu", "is-done", "goal", null]); }
    if (j.grown && GROWN[j.grown]) { const g = GROWN[j.grown]; out.push([g[0], g[1], g[3], "grown-" + j.grown, g[2]]); }
    if (j.streak_mark) { out.push(["firework", j.streak + " ngày liền!", "is-gold", "streak", "Mốc " + j.streak + " ngày ôn liên tiếp! おめでとう"]); }
    else if (j.streak >= 3) { out.push(["fire", j.streak + " ngày liền", "", "", null]); }
    if (j.quests) { out.push(["gift", "Xong 3 nhiệm vụ", "is-pink", "quests", "Xong cả 3 nhiệm vụ hôm nay! Thả đèn trời nào"]); }
    return out;
  }
  function drawBadges() {
    const box = $("kb-joy");
    if (!box) { return; }
    box.textContent = "";
    if (!joy) { return; }
    badges(joy).forEach(([ic, text, cls]) => {
      const b = document.createElement("span");
      b.className = "kb-joy-b " + (cls || "");
      b.appendChild(GardenIcons.el(ic));
      b.appendChild(document.createTextNode(text));
      box.appendChild(b);
    });
  }
  // dải chúc mừng: mỗi thành tích chỉ một lần mỗi ngày (nhớ trên máy này)
  function seen(day, key) {
    try { return localStorage.getItem("kb-joy-" + day + "-" + key) === "1"; } catch (e) { return false; }
  }
  function mark(day, key) {
    try { localStorage.setItem("kb-joy-" + day + "-" + key, "1"); } catch (e) { /* bỏ qua */ }
  }
  let bannerTimer = null;
  function banner(text) {
    const field = $("kb-field");
    if (!field) { return; }
    let b = $("kb-joy-banner");
    if (!b) { b = document.createElement("div"); b.id = "kb-joy-banner"; b.className = "kb-joy-banner"; field.appendChild(b); }
    GardenIcons.fill(b, text);
    b.hidden = false;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; }, 4800);
  }
  function celebrate() {
    if (!joy || joy.day === null || joy.day === undefined) { return; }
    // đang ôn thẻ / đã tắt hiệu ứng: để dành, hiện khi về màn chính (bảng ôn đóng thì ui.js báo kb-ui-change)
    if (!on() || (typeof GardenUI !== "undefined" && GardenUI.mode && GardenUI.mode() === "review")) { return; }
    const list = badges(joy).filter((b) => b[3] && b[4] && !seen(joy.day, b[3]));
    if (!list.length) { return; }
    list.forEach((b) => mark(joy.day, b[3]));
    const top = list[0];
    banner("[i:" + top[0] + "] " + top[4]);       // 1.17.3: top[0] là tên icon pixel, không phải chữ
    if (typeof GardenFX !== "undefined") {
      GardenFX.mood("star", 2400);
      if (GardenFX.say) { GardenFX.say(top[4].split("!")[0] + "!", 2600); }
      if (GardenFX.sound) { GardenFX.sound("done"); }
    }
  }

  // ---- ruộng (fx.js gọi sau các hiệu ứng khác) ----
  function drawField(ctx, W, H, now, s, tileCenter) {
    if (!joy || !G) { return; }
    const d = G.data(), plants = (d && d.plants) || [];
    const sk = typeof GardenSky !== "undefined" ? GardenSky.state() : null;
    const wet = sk && (sk.rain || sk.snow);
    if (joy.done) {
      if (!doneAt) { doneAt = now; }
      const age = (now - doneAt) / 1000;
      if (age < 30 && !wet && (!sk || sk.light > 0.45)) {       // cầu vồng góc trên phải ruộng, mờ dần
        const k = age < 2 ? age / 2 : age > 24 ? Math.max(0, (30 - age) / 6) : 1;
        // 1.15: cả vòm nằm trong ruộng (đỉnh cách mép trên ~8 điểm ảnh), hai chân mờ đi thay vì cắt ngang
        const R = Math.max(18 * s, Math.min(W * 0.16, 46 * s, H * 0.7)), cx = W * 0.78, cy = 8 * s + R;
        ["#ff4f6d", "#ff9f1c", "#ffd23f", "#6be08a", "#3d8bff", "#c77dff"].forEach((c, i) => {
          ctx.strokeStyle = c; ctx.lineWidth = s * 1.4;
          [[1.0, 1.1, 0.12], [1.1, 1.9, 0.33], [1.9, 2.0, 0.12]].forEach(([a0, a1, al]) => {
            ctx.globalAlpha = al * k;
            ctx.beginPath(); ctx.arc(cx, cy, R - i * s * 1.4, Math.PI * a0, Math.PI * a1); ctx.stroke();
          });
        });
        ctx.globalAlpha = 1;
      }
      // giọt sương lấp lánh trên lá
      if (plants.length && tileCenter) {
        const n = Math.min(6, 1 + Math.floor(plants.length / 30));
        for (let i = 0; i < n; i++) {
          const per = 1400 + i * 230, cyc = Math.floor((now + i * 511) / per), ph = ((now + i * 511) % per) / per;
          const idx = Math.floor(hash(cyc * 7 + i) * plants.length), c = tileCenter(idx);
          if (ph < 0.5) {
            ctx.globalAlpha = 1 - ph * 2; ctx.fillStyle = "#e9f7ff";
            ctx.fillRect(Math.round((c.x - 3) * s), Math.round((c.y - 4) * s), s, s);
            ctx.fillStyle = "#8fd3ff"; ctx.fillRect(Math.round((c.x - 3) * s), Math.round((c.y - 3) * s), s, s);
          }
        }
        ctx.globalAlpha = 1;
      }
    } else { doneAt = 0; }
    if (joy.grown === "flower" && !wet) {      // cánh hoa anh đào bay ngang ruộng
      const Wa = W / s, Ha = H / s, n = Math.min(24, Math.round(Wa * Ha / 2400) + 6);
      while (petals.length < n) { petals.push({ seed: petals.length * 13.7 + 1 }); }
      for (let i = 0; i < n; i++) {
        const p = petals[i], sp = 0.006 + hash(p.seed) * 0.006;
        const x = ((hash(p.seed + 1) * Wa + now * sp * 1.6) % (Wa + 10)) - 5;
        const y = ((hash(p.seed + 2) * Ha + now * sp) % (Ha + 10)) - 5 + Math.sin(now / 700 + i) * 2;
        ctx.fillStyle = i % 3 ? "#ffc4d6" : "#ff7fa0";
        ctx.fillRect(Math.round(x * s), Math.round(y * s), 2 * s, s);
        if (i % 2) { ctx.fillRect(Math.round((x + 1) * s), Math.round((y + 1) * s), s, s); }
      }
    }
    if (joy.grown === "fruit" && tileCenter && plants.length) {      // đốm sáng vàng bay lên từ các cây
      const n = Math.min(16, 4 + Math.floor(plants.length / 20));
      while (motes.length < n) { motes.push({ seed: motes.length * 7.3 + 3 }); }
      for (let i = 0; i < n; i++) {
        const m = motes[i], per = 3200 + hash(m.seed) * 2400, ph = ((now + m.seed * 997) % per) / per, cyc = Math.floor((now + m.seed * 997) / per);
        const c = tileCenter(Math.floor(hash(cyc * 3 + m.seed) * plants.length));
        const x = c.x + Math.sin(ph * 6 + i) * 3, y = c.y - 4 - ph * 22;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
        ctx.fillStyle = "#fff6a8"; ctx.fillRect(Math.round((x - 1) * s), Math.round((y - 1) * s), 3 * s, 3 * s);
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(Math.round(x * s), Math.round(y * s), s, s);
      }
      ctx.globalAlpha = 1;
    }
    if (joy.grown === "green" && tileCenter && plants.length && Math.floor(now / 900) % 2 === 0) {
      const idx = Math.floor(hash(Math.floor(now / 900)) * plants.length), c = tileCenter(idx);
      ctx.fillStyle = "#b8e05a"; ctx.fillRect(Math.round((c.x + 3) * s), Math.round((c.y - 7) * s), s, s);
    }
  }

  // ---- sân (home.js gọi trước lớp mưa / đêm) ----
  function firework(ctx, S, ox, oy, x, y, now, per, col, seed) {
    const ph = ((now + seed) % per) / per;
    if (ph > 0.55) { return; }
    const k = ph / 0.55, r = 2 + k * 9;
    ctx.globalAlpha = 1 - k * 0.8;
    ctx.fillStyle = col;
    for (let a = 0; a < 10; a++) {
      const ang = a / 10 * Math.PI * 2 + seed;
      ctx.fillRect(Math.round((ox + x + Math.cos(ang) * r) * S), Math.round((oy + y + Math.sin(ang) * r + k * k * 3) * S), S, S);
    }
    ctx.globalAlpha = 1;
  }
  function drawYard(ctx, S, ox, oy, now, x0, x1, skyH, st) {
    if (!joy) { return; }
    const W = x1 - x0, night = st && st.light < 0.6;
    if (joy.streak_mark) {
      const cols = ["#ff4f6d", "#ffd23f", "#8fd3ff", "#c77dff", "#6be08a"];
      for (let i = 0; i < 4; i++) {
        const per = 2200 + i * 370, cyc = Math.floor((now + i * 977) / per);
        const x = x0 + 70 + hash(cyc * 5 + i) * (W - 90), y = 6 + hash(cyc * 11 + i) * 12;
        firework(ctx, S, ox, oy, x, y, now, per, cols[(cyc + i) % cols.length], i * 977);
      }
    }
    if (joy.quests) {       // đèn trời bay lên
      for (let i = 0; i < 5; i++) {
        const per = 16000 + i * 2300, ph = ((now + i * 4100) % per) / per;
        const x = x0 + 80 + hash(i * 3 + 1) * (W - 100) + Math.sin(now / 1500 + i) * 3, y = skyH + 6 - ph * (skyH + 14);
        ctx.globalAlpha = night ? 0.25 : 0.12; ctx.fillStyle = "#ffd23f";
        ctx.fillRect(Math.round((ox + x - 2) * S), Math.round((oy + y - 2) * S), 7 * S, 8 * S);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), 3 * S, 4 * S);
        ctx.fillStyle = night ? "#ffb347" : "#ff9f1c"; ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), 3 * S, 3 * S);
        ctx.fillStyle = "#fff6a8"; ctx.fillRect(Math.round((ox + x + 1) * S), Math.round((oy + y + 2) * S), S, S);
      }
    }
    if (joy.done && st && !st.rain && !st.snow && st.light > 0.45) {    // cầu vồng nhỏ trên trời sân
      const cx = Math.min(x0 + W * 0.8, 206), cy = skyH + 2, R = 22;     // trong khung cảnh 256 điểm (không nấp sau thẻ Hôm nay)
      ["#ff4f6d", "#ff9f1c", "#ffd23f", "#6be08a", "#3d8bff", "#c77dff"].forEach((c, i) => {
        ctx.globalAlpha = 0.28; ctx.strokeStyle = c; ctx.lineWidth = S;
        ctx.beginPath(); ctx.arc((ox + cx) * S, (oy + cy) * S, (R - i) * S, Math.PI, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  return {
    init: function (helpers) { G = helpers; window.addEventListener("kb-ui-change", () => { if (joy) { celebrate(); } }); },
    render: function (j) {
      prev = joy; joy = j || null;
      drawBadges();
      celebrate();
    },
    drawField: drawField,
    drawYard: drawYard,
    state: () => joy,
    _prev: () => prev
  };
})();
