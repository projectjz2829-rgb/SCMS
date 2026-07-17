from flask_login import current_user
from app.api.responses import error_response
from app.models.user import RoleEnum

def verify_faculty_course_access(course):
    """
    Check if the current user is a faculty member assigned to the given course.
    Returns an error_response if access is forbidden, otherwise None.
    """
    if current_user.role == RoleEnum.faculty:
        if not current_user.faculty_profile or course.faculty_id != current_user.faculty_profile.id:
            return error_response("Access forbidden.", status_code=403)
    return None
