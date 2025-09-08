#!/usr/bin/env bash
# Build Docker image that bundles opsmind (Vue) and oplus (Angular) into one Nginx image
set -euo pipefail

# Image repo/name (can be overridden via -t). Version is controlled ONLY by VERSION below.
TAG="opsmind-web:latest"
TAG_SET="false"

# Release version: set here; do not pass via args. Example: 1.2.3
# When empty, falls back to 'latest'.
VERSION="1.1.1"

PLATFORM=""
NO_CACHE=""
SKIP_OPSMIND_BUILD="false"
# Default to multi-arch build (arm64 load locally + export amd64 tar)
MULTI_ARCH="true"
EXPORT_AMD64_TAR="build/opsmind-web-amd64.tar"

usage() {
  cat <<'USAGE'
Usage: scripts/docker-build.sh [options]

Options:
  -t, --tag <name>          Image name/repo (default: opsmind-web). Version comes from VERSION in script.
  --platform <platform>     docker buildx platform (e.g. linux/amd64)
  --no-cache                Build without cache
  --skip-opsmind-build      Skip building opsmind dist (expects ./dist present)
  --multi-arch              Build both linux/amd64 and linux/arm64 (M1) variants (default: enabled)
  --no-multi-arch           Disable multi-arch; honor --platform or host arch
  --export-amd64-tar <tar>  Export linux/amd64 image tar (default: build/opsmind-web-amd64.tar)
  --no-export-amd64         Do not export amd64 tar
  -h, --help                Show this help

Notes:
  - This script expects:
      1) opsmind build output in ./dist
      2) oplus build output in ./oplus-web/dist
  - If ./dist is missing and --skip-opsmind-build is not set, it will run "npm run build".
  - To set release version, edit VERSION variable near the top of this script.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      TAG="$2"; TAG_SET="true"; shift; shift ;;
    --platform)
      PLATFORM="$2"; shift; shift ;;
    --no-cache)
      NO_CACHE="--no-cache"; shift ;;
    --skip-opsmind-build)
      SKIP_OPSMIND_BUILD="true"; shift ;;
    --multi-arch)
      MULTI_ARCH="true"; shift ;;
    --no-multi-arch)
      MULTI_ARCH="false"; shift ;;
    --export-amd64-tar)
      EXPORT_AMD64_TAR="$2"; shift; shift ;;
    --no-export-amd64)
      EXPORT_AMD64_TAR=""; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

DEFAULT_REPO_NAME="opsmind-web"

# Compute image names from VERSION (do not infer from args)
IMAGE_NAME_NO_TAG="${TAG%%:*}"
if [[ -z "$IMAGE_NAME_NO_TAG" ]]; then IMAGE_NAME_NO_TAG="$DEFAULT_REPO_NAME"; fi
if [[ -n "$VERSION" ]]; then
  TAG_VERSIONED="${IMAGE_NAME_NO_TAG}:${VERSION}"
  TAG_LATEST="${IMAGE_NAME_NO_TAG}:latest"
else
  TAG_VERSIONED="${IMAGE_NAME_NO_TAG}:latest"
  TAG_LATEST=""
fi

# Auto-adjust default amd64 tar path when version is set and user didn't override export path
DEFAULT_TAR_PATH="build/opsmind-web-amd64.tar"
if [[ -n "$VERSION" && "$EXPORT_AMD64_TAR" == "$DEFAULT_TAR_PATH" ]]; then
  EXPORT_AMD64_TAR="build/${DEFAULT_REPO_NAME}-${VERSION}-amd64.tar"
fi

if [[ -n "$TAG_LATEST" ]]; then
  echo "[build] Image tags: $TAG_VERSIONED (+ latest)"
else
  echo "[build] Image tag:  $TAG_VERSIONED"
fi
echo "[build] Platform:  ${PLATFORM:-(default)}"
if [[ -n "$VERSION" ]]; then echo "[build] Version:   $VERSION"; fi
echo "[build] AMD64 tar: ${EXPORT_AMD64_TAR:-(disabled)}"

# Ensure oplus build exists
if [[ ! -f "oplus-web/dist/index.html" ]]; then
  echo "[build] ERROR: Missing oplus build at oplus-web/dist/." >&2
  echo "        Please place oplus build artifacts in oplus-web/dist then retry." >&2
  exit 1
fi

# Ensure opsmind build exists (always rebuild unless explicitly skipped)
if [[ "$SKIP_OPSMIND_BUILD" != "true" ]]; then
  echo "[build] Building opsmind dist (vite build)..."
  npm run build
else
  echo "[build] --skip-opsmind-build set; expecting existing ./dist"
fi

if [[ ! -f "dist/index.html" ]]; then
  echo "[build] ERROR: opsmind dist is missing after build. Expect dist/index.html." >&2
  exit 1
fi

ensure_buildx() {
  if ! docker buildx version >/dev/null 2>&1; then
    echo "[build] ERROR: docker buildx is required. Please upgrade Docker Desktop or install buildx plugin." >&2
    exit 1
  fi
}

# Build outputs
mkdir -p "$(dirname "$EXPORT_AMD64_TAR")"

# Common labels (string, robust under set -u)
LABEL_FLAGS=""
if [[ -n "$VERSION" ]]; then
  CREATED_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  GIT_REV="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  LABEL_FLAGS="${LABEL_FLAGS} --label org.opencontainers.image.title=${IMAGE_NAME_NO_TAG}"
  LABEL_FLAGS="${LABEL_FLAGS} --label org.opencontainers.image.version=${VERSION}"
  LABEL_FLAGS="${LABEL_FLAGS} --label org.opencontainers.image.revision=${GIT_REV}"
  LABEL_FLAGS="${LABEL_FLAGS} --label org.opencontainers.image.created=${CREATED_TS}"
fi

if [[ "$MULTI_ARCH" == "true" ]]; then
  echo "[build] Multi-arch build: linux/amd64 and linux/arm64"
  ensure_buildx

  # 1) Build and load arm64 image for local run on M1 (if applicable)
  echo "[build] Building arm64 (load to local engine)"
  docker buildx build --platform linux/arm64 -t "$TAG_VERSIONED" $NO_CACHE --provenance=false $LABEL_FLAGS --load .

  # Tag also as :latest locally when a version is provided
  if [[ -n "$TAG_LATEST" ]]; then
    docker tag "$TAG_VERSIONED" "$TAG_LATEST" || true
  fi

  # 2) Build and export amd64 tar for distribution
  if [[ -n "${EXPORT_AMD64_TAR}" ]]; then
    echo "[build] Building amd64 and exporting tar -> $EXPORT_AMD64_TAR"
    docker buildx build --platform linux/amd64 -t "$TAG_VERSIONED" $NO_CACHE --provenance=false $LABEL_FLAGS \
      -o type=docker,dest="$EXPORT_AMD64_TAR" .
  else
    echo "[build] Building amd64 (load to local engine)"
    docker buildx build --platform linux/amd64 -t "$TAG_VERSIONED" $NO_CACHE --provenance=false $LABEL_FLAGS --load .
  fi

  echo "[build] Multi-arch done. AMD64 tar at: $EXPORT_AMD64_TAR"
else
  # Single-arch path
  if [[ -n "$PLATFORM" ]]; then
    echo "[build] Single-arch buildx for platform: $PLATFORM"
    ensure_buildx
    docker buildx build --platform "$PLATFORM" -t "$TAG_VERSIONED" $NO_CACHE --provenance=false $LABEL_FLAGS --load .
    # If user also wants tar and platform=linux/amd64, export tar too
    if [[ "$PLATFORM" == "linux/amd64" ]]; then
      echo "[build] Exporting amd64 tar -> $EXPORT_AMD64_TAR"
      docker buildx build --platform linux/amd64 -t "$TAG_VERSIONED" $NO_CACHE --provenance=false $LABEL_FLAGS \
        -o type=docker,dest="$EXPORT_AMD64_TAR" .
    fi
  else
    echo "[build] Default docker build (host arch)"
    docker build -t "$TAG_VERSIONED" $NO_CACHE $LABEL_FLAGS .
  fi
  if [[ -n "$TAG_LATEST" ]]; then
    docker tag "$TAG_VERSIONED" "$TAG_LATEST" || true
  fi
  echo "[build] Done. Image: $TAG_VERSIONED"
fi
