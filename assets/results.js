import { supabase, escapeHtml } from './app.js';
import { servicePaid, verifyPaymentFromUrl, startServicePayment, paymentGateMarkup } from './service-payment.js?v=8';
const SERVICE='RESULT_ACCESS';
let paymentVerifiedThisVisit=false;
const esc=escapeHtml;
const text=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};const html=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v};const show=(id,on=true)=>{const e=document.getElementById(id);if(e)e.hidden=!on};
function addPaymentCss(){if(document.querySelector('link[data-service-payment]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/service-payment.css?v=7';l.dataset.servicePayment='1';document.head.appendChild(l)}
function displayTerm(value){const raw=String(value||'').replaceAll('_',' ').trim();const key=raw.toUpperCase().replace(/\s+TERM$/i,'');const names={FIRST:'First Term',SECOND:'Second Term',THIRD:'Third Term'};return names[key]||(raw?(/TERM$/i.test(raw)?raw:raw+' Term'):'Term')}
function loadingMarkup(message='Loading your result…',detail='Please wait while your published academic record is loaded.'){return `<div class="result-loading"><div class="spinner"></div><strong>${esc(message)}</strong><span>${esc(detail)}</span></div>`}
async function requirePayment(){addPaymentCss();const state=document.getElementById('resultState');if(paymentVerifiedThisVisit)return true;if(state)state.innerHTML=loadingMarkup('Checking result access…','Verifying your payment status securely.');try{const verified=await verifyPaymentFromUrl(SERVICE);if(verified?.paid){paymentVerifiedThisVisit=true;return true}}catch(err){if(state)state.innerHTML=`<strong>Payment verification needs attention</strong><span>${esc(err.message||'Please try again.')}</span>`;return false}try{if(await servicePaid(SERVICE))return true}catch(err){console.warn('Paid-status check failed:',err)}const {data:setting,error}=await supabase.from('student_service_settings').select('title,amount,is_active').eq('service_code',SERVICE).maybeSingle();if(error)throw error;if(!setting?.is_active){state.innerHTML='<strong>Result access is currently unavailable</strong><span>Please contact the school office for assistance.</span>';return false}state.innerHTML=paymentGateMarkup({title:'Unlock Your Published Results',description:'A verified result-access payment is required before your academic result sheet can be viewed or printed.',amount:setting.amount,serviceCode:SERVICE});const button=document.getElementById('servicePayButton'),loading=document.getElementById('servicePaymentLoading');button?.addEventListener('click',async e=>{e.preventDefault();const b=e.currentTarget;b.disabled=true;b.textContent='Opening secure checkout…';if(loading)loading.hidden=false;try{startServicePayment(SERVICE,{onLoad:()=>{b.textContent='Paystack checkout open'},onSuccess:result=>{paymentVerifiedThisVisit=true;if(state)state.innerHTML=loadingMarkup('Payment verified!','Loading your published result…');loadResults()},onCancel:()=>{b.disabled=false;b.textContent='Pay with Paystack';if(loading)loading.hidden=true},onError:error=>{b.disabled=false;b.textContent='Pay with Paystack';if(loading)loading.hidden=true;if(state)state.insertAdjacentHTML('beforeend',`<div class="service-payment-success" style="background:#fdeaea;color:#9b2c2c;margin-top:14px">${esc(error.message||'Payment verification failed.')}</div>`)}})}catch(err){b.disabled=false;b.textContent='Pay with Paystack';if(loading)loading.hidden=true;state.insertAdjacentHTML('beforeend',`<div class="service-payment-success" style="background:#fdeaea;color:#9b2c2c;margin-top:14px">${esc(err.message||'Could not open Paystack.')}</div>`)}});return false}
function storagePathFromPhoto(value){if(!value)return null;const raw=String(value).trim();if(!/^https?:\/\//i.test(raw))return raw.replace(/^\/?student-passports\//i,'');try{const u=new URL(raw),marker='/student-passports/',at=u.pathname.indexOf(marker);if(at>=0)return decodeURIComponent(u.pathname.slice(at+marker.length))}catch{}return null}
async function getStudentPhotoUrl(photoValue){if(!photoValue)return null;const raw=String(photoValue).trim(),path=storagePathFromPhoto(raw);if(!path)return raw;try{const {data,error}=await supabase.storage.from('student-passports').createSignedUrl(path,60*60*6);if(!error&&data?.signedUrl)return data.signedUrl}catch(error){console.warn('Student passport signing failed',error)}return null}
function setShellStudent({student,fullName,className}){const fallback=(fullName||'Student').split(/\s+/).map(v=>v[0]||'').join('').slice(0,2).toUpperCase()||'ST';text('shellName',fullName||'Student');text('shellStudentId',student?.student_id||'—');text('shellClass',className||'—');const shellAvatar=document.getElementById('shellAvatar');if(!shellAvatar)return;if(student?.photo_url){getStudentPhotoUrl(student.photo_url).then(photoUrl=>{if(photoUrl){shellAvatar.innerHTML=`<img src="${esc(photoUrl)}" alt="Student passport photograph" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;shellAvatar.querySelector('img')?.addEventListener('error',()=>{shellAvatar.textContent=fallback},{once:true})}else shellAvatar.textContent=fallback}).catch(()=>shellAvatar.textContent=fallback)}else shellAvatar.textContent=fallback}
async function loadResults(){
 const state=document.getElementById('resultState');
 const periodSelect=document.getElementById('resultPeriod');
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){location.replace('/student-login');return}
  if(!(await requirePayment()))return;
  const uid=session.user.id;
  const [{data:student,error:studentError},{data:school},{data:currentSession},{data:currentTerm}]=await Promise.all([
   supabase.from('students').select('id,student_id,first_name,middle_name,last_name,photo_url,school_email,exam_number,status').eq('user_id',uid).maybeSingle(),
   supabase.from('school_settings').select('school_name,motto,logo_url,address,phone,email,website').limit(1).maybeSingle(),
   supabase.from('academic_sessions').select('id,name,starts_on').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('terms').select('id,name,session_id').eq('is_current',true).order('starts_on',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(studentError)throw studentError;
  if(!student)throw new Error('Your student profile is not available. Please contact the school.');
  const fullName=[student.first_name,student.middle_name,student.last_name].filter(Boolean).join(' ')||'Student';
  const {data:enrollments,error:enrollError}=await supabase.from('enrollments').select('id,class_id,session_id,status,created_at,classes(name),academic_sessions(name,starts_on)').eq('student_id',student.id).order('created_at',{ascending:false});
  if(enrollError)throw enrollError;
  const enrollmentRows=enrollments||[];
  const latestEnrollment=enrollmentRows[0]||null;
  const enrollmentById=Object.fromEntries(enrollmentRows.map(item=>[item.id,item]));
  const enrollmentIds=enrollmentRows.map(item=>item.id);
  const {data:resultRows,error:resultError}=enrollmentIds.length
   ?await supabase.from('results').select('id,enrollment_id,subject_id,term_id,ca_score,exam_score,total,grade,grade_point,teacher_remark,principal_remark,position,status,subjects(name,code),terms(id,name,session_id,academic_sessions(name,starts_on))').in('enrollment_id',enrollmentIds).eq('status','PUBLISHED').order('subject_id',{ascending:true})
   :{data:[],error:null};
  if(resultError)throw resultError;
  const className=latestEnrollment?.classes?.name||'—';
  setShellStudent({student,fullName,className});
  const sessionRow=Array.isArray(currentSession)?currentSession[0]:currentSession;
  const termRow=Array.isArray(currentTerm)?currentTerm[0]:currentTerm;
  const schoolName=school?.school_name||'Laff British Montessori School';
  const logo=school?.logo_url||'https://i.ibb.co/whtP8S5v/image.png';
  text('heroSchoolName',schoolName);text('schoolName',schoolName);
  text('heroMotto',school?.motto||'Excellence · Character · Confidence · Knowledge');
  text('heroStudent',fullName);text('heroStudentId',student.student_id);text('heroClass',className);
  text('studentName',fullName);text('studentId',student.student_id);text('studentStatus',student.status||'ACTIVE');
  text('examNo',student.exam_number||'—');
  const contact=[school?.address,school?.phone].filter(Boolean).join(' · ');
  const contact2=[school?.email,school?.website].filter(Boolean).join(' · ');
  text('schoolContact',[contact,contact2].filter(Boolean).join('\n')||'School contact details');
  ['heroLogo','sheetLogo'].forEach(id=>{const image=document.getElementById(id);if(image)image.src=logo});
  const groups=new Map();
  (resultRows||[]).forEach(row=>{
   const enrollment=enrollmentById[row.enrollment_id];
   const rawTerm=Array.isArray(row.terms)?row.terms[0]:row.terms;
   const groupKey=row.enrollment_id+'|'+row.term_id;
   if(!groups.has(groupKey))groups.set(groupKey,{key:groupKey,enrollment,term:rawTerm,rows:[]});
   groups.get(groupKey).rows.push(row);
  });
  const available=[...groups.values()].sort((a,b)=>{
   const aSession=a.term?.academic_sessions?.starts_on||a.enrollment?.academic_sessions?.starts_on||'';
   const bSession=b.term?.academic_sessions?.starts_on||b.enrollment?.academic_sessions?.starts_on||'';
   if(aSession!==bSession)return String(bSession).localeCompare(String(aSession));
   return String(b.term?.name||'').localeCompare(String(a.term?.name||''));
  });
  if(!available.length){
   periodSelect.disabled=true;periodSelect.replaceChildren(new Option('No published results yet',''));
   state.hidden=false;state.innerHTML='<strong>No published result yet</strong><span>Your published results will appear here after the school releases them.</span>';
   return;
  }
  periodSelect.disabled=false;
  periodSelect.replaceChildren(...available.map(group=>{
   const option=new Option();
   const termName=displayTerm(group.term?.name);
   const sessionName=group.term?.academic_sessions?.name||group.enrollment?.academic_sessions?.name||'Academic session';
   option.value=group.key;option.textContent=sessionName+' · '+termName+' · '+(group.enrollment?.classes?.name||'Class');
   return option;
  }));
  const preferred=available.find(group=>group.term?.id===termRow?.id&&group.enrollment?.session_id===sessionRow?.id)||available[0];
  periodSelect.value=preferred.key;
  function renderSelectedResult(key){
   const group=groups.get(key);
   if(!group)return;
   const rows=group.rows;
   const termName=String(group.term?.name||'Term').replaceAll('_',' ');
   const academicSession=group.term?.academic_sessions?.name||group.enrollment?.academic_sessions?.name||'—';
   const selectedClass=group.enrollment?.classes?.name||'—';
   const average=rows.length?rows.reduce((sum,row)=>sum+Number(row.total||0),0)/rows.length:0;
   const points=rows.reduce((sum,row)=>sum+Number(row.grade_point||0),0);
   const positions=rows.map(row=>Number(row.position||0)).filter(Boolean);
   const position=positions.length?Math.min(...positions):null;
   const ordinal=value=>{const n=Number(value),lastTwo=n%100;const suffix=lastTwo>=11&&lastTwo<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');return n+suffix};
   const overall=average>=70?'A':average>=60?'B':average>=50?'C':average>=45?'D':average>=40?'E':'F';
   const teacherRemarks=[...new Set(rows.map(row=>row.teacher_remark).filter(Boolean))];
   const principalRemarks=[...new Set(rows.map(row=>row.principal_remark).filter(Boolean))];
   text('heroClass',selectedClass);text('heroSessionTerm',academicSession+' · '+termName);
   text('className',selectedClass);text('sessionName',academicSession);text('termName',termName);
   text('resultStatus','Published');
   text('reportSession',academicSession+' Academic Session');text('reportTerm',termName);
   text('average',average.toFixed(1)+'%');text('overallGrade',overall);text('position',position?ordinal(position):'—');
   text('subjectsCount',rows.length);text('totalScore',rows.reduce((sum,row)=>sum+Number(row.total||0),0).toFixed(1));text('gradePoints',points.toFixed(1));
   text('teacherRemark',teacherRemarks[0]||'—');text('principalRemark',principalRemarks[0]||'—');
   html('resultBody',rows.map((row,index)=>{
    const grade=esc(row.grade||'—'),gradeClass=grade==='A'?'grade-a':grade==='B'?'grade-b':'';
    return '<tr><td>'+(index+1)+'</td><td><b>'+esc(row.subjects?.name||'Subject')+'</b></td><td>'+esc(row.subjects?.code||'—')+'</td><td>'+Number(row.ca_score||0)+'</td><td>'+Number(row.exam_score||0)+'</td><td><b>'+Number(row.total||0)+'</b></td><td><span class="grade '+gradeClass+'">'+grade+'</span></td><td>'+esc(row.grade_point??'—')+'</td><td>'+esc(row.teacher_remark||row.principal_remark||'—')+'</td></tr>';
   }).join(''));
   show('resultTableWrap');show('summaryRow');show('remarks');state.hidden=true;
  }
  periodSelect.onchange=()=>renderSelectedResult(periodSelect.value);
  renderSelectedResult(preferred.key);
 }catch(err){console.error(err);state.hidden=false;state.innerHTML='<strong>Results could not be loaded</strong><span>'+esc(err.message||'Please try again later.')+'</span>'}
}
document.getElementById('printResult')?.addEventListener('click',()=>window.print());loadResults();
