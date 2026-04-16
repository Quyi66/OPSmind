# Windows WSUS 离线补丁管理 - 接口文档与实现方案

## 目录

- [1. 概述](#1-概述)
- [2. 系统架构](#2-系统架构)
- [3. 业务流程](#3-业务流程)
  - [3.1 补丁扫描流程](#31-补丁扫描流程)
  - [3.2 补丁安装流程](#32-补丁安装流程)
  - [3.3 补丁回滚流程](#33-补丁回滚流程)
- [4. 数据模型](#4-数据模型)
- [5. REST API 接口](#5-rest-api-接口)
  - [5.1 WSUS 配置管理](#51-wsus-配置管理)
  - [5.2 任务操作](#52-任务操作)
  - [5.3 回调接口（JAO 内部调用）](#53-回调接口jao-内部调用)
  - [5.4 查询接口](#54-查询接口)
- [6. PowerShell 脚本说明](#6-powershell-脚本说明)
- [7. Ansible Playbook 说明](#7-ansible-playbook-说明)
- [8. 状态机定义](#8-状态机定义)
- [9. 部署说明](#9-部署说明)

---

## 1. 概述

本模块实现了在 **离线（air-gapped）网络环境** 下，基于本地 WSUS（Windows Server Update Services）服务器，对 Windows 服务器进行补丁扫描、安装、回滚的全流程管理。

### 前置条件

| 条件 | 说明 |
|------|------|
| WSUS 服务器 | 在离线网络中部署 WSUS 服务器，通过离线介质导入补丁 |
| 目标主机配置 | Windows 服务器的 Windows Update Agent 配置指向本地 WSUS（通过组策略或注册表） |
| JAO 服务 | oplus-jao 服务正常运行，Ansible 引擎可达目标 Windows 主机 |
| WinRM | 目标 Windows 主机已开启 WinRM 服务，允许 Ansible 通过 WinRM 连接 |

### 技术栈

- 后端：Java 8 / Spring Boot 2.7.3 / Spring Data JPA / MySQL 8
- 远程执行：JAO + Ansible（`win_shell` 模块）
- 目标脚本：PowerShell 5.1+（Windows Server 2016/2019/2022）
- 补丁源：WSUS 服务器（`Microsoft.Update.Session` COM 接口）

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     oplus Platform (Java Backend)               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │ REST API    │  │ Service     │  │ JPA / MySQL             ││
│  │ Controllers │──│ Layer       │──│ 6 tables (win_patch_*)  ││
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘│
│         │                │                                      │
│         │         ┌──────┴──────┐                               │
│         │         │ Dispatcher  │── JAO (ScriptJob)             │
│         │         └─────────────┘                               │
│         │                                                       │
│  ┌──────┴──────┐                                                │
│  │ Callback    │◄── JAO 回调 POST                              │
│  │ Processors  │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ JAO + Ansible                │ HTTP Callback
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│              Target Windows Servers                              │
│  ┌────────────────────────────────────────────┐                 │
│  │ PowerShell Scripts (via Ansible win_shell)  │                 │
│  │  • Scan-WsusPatches.ps1                     │                 │
│  │  • Install-WsusPatches.ps1                  │                 │
│  │  • Rollback-WsusPatches.ps1                 │                 │
│  └─────────────────┬──────────────────────────┘                 │
│                    │                                             │
│                    ▼                                             │
│           Windows Update Agent (COM)                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              WSUS Server (Offline)                               │
│  • 补丁仓库（离线导入 .cab/.wsus 文件）                            │
│  • 更新审批管理                                                   │
│  • 客户端报告                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 业务流程

### 3.1 补丁扫描流程

```
用户发起扫描请求
       │
       ▼
POST /api/win-patch/tasks/scan
  body: { hostIds: ["host-001", "host-002"] }
       │
       ▼
┌─ 平台处理 ─────────────────────────────────────────────────┐
│ 1. 查询 WSUS 配置（获取 wsus_url）                          │
│ 2. 创建 WinPatchTask 记录（type=SCAN, status=PENDING）      │
│ 3. 为每个 hostId 创建 WinPatchTaskHost 记录                  │
│ 4. 构建 JAO ScriptJob：                                     │
│    - func = "scan"                                          │
│    - wsus_url = "http://wsus.local:8530"                    │
│    - callback = "http://oplus-ip/...callback/scan"          │
│ 5. 通过 JobFacade 提交到 JAO                                │
│ 6. 更新 Task status → RUNNING, 记录 runId                   │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 调度 Ansible
       │
┌─ 目标主机执行 ──────────────────────────────────────────────┐
│ Ansible playbook (site.yml):                                │
│ 1. 创建远程目录 C:\oplus\win-patch-wsus\                    │
│ 2. 复制 PS 脚本到远程主机                                    │
│ 3. 执行 Scan-WsusPatches.ps1：                              │
│    a. （可选）写注册表指向 WSUS                               │
│    b. 创建 Microsoft.Update.Session                          │
│    c. 查询 IsInstalled=0 (缺失) 和 IsInstalled=1 (已装)     │
│    d. 收集 KB号、标题、严重级别、分类、安装状态                  │
│    e. 输出 JSON 到 result_file                               │
│ 4. fetch 回收 JSON 结果文件                                  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 回调
       │
POST /api/win-patch/callback/scan
  body: JaoCallbackData { runId, batches[].result.scanResultFile }
       │
       ▼
┌─ 回调处理（异步） ─────────────────────────────────────────┐
│ WinScanCallbackProcessor.processScanCallback():             │
│ 1. 从 callbackData 提取结果文件路径                          │
│ 2. 解析 JSON，遍历每台主机的 updates 列表                    │
│ 3. 对每个 KB 执行 upsert：                                  │
│    - 存在 → 更新 severity/title/status/scanDate             │
│    - 不存在 → 新增 WinHostPatchStatus (status=MISSING)      │
│ 4. 对本次扫描中未出现但之前为 MISSING 的 KB → 标记 INSTALLED│
│ 5. 刷新 WinHostScanSummary（按严重级别统计）                 │
│ 6. 更新 TaskHost status → SUCCESS                           │
│ 7. 更新 Task status → COMPLETED                             │
│ 8. 更新审计日志                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 补丁安装流程

```
用户选择要安装的补丁（从扫描结果中勾选 MISSING 状态的 KB）
       │
       ▼
POST /api/win-patch/tasks/install
  body: { patchStatusIds: ["id1", "id2", ...], reboot: false }
       │
       ▼
┌─ 平台处理 ─────────────────────────────────────────────────┐
│ 1. 加载所选的 WinHostPatchStatus 记录                       │
│ 2. 按 hostId 分组，每台主机收集 KB 列表                      │
│ 3. 创建 WinPatchTask 记录（type=INSTALL）                   │
│ 4. 创建 WinPatchTaskHost 记录                               │
│ 5. 将所选补丁状态更新为 INSTALLING                           │
│ 6. 构建 JAO ScriptJob：                                     │
│    - func = "install"                                       │
│    - reboot = "yes" / "no"                                  │
│    - 每台主机 vars: { update_kbs: "KB123,KB456" }           │
│ 7. 提交 JAO，更新 Task status → RUNNING                     │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 调度 Ansible → 目标主机
       │
┌─ 目标主机执行 ──────────────────────────────────────────────┐
│ Install-WsusPatches.ps1：                                   │
│ 1. 解析 KB 列表                                             │
│ 2. 在 WSUS 可用更新中搜索匹配的 KB                           │
│ 3. 接受 EULA                                                │
│ 4. 下载更新（从 WSUS 服务器）                                │
│ 5. 安装更新                                                 │
│ 6. 记录每个 KB 的安装结果（SUCCESS / FAILED + 错误码）       │
│ 7. 如果 reboot=yes 且需要重启 → 30秒后自动重启              │
│ 8. 输出 JSON 结果                                           │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 回调
       │
POST /api/win-patch/callback/install
       │
       ▼
┌─ 回调处理（异步） ─────────────────────────────────────────┐
│ WinInstallCallbackProcessor.processInstallCallback():       │
│ 1. 解析 JSON install_results                                │
│ 2. 对每个 KB：                                              │
│    - SUCCESS → 更新 PatchStatus 为 INSTALLED                │
│    - FAILED → 更新为 INSTALL_FAILED                         │
│ 3. 写入 WinPatchInstallLog（action=INSTALL）                │
│ 4. 更新 TaskHost status                                     │
│ 5. 更新 Task status → COMPLETED / FAILED                    │
│ 6. 更新审计日志                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 补丁回滚流程

```
用户从安装历史中选择要回滚的记录
       │
       ▼
POST /api/win-patch/tasks/rollback
  body: { installLogIds: ["log-id-1", "log-id-2"], reboot: false }
       │
       ▼
┌─ 平台处理 ─────────────────────────────────────────────────┐
│ 1. 加载所选的 WinPatchInstallLog 记录                       │
│ 2. 按 hostId 分组，每台主机收集 KB 列表                      │
│ 3. 创建 WinPatchTask（type=ROLLBACK）                       │
│ 4. 将对应补丁状态更新为 ROLLING_BACK                         │
│ 5. 构建 JAO ScriptJob：                                     │
│    - func = "rollback"                                      │
│    - 每台主机 vars: { update_kbs: "KB123,KB456" }           │
│ 6. 提交 JAO，更新 Task status → RUNNING                     │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 调度 Ansible → 目标主机
       │
┌─ 目标主机执行 ──────────────────────────────────────────────┐
│ Rollback-WsusPatches.ps1：                                  │
│ 1. 解析 KB 列表                                             │
│ 2. 尝试通过 WUA COM 接口卸载（IsUninstallable 检查）        │
│ 3. 若 WUA 不支持卸载 → 降级到 DISM /remove-package          │
│ 4. 记录每个 KB 的回滚结果                                    │
│ 5. 如果 reboot=yes 且执行了卸载 → 30秒后重启                │
│ 6. 输出 JSON 结果                                           │
└──────────────────────────────────────────────────────────────┘
       │
       ▼ JAO 回调
       │
POST /api/win-patch/callback/rollback
       │
       ▼
┌─ 回调处理（异步） ─────────────────────────────────────────┐
│ WinRollbackCallbackProcessor.processRollbackCallback():     │
│ 1. 解析 JSON rollback_results                               │
│ 2. 对每个 KB：                                              │
│    - SUCCESS → 更新 PatchStatus 为 MISSING（回到缺失状态）  │
│    - FAILED → 更新为 ROLLBACK_FAILED                        │
│ 3. 写入 WinPatchInstallLog（action=ROLLBACK）               │
│ 4. 更新 TaskHost / Task status                              │
│ 5. 更新审计日志                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 数据模型

### 4.1 表结构总览

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| `win_patch_wsus_config` | WSUS 服务器配置 | wsus_url, wsus_port, use_ssl |
| `win_patch_task` | 任务记录 | task_type, task_status, run_id |
| `win_patch_task_host` | 任务内主机执行状态 | task_id, host_id, status |
| `win_patch_host_status` | 主机补丁状态（核心表） | host_id, kb_number, patch_status, severity |
| `win_patch_host_summary` | 主机扫描汇总 | host_id, total_missing, critical_count |
| `win_patch_install_log` | 安装/回滚历史 | host_id, kb_number, action, result |

### 4.2 win_patch_wsus_config

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| wsus_url | VARCHAR(512) | WSUS 服务器 URL，如 `http://wsus.local:8530` |
| wsus_port | INT | WSUS 端口，默认 8530 |
| use_ssl | TINYINT(1) | 是否使用 HTTPS，0=否 1=是 |
| description | VARCHAR(512) | 配置描述 |
| tenant_id | VARCHAR(64) | 租户 ID |
| created_date | DATETIME | 创建时间 |
| updated_date | DATETIME | 更新时间 |

### 4.3 win_patch_task

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| task_type | VARCHAR(32) | 任务类型：`SCAN` / `INSTALL` / `ROLLBACK` |
| task_status | VARCHAR(32) | 任务状态：`PENDING` / `RUNNING` / `COMPLETED` / `FAILED` |
| run_id | VARCHAR(64) | JAO 运行 ID |
| reboot_after | TINYINT(1) | 操作后是否重启主机 |
| host_count | INT | 涉及主机数量 |
| created_by | VARCHAR(128) | 创建人 |
| error_message | TEXT | 错误信息 |
| tenant_id | VARCHAR(64) | 租户 ID |
| created_date | DATETIME | 创建时间 |
| completed_date | DATETIME | 完成时间 |

### 4.4 win_patch_task_host

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| task_id | VARCHAR(64) FK | 关联 win_patch_task.id |
| host_id | VARCHAR(64) | 主机 ID |
| host_key | VARCHAR(256) | 主机 IP 或 hostname |
| status | VARCHAR(32) | `PENDING` / `RUNNING` / `SUCCESS` / `FAILED` |
| error_message | TEXT | 错误信息 |
| started_date | DATETIME | 开始时间 |
| completed_date | DATETIME | 完成时间 |

### 4.5 win_patch_host_status（核心表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| host_id | VARCHAR(64) | 主机 ID |
| host_key | VARCHAR(256) | 主机 IP |
| kb_number | VARCHAR(32) | KB 编号，如 `KB5012345` |
| title | VARCHAR(1024) | 更新标题 |
| severity | VARCHAR(32) | 严重级别：`Critical` / `Important` / `Moderate` / `Low` / `Unspecified` |
| classification | VARCHAR(64) | 分类：`SecurityUpdates` / `CriticalUpdates` / `UpdateRollups` 等 |
| patch_status | VARCHAR(32) | 补丁状态（见状态机） |
| is_ignored | TINYINT(1) | 是否忽略 |
| os_distro | VARCHAR(128) | OS 发行版 |
| os_version | VARCHAR(128) | OS 版本号 |
| os_arch | VARCHAR(32) | 系统架构 |
| run_id | VARCHAR(64) | 最后扫描/安装的 run_id |
| scan_date | DATETIME | 最后扫描时间 |
| install_date | DATETIME | 安装时间 |
| tenant_id | VARCHAR(64) | 租户 ID |
| created_date | DATETIME | 创建时间 |
| updated_date | DATETIME | 更新时间 |

**唯一约束**：`UNIQUE (host_id, kb_number)` — 每台主机每个 KB 只有一条记录。

### 4.6 win_patch_host_summary

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| host_id | VARCHAR(64) UK | 主机 ID（唯一） |
| host_key | VARCHAR(256) | 主机 IP |
| os_distro | VARCHAR(128) | OS 发行版 |
| os_version | VARCHAR(128) | OS 版本号 |
| os_arch | VARCHAR(32) | 系统架构 |
| total_missing | INT | 缺失补丁总数 |
| critical_count | INT | 严重级别 Critical 数量 |
| important_count | INT | 严重级别 Important 数量 |
| moderate_count | INT | 严重级别 Moderate 数量 |
| low_count | INT | 严重级别 Low 数量 |
| installed_count | INT | 已安装补丁数量 |
| last_scan_date | DATETIME | 最后扫描时间 |
| last_scan_run_id | VARCHAR(64) | 最后扫描的 run_id |
| tenant_id | VARCHAR(64) | 租户 ID |

### 4.7 win_patch_install_log

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) PK | UUID 主键 |
| task_id | VARCHAR(64) | 关联 win_patch_task.id |
| host_id | VARCHAR(64) | 主机 ID |
| host_key | VARCHAR(256) | 主机 IP |
| kb_number | VARCHAR(32) | KB 编号 |
| title | VARCHAR(1024) | 更新标题 |
| action | VARCHAR(32) | 操作类型：`INSTALL` / `ROLLBACK` |
| result | VARCHAR(32) | 结果：`SUCCESS` / `FAILED` |
| error_message | TEXT | 错误信息 |
| executed_date | DATETIME | 执行时间 |
| tenant_id | VARCHAR(64) | 租户 ID |

---

## 5. REST API 接口

Base URL: `http://{oplus-host}/oplus-portal/vap`

所有接口均需携带认证 Token（`Authorization` Header）和租户 ID（`Tenant-Id` Header）。

---

### 5.1 WSUS 配置管理

#### 5.1.1 保存 WSUS 配置

```
POST /api/win-patch/wsus-config
```

**权限**：`ROLE_PRIVUSER`

**Request Body**:

```json
{
  "wsusUrl": "http://wsus.internal:8530",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "生产环境 WSUS 服务器"
}
```

> 如果传入 `id` 字段，则执行更新；否则新增。

**Response** `200 OK`:

```json
{
  "id": "ff80808189a1b2c3...",
  "wsusUrl": "http://wsus.internal:8530",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "生产环境 WSUS 服务器",
  "tenantId": "tenant-001",
  "createdDate": "2026-04-10T10:00:00",
  "updatedDate": null
}
```

#### 5.1.2 查询 WSUS 配置

```
GET /api/win-patch/wsus-config
```

**权限**：`ROLE_PRIVUSER`

**Response** `200 OK`:

```json
[
  {
    "id": "ff80808189a1b2c3...",
    "wsusUrl": "http://wsus.internal:8530",
    "wsusPort": 8530,
    "useSsl": false,
    "description": "生产环境 WSUS 服务器",
    "tenantId": "tenant-001",
    "createdDate": "2026-04-10T10:00:00",
    "updatedDate": null
  }
]
```

#### 5.1.3 删除 WSUS 配置

```
DELETE /api/win-patch/wsus-config/{id}
```

**权限**：`ROLE_PRIVUSER`

**Response** `200 OK`（无 body）

---

### 5.2 任务操作

#### 5.2.1 创建扫描任务

```
POST /api/win-patch/tasks/scan
```

**权限**：`ROLE_PRIVUSER`

**Request Body**:

```json
{
  "hostIds": ["host-001", "host-002", "host-003"],
  "wsusConfigId": "ff80808189a1b2c3..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 要扫描的主机 ID 列表（ACM 中的主机标识） |
| wsusConfigId | string | 否 | WSUS 配置 ID。不传则使用租户默认配置 |

**Response** `200 OK`:

```json
{
  "id": "task-uuid-001",
  "taskType": "SCAN",
  "taskStatus": "RUNNING",
  "runId": "jao-run-uuid-001",
  "rebootAfter": false,
  "hostCount": 3,
  "createdBy": null,
  "errorMessage": null,
  "tenantId": "tenant-001",
  "createdDate": "2026-04-10T10:05:00",
  "completedDate": null
}
```

**业务逻辑**：

1. 校验 `hostIds` 非空
2. 从 WSUS 配置中获取 `wsus_url`
3. 创建 `WinPatchTask` 记录（status=PENDING）
4. 为每个 host 创建 `WinPatchTaskHost` 记录
5. 通过 `WinPatchTaskDispatcher` 提交 JAO 作业（func=scan）
6. 成功 → status=RUNNING；失败 → status=FAILED

---

#### 5.2.2 创建安装任务

```
POST /api/win-patch/tasks/install
```

**权限**：`ROLE_PRIVUSER`

**Request Body**:

```json
{
  "patchStatusIds": ["patch-status-id-1", "patch-status-id-2"],
  "reboot": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patchStatusIds | string[] | 是 | `win_patch_host_status` 表中要安装的记录 ID |
| reboot | boolean | 否 | 安装后是否重启，默认 false |

**Response** `200 OK`:

```json
{
  "id": "task-uuid-002",
  "taskType": "INSTALL",
  "taskStatus": "RUNNING",
  "runId": "jao-run-uuid-002",
  "rebootAfter": false,
  "hostCount": 2,
  "tenantId": "tenant-001",
  "createdDate": "2026-04-10T11:00:00",
  "completedDate": null
}
```

**业务逻辑**：

1. 加载选中的 `WinHostPatchStatus` 记录
2. 按 `hostId` 分组，每台主机的 KB 列表用逗号拼接
3. 创建 Task 和 TaskHost 记录
4. 批量将所选补丁状态更新为 `INSTALLING`
5. 提交 JAO 作业（func=install, vars.update_kbs="KB123,KB456"）
6. 若 JAO 调用失败 → 将补丁状态回退为 `INSTALL_FAILED`

---

#### 5.2.3 创建回滚任务

```
POST /api/win-patch/tasks/rollback
```

**权限**：`ROLE_PRIVUSER`

**Request Body**:

```json
{
  "installLogIds": ["log-id-1", "log-id-2"],
  "reboot": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| installLogIds | string[] | 是 | `win_patch_install_log` 表中要回滚的安装记录 ID |
| reboot | boolean | 否 | 回滚后是否重启，默认 false |

**Response** `200 OK`:

```json
{
  "id": "task-uuid-003",
  "taskType": "ROLLBACK",
  "taskStatus": "RUNNING",
  "runId": "jao-run-uuid-003",
  "rebootAfter": false,
  "hostCount": 1,
  "tenantId": "tenant-001",
  "createdDate": "2026-04-10T14:00:00",
  "completedDate": null
}
```

**业务逻辑**：

1. 加载选中的 `WinPatchInstallLog` 记录（仅 action=INSTALL, result=SUCCESS 的记录可回滚）
2. 按 `hostId` 分组，拼接 KB 列表
3. 创建 Task 和 TaskHost 记录
4. 将对应的 `WinHostPatchStatus` 标记为 `ROLLING_BACK`
5. 提交 JAO 作业（func=rollback）
6. 若 JAO 调用失败 → 将补丁状态改为 `ROLLBACK_FAILED`

---

### 5.3 回调接口（JAO 内部调用）

> 以下接口由 JAO 在作业完成后自动调用，不由前端直接调用。

#### 5.3.1 扫描结果回调

```
POST /api/win-patch/callback/scan
```

**权限**：`ROLE_PRIVUSER` 或 `ROLE_FREE`

**Request Body**：`JaoCallbackData`

```json
{
  "runId": "jao-run-uuid-001",
  "batches": [
    {
      "batchId": "batch-001",
      "result": {
        "scanResultFile": "/tmp/oplus/win-patch-wsus/host-001/scan_result_host-001.json"
      }
    }
  ]
}
```

**扫描结果 JSON 文件格式**：

```json
{
  "results": [
    {
      "host_id": "host-001",
      "ip": "10.1.0.1",
      "os_distro": "Microsoft Windows Server 2019 Standard",
      "os_version": "10.0.17763",
      "arch": "64-bit",
      "updates": [
        {
          "kb": "KB5034127",
          "title": "2024-01 Cumulative Update for Windows Server 2019",
          "severity": "Critical",
          "classification": "SecurityUpdates",
          "installed": false
        },
        {
          "kb": "KB5033909",
          "title": "2023-12 Security Update for Windows Server 2019",
          "severity": "Important",
          "classification": "SecurityUpdates",
          "installed": true
        }
      ]
    }
  ]
}
```

**Response** `200 OK`:

```json
{ "_status": "ok" }
```

**处理逻辑**（异步执行）：

1. 根据 `runId` 查找对应的 Task
2. 读取并解析每个结果文件
3. 对每台主机的每个 update 执行 **upsert**：
   - 已存在（按 host_id + kb_number 匹配） → 更新字段
   - 不存在 → 新增 `WinHostPatchStatus` 记录
4. 对之前标记为 MISSING 但本次扫描中未出现的 KB → 标记为 INSTALLED（说明已在平台外安装）
5. 重新计算 `WinHostScanSummary`（按 severity 统计）
6. 完成后标记 Task = COMPLETED

---

#### 5.3.2 安装结果回调

```
POST /api/win-patch/callback/install
```

**权限**：`ROLE_PRIVUSER` 或 `ROLE_FREE`

**Request Body**：`JaoCallbackData`（同上结构）

**安装结果 JSON 文件格式**：

```json
{
  "results": [
    {
      "host_id": "host-001",
      "ip": "10.1.0.1",
      "install_results": [
        {
          "kb": "KB5034127",
          "title": "2024-01 Cumulative Update for Windows Server 2019",
          "status": "SUCCESS",
          "error": null
        },
        {
          "kb": "KB5034456",
          "title": "...",
          "status": "FAILED",
          "error": "ResultCode=5, HResult=0x80240017"
        }
      ]
    }
  ]
}
```

**Response** `200 OK`:

```json
{ "_status": "ok" }
```

**处理逻辑**（异步执行）：

1. 解析每台主机的 `install_results`
2. SUCCESS → `WinHostPatchStatus.patchStatus = INSTALLED`
3. FAILED → `WinHostPatchStatus.patchStatus = INSTALL_FAILED`
4. 每个 KB 写入 `WinPatchInstallLog`（action=INSTALL）
5. 有任何失败 → Task status = FAILED；全部成功 → COMPLETED

---

#### 5.3.3 回滚结果回调

```
POST /api/win-patch/callback/rollback
```

**权限**：`ROLE_PRIVUSER` 或 `ROLE_FREE`

**Request Body**：`JaoCallbackData`

**回滚结果 JSON 文件格式**：

```json
{
  "results": [
    {
      "host_id": "host-001",
      "ip": "10.1.0.1",
      "rollback_results": [
        {
          "kb": "KB5034127",
          "status": "SUCCESS",
          "error": null
        },
        {
          "kb": "KB5034456",
          "status": "FAILED",
          "error": "Package for KB5034456 not found via DISM"
        }
      ]
    }
  ]
}
```

**Response** `200 OK`:

```json
{ "_status": "ok" }
```

**处理逻辑**（异步执行）：

1. 解析每台主机的 `rollback_results`
2. SUCCESS → `WinHostPatchStatus.patchStatus = MISSING`（回到缺失状态）
3. FAILED → `WinHostPatchStatus.patchStatus = ROLLBACK_FAILED`
4. 每个 KB 写入 `WinPatchInstallLog`（action=ROLLBACK）

---

### 5.4 查询接口

#### 5.4.1 主机补丁概览

```
GET /api/win-patch/hosts?page=0&size=20
```

**权限**：`ROLE_PRIVUSER`

**Query 参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 0 | 页码（从 0 开始） |
| size | int | 20 | 每页数量 |

**Response** `200 OK`（Spring `Page<WinHostScanSummary>`）:

```json
{
  "content": [
    {
      "id": "summary-001",
      "hostId": "host-001",
      "hostKey": "10.1.0.1",
      "osDistro": "Microsoft Windows Server 2019 Standard",
      "osVersion": "10.0.17763",
      "osArch": "64-bit",
      "totalMissing": 5,
      "criticalCount": 2,
      "importantCount": 2,
      "moderateCount": 1,
      "lowCount": 0,
      "installedCount": 120,
      "lastScanDate": "2026-04-10T10:30:00",
      "lastScanRunId": "jao-run-uuid-001",
      "tenantId": "tenant-001"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

#### 5.4.2 单台主机补丁详情

```
GET /api/win-patch/hosts/{hostId}/patches?page=0&size=50
```

**权限**：`ROLE_PRIVUSER`

**Path 参数**：

| 参数 | 说明 |
|------|------|
| hostId | 主机 ID |

**Query 参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 0 | 页码 |
| size | int | 50 | 每页数量 |

**Response** `200 OK`（Spring `Page<WinHostPatchStatus>`）:

```json
{
  "content": [
    {
      "id": "ps-001",
      "hostId": "host-001",
      "hostKey": "10.1.0.1",
      "kbNumber": "KB5034127",
      "title": "2024-01 Cumulative Update for Windows Server 2019",
      "severity": "Critical",
      "classification": "SecurityUpdates",
      "patchStatus": "MISSING",
      "isIgnored": false,
      "osDistro": "Microsoft Windows Server 2019 Standard",
      "osVersion": "10.0.17763",
      "osArch": "64-bit",
      "runId": "jao-run-uuid-001",
      "scanDate": "2026-04-10T10:30:00",
      "installDate": null,
      "tenantId": "tenant-001"
    }
  ],
  "totalElements": 125,
  "totalPages": 3,
  "number": 0,
  "size": 50
}
```

---

#### 5.4.3 任务历史列表

```
GET /api/win-patch/tasks?taskType=SCAN&page=0&size=20
```

**权限**：`ROLE_PRIVUSER`

**Query 参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| taskType | string | 否 | - | 可选过滤：`SCAN` / `INSTALL` / `ROLLBACK` |
| page | int | 否 | 0 | 页码 |
| size | int | 否 | 20 | 每页数量 |

**Response** `200 OK`（Spring `Page<WinPatchTask>`）:

```json
{
  "content": [
    {
      "id": "task-uuid-001",
      "taskType": "SCAN",
      "taskStatus": "COMPLETED",
      "runId": "jao-run-uuid-001",
      "rebootAfter": false,
      "hostCount": 3,
      "createdBy": null,
      "errorMessage": null,
      "tenantId": "tenant-001",
      "createdDate": "2026-04-10T10:05:00",
      "completedDate": "2026-04-10T10:30:00"
    }
  ],
  "totalElements": 8,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

#### 5.4.4 任务详情

```
GET /api/win-patch/tasks/{taskId}
```

**权限**：`ROLE_PRIVUSER`

**Response** `200 OK`:

```json
{
  "task": {
    "id": "task-uuid-001",
    "taskType": "SCAN",
    "taskStatus": "COMPLETED",
    "runId": "jao-run-uuid-001",
    "rebootAfter": false,
    "hostCount": 3,
    "tenantId": "tenant-001",
    "createdDate": "2026-04-10T10:05:00",
    "completedDate": "2026-04-10T10:30:00"
  },
  "hosts": [
    {
      "id": "th-001",
      "taskId": "task-uuid-001",
      "hostId": "host-001",
      "hostKey": "10.1.0.1",
      "status": "SUCCESS",
      "errorMessage": null,
      "startedDate": null,
      "completedDate": "2026-04-10T10:28:00"
    },
    {
      "id": "th-002",
      "taskId": "task-uuid-001",
      "hostId": "host-002",
      "hostKey": "10.1.0.2",
      "status": "SUCCESS",
      "errorMessage": null,
      "startedDate": null,
      "completedDate": "2026-04-10T10:30:00"
    }
  ]
}
```

---

#### 5.4.5 安装/回滚历史

```
GET /api/win-patch/install-logs?hostId=host-001&page=0&size=20
```

**权限**：`ROLE_PRIVUSER`

**Query 参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| hostId | string | 否 | - | 按主机过滤 |
| page | int | 否 | 0 | 页码 |
| size | int | 否 | 20 | 每页数量 |

**Response** `200 OK`（Spring `Page<WinPatchInstallLog>`）:

```json
{
  "content": [
    {
      "id": "log-001",
      "taskId": "task-uuid-002",
      "hostId": "host-001",
      "hostKey": "10.1.0.1",
      "kbNumber": "KB5034127",
      "title": "2024-01 Cumulative Update for Windows Server 2019",
      "action": "INSTALL",
      "result": "SUCCESS",
      "errorMessage": null,
      "executedDate": "2026-04-10T11:15:00",
      "tenantId": "tenant-001"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

## 6. PowerShell 脚本说明

脚本位置：`oplus-vap/playbooks/win-patch-wsus/scripts/`

### 6.1 Scan-WsusPatches.ps1

| 参数 | 必填 | 说明 |
|------|------|------|
| `-OutputPath` | 是 | JSON 结果输出路径 |
| `-WsusUrl` | 否 | WSUS 服务器 URL，传入时会临时写入注册表 |

**核心逻辑**：
1. 获取系统信息（hostname, IP, OS）
2. 若传入 `WsusUrl`，写注册表 `HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` 配置 WSUS
3. 创建 `Microsoft.Update.Session` COM 对象
4. 设置 `ServerSelection = 1`（Managed Server / WSUS）
5. 执行 `Search("IsInstalled=0")` 获取缺失更新
6. 执行 `Search("IsInstalled=1")` 获取已装更新
7. 收集每个更新的 `KBArticleIDs`、`Title`、`MsrcSeverity`、`Categories`
8. 输出 JSON

### 6.2 Install-WsusPatches.ps1

| 参数 | 必填 | 说明 |
|------|------|------|
| `-KBNumbers` | 是 | 逗号分隔的 KB 列表，如 `"KB5034127,KB5034456"` |
| `-OutputPath` | 是 | JSON 结果输出路径 |
| `-Reboot` | 否 | `yes` / `no`，默认 `no` |

**核心逻辑**：
1. 解析 KB 列表
2. 搜索 WSUS 可用更新 `Search("IsInstalled=0")`
3. 匹配目标 KB，接受 EULA
4. 通过 `CreateUpdateDownloader()` 下载
5. 通过 `CreateUpdateInstaller()` 安装
6. 检查每个 KB 的 `ResultCode`（2/3=SUCCESS, 其他=FAILED）
7. 对未在 WSUS 中找到的 KB 标记为 FAILED
8. 若 `Reboot=yes` 且 `RebootRequired=true`，执行 `shutdown /r /t 30`

### 6.3 Rollback-WsusPatches.ps1

| 参数 | 必填 | 说明 |
|------|------|------|
| `-KBNumbers` | 是 | 逗号分隔的 KB 列表 |
| `-OutputPath` | 是 | JSON 结果输出路径 |
| `-Reboot` | 否 | `yes` / `no`，默认 `no` |

**核心逻辑**（双重策略）：
1. **优先使用 WUA**：搜索已安装更新 `Search("IsInstalled=1")`，检查 `IsUninstallable`，调用 `Uninstall()`
2. **降级到 DISM**：若 WUA 不支持卸载，使用 `dism /online /remove-package /packagename:...`
3. 记录每个 KB 的回滚结果

---

## 7. Ansible Playbook 说明

位置：`oplus-vap/playbooks/win-patch-wsus/site.yml`

### 变量（由 JAO 传入）

| 变量 | 来源 | 说明 |
|------|------|------|
| `func` | global params | `scan` / `install` / `rollback` |
| `reboot` | global params | `yes` / `no` |
| `update_kbs` | per-host vars | 逗号分隔 KB 列表（install/rollback 时使用） |
| `wsus_url` | global params | WSUS URL（scan 时可选） |

### 执行步骤

1. **准备**：在远程主机创建 `C:\oplus\win-patch-wsus\` 目录
2. **拷贝脚本**：`win_copy` 将 3 个 PS1 文件推送到远程
3. **执行**：根据 `func` 条件执行对应的 PS 脚本（`win_shell`）
4. **回收结果**：`fetch` 将 JSON 结果文件拉回 Ansible 控制节点
5. **清理**：删除远程结果文件

JAO 会将 `fetch` 回收的文件路径写入 `scanResultFile` 字段，通过回调接口传给平台。

---

## 8. 状态机定义

### 8.1 Task 状态机

```
PENDING ──(JAO提交成功)──► RUNNING ──(回调处理完成)──► COMPLETED
   │                         │
   │                         └──(回调处理失败)──► FAILED
   │
   └──(JAO提交失败)──► FAILED
```

### 8.2 Patch 状态机

```
                              ┌──────────────────────────┐
                              │                          │
                    ┌─────────▼──────────┐               │
          ┌────────│     MISSING         │◄──────────┐   │
          │        └─────────┬──────────┘            │   │
          │                  │                       │   │
          │    (创建安装任务) │                       │   │
          │                  ▼                       │   │
          │        ┌─────────────────────┐           │   │
          │        │    INSTALLING       │           │   │
          │        └─────┬─────────┬────┘           │   │
          │              │         │                 │   │
          │    (安装成功) │         │ (安装失败)      │   │
          │              ▼         ▼                 │   │
          │   ┌──────────────┐  ┌────────────────┐  │   │
          │   │  INSTALLED   │  │ INSTALL_FAILED │  │   │
          │   └──────┬───────┘  └────────────────┘  │   │
          │          │                               │   │
          │  (创建回滚任务)                           │   │
          │          ▼                               │   │
          │   ┌──────────────┐                       │   │
          │   │ ROLLING_BACK │                       │   │
          │   └──────┬───┬───┘                       │   │
          │          │   │                           │   │
          │ (回滚成功)│   │(回滚失败)                 │   │
          │          │   ▼                           │   │
          │          │  ┌─────────────────┐          │   │
          │          │  │ ROLLBACK_FAILED │          │   │
          │          │  └─────────────────┘          │   │
          │          │                               │   │
          │          └───────────────────────────────┘   │
          │                                              │
          │    (扫描发现已不在缺失列表)                    │
          └──────────────────────────────────────────────┘
               MISSING → INSTALLED (平台外安装)
```

### 8.3 状态常量

| 常量 | 值 | 含义 |
|------|----|------|
| `PATCH_MISSING` | `MISSING` | 补丁缺失，需要安装 |
| `PATCH_INSTALLED` | `INSTALLED` | 补丁已安装 |
| `PATCH_INSTALLING` | `INSTALLING` | 安装中 |
| `PATCH_INSTALL_FAILED` | `INSTALL_FAILED` | 安装失败 |
| `PATCH_ROLLBACK_PENDING` | `ROLLBACK_PENDING` | 等待回滚 |
| `PATCH_ROLLING_BACK` | `ROLLING_BACK` | 回滚中 |
| `PATCH_ROLLBACK_FAILED` | `ROLLBACK_FAILED` | 回滚失败 |

---

## 9. 部署说明

### 9.1 数据库

执行 SQL 迁移脚本创建表：

```
oplus-vap/src/main/resources/db/migration/V20260410__win_patch_wsus_tables.sql
```

包含 6 张表的 DDL（IF NOT EXISTS），可安全重复执行。

### 9.2 Ansible Playbook 部署

将 `oplus-vap/playbooks/win-patch-wsus/` 目录（包含 `site.yml` 和 `scripts/` 子目录）部署到 JAO Git 仓库的 `oplus/oplus-vap/win-patch-wsus/` 路径下。

### 9.3 WSUS 服务器准备

1. 在离线网络中安装 Windows Server + WSUS 角色
2. 在联网环境的 WSUS 上同步需要的产品分类（Windows Server 2016/2019/2022）
3. 导出更新包到离线介质（`wsusutil.exe export`）
4. 在离线 WSUS 上导入（`wsusutil.exe import`）
5. 审批需要的更新

### 9.4 目标主机准备

通过组策略或注册表配置 Windows Update Agent 指向本地 WSUS：

```
HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate
  WUServer = http://wsus.internal:8530
  WUStatusServer = http://wsus.internal:8530

HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU
  UseWUServer = 1
```

> 注：扫描脚本也支持通过参数动态设置 WSUS 地址。

### 9.5 WinRM 配置

目标 Windows 服务器需开启 WinRM 以允许 Ansible 连接：

```powershell
winrm quickconfig -force
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
```

### 9.6 Java 包路径

所有新增代码位于 `com.famessoft.oplus.winpatch` 包下，不影响现有 `com.famessoft.oplus.win` 包：

```
oplus-vap/src/main/java/com/famessoft/oplus/winpatch/
├── config/WinPatchConstants.java
├── entity/               (6 个 JPA 实体)
├── dao/                  (6 个 Repository 接口)
├── dto/                  (5 个 DTO)
├── service/              (5 个接口 + 5 个实现)
├── callback/             (3 个回调处理器)
├── dispatcher/           (1 个 JAO 分发器)
└── web/                  (4 个 REST Controller)
```
