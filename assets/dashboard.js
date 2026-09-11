import { supabase } from './supabase.js';

const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = n => `₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const firstName = s => s?.first_name || 'Student';
const initials = s => `${s?.first_name?.[0]||''}${s?.last_name?.[0]||''}`.toUpperCase() || 'ST';
const set = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
const setHtml = (id, value) => { const el=document.getElementById(id); if(el) el.innerHTML=value; };

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
      supabase.from('announcements').select('id,title,body,published_at,created_at').eq('published',true).order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(5),
      supabase.from('fees').select('id,title,amount,due_date').eq('student_id',student.id).eq('session_id',sessionRow?.id||''),
      supabase.from('payments').select('amount,status').eq('student_id',student.id).eq('status','PAID')
    ]);

    const resultRows=results||[]; const att=attendance||[];
    const present=att.filter(x=>x.status==='PRESENT').length, late=att.filter(x=>x.status==='LATE').length, totalAtt=att.length;
    const attendancePct=totalAtt?Math.round(((present+late*.5)/totalAtt)*100):0;
    const average=resultRows.length?Math.round(resultRows.reduce((a,r)=>a+Number(r.total||0),0)/resultRows.length):0;
    const totalFees=(fees||[]).reduce((a,f)=>a+Number(f.amount||0),0);
    const paid=(payments||[]).reduce((a,p)=>a+Number(p.amount||0),0);
    const balance=Math.max(totalFees-paid,0);

    set('greeting',`Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, ${esc(firstName(student))}`);
    set('welcomeName',`${esc(student.first_name||'')} ${esc(student.last_name||'')}`.trim());
    set('studentId',student.student_id||'—'); set('className',className); set('sessionName',sessionRow?.name||'—'); set('termName',termRow?.name?.replace('_',' ')||'—'); set('studentStatus',student.status||'ACTIVE');
    set('subjectsCount',String(resultRows.length||'—')); set('attendancePct',totalAtt?`${attendancePct}%`:'—'); set('averagePct',resultRows.length?`${average}%`:'—'); set('balance',money(balance)); set('balanceLabel',balance?'Outstanding balance':'No outstanding balance'); set('unreadCount',String((announcements||[]).length));
    const avatar=document.getElementById('avatar'); if(avatar){if(student.photo_url){avatar.innerHTML=`<img src="${esc(student.photo_url)}" alt="Student photo">`}else avatar.textContent=initials(student)}
    if(school){set('schoolName',school.school_name||'Laff British Montessori School');set('schoolMotto',school.motto||'Learning · Character · Excellence')}

    setHtml('resultList', resultRows.slice(0,4).map(r=>`<div class="dash-row"><div><b>${esc(r.subjects?.name||'Subject')}</b><span class="muted">CA ${Number(r.ca_score||0)} · Exam ${Number(r.exam_score||0)} · Total ${Number(r.total||0)}</span></div><span class="grade-badge">${esc(r.grade||'—')}</span></div>`).join('') || '<div class="empty">No published results are available for this term yet.</div>');
    setHtml('noticeList',(announcements||[]).slice(0,4).map(a=>`<article class="notice-item"><span class="notice-icon">◆</span><div><b>${esc(a.title)}</b><p>${esc((a.body||'').slice(0,115))}${(a.body||'').length>115?'…':''}</p><small>${a.published_at?new Date(a.published_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):''}</small></div></article>`).join('') || '<div class="empty">No new announcements.</div>');
    setHtml('attendanceBreakdown',`<div><b>${present}</b><span>Present</span></div><div><b>${att.filter(x=>x.status==='ABSENT').length}</b><span>Absent</span></div><div><b>${late}</b><span>Late</span></div>`);
    if(loading) loading.remove();
  }catch(err){
    console.error(err); if(loading){loading.className='dashboard-error';loading.innerHTML=`<strong>Dashboard could not load</strong><p>${esc(err.message)}</p><a class="button" href="student-login.html">Return to Login</a>`}
  }
}

loadDashboard();
