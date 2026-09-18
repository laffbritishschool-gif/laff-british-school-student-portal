import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://moqpmrhholbbhuedvbgg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IfSp9O5zUubH6rifFbfmZQ_DJttLC1f';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const SIDEBAR_KEY = 'laffStudentSidebarCollapsed';
const SETTINGS_KEY = 'laff-school-settings';
const DEFAULT_SCHOOL_SETTINGS = {
  school_name: 'Laff British Montessori School',
  motto: 'Learning · Character · Excellence',
  logo_url: 'https://i.ibb.co/whtP8S5v/image.png',
  primary_color: '#123d8f',
  secondary_color: '#f4c400',
  ui_settings: { navigation: 'sidebar', theme: 'light', compact_sidebar: false, show_breadcrumbs: true }
};

// SINGLE SOURCE OF TRUTH FOR THE ENTIRE STUDENT PORTAL SIDEBAR.
const STUDENT_NAV = [
  ['index.html', 'Dashboard', '⌂'],
  ['student-profile.html', 'My Profile', '♙'],
  ['student-results.html', 'Results', '▥'],
  ['student-attendance.html', 'Attendance', '✓'],
  ['student-timetable.html?v=3', 'Timetable', '□'],
  ['student-announcements.html', 'Announcements', '♢'],
  ['student-fees.html', 'Fees & Payments', '₦'],
  ['id-card.html', 'My ID Card', '▣']
];

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char] || char));
}

export function toast(message, type = 'success') {
  let host = document.querySelector('#toast-host');
  if (!host) { host = document.createElement('div'); host.id = 'toast-host'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 3000);
}

export function pageLoading(show = true) {
  const loader = document.querySelector('#page-loader, #portalPageLoader');
  document.body.classList.toggle('is-loading', show);
  loader?.classList.toggle('hide', !show);
}

function mergeSettings(raw = {}) {
  return {
    ...DEFAULT_SCHOOL_SETTINGS,
    ...raw,
    ui_settings: { ...DEFAULT_SCHOOL_SETTINGS.ui_settings, ...(raw.ui_settings || {}) }
  };
}

export function getCachedSchoolSettings() {
  try { return mergeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch { return mergeSettings(); }
}

function applySettingsToDom(settings) {
  const s = mergeSettings(settings);
  document.documentElement.style.setProperty('--school-primary', s.primary_color || DEFAULT_SCHOOL_SETTINGS.primary_color);
  document.documentElement.style.setProperty('--school-secondary', s.secondary_color || DEFAULT_SCHOOL_SETTINGS.secondary_color);
  document.documentElement.style.setProperty('--portal-blue', s.primary_color || DEFAULT_SCHOOL_SETTINGS.primary_color);
  document.documentElement.style.setProperty('--portal-yellow', s.secondary_color || DEFAULT_SCHOOL_SETTINGS.secondary_color);
  document.body.classList.toggle('school-dark', s.ui_settings.theme === 'dark');
  document.body.classList.remove('nav-header');
  document.body.classList.toggle('compact-sidebar', !!s.ui_settings.compact_sidebar);
  document.querySelectorAll('[data-school-name]').forEach(el => el.textContent = s.school_name);
  document.querySelectorAll('[data-school-motto]').forEach(el => el.textContent = s.motto || DEFAULT_SCHOOL_SETTINGS.motto);
  document.querySelectorAll('.brand img, [data-school-logo]').forEach(img => img.src = s.logo_url || DEFAULT_SCHOOL_SETTINGS.logo_url);
  document.querySelectorAll('.brand strong').forEach(el => el.textContent = s.school_name);
  document.querySelectorAll('.brand small').forEach(el => el.textContent = 'Student Portal');
  return s;
}

export async function loadSchoolSettings() {
  const cached = getCachedSchoolSettings();
  applySettingsToDom(cached);
  try {
    const { data, error } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
    if (error) throw error;
    const settings = applySettingsToDom(data || cached);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
    return settings;
  } catch (error) {
    console.warn('School settings refresh failed; using cached settings.', error);
    return cached;
  }
}

function setupLoader() {
  let loader = document.querySelector('#page-loader, #portalPageLoader');
  if (loader) { window.__portalLoader = loader; return loader; }
  if (document.body.classList.contains('login-page')) return null;
  const settings = getCachedSchoolSettings();
  loader = document.createElement('div');
  loader.id = 'portalPageLoader';
  loader.className = 'portal-page-loader';
  loader.innerHTML = `<div class="portal-loader-inner"><div class="portal-loader-mark"><span class="portal-loader-ring"></span><img src="${escapeHtml(settings.logo_url)}" alt="School logo"></div><div class="portal-loader-title">${escapeHtml(settings.school_name)}</div><p class="portal-loader-sub">Loading your student portal…</p><div class="portal-loader-bar"><i></i></div></div>`;
  document.body.prepend(loader);
  window.__portalLoader = loader;
  return loader;
}

export function finishPageLoad(delay = 180) { setTimeout(() => window.__portalLoader?.classList.add('hide'), delay); }

function getCurrentPage() {
  const value = location.pathname.split('/').pop();
  return value || 'index.html';
}

function renderSidebar(settings) {
  const current = getCurrentPage();
  const safeSettings = mergeSettings(settings);
  const links = STUDENT_NAV.map(([href, label, icon]) => `
    <a class="${href.split('?')[0] === current ? 'active' : ''}" href="${href}">
      <span class="ico">${icon}</span>
      <span>${escapeHtml(label)}</span>
    </a>`).join('');

  return `<aside class="sidebar" id="studentSidebar" aria-label="Student portal navigation">
    <button class="toggle" id="studentSidebarToggle" aria-label="Collapse sidebar">‹</button>
    <div class="brand">
      <img src="${escapeHtml(safeSettings.logo_url)}" alt="${escapeHtml(safeSettings.school_name)} crest">
      <div><strong>${escapeHtml(safeSettings.school_name)}</strong><small>Student Portal</small></div>
    </div>
    <nav class="nav" aria-label="Primary">
      <div class="nav-links">${links}</div>
      <div class="nav-bottom">
        <a class="logout" id="studentSidebarLogout" href="#"><span class="ico">↪</span><span>Sign Out</span></a>
      </div>
    </nav>
  </aside>`;
}

function injectSidebarRuntimeStyles() {
  if (document.getElementById('student-sidebar-runtime-style')) return;
  const style = document.createElement('style');
  style.id = 'student-sidebar-runtime-style';
  style.textContent = `
    #studentSidebar{position:fixed!important;inset:0 auto 0 0!important;width:270px!important;height:100vh!important;min-height:100vh!important;z-index:40!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}
    #studentSidebar .brand{flex:0 0 auto!important}
    #studentSidebar .nav{position:relative!important;display:flex!important;flex-direction:column!important;min-height:0!important;height:calc(100vh - 94px)!important;margin:0!important;padding:18px 14px 16px!important;overflow:hidden!important}
    #studentSidebar .nav-links{display:flex!important;flex-direction:column!important;gap:6px!important;min-height:0!important;overflow-y:auto!important;padding:0 0 12px!important;scrollbar-width:thin}
    #studentSidebar .nav-bottom{margin-top:auto!important;flex:0 0 auto!important;padding-top:14px!important;border-top:1px solid rgba(255,255,255,.12)!important}
    #studentSidebar .nav-bottom .logout{position:static!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;margin:0!important}
    #studentSidebar .nav-bottom:after{content:"";display:block;height:2px}
    #studentSidebar .logout{background:rgba(255,255,255,.08)!important}
    .main{margin-left:270px!important;width:calc(100% - 270px)!important}
    body.collapsed #studentSidebar{width:78px!important}
    body.collapsed .main{margin-left:78px!important;width:calc(100% - 78px)!important}
    body.collapsed #studentSidebar .nav-links{overflow-y:auto!important}
    body.collapsed #studentSidebar .nav-bottom{padding-top:14px!important}
    body.collapsed #studentSidebar .nav-bottom .logout{justify-content:center!important}
    @media(max-width:760px){
      #studentSidebar{width:270px!important;transform:translateX(-100%);box-shadow:16px 0 45px rgba(3,48,98,.22)!important}
      #studentSidebar.open{transform:translateX(0)}
      .main{margin-left:0!important;width:100%!important}
      body.collapsed #studentSidebar{width:270px!important}
      body.collapsed .main{margin-left:0!important;width:100%!important}
      #studentSidebar .nav{height:calc(100vh - 94px)!important}
      .student-sidebar-overlay{position:fixed;inset:0;background:rgba(3,28,53,.4);z-index:35;display:block;opacity:0;visibility:hidden;transition:.25s ease}
      .student-sidebar-overlay.show{opacity:1;visibility:visible}
      .student-sidebar-mobile-menu{display:grid!important;place-items:center;width:42px;height:42px;border:1px solid var(--border,#e3ebf5);background:#fff;color:var(--blue-dark,#063b78);border-radius:12px;cursor:pointer;box-shadow:0 7px 24px rgba(22,61,105,.08);flex:0 0 42px}
    }
    @media(min-width:761px){.student-sidebar-mobile-menu{display:none!important}}
  `;
  document.head.appendChild(style);
}

function ensureMobileMenu() {
  if (document.querySelector('.student-sidebar-mobile-menu')) return;
  const top = document.querySelector('.top');
  if (!top) return;
  const copy = top.firstElementChild;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'student-sidebar-mobile-menu';
  button.setAttribute('aria-label', 'Open student navigation');
  button.textContent = '☰';
  button.addEventListener('click', () => toggleSidebar(true));
  top.insertBefore(button, copy || top.firstChild);
}

function ensureSidebarRuntime() {
  const host = document.querySelector('.app');
  if (!host) return;
  injectSidebarRuntimeStyles();
  const settings = getCachedSchoolSettings();
  const existing = document.querySelector('#studentSidebar, .sidebar');
  const fresh = document.createElement('div');
  fresh.innerHTML = renderSidebar(settings);
  const sidebar = fresh.firstElementChild;
  if (existing) existing.replaceWith(sidebar); else host.prepend(sidebar);
  const previousOverlay = document.getElementById('studentSidebarOverlay');
  if (!previousOverlay) {
    const overlay = document.createElement('div');
    overlay.className = 'student-sidebar-overlay';
    overlay.id = 'studentSidebarOverlay';
    overlay.addEventListener('click', () => toggleSidebar(false));
    document.body.appendChild(overlay);
  }
  bindSidebarEvents();
  ensureMobileMenu();
}

function bindSidebarEvents() {
  document.getElementById('studentSidebarToggle')?.addEventListener('click', () => {
    const desktop = window.matchMedia('(min-width: 761px)').matches;
    if (desktop) toggleSidebar(); else toggleSidebar(false);
  });
  document.getElementById('studentSidebarLogout')?.addEventListener('click', event => {
    event.preventDefault();
    signOut();
  });
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('studentSidebar');
  const overlay = document.getElementById('studentSidebarOverlay');
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  if (mobile) {
    const shouldOpen = typeof open === 'boolean' ? open : !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', shouldOpen);
    overlay?.classList.toggle('show', shouldOpen);
    return;
  }
  document.body.classList.toggle('collapsed', typeof open === 'boolean' ? !open : !document.body.classList.contains('collapsed'));
  localStorage.setItem(SIDEBAR_KEY, document.body.classList.contains('collapsed') ? '1' : '0');
}

async function refreshShellSettings() {
  const settings = await loadSchoolSettings();
  const sidebar = document.getElementById('studentSidebar');
  if (!sidebar) return;
  sidebar.outerHTML = renderSidebar(settings);
  bindSidebarEvents();
  ensureMobileMenu();
  if (localStorage.getItem(SIDEBAR_KEY) === '1' && window.matchMedia('(min-width: 761px)').matches) document.body.classList.add('collapsed');
}

function ensureNotificationCenter() {
  if (document.getElementById('notificationCenter')) return;
  const center = document.createElement('div');
  center.id = 'notificationCenter'; center.className = 'portal-overlay'; center.hidden = true;
  center.innerHTML = `<div class="notification-center" role="dialog" aria-modal="true" aria-labelledby="notificationTitle"><div class="notification-head"><div><span class="eyebrow">STUDENT UPDATES</span><h2 id="notificationTitle">Notification Center</h2><p>Important school announcements and recent updates.</p></div><button class="notification-close" type="button" aria-label="Close notifications">×</button></div><div id="notificationList" class="notification-list"><div class="notification-loading"><span></span>Loading notifications…</div></div><div class="notification-foot"><a href="student-announcements.html">Open all announcements →</a></div></div>`;
  document.body.appendChild(center);
  center.addEventListener('click', event => { if (event.target === center) closeNotificationCenter(); });
  center.querySelector('.notification-close').addEventListener('click', closeNotificationCenter);
}

function renderNotifications(items = []) {
  const list = document.getElementById('notificationList');
  if (!list) return;
  if (!items.length) { list.innerHTML = '<div class="notification-empty"><b>No new notifications</b><span>You are all caught up.</span></div>'; return; }
  list.innerHTML = items.map((a, i) => {
    const date = a.published_at || a.created_at;
    return `<article class="notification-item" style="--n:${i}"><span class="notification-mark">◆</span><div><div class="notification-title-row"><b>${escapeHtml(a.title)}</b><time>${date ? new Date(date).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : ''}</time></div><p>${escapeHtml((a.body || '').slice(0,220))}${(a.body || '').length > 220 ? '…' : ''}</p></div></article>`;
  }).join('');
}

async function openNotificationCenter() {
  ensureNotificationCenter();
  const center = document.getElementById('notificationCenter');
  const list = document.getElementById('notificationList');
  center.hidden = false; document.body.classList.add('portal-modal-open');
  requestAnimationFrame(() => center.classList.add('show'));
  try {
    if (!window.__studentNotifications) {
      const { data, error } = await supabase.from('announcements').select('id,title,body,published_at,created_at').eq('published', true).order('published_at', { ascending:false, nullsFirst:false }).order('created_at', { ascending:false }).limit(12);
      if (error) throw error;
      window.__studentNotifications = data || [];
    }
    renderNotifications(window.__studentNotifications);
  } catch (error) {
    console.error(error);
    list.innerHTML = '<div class="notification-empty"><b>Notifications unavailable</b><span>Please try again shortly.</span></div>';
  }
}

function closeNotificationCenter() {
  const center = document.getElementById('notificationCenter');
  if (!center) return;
  center.classList.remove('show'); document.body.classList.remove('portal-modal-open');
  setTimeout(() => { center.hidden = true; }, 220);
}

function ensureProfileMenu() {
  const chip = document.querySelector('.profile-chip');
  if (!chip || document.getElementById('profileMenu')) return;
  chip.setAttribute('role', 'button'); chip.setAttribute('tabindex', '0'); chip.setAttribute('aria-haspopup','menu'); chip.setAttribute('aria-expanded','false');
  chip.classList.add('profile-chip-clickable');
  const menu = document.createElement('div'); menu.id='profileMenu'; menu.className='profile-menu';
  menu.innerHTML = `<a href="student-profile.html"><span>♙</span><div><b>My Profile</b><small>View your student information</small></div></a><button type="button" class="profile-logout"><span>↪</span><div><b>Logout</b><small>Sign out of this account</small></div></button>`;
  chip.parentElement.style.position='relative'; chip.parentElement.appendChild(menu);
  const toggle=()=>{const open=menu.classList.toggle('show');chip.setAttribute('aria-expanded',open?'true':'false')};
  chip.addEventListener('click',toggle);
  chip.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}if(event.key==='Escape')menu.classList.remove('show')});
  menu.querySelector('.profile-logout').addEventListener('click',signOut);
  document.addEventListener('click',event=>{if(!chip.parentElement.contains(event.target))menu.classList.remove('show')});
}

async function signOut() {
  try { await supabase.auth.signOut(); } finally { location.href='student-login.html'; }
}
window.signOut=signOut;
export { signOut };

export function mountStudentShell({ title='Student Portal', subtitle='', content='' }={}) {
  const app=document.querySelector('#student-app,#app');
  if(!app)return;
  const settings=getCachedSchoolSettings();
  app.innerHTML=`<div class="app"><main class="main"><header class="top"><div><div class="eyebrow">STUDENT PORTAL</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="top-actions"><button class="icon-btn" id="notificationBell" aria-label="Notifications">♢<span class="dot"></span></button><div class="profile-chip"><div class="avatar" id="shellAvatar">ST</div><div><b id="shellName">Student</b><div class="muted"><span id="shellStudentId">—</span> · <span id="shellClass">—</span></div></div></div></div></header>${content}</main></div>`;
  const shell=document.createElement('div'); shell.innerHTML=renderSidebar(settings); app.querySelector('.app')?.prepend(shell.firstElementChild);
  injectSidebarRuntimeStyles(); bindSidebarEvents(); ensureMobileMenu(); ensureNotificationCenter(); ensureProfileMenu();
  document.getElementById('notificationBell')?.addEventListener('click',openNotificationCenter); loadSchoolSettings();
}

function setupSidebarForExistingPage(){
  if(document.body.classList.contains('login-page'))return;
  ensureSidebarRuntime();
  if(localStorage.getItem(SIDEBAR_KEY)==='1'&&window.matchMedia('(min-width:761px)').matches)document.body.classList.add('collapsed');
}

function boot(){
  if(document.body.classList.contains('login-page'))return;
  setupLoader(); setupSidebarForExistingPage(); ensureNotificationCenter(); ensureProfileMenu();
  document.getElementById('notificationBell')?.addEventListener('click',openNotificationCenter);
  document.querySelectorAll('[data-toast]').forEach(el=>el.addEventListener('click',event=>{event.preventDefault();toast(el.dataset.toast,'info')}));
  loadSchoolSettings();
  window.addEventListener('student-notifications-ready',event=>{window.__studentNotifications=event.detail||[];if(!document.getElementById('notificationCenter')?.hidden)renderNotifications(window.__studentNotifications)});
  window.addEventListener('school-settings-updated',refreshShellSettings);
  window.addEventListener('load',()=>finishPageLoad(250),{once:true});
  setTimeout(()=>finishPageLoad(150),12000);
}

document.addEventListener('DOMContentLoaded',boot);
