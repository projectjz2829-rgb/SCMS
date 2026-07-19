# 🎓 SCMS — Smart Campus Management System

> A production-ready, full-stack web application for **Bon Secours Arts and Science College** to manage students, faculty, courses, attendance, and academic marks — all in one place.

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-black?logo=flask)](https://flask.palletsprojects.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Deployed on Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render)](https://render.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started (Local)](#-getting-started-local)
- [Environment Variables](#-environment-variables)
- [Deployment (Render)](#-deployment-render)
- [Default Credentials](#-default-admin-credentials)
- [Roles & Permissions](#-roles--permissions)
- [API Reference](#-api-reference)
- [Security](#-security)

---

## ✨ Features

### 👨‍💼 Admin
- **Dashboard** — Live stats (students, faculty, courses, attendance %)
- **Activity Feed** — Real-time tracking of CRUD operations and system events
- **User Management** — Add student/faculty/admin accounts via form
- **Course Management** — Create courses with code, department, semester
- **Delete** — Remove students or faculty with confirmation modal
- **Broadcast System** — Send, edit, and pin real-time campus-wide announcements
- **Charts** — Department-wise attendance bar chart + student distribution donut

### 👨‍🏫 Faculty
- **My Courses** — View only courses assigned to this faculty
- **Attendance** — Select course + date → load student roster → P/L/A toggle → submit
- **Marks Entry** — Pre-populated marks table; upserts records per student per course
- **Bulletin Board** — Live syncing campus announcements
- **Attendance Chart** — Bar chart per course showing overall attendance %

### 🎓 Student
- **Dashboard** — Attendance ring (circular SVG), per-subject progress bars
- **Shortage Alert** — Red banner auto-appears if any subject is below 75%
- **Marks Ledger** — IA1, IA2, Semester Final, Practical scores with colour coding
- **Bulletin Board** — Live syncing campus announcements with notification badges

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11+, Flask 3.x, Flask-Login, Flask-WTF, Flask-Limiter |
| **ORM** | SQLAlchemy 2.x, Flask-SQLAlchemy |
| **Database** | PostgreSQL (production) / SQLite (testing) |
| **Auth** | Flask-Login + Bcrypt password hashing |
| **Security** | CSRF (Flask-WTF), Rate limiting, CSP headers, XSS-safe via React JSX |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React |
| **Charts** | Recharts (React component library) |
| **UI Icons** | Lucide React |
| **WSGI** | Gunicorn (production), Flask dev server (development) |
| **Hosting** | Render (Free Plan), PostgreSQL Add-on |

---

## 📁 Project Structure

```
SCMS-main/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Application factory
│   │   ├── config.py            # Dev / Test / Production configs
│   │   ├── extensions.py        # Extensions (db, bcrypt, login)
│   │   ├── models/              # SQLAlchemy models
│   │   ├── auth/                # Auth logic and session checks
│   │   ├── api/                 # REST JSON endpoints
│   │   └── static/dist/         # (Generated) React frontend build output
│   └── wsgi.py                  # Entry-point
├── frontend/
│   ├── public/                  # Static assets (images, fonts)
│   ├── src/
│   │   ├── api/                 # Axios API clients for backend routes
│   │   ├── components/          # React components (Dashboard, Login, Forms)
│   │   ├── contexts/            # React contexts (AuthContext, ToastContext)
│   │   ├── data/                # Data types and structures
│   │   ├── hooks/               # Custom React hooks (useDebounce, useFocusTrap)
│   │   ├── App.tsx              # Main application router component
│   │   └── main.tsx             # React DOM entry
│   ├── package.json             # NPM dependencies
│   ├── tailwind.config.js       # Tailwind theme and utilities
│   └── vite.config.ts           # Vite build configuration (outputs to backend)
└── .gitignore
```

---

## 🚀 Getting Started (Local)

### Prerequisites
- Python 3.11 or higher
- PostgreSQL (or use SQLite for local dev)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/projectjz2829-rgb/SCMS.git
cd SCMS/SCMS-main
```

### 2. Create and activate a virtual environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements-dev.txt
```

### 4. Set environment variables

Copy `.env.example` to `.env` and fill in your values (or just export them):

```bash
# .env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/scms_db
FLASK_ENV=development
```

### 5. Run the development server
```bash
cd backend
flask run
```

The app will be available at **http://127.0.0.1:5000**

> Tables are auto-created on first run via `db.create_all()` in `wsgi.py`. A default admin account is also seeded.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ Yes | Flask session signing key. Use a long random string in production. |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection URL. Render provides this automatically. |
| `FLASK_ENV` | No | `development` or `production`. Defaults to `production` on Render. |
| `SESSION_COOKIE_SECURE` | No | Set to `true` in production (HTTPS). Render sets this automatically via TLS. |
| `WTF_CSRF_ENABLED` | No | CSRF protection toggle. Default `True`. Never disable in production. |
| `ADMIN_EMAIL` | No | Seed admin email. Defaults to `admin@scms.edu` if not set. |
| `ADMIN_PASSWORD` | No | Seed admin password. Defaults to `Admin@1234` — **change this!** |

---

## 🌐 Deployment (Render)

This project is configured for one-click deployment on [Render](https://render.com).

> 💡 This project includes a `render.yaml` Blueprint. When connecting your repository to Render, the web service configuration (build commands, start commands, root directory, and Python runtime) will be automatically provisioned for you.

### Steps:
1. Push this repository to GitHub.
2. In your Render Dashboard, click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically read the `render.yaml` file.
4. Add a **PostgreSQL** database add-on on Render (the `DATABASE_URL` is injected automatically).
5. Provide values for the required environment variables (`SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) when prompted by the Blueprint deploy flow.

> ⚠️ On every deploy, `flask db upgrade` is called at startup via `start.sh` to safely apply any schema changes before the server boots.

---

## 🔑 Default Admin Credentials

On first startup, a default admin account is created:

| Field | Default Value |
|-------|---------------|
| Required ID | `admin@scms.edu` (or value of `ADMIN_EMAIL` env var) |
| Password | `Admin@1234` (or value of `ADMIN_PASSWORD` env var) |

> ⚠️ **Change the default password immediately after first login.** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` as environment variables on Render to override the defaults.

---

## 👥 Roles & Permissions

| Action | Admin | Faculty | Student |
|--------|:-----:|:-------:|:-------:|
| View Admin Dashboard | ✅ | ❌ | ❌ |
| Add/Delete Users | ✅ | ❌ | ❌ |
| Create Courses | ✅ | ❌ | ❌ |
| View All Students & Faculty | ✅ | ❌ | ❌ |
| View Own Courses | ❌ | ✅ | ❌ |
| Mark Attendance | ❌ | ✅ | ❌ |
| Enter Marks | ❌ | ✅ | ❌ |
| View Own Attendance | ❌ | ❌ | ✅ |
| View Own Marks | ❌ | ❌ | ✅ |

---

## 📡 API Reference

All API endpoints are protected by `@login_required`. Admin-only routes additionally enforce `@role_required('admin')`.

### Students
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/students/` | Admin | List all students |
| `DELETE` | `/api/students/<id>` | Admin | Delete student + all linked records |
| `GET` | `/api/students/<id>/attendance` | Admin/Student | Attendance records for a student |
| `GET` | `/api/students/<id>/marks` | Admin/Student | Marks records for a student |

### Faculty
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/faculty/` | Admin | List all faculty |
| `DELETE` | `/api/faculty/<id>` | Admin | Delete faculty account |
| `GET` | `/api/faculty/<id>/courses` | Admin/Faculty | Courses assigned to faculty |

### Courses
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/courses/` | Any | List all courses |
| `POST` | `/api/courses/` | Admin | Create a course |
| `GET` | `/api/courses/<id>/students` | Faculty/Admin | Students enrolled in course |

### Attendance
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/attendance/` | Faculty | Submit batch attendance (upserts) |

### Marks
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/marks/` | Faculty | Upsert marks for a student |
| `GET` | `/api/marks/course/<id>` | Faculty | All marks for a course |

### Announcements
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/announcements/` | Any | List all active announcements |
| `POST` | `/api/announcements/` | Admin | Create an announcement |
| `PUT` | `/api/announcements/<id>` | Admin | Edit an announcement |
| `DELETE` | `/api/announcements/<id>` | Admin | Delete an announcement |

### Activities
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/activities/` | Admin | Fetch system activity feed |

---

## 🔒 Security

| Measure | Implementation |
|---------|----------------|
| **Password hashing** | Bcrypt (cost factor 12) |
| **CSRF protection** | Flask-WTF on all forms; `X-CSRFToken` header on all AJAX requests |
| **Rate limiting** | 5 login attempts/minute via Flask-Limiter |
| **XSS prevention** | Default React JSX string escaping prevents XSS payloads |
| **IDOR prevention** | All API endpoints validate the requesting user's role before responding |
| **Security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP`, `Referrer-Policy`, `Permissions-Policy` |
| **Session security** | `HttpOnly`, `SameSite=Lax`, `Secure=True` in production |
| **Secret key enforcement** | App refuses to start in production if `SECRET_KEY` is the fallback dev key |

---

## 📝 License

This project is for educational use at **Bon Secours Arts and Science College**. All rights reserved.

---

*Built with ❤️ for Bon Secours College — Smart Campus Management System v1.0.0*