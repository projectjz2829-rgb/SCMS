"""
tests/conftest.py
Shared pytest configuration — adds the project root to sys.path so that
`from app import ...` imports work correctly when running pytest from
the campus_mgmt/ directory.
"""
import sys
import os

# Ensure the campus_mgmt package root is on the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
