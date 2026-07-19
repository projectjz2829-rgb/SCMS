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

        # Mock attendance trend for now as the actual calculation requires joining lots of attendance records
        attendance_trend = [
            { "month": "May", "attendance": 88 },
            { "month": "Jun", "attendance": 82 },
            { "month": "Jul", "attendance": 79 },
            { "month": "Aug", "attendance": 85 },
            { "month": "Sep", "attendance": 91 },
            { "month": "Oct", "attendance": 87 }
        ]

        stats = {
            "total_students": db.session.query(func.count(Student.id)).scalar(),
            "total_faculty": db.session.query(func.count(Faculty.id)).scalar(),
            "total_courses": db.session.query(func.count(Course.id)).scalar(),
            "avg_attendance": 85, # Placeholder for now
            "students_by_dept": students_by_dept,
            "attendance_trend": attendance_trend
        }
    elif current_user.role == RoleEnum.faculty:
        stats = {
            "total_courses": 3,
            "total_students": 134,
            "avg_attendance": 87,
            "weekly_attendance": [
                {"day": "Mon", "present": 115, "absent": 19},
                {"day": "Tue", "present": 120, "absent": 14},
                {"day": "Wed", "present": 118, "absent": 16},
                {"day": "Thu", "present": 110, "absent": 24},
                {"day": "Fri", "present": 125, "absent": 9},
            ],
            "schedule": [
                { "time": "08:00 AM", "course": "CS-301 Data Structures", "room": "CS-101", "students": 42 },
                { "time": "10:00 AM", "course": "CS-201 OOP", "room": "CS-204", "students": 50 },
                { "time": "02:00 PM", "course": "CS-301 Lab", "room": "Lab-3", "students": 42 },
            ]
        }
    elif current_user.role == RoleEnum.student:
        stats = {
            "total_courses": 5,
            "avg_attendance": 85,
            "overall_gpa": 3.8,
            "attendance_trend": [
                { "month": "May", "attendance": 88 },
                { "month": "Jun", "attendance": 82 },
                { "month": "Jul", "attendance": 79 },
                { "month": "Aug", "attendance": 85 },
                { "month": "Sep", "attendance": 91 },
                { "month": "Oct", "attendance": 87 }
            ],
            "grade_distribution": [
                { "grade": "A+", "count": 2, "fill": "#22C55E" },
                { "grade": "A", "count": 1, "fill": "#4ADE80" },
                { "grade": "B+", "count": 1, "fill": "#3B82F6" },
                { "grade": "B", "count": 1, "fill": "#60A5FA" },
                { "grade": "C", "count": 0, "fill": "#F59E0B" },
            ]
        }
        
    return success_response(stats)
