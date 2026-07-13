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
    #  Admin seeding — idempotent, safe to run on every startup.          #
    #  The schema must already exist at this point (created by            #
    #  `flask db upgrade` in start.sh).                                   #
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
    except Exception as exc:  # noqa: BLE001
        # On first deploy the DB may not be ready yet — log and continue;
        # start.sh runs migrations before this code runs so this is
        # only a safety net for edge cases (e.g. connection refused).
        print(f"[WARN] Admin seeding skipped: {exc}")

if __name__ == "__main__":
    app.run()