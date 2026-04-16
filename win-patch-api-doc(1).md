# Windows 补丁管理 — 前端接口文档

> **Base URL**: `http://{oplus-host}/oplus-portal/vap`
>
> **认证**: 所有接口需要 Shiro 登录态，`/api/win-patch/**` 需要 `ROLE_PRIVUSER` 角色。
>
> **版本**: 2026-04-15（移除连通性测试接口，清理旧版代码）

---

## 目录

- [一、WSUS 配置管理](#一wsus-配置管理)
- [二、补丁扫描](#二补丁扫描)
- [三、补丁安装](#三补丁安装)
- [四、补丁回滚](#四补丁回滚)
- [五、任务步骤控制](#五任务步骤控制)
- [六、数据查询](#六数据查询)
- [七、Excel 导出](#七excel-导出)
- [八、Windows CVE 查询](#八windows-cve-查询)
- [九、数据字典](#九数据字典)

---

## 一、WSUS 配置管理

### 1.1 保存/更新 WSUS 配置

```
POST /api/win-patch/wsus-config
```

**请求体**:

```json
{
  "id": null,
  "wsusUrl": "http://wsus.example.com",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "总部WSUS服务器"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | String | 否 | 为空则新建，不为空则更新 |
| wsusUrl | String | 是 | WSUS 服务器地址 |
| wsusPort | Integer | 是 | 端口号 |
| useSsl | Boolean | 是 | 是否使用 SSL |
| description | String | 否 | 备注说明 |

> `tenantId` 由后端自动填充，前端无需传入。

**响应**: `200 OK`

```json
{
  "id": "abc123",
  "wsusUrl": "http://wsus.example.com",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "总部WSUS服务器",
  "tenantId": "tenant01",
  "createdDate": "2026-04-10T10:30:00",
  "updatedDate": null
}
```

### 1.2 查询 WSUS 配置列表

```
GET /api/win-patch/wsus-config
```

**响应**: `200 OK` — `List<WsusConfig>`

### 1.3 删除 WSUS 配置

```
DELETE /api/win-patch/wsus-config/{id}
```

**响应**: `200 OK`（空 body）

---

## 二、补丁扫描

### 2.1 创建扫描任务

```
POST /api/win-patch/tasks/scan
```

**请求体**:

```json
{
  "hostIds": ["host-001", "host-002"],
  "wsusConfigId": null,
  "categories": "SecurityUpdates,CriticalUpdates",
  "rescanAfter": false,
  "scanMode": "auto"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | List\<String\> | 是 | ACM 中的主机 ID 列表 |
| wsusConfigId | String | 否 | 指定 WSUS 配置 ID，为空时使用租户默认配置 |
| categories | String | 否 | 扫描分类过滤，逗号分隔。可选值: `SecurityUpdates`, `CriticalUpdates`, `UpdateRollups`, `Updates`, `DefinitionUpdates`, `ServicePacks`, `Tools`, `FeaturePacks`, `Drivers` |
| rescanAfter | boolean | 否 | 安装/回滚后是否自动重新扫描（默认 false） |
| scanMode | String | 否 | 扫描模式，默认 `"auto"` |

**scanMode 取值**:

| 值 | 说明 |
|----|------|
| `auto` | 自动选择：有 WSUS 配置则走 WSUS，否则走在线（默认） |
| `online` | 强制在线扫描（直连 Microsoft Windows Update） |
| `wsus` | 强制 WSUS 扫描，无配置时报错 |

**响应**: `200 OK` — `WinPatchTask`

```json
{
  "id": "task-uuid-001",
  "taskType": "SCAN",
  "taskStatus": "RUNNING",
  "currentStep": null,
  "runId": "jao-run-001",
  "rebootAfter": false,
  "hostCount": 2,
  "createdBy": null,
  "errorMessage": null,
  "tenantId": "tenant01",
  "createdDate": "2026-04-15T09:00:00",
  "completedDate": null
}
```

> 扫描任务创建后立即提交 JAO 执行，无需额外步骤控制。
> 扫描结果通过回调异步写入，前端需要轮询任务状态或主机列表来获取最新数据。

---

## 三、补丁安装

### 3.1 创建安装任务

```
POST /api/win-patch/tasks/install
```

**请求体**:

```json
{
  "patchStatusIds": ["ps-001", "ps-002", "ps-003"],
  "reboot": true,
  "rescanAfter": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patchStatusIds | List\<String\> | 是 | `win_patch_host_status` 表记录 ID（待安装的补丁行） |
| reboot | boolean | 否 | 安装完成后是否重启主机（默认 false） |
| rescanAfter | boolean | 否 | 安装完成后是否自动重新扫描（默认 false） |

**响应**: `200 OK` — `WinPatchTask`（`taskType=INSTALL`, `currentStep=PRE_CHECK`）

> 安装任务创建后 **不会自动执行**。前端需要逐步调用 `execute-step` 或 `skip-step` 来推进任务。
> 步骤流程: `PRE_CHECK` → `EXECUTE` → `RESTART` → `VALIDATE` → `COMPLETED`

---

## 四、补丁回滚

### 4.1 创建回滚任务

```
POST /api/win-patch/tasks/rollback
```

**请求体**:

```json
{
  "installLogIds": ["log-001", "log-002"],
  "reboot": true,
  "rescanAfter": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| installLogIds | List\<String\> | 是 | `win_patch_install_log` 表中安装成功记录的 ID |
| reboot | boolean | 否 | 回滚后是否重启（默认 false） |
| rescanAfter | boolean | 否 | 回滚后是否重新扫描（默认 false） |

**响应**: `200 OK` — `WinPatchTask`（结构同安装任务，`taskType=ROLLBACK`）

---

## 五、任务步骤控制

安装/回滚任务遵循四步流程：

```
PRE_CHECK → EXECUTE → RESTART → VALIDATE → COMPLETED
```

### 5.1 执行当前步骤

```
POST /api/win-patch/tasks/{id}/execute-step
```

**前置条件**: 任务 `taskStatus` 必须为 `PENDING`。

**各步骤映射**:

| currentStep | func 参数 | 回调路径 |
|-------------|-----------|----------|
| PRE_CHECK | `pre-check` | `/api/win-patch/callback/pre-check` |
| EXECUTE（安装） | `install` | `/api/win-patch/callback/install` |
| EXECUTE（回滚） | `rollback` | `/api/win-patch/callback/rollback` |
| RESTART | `restart` | `/api/win-patch/callback/restart` |
| VALIDATE | `validate` | `/api/win-patch/callback/validate` |

**响应**: `200 OK` — 更新后的 `WinPatchTask`

### 5.2 跳过当前步骤

```
POST /api/win-patch/tasks/{id}/skip-step
```

**限制**: `EXECUTE` 步骤不可跳过。其他步骤（`PRE_CHECK`、`RESTART`、`VALIDATE`）均可跳过。

**响应**: `200 OK` — 更新后的 `WinPatchTask`

### 5.3 前端推荐交互流程

```
创建任务 → taskStatus=PENDING, currentStep=PRE_CHECK
    ├─ 用户点击"执行" → POST /execute-step → taskStatus=RUNNING
    │   回调返回后 → taskStatus=PENDING, currentStep=EXECUTE
    │       ├─ 用户点击"执行" → POST /execute-step → 执行安装/回滚
    │       │   回调返回后 → currentStep=RESTART
    │       │       ├─ 用户选择"执行"重启 → POST /execute-step
    │       │       └─ 用户选择"跳过"重启 → POST /skip-step
    │       │   → currentStep=VALIDATE
    │       │       ├─ 用户选择"执行"验证 → POST /execute-step
    │       │       └─ 用户选择"跳过"验证 → POST /skip-step
    │       │   → taskStatus=COMPLETED
    └─ 用户点击"跳过" → POST /skip-step → currentStep=EXECUTE
```

---

## 六、数据查询

### 6.1 主机扫描概览（分页）

```
GET /api/win-patch/hosts?page=0&size=20
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | 否 | 0 | 页码（从0开始） |
| size | int | 否 | 20 | 每页条数 |

**响应**: `200 OK` — `Page<WinHostScanSummary>`

```json
{
  "content": [
    {
      "id": "sum-001",
      "hostId": "host-001",
      "hostKey": "10.1.0.100",
      "osDistro": "Windows Server 2019",
      "osVersion": "10.0.17763",
      "osArch": "x64",
      "totalMissing": 15,
      "criticalCount": 3,
      "importantCount": 7,
      "moderateCount": 4,
      "lowCount": 1,
      "installedCount": 120,
      "lastScanDate": "2026-04-15T09:30:00",
      "lastScanRunId": "jao-run-001",
      "tenantId": "tenant01"
    }
  ],
  "totalElements": 50,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

### 6.2 主机补丁明细（分页、可筛选）

```
GET /api/win-patch/hosts/{hostId}/patches?severity=Critical&patchStatus=MISSING&keyword=KB5012&page=0&size=50
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostId | String | 是 | 路径参数：主机 ID |
| severity | String | 否 | 按严重级别筛选: `Critical`/`Important`/`Moderate`/`Low` |
| patchStatus | String | 否 | 按补丁状态筛选: `MISSING`/`INSTALLED`/`INSTALLING`/`INSTALL_FAILED` 等 |
| keyword | String | 否 | 搜索 KB 编号或标题 |
| page | int | 否 | 页码（默认 0） |
| size | int | 否 | 每页条数（默认 50） |

**响应**: `200 OK` — `Page<WinHostPatchStatus>`

### 6.3 任务列表（分页）

```
GET /api/win-patch/tasks?taskType=SCAN&page=0&size=20
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskType | String | 否 | 任务类型筛选: `SCAN`/`INSTALL`/`ROLLBACK` |
| page | int | 否 | 页码（默认 0） |
| size | int | 否 | 每页条数（默认 20） |

**响应**: `200 OK` — `Page<WinPatchTask>`

### 6.4 任务详情（含每台主机执行状态）

```
GET /api/win-patch/tasks/{taskId}
```

**响应**: `200 OK` — `TaskDetail`

```json
{
  "task": { "id": "...", "taskType": "SCAN", "taskStatus": "COMPLETED", ... },
  "hosts": [
    { "id": "...", "hostId": "host-001", "hostKey": "10.1.0.100", "status": "SUCCESS", ... }
  ]
}
```

### 6.5 安装/回滚日志（分页）

```
GET /api/win-patch/install-logs?hostId=host-001&page=0&size=20
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostId | String | 否 | 按主机筛选 |
| page | int | 否 | 页码 |
| size | int | 否 | 每页条数 |

**响应**: `200 OK` — `Page<WinPatchInstallLog>`

> 前端创建回滚任务时，需要从此接口获取 `action=INSTALL` 且 `result=SUCCESS` 的日志 ID 作为 `installLogIds` 参数。

---

## 七、Excel 导出

### 7.1 导出补丁扫描报告

```
POST /api/win-patch/export
```

**请求体**:

```json
{
  "hostIds": ["host-001", "host-002"],
  "severity": "Critical",
  "patchStatus": "MISSING"
}
```

**响应**: 二进制流 — `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

文件名: `Windows补丁扫描报告.xlsx`，包含三个 Sheet：主机概览、补丁明细、统计信息。

---

## 八、Windows CVE 查询

> 以下接口用于查询 MSRC CVE 漏洞信息，独立于补丁扫描/安装流程。

### 8.1 分页查询 CVE 列表

```
GET /api/vap/v2/win-cve/list?severity=Critical&keyword=RCE&startDate=2026-01-01&endDate=2026-04-15&page=0&size=20&sortBy=publicDate&sortDir=desc
```

### 8.2 CVE 详情

```
GET /api/vap/v2/win-cve/detail/{cveId}
```

### 8.3 统计概览

```
GET /api/vap/v2/win-cve/statistics
```

### 8.4 受影响产品列表

```
GET /api/vap/v2/win-cve/affected/{cveId}
```

---

## 九、数据字典

### 9.1 任务类型 (taskType)

| 值 | 说明 |
|----|------|
| `SCAN` | 补丁扫描 |
| `INSTALL` | 补丁安装 |
| `ROLLBACK` | 补丁回滚 |

### 9.2 任务状态 (taskStatus)

| 值 | 说明 |
|----|------|
| `PENDING` | 等待执行（安装/回滚任务等待用户操作步骤） |
| `RUNNING` | 正在执行（JAO 远程任务进行中） |
| `COMPLETED` | 已完成 |
| `FAILED` | 失败 |

### 9.3 任务步骤 (currentStep)

| 值 | 说明 | 可跳过 |
|----|------|--------|
| `PRE_CHECK` | 预检查 | 是 |
| `EXECUTE` | 执行安装/回滚 | **否** |
| `RESTART` | 重启主机 | 是 |
| `VALIDATE` | 安装后验证 | 是 |
| `COMPLETED` | 已完成（终态） | — |

### 9.4 补丁状态 (patchStatus)

| 值 | 说明 |
|----|------|
| `MISSING` | 缺失（待安装） |
| `INSTALLED` | 已安装 |
| `INSTALLING` | 安装中 |
| `INSTALL_FAILED` | 安装失败 |
| `ROLLING_BACK` | 回滚中 |
| `ROLLBACK_FAILED` | 回滚失败 |

### 9.5 严重级别 (severity)

| 值 | 说明 |
|----|------|
| `Critical` | 严重 |
| `Important` | 重要 |
| `Moderate` | 中等 |
| `Low` | 低 |
| `Unspecified` | 未分级 |

### 9.6 扫描模式 (scanMode)

| 值 | 说明 |
|----|------|
| `auto` | 自动：有 WSUS 配置走 WSUS，否则在线 |
| `online` | 强制在线扫描（Microsoft Windows Update） |
| `wsus` | 强制 WSUS 扫描（无配置报错） |

---

## 附录：接口总览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/win-patch/wsus-config` | 保存 WSUS 配置 |
| GET | `/api/win-patch/wsus-config` | 查询 WSUS 配置列表 |
| DELETE | `/api/win-patch/wsus-config/{id}` | 删除 WSUS 配置 |
| POST | `/api/win-patch/tasks/scan` | 创建扫描任务 |
| POST | `/api/win-patch/tasks/install` | 创建安装任务 |
| POST | `/api/win-patch/tasks/rollback` | 创建回滚任务 |
| POST | `/api/win-patch/tasks/{id}/execute-step` | 执行当前步骤 |
| POST | `/api/win-patch/tasks/{id}/skip-step` | 跳过当前步骤 |
| GET | `/api/win-patch/hosts` | 主机扫描概览 |
| GET | `/api/win-patch/hosts/{hostId}/patches` | 主机补丁明细 |
| GET | `/api/win-patch/tasks` | 任务列表 |
| GET | `/api/win-patch/tasks/{taskId}` | 任务详情 |
| GET | `/api/win-patch/install-logs` | 安装/回滚日志 |
| POST | `/api/win-patch/export` | 导出 Excel 报告 |
| GET | `/api/vap/v2/win-cve/list` | CVE 列表 |
| GET | `/api/vap/v2/win-cve/detail/{cveId}` | CVE 详情 |
| GET | `/api/vap/v2/win-cve/statistics` | CVE 统计 |
| GET | `/api/vap/v2/win-cve/affected/{cveId}` | CVE 受影响产品 |

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-15 | **清理版本**：移除连通性测试（conn-test）接口；移除旧版 `oplus-vap-windows` legacy 脚本；Playbook 仅保留 scan/install/rollback 三个 func；脚本仅保留 3 个 `.ps1` |
