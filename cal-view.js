/* cal-view.js — 운세 체크인 달력: 달력 화면 · 일 페이지 · 하루 기록.
 * index.html의 전역(calView, monthData, dayScore, ensureMonths, purchases, luckyDays, dreams, favorSet …)을 그대로 쓴다.
 * 순수 계산(1~10 늘리기, 기록 저장 줄 만들기)은 balbok.js. 이 파일은 화면과 저장만 맡는다. */

/* ---- 하루 기록 저장소: 로그인하면 daily_checkins(옛 체크인과 같은 표), 아니면 이 기기(localStorage) ---- */
let daylog={};      // {'YYYY-MM-DD': {score, tags[], memo, legacy}}
let dlEdit=null;    // 입력 중인 기록 {key, score, tags, memo}
let dlCtx='cal';    // 저장 뒤 돌아갈 화면: 'cal' | 'day'
const todayKey=()=>{ const t=new Date(); return dkey(t.getFullYear(),t.getMonth()+1,t.getDate()); };
async function dbLoadDaylog(){
  if(DEMO){ try{ return JSON.parse(localStorage.getItem(LS+'daylog')||'{}'); }catch(e){ return {}; } }
  const {data}=await sb.from('daily_checkins').select('day,mood,score,memo,tag').eq('user_id',user.id);
  const o={}; (data||[]).forEach(r=>{ const x=Balbok.fromRow(r); if(x) o[String(r.day).slice(0,10)]=x; }); return o;
}
async function dbSaveDaylog(key,rec){
  const r=Balbok.cleanRec(rec); if(!r) return false;
  if(DEMO){ daylog[key]=Object.assign({},r,{legacy:false}); saveLuck(key); localStorage.setItem(LS+'daylog',JSON.stringify(daylog)); return true; }
  const {error}=await sb.from('daily_checkins').upsert(Balbok.toRow(user.id,key,r),{onConflict:'user_id,day'});
  if(error) throw error;
  daylog[key]=Object.assign({},r,{legacy:false});
  saveLuck(key); return true;
}
/* 기록한 날의 발복점수를 따로 남긴다(분석의 "예측 vs 내 기록" 비교용). luck 칸이 아직 없거나 실패해도 기록 저장에는 영향 없음 */
function luckOf(key){ const p=key.split("-").map(Number), rng=yearRange(p[0]); return rng&&monthCached(p[0],p[1])?Balbok.scale(dayScore(p[0],p[1],p[2]).score,rng):null; }
function saveLuck(key){
  const luck=luckOf(key); if(!luck) return;
  daylog[key].luck=luck;
  if(!DEMO) sb.from("daily_checkins").update({luck}).eq("user_id",user.id).eq("day",key).then(()=>{},()=>{});
}
async function dbDeleteDaylog(key){
  if(DEMO){ delete daylog[key]; localStorage.setItem(LS+'daylog',JSON.stringify(daylog)); return; }
  const {error}=await sb.from('daily_checkins').delete().eq('user_id',user.id).eq('day',key);
  if(error) throw error;
  delete daylog[key];
}

/* ---- 발복점수: 그 사람의 그해 최저~최고를 1~10으로 ---- */
const _yrStat={};
const yearCached=y=>{ for(let mo=1;mo<=12;mo++) if(!monthCached(y,mo)) return false; return true; };
function ensureYear(y){ const miss=[]; for(let mo=1;mo<=12;mo++) if(!monthCached(y,mo)) miss.push([y,mo]); return ensureMonths(miss); }
function yearRange(y){   // 그해 12달이 다 있어야 계산한다. 없으면 빠진 달을 renderTab에 알리고 null(이론 범위로 임시 표시)
  if(_yrStat[y]) return _yrStat[y];
  let miss=false;
  for(let mo=1;mo<=12;mo++) if(!monthCached(y,mo)){ miss=true; dayScore(y,mo,1); }
  if(miss) return null;
  const vals=[]; for(let mo=1;mo<=12;mo++){ const dim=new Date(y,mo,0).getDate(); for(let d=1;d<=dim;d++) vals.push(dayScore(y,mo,d).score); }
  return _yrStat[y]=Balbok.range(vals);
}

/* ---- 하루 기록 입력칸 (달력 아래 · 일 페이지 공용) ---- */
function recFormHtml(key,ctx){
  const ex=daylog[key], can=Balbok.canRecord(todayKey(),key);
  if(!can){
    if(ex) return `<div class="prof-sub">내 하루</div><p style="margin:0">${ex.score}점${ex.tags.length?' · '+ex.tags.map(esc).join(' · '):''}${ex.memo?'<br><span class="muted">'+esc(ex.memo)+'</span>':''}${ex.legacy?'<br><span class="muted" style="font-size:11.5px">옛 체크인 기분을 점수로 어림한 값이에요.</span>':''}</p>`;
    return key>todayKey()?'':'<p class="muted" style="font-size:12.5px;margin:0">7일이 지난 날은 기록을 남길 수 없어요.</p>';
  }
  dlCtx=ctx;
  if(!dlEdit||dlEdit.key!==key) dlEdit={key,score:ex?ex.score:6,tags:ex?[...ex.tags]:[],memo:ex?ex.memo:''};
  return `<div class="row" style="align-items:center"><span class="prof-sub" style="flex:1;margin:0">${key===todayKey()?'오늘 하루는 어땠나요?':'이 날은 어땠나요?'}</span><span class="chip" id="dlScoreTxt" style="margin:0">${dlEdit.score}점</span></div>
    <input type="range" id="dlScore" min="1" max="10" step="1" value="${dlEdit.score}" aria-label="내 하루 점수" oninput="dlSet('score',+this.value)" style="margin:10px 0 2px">
    <div class="row" style="justify-content:space-between;font-size:11px;color:var(--sub)"><span>1 힘들었어요</span><span>10 아주 좋았어요</span></div>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px">${Balbok.TAGS.map(t=>`<button type="button" class="tgl ${dlEdit.tags.includes(t)?'on':''}" onclick="dlTag('${t}',this)">${t}</button>`).join('')}</div>
    <input id="dlMemo" maxlength="${Balbok.MEMO_MAX}" placeholder="한 줄 메모 (${Balbok.MEMO_MAX}자)" value="${esc(dlEdit.memo)}" oninput="dlSet('memo',this.value)" style="margin-top:10px">
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn soft wide" style="flex:1" onclick="dlSave()">${ex&&!ex.legacy?'수정':'입력'}</button>${ex?`<button class="btn ghost" onclick="dlRemove()">지우기</button>`:''}</div>`;
}
function dlSet(k,v){ dlEdit[k]=v; if(k==='score'){ const t=$('#dlScoreTxt'); if(t) t.textContent=v+'점'; } }
function dlTag(t,el){ const i=dlEdit.tags.indexOf(t); if(i>=0) dlEdit.tags.splice(i,1); else dlEdit.tags.push(t); el.classList.toggle('on',i<0); }
function dlBack(k){ dlEdit=null; const p=k.split('-').map(Number); if(dlCtx==='day') dayDetail(p[0],p[1],p[2]); else renderTab(); }
async function dlSave(){
  const k=dlEdit.key, prev=daylog[k];
  try{ if(!(await dbSaveDaylog(k,dlEdit))){ toast('점수를 골라 주세요'); return; } toast('기록했어요'); }
  catch(e){ if(prev) daylog[k]=prev; else delete daylog[k]; toast('저장하지 못했어요. 잠시 뒤 다시 눌러 주세요'); return; }
  dlBack(k);
}
async function dlRemove(){
  const k=dlEdit.key;
  try{ await dbDeleteDaylog(k); toast('기록을 지웠어요'); }catch(e){ toast('지우지 못했어요. 잠시 뒤 다시 눌러 주세요'); return; }
  dlBack(k);
}

/* ---- 달력 ---- */
function viewCalendar(){
  editDream=null;
  const {y,m}=calView, rng=yearRange(y);
  const first=new Date(y,m-1,1).getDay();
  const {days,scores,isMoney,monthMoney,monthMoneyAxes,jaeFav,isCaution}=monthData(y,m);
  const buyByDay={};
  purchases.forEach(p=>{const k=dkeyOf(p.purchased_at); if(!buyByDay[k])buyByDay[k]={won:false}; if(p.won)buyByDay[k].won=true;});
  let best=1; scores.forEach((s,i)=>{ if(s.score>scores[best-1].score) best=i+1; });   // 이달 최고일(같으면 앞선 날)
  const tk=todayKey();
  let cells='';
  for(let i=0;i<first;i++)cells+=`<div class="cal-cell empty"></div>`;
  for(let d=1;d<=days;d++){
    const s=scores[d-1], sc=Balbok.scale(s.score,rng), dk=dkey(y,m,d);
    const money=isMoney(s), caution=isCaution(s), buy=buyByDay[dk];
    const marks=(buy?(buy.won?'🎉':'🎫'):'')+(luckyDays.has(dk)?'✨':'')+(dreams[dk]?'💭':'');
    cells+=`<div class="cal-cell${dk===tk?' today':''}${money?' money':caution?' caution':''}${d===best?' best':''}" style="background:rgba(154,118,28,${(0.04+(sc-1)/9*0.30).toFixed(2)})" onclick="dayDetail(${y},${m},${d})">
      ${daylog[dk]?'<i class="rd"></i>':''}<div class="d">${d}</div><div class="sc">${sc}</div><div class="marks">${marks}</div></div>`;
  }
  return `<div class="section on card">
    <div class="cal-head">
      <button class="btn ghost sm" onclick="calMove(-1)">‹</button>
      <h2>${y}. ${m}</h2>
      <button class="btn ghost sm" onclick="calMove(1)">›</button>
    </div>
    ${monthMoney?`<p style="text-align:center;margin:0 0 8px"><span class="pill">錢 ${jaeFav?'이 달 재물 기운 좋음':'이 달 재물 감당 기운'} · ${monthMoneyAxes.join('·')}에 ${jaeFav?'재성':'인성·비겁'} 용희신</span></p>`:''}
    <div class="cal-grid">${['일','월','화','수','목','금'].map(w=>`<div class="cal-dow">${w}</div>`).join('')}<div class="cal-dow sat">토<small>추첨</small></div>${cells}</div>
    <details class="tip"><summary>ⓘ 표시 보는 법</summary><p><b>칸 색</b>이 진할수록 발복점수가 높아요(1 낮음 → 10 높음). <span style="color:var(--gold)">●</span> 금색 점 = 錢 목돈일, <span style="color:var(--hwa)">●</span> 빨간 점 = 주의일, <span class="gframe"></span>이달 최고일, <span style="color:var(--accent-ink)">●</span> 왼쪽 점 = 내 기록. 발복점수는 내 한 해 안에서 정해요. 내 가장 좋은 날이 10, 가장 약한 날이 1이에요. 다른 사람과 점수를 견주는 용도는 아니에요. 토 표시가 있는 열은 로또 추첨일이고, 금색 점이 있는 토요일이 좋은 추첨일, 빨간 점이 있는 토요일은 조심할 추첨일이에요. 칸 아래 작은 그림은 🎫구매 · 🎉당첨 · ✨운 좋았던 날 · 💭꿈 기록이에요. 날짜를 누르면 자세한 기운을 볼 수 있어요.</p></details>
  </div>
  <div class="cal-sticky" id="cal-sticky"><button type="button" class="btn" onclick="calGoRec()">오늘 기록하기</button></div>
  <div class="section on card" id="cal-rec">${recFormHtml(tk,'cal')}</div>
  <p class="disclaimer">참고용이며 당첨을 보장하지 않습니다.</p>`;
}

/* 달력 아래 '오늘 기록하기' — 기록 카드가 화면에 보이면 숨기고, 누르면 그 카드로 이동 */
function calGoRec(){ const e=document.getElementById('cal-rec'); if(e) e.scrollIntoView({behavior:'smooth',block:'center'}); }
function calStickyWatch(){ const s=document.getElementById('cal-sticky'), r=document.getElementById('cal-rec'); if(!s||!r||!window.IntersectionObserver) return; new IntersectionObserver(es=>s.classList.toggle('off',es[0].isIntersecting),{threshold:.3}).observe(r); }

/* ---- 일 페이지 ---- */
function dayDetail(y,m,d){
  if(!yearCached(y)){ ensureYear(y).then(()=>dayDetail(y,m,d)).catch(()=>toast('운 점수를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요')); return; }
  const md=monthData(y,m); const s=md.scores[d-1]; const money=md.isMoney(s);
  const sc=Balbok.scale(s.score,yearRange(y));
  const dk=dkey(y,m,d), lucky=luckyDays.has(dk);
  const dayBuys=purchases.filter(p=>dkeyOf(p.purchased_at)===dk);
  const dayWon=dayBuys.filter(p=>p.won);
  if(!editDream||editDream.day!==dk){ const ex=dreams[dk]; editDream={day:dk,note:ex?(ex.note||''):'',tags:ex?[...(ex.tags||[])]:[]}; }
  const hits=[...new Set(GILMONG.filter(k=>(editDream.note+' '+editDream.tags.join(' ')).includes(k)))];
  const sijinNames=['자(23~01)','축(01~03)','인(03~05)','묘(05~07)','진(07~09)','사(09~11)','오(11~13)','미(13~15)','신(15~17)','유(17~19)','술(19~21)','해(21~23)'];
  const JI_ELEM=S.JI_ELEM;
  const sijin=sijinNames.map((nm,idx)=>{const el=JI_ELEM[idx];const good=favorSet.has(el);return `<div class="s${good?' good':''}">${nm}<br><span style="opacity:.7">${el}</span></div>`;}).join('');
  const bestSijin=sijinNames.map((nm,idx)=>({nm,good:favorSet.has(JI_ELEM[idx])})).filter(x=>x.good).map(x=>x.nm.split('(')[0]);
  // 방위 오행: 동=목·남=화·서=금·북=수·중앙=토 → 용희신 방향을 유리하게 표시
  const DIRW=[{d:'북',e:'수'},{d:'서',e:'금'},{d:'중앙',e:'토'},{d:'동',e:'목'},{d:'남',e:'화'}];
  const favDirs=DIRW.filter(x=>favorSet.has(x.e)).map(x=>x.d);
  const dcell=(dir)=>{ const it=DIRW.find(x=>x.d===dir), good=favorSet.has(it.e);
    return `<div style="text-align:center;padding:9px 0;border-radius:8px;border:1px solid ${good?'var(--gold)':'var(--line)'};background:${good?'var(--gold-soft)':'var(--card)'}"><div style="font-size:12.5px;font-weight:${good?'800':'600'};color:${good?'var(--gold)':'var(--ink)'}">${dir}${good?' ★':''}</div><div class="muted" style="font-size:10.5px">${it.e}</div></div>`; };
  const sp='<span></span>';
  const compass=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:220px;margin:10px auto 0">${sp}${dcell('북')}${sp}${dcell('서')}${dcell('중앙')}${dcell('동')}${sp}${dcell('남')}${sp}</div>`;
  const html=`<div class="section on">
    <button class="btn ghost sm" onclick="dlEdit=null;renderTab()">‹ 달력으로</button>
    <div class="card" style="margin-top:12px">
      <h2 style="margin:0 0 2px">${y}. ${m}. ${d}</h2>
      <p class="muted" style="margin:0 0 8px;font-size:13px">일진 <b>${s.day.hangul}</b> · 월운 <b>${s.month.hangul}</b></p>
      <div class="row" style="gap:14px">
        <div><div class="muted" style="font-size:11px">발복점수</div><div style="font-size:30px;font-weight:800;color:var(--gold);line-height:1.1">${sc}<span class="muted" style="font-size:14px;font-weight:500"> / 10</span></div></div>
        <div>${money?'<span class="pill">錢 목돈 후보일</span>':md.isCaution(s)?'<span class="pill" style="color:var(--hwa)">⚠ 주의일</span>':'<span class="muted" style="font-size:12px">일반일</span>'}</div>
      </div>
      <div class="scale10" aria-hidden="true">${Array.from({length:10},(_,i)=>`<i${i<sc?' class="on"':''}></i>`).join('')}</div>
      ${money?`<p class="muted" style="font-size:11.5px;margin:6px 0 0">이 날은 <b>일운(그날 기운)</b>에 ${md.jaeFav?'재성이 용희신으로 들어와요':'인성·비겁(신 돕는 용희신)이 들어와 많은 재를 감당해요'}.</p>`:(md.monthMoney?`<p class="muted" style="font-size:11.5px;margin:6px 0 0">이 달은 <b>${md.monthMoneyAxes.join('·')}</b> ${md.jaeFav?'재물 기운':'재 감당 기운'}이 좋아요(달 전체 공통).</p>`:'')}
      ${s.rootClash?`<p style="color:var(--hwa);font-size:12px;margin:8px 0 0">⚠ 뿌리충(${esc(s.rootClash.detail)}) — 변동/지출 주의 날</p>`:''}
      ${dayBuys.length?`<p style="font-size:12.5px;margin:10px 0 0">🎫 이 날 구매 <b>${dayBuys.length}건</b>${dayWon.length?` · <b style="color:var(--gold)">🎉 당첨 ${dayWon.length}건</b>`:''}</p>`:''}
    </div>
    <div class="card">
      <h3 style="margin:0 0 10px;font-size:16px">이 날의 기록</h3>
      ${recFormHtml(dk,'day')}
      <div class="row" style="margin-top:14px"><span class="prof-sub" style="flex:1;margin:0">행운 · 꿈</span>
        <button class="btn ${lucky?'':'ghost'} sm" onclick="toggleLuckyDay(${y},${m},${d})">${lucky?'✨ 운 좋았던 날':'운 좋았던 날 체크'}</button></div>
      <label class="f" style="margin-top:12px">💭 꿈 기록</label>
      <textarea id="dreamNote" placeholder="꿈 내용 (예: 돼지가 품에 안겼다)" oninput="editDream.note=this.value">${esc(editDream.note)}</textarea>
      <label class="f" style="margin-top:10px">태그 (동물·사물·인물·종류)</label>
      <div>${editDream.tags.map((t,i)=>`<span class="chip">${esc(t)}<button onclick="removeDreamTag(${i},${y},${m},${d})">×</button></span>`).join('')||'<span class="muted" style="font-size:12px">태그 없음</span>'}</div>
      <div class="row" style="margin-top:6px"><input id="dreamTag" placeholder="예: 돼지, 물, 조상" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();addDreamTag(${y},${m},${d})}"><button class="btn sm" onclick="addDreamTag(${y},${m},${d})">추가</button></div>
      ${hits.length?`<p style="font-size:12.5px;color:var(--gold);margin:10px 0 0">✨ 길몽 기운: <b>${hits.join(' · ')}</b> — 전통 해몽상 재물·행운 상징이에요(참고용).</p>`:''}
      <div class="row" style="margin-top:12px">
        <button class="btn sm" onclick="saveDreamEntry(${y},${m},${d})">꿈 저장</button>
        ${dreams[dk]?`<button class="btn ghost sm" onclick="removeDreamEntry(${y},${m},${d})">꿈 삭제</button>`:''}
      </div>
    </div>
    <div class="card">
      <h3 style="margin:0 0 2px;font-size:16px">최적 시간 · 추천 시간대</h3>
      <p class="muted" style="font-size:12px;margin:0">용희신(${[...favorSet].join('·')}) 기운의 시진이 재물 기운에 유리합니다${bestSijin.length?` → <b style="color:var(--mok)">${bestSijin.join(', ')}시</b>`:''}</p>
      <div class="sijin">${sijin}</div>
      <h3 style="margin:16px 0 2px;font-size:16px">유리한 방향</h3>
      <p class="muted" style="font-size:12px;margin:0">용희신 ${[...favorSet].join('·')} 기운의 방위가 재물 기운에 유리합니다${favDirs.length?` → <b style="color:var(--gold)">${favDirs.join('·')}쪽</b>`:''}</p>
      ${compass}
    </div>
    <button class="btn ghost wide" onclick="go('rec')">로또 번호 보기</button>
  </div>`;
  $('#body').innerHTML=html;
}

/* ---- 로또 페이지 윗줄: 지난 회차 당첨 번호 (‹ ›로 넘겨 보기) ---- */
let drawShown=null;   // 보고 있는 회차 번호 (없으면 최신)
function drawCardHtml(){
  if(!latestDraw) return '';
  const no=drawShown||latestDraw.draw_no, dr=draws[no]||(no===latestDraw.draw_no?latestDraw:null);
  const ball=n=>`<div class="ball" style="width:34px;height:34px;font-size:13px;${EL_FACE(hadoElem(n))}">${n}<span class="sub">${hadoElem(n)}</span></div>`;
  return `<div class="section on card">
    <div class="row" style="align-items:center;justify-content:space-between"><button class="btn ghost sm" aria-label="이전 회차" onclick="drawMove(-1)">‹</button>
      <b style="font-size:14px">${no}회 당첨 번호${dr&&dr.date?` <span class="muted" style="font-weight:400;font-size:12px">· ${esc(String(dr.date).slice(0,10))}</span>`:''}</b>
      <button class="btn ghost sm" aria-label="다음 회차" onclick="drawMove(1)" ${no>=latestDraw.draw_no?'disabled':''}>›</button></div>
    ${dr?`<div class="balls" style="margin-top:10px;gap:6px">${dr.numbers.map(ball).join('')}<span class="muted" style="align-self:center">+</span>${ball(dr.bonus_no)}</div>`:'<p class="muted" style="font-size:12px;margin:10px 0 0">이 회차 번호를 불러오지 못했어요.</p>'}
  </div>`;
}
async function drawMove(delta){
  const cur=drawShown||latestDraw.draw_no, nx=cur+delta;
  if(nx<1||nx>latestDraw.draw_no) return;
  if(!(await getDraw(nx))){ toast('이 회차 번호를 불러오지 못했어요'); return; }
  drawShown=nx; renderTab();
}
