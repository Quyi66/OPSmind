#!/usr/bin/env bash
set -euo pipefail

MAIN_TEMPLATE="/etc/nginx/templates/default.conf.template"
MAIN_TARGET="/etc/nginx/conf.d/default.conf"
OPLUS_TEMPLATE="/etc/nginx/templates/oplus.conf.template"
OPLUS_TARGET="/etc/nginx/conf.d/oplus.conf"

echo "[entrypoint] Rendering nginx config with env: BACKEND_SCHEME=${BACKEND_SCHEME:-}, BACKEND_HOST=${BACKEND_HOST:-}, BACKEND_PORT=${BACKEND_PORT:-}, OPLUS_PORT=${OPLUS_PORT:-}" 

# Render main server
envsubst '${BACKEND_SCHEME} ${BACKEND_HOST} ${BACKEND_PORT} ${OPLUS_PORT}' < "$MAIN_TEMPLATE" > "$MAIN_TARGET"

# Render internal oplus server
envsubst '${BACKEND_SCHEME} ${BACKEND_HOST} ${BACKEND_PORT} ${OPLUS_PORT}' < "$OPLUS_TEMPLATE" > "$OPLUS_TARGET"

echo "[entrypoint] Starting nginx..."
exec "$@"
