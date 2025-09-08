#!/usr/bin/env bash
# Run a test container for opsmind-all-in-one image
set -euo pipefail

IMAGE_TAG="opsmind-web:latest"
CONTAINER_NAME="opsmind-web"

HOST_PORT=8080
BACKEND_URL="http://10.1.40.228:18080"

# Optional Dify runtime configs (frontend chatbot)
# Keep defaults aligned with public/runtime-config.js where possible
DIFY_BASE_URL="http://10.1.40.228:18081"
DIFY_TOKEN="CqLqxTQL8FeNqAqK"
# Example alt token:
# DIFY_TOKEN="tRnUImvfrP77TFr0"

# Extra env overrides passed via command line: -e KEY=VALUE
ENV_OVERRIDES=()

REPLACE_EXISTING="true"

usage() {
  cat <<'USAGE'
Usage: scripts/ops-run-test.sh [-h|--help] [-e KEY=VALUE ...]

This script starts a local test container with fixed defaults.
Edit this script to adjust IMAGE_TAG, HOST_PORT, BACKEND_URL, DIFY_BASE_URL, DIFY_TOKEN.
You can override runtime envs via repeated -e flags.

Example (what this script effectively runs):
  docker run -d \
    --name opsmind-web \
    -p 8080:80 \
    -e BACKEND_URL=http://10.1.40.112:80 \
    -e DIFY_BASE_URL=https://udify.app \
    -e DIFY_TOKEN=tRnUImvfrP77TFr0 \
    opsmind-web:latest
 
Overrides:
  -e BACKEND_URL=...      Backend base URL (schema+host[:port])
  -e DIFY_TOKEN=...       Dify API token
  -e DIFY_BASE_URL=...    Dify API base URL
USAGE
}

# Parse args (only -e/--env and -h supported)
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage; exit 0 ;;
    -e|--env)
      if [[ $# -lt 2 ]]; then
        echo "-e requires KEY=VALUE" >&2; usage; exit 1
      fi
      if [[ "$2" != *=* ]]; then
        echo "Invalid -e argument (expect KEY=VALUE): $2" >&2; usage; exit 1
      fi
      ENV_OVERRIDES+=("$2")
      shift; shift ;;
    *)
      echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

# Always replace existing container with the default name for simplicity
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[run] Removing existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

echo "[run] Image:    $IMAGE_TAG"
echo "[run] Port:     ${HOST_PORT} -> 80"
echo "[run] Backend:  ${BACKEND_URL}"
if [[ -n "$DIFY_BASE_URL" ]]; then echo "[run] Dify Base: ${DIFY_BASE_URL}"; fi
if [[ -n "$DIFY_TOKEN" ]]; then echo "[run] Dify Token: (set)"; fi
for kv in "${ENV_OVERRIDES[@]:-}"; do
  [[ -n "$kv" ]] && echo "[run] Override:  -e $kv"
done

# Build and echo the final docker run command, then execute it
RUN_CMD="docker run -d --name \"$CONTAINER_NAME\" -p \"${HOST_PORT}:80\" -e BACKEND_URL=\"$BACKEND_URL\""
if [[ -n "$DIFY_BASE_URL" ]]; then RUN_CMD+=" -e DIFY_BASE_URL=\"$DIFY_BASE_URL\""; fi
if [[ -n "$DIFY_TOKEN" ]]; then RUN_CMD+=" -e DIFY_TOKEN=\"$DIFY_TOKEN\""; fi
# Append user overrides last so they win if duplicate keys are provided
for kv in "${ENV_OVERRIDES[@]:-}"; do
  [[ -n "$kv" ]] && RUN_CMD+=" -e \"$kv\""
done
RUN_CMD+=" \"$IMAGE_TAG\""

echo "[run] Exec: $RUN_CMD"
eval "$RUN_CMD"

echo "[run] Started. Open http://localhost:${HOST_PORT}/ops/#/login"
