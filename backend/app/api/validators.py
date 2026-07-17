import re
from app.api.responses import error_response

def validate_payload(data, schema):
    """
    Validates a JSON payload against a schema.
    Returns: (cleaned_data, error_response)
    If error_response is None, validation passed and cleaned_data has the stripped/validated values.
    """
    if not isinstance(data, dict):
        return None, error_response("Payload must be a JSON object.")

    cleaned_data = {}
    
    # Check for unexpected fields
    unexpected = [k for k in data.keys() if k not in schema]
    if unexpected:
        return None, error_response(f"Unexpected fields provided: {', '.join(unexpected)}")
        
    for field, rules in schema.items():
        is_required = rules.get("required", False)
        val = data.get(field)
        
        # Handle missing/null
        if val is None or (isinstance(val, str) and not val.strip()):
            if is_required:
                return None, error_response(f"Missing required field: {field}")
            continue
            
        # Strip strings
        if isinstance(val, str):
            val = val.strip()
            
        # Type check
        expected_type = rules.get("type")
        if expected_type:
            if expected_type == int:
                try:
                    val = int(val)
                except (ValueError, TypeError):
                    return None, error_response(f"{field} must be an integer.")
            elif expected_type == str:
                if not isinstance(val, str):
                    return None, error_response(f"{field} must be a string.")
            elif expected_type == list:
                if not isinstance(val, list):
                    return None, error_response(f"{field} must be a list.")
            elif expected_type == dict:
                if not isinstance(val, dict):
                    return None, error_response(f"{field} must be a JSON object.")

        # String length
        if isinstance(val, str):
            min_len = rules.get("min_length")
            max_len = rules.get("max_length")
            if min_len is not None and len(val) < min_len:
                return None, error_response(f"{field} must be at least {min_len} characters long.")
            if max_len is not None and len(val) > max_len:
                return None, error_response(f"{field} cannot exceed {max_len} characters.")
            
            # Regex
            regex = rules.get("regex")
            if regex and not re.match(regex, val):
                return None, error_response(f"{field} format is invalid.")
                
        # Integer limits
        if isinstance(val, int):
            min_val = rules.get("min_val")
            max_val = rules.get("max_val")
            if min_val is not None and val < min_val:
                return None, error_response(f"{field} must be at least {min_val}.")
            if max_val is not None and val > max_val:
                return None, error_response(f"{field} must be at most {max_val}.")

        # Allowed values
        allowed = rules.get("allowed_values")
        if allowed is not None and val not in allowed:
            return None, error_response(f"{field} must be one of: {', '.join(map(str, allowed))}")
            
        # Nested list schema
        list_schema = rules.get("list_item_schema")
        if isinstance(val, list) and list_schema:
            cleaned_list = []
            for item in val:
                c_item, err = validate_payload(item, list_schema)
                if err:
                    return None, err
                cleaned_list.append(c_item)
            val = cleaned_list

        cleaned_data[field] = val

    return cleaned_data, None
