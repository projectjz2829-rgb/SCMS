import subprocess
import sys
import os

try:
    print(f"CWD: {os.getcwd()}")
    print("Running flask db upgrade (to ensure up to date)...")
    res1 = subprocess.run(["python", "-m", "flask", "db", "upgrade"], capture_output=True, text=True)
    print("upgrade stdout:", res1.stdout)
    print("upgrade stderr:", res1.stderr)
except Exception as e:
    print("Error:", e)
