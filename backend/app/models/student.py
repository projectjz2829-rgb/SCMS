"""
app/models/student.py
Student profile linked one-to-one with the User account.
"""
from app.extensions import db


class Student(db.Model):
    """Student profile record."""

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    roll_no = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=False)
    dept = db.Column(db.String(50), nullable=False)
    year = db.Column(db.Integer, nullable=False)          # 1–4
    section = db.Column(db.String(5), nullable=False)
    phone = db.Column(db.String(15), nullable=True)

    # ------------------------------------------------------------------ #
    #  Relationships                                                       #
    # ------------------------------------------------------------------ #
    user = db.relationship("User", back_populates="student_profile")

    enrollments = db.relationship(
        "Enrollment", back_populates="student", cascade="all, delete-orphan"
    )
    attendance_records = db.relationship(
        "Attendance", back_populates="student", cascade="all, delete-orphan"
    )
    marks_records = db.relationship(
        "Marks", back_populates="student", cascade="all, delete-orphan"
    )

    def to_dict(self, email=None) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "roll_no": self.roll_no,
            "full_name": self.full_name,
            "dept": self.dept,
            "year": self.year,
            "section": self.section,
            "phone": self.phone,
            "email": email if email is not None else (self.user.email if self.user else None),
        }

    def __repr__(self) -> str:
        return f"<Student id={self.id} roll_no={self.roll_no}>"
