// 1.36.4 — kiểm tra ngoài bộ test có sẵn: "bấm bừa" các lệnh cầu nối của sự kiện Giáng sinh (le:*) trong Anki thật, đi hết mùa
// 1/12 → 3/1 bằng ngày giả kb.LE_TEST (ngày có ôn / số lượt ôn ngẫu nhiên). Lệnh đúng lẫn sai: ngăn / hộp / ô lạ, số âm, JSON hỏng,
// thiệp sai kiểu, chuỗi dài, mã thiệp hỏng / sửa tay, quả châu sai cỡ, lệnh giữ (le:keep) rác, bật / tắt Sự kiện mùa, xem thử khi
// không phải admin. (Bỏ le:fix — gọi Gemini thật.) Sau mỗi loạt kiểm:
//   - cầu nối luôn trả lời (Python không treo, không hộp thoại chặn), cửa sổ vườn còn mở, trang không lỗi JS;
//   - xu KHÔNG đổi (sự kiện không cho / lấy xu); món của sự kiện trong kho = đúng số sổ ghi đã nhận (không nhân đôi, không mất);
//   - mỗi món: đã đặt ≤ đang có; sổ trong collection đã sạch (làm sạch lại ra y hệt); ngăn chỉ mở từ ngày của ngăn, không sau 31/12,
//     mở bù ≤ 2 / ngày; hộp quà mở từ 25/12; thiệp ông già Noel đã mang đi không đổi sau 18:00 ngày 24;
//   - nhật ký lỗi không có lỗi mới.
// Hạt cố định KB_FUZZ_SEED (mặc định 1364). Chạy: KB_SCRIPTS=e2e_fuzz_noel.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_fuzz_noel';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const SEED = Number(process.env.KB_FUZZ_SEED || 1364), PER = Number(process.env.KB_FUZZ_PER || 45);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code, signal: AbortSignal.timeout(60000) });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const errors = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
let rs = SEED >>> 0;
function rnd() { rs = (Math.imul(rs ^ (rs >>> 15), 2246822507) + 0x9e3779b9) >>> 0; rs ^= rs >>> 13; return (rs >>> 0) / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const KB = `import sys, os, json, time, datetime, random
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
async function reopen(before) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(500);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await sleep(300);
}
// ---- lệnh ngẫu nhiên ----
const DRAW = 'knSmswcyiohtbBeEPprRvzlduUaAfgGj';
const junkStr = () => pick(['', 'x', '-1', '1e9', 'NaN', 'null', '{}', '[]', '"', '\\u0000', 'あいう', '𝔘𝔫𝔦', '9'.repeat(30), 'a'.repeat(5000), '01', ' 3', '2.5']);
const rndDraw = () => {
  const k = rnd();
  if (k < 0.3) return '9600.';
  if (k < 0.5) return junkStr();
  if (k < 0.7) { let s = '', n = 0; while (n < 9600) { const c = Math.min(9600 - n, ri(1, 400)); s += (c > 1 ? c : '') + pick((DRAW + '.').split('')); n += c; } return s; }
  if (k < 0.8) return '9601k';
  return '0k9600.';
};
const rndCard = () => {
  const k = rnd();
  if (k < 0.1) return junkStr();
  if (k < 0.15) return null;
  const c = { f: pick(['den', 'tuyet', 'thong', 'qua', 'xxx', '', 3]), st: [], t1: pick(['Chúc mừng', 'a'.repeat(200), '‮abc', 'メリー', '', 5]),
    t2: pick(['— Mai', '', null, '\n\n']), c: pick(['vi', 'ja', 'en', 'zh', 'ko', 'de', 'fr', 'xx', [], {}]), w: pick(['Ước học giỏi', 'x'.repeat(400), '', null]),
    wl: pick(['vi', 'ja', 'xx']) };
  for (let i = 0, n = ri(0, 16); i < n; i++) c.st.push(pick([{ s: pick(['xmastree', 'le_tat', 'le_nguoituyet', 'zzz', '../x', 'A']), x: ri(-100, 200), y: ri(-100, 200), m: pick([0, 1, true]), z: pick([1, 2]) }, 'x', null, { s: 'xmastree', x: 'a', y: NaN }]));
  if (rnd() < 0.5) c.d = rndDraw();
  if (rnd() < 0.1) c.fx = { for: c.w, sua: 'hack', loi: [{ goc: 'a', sua: 'b' }] };
  return c;
};
let codes = [];
const mutate = (s) => { if (!s) return junkStr(); const k = rnd(); if (k < 0.3) return s; if (k < 0.5) return s.slice(0, ri(0, s.length)); if (k < 0.7) { const i = ri(5, s.length - 1); return s.slice(0, i) + pick(['A', '_', '-', '=', ' ', '\n']) + s.slice(i + 1); } if (k < 0.8) return s.replace('KBC1:', 'KBC2:'); return s + s; };
const rndOrn = () => {
  const k = rnd();
  let p;
  if (k < 0.5) { p = ''; for (let i = 0; i < 64; i++) p += rnd() < 0.5 ? '.' : pick(DRAW.split('')); }
  else if (k < 0.6) p = '.'.repeat(64);
  else if (k < 0.75) p = 'k'.repeat(ri(0, 100));
  else p = junkStr();
  return { i: pick([0, 1, 2, 3, -1, '1', null]), p, on: pick([0, 1, true, 'x']), rid: ri(0, 99) };
};
function command() {
  const k = rnd();
  if (k < 0.22) return 'le:open:' + pick([String(ri(-2, 27)), String(ri(1, 24)), String(ri(1, 24)), junkStr()]);
  if (k < 0.28) return 'le:box:' + pick([String(ri(0, 4)), junkStr()]);
  if (k < 0.33) return 'le:auto:' + pick(['le_tulich', 'le_tat', 'le_nguoituyet', 'le_tuanloc', 'xmastree', 'le_xyz', 'chair', junkStr()]);
  if (k < 0.48) { const c = rndCard(); return 'le:card:' + (rnd() < 0.1 ? junkStr() : JSON.stringify({ i: pick([0, 1, 2, 3, -1, '0', null]), card: c, rid: ri(0, 99) })); }
  if (k < 0.52) return 'le:cdel:' + pick(['0', '1', '2', '3', '-1', junkStr()]);
  if (k < 0.58) return 'le:hang:' + pick(['0', '1', '2', '-1', '5', junkStr()]);
  if (k < 0.62) return 'le:code:' + pick(['0', '1', '2', junkStr()]);
  if (k < 0.65) return pick(['le:seen', 'le:read', 'le:seen:x', 'le:read:' + junkStr()]);
  if (k < 0.75) { const c = pick(codes.length ? codes : ['']); return 'le:' + pick(['rpeek', 'recv', 'recv', 'rdel', 'rcode']) + ':' + mutate(c); }
  if (k < 0.85) return 'le:orn:' + (rnd() < 0.1 ? junkStr() : JSON.stringify(rndOrn()));
  if (k < 0.93) return 'le:keep:' + (rnd() < 0.2 ? junkStr() : JSON.stringify(pick([{ i: ri(-1, 3), q: ri(0, 50), card: rndCard() }, { o: ri(-1, 3), q: ri(0, 50), orn: rndOrn() }, { i: '0', q: 'x' }])));
  if (k < 0.96) return 'le:preview:' + pick(['2026-12-24T18:30', '2026-12-25', 'off', junkStr()]);
  if (k < 0.98) return 'le:cfg:' + pick(['on', 'off', 'x']);
  return 'le:' + pick(['', 'xyz', 'open', 'card', 'keep']) + (rnd() < 0.5 ? ':' + junkStr() : '');
}
// ---- bất biến (Python) ----
const INV = `raw = mw.col.get_config("kotoba_batake_le", None)
d = st.load()
owned, placed = d["home"]["owned"], kb._le_placed(d)
bad = []
ev = le.clean_ev((raw or {}).get("noel2026")) if raw else le.empty()
if raw is not None:
    cur = raw.get("noel2026") or {}
    for k in ("open", "bu", "gift", "box", "cards", "hang", "santa", "pack", "prev", "recv", "orn", "fixn"):
        if k in cur and json.dumps(cur[k], sort_keys=True) != json.dumps(ev.get(k), sort_keys=True):
            bad.append("sổ chưa sạch ở " + k)
exp = le.expected_items(ev)
for iid in set(list(exp) + [k for k in owned if k.startswith("le_")]):
    if int(owned.get(iid, 0) or 0) != exp.get(iid, 0) and not (iid in exp and ev.get("pack") and int(owned.get(iid, 0) or 0) >= exp[iid]):
        bad.append("kho %s=%s, sổ ghi %s" % (iid, owned.get(iid, 0), exp.get(iid, 0)))
for iid, n in placed.items():
    if n > int(owned.get(iid, 0) or 0):
        bad.append("đặt %s ×%d > có %s" % (iid, n, owned.get(iid, 0)))
for k, v in ev["open"].items():
    if v["d"] < le.door_date(int(k)).isoformat() or v["d"] > "2026-12-31" or v["d"] > TODAY:
        bad.append("ngăn %s mở ngày %s" % (k, v["d"]))
for ds, n in ev["bu"].items():
    if n > 2:
        bad.append("mở bù %d ngăn ngày %s" % (n, ds))
for k, v in ev["box"].items():
    if v < "2026-12-25":
        bad.append("hộp %s mở ngày %s" % (k, v))
result = {"bad": bad, "coins": int(d.get("coins") or 0), "dmg": bool(d.get("_damaged")), "open": len(ev["open"]),
          "cards": [c.get("at") if isinstance(c, dict) else None for c in le.cards(ev)], "hang": le.hang_index(ev),
          "taken": json.dumps(le.cards(ev)[le.hang_index(ev)], sort_keys=True) if le.hang_index(ev) >= 0 else None,
          "orn": sum(1 for o in le.orns(ev) if le.orn_filled(o)), "recv": len(le.recv_list(ev)), "dlg": kb._dialog is not None and kb._dialog.isVisible()}`;
const DAYS = [];
for (let d = 1; d <= 31; d++) DAYS.push('2026-12-' + String(d).padStart(2, '0'));
DAYS.push('2027-01-01', '2027-01-02', '2027-01-03');

(async () => {
  await py(KB + `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 7777; d["home"]["house"] = 7
st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={"greet": "off", "trans": "off"})
p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")
os.path.exists(p) and os.remove(p)
result = 1`);
  codes = await py(KB + `result = [le.card_code({"f": "thong", "st": [{"s": "xmastree", "x": 40, "y": 20}], "t1": "Bạn %d" % i, "t2": "", "c": "vi", "d": "%dk%d." % (i * 40 + 1, 9599 - i * 40)}) for i in range(14)]`);
  await reopen(`kb.LE_TEST = {"today": "2026-12-01", "now": "2026-12-01T09:00", "days": [], "reviews": 0}\n`);
  const coins0 = (await py(KB + 'result = int(st.load()["coins"])'));
  let sent = 0, batches = 0, takenAt = null, broken = [];
  const reviewed = new Set();
  for (const day of DAYS) {
    if (day <= '2026-12-24' && rnd() < 0.7) reviewed.add(day);
    const hour = day === '2026-12-24' ? pick(['10:00', '17:59', '18:00', '21:30']) : pick(['08:00', '13:30', '23:10']);
    const reviews = pick([0, 3, 15, 16, 30, 31, 45, 200]);
    const T = `kb.LE_TEST = {"today": "${day}", "now": "${day}T${hour}", "days": ${JSON.stringify([...reviewed].filter((x) => x <= day))}, "frozen": [], "reviews": ${reviews}}\n`;
    if (rnd() < 0.35) { await reopen(T); } else { await py(KB + T + 'kb._dialog.refresh(); result = 1'); await sleep(300); }
    const n = day <= '2026-12-26' ? PER : Math.round(PER / 3);
    for (let i = 0; i < n; i++) {
      const cmd = command();
      await js('pycmd(' + JSON.stringify(cmd) + '); return 1;').catch((e) => errors.push('pycmd ' + e.message));
      sent++;
      if (i % 9 === 8) { await sleep(120); }
    }
    await sleep(500);
    batches++;
    let inv;
    try { inv = await py(KB + 'TODAY = ' + JSON.stringify(day) + '\n' + INV); } catch (e) { broken.push(day + ': Python không trả lời — ' + e.message); break; }
    if (inv.bad.length) broken.push(day + ' ' + hour + ': ' + inv.bad.slice(0, 3).join('; '));
    if (inv.coins !== coins0) broken.push(day + ': xu đổi ' + coins0 + ' → ' + inv.coins);
    if (!inv.dlg) { broken.push(day + ': cửa sổ vườn đã đóng'); await reopen(T); }
    // thiệp ông già Noel mang đi (đang treo lúc 18:00 ngày 24): từ đó không đổi
    if (day === '2026-12-24' && hour >= '18:00' && takenAt === null) { takenAt = inv.taken || ''; }
    if (takenAt !== null && takenAt && day > '2026-12-24' && inv.taken !== takenAt) broken.push(day + ': thiệp ông già Noel đã mang đi bị đổi');
    process.stdout.write(`  · ${day} ${hour} — ${n} lệnh, ngăn ${inv.open}/24, thiệp ${inv.cards.filter(Boolean).length}, châu ${inv.orn}, nhận ${inv.recv}, lỗi bất biến ${inv.bad.length}\n`);
    if (broken.length > 12) break;
  }
  ok(broken.length === 0, `${sent} lệnh le:* ngẫu nhiên trên ${batches} ngày (1/12 → 3/1): bất biến giữ` + (broken.length ? ' — ' + broken.slice(0, 6).join(' | ') : ''));
  const fin = await py(KB + 'result = int(st.load()["coins"])');
  ok(fin === coins0, 'xu không đổi: ' + coins0 + ' → ' + fin);
  ok(await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), 'cửa sổ vườn vẫn mở, Python trả lời');
  await page.shot(SHOTS + '/fuzz_noel_cuoi.png');
  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  // lệnh rác JSON hỏng (trang không bao giờ gửi — luôn JSON.stringify): cầu nối bắt, trả lời "không làm được", ghi nhật ký — chấp nhận
  const junk = (e) => /JSONDecodeError|không phải đối tượng JSON/.test(e.msg || '');
  const real = (elog || []).filter((e) => !junk(e));
  console.log('  (nhật ký lỗi: ' + (elog || []).filter(junk).length + ' mục do lệnh JSON hỏng — trang không gửi kiểu này)');
  ok(!real.length, 'nhật ký lỗi không có lỗi nào khác' + (real.length ? ' (' + real.length + '): ' + JSON.stringify(real.slice(-2)).slice(0, 600) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
