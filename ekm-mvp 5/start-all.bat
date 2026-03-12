@echo off
:: ============================================================
::  EKM Full Stack Starter — Windows
::  Launches backend + frontend in separate terminal windows
::  Place this file in project root
:: ============================================================

echo [EKM] Launching EKM backend and frontend...
echo.

:: Launch backend in a new window
start "EKM Backend :8000" cmd /k "%~dp0start-backend.bat"

:: Small delay so backend gets a head start
timeout /t 3 /nobreak >nul

:: Launch frontend in a new window
start "EKM Frontend :3000" cmd /k "%~dp0start-frontend.bat"

echo [EKM] Both services launching in separate windows.
echo [EKM] Backend  → http://localhost:8000
echo [EKM] Frontend → http://localhost:3000
echo.
pause
