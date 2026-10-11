/* Petar's tempo order: concentric, top pause, eccentric, bottom pause.
   Sets, pairings and frequency below are adaptations, not copies of his cycles. */
window.Training = (() => {
  const source1 = 'Petar · Cycle 1 · Upper Body';
  const source2 = 'Petar · Cycle 2 · Upper Body';
  const exercise = (id, name, sets, reps, rest, cues, extra = {}) => ({
    id, branded_name: name, sets, reps, reps_unit: 'reps', rest_seconds: rest,
    hold_seconds: 0, category: 'Skill foundations', movement_cues: cues,
    common_faults: [], starting_position: '', ...extra
  });
  const levels = {
    oac: ['Assisted OAC', 'Archer OAC negative', 'Controlled OAC negative', 'One-arm chin-up'],
    hspu: ['Pike push-up', 'Elevated pike push-up', 'Wall handstand push-up', 'Freestanding handstand push-up'],
    planche: ['Lean planche push-up', 'Supported tuck planche push-up', 'Tuck planche push-up', 'Advanced tuck planche push-up', 'Straddle planche push-up', 'Planche push-up'],
    muscle: ['Assisted muscle-up components', 'Assisted full bar muscle-up', 'Strict bar muscle-up']
  };
  const prep = exercise('prep', 'Wrist, scapular & specific warm-up', 1, 1, 0,
    ['Wrist rocks and palm peel aways from Mobility Toolkit; wrist openers, finger stretch and scapular push-ups from Home Hero.', 'Finish with easy assisted pulls, pike presses and modest planche leans from Petar’s upper-body sheets.'],
    {category:'Preparation', reps_unit:'7-minute preparation block', timing:{block:420}, source:'Mobility Toolkit W1 Day 1; Home Hero p.6; Petar Cycles 1–2. Timing windows are app adaptations.'});
  const balance = exercise('balance','Handstand control practice',5,1,30,
    ['Use short wall toe-pulls or supported balance attempts; come down before losing alignment.', 'Ribs down, pelvis tucked, glutes engaged; push tall through shoulders.', 'Rest between attempts within this practice window. A wall hold is not a wall push-up.'],
    {category:'HSPU balance', reps_unit:'hold',hold_seconds:30,timing:{hold:30},keep_sets:true,source:'Home Hero p.17 and p.28: 3–5 handstand sets, 30–60s. Five 30s attempts + 30s rests adapt this to the five-minute practice block.'});
  const high = exercise('high','Assisted explosive high pull',2,3,0,
    ['Use band or foot assistance to pull toward the lower chest.', 'Keep hollow body tension; stop when pull height or speed falls.'],
    {group:'muscle', goal:'muscle', timing:{phases:[['Explosive pull',null],['Controlled lower',null]]}, source:'Adaptation · current app muscle-up foundations'});
  const transition = exercise('transition','Foot-assisted bar transition',2,3,0,
    ['Keep feet supported on a stable platform beneath a low bar.', 'Use leg assistance to move both elbows over the bar together; rehearse a smooth turnover.'],
    {group:'muscle', goal:'muscle', source:'Adaptation · bar muscle-up goal'});
  const dip = exercise('dip','Assisted straight-bar dip',2,3,90,
    ['Use enough assistance to control the dip and finish with straight elbows.', 'Keep the bar close; use a comfortable shoulder range.'],
    {group:'muscle', goal:'muscle', rep_max:5, source:'Adaptation · completes muscle-up pressing pattern'});
  const oac = exercise('oac','Assisted OAC',3,3,120,
    ['Start with the weaker arm; rest 30 seconds, then match reps with the stronger arm.', 'Keep working hand supinated. Lower the assisting hand only when control is maintained.', 'Emphasize the working arm on the lift and lower under control.'],
    {group:'A', goal:'oac', timing:{sides:['Weaker arm','Stronger arm'],sideRest:30, phases:[['Lift',1],['Top pause',1],['Lower',3]]}, source:source2+' · Workout II, a1; original 3–4 min rest', video:'https://www.instagram.com/p/B7bWr5kqHRw/'});
  const pike = exercise('pike','Pike push-up',3,4,120,
    ['Choose floor or elevated feet so 4–6 clean reps leave 1–2 reps available.', 'At lockout hips should form roughly a right angle; elevated feet must be stable.', 'Move head forward into a tripod, keep core braced, finish pushing tall.'],
    {group:'A', goal:'hspu', rep_max:6, timing:{phases:[['Lower',3],['Lift',1]]}, source:source1+' · Workout I, b1; original 3×5, 3–4 min rest', video:'https://youtu.be/Da-q9mXIOeA'});
  const planche = exercise('planche','Lean planche push-up',3,4,90,
    ['Keep hips in line with shoulders.', 'Maintain the forward lean while pressing; do not shift hips backward.', 'Protract at the top and select a modest lean that allows controlled reps.'],
    {group:'B', goal:'planche', rep_max:6, timing:{phases:[['Lower',3],['Lift',1],['Top pause',1]]}, source:source1+' · Workout I, d1; original 3×5, 2 min rest', video:'https://youtu.be/doa_wTxnwAU'});
  const row = exercise('row','Supinated ring row',3,6,90,
    ['Keep palms facing you and pull elbows back toward the mid-stomach.', 'Use a more upright body angle to reduce difficulty; increase horizontal lean gradually.'],
    {group:'B',rep_max:8,timing:{phases:[['Lift',1],['Top pause',1],['Lower',2]]},source:source1+' · Workout II, b1; original 3×8, 2 min rest',video:'https://youtu.be/VSq-Aon--x4?t=13'});
  const face = exercise('face','Controlled face pull',2,8,60,
    ['Keep the body still; pull toward eye level and rotate hands back.', 'Petar: slower tempo targets the rotators better than fast movement.'],
    {rep_max:10,timing:{phases:[['Pull',3],['Return',3]]},source:source2+' · e1; original 3×8–10, 1–2 min rest',video:'https://www.youtube.com/watch?v=5xC9DpNA2-4'});
  const primary = {key:'skills_med_primary',type:'calisthenics',name:'Big 4 · Primary weekly session',duration:'55–60',
    description:'Complete weekly session. Leave 1–2 clean reps available; explosive quality comes first.',
    exercises:[prep,balance,high,transition,dip,oac,pike,planche,row,face]};
  const secondary = {key:'skills_med_secondary',type:'calisthenics',name:'Big 4 · Optional technique session',duration:'20–25',
    description:'Easy practice only: leave at least 3 reps available. Skipping it never blocks progression.',
    exercises:[
      {...prep,id:'easy-prep',timing:{block:180},reps_unit:'3-minute easy preparation block'},
      exercise('easy-balance','Easy handstand control',2,1,60,balance.movement_cues,{timing:{block:120},reps_unit:'2-minute practice window',source:balance.source}),
      {...transition,id:'easy-transition',sets:2,rest_seconds:60,group:null,goal:null},
      {...oac,id:'easy-chin',branded_name:'Easy assisted chin-up',sets:2,reps:3,rest_seconds:60,group:null,goal:null},
      {...pike,id:'easy-pike',sets:2,reps:4,rest_seconds:60,group:null,goal:null},
      exercise('easy-lean','Easy planche lean',2,1,60,['Lock elbows, keep modest forward lean and protraction.', 'Hold only while alignment stays easy; keep plenty of capacity in reserve.'],{timing:{hold:20},hold_seconds:20,reps_unit:'hold',source:'Adaptation · Petar lean mechanics'})
    ]};
  function configure(ex, savedLevels) {
    const e = JSON.parse(JSON.stringify(ex));
    e.level = e.goal ? (savedLevels[e.goal] || 0) : null;
    if(e.goal && e.goal !== 'muscle') e.branded_name = levels[e.goal][e.level];
    if(e.goal==='hspu' && e.level>=2) {
      e.reps=2;e.rep_max=4;
      e.movement_cues=['Use a controlled, comfortable full pressing range; do not confuse a static hold with pressing strength.',e.level===2?'Face the wall and keep ribs down, pelvis tucked and shoulders actively elevated.':'Use a clear floor area and a practiced bailout. Keep balance and pressing control; return to wall practice if balance fails.', 'Maintain the prescribed lowering tempo and leave 1–2 clean reps available.'];
      e.source='Adaptation · Petar Cycle 2 wall HSPU (original 3×2, 3 min rest)';e.video='https://www.instagram.com/p/B5pJ28Lqhs_/';
    }
    if(e.goal==='planche' && e.level>0) {
      e.reps=2;e.rep_max=4;
      e.movement_cues=['Keep shoulders forward and protract at the top; avoid losing the lean as you press.', e.level===1?'Use feet or a band to support a tucked shape. Reduce assistance only with clean pressing control.':'Use the selected tuck, advanced tuck, straddle or full body shape throughout each repetition; regress the shape if it breaks.', 'Maintain hip height and the prescribed tempo.'];
      e.source='Adaptation · progression from Petar’s lean planche push-up';
    }
    if(e.goal === 'oac' && [1,2].includes(e.level)) {
      e.reps=2; e.rep_max=2;
      e.timing.phases=[['Get to top with assistance',null],['Lower toward weakest point',null],['Weak-point pause',3],['Complete lower (5s total descent, excluding pause)',null]];
      e.timing.descent=5;
      e.movement_cues.push('Petar Cycle 2: 5s total lowering plus 3s at the weakest point. Tap at the sticking point; descent countdown pauses during the hold.');
      e.video='https://youtu.be/_iZhxgcwSNA?t=16';
    }
    if(e.goal === 'muscle' && e.level>0) {
      e.branded_name=levels.muscle[e.level]; e.reps=3; e.rep_max=3;
      e.timing={phases:[['Pull and turnover',null],['Press to support',null],['Controlled return',null]]};
      e.movement_cues=[e.level===1?'Use sufficient band or foot assistance to complete a clean full bar muscle-up.':'Use a strict pull with no leg kick; bring both elbows over the bar together.', 'Pull high, turn both elbows over together, then press into straight-arm support.', 'Stop when speed, symmetrical turnover or control deteriorates.'];
    }
    return e;
  }
  function queue(routine, savedLevels={}, lighter=false) {
    let exercises=routine.exercises.map((e,i)=>({...configure(e,savedLevels),id:e.id || 'mobility-'+i}));
    if(routine.key==='skills_med_primary' && savedLevels.muscle>0) exercises=exercises.filter(e=>!['transition','dip'].includes(e.id)).map(e=>e.id==='high'?{...e,rest_seconds:90}:e);
    const out=[];
    if(routine.key==='skills_med_secondary')exercises=routine.exercises.map(e=>JSON.parse(JSON.stringify(e)));
    for(let i=0;i<exercises.length;) {
      const first=exercises[i], group=[first]; i++;
      if(first.group) while(i<exercises.length && exercises[i].group===first.group) group.push(exercises[i++]);
      const count=e=>lighter && !e.timing?.block && !e.keep_sets ? Math.max(1,e.sets-1):e.sets;
      for(let s=1;s<=Math.max(...group.map(count));s++) for(const e of group) if(s<=count(e)) {
        const steps=preparation(e);
        if(steps)for(const step of steps)out.push({...e,...step,parent_name:e.branded_name,id:e.id+'-'+step.slug,timing:{work:step.seconds},currentSetNumber:s,totalSets:count(e)});
        else out.push({...e,currentSetNumber:s,totalSets:count(e)});
      }
    }
    return out;
  }
  function preparation(e) {
    if(!['prep','easy-prep'].includes(e.id))return null;
    const easy=e.id==='easy-prep';
    const make=(slug,name,reps,seconds)=>({slug,branded_name:name,reps,reps_unit:'reps',seconds,rest_seconds:0});
    const steps=['forward','backward','side'].map(d=>({...make('wrists-'+d,'Wrist rocks — '+d,10,easy?20:30),source:'Mobility Toolkit W1 Day 1b: 10 reps per direction. App warm-up timing window.'}));
    steps.push({...make('palms','Palm Peel Aways',10,easy?20:40),source:'Mobility Toolkit W1 Day 1b: 10 reps. App warm-up timing window.'});
    for(const [slug,name] of [['flexor','Wrist Flexor Opener'],['extensor','Wrist Extensor Opener'],['fingers','Finger Stretch']])steps.push({...make(slug,name,10,easy?20:30),source:'Home Hero p.6: 10 reps. App warm-up timing window.'});
    steps.push({...make('scap-push','Scap Push-Up',10,40),source:'Home Hero p.6: 10 reps. App warm-up timing window.'});
    if(!easy){steps.push(make('easy-pull','Easy assisted pulls',3,30),make('easy-pike','Easy pike presses',5,40),make('easy-planche','Modest planche lean push-ups',5,50));steps.at(-1).rest_seconds=40;}
    return steps;
  }
  return {levels,primary,secondary,queue,preparation};
})();
