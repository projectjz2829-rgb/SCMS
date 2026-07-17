from flask import jsonify

def success_response(data=None, message="Success", status_code=200):
    """
    Standardize successful API responses.
    """
    payload = {
        "success": True,
        "message": message
    }
    if data is not None:
        payload["data"] = data
        
    return jsonify(payload), status_code


def error_response(message="An error occurred", errors=None, status_code=400):
    """
    Standardize error API responses.
    """
    payload = {
        "success": False,
        "message": message
    }
    if errors:
        payload["errors"] = errors
        
    return jsonify(payload), status_code


from functools import wraps
from flask import current_app
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db

def handle_api_exceptions(f):
    """
    Decorator to wrap API endpoints with standard exception handling.
    Catches unexpected server errors, logs them with stack traces,
    rolls back failed transactions, and returns a safe JSON response.
    Preserves HTTPExceptions for normal Flask routing.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except HTTPException as e:
            # Let Flask's standard error handlers deal with abort() calls
            raise e
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.exception(f"Database error in {f.__name__}: {str(e)}")
            return error_response("A database error occurred. Please try again later.", status_code=500)
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Unexpected error in {f.__name__}: {str(e)}")
            return error_response("An unexpected server error occurred. Please try again later.", status_code=500)
    return decorated_function
