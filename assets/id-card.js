import { supabase } from './supabase.js';
import { servicePaid, verifyPaymentFromUrl, startServicePayment, paymentGateMarkup } from './service-payment.js?v=7';
const SERVICE='ID_CARD';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function addPaymentCss(){if(document.querySelector('link[data-service-payment]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='assets/service-payment.css?v=7';l.dataset.servicePayment='1';document.head.appendChild(l)}
function setText(selector,value){const e=document.querySelector(selector);if(e)e.textContent=value||'—'}
function setPhoto(el,url,initials){if(!el)return;if(url){el.innerHTML=`<img src="${esc(url)}" alt="Student passport photograph" loading="eager">`;el.querySelector('img')?.addEventListener('error',()=>el.textContent=initials,{once:true})}else el.textContent=initials}
async function photoUrl(value){if(!value)return null;const raw=String(value);if(/^https?:\/\//i.test(raw))return raw;try{const {data}=await supabase.storage.from('student-passports').createSignedUrl(raw,21600);return data?.signedUrl||null}catch{return null}}
async function gate(){
 addPaymentCss();const section=document.querySelector('.card-section');
 try{const verified=await verifyPaymentFromUrl(SERVICE);if(verified?.paid){if(section){const note=document.createElement('div');note.className='service-payment-success payment-opening';note.textContent='Payment verified successfully. Opening your digital ID card…';section.prepend(note);setTimeout(()=>note.remove(),3000)}return true;}}catch(err){if(section)section.innerHTML=`<div class="service-payment-gate"><h2>Payment verification needs attention</h2><p>${esc(err.message||'Please try again.')}</p><button class="button yellow" type="button" onclick="location.reload()">Try again</button></div>`;return false}
 try{if(await servicePaid(SERVICE))return true;}catch(err){console.warn('Paid-status check failed:',err)}
 if(!section)return false;const {data:setting,error}=await supabase.from('student_service_settings').select('title,amount,is_active').eq('service_code',SERVICE).maybeSingle();if(error)throw error;
 if(!setting?.is_active){section.innerHTML='<div class="service-payment-gate"><h2>Digital ID card unavailable</h2><p>Please contact the school office.</p></div>';return false}
 section.innerHTML=paymentGateMarkup({title:'Unlock Your Digital Student ID',description:'Pay the student ID card fee to unlock your official digital ID card and printing access.',amount:setting.amount,serviceCode:SERVICE});
 const button=document.getElementById('servicePayButton');
 button?.addEventListener('click',e=>{e.preventDefault();try{button.disabled=true;button.textContent='Opening secure checkout…';startServicePayment(SERVICE,{onLoad:()=>{button.textContent='Paystack checkout open'},onSuccess:result=>{const ref=result?.reference;if(ref)location.href=`payment-receipt.html?service=${encodeURIComponent(SERVICE)}&reference=${encodeURIComponent(ref)}`;else loadCard()},onCancel:()=>{button.disabled=false;button.textContent='Pay with Paystack'},onError:error=>{button.disabled=false;button.textContent='Pay with Paystack';section.insertAdjacentHTML('beforeend',`<div class="service-payment-success" style="background:#fdeaea;color:#9b2c2c;margin-top:14px">${esc(error.message||'Payment verification failed.')}</div>`)}})}catch(err){button.disabled=false;button.textContent='Pay with Paystack';section.insertAdjacentHTML('beforeend',`<div class="service-payment-success" style="background:#fdeaea;color:#9b2c2c;margin-top:14px">${esc(err.message||'Could not open Paystack.')}</div>`)}});
 return false;
}
async function loadCard(){
 const section=document.querySelector('.card-section');
 try{
  const {data:{session}}=await supabase.auth.getSession();if(!session){location.replace('student-login.html');return}
  if(!(await gate()))return;
  const {data:student,error:studentError}=await supabase.from('students').select('id,student_id,first_name,middle_name,last_name,school_email,photo_url,status').eq('user_id',session.user.id).maybeSingle();if(studentError)throw studentError;if(!student)throw new Error('Student profile not found.');
  const [{data:school},{data:sessionRow},{data:enrollment},{data:card}]=await Promise.all([
   supabase.from('school_settings').select('school_name,motto,logo_url').limit(1).maybeSingle(),
   supabase.from('academic_sessions').select('id,name').eq('is_current',true).limit(1).maybeSingle(),
   supabase.from('enrollments').select('id,classes(name)').eq('student_id',student.id).eq('status','ACTIVE').order('created_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('id_cards').select('card_number,issued_at,expires_at,is_active').eq('student_id',student.id).eq('is_active',true).limit(1).maybeSingle()
  ]);
  const full=[student.first_name,student.middle_name,student.last_name].filter(Boolean).join(' ')||'Student';const cls=enrollment?.classes?.name||'—';const sess=sessionRow?.[0]?.name||sessionRow?.name||'—';const initials=`${student.first_name?.[0]||''}${student.last_name?.[0]||''}`.toUpperCase()||'ST';
  setText('.id-hero h2',full);setText('.id-hero p',`${student.student_id||'—'} · ${cls} · ${sess}`);setText('.front-card .student-name',full);
  const details=[...document.querySelectorAll('.front-card .detail b')];if(details[0])details[0].textContent=student.student_id||'—';if(details[1])details[1].textContent=cls;if(details[2])details[2].textContent=student.school_email||'—';if(details[3])details[3].textContent=sess;
  const number=document.querySelector('.card-number');if(number)number.textContent=`CARD NO. ${card?.card_number||student.student_id||'—'}`;
  const logos=document.querySelectorAll('.school-logo');logos.forEach(img=>{img.src=school?.logo_url||'https://i.ibb.co/whtP8S5v/image.png'});
  const photo=await photoUrl(student.photo_url);setPhoto(document.querySelector('.student-photo'),photo,initials);
  const credentials=document.querySelector('.credentials');if(credentials)credentials.innerHTML='<div class="credential-box" style="grid-column:1/-1"><small>Digital access</small><b>Available from your Student Portal</b></div>';
  const status=document.querySelector('.status-pill');if(status)status.textContent=student.status==='ACTIVE'?'● ACTIVE STUDENT':'● '+String(student.status||'STUDENT').toUpperCase();
 }catch(e){console.error(e);if(section)section.innerHTML=`<div class="service-payment-gate"><h2>Digital ID card could not be loaded</h2><p>${esc(e.message||'Please try again later.')}</p><button class="button yellow" type="button" onclick="location.reload()">Reload ID Card</button></div>`}
}
loadCard();
