"""
app/models/faculty.py
Faculty profile linked one-to-one with the User account.
"""
from app.extensions import db


class Faculty(db.Model):
    """Faculty profile record."""

    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    emp_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=False)
    dept = db.Column(db.String(50), nullable=False)
    designation = db.Column(db.String(80), nullable=False)
    phone = db.Column(db.String(15), nullable=True)

    # ------------------------------------------------------------------ #
    #  Relationships                                                       #
    # ------------------------------------------------------------------ #
    user = db.relationship("User", back_populates="faculty_profile")

    courses = db.relationship("Course", back_populates="faculty")
    attendance_marked = db.relationship(
        "Attendance",
        foreign_keys="Attendance.marked_by",
        back_populates="marker",
    )
    marks_entered = db.relationship(
        "Marks",
        foreign_keys="Marks.entered_by",
        back_populates="enterer",
    )

    def to_dict(self, email=None) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "emp_id": self.emp_id,
            "full_name": self.full_name,
            "dept": self.dept,
            "designation": self.designation,
            "phone": self.phone,
            "email": email if email is not None else (self.user.email if self.user else None),
        }

    def __repr__(self) -> str:
        return f"<Faculty id={self.id} emp_id={self.emp_id}>"
