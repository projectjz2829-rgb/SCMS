"""
app/models/course.py
Course model and the Enrollment M:N join table.
"""
from app.extensions import db


class Enrollment(db.Model):
    """
    M:N join table between Student and Course.
    PRIMARY KEY is the composite (student_id, course_id).
    """

    __tablename__ = "enrollments"

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        primary_key=True,
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # back_populates configured on the parent models
    student = db.relationship("Student", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")

    def to_dict(self) -> dict:
        return {
            "student_id": self.student_id,
            "course_id": self.course_id,
        }

    def __repr__(self) -> str:
        return f"<Enrollment student={self.student_id} course={self.course_id}>"


class Course(db.Model):
    """Academic course offered by a department."""

    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    faculty_id = db.Column(
        db.Integer,
        db.ForeignKey("faculty.id", ondelete="SET NULL"),
        nullable=True,
    )
    dept = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)

    # ------------------------------------------------------------------ #
    #  Relationships                                                       #
    # ------------------------------------------------------------------ #
    faculty = db.relationship("Faculty", back_populates="courses")
    enrollments = db.relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )
    attendance_records = db.relationship(
        "Attendance", back_populates="course", cascade="all, delete-orphan"
    )
    marks_records = db.relationship(
        "Marks", back_populates="course", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.full_name if self.faculty else None,
            "dept": self.dept,
            "semester": self.semester,
        }

    def __repr__(self) -> str:
        return f"<Course id={self.id} code={self.code}>"
