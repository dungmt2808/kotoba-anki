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

    // ---------------------------------------------------------------- 1.30: giấy dán tường + sàn mua riêng / tự vẽ
    // Mỗi mẫu vẽ đè lên phần tường (y 6–37) hoặc phần sàn (y 40–88) của nền theo kiểu nhà; xà, nẹp chân tường, cột vẫn
    // theo kiểu nhà để ba gian liền nhau. Id khớp decor_core.py (WALLS / FLOORS).
    const WT = 6, WB = 37;            // tường: từ dưới xà tới trên nẹp chân tường
    const mod = (a, n) => ((a % n) + n) % n;
    const DECO = {
      // ---- giấy dán tường
      w_kem: function (c, x0, x1) {
        speckle(c, x0, x1, WT, WB, "#fbf3e2", "#f1e6cd", "#fffaf0", 71);
        c(x0, WT, x1 - x0, 1, "#fffaf0"); c(x0, WB - 1, x1 - x0, 1, "#eadfc6");
      },
      w_soc: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#f1f9f3");
        for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
          const a = Math.max(x0, x), b = Math.min(x1, x + 4);
          if (b > a) { c(a, WT, b - a, WB - WT, "#d3ecdd"); }
          if (x >= x0) { c(x, WT, 1, WB - WT, "#b9dcc8"); }
        }
      },
      w_sakura: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#ffeef2"); c(x0, WT, x1 - x0, 1, "#fff7f9");
        for (let y = WT + 3, r = 0; y < WB - 3; y += 7, r++) {
          for (let x = Math.floor(x0 / 12) * 12 + (r % 2) * 6; x < x1; x += 12) {
            if (x < x0 || x + 3 >= x1) { continue; }
            const v = hs(x, y, 81);
            if (v < 0.22) { c(x + 1, y + 1, 1, 1, "#ffc4d6"); continue; }
            c(x + 1, y, 1, 1, "#ff9fbf"); c(x, y + 1, 1, 1, "#ffb3cc"); c(x + 2, y + 1, 1, 1, "#ffb3cc"); c(x + 1, y + 2, 1, 1, "#ffc4d6");
            c(x + 1, y + 1, 1, 1, "#ffe27a");
          }
        }
      },
      w_seigaiha: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#eaf0f8");
        for (let y = WT, r = 0; y < WB; y += 4, r++) {
          for (let x = Math.floor(x0 / 8) * 8 - 8 + (r % 2) * 4; x < x1; x += 8) {
            [[0, 3], [1, 2], [2, 1], [3, 0], [4, 0], [5, 1], [6, 2], [7, 3]].forEach(([dx, dy]) => {
              const px = x + dx; if (px >= x0 && px < x1 && y + dy < WB) { c(px, y + dy, 1, 1, "#3d5a80"); }
            });
            [[2, 3], [3, 2], [4, 2], [5, 3]].forEach(([dx, dy]) => { const px = x + dx; if (px >= x0 && px < x1 && y + dy < WB) { c(px, y + dy, 1, 1, "#9db6d6"); } });
          }
        }
      },
      w_asanoha: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#e3f5f0");
        for (let y = WT; y < WB; y++) {
          for (let x = x0; x < x1; x++) {
            const u = mod(x, 8), v = mod(y - WT, 8);
            if (u === v || u === 7 - v) { c(x, y, 1, 1, "#2ec4b6"); }
            else if (u === 0 || v === 0) { c(x, y, 1, 1, "#9adcd2"); }
            else if (u === 4 && (v === 2 || v === 6)) { c(x, y, 1, 1, "#9adcd2"); }
          }
        }
      },
      w_caro: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#fff5d2");
        for (let y = WT; y < WB; y += 8) { c(x0, y, x1 - x0, Math.min(4, WB - y), "#ffe3a3"); }
        for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
          const a = Math.max(x0, x), b = Math.min(x1, x + 4);
          if (b <= a) { continue; }
          for (let y = WT; y < WB; y += 8) { c(a, y, b - a, Math.min(4, WB - y), "#f5b971"); if (y + 4 < WB) { c(a, y + 4, b - a, Math.min(4, WB - y - 4), "#ffe3a3"); } }
        }
      },
      w_go: function (c, x0, x1) {
        const T3 = ["#d9a066", "#cf9258", "#e2ae78"];
        for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
          const a = Math.max(x0, x), b = Math.min(x1, x + 8), tone = T3[Math.floor(hs(x, 3, 91) * 3)];
          if (b <= a) { continue; }
          c(a, WT, b - a, WB - WT, tone);
          if (x >= x0) { c(x, WT, 1, WB - WT, "#a8703c"); }
          if (x + 1 >= x0 && x + 1 < x1) { c(x + 1, WT, 1, WB - WT, lt(tone, 0.18)); }
          const ky = WT + 4 + Math.floor(hs(x, 5, 92) * (WB - WT - 9));
          if (hs(x, 7, 93) > 0.45 && x + 5 <= x1 && x + 3 >= x0) { c(x + 3, ky, 2, 3, dk(tone, 0.2)); c(x + 3, ky + 1, 1, 1, dk(tone, 0.4)); }
        }
      },
      w_gach: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#ead8c2");
        for (let y = WT, r = 0; y < WB; y += 4, r++) {
          for (let x = Math.floor(x0 / 10) * 10 - 10 + (r % 2) * 5; x < x1; x += 10) {
            const a = Math.max(x0, x), b = Math.min(x1, x + 9), h = Math.min(3, WB - y);
            if (b <= a || h <= 0) { continue; }
            const tone = ["#c8553d", "#bf4d37", "#d1634a", "#b8492f"][Math.floor(hs(x, r, 95) * 4)];
            c(a, y, b - a, h, tone); c(a, y, b - a, 1, lt(tone, 0.14));
          }
        }
      },
      w_tre: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#f5f0da");
        for (let x = Math.floor(x0 / 10) * 10; x < x1; x += 10) {
          const sx = x + 3;
          if (sx < x0 || sx + 3 > x1) { continue; }
          c(sx, WT, 3, WB - WT, "#7fb069"); c(sx, WT, 1, WB - WT, "#a9d18e"); c(sx + 2, WT, 1, WB - WT, "#5f9150");
          for (let y = WT + 3 + Math.floor(hs(x, 1, 97) * 6); y < WB; y += 9) { c(sx, y, 3, 1, "#4f7f3a"); }
          if (hs(x, 2, 98) > 0.5 && sx + 6 <= x1) { const ly = WT + 6 + Math.floor(hs(x, 4, 99) * 14); c(sx + 3, ly, 2, 1, "#5f9150"); c(sx + 4, ly - 1, 2, 1, "#7fb069"); }
        }
      },
      w_may: function (c, x0, x1) {
        for (let y = WT; y < WB; y++) { c(x0, y, x1 - x0, 1, mixc("#a9d8ff", "#e3f4ff", (y - WT) / (WB - WT))); }
        for (let x = Math.floor(x0 / 34) * 34; x < x1; x += 34) {
          const cx = x + 4 + Math.floor(hs(x, 1, 101) * 12), cy = WT + 4 + Math.floor(hs(x, 2, 102) * 14);
          [[2, 0, 7, 1], [0, 1, 12, 2], [1, 3, 9, 1]].forEach(([dx, dy, w, h]) => {
            const a = Math.max(x0, cx + dx), b = Math.min(x1, cx + dx + w);
            if (b > a) { c(a, cy + dy, b - a, h, "#ffffff"); }
          });
          const a2 = Math.max(x0, cx + 1), b2 = Math.min(x1, cx + 10);
          if (b2 > a2) { c(a2, cy + 4, b2 - a2, 1, "#d6ecfb"); }
        }
      },
      w_sao: function (c, x0, x1) {
        for (let y = WT; y < WB; y++) { c(x0, y, x1 - x0, 1, mixc("#1f2452", "#343f85", (y - WT) / (WB - WT))); }
        for (let y = WT + 1; y < WB - 1; y++) {
          for (let x = x0; x < x1; x++) {
            const v = hs(x, y, 105);
            if (v > 0.985) { c(x, y, 1, 1, "#fff6c8"); }
            else if (v < 0.006 && x > x0 && x + 1 < x1) { c(x, y, 1, 1, "#ffffff"); c(x - 1, y, 1, 1, "#aab6f0"); c(x + 1, y, 1, 1, "#aab6f0"); c(x, y - 1, 1, 1, "#aab6f0"); c(x, y + 1, 1, 1, "#aab6f0"); }
          }
        }
      },
      w_shoji: function (c, x0, x1) {
        c(x0, WT, x1 - x0, WB - WT, "#fbf7ea");
        for (let y = WT; y < WB; y++) { for (let x = x0; x < x1; x++) { if (hs(x, y, 107) > 0.975) { c(x, y, 1, 1, "#f1ead6"); } } }
        for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { if (x >= x0) { c(x, WT, 1, WB - WT, "#8a5a34"); } }
        for (let y = WT + 9; y < WB; y += 10) { c(x0, y, x1 - x0, 1, "#8a5a34"); }
        c(x0, WT, x1 - x0, 1, "#6b4226"); c(x0, WB - 1, x1 - x0, 1, "#6b4226");
      },
      // ---- sàn
      f_soi: function (c, x0, x1) { woodFloor(c, x0, x1, { fl: ["#f0d2a0", "#e8c690", "#f5dcb2"], ln: "#c9a36e" }, 6); },
      f_occho: function (c, x0, x1) { woodFloor(c, x0, x1, { fl: ["#7a4e32", "#6e452b", "#86583a"], ln: "#4a2c1a" }, 6); },
      f_xuongca: function (c, x0, x1) {
        for (let y = FL; y < HH; y++) {
          for (let x = x0; x < x1; x++) {
            const col = Math.floor(x / 12), u = mod(x, 12), sgn = mod(col, 2) ? 1 : -1, sv = mod(y + sgn * u, 6);
            const tone = ["#d9a066", "#cf9258", "#e2ae78"][mod(Math.floor((y + sgn * u) / 6) + col, 3)];
            c(x, y, 1, 1, sv === 0 || u === 0 ? "#a8703c" : (sv === 1 ? lt(tone, 0.14) : tone));
          }
        }
      },
      f_tatami: function (c, x0, x1) { tatami(c, x0, x1, { mat: "#c9d98a", mat2: "#bccd7c", heri: "#2f4a6a" }); },
      f_caro: function (c, x0, x1) { checker(c, x0, x1, "#f4f4f6", "#3a3a4a", "#9aa0b5"); },
      f_gom: function (c, x0, x1) {
        c(x0, FL, x1 - x0, HH - FL, "#f0d9c0");
        for (let y = FL, r = 0; y < HH; y += 12, r++) {
          for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) {
            const a = Math.max(x0, x + 1), b = Math.min(x1, x + 12), h = Math.min(11, HH - y - 1);
            if (b <= a || h <= 0) { continue; }
            const tone = ["#d2784f", "#c96d45", "#db8a60"][Math.floor(hs(x, r, 111) * 3)];
            c(a, y + 1, b - a, h, tone); c(a, y + 1, b - a, 1, lt(tone, 0.16)); c(a, y + h, b - a, 1, dk(tone, 0.14));
          }
        }
      },
      f_da: function (c, x0, x1) {
        c(x0, FL, x1 - x0, HH - FL, "#6b7080");
        for (let y = FL, r = 0; y < HH; y += 8, r++) {
          let x = Math.floor(x0 / 60) * 60 - 20 + Math.floor(hs(r, 3, 113) * 12);
          while (x < x1) {
            const L = 12 + Math.floor(hs(x, r, 114) * 12), a = Math.max(x0, x + 1), b = Math.min(x1, x + L), h = Math.min(7, HH - y - 1);
            if (b > a && h > 0) {
              const tone = ["#9aa0ae", "#8a90a0", "#a8aebc", "#9096a6"][Math.floor(hs(x, r, 115) * 4)];
              c(a, y + 1, b - a, h, tone); c(a, y + 1, b - a, 1, lt(tone, 0.18));
              if (hs(x, r, 116) > 0.6 && b - a > 6) { c(a + 3, y + 4, 3, 1, dk(tone, 0.12)); }
            }
            x += L;
          }
        }
      },
      f_tham: function (c, x0, x1) {
        c(x0, FL, x1 - x0, HH - FL, "#d98f8f");
        for (let y = FL; y < HH; y++) {
          for (let x = x0; x < x1; x++) {
            const v = hs(x, y, 117);
            if (mod(x + y, 2) === 0 && v > 0.55) { c(x, y, 1, 1, "#e3a3a0"); } else if (v < 0.08) { c(x, y, 1, 1, "#c97a7c"); }
          }
        }
        c(x0, FL, x1 - x0, 2, "#b8656c"); c(x0, FL + 2, x1 - x0, 1, "#f2c9b8");
        for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) { c(x, FL + 4, 2, 2, "#f2c9b8"); c(x + 3, HH - 5, 2, 2, "#f2c9b8"); }
        c(x0, HH - 2, x1 - x0, 2, "#b8656c");
      },
      f_co: function (c, x0, x1) {
        c(x0, FL, x1 - x0, HH - FL, "#7fcf6a");
        for (let y = FL + 1; y < HH; y++) {
          for (let x = x0; x < x1; x++) {
            const v = hs(x, y, 119);
            if (v > 0.9) { c(x, y, 1, 2, "#5fb851"); } else if (v < 0.07) { c(x, y, 1, 1, "#a4e58f"); }
            else if (v > 0.497 && v < 0.5 && x + 1 < x1) { c(x, y, 1, 1, "#ffffff"); c(x + 1, y, 1, 1, "#ffd23f"); }
          }
        }
        c(x0, FL, x1 - x0, 1, "#5fb851");
      },
    };
    // ô 16×16 tự vẽ lặp lại (rows = 16 chuỗi 16 ký tự màu, "." = để nguyên nền theo kiểu nhà)
    function tilePaint(c, x0, x1, rowsArr, y0, y1) {
      if (!rowsArr || rowsArr.length !== 16) { return; }
      for (let y = y0; y < y1; y++) {
        const row = rowsArr[(y - y0) % 16];
        let run = null;
        for (let x = x0; x <= x1; x++) {
          const ch = x < x1 ? row[mod(x, 16)] : ".";
          if (run && ch !== run.ch) { c(run.x, y, x - run.x, 1, P[run.ch] || run.ch); run = null; }
          if (!run && ch !== ".") { run = { x: x, ch: ch }; }
        }
      }
    }
    // deco = {wall: id | null, floor: id | null, tiles: {t<n>: [16 hàng]}} — id lạ (bản mới hơn) thì giữ nền theo kiểu nhà
    function decoPaint(c, x0, x1, deco) {
      if (!deco) { return; }
      const g = c.ctx;
      const clip = (y0, y1, fn) => { g.save(); g.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); try { fn(); } finally { g.restore(); } };
      if (deco.wall) {
        const t = deco.tiles && deco.tiles[deco.wall];
        if (DECO[deco.wall] && deco.wall[0] === "w") { clip(WT, WB, () => DECO[deco.wall](c, x0, x1)); }
        else if (t) { clip(WT, WB, () => tilePaint(c, x0, x1, t, WT, WB)); }
      }
      if (deco.floor) {
        const t = deco.tiles && deco.tiles[deco.floor];
        if (DECO[deco.floor] && deco.floor[0] === "f") { clip(FL, HH, () => DECO[deco.floor](c, x0, x1)); }
        else if (t) { clip(FL, HH, () => tilePaint(c, x0, x1, t, FL, HH)); }
      }
    }
    function decoKey(deco) {
      if (!deco || (!deco.wall && !deco.floor)) { return ""; }
      const one = (id) => (id ? id + (deco.tiles && deco.tiles[id] ? "=" + deco.tiles[id].join("") : "") : "");
      return one(deco.wall) + "/" + one(deco.floor);
    }
    function paint(ctx, S, ox, oy, kind, W, style, deco) {
      const c = (x, y, w, h, col) => box(ctx, ox + x, oy + y, w, h, col, S);
      c.ctx = ctx;
      c.rect = (x, y, w, h) => ctx.rect(Math.round((ox + x) * S), Math.round((oy + y) * S), Math.round(w * S), Math.round(h * S));
      WALLS[style](c, 0, W, kind, W);
      decoPaint(c, 0, W, deco);
      shade(c, 0, W);
    }
    // ô mẫu cho cửa hàng: vẽ một mảnh w × h của mẫu (slot: wall / floor) vào (ox, oy)
    function swatch(ctx, S, ox, oy, w, h, id, rowsArr) {
      const wall = rowsArr ? rowsArr.slot === "wall" : id[0] === "w", y0 = wall ? WT : FL;
      const c = (x, y, ww, hh, col) => box(ctx, ox + x, oy + y - y0, ww, hh, col, S);
      c.ctx = ctx;
      c.rect = (x, y, ww, hh) => ctx.rect(Math.round((ox + x) * S), Math.round((oy + y - y0) * S), Math.round(ww * S), Math.round(hh * S));
      ctx.save(); ctx.beginPath(); ctx.rect(Math.round(ox * S), Math.round(oy * S), Math.round(w * S), Math.round(h * S)); ctx.clip();
      try {
        if (rowsArr) { box(ctx, ox, oy, w, h, wall ? "#fbf3e2" : "#e0a466", S); tilePaint(c, 0, w, rowsArr.rows, y0, y0 + h); }
        else if (DECO[id]) { DECO[id](c, 0, w); }
      } finally { ctx.restore(); }
    }
    // nền một gian (kind: room / kitchen / bedroom) theo kiểu nhà; W: bề ngang gian (phòng chính 160, gian bên 144)
    // 1.30: deco (tuỳ chọn) = giấy dán tường / sàn riêng của gian này
    function bg(ctx, S, ox, oy, kind, W, Hh, FLOOR, style, deco) {
      style = STYLES.indexOf(style) >= 0 ? style : "classic";
      const tf = ctx.getTransform ? ctx.getTransform() : null, k = tf ? tf.a : 1, px = S * k;
      if (!(Number.isInteger(px) && px >= 1 && px <= 16 && tf.b === 0 && tf.c === 0)) { paint(ctx, S, ox, oy, kind, W, style, deco); return; }
      const key = kind + "|" + style + "|" + W + "|" + px + "|" + decoKey(deco);
      let cv = cache.get(key);
      if (!cv) {
        if (cache.size > 40) { cache.clear(); }
        cv = document.createElement("canvas");
        cv.width = W * px; cv.height = HH * px;
        const g = cv.getContext("2d");
        g.imageSmoothingEnabled = false;
        paint(g, px, 0, 0, kind, W, style, deco);
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

    return { ids: IDS, frameOf: frameOf, emit: emit, pal: pal, bg: bg, post: post, ROOF: ROOF, STYLES: STYLES, dk: dk, lt: lt,
      DECO_IDS: Object.keys(DECO), swatch: swatch };
  }

  return { install: install };
})();
