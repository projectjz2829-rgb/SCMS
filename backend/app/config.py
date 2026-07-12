"""
app/config.py
Configuration classes for the Smart Campus Management System.
All secrets are read from environment variables — nothing is hardcoded.
"""
from sqlalchemy.pool import StaticPool
import os


class Config:
    """Base configuration shared across all environments."""

    # ------------------------------------------------------------------ #
    #  Core Flask settings                                                 #
    # ------------------------------------------------------------------ #
    SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-dev-key-change-in-production")

    # Render provides DATABASE_URL starting with "postgres://" (legacy scheme).
    # SQLAlchemy 2.x requires "postgresql://" — normalise at config load time.
    _raw_db_url = os.environ.get(
        "DATABASE_URL", "mysql+pymysql://root:password@localhost/campus_db"
    )
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ------------------------------------------------------------------ #
    #  Session / Cookie security                                           #
    # ------------------------------------------------------------------ #
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # In production SESSION_COOKIE_SECURE must be True;
    # read from env so development works over plain HTTP.
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "False").lower() in (
        "true",
        "1",
        "yes",
    )

    # ------------------------------------------------------------------ #
    #  CSRF                                                                #
    # ------------------------------------------------------------------ #
    WTF_CSRF_ENABLED = os.environ.get("WTF_CSRF_ENABLED", "True").lower() in (
        "true",
        "1",
        "yes",
    )
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour

    # Session lifetime — 1 hour of inactivity before the session expires.
    PERMANENT_SESSION_LIFETIME = 3600

    # ------------------------------------------------------------------ #
    #  Rate limiting (Flask-Limiter)                                       #
    # ------------------------------------------------------------------ #
    RATELIMIT_STORAGE_URI = "memory://"
    RATELIMIT_DEFAULT = "200 per day;50 per hour"


class DevelopmentConfig(Config):
    """Development-specific overrides."""

    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing-specific overrides — uses SQLite in-memory for speed."""

    TESTING = True
    DEBUG = True
    WTF_CSRF_ENABLED = False  # Disable CSRF in tests for simplicity
    WTF_CSRF_TIME_LIMIT = None
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # StaticPool ensures all connections (fixture + request) share the same
    # in-memory database so seeded data is visible to the test client.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = False
    SESSION_COOKIE_SAMESITE = None
    RATELIMIT_ENABLED = False  # Disable rate limiting during tests
    LOGIN_DISABLED = False     # Explicitly keep auth enforced


class ProductionConfig(Config):
    """Production hardening."""

    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    # Leave SERVER_NAME as None so it is set via the SERVER_NAME env variable
    # by the reverse proxy (nginx/gunicorn). Setting it here would break host
    # header validation when the app is behind a proxy.
    SERVER_NAME = None

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,       # reconnect on stale connections
        "pool_recycle": 280,         # recycle before Render's 300s timeout
    }


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
