"""
app/models/settings.py
UserSettings model — stores theme and notification preferences.
"""
from datetime import datetime
from app.extensions import db

class UserSettings(db.Model):
    __tablename__ = "user_settings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    
    theme = db.Column(db.String(20), default="light", nullable=False)
    
    announcement_notifications = db.Column(db.Boolean, default=True, nullable=False)
    marks_notifications = db.Column(db.Boolean, default=True, nullable=False)
    attendance_notifications = db.Column(db.Boolean, default=False, nullable=False)
    system_notifications = db.Column(db.Boolean, default=True, nullable=False)
    email_notifications = db.Column(db.Boolean, default=False, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("settings", uselist=False, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "theme": self.theme,
            "notifications": {
                "announcements": self.announcement_notifications,
                "marks": self.marks_notifications,
                "attendance": self.attendance_notifications,
                "system": self.system_notifications,
                "email": self.email_notifications
            }
        }
