# SCMS Architecture

SCMS follows a traditional Single-Page Application (SPA) architecture combined with a RESTful backend API.

## Frontend Architecture
- **Framework**: React 18, bundled by Vite.
- **Routing**: `react-router-dom` utilizing a standard hierarchy with a top-level `<ProtectedRoute>` wrapper ensuring unauthorized users are kept out.
- **State Management**: React Context (`AuthContext`) manages user sessions and API interceptions globally.
- **Styling**: Tailwind CSS ensures a unified utility-first design system preventing CSS bloat and redundant stylesheets.

## Backend Architecture
- **Framework**: Flask using the Application Factory Pattern (`create_app()`).
- **Blueprints**: The system is modularized into discrete functional components (`auth.py`, `dashboard.py`, `students.py`).
- **ORM**: SQLAlchemy abstracts database transactions.
- **Authentication**: `Flask-Login` controls the core user session loop and HttpOnly cookies, abstracting away JWT complexities and local storage vulnerabilities.
- **CSRF Protection**: `Flask-WTF` CSRF protection globally intercepts mutating HTTP requests to ensure they carry a valid, signed X-CSRFToken.

## Database Models
1. **User**: The base authentication entity handling role mapping (`Admin`, `Faculty`, `Student`).
2. **Course**: The core academic unit, bound to a specific Faculty ID.
3. **Enrollment**: A many-to-many relationship mapping Students to Courses.
4. **Attendance**: Time-series logs referencing a Student, Course, and Date.
5. **Mark**: Normalized grade aggregations referencing a Student and Course.
