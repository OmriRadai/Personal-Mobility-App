window.WorkoutStorage = (() => {
  const key='mobility-flow-v1';
  const fresh=()=>({version:1,timezone:'Asia/Jerusalem',levels:{oac:0,hspu:0,planche:0,muscle:0},sessions:[],active:null});
  const number=v=>v==='' || (typeof v==='number' && Number.isFinite(v) && v>=0 && v<=100000);
  const text=v=>typeof v==='string' && v.length<=20000;
  function validQueue(q) {
    if(!Array.isArray(q) || q.length>2000)return false;
    return q.every(e=>e && text(e.branded_name) && Number.isInteger(e.sets) && e.sets>=1 && e.sets<=1000 && number(e.reps) && e.reps>=1 && e.reps<=1000
      && Number.isInteger(e.currentSetNumber) && e.currentSetNumber>=1 && Number.isInteger(e.totalSets) && e.totalSets>=1
      && (e.rest_seconds===undefined || number(e.rest_seconds))
      && (e.video===undefined || /^https:\/\//.test(e.video))
      && (e.movement_cues===undefined || Array.isArray(e.movement_cues) && e.movement_cues.every(text))
      && (e.common_faults===undefined || Array.isArray(e.common_faults) && e.common_faults.every(text))
      && (!e.timing || typeof e.timing==='object' && ['work','block','hold','finalHold','perHold','sideRest','descent'].every(k=>e.timing[k]===undefined || number(e.timing[k]))
        && (!e.timing.sides || Array.isArray(e.timing.sides) && e.timing.sides.every(text))
        && (!e.timing.phases || Array.isArray(e.timing.phases) && e.timing.phases.every(p=>Array.isArray(p) && text(p[0]) && (p[1]===null || number(p[1]))))));
  }
  function validate(d) {
    if(!d || d.version!==1 || !Array.isArray(d.sessions) || !d.levels)throw Error('Unsupported backup format.');
    try{new Intl.DateTimeFormat('en',{timeZone:d.timezone}).format();}catch{throw Error('Invalid timezone.');}
    for(const [k,n] of Object.entries({oac:3,hspu:3,planche:5,muscle:2})) if(!Number.isInteger(d.levels[k]) || d.levels[k]<0 || d.levels[k]>n)throw Error('Invalid skill level.');
    const ids=new Set();
    for(const s of [...d.sessions,...(d.active?[d.active]:[])]) {
      if(!s || !text(s.id) || ids.has(s.id) || !text(s.name) || !text(s.started) || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !['calisthenics','mobility'].includes(s.category) || !['active','completed','partial','abandoned'].includes(s.status) || !validQueue(s.queue) || !Array.isArray(s.results) || s.results.length>4000)throw Error('Invalid session.');
      ids.add(s.id);
      if(s.qualityConfirmed!==undefined && typeof s.qualityConfirmed!=='boolean')throw Error('Invalid progression confirmation.');
      if(s.stage!==undefined && !['workout','review'].includes(s.stage) || s.exerciseNotes && (typeof s.exerciseNotes!=='object' || Array.isArray(s.exerciseNotes) || !Object.values(s.exerciseNotes).every(text)))throw Error('Invalid workout review.');
      for(const r of s.results) {
        if(!r || !text(r.name) || !Number.isInteger(r.set) || r.set<1 || !['reps','repsOther','hold','holdOther','load','effort'].every(k=>number(r[k] ?? '')) || (r.effort!=='' && r.effort>10) || !text(r.notes ?? '') || (r.queueIndex!==-1 && (!Number.isInteger(r.queueIndex) || !s.queue[r.queueIndex])))throw Error('Invalid set result.');
      }
      if(s.status==='active' && (!Array.isArray(s.queue) || !s.queue.length || !Number.isInteger(s.index) || s.index<0 || s.index>=s.queue.length))throw Error('Invalid active session.');
      if(s.timer && (!Array.isArray(s.timer.phases) || !Number.isInteger(s.timer.index) || s.timer.index<0 || s.timer.index>s.timer.phases.length || !s.timer.phases.every(p=>p && text(p.label) && (p.seconds===null || number(p.seconds))) || !number(s.timer.remaining ?? '') || !number(s.timer.descentRemaining ?? 0)))throw Error('Invalid timer.');
    }
    return d;
  }
  function read(){try{const raw=localStorage.getItem(key);return {data:raw?validate(JSON.parse(raw)):fresh(),error:''};}catch(e){return {data:fresh(),error:'Local storage could not be read: '+e.message+' Export your session before closing this page.'};}}
  function write(d){try{localStorage.setItem(key,JSON.stringify(d));return '';}catch{return 'Local storage unavailable or full. Your changes remain in memory; export before closing this page.';}}
  function merge(current,incoming){validate(incoming);const entries=new Map(current.sessions.map(s=>[s.id,s]));for(const s of incoming.sessions)if(!entries.has(s.id))entries.set(s.id,s);return {...current,sessions:[...entries.values()]};}
  function date(zone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
  return {fresh,validate,read,write,merge,date};
})();
