# Windows 补丁管理 — 前端接口文档

> 方案：**WUA + 内网 WSUS**（目标机用 Windows Update Agent 引擎扫描/安装/回滚，对接内网 WSUS，客户端无需外网）。
> 取代旧的"离线已装 KB 采集 + 补丁库差集"方案。
> 网关前缀：所有接口经 `oplus-portal` 转发，前端调用路径为 `/oplus-portal/vap/api/...`，下表为转发后真实路径。

## 1. 主机维度查询

### 1.1 主机补丁扫描汇总（分页）
- `GET /api/vap/win-patch/hosts?page=0&size=20`
- 说明：按主机聚合 `vap2_curr_machine_status_win`，返回每台主机待修复/已安装统计及严重度分级。
- 响应（`Page<WinHostSummaryView>`）：

```json
{
  "content": [
    {
      "id": "<host_id>", "hostId": "<host_id>", "hostKey": "192.168.1.86",
      "osDistro": "Windows Server 2025 Datacenter", "osVersion": "10.0.26100.1742", "osArch": "AMD64",
      "totalMissing": 5, "criticalCount": 2, "importantCount": 2, "moderateCount": 0, "lowCount": 0,
      "unspecifiedCount": 1, "installedCount": 120,
      "lastScanDate": "2026-06-05 12:31:41", "lastScanRunId": "<runId>"
    }
  ],
  "totalElements": 1, "totalPages": 1, "number": 0, "size": 20
}
```
- 字段：`totalMissing`=待修复(`patch_status=no_repair` 且未忽略)；`installedCount`=已修复(`is_repair`)；severity 各档取 `vap2_curr_machine_status_win.severity`（WUA `MsrcSeverity`）。

### 1.2 单台主机补丁明细（分页、可过滤）
- `GET /api/vap/win-patch/hosts/{hostId}/patches?page=0&size=50`
- 过滤参数（均可选）：
  - `severity`：`Critical|Important|Moderate|Low|Unspecified`（Unspecified 含空值/非标准值）
  - `patchStatus`：`no_repair|is_repair|repairing|repaird|repair_faild`
  - `keyword`：KB 编号或标题模糊匹配
- 响应（`Page<WinHostPatchView>`）：

```json
{
  "content": [
    { "id": "...", "hostId": "...", "hostKey": "192.168.1.86", "kbNumber": "KB5087539",
      "title": "2026-05 Cumulative Update ...", "categoryName": "Security Updates",
      "patchStatus": "no_repair", "severity": "Critical",
      "osDistro": "...", "osVersion": "10.0.26100.1742", "osArch": "AMD64",
      "scanDate": "2026-06-05 12:31:41", "isIgnore": false }
  ],
  "totalElements": 5, "totalPages": 1
}
```

## 2. 任务触发

### 2.1 触发扫描
- `POST /api/vap/win-patch/tasks/scan`
- 请求体（二选一）：`["<hostId1>","<hostId2>"]` 或 `{"hostIds":["<hostId1>"]}`
- 行为：对所选主机下发 `func=scan` 作业（WUA 走内网 WSUS），结果经 `/win/callback/scan` 异步落库。
- 响应：`{"_status":"ok","runId":"<runId>"}`；失败：`{"_status":"error","message":"..."}`

### 2.2 安装 / 回滚补丁
- `POST /api/vap/win/patch/{type}`，`type` = `update`（安装） | `rollback`（回滚）
- 请求体：

```json
{ "winPatchStatusIds": ["<vap2_curr_machine_status_win.id>", "..."], "reboot": "no" }
```
- 行为：按补丁状态记录 ID 反查主机+KB，下发 `func=update`/`func=rollback`（WUA 从 WSUS 下载安装 / WUA+DISM 卸载），结果经 `/win/callback/update`（安装）或 `/win/callback/scan`（回滚）落库。`reboot`=`yes|no`。

## 3. 任务历史 / 日志 / 导出

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/vap/win-patch/tasks?page=0&size=20` | 安装/回滚 run 历史（按时间倒序） |
| GET | `/api/vap/win-patch/tasks/{taskId}` | 任务历史详情 |
| GET | `/api/vap/win-patch/install-logs?hostId=&page=0&size=20` | 安装/回滚日志（可按主机过滤） |
| POST | `/api/vap/win-patch/export` | 导出补丁扫描报告（Excel，`WinPatchExportRequest` 过滤条件，返回 .xlsx 流） |
| DELETE | `/api/vap/win/patch/rollback/history/windows` | 删除回滚历史 |

## 4. WSUS 服务器配置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/vap/win-patch/wsus-config` | 查询当前租户 WSUS 配置 |
| POST | `/api/vap/win-patch/wsus-config` | 保存/更新（`{"wsusUrl":"192.168.1.75","wsusPort":8530,"useSsl":0,"description":""}`） |
| DELETE | `/api/vap/win-patch/wsus-config/{id}` | 删除 |

> WSUS 配置用于安装/扫描时可选下发 `wsus_url`；若客户端已由 GPO 指向 WSUS，则无需依赖此配置。

## 5. 回调接口（平台内部，JAO→后端，前端无需调用）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/vap/win/callback/scan` | 扫描/回滚结果回调 |
| POST | `/api/vap/win/callback/update` | 安装结果回调 |

## 6. 补丁状态字典

| patch_status | 含义 | 计入 |
|---|---|---|
| `no_repair` | 未修复（缺失，待安装） | 待修复 |
| `is_repair` | 已修复（已安装） | 已安装 |
| `is_repair_artificial` | 人工已修复 | 已安装 |
| `repairing` | 修复中（安装下发后） | — |
| `repair_faild` | 修复失败 | — |

| severity | 来源：WUA MsrcSeverity |
|---|---|
| Critical / Important / Moderate / Low | 标准四档 |
| Unspecified | 空值或非标准值 |
