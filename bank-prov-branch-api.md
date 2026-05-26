# 中行省分行优化 · 前端接口文档

> 配套方案：[`docs/bank-prov-branch-optimization.md`](./bank-prov-branch-optimization.md)
>
> 涉及接口共 **20 个**，分四组：
> - **R3** 主机总览自定义视图（3 个接口） · 路径前缀 `/api/acm/ci/view-config`
> - **R4** 主机端口与区域批量配置（5 个接口） · 路径前缀 `/api/acm/ci/batch`
> - **R2** 漏洞紧急程度看板与规则（5 个接口） · 路径前缀 `/api/vap/v2/urgency`
> - **R1** CVE 文件导入比对（7 个接口） · 路径前缀 `/api/vap/v2/cve/import`
>
> ### 主要变更（v2，2026-05-26）
> - **取消**端口模板表 `acm_port_template`，改为直接批量写主机 attrs（接口路径从 `/api/acm/port-template` → `/api/acm/ci/batch`）
> - **资产区域**改用现有 `acm_tag` / `acm_tag_ci` 实现，约定 3 个保留标签名（互联网/外联网/内网环境、孤岛环境），新增"批量打区域标签"接口

---

## 0. 通用约定

### 0.1 Base URL

- 开发：`http://localhost:8080`
- 通过 `oplus-portal` 网关时无需关心，前端按相对路径请求即可。

### 0.2 认证 / 租户

- 所有接口与现有平台一致：走 JWT 鉴权（`Authorization: Bearer <token>`），租户由 token 的 `tenantId` 自动解析；前端**不需要**显式传 `tenantId`。
- 用户信息（`userLogin`）也从 token 中取，写入数据时自动落 `created_by` / `updated_by`。

### 0.3 通用响应

- 成功：HTTP `200` + JSON Body（具体结构见各接口说明）。
- 客户端错误：HTTP `400` + `{ "error": "..." }`（如文件解析失败、参数缺失、模板名重复）。
- 找不到资源：HTTP `404`。
- 删除成功：HTTP `204`，无 Body。
- 服务端异常：HTTP `5xx` + 平台标准异常体，请前端统一兜底处理。

### 0.4 字段枚举速查

| 维度 | 字段名 | 取值（按业务定义） |
|---|---|---|
| 资产 · 所处环境 | （**复用现有标签**，非 attrs 字段）| `互联网` / `外联网` / `内网环境、孤岛环境`（同时只能挂 1 个，由 set-location 接口保证）|
| 资产 · 运行环境 | `RUN_ENVIRONMENT` | `1-生产` / `2-准生产` / `3-外联` / `4-演练` / `5-服保` / `6-办公` / `7-测试` / `8-开发`（共 14 项，下拉来源银行模板）|
| 资产 · 主机风险等级 | `HOST_RISK_LEVEL` | `1-非常危险` / `2-比较危险` / `3-比较安全` / `4-非常安全` |
| CVE · 风险等级 | severity（中文）| `特高危` / `高危` / `中危` / `低危`（按 CVSS 区间自动算）|
| CVE · 利用程度 | exploit | `可利用` / `可检测` / `尚不可利用`（按 CVSS Vector 自动推导，不暴露给前端编辑）|
| 漏洞 · 紧急程度 | urgency | `特急` / `紧急` / `普通` / `一般`（系统计算）|
| CVE 导入批次状态 | status | `parsed`（已解析）/ `compared`（已比对）/ `exported`（已导出）|

---

## 1. R3 · 主机总览自定义视图

> 资产总览页 / 主机详情页"展示哪些字段"的可配置能力。
>
> 三级回退：**用户级（scope=user）→ 租户级（scope=tenant）→ 默认（系统从资产模型挑前 8 个属性）**

### 1.1 拉取生效视图

```http
GET /api/acm/ci/view-config?ciType=host&scope=user
```

| 参数 | 位置 | 类型 | 默认值 | 说明 |
|---|---|---|---|---|
| `ciType` | query | string | `host` | 资产类型 code |
| `scope`  | query | enum   | `user` | `user` 或 `tenant`；`user` 时优先取用户级，没有再回退租户级、默认 |

**响应 200**

```json
{
  "id": "f3a1...uuid",
  "tenantId": "abc",
  "ciType": "host",
  "scope": "user",
  "ownerId": "alice",
  "viewJson": "{\"overviewCard\":{\"groups\":[...]},\"listColumns\":[...]}",
  "updatedBy": "alice",
  "updatedAt": "2026-05-26 10:30:00"
}
```

> ⚠️ `viewJson` 是**字符串**，前端拿到后请 `JSON.parse(viewJson)` 再用。当系统未持久化任何配置时返回的是默认视图，`id` 字段为 `null`。

`viewJson` 内部结构（前端约定）：

```json
{
  "overviewCard": {
    "groups": [
      { "title": "基础信息",   "attrs": ["IP", "HOSTNAME", "OS", "SSH_PORT", "SERVICE_PORT"] },
      { "title": "网络区域",   "attrs": ["LOCATION", "RUN_ENVIRONMENT"] },
      { "title": "业务属性",   "attrs": ["APPLICATION_SYSTEM", "DEPT_NAME", "HOST_RISK_LEVEL"] },
      { "title": "自定义运维", "attrs": ["MAINTAIN_WINDOW", "BACKUP_POLICY"] }
    ]
  },
  "listColumns": ["IP", "HOSTNAME", "OS", "LOCATION", "RUN_ENVIRONMENT",
                  "APPLICATION_SYSTEM", "DEPT_NAME", "CONN_LATEST_STATUS"]
}
```

---

### 1.2 保存视图

```http
PUT /api/acm/ci/view-config
Content-Type: application/json

{
  "ciType": "host",
  "scope":  "user",
  "viewJson": { "overviewCard": {...}, "listColumns": [...] }
}
```

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ciType`   | string | 否 | 默认 `host` |
| `scope`    | enum   | 否 | `user`（默认）/ `tenant`；保存为 `tenant` 时配置对全租户生效 |
| `viewJson` | object \| string | **是** | 前端可直接传 JSON 对象，后端会序列化；也可传序列化好的字符串 |

**响应 200**：同 1.1 的实体结构（带新生成的 `id`、`updatedAt`）。

**响应 400**：`viewJson` 为空或 `scope=user` 时未取到 `userLogin`。

---

### 1.3 可选属性列表

```http
GET /api/acm/ci/view-config/attrs?ciType=host
```

返回当前租户该资产类型下所有**非分组**属性（`AcmCIType.attrs` 中 `type` 为空的项），前端用于"选择哪些字段展示"的下拉/勾选。

**响应 200**

```json
[
  { "code": "IP",                 "title": "纳管IP",          "required": true,  "editable": true },
  { "code": "RUN_ENVIRONMENT",    "title": "运行环境",        "required": false, "editable": true },
  { "code": "DEPT_NAME",          "title": "处置团队",        "required": false, "editable": true },
  { "code": "APPLICATION_SYSTEM", "title": "应用系统",        "required": false, "editable": true },
  { "code": "HOST_RISK_LEVEL",    "title": "主机风险等级",    "required": false, "editable": true },
  { "code": "SSH_PORT",           "title": "SSH端口",         "required": false, "editable": true },
  { "code": "SERVICE_PORT",       "title": "业务端口",        "required": false, "editable": true }
]
```

> 资产"所处环境"不是 attrs 字段，不会出现在该列表中。前端在主机详情页通过 `GET /api/acm/ci/batch/get-location` 单独取，或在视图组件里直接从主机标签集合中筛选（凡名字属于 §0.4 三选一即为区域）。

---

## 2. R4 · 主机端口与区域批量配置

> 端口直接落到主机 `acm_ci.attrs`；区域复用现有 `acm_tag` / `acm_tag_ci`，**没有模板表**。
> 路径前缀：`/api/acm/ci/batch`

### 2.1 批量配置端口

```http
POST /api/acm/ci/batch/apply-ports
Content-Type: application/json

{
  "hostIds": ["host-uuid-1", "host-uuid-2", "host-uuid-3"],
  "ports":   [
    { "name": "SSH",  "port": 22,  "protocol": "tcp" },
    { "name": "HTTP", "port": 80,  "protocol": "tcp" },
    { "name": "HTTPS","port": 443, "protocol": "tcp" }
  ],
  "mergeStrategy": "overwrite"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `hostIds`       | string[] | 是 | 主机 ID 列表（非空）|
| `ports`         | object[] | 是 | 端口列表，每项 `{name, port, protocol?}`；`port` ∈ `[0, 65535]` |
| `mergeStrategy` | enum     | 否 | `overwrite`（默认）：覆盖主机已有同 name 端口；`keep`：保留已有，仅补缺 |

**应用规则**（写入主机 `attrs`）：

1. 端口列表合并写到 `attrs.PORTS` 数组（按 `name` 大写去重）
2. 若端口 `name` 命中下表，会**同步**写到对应顶层属性，方便上报模板回填：

   | ports 里的 `name` | 同步到 attrs 顶层 |
   |---|---|
   | `SSH` | `SSH_PORT` |
   | `SERVICE` / `HTTP` / `HTTPS` | `SERVICE_PORT` |

**响应 200**：每台主机的应用结果

```json
{
  "host-uuid-1": "ok",
  "host-uuid-2": "ok",
  "host-uuid-3": "error: host not found"
}
```

**响应 400**：`ports` 为空 / 端口越界 / `hostIds` 为空。

---

### 2.2 批量设置单个端口属性

```http
POST /api/acm/ci/batch/set-port
Content-Type: application/json

{
  "hostIds":  ["host-uuid-1", "host-uuid-2"],
  "attrCode": "SERVICE_PORT",
  "port":     8080
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `hostIds`  | string[] | 是 | 主机 ID 列表（非空）|
| `attrCode` | string   | 是 | attrs 属性 code，如 `SSH_PORT` / `SERVICE_PORT` |
| `port`     | number?  | 否 | 0–65535 整数；传 `null` 表示清除该属性 |

**响应 200**：同 2.1 的 `{hostId -> "ok" / "error"}`。

---

### 2.3 列出 3 个保留区域名（前端下拉用）

```http
GET /api/acm/ci/batch/locations
```

**响应 200**

```json
["互联网", "外联网", "内网环境、孤岛环境"]
```

---

### 2.4 批量给主机标记区域

> 资产打区域 = 给主机挂上一个保留名标签。后端会**先解绑**这些主机已有的"区域"类标签，**再绑定**新区域，保证一台主机最多挂一个区域；标签不存在时自动建（`ci_type=host`）。

```http
POST /api/acm/ci/batch/set-location
Content-Type: application/json

{
  "hostIds":  ["host-uuid-1", "host-uuid-2"],
  "location": "互联网"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `hostIds`  | string[] | 是 | 主机 ID 列表 |
| `location` | enum     | 是 | 取值必须是 §2.3 中的 3 个之一 |

**响应 200**

```json
{ "updated": 2, "location": "互联网" }
```

**响应 400**：`location` 不在保留名集合中 / `hostIds` 为空。

> 设置完区域**强烈建议**前端立即调 `POST /api/vap/v2/urgency/recompute-host?hostId=...`（接口 3.3）单台重算，让看板与漏洞列表里的"紧急程度"立即更新。

---

### 2.5 查单台主机当前区域

```http
GET /api/acm/ci/batch/get-location?hostId=host-uuid-1
```

**响应 200**

```json
{ "hostId": "host-uuid-1", "location": "互联网" }
```

> 主机未挂任何区域标签时返回 `"location": null`。

---

## 3. R2 · 漏洞紧急程度看板与规则

> 紧急程度 = f(资产 LOCATION × CVE 利用程度 × CVE 风险等级)，落到每行 (主机 × CVE) 的 `vap2_curr_machine_status.urgency`。

### 3.1 4 档统计大卡

```http
GET /api/vap/v2/urgency/statistics
```

**响应 200**：键固定为 4 档中文，前端按 `特急/紧急/普通/一般` 顺序渲染即可。

```json
{
  "特急": 12,
  "紧急": 38,
  "普通": 156,
  "一般": 412
}
```

> 仅统计 `urgency` 已赋值的行；未触发 `recompute` 时全部为 0。

---

### 3.2 全量重算

```http
POST /api/vap/v2/urgency/recompute?batchSize=1000
```

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `batchSize` | int | 1000 | 单批处理行数；超过 5000 会被截断 |

执行步骤：分批 join `acm_ci.attrs.LOCATION` + `vap2_os_cve` 取数据 → Java 端按 33+3 条规则计算 → 批量 UPDATE。

**响应 200**

```json
{
  "tenantId": "abc",
  "updated":  618,
  "elapsedMs": 4321
}
```

---

### 3.3 单台主机重算

> 资产 `LOCATION` 标签变更后，仅重算该主机所有漏洞的紧急程度。

```http
POST /api/vap/v2/urgency/recompute-host?hostId=host-uuid-1
```

**响应 200**

```json
{ "tenantId": "abc", "hostId": "host-uuid-1", "updated": 27 }
```

---

### 3.4 规则列表（33+3 条）

```http
GET /api/vap/v2/urgency/rule
```

**响应 200**

```json
[
  {
    "id": 1,
    "location":  "互联网",
    "exploit":   "可利用",
    "riskLevel": "特高危",
    "urgency":   "特急",
    "enabled":   1,
    "updatedBy": "system",
    "updatedAt": "2026-05-26T10:00:00"
  }
]
```

排序：按 `location` 升序、`riskLevel` 降序、`exploit` 升序。

---

### 3.5 规则编辑

```http
PUT /api/vap/v2/urgency/rule/{id}
Content-Type: application/json

{ "urgency": "紧急", "enabled": 1 }
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `urgency` | enum | 否 | `特急/紧急/普通/一般` |
| `enabled` | 0/1  | 否 | 0 禁用，1 启用 |

> ❗ `location / exploit / riskLevel` 是规则唯一键，**不允许通过此接口修改**。
> 编辑保存后 `UrgencyEvaluator` 会自动 reload 内存缓存（无需重启服务）。

**响应 200**：保存后的规则实体。

---

## 4. R1 · CVE 文件导入比对

> 上传银行下发的 Excel → 平台自动比对扫描结果 → 列出整改清单 → 导出"漏洞排查结果反馈表"。

### 4.1 上传 Excel

```http
POST /api/vap/v2/cve/import/upload
Content-Type: multipart/form-data

file: <Excel 文件>
```

约束：

- 仅支持 `.xlsx` / `.xls`
- 文件大小 ≤ 10 MB
- CVE 行数 ≤ 5000

后端解析逻辑：

- 列名按"模糊匹配 + 别名"识别（CVE 编号 / 漏洞编号 / BugNumber 都能识别）
- 单元格内多个 CVE（按逗号/分号/空白/换行分隔）会拆成多行
- 同时尝试识别 `BugSource`（来源）/ `ProjectName`（项目批次），首条非空值落到批次级元数据

**响应 200**：批次实体，状态 `parsed`

```json
{
  "id": 17,
  "tenantId": "abc",
  "batchNo": "20260526103000",
  "sourceType": "excel",
  "originalName": "漏洞排查结果反馈模板.xlsx",
  "bugSource":   "8-人行态势感知平台",
  "projectBatch": "704-科运中心2025年度第56期威胁排查",
  "totalInput": 86,
  "matchedCount": 0,
  "affectedHosts": 0,
  "status": "parsed",
  "remark": null,
  "createdBy": "alice",
  "createdAt": "2026-05-26T10:30:00"
}
```

**响应 400**：文件为空 / 超过限制 / 格式不支持 / 无 CVE 行。响应体 `{ "error": "..." }`。

> 上传成功后，前端建议立即调 4.2 触发比对。

---

### 4.2 触发比对

```http
POST /api/vap/v2/cve/import/batch/{id}/compare
```

后端动作：

1. 把该批次所有 CVE 编号一次性查 `vap2_os_cve` 拿到风险等级
2. 一次性查 `vap2_curr_machine_status` 拿到受影响主机
3. 回填 `vap2_cve_import_item.matched / severity / affectedHosts / fixedHosts`
4. 更新批次 `matchedCount / affectedHosts / status=compared`

**响应 200**：批次实体（状态变为 `compared`，统计字段已回填）。

**响应 404**：批次不存在或不属于当前租户。

---

### 4.3 历史批次分页

```http
GET /api/vap/v2/cve/import/batch?page=0&size=20
```

| 参数 | 默认 | 说明 |
|---|---|---|
| `page` | 0 | 页码（从 0 开始）|
| `size` | 20 | 每页条数（最大 200）|

**响应 200**：标准 Spring `Page<CveImportBatch>` 结构

```json
{
  "content": [ /* CveImportBatch[] */ ],
  "totalElements": 17,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

---

### 4.4 批次详情（含 items）

```http
GET /api/vap/v2/cve/import/batch/{id}
```

**响应 200**

```json
{
  "batch": {
    "id": 17, "tenantId": "abc", "batchNo": "20260526103000",
    "totalInput": 86, "matchedCount": 72, "affectedHosts": 14,
    "status": "compared", "createdAt": "2026-05-26T10:30:00"
  },
  "items": [
    {
      "id": 1801,
      "batchId": 17,
      "cveId": "CVE-2025-6843",
      "bugName": "code-projects Simple Photo Gallery 文件上传漏洞",
      "category": "84-文件上传",
      "threatLevel": "DMZ区、外联区服务器:低 / 其他:低",
      "rawRowNo": 4,
      "matched": 1,
      "severity": "中等",
      "affectedHosts": 3,
      "fixedHosts": 1
    }
  ]
}
```

> `severity` 字段是系统侧规范化后的风险等级（中文，4 档之一）；`threatLevel` 保留银行下发原文，便于前端原样展示。

---

### 4.5 涉及主机清单（按主机聚合）

```http
GET /api/vap/v2/cve/import/batch/{id}/affected-hosts
```

**响应 200**

```json
{
  "batchId": 17,
  "totalHosts": 14,
  "hosts": [
    {
      "hostId":  "host-uuid-1",
      "hostKey": "10.10.1.5",
      "osDistro": "kylin",
      "osVersion": "V10",
      "cveCount": 8,
      "cveIds":   ["CVE-2025-6843", "CVE-2025-6840", "..."],
      "urgencies": ["紧急", "普通"],
      "rebootNeeded": true
    }
  ]
}
```

> `urgencies` 是该主机命中本批次所有 CVE 的紧急程度去重列表（仅当 R2 已 `recompute` 后才有值）。

---

### 4.6 导出上报模板（Excel 文件下载）

```http
POST /api/vap/v2/cve/import/batch/{id}/export-report
```

**响应**

- HTTP `200`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename=漏洞排查结果反馈表_{id}.xlsx`
- Body 是 xlsx 二进制流

前端可直接当文件下载（不需要解析 JSON）：

```ts
const res = await fetch(`/api/vap/v2/cve/import/batch/${id}/export-report`, { method: 'POST' });
const blob = await res.blob();
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = decodeURIComponent(
  res.headers.get('Content-Disposition')?.match(/filename=(.+)/)?.[1] ?? `report-${id}.xlsx`
);
a.click();
```

调用一次后批次 `status` 自动变为 `exported`。

---

### 4.7 删除批次

```http
DELETE /api/vap/v2/cve/import/batch/{id}
```

**响应 204**：删除成功（同时删除 items）。
**响应 404**：批次不存在。

---

## 5. 跨需求联动建议（前端实现要点）

1. **R3 视图配置 + 资产模型**：
   - 进入"自定义视图"抽屉时先调 1.3（拿到当前资产类型可选属性），再调 1.1（拿到当前生效配置），渲染勾选状态。
   - 用户保存调 1.2，立即更新主机详情/列表的渲染。

2. **R4 端口批量配置 + R1 上报导出**：
   - 在主机选中 → 调 2.1 `apply-ports` 写入端口 → 立即可在 4.6 导出 Excel 时看到 O 列端口已回填。

3. **资产区域编辑 → R2 重算**：
   - 用户在主机列表选中 → 调 2.4 `set-location` 打区域 → **立即**调 3.3 单主机重算，使该主机所有漏洞的"紧急程度"立刻反映新区域。
   - 如果一次改了很多主机，建议改完后调 3.2 全量 recompute（一次几千台几秒钟）。

4. **R1 上传 → 比对 → 看清单 → 导出 一气呵成**：

   ```text
   4.1 upload  → batchId
   4.2 compare → status=compared
   4.4 detail  → 渲染 items（CVE 视图）
   4.5 affected-hosts → 渲染主机视图
   4.6 export-report → 下载上报模板
   ```

5. **R2 紧急程度看板**：
   - 进入页面时 3.1 拿统计 + 3.4 拿规则；
   - 用户改规则后调 3.5，UI 即时反映；
   - 数据看板的 4 档点击下钻，可以联动 CVE 列表筛选（沿用现有 `/api/vap/v2/cve/list` 增加一个 `urgency` 参数即可，**当前后端尚未加该筛选参数，看是否需要补**）。

---

## 6. 接口速查表

| # | 方法 | 路径 | 用途 |
|---|---|---|---|
| 1.1 | GET    | `/api/acm/ci/view-config?ciType=&scope=` | 拉取生效视图 |
| 1.2 | PUT    | `/api/acm/ci/view-config` | 保存视图 |
| 1.3 | GET    | `/api/acm/ci/view-config/attrs?ciType=` | 可选属性列表 |
| 2.1 | POST   | `/api/acm/ci/batch/apply-ports` | 批量给主机配置端口 |
| 2.2 | POST   | `/api/acm/ci/batch/set-port` | 批量设置某端口属性 |
| 2.3 | GET    | `/api/acm/ci/batch/locations` | 列出 3 个保留区域 |
| 2.4 | POST   | `/api/acm/ci/batch/set-location` | 批量给主机打区域标签 |
| 2.5 | GET    | `/api/acm/ci/batch/get-location?hostId=` | 查单台主机当前区域 |
| 3.1 | GET    | `/api/vap/v2/urgency/statistics` | 4 档统计 |
| 3.2 | POST   | `/api/vap/v2/urgency/recompute?batchSize=` | 全量重算 |
| 3.3 | POST   | `/api/vap/v2/urgency/recompute-host?hostId=` | 单台主机重算 |
| 3.4 | GET    | `/api/vap/v2/urgency/rule` | 规则列表 |
| 3.5 | PUT    | `/api/vap/v2/urgency/rule/{id}` | 编辑规则 |
| 4.1 | POST   | `/api/vap/v2/cve/import/upload` | 上传 Excel |
| 4.2 | POST   | `/api/vap/v2/cve/import/batch/{id}/compare` | 触发比对 |
| 4.3 | GET    | `/api/vap/v2/cve/import/batch?page=&size=` | 批次分页 |
| 4.4 | GET    | `/api/vap/v2/cve/import/batch/{id}` | 批次详情 |
| 4.5 | GET    | `/api/vap/v2/cve/import/batch/{id}/affected-hosts` | 涉及主机清单 |
| 4.6 | POST   | `/api/vap/v2/cve/import/batch/{id}/export-report` | 下载反馈模板 |
| 4.7 | DELETE | `/api/vap/v2/cve/import/batch/{id}` | 删除批次 |
