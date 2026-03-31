# 补丁安装/回滚任务 API 文档

> 基础路径：`/oplus-portal/vap/api/vap/v2/patch/task`

---

## 目录

- [数据模型](#数据模型)
- [流程概览](#流程概览)
- [创建任务](#创建任务)
- [查询任务](#查询任务)
- [脚本管理](#脚本管理)
- [步骤执行 - 预检查](#步骤1预检查)
- [步骤执行 - 安装/回滚](#步骤2安装回滚)
- [步骤执行 - 重启](#步骤3重启)
- [步骤执行 - 校验](#步骤4校验)
- [回滚专属接口](#回滚专属接口)
- [操作日志查询](#操作日志查询)

---

## 数据模型

### PatchInstallTask 任务对象

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 任务唯一标识（UUID） |
| taskType | String | 任务类型：`install`（安装）/ `rollback`（回滚） |
| status | String | 任务状态，见[状态枚举](#状态枚举) |
| currentStep | String | 当前步骤，见[步骤枚举](#步骤枚举) |
| hostIds | String(JSON) | 目标主机 ID 列表 `["host1","host2"]` |
| patchIds | String(JSON) | 补丁 ID 列表 `["KYSA-202108-1013"]` |
| patchStatusIds | String(JSON) | 漏洞概览状态 ID 列表（可选） |
| histUpdateIds | String(JSON) | 回滚历史记录 ID 列表（仅回滚任务） |
| osType | String | 操作系统类型：`linux` |
| osDistro | String | 操作系统发行版，如 `kylinos` |
| patchPkgs | String(JSON) | 涉及的补丁包名列表 |
| preCheckScript | String | 用户上传的预检查脚本内容 |
| preCheckRunId | String | 预检查步骤的 JAO 运行 ID |
| installRunId | String | 安装步骤的 JAO 运行 ID |
| rollbackRunId | String | 回滚步骤的 JAO 运行 ID |
| restartType | String | 重启类型：`system`（系统重启）/ `service`（服务重启）/ `none` |
| restartReason | String | 重启原因说明 |
| restartConfirmed | Boolean | 用户是否已确认重启 |
| restartAction | String | 实际执行的重启动作 |
| restartRunId | String | 重启步骤的 JAO 运行 ID |
| validateScript | String | 用户上传的校验脚本内容 |
| validateRunId | String | 校验步骤的 JAO 运行 ID |
| kernelRollback | Boolean | 是否涉及内核补丁（仅回滚任务） |
| kernelRebooted | Boolean | 系统是否已在新内核上重启过（仅回滚任务） |
| executionLog | String | 最近一次执行的输出日志 |
| errorMessage | String | 错误信息 |
| createdTime | DateTime | 创建时间 |
| updatedTime | DateTime | 最后更新时间 |

### 状态枚举

| 状态值 | 说明 | 适用任务类型 |
|--------|------|-------------|
| CREATED | 已创建，等待操作 | 通用 |
| PRE_CHECKING | 预检查执行中 | 通用 |
| PRE_CHECK_DONE | 预检查完成 | 通用 |
| PRE_CHECK_FAILED | 预检查失败 | 通用 |
| INSTALLING | 安装执行中 | 安装 |
| INSTALL_DONE | 安装完成 | 安装 |
| INSTALL_FAILED | 安装失败 | 安装 |
| ROLLING_BACK | 回滚执行中 | 回滚 |
| ROLLBACK_DONE | 回滚完成 | 回滚 |
| ROLLBACK_FAILED | 回滚失败 | 回滚 |
| RESTART_PENDING | 等待重启确认 | 通用 |
| RESTARTING | 重启执行中 | 通用 |
| RESTART_DONE | 重启完成 | 通用 |
| VALIDATING | 校验执行中 | 通用 |
| VALIDATE_FAILED | 校验失败 | 通用 |
| COMPLETED | 任务全部完成 | 通用 |
| FAILED | 任务失败 | 通用 |

### 步骤枚举

| 步骤值 | 说明 |
|--------|------|
| PRE_CHECK | 预检查 |
| INSTALL | 安装（安装任务） |
| ROLLBACK | 回滚（回滚任务） |
| RESTART | 重启 |
| VALIDATE | 校验 |

---

## 流程概览

### 补丁安装流程

```
创建任务 → 预检查(可跳过) → 安装 → 重启策略确认 → 重启(可跳过) → 校验(可跳过) → 完成
```

前端调用顺序：

1. `POST /create` 创建任务
2. （可选）`POST /{id}/script/upload` 上传预检查/校验脚本
3. `POST /{id}/pre-check/execute` 或 `POST /{id}/pre-check/skip`
4. `POST /{id}/install/execute`
5. `GET /{id}/restart/options` 获取重启建议
6. `POST /{id}/restart/confirm` 确认或跳过重启
7. `POST /{id}/restart/execute`（确认重启时）
8. `POST /{id}/validate/execute` 或 `POST /{id}/validate/skip`

### 补丁回滚流程（非内核）

```
创建回滚任务 → 预检查(可跳过) → 回滚 → 校验(可跳过) → 重启(可选) → 完成
```

### 补丁回滚流程（内核 + 已重启）

```
创建回滚任务 → 预检查(检测内核状态) → 重启(切换旧内核) → 回滚(删除新内核) → 校验 → 完成
```

前端调用顺序：

1. `POST /create-rollback` 创建回滚任务
2. `GET /{id}/rollback/info` 获取回滚信息和内核警告
3. `POST /{id}/pre-check/execute` 或 `POST /{id}/pre-check/skip`
4. （若 `kernelRebooted=true`）`POST /{id}/restart/confirm` + `POST /{id}/restart/execute`
5. `POST /{id}/rollback/execute`
6. `POST /{id}/validate/execute` 或 `POST /{id}/validate/skip`

---

## 创建任务

### 创建补丁安装任务

```
POST /create
```

**请求体：**

```json
{
  "hostIds": ["host-001", "host-002"],
  "patchIds": ["KYSA-202108-1013"],
  "patchStatusIds": ["status-id-1"],
  "osType": "linux"
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| hostIds | 是 | 目标主机 ID 列表 |
| patchIds | 是 | 待安装补丁 ID 列表 |
| patchStatusIds | 否 | 漏洞概览状态 ID 列表，用于关联漏洞修复进度 |
| osType | 否 | 操作系统类型，默认 `linux` |

**成功响应（200）：** 返回完整的 PatchInstallTask 对象

**失败响应（400）：**

```json
{ "error": "hostIds 不能为空" }
```

---

### 创建补丁回滚任务

```
POST /create-rollback
```

**请求体：**

```json
{
  "hostIds": ["host-001"],
  "patchIds": ["KYSA-202108-1013"],
  "patchStatusIds": ["status-id-1"],
  "histUpdateIds": ["hist-update-id-1", "hist-update-id-2"]
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| hostIds | 是 | 目标主机 ID 列表 |
| patchIds | 是 | 待回滚补丁 ID 列表 |
| patchStatusIds | 否 | 漏洞概览状态 ID 列表 |
| histUpdateIds | 否 | 安装历史记录 ID 列表（对应 `vap2_hist_update_pkgs` 表） |

**成功响应（200）：** 返回完整的 PatchInstallTask 对象，注意以下字段：

- `taskType = "rollback"`
- `kernelRollback`：是否涉及内核补丁
- `restartType` / `restartReason`：重启建议

---

## 查询任务

### 查看任务详情

```
GET /{id}
```

**成功响应（200）：** 返回完整的 PatchInstallTask 对象

**失败响应（404）：**

```json
{ "error": "任务不存在" }
```

---

### 分页查询任务列表

```
GET /list?status=&page=0&size=20
```

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| status | 否 | 无 | 按任务状态筛选 |
| page | 否 | 0 | 页码（从 0 开始） |
| size | 否 | 20 | 每页条数 |

**成功响应（200）：** 返回 Spring Data 分页对象：

```json
{
  "content": [ /* PatchInstallTask 列表 */ ],
  "totalElements": 50,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

---

## 脚本管理

### 上传脚本文件

```
POST /{id}/script/upload
Content-Type: multipart/form-data
```

| 参数 | 必填 | 说明 |
|------|------|------|
| scriptType | 是 | 脚本类型：`pre-check`（预检查）/ `validate`（校验） |
| file | 是 | 脚本文件（UTF-8 文本） |

**成功响应（200）：** 返回更新后的 PatchInstallTask 对象

---

### 编辑脚本内容

```
PUT /{id}/script/update
```

**请求体：**

```json
{
  "scriptType": "pre-check",
  "content": "#!/bin/bash\necho 'checking...'\nexit 0"
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| scriptType | 是 | `pre-check` / `validate` |
| content | 是 | 脚本内容（可为空字符串） |

**成功响应（200）：** 返回更新后的 PatchInstallTask 对象

---

### 下载脚本内容

```
GET /{id}/script/download?type=pre-check
Content-Type: text/plain
```

| 参数 | 必填 | 说明 |
|------|------|------|
| type | 是 | `pre-check` / `validate` |

**成功响应（200）：** 返回脚本文本内容

**空脚本（404）：** 返回空字符串

> 此接口主要供 Ansible playbook 在目标机上调用，前端一般不直接使用。

---

## 步骤1：预检查

### 执行预检查

```
POST /{id}/pre-check/execute
```

若未上传预检查脚本，自动标记为 `PRE_CHECK_DONE` 并跳过。

**成功响应（200）：** 返回 PatchInstallTask，关注字段：
- `status` → `PRE_CHECKING`（执行中）或 `PRE_CHECK_DONE`（自动跳过）
- `preCheckRunId` → JAO 运行 ID，可用于查看执行详情

**回滚任务的内核检测：** 预检查完成后，若检测到系统已在新内核上运行，任务对象的 `kernelRebooted` 会被置为 `true`，同时 `errorMessage` 中包含提示信息。

---

### 跳过预检查

```
POST /{id}/pre-check/skip
```

**成功响应（200）：** 返回 PatchInstallTask，`status` → `PRE_CHECK_DONE`

---

## 步骤2：安装/回滚

### 执行补丁安装

```
POST /{id}/install/execute
```

仅安装任务（`taskType=install`）可调用。

**成功响应（200）：** 返回 PatchInstallTask，关注字段：
- `status` → `INSTALLING`
- `installRunId` → JAO 运行 ID

**失败场景：**
- 任务正在安装中：`{ "error": "补丁正在安装中，请勿重复操作" }`

---

### 执行补丁回滚

```
POST /{id}/rollback/execute
```

仅回滚任务（`taskType=rollback`）可调用。

**成功响应（200）：** 返回 PatchInstallTask，关注字段：
- `status` → `ROLLING_BACK`
- `rollbackRunId` → JAO 运行 ID

**失败场景：**
- 非回滚任务：`{ "error": "该任务不是回滚任务" }`
- 正在回滚中：`{ "error": "补丁正在回滚中，请勿重复操作" }`
- 内核回滚未先重启：`{ "error": "内核回滚需先重启至旧内核，请先执行重启步骤" }`

---

## 步骤3：重启

### 获取重启策略

```
GET /{id}/restart/options
```

**成功响应（200）：**

```json
{
  "restartType": "system",
  "restartReason": "包含系统级组件(kernel, glibc)，需要系统重启",
  "restartRequired": true,
  "restartLabel": "系统重启",
  "restartDescription": "该补丁包含内核级变更，平台建议进行系统重启以使补丁生效。\n涉及补丁包：kernel、glibc",
  "patchPkgs": ["kernel", "glibc"]
}
```

`restartType` 取值：

| 值 | 说明 | 建议 |
|-----|------|------|
| `system` | 系统重启 | 包含内核等系统级组件，强烈建议重启 |
| `service` | 服务重启 | 仅需重启相关服务 |
| `none` | 无需重启 | 补丁可直接生效 |

---

### 确认是否重启

```
POST /{id}/restart/confirm
```

**请求体（执行重启）：**

```json
{
  "confirm": true,
  "confirmText": "确认重启"
}
```

**请求体（跳过重启）：**

```json
{
  "confirm": false
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| confirm | 是 | `true` 执行重启 / `false` 跳过重启 |
| confirmText | confirm=true 时必填 | 必须传入 `"确认重启"` 四个字进行二次确认 |

**成功响应（200）：** 返回 PatchInstallTask
- 确认重启：`status` → `RESTART_PENDING`
- 跳过重启：`status` → `RESTART_DONE`

---

### 执行重启

```
POST /{id}/restart/execute
```

**成功响应（200）：** 返回 PatchInstallTask
- `status` → `RESTARTING`
- `restartRunId` → JAO 运行 ID
- 若 `restartType=none`，直接变为 `RESTART_DONE`

---

## 步骤4：校验

### 执行校验

```
POST /{id}/validate/execute
```

若未上传校验脚本，自动标记为 `COMPLETED` 并跳过。

**成功响应（200）：** 返回 PatchInstallTask
- `status` → `VALIDATING`（执行中）或 `COMPLETED`（自动跳过）
- `validateRunId` → JAO 运行 ID

---

### 跳过校验

```
POST /{id}/validate/skip
```

**成功响应（200）：** 返回 PatchInstallTask，`status` → `COMPLETED`

---

## 回滚专属接口

### 获取回滚信息

```
GET /{id}/rollback/info
```

获取回滚任务的内核检测结果、重启建议和操作警告。

**成功响应（200）：**

```json
{
  "taskType": "rollback",
  "kernelRollback": true,
  "kernelRebooted": true,
  "patchPkgs": ["kernel", "kernel-devel"],
  "restartType": "system",
  "restartReason": "包含内核补丁，回滚可能需要先重启至旧内核",
  "kernelWarning": "当前系统运行的是新内核，需先重启至旧内核再执行回滚。流程：重启(切换旧内核) -> 回滚(删除新内核) -> 校验"
}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| kernelRollback | `true` 时表示补丁涉及内核包 |
| kernelRebooted | `true` 时表示系统已在新内核上运行，需先重启到旧内核 |
| kernelWarning | 内核回滚的操作提示，前端应以醒目方式展示给用户 |

---

## 操作日志查询

所有步骤（预检查、安装、回滚、校验、重启）的执行记录均写入 `jao_audit_log` 表，可通过以下接口查询：

```
GET /oplus-portal/dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/
```

**查询参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| module | `vap2,upm` | 模块筛选，补丁相关为 `vap2` |
| action | 无 | 操作类型筛选，支持：`补丁预检查`、`补丁安装`、`补丁回滚`、`补丁安装校验`、`补丁重启` |
| day | `all` | 时间范围：`1`=今天 / `7`=近7天 / `30`=近30天 / `all`=全部 |
| status | 无 | 状态筛选：`RUNNING` / `COMPLETED` / `FAILED` / `ERROR` |

**日志记录的 action 对应关系：**

| action 值 | 说明 | 记录时机 |
|-----------|------|----------|
| 补丁预检查 | 预检查脚本执行 | 预检查步骤提交时记录开始，回调时更新结果 |
| 补丁安装 | 补丁安装执行 | 安装步骤提交时记录开始，回调时更新结果 |
| 补丁回滚 | 补丁回滚执行 | 回滚步骤提交时记录开始，回调时更新结果 |
| 补丁安装校验 | 校验脚本执行 | 校验步骤提交时记录开始，回调时更新结果 |
| 补丁重启 | 重启执行 | 重启步骤提交时记录开始，回调时更新结果 |

**响应字段：**

| 字段 | 说明 |
|------|------|
| run_id | 运行 ID，与任务中各步骤的 runId 对应 |
| action | 操作类型 |
| status | 执行状态（RUNNING / COMPLETED / FAILED / ERROR） |
| message | 结果消息（JSON 格式，含 `msg_id` 和 `msg_info`） |
| username | 执行用户 |
| start_time | 开始时间 |
| end_time | 结束时间 |
| ata_node | ATA 节点信息 |

---

## 错误响应格式

所有接口的错误响应统一为：

```json
{
  "error": "错误描述信息"
}
```

HTTP 状态码：
- `200` 成功
- `400` 参数错误或业务逻辑校验失败
- `404` 资源不存在

---

## 前端轮询建议

步骤执行后（预检查、安装、回滚、重启、校验）任务状态变为 `*_ING` 中间态，前端需要轮询任务详情接口来获取最终结果：

```
GET /{id}
```

建议轮询策略：
- 间隔：3~5 秒
- 终止条件：`status` 不再以 `ING` 结尾（变为 `*_DONE` / `*_FAILED` / `COMPLETED` / `FAILED`）
- 超时：根据业务场景设定，建议最长 10 分钟
