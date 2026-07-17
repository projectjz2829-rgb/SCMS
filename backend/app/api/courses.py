"""
app/api/courses.py
Courses REST API — CRUD plus student enrollment endpoint.
"""
from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app.api.responses import success_response, error_response, handle_api_exceptions

from app.extensions import db
from app.models.course import Course, Enrollment
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.user import RoleEnum
from app.auth.decorators import role_required

courses_bp = Blueprint("courses", __name__)


# ─────────────────────────── helpers ────────────────────────────────────── #

def _idor_check_course_owner(course: Course) -> bool:
    """Admin can access any course; faculty only their own assigned course."""
    if current_user.role == RoleEnum.admin:
        return True
    if current_user.role == RoleEnum.faculty:
        return (
            current_user.faculty_profile is not None
            and course.faculty_id == current_user.faculty_profile.id
        )
    return False


# ─────────────────────────── list / create ──────────────────────────────── #

@courses_bp.route("/", methods=["GET"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def list_courses():
    """GET /api/courses/ — All authenticated users."""
    from sqlalchemy import func
    query = (
        db.session.query(
            Course,
            Faculty.full_name,
            func.count(Enrollment.student_id)
        )
        .outerjoin(Faculty, Course.faculty_id == Faculty.id)
        .outerjoin(Enrollment, Course.id == Enrollment.course_id)
        .group_by(Course.id, Faculty.id)
        .order_by(Course.code)
    )
    
    results = query.all()
    out = [
        course.to_dict(faculty_name=fname, enrolled_count=ecount)
        for course, fname, ecount in results
    ]
    return success_response(out)


@courses_bp.route("/", methods=["POST"])
@login_required
@role_required("admin")
@handle_api_exceptions
def create_course():
    """
    POST /api/courses/ — Admin only.

    Validation rules (enforced for admin actions only):
      - ``semester`` must be an integer between 1 and 8 inclusive.
      - If ``faculty_id`` is supplied, the Faculty record's ``dept`` must
        exactly match the ``dept`` of the course being created. Assigning a
        faculty member from a different department is rejected with HTTP 400
        so that course-faculty relationships remain department-consistent.
    """
    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "name": {"type": str, "required": True, "max_length": 100},
        "code": {"type": str, "required": True, "max_length": 20},
        "dept": {"type": str, "required": True, "max_length": 50},
        "semester": {"type": int, "required": True, "min_val": 1, "max_val": 8},
        "faculty_id": {"type": int, "required": False}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    if Course.query.filter_by(code=cleaned_data["code"].upper()).first():
        return error_response("Course code already exists.", status_code=409)

    name_val = cleaned_data["name"]
    code_val = cleaned_data["code"].upper()
    course_dept = cleaned_data["dept"]
    faculty_id = cleaned_data.get("faculty_id")
    if faculty_id:
        faculty = db.session.get(Faculty, faculty_id)
        if not faculty:
            return error_response("Faculty not found.", status_code=404)

        # ── Faculty department match validation ────────────────────────── #
        if faculty.dept.strip().lower() != course_dept.lower():
            return error_response("Faculty department does not match course department.", status_code=400)

    course = Course(
        name=name_val,
        code=code_val,
        dept=course_dept,
        semester=cleaned_data["semester"],
        faculty_id=faculty_id,
    )
    db.session.add(course)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("Course code already exists.", status_code=409)
    return success_response(course.to_dict(), status_code=201)


# ─────────────────────────── update / delete ────────────────────────────── #

@courses_bp.route("/<int:course_id>", methods=["PUT"])
@login_required
@role_required("admin")
@handle_api_exceptions
def update_course(course_id: int):
    """
    PUT /api/courses/<id> — Admin only.

    Validation rules (enforced for admin actions only):
      - If ``semester`` is updated, it must remain an integer between 1 and 8.
      - The target department is the updated ``dept`` value when supplied,
        otherwise the course's current department.
      - If ``faculty_id`` is updated, the faculty member's ``dept`` must match
        the **target** department (after any dept change in this request).
        If the department changes and the existing faculty no longer matches,
        the request is rejected with HTTP 400 to prevent data inconsistency.
    """
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "name": {"type": str, "required": False, "max_length": 100},
        "dept": {"type": str, "required": False, "max_length": 50},
        "semester": {"type": int, "required": False, "min_val": 1, "max_val": 8},
        "faculty_id": {"type": int, "required": False}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp

    # Determine the target department *before* persisting any changes so
    # faculty-dept validation can compare against the final dept value.
    if "dept" in cleaned_data:
        target_dept = cleaned_data["dept"]
    else:
        target_dept = course.dept

    if "faculty_id" in cleaned_data:
        fid = cleaned_data["faculty_id"]
        if fid:
            faculty = db.session.get(Faculty, fid)
            if not faculty:
                return error_response("Faculty not found.", status_code=404)

            # ── Faculty department match validation (on update) ────────── #
            # Validate against the *target* department so that a simultaneous
            # dept + faculty_id update is also caught correctly.
            if faculty.dept.strip().lower() != target_dept.lower():
                return error_response("Faculty department does not match course department.", status_code=400)

    elif "dept" in data and course.faculty_id:
        # Department changed but faculty_id was not explicitly updated.
        # Re-validate the *existing* faculty against the new target dept.
        existing_faculty = db.session.get(Faculty, course.faculty_id)
        if existing_faculty and existing_faculty.dept.strip().lower() != target_dept.strip().lower():
            return error_response("Faculty department does not match course department.", status_code=400)

    # All validations passed, now mutate the course object
    if "name" in cleaned_data:
        course.name = cleaned_data["name"]

    if "dept" in cleaned_data:
        course.dept = target_dept

    if "semester" in cleaned_data and cleaned_data["semester"] is not None:
        course.semester = cleaned_data["semester"]

    if "faculty_id" in cleaned_data:
        course.faculty_id = cleaned_data["faculty_id"]

    db.session.commit()
    return success_response(course.to_dict())


@courses_bp.route("/<int:course_id>", methods=["DELETE"])
@login_required
@role_required("admin")
@handle_api_exceptions
def delete_course(course_id: int):
    """DELETE /api/courses/<id> — Admin only."""
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)
    db.session.delete(course)
    
    db.session.commit()
    return success_response(message="Course deleted.")


# ─────────────────────────── enroll student ─────────────────────────────── #

@courses_bp.route("/<int:course_id>/enroll", methods=["POST"])
@login_required
@role_required("admin")
@handle_api_exceptions
def enroll_student(course_id: int):
    """
    POST /api/courses/<id>/enroll — Admin only.

    Validation rules (enforced for admin actions only):
      - The student's ``dept`` must exactly match the course's ``dept``.
        Cross-department enrollment is rejected with HTTP 400 to prevent
        students from appearing on incorrect attendance and marks rosters.
      - Semester eligibility: A student in ``year`` Y is eligible for
        semesters ``(Y * 2) - 1`` and ``Y * 2`` (the two semesters that
        span that academic year). For example a Year-2 student is eligible
        for Semesters 3 and 4 only. Enrollment into any other semester is
        rejected with HTTP 400.
    """
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    data = request.get_json(silent=True) or {}
    student_identifier = data.get("student_id")
    if not student_identifier:
        return error_response("Student Roll Number is required.", status_code=400)

    # Allow lookup by roll_no first (since admin UI now sends roll_no)
    student = Student.query.filter_by(roll_no=str(student_identifier)).first()
    if not student:
        # Fallback to internal ID for backward API compatibility
        try:
            student = db.session.get(Student, int(student_identifier))
        except (ValueError, TypeError):
            pass

    if not student:
        return error_response("Student not found.", status_code=404)
        
    student_id = student.id
    # ── Department match validation ────────────────────────────────────── #
    # Students must belong to the same department as the course so that
    # faculty attendance grids and marks ledgers remain cohesive.
    if student.dept.strip().lower() != course.dept.strip().lower():
        return error_response("Student department does not match course department.", status_code=400)

    # ── Semester eligibility validation ───────────────────────────────── #
    # Each academic year spans exactly two consecutive semesters:
    #   Year 1 → Semesters 1, 2
    #   Year 2 → Semesters 3, 4
    #   Year 3 → Semesters 5, 6
    #   Year 4 → Semesters 7, 8
    # A student is eligible for the odd semester that opens their year AND
    # the even semester that closes it.  This prevents, for example, a
    # first-year student from enrolling in a final-year elective.
    eligible_semesters = {(student.year * 2) - 1, student.year * 2}
    if course.semester not in eligible_semesters:
        return error_response("Student is not eligible for this course's semester.", status_code=400)

    existing = Enrollment.query.filter_by(
        student_id=student_id, course_id=course_id
    ).first()
    if existing:
        return error_response("Student already enrolled in this course.", status_code=409)

    enrollment = Enrollment(student_id=student_id, course_id=course_id)
    db.session.add(enrollment)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("Student already enrolled in this course.", status_code=409)
    return success_response({"enrollment": enrollment.to_dict()}, message="Student enrolled successfully.", status_code=201)


# ─────────────────────────── unenroll student ───────────────────────────── #

@courses_bp.route("/<int:course_id>/enroll/<int:student_id>", methods=["DELETE"])
@login_required
@role_required("admin")
@handle_api_exceptions
def unenroll_student(course_id: int, student_id: int):
    """DELETE /api/courses/<id>/enroll/<student_id> — Admin only."""
    enrollment = Enrollment.query.filter_by(
        student_id=student_id, course_id=course_id
    ).first()
    if not enrollment:
        return error_response("Student is not enrolled in this course.", status_code=404)

    # Clean up associated attendance and marks records for this course
    # to maintain database consistency and prevent orphaned data.
    from app.models.attendance import Attendance
    from app.models.marks import Marks
    Attendance.query.filter_by(student_id=student_id, course_id=course_id).delete()
    Marks.query.filter_by(student_id=student_id, course_id=course_id).delete()

    db.session.delete(enrollment)
    db.session.commit()
    return success_response(message="Student unenrolled successfully.")


# ─────────────────────────── course roster ──────────────────────────────── #

@courses_bp.route("/<int:course_id>/students", methods=["GET"])
@login_required
@role_required("admin", "faculty")
@handle_api_exceptions
def get_course_students(course_id: int):
    """
    GET /api/courses/<id>/students — Admin or the faculty assigned to this
    course. Returns the list of students actually enrolled in the course
    (via the Enrollment table), which is what the attendance and marks
    entry screens need — NOT the full student body.
    """
    course = db.session.get(Course, course_id)
    if not course:
        return error_response("Course not found.", status_code=404)

    if not _idor_check_course_owner(course):
        return error_response("Access forbidden.", status_code=403)

    students = (
        Student.query.join(Enrollment, Enrollment.student_id == Student.id)
        .filter(Enrollment.course_id == course_id)
        .order_by(Student.roll_no)
        .all()
    )
    return success_response([s.to_dict() for s in students])
