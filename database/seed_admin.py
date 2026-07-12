"""
seed_admin.py
Creates or resets the admin account.

Usage:
    python seed_admin.py [password] [--email EMAIL] [--password PASSWORD]

Optional: override the admin email as well:
    python seed_admin.py --email admin@example.com --password "YourStr0ng#Pass"

SECURITY NOTE: While having a fallback default password is convenient for college 
projects, it is a security risk to commit default credentials to version control.
You should override the default password using the ADMIN_PASSWORD environment variable.
"""
import sys
import os
import argparse
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

# Load .env relative to this file's position (inside backend/)
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/.env"))
load_dotenv(dotenv_path=dotenv_path)

from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum

# ── CLI argument parsing ──────────────────────────────────────────────────
parser = argparse.ArgumentParser(
    description="Seed or reset the SCMS admin account."
)
parser.add_argument(
    "--email",
    default="admin@bonsecours.edu.in",
    help="Admin email address (default: admin@bonsecours.edu.in)",
)
parser.add_argument(
    "--password",
    required=False,
    help="Admin account password.",
)
parser.add_argument(
    "password_pos",
    nargs="?",
    default=None,
    help="Admin password override as positional argument (sys.argv[1]).",
)
args = parser.parse_args()

DEFAULT_EMAIL = args.email

# Resolve password:
# 1. Check --password argument
# 2. Check positional argument (sys.argv[1])
# 3. Check environment variable ADMIN_PASSWORD
# 4. Fallback to default "Admin@SCMS2024!"
password = args.password or args.password_pos
if not password:
    password = os.environ.get("ADMIN_PASSWORD", "Admin@SCMS2024!")

app = create_app(os.environ.get("FLASK_ENV", "development"))

with app.app_context():
    existing = User.query.filter_by(email=DEFAULT_EMAIL).first()
    if existing:
        print(f"[INFO] Admin already exists: {DEFAULT_EMAIL}")
        existing.set_password(password)
        db.session.commit()
        print(f"[OK] Password updated for {DEFAULT_EMAIL}")
        print("[TIP] Set ADMIN_PASSWORD in your .env to override the default password.")
        sys.exit(0)

    admin = User(email=DEFAULT_EMAIL, role=RoleEnum.admin, is_active=True)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

    print()
    print("=" * 50)
    print("  Admin account created successfully!")
    print(f"  Email:    {DEFAULT_EMAIL}")
    print(f"  Password: {password}")
    print("=" * 50)
    print()
    print("[TIP] Set ADMIN_PASSWORD in your .env to override the default password.")
    print("[IMPORTANT] Change this password after first login.")
