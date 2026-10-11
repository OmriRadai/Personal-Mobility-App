/* Dependency-free Chrome DevTools smoke checks. Run from the repository root. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const candidates=[process.env.BROWSER_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
const browser=candidates.find(p=>fs.existsSync(p));if(!browser)throw Error('Set BROWSER_PATH to Chrome or Edge.');
const root=process.cwd(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'mobility-browser-check-'));
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));
});
let child,ws;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  const endpoint=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Browser launch timed out: '+output)),15000);child.on('error',reject);child.stderr.on('data',b=>{output+=b;const m=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});});
  console.log('Browser launched.');ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;setTimeout(()=>j(Error('DevTools connection timed out')),10000);});
  let seq=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(m.params.exceptionDetails));else if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error')errors.push(JSON.stringify(m.params.args));};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>reject(Error('DevTools timed out: '+method)),10000);pending.set(id,{resolve:r=>{clearTimeout(timeout);resolve(r);},reject:e=>{clearTimeout(timeout);reject(e);}});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await call('Target.createTarget',{url:'about:blank'}),{sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  const cmd=(m,p)=>call(m,p,sessionId);await cmd('Runtime.enable');await cmd('Page.enable');
  const evaluate=async expression=>{if(expression.startsWith('const '))expression='{'+expression+'}';const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timed out: '+expression);};
  for(const url of [pathToFileURL(path.join(root,'index.html')).href,'http://127.0.0.1:'+server.address().port+'/']) {
    await cmd('Page.navigate',{url});await waitFor('typeof Alpine!=="undefined" && !!Alpine.$data(document.body).clockHandle');
    await evaluate('localStorage.clear();location.reload()');await delay(150);await waitFor('typeof Alpine!=="undefined" && !!Alpine.$data(document.body).clockHandle');
    assert.equal(await evaluate("document.querySelector('main').inert"),false);
    for(const width of [320,390,768]){
      await cmd('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'selector overflow '+width);
    }
    await evaluate("const a=Alpine.$data(document.body);a.activeTab='calisthenics';a.startRoutine('skills_med_primary')");
    await waitFor("document.querySelector('.workout-screen')!==null");
    assert.equal(await evaluate("Alpine.$data(document.body).currentStep.id"),'prep-wrists-forward');
    assert.equal(await evaluate("document.querySelector('.workout-screen').querySelectorAll('input,textarea,details').length"),0);
    assert.match(await evaluate("document.querySelector('.movement-title').textContent"),/Wrist rocks/);
    assert.match(await evaluate("document.querySelector('.workout-target').textContent"),/10/);
    assert.equal(await evaluate("document.querySelector('.workout-screen').textContent.includes('Repeat phase')"),false);
    assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.countdown')).fontSize)>=76"));
    for(const width of [320,390]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'active overflow '+width);}
    fs.mkdirSync('.test-results',{recursive:true});fs.writeFileSync('.test-results/mobile.png',Buffer.from((await cmd('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.equal(await evaluate('Alpine.$data(document.body).timer.running'),true);
    assert.equal(await evaluate('Alpine.$data(document.body).phase.kind'),'preparation');
    await evaluate("Alpine.$data(document.body).timerPause();[...document.querySelectorAll('button')].find(b=>b.textContent==='Reset timer').click()");
    assert.equal(await evaluate('Alpine.$data(document.body).timer.remaining'),5);assert.equal(await evaluate('Alpine.$data(document.body).timer.running'),false);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Start / resume')).focus()");
    assert.equal(await evaluate("document.activeElement.textContent"),'Start / resume');
    await cmd('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await cmd('Input.dispatchKeyEvent',{type:'char',text:'\r',unmodifiedText:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await delay(100);
    assert.equal(await evaluate('Alpine.$data(document.body).timer.running'),true);
    assert.equal(await evaluate('Alpine.$data(document.body).result.reps'),'');
    await evaluate("const a=Alpine.$data(document.body);a.timer.index=a.timer.phases.length-1;a.timer.deadline=Date.now()-1;a.tickTimer()");assert.equal(await evaluate('Alpine.$data(document.body).currentSetIndex'),1);
    assert.equal(await evaluate('Alpine.$data(document.body).phase.kind'),'preparation');assert.equal(await evaluate('Alpine.$data(document.body).timer.running'),true);
    await evaluate("Alpine.$data(document.body).timerStart();Alpine.$data(document.body).timerPause();Alpine.$data(document.body).save();location.reload()");
    await delay(200);await waitFor('typeof Alpine!=="undefined" && !!Alpine.$data(document.body).data.active');
    await evaluate('Alpine.$data(document.body).resumeSession()');assert.equal(await evaluate('Alpine.$data(document.body).currentSetIndex'),1);
    await evaluate("const a=Alpine.$data(document.body);while(a.mode==='active'){a.timer.done=true;a.nextSet()}");await delay(150);
    assert.equal(await evaluate('Alpine.$data(document.body).mode'),'review');
    assert.equal(await evaluate("!!document.querySelector('.workout-screen')"),false);
    assert.equal(await evaluate('Alpine.$data(document.body).data.sessions.length'),0);
    await evaluate("{const input=document.querySelector('.review-exercise input');input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));const hold=[...document.querySelectorAll('.review-exercise')].find(e=>e.querySelector('h3').textContent==='Handstand control practice').querySelector('input');hold.value='23.5';hold.dispatchEvent(new Event('input',{bubbles:true}));}");await delay(350);
    assert.equal(await evaluate("Alpine.$data(document.body).session.results.find(r=>r.exerciseId==='balance').hold"),23.5);
    assert.equal(await evaluate('Alpine.$data(document.body).session.results[0].reps'),10);
    await evaluate('Alpine.$data(document.body).save();location.reload()');await delay(200);await waitFor('typeof Alpine!=="undefined" && !!Alpine.$data(document.body).data.active');
    await evaluate('Alpine.$data(document.body).resumeSession()');assert.equal(await evaluate('Alpine.$data(document.body).mode'),'review');
    await evaluate("Alpine.$data(document.body).saveReview();Alpine.$data(document.body).newEntry()");await delay(150);
    assert.equal(await evaluate('!!document.querySelector(\'[role="dialog"]\')'),true);
    assert.equal(await evaluate("document.activeElement.getAttribute('x-model')"),'editing.name');
    await evaluate("const a=Alpine.$data(document.body);a.editing.name='Browser test';a.newExerciseName='Pull-up';a.addEditorExercise();a.editingExercises[0].reps='5';a.saveEdit()");await delay(150);
    assert.equal(await evaluate('Alpine.$data(document.body).data.sessions.length'),2);
    // A fully completed session exercises the DOM teardown and logbook transition.
    await evaluate("const a=Alpine.$data(document.body);a.startRoutine('skills_med_secondary');while(a.mode==='active'){a.timer.done=true;a.nextSet()}for(const g of a.reviewGroups)for(const r of g.rows){r[g.type==='time'?'hold':'reps']=g.type==='time'?30:5;if(g.sides)r[g.type==='time'?'holdOther':'repsOther']=g.type==='time'?30:5}a.saveReview()");await delay(150);
    assert.equal(await evaluate('Alpine.$data(document.body).mode'),'selector');
    // Native pointer clicks verify the visible Delete buttons, not just the methods.
    const clickVisibleDelete=async()=>{
      await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Delete session' && b.getClientRects().length).scrollIntoView({block:'center'})");await delay(100);
      const point=await evaluate("(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent==='Delete session' && b.getClientRects().length).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
      await cmd('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await delay(150);
    };
    await evaluate("Alpine.$data(document.body).startRoutine('skills_med_primary')");await delay(150);
    await evaluate("Alpine.$data(document.body).openReview()");await delay(150);
    await clickVisibleDelete();assert.equal(await evaluate('Alpine.$data(document.body).mode'),'selector');assert.equal(await evaluate('Alpine.$data(document.body).data.active'),null);
    assert.equal(await evaluate("!!document.querySelector('.countdown')"),false,'active workout must disappear');
    await evaluate('Alpine.$data(document.body).editSession(Alpine.$data(document.body).data.sessions[0])');await delay(150);
    assert.equal(await evaluate("[...document.querySelectorAll('.editor-exercise')].every(e=>e.querySelectorAll('input,textarea').length===3)"),true);
    assert.equal(await evaluate("document.querySelector('.dialog').scrollWidth<=innerWidth"),true,'editor overflow');
    fs.writeFileSync('.test-results/editor.png',Buffer.from((await cmd('Page.captureScreenshot',{format:'png'})).data,'base64'));
    const oldCount=await evaluate('Alpine.$data(document.body).data.sessions.length');await clickVisibleDelete();assert.equal(await evaluate('Alpine.$data(document.body).data.sessions.length'),oldCount-1);assert.equal(await evaluate('Alpine.$data(document.body).editorOpen'),false);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS '+url+' — mobile layout, input binding, timers, reload recovery, logbook, completion');
  }
  console.log('Browser checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();if(child)child.kill();server.close();});
