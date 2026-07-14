"""
app/api/courses.py
Courses REST API — CRUD plus student enrollment endpoint.
"""
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

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
def list_courses():
    """GET /api/courses/ — All authenticated users."""
    courses = Course.query.order_by(Course.code).all()
    return jsonify([c.to_dict() for c in courses]), 200


@courses_bp.route("/", methods=["POST"])
@login_required
@role_required("admin")
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
    required = ("name", "code", "dept", "semester")
    # Use an existence check rather than truthiness so that numeric values
    # such as 0 are not incorrectly reported as missing — they will be
    # caught by the range validator below.
    missing = [
        f for f in required
        if f not in data or (isinstance(data.get(f), str) and not data.get(f).strip())
    ]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # ── Semester range validation ──────────────────────────────────────── #
    # Semester must be an integer strictly within [1, 8] (8 semesters per
    # 4-year degree programme). Reject early to avoid persisting bad data.
    try:
        semester_val = int(data["semester"])
    except (ValueError, TypeError):
        return jsonify({"error": "Semester must be between 1 and 8."}), 400
    if not (1 <= semester_val <= 8):
        return jsonify({"error": "Semester must be between 1 and 8."}), 400

    if Course.query.filter_by(code=data["code"].strip().upper()).first():
        return jsonify({"error": "Course code already exists."}), 409

    name_val = str(data["name"]).strip()
    code_val = str(data["code"]).strip().upper()
    course_dept = str(data["dept"]).strip()
    faculty_id = data.get("faculty_id")
    if faculty_id:
        faculty = db.session.get(Faculty, faculty_id)
        if not faculty:
            return jsonify({"error": "Faculty not found."}), 404

        # ── Faculty department match validation ────────────────────────── #
        # A faculty member must belong to the same department as the course
        # they are assigned to. Cross-department assignments are rejected to
        # keep academic data consistent and avoid erroneous roster filtering.
        if faculty.dept.strip().lower() != course_dept.strip().lower():
            return jsonify({"error": "Faculty department does not match course department."}), 400

    course = Course(
        name=name_val,
        code=code_val,
        dept=course_dept,
        semester=semester_val,
        faculty_id=faculty_id,
    )
    db.session.add(course)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Course code already exists."}), 409
    return jsonify(course.to_dict()), 201


# ─────────────────────────── update / delete ────────────────────────────── #

@courses_bp.route("/<int:course_id>", methods=["PUT"])
@login_required
@role_required("admin")
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
        return jsonify({"error": "Course not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name_val = data["name"]
        course.name = name_val.strip() if isinstance(name_val, str) else str(name_val).strip()

    # Determine the target department *before* persisting any changes so
    # faculty-dept validation can compare against the final dept value.
    if "dept" in data:
        dept_val = data["dept"]
        target_dept = dept_val.strip() if isinstance(dept_val, str) else str(dept_val).strip()
        course.dept = target_dept
    else:
        target_dept = course.dept

    # ── Semester range validation ──────────────────────────────────────── #
    if "semester" in data:
        try:
            semester_val = int(data["semester"])
        except (ValueError, TypeError):
            return jsonify({"error": "Semester must be between 1 and 8."}), 400
        if not (1 <= semester_val <= 8):
            return jsonify({"error": "Semester must be between 1 and 8."}), 400
        course.semester = semester_val

    if "faculty_id" in data:
        fid = data["faculty_id"]
        if fid:
            faculty = db.session.get(Faculty, fid)
            if not faculty:
                return jsonify({"error": "Faculty not found."}), 404

            # ── Faculty department match validation (on update) ────────── #
            # Validate against the *target* department so that a simultaneous
            # dept + faculty_id update is also caught correctly.
            if faculty.dept.strip().lower() != target_dept.strip().lower():
                return jsonify({"error": "Faculty department does not match course department."}), 400

        course.faculty_id = fid
    elif "dept" in data and course.faculty_id:
        # Department changed but faculty_id was not explicitly updated.
        # Re-validate the *existing* faculty against the new target dept.
        existing_faculty = db.session.get(Faculty, course.faculty_id)
        if existing_faculty and existing_faculty.dept.strip().lower() != target_dept.strip().lower():
            return jsonify({"error": "Faculty department does not match course department."}), 400

    db.session.commit()
    return jsonify(course.to_dict()), 200


@courses_bp.route("/<int:course_id>", methods=["DELETE"])
@login_required
@role_required("admin")
def delete_course(course_id: int):
    """DELETE /api/courses/<id> — Admin only."""
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted."}), 200


# ─────────────────────────── enroll student ─────────────────────────────── #

@courses_bp.route("/<int:course_id>/enroll", methods=["POST"])
@login_required
@role_required("admin")
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
        return jsonify({"error": "Course not found."}), 404

    data = request.get_json(silent=True) or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required."}), 400

    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    # ── Department match validation ────────────────────────────────────── #
    # Students must belong to the same department as the course so that
    # faculty attendance grids and marks ledgers remain cohesive.
    if student.dept.strip().lower() != course.dept.strip().lower():
        return jsonify({"error": "Student department does not match course department."}), 400

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
        return jsonify({"error": "Student is not eligible for this course's semester."}), 400

    existing = Enrollment.query.filter_by(
        student_id=student_id, course_id=course_id
    ).first()
    if existing:
        return jsonify({"error": "Student already enrolled in this course."}), 409

    enrollment = Enrollment(student_id=student_id, course_id=course_id)
    db.session.add(enrollment)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Student already enrolled in this course."}), 409
    return jsonify({"message": "Student enrolled successfully.", "enrollment": enrollment.to_dict()}), 201


# ─────────────────────────── unenroll student ───────────────────────────── #

@courses_bp.route("/<int:course_id>/enroll/<int:student_id>", methods=["DELETE"])
@login_required
@role_required("admin")
def unenroll_student(course_id: int, student_id: int):
    """DELETE /api/courses/<id>/enroll/<student_id> — Admin only."""
    enrollment = Enrollment.query.filter_by(
        student_id=student_id, course_id=course_id
    ).first()
    if not enrollment:
        return jsonify({"error": "Student is not enrolled in this course."}), 404

    # Clean up associated attendance and marks records for this course
    # to maintain database consistency and prevent orphaned data.
    from app.models.attendance import Attendance
    from app.models.marks import Marks
    Attendance.query.filter_by(student_id=student_id, course_id=course_id).delete()
    Marks.query.filter_by(student_id=student_id, course_id=course_id).delete()

    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Student unenrolled successfully."}), 200


# ─────────────────────────── course roster ──────────────────────────────── #

@courses_bp.route("/<int:course_id>/students", methods=["GET"])
@login_required
def get_course_students(course_id: int):
    """
    GET /api/courses/<id>/students — Admin or the faculty assigned to this
    course. Returns the list of students actually enrolled in the course
    (via the Enrollment table), which is what the attendance and marks
    entry screens need — NOT the full student body.
    """
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"error": "Course not found."}), 404

    if not _idor_check_course_owner(course):
        return jsonify({"error": "Access forbidden."}), 403

    students = (
        Student.query.join(Enrollment, Enrollment.student_id == Student.id)
        .filter(Enrollment.course_id == course_id)
        .order_by(Student.roll_no)
        .all()
    )
    return jsonify([s.to_dict() for s in students]), 200
