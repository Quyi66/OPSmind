# YUM 源多配置管理 — 变动接口文档

> 本文档仅包含本次改造**新增与变动**的接口。  
> Base URL: `/api/vap/v2/yum-repo`  
> 鉴权: Shiro `ROLE_USER`  
> Content-Type: `application/json`

---

## 变更说明

原系统中 YUM 源配置存储在 `jao_dc_data`（`data_model='yum_configs'`），每条记录代表一个 YUM 源。
前端需要分别调用 JAO 接口获取配置列表、VAP 接口获取采集状态，且只能逐条触发采集。

本次改造新增：
1. **统一配置列表接口** `GET /configs` — 一次返回所有已配置的 YUM 源及其采集状态，无需前端拼接
2. **批量采集接口** `POST /collect/batch` — 支持一次触发多条 YUM 源采集

---

## 1. YUM 源配置列表（含采集状态）【新增】

将 `jao_dc_data` 中的 YUM 源配置与 `vap2_repo_source` 的采集状态合并输出，前端用此接口渲染列表页。

```
GET /api/vap/v2/yum-repo/configs
```

### 请求参数

无。自动按当前登录用户的租户过滤。

### 响应 `200`

```json
[
  {
    "dcDataId": "2c9280849c4fd6d9019c5000154d47a9",
    "dataOwnerId": "host-001",
    "createTime": "2026-02-12T11:58:28.000+08:00",
    "updateTime": "2026-02-12T11:58:28.000+08:00",
    "name": "kylinsp3",
    "description": "Kylin Linux Advanced Server 10 - Os",
    "baseurl": "https://update.cs2c.com.cn/NS/V10/V10SP3/os/adv/lic/base/x86_64/",
    "file": "/etc/yum.repos.d/test.repo",
    "sourceId": "abc123",
    "collected": true,
    "collectStatus": "SUCCESS",
    "packageCount": 12380,
    "finishedAt": "2026-04-15T10:30:00"
  },
  {
    "dcDataId": "xxxx-yyyy-zzzz",
    "dataOwnerId": null,
    "createTime": "2026-04-20T09:00:00.000+08:00",
    "updateTime": "2026-04-20T09:00:00.000+08:00",
    "name": "rhel8-baseos",
    "description": "RHEL 8 BaseOS",
    "baseurl": "http://mirror.example.com/rhel8/baseos/x86_64/",
    "file": "/etc/yum.repos.d/rhel8.repo",
    "collected": false
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| dcDataId | String | jao_dc_data 记录 ID，触发采集时作为参数传入 |
| dataOwnerId | String | 录入时关联的标识 |
| createTime | DateTime | 配置创建时间 |
| updateTime | DateTime | 配置更新时间 |
| name | String | YUM 源名称（如 `kylinsp3`） |
| description | String | YUM 源描述 |
| baseurl | String | 仓库 URL 地址 |
| file | String | YUM 源文件路径（仅展示用） |
| collected | Boolean | 是否已触发过采集 |
| sourceId | String | 仓库配置 ID（仅 `collected=true` 时存在），用于后续查询状态、包列表、比对 |
| collectStatus | String | 最近一次采集状态（仅 `collected=true` 时存在） |
| packageCount | Integer | 最近一次成功采集的包数量（仅采集成功时存在） |
| finishedAt | DateTime | 采集完成时间（仅采集成功时存在） |

### collectStatus 枚举

| 值 | 含义 |
|------|------|
| PENDING | 已创建，等待执行 |
| RUNNING | Ansible 执行中 |
| SUCCESS | 采集成功 |
| FAILED | 采集失败 |

### 前端使用示例

```javascript
// 获取所有 YUM 源配置及采集状态
const response = await fetch('/oplus-portal/vap/api/vap/v2/yum-repo/configs');
const configs = await response.json();

// configs 即为数组，直接渲染表格
// 表头：YUM源名称 | 描述 | YUM源地址 | YUM源文件 | 采集状态 | 包数量 | 操作
configs.forEach(item => {
  // item.collected === true  → 已采集，展示 item.collectStatus / item.packageCount
  // item.collected === false → 未采集，展示"未采集"
});
```

---

## 2. 批量触发采集【新增】

一次性为多个已配置的 YUM 源触发采集任务。

```
POST /api/vap/v2/yum-repo/collect/batch
```

### 请求体

```json
{
  "dcDataIds": [
    "2c9280849c4fd6d9019c5000154d47a9",
    "xxxx-yyyy-zzzz",
    "aaaa-bbbb-cccc"
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dcDataIds | String[] | **是** | jao_dc_data 记录 ID 数组（来自 `GET /configs` 响应的 `dcDataId` 字段） |

### 响应 `200`

```json
{
  "total": 3,
  "successCount": 2,
  "failCount": 1,
  "results": [
    {
      "dcDataId": "2c9280849c4fd6d9019c5000154d47a9",
      "sourceId": "abc123",
      "snapshotId": "snap-001"
    },
    {
      "dcDataId": "xxxx-yyyy-zzzz",
      "sourceId": "def456",
      "snapshotId": "snap-002"
    },
    {
      "dcDataId": "aaaa-bbbb-cccc",
      "error": "yum_configs 记录中缺少 baseurl"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| total | Integer | 提交的总条数 |
| successCount | Integer | 成功提交采集任务的数量 |
| failCount | Integer | 失败的数量 |
| results | Array | 逐条结果 |
| results[].dcDataId | String | 对应的配置记录 ID |
| results[].sourceId | String | 仓库配置 ID（成功时返回），用于后续轮询状态 |
| results[].snapshotId | String | 本次采集记录 ID（成功时返回） |
| results[].error | String | 错误信息（失败时返回） |

### 错误响应 `400`

```json
{ "error": "dcDataIds 必须是数组" }
```

```json
{ "error": "dcDataIds 不能为空" }
```

### 前端使用示例

```javascript
// 1. 先获取所有配置
const configs = await fetch('/oplus-portal/vap/api/vap/v2/yum-repo/configs').then(r => r.json());

// 2. 提取所有 dcDataId，批量触发采集
const allIds = configs.map(c => c.dcDataId);
const batchResult = await fetch('/oplus-portal/vap/api/vap/v2/yum-repo/collect/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dcDataIds: allIds })
}).then(r => r.json());

// 3. 对每个成功的条目轮询采集状态
batchResult.results
  .filter(r => r.sourceId)
  .forEach(r => {
    pollStatus(r.sourceId); // 轮询 GET /repos/{sourceId}/status
  });
```

---

## 3. 触发采集（单条）【已有，无变动】

保持原有行为不变，供前端对单条配置触发采集使用。

```
POST /api/vap/v2/yum-repo/collect
```

| 字段 | 必填 | 说明 |
|------|------|------|
| dcDataId | 与 baseurl 二选一 | jao_dc_data 记录 ID |
| baseurl | 与 dcDataId 二选一 | 仓库 URL |

响应：`{ "sourceId": "...", "snapshotId": "...", "message": "采集任务已提交" }`

---

## 4. 前端集成指引

### 4.1 页面流程（推荐）

```
┌──────────────────────────────────────────────────────────┐
│  YUM 源配置页                                             │
│                                                          │
│  ┌─────────────────────┐                                 │
│  │ [YUM源配置录入] 按钮  │  ← 新增/编辑配置（JAO dc_data） │
│  │ [全部采集]     按钮  │  ← POST /collect/batch          │
│  └─────────────────────┘                                 │
│                                                          │
│  数据来源: GET /configs                                    │
│  ┌────────┬──────────┬──────────┬────────┬──────┬──────┐ │
│  │YUM源名称│   描述    │ YUM源地址 │YUM源文件│采集状态│ 操作 │ │
│  ├────────┼──────────┼──────────┼────────┼──────┼──────┤ │
│  │kylinsp3│Kylin...  │https://..│/etc/...│SUCCESS│采集  │ │
│  │        │          │          │        │12380包│编辑  │ │
│  │        │          │          │        │      │删除  │ │
│  ├────────┼──────────┼──────────┼────────┼──────┼──────┤ │
│  │rhel8   │RHEL 8... │http://.. │/etc/...│未采集 │采集  │ │
│  │        │          │          │        │      │编辑  │ │
│  │        │          │          │        │      │删除  │ │
│  └────────┴──────────┴──────────┴────────┴──────┴──────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 操作对应接口

| 操作 | 接口 | 说明 |
|------|------|------|
| 加载列表 | `GET /api/vap/v2/yum-repo/configs` | 返回所有配置及采集状态 |
| 单条采集 | `POST /api/vap/v2/yum-repo/collect` | `{ "dcDataId": "xxx" }` |
| 全部采集 | `POST /api/vap/v2/yum-repo/collect/batch` | `{ "dcDataIds": [...] }` |
| 轮询状态 | `GET /api/vap/v2/yum-repo/repos/{sourceId}/status` | 触发采集后每 5 秒轮询 |
| 新增配置 | `POST /api/jao/dc/data` | 操作 jao_dc_data，已有逻辑 |
| 编辑配置 | `PUT /api/jao/dc/data` | 操作 jao_dc_data，已有逻辑 |
| 删除配置 | `PUT /api/jao/dc/data/{id}` | 操作 jao_dc_data，已有逻辑 |
| 删除仓库（含采集数据） | `DELETE /api/vap/v2/yum-repo/repos/{id}` | 传 sourceId，级联清理 |

### 4.3 采集状态轮询

触发采集（单条或批量）后，使用返回的 `sourceId` 轮询采集状态：

```javascript
async function pollStatus(sourceId, interval = 5000, maxWait = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`/oplus-portal/vap/api/vap/v2/yum-repo/repos/${sourceId}/status`)
      .then(r => r.json());

    if (res.collectStatus === 'SUCCESS' || res.collectStatus === 'FAILED') {
      return res; // 采集结束
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('采集超时');
}
```

### 4.4 错误处理

所有接口在参数校验失败时返回 HTTP `400`：

```json
{ "error": "具体错误信息" }
```

### 4.5 幂等性

- 同一 `dcDataId` 反复调用 `/collect` 或 `/collect/batch`，后端按 `(tenant + baseurl)` 幂等管理 `RepoSource`，不会重复创建仓库记录
- 每次采集会新建一条 `BaselineSnapshot`，采集成功后自动标记为 `is_current=true`
- 前端无需关心去重逻辑
