import concurrent.futures, json, os, pathlib, re, signal, subprocess, sys, tempfile, time, urllib.request

REPO=pathlib.Path('/workspace/kotoba-anki')
SRC='/workspace/kotoba-audit-source'
OUT=pathlib.Path('/workspace/kotoba-audit-results')
PY='/workspace/kotoba-dev/venv/bin/python'
ENV=os.environ.copy()
ENV.pop('GEMINI_API_KEY',None)
ENV.update(ANKI_PY=PY, XDG_CACHE_HOME='/workspace/kotoba-dev/cache', KB_REAL_GEMINI='0')
ENV['PATH']=str(pathlib.Path(PY).parent)+os.pathsep+ENV['PATH']

def request(port, code):
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(urllib.request.Request(f'http://127.0.0.1:{port}',data=code.encode()),timeout=4) as r:
        return json.load(r)

def ui(script, slot):
    out=OUT/(pathlib.Path(script).stem+os.environ.get('KOTOBA_AUDIT_SUFFIX',''))
    out.mkdir(parents=True,exist_ok=True)
    base=tempfile.mkdtemp(prefix=f'kb-audit-{slot}-',dir='/workspace/kotoba-audit-results')
    env=ENV.copy()
    env.update(KB_CDP_PORT=str(9530+slot),KB_CTRL_PORT=str(9630+slot),ANKI_SINGLE_INSTANCE_KEY=f'kotoba-audit-{slot}')
    with (out/'setup.log').open('w') as log:
        setup=subprocess.run([str(REPO/'tests/anki/setup_base.sh'),base,SRC],env=env,stdout=log,stderr=subprocess.STDOUT)
    if setup.returncode: return dict(script=script,error='setup',exit=setup.returncode)
    if os.environ.get('KOTOBA_AUDIT_OFFLINE_CACHE') == '1':
        # Seed the supported cache in this disposable profile; no application changes.
        user=pathlib.Path(base)/'addons21/kotoba_batake/user_files'
        cache_script='import sys, time;sys.path.insert(0,sys.argv[1]);import ai_core as ai;old=ai.load_status(sys.argv[2]);old.update(models=["gemini-flash-lite-latest"],voice_fail_day=time.strftime("%Y-%m-%d"));ai.save_status(sys.argv[2],old)'
        for folder in ['bao_gemini','bao_gemini_en']:
            subprocess.run([PY,'-c',cache_script,SRC,str(user/folder)],env=env,check=True)

    env.update(QT_QPA_PLATFORM='offscreen',QTWEBENGINE_REMOTE_DEBUGGING=env['KB_CDP_PORT'],QTWEBENGINE_DISABLE_SANDBOX='1',ANKI_NOHIGHDPI='1',QTWEBENGINE_CHROMIUM_FLAGS='--no-sandbox --disable-gpu --remote-allow-origins=*')
    started=time.monotonic()
    with (out/'anki.log').open('w') as log:
        proc=subprocess.Popen([PY,'-c','import aqt as QA; QA.run()','-b',base,'-p','Test'],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    try:
        for i in range(90):
            try:
                if request(9630+slot,'result = bool(mw.col)').get('r'):break
            except Exception:pass
            if proc.poll() is not None:raise RuntimeError('Anki exited before readiness')
            time.sleep(1)
        else:raise RuntimeError('Anki readiness timeout')
        with (out/'result.log').open('w') as log:
            cmd=['node',str(REPO/'tests/anki'/script),str(out)]
            test=subprocess.run(cmd,cwd=REPO/'tests/anki',env=env,stdout=log,stderr=subprocess.STDOUT,timeout=1100)
        content=(out/'result.log').read_text()
        summaries=re.findall(r'KẾT QUẢ:[^\n]+',content)
        failed=[l for l in content.splitlines() if l.lstrip().startswith('✗') or 'LỖI KỊCH BẢN' in l]
        result=dict(script=script,exit=test.returncode,summary=summaries[-1] if summaries else None,failed_assertions=failed,seconds=round(time.monotonic()-started),profile=base,cdp=9530+slot,ctrl=9630+slot)
    except Exception as e:
        result=dict(script=script,error=str(e),seconds=round(time.monotonic()-started),profile=base)
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid,signal.SIGTERM)
            try:proc.wait(10)
            except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
    (out/'run.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return result

def core():
    names=['test_offline.py','test_more.py','test_119.py','test_116.py','test_1225.py','test_1226.py','test_dict.py','test_117.py','test_1191.py','test_120.py','test_121.py','test_122.py','test_118.py','test_guests.js','test_colors.js','test_music.js']
    out=OUT/'core';out.mkdir(exist_ok=True)
    results=[]
    for name in names:
        with (out/(name+'.log')).open('w') as log:
            t=subprocess.run([PY if name.endswith('.py') else 'node',str(REPO/'tests/core'/name),SRC],env=ENV,stdout=log,stderr=subprocess.STDOUT,timeout=200)
        content=(out/(name+'.log')).read_text()
        results.append(dict(script=name,exit=t.returncode,checks_passed=content.count('✓'),checks_failed=content.count('✗'),skipped=[l.strip() for l in content.splitlines() if 'bỏ qua' in l]))
    for script in pathlib.Path(SRC,'web').glob('*.js'):
        subprocess.run(['node','--check',str(script)],check=True,capture_output=True)
    (out/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print(json.dumps(results,ensure_ascii=False),flush=True)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    if sys.argv[1]=='core':core()
    else:
        slot=int(sys.argv[1]);results=[ui(s,slot) for s in sys.argv[2:]]
        (OUT/f'worker-{slot}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
