# 客户 Yum 仓库管理 — 前端接口文档

> Base URL: `/api/vap/v2/yum-repo`  
> 鉴权: Shiro `ROLE_USER`  
> Content-Type: `application/json`

---

## 0. 数据来源说明

仓库配置由客户在「YUM源配置录入」页面**手动录入**，数据存储在 `jao_dc_data`（`data_model='yum_configs'`）。

### 0.1 获取已录入的 YUM 源配置列表

```
GET /api/jao/dc/data?code=yum_configs
```

**响应** `200`：

```json
[
  {
    "id": "2c9280849c4fd6d9019c5000154d47a9",
    "tenantId": "ff808081727a047f017292d0d72e0004",
    "dataModel": "yum_configs",
    "dataOwner": null,
    "dataOwnerId": "host-001",
    "dataJson": "{\"name\":\"rhel7-extra-local\",\"description\":\"\",\"baseurl\":\"http://www.rhel7pkg.com/rhel-7-server-extras-rpms\",\"file\":\"/etc/yum.repos.d/test.repo\"}",
    "createTime": "2026-02-12T11:58:28.000+08:00",
    "updateTime": "2026-02-12T11:58:28.000+08:00"
  }
]
```

| 字段 | 说明 |
|------|------|
| `id` | **jao_dc_data 记录 ID**，触发采集时作为 `dcDataId` 传入 |
| `dataOwnerId` | 录入时关联的标识（采集时不使用） |
| `dataJson.name` | YUM 源名称，用于 `repoquery --repofrompath={name},{baseurl} --repoid={name}` |
| `dataJson.description` | 描述 |
| `dataJson.baseurl` | 仓库 URL（客户录入的 YUM 源地址） |
| `dataJson.file` | YUM 源文件路径，仅展示用 |

> 客户在「YUM源配置录入」页面手动创建/编辑记录，操作的是 `jao_dc_data` 表。
> 触发采集时，前端只需传该记录的 `id` 即可（作为 `dcDataId`）。
> 采集原理：使用 `repoquery --repofrompath={name},{baseurl} --repoid={name} --nogpgcheck -a` 从指定 URL 拉取全量可安装包。

---

## 1. 仓库采集

### 1.1 触发采集

```
POST /collect
```

**请求体**（推荐方式：传 `dcDataId`）：

```json
{
  "dcDataId": "2c9280849c4fd6d9019c5000154d47a9"
}
```

也支持直接传 URL（备选）：

```json
{
  "baseurl": "http://www.rhel7pkg.com/rhel-7-server-extras-rpms"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| dcDataId | 与 baseurl 二选一 | jao_dc_data 中 yum_configs 记录的 ID（来自 0.1 接口的 `id` 字段） |
| baseurl | 与 dcDataId 二选一 | yum/dnf 仓库 URL（直接传入方式） |

**响应** `200`：

```json
{
  "sourceId":   "abc123",
  "snapshotId": "snap-xxx",
  "message":    "采集任务已提交"
}
```

| 字段 | 说明 |
|------|------|
| sourceId | 后端幂等管理的 RepoSource ID |
| snapshotId | 本次采集记录 ID |

**后端流程**（异步）：

1. 使用 `dcDataId` 时，后端自动从 `jao_dc_data` 读取客户手动录入的 baseurl / name / description 等。
2. 按幂等键（tenant + baseurl）查找或创建 RepoSource。
3. 在 localhost（Ansible controller 本机）上通过 Ansible 执行采集命令：
   - yum 环境：`repoquery --repofrompath={name},{baseurl} --repoid={name} --nogpgcheck -a`
   - dnf 环境：`dnf repoquery --repofrompath={name},{baseurl} --repo={name} --all`
4. 结果通过 JAO 回调自动入库（全量可安装包写入 `vap2_baseline_package`）。

---

### 1.2 查询采集状态

```
GET /repos/{id}/status
```

> 这里的 `{id}` 就是 1.1 响应里返回的 `sourceId`。

接口根据是否存在已完成的采集记录（`is_current=true` 的快照），返回两种不同结构的响应。

#### 情况一：尚未采集或采集进行中（无已完成的采集记录）

**响应** `200`：

```json
{
  "sourceId": "abc123",
  "sourceName": "rhel7-extra-local",
  "repoUrl": "http://...",
  "message": "尚未采集或采集中"
}
```

| 字段 | 说明 |
|------|------|
| sourceId | 仓库配置 ID |
| sourceName | 仓库显示名（来自客户录入的 yum_configs） |
| repoUrl | 仓库 URL |
| message | 提示文案，固定值 `"尚未采集或采集中"` |

> 触发采集后、第一次采集成功回调之前，接口始终返回此结构。前端可通过 `message` 字段是否存在来区分两种情况。

#### 情况二：存在已完成的采集记录

**响应** `200`：

```json
{
  "sourceId": "abc123",
  "sourceName": "rhel7-extra-local",
  "repoUrl": "http://...",
  "snapshotId": "snap-xxx",
  "collectStatus": "SUCCESS",
  "packageCount": 12380,
  "finishedAt": "2026-04-15T10:30:00",
  "errorMessage": null
}
```

| 字段 | 说明 |
|------|------|
| snapshotId | 当前有效的采集记录 ID |
| collectStatus | 采集状态，见下表 |
| packageCount | 采集到的包数量 |
| finishedAt | 采集完成时间 |
| errorMessage | 失败原因（成功时为 null） |

| collectStatus | 含义 |
|---------------|------|
| PENDING | 已创建，等待执行 |
| RUNNING | Ansible 执行中 |
| SUCCESS | 采集成功 |
| FAILED | 采集失败，见 errorMessage |

#### 前端判断逻辑

```
if (response.message) {
    // 尚未采集或采集进行中 → 继续轮询
} else if (response.collectStatus === 'SUCCESS' || response.collectStatus === 'FAILED') {
    // 采集结束 → 停止轮询，展示结果
} else {
    // PENDING / RUNNING → 继续轮询
}
```

**前端轮询建议**：触发采集后每 5 秒轮询此接口，直到响应中出现 `snapshotId` 且 `collectStatus` 为 `SUCCESS` 或 `FAILED`。

---

### 1.3 已采集仓库列表

```
GET /repos
```

**响应** `200`：`RepoSource[]`，当前租户下所有已被触发过采集的仓库（由后端自动创建，非手工登记）。

```json
[
  {
    "id": "abc123",
    "sourceType": "USER_INPUT",
    "sourceName": "rhel7-extra-local",
    "repoUrl": "http://www.rhel7pkg.com/rhel-7-server-extras-rpms",
    "repoId": "rhel7-extra-local",
    "enabled": true,
    "tenantId": "t-001"
  }
]
```

> 此接口用于"采集历史/仓库总览"页；新建仓库无 UI 入口，必须通过 `POST /collect` 隐式创建。

---

### 1.4 删除仓库

```
DELETE /repos/{id}
```

**响应** `200`：`{ "message": "已删除" }`

> 级联清理该仓库下的全部快照、包、比对数据。典型场景：客户录入的 yum 源已失效后的手动清理。

---

### 1.5 查看已采集包列表

```
GET /packages?sourceId=abc123&keyword=openssl&page=0&size=20
```

| 参数 | 必填 | 说明 |
|------|------|------|
| sourceId | **是** | 仓库配置 ID（`/collect` 响应里返回的 `sourceId`） |
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
      "pkgName": "openssl",
      "pkgVersion": "1.1.1k",
      "pkgRelease": "9.el8",
      "pkgEpoch": "1",
      "pkgArch": "x86_64",
      "pkgCmpver": "1:1.1.1k-9.el8",
      "pkgFullNevra": "openssl-1:1.1.1k-9.el8.x86_64",
      "repoName": "rhel7-extra-local"
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

---

## 2. 补丁比对

### 2.1 已扫描补丁比对（推荐）

以已扫描机器发现的有效补丁做比对，无需手动选补丁——系统自动从 `vap2_curr_machine_patch` 获取当前租户所有已扫描到的补丁。

```
POST /patch-compare/scanned
```

**请求体**：

```json
{
  "sourceId": "abc123",
  "osFamily": "centos（选填）"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| sourceId | **是** | 仓库配置 ID（须已成功采集） |
| osFamily | 否 | 过滤只匹配该 OS 族的包 |

**响应** `200`：同 2.2 的比对汇总结构。

---

### 2.2 手动选择补丁比对

```
POST /patch-compare
```

**请求体**：

```json
{
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "sourceId": "abc123",
  "osFamily": "centos（选填）"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| patchIds | **是** | 补丁 ID 数组 |
| sourceId | **是** | 仓库配置 ID |
| osFamily | 否 | 过滤只匹配该 OS 族的包 |

**响应** `200`：返回比对汇总：

```json
{
  "diffRunId": "d-uuid-xxx",
  "total": 15,
  "available": 12,
  "missing": 2,
  "outdated": 1,
  "ahead": 0,
  "releaseMismatch": 0,
  "passed": false,
  "hint": "（仅 total=0 时出现）无比对结果：请确认已采集且补丁有关联包"
}
```

| diffType | 含义 |
|----------|------|
| AVAILABLE | 仓库中有满足版本要求的包 ✓ |
| MISSING | 仓库中完全没有该包 ✗ |
| OUTDATED | 仓库中有该包但版本不够 ✗ |
| RELEASE_MISMATCH | version 相同但 release 不一致 ✗ |

`passed = true` 表示所有补丁所需包都 AVAILABLE。

---

### 2.3 查看比对汇总（可重复查询）

```
GET /patch-compare/{diffRunId}/summary
```

**响应**：同 2.2 的比对汇总结构。

---

### 2.4 比对明细（分页）

```
GET /patch-compare/{diffRunId}/details?page=0&size=20
```

支持可选筛选参数：

| 参数 | 必填 | 说明 |
|------|------|------|
| page | 否 | 页码（默认 0） |
| size | 否 | 每页条数（默认 20） |
| diffType | 否 | 按差异类型筛选，支持 `AVAILABLE`、`MISSING`、`OUTDATED`、`RELEASE_MISMATCH`、`AHEAD` |

**响应** `200`：

```json
{
  "content": [
    {
      "id": "diff-001",
      "diffRunId": "d-uuid-xxx",
      "patchId": "CVE-2025-1234",
      "pkgName": "openssl",
      "requiredNevra": "openssl.x86_64 1.1.1k",
      "baselineNevra": "1:1.1.1k-9.el8",
      "diffType": "AVAILABLE",
      "osFamily": "centos",
      "osMajor": "7"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

---

### 2.5 不满足补丁要求的项

```
GET /patch-compare/{diffRunId}/not-satisfied
```

**响应** `200`：

```json
{
  "passed": false,
  "count": 3,
  "items": [
    {
      "patchId": "CVE-2025-1234",
      "pkgName": "glibc",
      "requiredNevra": "glibc.x86_64 2.28",
      "baselineNevra": null,
      "diffType": "MISSING"
    }
  ]
}
```

> `passed = true` 且 `count = 0` 表示所有补丁都可以正常安装。

---

## 3. 前端集成指引

### 3.1 典型页面流程

```
① YUM源配置页（已有）
   └→ 用户录入/编辑/删除 yum 源配置（操作 jao_dc_data，data_model='yum_configs'）

② 仓库采集页
   └→ 调 GET /api/jao/dc/data?code=yum_configs 取已配置的 yum 源列表
   └→ 用户点击某条配置的"配置"按钮
   └→ 调 POST /collect {dcDataId: "该条记录的 id"}
   └→ 轮询 GET /repos/{sourceId}/status
   └→ 采集完成后可浏览 GET /packages?sourceId=xxx

③ 仓库总览页
   └→ GET /repos 列出已采集过的仓库
   └→ 支持 DELETE /repos/{id} 做清理

④ 补丁比对页
   └→ 选择仓库（sourceId），点击"比对"
   └→ 调 POST /patch-compare/scanned（自动用已扫描机器的有效补丁）
   └→ 展示汇总：通过数/缺失数/版本不够数
   └→ 展示不满足明细列表（GET /not-satisfied）
```

### 3.2 错误处理

所有接口在参数校验失败时返回 `400`：

```json
{ "error": "具体错误信息" }
```

### 3.3 状态轮询

需要轮询的场景仅有一个：**触发采集后轮询 `/repos/{sourceId}/status`**。建议间隔 5 秒，最长等待 10 分钟。

### 3.4 幂等性

同一 dcDataId（即同一条客户录入的 yum 源配置）反复调用 `/collect`，后端只会对应到同一个 `sourceId`；
每次会新建一条 `BaselineSnapshot`，采集成功回调后自动把最新一条标记为 `is_current=true`，
前端无需关心是否重复创建。
