from flask import Blueprint, request
from flask_login import current_user, login_required
from app.api.responses import success_response, error_response, handle_api_exceptions
from app.extensions import db
from app.models.activity import ActivityLog
from app.auth.decorators import role_required

activities_bp = Blueprint("activities", __name__)

@activities_bp.route("/", methods=["GET"])
@login_required
@role_required("admin")
@handle_api_exceptions
def get_activities():
    limit = request.args.get("limit", 50, type=int)
    logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return success_response([log.to_dict() for log in logs])
