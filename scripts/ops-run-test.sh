#!/usr/bin/env bash
# Run a test container for opsmind-all-in-one image
set -euo pipefail

IMAGE_TAG="opsmind-web:latest"
CONTAINER_NAME="opsmind-web"
HOST_PORT=8080
BACKEND_URL="http://10.1.40.228:18080"
DETACH="-d"
REPLACE_EXISTING="true"

usage() {
  cat <<'USAGE'
Usage: scripts/docker-run-test.sh [options]

Options:
  -t, --tag <image>        Docker image tag (default: opsmind-web:latest)
  -p, --port <host_port>   Host port to map to 80 (default: 8080)
  --backend-url <url>      Backend base URL (e.g. http://10.1.40.112:80)
  -h, --help               Show this help

Examples:
  scripts/docker-run-test.sh --backend-url http://10.1.40.112:80
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag) IMAGE_TAG="$2"; shift; shift ;;
    -p|--port) HOST_PORT="$2"; shift; shift ;;
    --backend-url) BACKEND_URL="$2"; shift; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
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

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:80" \
  -e BACKEND_URL="$BACKEND_URL" \
  "$IMAGE_TAG"

echo "[run] Started. Open http://localhost:${HOST_PORT}/ops/#/login"
