@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\SEED_DATABASE.ps1"
pause
