from app import create_app
from app.api.validators import validate_payload

app = create_app()

schema = {
    "email": {"type": str, "required": True, "max_length": 120, "regex": r"^[^@]+@[^@]+\.[^@]+$"},
    "password": {"type": str, "required": True, "min_length": 6},
    "emp_id": {"type": str, "required": True, "max_length": 20},
    "full_name": {"type": str, "required": True, "max_length": 100},
    "dept": {"type": str, "required": True, "max_length": 50},
    "designation": {"type": str, "required": True, "max_length": 50},
    "phone": {"type": str, "required": False, "min_length": 7, "max_length": 15, "regex": r"^[0-9+\-\s]+$"}
}

# The Faculty.tsx form initial state for NEW faculty
form_state = {
    "dept": "B.Com",
    "designation": "Professor",
}
# User fills these in
form_state["emp_id"] = "EMP001"
form_state["full_name"] = "Test Faculty"
form_state["email"] = "test@test.com"
form_state["phone"] = "9876543210"

# handleSave spreads form and adds password
payload = {**form_state, "password": form_state.get("emp_id", "") + "@123"}
print("Payload sent:", list(payload.keys()))

with app.app_context():
    cleaned, err = validate_payload(payload, schema)
    if err:
        print("ERROR:", err.get_json())
    else:
        print("Validation OK")

# What about phone with min_length issue - phone is 10 chars - should be fine
# Test with phone that's too short
payload_short_phone = {**payload, "phone": "123"}
print("\n--- Short phone (< 7 chars) ---")
with app.app_context():
    cleaned, err = validate_payload(payload_short_phone, schema)
    if err:
        print("ERROR:", err.get_json())
    else:
        print("OK")

# Test with designation that has max_length 50
payload_long_desig = {**payload, "designation": "A" * 51}
print("\n--- Designation too long ---")
with app.app_context():
    cleaned, err = validate_payload(payload_long_desig, schema)
    if err:
        print("ERROR:", err.get_json())
    else:
        print("OK")

# Test with dept that's > 50 chars
payload_long_dept = {**payload, "dept": "D" * 51}
print("\n--- Dept > 50 chars ---")
with app.app_context():
    cleaned, err = validate_payload(payload_long_dept, schema)
    if err:
        print("ERROR:", err.get_json())
    else:
        print("OK")
        
# Simulate empty email (user didn't fill it)
payload_no_email = {k:v for k,v in payload.items() if k != "email"}
print("\n--- Missing required email ---")
with app.app_context():
    cleaned, err = validate_payload(payload_no_email, schema)
    if err:
        print("ERROR:", err.get_json())
    else:
        print("OK")
