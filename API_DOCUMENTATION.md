# API DOCUMENTATION — SCMS v1.2.0

## Authentication Endpoints

### `POST /auth/login`
- **Desc:** User authentication.
- **Request Body:** `{ "email": "admin@scms.edu", "password": "password123" }`
- **Response Status:** `200 OK`
- **Response JSON:** `{ "success": true, "message": "Login successful" }`

### `GET /auth/me`
- **Desc:** Returns current session user profile details.
- **Auth:** Required
- **Response Status:** `200 OK`
- **Response JSON:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": 1,
      "email": "student@scms.edu",
      "role": "student",
      "profile": { "id": 5, "roll_no": "STU005", "full_name": "John Doe", "dept": "Computer Science" }
    }
  }
}
```

---

## Course Endpoints

### `GET /api/courses/`
- **Auth:** `@login_required`
- **Roles Allowed:** `admin`, `faculty`, `student`
- **Query Params:** `search`, `dept`, `semester`, `page`, `limit`
- **Role Behavior:**
  - `admin`: Returns all courses across institution.
  - `faculty`: Returns only courses assigned to current faculty ID.
  - `student`: Returns courses student is enrolled in.
- **Response Status:** `200 OK`

---

## Report Endpoints

### `GET /api/reports/students`
- **Auth:** `@login_required`
- **Roles Allowed:** `admin`, `faculty`
- **Query Params:** `search` (optional)
- **Role Behavior:**
  - `admin`: Search across all students.
  - `faculty`: Search only students enrolled in faculty's assigned courses.
  - `student`: `403 Access forbidden`.
- **Response Status:** `200 OK` / `403 Forbidden`

### `GET /api/reports/csv/attendance`
- **Auth:** `@login_required`
- **Roles Allowed:** `admin`, `faculty`
- **Query Params:** `course_id`
- **Response:** CSV File Stream (`text/csv`)

### `GET /api/reports/transcript/<student_id>`
- **Auth:** `@login_required`
- **Roles Allowed:** `admin`, `faculty`, `student` (own record only)
- **Response Status:** `200 OK` / `403 Forbidden`
