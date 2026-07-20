# SCMS — Internal API Documentation

All API endpoints sit under the `/api` route. All non-auth mutating requests must include an `X-CSRFToken` header.

---

## 1. Authentication
`POST /api/auth/login`
- **Body**: `{ "identifier": "email", "password": "pass" }`
- **Response**: `200 OK` (Sets secure HttpOnly Session Cookie).

`POST /api/auth/logout`
- **Response**: `200 OK` (Clears session).

---

## 2. Core Entities (CRUD)

### Students (`/api/students`)
- `GET /`: List all students.
- `GET /<id>`: Retrieve specific student.
- `POST /`: Create student. (Admin)
- `PUT /<id>`: Update student metadata. (Admin)
- `DELETE /<id>`: Remove student. (Admin)

### Faculty (`/api/faculty`)
- `GET /`: List all faculty members.
- `GET /<id>`: Retrieve specific faculty profile.
- `POST /`: Create faculty profile. (Admin)

### Courses (`/api/courses`)
- `GET /`: List all courses. 
- `POST /`: Create new course. (Admin)
- `POST /<id>/enroll`: Map a student array to a course.

---

## 3. Academics

### Attendance (`/api/attendance`)
- `GET /?course_id=X&date=Y`: Fetch attendance records.
- `POST /batch`: Bulk save attendance statuses. Payload: `{"course_id": X, "date": "Y", "records": [{"student_id": 1, "status": "Present"}]}`

### Marks (`/api/marks`)
- `GET /?course_id=X`: Get all student marks for a course.
- `POST /`: Create a new mark record. Payload: `{"student_id": X, "course_id": Y, "internal_1": Z...}`
- `PUT /<id>/update`: Update specific mark record.
- `DELETE /<id>`: Remove specific mark record.

---

## 4. Analytics & Reports

### Dashboard (`/api/dashboard`)
- `GET /stats`: Aggregated summary statistics. Admins receive global counts. Students/Faculty receive contextual statistics (Personal GPA / Assigned Courses).

### Reports (`/api/reports`)
- `GET /csv/attendance?course_id=X`: Returns `text/csv` stream of course attendance.
- `GET /csv/marks?course_id=X`: Returns `text/csv` stream of course marks.
- `GET /transcript/<student_id>`: Returns a hierarchical JSON structure compiling a student's profile alongside dynamically mapped courses, grades, and an aggregated Overall GPA.
