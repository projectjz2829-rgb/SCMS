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

  // Global Modal Reset Logic
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', function () {
      const form = this.querySelector('form');
      if (form) form.reset();
      
      const msg = this.querySelector('[id$="Msg"]');
      if (msg) msg.innerHTML = '';
      
      const alerts = this.querySelectorAll('.alert');
      alerts.forEach(a => a.remove());
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function initAdminDashboard() {
  await loadDashboardStats();
  renderActivityFeed();
  loadStudentTable();
  loadFacultyTable();
  loadCourseTable();

  // Wire Refresh Stats button
  const refreshBtn = document.getElementById('btnRefreshStats');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1 spin"></i>Refreshing...';
      await loadDashboardStats();
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Refresh Data';
      }, 500);
    });
  }
}
// ─── Delete state (module-level) ────────────────────────────────────────── //
let pendingDeleteStudentId   = null;
let pendingDeleteStudentName = null;
let pendingDeleteFacultyId   = null;
let pendingDeleteFacultyName = null;

let allStudents = [];
let filteredStudents = [];
let studentCurrentPage = 1;
const STUDENT_ITEMS_PER_PAGE = 10;

async function loadStudentTable() {
  const tbody = document.getElementById('studentTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
    `;
  }
  try {
    allStudents = await apiRequest('GET', '/api/students/');
    filterAndPaginateStudents();
  } catch (err) {
    const tbody = document.getElementById('studentTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function filterAndPaginateStudents() {
  const search = (document.getElementById('searchStudent')?.value || '').toLowerCase();
  const dept = document.getElementById('filterStudentDept')?.value || '';
  
  filteredStudents = allStudents.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search) || s.roll_no.toLowerCase().includes(search);
    const matchDept = dept ? s.dept === dept : true;
    return matchSearch && matchDept;
  });
  
  studentCurrentPage = 1;
  renderStudentTable();
}

function renderStudentTable() {
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;
  
  if (filteredStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>No students found matching your criteria.</td></tr>';
    document.getElementById('studentPaginationContainer')?.style.setProperty('display', 'none', 'important');
    return;
  }

  const totalPages = Math.ceil(filteredStudents.length / STUDENT_ITEMS_PER_PAGE);
  if (studentCurrentPage > totalPages) studentCurrentPage = totalPages;
  if (studentCurrentPage < 1) studentCurrentPage = 1;
  
  const start = (studentCurrentPage - 1) * STUDENT_ITEMS_PER_PAGE;
  const end = start + STUDENT_ITEMS_PER_PAGE;
  const pageData = filteredStudents.slice(start, end);
  
  tbody.innerHTML = pageData.map(s => `
    <tr>
      <td><code>${escapeHtml(s.roll_no)}</code></td>
      <td>${escapeHtml(s.full_name)}</td>
      <td>${escapeHtml(s.dept)}</td>
      <td>${s.year}</td>
      <td>${escapeHtml(s.section)}</td>
      <td>${escapeHtml(s.email || '-')}</td>
      <td class="text-center text-nowrap">
        <button class="btn btn-outline-primary btn-sm me-1 edit-student-btn"
                data-id="${s.id}" data-name="${escapeHtml(s.full_name)}"
                data-roll="${escapeHtml(s.roll_no)}" data-dept="${escapeHtml(s.dept)}"
                data-year="${s.year}" data-section="${escapeHtml(s.section)}"
                data-phone="${escapeHtml(s.phone || '')}">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm delete-student-btn"
                data-id="${s.id}" data-name="${escapeHtml(s.full_name)}">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  // Attach edit button listeners
  tbody.querySelectorAll('.edit-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('editStudentId').value = btn.dataset.id;
      document.getElementById('editStudentName').value = btn.dataset.name;
      document.getElementById('editStudentDept').value = btn.dataset.dept;
      document.getElementById('editStudentYear').value = btn.dataset.year;
      document.getElementById('editStudentSection').value = btn.dataset.section;
      document.getElementById('editStudentPhone').value = btn.dataset.phone;
      document.getElementById('editStudentMsg').innerHTML = '';
      const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
      modal.show();
    });
  });

  // Attach delete button listeners
  tbody.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteStudentId   = btn.dataset.id;
      pendingDeleteStudentName = btn.dataset.name;
      const nameEl = document.getElementById('deleteStudentName');
      if (nameEl) nameEl.textContent = pendingDeleteStudentName;
      const modal = new bootstrap.Modal(document.getElementById('deleteStudentModal'));
      modal.show();
    });
  });
  
  // Pagination UI
  const pagCont = document.getElementById('studentPaginationContainer');
  if (pagCont) pagCont.style.setProperty('display', 'flex', 'important');
  
  const pageInfo = document.getElementById('studentPageInfo');
  if (pageInfo) pageInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredStudents.length)} of ${filteredStudents.length}`;
  
  const prevBtn = document.getElementById('studentPrevBtn');
  if (prevBtn) prevBtn.disabled = studentCurrentPage === 1;
  
  const nextBtn = document.getElementById('studentNextBtn');
  if (nextBtn) nextBtn.disabled = studentCurrentPage === totalPages;
}

// Wire the "Yes, Delete" button once at page load
document.addEventListener('DOMContentLoaded', () => {
  // Student Search, Filter, Pagination
  document.getElementById('searchStudent')?.addEventListener('input', filterAndPaginateStudents);
  document.getElementById('filterStudentDept')?.addEventListener('change', filterAndPaginateStudents);
  
  document.getElementById('studentPrevBtn')?.addEventListener('click', () => {
    if (studentCurrentPage > 1) { studentCurrentPage--; renderStudentTable(); }
  });
  document.getElementById('studentNextBtn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredStudents.length / STUDENT_ITEMS_PER_PAGE);
    if (studentCurrentPage < totalPages) { studentCurrentPage++; renderStudentTable(); }
  });

  // Add Student
  document.getElementById('addStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveAddStudentBtn');
    const msgEl = document.getElementById('addStudentMsg');
    if (!btn || !msgEl) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    try {
      await apiRequest('POST', '/api/students/', {
        full_name: document.getElementById('addStudentName').value.trim(),
        roll_no: document.getElementById('addStudentRoll').value.trim(),
        email: document.getElementById('addStudentEmail').value.trim(),
        password: document.getElementById('addStudentPass').value.trim(),
        dept: document.getElementById('addStudentDept').value.trim(),
        year: parseInt(document.getElementById('addStudentYear').value),
        section: document.getElementById('addStudentSection').value.trim()
      });
      showToast('Student added successfully!', 'success');
      document.getElementById('addStudentForm').reset();
      bootstrap.Modal.getInstance(document.getElementById('addStudentModal'))?.hide();
      msgEl.innerHTML = '';
      loadStudentTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Create Student';
    }
  });

  // Edit Student
  document.getElementById('editStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveEditStudentBtn');
    const msgEl = document.getElementById('editStudentMsg');
    const id = document.getElementById('editStudentId').value;
    if (!btn || !msgEl || !id) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    try {
      await apiRequest('PUT', `/api/students/${id}`, {
        full_name: document.getElementById('editStudentName').value.trim(),
        dept: document.getElementById('editStudentDept').value.trim(),
        year: parseInt(document.getElementById('editStudentYear').value),
        section: document.getElementById('editStudentSection').value.trim(),
        phone: document.getElementById('editStudentPhone').value.trim() || null
      });
      showToast('Student updated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editStudentModal'))?.hide();
      msgEl.innerHTML = '';
      loadStudentTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Changes';
    }
  });

  // Delete Student
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

let allFaculty = [];
let filteredFaculty = [];
let facultyCurrentPage = 1;
const FACULTY_ITEMS_PER_PAGE = 10;

async function loadFacultyTable() {
  const tbody = document.getElementById('facultyTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
    `;
  }
  try {
    allFaculty = await apiRequest('GET', '/api/faculty/');
    filterAndPaginateFaculty();
  } catch (err) {
    const tbody = document.getElementById('facultyTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function filterAndPaginateFaculty() {
  const search = (document.getElementById('searchFaculty')?.value || '').toLowerCase();
  const dept   = document.getElementById('filterFacultyDept')?.value || '';

  filteredFaculty = allFaculty.filter(f => {
    const matchSearch = f.full_name.toLowerCase().includes(search) || f.emp_id.toLowerCase().includes(search);
    const matchDept   = dept ? f.dept === dept : true;
    return matchSearch && matchDept;
  });

  facultyCurrentPage = 1;
  renderFacultyTable();
}

function renderFacultyTable() {
  const tbody = document.getElementById('facultyTableBody');
  if (!tbody) return;

  if (filteredFaculty.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>No faculty found matching your criteria.</td></tr>';
    document.getElementById('facultyPaginationContainer')?.style.setProperty('display', 'none', 'important');
    return;
  }

  const totalPages = Math.ceil(filteredFaculty.length / FACULTY_ITEMS_PER_PAGE);
  if (facultyCurrentPage > totalPages) facultyCurrentPage = totalPages;
  if (facultyCurrentPage < 1) facultyCurrentPage = 1;

  const start    = (facultyCurrentPage - 1) * FACULTY_ITEMS_PER_PAGE;
  const end      = start + FACULTY_ITEMS_PER_PAGE;
  const pageData = filteredFaculty.slice(start, end);

  tbody.innerHTML = pageData.map(f => `
    <tr>
      <td><code>${escapeHtml(f.emp_id)}</code></td>
      <td>${escapeHtml(f.full_name)}</td>
      <td>${escapeHtml(f.dept)}</td>
      <td>${escapeHtml(f.designation)}</td>
      <td>${escapeHtml(f.email || '-')}</td>
      <td class="text-center text-nowrap">
        <button class="btn btn-outline-primary btn-sm me-1 edit-faculty-btn"
                data-id="${f.id}"
                data-name="${escapeHtml(f.full_name)}"
                data-dept="${escapeHtml(f.dept)}"
                data-designation="${escapeHtml(f.designation)}"
                data-phone="${escapeHtml(f.phone || '')}">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm delete-faculty-btn"
                data-id="${f.id}" data-name="${escapeHtml(f.full_name)}">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Edit button listeners
  tbody.querySelectorAll('.edit-faculty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('editFacultyId').value          = btn.dataset.id;
      document.getElementById('editFacultyName').value        = btn.dataset.name;
      document.getElementById('editFacultyDept').value        = btn.dataset.dept;
      document.getElementById('editFacultyDesignation').value = btn.dataset.designation;
      document.getElementById('editFacultyPhone').value       = btn.dataset.phone;
      document.getElementById('editFacultyMsg').innerHTML     = '';
      const modal = new bootstrap.Modal(document.getElementById('editFacultyModal'));
      modal.show();
    });
  });

  // Delete button listeners
  tbody.querySelectorAll('.delete-faculty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteFacultyId   = btn.dataset.id;
      pendingDeleteFacultyName = btn.dataset.name;
      const nameEl = document.getElementById('deleteFacultyName');
      if (nameEl) nameEl.textContent = pendingDeleteFacultyName;
      const modal = new bootstrap.Modal(document.getElementById('deleteFacultyModal'));
      modal.show();
    });
  });

  // Pagination UI
  const pagCont = document.getElementById('facultyPaginationContainer');
  if (pagCont) pagCont.style.setProperty('display', 'flex', 'important');

  const pageInfo = document.getElementById('facultyPageInfo');
  if (pageInfo) pageInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredFaculty.length)} of ${filteredFaculty.length}`;

  const prevBtn = document.getElementById('facultyPrevBtn');
  if (prevBtn) prevBtn.disabled = facultyCurrentPage === 1;

  const nextBtn = document.getElementById('facultyNextBtn');
  if (nextBtn) nextBtn.disabled = facultyCurrentPage === totalPages;
}

// Wire all faculty CRUD buttons once at page load
document.addEventListener('DOMContentLoaded', () => {
  // Search & filter
  document.getElementById('searchFaculty')?.addEventListener('input', filterAndPaginateFaculty);
  document.getElementById('filterFacultyDept')?.addEventListener('change', filterAndPaginateFaculty);

  // Pagination
  document.getElementById('facultyPrevBtn')?.addEventListener('click', () => {
    if (facultyCurrentPage > 1) { facultyCurrentPage--; renderFacultyTable(); }
  });
  document.getElementById('facultyNextBtn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredFaculty.length / FACULTY_ITEMS_PER_PAGE);
    if (facultyCurrentPage < totalPages) { facultyCurrentPage++; renderFacultyTable(); }
  });

  // ── Add Faculty ──────────────────────────────────────────────────────── //
  document.getElementById('addFacultyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('saveAddFacultyBtn');
    const msgEl = document.getElementById('addFacultyMsg');
    if (!btn || !msgEl) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    try {
      await apiRequest('POST', '/api/faculty/', {
        full_name:   document.getElementById('addFacultyName').value.trim(),
        emp_id:      document.getElementById('addFacultyEmpId').value.trim(),
        email:       document.getElementById('addFacultyEmail').value.trim(),
        password:    document.getElementById('addFacultyPass').value.trim(),
        dept:        document.getElementById('addFacultyDept').value.trim(),
        designation: document.getElementById('addFacultyDesignation').value.trim(),
      });
      showToast('Faculty added successfully!', 'success');
      document.getElementById('addFacultyForm').reset();
      bootstrap.Modal.getInstance(document.getElementById('addFacultyModal'))?.hide();
      msgEl.innerHTML = '';
      loadFacultyTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Create Faculty';
    }
  });

  // ── Edit Faculty ─────────────────────────────────────────────────────── //
  document.getElementById('editFacultyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('saveEditFacultyBtn');
    const msgEl = document.getElementById('editFacultyMsg');
    const id    = document.getElementById('editFacultyId').value;
    if (!btn || !msgEl || !id) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    try {
      await apiRequest('PUT', `/api/faculty/${id}`, {
        full_name:   document.getElementById('editFacultyName').value.trim(),
        dept:        document.getElementById('editFacultyDept').value.trim(),
        designation: document.getElementById('editFacultyDesignation').value.trim(),
        phone:       document.getElementById('editFacultyPhone').value.trim() || null,
      });
      showToast('Faculty updated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editFacultyModal'))?.hide();
      msgEl.innerHTML = '';
      loadFacultyTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Changes';
    }
  });

  // ── Delete Faculty ───────────────────────────────────────────────────── //
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
      await loadFacultyTable();
    } catch (err) {
      showToast(err.message || 'Failed to delete faculty.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Yes, Delete';
    }
  });
});





// ─── Course management table ─────────────────────────────────────────────── //

let allCourses = [];
let filteredCourses = [];
let courseCurrentPage = 1;
const COURSE_ITEMS_PER_PAGE = 10;
let pendingDeleteCourseId   = null;
let pendingDeleteCourseName = null;

async function loadCourseTable() {
  const tbody = document.getElementById('courseTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
      <tr class="table-skeleton"><td colspan="7"><div class="skeleton-line"></div></td></tr>
    `;
  }
  try {
    allCourses = await apiRequest('GET', '/api/courses/');
    filterAndPaginateCourses();
  } catch (err) {
    const tbody = document.getElementById('courseTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
  }
}

function filterAndPaginateCourses() {
  const search = (document.getElementById('searchCourse')?.value || '').toLowerCase();
  const dept   = document.getElementById('filterCourseDept')?.value || '';
  const sem    = document.getElementById('filterCourseSemester')?.value || '';

  filteredCourses = allCourses.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search);
    const matchDept   = dept ? c.dept === dept : true;
    const matchSem    = sem  ? String(c.semester) === sem : true;
    return matchSearch && matchDept && matchSem;
  });

  courseCurrentPage = 1;
  renderCourseTable();
}

function renderCourseTable() {
  const tbody = document.getElementById('courseTableBody');
  if (!tbody) return;

  if (filteredCourses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>No courses found matching your criteria.</td></tr>';
    document.getElementById('coursePaginationContainer')?.style.setProperty('display', 'none', 'important');
    return;
  }

  const totalPages = Math.ceil(filteredCourses.length / COURSE_ITEMS_PER_PAGE);
  if (courseCurrentPage > totalPages) courseCurrentPage = totalPages;
  if (courseCurrentPage < 1) courseCurrentPage = 1;

  const start    = (courseCurrentPage - 1) * COURSE_ITEMS_PER_PAGE;
  const end      = start + COURSE_ITEMS_PER_PAGE;
  const pageData = filteredCourses.slice(start, end);

  tbody.innerHTML = pageData.map(c => `
    <tr>
      <td><code>${escapeHtml(c.code)}</code></td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.dept)}</td>
      <td>${c.semester}</td>
      <td>${c.faculty_name ? escapeHtml(c.faculty_name) : '<span class="text-muted">Unassigned</span>'}</td>
      <td>${typeof c.enrolled_count !== 'undefined' ? c.enrolled_count : '-'}</td>
      <td class="text-center text-nowrap">
        <button class="btn btn-outline-primary btn-sm me-1 edit-course-btn"
                data-id="${c.id}"
                data-name="${escapeHtml(c.name)}"
                data-dept="${escapeHtml(c.dept)}"
                data-semester="${c.semester}"
                data-faculty-id="${c.faculty_id || ''}">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="btn btn-outline-success btn-sm me-1 enroll-course-btn"
                data-id="${c.id}" data-name="${escapeHtml(c.name)}">
          <i class="bi bi-person-plus-fill"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm delete-course-btn"
                data-id="${c.id}" data-name="${escapeHtml(c.name)}">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Edit listeners
  tbody.querySelectorAll('.edit-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('editCourseId').value       = btn.dataset.id;
      document.getElementById('editCourseName').value     = btn.dataset.name;
      document.getElementById('editCourseDept').value     = btn.dataset.dept;
      document.getElementById('editCourseSemester').value = btn.dataset.semester;
      document.getElementById('editCourseFacultyId').value = btn.dataset.facultyId || '';
      document.getElementById('editCourseMsg').innerHTML  = '';
      new bootstrap.Modal(document.getElementById('editCourseModal')).show();
    });
  });

  // Enroll listeners
  tbody.querySelectorAll('.enroll-course-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.getElementById('enrollCourseId').value         = btn.dataset.id;
      document.getElementById('enrollCourseNameDisplay').textContent = btn.dataset.name;
      document.getElementById('enrollStudentId').value        = '';
      document.getElementById('enrollStudentMsg').innerHTML   = '';
      // Load current roster
      const rosterEl = document.getElementById('enrolledRoster');
      rosterEl.innerHTML = '<small class="text-muted">Loading roster…</small>';
      new bootstrap.Modal(document.getElementById('enrollStudentModal')).show();
      try {
        const students = await apiRequest('GET', `/api/courses/${btn.dataset.id}/students`);
        if (students.length === 0) {
          rosterEl.innerHTML = '<p class="text-muted small mb-0">No students enrolled yet.</p>';
        } else {
          rosterEl.innerHTML = `
            <p class="fw-semibold mb-2 small">Enrolled Students (${students.length}):</p>
            <ul class="list-group list-group-flush" style="max-height:160px;overflow-y:auto;">
              ${students.map(s => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                  <span class="small">${escapeHtml(s.full_name)} <code class="ms-1">${escapeHtml(s.roll_no)}</code></span>
                  <button class="btn btn-outline-danger btn-sm py-0 unenroll-btn" data-student-id="${s.id}" data-course-id="${btn.dataset.id}">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </li>`).join('')}
            </ul>`;
          rosterEl.querySelectorAll('.unenroll-btn').forEach(ub => {
            ub.addEventListener('click', async () => {
              ub.disabled = true;
              try {
                await apiRequest('DELETE', `/api/courses/${ub.dataset.courseId}/enroll/${ub.dataset.studentId}`);
                showToast('Student unenrolled.', 'success');
                ub.closest('li').remove();
                loadCourseTable();
              } catch (err) {
                showToast(err.message || 'Failed to unenroll.', 'danger');
                ub.disabled = false;
              }
            });
          });
        }
      } catch (err) {
        rosterEl.innerHTML = `<p class="text-danger small">${escapeHtml(err.message)}</p>`;
      }
    });
  });

  // Delete listeners
  tbody.querySelectorAll('.delete-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteCourseId   = btn.dataset.id;
      pendingDeleteCourseName = btn.dataset.name;
      const el = document.getElementById('deleteCourseNameDisplay');
      if (el) el.textContent = pendingDeleteCourseName;
      new bootstrap.Modal(document.getElementById('deleteCourseModal')).show();
    });
  });

  // Pagination UI
  const pagCont = document.getElementById('coursePaginationContainer');
  if (pagCont) pagCont.style.setProperty('display', 'flex', 'important');

  const pageInfo = document.getElementById('coursePageInfo');
  if (pageInfo) pageInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredCourses.length)} of ${filteredCourses.length}`;

  const prevBtn = document.getElementById('coursePrevBtn');
  if (prevBtn) prevBtn.disabled = courseCurrentPage === 1;

  const nextBtn = document.getElementById('courseNextBtn');
  if (nextBtn) nextBtn.disabled = courseCurrentPage === totalPages;
}

// Wire all course CRUD buttons at page load
document.addEventListener('DOMContentLoaded', () => {
  // Search & filter
  document.getElementById('searchCourse')?.addEventListener('input', filterAndPaginateCourses);
  document.getElementById('filterCourseDept')?.addEventListener('change', filterAndPaginateCourses);
  document.getElementById('filterCourseSemester')?.addEventListener('change', filterAndPaginateCourses);

  // Pagination
  document.getElementById('coursePrevBtn')?.addEventListener('click', () => {
    if (courseCurrentPage > 1) { courseCurrentPage--; renderCourseTable(); }
  });
  document.getElementById('courseNextBtn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredCourses.length / COURSE_ITEMS_PER_PAGE);
    if (courseCurrentPage < totalPages) { courseCurrentPage++; renderCourseTable(); }
  });

  // ── Create Course ────────────────────────────────────────────────────── //
  document.getElementById('addCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('saveCourseBtn');
    const msgEl = document.getElementById('courseFormMsg');
    if (!btn || !msgEl) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
    msgEl.innerHTML = '';
    try {
      const facultyIdRaw = document.getElementById('courseFacultyId')?.value?.trim();
      const payload = {
        name:     document.getElementById('courseName').value.trim(),
        code:     document.getElementById('courseCode').value.trim(),
        dept:     document.getElementById('courseDept').value.trim(),
        semester: parseInt(document.getElementById('courseSemester').value),
      };
      if (facultyIdRaw) payload.faculty_id = parseInt(facultyIdRaw);
      await apiRequest('POST', '/api/courses/', payload);
      showToast('Course created successfully!', 'success');
      document.getElementById('addCourseForm').reset();
      bootstrap.Modal.getInstance(document.getElementById('addCourseModal'))?.hide();
      msgEl.innerHTML = '';
      loadCourseTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Create Course';
    }
  });

  // ── Edit Course ──────────────────────────────────────────────────────── //
  document.getElementById('editCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('saveEditCourseBtn');
    const msgEl = document.getElementById('editCourseMsg');
    const id    = document.getElementById('editCourseId').value;
    if (!btn || !msgEl || !id) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    try {
      const facultyIdRaw = document.getElementById('editCourseFacultyId').value.trim();
      const payload = {
        name:     document.getElementById('editCourseName').value.trim(),
        dept:     document.getElementById('editCourseDept').value.trim(),
        semester: parseInt(document.getElementById('editCourseSemester').value),
        faculty_id: facultyIdRaw ? parseInt(facultyIdRaw) : null,
      };
      await apiRequest('PUT', `/api/courses/${id}`, payload);
      showToast('Course updated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editCourseModal'))?.hide();
      msgEl.innerHTML = '';
      loadCourseTable();
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Save Changes';
    }
  });

  // ── Delete Course ────────────────────────────────────────────────────── //
  document.getElementById('confirmDeleteCourseBtn')?.addEventListener('click', async () => {
    if (!pendingDeleteCourseId) return;
    const btn = document.getElementById('confirmDeleteCourseBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Deleting…';
    try {
      await apiRequest('DELETE', `/api/courses/${pendingDeleteCourseId}`);
      bootstrap.Modal.getInstance(document.getElementById('deleteCourseModal'))?.hide();
      showToast('Course deleted successfully.', 'success');
      pendingDeleteCourseId   = null;
      pendingDeleteCourseName = null;
      await loadCourseTable();
    } catch (err) {
      showToast(err.message || 'Failed to delete course.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>Yes, Delete';
    }
  });

  // ── Enroll Student ───────────────────────────────────────────────────── //
  document.getElementById('enrollStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = document.getElementById('confirmEnrollStudentBtn');
    const msgEl   = document.getElementById('enrollStudentMsg');
    const cid     = document.getElementById('enrollCourseId').value;
    const sidRaw  = document.getElementById('enrollStudentId').value.trim();
    if (!cid || !sidRaw) {
      msgEl.innerHTML = '<div class="alert alert-warning py-2">Please enter a Student ID.</div>';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enrolling...';
    try {
      await apiRequest('POST', `/api/courses/${cid}/enroll`, { student_id: sidRaw });
      msgEl.innerHTML = '<div class="alert alert-success py-2">Student enrolled successfully!</div>';
      document.getElementById('enrollStudentId').value = '';
      loadCourseTable();
      // Reload roster
      const students = await apiRequest('GET', `/api/courses/${cid}/students`);
      const rosterEl = document.getElementById('enrolledRoster');
      if (rosterEl && students.length > 0) {
        rosterEl.innerHTML = `
          <p class="fw-semibold mb-2 small">Enrolled Students (${students.length}):</p>
          <ul class="list-group list-group-flush" style="max-height:160px;overflow-y:auto;">
            ${students.map(s => `
              <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                <span class="small">${escapeHtml(s.full_name)} <code class="ms-1">${escapeHtml(s.roll_no)}</code></span>
                <button class="btn btn-outline-danger btn-sm py-0 unenroll-btn" data-student-id="${s.id}" data-course-id="${cid}">
                  <i class="bi bi-x-circle"></i>
                </button>
              </li>`).join('')}
          </ul>`;
        rosterEl.querySelectorAll('.unenroll-btn').forEach(ub => {
          ub.addEventListener('click', async () => {
            ub.disabled = true;
            try {
              await apiRequest('DELETE', `/api/courses/${ub.dataset.courseId}/enroll/${ub.dataset.studentId}`);
              showToast('Student unenrolled.', 'success');
              ub.closest('li').remove();
              loadCourseTable();
            } catch (err) {
              showToast(err.message || 'Failed to unenroll.', 'danger');
              ub.disabled = false;
            }
          });
        });
      }
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-person-plus-fill me-1"></i>Enroll';
    }
  });
});

async function loadDashboardStats() {
  try {
    const data = await apiRequest('GET', '/dashboard/api/admin/stats');
    
    animateCount('stat-students', data.stats.students);
    animateCount('stat-faculty',  data.stats.faculty);
    animateCount('stat-courses',  data.stats.courses);
    animateCount('stat-enrollments', data.stats.enrollments);

    renderAdminCharts(data.charts.courses, data.charts.departments);
  } catch (err) {
    showToast("Failed to load dashboard stats", "danger");
  }
}

function renderAdminCharts(courses, deptCounts) {
  // Attendance bar chart
  const attCtx = document.getElementById('attendanceChart');
  if (attCtx && courses.length > 0) {
    if (attCtx._chartInstance) attCtx._chartInstance.destroy();
    const labels = courses.map(c => c.code);
    const data   = courses.map(c => c.attendance_pct);
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
  if (deptCtx && Object.keys(deptCounts).length > 0) {
    if (deptCtx._chartInstance) deptCtx._chartInstance.destroy();
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
  feed.innerHTML = '<li class="text-muted text-sm text-center py-3">No recent activity available.</li>';
}


// ═══════════════════════════════════════════════════════════════════════════
//  FACULTY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

async function initFacultyDashboard() {
  try {
    // Single call to the faculty stats endpoint for all live data
    const stats = await apiRequest('GET', '/dashboard/api/faculty/stats');
    const { courses, summary } = stats;

    // ── Stat cards ──────────────────────────────────────────────────── //
    animateCount('fac-stat-courses', summary.total_courses);
    animateCount('fac-stat-students', summary.total_students);

    const attEl = document.getElementById('fac-stat-att');
    if (attEl) {
      attEl.textContent = summary.overall_att_pct !== null
        ? `${summary.overall_att_pct}%`
        : 'N/A';
    }

    animateCount('fac-stat-pending', summary.pending_marks_courses);

    // ── My Courses list + Attendance chart ───────────────────────────── //
    renderMyCourses(courses);
    renderCourseAttChart(courses);

    // ── Populate course selects for Attendance & Marks panels ─────── //
    populateCourseSelects(courses);

  } catch (err) {
    const el = document.getElementById('myCoursesList');
    if (el) el.innerHTML = `<p class="text-danger small">${escapeHtml(err.message)}</p>`;
    showToast('Failed to load faculty stats.', 'danger');
  }
}

function populateCourseSelects(courses) {
  const selects = [
    document.getElementById('attCourseSelect'),
    document.getElementById('marksCourseSelect'),
  ];
  selects.forEach(sel => {
    if (!sel) return;
    // Keep the placeholder option, remove previously injected ones
    while (sel.options.length > 1) sel.remove(1);
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.code} — ${c.name}`;
      sel.appendChild(opt);
    });
  });

  // Set default date to today if not already set
  const dateInput = document.getElementById('attDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  // Set default academic year
  const yr = new Date().getFullYear();
  const ayInput = document.getElementById('academicYear');
  if (ayInput && !ayInput.value) {
    ayInput.value = `${yr}-${yr + 1}`;
  }

  // Signal attendance.js that selects are ready
  document.dispatchEvent(new CustomEvent('coursesReady'));

  // Wire attendance & marks panels if attendance.js has already exposed the function
  if (typeof window.initAttendanceAndMarks === 'function') {
    window.initAttendanceAndMarks();
  }
}

function renderMyCourses(courses) {
  const container = document.getElementById('myCoursesList');
  if (!container) return;

  if (!courses || courses.length === 0) {
    container.innerHTML = '<p class="text-muted small text-center py-3">No courses assigned yet.</p>';
    return;
  }

  container.innerHTML = courses.map(c => {
    const attBadge = c.att_pct !== null
      ? `<span class="badge ${c.att_pct >= 75 ? 'bg-success' : c.att_pct >= 60 ? 'bg-warning text-dark' : 'bg-danger'} ms-1" style="font-size:.7rem;">${c.att_pct}% att</span>`
      : `<span class="badge bg-secondary ms-1" style="font-size:.7rem;">No att yet</span>`;
    const pendingBadge = c.pending_marks
      ? `<span class="badge bg-warning text-dark ms-1" style="font-size:.7rem;"><i class="bi bi-exclamation-circle me-1"></i>Marks pending</span>`
      : '';
    return `
      <div class="p-3 mb-2" style="background: var(--color-bg-base); border-radius: var(--radius-md);">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1 me-2">
            <span class="fw-bold d-block text-sm" style="color: var(--color-primary);">${escapeHtml(c.name)}</span>
            <span class="text-xs text-muted mt-1 d-block">Sem ${c.semester} · ${escapeHtml(c.dept)} · ${c.enrolled_count} student${c.enrolled_count !== 1 ? 's' : ''}</span>
            <div class="mt-1">${attBadge}${pendingBadge}</div>
          </div>
          <span class="badge role-badge py-1 px-2 flex-shrink-0" style="background: var(--color-bg-sunken); color: var(--color-primary);">${escapeHtml(c.code)}</span>
        </div>
      </div>`;
  }).join('');
}

function renderCourseAttChart(courses) {
  const ctx = document.getElementById('courseAttendanceChart');
  if (!ctx) return;

  // Filter to courses that actually have attendance data
  const withData = courses.filter(c => c.att_pct !== null);

  if (withData.length === 0) {
    const parent = ctx.parentElement;
    if (parent) parent.innerHTML = '<p class="text-muted small text-center py-3">No attendance data yet for your courses.</p>';
    return;
  }

  if (ctx._chartInstance) ctx._chartInstance.destroy();

  const labels = withData.map(c => c.code);
  const data   = withData.map(c => c.att_pct);

  ctx._chartInstance = new Chart(ctx, {
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
    loadStudentStats(),
    loadStudentAttendance(studentId),
    loadStudentMarks(studentId),
    loadBulletin(),
  ]);
}

async function loadStudentStats() {
  try {
    const stats = await apiRequest('GET', '/dashboard/api/student/stats');
    const { enrolled_courses, summary, activity_feed } = stats;

    animateCount('stu-stat-courses', summary.enrolled_courses_count);
    animateCount('stu-stat-pending', summary.pending_assignments);
    
    const attEl = document.getElementById('stu-stat-att');
    if (attEl) {
      attEl.textContent = summary.overall_att_pct !== null
        ? `${summary.overall_att_pct}%`
        : 'N/A';
    }

    const gpaEl = document.getElementById('stu-stat-gpa');
    if (gpaEl) {
      gpaEl.textContent = summary.gpa !== null
        ? `${summary.gpa} / 10.0`
        : 'N/A';
    }

    renderEnrolledCourses(enrolled_courses);
    renderBulletin(activity_feed);

  } catch (err) {
    console.error("Failed to load student stats", err);
    showToast('Failed to load dashboard stats.', 'danger');
  }
}

function renderEnrolledCourses(courses) {
  const container = document.getElementById('enrolledCoursesList');
  if (!container) return;

  if (!courses || courses.length === 0) {
    container.innerHTML = '<p class="text-muted small text-center py-3">No courses enrolled yet.</p>';
    return;
  }

  container.innerHTML = courses.map(c => {
    const attBadge = c.att_pct !== null
      ? `<span class="badge ${c.att_pct >= 75 ? 'bg-success' : c.att_pct >= 60 ? 'bg-warning text-dark' : 'bg-danger'} ms-1" style="font-size:.7rem;">${c.att_pct}% att</span>`
      : `<span class="badge bg-secondary ms-1" style="font-size:.7rem;">No att yet</span>`;
    const encodedCourse = escapeHtml(JSON.stringify(c));
    return `
      <div class="p-3 mb-2" style="background: var(--color-bg-base); border-radius: var(--radius-md);">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1 me-2">
            <span class="fw-bold d-block text-sm" style="color: var(--color-primary);">${escapeHtml(c.name)}</span>
            <span class="text-xs text-muted mt-1 d-block">Prof. ${escapeHtml(c.faculty_name)}</span>
            <div class="mt-1">${attBadge}</div>
          </div>
          <div class="d-flex flex-column align-items-end gap-2 flex-shrink-0">
            <span class="badge role-badge py-1 px-2" style="background: var(--color-bg-sunken); color: var(--color-primary);">${escapeHtml(c.code)}</span>
            <button class="btn btn-sm btn-link text-decoration-none p-0 text-xs fw-bold" style="color: var(--color-accent);" data-course="${encodedCourse}" onclick="showCourseDetails(this)">
              View Details <i class="bi bi-arrow-right-short"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function findOwnStudentId() {
  const el = document.querySelector('[data-student-id]');
  if (!el) return null;
  const id = parseInt(el.dataset.studentId, 10);
  // Guard against empty string (orphaned user with no profile) which parseInt
  // converts to NaN — treat as "no profile" rather than making a broken API call.
  if (isNaN(id)) return null;
  return { id };
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

function renderEmptyAttendance(msg = 'No attendance records available.') {
  const container = document.getElementById('subjectAttendance');
  if (container) {
    container.innerHTML = `<div class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>${escapeHtml(msg)}</div>`;
  }
}

function processAndRenderAttendance(records) {
  globalAttendanceRecords = records;
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
  if (lowSubjects.length > 0 && lowBanner && lowMsg) {
    // Build the message safely using textContent to avoid XSS
    lowMsg.textContent = ` You have low attendance (shortage) in: ${lowSubjects.map(s => s.code).join(', ')}.`;
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
        <td class="text-center fw-bold text-dark">${m.total_earned}</td>
        <td class="text-center fw-bold" style="color: var(--color-accent);">${m.grade}</td>
        <td class="text-center text-muted">${m.grade_point}</td>
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

function renderBulletin(activity_feed) {
  const list = document.getElementById('bulletinList');
  if (!list) return;

  if (!activity_feed || activity_feed.length === 0) {
    list.innerHTML = '<li class="bulletin-item text-muted small text-center py-3">No recent activity.</li>';
    return;
  }

  list.innerHTML = activity_feed.map((b, i) => `
    <li class="bulletin-item mb-3 pb-2 border-bottom border-light" style="border-left: 4px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-primary)'}; padding-left: 0.85rem; list-style: none;">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="activity-time text-xs text-muted">${escapeHtml(b.time)}</span>
        ${i === 0 ? '<span class="badge badge-pill badge-new">New</span>' : ''}
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

  const numeric = parseInt(targetValue, 10);
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

window.loadDashboardStats = loadDashboardStats;
// escapeHtml is defined globally in api.js which loads before this file.
// The local definition below is kept as a fallback only for pages that may
// not load api.js (currently none, but kept defensively).
if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
}

// ── Student Modals Logic ──

function showCourseDetails(btn) {
  try {
    const course = JSON.parse(btn.dataset.course);
    document.getElementById('cd-code').textContent = course.code;
    document.getElementById('cd-name').textContent = course.name;
    document.getElementById('cd-dept').textContent = course.department || 'N/A';
    document.getElementById('cd-sem').textContent = course.semester || 'N/A';
    document.getElementById('cd-faculty').textContent = course.faculty_name || 'Unassigned';
    document.getElementById('cd-fac-initial').textContent = course.faculty_name ? course.faculty_name.charAt(0).toUpperCase() : '?';

    const m = new bootstrap.Modal(document.getElementById('courseDetailsModal'));
    m.show();
  } catch (err) {
    console.error("Failed to parse course details", err);
  }
}

function showAttendanceModal() {
  attCurrentPage = 1;
  const searchInput = document.getElementById('attSearchInput');
  const statusFilter = document.getElementById('attStatusFilter');
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = 'all';
  
  renderAttendanceTable();
  const m = new bootstrap.Modal(document.getElementById('attendanceHistoryModal'));
  m.show();
}

function renderAttendanceTable() {
  const searchInput = document.getElementById('attSearchInput');
  const statusFilter = document.getElementById('attStatusFilter');
  
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  const status = statusFilter ? statusFilter.value : 'all';

  let filtered = globalAttendanceRecords.filter(r => {
    const matchesSearch = r.course_code.toLowerCase().includes(query) || (r.course_name && r.course_name.toLowerCase().includes(query));
    const matchesStatus = status === 'all' || r.status === status;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const maxPages = Math.ceil(total / attRecordsPerPage) || 1;
  if (attCurrentPage > maxPages) attCurrentPage = maxPages;

  const start = (attCurrentPage - 1) * attRecordsPerPage;
  const pageData = filtered.slice(start, start + attRecordsPerPage);

  const tbody = document.getElementById('attHistoryBody');
  if (tbody) {
    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5"><i class="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>No matching attendance records found.</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(r => {
        let badgeClass = 'bg-secondary';
        if (r.status === 'present') badgeClass = 'bg-success';
        if (r.status === 'late') badgeClass = 'bg-warning text-dark';
        if (r.status === 'absent') badgeClass = 'bg-danger';

        return `
          <tr>
            <td><span class="text-sm">${r.date}</span></td>
            <td><span class="fw-bold" style="color: var(--color-primary);">${escapeHtml(r.course_code)}</span></td>
            <td><span class="text-sm text-muted">${escapeHtml(r.course_name || '-')}</span></td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  const countEl = document.getElementById('attHistoryCount');
  if (countEl) countEl.textContent = `Showing ${total === 0 ? 0 : start + 1}-${Math.min(start + attRecordsPerPage, total)} of ${total} records`;

  const prevBtn = document.getElementById('attPrevBtn');
  const nextBtn = document.getElementById('attNextBtn');
  if (prevBtn) {
    prevBtn.disabled = attCurrentPage === 1;
    prevBtn.onclick = () => { attCurrentPage--; renderAttendanceTable(); };
  }
  if (nextBtn) {
    nextBtn.disabled = attCurrentPage === maxPages;
    nextBtn.onclick = () => { attCurrentPage++; renderAttendanceTable(); };
  }
}

async function showStudentProfileModal(event) {
  if (event) event.preventDefault();
  
  const studentData = await findOwnStudentId();
  if (!studentData) {
    showToast('Failed to load profile data.', 'danger');
    return;
  }
  
  try {
    const data = await apiRequest('GET', `/api/students/${studentData.id}`);
    
    document.getElementById('prof-id').value = data.id;
    document.getElementById('prof-name-display').textContent = data.full_name;
    document.getElementById('prof-email-display').textContent = data.roll_no;
    document.getElementById('prof-initial').textContent = data.full_name ? data.full_name.charAt(0).toUpperCase() : 'S';
    
    document.getElementById('prof-name').value = data.full_name || '';
    document.getElementById('prof-roll').value = data.roll_no || '';
    document.getElementById('prof-dept').value = data.dept || '';
    document.getElementById('prof-year').value = data.year || '';
    document.getElementById('prof-sec').value = data.section || '';
    document.getElementById('prof-phone').value = data.phone || '';
    
    const m = new bootstrap.Modal(document.getElementById('studentProfileModal'));
    m.show();
  } catch (err) {
    console.error(err);
    showToast('Could not fetch profile details.', 'danger');
  }
}

async function updateStudentProfile(event) {
  event.preventDefault();
  const form = event.target;
  const id = document.getElementById('prof-id').value;
  const btn = form.querySelector('button[type="submit"]');
  
  const payload = {
    phone: document.getElementById('prof-phone').value
  };

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

  try {
    await apiRequest('PUT', `/api/students/${id}`, payload);
    showToast('Profile updated successfully.', 'success');
    
    const m = bootstrap.Modal.getInstance(document.getElementById('studentProfileModal'));
    if (m) m.hide();
  } catch (err) {
    showToast(err.message || 'Failed to update profile.', 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const attSearch = document.getElementById('attSearchInput');
  if (attSearch) attSearch.addEventListener('input', () => { attCurrentPage = 1; renderAttendanceTable(); });
  
  const attStatus = document.getElementById('attStatusFilter');
  if (attStatus) attStatus.addEventListener('change', () => { attCurrentPage = 1; renderAttendanceTable(); });

  // Navigation Links Utility
  function setupNavLinks(linkId, sectionId, selector) {
    const link = document.getElementById(linkId);
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll(selector).forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  }

  // Admin links
  setupNavLinks('nav-students', 'section-students', '.sidebar-link');
  setupNavLinks('nav-faculty', 'section-faculty', '.sidebar-link');
  setupNavLinks('nav-courses', 'section-courses-manage', '.sidebar-link');
  setupNavLinks('mb-nav-students', 'section-students', '.mobile-nav-link');
  setupNavLinks('mb-nav-faculty', 'section-faculty', '.mobile-nav-link');
  setupNavLinks('mb-nav-courses', 'section-courses-manage', '.mobile-nav-link');

  // Faculty links
  setupNavLinks('nav-my-courses', 'section-my-courses', '.sidebar-link');
  setupNavLinks('nav-attendance-panel', 'section-attendance', '.sidebar-link');
  setupNavLinks('nav-marks-panel', 'section-marks', '.sidebar-link');
  setupNavLinks('mb-nav-my-courses', 'section-my-courses', '.mobile-nav-link');
  setupNavLinks('mb-nav-attendance-panel', 'section-attendance', '.mobile-nav-link');
  setupNavLinks('mb-nav-marks-panel', 'section-marks', '.mobile-nav-link');

  // Student links
  setupNavLinks('nav-my-attendance', 'section-my-attendance', '.sidebar-link');
  setupNavLinks('nav-my-marks', 'section-my-marks', '.sidebar-link');
  setupNavLinks('mb-nav-my-attendance', 'section-my-attendance', '.mobile-nav-link');
  setupNavLinks('mb-nav-my-marks', 'section-my-marks', '.mobile-nav-link');
});


