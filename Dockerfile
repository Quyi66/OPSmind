FROM nginx:1.25

# ---- Base packages ----
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash curl gettext-base openssl \
    && rm -rf /var/lib/apt/lists/*

# ---- Runtime-configurable backend ----
ENV BACKEND_URL=http://10.1.40.112:80

# ---- SSL domains (comma-separated DNS names and/or IPs) ----
# Dynamically generates a self-signed cert at container start.
# Examples: SSL_DOMAINS=localhost  |  SSL_DOMAINS=dev.ops.com,192.168.1.162
ENV SSL_DOMAINS=localhost

# ---- Nginx config ----
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/templates/default.conf.template
COPY docker/runtime-config.js.template /etc/nginx/templates/runtime-config.js.template
RUN mkdir -p /etc/nginx/ssl

# ---- App static assets ----
COPY dist/ /usr/share/nginx/html/opsmind/

# ---- Entrypoint to render template then start nginx ----
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
