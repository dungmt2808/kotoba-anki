const fs = require('fs');
const { pages, Page, sleep } = require('/home/user/kotoba-anki/tests/anki/cdp');
async function py(code) { const r = await fetch('http://127.0.0.1:9444', { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
(async () => {
  let page;
  for (const info of (await pages(9333)).filter((i) => !['top toolbar', 'bottom toolbar', 'main webview'].includes(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    if (await p.eval('typeof GardenHome !== "undefined"').catch(() => false)) { page = p; break; }
    p.close();
  }
  const js = (e) => page.eval('(() => { ' + e + ' })()');
  await py(KB + 'd = st.load(); kb._mock_room = d["home"]["room"]; d["home"]["room"] = []; st.save(d); kb._dialog.refresh()\nresult = len(kb._mock_room)');
  await sleep(2000);
  await js('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); GardenHome.open("room"); return 1;'); await sleep(1500);
  const d = await js(`const cv = document.getElementById("kb-home-canvas"); const S = Math.round(cv.width / 160);
    const c = document.createElement("canvas"); c.width = 160; c.height = 88; const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    x.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 160, 88); return c.toDataURL("image/png");`);
  fs.writeFileSync('/tmp/kb_mock/room_empty_1x.png', Buffer.from(d.split(',')[1], 'base64'));
  await js('GardenHome.close(); return 1;');
  await py(KB + 'd = st.load(); d["home"]["room"] = kb._mock_room; st.save(d); kb._dialog.refresh()\nresult = len(d["home"]["room"])');
  console.log('ok'); process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
