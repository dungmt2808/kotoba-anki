// Client CDP tối giản cho QtWebEngine của Anki (Playwright không nối được).
const fs = require('fs');
async function pages(port) {
  const r = await fetch(`http://127.0.0.1:${port}/json/list`);
  return (await r.json()).filter(p => p.type === 'page');
}
class Page {
  constructor(ws) { this.ws = ws; this.id = 0; this.wait = new Map(); this.logs = []; this.errors = [];
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
      if (m.id && this.wait.has(m.id)) { const [ok, bad] = this.wait.get(m.id); this.wait.delete(m.id); m.error ? bad(new Error(JSON.stringify(m.error))) : ok(m.result); }
      else if (m.method === 'Runtime.consoleAPICalled') { this.logs.push(m.params.type + ': ' + m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ')); }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.errors.push((d.exception && d.exception.description || d.text) + ' @' + d.url + ':' + d.lineNumber); }
    }; }
  static async open(url) { const ws = new WebSocket(url); await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; }); const p = new Page(ws); await p.send('Runtime.enable'); await p.send('Page.enable'); return p; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((ok, bad) => { this.wait.set(id, [ok, bad]); setTimeout(() => { if (this.wait.has(id)) { this.wait.delete(id); bad(new Error('timeout ' + method)); } }, 30000); }); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result.value; }
  async shot(path) { const r = await this.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(r.data, 'base64')); }
  async click(sel) { const box = await this.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()`);
    if (!box) throw new Error('không thấy ' + sel);
    for (const type of ['mousePressed', 'mouseReleased']) await this.send('Input.dispatchMouseEvent', { type, x: box[0], y: box[1], button: 'left', clickCount: 1 }); }
  async type(text) { await this.send('Input.insertText', { text }); }
  async key(key, code, keyCode) { for (const type of ['keyDown', 'keyUp']) await this.send('Input.dispatchKeyEvent', { type, key, code: code || key, windowsVirtualKeyCode: keyCode || 0 }); }
  close() { this.ws.close(); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
module.exports = { pages, Page, sleep };
