@echo off
setlocal
cd /d "%~dp0"
if not exist "ai-service\.venv\Scripts\python.exe" (
 py -3 -m venv ai-service\.venv
 if errorlevel 1 exit /b 1
)
"ai-service\.venv\Scripts\python.exe" -m pip install -r ai-service\training\requirements.txt
if errorlevel 1 (pause & exit /b 1)
"ai-service\.venv\Scripts\python.exe" -u -X utf8 ai-service\training\train.py %*
if errorlevel 1 (pause & exit /b 1)
echo Models and reports saved in ai-service.
pause
