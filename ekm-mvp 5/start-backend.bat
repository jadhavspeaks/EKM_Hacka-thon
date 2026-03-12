@echo off
:: ============================================================
::  EKM Backend Starter — Windows
::  Works with: Conda OR system Python (auto-detected)
::  Place this file in project root (next to /backend)
:: ============================================================

cd /d "%~dp0backend"

:: ── Check if conda is available ──────────────────────────────
where conda >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [EKM] Conda detected — activating environment 'ekm'...
    call conda activate ekm 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [EKM] WARNING: Could not activate 'ekm' env — falling back to base conda
    )
    goto RUN
)

:: ── Conda not found — use system Python ──────────────────────
echo [EKM] Conda not found — using system Python...
where uvicorn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [EKM] uvicorn not found — installing requirements...
    pip install -r requirements.txt
)

:RUN
echo.
echo [EKM] Starting backend on http://localhost:8000
echo [EKM] Press Ctrl+C to stop
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
