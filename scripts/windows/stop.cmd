@echo off
rem Travel App: stop everything. Options: -KeepEmulator  -KeepDocker
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
pause
