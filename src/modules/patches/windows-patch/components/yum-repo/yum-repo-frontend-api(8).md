# 客户 Yum 仓库管理 — 前端接口文档

> Base URL: `/api/vap/v2/yum-repo`  
> 鉴权: Shiro `ROLE_USER`  
> Content-Type: `application/json`

---

## 0. YUM源配置管理

> 以下接口统一管理 `jao_dc_data` 中 `data_model='yum_configs'` 的记录。
> 新增/编辑/删除均走 VAP 接口，不再使用 JAO 通用接口。

### 0.1 配置列表（含采集状态）

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
    "name": "ssd",
    "description": "",
    "baseurl": "1112",
    "file": "/tmp",
    "collected": false
  }
]
```

已采集的配置会额外包含 `sourceId`、`collected: true`、`collectStatus`、`packageCount`、`finishedAt` 字段。

---

### 0.2 新增配置

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
| name | 否 | YUM源名称 |
| description | 否 | 描述 |
| baseurl | **是** | YUM源地址 |
| file | 否 | YUM源文件路径 |

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

---

### 0.3 编辑配置

```
PUT /configs/{id}
```

- `id`：`GET /configs` 返回的 `dcDataId`

**请求体**：同新增。

**响应** `200`：同新增响应结构。

**错误** `400`：`{ "error": "未找到 yum_configs 配置记录: xxx" }`

---

### 0.4 删除配置

```
DELETE /configs/{id}
```

- `id`：`GET /configs` 返回的 `dcDataId`

**响应** `200`：`{ "message": "已删除" }`

**错误** `400`：`{ "error": "未找到 yum_configs 配置记录: xxx" }`

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

接口根据是否存在已完成的采集记录（`is_current=true` 的快照），返回两种不同结构的响应。

#### 情况一：尚未采集或采集进行中（无已完成的采集记录）

**响应** `200`：

```json
{
  "sourceId": "abc123",
  "sourceName": "CentOS-7-Base",
  "repoUrl": "http://...",
  "message": "尚未采集或采集中"
}
```

| 字段 | 说明 |
|------|------|
| sourceId | 仓库配置 ID |
| sourceName | 仓库显示名 |
| repoUrl | 仓库 URL |
| message | 提示文案，固定值 `"尚未采集或采集中"` |

> 触发采集后、第一次采集成功回调之前，接口始终返回此结构。前端可通过 `message` 字段是否存在来区分两种情况。

#### 情况二：存在已完成的采集记录

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
      "pkgName": "kernel",
      "pkgVersion": "4.18.0-372.26.1.el8_6",
      "pkgArch": "x86_64",
      "pkgFullNevra": "kernel-4.18.0-372.26.1.el8_6.x86_64",
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

> 前端展示建议：
> - 仅展示「**完整包名** (`pkgFullNevra`)」+「**包名** (`pkgName`)」+「**版本号** (`pkgVersion`)」+「**架构** (`pkgArch`)」四个关键字段；
> - `pkgFullNevra` 已合并 name/epoch/version/release/arch，形如 `kernel-4.18.0-372.26.1.el8_6.x86_64`，不再单独展示 `pkgRelease`、`pkgEpoch` 列；
> - 后端仍返回 `pkgRelease` / `pkgEpoch` / `pkgCmpver` 字段（为兼容补丁比对排序使用），前端无需展示。

---

## 3. 补丁比对

### 3.1 执行比对（指定补丁）

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

**响应** `200`：

```json
{ "diffRunId": "d-uuid-xxx" }
```

前端拿到 `diffRunId` 后：
- 调用 `GET /patch-compare/{diffRunId}/overview` 获取总览数据（页面顶部卡片）；
- 调用 `GET /patch-compare/{diffRunId}/patch-view` 获取分页列表。

| diffType | 含义 |
|----------|------|
| AVAILABLE | 仓库中有满足版本要求的包 ✓ |
| MISSING | 仓库中完全没有该包 ✗ |
| OUTDATED | 仓库中有该包但版本不够 ✗ |
| RELEASE_MISMATCH | version 相同但 release 不一致 ✗ |

---

### 3.2 执行比对（以已扫描到的补丁）

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

自动取当前租户 `vap2_curr_machine_patch` 中所有已扫描的补丁做比对，无需手动选择 patchIds。

**响应** `200`：`{ "diffRunId": "d-uuid-xxx" }`

---

### 3.3 补丁比对总览 ⭐ 新增

```
GET /patch-compare/overview
```

补丁比对页顶部「总览卡片」唯一数据源。一次返回当前租户下**所有**仓库源：
- 每个源的采集状态
- 每个源最近一次比对的全局汇总（可/不可安装补丁数、缺包数、版本不够数）
- 每个源按**操作系统**（osFamily + osMajor）分组的同维度统计

用户打开页面即可看到每个源是否缺依赖包；需要按系统分组展示时，直接读 `sources[*].groupByOs`。

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
      "osFamily": "centos",
      "osMajor": "7",
      "snapshotId": "snap-xxx",
      "collectStatus": "SUCCESS",
      "packageCount": 12380,
      "finishedAt": "2026-04-15T10:30:00",
      "diffRunId": "d-uuid-xxx",
      "summary": {
        "totalPatches": 120,
        "installablePatches": 95,
        "notInstallablePatches": 25,
        "totalPackages": 480,
        "availablePackages": 430,
        "missingPackages": 30,
        "outdatedPackages": 15,
        "releaseMismatchPackages": 5,
        "passed": false
      },
      "groupByOs": [
        {
          "osFamily": "centos",
          "osMajor": "7",
          "totalPatches": 120,
          "installablePatches": 95,
          "notInstallablePatches": 25,
          "totalPackages": 480,
          "availablePackages": 430,
          "missingPackages": 30,
          "outdatedPackages": 15,
          "releaseMismatchPackages": 5,
          "passed": false
        }
      ],
      "passed": false
    },
    {
      "sourceId": "def456",
      "sourceName": "Kylin-10",
      "repoUrl": "https://...",
      "osFamily": "kylin",
      "osMajor": "10",
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
| totalSources | 仓库源总数 |
| passedSources | 通过的源数（所有补丁可安装） |
| failedSources | 不通过的源数（存在缺包或版本不够） |
| sources[] | 每个仓库源一项，结构见下 |

**sources[*] 字段**：

| 字段 | 说明 |
|------|------|
| sourceId / sourceName / repoUrl | 源基本信息 |
| osFamily / osMajor | 源登记的操作系统 |
| collectStatus | SUCCESS / FAILED / RUNNING / PENDING / **NOT_COLLECTED**（从未采集） |
| diffRunId | 最近一次比对 ID；`null` 表示尚未比对 |
| summary | 最近一次比对的**全局**汇总，字段见下；`null` 表示尚未比对 |
| groupByOs[] | 按 (osFamily, osMajor) 分组的汇总，每组字段同 summary |
| passed | 源整体是否通过；`null` 表示尚未比对 |

**summary / groupByOs[*] 共用字段**：

| 字段 | 维度 | 说明 |
|------|------|------|
| totalPatches | 补丁 | 比对涉及的补丁数（去重） |
| installablePatches | 补丁 | **可安装补丁数** — 该补丁下所有包都 AVAILABLE |
| notInstallablePatches | 补丁 | **不可安装补丁数** — 存在至少一个 MISSING / OUTDATED / RELEASE_MISMATCH |
| totalPackages | 包 | 比对的「补丁 × 所需包」总数 |
| availablePackages | 包 | 仓库中有满足版本的包数 |
| missingPackages | 包 | **缺少包数** |
| outdatedPackages | 包 | **版本不满足数** |
| releaseMismatchPackages | 包 | version 相同但 release 不一致 |
| passed | — | `totalPatches > 0 && notInstallablePatches == 0` |

> 实现说明：
> - `summary` 就是 `groupByOs` 各组的数值相加，前端无需自己累加。
> - 当源未登记 osFamily / osMajor 时，`groupByOs` 会输出一组 `osFamily=null, osMajor=null`。
> - `compareScannedPatchesForRepo` 场景下同一源通常只产生一个系统组，前端可简化展示。

**前端布局建议**（参考漏洞总览）：

```
┌─ 补丁比对总览 ─────────────────────────────────────┐
│  仓库源 2 个 · 通过 0 · 不通过 1                     │
│                                                    │
│  CentOS-7-Base  ●不通过                             │
│    可安装 95 / 不可安装 25 · 缺包 30 / 版本不够 15    │
│                                                    │
│  Kylin-10      （尚未比对）                          │
└────────────────────────────────────────────────────┘
```

---

### 3.4 补丁维度比对结果（分页）

```
GET /patch-compare/{diffRunId}/patch-view?page=0&size=20&keyword=&diffType=&status=
```

| 参数 | 必填 | 说明 |
|------|------|------|
| diffRunId | **是** | 比对运行 ID（路径参数） |
| keyword | 否 | 搜索 patchId 或补丁标题 |
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

> 列表排序固定为「影响主机数降序 → patchId 升序」，方便优先处理影响范围大的补丁。

---

## 4. 前端集成指引

### 4.1 典型页面流程

```
⓪ YUM源配置页
   └→ 配置列表（GET /configs）
   └→ 点击"YUM源配置录入" → 新增（POST /configs）
   └→ 点击"编辑" → 编辑（PUT /configs/{dcDataId}）
   └→ 点击"删除" → 删除（DELETE /configs/{dcDataId}）

① 采集操作
   └→ 在配置列表中点击"采集"（POST /collect，传 dcDataId）
   └→ 或批量采集（POST /collect/batch）

② 仓库详情 / 采集页
   └→ 轮询状态（GET /repos/{id}/status）
   └→ 采集完成后浏览包列表（GET /packages）
      仅展示 pkgFullNevra / pkgName / pkgVersion / pkgArch 四列

③ 补丁比对页 ⭐ 重点优化
   ├→ 页面顶部「总览卡片」：GET /patch-compare/overview
   │     列出所有源 + 每源的采集状态、是否缺依赖包、按系统分组汇总
   │     （包含 summary 与 groupByOs，前端不再需要第二次请求）
   │
   ├→ 用户点击某仓库 → 选择补丁 / 或用「已扫描补丁」一键比对：
   │     POST /patch-compare  或  POST /patch-compare/scanned
   │     返回 { diffRunId }
   │     之后再次调用 GET /patch-compare/overview 即可刷新顶部数据
   │
   └→ 页面下部「补丁列表」（补丁维度分页）：
         GET /patch-compare/{diffRunId}/patch-view?diffType=&status=&keyword=
```

### 4.2 总览卡片布局建议

颜色参考：可安装/通过 → 绿色；不可安装/缺包 → 红色；版本不够 → 橙色；release 不匹配 → 黄色。
具体 JSON 示例与字段见 3.3 节。

### 4.3 错误处理

所有接口在参数校验失败时返回 `400`：

```json
{ "error": "具体错误信息" }
```

### 4.4 状态轮询

需要轮询的场景仅有一个：**触发采集后轮询 `/repos/{id}/status`**。建议间隔 5 秒，最长等待 10 分钟。

补丁比对是同步接口（响应即意味着比对完成），无需轮询。
