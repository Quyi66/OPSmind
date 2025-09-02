#!/usr/bin/env bash
# Run a test container for opsmind-all-in-one image
set -euo pipefail

IMAGE_TAG="opsmind-all-in-one:latest"
CONTAINER_NAME="opsmind-aio"
HOST_PORT=8080
BACKEND_SCHEME="http"
BACKEND_HOST="127.0.0.1"
BACKEND_PORT="8080"
DETACH="-d"
REPLACE_EXISTING="false"

usage() {
  cat <<'USAGE'
Usage: scripts/docker-run-test.sh [options]

Options:
  -t, --tag <image>        Docker image tag (default: opsmind-all-in-one:latest)
  -n, --name <name>        Container name (default: opsmind-aio)
  -p, --port <host_port>   Host port to map to 80 (default: 8080)
  --backend-url <url>      Backend base URL (e.g. http://10.1.40.112:80)
  --backend-scheme <s>     Backend scheme (default: http)
  --backend-host <h>       Backend host (default: 127.0.0.1)
  --backend-port <p>       Backend port (default: 8080)
  --rm                     Auto-remove container on exit
  --replace                Remove existing container with the same name if present
  -f, --foreground         Run in foreground (no -d)
  -h, --help               Show this help

Examples:
  scripts/docker-run-test.sh --backend-url http://10.1.40.112:80
  scripts/docker-run-test.sh -p 9090 --backend-host 10.1.40.112 --backend-port 80
USAGE
}

parse_backend_url() {
  # $1: URL like http://host:port or https://host:port
  local url="$1"
  # scheme
  if [[ "$url" == *"://"* ]]; then
    BACKEND_SCHEME="${url%%://*}"
    url="${url#*://}"
  fi
  # strip path if any
  url="${url%%/*}"
  # host and port
  if [[ "$url" == *":"* ]]; then
    BACKEND_HOST="${url%%:*}"
    BACKEND_PORT="${url##*:}"
  else
    BACKEND_HOST="$url"
    # default port per scheme
    if [[ "$BACKEND_SCHEME" == "https" ]]; then BACKEND_PORT=443; else BACKEND_PORT=80; fi
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag) IMAGE_TAG="$2"; shift; shift ;;
    -n|--name) CONTAINER_NAME="$2"; shift; shift ;;
    -p|--port) HOST_PORT="$2"; shift; shift ;;
    --backend-url) parse_backend_url "$2"; shift; shift ;;
    --backend-scheme) BACKEND_SCHEME="$2"; shift; shift ;;
    --backend-host) BACKEND_HOST="$2"; shift; shift ;;
    --backend-port) BACKEND_PORT="$2"; shift; shift ;;
    --rm) DETACH="--rm -d"; shift ;;
    --replace) REPLACE_EXISTING="true"; shift ;;
    -f|--foreground) DETACH=""; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if [[ "$REPLACE_EXISTING" == "true" ]]; then
    echo "[run] Removing existing container: $CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" >/dev/null
  else
    echo "[run] ERROR: Container $CONTAINER_NAME already exists. Use --replace to remove it." >&2
    exit 1
  fi
fi

echo "[run] Image:      $IMAGE_TAG"
echo "[run] Name:       $CONTAINER_NAME"
echo "[run] Port map:   $HOST_PORT:80"
echo "[run] Backend:    ${BACKEND_SCHEME}://${BACKEND_HOST}:${BACKEND_PORT}"

docker run $DETACH \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:80" \
  -e BACKEND_SCHEME="$BACKEND_SCHEME" \
  -e BACKEND_HOST="$BACKEND_HOST" \
  -e BACKEND_PORT="$BACKEND_PORT" \
  "$IMAGE_TAG"

if [[ "$DETACH" == "-d" || "$DETACH" == "--rm -d" ]]; then
  echo "[run] Started. Open http://localhost:${HOST_PORT}/ops/#/login"
else
  echo "[run] Running in foreground..."
fi

