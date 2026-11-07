/* ことば畑 – nhạc nền 8-bit tự soạn, phát bằng WebAudio (không cần file nhạc).
   3 bản: vườn (nhẹ nhàng), mini-game (nhanh, vui), nhà (hộp nhạc ấm áp)
   + mỗi giao diện Mùa & Lễ hội một bản vườn riêng (1.8: Giáng sinh, Tết, Halloween; 1.18: 11 chủ đề còn lại).
   Tự im khi đang ôn thẻ và khi chơi "Nghe tìm cây" để không lấn tiếng audio. */
var GardenMusic = (function () {
  "use strict";

  const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function midi(n) { const m = /^([A-G]#?)(-?\d)$/.exec(n); return (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]]; }

  // "E5:4 G5:4 -:4" → [{s: bước bắt đầu, m: midi, len}] (1 bước = nốt móc kép)
  function melody(str) {
    const out = []; let t = 0;
    str.trim().split(/\s+/).forEach((tok) => {
      const [n, l] = tok.split(":");
      const len = parseInt(l, 10);
      if (n !== "-") { out.push({ s: t, m: midi(n), len: len }); }
      t += len;
    });
    return { notes: out, len: t };
  }

  const CHORD = { C: [48, [0, 4, 7]], Dm: [50, [0, 3, 7]], Em: [52, [0, 3, 7]], F: [41, [0, 4, 7]], G: [43, [0, 4, 7]], Am: [45, [0, 3, 7]],
    E: [40, [0, 4, 7]],
    // 1.18: thêm hợp âm cho các bản theo mùa
    D: [50, [0, 4, 7]], A: [45, [0, 4, 7]], Bb: [46, [0, 4, 7]], Eb: [39, [0, 4, 7]], Gm: [43, [0, 3, 7]], Cm: [48, [0, 3, 7]],
    Bm: [47, [0, 3, 7]], "F#m": [42, [0, 3, 7]] };

  // Dựng bè bass + rải hợp âm từ danh sách hợp âm (mỗi ô một ô nhịp; mảng = chia đôi ô nhịp).
  function harmony(chords, bassStyle, arpOn) {
    const bass = [], arp = [];
    chords.forEach((c, bar) => {
      const halves = Array.isArray(c) ? c : [c, c];
      halves.forEach((name, h) => {
        const [root, tri] = CHORD[name];
        const s0 = bar * 16 + h * 8;
        if (bassStyle === "quarter") {
          bass.push({ s: s0, m: root, len: 4 }, { s: s0 + 4, m: root + 7, len: 4 });
        } else if (bassStyle === "bounce") {
          for (let k = 0; k < 4; k++) { bass.push({ s: s0 + k * 2, m: root + (k % 2 ? 12 : 0), len: 2 }); }
        } else {
          bass.push({ s: s0, m: root, len: 8 });
        }
        if (arpOn) {
          let base = root; while (base < 57) { base += 12; }
          const seq = [0, 1, 2, 1];
          for (let k = 0; k < 4; k++) { arp.push({ s: s0 + k * 2, m: base + tri[seq[k]], len: 2 }); }
        }
      });
    });
    return { bass: bass, arp: arp };
  }

  function drums(pattern, bars) {
    const out = [];
    for (let b = 0; b < bars; b++) {
      for (let i = 0; i < 16; i++) { if (pattern.charAt(i) === "x") { out.push({ s: b * 16 + i }); } }
    }
    return out;
  }

  function track(def) {
    const lead = melody(def.lead);
    const h = harmony(def.chords, def.bass, def.arp);
    const bars = lead.len / 16;
    return {
      bpm: def.bpm, len: lead.len, leadType: def.leadType, echo: def.echo,
      vol: def.vol,
      pluck: !!def.pluck, bars: bars, chords: def.chords.length,
      voices: {
        lead: lead.notes, bass: h.bass, arp: h.arp,
        kick: def.kick ? drums(def.kick, bars) : [], snare: def.snare ? drums(def.snare, bars) : [],
        hat: def.hat ? drums(def.hat, bars) : [], wood: def.wood ? drums(def.wood, bars) : []
      }
    };
  }

  const TRACKS = {
    garden: track({
      bpm: 92, leadType: "square", bass: "quarter", arp: true, echo: false,
      vol: { lead: 0.07, bass: 0.13, arp: 0.035, hat: 0.018 },
      lead: "E5:4 G5:4 A5:4 G5:4  E5:4 D5:4 C5:8  D5:4 E5:4 G5:4 E5:4  D5:12 -:4 " +
            "E5:4 G5:4 A5:4 C6:4  A5:4 G5:4 E5:8  D5:4 E5:2 D5:2 C5:4 A4:4  C5:12 -:4",
      chords: ["C", "Am", "Dm", "G", "C", "Am", "F", "C"],
      hat: "..x...x...x...x."
    }),
    game: track({
      bpm: 138, leadType: "square", bass: "bounce", arp: false, echo: false,
      vol: { lead: 0.065, bass: 0.12, kick: 0.22, snare: 0.06, hat: 0.02 },
      lead: "C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:2 G5:2  A5:2 F5:2 A5:2 C6:2 A5:4 -:4 " +
            "G5:2 E5:2 G5:2 B5:2 D6:2 B5:2 G5:2 B5:2  C6:4 G5:4 E5:4 -:4 " +
            "E5:2 G5:2 E5:2 C5:2 D5:2 F5:2 D5:2 B4:2  C5:2 E5:2 G5:2 E5:2 F5:4 A5:4 " +
            "G5:2 F5:2 E5:2 D5:2 E5:2 F5:2 G5:2 B5:2  C6:6 -:2 G5:2 E5:2 C5:4",
      chords: ["C", "F", "G", "C", ["C", "G"], ["C", "F"], "G", "C"],
      kick: "x...x...x...x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x."
    }),
    home: track({
      bpm: 80, leadType: "triangle", bass: "half", arp: true, echo: true,
      vol: { lead: 0.16, bass: 0.12, arp: 0.05 },
      lead: "G5:4 E5:4 C5:4 E5:4  F5:4 A5:4 G5:8  E5:4 G5:4 C6:4 B5:4  A5:8 G5:8 " +
            "F5:4 A5:4 G5:4 E5:4  D5:4 F5:4 E5:8  D5:4 E5:4 F5:4 B4:4  C5:16",
      chords: ["C", "F", "C", ["F", "C"], "F", ["Dm", "C"], "G", "C"]
    }),
    // ---- 1.8: nhạc vườn theo Mùa & Lễ hội (giai điệu tự soạn) ----
    noel: track({        // Giáng sinh: tiếng chuông xe tuần lộc (hat đều) + giai điệu vui
      bpm: 120, leadType: "square", bass: "quarter", arp: true, echo: false,
      vol: { lead: 0.065, bass: 0.12, arp: 0.03, hat: 0.024 },
      lead: "G5:2 G5:2 E5:4 G5:4 C6:4  B5:4 A5:4 G5:8  A5:2 A5:2 F5:4 A5:4 D6:4  C6:4 B5:4 A5:8 " +
            "G5:4 E5:2 G5:2 C6:4 E6:4  D6:4 C6:4 A5:4 B5:4  C6:4 G5:4 E5:4 D5:4  C5:12 -:4",
      chords: ["C", "G", "F", "Am", "C", ["Dm", "G"], ["C", "G"], "C"],
      hat: "x.x.x.x.x.x.x.x."
    }),
    tet: track({         // Tết: ngũ cung, trống múa lân
      bpm: 112, leadType: "square", bass: "quarter", arp: false, echo: false,
      vol: { lead: 0.07, bass: 0.12, kick: 0.17, snare: 0.05, hat: 0.016 },
      lead: "C5:2 D5:2 E5:2 G5:2 A5:4 G5:4  E5:2 G5:2 A5:2 C6:2 D6:4 C6:4  A5:2 G5:2 E5:2 G5:2 A5:2 C6:2 A5:4  G5:8 -:4 E5:2 G5:2 " +
            "A5:4 A5:2 G5:2 E5:4 D5:4  E5:2 G5:2 A5:2 G5:2 E5:4 D5:4  C5:2 D5:2 E5:2 G5:2 D5:4 E5:4  C5:12 -:4",
      chords: ["C", "C", "Am", "G", "F", "C", ["Am", "G"], "C"],
      kick: "x.......x.x.....", snare: "....x.......x...", hat: "..x...x...x...x."
    }),
    halloween: track({   // Halloween: La thứ, hơi rùng rợn mà vẫn dễ thương
      bpm: 96, leadType: "triangle", bass: "half", arp: true, echo: true,
      vol: { lead: 0.15, bass: 0.12, arp: 0.04 },
      lead: "A4:4 C5:4 E5:4 D#5:4  E5:4 C5:4 A4:8  G4:4 B4:4 D5:4 C#5:4  D5:4 B4:4 G4:8 " +
            "A4:2 C5:2 E5:2 A5:2 G#5:4 E5:4  F5:4 D5:4 B4:4 G#4:4  A4:4 E5:4 C5:4 B4:4  A4:12 -:4",
      chords: ["Am", "Am", "G", "G", "Am", ["Dm", "E"], ["Am", "E"], "Am"]
    }),
    // ---- 1.18: mỗi chủ đề còn lại một bản (giai điệu tự soạn, các lễ Nhật dùng thang âm Nhật) ----
    //   pluck: tiếng gảy ngắn kiểu đàn koto / shamisen · leadType "bell": chuông (sine + bội âm) · wood: mõ gỗ
    spring: track({      // Mùa xuân: Sol trưởng, nhún nhảy như chồi non
      bpm: 104, leadType: "square", bass: "quarter", arp: true, echo: false,
      vol: { lead: 0.065, bass: 0.12, arp: 0.03, hat: 0.016 },
      lead: "G5:4 B5:2 D6:2 B5:4 G5:4  A5:2 B5:2 C6:4 E6:4 C6:4  D6:4 C6:2 B5:2 A5:4 F#5:4  G5:8 -:4 D5:4 " +
            "E5:2 G5:2 B5:4 A5:2 G5:2 E5:4  C6:4 B5:2 A5:2 G5:4 E5:4  A5:2 B5:2 C6:2 A5:2 F#5:4 A5:4  G5:12 -:4",
      chords: ["G", "C", "D", "G", "Em", "C", ["Am", "D"], "G"],
      hat: "..x...x...x...x."
    }),
    summer: track({      // Mùa hè: thang Ryukyu (Đô Mi Fa Sol Si), gảy như đàn sanshin ngoài biển
      bpm: 100, leadType: "square", bass: "quarter", arp: false, echo: false, pluck: true,
      vol: { lead: 0.075, bass: 0.12, kick: 0.15, hat: 0.016, wood: 0.05 },
      lead: "E5:2 F5:2 G5:4 B5:2 C6:2 B5:2 G5:2  F5:4 G5:2 F5:2 E5:4 C5:4  B4:2 C5:2 E5:2 F5:2 G5:4 F5:2 E5:2  C5:8 -:4 G4:4 " +
            "C5:2 E5:2 G5:2 C6:2 B5:4 G5:4  F5:2 G5:2 F5:2 E5:2 F5:4 G5:4  B5:4 C6:2 B5:2 G5:2 F5:2 E5:4  C5:12 -:4",
      chords: ["C", "F", "G", "C", "C", "F", ["G", "C"], "C"],
      kick: "x.....x...x.....", hat: "..x...x...x...x.", wood: "....x.......x..x"
    }),
    autumn: track({      // Mùa thu: La thứ, chậm, hơi bâng khuâng
      bpm: 84, leadType: "triangle", bass: "half", arp: true, echo: true,
      vol: { lead: 0.15, bass: 0.12, arp: 0.045 },
      lead: "E5:4 A5:4 G5:2 E5:2 C5:4  D5:2 E5:2 F5:4 A5:4 G5:4  E5:4 G5:4 C6:4 B5:2 A5:2  B5:8 G5:4 -:4 " +
            "A5:4 F5:2 E5:2 D5:4 F5:4  E5:4 C5:4 A4:4 C5:4  D5:2 E5:2 F5:4 E5:2 D5:2 G#4:4  A4:12 -:4",
      chords: ["Am", "F", "C", "G", "Dm", "Am", ["F", "E"], "Am"]
    }),
    winter: track({      // Mùa đông: Fa trưởng, chuông nhỏ như tuyết rơi
      bpm: 76, leadType: "bell", bass: "half", arp: true, echo: true,
      vol: { lead: 0.15, bass: 0.13, arp: 0.045 },
      lead: "C6:4 A5:4 F5:4 A5:4  E6:6 D6:2 C6:8  D6:4 F6:4 D6:4 A#5:4  C6:8 G5:4 -:4 " +
            "A5:4 D6:4 F6:4 E6:4  D6:4 C6:2 A#5:2 A5:4 F5:4  G5:4 A#5:4 A5:2 G5:2 E5:4  F5:12 -:4",
      chords: ["F", "Am", "Bb", "C", "Dm", "Bb", ["Gm", "C"], "F"]
    }),
    hanami: track({      // Hoa anh đào: thang miyako-bushi (Mi Fa La Si Đô), gảy như đàn koto
      bpm: 88, leadType: "triangle", bass: "half", arp: true, echo: true, pluck: true,
      vol: { lead: 0.19, bass: 0.12, arp: 0.042 },
      lead: "A5:4 B5:4 C6:4 B5:2 A5:2  F5:4 A5:4 E5:8  E5:2 F5:2 A5:4 B5:4 C6:4  B5:12 -:4 " +
            "A5:4 C6:4 E6:4 C6:2 B5:2  A5:4 B5:2 A5:2 F5:4 E5:4  F5:2 A5:2 B5:4 B5:2 A5:2 G#5:4  A5:12 -:4",
      chords: ["Am", "F", "Am", "E", "Am", "F", ["Dm", "E"], "Am"]
    }),
    tsuyu: track({       // Mùa mưa: Rê thứ, chậm, tiếng mưa tí tách
      bpm: 72, leadType: "triangle", bass: "half", arp: true, echo: true,
      vol: { lead: 0.15, bass: 0.11, arp: 0.04, hat: 0.012 },
      lead: "A5:4 F5:4 D5:4 F5:4  A#5:6 A5:2 F5:8  C6:4 A5:4 F5:2 G5:2 A5:4  G5:8 E5:4 -:4 " +
            "D6:4 A#5:4 G5:4 A#5:4  A5:4 F5:2 E5:2 D5:4 F5:4  E5:4 C#5:4 E5:4 A5:4  D5:12 -:4",
      chords: ["Dm", "Bb", "F", "C", "Gm", "Dm", "A", "Dm"],
      hat: "x..x.x....x..x.."
    }),
    tanabata: track({    // Thất Tịch: Rê trưởng, chuông lấp lánh như sao
      bpm: 96, leadType: "bell", bass: "half", arp: true, echo: true,
      vol: { lead: 0.13, bass: 0.12, arp: 0.042 },
      lead: "F#5:2 A5:2 D6:4 C#6:2 B5:2 A5:4  B5:4 D6:4 F#6:4 E6:4  D6:2 B5:2 G5:4 A5:2 B5:2 D6:4  C#6:8 A5:4 -:4 " +
            "B5:4 G5:2 A5:2 B5:4 D6:4  A5:4 F#5:2 G5:2 A5:4 D6:4  E6:4 D6:2 C#6:2 B5:2 C#6:2 E6:4  D6:12 -:4",
      chords: ["D", "Bm", "G", "A", "G", "D", ["Em", "A"], "D"]
    }),
    natsumatsuri: track({   // Lễ hội mùa hè: thang yo (Rê Mi Sol La Si), trống taiko + mõ gỗ
      bpm: 126, leadType: "square", bass: "quarter", arp: false, echo: false,
      vol: { lead: 0.065, bass: 0.12, kick: 0.2, snare: 0.05, wood: 0.055 },
      lead: "D5:2 E5:2 G5:2 A5:2 B5:4 A5:4  G5:2 A5:2 B5:2 D6:2 E6:4 D6:4  E6:2 D6:2 B5:2 A5:2 G5:4 E5:4  D5:4 E5:2 G5:2 A5:8 " +
            "B5:2 B5:2 A5:2 G5:2 A5:4 B5:4  D6:4 B5:2 A5:2 G5:4 E5:4  E5:2 G5:2 A5:2 B5:2 A5:2 G5:2 E5:4  G5:8 -:2 D5:2 G5:4",
      chords: ["G", "Em", "C", "D", "G", "Em", ["Am", "D"], "G"],
      kick: "x..x..x.x.......", snare: "....x.......x..x", wood: "..x...x...x..x.x"
    }),
    tsukimi: track({     // Trung thu · Ngắm trăng: ngũ cung, thong thả dưới trăng
      bpm: 84, leadType: "triangle", bass: "half", arp: true, echo: true,
      vol: { lead: 0.15, bass: 0.11, arp: 0.04, wood: 0.03 },
      lead: "E5:4 G5:4 A5:4 B5:4  G5:4 E5:2 D5:2 E5:8  D5:4 G5:4 B5:4 D6:4  A5:8 B5:2 A5:2 -:4 " +
            "E6:4 D6:4 B5:4 A5:4  B5:4 A5:2 G5:2 E5:4 D5:4  E5:4 G5:4 A5:2 B5:2 A5:4  E5:12 -:4",
      chords: ["Em", "C", "G", "D", "Em", "G", ["Am", "D"], "Em"],
      wood: "x.......x......."
    }),
    momiji: track({      // Mùa lá đỏ: thang in (Rê Mi♭ Sol La Si♭), gảy như đàn shamisen
      bpm: 92, leadType: "square", bass: "quarter", arp: false, echo: true, pluck: true,
      vol: { lead: 0.085, bass: 0.135, hat: 0.014, wood: 0.045 },
      lead: "G5:2 A5:2 A#5:4 A5:2 G5:2 D5:4  D#5:4 G5:4 A#5:4 G5:4  C6:4 A#5:2 A5:2 G5:4 D#5:4  D5:8 A5:4 -:4 " +
            "A#5:2 C6:2 D6:4 C6:2 A#5:2 A5:4  G5:4 D#5:4 D5:2 D#5:2 G5:4  D#5:4 G5:2 A5:2 F#5:4 A5:4  G5:12 -:4",
      chords: ["Gm", "Eb", "Cm", "D", "Gm", "Eb", ["Cm", "D"], "Gm"],
      hat: "..x...x...x...x.", wood: "x.......x..x...."
    }),
    shogatsu: track({    // Năm mới Nhật Bản: thang yo trên La trưởng, koto + mõ gỗ trang trọng
      bpm: 100, leadType: "triangle", bass: "half", arp: true, echo: true, pluck: true,
      vol: { lead: 0.17, bass: 0.11, arp: 0.035, wood: 0.05 },
      lead: "E5:4 F#5:2 A5:2 B5:4 A5:4  F#5:4 A5:4 B5:2 C#6:2 B5:4  A5:2 B5:2 C#6:4 E6:4 C#6:4  B5:8 -:4 E5:4 " +
            "F#5:4 E5:2 F#5:2 A5:4 B5:4  C#6:4 B5:2 A5:2 F#5:4 E5:4  F#5:2 A5:2 B5:4 C#6:2 B5:2 A5:2 F#5:2  A5:12 -:4",
      chords: ["A", "D", "F#m", "E", "D", "A", ["Bm", "E"], "A"],
      wood: "x...........x.x."
    })
  };
  // Bản nhạc vườn của từng giao diện mùa (1.18: đủ 14 chủ đề; chủ đề không có trong bảng → bản vườn thường)
  const THEME_TRACK = { noel: "noel", tet: "tet", halloween: "halloween", spring: "spring", summer: "summer", autumn: "autumn",
    winter: "winter", hanami: "hanami", tsuyu: "tsuyu", tanabata: "tanabata", natsumatsuri: "natsumatsuri", tsukimi: "tsukimi",
    momiji: "momiji", shogatsu: "shogatsu" };
  function season() { return typeof GardenSeason !== "undefined" && GardenSeason ? GardenSeason : null; }
  function trackFor(sc) {
    const base = SCENE_TRACK[sc], sea = season();
    // 1.18: bấm "Xem thử" một chủ đề trong Nhà → phát luôn nhạc của chủ đề đó (thôi xem thử → lại hộp nhạc của nhà)
    const pv = sea && sea.previewing ? sea.previewing() : null;
    if (pv && THEME_TRACK[pv] && (sc === "home" || sc === "garden")) { return THEME_TRACK[pv]; }
    if (base !== "garden") { return base; }
    const th = sea ? sea.current() : null;
    return (th && THEME_TRACK[th]) || base;
  }

  // ---------------------------------------------------------------------
  let ac = null, master = null, bus = null, echoIn = null, noiseBuf = null;
  let enabled = true, volume = 0.5, scene = "garden", playing = null;
  let step = 0, nextTime = 0, timer = null, prefLoaded = false, cfgDefault = true;
  const index = {};   // track -> voice -> step -> [notes]

  function loadPref() {
    if (prefLoaded) { return; }
    prefLoaded = true;
    try {
      const m = localStorage.getItem("kb-music");
      if (m === "0" || m === "1") { enabled = m === "1"; } else { enabled = cfgDefault; }
      const v = parseFloat(localStorage.getItem("kb-music-vol"));
      if (!isNaN(v)) { volume = Math.max(0, Math.min(1, v)); }
    } catch (e) { enabled = cfgDefault; }
  }

  function buildIndex(name) {
    if (index[name]) { return index[name]; }
    const t = TRACKS[name], out = {};
    Object.keys(t.voices).forEach((v) => {
      out[v] = {};
      t.voices[v].forEach((n) => { (out[v][n.s] = out[v][n.s] || []).push(n); });
    });
    index[name] = out;
    return out;
  }

  function buildGraph(ctx) {
    ac = ctx;
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    bus = ac.createGain(); bus.gain.value = 1; bus.connect(master);
    // tiếng vọng nhẹ cho bản "nhà"
    const delay = ac.createDelay(1.0); delay.delayTime.value = 0.36;
    const fb = ac.createGain(); fb.gain.value = 0.28;
    const wet = ac.createGain(); wet.gain.value = 0.35;
    echoIn = ac.createGain();
    echoIn.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { d[i] = Math.random() * 2 - 1; }
  }
  function ensureAudio() {
    if (ac) { return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return false; }
    try { buildGraph(new AC()); return true; } catch (e) { ac = null; return false; }
  }

  // Cho test: dựng một vòng của bản `name` lên OfflineAudioContext (đo độ to, không phát ra loa).
  function offline(ctx, name) {
    const keep = [ac, master, bus, echoIn, noiseBuf, playing, step, nextTime];
    try {
      buildGraph(ctx);
      master.gain.value = 0.3;
      playing = name; step = 0; nextTime = 0.05;
      const t = TRACKS[name];
      for (let i = 0; i < t.len; i++) { schedule(true); }
    } finally {
      [ac, master, bus, echoIn, noiseBuf, playing, step, nextTime] = keep;
    }
  }

  function tone(type, freq, t, dur, vol, echo, pluck) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    if (pluck) {   // tiếng gảy: tắt nhanh, đuôi ngắn (koto / shamisen / sanshin)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.3), t + Math.min(dur, 0.09));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 0.95, 0.55));
    } else {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.55), t + Math.min(dur, 0.12));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
    }
    o.connect(g); g.connect(bus);
    if (echo && echoIn) { g.connect(echoIn); }
    o.start(t); o.stop(t + dur + 0.02);
  }
  function bell(freq, t, dur, vol, echo) {   // chuông: nốt chính + bội âm quãng tám tắt nhanh
    tone("sine", freq, t, dur, vol, echo, true);
    tone("triangle", freq * 2, t, Math.min(dur, 0.3), vol * 0.35, echo, true);
  }
  function wood(t, vol) {                    // mõ gỗ: tiếng "cốc" ngắn
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.05);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.09);
  }
  function kick(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.18);
  }
  function noise(t, vol, dur, type, f) {
    const s = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; flt.type = type; flt.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }

  function schedule(once) {
    if (!ac || !playing) { return; }
    const t = TRACKS[playing], idx = buildIndex(playing), v = t.vol;
    const sd = 60 / t.bpm / 4;
    if (!once && nextTime < ac.currentTime) { nextTime = ac.currentTime + 0.05; }
    while (once === true || nextTime < ac.currentTime + 0.2) {
      const at = nextTime;
      (idx.lead[step] || []).forEach((n) => {
        if (t.leadType === "bell") { bell(mtof(n.m), at, n.len * sd, v.lead, t.echo); }
        else { tone(t.leadType, mtof(n.m), at, n.len * sd, v.lead, t.echo, t.pluck); }
      });
      (idx.bass[step] || []).forEach((n) => tone("triangle", mtof(n.m), at, n.len * sd * 0.9, v.bass));
      if (v.arp) { (idx.arp[step] || []).forEach((n) => tone(t.echo ? "triangle" : "sine", mtof(n.m), at, n.len * sd * 0.8, v.arp, t.echo)); }
      if (v.kick && idx.kick[step]) { kick(at, v.kick); }
      if (v.snare && idx.snare[step]) { noise(at, v.snare, 0.12, "bandpass", 1800); }
      if (v.hat && idx.hat[step]) { noise(at, v.hat, 0.04, "highpass", 7000); }
      if (v.wood && idx.wood[step]) { wood(at, v.wood); }
      nextTime += sd;
      step = (step + 1) % t.len;
      if (once === true) { break; }
    }
  }

  const SCENE_TRACK = { garden: "garden", game: "game", home: "home", review: null, listen: null };

  function targetGain() { return enabled && SCENE_TRACK[scene] ? volume * 0.6 : 0; }

  function apply() {
    loadPref();
    const want = enabled ? trackFor(scene) : null;
    if (!want) {
      if (ac && playing) {
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(0, ac.currentTime, 0.12);
        const was = playing;
        setTimeout(() => { if (playing === was && !(enabled && SCENE_TRACK[scene])) { stopLoop(); } }, 600);
      }
      return;
    }
    if (!ensureAudio()) { return; }
    if (ac.state === "suspended") { ac.resume().catch(() => {}); }
    if (playing !== want) {
      const fadeOut = playing ? 0.35 : 0;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      setTimeout(() => {
        if (!(enabled && trackFor(scene) === want)) { return; }
        playing = want; step = 0; nextTime = ac.currentTime + 0.08;
        if (!timer) { timer = setInterval(schedule, 40); }
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setTargetAtTime(targetGain(), ac.currentTime, 0.4);
      }, fadeOut * 1000);
    } else {
      if (!timer) { timer = setInterval(schedule, 40); }
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(targetGain(), ac.currentTime, 0.3);
    }
  }

  function stopLoop() {
    playing = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người dùng.
  function unlock() {
    loadPref();
    if (enabled && SCENE_TRACK[scene]) { apply(); }
    else if (ac && ac.state === "suspended") { ac.resume().catch(() => {}); }
  }
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  window.addEventListener("focus", () => { if (ac && ac.state === "suspended" && enabled && SCENE_TRACK[scene]) { ac.resume().catch(() => {}); } });
  document.addEventListener("visibilitychange", () => {
    if (!ac) { return; }
    if (document.hidden) { ac.suspend().catch(() => {}); } else if (enabled) { ac.resume().catch(() => {}); }
  });

  return {
    config: function (fx) {
      if (!fx) { return; }
      cfgDefault = fx.music !== false;
      if (typeof fx.music_volume === "number" && !prefLoaded) { volume = Math.max(0, Math.min(1, fx.music_volume)); }
      loadPref();
      // Mở vườn là có nhạc luôn, không chờ bấm / gõ phím lần đầu. Python đã tắt yêu cầu
      // "phải có thao tác mới phát" cho trang này; nếu trình duyệt vẫn chặn thì AudioContext
      // ở trạng thái "suspended" và unlock() bên dưới sẽ bật lại ở thao tác đầu tiên.
      if (enabled && SCENE_TRACK[scene] && (!playing || (ac && ac.state === "suspended"))) { apply(); }
    },
    setScene: function (s) {
      if (s === scene) { return; }
      scene = s;
      if (ac || enabled) { apply(); }
    },
    scene: () => scene,
    // đổi giao diện mùa / bấm "Xem thử" → đổi bản nhạc (1.18: không cần nhạc đã chạy trước đó)
    themeChanged: function () { loadPref(); if (enabled || playing) { apply(); } },
    trackFor: trackFor,
    themeTrack: (id) => THEME_TRACK[id] || null,
    enabled: () => { loadPref(); return enabled; },
    volume: () => volume,
    setEnabled: function (on) {
      loadPref();
      enabled = !!on;
      try { localStorage.setItem("kb-music", enabled ? "1" : "0"); } catch (e) { /* bỏ qua */ }
      apply();
    },
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      try { localStorage.setItem("kb-music-vol", String(volume)); } catch (e) { /* bỏ qua */ }
      if (ac && master) { master.gain.setTargetAtTime(targetGain(), ac.currentTime, 0.1); }
    },
    // cho test
    _state: () => ({ scene: scene, playing: playing, enabled: enabled, volume: volume, ctx: ac ? ac.state : null,
      gain: master ? master.gain.value : null, step: step }),
    _tracks: TRACKS, _offline: offline
  };
})();
