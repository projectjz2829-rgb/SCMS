import sqlite3
import os

conn = sqlite3.connect('instance/campus_dev.db')
conn.execute('DROP TABLE IF EXISTS user_settings')
conn.execute('DROP TABLE IF EXISTS announcement_reads')
conn.commit()

os.environ['FLASK_APP'] = 'run.py'
os.system('python -m flask db migrate -m "Add settings and announcement_reads tables"')
