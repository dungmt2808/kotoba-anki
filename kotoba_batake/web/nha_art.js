/* ことば畑 – 1.24: nhà 3 gian — hình 12 món của Bếp / Phòng ngủ; 1.25: nền cả ba gian theo kiểu nhà.
   home.js gọi GardenNhaArt.install(L) sau khi dựng sprite của mình (như rare_art.js); file này thêm sprite vào SPR,
   đồ phát sáng (GLOW) và trả về: ids, frameOf, emit, pal, bg (tường + sàn một gian theo kiểu nhà), post (cột ngăn / tường
   ngoài), ROOF (màu mái theo kiểu nhà). */
var GardenNhaArt = (function () {
  "use strict";

  function install(L) {
    const { grid, rect, disc, dot, outline, rows, SPR, GLOW, P, box } = L;
    const ALT = L.ALT || {};      // 1.25.9: khung thay thế (sửa được ở Sửa hình / Góp ý hình)
    const ol = (g) => rows(outline(g));
    const IDS = ["reizouko", "nagashi", "shokutaku", "suihanki", "shokkidana", "yasaikago",
      "beddo", "tansu", "nightlamp", "kyodai", "dakimakura", "hoshizora"];

    // ---------------------------------------------------------------- Tủ lạnh (hé cửa, đèn trong sáng)
    function fridge(open) {
      const g = grid(15, 28);
      rect(g, 1, 0, 13, 28, "w");
      rect(g, 1, 9, 13, 1, "s");                       // khe giữa ngăn đá / ngăn mát
      rect(g, 11, 3, 1, 4, "S"); rect(g, 11, 12, 1, 7, "S");   // tay nắm
      rect(g, 1, 26, 13, 2, "S");
      dot(g, 3, 2, "d");                               // đèn báo
      rect(g, 3, 12, 4, 3, "y"); dot(g, 4, 13, "r");   // giấy nhớ
      if (open) {
        rect(g, 2, 10, 10, 15, "c");                   // bên trong sáng
        rect(g, 2, 15, 10, 1, "s"); rect(g, 2, 20, 10, 1, "s");
        rect(g, 3, 12, 3, 3, "g"); rect(g, 7, 12, 3, 3, "r"); rect(g, 3, 17, 2, 3, "l"); rect(g, 6, 17, 4, 2, "o");
        rect(g, 12, 10, 3, 16, "s");                   // cánh cửa hé
      }
      return ol(g);
    }
    SPR.reizouko = fridge(false);
    ALT.reizouko = { mo: fridge(true) };

    // ---------------------------------------------------------------- Bếp + bồn rửa (nồi canh bốc hơi)
    SPR.nagashi = (function () {
      const g = grid(32, 19);
      rect(g, 0, 7, 32, 12, "s");                      // tủ dưới
      rect(g, 0, 5, 32, 2, "S");                       // mặt bếp
      [2, 10, 18, 26].forEach((x) => { rect(g, x, 9, 6, 8, "w"); dot(g, x + 3, 12, "S"); });
      rect(g, 3, 3, 3, 2, "n"); rect(g, 9, 3, 3, 2, "n");     // bếp ga
      rect(g, 2, 0, 7, 3, "r"); rect(g, 1, 1, 9, 1, "R"); dot(g, 5, 0, "k");   // nồi
      rect(g, 19, 4, 10, 2, "l");                      // bồn rửa
      rect(g, 25, 0, 1, 4, "S"); rect(g, 22, 0, 4, 1, "S");   // vòi
      dot(g, 14, 4, "g"); dot(g, 15, 4, "g"); dot(g, 15, 3, "G");   // chai nước rửa
      return ol(g);
    })();

    // ---------------------------------------------------------------- Bàn ăn (bữa sáng kiểu Nhật)
    SPR.shokutaku = (function () {
      const g = grid(30, 14);
      rect(g, 0, 5, 30, 3, "t"); rect(g, 0, 7, 30, 1, "b");
      rect(g, 2, 8, 2, 6, "b"); rect(g, 26, 8, 2, 6, "b");
      disc(g, 5, 2, 2, "w"); rect(g, 3, 1, 5, 1, "w"); dot(g, 5, 1, "c");   // bát cơm
      disc(g, 12, 2, 2, "R"); rect(g, 10, 1, 5, 1, "h");                     // canh miso
      rect(g, 17, 3, 7, 2, "w"); rect(g, 18, 2, 5, 1, "S"); dot(g, 23, 2, "S");   // cá nướng trên đĩa
      rect(g, 26, 1, 1, 4, "B"); rect(g, 27, 1, 1, 4, "B");                   // đũa
      return ol(g);
    })();

    // ---------------------------------------------------------------- Nồi cơm điện
    SPR.suihanki = (function () {
      const g = grid(13, 11);
      rect(g, 1, 3, 11, 8, "w"); rect(g, 2, 1, 9, 2, "w"); rect(g, 4, 0, 5, 1, "s");
      rect(g, 1, 6, 11, 1, "s"); rect(g, 4, 8, 5, 2, "n"); dot(g, 5, 8, "g");   // bảng nút + đèn
      dot(g, 6, 0, "S");
      return ol(g);
    })();

    // ---------------------------------------------------------------- Kệ chén (treo tường)
    SPR.shokkidana = (function () {
      const g = grid(15, 13);
      rect(g, 0, 0, 15, 13, "t"); rect(g, 1, 1, 13, 11, "b");
      rect(g, 1, 6, 13, 1, "t");
      [[2, "w"], [6, "d"], [10, "w"]].forEach(([x, c]) => { rect(g, x, 3, 3, 3, c); rect(g, x - 0, 2, 3, 1, c === "w" ? "s" : "u"); });
      [2, 5, 8, 11].forEach((x, i) => { rect(g, x, 8, 2, 4, i % 2 ? "r" : "c"); });
      return ol(g);
    })();

    // ---------------------------------------------------------------- Giỏ rau (rau từ vườn)
    SPR.yasaikago = (function () {
      const g = grid(15, 12);
      rect(g, 1, 6, 13, 6, "t");
      for (let x = 2; x < 14; x += 3) { rect(g, x, 6, 1, 6, "b"); }
      rect(g, 1, 8, 13, 1, "b");
      disc(g, 4, 4, 2, "g"); dot(g, 4, 2, "G");             // bắp cải
      rect(g, 7, 1, 2, 6, "w"); dot(g, 7, 0, "f"); dot(g, 8, 0, "f");   // củ cải trắng
      rect(g, 10, 3, 2, 4, "o"); dot(g, 11, 2, "g"); dot(g, 12, 1, "g");   // cà rốt
      return ol(g);
    })();

    // ---------------------------------------------------------------- Giường + chăn đệm (chăn phồng lên xẹp xuống)
    function bed(up) {
      const g = grid(32, 16);
      rect(g, 0, 2, 3, 14, "b"); rect(g, 29, 7, 3, 9, "b");      // đầu giường / cuối giường
      rect(g, 3, 9, 26, 4, "t"); rect(g, 3, 13, 26, 1, "B");
      rect(g, 3, 6, 7, 3, "w"); rect(g, 4, 5, 5, 1, "w");          // gối
      rect(g, 9, up ? 5 : 6, 20, up ? 4 : 3, "d");                  // chăn
      for (let x = 11; x < 28; x += 4) { dot(g, x, up ? 6 : 7, "l"); }
      rect(g, 3, 14, 2, 2, "B"); rect(g, 27, 14, 2, 2, "B");
      return ol(g);
    }
    SPR.beddo = bed(false);
    ALT.beddo = { phong: bed(true) };

    // ---------------------------------------------------------------- Tủ áo tansu
    SPR.tansu = (function () {
      const g = grid(15, 21);
      rect(g, 0, 0, 15, 20, "b"); rect(g, 0, 20, 2, 1, "B"); rect(g, 13, 20, 2, 1, "B");
      [1, 6, 11, 16].forEach((y) => { rect(g, 1, y, 13, 4, "t"); rect(g, 6, y + 1, 3, 1, "S"); dot(g, 7, y + 2, "i"); });
      rect(g, 0, 0, 15, 1, "B");
      return ol(g);
    })();

    // ---------------------------------------------------------------- Đèn ngủ (trăng)
    SPR.nightlamp = (function () {
      const g = grid(11, 14);
      disc(g, 5, 4, 4, "c"); disc(g, 7, 3, 3, ".");     // trăng khuyết
      dot(g, 3, 3, "y"); dot(g, 4, 6, "y");
      rect(g, 5, 9, 1, 3, "S"); rect(g, 3, 12, 5, 2, "v");
      return ol(g);
    })();

    // ---------------------------------------------------------------- Bàn trang điểm (gương lấp lánh)
    SPR.kyodai = (function () {
      const g = grid(15, 22);
      disc(g, 7, 6, 5, "b"); disc(g, 7, 6, 4, "l"); dot(g, 5, 4, "w"); dot(g, 6, 3, "w");   // gương tròn
      rect(g, 6, 11, 3, 2, "b");
      rect(g, 0, 13, 15, 3, "t"); rect(g, 0, 16, 15, 1, "b");
      rect(g, 1, 17, 5, 3, "b"); dot(g, 3, 18, "i"); rect(g, 1, 20, 1, 2, "B"); rect(g, 13, 17, 1, 5, "B");
      dot(g, 10, 12, "p"); dot(g, 12, 12, "v"); dot(g, 12, 11, "v");   // lọ nước hoa
      return ol(g);
    })();

    // ---------------------------------------------------------------- Gối ôm hình mèo
    SPR.dakimakura = (function () {
      const g = grid(17, 9);
      rect(g, 1, 3, 15, 6, "P"); rect(g, 2, 2, 13, 1, "P");
      dot(g, 2, 1, "P"); dot(g, 6, 1, "P");              // tai mèo
      dot(g, 3, 5, "k"); dot(g, 5, 5, "k"); dot(g, 4, 6, "r");   // mặt
      for (let x = 8; x < 15; x += 2) { dot(g, x, 4, "p"); dot(g, x + 1, 7, "p"); }
      return ol(g);
    })();

    // ---------------------------------------------------------------- Dây đèn sao (treo tường, nhấp nháy ban đêm: pal)
    SPR.hoshizora = (function () {
      const g = grid(30, 10);
      for (let x = 0; x < 30; x++) { dot(g, x, 1 + Math.round(Math.sin((x / 29) * Math.PI) * 3), "B"); }
      [3, 9, 15, 21, 27].forEach((x, i) => {
        const y = 2 + Math.round(Math.sin((x / 29) * Math.PI) * 3) + 1, c = i % 2 ? "c" : "y";
        dot(g, x, y, c); dot(g, x - 1, y + 1, c); dot(g, x, y + 1, c); dot(g, x + 1, y + 1, c); dot(g, x, y + 2, c);
      });
      return rows(g);        // không viền: dây mảnh
    })();

    GLOW.nightlamp = [5, 15];
    GLOW.hoshizora = [6, 16];

    function frameOf(e, now) {
      if (e.id === "reizouko") { const t = (now + e.x * 1300) % 11000; return t > 9800 ? ALT.reizouko.mo : null; }
      if (e.id === "beddo") { return Math.floor((now + e.x * 400) / 1600) % 2 ? ALT.beddo.phong : null; }
      return null;
    }
    function emit(e, bx, dt, night, add) {
      const r = Math.random();
      if (e.id === "nagashi" && r < dt * 2) {
        add({ kind: "steam", x: bx.x + 3 + Math.random() * 4, y: bx.y + 1, vx: 0.4 + Math.random(), vy: -4 - Math.random() * 2, life: 1.6 });
      } else if (e.id === "suihanki" && r < dt * 0.6) {
        add({ kind: "steam", x: bx.x + 6, y: bx.y, vx: (Math.random() - 0.5), vy: -5, life: 1.2 });
      } else if (e.id === "kyodai" && r < dt * 0.4) {
        add({ kind: "spark", x: bx.x + 4 + Math.random() * 7, y: bx.y + 2 + Math.random() * 7, vx: 0, vy: -2, life: 0.9 });
      } else if (e.id === "dakimakura" && night && r < dt * 0.25) {
        add({ kind: "heart", x: bx.x + 4, y: bx.y, vx: 1, vy: -3, life: 1.4 });
      }
    }
    function pal(e, night) {
      if (e.id === "suihanki") { return Object.assign({}, P, { g: Math.floor(Date.now() / 700) % 2 ? "#6be08a" : "#2e8b3a" }); }
      if (e.id === "nightlamp" && night) { return Object.assign({}, P, { c: "#fff6c8", y: "#ffe27a" }); }
      if (e.id === "hoshizora" && night) {
        const k = Math.floor(Date.now() / 500 + e.x);
        return Object.assign({}, P, { y: ["#ffe27a", "#fff6c8", "#ff9fd0"][k % 3], c: ["#fff6c8", "#9fe0ff", "#ffe27a"][k % 3] });
      }
      return null;
    }

    // ---------------------------------------------------------------- 1.25: nền ba gian theo kiểu nhà
    // toạ độ mỗi gian: tường 0–40 (xà 0–5, hàng đồ treo tường 12–28, chân tường 37–40), sàn 40–88.
    // Cùng nền theo kiểu nhà, mỗi gian bên một điểm nhấn. Nền tĩnh → vẽ một lần vào canvas đệm rồi dán (khi cỡ là số nguyên).
    const hexA = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const mixc = (a, b, t) => "#" + hexA(a).map((v, i) => Math.max(0, Math.min(255, Math.round(v + (hexA(b)[i] - v) * t))).toString(16).padStart(2, "0")).join("");
    const dk = (c, t) => mixc(c, "#000000", t), lt = (c, t) => mixc(c, "#ffffff", t);
    function hs(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 1000 / 1000; }
    const FL = 40, HH = 88;
    function woodFloor(c, x0, x1, pal, rowH) {
      for (let y = FL, r = 0; y < HH; y += rowH, r++) {
        const h = Math.min(rowH, HH - y);
        let x = Math.floor(x0 / 40) * 40 - 40 + Math.floor(hs(r, 7) * 30);
        while (x < x1) {
          const L = 22 + Math.floor(hs(x, r, 3) * 22), a = Math.max(x0, x), b = Math.min(x1, x + L);
          if (b > a) {
            const tone = pal.fl[Math.floor(hs(x, r, 5) * pal.fl.length)];
            c(a, y, b - a, h, tone); c(a, y, b - a, 1, lt(tone, 0.16));
            for (let k = 0; k < 3; k++) {
              const gx = x + 3 + Math.floor(hs(x, r, 11 + k) * Math.max(1, L - 9)), gy = y + 1 + ((k + r) % Math.max(1, h - 2));
              if (gx >= a && gx + 5 <= b && gy < y + h - 1) { c(gx, gy, 5, 1, dk(tone, 0.07)); }
            }
            if (x >= x0) { c(x, y, 1, h, pal.ln); }
          }
          x += L;
        }
        c(x0, y + h - 1, x1 - x0, 1, pal.ln);
      }
    }
    function tatami(c, x0, x1, pal) {
      for (let y = FL, r = 0; y < HH; y += 16, r++) {
        for (let x = Math.floor(x0 / 32) * 32 - 32 + (r % 2) * 16; x < x1; x += 32) {
          const a = Math.max(x0, x), b = Math.min(x1, x + 32);
          if (b <= a) { continue; }
          const m = mixc(pal.mat, pal.mat2, hs(x, r, 2) * 0.8);
          c(a, y, b - a, 16, m);
          for (let yy = y + 3; yy < y + 16; yy += 2) { c(a, yy, b - a, 1, dk(m, 0.05)); }
          if (x >= x0) { c(x, y, 1, 16, dk(m, 0.22)); }
        }
        c(x0, y, x1 - x0, 2, pal.heri);
        if (pal.dot) { for (let x = Math.ceil(x0 / 4) * 4 + (r % 2) * 2; x < x1; x += 4) { c(x, y, 1, 1, pal.dot); } }
        c(x0, y + 2, x1 - x0, 1, dk(pal.mat, 0.12));
      }
    }
    function checker(c, x0, x1, a, b, g) {
      for (let y = FL, r = 0; y < HH; y += 8, r++) {
        for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
          const t = ((x / 8) + r) % 2 ? a : b, xa = Math.max(x0, x), w = Math.min(x1, x + 8) - xa;
          c(xa, y, w, 8, t); c(xa, y, w, 1, lt(t, 0.15)); c(xa, y + 7, w, 1, g);
          if (x >= x0) { c(x, y, 1, 8, g); }
        }
      }
    }
    function doma(c, x0, x1) {                 // sàn đất nện + bậc gỗ agari-kamachi
      c(x0, FL, x1 - x0, HH - FL, "#ab8660");
      for (let y = FL + 5; y < HH; y++) {
        for (let x = Math.floor(x0 / 2) * 2; x < x1; x += 2) {
          const v = hs(x, y, 9);
          if (v > 0.88) { c(x, y, 2, 1, "#b48f68"); } else if (v < 0.08) { c(x, y, 2, 1, "#a07c56"); } else if (v > 0.992) { c(x, y, 1, 1, "#d6c09a"); }
        }
      }
      for (let y = FL + 14; y < HH; y += 16) { c(x0, y, x1 - x0, 1, "#a37f59"); }
      c(x0, FL, x1 - x0, 4, "#4a2c18"); c(x0, FL, x1 - x0, 1, "#7a4a2a"); c(x0, FL + 4, x1 - x0, 1, "#2b1a10");
    }
    function speckle(c, x0, x1, y0, y1, base, d1, d2, seed) {
      c(x0, y0, x1 - x0, y1 - y0, base);
      for (let y = y0; y < y1; y++) { for (let x = x0; x < x1; x++) { const v = hs(x, y, seed); if (v > 0.93) { c(x, y, 1, 1, d1); } else if (v < 0.035) { c(x, y, 1, 1, d2); } } }
    }
    function straw(c, x0, x1, y0, y1, base, f1, f2) {
      c(x0, y0, x1 - x0, y1 - y0, base);
      for (let y = y0; y < y1; y++) { for (let x = x0; x < x1; x++) { const v = hs(x, y, 31); if (v > 0.965) { c(x, y, 2 + Math.floor(hs(x, y, 4) * 2), 1, f1); } else if (v < 0.02) { c(x, y, 1, 1, f2); } } }
    }
    function shade(c, x0, x1) {                // bóng dưới xà + ở mép sàn
      const g = c.ctx, ga = g.globalAlpha;
      g.globalAlpha = ga * 0.13; c(x0, 6, x1 - x0, 2, "#000000"); g.globalAlpha = ga * 0.06; c(x0, 8, x1 - x0, 2, "#000000");
      g.globalAlpha = ga * 0.16; c(x0, FL, x1 - x0, 2, "#000000"); g.globalAlpha = ga * 0.07; c(x0, FL + 2, x1 - x0, 3, "#000000");
      g.globalAlpha = ga;
    }
    const WALLS = {
      classic: function (c, x0, x1, kind, W0) {
        c(x0, 0, x1 - x0, 5, "#6b3b1f"); c(x0, 1, x1 - x0, 1, "#8a5030"); c(x0, 5, x1 - x0, 1, P.k);
        const paper = { room: "#fff0dc", kitchen: "#fff4e4", bedroom: "#f7eaf7" }[kind];
        const fl = { room: ["#ef8fa3", "#f8cdd3"], kitchen: ["#f0a04a", "#fbd9a8"], bedroom: ["#b98ad6", "#e2cdf0"] }[kind];
        c(x0, 6, x1 - x0, 32, paper); c(x0, 6, x1 - x0, 1, lt(paper, 0.5));
        const top = kind === "kitchen" ? 19 : 26;
        for (let y = 10, r = 0; y < top - 2; y += 7, r++) {
          for (let x = Math.floor(x0 / 10) * 10 + (r % 2) * 5; x < x1; x += 10) {
            if (x < x0 || x + 2 >= x1) { continue; }
            c(x + 1, y, 1, 1, fl[0]); c(x, y, 1, 1, fl[1]); c(x + 2, y, 1, 1, fl[1]); c(x + 1, y - 1, 1, 1, fl[1]); c(x + 1, y + 1, 1, 1, fl[1]);
            if (kind !== "kitchen") { c(x + 3, y + 2, 1, 1, "#a8cf9e"); }
          }
        }
        if (kind === "kitchen") {              // Bếp: gạch men trắng viền xanh tới giữa tường
          c(x0, 19, x1 - x0, 1, "#5f97c4"); c(x0, 20, x1 - x0, 1, "#8fc0e6");
          for (let y = 21, r = 0; y < 37; y += 4, r++) {
            c(x0, y, x1 - x0, 4, "#f7f9fb"); c(x0, y + 3, x1 - x0, 1, "#d3dbe3");
            for (let x = Math.floor(x0 / 8) * 8 + (r % 2) * 4; x < x1; x += 8) { if (x >= x0) { c(x, y, 1, 3, "#d3dbe3"); c(x + 1, y, 3, 1, "#ffffff"); } }
          }
        } else {                               // nẹp gỗ + ốp ván (phòng chính xanh lá mạ, Phòng ngủ hồng)
          const wn = kind === "bedroom" ? ["#e7b3c1", "#d39aaa", "#f4cfd8"] : ["#9cc5a1", "#80ab88", "#b6dcba"];
          c(x0, 26, x1 - x0, 2, "#c8854f"); c(x0, 26, x1 - x0, 1, "#e8b07a"); c(x0, 28, x1 - x0, 1, "#8a5030");
          c(x0, 29, x1 - x0, 8, wn[0]);
          for (let x = Math.ceil(x0 / 4) * 4; x < x1; x += 4) { c(x, 29, 1, 8, wn[1]); c(x + 1, 29, 1, 8, wn[2]); }
        }
        c(x0, 37, x1 - x0, 3, "#efe0c6"); c(x0, 37, x1 - x0, 1, "#fff8ea"); c(x0, 39, x1 - x0, 1, P.k);
        if (kind === "kitchen") { checker(c, x0, x1, "#f4ead6", "#e0907a", "#cdb79a"); }
        else { woodFloor(c, x0, x1, { fl: ["#e0a466", "#d6975a", "#e9b47a"], ln: "#b0743f" }, 6); }
      },
      minka: function (c, x0, x1, kind, W0) {
        c(x0, 0, x1 - x0, 5, "#3b2414"); for (let x = Math.ceil(x0 / 9) * 9; x < x1; x += 9) { c(x, 2, 5, 1, "#5a3a22"); }
        c(x0, 5, x1 - x0, 1, P.k);
        if (kind === "bedroom") {              // Phòng ngủ: ô thoáng ranma + cửa lùa fusuma vẽ sóng chàm
          c(x0, 6, x1 - x0, 5, "#efe3c4"); for (let x = Math.ceil(x0 / 3) * 3; x < x1; x += 3) { c(x, 6, 1, 5, "#5a3a22"); }
          c(x0, 11, x1 - x0, 2, "#4a2c18"); c(x0, 11, x1 - x0, 1, "#6b4226");
          c(x0, 13, x1 - x0, 24, "#f2e9d3");
          for (let y = 14; y < 22; y += 3) { for (let x = x0; x < x1; x++) { if (hs(x, y, 41) > 0.8) { c(x, y, 3, 1, "#e6d6ae"); } } }
          for (let y = 22, r = 0; y < 36; y += 3, r++) {
            for (let x = Math.floor(x0 / 8) * 8 - 8 + (r % 2) * 4; x < x1; x += 8) {
              [[0, 2], [1, 1], [2, 0], [3, 0], [4, 0], [5, 1], [6, 2]].forEach(([dx, dy]) => { const px = x + dx; if (px >= x0 && px < x1 && y + dy < 37) { c(px, y + dy, 1, 1, "#3d5a80"); } });
              if (x + 3 >= x0 && x + 3 < x1 && y + 2 < 37) { c(x + 3, y + 2, 1, 1, "#7f9cc0"); }
            }
          }
          for (let x = Math.floor(x0 / 36) * 36; x <= x1; x += 36) {
            if (x >= x0 && x < x1) { c(x, 13, 1, 24, "#2b1a10"); }
            if (x + 32 >= x0 && x + 32 < x1) { c(x + 32, 23, 2, 3, "#2b1a10"); }
            if (x + 3 >= x0 && x + 3 < x1) { c(x + 2, 23, 2, 3, "#2b1a10"); }
          }
        } else {
          const up = kind === "kitchen" ? "#d8bd8a" : "#e8cf9f";
          speckle(c, x0, x1, 6, 22, up, dk(up, 0.1), lt(up, 0.3), 5);
          if (kind === "kitchen") { const g = c.ctx, ga = g.globalAlpha; g.globalAlpha = ga * 0.18; c(x0, 6, x1 - x0, 6, "#3b2414"); g.globalAlpha = ga; }   // ám khói bếp
          c(x0, 22, x1 - x0, 3, "#4a2c18"); c(x0, 22, x1 - x0, 1, "#6b4226");
          speckle(c, x0, x1, 25, 31, "#ecd6a8", "#dcc390", "#f6e7c4", 6);
          c(x0, 31, x1 - x0, 6, "#5a3a22"); for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) { c(x, 31, 1, 6, "#3b2414"); c(x + 1, 31, 1, 6, "#6e4a2e"); }
          if (kind === "kitchen" && W0 - 22 >= x0 && W0 - 8 <= x1) {     // Bếp: hai dây hồng treo khô
            [W0 - 20, W0 - 11].forEach((sx, j) => {
              c(sx, 6, 1, 17, "#8a6a3a");
              for (let y = 8 + j * 2; y < 21; y += 4) { const dx = (y / 4) % 2 ? -1 : 0; c(sx - 1 + dx, y, 3, 3, "#e8742a"); c(sx - 1 + dx, y + 2, 3, 1, "#b8521a"); c(sx + dx, y, 1, 1, "#4f7f3a"); }
            });
          }
        }
        c(x0, 37, x1 - x0, 3, "#3b2414"); c(x0, 37, x1 - x0, 1, "#5a3a22");
        if (kind === "kitchen") { doma(c, x0, x1); } else { tatami(c, x0, x1, { mat: "#d6cd88", mat2: "#cbc07a", heri: "#2f3526" }); }
      },
      teahouse: function (c, x0, x1, kind, W0) {
        for (let y = 0; y < 4; y += 2) { for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) { const o = ((y / 2) % 2) * 2; c(x + o, y, 2, 2, "#caa56c"); c(x + 2 - o, y, 2, 2, "#b38b52"); } }   // trần đan ajiro
        c(x0, 4, x1 - x0, 1, "#8a6238"); c(x0, 5, x1 - x0, 1, "#5a3a22");
        straw(c, x0, x1, 6, 30, "#e7d1a6", "#cdb27e", "#f4e6c6");
        c(x0, 29, x1 - x0, 8, "#f6f1e4"); c(x0, 29, x1 - x0, 1, "#cbbfa6");                 // giấy dán chân tường koshibari
        for (let x = Math.ceil(x0 / 12) * 12; x < x1; x += 12) { c(x, 30, 1, 7, "#e4dccb"); }
        c(x0, 37, x1 - x0, 3, "#8a6238"); c(x0, 37, x1 - x0, 1, "#a87a4a");
        if (kind === "kitchen") {
          woodFloor(c, x0, x1, { fl: ["#ebd3a4", "#e2c793", "#f0dcb2"], ln: "#c9a774" }, 8);
          if (x0 <= 4 && x1 >= 44) {           // Bếp: kệ tre 2 tầng (nền, không phải đồ)
            [5, 40].forEach((x) => { c(x, 9, 2, 22, "#8faf4a"); c(x, 15, 2, 1, "#5f7f2a"); c(x, 24, 2, 1, "#5f7f2a"); c(x + 1, 9, 1, 22, "#a9c862"); });
            [17, 27].forEach((y) => { c(4, y, 39, 2, "#a9c862"); c(4, y + 2, 39, 1, "#6f8f3a"); });
            c(9, 12, 5, 5, "#2b2018"); c(10, 11, 3, 1, "#2b2018"); c(10, 13, 1, 1, "#6b5a48");
            c(18, 14, 5, 3, "#e8e0d0"); c(18, 14, 5, 1, "#7a9a4a"); c(27, 13, 4, 4, "#c06a3a"); c(28, 12, 2, 1, "#c06a3a"); c(34, 14, 4, 3, "#5f7faf");
            c(10, 23, 9, 4, "#6f5f8f"); c(10, 23, 9, 1, "#9f8fbf"); c(24, 22, 3, 5, "#e8e0d0"); c(29, 22, 3, 5, "#e8e0d0"); c(24, 24, 8, 1, "#9fbf5a");
          }
        } else {
          tatami(c, x0, x1, { mat: "#dcd291", mat2: "#d0c47f", heri: "#5a4632" });
        }
        if (kind === "bedroom" && x0 <= 48 && x1 >= 96) {     // Phòng ngủ: hốc tokonoma giữa gian
          const a = 50, b = 94;
          c(a + 3, 8, b - a - 3, 26, "#d8c093"); c(a + 3, 8, b - a - 3, 2, "#c4aa7c");
          c(a, 6, 4, 31, "#a87a4a"); c(a + 1, 6, 1, 31, "#c4955e"); [10, 17, 25, 31].forEach((y) => c(a + 2, y, 1, 2, "#7a5530"));
          c(a, 7, b - a, 2, "#8a6238");
          c(a + 3, 33, b - a - 3, 4, "#5a3018"); c(a + 3, 33, b - a - 3, 1, "#8a5030");
          const cx = Math.floor((a + b) / 2) - 2;
          c(cx - 5, 10, 11, 2, "#5a3a22"); c(cx - 4, 12, 9, 18, "#b8a27a"); c(cx - 3, 13, 7, 15, "#f7f1e1"); c(cx - 5, 30, 11, 2, "#5a3a22");
          c(cx, 15, 1, 7, "#2b2b2b"); c(cx - 1, 17, 3, 1, "#2b2b2b"); c(cx - 1, 22, 2, 2, "#2b2b2b"); c(cx + 1, 25, 1, 1, "#c0392b");
          c(b - 9, 29, 5, 4, "#4f6f8f"); c(b - 8, 29, 3, 1, "#6f8faf"); c(b - 7, 23, 1, 6, "#4f7f3a"); c(b - 9, 22, 3, 2, "#f08aa8"); c(b - 6, 24, 2, 2, "#ffffff");
        }
      },
      castle: function (c, x0, x1, kind, W0) {
        c(x0, 0, x1 - x0, 5, "#1f1f33"); c(x0, 4, x1 - x0, 1, "#e9b949"); c(x0, 5, x1 - x0, 1, P.k);
        for (let x = Math.ceil((x0 - 12) / 24) * 24 + 12; x < x1; x += 24) { if (x >= x0) { c(x - 1, 1, 3, 3, "#e9b949"); c(x, 2, 1, 1, "#a37a1f"); } }
        const lowTop = kind === "kitchen" ? 30 : 23;
        c(x0, 6, x1 - x0, lowTop - 6, "#f7f3ea");
        for (let y = 7; y < lowTop; y++) { for (let x = x0; x < x1; x++) { if (hs(x, y, 51) > 0.96) { c(x, y, 1, 1, "#ece6d7"); } } }
        if (kind === "kitchen") {              // Bếp: ốp gỗ sơn đen + sàn gỗ sẫm bóng
          c(x0, 30, x1 - x0, 7, "#2a2436"); c(x0, 30, x1 - x0, 1, "#e9b949");
          for (let x = Math.ceil(x0 / 8) * 8; x < x1; x += 8) { c(x, 31, 1, 6, "#1a1626"); c(x + 1, 31, 1, 6, "#3a3450"); }
        } else {
          c(x0, 21, x1 - x0, 2, "#1f1f33"); c(x0, 22, x1 - x0, 1, "#e9b949");
          for (let x = Math.ceil((x0 - 12) / 24) * 24 + 12; x < x1; x += 24) { if (x >= x0) { c(x - 1, 21, 3, 2, "#e9b949"); } }
          c(x0, 23, x1 - x0, 14, "#e6c35c");    // fusuma lá vàng
          for (let y = 23; y < 37; y += 7) { for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) { if (x >= x0 && hs(x, y, 61) > 0.6) { c(x, y, Math.min(7, x1 - x), Math.min(7, 37 - y), "#ecce72"); } } }
          for (let y = 23; y < 37; y += 7) { c(x0, y, x1 - x0, 1, "#d6ad48"); }
          for (let x = Math.ceil(x0 / 7) * 7; x < x1; x += 7) { c(x, 23, 1, 14, "#d6ad48"); }
          if (kind === "room") {               // phòng chính: tùng xanh + mây vàng
            const pine = (px) => {
              if (px < x0 || px + 32 > x1) { return; }
              const B = 23;
              [[1, 13, 3, 1], [3, 12, 3, 1], [5, 11, 2, 1], [6, 10, 2, 1], [7, 9, 2, 1], [8, 8, 2, 1], [10, 7, 1, 1]].forEach(([dx, dy, w, h]) => c(px + dx, B + dy, w, h, "#5a3a22"));
              c(px + 8, B + 9, 6, 1, "#5a3a22"); c(px + 13, B + 8, 4, 1, "#5a3a22"); c(px + 1, B + 11, 4, 1, "#5a3a22");
              const pad = (x, y, w) => {
                c(px + x + 2, B + y, w - 4, 1, "#5f9f52"); c(px + x, B + y + 1, w, 1, "#2f6b3a"); c(px + x + 1, B + y + 2, w - 2, 1, "#1f4f2a");
                for (let i = 1; i < w - 1; i += 3) { c(px + x + i, B + y, 1, 1, "#7fbf6a"); }
              };
              pad(9, 2, 14); pad(18, 5, 12); pad(0, 6, 10); pad(13, 8, 9);
            };
            pine(4); pine(W0 - 34);
            [[38, 26, 18], [104, 32, 16]].forEach(([x, y, w]) => { if (x >= x0 && x + w <= x1) { c(x, y, w, 2, "#f6e3a0"); c(x + 2, y - 1, w - 6, 1, "#f6e3a0"); c(x, y + 2, w, 1, "#d6ad48"); } });
          } else {                             // Phòng ngủ: cành anh đào
            const br = (px) => {
              if (px < x0 || px + 34 > x1) { return; }
              for (let i = 0; i < 26; i++) { c(px + i, 26 + Math.round(i * 0.35), 1, 1, "#4a2c18"); }
              [[3, 2], [9, 5], [15, 4], [21, 8], [26, 10], [12, 9], [30, 7]].forEach(([dx, dy]) => { c(px + dx, 23 + dy, 3, 3, "#f7a8c0"); c(px + dx + 1, 24 + dy, 1, 1, "#ffffff"); });
              [[6, 11], [18, 12], [28, 3]].forEach(([dx, dy]) => c(px + dx, 23 + dy, 1, 1, "#f7a8c0"));
            };
            br(2); br(54); br(W0 - 38);
          }
          for (let x = Math.floor(x0 / 36) * 36; x < x1; x += 36) {
            if (x >= x0) { c(x, 23, 1, 14, "#1f1f33"); }
            if (x + 33 >= x0 && x + 33 < x1) { c(x + 33, 28, 2, 3, "#1f1f33"); }
          }
        }
        c(x0, 37, x1 - x0, 3, "#1f1f33"); c(x0, 37, x1 - x0, 1, "#e9b949");
        if (kind === "kitchen") {
          woodFloor(c, x0, x1, { fl: ["#5e3a24", "#54331f", "#6a432a"], ln: "#2e1c12" }, 6);
          const g = c.ctx, ga = g.globalAlpha; g.globalAlpha = ga * 0.09;
          for (let k = 0; k < 4; k++) { const sx = x0 + 10 + k * 37; for (let i = 0; i < 40; i++) { if (sx + i < x1) { c(sx + i, FL + 6 + Math.floor(i * 0.9), 3, 1, "#ffffff"); } } }
          g.globalAlpha = ga;
        } else {
          tatami(c, x0, x1, { mat: "#d9cf8c", mat2: "#cec27c", heri: "#7a1f2a", dot: "#e9b949" });
        }
      },
    };
    const STYLES = Object.keys(WALLS);
    const cache = new Map();
    function paint(ctx, S, ox, oy, kind, W, style) {
      const c = (x, y, w, h, col) => box(ctx, ox + x, oy + y, w, h, col, S);
      c.ctx = ctx;
      WALLS[style](c, 0, W, kind, W);
      shade(c, 0, W);
    }
    // nền một gian (kind: room / kitchen / bedroom) theo kiểu nhà; W: bề ngang gian (phòng chính 160, gian bên 144)
    function bg(ctx, S, ox, oy, kind, W, Hh, FLOOR, style) {
      style = STYLES.indexOf(style) >= 0 ? style : "classic";
      const tf = ctx.getTransform ? ctx.getTransform() : null, k = tf ? tf.a : 1, px = S * k;
      if (!(Number.isInteger(px) && px >= 1 && px <= 16 && tf.b === 0 && tf.c === 0)) { paint(ctx, S, ox, oy, kind, W, style); return; }
      const key = kind + "|" + style + "|" + W + "|" + px;
      let cv = cache.get(key);
      if (!cv) {
        if (cache.size > 40) { cache.clear(); }
        cv = document.createElement("canvas");
        cv.width = W * px; cv.height = HH * px;
        const g = cv.getContext("2d");
        g.imageSmoothingEnabled = false;
        paint(g, px, 0, 0, kind, W, style);
        cache.set(key, cv);
      }
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(ox * S), Math.round(oy * S), W * S, HH * S);
      ctx.imageSmoothingEnabled = sm;
    }
    // cột ngăn gian / tường ngoài theo kiểu nhà
    const POST = {
      classic: { body: "#8a5030", hi: "#b0703e", cap: "#c8854f" },
      minka: { body: "#3b2414", hi: "#5a3a22", cap: "#4a2c18" },
      teahouse: { body: "#b88a58", hi: "#d0a470", cap: "#a87a4a", bark: "#8a6238" },
      castle: { body: "#1f1f33", hi: "#3a3a55", cap: "#e9b949" },
    };
    function post(ctx, S, ox, oy, x, y0, y1, style) {
      const p = POST[style] || POST.classic;
      box(ctx, ox + x, oy + y0, 4, y1 - y0, p.body, S); box(ctx, ox + x + 1, oy + y0, 1, y1 - y0, p.hi, S);
      box(ctx, ox + x, oy + y0, 1, y1 - y0, P.k, S); box(ctx, ox + x + 3, oy + y0, 1, y1 - y0, P.k, S);
      box(ctx, ox + x - 1, oy + 6, 6, 2, p.cap, S); box(ctx, ox + x - 1, oy + 36, 6, 2, p.cap, S);
      if (p.bark) { for (let y = Math.max(y0, 0) + 8; y < y1; y += 11) { box(ctx, ox + x + 2, oy + y, 1, 2, p.bark, S); } }
    }
    // mái theo kiểu nhà (mái hiên cắt ngang trên dải cảnh / mái đầy đủ ở hình nền)
    const ROOF = {
      classic: { a: P.r, b: P.R, edge: P.k, board: P.B },
      minka: { a: P.h, b: P.t, edge: "#7a5a2a", board: P.B },
      teahouse: { a: P.m, b: P.S, edge: P.n, board: P.b },
      castle: { a: P.m, b: P.n, edge: P.k, board: P.n },
    };

    return { ids: IDS, frameOf: frameOf, emit: emit, pal: pal, bg: bg, post: post, ROOF: ROOF, STYLES: STYLES, dk: dk, lt: lt };
  }

  return { install: install };
})();
