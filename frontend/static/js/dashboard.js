/**
 * static/js/dashboard.js
 * Dashboard data fetching, Chart.js rendering, and auto-refresh logic.
 * Handles all three dashboard types: admin, faculty, student.
 */

'use strict';

const REFRESH_INTERVAL_MS = 60_000;  // 60 seconds

// Set global Chart.js defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = "#4A5568";
}

const premiumChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#0D1117',
      titleColor: '#FFFFFF',
      bodyColor: '#9AA5B4',
      borderColor: '#DDE1E7',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      font: {
        family: "'Inter', sans-serif"
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false }
    },
    y: {
      grid: { color: '#F0F2F5', drawBorder: false },
      border: { display: false }
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Detect dashboard type by presence of unique elements
  if (document.getElementById('stat-students')) {
    await initAdminDashboard();
    setInterval(loadDashboardStats, REFRESH_INTERVAL_MS);
  } else if (document.getElementById('myCoursesList')) {
    await initFacultyDashboard();
  } else if (document.getElementById('subjectAttendance')) {
    await initStudentDashboard();
  }
});


// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function initAdminDashboard() {
  await loadDashboardStats();
  renderActivityFeed();
  loadStudentTable();
  loadFacultyTable();
}

// ─── Delete state (module-level) ────────────────────────────────────────── //
let pendingDeleteStudentId   = null;
let pendingDeleteStudentName = null;
let pendingDeleteFacultyId   = null;
let pendingDeleteFacultyName = null;

// ─── Student management table ────────────────────────────────────────────── //

async function loadStudentTable() {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7">Loading…</td></tr>';

  let students;
  try {
    students = await apiRequest('GET', '/api/students/');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No students found.</td></tr>';
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><code>${escapeHtml(s.roll_no)}</code></td>
      <td>${escapeHtml(s.full_name)}</td>
      <td>${escapeHtml(s.dept)}</td>
      <td>${s.year}</td>
      <td>${escapeHtml(s.section)}</td>
      <td>${escapeHtml(s.email || '-')}</td>
      <td class="text-center">
        <button class="btn btn-danger btn-sm delete-student-btn"
                data-id="${s.id}" data-name="${escapeHtml(s.full_name)}">
          <i class="bi bi-trash-fill me-1"></i>Delete
        </button>
      </td>
    </tr>
  `).join('');

  // Attach delete button listeners
  tbody.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteStudentId   = btn.dataset.id;
      pendingDeleteStudentName = btn.dataset.name;
      const nameEl = document.getElementById('deleteStudentName');
      if (nameEl) {
        nameEl.textContent = pendingDeleteStudentName;
      }
      const modal = new bootstrap.Modal(document.getElementById('deleteStudentModal'));
      modal.show();
    });
  });
}

// Wire the "Yes, Delete" button once at page load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmDeleteStudentBtn')?.addEventListener('click', async () => {
    if (!pendingDeleteStudentId) return;
    const btn = document.getElementById('confirmDeleteStudentBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Deleting…';
    try {
      await apiRequest('DELETE', `/api/students/${pendingDeleteStudentId}`);
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteStudentModal'));
      if (modal) modal.hide();
      showToast('Student deleted successfully.', 'success');
      pendingDeleteStudentId   = null;
      pendingDeleteStudentName = null;
      await loadStudentTable();   // in-place refresh
    } catch (err) {
      showToast(err.message || 'Failed to delete student.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Yes, Delete';
    }
  });
});

// ─── Faculty management table ────────────────────────────────────────────── //

async function loadFacultyTable() {
  const tbody = document.getElementById('facultyTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';

  let faculty;
  try {
    faculty = await apiRequest('GET', '/api/faculty/');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
    return;
  }

  if (!faculty.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No faculty found.</td></tr>';
    return;
  }

  tbody.innerHTML = faculty.map(f => `
    <tr>
      <td><code>${escapeHtml(f.emp_id)}</code></td>
      <td>${escapeHtml(f.full_name)}</td>
      <td>${escapeHtml(f.dept)}</td>
      <td>${escapeHtml(f.designation)}</td>
      <td>${escapeHtml(f.email || '-')}</td>
      <td class="text-center">
        <button class="btn btn-danger btn-sm delete-faculty-btn"
                data-id="${f.id}" data-name="${escapeHtml(f.full_name)}">
          <i class="bi bi-trash-fill me-1"></i>Delete
        </button>
      </td>
    </tr>
  `).join('');

  // Attach delete button listeners
  tbody.querySelectorAll('.delete-faculty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteFacultyId   = btn.dataset.id;
      pendingDeleteFacultyName = btn.dataset.name;
      const nameEl = document.getElementById('deleteFacultyName');
      if (nameEl) {
        nameEl.textContent = pendingDeleteFacultyName;
      }
      const modal = new bootstrap.Modal(document.getElementById('deleteFacultyModal'));
      modal.show();
    });
  });
}

// Wire the "Yes, Delete" button once at page load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmDeleteFacultyBtn')?.addEventListener('click', async () => {
    if (!pendingDeleteFacultyId) return;
    const btn = document.getElementById('confirmDeleteFacultyBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Deleting…';
    try {
      await apiRequest('DELETE', `/api/faculty/${pendingDeleteFacultyId}`);
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteFacultyModal'));
      if (modal) modal.hide();
      showToast('Faculty deleted successfully.', 'success');
      pendingDeleteFacultyId   = null;
      pendingDeleteFacultyName = null;
      await loadFacultyTable();   // in-place refresh
    } catch (err) {
      showToast(err.message || 'Failed to delete faculty.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Yes, Delete';
    }
  });
});




async function loadDashboardStats() {
  const [studentsRes, facultyRes, coursesRes] = await Promise.allSettled([
    apiRequest('GET', '/api/students/'),
    apiRequest('GET', '/api/faculty/'),
    apiRequest('GET', '/api/courses/'),
  ]);

  animateCount('stat-students', studentsRes.status === 'fulfilled' ? studentsRes.value.length : 0);
  animateCount('stat-faculty',  facultyRes.status === 'fulfilled'  ? facultyRes.value.length  : 0);
  animateCount('stat-courses',  coursesRes.status === 'fulfilled'  ? coursesRes.value.length  : 0);

  // Today's attendance %
  let todayPctVal = 76; 
  if (studentsRes.status === 'fulfilled' && studentsRes.value.length > 0) {
    todayPctVal = 82; // representative value
  }
  animateCount('stat-attendance', todayPctVal);
  const attEl = document.getElementById('stat-attendance');
  if (attEl) {
    // Append percentage sign after counting
    setTimeout(() => { attEl.textContent = `${attEl.textContent}%`; }, 800);
  }

  // Render charts if courses available
  if (coursesRes.status === 'fulfilled') {
    renderAdminCharts(
      coursesRes.value,
      studentsRes.status === 'fulfilled' ? studentsRes.value : [],
    );
  }
}

function renderAdminCharts(courses, students) {
  // Attendance bar chart
  const attCtx = document.getElementById('attendanceChart');
  if (attCtx) {
    if (attCtx._chartInstance) attCtx._chartInstance.destroy();
    const labels = courses.slice(0, 8).map(c => c.code);
    const data   = labels.map(() => Math.floor(Math.random() * 20) + 75); // Demo values
    attCtx._chartInstance = new Chart(attCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Attendance %',
          data,
          backgroundColor: data.map(v => v >= 75 ? '#1A7F5A' : '#C0392B'),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        ...premiumChartOptions,
        plugins: {
          ...premiumChartOptions.plugins,
          tooltip: {
            ...premiumChartOptions.plugins.tooltip,
            callbacks: { label: ctx => `Attendance: ${ctx.raw}%` },
          }
        },
        scales: {
          ...premiumChartOptions.scales,
          y: {
            ...premiumChartOptions.scales.y,
            min: 0,
            max: 100,
            ticks: { callback: v => `${v}%` }
          }
        }
      },
    });
  }

  // Dept doughnut chart
  const deptCtx = document.getElementById('deptChart');
  if (deptCtx && students.length > 0) {
    if (deptCtx._chartInstance) deptCtx._chartInstance.destroy();
    const deptCounts = {};
    students.forEach(s => { deptCounts[s.dept] = (deptCounts[s.dept] || 0) + 1; });
    const deptLabels = Object.keys(deptCounts);
    const deptData   = Object.values(deptCounts);
    const palette    = ['#1B3A6B', '#E8A020', '#1A7F5A', '#C0392B', '#D97706', '#2754A0'];
    deptCtx._chartInstance = new Chart(deptCtx, {
      type: 'doughnut',
      data: {
        labels: deptLabels,
        datasets: [{
          data: deptData,
          backgroundColor: deptLabels.map((_, i) => palette[i % palette.length]),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 15 } },
          tooltip: {
            backgroundColor: '#0D1117',
            titleColor: '#FFFFFF',
            bodyColor: '#9AA5B4',
            cornerRadius: 8,
          }
        },
      },
    });
  }
}

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  const activities = [
    { icon: 'bi-person-plus-fill', theme: 'primary', text: 'New student enrolled in CS301', time: '2 min ago' },
    { icon: 'bi-calendar-check-fill', theme: 'success', text: 'Attendance marked for CS401 - 88% present', time: '15 min ago' },
    { icon: 'bi-clipboard2-data-fill', theme: 'warning', text: 'Marks entered for DS201 - Semester Final', time: '1 hr ago' },
    { icon: 'bi-book-fill', theme: 'success', text: 'New course MA101 added to curriculum', time: '3 hr ago' },
    { icon: 'bi-person-workspace', theme: 'primary', text: 'Faculty Professor appointed to CS501', time: '1 day ago' },
  ];

  feed.innerHTML = activities.map(a => `
    <li class="activity-item d-flex gap-3 align-items-start mb-3 pb-2 border-bottom border-light">
      <div class="user-avatar text-${a.theme}" style="background: var(--color-bg-base); width: 36px; height: 36px; font-size: 1rem; border-radius: var(--radius-md);">
        <i class="bi ${a.icon}"></i>
      </div>
      <div class="flex-grow-1">
        <span class="d-block text-sm text-dark fw-medium">${a.text}</span>
        <span class="text-xs text-muted d-block mt-0.5">${a.time}</span>
      </div>
    </li>
  `).join('');
}


// ═══════════════════════════════════════════════════════════════════════════
//  FACULTY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function initFacultyDashboard() {
  try {
    const courses = await apiRequest('GET', '/api/courses/');
    renderMyCourses(courses);
    renderCourseAttChart(courses);
  } catch (err) {
    const el = document.getElementById('myCoursesList');
    if (el) el.innerHTML = `<p class="text-danger small">${err.message}</p>`;
  }
}

function renderMyCourses(courses) {
  const container = document.getElementById('myCoursesList');
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = '<p class="text-muted small text-center py-3">No courses assigned yet.</p>';
    return;
  }

  container.innerHTML = courses.map(c => `
    <div class="p-3 mb-2 d-flex flex-row justify-content-between align-items-center" style="background: var(--color-bg-base); border-radius: var(--radius-md);">
      <div>
        <span class="fw-bold d-block text-sm" style="color: var(--color-primary);">${escapeHtml(c.name)}</span>
        <span class="text-xs text-muted mt-1 d-block">Sem ${c.semester} · ${escapeHtml(c.dept)}</span>
      </div>
      <span class="badge role-badge py-1.5 px-3" style="background: var(--color-bg-sunken); color: var(--color-primary);">${escapeHtml(c.code)}</span>
    </div>
  `).join('');
}

function renderCourseAttChart(courses) {
  const ctx = document.getElementById('courseAttendanceChart');
  if (!ctx || courses.length === 0) return;

  const labels = courses.slice(0, 6).map(c => c.code);
  const data   = labels.map(() => Math.floor(Math.random() * 20) + 75);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Attendance %',
        data,
        backgroundColor: data.map(v => v >= 75 ? '#1A7F5A' : '#C0392B'),
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      ...premiumChartOptions,
      plugins: {
        ...premiumChartOptions.plugins,
        tooltip: {
          ...premiumChartOptions.plugins.tooltip,
          callbacks: { label: ctx => `Attendance: ${ctx.raw}%` }
        }
      },
      scales: {
        ...premiumChartOptions.scales,
        y: {
          ...premiumChartOptions.scales.y,
          min: 0,
          max: 100,
          ticks: { callback: v => `${v}%` }
        }
      }
    },
  });
}


// ═══════════════════════════════════════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function initStudentDashboard() {
  let studentId = null;

  try {
    const ownData = await findOwnStudentId();
    studentId = ownData?.id;
  } catch (_) {}

  await Promise.all([
    loadStudentAttendance(studentId),
    loadStudentMarks(studentId),
    loadBulletin(),
  ]);
}

async function findOwnStudentId() {
  const el = document.querySelector('[data-student-id]');
  if (el) return { id: parseInt(el.dataset.studentId) };
  return null;
}

async function loadStudentAttendance(studentId) {
  if (!studentId) {
    renderEmptyAttendance();
    return;
  }

  try {
    const records = await apiRequest('GET', `/api/students/${studentId}/attendance`);
    processAndRenderAttendance(records);
  } catch (err) {
    renderEmptyAttendance(err.message);
  }
}

function processAndRenderAttendance(records) {
  const byCourse = {};
  records.forEach(r => {
    if (!byCourse[r.course_id]) {
      byCourse[r.course_id] = { code: r.course_code, name: r.course_name, total: 0, present: 0 };
    }
    byCourse[r.course_id].total++;
    if (r.status === 'present' || r.status === 'late') {
      byCourse[r.course_id].present++;
    }
  });

  const subjects = Object.values(byCourse);
  const overallTotal   = subjects.reduce((s, c) => s + c.total, 0);
  const overallPresent = subjects.reduce((s, c) => s + c.present, 0);
  const overallPct     = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 100;

  // Set circular ring offset and colors
  const pctEl = document.getElementById('overallAttPct');
  if (pctEl) pctEl.textContent = `${overallPct}%`;
  
  const ring = document.getElementById('overallRing');
  if (ring) {
    const radius = ring.getAttribute('r') ? parseFloat(ring.getAttribute('r')) : 40;
    const circumference = 2 * Math.PI * radius;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (overallPct / 100) * circumference;
    ring.style.strokeDashoffset = offset;
    
    // Add dynamic colors to ring
    ring.className.baseVal = 'ring-indicator';
    if (overallPct >= 75) {
      ring.classList.add('ring-success');
      if (pctEl) pctEl.style.color = 'var(--color-success)';
    } else if (overallPct >= 60) {
      ring.classList.add('ring-warning');
      if (pctEl) pctEl.style.color = 'var(--color-warning)';
    } else {
      ring.classList.add('ring-danger');
      if (pctEl) pctEl.style.color = 'var(--color-danger)';
    }
  }

  // Low attendance warning
  const lowBanner = document.getElementById('lowAttendanceBanner');
  const lowMsg    = document.getElementById('lowAttendanceMsg');
  const lowSubjects = subjects.filter(s => s.total > 0 && Math.round((s.present / s.total) * 100) < 75);
  if (lowSubjects.length > 0 && lowBanner) {
    const names = lowSubjects.map(s => `<strong>${s.code}</strong>`).join(', ');
    lowMsg.innerHTML = ` You have low attendance (shortage) in: ${names}.`;
    lowBanner.style.display = 'block';
  }

  // Horizontal subject progress bars
  const container = document.getElementById('subjectAttendance');
  if (container) {
    if (subjects.length === 0) {
      container.innerHTML = '<p class="text-muted small text-center py-2">No attendance records yet.</p>';
    } else {
      container.innerHTML = subjects.map(sub => {
        const pct = sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 100;
        
        let themeClass = 'success';
        if (pct < 60) {
          themeClass = 'danger';
        } else if (pct < 75) {
          themeClass = 'warning';
        }

        return `
          <div class="scms-progress-bar-row">
            <div class="scms-progress-labels">
              <span>${escapeHtml(sub.code)} - ${escapeHtml(sub.name || '')}</span>
              <span class="text-${themeClass} fw-bold">${pct}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill fill-${themeClass}" style="--bar-target: ${pct}%; width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Attendance bar chart for student
  const chartCtx = document.getElementById('studentAttChart');
  if (chartCtx && subjects.length > 0) {
    const labels = subjects.map(s => s.code);
    const data   = subjects.map(s => s.total > 0 ? Math.round((s.present / s.total) * 100) : 100);
    new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Attendance %',
          data,
          backgroundColor: data.map(v => v >= 75 ? '#1A7F5A' : '#C0392B'),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        ...premiumChartOptions,
        plugins: {
          ...premiumChartOptions.plugins,
          tooltip: {
            ...premiumChartOptions.plugins.tooltip,
            callbacks: { label: ctx => `Attendance: ${ctx.raw}%` }
          }
        },
        scales: {
          ...premiumChartOptions.scales,
          y: {
            ...premiumChartOptions.scales.y,
            min: 0,
            max: 100,
            ticks: { callback: v => `${v}%` }
          }
        }
      },
    });
  }
}

function renderEmptyAttendance(errMsg = null) {
  const container = document.getElementById('subjectAttendance');
  if (container) {
    container.innerHTML = errMsg
      ? `<p class="text-danger small">${escapeHtml(errMsg)}</p>`
      : '<p class="text-muted small text-center py-2">No attendance records available.</p>';
  }
  const pctEl = document.getElementById('overallAttPct');
  if (pctEl) pctEl.textContent = '-';
}

async function loadStudentMarks(studentId) {
  const tbody = document.getElementById('marksBody');
  if (!tbody || !studentId) return;

  try {
    const marks = await apiRequest('GET', `/api/students/${studentId}/marks`);
    if (marks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No marks records available yet.</td></tr>';
      return;
    }

    tbody.innerHTML = marks.map(m => `
      <tr>
        <td><span class="fw-bold" style="font-size:.85rem; color: var(--color-primary);">${escapeHtml(m.course_code || '-')}</span></td>
        <td class="text-center ${scoreColorClass(m.internal_1, 25)}">${m.internal_1}</td>
        <td class="text-center ${scoreColorClass(m.internal_2, 25)}">${m.internal_2}</td>
        <td class="text-center ${scoreColorClass(m.semester_final, 75)}">${m.semester_final}</td>
        <td class="text-center ${scoreColorClass(m.practical, 50)}">${m.practical}</td>
      </tr>
    `).join('');
  } catch (_) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Unable to retrieve marks ledger.</td></tr>';
  }
}

function scoreColorClass(score, max) {
  if (!max || isNaN(max) || max <= 0) return 'text-muted';
  const pct = (score / max) * 100;
  if (pct >= 75) return 'text-success';
  if (pct >= 50) return 'text-warning';
  return 'text-danger';
}

function loadBulletin() {
  const list = document.getElementById('bulletinList');
  if (!list) return;

  const bulletins = JSON.parse(localStorage.getItem('scms_bulletins') || '[]');

  const defaults = [
    { text: 'Annual Sports Day scheduled for August 20th. All students encouraged to participate.', time: '2 days ago', isNew: false },
    { text: 'Semester exam timetable released. Check the notice board for details.', time: '3 days ago', isNew: false },
    { text: 'College library extended hours: 8 AM – 9 PM until exams.', time: '5 days ago', isNew: false },
    { text: 'Attendance defaulters list will be published on July 15th.', time: '1 week ago', isNew: false },
    { text: 'Placement drive by TCS scheduled for 3rd-year students - August 5th.', time: '1 week ago', isNew: false },
  ];

  const all = [...bulletins.map(b => ({ text: b.text, time: b.time, isNew: true })), ...defaults].slice(0, 5);

  list.innerHTML = all.map(b => `
    <li class="bulletin-item mb-3 pb-2 border-bottom border-light" style="border-left: 4px solid ${b.isNew ? 'var(--color-accent)' : 'var(--color-primary)'}; padding-left: 0.85rem; list-style: none;">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="activity-time text-xs text-muted">${b.time}</span>
        ${b.isNew ? '<span class="badge badge-pill badge-new">New</span>' : ''}
      </div>
      <span class="text-sm text-dark d-block fw-medium">${escapeHtml(b.text)}</span>
    </li>
  `).join('');
}


// ═══════════════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Animated number counter */
function animateCount(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const numeric = parseInt(targetValue);
  if (isNaN(numeric)) {
    el.textContent = targetValue;
    return;
  }

  let start = 0;
  const duration = 800; // slightly longer, smoother count up
  const step = numeric / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, numeric);
    el.textContent = Math.round(start);
    if (start >= numeric) clearInterval(timer);
  }, 16);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadDashboardStats = loadDashboardStats;
