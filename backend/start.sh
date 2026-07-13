#!/bin/bash
set -e
echo "==> Running migrations..."
flask db upgrade
echo "==> Starting server..."
exec gunicorn wsgi:app --workers 2 --threads 2 --bind 0.0.0.0:$PORT --log-level warning --access-logfile -