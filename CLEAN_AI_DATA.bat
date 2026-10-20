@echo off
cd /d "%~dp0"
if not exist "ai-service\.venv\Scripts\python.exe" (
  echo Missing AI Python environment. Run START_PREORA_WITH_AI.bat first.
  pause
  exit /b 1
)
"ai-service\.venv\Scripts\python.exe" -X utf8 "ai-service\training\clean_data.py"
if errorlevel 1 (
  echo Cleaning failed. See error above.
) else (
  echo Done: ai-service\data\processed\cleaned\cleaning_report.json
)
pause
