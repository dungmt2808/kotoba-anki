// Chỉ thêm quan sát vào test gốc: không đổi assertions, hàm giả hay kết quả.
const fs=require('fs'),path=require('path');
const OUT=process.argv[2], originalFetch=global.fetch;
const URL='http://127.0.0.1:'+process.env.KB_CTRL_PORT;
const KB='import sys\nkb=sys.modules["kotoba_batake"]\n';
(async()=>{
  let response=await originalFetch(URL,{method:'POST',body:KB+`
kb._audit_start_trace=[]
kb._audit_original_start_all=kb.ai_start_all
def trace_start_all(reason="auto"):
    before=len(getattr(kb,"_kb_starts",[]))
    has_key=bool(kb.ai.clean_key(kb.config().get("gemini_key")))
    waiting=kb.ai_waiting()
    result=kb._audit_original_start_all(reason)
    kb._audit_start_trace.append({"reason":reason,"key_present":has_key,"waiting":waiting,
        "calls_to_stub":list(getattr(kb,"_kb_starts",[]))[before:]})
    return result
kb.ai_start_all=trace_start_all
result=True
`});
  const data=await response.json();if(data.err)throw Error(data.err);
  global.fetch=async function(url,options){
    const res=await originalFetch(url,options);
    if(options&&String(options.body).includes('result = list(kb._kb_starts)')){
      const observed=await res.clone().json();
      response=await originalFetch(URL,{method:'POST',body:KB+'result=kb._audit_start_trace'});
      const trace=await response.json();
      fs.writeFileSync(path.join(OUT,'startup-trace.json'),JSON.stringify({observed:observed.r,trace:trace.r},null,2)+'\n');
      console.log('TRACE starts='+JSON.stringify(observed.r));
    }
    return res;
  };
  require('../anki/e2e_1223.js');
})().catch(e=>{console.error(e);process.exit(2);});
