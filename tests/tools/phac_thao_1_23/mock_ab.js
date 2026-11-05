// Dựng các màn phác thảo 1.23 ngay trong trang vườn thật (dùng nút, khung, chữ của chính add-on), chụp 1850 × 1130.
// Không sửa mã add-on: chỉ chèn DOM / CSS tạm vào trang đang chạy, mỗi màn tải lại vườn cho sạch.
const fs = require('fs');
const { pages, Page, sleep } = require('/home/user/kotoba-anki/tests/anki/cdp');
const M = '/tmp/kb_mock', OUT = M + '/out'; fs.mkdirSync(OUT, { recursive: true });
async function py(code) { const r = await fetch('http://127.0.0.1:9444', { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
let page;
const js = (e) => page.eval('(() => { ' + e + ' })()');
async function attach() {
  for (let k = 0; k < 30; k++) {
    for (const info of (await pages(9333)).filter((i) => !['top toolbar', 'bottom toolbar', 'main webview'].includes(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      if (await p.eval('typeof GardenHome !== "undefined" && !!document.getElementById("kb-yard")').catch(() => false)) { page = p; return; }
      p.close();
    }
    await sleep(500);
  }
  throw new Error('không thấy trang vườn');
}
async function fresh(scene) {        // làm mới vườn, trời 10 giờ nắng, không linh vật nói, không thông báo
  await py(KB + 'kb._dialog.refresh()\nresult = 1'); await sleep(1800);
  await js(`try { localStorage.setItem("kb-main-scene", "${scene || 'yard'}"); } catch (e) {}
    document.querySelectorAll("[data-mock]").forEach((e) => e.remove());
    const cv = document.getElementById("kb-yard"); cv.style.display = "";
    const s = document.createElement("style"); s.setAttribute("data-mock", "1"); s.textContent = "#kb-say{display:none!important} #kb-toast{display:none!important}"; document.head.appendChild(s);
    GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;`);
  await sleep(900);
}
async function caption(text) {
  await js(`const c = document.createElement("div"); c.setAttribute("data-mock", "1");
    c.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483600;background:#1b1b2f;color:#fff2b3;font:15px 'Noto Sans CJK JP',sans-serif;padding:7px 14px;letter-spacing:.2px";
    c.textContent = ${JSON.stringify(text)}; document.body.appendChild(c);
    const r = document.createElement("div"); r.setAttribute("data-mock", "1");
    r.style.cssText = "position:fixed;right:10px;top:8px;z-index:2147483600;background:#c21f3a;color:#fff;font:bold 13px 'Noto Sans CJK JP',sans-serif;padding:3px 10px;border:2px solid #1b1b2f";
    r.textContent = "PHÁC THẢO"; document.body.appendChild(r); return 1;`);
}
async function mainStrip(img, w, h, label) {   // thay canvas dải cảnh bằng hình dựng sẵn (phóng nguyên lần, không nhoè)
  await js(`const cv = document.getElementById("kb-yard"); cv.style.display = "none";
    const im = document.createElement("img"); im.setAttribute("data-mock", "1"); im.src = ${JSON.stringify(img)};
    im.style.cssText = "display:block;width:${w}px;height:${h}px;max-width:none;image-rendering:pixelated";
    cv.parentNode.insertBefore(im, cv); cv.parentNode.style.overflow = "hidden";
    const nav = document.getElementById("kb-yard-nav"); nav.hidden = false;
    document.getElementById("kb-yard-name").textContent = ${JSON.stringify(label)};
    const snap = document.getElementById("kb-yard-snap");
    const b = snap.cloneNode(false); b.setAttribute("data-mock", "1"); b.removeAttribute("id"); b.textContent = "Ngắm  V";
    b.style.cssText = "width:auto;padding:0 10px;font-size:13px"; snap.parentNode.insertBefore(b, snap.nextSibling); return 1;`);
}
async function viewer(img, w, h, scene, opts = {}) {   // bảng Nhà bỏ phần cửa hàng = màn Ngắm cảnh
  await js(`GardenHome.open(${JSON.stringify(scene)}); return 1;`); await sleep(1300);
  await js(`const st = document.createElement("style"); st.setAttribute("data-mock", "1");
    st.textContent = ".kb-h-shop{display:none!important} .kb-h-view{height:calc(100vh - 205px)!important;display:flex!important;align-items:center;justify-content:center;gap:18px} #kb-home-canvas{display:none!important}";
    document.head.appendChild(st);
    const home = document.getElementById("kb-home");
    home.querySelector(".kb-g-title").textContent = "おうち · Ngắm cảnh";
    home.querySelector(".kb-g-hud").style.display = "none";
    const snap = document.getElementById("kb-h-snap");
    const b = document.createElement("button"); b.type = "button"; b.className = "kb-btn kb-btn-small${opts.arranging ? ' is-on' : ''}"; b.setAttribute("data-mock", "1");
    b.textContent = ${JSON.stringify(opts.arranging ? 'Xong' : 'Sắp xếp đồ')}; if (${!!opts.arranging}) b.style.background = "#ffd23f";
    snap.parentNode.insertBefore(b, snap);
    const view = home.querySelector(".kb-h-view");
    const box = document.createElement("div"); box.setAttribute("data-mock", "1"); box.style.cssText = "position:relative;line-height:0;border:3px solid #1b1b2f";
    const im = document.createElement("img"); im.src = ${JSON.stringify(img)}; im.style.cssText = "display:block;width:${w}px;height:${h}px;image-rendering:pixelated";
    box.appendChild(im); view.insertBefore(box, view.firstChild);
    const tip = document.getElementById("kb-h-tip"); tip.style.cssText = "position:absolute;left:0;right:0;bottom:4px;text-align:center"; tip.textContent = ${JSON.stringify(opts.tip || '◂ ▸ hoặc phím mũi tên: đổi cảnh · bấm thú nuôi để vuốt ve · bấm một món đồ để xem tên · V / Esc: thoát')};
    view.style.position = "relative"; return 1;`);
  if (opts.after) await opts.after();
}
async function snapTo(name) { await sleep(400); await page.shot(OUT + '/' + name + '.png'); console.log('  ', name); }

(async () => {
  await attach();
  await py(KB + 'kb._dialog.resize(1850, 1130)\nd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Tiếng Nhật"); d.refresh()\nresult = 1');
  await sleep(2500);
  if (process.env.ONLY_B) { await fresh('yard'); } else {
  await fresh('yard');
  await mainStrip(uri(M + '/build/room_A_cutaway_x4.png'), 453 * 4, 88 * 4, 'Trong nhà · 2 / 9');
  await caption('HƯỚNG A · nhà búp bê giữa sân: căn phòng là mặt cắt của ngôi nhà, hai bên là sân thật (trời, đồi, cỏ, đổi theo giờ / mùa / thời tiết) · không cần dữ liệu mới');
  await snapTo('7a_huong_A_nha_bup_be');
  }
  await fresh('yard');
  await mainStrip(uri(M + '/build/room_B_3gian_x4.png'), 453 * 4, 88 * 4, 'Trong nhà · 2 / 9');
  await js(`const wrap = document.getElementById("kb-yard").parentNode; const img = wrap.querySelector("img[data-mock]");
    const r = img.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    const mk = (left, width, html) => { const d = document.createElement("div"); d.setAttribute("data-mock", "1"); d.innerHTML = html;
      d.style.cssText = "position:absolute;top:" + (r.top - w.top + 150) + "px;left:" + left + "px;width:" + width + "px;text-align:center;z-index:5;pointer-events:none"; wrap.appendChild(d); };
    if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
    const S = 4, x0 = (453 - 160) / 2;
    const tw = document.getElementById("kb-today"), tr = tw ? tw.getBoundingClientRect() : null;
    const rx = (x0 + 163) * S, rw = (tr ? tr.left - w.left - 16 : (453 * S)) - rx;
    const d = document.createElement("div"); d.setAttribute("data-mock", "1");
    d.innerHTML = "<div class='kb-btn' style='display:inline-block;background:#ffd23f;padding:8px 14px;font-size:15px'>Phòng ngủ · Mở rộng nhà · 2.000 xu</div>";
    d.style.cssText = "position:absolute;top:" + (r.top - w.top + 268) + "px;left:" + rx + "px;width:" + rw + "px;text-align:center;z-index:5;pointer-events:none";
    wrap.appendChild(d);
    return 1;`);
  await caption('HƯỚNG B · nhà 3 gian: hai bên là hai phòng thật (Bếp, Phòng ngủ), mua "Mở rộng nhà" rồi bày đồ như phòng chính; gian chưa mở thì tối lại · thêm chỗ tiêu xu, cần khoá dữ liệu mới');
  await snapTo('7b_huong_B_nha_3_gian');
  await fresh('yard');
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
