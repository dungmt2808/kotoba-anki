// Bảng tạm cho ảnh phác 1.36 (nạp sau mock_136_art.js). Không thuộc add-on; dùng biến màu :root + nút kb-btn của add-on.
window.MKU = (function () {
  const CSS = `
.mk-hl { outline: 3px dashed #e0544e !important; outline-offset: 3px; }
.mk-tag { position: fixed; z-index: 9999; background: #e0544e; color: #fff; font: bold 13px "Noto Sans", sans-serif; padding: 3px 8px;
  border: 2px solid #8c2a26; white-space: nowrap; pointer-events: none; box-shadow: 2px 2px 0 rgba(0,0,0,.25); }
.mk-pop { position: fixed; z-index: 60; background: var(--kb-paper); border: 3px solid var(--kb-ink); box-shadow: 5px 5px 0 var(--kb-ink);
  color: var(--kb-ink); font-size: 14px; line-height: 1.4; }
.mk-head { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; border-bottom: 2px dashed var(--kb-line); background: var(--kb-butter); }
.mk-head b { font-size: 16px; } .mk-head .mk-sub { color: var(--kb-ink-2); font-size: 13px; } .mk-head .mk-sp { flex: 1; }
.mk-x0 { font-size: 15px; color: var(--kb-ink-2); }
.mk-body { display: flex; gap: 14px; padding: 12px; }
.mk-foot { padding: 7px 12px 9px; border-top: 2px dashed var(--kb-line-2); color: var(--kb-ink-2); font-size: 13px; }
.mk-doors { display: grid; grid-template-columns: repeat(6, 100px); gap: 8px; }
.mk-door { position: relative; height: 84px; border: 2px solid var(--kb-ink); display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; font-size: 13px; overflow: hidden; }
.mk-door .mk-n { position: absolute; left: 4px; top: 2px; font-weight: 700; font-size: 13px; }
.mk-door.is-shut { background: repeating-linear-gradient(135deg, #c8534b 0 10px, #b94740 10px 20px); color: #fff; }
.mk-door.is-shut.alt { background: repeating-linear-gradient(135deg, #3f7d4f 0 10px, #376f46 10px 20px); }
.mk-door.is-shut .mk-n { left: 0; right: 0; top: 24px; text-align: center; font-size: 24px; text-shadow: 2px 2px 0 rgba(0,0,0,.25); }
.mk-door.is-shut::after { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 6px; margin-left: -3px; background: #f2d36b; opacity: .85; }
.mk-door.is-shut.star { background: repeating-linear-gradient(135deg, #e9b949 0 10px, #dcab3b 10px 20px); color: #5b3a00; }
.mk-door.is-open { background: var(--kb-cream); }
.mk-door.is-open canvas { image-rendering: pixelated; }
.mk-door .mk-w { font-weight: 700; font-size: 15px; } .mk-door .mk-r { font-size: 11px; color: var(--kb-ink-2); margin-top: -3px; }
.mk-door .mk-own { white-space: nowrap; position: absolute; right: 3px; top: 2px; font-size: 10px; padding: 0 4px; border: 1px solid #b07a1a; background: #fff3c4; color: #7a4a00; }
.mk-door.is-today { background: #ffd23f; box-shadow: 0 0 0 3px #fff3c4, 0 0 0 6px #e9b949; z-index: 1; font-weight: 700; text-align: center; }
.mk-door.is-today .mk-n { font-size: 15px; }
.mk-door.is-miss { background: var(--kb-off-2); border-style: dashed; color: var(--kb-ink-2); text-align: center; font-size: 11px; padding: 12px 2px 0; gap: 1px; }
.mk-nw { white-space: nowrap; }
.mk-door .mk-own.mk-bot { top: auto; bottom: 3px; right: auto; left: 50%; transform: translateX(-50%); }
.mk-bar { width: 80px; height: 7px; border: 1px solid var(--kb-ink); background: #fff; } .mk-bar i { display: block; height: 100%; background: var(--kb-water); }
.mk-side { width: 230px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.mk-side canvas { border: 2px solid var(--kb-ink); image-rendering: pixelated; }
.mk-side .kb-btn { width: 100%; margin: 0; }
.mk-note { font-size: 12px; color: var(--kb-ink-2); }
.mk-sw { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--kb-ink); vertical-align: middle; margin-right: 3px; }
.mk-sw.is-on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--kb-ink); }
.mk-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mk-sel { display: inline-flex; align-items: center; gap: 6px; border: 2px solid var(--kb-ink); background: #fff; padding: 2px 8px; }
.mk-sel b { font-size: 16px; }
.mk-tip { position: fixed; z-index: 70; background: var(--kb-paper); border: 2px solid var(--kb-ink); box-shadow: 3px 3px 0 var(--kb-ink); padding: 5px 9px;
  font-size: 13px; line-height: 1.35; white-space: nowrap; }
.mk-tip b { font-size: 18px; }
.mk-px { display: inline-grid; width: max-content; align-self: flex-start; border: 2px solid var(--kb-ink); background: #fff; }
.mk-px i { display: block; border-right: 1px solid #e6dccd; border-bottom: 1px solid #e6dccd; }
.mk-tools { display: flex; gap: 6px; flex-wrap: wrap; }
.mk-tools .kb-btn.is-on, .mk-chip.is-on { background: #ffd23f; }
.mk-chip { display: inline-block; border: 2px solid var(--kb-ink); padding: 1px 8px; background: var(--kb-paper); font-size: 13px; }
.mk-card { position: relative; width: 210px; height: 290px; border: 3px solid var(--kb-ink); box-shadow: 3px 3px 0 var(--kb-ink); overflow: hidden; }
.mk-card canvas { position: absolute; image-rendering: pixelated; }
.mk-card .mk-mx { position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; font: 700 17px "Noto Sans", sans-serif; color: #fff;
  text-shadow: 2px 2px 0 #7a1f1f; letter-spacing: .5px; }
.mk-letter { width: 300px; min-height: 290px; border: 3px solid var(--kb-ink); background: #fffdf6;
  background-image: repeating-linear-gradient(#fffdf6 0 27px, #e9dcc6 27px 28px); padding: 6px 14px; font-size: 15px; line-height: 28px; }
.mk-letter .mk-sig { text-align: right; }
.mk-bubble { position: fixed; z-index: 65; background: #fff; border: 3px solid var(--kb-ink); padding: 5px 10px; font-size: 14px; line-height: 1.35; box-shadow: 3px 3px 0 rgba(0,0,0,.3); }
.mk-bubble::after { content: ""; position: absolute; left: 22px; bottom: -11px; border: 8px solid transparent; border-top-color: var(--kb-ink); border-bottom: 0; }
.mk-bubble b { font-size: 16px; }
.mk-globe { image-rendering: pixelated; }
.mk-mail { width: 360px; border: 3px solid var(--kb-ink); background: #fffdf6; padding: 10px 16px; font-size: 14px; line-height: 1.55; }
.mk-mail .mk-words { margin: 4px 0; font-size: 15px; letter-spacing: .3px; }
.mk-mail .mk-words span { display: inline-block; margin: 0 4px 3px 0; padding: 0 5px; background: #fff3c4; border: 1px solid #e0c46a; }
.mk-ghost-ptr { position: fixed; z-index: 66; width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 18px solid #fff;
  filter: drop-shadow(1px 1px 0 #000) drop-shadow(-1px -1px 0 #000); transform: rotate(-30deg); }
`;
  function ensureCss() { let s = document.getElementById("mk136-css"); if (!s) { s = document.createElement("style"); s.id = "mk136-css"; document.head.appendChild(s); } if (s.textContent !== CSS) { s.textContent = CSS; } }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (html !== undefined) { e.innerHTML = html; } return e; }
  function pop(id, x, y, w) {
    ensureCss();
    let p = document.getElementById(id); if (p) { p.remove(); }
    p = el("div", "mk-pop mk-x"); p.id = id; p.style.left = x + "px"; p.style.top = y + "px"; if (w) { p.style.width = w + "px"; }
    document.body.appendChild(p); return p;
  }
  function head(p, title, sub, right) {
    const h = p.appendChild(el("div", "mk-head"));
    h.innerHTML = "<b>" + title + "</b>" + (sub ? "<span class=\"mk-sub\">" + sub + "</span>" : "") + "<span class=\"mk-sp\"></span>" + (right ? "<span class=\"mk-sub\">" + right + "</span>" : "") + "<span class=\"mk-x0\">✕</span>";
    return h;
  }
  // nhãn đỏ cạnh một hình chữ nhật (toạ độ cửa sổ)
  function tagAt(x, y, text, cls) {
    ensureCss(); const t = el("div", "mk-tag mk-x" + (cls ? " " + cls : "")); t.textContent = text; document.body.appendChild(t);
    t.style.left = Math.max(4, Math.min(innerWidth - t.offsetWidth - 4, x)) + "px"; t.style.top = Math.max(4, y) + "px"; return t;
  }
  function tag(sel, text, side, dx, dy) {
    const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (!e) { return null; }
    e.classList.add("mk-hl");
    const r = e.getBoundingClientRect(), t = tagAt(0, 0, text), w = t.offsetWidth, h = t.offsetHeight;
    let x = r.left, y = r.top - h - 8;
    if (side === "bottom") { y = r.bottom + 8; }
    if (side === "left") { x = r.left - w - 10; y = r.top + (r.height - h) / 2; }
    if (side === "right") { x = r.right + 10; y = r.top + (r.height - h) / 2; }
    t.style.left = Math.max(4, Math.min(innerWidth - w - 4, x + (dx || 0))) + "px"; t.style.top = Math.max(4, Math.min(innerHeight - h - 4, y + (dy || 0))) + "px";
    return t;
  }
  function todayLine(text) {      // thêm một dòng vào thẻ Hôm nay (như dòng Tin làng)
    const list = document.querySelector(".kb-today-list"); if (!list) { return null; }
    let b = document.getElementById("mk-today-gift");
    if (!b) { b = el("button", "kb-quest-btn kb-news-btn mk-x"); b.id = "mk-today-gift"; b.type = "button"; list.insertBefore(b, list.firstChild); }
    GardenIcons.fill(b, text); return b;
  }
  return { ensureCss, el, pop, head, tag, tagAt, todayLine };
})();
