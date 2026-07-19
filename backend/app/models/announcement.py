from datetime import datetime, timezone
import enum
from app.extensions import db

class PriorityEnum(enum.Enum):
    normal = "normal"
    important = "important"
    urgent = "urgent"

class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.Enum(PriorityEnum), default=PriorityEnum.normal, nullable=False)
    pinned = db.Column(db.Boolean, default=False, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    expiry_date = db.Column(db.DateTime(timezone=True), nullable=True)
    
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    creator = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "priority": self.priority.value if self.priority else "normal",
            "pinned": self.pinned,
            "active": self.active,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "created_by": self.created_by,
            "creator_name": self.creator.full_name if self.creator else "Unknown",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
