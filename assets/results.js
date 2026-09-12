import { supabase } from './supabase.js';

const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const text=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
const html=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};
const show=(id,on=true)=>{const e=document.getElementById(id);if(e)e.hidden=!on};

async function loadResults(){
  const state=document.getElementById('resultState');
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){location.replace('student-login.html');return}
    const uid=session.user.id;
    const [{data:student,error:studentError},{data:school},{data:currentSession},{data:currentTerm}]=await Promise.all([
      supabase.from('students').select('id,student_id,first_name,middle_name,last_name,school_email,examination_number,status').eq('user_id',uid).maybeSingle(),
      supabase.from('school_settings').select('school_name,motto,logo_url,address,phone,email,website').limit(1).maybeSingle(),
      supabase.from('academic_sessions').select('id,name').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('terms').select('id,name,session_id').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle()
    ]);
    if(studentError)throw studentError;
    if(!student)throw new Error('Your student profile is not available. Please contact the school.');
    const fullName=[student.first_name,student.middle_name,student.last_name].filter(Boolean).join(' ')||'Student';
    const sessionRow=currentSession?.[0]||currentSession;
    const termRow=currentTerm?.[0]||currentTerm;
    const {data:enrollment,error:enrollError}=await supabase.from('enrollments').select('id,class_id,status,classes(name)').eq('student_id',student.id).eq('session_id',sessionRow?.id||'').in('status',['ACTIVE','COMPLETED','PROMOTED']).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(enrollError)throw enrollError;
    const className=enrollment?.classes?.name||'—';
    const {data:rows,error:resultError}=enrollment&&termRow?.id?await supabase.from('results').select('id,subject_id,ca_score,exam_score,total,grade,grade_point,teacher_remark,principal_remark,position,status,subjects(name)').eq('enrollment_id',enrollment.id).eq('term_id',termRow.id).eq('status','PUBLISHED').order('subject_id',{ascending:true}):{data:[],error:null};
    if(resultError)throw resultError;
    const results=rows||[];
    const avg=results.length?results.reduce((s,r)=>s+Number(r.total||0),0)/results.length:0;
    const points=results.length?results.reduce((s,r)=>s+Number(r.grade_point||0),0)/results.length:0;
    const overall=avg>=70?'A':avg>=60?'B':avg>=50?'C':avg>=45?'D':avg>=40?'E':'F';
    const positions=results.map(r=>Number(r.position||0)).filter(Boolean);
    const position=positions.length?Math.min(...positions):null;
    const teacherRemarks=[...new Set(results.map(r=>r.teacher_remark).filter(Boolean))];
    const principalRemarks=[...new Set(results.map(r=>r.principal_remark).filter(Boolean))];
    const schoolName=school?.school_name||'Laff British Montessori School';
    const logo=school?.logo_url||'https://i.ibb.co/whtP8S5v/image.png';
    const termName=(termRow?.name||'').replaceAll('_',' ')||'—';
    text('heroSchoolName',schoolName);text('schoolName',schoolName);text('heroMotto',school?.motto||'Excellence · Character · Confidence · Knowledge');
    text('heroStudent',fullName);text('heroStudentId',student.student_id);text('heroClass',className);text('heroSessionTerm',`${sessionRow?.name||'—'} · ${termName}`);
    text('studentName',fullName);text('studentId',student.student_id);text('className',className);text('studentStatus',student.status||'ACTIVE');text('examNo',student.examination_number||'—');text('sessionName',sessionRow?.name||'—');text('termName',termName);text('resultStatus',results.length?'Published':'Not Published');
    text('reportSession',`${sessionRow?.name||'—'} Academic Session`);text('reportTerm',termName);
    const contact=[school?.address,school?.phone].filter(Boolean).join(' · ');const contact2=[school?.email,school?.website].filter(Boolean).join(' · ');text('schoolContact',[contact,contact2].filter(Boolean).join('\n')||'School contact details');
    ['heroLogo','sheetLogo'].forEach(id=>{const e=document.getElementById(id);if(e)e.src=logo});
    if(!results.length){state.innerHTML='<strong>No published result yet</strong><span>Your result for the current session and term has not been published.</span>';return}
    const body=results.map((r,i)=>{const grade=esc(r.grade||'—');const cls=grade==='A'?'grade-a':grade==='B'?'grade-b':'';return `<tr><td>${i+1}</td><td><b>${esc(r.subjects?.name||'Subject')}</b></td><td>${Number(r.ca_score||0)}</td><td>${Number(r.exam_score||0)}</td><td><b>${Number(r.total||0)}</b></td><td><span class="grade ${cls}">${grade}</span></td><td>${esc(r.grade_point??'—')}</td><td>${esc(r.teacher_remark||'—')}</td></tr>`}).join('');
    html('resultBody',body);show('resultTableWrap');show('summaryRow');show('remarks');
    text('average',`${avg.toFixed(1)}%`);text('overallGrade',overall);text('position',position?`${position}${position===1?'st':position===2?'nd':position===3?'rd':'th'}`:'—');text('subjectsCount',results.length);
    text('teacherRemark',teacherRemarks[0]||'—');text('principalRemark',principalRemarks[0]||'—');
    state.remove();
  }catch(err){console.error(err);state.innerHTML=`<strong>Results could not be loaded</strong><span>${esc(err.message||'Please try again later.')}</span>`}
}

document.getElementById('printResult')?.addEventListener('click',()=>window.print());
loadResults();