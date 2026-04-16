# 补丁任务流程 API 文档（前端对接指南）

## 一、概述

基础路径：`/api/vap/v2/patch/task`

支持四种任务类型，每种任务创建后进入**流程化步骤操作**：

| 任务类型 | 创建接口 | 流程步骤 |
|---------|---------|---------|
| 补丁安装 (install) | `POST /create` | RPM预检 → 脚本预检 → 安装 → 重启 → 校验 |
| 漏洞修复 (vuln_fix) | `POST /create-vuln-fix` | RPM预检 → 脚本预检 → 安装 → 重启 → 校验 |
| 软件包更新 (pkg_update) | `POST /create-pkg-update` | RPM预检 → 脚本预检 → 安装 → 重启 → 校验 |
| 补丁回滚 (rollback) | `POST /create-rollback` | 脚本预检 → 回滚 → 重启 → 校验（**无RPM预检**） |

> **重要**：回滚任务没有 RPM 预检步骤，创建后直接从脚本预检开始。

---

## 二、完整流程与接口调用对照

下面按前端操作顺序，列出每个环节应调用的接口。

### 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    补丁安装 / 漏洞修复 / 软件包更新                 │
│                                                                 │
│  ① POST /create                                                │
│     └→ 返回 task（status=CREATED, currentStep=RPM_CHECK）        │
│                                                                 │
│  ② POST /{id}/rpm-check/execute  或  /{id}/rpm-check/skip      │
│     └→ execute: status → RPM_CHECKING                          │
│        轮询 GET /{id} 直到 RPM_CHECK_DONE / RPM_CHECK_FAILED    │
│     └→ skip: status → RPM_CHECK_DONE                           │
│                                                                 │
│  ③ POST /{id}/pre-check/execute  或  /{id}/pre-check/skip      │
│     └→ execute: status → PRE_CHECKING                          │
│        轮询 GET /{id} 直到 PRE_CHECK_DONE / PRE_CHECK_FAILED    │
│     └→ skip: status → PRE_CHECK_DONE                           │
│                                                                 │
│  ④ POST /{id}/install/execute                                  │
│     └→ status → INSTALLING                                     │
│        轮询 GET /{id} 直到 INSTALL_DONE / INSTALL_FAILED        │
│                                                                 │
│  ⑤ GET /{id}/restart/options → 获取重启建议                      │
│     POST /{id}/restart/confirm → 确认或跳过                      │
│     POST /{id}/restart/execute                                  │
│     └→ status → RESTARTING                                     │
│        轮询 GET /{id} 直到 RESTART_DONE / FAILED                │
│                                                                 │
│  ⑥ POST /{id}/validate/execute  或  /{id}/validate/skip        │
│     └→ execute: status → VALIDATING                            │
│        轮询 GET /{id} 直到 COMPLETED / VALIDATE_FAILED          │
│     └→ skip: status → COMPLETED                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        补丁回滚                                  │
│                                                                 │
│  ① POST /create-rollback                                       │
│     └→ 返回 task（status=CREATED, currentStep=PRE_CHECK）        │
│        ↑ 注意：回滚没有 RPM_CHECK 步骤                            │
│                                                                 │
│  ② POST /{id}/pre-check/execute  或  /{id}/pre-check/skip      │
│  ③ POST /{id}/rollback/execute                                 │
│  ④ 重启确认 + 执行                                               │
│  ⑤ 校验                                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 脚本上传/编辑（可在任意步骤随时操作）

```
POST /{id}/script/upload     上传脚本文件
PUT  /{id}/script/update     编辑脚本内容
GET  /{id}/script/download   下载脚本内容（Ansible内部使用）
```

---

## 三、接口详细说明

### 3.1 创建任务

创建任务后平台自动完成：提取软件包列表、推断 OS 发行版、评估重启需求。

#### 3.1.1 创建补丁安装任务

```
POST /api/vap/v2/patch/task/create
```

**请求体**

```json
{
  "hostIds": ["host-001", "host-002"],
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "patchStatusIds": ["status-001"],
  "osType": "linux"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ACM 资产 ID |
| patchIds | string[] | 是 | 补丁 ID |
| patchStatusIds | string[] | 否 | 机器补丁状态 ID，用于评估重启和推断 OS |
| osType | string | 否 | 默认 `linux` |

**响应**：返回完整 `PatchInstallTask` 对象

```json
{
  "id": "8a80cb8190xxx",
  "status": "CREATED",
  "currentStep": "RPM_CHECK",
  "taskType": "install",
  "restartType": "system",
  "restartReason": "包含系统级组件(kernel)，需要系统重启",
  "rpmCheckRunId": null,
  "rpmCheckResult": null,
  "preCheckScript": null,
  "validateScript": null
}
```

> **前端关注**：`currentStep` 为 `RPM_CHECK`，表示下一步应操作 RPM 依赖预检。

#### 3.1.2 创建漏洞修复任务

```
POST /api/vap/v2/patch/task/create-vuln-fix
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ID |
| patchIds | string[] | 是 | 补丁 ID |
| patchStatusIds | string[] | 否 | 机器补丁状态 ID |

响应同上，`taskType` = `vuln_fix`，`currentStep` = `RPM_CHECK`。

#### 3.1.3 创建软件包更新任务

```
POST /api/vap/v2/patch/task/create-pkg-update
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ID |
| packages | string[] | 是 | 软件包列表（如 `["openssl", "glibc#x86_64"]`） |

响应同上，`taskType` = `pkg_update`，`currentStep` = `RPM_CHECK`。

#### 3.1.4 创建补丁回滚任务

```
POST /api/vap/v2/patch/task/create-rollback
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ID |
| patchIds | string[] | 是 | 补丁 ID |
| patchStatusIds | string[] | 否 | 机器补丁状态 ID |
| histUpdateIds | string[] | 否 | 历史安装记录 ID（有则使用精确回滚） |

**响应**：`taskType` = `rollback`，`currentStep` = **`PRE_CHECK`**（不是 RPM_CHECK）。

> **前端关注**：回滚任务不走 RPM 预检，页面上应隐藏 RPM 预检步骤，直接展示脚本预检。

---

### 3.2 查看任务详情（轮询接口）

```
GET /api/vap/v2/patch/task/{id}
```

**前端轮询关键**：每个异步步骤执行后，前端以 3~5 秒间隔轮询此接口，根据 `status` 字段判断步骤是否完成。

**响应中前端需关注的字段**：

| 字段 | 用途 |
|------|------|
| `status` | 判断当前步骤执行状态（见下方状态表） |
| `currentStep` | 当前处于哪个步骤 |
| `taskType` | 任务类型，决定是否显示 RPM 预检 |
| `errorMessage` | 失败时的错误描述 |
| `rpmCheckResult` | RPM 预检结果：`"PASS"` 或缺失包描述 |
| `restartType` | 重启类型：`system` / `service` / `none` |
| `restartReason` | 重启原因描述 |

---

### 3.3 任务列表

```
GET /api/vap/v2/patch/task/list?taskType=install&status=CREATED&page=0&size=20
```

| 参数 | 必填 | 说明 |
|------|------|------|
| taskType | 否 | 按任务类型筛选：`install` / `rollback` / `pkg_update` / `vuln_fix` |
| status | 否 | 按状态筛选 |
| page | 否 | 页码，默认 0 |
| size | 否 | 每页条数，默认 20 |

> 管理员可看租户下所有任务；普通用户只能看自己创建的。

---

### 3.4 步骤0：RPM 依赖预检

> **仅限 install / vuln_fix / pkg_update 任务，回滚任务不可调用。**

#### 3.4.1 执行 RPM 依赖预检

```
POST /api/vap/v2/patch/task/{id}/rpm-check/execute
```

**无请求体。**

**调用时机**：任务创建后，进入流程的第一步。

**后端执行流程**（异步）：
1. 向目标主机下发 Ansible 脚本执行 `rpm -qa` 采集已安装包
2. 采集结果通过回调入库
3. 自动将采集到的已安装包与补丁依赖做比对（包名、版本、架构）
4. 比对通过 → `RPM_CHECK_DONE`；发现缺失/版本不足 → `RPM_CHECK_FAILED`

**响应**：返回 `PatchInstallTask` 对象，`status` 为 `RPM_CHECKING`。

**前端轮询**：

```
调用 POST /{id}/rpm-check/execute
  ↓
status = "RPM_CHECKING"
  ↓
轮询 GET /{id}，每 3~5 秒一次
  ↓
status = "RPM_CHECK_DONE"   → 通过，显示绿色标记，可进入下一步
status = "RPM_CHECK_FAILED" → 失败，显示 errorMessage 中的缺失包信息
```

**RPM_CHECK_FAILED 时的关键字段**：
- `errorMessage`：如 `"主机上有3个补丁依赖包不满足要求: host-001:openssl(MISSING), host-001:glibc(VERSION_LOW)"`
- `rpmCheckResult`：完整比对结果

#### 3.4.2 跳过 RPM 依赖预检

```
POST /api/vap/v2/patch/task/{id}/rpm-check/skip
```

**无请求体。** 跳过后 `status` 直接变为 `RPM_CHECK_DONE`，无需轮询。

---

### 3.5 步骤1：脚本预检查

#### 3.5.1 上传/编辑预检脚本（可选，可随时操作）

```
POST /api/vap/v2/patch/task/{id}/script/upload
Content-Type: multipart/form-data
参数: scriptType=pre-check, file=xxx.sh
```

```
PUT /api/vap/v2/patch/task/{id}/script/update
Body: { "scriptType": "pre-check", "content": "#!/bin/bash\n..." }
```

#### 3.5.2 执行脚本预检查

```
POST /api/vap/v2/patch/task/{id}/pre-check/execute
```

**无请求体。**

- 如果 `preCheckScript` 为空 → 自动跳过，`status` 直接变为 `PRE_CHECK_DONE`
- 如果有脚本 → `status` 变为 `PRE_CHECKING`，需要轮询

**前端轮询**：

```
调用 POST /{id}/pre-check/execute
  ↓
若脚本为空: status 立即变为 "PRE_CHECK_DONE"（无需轮询）
若有脚本:   status = "PRE_CHECKING"
  ↓
轮询 GET /{id}，每 3~5 秒
  ↓
status = "PRE_CHECK_DONE"   → 通过
status = "PRE_CHECK_FAILED" → 失败，显示 errorMessage
```

#### 3.5.3 跳过脚本预检查

```
POST /api/vap/v2/patch/task/{id}/pre-check/skip
```

`status` 直接变为 `PRE_CHECK_DONE`。

---

### 3.6 步骤2：执行安装/回滚

#### 3.6.1 执行补丁安装（install / vuln_fix / pkg_update）

```
POST /api/vap/v2/patch/task/{id}/install/execute
```

**无请求体。**

**前端轮询**：

```
调用 POST /{id}/install/execute
  ↓
status = "INSTALLING"
  ↓
轮询 GET /{id}，每 5 秒
  ↓
status = "INSTALL_DONE"   → 安装完成
status = "INSTALL_FAILED" → 安装失败，显示 errorMessage
```

#### 3.6.2 执行补丁回滚（rollback）

```
POST /api/vap/v2/patch/task/{id}/rollback/execute
```

**无请求体。**

**前端轮询**：

```
调用 POST /{id}/rollback/execute
  ↓
status = "ROLLING_BACK"
  ↓
轮询 GET /{id}，每 5 秒
  ↓
status = "ROLLBACK_DONE"   → 回滚完成
status = "ROLLBACK_FAILED" → 回滚失败
```

> **前端逻辑**：根据 `taskType` 决定显示"安装"还是"回滚"按钮。`taskType == "rollback"` → 显示"执行回滚"并调用 `/rollback/execute`；其他 → 显示"执行安装"并调用 `/install/execute`。

---

### 3.7 步骤3：重启

#### 3.7.1 获取重启策略

```
GET /api/vap/v2/patch/task/{id}/restart/options
```

**调用时机**：安装/回滚完成后，展示重启步骤之前。

**响应**：

```json
{
  "restartType": "system",
  "restartReason": "包含系统级组件(kernel, glibc)，需要系统重启",
  "restartRequired": true,
  "restartLabel": "系统重启",
  "restartDescription": "该补丁包含内核级变更，平台建议进行系统重启以使补丁生效。",
  "patchPkgs": ["kernel", "glibc"]
}
```

| 字段 | 说明 |
|------|------|
| restartType | `system` / `service` / `none` |
| restartRequired | `true` = 需要重启，`false` = 无需重启 |
| restartLabel | 中文标签，直接展示给用户 |
| restartDescription | 描述文案，直接展示 |

**前端展示逻辑**：
- `restartRequired == true` → 显示"确认重启"和"跳过重启"两个按钮
- `restartRequired == false` → 显示"无需重启"提示，可直接跳过

#### 3.7.2 确认是否重启

```
POST /api/vap/v2/patch/task/{id}/restart/confirm
```

**确认执行重启**（需二次确认）：

```json
{
  "confirm": true,
  "confirmText": "确认重启"
}
```

**跳过重启**：

```json
{
  "confirm": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| confirm | boolean | 是 | `true` = 执行，`false` = 跳过 |
| confirmText | string | confirm=true 时必填 | 必须为 `"确认重启"` 四个字 |

- 跳过 → `status` 直接变为 `RESTART_DONE`，无需轮询
- 确认 → `status` 变为 `RESTART_PENDING`，等待执行

#### 3.7.3 执行重启

```
POST /api/vap/v2/patch/task/{id}/restart/execute
```

**调用时机**：`confirm` 后 `status == RESTART_PENDING` 时调用。

**前端轮询**：

```
调用 POST /{id}/restart/execute
  ↓
status = "RESTARTING"
  ↓
轮询 GET /{id}，每 5~10 秒（重启耗时较长）
  ↓
status = "RESTART_DONE" → 重启完成
status = "FAILED"       → 重启失败
```

---

### 3.8 步骤4：校验

#### 3.8.1 上传/编辑校验脚本（可选，可随时操作）

```
POST /{id}/script/upload   scriptType=validate, file=xxx.sh
PUT  /{id}/script/update   { "scriptType": "validate", "content": "..." }
```

#### 3.8.2 执行校验

```
POST /api/vap/v2/patch/task/{id}/validate/execute
```

- 如果 `validateScript` 为空 → 自动跳过，`status` 直接变为 `COMPLETED`
- 如果有脚本 → `status` 变为 `VALIDATING`，需要轮询

**前端轮询**：

```
调用 POST /{id}/validate/execute
  ↓
若脚本为空: status 立即变为 "COMPLETED"（流程结束）
若有脚本:   status = "VALIDATING"
  ↓
轮询 GET /{id}，每 3~5 秒
  ↓
status = "COMPLETED"       → 流程完成
status = "VALIDATE_FAILED" → 校验失败
```

#### 3.8.3 跳过校验

```
POST /api/vap/v2/patch/task/{id}/validate/skip
```

`status` 直接变为 `COMPLETED`，整个流程结束。

---

### 3.9 回滚专属：回滚信息查询

```
GET /api/vap/v2/patch/task/{id}/rollback/info
```

**调用时机**：回滚任务的预检查完成后、执行回滚之前。

返回内核回滚检测结果和重启建议，用于内核级回滚场景的提示。

---

### 3.10 审计操作日志

#### 流程操作记录列表

```
GET /api/vap/v2/patch/task/audit/logs?taskType=install&page=0&size=20
```

| 参数 | 必填 | 说明 |
|------|------|------|
| taskType | 否 | `install` / `rollback` / `pkg_update` / `vuln_fix` |
| operator | 否 | 按操作人筛选 |
| startTime | 否 | 格式 `yyyy-MM-dd HH:mm:ss` |
| endTime | 否 | 格式 `yyyy-MM-dd HH:mm:ss` |

#### 流程操作详情

```
GET /api/vap/v2/patch/task/{id}/audit/detail
```

返回结构：

```json
{
  "task": { ... },
  "steps": [
    { "step": "RPM_CHECK", "label": "RPM依赖预检", "status": "SUCCESS", "remark": "...", "runId": "...", "logs": [...] },
    { "step": "PRE_CHECK", "label": "预检查", "status": "SKIPPED", "remark": "...", "logs": [...] },
    { "step": "INSTALL",   "label": "补丁安装", "status": "SUCCESS", "remark": "...", "logs": [...] },
    { "step": "RESTART",   "label": "重启策略", "status": "SKIPPED", "remark": "...", "logs": [...] },
    { "step": "VALIDATE",  "label": "脚本校验", "status": "PENDING",  "remark": "...", "logs": [...] }
  ],
  "logs": [ ... ]
}
```

> 回滚任务的 `steps` 中 `RPM_CHECK` 会显示为 `SKIPPED`。

---

## 四、状态速查表

### status 完整列表

| status | 说明 | 出现在哪个步骤 |
|--------|------|--------------|
| `CREATED` | 任务已创建，尚未操作 | 创建后 |
| `RPM_CHECKING` | RPM 采集+比对执行中 | 步骤0 |
| `RPM_CHECK_DONE` | RPM 预检通过（或跳过） | 步骤0 |
| `RPM_CHECK_FAILED` | RPM 预检失败 | 步骤0 |
| `PRE_CHECKING` | 脚本预检查执行中 | 步骤1 |
| `PRE_CHECK_DONE` | 脚本预检查完成（或跳过） | 步骤1 |
| `PRE_CHECK_FAILED` | 脚本预检查失败 | 步骤1 |
| `INSTALLING` | 补丁安装中 | 步骤2 |
| `INSTALL_DONE` | 安装完成 | 步骤2 |
| `INSTALL_FAILED` | 安装失败 | 步骤2 |
| `ROLLING_BACK` | 补丁回滚中 | 步骤2（回滚） |
| `ROLLBACK_DONE` | 回滚完成 | 步骤2（回滚） |
| `ROLLBACK_FAILED` | 回滚失败 | 步骤2（回滚） |
| `RESTART_PENDING` | 已确认重启，待执行 | 步骤3 |
| `RESTARTING` | 重启执行中 | 步骤3 |
| `RESTART_DONE` | 重启完成（或跳过） | 步骤3 |
| `VALIDATING` | 校验执行中 | 步骤4 |
| `VALIDATE_FAILED` | 校验失败 | 步骤4 |
| `COMPLETED` | 流程全部完成 | 步骤4 |
| `FAILED` | 执行异常 | 任意步骤 |

### currentStep 值

| currentStep | 说明 |
|-------------|------|
| `RPM_CHECK` | 当前处于 RPM 依赖预检步骤（仅非回滚任务） |
| `PRE_CHECK` | 当前处于脚本预检查步骤 |
| `INSTALL` | 当前处于安装步骤 |
| `ROLLBACK` | 当前处于回滚步骤 |
| `RESTART` | 当前处于重启步骤 |
| `VALIDATE` | 当前处于校验步骤 |

---

## 五、前端集成要点

### 5.1 根据 taskType 区分 UI

```
if (task.taskType === 'rollback') {
    // 隐藏 RPM 预检步骤
    // 步骤2 显示"执行回滚"，调用 POST /{id}/rollback/execute
} else {
    // 显示 RPM 预检步骤
    // 步骤2 显示"执行安装"，调用 POST /{id}/install/execute
}
```

### 5.2 步骤展示逻辑

| 步骤 | 是否显示 | 按钮 | 操作 |
|------|---------|------|------|
| RPM预检 | `taskType != 'rollback'` | "执行预检" / "跳过" | `POST /{id}/rpm-check/execute` 或 `/skip` |
| 脚本预检 | 始终 | "执行" / "跳过" | `POST /{id}/pre-check/execute` 或 `/skip` |
| 安装/回滚 | 始终 | "执行安装"或"执行回滚" | `POST /{id}/install/execute` 或 `/rollback/execute` |
| 重启 | 始终 | "确认重启" / "跳过重启" | 先 `GET /{id}/restart/options`，再 `POST /{id}/restart/confirm`，再 `POST /{id}/restart/execute` |
| 校验 | 始终 | "执行" / "跳过" | `POST /{id}/validate/execute` 或 `/skip` |

### 5.3 轮询模式统一

所有异步步骤使用同一轮询模式：

```javascript
async function executeStep(taskId, stepUrl) {
    // 1. 触发执行
    await post(`/api/vap/v2/patch/task/${taskId}/${stepUrl}`);
    
    // 2. 轮询等待结果
    while (true) {
        await sleep(3000); // 3~5秒间隔
        const task = await get(`/api/vap/v2/patch/task/${taskId}`);
        
        if (task.status.endsWith('_DONE') || task.status === 'COMPLETED') {
            return { success: true, task };
        }
        if (task.status.endsWith('_FAILED') || task.status === 'FAILED') {
            return { success: false, error: task.errorMessage, task };
        }
        // 仍在执行中（*_CHECKING / INSTALLING / RESTARTING / VALIDATING），继续轮询
    }
}

// 使用示例
await executeStep(taskId, 'rpm-check/execute');
await executeStep(taskId, 'pre-check/execute');
await executeStep(taskId, 'install/execute');
```

### 5.4 RPM 预检失败的展示

当 `status == RPM_CHECK_FAILED` 时：

```javascript
// errorMessage 示例：
// "主机上有3个补丁依赖包不满足要求: host-001:openssl(MISSING), host-001:glibc(VERSION_LOW) 等"

// 前端建议：
// 1. 用红色警示框展示 task.errorMessage
// 2. rpmCheckResult 字段包含更详细的信息
// 3. 提供"重新执行"按钮（再次调用 rpm-check/execute）
// 4. 提供"忽略继续"按钮（调用 rpm-check/skip 覆盖失败状态为 DONE）
```

### 5.5 脚本编辑区

- 预检查脚本和校验脚本默认为空
- 提供上传按钮（`POST /{id}/script/upload`）和文本编辑区（`PUT /{id}/script/update`）
- 脚本编辑可在任何步骤进行，不受流程状态限制
- `scriptType` 值：`pre-check`（预检脚本）、`validate`（校验脚本）

---

## 六、完整调用时序示例

### 补丁安装任务（完整路径）

```bash
# ① 创建任务
POST /api/vap/v2/patch/task/create
Body: { "hostIds": ["h1","h2"], "patchIds": ["CVE-2025-1234"] }
→ 返回 task.id = "task-001", status = "CREATED", currentStep = "RPM_CHECK"

# ② RPM 依赖预检
POST /api/vap/v2/patch/task/task-001/rpm-check/execute
→ status = "RPM_CHECKING"
# 轮询...
GET /api/vap/v2/patch/task/task-001
→ status = "RPM_CHECK_DONE"  ✓

# ③ 脚本预检查（无脚本，自动跳过）
POST /api/vap/v2/patch/task/task-001/pre-check/execute
→ status = "PRE_CHECK_DONE"  ✓ （preCheckScript 为空，立即完成）

# ④ 执行安装
POST /api/vap/v2/patch/task/task-001/install/execute
→ status = "INSTALLING"
# 轮询...
GET /api/vap/v2/patch/task/task-001
→ status = "INSTALL_DONE"  ✓

# ⑤ 重启评估
GET /api/vap/v2/patch/task/task-001/restart/options
→ { "restartType": "system", "restartRequired": true, "restartLabel": "系统重启" }

# ⑤a 确认重启
POST /api/vap/v2/patch/task/task-001/restart/confirm
Body: { "confirm": true, "confirmText": "确认重启" }
→ status = "RESTART_PENDING"

# ⑤b 执行重启
POST /api/vap/v2/patch/task/task-001/restart/execute
→ status = "RESTARTING"
# 轮询...
→ status = "RESTART_DONE"  ✓

# ⑥ 校验（跳过）
POST /api/vap/v2/patch/task/task-001/validate/skip
→ status = "COMPLETED"  ✓  流程结束
```

### 回滚任务（完整路径）

```bash
# ① 创建回滚任务
POST /api/vap/v2/patch/task/create-rollback
Body: { "hostIds": ["h1"], "patchIds": ["CVE-2025-1234"] }
→ task.id = "task-002", status = "CREATED", currentStep = "PRE_CHECK"
#   ↑ 注意：没有 RPM_CHECK 步骤

# ② 脚本预检查（跳过）
POST /api/vap/v2/patch/task/task-002/pre-check/skip
→ status = "PRE_CHECK_DONE"

# ③ 执行回滚
POST /api/vap/v2/patch/task/task-002/rollback/execute
→ status = "ROLLING_BACK"
# 轮询...
→ status = "ROLLBACK_DONE"

# ④ 重启（跳过）
POST /api/vap/v2/patch/task/task-002/restart/confirm
Body: { "confirm": false }
→ status = "RESTART_DONE"

# ⑤ 校验（跳过）
POST /api/vap/v2/patch/task/task-002/validate/skip
→ status = "COMPLETED"
```

---

## 七、接口总览表

| 环节 | 方法 | 路径 | 适用任务类型 | 说明 |
|------|------|------|------------|------|
| 创建 | POST | `/create` | install | 创建补丁安装任务 |
| 创建 | POST | `/create-vuln-fix` | vuln_fix | 创建漏洞修复任务 |
| 创建 | POST | `/create-pkg-update` | pkg_update | 创建软件包更新任务 |
| 创建 | POST | `/create-rollback` | rollback | 创建回滚任务 |
| 查询 | GET | `/{id}` | 全部 | 查看详情（轮询用） |
| 查询 | GET | `/list` | 全部 | 任务列表（分页） |
| 脚本 | POST | `/{id}/script/upload` | 全部 | 上传脚本文件 |
| 脚本 | PUT | `/{id}/script/update` | 全部 | 编辑脚本内容 |
| 步骤0 | POST | `/{id}/rpm-check/execute` | install/vuln_fix/pkg_update | 执行 RPM 依赖预检 |
| 步骤0 | POST | `/{id}/rpm-check/skip` | install/vuln_fix/pkg_update | 跳过 RPM 依赖预检 |
| 步骤1 | POST | `/{id}/pre-check/execute` | 全部 | 执行脚本预检查 |
| 步骤1 | POST | `/{id}/pre-check/skip` | 全部 | 跳过脚本预检查 |
| 步骤2 | POST | `/{id}/install/execute` | install/vuln_fix/pkg_update | 执行补丁安装 |
| 步骤2 | POST | `/{id}/rollback/execute` | rollback | 执行补丁回滚 |
| 步骤3 | GET | `/{id}/restart/options` | 全部 | 获取重启策略 |
| 步骤3 | POST | `/{id}/restart/confirm` | 全部 | 确认/跳过重启 |
| 步骤3 | POST | `/{id}/restart/execute` | 全部 | 执行重启 |
| 步骤4 | POST | `/{id}/validate/execute` | 全部 | 执行校验 |
| 步骤4 | POST | `/{id}/validate/skip` | 全部 | 跳过校验 |
| 回滚 | GET | `/{id}/rollback/info` | rollback | 获取回滚信息 |
| 审计 | GET | `/audit/logs` | 全部 | 流程操作记录列表 |
| 审计 | GET | `/{id}/audit/detail` | 全部 | 流程操作详情 |

---

## 八、回调接口（后端内部，前端无需关注）

| 路径 | 说明 |
|------|------|
| `POST /api/vap/v2/callback/repo-rpm-scan` | RPM 采集完成，自动触发依赖比对 |
| `POST /api/vap/v2/callback/pre-check` | 脚本预检查完成 |
| `POST /api/vap/v2/callback/update` | 安装完成 |
| `POST /api/vap/v2/callback/fallback` | 回滚完成 |
| `POST /api/vap/v2/callback/restart` | 重启完成 |
| `POST /api/vap/v2/callback/validate` | 校验完成 |
