"""
app/dashboard/__init__.py
Dashboard blueprint package.
"""
from flask import Blueprint

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")

# Import routes after Blueprint is created to avoid circular imports
from app.dashboard import routes  # noqa: E402, F401

__all__ = ["dashboard_bp"]
