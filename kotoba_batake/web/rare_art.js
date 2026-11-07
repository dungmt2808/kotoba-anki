/* ことば畑 – 1.16: 12 món hiếm mới của rương nhiệm vụ (hình + chuyển động).
   home.js gọi GardenRareArt.install(L) sau khi dựng sprite của mình (như season_art.js); file này thêm sprite vào
   SPR, đồ phát sáng (GLOW), phần vẽ động (EXTRA) và trả về các hàm móc: frameOf, emit, pal. */
var GardenRareArt = (function () {
  "use strict";

  function install(L) {
    const { grid, rect, disc, dot, outline, rows, gline, ellipseFill, SPR, BASE, GLOW, EXTRA, P, box } = L;
    const ol = (g) => rows(outline(g));
    if (!P.Q) { P.Q = "#3a3a66"; }      // ô cửa tháp chùa (ban đêm đổi sang vàng)
    const IDS = ["shika", "kabuto", "taikobashi", "kitsunemen", "pagoda", "koto", "yatai", "shamisen", "kappa", "byobu", "hokora", "karesansui"];

    // ---------------------------------------------------------------- Hươu Nara (cúi chào)
    function deer(bow) {
      const g = grid(17, 23);
      ellipseFill(g, 7, 14, 5.2, 3, "t");                  // thân
      rect(g, 3, 16, 9, 1, "c");                          // bụng sáng
      [[4, 11], [6, 12], [8, 11], [5, 14], [9, 13]].forEach(([x, y]) => dot(g, x, y, "c"));   // đốm trắng
      dot(g, 2, 12, "w"); dot(g, 1, 12, "w");             // đuôi trắng
      [3, 5, 9, 11].forEach((x) => { rect(g, x, 17, 1, 4, "b"); dot(g, x, 21, "B"); });
      if (!bow) {
        rect(g, 10, 8, 2, 5, "t");                        // cổ
        ellipseFill(g, 12.5, 6.5, 2.3, 1.8, "t");          // đầu
        dot(g, 15, 7, "B"); dot(g, 14, 7, "t");           // mõm
        dot(g, 12, 6, "k"); dot(g, 10, 5, "h");           // mắt, tai
        gline(g, 11, 4, 10, 1, "B"); gline(g, 13, 4, 14, 1, "B"); dot(g, 9, 2, "B"); dot(g, 15, 2, "B");
      } else {
        rect(g, 10, 11, 3, 3, "t");                       // cúi đầu xuống
        ellipseFill(g, 13.5, 13.5, 2.3, 1.8, "t");
        dot(g, 16, 15, "B"); dot(g, 13, 13, "k"); dot(g, 11, 11, "h");
        gline(g, 12, 11, 12, 8, "B"); gline(g, 14, 11, 15, 8, "B"); dot(g, 11, 9, "B"); dot(g, 16, 9, "B");
      }
      return ol(g);
    }
    SPR.shika = deer(false);
    const SHIKA_BOW = deer(true);

    // ---------------------------------------------------------------- Mũ giáp kabuto (trong nhà)
    function kabuto(shine) {
      const g = grid(16, 19);
      rect(g, 2, 14, 12, 4, "n"); rect(g, 2, 14, 12, 1, "i"); rect(g, 3, 17, 10, 1, "U");   // bệ sơn mài
      ellipseFill(g, 7.5, 9.5, 4.6, 3.6, "U");                                            // mũ
      rect(g, 3, 10, 10, 1, "u");
      for (let x = 2; x < 14; x += 2) { rect(g, x, 11, 1, 3, "u"); }                     // vạt che gáy
      rect(g, 1, 11, 14, 1, "U"); rect(g, 1, 13, 14, 1, "U");
      dot(g, 7, 8, "y"); dot(g, 8, 8, "y"); dot(g, 7, 7, "i"); dot(g, 8, 7, "i");          // vật trang trí giữa
      gline(g, 7, 6, 3, 1, "i"); gline(g, 8, 6, 12, 1, "i"); gline(g, 6, 6, 2, 2, "i"); gline(g, 9, 6, 13, 2, "i");   // sừng kuwagata
      if (shine) { dot(g, 3, 1, "w"); dot(g, 12, 2, "w"); }
      return ol(g);
    }
    SPR.kabuto = kabuto(false);
    const KABUTO_SHINE = kabuto(true);

    // ---------------------------------------------------------------- Cầu cong đỏ (2 ô)
    SPR.taikobashi = (function () {
      const g = grid(32, 19);
      rect(g, 0, 14, 32, 4, "d"); rect(g, 0, 14, 32, 1, "l");                             // suối
      [[3, 16], [10, 15], [19, 16], [26, 15]].forEach(([x, y]) => rect(g, x, y, 3, 1, "l"));
      rect(g, 0, 13, 3, 5, "S"); rect(g, 29, 13, 3, 5, "S"); dot(g, 1, 13, "s"); dot(g, 30, 13, "s");
      const top = (x) => 5 + Math.round(Math.pow((x - 15.5) / 14.5, 2) * 7);
      for (let x = 1; x <= 30; x++) {
        const y = top(x);
        rect(g, x, y, 1, 2, "r"); dot(g, x, y + 2, "R");                                   // mặt cầu
        dot(g, x, y - 3, "r");                                                            // tay vịn
      }
      for (let x = 2; x <= 29; x += 5) { const y = top(x); rect(g, x, y - 3, 1, 3, "R"); dot(g, x, y - 4, "i"); }   // cột + núm vàng
      [3, 28].forEach((x) => rect(g, x, top(x) + 3, 2, 14 - top(x) - 2, "R"));            // chân cầu
      return ol(g);
    })();

    // ---------------------------------------------------------------- Mặt nạ cáo (treo tường)
    SPR.kitsunemen = (function () {
      const g = grid(15, 17);
      gline(g, 2, 7, 3, 1, "w"); gline(g, 3, 1, 6, 5, "w"); rect(g, 3, 3, 2, 4, "w"); dot(g, 3, 3, "r"); dot(g, 4, 4, "r");   // tai trái
      gline(g, 12, 7, 11, 1, "w"); gline(g, 11, 1, 8, 5, "w"); rect(g, 10, 3, 2, 4, "w"); dot(g, 11, 3, "r"); dot(g, 10, 4, "r");
      ellipseFill(g, 7, 8.5, 5, 4, "w");                                                  // mặt
      rect(g, 5, 12, 5, 2, "w"); rect(g, 6, 14, 3, 1, "w"); dot(g, 7, 15, "k");            // mõm + mũi
      gline(g, 3, 8, 5, 9, "k"); gline(g, 11, 8, 9, 9, "k");                              // mắt híp
      dot(g, 3, 7, "r"); dot(g, 4, 7, "r"); dot(g, 10, 7, "r"); dot(g, 11, 7, "r");        // vệt đỏ trên mắt
      dot(g, 7, 5, "r"); dot(g, 7, 6, "i"); dot(g, 6, 11, "r"); dot(g, 8, 11, "r");
      return ol(g);
    })();

    // ---------------------------------------------------------------- Tháp chùa năm tầng
    SPR.pagoda = (function () {
      const g = grid(19, 34);
      rect(g, 3, 31, 13, 2, "S"); rect(g, 4, 30, 11, 1, "s");                             // nền đá
      const tiers = [[8, 3], [7, 3], [6, 2], [5, 2], [4, 1]];      // [nửa rộng mái, nửa rộng thân]
      let yb = 29;
      tiers.forEach(([rr, br]) => {
        rect(g, 9 - br, yb - 2, br * 2 + 1, 3, "r");                                     // thân đỏ
        rect(g, 9 - br, yb, br * 2 + 1, 1, "R");
        dot(g, 9, yb - 1, "Q"); if (br >= 2) { dot(g, 9 - br + 1, yb - 1, "w"); dot(g, 9 + br - 1, yb - 1, "w"); }   // ô cửa giữa sáng ban đêm
        rect(g, 9 - rr, yb - 3, rr * 2 + 1, 1, "S");                                     // mặt dưới mái
        rect(g, 9 - rr + 1, yb - 4, rr * 2 - 1, 1, "n"); rect(g, 9 - rr + 3, yb - 5, rr * 2 - 5, 1, "n");   // mái ngói
        dot(g, 9 - rr, yb - 4, "n"); dot(g, 9 + rr, yb - 4, "n"); dot(g, 9 - rr - 1, yb - 5, "n"); dot(g, 9 + rr + 1, yb - 5, "n");   // đầu mái vểnh
        dot(g, 9 - rr, yb - 2, "i"); dot(g, 9 + rr, yb - 2, "i");                          // chuông góc mái
        yb -= 5;
      });
      rect(g, 9, 1, 1, yb + 1, "i"); [2, 4, 6].forEach((y) => rect(g, 8, y, 3, 1, "i")); dot(g, 9, 0, "y");   // chóp sōrin
      return ol(g);
    })();

    // ---------------------------------------------------------------- Đàn koto (2 ô, trong nhà)
    SPR.koto = (function () {
      const g = grid(32, 12);
      for (let x = 1; x <= 30; x++) {                                                     // thân gỗ hơi vồng
        const y = 4 + Math.round(Math.pow((x - 15.5) / 14.5, 2) * 1.6);
        rect(g, x, y, 1, 3, "B"); dot(g, x, y, "b");
      }
      rect(g, 0, 4, 2, 4, "i"); rect(g, 30, 5, 2, 4, "i");                                // hai đầu bọc vàng
      for (let x = 2; x < 30; x++) { const y = 4 + Math.round(Math.pow((x - 15.5) / 14.5, 2) * 1.6); dot(g, x, y, "c"); }   // dây đàn
      for (let k = 0; k < 7; k++) {                                                       // ngựa đàn ji xếp chéo
        const x = 6 + k * 3, y = 5 + Math.round(Math.pow((x - 15.5) / 14.5, 2) * 1.6) - (k % 2);
        dot(g, x, y - 1, "w"); dot(g, x, y, "w");
      }
      rect(g, 4, 8, 2, 3, "B"); rect(g, 26, 9, 2, 2, "B");                                // chân kê
      return ol(g);
    })();

    // ---------------------------------------------------------------- Quầy mì yatai (2 ô)
    SPR.yatai = (function () {
      const g = grid(32, 29);
      rect(g, 1, 3, 30, 3, "B"); rect(g, 2, 2, 28, 1, "b"); rect(g, 0, 5, 32, 1, "B");     // mái
      for (let x = 2; x < 30; x += 4) { rect(g, x, 6, 3, 5, x % 8 === 2 ? "R" : "r"); dot(g, x + 1, 8, "w"); }   // rèm noren
      rect(g, 2, 6, 1, 15, "b"); rect(g, 29, 6, 1, 15, "b");                               // cột
      rect(g, 16, 13, 7, 4, "S"); rect(g, 16, 13, 7, 1, "s"); rect(g, 24, 15, 4, 2, "w"); rect(g, 25, 15, 2, 1, "y");   // nồi + bát mì
      rect(g, 6, 14, 6, 3, "c"); rect(g, 6, 14, 6, 1, "w");                                // chồng bát
      rect(g, 1, 17, 30, 2, "t"); rect(g, 1, 19, 30, 5, "b"); rect(g, 4, 20, 9, 3, "B"); rect(g, 19, 20, 9, 3, "B");   // quầy
      disc(g, 8, 25, 3, "B"); disc(g, 8, 25, 1, "S"); disc(g, 24, 25, 3, "B"); disc(g, 24, 25, 1, "S");   // bánh xe
      disc(g, 5, 10, 2, "r"); dot(g, 5, 7, "k"); rect(g, 4, 10, 3, 1, "y");               // đèn lồng đỏ
      return ol(g);
    })();

    // ---------------------------------------------------------------- Đàn shamisen (treo tường)
    SPR.shamisen = (function () {
      const g = grid(11, 25);
      rect(g, 4, 0, 3, 3, "B"); dot(g, 3, 1, "c"); dot(g, 7, 1, "c"); dot(g, 3, 2, "c"); dot(g, 7, 2, "c");   // đầu + trục lên dây
      rect(g, 5, 3, 1, 13, "B"); rect(g, 4, 3, 1, 13, "b");                                 // cần đàn
      rect(g, 1, 15, 9, 8, "b"); rect(g, 2, 16, 7, 6, "c"); dot(g, 5, 23, "B");             // thùng đàn da trắng
      gline(g, 4, 3, 4, 20, "s"); gline(g, 6, 3, 6, 20, "s");                               // dây
      rect(g, 3, 19, 5, 1, "i");                                                           // ngựa đàn
      return ol(g);
    })();

    // ---------------------------------------------------------------- Kappa (nháy mắt)
    function kappa(blink) {
      const g = grid(16, 21);
      ellipseFill(g, 7, 15, 4.4, 4, "g"); ellipseFill(g, 7.5, 16, 2.6, 2.6, "f");          // thân + bụng
      ellipseFill(g, 3, 14, 2, 3.6, "G"); dot(g, 2, 13, "j"); dot(g, 3, 15, "j");           // mai rùa
      disc(g, 8, 7, 4, "g");
      ellipseFill(g, 8, 3.4, 3.4, 1.2, "j"); ellipseFill(g, 8, 3, 2.4, 0.9, "l"); dot(g, 7, 3, "w");   // tóc + đĩa nước
      rect(g, 11, 8, 3, 2, "y"); dot(g, 13, 9, "o");                                       // mỏ
      if (blink) { dot(g, 8, 6, "k"); dot(g, 9, 6, "k"); dot(g, 10, 6, "k"); }
      else { dot(g, 8, 6, "k"); dot(g, 10, 6, "k"); dot(g, 8, 5, "w"); }
      dot(g, 6, 8, "p");                                                                   // má hồng
      rect(g, 10, 13, 5, 2, "G"); dot(g, 11, 13, "f"); dot(g, 13, 14, "f");                 // cầm quả dưa leo
      rect(g, 4, 19, 3, 1, "g"); rect(g, 9, 19, 3, 1, "g");
      return ol(g);
    }
    SPR.kappa = kappa(false);
    const KAPPA_BLINK = kappa(true);

    // ---------------------------------------------------------------- Bình phong hạc (2 ô, trong nhà)
    SPR.byobu = (function () {
      const g = grid(32, 22);
      // 4 tấm gấp kiểu chữ chi: tấm 1, 3 ngả ra (vàng sáng), tấm 2, 4 ngả vào (vàng sẫm, thấp hơn 1 điểm)
      for (let p = 0; p < 4; p++) {
        const x0 = 1 + p * 7 + (p ? 1 : 0), back = p % 2 === 1, top = back ? 2 : 1, h = back ? 17 : 19;
        rect(g, x0, top, 7, h, "B"); rect(g, x0 + 1, top + 1, 5, h - 2, back ? "i" : "y");
      }
      rect(g, 2, 13, 28, 2, "d"); [3, 9, 17, 24].forEach((x) => rect(g, x, 13, 2, 1, "l"));   // dòng nước xanh vắt ngang
      rect(g, 25, 3, 3, 3, "r"); dot(g, 24, 4, "r"); dot(g, 28, 4, "r");                    // mặt trời đỏ
      // hạc: thân trắng, cổ dài, mào đỏ, đuôi đen
      [[8, 7, 1], [17, 9, -1]].forEach(([cx, cy, d]) => {
        rect(g, cx - 2, cy, 4, 2, "w"); dot(g, cx - 2 * d - (d < 0 ? 1 : 0), cy + 1, "k");
        gline(g, cx + 2 * d - (d < 0 ? 1 : 0), cy, cx + 3 * d, cy - 3, "w"); dot(g, cx + 3 * d, cy - 4, "r");
        gline(g, cx - 1, cy - 1, cx - 3, cy - 3, "w"); gline(g, cx + 1, cy - 1, cx + 2, cy - 3, "w");   // cánh dang
      });
      rect(g, 2, 20, 4, 1, "B"); rect(g, 26, 20, 4, 1, "B");
      return ol(g);
    })();

    // ---------------------------------------------------------------- Miếu nhỏ hokora (nến sáng ban đêm)
    SPR.hokora = (function () {
      const g = grid(16, 23);
      rect(g, 3, 18, 10, 4, "S"); rect(g, 3, 18, 10, 1, "s"); rect(g, 2, 21, 12, 1, "m");   // bệ đá
      rect(g, 4, 10, 8, 8, "b"); rect(g, 5, 12, 6, 6, "B");                               // thân gỗ + cửa
      [6, 8, 10].forEach((x) => rect(g, x, 12, 1, 6, "b")); rect(g, 5, 14, 6, 1, "b");     // song cửa
      rect(g, 2, 8, 12, 2, "n"); rect(g, 3, 7, 10, 1, "n"); rect(g, 5, 6, 6, 1, "n"); rect(g, 7, 5, 2, 1, "n");   // mái
      dot(g, 1, 8, "n"); dot(g, 14, 8, "n"); dot(g, 1, 7, "n"); dot(g, 14, 7, "n"); dot(g, 8, 4, "i");
      rect(g, 4, 10, 8, 1, "c"); dot(g, 8, 11, "w"); dot(g, 7, 12, "w"); dot(g, 8, 13, "w");   // dây shimenawa + giấy shide
      rect(g, 1, 16, 1, 2, "c"); dot(g, 1, 15, "o"); rect(g, 14, 16, 1, 2, "c"); dot(g, 14, 15, "o");   // nến hai bên
      return ol(g);
    })();

    // ---------------------------------------------------------------- Vườn đá cát cào (2 ô)
    SPR.karesansui = (function () {
      const g = grid(32, 12);
      rect(g, 0, 3, 32, 8, "b"); rect(g, 1, 4, 30, 6, "c");                               // khung gỗ + cát
      for (let x = 1; x < 31; x++) { if ((x + 1) % 3) { dot(g, x, 5, "s"); dot(g, x, 8, "s"); } }   // vết cào
      ellipseFill(g, 9, 6.5, 4.2, 2.6, "s"); ellipseFill(g, 23, 6.5, 3.4, 2.2, "s");      // vòng cát quanh đá
      ellipseFill(g, 9, 6.5, 3, 1.6, "c"); ellipseFill(g, 23, 6.5, 2.2, 1.2, "c");
      ellipseFill(g, 9, 5.5, 2, 1.8, "S"); dot(g, 8, 4, "m"); dot(g, 10, 5, "G");          // đá to + rêu
      ellipseFill(g, 23, 6, 1.4, 1.3, "S"); dot(g, 23, 5, "G");
      dot(g, 16, 5, "r"); dot(g, 17, 4, "r");                                              // lá phong rơi trên cát
      return ol(g);
    })();

    // ---- đồ phát sáng ban đêm ----
    Object.assign(GLOW, { yatai: [9, 16], hokora: [14, 12], pagoda: [17, 16] });

    // ---- phần vẽ động ----
    Object.assign(EXTRA, {
      taikobashi: function (ctx, S, X, Y, e, now) {           // nước lấp lánh trôi dưới cầu
        for (let i = 0; i < 4; i++) {
          const x = ((now / 90 + i * 8 + e.x * 5) % 30 + 30) % 30;
          box(ctx, X + 1 + x, Y + 15 + (i % 2), 2, 1, P.w, S);
        }
      },
      pagoda: function (ctx, S, X, Y, e, now, tod) {          // chuông góc mái đung đưa
        const k = Math.round(Math.sin(now / 420 + e.x));
        [[1, 28], [17, 28], [3, 18], [15, 18]].forEach(([x, y]) => box(ctx, X + x + k, Y + y, 1, 1, tod === "day" ? P.i : P.y, S));
      },
      yatai: function (ctx, S, X, Y, e, now) {                // đèn lồng lắc nhẹ
        const k = Math.round(Math.sin(now / 700 + e.x));
        box(ctx, X + 4 + k, Y + 12, 3, 1, P.r, S);
      },
      karesansui: function (ctx, S, X, Y, e, now) {           // nắng loé trên đá
        if (Math.floor(now / 250 + e.x * 7) % 16 === 0) { box(ctx, X + 8, Y + 4, 1, 1, P.w, S); }
      }
    });

    // ---- hình theo thời điểm (khung hoạt hình) ----
    function frameOf(e, now) {
      if (e.id === "shika") { const t = (now + e.x * 1700) % 9000; return t > 7600 ? SHIKA_BOW : null; }
      if (e.id === "kappa") { const t = (now + e.x * 900) % 3800; return t < 160 ? KAPPA_BLINK : null; }
      if (e.id === "kabuto") { return Math.floor(now / 230 + e.x * 3) % 14 === 0 ? KABUTO_SHINE : null; }
      return null;
    }
    // hạt bay ra: khói nồi mì, nốt nhạc đàn, lá phong, hơi nến
    function emit(e, bx, dt, night, add) {
      const r = Math.random();
      if (e.id === "yatai" && r < dt * 2.2) {
        add({ kind: "steam", x: bx.x + 18 + Math.random() * 4, y: bx.y + 12, vx: 0.5 + Math.random(), vy: -4 - Math.random() * 2, life: 1.8 });
      } else if ((e.id === "koto" || e.id === "shamisen") && r < dt * 0.7) {
        add({ kind: "note", x: bx.x + bx.w / 2, y: bx.y + 1, vx: 2 + Math.random() * 3, vy: -5, life: 1.7,
          color: ["#ff4f6d", "#3d8bff", "#c77dff", "#2e8b3a"][Math.floor(Math.random() * 4)] });
      } else if (e.id === "karesansui" && r < dt * 0.25) {
        add({ kind: "leaf", x: bx.x + 4 + Math.random() * 24, y: bx.y - 6, vx: (Math.random() - 0.5) * 3, vy: 3, life: 2.2 });
      } else if (e.id === "hokora" && night && r < dt * 0.8) {
        add({ kind: "wisp", x: bx.x + (Math.random() < 0.5 ? 1 : 14), y: bx.y + 14, vx: 0, vy: -2, life: 1.4 });
      } else if (e.id === "kitsunemen" && night && r < dt * 0.3) {
        add({ kind: "wisp", x: bx.x + 3 + Math.random() * 8, y: bx.y + 6, vx: (Math.random() - 0.5) * 2, vy: -2, life: 1.6 });
      }
    }
    // ban đêm: cửa sổ tháp chùa sáng
    const PAGODA_NIGHT = Object.assign({}, P, { Q: "#ffe27a" });
    function pal(e, night) { return e.id === "pagoda" && night ? PAGODA_NIGHT : null; }
    return { ids: IDS, frameOf: frameOf, emit: emit, pal: pal };
  }

  return { install: install };
})();
