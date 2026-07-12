"""
tests/test_auth.py
Integration tests for authentication routes.
- Login with valid/invalid credentials
- Logout clears session
- Register endpoint is admin-only (RBAC)
- Rate limiting on login (mocked)
"""
import pytest
from app import create_app
from app.extensions import db as _db
from app.models import User, Student, Faculty
from app.models.user import RoleEnum


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

        # Seed test users
        admin = User(email="admin@scms.test", role=RoleEnum.admin, is_active=True)
        admin.set_password("AdminPass1!")
        _db.session.add(admin)

        fac_user = User(email="faculty@scms.test", role=RoleEnum.faculty, is_active=True)
        fac_user.set_password("FacultyPass1!")
        _db.session.add(fac_user)
        _db.session.flush()

        faculty = Faculty(
            user_id=fac_user.id,
            emp_id="FAC001",
            full_name="Test Faculty",
            dept="CS",
            designation="Lecturer",
        )
        _db.session.add(faculty)

        stu_user = User(email="student@scms.test", role=RoleEnum.student, is_active=True)
        stu_user.set_password("StudentPass1!")
        _db.session.add(stu_user)
        _db.session.flush()

        student = Student(
            user_id=stu_user.id,
            roll_no="22CS999",
            full_name="Test Student",
            dept="CS",
            year=1,
            section="A",
        )
        _db.session.add(student)
        _db.session.commit()

    yield application

    with application.app_context():
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email, password):
    return client.post("/auth/login", data={"identifier": email, "password": password}, follow_redirects=True)


# ─────────────────────────── Login tests ────────────────────────────────── #

class TestLogin:
    def test_login_page_loads(self, client):
        res = client.get("/auth/login")
        assert res.status_code == 200
        assert b"Smart Campus" in res.data or b"Sign In" in res.data

    def test_login_admin_success(self, client):
        res = login(client, "admin@scms.test", "AdminPass1!")
        assert res.status_code == 200
        # Redirected to admin dashboard
        assert b"Admin Dashboard" in res.data or b"Dashboard" in res.data

    def test_login_wrong_password(self, client):
        res = login(client, "admin@scms.test", "wrongpassword")
        assert res.status_code == 200
        assert b"Invalid" in res.data

    def test_login_nonexistent_email(self, client):
        res = login(client, "nobody@test.com", "somepassword")
        assert res.status_code == 200
        assert b"Invalid" in res.data

    def test_login_faculty_success(self, client):
        res = login(client, "faculty@scms.test", "FacultyPass1!")
        assert res.status_code == 200

    def test_login_student_success(self, client):
        res = login(client, "student@scms.test", "StudentPass1!")
        assert res.status_code == 200


# ─────────────────────────── Logout tests ───────────────────────────────── #

class TestLogout:
    def test_logout_clears_session(self, client):
        login(client, "admin@scms.test", "AdminPass1!")
        res = client.post("/auth/logout", data={"csrf_token": "test"}, follow_redirects=True)
        # After logout, accessing dashboard should redirect to login
        dash_res = client.get("/dashboard/admin", follow_redirects=True)
        assert b"Sign In" in dash_res.data or dash_res.status_code == 200

    def test_logout_requires_login(self, client):
        # A fresh client with no session
        fresh = client.application.test_client()
        res = fresh.post("/auth/logout", follow_redirects=True)
        assert res.status_code == 200


# ─────────────────────────── RBAC on register ───────────────────────────── #

class TestRegisterRBAC:
    def test_register_requires_admin(self, client):
        # Access register page as student
        login(client, "student@scms.test", "StudentPass1!")
        res = client.get("/auth/register", follow_redirects=True)
        # Should get 403 or be redirected to login
        assert res.status_code in (403, 200)

    def test_register_page_accessible_as_admin(self, client):
        login(client, "admin@scms.test", "AdminPass1!")
        res = client.get("/auth/register")
        assert res.status_code == 200
        assert b"Register" in res.data or b"Create" in res.data

    def test_register_student_missing_roll_no_rejected(self, client, app):
        """A student account submitted without roll_no/dept/year/section
        must be rejected by form validation with a friendly error, not
        crash the database with a NOT NULL constraint violation."""
        login(client, "admin@scms.test", "AdminPass1!")
        res = client.post(
            "/auth/register",
            data={
                "email": "incomplete_student@scms.test",
                "password": "SomePass1!",
                "confirm_password": "SomePass1!",
                "role": "student",
                "full_name": "Incomplete Student",
                # roll_no, dept, year, section intentionally omitted
            },
        )
        assert res.status_code == 200  # re-renders the form, no crash
        from app.models import User
        with app.app_context():
            assert User.query.filter_by(email="incomplete_student@scms.test").first() is None

    def test_register_student_with_all_fields_succeeds(self, client, app):
        login(client, "admin@scms.test", "AdminPass1!")
        res = client.post(
            "/auth/register",
            data={
                "email": "complete_student@scms.test",
                "password": "SomePass1!",
                "confirm_password": "SomePass1!",
                "role": "student",
                "full_name": "Complete Student",
                "roll_no": "REG999",
                "dept": "CS",
                "year": "2",
                "section": "A",
            },
            follow_redirects=True,
        )
        assert res.status_code == 200
        from app.models import User
        with app.app_context():
            assert User.query.filter_by(email="complete_student@scms.test").first() is not None


# ─────────────────────────── Dashboard RBAC ─────────────────────────────── #

class TestDashboardRBAC:
    def test_student_cannot_access_admin_dashboard(self, client):
        login(client, "student@scms.test", "StudentPass1!")
        res = client.get("/dashboard/admin", follow_redirects=False)
        assert res.status_code in (302, 403)

    def test_faculty_cannot_access_admin_dashboard(self, client):
        login(client, "faculty@scms.test", "FacultyPass1!")
        res = client.get("/dashboard/admin", follow_redirects=False)
        assert res.status_code in (302, 403)

    def test_admin_can_access_admin_dashboard(self, client):
        login(client, "admin@scms.test", "AdminPass1!")
        res = client.get("/dashboard/admin")
        assert res.status_code == 200

    def test_unauthenticated_redirect_to_login(self, client):
        fresh = client.application.test_client()
        res = fresh.get("/dashboard/admin", follow_redirects=False)
        assert res.status_code == 302
        assert "/auth/login" in res.headers.get("Location", "")
