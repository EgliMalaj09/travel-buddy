@echo off
rem Travel App: start everything (Docker DB, migrations, API, Android emulator, Expo).
rem Double-click this file, or run it from any terminal. Options: -Avd ^<name^>  -NoEmulator  -Rebuild
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
pause
