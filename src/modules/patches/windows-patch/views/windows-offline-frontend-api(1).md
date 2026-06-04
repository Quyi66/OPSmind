# Windows 离线补丁 前端接口文档

> 分支：`feature/windows-patch-offline-v2`
> 网关：Web 端经 `oplus-portal` 转发，前缀 `/oplus-portal/vap/api/vap/...`；下游 `oplus-vap` 真实路径 `/api/vap/...`。本文统一给**前端可访问的完整路径**。
> 认证：JWT Bearer Token；Windows 写操作需 `ROLE_PRIVUSER`，CVE 查询需 `ROLE_USER`。

> 与旧接口的关系：**接口路径与请求/响应结构完全沿用原 Windows 实现**，前端无需改造。本次后端变更对前端只新增两个**可选字段**：主机漏洞记录的 `cveIds`、`severity`（离线机器才有值，联网机器可能为空）。

---

## 1. 接口总览

| # | 分类 | 方法 | 路径 | 角色 |
| --- | --- | --- | --- | --- |
| 2.0 | 主机 | GET | `/vap/api/vap/win-patch/hosts` | USER |
| 2.1 | 安装 | POST | `/vap/api/vap/win/patch/install` | PRIVUSER |
| 2.2 | 回滚 | POST | `/vap/api/vap/win/patch/rollback` | PRIVUSER |
| 2.3 | 回滚历史 | DELETE | `/vap/api/vap/win/patch/rollback/history/windows` | PRIVUSER |
| 3.1 | JAO 回调（非前端） | POST | `/vap/api/vap/win/callback/scan` | PRIVUSER |
| 3.2 | JAO 回调（非前端） | POST | `/vap/api/vap/win/callback/update` | PRIVUSER |
| 4.1 | Windows CVE | GET | `/vap/api/vap/v2/win-cve/list` | USER |
| 4.2 | Windows CVE | GET | `/vap/api/vap/v2/win-cve/detail/{cveId}` | USER |
| 4.3 | Windows CVE | GET | `/vap/api/vap/v2/win-cve/statistics` | USER |
| 4.4 | Windows CVE | GET | `/vap/api/vap/v2/win-cve/affected/{cveId}` | USER |
| 4.5 | Windows CVE | POST | `/vap/api/vap/v2/win-cve/export` | USER |

> 「扫描」无直接 REST 入口：由 JAO 调度脚本作业触发，完成后回调 `/callback/scan` 落库。前端触发"立即扫描"需调用 JAO 作业接口并把回调固定为 3.1。

---

## 2. 主机列表

### 2.0 主机补丁扫描汇总 `GET /vap/api/vap/win-patch/hosts`
按主机聚合的扫描概览，每台主机一行；用于 Windows 离线补丁主页的「主机列表」。后端基于扫描结果表 `vap2_curr_machine_status_win` 按 `hostId` 聚合，严重度分级通过关联补丁库 `vap2_win_patch_library.severity` 补全。

- Query：`page`（默认 0）、`size`（默认 20）。
- 角色：`ROLE_USER`。
- 响应：标准分页结构 `{ content:[WinHost], totalElements, totalPages, size, number, first, last }`。

`WinHost` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` / `hostId` | string | 主机 ID（两者同值，便于前端取用） |
| `hostKey` | string | 主机标识（IP） |
| `osDistro` / `osVersion` / `osArch` | string | OS 信息（osVersion 含 build） |
| `totalMissing` | number | 待修复补丁总数（`patch_status != repaird` 且未忽略） |
| `criticalCount` / `importantCount` / `moderateCount` / `lowCount` | number | 各严重度档位的待修复补丁数 |
| `unspecifiedCount` | number | 严重度不在标准四档内（含空值/未知）的待修复补丁数 |
| `installedCount` | number | 已安装（`patch_status = repaird`）补丁数 |
| `lastScanDate` | datetime | 最近一次扫描时间 |
| `lastScanRunId` | string | 最近一次扫描 run id |

> 排序：默认按 `lastScanDate` 倒序。严重度计数依赖补丁库中该 KB 的 `severity`；补丁库缺该 KB 时该补丁计入 `unspecifiedCount`。

cURL：

```bash
curl -X GET 'https://host/oplus-portal/vap/api/vap/win-patch/hosts?page=0&size=20' \
  -H 'Authorization: Bearer <token>'
```

> 主机明细（某台主机的逐条待修复补丁）走漏洞列表接口 / 第 5 节字段，安装时取其中的 `id` 作为 `/win/patch/install` 入参。

---

## 3. 安装 / 回滚

> 异步执行，接口立即返回 200；真实进度看 `operation_log`（轮询）或回调落库。

### 3.1 安装 `POST /vap/api/vap/win/patch/install`
- Body：`["currMachineStatusWinId1", ...]`（来自 `vap2_curr_machine_status_win.id`，即漏洞列表里选中的待修复项）
- Query：`reboot=yes|no`（默认 no）
- 响应：`{ "_status": "ok" }`
- 状态流：选中项 `patch_status` → `repairing`（修复中）→ 回调后 `repaird` / `repair_faild`。后端按 KB 聚合下发（`update_kbs`），离线机器经 WSUS 定向安装。

cURL：

```bash
curl -X POST 'https://host/oplus-portal/vap/api/vap/win/patch/install?reboot=no' \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '["uuid-1","uuid-2"]'
```

### 3.2 回滚 `POST /vap/api/vap/win/patch/rollback`
- Body：`["histUpdatePkgsWinId1", ...]`（来自 `vap2_hist_update_pkgs_win.id`）
- Query：`reboot=yes|no`
- 响应：`{ "_status": "ok" }`

### 3.3 删除回滚历史 `DELETE /vap/api/vap/win/patch/rollback/history/windows`
- Body：`["histId1","histId2"]` → `{ "_status": "ok" }`（仅删前端记录，不影响目标机）

---

## 4. Windows CVE 查询 & 报表

### 4.1 列表 `GET /vap/api/vap/v2/win-cve/list`
Query：`severity`、`keyword`、`startDate`/`endDate`(yyyy-MM-dd)、`page`、`size`、`sortBy`(默认 publicDate)、`sortDir`(默认 desc)。
响应：`{ content:[WinCve], totalElements, totalPages, size, number, first, last }`。

### 4.2 详情 `GET /vap/api/vap/v2/win-cve/detail/{cveId}`
响应含 `summary{fixed,affected,total}` 与 `affectedProducts{fixed[],affected[]}`，每项 `{productName,kbArticle,kbUrl,fixedBuild,status,statusLabel}`。404：`{"error":"CVE not found: ..."}`。

### 4.3 统计 `GET /vap/api/vap/v2/win-cve/statistics`
响应 Map：`totalCves`、`bySeverity`、`byMonth`。

### 4.4 受影响产品 `GET /vap/api/vap/v2/win-cve/affected/{cveId}`
响应：`{ cveId, totalProducts, products:[{productName,kbArticle,kbUrl,fixedBuild,status,statusLabel}] }`。

### 4.5 导出 `POST /vap/api/vap/v2/win-cve/export`
Body：`{ "cveIds": ["CVE-2024-1234"] }`；返回 xlsx 流（3 个 Sheet）。400：`{"error":"cveIds不能为空"}`。

---

## 5. 主机漏洞记录字段（新增可选字段）

主机漏洞项（`vap2_curr_machine_status_win`，出现在漏洞列表 / 安装选择源）字段：

| 字段 | 说明 | 是否新增 |
| --- | --- | --- |
| `id` | 主键（安装接口入参来源） | 否 |
| `hostId` / `hostKey` | 主机 ID / 标识(IP) | 否 |
| `kbNumber` | KB 编号 | 否 |
| `title` / `categoryName` | 标题 / 分类 | 否 |
| `patchStatus` | `no_repair`/`is_repair`/`repairing`/`repaird`/`repair_faild` 等 | 否 |
| `osDistro` / `osVersion` / `osArch` | OS 信息（osVersion 含 build） | 否 |
| `isIgnore` | 是否忽略 | 否 |
| **`cveIds`** | 该 KB 修复的 CVE（逗号分隔）；**离线比对产生，联网机可能为空** | ✅ 新增 |
| **`severity`** | 严重等级（取命中 CVE 最高）；**离线比对产生，联网机可能为空** | ✅ 新增 |

> 前端兼容建议：`cveIds` / `severity` 按可空处理；有值时可在漏洞列表展示「关联 CVE / 严重度」，无值时留空（与旧行为一致）。

---

## 6. 典型业务流

### 6.1 主机修复闭环
```
[前端] 选主机 + 待修复补丁(currMachineStatusWinId)
POST /patch/install?reboot=no  body=[id,...]   → 200 ok
[轮询] operation_log 查 run 状态 → SUCCEED/FAILED
[前端] 刷新主机漏洞列表（已修复项变 repaird / 回收）
```

### 6.2 回滚闭环
```
[前端] 在安装历史选回滚项(histUpdatePkgsWinId)
POST /patch/rollback?reboot=no body=[id,...]  → 200 ok
[轮询] 同上 → 完成；可选 DELETE /patch/rollback/history/windows 清记录
```
