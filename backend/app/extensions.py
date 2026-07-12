"""
app/extensions.py
Centralised extension instances.
All extensions are created here and initialised later inside create_app()
using the init_app() pattern to avoid circular imports.
"""
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# --------------------------------------------------------------------------- #
#  Core extensions                                                              #
# --------------------------------------------------------------------------- #
db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(key_func=get_remote_address)

# --------------------------------------------------------------------------- #
#  Login manager configuration                                                  #
# --------------------------------------------------------------------------- #
login_manager.login_view = "auth.login"
login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = "warning"
login_manager.session_protection = "strong"
