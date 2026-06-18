#!/usr/bin/env bash
set -euo pipefail

# ===========================================================
# SSL certificate generation
# ===========================================================
SSL_DIR="/etc/nginx/ssl"
SSL_KEY="${SSL_DIR}/server.key"
SSL_CRT="${SSL_DIR}/server.crt"
SSL_MARKER="${SSL_DIR}/.ssl_domains_marker"

# SSL_DOMAINS: comma-separated list of DNS names and/or IP addresses
# Examples:
#   SSL_DOMAINS=localhost
#   SSL_DOMAINS=dev.ops.com,192.168.1.162
#   SSL_DOMAINS=test.ops.com,192.168.1.180,localhost
SSL_DOMAINS="${SSL_DOMAINS:-localhost}"

generate_ssl_cert() {
  echo "[entrypoint] Generating self-signed SSL certificate for: ${SSL_DOMAINS}"

  # Build SAN (Subject Alternative Name) entries
  local san_entries=""
  local cn=""
  local idx=1

  IFS=',' read -ra DOMAINS <<< "${SSL_DOMAINS}"
  for domain in "${DOMAINS[@]}"; do
    domain=$(echo "$domain" | xargs)  # trim whitespace
    [ -z "$domain" ] && continue

    # Set first domain as CN
    [ -z "$cn" ] && cn="$domain"

    # Auto-detect IP vs DNS
    if [[ "$domain" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      san_entries="${san_entries}IP.${idx} = ${domain}\n"
    else
      san_entries="${san_entries}DNS.${idx} = ${domain}\n"
    fi
    idx=$((idx + 1))
  done

  # Fallback CN
  [ -z "$cn" ] && cn="localhost"

  # Create OpenSSL config with SAN
  local ssl_conf
  ssl_conf=$(mktemp)
  cat > "$ssl_conf" <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_ext
req_extensions     = v3_ext

[dn]
C  = CN
ST = Dev
L  = Dev
O  = OPSmind
OU = Dev
CN = ${cn}

[v3_ext]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
$(echo -e "$san_entries")
EOF

  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CRT" \
    -config "$ssl_conf" \
    2>/dev/null

  rm -f "$ssl_conf"

  # Write marker so we can detect if SSL_DOMAINS changed
  echo "$SSL_DOMAINS" > "$SSL_MARKER"

  echo "[entrypoint] SSL certificate generated successfully."
  echo "[entrypoint]   CN  = ${cn}"
  echo "[entrypoint]   SAN = ${SSL_DOMAINS}"
  echo "[entrypoint]   Key = ${SSL_KEY}"
  echo "[entrypoint]   Crt = ${SSL_CRT}"
}

# Only regenerate if domains changed or cert doesn't exist
if [ ! -f "$SSL_CRT" ] || [ ! -f "$SSL_KEY" ]; then
  generate_ssl_cert
elif [ -f "$SSL_MARKER" ]; then
  old_domains=$(cat "$SSL_MARKER")
  if [ "$old_domains" != "$SSL_DOMAINS" ]; then
    echo "[entrypoint] SSL_DOMAINS changed ('${old_domains}' -> '${SSL_DOMAINS}'), regenerating certificate..."
    generate_ssl_cert
  else
    echo "[entrypoint] SSL certificate already exists and SSL_DOMAINS unchanged, skipping generation."
  fi
else
  generate_ssl_cert
fi

# ===========================================================
# Nginx config rendering
# ===========================================================
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
