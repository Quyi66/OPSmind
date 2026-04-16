# Windows 补丁管理 — 开发部署与前端集成文档

## 目录

- [1. 概述](#1-概述)
- [2. 完整业务流程（前端调用顺序）](#2-完整业务流程前端调用顺序)
  - [2.1 首次纳管流程](#21-首次纳管流程)
  - [2.2 日常扫描流程](#22-日常扫描流程)
  - [2.3 补丁安装流程](#23-补丁安装流程)
  - [2.4 补丁回滚流程](#24-补丁回滚流程)
  - [2.5 导出报告](#25-导出报告)
- [3. 接口调用详解](#3-接口调用详解)
  - [3.1 WSUS 配置管理](#31-wsus-配置管理)
  - [3.2 连通性测试](#32-连通性测试)
  - [3.3 补丁扫描（核心接口）](#33-补丁扫描核心接口)
  - [3.4 查看扫描结果](#34-查看扫描结果)
  - [3.5 补丁安装](#35-补丁安装)
  - [3.6 补丁回滚](#36-补丁回滚)
  - [3.7 任务查询](#37-任务查询)
  - [3.8 导出 Excel](#38-导出-excel)
- [4. 数据库变更](#4-数据库变更)
  - [4.1 新建表（必须执行）](#41-新建表必须执行)
  - [4.2 废弃表（待清理）](#42-废弃表待清理)
  - [4.3 清理 SQL](#43-清理-sql)
- [5. Playbook 脚本变更](#5-playbook-脚本变更)
  - [5.1 保留的脚本](#51-保留的脚本)
  - [5.2 废弃的脚本](#52-废弃的脚本)
  - [5.3 JAO 脚本库部署步骤](#53-jao-脚本库部署步骤)
- [6. Java 代码变更](#6-java-代码变更)
- [7. 部署检查清单](#7-部署检查清单)
- [8. 目标主机配置](#8-目标主机配置)
- [9. WSUS 离线服务器部署](#9-wsus-离线服务器部署)
- [10. 常见问题排查](#10-常见问题排查)

---

## 1. 概述

Windows 补丁管理统一使用 `win-patch-wsus` 模块，通过 `scanMode` 参数兼容 **在线**（直连 Microsoft Windows Update）和 **离线**（WSUS 服务器）两种网络环境。

**旧版 `oplus-vap-windows` 模块已废弃**，所有扫描/安装/回滚操作统一通过新模块 `com.famessoft.oplus.winpatch` 完成。

| 能力 | 在线环境 | 离线环境（WSUS） |
|------|---------|-----------------|
| 补丁扫描 | `scanMode=online` | `scanMode=wsus` |
| 补丁安装 | 从 MS Windows Update 下载 | 从 WSUS 服务器下载 |
| 补丁回滚 | WUA + DISM 双模式 | 同左 |
| 连通性测试 | WinRM + WUA | WinRM + WUA + WSUS 可达性 |
| 自动适配 | `scanMode=auto`（默认），无 WSUS 配置时走在线 | `scanMode=auto`，有 WSUS 配置时走 WSUS |

---

## 2. 完整业务流程（前端调用顺序）

### 2.1 首次纳管流程

```
步骤 1: ACM 录入 Windows 主机（assetType=windows）
       │
步骤 2: （仅离线环境）配置 WSUS 服务器
       POST /api/win-patch/wsus-config
       │
步骤 3: 连通性测试
       POST /api/win-patch/tasks/conn-test
       │
步骤 4: 轮询任务状态，等待完成
       GET /api/win-patch/tasks/{taskId}
       │
步骤 5: 所有主机状态为 PASS → 完成纳管
```

### 2.2 日常扫描流程

```
步骤 1: 创建扫描任务
       POST /api/win-patch/tasks/scan
       {
         "hostIds": ["host-001", "host-002"],
         "scanMode": "auto"
       }
       │
       │ 返回: { "id": "task-001", "taskStatus": "RUNNING", "runId": "xxx" }
       │
步骤 2: 轮询任务状态（建议间隔 5 秒）
       GET /api/win-patch/tasks/{taskId}
       │
       │ 等待 taskStatus 变为 COMPLETED 或 FAILED
       │
步骤 3: 查看主机扫描概况
       GET /api/win-patch/hosts?page=0&size=20
       │
步骤 4: 查看单台主机补丁明细
       GET /api/win-patch/hosts/{hostId}/patches?patchStatus=MISSING&page=0&size=50
```

### 2.3 补丁安装流程

```
步骤 1: 从扫描结果中选择 MISSING 状态的补丁记录 ID
       │
步骤 2: 创建安装任务
       POST /api/win-patch/tasks/install
       {
         "patchStatusIds": ["ps-id-001", "ps-id-002"],
         "reboot": false
       }
       │
步骤 3: 轮询任务状态
       GET /api/win-patch/tasks/{taskId}
       │
步骤 4: 查看安装结果
       GET /api/win-patch/install-logs?hostId=host-001
```

### 2.4 补丁回滚流程

```
步骤 1: 从安装日志中选择要回滚的记录 ID
       │
步骤 2: 创建回滚任务
       POST /api/win-patch/tasks/rollback
       {
         "installLogIds": ["log-001", "log-002"],
         "reboot": false
       }
       │
步骤 3: 轮询任务状态
       GET /api/win-patch/tasks/{taskId}
```

### 2.5 导出报告

```
POST /api/win-patch/export
{ "hostIds": ["host-001"], "severity": "Critical", "patchStatus": "MISSING" }
       │
       ▼
下载 Excel 文件（3 个 Sheet: 主机概况 / 补丁明细 / 统计概览）
```

---

## 3. 接口调用详解

**基础路径**: `/api/win-patch`
**认证**: 所有接口需携带 `Authorization` Header 和 `Tenant-Id` Header

### 3.1 WSUS 配置管理

> 仅离线环境需要。在线环境可跳过。

#### 保存 WSUS 配置

```
POST /api/win-patch/wsus-config
```

```json
{
  "wsusUrl": "http://wsus-server:8530",
  "wsusPort": 8530,
  "useSsl": false,
  "description": "生产环境 WSUS 服务器"
}
```

#### 查询 WSUS 配置列表

```
GET /api/win-patch/wsus-config
```

#### 删除 WSUS 配置

```
DELETE /api/win-patch/wsus-config/{id}
```

---

### 3.2 连通性测试

```
POST /api/win-patch/tasks/conn-test
```

```json
{
  "hostIds": ["host-001", "host-002"],
  "wsusConfigId": "wsus-config-001"
}
```

检测项: WinRM 服务、WinRM Listener、PowerShell 执行策略、WUA COM 组件、wuauserv 服务、WSUS 注册表、WSUS 网络可达性、磁盘空间(C:>=2GB)、TLS 版本。

---

### 3.3 补丁扫描（核心接口）

```
POST /api/win-patch/tasks/scan
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | String[] | **是** | 要扫描的主机 ID 列表 |
| scanMode | String | 否 | `auto`(默认) / `online` / `wsus`，见下方说明 |
| wsusConfigId | String | 否 | 指定 WSUS 配置 ID |
| categories | String | 否 | 逗号分隔的类别过滤 |

**scanMode 详解**

| 值 | 行为 | 何时使用 |
|----|------|---------|
| `auto` | 查找租户下的 WSUS 配置，有则走 WSUS，无则走在线 Windows Update。**默认值** | 大部分场景 |
| `online` | 忽略所有 WSUS 配置，强制走 Microsoft Windows Update 在线源 | 目标机能上外网 |
| `wsus` | 强制走 WSUS 服务器扫描，找不到 WSUS 配置则返回 400 错误 | 离线隔离网络 |

**请求示例 — 自动模式（推荐）**

```json
{
  "hostIds": ["host-001", "host-002"]
}
```

**请求示例 — 在线模式**

```json
{
  "hostIds": ["host-001"],
  "scanMode": "online",
  "categories": "SecurityUpdates,CriticalUpdates"
}
```

**请求示例 — WSUS 离线模式**

```json
{
  "hostIds": ["host-001"],
  "scanMode": "wsus",
  "wsusConfigId": "wsus-config-001"
}
```

**响应**

```json
{
  "id": "task-002",
  "taskType": "SCAN",
  "taskStatus": "RUNNING",
  "runId": "jao-run-456",
  "hostCount": 2,
  "createdDate": "2026-04-14T10:10:00"
}
```

**支持的 categories 值**

`SecurityUpdates`, `CriticalUpdates`, `UpdateRollups`, `Updates`, `DefinitionUpdates`, `FeaturePacks`, `ServicePacks`, `Tools`, `Upgrades`, `Application`, `Connectors`, `DeveloperKits`, `Guidance`

---

### 3.4 查看扫描结果

#### 主机扫描概况

```
GET /api/win-patch/hosts?page=0&size=20
```

返回每台主机的缺失补丁数、各严重级别统计。

#### 单台主机补丁明细

```
GET /api/win-patch/hosts/{hostId}/patches?severity=Critical&patchStatus=MISSING&keyword=KB503&page=0&size=50
```

| 参数 | 说明 |
|------|------|
| severity | 按严重级别筛选: `Critical` / `Important` / `Moderate` / `Low` |
| patchStatus | 按状态筛选: `MISSING` / `INSTALLED` / `INSTALLING` / `INSTALL_FAILED` 等 |
| keyword | 搜索 KB 编号或标题 |

---

### 3.5 补丁安装

```
POST /api/win-patch/tasks/install
```

```json
{
  "patchStatusIds": ["ps-id-001", "ps-id-002"],
  "reboot": false,
  "rescanAfter": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patchStatusIds | String[] | **是** | `win_patch_host_status` 表中 MISSING 状态记录的 ID |
| reboot | Boolean | 否 | 安装后是否重启主机，默认 false |
| rescanAfter | Boolean | 否 | 安装后是否自动重新扫描，默认 false |

---

### 3.6 补丁回滚

```
POST /api/win-patch/tasks/rollback
```

```json
{
  "installLogIds": ["log-001", "log-002"],
  "reboot": false,
  "rescanAfter": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| installLogIds | String[] | **是** | `win_patch_install_log` 表中 action=INSTALL 且 result=SUCCESS 的记录 ID |
| reboot | Boolean | 否 | 回滚后是否重启，默认 false |
| rescanAfter | Boolean | 否 | 回滚后是否自动重新扫描，默认 false |

---

### 3.7 任务查询

#### 任务列表

```
GET /api/win-patch/tasks?taskType=SCAN&page=0&size=20
```

#### 任务详情（含每台主机执行状态）

```
GET /api/win-patch/tasks/{taskId}
```

```json
{
  "task": { "id": "task-002", "taskType": "SCAN", "taskStatus": "COMPLETED", "hostCount": 2 },
  "hosts": [
    { "hostId": "host-001", "status": "SUCCESS", "errorMessage": null },
    { "hostId": "host-002", "status": "FAILED", "errorMessage": "WinRM connection timeout" }
  ]
}
```

#### 安装/回滚历史

```
GET /api/win-patch/install-logs?hostId=host-001&page=0&size=20
```

---

### 3.8 导出 Excel

```
POST /api/win-patch/export
Content-Type: application/json
```

```json
{
  "hostIds": ["host-001"],
  "severity": "Critical",
  "patchStatus": "MISSING"
}
```

响应为 `.xlsx` 二进制流，前端按 blob 下载处理。

---

## 4. 数据库变更

### 4.1 新建表（必须执行）

执行以下两个 SQL 迁移脚本:

| 脚本 | 说明 |
|------|------|
| `V20260410__win_patch_wsus_tables.sql` | 创建 6 张新表 |
| `V20260413__create_win_cve_tables.sql` | 创建 CVE 相关表 |

脚本位于 `oplus-vap/src/main/resources/db/migration/`，均使用 `IF NOT EXISTS`，可安全重复执行。

**新表清单**

| 表名 | 用途 |
|------|------|
| `win_patch_wsus_config` | WSUS 服务器配置 |
| `win_patch_task` | 任务记录（扫描/安装/回滚/连通性测试） |
| `win_patch_task_host` | 每台主机的任务执行状态 |
| `win_patch_host_status` | **核心表** — 每台主机每个 KB 的补丁状态 |
| `win_patch_host_summary` | 每台主机的扫描汇总统计 |
| `win_patch_install_log` | 安装/回滚操作历史 |
| `win_cve` | Windows CVE 元数据（MSRC） |
| `win_cve_affected` | CVE 受影响产品 |

### 4.2 废弃表（待清理）

以下 4 张表属于旧版 `oplus-vap-windows` 模块，**新模块不再读写**：

| 旧表名 | 原用途 | 新表替代 |
|--------|--------|---------|
| `vap2_curr_machine_status_win` | 主机补丁状态 | `win_patch_host_status` |
| `vap2_curr_machine_scan_win` | 主机扫描汇总 | `win_patch_host_summary` |
| `vap2_hist_scan_win` | 扫描历史快照 | `win_patch_host_status`（通过 scan_date 追踪） |
| `vap2_hist_update_pkgs_win` | 安装/回滚历史 | `win_patch_install_log` |

### 4.3 清理 SQL

> **注意**: 先确认前端页面已全部迁移到新接口（`/api/win-patch/*`），不再读旧表后再执行！建议先备份。

```sql
-- ============================================================
-- 废弃旧版 Windows 补丁表清理脚本
-- 执行前请确认:
--   1. 前端已完全迁移到 /api/win-patch/* 接口
--   2. 旧 JAO 预定义扫描作业(sany_win_patchScan_job_id)已停用
--   3. 已备份旧表数据（如需保留历史）
-- ============================================================

-- 步骤 1: 备份旧表（可选，按需执行）
CREATE TABLE IF NOT EXISTS _bak_vap2_curr_machine_status_win AS SELECT * FROM vap2_curr_machine_status_win;
CREATE TABLE IF NOT EXISTS _bak_vap2_curr_machine_scan_win   AS SELECT * FROM vap2_curr_machine_scan_win;
CREATE TABLE IF NOT EXISTS _bak_vap2_hist_scan_win           AS SELECT * FROM vap2_hist_scan_win;
CREATE TABLE IF NOT EXISTS _bak_vap2_hist_update_pkgs_win    AS SELECT * FROM vap2_hist_update_pkgs_win;

-- 步骤 2: 删除旧表
DROP TABLE IF EXISTS vap2_hist_update_pkgs_win;
DROP TABLE IF EXISTS vap2_hist_scan_win;
DROP TABLE IF EXISTS vap2_curr_machine_scan_win;
DROP TABLE IF EXISTS vap2_curr_machine_status_win;

-- 步骤 3: 清理备份表（确认无需后执行）
-- DROP TABLE IF EXISTS _bak_vap2_curr_machine_status_win;
-- DROP TABLE IF EXISTS _bak_vap2_curr_machine_scan_win;
-- DROP TABLE IF EXISTS _bak_vap2_hist_scan_win;
-- DROP TABLE IF EXISTS _bak_vap2_hist_update_pkgs_win;
```

---

## 5. Playbook 脚本变更

### 5.1 保留的脚本（当前使用）

部署到 JAO 脚本库路径: `oplus/oplus-vap/win-patch-wsus/`

| 文件 | JAO Git 路径 | 用途 |
|------|-------------|------|
| `site.yml` | `oplus/oplus-vap/win-patch-wsus/site.yml` | Ansible 主 Playbook，根据 `func` 参数分发 |
| `Scan-WsusPatches.ps1` | `oplus/oplus-vap/win-patch-wsus/scripts/Scan-WsusPatches.ps1` | 补丁扫描（在线 + WSUS 双模式） |
| `Install-WsusPatches.ps1` | `oplus/oplus-vap/win-patch-wsus/scripts/Install-WsusPatches.ps1` | 补丁安装 |
| `Rollback-WsusPatches.ps1` | `oplus/oplus-vap/win-patch-wsus/scripts/Rollback-WsusPatches.ps1` | 补丁回滚（WUA + DISM 双模式） |
| `Test-WinRMConnection.ps1` | `oplus/oplus-vap/win-patch-wsus/scripts/Test-WinRMConnection.ps1` | 连通性测试 |

源码位于代码仓库: `oplus-vap/playbooks/win-patch-wsus/`

### 5.2 废弃的脚本（待清理）

JAO 脚本库路径: `oplus/oplus-vap/oplus-vap-windows/`

| 文件 | 原用途 | 替代方案 |
|------|--------|---------|
| `site.yml` | 旧版 Ansible Playbook 入口 | `win-patch-wsus/site.yml` |
| `roles/check_winodws/tasks/check_windows.yml` | 使用 Ansible `win_updates` 模块扫描 | `Scan-WsusPatches.ps1` |
| `roles/check_winodws/templetes/pkglist.j2.json` | 扫描结果 JSON 模板 | PS1 脚本直接输出标准 JSON |
| `roles/update_windows/tasks/update_windows.yml` | 使用 Ansible `win_updates` 安装补丁 | `Install-WsusPatches.ps1` |
| `roles/update_windows/templetes/pkglist.j2.json` | 安装结果 JSON 模板 | PS1 脚本直接输出 |
| `roles/rollback_windows/tasks/rollback_windows.yml` | `wusa /uninstall` 回滚 | `Rollback-WsusPatches.ps1` |
| `hosts` | Inventory 文件 | 不再需要（JAO 动态生成） |

**JAO 脚本库清理步骤**

```bash
cd <jao-scripts-repo>

# 删除旧版 Windows 模块
rm -rf oplus/oplus-vap/oplus-vap-windows/

git add -A
git commit -m "chore: remove deprecated oplus-vap-windows playbook (replaced by win-patch-wsus)"
git push
```

> **注意**: 执行前确认没有 JAO 预定义作业仍引用旧路径 `oplus/oplus-vap/oplus-vap-windows/site.yml`。如果有，先在 JAO 管理界面删除或停用该作业。

### 5.3 JAO 脚本库部署步骤

```bash
# 1. 克隆 JAO 脚本库
git clone <jao-script-repo-url> jao-scripts
cd jao-scripts

# 2. 创建新模块目录
mkdir -p oplus/oplus-vap/win-patch-wsus/scripts

# 3. 从代码仓库复制文件
cp <oplus-base>/oplus-vap/playbooks/win-patch-wsus/site.yml \
   oplus/oplus-vap/win-patch-wsus/

cp <oplus-base>/oplus-vap/playbooks/win-patch-wsus/scripts/*.ps1 \
   oplus/oplus-vap/win-patch-wsus/scripts/

# 4. （可选）删除旧版模块
rm -rf oplus/oplus-vap/oplus-vap-windows/

# 5. 提交
git add -A
git commit -m "feat: deploy win-patch-wsus, remove legacy oplus-vap-windows"
git push
```

部署后 JAO 脚本库目录结构:

```
oplus/oplus-vap/
├── win-patch-wsus/              ← 当前使用
│   ├── site.yml
│   └── scripts/
│       ├── Scan-WsusPatches.ps1
│       ├── Install-WsusPatches.ps1
│       ├── Rollback-WsusPatches.ps1
│       └── Test-WinRMConnection.ps1
├── oplus-vap/                   ← Linux 补丁模块（不变）
│   └── site.yml
└── repo-rpm-scan/               ← Yum 仓库扫描（不变）
    └── site.yml
```

---

## 6. Java 代码变更

### 6.1 新增/修改的文件

| 文件 | 变更 | 说明 |
|------|------|------|
| `oplus-jao-pub/.../AuditService.java` | 修改 | 修复并发写 `jao_audit_log` 的 `Record has changed since last read` 异常，增加重试机制 |
| `oplus-vap/.../winpatch/dto/ScanTaskRequest.java` | 修改 | 新增 `scanMode` 字段 (`auto`/`online`/`wsus`) |
| `oplus-vap/.../winpatch/service/impl/WinPatchScanServiceImpl.java` | 修改 | 新增 `resolveWsusUrlByMode()` 按模式路由 |

### 6.2 废弃的文件（`@Deprecated`，待前端迁移完成后删除）

以下 34 个文件全部位于 `com.famessoft.oplus.win` 包下，已标记 `@Deprecated`:

| 分类 | 文件 | 说明 |
|------|------|------|
| **Controller** | `WinCallbackController.java` | 旧版回调入口 `/api/vap/win/callback/*` |
| **ETL** | `WinScanResultEtl.java` | 旧版扫描回调处理 |
| | `WinUpdateResultEtl.java` | 旧版安装回调处理 |
| **Runner** | `WinScriptRunner.java` | 旧版 Playbook 路径定义 |
| | `WinPatchFactory.java` | 旧版 install/rollback 路由 |
| | `WinPatchRunner.java` | 旧版 Runner 接口 |
| | `WinPatchInstallRunner.java` | 旧版安装执行器 |
| | `WinPatchRollbackRunner.java` | 旧版回滚执行器 |
| **Entity** | `CurrMachineStatusWin.java` | 映射 `vap2_curr_machine_status_win` |
| | `CurrMachineScanWin.java` | 映射 `vap2_curr_machine_scan_win` |
| | `HistScanWin.java` | 映射 `vap2_hist_scan_win` |
| | `HistUpdatePkgsWin.java` | 映射 `vap2_hist_update_pkgs_win` |
| **Repository** | `CurrMachineStatusWinRepository.java` | |
| | `CurrMachineScanWinRepository.java` | |
| | `HistScanWinRepository.java` | |
| | `HistUpdatePkgsWinRepository.java` | |
| **Service** | `CurrMachineStatusWinService.java` + Impl | |
| | `CurrMachineScanWinService.java` + Impl | |
| | `HistScanWinService.java` + Impl | |
| | `HistUpdatePkgsWinService.java` + Impl | |
| **其他** | `ActionConfig.java`, `PatchCategoryConfig.java` | 旧配置 |
| | `JpaUtils.java` | 旧工具类 |
| | 4 个 DTO + 3 个 VO | 旧数据传输对象 |

### 6.3 当前使用的文件（`com.famessoft.oplus.winpatch`）

```
oplus-vap/src/main/java/com/famessoft/oplus/winpatch/
├── config/WinPatchConstants.java          # 常量定义
├── entity/                                # 6 个 JPA 实体
│   ├── WsusConfig.java                    → win_patch_wsus_config
│   ├── WinPatchTask.java                  → win_patch_task
│   ├── WinPatchTaskHost.java              → win_patch_task_host
│   ├── WinHostPatchStatus.java            → win_patch_host_status
│   ├── WinHostScanSummary.java            → win_patch_host_summary
│   └── WinPatchInstallLog.java            → win_patch_install_log
├── dao/                                   # 6 个 Repository
├── dto/
│   ├── ScanTaskRequest.java               # 扫描请求（含 scanMode）
│   ├── InstallTaskRequest.java            # 安装请求
│   ├── RollbackTaskRequest.java           # 回滚请求
│   ├── ExportRequest.java                 # 导出请求
│   ├── HostPatchDetail.java               # 查询响应
│   └── TaskDetail.java                    # 任务详情响应
├── service/
│   ├── WinPatchScanService.java           # 扫描
│   ├── WinPatchInstallService.java        # 安装
│   ├── WinPatchRollbackService.java       # 回滚
│   ├── WinConnTestService.java            # 连通性测试
│   ├── WinPatchExportService.java         # 导出
│   ├── WinPatchQueryService.java          # 查询
│   └── WsusConfigService.java            # WSUS 配置
├── callback/
│   ├── WinScanCallbackProcessor.java      # 扫描回调
│   ├── WinInstallCallbackProcessor.java   # 安装回调
│   ├── WinRollbackCallbackProcessor.java  # 回滚回调
│   └── WinConnTestCallbackProcessor.java  # 连通性测试回调
├── dispatcher/WinPatchTaskDispatcher.java  # JAO 任务分发
└── web/
    ├── WinPatchTaskController.java        # POST /api/win-patch/tasks/*
    ├── WinPatchQueryController.java       # GET /api/win-patch/hosts/*
    ├── WinPatchCallbackController.java    # POST /api/win-patch/callback/*
    └── WsusConfigController.java          # /api/win-patch/wsus-config
```

---

## 7. 部署检查清单

按顺序执行:

| # | 操作 | 命令/位置 | 验证方式 |
|---|------|----------|---------|
| 1 | 执行新建表 SQL | `V20260410__win_patch_wsus_tables.sql` | `SHOW TABLES LIKE 'win_patch%';` 确认 6 张表存在 |
| 2 | 执行 CVE 表 SQL | `V20260413__create_win_cve_tables.sql` | `SHOW TABLES LIKE 'win_cve%';` 确认 2 张表存在 |
| 3 | 部署 Playbook 到 JAO 脚本库 | 见 [5.3 节](#53-jao-脚本库部署步骤) | JAO Git 中 `oplus/oplus-vap/win-patch-wsus/` 目录包含 `site.yml` + 4 个 `.ps1` |
| 4 | 构建部署 Java 应用 | `mvn clean package` → 部署 `oplus-vap.war` | 应用启动无报错 |
| 5 | 配置 WSUS（仅离线） | 通过 API 或管理界面添加 WSUS 配置 | `GET /api/win-patch/wsus-config` 返回配置 |
| 6 | 验证连通性测试 | `POST /api/win-patch/tasks/conn-test` | 任务完成，主机状态为 PASS |
| 7 | 验证扫描 | `POST /api/win-patch/tasks/scan` | 任务完成，`GET /api/win-patch/hosts` 返回扫描数据 |
| 8 | 前端全部迁移完成后 | 停用旧 JAO 扫描作业 | JAO 管理界面中旧 Windows 扫描作业已禁用 |
| 9 | 清理旧 Playbook | 删除 JAO 脚本库中 `oplus-vap-windows/` | 目录不存在 |
| 10 | 清理旧数据库表 | 执行 [4.3 节清理 SQL](#43-清理-sql) | `SHOW TABLES LIKE 'vap2%win';` 返回空 |

---

## 8. 目标主机配置

### 8.1 开启 WinRM 服务

```powershell
# 以管理员身份运行
winrm quickconfig -q

# 验证
Get-Service WinRM
winrm enumerate winrm/config/Listener
```

### 8.2 配置 WinRM 认证

```powershell
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service '@{MaxConcurrentOperationsPerUser="100"}'
winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="1024"}'
```

### 8.3 防火墙

```powershell
Get-NetFirewallRule -Name "WINRM-HTTP-In-TCP" | Enable-NetFirewallRule
# 或手动创建
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "WinRM HTTP" -Protocol TCP -LocalPort 5985 -Action Allow
```

### 8.4 WSUS 指向（仅离线环境，可选）

> 扫描脚本在 `scanMode=wsus` 或 `auto` 时会自动通过注册表配置 WSUS 指向。以下手动配置仅作为预配参考。

**组策略（域环境）**

```
计算机配置 → 管理模板 → Windows 组件 → Windows Update
  → 指定 Intranet Microsoft 更新服务位置
    - 检测更新的 Intranet 更新服务: http://wsus-server:8530
    - Intranet 统计服务器: http://wsus-server:8530
```

**注册表（工作组环境）**

```powershell
$wsusUrl = "http://wsus-server:8530"
$wuKey = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate"
$auKey = "$wuKey\AU"
New-Item -Path $wuKey -Force | Out-Null
New-Item -Path $auKey -Force | Out-Null
Set-ItemProperty -Path $wuKey -Name "WUServer" -Value $wsusUrl
Set-ItemProperty -Path $wuKey -Name "WUStatusServer" -Value $wsusUrl
Set-ItemProperty -Path $auKey -Name "UseWUServer" -Value 1
Restart-Service wuauserv -Force
```

---

## 9. WSUS 离线服务器部署

> 在线环境跳过此章节。

### 9.1 安装 WSUS 角色

```powershell
Install-WindowsFeature -Name UpdateServices -IncludeManagementTools
```

```cmd
cd "C:\Program Files\Update Services\Tools"
wsusutil.exe postinstall CONTENT_DIR=D:\WSUS_Content
```

### 9.2 离线补丁导入

```cmd
# 有网环境导出
wsusutil.exe export export.xml.gz export.log

# 离线环境导入（拷贝 export.xml.gz + WSUSContent 后）
wsusutil.exe import export.xml.gz import.log
```

### 9.3 补丁审批

WSUS 管理控制台 → 更新 → 所有更新 → 筛选未审批 → 右键审批安装 → 选择目标计算机组。

> 只有经过审批的更新才会被客户端扫描到。

---

## 10. 常见问题排查

### Q1: WinRM 连接超时

```powershell
Get-Service WinRM
Test-NetConnection -ComputerName <target-ip> -Port 5985
winrm enumerate winrm/config/Listener
```

### Q2: PowerShell 脚本执行被拒绝

```powershell
Get-ExecutionPolicy -List
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
```

### Q3: 扫描无结果（0 个更新）

- **离线环境**: 检查 WSUS 注册表配置 → WSUS 服务器上是否已审批更新 → wuauserv 服务是否运行
- **在线环境**: 检查目标机是否能访问 `*.windowsupdate.com` → wuauserv 服务是否运行
- 手动触发: `wuauclt /detectnow`

### Q4: 扫描成功但前端显示 FAILED

旧版并发 bug 已修复（`AuditService` 增加重试）。如仍出现，检查 `jao_audit_log` 表是否使用了 MariaDB system versioning，确认新版 `oplus-jao-pub` 已部署。

### Q5: scanMode=wsus 报错 "no WSUS configuration found"

先通过 `POST /api/win-patch/wsus-config` 添加 WSUS 配置，或改用 `scanMode=auto`。

### Q6: 补丁安装失败

- 检查磁盘空间（C 盘 >= 2GB）
- 离线环境检查 WSUS 上该 KB 是否已审批
- 查看 `C:\Windows\WindowsUpdate.log` 或 `Get-WindowsUpdateLog`

### Q7: 回滚失败

- 部分更新不支持 WUA 卸载（`IsUninstallable = false`），系统会自动降级到 DISM 方式
- 某些安全更新设计为不可卸载

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-04-14 | 初版: WSUS 离线补丁管理 |
| 2026-04-14 | 增强: 类别过滤、自动重扫、补丁明细筛选 |
| 2026-04-14 | **统一重构**: 新增 `scanMode` 支持在线/离线/自动三种模式；废弃旧版 `oplus-vap-windows` 模块（含 4 张数据库表、34 个 Java 文件、整套 Ansible Playbook）；提供完整的前端调用顺序、清理 SQL、部署检查清单 |
