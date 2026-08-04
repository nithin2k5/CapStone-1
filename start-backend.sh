#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${SCRIPT_DIR}/server"

echo "==============================================="
echo " ⚙️  Starting Secure Email Gateway Backend..."
echo "==============================================="

cd "${SERVER_DIR}"

# Check and activate virtual environment
if [ ! -d ".venv" ]; then
    echo "⚠️  Virtual environment not found in server/. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Initialize database tables
echo "🔧 Checking MySQL connection and initializing schema..."
python3 -c "import asyncio; from app.database.database import init_db; asyncio.run(init_db())" || {
    echo "❌ Database initialization failed. Please verify MySQL is running on port 3306 and database 'seg_db' exists for root@localhost."
    exit 1
}

echo "✅ Database ready!"
echo "🚀 Starting Uvicorn Dev Server on http://localhost:8000..."
echo "📖 API Swagger Docs: http://localhost:8000/docs"
echo "==============================================="

exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
