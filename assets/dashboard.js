import { supabase } from './supabase.js';

const esc = (v = '') => String(v).replace(/[&<>'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value ?? '—'; };
const setHtml = (id, value) => { const el = document.getElementById(id); if (el) el.innerHTML = value; };
const setProgress = (id, value) => {
  const el = document.getElementById(id);
  if (el) requestAnimationFrame(() => { el.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`; });
};
const firstName = student => student?.first_name || 'Student';
const fullName = student => [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(' ') || 'Student';
const initials = student => `${student?.first_name?.[0] || ''}${student?.last_name?.[0] || ''}`.toUpperCase() || 'ST';

function animateValue(id, end, { suffix = '', prefix = '', duration = 700, decimals = 0 } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = Number(end) || 0;
  const start = performance.now();
  const frame = now => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = target * eased;
    el.textContent = prefix + (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-NG')) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function storagePathFromPhoto(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const marker = '/student-passports/';
    const at = url.pathname.indexOf(marker);
    if (at >= 0) return decodeURIComponent(url.pathname.slice(at + marker.length));
  } catch {}
  return null;
}

async function getStudentPhotoUrl(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const path = storagePathFromPhoto(raw);
  if (!path) return raw;
  try {
    const { data, error } = await supabase.storage.from('student-passports').createSignedUrl(path, 60 * 60 * 6);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (error) {
    console.warn('Student passport signing failed', error);
  }
  return null;
}

function applyAvatar(id, url, student) {
  const el = document.getElementById(id);
  if (!el) return;
  const fallback = initials(student);
  if (!url) {
    el.textContent = fallback;
    return;
  }
  el.innerHTML = `<img src="${esc(url)}" alt="Student passport photograph" loading="eager" decoding="async">`;
  el.querySelector('img')?.addEventListener('error', () => { el.textContent = fallback; }, { once: true });
}

function normalizeRow(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatTerm(value) {
  return String(value || '—').replaceAll('_', ' ');
}

function money(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadDashboard() {
  const loading = document.getElementById('dashboardLoading');
  const content = document.getElementById('dashboardContent');

  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    const session = authData?.session;
    if (!session) {
      location.href = 'student-login.html';
      return;
    }

    const uid = session.user.id;

    const [studentRes, schoolRes, sessionRes, termRes, announcementRes] = await Promise.all([
      supabase.from('students').select('id,student_id,first_name,middle_name,last_name,photo_url,school_email,status').eq('user_id', uid).maybeSingle(),
      supabase.from('school_settings').select('school_name,motto,logo_url,address,phone,email,website').limit(1).maybeSingle(),
      supabase.from('academic_sessions').select('id,name,starts_on,ends_on').eq('is_current', true).order('starts_on', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('terms').select('id,name,session_id,starts_on,ends_on').eq('is_current', true).order('starts_on', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('announcements').select('id,title,body,published_at,created_at').eq('published', true).order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(12)
    ]);

    if (studentRes.error) throw studentRes.error;
    const student = studentRes.data;
    if (!student) throw new Error('Your student profile has not been created yet. Please contact the school administrator.');

    const school = schoolRes.data || null;
    const currentSession = normalizeRow(sessionRes.data);
    const currentTerm = normalizeRow(termRes.data);
    const announcements = announcementRes.data || [];

    // Enrollment drives the academic, attendance and fee records shown on this dashboard.
    let enrollment = null;
    if (currentSession?.id) {
      const enrollmentRes = await supabase
        .from('enrollments')
        .select('id,class_id,status,created_at,classes(name)')
        .eq('student_id', student.id)
        .eq('session_id', currentSession.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!enrollmentRes.error) enrollment = enrollmentRes.data;
    }

    const className = enrollment?.classes?.name || 'Class not assigned';

    const [resultsRes, attendanceRes, feesRes, paymentsRes] = await Promise.all([
      enrollment?.id && currentTerm?.id
        ? supabase.from('results').select('id,subject_id,ca_score,exam_score,total,grade,grade_point,teacher_remark,subjects(name)').eq('enrollment_id', enrollment.id).eq('term_id', currentTerm.id).eq('status', 'PUBLISHED').order('total', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      enrollment?.id
        ? supabase.from('attendance').select('id,date,status,remark').eq('enrollment_id', enrollment.id).order('date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      currentSession?.id
        ? supabase.from('fees').select('id,title,amount,due_date,status,description').eq('student_id', student.id).eq('session_id', currentSession.id).order('due_date', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('payments').select('id,amount,status,paid_at,created_at').eq('student_id', student.id).eq('status', 'PAID').order('paid_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    ]);

    const results = resultsRes.data || [];
    const attendance = attendanceRes.data || [];
    const fees = feesRes.data || [];
    const payments = paymentsRes.data || [];

    const present = attendance.filter(row => String(row.status || '').toUpperCase() === 'PRESENT').length;
    const late = attendance.filter(row => String(row.status || '').toUpperCase() === 'LATE').length;
    const absent = attendance.filter(row => String(row.status || '').toUpperCase() === 'ABSENT').length;
    const excused = attendance.filter(row => ['EXCUSED', 'HOLIDAY'].includes(String(row.status || '').toUpperCase())).length;
    const trackedAttendance = present + late + absent;
    const attendancePct = trackedAttendance ? Math.round(((present + late * 0.5) / trackedAttendance) * 100) : 0;
    const average = results.length ? Math.round(results.reduce((sum, row) => sum + Number(row.total || 0), 0) / results.length) : 0;
    const totalFees = fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const balance = Math.max(totalFees - paid, 0);

    // Header / hero information.
    const name = fullName(student);
    set('shellAvatar', initials(student));
    set('shellName', name);
    set('shellStudentId', student.student_id || '—');
    set('shellClass', className);
    set('heroStudentName', name);
    set('heroStudentClass', className);
    set('heroStudentId', student.student_id || '—');
    set('sessionName', currentSession?.name || '—');
    set('termName', formatTerm(currentTerm?.name));
    set('studentStatus', student.status || 'ACTIVE');
    set('schoolName', school?.school_name || 'Laff British Montessori School');
    set('schoolMotto', school?.motto || 'Learning · Character · Excellence');

    const photoUrl = await getStudentPhotoUrl(student.photo_url);
    applyAvatar('shellAvatar', photoUrl, student);
    applyAvatar('heroAvatar', photoUrl, student);

    // Academic snapshot.
    setHtml('resultList', results.slice(0, 6).map(row => `
      <div class="dash-row">
        <div>
          <b>${esc(row.subjects?.name || 'Subject')}</b>
          <span class="muted">CA ${Number(row.ca_score || 0)} · Exam ${Number(row.exam_score || 0)} · Total ${Number(row.total || 0)}</span>
        </div>
        <span class="grade-badge">${esc(row.grade || '—')}</span>
      </div>`).join('') || '<div class="empty">No published results are available for this term yet.</div>');

    // Announcements / notifications.
    setHtml('noticeList', announcements.slice(0, 5).map(item => {
      const date = item.published_at || item.created_at;
      return `<article class="notice-item"><span class="notice-icon">◆</span><div><b>${esc(item.title)}</b><p>${esc((item.body || '').slice(0, 150))}${(item.body || '').length > 150 ? '…' : ''}</p><small>${date ? new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small></div></article>`;
    }).join('') || '<div class="empty">No new announcements.</div>');
    window.__studentNotifications = announcements;
    window.dispatchEvent(new CustomEvent('student-notifications-ready', { detail: announcements }));

    // Attendance / finance.
    setHtml('attendanceBreakdown', `
      <div><b>${present}</b><span>Present</span></div>
      <div><b>${absent}</b><span>Absent</span></div>
      <div><b>${late}</b><span>Late</span></div>`);

    set('balanceLabel', balance > 0 ? `${money(balance)} outstanding` : 'No outstanding balance');
    animateValue('subjectsCount', results.length, { duration: 650 });
    animateValue('attendancePct', attendancePct, { suffix: '%', duration: 800 });
    animateValue('averagePct', average, { suffix: '%', duration: 850 });
    animateValue('balance', balance, { prefix: '₦', duration: 900, decimals: 2 });
    set('pulseAttendance', `${attendancePct}%`);
    set('pulseAverage', `${average}%`);
    set('pulseSubjects', `${results.length} subject${results.length === 1 ? '' : 's'}`);
    setProgress('attendanceProgress', attendancePct);
    setProgress('averageProgress', average);
    setProgress('subjectsProgress', Math.min(results.length * 10, 100));

    // Reveal the complete dashboard only after the dashboard data has been bound.
    if (content) content.hidden = false;
    loading?.remove();
    window.dispatchEvent(new CustomEvent('dashboard-ready'));
  } catch (error) {
    console.error('Student dashboard load failed:', error);
    if (loading) {
      loading.className = 'dashboard-error';
      loading.innerHTML = `<strong>Dashboard could not load</strong><p>${esc(error?.message || 'Please try again shortly.')}</p><button class="button" type="button" onclick="location.reload()">Try Again</button>`;
    }
    window.dispatchEvent(new CustomEvent('dashboard-ready'));
  }
}

loadDashboard();
