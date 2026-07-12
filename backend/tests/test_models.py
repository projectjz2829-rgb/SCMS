"""
tests/test_models.py
Unit tests for SQLAlchemy ORM models.
Uses an in-memory SQLite database (TestingConfig) for speed.
"""
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
    application = create_app("testing")
    with application.app_context():
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="module")
def db(app):
    return _db


@pytest.fixture(autouse=True)
def clean_db(db):
    """Roll back each test's changes."""
    yield
    db.session.rollback()


# ─────────────────────────── User model ─────────────────────────────────── #

class TestUserModel:
    def test_create_admin_user(self, db):
        user = User(email="admin@test.com", role=RoleEnum.admin, is_active=True)
        user.set_password("securepass123")
        db.session.add(user)
        db.session.flush()

        assert user.id is not None
        assert user.email == "admin@test.com"
        assert user.role == RoleEnum.admin
        assert user.is_admin is True
        assert user.is_faculty is False
        assert user.is_student is False

    def test_password_hashing(self, db):
        user = User(email="hashtest@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("mypassword")
        assert user.password_hash != "mypassword"
        assert user.check_password("mypassword") is True
        assert user.check_password("wrongpass") is False

    def test_user_to_dict(self, db):
        user = User(email="dict@test.com", role=RoleEnum.faculty, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()
        d = user.to_dict()
        assert d["email"] == "dict@test.com"
        assert d["role"] == "faculty"
        assert "password_hash" not in d


# ─────────────────────────── Student model ──────────────────────────────── #

class TestStudentModel:
    def test_create_student(self, db):
        user = User(email="student1@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            roll_no="22CS001",
            full_name="Test Student",
            dept="Computer Science",
            year=2,
            section="A",
        )
        db.session.add(student)
        db.session.flush()

        assert student.id is not None
        assert student.roll_no == "22CS001"
        assert student.user == user

    def test_student_to_dict_includes_email(self, db):
        user = User(email="studict@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            roll_no="22CS099",
            full_name="Dict Student",
            dept="Maths",
            year=1,
            section="B",
        )
        db.session.add(student)
        db.session.flush()

        d = student.to_dict()
        assert d["email"] == "studict@test.com"
        assert d["roll_no"] == "22CS099"


# ─────────────────────────── Faculty model ──────────────────────────────── #

class TestFacultyModel:
    def test_create_faculty(self, db):
        user = User(email="faculty1@test.com", role=RoleEnum.faculty, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        faculty = Faculty(
            user_id=user.id,
            emp_id="FAC001",
            full_name="Prof. Test",
            dept="Physics",
            designation="Assistant Professor",
        )
        db.session.add(faculty)
        db.session.flush()

        assert faculty.id is not None
        assert faculty.emp_id == "FAC001"
        assert faculty.to_dict()["designation"] == "Assistant Professor"


# ─────────────────────────── Course + Enrollment ─────────────────────────── #

class TestCourseModel:
    def test_create_course(self, db):
        course = Course(
            name="Data Structures",
            code="CS301",
            dept="Computer Science",
            semester=3,
        )
        db.session.add(course)
        db.session.flush()

        assert course.id is not None
        assert course.code == "CS301"

    def test_enrollment_m2n(self, db):
        # Create user + student
        user = User(email="enroll@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id, roll_no="22CS050",
            full_name="Enroll Test", dept="CS", year=2, section="A",
        )
        db.session.add(student)

        course = Course(name="Algorithms", code="CS302", dept="CS", semester=3)
        db.session.add(course)
        db.session.flush()

        enrollment = Enrollment(student_id=student.id, course_id=course.id)
        db.session.add(enrollment)
        db.session.flush()

        assert enrollment.student_id == student.id
        assert enrollment.course_id == course.id


# ─────────────────────────── Attendance model ────────────────────────────── #

class TestAttendanceModel:
    def test_create_attendance(self, db):
        user = User(email="attstud@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id, roll_no="22CS060",
            full_name="Att Student", dept="CS", year=1, section="C",
        )
        db.session.add(student)

        course = Course(name="Networks", code="CS303", dept="CS", semester=5)
        db.session.add(course)
        db.session.flush()

        att = Attendance(
            student_id=student.id,
            course_id=course.id,
            date=date(2024, 8, 15),
            status=AttendanceStatusEnum.present,
        )
        db.session.add(att)
        db.session.flush()

        assert att.id is not None
        assert att.status == AttendanceStatusEnum.present
        assert att.to_dict()["status"] == "present"


# ─────────────────────────── Marks model ────────────────────────────────── #

class TestMarksModel:
    def test_create_marks(self, db):
        user = User(email="marksstu@test.com", role=RoleEnum.student, is_active=True)
        user.set_password("pass1234!")
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id, roll_no="22CS070",
            full_name="Marks Student", dept="CS", year=3, section="A",
        )
        db.session.add(student)

        course = Course(name="DBMS", code="CS304", dept="CS", semester=5)
        db.session.add(course)
        db.session.flush()

        marks = Marks(
            student_id=student.id,
            course_id=course.id,
            internal_1=22,
            internal_2=20,
            semester_final=68,
            practical=45,
            academic_year="2024-2025",
        )
        db.session.add(marks)
        db.session.flush()

        assert marks.id is not None
        assert marks.internal_1 == 22
        d = marks.to_dict()
        assert d["academic_year"] == "2024-2025"
        assert d["semester_final"] == 68
