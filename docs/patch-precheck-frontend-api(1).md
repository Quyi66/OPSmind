# 补丁安装前置环境检查 - 前端接口对接文档

> 面向前端：补丁安装向导「预检查」步骤新增「前置环境检查」能力。检查并入既有 `PRE_CHECK`
> 步骤，**不新增状态机状态、不新增向导步骤**。Linux 任务点击「执行预检查」即触发一次只读的
> 目标机环境体检；存在阻断项时安装步骤被门禁拦截。Windows 任务沿用旧行为（脚本为空自动跳过）。

## 1. 名词与语义

- **BLOCKER（阻断项，`status: "fail"`）**：会导致补丁安装大概率失败的问题，**阻断安装**。任一主机存在阻断项 → 任务进入 `PRE_CHECK_FAILED`。
- **WARNING（警告项，`status: "warn"`）**：值得关注但不影响安装继续，**不阻断**。
- **OK（`status: "ok"`）**：该项检查通过。
- 每台主机的 `blockers` = 该主机 `status=="fail"` 的检查项数；`warnings` = `status=="warn"` 的项数。
- **不可达主机**：SSH/Ansible 通道不通的主机。连通性作为**每台主机的一个检查项**呈现——不可达主机同样在 `results[]` 里各占一条，其 `checks[]` 含一条 `id=conn`、`status=fail` 的 BLOCKER 项。没有独立的 `conn` 字段或 `unreachable` 数组，前端对可达/不可达主机用同一套 per-host 结构渲染即可。

## 2. 相关接口

前缀：`/api/secops/v2/patch/task`（任务）与 `/api/secops/v2/callback`（平台内部回调，前端无需调用）。

### 2.1 执行预检查（触发环境检查）

```
POST /api/secops/v2/patch/task/{id}/pre-check/execute
```

- 行为：
  - **Linux**：必跑环境检查（不再因脚本为空而跳过）。提交检查作业后任务进入 `PRE_CHECKING`，`pre_check_run_id` 写入检查作业 runId；异步回调完成后落库结果并推进状态。若任务额外配置了自定义预检查脚本（`pre_check_script`），则在环境检查**全部主机通过后**自动接续执行该脚本。
  - **Windows**：沿用旧逻辑——`pre_check_script` 为空则直接 `PRE_CHECK_DONE`，否则下发脚本。
- 响应：`200` 返回任务对象（此时通常 `status: "PRE_CHECKING"`）。
- 失败：作业提交失败时任务直接 `PRE_CHECK_FAILED`，`error_message` 说明原因。
- 前端交互：调用后轮询任务详情（见 2.3），直到 `status` 不再是 `PRE_CHECKING`。

请求示例：

```
POST /api/secops/v2/patch/task/9f3c.../pre-check/execute
```

响应示例（已提交，检查进行中）：

```json
{
  "id": "9f3c...",
  "status": "PRE_CHECKING",
  "currentStep": "PRE_CHECK",
  "preCheckRunId": "run-abc123",
  "preCheckResult": null
}
```

### 2.2 跳过预检查（显式逃生通道）

```
POST /api/secops/v2/patch/task/{id}/pre-check/skip
```

- 行为：不做任何检查，直接把任务置为 `PRE_CHECK_DONE`。**这是环境检查失败后仍要强行安装的唯一合规入口。**
- 响应：`200` 返回任务对象（`status: "PRE_CHECK_DONE"`）。
- 前端建议：当环境检查失败（`PRE_CHECK_FAILED`）时，在阻断项列表下方提供「我已知晓风险，跳过检查并继续」的二次确认按钮，点击调用本接口。

### 2.3 查询任务详情（读取检查结果）

```
GET /api/secops/v2/patch/task/{id}
```

- 响应：任务对象，环境检查结果在 `preCheckResult` 字段（字符串化 JSON，见第 3 节）。
- `status` 取值（与本功能相关）：
  - `PRE_CHECKING`：检查进行中，前端继续轮询。
  - `PRE_CHECK_DONE`：检查通过（或已跳过），可进入安装。
  - `PRE_CHECK_FAILED`：存在阻断项/不可达主机，`error_message` 为按主机分组的可读汇总，`preCheckResult` 为结构化明细。

### 2.4 执行安装（受门禁约束）

```
POST /api/secops/v2/patch/task/{id}/install/execute
```

- 门禁：当任务 `status == "PRE_CHECK_FAILED"` 时，接口返回 **HTTP 400**：

```json
{ "error": "前置环境检查未通过，无法安装。请重新检查通过，或显式跳过预检查后再安装" }
```

- 解除门禁的两条路径：
  1. 重新执行预检查（2.1），修复目标机问题后使其通过 → `PRE_CHECK_DONE`；
  2. 显式跳过预检查（2.2）→ `PRE_CHECK_DONE`。

## 3. `preCheckResult` 结构

`preCheckResult` 为字符串化 JSON，解析后**只有一个 `results` 数组**，每台目标主机一条，一台机器的全部信息都在它自己的 `checks[]` 里（连通性也是其中一个检查项）：

```json
{
  "results": [
    {
      "host_id": "ci-1001",
      "blockers": 1,
      "warnings": 1,
      "checks": [
        { "id": "sudo",              "status": "ok",   "detail": "sudo 免密提权可用" },
        { "id": "pkg_manager",       "status": "ok",   "detail": "包管理器: dnf" },
        { "id": "pkg_lock",          "status": "ok",   "detail": "包管理器空闲" },
        { "id": "pkg_db",            "status": "ok",   "detail": "rpmdb 正常(rpm -q rpm 成功)" },
        { "id": "disk",              "status": "ok",   "detail": "根分区/ /var 可用空间充足(阈值 500MB)" },
        { "id": "kernel_pending",    "status": "warn", "detail": "已安装内核 4.18.0-425.el8.x86_64 高于运行中 4.18.0-372.el8.x86_64，可能存在待生效的重启" },
        { "id": "repo",              "status": "ok",   "detail": "已启用 6 个软件仓库" },
        { "id": "pkg_exists",        "status": "ok",   "detail": "全部目标软件包在仓库中存在" },
        { "id": "version_ok",        "status": "fail", "detail": "以下目标版本在仓库中不可解析(版本不足或变体缺失): openssl-1.0.2k-23.el7_9" },
        { "id": "depsolve",          "status": "ok",   "detail": "依赖可解析(dry-run 通过)" },
        { "id": "already_satisfied", "status": "ok",   "detail": "存在需升级的软件包" }
      ]
    },
    {
      "host_id": "ci-1002",
      "blockers": 1,
      "warnings": 0,
      "checks": [
        { "id": "conn", "status": "fail", "detail": "主机无法连通（SSH 不可达），请检查网络与 SSH 服务后重试" }
      ]
    }
  ]
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `results[]` | 每台**目标**主机一条（含不可达主机） |
| `results[].host_id` | 主机 CI id（与创建任务时的 hostIds 对应） |
| `results[].blockers` | 该主机阻断项数量（`checks` 中 `status=="fail"` 的项数），用于角标/门禁 |
| `results[].warnings` | 该主机警告项数量（`checks` 中 `status=="warn"` 的项数） |
| `results[].checks[]` | 该主机全部检查项明细 |
| `checks[].id` | 检查项标识，见第 4 节 |
| `checks[].status` | `ok` / `fail`(BLOCKER) / `warn`(WARNING) |
| `checks[].detail` | 该项的中文说明/失败原因 |

> 判定是否通过：所有 `results[].blockers == 0`（整体放行仍以任务 `status` 为准）。
> 连通性：不可达主机在其 `checks[]` 中含一条 `id=conn`、`status=fail` 的项；前端据此识别并特殊渲染即可，**无独立的 `conn` 字段或 `unreachable` 数组**。

## 4. 检查项 id 含义与中文文案建议

| id | 组别/严重度 | 含义 | 建议中文标题 |
| --- | --- | --- | --- |
| `conn` | A / BLOCKER | SSH/Ansible 连通性（不可达主机的唯一检查项） | 连通性 |
| `sudo` | A / BLOCKER | sudo 免密提权是否可用 | 提权权限 |
| `os` | A / BLOCKER | 操作系统是否受支持（RPM/DEB 分支命中） | 操作系统识别 |
| `pkg_manager` | B / BLOCKER | 包管理器（dnf/yum 或 apt/dpkg）是否存在 | 包管理器 |
| `pkg_lock` | B / BLOCKER | 包管理器是否被占用/加锁 | 包管理器占用 |
| `pkg_db` | B / BLOCKER | 包数据库健康（`rpm -q rpm` / `dpkg --audit`） | 包数据库健康 |
| `disk` | B / BLOCKER | 根分区 `/` 与 `/var` 可用空间是否达阈值（默认 500MB） | 磁盘空间 |
| `disk_boot` | B / BLOCKER | 含内核包时 `/boot` 是否达阈值（默认 150MB），仅内核场景出现 | /boot 空间 |
| `kernel_pending` | B / WARNING | 是否已存在待重启内核 | 待重启内核 |
| `repo` | C / BLOCKER | 是否已配置且启用软件仓库 | 软件仓库 |
| `pkg_exists` | C / BLOCKER | 目标包在仓库中是否存在 | 目标包存在性 |
| `version_ok` | C / BLOCKER | 目标版本是否可解析/满足（rpm 精确 / deb 候选≥目标） | 目标版本可用性 |
| `depsolve` | C / BLOCKER | 依赖能否解析（dry-run，不落地） | 依赖解析 |
| `already_satisfied` | C / WARNING | 已安装版本是否已满足目标（安装可能无变更） | 已是目标版本 |
| `exec` | - / BLOCKER | 检查脚本未产生有效输出（异常兜底） | 检查执行异常 |

> 说明：`os`/`exec` 为兜底项，正常主机不会同时出现全部 id；`disk_boot`、`already_satisfied` 等仅在相应条件满足时出现。前端应遍历 `checks[]` 动态渲染，不要硬编码固定项集合。

## 5. 前端展示建议

失败（`PRE_CHECK_FAILED`）时：

1. 按 `results[]` 逐台分组展示，主机标题旁用 `blockers`/`warnings` 标注 `阻断 N / 警告 M`；不可达主机（`checks[]` 含 `id=conn` 且 `status=fail`）用醒目的红色标识。
2. 组内检查项按严重度排序：`fail` 置顶（红色），`warn` 其次（黄色），`ok` 折叠（绿色）。
4. 底部提供两个操作：
   - 「重新检查」→ `POST .../pre-check/execute`
   - 「跳过检查并继续（需二次确认）」→ `POST .../pre-check/skip`
5. 安装按钮：当 `status == "PRE_CHECK_FAILED"` 时置灰或点击提示门禁文案（后端也会返回 400 兜底）。

通过（`PRE_CHECK_DONE`）时：可仅展示概要（各主机全部通过），保留 `warn` 项的提示。

进行中（`PRE_CHECKING`）时：展示 loading，轮询 `GET /api/secops/v2/patch/task/{id}` 直到状态变化（建议 2~3 秒一次）。

## 6. 端到端示例

1. 创建任务后，任务 `status: "CREATED"`。
2. `POST .../pre-check/execute` → `status: "PRE_CHECKING"`。
3. 轮询 `GET .../{id}`：
   - 通过：`status: "PRE_CHECK_DONE"`，`preCheckResult` 各主机 `blockers=0`。
   - 失败：`status: "PRE_CHECK_FAILED"`，明细在 `preCheckResult.results[]`（每台主机含连通性等 per-host 检查项），`error_message` 为其可读汇总，例：
     `主机 ci-1001 阻断项: version_ok(以下目标版本在仓库中不可解析: openssl-1.0.2k-23.el7_9)。主机 ci-1002 阻断项: conn(主机无法连通（SSH 不可达），请检查网络与 SSH 服务后重试)。`
4. 失败后若强行 `POST .../install/execute` → HTTP 400 门禁文案。
5. 前端二选一：修复后重跑检查 / 调 `.../pre-check/skip` 跳过 → 之后 `install/execute` 放行。
