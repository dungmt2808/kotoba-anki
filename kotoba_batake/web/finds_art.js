/* ことば畑 – 1.28: hình pixel của "nhặt đồ theo vùng + Hộp sưu tầm" và "gánh hàng rong".
   - install(L): home.js gọi sau khi dựng sprite của mình (như rare_art.js) → thêm 15 món trang trí mới vào SPR (7 quà đủ bộ,
     8 món chỉ có ở gánh hàng), đồ phát sáng (GLOW), phần vẽ động (EXTRA: quả lắc, hơi nước, bóng đèn kéo quân…), pal().
   - find(id): hình 42 món nhặt được (lưới ≤ 12×12, tự viền đen) cho thẻ "Nhặt được!" và Hộp sưu tầm.
   - peddler(frame): người bán gánh hàng rong (nón lá, đòn gánh, hai thúng) — khung "a" / "b" nhún nhẹ.
   Hình dựng bằng hình cơ bản (grid / rect / disc / ellipseFill / gline + tự viền) như rare_art.js. Không dùng emoji. */
var GardenFindArt = (function () {
  "use strict";

  // ---- công cụ dựng lưới (bản riêng để find() / peddler() chạy được cả khi home.js chưa nạp) ----
  function grid(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
  function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[0].length) { g[j][i] = c; } } } }
  function dot(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) { g[y][x] = c; } }
  function disc(g, cx, cy, r, c) {
    for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r + r * 0.6) { g[j][i] = c; } } }
  }
  function ellipseFill(g, cx, cy, rx, ry, c) {
    for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1.02) { g[j][i] = c; } } }
  }
  function gline(g, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) { dot(g, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); }
  }
  function outline(g) {
    const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (g[j][i] !== ".") { continue; }
        if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g[j + dy] && g[j + dy][i + dx] && g[j + dy][i + dx] !== ".")) { out[j][i] = "k"; }
      }
    }
    return out;
  }
  const rows = (g) => g.map((r) => r.join(""));
  const ol = (g) => rows(outline(g));

  // bảng màu (như P của home.js + vài màu riêng của 1.28)
  const PAL = {
    k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", o: "#ff9f1c", r: "#ff4f6d", R: "#c21f3a", p: "#ff7fa0", P: "#ffc4d6",
    g: "#3ccb5e", G: "#2e8b3a", b: "#a0603a", B: "#6b3b1f", t: "#e2a46a", s: "#d4d4e0", S: "#8a8fa8", d: "#3d8bff",
    l: "#8fd3ff", c: "#fff2b3", m: "#9aa0b5", n: "#2b2b44", v: "#c77dff", h: "#f5b971", i: "#e9b949", e: "#ffd7b5",
    E: "#d99a6c", z: "#7b2cbf", u: "#2f5fb0", U: "#1e3a8a", a: "#2ec4b6", A: "#1a7f78", f: "#b8e05a", j: "#1f5f2a",
    O: "#c96a10", W: "#d6e6f5", Y: "#fff6a8",
    // 1.28
    N: "#4b5263",      // gang / sắt
    T: "#d9b26a",      // tre khô, rơm
    L: "#3f74c9",      // men lam
    M: "#c97b4a"       // gốm nâu đỏ
  };

  // =========================================================================================================
  // 15 món trang trí mới
  // =========================================================================================================
  const ITEMS = {};

  // ---- Tủ kính sưu tầm (phòng, sàn) — quà bộ Sân vườn. Các ngăn có đồ nhỏ (vẽ động theo số món đã nhặt: EXTRA)
  ITEMS.tukinh = (function () {
    const g = grid(15, 26);
    rect(g, 1, 1, 13, 24, "B");                 // khung gỗ
    rect(g, 2, 2, 11, 21, "W");                 // kính
    rect(g, 2, 8, 11, 1, "b"); rect(g, 2, 14, 11, 1, "b"); rect(g, 2, 20, 11, 1, "b");   // ba kệ
    rect(g, 2, 2, 1, 21, "w");                  // ánh kính
    dot(g, 4, 3, "w"); dot(g, 5, 4, "w");
    rect(g, 7, 2, 1, 21, "b");                  // hai cánh tủ
    dot(g, 6, 12, "i"); dot(g, 8, 12, "i");     // núm
    rect(g, 1, 23, 13, 2, "B"); rect(g, 2, 25, 2, 1, "B"); rect(g, 11, 25, 2, 1, "B");
    return ol(g);
  })();

  // ---- Chuông gió vỏ sò (phòng, treo tường) — quà bộ Bãi biển
  function shellChime(sw) {
    const g = grid(14, 20);
    rect(g, 1, 1, 12, 2, "b"); rect(g, 1, 1, 12, 1, "t"); dot(g, 6, 0, "B"); dot(g, 7, 0, "B");      // thanh gỗ + móc
    [[3, 8], [7, 11], [11, 7]].forEach(([x, y], i) => {
      const dx = i === 1 ? 0 : (i === 0 ? -sw : sw);
      gline(g, x, 3, x + dx, y - 3, "s");
      // vỏ sò hình quạt: rộng 5, cao 4, gân hồng
      const cx = x + dx;
      rect(g, cx - 2, y - 2, 5, 3, i === 1 ? "P" : "e"); rect(g, cx - 1, y - 3, 3, 1, i === 1 ? "P" : "e"); rect(g, cx - 1, y + 1, 3, 1, i === 1 ? "p" : "E");
      dot(g, cx - 1, y - 1, i === 1 ? "p" : "E"); dot(g, cx + 1, y - 1, i === 1 ? "p" : "E"); dot(g, cx, y - 2, "w");
    });
    gline(g, 7, 13, 7, 15, "s"); rect(g, 6, 16, 3, 3, "l"); dot(g, 6, 16, "W");                       // tua thuỷ tinh
    return ol(g);
  }
  ITEMS.kaifurin = shellChime(0);

  // ---- Giá buộc quẻ (sân) — quà bộ Đền trên núi
  ITEMS.mikujikake = (function () {
    const g = grid(16, 22);
    rect(g, 1, 5, 14, 15, "t");                                      // tấm ván sau (giấy không bị viền đen từng tờ)
    rect(g, 1, 5, 2, 17, "B"); rect(g, 13, 5, 2, 17, "B");           // hai cột
    rect(g, 0, 3, 16, 2, "R"); rect(g, 0, 3, 16, 1, "r");            // xà trên đỏ
    rect(g, 3, 9, 10, 1, "B"); rect(g, 3, 15, 10, 1, "B");            // hai dây căng
    [[3, 7], [5, 8], [7, 7], [9, 8], [11, 7], [4, 13], [6, 14], [8, 13], [10, 14], [12, 13]].forEach(([x, y]) => {
      rect(g, x, y, 1, 3, "w"); dot(g, x, y + 3, "s");                // quẻ giấy trắng buộc trên dây
    });
    rect(g, 0, 20, 16, 2, "S");                                      // bệ đá
    return ol(g);
  })();
  // ---- Đèn lồng cá vàng (sân) — quà bộ Phố lễ hội (đèn kingyo-chōchin ở Yanai)
  function goldfishLamp(tilt) {
    const g = grid(16, 26);
    rect(g, 7, 0, 1, 7, "B"); rect(g, 3, 0, 9, 1, "B");               // cần treo
    rect(g, 7, 20, 1, 6, "B"); rect(g, 4, 24, 8, 2, "B");             // cột + chân
    const cy = 13, cx = 7 + tilt;
    ellipseFill(g, cx, cy, 5, 4.5, "r");                              // thân cá
    rect(g, cx - 4, cy - 1, 9, 1, "R"); rect(g, cx - 4, cy + 2, 9, 1, "R");   // nan tre
    ellipseFill(g, cx - 1, cy - 2, 2, 1.2, "w");                       // bụng trắng
    dot(g, cx + 3, cy - 1, "k"); dot(g, cx + 3, cy - 2, "w");        // mắt
    rect(g, cx - 7, cy - 2, 2, 5, "r"); dot(g, cx - 8, cy - 3, "r"); dot(g, cx - 8, cy + 3, "r");   // đuôi
    dot(g, cx, cy - 5, "R"); dot(g, cx + 1, cy - 5, "R");             // vây lưng
    gline(g, cx, cy - 6, 7, 7, "B");
    return ol(g);
  }
  ITEMS.kingyochochin = goldfishLamp(0);

  // ---- Đèn ống tre (sân) — quà bộ Rừng tre (竹灯り)
  ITEMS.takeakari = (function () {
    const g = grid(15, 22);
    const tube = (x, y, w, h) => {
      rect(g, x, y, w, h, "g"); rect(g, x, y, 1, h, "G"); rect(g, x + w - 1, y, 1, h, "G");
      rect(g, x, y + Math.floor(h / 2), w, 1, "G");                    // đốt tre
      ellipseFill(g, x + (w - 1) / 2, y, (w - 1) / 2, 0.8, "f");        // miệng ống vát
    };
    tube(1, 6, 6, 15);
    tube(8, 10, 6, 11);
    [[3, 9], [3, 12], [4, 16], [10, 13], [11, 17], [9, 17]].forEach(([x, y]) => dot(g, x, y, "Y"));   // lỗ khắc hoa văn
    rect(g, 0, 21, 15, 1, "B");
    return ol(g);
  })();

  // ---- Bồn ngâm chân ashiyu (sân, 2 ô) — quà bộ Suối nước nóng
  ITEMS.ashiyu = (function () {
    const g = grid(32, 16);
    rect(g, 0, 7, 32, 9, "S");                                       // bờ đá
    [[2, 8], [9, 9], [17, 8], [25, 9], [5, 13], [14, 14], [22, 13], [29, 14]].forEach(([x, y]) => rect(g, x, y, 3, 1, "m"));
    rect(g, 3, 9, 26, 4, "a"); rect(g, 3, 9, 26, 1, "l");            // nước ấm
    [[6, 11], [13, 10], [20, 11], [25, 10]].forEach(([x, y]) => rect(g, x, y, 2, 1, "W"));
    rect(g, 1, 4, 30, 3, "b"); rect(g, 1, 4, 30, 1, "t");            // ghế gỗ dọc bờ
    rect(g, 2, 7, 1, 1, "B"); rect(g, 29, 7, 1, 1, "B");
    return ol(g);
  })();

  // ---- Hòm thư bưu điện đỏ (sân) — quà bộ Ga làng quê (ポスト tròn kiểu Showa)
  ITEMS.posuto = (function () {
    const g = grid(12, 24);
    rect(g, 2, 3, 8, 17, "r"); ellipseFill(g, 5.5, 3, 4, 2.6, "r");   // thân tròn, đỉnh vòm
    rect(g, 2, 3, 1, 17, "R"); rect(g, 9, 3, 1, 17, "R");
    rect(g, 3, 7, 6, 1, "k");                                        // khe bỏ thư
    rect(g, 3, 10, 6, 4, "w"); rect(g, 4, 11, 4, 1, "R"); rect(g, 5, 12, 2, 1, "R");    // biển 〒
    rect(g, 3, 1, 1, 1, "P");                                        // ánh sáng đỉnh
    rect(g, 1, 20, 10, 2, "R"); rect(g, 2, 22, 8, 2, "S");             // chân + bệ
    return ol(g);
  })();

  // ---- Đèn kéo quân (sân) — gánh hàng rong. Bóng hình chạy vòng (EXTRA, ban đêm)
  ITEMS.denkeoquan = (function () {
    const g = grid(14, 27);
    rect(g, 6, 18, 2, 7, "B"); rect(g, 3, 25, 8, 2, "B");             // cán + chân
    rect(g, 1, 4, 12, 14, "c");                                       // thân đèn giấy
    rect(g, 1, 4, 12, 1, "r"); rect(g, 1, 17, 12, 1, "r");             // viền đỏ
    rect(g, 0, 3, 14, 1, "R"); rect(g, 0, 18, 14, 1, "R");
    rect(g, 1, 4, 1, 14, "o"); rect(g, 12, 4, 1, 14, "o");
    dot(g, 7, 1, "R"); rect(g, 5, 2, 4, 1, "R");                      // nóc
    [[0, 19], [13, 19]].forEach(([x, y]) => { rect(g, x, y, 1, 3, "y"); });   // tua vàng
    // hình người cưỡi ngựa in mờ (khi tắt đèn)
    rect(g, 4, 9, 3, 2, "t"); dot(g, 7, 8, "t"); rect(g, 5, 11, 1, 2, "t"); rect(g, 7, 11, 1, 2, "t"); dot(g, 5, 7, "t"); dot(g, 5, 8, "t");
    return ol(g);
  })();

  // ---- Lu nước (sân) — gánh hàng rong (lu sành, gáo dừa vắt ngang)
  ITEMS.luunuoc = (function () {
    const g = grid(16, 18);
    ellipseFill(g, 7.5, 10, 7, 7, "M");                               // thân lu
    rect(g, 2, 3, 12, 2, "B"); rect(g, 3, 2, 10, 1, "M");              // miệng lu
    ellipseFill(g, 4.5, 9, 1.5, 4, "E");                              // ánh men
    rect(g, 2, 13, 12, 1, "B");                                      // đường vòng
    gline(g, 1, 1, 13, 3, "b"); ellipseFill(g, 13, 1.5, 1.6, 1.2, "B");   // gáo dừa
    rect(g, 4, 17, 8, 1, "B");
    return ol(g);
  })();

  // ---- Chậu hoa giấy (sân) — gánh hàng rong
  ITEMS.hoagiay = (function () {
    const g = grid(16, 26);
    rect(g, 4, 19, 8, 6, "M"); rect(g, 3, 18, 10, 2, "b"); rect(g, 5, 24, 6, 1, "B");   // chậu
    gline(g, 8, 18, 6, 6, "B"); gline(g, 7, 12, 11, 4, "B");          // cành
    [[5, 4, 3.5], [10, 3, 3], [3, 9, 2.6], [12, 9, 2.8], [8, 8, 2.6], [4, 14, 2.2], [12, 14, 2]].forEach(([x, y, r]) => ellipseFill(g, x, y, r, r * 0.85, "p"));
    [[5, 3], [10, 2], [3, 9], [12, 8], [8, 8], [4, 14], [12, 14], [6, 6], [10, 6]].forEach(([x, y]) => dot(g, x, y, "P"));
    [[7, 5], [2, 11], [13, 11], [9, 11]].forEach(([x, y]) => dot(g, x, y, "G"));
    return ol(g);
  })();

  // ---- Lồng dế (sân) — gánh hàng rong (虫かご bằng tre)
  ITEMS.mushikago = (function () {
    const g = grid(14, 18);
    rect(g, 6, 0, 2, 3, "T"); rect(g, 4, 0, 6, 1, "T");                // quai
    rect(g, 1, 3, 12, 2, "B"); rect(g, 1, 15, 12, 2, "B");             // nắp + đáy
    for (let x = 1; x < 13; x += 2) { rect(g, x, 5, 1, 10, "T"); }    // nan tre
    rect(g, 2, 9, 10, 1, "T");
    rect(g, 6, 12, 3, 2, "G"); dot(g, 9, 12, "G"); dot(g, 5, 11, "G");   // chú dế
    dot(g, 4, 13, "g"); dot(g, 10, 13, "g");                          // lá cỏ
    return ol(g);
  })();

  // ---- Nón lá (phòng, treo tường) — gánh hàng rong
  ITEMS.nonla = (function () {
    const g = grid(16, 14);
    for (let j = 0; j < 9; j++) { const half = Math.round(1 + j * 0.85); rect(g, 7.5 - half + 0.5 | 0, 1 + j, half * 2, 1, j % 3 === 2 ? "t" : "T"); }
    dot(g, 7, 0, "B"); dot(g, 8, 0, "B");                              // móc treo
    gline(g, 2, 10, 7, 13, "p"); gline(g, 13, 10, 8, 13, "p");         // quai lụa hồng
    return ol(g);
  })();

  // ---- Bình gốm men lam (phòng, sàn) — gánh hàng rong (gốm hoa lam)
  ITEMS.binhgom = (function () {
    const g = grid(13, 22);
    ellipseFill(g, 6, 14, 5.5, 6.5, "w");                             // thân bình
    rect(g, 4, 2, 5, 6, "w"); rect(g, 3, 1, 7, 2, "w");                // cổ + miệng loe
    rect(g, 3, 1, 7, 1, "L"); rect(g, 4, 6, 5, 1, "L");
    ellipseFill(g, 6, 14, 2.6, 2.2, "L"); dot(g, 6, 14, "w"); dot(g, 5, 13, "l"); dot(g, 7, 13, "l");   // hoa sen
    gline(g, 1, 12, 3, 16, "L"); gline(g, 11, 12, 9, 16, "L");         // lá
    rect(g, 2, 19, 9, 1, "L"); rect(g, 3, 20, 7, 2, "s");              // chân bình
    return ol(g);
  })();

  // ---- Đồng hồ quả lắc (phòng, treo tường) — gánh hàng rong. Quả lắc vẽ động (EXTRA)
  ITEMS.dongholac = (function () {
    const g = grid(14, 26);
    rect(g, 1, 0, 12, 26, "B"); rect(g, 2, 1, 10, 24, "b");            // vỏ gỗ
    disc(g, 6.5, 6, 4, "c"); dot(g, 6, 2, "k"); dot(g, 7, 2, "k"); dot(g, 10, 6, "k"); dot(g, 3, 6, "k"); dot(g, 6, 10, "k");
    rect(g, 3, 12, 8, 11, "n"); rect(g, 3, 12, 8, 1, "B");             // ô kính quả lắc (tối)
    rect(g, 0, 0, 14, 1, "B"); rect(g, 0, 25, 14, 1, "B");
    return ol(g);
  })();

  // ---- Ấm sắt tetsubin (phòng, sàn) — gánh hàng rong. Hơi nước (EXTRA)
  ITEMS.tetsubin = (function () {
    const g = grid(16, 17);
    ellipseFill(g, 7.5, 11, 6, 4.8, "N");                              // thân ấm gang
    for (let x = 3; x < 13; x += 2) { dot(g, x, 9, "m"); dot(g, x + 1, 11, "m"); }   // hạt nổi (arare)
    rect(g, 5, 5, 6, 2, "N"); dot(g, 7, 4, "N"); dot(g, 8, 4, "N");    // nắp + núm
    gline(g, 13, 10, 15, 7, "N");                                     // vòi
    gline(g, 3, 6, 5, 1, "B"); gline(g, 12, 6, 10, 1, "B"); rect(g, 5, 1, 6, 1, "B");   // quai
    rect(g, 3, 16, 10, 1, "B");                                       // đế
    return ol(g);
  })();

  // =========================================================================================================
  // 42 món nhặt được (thẻ "Nhặt được!" + Hộp sưu tầm) — lưới 12×12, tự viền
  // =========================================================================================================
  const F = {};
  const mk = (fn) => { const g = grid(12, 12); fn(g); return ol(g); };
  // Sân vườn
  F.katatsumuri = mk((g) => {                           // ốc sên: vỏ xoắn nâu trên thân xanh nhạt, hai râu
    rect(g, 1, 9, 10, 2, "f"); dot(g, 0, 10, "f"); rect(g, 8, 6, 2, 4, "f");
    gline(g, 8, 5, 7, 3, "f"); gline(g, 9, 5, 10, 3, "f"); dot(g, 7, 2, "G"); dot(g, 10, 2, "G");
    disc(g, 4.5, 6, 3.4, "t");
    disc(g, 4.5, 6, 2.2, "h"); disc(g, 4.5, 6, 1, "E"); dot(g, 5, 6, "B"); dot(g, 3, 5, "B"); dot(g, 4, 8, "B");
    dot(g, 9, 7, "k");
  });
  F.yotsuba = mk((g) => { [[4, 3], [8, 3], [4, 7], [8, 7]].forEach(([x, y]) => disc(g, x, y, 2, "g")); dot(g, 6, 5, "G"); gline(g, 6, 6, 6, 11, "G"); dot(g, 4, 3, "f"); });
  F.koishi = mk((g) => { ellipseFill(g, 5.5, 7, 5, 3.4, "S"); ellipseFill(g, 4, 6, 2, 1, "s"); dot(g, 8, 8, "m"); });
  F.hane = mk((g) => {                                  // một chiếc lông: cuống cong, hai bên phiến lông
    const shaft = [[9, 1], [8, 2], [8, 3], [7, 4], [6, 5], [6, 6], [5, 7], [4, 8], [3, 9], [2, 10], [1, 11]];
    shaft.forEach(([x, y], i) => {
      if (i < 9) { rect(g, x - 2, y, 2, 1, i % 3 === 2 ? "s" : "w"); rect(g, x + 1, y - 1, 2, 1, i % 3 === 1 ? "s" : "w"); }
    });
    shaft.forEach(([x, y]) => dot(g, x, y, "S"));
    dot(g, 9, 0, "w"); dot(g, 10, 1, "w");
  });
  F.biidama = mk((g) => { disc(g, 5.5, 5.5, 4.5, "l"); gline(g, 3, 8, 8, 3, "d"); gline(g, 3, 7, 7, 3, "a"); dot(g, 4, 3, "w"); dot(g, 3, 4, "w"); });
  F.tane = mk((g) => { ellipseFill(g, 5.5, 7, 3, 4, "b"); rect(g, 5, 4, 1, 7, "B"); dot(g, 4, 5, "t"); gline(g, 6, 3, 9, 0, "g"); dot(g, 9, 1, "f"); });
  // Bãi biển
  F.kaigara = mk((g) => { ellipseFill(g, 5.5, 5.5, 5, 4.5, "P"); for (let x = 2; x <= 9; x += 2) { gline(g, 5.5, 10, x, 2, "p"); } rect(g, 4, 9, 4, 2, "p"); });
  F.hitode = mk((g) => { disc(g, 5.5, 6, 2, "o"); gline(g, 5, 5, 5, 0, "o"); gline(g, 6, 5, 6, 1, "o"); gline(g, 4, 6, 0, 4, "o"); gline(g, 7, 6, 11, 4, "o"); gline(g, 4, 7, 2, 11, "o"); gline(g, 7, 7, 9, 11, "o"); [[5, 3], [3, 5], [8, 5], [4, 8], [7, 8]].forEach(([x, y]) => dot(g, x, y, "y")); });
  F.makigai = mk((g) => { ellipseFill(g, 6, 7, 4, 3.5, "h"); gline(g, 3, 6, 8, 1, "h"); gline(g, 4, 6, 9, 2, "h"); gline(g, 4, 8, 9, 6, "E"); gline(g, 5, 4, 8, 2, "E"); ellipseFill(g, 7, 9, 1.6, 1.2, "e"); });
  F.seaglass = mk((g) => { rect(g, 2, 4, 8, 5, "a"); rect(g, 3, 3, 5, 1, "a"); rect(g, 4, 9, 5, 1, "a"); dot(g, 3, 5, "W"); dot(g, 4, 4, "W"); rect(g, 6, 6, 2, 2, "A"); });
  F.ryuboku = mk((g) => { gline(g, 0, 8, 11, 4, "t"); gline(g, 0, 9, 11, 5, "t"); gline(g, 1, 10, 10, 6, "E"); gline(g, 7, 6, 9, 2, "t"); dot(g, 4, 8, "b"); });
  F.sakuragai = mk((g) => { ellipseFill(g, 5.5, 6, 4.5, 3.8, "P"); ellipseFill(g, 5.5, 6, 3, 2.5, "p"); dot(g, 4, 5, "w"); rect(g, 4, 9, 4, 1, "P"); });
  // Đền trên núi
  F.omamori = mk((g) => { rect(g, 3, 3, 6, 8, "R"); rect(g, 3, 3, 6, 1, "r"); rect(g, 4, 5, 4, 3, "i"); dot(g, 5, 6, "R"); dot(g, 6, 6, "R"); gline(g, 6, 2, 5, 0, "i"); dot(g, 6, 1, "i"); rect(g, 3, 10, 6, 1, "r"); });
  F.suzu = mk((g) => { disc(g, 5.5, 6.5, 4, "y"); rect(g, 2, 7, 8, 1, "i"); rect(g, 5, 8, 2, 2, "k"); rect(g, 5, 1, 2, 2, "r"); dot(g, 4, 4, "Y"); });
  F.emafuda = mk((g) => { rect(g, 1, 3, 10, 7, "t"); dot(g, 1, 3, "."); dot(g, 10, 3, "."); rect(g, 2, 2, 8, 1, "t"); rect(g, 3, 4, 6, 4, "w"); dot(g, 5, 5, "r"); dot(g, 6, 6, "R"); rect(g, 5, 0, 2, 2, "r"); });
  F.omikuji = mk((g) => { rect(g, 3, 1, 6, 10, "w"); rect(g, 3, 1, 6, 1, "R"); rect(g, 4, 3, 1, 5, "k"); rect(g, 7, 3, 1, 3, "s"); rect(g, 7, 7, 1, 2, "s"); rect(g, 3, 10, 6, 1, "s"); });
  F.matsubokkuri = mk((g) => { ellipseFill(g, 5.5, 6.5, 3.6, 4.5, "b"); for (let j = 3; j < 11; j += 2) { rect(g, 3, j, 6, 1, "B"); } dot(g, 4, 4, "t"); dot(g, 7, 6, "t"); dot(g, 5, 8, "t"); rect(g, 5, 0, 2, 2, "B"); });
  F.kouyou = mk((g) => {                                // lá phong 5 thuỳ
    disc(g, 5.5, 5.5, 2.4, "r");
    [[5.5, 1.5], [2, 3.5], [9, 3.5], [3, 7.5], [8, 7.5]].forEach(([x, y]) => disc(g, x, y, 1.4, "r"));
    gline(g, 5, 1, 6, 1, "r"); dot(g, 1, 3, "r"); dot(g, 10, 3, "r");
    gline(g, 5, 4, 5, 8, "R"); gline(g, 5, 6, 3, 4, "R"); gline(g, 6, 6, 8, 4, "R");
    gline(g, 5, 8, 4, 11, "B");
    dot(g, 4, 2, "o"); dot(g, 8, 4, "o");
  });
  // Phố lễ hội
  F.yoyofusen = mk((g) => { disc(g, 6, 6.5, 4.5, "p"); gline(g, 3, 5, 9, 5, "y"); gline(g, 2, 8, 9, 9, "d"); dot(g, 4, 4, "w"); gline(g, 6, 2, 6, 0, "w"); dot(g, 7, 0, "w"); });
  F.uchiwa = mk((g) => { disc(g, 5.5, 4.5, 4.2, "l"); disc(g, 6, 4, 1.8, "r"); dot(g, 3, 3, "w"); rect(g, 5, 8, 2, 4, "T"); });
  F.omenko = mk((g) => { disc(g, 5.5, 5.5, 4.8, "w"); rect(g, 2, 4, 2, 1, "k"); rect(g, 8, 4, 2, 1, "k"); dot(g, 3, 7, "p"); dot(g, 8, 7, "p"); rect(g, 5, 8, 2, 1, "r"); rect(g, 1, 1, 2, 2, "R"); rect(g, 9, 1, 2, 2, "R"); });
  F.kazaguruma2 = mk((g) => { gline(g, 6, 5, 6, 11, "T"); rect(g, 2, 1, 4, 4, "r"); rect(g, 6, 1, 4, 4, "y"); rect(g, 2, 5, 4, 4, "l"); rect(g, 6, 5, 4, 4, "g"); dot(g, 6, 5, "w"); });
  F.wataame = mk((g) => { disc(g, 5.5, 4.5, 4.2, "P"); disc(g, 4, 3.5, 1.6, "w"); dot(g, 7, 5, "p"); rect(g, 5, 8, 2, 4, "T"); });
  F.kingyobukuro = mk((g) => { ellipseFill(g, 5.5, 7, 4.5, 4, "W"); rect(g, 4, 1, 4, 2, "W"); rect(g, 3, 3, 6, 1, "r"); ellipseFill(g, 5, 7.5, 2, 1.3, "o"); dot(g, 7, 7, "o"); dot(g, 8, 6, "o"); dot(g, 8, 8, "o"); dot(g, 4, 7, "k"); dot(g, 3, 5, "w"); });
  // Rừng tre
  F.takenoko2 = mk((g) => { for (let j = 0; j < 10; j++) { const hw = Math.round(1 + j * 0.45); rect(g, 6 - hw, 1 + j, hw * 2, 1, j % 3 === 1 ? "B" : "b"); } rect(g, 3, 11, 6, 1, "t"); dot(g, 6, 0, "f"); });
  F.tentoumushi = mk((g) => { ellipseFill(g, 5.5, 6.5, 4.5, 4, "r"); rect(g, 5, 3, 1, 8, "k"); rect(g, 4, 1, 3, 2, "k"); [[3, 5], [8, 5], [3, 8], [8, 8]].forEach(([x, y]) => dot(g, x, y, "k")); dot(g, 3, 4, "w"); });
  F.taketonbo = mk((g) => { rect(g, 0, 3, 12, 2, "T"); rect(g, 0, 3, 12, 1, "c"); rect(g, 5, 5, 2, 7, "T"); dot(g, 5, 3, "b"); dot(g, 6, 3, "b"); });
  F.sasabune = mk((g) => { gline(g, 0, 6, 11, 6, "g"); rect(g, 2, 7, 8, 2, "g"); dot(g, 1, 7, "g"); dot(g, 10, 7, "g"); gline(g, 4, 6, 6, 2, "G"); gline(g, 7, 6, 6, 2, "G"); rect(g, 1, 10, 10, 1, "l"); });
  F.kokedama = mk((g) => { disc(g, 5.5, 7, 4.2, "G"); disc(g, 4.5, 6, 2, "g"); dot(g, 7, 8, "j"); gline(g, 6, 3, 6, 1, "j"); disc(g, 4, 1, 1.3, "g"); disc(g, 8, 1, 1.3, "g"); });
  F.nukegara = mk((g) => { ellipseFill(g, 5.5, 6, 3, 4.5, "h"); rect(g, 4, 3, 4, 1, "E"); rect(g, 4, 6, 4, 1, "E"); rect(g, 4, 9, 4, 1, "E"); dot(g, 3, 2, "B"); dot(g, 8, 2, "B"); gline(g, 2, 5, 0, 7, "E"); gline(g, 9, 5, 11, 7, "E"); gline(g, 3, 9, 1, 11, "E"); gline(g, 8, 9, 10, 11, "E"); });
  // Suối nước nóng
  F.onsentamago = mk((g) => { ellipseFill(g, 5.5, 7.5, 5, 3.4, "c"); ellipseFill(g, 5.5, 7, 2.2, 1.6, "o"); rect(g, 1, 10, 10, 1, "S"); gline(g, 3, 3, 4, 0, "W"); gline(g, 7, 3, 8, 0, "W"); });
  F.yunohana = mk((g) => { [[3, 4], [7, 3], [5, 6], [8, 7], [3, 8], [6, 9]].forEach(([x, y]) => disc(g, x, y, 1.6, "c")); [[3, 4], [7, 3], [8, 7]].forEach(([x, y]) => dot(g, x, y, "w")); dot(g, 5, 6, "Y"); });
  F.tenugui = mk((g) => { rect(g, 1, 2, 10, 8, "w"); for (let x = 2; x < 11; x += 3) { rect(g, x, 3, 1, 6, "L"); } rect(g, 1, 2, 10, 1, "u"); rect(g, 1, 9, 10, 1, "u"); gline(g, 1, 10, 3, 11, "s"); });
  F.gyunyubin = mk((g) => { rect(g, 3, 3, 6, 8, "w"); rect(g, 4, 1, 4, 2, "w"); rect(g, 4, 0, 4, 1, "u"); rect(g, 3, 6, 6, 2, "u"); dot(g, 4, 4, "W"); dot(g, 4, 9, "W"); rect(g, 3, 10, 6, 1, "s"); });
  F.yuoke = mk((g) => { rect(g, 1, 4, 10, 6, "t"); rect(g, 2, 10, 8, 1, "t"); rect(g, 1, 5, 10, 1, "N"); rect(g, 1, 8, 10, 1, "N"); rect(g, 1, 3, 10, 1, "h"); dot(g, 1, 4, "E"); });
  F.yuzu = mk((g) => { disc(g, 5.5, 6.5, 4.4, "y"); dot(g, 4, 4, "Y"); dot(g, 7, 8, "i"); dot(g, 3, 8, "i"); rect(g, 5, 1, 1, 2, "B"); ellipseFill(g, 7.5, 1.5, 2, 1, "g"); });
  // Ga làng quê
  F.kippu = mk((g) => { rect(g, 0, 3, 12, 6, "h"); rect(g, 1, 4, 3, 1, "B"); rect(g, 1, 6, 5, 1, "B"); rect(g, 8, 4, 3, 4, "R"); dot(g, 11, 3, "."); dot(g, 11, 8, "."); dot(g, 6, 8, "w"); });
  F.kitte = mk((g) => { rect(g, 1, 1, 10, 10, "w"); rect(g, 2, 2, 8, 8, "l"); rect(g, 2, 7, 8, 3, "g"); disc(g, 5, 7, 2, "w"); dot(g, 5, 6, "W"); rect(g, 7, 3, 2, 2, "r"); for (let i = 1; i < 11; i += 2) { dot(g, i, 0, "w"); dot(g, i, 11, "w"); } });
  F.ehagaki = mk((g) => { rect(g, 0, 2, 12, 8, "c"); rect(g, 1, 3, 6, 6, "l"); gline(g, 1, 8, 4, 4, "w"); gline(g, 4, 4, 7, 8, "w"); rect(g, 1, 8, 6, 1, "g"); rect(g, 8, 3, 3, 3, "r"); rect(g, 8, 7, 3, 1, "S"); });
  F.kagi = mk((g) => { disc(g, 3, 4, 2.6, "i"); dot(g, 3, 4, "."); gline(g, 5, 5, 11, 9, "i"); gline(g, 9, 8, 9, 10, "i"); gline(g, 10, 9, 11, 11, "i"); dot(g, 2, 3, "Y"); });
  F.botan = mk((g) => { disc(g, 5.5, 5.5, 4.5, "r"); disc(g, 5.5, 5.5, 3, "R"); [[4, 4], [7, 4], [4, 7], [7, 7]].forEach(([x, y]) => dot(g, x, y, "k")); dot(g, 3, 2, "p"); });
  F.ekistamp = mk((g) => { disc(g, 5.5, 5.5, 5, "w"); disc(g, 5.5, 5.5, 4.2, "u"); disc(g, 5.5, 5.5, 3.4, "w"); rect(g, 3, 4, 6, 2, "u"); rect(g, 4, 6, 1, 2, "u"); rect(g, 7, 6, 1, 2, "u"); dot(g, 5, 3, "u"); dot(g, 6, 3, "u"); });

  // =========================================================================================================
  // Người bán gánh hàng rong (nón lá, áo bà ba nâu, đòn gánh, hai thúng) — 30×26, khung "a" / "b" (nhún vai)
  // =========================================================================================================
  function vendor(bob) {
    const g = grid(30, 26);
    const y0 = bob ? 1 : 0;
    // đòn gánh
    gline(g, 2, 9 + y0, 27, 9 + y0, "B"); gline(g, 2, 10 + y0, 27, 10 + y0, "b");
    // hai thúng + dây
    const basket = (cx, top, fill) => {
      gline(g, cx - 3, 11 + y0, cx - 4, top, "T"); gline(g, cx + 3, 11 + y0, cx + 4, top, "T");
      ellipseFill(g, cx, top + 4, 4.6, 3.6, "t"); rect(g, cx - 4, top + 2, 9, 1, "T"); rect(g, cx - 3, top + 5, 7, 1, "b");
      fill(cx, top);
    };
    basket(5, 16 + y0, (cx, t) => { disc(g, cx - 1, t + 1, 1.4, "o"); disc(g, cx + 2, t + 1, 1.4, "y"); dot(g, cx, t, "g"); });        // hoa quả
    basket(24, 16 + y0, (cx, t) => { rect(g, cx - 3, t, 3, 2, "r"); rect(g, cx + 1, t - 1, 3, 3, "l"); dot(g, cx, t - 1, "p"); });    // đồ nhỏ
    // người
    rect(g, 13, 13 + y0, 4, 7, "B");                     // áo bà ba nâu
    rect(g, 12, 15 + y0, 1, 3, "B"); rect(g, 17, 15 + y0, 1, 3, "B");
    rect(g, 13, 20, 4, 4, "n");                          // quần đen
    rect(g, 13, 24, 1, 2, "e"); rect(g, 16, 24, 1, 2, "e");
    rect(g, 13, 7 + y0, 4, 4, "e");                      // mặt
    dot(g, 14, 9 + y0, "k"); dot(g, 16, 9 + y0, "k"); dot(g, 15, 10 + y0, "p");
    // nón lá
    for (let j = 0; j < 4; j++) { rect(g, 15 - j * 2, 3 + j + y0, 1 + j * 4, 1, j === 3 ? "t" : "T"); }
    dot(g, 15, 2 + y0, "T");
    rect(g, 12, 13 + y0, 1, 1, "e"); rect(g, 17, 13 + y0, 1, 1, "e");      // tay đỡ đòn
    return ol(g);
  }
  const VENDOR = { a: vendor(false), b: vendor(true) };

  // =========================================================================================================
  // Gắn vào home.js
  // =========================================================================================================
  const IDS = Object.keys(ITEMS);
  function install(L) {
    const { SPR, GLOW, EXTRA, P, box } = L;
    const ALT = L.ALT || {};
    ["N", "T", "L", "M", "O", "W", "Y"].forEach((k) => { if (!P[k]) { P[k] = PAL[k]; } });
    IDS.forEach((id) => { SPR[id] = ITEMS[id]; });
    ALT.kaifurin = { gio: shellChime(1) };
    ALT.kingyochochin = { lac: goldfishLamp(1) };
    GLOW.kingyochochin = [13, 15];
    GLOW.takeakari = [12, 13];
    GLOW.denkeoquan = [10, 16];
    if (EXTRA) {
      // quả lắc đung đưa (theo giây thật)
      EXTRA.dongholac = function (ctx, S, X, Y) {
        const t = Date.now() / 1000, a = Math.sin(t * Math.PI) * 0.45, cx = X + 7, cy = Y + 13;
        for (let k = 1; k <= 6; k++) { box(ctx, Math.round(cx + Math.sin(a) * k) - 0.5, Math.round(cy + Math.cos(a) * k) - 0.5, 1, 1, P.i, S); }
        box(ctx, Math.round(cx + Math.sin(a) * 7) - 1.5, Math.round(cy + Math.cos(a) * 7) - 1, 3, 2, P.y, S);
      };
      // hơi nước từ vòi ấm
      EXTRA.tetsubin = function (ctx, S, X, Y, e, now) {
        for (let k = 0; k < 3; k++) {
          const ph = ((now / 1300 + k / 3 + e.x * 0.17) % 1);
          ctx.globalAlpha = 0.55 * (1 - ph);
          box(ctx, Math.round(X + 15 + ph * 3 + Math.sin(ph * 6 + k) * 1), Math.round(Y + 6 - ph * 9), 2, 1, "#ffffff", S);
        }
        ctx.globalAlpha = 1;
      };
      // hơi nước bồn ngâm chân
      EXTRA.ashiyu = function (ctx, S, X, Y, e, now) {
        for (let k = 0; k < 4; k++) {
          const ph = ((now / 1800 + k / 4 + e.x * 0.11) % 1);
          ctx.globalAlpha = 0.45 * (1 - ph);
          box(ctx, Math.round(X + 6 + k * 6 + Math.sin(ph * 5 + k) * 1.5), Math.round(Y + 8 - ph * 12), 2, 2, "#ffffff", S);
        }
        ctx.globalAlpha = 1;
      };
      // đèn kéo quân: ban đêm bóng người cưỡi ngựa chạy vòng trên thân đèn
      EXTRA.denkeoquan = function (ctx, S, X, Y, e, now, tod) {
        if (tod === "day") { return; }
        ctx.globalAlpha = 0.35; box(ctx, X + 2, Y + 5, 10, 12, "#ffe9a8", S); ctx.globalAlpha = 1;
        const ph = (now / 2600 + e.x * 0.2) % 1;
        for (let k = 0; k < 2; k++) {
          const x = X + 2 + ((ph + k / 2) % 1) * 9;
          box(ctx, Math.round(x), Y + 9, 3, 2, "#5a3b1a", S); box(ctx, Math.round(x) + 1, Y + 7, 1, 2, "#5a3b1a", S);
          box(ctx, Math.round(x), Y + 11, 1, 2, "#5a3b1a", S); box(ctx, Math.round(x) + 2, Y + 11, 1, 2, "#5a3b1a", S);
        }
      };
      // tủ kính: món nhỏ trên ba kệ theo số món đã nhặt
      EXTRA.tukinh = function (ctx, S, X, Y) {
        const n = typeof GardenFinds !== "undefined" && GardenFinds.count ? GardenFinds.count() : 0;
        const cols = ["#ff4f6d", "#ffd23f", "#8fd3ff", "#3ccb5e", "#ff9f1c", "#c77dff", "#ffc4d6", "#e2a46a"];
        const shown = Math.min(15, Math.ceil(n * 15 / 42));
        for (let i = 0; i < shown; i++) {
          const shelf = Math.floor(i / 5), col = i % 5;
          const sx = X + 3 + col * 2 + (col >= 2 ? 1 : 0), sy = Y + 7 + shelf * 6;
          box(ctx, sx, sy - 1, 1, 2, cols[i % cols.length], S);
        }
      };
    }
    const swayA = ALT.kaifurin.gio, swayB = ALT.kingyochochin.lac;
    return {
      pal: function () { return null; },
      // chuông vỏ sò / đèn cá vàng đung đưa theo nhịp (mỗi món lệch pha theo chỗ đặt)
      frameOf: function (e, now) {
        if (e.id === "kaifurin") { return Math.floor(now / 700 + e.x) % 3 === 0 ? swayA : null; }
        if (e.id === "kingyochochin") { return Math.floor(now / 900 + e.x * 2) % 2 ? swayB : null; }
        return null;
      },
      ids: IDS
    };
  }

  return {
    install: install,
    find: function (id) { return F[id] || null; },
    peddler: function (frame) { return VENDOR[frame === "b" ? "b" : "a"]; },
    pal: PAL,
    ids: IDS,
    findIds: Object.keys(F),
    _items: ITEMS
  };
})();
