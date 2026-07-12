"""
app/api/faculty.py
Faculty REST API — full CRUD plus courses sub-resource.
IDOR protection: faculty can only read their own record; admin can read all.
"""
import re
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

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
def list_faculty():
    """GET /api/faculty/ — Admin only."""
    all_faculty = Faculty.query.order_by(Faculty.emp_id).all()
    return jsonify([f.to_dict() for f in all_faculty]), 200


@faculty_bp.route("/", methods=["POST"])
@login_required
@role_required("admin")
def create_faculty():
    """POST /api/faculty/ — Admin only."""
    data = request.get_json(silent=True) or {}
    required = ("email", "password", "emp_id", "full_name", "dept", "designation")
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # ── Email normalisation ───────────────────────────────────────────── #
    # strip() + lower() applied before the uniqueness check (confirmed present).
    email_norm = data["email"].strip().lower()
    if User.query.filter_by(email=email_norm).first():
        return jsonify({"error": "Email already registered."}), 409

    if Faculty.query.filter_by(emp_id=data["emp_id"].strip()).first():
        return jsonify({"error": "Employee ID already exists."}), 409

    # ── Phone validation ─────────────────────────────────────────────── #
    # If provided and non-empty, only digits, +, -, and spaces are allowed
    # and total length must be 7–15 characters (covers international formats).
    phone_raw = data.get("phone", "") or ""
    phone_val = phone_raw.strip()
    if phone_val:
        if not re.fullmatch(r"[0-9+\-\s]{7,15}", phone_val):
            return jsonify({"error": "Invalid phone number format."}), 400

    user = User(
        email=email_norm,
        role=RoleEnum.faculty,
        is_active=True,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    faculty = Faculty(
        user_id=user.id,
        emp_id=data["emp_id"].strip(),
        full_name=data["full_name"].strip(),
        dept=data["dept"].strip(),
        designation=data["designation"].strip(),
        phone=phone_val or None,
    )
    db.session.add(faculty)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email or employee ID already in use."}), 409
    return jsonify(faculty.to_dict()), 201


# ─────────────────────────── read / update / delete ─────────────────────── #

@faculty_bp.route("/<int:faculty_id>", methods=["GET"])
@login_required
def get_faculty(faculty_id: int):
    """GET /api/faculty/<id> — Admin or own faculty."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404
    if not _idor_check_faculty(faculty):
        return jsonify({"error": "Access forbidden."}), 403
    return jsonify(faculty.to_dict()), 200


@faculty_bp.route("/<int:faculty_id>", methods=["PUT"])
@login_required
@role_required("admin")
def update_faculty(faculty_id: int):
    """PUT /api/faculty/<id> — Admin only."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404

    data = request.get_json(silent=True) or {}
    for field in ("full_name", "dept", "designation", "phone"):
        if field in data:
            val = data[field]
            if isinstance(val, str):
                val = val.strip() or None
            setattr(faculty, field, val)

    db.session.commit()
    return jsonify(faculty.to_dict()), 200


@faculty_bp.route("/<int:faculty_id>", methods=["DELETE"])
@login_required
@role_required("admin")
def delete_faculty(faculty_id: int):
    """DELETE /api/faculty/<id> — Admin only."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404
    db.session.delete(faculty)
    db.session.commit()
    return jsonify({"message": "Faculty deleted."}), 200


# ─────────────────────────── sub-resource ───────────────────────────────── #

@faculty_bp.route("/<int:faculty_id>/courses", methods=["GET"])
@login_required
def get_faculty_courses(faculty_id: int):
    """GET /api/faculty/<id>/courses — Own faculty or admin."""
    faculty = _get_faculty_or_none(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404
    if not _idor_check_faculty(faculty):
        return jsonify({"error": "Access forbidden."}), 403
    return jsonify([c.to_dict() for c in faculty.courses]), 200
