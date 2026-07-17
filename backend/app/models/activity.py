from datetime import datetime, timezone
from app.extensions import db

class ActivityLog(db.Model):
    __tablename__ = "activity_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    action = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    performed_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role = db.Column(db.String(20), nullable=True)
    
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = db.relationship("User", foreign_keys=[performed_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "action": self.action,
            "description": self.description,
            "performed_by": self.performed_by,
            "role": self.role,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_email": self.user.email if self.user else "System"
        }
