# SCMS Installation Guide

## 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**
- **PostgreSQL** (Optional, SQLite works out of the box for dev)

## 2. Backend Setup
Navigate into the backend directory.
```bash
cd backend
```

Create a virtual environment and activate it.
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows
```

Install dependencies.
```bash
pip install -r requirements.txt
```

Initialize the database.
```bash
flask db upgrade
```

Run the backend server.
```bash
flask run
# OR
python run.py
```

## 3. Frontend Setup
Open a new terminal and navigate to the frontend directory.
```bash
cd frontend
```

Install the node modules.
```bash
npm install
```

Start the Vite development server.
```bash
npm run dev
```

## 4. Environment Variables
Create `.env` inside `backend/` and `frontend/` using the `.env.example` templates if they exist. Ensure `VITE_API_BASE_URL` in the frontend is pointing to your backend address.
