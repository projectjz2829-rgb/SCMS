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
    # Verify tables and Alembic state after start.sh ran migrations
    import logging
    from sqlalchemy import inspect
    
    logger = logging.getLogger(__name__)
    
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    if "alembic_version" in tables:
        try:
            with db.engine.connect() as conn:
                from sqlalchemy import text
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                version = result.scalar()
                app.logger.warning(f"Database migration completed successfully. Current Alembic revision: {version}")
        except Exception as e:
            app.logger.warning(f"Could not read alembic_version: {e}")
    else:
        app.logger.warning("No alembic_version table found. Migrations may not have run.")

    if "announcements" in tables:
        app.logger.warning("Announcements table detected")
    else:
        app.logger.warning("Announcements table is missing!")
        
    if "activity_logs" in tables:
        app.logger.warning("ActivityLog table detected")
    else:
        app.logger.warning("ActivityLog table is missing!")


if __name__ == "__main__":
    app.run()