// Ảnh phác (25/11, chưa làm): chỗ tiêu xu kiểu Stardew Valley — người dùng: "nghĩ các việc thêm để tiêu xu đi bạn" →
// "tham khảo thêm Stardew Valley" → "làm ảnh phác đi, tớ chưa hình dung được. làm sao mà ấn tượng và thú vị".
// Vẽ đè lên vườn thật trong Anki 26.9.4 (mã trong trang: mock_tieu_xu_page.js; add-on chưa đổi). 8 ảnh:
//   01 làng trước / sau · 02 Nhà văn hoá (gói góp + bảng việc + kho bạc) · 03 Bác Tanuki thợ mộc (giàn giáo, nâng nhà) ·
//   04 bạn bè (tặng quà khách → tim → thư bằng tiếng đang học + cảnh tim) · 05 Bếp (nông sản → món Nhật, Sổ món ăn) ·
//   06 Sổ ép hoa (mỗi từ đã thuộc một bông) · 07 Hầm ủ + Lò rèn (bình tưới) · 08 tượng StackChan vàng + % Vườn hoàn hảo.
// Chạy: KB_SCRIPTS=mock_tieu_xu.js run_ui.sh ADDON docs/ke_hoach_tieu_xu
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_tieu_xu';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys, os, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const SHOTS = [
  [1, 'tx_01_lang_truoc_sau', 860], [2, 'tx_02_nha_van_hoa_goi_gop', 860], [3, 'tx_03_tho_moc_tanuki', 760], [4, 'tx_04_tang_qua_ban_be', 860],
  [5, 'tx_05_bep_mon_nhat', 860], [6, 'tx_06_so_ep_hoa', 860], [7, 'tx_07_ham_u_lo_ren', 720], [8, 'tx_08_tuong_vang_hoan_hao', 700]
];
(async () => {
  await py(KB + `d = st.load(); d["coins"] = 48600; st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
kb._dialog.close() if kb._dialog else None
kb.open_garden(); result = 1`);
  const page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await sleep(1500);
  await page.eval(fs.readFileSync(path.join(__dirname, 'mock_tieu_xu_page.js'), 'utf8'));
  for (const [n, name, h] of SHOTS) {
    await py(KB + `kb._dialog.resize(1366, ${h}); result = 1`); await sleep(700);
    await page.eval('window.__tx.show(' + n + ')');
    await sleep(500);
    await page.shot(OUT + '/' + name + '.png');
    console.log('  ✓ ' + name);
  }
  await page.eval('window.__tx.clear(); true');
  console.log('Ảnh phác: ' + OUT);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
