# 补丁安装任务流程 API 文档

## 概述

提供完整的流程化补丁升级能力：**预检查 → 安装 → 重启 → 校验**，四个强制步骤。

- 所有脚本由**平台根据 OS 和补丁信息自动生成**，不需要用户手写
- 每个步骤**必须执行**，不可跳过
- 创建任务时自动完成：重启评估、软件包提取、脚本生成

## 操作流程

```
创建任务（自动生成所有脚本）
    │
    ▼
步骤1：执行预检查
    │ 回调 → PRE_CHECK_DONE
    ▼
步骤2：执行补丁安装
    │ 回调 → INSTALL_DONE
    ▼
步骤3：确认重启方式 → 执行重启
    │ 回调 → RESTART_DONE（restartType=none 时跳过此步）
    ▼
步骤4：执行安装后校验
    │ 回调 → COMPLETED
    ▼
流程完成
```

## 状态流转

| 当前状态 | 触发 | 目标状态 |
|---------|------|---------|
| `CREATED` | 执行预检查 | `PRE_CHECKING` |
| `PRE_CHECKING` | 回调成功 | `PRE_CHECK_DONE` |
| `PRE_CHECKING` | 回调失败 | `PRE_CHECK_FAILED` |
| `PRE_CHECK_DONE` | 执行安装 | `INSTALLING` |
| `INSTALLING` | 回调成功 | `INSTALL_DONE` |
| `INSTALLING` | 回调失败 | `INSTALL_FAILED` |
| `INSTALL_DONE` | 确认重启 | `RESTART_PENDING` |
| `INSTALL_DONE` | 无需重启，执行校验 | `VALIDATING` |
| `RESTART_PENDING` | 执行重启 | `RESTARTING` |
| `RESTARTING` | 回调成功 | `RESTART_DONE` |
| `RESTART_DONE` | 执行校验 | `VALIDATING` |
| `VALIDATING` | 回调成功 | `COMPLETED` |
| `VALIDATING` | 回调失败 | `VALIDATE_FAILED` |

## API 接口

基础路径：`/api/vap/v2/patch/task`

---

### 1. 创建任务

自动完成：提取软件包列表、推断 OS 发行版、评估重启需求、生成全部脚本。

```
POST /api/vap/v2/patch/task/create
```

**请求体**

```json
{
  "hostIds": ["host-001", "host-002"],
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "patchStatusIds": ["status-001", "status-002"],
  "osType": "linux"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ID |
| patchIds | string[] | 是 | 补丁 ID |
| patchStatusIds | string[] | 否 | 机器补丁状态 ID，用于评估重启和推断 OS |
| osType | string | 否 | 默认 `linux`，可选 `windows` |

**响应示例**

```json
{
  "id": "8a80cb8190xxx",
  "status": "CREATED",
  "currentStep": "PRE_CHECK",
  "restartType": "system",
  "restartReason": "包含内核补丁(kernel)，需要系统重启",
  "preCheckScript": "#!/bin/bash\n...",
  "restartScript": "#!/bin/bash\n...",
  "validateScript": "#!/bin/bash\n..."
}
```

---

### 2. 查看任务详情

```
GET /api/vap/v2/patch/task/{id}
```

---

### 3. 任务列表

```
GET /api/vap/v2/patch/task/list?status=CREATED&page=0&size=20
```

---

### 4. 执行预检查

**前置**: `status=CREATED`

```
POST /api/vap/v2/patch/task/{id}/pre-check/execute
```

平台脚本检查项：磁盘空间、包管理器锁、当前包版本记录、系统负载、关键服务状态。

---

### 5. 执行补丁安装

**前置**: `status=PRE_CHECK_DONE`

```
POST /api/vap/v2/patch/task/{id}/install/execute
```

复用现有 `PatchFactory → PatchInstallRunner` 逻辑。

---

### 6. 确认重启方式

**前置**: `status=INSTALL_DONE`

```
POST /api/vap/v2/patch/task/{id}/restart/confirm
```

```json
{ "action": "system" }
```

| action | 说明 |
|--------|------|
| `service` | 服务重启（智能匹配受影响服务） |
| `system` | 系统重启（reboot） |

> 当 `restartType=none` 时，安装完成后直接调用校验接口。

---

### 7. 执行重启

**前置**: `status=RESTART_PENDING`

```
POST /api/vap/v2/patch/task/{id}/restart/execute
```

- `system`：调用已有 reboot job
- `service`：通过 JAO 执行平台生成的服务重启脚本

---

### 8. 执行校验

**前置**: `status=RESTART_DONE` 或 `status=INSTALL_DONE`(restartType=none)

```
POST /api/vap/v2/patch/task/{id}/validate/execute
```

平台脚本校验项：包版本验证、内核一致性（重启后）、服务状态、系统日志、网络连通性。

---

## 回调接口（JAO → VAP）

| 路径 | 说明 |
|------|------|
| `POST /api/vap/v2/callback/pre-check` | 预检查完成 |
| `POST /api/vap/v2/callback/update` | 安装完成（复用已有） |
| `POST /api/vap/v2/callback/restart` | 服务重启完成 |
| `POST /api/vap/v2/callback/validate` | 校验完成 |

---

## 平台脚本生成规则

### 服务重启：按软件包匹配受影响服务

| 软件包关键字 | 重启服务 |
|------------|---------|
| openssl/libssl | nginx, httpd, sshd, vsftpd, postfix, dovecot |
| glibc/libc6 | sshd, crond, rsyslog, systemd-journald, NetworkManager |
| systemd | `systemctl daemon-reexec` |
| python | firewalld, tuned |

未匹配时使用 `needs-restarting -s` 检测。

### 重启评估逻辑

| 条件 | 类型 |
|------|------|
| rebootStatus=system 或 isKernel=is_kernel | `system` |
| affectedPkgs 含 kernel* | `system` |
| rebootStatus=service | `service` |
| 其他 | `none` |

---

## 完整调用示例

```
# 1. 创建
POST /create → taskId, restartType, 三个脚本内容

# 2. 预检查
POST /{id}/pre-check/execute → 轮询 → PRE_CHECK_DONE

# 3. 安装
POST /{id}/install/execute → 轮询 → INSTALL_DONE

# 4. 重启（restartType != none 时）
POST /{id}/restart/confirm  {"action":"system"}
POST /{id}/restart/execute → 轮询 → RESTART_DONE

# 5. 校验
POST /{id}/validate/execute → 轮询 → COMPLETED
```

---

## 前端集成

1. **创建**后展示平台生成的脚本内容和重启建议
2. **每步**点击执行后轮询 `GET /{id}`（3-5秒），根据 `status` 判断进度
3. **重启步骤**：`restartType=none` 时跳过，否则显示平台建议让用户选择 service/system
4. **异常**：`*_FAILED` 状态展示 `errorMessage`

---

## 数据库表

表名：`vap2_patch_install_task`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) | 主键 |
| status | VARCHAR(32) | 任务状态 |
| current_step | VARCHAR(32) | 当前步骤 |
| host_ids | TEXT | 主机 ID (JSON) |
| patch_ids | TEXT | 补丁 ID (JSON) |
| patch_status_ids | TEXT | 状态 ID (JSON) |
| os_type | VARCHAR(16) | 系统类型 |
| os_distro | VARCHAR(64) | 发行版 |
| patch_pkgs | TEXT | 软件包 (JSON) |
| pre_check_script | TEXT | 预检查脚本 |
| pre_check_run_id | VARCHAR(64) | 预检查执行 ID |
| install_run_id | VARCHAR(64) | 安装执行 ID |
| restart_type | VARCHAR(16) | 评估: none/service/system |
| restart_reason | VARCHAR(512) | 重启原因 |
| restart_confirmed | TINYINT(1) | 是否已确认 |
| restart_action | VARCHAR(16) | 用户选择 |
| restart_script | TEXT | 重启脚本 |
| restart_run_id | VARCHAR(64) | 重启执行 ID |
| validate_script | TEXT | 校验脚本 |
| validate_run_id | VARCHAR(64) | 校验执行 ID |
| error_message | TEXT | 错误信息 |
| created_time | DATETIME | 创建时间 |
| updated_time | DATETIME | 更新时间 |
| tenant_id | VARCHAR(64) | 租户 ID |
