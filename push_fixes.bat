@echo off
echo ============================
echo  SCMS Production Fix Push
echo ============================
cd /d "c:\Users\moham\OneDrive\Desktop\project\SCMS\SCMS-main"
git add -A
git commit -m "fix: production audit - critical and sanity bugs fixed

CRITICAL FIXES:
- admin.html: Delete Student/Faculty modals were outside the Jinja2 content block and silently dropped by template engine. Modals never rendered, making Delete buttons non-functional. Moved inside block.
- students.py / faculty.py: delete_student and delete_faculty only deleted the profile record, leaving the User account alive. Deleted users could still log in. Fixed to delete the User (cascades to profile).
- students.py: Added validation for the 'year' parameter in the update student (PUT) endpoint to prevent database errors and logic inconsistency.
- dashboard.js: findOwnStudentId returned {id: NaN} for orphaned users, causing a broken /api/students/NaN/attendance request. Fixed parseInt guard.
- attendance.js: Same NaN risk for facultyId in initAttendancePanel and initMarksPanel. Added isNaN guard with fallback.
- dashboard.js: stat-attendance accumulated extra %% on every 60s refresh because setTimeout read textContent after animation. Fixed to write final value directly.
- start.sh: flask db upgrade running on Render under set -e could crash the deployment startup when no migrations exist. Appended fallback to ignore upgrade errors safely.

OTHER FIXES:
- campus.css: Added missing --color-primary-dark CSS variable. Added .text-primary-scms and .text-accent utility classes. Hid the mobile bottom navigation menu bar by default on desktop/tablet views to prevent visual layout breaking.
- app/__init__.py: 403/404/429 error handlers now return HTML for browser navigation and JSON only for API requests (previously always returned JSON, showing raw JSON to users navigating to wrong URLs).
- wsgi.py: Fixed contradictory docstring, admin email now reads from ADMIN_EMAIL env var for Render deployment consistency.
- seed_admin.py & setup.bat: Normalized default admin email/password to 'admin@scms.edu' / 'Admin@1234' to match wsgi.py and README.md.
- forms.py: Removed minimum length validation on login password to prevent lockouts. Refactored RegisterForm to run standard and conditional validation in a single pass (avoiding double-pass error refresh loops).
- routes.py: Added preemptive duplicate checks for roll_no and emp_id in the register endpoint to show user-friendly error messages and protect database transaction history.
- api.js: Added try-catch and isNaN validation to the formatDate helper to make date parsing robust against invalid dates.
- courses.py: Safe type handling/coercion to string for 'name', 'code', and 'dept' operations in both POST (create) and PUT (update) endpoints to prevent server crashes on non-string inputs. Added automatic cleanup of linked student marks and attendance records upon unenrollment.
- attendance.py: Added case-insensitive enum lookup logic for student attendance status codes to prevent unintended defaults or 400 errors.
- students.py & faculty.py: Added phone number format validation on PUT updates to prevent malformed data from being saved in the database. Added robust string coercion checks on POST creation inputs to prevent AttributeError crashes.
- decorators.py: Hardened role_required decorator by validating is_authenticated before accessing current_user.role to prevent server crashes if decorators are ordered incorrectly.
- attendance.py & marks.py: Verified student enrollment in the course before allowing attendance or marks to be registered.
- marks.py: Added regex format validation on 'academic_year' input parameter (e.g. YYYY-YYYY) to prevent database DataError crashes from too-long values.
- Created frontend/templates/errors/400.html, 403.html, 404.html, 429.html, 500.html.
- Updated README.md with full production documentation."
git push origin main
echo.
echo Done! Check Render for deployment status.
pause
