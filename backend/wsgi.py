import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db

app = create_app(os.environ.get("FLASK_ENV", "production"))

with app.app_context():
    # Step 1 — Run migrations
    try:
        from flask_migrate import upgrade
        upgrade()
        print("[OK] Migrations applied successfully")
    except Exception as e:
        print(f"[WARN] Migration error: {e}")
        try:
            db.create_all()
            print("[OK] Tables created via db.create_all()")
        except Exception as e2:
            print(f"[ERROR] db.create_all() failed: {e2}")

    # Step 2 — Seed admin account
    try:
        from app.models.user import User, RoleEnum
        admin_email = "admin@bonsecours.edu.in"
        existing = User.query.filter_by(email=admin_email).first()
        if not existing:
            password = os.environ.get("ADMIN_PASSWORD", "Admin@SCMS2024!")
            admin = User(
                email=admin_email,
                role=RoleEnum.admin,
                is_active=True
            )
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print(f"[OK] Admin created: {admin_email}")
        else:
            print(f"[OK] Admin already exists: {admin_email}")
    except Exception as e:
        print(f"[ERROR] Admin seed failed: {e}")

if __name__ == "__main__":
    app.run()