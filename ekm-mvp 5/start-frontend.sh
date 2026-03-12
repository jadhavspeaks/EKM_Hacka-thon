#!/bin/bash
# ============================================================
#  EKM Frontend Starter — Linux / macOS
#  Requires Node.js + npm (independent of Python/conda)
#  Place this file in project root (next to /frontend)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"

# ── Check npm ────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
    echo "[EKM] ERROR: npm not found."
    echo "[EKM] Install Node.js: https://nodejs.org  or  sudo apt install nodejs npm"
    exit 1
fi

# ── Install dependencies if missing ──────────────────────────
if [ ! -d "node_modules" ]; then
    echo "[EKM] node_modules not found — running npm install..."
    npm install
fi

echo ""
echo "[EKM] Starting frontend on http://localhost:3000"
echo "[EKM] Press Ctrl+C to stop"
echo ""

npm run dev
