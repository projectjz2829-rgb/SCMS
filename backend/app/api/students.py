"""
app/api/students.py
Students REST API — full CRUD plus attendance and marks sub-resources.
IDOR protection: students can only read their own record; admin can read all.
"""
import re
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.student import Student
from app.models.user import RoleEnum, User
from app.models.attendance import Attendance
from app.models.marks import Marks
from app.auth.decorators import role_required

students_bp = Blueprint("students", __name__)


# ─────────────────────────── helpers ────────────────────────────────────── #

def _get_student_or_404(student_id: int) -> Student:
    student = db.session.get(Student, student_id)
    if not student:
        return None
    return student


def _idor_check_student(student: Student) -> bool:
    """Return True if current_user is allowed to access this student record."""
    if current_user.role in (RoleEnum.admin, RoleEnum.faculty):
        return True
    # Student role: can only access own record
    if current_user.role == RoleEnum.student:
        return (
            current_user.student_profile is not None
            and current_user.student_profile.id == student.id
        )
    return False


# ─────────────────────────── list / create ──────────────────────────────── #

@students_bp.route("/", methods=["GET"])
@login_required
@role_required("admin")
def list_students():
    """GET /api/students/ — Admin only."""
    students = Student.query.order_by(Student.roll_no).all()
    return jsonify([s.to_dict() for s in students]), 200


@students_bp.route("/", methods=["POST"])
@login_required
@role_required("admin")
def create_student():
    """POST /api/students/ — Admin only."""
    data = request.get_json(silent=True) or {}
    required = ("email", "password", "roll_no", "full_name", "dept", "year", "section")
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # ── Year validation ────────────────────────────────────────────────── #
    # year must be a plain integer in the range [1, 4] — reject anything
    # that cannot be parsed or falls outside the valid academic year span.
    try:
        year_val = int(data["year"])
    except (ValueError, TypeError):
        return jsonify({"error": "Year must be an integer."}), 400
    if not (1 <= year_val <= 4):
        return jsonify({"error": "Year must be 1 to 4."}), 400

    # ── Email normalisation ───────────────────────────────────────────── #
    email_raw = data.get("email")
    email_norm = str(email_raw).strip().lower() if email_raw is not None else ""
    if User.query.filter_by(email=email_norm).first():
        return jsonify({"error": "Email already registered."}), 409

    roll_no_raw = data.get("roll_no")
    roll_no_norm = str(roll_no_raw).strip() if roll_no_raw is not None else ""
    if Student.query.filter_by(roll_no=roll_no_norm).first():
        return jsonify({"error": "Roll number already exists."}), 409

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
        role=RoleEnum.student,
        is_active=True,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        roll_no=roll_no_norm,
        full_name=str(data.get("full_name", "")).strip(),
        dept=str(data.get("dept", "")).strip(),
        year=year_val,
        section=str(data.get("section", "")).strip(),
        phone=phone_val or None,
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email or roll number already in use."}), 409
    return jsonify(student.to_dict()), 201


# ─────────────────────────── read / update / delete ─────────────────────── #

@students_bp.route("/<int:student_id>", methods=["GET"])
@login_required
def get_student(student_id: int):
    """GET /api/students/<id> — Admin or own student."""
    student = _get_student_or_404(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    if not _idor_check_student(student):
        return jsonify({"error": "Access forbidden."}), 403
    return jsonify(student.to_dict()), 200


@students_bp.route("/<int:student_id>", methods=["PUT"])
@login_required
@role_required("admin")
def update_student(student_id: int):
    """PUT /api/students/<id> — Admin only."""
    student = _get_student_or_404(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    data = request.get_json(silent=True) or {}

    # Validate year if it is being updated
    if "year" in data:
        try:
            year_val = int(data["year"])
            if not (1 <= year_val <= 4):
                return jsonify({"error": "Year must be 1 to 4."}), 400
            student.year = year_val
        except (ValueError, TypeError):
            return jsonify({"error": "Year must be an integer."}), 400

    # Validate phone format if it is being updated
    if "phone" in data:
        phone_raw = data.get("phone", "") or ""
        phone_val = phone_raw.strip()
        if phone_val:
            if not re.fullmatch(r"[0-9+\-\s]{7,15}", phone_val):
                return jsonify({"error": "Invalid phone number format."}), 400
            student.phone = phone_val
        else:
            student.phone = None

    updatable = ("full_name", "dept", "section")
    for field in updatable:
        if field in data:
            value = data[field]
            if isinstance(value, str):
                value = value.strip() or None
            setattr(student, field, value)

    db.session.commit()
    return jsonify(student.to_dict()), 200


@students_bp.route("/<int:student_id>", methods=["DELETE"])
@login_required
@role_required("admin")
def delete_student(student_id: int):
    """DELETE /api/students/<id> — Admin only.

    Deletes the User account, which cascades to the Student profile
    (and all linked Enrollments, Attendance, and Marks via FK CASCADE).
    Deleting only the Student row was a security bug — it left the
    User account intact, allowing the deleted student to still log in.
    """
    student = _get_student_or_404(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    # Delete the parent User account; SQLAlchemy cascade removes the Student profile.
    user = student.user
    if user:
        db.session.delete(user)
    else:
        db.session.delete(student)  # fallback: orphaned profile with no User
    db.session.commit()
    return jsonify({"message": "Student deleted."}), 200


# ─────────────────────────── sub-resources ──────────────────────────────── #

@students_bp.route("/<int:student_id>/attendance", methods=["GET"])
@login_required
def get_student_attendance(student_id: int):
    """GET /api/students/<id>/attendance — Own student or admin/faculty."""
    student = _get_student_or_404(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    if not _idor_check_student(student):
        return jsonify({"error": "Access forbidden."}), 403

    records = (
        Attendance.query.filter_by(student_id=student_id)
        .order_by(Attendance.date.desc())
        .all()
    )
    return jsonify([r.to_dict() for r in records]), 200


@students_bp.route("/<int:student_id>/marks", methods=["GET"])
@login_required
def get_student_marks(student_id: int):
    """GET /api/students/<id>/marks — Own student or admin/faculty."""
    student = _get_student_or_404(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    if not _idor_check_student(student):
        return jsonify({"error": "Access forbidden."}), 403

    records = Marks.query.filter_by(student_id=student_id).all()
    return jsonify([r.to_dict() for r in records]), 200
