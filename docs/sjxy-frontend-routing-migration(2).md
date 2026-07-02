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
- `/sjxy-svs/...` 改为 `/sjxy-console/dashboard/api/sys/dashboard/...`
- `/sjxy-jobadm/...` 改为 `/sjxy-scheduler/...`

## 一之二、业务模块前缀与内段已统一改名（重点，容易漏改导致 404）

后端已把各业务模块的网关路径**前缀和内段都统一成新模块名**。凡是旧的 `vap/jao/udp/acm/cac/sec` 一律替换为新模块名，否则一律 404。

统一规律：`/sjxy-console/{新模块名}/api/{新模块名}/{子路径}`（前缀 == 内段 == 新模块名）。

| 业务 | 旧写法（含之前的过渡写法，均已废弃） | 正确写法（本次统一后） |
|------|----------------------|----------|
| 安全运维 | `/sjxy-console/vap/api/vap/...`、`/sjxy-console/vap/api/secops/...` | `/sjxy-console/secops/api/secops/...` |
| 作业编排 | `/sjxy-console/jao/api/jao/...`、`/sjxy-console/jao/api/workflow/...` | `/sjxy-console/workflow/api/workflow/...` |
| 工作台 | `/sjxy-console/udp/api/udp/...`、`/sjxy-console/udp/api/workspace/...` | `/sjxy-console/workspace/api/workspace/...` |
| 资产 | `/sjxy-console/acm/api/acm/...`、`/sjxy-console/acm/api/cmdb/...` | `/sjxy-console/cmdb/api/cmdb/...` |
| 审计巡检 | `/sjxy-console/cac/api/cac/...`、`/sjxy-console/cac/api/audit/...` | `/sjxy-console/audit/api/audit/...` |
| 安全基线 | `/sjxy-console/cac/api/sec/...`、`/sjxy-console/cac/api/security/...` | `/sjxy-console/security/api/security/...` |
| 数据大屏 | `/sjxy-console/svs/api/sys/dashboard/...` | `/sjxy-console/dashboard/api/sys/dashboard/...` |

以下前缀**未改名，保持不变**，前端只需把 `/sjxy-portal` 换成 `/sjxy-console`：`gfs`（`/gfs/api/gfs/...`）、`upm`、`uim`、`mac`、`dashboard`（`/dashboard/api/sys/dashboard/...`）等。

> 快速自查：前端凡出现 `/vap/`、`/jao/`、`/udp/`、`/acm/`、`/cac/`、`/svs/` 这些旧前缀，全部替换为 `secops/workflow/workspace/cmdb/audit(或security)/dashboard`。

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

### 本次报 404 的两个接口，正确路径

| 前端当前请求（404） | 正确路径 |
|---------------------|----------|
| `GET /sjxy-console/svs/api/sys/dashboard/full-data` | `GET /sjxy-console/dashboard/api/sys/dashboard/full-data` |
| `GET /sjxy-console/udp/api/udp/applets/tenant/user?...` | `GET /sjxy-console/workspace/api/workspace/applets/tenant/user?tenantUserId=xxx&login=xxx` |

原因：
- 数据大屏前缀 `svs` 要改成 `dashboard`。
- 工作台前缀和内段 `udp` 全部改成 `workspace`（后端控制器已从 `/api/udp` 迁到 `/api/workspace`，网关前缀也从 `udp` 改为 `workspace`）。

## 六、业务模块接口路径

前端按模块走 `/sjxy-console/{新模块名}/api/{新模块名}/...`（前缀与内段一致）：

```text
安全运维 secops:    /sjxy-console/secops/api/secops/...
审计巡检 audit:     /sjxy-console/audit/api/audit/...
安全基线 security:  /sjxy-console/security/api/security/...
资产     cmdb:      /sjxy-console/cmdb/api/cmdb/...
作业编排 workflow:  /sjxy-console/workflow/api/workflow/...
工作台   workspace: /sjxy-console/workspace/api/workspace/...
文件     gfs:       /sjxy-console/gfs/api/gfs/...   （未改名）
用户权限 upm:       /sjxy-console/upm/api/upm/...    （未改名）
```

示例：

```text
GET  /sjxy-console/secops/api/secops/dashboard/current-stats
POST /sjxy-console/workflow/api/workflow/universal/dc/{model}
GET  /sjxy-console/cmdb/api/cmdb/ci/attr/inventory/{nodeName}/{assetType}
GET  /sjxy-console/workspace/api/workspace/applets/tenant/user?tenantUserId=xxx&login=xxx
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
/vap/     （整段改为 /secops/，即 /secops/api/secops/）
/jao/     （整段改为 /workflow/，即 /workflow/api/workflow/）
/udp/     （整段改为 /workspace/，即 /workspace/api/workspace/）
/acm/     （整段改为 /cmdb/，即 /cmdb/api/cmdb/）
/cac/     （整段改为 /audit/ 或 /security/）
/svs/     （整段改为 /dashboard/）
```

> 注意：`gfs`、`upm`、`uim`、`mac`、`dashboard` 等未改名的模块保持原样，不要误改。

需要确认的功能点：

- 登录页能通过 `/sjxy-console/api/authenticate` 登录。
- 登录请求包含 `rememberMe`。
- 加密登录使用 `Sjxy@2026!!sys@!`。
- 所有 API 请求带 `Authorization: Bearer <token>`。
- Dashboard 数据接口走 `/sjxy-console/dashboard/api/sys/dashboard/...`。
- 调度中心菜单或 iframe 跳转到 `/sjxy-scheduler/`。
- 前端 Nginx 已代理 `/sjxy-console/` 和 `/sjxy-scheduler` 到后端容器 `sjxy:80`。
