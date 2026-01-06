#!/bin/bash
# FastAPI Backend Startup Script for Linux
# =========================================

echo ""
echo "========================================"
echo "  FastAPI Inventory Management"
echo "  Starting Backend Server..."
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "[!] Virtual environment not found!"
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
    echo "[+] Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "[*] Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
python -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[!] Dependencies not found!"
    echo "[*] Installing dependencies..."
    pip install -r backend/requirements.txt
    echo "[+] Dependencies installed"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "[!] WARNING: .env file not found!"
    echo "[*] Please create .env file with your configuration"
    echo "[*] You can copy from .env.example"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Start the server
echo "[*] Starting FastAPI server..."
echo ""
echo "========================================"
echo "  Server Information"
echo "========================================"
echo "  - API: http://localhost:8000"
echo "  - Swagger UI: http://localhost:8000/docs"
echo "  - ReDoc: http://localhost:8000/redoc"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# For development
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# If server stops
echo ""
echo "[*] Server stopped"

