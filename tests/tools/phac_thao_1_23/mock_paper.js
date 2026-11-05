const fs = require('fs');
const { pages, Page, sleep } = require('/home/user/kotoba-anki/tests/anki/cdp');
const OUT = '/tmp/kb_mock/out';
async function py(code) { const r = await fetch('http://127.0.0.1:9444', { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
let page; const js = (e) => page.eval('(() => { ' + e + ' })()');
async function caption(text, tag) {
  await js(`document.querySelectorAll("[data-mock]").forEach((e) => e.remove());
    const c = document.createElement("div"); c.setAttribute("data-mock", "1");
    c.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483600;background:#1b1b2f;color:#fff2b3;font:15px 'Noto Sans CJK JP',sans-serif;padding:7px 14px";
    c.textContent = ${JSON.stringify(text)}; document.body.appendChild(c);
    const r = document.createElement("div"); r.setAttribute("data-mock", "1");
    r.style.cssText = "position:fixed;right:10px;top:8px;z-index:2147483600;background:#c21f3a;color:#fff;font:bold 13px 'Noto Sans CJK JP',sans-serif;padding:3px 10px;border:2px solid #1b1b2f";
    r.textContent = ${JSON.stringify(tag)}; document.body.appendChild(r);
    const s = document.createElement("style"); s.setAttribute("data-mock", "1"); s.textContent = "#kb-say{display:none!important} #kb-toast{display:none!important}"; document.head.appendChild(s); return 1;`);
}
(async () => {
  for (const info of (await pages(9333)).filter((i) => !['top toolbar', 'bottom toolbar', 'main webview'].includes(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    if (await p.eval('typeof GardenPaper !== "undefined"').catch(() => false)) { page = p; break; } p.close();
  }
  // bây giờ: đang dùng Gemini với "Giáo trình" (vì có pham_vi.json), trình độ bị khoá
  await py(KB + 'kb.save_config(bao_dir="/tmp/kb_mock_kit", bao_source="gemini", gemini_scope="auto", gemini_auto=False, gemini_wait_langs=[], gemini_langs=["ja"])\nkb._dialog.refresh()\nresult = 1');
  await sleep(2000);
  await js('GardenPaper.open("src"); return 1;'); await sleep(2200);
  await caption('BÂY GIỜ (1.22.8) · có pham_vi.json thì Gemini tự chọn "Giáo trình", Trình độ bị khoá · bấm "Dùng Gemini" khi đang dùng Claude Code là Gemini viết ngay', 'BÂY GIỜ');
  await sleep(400); await page.shot(OUT + '/6a_bay_gio_gemini.png');
  // phác thảo: vừa bấm "Dùng Gemini cho báo tiếng Nhật" → chờ "Bắt đầu viết", chỉ Mọi deck / Chọn deck
  await py(KB + 'kb.save_config(gemini_wait_langs=["ja"], gemini_scope="deck")\nkb._dialog.refresh()\nresult = 1');
  await sleep(1500);
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(2200);
  const r = await js(`const st = document.getElementById("kb-p-stage");
    Array.prototype.forEach.call(st.querySelectorAll("button"), (b) => { if (b.textContent.trim() === "Giáo trình") b.remove(); });
    Array.prototype.forEach.call(st.querySelectorAll(".kb-ai-hint"), (h) => { if (/theo giáo trình/.test(h.textContent)) h.remove(); });
    Array.prototype.forEach.call(st.querySelectorAll("button[disabled]"), (b) => { if (/^N[1-5]$/.test(b.textContent.trim())) b.disabled = false; });
    const wrap = st.querySelector(".kb-ai");
    const f = document.createElement("div"); f.className = "kb-ai-flash is-ok"; f.setAttribute("data-mock2", "1");
    f.textContent = "Đã chuyển báo tiếng Nhật sang Gemini. Chọn trình độ và deck rồi bấm “Bắt đầu viết”.";
    wrap.insertBefore(f, wrap.firstChild);
    return [st.querySelectorAll(".kb-ai-card").length, !!Array.prototype.find.call(st.querySelectorAll("button"), (b) => /Bắt đầu viết/.test(b.textContent))];`);
  console.log('thẻ, có nút Bắt đầu viết:', r);
  await caption('PHÁC THẢO 1.23 · vừa bấm "Dùng Gemini cho báo tiếng Nhật": chưa viết, chờ bấm "Bắt đầu viết" · Lấy từ chỉ còn Mọi deck / Chọn deck · Trình độ chọn được', 'PHÁC THẢO');
  await sleep(400); await page.shot(OUT + '/6b_phac_thao_gemini.png');
  await js('document.querySelectorAll("[data-mock], [data-mock2]").forEach((e) => e.remove()); GardenPaper.close(); return 1;');
  await py(KB + 'kb.save_config(bao_dir="", gemini_wait_langs=[], gemini_scope="auto")\nkb._dialog.refresh()\nresult = 1');
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
