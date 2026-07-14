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
- **User Management** — Add student/faculty/admin accounts via form
- **Course Management** — Create courses with code, department, semester
- **Delete** — Remove students or faculty with confirmation modal
- **Broadcast** — Send campus-wide announcements to all students
- **Charts** — Department-wise attendance bar chart + student distribution donut

### 👨‍🏫 Faculty
- **My Courses** — View only courses assigned to this faculty
- **Attendance** — Select course + date → load student roster → P/L/A toggle → submit
- **Marks Entry** — Pre-populated marks table; upserts records per student per course
- **Attendance Chart** — Bar chart per course showing overall attendance %

### 🎓 Student
- **Dashboard** — Attendance ring (circular SVG), per-subject progress bars
- **Shortage Alert** — Red banner auto-appears if any subject is below 75%
- **Marks Ledger** — IA1, IA2, Semester Final, Practical scores with colour coding
- **Bulletin Board** — Campus announcements (broadcasts from admin)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11+, Flask 3.x, Flask-Login, Flask-WTF, Flask-Limiter |
| **ORM** | SQLAlchemy 2.x, Flask-SQLAlchemy |
| **Database** | PostgreSQL (production) / SQLite (testing) |
| **Auth** | Flask-Login + Bcrypt password hashing |
| **Security** | CSRF (Flask-WTF), Rate limiting, CSP headers, XSS-safe DOM APIs |
| **Frontend** | HTML5, Vanilla CSS (custom design system), Vanilla JS (ES2020) |
| **Charts** | Chart.js (local bundle, no CDN dependency) |
| **UI Icons** | Bootstrap Icons |
| **WSGI** | Gunicorn (production), Flask dev server (development) |
| **Hosting** | Render (Free Plan), PostgreSQL Add-on |

---

## 📁 Project Structure

```
SCMS-main/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Application factory (create_app)
│   │   ├── config.py            # Dev / Test / Production configs
│   │   ├── extensions.py        # db, bcrypt, login_manager, csrf, limiter
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py          # User (all roles share this table)
│   │   │   ├── student.py
│   │   │   ├── faculty.py
│   │   │   ├── course.py        # Course + Enrollment
│   │   │   ├── attendance.py
│   │   │   └── marks.py
│   │   ├── auth/                # Login / Register / Logout routes + forms
│   │   ├── api/                 # REST endpoints (JSON)
│   │   │   ├── students.py
│   │   │   ├── faculty.py
│   │   │   ├── courses.py
│   │   │   ├── attendance.py
│   │   │   └── marks.py
│   │   └── dashboard/           # Page routes (Jinja2 templates)
│   └── wsgi.py                  # Gunicorn entry-point; runs db.create_all()
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │   ├── campus.css       # Custom design system (tokens, components)
│   │   │   ├── bootstrap.min.css
│   │   │   └── bootstrap-icons.css
│   │   └── js/
│   │       ├── api.js           # Fetch wrapper, CSRF, toast, escapeHtml
│   │       ├── dashboard.js     # Admin/Faculty/Student dashboard logic
│   │       ├── attendance.js    # Faculty attendance & marks panel
│   │       └── chart.umd.min.js # Chart.js local bundle
│   └── templates/
│       ├── base.html            # Sidebar, topbar, mobile nav, flash messages
│       ├── auth/
│       │   ├── login.html
│       │   └── register.html
│       ├── dashboard/
│       │   ├── admin.html
│       │   ├── faculty.html
│       │   └── student.html
│       └── errors/
│           ├── 403.html
│           ├── 404.html
│           └── 429.html
├── requirements.txt
├── render.yaml                  # Render deployment config
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
pip install -r requirements.txt
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

### Steps:
1. Push this repository to GitHub.
2. Create a new **Web Service** on Render, pointing to the repo.
3. Set the **Build Command**: `pip install -r requirements.txt`
4. Set the **Start Command**: `gunicorn wsgi:app --workers 2 --threads 2 --bind 0.0.0.0:$PORT --log-level warning --access-logfile -`
5. Set the **Root Directory**: `backend`
6. Add a **PostgreSQL** database add-on on Render. The `DATABASE_URL` is injected automatically.
7. Add the following environment variables in the Render dashboard:
   - `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_hex(32))"`
   - `FLASK_ENV` = `production`
   - `SESSION_COOKIE_SECURE` = `true`
   - `ADMIN_EMAIL` — your desired admin email
   - `ADMIN_PASSWORD` — your desired admin password

> ⚠️ On every deploy, `db.create_all()` is called at startup — it is idempotent and safe (never drops existing tables). No migration files needed.

---

## 🔑 Default Admin Credentials

On first startup, a default admin account is created:

| Field | Default Value |
|-------|---------------|
| Email | `admin@scms.edu` (or value of `ADMIN_EMAIL` env var) |
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

---

## 🔒 Security

| Measure | Implementation |
|---------|----------------|
| **Password hashing** | Bcrypt (cost factor 12) |
| **CSRF protection** | Flask-WTF on all forms; `X-CSRFToken` header on all AJAX requests |
| **Rate limiting** | 5 login attempts/minute via Flask-Limiter |
| **XSS prevention** | All dynamic DOM injection uses `textContent` or `escapeHtml()` |
| **IDOR prevention** | All API endpoints validate the requesting user's role before responding |
| **Security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP`, `Referrer-Policy`, `Permissions-Policy` |
| **Session security** | `HttpOnly`, `SameSite=Lax`, `Secure=True` in production |
| **Secret key enforcement** | App refuses to start in production if `SECRET_KEY` is the fallback dev key |

---

## 📝 License

This project is for educational use at **Bon Secours Arts and Science College**. All rights reserved.

---

*Built with ❤️ for Bon Secours College — Smart Campus Management System v1.0.0*