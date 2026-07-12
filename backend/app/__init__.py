"""
app/__init__.py
Application factory — create_app(config_name).
Follows the Flask Application Factory pattern to support multiple configs
(development, testing, production) and avoid circular imports.
"""
import os

from dotenv import load_dotenv
from flask import Flask, jsonify

# Load .env before any config is read
load_dotenv()

from app.config import config
from app.extensions import db, migrate, bcrypt, login_manager, csrf, limiter


def create_app(config_name: str = "default") -> Flask:
    """
    Create and configure the Flask application.

    :param config_name: Key into the ``config`` dict (default, development,
                        testing, production).
    :return: Configured Flask application instance.
    """
    app = Flask(
        __name__,
        template_folder="../../frontend/templates",
        static_folder="../../frontend/static",
    )

    # ------------------------------------------------------------------ #
    #  Load configuration                                                  #
    # ------------------------------------------------------------------ #
    app.config.from_object(config[config_name])

    # Enforce custom SECRET_KEY in production to prevent fallback usage
    if config_name == "production" or app.config.get("ENV") == "production":
        if app.config.get("SECRET_KEY") == "fallback-dev-key-change-in-production":
            raise ValueError("SECRET_KEY environment variable MUST be set in production mode!")

    # ------------------------------------------------------------------ #
    #  Initialise extensions                                               #
    # ------------------------------------------------------------------ #
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    # ------------------------------------------------------------------ #
    #  Import all models so SQLAlchemy mapper is complete before           #
    #  db.create_all() is called                                           #
    # ------------------------------------------------------------------ #
    with app.app_context():
        from app.models import (  # noqa: F401
            User,
            Student,
            Faculty,
            Course,
            Enrollment,
            Attendance,
            Marks,
        )

        # ------------------------------------------------------------------ #
        #  Register blueprints                                                 #
        # ------------------------------------------------------------------ #
        from app.auth import auth_bp
        app.register_blueprint(auth_bp)

        from app.api import register_api_blueprints
        register_api_blueprints(app)

        from app.dashboard import dashboard_bp
        app.register_blueprint(dashboard_bp)

        # ------------------------------------------------------------------ #
        #  Root redirect                                                       #
        # ------------------------------------------------------------------ #
        from flask import redirect, url_for

        @app.route("/")
        def root():
            return redirect(url_for("auth.login"))

        # ------------------------------------------------------------------ #
        #  Security headers — applied to every response                        #
        # ------------------------------------------------------------------ #
        @app.after_request
        def set_security_headers(response):
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Content-Security-Policy"] = (
                "frame-ancestors 'none'; "
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' "
                "https://cdn.jsdelivr.net https://cdnjs.cloudflare.com "
                "https://cdn.jsdelivr.net/npm/chart.js; "
                "style-src 'self' 'unsafe-inline' "
                "https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data:;"
            )
            # Disable browser APIs that this app does not use — prevents
            # accidental or malicious activation of sensors via iframe injection.
            response.headers["Permissions-Policy"] = (
                "geolocation=(), microphone=(), camera=()"
            )
            return response

        # ------------------------------------------------------------------ #
        #  Error handlers                                                       #
        # ------------------------------------------------------------------ #
        @app.errorhandler(403)
        def forbidden(e):
            return jsonify({"error": "Forbidden", "message": str(e)}), 403

        @app.errorhandler(404)
        def not_found(e):
            return jsonify({"error": "Not Found", "message": str(e)}), 404

        @app.errorhandler(429)
        def rate_limited(e):
            return jsonify({"error": "Too Many Requests", "message": str(e)}), 429

        @app.errorhandler(500)
        def internal_error(e):
            db.session.rollback()
            # Log the real exception for developers, but never send raw
            # exception details (stack traces, file paths, SQL, etc.) to
            # the client — that's an information-disclosure risk.
            app.logger.exception("Unhandled server error")
            return jsonify({
                "error": "Internal Server Error",
                "message": "Something went wrong on our end. Please try again later."
            }), 500

        # ------------------------------------------------------------------ #
        #  Logging — stdout for PaaS (Render captures stdout/stderr only)   #
        # ------------------------------------------------------------------ #
        if not app.debug and not app.testing:
            import logging
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(logging.Formatter(
                "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
            ))
            stream_handler.setLevel(logging.WARNING)
            app.logger.addHandler(stream_handler)
            app.logger.setLevel(logging.WARNING)
            app.logger.info("SCMS startup initialised successfully")

        # Only auto-create tables in dev/test; production relies on migrations
        if app.config.get("TESTING") or app.config.get("DEBUG"):
            db.create_all()

    return app