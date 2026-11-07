/* ことば畑 – 1.24: nhà 3 gian — hình 12 món của Bếp / Phòng ngủ và nền hai gian bên.
   home.js gọi GardenNhaArt.install(L) sau khi dựng sprite của mình (như rare_art.js); file này thêm sprite vào SPR,
   đồ phát sáng (GLOW) và trả về: ids, frameOf, emit, pal, bg (vẽ tường + sàn của Bếp / Phòng ngủ). */
var GardenNhaArt = (function () {
  "use strict";

  function install(L) {
    const { grid, rect, disc, dot, outline, rows, SPR, GLOW, P, box } = L;
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
    const FRIDGE_OPEN = fridge(true);

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
    const BED_UP = bed(true);

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
      if (e.id === "reizouko") { const t = (now + e.x * 1300) % 11000; return t > 9800 ? FRIDGE_OPEN : null; }
      if (e.id === "beddo") { return Math.floor((now + e.x * 400) / 1600) % 2 ? BED_UP : null; }
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

    // ---------------------------------------------------------------- Nền hai gian bên
    // toạ độ như phòng chính: tường 0–40 (xà 0–5, hàng đồ treo tường 12–28), sàn 40–88
    function bg(ctx, S, ox, oy, kind, W, Hh, FLOOR) {
      box(ctx, ox, oy, W, 5, P.B, S); box(ctx, ox, oy + 5, W, 1, P.k, S);
      if (kind === "kitchen") {
        box(ctx, ox, oy + 6, W, FLOOR - 9, "#f4f8fb", S);                  // tường gạch men
        for (let y = 6 + 6; y < FLOOR - 3; y += 6) { box(ctx, ox, oy + y, W, 1, "#cfdbe6", S); }
        for (let y = 6, k = 0; y < FLOOR - 3; y += 6, k++) {
          for (let x = (k % 2) * 6; x < W; x += 12) { box(ctx, ox + x, oy + y, 1, 6, "#cfdbe6", S); }
        }
        box(ctx, ox, oy + 28, W, 2, "#8fb8d8", S);                           // viền gạch xanh
        box(ctx, ox, oy + FLOOR - 3, W, 3, P.b, S); box(ctx, ox, oy + FLOOR - 1, W, 1, P.k, S);
        for (let y = FLOOR, r = 0; y < Hh; y += 8, r++) {                    // sàn caro kem / be
          for (let x = 0, c = r % 2; x < W; x += 8, c++) { box(ctx, ox + x, oy + y, 8, Math.min(8, Hh - y), c % 2 ? "#efe3c8" : "#dccaa4", S); }
        }
      } else {
        box(ctx, ox, oy + 6, W, FLOOR - 9, "#efe9f7", S);                  // giấy dán tường tím nhạt, hoa nhỏ
        for (let y = 10, k = 0; y < FLOOR - 4; y += 8, k++) {
          for (let x = 4 + (k % 2) * 8; x < W; x += 16) { box(ctx, ox + x, oy + y, 1, 1, "#c9b7e3", S); box(ctx, ox + x - 1, oy + y + 1, 3, 1, "#d9cdee", S); }
        }
        box(ctx, ox, oy + FLOOR - 3, W, 3, P.b, S); box(ctx, ox, oy + FLOOR - 1, W, 1, P.k, S);
        box(ctx, ox, oy + FLOOR, W, Hh - FLOOR, "#cfc88a", S);              // chiếu tatami
        for (let y = FLOOR, r = 0; y < Hh; y += 16, r++) {
          for (let x = (r % 2) * 16 - 16; x < W; x += 32) {
            box(ctx, ox + Math.max(0, x), oy + y, Math.min(32, x + 32) - Math.max(0, x), 1, "#3f5f2a", S);
            if (x >= 0) { box(ctx, ox + x, oy + y, 1, 16, "#8f8a4a", S); }
          }
          for (let x = 3; x < W; x += 6) { box(ctx, ox + x, oy + y + 5 + (x % 4), 2, 1, "#bdb576", S); }
        }
      }
    }

    return { ids: IDS, frameOf: frameOf, emit: emit, pal: pal, bg: bg };
  }

  return { install: install };
})();
