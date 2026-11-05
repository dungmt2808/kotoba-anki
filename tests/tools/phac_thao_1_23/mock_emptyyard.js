const fs = require('fs');
const { pages, Page, sleep } = require('/home/user/kotoba-anki/tests/anki/cdp');
async function py(code) { const r = await fetch('http://127.0.0.1:9444', { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
(async () => {
  let page;
  for (const info of (await pages(9333)).filter((i) => !['top toolbar', 'bottom toolbar', 'main webview'].includes(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    if (await p.eval('typeof GardenHome !== "undefined"').catch(() => false)) { page = p; break; } p.close();
  }
  const js = (e) => page.eval('(() => { ' + e + ' })()');
  await py(KB + 'kb._dialog.resize(1850, 1130)\nresult = 1'); await sleep(1500);
  // sân trống: cất hết đồ ngoài sân, thú nuôi sang bãi biển (giữ nhà để biết chỗ, lấy phần bên phải nhà)
  await py(KB + `d = st.load(); kb._m_yard = d["home"]["yard"]; d["home"]["yard"] = []
kb._m_pets = {k: dict(v) for k, v in d["more"]["pets"].items()}
for v in d["more"]["pets"].values():
    v["scene"] = "beach"
st.save(d); kb._dialog.refresh()
result = 1`);
  await sleep(2200);
  await js('try { localStorage.setItem("kb-main-scene", "yard"); } catch (e) {} GardenHome.open("yard"); GardenHome.close(); GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
  await sleep(2500);
  const d = await js(`const cv = document.getElementById("kb-yard"); const S = Math.round(cv.height / 76);
    const c = document.createElement("canvas"); c.width = Math.round(cv.width / S); c.height = 76; const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    x.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, c.width, c.height); return c.toDataURL("image/png");`);
  fs.writeFileSync('/tmp/kb_mock/yard_empty_1x.png', Buffer.from(d.split(',')[1], 'base64'));
  await py(KB + `d = st.load(); d["home"]["yard"] = kb._m_yard
for k, v in kb._m_pets.items():
    d["more"]["pets"][k] = v
st.save(d); kb._dialog.refresh()
result = 1`);
  console.log('ok'); process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
