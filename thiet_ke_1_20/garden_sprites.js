var KB_DEF = (function () {
  var PAL = {
    k: "#1b1b2f", g: "#3ccb5e", G: "#2e8b3a", b: "#8a4a22",
    y: "#ffd23f", p: "#ff7fa0", r: "#ff4f6d", w: "#ffffff", d: "#3d8bff"
  };
  var DRY = {
    k: "#3a2f2a", g: "#b7a86a", G: "#8a7a45", b: "#7a5a3a",
    y: "#c8b77a", p: "#b59a8e", r: "#9b6e5c", w: "#ffffff", d: "#3d8bff"
  };

  var E = "................";
  var STEM = ".......kbk......";
  var SPRITES = [
    // 0 Hạt giống
    [E, E, E, E, E, E, E, E, E, E, E, E,
     "......kkkk......",
     ".....kbbbbk.....",
     ".....kbbbbk.....",
     "......kkkk......"],
    // 1 Mầm
    [E, E, E, E, E, E, E, E,
     "...kk.....kk....",
     "..kggk...kggk...",
     "..kgggk.kgggk...",
     "...kkgGkGgkk....",
     ".......kGk......",
     ".......kGk......",
     ".......kGk......",
     ".......kGk......"],
    // 2 Cây non
    [E, E, E,
     "......kkkk......",
     ".....kggggk.....",
     "....kgggggGk....",
     "...kgggggGGGk...",
     "...kggggGGGGk...",
     "....kgggGGGk....",
     ".....kkGGkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM],
    // 3 Ra hoa
    [E,
     "....kk....kk....",
     "...kppk..kppk...",
     "...kpypkkpypk...",
     "....kpkggkpk....",
     "....kggggggk....",
     "...kgggggGGGk...",
     "...kggggGGGGk...",
     "....kgggGGGk....",
     ".....kkGGkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM],
    // 4 Ra quả
    [".....kkkkkk.....",
     "....kggggggk....",
     "...kggrgggggk...",
     "..kggrrggggGGk..",
     "..kgggggrgGGGk..",
     "..kggggrrGGGGk..",
     "...kggggGGrGk...",
     "....kgGGGGGk....",
     ".....kkkkkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM, STEM]
  ];
  return { PAL: PAL, SPRITES: SPRITES };
})();
