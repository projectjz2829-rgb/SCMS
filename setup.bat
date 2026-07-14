@echo off
REM ============================================================
REM  SCMS — Smart Campus Management System
REM  Setup script — development environment bootstrapper
REM  Run from the repo root: setup.bat
REM ============================================================
cd /d "%~dp0"

echo.
echo  ====================================================
echo   SCMS Setup — Smart Campus Management System
echo  ====================================================
echo.

REM ── Step 0: Check Python ──────────────────────────────────────────────────
echo [0/6] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+.
    pause & exit /B 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo        Found: %%v
echo.

REM ── Step 1: Download offline visual assets ───────────────────────────────
echo [1/6] Downloading offline visual assets...
python download_assets.py
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Asset download failed - continuing without cached assets.
    echo           Run 'python download_assets.py' manually with internet access.
)
echo.

REM ── Enter backend directory ───────────────────────────────────────────────
cd backend

REM ── Set DATABASE_URL if not already provided ──────────────────────────────
if not "%DATABASE_URL%"=="" goto db_url_set
set DB_PATH=%CD%\instance\campus.db
set DB_PATH=%DB_PATH:\=/%
set DATABASE_URL=sqlite:///%DB_PATH%
echo [INFO] DATABASE_URL not set — defaulting to SQLite: %DATABASE_URL%
:db_url_set

REM ── Ensure instance directory exists ──────────────────────────────────────
if not exist instance mkdir instance

REM ── Step 2: Install Python dependencies ──────────────────────────────────
echo [2/6] Installing Python dependencies...
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pip install failed. Check your internet connection or requirements.txt.
    pause & exit /B 1
)
echo       [OK] Dependencies installed.
echo.

REM ── Step 3: Initialise and upgrade Flask-Migrate ─────────────────────────
echo [3/6] Initialising database migrations...
set FLASK_APP=run.py
set FLASK_ENV=development

if not exist migrations (
    echo       Running: flask db init
    python -m flask db init
    echo       Running: flask db migrate -m "Initial schema"
    python -m flask db migrate -m "Initial schema"
)
python -m flask db upgrade
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database migration failed.
    pause & exit /B 1
)
echo       [OK] Database schema is up to date.
echo.

REM ── Step 4: Seed default admin account ───────────────────────────────────
echo [4/6] Creating default admin account...
REM Password can be overridden by ADMIN_PASSWORD env var or --password flag.
REM The seed script will use ADMIN_PASSWORD if set, else "Admin@SCMS2024!".
if defined ADMIN_PASSWORD (
    python ../database/seed_admin.py --password "%ADMIN_PASSWORD%"
) else (
    python ../database/seed_admin.py --password Admin@1234
)
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Admin seeding failed. Check database connectivity.
    pause & exit /B 1
)
echo       [OK] Admin account ready.
echo.

REM ── Step 5: Run test suite ────────────────────────────────────────────────
echo [5/6] Running test suite...
python -m pytest tests/ -v --tb=short -q 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some tests failed — review output above before deploying.
    echo           Continuing to start development server...
) else (
    echo       [OK] All tests passed.
)
echo.

REM ── Step 6: Launch development server ────────────────────────────────────
echo [6/6] Launching development server...
echo.
echo  ====================================================
echo   SCMS is ready!
echo   Open: http://127.0.0.1:5000
echo   Admin: admin@scms.edu / Admin@1234
echo   Press Ctrl+C to stop the server.
echo  ====================================================
echo.
python run.py
