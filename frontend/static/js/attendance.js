/**
 * static/js/attendance.js
 * Faculty Attendance Panel logic.
 *
 * Responsibilities:
 *  1. Populate course dropdowns with faculty's own courses.
 *  2. Load student roster when a course + date are selected.
 *  3. Render toggle-grid of student cards (with 3-state toggle switches).
 *  4. "Mark All Present" button — sets every card to present.
 *  5. Submit batch attendance JSON to POST /api/attendance/
 *  6. Populate marks course dropdown and render editable marks table.
 *  7. Submit marks to POST /api/marks/
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Guard: only run on faculty dashboard
  if (!document.getElementById('attendancePanel')) return;

  initAttendancePanel();
  initMarksPanel();
});


// ═══════════════════════════════════════════════════════════════════════════
//  ATTENDANCE PANEL
// ═══════════════════════════════════════════════════════════════════════════

/** Per-student status map:  studentId → 'present' | 'absent' | 'late' */
let rosterStatus = {};
let currentRoster = [];

async function initAttendancePanel() {
  const courseSelect = document.getElementById('attCourseSelect');
  const dateInput    = document.getElementById('attDate');

  if (!courseSelect || !dateInput) return;

  // Default date to today
  dateInput.value = new Date().toISOString().slice(0, 10);

  // Load faculty courses
  try {
    const courses = await apiRequest('GET', '/api/courses/');
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.code} - ${c.name}`;
      courseSelect.appendChild(opt);
    });
  } catch (err) {
    showToast(`Failed to load courses: ${err.message}`, 'danger');
  }

  // Load roster button
  document.getElementById('loadRosterBtn')?.addEventListener('click', loadRoster);

  // Mark all present
  document.getElementById('markAllPresentBtn')?.addEventListener('click', markAllPresent);

  // Submit attendance
  document.getElementById('submitAttendanceBtn')?.addEventListener('click', submitAttendance);
}

async function loadRoster() {
  const courseId = document.getElementById('attCourseSelect').value;
  if (!courseId) {
    showToast('Please select a course.', 'warning');
    return;
  }

  const rosterContainer = document.getElementById('rosterContainer');
  const rosterEmpty     = document.getElementById('rosterEmpty');
  const rosterGrid      = document.getElementById('rosterGrid');
  const rosterCount     = document.getElementById('rosterCount');

  if (!rosterContainer || !rosterEmpty || !rosterGrid || !rosterCount) return;

  rosterContainer.style.display = 'none';
  rosterEmpty.style.display = 'none';
  rosterGrid.innerHTML = '<div class="skeleton-item">Loading students…</div>';

  try {
    const enrolled = await apiRequest('GET', `/api/courses/${courseId}/students`);

    currentRoster = enrolled;
    rosterStatus = {};
    currentRoster.forEach(s => { rosterStatus[s.id] = 'present'; });

    if (currentRoster.length === 0) {
      rosterEmpty.style.display = '';
      return;
    }

    renderRosterGrid();
    rosterCount.textContent = `${currentRoster.length} students`;
    rosterContainer.style.display = '';

  } catch (err) {
    showToast(`Error loading roster: ${err.message}`, 'danger');
    rosterGrid.innerHTML = '';
  }
}

function renderRosterGrid() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  grid.innerHTML = '';

  currentRoster.forEach(student => {
    const status = rosterStatus[student.id] ?? 'present';

    const card = document.createElement('div');
    card.className = `roster-card ${status}-active`;
    card.dataset.studentId = student.id;
    card.innerHTML = `
      <div class="roster-card-avatar">${(student.full_name || '?')[0].toUpperCase()}</div>
      <div class="roster-card-info">
        <div class="roster-card-name">${escapeHtml(student.full_name)}</div>
        <div class="roster-card-roll">${escapeHtml(student.roll_no)}</div>
      </div>
      <div class="toggle-switch-3state mt-2" onclick="event.stopPropagation();">
        <div class="toggle-option">
          <input type="radio" name="att_${student.id}" id="att_${student.id}_p" value="present" ${status === 'present' ? 'checked' : ''}>
          <label class="toggle-label lbl-present" for="att_${student.id}_p">P</label>
        </div>
        <div class="toggle-option">
          <input type="radio" name="att_${student.id}" id="att_${student.id}_l" value="late" ${status === 'late' ? 'checked' : ''}>
          <label class="toggle-label lbl-late" for="att_${student.id}_l">L</label>
        </div>
        <div class="toggle-option">
          <input type="radio" name="att_${student.id}" id="att_${student.id}_a" value="absent" ${status === 'absent' ? 'checked' : ''}>
          <label class="toggle-label lbl-absent" for="att_${student.id}_a">A</label>
        </div>
      </div>
    `;

    card.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selected = e.target.value;
        rosterStatus[student.id] = selected;
        card.className = `roster-card ${selected}-active`;
      });
    });

    grid.appendChild(card);
  });
}

function markAllPresent() {
  currentRoster.forEach(s => {
    rosterStatus[s.id] = 'present';
    const radio = document.getElementById(`att_${s.id}_p`);
    if (radio) radio.checked = true;
    const card = document.querySelector(`.roster-card[data-student-id="${s.id}"]`);
    if (card) card.className = 'roster-card present-active';
  });
  showToast('All students marked as Present.', 'success', 2000);
}

async function submitAttendance() {
  const courseId = document.getElementById('attCourseSelect').value;
  const date     = document.getElementById('attDate').value;
  const btn      = document.getElementById('submitAttendanceBtn');
  const msgEl    = document.getElementById('attMsg');

  if (!courseId || !date || !btn || !msgEl) {
    showToast('Please select a course and date.', 'warning');
    return;
  }

  const records = currentRoster.map(s => ({
    student_id: s.id,
    status: rosterStatus[s.id] ?? 'present',
  }));

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting…';

  try {
    const result = await apiRequest('POST', '/api/attendance/', {
      course_id: parseInt(courseId),
      date,
      records,
    });
    showToast(result.message || 'Attendance saved!', 'success');
    msgEl.innerHTML = `<span class="text-success small"><i class="bi bi-check-circle me-1"></i>${result.message}</span>`;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
    msgEl.innerHTML = `<span class="text-danger small">${err.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Submit Attendance';
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  MARKS PANEL
// ═══════════════════════════════════════════════════════════════════════════

let marksRoster = [];

async function initMarksPanel() {
  const marksCourseSelect = document.getElementById('marksCourseSelect');
  if (!marksCourseSelect) return;

  // Populate marks course dropdown (same courses as attendance)
  try {
    const courses = await apiRequest('GET', '/api/courses/');
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.code} - ${c.name}`;
      marksCourseSelect.appendChild(opt);
    });
  } catch (_) { /* handled elsewhere */ }

  // Default academic year
  const yr = new Date().getFullYear();
  const ayInput = document.getElementById('academicYear');
  if (ayInput && !ayInput.value) {
    ayInput.value = `${yr}-${yr + 1}`;
  }

  document.getElementById('loadMarksRosterBtn')?.addEventListener('click', loadMarksRoster);
  document.getElementById('submitMarksBtn')?.addEventListener('click', submitMarks);
}

async function loadMarksRoster() {
  const courseId      = document.getElementById('marksCourseSelect').value;
  const academicYear  = document.getElementById('academicYear').value.trim();
  const container     = document.getElementById('marksTableContainer');
  const tbody         = document.getElementById('marksTableBody');

  if (!courseId) { showToast('Please select a course.', 'warning'); return; }
  if (!academicYear) { showToast('Please enter an academic year.', 'warning'); return; }
  if (!container || !tbody) return;

  container.style.display = 'none';
  tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="skeleton-item">Loading students…</div></td></tr>';

  try {
    const enrolled = await apiRequest('GET', `/api/courses/${courseId}/students`);
    marksRoster = enrolled;

    // Pre-fetch existing marks for this course
    let existingMarks = [];
    try {
      existingMarks = await apiRequest('GET', `/api/marks/course/${courseId}`);
    } catch (_) { existingMarks = []; }

    const marksMap = {};
    existingMarks.forEach(m => { marksMap[m.student_id] = m; });

    tbody.innerHTML = '';

    if (marksRoster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No students are enrolled in this course yet.</td></tr>';
      container.style.display = '';
      return;
    }

    marksRoster.forEach(student => {
      const existing = marksMap[student.id] || {};
      const tr = document.createElement('tr');
      tr.dataset.studentId = student.id;
      tr.innerHTML = `
        <td><span class="fw-semibold text-primary-scms">${escapeHtml(student.full_name)}</span></td>
        <td><span class="badge role-badge">${escapeHtml(student.roll_no)}</span></td>
        <td class="text-center"><input type="number" class="form-control scms-input text-center marks-field"
            data-field="internal_1" min="0" max="25" value="${existing.internal_1 ?? 0}" style="width:70px;margin:auto;" /></td>
        <td class="text-center"><input type="number" class="form-control scms-input text-center marks-field"
            data-field="internal_2" min="0" max="25" value="${existing.internal_2 ?? 0}" style="width:70px;margin:auto;" /></td>
        <td class="text-center"><input type="number" class="form-control scms-input text-center marks-field"
            data-field="semester_final" min="0" max="75" value="${existing.semester_final ?? 0}" style="width:70px;margin:auto;" /></td>
        <td class="text-center"><input type="number" class="form-control scms-input text-center marks-field"
            data-field="practical" min="0" max="50" value="${existing.practical ?? 0}" style="width:70px;margin:auto;" /></td>
      `;
      tbody.appendChild(tr);
    });

    container.style.display = '';
  } catch (err) {
    showToast(`Error loading students: ${err.message}`, 'danger');
    tbody.innerHTML = '';
  }
}

async function submitMarks() {
  const courseId      = document.getElementById('marksCourseSelect').value;
  const academicYear  = document.getElementById('academicYear').value.trim();
  const btn           = document.getElementById('submitMarksBtn');
  const msgEl         = document.getElementById('marksMsg');
  const rows          = document.querySelectorAll('#marksTableBody tr');

  if (!btn || !msgEl) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
  msgEl.innerHTML = '';

  let saved = 0, errors = 0;
  const rowArray = Array.from(rows);
  const chunkSize = 5;

  // Process rows in chunks to prevent browser connection pool exhaustion and rate-limiting blocks (HTTP 429)
  for (let i = 0; i < rowArray.length; i += chunkSize) {
    const chunk = rowArray.slice(i, i + chunkSize);
    const promises = chunk.map(async (row) => {
      const studentId = row.dataset.studentId;
      const fields = {};
      row.querySelectorAll('.marks-field').forEach(input => {
        fields[input.dataset.field] = parseInt(input.value) || 0;
      });
      try {
        await apiRequest('POST', '/api/marks/', {
          student_id:   parseInt(studentId),
          course_id:    parseInt(courseId),
          academic_year: academicYear,
          ...fields,
        });
        saved++;
      } catch (_) {
        errors++;
      }
    });
    await Promise.all(promises);
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Save Marks';

  if (errors === 0) {
    showToast(`Marks saved successfully for ${saved} students.`, 'success');
    msgEl.innerHTML = `<span class="text-success small"><i class="bi bi-check-circle me-1"></i>All records saved.</span>`;
  } else {
    showToast(`${saved} saved, ${errors} failed.`, 'warning');
    msgEl.innerHTML = `<span class="text-warning small">${saved} saved, ${errors} errors.</span>`;
  }
}

// ── Helpers ──
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
