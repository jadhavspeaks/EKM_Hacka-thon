#!/bin/bash
# ============================================================
#  EKM Full Stack Starter — Linux / macOS
#  Launches backend + frontend in parallel
#  Place this file in project root
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make individual scripts executable
chmod +x "$SCRIPT_DIR/start-backend.sh"
chmod +x "$SCRIPT_DIR/start-frontend.sh"

echo "[EKM] Launching EKM stack..."
echo ""

# ── Try to open in new terminal tabs/windows ─────────────────
# Detect terminal emulator available
if command -v gnome-terminal &>/dev/null; then
    gnome-terminal --tab --title="EKM Backend" -- bash -c "$SCRIPT_DIR/start-backend.sh; exec bash"
    sleep 3
    gnome-terminal --tab --title="EKM Frontend" -- bash -c "$SCRIPT_DIR/start-frontend.sh; exec bash"

elif command -v xterm &>/dev/null; then
    xterm -title "EKM Backend"  -e "$SCRIPT_DIR/start-backend.sh" &
    sleep 3
    xterm -title "EKM Frontend" -e "$SCRIPT_DIR/start-frontend.sh" &

elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS — open two Terminal tabs
    osascript -e "tell application \"Terminal\" to do script \"$SCRIPT_DIR/start-backend.sh\""
    sleep 3
    osascript -e "tell application \"Terminal\" to do script \"$SCRIPT_DIR/start-frontend.sh\""

else
    # Fallback — run both in background with logs to files
    echo "[EKM] No GUI terminal detected — running in background."
    echo "[EKM] Logs: backend.log | frontend.log"
    echo ""
    bash "$SCRIPT_DIR/start-backend.sh"  > "$SCRIPT_DIR/backend.log"  2>&1 &
    BACKEND_PID=$!
    sleep 3
    bash "$SCRIPT_DIR/start-frontend.sh" > "$SCRIPT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!

    echo "[EKM] Backend  PID: $BACKEND_PID  → http://localhost:8000"
    echo "[EKM] Frontend PID: $FRONTEND_PID → http://localhost:3000"
    echo ""
    echo "[EKM] To stop both:  kill $BACKEND_PID $FRONTEND_PID"
    echo "[EKM] To view logs:  tail -f backend.log  |  tail -f frontend.log"
    wait
fi

echo ""
echo "[EKM] Backend  → http://localhost:8000"
echo "[EKM] Frontend → http://localhost:3000"
