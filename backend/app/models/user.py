"""
app/models/user.py
User model — authentication entity for all roles.
"""
import enum
from datetime import datetime

from flask_login import UserMixin

from app.extensions import db, bcrypt, login_manager


class RoleEnum(enum.Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class User(UserMixin, db.Model):
    """Core user account shared by admin, faculty, and student roles."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum(RoleEnum),
        nullable=False,
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # ------------------------------------------------------------------ #
    #  Relationships (back-references from Student / Faculty)              #
    # ------------------------------------------------------------------ #
    student_profile = db.relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    faculty_profile = db.relationship(
        "Faculty", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    # ------------------------------------------------------------------ #
    #  Password helpers                                                    #
    # ------------------------------------------------------------------ #
    def set_password(self, plaintext: str) -> None:
        """Hash *plaintext* using Bcrypt and store the result."""
        self.password_hash = bcrypt.generate_password_hash(plaintext).decode("utf-8")

    def check_password(self, plaintext: str) -> bool:
        """Return True if *plaintext* matches the stored hash."""
        return bcrypt.check_password_hash(self.password_hash, plaintext)

    # ------------------------------------------------------------------ #
    #  Flask-Login helpers                                                 #
    # ------------------------------------------------------------------ #
    @property
    def is_admin(self) -> bool:
        return self.role == RoleEnum.admin

    @property
    def is_faculty(self) -> bool:
        return self.role == RoleEnum.faculty

    @property
    def is_student(self) -> bool:
        return self.role == RoleEnum.student

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role.value,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role.value}>"


# --------------------------------------------------------------------------- #
#  Flask-Login user loader                                                      #
# --------------------------------------------------------------------------- #
@login_manager.user_loader
def load_user(user_id: str):
    return db.session.get(User, int(user_id))
