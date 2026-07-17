"""
app/api/attendance.py
Attendance REST API.
POST — Faculty only: mark attendance for one or many students in a course.
GET  — Faculty/Admin: fetch by course; Own student or faculty/admin: fetch by student.
PUT  — Faculty who marked the record or admin: update status.
"""
from datetime import date as date_type

from flask import Blueprint, request
from flask_login import current_user, login_required

from app.api.responses import success_response, error_response, handle_api_exceptions

from app.extensions import db
from app.models.attendance import Attendance, AttendanceStatusEnum
from app.models.course import Course
from app.models.student import Student

from app.models.user import RoleEnum
from app.auth.decorators import role_required
from app.api.utils import verify_faculty_course_access

attendance_bp = Blueprint("attendance", __name__)


# ─────────────────────────── mark attendance ────────────────────────────── #

@attendance_bp.route("/", methods=["POST"])
@login_required
@role_required("faculty", "admin")
@handle_api_exceptions
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
    
    from app.api.validators import validate_payload
    schema = {
        "course_id": {"type": int, "required": True},
        "date": {"type": str, "required": True, "regex": r"^\d{4}-\d{2}-\d{2}$"},
        "records": {
            "type": list, 
            "required": True, 
            "list_item_schema": {
                "student_id": {"type": int, "required": True},
                "status": {"type": str, "required": False, "allowed_values": ["present", "absent", "late"]}
            }
        }
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    course_id = cleaned_data["course_id"]
    date_str = cleaned_data["date"]
    records = cleaned_data["records"]

    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    # Faculty can only mark for their own courses
    access_err = verify_faculty_course_access(course)
    if access_err:
        return access_err

    try:
        attendance_date = date_type.fromisoformat(date_str)
    except ValueError:
        return error_response("Invalid date format. Use YYYY-MM-DD.", status_code=400)

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
    return success_response(message=f"{created} created, {updated} updated.")


# ─────────────────────────── get by course ──────────────────────────────── #

@attendance_bp.route("/<int:course_id>", methods=["GET"])
@login_required
@role_required("faculty", "admin")
@handle_api_exceptions
def get_attendance_by_course(course_id: int):
    """GET /api/attendance/<course_id> — Faculty/Admin."""
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    access_err = verify_faculty_course_access(course)
    if access_err:
        return access_err

    records = (
        Attendance.query.filter_by(course_id=course_id)
        .order_by(Attendance.date.desc())
        .all()
    )
    return success_response([r.to_dict() for r in records])


# ─────────────────────────── get by student ─────────────────────────────── #

@attendance_bp.route("/student/<int:student_id>", methods=["GET"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def get_attendance_by_student(student_id: int):
    """
    [DEPRECATED] GET /api/attendance/student/<id>
    Use GET /api/students/<id>/attendance instead.
    
    - Admin: full access.
    - Faculty: only if the student is enrolled in at least one of their courses.
      Records are filtered to only those courses the faculty owns.
    - Student: own records only.
    """
    student = db.session.get(Student, student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return error_response("Access forbidden.", status_code=403)
        records = (
            Attendance.query.filter_by(student_id=student_id)
            .order_by(Attendance.date.desc())
            .all()
        )
        return success_response([r.to_dict() for r in records])

    if current_user.role == RoleEnum.admin:
        records = (
            Attendance.query.filter_by(student_id=student_id)
            .order_by(Attendance.date.desc())
            .all()
        )
        return success_response([r.to_dict() for r in records])

    # Faculty: must teach this student in at least one of their courses
    fp = current_user.faculty_profile
    if not fp:
        return error_response("Faculty profile not found.", status_code=403)

    from app.models.course import Enrollment
    teaches = (
        db.session.query(Enrollment)
        .join(Enrollment.course)
        .filter(
            Enrollment.student_id == student_id,
            Enrollment.course.has(faculty_id=fp.id),
        )
        .first()
    )
    if not teaches:
        return error_response("Access forbidden.", status_code=403)

    # Return only attendance for this faculty's own courses
    own_course_ids = [c.id for c in Course.query.filter_by(faculty_id=fp.id).all()]
    records = (
        Attendance.query
        .filter(
            Attendance.student_id == student_id,
            Attendance.course_id.in_(own_course_ids),
        )
        .order_by(Attendance.date.desc())
        .all()
    )
    return success_response([r.to_dict() for r in records])


# ─────────────────────────── update ─────────────────────────────────────── #

@attendance_bp.route("/<int:att_id>/update", methods=["PUT"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def update_attendance(att_id: int):
    """PUT /api/attendance/<id>/update — Faculty who marked or admin."""
    record = db.session.get(Attendance, att_id)
    if not record:
        return error_response("Attendance record not found.", status_code=404)

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or record.marked_by != current_user.faculty_profile.id:
            return error_response("You did not mark this record.", status_code=403)

    data = request.get_json(silent=True) or {}
    status_str = data.get("status")
    if not status_str:
        return error_response("status is required.", status_code=400)

    try:
        record.status = AttendanceStatusEnum(str(status_str).strip().lower())
    except ValueError:
        try:
            record.status = AttendanceStatusEnum[str(status_str).strip().lower()]
        except KeyError:
            return error_response("Invalid status. Use present, absent, or late.", status_code=400)

    db.session.commit()
    return success_response(record.to_dict())
