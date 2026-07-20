import requests

def test_methods():
    session = requests.Session()
    # Test POST to an ID route which only accepts GET, PUT, DELETE
    res = session.post('http://127.0.0.1:5000/api/faculty/1', json={'emp_id': 'EMPZ'})
    print('POST /api/faculty/1 ->', res.status_code)

if __name__ == '__main__':
    test_methods()
