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

  // 0. bây giờ (để so)
  await fresh('yard'); await caption('BÂY GIỜ (1.22.8) · màn chính: dải cảnh chỉ có sân và các vùng ngoài trời; "Trong nhà" chỉ xem được trong Nhà & Cửa hàng');
  await js('document.querySelector("[data-mock] + [data-mock]") && 1; document.querySelectorAll("[data-mock]").forEach((e) => { if (e.textContent === "PHÁC THẢO") e.textContent = "BÂY GIỜ"; }); return 1;');
  await snapTo('0a_bay_gio_man_chinh');
  await fresh('yard');
  await js('GardenHome.open("room"); return 1;'); await sleep(1300);
  await caption('BÂY GIỜ (1.22.8) · Trong nhà chỉ có ở đây: khung nhỏ (phóng 4 lần), luôn đi kèm danh sách cửa hàng bên dưới');
  await js('document.querySelectorAll("[data-mock]").forEach((e) => { if (e.textContent === "PHÁC THẢO") e.textContent = "BÂY GIỜ"; }); return 1;');
  await snapTo('0b_bay_gio_nha');
  await js('GardenHome.close(); return 1;');

  // 1. màn chính · Trong nhà · cỡ Vừa
  await fresh('yard');
  await mainStrip(uri(M + '/build/room_main_x4.png'), 453 * 4, 88 * 4, 'Trong nhà · 2 / 9');
  await caption('1. MÀN CHÍNH · chọn "Trong nhà" bằng ◂ ▸ (hoặc bấm vào ngôi nhà) · phòng ở giữa, tường và sàn kéo dài hai bên · thú nuôi trong nhà hiện ở đây · cỡ Vừa (như bây giờ)');
  await snapTo('1_man_chinh_trong_nha');

  // 2. màn chính · Sân vườn · cỡ Lớn
  await fresh('yard');
  await mainStrip(uri(M + '/build/yard_main_x6.png'), 302 * 6, 76 * 6, 'Sân vườn · 1 / 9');
  await caption('2. MÀN CHÍNH · ⚙ → Giao diện → "Cỡ cảnh trên màn chính: Lớn" · sân phóng 6 lần thay vì 4, ruộng cây lùi xuống (cuộn được)');
  await snapTo('2_man_chinh_co_lon');

  // 2b. tuỳ chọn mới trong ⚙ → Giao diện & chế độ học
  await fresh('yard');
  await js('GardenUI.open(); return 1;'); await sleep(1000);
  const ok2b = await js(`const hs = Array.prototype.filter.call(document.querySelectorAll("#kb-ui-stage .kb-ui-h"), (h) => h.textContent === "Bảng ôn thẻ");
    const radio = Array.prototype.find.call(document.querySelectorAll("#kb-ui-stage .kb-ui-radio"), (r) => /Khung thẻ/.test(r.textContent));
    if (!hs.length || !radio) return "không thấy";
    const wrap = document.createElement("div"); wrap.setAttribute("data-mock", "1");
    wrap.style.cssText = "outline:3px dashed #c21f3a;outline-offset:4px;margin:6px 0 14px";
    const h = hs[0].cloneNode(true); h.textContent = "Màn chính (mới)"; wrap.appendChild(h);
    const g = document.createElement("div"); g.className = radio.parentNode.className;
    const r = radio.cloneNode(true); g.appendChild(r); wrap.appendChild(g);
    r.querySelector(".kb-ui-l").textContent = "Cỡ cảnh";
    const labs = r.querySelectorAll("label");
    labs[0].lastChild.textContent = " Vừa (như bây giờ)"; labs[0].classList.remove("is-on"); labs[0].querySelector("input").checked = false;
    labs[1].lastChild.textContent = " Lớn (sân phóng to, ruộng cây lùi xuống)"; labs[1].classList.add("is-on"); labs[1].querySelector("input").checked = true;
    const r2 = r.cloneNode(true); g.appendChild(r2);
    r2.querySelector(".kb-ui-l").textContent = "Cảnh hiện";
    const l2 = r2.querySelectorAll("label");
    l2[0].lastChild.textContent = " Cảnh đang chọn (◂ ▸ trên dải cảnh)"; l2[0].classList.add("is-on"); l2[0].querySelector("input").checked = true;
    l2[1].lastChild.textContent = " Luôn về Sân vườn khi mở vườn"; l2[1].classList.remove("is-on"); l2[1].querySelector("input").checked = false;
    hs[0].parentNode.insertBefore(wrap, hs[0]); return "ok";`);
  console.log('   2b', ok2b);
  await caption('2b. Tuỳ chọn mới ở ⚙ → Giao diện & chế độ học (khung đỏ): Vừa / Lớn · kết hợp "Ruộng cây: Ẩn" thì màn chính gần như chỉ còn cảnh');
  await snapTo('2b_tuy_chon_co_canh');
  await js('GardenUI.close && GardenUI.close(); return 1;');

  // 3. màn Ngắm cảnh · Trong nhà
  await fresh('yard');
  await viewer(uri(M + '/room_1x.png'), 160 * 10, 88 * 10, 'room');
  await caption('3. NGẮM CẢNH (nút "Ngắm" hoặc phím V) · cả cửa sổ chỉ có một cảnh, phóng 10 lần, không có danh sách cửa hàng · ◂ ▸ đổi cảnh bằng hàng nút ở trên');
  await snapTo('3_ngam_trong_nha');
  await js('GardenHome.close(); return 1;');

  // 4. màn Ngắm cảnh · Bãi biển (trời và đất kéo dài cho kín khung)
  await fresh('yard');
  await viewer(uri(M + '/build/beach_view_x6.png'), 296 * 6, 150 * 6, 'beach');
  await caption('4. NGẮM CẢNH · Bãi biển · cảnh ngoài trời phóng 6 lần, trời vẽ cao lên và đất kéo xuống cho kín khung (không còn dải trống)');
  await snapTo('4_ngam_bai_bien');
  await js('GardenHome.close(); return 1;');

  // 5. màn Ngắm cảnh · Sắp xếp đồ
  await fresh('yard');
  await viewer(uri(M + '/build/room_arrange_x9.png'), 160 * 9, 88 * 9, 'room', {
    arranging: true,
    tip: 'Đang sắp xếp: bấm một món → Di chuyển / Cất vào kho · ở Kho đồ bấm Đặt rồi chọn ô · Xong để thoát chế độ sắp xếp',
    after: async () => {
      await js(`const view = document.querySelector("#kb-home .kb-h-view"); const box = view.querySelector("[data-mock]");
        const pop = document.createElement("img"); pop.src = ${JSON.stringify(uri(M + '/pop.png'))};
        pop.style.cssText = "position:absolute;left:${4 * 16 * 9 - 30}px;top:${56 * 9 - 66}px;image-rendering:auto"; box.appendChild(pop);
        box.style.marginRight = "290px";
        const kho = document.createElement("div"); kho.setAttribute("data-mock", "1");
        kho.style.cssText = "position:absolute;right:18px;top:16px;bottom:44px;width:250px;background:#fffdf3;border:3px solid #1b1b2f;box-shadow:4px 4px 0 #1b1b2f;padding:10px;overflow:hidden;line-height:normal;font:bold 15px 'Noto Sans Mono CJK JP',monospace";
        kho.innerHTML = "<div style='margin-bottom:8px'>Kho đồ · chưa đặt</div>";
        ${JSON.stringify([0, 1, 2].map((i) => uri(M + '/kho_' + i + '.png')))}.forEach((u) => { const im = document.createElement("img"); im.src = u; im.style.cssText = "display:block;width:226px;margin-bottom:8px"; kho.appendChild(im); });
        view.appendChild(kho); return 1;`);
    },
  });
  await caption('5. NGẮM CẢNH · "Sắp xếp đồ": lưới ô hiện ra, bấm món đồ để Di chuyển / Cất vào kho, bên phải là Kho đồ để đặt thêm · mua đồ vẫn ở Nhà & Cửa hàng');
  await snapTo('5_ngam_sap_xep_do');
  await js('GardenHome.close(); return 1;');
  await fresh('yard');
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
