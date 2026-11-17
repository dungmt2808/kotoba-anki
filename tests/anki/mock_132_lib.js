// Phần vẽ đè dùng chung cho ảnh phác 1.32 (mock_132.js nạp vào trang vườn).
var Mock132 = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const css = `
  .mk-hl { outline: 3px dashed #e0544e !important; outline-offset: 3px; }
  .mk-tag { position: fixed; z-index: 99999; background: #e0544e; color: #fff; font: bold 13px sans-serif; padding: 3px 8px; border-radius: 4px; }
  .mk-dd { position: absolute; z-index: 99999; background: var(--kb-paper, #fffaf0); border: 2px solid var(--kb-ink, #4a3426);
           border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,.25); font-size: 14px; min-width: 230px; padding: 4px 0; }
  .mk-dd div { padding: 5px 12px; white-space: nowrap; }
  .mk-dd div.on { background: var(--kb-ink, #4a3426); color: #fff; }
  .mk-dd small { opacity: .7; margin-left: 6px; }
  .mk-ruby rt { font-size: 11px; color: var(--kb-ink-2, #7a5a44); }
  `;
  function ensureCss() { if (!$("mk-css")) { const s = document.createElement("style"); s.id = "mk-css"; s.textContent = css; document.head.appendChild(s); } }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function clear() { document.querySelectorAll(".mk-x").forEach((e) => e.remove()); document.querySelectorAll(".mk-hl").forEach((e) => e.classList.remove("mk-hl")); }
  const LANG_ATTR = { ja: "ja", en: "en", zh: "zh-CN", ko: "ko", vi: "vi" };
  ensureCss();
  return { el: el, clear: clear, LANG_ATTR: LANG_ATTR, ensureCss: ensureCss };
})();
