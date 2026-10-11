function mobilityApp() {
  return {
    mode:'selector',activeTab:'mobility',view:'routines',data:WorkoutStorage.fresh(),storageError:'',message:'',
    activeWorkoutQueue:[],currentSetIndex:0,session:null,editing:{},editingExercises:[],newExerciseName:'',editorOpen:false,wakeLock:null,
    timer:WorkoutTiming.create(),targetReps:1,rangeSeconds:2,lighter:false,clockHandle:null,lastTimerSave:0,
    routines:{...window.MOBILITY_ROUTINES,skills_med_primary:Training.primary,skills_med_secondary:Training.secondary},
    get headerTitle(){return this.mode==='review'?'Workout results':this.mode==='active'?this.session?.name:'Mobility Flow';},
    get currentStep(){return this.activeWorkoutQueue[this.currentSetIndex] || {};},
    get filteredRoutines(){return Object.fromEntries(Object.entries(this.routines).filter(([,r])=>(r.type || 'mobility')===this.activeTab));},
    routineExercises(r){return [...new Map(Training.queue(r,this.data.levels).map(e=>[e.id,e])).values()];},
    get result(){return this.session?.results[this.currentSetIndex] || {};},
    get sessionNotes(){return this.session?.notes || '';},
    set sessionNotes(value){if(this.session)this.session.notes=value;},
    get phase(){return this.timer.phases[this.timer.index] || {};},
    get stageTitle(){const e=this.currentStep;return (e.category || 'Mobility')+': '+(e.parent_name || e.branded_name || 'Workout');},
    get movementTitle(){return this.phase.movement || this.currentStep.branded_name || '';},
    get timerDisplay(){const value=Math.ceil(this.timer.remaining || 0);return value>=60?Math.floor(value/60)+':'+String(value%60).padStart(2,'0'):String(value)+'s';},
    get reviewGroups(){
      if(!this.session)return [];
      const groups=new Map();
      for(const r of this.session.results){const e=this.session.queue[r.queueIndex];if(!e)continue;const key=e.id;
        if(!groups.has(key))groups.set(key,{key,name:r.name,type:WorkoutTiming.logType(e),sides:WorkoutTiming.annotation(e).sides,rows:[]});groups.get(key).rows.push(r);}
      return [...groups.values()];
    },
    get annotation(){return WorkoutTiming.annotation(this.currentStep);},
    get prescription(){const e=this.currentStep;if(this.annotation.block)return e.reps_unit;return `${e.reps}${e.rep_max?'–'+e.rep_max:''} ${e.reps_unit || 'reps'}${this.annotation.sides && !/per |\/side/.test(e.reps_unit || '')?' per side':''}`;},
    get completedPrimary(){return this.data.sessions.filter(s=>s.key==='skills_med_primary' && s.status==='completed').length;},
    get lighterDue(){return (this.completedPrimary+1)%4===0;},
    get history(){return [...this.data.sessions].sort((a,b)=>b.date.localeCompare(a.date) || b.started.localeCompare(a.started));},
    get timingSummary(){
      const a=this.annotation,e=this.currentStep,out=[];
      if(a.block)out.push({value:a.block+'s',label:'Practice window'});
      if(a.hold)out.push({value:a.hold+'s',label:e.branded_name==='Duck Walks'?'Walking duration':'Hold'+(a.sides?' per side':'')});
      if(a.finalHold)out.push({value:a.finalHold+'s',label:'Final-rep hold'+(a.sides?' per side':'')});
      if(a.perHold)out.push({value:a.perHold+'s',label:'Hold each rep'});
      if(a.phases)for(const [label,s] of a.phases)if(s!==null)out.push({value:(a.range && label==='Lower'?a.range.join('–'):s)+'s',label});
      if(a.descent)out.push({value:a.descent+'s',label:'Total descent (excludes hold)'});
      if(a.sideRest)out.push({value:a.sideRest+'s',label:'Between arms'});
      if(e.rest_seconds)out.push({value:e.rest_seconds+'s',label:'Rest after set'});
      return out;
    },
    get suggestions(){
      const sessions=this.data.sessions.filter(s=>s.key==='skills_med_primary' && s.status==='completed' && !s.lighter);
      return Object.keys(Training.levels).filter(goal=>{
        const level=this.data.levels[goal];if(level>=Training.levels[goal].length-1 || sessions.length<2)return false;
        return sessions.slice(-2).every(s=>{
          const planned=s.queue.filter(e=>e.goal===goal),rows=s.results.filter(r=>r.goal===goal);
          return planned.length>0 && rows.length===planned.length && rows.every(r=>{
            const e=s.queue[r.queueIndex];
            return r.level===level && r.variation===e.branded_name && r.completed && (s.qualityConfirmed || r.clean && r.tempo && r.effort!=='' && Number(r.effort)>=1) && Number(r.reps)>=(e.rep_max || e.reps)
              && (!WorkoutTiming.annotation(e).sides || Number(r.repsOther)>=(e.rep_max || e.reps));
          });
        });
      });
    },
    initApp(){
      const state=WorkoutStorage.read();this.data=state.data;this.storageError=state.error;this.lighter=this.lighterDue;
      this.clockHandle=setInterval(()=>{this.tickTimer();if(['active','review'].includes(this.mode) && Date.now()-this.lastTimerSave>=1000){this.save();this.lastTimerSave=Date.now();}},100);
      document.addEventListener('visibilitychange',()=>{if(this.mode==='active' && document.visibilityState==='visible'){WorkoutTiming.tick(this.timer);this.requestWakeLock();}});
      window.addEventListener('pagehide',()=>this.save());
    },
    save(){if(this.session){this.session.index=this.currentSetIndex;this.session.targetReps=this.targetReps;this.session.rangeSeconds=this.rangeSeconds;this.session.timer=JSON.parse(JSON.stringify(this.timer));this.data.active=this.session;}this.storageError=WorkoutStorage.write(this.data);},
    async requestWakeLock(){try{if(!this.wakeLock && navigator.wakeLock)this.wakeLock=await navigator.wakeLock.request('screen');if(this.wakeLock)this.wakeLock.addEventListener('release',()=>this.wakeLock=null);}catch{}},
    releaseWakeLock(){const lock=this.wakeLock;this.wakeLock=null;try{const pending=lock?.release();if(pending?.catch)pending.catch(()=>{});}catch{}},
    startRoutine(key){
      if(!this.routines[key])return;
      if(this.data.active || this.session)this.deleteSession();
      this.message='';
      const r=this.routines[key],light=key==='skills_med_primary' && this.lighter;
      this.activeWorkoutQueue=Training.queue(r,this.data.levels,light);this.currentSetIndex=0;
      this.session={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),key,name:r.name,
        category:r.type || 'mobility',date:WorkoutStorage.date(this.data.timezone),started:new Date().toISOString(),status:'active',lighter:light,
        queue:this.activeWorkoutQueue,results:this.activeWorkoutQueue.map((e,i)=>this.blankResult(e,i)),notes:'',exerciseNotes:{},stage:'workout',guideVersion:2,index:0};
      this.mode='active';this.prepareTimer(true);this.save();this.requestWakeLock();this.scrollTop();
    },
    blankResult(e={},i=-1){return {name:e.branded_name || 'Custom exercise',variation:e.branded_name || '',exerciseId:e.id || '',queueIndex:i,
      goal:e.goal || null,level:e.level ?? null,set:e.currentSetNumber || 1,reps:'',repsOther:'',hold:'',holdOther:'',load:'',assistance:'',effort:'',notes:'',clean:false,tempo:false,completed:false};},
    prepareTimer(autoStart=false,now=Date.now()){
      this.targetReps=this.currentStep.reps;this.rangeSeconds=2;
      const phases=WorkoutTiming.guidedPhases(this.currentStep);
      WorkoutTiming.load(this.timer,[{label:'Get ready',seconds:5,target:phases[0]?.target || this.prescription,movement:phases[0]?.movement || this.currentStep.branded_name,kind:'preparation',side:phases[0]?.side || '',rep:0},...phases]);
      if(autoStart)WorkoutTiming.start(this.timer,now);
    },
    tickTimer(now=Date.now()){WorkoutTiming.tick(this.timer,now);if(this.mode==='active' && this.timer.done)this.nextSet(now);},
    resetTimer(){if(this.mode!=='active')return;const running=this.timer.running;this.prepareTimer(running);this.save();},
    rebuildTimer(){this.targetReps=Math.min(1000,Math.max(1,Math.floor(Number(this.targetReps)||1)));WorkoutTiming.load(this.timer,WorkoutTiming.phases(this.currentStep,this.targetReps,this.rangeSeconds),this.annotation.descent || 0);this.save();},
    timerStart(){WorkoutTiming.start(this.timer);this.save();},
    timerPause(){WorkoutTiming.pause(this.timer);this.save();},
    timerNext(){WorkoutTiming.next(this.timer);this.save();},
    timerRepeat(){const i=this.timer.done?this.timer.phases.length-1:this.timer.index;this.timer.index=i;this.timer.done=false;this.timer.running=false;this.timer.remaining=this.timer.phases[i]?.seconds ?? null;
      if(this.phase.label.startsWith('Lower toward'))this.timer.descentRemaining=this.annotation.descent || 0;
      if(this.phase.label.startsWith('Complete lower'))this.timer.descentRemaining=this.timer.descentPhaseStart;this.timer.descentDeadline=0;WorkoutTiming.start(this.timer);this.save();},
    finishEarly(){const i=this.timer.phases.findIndex(p=>p.kind==='rest');this.timer.running=false;this.timer.descentDeadline=0;if(i>=0){this.timer.index=i;this.timer.remaining=this.phase.seconds;WorkoutTiming.start(this.timer);}else{this.timer.done=true;this.timer.remaining=null;}this.save();},
    nextSet(now=Date.now()){
      if(!this.timer.done)return;
      this.result.visited=true;this.advance(now);
    },
    skipSet(){this.result.completed=false;this.result.notes=this.result.notes || 'Skipped';this.advance();},
    advance(now=Date.now()){this.message='';WorkoutTiming.pause(this.timer);if(this.currentSetIndex<this.activeWorkoutQueue.length-1){this.currentSetIndex++;this.prepareTimer(true,now);this.save();this.scrollTop();}else this.openReview();},
    openReview(){this.timerPause();this.session.stage='review';this.session.exerciseNotes=this.session.exerciseNotes || {};this.mode='review';this.save();this.releaseWakeLock();this.scrollTop();},
    saveReview(){
      if(!this.session.results.every(r=>this.validResult(r))){this.message='Use nonnegative numbers for your results.';return;}
      this.applyReviewResults();this.finishSession('completed');
    },
    applyReviewResults(){
      for(const group of this.reviewGroups)for(const r of group.rows){
        const first=group.type==='time'?r.hold:r.reps,other=group.type==='time'?r.holdOther:r.repsOther;
        r.completed=first!=='' && (!group.sides || other!=='');
        if(this.session.exerciseNotes[group.key]!==undefined)r.notes=this.session.exerciseNotes[group.key];
      }
    },
    prevSet(){if(this.currentSetIndex>0){WorkoutTiming.pause(this.timer);this.currentSetIndex--;this.prepareTimer();this.save();this.scrollTop();}},
    hasResult(r){return (r.reps!=='' || r.hold!=='') && (!this.annotation.sides || r.repsOther!=='' || r.holdOther!=='');},
    validResult(r){return Number.isInteger(r.set) && r.set>=1 && ['reps','repsOther'].every(k=>r[k]==='' || Number.isInteger(r[k])) && ['reps','repsOther','hold','holdOther','load','effort'].every(k=>r[k]==='' || typeof r[k]==='number' && Number.isFinite(r[k]) && r[k]>=0 && r[k]<=100000) && (r.effort==='' || r.effort<=10);},
    formatResult(r){return [r.variation,r.reps!==''?r.reps+' reps':'',r.repsOther!==''?r.repsOther+' reps other side':'',r.hold!==''?r.hold+'s hold':'',r.holdOther!==''?r.holdOther+'s other side':'',r.load!==''?r.load+' kg':'',r.effort!==''?r.effort+' RIR':''].filter(Boolean).join(' · ');},
    finishSession(status){
      if(!this.session)return;
      if(this.session.stage==='review')this.applyReviewResults();
      if(!this.session.results.every(r=>this.validResult(r))){this.message='Correct invalid set results before saving.';return;}
      WorkoutTiming.pause(this.timer);this.session.status=status;this.session.ended=new Date().toISOString();this.session.index=this.currentSetIndex;
      if(status==='completed' && !this.session.results.slice(0,this.session.queue.length).every(r=>r.completed))this.session.status='partial';
      this.data.sessions.push(JSON.parse(JSON.stringify(this.session)));this.session=null;this.data.active=null;this.mode='selector';this.view='logbook';this.lighter=this.lighterDue;this.save();this.releaseWakeLock();
      this.message=status==='abandoned'?'Session saved as abandoned.':'Session saved in your logbook.';
    },
    exitWorkout(){WorkoutTiming.pause(this.timer);this.save();this.session=null;this.mode='selector';this.releaseWakeLock();this.message='Session paused. Resume it whenever you are ready.';},
    resumeSession(){this.session=this.data.active;this.activeWorkoutQueue=this.session.queue;this.currentSetIndex=this.session.index;this.session.exerciseNotes=this.session.exerciseNotes || {};this.mode=this.session.stage==='review'?'review':'active';
      if(this.session.timer && this.session.guideVersion===2){this.timer=JSON.parse(JSON.stringify(this.session.timer));WorkoutTiming.pause(this.timer);}else{this.prepareTimer();this.session.guideVersion=2;}
      this.targetReps=this.session.targetReps || this.currentStep.reps;this.rangeSeconds=this.session.rangeSeconds || 2;this.message='';if(this.mode==='active')this.requestWakeLock();this.scrollTop();},
    closePending(status){this.session=this.data.active;this.currentSetIndex=this.session.index;this.finishSession(status);},
    deleteSession(id){
      const target=id || this.session?.id || this.data.active?.id;
      if(!target)return;
      const active=target===this.session?.id || target===this.data.active?.id;
      if(active){
        WorkoutTiming.pause(this.timer);this.session=null;this.data.active=null;
        this.mode='selector';this.activeWorkoutQueue=[];this.currentSetIndex=0;this.timer=WorkoutTiming.create();
        this.releaseWakeLock();this.view='routines';
      }
      this.data.sessions=this.data.sessions.filter(s=>s.id!==target);
      if(this.editorOpen && this.editing.id===target)this.editorOpen=false;
      this.lighter=this.lighterDue;this.save();
      this.message='Session deleted.';
      if(active)this.scrollTop();
    },
    changeLevel(goal,value){this.data.levels[goal]=Number(value);this.save();},
    acceptProgression(goal){this.changeLevel(goal,this.data.levels[goal]+1);this.message='New variation selected. Start with conservative assistance and clean technique.';},
    editSession(s){this.editing=JSON.parse(JSON.stringify(s));this.groupEditorExercises();this.editorOpen=true;this.message='';},
    groupEditorExercises(){
      const groups=new Map();
      for(const r of this.editing.results){
        const key=r.exerciseId || r.name+'|'+r.variation;
        if(!groups.has(key))groups.set(key,{name:r.name,rows:[]});
        groups.get(key).rows.push(r);
      }
      this.editingExercises=[...groups.values()].map(e=>{
        const source=this.editing.queue[e.rows[0].queueIndex];
        const type=source?WorkoutTiming.logType(source):e.rows.every(r=>r.reps==='' && (r.hold!=='' || r.holdOther!==''))?'time':'reps';
        const values=e.rows.map(r=>String(type==='time'?r.hold:r.reps)+((type==='time'?r.holdOther:r.repsOther)!==''?'/'+(type==='time'?r.holdOther:r.repsOther):''));
        const notes=[...new Set(e.rows.map(r=>r.notes).filter(Boolean))].join('\n');
        return {...e,type,sets:e.rows.length,reps:values.every(v=>v===values[0])?values[0]:values.join(', '),notes,originalNotes:notes};
      });this.newExerciseName='';
    },
    newEntry(){this.editing={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),key:'custom',name:'Manual workout',category:'calisthenics',date:WorkoutStorage.date(this.data.timezone),started:new Date().toISOString(),status:'completed',queue:[],results:[],notes:''};this.groupEditorExercises();this.editorOpen=true;this.message='';},
    addEditorExercise(){const name=this.newExerciseName.trim();if(!name)return;this.editingExercises.push({name,type:/hold|l[- ]?sit|handstand(?!.*push)/i.test(name)?'time':'reps',rows:[],reps:'',sets:1,notes:'',originalNotes:''});this.newExerciseName='';},
    saveEdit(){
      const results=[];
      for(const e of this.editingExercises){
        const values=String(e.reps).split(',').map(v=>v.trim());
        if(!Number.isInteger(e.sets) || e.sets<1 || e.sets>1000 || !e.name.trim() || values.length!==1 && values.length!==e.sets){this.message='Use a whole number of sets and either one rep count or one count per set, separated by commas.';return;}
        for(let i=0;i<e.sets;i++){
          const parts=values[values.length===1?0:i].split('/').map(v=>v.trim());
          if(parts.length>2 || parts.some(v=>v!=='' && !(e.type==='time'?/^\d+(\.\d+)?$/:/^\d+$/).test(v))){this.message='Use nonnegative numbers for time and whole numbers for reps. Use 5/4 for different sides.';return;}
          const r=e.rows[i]?JSON.parse(JSON.stringify(e.rows[i])):this.blankResult();
          const field=e.type==='time'?'hold':'reps',other=e.type==='time'?'holdOther':'repsOther';
          r.name=e.name;r.set=i+1;r[field]=parts[0]===''?'':Number(parts[0]);
          if(parts.length===2)r[other]=parts[1]===''?'':Number(parts[1]);
          if(!e.rows[i]){r.variation=e.name;r.completed=r[field]!=='';}
          if(e.notes!==e.originalNotes || !e.rows[i])r.notes=e.notes;
          if(!this.validResult(r)){this.message='Provide valid reps and sets.';return;}results.push(r);
        }
      }
      if(!this.editing.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(this.editing.date)){this.message='Provide a workout name and date.';return;}
      this.editing.results=results;
      const i=this.data.sessions.findIndex(s=>s.id===this.editing.id);if(i>=0)this.data.sessions[i]=this.editing;else this.data.sessions.push(this.editing);this.editorOpen=false;this.save();this.message='Logbook entry saved.';
    },
    exportData(){this.save();const blob=new Blob([JSON.stringify(this.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mobility-logbook-'+WorkoutStorage.date(this.data.timezone)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    async importData(event){try{const file=event.target.files[0];if(!file)return;if(file.size>10000000)throw Error('Backup exceeds 10 MB.');const incoming=WorkoutStorage.validate(JSON.parse(await file.text()));
      const empty=this.data.sessions.length===0 && !this.data.active;
      if(empty)this.data=incoming;else this.data=WorkoutStorage.merge(this.data,incoming);
      this.lighter=this.lighterDue;this.save();this.message=empty?'Backup restored, including saved levels and any unfinished session.':'History merged. Existing entry IDs, levels and unfinished session retained.';
    }catch(e){this.message='Import failed: '+e.message;}finally{event.target.value='';}},
    scrollTop(){window.scrollTo({top:0,behavior:'smooth'});}
  };
}
