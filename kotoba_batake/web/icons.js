/* ことば畑 – icon pixel nhỏ (1.17.3) thay cho emoji: mỗi icon là lưới 8×8, vẽ thành SVG (2px / điểm ảnh)
   để hợp phong cách pixel của vườn. Dùng: GardenIcons.el("lock") hoặc GardenIcons.fill(node, "[i:lock] Bãi biển").
   Trong HTML tĩnh: <i class="kb-pi kb-pi-lock" aria-hidden="true"></i>. */
var GardenIcons = (function () {
  "use strict";

  const PAL = {
    k: "#1b1b2f", r: "#e8452c", R: "#a82a1c", o: "#ff9a2e", y: "#ffd23f", Y: "#e0a800", w: "#ffffff",
    g: "#3ccb5e", G: "#2e8b3a", b: "#b07a4a", B: "#6e4526", s: "#aab3c5", S: "#6b7088", p: "#ff8fb0",
    P: "#d94f7a", u: "#6ec6ff", U: "#2f7fd1", c: "#9aa3b5", n: "#5b6280", m: "#fff2b3"
  };
  // mỗi icon 8 dòng × 8 ký tự; "." = trong suốt
  const ICONS = {
    fire: ["...r....", "..rr..r.", "..ror.r.", ".roorrr.", ".royyor.", "rroyyoor", "rooyyoor", ".rroorr."],
    lock: ["..kkkk..", ".k....k.", ".k....k.", "kkkkkkkk", "kyyyyyyk", "kyyykyyk", "kYYYkYYk", "kkkkkkkk"],
    seed: ["gg....gg", "gGg..gGg", ".gGggGg.", "..ggGg..", "....G...", "....G...", ".bbbbbb.", "bBbbbBbb"],
    paw: [".b.bb.b.", ".b.bb.b.", "........", "...bb...", "..bbbb..", ".bbbbbb.", ".bbbbbb.", "..b..b.."],
    wrench: [".....s.s", ".....s.s", "....ssss", "...sss..", "..sss...", ".sss....", "sss.....", ".s......"],
    phone: [".kkkkkk.", ".kuuuuk.", ".kuuuuk.", ".kuuuuk.", ".kuuuuk.", ".kkkkkk.", ".kkwwkk.", ".kkkkkk."],
    warn: ["...yy...", "..yyyy..", "..ykky..", ".yykkyy.", ".yykkyy.", "yyyyyyyy", "yyykkyyy", "YYYYYYYY"],
    camera: ["........", "..kkk...", "kkkkkkkk", "ksskkssk", "kskuukwk", "kskuuksk", "ksskkssk", "kkkkkkkk"],
    hourglass: ["kkkkkkkk", ".kmmmmk.", "..kyyk..", "...kk...", "...kk...", "..kmyk..", ".kyyyyk.", "kkkkkkkk"],
    sun: ["y..yy..y", ".y....y.", "..yyyy..", "yyyooyyy", "yyyooyyy", "..yyyy..", ".y....y.", "y..yy..y"],
    moon: ["..yyy...", ".yyY....", "yyY.....", "yyY.....", "yyY.....", ".yyY....", "..yyy...", "........"],
    cloud: ["........", "...cc...", "..cwwc..", ".cwwwwcc", "cwwwwwwc", "cwwwwwwc", ".cccccc.", "........"],
    rain: ["...cc...", "..cwwc..", ".cwwwwcc", "cwwwwwwc", ".cccccc.", ".u..u..u", "u..u..u.", "........"],
    storm: ["...nn...", "..nssn..", ".nssssnn", "nnnnnnnn", "...yy...", "..yy....", ".yyyy...", "...y...."],
    snow: ["...u....", ".u.u.u..", "..uuu...", "uuuwuuu.", "..uuu...", ".u.u.u..", "...u....", "........"],
    leaf: ["......gG", "....ggGG", "...gGGg.", "..gGGg..", ".gGGg...", ".Gg.....", "G.......", "........"],
    blossom: ["...pp...", ".pppppp.", ".ppyypp.", "pppyyppp", ".ppyypp.", ".pppppp.", "...pp...", "........"],
    // 1.28: chỗ lấp lánh, gánh hàng rong
    sparkle: ["...y....", "...y....", "..yyy...", "yyywyyy.", "..yyy...", "...y..y.", "...y.yyy", "......y."],
    peddler: ["BBBBBBBB", "k.k..k.k", ".k....k.", "kgk..kok", "bbb..bbb", "bBb..bBb", "bbb..bbb", ".B....B."],
    apple: ["....G...", "...Gg...", ".rr.rr..", "rrrrrrr.", "rwrrrrr.", "rrrrrrr.", ".rrrrr..", "..r.r..."],
    rainbow: ["..rrrr..", ".roooor.", "royyyyor", "roy..yor", "roy..yor", "........", "........", "........"],
    target: ["..rrrr..", ".rwwwwr.", "rwrrrrwr", "rwrwwrwr", "rwrwwrwr", "rwrrrrwr", ".rwwwwr.", "..rrrr.."],
    firework: ["p..y..p.", ".p.y.p..", "..pyp...", "yyy.yyy.", "..pyp...", ".p.y.p..", "p..y..p.", "........"],
    gift: [".rr..rr.", "...rr...", "pppprppp", "PPPPrPPP", ".ppprpp.", ".ppprpp.", ".ppprpp.", ".pppppp."],
    eye: ["........", "..kkkk..", ".kwwwwk.", "kwwkkwwk", "kwwkkwwk", ".kwwwwk.", "..kkkk..", "........"],
    speaker: ["...k....", "..kk..k.", "kkkk...k", "kkkk.k.k", "kkkk.k.k", "kkkk...k", "..kk..k.", "...k...."],
    pencil: ["......kk", ".....kok", "....kyk.", "...kyk..", "..kyk...", ".kyk....", "kwk.....", "kk......"],
    eraser: ["....kkkk", "...kpppk", "..kpppk.", ".kwwpk..", "kwwwk...", "kkkk....", "........", "........"],
    gear: ["k..kk..k", ".kkkkkk.", ".kk..kk.", "kk....kk", "kk....kk", ".kk..kk.", ".kkkkkk.", "k..kk..k"],
    star: ["...yy...", "...yy...", "yyyyyyyy", ".yyyyyy.", "..yyyy..", ".yy..yy.", ".y....y.", "........"],
    // 1.20: Lịch hoa / cuốn nhật ký
    book: ["........", ".kkkkkk.", "kRrrrrrk", "kRrwwrrk", "kRrrrrrk", "kRrrrrrk", "kRmmmmmk", ".kkkkkk."],
    flower: ["..p.p...", ".ppypp..", "..ppp...", "...G....", ".g.G....", "..gG.g..", "...Gg...", "...G...."],
    search: [".kkkk...", "kwwwwk..", "kwwwwk..", "kwwwwk..", "kwwwwk..", ".kkkkkk.", ".....kkk", "......kk"],
    // 1.30: StackChan (màn hình đen, mắt trắng) — chip "StackChan đang làm gì"
    stack: [".kkkkkk.", "kkkkkkkk", "kkwkkwkk", "kkwkkwkk", "kkkkkkkk", "kkkwwkkk", "kssssssk", ".kkkkkk."]
  };
  // 1.20: sticker tâm trạng 9×9 (vẽ tay, không dùng emoji). y = màu mặt của từng sticker.
  const FACES = {
    vui: { c: "#ffd23f", r: ["..kkkkk..", ".kyyyyyk.", "kyykyykyk", "kyyyyyyyk", "kyyyyyyyk", "kykyyykyk", "kyykkkyyk", ".kyyyyyk.", "..kkkkk.."] },
    hao_hung: { c: "#ff9bb4", r: ["..kkkkk..", ".kyyyyyk.", "kykkykkyk", "kyykyykyk", "kyyyyyyyk", "kyykkkyyk", "kyykrkyyk", ".kyykyyk.", "..kkkkk.."] },
    thu_thai: { c: "#8fe3a6", r: ["..kkkkk..", ".kyyyyyk.", "kykykykyk", "kyyyyyyyk", "kyyyyyyyk", "kyyyyyyyk", "kyykkkyyk", ".kyyyyyk.", "..kkkkk.."] },
    binh_thuong: { c: "#f1e6c8", r: ["..kkkkk..", ".kyyyyyk.", "kyykyykyk", "kyyyyyyyk", "kyyyyyyyk", "kyyyyyyyk", "kyykkkyyk", ".kyyyyyk.", "..kkkkk.."] },
    met: { c: "#ffe9a8", r: ["..kkkkk.c", ".kyyyyykc", "kykkykkyk", "kyyyyyyyk", "kyyyyyyyk", "kyyyyyyyk", "kyyykyyyk", ".kyyyyyk.", "..kkkkk.."] },
    buon: { c: "#9ecbff", r: ["..kkkkk..", ".kyyyyyk.", "kyykyykyk", "kyyyyyyyk", "kyyyyyyyk", "kyykkkyyk", "kykyyykyk", ".kyyyyyk.", "..kkkkk.."] },
    ban: { c: "#ffc27a", r: ["..kkkkk..", ".kyyyyyk.", "kykyykyyk", "kyyyyyyyk", "kyyyyyyyk", "kykykykyk", "kyykykyyk", ".kyyyyyk.", "..kkkkk.."] },
    om: { c: "#c9e4b4", r: ["..kkkkk..", ".kyyyyyk.", "kykkykkyk", "kyyyyyyyk", "kyyyyyywk", "kyykkkywk", "kyyyyyyrk", ".kyyyyyk.", "..kkkkk.."] }
  };
  const FACE_NAMES = { vui: "Vui", hao_hung: "Hào hứng", thu_thai: "Thư thái", binh_thuong: "Bình thường", met: "Mệt",
    buon: "Buồn", ban: "Bận", om: "Ốm" };
  const faceUrl = {};
  function faceSrc(id) {
    const f = FACES[id];
    if (!f) { return ""; }
    if (!faceUrl[id]) {
      const pal = { k: "#1b1b2f", y: f.c, c: "#3a86ff", r: "#e23b3b", w: "#ffffff" };
      let r = "";
      f.r.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) { r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>'; } } });
      faceUrl[id] = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9" shape-rendering="crispEdges">' + r + "</svg>");
    }
    return faceUrl[id];
  }
  // sticker thành <img> (dùng được cả trong file PDF của cuốn nhật ký vì ảnh nằm ngay trong src)
  function face(id, px) {
    const img = document.createElement("img");
    img.className = "kb-face";
    img.src = faceSrc(id);
    img.width = img.height = px || 18;
    img.alt = FACE_NAMES[id] || "";
    img.title = FACE_NAMES[id] || "";
    img.draggable = false;
    return img;
  }

  function svg(rows) {
    let r = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = PAL[row[x]];
        if (c) { r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>'; }
      }
    });
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" ' +
      'shape-rendering="crispEdges">' + r + "</svg>") + '")';
  }
  // một lần khi nạp: mỗi icon thành một lớp CSS .kb-pi-<tên>
  (function install() {
    const css = Object.keys(ICONS).map((k) => ".kb-pi-" + k + "{background-image:" + svg(ICONS[k]) + "}").join("\n");
    const st = document.createElement("style");
    st.id = "kb-pi-style";
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  })();

  function el(name) {
    const i = document.createElement("i");
    i.className = "kb-pi kb-pi-" + name;
    i.setAttribute("aria-hidden", "true");
    return i;
  }
  const TOKEN = /\[i:([a-z]+)\]\s?/g;
  // Ghi chữ vào node; "[i:tên] " trong chữ thành icon pixel. Không có dấu hiệu thì như textContent.
  function fill(node, text) {
    text = String(text === undefined || text === null ? "" : text);
    node.textContent = "";
    let pos = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      if (m.index > pos) { node.appendChild(document.createTextNode(text.slice(pos, m.index))); }
      node.appendChild(ICONS[m[1]] ? el(m[1]) : document.createTextNode(""));
      pos = TOKEN.lastIndex;
    }
    if (pos < text.length) { node.appendChild(document.createTextNode(text.slice(pos))); }
    return node;
  }
  function strip(text) { return String(text || "").replace(TOKEN, ""); }

  return { el: el, fill: fill, strip: strip, names: Object.keys(ICONS), _icons: ICONS, _pal: PAL,
    face: face, faceSrc: faceSrc, faces: Object.keys(FACES), faceName: function (id) { return FACE_NAMES[id] || ""; } };
})();
