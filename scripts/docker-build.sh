#!/usr/bin/env bash
# Build Docker image that bundles opsmind (Vue) and oplus (Angular) into one Nginx image
set -euo pipefail

TAG="opsmind-all-in-one:latest"
PLATFORM=""
NO_CACHE=""
SKIP_OPSMIND_BUILD="false"

usage() {
  cat <<'USAGE'
Usage: scripts/docker-build.sh [options]

Options:
  -t, --tag <tag>           Image tag (default: opsmind-all-in-one:latest)
  --platform <platform>     docker buildx platform (e.g. linux/amd64)
  --no-cache                Build without cache
  --skip-opsmind-build      Skip building opsmind dist (expects ./dist present)
  -h, --help                Show this help

Notes:
  - This script expects:
      1) opsmind build output in ./dist
      2) oplus build output in ./oplus-web/dist
  - If ./dist is missing and --skip-opsmind-build is not set, it will run "npm run build".
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      TAG="$2"; shift; shift ;;
    --platform)
      PLATFORM="$2"; shift; shift ;;
    --no-cache)
      NO_CACHE="--no-cache"; shift ;;
    --skip-opsmind-build)
      SKIP_OPSMIND_BUILD="true"; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

echo "[build] Image tag: $TAG"
echo "[build] Platform:  ${PLATFORM:-(default)}"

# Ensure oplus build exists
if [[ ! -f "oplus-web/dist/index.html" ]]; then
  echo "[build] ERROR: Missing oplus build at oplus-web/dist/." >&2
  echo "        Please place oplus build artifacts in oplus-web/dist then retry." >&2
  exit 1
fi

# Ensure opsmind build exists (or build it)
if [[ "$SKIP_OPSMIND_BUILD" != "true" ]]; then
  if [[ ! -f "dist/index.html" ]]; then
    echo "[build] opsmind dist not found, running npm build..."
    npm run build
  else
    echo "[build] Found existing ./dist, skipping npm build."
  fi
else
  echo "[build] --skip-opsmind-build set; expecting existing ./dist"
fi

if [[ ! -f "dist/index.html" ]]; then
  echo "[build] ERROR: opsmind dist is missing after build. Expect dist/index.html." >&2
  exit 1
fi

# Build docker image
BUILD_ARGS=(build -t "$TAG" $NO_CACHE .)
if [[ -n "$PLATFORM" ]]; then
  BUILD_ARGS=(buildx build --platform "$PLATFORM" -t "$TAG" $NO_CACHE --load .)
fi

echo "[build] docker ${BUILD_ARGS[*]}"
docker "${BUILD_ARGS[@]}"

echo "[build] Done. Image: $TAG"

