#!/bin/bash
# ============================================================
#  EKM Backend Starter — Linux / macOS
#  Works with: Conda OR system Python (auto-detected)
#  Place this file in project root (next to /backend)
# ============================================================

# Navigate to backend relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

# ── Detect Python command (python3 preferred) ─────────────────
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "[EKM] ERROR: No Python found. Please install Python 3.8+."
    exit 1
fi

# ── Try Conda first ───────────────────────────────────────────
CONDA_ACTIVATED=false
if command -v conda &>/dev/null; then
    echo "[EKM] Conda detected — activating environment 'ekm'..."
    # Source conda init so activation works in non-interactive shells
    CONDA_BASE=$(conda info --base 2>/dev/null)
    if [ -f "$CONDA_BASE/etc/profile.d/conda.sh" ]; then
        source "$CONDA_BASE/etc/profile.d/conda.sh"
        conda activate ekm 2>/dev/null && CONDA_ACTIVATED=true
    fi
    if [ "$CONDA_ACTIVATED" = false ]; then
        echo "[EKM] WARNING: Could not activate 'ekm' env — falling back to system Python"
    fi
fi

# ── If conda not available, check/install deps ────────────────
if [ "$CONDA_ACTIVATED" = false ]; then
    echo "[EKM] Using system Python ($PYTHON_CMD)..."
    if ! $PYTHON_CMD -m uvicorn --version &>/dev/null; then
        echo "[EKM] uvicorn not found — installing requirements..."
        # Try pip3 then pip, with --user fallback for permission errors
        if command -v pip3 &>/dev/null; then
            pip3 install -r requirements.txt 2>/dev/null || \
            pip3 install -r requirements.txt --user 2>/dev/null || \
            pip3 install -r requirements.txt --break-system-packages
        else
            pip install -r requirements.txt 2>/dev/null || \
            pip install -r requirements.txt --user 2>/dev/null || \
            pip install -r requirements.txt --break-system-packages
        fi
    fi
fi

echo ""
echo "[EKM] Starting backend on http://localhost:8000"
echo "[EKM] Press Ctrl+C to stop"
echo ""

$PYTHON_CMD -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
