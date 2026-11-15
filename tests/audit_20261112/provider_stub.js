// Diagnose network-dependent existing scenarios without changing their assertions.
// Only model discovery and optional Gemini dictation prefetch are stubbed.
const cp = require('child_process');
const path = require('path');
const script = process.env.KB_BASELINE_SCENARIO;
if (process.env.KB_AUDIT_DISPOSABLE !== '1' || !['e2e.js','e2e_120.js','e2e_123.js'].includes(script)) {
  throw Error('Use the disposable runner and set KB_BASELINE_SCENARIO');
}
(async () => {
  const response = await fetch(`http://127.0.0.1:${process.env.KB_CTRL_PORT || 9944}`, {method:'POST', body:`
import sys
kb=sys.modules["kotoba_batake"]
assert "/tmp/kotoba-audit-ui-" in mw.col.path
kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",show_tooltips=True)
kb.ai.Gemini.models=lambda self: [{"name":"models/gemini-3.6-flash","supportedGenerationMethods":["generateContent"]}]
kb.voice_start=lambda speeches,after=None: False
result=True
`});
  const data=await response.json(); if(data.err)throw Error(data.err);
  console.log('Provider stub: local model list; optional Gemini dictation prefetch unavailable. Existing assertions unchanged.');
  const result=cp.spawnSync(process.execPath,[path.join(__dirname,'../anki',script),process.argv[2]],
    {stdio:'inherit',env:{...process.env,KB_REAL_GEMINI:'0'}});
  process.exit(result.status === null ? 2 : result.status);
})().catch(e=>{console.error(e);process.exit(2);});
