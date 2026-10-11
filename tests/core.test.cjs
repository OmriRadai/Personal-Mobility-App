const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
function context() {
  let stored=null;
  const c={console,Date,Intl,crypto,Blob,setTimeout,setInterval:()=>1,clearInterval:()=>{},
    navigator:{},document:{addEventListener(){}},localStorage:{getItem:()=>stored,setItem:(k,v)=>stored=v},
    scrollTo(){},addEventListener(){}};
  c.window=c;vm.createContext(c);
  for(const f of ['mobility-data','training-data','timing','storage','app'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c,{filename:f});
  return c;
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('all 12 mobility routines exactly match the original data',()=>{
  const c=context();assert.equal(Object.keys(c.MOBILITY_ROUTINES).length,12);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(c.MOBILITY_ROUTINES)).digest('hex'),'4cd20417812e2e1c838c44b6e0c688f37c1504429199c279ee7842b06c0e68c0');
});
test('pairs alternate and lighter work reduces sets without changing preparation',()=>{
  const {Training:T}=context(),q=T.queue(T.primary),light=T.queue(T.primary,{},true);
  assert.deepEqual(plain(q.filter(e=>e.group==='A').map(e=>e.id)),['oac','pike','oac','pike','oac','pike']);
  assert.deepEqual(plain(q.filter(e=>e.group==='B').map(e=>e.id)),['planche','row','planche','row','planche','row']);
  assert.equal(light.filter(e=>e.id==='oac').length,2);assert.equal(light.filter(e=>e.id==='face').length,1);
  assert.equal(light[0].timing.block,420);
  assert.deepEqual(plain(T.queue(T.secondary,{oac:2,hspu:3,planche:5,muscle:2})),plain(T.queue(T.secondary)));
  const advanced=T.queue(T.primary,{muscle:1});assert.equal(advanced.filter(e=>e.goal==='muscle').length,2);
});
test('holds: final rep, each rep, both ends, and both sides are distinct',()=>{
  const c=context(),P=c.WorkoutTiming.phases;
  const gm=c.MOBILITY_ROUTINES.fs_a.exercises.find(e=>e.branded_name==='Single Leg GM B Stance');
  const holds=P(gm).filter(p=>p.seconds===10);assert.equal(holds.length,2);assert.ok(holds.every(p=>p.rep===10));
  const pullover=c.MOBILITY_ROUTINES.tk_w1_d6.exercises.find(e=>e.branded_name==='Standing Pullover');assert.equal(P(pullover).filter(p=>p.seconds===2).length,9);
  const thoracic=c.MOBILITY_ROUTINES.tk_w1_d4.exercises.find(e=>e.branded_name==='Thoracic Extensions');const ps=P(thoracic);assert.equal(ps.filter(p=>p.seconds===2).length,20);assert.equal(ps.filter(p=>p.side==='Left side' && p.label==='Top pause').length,5);
  const balance=c.MOBILITY_ROUTINES.tk_w1_d2.exercises.find(e=>e.branded_name==='Single Leg Balance');assert.equal(P(balance).filter(p=>p.seconds===60).length,2);
  const ranged=c.MOBILITY_ROUTINES.ms_a.exercises.find(e=>e.branded_name==='Side Step Up');assert.equal(P(ranged,10,3).filter(p=>p.seconds===3).length,20);
  const wrist=c.MOBILITY_ROUTINES.tk_w1_d1.exercises.find(e=>e.branded_name==='Wrist Rocks');assert.equal(P(wrist).length,30);
});
test('unilateral assisted OAC guides weaker side and 30s side rest; explosive work stays untimed',()=>{
  const c=context(),q=c.Training.queue(c.Training.primary),o=q.find(e=>e.id==='oac'),ps=c.WorkoutTiming.phases(o);
  assert.equal(ps[0].side,'Weaker arm');assert.equal(ps.find(p=>p.kind==='side').seconds,30);assert.equal(ps.at(-1).seconds,120);
  assert.equal(c.WorkoutTiming.phases(q.find(e=>e.id==='high'))[0].seconds,null);
});
test('timestamp timer survives suspension and pause; untimed phases wait for input',()=>{
  const {WorkoutTiming:T}=context(),t=T.create();T.load(t,[{label:'lower',seconds:3},{label:'lift',seconds:1},{label:'manual',seconds:null},{label:'rest',seconds:60}]);
  T.start(t,1000);T.tick(t,7000);assert.equal(t.index,2);assert.equal(t.remaining,null);
  T.next(t,7000);T.tick(t,12000);assert.equal(t.remaining,55);T.pause(t,12000);T.tick(t,90000);assert.equal(t.remaining,55);
  T.start(t,100000);T.tick(t,155000);assert.equal(t.done,true);
});
test('OAC eccentric time excludes pause and resets for every repetition',()=>{
  const c=context(),T=c.WorkoutTiming,e=c.Training.queue(c.Training.primary,{oac:1}).find(e=>e.id==='oac'),t=T.create();
  T.load(t,T.phases(e),5);T.start(t,1000);T.next(t,1000);T.tick(t,3000);assert.equal(t.descentRemaining,3);
  T.next(t,3000);T.tick(t,6000);assert.equal(t.phases[t.index].label.startsWith('Complete lower'),true);assert.equal(t.descentRemaining,3);
  T.tick(t,9000);assert.equal(t.phases[t.index].label,'Get to top with assistance');assert.equal(t.descentRemaining,5);
  T.next(t,10000);T.next(t,12000);T.tick(t,20000);assert.equal(t.phases[t.index].kind,'side');assert.equal(t.remaining,28);
});
test('session results require actual entry and restore after reload; skipped sets produce partial history',()=>{
  const c=context(),a=c.mobilityApp();a.initApp();a.startRoutine('skills_med_primary');a.timer.done=true;a.nextSet();assert.equal(a.currentSetIndex,0);assert.equal(a.result.reps,'');
  a.result.hold=420;a.nextSet();assert.equal(a.currentSetIndex,1);a.exitWorkout();
  const b=c.mobilityApp();b.initApp();b.resumeSession();assert.equal(b.currentSetIndex,1);assert.equal(b.session.results[0].hold,420);
  while(b.mode==='active')b.skipSet();assert.equal(b.data.sessions[0].status,'partial');assert.equal(b.data.active,null);
  c.WorkoutStorage.validate(plain(b.data));
});
test('progression requires two full successful primary sessions at the current level',()=>{
  const c=context(),a=c.mobilityApp();a.initApp();
  function complete(key){a.startRoutine(key);for(const r of a.session.results){const e=a.session.queue[r.queueIndex];Object.assign(r,{reps:e.rep_max || e.reps,repsOther:e.rep_max || e.reps,effort:2,clean:true,tempo:true,completed:true});}a.finishSession('completed');}
  complete('skills_med_primary');assert.equal(a.suggestions.length,0);complete('skills_med_secondary');assert.equal(a.suggestions.length,0);
  complete('skills_med_primary');assert.equal(a.suggestions.length,4);a.acceptProgression('oac');assert.equal(a.data.levels.oac,1);assert.ok(!a.suggestions.includes('oac'));
  complete('skills_med_primary');assert.equal(a.lighterDue,true);assert.equal(a.lighter,true);
});
test('backup validation, duplicate merges, and storage errors preserve in-memory work',()=>{
  const c=context(),a=c.mobilityApp();a.initApp();a.startRoutine('fs_a');a.finishSession('abandoned');const d=plain(a.data);c.WorkoutStorage.validate(d);
  assert.equal(c.WorkoutStorage.merge(d,d).sessions.length,1);
  const invalid=plain(d);invalid.sessions[0].results[0].reps=-1;assert.throws(()=>c.WorkoutStorage.validate(invalid));
  const broken=plain(d);broken.sessions[0].queue[0].video='javascript:alert(1)';assert.throws(()=>c.WorkoutStorage.validate(broken));
  c.localStorage.setItem=()=>{throw Error('quota');};a.save();assert.match(a.storageError,/Export|export/);assert.equal(a.data.sessions.length,1);
});
test('editing and custom sets persist actual data and timezone dates',()=>{
  const c=context(),a=c.mobilityApp();a.newEntry();a.editing.name='Home practice';a.newExerciseName='Pull-up';a.addEditorExercise();a.editingExercises[0].reps='5, 4';a.editingExercises[0].sets=2;a.saveEdit();
  assert.equal(a.data.sessions[0].results.length,2);a.editSession(a.data.sessions[0]);assert.equal(a.editingExercises.length,1);a.editingExercises[0].reps='6, 4';a.saveEdit();assert.equal(a.data.sessions[0].results[0].reps,6);c.WorkoutStorage.validate(plain(a.data));assert.match(c.WorkoutStorage.date('Asia/Jerusalem'),/^\d{4}-\d{2}-\d{2}$/);
});
test('backup import restores an empty device and rejects invalid data without overwriting history',async()=>{
  const c=context(),a=c.mobilityApp();a.startRoutine('skills_med_primary');a.data.levels.hspu=1;a.save();const backup=plain(a.data);
  const b=c.mobilityApp();const incoming={target:{files:[{size:1000,text:async()=>JSON.stringify(backup)}],value:'selected'}};await b.importData(incoming);
  assert.equal(b.data.levels.hspu,1);assert.equal(b.data.active.id,backup.active.id);assert.equal(incoming.target.value,'');
  const bad={target:{files:[{size:100,text:async()=>'{"version":99}'}],value:'selected'}};await b.importData(bad);assert.match(b.message,/Import failed/);assert.equal(b.data.active.id,backup.active.id);
});
test('delete session discards active or paused work and unlocks both categories without changing history',()=>{
  const c=context(),a=c.mobilityApp();a.initApp();
  a.startRoutine('fs_a');a.result.reps=10;a.finishSession('partial');
  const saved=a.data.sessions[0].id;
  a.startRoutine('fs_a');a.timerStart();a.deleteSession();
  assert.equal(a.data.active,null);assert.equal(a.timer.running,false);assert.equal(a.activeWorkoutQueue.length,0);
  assert.equal(a.data.sessions.length,1);assert.equal(a.data.sessions[0].id,saved);
  a.startRoutine('fs_a');a.exitWorkout();a.deleteSession();a.startRoutine('skills_med_primary');assert.equal(a.mode,'active');
  a.deleteSession();const b=c.mobilityApp();b.initApp();assert.equal(b.data.active,null);assert.equal(b.data.sessions.length,1);
});
test('starting any new routine replaces unfinished work without saving it to history',()=>{
  const c=context(),a=c.mobilityApp();a.initApp();
  a.startRoutine('fs_a');a.result.reps=10;a.finishSession('partial');const history=plain(a.data.sessions);
  for(const [oldKey,newKey,paused] of [['fs_a','skills_med_primary',true],['skills_med_primary','fs_a',false],['skills_med_primary','skills_med_primary',true]]){
    a.startRoutine(oldKey);a.result.reps=7;a.timerStart();const oldId=a.session.id;
    if(paused)a.exitWorkout();
    a.startRoutine(newKey);
    assert.equal(a.mode,'active');assert.equal(a.session.key,newKey);assert.notEqual(a.session.id,oldId);
    assert.equal(a.currentSetIndex,0);assert.equal(a.result.reps,'');assert.equal(a.timer.running,false);assert.equal(a.message,'');
    assert.deepEqual(plain(a.data.sessions),history);
    const reloaded=c.mobilityApp();reloaded.initApp();assert.equal(reloaded.data.active.id,a.session.id);
  }
});
test('compact editor preserves per-set holds and metadata while editing reps, sets and notes',()=>{
  const c=context(),a=c.mobilityApp();a.startRoutine('skills_med_primary');
  const rows=a.session.results.filter(r=>r.exerciseId==='pike');
  rows.forEach((r,i)=>Object.assign(r,{reps:5-i,hold:10+i,load:2,assistance:'band',notes:'Set '+i}));a.finishSession('partial');
  a.editSession(a.data.sessions[0]);const group=a.editingExercises.find(e=>e.name==='Pike push-up');assert.equal(group.sets,3);assert.equal(group.reps,'5, 4, 3');
  a.saveEdit();const after=a.data.sessions[0].results.filter(r=>r.exerciseId==='pike');assert.deepEqual(plain(after),plain(rows));
  a.editSession(a.data.sessions[0]);const updated=a.editingExercises.find(e=>e.name==='Pike push-up');updated.sets=2;updated.reps='6';updated.notes='Comfortable';a.saveEdit();
  const reduced=a.data.sessions[0].results.filter(r=>r.exerciseId==='pike');assert.equal(reduced.length,2);assert.ok(reduced.every(r=>r.reps===6 && r.notes==='Comfortable'));assert.equal(reduced[0].hold,10);c.WorkoutStorage.validate(plain(a.data));
});
test('deleting saved history preserves unrelated pending work; wake-lock failure cannot block deletion',()=>{
  const c=context(),a=c.mobilityApp();a.startRoutine('fs_a');a.finishSession('partial');const old=a.data.sessions[0];
  a.startRoutine('skills_med_primary');a.exitWorkout();const pending=a.data.active.id;a.editSession(old);a.deleteSession(old.id);
  assert.equal(a.data.sessions.length,0);assert.equal(a.editorOpen,false);assert.equal(a.data.active.id,pending);
  a.resumeSession();a.wakeLock={release(){throw Error('Wake lock already released');}};a.deleteSession();
  assert.equal(a.mode,'selector');assert.equal(a.data.active,null);const b=c.mobilityApp();b.initApp();assert.equal(b.data.active,null);
});
