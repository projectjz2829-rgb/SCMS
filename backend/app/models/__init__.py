"""
app/models/__init__.py
Re-exports all models so that importing from app.models is convenient
and all mappers are registered before create_all() is called.
"""
from app.models.user import User, RoleEnum
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course, Enrollment
from app.models.attendance import Attendance, AttendanceStatusEnum
from app.models.marks import Marks
from app.models.announcement import Announcement, PriorityEnum
from app.models.activity import ActivityLog
from app.models.settings import UserSettings
from app.models.announcement_read import AnnouncementRead

__all__ = [
    "User",
    "RoleEnum",
    "Student",
    "Faculty",
    "Course",
    "Enrollment",
    "Attendance",
    "AttendanceStatusEnum",
    "Marks",
    "Announcement",
    "PriorityEnum",
    "ActivityLog",
    "UserSettings",
    "AnnouncementRead",
]
