
"""
app/auth/routes.py
Authentication routes: login, logout, register (admin-only).
Rate limiting on login: max 5 attempts per minute per IP.
"""
from urllib.parse import urlparse

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy.exc import IntegrityError

from app.extensions import db, limiter, csrf
from app.models.user import RoleEnum, User
from app.models.student import Student
from app.models.faculty import Faculty
from app.api.responses import success_response, error_response

from .decorators import role_required
from .forms import LoginForm, RegisterForm

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# --------------------------------------------------------------------------- #
#  Session Expiration (Inactivity and Absolute Timeout)                         #
# --------------------------------------------------------------------------- #
@auth_bp.before_app_request
def verify_session_timeouts():
    if current_user.is_authenticated:
        import time
        now = time.time()
        
        # We rely on Flask's native session expiration (PERMANENT_SESSION_LIFETIME) for general cookie expiry,
        # but actively enforce inactivity (1 hr) and absolute (12 hr) timeouts here for explicit protection.
        
        last_active = session.get("last_active", now)
        login_time = session.get("login_time", now)

        # Absolute timeout: 12 hours max lifetime
        if now - login_time > 12 * 3600:
            logout_user()
            session.clear()
            flash("Your session has expired. Please log in again.", "warning")
            return redirect(url_for("auth.login"))

        # Inactivity timeout: 1 hour (matches PERMANENT_SESSION_LIFETIME)
        if now - last_active > 3600:
            logout_user()
            session.clear()
            flash("You have been logged out due to inactivity.", "warning")
            return redirect(url_for("auth.login"))

        # Update last_active timestamp to current time for next check
        session["last_active"] = now


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
        if request.is_json:
            return success_response({"role": current_user.role.value}, message="Already authenticated")
        return _redirect_by_role(current_user)

    ident = None
    password = None
    form = None

    if request.is_json:
        data = request.get_json()
        ident = data.get("identifier", "").strip()
        password = data.get("password", "")
    else:
        form = LoginForm()
        if form.validate_on_submit():
            ident = form.identifier.data.strip()
            password = form.password.data

    if ident and password:
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

        # Timing attack mitigation: prevent user enumeration by normalizing time
        # If user is not found, we perform a dummy bcrypt comparison.
        from app.extensions import bcrypt
        if not user:
            # $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.6K3Ew.vjG/QW2 is a valid bcrypt hash
            bcrypt.check_password_hash("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lew.6K3Ew.vjG/QW2", password)

        # Authenticate — do not reveal which field was wrong
        if user and user.is_active and user.check_password(password):
            # Prevent session fixation by clearing existing session data before authenticating
            session.clear()
            
            login_user(user, remember=False)
            
            # Make the session permanent so PERMANENT_SESSION_LIFETIME (1 h) is enforced.
            session.permanent = True
            
            # Set initial session timeouts
            import time
            now = time.time()
            session["login_time"] = now
            session["last_active"] = now

            if request.is_json:
                return success_response({"role": user.role.value}, message="Login successful")

            # Safe redirect — only allow same-origin relative paths (no netloc / scheme).
            next_page = request.args.get("next", "")
            parsed = urlparse(next_page)
            if next_page and not parsed.scheme and not parsed.netloc:
                return redirect(next_page)
            return _redirect_by_role(user)

        if request.is_json:
            return error_response("Invalid credentials. Please try again.", status_code=401)
        flash("Invalid credentials. Please try again.", "danger")

    if request.is_json:
        return error_response("Identifier and password are required.", status_code=400)
        
    return render_template("auth/login.html", form=form, title="Sign In")


# --------------------------------------------------------------------------- #
#  Logout                                                                       #
# --------------------------------------------------------------------------- #
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """Fully clear the session and redirect to login.

    Calls logout_user() first (removes Flask-Login's _user_id), then
    clears the entire Flask session to ensure nothing is left behind,
    and marks the response as non-cacheable so the browser back-button
    cannot restore the authenticated page from cache.
    """
    logout_user()
    session.clear()
    
    if request.is_json:
        return success_response(None, message="You have been signed out successfully.")

    flash("You have been signed out successfully.", "info")
    response = redirect(url_for("auth.login"))
    # Prevent the browser from caching the redirect or any in-flight page
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


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

        # Preemptive duplicate checks for profile unique keys
        if role_enum == RoleEnum.student:
            roll_no = (form.roll_no.data or '').strip()
            if Student.query.filter_by(roll_no=roll_no).first():
                flash("That roll number is already in use.", "danger")
                return render_template("auth/register.html", form=form, title="Register User")
        elif role_enum == RoleEnum.faculty:
            emp_id = (form.emp_id.data or '').strip()
            if Faculty.query.filter_by(emp_id=emp_id).first():
                flash("That employee ID is already in use.", "danger")
                return render_template("auth/register.html", form=form, title="Register User")

        try:
            user = User(email=email, role=role_enum, is_active=True)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.flush()  # get user.id before profile creation

            if role_enum == RoleEnum.student:
                profile = Student(
                    user_id=user.id,
                    roll_no=(form.roll_no.data or '').strip(),
                    full_name=(form.full_name.data or '').strip(),
                    dept=(form.dept.data or '').strip(),
                    year=int(form.year.data) if form.year.data else 1,
                    section=(form.section.data or '').strip(),
                    phone=(form.phone.data or '').strip() or None,
                )
                db.session.add(profile)
            elif role_enum == RoleEnum.faculty:
                profile = Faculty(
                    user_id=user.id,
                    emp_id=(form.emp_id.data or '').strip(),
                    full_name=(form.full_name.data or '').strip(),
                    dept=(form.dept.data or '').strip(),
                    designation=(form.designation.data or '').strip(),
                    phone=(form.phone.data or '').strip() or None,
                )
                db.session.add(profile)

            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash("That email, roll number, or employee ID is already in use.", "danger")
            return render_template("auth/register.html", form=form, title="Register User")

        flash(f"Account created for {email}.", "success")
        return redirect(url_for("dashboard.admin_dashboard"))

    # Form validation failed — collect all errors and flash them
    errors = []
    for field_name, field_errors in form.errors.items():
        for err in field_errors:
            errors.append(f"{field_name}: {err}")
    if errors:
        flash("Please fix the following errors: " + " | ".join(errors), "danger")

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
