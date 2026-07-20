"""
app/api/settings.py
API routes for UserSettings.
"""
from flask import Blueprint, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models.settings import UserSettings
from app.api.responses import success_response, error_response
from app.auth.decorators import role_required

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/", methods=["GET", "PUT"])
@login_required
def manage_settings():
    if request.method == "GET":
        settings = UserSettings.query.filter_by(user_id=current_user.id).first()
        if not settings:
            settings = UserSettings(user_id=current_user.id)
            db.session.add(settings)
            db.session.commit()
        return success_response(settings.to_dict())

    # PUT
    data = request.get_json()
    settings = UserSettings.query.filter_by(user_id=current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.session.add(settings)
    
    if "theme" in data:
        settings.theme = data["theme"]
    if "notifications" in data:
        notifs = data["notifications"]
        if "announcements" in notifs:
            settings.announcement_notifications = notifs["announcements"]
        if "marks" in notifs:
            settings.marks_notifications = notifs["marks"]
        if "attendance" in notifs:
            settings.attendance_notifications = notifs["attendance"]
        if "system" in notifs:
            settings.system_notifications = notifs["system"]
        if "email" in notifs:
            settings.email_notifications = notifs["email"]
            
    # Also handle flat keys directly for frontend updates
    if "announcement_notifications" in data:
        settings.announcement_notifications = data["announcement_notifications"]
    if "marks_notifications" in data:
        settings.marks_notifications = data["marks_notifications"]
    if "attendance_notifications" in data:
        settings.attendance_notifications = data["attendance_notifications"]
    if "system_notifications" in data:
        settings.system_notifications = data["system_notifications"]
    if "email_notifications" in data:
        settings.email_notifications = data["email_notifications"]
            
    try:
        db.session.commit()
        return success_response(settings.to_dict(), message="Settings updated successfully")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update settings: {str(e)}")

@settings_bp.route("/password", methods=["PUT"])
@login_required
def update_password():
    data = request.get_json()
    current_pw = data.get("current_pw")
    new_pw = data.get("new_pw")
    
    if not current_pw or not new_pw:
        return error_response("Current and new password are required", status_code=400)
        
    if not current_user.check_password(current_pw):
        return error_response("Invalid current password", status_code=401)
        
    try:
        current_user.set_password(new_pw)
        db.session.commit()
        return success_response(message="Password updated successfully")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update password: {str(e)}")
