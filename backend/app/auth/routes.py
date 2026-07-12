"""
app/auth/routes.py
Authentication routes: login, logout, register (admin-only).
Rate limiting on login: max 5 attempts per minute per IP.
"""
from flask import (
    Blueprint,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy.exc import IntegrityError

from app.extensions import db, limiter
from app.models.user import RoleEnum, User
from app.models.student import Student
from app.models.faculty import Faculty

from .decorators import role_required
from .forms import LoginForm, RegisterForm

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# --------------------------------------------------------------------------- #
#  Login                                                                        #
# --------------------------------------------------------------------------- #
@auth_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute")
def login():
    """Validate credentials and set the session cookie.

    The identifier field accepts any of:
      - An email address (all roles)
      - A student roll number (student role lookup)
      - A faculty / admin employee ID (faculty role lookup)
    The same generic error message is used regardless of which field
    was wrong, so the response does not reveal which identifier exists.
    """
    if current_user.is_authenticated:
        return _redirect_by_role(current_user)

    form = LoginForm()
    if form.validate_on_submit():
        ident = form.identifier.data.strip()

        # 1. Try matching by email (case-insensitive)
        user = User.query.filter_by(email=ident.lower()).first()

        # 2. Try matching by student roll number (case-sensitive as stored)
        if not user:
            student = Student.query.filter_by(roll_no=ident).first()
            if student:
                user = student.user

        # 3. Try matching by faculty / admin employee ID
        if not user:
            faculty = Faculty.query.filter_by(emp_id=ident).first()
            if faculty:
                user = faculty.user

        # Authenticate — do not reveal which field was wrong
        if user and user.is_active and user.check_password(form.password.data):
            login_user(user, remember=False)
            # Safe redirect — only allow relative paths
            next_page = request.args.get("next")
            if next_page and next_page.startswith("/"):
                return redirect(next_page)
            return _redirect_by_role(user)

        flash("Invalid credentials. Please try again.", "danger")

    return render_template("auth/login.html", form=form, title="Sign In")


# --------------------------------------------------------------------------- #
#  Logout                                                                       #
# --------------------------------------------------------------------------- #
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """Clear the session and redirect to login."""
    logout_user()
    flash("You have been signed out successfully.", "info")
    return redirect(url_for("auth.login"))


# --------------------------------------------------------------------------- #
#  Register — Admin only                                                        #
# --------------------------------------------------------------------------- #
@auth_bp.route("/register", methods=["GET", "POST"])
@login_required
@role_required("admin")
def register():
    """Admin creates a new user account (student or faculty)."""
    form = RegisterForm()
    if form.validate_on_submit():
        email = form.email.data.strip().lower()

        # Duplicate email check
        if User.query.filter_by(email=email).first():
            flash("An account with that email already exists.", "danger")
            return render_template("auth/register.html", form=form, title="Register User")

        try:
            role_enum = RoleEnum[form.role.data]
        except KeyError:
            flash("Invalid role selected.", "danger")
            return render_template("auth/register.html", form=form, title="Register User")

        user = User(email=email, role=role_enum, is_active=True)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.flush()  # get user.id before profile creation

        if role_enum == RoleEnum.student:
            profile = Student(
                user_id=user.id,
                roll_no=form.roll_no.data.strip(),
                full_name=form.full_name.data.strip(),
                dept=form.dept.data.strip(),
                year=int(form.year.data) if form.year.data else 1,
                section=form.section.data.strip(),
                phone=(form.phone.data or "").strip() or None,
            )
            db.session.add(profile)
        elif role_enum == RoleEnum.faculty:
            profile = Faculty(
                user_id=user.id,
                emp_id=form.emp_id.data.strip(),
                full_name=form.full_name.data.strip(),
                dept=form.dept.data.strip(),
                designation=form.designation.data.strip(),
                phone=(form.phone.data or "").strip() or None,
            )
            db.session.add(profile)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash("That email, roll number, or employee ID is already in use.", "danger")
            return render_template("auth/register.html", form=form, title="Register User")

        flash(f"Account created for {email}.", "success")
        return redirect(url_for("dashboard.admin_dashboard"))

    return render_template("auth/register.html", form=form, title="Register User")


# --------------------------------------------------------------------------- #
#  Helper                                                                       #
# --------------------------------------------------------------------------- #
def _redirect_by_role(user: User):
    """Redirect to the correct dashboard based on role."""
    if user.role == RoleEnum.admin:
        return redirect(url_for("dashboard.admin_dashboard"))
    if user.role == RoleEnum.faculty:
        return redirect(url_for("dashboard.faculty_dashboard"))
    return redirect(url_for("dashboard.student_dashboard"))
