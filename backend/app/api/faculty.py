"""
app/api/faculty.py
Faculty REST API — full CRUD plus courses sub-resource.
IDOR protection: faculty can only read their own record; admin can read all.
"""
import re
from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app.api.responses import success_response, error_response, handle_api_exceptions
from app.extensions import db
from app.models.faculty import Faculty
from app.models.user import RoleEnum, User
from app.auth.decorators import role_required

faculty_bp = Blueprint("faculty", __name__)


# ─────────────────────────── helpers ────────────────────────────────────── #

def _get_faculty_or_none(faculty_id: int):
    return db.session.get(Faculty, faculty_id)


def _idor_check_faculty(faculty: Faculty) -> bool:
    if current_user.role == RoleEnum.admin:
        return True
    if current_user.role == RoleEnum.faculty:
        return (
            current_user.faculty_profile is not None
            and current_user.faculty_profile.id == faculty.id
        )
    return False


# ─────────────────────────── list / create ──────────────────────────────── #

@faculty_bp.route("/", methods=["GET"])
@login_required
@role_required("admin")
@handle_api_exceptions
def list_faculty():
    """GET /api/faculty/ — Admin only."""
    results = (
        db.session.query(Faculty, User.email)
        .join(User, User.id == Faculty.user_id)
        .order_by(Faculty.emp_id)
        .all()
    )
    return success_response([f.to_dict(email=e) for f, e in results])


@faculty_bp.route("/", methods=["POST"])
@login_required
@role_required("admin")
@handle_api_exceptions
def create_faculty():
    """POST /api/faculty/ — Admin only."""
    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "email": {"type": str, "required": True, "max_length": 120, "regex": r"^[^@]+@[^@]+\.[^@]+$"},
        "password": {"type": str, "required": True, "min_length": 6},
        "emp_id": {"type": str, "required": True, "max_length": 20},
        "full_name": {"type": str, "required": True, "max_length": 100},
        "dept": {"type": str, "required": True, "max_length": 50},
        "designation": {"type": str, "required": True, "max_length": 50},
        "phone": {"type": str, "required": False, "min_length": 7, "max_length": 15, "regex": r"^[0-9+\-\s]+$"}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    email_norm = cleaned_data["email"].lower()
    if User.query.filter_by(email=email_norm).first():
        return error_response("Email already registered.", status_code=409)

    emp_id_norm = cleaned_data["emp_id"]
    if Faculty.query.filter_by(emp_id=emp_id_norm).first():
        return error_response("Employee ID already exists.", status_code=409)

    user = User(
        email=email_norm,
        role=RoleEnum.faculty,
        is_active=True,
    )
    user.set_password(cleaned_data["password"])
    
    try:
        db.session.add(user)
        db.session.flush()

        faculty = Faculty(
            user_id=user.id,
            emp_id=emp_id_norm,
            full_name=cleaned_data["full_name"],
            dept=cleaned_data["dept"],
            designation=cleaned_data["designation"],
            phone=cleaned_data.get("phone")
        )
        db.session.add(faculty)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("Email or employee ID already in use.", status_code=409)
        
    return success_response(faculty.to_dict(), status_code=201)


# ─────────────────────────── read / update / delete ─────────────────────── #

@faculty_bp.route("/<int:faculty_id>", methods=["GET"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def get_faculty(faculty_id: int):
    """GET /api/faculty/<id> — Admin or own faculty."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return error_response("Faculty not found.", status_code=404)
    if not _idor_check_faculty(faculty):
        return error_response("Access forbidden.", status_code=403)
    return success_response(faculty.to_dict())


@faculty_bp.route("/<int:faculty_id>", methods=["PUT"])
@login_required
@role_required("admin")
@handle_api_exceptions
def update_faculty(faculty_id: int):
    """PUT /api/faculty/<id> — Admin only."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return error_response("Faculty not found.", status_code=404)

    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "full_name": {"type": str, "required": False, "max_length": 100},
        "dept": {"type": str, "required": False, "max_length": 50},
        "designation": {"type": str, "required": False, "max_length": 50},
        "phone": {"type": str, "required": False, "min_length": 7, "max_length": 15, "regex": r"^[0-9+\-\s]+$"}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    if "phone" in cleaned_data:
        faculty.phone = cleaned_data["phone"]

    for field in ("full_name", "dept", "designation"):
        if field in cleaned_data and cleaned_data[field] is not None:
            setattr(faculty, field, cleaned_data[field])

    db.session.commit()
    return success_response(faculty.to_dict())


@faculty_bp.route("/<int:faculty_id>", methods=["DELETE"])
@login_required
@role_required("admin")
@handle_api_exceptions
def delete_faculty(faculty_id: int):
    """DELETE /api/faculty/<id> — Admin only.

    Deletes the User account, which cascades to the Faculty profile
    (and all linked courses lose their faculty_id via SET NULL).
    Deleting only the Faculty row was a security bug — it left the
    User account intact, allowing the deleted faculty to still log in.
    """
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return error_response("Faculty not found.", status_code=404)
    # Delete the parent User account; SQLAlchemy cascade removes Faculty profile.
    user = faculty.user
    if user:
        db.session.delete(user)
    else:
        db.session.delete(faculty)  # fallback: orphaned profile with no User
    db.session.commit()
    return success_response(message="Faculty deleted.")


# ─────────────────────────── sub-resource ───────────────────────────────── #

@faculty_bp.route("/<int:faculty_id>/courses", methods=["GET"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def get_faculty_courses(faculty_id: int):
    """GET /api/faculty/<id>/courses — Own faculty or admin."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return error_response("Faculty not found.", status_code=404)
    if not _idor_check_faculty(faculty):
        return error_response("Access forbidden.", status_code=403)
    return success_response([c.to_dict() for c in faculty.courses])
