
import requests

def test_add_faculty():
    session = requests.Session()
    
    # 1. Login as admin
    login_url = 'http://127.0.0.1:5000/api/auth/login'
    login_data = {'identifier': 'admin', 'password': 'admin'}
    res = session.post(login_url, json=login_data)
    print("Login status:", res.status_code)
    
    # 2. Try to add faculty
    faculty_url = 'http://127.0.0.1:5000/api/faculty/'
    faculty_payload = {
        "emp_id": "TEST_EMP_99",
        "full_name": "Test Emp",
        "dept": "B.Com",
        "designation": "Professor",
        "email": "test99@test.com",
        "password": "TEST_EMP_99@123"
    }
    
    print("\nSending payload:", faculty_payload)
    res = session.post(faculty_url, json=faculty_payload)
    
    print("Add Faculty status:", res.status_code)
    try:
        print("Response JSON:", res.json())
    except:
        print("Response Text:", res.text)

if __name__ == "__main__":
    test_add_faculty()
