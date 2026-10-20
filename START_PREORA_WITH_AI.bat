@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\START_PREORA.ps1" %*
if errorlevel 1 (
 echo.
 echo Startup reported errors. Read the messages above and tmp\startup logs.
 pause
 exit /b 1
)
