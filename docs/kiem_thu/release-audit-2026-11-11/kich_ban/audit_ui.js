// Chạy trên hồ sơ giả do run_extra.sh tạo, qua QtWebEngine thật, không gọi Gemini.
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const OUT = path.resolve(__dirname, '..');
const { pages, Page, sleep } = require(path.join(REPO, 'tests/anki/cdp'));
const CTRL = Number(process.env.KB_CTRL_PORT || 9446), CDP = Number(process.env.KB_CDP_PORT || 9335);
const KB = 'import sys, json, time, datetime\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
const rows = []; let page;
async function py(code) { const j=await (await fetch('http://127.0.0.1:'+CTRL,{method:'POST',body:KB+code})).json();if(j.err)throw Error(j.err);return j.r; }
const js = code => page.eval('(()=>{'+code+'})()');
async function connect() {
  for(let k=0;k<30;k++) { for(const i of await pages(CDP)) { const p=await Page.open(i.webSocketDebuggerUrl);if(await p.eval('typeof Garden!=="undefined"').catch(()=>false)){page=p;return;}p.close(); } await sleep(300); }
  throw Error('không thấy webview vườn');
}
async function shot(name) { await page.shot(path.join(OUT,'anh',name+'.png'));return 'anh/'+name+'.png'; }
function check(name, expected, passed, actual, finding='', image='') {
  const r={id:'U'+String(rows.length+1).padStart(3,'0'),name,expected,actual,status:passed?'PASS':'FAIL',finding,image};rows.push(r);console.log(JSON.stringify(r));
  fs.writeFileSync(path.join(OUT,'logs/ui-extra.json'),JSON.stringify(rows,null,2));
}
async function closeAll() { await js('GardenCal.close();GardenHome.close();GardenGames.close();GardenPaper.close();GardenFields.close();GardenUI.close();document.getElementById("kb-sound-pop").hidden=true;return 1;'); }
async function resize(w,h) { await py(`kb._dialog.resize(${w},${h}); result=1`);await sleep(250); }
async function refresh() { await py('kb._dialog.refresh();result=1'); await sleep(600); }
async function reopen() { if(page)page.close();await py('kb.open_garden();result=1');await sleep(700);await connect(); }
const MEASURE = `const root=document.documentElement, sel=document.querySelector('#kb-home .kb-h-tab.is-on');
  const panel=document.getElementById('kb-home'), r=panel.getBoundingClientRect();
  const buttons=[...panel.querySelectorAll('.kb-h-tab')].filter(e=>{const s=e.getBoundingClientRect();return s.width&&s.height;});
  return {viewport:[innerWidth,innerHeight],scroll:root.scrollWidth,client:root.clientWidth,rect:[r.x,r.y,r.right,r.bottom],tabs:buttons.length,
  active:sel&&sel.dataset.tab,hidden:panel.hidden,
  clipped:buttons.filter(e=>{const q=e.getBoundingClientRect();return q.left<0||q.top<0||q.right>innerWidth+1||q.bottom>innerHeight+1;}).map(e=>e.textContent)};`;

(async()=>{
  await py('kb.save_config(gemini_key="",gemini_auto=False,show_tooltips=False,gemini_langs=["en"],journal_lang="en");kb.open_garden();result=1');await sleep(900);await connect();
  // Bug F03: chỉ đóng cửa sổ vườn, không kill Anki. Các độ trễ là ca độc lập.
  for(const delay of [0,50,150,350]) {
    await closeAll();await py('kb.save_config(prefs={});result=1');
    await js('GardenPrefs.set("kb-audit-close","new-value");return GardenPrefs._pending();');
    if(delay)await sleep(delay);
    await py('kb._dialog.close();result=(mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs",{}).get("kb-audit-close")');
    const got=await py('result=(mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs",{}).get("kb-audit-close")');
    check('Đóng vườn sau đổi prefs '+delay+' ms','config giữ new-value',got==='new-value',{delay_ms:delay,saved:got},'F03');await reopen();
  }
  await js('GardenPrefs.set("kb-audit-close","flush-value");GardenPrefs.flush();return 1;');await sleep(100);
  check('Prefs flush chủ động','config đã nhận giá trị',await py('result=kb.config()["prefs"].get("kb-audit-close")')==='flush-value',await py('result=kb.config()["prefs"].get("kb-audit-close")'));
  // F08: thay nguồn model_infos có kiểm soát, chạy hook đóng hồ sơ thật, không đổi collection cá nhân.
  const presence=await py(`original=kb.words.model_infos
try:
    kb._presence.update(t=0,v={})
    kb.words.model_infos=lambda *a,**k: {"a":{"lang":"ja"}}
    a=dict(kb._lang_presence())
    kb._on_profile_close()
    kb.words.model_infos=lambda *a,**k: {"b":{"lang":"ko"}}
    b=dict(kb._lang_presence())
    result={"source_A":a,"source_B":b,"expected_B":{"ja":False,"en":False}}
finally:
    kb.words.model_infos=original
    kb._presence.update(t=0,v={})`);
  check('Cache ngôn ngữ sau hook đổi hồ sơ (nguồn model giả lập)','B chỉ Hàn không có Nhật/Anh',!presence.source_B.ja&&!presence.source_B.en,presence,'F08');await reopen();
  // F11: chèn revlog vào collection thật; xóa trong finally.
  for(const ahead of [60,300,900]) {
    const rev=await py(`rid=int((min(time.time()+${ahead},mw.col.sched.day_cutoff-1))*1000)
cid=mw.col.db.scalar("select id from cards limit 1")
try:
    before=kb.core.revlog_by_day(mw.col,int(time.time()*1000)-1000)
    mw.col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)",rid,cid,-1,3,10,5,2500,1000,1)
    after=kb.core.revlog_by_day(mw.col,int(time.time()*1000)-1000)
    today=int(mw.col.sched.today)
    n=after.get(today,{}).get("all",0)-before.get(today,{}).get("all",0)
    result={"ahead_seconds":${ahead},"timestamp_ms":rid,"now_ms":int(time.time()*1000),"counted":n}
finally:
    mw.col.db.execute("delete from revlog where id=?",rid)`);
    check('Revlog tương lai +'+ahead+' giây','không tính vào lượt đã ôn',rev.counted===0,rev,'F11');
  }
  // Dữ liệu giả cho ảnh giao diện, không lấy ví / deck của người dùng.
  await py('d=st.load();d["coins"]=50000;d["home"]["house"]=7;d["home"]["rooms"]=["kitchen","bedroom"];st.save(d);kb._dialog.deck_id=mw.col.decks.id_for_name("A::Có câu ví dụ + audio");result=1');await refresh();
  // Lịch hoa: cả input, cất bài và mở lại đi qua bridge thật.
  await js('GardenCal.open({});return 1');await sleep(800);
  const long='extraordinarilylong '.repeat(30).trim();
  const entered=await js(`const t=document.querySelector('.kb-cal-ta');t.value=${JSON.stringify(long)};t.dispatchEvent(new Event('input',{bubbles:true}));return {text:t.value,units:GardenCal._units(t.value,'en')};`);
  await js('document.querySelector(".kb-cal-ta").scrollIntoView({block:"center"});document.getElementById("kb-toast").hidden=true;return 1');
  const beforeShot=await shot('f02-bai-viet-truoc-luu');await js('GardenCal.close();return 1');await sleep(300);await js('GardenCal.open({});return 1');await sleep(800);
  await js('document.querySelector(".kb-cal-ta").scrollIntoView({block:"center"});document.getElementById("kb-toast").hidden=true;return 1');
  const after=await js('return document.querySelector(".kb-cal-ta").value');
  check('Bài tiếng Anh 30 từ qua giao diện đóng/mở','giữ nguyên 599 ký tự, 30 từ',after===long,{before:entered.text.length,units:entered.units,after:after.length,text:after,beforeImage:beforeShot},'F02',await shot('f02-bai-viet-sau-mo-lai'));
  // F04: xác nhận DOM composition, không tuyên bố đã thử bộ gõ OS thật.
  await js('const t=document.querySelector(".kb-cal-note");t.focus();t.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true,data:"に"}));return 1');
  await shot('f04-ime-truoc-esc');
  const ime=await js('const t=document.querySelector(".kb-cal-note");t.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",isComposing:true,bubbles:true,cancelable:true}));t.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true,data:"に"}));return {open:GardenCal.isOpen()};');
  check('Esc khi DOM đang composition','Lịch hoa còn mở',ime.open,ime,'F04',await shot('f04-ime-sau-esc'));
  // Nội dung nhật ký không được thực thi HTML.
  await js('GardenCal.open({});return 1');await sleep(650);
  const xss=await js('const t=document.querySelector(".kb-cal-note");t.value="<img src=x onerror=window.__auditXss=1>";t.dispatchEvent(new Event("input",{bubbles:true}));GardenCal.close();return 1');await sleep(250);await js('GardenCal.open({});return 1');await sleep(700);
  const safety=await js('return {text:document.querySelector(".kb-cal-note").value,executed:!!window.__auditXss};');
  check('Nhật ký chứa chuỗi HTML','hiện chữ nguyên, không chạy mã',!safety.executed&&safety.text.includes('<img'),safety);
  await closeAll();
  // F05: 0 là cấu hình hợp lệ, menu phải giữ đúng 0.
  for(const cap of [0,1,40,200]) {
    await py(`kb.save_config(game_daily_coins=${cap});result=1`);await refresh();await js('GardenGames.open();return 1');await sleep(200);
    const label=await js('return document.querySelector(".kb-gmenu-note").textContent;');
    check('Menu trần xu game '+cap,'hiển thị /'+cap+'.',label.includes('/'+cap+'.'),label,cap===0?'F05':'',cap===0?await shot('f05-tran-xu-game-0'):'');await closeAll();
  }
  // F06: so dữ liệu đầu vào tác vụ; không cần gọi dịch vụ AI.
  const predicted=await py('result=kb._village_weather(kb.cal_today().isoformat())');
  for(const weather of ['sunny','rain','snow']) {
    await js(`GardenSky.set('mode','fixed');GardenSky.set('fixedHour',10);GardenSky.set('weather',${JSON.stringify(weather)});GardenPrefs.flush();return 1`);await sleep(120);
    const w=await js('return GardenSky.state().weather');const server=await py('result=kb._village_weather(kb.cal_today().isoformat())');
    const word={sunny:'nắng',rain:'mưa',snow:'tuyết'}[w];
    check('Thời tiết vườn và lời nhắc '+weather,'mô tả trong lời nhắc có thời tiết thủ công đã chọn',!!word&&server.includes(word),{garden:w,prompt:server,predicted},'F06',weather==='snow'?await shot('f06-vuon-tuyet'):'');
  }
  // F07: B đã ra khỏi queue nhưng timer chưa chạy, C làm clearTimeout(timer).
  await js('Garden.toast("AUDIT A",()=>{},5000);Garden.toast("AUDIT B",()=>{},5000);return 1');
  await js('document.getElementById("kb-toast").click();return 1');await sleep(80);
  await js('Garden.toast("AUDIT C",null,5000);return 1');await sleep(350);
  const toast=await js('return document.getElementById("kb-toast").textContent');
  check('Thông báo chen trong khoảng 250 ms','B vẫn đến lượt trước C',toast.includes('AUDIT B'),{visible:toast,sequence:'A → queue B → click A → 80 ms → C → 350 ms'},'F07',await shot('f07-thong-bao-bi-chen'));
  await sleep(5100);const later=await js('return {hidden:document.getElementById("kb-toast").hidden,text:document.getElementById("kb-toast").textContent}');
  check('Thông báo B sau khi C hết hạn','B vẫn được hiển thị',!later.hidden&&later.text.includes('AUDIT B'),later,'F07');
  // F01: thao tác persistence thật; ảnh sau take cho thấy món hiện trở lại.
  for(const room of ['kitchen','bedroom']) {
    const state=await py(`d=st.load();d['home']['house']=7;d['home']['rooms']=['kitchen','bedroom'];st.save(d)
r=st.craft_save({'name':'Mẫu audit '+${JSON.stringify(room)},'kind':'floor','size':16,'fx':'none','px':kb.core.px_encode('r'*256)})
cid=r['craft_id']
st.place(${JSON.stringify(room)},cid,2,1)
result=cid`);
    await refresh();await js(`GardenHome.open();GardenHome.setScene(${JSON.stringify(room)});return 1`);await sleep(250);await shot('f01-'+room+'-truoc-cat');
    const got=await py(`d=st.load();i=next(i for i,e in enumerate(d['home'][${JSON.stringify(room)}]) if e['id']==${JSON.stringify(state)});st.take(${JSON.stringify(room)},i);result=st.load()['home'][${JSON.stringify(room)}]`);
    await refresh();await js(`GardenHome.open();GardenHome.setScene(${JSON.stringify(room)});return 1`);await sleep(250);
    check('Cất đồ tự làm '+room+' qua state thật','không còn id '+state,!got.some(e=>e.id===state),got,'F01',await shot('f01-'+room+'-sau-cat'));await closeAll();
  }
  // Bố cục: 4 cửa sổ × 11 tab. Một ca bao gồm tràn trang, số tab, tab chọn và tab nằm trong viewport.
  const tabs=['build','yard','room','zone','pet','guest','seed','season','wear','craft','inv'];
  for(const [w,h] of [[720,520],[1024,700],[1366,768],[1920,1080]]) {
    await resize(w,h);await closeAll();await js('GardenHome.open();return 1');
    for(const tab of tabs) {
      await js(`GardenHome.setTab(${JSON.stringify(tab)});return 1`);await sleep(120);
      const m=await js(MEASURE);const img=await shot('layout-'+w+'x'+h+'-'+tab);
      check('Bố cục Nhà '+tab+' '+w+'×'+h,'11 tab thấy được, đúng tab, không tràn trang',!m.hidden&&m.active===tab&&m.tabs===11&&m.scroll<=m.client+1&&m.clipped.length===0,m,'',img);
    }await closeAll();
  }
  // Màn chính / lịch / nguồn báo / cài đặt ở các chiều cao khác nhau.
  for(const [w,h] of [[720,520],[1024,640],[1366,768],[1920,1080]]) {
    await resize(w,h);
    for(const screen of ['garden','calendar','games','settings','paper','fields','craft']) {
      await closeAll();
      await js(({garden:'',calendar:'GardenCal.open({});',games:'GardenGames.open();',settings:'document.getElementById("kb-sound").click();',paper:'GardenPaper.open();',fields:'GardenFields.open();',craft:'GardenCraft.open();'})[screen]+'return 1');await sleep(300);
      const m=await js('return {width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,errors:typeof Garden};');
      check('Màn '+screen+' '+w+'×'+h,'không tràn ngang toàn trang',m.scroll<=m.width+1,m,'',await shot('screen-'+w+'x'+h+'-'+screen));
      if(screen==='craft')await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return 1');
    }
  }
  await resize(1366,768);await closeAll();
  // 14 giao diện mùa × ngày/đêm: kiểm tra canvas vẽ được và không có lỗi runtime mới.
  const themes=await py('result=[t["id"] for t in kb.core.season.THEMES]');
  for(const theme of themes) {
    await py(`d=st.load();d['season']['unlocked']=list(set(d['season'].get('unlocked',[])+[${JSON.stringify(theme)}]));d['season']['mode']='pick';d['season']['pick']=${JSON.stringify(theme)};st.save(d);result=1`);await refresh();
    await js('GardenSeason.preview(null);return 1');
    for(const hour of [10,22]) {
      await js(`GardenSky.set('mode','fixed');GardenSky.set('fixedHour',${hour});GardenSky.set('weather','sunny');return 1`);await sleep(150);
      const p=await js('const c=document.getElementById("kb-yard");return {theme:GardenSeason.active(),width:c.width,height:c.height,nonzero:c.getContext("2d").getImageData(10,10,1,1).data[3]};');
      const errs=page.errors.splice(0);
      check('Cảnh mùa '+theme+' lúc '+hour+'h','đúng giao diện, canvas có hình, không lỗi JS mới',p.theme===theme&&p.width>0&&p.height>0&&p.nonzero>0&&errs.length===0,{canvas:p,errors:errs},'',await shot('theme-'+theme+'-'+hour));
    }
  }
  await closeAll();
  console.log(JSON.stringify({total:rows.length,...Object.fromEntries(['PASS','FAIL'].map(s=>[s,rows.filter(r=>r.status===s).length]))}));page.close();process.exit(0);
})().catch(e=>{fs.writeFileSync(path.join(OUT,'logs/ui-script-error.txt'),e.stack);console.error(e);if(page)page.close();process.exit(2);});
