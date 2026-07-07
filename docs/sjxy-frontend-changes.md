# SJXY 前端改动总清单（交付前端团队）

> **本文件为前端改动总清单，取代/合并了 `docs/sjxy-frontend-dts-cleanup.md`。**
> 后续前端改造请以本文为准；`sjxy-frontend-dts-cleanup.md` 内条目已全部吸收、去重、校正并入本文。
>
> 背景：原 oplus 运维平台改名为 sjxy，后端服务名、模块前缀、部分数据取值均已改名。前端为独立工程（opsmind-web / sjxy-web，不在后端仓库），以下改动需前端配合。
> 本文所有"后端真相值"均已在代码 / 迁移脚本 / 162 运行库中逐一核验；凡本仓库无法确认的前端当前写法，均标注"**需前端确认**"。
>
> 核验日期：2026-07-07。后端仓库：`D:\WorkSpace\oplus-base`（分支 sjxy-init）。

---

## 一、类型权威对照表（定时任务 jobType）

后端唯一真相：`sjxy-workflow/.../xxljob/jobHandler/RunJobHandler.java` 常量。前端提交的 `jobType` **必须**是下列字面值之一，否则后端 `buildUrl` 命中 `default` 返回空 URL、任务不派发。

| 中文名 | 后端常量字面值 | 迁移后应有值 | 162 线上实际值（已核验） | 前端应使用值 | 是否存在不一致风险 |
|---|---|---|---|---|---|
| 脚本任务 | `POST_SCRIPT="script"` | `script` | `script`（3 条） | `script` | 否 |
| REST 接口 | `POST_REST="rest"` | `rest` | `rest`（2 条） | `rest` | 否 |
| 巡检任务 | `POST_AUDIT="audit"` | `audit`（由旧值 `cac` 迁移） | `audit`（2 条，**无 `cac` 残留**） | **`audit`** | **是**：前端下拉旧值可能仍为 `cac` |
| 命令任务 | `POST_CMD="cmd"` | `cmd` | 当前库无此类样本 | `cmd` | 需前端确认 |
| 流程任务 | `GET_FLOWS="flows"`（**复数**） | `flows` | 当前库无此类样本 | **`flows`（复数，不是 `flow`）** | **是**：易误写成 `flow` |

核验来源：
- 常量字面值：`RunJobHandler.java` 第 32–36 行。
- `flows`（复数）在 `CronMapper.java`（第 47/76 行 `!"flows".equals(jobType)`）、`CronJobServiceImpl.java`（第 114 行）中一致引用，确认是 `flows` 非 `flow`。
- `cac → audit` 迁移：`images-sjxy/commons/sjxy/db/mysql/db-migration-legacy.sql` 第 6.1 节、`.../daily/init/00-xxl_job-init.sql` 末段 `UPDATE ... JSON_SET(executor_param,'$.jobType','audit') WHERE ...='cac'`。
- 162 运行库实测：`xxl_job.xxl_job_info` 按 jobType 分组结果为 `script=3 / rest=2 / audit=2`，`cac`、`flow` 旧值查询计数为 0（无残留）。

---

## 二、变更速览

| 编号 | 标题 | 优先级 |
|---|---|---|
| 1 | 定时任务"任务类型"下拉 code↔名称映射（`cac→audit`、`flows` 复数） | 高 |
| 2 | 业务模块 / 路由前缀统一改名（`vap/jao/udp/acm/cac/svs/portal` → 新名） | 高 |
| 3 | i18n 语言包文件名 `oplus-lang.js → sjxy-lang.js` | 高 |
| 4 | WebSocket 实时日志路径 `/oplus-ws → /sjxy-ws` | 高 |
| 5 | 登录接口改造（`/sjxy-console/api/authenticate` + `rememberMe` + AES 密钥更新） | 高 |
| 6 | DTS / 数据源接口残留清理（数据源页下线 + 关键字自查） | 高 |
| 7 | 调度中心路径 `/sjxy-jobadm → /sjxy-scheduler` | 中 |
| 8 | Output 页历史日志回退接口 `log-text` 对接 | 中 |
| 9 | 应用资源页 `datasets` 接口改新接口或删除 | 中 |
| 10 | Dashboard 数据接口路径归一（`svs → dashboard`） | 中 |
| 11 | 操作日志查询 `module` 传参改用新模块名 | 中 |
| 12 | 前端容器 nginx 模板固化（`/sjxy-ws`、`/sjxy-scriptrepo`，若前端负责该模板） | 高 |
| 13 | PMS 密码管理页两个历史数据集查询确认 | 低 |
| 14 | 资产属性接口路径勘误 | 低 |
| 15 | 全局搜索"模块"过滤 code 对齐（ModuleEnum） | 低 |

---

## 三、详细条目

### 1. 定时任务"任务类型"下拉 code↔名称映射（`cac→audit`、`flows` 复数）

- **问题现象**：定时任务详情里 `jobType: "audit"` 在类型下拉显示为原始字符串 `audit`，而不是"巡检任务"；历史上前端把巡检任务用旧值 `cac`，与后端迁移后的 `audit` 对不上。若前端提交了非法值（如 `cac`、`flow`），后端 `buildUrl` 命中 `default` 返回空 URL，任务**不派发**。
- **改哪里（可搜索关键词）**：前端"任务类型"下拉的 `options`（value/label），以及 code→中文名的展示映射；全局搜 `cac`、`"flow"`（注意排查是否误写单数）、`jobType`。
- **怎么改（改前→改后）**：下拉 options 的 value 与 code→中文名映射统一对齐为下列 5 个值（见"类型权威对照表"）：
  - 脚本任务 = `script`
  - REST 接口 = `rest`
  - 巡检任务 = `audit`（**改前可能是 `cac`**）
  - 命令任务 = `cmd`
  - 流程任务 = `flows`（**复数**，改前若写成 `flow` 需改为 `flows`）

  示例（伪代码）：

```js
// 改前
const JOB_TYPE_OPTIONS = [
  { value: 'script', label: '脚本任务' },
  { value: 'rest',   label: 'REST接口' },
  { value: 'cac',    label: '巡检任务' },   // ❌ 旧值
  { value: 'cmd',    label: '命令任务' },
  { value: 'flow',   label: '流程任务' },   // ❌ 单数
];

// 改后
const JOB_TYPE_OPTIONS = [
  { value: 'script', label: '脚本任务' },
  { value: 'rest',   label: 'REST接口' },
  { value: 'audit',  label: '巡检任务' },   // ✅
  { value: 'cmd',    label: '命令任务' },
  { value: 'flows',  label: '流程任务' },   // ✅ 复数
];
```

- **影响范围**：定时任务新建/编辑提交、列表回显、类型下拉筛选，四处必须一致。
- **优先级**：高。
- **需前端确认**：前端下拉当前实际写的是哪几个 value（本仓库无法确认前端源码）；后端真相值以上表为准，务必以 `audit` / `flows` 为准。

---

### 2. 业务模块 / 路由前缀统一改名（重点，最易漏改导致 404）

- **问题现象**：后端已把各业务模块网关路径的**前缀与内段都统一为新模块名**，凡残留旧前缀（`vap/jao/udp/acm/cac/svs`、`sjxy-portal` 等）一律 404。
- **改哪里（可搜索关键词）**：前端接口封装、常量、mock、Nginx、环境变量中的旧前缀。统一规律：`/sjxy-console/{新模块名}/api/{新模块名}/{子路径}`（前缀 == 内段 == 新模块名）。
- **怎么改（旧→新对照）**：

| 业务 | 旧写法（含过渡写法，均已废弃） | 正确写法 |
|---|---|---|
| 安全运维 | `/sjxy-portal/...`、`/sjxy-console/vap/api/vap/...`、`/vap/api/secops/...` | `/sjxy-console/secops/api/secops/...` |
| 作业编排 | `/sjxy-console/jao/api/jao/...`、`/jao/api/workflow/...` | `/sjxy-console/workflow/api/workflow/...` |
| 工作台 | `/sjxy-console/udp/api/udp/...`、`/udp/api/workspace/...` | `/sjxy-console/workspace/api/workspace/...` |
| 资产 | `/sjxy-console/acm/api/acm/...`、`/acm/api/cmdb/...` | `/sjxy-console/cmdb/api/cmdb/...` |
| 审计巡检 | `/sjxy-console/cac/api/cac/...`、`/cac/api/audit/...` | `/sjxy-console/audit/api/audit/...` |
| 安全基线 | `/sjxy-console/cac/api/sec/...`、`/cac/api/security/...` | `/sjxy-console/security/api/security/...` |
| 数据大屏 | `/sjxy-console/svs/api/sys/dashboard/...` | `/sjxy-console/dashboard/api/sys/dashboard/...` |

  **未改名、保持不变**（仅把 `/sjxy-portal` 换成 `/sjxy-console`）：`gfs`（`/gfs/api/gfs/...`）、`upm`、`uim`、`mac`、`dashboard`（`/dashboard/api/sys/dashboard/...`）。

  另有若干具体端点内段改名（若页面直接拼接了这些路径需一并改）：

| 旧 | 新 |
|---|---|
| `/email-config/cac-on-off`、`/cac-three-on-off` | `/email-config/audit-on-off`、`/audit-three-on-off` |
| `/get/cac-team-config/` | `/get/audit-team-config/` |
| `/api/vap/v2/sql` | `/api/secops/v2/sql` |
| `/udp-page-*` | `/workspace-page-*` |
| `/count-ata` | `/count-executor` |
| `black/list/cac`（module 参数值） | `black/list/audit` |

- **上线前自查关键字（必须全部为 0）**：

```text
sjxy-portal
sjxy-dts
sjxy-svs
sjxy-jobadm
/dashboard/api/dashboard
/vap/      （改为 /secops/，即 /secops/api/secops/）
/jao/      （改为 /workflow/，即 /workflow/api/workflow/）
/udp/      （改为 /workspace/，即 /workspace/api/workspace/）
/acm/      （改为 /cmdb/，即 /cmdb/api/cmdb/）
/cac/      （改为 /audit/ 或 /security/）
/svs/      （改为 /dashboard/）
```

  > 注意：`gfs`、`upm`、`uim`、`mac`、`dashboard` 未改名，不要误改。

- **影响范围**：全部业务模块接口调用。
- **优先级**：高。
- 核验来源：`docs/sjxy-frontend-routing-migration.md`、`docs/sjxy-module-rename-migration.md`；后端各模块 `@RequestMapping` 与网关配置。

---

### 3. i18n 语言包文件名 `oplus-lang.js → sjxy-lang.js`

- **问题现象**：后端 `I18nResource` 拉取词条时请求 `http://{ip}/opsMind/i18n/sjxy-lang.js`（见 `sjxy-console/.../web/rest/I18nResource.java` 的 `buildCatalogUrl()`），但前端构建产物里仍是旧名 `oplus-lang.js`，返回 404 或 HTML，导致后端日志报 `I18nResource: Failed to fetch i18n resource ... sjxy-lang.js: Mismatched tag`。（162 上曾临时复制改名救急，镜像重建后会丢失。）
- **改哪里（可搜索关键词）**：前端构建产物文件名与引用处，全局搜 `oplus-lang.js`、`opsMind/i18n`。
- **怎么改**：把语言包文件名 `oplus-lang.js` 改为 `sjxy-lang.js`（含所有引用），随下次发版上线，最终请求路径为 `/opsMind/i18n/sjxy-lang.js`。
- **影响范围**：i18n 词条加载。
- **优先级**：高。

---

### 4. WebSocket 实时日志路径 `/oplus-ws → /sjxy-ws`

- **问题现象**：Output 页实时日志连接旧路径 `wss://.../oplus-ws/log/{runId}` 不通（后端无此路径）。
- **改哪里（可搜索关键词）**：前端 WS 连接地址，全局搜 `oplus-ws`（应为 0）。
- **怎么改（改前→改后）**：连接地址由 `/oplus-ws/log/{runId}` 改为 `/sjxy-ws/log/{runId}`（协议 `wss` 不变）。

```text
改前：wss://192.168.1.162/oplus-ws/log/{runId}
改后：wss://192.168.1.162/sjxy-ws/log/{runId}
```

  后端约定（已核验）：后端网关 nginx `location /sjxy-ws/` 带尾斜杠 `proxy_pass http://localhost:8081/`（剥掉 `/sjxy-ws` 前缀），dashboard 侧 WebSocket 端点注册路径为 `@ServerEndpoint("/log/{runId}")`（见 `sjxy-workflow/.../socket/server/LogSocketServer.java`）。因此浏览器侧应连的最终路径就是 `/sjxy-ws/log/{runId}`。（executor 侧另有 `/log/{batchId}/{runId}/{engine}` 端点，走 3000 端口，dashboard→executor 桥接后前端仍统一连 `/sjxy-ws/log/{runId}`。）

- **影响范围**：Output 页实时日志。
- **优先级**：高。
- **需前端确认**：`runId` 的拼接方式（后端 `runId` 支持步骤聚合形式 `step_{stepId}`，前端如何拼接以实际业务为准）。

---

### 5. 登录接口改造

- **问题现象**：登录地址与加密密钥已变更。
- **改哪里（可搜索关键词）**：登录请求封装，搜 `authenticate`、`rememberMe`、`encrypt`、旧 AES key。
- **怎么改**：
  - 登录地址：`POST /sjxy-console/api/authenticate`。
  - 请求体必须包含 `rememberMe`（布尔，必传），`encrypt` 默认 `true`：

```json
{ "username": "admin", "password": "加密后或明文", "rememberMe": false, "encrypt": true }
```

  - 加密登录参数（**已从旧值 `Sjxy@2022!!sys@!` 轮换**）：

```text
算法：AES/CBC/ISO10126Padding
Key ：Sjxy@2026!!sys@!
IV  ：Sjxy@2026!!sys@!
输出：Base64
```

  - 明文联调需显式 `encrypt:false`。登录成功仍返回 `{"id_token":"..."}`，后续请求带 `Authorization: Bearer <id_token>`。
- **影响范围**：登录 / 鉴权。
- **优先级**：高。
- 核验来源：`docs/sjxy-frontend-routing-migration.md` 第四节；密钥轮换见 `docs/sjxy-module-rename-migration.md` 第 7 节（`Sjxy@2022!!sys@! → Sjxy@2026!!sys@!`）。

---

### 6. DTS / 数据源接口残留清理

- **问题现象**：后端 `oplus-dts` 服务已整体下线，所有 `/dts/api/dts/...` 返回 404。线上前端包实测仍有多处残留调用。
- **改哪里（可搜索关键词）**：全局搜 `/dts/api/dts`、`/api/dts/`（改完后必须为 0）。
- **怎么改**：
  1. **数据源管理页（`SscDataSourcePage`）整页下线**：调用 `/dts/api/dts/datasources`（含 `datasources/test`），无替代接口。删除该页面组件、菜单项与路由入口。
  2. **PMS 相关数据集查询**：见条目 13。
- **影响范围**：数据源管理页、低代码相关。
- **优先级**：高。
- **需前端确认**：前端当前是否还有 `SscDataSourcePage` 及相关入口。

---

### 7. 调度中心路径 `/sjxy-jobadm → /sjxy-scheduler`

- **问题现象**：调度中心跳转 / iframe / 菜单仍指向旧服务名 `/sjxy-jobadm`。
- **改哪里（可搜索关键词）**：搜 `sjxy-jobadm`、`jobadm`（应为 0）。
- **怎么改（改前→改后）**：`/sjxy-jobadm` → `/sjxy-scheduler/`。
- **影响范围**：调度中心入口。
- **优先级**：中。

---

### 8. Output 页历史日志回退接口 `log-text` 对接

- **问题现象**：Output 页实时日志完全依赖 WebSocket；任务已是终态（COMPLETED/FAILED/ERROR/INTERRUPTED）后刷新重开，或 WS 连接失败/异常断开时，此前**没有 REST 兜底**，页面空白。
- **改哪里**：Output 页组件的 WS `onerror`/`onclose` 分支，以及页面初始化逻辑。
- **怎么改**：调用后端已提供的历史日志接口（已核验）：

```text
GET /sjxy-console/workflow/api/workflow/runlogs/{runId}/log-text
```

  接口特性（见 `sjxy-workflow/.../web/JobRunController.java` 的 `getStoredLogText`，控制器基路径 `/api/workflow`）：
  - 返回 `Content-Type: text/plain`，body 是拼接好的 ansible-playbook 风格纯文本（含 `PLAY`/`TASK`/`PLAY RECAP`），**直接原样展示，无需解析 JSON**（区别于 WS 的分块 JSON `{"batchId":...,"message":...}`）。
  - `runId` 支持步骤聚合形式 `step_{stepId}`（多任务间以 `========== 第N步 (runId) ==========` 分隔）。
  - 数据来源：优先读数据库落库结果（`workflow_run_result_data`，不受 Executor 30 天审计文件保留期限制），无记录时回退 Executor 审计文件。
  - 找不到日志返回 **HTTP 404**，body 是中文提示文案（`未找到该任务的历史日志，可能任务不存在、尚未产生输出或日志已过期被清除`），可直接展示。
  - 前端建议：① WS 非用户主动关闭时改调此接口一次性取回全部日志；② 初始化时若 runId 已是终态可直接调此接口、跳过建 WS；③ 渲染按整段纯文本处理，不必按 batchId 分组。
- **影响范围**：Output 页历史日志展示。
- **优先级**：中。

---

### 9. 应用资源页 `datasets` 接口改新接口或删除

- **问题现象**：`SscAppResPage` 调用 `/dts/api/dts/datasets?...` 与 `/dts/api/dts/datasets/move/...`，404。
- **改哪里（可搜索关键词）**：搜 `/dts/api/dts/datasets`。
- **怎么改**：数据集资源导入导出改走新接口：
  - `GET /sjxy-console/adm/api/adm/aou/dataset/all`（数据集资源）
  - 相关还有 `aou/applet/all`、`aou/page/all`、`appres`
- **影响范围**：应用资源页。
- **优先级**：中。
- **需前端确认**：页面上"数据集移动/管理"操作若无对应新接口，则删除该操作入口。

---

### 10. Dashboard 数据接口路径归一（`svs → dashboard`）

- **问题现象**：数据大屏 / Dashboard 接口仍走旧前缀 `svs` 或旧代理路径，404。
- **改哪里（可搜索关键词）**：搜 `/svs/api`、`/dashboard/api/dashboard`。
- **怎么改（改前→改后）**：统一走 `GET /sjxy-console/dashboard/api/sys/dashboard/{endpoint}`。

| 前端旧请求（404） | 正确路径 |
|---|---|
| `GET /sjxy-console/svs/api/sys/dashboard/full-data` | `GET /sjxy-console/dashboard/api/sys/dashboard/full-data` |
| `GET /sjxy-console/udp/api/udp/applets/tenant/user?...` | `GET /sjxy-console/workspace/api/workspace/applets/tenant/user?tenantUserId=xxx&login=xxx` |

  不要再请求 `/dashboard/api/dashboard/...` 或 `/sjxy-dts/...`。
- **影响范围**：数据大屏 / 首页看板 / 工作台 applets。
- **优先级**：中。
- 详细业务接口清单见后端 `docs/FRONTEND-API-GUIDE.md`。

---

### 11. 操作日志查询 `module` 传参改用新模块名

- **问题现象**：前端查操作日志时传旧模块名（`acm`、`vap2`、`jao`、`udp`、`svs`、`cac` 等），后端存量数据已迁到新名，导致按模块过滤查不到。
- **改哪里（可搜索关键词）**：操作日志查询请求里的 `module` 参数值。
- **怎么改（旧→新）**：`jao→workflow`、`vap/vap2/patchops→secops`、`cac→audit`、`acm→cmdb`、`udp→workspace`、`svs→dashboard`。
  - **已核验**：安全运维操作日志页面在 162 部署包（opsmind-web 2.1.3）中已统一传 `module:"secops"`（补丁类审计后端也一律写 `secops`，`patchops` 不作为审计 module 值，这一侧前端无需改）。
- **影响范围**：操作日志按模块过滤。
- **优先级**：中。
- **需前端确认**：除已验证的 `secops` 外，其余模块页面当前是否仍传旧模块名（本仓库无法确认前端源码）。核验来源：`db-migration-legacy.sql` 2b.5/2b.6/Part 3.9，`docs/sjxy-module-rename-migration.md` 第 8b 节。

---

### 12. 前端容器 nginx 模板固化（`/sjxy-ws`、`/sjxy-scriptrepo`）

> 仅当前端负责对外 `80/443` 的 nginx 模板时适用；否则本条作为背景说明。

- **问题现象**：
  - ① 163 执行节点的 jgit 通过 `http://192.168.1.162/sjxy-scriptrepo/gfs/git/{id}` 克隆脚本仓库，请求打到前端容器 80 端口被 `return 301 https` 强跳，jgit 不信任自签证书（`PKIX path building failed`），导致 playbook 编排任务失败。
  - ② WebSocket `/sjxy-ws` 长连接需要更长 read timeout，不能复用 30s 的 API location。
- **改哪里**：前端镜像 `/etc/nginx/templates/default.conf.template`（及生成的 `default.conf`）。
- **怎么改**：
  - 80 与 443 两个 server 块的后端 API 直通正则加入 `sjxy-scriptrepo`：

```nginx
location ~ ^/(api|sjxy-console|sjxy-portal|sjxy-gfs|sjxy-scriptrepo|oplus-[a-z0-9_-]+)/ {
    proxy_pass $backend_upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto http;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

  - 443 server 块新增 WebSocket 专用 location：

```nginx
location /sjxy-ws/ {
    proxy_pass $backend_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

  > 162 上两项均已线上热修，**下次前端发版必须把此改动带进模板，否则镜像重建会回退**。后端容器 nginx 侧对应的 `/sjxy-scriptrepo/`、`/sjxy-ws/` 代理已随后端镜像固化（见 `images-sjxy/commons/sjxy/conf/nginx-sjxy.conf`、`buildconfig/sjxy/nginx/nginx-sjxy.conf`，均已核验）。
- **影响范围**：playbook 编排任务、实时日志。
- **优先级**：高。
- **需前端确认**：前端镜像是否负责该 nginx 模板。

---

### 13. PMS 密码管理页两个历史数据集查询确认

- **问题现象**：4 个 index bundle 中调用 `POST /dts/api/dts/q/data/PMS_GET_PASSWORD/` 与 `POST /dts/api/dts/q/data/PMS_GET_SERVER_HISTORY/`。这两个数据集 code 在新旧库中都不存在，属历史死功能。
- **改哪里（可搜索关键词）**：搜 `PMS_GET_PASSWORD`、`PMS_GET_SERVER_HISTORY`、`/dts/api/dts/q/data`。
- **怎么改**：先确认功能是否还在用；不用则直接删调用；确需保留联系后端在 dashboard 服务（`/sjxy-console/dashboard/api/sys/dashboard/` 前缀）新增端点后再改路径（目前后端 PMS 端点只有 pms-server、pms-audit-log 等 6 个）。
- **影响范围**：PMS 密码管理页。
- **优先级**：低。
- **需前端确认**：这两个查询对应功能是否还在使用。

---

### 14. 资产属性接口路径勘误

- **问题现象**：旧文档写的 `ci/attr/inventory/...` 有误。
- **改哪里（可搜索关键词）**：搜 `ci/attr/inventory`。
- **怎么改（改前→改后）**：实际路径为
  `GET /sjxy-console/cmdb/api/cmdb/ci/get/attr/{nodeName}/{assetType}`。
- **影响范围**：用到资产属性接口的页面。
- **优先级**：低。
- **需前端确认**：前端是否有页面用到此接口的旧写法。

---

### 15. 全局搜索"模块"过滤 code 对齐（ModuleEnum）

- **问题现象**：后端搜索索引写入的 module code 已改新名（`cmdb / workspace / workflow / gfs`，见 `platform/core/.../search/enums/ModuleEnum.java`）；启用 ES 的环境改名后已重建索引。若前端全局搜索有"按模块过滤"的下拉，其 code 需与新名一致，否则过滤漏数据。
- **改哪里（可搜索关键词）**：前端全局搜索模块过滤的 code 常量。
- **怎么改**：模块过滤 code 对齐为 `cmdb / workspace / workflow / gfs`（数据集 DTS 归入 `workspace`）。
- **影响范围**：全局搜索按模块过滤。
- **优先级**：低。
- **需前端确认**：前端全局搜索是否存在模块过滤、当前用的是哪些 code。

---

## 四、无需前端改动的部分（背景说明）

以下已在 162 实测正常，前端无需改动，列出仅供排查时排除：

- 工作台：`/sjxy-console/workspace/api/workspace/applets`（及 pages/folders/tags/home）
- 动态数据模型：`GET/POST /sjxy-console/workflow/api/workflow/universal/dc/{model}`
- dc 数据：`/sjxy-console/workflow/api/workflow/dc/data`
- 应用资源：`/sjxy-console/adm/api/adm/aou/*`、`appres`
- 工作台页面历史：`/sjxy-console/dashboard/api/sys/dashboard/workspace-page-history`
- 补丁类作业审计 module：后端一律写 `secops`（前端已验证传 `secops`，无需改）

---

## 五、上线前统一自查关键字（汇总，改完应全部为 0）

```text
oplus-lang.js
oplus-ws
sjxy-portal
sjxy-dts
sjxy-svs
sjxy-jobadm
jobadm
/dts/api/dts
/api/dts/
/dashboard/api/dashboard
/vap/
/jao/
/udp/
/acm/
/cac/
/svs/
cac        （凡当作巡检任务 jobType 使用处 → audit）
"flow"     （定时任务流程类型应为复数 flows）
ci/attr/inventory
PMS_GET_PASSWORD
PMS_GET_SERVER_HISTORY
```

> 例外：`gfs`、`upm`、`uim`、`mac`、`dashboard` 等未改名模块保持原样，勿误改。
