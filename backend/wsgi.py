"""
wsgi.py
WSGI entry point for production servers (Gunicorn on Render).

Render start command: gunicorn wsgi:app
"""
import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "production"))

if __name__ == "__main__":
    app.run()
