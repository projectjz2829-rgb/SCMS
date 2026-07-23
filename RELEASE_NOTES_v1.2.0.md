# RELEASE NOTES — SCMS v1.2.0 Enterprise Stable

## Executive Overview
SCMS v1.2.0 Enterprise Stable marks the production release of the Student Campus Management System. This version represents a complete stabilization and hardening cycle across 6 release patches.

---

## Key Milestone Highlights

### Patch 1 — Production Infrastructure & Recovery
- Added missing `/api/` prefix to all `reportsApi` endpoints.
- Added global chunk load recovery in `main.tsx` for SPA routing.
- Cleaned legacy settings UI options.

### Patch 2 — Faculty Backend Integration & Course Scoping
- Restricted `GET /api/courses/` for Faculty role to only show assigned courses.
- Created `GET /api/reports/students` endpoint for role-safe transcript searches.
- Updated `Reports.tsx` with debounced search and role permissions.

### Patch 3 — Student Portal Completion & Profile Integration
- Integrated real student profile fetching in `Profile.tsx`.
- Created read-only `StudentAttendance.tsx` and `StudentMarks.tsx` components.
- Fixed 403 authorization error on `StudentDashboard.tsx` marks widget.
- Introduced `RoleSwitch` route wrapper in `App.tsx`.

### Patch 4 — Production Hardening & Code Quality
- Added ESLint configuration (`eslint.config.js`) and TypeScript rules.
- Extended API layer with `AbortSignal` support for request cancellation.
- Reusable `ModalForm` and `BulkEntryTable` components.
- Calculated dynamic attendance percentages for backend dashboard statistics.

### Patch 5 — Final Stabilization & Bugfixes
- Resolved `facultyApi.getAll()` 403 error on Courses page for Faculty role.
- Complete removal of legacy Theme settings across frontend and backend.
- Hardened password update form with client-side length (>=8) and matching confirmation checks.

### Patch 6 — Final Zero-Defect Production Audit
- Conducted full-repository audit across all 28 API endpoints and 21 React components.
- Verified zero unhandled promise rejections, memory leaks, or missing error states.
- Verified static asset build integration at `backend/app/static/dist/`.
