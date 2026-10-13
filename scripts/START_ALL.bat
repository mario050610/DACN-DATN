@echo off
cd /d "%~dp0.."
echo Starting PREORA Frontend, Backend and AI scaffold in separate windows.
start "PREORA Frontend" cmd /k call "%~dp0START_FRONTEND.bat"
start "PREORA Backend" cmd /k call "%~dp0START_BACKEND.bat"
start "PREORA AI" cmd /k call "%~dp0START_AI.bat"
echo.
echo Frontend: http://localhost:5173
 echo Backend docs: http://127.0.0.1:8000/docs
 echo AI docs: http://127.0.0.1:8001/docs
 echo PostgreSQL is optional: docker compose up -d db
pause
