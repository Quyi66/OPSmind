Docker 部署（opsmind + oplus 单镜像，单端口）

概述
- opsmind：主前端（Vue），构建产物位于 `dist/`，生产环境基路径为 `/opsmind/base/`。
- oplus：Angular 应用，构建产物位于 `oplus-web/dist/`。
- 镜像：基于 `nginx:alpine`，同一容器内同时提供 opsmind 和 oplus，单端口对外。

目录结构（关键）
- `dist/`：opsmind 构建输出
- `oplus-web/dist/`：oplus 构建输出
- `docker/nginx/default.conf`：统一 Nginx 配置
- `Dockerfile`：镜像构建文件

准备
1) 先确保本地已有构建产物：
   - opsmind: `npm run build`（或 `npm run build:prod`）生成 `dist/`
   - oplus: 将 oplus 的构建结果放入 `oplus-web/dist/`

2) 如需自定义后端代理地址（API/WebSocket 等），可在构建时通过 `--build-arg BACKEND_URL=...` 指定；默认值为 `http://10.1.40.112:80`。

构建镜像
```bash
docker build \
  -t opsmind-all-in-one:latest \
  .
```

运行容器（配置后端 IP/端口）
```bash
docker run --name opsmind-aio -d \
  -e BACKEND_SCHEME=http \
  -e BACKEND_HOST=10.1.40.112 \
  -e BACKEND_PORT=80 \
  -p 8080:80 \
  opsmind-all-in-one:latest
```

访问路径
- opsmind（Vue）：`http://localhost:8080/ops/#/login`（或其它 hash 路由）
- oplus（Angular）：通过反向代理由主服务转发，直接访问统一入口即可。若需直接探活内部 oplus，可在容器内访问 `http://127.0.0.1:${OPLUS_PORT}/oplus/base/`。

说明与注意
- 单端口：两套前端均由同一个 Nginx 提供服务。
- 路由前缀：
  - opsmind 生产构建使用 `/ops/`（hash 路由形如 `/ops/#/login`）。
  - oplus 通过 `/oplus/base/` 暴露（内部以 alias 映射到 `oplus-web/dist` 根）。
- iframe 集成：在 opsmind 中通过 iframe 加载 oplus，可使用 `/oplus/base/#/...` 路径，并按需附带 token。
- 代理：`/api`、`/oplus-portal`、`/oplus-upload`、`/oplus-njs`、`/oplus-ws`、`/oplus-jobadm` 会被代理到 `BACKEND_SCHEME://BACKEND_HOST:BACKEND_PORT`。
- 兼容性：仍保留 `/opsmind/base/` 的静态访问映射以兼容旧资源链接；新访问统一使用 `/ops/`。
- oplus 独立子服务：容器内另起一套 Nginx server（默认端口 `${OPLUS_PORT}`，默认 8081），主服务对 `/oplus/*` 的请求反向代理至该内部端口。
- 如需进一步细化缓存或安全头，可在 `docker/nginx/default.conf` 中按需调整。
