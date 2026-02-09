#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Starting Reels Subtitle Generator..."

# Free up ports in case other apps are using them
echo "🔄 Freeing ports 8000 and 5173..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# ==========================================
# 1. Setup Backend
# ==========================================
echo "📦 Checking Backend..."
cd backend

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing dependencies..."
pip install -r requirements.txt

# Start Backend in background
echo "Running Backend Server..."
./venv/bin/python3 main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

cd ..

# ==========================================
# 2. Setup Frontend
# ==========================================
echo "📦 Checking Frontend..."
cd frontend

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start Frontend in background
echo "Running Frontend Server..."
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

cd ..

# ==========================================
# 3. Launch
# ==========================================
echo "⏳ Waiting for servers to initialize..."
sleep 5
echo "🌍 Opening Browser..."
open "http://localhost:5173"

echo "✅ App is running!"
echo "📝 Logs are being written to backend.log and frontend.log"
echo "❌ PRESS CTRL+C TO STOP THE APP AND CLOSE SERVERS"

# Function to kill processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup INT

# Keep script running
wait
