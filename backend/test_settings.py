import requests

def test_settings():
    session = requests.Session()
    login_url = 'http://127.0.0.1:5000/api/auth/login'
    res = session.post(login_url, json={'identifier': 'admin', 'password': 'admin'})
    
    # get csrf token
    csrf_token = res.cookies.get('csrf_token')
    
    # put settings
    res = session.put(
        'http://127.0.0.1:5000/api/settings/', 
        json={'id': 1, 'theme': 'dark'},
        headers={'X-CSRFToken': csrf_token}
    )
    print(res.status_code)
    try:
        print(res.json())
    except:
        print(res.text[:100])

if __name__ == '__main__':
    test_settings()
