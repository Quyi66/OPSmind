# Excel 导入资产接口

## 业务说明

用户上传 Excel 资产清单后，后端按以下顺序自动完成：

1. 异步解析 Excel，按 sheet 校验、写入 `acm_ci` 表；
2. 对 `is_auto = 1`（支持自动化）的资产，写入 ansible 自动化配置（`acm_automation`）；
3. **自动发起一次连通性测试**（调用 JAO Playbook `oplus/oplus-acm/check-conn/site.yml`），回写连通率到资产属性；
4. **自动发起一次信息采集**（调用 JAO Playbook `oplus/oplus-acm/inventory-collect/site.yml`），回写资产 facts 信息。

第 3、4 步只针对 `is_auto = 1` 的资产，且不会阻塞导入主流程；任意一步失败都不影响其它步骤，错误会写入服务端日志。

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
  - 写入 `acm_hist_collect` 采集历史

回写完成后，前端**重新查询资产列表**即可看到最新的连通率、最新连通状态与采集到的属性。

## 字段说明（与导入相关）

| 字段 | 含义 | 触发条件 |
| --- | --- | --- |
| `acm_ci_type.is_auto` | 是否支持自动化（=1 即 ansible 可达） | 仅当 `=1` 时才会触发自动连通/采集 |
| `acm_automation.login_user` / `login_passwd` | 登录凭据 | Excel 导入时若填写了 ANSIBLE_USER / ANSIBLE_SSH_PASS 等列，则自动写入 |
| `acm_ci.attrs.CONN_RATE` | 连通率（0~100） | 连通回调写入 |
| `acm_ci.attrs.CONN_LATEST_STATUS` | 最近一次连通状态（-1/0/1） | 连通回调写入 |

## 错误处理 & 常见问题

| 场景 | 现象 | 排查 |
| --- | --- | --- |
| sheet 名与资产模型不匹配 | 审计日志 `FAILED`，message 为校验失败信息 | 检查 sheet 名是否等于 `acm_ci_type.title`（区分大小写） |
| 表头与模型属性不一致 | 部分行解析失败 | 表头必须用 title，例如 IP / 操作系统等 |
| 自动连通/采集未触发 | 资产入库成功但连通率不变 | 模型 `is_auto` 不为 1，或资产无 ansible 凭据 |
| 连通脚本执行失败 | 审计日志连通失败 / 资产 CONN_LATEST_STATUS=0 | 检查 JAO 服务、ansible 可达性、ansible 凭据是否正确 |

## 兼容性

- 老接口 `/api/acm/ci/save/automation`、`/api/acm/ci/save/host` 等行为未变更；
- 仅在 Excel 导入路径新增"自动连通 + 自动采集"动作；
- 自动连通/采集失败不会导致导入接口返回错误。
