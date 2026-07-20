# SCMS Production Deployment Guide

## 1. Backend Server (Gunicorn + Nginx)

In production, do not use the built-in Flask development server. Use a WSGI HTTP Server like Gunicorn.

```bash
pip install gunicorn
gunicorn --workers 4 --bind 0.0.0.0:5000 wsgi:app
```

### Environment Config
Set the following environment variables on your production host:
- `FLASK_ENV=production`
- `SECRET_KEY=<very-secure-random-string>`
- `DATABASE_URL=postgresql://user:password@localhost/scms`

## 2. Frontend Assets (Vite Build)

Compile the React application into static files.
```bash
cd frontend
npm run build
```
This generates a `dist/` directory containing your optimized HTML, CSS, and JS.

## 3. Nginx Reverse Proxy Config

Use Nginx to serve the static frontend and proxy API requests to Gunicorn.

```nginx
server {
    listen 80;
    server_name my-campus.edu;

    location / {
        root /path/to/SCMS-main/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
    }
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```
