# 补丁任务 API 文档（安装/回滚/软件包更新/漏洞修复）

> 基础路径：`/oplus-portal/vap/api/vap/v2/patch/task`

---

## 目录

- [数据模型](#数据模型)
- [流程概览](#流程概览)
- [创建任务](#创建任务)
- [查询任务](#查询任务)
- [脚本管理](#脚本管理)
- [步骤执行 - 预检查](#步骤1预检查)
- [步骤执行 - 安装/回滚/更新/修复](#步骤2安装回滚更新修复)
- [步骤执行 - 重启](#步骤3重启)
- [步骤执行 - 校验](#步骤4校验)
- [回滚专属接口](#回滚专属接口)
- [操作审计日志](#操作审计日志)
  - [设计说明](#设计说明)
  - [流程记录列表](#流程操作记录列表)
  - [流程操作详情](#流程操作详情)
  - [审计步骤与动作枚举](#审计步骤枚举)
  - [审计记录覆盖范围](#审计记录覆盖范围)
  - [旧版操作日志查询](#旧版操作日志查询jao_audit_log)

---

## 数据模型

### PatchInstallTask 任务对象

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 任务唯一标识（UUID） |
| taskType | String | 任务类型：`install`（补丁安装）/ `rollback`（补丁回滚）/ `pkg_update`（软件包更新）/ `vuln_fix`（漏洞修复） |
| status | String | 任务状态，见[状态枚举](#状态枚举) |
| currentStep | String | 当前步骤，见[步骤枚举](#步骤枚举) |
| hostIds | String(JSON) | 目标主机 ID 列表 `["host1","host2"]` |
| patchIds | String(JSON) | 补丁 ID 列表 `["KYSA-202108-1013"]` |
| patchStatusIds | String(JSON) | 漏洞概览状态 ID 列表（可选） |
| histUpdateIds | String(JSON) | 回滚历史记录 ID 列表（仅回滚任务） |
| packages | String(JSON) | 待更新的软件包列表（仅 `pkg_update` 任务），格式 `["name#fullPkgId#patchId"]` |
| osType | String | 操作系统类型：`linux` |
| osDistro | String | 操作系统发行版，如 `kylinos` |
| patchPkgs | String(JSON) | 涉及的软件包名列表 |
| preCheckScript | String | 用户上传的预检查脚本内容 |
| preCheckRunId | String | 预检查步骤的 JAO 运行 ID |
| executeRunId | String | 主操作步骤的 JAO 运行 ID（安装/回滚/更新/修复 共用） |
| restartType | String | 重启类型：`system`（系统重启）/ `service`（服务重启）/ `none` |
| restartReason | String | 重启原因说明（包含涉及的软件包名称） |
| restartConfirmed | Boolean | 用户是否已确认重启 |
| restartAction | String | 实际执行的重启动作 |
| restartRunId | String | 重启步骤的 JAO 运行 ID |
| validateScript | String | 用户上传的校验脚本内容 |
| validateRunId | String | 校验步骤的 JAO 运行 ID |
| kernelRollback | Boolean | 是否涉及内核补丁（仅回滚任务） |
| kernelRebooted | Boolean | 系统是否已在新内核上重启过（仅回滚任务） |
| executionLog | String | 最近一次执行的输出日志 |
| errorMessage | String | 错误信息 |
| createdBy | String | 任务创建人（登录账号） |
| tenantId | String | 租户 ID |
| createdTime | DateTime | 创建时间 |
| updatedTime | DateTime | 最后更新时间 |

### 状态枚举

| 状态值 | 说明 | 适用任务类型 |
|--------|------|-------------|
| CREATED | 已创建，等待操作 | 通用 |
| PRE_CHECKING | 预检查执行中 | 通用 |
| PRE_CHECK_DONE | 预检查完成 | 通用 |
| PRE_CHECK_FAILED | 预检查失败 | 通用 |
| INSTALLING | 执行中（安装/更新/修复） | 安装、软件包更新、漏洞修复 |
| INSTALL_DONE | 执行完成 | 安装、软件包更新、漏洞修复 |
| INSTALL_FAILED | 执行失败 | 安装、软件包更新、漏洞修复 |
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

### 软件包更新流程

```
创建更新任务 → 预检查(可跳过) → 更新 → 重启策略确认 → 重启(可跳过) → 校验(可跳过) → 完成
```

前端调用顺序：

1. `POST /create-pkg-update` 创建软件包更新任务
2. （可选）`POST /{id}/script/upload` 上传预检查/校验脚本
3. `POST /{id}/pre-check/execute` 或 `POST /{id}/pre-check/skip`
4. `POST /{id}/install/execute` 执行软件包更新
5. `GET /{id}/restart/options` 获取重启建议
6. `POST /{id}/restart/confirm` 确认或跳过重启
7. `POST /{id}/restart/execute`（确认重启时）
8. `POST /{id}/validate/execute` 或 `POST /{id}/validate/skip`

### 漏洞修复流程

```
创建修复任务 → 预检查(可跳过) → 修复 → 重启策略确认 → 重启(可跳过) → 校验(可跳过) → 完成
```

前端调用顺序：

1. `POST /create-vuln-fix` 创建漏洞修复任务
2. （可选）`POST /{id}/script/upload` 上传预检查/校验脚本
3. `POST /{id}/pre-check/execute` 或 `POST /{id}/pre-check/skip`
4. `POST /{id}/install/execute` 执行漏洞修复
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

### 创建软件包更新任务

```
POST /create-pkg-update
```

**请求体：**

```json
{
  "hostIds": ["host-001"],
  "packages": [
    "openssl#openssl-1.1.1f-4.p18.ky10.x86_64.rpm#KYSA-202403-1016",
    "bind-libs#bind-libs-9.11.21-19.ky10.x86_64.rpm#KYSA-202409-1074"
  ]
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| hostIds | 是 | 目标主机 ID 列表 |
| packages | 是 | 待更新的软件包列表，格式为 `包名#完整包文件名#补丁编号` |

**成功响应（200）：** 返回完整的 PatchInstallTask 对象，注意以下字段：

- `taskType = "pkg_update"`
- `packages`：存储的软件包列表 JSON
- `patchPkgs`：从 packages 中提取的包名列表
- `restartType` / `restartReason`：根据包名自动评估的重启建议

---

### 创建漏洞修复任务

```
POST /create-vuln-fix
```

**请求体：**

```json
{
  "hostIds": ["host-001", "host-002"],
  "patchIds": ["KYSA-202404-1062", "KYSA-202411-1038"],
  "patchStatusIds": ["status-id-1", "status-id-2"]
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| hostIds | 是 | 目标主机 ID 列表 |
| patchIds | 是 | 待修复的补丁/漏洞 ID 列表 |
| patchStatusIds | 否 | 漏洞概览状态 ID 列表，用于关联漏洞修复进度和评估重启策略 |

**成功响应（200）：** 返回完整的 PatchInstallTask 对象，注意以下字段：

- `taskType = "vuln_fix"`
- `patchPkgs`：补丁涉及的软件包名列表
- `restartType` / `restartReason`：根据漏洞状态和包名自动评估的重启建议

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
GET /list?taskType=&status=&page=0&size=20
```

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| taskType | 否 | 无 | 按任务类型筛选：`install` / `rollback` / `pkg_update` / `vuln_fix` |
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

## 步骤2：安装/回滚/更新/修复

### 执行安装/更新/修复

```
POST /{id}/install/execute
```

适用于 `install`（补丁安装）、`pkg_update`（软件包更新）、`vuln_fix`（漏洞修复）三种任务类型。内部根据 `taskType` 自动路由到对应的执行逻辑：

| taskType | 执行逻辑 |
|----------|---------|
| `install` | 通过 patchStatusIds 或 patchIds 调用补丁安装 |
| `pkg_update` | 通过 packages 列表调用软件包更新 |
| `vuln_fix` | 通过 patchStatusIds 调用漏洞修复 |

**成功响应（200）：** 返回 PatchInstallTask，关注字段：
- `status` → `INSTALLING`
- `executeRunId` → JAO 运行 ID

**失败场景：**
- 任务正在执行中：`{ "error": "补丁正在安装中，请勿重复操作" }`

---

### 执行补丁回滚

```
POST /{id}/rollback/execute
```

仅回滚任务（`taskType=rollback`）可调用。

**成功响应（200）：** 返回 PatchInstallTask，关注字段：
- `status` → `ROLLING_BACK`
- `executeRunId` → JAO 运行 ID

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

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| restartType | String | 重启类型：`system` / `service` / `none` |
| restartReason | String | 重启原因（包含涉及的软件包名称） |
| restartRequired | Boolean | 是否需要重启 |
| restartLabel | String | 重启类型中文标签 |
| restartDescription | String | 重启建议描述 |
| patchPkgs | String[] | 涉及的软件包名列表 |

`restartType` 取值：

| 值 | 说明 | 建议 |
|-----|------|------|
| `system` | 系统重启 | 包含内核等系统级组件，强烈建议重启 |
| `service` | 服务重启 | 仅需重启相关服务 |
| `none` | 无需重启 | 补丁可直接生效 |

**响应示例（系统重启）：**

```json
{
  "restartType": "system",
  "restartReason": "包含系统级组件（kernel、glibc），需要系统重启",
  "restartRequired": true,
  "restartLabel": "系统重启",
  "restartDescription": "该补丁包含内核级变更，平台建议进行系统重启以使补丁生效。\n涉及软件包：kernel、glibc",
  "patchPkgs": ["kernel", "glibc"]
}
```

**响应示例（服务重启）：**

```json
{
  "restartType": "service",
  "restartReason": "软件包更新（openssl、bind-libs），建议服务重启",
  "restartRequired": true,
  "restartLabel": "服务重启",
  "restartDescription": "该补丁影响相关服务，平台建议进行服务重启以使补丁生效。\n涉及软件包：openssl、bind-libs",
  "patchPkgs": ["openssl", "bind-libs"]
}
```

**响应示例（无需重启）：**

```json
{
  "restartType": "none",
  "restartReason": "涉及软件包（perl-Encode、java-11-openjdk），无需重启即可生效",
  "restartRequired": false,
  "restartLabel": "无需重启",
  "restartDescription": "该补丁无需重启即可生效",
  "patchPkgs": ["perl-Encode", "java-11-openjdk"]
}
```

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

## 操作审计日志

### 设计说明

一个完整的任务流程（安装 / 回滚 / 软件包更新 / 漏洞修复）作为**一条审计记录**展示在列表中，点击"详情"查看该流程内每一步的操作日志。

- **列表接口** → 返回 `PatchInstallTask`（一个任务 = 一行），按创建时间倒序
- **详情接口** → 返回结构化对象：`task`（任务实体）+ `steps`（各步骤汇总状态）+ `logs`（全部操作记录）

后台在每一步操作时自动写入 `vap2_patch_operation_log` 审计表，记录完整快照。当操作日志缺失时（如任务在日志功能上线前执行），详情接口会从任务实体的 `runId`、`status`、`currentStep` 等字段自动回补步骤状态。

---

### 流程操作记录列表

```
GET /audit/logs?taskType=&operator=&startTime=&endTime=&page=0&size=20
```

返回当前租户下所有任务（一个完整流程 = 一行记录），支持筛选。

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| taskType | 否 | 无 | 任务类型：`install` / `rollback` / `pkg_update` / `vuln_fix` |
| operator | 否 | 无 | 操作人（任务创建人，即 `createdBy` 字段） |
| startTime | 否 | 无 | 开始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| endTime | 否 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| page | 否 | 0 | 页码（从 0 开始） |
| size | 否 | 20 | 每页条数 |

> 筛选优先级：时间范围 > 操作人 > 任务类型 > 全部

**成功响应（200）：** Spring Data `Page<PatchInstallTask>` 分页对象，按 `createdTime` 倒序

```json
{
  "content": [
    {
      "id": "task-001",
      "status": "COMPLETED",
      "currentStep": "VALIDATE",
      "taskType": "vuln_fix",
      "osType": "linux",
      "osDistro": "Kylin V10",
      "patchPkgs": "[\"qemu\",\"qemu-guest-agent\",\"qemu-help\"]",
      "patchIds": "[\"KYSA-202108-1018\"]",
      "hostIds": "[\"192.168.1.145\"]",
      "restartType": "service",
      "restartConfirmed": true,
      "createdBy": "admin",
      "tenantId": "tenant-01",
      "createdTime": "2026-03-31T17:00:34.000+0000",
      "updatedTime": "2026-03-31T17:00:37.000+0000"
    },
    {
      "id": "task-002",
      "status": "COMPLETED",
      "currentStep": "VALIDATE",
      "taskType": "pkg_update",
      "osType": "linux",
      "osDistro": "Kylin V10",
      "patchPkgs": "[\"libexif\"]",
      "packages": "[\"libexif\"]",
      "patchIds": "[]",
      "hostIds": "[\"192.168.1.145\"]",
      "restartType": "none",
      "restartConfirmed": false,
      "createdBy": "admin",
      "tenantId": "tenant-01",
      "createdTime": "2026-03-31T16:57:30.000+0000",
      "updatedTime": "2026-03-31T16:57:55.000+0000"
    }
  ],
  "totalElements": 93,
  "totalPages": 5,
  "number": 0,
  "size": 20
}
```

**前端列表展示建议：**

| 列名 | 对应字段 | 说明 |
|------|---------|------|
| 记录时间 | `createdTime` | 任务创建时间 |
| 任务类型 | `taskType` | install=补丁安装, rollback=补丁回滚, pkg_update=软件包更新, vuln_fix=漏洞修复 |
| 状态 | `status` | 任务当前状态 |
| 操作人 | `createdBy` | 任务创建人 |
| 涉及软件包 | `patchPkgs` | JSON 数组，展示涉及的软件包列表 |
| 操作 | — | "详情"按钮，跳转到详情接口 |

---

### 流程操作详情

```
GET /{id}/audit/detail
```

查看一个完整流程内每一步的操作日志。返回结构化对象，包含任务实体、步骤汇总和全部操作记录。

| 参数 | 必填 | 说明 |
|------|------|------|
| id | 是 | 任务 ID（路径参数） |

**失败响应（404）：**

```json
{ "error": "任务不存在" }
```

**成功响应（200）：** 结构化对象

#### 响应顶层结构

| 字段 | 类型 | 说明 |
|------|------|------|
| task | PatchInstallTask | 完整的任务实体 |
| steps | StepSummary[] | 各步骤汇总状态（固定 4 个元素，按执行顺序排列） |
| logs | PatchOperationLog[] | 该任务的全部操作日志，按 `seqNo` 升序 |

#### StepSummary 步骤汇总对象

| 字段 | 类型 | 说明 |
|------|------|------|
| step | String | 步骤标识：`PRE_CHECK` / `INSTALL` 或 `ROLLBACK` / `RESTART` / `VALIDATE` |
| label | String | 步骤中文名称，根据 `taskType` 自动适配（见下表） |
| status | String | 步骤最终状态：`SUCCESS` / `FAILED` / `RUNNING` / `SKIPPED` / `PENDING` |
| remark | String | 步骤状态说明，如"预检查脚本为空，自动跳过"、"补丁回滚执行成功" |
| runId | String | 该步骤的 JAO 运行 ID（无则为 `null`） |
| logs | PatchOperationLog[] | 该步骤关联的操作日志子集 |

**步骤 label 与 taskType 对应关系：**

| taskType | 步骤 1 | 步骤 2 | 步骤 3 | 步骤 4 |
|----------|--------|--------|--------|--------|
| install | 预检查 | 补丁安装 | 重启策略 | 脚本校验 |
| vuln_fix | 预检查 | 漏洞修复 | 重启策略 | 脚本校验 |
| pkg_update | 预检查 | 软件包更新 | 重启策略 | 脚本校验 |
| rollback | 预检查 | 补丁回滚 | 重启策略 | 脚本校验 |

**步骤 status 取值说明：**

| status | 说明 | 前端展示建议 |
|--------|------|-------------|
| SUCCESS | 执行成功 | 绿色对勾 |
| FAILED | 执行失败 | 红色叉号 |
| RUNNING | 执行中 | 蓝色旋转图标 |
| SKIPPED | 已跳过（脚本为空自动跳过/用户手动跳过） | 灰色跳过图标 |
| PENDING | 等待执行（尚未进入该步骤） | 灰色圆点 |

**步骤状态推导规则：**

1. 优先从 `PatchOperationLog` 推导：取该步骤最新一条日志的 action/status 判断
2. 无日志时从任务实体回补：根据 `preCheckRunId`、`executeRunId`、`restartRunId`、`validateRunId`、`restartConfirmed`、`restartAction`、`preCheckScript`、`validateScript`、`status`、`currentStep` 等字段推断

#### PatchOperationLog 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 审计日志唯一标识（UUID） |
| taskId | String | 关联的任务 ID |
| taskType | String | 任务类型 |
| step | String | 操作步骤，见[审计步骤枚举](#审计步骤枚举) |
| action | String | 具体动作，见[审计动作枚举](#审计动作枚举) |
| operator | String | 操作人（登录账号） |
| tenantId | String | 租户 ID |
| patchIds | String(JSON) | 涉及的补丁 ID 列表 |
| hostIds | String(JSON) | 涉及的主机 ID 列表 |
| affectedPackages | String(JSON) | 受影响的软件包列表 |
| scriptContent | String | 脚本内容快照（上传/编辑脚本时保存） |
| scriptType | String | 脚本类型：`pre-check` / `validate` |
| restartType | String | 重启策略（仅重启确认记录填写） |
| restartAction | String | 重启动作（仅重启确认记录填写） |
| restartConfirmed | Boolean | 是否已确认重启（仅重启确认记录填写） |
| runId | String | JAO 运行 ID |
| executionOutput | String | 执行输出 |
| errorMessage | String | 错误信息 |
| status | String | 操作结果：`SUCCESS` / `FAILED` / `RUNNING` / `SKIPPED` |
| taskSnapshot | String(JSON) | 操作时任务的完整状态快照 |
| seqNo | Integer | 同一任务内的操作序号（递增） |
| createdTime | DateTime | 记录创建时间 |
| remark | String | 操作说明 |

**响应示例（有操作日志）：**

```json
{
  "task": {
    "id": "task-001",
    "status": "COMPLETED",
    "currentStep": "VALIDATE",
    "taskType": "vuln_fix",
    "hostIds": "[\"192.168.1.145\"]",
    "patchIds": "[\"KYSA-202108-1018\"]",
    "executeRunId": "run-install-001",
    "restartConfirmed": true,
    "restartAction": "none",
    "createdBy": "admin",
    "createdTime": "2026-03-31T17:00:34.000+08:00"
  },
  "steps": [
    {
      "step": "PRE_CHECK",
      "label": "预检查",
      "status": "SKIPPED",
      "remark": "预检查已跳过",
      "runId": null,
      "logs": [
        { "seqNo": 2, "step": "PRE_CHECK", "action": "SKIP", "status": "SKIPPED", "remark": "预检查已跳过" }
      ]
    },
    {
      "step": "INSTALL",
      "label": "漏洞修复",
      "status": "SUCCESS",
      "remark": "补丁安装执行成功",
      "runId": "run-install-001",
      "logs": [
        { "seqNo": 3, "step": "INSTALL", "action": "EXECUTE", "status": "RUNNING", "remark": "补丁安装开始执行" },
        { "seqNo": 4, "step": "INSTALL", "action": "COMPLETE", "status": "SUCCESS", "remark": "补丁安装执行成功", "runId": "run-install-001" }
      ]
    },
    {
      "step": "RESTART",
      "label": "重启策略",
      "status": "SKIPPED",
      "remark": "跳过重启",
      "runId": null,
      "logs": [
        { "seqNo": 5, "step": "RESTART", "action": "RESTART_SKIP", "status": "SKIPPED", "remark": "跳过重启" }
      ]
    },
    {
      "step": "VALIDATE",
      "label": "脚本校验",
      "status": "SKIPPED",
      "remark": "校验已跳过",
      "runId": null,
      "logs": [
        { "seqNo": 6, "step": "VALIDATE", "action": "SKIP", "status": "SKIPPED", "remark": "校验已跳过" }
      ]
    }
  ],
  "logs": [
    { "seqNo": 1, "step": "CREATE", "action": "TASK_CREATED", "status": "SUCCESS", "remark": "创建漏洞修复任务" },
    { "seqNo": 2, "step": "PRE_CHECK", "action": "SKIP", "status": "SKIPPED", "remark": "预检查已跳过" },
    { "seqNo": 3, "step": "INSTALL", "action": "EXECUTE", "status": "RUNNING", "remark": "补丁安装开始执行" },
    { "seqNo": 4, "step": "INSTALL", "action": "COMPLETE", "status": "SUCCESS", "remark": "补丁安装执行成功" },
    { "seqNo": 5, "step": "RESTART", "action": "RESTART_SKIP", "status": "SKIPPED", "remark": "跳过重启" },
    { "seqNo": 6, "step": "VALIDATE", "action": "SKIP", "status": "SKIPPED", "remark": "校验已跳过" }
  ]
}
```

**响应示例（无操作日志 — 任务在日志功能上线前执行，状态从任务实体回补）：**

```json
{
  "task": {
    "id": "2c9280849d4357ca019d43635c951c23",
    "status": "COMPLETED",
    "currentStep": "VALIDATE",
    "taskType": "rollback",
    "hostIds": "[\"2c9280839bbf8e6d019bc05431e70011\"]",
    "patchIds": "[\"KYSA-202206-1066\"]",
    "executeRunId": "86efee47ec73445a823a079e77564746",
    "restartConfirmed": true,
    "restartAction": "none",
    "preCheckScript": "",
    "validateScript": "",
    "createdBy": "admin",
    "createdTime": "2026-03-31T18:14:38.000+08:00"
  },
  "steps": [
    {
      "step": "PRE_CHECK",
      "label": "预检查",
      "status": "SKIPPED",
      "remark": "预检查脚本为空，自动跳过",
      "runId": null,
      "logs": []
    },
    {
      "step": "ROLLBACK",
      "label": "补丁回滚",
      "status": "SUCCESS",
      "remark": "补丁回滚执行成功",
      "runId": "86efee47ec73445a823a079e77564746",
      "logs": []
    },
    {
      "step": "RESTART",
      "label": "重启策略",
      "status": "SKIPPED",
      "remark": "用户选择跳过重启",
      "runId": null,
      "logs": []
    },
    {
      "step": "VALIDATE",
      "label": "脚本校验",
      "status": "SKIPPED",
      "remark": "校验脚本为空，自动跳过",
      "runId": null,
      "logs": []
    }
  ],
  "logs": []
}
```

**前端详情展示建议：**

前端应**优先使用 `steps` 数组渲染步骤进度条**，每个步骤的 `status` 直接对应图标和颜色：

1. 遍历 `steps` 数组，渲染 4 个步骤节点
2. 用 `status` 控制节点图标：SUCCESS→绿色勾, FAILED→红色叉, RUNNING→蓝色旋转, SKIPPED→灰色跳过, PENDING→灰色圆点
3. 用 `remark` 显示步骤说明文本
4. 点击具体步骤可展开 `logs` 查看该步骤的操作流水

---

### 审计步骤枚举

| step 值 | 说明 |
|---------|------|
| CREATE | 任务创建 |
| PRE_CHECK | 预检查 |
| SCRIPT | 脚本上传/编辑 |
| INSTALL | 安装/更新/修复 |
| ROLLBACK | 回滚 |
| RESTART | 重启 |
| VALIDATE | 校验 |

### 审计动作枚举

| action 值 | 说明 | 对应操作 |
|-----------|------|----------|
| TASK_CREATED | 创建任务 | 创建安装/回滚/更新/修复任务 |
| EXECUTE | 开始执行 | 执行预检查/安装/回滚/重启/校验 |
| SKIP | 跳过步骤 | 跳过预检查/校验/重启 |
| COMPLETE | 执行成功 | 预检查/安装/回滚/重启/校验回调成功 |
| FAILED | 执行失败 | 预检查/安装/回滚/重启/校验回调失败 |
| SCRIPT_UPLOAD | 上传脚本 | 上传预检查/校验脚本文件 |
| SCRIPT_UPDATE | 编辑脚本 | 在线编辑预检查/校验脚本内容 |
| RESTART_CONFIRM | 确认重启 | 用户确认执行重启 |
| RESTART_SKIP | 跳过重启 | 用户选择跳过重启 |

### 审计记录覆盖范围

| 用户操作 | step | action | 记录内容 |
|---------|------|--------|---------|
| 创建安装/回滚任务 | CREATE | TASK_CREATED | 补丁列表、主机列表、受影响包、重启策略、任务快照 |
| 上传脚本文件 | SCRIPT | SCRIPT_UPLOAD | 脚本类型 + 完整脚本内容快照 |
| 编辑脚本内容 | SCRIPT | SCRIPT_UPDATE | 脚本类型 + 完整脚本内容快照 |
| 执行预检查 | PRE_CHECK | EXECUTE | 任务快照 |
| 跳过预检查 | PRE_CHECK | SKIP | 任务快照 |
| 预检查成功回调 | PRE_CHECK | COMPLETE | runId + 执行输出 + 任务快照 |
| 预检查失败回调 | PRE_CHECK | FAILED | runId + 执行输出 + 错误信息 + 任务快照 |
| 执行安装 | INSTALL | EXECUTE | runId + 任务快照 |
| 安装成功回调 | INSTALL | COMPLETE | runId + 执行输出 + 任务快照 |
| 安装失败回调 | INSTALL | FAILED | runId + 执行输出 + 错误信息 + 任务快照 |
| 执行回滚 | ROLLBACK | EXECUTE | runId + 任务快照 |
| 回滚成功回调 | ROLLBACK | COMPLETE | runId + 执行输出 + 任务快照 |
| 回滚失败回调 | ROLLBACK | FAILED | runId + 执行输出 + 错误信息 + 任务快照 |
| 确认重启 | RESTART | RESTART_CONFIRM | 重启策略 + 确认状态 + 任务快照 |
| 跳过重启 | RESTART | RESTART_SKIP | 任务快照 |
| 执行重启 | RESTART | EXECUTE | 任务快照 |
| 重启成功回调 | RESTART | COMPLETE | runId + 执行输出 + 任务快照 |
| 重启失败回调 | RESTART | FAILED | runId + 执行输出 + 错误信息 + 任务快照 |
| 执行校验 | VALIDATE | EXECUTE | 任务快照 |
| 跳过校验 | VALIDATE | SKIP | 任务快照 |
| 校验成功回调 | VALIDATE | COMPLETE | runId + 执行输出 + 任务快照 |
| 校验失败回调 | VALIDATE | FAILED | runId + 执行输出 + 错误信息 + 任务快照 |

**请求示例：**

```
GET /audit/logs?taskType=install&page=0&size=20
GET /audit/logs?operator=admin&page=0&size=20
GET /audit/logs?startTime=2026-03-01 00:00:00&endTime=2026-03-31 23:59:59&page=0&size=20
```

---

### 旧版操作日志查询（jao_audit_log）

所有步骤（预检查、安装、回滚、校验、重启）的执行记录同时写入 `jao_audit_log` 表，可通过以下接口查询：

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
