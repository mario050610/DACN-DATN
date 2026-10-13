@echo off
setlocal
cd /d "%~dp0..\ai-service"
if not exist ".venv\Scripts\python.exe" (
 py -3 -m venv .venv
 if errorlevel 1 (echo Python 3.11+ required. & pause & exit /b 1)
 ".venv\Scripts\python.exe" -m pip install -r requirements.txt
 if errorlevel 1 (pause & exit /b 1)
)
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8001
if errorlevel 1 pause
