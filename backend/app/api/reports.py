import csv
from io import StringIO
from flask import Blueprint, request, Response, abort
from flask_login import login_required, current_user

from app.extensions import db
from app.models.course import Course, Enrollment
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.marks import Marks
from app.models.user import RoleEnum
from app.api.responses import success_response, error_response

reports_bp = Blueprint("api_reports", __name__)


@reports_bp.route("/students", methods=["GET"])
@login_required
def get_students_for_reports():
    """GET /api/reports/students
    Admin: search across all students.
    Faculty: search only students enrolled in their assigned courses.
    Student: 403.
    Returns minimal fields required for transcript search.
    """
    if current_user.role == RoleEnum.student:
        return error_response("Access forbidden.", status_code=403)

    search = request.args.get("search", "").strip()

    if current_user.role == RoleEnum.admin:
        query = db.session.query(Student)
        if search:
            query = query.filter(
                db.or_(
                    Student.full_name.ilike(f"%{search}%"),
                    Student.roll_no.ilike(f"%{search}%"),
                )
            )
        students = query.order_by(Student.roll_no).limit(20).all()

    else:  # faculty
        fp = current_user.faculty_profile
        if not fp:
            return success_response([])

        from sqlalchemy import distinct
        query = (
            db.session.query(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .join(Course, Course.id == Enrollment.course_id)
            .filter(Course.faculty_id == fp.id)
            .distinct()
        )
        if search:
            query = query.filter(
                db.or_(
                    Student.full_name.ilike(f"%{search}%"),
                    Student.roll_no.ilike(f"%{search}%"),
                )
            )
        students = query.order_by(Student.roll_no).limit(20).all()

    data = [
        {"id": s.id, "full_name": s.full_name, "roll_no": s.roll_no, "dept": s.dept}
        for s in students
    ]
    return success_response(data)


@reports_bp.route("/csv/attendance", methods=["GET"])
@login_required
def export_attendance_csv():
    if current_user.role not in [RoleEnum.admin, RoleEnum.faculty]:
        return error_response("Unauthorized", status_code=403)
        
    course_id = request.args.get("course_id", type=int)
    if not course_id:
        return error_response("course_id is required", status_code=400)
        
    course = db.session.query(Course).get(course_id)
    if not course:
        return error_response("Course not found", status_code=404)
        
    if current_user.role == RoleEnum.faculty and course.faculty_id != current_user.faculty_profile.id:
        return error_response("Unauthorized for this course", status_code=403)

    records = (
        db.session.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.course_id == course_id)
        .order_by(Attendance.date.desc(), Student.roll_no)
        .all()
    )

    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(["Date", "Roll Number", "Student Name", "Status"])

    for attendance, student in records:
        writer.writerow([
            attendance.date.strftime("%Y-%m-%d"),
            student.roll_no,
            student.full_name,
            attendance.status
        ])

    return Response(
        si.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{course.code}.csv"}
    )

@reports_bp.route("/csv/marks", methods=["GET"])
@login_required
def export_marks_csv():
    if current_user.role not in [RoleEnum.admin, RoleEnum.faculty]:
        return error_response("Unauthorized", status_code=403)
        
    course_id = request.args.get("course_id", type=int)
    if not course_id:
        return error_response("course_id is required", status_code=400)
        
    course = db.session.query(Course).get(course_id)
    if not course:
        return error_response("Course not found", status_code=404)
        
    if current_user.role == RoleEnum.faculty and course.faculty_id != current_user.faculty_profile.id:
        return error_response("Unauthorized for this course", status_code=403)

    records = (
        db.session.query(Marks, Student)
        .join(Student, Marks.student_id == Student.id)
        .filter(Marks.course_id == course_id)
        .order_by(Student.roll_no)
        .all()
    )

    si = StringIO()
    writer = csv.writer(si)
    writer.writerow([
        "Roll Number", "Student Name", "Internal 1", "Internal 2", 
        "Semester Final", "Practical", "Total", "Grade", "Grade Point"
    ])

    for mark, student in records:
        total = mark.internal_1 + mark.internal_2 + mark.semester_final + mark.practical
        pct = (total * 100.0) / 175.0
        
        if pct >= 90:
            grade = "O"
            gp = 10.0
        elif pct >= 80:
            grade = "A+"
            gp = 9.0
        elif pct >= 70:
            grade = "A"
            gp = 8.0
        elif pct >= 60:
            grade = "B+"
            gp = 7.0
        elif pct >= 50:
            grade = "B"
            gp = 6.0
        else:
            grade = "U"
            gp = 0.0

        writer.writerow([
            student.roll_no,
            student.full_name,
            mark.internal_1,
            mark.internal_2,
            mark.semester_final,
            mark.practical,
            total,
            grade,
            gp
        ])

    return Response(
        si.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=marks_{course.code}.csv"}
    )

@reports_bp.route("/transcript/<int:student_id>", methods=["GET"])
@login_required
def get_transcript(student_id):
    if current_user.role == RoleEnum.student and current_user.student_profile.id != student_id:
        return error_response("Unauthorized", status_code=403)
        
    student = db.session.query(Student).get(student_id)
    if not student:
        return error_response("Student not found", status_code=404)
        
    marks = (
        db.session.query(Marks, Course)
        .join(Course, Marks.course_id == Course.id)
        .filter(Marks.student_id == student_id)
        .all()
    )
    
    courses_data = []
    total_points = 0.0
    for mark, course in marks:
        total = mark.internal_1 + mark.internal_2 + mark.semester_final + mark.practical
        pct = (total * 100.0) / 175.0
        
        if pct >= 90:
            grade, gp = "O", 10.0
        elif pct >= 80:
            grade, gp = "A+", 9.0
        elif pct >= 70:
            grade, gp = "A", 8.0
        elif pct >= 60:
            grade, gp = "B+", 7.0
        elif pct >= 50:
            grade, gp = "B", 6.0
        else:
            grade, gp = "U", 0.0
            
        total_points += gp
            
        courses_data.append({
            "course_code": course.code,
            "course_name": course.name,
            "internal_1": mark.internal_1,
            "internal_2": mark.internal_2,
            "semester_final": mark.semester_final,
            "practical": mark.practical,
            "total": total,
            "grade": grade,
            "grade_point": gp
        })
        
    overall_gpa = round(total_points / len(marks), 2) if marks else 0.0
    
    # Calculate attendance
    attendance_records = db.session.query(Attendance).filter(Attendance.student_id == student_id).all()
    total_classes = len(attendance_records)
    present_classes = sum(1 for a in attendance_records if a.status == "Present")
    attendance_pct = round((present_classes / total_classes * 100), 2) if total_classes > 0 else 0.0

    return success_response({
        "student": {
            "id": student.id,
            "name": student.full_name,
            "roll_no": student.roll_no,
            "email": student.user.email,
            "dept": student.dept,
            "year": student.year,
            "section": student.section,
        },
        "academic": {
            "overall_gpa": overall_gpa,
            "total_courses": len(marks),
            "attendance_pct": attendance_pct
        },
        "courses": courses_data
    })
