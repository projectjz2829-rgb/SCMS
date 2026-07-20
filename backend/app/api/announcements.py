from datetime import datetime, timezone
from flask import Blueprint, request
from flask_login import current_user, login_required
from app.api.responses import success_response, error_response, handle_api_exceptions
from app.extensions import db
from app.models.announcement import Announcement, PriorityEnum
from app.models.activity import ActivityLog
from app.auth.decorators import role_required

announcements_bp = Blueprint("announcements", __name__)

def _log_activity(action, desc):
    log = ActivityLog(
        action=action,
        description=desc,
        performed_by=current_user.id if current_user.is_authenticated else None,
        role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role) if current_user.is_authenticated else "system"
    )
    db.session.add(log)

@announcements_bp.route("/", methods=["GET", "POST"])
@login_required
@handle_api_exceptions
def manage_announcements():
    if request.method == "GET":
        query = Announcement.query
        if current_user.role.value != "admin":
            query = query.filter_by(active=True)
            # Handle expiry client side or here
        
        announcements = query.order_by(Announcement.pinned.desc(), Announcement.created_at.desc()).all()
        
        # Filter out expired for non-admins
        if current_user.role.value != "admin":
            now = datetime.now(timezone.utc)
            announcements = [a for a in announcements if not a.expiry_date or a.expiry_date > now]
            
        return success_response([a.to_dict() for a in announcements])

    # POST
    if current_user.role.value != "admin":
        return error_response("Admin access required.", 403)
        
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    message = data.get("message")
    
    if not title or not message:
        return error_response("Title and message are required", 400)
        
    ann = Announcement(
        title=title,
        message=message,
        priority=PriorityEnum(data.get("priority", "normal")),
        pinned=bool(data.get("pinned", False)),
        active=bool(data.get("active", True)),
        created_by=current_user.id
    )
    if data.get("expiry_date"):
        try:
            dt = datetime.fromisoformat(data["expiry_date"])
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            ann.expiry_date = dt
        except ValueError:
            pass
            
    db.session.add(ann)
    _log_activity("Announcement Created", f"Created announcement: {title}")
    db.session.commit()
    return success_response(ann.to_dict(), status_code=201)

@announcements_bp.route("/<int:ann_id>", methods=["PUT", "DELETE"])
@login_required
@role_required("admin")
@handle_api_exceptions
def modify_announcement(ann_id: int):
    ann = db.session.get(Announcement, ann_id)
    if not ann:
        return error_response("Not found", 404)
        
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}
        if "title" in data: ann.title = data["title"]
        if "message" in data: ann.message = data["message"]
        if "priority" in data: ann.priority = PriorityEnum(data["priority"])
        if "pinned" in data: ann.pinned = bool(data["pinned"])
        if "active" in data: ann.active = bool(data["active"])
        if "expiry_date" in data:
            if data["expiry_date"]:
                try:
                    dt = datetime.fromisoformat(data["expiry_date"])
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ann.expiry_date = dt
                except ValueError:
                    pass
            else:
                ann.expiry_date = None
        
        _log_activity("Announcement Edited", f"Updated announcement: {ann.title}")
        db.session.commit()
        return success_response(ann.to_dict())

    # DELETE
    title = ann.title
    db.session.delete(ann)
    _log_activity("Announcement Deleted", f"Deleted announcement: {title}")
    db.session.commit()
    return success_response(message="Deleted")
