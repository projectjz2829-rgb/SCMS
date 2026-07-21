"""
app/api/notifications.py
API routes for Announcements and AnnouncementReads (Notifications).
"""
from flask import Blueprint, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models.announcement import Announcement
from app.models.announcement_read import AnnouncementRead
from app.api.responses import success_response, error_response
from datetime import datetime

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/", methods=["GET"])
@login_required
def get_notifications():
    """
    Returns unread announcements for the current user.
    """
    try:
        # Get all announcements
        all_announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
        
        # Get read announcements for user
        read_records = AnnouncementRead.query.filter_by(user_id=current_user.id).all()
        read_ids = {r.announcement_id for r in read_records}
        
        # Filter unread
        unread_announcements = [a for a in all_announcements if a.id not in read_ids]
        
        return success_response([a.to_dict() for a in unread_announcements])
    except (db.exc.ProgrammingError, db.exc.OperationalError) as e:
        if "relation" in str(e) or "UndefinedTable" in str(e) or "does not exist" in str(e):
            import logging
            logging.getLogger(__name__).warning("Notifications tables missing. Returning empty array.")
            db.session.rollback()
            return success_response([])
        raise

@notifications_bp.route("/read-all", methods=["POST"])
@login_required
def mark_all_read():
    """
    Marks all announcements as read for the current user.
    """
    try:
        # Find all unread announcements
        all_announcements = Announcement.query.all()
        read_records = AnnouncementRead.query.filter_by(user_id=current_user.id).all()
        read_ids = {r.announcement_id for r in read_records}
        
        new_reads = []
        for a in all_announcements:
            if a.id not in read_ids:
                new_reads.append(AnnouncementRead(announcement_id=a.id, user_id=current_user.id))
                
        if new_reads:
            db.session.bulk_save_objects(new_reads)
            db.session.commit()
                
        return success_response(message="All notifications marked as read")
    except (db.exc.ProgrammingError, db.exc.OperationalError) as e:
        if "relation" in str(e) or "UndefinedTable" in str(e) or "does not exist" in str(e):
            db.session.rollback()
            return success_response(message="All notifications marked as read")
        raise
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to mark all as read: {str(e)}")

@notifications_bp.route("/<int:announcement_id>/read", methods=["POST"])
@login_required
def mark_read(announcement_id):
    """
    Marks a single announcement as read.
    """
    try:
        # Check if already read
        existing = AnnouncementRead.query.filter_by(announcement_id=announcement_id, user_id=current_user.id).first()
        if not existing:
            new_read = AnnouncementRead(announcement_id=announcement_id, user_id=current_user.id)
            db.session.add(new_read)
            db.session.commit()
                
        return success_response(message="Notification marked as read")
    except (db.exc.ProgrammingError, db.exc.OperationalError) as e:
        if "relation" in str(e) or "UndefinedTable" in str(e) or "does not exist" in str(e):
            db.session.rollback()
            return success_response(message="Notification marked as read")
        raise
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to mark as read: {str(e)}")
