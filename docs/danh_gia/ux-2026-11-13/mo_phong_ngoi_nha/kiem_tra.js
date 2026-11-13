// Chạy từ repo bằng node. Cần HTTP 9956 và Chromium CDP 9955; xem README.md.
const fs = require('fs');
const path = require('path');
const {pages,Page,sleep} = require('../../../../tests/anki/cdp');
const PORT = Number(process.env.KB_DEMO_CDP_PORT || 9955);
const BASE = process.env.KB_DEMO_URL || 'http://127.0.0.1:9956/docs/danh_gia/ux-2026-11-13/mo_phong_ngoi_nha/XEM_THU.html';
const out = __dirname, checks = [], layouts = [];
let page;
async function check(name, expression) {
  const actual = await page.eval(expression);
  checks.push({case:name,pass:actual===true,actual});
}
async function load(scene='rain') {
  await page.send('Page.navigate',{url:BASE+'?scene='+scene});
  let ready=false;
  for(let i=0;i<60;i++){
    await sleep(60);
    if(await page.eval('document.readyState==="complete" && !!window.HomeDemo')){ready=true;break;}
  }
  if(!ready)throw Error('Bản mẫu chưa tải xong.');
  await page.eval('document.fonts.ready.then(()=>true)');
}
async function shot(name) {
  await page.eval('window.scrollTo(0,0);HomeDemo.settle()');
  await page.shot(path.join(out,'anh',name));
}
async function select(id,value) {
  await page.eval('(()=>{const e=document.getElementById('+JSON.stringify(id)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change"));})()');
}
(async()=>{
  const targets=await pages(PORT);if(!targets.length)throw Error('Không thấy trang CDP.');
  page=await Page.open(targets[0].webSocketDebuggerUrl);
  await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await load();
  await page.eval('localStorage.removeItem("kb-home-proposal-v1");localStorage.removeItem("kb-home-moments-v1")');
  await load();
  await check('standalone-no-external-assets','document.querySelectorAll("script[src],link[href]").length===0');
  await check('rain-scene-starts-with-cushion','HomeDemo.moment().id==="rain-cushion"');
  await check('canvas-800x360','document.getElementById("house").width===800&&document.getElementById("house").height===360');
  await shot('01_chieu_mua.png');
  await page.click('[data-prop="cushion"]');
  await check('remove-cushion-changes-cat-behavior','!HomeDemo.state().props.cushion&&HomeDemo.moment().id==="rain-window"&&HomeDemo.moment().cat.pose==="sit"');
  await page.click('[data-prop="cushion"]');
  await page.click('[data-preset="morning"]');
  await shot('02_buoi_sang.png');
  await check('morning-cat-window','HomeDemo.moment().id==="sun-cushion"');
  await page.click('[data-prop="cushion"]');
  await check('morning-with-plant','HomeDemo.moment().id==="sun-plant"');
  await page.click('[data-prop="plant"]');
  await check('no-cushion-no-plant-falls-back','HomeDemo.moment().id==="breakfast"');
  await page.click('[data-prop="cushion"]');await page.click('[data-prop="plant"]');
  await page.click('[data-preset="night"]');
  await check('night-reading-needs-desk-and-lamp','HomeDemo.moment().id==="night-reading"');
  await page.click('[data-prop="lamp"]');
  await check('remove-lamp-removes-reading-scene','HomeDemo.moment().id!=="night-reading"');
  await page.click('[data-prop="lamp"]');await page.click('[data-prop="desk"]');
  await check('remove-desk-removes-reading-scene','HomeDemo.moment().id!=="night-reading"');
  await page.click('[data-prop="desk"]');await shot('03_buoi_toi.png');

  const t0=await page.eval('HomeDemo.animationTime()');await sleep(200);
  checks.push({case:'animation-is-running',pass:(await page.eval('HomeDemo.animationTime()'))>t0});
  await page.click('#motion-toggle');
  const stopped=await page.eval('HomeDemo.animationTime()');await sleep(200);
  checks.push({case:'pause-freezes-animation',pass:(await page.eval('HomeDemo.animationTime()'))===stopped});
  await page.click('#motion-toggle');
  await page.click('#pet-action');
  await check('pet-interaction-has-text-feedback','document.getElementById("character-response").textContent.startsWith("Mochi:")');
  await page.click('#tea-prepare');
  await check('tea-preparation-visible','HomeDemo.moment().id==="preparing-tea"&&document.getElementById("tea-prepare").disabled');
  await sleep(2300);await page.eval('HomeDemo.settle()');
  await check('tea-preparation-finishes','HomeDemo.state().tea&&HomeDemo.moment().id==="tea-night"&&!document.getElementById("tea-prepare").disabled');
  await shot('04_khay_tra.png');
  await page.click('#capture');
  await check('capture-persists-one-photo','HomeDemo.album().length===1&&JSON.parse(localStorage.getItem("kb-home-moments-v1")).length===1');
  await page.click('#capture');
  await check('same-moment-does-not-duplicate','HomeDemo.album().length===1');
  await page.click('#tea-prepare');
  await page.click('[data-preset="morning"]');await page.eval('HomeDemo.settle()');await page.click('#capture');
  await page.click('[data-preset="rain"]');await page.eval('HomeDemo.settle()');await page.click('#capture');
  await page.click('[data-preset="night"]');await page.eval('HomeDemo.settle()');await page.click('#capture');
  await check('different-scenes-create-four-photos','HomeDemo.album().length===4');
  await page.click('#album-open');
  await check('album-opens-as-dialog','document.getElementById("album-dialog").open&&document.querySelectorAll(".photo-card").length===4');
  await page.shot(path.join(out,'anh','05_album.png'));
  await page.click('.photo-card>button');
  await page.eval('document.getElementById("photo-name").value="Một tối đọc sách ở nhà"');
  await page.click('#photo-save');
  await check('rename-photo-persists','JSON.parse(localStorage.getItem("kb-home-moments-v1"))[0].name==="Một tối đọc sách ở nhà"');
  const downloads=fs.mkdtempSync('/tmp/kotoba-home-downloads-');
  await page.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await page.click('#photo-download');
  let downloaded;
  for(let i=0;i<40;i++){await sleep(80);downloaded=fs.readdirSync(downloads).find(f=>f.endsWith('.png'));if(downloaded)break;}
  if(downloaded){
    const png=fs.readFileSync(path.join(downloads,downloaded));
    checks.push({case:'download-real-png-with-caption',pass:png.subarray(1,4).toString()==='PNG'&&png.readUInt32BE(16)===840&&png.readUInt32BE(20)===435,dimensions:[png.readUInt32BE(16),png.readUInt32BE(20)]});
    fs.copyFileSync(path.join(downloads,downloaded),path.join(out,'anh','06_anh_xuat.png'));
  }else checks.push({case:'download-real-png-with-caption',pass:false});
  await page.key('Escape','Escape',27);
  await check('escape-closes-only-top-dialog','!document.getElementById("photo-dialog").open&&document.getElementById("album-dialog").open');
  await page.key('Escape','Escape',27);
  await check('escape-closes-album','!document.getElementById("album-dialog").open');
  await load();
  await check('reload-keeps-album-and-title','HomeDemo.album().length===4&&HomeDemo.album()[0].name==="Một tối đọc sách ở nhà"');
  await page.click('#after-study');
  await check('after-study-is-explicit-demo','!document.getElementById("study-note").hidden&&document.querySelector(".wallet").textContent.includes("1.280")');

  // Một lỗi ghi storage không được hiện thành "đã lưu".
  await page.click('#tea-prepare');await sleep(2300);
  const before=await page.eval('JSON.parse(localStorage.getItem("kb-home-moments-v1")).length');
  await page.eval('window.__originalStore=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="kb-home-moments-v1")throw new DOMException("quota","QuotaExceededError");return window.__originalStore.call(this,k,v)}');
  await page.click('#capture');
  await check('storage-failure-reports-session-only','document.getElementById("capture-status").textContent.includes("chỉ giữ trong phiên")');
  checks.push({case:'storage-failure-preserves-persisted-album',pass:(await page.eval('JSON.parse(localStorage.getItem("kb-home-moments-v1")).length'))===before});
  await page.eval('Storage.prototype.setItem=window.__originalStore');
  await load();
  await check('ephemeral-photo-not-reported-persisted','HomeDemo.album().length===4');

  for(const [width,height] of [[1440,1100],[1366,900],[1024,700],[720,520],[390,844]]){
    await page.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    for(const scene of ['morning','rain','night']){
      await load(scene);
      const layout=await page.eval('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})');
      layouts.push({width,height,scene,...layout,pass:layout.scroll<=layout.client});
      if(width===390&&scene==='rain')await shot('07_dien_thoai.png');
    }
  }
  // Dữ liệu hỏng được bỏ từng phần trong phạm vi localStorage riêng của bản mẫu.
  await page.eval('localStorage.setItem("kb-home-proposal-v1",JSON.stringify({time:"wrong",weather:[],props:{cushion:"false"}}));localStorage.setItem("kb-home-moments-v1",JSON.stringify([{id:"bad",name:"bad",image:"javascript:alert(1)",date:"wrong"}]))');
  await load('rain');
  await check('invalid-local-storage-sanitized','HomeDemo.state().props.cushion===true&&HomeDemo.album().length===0');
  await page.eval('localStorage.removeItem("kb-home-proposal-v1");localStorage.removeItem("kb-home-moments-v1")');
  await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await load();
  const report={scope:'Only the standalone Canvas design prototype; not product regression tests.',checkedAt:'2026-11-13',checks,layouts,runtimeErrors:page.errors};
  fs.writeFileSync(path.join(out,'kiem_tra.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.pass).length,layouts:layouts.length,layoutPassed:layouts.filter(c=>c.pass).length,runtimeErrors:page.errors,failed:checks.filter(c=>!c.pass)},null,2));
  const ok=checks.every(c=>c.pass)&&layouts.every(c=>c.pass)&&!page.errors.length;
  page.close();process.exit(ok?0:1);
})().catch(e=>{console.error(e);if(page)page.close();process.exit(1);});
