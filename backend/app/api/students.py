"""
app/api/students.py
Students REST API — full CRUD plus attendance and marks sub-resources.
IDOR protection:
  - Students can only read their own record.
  - Admin can read all records.
  - Faculty can only read records for students enrolled in their own courses.
"""
import re
from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError

from app.api.responses import success_response, error_response, handle_api_exceptions
from app.extensions import db
from app.models.student import Student
from app.models.user import RoleEnum, User
from app.models.attendance import Attendance
from app.models.marks import Marks
from app.models.course import Enrollment
from app.models.activity import ActivityLog
from app.auth.decorators import role_required

students_bp = Blueprint("students", __name__)


# ─────────────────────────── helpers ────────────────────────────────────── #

def _get_student_or_404(student_id: int) -> Student:
    student = db.session.get(Student, student_id)
    if not student:
        return None
    return student


def _idor_check_student(student: Student) -> bool:
    """Return True if current_user is allowed to access this student record.

    Rules:
      - Admin: unrestricted access.
      - Faculty: only students enrolled in one of the faculty's own courses.
      - Student: only their own record.
    """
    if current_user.role == RoleEnum.admin:
        return True
    if current_user.role == RoleEnum.faculty:
        fp = current_user.faculty_profile
        if not fp:
            return False
        # Check that the student is enrolled in at least one of this faculty's courses
        return (
            db.session.query(Enrollment)
            .join(Enrollment.course)
            .filter(
                Enrollment.student_id == student.id,
                Enrollment.course.has(faculty_id=fp.id),
            )
            .first()
            is not None
        )
    if current_user.role == RoleEnum.student:
        return (
            current_user.student_profile is not None
            and current_user.student_profile.id == student.id
        )
    return False


def _faculty_teaches_student(student_id: int) -> bool:
    """Return True if the current faculty member teaches this student
    (i.e. the student is enrolled in at least one course owned by the faculty).
    Always True for admin; always False for student role.
    """
    if current_user.role == RoleEnum.admin:
        return True
    if current_user.role != RoleEnum.faculty:
        return False
    fp = current_user.faculty_profile
    if not fp:
        return False
    return (
        db.session.query(Enrollment)
        .join(Enrollment.course)
        .filter(
            Enrollment.student_id == student_id,
            Enrollment.course.has(faculty_id=fp.id),
        )
        .first()
        is not None
    )


# ─────────────────────────── list / create ──────────────────────────────── #

@students_bp.route("/", methods=["GET", "POST"])
@login_required
@role_required("admin")
@handle_api_exceptions
def manage_students():
    """GET /api/students/ (list) or POST /api/students/ (create) — Admin only."""
    if request.method == "GET":
        query = db.session.query(Student, User.email).join(User, User.id == Student.user_id)
        
        search = request.args.get("search", "").strip()
        if search:
            query = query.filter(db.or_(
                Student.full_name.ilike(f"%{search}%"),
                Student.roll_no.ilike(f"%{search}%")
            ))
            
        dept = request.args.get("dept", "").strip()
        if dept:
            query = query.filter(Student.dept == dept)
            
        year = request.args.get("year", "").strip()
        if year and year.isdigit():
            query = query.filter(Student.year == int(year))
            
        section = request.args.get("section", "").strip()
        if section:
            query = query.filter(Student.section == section)
            
        sort_by = request.args.get("sort", "roll_no").strip()
        valid_sorts = {
            "roll_no": Student.roll_no,
            "full_name": Student.full_name,
            "dept": Student.dept,
            "year": Student.year,
            "section": Student.section
        }
        if sort_by in valid_sorts:
            query = query.order_by(valid_sorts[sort_by])
        else:
            query = query.order_by(Student.roll_no)
            
        page_str = request.args.get("page")
        limit_str = request.args.get("limit")
        
        if page_str or limit_str:
            try:
                page = int(page_str) if page_str else 1
                limit = int(limit_str) if limit_str else 10
                if page < 1: page = 1
                if limit < 1: limit = 10
                if limit > 100: limit = 100
            except ValueError:
                return error_response("Invalid page or limit parameter.", status_code=400)
            
            total = query.count()
            pages = (total + limit - 1) // limit
            results = query.offset((page - 1) * limit).limit(limit).all()
            
            meta = {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": pages
            }
            return success_response([s.to_dict(email=e) for s, e in results], meta=meta)
        else:
            results = query.all()
            return success_response([s.to_dict(email=e) for s, e in results])

    # POST
    data = request.get_json(silent=True) or {}
    
    from app.api.validators import validate_payload
    schema = {
        "email": {"type": str, "required": True, "max_length": 120, "regex": r"^[^@]+@[^@]+\.[^@]+$"},
        "password": {"type": str, "required": True, "min_length": 6},
        "roll_no": {"type": str, "required": True, "max_length": 20},
        "full_name": {"type": str, "required": True, "max_length": 100},
        "dept": {"type": str, "required": True, "max_length": 100},
        "year": {"type": int, "required": True, "min_val": 1, "max_val": 4},
        "section": {"type": str, "required": True, "max_length": 10},
        "phone": {"type": str, "required": False, "max_length": 20}
    }
    cleaned_data, err_resp = validate_payload(data, schema)
    if err_resp:
        return err_resp
        
    year_val = cleaned_data["year"]

    email_norm = cleaned_data["email"].lower()
    if User.query.filter_by(email=email_norm).first():
        return error_response("Email already registered.", status_code=409)

    roll_no_norm = cleaned_data["roll_no"]
    if Student.query.filter_by(roll_no=roll_no_norm).first():
        return error_response("Roll number already exists.", status_code=409)

    user = User(
        email=email_norm,
        role=RoleEnum.student,
        is_active=True,
    )
    user.set_password(cleaned_data["password"])
    
    try:
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            roll_no=roll_no_norm,
            full_name=cleaned_data["full_name"],
            dept=cleaned_data["dept"],
            year=cleaned_data["year"],
            section=cleaned_data["section"],
            phone=cleaned_data.get("phone"),
        )
        db.session.add(student)
        
        log = ActivityLog(
            action="user-plus",
            description=f"Created student record for {student.full_name} ({student.roll_no})",
            performed_by=current_user.id,
            role=current_user.role.value
        )
        db.session.add(log)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("Email or roll number already in use.", status_code=409)
        
    return success_response(student.to_dict(), status_code=201)


# ─────────────────────────── read / update / delete ─────────────────────── #

@students_bp.route("/<int:student_id>", methods=["GET", "PUT", "DELETE"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def manage_student(student_id: int):
    """GET/PUT/DELETE /api/students/<id>"""
    student = _get_student_or_404(student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    if request.method == "GET":
        if not _idor_check_student(student):
            return error_response("Access forbidden.", status_code=403)
        return success_response(student.to_dict())

    # PUT and DELETE
    is_admin = current_user.role == RoleEnum.admin

    if request.method == "PUT":
        # RBAC: Student can only edit their own profile
        if not is_admin:
            if not current_user.student_profile or current_user.student_profile.id != student_id:
                return error_response("Access forbidden.", status_code=403)

        data = request.get_json(silent=True) or {}

        from app.api.validators import validate_payload
        schema = {
            "full_name": {"type": str, "required": False, "max_length": 100},
            "dept": {"type": str, "required": False, "max_length": 50},
            "year": {"type": int, "required": False, "min_val": 1, "max_val": 4},
            "section": {"type": str, "required": False, "max_length": 10},
            "phone": {"type": str, "required": False, "min_length": 7, "max_length": 15, "regex": r"^[0-9+\-\s]+$"}
        }
        cleaned_data, err_resp = validate_payload(data, schema)
        if err_resp:
            return err_resp

        # Academic fields (Admin only)
        if is_admin:
            if "year" in cleaned_data and cleaned_data["year"] is not None:
                student.year = cleaned_data["year"]
            
            updatable = ("full_name", "dept", "section")
            for field in updatable:
                if field in cleaned_data and cleaned_data[field] is not None:
                    setattr(student, field, cleaned_data[field])

        # Phone is updatable by both admin and student
        if "phone" in cleaned_data:
            student.phone = cleaned_data["phone"]

        log = ActivityLog(
            action="edit",
            description=f"Updated student record for {student.full_name} ({student.roll_no})",
            performed_by=current_user.id,
            role=current_user.role.value
        )
        db.session.add(log)
        db.session.commit()
        return success_response(student.to_dict())

    # DELETE
    if not is_admin:
        return error_response("Admin access required.", status_code=403)

    full_name = student.full_name
    roll_no = student.roll_no

    user = student.user
    if user:
        db.session.delete(user)
    else:
        db.session.delete(student)
        
    log = ActivityLog(
        action="trash-2",
        description=f"Deleted student record for {full_name} ({roll_no})",
        performed_by=current_user.id,
        role=current_user.role.value
    )
    db.session.add(log)
    db.session.commit()
    return success_response(message="Student deleted.")


# ─────────────────────────── sub-resources ──────────────────────────────── #

@students_bp.route("/<int:student_id>/attendance", methods=["GET"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def get_student_attendance(student_id: int):
    """
    GET /api/students/<id>/attendance
    - Admin: full access.
    - Faculty: only if the student is enrolled in at least one of their courses.
      Records are further filtered to only those courses the faculty owns.
    - Student: own records only.
    """
    student = _get_student_or_404(student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    # Student role: own record only
    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return error_response("Access forbidden.", status_code=403)
        records = (
            Attendance.query.filter_by(student_id=student_id)
            .order_by(Attendance.date.desc())
            .all()
        )
        return success_response([r.to_dict() for r in records])

    # Admin: unrestricted
    if current_user.role == RoleEnum.admin:
        records = (
            Attendance.query.filter_by(student_id=student_id)
            .order_by(Attendance.date.desc())
            .all()
        )
        return success_response([r.to_dict() for r in records])

    # Faculty: must teach this student; return only attendance for own courses
    fp = current_user.faculty_profile
    if not fp:
        return error_response("Faculty profile not found.", status_code=403)
    if not _faculty_teaches_student(student_id):
        return error_response("Access forbidden.", status_code=403)

    # Collect course IDs assigned to this faculty
    from app.models.course import Course
    own_course_ids = [
        c.id for c in Course.query.filter_by(faculty_id=fp.id).all()
    ]
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


@students_bp.route("/<int:student_id>/marks", methods=["GET"])
@login_required
@role_required("admin", "faculty", "student")
@handle_api_exceptions
def get_student_marks(student_id: int):
    """
    GET /api/students/<id>/marks
    - Admin: full access.
    - Faculty: only if the student is enrolled in at least one of their courses.
      Records are filtered to only those courses the faculty owns.
    - Student: own records only.
    """
    student = _get_student_or_404(student_id)
    if not student:
        return error_response("Student not found.", status_code=404)

    # Student role: own record only
    if current_user.role == RoleEnum.student:
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            return error_response("Access forbidden.", status_code=403)
        records = Marks.query.filter_by(student_id=student_id).all()
        return success_response([r.to_dict() for r in records])

    # Admin: unrestricted
    if current_user.role == RoleEnum.admin:
        records = Marks.query.filter_by(student_id=student_id).all()
        return success_response([r.to_dict() for r in records])

    # Faculty: must teach this student; return only marks for own courses
    fp = current_user.faculty_profile
    if not fp:
        return error_response("Faculty profile not found.", status_code=403)
    if not _faculty_teaches_student(student_id):
        return error_response("Access forbidden.", status_code=403)

    from app.models.course import Course
    own_course_ids = [
        c.id for c in Course.query.filter_by(faculty_id=fp.id).all()
    ]
    records = (
        Marks.query
        .filter(
            Marks.student_id == student_id,
            Marks.course_id.in_(own_course_ids),
        )
        .all()
    )
    return success_response([r.to_dict() for r in records])
