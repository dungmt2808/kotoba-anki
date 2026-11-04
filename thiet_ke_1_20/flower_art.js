// Vẽ một ô hoa của Lịch hoa: đất (như ô ruộng) + cây theo loài của giao diện mùa và mức ôn (0 = chỉ có đất)
var KB_FLOWER_ART = (function () {
  "use strict";
  const PAL = Object.assign({}, KB_DEF.PAL, GardenSeeds.pal(false));
  const SPECIES = {   // giao diện mùa → loài (seeds.js có sẵn hoặc flowers.js mới)
    none: "goc", spring: "sakura", hanami: "sakura", tet: "mai", oshogatsu: "bonsai", winter: "bonsai", tsuyu: "ajisai",
    tanabata: "take", summer: "himawari", natsu: "himawari", autumn: "kiku", tsukimi: "ine", halloween: "kabocha",
    momiji: "momiji", xmas: "poinsettia",
  };
  function rows(species, level) {
    if (species === "goc") { return KB_DEF.SPRITES[level]; }
    if (KB_FLOWERS[species]) { return KB_FLOWERS[species][level - 1]; }
    return GardenSeeds.rows(species, level);
  }
  function draw(ctx, r, ox, oy, s) {
    r.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = PAL[row[x]]; if (c) { ctx.fillStyle = c; ctx.fillRect((ox + x) * s, (oy + y) * s, s, s); } } });
  }
  function soil(ctx, s, seed) {
    const W = 18;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, w * s, h * s); };
    px(1, 16, W - 2, 4, "#8a4a22"); px(1, 16, W - 2, 1, "#a8643a"); px(0, 17, 1, 2, "#5a3010"); px(W - 1, 17, 1, 2, "#5a3010");
    [[3, 18], [8, 17], [13, 19], [11, 18]].forEach((p, i) => { if ((seed + i) % 2 === 0) { px(p[0], p[1], 1, 1, "#5a3010"); } });
  }
  function make(theme, level, s, seed) {
    const cv = document.createElement("canvas");
    cv.width = 18 * s; cv.height = 20 * s; cv.style.imageRendering = "pixelated";
    const ctx = cv.getContext("2d");
    soil(ctx, s, seed || 0);
    if (level > 0) { draw(ctx, rows(SPECIES[theme] || "goc", level), 1, 1, s); }
    return cv;
  }
  return { make: make, rows: rows, SPECIES: SPECIES, draw: draw, PAL: PAL };
})();
