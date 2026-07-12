import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db

app = create_app(os.environ.get("FLASK_ENV", "production"))

with app.app_context():
    # Always create all tables directly — no migration files needed
    db.create_all()
    print("[OK] All database tables created")

    # Seed admin account
    from app.models.user import User, RoleEnum
    admin_email = "admin@bonsecours.edu.in"
    
    if not User.query.filter_by(email=admin_email).first():
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

if __name__ == "__main__":
    app.run()