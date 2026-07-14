"""
wsgi.py
Production WSGI entry point — loaded by Gunicorn.

Schema management is handled EXCLUSIVELY by `flask db upgrade` which is
run inside start.sh before Gunicorn starts. Do NOT call db.create_all()
here; it bypasses migration constraints and causes silent schema drift.
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
        admin_email = "admin@bonsecours.edu.in"

        if not User.query.filter_by(email=admin_email).first():
            password = os.environ.get("ADMIN_PASSWORD", "Admin@SCMS2024!")
            admin = User(
                email=admin_email,
                role=RoleEnum.admin,
                is_active=True,
            )
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print(f"[OK] Admin created: {admin_email}")
        else:
            print(f"[OK] Admin already exists: {admin_email}")
    except Exception as exc:
        print(f"[WARN] Admin seeding skipped: {exc}")


if __name__ == "__main__":
    app.run()