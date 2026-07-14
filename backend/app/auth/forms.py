"""
app/auth/forms.py
WTForms definitions for authentication.
CSRF protection is provided globally by Flask-WTF's CSRFProtect extension.
"""
from flask_wtf import FlaskForm
from wtforms import EmailField, PasswordField, SelectField, StringField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Regexp


class LoginForm(FlaskForm):
    """Form for user login — accepts email, student roll number, or faculty/admin employee ID."""

    identifier = StringField(
        "Email / Register No.",
        validators=[
            DataRequired(message="Email or register number is required."),
            Length(max=120, message="Identifier must be 120 characters or fewer."),
        ],
    )
    password = PasswordField(
        "Password",
        validators=[
            DataRequired(message="Password is required."),
            Length(min=8, max=128, message="Password must be 8–128 characters."),
        ],
    )
    submit = SubmitField("Sign In")


class RegisterForm(FlaskForm):
    """
    Admin-only form for creating new user accounts.
    The role field determines which profile (student/faculty) is created.
    """

    email = EmailField(
        "Email Address",
        validators=[
            DataRequired(),
            Regexp(
                r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
                message="Enter a valid email address."
            ),
            Length(max=120),
        ],
    )
    password = PasswordField(
        "Password",
        validators=[
            DataRequired(),
            Length(min=8, max=128),
        ],
    )
    confirm_password = PasswordField(
        "Confirm Password",
        validators=[
            DataRequired(),
            EqualTo("password", message="Passwords must match."),
        ],
    )
    role = SelectField(
        "Role",
        choices=[
            ("student", "Student"),
            ("faculty", "Faculty"),
            ("admin", "Admin"),
        ],
        default="student",
        validators=[DataRequired()],
    )

    full_name = StringField(
        "Full Name",
        validators=[DataRequired(), Length(min=2, max=100)],
    )
    # Student fields
    roll_no = StringField(
        "Roll Number",
        validators=[Length(max=20)],
    )
    dept = StringField(
        "Department",
        validators=[Length(max=50)],
    )
    year = SelectField(
        "Year",
        choices=[("", "Select Year"), ("1", "1"), ("2", "2"), ("3", "3"), ("4", "4")],
        default="",
    )
    section = StringField(
        "Section",
        validators=[Length(max=5)],
    )
    phone = StringField(
        "Phone",
        validators=[
            Length(max=15),
            Regexp(r"^[0-9+\-\s]*$", message="Enter a valid phone number."),
        ],
    )
    # Faculty fields
    emp_id = StringField(
        "Employee ID",
        validators=[Length(max=20)],
    )
    designation = StringField(
        "Designation",
        validators=[Length(max=80)],
    )
    submit = SubmitField("Create Account")

    # ------------------------------------------------------------------ #
    #  Conditional validation                                              #
    # ------------------------------------------------------------------ #
    def validate(self, extra_validators=None):
        """
        Beyond the per-field validators above, enforce that the fields
        required to build a Student or Faculty profile are present when
        that role is selected. Without this, an admin could submit the
        form with e.g. role=student and no roll_no, which would pass form
        validation but then blow up as an unhandled database
        IntegrityError (roll_no is NOT NULL) when the route tries to save.
        """
        if not super().validate(extra_validators=extra_validators):
            return False

        if self.role.data == "student":
            missing = []
            if not self.roll_no.data or not self.roll_no.data.strip():
                missing.append("roll_no")
            if not self.dept.data or not self.dept.data.strip():
                missing.append("dept")
            if not self.year.data:
                missing.append("year")
            if not self.section.data or not self.section.data.strip():
                missing.append("section")
            if missing:
                self.roll_no.errors.append(
                    "Roll number, department, year, and section are required for student accounts."
                )
                return False

        elif self.role.data == "faculty":
            missing = []
            if not self.emp_id.data or not self.emp_id.data.strip():
                missing.append("emp_id")
            if not self.dept.data or not self.dept.data.strip():
                missing.append("dept")
            if not self.designation.data or not self.designation.data.strip():
                missing.append("designation")
            if missing:
                self.emp_id.errors.append(
                    "Employee ID, department, and designation are required for faculty accounts."
                )
                return False

        return True
