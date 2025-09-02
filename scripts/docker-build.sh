#!/usr/bin/env bash
# Build Docker image that bundles opsmind (Vue) and oplus (Angular) into one Nginx image
set -euo pipefail

TAG="opsmind-web:latest"
TAG_SET="false"
VERSION=""
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
  -t, --tag <tag>           Image tag (default: opsmind-web:latest)
  -v, --version <version>   Version to tag image with (e.g. 1.2.3). If set and --tag not provided, image tag becomes opsmind-web:<version>
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
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      TAG="$2"; TAG_SET="true"; shift; shift ;;
    -v|--version)
      VERSION="$2"; shift; shift ;;
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

# Derive final image tags based on provided VERSION
IMAGE_NAME_NO_TAG="${TAG%%:*}"
if [[ -z "$IMAGE_NAME_NO_TAG" ]]; then IMAGE_NAME_NO_TAG="$DEFAULT_REPO_NAME"; fi

if [[ -n "$VERSION" && "$TAG_SET" != "true" ]]; then
  TAG="${IMAGE_NAME_NO_TAG}:${VERSION}"
fi

# Auto-adjust default amd64 tar path when version is set and user didn't override export path
DEFAULT_TAR_PATH="build/opsmind-web-amd64.tar"
if [[ -n "$VERSION" && "$EXPORT_AMD64_TAR" == "$DEFAULT_TAR_PATH" ]]; then
  EXPORT_AMD64_TAR="build/${DEFAULT_REPO_NAME}-${VERSION}-amd64.tar"
fi

echo "[build] Image tag: $TAG"
echo "[build] Platform:  ${PLATFORM:-(default)}"
if [[ -n "$VERSION" ]]; then echo "[build] Version:   $VERSION"; fi
echo "[build] AMD64 tar: ${EXPORT_AMD64_TAR:-(disabled)}"

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

ensure_buildx() {
  if ! docker buildx version >/dev/null 2>&1; then
    echo "[build] ERROR: docker buildx is required. Please upgrade Docker Desktop or install buildx plugin." >&2
    exit 1
  fi
}

# Build outputs
mkdir -p "$(dirname "$EXPORT_AMD64_TAR")"

# Common labels
LABEL_ARGS=()
if [[ -n "$VERSION" ]]; then
  CREATED_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  GIT_REV="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  LABEL_ARGS+=(
    --label "org.opencontainers.image.title=${IMAGE_NAME_NO_TAG}"
    --label "org.opencontainers.image.version=${VERSION}"
    --label "org.opencontainers.image.revision=${GIT_REV}"
    --label "org.opencontainers.image.created=${CREATED_TS}"
  )
fi

if [[ "$MULTI_ARCH" == "true" ]]; then
  echo "[build] Multi-arch build: linux/amd64 and linux/arm64"
  ensure_buildx

  # 1) Build and load arm64 image for local run on M1 (if applicable)
  echo "[build] Building arm64 (load to local engine)"
  docker buildx build --platform linux/arm64 -t "$TAG" $NO_CACHE --provenance=false "${LABEL_ARGS[@]}" --load .

  # Tag also as :latest locally when a version is provided
  if [[ -n "$VERSION" ]]; then
    docker tag "$TAG" "${IMAGE_NAME_NO_TAG}:latest" || true
  fi

  # 2) Build and export amd64 tar for distribution
  if [[ -n "${EXPORT_AMD64_TAR}" ]]; then
    echo "[build] Building amd64 and exporting tar -> $EXPORT_AMD64_TAR"
    docker buildx build --platform linux/amd64 -t "$TAG" $NO_CACHE --provenance=false "${LABEL_ARGS[@]}" \
      -o type=docker,dest="$EXPORT_AMD64_TAR" .
  else
    echo "[build] Building amd64 (load to local engine)"
    docker buildx build --platform linux/amd64 -t "$TAG" $NO_CACHE --provenance=false "${LABEL_ARGS[@]}" --load .
  fi

  echo "[build] Multi-arch done. AMD64 tar at: $EXPORT_AMD64_TAR"
else
  # Single-arch path
  if [[ -n "$PLATFORM" ]]; then
    echo "[build] Single-arch buildx for platform: $PLATFORM"
    ensure_buildx
    docker buildx build --platform "$PLATFORM" -t "$TAG" $NO_CACHE --provenance=false "${LABEL_ARGS[@]}" --load .
    # If user also wants tar and platform=linux/amd64, export tar too
    if [[ "$PLATFORM" == "linux/amd64" ]]; then
      echo "[build] Exporting amd64 tar -> $EXPORT_AMD64_TAR"
      docker buildx build --platform linux/amd64 -t "$TAG" $NO_CACHE --provenance=false "${LABEL_ARGS[@]}" \
        -o type=docker,dest="$EXPORT_AMD64_TAR" .
    fi
  else
    echo "[build] Default docker build (host arch)"
    docker build -t "$TAG" $NO_CACHE "${LABEL_ARGS[@]}" .
  fi
  echo "[build] Done. Image: $TAG"
fi
