from flask import Blueprint
from flask_login import current_user
from app.api.responses import success_response, error_response

auth_api_bp = Blueprint("auth_api", __name__, url_prefix="/auth")

@auth_api_bp.route("/me", methods=["GET"])
def current_user_info():
    """Return the currently authenticated user's details."""
    if not current_user.is_authenticated:
        return success_response({"authenticated": False, "user": None})

    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    }

    # Include profile details based on role if desired
    if current_user.role.value == "student" and current_user.student_profile:
        user_data["profile"] = {
            "roll_no": current_user.student_profile.roll_no,
            "full_name": current_user.student_profile.full_name,
            "dept": current_user.student_profile.dept,
        }
    elif current_user.role.value == "faculty" and current_user.faculty_profile:
        user_data["profile"] = {
            "emp_id": current_user.faculty_profile.emp_id,
            "full_name": current_user.faculty_profile.full_name,
            "dept": current_user.faculty_profile.dept,
        }
    elif current_user.role.value == "admin":
        user_data["profile"] = {
            "full_name": "Administrator"
        }

    return success_response({
        "authenticated": True,
        "user": user_data
    })
