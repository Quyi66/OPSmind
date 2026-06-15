# Excel 导入资产接口

## 业务说明

用户上传 Excel 资产清单后，后端按以下顺序自动完成：

1. 异步解析 Excel，按 sheet 校验、写入 `acm_ci` 表；
2. 对 `is_auto = 1`（支持自动化）的资产，写入 ansible 自动化配置（`acm_automation`）；
3. 将这些资产的 `attrs.COLLECT_STATUS` 重置为 `0`（默认"采集失败/未回调"），随后**自动发起连通性测试**和**自动发起信息采集**；
4. 采集脚本回调成功的资产，其 `attrs.COLLECT_STATUS` 被置为 `1`（采集成功），并写入资产 facts 信息；
5. 没回调的资产（连通失败或 ansible 执行失败）保持 `COLLECT_STATUS = 0`，被视为**异常设备**。

> 第 3-5 步只针对 `is_auto = 1` 的资产；任意一步失败都不会阻塞导入主流程，错误进入服务端日志。

### 资产分类规则

| 分类 | 判定条件 | 含义 |
| --- | --- | --- |
| 资产列表（正常） | `attrs.COLLECT_STATUS` 为 `1` 或字段缺省（历史资产/手工录入） | 最近一次采集成功，或从未触发过自动采集 |
| 异常设备 | `attrs.COLLECT_STATUS = 0` | 最近一次自动采集失败/未回调（连通失败或 ansible 失败） |

## 接口定义

### 上传 Excel 导入资产

| 项 | 值 |
| --- | --- |
| URL | `/api/acm/ci/import2` |
| Method | `POST` |
| Content-Type | `multipart/form-data` |
| 鉴权 | 需要登录态（JWT），自动从 SecurityContext 中取 `tenantId` 与 `token` |
| 处理模式 | 异步，接口立即返回 `"ok"`，实际进度通过审计日志 `X-Run-Id` 跟踪 |

#### 请求 Header

| 名称 | 必填 | 说明 |
| --- | --- | --- |
| `X-Run-Id` | 是 | 前端生成的运行 ID，用于关联审计日志（`operation_log`），后续查询进度时用该 ID 查 |
| `Tenant-Id` | 是 | 当前租户，常规鉴权 Header |
| `Authorization` | 是 | `Bearer <jwt-token>` |

#### 请求 Body（form-data）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | File | 是 | Excel 文件，sheet 名需要与 `acm_ci_type.title` 一致，表头与该模型的属性定义保持一致 |

#### 响应

成功（HTTP 200）：

```json
"ok"
```

失败：HTTP 4xx/5xx + 文本错误信息（IO 异常等）。

> 注意：接口仅表示文件已接收并起异步任务，**不代表导入完成**。导入完成结果通过审计日志接口查询。

#### 请求示例

```bash
curl -X POST 'http://oplus.example.com/oplus-portal/acm/api/acm/ci/import2' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...' \
  -H 'Tenant-Id: default' \
  -H 'X-Run-Id: 9e2c9e8f-2026-05-21-abc123' \
  -F 'file=@/path/to/assets.xlsx'
```

```js
// 前端 axios 示例
const formData = new FormData();
formData.append('file', excelFile);
await axios.post('/api/acm/ci/import2', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'X-Run-Id': runId,
  },
});
```

## 进度 / 结果查询（已有接口，未变更）

导入完成后，后端会调用 `auditService.updateOperation(runId, status, message)` 写审计日志：

| status | message 示例 |
| --- | --- |
| `COMPLETED` | `本次导入资产10个，新增资产6个，更新资产4个` |
| `FAILED` | 异常信息（如 sheet 名校验失败 / Excel 解析失败） |

前端可通过运行 ID 查询当前审计/操作日志接口获取进度（具体接口路径见 `oplus-portal` 审计日志模块）。

## 连通性测试 & 信息采集回调

这两步对前端**透明**，由后端自动发起；其结果通过以下回调接口异步写回：

- 连通性测试回调：`POST /api/acm/auto/connection/connect`
  - 写入 `acm_connection` 表
  - 更新 `acm_ci.attrs.CONN_RATE` 与 `CONN_LATEST_STATUS`
- 信息采集回调：`POST /api/acm/ci/callback/save/attr`
  - 合并资产 facts 到 `acm_ci.attrs`
  - 将 `acm_ci.attrs.COLLECT_STATUS` 置为 `1`（采集成功）
  - 写入 `acm_hist_collect` 采集历史

回写完成后，前端**重新查询资产列表**即可看到最新的连通率、采集状态与采集到的属性。

## 资产列表 / 异常设备查询

前端复用已有的 `POST /api/acm/ci/list-asset-selector` 接口，通过在 `param` 中追加 `COLLECT_STATUS` 过滤条件实现两个 Tab：

### 资产列表（正常）

包括"采集成功"和"历史资产/未触发过采集"两类，传多值 OR 过滤（`,` 分隔）：

```http
POST /api/acm/ci/list-asset-selector HTTP/1.1
Content-Type: application/json
filter: <base64-encoded-url-encoded-search>
page: 1
size: 20

{
  "selectorStr": "@@",
  "assetType": "linux",
  "status": "1",
  "COLLECT_STATUS": "1,null"
}
```

- `1` → 最近一次自动采集成功
- `null` → `attrs` 里没有 `COLLECT_STATUS` 字段（历史资产 / 手工录入但未触发过采集）

### 异常设备

```http
POST /api/acm/ci/list-asset-selector HTTP/1.1
Content-Type: application/json
filter: <base64-encoded-url-encoded-search>
page: 1
size: 20

{
  "selectorStr": "@@",
  "assetType": "linux",
  "status": "1",
  "COLLECT_STATUS": "0"
}
```

返回结构与现有资产列表完全一致（仅过滤集合不同）。

> 实现说明：服务端 `filterAttrsQuery` 用 `String.valueOf(attrMap.get(key))` 取值并多值 OR 比对，因此传 `null`（字符串）可以匹配 attrs 中不存在该字段的资产，无需后端单独定义查询参数。

## 字段说明（与导入相关）

| 字段 | 含义 | 触发条件 |
| --- | --- | --- |
| `acm_ci_type.is_auto` | 是否支持自动化（=1 即 ansible 可达） | 仅当 `=1` 时才会触发自动连通/采集 |
| `acm_automation.login_user` / `login_passwd` | 登录凭据 | Excel 导入时若填写了 ANSIBLE_USER / ANSIBLE_SSH_PASS 等列，则自动写入 |
| `acm_ci.attrs.CONN_RATE` | 连通率（0~100） | 连通回调写入 |
| `acm_ci.attrs.CONN_LATEST_STATUS` | 最近一次连通状态（-1/0/1） | 连通回调写入 |
| `acm_ci.attrs.COLLECT_STATUS` | 最近一次采集状态（1=成功，0=失败/未回调，缺省=未触发过自动采集） | 触发采集时置 0；采集回调成功置 1 |

## 错误处理 & 常见问题

| 场景 | 现象 | 排查 |
| --- | --- | --- |
| sheet 名与资产模型不匹配 | 审计日志 `FAILED`，message 为校验失败信息 | 检查 sheet 名是否等于 `acm_ci_type.title`（区分大小写） |
| 表头与模型属性不一致 | 部分行解析失败 | 表头必须用 title，例如 IP / 操作系统等 |
| 自动连通/采集未触发 | 资产入库成功但 `CONN_LATEST_STATUS`、`COLLECT_STATUS` 都没刷新 | 模型 `is_auto` 不为 1，或资产无 ansible 凭据 |
| 连通脚本执行失败 | 审计日志连通失败 / 资产 `CONN_LATEST_STATUS=0` | 检查 JAO 服务、ansible 可达性、ansible 凭据是否正确 |
| 采集回调一直不来 | 资产 `COLLECT_STATUS` 长时间停留在 0 | 多为连通失败或 ansible playbook 报错，前端可在异常设备 Tab 看到这些设备，引导用户修复凭据后重试 |

## 兼容性

- 老接口 `/api/acm/ci/save/automation`、`/api/acm/ci/save/host` 等行为未变更；
- 仅在 Excel 导入路径新增"自动连通 + 自动采集"动作；
- 自动连通/采集失败不会导致导入接口返回错误。
