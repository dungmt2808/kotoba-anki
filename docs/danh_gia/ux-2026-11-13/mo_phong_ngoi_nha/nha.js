/* Mô phỏng độc lập: toàn bộ cảnh vẽ bằng mã Canvas, không gọi Anki/Gemini. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const W = 800, H = 360, PREF_KEY = 'kb-home-proposal-v1', ALBUM_KEY = 'kb-home-moments-v1';
  const DEFAULT_PROPS = { cushion:true, desk:true, lamp:true, kotatsu:true, plant:true };
  const PRESETS = {
    morning:{time:'morning',weather:'clear'},
    rain:{time:'afternoon',weather:'rain'},
    night:{time:'night',weather:'clear'}
  };
  const FURNITURE = [
    {id:'cushion',name:'Đệm bên cửa sổ',hint:'Một chỗ êm cho Mochi',sprite:'rug'},
    {id:'desk',name:'Bàn đọc sách',hint:'StackChan có chỗ đọc tiếp',sprite:'desk'},
    {id:'lamp',name:'Đèn đọc sách',hint:'Một góc sáng vào buổi tối',sprite:'lamp'},
    {id:'kotatsu',name:'Bàn kotatsu',hint:'Một chỗ trú ấm khi trời lạnh',sprite:'kotatsu'},
    {id:'plant',name:'Chậu cây nhỏ',hint:'Có thêm một việc chăm chút',sprite:'plant'}
  ];
  const canvas = $('house'), ctx = canvas.getContext('2d');
  const world = document.createElement('canvas'); world.width = W; world.height = H;
  const wc = world.getContext('2d');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = {time:'afternoon',weather:'rain',props:{...DEFAULT_PROPS},tea:false,paused:prefersReduced};
  let variant = 0, preparing = false, teaTimer = null, teaToken = 0;
  let lastFrame = 0, motionTime = 0, lastPaint = 0, started = false, studied = false;
  let bubble = null, toastTimer, album = [], activePhoto = null;
  const actors = {cat:{x:417,y:279},robot:{x:476,y:258}};
  const cache = new Map();
  const ink = '#1b1b2f';
  let assetsReady = false;

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function storeJSON(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch (_) { return false; } }
  const old = readJSON(PREF_KEY);
  if (old && typeof old === 'object') {
    if (['morning','afternoon','night'].includes(old.time)) state.time = old.time;
    if (['clear','rain','snow'].includes(old.weather)) state.weather = old.weather;
    for (const id of Object.keys(DEFAULT_PROPS)) if (typeof old.props?.[id] === 'boolean') state.props[id] = old.props[id];
    if (typeof old.tea === 'boolean') state.tea = old.tea;
    if (typeof old.paused === 'boolean') state.paused = old.paused || prefersReduced;
  }
  const queryScene = new URLSearchParams(location.search).get('scene');
  if (PRESETS[queryScene]) Object.assign(state,PRESETS[queryScene]);
  const oldAlbum = readJSON(ALBUM_KEY);
  if (Array.isArray(oldAlbum)) {
    const keys = new Set();
    for (const item of oldAlbum.slice(0,24)) {
      if (!item || typeof item.id !== 'string' || keys.has(item.id) || typeof item.name !== 'string' ||
          typeof item.image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(item.image) ||
          item.image.length > 700000 || typeof item.date !== 'string') continue;
      keys.add(item.id); album.push({id:item.id,name:item.name.slice(0,64),image:item.image,date:item.date.slice(0,64),scene:String(item.scene || '').slice(0,64)});
    }
  }
  function tell(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; },4500);
  }
  function persistPrefs() {
    if (!storeJSON(PREF_KEY,state)) tell('Chưa lưu được lựa chọn. Cậu vẫn có thể thử cảnh trong phiên này.');
  }
  function fill(c,x,y,w,h,color) { c.fillStyle = color; c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h)); }
  function frame(c,x,y,w,h,color,border=2) {
    fill(c,x,y,w,h,ink); fill(c,x+border,y+border,w-border*2,h-border*2,color);
  }
  function pixelDisc(c,x,y,r,color) {
    c.fillStyle = color;
    for (let dy=-r;dy<=r;dy+=2) { const span = Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy))/2)*2; c.fillRect(Math.round(x-span),Math.round(y+dy),span*2,2); }
  }
  function spriteCanvas(rows,palette,key) {
    if (!rows) return null;
    if (!cache.has(key)) {
      const cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length;
      const c = cv.getContext('2d');
      rows.forEach((row,y) => Array.from(row).forEach((ch,x) => { if (palette[ch]) fill(c,x,y,1,1,palette[ch]); }));
      cache.set(key,cv);
    }
    return cache.get(key);
  }
  function spr(c,id,x,y,scale=2) {
    const cv = spriteCanvas(HomeSprites.sprites[id],HomeSprites.palette,id);
    if (cv) { c.imageSmoothingEnabled = false; c.drawImage(cv,Math.round(x),Math.round(y),cv.width*scale,cv.height*scale); }
  }
  function shadow(c,x,y,w) { c.save(); c.globalAlpha=.15; fill(c,x,y,w,4,ink); c.restore(); }
  function cat(c,x,y,pose,flip=false) {
    const cv = spriteCanvas(HomeSprites.pets.neko[pose],HomeSprites.petPalette,'neko-'+pose);
    if (!cv) return;
    c.save(); c.imageSmoothingEnabled=false; c.translate(Math.round(x),Math.round(y));
    if (flip) { c.translate(32,0); c.scale(-1,1); }
    c.drawImage(cv,0,-cv.height*2,32,cv.height*2); c.restore();
  }
  function robot(c,x,y,mode,t) {
    x = Math.round(x); y = Math.round(y);
    const bob = mode === 'walk' ? (Math.floor(t/280)%2)*2 : 0;
    c.save(); c.translate(x,y-bob);
    shadow(c,-2,0,32);
    fill(c,3,-19,23,16,ink); fill(c,5,-17,19,12,'#cbd4d7');
    fill(c,5,-16,19,4,'#f7f6e9'); fill(c,9,-11,10,4,'#9ba6b2');
    fill(c,5,-3,6,4,ink); fill(c,19,-3,6,4,ink);
    frame(c,0,-43,30,26,'#e7e7e0'); fill(c,4,-39,22,17,ink);
    const blink = Math.floor(t/170)%31 === 0;
    fill(c,8,-34,4,blink?2:5,'#fff'); fill(c,19,-34,4,blink?2:5,'#fff');
    fill(c,10,-25,11,2,'#fff');
    fill(c,-3,-16,5,10,'#aeb9c1'); fill(c,28,-16,5,10,'#aeb9c1');
    if (mode === 'tea' || mode === 'prepare') { frame(c,14,-13,12,9,'#f8e4b4',1); fill(c,16,-14,8,2,'#ad6f3b'); }
    if (mode === 'water') { frame(c,25,-13,13,10,'#7ba9a7',1); fill(c,36,-16,3,6,'#7ba9a7'); }
    c.restore();
  }
  function steam(c,x,y,t) {
    for (let i=0;i<3;i++) {
      const phase = ((t/900+i*.37)%1), off = Math.round(Math.sin(phase*5+i)*3);
      c.save(); c.globalAlpha=(1-phase)*.65; fill(c,x+off+i*4,y-phase*17,3,5,'#fff8dc'); c.restore();
    }
  }
  function book(c,x,y,t) {
    frame(c,x,y,25,15,'#f7f0d1',1); fill(c,x+12,y+1,1,13,'#a09176');
    fill(c,x+3,y+4,6,1,'#938971'); fill(c,x+15,y+4,7,1,'#938971');
    fill(c,x+3,y+8,7,1,'#938971'); fill(c,x+15,y+8,5,1,'#938971');
    if (Math.floor(t/3500)%2) fill(c,x+14,y+2,1,11,'#d9cdb0');
  }

  function scenesFor(s) {
    const result = [], p = s.props;
    function add(id,title,description,catX,catY,pose,robotX,robotY,mode) {
      result.push({id,title,description,cat:{x:catX,y:catY,pose},robot:{x:robotX,y:robotY,mode}});
    }
    if (s.tea) {
      add('tea-'+s.time,'Một khay trà, một buổi thong thả.','StackChan mang trà ra. Mochi chọn một chỗ gần cậu ấy.',
        p.cushion?417:390,p.cushion?279:296,'sleep',p.kotatsu?357:157,p.kotatsu?280:272,'tea');
    }
    if (s.weather === 'snow' && p.kotatsu) {
      add('snow-kotatsu','Ngoài kia có tuyết.','Trong nhà vẫn ấm. Mochi thò đầu ra khỏi bàn kotatsu.',407,303,'sleep',357,280,'tea');
    }
    if (s.time === 'night') {
      if (p.desk && p.lamp) add('night-reading','Đọc thêm vài trang rồi nghỉ.','Đèn sáng ở bàn đọc sách. Mochi đã bắt đầu buồn ngủ.',
        p.kotatsu?407:(p.cushion?417:636),p.kotatsu?303:(p.cushion?279:275),'sleep',476,256,'read');
      if (p.kotatsu) add('night-kotatsu','Chỗ ấm nhất trong nhà.','Mochi cuộn mình bên kotatsu, StackChan ngồi nghỉ cùng.',407,303,'sleep',357,280,'tea');
      add('night-window','Một tối yên tĩnh.','StackChan ngắm trời đêm. Mochi đã lên giường ngủ.',636,275,'sleep',392,255,'look');
    } else if (s.weather === 'rain') {
      add(p.cushion?'rain-cushion':'rain-window','Mưa ngoài cửa, ấm trong nhà.',
        p.cushion?'Mochi nằm trên đệm nghe mưa. StackChan ngắm những giọt nước trên kính.':'Mochi ngồi cạnh cửa sổ. StackChan ngắm mưa ngoài vườn.',
        p.cushion?417:398,p.cushion?279:294,p.cushion?'sleep':'sit',367,257,'look');
      if (p.desk) add('rain-reading','Cuốn sách còn đọc dở.','Mưa là tiếng nền cho buổi đọc sách. Mochi nằm gần đó.',
        p.cushion?417:398,p.cushion?279:294,'sleep',476,256,'read');
      if (p.kotatsu) add('rain-kotatsu','Ngồi nghe mưa một chút.','Mochi tìm đến kotatsu. StackChan cũng chọn nghỉ ở đây.',407,303,'sleep',357,280,'tea');
    } else {
      if (p.cushion) add('sun-cushion','Nắng vừa đến bên cửa sổ.','Mochi chiếm chiếc đệm đầy nắng. StackChan mở đầu ngày chậm rãi.',417,279,'sit',367,257,'look');
      if (p.plant) add('sun-plant','Chăm một chậu cây nhỏ.','StackChan tưới chậu cây. Mochi tò mò nhìn những giọt nước.',332,289,'sit',317,264,'water');
      add('breakfast','Bữa sáng vẫn còn ấm.','StackChan ghé bếp. Mochi ngồi đợi gần chiếc bàn nhỏ.',193,286,'sit',147,269,'tea');
    }
    return result;
  }
  function modelFor(s=state,v=variant) {
    const list = scenesFor(s), model = list[v%list.length];
    if (preparing && s === state) return {...model,id:'preparing-tea',title:'Một ấm trà đang được chuẩn bị.',description:'StackChan ghé bếp đun nước. Mochi đang chờ ở phòng chính.',robot:{x:171,y:233,mode:'prepare'}};
    return model;
  }
  function sky(c,s,t) {
    const night = s.time === 'night', wet = s.weather !== 'clear';
    const colors = night?['#29395e','#536187','#6e778e']:wet?['#8498b0','#a6b3bf','#b8c3c0']:['#82cdf2','#b4e2f5','#d9e8bd'];
    fill(c,0,0,W,H,colors[0]); fill(c,0,76,W,55,colors[1]); fill(c,0,124,W,44,colors[2]);
    if (night) {
      pixelDisc(c,695,38,12,'#fff0bc'); pixelDisc(c,700,33,10,colors[0]);
      for (let i=0;i<26;i++) { const x=(i*109+42)%800, y=(i*31+11)%95; if (i%3 || Math.floor(t/1600)%2) fill(c,x,y,2,2,'#e9dfb7'); }
    } else if (!wet) {
      pixelDisc(c,683,37,15,'#ffe5a2');
      [40,173,487].forEach((x,i) => { fill(c,x,28+i*9,47,8,'#e9f6f5'); fill(c,x+12,21+i*9,24,7,'#e9f6f5'); });
    }
    for (let x=0;x<W;x+=4) {
      const y=142+Math.round(Math.sin(x/49)*9+Math.cos(x/21)*3);
      fill(c,x,y,4,H-y,night?'#41604c':wet?'#6c946e':'#7ca65d');
    }
    fill(c,0,253,W,147,night?'#45604c':wet?'#819d6b':'#95b962');
    for (let i=0;i<170;i++) {
      const x=(i*127)%W, y=256+(i*43)%144;
      fill(c,x,y,2,i%3?2:4,night?'#577356':wet?'#92aa7e':'#afc878');
    }
    if (s.weather !== 'clear') weather(c,s,t,false);
  }
  function weather(c,s,t,foreground) {
    if (s.weather === 'clear') return;
    c.save(); if (foreground) { c.beginPath(); c.rect(0,332,W,68); c.clip(); }
    if (s.weather === 'rain') {
      for (let i=0;i<64;i++) {
        const x=((i*97+t*.025)%840)-20, y=(i*43+t*.105)%430-15;
        c.globalAlpha=.38+(i%3)*.1; fill(c,x,y,1,7+(i%3)*2,'#d1e6ee'); fill(c,x-1,y+7,1,3,'#d1e6ee');
      }
    } else {
      for (let i=0;i<43;i++) {
        const x=(i*97+Math.sin(t/2200+i)*7)%W, y=(i*41+t*.018)%420-10;
        c.globalAlpha=.7; fill(c,x,y,2,2,'#edf1ec'); if (i%4===0) { fill(c,x-1,y+1,4,1,'#fff'); fill(c,x+1,y-1,1,4,'#fff'); }
      }
    }
    c.restore();
  }
  function windowView(c,s,t) {
    frame(c,344,116,112,76,'#ad764e',3);
    const night=s.time==='night', wet=s.weather!=='clear';
    fill(c,349,121,102,66,night?'#334b70':wet?'#99b7c8':'#a5e0f7');
    fill(c,349,161,102,26,night?'#486b61':wet?'#749b81':'#8abb77');
    for (let x=349;x<451;x+=3) fill(c,x,159+Math.round(Math.sin(x/13)*4),3,12,night?'#3a5a57':'#61956b');
    if (night) { pixelDisc(c,430,136,7,'#f5e3a3'); pixelDisc(c,433,133,6,'#334b70'); fill(c,369,130,2,2,'#e9e6c2'); }
    else if (!wet) { fill(c,362,132,20,4,'#eefbfb'); fill(c,368,127,12,5,'#eefbfb'); }
    if (wet) {
      c.save(); c.beginPath(); c.rect(349,121,102,66); c.clip();
      for (let i=0;i<18;i++) {
        const x=350+(i*17)%99, y=119+(i*23+t*(s.weather==='snow'?.012:.025))%70;
        fill(c,x,y,s.weather==='snow'?2:1,s.weather==='snow'?2:7,'#e1eff1');
      } c.restore();
    }
    fill(c,395,120,5,68,'#fff5d9'); fill(c,349,151,102,4,'#fff5d9');
    fill(c,338,111,124,4,'#855235');
    fill(c,334,115,10,74,'#d98088'); fill(c,456,115,10,74,'#d98088');
    for (let i=0;i<4;i++) { fill(c,334+i*3,117,1,69,'#e6a0a0'); fill(c,456+i*3,117,1,69,'#e6a0a0'); }
    fill(c,339,189,124,5,'#a97147');
    spr(c,'plant',351,166,1);
  }
  function houseShell(c,s,t) {
    // Ba gian cùng nền gỗ; chỉ phòng chính có cửa sổ, theo thiết kế 1.25.
    shadow(c,43,326,716);
    frame(c,48,92,704,236,'#fff0d3',3);
    [54,264,544].forEach((x,index) => {
      const rw=index===1?274:202;
      fill(c,x,99,rw,101,'#ffe4c3');
      for (let px=x+6;px<x+rw;px+=15) fill(c,px,101,2,85,'#f5d4b5');
      fill(c,x,182,rw,16,'#d7b58b'); fill(c,x,184,rw,2,'#f2d9ad'); fill(c,x,196,rw,4,'#b48458');
      fill(c,x,200,rw,122,'#d79f68');
      for (let row=0;row<7;row++) {
        const y=201+row*18;
        fill(c,x,y,rw,2,'#b78352');
        for (let px=x+(row%2?36:3);px<x+rw;px+=73) {
          fill(c,px,y+2,2,16,'#b78352'); fill(c,px+5,y+5,29,1,'#e7b780'); fill(c,px+13,y+11,17,1,'#c9925b');
        }
      }
    });
    // Bếp có một mảng gạch nhấn, không thêm cửa sổ bên.
    fill(c,60,151,192,45,'#ede9dd');
    for (let y=152;y<196;y+=11) { fill(c,60,y,192,1,'#b9b9b4'); for (let x=60+(y%2?0:8);x<252;x+=23) fill(c,x,y,1,11,'#c3c5be'); }
    windowView(c,s,t);
    for (const x of [48,256,536,744]) { frame(c,x,94,8,235,'#a36c42',2); fill(c,x+3,98,2,222,'#d49d66'); }
    fill(c,43,89,714,11,'#714b30'); fill(c,43,89,714,3,'#d49c65'); fill(c,42,323,716,8,'#65554a'); fill(c,42,323,716,3,'#bba28b');
    // Mái ngắn để dành chiều cao cho sinh hoạt trong nhà.
    frame(c,29,57,742,34,'#d86b75',2);
    for (let y=61;y<88;y+=8) {
      fill(c,32,y,736,2,'#b44957');
      for (let x=32+(y%3)*8;x<766;x+=25) fill(c,x,y+3,2,2,'#f09b98');
    }
    fill(c,29,88,742,5,'#543d30');
    // Tủ, tranh và chi tiết nền.
    spr(c,'shokkidana',199,115,2); spr(c,'painting',283,119,2);
    spr(c,'clock',486,121,2); spr(c,'hoshizora',619,116,2);
    spr(c,'shelf',275,169,2); spr(c,'calendar',562,120,2);
    spr(c,'reizouko',75,174,2); spr(c,'nagashi',119,177,2);
    spr(c,'suihanki',202,208,2); spr(c,'yasaikago',75,278,2);
    spr(c,'tansu',559,190,2); spr(c,'kyodai',696,189,2);
    fill(c,371,331,58,5,'#c1b7a2'); fill(c,365,336,70,5,'#797a76'); fill(c,365,336,70,2,'#d0c5aa');
    if (s.time==='morning' && s.weather==='clear') {
      c.save(); c.globalAlpha=.18; c.fillStyle='#fff8bc'; c.beginPath(); c.moveTo(351,198); c.lineTo(451,198); c.lineTo(496,318); c.lineTo(390,318); c.fill(); c.restore();
    }
  }
  function renderWorld(c,s,t,positions,model) {
    c.imageSmoothingEnabled=false; sky(c,s,t); houseShell(c,s,t);
    const objects = [];
    const add = (z,draw) => objects.push({z,draw});
    add(278,() => { shadow(c,126,278,61); spr(c,'shokutaku',126,251,2); });
    if (s.props.plant) add(267,() => { shadow(c,294,264,38); spr(c,'bonsai',294,225,2); });
    if (s.props.cushion) add(272,() => { frame(c,414,270,48,13,'#c8878f',2); fill(c,417,272,42,6,'#ebadb2'); fill(c,421,273,6,2,'#f7d1c2'); });
    if (s.props.lamp) add(259,() => { spr(c,'lamp',446,225,2); });
    add(295,() => { spr(c,'beddo',620,263,2); });
    add(283,() => { spr(c,'nightlamp',583,254,2); });
    add(307,() => { spr(c,'dakimakura',684,286,2); });
    const catAt = positions.cat, robotAt = positions.robot;
    const moving = Math.hypot(catAt.x-model.cat.x,catAt.y-model.cat.y)>2;
    add(catAt.y,() => {
      shadow(c,catAt.x+2,catAt.y,29);
      cat(c,catAt.x,catAt.y,moving?(Math.floor(t/270)%2?'walk0':'walk1'):model.cat.pose,model.cat.x<catAt.x);
      if (!moving && model.cat.pose==='sleep') {
        c.fillStyle='#7c87a2'; c.font='9px monospace'; c.fillText(Math.floor(t/1300)%2?'z':'Z',catAt.x+28,catAt.y-31);
      }
    });
    add(robotAt.y,() => robot(c,robotAt.x,robotAt.y,Math.hypot(robotAt.x-model.robot.x,robotAt.y-model.robot.y)>2?'walk':model.robot.mode,t));
    if (s.props.desk) add(266,() => { shadow(c,469,263,34); spr(c,'desk',468,237,2); });
    if (s.props.kotatsu) add(308,() => { shadow(c,342,306,64); spr(c,'kotatsu',342,273,2); });
    objects.sort((a,b)=>a.z-b.z).forEach(o=>o.draw());
    if (model.robot.mode==='read' && s.props.desk) book(c,470,235,t);
    if (s.tea) {
      spr(c,'tea',s.props.kotatsu?362:145,s.props.kotatsu?263:240,1);
      steam(c,s.props.kotatsu?371:154,s.props.kotatsu?270:245,t);
    }
    if (preparing && s===state) steam(c,140,176,t);
    if (model.robot.mode==='water') {
      for (let i=0;i<3;i++) fill(c,robotAt.x+34+i*2,robotAt.y-3+((t/110+i*3)%10),1,2,'#7eb7d0');
    }
    if (s.time==='night') {
      c.save(); c.globalAlpha=.26; fill(c,0,0,W,H,'#1c284d'); c.restore();
      c.save(); c.globalAlpha=.075; fill(c,56,101,198,219,'#ffc88b'); fill(c,264,101,270,219,'#ffc88b'); fill(c,544,101,198,219,'#ffc88b'); c.restore();
      if (s.props.lamp) {
        for (const [r,a] of [[58,.06],[42,.08],[26,.13]]) { c.save(); c.globalAlpha=a; pixelDisc(c,456,243,r,'#ffdc8c'); c.restore(); }
        c.save();c.globalAlpha=.12;c.fillStyle='#ffe5a3';c.beginPath();c.moveTo(450,228);c.lineTo(463,228);c.lineTo(489,277);c.lineTo(426,277);c.fill();c.restore();
        fill(c,449,225,13,3,'#ffe4a0'); fill(c,450,228,11,2,'#f8c86f');
      }
      fill(c,589,258,8,9,'#f6d58c');
      [629,641,653,665,677].forEach((x,i)=>fill(c,x,130+(i%2)*3,2,3,Math.floor(t/1600+i)%3?'#ecd395':'#a18d7e'));
    }
    // Vườn và lối vào trước nhà; mưa chỉ vẽ ngoài phòng.
    fill(c,365,343,70,57,s.time==='night'?'#817764':'#c3b18d');
    for (let y=345;y<400;y+=16) { fill(c,365,y,70,2,s.time==='night'?'#696556':'#a79574'); fill(c,389+(y%3)*9,y+3,2,12,s.time==='night'?'#696556':'#b29d7c'); }
    spr(c,'flowers',17,309,2); spr(c,'flowers',748,311,2);
    for (let x=73;x<290;x+=37) spr(c,'fence',x,330,2);
    for (let x=500;x<716;x+=37) spr(c,'fence',x,330,2);
    if (s.weather==='snow') { fill(c,31,56,738,3,'#ecf0e5'); fill(c,49,328,704,2,'#d7e1d6'); }
    weather(c,s,t,true);
    if (bubble && s===state && t<bubble.until) {
      const a=bubble.who==='cat'?catAt:robotAt, bx=Math.max(50,Math.min(641,a.x-34)), by=a.y-82;
      frame(c,bx,by,130,28,'#fff9e6',2); fill(c,bx+40,by+27,6,5,ink); fill(c,bx+42,by+27,3,2,'#fff9e6');
      c.font='10px "Noto Sans",sans-serif'; c.fillStyle=ink; c.fillText(bubble.text,bx+8,by+18);
    }
  }

  function advance(model,dt) {
    for (const who of ['cat','robot']) {
      const a=actors[who], b=model[who], distance=Math.hypot(a.x-b.x,a.y-b.y);
      if (!started || state.paused) { a.x=b.x; a.y=b.y; continue; }
      const step=Math.min(1,dt*(who==='cat'?38:32)/Math.max(1,distance));
      a.x+=(b.x-a.x)*step; a.y+=(b.y-a.y)*step;
    }
    started=true;
  }
  function draw(now=performance.now(),snap=false) {
    const model=modelFor();
    if (snap) for (const who of ['cat','robot']) Object.assign(actors[who],{x:model[who].x,y:model[who].y});
    renderWorld(wc,state,motionTime,actors,model);
    ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H); ctx.drawImage(world,0,0);
  }
  function loop(now) {
    const dt=lastFrame?Math.min(.08,(now-lastFrame)/1000):0; lastFrame=now;
    if (!document.hidden && !state.paused) { motionTime+=dt*1000; advance(modelFor(),dt); }
    if (!document.hidden && !state.paused && now-lastPaint>65) { draw(now); lastPaint=now; }
    requestAnimationFrame(loop);
  }
  function paintIcon(cv,id) {
    const c=cv.getContext('2d'), rows=HomeSprites.sprites[id];
    const art=spriteCanvas(rows,HomeSprites.palette,id);
    if (!art) return;
    c.clearRect(0,0,cv.width,cv.height); c.imageSmoothingEnabled=false;
    const scale=Math.max(1,Math.floor(Math.min((cv.width-4)/art.width,(cv.height-4)/art.height)));
    c.drawImage(art,Math.floor((cv.width-art.width*scale)/2),Math.floor((cv.height-art.height*scale)/2),art.width*scale,art.height*scale);
  }
  function paintPreviews() {
    const tmp=document.createElement('canvas'); tmp.width=W;tmp.height=H; const c=tmp.getContext('2d');
    document.querySelectorAll('[data-preset]').forEach(button=>{
      const s={...state,...PRESETS[button.dataset.preset],tea:false}, model=modelFor(s,0);
      renderWorld(c,s,1800,{cat:model.cat,robot:model.robot},model);
      const target=button.querySelector('canvas'), dc=target.getContext('2d'); dc.imageSmoothingEnabled=false;
      dc.drawImage(tmp,0,45,800,310,0,0,target.width,target.height);
    });
  }
  function sync() {
    const model=modelFor();
    $('time-select').value=state.time; $('weather-select').value=state.weather;
    $('garden-clock').textContent=({morning:'09:20',afternoon:'16:40',night:'20:30'}[state.time])+' · '+({clear:'Quang đãng',rain:'Trời mưa',snow:'Có tuyết'}[state.weather]);
    $('scene-chip').textContent=({morning:'Buổi sáng',afternoon:'Buổi chiều',night:'Buổi tối'}[state.time])+' · '+({clear:'Trời trong',rain:'Mưa nhẹ',snow:'Tuyết'}[state.weather]);
    $('moment-title').textContent=model.title; $('moment-description').textContent=model.description;
    canvas.setAttribute('aria-label',model.title+' '+model.description+' Dùng các nút dưới cảnh để chào nhân vật.');
    $('saved-mark').hidden=!album.some(a=>a.scene===model.id);
    $('album-count').textContent=String(album.length);
    $('motion-toggle').textContent=state.paused?'Tiếp tục chuyển động':'Dừng chuyển động';
    $('motion-toggle').setAttribute('aria-pressed',String(state.paused));
    $('tea-prepare').textContent=preparing?'Đang pha trà…':state.tea?'Cất khay trà':'Chuẩn bị trà';
    $('tea-prepare').disabled=preparing; $('tea-prepare').classList.toggle('selected',state.tea);
    $('tea-prepare').setAttribute('aria-pressed',String(state.tea));
    $('tea-status').textContent=preparing?'StackChan đang ở bếp.':state.tea?'Trà đã sẵn sàng. Cậu có thể chụp khoảnh khắc này.':'Một nghi thức nhỏ, không thêm việc hằng ngày.';
    document.querySelectorAll('[data-prop]').forEach(b=>b.setAttribute('aria-pressed',String(state.props[b.dataset.prop])));
    document.querySelectorAll('[data-preset]').forEach(b=>{
      const p=PRESETS[b.dataset.preset], selected=p.time===state.time && p.weather===state.weather;
      b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected));
    });
    if (assetsReady) { paintPreviews(); draw(performance.now(),state.paused); }
  }
  function change(patch) { Object.assign(state,patch); variant=0; bubble=null; persistPrefs(); sync(); }
  function talk(who) {
    const message=who==='cat'?(state.time==='night'?'Chỗ này ấm ghê.':'Ở đây với tớ nhé.'):(studied?'Học xong rồi, nghỉ nhé.':state.tea?'Trà còn ấm đấy.':'Mừng cậu về nhà.');
    bubble={who,text:message,until:motionTime+3800};
    $('character-response').textContent=(who==='cat'?'Mochi: ':'StackChan: ')+message;
    draw();
  }
  function prepareTea() {
    if (preparing) return;
    if (state.tea) { state.tea=false; variant=0; persistPrefs(); sync(); return; }
    preparing=true; state.tea=true; variant=0; const token=++teaToken; sync();
    teaTimer=setTimeout(()=>{
      if (token!==teaToken) return;
      preparing=false; persistPrefs(); sync(); talk('robot');
    },state.paused?0:2100);
  }
  function dateText(iso) {
    const date=new Date(iso);
    return Number.isNaN(date.getTime())?'Kỷ niệm trong vườn':date.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'});
  }
  function capture(openAlbumAfter=false) {
    const model=modelFor();
    if (album.some(a=>a.scene===model.id)) { tell('Khoảnh khắc này đã ở trong album. Thử đổi cảnh hoặc đồ vật nhé.'); if(openAlbumAfter) openAlbum(); return false; }
    if (album.length>=24) { tell('Album đã có 24 ảnh. Tải ảnh rồi xóa một ảnh nếu muốn lưu thêm.'); return false; }
    draw();
    const image=canvas.toDataURL('image/png');
    const item={id:'moment-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),name:model.title.slice(0,64),image,date:new Date().toISOString(),scene:model.id};
    const next=[item,...album], stored=storeJSON(ALBUM_KEY,next); album=next;
    $('capture-status').textContent=stored?'Đã lưu ảnh trong trình duyệt này. Mở Khoảnh khắc để xem.':'Ảnh chỉ giữ trong phiên này vì trình duyệt chưa lưu được. Hãy tải PNG.';
    $('album-storage').textContent=stored?'Album chỉ lưu ở trình duyệt này. Tải ảnh để giữ riêng.':'Chưa lưu được album trên máy. Hãy tải ảnh trước khi đóng trang.';
    const flash=document.querySelector('.camera-flash'); flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash');
    sync(); renderAlbum(); if(openAlbumAfter) openAlbum();
    tell(stored?'Đã giữ lại một buổi ở nhà.':'Đã chụp. Mở album và tải ảnh để giữ lại.');
    return true;
  }
  function renderAlbum() {
    const grid=$('album-grid'); grid.textContent=''; $('album-empty').hidden=album.length>0; grid.hidden=album.length===0;
    album.forEach(item=>{
      const card=document.createElement('article'); card.className='photo-card';
      const open=document.createElement('button'); open.setAttribute('aria-label','Xem ảnh: '+item.name);
      const image=document.createElement('img'); image.src=item.image; image.alt=item.name; open.appendChild(image);
      const title=document.createElement('h3'); title.textContent=item.name; open.appendChild(title);
      open.addEventListener('click',()=>openPhoto(item.id));
      const date=document.createElement('p'); date.textContent=dateText(item.date);
      const actions=document.createElement('div'); actions.className='photo-actions';
      [['Xem & đặt tên',()=>openPhoto(item.id)],['Tải PNG',()=>download(item)],['Xóa ảnh',()=>removePhoto(item.id)]].forEach(([label,fn])=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',fn);actions.appendChild(b);});
      card.append(open,date,actions); grid.appendChild(card);
    });
  }
  function openAlbum() { renderAlbum(); if(!$('album-dialog').open) $('album-dialog').showModal(); }
  function openPhoto(id) {
    const item=album.find(a=>a.id===id); if(!item) return; activePhoto=id;
    $('photo-heading').textContent=item.name; $('photo-name').value=item.name; $('photo-image').src=item.image;
    $('photo-image').alt=item.name; $('photo-date').textContent=dateText(item.date);
    $('photo-dialog').showModal();
  }
  function removePhoto(id) {
    const previous=album.find(a=>a.id===id); if(!previous) return;
    const next=album.filter(a=>a.id!==id);
    if (!storeJSON(ALBUM_KEY,next)) { tell('Chưa lưu được thay đổi album. Ảnh vẫn được giữ.'); return; }
    album=next; renderAlbum(); sync(); tell('Đã xóa ảnh khỏi album của bản mẫu.');
  }
  function download(item) {
    const cv=document.createElement('canvas'); cv.width=W+40;cv.height=H+75;
    const c=cv.getContext('2d'); fill(c,0,0,W+40,H+75,'#fff9e8'); frame(c,17,17,W+6,H+6,'#fff9e8',3);
    const img=new Image();
    img.onload=()=>{
      c.imageSmoothingEnabled=false; c.drawImage(img,20,20,W,H);
      c.fillStyle=ink;c.font='bold 17px "Noto Sans",sans-serif';
      let name=item.name;while(c.measureText(name).width>620 && name.length>3) name=name.slice(0,-2);
      c.fillText(name+(name!==item.name?'…':''),22,H+49);
      c.font='12px "Noto Sans",sans-serif';c.fillStyle='#635f62';c.fillText(dateText(item.date),725,H+49);
      const link=document.createElement('a');link.href=cv.toDataURL('image/png');link.download='kotoba-khoanh-khac-'+item.id.slice(7)+'.png';link.click();
    };img.src=item.image;
  }
  function setup() {
    for (const item of FURNITURE) {
      const b=document.createElement('button'); b.className='furniture-item'; b.dataset.prop=item.id; b.setAttribute('aria-pressed',String(state.props[item.id]));
      const cv=document.createElement('canvas');cv.width=34;cv.height=34;cv.setAttribute('aria-hidden','true');paintIcon(cv,item.sprite);
      const text=document.createElement('span'), name=document.createElement('b'), hint=document.createElement('small'); name.textContent=item.name;hint.textContent=item.hint;text.append(name,hint);
      const tick=document.createElement('i');tick.className='tick';tick.setAttribute('aria-hidden','true');b.append(cv,text,tick);
      b.addEventListener('click',()=>{state.props[item.id]=!state.props[item.id];variant=0;bubble=null;persistPrefs();sync();});$('furniture-list').appendChild(b);
    }
    paintIcon($('tea-icon'),'tea'); assetsReady=true;
    $('time-select').addEventListener('change',()=>change({time:$('time-select').value}));
    $('weather-select').addEventListener('change',()=>change({weather:$('weather-select').value}));
    document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>change(PRESETS[b.dataset.preset])));
    $('motion-toggle').addEventListener('click',()=>change({paused:!state.paused}));
    $('pet-action').addEventListener('click',()=>talk('cat')); $('robot-action').addEventListener('click',()=>talk('robot'));
    $('next-moment').addEventListener('click',()=>{variant++;bubble=null;sync();});
    $('tea-prepare').addEventListener('click',prepareTea); $('capture').addEventListener('click',()=>capture());
    $('album-open').addEventListener('click',openAlbum); $('help-open').addEventListener('click',()=>$('help-dialog').showModal());
    document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
    $('capture-from-album').addEventListener('click',()=>{capture();renderAlbum();});
    $('photo-save').addEventListener('click',()=>{
      const name=$('photo-name').value.trim().slice(0,64); if(!name){$('photo-name').focus();tell('Đặt một tên ngắn cho kỷ niệm nhé.');return;}
      const next=album.map(a=>a.id===activePhoto?{...a,name}:a);
      if(!storeJSON(ALBUM_KEY,next)){tell('Chưa lưu được tên mới. Tên cũ vẫn được giữ.');return;}
      album=next;$('photo-heading').textContent=name;$('photo-image').alt=name;renderAlbum();tell('Đã lưu tên kỷ niệm.');
    });
    $('photo-download').addEventListener('click',()=>{const item=album.find(a=>a.id===activePhoto);if(item)download(item);});
    $('after-study').addEventListener('click',()=>{
      studied=true;$('study-note').hidden=false;$('after-study').textContent='Đã về nhà sau buổi ôn';$('after-study').setAttribute('aria-pressed','true');
      talk('robot');
    });
    $('study-note-close').addEventListener('click',()=>{$('study-note').hidden=true;});
    canvas.addEventListener('click',ev=>{
      const r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;
      if(x>=actors.cat.x-10 && x<=actors.cat.x+44 && y>=actors.cat.y-44 && y<=actors.cat.y+12)talk('cat');
      else if(x>=actors.robot.x-10 && x<=actors.robot.x+42 && y>=actors.robot.y-58 && y<=actors.robot.y+10)talk('robot');
      else tell('Thử bấm Mochi, StackChan hoặc bật/tắt đồ ở bên cạnh.');
    });
    canvas.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();talk('cat');}});
    document.addEventListener('keydown',ev=>{
      if(ev.ctrlKey||ev.altKey||ev.metaKey||ev.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;
      if(ev.key.toLowerCase()==='c'){ev.preventDefault();capture();}
      if(ev.key.toLowerCase()==='a'){ev.preventDefault();openAlbum();}
    });
    document.addEventListener('visibilitychange',()=>{lastFrame=0;});
    sync(); advance(modelFor(),0); draw(); requestAnimationFrame(loop);
  }
  setup();
  // Móc kiểm tra chỉ của bản mô phỏng; không tải mã khởi tạo add-on.
  window.HomeDemo = Object.freeze({
    state:()=>JSON.parse(JSON.stringify(state)),
    moment:()=>JSON.parse(JSON.stringify(modelFor())),
    album:()=>album.map(({image,...rest})=>({...rest,imageLength:image.length})),
    settle:()=>draw(performance.now(),true),
    capture,
    paint:draw,
    actors:()=>JSON.parse(JSON.stringify(actors)),
    animationTime:()=>motionTime
  });
})();
