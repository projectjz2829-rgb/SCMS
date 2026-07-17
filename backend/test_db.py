from app import create_app
from app.extensions import db
from app.models.user import User
from app.api.announcements import _log_activity
from app.models.announcement import Announcement, PriorityEnum
import os
import traceback

os.environ['FLASK_ENV'] = 'development'
app = create_app('development')
app.config['WTF_CSRF_ENABLED'] = False
app.config['TESTING'] = True

with app.app_context():
    db.create_all()
    # Create fake admin
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User(id=999, email='admin@test.com', password_hash='foo', role='admin')
        db.session.add(admin)
        db.session.commit()
    
    # Mock current_user
    from flask_login import login_user
    from werkzeug.test import EnvironBuilder
    from flask import request
    
    builder = EnvironBuilder(method='POST', json={'title': 'Test', 'message': 'Msg'})
    env = builder.get_environ()
    with app.request_context(env):
        login_user(admin)
        
        try:
            ann = Announcement(
                title="Test",
                message="Msg",
                priority=PriorityEnum("normal"),
                pinned=False,
                active=True,
                created_by=admin.id
            )
            db.session.add(ann)
            _log_activity("Announcement Created", "Created announcement: Test")
            db.session.commit()
            print("SUCCESS!")
        except Exception as e:
            print("EXCEPTION CAUGHT!")
            traceback.print_exc()
