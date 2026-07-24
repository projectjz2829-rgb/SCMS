"""
app/__init__.py
Application factory — create_app(config_name).
Follows the Flask Application Factory pattern to support multiple configs
(development, testing, production) and avoid circular imports.
"""
import os
import mimetypes

# Fix for minimal environments like Render that might lack /etc/mime.types
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')

from dotenv import load_dotenv
from flask import Flask, render_template, jsonify

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
    if config_name == "production":
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
    #  Import all models so SQLAlchemy mapper / Alembic metadata is       #
    #  fully populated before blueprints are registered.                  #
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
            Announcement,
            ActivityLog,
            UserSettings,
            AnnouncementRead,
        )

        # ------------------------------------------------------------------ #
        #  Register blueprints                                                 #
        # ------------------------------------------------------------------ #
        #  Health Endpoint                                                     #
        # ------------------------------------------------------------------ #
        @app.route("/health")
        def health():
            return jsonify({"status": "ok"}), 200

        # ------------------------------------------------------------------ #
        # auth_bp handles POST JSON login/logout and session management
        from app.auth import auth_bp
        app.register_blueprint(auth_bp)

        from app.api import register_api_blueprints
        register_api_blueprints(app)

        # from app.dashboard import dashboard_bp
        # app.register_blueprint(dashboard_bp)

        # ------------------------------------------------------------------ #
        #  SPA Catch-all                                                       #
        # ------------------------------------------------------------------ #
        from flask import send_from_directory, make_response
        import os
        from flask_wtf.csrf import generate_csrf

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        @limiter.exempt
        def serve_spa(path):
            if path.startswith("api/") or path.startswith("auth/"):
                return jsonify({"error": "Not found"}), 404
                
            dist_dir = os.path.join(app.root_path, "static", "dist")
            if path != "" and os.path.exists(os.path.join(dist_dir, path)):
                resp = make_response(send_from_directory(dist_dir, path))
                if path.startswith("assets/"):
                    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
                return resp
                
            response = make_response(send_from_directory(dist_dir, "index.html"))
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.set_cookie("csrf_token", generate_csrf(), httponly=False, samesite="Lax")
            return response

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
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' "
                "https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data:;"
            )
            
            # Enforce HSTS in production (indicated by secure cookies)
            if app.config.get("SESSION_COOKIE_SECURE"):
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            # Disable browser APIs that this app does not use — prevents
            # accidental or malicious activation of sensors via iframe injection.
            response.headers["Permissions-Policy"] = (
                "geolocation=(), microphone=(), camera=()"
            )
            # Prevent the browser from caching authenticated pages.
            # After logout the back-button must re-request the server
            # (which will redirect to login) rather than serving stale
            # cached content that appears authenticated.
            from flask_login import current_user
            if current_user.is_authenticated:
                response.headers.setdefault(
                    "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
                )
                response.headers.setdefault("Pragma", "no-cache")
            return response

        # ------------------------------------------------------------------ #
        #  Error handlers                                                       #
        # ------------------------------------------------------------------ #
        from flask import request as flask_request

        def _wants_json():
            """Return True if the request expects a JSON response."""
            return (
                flask_request.is_json
                or flask_request.path.startswith("/api/")
                or 'application/json' in flask_request.headers.get('Accept', '')
            )

        from app.api.responses import error_response

        @app.errorhandler(400)
        def bad_request(e):
            if _wants_json():
                return error_response(f"Bad Request: {str(e)}", status_code=400)
            return render_template("errors/400.html", title="Bad Request"), 400

        @app.errorhandler(401)
        def unauthorized(e):
            if _wants_json():
                return error_response("Unauthorized", status_code=401)
            return render_template("errors/401.html", title="Unauthorized"), 401

        @app.errorhandler(403)
        def forbidden(e):
            if _wants_json():
                return error_response("Forbidden", status_code=403)
            return render_template("errors/403.html", title="Access Denied"), 403

        @app.errorhandler(404)
        def not_found(e):
            if _wants_json():
                return error_response("Not Found", status_code=404)
            return render_template("errors/404.html", title="Page Not Found"), 404

        @app.errorhandler(429)
        def rate_limited(e):
            if _wants_json():
                return error_response("Too Many Requests", status_code=429)
            return render_template("errors/429.html", title="Too Many Requests"), 429

        @app.errorhandler(500)
        @app.errorhandler(Exception)
        def internal_error(e):
            db.session.rollback()
            app.logger.exception("Unhandled server error")
            if _wants_json():
                return error_response("Something went wrong on our end. Please try again later.", status_code=500)
            return render_template("errors/500.html", title="Server Error"), 500

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
            app.logger.warning("SCMS startup initialised successfully")

    return app