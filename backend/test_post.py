from app import create_app
from app.extensions import db
from app.models.user import User
import os

os.environ['FLASK_ENV'] = 'development'
app = create_app('development')
app.config['WTF_CSRF_ENABLED'] = False
app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test_key'

with app.app_context():
    db.create_all()
    # Create fake admin
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User(id=999, email='admin@test.com', password_hash='foo', role='admin')
        db.session.add(admin)
        db.session.commit()
        
    client = app.test_client()
    with client.session_transaction() as sess:
        sess['_user_id'] = str(admin.id)
        sess['_fresh'] = True
    
    res = client.post('/api/announcements/', json={
        'title': 'Test',
        'message': 'Msg',
        'priority': 'normal'
    })
    print('STATUS:', res.status_code)
    print('RESPONSE:', res.get_data(as_text=True))


