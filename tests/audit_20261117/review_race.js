// Hai lượt chấm hợp lệ trong cùng giây: Anki card.mod chỉ có độ chính xác giây.
'use strict';
const fs=require('fs'),path=require('path');
const {sleep,pages,Page}=require('../anki/cdp');
const OUT=process.argv[2],URL='http://127.0.0.1:'+process.env.KB_CTRL_PORT;
const KB='import sys,time,json\nkb=sys.modules["kotoba_batake"]\n';
const results=[];
async function py(code){const r=await fetch(URL,{method:'POST',body:KB+code});const d=await r.json();if(d.err)throw Error(d.err);return d.r;}
function check(id,actual,expected,detail){const r={case:id,passed:JSON.stringify(actual)===JSON.stringify(expected),actual,expected,detail};results.push(r);console.log((r.passed?'PASS ':'FAIL ')+JSON.stringify(r));}
(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Chỉ chạy trên hồ sơ dùng một lần');
  await py('kb.save_config(gemini_key="",gemini_auto=False,mobile_coins=False,show_tooltips=False)\nkb.open_garden()\nkb._dialog.showNormal();kb._dialog.resize(1100,800)\nresult=True');
  await sleep(2500);
  const before=await py(`kb.save_config(gemini_key="",gemini_auto=False,mobile_coins=False,show_tooltips=False)
kb.open_garden()
kb._dialog.showNormal();kb._dialog.resize(1100,800)
kb._audit_warnings=[]
kb._audit_warning_original=kb.showWarning
kb.showWarning=lambda text,**kw:kb._audit_warnings.append(text)
col=mw.col
did=col.decks.id("Audit::Review cùng giây")
m=col.models.by_name("Basic")
if m is None:
    m=col.models.all()[0]
while time.time()%1>0.15:
    time.sleep(0.01)
n=col.new_note(m)
n.fields[0]="Audit same second"
n.fields[1]="Nghĩa kiểm thử"
col.add_note(n,did)
n2=col.new_note(m);n2.fields[0]="Audit next card";n2.fields[1]="Thẻ đối chứng";col.add_note(n2,did)
d=kb._dialog;d.deck_id=did;d.refresh();d._dispatch("rv:start")
cached=d._card
top=col.sched.get_queued_cards(fetch_limit=1).cards[0]
card=col.get_card(top.card.id)
assert cached.id==card.id
card.start_timer()
col.sched.answer_card(col.sched.build_answer(card=card,states=top.states,rating=3))
kb._audit_race_cid=card.id
r0=col.db.scalar("select count() from revlog")
current=col.get_card(card.id)
changed=kb._card_changed(cached)
kb._audit_toasts=[]
kb._audit_js_original=d._js
def traced_js(fn,arg):
    if fn=="toast":kb._audit_toasts.append(arg)
    return kb._audit_js_original(fn,arg)
d._js=traced_js
d._dispatch("rv:show:");d._dispatch("rv:ans:3")
result={"same_second":cached.mod==current.mod,"old_mod":cached.mod,"new_mod":current.mod,
        "old_reps":cached.reps,"new_reps":current.reps,"changed":changed,"revlog":r0}`);
  check('race/control-two-real-states-in-same-second',before.same_second&&before.old_reps!==before.new_reps,true,before);
  check('race/stale-card-detected',before.changed,true,before);
  for(let i=0;i<100;i++){if(await py('result=not kb._dialog._busy'))break;await sleep(50);}
  const after=await py(`d=kb._dialog
result={"warnings":kb._audit_warnings,"same_card":bool(d._card and d._card.id==kb._audit_race_cid),
        "revlog":mw.col.db.scalar("select count() from revlog"),"toasts":kb._audit_toasts}`);
  check('race/no-scheduler-warning',after.warnings,[],after);
  check('race/no-second-answer-from-stale-view',after.revlog,before.revlog,after);
  check('race/does-not-return-stale-card',after.same_card,false,after);
  await py('kb._dialog._dispatch("rv:ans:3")\nresult=True');
  for(let i=0;i<100;i++){if(await py('result=not kb._dialog._busy'))break;await sleep(50);}
  const retry=await py('result={"warnings":kb._audit_warnings,"same_card":bool(kb._dialog._card and kb._dialog._card.id==kb._audit_race_cid),"revlog":mw.col.db.scalar("select count() from revlog")}');
  check('race/retry-recovers-without-stop',retry.same_card,false,retry);
  for(const info of await pages(Number(process.env.KB_CDP_PORT))){
    const p=await Page.open(info.webSocketDebuggerUrl);
    if(await p.eval('typeof Garden!=="undefined"').catch(()=>false)){
      await p.shot(path.join(OUT,'review_same_second_stale.png'));p.close();break;
    }
    p.close();
  }
  // Đối chứng của assertion thông báo trong e2e_1312: theo dõi message
  // thật thay vì chỉ chờ 500 ms trước hàng chờ toast.
  const normal=await py(`d=kb._dialog
d._stop_review()
c=mw.col.get_card(kb._audit_race_cid)
mw.col.db.execute("update cards set mod=mod-3 where id=?",c.id)
d._dispatch("rv:start")
if d._card:
    mw.col.db.execute("update cards set mod=mod+1 where id=?",d._card.id)
    d._dispatch("rv:show:");d._dispatch("rv:ans:3")
result=kb._audit_toasts`);
  check('notification/backend-emits-card-changed-message',normal.some(t=>String(t).includes('chỗ khác')),true,normal);
  await py('kb.showWarning=kb._audit_warning_original\nkb._dialog._js=kb._audit_js_original\nresult=True');
  const data={cases:results.length,passed:results.filter(r=>r.passed).length,results};
  fs.writeFileSync(path.join(OUT,'review-race.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`REVIEW RACE ${data.passed}/${data.cases}`);process.exit(data.passed===data.cases?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
