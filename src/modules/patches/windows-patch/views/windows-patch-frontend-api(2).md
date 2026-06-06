# Windows 补丁管理 — 前端接口文档

> 方案：**WUA + 内网 WSUS**（目标机用 Windows Update Agent 引擎扫描/安装/回滚，对接内网 WSUS，客户端无需外网）。
> 取代旧的"离线已装 KB 采集 + 补丁库差集"方案。
> 网关前缀：所有接口经 `oplus-portal` 转发，前端调用路径为 `/oplus-portal/vap/api/...`，下表为转发后真实路径。

## 1. 主机维度查询

### 1.1 主机补丁扫描汇总（分页）
- `GET /api/vap/win-patch/hosts?page=0&size=20`
- 说明：按主机聚合 `vap2_curr_machine_status_win`，返回每台主机待修复/已安装统计及严重度分级。
- 响应（`Page<WinHostSummaryView>`）：

```json
{
  "content": [
    {
      "id": "<host_id>", "hostId": "<host_id>", "hostKey": "192.168.1.86",
      "osDistro": "Windows Server 2025 Datacenter", "osVersion": "10.0.26100.1742", "osArch": "AMD64",
      "totalMissing": 5, "criticalCount": 2, "importantCount": 2, "moderateCount": 0, "lowCount": 0,
      "unspecifiedCount": 1, "installedCount": 120,
      "lastScanDate": "2026-06-05 12:31:41", "lastScanRunId": "<runId>"
    }
  ],
  "totalElements": 1, "totalPages": 1, "number": 0, "size": 20
}
```
- 字段：`totalMissing`=待修复(`patch_status=no_repair` 且未忽略)；`installedCount`=已修复(`is_repair`)；severity 各档取 `vap2_curr_machine_status_win.severity`（WUA `MsrcSeverity`）。

### 1.2 单台主机补丁明细（分页、可过滤）
- `GET /api/vap/win-patch/hosts/{hostId}/patches?page=0&size=50`
- 过滤参数（均可选）：
  - `severity`：`Critical|Important|Moderate|Low|Unspecified`（Unspecified 含空值/非标准值）
  - `patchStatus`：`no_repair|is_repair|repairing|repaird|repair_faild`
  - `keyword`：KB 编号或标题模糊匹配
- 响应（`Page<WinHostPatchView>`）：

```json
{
  "content": [
    { "id": "...", "hostId": "...", "hostKey": "192.168.1.86", "kbNumber": "KB5087539",
      "title": "2026-05 Cumulative Update ...", "categoryName": "Security Updates",
      "patchStatus": "no_repair", "severity": "Important",
      "cveIds": "CVE-2026-21530,CVE-2026-33834,CVE-2026-33839",
      "osDistro": "...", "osVersion": "10.0.26100.1742", "osArch": "AMD64",
      "scanDate": "2026-06-05 12:31:41", "isIgnore": false }
  ],
  "totalElements": 5, "totalPages": 1
}
```
- `severity`：优先取 WUA `MsrcSeverity`；为空时按 KB 用 `win_cve` 知识库补全（取关联 CVE 最高等级），仍无则前端显示「未分级」。
- `cveIds`：逗号分隔的关联 CVE 编号（来自 `win_cve_affected` 按 KB 反查），无关联时为 `null`（前端"关联 CVE"列显示 `-`）。

## 2. 任务触发

### 2.1 触发扫描
- `POST /api/vap/win-patch/tasks/scan`
- 请求体（二选一）：`["<hostId1>","<hostId2>"]` 或 `{"hostIds":["<hostId1>"]}`
- 行为：对所选主机下发 `func=scan` 作业（WUA 走内网 WSUS），结果经 `/win/callback/scan` 异步落库。
- 响应：`{"_status":"ok","runId":"<runId>"}`；失败：`{"_status":"error","message":"..."}`

### 2.2 安装 / 回滚补丁（与 Linux 统一的流程化向导）
> Windows 安装/回滚**复用与 Linux 完全相同的向导接口** `/api/vap/v2/patch/task/*`，仅在创建时传
> `osType="windows"` 区分；5 步流程（选主机→预执行脚本→校验脚本→重启策略→安装执行）、任务实体、
> 状态机、回调全部与 Linux 共用，后端按 `osType` 分流到 WUA。旧的单步接口
> `POST /api/vap/win/patch/{type}` 与 `/api/vap/win-patch/tasks/install|rollback` 已废弃删除。

基址：`/api/vap/v2/patch/task`（Linux / Windows 共用，下表均为 Windows 用法）

所有「执行/跳过/创建」类接口的响应均为**任务实体**（见 [2.2.7 任务实体字段](#227-任务实体字段)）。

#### 2.2.1 创建任务（步骤①前置：选目标主机）
- 安装：`POST /create`
  ```json
  { "osType": "windows", "hostIds": ["<hostId>"], "patchStatusIds": ["<vap2_curr_machine_status_win.id>"] }
  ```
  > Windows 无 CVE `patchIds`，以 `patchStatusIds`（补丁明细行 id，§1.2 的 `id`）标识要安装的 KB。
- 回滚：`POST /create-rollback`
  ```json
  { "osType": "windows", "hostIds": ["<hostId>"], "histUpdateIds": ["<vap2_hist_update_pkgs_win.id>"] }
  ```
- 响应：任务实体（`status=CREATED`、`currentStep=PRE_CHECK`、`restartType=system`）。后续步骤都用返回的 `id`。

#### 2.2.2 脚本（预执行 / 校验，可选）
- 上传文件：`POST /{id}/script/upload`（form-data：`scriptType`=`pre-check`\|`validate`，`file`=PowerShell 脚本）
- 直接编辑：`PUT /{id}/script/update`，body `{ "scriptType": "pre-check", "content": "<PowerShell 脚本内容>" }`
- 未设置脚本时，对应步骤执行会自动跳过。

#### 2.2.3 步骤①：预检查
- 执行：`POST /{id}/pre-check/execute`（脚本为空 → 直接 `PRE_CHECK_DONE`；否则 `PRE_CHECKING`，完成后回调置 `PRE_CHECK_DONE`/`PRE_CHECK_FAILED`）
- 跳过：`POST /{id}/pre-check/skip` → `PRE_CHECK_DONE`

#### 2.2.4 步骤②：安装 / 回滚
- 安装：`POST /{id}/install/execute` → `INSTALLING`（WUA 从内网 WSUS 下载安装，**不重启**），完成后 `INSTALL_DONE`/`INSTALL_FAILED`
- 回滚：`POST /{id}/rollback/execute` → `ROLLING_BACK`（WUA+DISM 卸载），完成后 `ROLLBACK_DONE`/`ROLLBACK_FAILED`
- 状态由后端读 `jao_audit_log` 对账，前端轮询 `GET /{id}` 获取最新 `status`。

#### 2.2.5 步骤③：重启策略
- 获取策略：`GET /{id}/restart/options`
  ```json
  { "restartType": "system", "restartReason": "Windows 补丁通常需重启后生效...", "restartRequired": true, "restartLabel": "系统重启" }
  ```
- 确认：`POST /{id}/restart/confirm`
  - 执行重启：`{ "confirm": true, "confirmText": "确认重启" }` → `RESTART_PENDING`
  - 不重启：`{ "confirm": false }` → `RESTART_DONE`
- 执行重启：`POST /{id}/restart/execute` → `RESTARTING`，完成后 `RESTART_DONE`/`FAILED`

#### 2.2.6 步骤④：安装后校验
- 执行：`POST /{id}/validate/execute`（脚本为空 → 直接 `COMPLETED`；否则 `VALIDATING`，完成后 `COMPLETED`/`VALIDATE_FAILED`）
- 跳过：`POST /{id}/validate/skip` → `COMPLETED`

#### 2.2.7 查询
- 详情：`GET /{id}`（返回任务实体，前端用其驱动向导进度）
- 列表：`GET /list?status=&page=0&size=20`

#### 2.2.8 任务实体字段（响应体）
| 字段 | 说明 |
|---|---|
| `id` | 任务 ID |
| `taskType` | `install` / `rollback` |
| `osType` | `windows` |
| `status` | 当前状态（见 §6.2） |
| `currentStep` | 当前步骤 `PRE_CHECK`/`INSTALL`/`ROLLBACK`/`RESTART`/`VALIDATE` |
| `hostIds` / `patchStatusIds` / `histUpdateIds` | JSON 字符串数组 |
| `preCheckScript` / `validateScript` | 已设置的脚本内容（PowerShell） |
| `restartType` / `restartReason` | 重启类型(`system`/`service`/`none`)与原因 |
| `restartConfirmed` / `restartAction` | 是否已确认 / 实际动作 |
| `executionLog` / `errorMessage` | 执行输出 / 失败原因 |
| `createdBy` / `createdTime` / `updatedTime` | 创建人 / 时间 |

> 内部机制（前端无需关心）：安装/回滚委托 WUA runner，预检/校验/重启走 Windows playbook
> `func=prescript/validate/reboot`，回调复用 Linux 的 `/api/vap/v2/callback/{pre-check|validate|restart}`；
> Windows 经 WinRM/NTLM，脚本步骤 argline 采用 `key=value`。

## 3. 任务历史 / 日志 / 导出

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/vap/win-patch/tasks?page=0&size=20` | 安装/回滚 run 历史（按时间倒序） |
| GET | `/api/vap/win-patch/tasks/{taskId}` | 任务历史详情 |
| GET | `/api/vap/win-patch/install-logs?hostId=&page=0&size=20` | 安装/回滚日志（可按主机过滤） |
| POST | `/api/vap/win-patch/export` | 导出补丁扫描报告（Excel，`WinPatchExportRequest` 过滤条件，返回 .xlsx 流） |
| DELETE | `/api/vap/win/patch/rollback/history/windows` | 删除回滚历史 |

> 注：列表/历史中的安装/回滚记录由「补丁安装向导」(§2.2) 触发产生。

## 4. WSUS 服务器配置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/vap/win-patch/wsus-config` | 查询当前租户 WSUS 配置 |
| POST | `/api/vap/win-patch/wsus-config` | 保存/更新（`{"wsusUrl":"192.168.1.75","wsusPort":8530,"useSsl":0,"description":""}`） |
| DELETE | `/api/vap/win-patch/wsus-config/{id}` | 删除 |

> WSUS 配置用于扫描/安装/回滚时下发 `wsus_url`（取该租户最近一条配置，拼为 `http(s)://host:port`），脚本据此设置目标机 `WUServer` 注册表并指向内网 WSUS；若客户端已由 GPO 指向 WSUS，则无需依赖此配置。

## 5. 回调接口（平台内部，JAO→后端，前端无需调用）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/vap/win/callback/scan` | 扫描/回滚结果回调 |
| POST | `/api/vap/win/callback/update` | 安装结果回调 |

## 6. 字典

### 6.1 补丁状态（`patch_status`，§1 主机/明细查询用）
| patch_status | 含义 | 计入 |
|---|---|---|
| `no_repair` | 未修复（缺失，待安装） | 待修复 |
| `is_repair` | 已修复（已安装） | 已安装 |
| `is_repair_artificial` | 人工已修复 | 已安装 |
| `repairing` | 修复中（安装下发后） | — |
| `repair_faild` | 修复失败 | — |

### 6.2 任务状态 / 步骤（`status` / `currentStep`，§2.2 向导用）
| status | 所处步骤 | 含义 |
|---|---|---|
| `CREATED` | PRE_CHECK | 已创建，待预检查 |
| `PRE_CHECKING` / `PRE_CHECK_DONE` / `PRE_CHECK_FAILED` | PRE_CHECK | 预检查 执行中 / 完成 / 失败 |
| `INSTALLING` / `INSTALL_DONE` / `INSTALL_FAILED` | INSTALL | 安装 执行中 / 完成 / 失败 |
| `ROLLING_BACK` / `ROLLBACK_DONE` / `ROLLBACK_FAILED` | ROLLBACK | 回滚 执行中 / 完成 / 失败 |
| `RESTART_PENDING` / `RESTARTING` / `RESTART_DONE` | RESTART | 待重启 / 重启中 / 重启完成 |
| `VALIDATING` / `VALIDATE_FAILED` | VALIDATE | 校验 执行中 / 失败 |
| `COMPLETED` | VALIDATE | 全流程完成 |
| `FAILED` | — | 流程失败（重启等步骤失败） |

> `restartType`：`system`（系统重启）/ `service`（服务重启）/ `none`（无需重启）。

### 6.3 严重等级（`severity`）
| severity | 来源 |
|---|---|
| Critical / Important / Moderate / Low | 优先 WUA `MsrcSeverity`；为空时按 KB 用 `win_cve` 知识库补全（取关联 CVE 最高等级） |
| Unspecified | 上述均无（空值或非标准值），前端显示「未分级」 |
