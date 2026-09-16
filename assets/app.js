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
  primary_color: '#0755a5',
  secondary_color: '#f7c928',
  ui_settings: { navigation: 'sidebar', theme: 'light', compact_sidebar: false, show_breadcrumbs: true }
};

const STUDENT_NAV = [
  ['index.html','Dashboard','⌂'],
  ['student-profile.html','My Profile','♙'],
  ['student-results.html','Results','▥'],
  ['student-attendance.html','Attendance','✓'],
  ['student-timetable.html','Timetable','□'],
  ['student-announcements.html','Announcements','♢'],
  ['student-fees.html','Fees & Payments','₦'],
  ['id-card.html','My ID Card','▣']
];

export function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char] || char));
}

export function toast(message, type='success') {
  let host = document.querySelector('#toast-host');
  if (!host) { host = document.createElement('div'); host.id = 'toast-host'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 3000);
}

export function pageLoading(show=true) {
  const loader = document.querySelector('#page-loader, #portalPageLoader');
  document.body.classList.toggle('is-loading', show);
  loader?.classList.toggle('hide', !show);
}

function mergeSettings(raw={}) {
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

function injectSharedSidebarStyles() {
  if (document.getElementById('student-admin-sidebar-style')) return;
  const style = document.createElement('style');
  style.id = 'student-admin-sidebar-style';
  style.textContent = `
    .sidebar.student-shared-sidebar{
      position:fixed;inset:0 auto 0 0;width:260px;background:#fff;color:#14213d;
      border-right:1px solid var(--line,#e6eaf0);padding:20px 14px;display:flex;flex-direction:column;
      z-index:200;box-shadow:0 8px 28px rgba(19,43,88,.06);transition:width .28s cubic-bezier(.2,.8,.2,1),transform .28s ease;
      overflow:hidden;
    }
    .student-shared-sidebar .brand{display:flex;align-items:center;gap:10px;padding:5px 10px 22px;white-space:nowrap;border-bottom:0;height:auto}
    .student-shared-sidebar .brand img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:none;flex:none}
    .student-shared-sidebar .brand strong{display:block;color:#14213d;font-size:14px;line-height:1.2}
    .student-shared-sidebar .brand small{display:block;color:#667085;font-size:11px;margin-top:2px}
    .student-shared-sidebar .nav{display:grid;gap:4px;overflow:auto;margin-top:0}
    .student-shared-sidebar .nav a{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:11px;color:#526078;font-size:13px;font-weight:600;margin:0;white-space:nowrap;transition:.2s;transform:none}
    .student-shared-sidebar .nav a:hover{background:#f0f5ff;color:var(--blue,#123d8f);transform:translateX(2px)}
    .student-shared-sidebar .nav a.active{background:#eaf1ff;color:var(--blue,#123d8f);box-shadow:inset 3px 0 var(--blue,#123d8f)}
    .student-shared-sidebar .ico{width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;font-size:17px}
    .student-shared-sidebar .logout{margin-top:auto!important;background:#fff1f1!important;color:#c62828!important;border:0;cursor:pointer}
    .student-sidebar-toggle{position:absolute;right:0;top:20px;width:32px;height:34px;border:0;border-radius:9px 0 0 9px;background:var(--yellow,#f4c400);color:#123d8f;font-size:19px;font-weight:900;cursor:pointer;z-index:205}
    body.collapsed .student-shared-sidebar{width:82px;padding:16px 9px}
    body.collapsed .student-shared-sidebar .brand{justify-content:center;padding:4px 0 20px}
    body.collapsed .student-shared-sidebar .brand div{display:none}
    body.collapsed .student-shared-sidebar .nav a{justify-content:center;padding:12px 8px}
    body.collapsed .student-shared-sidebar .nav a span:not(.ico){display:none}
    body.collapsed .student-shared-sidebar .logout span:not(.ico){display:none}
    body.collapsed .student-shared-sidebar .student-sidebar-toggle{transform:rotate(180deg)}
    body.collapsed .main{margin-left:82px;width:calc(100% - 82px)}
    .student-mobile-menu{display:none}
    .student-sidebar-scrim{display:none}
    body.school-dark .student-shared-sidebar{background:#131d2d;color:#edf3ff;border-color:#26334b}
    body.school-dark .student-shared-sidebar .brand strong{color:#edf3ff}
    body.school-dark .student-shared-sidebar .brand small{color:#9eacc4}
    body.school-dark .student-shared-sidebar .nav a{color:#b8c4d8}
    body.school-dark .student-shared-sidebar .nav a:hover{background:#1a2940;color:#fff}
    body.school-dark .student-shared-sidebar .nav a.active{background:#1b3153;color:#fff}
    @media(max-width:760px){
      .sidebar.student-shared-sidebar{width:260px;transform:translateX(-102%);box-shadow:14px 0 40px rgba(19,43,88,.16)}
      body.student-sidebar-open .sidebar.student-shared-sidebar{transform:translateX(0)}
      body.student-sidebar-open .student-sidebar-scrim{display:block;position:fixed;inset:0;background:rgba(3,28,53,.35);z-index:190}
      body.collapsed .sidebar.student-shared-sidebar{width:260px;padding:20px 14px;transform:translateX(-102%)}
      body.collapsed.student-sidebar-open .sidebar.student-shared-sidebar{transform:translateX(0)}
      body.collapsed .student-shared-sidebar .brand div,.student-shared-sidebar .brand div{display:block}
      body.collapsed .student-shared-sidebar .nav a{justify-content:flex-start;padding:11px 12px}
      body.collapsed .student-shared-sidebar .nav a span:not(.ico),body.collapsed .student-shared-sidebar .logout span:not(.ico){display:inline}
      body.collapsed .student-shared-sidebar .student-sidebar-toggle{transform:none}
      .student-mobile-menu{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--border,#e6eaf0);border-radius:11px;background:#fff;color:#123d8f;cursor:pointer;flex:none}
      .top{align-items:flex-start}
    }
  `;
  document.head.appendChild(style);
}

function applySettingsToDom(settings) {
  const s = mergeSettings(settings);
  document.documentElement.style.setProperty('--school-primary', s.primary_color || DEFAULT_SCHOOL_SETTINGS.primary_color);
  document.documentElement.style.setProperty('--school-secondary', s.secondary_color || DEFAULT_SCHOOL_SETTINGS.secondary_color);
  document.documentElement.style.setProperty('--portal-blue', s.primary_color || DEFAULT_SCHOOL_SETTINGS.primary_color);
  document.documentElement.style.setProperty('--portal-yellow', s.secondary_color || DEFAULT_SCHOOL_SETTINGS.secondary_color);
  document.body.classList.toggle('school-dark', s.ui_settings.theme === 'dark');
  document.body.classList.toggle('nav-header', s.ui_settings.navigation === 'header');
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

function initialsFromStudent(student) {
  return `${student?.first_name?.[0] || ''}${student?.last_name?.[0] || ''}`.toUpperCase() || 'ST';
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

export function finishPageLoad(delay=180) {
  setTimeout(() => window.__portalLoader?.classList.add('hide'), delay);
}

function normalizeSidebar() {
  injectSharedSidebarStyles();
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.dataset.sharedStudentSidebar === '1') return;
  sidebar.dataset.sharedStudentSidebar = '1';
  sidebar.classList.add('student-shared-sidebar');
  const current = location.pathname.split('/').pop() || 'index.html';
  const active = STUDENT_NAV.findIndex(item => item[0] === current);
  sidebar.innerHTML = `<button class="student-sidebar-toggle" id="toggle" aria-label="Collapse sidebar">‹</button><div class="brand"><img src="${escapeHtml(getCachedSchoolSettings().logo_url)}" alt="School logo"><div><strong>${escapeHtml(getCachedSchoolSettings().school_name)}</strong><small>Student Portal</small></div></div><nav class="nav" aria-label="Student portal navigation">${STUDENT_NAV.map((item,index)=>`<a class="${index===active?'active':''}" href="${item[0]}"><span class="ico">${item[2]}</span><span>${item[1]}</span></a>`).join('')}<a class="logout" href="#"><span class="ico">↪</span><span>Sign Out</span></a></nav>`;
  let scrim = document.querySelector('.student-sidebar-scrim');
  if (!scrim) { scrim = document.createElement('div'); scrim.className = 'student-sidebar-scrim'; document.body.appendChild(scrim); }
  let mobileMenu = document.querySelector('.student-mobile-menu');
  const top = document.querySelector('.top');
  if (top && !top.querySelector('.student-mobile-menu')) {
    mobileMenu = document.createElement('button');
    mobileMenu.className = 'student-mobile-menu';
    mobileMenu.type = 'button';
    mobileMenu.setAttribute('aria-label','Open navigation');
    mobileMenu.innerHTML = '☰';
    top.prepend(mobileMenu);
  }
  const toggle = sidebar.querySelector('#toggle');
  const closeMobile = () => document.body.classList.remove('student-sidebar-open');
  toggle?.addEventListener('click', () => {
    if (window.innerWidth <= 760) closeMobile();
    else {
      document.body.classList.toggle('collapsed');
      localStorage.setItem(SIDEBAR_KEY, document.body.classList.contains('collapsed') ? '1' : '0');
    }
  });
  mobileMenu?.addEventListener('click', () => document.body.classList.toggle('student-sidebar-open'));
  scrim.addEventListener('click', closeMobile, { once:false });
  sidebar.querySelectorAll('nav a').forEach(link => link.addEventListener('click', closeMobile));
  sidebar.querySelector('.logout')?.addEventListener('click', event => { event.preventDefault(); signOut(); });
  if (localStorage.getItem(SIDEBAR_KEY) === '1' && window.innerWidth > 760) document.body.classList.add('collapsed');
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

function renderNotifications(items=[]) {
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
  const menu = document.createElement('div');
  menu.id = 'profileMenu'; menu.className = 'profile-menu';
  menu.innerHTML = `<a href="student-profile.html"><span>♙</span><div><b>My Profile</b><small>View your student information</small></div></a><button type="button" class="profile-logout"><span>↪</span><div><b>Logout</b><small>Sign out of this account</small></div></button>`;
  chip.parentElement.style.position = 'relative'; chip.parentElement.appendChild(menu);
  const toggle = () => { const open = menu.classList.toggle('show'); chip.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  chip.addEventListener('click', toggle);
  chip.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } if (event.key === 'Escape') menu.classList.remove('show'); });
  menu.querySelector('.profile-logout').addEventListener('click', signOut);
  document.addEventListener('click', event => { if (!chip.parentElement.contains(event.target)) menu.classList.remove('show'); });
}

async function signOut() {
  try { await supabase.auth.signOut(); }
  finally { location.href = 'student-login.html'; }
}
window.signOut = signOut;
export { signOut };

export function mountStudentShell({ title='Student Portal', subtitle='', content='' }={}) {
  const app = document.querySelector('#student-app, #app');
  if (!app) return;
  const settings = getCachedSchoolSettings();
  app.innerHTML = `<div class="app"><aside class="sidebar" aria-label="Student portal navigation"></aside><main class="main"><header class="top"><div><div class="eyebrow">STUDENT PORTAL</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="top-actions"><button class="icon-btn" id="notificationBell" aria-label="Notifications">♢<span class="dot"></span></button><div class="profile-chip"><div class="avatar" id="shellAvatar">ST</div><div><b id="shellName">Student</b><div class="muted"><span id="shellStudentId">—</span> · <span id="shellClass">—</span></div></div></div></div></header>${content}</main></div><div class="toast"></div>`;
  normalizeSidebar();
  ensureNotificationCenter(); ensureProfileMenu();
  document.getElementById('notificationBell')?.addEventListener('click', openNotificationCenter);
  loadSchoolSettings();
}

async function hydrateShellStudent() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.href = 'student-login.html'; return null; }
  const { data: student, error } = await supabase.from('students').select('id,student_id,first_name,middle_name,last_name,photo_url,status').eq('user_id', session.user.id).maybeSingle();
  if (error || !student) return null;
  const { data: enrollment } = await supabase.from('enrollments').select('status,classes(name),session_id').eq('student_id', student.id).eq('status','ACTIVE').order('created_at',{ascending:false}).limit(1).maybeSingle();
  const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student';
  document.getElementById('shellName')?.replaceChildren(document.createTextNode(name));
  document.getElementById('shellStudentId')?.replaceChildren(document.createTextNode(student.student_id || '—'));
  document.getElementById('shellClass')?.replaceChildren(document.createTextNode(enrollment?.classes?.name || 'Class —'));
  const avatar = document.getElementById('shellAvatar');
  if (avatar) {
    if (student.photo_url) avatar.innerHTML = `<img src="${escapeHtml(student.photo_url)}" alt="Student passport photograph">`;
    else avatar.textContent = initialsFromStudent(student);
  }
  return student;
}

function boot() {
  if (document.body.classList.contains('login-page')) return;
  setupLoader();
  normalizeSidebar();
  ensureNotificationCenter();
  ensureProfileMenu();
  document.getElementById('notificationBell')?.addEventListener('click', openNotificationCenter);
  document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); toast(el.dataset.toast, 'info'); }));
  window.addEventListener('student-notifications-ready', event => {
    window.__studentNotifications = event.detail || [];
    if (!document.getElementById('notificationCenter')?.hidden) renderNotifications(window.__studentNotifications);
  });
  loadSchoolSettings();
}

document.addEventListener('DOMContentLoaded', boot);
