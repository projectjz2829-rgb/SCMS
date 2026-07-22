#!/bin/bash
set -e

echo "==> Bootstrapping Database & Migrations..."
export FLASK_APP=wsgi:app

# Repair Alembic State if migrations were incorrectly bypassed
python bootstrap_db.py

echo "==> Running flask db upgrade..."
flask db upgrade

echo "==> Starting server..."
exec gunicorn wsgi:app --workers 2 --threads 2 --bind 0.0.0.0:$PORT --log-level warning --access-logfile -