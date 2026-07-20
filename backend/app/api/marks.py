"""
app/api/marks.py
Marks REST API.
POST — Faculty only: enter/update marks for a student-course-year triple.
GET  — Student (own), faculty, admin.
PUT  — Faculty who entered or admin.
"""
from flask import Blueprint, request
from flask_login import current_user, login_required

from app.api.responses import success_response, error_response, handle_api_exceptions

from app.extensions import db
from app.models.marks import Marks
from app.models.course import Course
from app.models.student import Student
from app.models.user import RoleEnum
from app.auth.decorators import role_required
from app.api.utils import verify_faculty_course_access

marks_bp = Blueprint("marks", __name__)

_MARK_FIELDS = ("internal_1", "internal_2", "semester_final", "practical")


# ─────────────────────────── enter marks ────────────────────────────────── #

@marks_bp.route("/", methods=["POST"])
@login_required
@role_required("faculty", "admin")
@handle_api_exceptions
def enter_marks():
    """POST /api/marks/ — Faculty only."""
    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "student_id": {"type": int, "required": True},
        "course_id": {"type": int, "required": True},
        "academic_year": {"type": str, "required": True, "regex": r"^\d{4}-\d{4}$"},
        "internal_1": {"type": int, "required": False, "min_val": 0, "max_val": 25},
        "internal_2": {"type": int, "required": False, "min_val": 0, "max_val": 25},
        "semester_final": {"type": int, "required": False, "min_val": 0, "max_val": 75},
        "practical": {"type": int, "required": False, "min_val": 0, "max_val": 50}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    student_id = cleaned_data["student_id"]
    course_id = cleaned_data["course_id"]
    academic_year = cleaned_data["academic_year"]

    student = db.session.get(Student, student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    access_err = verify_faculty_course_access(course)
    if access_err:
        return access_err

    # Verify student is enrolled in the course
    from app.models.course import Enrollment
    enrolled = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
    if not enrolled:
        return error_response("Student is not enrolled in this course.", status_code=400)

    faculty_id = current_user.faculty_profile.id if current_user.faculty_profile else None

    existing = Marks.query.filter_by(
        student_id=student_id,
        course_id=course_id,
        academic_year=academic_year,
    ).first()

    if existing:
        for field in _MARK_FIELDS:
            if field in cleaned_data:
                setattr(existing, field, cleaned_data[field])
        existing.entered_by = faculty_id
        db.session.commit()
        return success_response(existing.to_dict())

    mark = Marks(
        student_id=student_id,
        course_id=course_id,
        academic_year=academic_year,
        internal_1=cleaned_data.get("internal_1", 0),
        internal_2=cleaned_data.get("internal_2", 0),
        semester_final=cleaned_data.get("semester_final", 0),
        practical=cleaned_data.get("practical", 0),
        entered_by=faculty_id,
    )
    db.session.add(mark)
    db.session.commit()
    return success_response(mark.to_dict(), status_code=201)


# ─────────────────────────── get by student ─────────────────────────────── #

@marks_bp.route("/student/<int:student_id>", methods=["GET"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def get_marks_by_student(student_id: int):
    """
    [DEPRECATED] GET /api/marks/student/<id>
    Use GET /api/students/<id>/marks instead.
    
    - Admin: full access.
    - Faculty: only if the student is enrolled in one of their courses.
      Returns only marks for that faculty's own courses.
    - Student: own records only.
    """
    student = db.session.get(Student, student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    # Student: own record only
    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return error_response("Access forbidden.", status_code=403)
        records = Marks.query.filter_by(student_id=student_id).all()
        return success_response([r.to_dict() for r in records])

    # Admin: unrestricted
    if current_user.role == RoleEnum.admin:
        records = Marks.query.filter_by(student_id=student_id).all()
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

    # Return only marks for this faculty's own courses
    own_course_ids = [c.id for c in Course.query.filter_by(faculty_id=fp.id).all()]
    records = (
        Marks.query
        .filter(
            Marks.student_id == student_id,
            Marks.course_id.in_(own_course_ids),
        )
        .all()
    )
    return success_response([r.to_dict() for r in records])


# ─────────────────────────── update ─────────────────────────────────────── #

@marks_bp.route("/<int:mark_id>", methods=["PUT"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def update_marks(mark_id: int):
    """PUT /api/marks/<id> — Faculty who entered or admin."""
    mark = db.session.get(Marks, mark_id)
    if not mark:
        return error_response("Marks record not found.", status_code=404)

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or mark.entered_by != current_user.faculty_profile.id:
            return error_response("You did not enter these marks.", status_code=403)

    data = request.get_json(silent=True) or {}

    from app.api.validators import validate_payload
    schema = {
        "internal_1": {"type": int, "required": False, "min_val": 0, "max_val": 25},
        "internal_2": {"type": int, "required": False, "min_val": 0, "max_val": 25},
        "semester_final": {"type": int, "required": False, "min_val": 0, "max_val": 75},
        "practical": {"type": int, "required": False, "min_val": 0, "max_val": 50}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    for field in _MARK_FIELDS:
        if field in cleaned_data and cleaned_data[field] is not None:
            setattr(mark, field, cleaned_data[field])

    db.session.commit()
    return success_response(mark.to_dict())


# ─────────────────────────── get by course ──────────────────────────────── #

@marks_bp.route("/", methods=["GET"])
@login_required
@role_required("faculty", "admin")
@handle_api_exceptions
def get_marks():
    """GET /api/marks/ — Faculty of that course or admin."""
    course_id = request.args.get("course_id", type=int)
    if not course_id:
        return error_response("course_id query parameter is required.", status_code=400)
        
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    access_err = verify_faculty_course_access(course)
    if access_err:
        return access_err

    records = Marks.query.filter_by(course_id=course_id).all()
    return success_response([r.to_dict() for r in records])

# ─────────────────────────── get by id ────────────────────────────────────── #

@marks_bp.route("/<int:mark_id>", methods=["GET"])
@login_required
@role_required("faculty", "admin")
@handle_api_exceptions
def get_mark_by_id(mark_id: int):
    """GET /api/marks/<id>"""
    mark = db.session.get(Marks, mark_id)
    if not mark:
        return error_response("Marks record not found.", status_code=404)
        
    course = db.session.get(Course, mark.course_id)
    access_err = verify_faculty_course_access(course)
    if access_err:
        return access_err
        
    return success_response(mark.to_dict())

# ─────────────────────────── delete ─────────────────────────────────────── #

@marks_bp.route("/<int:mark_id>", methods=["DELETE"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def delete_marks(mark_id: int):
    """DELETE /api/marks/<id>"""
    mark = db.session.get(Marks, mark_id)
    if not mark:
        return error_response("Marks record not found.", status_code=404)

    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or mark.entered_by != current_user.faculty_profile.id:
            return error_response("You did not enter these marks.", status_code=403)

    db.session.delete(mark)
    db.session.commit()
    return success_response(message="Marks record deleted.")
