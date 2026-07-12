"""
app/dashboard/routes.py
Dashboard view routes — one view per role.
All routes are protected by @login_required + @role_required.
Templates receive minimal data; JS fetches the rest via API calls.
"""
from flask import render_template, redirect, url_for
from flask_login import current_user, login_required

from app.dashboard import dashboard_bp
from app.auth.decorators import role_required
from app.models.user import RoleEnum


# ─────────────────────────── root redirect ──────────────────────────────── #

@dashboard_bp.route("/")
@login_required
def index():
    """Redirect / to the correct dashboard based on role."""
    if current_user.role == RoleEnum.admin:
        return redirect(url_for("dashboard.admin_dashboard"))
    if current_user.role == RoleEnum.faculty:
        return redirect(url_for("dashboard.faculty_dashboard"))
    return redirect(url_for("dashboard.student_dashboard"))


# ─────────────────────────── admin ──────────────────────────────────────── #

@dashboard_bp.route("/admin")
@login_required
@role_required("admin")
def admin_dashboard():
    """Admin overview — data loaded by dashboard.js via API."""
    return render_template("dashboard/admin.html", title="Admin Dashboard")


# ─────────────────────────── faculty ────────────────────────────────────── #

@dashboard_bp.route("/faculty")
@login_required
@role_required("faculty")
def faculty_dashboard():
    """Faculty workspace — courses, attendance grid, and marks entry."""
    faculty = current_user.faculty_profile
    return render_template(
        "dashboard/faculty.html",
        title="Faculty Dashboard",
        faculty=faculty,
    )


# ─────────────────────────── student ────────────────────────────────────── #

@dashboard_bp.route("/student")
@login_required
@role_required("student")
def student_dashboard():
    """Student view — attendance summary, marks, and bulletin."""
    student = current_user.student_profile
    return render_template(
        "dashboard/student.html",
        title="Student Dashboard",
        student=student,
    )
