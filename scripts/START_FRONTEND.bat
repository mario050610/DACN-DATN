@echo off
setlocal
cd /d "%~dp0..\frontend"
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js not found. Install Node.js 22.12+ from https://nodejs.org/
 pause
 exit /b 1
)
if not exist "node_modules" (
 echo Installing frontend dependencies - first run requires Internet...
 call npm install
 if errorlevel 1 (pause & exit /b 1)
)
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
if errorlevel 1 pause
