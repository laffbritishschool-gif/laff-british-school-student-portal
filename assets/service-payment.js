import { supabase } from './supabase.js';

export const PAYSTACK_PUBLIC_KEY='pk_test_3c6749696834a73e309d35b2fe573f450cbe7bdf';
const EDGE='https://moqpmrhholbbhuedvbgg.supabase.co/functions/v1/paystack-payment';
let paystackLoader=null;

export async function servicePaid(serviceCode){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)return false;
 const {data,error}=await supabase.rpc('has_paid_student_service',{p_service_code:serviceCode});
 if(error)throw error;
 return data===true;
}

export async function verifyPayment(reference,serviceCode){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Your session has expired. Please sign in again.');
 const res=await fetch(EDGE,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'verify',service_code:serviceCode,reference})});
 const payload=await res.json();
 if(!res.ok)throw new Error(payload.error||'Payment verification failed.');
 return payload;
}

export async function verifyPaymentFromUrl(serviceCode){
 const params=new URLSearchParams(location.search);
 const reference=params.get('reference')||params.get('payment_reference')||params.get('trxref');
 if(!reference)return null;
 const payload=await verifyPayment(reference,serviceCode);
 history.replaceState({},document.title,location.pathname);
 return payload;
}

export async function initializeServicePayment(serviceCode){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Your session has expired. Please sign in again.');
 const callback=`${location.origin}${location.pathname}`;
 const res=await fetch(EDGE,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'initialize',service_code:serviceCode,callback_url:callback})});
 const payload=await res.json();
 if(!res.ok)throw new Error(payload.error||'Could not start payment.');
 return payload;
}

export async function loadPaystackPopup(){
 if(window.PaystackPop)return window.PaystackPop;
 if(paystackLoader)return paystackLoader;
 paystackLoader=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-paystack-inline]');
  if(existing){
   existing.addEventListener('load',()=>resolve(window.PaystackPop),{once:true});
   existing.addEventListener('error',()=>reject(new Error('Paystack checkout could not load.')),{once:true});
   return;
  }
  const script=document.createElement('script');
  script.src='https://js.paystack.co/v2/inline.js';
  script.async=true;
  script.dataset.paystackInline='1';
  script.onload=()=>window.PaystackPop?resolve(window.PaystackPop):reject(new Error('Paystack checkout loaded incorrectly.'));
  script.onerror=()=>reject(new Error('Paystack checkout could not load. Check your internet connection and try again.'));
  document.head.appendChild(script);
 });
 return paystackLoader;
}

export async function startServicePayment(serviceCode,{onSuccess,onCancel,onLoad,onError}={}){
 const payload=await initializeServicePayment(serviceCode);
 if(payload.paid){onSuccess?.(payload);return payload;}
 if(!payload.access_code)throw new Error('Paystack did not return a checkout access code.');
 const PaystackPop=await loadPaystackPopup();
 const popup=new PaystackPop();
 popup.resumeTransaction(payload.access_code,{onLoad,onSuccess:async transaction=>{
  try{
   const verified=await verifyPayment(transaction?.reference||payload.reference,serviceCode);
   if(!verified?.paid)throw new Error('Payment completed but could not be verified.');
   onSuccess?.(verified);
  }catch(error){onError?.(error)}
 },onCancel});
 return payload;
}

export function paymentGateMarkup({title,description,amount}){
 return `<div class="service-payment-gate"><div class="service-payment-icon">₦</div><span class="eyebrow">SECURE ACCESS</span><h2>${title}</h2><p>${description}</p><div class="service-payment-price">₦${Number(amount||0).toLocaleString('en-NG')}</div><button class="button yellow" id="servicePayButton" type="button">Pay with Paystack</button><div class="service-payment-loading" id="servicePaymentLoading" hidden><span class="spinner" aria-hidden="true"></span><span>Connecting to Paystack…</span></div><small>Paystack checkout will open securely on this page. Your access is unlocked only after payment is verified.</small></div>`;
}
