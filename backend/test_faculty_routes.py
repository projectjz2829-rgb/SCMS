import requests

def test_methods():
    session = requests.Session()
    
    # 1. Login as admin
    login_url = 'http://127.0.0.1:5000/api/auth/login'
    login_data = {'identifier': 'admin', 'password': 'admin'}
    res = session.post(login_url, json=login_data)
    print('Login:', res.status_code)
    
    # Test trailing slash
    res = session.post('http://127.0.0.1:5000/api/faculty/', json={'emp_id': 'EMPX'})
    print('POST /api/faculty/ ->', res.status_code)
    try:
        print(res.json())
    except:
        print(res.text[:100])
    
    # Test no trailing slash
    res = session.post('http://127.0.0.1:5000/api/faculty', json={'emp_id': 'EMPY'})
    print('POST /api/faculty ->', res.status_code)

    # Test update
    res = session.post('http://127.0.0.1:5000/api/faculty/1', json={'emp_id': 'EMPZ'})
    print('POST /api/faculty/1 ->', res.status_code)
    try:
        print(res.json())
    except:
        print(res.text[:100])

if __name__ == '__main__':
    test_methods()
