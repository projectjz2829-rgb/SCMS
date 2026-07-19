#!/bin/bash
set -e

echo "==> Bootstrapping Database & Migrations..."
export FLASK_APP=wsgi:app

# Phase 7: Safely create ONLY missing tables (e.g., announcements) without touching existing data
python -c "
from app import create_app
from app.extensions import db
app = create_app()
with app.app_context():
    db.create_all()
    print('==> Missing tables safely created via db.create_all()')
"

# Phase 4: Repair Alembic State if missing on an existing database
python -c "
from app import create_app
from app.extensions import db
from sqlalchemy import inspect
import subprocess
app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    if 'users' in tables and 'alembic_version' not in tables:
        print('==> Existing database detected without Alembic state. Bootstrapping Alembic to head...')
        subprocess.run(['flask', 'db', 'stamp', 'head'], check=True)
"

# Phase 5 & 6: Run migrations and FAIL loudly if they break (no hidden fallback)
echo "==> Running flask db upgrade..."
flask db upgrade

echo "==> Starting server..."
exec gunicorn wsgi:app --workers 2 --threads 2 --bind 0.0.0.0:$PORT --log-level warning --access-logfile -