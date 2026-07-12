"""
app/auth/__init__.py
Auth blueprint package — exposes the Blueprint instance for registration.
"""
from .routes import auth_bp

__all__ = ["auth_bp"]
