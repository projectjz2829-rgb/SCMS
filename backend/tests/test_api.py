"""
tests/test_api.py
Integration tests for all API endpoints.
Tests cover: RBAC enforcement, IDOR protection, CRUD operations.
"""
import json
import pytest
from app import create_app
from app.extensions import db as _db
from app.models import User, Student, Faculty, Course, Enrollment, Attendance, Marks
from app.models.user import RoleEnum
from app.models.attendance import AttendanceStatusEnum
from datetime import date


# ─────────────────────────── Fixtures ───────────────────────────────────── #

@pytest.fixture(scope="module")
def app():
    # NOTE: the app context below is intentionally only held open for setup
    # and, separately, for teardown -- never across `yield`. Flask reuses
    # whatever app context is already on the stack instead of pushing a new
    # one per request; holding a context open across every test-client
    # request would leak Flask's `g` object (and therefore Flask-Login's
    # per-request `current_user` cache) between otherwise-independent HTTP
    # requests, letting an earlier login "leak" into a later, supposedly
    # unauthenticated or differently-authenticated request.
    application = create_app("testing")
    with application.app_context():
        _db.create_all()

        # Admin
        admin_user = User(email="api_admin@test.com", role=RoleEnum.admin, is_active=True)
        admin_user.set_password("AdminPass1!")
        _db.session.add(admin_user)
        _db.session.flush()

        # Faculty
        fac_user = User(email="api_faculty@test.com", role=RoleEnum.faculty, is_active=True)
        fac_user.set_password("FacultyPass1!")
        _db.session.add(fac_user)
        _db.session.flush()

        faculty = Faculty(
            user_id=fac_user.id,
            emp_id="APIFAC001",
            full_name="API Faculty",
            dept="CS",
            designation="Lecturer",
        )
        _db.session.add(faculty)
        _db.session.flush()

        # Student 1
        stu_user1 = User(email="api_stu1@test.com", role=RoleEnum.student, is_active=True)
        stu_user1.set_password("StudentPass1!")
        _db.session.add(stu_user1)
        _db.session.flush()

        student1 = Student(
            user_id=stu_user1.id,
            roll_no="API001",
            full_name="API Student 1",
            dept="CS",
            year=2,
            section="A",
        )
        _db.session.add(student1)

        # Student 2
        stu_user2 = User(email="api_stu2@test.com", role=RoleEnum.student, is_active=True)
        stu_user2.set_password("StudentPass1!")
        _db.session.add(stu_user2)
        _db.session.flush()

        student2 = Student(
            user_id=stu_user2.id,
            roll_no="API002",
            full_name="API Student 2",
            dept="Maths",
            year=1,
            section="B",
        )
        _db.session.add(student2)

        # Course assigned to faculty
        course = Course(
            name="API Test Course",
            code="API101",
            dept="CS",
            semester=3,
            faculty_id=faculty.id,
        )
        _db.session.add(course)
        # ── Second faculty (Maths dept) — used in dept-mismatch tests ── #
        fac_user2 = User(email="api_faculty2@test.com", role=RoleEnum.faculty, is_active=True)
        fac_user2.set_password("FacultyPass1!")
        _db.session.add(fac_user2)
        _db.session.flush()

        faculty2 = Faculty(
            user_id=fac_user2.id,
            emp_id="APIFAC002",
            full_name="Maths Faculty",
            dept="Maths",
            designation="Lecturer",
        )
        _db.session.add(faculty2)
        _db.session.flush()

        # ── Second course (Maths dept, no faculty) ── #
        math_course = Course(
            name="Maths Test Course",
            code="MATH201",
            dept="Maths",
            semester=2,
        )
        _db.session.add(math_course)
        _db.session.commit()

        # Store IDs for tests
        application.test_ids = {
            "admin_user_id": admin_user.id,
            "fac_user_id": fac_user.id,
            "faculty_id": faculty.id,
            "fac_user2_id": fac_user2.id,
            "faculty2_id": faculty2.id,
            "stu_user1_id": stu_user1.id,
            "student1_id": student1.id,
            "stu_user2_id": stu_user2.id,
            "student2_id": student2.id,
            "course_id": course.id,
            "math_course_id": math_course.id,
        }

    yield application

    with application.app_context():
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def login_as(client, email, password):
    """Helper: log in via the /auth/login endpoint using the identifier field."""
    client.post("/auth/login", data={"identifier": email, "password": password})


def api_post(client, url, data):
    return client.post(
        url,
        data=json.dumps(data),
        content_type="application/json",
        headers={"X-CSRFToken": "test"},
    )


def api_get(client, url):
    return client.get(url, headers={"X-CSRFToken": "test"})


def api_put(client, url, data):
    return client.put(
        url,
        data=json.dumps(data),
        content_type="application/json",
        headers={"X-CSRFToken": "test"},
    )


def api_delete(client, url):
    return client.delete(url, headers={"X-CSRFToken": "test"})


# ═══════════════════════════════════════════════════════════════════════════
#  Students API
# ═══════════════════════════════════════════════════════════════════════════

class TestStudentsAPI:
    def test_list_students_admin_only(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_get(client, "/api/students/")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data, list)

    def test_list_students_forbidden_for_student(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_get(client, "/api/students/")
        assert res.status_code == 403

    def test_list_students_forbidden_for_faculty(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_get(client, "/api/students/")
        assert res.status_code == 403

    def test_get_own_student_record(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student1_id"]
        res = api_get(client, f"/api/students/{sid}")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["roll_no"] == "API001"

    def test_idor_student_cannot_get_other_student(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student2_id"]
        res = api_get(client, f"/api/students/{sid}")
        assert res.status_code == 403

    def test_create_student_admin_only(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/students/", {
            "email": "newstu@test.com",
            "password": "pass1234!",
            "roll_no": "NEW001",
            "full_name": "New Student",
            "dept": "Physics",
            "year": 1,
            "section": "A",
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["roll_no"] == "NEW001"

    def test_create_student_duplicate_email(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/students/", {
            "email": "api_stu1@test.com",   # already exists
            "password": "pass1234!",
            "roll_no": "DUP001",
            "full_name": "Duplicate",
            "dept": "CS",
            "year": 2,
            "section": "B",
        })
        assert res.status_code == 409

    def test_get_student_attendance_own(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student1_id"]
        res = api_get(client, f"/api/students/{sid}/attendance")
        assert res.status_code == 200

    def test_get_student_marks_own(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student1_id"]
        res = api_get(client, f"/api/students/{sid}/marks")
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
#  Faculty API
# ═══════════════════════════════════════════════════════════════════════════

class TestFacultyAPI:
    def test_list_faculty_admin_only(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_get(client, "/api/faculty/")
        assert res.status_code == 200

    def test_list_faculty_forbidden_for_student(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_get(client, "/api/faculty/")
        assert res.status_code == 403

    def test_faculty_get_own_profile(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        fid = app.test_ids["faculty_id"]
        res = api_get(client, f"/api/faculty/{fid}")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["emp_id"] == "APIFAC001"

    def test_faculty_courses_subresource(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        fid = app.test_ids["faculty_id"]
        res = api_get(client, f"/api/faculty/{fid}/courses")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data, list)


# ═══════════════════════════════════════════════════════════════════════════
#  Courses API
# ═══════════════════════════════════════════════════════════════════════════

class TestCoursesAPI:
    def test_list_courses_any_authenticated(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_get(client, "/api/courses/")
        assert res.status_code == 200

    def test_create_course_admin_only(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Test Course",
            "code": "TC999",
            "dept": "CS",
            "semester": 4,
        })
        assert res.status_code == 201

    def test_create_course_student_forbidden(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Bad Course",
            "code": "BAD001",
            "dept": "CS",
            "semester": 1,
        })
        assert res.status_code == 403

    def test_enroll_student_admin(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, f"/api/courses/{app.test_ids['course_id']}/enroll", {
            "student_id": app.test_ids["student1_id"],
        })
        assert res.status_code in (201, 409)   # 409 if already enrolled

    def test_get_course_students_returns_only_enrolled(self, client, app):
        """The roster endpoint must return enrolled students only —
        not the whole student body (this backs the faculty attendance
        and marks-entry screens)."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        # Ensure student1 is enrolled (idempotent — may already be enrolled)
        api_post(client, f"/api/courses/{app.test_ids['course_id']}/enroll", {
            "student_id": app.test_ids["student1_id"],
        })
        res = api_get(client, f"/api/courses/{app.test_ids['course_id']}/students")
        assert res.status_code == 200
        data = json.loads(res.data)
        ids = [s["id"] for s in data]
        assert app.test_ids["student1_id"] in ids
        assert app.test_ids["student2_id"] not in ids  # never enrolled

    def test_get_course_students_faculty_of_course_allowed(self, client, app):
        """The faculty member assigned to the course can fetch its roster
        (this is the exact call the Mark Attendance / Enter Marks screens
        make — it must not require the admin-only /api/students/ list)."""
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_get(client, f"/api/courses/{app.test_ids['course_id']}/students")
        assert res.status_code == 200

    def test_get_course_students_student_forbidden(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_get(client, f"/api/courses/{app.test_ids['course_id']}/students")
        assert res.status_code == 403

    def test_unenroll_student_admin(self, client, app):
        login_as(client, "api_admin@test.com", "AdminPass1!")
        # Enroll student1 first (dept=CS, year=2 → semesters 3 & 4 eligible),
        # then unenroll to verify the DELETE /enroll/<id> endpoint is working.
        # (student2 is dept='Maths' and is now blocked by the dept validation.)
        api_post(client, f"/api/courses/{app.test_ids['course_id']}/enroll", {
            "student_id": app.test_ids["student1_id"],
        })
        res = api_delete(
            client,
            f"/api/courses/{app.test_ids['course_id']}/enroll/{app.test_ids['student1_id']}",
        )
        assert res.status_code == 200

        roster = api_get(client, f"/api/courses/{app.test_ids['course_id']}/students")
        ids = [s["id"] for s in json.loads(roster.data)]
        assert app.test_ids["student2_id"] not in ids

    def test_unenroll_student_forbidden_for_faculty(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_delete(
            client,
            f"/api/courses/{app.test_ids['course_id']}/enroll/{app.test_ids['student1_id']}",
        )
        assert res.status_code == 403

    # ─────────────────── Validation: Department & Semester ──────────────── #

    def test_create_course_invalid_semester_out_of_range(self, client, app):
        """Semester values outside [1, 8] must be rejected with HTTP 400."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        for bad_sem in (0, 9, -1, 100):
            res = api_post(client, "/api/courses/", {
                "name": "Bad Semester Course",
                "code": f"BADSEM{bad_sem}",
                "dept": "CS",
                "semester": bad_sem,
            })
            assert res.status_code == 400, (
                f"Expected 400 for semester={bad_sem}, got {res.status_code}"
            )
            body = json.loads(res.data)
            assert "Semester must be between 1 and 8" in body["error"]

    def test_create_course_faculty_dept_mismatch(self, client, app):
        """
        Regression: Creating a course and assigning a faculty whose dept
        differs from the course dept must be rejected with HTTP 400.
        Faculty fixture 'APIFAC001' belongs to dept='CS'.
        We attempt to create a course in dept='Maths'.
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Maths Course Wrong Faculty",
            "code": "MWFAC01",
            "dept": "Maths",          # CS faculty assigned to Maths course
            "semester": 1,
            "faculty_id": app.test_ids["faculty_id"],  # faculty.dept == "CS"
        })
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "Faculty department does not match course department" in body["error"]

    def test_create_course_faculty_dept_match(self, client, app):
        """
        Happy path: Creating a course in dept='CS' and assigning the CS
        faculty must succeed with HTTP 201.
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "CS Valid Faculty Course",
            "code": "CSVALID1",
            "dept": "CS",             # matches faculty.dept == "CS"
            "semester": 2,
            "faculty_id": app.test_ids["faculty_id"],
        })
        assert res.status_code == 201
        body = json.loads(res.data)
        assert body["dept"] == "CS"

    def test_enroll_student_dept_mismatch(self, client, app):
        """
        Regression: Enrolling student2 (dept='Maths') into the CS course
        must be rejected with HTTP 400. We rely on the fixture course which
        has dept='CS' and semester=3.
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, f"/api/courses/{app.test_ids['course_id']}/enroll", {
            "student_id": app.test_ids["student2_id"],  # student2.dept == "Maths"
        })
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "Student department does not match course department" in body["error"]

    def test_enroll_student_semester_mismatch(self, client, app):
        """
        Regression: Enrolling a student whose academic year does not correspond
        to the course semester is rejected with HTTP 400.

        We create a Year-1 CS student (eligible for semesters 1 & 2) and
        attempt to enroll them in the fixture course (dept='CS', semester=3).
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")

        # Create a Year-1 CS student via the API
        res = api_post(client, "/api/students/", {
            "email": "yr1_sem_test@test.com",
            "password": "Pass1234!",
            "roll_no": "YR1SEM01",
            "full_name": "Year One Student",
            "dept": "CS",
            "year": 1,               # eligible semesters: 1 and 2 only
            "section": "A",
        })
        assert res.status_code == 201
        yr1_student_id = json.loads(res.data)["id"]

        # Fixture course has semester=3; Year-1 student is ineligible
        res = api_post(client, f"/api/courses/{app.test_ids['course_id']}/enroll", {
            "student_id": yr1_student_id,
        })
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "Student is not eligible for this course's semester" in body["error"]

    def test_enroll_student_semester_even_success(self, client, app):
        """
        Happy path: Enrolling a student whose academic year corresponds to the
        course's even semester must succeed with HTTP 201.
        
        We create a new course in dept='CS' and semester=4 (even semester of year 2).
        Then we enroll student1 (dept='CS', year=2), which must succeed.
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        
        # Create course for Semester 4 (even semester for Year 2)
        res_course = api_post(client, "/api/courses/", {
            "name": "CS Year 2 Even Sem Course",
            "code": "CSEVEN02",
            "dept": "CS",
            "semester": 4,
        })
        assert res_course.status_code == 201
        course_id = json.loads(res_course.data)["id"]

        # Enroll student1 (year=2, dept='CS') in the even semester course
        res_enroll = api_post(client, f"/api/courses/{course_id}/enroll", {
            "student_id": app.test_ids["student1_id"],
        })
        assert res_enroll.status_code == 201
        body = json.loads(res_enroll.data)
        assert "Student enrolled successfully" in body["message"]



# ═══════════════════════════════════════════════════════════════════════════
#  Attendance API
# ═══════════════════════════════════════════════════════════════════════════

class TestAttendanceAPI:
    def test_mark_attendance_faculty(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_post(client, "/api/attendance/", {
            "course_id": app.test_ids["course_id"],
            "date": "2024-08-15",
            "records": [
                {"student_id": app.test_ids["student1_id"], "status": "present"},
            ],
        })
        assert res.status_code == 200
        data = json.loads(res.data)
        assert "created" in data["message"] or "updated" in data["message"]

    def test_mark_attendance_student_forbidden(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_post(client, "/api/attendance/", {
            "course_id": app.test_ids["course_id"],
            "date": "2024-08-16",
            "records": [],
        })
        assert res.status_code == 403

    def test_get_student_attendance_faculty(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        sid = app.test_ids["student1_id"]
        res = api_get(client, f"/api/attendance/student/{sid}")
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
#  Marks API
# ═══════════════════════════════════════════════════════════════════════════

class TestMarksAPI:
    def test_enter_marks_faculty(self, client, app):
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_post(client, "/api/marks/", {
            "student_id": app.test_ids["student1_id"],
            "course_id": app.test_ids["course_id"],
            "academic_year": "2024-2025",
            "internal_1": 20,
            "internal_2": 18,
            "semester_final": 60,
            "practical": 40,
        })
        assert res.status_code in (200, 201)

    def test_enter_marks_student_forbidden(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_post(client, "/api/marks/", {
            "student_id": app.test_ids["student1_id"],
            "course_id": app.test_ids["course_id"],
            "academic_year": "2024-2025",
        })
        assert res.status_code == 403

    def test_get_marks_by_student_own(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student1_id"]
        res = api_get(client, f"/api/marks/student/{sid}")
        assert res.status_code == 200

    def test_idor_marks_student_cannot_get_other(self, client, app):
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        sid = app.test_ids["student2_id"]
        res = api_get(client, f"/api/marks/student/{sid}")
        assert res.status_code == 403

    def test_unauthenticated_api_access_returns_redirect(self, client, app):
        fresh = app.test_client()
        res = fresh.get("/api/students/")
        assert res.status_code in (302, 401)


# ═══════════════════════════════════════════════════════════════════════════
#  Login — dual identifier support
# ═══════════════════════════════════════════════════════════════════════════

class TestLoginIdentifier:
    """Verify the login endpoint resolves email, roll_no, and emp_id."""

    def test_login_with_email(self, client, app):
        """Admin can log in using their email address."""
        res = client.post("/auth/login", data={
            "identifier": "api_admin@test.com",
            "password": "AdminPass1!",
        })
        # Successful login redirects (302) to the admin dashboard
        assert res.status_code == 302

    def test_login_with_roll_no(self, client, app):
        """Student can log in using their roll number."""
        res = client.post("/auth/login", data={
            "identifier": "API001",          # student1's roll_no
            "password": "StudentPass1!",
        })
        assert res.status_code == 302

    def test_login_with_emp_id(self, client, app):
        """Faculty can log in using their employee ID."""
        res = client.post("/auth/login", data={
            "identifier": "APIFAC001",       # faculty's emp_id
            "password": "FacultyPass1!",
        })
        assert res.status_code == 302

    def test_login_wrong_identifier(self, client, app):
        """An identifier that does not exist should re-render the form (200)."""
        res = client.post("/auth/login", data={
            "identifier": "NOTREAL",
            "password": "WrongPass1!",
        })
        # Form is re-rendered with error flash — no redirect
        assert res.status_code == 200
        assert b"Invalid" in res.data


# ═══════════════════════════════════════════════════════════════════════════
#  Courses validation — extended (dept + semester + enrollment eligibility)
# ═══════════════════════════════════════════════════════════════════════════

class TestCoursesValidation:
    """
    Extended validation tests for the courses API.
    student1: dept='CS',    year=2  → eligible semesters: 3 and 4
    student2: dept='Maths', year=1  → eligible semesters: 1 and 2
    faculty   (APIFAC001):  dept='CS'
    faculty2  (APIFAC002):  dept='Maths'
    API101:   dept='CS',    semester=3  (fixture course)
    MATH201:  dept='Maths', semester=2  (fixture course)
    """

    def test_create_course_faculty_dept_mismatch(self, client, app):
        """Assigning a Maths faculty to a CS course must be rejected (400)."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Dept Mismatch Course",
            "code": "DMIS001",
            "dept": "CS",
            "semester": 3,
            "faculty_id": app.test_ids["faculty2_id"],  # Maths faculty
        })
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "department" in body["error"].lower()

    def test_create_course_faculty_dept_match(self, client, app):
        """Assigning a CS faculty to a CS course must succeed (201)."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "CS Valid New Course",
            "code": "CSVAL99",
            "dept": "CS",
            "semester": 3,
            "faculty_id": app.test_ids["faculty_id"],   # CS faculty
        })
        assert res.status_code == 201

    def test_create_course_bad_semester_zero(self, client, app):
        """Semester 0 must be rejected with 400."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Bad Semester 0",
            "code": "BADSEM0X",
            "dept": "CS",
            "semester": 0,
        })
        assert res.status_code == 400

    def test_create_course_bad_semester_nine(self, client, app):
        """Semester 9 must be rejected with 400."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(client, "/api/courses/", {
            "name": "Bad Semester 9",
            "code": "BADSEM9X",
            "dept": "CS",
            "semester": 9,
        })
        assert res.status_code == 400

    def test_enroll_student_dept_mismatch(self, client, app):
        """Enrolling a Maths student into a CS course must be rejected (400)."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(
            client,
            f"/api/courses/{app.test_ids['course_id']}/enroll",
            {"student_id": app.test_ids["student2_id"]},  # Maths dept
        )
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "department" in body["error"].lower()

    def test_enroll_student_semester_mismatch(self, client, app):
        """
        student1 (year=2, eligible sems 3+4) into a CS sem=1 course
        must be rejected (400).
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        # Create a CS course with semester=1 for this test
        res_course = api_post(client, "/api/courses/", {
            "name": "CS Sem1 Mismatch Course",
            "code": "CSSEM1T",
            "dept": "CS",
            "semester": 1,
        })
        assert res_course.status_code == 201
        sem1_course_id = json.loads(res_course.data)["id"]

        res = api_post(
            client,
            f"/api/courses/{sem1_course_id}/enroll",
            {"student_id": app.test_ids["student1_id"]},  # year=2, only sem 3+4
        )
        assert res.status_code == 400
        body = json.loads(res.data)
        assert "semester" in body["error"].lower()

    def test_enroll_student_eligible_odd_semester(self, client, app):
        """student1 (year=2) into API101 (CS, sem=3) must succeed (201)."""
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(
            client,
            f"/api/courses/{app.test_ids['course_id']}/enroll",
            {"student_id": app.test_ids["student1_id"]},
        )
        assert res.status_code in (201, 409)  # 409 if already enrolled from prior test

    def test_enroll_student_eligible_even_semester(self, client, app):
        """
        student1 (year=2) into a CS sem=4 course must succeed (201),
        confirming BOTH semesters of the academic year are accepted.
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        # Create a CS course with semester=4
        res_course = api_post(client, "/api/courses/", {
            "name": "CS Sem4 Even Course",
            "code": "CSSEM4E",
            "dept": "CS",
            "semester": 4,
        })
        assert res_course.status_code == 201
        sem4_course_id = json.loads(res_course.data)["id"]

        res = api_post(
            client,
            f"/api/courses/{sem4_course_id}/enroll",
            {"student_id": app.test_ids["student1_id"]},
        )
        assert res.status_code == 201
        body = json.loads(res.data)
        assert "enrolled" in body["message"].lower()

    def test_enroll_student_dept_match_semester_match_student2(self, client, app):
        """
        student2 (Maths, year=1, eligible sems 1+2) into MATH201
        (Maths, sem=2) must succeed (201).
        """
        login_as(client, "api_admin@test.com", "AdminPass1!")
        res = api_post(
            client,
            f"/api/courses/{app.test_ids['math_course_id']}/enroll",
            {"student_id": app.test_ids["student2_id"]},
        )
        assert res.status_code in (201, 409)  # 409 if already enrolled


# ═══════════════════════════════════════════════════════════════════════════
#  Delete Student / Faculty — RBAC enforcement
# ═══════════════════════════════════════════════════════════════════════════

class TestDeleteStudentFaculty:
    """
    Tests for DELETE /api/students/<id> and DELETE /api/faculty/<id>.
    Throwaway records are created inside each test so that the
    module-scoped fixture students/faculty remain intact for other tests.
    """

    def test_admin_delete_student(self, client, app):
        """Admin can create and then delete a student; subsequent GET returns 404."""
        login_as(client, "api_admin@test.com", "AdminPass1!")

        # Create a throwaway student
        res = api_post(client, "/api/students/", {
            "email": "throwaway_stu@test.com",
            "password": "Pass1234!",
            "roll_no": "THROW001",
            "full_name": "Throwaway Student",
            "dept": "CS",
            "year": 1,
            "section": "Z",
        })
        assert res.status_code == 201
        throwaway_id = json.loads(res.data)["id"]

        # Delete the throwaway student
        del_res = api_delete(client, f"/api/students/{throwaway_id}")
        assert del_res.status_code == 200

        # Subsequent GET must return 404
        get_res = api_get(client, f"/api/students/{throwaway_id}")
        assert get_res.status_code == 404

    def test_admin_delete_faculty(self, client, app):
        """Admin can create and then delete a faculty; subsequent GET returns 404."""
        login_as(client, "api_admin@test.com", "AdminPass1!")

        # Create a throwaway faculty member
        res = api_post(client, "/api/faculty/", {
            "email": "throwaway_fac@test.com",
            "password": "Pass1234!",
            "emp_id": "THROWFAC01",
            "full_name": "Throwaway Faculty",
            "dept": "Physics",
            "designation": "Lecturer",
        })
        assert res.status_code == 201
        throwaway_id = json.loads(res.data)["id"]

        # Delete the throwaway faculty member
        del_res = api_delete(client, f"/api/faculty/{throwaway_id}")
        assert del_res.status_code == 200

        # Subsequent GET must return 404
        get_res = api_get(client, f"/api/faculty/{throwaway_id}")
        assert get_res.status_code == 404

    def test_student_cannot_delete_student(self, client, app):
        """A student-role user must not be able to delete another student (403)."""
        login_as(client, "api_stu1@test.com", "StudentPass1!")
        res = api_delete(client, f"/api/students/{app.test_ids['student2_id']}")
        assert res.status_code == 403

    def test_faculty_cannot_delete_faculty(self, client, app):
        """A faculty-role user must not be able to delete a faculty record (403)."""
        login_as(client, "api_faculty@test.com", "FacultyPass1!")
        res = api_delete(client, f"/api/faculty/{app.test_ids['faculty_id']}")
        assert res.status_code == 403
