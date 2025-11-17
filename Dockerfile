FROM nginx:1.25

# ---- Base packages ----
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash curl gettext-base \
    && rm -rf /var/lib/apt/lists/*

# ---- Runtime-configurable backend ----
# Use a single backend URL (schema+host[:port]) and an internal oplus port
# Can be overridden via `docker run -e BACKEND_URL=... -e OPLUS_PORT=...`
ENV BACKEND_URL=http://10.1.40.112:80 \
    OPLUS_PORT=8081

# ---- Nginx config ----
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/templates/default.conf.template
COPY docker/nginx/oplus.conf /etc/nginx/templates/oplus.conf.template
COPY docker/runtime-config.js.template /etc/nginx/templates/runtime-config.js.template

# ---- App static assets ----
COPY dist/ /usr/share/nginx/html/opsmind/
COPY oplus-web/dist/ /usr/share/nginx/html/oplus/

# ---- Entrypoint to render template then start nginx ----
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
