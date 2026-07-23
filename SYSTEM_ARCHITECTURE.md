# SYSTEM ARCHITECTURE — SCMS Enterprise

## 1. Overview
SCMS (Student Campus Management System) uses a decoupled client-server architecture. The frontend is a Single Page Application (SPA) built with React and TypeScript, while the backend is a RESTful API service powered by Flask and SQLAlchemy.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Client                       │
│  React 19 + TypeScript + React Router 7 + Axios Interceptor  │
└────────────────────────────┬────────────────────────────┘
                             │  HTTPS / REST APIs (JSON)
                             │  CSRF Token via Header (X-CSRFToken)
┌────────────────────────────▼────────────────────────────┐
│                    Flask Application                    │
│   Flask-Login Session Auth + Role Decorators (RBAC)    │
└────────────────────────────┬────────────────────────────┘
                             │  SQLAlchemy ORM
┌────────────────────────────▼────────────────────────────┐
│                  PostgreSQL Database                    │
└─────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

### Backend
- **Framework:** Flask 3.x
- **Session Auth:** Flask-Login
- **ORM:** SQLAlchemy 2.x / Flask-SQLAlchemy
- **Database Migrations:** Alembic
- **WSGI Server:** Gunicorn

### Frontend
- **Framework:** React 19
- **Language:** TypeScript 5
- **Build Tool:** Vite 8
- **Styling:** TailwindCSS 4
- **State & HTTP:** React Hooks, Axios Interceptors, Custom Toast/Auth Contexts
- **Icons & Charts:** Lucide-React, Recharts

## 3. Security & Access Control (RBAC)

### User Roles
1. **Admin (`RoleEnum.admin`):** Full system access. CRUD on Students, Faculty, Courses, Announcements, System Activity Logs, and global settings.
2. **Faculty (`RoleEnum.faculty`):** Access scoped strictly to assigned courses. Can mark attendance and enter marks for enrolled students in owned courses.
3. **Student (`RoleEnum.student`):** Read-only access to own performance (attendance breakdown, marks, CGPA, and PDF transcripts).

### Protection Mechanisms
- **Session Cookies:** `HttpOnly`, `SameSite=Lax`, secure cookies managed by Flask-Login.
- **CSRF Protection:** Tokens generated server-side and automatically set in `csrf_token` cookie; Axios interceptor reads token and injects `X-CSRFToken` header on unsafe methods (POST, PUT, DELETE).
- **IDOR Safeguards:** Student/Faculty APIs explicitly verify `current_user.student_profile.id == student_id` or course ownership prior to returning records.

## 4. Static Asset Pipeline & Deployment
- Vite builds production assets into `backend/app/static/dist/`.
- Flask static routing serves index.html and static JavaScript/CSS bundles directly for SPA routes (`/dashboard`, `/courses`, `/attendance`, etc.).
- Render deploys via `start.sh` running `gunicorn app.main:app`.
