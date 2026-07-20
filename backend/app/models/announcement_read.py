"""
app/models/announcement_read.py
AnnouncementReads model — tracks which announcements a user has read.
"""
from datetime import datetime
from app.extensions import db

class AnnouncementRead(db.Model):
    __tablename__ = "announcement_reads"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    announcement_id = db.Column(db.Integer, db.ForeignKey("announcements.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Prevent duplicate read records for the same user and announcement
    __table_args__ = (
        db.UniqueConstraint("announcement_id", "user_id", name="uix_announcement_user_read"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "announcement_id": self.announcement_id,
            "user_id": self.user_id,
            "read_at": self.read_at.isoformat()
        }
