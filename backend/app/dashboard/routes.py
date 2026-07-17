"""
app/dashboard/routes.py
Dashboard view routes — one view per role.
All routes are protected by @login_required + @role_required.
Templates receive minimal data; JS fetches the rest via API calls.
"""
from flask import render_template, redirect, url_for
from app.api.responses import success_response, error_response, handle_api_exceptions
from flask_login import current_user, login_required
from sqlalchemy import func

from app.extensions import db
from app.dashboard import dashboard_bp
from app.auth.decorators import role_required
from app.models.user import RoleEnum
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course, Enrollment
from app.models.attendance import Attendance, AttendanceStatusEnum


# ─────────────────────────── root redirect ──────────────────────────────── #

@dashboard_bp.route("/")
@login_required
def index():
    """Redirect / to the correct dashboard based on role."""
    if current_user.role == RoleEnum.admin:
        return redirect(url_for("dashboard.admin_dashboard"))
    if current_user.role == RoleEnum.faculty:
        return redirect(url_for("dashboard.faculty_dashboard"))
    return redirect(url_for("dashboard.student_dashboard"))


# ─────────────────────────── admin ──────────────────────────────────────── #

@dashboard_bp.route("/admin")
@login_required
@role_required("admin")
def admin_dashboard():
    """Admin overview — data loaded by dashboard.js via API."""
    return render_template("dashboard/admin.html", title="Admin Dashboard")

@dashboard_bp.route("/api/admin/stats")
@login_required
@role_required("admin")
@handle_api_exceptions
def admin_stats():
    """Returns live database counts and chart data for the admin dashboard."""
    student_count = db.session.query(Student).count()
    faculty_count = db.session.query(Faculty).count()
    course_count = db.session.query(Course).count()
    enrollment_count = db.session.query(Enrollment).count()

    dept_counts = db.session.query(Student.dept, func.count(Student.id)).group_by(Student.dept).all()
    departments = {dept: count for dept, count in dept_counts if dept}

    courses = Course.query.order_by(Course.code).limit(8).all()
    course_stats = []
    for c in courses:
        total = db.session.query(func.count(Attendance.id)).filter_by(course_id=c.id).scalar()
        present = db.session.query(func.count(Attendance.id)).filter(
            Attendance.course_id == c.id,
            Attendance.status.in_([AttendanceStatusEnum.present, AttendanceStatusEnum.late])
        ).scalar()
        pct = int((present / total * 100)) if total > 0 else 100
        course_stats.append({
            "code": c.code,
            "attendance_pct": pct
        })

    return success_response({
        "stats": {
            "students": student_count,
            "faculty": faculty_count,
            "courses": course_count,
            "enrollments": enrollment_count
        },
        "charts": {
            "departments": departments,
            "courses": course_stats
        }
    })


# ─────────────────────────── faculty ────────────────────────────────────── #

@dashboard_bp.route("/faculty")
@login_required
@role_required("faculty")
def faculty_dashboard():
    """Faculty workspace — courses, attendance grid, and marks entry."""
    faculty = current_user.faculty_profile
    return render_template(
        "dashboard/faculty.html",
        title="Faculty Dashboard",
        faculty=faculty,
    )


@dashboard_bp.route("/api/faculty/stats")
@login_required
@role_required("faculty")
@handle_api_exceptions
def faculty_stats():
    """
    GET /dashboard/api/faculty/stats
    Returns live stats for the current faculty member:
      - courses: list with name, code, dept, semester, student_count, att_pct
      - summary: total_courses, total_students, overall_att_pct, pending_marks_courses
    """
    from app.models.marks import Marks

    faculty = current_user.faculty_profile
    if not faculty:
        return error_response("Faculty profile not found.", status_code=404)

    courses = faculty.courses
    course_stats = []
    total_students = 0
    total_sessions = 0
    total_present = 0

    for c in courses:
        enrolled = db.session.query(func.count(Enrollment.student_id)).filter(
            Enrollment.course_id == c.id
        ).scalar() or 0
        total_students += enrolled

        total_att = db.session.query(func.count(Attendance.id)).filter(
            Attendance.course_id == c.id
        ).scalar() or 0
        present_att = db.session.query(func.count(Attendance.id)).filter(
            Attendance.course_id == c.id,
            Attendance.status.in_([AttendanceStatusEnum.present, AttendanceStatusEnum.late])
        ).scalar() or 0
        
        total_sessions += total_att
        total_present += present_att

        att_pct = int((present_att / total_att) * 100) if total_att > 0 else None

        # Pending marks: any enrolled student with no marks row for this course
        marks_entered = db.session.query(func.count(Marks.id)).filter(
            Marks.course_id == c.id
        ).scalar() or 0
        pending_marks = enrolled > 0 and marks_entered < enrolled

        course_stats.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "dept": c.dept,
            "semester": c.semester,
            "faculty_id": c.faculty_id,
            "faculty_name": faculty.full_name,
            "enrolled_count": enrolled,
            "att_pct": att_pct,
            "pending_marks": pending_marks,
        })

    # Overall attendance across all faculty courses
    overall_att_pct = int((total_present / total_sessions) * 100) if total_sessions > 0 else None
    pending_courses = sum(1 for cs in course_stats if cs["pending_marks"])

    return success_response({
        "courses": course_stats,
        "summary": {
            "total_courses": len(courses),
            "total_students": total_students,
            "overall_att_pct": overall_att_pct,
            "pending_marks_courses": pending_courses,
        }
    })


# ─────────────────────────── student ────────────────────────────────────── #

@dashboard_bp.route("/student")
@login_required
@role_required("student")
def student_dashboard():
    """Student view — attendance summary, marks, and bulletin."""
    student = current_user.student_profile
    return render_template(
        "dashboard/student.html",
        title="Student Dashboard",
        student=student,
    )


@dashboard_bp.route("/api/student/stats")
@login_required
@role_required("student")
@handle_api_exceptions
def student_stats():
    """
    GET /dashboard/api/student/stats
    Returns live stats for the current student:
      - enrolled_courses: list of courses with faculty names
      - summary: enrolled_courses_count, overall_att_pct, pending_assignments, gpa
      - activity_feed: latest 5 activities (marks/attendance)
    """
    from app.models.marks import Marks

    student = current_user.student_profile
    if not student:
        return error_response("Student profile not found.", status_code=404)

    # 1. Fetch all courses the student is enrolled in
    from app.models.course import Course, Enrollment
    from app.models.faculty import Faculty
    from app.models.attendance import Attendance, AttendanceStatusEnum
    from sqlalchemy import func, case
    
    course_records = (
        db.session.query(Course, Faculty.full_name)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .outerjoin(Faculty, Course.faculty_id == Faculty.id)
        .filter(Enrollment.student_id == student.id)
        .all()
    )

    # 2. Fetch aggregate attendance for these courses
    att_stats = (
        db.session.query(
            Attendance.course_id,
            func.count(Attendance.id).label("total"),
            func.sum(
                case(
                    (Attendance.status.in_([AttendanceStatusEnum.present, AttendanceStatusEnum.late]), 1),
                    else_=0
                )
            ).label("present")
        )
        .filter(Attendance.student_id == student.id)
        .group_by(Attendance.course_id)
        .all()
    )
    att_dict = {row.course_id: {"total": row.total, "present": int(row.present) if row.present else 0} for row in att_stats}

    # 3. Fetch all marks for this student
    all_marks = Marks.query.filter_by(student_id=student.id).all()
    marks_dict = {m.course_id: m for m in all_marks}

    courses_list = []
    
    total_sessions = 0
    total_present = 0
    
    total_gpa_points = 0
    gpa_courses_count = 0
    pending_assignments = 0

    for c, fname in course_records:
        faculty_name = fname if fname else "Unassigned"
        
        # Course Attendance
        c_att = att_dict.get(c.id, {"total": 0, "present": 0})
        c_att_total = c_att["total"]
        c_att_present = c_att["present"]
        
        att_pct = int((c_att_present / c_att_total) * 100) if c_att_total > 0 else None
        
        total_sessions += c_att_total
        total_present += c_att_present
        
        # Marks for GPA / Pending Assignments
        marks = marks_dict.get(c.id)
        if marks:
            # Assuming total marks = 175 (25+25+75+50). GPA calculation normalized to 10.0 scale
            earned = marks.internal_1 + marks.internal_2 + marks.semester_final + marks.practical
            pct = (earned / 175.0) * 100
            if pct >= 90:
                gpa = 10.0
            elif pct >= 80:
                gpa = 9.0
            elif pct >= 70:
                gpa = 8.0
            elif pct >= 60:
                gpa = 7.0
            elif pct >= 50:
                gpa = 6.0
            else:
                gpa = 0.0
            total_gpa_points += gpa
            gpa_courses_count += 1
        else:
            pending_assignments += 1
            
        courses_list.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "faculty_name": faculty_name,
            "att_pct": att_pct
        })
        
    overall_att_pct = int((total_present / total_sessions) * 100) if total_sessions > 0 else None
    overall_gpa = round(total_gpa_points / gpa_courses_count, 2) if gpa_courses_count > 0 else None

    # Activity Feed (Latest 5 records from Attendance/Marks combined)
    recent_att = Attendance.query.filter_by(student_id=student.id).order_by(Attendance.created_at.desc()).limit(5).all()
    recent_marks = Marks.query.filter_by(student_id=student.id).order_by(Marks.created_at.desc()).limit(5).all()
    
    activities = []
    for att in recent_att:
        activities.append({
            "text": f"Attendance marked as '{att.status.value}' for {att.course.code if att.course else 'Course'}",
            "time": att.created_at
        })
    for m in recent_marks:
        activities.append({
            "text": f"Marks updated for {m.course.code if m.course else 'Course'}",
            "time": m.created_at
        })
        
    activities.sort(key=lambda x: x["time"], reverse=True)
    activity_feed = [{"text": a["text"], "time": a["time"].strftime("%b %d, %I:%M %p")} for a in activities[:5]]

    return success_response({
        "enrolled_courses": courses_list,
        "summary": {
            "enrolled_courses_count": len(course_records),
            "overall_att_pct": overall_att_pct,
            "pending_assignments": pending_assignments,
            "gpa": overall_gpa
        },
        "activity_feed": activity_feed
    })
