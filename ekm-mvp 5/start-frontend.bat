@echo off
:: ============================================================
::  EKM Frontend Starter — Windows
::  Requires Node.js + npm (always independent of Python/conda)
::  Place this file in project root (next to /frontend)
:: ============================================================

cd /d "%~dp0frontend"

:: ── Check Node / npm ─────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [EKM] ERROR: npm not found.
    echo [EKM] Please install Node.js from https://nodejs.org and re-run.
    pause
    exit /b 1
)

:: ── Install dependencies if node_modules missing ─────────────
if not exist "node_modules" (
    echo [EKM] node_modules not found — running npm install...
    npm install
)

echo.
echo [EKM] Starting frontend on http://localhost:3000
echo [EKM] Press Ctrl+C to stop
echo.
npm run dev
