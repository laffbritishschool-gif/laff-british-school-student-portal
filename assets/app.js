const KEY='laffStudentSidebarCollapsed';
function injectPortalPolish(){
 if(!document.querySelector('link[data-portal-polish]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assets/portal-polish.css?v=2';l.dataset.portalPolish='1';document.head.appendChild(l)}
 if(document.querySelector('#page-loader,.portal-page-loader')||document.body.classList.contains('login-page'))return;
 const loader=document.createElement('div');loader.className='portal-page-loader';loader.id='portalPageLoader';loader.innerHTML='<div class="portal-loader-inner"><div class="portal-loader-mark"><span class="portal-loader-ring"></span><img src="https://i.ibb.co/whtP8S5v/image.png" alt="Laff British Montessori School"></div><div class="portal-loader-title">Laff British Montessori School</div><p class="portal-loader-sub">Loading your student portal…</p><div class="portal-loader-bar"><i></i></div></div>';
 document.body.prepend(loader);
 window.__portalLoader=loader;
 setTimeout(()=>loader.classList.add('hide'),1000);
}
function hidePortalLoader(delay=0){setTimeout(()=>window.__portalLoader?.classList.add('hide'),delay)}
function setupPortal(){
 injectPortalPolish();
 const body=document.body,t=document.getElementById('toggle');
 if(localStorage.getItem(KEY)==='1')body.classList.add('collapsed');
 if(t)t.addEventListener('click',()=>{body.classList.toggle('collapsed');localStorage.setItem(KEY,body.classList.contains('collapsed')?'1':'0')});
 const bell=document.getElementById('notificationBell');
 if(bell)bell.addEventListener('click',()=>showToast('Notifications are loaded from the school portal.'));
 document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();showToast(b.dataset.toast)}));
 window.addEventListener('dashboard-ready',()=>hidePortalLoader(350));
 document.querySelectorAll('.stat h3,.finance-stat strong').forEach((el,i)=>el.style.animationDelay=`${i*70}ms`);
}
function showToast(message){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2800)}
async function signOut(){try{const {supabase}=await import('./supabase.js');await supabase.auth.signOut()}finally{location.href='student-login.html'}}
document.addEventListener('DOMContentLoaded',setupPortal);
