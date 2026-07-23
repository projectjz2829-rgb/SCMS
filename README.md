# SCMS — Student Campus Management System

SCMS is an enterprise-grade academic management system built with Flask, React, TypeScript, and SQLAlchemy.

## Features

- **Role-Based Access Control (RBAC):** Admin, Faculty, and Student roles with strict IDOR protections.
- **Academic Management:** Course management, enrollment tracking, attendance marking, and marks entry.
- **Reports & Transcripts:** PDF transcript generation, attendance CSV exports, and marks CSV exports.
- **Analytics & Dashboards:** Real-time role-scoped dashboard metrics (average attendance, CGPA distribution, department statistics).
- **Audit Logging:** System activity logs tracking key administrative actions.

## Technology Stack

- **Backend:** Python 3.11/3.12, Flask, Flask-SQLAlchemy, Flask-Login, Alembic, Gunicorn.
- **Frontend:** React 19, TypeScript 5, Vite 8, TailwindCSS 4, Lucide Icons, Recharts.
- **Database:** PostgreSQL (Production on Render) / SQLite (Local development).

## Quick Start (Local Development)

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m app.main
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment (Render)

Render deploys directly from `origin/release/frontend-finalization` using `start.sh`:
- Automatic database table bootstrap
- Static asset serving via Flask from `backend/app/static/dist/`
- Production Gunicorn WSGI server execution