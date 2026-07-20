from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func

from app.extensions import db
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.user import RoleEnum
from app.api.responses import success_response

dashboard_api_bp = Blueprint("api_dashboard", __name__)

@dashboard_api_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    """Return dashboard statistics based on the user's role."""
    stats = {}
    
    if current_user.role == RoleEnum.admin:
        # Group students by dept
        dept_counts = db.session.query(Student.dept, func.count(Student.id)).group_by(Student.dept).all()
        colors = ['#2563EB', '#06B6D4', '#22C55E', '#F59E0B', '#8B5CF6']
        students_by_dept = [{"name": dept, "students": count, "fill": colors[i % len(colors)]} for i, (dept, count) in enumerate(dept_counts)]

        stats = {
            "total_students": db.session.query(func.count(Student.id)).scalar(),
            "total_faculty": db.session.query(func.count(Faculty.id)).scalar(),
            "total_courses": db.session.query(func.count(Course.id)).scalar(),
            "avg_attendance": None, # Requires complex join, leaving empty as requested
            "students_by_dept": students_by_dept,
            "attendance_trend": [] # Empty array for missing trend
        }
    elif current_user.role == RoleEnum.faculty:
        fp = current_user.faculty_profile
        if fp:
            total_courses = db.session.query(func.count(Course.id)).filter_by(faculty_id=fp.id).scalar()
            
            from app.models.course import Enrollment
            total_students = db.session.query(func.count(func.distinct(Enrollment.student_id))).join(Course).filter(Course.faculty_id == fp.id).scalar()
        else:
            total_courses = 0
            total_students = 0
            
        stats = {
            "total_courses": total_courses,
            "total_students": total_students,
            "avg_attendance": None,
            "weekly_attendance": [],
            "schedule": []
        }
    elif current_user.role == RoleEnum.student:
        sp = current_user.student_profile
        if sp:
            from app.models.course import Enrollment
            total_courses = db.session.query(func.count(Enrollment.course_id)).filter_by(student_id=sp.id).scalar()
            
            # Calculate GPA and Grade Distribution
            from app.models.marks import Marks
            from sqlalchemy import cast, Float, case
            
            total_col = Marks.internal_1 + Marks.internal_2 + Marks.semester_final + Marks.practical
            pct_col = (cast(total_col, Float) * 100.0) / 175.0
            
            point_case = case(
                (pct_col >= 90, 10.0),
                (pct_col >= 80, 9.0),
                (pct_col >= 70, 8.0),
                (pct_col >= 60, 7.0),
                (pct_col >= 50, 6.0),
                else_=0.0
            )
            
            grade_case = case(
                (pct_col >= 90, "O"),
                (pct_col >= 80, "A+"),
                (pct_col >= 70, "A"),
                (pct_col >= 60, "B+"),
                (pct_col >= 50, "B"),
                else_="U"
            )
            
            overall_gpa = db.session.query(func.avg(point_case)).filter(Marks.student_id == sp.id).scalar()
            
            grade_counts = db.session.query(grade_case, func.count(Marks.id)).filter(Marks.student_id == sp.id).group_by(grade_case).all()
            
            colors = {"O": "#22C55E", "A+": "#22C55E", "A": "#2563EB", "B+": "#2563EB", "B": "#F59E0B", "U": "#EF4444"}
            grade_distribution = [{"grade": g, "count": c, "fill": colors.get(g, "#94A3B8")} for g, c in grade_counts if g]
            
        else:
            total_courses = 0
            overall_gpa = 0.0
            grade_distribution = []
            
        stats = {
            "total_courses": total_courses,
            "avg_attendance": 100, # Mocked temporarily as attendance is excluded from Marks phase
            "overall_gpa": float(overall_gpa) if overall_gpa else 0.0,
            "attendance_trend": [],
            "grade_distribution": grade_distribution
        }
        
    return success_response(stats)
