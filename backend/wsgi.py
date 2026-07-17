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

    pass


if __name__ == "__main__":
    app.run()