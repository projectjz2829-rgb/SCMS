"""
wsgi.py
Production WSGI entry point — loaded by Gunicorn.

On every startup:
  1. flask db upgrade applies any pending Alembic migrations.
  2. An admin account is seeded if none exists yet.
Environment variables:
  FLASK_ENV      - 'production' (default) or 'development'
  ADMIN_EMAIL    - Admin login email (default: admin@scms.edu)
  ADMIN_PASSWORD - Admin login password (default: Admin@1234)
"""
import os
import subprocess
import sys
from dotenv import load_dotenv

load_dotenv()

from werkzeug.middleware.proxy_fix import ProxyFix
from app import create_app
from app.extensions import db

app = create_app(os.environ.get("FLASK_ENV", "production"))
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

with app.app_context():
    # (Database migrations are now handled externally via start.sh before Gunicorn boots)

    # ------------------------------------------------------------------ #
    #  Admin seeding — idempotent, safe to run on every startup.          #
    # ------------------------------------------------------------------ #
    try:
        from app.models.user import User, RoleEnum
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@scms.edu")
        admin_password = os.environ.get("ADMIN_PASSWORD")
        
        if not admin_password:
            if app.config.get("DEBUG"):
                admin_password = "Admin@1234"
            else:
                raise ValueError("ADMIN_PASSWORD environment variable MUST be set in production!")

        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                email=admin_email,
                role=RoleEnum.admin,
                is_active=True,
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            app.logger.info(f"[OK] Admin created: {admin_email}")
        else:
            app.logger.info(f"[OK] Admin already exists: {admin_email}")
    except Exception as exc:
        app.logger.warning(f"[WARN] Admin seeding skipped: {exc}")


if __name__ == "__main__":
    app.run()