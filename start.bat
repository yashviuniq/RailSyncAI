@echo off
REM Railway Maintenance Orchestrator - start backend + frontend
echo Starting Backend (FastAPI)...
start "orchestrator-backend" cmd /k "cd /d %~dp0backend && python run.py"
timeout /t 5 /nobreak >nul
echo Starting Frontend (Vite)...
start "orchestrator-frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Backend : http://127.0.0.1:8000  (docs /docs)
echo Frontend: http://localhost:5173
