# 客户 Yum 仓库管理 — 前端接口文档

> Base URL: `/api/vap/v2/yum-repo`  
> 鉴权: Shiro `ROLE_USER`  
> Content-Type: `application/json`

---

## 1. 仓库管理

### 1.1 登记仓库

```
POST /repos
```

**请求体**：

```json
{
  "repoUrl":    "http://mirrors.example.com/centos/7/os/x86_64/",
  "sourceName": "CentOS-7-Base（选填，默认=repoUrl）",
  "repoId":     "centos-base（选填，yum 旧环境需要）",
  "osFamily":   "centos（选填）",
  "osMajor":    "7（选填）"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| repoUrl | **是** | yum/dnf 仓库 URL |
| sourceName | 否 | 显示名，不填默认为 repoUrl |
| repoId | 否 | 旧版 yum 不支持 `repofrompath` 时需要手动在主机配 `.repo` 文件并填此 ID |
| osFamily | 否 | 操作系统族，如 centos、kylin、rhel |
| osMajor | 否 | 操作系统主版本，如 7、8、10 |

**响应** `200`：返回完整 `RepoSource` 对象（含自动生成的 `id`）。

---

### 1.2 仓库列表

```
GET /repos
```

**响应** `200`：`RepoSource[]` 数组（当前租户下所有仓库）。

```json
[
  {
    "id": "abc123",
    "sourceType": "USER_INPUT",
    "sourceName": "CentOS-7-Base",
    "repoUrl": "http://mirrors.example.com/centos/7/os/x86_64/",
    "repoId": "centos-base",
    "osFamily": "centos",
    "osMajor": "7",
    "enabled": true,
    "tenantId": "t-001"
  }
]
```

---

### 1.3 更新仓库

```
PUT /repos/{id}
```

**请求体**：只传需要修改的字段。

```json
{ "sourceName": "新名称", "repoUrl": "http://new-url/..." }
```

**响应** `200`：更新后的 `RepoSource` 对象。

---

### 1.4 删除仓库

```
DELETE /repos/{id}
```

**响应** `200`：`{ "message": "已删除" }`

> 删除仓库会级联删除该仓库下所有采集记录和包数据。

---

## 2. 包采集

### 2.1 触发采集

```
POST /collect
```

**请求体**：

```json
{
  "sourceId": "abc123",
  "hostId":   "host-001"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| sourceId | **是** | 仓库配置 ID（`/repos` 返回的 `id`） |
| hostId | **是** | 可访问该仓库的管控机 ID |

**响应** `200`：

```json
{
  "snapshotId": "snap-xxx",
  "message": "采集任务已提交"
}
```

**后端流程**（异步）：
1. 下发 Ansible playbook 到指定管控机
2. 使用 `dnf repoquery`（或 `yum repoquery`）拉取该仓库全量可用包
3. 结果通过 JAO 回调自动入库

---

### 2.2 查询采集状态

```
GET /repos/{id}/status
```

**响应** `200`：

```json
{
  "sourceId": "abc123",
  "sourceName": "CentOS-7-Base",
  "repoUrl": "http://...",
  "snapshotId": "snap-xxx",
  "collectStatus": "SUCCESS",
  "packageCount": 12380,
  "finishedAt": "2026-04-15T10:30:00",
  "errorMessage": null
}
```

| collectStatus | 含义 |
|---------------|------|
| PENDING | 已创建，等待执行 |
| RUNNING | Ansible 执行中 |
| SUCCESS | 采集成功 |
| FAILED | 采集失败，见 errorMessage |

**前端轮询建议**：触发采集后每 5 秒轮询此接口，直到 `collectStatus` 为 `SUCCESS` 或 `FAILED`。

---

### 2.3 查看已采集包列表

```
GET /packages?sourceId=abc123&keyword=openssl&page=0&size=20
```

| 参数 | 必填 | 说明 |
|------|------|------|
| sourceId | **是** | 仓库配置 ID |
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
      "repoName": "centos-base"
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

## 3. 补丁比对

### 3.1 执行比对

```
POST /patch-compare
```

**请求体**：

```json
{
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "sourceId": "abc123",
  "osFamily": "centos（选填，用于过滤补丁影响的 OS）"
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

### 3.2 查看比对汇总（可重复查询）

```
GET /patch-compare/{diffRunId}/summary
```

**响应**：同 3.1 的汇总结构。

---

### 3.3 比对明细（分页）

```
GET /patch-compare/{diffRunId}/details?page=0&size=20
```

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

### 3.4 不满足补丁要求的项

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

## 4. 前端集成指引

### 4.1 典型页面流程

```
① 仓库管理页
   └→ 增/删/改仓库（POST/DELETE/PUT /repos）
   └→ 仓库列表（GET /repos）

② 仓库详情 / 采集页
   └→ 选择管控机，点击"采集"（POST /collect）
   └→ 轮询状态（GET /repos/{id}/status）
   └→ 采集完成后浏览包列表（GET /packages）

③ 补丁比对页
   └→ 选择补丁 + 仓库，点击"比对"（POST /patch-compare）
   └→ 展示汇总：通过数/缺失数/版本不够数
   └→ 展示不满足明细列表（GET /not-satisfied）
```

### 4.2 错误处理

所有接口在参数校验失败时返回 `400`：

```json
{ "error": "具体错误信息" }
```

### 4.3 状态轮询

需要轮询的场景仅有一个：**触发采集后轮询 `/repos/{id}/status`**。建议间隔 5 秒，最长等待 10 分钟。
