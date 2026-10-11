/* Timing annotations are separate from the preserved mobility prescriptions. */
window.WorkoutTiming = (() => {
  function annotation(e) {
    if(e.timing) return e.timing;
    const cues=(e.movement_cues || []).join(' ');
    const unit=e.reps_unit || '';
    const half=/5\/side/.test(unit);
    const sides=/per (leg|side|arm)/i.test(unit+' '+cues) || half || e.branded_name==='Single Leg Balance' ? ['Left side','Right side']:null;
    const a={sides,half};
    if(unit==='per direction' && e.branded_name==='Wrist Rocks')a.patterns=['Forward hand position','Backward hand position','Side hand position'];
    if(unit==='per move')a.manualPattern=true;
    if(unit==='seconds' || (e.reps===1 && e.hold_seconds>0)) a.hold=e.hold_seconds;
    else if(/hold (?:the )?(?:10th|20th|bottom|last|final) rep/i.test(cues)) a.finalHold=e.hold_seconds;
    else if(/pause 2s at top and bottom/i.test(cues)) a.phases=[['Move to top',null],['Top pause',2],['Move to bottom',null],['Bottom pause',2]];
    else if(e.hold_seconds>0) a.perHold=e.hold_seconds;
    if(/5.second|over 5 seconds/i.test(cues)) a.phases=[['Lower',5],['Return',null]];
    if(/2[–-]3\s*(?:s|seconds)/i.test(cues)) {a.range=[2,3];a.phases=[['Lower',2],['Return',null]];}
    return a;
  }
  function phases(e, reps=e.reps, rangeSeconds=2) {
    const a=annotation(e),out=[];
    const add=(label,seconds,side='',rep=0,kind='work')=>out.push({label,seconds,side,rep,kind});
    const sides=a.sides || [''];
    for(let si=0;si<sides.length;si++) {
      const side=sides[si];
      if(a.block) add('Practice window (rest between attempts)',a.block,side);
      else if(a.hold) add(e.branded_name==='Duck Walks'?'Walking duration':'Hold',a.hold,side);
      else if(a.manualPattern) add(`Perform ${reps} reps per prescribed move; advance after all moves`,null,side);
      else if(a.patterns) for(const pattern of a.patterns) for(let r=1;r<=reps;r++)add(pattern+' · controlled rep',null,side,r);
      else for(let r=1;r<=(a.half?reps/2:reps);r++) {
        const ps=a.phases || [['Perform rep with control',null]];
        for(const [label,seconds] of ps) add(label,a.range && label==='Lower'?rangeSeconds:seconds,side,r);
        if(a.perHold) add('Hold each rep',a.perHold,side,r);
        if(a.finalHold && r===reps) add('Final-rep hold',a.finalHold,side,r);
      }
      if(si<sides.length-1) add('Change sides',a.sideRest || null,side,0,'side');
    }
    if(e.rest_seconds>0) add('Rest after set',e.rest_seconds,'',0,'rest');
    return out;
  }
  function create() {return {phases:[],index:0,running:false,remaining:null,deadline:0,done:false,descentRemaining:0,descentDeadline:0,descentPhaseStart:0};}
  function load(t,p,descent=0) {Object.assign(t,create(),{phases:p,remaining:p[0]?.seconds ?? null,descentRemaining:descent});}
  function start(t,now=Date.now()) {if(t.done)return;t.running=true;t.deadline=t.remaining===null?0:now+t.remaining*1000;
    if(t.phases[t.index]?.label.startsWith('Lower toward') || t.phases[t.index]?.label.startsWith('Complete lower')) t.descentDeadline=now+t.descentRemaining*1000;}
  function pause(t,now=Date.now()) {if(t.running){if(t.deadline)t.remaining=Math.max(0,(t.deadline-now)/1000);if(t.descentDeadline)t.descentRemaining=Math.max(0,(t.descentDeadline-now)/1000);}t.descentDeadline=0;t.running=false;}
  function next(t,now=Date.now()) {
    if(t.descentDeadline) {t.descentRemaining=Math.max(0,(t.descentDeadline-now)/1000);t.descentDeadline=0;}
    t.index++;t.running=false;
    if(t.index>=t.phases.length){t.done=true;t.remaining=null;return;}
    t.remaining=t.phases[t.index].seconds;
    if(t.phases[t.index].label==='Get to top with assistance')t.descentRemaining=5;
    t.descentPhaseStart=t.descentRemaining;
    start(t,now);
  }
  function tick(t,now=Date.now()) {
    if(!t.running)return;
    while(t.running) {
      if(t.deadline && now>=t.deadline){const end=t.deadline;next(t,end);continue;}
      if(t.descentDeadline) {
        t.descentRemaining=Math.max(0,(t.descentDeadline-now)/1000);
        if(t.descentRemaining===0 && t.phases[t.index].label.startsWith('Complete lower')){const end=t.descentDeadline;next(t,end);continue;}
      }
      if(t.deadline)t.remaining=Math.max(0,(t.deadline-now)/1000);
      break;
    }
  }
  // Fixed guidance windows are app pacing estimates unless a hold or tempo exists.
  function guidedPhases(e) {
    const a=annotation(e),result=[];
    const add=(label,seconds,target,movement=e.branded_name,kind='work',side='',rep=0,estimated=false)=>result.push({label,seconds,target,movement,kind,side,rep,estimated});
    const repsText=(n=a.half?e.reps/2:e.reps)=>`${n}${e.rep_max?'–'+e.rep_max:''} ${e.reps_unit==='seconds'?'seconds':'reps'}`;
    if(a.work){add('Work',a.work,repsText(),e.branded_name,'work','',0,true);}
    else if(a.block && /handstand/i.test(e.branded_name)) {
      let remaining=a.block;
      while(remaining>0){const work=Math.min(30,remaining);add('Hold / balance attempt',work,`${work}s supported balance attempt`);remaining-=work;
        if(remaining>0){const rest=Math.min(30,remaining);add('Rest between attempts',rest,'Rest',e.branded_name,'rest');remaining-=rest;}}
    }else if(a.block && ['prep','easy-prep'].includes(e.id)) {
      for(const step of Training.preparation(e)){add('Work',step.seconds,`${step.reps} reps`,step.branded_name);if(step.rest_seconds)add('Rest',step.rest_seconds,'Rest',step.branded_name,'rest');}
    }else if(a.block){add('Practice',a.block,`${a.block}s practice`);}
    else if(a.patterns){for(const pattern of a.patterns)add('Work',e.reps*3,`${e.reps} reps`,e.branded_name+' — '+pattern,'work','',0,true);}
    else if(a.manualPattern){add('Guided work window',120,`${e.reps} reps per move`,e.branded_name,'work','',0,true);}
    else if(a.descent){
      const sides=a.sides || [''];
      for(let si=0;si<sides.length;si++){
        for(let r=1;r<=e.reps;r++){
          add('Get to top with assistance',3,repsText(),e.branded_name,'work',sides[si],r,true);
          add('Controlled negative + weak-point hold',8,`${e.reps} reps · 5s lower + 3s hold at your weak point`,e.branded_name,'work',sides[si],r);
        }
        if(si<sides.length-1)add('Change arms',a.sideRest || 30,'Rest',e.branded_name,'side',sides[si]);
      }
    }
    else {
      const old=phases({...e,rest_seconds:0});
      const plain=!a.hold && !a.perHold && !a.finalHold && !a.phases;
      if(plain){for(const side of a.sides || [''])add('Work',(a.half?e.reps/2:e.reps)*3,repsText(a.half?e.reps/2:e.reps),e.branded_name,'work',side,0,true);}
      else for(const p of old){
        let seconds=p.seconds,label=p.label;
        if(seconds===null){
          seconds=p.kind==='side'?10:label.startsWith('Get to top')?3:label.startsWith('Lower toward') || label.startsWith('Complete lower')?2.5:label.includes('Explosive')?1:3;
          if(label.startsWith('Lower toward'))label='Lower — first half';
          if(label.startsWith('Complete lower'))label='Lower — finish';
        }
        add(label,seconds,a.hold?`${a.hold}s ${e.reps_unit==='seconds'?'duration':'hold'}`:repsText(),e.branded_name,p.kind,p.side,p.rep,p.seconds===null);
      }
    }
    if(e.rest_seconds>0)add('Rest after set',e.rest_seconds,'Rest',e.branded_name,'rest');
    return result;
  }
  function logType(e){const a=annotation(e);return e.reps_unit==='seconds' || a.hold || a.block?'time':'reps';}
  return {annotation,phases,guidedPhases,logType,create,load,start,pause,next,tick};
})();
