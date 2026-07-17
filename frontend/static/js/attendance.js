/**
 * static/js/attendance.js
 * Faculty Attendance & Marks Panel logic.
 *
 * Responsibilities:
 *  1. Course dropdowns are already populated by dashboard.js → populateCourseSelects().
 *     This file does NOT re-fetch courses; it only wires button event listeners.
 *  2. Load student roster when a course + date are selected (Load Roster).
 *  3. Render toggle-grid of student cards (3-state: P / L / A).
 *  4. "Mark All Present" sets every card to present.
 *  5. Submit batch attendance JSON to POST /api/attendance/
 *  6. Populate marks table for a course and render editable inputs.
 *  7. Submit marks to POST /api/marks/ (which upserts internally).
 */

'use strict';

// ─── Module state ─────────────────────────────────────────────────────────── //

/** Per-student status map: studentId → 'present' | 'absent' | 'late' */
let rosterStatus  = {};
let currentRoster = [];
let marksRoster   = [];

// ─── Entry point ──────────────────────────────────────────────────────────── //

/**
 * Called from dashboard.js after course dropdowns have been populated.
 * Falls back to DOMContentLoaded if dashboard.js didn't call it.
 */
function initAttendanceAndMarks() {
  if (!document.getElementById('section-attendance')) return;
  _wireAttendancePanel();
  _wireMarksPanel();
}

// Wire up as a fallback in case dashboard.js doesn't call initAttendanceAndMarks()
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('section-attendance')) return;

  // Set default date to today
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

  // If dashboard.js has already populated the selects, wire immediately.
  // Otherwise wait for the custom event fired by dashboard.js.
  const attSelect = document.getElementById('attCourseSelect');
  if (attSelect && attSelect.options.length > 1) {
    // Already populated
    _wireAttendancePanel();
    _wireMarksPanel();
  } else {
    // Wait for dashboard.js to signal that course selects are ready
    document.addEventListener('coursesReady', () => {
      _wireAttendancePanel();
      _wireMarksPanel();
    }, { once: true });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
//  ATTENDANCE PANEL
// ═══════════════════════════════════════════════════════════════════════════

function _wireAttendancePanel() {
  // Reset roster whenever course or date changes
  document.getElementById('attCourseSelect')?.addEventListener('change', _resetRoster);
  document.getElementById('attDate')?.addEventListener('change', _resetRoster);

  document.getElementById('loadRosterBtn')?.addEventListener('click', loadRoster);
  document.getElementById('markAllPresentBtn')?.addEventListener('click', markAllPresent);
  document.getElementById('submitAttendanceBtn')?.addEventListener('click', submitAttendance);
}

function _resetRoster() {
  currentRoster = [];
  rosterStatus  = {};
  const rosterContainer = document.getElementById('rosterContainer');
  const rosterEmpty     = document.getElementById('rosterEmpty');
  const rosterGrid      = document.getElementById('rosterGrid');
  const attMsg          = document.getElementById('attMsg');
  if (rosterContainer) rosterContainer.style.display = 'none';
  if (rosterEmpty)     rosterEmpty.style.display     = 'none';
  if (rosterGrid)      rosterGrid.innerHTML          = '';
  if (attMsg)          attMsg.innerHTML              = '';
}

async function loadRoster() {
  const courseId = document.getElementById('attCourseSelect')?.value;
  const date     = document.getElementById('attDate')?.value;

  if (!courseId) { showToast('Please select a course.', 'warning'); return; }
  if (!date)     { showToast('Please select a date.', 'warning'); return; }

  const rosterContainer = document.getElementById('rosterContainer');
  const rosterEmpty     = document.getElementById('rosterEmpty');
  const rosterGrid      = document.getElementById('rosterGrid');
  const rosterCount     = document.getElementById('rosterCount');

  if (!rosterContainer || !rosterEmpty || !rosterGrid || !rosterCount) return;

  // Reset UI
  rosterContainer.style.display = 'none';
  rosterEmpty.style.display     = 'none';
  rosterGrid.innerHTML = `
    <div class="skeleton-item" style="height: 120px; width: 100%;"></div>
    <div class="skeleton-item" style="height: 120px; width: 100%;"></div>
    <div class="skeleton-item" style="height: 120px; width: 100%;"></div>
  `;

  try {
    // 1. Fetch enrolled students
    const enrolled = await apiRequest('GET', `/api/courses/${courseId}/students`);
    currentRoster  = enrolled;
    rosterStatus   = {};

    if (currentRoster.length === 0) {
      rosterGrid.innerHTML = '';
      rosterEmpty.style.display = '';
      return;
    }

    // 2. Pre-fill status from existing attendance records for that date
    let existingByStudent = {};
    try {
      const existing = await apiRequest('GET', `/api/attendance/${courseId}`);
      const dayRecords = existing.filter(r => r.date === date);
      dayRecords.forEach(r => { existingByStudent[r.student_id] = r.status; });
    } catch (_) { /* no prior records — default to present */ }

    currentRoster.forEach(s => {
      rosterStatus[s.id] = existingByStudent[s.id] ?? 'present';
    });

    renderRosterGrid();
    rosterCount.textContent = `${currentRoster.length} student${currentRoster.length !== 1 ? 's' : ''}`;
    rosterContainer.style.display = '';

  } catch (err) {
    rosterGrid.innerHTML = `<p class="text-danger small text-center py-2">${escapeHtml(err.message)}</p>`;
    showToast(`Error loading roster: ${escapeHtml(err.message)}`, 'danger');
  }
}

function renderRosterGrid() {
  const grid = document.getElementById('rosterGrid');
  if (!grid) return;
  grid.innerHTML = '';

  currentRoster.forEach(student => {
    const status = rosterStatus[student.id] ?? 'present';
    const card   = document.createElement('div');
    card.className       = `roster-card ${status}-active`;
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
      radio.addEventListener('change', e => {
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
  const courseId = document.getElementById('attCourseSelect')?.value;
  const date     = document.getElementById('attDate')?.value;
  const btn      = document.getElementById('submitAttendanceBtn');
  const msgEl    = document.getElementById('attMsg');

  if (!courseId || !date) {
    showToast('Please select a course and date.', 'warning');
    return;
  }
  if (currentRoster.length === 0) {
    showToast('Load the roster before submitting.', 'warning');
    return;
  }
  if (!btn || !msgEl) return;

  const records = currentRoster.map(s => ({
    student_id: s.id,
    status: rosterStatus[s.id] ?? 'present',
  }));

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting…';
  msgEl.innerHTML = '';

  try {
    const result = await apiRequest('POST', '/api/attendance/', {
      course_id: parseInt(courseId, 10),
      date,
      records,
    });
    const msg = result.message || 'Attendance saved!';
    showToast(msg, 'success');
    msgEl.innerHTML = `<span class="text-success small"><i class="bi bi-check-circle me-1"></i>${escapeHtml(msg)}</span>`;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
    msgEl.innerHTML = `<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>${escapeHtml(err.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Submit Attendance';
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  MARKS PANEL
// ═══════════════════════════════════════════════════════════════════════════

function _wireMarksPanel() {
  // Reset marks table on course change
  document.getElementById('marksCourseSelect')?.addEventListener('change', _resetMarksTable);
  document.getElementById('loadMarksRosterBtn')?.addEventListener('click', loadMarksRoster);
  document.getElementById('submitMarksBtn')?.addEventListener('click', submitMarks);
}

function _resetMarksTable() {
  marksRoster = [];
  const container = document.getElementById('marksTableContainer');
  const tbody     = document.getElementById('marksTableBody');
  const marksMsg  = document.getElementById('marksMsg');
  if (container) container.style.display = 'none';
  if (tbody)     tbody.innerHTML         = '';
  if (marksMsg)  marksMsg.innerHTML      = '';
}

async function loadMarksRoster() {
  const courseId     = document.getElementById('marksCourseSelect')?.value;
  const academicYear = document.getElementById('academicYear')?.value.trim();
  const container    = document.getElementById('marksTableContainer');
  const tbody        = document.getElementById('marksTableBody');

  if (!courseId)     { showToast('Please select a course.', 'warning'); return; }
  if (!academicYear) { showToast('Please enter an academic year (e.g. 2024-2025).', 'warning'); return; }
  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    showToast('Academic year must be in YYYY-YYYY format (e.g. 2024-2025).', 'warning');
    return;
  }
  if (!container || !tbody) return;

  container.style.display = 'none';
  tbody.innerHTML = `
    <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
    <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
    <tr class="table-skeleton"><td colspan="6"><div class="skeleton-line"></div></td></tr>
  `;

  try {
    // 1. Get enrolled students
    const enrolled = await apiRequest('GET', `/api/courses/${courseId}/students`);
    marksRoster = enrolled;

    // 2. Pre-fetch existing marks for this course (all years; filter in JS)
    let existingMarks = [];
    try {
      existingMarks = await apiRequest('GET', `/api/marks/course/${courseId}`);
    } catch (_) { existingMarks = []; }

    // Build a map: student_id → marks record (for the requested academic year)
    const marksMap = {};
    existingMarks
      .filter(m => m.academic_year === academicYear)
      .forEach(m => { marksMap[m.student_id] = m; });

    tbody.innerHTML = '';

    if (marksRoster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No students are enrolled in this course yet.</td></tr>';
      container.style.display = '';
      return;
    }

    marksRoster.forEach(student => {
      const ex  = marksMap[student.id] || {};
      const tr  = document.createElement('tr');
      tr.dataset.studentId = student.id;
      // Store existing marks id for potential PUT (update) detection
      if (ex.id) tr.dataset.marksId = ex.id;

      tr.innerHTML = `
        <td><span class="fw-semibold text-primary-scms">${escapeHtml(student.full_name)}</span></td>
        <td><span class="badge role-badge">${escapeHtml(student.roll_no)}</span></td>
        <td class="text-center">
          <input type="number" class="form-control scms-input text-center marks-field"
              data-field="internal_1" min="0" max="25" value="${ex.internal_1 ?? 0}" style="width:70px;margin:auto;" />
        </td>
        <td class="text-center">
          <input type="number" class="form-control scms-input text-center marks-field"
              data-field="internal_2" min="0" max="25" value="${ex.internal_2 ?? 0}" style="width:70px;margin:auto;" />
        </td>
        <td class="text-center">
          <input type="number" class="form-control scms-input text-center marks-field"
              data-field="semester_final" min="0" max="75" value="${ex.semester_final ?? 0}" style="width:70px;margin:auto;" />
        </td>
        <td class="text-center">
          <input type="number" class="form-control scms-input text-center marks-field"
              data-field="practical" min="0" max="50" value="${ex.practical ?? 0}" style="width:70px;margin:auto;" />
        </td>
      `;

      // Client-side range validation: clamp on blur
      tr.querySelectorAll('.marks-field').forEach(input => {
        input.addEventListener('blur', () => {
          const max = parseInt(input.max, 10);
          const min = parseInt(input.min, 10);
          let val   = parseInt(input.value, 10);
          if (isNaN(val)) val = 0;
          input.value = Math.max(min, Math.min(max, val));
        });
      });

      tbody.appendChild(tr);
    });

    container.style.display = '';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">${escapeHtml(err.message)}</td></tr>`;
    showToast(`Error loading students: ${err.message}`, 'danger');
  }
}

async function submitMarks() {
  const courseId     = document.getElementById('marksCourseSelect')?.value;
  const academicYear = document.getElementById('academicYear')?.value.trim();
  const btn          = document.getElementById('submitMarksBtn');
  const msgEl        = document.getElementById('marksMsg');
  const rows         = document.querySelectorAll('#marksTableBody tr[data-student-id]');

  if (!btn || !msgEl) return;
  if (!courseId)     { showToast('Please select a course.', 'warning'); return; }
  if (!academicYear) { showToast('Please enter an academic year.', 'warning'); return; }
  if (rows.length === 0) {
    showToast('Load students before saving marks.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
  msgEl.innerHTML = '';

  try {
    // Collect all payloads first (synchronous, no await)
    const payloads = Array.from(rows).map(row => {
      const fields = {};
      row.querySelectorAll('.marks-field').forEach(input => {
        fields[input.dataset.field] = parseInt(input.value, 10) || 0;
      });
      return {
        student_id:    parseInt(row.dataset.studentId, 10),
        course_id:     parseInt(courseId, 10),
        academic_year: academicYear,
        ...fields,
      };
    });

    // Send all in parallel (POST /api/marks/ upserts — safe to call for new or existing)
    const results = await Promise.allSettled(
      payloads.map(p => apiRequest('POST', '/api/marks/', p))
    );

    const saved  = results.filter(r => r.status === 'fulfilled').length;
    const errors = results.filter(r => r.status === 'rejected').length;
    const firstError = results.find(r => r.status === 'rejected')?.reason?.message;

    if (errors === 0) {
      showToast(`Marks saved for ${saved} student${saved !== 1 ? 's' : ''}.`, 'success');
      msgEl.innerHTML = `<span class="text-success small"><i class="bi bi-check-circle me-1"></i>All ${saved} records saved successfully.</span>`;
    } else if (saved > 0) {
      showToast(`${saved} saved, ${errors} failed.`, 'warning');
      msgEl.innerHTML = `<span class="text-warning small">${saved} saved, ${errors} errors. First error: ${escapeHtml(firstError || 'unknown')}</span>`;
    } else {
      showToast(`Failed to save marks. ${firstError || ''}`, 'danger');
      msgEl.innerHTML = `<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>${escapeHtml(firstError || 'All submissions failed.')}</span>`;
    }
  } catch (err) {
    showToast(`Unexpected error: ${err.message}`, 'danger');
    msgEl.innerHTML = `<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>${escapeHtml(err.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Save Marks';
  }
}

// ─── Export for dashboard.js to call after populateCourseSelects ─────────── //
window.initAttendanceAndMarks = initAttendanceAndMarks;
