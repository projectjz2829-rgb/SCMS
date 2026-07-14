"""
wsgi.py
Production WSGI entry point — loaded by Gunicorn.

On every startup:
  1. db.create_all() ensures all ORM-defined tables exist in PostgreSQL.
     It is idempotent — it never drops or alters existing tables.
     No flask-migrate history files exist, so this is the safe bootstrap path.
  2. An admin account is seeded if none exists yet.
Environment variables:
  FLASK_ENV      - 'production' (default) or 'development'
  ADMIN_EMAIL    - Admin login email (default: admin@scms.edu)
  ADMIN_PASSWORD - Admin login password (default: Admin@1234)
"""
import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db

app = create_app(os.environ.get("FLASK_ENV", "production"))

with app.app_context():
    # ------------------------------------------------------------------ #
    #  Ensure all tables exist.                                           #
    #  db.create_all() is safe to call on every startup — it only        #
    #  creates tables that are missing and never drops or alters          #
    #  existing ones. Since no migration version files exist yet,         #
    #  flask db upgrade does nothing, so this is required to             #
    #  initialise the PostgreSQL schema on Render.                        #
    # ------------------------------------------------------------------ #
    try:
        db.create_all()
        print("[OK] Database tables verified/created")
    except Exception as exc:
        print(f"[WARN] db.create_all() skipped: {exc}")

    # ------------------------------------------------------------------ #
    #  Admin seeding — idempotent, safe to run on every startup.          #
    # ------------------------------------------------------------------ #
    try:
        from app.models.user import User, RoleEnum
        admin_email    = os.environ.get("ADMIN_EMAIL",    "admin@scms.edu")
        admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")

        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                email=admin_email,
                role=RoleEnum.admin,
                is_active=True,
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print(f"[OK] Admin created: {admin_email}")
        else:
            print(f"[OK] Admin already exists: {admin_email}")
    except Exception as exc:
        print(f"[WARN] Admin seeding skipped: {exc}")


if __name__ == "__main__":
    app.run()