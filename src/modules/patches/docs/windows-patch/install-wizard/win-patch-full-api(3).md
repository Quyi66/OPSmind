# Windows 补丁管理 — 完整接口文档（前端）

基础路径：`/api/win-patch`

---

## 目录

- [1. WSUS 配置管理](#1-wsus-配置管理)
- [2. 补丁扫描](#2-补丁扫描)
- [3. 补丁安装](#3-补丁安装)
- [4. 补丁回滚](#4-补丁回滚)
- [5. 步骤执行与脚本管理](#5-步骤执行与脚本管理)
- [6. 查询接口](#6-查询接口)
- [7. 批量导出](#7-批量导出)
- [8. 回调接口（JAO 内部调用）](#8-回调接口jao-内部调用)
- [9. 执行日志查询](#9-执行日志查询)
- [10. 数据字典](#10-数据字典)

---

## 1. WSUS 配置管理

### 1.1 保存/更新 WSUS 配置

```
POST /api/win-patch/wsus-config
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | String | 否 | 有值时更新，无值时新增 |
| wsusUrl | String | 是 | WSUS 服务器 URL，如 `http://wsus.local:8530` |
| wsusPort | Integer | 否 | 端口，默认 8530 |
| useSsl | Boolean | 否 | 是否使用 HTTPS，默认 false |
| description | String | 否 | 描述信息 |

**请求示例**

```json
{
  "wsusUrl": "http://wsus-server:8530",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "生产环境 WSUS"
}
```

**响应** `200 OK`

```json
{
  "id": "abc-123-def",
  "wsusUrl": "http://wsus-server:8530",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "生产环境 WSUS",
  "tenantId": "tenant-001",
  "createdDate": "2026-04-14T10:00:00",
  "updatedDate": null
}
```

### 1.2 查询 WSUS 配置列表

```
GET /api/win-patch/wsus-config
```

**响应** `200 OK` — `WsusConfig[]`

### 1.3 删除 WSUS 配置

```
DELETE /api/win-patch/wsus-config/{id}
```

**响应** `200 OK`

---

## 2. 补丁扫描

### 2.1 创建扫描任务

```
POST /api/win-patch/tasks/scan
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | String[] | 是 | 要扫描的主机 ID 列表 |
| scanMode | String | 否 | 扫描模式，见下表。默认 `auto` |
| wsusConfigId | String | 否 | 指定 WSUS 配置（默认使用租户下首个配置） |
| categories | String | 否 | 逗号分隔的更新类别过滤，如 `SecurityUpdates,CriticalUpdates`。不传则扫描全部类别 |
| rescanAfter | Boolean | 否 | 安装/回滚后是否自动重新扫描，默认 false |

**scanMode 扫描模式**

| 值 | 说明 | 适用场景 |
|----|------|---------|
| `auto` | 如果存在 WSUS 配置（通过 `wsusConfigId` 或租户默认配置），使用 WSUS 扫描；否则走在线 Windows Update。**默认值** | 通用场景，自动适配有网/离线环境 |
| `online` | 强制走在线 Microsoft Windows Update，忽略所有 WSUS 配置 | 目标机可上网，希望扫描最新的微软补丁 |
| `wsus` | 强制走 WSUS 服务器扫描，如果找不到 WSUS 配置则返回错误 | 离线隔离网络，必须通过 WSUS 扫描 |

> **注意：** 此接口替代了旧版 `oplus-vap-windows` 模块的扫描功能。旧版 Ansible `win_updates` 模块扫描等价于 `scanMode=online`，新版统一使用 PowerShell `Scan-WsusPatches.ps1` 脚本，兼容在线和 WSUS 离线两种场景。

**支持的类别值**

`SecurityUpdates`, `CriticalUpdates`, `UpdateRollups`, `Updates`, `DefinitionUpdates`, `FeaturePacks`, `ServicePacks`, `Tools`, `Upgrades`, `Application`, `Connectors`, `DeveloperKits`, `Guidance`

**请求示例**

在线扫描（目标机可联网）：

```json
{
  "hostIds": ["host-001", "host-002"],
  "scanMode": "online",
  "categories": "SecurityUpdates,CriticalUpdates,UpdateRollups"
}
```

WSUS 离线扫描：

```json
{
  "hostIds": ["host-001", "host-002"],
  "scanMode": "wsus",
  "wsusConfigId": "wsus-config-001"
}
```

自动模式（默认，推荐）：

```json
{
  "hostIds": ["host-001", "host-002"]
}
```

**响应** `200 OK`

```json
{
  "id": "task-002",
  "taskType": "SCAN",
  "taskStatus": "RUNNING",
  "runId": "jao-run-456",
  "hostCount": 2,
  "createdDate": "2026-04-14T10:10:00"
}
```

**扫描逻辑说明**

1. 脚本在目标主机通过 `Microsoft.Update.Session` COM 接口查询更新
2. 当 WSUS URL 传入（`scanMode=wsus` 或 `auto` 模式下存在配置）时：脚本临时写入注册表指向 WSUS，使用 `ServerSelection=1`（WSUS 管理服务器）
3. 当无 WSUS URL（`scanMode=online` 或 `auto` 模式下无配置）时：使用 `ServerSelection=0`（默认 Windows Update 在线源）
4. 查询 `IsInstalled=0`（缺失）和 `IsInstalled=1`（已安装）两类更新
5. 回调处理时：
   - 新发现的缺失 KB → 状态为 `MISSING`
   - 之前为 `MISSING` 但本次扫描未出现 → 标记为 `INSTALLED`（在平台外安装）
   - 已存在记录 → 更新元数据（标题、严重级别等）

---

## 3. 补丁安装

### 3.1 创建安装任务

```
POST /api/win-patch/tasks/install
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patchStatusIds | String[] | 是 | `WinHostPatchStatus` 记录 ID 列表（从扫描结果中选取 MISSING 状态的） |
| reboot | Boolean | 否 | 安装后是否自动重启，默认 false |
| rescanAfter | Boolean | 否 | 安装后是否自动重新扫描以刷新补丁状态，默认 false |

**请求示例**

```json
{
  "patchStatusIds": ["ps-id-001", "ps-id-002", "ps-id-003"],
  "reboot": false
}
```

**响应** `200 OK`

```json
{
  "id": "task-003",
  "taskType": "INSTALL",
  "taskStatus": "PENDING",
  "currentStep": "PRE_CHECK",
  "rebootAfter": false,
  "hostCount": 2,
  "createdDate": "2026-04-14T11:00:00"
}
```

**安装逻辑说明**

1. 任务创建后初始状态为 `PENDING`，`currentStep=PRE_CHECK`；需由前端调用 [5.1 执行当前步骤](#51-执行当前步骤) 推进流程
2. 系统按 hostId 分组，每台主机收集待安装的 KB 列表
3. 进入 `EXECUTE` 后所选补丁状态先更新为 `INSTALLING`，由目标主机通过 WUA COM 下载安装
4. 回调结果：`SUCCESS` → `INSTALLED`；`FAILED` → `INSTALL_FAILED`
5. 每个 KB 的安装结果记录到 `WinPatchInstallLog`（KB 级明细）
6. 任务创建、脚本上传/编辑、步骤派发/完成/失败/跳过 均写入 `vap2_patch_operation_log`（与 Linux 补丁流程共用）；JAO 层审计同步写入 `jao_audit_log`

---

## 4. 补丁回滚

### 4.1 创建回滚任务

```
POST /api/win-patch/tasks/rollback
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| installLogIds | String[] | 是 | `WinPatchInstallLog` 记录 ID 列表（从安装日志中选取） |
| reboot | Boolean | 否 | 回滚后是否自动重启，默认 false |
| rescanAfter | Boolean | 否 | 回滚后是否自动重新扫描以刷新补丁状态，默认 false |

**请求示例**

```json
{
  "installLogIds": ["log-id-001", "log-id-002"],
  "reboot": false
}
```

**响应** `200 OK`

```json
{
  "id": "task-004",
  "taskType": "ROLLBACK",
  "taskStatus": "PENDING",
  "currentStep": "PRE_CHECK",
  "hostCount": 1,
  "createdDate": "2026-04-14T12:00:00"
}
```

**回滚逻辑说明**

1. 任务创建后初始状态为 `PENDING`，`currentStep=PRE_CHECK`；通过 [5.1 执行当前步骤](#51-执行当前步骤) 逐步推进
2. 进入 `EXECUTE` 后优先通过 WUA COM 卸载（需 `IsUninstallable = true`）
3. WUA 不支持卸载时降级到 `DISM /remove-package`
4. 回滚成功 → 补丁状态恢复为 `MISSING`；失败 → 更新为 `ROLLBACK_FAILED`
5. 每个 KB 的回滚结果记录到 `WinPatchInstallLog`（action=ROLLBACK）；步骤级日志写入共用的 `vap2_patch_operation_log`

---

## 5. 步骤执行与脚本管理

> 安装与回滚任务创建后初始状态为 `PENDING`，`currentStep=PRE_CHECK`。通过下面的步骤执行接口逐步推进：**PRE_CHECK → EXECUTE → RESTART → VALIDATE → COMPLETED**。
>
> 与 Linux `PatchInstallTaskController` 保持一致（路径、参数名、错误返回体），以便前端用同一组操作控件。

### 5.1 执行当前步骤

```
POST /api/win-patch/tasks/{id}/execute-step
```

- `PRE_CHECK`：有用户脚本则派发 `win-patch-wsus/pre-check/site.yml`；脚本为空自动跳过
- `EXECUTE`：派发 `site.yml`（`func=install/rollback`），不可跳过
- `RESTART`：`rebootAfter=false` 或 `restartType=none` 时自动跳过；否则派发 `win-patch-wsus/restart/site.yml`
- `VALIDATE`：有用户脚本则派发 `win-patch-wsus/validate/site.yml`；脚本为空自动跳过

**响应** `200 OK` — 返回推进后的 `WinPatchTask`；失败时返回 `400` + `{ "error": "..." }`。

### 5.2 跳过当前步骤

```
POST /api/win-patch/tasks/{id}/skip-step
```

- `EXECUTE` 步骤不可跳过，返回 `400`
- 跳过后自动推进到下一步骤，`taskStatus` 保持 `PENDING` 等待下一次 `execute-step`

### 5.3 上传脚本

```
POST /api/win-patch/tasks/{id}/script/upload
Content-Type: multipart/form-data
```

**表单参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptType | String | 是 | `pre-check` 或 `validate` |
| file | File | 是 | PowerShell 脚本文件（.ps1，UTF-8） |

**响应** `200 OK` — 返回更新后的 `WinPatchTask` 实体。失败时返回 `400` + `{ "error": "..." }`。

### 5.4 在线编辑脚本

```
PUT /api/win-patch/tasks/{id}/script/update
Content-Type: application/json
```

**请求体**

```json
{
  "scriptType": "pre-check",
  "content": "Write-Output 'Pre-check passed'\nexit 0"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptType | String | 是 | `pre-check` 或 `validate` |
| content | String | 是 | 脚本完整内容（可直接粘贴） |

**响应** `200 OK` — 返回更新后的 `WinPatchTask` 实体。失败时返回 `400` + `{ "error": "..." }`。

### 5.5 下载脚本（Ansible Playbook 调用）

```
GET /api/win-patch/tasks/{id}/script/download?type={pre-check|validate}
```

- **无需认证**（Shiro: `anon`），供 Ansible playbook 在目标 Windows 主机 `Invoke-WebRequest` 下载执行
- 返回 `text/plain; charset=UTF-8` 格式的脚本内容
- 脚本不存在或为空时返回 `404`

---

## 6. 查询接口

### 6.1 主机扫描概况（分页）

```
GET /api/win-patch/hosts?page=0&size=20
```

**响应** `200 OK` — `Page<WinHostScanSummary>`

```json
{
  "content": [
    {
      "id": "summary-001",
      "hostId": "host-001",
      "hostKey": "192.168.1.100",
      "osDistro": "Microsoft Windows Server 2022 Standard",
      "osVersion": "10.0.20348",
      "osArch": "64-bit",
      "totalMissing": 5,
      "criticalCount": 1,
      "importantCount": 2,
      "moderateCount": 1,
      "lowCount": 1,
      "unspecifiedCount": 0,
      "installedCount": 120,
      "lastScanDate": "2026-04-14T10:05:00",
      "lastScanRunId": "jao-run-456"
    }
  ],
  "totalElements": 50,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

### 6.2 单台主机补丁明细（分页，支持筛选）

```
GET /api/win-patch/hosts/{hostId}/patches?severity=Critical&patchStatus=MISSING&keyword=KB503&page=0&size=50
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostId | String | 是 | 主机 ID（路径参数） |
| severity | String | 否 | 按严重级别筛选：`Critical` / `Important` / `Moderate` / `Low` / `Unspecified`（传 `Unspecified` 会匹配 severity 为 null/空串/`None`/非标准值等，与摘要 `unspecifiedCount` 口径一致） |
| patchStatus | String | 否 | 按补丁状态筛选：`MISSING` / `INSTALLED` / `INSTALLING` / `INSTALL_FAILED` 等 |
| keyword | String | 否 | 搜索 KB 编号或补丁标题 |
| page | int | 否 | 页码（从0开始），默认 0 |
| size | int | 否 | 每页数量，默认 50 |

**响应** `200 OK` — `Page<WinHostPatchStatus>`

```json
{
  "content": [
    {
      "id": "ps-id-001",
      "hostId": "host-001",
      "hostKey": "192.168.1.100",
      "kbNumber": "KB5035857",
      "title": "2026-03 Cumulative Update for Windows Server 2022",
      "severity": "Critical",
      "classification": "SecurityUpdates",
      "patchStatus": "MISSING",
      "isIgnored": false,
      "osDistro": "Microsoft Windows Server 2022 Standard",
      "osVersion": "10.0.20348",
      "osArch": "64-bit",
      "scanDate": "2026-04-14T10:05:00",
      "installDate": null
    }
  ],
  "totalElements": 125,
  "totalPages": 3,
  "size": 50,
  "number": 0
}
```

### 6.3 任务历史（分页）

```
GET /api/win-patch/tasks?taskType=SCAN&page=0&size=20
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskType | String | 否 | 筛选：`SCAN` / `INSTALL` / `ROLLBACK` / `CONN_TEST` |
| page | int | 否 | 页码（从0开始），默认 0 |
| size | int | 否 | 每页数量，默认 20 |

**响应** `200 OK` — `Page<WinPatchTask>`

```json
{
  "content": [
    {
      "id": "task-002",
      "taskType": "SCAN",
      "taskStatus": "COMPLETED",
      "runId": "jao-run-456",
      "rebootAfter": false,
      "hostCount": 2,
      "createdBy": "admin",
      "errorMessage": null,
      "createdDate": "2026-04-14T10:10:00",
      "completedDate": "2026-04-14T10:15:00"
    }
  ]
}
```

### 6.4 任务详情（含每一步骤的执行状态、结果与完整日志）

```
GET /api/win-patch/tasks/{taskId}
```

> 前端渲染任务详情页**只需要调这一个接口**。返回结构对齐 Linux 补丁的 `/api/vap/v2/patch/task/{id}/audit/detail`（多出 Windows 特有的 `hosts` 数组）。
>
> ```
> 返回结构 = {task, hosts, steps, logs}
> ```
>
> 回滚任务返回同一结构（主步骤从 `INSTALL` 变为 `ROLLBACK`）；扫描任务不参与 4 步流程，`steps` 和 `logs` 为空数组。

**响应** `200 OK`

```json
{
  "task": {
    "id": "task-002",
    "taskType": "INSTALL",
    "taskStatus": "PENDING",
    "currentStep": "RESTART",
    "rebootAfter": true,
    "restartType": "SERVICE",
    "serviceNames": "W3SVC,MSSQLSERVER",
    "hostCount": 2,
    "preCheckRunId": "jao-run-aaa",
    "executeRunId":  "jao-run-bbb",
    "restartRunId":  null,
    "validateRunId": null,
    "preCheckScript": "Write-Output 'pre-check OK'\nexit 0",
    "validateScript": null,
    "errorMessage": null,
    "createdBy": "admin",
    "tenantId": "tenant-001",
    "createdDate": "2026-04-14T10:10:00",
    "completedDate": null
  },
  "hosts": [
    {
      "id": "th-001",
      "taskId": "task-002",
      "hostId": "host-001",
      "hostKey": "192.168.1.100",
      "selectedKbs": "KB5035857,KB5036892",
      "status": "SUCCESS",
      "errorMessage": null,
      "startedDate": "2026-04-14T10:10:00",
      "completedDate": "2026-04-14T10:12:00"
    },
    {
      "id": "th-002",
      "taskId": "task-002",
      "hostId": "host-002",
      "hostKey": "192.168.1.101",
      "selectedKbs": "KB5035857",
      "status": "FAILED",
      "errorMessage": "WinRM connection timeout",
      "startedDate": "2026-04-14T10:10:00",
      "completedDate": "2026-04-14T10:13:00"
    }
  ],
  "steps": [
    {
      "step": "PRE_CHECK",
      "label": "预检查",
      "status": "SUCCESS",
      "remark": "预检查执行成功",
      "runId": "jao-run-aaa",
      "logs": [ /* 本步骤的原始操作记录（PatchOperationLog） */ ]
    },
    {
      "step": "INSTALL",
      "label": "补丁安装",
      "status": "SUCCESS",
      "remark": "补丁安装执行成功",
      "runId": "jao-run-bbb",
      "logs": [ /* ... */ ]
    },
    {
      "step": "RESTART",
      "label": "重启",
      "status": "RUNNING",
      "remark": "重启开始执行",
      "runId": "jao-run-ccc",
      "logs": [ /* ... */ ]
    },
    {
      "step": "VALIDATE",
      "label": "脚本校验",
      "status": "PENDING",
      "remark": "等待执行",
      "runId": null,
      "logs": []
    }
  ],
  "logs": [
    /* 整个任务从创建、脚本上传/编辑、每步派发/完成/失败/跳过 的完整时间线，按 seqNo 升序 */
  ]
}
```

**字段说明**

| 顶层字段 | 含义 |
|---------|------|
| `task` | `WinPatchTask` 实体，包含 `currentStep`、每一步骤的 runId、脚本内容、重启配置、错误信息 |
| `hosts` | 任务下每台主机的执行状态（Windows 特有，Linux 以单主机为粒度，无此维度） |
| `steps` | 固定 4 项：`PRE_CHECK` → 主步骤(`INSTALL`/`ROLLBACK`) → `RESTART` → `VALIDATE`，每项含：`step, label, status, remark, runId, logs` |
| `logs` | 整条审计日志时间线（`PatchOperationLog`），`seqNo` 升序 |

**`steps[].status` 取值**

| 值 | 含义 |
|----|------|
| `PENDING` | 尚未到达该步骤 |
| `RUNNING` | 已派发，等待回调 |
| `SUCCESS` | 执行成功 |
| `FAILED` | 执行失败，`remark`/对应 `logs[].errorMessage` 给出原因 |
| `SKIPPED` | 自动或手动跳过（如脚本为空、无需重启、用户跳过） |

**`steps` 状态推导规则**（与 Linux `buildAuditDetail` 完全一致）

1. 优先从 `vap2_patch_operation_log` 中按 `step` 取**最新**一条日志，根据 `action`/`status` 推导：
   `COMPLETE/SUCCESS → SUCCESS`，`FAILED → FAILED`，`SKIP → SKIPPED`，其余视为 `RUNNING`
2. 若该步骤没有日志（老任务或写入异常），回退读 `WinPatchTask` 的 per-step runId 和 `currentStep`/`taskStatus` 推断
3. `logs` 字段直接返回该步骤名下的所有原始日志，便于前端展开查看脚本内容、输出、错误详情等

### 6.5 安装/回滚历史（分页）

```
GET /api/win-patch/install-logs?hostId=host-001&page=0&size=20
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostId | String | 否 | 按主机筛选 |
| page | int | 否 | 页码，默认 0 |
| size | int | 否 | 每页数量，默认 20 |

**响应** `200 OK` — `Page<WinPatchInstallLog>`

```json
{
  "content": [
    {
      "id": "log-001",
      "taskId": "task-003",
      "hostId": "host-001",
      "hostKey": "192.168.1.100",
      "kbNumber": "KB5035857",
      "title": "2026-03 Cumulative Update",
      "action": "INSTALL",
      "result": "SUCCESS",
      "errorMessage": null,
      "executedDate": "2026-04-14T11:05:00"
    }
  ]
}
```

---

## 7. 批量导出

### 7.1 导出 Windows 补丁扫描报告（Excel）

```
POST /api/win-patch/export
```

**Content-Type:** `application/json`

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | String[] | 否 | 限定导出的主机范围，不传则导出全部 |
| severity | String | 否 | 按严重级别筛选：`Critical` / `Important` / `Moderate` / `Low` / `Unspecified` |
| patchStatus | String | 否 | 按补丁状态筛选：`MISSING` / `INSTALLED` / `INSTALL_FAILED` 等 |

**请求示例**

```json
{
  "hostIds": ["host-001", "host-002"],
  "severity": "Critical",
  "patchStatus": "MISSING"
}
```

导出全部（不传筛选条件）：

```json
{}
```

**成功响应**

- **HTTP 200**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment;filename=Windows%E8%A1%A5%E4%B8%81%E6%89%AB%E6%8F%8F%E6%8A%A5%E5%91%8A.xlsx`
- **Body:** `.xlsx` 二进制流

**Excel 结构**

| Sheet | 名称 | 列 |
|-------|------|-----|
| 1 | 主机概况 | 主机IP、操作系统、OS版本、架构、缺失补丁总数、严重、重要、中等、低危、已安装、最后扫描时间 |
| 2 | 补丁明细 | 主机IP、KB编号、补丁标题、严重级别、分类、补丁状态、操作系统、OS版本、扫描时间、安装时间 |
| 3 | 统计概览 | 统计项、数值（扫描主机总数、缺失补丁总数、各级别数量、已安装总数） |

**前端调用示例**

```javascript
async function exportWinPatches(filters) {
  const response = await fetch('/api/win-patch/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
    credentials: 'include'
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Windows补丁扫描报告.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 8. 回调接口（JAO 内部调用）

> 以下接口由 JAO 在任务完成时自动调用，**前端无需关注**。

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/win-patch/callback/scan` | POST | 扫描结果回调 |
| `/api/win-patch/callback/install` | POST | 安装结果回调 |
| `/api/win-patch/callback/rollback` | POST | 回滚结果回调 |
| `/api/win-patch/callback/pre-check` | POST | 预检查结果回调 |
| `/api/win-patch/callback/restart` | POST | 重启结果回调 |
| `/api/win-patch/callback/validate` | POST | 验证结果回调 |

**回调处理日志写入规则**

所有回调处理完成后，自动写入以下日志表（与 Linux 补丁流程共用同一套日志体系）：

| 日志表 | 说明 |
|--------|------|
| `vap2_patch_operation_log` | 步骤级操作审计日志，记录每个步骤的执行/完成/失败/跳过 |
| `jao_audit_log` | 平台级审计日志，记录 JAO 任务的启动和最终状态 |

写入时机：
- **任务创建时**：写入 `TASK_CREATED` 记录
- **步骤派发时**：写入 `EXECUTE`（RUNNING）记录，同时 `auditService.logActionStart`
- **回调成功时**：写入 `COMPLETE`（SUCCESS）记录，同时 `auditService.updateOperation(COMPLETED)`
- **回调失败时**：写入 `FAILED` 记录，同时 `auditService.updateOperation(FAILED)`
- **步骤跳过时**：写入 `SKIP`（SKIPPED）记录

> **注意**：`win_patch_install_log` 仍然保留，用于记录每个 KB 的安装/回滚明细（业务数据）。
> 执行日志（步骤级审计）统一写入 `vap2_patch_operation_log`，不再另设 Windows 专用日志表。

---

## 9. 执行日志查询（与任务详情接口功能等价）

> **前端主通道**：直接使用 [6.4 任务详情](#64-任务详情含每一步骤的执行状态结果与完整日志)，返回的 `steps` + `logs` 已经包含了所有审计信息，无需再调用下面两个接口。
>
> 下面两个接口保留是为了：(a) 与 Linux `/api/vap/v2/patch/task/{id}/audit/*` 对齐，便于后端共享视图逻辑；(b) 批量下载/外部审计工具按"任务 → 日志"的线性查询习惯使用。

Windows 补丁任务的执行日志与 Linux 补丁任务共用 `vap2_patch_operation_log` 表。

### 9.1 任务操作日志列表

```
GET /api/win-patch/tasks/{id}/audit/logs
```

返回 `List<PatchOperationLog>`，按 `seqNo` 升序。等价于 [6.4](#64-任务详情含每一步骤的执行状态结果与完整日志) 返回结构中的 `logs` 字段。

### 9.2 流程操作详情

```
GET /api/win-patch/tasks/{id}/audit/detail
```

返回 `{task, steps, logs}`，与 Linux `/api/vap/v2/patch/task/{id}/audit/detail` 完全一致。等价于 [6.4](#64-任务详情含每一步骤的执行状态结果与完整日志) 去掉 `hosts` 后的子集。

> `vap2_patch_operation_log.task_type` 均写入小写（`install` / `rollback`），便于 Linux / Windows 共用 `buildAuditDetail` 等聚合逻辑。

---

## 10. 数据字典

### 10.1 任务类型 (taskType)

| 值 | 说明 |
|----|------|
| SCAN | 补丁扫描 |
| INSTALL | 补丁安装 |
| ROLLBACK | 补丁回滚 |

### 10.2 任务状态 (taskStatus)

| 值 | 说明 |
|----|------|
| PENDING | 待执行 |
| RUNNING | 执行中 |
| COMPLETED | 已完成 |
| FAILED | 失败 |

### 10.3 补丁状态 (patchStatus)

| 值 | 中文 | 说明 |
|----|------|------|
| MISSING | 缺失 | 扫描发现主机缺少该补丁 |
| INSTALLED | 已安装 | 补丁已安装 |
| INSTALLING | 安装中 | 正在执行安装 |
| INSTALL_FAILED | 安装失败 | 安装失败 |
| ROLLING_BACK | 回滚中 | 正在执行回滚 |
| ROLLBACK_FAILED | 回滚失败 | 回滚失败 |

### 10.4 严重级别 (severity)

| 值 | 中文 | CVSS 参考 |
|----|------|-----------|
| Critical | 严重 | 9.0 - 10.0 |
| Important | 重要 | 7.0 - 8.9 |
| Moderate | 中等 | 4.0 - 6.9 |
| Low | 低危 | 0.1 - 3.9 |
| Unspecified | 未分类 | 无/未知（MSRC 未标注 CVSS 时回落此档） |
| Unspecified | 未指定 | 无评分 |

### 10.5 安装日志操作 (action)

| 值 | 说明 |
|----|------|
| INSTALL | 安装操作 |
| ROLLBACK | 回滚操作 |

### 10.6 安装日志结果 (result)

| 值 | 说明 |
|----|------|
| SUCCESS | 操作成功 |
| FAILED | 操作失败（errorMessage 中有具体原因） |

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-14 | 初版：包含 WSUS 配置、扫描、安装、回滚、查询、导出全部接口 |
| 2026-04-14 | 增强：扫描支持类别过滤（13种类别）、安装/回滚支持自动重扫、补丁明细支持 severity/status/keyword 筛选、playbook 增加 reboot + wait_for_connection 完整重启流程 |
| 2026-04-14 | **统一扫描模式**：扫描接口新增 `scanMode` 参数（`auto`/`online`/`wsus`） |
| 2026-04-15 | **清理冗余**：移除连通性测试（conn-test）接口和脚本；移除旧版 `oplus-vap-windows` legacy 脚本；删除 `com.famessoft.oplus.win` 废弃代码 |
| 2026-04-16 | **统一回调增强**：Linux 统一回调端点（`/api/vap/v2/callback/scan\|update\|fallback`）新增 `osType` 可选参数，支持 `linux`/`windows`，默认 `linux`；安装回调 `onInstallComplete()` 补全审计日志写入 |
| 2026-04-17 | **执行日志统一**：Windows 扫描/安装/回滚执行日志统一写入 `vap2_patch_operation_log` 和 `jao_audit_log`，与 Linux 共用同一套日志体系，不再另设 Windows 专用执行日志表。新增第 8 章「执行日志查询」说明 |
