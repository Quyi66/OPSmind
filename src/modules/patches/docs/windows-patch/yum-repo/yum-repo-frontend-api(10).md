# 客户 Yum 仓库管理 — 前端接口文档

> Base URL: `/api/vap/v2/yum-repo`
> 鉴权: Shiro `ROLE_USER`
> Content-Type: `application/json`

---

## 0. 重要变更（vs 旧版接口）

> 本次（2026Q2）后端将采集链路从「JAO + Ansible 管控机 + `dnf/yum repoquery`」**全面切换**为「VAP 后端直连仓库 HTTP + 标准 repodata 协议」。
> 前端因此需要做以下调整：

| 变更点 | 旧版（已弃用） | 新版 |
|--------|---------------|------|
| 仓库登记 | `POST /repos`（手填 `repoUrl`/`repoId`/`osFamily`/`osMajor` 创建 RepoSource） | **接口已移除**。统一改为「YUM源配置」(`POST /configs`) 录入，后端在首次采集时自动按 `baseurl` 幂等创建 RepoSource |
| 仓库编辑 | `PUT /repos/{id}` | **接口已移除**。改用 `PUT /configs/{id}` 修改 yum_configs |
| 触发采集 | `POST /collect` 入参 `{sourceId, hostId}`，必须选管控机 | `POST /collect` 入参 `{dcDataId}` 或 `{baseurl}`，**不再需要 `hostId`**（后端直接 HTTP 拉取） |
| 批量采集 | 无 | 新增 `POST /collect/batch`，一次性触发多条 yum_configs 采集 |
| `GET /repos` 语义 | 列出当前租户「登记过的仓库」 | 列出「已被触发过采集」的 RepoSource（即真正落库过包数据的源），登记入口已迁到 `/configs` |
| 仓库登记字段 | `repoId`、`osFamily`、`osMajor`、`hostId` | 这些字段对前端不再必填；`repoId` 由后端从 `name` 字段写入；OS 字段后端预留但前端无需填写 |
| 状态轮询 | 同（`GET /repos/{id}/status`） | 同；新版 PENDING 阶段几乎瞬时跳过，状态机变成 `RUNNING → SUCCESS/FAILED` |
| 删除仓库 | 同（`DELETE /repos/{id}`） | 同；**删除 yum_configs 时（`DELETE /configs/{id}`）会按 `baseurl` 自动级联清理对应 RepoSource 与全部快照、包、比对数据**，前端通常无需再单独调 `DELETE /repos` |
| 回调接口 | `/callback/yum-repo-collect`（JAO 调用） | **已下线**（采集已是 VAP 内部进程，不再有外部回调）；前端无影响 |
| 采集触发 | 必须前端手动点「采集」按钮 | **新增 yum_configs 后后端自动在事务提交后触发采集**（无需前端再点一次） |
| 比对触发 | 必须前端手动点「比对」按钮 | **采集成功后后端自动用「已扫描补丁」做一次比对**，前端打开补丁比对页直接看 overview 即可 |

> **前端必做项**：
> 1. 移除「YUM源管理」页面里所有调用 `POST /repos`、`PUT /repos/{id}` 的代码；改为只调 `POST /configs`、`PUT /configs/{id}`。
> 2. 移除「触发采集」表单中的「管控机选择」控件；`POST /collect` 请求体只传 `dcDataId`（推荐）或 `baseurl`。
> 3. 列表页直接用 `GET /configs` 渲染（同时返回采集状态），不再分两次查 `/configs` + `/repos`。
> 4. 如有「批量采集」需求，调用新增的 `POST /collect/batch`。
> 5. **新增 yum_configs 成功后无需再调 `POST /collect`**——后端事务提交后自动触发采集，前端只需轮询 `GET /repos/{id}/status` 等 SUCCESS。
> 6. **采集 SUCCESS 后无需再调 `POST /patch-compare/scanned`**——后端会自动比对一次，前端打开补丁比对页 `GET /patch-compare/overview` 直接拿结果即可。

---

## 1. YUM源配置管理

> 以下接口统一管理 `jao_dc_data` 中 `data_model='yum_configs'` 的记录。
> 新增/编辑/删除均走 VAP 接口，不再使用 JAO 通用接口。

### 1.1 配置列表（含采集状态）

```
GET /configs
```

**响应** `200`：

```json
[
  {
    "dcDataId": "2c9380849db490a0019db4952c1e0000",
    "dataOwnerId": null,
    "createTime": "2026-04-22T17:46:08",
    "updateTime": "2026-04-23T09:12:14",
    "name": "centos7-base",
    "description": "CentOS 7 基础仓库",
    "baseurl": "https://mirrors.aliyun.com/centos/7/os/x86_64/",
    "file": "/etc/yum.repos.d/centos.repo",
    "collected": false
  }
]
```

已采集的配置会额外包含以下字段：

| 字段 | 说明 |
|------|------|
| `sourceId` | 后端按 `baseurl` 幂等创建的 RepoSource ID，后续触发比对、查包列表都用它 |
| `collected` | 固定为 `true` |
| `collectStatus` | 当前有效快照的状态（`PENDING` / `RUNNING` / `SUCCESS` / `FAILED`） |
| `packageCount` | 当前有效快照采集到的包数量 |
| `finishedAt` | 当前有效快照的完成时间 |

### 1.2 新增配置

```
POST /configs
```

**请求体**：

```json
{
  "name": "centos7-base",
  "description": "CentOS 7 基础仓库",
  "baseurl": "https://mirrors.aliyun.com/centos/7/os/x86_64/",
  "file": "/etc/yum.repos.d/centos.repo"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| name | 否 | YUM源名称（采集时会被同步到 RepoSource.repoId） |
| description | 否 | 描述（采集时会被同步到 RepoSource.sourceName） |
| baseurl | **是** | YUM源根地址，需到 `repodata/repomd.xml` 上一级（即标准 yum repo 根） |
| file | 否 | 客户主机上 `.repo` 文件路径，仅作记录展示用 |

**响应** `200`：

```json
{
  "dcDataId": "a1b2c3d4e5f6...",
  "name": "centos7-base",
  "description": "CentOS 7 基础仓库",
  "baseurl": "https://mirrors.aliyun.com/centos/7/os/x86_64/",
  "file": "/etc/yum.repos.d/centos.repo"
}
```

**错误** `400`：`{ "error": "baseurl（YUM源地址）不能为空" }`

> **新增即采集**：本接口在事务提交成功后会自动调用 `POST /collect`（按 `dcDataId`），异步派发 HTTP 采集任务。前端无需再单独触发采集；返回成功后开始轮询 `GET /repos/{id}/status` 即可（`sourceId` 由 `GET /configs` 第二次拉取时拿到）。
> 自动采集失败仅服务端 warn 日志，不影响本接口返回，前端如有需要可手动重试 `POST /collect`。

---

### 1.3 编辑配置

```
PUT /configs/{id}
```

- `id`：`GET /configs` 返回的 `dcDataId`
- 请求体：同新增
- 响应：同新增结构

**错误** `400`：`{ "error": "未找到 yum_configs 配置记录: xxx" }`

---

### 1.4 删除配置

```
DELETE /configs/{id}
```

- `id`：`GET /configs` 返回的 `dcDataId`

**响应** `200`：`{ "message": "已删除" }`

**错误** `400`：`{ "error": "未找到 yum_configs 配置记录: xxx" }`

> **级联清理**：删除 yum_configs 配置时，后端会按 `baseurl` 找到对应 RepoSource 并级联删除其全部快照（snapshot）、采集到的包（package）、比对结果（diff、diff_run）。前端无需再额外调 `DELETE /repos/{id}`。

---

## 2. 仓库源（RepoSource）

> 仓库源由「触发采集」时按 `(tenant_id, baseurl)` 幂等创建。前端通常**不直接登记**仓库源，只在采集结果展示与删除清理时需要。

### 2.1 已采集仓库列表

```
GET /repos
```

**响应** `200`：当前租户下所有已被触发过采集的 RepoSource 数组。

```json
[
  {
    "id": "abc123",
    "sourceType": "USER_INPUT",
    "sourceName": "CentOS-7-Base",
    "repoUrl": "https://mirrors.aliyun.com/centos/7/os/x86_64/",
    "repoId": "centos-base",
    "osFamily": null,
    "osMajor": null,
    "username": null,
    "password": null,
    "enabled": true,
    "tenantId": "t-001"
  }
]
```

> `username` / `password` 为 HTTP Basic 认证字段（V20260425 schema 预留），当前前端 UI **暂不暴露**，需求到位后再加表单字段。

### 2.2 删除仓库

```
DELETE /repos/{id}
```

**响应** `200`：`{ "message": "已删除" }`

> 通常不需要前端单独调用——删除 yum_configs 时（1.4）已自动级联清理。仅作为「孤儿数据手工清理」的兜底入口。

### 2.3 查询采集状态

```
GET /repos/{id}/status
```

接口根据是否存在已完成的采集记录（`is_current=true` 的快照），返回两种结构：

#### 情况 A：尚未采集 / 采集进行中（无 `is_current=true` 快照）

```json
{
  "sourceId": "abc123",
  "sourceName": "CentOS-7-Base",
  "repoUrl": "https://...",
  "message": "尚未采集或采集中"
}
```

#### 情况 B：存在已完成的采集记录

```json
{
  "sourceId": "abc123",
  "sourceName": "CentOS-7-Base",
  "repoUrl": "https://...",
  "snapshotId": "snap-xxx",
  "collectStatus": "SUCCESS",
  "packageCount": 12380,
  "finishedAt": "2026-04-15T10:30:00",
  "errorMessage": null
}
```

| collectStatus | 含义 |
|---------------|------|
| RUNNING | 采集进行中（HTTP 拉取 / XML 解析 / 批量入库） |
| SUCCESS | 采集成功 |
| FAILED | 采集失败，见 `errorMessage` |
| PENDING | 历史遗留状态，新版几乎不会出现 |

> **新版采集时间**：单仓库通常 5–60 秒（依网络与包数量），不像旧版需等 Ansible 调度，前端轮询间隔可缩短为 2–3 秒。

#### 前端判断逻辑（不变）

```text
if (response.message) {
    // 情况 A：尚未采集或采集中 → 继续轮询
} else if (response.collectStatus === 'SUCCESS' || response.collectStatus === 'FAILED') {
    // 情况 B：已结束 → 停止轮询
} else {
    // 情况 B 但仍 RUNNING → 继续轮询
}
```

---

## 3. 包采集

### 3.1 触发采集（单条） ⭐ 入参变化

```
POST /collect
```

**请求体**（二选一）：

```jsonc
// 推荐：传 yum_configs 配置 ID，后端读取 baseurl/name/description
{ "dcDataId": "2c9380849db490a0019db4952c1e0000" }

// 或：直接传 baseurl（不走 yum_configs，适合临时采集场景）
{ "baseurl": "https://mirrors.aliyun.com/centos/7/os/x86_64/" }
```

| 字段 | 必填 | 说明 |
|------|------|------|
| dcDataId | 二选一 | yum_configs 配置 ID（`GET /configs` 返回的 `dcDataId`） |
| baseurl | 二选一 | 仓库根 URL（含 `repodata/`），优先级低于 dcDataId |

> **不再传 `hostId`**：新版采集由 VAP 后端进程直接发 HTTP，无需选管控机。

**响应** `200`：

```json
{
  "sourceId": "abc123",
  "snapshotId": "snap-xxx",
  "message": "采集任务已提交"
}
```

| 字段 | 说明 |
|------|------|
| sourceId | 后端按 `(tenant_id, baseurl)` 幂等创建/复用的 RepoSource ID |
| snapshotId | 本次新建的 BaselineSnapshot ID（初始 `status=RUNNING`，`is_current=false`） |
| message | 固定文案 |

**错误** `400`：

```json
{ "error": "dcDataId 或 baseurl 不能同时为空" }
{ "error": "未找到 yum_configs 记录: xxx" }
{ "error": "yum_configs 记录中缺少 baseurl" }
```

**后端流程**（异步，2026Q2 新方案）：
1. 同步：创建 `BaselineSnapshot(status=RUNNING)` 并 commit；
2. 提交到 `oplusVapExecutor` 线程池异步执行：
   1. HTTP GET `{baseurl}/repodata/repomd.xml` → 定位 `primary` 入口；
   2. HTTP GET `{baseurl}/{primary.href}` → 按 `.gz` / `.zst` / `.xml` 自适应解压；
   3. StAX 流式解析 `primary.xml`，每条 rpm 节点构造 `BaselinePackage`；
   4. 每 500 行 multi-row `INSERT` 批量写入 `vap2_baseline_package`；
   5. 推进 snapshot 至 `SUCCESS` + 标记 `is_current=true`；旧的 `is_current` 清零；
   6. **自动比对**：以「已扫描补丁」为口径再调一次 `compareScannedPatchesForRepo`，写入 `vap2_baseline_diff` + `vap2_baseline_diff_run`（`osFamily=null` 即不按 OS 过滤；前端如需按 OS 切分仍可手动调 §4.1 / §4.2）。
3. 失败：snapshot 标记 `FAILED`，错误信息截断后写入 `error_message`；自动比对环节如失败仅 warn，不回退采集状态。

### 3.2 批量采集 ⭐ 新增

```
POST /collect/batch
```

**请求体**：

```json
{ "dcDataIds": ["dc-id-1", "dc-id-2", "dc-id-3"] }
```

| 字段 | 必填 | 说明 |
|------|------|------|
| dcDataIds | **是** | yum_configs 配置 ID 数组，逐条触发采集 |

**响应** `200`：

```json
{
  "total": 3,
  "successCount": 2,
  "failCount": 1,
  "results": [
    { "dcDataId": "dc-id-1", "sourceId": "abc1", "snapshotId": "snap-1" },
    { "dcDataId": "dc-id-2", "sourceId": "abc2", "snapshotId": "snap-2" },
    { "dcDataId": "dc-id-3", "error": "未找到 yum_configs 记录: dc-id-3" }
  ]
}
```

**错误** `400`：`{ "error": "dcDataIds 不能为空" }` / `{ "error": "dcDataIds 必须是数组" }`

> 适合「YUM源配置列表」页面的「全部采集」按钮场景。

---

### 3.3 查看已采集包列表

```
GET /packages?sourceId=abc123&keyword=openssl&page=0&size=20
```

| 参数 | 必填 | 说明 |
|------|------|------|
| sourceId | **是** | 仓库源 ID |
| keyword | 否 | 按包名模糊搜索 |
| page | 否 | 页码（默认 0） |
| size | 否 | 每页条数（默认 20） |

**响应** `200`：

```json
{
  "content": [
    {
      "id": 1,
      "snapshotId": "snap-xxx",
      "pkgName": "kernel",
      "pkgVersion": "4.18.0",
      "pkgRelease": "372.26.1.el8_6",
      "pkgEpoch": "0",
      "pkgArch": "x86_64",
      "pkgCmpver": "0:4.18.0-372.26.1.el8_6",
      "pkgFullNevra": "kernel-4.18.0-372.26.1.el8_6.x86_64",
      "repoName": null
    }
  ],
  "totalElements": 156,
  "totalPages": 8,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

> 前端展示建议：
> - 仅展示「**完整包名** (`pkgFullNevra`)」+「**包名** (`pkgName`)」+「**版本号** (`pkgVersion`)」+「**架构** (`pkgArch`)」四列；
> - `pkgFullNevra` 已合并 N/E/V/R/A，形如 `kernel-4.18.0-372.26.1.el8_6.x86_64`；
> - 后端在响应阶段会重新拼接 `pkgFullNevra`，老快照即使写入时格式不一致，前端拿到的总是规范化后的标准 NEVRA。

---

## 4. 补丁比对

### 4.1 执行比对（指定补丁）

```
POST /patch-compare
```

**请求体**：

```json
{
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "sourceId": "abc123",
  "osFamily": "centos"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| patchIds | **是** | 补丁 ID 数组 |
| sourceId | **是** | 仓库源 ID（须已成功采集过） |
| osFamily | 否 | 过滤补丁影响的 OS 族（如 `centos`/`kylin`/`rhel`） |

**响应** `200`：`{ "diffRunId": "d-uuid-xxx" }`

| diffType | 含义 |
|----------|------|
| AVAILABLE | 仓库中有满足版本要求的包 ✓ |
| MISSING | 仓库中完全没有该包 ✗ |
| OUTDATED | 仓库中有该包但版本不够 ✗ |
| RELEASE_MISMATCH | version 相同但 release 不一致 ✗ |

---

### 4.2 执行比对（已扫描补丁）

```
POST /patch-compare/scanned
```

**请求体**：

```json
{
  "sourceId": "abc123",
  "osFamily": "centos"
}
```

自动取当前租户 `vap2_curr_machine_patch` 中所有已扫描补丁做比对，无需手动选 patchIds。

**响应** `200`：`{ "diffRunId": "d-uuid-xxx" }`

---

### 4.3 补丁比对总览

```
GET /patch-compare/overview
```

补丁比对页顶部「总览卡片」唯一数据源。一次返回当前租户下**所有**仓库源：
- 每个源的采集状态
- 每个源最近一次比对的「**缺失包总数**」与是否通过
- 每个源按**操作系统**（osFamily + osMajor）分组的同维度统计

> ⚠️ **2026Q2 字段精简**：响应中仅保留 `missingPackages`（缺失包数量）+ `passed`（是否通过）。
> 已**移除** `totalPatches` / `installablePatches` / `notInstallablePatches` / `totalPackages` /
> `availablePackages` / `outdatedPackages` / `releaseMismatchPackages` 等其它统计字段。
> 业务收口为「**只关心缺失包**」：仓库中 OUTDATED / RELEASE_MISMATCH 的包仍可通过升级解决，
> 真正会阻塞补丁安装的只有 MISSING。底层 `vap2_baseline_diff_run` 表仍持久化完整字段，
> 不影响排查与未来扩展。

**响应** `200`：

```json
{
  "totalSources": 2,
  "passedSources": 0,
  "failedSources": 1,
  "sources": [
    {
      "sourceId": "abc123",
      "sourceName": "CentOS-7-Base",
      "repoUrl": "https://mirrors.aliyun.com/centos/7/os/x86_64/",
      "osFamily": null,
      "osMajor": null,
      "snapshotId": "snap-xxx",
      "collectStatus": "SUCCESS",
      "packageCount": 12380,
      "finishedAt": "2026-04-15T10:30:00",
      "diffRunId": "d-uuid-xxx",
      "summary": {
        "missingPackages": 30,
        "passed": false
      },
      "groupByOs": [
        {
          "osFamily": null,
          "osMajor": null,
          "missingPackages": 30,
          "passed": false
        }
      ],
      "passed": false
    },
    {
      "sourceId": "def456",
      "sourceName": "Kylin-10",
      "repoUrl": "https://...",
      "osFamily": null,
      "osMajor": null,
      "collectStatus": "NOT_COLLECTED",
      "diffRunId": null,
      "summary": null,
      "groupByOs": [],
      "passed": null
    }
  ]
}
```

**顶层字段**：

| 字段 | 说明 |
|------|------|
| totalSources | 仓库源总数（已根据 yum_configs 过滤掉脏数据） |
| passedSources | 通过的源数（缺失包为 0） |
| failedSources | 不通过的源数（存在缺失包） |
| sources[] | 每个仓库源一项，结构见下 |

**sources[*] 字段**：

| 字段 | 说明 |
|------|------|
| sourceId / sourceName / repoUrl | 源基本信息 |
| osFamily / osMajor | 源登记的操作系统（新方案下前端未填，通常为 null） |
| collectStatus | SUCCESS / FAILED / RUNNING / **NOT_COLLECTED**（从未采集） |
| diffRunId | 最近一次比对 ID；`null` 表示尚未比对 |
| summary | 最近一次比对的**全局**汇总（仅缺失包数）；`null` 表示尚未比对 |
| groupByOs[] | 按 (osFamily, osMajor) 分组的汇总 |
| passed | 源整体是否通过；`null` 表示尚未比对 |

**summary / groupByOs[*] 共用字段**：

| 字段 | 说明 |
|------|------|
| missingPackages | **缺失包数量** — 仓库中完全没有的补丁所需包数 |
| passed | `missingPackages == 0`（且至少做过一次比对） |

> 实现说明：
> - `summary.missingPackages` 是 `groupByOs[*].missingPackages` 之和，前端无需自己累加。
> - 当源未登记 osFamily / osMajor 时，`groupByOs` 输出一组 `osFamily=null, osMajor=null`。
> - 总览只统计「**仍存在于 yum_configs 的 baseurl**」对应的源，避免脏数据计入。
> - 卡片建议布局：左上仓库名 + 右上「比对通过/不通过」徽标 + 中间大数字 `missingPackages`，
>   彻底删除「可安装/不可安装/补丁总数/版本不够」四个小格子。

---

### 4.4 补丁维度比对结果（分页）

```
GET /patch-compare/{diffRunId}/patch-view?page=0&size=20&keyword=&diffType=&status=
```

| 参数 | 必填 | 说明 |
|------|------|------|
| diffRunId | **是** | 比对运行 ID（路径参数） |
| keyword | 否 | 搜索 `patchId` 或补丁标题 |
| diffType | 否 | `MISSING` / `OUTDATED` / `RELEASE_MISMATCH` / `AVAILABLE` — 只返回存在该类型差异的补丁 |
| status | 否 | `SATISFIED`（全部 AVAILABLE） / `NOT_SATISFIED`（存在不满足的包） |
| page | 否 | 页码，默认 0 |
| size | 否 | 每页条数，默认 20 |

**响应** `200`：

```json
{
  "content": [
    {
      "patchId": "CVE-2025-1234",
      "patchTitle": "OpenSSL 安全更新",
      "severity": "Critical",
      "satisfied": false,
      "totalPkgs": 3,
      "availableCount": 1,
      "missingCount": 1,
      "outdatedCount": 1,
      "releaseMismatchCount": 0,
      "affectedHostCount": 12,
      "affectedHosts": [
        { "hostId": "h-001", "hostKey": "192.168.1.10" }
      ],
      "failedPackages": [
        {
          "pkgName": "glibc",
          "diffType": "MISSING",
          "requiredNevra": "glibc.x86_64 2.28",
          "baselineNevra": null
        },
        {
          "pkgName": "kernel",
          "diffType": "OUTDATED",
          "requiredNevra": "kernel.x86_64 4.18.0-372.26.1.el8_6",
          "baselineNevra": "0:4.18.0-240.el8"
        }
      ]
    }
  ],
  "totalElements": 25,
  "totalPages": 2,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

> 列表排序固定为「`patchId` 升序」（走 `(diff_run_id, patch_id)` 索引），分页查询稳定且毫秒级返回。
> 「影响主机数」`affectedHostCount` 与 `affectedHosts` 仅针对当前页的 patchId 反查 `vap2_curr_machine_patch`，不会被几十万条机器数据拖慢。

---

## 5. 前端集成指引

### 5.1 典型页面流程

```
⓪ YUM源配置页
   └→ 配置列表（GET /configs，已含采集状态）
   └→ 点击"YUM源配置录入" → 新增（POST /configs）
   └→ 点击"编辑" → 编辑（PUT /configs/{dcDataId}）
   └→ 点击"删除" → 删除（DELETE /configs/{dcDataId}），自动级联清理
   └→ 点击"采集"   → POST /collect          { dcDataId }
   └→ 点击"全部采集" → POST /collect/batch  { dcDataIds: [...] }

① 仓库详情 / 采集结果页
   └→ 轮询状态（GET /repos/{sourceId}/status，间隔 2-3 秒）
   └→ 采集完成后浏览包列表（GET /packages?sourceId=...）
      仅展示 pkgFullNevra / pkgName / pkgVersion / pkgArch 四列

② 补丁比对页
   ├→ 页面顶部「总览卡片」：GET /patch-compare/overview
   │     列出所有源 + 每源采集状态、是否缺依赖包、按系统分组汇总
   │
   ├→ 用户点击某仓库 → 选择补丁 / 或用「已扫描补丁」一键比对：
   │     POST /patch-compare  或  POST /patch-compare/scanned
   │     返回 { diffRunId }
   │     之后再次调用 GET /patch-compare/overview 即可刷新顶部数据
   │
   └→ 页面下部「补丁列表」（补丁维度分页）：
         GET /patch-compare/{diffRunId}/patch-view?diffType=&status=&keyword=
```

### 5.2 错误处理

所有接口在参数校验失败时返回 `400`：

```json
{ "error": "具体错误信息" }
```

### 5.3 状态轮询

唯一需要轮询的场景：**触发采集后轮询 `/repos/{id}/status`**。
新方案下采集走后端进程，建议间隔 2–3 秒、最长等待 5 分钟（旧方案是 5 秒/10 分钟）。

补丁比对、总览、列表都是同步接口，无需轮询。
