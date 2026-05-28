@echo off
echo ========================================
echo  TestGen AI - Startup
echo ========================================
echo.

REM ── Set your MongoDB Atlas URI here ──────
set MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/testgen?retryWrites=true^&w=majority

REM ── Set Ollama model ──────────────────────
set OLLAMA_MODEL=mistral

echo [1/3] Starting Ollama...
start "Ollama" cmd /k "ollama serve"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend...
start "Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ========================================
echo  Open http://localhost:3000
echo ========================================
echo.
echo IMPORTANT: Edit start.bat and replace:
echo   YOUR_USER     - your Atlas username
echo   YOUR_PASSWORD - your Atlas password
echo   YOUR_CLUSTER  - your Atlas cluster hostname
echo.
pause
