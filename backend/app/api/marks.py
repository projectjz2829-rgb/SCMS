"""
app/api/marks.py
Marks REST API.
POST — Faculty only: enter/update marks for a student-course-year triple.
GET  — Student (own), faculty, admin.
PUT  — Faculty who entered or admin.
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models.marks import Marks
from app.models.course import Course
from app.models.student import Student
from app.models.user import RoleEnum
from app.auth.decorators import role_required

marks_bp = Blueprint("marks", __name__)

_MARK_FIELDS = ("internal_1", "internal_2", "semester_final", "practical")


# ─────────────────────────── enter marks ────────────────────────────────── #

@marks_bp.route("/", methods=["POST"])
@login_required
@role_required("faculty", "admin")
def enter_marks():
    """POST /api/marks/ — Faculty only."""
    data = request.get_json(silent=True) or {}
    required = ("student_id", "course_id", "academic_year")
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    student_id = data["student_id"]
    course_id = data["course_id"]
    academic_year_raw = data.get("academic_year")
    if not isinstance(academic_year_raw, str):
        return jsonify({"error": "academic_year must be a string."}), 400

    academic_year = academic_year_raw.strip()
    import re
    if not re.match(r"^\d{4}-\d{4}$", academic_year):
        return jsonify({"error": "academic_year must match YYYY-YYYY format (e.g., 2024-2025)."}), 400

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or course.faculty_id != current_user.faculty_profile.id:
            return jsonify({"error": "You are not assigned to this course."}), 403

    # Verify student is enrolled in the course
    from app.models.course import Enrollment
    enrolled = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
    if not enrolled:
        return jsonify({"error": "Student is not enrolled in this course."}), 400

    faculty_id = current_user.faculty_profile.id if current_user.faculty_profile else None

    # ── Marks range validation ───────────────────────────────────────────── #
    # Enforce published assessment limits so no record can exceed max marks.
    _LIMITS = {"internal_1": 25, "internal_2": 25, "semester_final": 75, "practical": 50}
    for field, max_val in _LIMITS.items():
        if field in data:
            try:
                v = int(data[field])
            except (ValueError, TypeError):
                return jsonify({"error": f"{field} must be an integer."}), 400
            if not (0 <= v <= max_val):
                return jsonify({"error": f"{field} must be between 0 and {max_val}."}), 400

    existing = Marks.query.filter_by(
        student_id=student_id,
        course_id=course_id,
        academic_year=academic_year,
    ).first()

    if existing:
        for field in _MARK_FIELDS:
            if field in data:
                setattr(existing, field, int(data[field]))
        existing.entered_by = faculty_id
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    mark = Marks(
        student_id=student_id,
        course_id=course_id,
        academic_year=academic_year,
        internal_1=int(data.get("internal_1", 0)),
        internal_2=int(data.get("internal_2", 0)),
        semester_final=int(data.get("semester_final", 0)),
        practical=int(data.get("practical", 0)),
        entered_by=faculty_id,
    )
    db.session.add(mark)
    db.session.commit()
    return jsonify(mark.to_dict()), 201


# ─────────────────────────── get by student ─────────────────────────────── #

@marks_bp.route("/student/<int:student_id>", methods=["GET"])
@login_required
def get_marks_by_student(student_id: int):
    """GET /api/marks/student/<id> — Own student or faculty/admin."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return jsonify({"error": "Access forbidden."}), 403

    records = Marks.query.filter_by(student_id=student_id).all()
    return jsonify([r.to_dict() for r in records]), 200


# ─────────────────────────── update ─────────────────────────────────────── #

@marks_bp.route("/<int:mark_id>", methods=["PUT"])
@login_required
def update_marks(mark_id: int):
    """PUT /api/marks/<id> — Faculty who entered or admin."""
    mark = db.session.get(Marks, mark_id)
    if not mark:
        return jsonify({"error": "Marks record not found."}), 404

    if current_user.role == RoleEnum.student:
        return jsonify({"error": "Access forbidden."}), 403

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or mark.entered_by != current_user.faculty_profile.id:
            return jsonify({"error": "You did not enter these marks."}), 403

    data = request.get_json(silent=True) or {}

    # ── Marks range validation ───────────────────────────────────────────── #
    _LIMITS = {"internal_1": 25, "internal_2": 25, "semester_final": 75, "practical": 50}
    for field, max_val in _LIMITS.items():
        if field in data:
            try:
                v = int(data[field])
            except (ValueError, TypeError):
                return jsonify({"error": f"{field} must be an integer."}), 400
            if not (0 <= v <= max_val):
                return jsonify({"error": f"{field} must be between 0 and {max_val}."}), 400

    for field in _MARK_FIELDS:
        if field in data:
            setattr(mark, field, int(data[field]))

    db.session.commit()
    return jsonify(mark.to_dict()), 200


# ─────────────────────────── get by course ──────────────────────────────── #

@marks_bp.route("/course/<int:course_id>", methods=["GET"])
@login_required
@role_required("faculty", "admin")
def get_marks_by_course(course_id: int):
    """GET /api/marks/course/<id> — Faculty of that course or admin."""
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or course.faculty_id != current_user.faculty_profile.id:
            return jsonify({"error": "Access forbidden."}), 403

    records = Marks.query.filter_by(course_id=course_id).all()
    return jsonify([r.to_dict() for r in records]), 200
