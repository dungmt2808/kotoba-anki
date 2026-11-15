/* ことば畑 – hình vẽ & chuyển động của các món theo Mùa & Lễ hội (1.8).
   home.js gọi GardenSeasonArt.install(L) sau khi dựng sprite của mình; file này thêm sprite vào SPR / FRAMES / BASE,
   thêm đồ đung đưa / phát sáng, phần vẽ động, và trả về các hàm móc: motion, pal, emit, drawPart, stepPart. */
var GardenSeasonArt = (function () {
  "use strict";

  function install(L) {
    const { grid, rect, disc, dot, outline, rows, gline, ellipseFill, compose, SPR, FRAMES, BASE, SWAY, GLOW, EXTRA, P,
      box, sprite, windOf, skyNow, isOut } = L;
    // màu thêm: bóng tuyết, bí ngô sẫm, ánh vàng nhạt
    Object.assign(P, { W: "#d6e6f5", O: "#c96a10", Y: "#fff6a8" });
    const ol = (g) => rows(outline(g));
    function star(g, cx, cy, R, r, c, shade) {      // ngôi sao 5 cánh (tô theo đa giác)
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r : R;
        pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
      }
      for (let j = 0; j < g.length; j++) {
        for (let i = 0; i < g[0].length; i++) {
          let inside = false;
          for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
            const [xa, ya] = pts[a], [xb, yb] = pts[b];
            if ((ya > j + 0.5) !== (yb > j + 0.5) && i + 0.5 < (xb - xa) * (j + 0.5 - ya) / (yb - ya) + xa) { inside = !inside; }
          }
          if (inside) { g[j][i] = shade && i + 0.5 > cx ? shade : c; }
        }
      }
    }
    function flower5(g, x, y, c, mid) { dot(g, x, y, mid); dot(g, x - 1, y, c); dot(g, x + 1, y, c); dot(g, x, y - 1, c); dot(g, x, y + 1, c); }
    function hash(n) {
      let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
      x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
      return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    }

    // =================================================================== Mùa xuân
    SPR.tulip = (function () {
      const g = grid(16, 18);
      [[3, 6], [8, 3], [13, 5]].forEach(([x, top]) => rect(g, x, top + 4, 1, 17 - top - 4, "G"));
      gline(g, 2, 16, 0, 12, "g"); gline(g, 3, 16, 1, 11, "g"); gline(g, 9, 16, 11, 12, "g"); gline(g, 8, 16, 10, 11, "g");
      gline(g, 14, 16, 15, 13, "g"); gline(g, 5, 16, 6, 13, "G");
      [[3, 6, "r", "R"], [8, 3, "y", "i"], [13, 5, "p", "r"]].forEach(([cx, top, c, cd]) => {
        dot(g, cx - 2, top, c); dot(g, cx, top, c); dot(g, cx + 2, top, c);
        rect(g, cx - 2, top + 1, 5, 3, c); rect(g, cx - 1, top + 4, 3, 1, c);
        rect(g, cx + 1, top + 1, 1, 3, cd); dot(g, cx - 1, top + 1, "w");
      });
      rect(g, 1, 17, 14, 1, "B");
      return ol(g);
    })();
    SPR.nanohana = (function () {
      const g = grid(32, 17);
      rect(g, 0, 10, 32, 6, "g");
      for (let x = 0; x < 32; x++) { if (hash(x * 7) < 0.45) { dot(g, x, 11 + Math.floor(hash(x * 3) * 4), "G"); } }
      for (let x = 1; x < 31; x += 3) {
        const cy = 3 + Math.floor(hash(x * 11) * 4);
        rect(g, x, cy + 1, 1, 10 - cy, "G");
        disc(g, x, cy, 1.7, "y"); dot(g, x, cy, "i"); dot(g, x - 1, cy - 1, "Y");
      }
      rect(g, 0, 16, 32, 1, "G");
      return ol(g);
    })();

    // =================================================================== Mùa hè
    SPR.suika = (function () {
      const g = grid(16, 15);
      disc(g, 5, 6, 3.8, "g");
      for (let j = 2; j < 10; j++) { [3, 5, 7].forEach((x, k) => dot(g, x + ((j + k) % 3 === 0 ? 1 : 0), j, "j")); }
      dot(g, 4, 3, "f");
      for (let j = 0; j < 7; j++) {          // miếng dưa bổ: ruột đỏ, hạt đen, vỏ trắng – xanh
        const y = 2 + j;
        for (let i = 0; i <= j; i++) { dot(g, 9 + i, y, "r"); }
        dot(g, 10 + j, y, "w"); dot(g, 11 + j, y, "g");
      }
      dot(g, 10, 5, "k"); dot(g, 12, 7, "k"); dot(g, 9, 7, "k"); dot(g, 11, 4, "p");
      rect(g, 1, 9, 14, 1, "l"); rect(g, 2, 9, 3, 1, "w");
      rect(g, 1, 10, 14, 5, "b"); rect(g, 1, 10, 14, 1, "B"); rect(g, 1, 13, 14, 1, "B");
      [4, 8, 12].forEach((x) => { dot(g, x, 11, "B"); dot(g, x, 12, "t"); });
      return ol(g);
    })();
    SPR.kayari = (function () {
      const g = grid(17, 12);
      ellipseFill(g, 7.5, 6, 6.6, 4.3, "w");
      for (let i = 2; i < 14; i++) { if (g[9] && g[9][i] === "w") { g[9][i] = "s"; } if (g[10] && g[10][i] === "w") { g[10][i] = "s"; } }
      rect(g, 14, 4, 2, 4, "s"); rect(g, 15, 5, 1, 2, "n");
      dot(g, 11, 1, "w"); dot(g, 12, 2, "w"); dot(g, 11, 2, "P");
      dot(g, 11, 4, "k"); dot(g, 12, 6, "P");
      rect(g, 3, 10, 2, 2, "w"); rect(g, 10, 10, 2, 2, "w");
      dot(g, 4, 5, "d"); dot(g, 5, 4, "d"); dot(g, 6, 5, "d"); dot(g, 7, 6, "d"); dot(g, 8, 5, "d");
      dot(g, 0, 5, "s"); dot(g, 0, 4, "w");
      return ol(g);
    })();

    // =================================================================== Mùa thu
    SPR.kaki = (function () {
      const g = grid(32, 40);
      [[9, 13, 5.5], [22, 12, 6], [16, 8, 5.5], [5, 19, 3.5], [27, 19, 3.5], [15, 15, 4]].forEach(([x, y, r]) => disc(g, x, y, r, "G"));
      [[8, 11, 2.5], [21, 9, 3], [15, 6, 2.5], [4, 18, 1.5], [26, 17, 1.5]].forEach(([x, y, r]) => disc(g, x, y, r, "g"));
      for (let k = 0; k < 26; k++) {
        const x = Math.floor(hash(k * 5 + 1) * 30) + 1, y = Math.floor(hash(k * 9 + 2) * 20) + 3;
        if (g[y][x] !== ".") { dot(g, x, y, k % 3 ? "h" : "o"); }
      }
      rect(g, 14, 21, 4, 18, "B"); rect(g, 15, 21, 1, 18, "b");
      gline(g, 15, 24, 7, 15, "B"); gline(g, 17, 23, 24, 14, "B"); gline(g, 16, 22, 16, 9, "B");
      gline(g, 15, 27, 5, 21, "B"); gline(g, 18, 26, 27, 21, "B");
      [[6, 15], [10, 17], [24, 14], [20, 18], [13, 11], [18, 7], [27, 21], [4, 21], [9, 9], [24, 9], [16, 16], [12, 19]].forEach(([x, y]) => {
        rect(g, x, y, 2, 2, "o"); dot(g, x + 1, y + 1, "O"); dot(g, x, y - 1, "j");
      });
      rect(g, 11, 39, 10, 1, "B");
      return ol(g);
    })();
    SPR.yakiimo = (function () {
      const g = grid(18, 22);
      rect(g, 1, 3, 1, 10, "B");
      rect(g, 0, 4, 3, 4, "r"); dot(g, 1, 5, "y"); rect(g, 0, 8, 3, 1, "B");
      rect(g, 13, 1, 2, 6, "S"); rect(g, 13, 1, 1, 6, "s");
      rect(g, 4, 7, 11, 6, "n"); rect(g, 3, 6, 13, 1, "S"); rect(g, 5, 8, 1, 4, "m");
      ellipseFill(g, 7, 4.5, 2.6, 1.2, "z"); dot(g, 5, 4, "v"); dot(g, 9, 4, "y"); dot(g, 9, 5, "y");
      ellipseFill(g, 11, 5, 1.8, 0.9, "v");
      rect(g, 1, 13, 16, 5, "b"); rect(g, 1, 13, 16, 1, "t");
      [4, 8, 12].forEach((x) => rect(g, x, 14, 1, 4, "B"));
      rect(g, 16, 12, 2, 1, "B"); gline(g, 16, 13, 17, 16, "B");
      disc(g, 5, 18.5, 3.2, "B"); disc(g, 5, 18.5, 1.6, "t"); dot(g, 5, 18, "k");
      return ol(g);
    })();

    // =================================================================== Mùa đông
    SPR.kamakura = (function () {
      const g = grid(32, 20);
      ellipseFill(g, 15.5, 20, 15.2, 19, "w");
      for (let j = 0; j < 20; j++) { for (let i = 0; i < 32; i++) { if (g[j][i] === "w" && i > 23 - j * 0.2) { g[j][i] = (i + j) % 7 === 0 ? "s" : "W"; } } }
      [[6, 4, 12], [11, 2, 9], [15, 1, 7]].forEach(([y, x0, w]) => { for (let i = x0; i < 31 - x0; i += 5) { rect(g, i, y, 3, 1, "W"); } });
      ellipseFill(g, 15.5, 20, 5.2, 8.5, "n");
      rect(g, 12, 19, 8, 1, "h");
      return ol(g);
    })();
    SPR.yukiusagi = (function () {
      const g = grid(15, 12);
      ellipseFill(g, 7, 9, 6.5, 3.6, "w");
      [[10, 11], [11, 10], [12, 11], [9, 11], [12, 9]].forEach(([x, y]) => dot(g, x, y, "W"));
      rect(g, 4, 1, 2, 5, "g"); dot(g, 4, 0, "g"); dot(g, 5, 3, "G"); dot(g, 5, 4, "G");
      rect(g, 9, 1, 2, 5, "g"); dot(g, 10, 0, "g"); dot(g, 9, 3, "G"); dot(g, 9, 4, "G");
      dot(g, 4, 8, "r"); dot(g, 9, 8, "r");
      return ol(g);
    })();

    // =================================================================== Hoa anh đào
    SPR.shidare = (function () {
      const g = grid(34, 40);
      rect(g, 15, 22, 4, 17, "B"); rect(g, 16, 22, 1, 17, "b");
      gline(g, 16, 23, 7, 12, "B"); gline(g, 18, 23, 27, 12, "B"); gline(g, 17, 22, 17, 7, "B");
      ellipseFill(g, 17, 11, 14, 8.5, "p");
      for (let x = 2; x < 32; x++) {
        const side = Math.abs(x - 17);
        if (side < 4) { continue; }
        const bottom = (side > 10 ? 29 : 33) + Math.floor(hash(x * 13) * 4) - (side > 13 ? 6 : 0);
        for (let y = 12; y <= bottom; y++) { dot(g, x, y, (x + Math.floor(y / 3)) % 3 === 0 ? "P" : "p"); }
        if (hash(x * 3 + 1) < 0.5) { dot(g, x, bottom - 1 - Math.floor(hash(x) * 6), "w"); }
      }
      disc(g, 13, 7, 3, "P"); disc(g, 22, 8, 2.6, "P"); disc(g, 17, 4, 2, "P");
      [[10, 9], [24, 6], [16, 11], [20, 13], [8, 12], [27, 11]].forEach(([x, y]) => dot(g, x, y, "w"));
      rect(g, 12, 39, 10, 1, "G");
      return ol(g);
    })();
    SPR.bonbori = (function () {
      const g = grid(10, 27);
      rect(g, 4, 13, 2, 12, "b"); rect(g, 4, 13, 1, 12, "t"); rect(g, 2, 25, 6, 2, "B");
      rect(g, 1, 3, 8, 9, "P"); rect(g, 2, 3, 1, 9, "w");
      rect(g, 2, 1, 6, 2, "r"); rect(g, 1, 2, 8, 1, "R"); rect(g, 2, 12, 6, 1, "r"); dot(g, 4, 0, "R"); dot(g, 5, 0, "R");
      [[4, 5], [6, 8], [3, 9], [7, 5]].forEach(([x, y]) => dot(g, x, y, "p"));
      dot(g, 6, 6, "r");
      return ol(g);
    })();
    SPR.hanamimat = (function () {
      const g = grid(32, 11);
      rect(g, 0, 5, 32, 6, "d");
      for (let x = 2; x < 32; x += 6) { rect(g, x, 5, 1, 6, "l"); }
      rect(g, 0, 8, 32, 1, "l");
      rect(g, 3, 3, 9, 4, "R"); rect(g, 4, 3, 7, 2, "w"); dot(g, 5, 3, "r"); rect(g, 8, 3, 2, 1, "y"); dot(g, 7, 4, "g"); dot(g, 10, 4, "o");
      ellipseFill(g, 20, 7, 3.5, 1.1, "w");
      gline(g, 16, 6, 24, 2, "t");
      disc(g, 18, 5, 1.2, "P"); disc(g, 20.5, 4, 1.2, "w"); disc(g, 23, 3, 1.2, "g");
      rect(g, 27, 4, 2, 3, "w"); dot(g, 27, 4, "s"); rect(g, 29, 6, 2, 1, "w");
      return ol(g);
    })();

    // =================================================================== Mùa mưa
    SPR.ajisai = (function () {
      const g = grid(16, 16);
      ellipseFill(g, 8, 12, 7.6, 3.6, "G");
      [[1, 11], [14, 12], [3, 14], [12, 14]].forEach(([x, y]) => { dot(g, x, y, "g"); dot(g, x + 1, y, "g"); });
      [[4.5, 7, 3.7, "d", "l"], [11.3, 6, 3.9, "v", "P"], [8, 10, 3.2, "l", "w"]].forEach(([x, y, r, c, c2]) => {
        disc(g, x, y, r, c);
        for (let j = Math.floor(y - r); j <= y + r; j++) {
          for (let i = Math.floor(x - r); i <= x + r; i++) { if (g[j] && g[j][i] === c && (i + j) % 2 === 0) { g[j][i] = c2; } }
        }
      });
      return ol(g);
    })();
    BASE.teruteru = (function () {
      const g = grid(14, 28);
      rect(g, 1, 1, 2, 26, "b"); rect(g, 1, 1, 1, 26, "t");
      rect(g, 1, 1, 11, 2, "b"); rect(g, 1, 1, 11, 1, "t");
      rect(g, 9, 3, 1, 3, "S");
      rect(g, 0, 26, 5, 2, "B");
      return ol(g);
    })();
    const TERU = (function () {
      const g = grid(9, 13);
      disc(g, 4, 3.4, 3.3, "w");
      dot(g, 3, 3, "k"); dot(g, 5, 3, "k"); dot(g, 3, 5, "k"); dot(g, 4, 6, "k"); dot(g, 5, 5, "k");
      dot(g, 2, 4, "P"); dot(g, 6, 4, "P");
      rect(g, 2, 7, 5, 1, "r");
      for (let j = 8; j < 13; j++) { const h = 1 + (j - 8); rect(g, 4 - h, j, 2 * h + 1, 1, "w"); }
      [[2, 10], [4, 11], [6, 10], [1, 12], [7, 12]].forEach(([x, y]) => dot(g, x, y, "s"));
      return ol(g);
    })();
    SPR.teruteru = compose(BASE.teruteru, TERU, 5, 6);
    SPR.kaeru = (function () {
      const g = grid(16, 12);
      ellipseFill(g, 8, 9.5, 7.6, 2.4, "G"); ellipseFill(g, 8, 9.2, 6.4, 1.6, "g"); dot(g, 13, 9, "G"); dot(g, 14, 9, ".");
      ellipseFill(g, 8, 6.4, 4.2, 2.6, "g"); rect(g, 6, 7, 5, 2, "f");
      disc(g, 5.3, 3, 1.4, "g"); disc(g, 10.7, 3, 1.4, "g");
      dot(g, 5, 3, "w"); dot(g, 11, 3, "w"); dot(g, 5, 2, "k"); dot(g, 11, 2, "k");
      rect(g, 6, 5, 5, 1, "G");
      rect(g, 2, 8, 2, 1, "g"); rect(g, 12, 8, 2, 1, "g"); dot(g, 3, 6, "G"); dot(g, 12, 6, "G");
      return ol(g);
    })();

    // =================================================================== Thất Tịch
    const STREAM = ["r", "y", "d", "g", "v", "p"];
    BASE.fukinagashi = (function () {
      const g = grid(16, 36);
      rect(g, 7, 9, 2, 25, "B"); rect(g, 7, 9, 1, 25, "b"); rect(g, 5, 34, 6, 2, "S");
      disc(g, 7.5, 5, 4.6, "p");
      const cols = ["p", "y", "v", "P", "r", "l"];
      for (let j = 0; j < 10; j++) { for (let i = 2; i < 14; i++) { if (g[j][i] === "p") { g[j][i] = cols[(i * 3 + j * 5) % cols.length]; } } }
      return ol(g);
    })();
    function streamers(g, now, amp) {
      STREAM.forEach((c, k) => {
        const x0 = 3 + k * 2;
        for (let j = 0; j < 17; j++) { dot(g, x0 + Math.round(Math.sin(now / 420 + k + j * 0.35) * (j / 17) * amp), 10 + j, c); }
      });
    }
    SPR.fukinagashi = (function () { const g = BASE.fukinagashi.map((r) => r.split("")); streamers(g, 0, 0); return rows(g); })();
    SPR.starlamp = (function () {
      const g = grid(18, 30);
      gline(g, 3, 29, 3, 9, "i"); gline(g, 3, 9, 9, 3, "i"); gline(g, 9, 3, 15, 6, "i"); dot(g, 2, 29, "B"); dot(g, 4, 29, "B");
      rect(g, 9, 4, 1, 4, "S"); rect(g, 14, 7, 1, 7, "S"); rect(g, 5, 9, 1, 10, "S");
      const s1 = grid(18, 30); star(s1, 9.5, 11.5, 4.4, 1.9, "y", "i"); star(s1, 14.5, 17.5, 3.6, 1.6, "l", "d"); star(s1, 5.5, 22.5, 3.6, 1.6, "P", "p");
      for (let j = 0; j < 30; j++) { for (let i = 0; i < 18; i++) { if (s1[j][i] !== ".") { g[j][i] = s1[j][i]; } } }
      dot(g, 9, 11, "w"); dot(g, 14, 17, "w"); dot(g, 5, 22, "w");
      return ol(g);
    })();
    BASE.orizuru = (function () {
      const g = grid(16, 30);
      rect(g, 1, 2, 2, 27, "b"); rect(g, 1, 2, 1, 27, "t"); rect(g, 1, 1, 14, 2, "b"); rect(g, 1, 1, 14, 1, "t");
      rect(g, 0, 28, 5, 2, "B");
      return ol(g);
    })();
    const CRANE_COL = ["r", "y", "d", "p", "g", "v", "o", "l"];
    function cranes(g, now, amp) {
      [6, 10, 14].forEach((x, s) => {
        const sw = Math.sin(now / 650 + s * 1.7) * amp;
        for (let j = 3; j < 25; j++) {
          const xx = x + Math.round(sw * (j - 3) / 22);
          if ((j - 4) % 4 === 0 && j > 3) {
            const c = CRANE_COL[(s * 3 + j) % CRANE_COL.length];
            dot(g, xx - 1, j, c); dot(g, xx + 1, j, c); dot(g, xx, j + 1, c);
          } else if ((j - 4) % 4 !== 1) { dot(g, xx, j, "S"); }
        }
      });
    }
    SPR.orizuru = (function () { const g = BASE.orizuru.map((r) => r.split("")); cranes(g, 0, 0); return rows(g); })();

    // =================================================================== Lễ hội mùa hè
    SPR.yagura = (function () {
      const g = grid(34, 40);
      rect(g, 3, 19, 2, 21, "B"); rect(g, 29, 19, 2, 21, "B"); rect(g, 11, 25, 2, 15, "b"); rect(g, 21, 25, 2, 15, "b");
      gline(g, 5, 26, 28, 38, "b"); gline(g, 28, 26, 5, 38, "b");
      rect(g, 2, 25, 30, 1, "B");
      for (let x = 2; x < 32; x++) { rect(g, x, 19, 1, 6, Math.floor((x - 2) / 3) % 2 ? "w" : "r"); }
      rect(g, 1, 16, 32, 3, "b"); rect(g, 1, 16, 32, 1, "t");
      rect(g, 1, 3, 1, 13, "B"); rect(g, 32, 3, 1, 13, "B");
      rect(g, 13, 13, 1, 3, "B"); rect(g, 20, 13, 1, 3, "B");
      disc(g, 16.5, 9.5, 4.6, "R"); disc(g, 16.5, 9.5, 3.4, "c");
      [[13, 7], [20, 7], [13, 12], [20, 12], [16, 5], [16, 14]].forEach(([x, y]) => dot(g, x, y, "y"));
      dot(g, 16, 9, "t"); dot(g, 17, 10, "t");
      for (let x = 2; x < 32; x++) { const y = 3 + Math.round(Math.sin(Math.PI * (x - 1) / 31) * 3); dot(g, x, y, "S"); }
      for (let x = 4; x < 31; x += 5) {
        const y = 4 + Math.round(Math.sin(Math.PI * (x - 1) / 31) * 3);
        rect(g, x - 1, y, 3, 3, "r"); dot(g, x, y + 1, "y"); dot(g, x - 1, y, "R"); dot(g, x + 1, y, "R");
      }
      return ol(g);
    })();
    function kakigori(ph) {
      const g = grid(16, 30);
      rect(g, 2, 0, 1, 29, "B");
      for (let x = 3; x < 15; x++) {
        const dy = Math.round(Math.sin(ph + x * 0.7) * (x - 3) / 11);
        rect(g, x, 1 + dy, 1, 12, "w");
        dot(g, x, 11 + dy, "d"); dot(g, x, 12 + dy, x % 3 === 0 ? "l" : "d");
        if (x >= 6 && x <= 11) {
          const dd = dy;
          if (x === 8 || x === 9) { rect(g, x, 3 + dd, 1, 6, "r"); }
          if (x === 6 || x === 7) { dot(g, x, 5 + dd, "r"); dot(g, x, 7 + dd + (x - 6), "r"); }
          if (x === 10 || x === 11) { dot(g, x, 4 + dd + (x - 10), "r"); dot(g, x, 7 + dd + (x - 10), "r"); }
        }
      }
      rect(g, 4, 20, 11, 2, "b"); rect(g, 4, 20, 11, 1, "t");
      rect(g, 5, 22, 1, 7, "B"); rect(g, 13, 22, 1, 7, "B");
      rect(g, 7, 17, 5, 3, "l"); dot(g, 7, 19, "."); dot(g, 11, 19, "."); rect(g, 8, 19, 3, 1, "l");
      disc(g, 9, 15, 2.6, "w"); rect(g, 7, 13, 5, 2, "r"); dot(g, 8, 14, "p"); dot(g, 10, 12, "r");
      return ol(g);
    }
    FRAMES.kakigori = [0, 1, 2, 3].map((k) => kakigori(k * Math.PI / 2));
    SPR.kakigori = FRAMES.kakigori[0];
    BASE.yoyo = (function () {
      const g = grid(16, 11);
      rect(g, 0, 4, 16, 7, "d"); rect(g, 1, 4, 14, 2, "l");
      [[3, 4], [10, 5], [7, 4]].forEach(([x, y]) => dot(g, x, y, "w"));
      for (let x = 1; x < 15; x += 4) { dot(g, x, 8, "l"); dot(g, x + 1, 7, "l"); dot(g, x + 2, 8, "l"); }
      return ol(g);
    })();
    const BALLS = [[3, "r"], [6, "y"], [9, "g"], [12, "v"]];
    function yoyoBalls(g, now) {
      BALLS.forEach(([x, c], k) => {
        const y = 2 + Math.round(Math.sin(now / 600 + k * 1.3) * 0.8);
        rect(g, x - 1, y, 3, 3, c); dot(g, x - 1, y, "w"); rect(g, x - 1, y + 1, 3, 1, "w"); dot(g, x, y + 1, c);
        if (k === 3) { dot(g, x + 2, y - 1, "S"); dot(g, x + 3, y - 2, "S"); }
      });
    }
    SPR.yoyo = (function () { const g = BASE.yoyo.map((r) => r.split("")); yoyoBalls(g, 0); return ol(g.map((r) => r.map((c) => c === "k" ? "." : c))); })();

    // =================================================================== Trung thu
    SPR.tsukimidango = (function () {
      const g = grid(16, 24);
      gline(g, 13, 22, 13, 3, "t"); gline(g, 12, 22, 10, 5, "t"); gline(g, 14, 22, 15, 7, "t");
      [[13, 1], [10, 3], [15, 5]].forEach(([x, y]) => { rect(g, x, y, 1, 4, "c"); dot(g, x - 1, y + 1, "c"); dot(g, x + 1, y + 2, "s"); });
      rect(g, 1, 17, 11, 2, "h"); rect(g, 1, 17, 11, 1, "t"); rect(g, 2, 16, 9, 1, "w");
      rect(g, 3, 19, 7, 4, "t"); rect(g, 5, 20, 3, 2, "b"); rect(g, 2, 23, 9, 1, "b");
      [[2, 14], [4, 14], [6, 14], [8, 14], [3, 12], [5, 12], [7, 12], [4, 10], [6, 10], [5, 8]].forEach(([x, y]) => {
        rect(g, x, y, 2, 2, "w"); dot(g, x + 1, y + 1, "s");
      });
      return ol(g);
    })();
    function usagi(down) {
      const g = grid(17, 18);
      rect(g, 7, 12, 9, 5, "B"); rect(g, 8, 12, 7, 1, "b"); rect(g, 6, 17, 11, 1, "B");
      rect(g, 9, 10, 5, 2, "w"); dot(g, 10, 10, "s");
      ellipseFill(g, 3.5, 12, 3, 4, "w"); disc(g, 4.5, 6.5, 2.6, "w");
      rect(g, 2, 0, 2, 5, "w"); rect(g, 5, 1, 2, 4, "w"); dot(g, 2, 1, "P"); dot(g, 2, 2, "P"); dot(g, 5, 2, "P");
      dot(g, 5, 6, "r"); dot(g, 6, 7, "P");
      rect(g, 1, 15, 3, 2, "w"); dot(g, 0, 12, "w");
      if (down) { gline(g, 6, 10, 11, 8, "b"); rect(g, 10, 6, 5, 3, "B"); rect(g, 10, 6, 5, 1, "b"); }
      else { gline(g, 6, 10, 9, 4, "b"); rect(g, 8, 1, 5, 3, "B"); rect(g, 8, 1, 5, 1, "b"); }
      dot(g, 6, 10, "w");
      return ol(g);
    }
    FRAMES.usagi = [usagi(false), usagi(true)];
    SPR.usagi = FRAMES.usagi[0];
    SPR.ongsao = (function () {
      const g = grid(14, 30);
      rect(g, 6, 13, 2, 17, "i"); rect(g, 6, 13, 1, 17, "y"); dot(g, 6, 18, "b"); dot(g, 6, 23, "b");
      star(g, 6.5, 7, 6.6, 2.7, "r", "R");
      dot(g, 6, 7, "y"); dot(g, 7, 7, "y"); dot(g, 6, 6, "Y");
      [[2, 9, 4], [11, 9, 4]].forEach(([x, y, n]) => { for (let k = 0; k < n; k++) { dot(g, x + (k % 2 ? 1 : 0), y + 2 + k, "y"); } });
      gline(g, 6, 1, 3, 6, "y"); gline(g, 7, 1, 10, 6, "y");
      return ol(g);
    })();

    // =================================================================== Halloween
    SPR.jacko = (function () {
      const g = grid(16, 14);
      ellipseFill(g, 7.5, 8.3, 7.4, 5.4, "o");
      for (let j = 3; j < 14; j++) {
        const t = 1 - Math.pow((j - 8.3) / 5.4, 2);
        if (t <= 0) { continue; }
        dot(g, Math.round(7.5 - 3.6 * Math.sqrt(t)), j, "O"); dot(g, Math.round(7.5 + 3.6 * Math.sqrt(t)), j, "O");
      }
      rect(g, 7, 0, 2, 3, "G"); dot(g, 9, 1, "g"); dot(g, 10, 1, "g");
      rect(g, 3, 7, 3, 1, "n"); dot(g, 4, 6, "n"); rect(g, 10, 7, 3, 1, "n"); dot(g, 11, 6, "n");
      dot(g, 7, 9, "n"); dot(g, 8, 9, "n");
      rect(g, 4, 11, 8, 1, "n"); dot(g, 4, 10, "n"); dot(g, 7, 10, "n"); dot(g, 11, 10, "n"); dot(g, 6, 12, "n"); dot(g, 9, 12, "n");
      dot(g, 2, 6, "h"); dot(g, 2, 7, "h");
      return ol(g);
    })();
    SPR.obake = (function () {
      const g = grid(15, 18);
      ellipseFill(g, 7, 6.5, 6, 6.3, "w"); rect(g, 1, 7, 12, 8, "w");
      for (let x = 1; x < 13; x++) { if (x % 3 !== 0) { dot(g, x, 15, "w"); } if (x % 3 === 1) { dot(g, x, 16, "w"); } }
      for (let j = 4; j < 15; j++) { dot(g, 12, j, "s"); }
      rect(g, 0, 9, 1, 2, "w"); rect(g, 13, 9, 2, 2, "w"); dot(g, 14, 8, "w");
      rect(g, 4, 6, 1, 2, "k"); rect(g, 9, 6, 1, 2, "k");
      rect(g, 6, 9, 2, 2, "k"); dot(g, 6, 10, "r"); dot(g, 3, 9, "P"); dot(g, 10, 9, "P");
      return ol(g);
    })();
    SPR.cauldron = (function () {
      const g = grid(16, 16);
      ellipseFill(g, 8, 10, 7, 5, "n"); rect(g, 3, 14, 2, 2, "n"); rect(g, 11, 14, 2, 2, "n");
      rect(g, 1, 5, 14, 2, "S"); rect(g, 2, 5, 12, 1, "s");
      rect(g, 2, 3, 12, 2, "g"); [[4, 3], [8, 3], [11, 4], [6, 4]].forEach(([x, y]) => dot(g, x, y, "f"));
      disc(g, 9, 2, 1, "g"); dot(g, 9, 1, "f"); dot(g, 3, 7, "g"); dot(g, 3, 8, "g"); dot(g, 12, 7, "g");
      dot(g, 4, 9, "m"); dot(g, 4, 10, "m"); dot(g, 5, 11, "m");
      return ol(g);
    })();

    // =================================================================== Mùa lá đỏ
    SPR.ichou = (function () {
      const g = grid(32, 39);
      ellipseFill(g, 16, 14, 11.5, 13.5, "y");
      for (let k = 0; k < 60; k++) {
        const x = Math.floor(hash(k * 7 + 3) * 32), y = Math.floor(hash(k * 5 + 9) * 28);
        if (g[y][x] === "y") { dot(g, x, y, k % 4 === 0 ? "o" : k % 2 ? "i" : "Y"); }
      }
      rect(g, 14, 25, 4, 12, "B"); rect(g, 15, 25, 1, 12, "b");
      gline(g, 15, 26, 9, 20, "B"); gline(g, 17, 26, 23, 19, "B");
      rect(g, 3, 37, 26, 2, "y"); [[5, 37], [9, 38], [14, 37], [20, 38], [25, 37], [11, 37]].forEach(([x, y]) => dot(g, x, y, "i"));
      return ol(g);
    })();
    SPR.nodate = (function () {
      const g = grid(32, 30);
      for (let j = 1; j <= 10; j++) {
        const half = Math.round(15 * Math.sqrt(1 - Math.pow((10 - j) / 9.5, 2)));
        rect(g, 16 - half, j, half * 2, 1, "r");
      }
      for (let x = 1; x < 31; x++) { if (x % 2) { dot(g, x, 11, "r"); } }
      [-12, -7, -2, 3, 8, 13].forEach((dx) => gline(g, 16, 1, 16 + dx, 10, "R"));
      rect(g, 15, 1, 2, 1, "B");
      rect(g, 16, 11, 1, 18, "B");
      rect(g, 3, 20, 26, 3, "r"); rect(g, 3, 20, 26, 1, "p"); for (let x = 3; x < 29; x += 2) { dot(g, x, 23, "R"); }
      rect(g, 5, 23, 2, 6, "B"); rect(g, 25, 23, 2, 6, "B");
      rect(g, 7, 18, 4, 2, "n"); rect(g, 8, 18, 2, 1, "g");
      rect(g, 20, 19, 5, 1, "w"); dot(g, 21, 18, "p"); dot(g, 23, 18, "g");
      return ol(g);
    })();
    SPR.ochiba = (function () {
      const g = grid(16, 8);
      const cols = ["r", "o", "y", "b", "R", "o", "h"];
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 16; i++) {
          const dx = (i - 7.5) / 7.6, dy = (j - 8) / 6.5;
          if (dx * dx + dy * dy <= 1) { g[j][i] = cols[Math.floor(hash(i * 31 + j * 7) * cols.length)]; }
        }
      }
      return ol(g);
    })();

    // =================================================================== Giáng sinh
    const TREE_LIGHTS = [[12, 11], [19, 13], [9, 18], [16, 19], [23, 20], [6, 26], [13, 26], [20, 27], [26, 28], [10, 31], [17, 32]];
    SPR.xmastree = (function () {
      const g = grid(32, 44);
      [[5, 14, 6.5], [10, 23, 10.5], [17, 33, 14]].forEach(([y0, y1, hw]) => {
        for (let j = y0; j <= y1; j++) {
          const half = Math.round(hw * (j - y0 + 2) / (y1 - y0 + 2));
          for (let i = 16 - half; i <= 15 + half; i++) { dot(g, i, j, i < 14 ? "g" : i > 18 ? "j" : "G"); }
        }
        for (let i = 16 - Math.round(hw); i <= 15 + Math.round(hw); i += 3) { dot(g, i, y1 + 1, "G"); }
      });
      for (let k = 0; k < 9; k++) { dot(g, 10 + k * 1.6, 14 + k, "i"); dot(g, 23 - k * 1.7, 22 + k * 1.1, "y"); }
      [[14, 9, "r"], [11, 16, "d"], [20, 17, "r"], [8, 23, "y"], [17, 24, "v"], [24, 24, "d"], [12, 29, "r"], [21, 31, "y"], [6, 31, "v"], [26, 32, "r"]]
        .forEach(([x, y, c]) => { rect(g, x, y, 2, 2, c); dot(g, x, y, "w"); });
      star(g, 15.5, 3.2, 3.4, 1.5, "y", "i");
      rect(g, 14, 34, 4, 3, "B");
      rect(g, 9, 37, 14, 7, "r"); rect(g, 8, 37, 16, 1, "R"); rect(g, 9, 39, 14, 1, "i");
      return ol(g);
    })();
    SPR.presents = (function () {
      const g = grid(16, 16);
      rect(g, 0, 7, 10, 9, "r"); rect(g, 4, 7, 2, 9, "y"); rect(g, 0, 10, 10, 1, "y"); rect(g, 0, 7, 10, 1, "R");
      rect(g, 2, 2, 7, 5, "g"); rect(g, 5, 2, 1, 5, "r"); rect(g, 2, 2, 7, 1, "G");
      dot(g, 3, 1, "y"); dot(g, 4, 0, "y"); dot(g, 6, 0, "y"); dot(g, 7, 1, "y"); dot(g, 5, 1, "o");
      rect(g, 11, 10, 5, 6, "d"); rect(g, 13, 10, 1, 6, "w"); rect(g, 11, 12, 5, 1, "w"); rect(g, 11, 10, 5, 1, "u");
      dot(g, 12, 9, "w"); dot(g, 14, 9, "w");
      return ol(g);
    })();
    SPR.sleigh = (function () {
      const g = grid(34, 22);
      ellipseFill(g, 9, 11.5, 5.8, 3.2, "b"); rect(g, 6, 13, 6, 1, "h");
      [[5, 14], [7, 14], [11, 14], [13, 14]].forEach(([x, y], k) => rect(g, x, y, 1, 6, k % 2 ? "b" : "B"));
      rect(g, 2, 7, 3, 5, "b"); ellipseFill(g, 2.5, 6, 2.2, 1.8, "b"); rect(g, 0, 6, 2, 2, "h");
      dot(g, 0, 6, "r"); dot(g, 2, 5, "k");
      gline(g, 3, 4, 2, 0, "B"); gline(g, 3, 4, 5, 1, "B"); dot(g, 1, 1, "B"); dot(g, 6, 0, "B"); dot(g, 4, 2, "B");
      rect(g, 3, 9, 3, 1, "r"); dot(g, 4, 10, "i");
      dot(g, 15, 10, "w"); dot(g, 15, 11, "w");
      gline(g, 13, 10, 19, 12, "R");
      rect(g, 18, 12, 13, 6, "r"); rect(g, 28, 7, 4, 11, "r"); rect(g, 18, 12, 10, 1, "i"); rect(g, 28, 7, 4, 1, "i");
      rect(g, 18, 17, 14, 1, "R"); rect(g, 19, 14, 7, 2, "R");
      [20, 25, 30].forEach((x) => rect(g, x, 18, 1, 2, "S"));
      rect(g, 17, 20, 17, 1, "s"); gline(g, 17, 20, 15, 17, "s"); dot(g, 16, 16, "s");
      disc(g, 23, 9, 3, "h"); dot(g, 23, 6, "t"); dot(g, 22, 6, "t"); rect(g, 20, 8, 2, 3, "g"); rect(g, 25, 9, 2, 2, "d");
      return ol(g);
    })();
    SPR.wreath = (function () {
      const g = grid(16, 17);
      for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 16; i++) {
          const d = Math.hypot(i - 7.5, j - 7.5);
          if (d >= 4.3 && d <= 7.6) { g[j][i] = (i * 3 + j * 5) % 7 === 0 ? "j" : (i + j) % 3 === 0 ? "g" : "G"; }
        }
      }
      [[3, 4], [11, 3], [13, 9], [2, 10], [7, 1], [10, 12]].forEach(([x, y]) => dot(g, x, y, "r"));
      rect(g, 4, 12, 3, 3, "r"); rect(g, 9, 12, 3, 3, "r"); rect(g, 7, 13, 2, 2, "R");
      dot(g, 6, 15, "R"); dot(g, 9, 15, "R"); dot(g, 5, 16, "R"); dot(g, 10, 16, "R");
      rect(g, 7, 10, 2, 2, "i"); dot(g, 7, 10, "y");
      return ol(g);
    })();

    // =================================================================== Năm mới Nhật Bản
    SPR.kadomatsu = (function () {
      const g = grid(16, 30);
      [[3, 7], [6, 1], [9, 4]].forEach(([x0, top]) => {
        rect(g, x0, top + 2, 3, 22 - top, "g"); rect(g, x0, top + 2, 1, 22 - top, "f"); rect(g, x0 + 2, top + 2, 1, 22 - top, "G");
        for (let i = 0; i < 3; i++) { for (let j = top + (2 - i); j < top + 2; j++) { dot(g, x0 + i, j, "g"); } dot(g, x0 + i, top + (2 - i), "f"); }
        for (let y = top + 8; y < 22; y += 6) { rect(g, x0, y, 3, 1, "G"); }
      });
      [[1, 18], [13, 17], [0, 20], [14, 20], [2, 16], [12, 15]].forEach(([x, y]) => { disc(g, x, y, 1.6, "j"); dot(g, x, y, "G"); });
      [[1, 21], [13, 19], [3, 18]].forEach(([x, y]) => dot(g, x, y, "r"));
      rect(g, 2, 22, 11, 8, "h"); for (let x = 3; x < 13; x += 2) { rect(g, x, 22, 1, 8, "t"); }
      rect(g, 2, 23, 11, 1, "B"); rect(g, 2, 27, 11, 1, "B");
      return ol(g);
    })();
    BASE.tako = (function () {
      const g = grid(16, 40);
      rect(g, 2, 36, 2, 4, "B"); rect(g, 1, 39, 4, 1, "B");
      return ol(g);
    })();
    const KITE = (function () {
      const g = grid(11, 14);
      rect(g, 0, 0, 11, 11, "w"); rect(g, 0, 0, 11, 1, "B"); rect(g, 0, 10, 11, 1, "B"); rect(g, 0, 0, 1, 11, "B"); rect(g, 10, 0, 1, 11, "B");
      gline(g, 0, 0, 10, 10, "t"); gline(g, 10, 0, 0, 10, "t");
      disc(g, 5, 5.5, 3, "r"); rect(g, 1, 1, 9, 1, "d");
      dot(g, 2, 11, "r"); dot(g, 2, 12, "r"); dot(g, 1, 13, "r"); dot(g, 8, 11, "y"); dot(g, 8, 12, "y"); dot(g, 9, 13, "y");
      return ol(g);
    })();
    function kiteString(g, x0, y0, x1, y1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let t = 0; t <= n; t++) {
        const k = t / n, sag = Math.sin(Math.PI * k) * 2;
        if (t % 2 === 0) { dot(g, Math.round(x0 + (x1 - x0) * k + sag), Math.round(y0 + (y1 - y0) * k), "S"); }
      }
    }
    SPR.tako = (function () { const g = BASE.tako.map((r) => r.split("")); kiteString(g, 3, 35, 8, 13); return compose(rows(g), KITE, 3, 0); })();
    SPR.kagamimochi = (function () {
      const g = grid(16, 18);
      rect(g, 2, 12, 12, 2, "h"); rect(g, 2, 12, 12, 1, "t"); rect(g, 4, 14, 8, 3, "t"); rect(g, 7, 15, 2, 2, "b"); rect(g, 3, 17, 10, 1, "b");
      rect(g, 1, 11, 14, 1, "w"); dot(g, 1, 11, "r"); dot(g, 14, 11, "r");
      ellipseFill(g, 8, 8.6, 6.2, 2.6, "w"); rect(g, 3, 10, 10, 1, "s");
      ellipseFill(g, 8, 5.4, 4.6, 2.2, "w"); rect(g, 5, 7, 6, 1, "s");
      disc(g, 8, 2.2, 2, "o"); dot(g, 9, 1, "y"); dot(g, 9, 0, "g"); dot(g, 10, 0, "g");
      return ol(g);
    })();

    // =================================================================== Tết Nguyên Đán
    SPR.hoamai = (function () {
      const g = grid(34, 36);
      gline(g, 17, 26, 15, 19, "B"); gline(g, 16, 26, 14, 19, "B"); gline(g, 15, 19, 18, 12, "B"); gline(g, 14, 19, 17, 12, "B");
      gline(g, 15, 20, 6, 13, "B"); gline(g, 6, 13, 3, 7, "B"); gline(g, 17, 14, 27, 9, "B"); gline(g, 27, 9, 30, 4, "B");
      gline(g, 18, 12, 16, 4, "B"); gline(g, 16, 4, 19, 1, "B"); gline(g, 10, 16, 11, 8, "B"); gline(g, 22, 12, 24, 17, "B");
      gline(g, 8, 14, 2, 15, "B"); gline(g, 26, 10, 31, 12, "B");
      const fl = [[3, 6], [6, 9], [2, 14], [5, 13], [9, 7], [11, 10], [8, 15], [12, 13], [14, 4], [17, 2], [19, 5], [16, 8],
        [20, 9], [23, 8], [26, 6], [29, 3], [30, 8], [27, 11], [31, 13], [24, 15], [21, 14], [13, 17], [4, 10], [18, 15], [10, 4], [22, 3]];
      fl.forEach(([x, y], k) => flower5(g, x, y, k % 5 === 0 ? "i" : "y", "o"));
      [[7, 5], [15, 11], [25, 13], [28, 15], [12, 6], [20, 1]].forEach(([x, y]) => dot(g, x, y, "g"));
      [[6, 16], [24, 12], [19, 17]].forEach(([x, y]) => { rect(g, x, y, 2, 3, "r"); dot(g, x, y + 1, "i"); dot(g, x + 1, y + 1, "i"); });
      rect(g, 9, 26, 16, 1, "l"); rect(g, 8, 27, 18, 1, "d"); rect(g, 9, 28, 16, 6, "d"); rect(g, 11, 34, 12, 2, "u");
      [[11, 30], [15, 29], [19, 31], [22, 29], [13, 32]].forEach(([x, y]) => { dot(g, x, y, "w"); dot(g, x + 1, y + 1, "w"); });
      rect(g, 9, 28, 1, 6, "l");
      return ol(g);
    })();
    BASE.banhchung = (function () {
      const g = grid(16, 22);
      rect(g, 1, 17, 4, 5, "S"); rect(g, 11, 17, 4, 5, "S"); rect(g, 1, 17, 4, 1, "m"); rect(g, 11, 17, 4, 1, "m");
      rect(g, 4, 20, 8, 2, "B"); rect(g, 5, 20, 6, 1, "b");
      rect(g, 2, 7, 12, 10, "n"); rect(g, 3, 8, 1, 8, "m");
      rect(g, 1, 6, 14, 2, "S"); rect(g, 1, 6, 14, 1, "s"); rect(g, 0, 8, 1, 3, "S"); rect(g, 15, 8, 1, 3, "S");
      rect(g, 3, 4, 10, 2, "S"); rect(g, 3, 4, 10, 1, "s"); rect(g, 7, 3, 2, 1, "m");
      dot(g, 12, 4, "g"); dot(g, 13, 4, "g"); dot(g, 13, 5, "G");
      return ol(g);
    })();
    SPR.banhchung = (function () {
      const g = BASE.banhchung.map((r) => r.split(""));
      rect(g, 6, 17, 1, 3, "r"); rect(g, 8, 16, 1, 4, "o"); rect(g, 9, 18, 1, 2, "y");
      return rows(g);
    })();
    SPR.hoadao = (function () {
      const g = grid(16, 30);
      gline(g, 8, 17, 3, 4, "B"); gline(g, 8, 17, 13, 3, "B"); gline(g, 8, 17, 8, 1, "B"); gline(g, 5, 10, 1, 8, "B");
      gline(g, 11, 9, 15, 8, "B"); gline(g, 8, 8, 5, 2, "B");
      [[3, 4], [1, 8], [5, 7], [4, 11], [6, 2], [8, 1], [9, 5], [12, 3], [14, 7], [11, 10], [13, 12], [7, 13], [10, 15], [2, 6]]
        .forEach(([x, y], k) => flower5(g, x, y, k % 3 ? "p" : "P", k % 2 ? "w" : "r"));
      [[6, 9], [12, 6], [9, 12]].forEach(([x, y]) => dot(g, x, y, "R"));
      rect(g, 5, 17, 6, 1, "d"); rect(g, 6, 18, 4, 3, "u");
      ellipseFill(g, 8, 24.5, 5, 4.6, "u"); rect(g, 5, 29, 6, 1, "U");
      [[5, 23], [8, 22], [11, 24], [6, 26], [10, 27]].forEach(([x, y]) => dot(g, x, y, "w"));
      rect(g, 4, 24, 1, 2, "d");
      return ol(g);
    })();
    const GLYPH = [
      ["01110", "00100", "11111", "01010", "11111"], ["10101", "01110", "11111", "00100", "01010"],
      ["11111", "10001", "11111", "00100", "11111"], ["00100", "11111", "01010", "11111", "10001"]
    ];
    SPR.caudoi = (function () {
      const g = grid(32, 27);
      [2, 24].forEach((x0, s) => {
        rect(g, x0, 1, 6, 25, "r"); rect(g, x0 - 1, 0, 8, 1, "B"); rect(g, x0 - 1, 26, 8, 1, "B"); rect(g, x0 + 5, 1, 1, 25, "R");
        for (let k = 0; k < 4; k++) {
          GLYPH[(k + s * 2) % GLYPH.length].forEach((r, j) => { for (let i = 0; i < 5; i++) { if (r[i] === "1") { dot(g, x0 + i, 2 + k * 6 + j, "i"); } } });
        }
      });
      for (let j = 4; j <= 20; j++) { for (let i = 8; i <= 24; i++) { const d = Math.abs(i - 16) + Math.abs(j - 12); if (d <= 8) { g[j][i] = d === 8 ? "R" : "r"; } } }
      ["0010100", "1111111", "0101010", "0111110", "0010100", "1111111", "0100010"].forEach((r, j) => {
        for (let i = 0; i < 7; i++) { if (r[i] === "1") { dot(g, 13 + i, 9 + j, "y"); } }
      });
      return ol(g);
    })();

    // =================================================================== đung đưa, phát sáng
    Object.assign(SWAY, { tulip: 1200, starlamp: 1000, ongsao: 1300, ajisai: 1600, nanohana: 1400 });
    Object.assign(GLOW, { kamakura: [15, 14], jacko: [8, 11], bonbori: [7, 12], starlamp: [12, 13], ongsao: [7, 12],
      xmastree: [20, 18], yagura: [5, 18], cauldron: [3, 9] });

    // =================================================================== phần vẽ động
    function lineDots(ctx, S, pts, c) { ctx.fillStyle = c; pts.forEach(([x, y]) => ctx.fillRect(Math.round(x * S), Math.round(y * S), S, S)); }
    Object.assign(EXTRA, {
      teruteru: function (ctx, S, X, Y, e, now) {
        const wind = windOf(skyNow());
        const sx = Math.round(Math.sin(now / 700 + e.x) * (wind >= 2 ? 2 : 1));
        lineDots(ctx, S, [[X + 9, Y + 5]], P.S);
        sprite(ctx, TERU, X + 5 + sx, Y + 6, S);
      },
      fukinagashi: function (ctx, S, X, Y, e, now) {
        const amp = windOf(skyNow()) >= 2 ? 3.5 : 2;
        STREAM.forEach((c, k) => {
          const x0 = 3 + k * 2, pts = [];
          for (let j = 0; j < 17; j++) { pts.push([X + x0 + Math.round(Math.sin(now / 420 + k + j * 0.35 + e.x) * (j / 17) * amp), Y + 10 + j]); }
          lineDots(ctx, S, pts, P[c]);
        });
      },
      orizuru: function (ctx, S, X, Y, e, now) {
        const amp = windOf(skyNow()) >= 2 ? 3 : 1.6;
        [6, 10, 14].forEach((x, s) => {
          const sw = Math.sin(now / 650 + s * 1.7 + e.x) * amp;
          for (let j = 3; j < 25; j++) {
            const xx = X + x + Math.round(sw * (j - 3) / 22), yy = Y + j;
            if ((j - 4) % 4 === 0 && j > 3) {
              const c = P[CRANE_COL[(s * 3 + j) % CRANE_COL.length]];
              lineDots(ctx, S, [[xx - 1, yy], [xx + 1, yy], [xx, yy + 1]], c);
            } else if ((j - 4) % 4 !== 1) { lineDots(ctx, S, [[xx, yy]], P.S); }
          }
        });
      },
      yoyo: function (ctx, S, X, Y, e, now) {
        BALLS.forEach(([x, c], k) => {
          const y = Y + 2 + Math.round(Math.sin(now / 600 + k * 1.3 + e.x) * 0.8);
          box(ctx, X + x - 2, y - 1, 5, 5, P.k, S);
          box(ctx, X + x - 1, y, 3, 3, P[c], S); box(ctx, X + x - 1, y + 1, 3, 1, P.w, S); box(ctx, X + x, y + 1, 1, 1, P[c], S);
          box(ctx, X + x - 1, y, 1, 1, P.w, S);
        });
      },
      tako: function (ctx, S, X, Y, e, now) {
        const w = windOf(skyNow());
        const dx = Math.round(Math.sin(now / 900 + e.x) * (1 + w)), dy = Math.round(Math.cos(now / 1300 + e.x) * 1.5);
        const pts = [], x0 = X + 3, y0 = Y + 35, x1 = X + 8 + dx, y1 = Y + 13 + dy;
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let t = 0; t <= n; t += 2) { const k = t / n; pts.push([Math.round(x0 + (x1 - x0) * k + Math.sin(Math.PI * k) * 2), Math.round(y0 + (y1 - y0) * k)]); }
        lineDots(ctx, S, pts, P.S);
        sprite(ctx, KITE, X + 3 + dx, Y + dy, S);
        const tail = Math.floor(now / 200) % 2;
        lineDots(ctx, S, [[X + 4 + dx - tail, Y + 14 + dy]], P.r); lineDots(ctx, S, [[X + 12 + dx + tail, Y + 14 + dy]], P.y);
      },
      xmastree: function (ctx, S, X, Y, e, now, tod) {
        const night = tod !== "day", cols = [P.r, P.y, P.l, P.p, P.f];
        TREE_LIGHTS.forEach(([x, y], k) => {
          const on = (Math.floor(now / 450) + k) % 3 !== 0;
          if (!on && !night) { return; }
          const c = on ? cols[(k + Math.floor(now / 1350)) % cols.length] : "#3a3f55";
          if (night && on) { ctx.globalAlpha = 0.35; box(ctx, X + x - 1, Y + y - 1, 3, 3, c, S); ctx.globalAlpha = 1; }
          box(ctx, X + x, Y + y, 1, 1, c, S);
        });
        if (Math.floor(now / 300) % 4 === 0) { box(ctx, X + 15, Y - 1, 1, 1, P.w, S); box(ctx, X + 19, Y + 3, 1, 1, P.Y, S); }
      },
      sleigh: function (ctx, S, X, Y, e, now, tod) {
        const on = Math.floor(now / 500) % 2 === 0;
        if (tod !== "day") {
          if (on) { ctx.globalAlpha = 0.35; box(ctx, X - 1, Y + 5, 3, 3, "#ff6a6a", S); ctx.globalAlpha = 1; }
          box(ctx, X, Y + 6, 1, 1, on ? "#ff6a6a" : P.R, S);
        }
      },
      jacko: function (ctx, S, X, Y, e, now, tod) {
        if (tod === "day") { return; }
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(now / 130 + e.x);
        box(ctx, X + 3, Y + 5, 10, 8, P.y, S);
        ctx.globalAlpha = 1;
      },
      cauldron: function (ctx, S, X, Y, e, now) {
        const cols = [P.r, P.o, P.y];
        for (let k = 0; k < 4; k++) {
          const hh = 1 + ((Math.floor(now / 120) + k * 2) % 2);
          box(ctx, X + 5 + k * 2, Y + 16 - hh, 1, hh, cols[(k + Math.floor(now / 170)) % 3], S);
        }
        if (Math.floor(now / 350 + e.x) % 3 === 0) { box(ctx, X + 6 + Math.floor(now / 350) % 5, Y + 2, 1, 1, P.f, S); }
      },
      banhchung: function (ctx, S, X, Y, e, now, tod) {
        const cols = [P.r, P.o, P.y];
        for (let k = 0; k < 4; k++) {
          const hh = 1 + ((Math.floor(now / 110) + k * 2) % 3);
          box(ctx, X + 5 + k * 2, Y + 20 - hh, 1, hh, cols[(k + Math.floor(now / 160)) % 3], S);
        }
        if (tod !== "day") { ctx.globalAlpha = 0.2; box(ctx, X + 3, Y + 16, 10, 4, P.o, S); ctx.globalAlpha = 1; }
      },
      kamakura: function (ctx, S, X, Y, e, now, tod) {
        if (tod === "day") { return; }
        const f = Math.floor(now / 160 + e.x) % 3;
        box(ctx, X + 15, Y + 15 - (f === 0 ? 1 : 0), 1, 2, P.y, S); box(ctx, X + 15, Y + 17, 1, 2, P.w, S);
      },
      kaeru: function (ctx, S, X, Y, e, now) {
        const t = (now + e.x * 777) % 3600;
        if (t < 700) {
          const r = t < 350 ? 1 : 2;
          box(ctx, X + 7, Y + 8, 3, r, P.w, S);
        }
      },
      starlamp: function (ctx, S, X, Y, e, now, tod) {
        if (tod === "day" || Math.floor(now / 400 + e.x) % 3) { return; }
        box(ctx, X + 9, Y + 6, 1, 1, P.w, S); box(ctx, X + 14, Y + 13, 1, 1, P.w, S);
      },
      yagura: function (ctx, S, X, Y, e, now, tod) {
        const t = ((now + e.x * 300) % 2200 + 2200) % 2200;
        if (t < 380) {
          ctx.globalAlpha = 0.7 * (1 - t / 380);
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, S / 2);
          ctx.beginPath(); ctx.arc((X + 17) * S, (Y + 10) * S, (7 + t / 40) * S, -2.7, -0.4); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (tod !== "day") {
          for (let x = 4; x < 31; x += 5) {
            const y = 4 + Math.round(Math.sin(Math.PI * (x - 1) / 31) * 3);
            ctx.globalAlpha = 0.3; box(ctx, X + x - 2, Y + y - 1, 5, 5, P.o, S); ctx.globalAlpha = 1;
            box(ctx, X + x, Y + y + 1, 1, 1, P.Y, S);
          }
        }
      },
      ongsao: function (ctx, S, X, Y, e, now, tod) {
        if (tod === "day") { return; }
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(now / 200 + e.x);
        box(ctx, X + 4, Y + 4, 5, 6, P.y, S);
        ctx.globalAlpha = 1;
      }
    });

    // món có khung hoạt hình: chọn khung theo thời gian
    function frameOf(e, now) {
      if (e.id === "kakigori") {
        const w = windOf(skyNow());
        return FRAMES.kakigori[Math.floor(now / (w >= 2 ? 120 : w >= 1.2 ? 220 : 380) + e.x) % 4];
      }
      if (e.id === "usagi") { return FRAMES.usagi[((now + e.x * 400) % 1100) < 260 ? 1 : 0]; }
      return null;
    }

    // [lệch ngang, lệch dọc] hoặc null
    function motion(e, now, amp) {
      const st = skyNow();
      if (e.id === "obake") { return [Math.round(Math.sin(now / 1300 + e.x) * 1.5), -Math.round(2 + Math.sin(now / 700 + e.x) * 2)]; }
      if (e.id === "presents" && (now + e.x * 900) % 6000 < 240) { return [0, -1]; }
      if (e.id === "kaeru" && st && st.rain && (now + e.x * 777) % 2600 < 420) {
        return [0, -Math.round(3 * Math.sin(Math.PI * ((now + e.x * 777) % 2600) / 420))];
      }
      if (e.id === "yukiusagi" && (now + e.x * 500) % 5200 < 160) { return [0, -1]; }
      if (e.id === "jacko" && (now + e.x * 600) % 4000 < 300) { return [Math.floor(now / 75) % 2 ? 1 : -1, 0]; }
      return null;
    }
    // bảng màu riêng (ban đêm…) hoặc null
    function pal(e, night, now) {
      if (!night) { return null; }
      if (e.id === "jacko") { return Object.assign({}, P, { n: Math.floor(now / 140 + e.x) % 4 ? P.y : P.o }); }
      if (e.id === "kamakura") { return Object.assign({}, P, { n: "#e8873a", h: "#ffd27a" }); }
      if (e.id === "bonbori") { return Object.assign({}, P, { P: "#ffe8f0", w: "#fffaf0" }); }
      if (e.id === "starlamp") { return Object.assign({}, P, { y: "#fff36a", l: "#c8f0ff", P: "#ffe0ec" }); }
      if (e.id === "ongsao") { return Object.assign({}, P, { r: "#ff7a50", R: "#e8483a" }); }
      return null;
    }
    // hạt phát ra từ món đồ; bx = khung sprite, add(o) thêm hạt
    function emit(e, bx, dt, night, add) {
      const r = Math.random(), st = skyNow(), wet = st && (st.rain || st.snow);
      const wind = windOf(st);
      switch (e.id) {
        case "nanohana": if (!night && !wet && r < dt * 0.3) { add({ kind: "bfly", x: bx.x + 4 + Math.random() * 24, y: bx.y + 2, vx: 0, vy: -2, life: 7, color: Math.random() < 0.6 ? "#ffe95c" : "#ffffff" }); } break;
        case "kayari": if (r < dt * 2.2) { add({ kind: "incense", x: bx.x + 16, y: bx.y + 5, vx: 0.6, vy: -3.2, life: 2.4 }); } break;
        case "kaki": if (r < dt * 0.35 * Math.max(1, wind)) { add({ kind: "leaf", x: bx.x + 4 + Math.random() * 24, y: bx.y + 6 + Math.random() * 12, vx: 2 + Math.random() * 3, vy: 5 + Math.random() * 3, life: 3.4 }); } break;
        case "yakiimo": if (r < dt * 1.6) { add({ kind: "smoke", x: bx.x + 13 + Math.random(), y: bx.y, vx: 1 + Math.random() * 2, vy: -5 - Math.random() * 2, life: 2.2 }); } break;
        case "shidare": if (r < dt * 1.4) { add({ kind: "petal", x: bx.x + 3 + Math.random() * 28, y: bx.y + 10 + Math.random() * 18, vx: 3 + Math.random() * 3, vy: 5 + Math.random() * 3, life: 3.2 }); } break;
        case "ajisai": if (st && st.rain && r < dt * 1.6) { add({ kind: "drip", x: bx.x + 2 + Math.random() * 12, y: bx.y + 4 + Math.random() * 6, vx: 0, vy: 7, life: 0.4 }); } break;
        case "cauldron":
          if (r < dt * 2.6) { add({ kind: "gbub", x: bx.x + 3 + Math.random() * 10, y: bx.y + 2, vx: (Math.random() - 0.5) * 2, vy: -4 - Math.random() * 2, life: 1.3 }); }
          else if (night && r < dt * 3.2) { add({ kind: "wisp", x: bx.x + 4 + Math.random() * 8, y: bx.y, vx: (Math.random() - 0.5) * 2, vy: -3, life: 1.6 }); }
          break;
        case "ichou": if (r < dt * 1.2 * Math.max(1, wind * 0.8)) { add({ kind: "gleaf", x: bx.x + 5 + Math.random() * 22, y: bx.y + 4 + Math.random() * 20, vx: 2 + Math.random() * 3, vy: 5 + Math.random() * 3, life: 3.4 }); } break;
        case "nodate": if (r < dt * 1.3) { add({ kind: "steam", x: bx.x + 8 + Math.random() * 2, y: bx.y + 17, vx: 0.5 + Math.random(), vy: -4, life: 1.6 }); } break;
        case "ochiba": if (wind >= 1.2 && r < dt * 0.9 * wind) { add({ kind: "leaf", x: bx.x + 4 + Math.random() * 8, y: bx.y + 3, vx: 6 + wind * 3, vy: -5 - Math.random() * 3, life: 2.2, grav: 1 }); } break;
        case "xmastree": if (r < dt * 0.6) { add({ kind: "spark", x: bx.x + 13 + Math.random() * 5, y: bx.y + 1 + Math.random() * 4, vx: 0, vy: -1.5, life: 0.7 }); } break;
        case "hoamai": if (r < dt * 0.9) { add({ kind: "ypetal", x: bx.x + 3 + Math.random() * 28, y: bx.y + 2 + Math.random() * 16, vx: 3 + Math.random() * 3, vy: 5 + Math.random() * 3, life: 3.2 }); } break;
        case "banhchung": if (r < dt * 2.8) { add({ kind: "steam2", x: bx.x + 4 + Math.random() * 8, y: bx.y + 3, vx: (Math.random() - 0.5) * 2, vy: -4 - Math.random() * 2, life: 2.2 }); } break;
        case "hoadao": if (r < dt * 0.45) { add({ kind: "petal", x: bx.x + 2 + Math.random() * 12, y: bx.y + 2 + Math.random() * 12, vx: 1 + Math.random() * 2, vy: 4 + Math.random() * 2, life: 3 }); } break;
        case "usagi": {
          const t = (Date.now() + e.x * 400) % 1100;
          if (t < 60 && r < dt * 14) { add({ kind: "smoke", x: bx.x + 11 + Math.random() * 3, y: bx.y + 10, vx: (Math.random() - 0.5) * 6, vy: -3, life: 0.5 }); }
          break;
        }
        case "obake": if (night && r < dt * 0.8) { add({ kind: "wisp", x: bx.x + 3 + Math.random() * 9, y: bx.y + 10, vx: (Math.random() - 0.5) * 2, vy: -2, life: 1.8 }); } break;
        default: break;
      }
    }
    // chuyển động riêng của các loại hạt mới (sau khi đã cộng vận tốc)
    function stepPart(q, dt) {
      if (q.kind === "bfly") {
        q.vx += (Math.random() - 0.5) * 30 * dt; q.vy += (Math.random() - 0.5) * 24 * dt;
        q.vx = Math.max(-6, Math.min(6, q.vx)); q.vy = Math.max(-4, Math.min(3, q.vy));
      } else if (q.kind === "gleaf" || q.kind === "ypetal" || q.kind === "flake") { q.x += Math.sin(q.t * 3 + q.y * 0.3) * 0.12; }
      else if (q.kind === "incense") { q.x += Math.sin(q.t * 4) * 0.15; }
      else if (q.kind === "gbub") { q.x += Math.sin(q.t * 6) * 0.06; }
      else if (q.kind === "bat") { q.y += Math.sin(q.t * 7) * 0.25; }
      else if (q.kind === "leaf" && q.grav) { q.vy += 12 * dt; }
    }
    // vẽ các loại hạt mới; trả true nếu đã vẽ
    function drawPart(ctx, S, ox, oy, q, k) {
      const fade = k > 0.8 ? (1 - k) / 0.2 : k < 0.1 ? k / 0.1 : 1;
      if (q.kind === "bfly") {
        ctx.globalAlpha = fade;
        const up = Math.floor(q.t * 9) % 2, x = ox + Math.round(q.x), y = oy + Math.round(q.y);
        box(ctx, x, y, 1, 1, P.k, S); box(ctx, x - 1, y - up, 1, 1, q.color, S); box(ctx, x + 1, y - up, 1, 1, q.color, S);
        return true;
      }
      if (q.kind === "incense") { ctx.globalAlpha = 0.5 * (1 - k); box(ctx, ox + q.x, oy + q.y, 1, 1, "#c8ccd8", S); return true; }
      if (q.kind === "gbub") { ctx.globalAlpha = 0.9 * (1 - k); box(ctx, ox + q.x, oy + q.y, 1, 1, k < 0.5 ? P.f : P.g, S); return true; }
      if (q.kind === "gleaf") {
        ctx.globalAlpha = fade;
        const f = Math.floor(q.t * 4) % 2;
        box(ctx, ox + q.x, oy + q.y, f ? 2 : 1, 1, P.y, S); box(ctx, ox + q.x + (f ? 0 : 1), oy + q.y + 1, 1, 1, P.i, S);
        return true;
      }
      if (q.kind === "ypetal") { ctx.globalAlpha = fade; box(ctx, ox + q.x, oy + q.y, 1, 1, Math.floor(q.t * 5) % 2 ? P.y : P.i, S); return true; }
      if (q.kind === "flake") {
        ctx.globalAlpha = 0.9 * fade;
        if (q.big) { box(ctx, ox + q.x - 1, oy + q.y, 3, 1, "#ffffff", S); box(ctx, ox + q.x, oy + q.y - 1, 1, 3, "#ffffff", S); }
        else { box(ctx, ox + q.x, oy + q.y, 1, 1, "#ffffff", S); }
        return true;
      }
      if (q.kind === "bat") {
        ctx.globalAlpha = fade;
        const x = ox + Math.round(q.x), y = oy + Math.round(q.y), up = Math.floor(q.t * 10) % 2;
        box(ctx, x, y, 2, 1, "#2b2140", S); box(ctx, x - 2, y - up, 2, 1, "#2b2140", S); box(ctx, x + 2, y - up, 2, 1, "#2b2140", S);
        return true;
      }
      if (q.kind === "lixi") {
        ctx.globalAlpha = fade;
        box(ctx, ox + q.x, oy + q.y, 2, 3, P.r, S); box(ctx, ox + q.x, oy + q.y + 1, 2, 1, P.i, S);
        return true;
      }
      if (q.kind === "spark2") {
        ctx.globalAlpha = 1 - k;
        box(ctx, ox + q.x, oy + q.y, 1, 1, q.color || P.y, S);
        return true;
      }
      return false;
    }

    return { motion: motion, pal: pal, emit: emit, stepPart: stepPart, drawPart: drawPart, frameOf: frameOf };
  }

  return { install: install };
})();
