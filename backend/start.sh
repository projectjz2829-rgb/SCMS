#!/bin/bash
set -e

echo "==> Bootstrapping Database & Migrations..."
export FLASK_APP=wsgi:app

# Repair Alembic State if migrations were incorrectly bypassed
python -c "
from app import create_app
from app.extensions import db
from sqlalchemy import inspect, text
app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    initial_tables = {'users', 'students', 'faculty', 'courses', 'enrollments', 'attendance', 'marks'}
    newer_tables = {'announcements', 'activity_logs', 'user_settings', 'announcement_reads'}
    
    # If the database has initial tables but is missing any of the newer tables
    if initial_tables.issubset(set(tables)) and not newer_tables.issubset(set(tables)):
        with db.engine.connect() as conn:
            with conn.begin():
                if 'alembic_version' not in tables:
                    print('==> Bootstrapping missing alembic_version to initial schema...')
                    conn.execute(text('CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num))'))
                    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('e2495bd7b9ab')"))
                else:
                    # Check what version it thinks it is at
                    result = conn.execute(text('SELECT version_num FROM alembic_version'))
                    version = result.scalar()
                    if version != 'e2495bd7b9ab':
                        print(f'==> Repairing incorrect alembic_version {version} -> e2495bd7b9ab...')
                        conn.execute(text("UPDATE alembic_version SET version_num = 'e2495bd7b9ab'"))
"

echo "==> Running flask db upgrade..."
flask db upgrade

echo "==> Starting server..."
exec gunicorn wsgi:app --workers 2 --threads 2 --bind 0.0.0.0:$PORT --log-level warning --access-logfile -