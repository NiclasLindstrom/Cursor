@echo off
REM FastAPI Backend Startup Script for Windows
REM ==========================================

echo.
echo ========================================
echo  FastAPI Inventory Management
echo  Starting Backend Server...
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo [!] Virtual environment not found!
    echo [*] Creating virtual environment...
    python -m venv venv
    echo [+] Virtual environment created
    echo.
)

REM Activate virtual environment
echo [*] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [!] Dependencies not found!
    echo [*] Installing dependencies...
    pip install -r backend\requirements.txt
    echo [+] Dependencies installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo [!] WARNING: .env file not found!
    echo [*] Please create .env file with your configuration
    echo [*] See .env.example for reference
    echo.
    pause
    exit /b 1
)

REM Start the server
echo [*] Starting FastAPI server...
echo.
echo ========================================
echo  Server Information
echo ========================================
echo  - API: http://localhost:8000
echo  - Swagger UI: http://localhost:8000/docs
echo  - ReDoc: http://localhost:8000/redoc
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn backend.main:app --reload --port 8000

REM If server stops
echo.
echo [*] Server stopped
pause

