FROM nginx:1.25-alpine

# ---- Base packages ----
RUN apk add --no-cache bash curl gettext

# ---- Runtime-configurable backend ----
# Default values; can be overridden via `docker run -e ...`
ENV BACKEND_SCHEME=http \
    BACKEND_HOST=10.1.40.112 \
    BACKEND_PORT=80 \
    OPLUS_PORT=8081

# ---- Nginx config ----
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/templates/default.conf.template
COPY docker/nginx/oplus.conf /etc/nginx/templates/oplus.conf.template

# ---- App static assets ----
COPY dist/ /usr/share/nginx/html/opsmind/
COPY oplus-web/dist/ /usr/share/nginx/html/oplus/

# ---- Entrypoint to render template then start nginx ----
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Healthcheck: opsmind index should be reachable
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ops/index.html >/dev/null 2>&1 || exit 1

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
