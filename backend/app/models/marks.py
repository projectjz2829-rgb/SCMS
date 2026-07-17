"""
app/models/marks.py
Marks model with a UNIQUE constraint on (student, course, academic_year).
"""
from datetime import datetime

from app.extensions import db


class Marks(db.Model):
    """Assessment marks for a student in a course for a given academic year."""

    __tablename__ = "marks"
    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "course_id", "academic_year",
            name="uq_marks_student_course_year",
        ),
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
        index=True,
    )
    internal_1 = db.Column(db.Integer, default=0, nullable=False)
    internal_2 = db.Column(db.Integer, default=0, nullable=False)
    semester_final = db.Column(db.Integer, default=0, nullable=False)
    practical = db.Column(db.Integer, default=0, nullable=False)
    entered_by = db.Column(
        db.Integer,
        db.ForeignKey("faculty.id", ondelete="SET NULL"),
        nullable=True,
    )
    academic_year = db.Column(db.String(9), nullable=False)   # e.g. "2024-2025"
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # ------------------------------------------------------------------ #
    #  Relationships                                                       #
    # ------------------------------------------------------------------ #
    student = db.relationship("Student", back_populates="marks_records")
    course = db.relationship("Course", back_populates="marks_records")
    enterer = db.relationship(
        "Faculty",
        foreign_keys=[entered_by],
        back_populates="marks_entered",
    )

    def to_dict(self) -> dict:
        # Calculate total and grade dynamically without modifying schema
        total = self.internal_1 + self.internal_2 + self.semester_final + self.practical
        max_marks = 175  # Assuming standard 25+25+75+50 setup
        
        pct = (total / max_marks) * 100 if max_marks > 0 else 0
        if pct >= 90:
            grade, point = "O", 10.0
        elif pct >= 80:
            grade, point = "A+", 9.0
        elif pct >= 70:
            grade, point = "A", 8.0
        elif pct >= 60:
            grade, point = "B+", 7.0
        elif pct >= 50:
            grade, point = "B", 6.0
        else:
            grade, point = "U", 0.0

        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "course_id": self.course_id,
            "course_code": self.course.code if self.course else None,
            "internal_1": self.internal_1,
            "internal_2": self.internal_2,
            "semester_final": self.semester_final,
            "practical": self.practical,
            "total_earned": total,
            "grade": grade,
            "grade_point": point,
            "entered_by": self.entered_by,
            "academic_year": self.academic_year,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return (
            f"<Marks id={self.id} student={self.student_id} "
            f"course={self.course_id} year={self.academic_year}>"
        )
