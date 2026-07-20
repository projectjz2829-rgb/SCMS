
"""
app/api/__init__.py
API blueprint package — registers all sub-blueprints under /api.
"""
from flask import Blueprint

from .auth import auth_api_bp
from .students import students_bp
from .faculty import faculty_bp
from .courses import courses_bp
from .attendance import attendance_bp
from .marks import marks_bp
from .announcements import announcements_bp
from .activities import activities_bp
from .settings import settings_bp
from .notifications import notifications_bp

from .dashboard import dashboard_api_bp
from .reports import reports_bp

def register_api_blueprints(app):
    """Register every API sub-blueprint onto the app."""
    app.register_blueprint(auth_api_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_api_bp, url_prefix="/api/dashboard")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(faculty_bp, url_prefix="/api/faculty")
    app.register_blueprint(courses_bp, url_prefix="/api/courses")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(marks_bp, url_prefix="/api/marks")
    app.register_blueprint(announcements_bp, url_prefix="/api/announcements")
    app.register_blueprint(activities_bp, url_prefix="/api/activities")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

__all__ = ["register_api_blueprints"]
