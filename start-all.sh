#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " 🚀 Starting Secure Email Gateway (Backend + Frontend)   "
echo "=========================================================="

# Ensure child background processes terminate when script exits or Ctrl+C is pressed
trap "echo -e '\n🛑 Stopping all servers...'; kill -TERM -$$ 2>/dev/null || true; exit 0" SIGINT SIGTERM EXIT

echo "▶ [1/2] Booting FastAPI Backend on port 8000..."
cd "${SCRIPT_DIR}/server"
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "▶ [2/2] Booting Next.js Frontend on port 3000..."
cd "${SCRIPT_DIR}/client"
npm run dev &
FRONTEND_PID=$!

echo "=========================================================="
echo " ✅ Dev environment is live!"
echo " 🌐 Frontend Web App:  http://localhost:3000"
echo " ⚙️  Backend API Docs:  http://localhost:8000/docs"
echo " 🛑 Press Ctrl+C at any time to stop both servers"
echo "=========================================================="

# Keep script running and wait for background processes
wait $BACKEND_PID $FRONTEND_PID
