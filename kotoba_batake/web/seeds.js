/* ことば畑 – 1.14: giống cây cho ruộng (8 giống × 5 giai đoạn, 16×16, viền đen tự động).
   Python gán giống cho từng cây (plant.v); file này chỉ có hình. Ảnh dựng bằng script lúc phát triển.
   1.20: thêm 4 loài cho Lịch hoa (mai vàng, cẩm tú cầu, cúc, trạng nguyên) — cùng khuôn 5 giai đoạn để sau này
   dùng được làm giống cây ngoài ruộng; chưa bán ở cửa hàng nên không nằm trong `ids`.
   1.22: giống cây tự vẽ trong Xưởng (id "g1"…) — hình lấy từ catalog.myseeds, bảng màu của Xưởng. */
var GardenSeeds = (function () {
  "use strict";
  const PAL = {"k": "#1b1b2f", "g": "#3ccb5e", "G": "#2e8b3a", "j": "#1f5f2a", "f": "#b8e05a", "b": "#8a4a22", "B": "#5a3010", "y": "#ffd23f", "Y": "#e9a800", "o": "#ff9f1c", "O": "#d9620a", "p": "#ff7fa0", "P": "#ffc4d6", "r": "#ff4f6d", "R": "#c21f3a", "w": "#ffffff", "c": "#fff2b3", "t": "#e2a46a", "s": "#d4d4e0", "S": "#8a8fa8", "u": "#2f5fb0", "l": "#8fd3ff", "e": "#f4efe6", "v": "#c77dff", "m": "#9aa0b5", "n": "#3a3a55"};
  const DRY = Object.assign({}, PAL, {"k": "#3a2f2a", "g": "#b7a86a", "G": "#8a7a45", "j": "#6a5a35", "f": "#c8b77a", "b": "#7a5a3a", "B": "#5a4030", "y": "#c8b77a", "Y": "#a89a5a", "o": "#b89a6a", "O": "#9a7a4a", "p": "#b59a8e", "P": "#c9b5aa", "r": "#9b6e5c", "R": "#7b4e3c", "e": "#d8cfbf", "v": "#9a8aa8"});
  const SPR = {
    ine: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kk........", ".....kwckkk.....", ".....kcckyyk....", "......kk.kk....."],
      ["................", "................", "................", "................", "................", "................", "................", ".......k........", "......kgk.......", "....k.kgGk.k....", "...kgkkgGkkfk...", "...kfkkgGkkfgk..", "....kfkgGkfkgk..", "....kfkgGkfgk...", ".....kfgGfkgk...", ".....kggGfgk...."],
      ["........k.......", ".......kgk......", ".....k.kgGkk....", "....kgkkgGkgk...", "....kGkkgGkgGk..", "..k.kGkkgGkgGk..", ".kgkkgGkgGgGkk..", ".kGk.kGkgGgGkgk.", "..kGkkGkgGgGkgGk", "..kGkkGgGkgGgGk.", "...kGkggGgGkgGk.", "..kfGkggGgGgfk..", "..kfkGggGgGgfk..", "...kfgGgGggfk...", "...kfkGggGgfk...", "....kfggggfk...."],
      ["......kkck......", ".....kckfk.kk...", "....kfkck.kcfk..", "...kck.kfkfkkck.", "...kfk.kcck..k..", "....kck.kgGk....", "....kGk.kgGk....", "..k.kGk.kgGk.k..", ".kgk.kGkkgGkkgk.", ".kGgkkGkkgGkgkGk", "..kGkkGkgkGkgGk.", "...kGkgGgGkgkGk.", "...kGkgGgGkgGk..", "....kGkGgGgGk...", "....kgGggGgGk...", ".....kggggGk...."],
      [".......kk.......", "......kYyk......", ".....kyyk..kk...", "..kk.kYk..kYyk..", ".kyYkkyykkyykYk.", "kYkyykkYkYkkkyyk", "kykkkYkkkfYk.kYk", "kYk.kYk.kfYk..k.", ".kk.kYk.kfYk.k..", ".kfk.kYkkfYkkfk.", ".kYfkkYkkfYkfkYk", "..kYkkYkfYkkfYk.", "...kYkfYfYkfYk..", "....kYkYfYfkYk..", "....kfYffYfYk...", ".....kffffYk...."]
    ],
    daikon: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kkkk......", ".....kcwttk.....", ".....kttctk.....", "......kkkk......"],
      ["................", "................", "................", "................", "................", "................", "................", "................", "....kkk..kk.....", "...kgggkkffk....", "..kgggggffffk...", "...kggggkffk....", "....kkkgkkk.....", "......kgk.......", "......kgk.......", "......kgk......."],
      ["................", ".........k......", ".....kk.kgk.....", "....kGGkgggk....", "...kGGGGgggk....", "...kGGGGgggk....", "..kkGGGGgggkk...", ".kgggGGkkggggk..", ".kgggggkggggggk.", ".kgggggGkggggk..", "..kkkkkGkkkkk...", ".....kffffk.....", "......kGkk......", "......kGk.......", "......kGk.......", "......kGk......."],
      [".......k........", "......kwkkk.....", ".....kwvwvwk....", "....kkkGkwkk....", "...kGGGGkGggk...", "...kGGGGkGggk...", "...kGGGGkGggk...", "..kkGGGGkGggkk..", ".kggGGGGkGggggk.", "kggggggGkGgggggk", ".kggggkGGkggggk.", "..kkkkkGGkkkkk..", "......kGGk......", "......keek......", ".....keeeek.....", "......keek......"],
      [".....kGk.kk.....", "...kkGGGkggkk...", "..kggGGGgggggk..", ".kgggGGGkgggggk.", ".kggggkkkkggggk.", "..kggffffffggk..", "...kkffffffkk...", "....keeeeeek....", "....keeeeeek....", "....keseeeek....", "....keeeeeek....", "....keeeeeek....", "....keeeesek....", "....keeseeek....", ".....keeeek.....", "......keek......"]
    ],
    himawari: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", ".......kk.......", "......kwnk......", "......kwnk......", "......kwnk......", "......kwnk......"],
      ["................", "................", "................", "................", "................", "................", "................", "....kkk..kkk....", "...kgggkkfffk...", "..kgggggfffffk..", "...kggggkfffk...", "....kkkgkkkk....", "......kgk.......", "......kgk.......", "......kgk.......", "......kgk......."],
      [".......kk.......", "......kffk......", "......kffkkkk...", "......kgkggggk..", "...kkkkgGggggk..", "..kGGGGgGggggk..", "..kGGGGgGkkkk...", "..kGGGGgGkGGGk..", "...kkkkgGGGGGGk.", "...kkkkgGkGGGk..", "..kgggggGkkkk...", "..kgggggGk......", "..kgggggGk......", "...kkkkgGk......", "......kgGk......", "......kgGk......"],
      [".....kkYkkk.....", "...kkyyyyyykk...", "..kYyyyyyyyyYk..", "...kyyBBBByyk...", "...kyyBbBByyk...", "...kyyBBbByyk...", "...kyyBBBByyk...", "..kYyyyyyyyyYk..", "...kkyyyyyykk...", ".....kkGkkgggk..", "...kkkkGkgggggk.", "..kgggkGkkgggk..", ".kgggggGk.kkk...", "..kgggkGk.......", "...kkkkGk.......", "......kGk......."],
      ["........kk......", "......kkYYkk....", ".....kYYYYYYk...", "....kYYBBBBYYk..", "....kYBcBcBBYk..", "...kYYBBBBBcYYk.", "...kYYBBcBcBYYk.", "....kYBcBBBBYk..", "....kYYBBcBYYk..", ".....kYYYYYYk...", "...kkkkGYYgggk..", "..kGGGkGkgggggk.", ".kGGGGGGkkgggk..", "..kGGGkGk.kkk...", "...kkkkGk.......", "......kGk......."]
    ],
    kabocha: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kkkk......", ".....kcccck.....", ".....kwccck.....", "......kkkk......"],
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "....kkk..kkk....", "...kgggkkfffk...", "...kggggkfffk...", "....kkkgkkkk....", "......kgk.......", "......kgk.......", "......kgk......."],
      ["................", "................", "................", "................", "................", "................", "................", "........kkkkkkk.", "...kkk.kGGGGgggk", "..kgggkGGGGGgggk", ".kgggggGGgGGgggk", ".kgggggGGGGGgggk", ".kgggggGGGGGGkGk", "..kgggkkGGGGkkGk", ".kGGGGGGGGGGGGk.", "..kkkkkkkkkkkk.."],
      ["................", "................", "................", "......kkk.......", ".....kyoyk......", "....kyoooyk.....", "....kyyoyyk.....", "....kyyyyyk.....", "..kkkkyGyk..kkk.", ".kggggkGkkkkgggk", ".kggggkGGGGggggg", "kggggggGGGGggggg", ".kggggkGGGGGgggk", ".kggggkkGGGkkkk.", "kGGGGGGGGGGGGGGk", ".kkkkkkkkkkkkkk."],
      ["................", "................", "................", "................", ".......kkk......", "......kGGgk.....", "......kGGk......", ".....kkGGokk....", "..kkkoOoOoOokkk.", ".kggooyoOoOooGGk", "kgggooOoOoOooGGG", "kgggooOoOoOooGGG", "kgggooOoOoOooGGk", "kkggkoOoOoOokkkk", "GGGGGGGoooGGGGGG", "kkkkkkkkkkkkkkkk"]
    ],
    take: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", ".......k........", "......kBk.......", "......ktkk......", ".....kbbbbk.....", ".....kbbbbk.....", "......kkkk......"],
      ["................", "................", "................", "................", "................", "........k.......", ".......kBk......", ".......kBk......", "......kBkk......", ".....kbbbbk.....", "....kttttttk....", "....kbBbbbbk....", "....kbbbbBbk....", "....kttttttk....", ".....kbbbbk.....", ".....kbbbbk....."],
      ["..........kk....", ".........kggk...", ".......kkggggk..", "......kggkkkkk..", "......kggfffffk.", "......kggfffffk.", "......kggkkkkk..", "...kkkkGGk......", "..kggggggk......", "...kkkkggk......", "......kggk......", "....k.kGGk......", "...kbkkggk......", "..kbbbkggk......", "..kbbbkggk......", "...kbkkggk......"],
      [".....kk..k......", "...kkggkkfkk....", ".kkfkggfffffk...", "kfffffgkkfkk....", ".kkfkGGk.kggkkkk", "...kkggk.kggffff", "....kggk.kggffff", ".kkkkggk.kGGkkkk", "kffffGGk.kggkfk.", ".kkkkggk.kggfffk", "....kggk.kggkfk.", "....kggk.kGGkk..", "....kGGk.kggk...", "....kggk.kggk...", "....kggk.kggk...", "....kggk.kGGk..."],
      ["...kkkkGGfffk...", "..kffffGfffffk..", ".kfffffffffffgkk", ".kgffffjjfffgfff", "kfggkkkGGkkkgfff", "fffgkkkGGkkkGfff", "kfGGkfkGGffffgkk", ".kggfffjjkkkggk.", ".kggkfkGGk.kggk.", ".kggkkkGGk.kGGk.", ".kGGk.kGGk.kggk.", ".kggk.kjjk.kggk.", ".kggk.kGGkkkggk.", ".kggk.kGGkbkGGk.", ".kGGk.kGGbbbggk.", ".kggk.kjjbbbggk."]
    ],
    sakura: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", ".......kk.......", "......kttk......", ".....ktcttk.....", ".....kttttk.....", "......kttk......"],
      ["................", "................", "................", "................", "................", "................", "................", "........kkkk....", "....kkkkggggk...", "...kgggkggggk...", "...kgggbkkkk....", "....kkkbk.......", "......kbk.......", "......kbk.......", "......kbk.......", "......kbk......."],
      ["................", "................", ".......kk.......", ".....kkggkk.....", "....kfffgggk....", "...kgfffggggk...", "...kgfffggggk...", "...kgfffggGgk...", "...kggggggggk...", "....kggggggk....", ".....kkggkk.....", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......"],
      ["......kkkk......", "....kkPPPPkk....", "...kppwPPPPPk...", "..kpppppPpPPPk..", ".kpppppppPPPPPk.", ".kPpppppRPPPwPk.", ".kPPpppPPPPPPPk.", ".kPPPwPPPPPPPPk.", "..kPPPPPPPpPPk..", "...kPPPPPPPPk...", "....kBPPPPBk....", ".....kBBBkk.....", "......kBBk......", "......kBBk......", "......kBBk......", "......kBBk......"],
      ["......kkkk......", "....kkggggkk....", "...kfffggGggk...", "..kfffffgrgggk..", ".kffGffffgRgggk.", ".kgfrfffgGGGGgk.", ".kggfRfgGGGGGGk.", ".kggggGgGGGrGGk.", "..kgggrggGGGRk..", "...kgggRggggk...", "....kbggggbk....", ".....kbbbkk.....", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......"]
    ],
    momiji: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "..........kk....", "........kkttk...", "......kktttk....", ".....kbtkkk.....", ".....kbbk.......", "......kk........"],
      ["................", "................", "................", "................", "................", "................", ".......k........", "......kgk.......", ".....kgfgk......", "....kgkgkgk.....", ".....kkbkk......", "......kbk.......", "......kbk.......", "......kbk.......", "......kbk.......", "......kbk......."],
      ["................", "................", ".....kkkkkk.....", "....kgggfggk....", "...kggggggggk...", "..kgfggggggggk..", "..kggggggggfgk..", "..kggggggggggk..", "...kggfgggggk...", "....kggggggk....", ".....kkbbkk.....", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......"],
      ["......kkkk......", "....kkooookk....", "...kyyyoooook...", "..kyyyOyoyoook..", ".kyyyyyyyoooook.", ".koyyyyyoOOOOok.", ".kooryyoOOOOOOk.", ".kooooooOOOrOOk.", "..kooooooOOOOk..", "...kooooooook...", "....kboooobk....", ".....kbbbkk.....", "......kbbk......", "......kbbk......", "......kbbk......", "......kbbk......"],
      ["......kkkk......", "....kkrrrrkk....", "...kRRRrrrrrk...", "..kRRRRRrrorrk..", ".kRRoRRRRrrrrrk.", ".krRRRRRrrrrrrk.", ".krrRRRrrrrrRrk.", ".krrrrryrrrrrrk.", "..krrrrrrrrrrk..", "...krrrrrrrrk...", "....kbrrrrbk....", ".....kbbbkk..k..", "..k...kbbk..kRk.", ".krk..kbbk..kk..", "..k...kbbk.kok..", "......kbbk..k..."]
    ],
    bonsai: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", ".......k........", ".....kktkkk.....", "...kkBBBBBBkk...", "..kuuuuuuuuuuk..", "...kuuuuuuuuk...", "...kllllllllk...", "...kllllllllk..."],
      ["................", "................", "................", "................", "................", "................", "......k.k.......", ".....kgkfk......", "......kgk.......", "......kgk.......", ".....kkgkkk.....", "...kkBBBBBBkk...", "..kuuuuuuuuuuk..", "...kuuuuuuuuk...", "...kllllllllk...", "...kllllllllk..."],
      ["................", "................", ".......kkkk.....", "......kGgggk....", ".....kGGgggGk...", "......kGGGGk....", "......kbkkk.....", ".....kbk........", ".....kbk........", "......kbk.......", ".....kkbkkk.....", "...kkBBBBBBkk...", "..kuuuuuuuuuuk..", "...kuuuuuuuuk...", "...kllllllllk...", "...kllllllllk..."],
      [".......kkkk.....", "......kGgGGk....", ".....kGGGGGGk...", "......kkGGkkk...", ".......kbGgGGk..", "..kkkkkbGGGGGGk.", ".kGgGGGkkGGGGk..", ".kGGGGGk.kkkk...", "..kkkbk.........", ".....kbk........", ".....kkbkkk.....", "...kkBBBBBBkk...", "..kuuuuuuuuuuk..", "...kuuuuuuuuk...", "...kllllllllk...", "...kllllllllk..."],
      [".......kkkk.....", "......kGgGGk....", ".....kGGGGbGk...", "......kkGGkk....", ".....kgjjk......", ".kkkkkkBkkkkkkk.", "kjjgjjjkkGGgGGGk", "kjbjjjjkkGGGbGGk", ".kkkkBk.kkBBkkk.", ".....kBkBBkk....", ".....kkBkkk.....", "...kkfBBBfBkk...", "..kuuuuuuuuuuk..", "...kuuuuuuuuk...", "...kllllllllk...", "...kllllllllk..."]
    ],
    // 1.20 · Lịch hoa: mai vàng (Tết)
    mai: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kk........", ".....kttkk......", "....ktctttk.....", ".....ktttk......"],
      ["................", "................", "................", "................", "................", "................", "................", ".........kk.....", "....kk..kggk....", "...kggkkgfggk...", "..kgfggkggggk...", "...kggGbGggk....", "....kkkbkkk.....", "......kbk.......", "......kbk.......", "......kbk......."],
      ["................", ".......kk.......", "....kkkggkkk....", "...kgggggbggk...", "..kggfbggbggfk..", ".kggggbgfbgggbk.", ".kbbfgbgbggbbGk.", ".kggbggbbgbGGGk.", ".kgfgbgbbGbGGGk.", "..kgggbbbbGGGk..", "...kggbbbbGGk...", "....kkkbbkkk....", "......kbbk......", "......kbbk......", "......kbbk......", ".....kbbbbk....."],
      [".....kkkkkk.....", "...kkgggyggkk...", "..kgggYgggyggk..", ".kggfggfgbfggfk.", "kggyggbggbggYggk", "kgggggbggbgggbGk", "kgbbgYbgbggbbGGk", "kgygbggbbgyGGGGk", ".kgggbgbbGbGGyk.", ".kgfygbbbbGGGGk.", "..kkggbbbbGYkk..", "....kkkbbkkk....", "......kbbk......", "......kbbk......", "......kbbk......", ".....kbbbbk....."],
      ["....kkkkkkkk....", "..kkyyyyogyykk..", ".kyyyyogyyyoyyk.", "kyyyogyyybyyyyok", "kyogyyboybyyoygk", "kgyyyobyyboygbYk", "kybbyybybygbboYk", "koyybyobbyboYYYk", "kyyyobgbbobYYYok", ".koygybbbbYYoYk.", "..kyyobYYboYYk..", "...kkkYbbYkkk.k.", ".k....kbbk...kyk", "kyk...kbbk..k.k.", ".k....kbbk.kyk..", ".....kbbbbk.k..."]
    ],
    // 1.20 · Lịch hoa: cẩm tú cầu (Mùa mưa)
    ajisai: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kk........", ".....kffk.......", ".....kgfk.......", "......kk........"],
      ["................", "................", "................", "................", "................", "................", "................", "................", "...kkk...kkk....", "..kgggk.kgggk...", ".kgfffgkgfffgk..", ".kgffGGgGGffgk..", "..kgGGGgGGGgk...", "...kkkkGkkkk....", "......kGk.......", "......kGk......."],
      ["................", "................", "......kkkk......", ".....kggggk.....", "..kkkgfffGgkkk..", ".kggggffGGggggk.", "kgfffgGGGgfffGgk", "kgffGGgGgGGfGGgk", ".kgGGGgjgGGGGgk.", ".kggggkGkggggk..", "kgfffGgGgfffGgk.", "kgffGGGjGGffGGgk", ".kgGGGGjGGGGGgk.", "..kgggjjjgggkk..", "...kkkjjjkkk....", ".....kjkjk......"],
      [".......kk.......", "......kllk......", ".....kluulk.....", "..kk.kluulk.kk..", ".kllk.kllk.kllk.", "kluulkkGk.kluulk", "kluulkgGgkkluulk", ".klGkgfGGgkkGlk.", ".kggfffGjgffggk.", "kgfffgGGjgffGGgk", "kgffGGgjjGGfGGgk", ".kgGGGgjgGGGGgk.", "kgfffgGjGgfffgk.", "kgffGGGjGGffGGgk", ".kgGGGjjjGGGGgk.", "..kggjjjjjgggk.."],
      ["..klllukkvvPvk..", ".kllululkvPvPvk.", "kluluullvPvvPvvk", "kulllululvvPvPvk", "klulluulvPvPvvvk", ".kulllulkvvPvvk.", "..kluukgkkvvvk..", ".kggggfGGggggk..", "kgfffgGGjgfffgk.", "kgffGGgjjGGfGGgk", ".kgGGGgjgGGGGgk.", "kgfffgGjGgfffGgk", "kgffGGGjGGffGGgk", ".kgGGGjjjGGGGgk.", "..kggjjjjjgggk..", "...kkkkkkkkkk..."]
    ],
    // 1.20 · Lịch hoa: cúc (Mùa thu)
    kiku: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kk........", ".....kttk.......", ".....kttk.......", "......kk........"],
      ["................", "................", "................", "................", "................", "................", "................", "........k.......", "...k...kgk......", "..kgk.kgfgkk....", ".kgfgkkgGgkgk...", ".kgGgk.kGkgfgk..", "..kgGk.kGkGgk...", "...kGGkkGkGk....", "....kkGGGGk.....", "......kGkk......"],
      ["................", "................", ".......kk.......", "......kggk......", "..k..kgffgk.k...", ".kgk.kgGGgkkgk..", "kgfgk.kGkkkgfgk.", "kgGggkkGkkggGgk.", ".kgGfgkGkgfGgk..", "..kgGGgGgGGgk...", ".kgkkkGGGkkkgk..", "kgfgk.kGk.kgfgk.", "kgGggkkGkkggGgk.", ".kgGfgGGGgfGgk..", "..kgGGgGgGGgk...", "...kkkkGkkkk...."],
      ["......kk........", ".....kyyk...kk..", "....kyooyk.kyyk.", "..kkkyooykkyooyk", ".kyykkyyk.kyooyk", "kyooykkGk..kyyk.", "kyooykkGk..kGk..", ".kyGgkkGk.kgGk..", "..kGggkGkkgGgk..", ".kgfgGkGkgfgk...", ".kgGGggGgGGgk...", "..kkGGGGGGkkk...", ".kgkkkkGkkkkgk..", "kgfggkkGkkggfgk.", ".kgGfgGGGgfGgk..", "..kgGGgGgGGgk..."],
      ["....kokokok.k.k.", "...koyoyoyokokok", "..kooyycyyooyoyo", "...koycYcyoyyyok", "..kooyycyyoocyok", ".k.koyoyoyoyyyok", "kokokokoGokoyok.", "oyoyokkGkkkoGok.", "oycyokkGk.kGkk..", "oyyyoggkGkgGk...", "koGokgfgGgfgk...", ".kGkkgGGGGGgkk..", ".kGgggkkGkkgggk.", ".kgfgGkkGkgfggk.", "..kgGGggGgGGgk..", "...kkkkkGkkkk..."]
    ],
    // 1.20 · Lịch hoa: trạng nguyên (Giáng sinh)
    poinsettia: [
      ["................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "................", "......kk........", ".....kbtk.......", ".....kttk.......", "......kk........"],
      ["................", "................", "................", "................", "................", "................", "................", "................", "....kkk..kkk....", "...kgggkkgggk...", "..kgfffggfffgk..", "..kgffGgGGffgk..", "...kgGGgGGggk...", "....kkgGgkkk....", "......kGk.......", "......kGk......."],
      ["................", "................", ".......kk.......", "......kggk......", "...kkkgffgkkk...", "..kggkgGGgkggk..", ".kgffgkGGkgffgk.", ".kgfGGgGGgGGfgk.", "..kgGGgGGgGGgk..", ".kgggkkGGkkgggk.", "kgfffgkGGkgfffgk", "kgffGGgGGgGGffgk", ".kgGGGgGGgGGGgk.", "..kggggGGggggk..", "...kkkkGGkkkk...", "......kGGk......"],
      [".......kk.......", "......krrk......", "...kkkrRRrkkk...", "..krrkrRRrkrrk..", ".krRRrkyykrRRrk.", "..krrrkyykrrrk..", "...kkkgGGgkkk...", "..kggkgGGgkggk..", ".kgffgkGGkgffgk.", ".kgfGGgGGgGGfgk.", "..kgGGgGGgGGgk..", ".kgggkkGGkkgggk.", "kgfffgkGGkgfffgk", "kgffGGgGGgGGffgk", ".kgGGGgGGgGGGgk.", "..kggggGGggggk.."],
      ["......krrk......", "..kk.krrRrk.kk..", ".krrkkrRRrkkrrk.", "krrRrrkrrkrrRrrk", ".krRRRryyrRRRrk.", "..krrRyYYyRrrk..", "..kkrryYYyrrkk..", ".krrRRryyrRRrrk.", "krRRrrkrrkrrRRrk", ".krrkkrRRrkkrrk.", "..kggkrRRrkggk..", ".kgffggrrggffgk.", "kgffGGgGGgGGffgk", ".kgGGGgGGgGGGgk.", "..kggggGGggggk..", "...kkkkGGkkkk..."]
    ]
  };
  const CAL_ONLY = ["mai", "ajisai", "kiku", "poinsettia"];

  // ---- 1.22: giống cây tự vẽ (Xưởng) — hình 16×16 theo bảng màu Xưởng (catalog.craft.palette), 5 giai đoạn ----
  // Giai đoạn chưa vẽ lấy hình giai đoạn gần nhất trước nó; Hạt chưa vẽ → null (ruộng vẽ hạt của cây gốc).
  let source = null, seenList = null, MY = {}, CPAL = null, CDRY = null;
  function decode(code) {
    let out = "", num = "";
    for (const ch of String(code || "")) {
      if (ch >= "0" && ch <= "9") { num += ch; continue; }
      out += ch.repeat(num ? Number(num) : 1); num = "";
    }
    if (out.length !== 256) { return null; }
    const rows = [];
    for (let y = 0; y < 16; y++) { rows.push(out.slice(y * 16, y * 16 + 16)); }
    return rows;
  }
  function dryOf(hex) {     // héo: ngả về màu cỏ khô, giữ độ sáng tương đối
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255, k = 0.45 + 0.6 * l;
    const t = [Math.min(255, 200 * k), Math.min(255, 183 * k), Math.min(255, 122 * k)];
    const mix = (a, c) => Math.round(a * 0.35 + c * 0.65).toString(16).padStart(2, "0");
    return "#" + mix(r, t[0]) + mix(g, t[1]) + mix(b, t[2]);
  }
  function sync() {
    const cat = source ? source() : null;
    const list = cat && cat.myseeds;
    if (list === seenList) { return; }
    seenList = list; MY = {};
    const pal = (cat && cat.craft && cat.craft.palette) || null;
    if (pal && pal !== CPAL) {
      CPAL = pal; CDRY = {};
      Object.keys(pal).forEach((c) => { CDRY[c] = dryOf(pal[c]); });
      CDRY.k = "#3a2f2a";
    }
    (list || []).forEach((g) => {
      const st = (g.st || []).map((c) => (c ? decode(c) : null));
      const full = [];
      for (let i = 0; i < 5; i++) {
        let r = st[i] || null;
        if (!r && i > 0) { for (let j = i - 1; j >= 0 && !r; j--) { r = st[j] || null; } }
        if (!r && i > 0) { for (let j = i + 1; j < 5 && !r; j++) { r = st[j] || null; } }
        full.push(r);
      }
      MY[g.id] = { name: g.name, rows: full, drawn: st.map((r) => !!r) };
    });
  }
  function mine(v) { if (!v || SPR[v]) { return null; } sync(); return MY[v] || null; }

  // 1.25.5: bản sửa hình gốc (fix.js) — khung "0".."4" = 5 giai đoạn
  if (typeof GardenFix !== "undefined") {
    GardenFix.register("giong", {
      frames: (v) => { const o = {}; (SPR[v] || []).forEach((r, i) => { if (Array.isArray(r)) { o[String(i)] = r; } }); return o; },
      set: (v, i, r) => { if (SPR[v]) { SPR[v][Number(i)] = r; } },
      pal: () => PAL
    });
  }
  return {
    ids: Object.keys(SPR).filter((k) => CAL_ONLY.indexOf(k) < 0),
    all: Object.keys(SPR),
    has: function (v) { return !!(v && (SPR[v] || mine(v))); },
    rows: function (v, stage) {
      const st = Math.max(0, Math.min(4, stage | 0));
      const s = v && SPR[v];
      if (s) { return s[st]; }
      const m = mine(v);
      return m ? m.rows[st] : null;
    },
    pal: function (wilted, v) {
      if (v && !SPR[v] && mine(v) && CPAL) { return wilted ? CDRY : CPAL; }
      return wilted ? DRY : PAL;
    },
    // 1.22
    source: function (fn) { source = fn; seenList = null; },
    custom: function (v) { return !!mine(v); },
    info: function (v) { return mine(v); },
    decode: decode
  };
})();
