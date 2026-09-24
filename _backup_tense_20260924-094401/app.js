const state = {
  view:'home',
  track:localStorage.getItem('eh_track')||'ssc',
  topic:'article',
  quiz:[], qIndex:0, score:0, selected:null, checked:false,
  sessionXp:0, sessionMode:'topic', sessionLabel:'Practice',
  xp:Number(localStorage.getItem('eh_xp')||0),
  history:safeArray('eh_history'),
  mistakes:safeObject('eh_mistakes'),
  practiceDays:safeArray('eh_practice_days'),
  examHistory:safeArray('eh_exam_history'),
  examAnswers:[], examDurationSec:0, examStartedAt:0, examSubmitted:false,
  qbFilter:{search:'',topic:'all',difficulty:'all',source:'all'},
  omrConfig:{title:'English Haters Practice Exam',name:'',roll:'',count:20},
  cloudQuestions:[], cloudLessons:[],
  secureSessionId:'', secureBusy:false, secureError:'',
  qbSecureRows:[], qbSecureSessionId:'', qbSecureLoaded:false, qbSecureLoading:false,
  account:{loading:true,user:null,profile:null,devices:[],message:'',error:'',syncing:false},
  newBadges:[], levelUp:null,
  achievements:safeArray('eh_achievements')
};

let examTimer=null;
let cloudSyncTimer=null;
let passwordRecoveryMode=new URLSearchParams(location.search).get('recovery')==='1';
let deferredInstallPrompt=null;
let lastRenderedView=null;

const tracks = {
  junior:{name:'Class 6–8',icon:'🌱',desc:'Build the foundation'},
  ssc:{name:'SSC',icon:'🎯',desc:'Board-focused grammar'},
  hsc:{name:'HSC',icon:'📘',desc:'Advanced board practice'},
  admission:{name:'Admission',icon:'🚀',desc:'Engineering + Varsity'}
};

const $ = s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function safeArray(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function safeObject(key){try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
function dedupeRows(rows){const map=new Map();rows.forEach(x=>{if(x&&x.id!=null)map.set(String(x.id),x)});return [...map.values()]}
function localProfile(){const p=safeObject('eh_profile');return {name:String(p.name||'English Hater'),avatar:String(p.avatar||'')}}
function saveLocalProfile(p){localStorage.setItem('eh_profile',JSON.stringify({name:String(p.name||'English Hater').slice(0,80),avatar:String(p.avatar||'')}))}
function activeProfile(){return state.account.profile||localProfile()}
function initials(name){const parts=String(name||'EH').trim().split(/\s+/).filter(Boolean);return (parts.slice(0,2).map(x=>x[0]).join('')||'EH').toUpperCase().slice(0,2)}
function avatarSrc(){return String(activeProfile().avatar_url||activeProfile().avatar||'')}
function avatarHtml(cls='avatar'){const src=avatarSrc();return src?`<div class="${cls}"><img src="${esc(src)}" alt="Profile photo"></div>`:`<div class="${cls}">${esc(initials(activeProfile().name))}</div>`}
function progressPayload(){return {xp:state.xp,track:state.track,history:state.history.slice(-5000),mistakes:state.mistakes,practiceDays:state.practiceDays.slice(-400),examHistory:state.examHistory.slice(-100),achievements:[...new Set(state.achievements)]}}
function applyProgress(p){if(!p)return;state.xp=Number(p.xp||0);state.history=Array.isArray(p.history_json)?p.history_json:[];state.mistakes=p.mistakes_json&&typeof p.mistakes_json==='object'?p.mistakes_json:{};state.practiceDays=Array.isArray(p.practice_days_json)?p.practice_days_json:[];state.examHistory=Array.isArray(p.exam_history_json)?p.exam_history_json:[];state.achievements=Array.isArray(p.achievements_json)?p.achievements_json:[]}
function clearProgress(){state.xp=0;state.history=[];state.mistakes={};state.practiceDays=[];state.examHistory=[];state.achievements=[];localStorage.removeItem('eh_xp');localStorage.removeItem('eh_history');localStorage.removeItem('eh_mistakes');localStorage.removeItem('eh_practice_days');localStorage.removeItem('eh_exam_history');localStorage.removeItem('eh_achievements')}
function scheduleCloudSync(){if(!window.EHBackend?.enabled||!state.account.user)return;clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(async()=>{try{state.account.syncing=true;await EHBackend.pushProgress(progressPayload());state.account.syncing=false;if(state.view==='profile')render()}catch(e){state.account.syncing=false;state.account.error=`Sync failed: ${e.message}`;if(state.view==='profile')render()}},900)}
async function compressAvatarFile(file){
  if(!file)throw new Error('Choose a photo first.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPG, PNG or WebP image.');
  if(file.size>5*1024*1024)throw new Error('Please choose an image smaller than 5 MB.');
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read that image.'));r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Could not open that image.'));i.src=data});
  const size=Math.min(512,img.naturalWidth,img.naturalHeight);const sx=(img.naturalWidth-size)/2,sy=(img.naturalHeight-size)/2;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d').drawImage(img,sx,sy,size,size,0,0,512,512);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));if(!blob)throw new Error('Could not process that image.');
  const dataUrl=canvas.toDataURL('image/jpeg',.76);return {blob,dataUrl};
}
function questions(){return dedupeRows([...(window.EH_QUESTIONS||[]),...safeArray('eh_custom_questions'),...state.cloudQuestions]).filter(q=>q.published!==false)}
function lessons(){return dedupeRows([...(window.EH_LESSONS||[]),...safeArray('eh_custom_lessons'),...state.cloudLessons]).filter(l=>l.published!==false)}
function humanTopic(slug){return String(slug||'').split('-').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ')}
function getLesson(track,topic){const matching=lessons().filter(l=>l.track===track&&l.topic===topic);return matching[matching.length-1]||null}
function getTopics(track){
  const map=new Map();
  lessons().filter(l=>l.track===track).forEach(l=>map.set(l.topic,{slug:l.topic,title:l.title||humanTopic(l.topic),sort:Number(l.sort_order||0)}));
  questions().filter(q=>q.track===track).forEach(q=>{if(!map.has(q.topic))map.set(q.topic,{slug:q.topic,title:humanTopic(q.topic),sort:999})});
  return [...map.values()].sort((a,b)=>a.sort-b.sort||a.title.localeCompare(b.title));
}
function topicTitle(track,topic){return getLesson(track,topic)?.title||humanTopic(topic)}
function qKey(q){return `${q.track}:${String(q.id)}`}
function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function dayFromKey(key){const [y,m,d]=String(key).split('-').map(Number);return new Date(y,m-1,d)}
function calcStreak(){
  const unique=[...new Set(state.practiceDays)].sort();
  if(!unique.length)return 0;
  const today=dayKey(); const y=new Date();y.setDate(y.getDate()-1);const yesterday=dayKey(y);
  const last=unique[unique.length-1]; if(last!==today&&last!==yesterday)return 0;
  let streak=1; let cursor=dayFromKey(last);
  for(let i=unique.length-2;i>=0;i--){cursor.setDate(cursor.getDate()-1);if(unique[i]===dayKey(cursor))streak++;else if(unique[i]!==last)break}
  return streak;
}
function updatePracticeDay(){const k=dayKey();if(!state.practiceDays.includes(k))state.practiceDays.push(k);state.practiceDays=state.practiceDays.slice(-400)}
function todayAttempts(){const k=dayKey();return state.history.filter(h=>dayKey(new Date(h.ts))===k).length}
function levelInfo(){
  const level=Math.max(1,Math.floor(state.xp/100)+1),within=state.xp%100;
  const titles=['Starter','Builder','Challenger','Scholar','Master','Legend'];
  const title=level>=20?titles[5]:level>=12?titles[4]:level>=8?titles[3]:level>=5?titles[2]:level>=3?titles[1]:titles[0];
  return {level,within,next:100,percent:Math.min(100,within),title};
}
function rowsToday(){const k=dayKey();return state.history.filter(h=>dayKey(new Date(h.ts))===k)}
function rowsThisWeek(){const keys=new Set(weekSnapshot().map(x=>x.key));return state.history.filter(h=>keys.has(dayKey(new Date(h.ts))))}
function examsThisWeek(){const keys=new Set(weekSnapshot().map(x=>x.key));return state.examHistory.filter(x=>keys.has(dayKey(new Date(x.ts))))}
function missionData(){
  const today=rowsToday(),todayCorrect=today.filter(x=>x.correct).length,todayReview=today.filter(x=>x.correct&&x.mode==='mistakes').length;
  const week=weekStats(),weekExams=examsThisWeek();
  const daily=[
    {id:'daily-five',icon:'⚡',title:'Daily five',text:'Answer 5 questions',value:today.length,target:5},
    {id:'daily-correct',icon:'🎯',title:'Three right',text:'Get 3 answers correct',value:todayCorrect,target:3},
    activeMistakeCount()?{id:'daily-repair',icon:'🧠',title:'Repair mode',text:'Get 2 Mistake Book answers right',value:todayReview,target:2}:{id:'daily-explore',icon:'📖',title:'Explore',text:'Practice 2 different topics',value:new Set(today.map(x=>`${x.track}:${x.topic}`)).size,target:2}
  ];
  const weekly=[
    {id:'week-days',icon:'🔥',title:'Show up',text:'Be active on 4 days',value:week.activeDays,target:4},
    {id:'week-answers',icon:'💪',title:'Build volume',text:'Answer 30 questions',value:week.attempts,target:30},
    {id:'week-exams',icon:'📝',title:'Test yourself',text:'Complete 2 timed exams',value:weekExams.length,target:2}
  ];
  const norm=m=>({...m,value:Math.min(m.value,m.target),done:m.value>=m.target,percent:Math.min(100,Math.round(m.value/m.target*100))});
  return {daily:daily.map(norm),weekly:weekly.map(norm)};
}
function achievementCatalog(){
  const total=state.history.length,correct=state.history.filter(x=>x.correct).length,accuracy=total?Math.round(correct/total*100):0,streak=calcStreak(),earned=new Set(state.achievements||[]);
  let bestMastery=0;Object.keys(tracks).forEach(track=>getTopics(track).forEach(t=>bestMastery=Math.max(bestMastery,getTopicStats(track,t.slug).mastery)));
  const hadWrong=state.history.some(x=>!x.correct),perfectExam=state.examHistory.some(x=>Number(x.percent)===100);
  return [
    {id:'first-step',icon:'🌱',title:'First Step',text:'Answer your first question',unlocked:earned.has('first-step')||total>=1},
    {id:'daily-five',icon:'⚡',title:'Daily Five',text:'Complete five questions in one day',unlocked:earned.has('daily-five')||todayAttempts()>=5},
    {id:'streak-3',icon:'🔥',title:'On Fire',text:'Reach a 3-day streak',unlocked:earned.has('streak-3')||streak>=3},
    {id:'streak-7',icon:'🏅',title:'Week Warrior',text:'Reach a 7-day streak',unlocked:earned.has('streak-7')||streak>=7},
    {id:'xp-100',icon:'✨',title:'Century',text:'Earn 100 XP',unlocked:earned.has('xp-100')||state.xp>=100},
    {id:'xp-500',icon:'⚡',title:'Power Learner',text:'Earn 500 XP',unlocked:earned.has('xp-500')||state.xp>=500},
    {id:'answers-50',icon:'💪',title:'Fifty Strong',text:'Answer 50 questions',unlocked:earned.has('answers-50')||total>=50},
    {id:'answers-250',icon:'🚀',title:'Question Grinder',text:'Answer 250 questions',unlocked:earned.has('answers-250')||total>=250},
    {id:'first-exam',icon:'📝',title:'Exam Ready',text:'Complete a timed exam',unlocked:earned.has('first-exam')||state.examHistory.length>=1},
    {id:'perfect-exam',icon:'🏆',title:'Perfect Paper',text:'Score 100% on a timed exam',unlocked:earned.has('perfect-exam')||perfectExam},
    {id:'mastery-80',icon:'🎓',title:'Topic Master',text:'Reach 80% mastery in any topic',unlocked:earned.has('mastery-80')||bestMastery>=80},
    {id:'accuracy-80',icon:'🎯',title:'Sharp Shooter',text:'Maintain 80% accuracy after 50 answers',unlocked:earned.has('answers-50')||total>=50&&accuracy>=80},
    {id:'clean-slate',icon:'🧠',title:'Clean Slate',text:'Clear every active mistake after making one',unlocked:earned.has('clean-slate')||(hadWrong&&total>=10&&activeMistakeCount()===0)}
  ];
}
function unlockedAchievementIds(){return new Set(achievementCatalog().filter(x=>x.unlocked).map(x=>x.id))}
function backfillAchievements(){const ids=achievementCatalog().filter(x=>x.unlocked).map(x=>x.id);state.achievements=[...new Set([...(state.achievements||[]),...ids])];localStorage.setItem('eh_achievements',JSON.stringify(state.achievements))}
function captureProgressUnlocks(beforeIds,oldLevel){
  const catalog=achievementCatalog();const fresh=catalog.filter(x=>x.unlocked&&!beforeIds.has(x.id));
  if(fresh.length){state.newBadges=[...state.newBadges,...fresh].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);state.achievements=[...new Set([...(state.achievements||[]),...fresh.map(x=>x.id)])]}
  const li=levelInfo();if(li.level>oldLevel)state.levelUp={level:li.level,title:li.title};
}
function milestoneData(){
  const a=achievementCatalog(),locked=a.filter(x=>!x.unlocked);
  const candidates=[
    {icon:'⚡',title:'100 XP',value:state.xp,target:100,show:state.xp<100},
    {icon:'🔥',title:'3-day streak',value:calcStreak(),target:3,show:calcStreak()<3},
    {icon:'💪',title:'50 answers',value:state.history.length,target:50,show:state.history.length<50},
    {icon:'🏅',title:'7-day streak',value:calcStreak(),target:7,show:calcStreak()>=3&&calcStreak()<7},
    {icon:'✨',title:'500 XP',value:state.xp,target:500,show:state.xp>=100&&state.xp<500},
    {icon:'🚀',title:'250 answers',value:state.history.length,target:250,show:state.history.length>=50&&state.history.length<250}
  ].filter(x=>x.show);
  const m=candidates[0]||{icon:'🏆',title:locked[0]?.title||'All current badges unlocked',value:1,target:1};
  return {...m,percent:Math.min(100,Math.round(m.value/m.target*100))};
}
function activityCalendar(days=28){const out=[];for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dayKey(d);const count=state.history.filter(h=>dayKey(new Date(h.ts))===key).length;out.push({key,count,today:i===0,label:d.toLocaleDateString(undefined,{month:'short',day:'numeric'})})}return out}
function weekSnapshot(){
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dayKey(d);days.push({key,label:d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,1),active:state.practiceDays.includes(key),today:i===0})}return days;
}
function weekStats(){
  const keys=new Set(weekSnapshot().map(x=>x.key));const rows=state.history.filter(h=>keys.has(dayKey(new Date(h.ts))));const correct=rows.filter(h=>h.correct).length;return {attempts:rows.length,accuracy:rows.length?Math.round(correct/rows.length*100):0,activeDays:weekSnapshot().filter(x=>x.active).length};
}
function activeMistakeCount(track=null){return Object.values(state.mistakes).filter(m=>!track||String(m.key||'').startsWith(`${track}:`)).length}
function recommendedTopic(track=state.track){
  const topics=getTopics(track);if(!topics.length)return null;
  const attempted=topics.map(t=>({t,s:getTopicStats(track,t.slug)})).filter(x=>x.s.attempts>0).sort((a,b)=>a.s.mastery-b.s.mastery||b.s.attempts-a.s.attempts);
  return attempted[0]?.t||topics[0];
}
function recommendation(){
  const mistakes=activeMistakeCount(state.track);if(mistakes)return {kind:'mistakes',icon:'🧠',title:'Review your mistakes',text:`${mistakes} active mistake${mistakes===1?'':'s'} can be turned into mastery.`,button:'Revise mistakes'};
  const t=recommendedTopic(state.track);if(t){const stats=getTopicStats(state.track,t.slug);return {kind:'topic',topic:t.slug,icon:stats.attempts?'🎯':'📖',title:stats.attempts?`Strengthen ${t.title}`:`Start ${t.title}`,text:stats.attempts?`${stats.mastery}% mastery • ${stats.accuracy}% accuracy`:'Read the rule, then practice a short set.',button:stats.attempts?'Practice weak topic':'Learn this topic'}}
  return {kind:'random',icon:'⚡',title:'Start with five questions',text:'A short session is enough to keep your learning moving.',button:'Start practice'};
}
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function save(){
  localStorage.setItem('eh_xp',state.xp);
  localStorage.setItem('eh_track',state.track);
  localStorage.setItem('eh_history',JSON.stringify(state.history.slice(-5000)));
  localStorage.setItem('eh_mistakes',JSON.stringify(state.mistakes));
  localStorage.setItem('eh_practice_days',JSON.stringify(state.practiceDays));
  localStorage.setItem('eh_exam_history',JSON.stringify(state.examHistory.slice(-100)));
  localStorage.setItem('eh_achievements',JSON.stringify([...new Set(state.achievements)]));
  localStorage.setItem('eh_progress_updated_at',String(Date.now()));
  scheduleCloudSync();
}
function shuffle(arr){const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function getTopicStats(track,topic){
  const a=state.history.filter(h=>h.track===track&&h.topic===topic);
  const correct=a.filter(h=>h.correct).length;
  const accuracy=a.length?Math.round(correct/a.length*100):0;
  const confidence=Math.min(a.length/10,1);
  return {attempts:a.length,correct,accuracy,mastery:Math.round(accuracy*confidence)};
}
function trackMastery(track){const topics=getTopics(track);if(!topics.length)return 0;return Math.round(topics.reduce((s,t)=>s+getTopicStats(track,t.slug).mastery,0)/topics.length)}
function mistakeQuestions(track=null){
  const byKey=new Map(questions().map(q=>[qKey(q),q]));
  return Object.values(state.mistakes).sort((a,b)=>(b.lastWrong||0)-(a.lastWrong||0)).map(m=>({m,q:byKey.get(m.key)})).filter(x=>x.q&&(!track||x.q.track===track));
}
function nav(){const active=v=>v?' aria-current="page"':'';return `<nav class="nav" aria-label="Primary navigation">
<button type="button" data-v="home" class="${state.view==='home'?'active':''}"${active(state.view==='home')}><b aria-hidden="true">⌂</b><span>Home</span></button>
<button type="button" data-v="learn" class="${state.view==='learn'||state.view==='rule'?'active':''}"${active(state.view==='learn'||state.view==='rule')}><b aria-hidden="true">📖</b><span>Learn</span></button>
<button type="button" data-v="practiceHub" class="${['practiceHub','quiz','result'].includes(state.view)?'active':''}"${active(['practiceHub','quiz','result'].includes(state.view))}><b aria-hidden="true">⚡</b><span>Practice</span></button>
<button type="button" data-v="examHub" class="${['examHub','exam','examResult','questionBank','omr'].includes(state.view)?'active':''}"${active(['examHub','exam','examResult','questionBank','omr'].includes(state.view))}><b aria-hidden="true">📝</b><span>Exam</span></button>
<button type="button" data-v="profile" class="${state.view==='profile'?'active':''}"${active(state.view==='profile')}><b aria-hidden="true">👤</b><span>Profile</span></button></nav>`}
function header(){const cloud=Boolean(window.EHBackend?.enabled&&state.account.user);return `<div class="topbar"><div class="brand-wrap"><div class="brand">English Haters <span class="beta">ALPHA</span></div><span class="brand-sub">Learn • Practice • Improve</span></div><div class="top-actions">${cloud?'<span class="cloud-dot" title="Cloud sync active" aria-label="Cloud sync active" role="img">☁</span>':''}<button class="avatar-button" data-v="profile" aria-label="Open profile">${avatarHtml('avatar')}</button></div></div>`}
function home(){
  const done=Math.min(todayAttempts(),5),streak=calcStreak(),rec=recommendation(),li=levelInfo(),week=weekStats(),name=String(activeProfile().name||'English Hater').split(/\s+/)[0];
  const weekDays=weekSnapshot(),missions=missionData(),dailyDone=missions.daily.filter(x=>x.done).length,milestone=milestoneData(),ach=achievementCatalog(),unlocked=ach.filter(x=>x.unlocked);
  return `${header()}
  <section class="welcome-row"><div><span class="eyebrow">${greeting()}</span><h1>${esc(name)} 👋</h1><p>${tracks[state.track].icon} ${tracks[state.track].name} • ${trackMastery(state.track)}% path mastery</p></div><button class="mini-switch" data-v="learn">View path ›</button></section>
  <section class="hero mission-hero"><div class="mission-copy"><div class="eyebrow">Today's mission • ${dailyDone}/3 complete</div><h2>${done>=5?'Daily goal secured. Build on it?':'Five questions. One small win.'}</h2><p>${done>=5?'Your streak is protected for today. Extra practice can finish the other missions and build mastery.':'Build consistency before intensity. Finish your five-question daily goal.'}</p><div class="mission-dots">${Array.from({length:5},(_,i)=>`<i class="${i<done?'done':''}"></i>`).join('')}</div><button class="hero-cta" id="quick">${done>=5?'Practice 5 more':'Continue daily mission'}</button></div><div class="mission-score"><b>${done}</b><span>/ 5</span><small>today</small></div></section>
  <div class="stats home-stats"><div class="stat"><b>🔥 ${streak}</b><span>day streak</span></div><div class="stat"><b>⚡ ${state.xp}</b><span>total XP</span></div><div class="stat"><b>Lv. ${li.level}</b><span>${esc(li.title)}</span></div></div>
  <div class="card continue-card"><div class="continue-icon">${rec.icon}</div><div class="continue-copy"><span class="eyebrow">Recommended next</span><h3>${esc(rec.title)}</h3><p>${esc(rec.text)}</p></div><button class="small-action continue-action" data-smart-start="${esc(rec.kind)}" ${rec.topic?`data-smart-topic="${esc(rec.topic)}"`:''}>${esc(rec.button)} →</button></div>
  <div class="section-head"><h2>Daily missions</h2><small>${dailyDone}/3 complete</small></div><div class="mission-list">${missions.daily.map(m=>`<div class="card mission-row ${m.done?'mission-done':''}"><div class="mission-icon">${m.done?'✓':m.icon}</div><div><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p><div class="progress tiny"><i style="width:${m.percent}%"></i></div></div><b>${m.value}/${m.target}</b></div>`).join('')}</div>
  <div class="card milestone-card"><div class="milestone-icon">${milestone.icon}</div><div><span class="eyebrow">Next milestone</span><h3>${esc(milestone.title)}</h3><div class="progress tiny"><i style="width:${milestone.percent}%"></i></div><small>${Math.min(milestone.value,milestone.target)}/${milestone.target}</small></div></div>
  <div class="section-head"><h2>This week</h2><small>${week.activeDays}/7 active days</small></div><div class="card week-card"><div class="week-strip">${weekDays.map(d=>`<div class="week-day ${d.active?'active':''} ${d.today?'today':''}"><span>${d.label}</span><i>${d.active?'✓':'·'}</i></div>`).join('')}</div><div class="week-meta"><span><b>${week.attempts}</b> answers</span><span><b>${week.accuracy}%</b> accuracy</span><span><b>${activeMistakeCount()}</b> mistakes</span></div></div>
  <div class="section-head"><h2>Badges</h2><small>${unlocked.length}/${ach.length} unlocked</small></div><div class="badge-peek">${ach.slice(0,6).map(a=>`<div class="badge-chip ${a.unlocked?'unlocked':'locked'}" title="${esc(a.text)}"><span>${a.unlocked?a.icon:'🔒'}</span><b>${esc(a.title)}</b></div>`).join('')}</div><button class="text-link center-link" data-v="profile">View all achievements →</button>
  <div class="section-head"><h2>Your learning paths</h2><small>Tap to continue</small></div><div class="grid path-grid">${Object.entries(tracks).map(([k,t])=>{const m=trackMastery(k);return `<button class="card track path-card ${state.track===k?'current':''}" data-track="${k}"><div class="path-top"><div class="icon">${t.icon}</div>${state.track===k?'<span class="current-badge">Current</span>':''}</div><h3>${t.name}</h3><p>${t.desc}</p><div class="progress"><i style="width:${m}%"></i></div><small class="mastery-label">${m}% mastery</small></button>`}).join('')}</div>`
}

function learn(){
  const t=tracks[state.track],list=getTopics(state.track),mastery=trackMastery(state.track),rec=recommendedTopic(state.track);
  return `${header()}<div class="page-head-row"><div><span class="eyebrow">Learning path</span><h1 class="page-title">${t.icon} ${t.name}</h1><p class="sub">Read a short rule, see an example, then practice immediately.</p></div><div class="path-score"><b>${mastery}%</b><span>mastery</span></div></div>${trackSwitcher()}
  ${rec?`<div class="card learn-next"><div><span class="eyebrow">Continue here</span><h3>${esc(rec.title)}</h3><p>${getTopicStats(state.track,rec.slug).attempts?`${getTopicStats(state.track,rec.slug).attempts} attempts • ${getTopicStats(state.track,rec.slug).accuracy}% accuracy`:'New topic • start with the rule'}</p></div><button class="small-action" data-topic="${esc(rec.slug)}">Open →</button></div>`:''}
  <div class="section-head"><h2>Topics</h2><small>${list.length} in this path</small></div>${list.length?`<div class="lesson-list path-list">${list.map((item,i)=>{const s=getTopicStats(state.track,item.slug),status=s.mastery>=80?'Strong':s.attempts?'In progress':'New';return `<button class="card lesson path-lesson" data-topic="${esc(item.slug)}"><div class="n ${s.mastery>=80?'complete':''}">${s.mastery>=80?'✓':i+1}</div><div class="lesson-copy"><div class="lesson-title-row"><h4>${esc(item.title)}</h4><span class="topic-status ${status==='Strong'?'strong':status==='In progress'?'progressing':''}">${status}</span></div><p>Rule → Example → Practice</p><div class="progress tiny"><i style="width:${s.mastery}%"></i></div><small>${s.attempts?`${s.mastery}% mastery • ${s.attempts} attempts`:'Not practiced yet'}</small></div><div class="arrow">›</div></button>`}).join('')}</div>`:'<div class="card empty"><h3>No topics yet</h3><p>Published lessons for this path will appear here.</p></div>'}`
}
function rule(){
  const l=getLesson(state.track,state.topic);const title=l?.title||humanTopic(state.topic);const ruleText=l?.rule||'A short lesson has not been added yet. You can still practice the available questions for this topic.';const examples=Array.isArray(l?.examples)?l.examples:[];const stats=getTopicStats(state.track,state.topic);
  return `${header()}<button class="cta secondary" id="backLearn">← Back to topics</button><div style="height:12px"></div><div class="card rule"><div class="eyebrow">Learn</div><h2>${esc(title)}</h2><p>${esc(ruleText)}</p>${examples.length?`<div class="example"><b>Example${examples.length>1?'s':''}</b><br>${examples.map(esc).join(' • ')}</div>`:''}<div class="mastery-box"><div><b>${stats.mastery}% mastery</b><span>${stats.attempts} attempts • ${stats.accuracy}% accuracy</span></div><div class="progress"><i style="width:${stats.mastery}%"></i></div></div><button class="cta" id="practiceTopic">Practice this topic</button></div>`
}
function trackSwitcher(){return `<div class="segment">${Object.entries(tracks).map(([k,t])=>`<button data-practice-track="${k}" class="${state.track===k?'active':''}">${t.icon} ${t.name}</button>`).join('')}</div>`}
function practiceHub(){
  const topics=getTopics(state.track),total=questions().filter(q=>q.track===state.track).length,mappedMistakes=mistakeQuestions(state.track),mistakeCount=activeMistakeCount(state.track),rec=recommendation(),week=weekStats();
  const bankLabel=window.EHBackend?.enabled&&state.account.user?'Protected cloud bank':`${total} local questions`;
  return `${header()}<div class="page-head-row"><div><span class="eyebrow">Training room</span><h1 class="page-title">Practice</h1><p class="sub">Choose a short session or target exactly what needs work.</p></div><div class="path-score"><b>${trackMastery(state.track)}%</b><span>mastery</span></div></div>${trackSwitcher()}
  <div class="card smart-practice"><div class="continue-icon">${rec.icon}</div><div><span class="eyebrow">Smart suggestion</span><h3>${esc(rec.title)}</h3><p>${esc(rec.text)}</p></div><button class="cta" data-smart-start="${esc(rec.kind)}" ${rec.topic?`data-smart-topic="${esc(rec.topic)}"`:''}>${esc(rec.button)}</button></div>
  <div class="practice-kpis"><div><b>${week.attempts}</b><span>this week</span></div><div><b>${week.accuracy}%</b><span>accuracy</span></div><div><b>${mistakeCount}</b><span>to revise</span></div></div>
  <div class="mode-grid">
    <div class="card mode-card featured"><div class="mode-icon">⚡</div><div class="mode-label">DAILY</div><h3>Quick Random</h3><p>Five mixed questions from ${tracks[state.track].name}. Fast enough for any day.</p><button class="cta" id="quickHub">Start 5 questions</button></div>
    <div class="card mode-card"><div class="mode-icon">🧩</div><h3>Custom Practice</h3><p>Choose topic, difficulty and question count.</p><button class="cta secondary" id="showCustom">Build practice</button></div>
    <div class="card mode-card"><div class="mode-icon">🧠</div><h3>Mistake Book</h3><p>${mistakeCount} question${mistakeCount===1?'':'s'} waiting for revision.</p><button class="cta secondary" id="practiceMistakes" ${mistakeCount?'':'disabled'}>Revise mistakes</button></div>
    <div class="card mode-card"><div class="mode-icon">🔐</div><h3>Protected Bank</h3><p>${bankLabel}. Answers stay protected until you check them.</p><button class="cta secondary" data-v="questionBank">Open Question Bank</button></div>
  </div>
  <div id="customBuilder" class="card builder hidden">${customBuilder()}</div>
  <div class="section-head"><h2>Practice by topic</h2><small>${topics.length} topics</small></div>
  <div class="lesson-list">${topics.map(t=>{const s=getTopicStats(state.track,t.slug);return `<div class="card topic-practice"><div class="topic-main"><div><h4>${esc(t.title)}</h4><p>${s.attempts?`${s.attempts} attempts • ${s.accuracy}% accuracy`:'New topic'}</p></div><b>${s.mastery}%</b></div><div class="progress tiny"><i style="width:${s.mastery}%"></i></div><button class="small-action" data-start-topic="${esc(t.slug)}">Practice</button></div>`}).join('')||'<div class="card empty">No topics available yet.</div>'}</div>
  ${mappedMistakes.length?`<div class="section-head"><h2>Recent mistakes</h2><small>Auto-saved</small></div><div class="mistake-list">${mappedMistakes.slice(0,4).map(({m,q})=>`<div class="card mistake-item"><div><span class="tagline">${tracks[q.track].name} • ${esc(topicTitle(q.track,q.topic))}</span><h4>${esc(q.question)}</h4><p>Wrong ${m.wrongCount} time${m.wrongCount===1?'':'s'} • ${m.recovery||0}/2 recovery answers</p></div></div>`).join('')}</div>`:''}`
}
function customBuilder(){
  const topics=getTopics(state.track);return `<div class="builder-head"><div><div class="eyebrow">Custom Practice</div><h3>Build your set</h3></div><button class="icon-close" id="hideCustom">×</button></div><form id="customForm"><div class="practice-form"><label>Topic<select id="customTopic" name="topic"><option value="all">All topics</option>${topics.map(t=>`<option value="${esc(t.slug)}">${esc(t.title)}</option>`).join('')}</select></label><label>Difficulty<select name="difficulty"><option value="all">All levels</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label>Questions<select name="count"><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="all">All available</option></select></label></div><button class="cta" type="submit">Start custom practice</button></form>`
}
function buildQuiz({mode='random',track=state.track,topic='all',difficulty='all',count=5}={}){
  let pool=questions();
  if(track)pool=pool.filter(q=>q.track===track);
  if(topic&&topic!=='all')pool=pool.filter(q=>q.topic===topic);
  if(difficulty&&difficulty!=='all')pool=pool.filter(q=>String(q.difficulty||'easy').toLowerCase()===difficulty);
  if(mode==='mistakes'){
    const keys=new Set(mistakeQuestions(track).map(x=>qKey(x.q)));pool=pool.filter(q=>keys.has(qKey(q)));
  }
  pool=shuffle(pool);
  const n=count==='all'?pool.length:Math.max(1,Number(count)||5);
  return pool.slice(0,n);
}
async function startQuiz(config){
  state.quiz=[];state.qIndex=0;state.score=0;state.selected=null;state.checked=false;state.sessionXp=0;state.sessionMode=config.mode||'practice';state.secureError='';state.newBadges=[];state.levelUp=null;
  state.sessionLabel=config.label||({random:'Quick Random',topic:'Topic Practice',custom:'Custom Practice',mistakes:'Mistake Book'}[config.mode]||'Practice');
  if(config.track)state.track=config.track;if(config.topic&&config.topic!=='all')state.topic=config.topic;
  const useSecure=Boolean(window.EHBackend?.enabled&&state.account.user);
  if(useSecure){
    state.secureBusy=true;state.view='quiz';render();
    try{const data=config.mode==='mistakes'?await EHBackend.createMistakeSession(Object.keys(state.mistakes),config):await EHBackend.createQuestionSession(config);state.secureSessionId=data.session_id||'';state.quiz=Array.isArray(data.questions)?data.questions:[]}
    catch(err){state.quiz=[];state.secureError=err.message||String(err)}
    state.secureBusy=false;save();render();return;
  }
  state.secureSessionId='';state.quiz=buildQuiz(config);state.view='quiz';save();render();
}
function quiz(){
  const qs=state.quiz;if(state.secureBusy)return `${header()}<div class="card empty"><h3>Preparing protected practice…</h3><p>Only this small question set is being delivered to your account.</p></div>`;
  if(!qs.length)return `${header()}<div class="card empty"><h3>${state.secureError?'Could not load protected questions':'No matching questions'}</h3><p>${esc(state.secureError||'Try another topic or difficulty, or add more questions from Content Admin.')}</p><button class="cta secondary" data-v="practiceHub">Back to Practice</button></div>`;
  if(state.qIndex>=qs.length){state.view='result';return result()}
  const q=qs[state.qIndex];const isCorrect=state.selected===Number(q.answer);
  return `${header()}<div class="quiz-top"><button class="text-btn" data-v="practiceHub">✕ Exit</button><span>${esc(state.sessionLabel)}</span><b>⚡ +${state.sessionXp}</b></div><div class="card quiz"><div class="qmeta"><span>${tracks[q.track]?.name||q.track} • ${esc(topicTitle(q.track,q.topic))} • ${esc(q.difficulty||'easy')}</span><span>${state.qIndex+1}/${qs.length}</span></div><div class="progress"><i style="width:${((state.qIndex)/qs.length)*100}%"></i></div><h2 class="question" tabindex="-1">${esc(q.question)}</h2><div class="choices">${(q.choices||[]).map((c,i)=>{let cl='choice';if(state.checked){if(i===Number(q.answer))cl+=' correct';else if(i===state.selected)cl+=' wrong'}else if(i===state.selected)cl+=' selected';return `<button type="button" class="${cl}" data-choice="${i}" aria-pressed="${i===state.selected}"><span class="choice-key">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`}).join('')}</div>${state.checked?`<div class="feedback ${isCorrect?'good':'bad'}"><b>${isCorrect?'Correct! +10 XP':'Not quite. +2 XP for practicing'}</b><br>${esc(q.explanation||'Review the rule and try a similar question again.')}${!isCorrect?'<br><small>Added to your Mistake Book.</small>':''}</div>`:''}<div class="row">${!state.checked?`<button class="cta" id="check" ${state.selected===null?'disabled':''}>Check answer</button>`:`<button class="cta" id="next">${state.qIndex+1===qs.length?'See result':'Next question'}</button>`}</div></div>`
}
function result(){
  const total=state.quiz.length,pct=total?Math.round(state.score/total*100):0,wrong=Math.max(0,total-state.score),msg=pct>=80?'Strong session!':pct>=60?'Good progress. Keep practicing.':'Mistakes are your revision map.';
  const unlocks=[...(state.levelUp?[{icon:'⬆️',title:`Level ${state.levelUp.level} • ${state.levelUp.title}`,text:'New level reached'}]:[]),...state.newBadges];
  return `${header()}<div class="card result result-v2"><div class="result-icon">${pct>=80?'🏆':pct>=60?'💪':'🧠'}</div><div class="eyebrow">${esc(state.sessionLabel)} complete</div><div class="score">${pct}%</div><h2>${state.score}/${total} correct</h2><p class="sub">${msg}</p><div class="result-stats"><span><b>+${state.sessionXp}</b> XP</span><span><b>${wrong}</b> mistakes</span><span><b>🔥 ${calcStreak()}</b> streak</span></div>${unlocks.length?`<div class="unlock-panel"><span class="eyebrow">Unlocked</span>${unlocks.map(x=>`<div class="unlock-item"><span>${x.icon}</span><div><b>${esc(x.title)}</b><small>${esc(x.text||'Achievement unlocked')}</small></div></div>`).join('')}</div>`:''}<div class="result-actions"><button class="cta" id="retrySession">Practice another set</button>${activeMistakeCount()?'<button class="cta secondary" id="resultMistakes">Review mistakes</button>':''}<button class="text-link" data-v="home">Back to dashboard</button></div></div>`
}


function sourceLabel(q){
  const name=String(q.source_name||'').trim();const year=q.source_year?` • ${q.source_year}`:'';
  if(name)return `${name}${year}`;
  if(String(q.source_type||'').toLowerCase()==='original')return 'English Haters Original';
  return q.source_type?`${humanTopic(q.source_type)}${year}`:'English Haters Practice';
}
function examHub(){
  const topics=getTopics(state.track);const total=questions().filter(q=>q.track===state.track).length;const recent=state.examHistory.filter(x=>x.track===state.track).slice(-3).reverse();
  return `${header()}<h1 class="page-title">Exam Center</h1><p class="sub">Timed tests, question-bank review and printable tutor tools.</p>${trackSwitcher()}
  <div class="exam-actions">
    <button class="card exam-action" id="openExamBuilder"><span>⏱️</span><div><h3>Timed Exam</h3><p>Build a random or topic-specific MCQ test.</p></div><b>›</b></button>
    <button class="card exam-action" data-v="questionBank"><span>🏦</span><div><h3>Question Bank</h3><p>Browse questions, sources and solutions.</p></div><b>›</b></button>
    <button class="card exam-action" data-v="omr"><span>📄</span><div><h3>OMR Sheet</h3><p>Print or save a clean OMR as PDF.</p></div><b>›</b></button>
  </div>
  <div id="examBuilder" class="card builder"><div class="builder-head"><div><div class="eyebrow">Exam Generator</div><h3>Build an exam</h3></div><span class="tagline">${total} available</span></div>
  <form id="examForm"><div class="exam-form-grid"><label>Topic<select name="topic"><option value="all">All topics</option>${topics.map(t=>`<option value="${esc(t.slug)}">${esc(t.title)}</option>`).join('')}</select></label><label>Difficulty<select name="difficulty"><option value="all">All levels</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label>Questions<select name="count"><option value="5">5</option><option value="10" selected>10</option><option value="20">20</option><option value="25">25</option><option value="50">50</option><option value="all">All available</option></select></label><label>Time<select name="minutes"><option value="5">5 min</option><option value="10" selected>10 min</option><option value="15">15 min</option><option value="20">20 min</option><option value="30">30 min</option><option value="60">60 min</option></select></label></div><div class="two-actions"><button class="cta" type="submit">Start timed exam</button><button class="cta secondary" type="button" id="printTutorPaper">Print paper + OMR</button></div></form></div>
  ${recent.length?`<div class="section-head"><h2>Recent exams</h2><small>Saved locally</small></div><div class="lesson-list">${recent.map(x=>`<div class="card exam-history"><div><h4>${esc(x.label||'Exam')}</h4><p>${new Date(x.ts).toLocaleDateString()} • ${x.correct}/${x.total} correct • ${x.minutes} min</p></div><b>${x.percent}%</b></div>`).join('')}</div>`:''}`
}
function buildExamFromForm(form){const d=new FormData(form);return {mode:'exam',track:state.track,topic:d.get('topic'),difficulty:d.get('difficulty'),count:d.get('count'),minutes:Number(d.get('minutes')||10),label:`${tracks[state.track].name} Exam`}}
async function startExam(config){
  state.quiz=[];state.qIndex=0;state.score=0;state.newBadges=[];state.levelUp=null;state.examDurationSec=Math.max(60,Number(config.minutes||10)*60);state.examStartedAt=Date.now();state.examSubmitted=false;state.sessionLabel=config.label||'Timed Exam';state.sessionMode='exam';state.secureError='';
  const useSecure=Boolean(window.EHBackend?.enabled&&state.account.user);
  if(useSecure){
    state.secureBusy=true;state.view='exam';render();
    try{const data=await EHBackend.createQuestionSession({...config,mode:'exam'});state.secureSessionId=data.session_id||'';state.quiz=Array.isArray(data.questions)?data.questions:[]}
    catch(err){state.quiz=[];state.secureError=err.message||String(err)}
    state.secureBusy=false;
  }else{state.secureSessionId='';state.quiz=buildQuiz(config)}
  state.examAnswers=Array(state.quiz.length).fill(null);state.examStartedAt=Date.now();save();render();
}
function examRemaining(){return Math.max(0,state.examDurationSec-Math.floor((Date.now()-state.examStartedAt)/1000))}
function fmtTime(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function startExamTimer(){
  clearInterval(examTimer);if(state.view!=='exam')return;
  const tick=()=>{const el=$('#examTimer');const r=examRemaining();if(el)el.textContent=fmtTime(r);if(r<=0){clearInterval(examTimer);submitExam(true)}};tick();examTimer=setInterval(tick,1000);
}
function exam(){
  const qs=state.quiz;if(state.secureBusy)return `${header()}<div class="card empty"><h3>Preparing protected exam…</h3><p>The answer key remains on the server until you submit.</p></div>`;
  if(!qs.length)return `${header()}<div class="card empty"><h3>${state.secureError?'Could not load protected exam':'No matching questions'}</h3><p>${esc(state.secureError||'Add more questions or change the exam filters.')}</p><button class="cta secondary" data-v="examHub">Back to Exam Center</button></div>`;
  const q=qs[state.qIndex];const answered=state.examAnswers.filter(x=>x!==null).length;
  return `${header()}<div class="exam-top"><button class="text-btn" id="exitExam">✕ Exit</button><div><small>Time left</small><b id="examTimer">${fmtTime(examRemaining())}</b></div><div><small>Answered</small><b>${answered}/${qs.length}</b></div></div><div class="card quiz"><div class="qmeta"><span>${tracks[q.track]?.name||q.track} • ${esc(topicTitle(q.track,q.topic))}</span><span>${state.qIndex+1}/${qs.length}</span></div><div class="progress"><i style="width:${((state.qIndex+1)/qs.length)*100}%"></i></div><h2 class="question" tabindex="-1">${esc(q.question)}</h2><div class="choices">${(q.choices||[]).map((c,i)=>`<button type="button" class="choice ${state.examAnswers[state.qIndex]===i?'selected':''}" data-exam-choice="${i}" aria-pressed="${state.examAnswers[state.qIndex]===i}"><span class="choice-key">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join('')}</div><div class="exam-nav-row"><button class="cta secondary" id="examPrev" ${state.qIndex===0?'disabled':''}>← Previous</button><button class="cta secondary" id="examNext" ${state.qIndex===qs.length-1?'disabled':''}>Next →</button></div><div class="question-palette">${qs.map((_,i)=>`<button data-exam-jump="${i}" class="${i===state.qIndex?'current':''} ${state.examAnswers[i]!==null?'answered':''}">${i+1}</button>`).join('')}</div><button class="cta danger-lite" id="submitExam">Submit exam</button></div>`
}
async function submitExam(auto=false){
  if(state.examSubmitted||!state.quiz.length)return;if(!auto&&!confirm('Submit this exam now? You will see the answers after submission.'))return;
  state.examSubmitted=true;clearInterval(examTimer);state.secureError='';
  if(state.secureSessionId&&window.EHBackend?.enabled&&state.account.user){
    state.secureBusy=true;render();
    try{
      const data=await EHBackend.submitSecureExam(state.secureSessionId,state.examAnswers);
      const byId=new Map((data.results||[]).map(r=>[String(r.question_id),r]));
      state.quiz=state.quiz.map(q=>{const r=byId.get(String(q.id));return r?{...q,answer:r.answer,explanation:r.explanation||''}:q});
    }catch(err){state.examSubmitted=false;state.secureBusy=false;state.secureError=err.message||String(err);render();return}
    state.secureBusy=false;
  }
  const before=unlockedAchievementIds(),oldLevel=levelInfo().level;
  let correct=0;let xp=0;
  state.quiz.forEach((q,i)=>{const selected=state.examAnswers[i];const ok=selected===Number(q.answer);if(ok){correct++;xp+=5}const key=qKey(q);const existing=state.mistakes[key];if(!ok){state.mistakes[key]={key,wrongCount:Number(existing?.wrongCount||0)+1,lastWrong:Date.now(),recovery:0}}else if(existing){const recovery=Number(existing.recovery||0)+1;if(recovery>=2)delete state.mistakes[key];else state.mistakes[key]={...existing,recovery}}state.history.push({questionKey:key,id:q.id,track:q.track,topic:q.topic,difficulty:q.difficulty||'easy',selected,correct:ok,mode:'exam',ts:Date.now()})});
  state.score=correct;state.xp+=xp;updatePracticeDay();const percent=Math.round(correct/state.quiz.length*100);state.examHistory.push({id:`exam-${Date.now()}`,track:state.track,label:state.sessionLabel,total:state.quiz.length,correct,percent,minutes:Math.round(state.examDurationSec/60),autoSubmitted:auto,ts:Date.now()});captureProgressUnlocks(before,oldLevel);state.view='examResult';save();render();
}
function examResult(){
  const total=state.quiz.length;const pct=total?Math.round(state.score/total*100):0;const unanswered=state.examAnswers.filter(x=>x===null).length;
  return `${header()}<div class="card result"><div class="eyebrow">${state.examSubmitted?'Exam submitted':'Exam complete'}</div><div class="score">${pct}%</div><h2>${state.score}/${total} correct</h2><p class="sub">${unanswered?`${unanswered} unanswered • `:''}${pct>=80?'Strong performance.':pct>=60?'Good base. Review the mistakes next.':'Use the review below as your revision list.'}</p><span class="pill">+${state.score*5} XP</span><span class="pill">🔥 ${calcStreak()} day streak</span>${(state.levelUp||state.newBadges.length)?`<div class="unlock-panel exam-unlocks"><span class="eyebrow">Unlocked</span>${state.levelUp?`<div class="unlock-item"><span>⬆️</span><div><b>Level ${state.levelUp.level} • ${esc(state.levelUp.title)}</b><small>New level reached</small></div></div>`:''}${state.newBadges.map(x=>`<div class="unlock-item"><span>${x.icon}</span><div><b>${esc(x.title)}</b><small>${esc(x.text)}</small></div></div>`).join('')}</div>`:''}</div><div class="section-head"><h2>Answer review</h2><small>With explanations</small></div><div class="review-list">${state.quiz.map((q,i)=>{const sel=state.examAnswers[i],ok=sel===Number(q.answer);return `<div class="card review-item ${ok?'review-good':'review-bad'}"><div class="review-head"><b>${i+1}. ${esc(q.question)}</b><span>${ok?'✓':'✕'}</span></div><p>Your answer: ${sel===null?'Not answered':`${String.fromCharCode(65+sel)}. ${esc(q.choices[sel])}`}</p><p>Correct: ${String.fromCharCode(65+Number(q.answer))}. ${esc(q.choices[Number(q.answer)])}</p><div class="review-explanation">${esc(q.explanation||'')}</div><small>${esc(sourceLabel(q))}</small></div>`}).join('')}</div><div style="height:14px"></div><button class="cta" data-v="examHub">Back to Exam Center</button>`
}
async function loadSecureQuestionBank(){
  if(!window.EHBackend?.enabled||!state.account.user)return;
  state.qbSecureLoading=true;state.secureError='';render();
  try{const data=await EHBackend.browseSecureQuestions({...state.qbFilter,track:state.track,count:20});state.qbSecureRows=Array.isArray(data.questions)?data.questions:[];state.qbSecureSessionId=data.session_id||'';state.qbSecureLoaded=true}
  catch(err){state.qbSecureRows=[];state.secureError=err.message||String(err)}
  state.qbSecureLoading=false;render();
}
function questionBank(){
  const secureMode=Boolean(window.EHBackend?.enabled&&state.account.user);const localAll=questions().filter(q=>q.track===state.track);const all=secureMode?(state.qbSecureLoaded?state.qbSecureRows:[]):localAll;const topics=getTopics(state.track);const sources=[...new Set(all.map(q=>sourceLabel(q)))].sort();let rows=all;
  const f=state.qbFilter;if(!secureMode&&f.search){const s=f.search.toLowerCase();rows=rows.filter(q=>`${q.question} ${q.explanation||''} ${q.source_name||''} ${q.source_year||''}`.toLowerCase().includes(s))}if(!secureMode&&f.topic!=='all')rows=rows.filter(q=>q.topic===f.topic);if(!secureMode&&f.difficulty!=='all')rows=rows.filter(q=>String(q.difficulty||'easy')===f.difficulty);if(!secureMode&&f.source!=='all')rows=rows.filter(q=>sourceLabel(q)===f.source);
  return `${header()}<button class="text-btn" data-v="examHub">← Exam Center</button><h1 class="page-title">Question Bank</h1><p class="sub">Search, filter and reveal solutions. Imported board/admission metadata appears automatically.</p>${secureMode?`<div class="card secure-note"><b>🔐 Protected cloud bank</b><p>Only 20 matching questions are delivered at a time. Answers stay server-side until revealed.</p><button class="small-action" id="loadSecureQb" ${state.qbSecureLoading?'disabled':''}>${state.qbSecureLoading?'Loading…':state.qbSecureLoaded?'Refresh protected results':'Load protected results'}</button>${state.secureError?`<p class="account-alert bad">${esc(state.secureError)}</p>`:''}</div>`:''}${trackSwitcher()}<form id="qbFilterForm" class="card qb-filter"><input name="search" placeholder="Search question, source or year" value="${esc(f.search)}"><div class="qb-filter-grid"><select name="topic"><option value="all">All topics</option>${topics.map(t=>`<option value="${esc(t.slug)}" ${f.topic===t.slug?'selected':''}>${esc(t.title)}</option>`).join('')}</select><select name="difficulty"><option value="all">All difficulty</option>${['easy','medium','hard'].map(x=>`<option value="${x}" ${f.difficulty===x?'selected':''}>${humanTopic(x)}</option>`).join('')}</select><select name="source"><option value="all">All sources</option>${sources.map(x=>`<option value="${esc(x)}" ${f.source===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div><button class="cta" type="submit">Apply filters</button></form><div class="section-head"><h2>${rows.length} questions</h2><small>${tracks[state.track].name}</small></div><div class="qb-list">${rows.slice(0,200).map((q,i)=>`<div class="card qb-item"><div class="qmeta"><span>${esc(topicTitle(q.track,q.topic))} • ${esc(q.difficulty||'easy')}</span><span>${esc(sourceLabel(q))}</span></div><h4>${i+1}. ${esc(q.question)}</h4><div class="qb-options">${q.choices.map((c,j)=>`<span>${String.fromCharCode(65+j)}. ${esc(c)}</span>`).join('')}</div><button class="small-action" data-qb-reveal="${esc(qKey(q))}">Show answer & solution</button><div id="sol-${esc(qKey(q).replace(/[^a-zA-Z0-9_-]/g,'-'))}" class="qb-solution hidden"><b>${q.answer===undefined?'Answer protected until reveal':`Answer: ${String.fromCharCode(65+Number(q.answer))}. ${esc(q.choices[Number(q.answer)])}`}</b><p>${esc(q.explanation||'')}</p></div></div>`).join('')||'<div class="card empty">No questions match these filters.</div>'}</div>${rows.length>200?'<p class="sub">Showing the first 200 matching questions in this local beta.</p>':''}`
}
function omr(){const c=state.omrConfig;return `${header()}<button class="text-btn" data-v="examHub">← Exam Center</button><h1 class="page-title">OMR Sheet Generator</h1><p class="sub">For self-practice, tutors and coaching batches. Use Print → Save as PDF for a PDF copy.</p><form id="omrForm" class="card builder"><div class="omr-form"><label>Exam title<input name="title" value="${esc(c.title)}"></label><label>Student name<input name="name" placeholder="Optional" value="${esc(c.name)}"></label><label>Roll / ID<input name="roll" placeholder="Optional" value="${esc(c.roll)}"></label><label>Questions<select name="count">${[10,20,25,30,40,50,100].map(n=>`<option value="${n}" ${Number(c.count)===n?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="two-actions"><button class="cta" type="submit">Preview OMR</button><button class="cta secondary" type="button" id="printOmr">Print / Save PDF</button></div></form>${omrPreview(c)}<div class="two-actions"><button class="cta secondary" id="downloadOmrHtml">Download OMR HTML</button><button class="cta secondary" data-v="examHub">Back to Exam Center</button></div>`}
function omrPreview(c){const count=Math.max(1,Number(c.count)||20);return `<div class="omr-preview card"><div class="omr-brand">ENGLISH HATERS</div><h2>${esc(c.title||'Practice Exam')}</h2><div class="omr-info"><span>Name: ${esc(c.name||'____________________')}</span><span>Roll/ID: ${esc(c.roll||'____________')}</span><span>Questions: ${count}</span></div><div class="omr-grid">${Array.from({length:count},(_,i)=>`<div class="omr-row"><b>${i+1}</b>${['A','B','C','D'].map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}</div></div>`}
function omrDocument(c,questionHtml=''){return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.title||'English Haters OMR')}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px}.meta{display:flex;justify-content:space-between;gap:15px;margin:14px 0;font-size:13px}.omr{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 28px}.row{display:grid;grid-template-columns:35px repeat(4,1fr);align-items:center;font-size:12px;padding:3px 0;border-bottom:1px dotted #ccc}.bubble{display:inline-grid;place-items:center;width:20px;height:20px;border:1.5px solid #111;border-radius:50%;margin-right:4px}.paper{page-break-after:always}.q{margin:0 0 13px;font-size:13px}.opts{display:grid;grid-template-columns:1fr 1fr;gap:3px 18px;margin:5px 0 0 18px}@media print{button{display:none}}</style></head><body>${questionHtml}<div class="head"><h2 style="margin:0">ENGLISH HATERS</h2><h3>${esc(c.title||'Practice Exam')} — OMR</h3></div><div class="meta"><span>Name: ${esc(c.name||'____________________')}</span><span>Roll/ID: ${esc(c.roll||'____________')}</span><span>Total: ${Number(c.count)||20}</span></div><div class="omr">${Array.from({length:Number(c.count)||20},(_,i)=>`<div class="row"><b>${i+1}</b>${['A','B','C','D'].map(x=>`<span><i class="bubble"></i>${x}</span>`).join('')}</div>`).join('')}</div></body></html>`}
function printHtml(html){const w=window.open('','_blank');if(!w){alert('Please allow pop-ups for printing.');return}w.document.open();w.document.write(html);w.document.close();setTimeout(()=>{w.focus();w.print()},250)}
function downloadText(name,text,type='text/html;charset=utf-8'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function tutorPaper(config){const qs=buildQuiz(config);if(!qs.length){alert('No matching questions for this paper.');return}const c={title:`${tracks[state.track].name} English Practice`,name:'',roll:'',count:qs.length};const paper=`<section class="paper"><div class="head"><h2 style="margin:0">ENGLISH HATERS</h2><h3>${esc(c.title)}</h3></div><div class="meta"><span>Name: ____________________</span><span>Roll: ____________</span><span>Time: ${Number(config.minutes)||10} min</span></div>${qs.map((q,i)=>`<div class="q"><b>${i+1}. ${esc(q.question)}</b><div class="opts">${q.choices.map((x,j)=>`<span>${String.fromCharCode(65+j)}. ${esc(x)}</span>`).join('')}</div></div>`).join('')}</section>`;printHtml(omrDocument(c,paper))}

function accountPanel(){
  const a=state.account,p=activeProfile(),cloud=Boolean(window.EHBackend?.enabled);
  if(cloud&&a.loading)return `<div class="card account-card"><div class="account-status"><span class="status-dot"></span><div><h3>Connecting your account…</h3><p>Checking cloud profile and progress.</p></div></div></div>`;
  if(cloud&&!a.user)return `<div class="card account-card"><div class="account-title"><div><div class="eyebrow">Cloud account</div><h2>Save your progress on every device</h2><p>Register or sign in. Your streak, XP, mistakes and profile photo can follow you.</p></div><span class="cloud-badge">☁ Ready</span></div>${a.error?`<div class="account-alert bad">${esc(a.error)}</div>`:''}${a.message?`<div class="account-alert good">${esc(a.message)}</div>`:''}<div class="auth-grid"><form id="signInForm" class="auth-box"><h3>Sign in</h3><label>Email<input type="email" name="email" autocomplete="email" required placeholder="student@example.com"></label><label>Password<input type="password" name="password" autocomplete="current-password" required minlength="6"></label><button class="cta" type="submit">Sign in</button><button class="auth-link" id="showReset" type="button">Forgot password?</button></form><form id="signUpForm" class="auth-box"><h3>Create account</h3><label>Name<input name="name" autocomplete="name" required maxlength="80" placeholder="Your name"></label><label>Email<input type="email" name="email" autocomplete="email" required placeholder="student@example.com"></label><label>Password<input type="password" name="password" autocomplete="new-password" required minlength="6" placeholder="Minimum 6 characters"></label><button class="cta secondary" type="submit">Create free account</button></form></div><form id="resetPasswordForm" class="reset-box hidden"><b>Reset your password</b><p>Enter the email used for English Haters. We will send a secure recovery link.</p><div class="reset-row"><input type="email" name="email" required placeholder="student@example.com"><button class="small-action" type="submit">Send link</button></div></form><p class="micro-note">Beta device policy: maximum ${Number(window.EH_BACKEND_CONFIG?.maxDevices||2)} registered devices per account.</p></div>`;
  if(cloud&&a.user&&passwordRecoveryMode)return `<div class="card account-card"><div class="account-title"><div><div class="eyebrow">Account recovery</div><h2>Choose a new password</h2><p>Your recovery link was accepted. Set a new password to finish.</p></div><span class="cloud-badge">🔐 Secure</span></div>${a.error?`<div class="account-alert bad">${esc(a.error)}</div>`:''}${a.message?`<div class="account-alert good">${esc(a.message)}</div>`:''}<form id="updatePasswordForm" class="auth-box recovery-form"><label>New password<input type="password" name="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"></label><label>Confirm password<input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label><button class="cta" type="submit">Update password</button></form></div>`;
  const profilePhoto=`<div class="profile-photo-wrap">${avatarHtml('profile-photo')}<label class="photo-action">📷 ${avatarSrc()?'Change photo':'Add photo'}<input id="avatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>${avatarSrc()?'<button class="photo-remove" id="removeAvatar" type="button">Remove</button>':''}</div>`;
  if(!cloud)return `<div class="card account-card"><div class="profile-editor">${profilePhoto}<form id="localProfileForm" class="profile-fields"><div><div class="eyebrow">Local Beta profile</div><h2>${esc(p.name)}</h2><p>Your photo is stored only in this browser for now.</p></div><label>Display name<input name="name" maxlength="80" value="${esc(p.name)}" required></label><button class="cta" type="submit">Save profile</button></form></div>${a.error?`<div class="account-alert bad">${esc(a.error)}</div>`:''}${a.message?`<div class="account-alert good">${esc(a.message)}</div>`:''}<div class="local-cloud-note"><b>☁ Cloud mode is ready in the code.</b><span>Complete SETUP-SUPABASE.md when you want real registration, photo storage and multi-device sync.</span></div>${deferredInstallPrompt?'<button class="cta secondary install-app" id="installApp" type="button">📲 Install English Haters</button>':''}<div class="legal-links"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div></div>`;
  const devices=(a.devices||[]).map(d=>`<div class="device-row"><div><b>${d.current?'📍 ':''}${esc(d.device_name||'Browser')}</b><span>${d.current?'Current device • ':''}Last used ${new Date(d.last_seen_at||d.created_at).toLocaleDateString()}</span></div>${d.current?'<span class="tag green">Current</span>':`<button class="small-action danger-lite" data-remove-device="${esc(d.id)}">Remove</button>`}</div>`).join('')||'<div class="empty mini">No registered devices found.</div>';
  return `<div class="card account-card"><div class="profile-editor">${profilePhoto}<form id="cloudProfileForm" class="profile-fields"><div><div class="eyebrow">Student account</div><h2>${esc(p.name||'English Hater')}</h2><p>${esc(p.email||a.user?.email||'')}</p></div><label>Display name<input name="name" maxlength="80" value="${esc(p.name||'')}" required></label><button class="cta" type="submit">Save profile</button></form></div>${a.error?`<div class="account-alert bad">${esc(a.error)}</div>`:''}${a.message?`<div class="account-alert good">${esc(a.message)}</div>`:''}<div class="sync-row"><span><b>${a.syncing?'Syncing…':'☁ Cloud sync active'}</b><small>Progress is backed up to your account.</small></span><button class="small-action" id="syncNow">Sync now</button></div><div class="section-head compact"><h3>Registered devices</h3><small>${a.devices.length}/${Number(window.EH_BACKEND_CONFIG?.maxDevices||2)}</small></div><div class="device-list">${devices}</div><button class="cta secondary" id="signOut" type="button">Sign out</button>${deferredInstallPrompt?'<button class="cta secondary install-app" id="installApp" type="button">📲 Install English Haters</button>':''}<div class="legal-links"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div></div>`;
}
function profile(){
  const correct=state.history.filter(x=>x.correct).length,accuracy=state.history.length?Math.round(correct/state.history.length*100):0,week=weekStats(),li=levelInfo(),missions=missionData(),ach=achievementCatalog(),unlocked=ach.filter(x=>x.unlocked),milestone=milestoneData();
  const attempted=[];Object.keys(tracks).forEach(track=>getTopics(track).forEach(t=>{const s=getTopicStats(track,t.slug);if(s.attempts)attempted.push({track,topic:t.slug,title:t.title,...s})}));
  attempted.sort((a,b)=>a.mastery-b.mastery||b.attempts-a.attempts);const weak=attempted.slice(0,4),mistakeCount=activeMistakeCount(),isAdmin=state.account.profile?.role==='admin',cal=activityCalendar(28);
  return `${header()}<div class="page-head-row"><div><span class="eyebrow">English Passport</span><h1 class="page-title">Your Profile</h1><p class="sub">Identity, consistency, accuracy and mastery in one place.</p></div><div class="level-orb"><b>${li.level}</b><span>${esc(li.title.toUpperCase())}</span></div></div>${accountPanel()}
  <div class="stats profile-stats"><div class="stat"><b>${accuracy}%</b><span>all-time accuracy</span></div><div class="stat"><b>🔥 ${calcStreak()}</b><span>current streak</span></div><div class="stat"><b>${mistakeCount}</b><span>active mistakes</span></div></div>
  <div class="card level-card"><div class="panel-title"><div><span class="eyebrow">Level ${li.level} • ${esc(li.title)}</span><h3>${li.within}/100 XP to Level ${li.level+1}</h3><p>${state.xp} total XP • progress comes from real practice</p></div><b>⚡</b></div><div class="progress level-progress"><i style="width:${li.percent}%"></i></div></div>
  <div class="card milestone-card profile-milestone"><div class="milestone-icon">${milestone.icon}</div><div><span class="eyebrow">Next milestone</span><h3>${esc(milestone.title)}</h3><div class="progress tiny"><i style="width:${milestone.percent}%"></i></div><small>${Math.min(milestone.value,milestone.target)}/${milestone.target}</small></div></div>
  <div class="section-head"><h2>28-day consistency</h2><small>${calcStreak()} day current streak</small></div><div class="card heatmap-card"><div class="heatmap">${cal.map(d=>`<i class="heat-${Math.min(4,d.count===0?0:d.count<5?1:d.count<10?2:d.count<20?3:4)} ${d.today?'today':''}" title="${esc(d.label)} • ${d.count} answers"></i>`).join('')}</div><div class="heat-legend"><span>Less</span>${[0,1,2,3,4].map(x=>`<i class="heat-${x}"></i>`).join('')}<span>More</span></div></div>
  <div class="section-head"><h2>Weekly missions</h2><small>${missions.weekly.filter(x=>x.done).length}/3 complete</small></div><div class="mission-list">${missions.weekly.map(m=>`<div class="card mission-row ${m.done?'mission-done':''}"><div class="mission-icon">${m.done?'✓':m.icon}</div><div><h4>${esc(m.title)}</h4><p>${esc(m.text)}</p><div class="progress tiny"><i style="width:${m.percent}%"></i></div></div><b>${m.value}/${m.target}</b></div>`).join('')}</div>
  <div class="section-head"><h2>Achievements</h2><small>${unlocked.length}/${ach.length} unlocked</small></div><div class="achievement-grid">${ach.map(a=>`<div class="card achievement ${a.unlocked?'unlocked':'locked'}"><div class="achievement-icon">${a.unlocked?a.icon:'🔒'}</div><div><h4>${esc(a.title)}</h4><p>${esc(a.text)}</p></div>${a.unlocked?'<span>Unlocked</span>':'<span>Locked</span>'}</div>`).join('')}</div>
  <div class="section-head"><h2>Last 7 days</h2><small>${week.activeDays} active days</small></div><div class="card week-card"><div class="week-strip">${weekSnapshot().map(d=>`<div class="week-day ${d.active?'active':''} ${d.today?'today':''}"><span>${d.label}</span><i>${d.active?'✓':'·'}</i></div>`).join('')}</div><div class="week-meta"><span><b>${week.attempts}</b> answers</span><span><b>${week.accuracy}%</b> accuracy</span><span><b>${state.examHistory.length}</b> exams</span></div></div>
  <div class="section-head"><h2>Needs attention</h2><small>Lowest mastery first</small></div>${weak.length?`<div class="lesson-list">${weak.map(w=>`<div class="card mastery-row"><div><span>${tracks[w.track].icon} ${tracks[w.track].name}</span><h4>${esc(w.title)}</h4><p>${w.attempts} attempts • ${w.accuracy}% accuracy</p></div><div class="mastery-number">${w.mastery}%</div></div>`).join('')}</div>`:'<div class="card empty"><h3>Your mastery map is waiting</h3><p>Practice a few questions and your weakest topics will appear here automatically.</p></div>'}
  ${isAdmin?`<div style="height:14px"></div><div class="card daily founder-card"><div><span class="eyebrow">Founder access</span><h3>Content & publishing tools</h3><p>This panel appears only for admin accounts.</p></div><div class="two-actions"><a class="cta secondary admin-link" href="admin.html">Content Admin</a><a class="cta secondary admin-link" href="cloud-admin.html">Cloud Publisher</a></div></div>`:''}`
}


async function refreshAccount({initial=false}={}){
  const backend=window.EHBackend;
  if(!backend?.enabled){state.account={...state.account,loading:false,user:null,profile:null,devices:[]};if(initial)render();return}
  state.account.loading=true;if(state.view==='profile')render();
  try{
    const content=await backend.loadContent();state.cloudQuestions=content.questions||[];state.cloudLessons=content.lessons||[];
    const sess=await backend.session();
    if(!sess?.user){state.account={...state.account,loading:false,user:null,profile:null,devices:[],error:''};if(initial||state.view==='profile')render();return}
    const reg=await backend.registerDevice();
    if(!reg?.allowed){await backend.signOut();clearProgress();state.account={loading:false,user:null,profile:null,devices:[],message:'',error:`Device limit reached. Remove an old device from another signed-in device before using this one.`,syncing:false};render();return}
    state.account.user=sess.user;
    const [profileData,devices,cloudProgress]=await Promise.all([backend.getProfile(),backend.listDevices(),backend.pullProgress()]);
    const marker=localStorage.getItem('eh_cloud_user_id');const localHas=state.xp>0||state.history.length>0||state.practiceDays.length>0;
    if(cloudProgress){applyProgress(cloudProgress);if(profileData?.current_track&&tracks[profileData.current_track])state.track=profileData.current_track;}
    else if(!marker&&localHas){await backend.pushProgress(progressPayload());}
    else if(marker&&marker!==sess.user.id){clearProgress();}
    localStorage.setItem('eh_cloud_user_id',sess.user.id);saveWithoutCloud();
    state.account={loading:false,user:sess.user,profile:profileData,devices,message:initial?'Cloud account connected.':'',error:'',syncing:false};
  }catch(e){state.account.loading=false;state.account.error=e.message||String(e)}
  chooseDefaultTopic();backfillAchievements();render();
}
function saveWithoutCloud(){
  localStorage.setItem('eh_xp',state.xp);localStorage.setItem('eh_track',state.track);localStorage.setItem('eh_history',JSON.stringify(state.history.slice(-5000)));localStorage.setItem('eh_mistakes',JSON.stringify(state.mistakes));localStorage.setItem('eh_practice_days',JSON.stringify(state.practiceDays.slice(-400)));localStorage.setItem('eh_exam_history',JSON.stringify(state.examHistory.slice(-100)));localStorage.setItem('eh_achievements',JSON.stringify([...new Set(state.achievements)]));
}
async function initBackend(){
  if(!window.EHBackend?.enabled){state.account.loading=false;render();return}
  await refreshAccount({initial:true});
  window.EHBackend.onAuthChange((_session,event)=>{if(event==='PASSWORD_RECOVERY'){passwordRecoveryMode=true;state.view='profile';}clearTimeout(window.__ehAuthTimer);window.__ehAuthTimer=setTimeout(()=>refreshAccount(),120)});
}
function render(){
  clearInterval(examTimer);const viewChanged=lastRenderedView!==state.view;let body;if(state.view==='home')body=home();else if(state.view==='learn')body=learn();else if(state.view==='rule')body=rule();else if(state.view==='practiceHub')body=practiceHub();else if(state.view==='quiz')body=quiz();else if(state.view==='result')body=result();else if(state.view==='examHub')body=examHub();else if(state.view==='exam')body=exam();else if(state.view==='examResult')body=examResult();else if(state.view==='questionBank')body=questionBank();else if(state.view==='omr')body=omr();else body=profile();
  const app=$('#app');app.innerHTML=`<main id="main-content" class="shell" tabindex="-1">${body}</main>${nav()}`;app.setAttribute('aria-busy','false');bind();
  const titles={home:'Home',learn:'Learn',rule:'Lesson',practiceHub:'Practice',quiz:'Practice question',result:'Practice result',examHub:'Exam',exam:'Timed exam',examResult:'Exam result',questionBank:'Question Bank',omr:'OMR',profile:'English Passport'};document.title=`${titles[state.view]||'English Haters'} — English Haters`;
  if(viewChanged){window.scrollTo({top:0,left:0,behavior:'auto'});lastRenderedView=state.view;}
  if(state.view==='exam')startExamTimer();
}
function chooseDefaultTopic(){const list=getTopics(state.track);if(list.length&&!list.some(x=>x.slug===state.topic))state.topic=list[0].slug}
function recordAnswer(q,ok){
  const before=unlockedAchievementIds(),oldLevel=levelInfo().level;
  const gain=ok?10:2;state.xp+=gain;state.sessionXp+=gain;if(ok)state.score++;
  const key=qKey(q);const existing=state.mistakes[key];
  if(!ok){state.mistakes[key]={key,wrongCount:Number(existing?.wrongCount||0)+1,lastWrong:Date.now(),recovery:0}}
  else if(existing){const recovery=Number(existing.recovery||0)+1;if(recovery>=2)delete state.mistakes[key];else state.mistakes[key]={...existing,recovery}}
  state.history.push({questionKey:key,id:q.id,track:q.track,topic:q.topic,difficulty:q.difficulty||'easy',selected:state.selected,correct:ok,mode:state.sessionMode,ts:Date.now()});
  updatePracticeDay();captureProgressUnlocks(before,oldLevel);save();announce(ok?'Correct answer':'Incorrect answer. Added to Mistake Book.');
}
function announce(message){const el=$('#global-status');if(!el)return;el.textContent='';requestAnimationFrame(()=>{el.textContent=String(message||'')})}
function handleLearningKeys(e){
  if((state.view==='quiz'||state.view==='exam')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    const tag=document.activeElement?.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
    const n=Number(e.key);if(n>=1&&n<=4){const btn=document.querySelector(state.view==='exam'?`[data-exam-choice="${n-1}"]`:`[data-choice="${n-1}"]`);if(btn&&!btn.disabled){e.preventDefault();btn.click();announce(`Choice ${String.fromCharCode(64+n)} selected`)}}
    if(e.key==='Enter'&&state.view==='quiz'){const btn=state.checked?$('#next'):$('#check');if(btn&&!btn.disabled){e.preventDefault();btn.click()}}
  }
}
function bind(){
  document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{state.view=b.dataset.v;if(state.view==='learn')chooseDefaultTopic();if(['home','learn','practiceHub','examHub','profile'].includes(state.view))localStorage.setItem('eh_last_hub',state.view);render()});
  document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{state.track=b.dataset.track;const list=getTopics(state.track);if(list.length)state.topic=list[0].slug;state.view='learn';save();render()});
  document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{state.topic=b.dataset.topic;state.view='rule';render()});
  document.querySelectorAll('[data-practice-track]').forEach(b=>b.onclick=()=>{state.track=b.dataset.practiceTrack;state.qbSecureLoaded=false;state.qbSecureRows=[];chooseDefaultTopic();save();render()});
  document.querySelectorAll('[data-start-topic]').forEach(b=>b.onclick=()=>startQuiz({mode:'topic',track:state.track,topic:b.dataset.startTopic,count:'all',label:`${topicTitle(state.track,b.dataset.startTopic)} Practice`}));
  const quick=$('#quick');if(quick)quick.onclick=()=>startQuiz({mode:'random',track:state.track,count:5,label:'Daily Random'});
  const quickHub=$('#quickHub');if(quickHub)quickHub.onclick=()=>startQuiz({mode:'random',track:state.track,count:5,label:'Quick Random'});
  const showCustom=$('#showCustom');if(showCustom)showCustom.onclick=()=>$('#customBuilder')?.classList.remove('hidden');
  const hideCustom=$('#hideCustom');if(hideCustom)hideCustom.onclick=()=>$('#customBuilder')?.classList.add('hidden');
  const custom=$('#customForm');if(custom)custom.onsubmit=e=>{e.preventDefault();const d=new FormData(custom);startQuiz({mode:'custom',track:state.track,topic:d.get('topic'),difficulty:d.get('difficulty'),count:d.get('count'),label:'Custom Practice'})};
  const pm=$('#practiceMistakes');if(pm)pm.onclick=()=>startQuiz({mode:'mistakes',track:state.track,count:'all',label:'Mistake Book'});
  document.querySelectorAll('[data-smart-start]').forEach(b=>b.onclick=()=>{const kind=b.dataset.smartStart,topic=b.dataset.smartTopic;if(kind==='mistakes')startQuiz({mode:'mistakes',track:state.track,count:'all',label:'Mistake Book'});else if(kind==='topic'&&topic){state.topic=topic;startQuiz({mode:'topic',track:state.track,topic,count:5,label:`${topicTitle(state.track,topic)} Practice`})}else startQuiz({mode:'random',track:state.track,count:5,label:'Quick Random'})});
  $('#resultMistakes')?.addEventListener('click',()=>startQuiz({mode:'mistakes',track:state.track,count:'all',label:'Mistake Book'}));
  const back=$('#backLearn');if(back)back.onclick=()=>{state.view='learn';render()};
  const pt=$('#practiceTopic');if(pt)pt.onclick=()=>startQuiz({mode:'topic',track:state.track,topic:state.topic,count:'all',label:`${topicTitle(state.track,state.topic)} Practice`});
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(!state.checked){state.selected=Number(b.dataset.choice);render()}});
  const check=$('#check');if(check)check.onclick=async()=>{const q=state.quiz[state.qIndex];if(!q||state.selected===null)return;if(q.cloudSecure&&state.secureSessionId){check.disabled=true;try{const r=await EHBackend.checkSecureAnswer(state.secureSessionId,q.id,state.selected);q.answer=Number(r.answer);q.explanation=r.explanation||'';state.checked=true;recordAnswer(q,Boolean(r.correct));render()}catch(err){state.secureError=err.message||String(err);render()}return}state.checked=true;recordAnswer(q,state.selected===Number(q.answer));render()};
  const next=$('#next');if(next)next.onclick=()=>{state.qIndex++;state.selected=null;state.checked=false;if(state.qIndex>=state.quiz.length)state.view='result';render()};
  const retry=$('#retrySession');if(retry)retry.onclick=()=>{state.view='practiceHub';render()};
  $('#examForm')?.addEventListener('submit',e=>{e.preventDefault();startExam(buildExamFromForm(e.currentTarget))});
  $('#printTutorPaper')?.addEventListener('click',()=>{const f=$('#examForm');if(f)tutorPaper(buildExamFromForm(f))});
  document.querySelectorAll('[data-exam-choice]').forEach(b=>b.onclick=()=>{state.examAnswers[state.qIndex]=Number(b.dataset.examChoice);render()});
  $('#examPrev')?.addEventListener('click',()=>{if(state.qIndex>0){state.qIndex--;render()}});
  $('#examNext')?.addEventListener('click',()=>{if(state.qIndex<state.quiz.length-1){state.qIndex++;render()}});
  document.querySelectorAll('[data-exam-jump]').forEach(b=>b.onclick=()=>{state.qIndex=Number(b.dataset.examJump);render()});
  $('#submitExam')?.addEventListener('click',()=>submitExam(false));
  $('#exitExam')?.addEventListener('click',()=>{if(confirm('Exit this exam? Current answers will be discarded.')){clearInterval(examTimer);state.view='examHub';render()}});
  $('#loadSecureQb')?.addEventListener('click',()=>loadSecureQuestionBank());
  $('#qbFilterForm')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.qbFilter={search:String(d.get('search')||'').trim(),topic:d.get('topic')||'all',difficulty:d.get('difficulty')||'all',source:d.get('source')||'all'};if(window.EHBackend?.enabled&&state.account.user)loadSecureQuestionBank();else render()});
  document.querySelectorAll('[data-qb-reveal]').forEach(b=>b.onclick=async()=>{const key=b.dataset.qbReveal;const q=(state.qbSecureRows||[]).find(x=>qKey(x)===key)||questions().find(x=>qKey(x)===key);if(q?.cloudSecure&&q.answer===undefined&&state.qbSecureSessionId){b.disabled=true;try{const r=await EHBackend.revealSecureAnswer(state.qbSecureSessionId,q.id);q.answer=Number(r.answer);q.explanation=r.explanation||'';render()}catch(err){state.secureError=err.message||String(err);render()}return}const id=`sol-${key.replace(/[^a-zA-Z0-9_-]/g,'-')}`;const el=document.getElementById(id);if(el){el.classList.toggle('hidden');b.textContent=el.classList.contains('hidden')?'Show answer & solution':'Hide solution'}});
  $('#omrForm')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.omrConfig={title:String(d.get('title')||'English Haters Practice Exam'),name:String(d.get('name')||''),roll:String(d.get('roll')||''),count:Number(d.get('count')||20)};render()});
  $('#printOmr')?.addEventListener('click',()=>printHtml(omrDocument(state.omrConfig)));
  $('#downloadOmrHtml')?.addEventListener('click',()=>downloadText('english-haters-omr.html',omrDocument(state.omrConfig)));
  $('#localProfileForm')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget),p=localProfile();saveLocalProfile({...p,name:String(d.get('name')||'English Hater').trim()});state.account.message='Profile saved on this browser.';state.account.error='';render()});
  $('#signInForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.account.error='';state.account.message='Signing in…';render();try{await EHBackend.signIn(String(d.get('email')||'').trim(),String(d.get('password')||''));await refreshAccount()}catch(err){state.account.message='';state.account.error=err.message;render()}});
  $('#signUpForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.account.error='';state.account.message='Creating account…';render();try{const data=await EHBackend.signUp(String(d.get('email')||'').trim(),String(d.get('password')||''),String(d.get('name')||'').trim());if(data.session){await refreshAccount()}else{state.account.message='Account created. Check your email to confirm it, then sign in.';render()}}catch(err){state.account.message='';state.account.error=err.message;render()}});
  $('#showReset')?.addEventListener('click',()=>$('#resetPasswordForm')?.classList.toggle('hidden'));
  $('#resetPasswordForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.account.error='';state.account.message='Sending recovery link…';render();try{await EHBackend.sendPasswordReset(String(d.get('email')||'').trim());state.account.message='Recovery email sent. Open the link on this device to choose a new password.';render()}catch(err){state.account.message='';state.account.error=err.message;render()}});
  $('#updatePasswordForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget),pw=String(d.get('password')||''),cf=String(d.get('confirm')||'');if(pw!==cf){state.account.error='Passwords do not match.';render();return}try{await EHBackend.updatePassword(pw);passwordRecoveryMode=false;history.replaceState({},'',location.pathname);state.account.message='Password updated successfully.';state.account.error='';await refreshAccount()}catch(err){state.account.error=err.message;render()}});
  $('#installApp')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;render()});
  $('#cloudProfileForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.currentTarget);state.account.error='';try{state.account.profile=await EHBackend.saveProfile({name:String(d.get('name')||'').trim(),current_track:state.track,xp:state.xp});state.account.message='Profile saved.';render()}catch(err){state.account.error=err.message;render()}});
  $('#avatarInput')?.addEventListener('change',async e=>{const file=e.target.files?.[0];state.account.error='';state.account.message='Processing photo…';render();try{const img=await compressAvatarFile(file);if(EHBackend?.enabled&&state.account.user){state.account.profile=await EHBackend.uploadAvatar(img.blob);state.account.message='Profile picture updated.';}else{const p=localProfile();saveLocalProfile({...p,avatar:img.dataUrl});state.account.message='Profile picture saved on this browser.';}render()}catch(err){state.account.message='';state.account.error=err.message;render()}});
  $('#removeAvatar')?.addEventListener('click',async()=>{try{if(EHBackend?.enabled&&state.account.user){await EHBackend.removeAvatar();state.account.profile=await EHBackend.getProfile()}else{const p=localProfile();saveLocalProfile({...p,avatar:''})}state.account.message='Profile picture removed.';state.account.error='';render()}catch(err){state.account.error=err.message;render()}});
  $('#syncNow')?.addEventListener('click',async()=>{try{state.account.syncing=true;render();await EHBackend.pushProgress(progressPayload());state.account.profile=await EHBackend.getProfile();state.account.syncing=false;state.account.message='Progress synced just now.';render()}catch(err){state.account.syncing=false;state.account.error=err.message;render()}});
  document.querySelectorAll('[data-remove-device]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this registered device from your account?'))return;try{await EHBackend.removeDevice(b.dataset.removeDevice);state.account.devices=await EHBackend.listDevices();state.account.message='Device removed.';render()}catch(err){state.account.error=err.message;render()}});
  $('#signOut')?.addEventListener('click',async()=>{try{await EHBackend.pushProgress(progressPayload());await EHBackend.signOut()}catch{}clearProgress();saveWithoutCloud();state.account={loading:false,user:null,profile:null,devices:[],message:'Signed out.',error:'',syncing:false};render()});
}

window.addEventListener('keydown',handleLearningKeys);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;if(state.view==='profile')render()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;if(state.view==='profile')render()});
window.addEventListener('online',()=>document.body.dataset.network='online');
window.addEventListener('offline',()=>document.body.dataset.network='offline');
document.body.dataset.network=navigator.onLine?'online':'offline';
if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
chooseDefaultTopic();
backfillAchievements();
render();
initBackend();
