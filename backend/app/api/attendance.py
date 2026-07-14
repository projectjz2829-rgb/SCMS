"""
app/api/attendance.py
Attendance REST API.
POST — Faculty only: mark attendance for one or many students in a course.
GET  — Faculty/Admin: fetch by course; Own student or faculty/admin: fetch by student.
PUT  — Faculty who marked the record or admin: update status.
"""
from datetime import date as date_type

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models.attendance import Attendance, AttendanceStatusEnum
from app.models.course import Course
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.user import RoleEnum
from app.auth.decorators import role_required

attendance_bp = Blueprint("attendance", __name__)


# ─────────────────────────── mark attendance ────────────────────────────── #

@attendance_bp.route("/", methods=["POST"])
@login_required
@role_required("faculty", "admin")
def mark_attendance():
    """
    POST /api/attendance/
    Faculty marks attendance for a batch of students.
    Expected payload:
    {
        "course_id": 1,
        "date": "2024-08-15",
        "records": [
            {"student_id": 3, "status": "present"},
            {"student_id": 4, "status": "absent"}
        ]
    }
    """
    data = request.get_json(silent=True) or {}
    course_id = data.get("course_id")
    date_str = data.get("date")
    records = data.get("records", [])

    if not course_id or not date_str or not records:
        return jsonify({"error": "course_id, date, and records are required."}), 400

    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    # Faculty can only mark for their own courses
    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or course.faculty_id != current_user.faculty_profile.id:
            return jsonify({"error": "You are not assigned to this course."}), 403

    try:
        attendance_date = date_type.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    faculty_id = (
        current_user.faculty_profile.id
        if current_user.faculty_profile
        else None
    )

    created, updated = 0, 0
    for rec in records:
        student_id = rec.get("student_id")
        status_str = rec.get("status", "present")

        if not student_id:
            continue
        student = db.session.get(Student, student_id)
        if not student:
            continue

        from app.models.course import Enrollment
        enrolled = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
        if not enrolled:
            continue

        status = AttendanceStatusEnum.present
        if status_str:
            try:
                status = AttendanceStatusEnum(str(status_str).strip().lower())
            except ValueError:
                try:
                    status = AttendanceStatusEnum[str(status_str).strip().lower()]
                except KeyError:
                    pass

        existing = Attendance.query.filter_by(
            student_id=student_id,
            course_id=course_id,
            date=attendance_date,
        ).first()

        if existing:
            existing.status = status
            existing.marked_by = faculty_id
            updated += 1
        else:
            att = Attendance(
                student_id=student_id,
                course_id=course_id,
                date=attendance_date,
                status=status,
                marked_by=faculty_id,
            )
            db.session.add(att)
            created += 1

    db.session.commit()
    return jsonify({"message": f"{created} created, {updated} updated."}), 200


# ─────────────────────────── get by course ──────────────────────────────── #

@attendance_bp.route("/<int:course_id>", methods=["GET"])
@login_required
@role_required("faculty", "admin")
def get_attendance_by_course(course_id: int):
    """GET /api/attendance/<course_id> — Faculty/Admin."""
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or course.faculty_id != current_user.faculty_profile.id:
            return jsonify({"error": "Access forbidden."}), 403

    records = (
        Attendance.query.filter_by(course_id=course_id)
        .order_by(Attendance.date.desc())
        .all()
    )
    return jsonify([r.to_dict() for r in records]), 200


# ─────────────────────────── get by student ─────────────────────────────── #

@attendance_bp.route("/student/<int:student_id>", methods=["GET"])
@login_required
def get_attendance_by_student(student_id: int):
    """GET /api/attendance/student/<id> — Own student or faculty/admin."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return jsonify({"error": "Access forbidden."}), 403

    records = (
        Attendance.query.filter_by(student_id=student_id)
        .order_by(Attendance.date.desc())
        .all()
    )
    return jsonify([r.to_dict() for r in records]), 200


# ─────────────────────────── update ─────────────────────────────────────── #

@attendance_bp.route("/<int:att_id>/update", methods=["PUT"])
@login_required
def update_attendance(att_id: int):
    """PUT /api/attendance/<id>/update — Faculty who marked or admin."""
    record = db.session.get(Attendance, att_id)
    if not record:
        return jsonify({"error": "Attendance record not found."}), 404

    if current_user.role == RoleEnum.student:
        return jsonify({"error": "Access forbidden."}), 403

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or record.marked_by != current_user.faculty_profile.id:
            return jsonify({"error": "You did not mark this record."}), 403

    data = request.get_json(silent=True) or {}
    status_str = data.get("status")
    if not status_str:
        return jsonify({"error": "status is required."}), 400

    try:
        record.status = AttendanceStatusEnum(str(status_str).strip().lower())
    except ValueError:
        try:
            record.status = AttendanceStatusEnum[str(status_str).strip().lower()]
        except KeyError:
            return jsonify({"error": "Invalid status. Use present, absent, or late."}), 400

    db.session.commit()
    return jsonify(record.to_dict()), 200
