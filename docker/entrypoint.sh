#!/usr/bin/env bash
set -euo pipefail

MAIN_TEMPLATE="/etc/nginx/templates/default.conf.template"
MAIN_TARGET="/etc/nginx/conf.d/default.conf"

echo "[entrypoint] Rendering nginx config with env: BACKEND_URL=${BACKEND_URL:-}"

# Render main server
envsubst '${BACKEND_URL}' < "$MAIN_TEMPLATE" > "$MAIN_TARGET"

# Render runtime config for frontend (Dify bot)
RUNTIME_TEMPLATE="/etc/nginx/templates/runtime-config.js.template"
RUNTIME_TARGET="/usr/share/nginx/html/opsmind/runtime-config.js"
echo "[entrypoint] Rendering runtime-config.js (DIFY_* envs)"
envsubst '${DIFY_TOKEN} ${DIFY_BASE_URL}' < "$RUNTIME_TEMPLATE" > "$RUNTIME_TARGET" || true

echo "[entrypoint] Starting nginx..."
exec "$@"
