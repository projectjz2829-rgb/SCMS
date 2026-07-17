"""
app/auth/decorators.py
Custom RBAC decorator — role_required(role).
Must be applied AFTER @login_required so current_user is guaranteed to be set.
"""
from functools import wraps

from flask import abort
from flask_login import current_user

from app.models.user import RoleEnum


def role_required(*roles: str):
    """
    Decorator factory that enforces role-based access control.

    Usage::

        @login_required
        @role_required('admin')
        def admin_only_view():
            ...

        @login_required
        @role_required('admin', 'faculty')
        def admin_or_faculty_view():
            ...

    Returns HTTP 401 if the user is not authenticated.
    Returns HTTP 403 if the authenticated user's role is not in *roles*.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Check authentication first — before any role resolution.
            if not current_user.is_authenticated:
                abort(401)

            # Convert string roles to RoleEnum members for comparison.
            allowed = set()
            for r in roles:
                try:
                    allowed.add(RoleEnum[r])
                except KeyError:
                    # Unknown role name in decorator call — treat as programmer
                    # error and refuse access rather than silently allowing it.
                    abort(403)

            if current_user.role not in allowed:
                abort(403)

            return fn(*args, **kwargs)

        return wrapper

    return decorator
