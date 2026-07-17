"""
app/api/__init__.py
API blueprint package — registers all sub-blueprints under /api.
"""
from flask import Blueprint

from .students import students_bp
from .faculty import faculty_bp
from .courses import courses_bp
from .attendance import attendance_bp
from .marks import marks_bp



def register_api_blueprints(app):
    """Register every API sub-blueprint onto the app."""
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(faculty_bp, url_prefix="/api/faculty")
    app.register_blueprint(courses_bp, url_prefix="/api/courses")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(marks_bp, url_prefix="/api/marks")


__all__ = ["register_api_blueprints"]
