#!/usr/bin/env bash
set -eo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
HOST="127.0.0.1"
URL="http://${HOST}:${PORT}"

export NODE_ENV=production
export PORT="${PORT}"
export OPENCODE_EMBEDDED_AUTOSTART="${OPENCODE_EMBEDDED_AUTOSTART:-1}"
export PRESENTON_EMBEDDED_PROVIDER_CONFIGURED="${PRESENTON_EMBEDDED_PROVIDER_CONFIGURED:-1}"
export PRESENTON_EMBEDDED_GENERATION_ENABLED="${PRESENTON_EMBEDDED_GENERATION_ENABLED:-1}"
export PRESENTON_EMBEDDED_ENDPOINT="${PRESENTON_EMBEDDED_ENDPOINT:-http://127.0.0.1:8123}"

# Generate local secret if none is set
if [ -z "${JWT_SECRET:-}" ]; then
  if [ -f "${HOME}/.config/osamah-ide/secret" ]; then
    export JWT_SECRET="$(cat "${HOME}/.config/osamah-ide/secret")"
  else
    mkdir -p "${HOME}/.config/osamah-ide"
    NEW_SECRET="$(head -c 32 /dev/urandom | base64)"
    echo "${NEW_SECRET}" > "${HOME}/.config/osamah-ide/secret"
    chmod 600 "${HOME}/.config/osamah-ide/secret"
    export JWT_SECRET="${NEW_SECRET}"
  fi
fi

cd "${APP_DIR}"

# Start Presenton lightweight bridge if python3 is available
if command -v python3 >/dev/null 2>&1 && [ -f "${APP_DIR}/mini_presenton.py" ]; then
  python3 -m uvicorn mini_presenton:app --host 127.0.0.1 --port 8123 >/dev/null 2>&1 &
  PRESENTON_PID=$!
fi

# Start Osamah IDE server
node dist/index.js &
SERVER_PID=$!

cleanup() {
  echo "Stopping Osamah IDE..."
  kill -TERM "$SERVER_PID" 2>/dev/null || true
  if [ -n "${PRESENTON_PID:-}" ]; then
    kill -TERM "$PRESENTON_PID" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Wait for server to start listening
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s "http://${HOST}:${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
  ATTEMPT=$((ATTEMPT + 1))
done

# Launch browser in standalone desktop app window mode
launch_browser() {
  if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="${URL}" --class="OsamahIDE" "$@" >/dev/null 2>&1 &
  elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --app="${URL}" --class="OsamahIDE" "$@" >/dev/null 2>&1 &
  elif command -v chromium >/dev/null 2>&1; then
    chromium --app="${URL}" --class="OsamahIDE" "$@" >/dev/null 2>&1 &
  elif command -v brave-browser >/dev/null 2>&1; then
    brave-browser --app="${URL}" --class="OsamahIDE" "$@" >/dev/null 2>&1 &
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}" >/dev/null 2>&1 &
  else
    echo "Osamah IDE is running at ${URL}"
  fi
}

launch_browser "$@"

# Wait for server process
wait "$SERVER_PID"
