// Independent audit in real Anki/QtWebEngine. API completion is controlled locally;
// no Gemini request is sent. Requires a disposable profile created by our runner.
'use strict';
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('../anki/cdp');
const OUT = process.argv[2] || '/tmp/kotoba-audit-ui-results';
const CDP = Number(process.env.KB_CDP_PORT || 9933);
const CTRL = Number(process.env.KB_CTRL_PORT || 9944);
const RESULTS = [];
const ERRORS = [];
let page;
const KB = 'import sys, json, datetime, time\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
fs.mkdirSync(OUT, { recursive: true });

function check(id, actual, expected, finding) {
  const row = { case: id, pass: JSON.stringify(actual) === JSON.stringify(expected), actual, expected };
  if (finding) row.finding = finding;
  RESULTS.push(row);
  console.log((row.pass ? 'PASS ' : 'FAIL ') + JSON.stringify(row));
}
async function py(code) {
  const r = await fetch(`http://127.0.0.1:${CTRL}`, { method: 'POST', body: KB + code });
  const j = await r.json();
  if (j.err) throw new Error(j.err);
  return j.r;
}
async function connect() {
  const excluded = ['main webview', 'top toolbar', 'bottom toolbar'];
  for (let i = 0; i < 50; i++) {
    for (const info of (await pages(CDP)).filter(x => !excluded.includes(x.title))) {
      // Qt may still list a destroyed webview briefly during rapid reopen.
      let p;
      try { p = await Page.open(info.webSocketDebuggerUrl); }
      catch (_) { continue; }
      if (await p.eval('typeof Garden !== "undefined" && !!Garden._data()').catch(() => false)) return p;
      p.close();
    }
    await sleep(100);
  }
  throw new Error('Garden webview did not become ready');
}
async function waitFor(expr, limit = 5000) {
  const started = Date.now();
  while (Date.now() - started < limit) {
    const result = await page.eval(expr).catch(() => false);
    if (result) return result;
    await sleep(40);
  }
  throw new Error('UI condition timed out: ' + expr);
}
async function shot(name) { await page.shot(path.join(OUT, name + '.png')); }
async function text(value, replace = false) {
  await page.eval(`(() => { const e = document.querySelector('.kb-cal-note'); e.focus(); ${replace ? 'e.select();' : 'e.setSelectionRange(e.value.length, e.value.length);'} })()`);
  await page.type(value); // Chromium input, including a real input event.
}
async function closePage() {
  if (page) { ERRORS.push(...page.errors); page.close(); page = null; }
}

async function diaryCompletionRace() {
  for (const delay of [0, 300, 1000, 1800]) {
    await page.eval('GardenCal.close()');
    await sleep(80);
    const prep = await py(`
kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000", gemini_auto=False)
day = kb.cal_today()
kb.JOURNAL.update(day, {"t":"Đã lưu.", "w":{"lang":"ja", "goc":"今日は天気がいいです。", "st":""}})
kb._audit_bg_original = kb._bg
kb._bg = lambda task, done: setattr(kb, "_audit_fix_done", done)
err = kb.fix_start(day.isoformat())
result = {"err":err, "date":day.isoformat(), "state":kb.JOURNAL.entry(day)["w"]["st"]}
`);
    check(`diary/${delay}/fix-start`, [prep.err, prep.state], ['', 'wait']);
    await page.eval('GardenCal.open()');
    await waitFor('!!document.querySelector(".kb-cal-note") && GardenCal._state().day.w.st === "wait"');
    const original = `Đã lưu. Nhật ký vừa gõ (${delay} ms).`;
    await text(original, true);
    if (delay === 0) await shot('F01_01_before_completion');
    await sleep(delay);
    const done = await py(`
from concurrent.futures import Future
f = Future()
f.set_result({"model":"audit-offline", "raw":{"sua":"今日は天気がいいです。", "loi":[], "nhan_xet":"Bạn viết tốt.", "tu_nhien":""}})
kb._audit_fix_done(f)
kb._bg = kb._audit_bg_original
kb.save_config(gemini_key="")
result = kb.JOURNAL.entry(kb.cal_today())["w"]["st"]
`);
    await waitFor('GardenCal._state().day.w.st === "done"');
    check(`diary/${delay}/fix-completed`, done, 'done');
    const after = await page.eval('document.querySelector(".kb-cal-note").value');
    check(`diary/${delay}/preserve-visible-text`, after, original, 'F01');
    if (delay === 0) await shot('F01_02_after_completion');
    await text(' Ghi tiếp.');
    await sleep(1650);
    const persisted = await py('result = kb.JOURNAL.entry(kb.cal_today()).get("t", "")');
    check(`diary/${delay}/preserve-after-next-save`, persisted, original + ' Ghi tiếp.', 'F01');
    if (delay === 0) await shot('F01_03_after_next_save');
  }
  await page.eval('GardenCal.close()');
}

async function historyCacheAfterSync() {
  await py(`
kb.save_config(mobile_coins=False, gemini_key="")
col = mw.col
col.db.execute("delete from revlog")
start = int(col.sched.day_cutoff) - 86400
cid = col.db.scalar("select id from cards limit 1")
for i in range(1,28):
    col.db.execute("insert into revlog values(?,?,?,?,?,?,?,?,?)", (start-i*86400+3600)*1000, cid,0,3,1,1,2500,1000,1)
kb._day_total.update(key=None, v=0)
kb._dialog.refresh()
result = True
`);
  await waitFor('Garden._data().news.today.some(x => x.id === "days")');
  const initial = await page.eval('Garden._data().news.today.find(x => x.id === "days").text');
  check('history/cache-initial-27', initial, 'Còn 3 ngày nữa đủ 30 ngày có ôn');
  const cached = await py(`
col = mw.col
start = int(col.sched.day_cutoff) - 86400
cid = col.db.scalar("select id from cards limit 1")
for i in (28,29):
    col.db.execute("insert into revlog values(?,?,?,?,?,?,?,?,?)", (start-i*86400+3600)*1000,cid,0,3,1,1,2500,1000,1)
kb._on_sync_finished()
result = {"cached":kb._day_total["v"], "actual":kb.core.review_day_total(col, before_today=True)}
`);
  await sleep(150);
  check('history/cache-invalidate-on-sync', [cached.cached, cached.actual], [29, 29], 'F07');
  const after = await page.eval('Garden._data().news.today.find(x => x.id === "days").text');
  check('history/news-updates-on-sync', after, 'Còn 1 ngày nữa đủ 30 ngày có ôn', 'F07');
  await page.click('#kb-news-btn');
  await shot('F07_stale_news_after_sync');
  await page.eval('GardenGreet.closeNews()');
  await py('kb._day_total.update(key=None, v=0)\nkb._dialog.refresh()\nresult = True');
  await waitFor('Garden._data().news.today.find(x => x.id === "days").text.includes("Còn 1")');
  check('history/control-after-cache-reset', await page.eval('Garden._data().news.today.find(x => x.id === "days").text'),
    'Còn 1 ngày nữa đủ 30 ngày có ôn');
}

async function greetingHours() {
  // Test time-of-day independently of whatever holiday the rerun falls on.
  await py('kb._audit_festival_original = kb.event_core.festival\nkb.event_core.festival = lambda day: None\nresult = True');
  try {
  for (const hour of [0, 0.5, 0.99, 1, 3.99, 4, 10.99, 11, 17.99, 18, 23.99]) {
    await page.eval('localStorage.removeItem("kb-greet-day"); localStorage.removeItem("kb-sky")');
    await closePage();
    await py(`
kb._dialog.close()
cfg = kb.config()
prefs = dict(cfg.get("prefs") or {})
prefs.pop("kb-greet-day", None)
prefs["kb-sky"] = json.dumps({"mode":"fixed", "fixedHour":${hour}, "dayMinutes":24, "weather":"sunny"})
kb.save_config(prefs=prefs, ui={"greet":"on", "trans":"off"})
kb.GREET_TEST_OFF = False
kb.open_garden()
kb._dialog.resize(1366,860)
result = True
`);
    page = await connect();
    await waitFor('GardenGreet.isGreeting()');
    const state = await page.eval('({hour: GardenSky.state().hour, greeting: GardenGreet._state().hi})');
    check(`greeting/hour-${hour}/sky`, state.hour, hour);
    const expected = hour >= 4 && hour < 11 ? 'おはよう！' : hour >= 11 && hour < 18 ? 'こんにちは！' : 'こんばんは！';
    check(`greeting/hour-${hour}/words`, state.greeting, expected, 'F04');
    if (hour === 0) {
      await page.eval('document.getElementById("kb-greet").dispatchEvent(new MouseEvent("mouseenter"))');
      await shot('F04_midnight_says_morning');
    }
    await page.eval('GardenGreet.leave()');
  }
  } finally {
    await py('kb.event_core.festival = kb._audit_festival_original\nkb.GREET_TEST_OFF = True\nresult = True');
  }
}

async function newsLayout() {
  await py(`
d = st.load()
d["coins"] = 50000
d["home"]["house"] = 7
today = int(mw.col.sched.today)
d["more"]["pets"] = {pid:{"name":p["name"], "scene":"yard", "fed":today-5, "got":today-20, "love":10} for pid,p in kb.more_core.PETS.items()}
d["more"]["repair"] = {"day":today-35,"seen":today,"back":None}
d["more"]["freeze"] = {"n":2,"days":[],"since":kb.cal_today().isoformat()}
d["more"]["paper_sub"] = {"until":(kb.cal_today()+datetime.timedelta(days=2)).isoformat(),"plan":"tuan","auto":True,"trial":"2026-01-01","paid":"2026-11-01"}
d["season"] = {"unlocked":["momiji"],"mode":"pick","pick":"momiji","free_day":None}
st.save(d)
kb.save_config(ui={"greet":"off","trans":"off"})
kb._dialog.resize(1366,860)
kb._dialog.refresh()
result = True
`);
  await sleep(500);
  const visible = await page.eval('document.getElementById("kb-news-btn").getBoundingClientRect().height > 0');
  check('news/rich-fixture-button-reachable', visible, true);
  if (!visible) throw new Error('Rich-news fixture does not permit a real click');
  await page.click('#kb-news-btn');
  const measure = () => page.eval(`(() => {
    const e = document.getElementById('kb-news-pop'), r = e.getBoundingClientRect();
    return { viewport:[innerWidth,innerHeight], rect:[r.left,r.top,r.right,r.bottom],
      within:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,
      overflow:getComputedStyle(e).overflowY, pageHeight:document.scrollingElement.scrollHeight };
  })()`);
  const normal = await measure();
  check('news/rich-popup-fits-1366x860', normal.within, true, 'F05');
  RESULTS[RESULTS.length - 1].detail = normal;
  await shot('F05_01_rich_news_1366');
  await py('kb._dialog.resize(720,520)\nresult = True');
  await sleep(400);
  const resized = await measure();
  check('news/open-popup-follows-window-resize', resized.within, true, 'F05');
  RESULTS[RESULTS.length - 1].detail = resized;
  await shot('F05_02_news_after_resize_720');
  await page.key('Escape', 'Escape', 27);
  await sleep(120);
  check('news/escape-keeps-garden-open', await py('result = bool(kb._dialog and kb._dialog.isVisible())'), true);
  check('news/escape-closes-popup', await page.eval('document.getElementById("kb-news-pop").hidden'), true);
}

(async () => {
  if (process.env.KB_AUDIT_DISPOSABLE !== '1') throw new Error('Use run_ui_audit.sh: this test changes disposable review history');
  const metadata = await py(`
assert "/tmp/kotoba-audit-ui-" in mw.col.path, "Refusing an existing/non-audit profile"
kb.save_config(gemini_key="", gemini_auto=False, mobile_coins=False, show_tooltips=False, sound=False, music=False, ui={"trans":"off"})
kb.open_garden()
kb._dialog.resize(1366,860)
result = {"anki":getattr(sys.modules.get("aqt"),"appVersion",""), "profile":mw.col.path}
`);
  page = await connect();
  for (const [name, fn] of [['diary-completion-race', diaryCompletionRace], ['history-cache', historyCacheAfterSync],
                           ['greeting-hours', greetingHours], ['news-layout', newsLayout]]) {
    try { await fn(); }
    catch (e) { check('harness/' + name, e.message, 'completed'); }
  }
  ERRORS.push(...(page ? page.errors : []));
  check('diagnostics/no-js-exceptions', ERRORS, []);
  check('diagnostics/no-addon-errors', await py('result = kb.ERRORS.entries()'), []);
  const result = {metadata, cases:RESULTS.length, passed:RESULTS.filter(x => x.pass).length,
    failed:RESULTS.filter(x => !x.pass).length, results:RESULTS};
  fs.writeFileSync(path.join(OUT, 'ui-audit.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`UI AUDIT: ${result.passed}/${result.cases} passed; ${result.failed} failed`);
  await closePage();
  process.exit(result.failed ? 1 : 0);
})().catch(e => { console.error(e); if (page) page.close(); process.exit(2); });
