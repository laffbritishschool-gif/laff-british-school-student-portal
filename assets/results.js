import { supabase, escapeHtml } from './app.js';

const esc = escapeHtml;
const byId = id => document.getElementById(id);
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value == null || value === '' ? '—' : String(value); };
const setVisible = (id, visible) => { const el = byId(id); if (el) el.hidden = !visible; };
const displayTerm = value => {
  const raw = String(value || '').replaceAll('_', ' ').trim();
  const key = raw.toUpperCase().replace(/\\s+TERM$/i, '');
  return ({ FIRST: 'First Term', SECOND: 'Second Term', THIRD: 'Third Term' })[key] || (raw ? (/TERM$/i.test(raw) ? raw : raw + ' Term') : 'Term');
};
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const formatScore = value => Number.isInteger(number(value)) ? String(number(value)) : number(value).toFixed(1);
const ordinal = value => {
  const n = Number(value), lastTwo = n % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return n + suffix;
};

let student, school, enrollments = [], selectedEnrollment = null, resultRows = [], gradingRules = [];
let requestVersion = 0;

function state(message, detail = '') {
  const target = byId('resultState');
  if (!target) return;
  target.hidden = false;
  target.innerHTML = '<strong>' + esc(message) + '</strong>' + (detail ? '<span>' + esc(detail) + '</span>' : '');
  setVisible('resultTableWrap', false);
  setVisible('summaryRow', false);
  setVisible('remarks', false);
}

function setLoading(message = 'Loading your result…') {
  const target = byId('resultState');
  if (!target) return;
  target.hidden = false;
  target.innerHTML = '<div class="result-loading" role="status"><span class="spinner" aria-hidden="true"></span><strong>' + esc(message) + '</strong><span>Please wait while we retrieve your published academic record.</span></div>';
  setVisible('resultTableWrap', false);
  setVisible('summaryRow', false);
  setVisible('remarks', false);
}

function setOptions(select, items, placeholder) {
  if (!select) return;
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach(item => select.add(new Option(item.label, item.value)));
  select.disabled = items.length === 0;
}

function updateStudentHeader(className = '—') {
  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Student';
  setText('heroSchoolName', school?.school_name || 'Laff British Montessori School');
  setText('schoolName', school?.school_name || 'Laff British Montessori School');
  setText('heroMotto', school?.motto || 'Excellence · Character · Confidence · Knowledge');
  setText('heroStudent', fullName);
  setText('heroStudentId', student.student_id);
  setText('heroClass', className);
  setText('studentName', fullName);
  setText('studentId', student.student_id);
  setText('studentStatus', student.status || 'ACTIVE');
  setText('examNo', student.exam_number);
  setText('studentGender', student.gender);
  setText('studentDob', student.date_of_birth ? new Date(student.date_of_birth + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const contact = [school?.address, school?.phone].filter(Boolean).join(' · ');
  const emailWeb = [school?.email, school?.website].filter(Boolean).join(' · ');
  setText('schoolContact', [contact, emailWeb].filter(Boolean).join('\n') || 'School contact details');
  const logo = school?.logo_url || 'https://raw.githubusercontent.com/laffbritishschool-gif/Laffbritishmontesorrischool.com/main/assets/school-logo.svg';
  ['heroLogo', 'sheetLogo'].forEach(id => { const image = byId(id); if (image) image.src = logo; });
  const full = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Student';
  setText('shellName', full);
  setText('shellStudentId', student.student_id);
  setText('shellClass', className);
  const avatar = byId('shellAvatar');
  if (avatar) avatar.textContent = full.split(/\\s+/).map(part => part[0] || '').join('').slice(0, 2).toUpperCase() || 'ST';
}

function populateClassChoices() {
  const classSelect = byId('resultClass');
  const sessionSelect = byId('resultSession');
  const classes = new Map();
  enrollments.forEach(enrollment => {
    const item = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
    if (item?.id) classes.set(item.id, item.name || 'Class');
  });
  setOptions(classSelect, [...classes].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })), 'Choose your class');
  setOptions(sessionSelect, [], 'Choose academic session / year');
  if (classes.size) {
    const latest = [...enrollments].sort((a, b) => String(b.academic_sessions?.starts_on || b.created_at || '').localeCompare(String(a.academic_sessions?.starts_on || a.created_at || '')))[0];
    const defaultClass = latest?.class_id || [...classes.keys()][0];
    classSelect.value = defaultClass;
    populateSessionChoices(defaultClass);
  }
}

function populateSessionChoices(classId) {
  const sessionSelect = byId('resultSession');
  const sessions = new Map();
  const classEnrollments = enrollments.filter(item => item.class_id === classId);
  classEnrollments.forEach(item => {
    const session = Array.isArray(item.academic_sessions) ? item.academic_sessions[0] : item.academic_sessions;
    if (item.session_id) sessions.set(item.session_id, session?.name || 'Academic session');
    resultRows.filter(row => row.enrollment_id === item.id).forEach(row => {
      const term = Array.isArray(row.terms) ? row.terms[0] : row.terms;
      const resultSession = Array.isArray(term?.academic_sessions) ? term.academic_sessions[0] : term?.academic_sessions;
      if (term?.session_id) sessions.set(term.session_id, resultSession?.name || 'Academic session');
    });
  });
  const sorted = [...sessions].sort((a, b) => b[1].localeCompare(a[1]));
  setOptions(sessionSelect, sorted.map(([value, label]) => ({ value, label })), 'Choose academic session / year');
  const preferred = classEnrollments.sort((a, b) => String(b.academic_sessions?.starts_on || b.created_at || '').localeCompare(String(a.academic_sessions?.starts_on || a.created_at || '')))[0];
  const latestPublished = resultRows.find(row => classEnrollments.some(item => item.id === row.enrollment_id));
  const latestTerm = latestPublished ? (Array.isArray(latestPublished.terms) ? latestPublished.terms[0] : latestPublished.terms) : null;
  const preferredSession = latestTerm?.session_id || preferred?.session_id;
  if (preferredSession) sessionSelect.value = preferredSession;
  loadSelectedResult();
}

function gradeFor(score) {
  const rule = gradingRules.find(item => score >= number(item.min) && score <= number(item.max));
  return rule?.grade || (score >= 70 ? 'A' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 45 ? 'D' : score >= 40 ? 'E' : 'F');
}

function renderResult(group, rows) {
  const classRow = Array.isArray(group.classes) ? group.classes[0] : group.classes;
  const sessionRow = Array.isArray(group.academic_sessions) ? group.academic_sessions[0] : group.academic_sessions;
  const termRows = rows.map(row => Array.isArray(row.terms) ? row.terms[0] : row.terms).filter(Boolean);
  const term = termRows[0] || {};
  const sessionName = sessionRow?.name || '—';
  const termName = displayTerm(term.name);
  const className = classRow?.name || '—';
  updateStudentHeader(className);
  setText('heroClass', className);
  setText('heroSessionTerm', sessionName + ' · ' + termName);
  setText('className', className);
  setText('sessionName', sessionName);
  setText('termName', termName);
  setText('resultStatus', 'Published');
  setText('reportSession', sessionName + ' Academic Session');
  setText('reportTerm', termName);

  const totalScore = rows.reduce((sum, row) => sum + (row.total == null ? number(row.ca_score) + number(row.exam_score) : number(row.total)), 0);
  const average = rows.length ? totalScore / rows.length : 0;
  const overallGrade = gradeFor(average);
  const positions = rows.map(row => number(row.position)).filter(value => value > 0);
  const settings = school?.result_settings || {};
  const showPosition = settings.show_position !== false;
  const points = rows.reduce((sum, row) => sum + number(row.grade_point), 0);

  setText('subjectsCount', rows.length);
  setText('totalScore', formatScore(totalScore));
  setText('average', average.toFixed(1) + '%');
  setText('overallGrade', overallGrade);
  setText('position', showPosition && positions.length ? ordinal(Math.min(...positions)) : (showPosition ? '—' : 'Not displayed'));
  setText('gradePoints', points.toFixed(1));
  const positionBox = byId('position')?.closest('.summary-box');
  if (positionBox) positionBox.hidden = !showPosition;

  const teacherRemarks = [...new Set(rows.map(row => row.teacher_remark).filter(Boolean))];
  const principalRemarks = [...new Set(rows.map(row => row.principal_remark).filter(Boolean))];
  setText('teacherRemark', teacherRemarks[0] || '—');
  setText('principalRemark', principalRemarks[0] || '—');

  const body = byId('resultBody');
  if (body) body.innerHTML = rows.map((row, index) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    const ca = number(row.ca_score), exam = number(row.exam_score);
    const total = row.total == null ? ca + exam : number(row.total);
    const grade = row.grade || gradeFor(total);
    const caMax = subject?.max_ca ?? 30, examMax = subject?.max_exam ?? 70;
    const gradeClass = grade === 'A' ? 'grade-a' : grade === 'B' ? 'grade-b' : grade === 'C' ? 'grade-c' : '';
    return '<tr><td>' + (index + 1) + '</td><td><b>' + esc(subject?.name || 'Subject') + '</b></td><td>' + esc(subject?.code || '—') + '</td><td>' + formatScore(ca) + ' / ' + formatScore(caMax) + '</td><td>' + formatScore(exam) + ' / ' + formatScore(examMax) + '</td><td><b>' + formatScore(total) + '</b></td><td><span class="grade ' + gradeClass + '">' + esc(grade) + '</span></td><td>' + esc(row.grade_point ?? '—') + '</td><td>' + esc(row.teacher_remark || row.principal_remark || '—') + '</td></tr>';
  }).join('');
  setVisible('resultTableWrap', true);
  setVisible('summaryRow', true);
  setVisible('remarks', true);
  byId('resultState').hidden = true;
  const printButton = byId('printResult');
  if (printButton) printButton.disabled = false;
}

async function loadSelectedResult() {
  const version = ++requestVersion;
  const classId = byId('resultClass')?.value;
  const sessionId = byId('resultSession')?.value;
  const termSelect = byId('resultTerm');
  if (!classId || !sessionId) {
    setOptions(termSelect, [], 'Choose a term');
    state('Choose your class and academic session', 'Select the class and school year to look up your published result.');
    return;
  }
  const classEnrollments = enrollments.filter(item => item.class_id === classId);
  selectedEnrollment = classEnrollments.find(item => item.session_id === sessionId && resultRows.some(row => row.enrollment_id === item.id && (Array.isArray(row.terms) ? row.terms[0] : row.terms)?.session_id === sessionId))
    || classEnrollments.find(item => resultRows.some(row => row.enrollment_id === item.id && (Array.isArray(row.terms) ? row.terms[0] : row.terms)?.session_id === sessionId))
    || classEnrollments.find(item => item.session_id === sessionId);
  if (!selectedEnrollment) {
    state('No class enrolment found', 'Please contact the school office if this class and session should be listed.');
    return;
  }
  const classRow = Array.isArray(selectedEnrollment.classes) ? selectedEnrollment.classes[0] : selectedEnrollment.classes;
  updateStudentHeader(classRow?.name || '—');
  setLoading('Finding your published result…');
  if (byId('printResult')) byId('printResult').disabled = true;
  try {
    if (version !== requestVersion) return;
    const matchingRows = resultRows.filter(row => {
      const term = Array.isArray(row.terms) ? row.terms[0] : row.terms;
      return row.enrollment_id === selectedEnrollment.id && term?.session_id === sessionId;
    }).sort((a, b) => String(a.subject_id).localeCompare(String(b.subject_id)));
    const groups = new Map();
    matchingRows.forEach(row => {
      if (!groups.has(row.term_id)) groups.set(row.term_id, []);
      groups.get(row.term_id).push(row);
    });
    const termChoices = [...groups.entries()].map(([id, rows]) => {
      const term = Array.isArray(rows[0].terms) ? rows[0].terms[0] : rows[0].terms;
      return { value: id, label: displayTerm(term?.name) };
    }).sort((a, b) => a.label.localeCompare(b.label));
    setOptions(termSelect, termChoices, termChoices.length ? 'Choose term' : 'No published terms');
    if (!termChoices.length) {
      state('No published result for this selection', 'There is no published result for ' + (classRow?.name || 'this class') + ' in ' + (selectedEnrollment.academic_sessions?.name || 'the selected session') + ' yet.');
      return;
    }
    termSelect.value = termChoices[termChoices.length - 1].value;
    renderResult(selectedEnrollment, groups.get(termSelect.value));
    termSelect.onchange = () => {
      const rows = groups.get(termSelect.value);
      if (rows?.length) renderResult(selectedEnrollment, rows);
    };
  } catch (error) {
    if (version !== requestVersion) return;
    console.error('Student result query failed:', error);
    state('Results could not be loaded', error.message || 'Please try again. If this continues, contact the school office.');
  }
}

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { location.replace('/student-login'); return; }
    const uid = session.user.id;
    const studentResponse = await supabase.from('students')
      .select('id,student_id,first_name,middle_name,last_name,photo_url,school_email,exam_number,status,gender,date_of_birth')
      .eq('user_id', uid).maybeSingle();
    if (studentResponse.error) throw studentResponse.error;
    student = studentResponse.data;
    if (!student) throw new Error('Your student profile is not available. Please contact the school.');
    const [schoolResponse, enrollmentResponse] = await Promise.all([
      supabase.from('school_settings').select('school_name,motto,logo_url,address,phone,email,website,grading_rules,result_settings').limit(1).maybeSingle(),
      supabase.from('enrollments').select('id,student_id,class_id,session_id,status,created_at,classes(id,name),academic_sessions(id,name,starts_on)').eq('student_id', student.id).order('created_at', { ascending: false })
    ]);
    if (schoolResponse.error) throw schoolResponse.error;
    if (enrollmentResponse.error) throw enrollmentResponse.error;
    school = schoolResponse.data;
    enrollments = enrollmentResponse.data || [];
    if (enrollments.length) {
      const resultResponse = await supabase.from('results')
        .select('id,enrollment_id,subject_id,term_id,ca_score,exam_score,total,grade,grade_point,teacher_remark,principal_remark,position,status,subjects(name,code,max_ca,max_exam),terms(id,name,session_id,academic_sessions(name,starts_on))')
        .in('enrollment_id', enrollments.map(item => item.id))
        .eq('status', 'PUBLISHED')
        .order('subject_id', { ascending: true });
      if (resultResponse.error) throw resultResponse.error;
      resultRows = resultResponse.data || [];
    }
    gradingRules = Array.isArray(school?.grading_rules) ? school.grading_rules : [];
    if (!enrollments.length) {
      updateStudentHeader();
      state('No class enrolment found', 'Your class history is not available yet. Please contact the school office.');
      return;
    }
    updateStudentHeader();
    populateClassChoices();
    byId('resultClass')?.addEventListener('change', event => populateSessionChoices(event.target.value));
    byId('resultSession')?.addEventListener('change', loadSelectedResult);
    byId('printResult')?.addEventListener('click', () => window.print());
  } catch (error) {
    console.error('Student results initialization failed:', error);
    state('Results could not be loaded', error.message || 'Please sign in again or contact the school office.');
  }
}

init();
