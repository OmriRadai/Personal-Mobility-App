function mobilityApp() {
  return {
    mode:'selector',activeTab:'mobility',view:'routines',data:WorkoutStorage.fresh(),storageError:'',message:'',
    activeWorkoutQueue:[],currentSetIndex:0,session:null,editing:{},editorOpen:false,wakeLock:null,
    timer:WorkoutTiming.create(),targetReps:1,rangeSeconds:2,lighter:false,clockHandle:null,lastTimerSave:0,
    routines:{...window.MOBILITY_ROUTINES,skills_med_primary:Training.primary,skills_med_secondary:Training.secondary},
    get headerTitle(){return this.mode==='active'?this.session?.name:'Mobility Flow';},
    get currentStep(){return this.activeWorkoutQueue[this.currentSetIndex] || {};},
    get filteredRoutines(){return Object.fromEntries(Object.entries(this.routines).filter(([,r])=>(r.type || 'mobility')===this.activeTab));},
    get result(){return this.session?.results[this.currentSetIndex] || {};},
    get sessionNotes(){return this.session?.notes || '';},
    set sessionNotes(value){if(this.session)this.session.notes=value;},
    get phase(){return this.timer.phases[this.timer.index] || {};},
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
            return r.level===level && r.variation===e.branded_name && r.completed && r.clean && r.tempo && Number(r.reps)>=(e.rep_max || e.reps)
              && (!WorkoutTiming.annotation(e).sides || Number(r.repsOther)>=(e.rep_max || e.reps))
              && r.effort!=='' && Number(r.effort)>=1;
          });
        });
      });
    },
    initApp(){
      const state=WorkoutStorage.read();this.data=state.data;this.storageError=state.error;this.lighter=this.lighterDue;
      this.clockHandle=setInterval(()=>{WorkoutTiming.tick(this.timer);if(this.mode==='active' && Date.now()-this.lastTimerSave>=1000){this.save();this.lastTimerSave=Date.now();}},100);
      document.addEventListener('visibilitychange',()=>{if(this.mode==='active' && document.visibilityState==='visible'){WorkoutTiming.tick(this.timer);this.requestWakeLock();}});
      window.addEventListener('pagehide',()=>this.save());
    },
    save(){if(this.session){this.session.index=this.currentSetIndex;this.session.targetReps=this.targetReps;this.session.rangeSeconds=this.rangeSeconds;this.session.timer=JSON.parse(JSON.stringify(this.timer));this.data.active=this.session;}this.storageError=WorkoutStorage.write(this.data);},
    async requestWakeLock(){try{if(!this.wakeLock && navigator.wakeLock)this.wakeLock=await navigator.wakeLock.request('screen');if(this.wakeLock)this.wakeLock.addEventListener('release',()=>this.wakeLock=null);}catch{}},
    releaseWakeLock(){if(this.wakeLock)this.wakeLock.release().catch(()=>{});this.wakeLock=null;},
    startRoutine(key){
      if(this.data.active){this.message='Resume or save the unfinished session before starting another.';return;}
      const r=this.routines[key],light=key==='skills_med_primary' && this.lighter;
      this.activeWorkoutQueue=Training.queue(r,this.data.levels,light);this.currentSetIndex=0;
      this.session={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),key,name:r.name,
        category:r.type || 'mobility',date:WorkoutStorage.date(this.data.timezone),started:new Date().toISOString(),status:'active',lighter:light,
        queue:this.activeWorkoutQueue,results:this.activeWorkoutQueue.map((e,i)=>this.blankResult(e,i)),notes:'',index:0};
      this.mode='active';this.prepareTimer();this.save();this.requestWakeLock();this.scrollTop();
    },
    blankResult(e={},i=-1){return {name:e.branded_name || 'Custom exercise',variation:e.branded_name || '',exerciseId:e.id || '',queueIndex:i,
      goal:e.goal || null,level:e.level ?? null,set:e.currentSetNumber || 1,reps:'',repsOther:'',hold:'',holdOther:'',load:'',assistance:'',effort:'',notes:'',clean:false,tempo:false,completed:false};},
    prepareTimer(){this.targetReps=this.currentStep.reps;this.rangeSeconds=2;WorkoutTiming.load(this.timer,WorkoutTiming.phases(this.currentStep,this.targetReps,this.rangeSeconds),this.annotation.descent || 0);},
    rebuildTimer(){this.targetReps=Math.min(1000,Math.max(1,Math.floor(Number(this.targetReps)||1)));WorkoutTiming.load(this.timer,WorkoutTiming.phases(this.currentStep,this.targetReps,this.rangeSeconds),this.annotation.descent || 0);this.save();},
    timerStart(){WorkoutTiming.start(this.timer);this.save();},
    timerPause(){WorkoutTiming.pause(this.timer);this.save();},
    timerNext(){WorkoutTiming.next(this.timer);this.save();},
    timerRepeat(){const i=this.timer.done?this.timer.phases.length-1:this.timer.index;this.timer.index=i;this.timer.done=false;this.timer.running=false;this.timer.remaining=this.timer.phases[i]?.seconds ?? null;
      if(this.phase.label.startsWith('Lower toward'))this.timer.descentRemaining=this.annotation.descent || 0;
      if(this.phase.label.startsWith('Complete lower'))this.timer.descentRemaining=this.timer.descentPhaseStart;this.timer.descentDeadline=0;WorkoutTiming.start(this.timer);this.save();},
    finishEarly(){const i=this.timer.phases.findIndex(p=>p.kind==='rest');this.timer.running=false;this.timer.descentDeadline=0;if(i>=0){this.timer.index=i;this.timer.remaining=this.phase.seconds;WorkoutTiming.start(this.timer);}else{this.timer.done=true;this.timer.remaining=null;}this.save();},
    nextSet(){
      const r=this.result;if(!this.validResult(r)){this.message='Use nonnegative numbers for results, and reps in reserve from 0 to 10.';return;}
      if(!this.hasResult(r)){this.message='Enter actual reps or a hold duration, or use Skip set. Timer completion does not log performance.';return;}
      r.completed=true;this.advance();
    },
    skipSet(){this.result.completed=false;this.result.notes=this.result.notes || 'Skipped';this.advance();},
    advance(){this.message='';WorkoutTiming.pause(this.timer);if(this.currentSetIndex<this.activeWorkoutQueue.length-1){this.currentSetIndex++;this.prepareTimer();this.save();this.scrollTop();}else this.finishSession('completed');},
    prevSet(){if(this.currentSetIndex>0){WorkoutTiming.pause(this.timer);this.currentSetIndex--;this.prepareTimer();this.save();this.scrollTop();}},
    hasResult(r){return (r.reps!=='' || r.hold!=='') && (!this.annotation.sides || r.repsOther!=='' || r.holdOther!=='');},
    validResult(r){return Number.isInteger(r.set) && r.set>=1 && ['reps','repsOther','hold','holdOther','load','effort'].every(k=>r[k]==='' || typeof r[k]==='number' && Number.isFinite(r[k]) && r[k]>=0 && r[k]<=100000) && (r.effort==='' || r.effort<=10);},
    formatResult(r){return [r.variation,r.reps!==''?r.reps+' reps':'',r.repsOther!==''?r.repsOther+' reps other side':'',r.hold!==''?r.hold+'s hold':'',r.holdOther!==''?r.holdOther+'s other side':'',r.load!==''?r.load+' kg':'',r.effort!==''?r.effort+' RIR':''].filter(Boolean).join(' · ');},
    finishSession(status){
      if(!this.session)return;
      if(!this.session.results.every(r=>this.validResult(r))){this.message='Correct invalid set results before saving.';return;}
      WorkoutTiming.pause(this.timer);this.session.status=status;this.session.ended=new Date().toISOString();this.session.index=this.currentSetIndex;
      if(status==='completed' && !this.session.results.slice(0,this.session.queue.length).every(r=>r.completed))this.session.status='partial';
      this.data.sessions.push(JSON.parse(JSON.stringify(this.session)));this.session=null;this.data.active=null;this.mode='selector';this.view='logbook';this.lighter=this.lighterDue;this.save();this.releaseWakeLock();
      this.message=status==='abandoned'?'Session saved as abandoned.':'Session saved in your logbook.';
    },
    exitWorkout(){WorkoutTiming.pause(this.timer);this.save();this.session=null;this.mode='selector';this.releaseWakeLock();this.message='Session paused. Resume it whenever you are ready.';},
    resumeSession(){this.session=this.data.active;this.activeWorkoutQueue=this.session.queue;this.currentSetIndex=this.session.index;this.mode='active';
      if(this.session.timer){this.timer=JSON.parse(JSON.stringify(this.session.timer));WorkoutTiming.pause(this.timer);}else this.prepareTimer();
      this.targetReps=this.session.targetReps || this.currentStep.reps;this.rangeSeconds=this.session.rangeSeconds || 2;this.message='';this.requestWakeLock();this.scrollTop();},
    closePending(status){this.session=this.data.active;this.currentSetIndex=this.session.index;this.finishSession(status);},
    changeLevel(goal,value){this.data.levels[goal]=Number(value);this.save();},
    acceptProgression(goal){this.changeLevel(goal,this.data.levels[goal]+1);this.message='New variation selected. Start with conservative assistance and clean technique.';},
    editSession(s){this.editing=JSON.parse(JSON.stringify(s));this.editorOpen=true;},
    newEntry(){this.editing={id:crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),key:'custom',name:'Manual workout',category:'calisthenics',date:WorkoutStorage.date(this.data.timezone),started:new Date().toISOString(),status:'completed',queue:[],results:[],notes:''};this.addCustom(this.editing);this.editorOpen=true;},
    addCustom(s){s.results.push(this.blankResult());},
    saveEdit(){
      if(!this.editing.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(this.editing.date) || !this.editing.results.every(r=>this.validResult(r) && r.name.trim())){this.message='Provide a workout name, date, exercise names, and valid nonnegative results.';return;}
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
