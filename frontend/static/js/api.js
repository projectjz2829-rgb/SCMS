/**
 * static/js/api.js
 * Centralised fetch utility for the SCMS frontend.
 * Automatically attaches the CSRF token and credentials to every request.
 * Exported globally — all other JS files depend on this being loaded first.
 */

'use strict';

// ── CSRF token (read from meta tag set by Jinja2) ─────────────────────────
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

/**
 * Make an authenticated API request.
 *
 * @param {string} method  - HTTP verb: 'GET', 'POST', 'PUT', 'DELETE'
 * @param {string} url     - Relative URL, e.g. '/api/students/'
 * @param {Object|null} data - JSON-serialisable payload (omit for GET)
 * @returns {Promise<any>}  Parsed JSON response
 * @throws  {Error}         On non-2xx HTTP status (message includes status code + body)
 */
async function apiRequest(method, url, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    credentials: 'same-origin',
  };

  if (data !== null) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);

  // Try to parse JSON even on error responses for richer error messages
  let body;
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const msg = (body && body.error) ? body.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

// ── Toast utility ─────────────────────────────────────────────────────────
/**
 * Show a transient toast notification.
 *
 * @param {string} message - Text to display
 * @param {'success'|'danger'|'warning'|'info'} type
 * @param {number} duration - Auto-dismiss after ms (default 3500)
 */
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('scmsToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'scmsToastContainer';
    container.className = 'scms-toast-container';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'bi-check-circle-fill',
    danger:  'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info:    'bi-info-circle-fill',
  };

  const toast = document.createElement('div');
  toast.className = `scms-toast ${type}`;

  // Use DOM construction (not innerHTML) so message is treated as text,
  // never as HTML — prevents XSS from crafted API error messages.
  const icon = document.createElement('i');
  icon.className = `bi ${iconMap[type] ?? 'bi-info-circle-fill'}`;
  const span = document.createElement('span');
  span.className = 'toast-message';
  span.textContent = message;   // ← safe: textContent, not innerHTML
  toast.appendChild(icon);
  toast.appendChild(span);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


// ── Format helpers ────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch (_) {
    return '-';
  }
}

function formatPct(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${Math.round(value)}%`;
}

// ── HTML escaping utility (defined here so it is available before any
//    page-specific script loads — attendance.js and dashboard.js both
//    rely on this and may load in any order) ────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose globally
window.apiRequest  = apiRequest;
window.showToast   = showToast;
window.formatDate  = formatDate;
window.formatPct   = formatPct;
window.csrfToken   = csrfToken;
window.escapeHtml  = escapeHtml;
