#!/usr/bin/env bash
# Run a test container for opsmind-all-in-one image
set -euo pipefail

IMAGE_TAG="opsmind-web:latest"
CONTAINER_NAME="opsmind-web"

HOST_PORT=8080
BACKEND_URL="http://10.1.40.228:18080"

# Optional Dify runtime configs (frontend chatbot)
DIFY_URL="https://udify.app"
DIFY_TOKEN="XgS0QGbC9sAzEHlT"
# DIFY_TOKEN="tRnUImvfrP77TFr0"
REPLACE_EXISTING="true"

usage() {
  cat <<'USAGE'
Usage: scripts/ops-run-test.sh [-h|--help]

This script starts a local test container with fixed defaults.
Edit this script to adjust IMAGE_TAG, HOST_PORT, BACKEND_URL, DIFY_URL, DIFY_TOKEN.

Example (what this script effectively runs):
  docker run -d \
    --name opsmind-web \
    -p 8080:80 \
    -e BACKEND_URL=http://10.1.40.112:80 \
    -e DIFY_APP=https://udify.app/chatbot \
    -e DIFY_TOKEN=tRnUImvfrP77TFr0 \
    opsmind-web:latest
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage; exit 0
fi
if [[ $# -gt 0 ]]; then
  echo "Unknown argument(s): $*" >&2
  usage; exit 1
fi

# Always replace existing container with the default name for simplicity
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[run] Removing existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

echo "[run] Image:    $IMAGE_TAG"
echo "[run] Port:     ${HOST_PORT} -> 80"
echo "[run] Backend:  ${BACKEND_URL}"
if [[ -n "$DIFY_URL" ]]; then echo "[run] Dify URL: ${DIFY_URL}"; fi
if [[ -n "$DIFY_TOKEN" ]]; then echo "[run] Dify Token: (set)"; fi

# Build and echo the final docker run command, then execute it
RUN_CMD="docker run -d --name \"$CONTAINER_NAME\" -p \"${HOST_PORT}:80\" -e BACKEND_URL=\"$BACKEND_URL\""
if [[ -n "$DIFY_URL" ]]; then RUN_CMD+=" -e DIFY_APP=\"$DIFY_URL\""; fi
if [[ -n "$DIFY_TOKEN" ]]; then RUN_CMD+=" -e DIFY_TOKEN=\"$DIFY_TOKEN\""; fi
RUN_CMD+=" \"$IMAGE_TAG\""

echo "[run] Exec: $RUN_CMD"
eval "$RUN_CMD"

echo "[run] Started. Open http://localhost:${HOST_PORT}/ops/#/login"
