"""
app/models/attendance.py
Attendance record model with a UNIQUE constraint on (student, course, date).
"""
import enum
from datetime import datetime

from app.extensions import db


class AttendanceStatusEnum(enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"


class Attendance(db.Model):
    """Daily attendance record for a student in a course."""

    __tablename__ = "attendance"
    __table_args__ = (
        db.UniqueConstraint("student_id", "course_id", "date", name="uq_attendance_student_course_date"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum(AttendanceStatusEnum), nullable=False)
    marked_by = db.Column(
        db.Integer,
        db.ForeignKey("faculty.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # ------------------------------------------------------------------ #
    #  Relationships                                                       #
    # ------------------------------------------------------------------ #
    student = db.relationship("Student", back_populates="attendance_records")
    course = db.relationship("Course", back_populates="attendance_records")
    marker = db.relationship(
        "Faculty",
        foreign_keys=[marked_by],
        back_populates="attendance_marked",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "course_id": self.course_id,
            "course_code": self.course.code if self.course else None,
            "date": self.date.isoformat(),
            "status": self.status.value,
            "marked_by": self.marked_by,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<Attendance id={self.id} student={self.student_id} "
            f"course={self.course_id} date={self.date} status={self.status.value}>"
        )
