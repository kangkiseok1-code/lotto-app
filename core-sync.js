/* core-sync.js — 공용 출생정보(core_profiles)와 이 앱 프로필을 자동으로 맞춘다. 동의한 사람만(공용 정보가 있을 때만 호출).
 * index.html의 전역(sb, user, profile, coreRow, coreToLotto, isMinorBirth, dbSaveProfile, toast)을 그대로 쓴다. */
// 이 앱에서 고친 값을 공용 정보에도 바로 반영(동의한 사람만, 윤달 출생은 이 앱이 구분하지 못해 건드리지 않음)
async function pushCoreQuiet(p){
  if(!user||!sb||!coreRow||coreRow.leap) return;
  const unk=p.birth_hour==null;
  const row={ user_id:user.id, gender:p.gender==='M'?'male':(p.gender==='F'?'female':coreRow.gender), calendar:p.calendar==='lunar'?'lunar':'solar', leap:false,
    birth_y:p.birth_year, birth_mo:p.birth_month, birth_d:p.birth_day, birth_h:unk?null:p.birth_hour, birth_min:unk?null:(p.birth_minute||0), time_unknown:unk, birth_city:p.city||null };
  try{ const r=await sb.from('core_profiles').upsert(row,{onConflict:'user_id'}).select().maybeSingle(); if(!r.error) coreRow=r.data||Object.assign({},coreRow,row); }catch(e){}
}
// 공용 정보가 기준 — 이 앱 프로필이 다르면 조용히 맞춘다(만 19세 미만 값은 건너뜀)
async function coreQuietSync(){
  const a=coreToLotto(coreRow);
  if(isMinorBirth(a.birth_year,a.birth_month,a.birth_day,a.calendar)) return;
  const p=Object.assign({}, profile, a, { gender:a.gender||profile.gender||null, city:a.city||profile.city||null });
  try{ await dbSaveProfile(p); profile=p; toast('자림에 저장된 정보로 맞췄어요'); }catch(e){}
}
