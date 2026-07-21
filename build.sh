#!/bin/bash
set -e

echo "==> Building Frontend..."
cd frontend
# Use npm ci for reproducible CI builds (requires package-lock.json)
npm ci --no-audit --prefer-offline 2>/dev/null || npm install --no-audit
npm run build
cd ..

echo "==> Installing Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo "==> Build Complete! dist/index.html ready for Flask."
