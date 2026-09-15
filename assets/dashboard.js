import { supabase } from './supabase.js';

const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const firstName = s => s?.first_name || 'Student';
const initials = s => `${s?.first_name?.[0]||''}${s?.last_name?.[0]||''}`.toUpperCase() || 'ST';
const set = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
const setHtml = (id, value) => { const el=document.getElementById(id); if(el) el.innerHTML=value; };
const setProgress = (id, value) => { const el=document.getElementById(id); if(el) requestAnimationFrame(()=>{el.style.width=`${Math.max(0,Math.min(100,Number(value)||0))}%`;}); };
const finishLoader = () => window.dispatchEvent(new CustomEvent('dashboard-ready'));

function animateValue(id,end,{suffix='',prefix='',duration=700,decimals=0}={}){
 const el=document.getElementById(id); if(!el)return;
 const target=Number(end)||0; const t0=performance.now();
 const frame=now=>{const p=Math.min((now-t0)/duration,1),e=1-Math.pow(1-p,3),v=target*e;el.textContent=prefix+(decimals?v.toFixed(decimals):Math.round(v).toLocaleString('en-NG'))+suffix;if(p<1)requestAnimationFrame(frame)};
 requestAnimationFrame(frame);
}

function storagePathFromPhoto(value){
 if(!value)return null;
 const raw=String(value).trim();
 if(!/^https?:\/\//i.test(raw))return raw;
 try{
  const u=new URL(raw);
  const marker='/student-passports/';
  const at=u.pathname.indexOf(marker);
  if(at>=0)return decodeURIComponent(u.pathname.slice(at+marker.length));
 }catch{}
 return null;
}

async function getStudentPhotoUrl(photoValue){
 if(!photoValue)return null;
 const raw=String(photoValue).trim();
 const path=storagePathFromPhoto(raw);
 if(!path)return raw;
 try{
  const {data,error}=await supabase.storage.from('student-passports').createSignedUrl(path,60*60*6);
  if(!error&&data?.signedUrl)return data.signedUrl;
 }catch(error){console.warn('Student passport signing failed',error)}
 return null;
}

function putStudentAvatar(studentPhoto, student){
 const avatar=document.getElementById('avatar');
 const hero=document.getElementById('heroAvatar');
 const fallback=initials(student);
 const apply=(el,url)=>{if(!el)return;if(url){el.innerHTML=`<img src="${esc(url)}" alt="Student passport photograph" loading="eager" decoding="async">`;const img=el.querySelector('img');img.addEventListener('error',()=>{el.textContent=fallback},{once:true})}else el.textContent=fallback};
 apply(avatar,studentPhoto);apply(hero,studentPhoto);
}

async function loadDashboard(){
  const loading=document.getElementById('dashboardLoading');
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){ location.href='student-login.html'; return; }
    const uid=session.user.id;
    const [{data:student,error:studentError},{data:school},{data:sessions},{data:terms}]=await Promise.all([
      supabase.from('students').select('id,student_id,first_name,middle_name,last_name,photo_url,school_email,status').eq('user_id',uid).maybeSingle(),
      supabase.from('school_settings').select('school_name,motto,logo_url,address,phone,email,website').limit(1).maybeSingle(),
      supabase.from('academic_sessions').select('id,name').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('terms').select('id,name,session_id').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle()
    ]);
    if(studentError || !student) throw new Error('Your student profile has not been created yet. Please contact the school administrator.');
    const sessionRow=sessions?.[0]||sessions; const termRow=terms?.[0]||terms;
    const {data:enrollment}=await supabase.from('enrollments').select('id,class_id,status,classes(name)').eq('student_id',student.id).eq('session_id',sessionRow?.id||'').eq('status','ACTIVE').order('created_at',{ascending:false}).limit(1).maybeSingle();
    const className=enrollment?.classes?.name || 'Class not assigned';
    const [{data:results},{data:attendance},{data:announcements},{data:fees},{data:payments}]=await Promise.all([
      enrollment&&termRow?.id ? supabase.from('results').select('subject_id,ca_score,exam_score,total,grade,grade_point,teacher_remark,subjects(name)').eq('enrollment_id',enrollment.id).eq('term_id',termRow.id).eq('status','PUBLISHED').order('total',{ascending:false}) : Promise.resolve({data:[]}),
      enrollment ? supabase.from('attendance').select('status').eq('enrollment_id',enrollment.id) : Promise.resolve({data:[]}),
      supabase.from('announcements').select('id,title,body,published_at,created_at').eq('published',true).order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(12),
      supabase.from('fees').select('id,title,amount,due_date').eq('student_id',student.id).eq('session_id',sessionRow?.id||''),
      supabase.from('payments').select('amount,status').eq('student_id',student.id).eq('status','PAID')
    ]);
    const resultRows=results||[]; const att=attendance||[];
    const present=att.filter(x=>x.status==='PRESENT').length, late=att.filter(x=>x.status==='LATE').length, absent=att.filter(x=>x.status==='ABSENT').length, totalAtt=att.length;
    const attendancePct=totalAtt?Math.round(((present+late*.5)/totalAtt)*100):0;
    const average=resultRows.length?Math.round(resultRows.reduce((a,r)=>a+Number(r.total||0),0)/resultRows.length):0;
    const totalFees=(fees||[]).reduce((a,f)=>a+Number(f.amount||0),0); const paid=(payments||[]).reduce((a,p)=>a+Number(p.amount||0),0); const balance=Math.max(totalFees-paid,0);
    set('greeting',`Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, ${firstName(student)}`);
    set('welcomeName',`${student.first_name||''} ${student.last_name||''}`.trim()); set('studentId',student.student_id||'—'); set('className',className); set('sessionName',sessionRow?.name||'—'); set('termName',termRow?.name?.replaceAll('_',' ')||'—'); set('studentStatus',student.status||'ACTIVE');
    set('balanceLabel',balance?'Outstanding balance':'No outstanding balance');
    if(school){set('schoolName',school.school_name||'Laff British Montessori School');set('schoolMotto',school.motto||'Learning · Character · Excellence')}
    const photoUrl=await getStudentPhotoUrl(student.photo_url);
    putStudentAvatar(photoUrl,student);
    setHtml('resultList', resultRows.slice(0,4).map(r=>`<div class="dash-row"><div><b>${esc(r.subjects?.name||'Subject')}</b><span class="muted">CA ${Number(r.ca_score||0)} · Exam ${Number(r.exam_score||0)} · Total ${Number(r.total||0)}</span></div><span class="grade-badge">${esc(r.grade||'—')}</span></div>`).join('') || '<div class="empty">No published results are available for this term yet.</div>');
    setHtml('noticeList',(announcements||[]).slice(0,4).map(a=>`<article class="notice-item"><span class="notice-icon">◆</span><div><b>${esc(a.title)}</b><p>${esc((a.body||'').slice(0,115))}${(a.body||'').length>115?'…':''}</p><small>${a.published_at?new Date(a.published_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):''}</small></div></article>`).join('') || '<div class="empty">No new announcements.</div>');
    window.__studentNotifications=announcements||[];
    window.dispatchEvent(new CustomEvent('student-notifications-ready',{detail:window.__studentNotifications}));
    setHtml('attendanceBreakdown',`<div><b>${present}</b><span>Present</span></div><div><b>${absent}</b><span>Absent</span></div><div><b>${late}</b><span>Late</span></div>`);
    animateValue('subjectsCount',resultRows.length,{duration:650}); animateValue('attendancePct',attendancePct,{suffix:'%',duration:800}); animateValue('averagePct',average,{suffix:'%',duration:850}); animateValue('balance',balance,{prefix:'₦',duration:900,decimals:2});
    set('pulseAttendance',`${attendancePct}%`); set('pulseAverage',`${average}%`); set('pulseSubjects',`${resultRows.length} subject${resultRows.length===1?'':'s'}`);
    setProgress('attendanceProgress',attendancePct); setProgress('averageProgress',average); setProgress('subjectsProgress',Math.min(resultRows.length*10,100));
    if(loading) loading.remove(); finishLoader();
  }catch(err){
    console.error(err); if(loading){loading.className='dashboard-error';loading.innerHTML=`<strong>Dashboard could not load</strong><p>${esc(err.message)}</p><a class="button" href="student-login.html">Return to Login</a>`} finishLoader();
  }
}
loadDashboard();
