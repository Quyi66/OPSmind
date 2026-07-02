# SJXY 前端路由迁移说明

本文给前端改造使用。后端已统一去除旧服务名，前端需同步替换接口前缀、登录加密参数和 Nginx 代理规则。

## 一、必须删除的旧路径

前端代码、Nginx 配置、环境变量、接口封装、mock、文档中不要再出现以下前缀：

- `/sjxy-portal`
- `/sjxy-dts`
- `/sjxy-svs`
- `/sjxy-jobadm`

对应替换关系：

- `/sjxy-portal/...` 改为 `/sjxy-console/...`
- `/sjxy-dts/...` 不再使用；数据查询类接口改走 `/sjxy-console/dashboard/api/sys/dashboard/...` 或业务模块新接口
- `/sjxy-svs/...` 改为 `/sjxy-dashboard` 相关后端服务路径；前端接口一般不直连该前缀
- `/sjxy-jobadm/...` 改为 `/sjxy-scheduler/...`

## 二、前端统一入口

浏览器侧接口统一走前端 Nginx 暴露的同域路径，再由前端 Nginx 转到后端容器 `sjxy:80`。

推荐前端请求基础规则：

```text
认证与 Console 网关：/sjxy-console/**
调度中心：/sjxy-scheduler/**
静态上传：/sjxy-upload/**
文档：/sjxy-doc/**
```

前端不要再直接拼后端内部端口，例如 `8001`、`8081`、`8099`。

## 三、前端 Nginx 需要代理的路径

如果前端容器负责对外暴露 `80/443`，请确保 Nginx 至少有这些代理：

```nginx
location /sjxy-console/ {
    proxy_pass http://sjxy:80/sjxy-console/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /sjxy-scheduler {
    proxy_pass http://sjxy:80/sjxy-scheduler;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /sjxy-upload {
    proxy_pass http://sjxy:80/sjxy-upload;
}

location /patch-upload {
    proxy_pass http://sjxy:80/patch-upload;
}

location /sjxy-doc {
    proxy_pass http://sjxy:80/sjxy-doc;
}
```

说明：

- `sjxy` 是后端 Docker 容器名，前端容器需要和后端容器在同一个 Docker 网络内。
- 后端容器内部 Nginx 已配置 `/sjxy-console/`、`/sjxy-scheduler` 等路径。
- 宿主机 `80/443` 由前端容器占用，后端容器不再直接绑定宿主机 `80`。

## 四、登录接口改造

登录地址改为：

```text
POST /sjxy-console/api/authenticate
```

请求体必须包含 `rememberMe`：

```json
{
  "username": "admin",
  "password": "加密后或明文密码",
  "rememberMe": false,
  "encrypt": true
}
```

字段说明：

- `rememberMe` 必传，布尔值。
- `encrypt` 默认是 `true`。
- 如果 `encrypt:true`，前端需要对 `username` 和 `password` 做 AES-CBC + Base64 加密。
- 如果开发联调要传明文，必须显式传 `encrypt:false`。

当前后端登录加密参数：

```text
算法：AES/CBC/ISO10126Padding
Key：Sjxy@2026!!sys@!
IV ：Sjxy@2026!!sys@!
输出：Base64
```

明文联调示例：

```json
{
  "username": "admin",
  "password": "Oplus@2020",
  "rememberMe": false,
  "encrypt": false
}
```

登录成功响应仍返回：

```json
{
  "id_token": "..."
}
```

后续请求继续使用：

```text
Authorization: Bearer <id_token>
```

## 五、Dashboard 数据接口路径

旧 Dashboard 代理路径需要改为新 Console Zuul 路径：

```text
/sjxy-console/dashboard/api/sys/dashboard/{endpoint}
```

示例：

```text
GET /sjxy-console/dashboard/api/sys/dashboard/sys-audit-log-by-module?module=xxx
GET /sjxy-console/dashboard/api/sys/dashboard/spm-machine-overerview-list
GET /sjxy-console/dashboard/api/sys/dashboard/vpa2-ip-with-critical?severity=Critical
```

注意：

- 不要再请求 `/dashboard/api/dashboard/...`
- 不要再请求 `/sjxy-dts/...`
- 详细业务接口清单见 `docs/FRONTEND-API-GUIDE.md`

## 六、业务模块接口路径

前端按模块走 `/sjxy-console/{module}/api/{module}/...`：

```text
vap: /sjxy-console/vap/api/vap/...
cac: /sjxy-console/cac/api/cac/...
acm: /sjxy-console/acm/api/acm/...
jao: /sjxy-console/jao/api/jao/...
adm: /sjxy-console/adm/api/adm/...
upm: /sjxy-console/upm/api/upm/...
udp: /sjxy-console/udp/api/udp/...
gfs: /sjxy-console/gfs/api/gfs/...
```

示例：

```text
GET  /sjxy-console/vap/api/vap/dashboard/current-stats
POST /sjxy-console/jao/api/jao/universal/dc/{model}
GET  /sjxy-console/acm/api/acm/ci/attr/inventory/{nodeName}/{assetType}
```

## 七、调度中心路径

调度中心服务名已统一为 `sjxy-scheduler`：

```text
/sjxy-scheduler
```

如果前端有调度中心跳转、iframe 或菜单链接，请从旧路径改为：

```text
/sjxy-scheduler/
```

不要再使用：

```text
/sjxy-jobadm
```

## 八、前端自查清单

上线前请全局搜索以下关键字，必须为 0：

```text
sjxy-portal
sjxy-dts
sjxy-svs
sjxy-jobadm
/dashboard/api/dashboard
```

需要确认的功能点：

- 登录页能通过 `/sjxy-console/api/authenticate` 登录。
- 登录请求包含 `rememberMe`。
- 加密登录使用 `Sjxy@2026!!sys@!`。
- 所有 API 请求带 `Authorization: Bearer <token>`。
- Dashboard 数据接口走 `/sjxy-console/dashboard/api/sys/dashboard/...`。
- 调度中心菜单或 iframe 跳转到 `/sjxy-scheduler/`。
- 前端 Nginx 已代理 `/sjxy-console/` 和 `/sjxy-scheduler` 到后端容器 `sjxy:80`。
