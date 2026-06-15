# Windows 补丁管理后端设计方案

> 版本：v1.0 生产落地基线  
> 日期：2026-05-29  
> 范围：后端架构、数据模型、任务编排、Windows 更新源、离线 WSUS、扫描安装执行、审计与运维。本文不展开前端页面设计。

## 1. 方案结论

Windows 补丁管理不建议照搬 Linux 的“包仓库 + 包名版本”模型。生产级 Windows 补丁管理应采用：

```text
MSRC/WSUS 元数据同步 + WSUS/Windows Update 更新源 + 目标机本地 WUA 扫描安装 + 平台任务编排与审计
```

核心原则：

1. **WSUS 是离线/隔离网更新源主通道**，负责同步、缓存、审批和分发微软更新内容。
2. **WUA 是主机适用性和安装结果的最终事实源**，每台主机缺什么、装没装上、是否需要重启，以 Windows Update Agent 的扫描和安装结果为准。
3. **平台后端负责治理和编排**，包括更新源配置、扫描任务、安装任务、重启策略、结果回收、CVE/KB 关联、合规报表和审计。
4. **`wsusscn2.cab` 只能作为离线扫描补充**，它不包含补丁本体，不能替代 WSUS 作为离线安装源。
5. **远程执行应落在目标机本地进程中**，不要依赖从管理端远程 COM 调用 WUA/WUSA 直接安装。推荐通过 JAO/WinRM/Agent 下发 PowerShell，在目标机本地调用 WUA API。
6. **后端实现语言按 Java 设计**，Java 服务负责领域建模、任务状态机、持久化、调度和回调处理；WUA/WSUS 本地能力通过 PowerShell/Agent/JAO 适配层执行并回传结构化 JSON。

本文称为“v1.0 生产落地基线”，不是永远不变的终极方案。原因是微软更新体系持续演进，WSUS 已进入不再新增功能但仍受支持的状态，Windows Update for Business、Azure Update Manager、Autopatch、checkpoint cumulative update 等机制也在变化。当前方案的目标是：在企业内网、离线网、金融/政企生产环境中可落地、可审计、可扩展。

### 1.1 WSUS deprecated 的准确含义

微软文档中的 WSUS deprecated 不是“立即下线”，也不是“当前不能用于生产”。准确含义是：

| 状态 | 含义 | 对本方案的影响 |
|---|---|---|
| Deprecated / no longer actively developed | 不再主动开发新功能，未来可能在某个版本移除。 | 不能把产品能力和 WSUS 强耦合到不可替换，但可以继续使用现有能力。 |
| Supported for production deployments | 当前仍支持生产部署。 | 离线/内网环境仍可把 WSUS 作为主更新源。 |
| Receives security and quality updates per lifecycle | 按 Windows Server 生命周期继续获得安全和质量更新。 | WSUS 服务器自身也必须纳入补丁和加固治理。 |
| Removed | 从系统中移除。 | 当前不是这个状态。 |

因此，本方案的结论不是“放弃 WSUS”，而是：

```text
近期：WSUS 仍是离线/隔离网最现实的微软原生更新源。
中期：平台后端必须抽象 Update Source，避免被 WSUS 生命周期锁死。
长期：如果微软推出新的本地/混合更新源，只新增适配器，不推翻任务、扫描、CVE/KB、主机状态模型。
```

### 1.2 微软替代路线判断

微软当前已经提供多种云化更新管理能力，但它们并不是 WSUS 离线能力的一对一替代。

| 方案 | 定位 | 是否替代离线 WSUS |
|---|---|---|
| Intune + Windows Update for Business | 云端策略、更新环、延期、截止时间、体验控制。 | 否。主要面向云管理终端，需要访问 Microsoft 更新服务。 |
| Windows Autopatch | 基于 Intune/Graph 的托管式分阶段更新、质量更新、功能更新、驱动/固件控制。 | 否。适合云管终端，不解决隔离网补丁内容分发。 |
| Azure Update Manager | 服务器/混合云更新评估和安装编排。 | 否。它尊重机器本地更新源，Windows 机器仍可使用 WSUS。 |
| Configuration Manager | 企业端点管理和软件更新管理。 | 不是完全替代。软件更新点仍依赖 WSUS 组件。 |
| WSUS disconnected network | 离线元数据和内容导入、内网分发。 | 是当前离线微软原生主方案。 |

所以后端设计必须保留：

```text
WSUS_OFFLINE / WSUS_ONLINE / DIRECT_WUA / OFFLINE_CAB_SCAN / MANUAL_MSU_CAB / FUTURE_CONNECTOR
```

其中 `FUTURE_CONNECTOR` 用于后续接入 Azure Update Manager、Intune、Autopatch、Graph 或微软未来发布的新更新源能力。

## 2. 官方依据与设计影响

| 官方事实 | 对方案的影响 |
|---|---|
| WSUS 可管理和分发 Microsoft Update 发布的更新；WSUS 已 deprecated，不再新增功能，但仍支持生产部署并继续获得安全和质量更新。 | WSUS 适合作为离线/内网更新源，不应作为产品唯一抽象边界。平台仍需以 WUA 结果建模。 |
| 断网 WSUS 通过 `wsusutil.exe export/import` 同步元数据，并复制 `WSUSContent` 更新文件。 | 离线方案必须管理“元数据 + 内容文件 + 导入批次 + 校验”，只导元数据不可安装。 |
| WUA API 支持搜索、下载、安装、卸载更新；安装结果包含 `ResultCode`、`HResult`、`RebootRequired`。 | 扫描/安装/重启判断应通过目标机本地 WUA API 回收结构化结果。 |
| `wsusscn2.cab` 可用于无 Windows Update/WSUS 连接的安全更新离线扫描，但不包含安全更新本体。 | 可做“离线合规评估模式”，不能做安装源。 |
| Azure Update Manager 尊重机器本地更新源配置，Windows 侧仍使用 WUA/Windows Update client。 | 平台应尊重 GPO/注册表/WSUS 配置，而不是绕过主机更新源强行安装。 |
| WUSA/WUA 通过 WinRM 远程安装存在安全限制，安装 MSU/WUA 远程调用并非通用受支持路径。 | 后端执行器要在目标机本地执行脚本或 Agent 动作，不能简单从服务端远程 COM 安装。 |

参考资料：

- WSUS overview: https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/get-started/windows-server-update-services-wsus
- Windows Server deprecated features: https://learn.microsoft.com/en-us/windows-server/get-started/removed-deprecated-features-windows-server-2019
- WSUS disconnected export/import: https://learn.microsoft.com/it-it/security-updates/windowsupdateservices/18132358
- ConfigMgr disconnected software update point: https://learn.microsoft.com/en-us/intune/configmgr/sum/get-started/synchronize-software-updates-disconnected
- WUA API overview: https://learn.microsoft.com/en-us/windows/win32/api/_wua/
- WUA search/download/install: https://learn.microsoft.com/en-us/windows/win32/wua_sdk/searching--downloading--and-installing-updates
- WUA offline scan: https://learn.microsoft.com/en-us/windows/win32/wua_sdk/using-wua-to-scan-for-updates-offline
- Azure Update Manager workflow: https://learn.microsoft.com/en-us/azure/automation/update-management/overview
- Azure Update Manager Windows Update settings: https://learn.microsoft.com/en-us/azure/update-manager/configure-wu-agent
- Intune Windows update management: https://learn.microsoft.com/en-sg/intune/device-updates/windows/
- Windows Autopatch overview: https://learn.microsoft.com/en-us/windows/deployment/windows-autopatch/overview/windows-autopatch-overview
- MSRC Security Updates API: https://github.com/microsoft/MSRC-Microsoft-Security-Updates-API
- WUSA remote deployment limitation: https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/windows-update-standalone-installer-returns-error

## 3. 后端总体架构

```text
┌──────────────────────────────────────────────────────────────────┐
│ OPSmind / VAP 后端                                                │
│                                                                  │
│  ┌────────────────────┐   ┌────────────────────┐                 │
│  │ WindowsCatalogSvc  │   │ WindowsSourceSvc   │                 │
│  │ MSRC/WSUS 元数据    │   │ WSUS/直连/离线源配置 │                 │
│  └─────────┬──────────┘   └─────────┬──────────┘                 │
│            │                        │                            │
│  ┌─────────▼────────────────────────▼──────────┐                 │
│  │ WindowsAssessmentSvc                         │                 │
│  │ 扫描任务、适用性判定、主机补丁状态入库         │                 │
│  └─────────┬────────────────────────┬──────────┘                 │
│            │                        │                            │
│  ┌─────────▼──────────┐   ┌─────────▼──────────┐                 │
│  │ WindowsPatchTaskSvc │   │ ComplianceReportSvc │                 │
│  │ 安装/卸载/重启编排  │   │ CVE/KB/主机报表      │                 │
│  └─────────┬──────────┘   └────────────────────┘                 │
│            │                                                     │
│  ┌─────────▼──────────┐                                          │
│  │ Execution Adapter   │  JAO / WinRM / Agent                     │
│  └─────────┬──────────┘                                          │
└────────────┼─────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────────┐
│ Windows 主机                                                     │
│ PowerShell 本地进程调用 WUA COM API：Search / Download / Install │
│ 更新源由本机 GPO/注册表决定：WSUS / Microsoft Update / 离线 CAB    │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 服务划分

| 服务 | 职责 |
|---|---|
| `WindowsUpdateSourceService` | 管理更新源配置、WSUS 服务端信息、离线导入批次、GPO/注册表校验、源连通性检测。 |
| `WindowsPatchCatalogService` | 同步 MSRC 安全公告、WSUS 更新元数据，维护 KB、UpdateID、Revision、CVE、产品、分类、严重级别。 |
| `WindowsAssessmentService` | 创建扫描任务，调用执行器在目标机本地 WUA 扫描，解析结果，维护主机当前补丁状态。 |
| `WindowsPatchTaskService` | 创建安装/卸载任务，维护状态机，编排预检查、下载、安装、重启、复扫、审计。 |
| `WindowsPatchExecutor` | 封装 PowerShell/WUA 脚本模板，通过 JAO/WinRM/Agent 在目标机本地执行。 |
| `WindowsComplianceReportService` | 提供主机、KB、CVE、业务系统、组织维度的合规统计与导出。 |
| `WindowsAuditService` | 记录操作者、任务快照、脚本内容、主机结果、错误码、重启确认、离线导入证据。 |

### 3.2 与现有 Linux 后端能力的关系

可复用：

- 任务主流程：创建任务、预检查、执行、重启、校验、审计日志。
- 主机资产表：`acm_ci`。
- 操作日志、流程日志、审批/作业编排能力。
- CVE 统一视图和紧急程度计算框架。

不能直接复用：

- Linux 的 `package_name + version + arch` 作为补丁唯一判断。
- YUM 仓库比对逻辑。
- RPM 回滚模型。

Windows 新增核心唯一标识：

```text
update_id + revision_number + kb_id + product + architecture + source_id
```

其中 `update_id + revision_number` 是 WUA/WSUS 侧更可靠的更新身份，`kb_id` 只适合展示和粗筛。

## 4. 更新源模式设计

### 4.1 更新源类型

| 类型 | 说明 | 是否推荐生产 | 适用场景 |
|---|---|---:|---|
| `WSUS_OFFLINE` | 离线/隔离网 WSUS，通过外网 WSUS 导出再导入。 | 是 | 金融、政企、内外网隔离生产环境。 |
| `WSUS_ONLINE` | 内网 WSUS 可直接与 Microsoft Update 同步。 | 是 | 常规企业内网。 |
| `DIRECT_WUA` | 主机直接访问 Windows Update/Microsoft Update。 | 否，作为补充 | 小规模、测试、非隔离环境。 |
| `OFFLINE_CAB_SCAN` | 使用 `wsusscn2.cab` 仅做离线安全更新扫描。 | 仅补充 | 极端隔离、临时合规评估。 |
| `MANUAL_MSU_CAB` | 手工导入 MSU/CAB 并用 DISM/WUSA 安装。 | 谨慎 | 断点修复、应急特例，不做主路径。 |
| `FUTURE_CONNECTOR` | 预留云管或新更新源连接器。 | 预留 | Azure Update Manager、Intune、Autopatch、Graph 或后续微软替代能力。 |

推荐默认策略：

```text
生产隔离环境：WSUS_OFFLINE
生产非隔离环境：WSUS_ONLINE
测试/开发：DIRECT_WUA 可选
只评估不安装：OFFLINE_CAB_SCAN 可选
应急单补丁：MANUAL_MSU_CAB 需审批
```

### 4.2 WSUS 离线同步流程

离线 WSUS 是本方案重点。

#### 4.2.1 外网 WSUS 准备

1. 部署一台可联网 WSUS，作为 `export server`。
2. 配置产品、分类、语言、是否启用 express installation files。
3. 同步 Microsoft Update。
4. 审批需要进入内网的补丁范围。
5. 确认下载完成，避免只同步元数据未下载内容。

#### 4.2.2 导出内容和元数据

在外网 WSUS：

```powershell
cd "C:\Program Files\Update Services\Tools"
.\wsusutil.exe export export.xml.gz export.log
```

同时复制：

```text
<WSUSInstallationDrive>\WSUS\WSUSContent\
```

注意：

- `wsusutil export` 导出的是 WSUS 数据库中的元数据。
- `WSUSContent` 是更新二进制内容。
- 两者缺一不可。
- 导出服务器和导入服务器的语言、express 文件等高级同步选项必须匹配。

#### 4.2.3 内网 WSUS 导入

在内网 WSUS：

1. 停止或避开正在运行的同步任务。
2. 将 `WSUSContent` 复制到内网 WSUS 内容目录。
3. 执行：

```powershell
cd "C:\Program Files\Update Services\Tools"
.\wsusutil.exe import export.xml.gz import.log
```

4. 导入完成后做校验：
   - 元数据导入成功。
   - 内容目录文件存在。
   - WSUS 控制台不显示大批量“需要下载”的待部署更新。
   - 目标主机可访问 WSUS HTTP/HTTPS 端口。
   - 目标主机 GPO 指向内网 WSUS。

#### 4.2.4 平台需要管理的离线导入批次

后端应提供 `wsus_sync_batch` 概念，记录：

- 外网导出时间。
- 导出服务器标识。
- 产品、分类、语言。
- `export.xml.gz` 文件名、大小、SHA256。
- `WSUSContent` 文件数量、总大小、清单 SHA256。
- 内网导入时间。
- 导入日志路径。
- 导入结果。
- 校验结果。
- 操作人。
- 审批单号或变更单号。

平台不一定亲自执行 `wsusutil`，但必须能记录、校验、追溯。

### 4.3 主机更新源校验

扫描和安装前必须检查主机当前更新源。

建议目标机本地脚本读取：

```text
HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate
HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Services
```

关键字段：

| 字段 | 说明 |
|---|---|
| `WUServer` | WSUS 服务地址。 |
| `WUStatusServer` | 状态上报 WSUS 地址。 |
| `UseWUServer` | 是否使用内网 WSUS。 |
| `DoNotConnectToWindowsUpdateInternetLocations` | 是否禁止连接公网 Windows Update。 |
| `TargetGroup` | WSUS 目标组。 |
| `AUOptions` | 自动更新策略。 |

校验规则：

- `WSUS_OFFLINE` 模式下，`UseWUServer=1` 且 `WUServer` 必须匹配平台配置。
- 隔离网应启用不连接公网 Windows Update 的策略。
- 主机无法访问 WSUS 时，扫描状态标记为 `SOURCE_UNREACHABLE`。
- 主机更新源不匹配时，任务应进入 `PRECHECK_FAILED`，不能继续安装。

## 5. 补丁目录与 CVE 目录设计

### 5.1 数据来源

| 来源 | 内容 | 用途 |
|---|---|---|
| MSRC Security Update Guide API | CVE、KB、产品、严重级别、发布日期、安全公告。 | 安全视角、CVE/KB 映射、风险报表。 |
| WSUS 元数据 | UpdateID、Revision、分类、产品、审批、下载状态、可部署状态。 | 更新源视角、离线可安装性判断。 |
| WUA 主机扫描结果 | 每台主机适用、缺失、已安装、隐藏、需要重启、错误码。 | 主机事实源。 |
| 资产 CMDB `acm_ci` | 主机、IP、业务系统、部门、环境、区域。 | 范围圈选、紧急度、报表。 |

### 5.2 目录同步策略

#### MSRC 同步

频率：

- 联网环境：每日一次，Patch Tuesday 后增加一次。
- 离线环境：由外网区下载 MSRC 数据包，内网导入。

接口：

- `/updates` 获取安全更新摘要。
- `/cvrf/{id}` 获取指定月份 CVRF 详情。

入库字段：

- CVE ID。
- KB ID。
- 产品。
- 产品版本。
- 影响平台。
- 严重级别。
- CVSS。
- Exploitability Index。
- 发布/修订日期。
- Supersedence 信息。

#### WSUS 元数据同步

方式：

- 方案 A：后端通过 WSUS Administration API 读取。
- 方案 B：在 WSUS 服务器本地执行 PowerShell，导出 JSON 后回传平台。
- 方案 C：只依赖目标机 WUA 结果，WSUS 元数据作为后续增强。

推荐：

```text
第一期使用方案 B，最稳、权限边界清晰；
第二期补充 WSUS API 直连读取。
```

同步字段：

- UpdateID。
- RevisionNumber。
- KBArticleIDs。
- Title。
- Description。
- Classification。
- Product。
- ArrivalDate。
- CreationDate。
- IsApproved。
- IsDeclined。
- HasLicenseAgreement。
- IsDownloaded。
- Superseded/Superseding。
- UpdateType。

### 5.3 KB、UpdateID、CVE 的关系

不能假设：

```text
1 KB = 1 CVE = 1 更新 = 1 主机状态
```

实际关系：

- 一个 KB 可修复多个 CVE。
- 一个 CVE 可能关联多个 KB。
- 一个 KB 在不同产品、版本、架构下可能对应多个 UpdateID/Revision。
- 累积更新可能替代旧更新。
- 某主机是否需要某更新由 WUA applicability 判定，不能只靠 KB 列表静态推断。

因此主状态表必须是：

```text
host_id + update_id + revision_number + source_id
```

KB 和 CVE 是查询维度，不是唯一键。

## 6. 数据模型设计

以下为建议核心表。字段类型可按现有后端数据库规范调整。

### 6.1 `vap2_win_update_source`

更新源配置表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `source_code` | 更新源编码。 |
| `source_name` | 更新源名称。 |
| `source_type` | `WSUS_OFFLINE` / `WSUS_ONLINE` / `DIRECT_WUA` / `OFFLINE_CAB_SCAN` / `MANUAL_MSU_CAB`。 |
| `wsus_url` | WSUS 地址，如 `http://wsus01:8530`。 |
| `ssl_enabled` | 是否 HTTPS。 |
| `environment` | prod/test/dr。 |
| `network_zone` | 网络区域。 |
| `products` | 产品范围 JSON。 |
| `classifications` | 分类范围 JSON。 |
| `languages` | 语言 JSON。 |
| `status` | `ACTIVE` / `DISABLED` / `ERROR`。 |
| `last_sync_time` | 最近同步时间。 |
| `last_verify_time` | 最近校验时间。 |
| `remark` | 备注。 |
| `created_by` / `created_at` | 创建信息。 |
| `updated_by` / `updated_at` | 更新信息。 |

### 6.2 `vap2_win_wsus_sync_batch`

WSUS 离线导入批次。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `source_id` | 更新源 ID。 |
| `batch_no` | 批次号。 |
| `export_server` | 外网导出 WSUS。 |
| `export_time` | 外网导出时间。 |
| `import_server` | 内网导入 WSUS。 |
| `import_time` | 内网导入时间。 |
| `metadata_file` | `export.xml.gz` 文件名。 |
| `metadata_sha256` | 元数据文件 SHA256。 |
| `content_manifest_file` | 内容清单文件。 |
| `content_total_files` | 内容文件数量。 |
| `content_total_size` | 内容总大小。 |
| `products` | 产品范围。 |
| `classifications` | 分类范围。 |
| `languages` | 语言范围。 |
| `express_enabled` | 是否启用 express 文件。 |
| `status` | `PENDING` / `IMPORTED` / `VERIFIED` / `FAILED`。 |
| `verify_result` | 校验结果 JSON。 |
| `log_path` | 导出/导入日志归档路径。 |
| `change_no` | 变更单号。 |
| `operator` | 操作人。 |

### 6.3 `vap2_win_update_catalog`

Windows 更新目录表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `source_id` | 更新源 ID。 |
| `update_id` | WUA/WSUS UpdateID。 |
| `revision_number` | RevisionNumber。 |
| `kb_ids` | KB 列表 JSON 或逗号分隔。 |
| `title` | 标题。 |
| `description` | 描述。 |
| `classification` | Security Updates / Critical Updates / Update Rollups 等。 |
| `product` | 产品。 |
| `product_family` | 产品族。 |
| `architecture` | x64/arm64 等。 |
| `severity` | Critical/Important/Moderate/Low/Unspecified。 |
| `msrc_severity` | MSRC 严重级别。 |
| `publish_date` | 发布日期。 |
| `arrival_date` | WSUS 到达日期。 |
| `is_approved` | WSUS 是否审批。 |
| `is_declined` | 是否拒绝。 |
| `is_downloaded` | WSUS 内容是否已下载。 |
| `is_superseded` | 是否被替代。 |
| `superseded_by` | 替代更新 JSON。 |
| `eula_required` | 是否需要许可协议。 |
| `raw_json` | 原始元数据。 |
| `sync_batch_id` | 同步批次。 |

唯一索引：

```text
uk_win_update_catalog(source_id, update_id, revision_number)
```

### 6.4 `vap2_win_update_cve`

KB/Update/CVE 关联表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `update_catalog_id` | 更新目录 ID，可为空。 |
| `kb_id` | KB 编号。 |
| `cve_id` | CVE 编号。 |
| `product` | 产品。 |
| `severity` | 严重级别。 |
| `cvss_score` | CVSS 分数。 |
| `exploitability` | 可利用性。 |
| `msrc_release_date` | MSRC 发布日期。 |
| `msrc_revision_date` | MSRC 修订日期。 |

### 6.5 `vap2_win_host_scan`

主机扫描批次表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `scan_no` | 扫描批次号。 |
| `source_id` | 更新源 ID。 |
| `scan_type` | `ONLINE_WUA` / `WSUS_WUA` / `OFFLINE_CAB`。 |
| `trigger_type` | manual/scheduled/post_install。 |
| `host_count` | 主机数。 |
| `status` | `PENDING` / `RUNNING` / `COMPLETED` / `PARTIAL_FAILED` / `FAILED`。 |
| `started_at` / `finished_at` | 开始/结束时间。 |
| `operator` | 操作人。 |
| `jao_run_id` | 执行作业 ID。 |
| `summary_json` | 扫描汇总。 |

### 6.6 `vap2_win_host_update_status`

主机当前补丁状态表，核心事实表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `host_id` | 资产 ID。 |
| `host_key` | IP/主机标识冗余。 |
| `source_id` | 更新源 ID。 |
| `scan_id` | 最近扫描 ID。 |
| `update_id` | UpdateID。 |
| `revision_number` | RevisionNumber。 |
| `kb_ids` | KB 列表。 |
| `title` | 更新标题。 |
| `classification` | 分类。 |
| `severity` | 严重级别。 |
| `cve_ids` | CVE 列表。 |
| `status` | `MISSING` / `INSTALLED` / `DOWNLOADED` / `HIDDEN` / `NOT_APPLICABLE` / `FAILED` / `UNKNOWN`。 |
| `is_mandatory` | 是否强制。 |
| `is_downloaded` | 目标机是否已下载。 |
| `reboot_required` | 是否需要重启。 |
| `install_result_code` | WUA ResultCode。 |
| `install_hresult` | HResult。 |
| `last_scan_time` | 最近扫描时间。 |
| `last_install_time` | 最近安装时间。 |
| `last_error` | 最近错误。 |
| `raw_json` | WUA 原始结果。 |

唯一索引：

```text
uk_win_host_update(host_id, source_id, update_id, revision_number)
```

### 6.7 `vap2_win_patch_task`

Windows 补丁任务主表。也可复用现有 `vap2_patch_install_task`，通过 `os_type='windows'` 区分。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `task_no` | 任务编号。 |
| `task_type` | `INSTALL` / `UNINSTALL` / `SCAN` / `VULN_FIX`。 |
| `os_type` | 固定 `windows`。 |
| `source_id` | 更新源 ID。 |
| `status` | 状态机状态。 |
| `host_count` | 主机数。 |
| `update_count` | 更新数。 |
| `pre_check_script` | 预检查脚本。 |
| `validate_script` | 校验脚本。 |
| `restart_policy` | `NEVER` / `IF_REQUIRED` / `FORCE` / `MANUAL_CONFIRM`。 |
| `maintenance_window` | 维护窗口。 |
| `jao_run_id` | 主执行作业 ID。 |
| `error_message` | 错误信息。 |
| `created_by` / `created_at` | 创建信息。 |
| `updated_by` / `updated_at` | 更新信息。 |

### 6.8 `vap2_win_patch_task_item`

任务明细表。

| 字段 | 说明 |
|---|---|
| `id` | 主键。 |
| `task_id` | 任务 ID。 |
| `host_id` | 主机 ID。 |
| `update_status_id` | 主机补丁状态 ID。 |
| `update_id` | UpdateID。 |
| `revision_number` | RevisionNumber。 |
| `kb_ids` | KB 列表。 |
| `action` | `INSTALL` / `UNINSTALL` / `SKIP`。 |
| `status` | `PENDING` / `RUNNING` / `SUCCESS` / `FAILED` / `SKIPPED`。 |
| `download_result_code` | 下载结果。 |
| `install_result_code` | 安装结果。 |
| `hresult` | HResult。 |
| `reboot_required` | 是否需要重启。 |
| `started_at` / `finished_at` | 执行时间。 |
| `stdout_path` / `stderr_path` | 输出日志。 |
| `raw_json` | 原始结果。 |

## 7. 扫描设计

### 7.1 扫描入口

后端 API：

```http
POST /vap/api/vap/v2/windows/patch/scan
```

请求：

```json
{
  "hostIds": ["host-1", "host-2"],
  "sourceId": "wsus-offline-prod",
  "scanType": "WSUS_WUA",
  "forceRefresh": true
}
```

响应：

```json
{
  "scanId": "scan-20260529-001",
  "status": "PENDING"
}
```

### 7.2 目标机本地扫描脚本

扫描脚本在目标 Windows 主机本地执行，调用 WUA：

```powershell
$session = New-Object -ComObject Microsoft.Update.Session
$searcher = $session.CreateUpdateSearcher()
$criteria = "IsInstalled=0 and Type='Software' and IsHidden=0"
$result = $searcher.Search($criteria)
```

回收字段：

- `Update.Identity.UpdateID`
- `Update.Identity.RevisionNumber`
- `KBArticleIDs`
- `Title`
- `Description`
- `MsrcSeverity`
- `Categories`
- `IsDownloaded`
- `IsMandatory`
- `InstallationBehavior.RebootBehavior`
- `EulaAccepted`
- `LastDeploymentChangeTime`

同时执行已安装查询：

```powershell
$history = $searcher.QueryHistory(0, $searcher.GetTotalHistoryCount())
```

或结合：

```powershell
Get-HotFix
```

注意：`Get-HotFix` 不能覆盖所有更新类型，只能作为辅助展示，不作为唯一事实源。

### 7.3 离线 CAB 扫描

`OFFLINE_CAB_SCAN` 模式：

1. 平台上传或登记最新 `wsusscn2.cab`。
2. 通过 JAO/Agent 分发到目标主机本地。
3. 目标机本地调用 `IUpdateServiceManager::AddScanPackageService` 注册离线扫描包。
4. WUA 使用该服务执行搜索。
5. 回收缺失安全更新结果。

限制：

- `wsusscn2.cab` 不含补丁本体。
- 只适合安全更新合规扫描。
- 不应作为安装源。
- CAB 要校验微软签名和 SHA256。

### 7.4 扫描状态归一

| WUA/脚本结果 | 平台状态 |
|---|---|
| 搜索到缺失更新 | `MISSING` |
| 已下载未安装 | `DOWNLOADED` |
| 已安装历史命中 | `INSTALLED` |
| 主机不适用 | `NOT_APPLICABLE` |
| 更新被隐藏 | `HIDDEN` |
| WUA 搜索失败 | `FAILED` |
| 更新源不可达 | `SOURCE_UNREACHABLE` |
| 更新源配置不匹配 | `SOURCE_MISMATCH` |

## 8. 安装任务设计

### 8.1 安装任务入口

```http
POST /vap/api/vap/v2/windows/patch/task/create
```

请求：

```json
{
  "sourceId": "wsus-offline-prod",
  "hostIds": ["host-1", "host-2"],
  "updateStatusIds": ["status-1", "status-2"],
  "restartPolicy": "MANUAL_CONFIRM",
  "maintenanceWindow": {
    "start": "2026-05-30T00:00:00+08:00",
    "end": "2026-05-30T04:00:00+08:00"
  },
  "preCheckScript": "...",
  "validateScript": "..."
}
```

创建时后端要做：

1. 校验主机均为 Windows。
2. 校验主机最近扫描未过期。
3. 校验 `updateStatusIds` 均为 `MISSING` 或 `DOWNLOADED`。
4. 校验补丁对应 WSUS 已审批、已下载。
5. 校验目标机更新源匹配 `sourceId`。
6. 合并同主机多更新，形成主机维度执行计划。
7. 快照任务明细，避免后续扫描变化影响任务内容。

### 8.2 安装状态机

任务主状态：

```text
CREATED
PRE_CHECK_RUNNING
PRE_CHECK_DONE
PRE_CHECK_FAILED
DOWNLOAD_RUNNING
DOWNLOAD_DONE
DOWNLOAD_FAILED
INSTALL_RUNNING
INSTALL_DONE
INSTALL_PARTIAL_FAILED
INSTALL_FAILED
RESTART_PENDING
RESTART_CONFIRMED
RESTART_RUNNING
RESTART_DONE
RESTART_FAILED
VALIDATE_RUNNING
VALIDATE_DONE
VALIDATE_FAILED
RESCAN_RUNNING
COMPLETED
FAILED
CANCELLED
```

主机明细状态：

```text
PENDING
PRE_CHECK_SUCCESS / PRE_CHECK_FAILED
DOWNLOAD_SUCCESS / DOWNLOAD_FAILED
INSTALL_SUCCESS / INSTALL_FAILED / INSTALL_SKIPPED
REBOOT_REQUIRED / REBOOT_NOT_REQUIRED
RESTART_SUCCESS / RESTART_FAILED / RESTART_SKIPPED
VALIDATE_SUCCESS / VALIDATE_FAILED
RESCAN_SUCCESS / RESCAN_FAILED
```

### 8.3 目标机本地安装脚本

安装脚本在目标机本地执行：

1. 创建 `Microsoft.Update.Session`。
2. Search 缺失更新。
3. 按 `UpdateID + RevisionNumber` 从搜索结果筛选任务指定更新。
4. 接受 EULA。
5. 创建下载集合。
6. `IUpdateDownloader.Download()`。
7. 创建安装集合。
8. `IUpdateInstaller.Install()`。
9. 输出每个更新的安装结果。

伪代码：

```powershell
$session = New-Object -ComObject Microsoft.Update.Session
$searcher = $session.CreateUpdateSearcher()
$result = $searcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")

$updatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl

foreach ($update in $result.Updates) {
  $id = $update.Identity.UpdateID
  $rev = $update.Identity.RevisionNumber

  if ($plannedUpdates.ContainsKey("$id::$rev")) {
    if (-not $update.EulaAccepted) {
      $update.AcceptEula()
    }
    [void]$updatesToInstall.Add($update)
  }
}

$downloader = $session.CreateUpdateDownloader()
$downloader.Updates = $updatesToInstall
$downloadResult = $downloader.Download()

$installer = $session.CreateUpdateInstaller()
$installer.Updates = $updatesToInstall
$installResult = $installer.Install()

$installResult.RebootRequired
$installResult.ResultCode
$installResult.HResult
```

输出必须是结构化 JSON，避免只解析控制台文本。

### 8.4 并发控制

建议默认：

- 单任务总主机并发：20-50，可配置。
- 单主机同一时间只能有一个 Windows 补丁任务。
- 单主机一次安装更新数建议限制在 50 以下。
- 对老版本 Windows 或长期未补机器，建议先分批安装 servicing stack / cumulative update。

并发锁：

```text
lock: windows_patch_host:{host_id}
ttl: 6h
```

### 8.5 重启策略

Windows 重启判断以 WUA 安装结果为准：

- `IInstallationResult.RebootRequired`
- 单个 `IUpdateInstallationResult.RebootRequired`
- 注册表辅助判断：
  - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending`
  - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`
  - `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations`

策略：

| 策略 | 行为 |
|---|---|
| `NEVER` | 不自动重启，只标记 `RESTART_PENDING`。 |
| `IF_REQUIRED` | WUA 判断需要重启时，在维护窗口内重启。 |
| `FORCE` | 安装后强制重启。 |
| `MANUAL_CONFIRM` | 后端等待人工确认后再执行重启。 |

生产默认：

```text
MANUAL_CONFIRM
```

### 8.6 安装后复扫

安装完成并处理重启后，应自动触发复扫：

1. WUA 重新扫描缺失更新。
2. 更新 `vap2_win_host_update_status`。
3. 任务明细中原更新仍缺失则标记 `VALIDATE_FAILED` 或 `RESCAN_STILL_MISSING`。
4. 对 supersedence 导致的状态变化，记录为 `SUPERSEDED_AFTER_INSTALL`。

## 9. 卸载/回滚设计

Windows 回滚不能承诺与 Linux 一致。

### 9.1 支持边界

可尝试：

- WUA 支持卸载的更新：`IUpdateInstaller.Uninstall()` 或 `BeginUninstall()`。
- 部分 MSU/CAB：`wusa /uninstall /kb:<kb> /quiet /norestart`。
- CAB 包：`dism /online /remove-package`，需要准确 package identity。

不可保证：

- 累积更新总是可卸载。
- Servicing Stack Update 可卸载。
- Defender 定义更新可按 KB 回滚。
- 功能更新可按普通补丁回滚。

### 9.2 产品语义

建议后端和产品文案使用：

```text
卸载尝试 / 回退能力评估
```

不要承诺：

```text
一键回滚所有 Windows 补丁
```

### 9.3 回滚前评估

创建卸载任务前：

1. 查询 WUA/更新历史。
2. 判断更新是否可卸载。
3. 查询 package identity。
4. 判断是否存在替代关系。
5. 判断是否需要业务停机窗口。
6. 强制要求审批。

## 10. API 设计

### 10.1 更新源

```http
GET    /vap/api/vap/v2/windows/update-sources
POST   /vap/api/vap/v2/windows/update-sources
PUT    /vap/api/vap/v2/windows/update-sources/{id}
DELETE /vap/api/vap/v2/windows/update-sources/{id}
POST   /vap/api/vap/v2/windows/update-sources/{id}/verify
```

### 10.2 WSUS 离线批次

```http
GET  /vap/api/vap/v2/windows/wsus-sync-batches
POST /vap/api/vap/v2/windows/wsus-sync-batches
GET  /vap/api/vap/v2/windows/wsus-sync-batches/{id}
POST /vap/api/vap/v2/windows/wsus-sync-batches/{id}/verify
POST /vap/api/vap/v2/windows/wsus-sync-batches/{id}/attach-log
```

### 10.3 目录

```http
POST /vap/api/vap/v2/windows/catalog/sync-msrc
POST /vap/api/vap/v2/windows/catalog/sync-wsus
GET  /vap/api/vap/v2/windows/catalog/updates
GET  /vap/api/vap/v2/windows/catalog/updates/{id}
GET  /vap/api/vap/v2/windows/catalog/cves
GET  /vap/api/vap/v2/windows/catalog/kb/{kbId}
```

### 10.4 扫描

```http
POST /vap/api/vap/v2/windows/patch/scan
GET  /vap/api/vap/v2/windows/patch/scans
GET  /vap/api/vap/v2/windows/patch/scans/{scanId}
GET  /vap/api/vap/v2/windows/hosts/{hostId}/updates
GET  /vap/api/vap/v2/windows/hosts/{hostId}/source-check
```

### 10.5 任务

```http
POST /vap/api/vap/v2/windows/patch/tasks
GET  /vap/api/vap/v2/windows/patch/tasks
GET  /vap/api/vap/v2/windows/patch/tasks/{taskId}
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/pre-check/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/download/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/install/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/restart/confirm
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/restart/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/validate/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/rescan/execute
POST /vap/api/vap/v2/windows/patch/tasks/{taskId}/cancel
```

### 10.6 报表

```http
GET  /vap/api/vap/v2/windows/compliance/overview
GET  /vap/api/vap/v2/windows/compliance/by-host
GET  /vap/api/vap/v2/windows/compliance/by-kb
GET  /vap/api/vap/v2/windows/compliance/by-cve
POST /vap/api/vap/v2/windows/compliance/export
```

## 11. 执行器设计

### 11.1 执行方式优先级

| 方式 | 推荐级别 | 说明 |
|---|---:|---|
| Agent 本地执行 | 高 | 最稳定，可做长任务、断点、日志、心跳。 |
| JAO 下发 PowerShell | 高 | 与现有系统贴合，适合作业编排。 |
| WinRM 远程执行 PowerShell | 中 | 可用，但要处理权限、CredSSP、网络、安全策略。 |
| 服务端远程 COM 调 WUA | 低 | 受 WUA 远程接口限制，不作为安装主路径。 |
| 直接远程 WUSA 安装 MSU | 低 | 微软文档明确存在远程部署限制，不作为主路径。 |

第一期建议：

```text
JAO 下发 PowerShell，在目标机本地调用 WUA。
```

### 11.2 脚本模板

后端维护版本化脚本模板：

| 模板 | 功能 |
|---|---|
| `win_patch_source_check.ps1` | 检查 GPO/注册表、WSUS 连通性、WUA 服务状态。 |
| `win_patch_scan.ps1` | WUA 扫描缺失更新。 |
| `win_patch_install.ps1` | 下载和安装指定 UpdateID/Revision。 |
| `win_patch_reboot_check.ps1` | 检查待重启状态。 |
| `win_patch_validate.ps1` | 安装后复扫和结果校验。 |
| `win_patch_uninstall_assess.ps1` | 卸载能力评估。 |
| `win_patch_uninstall.ps1` | 尝试卸载。 |

脚本输出规范：

```json
{
  "schemaVersion": "1.0",
  "host": "10.0.0.1",
  "action": "install",
  "source": {
    "type": "WSUS_OFFLINE",
    "wuServer": "http://wsus01:8530",
    "matched": true
  },
  "updates": [
    {
      "updateId": "...",
      "revisionNumber": 205,
      "kbIds": ["KB5035857"],
      "title": "...",
      "downloadResultCode": 2,
      "installResultCode": 2,
      "hresult": 0,
      "rebootRequired": true,
      "status": "SUCCESS"
    }
  ],
  "rebootRequired": true,
  "exitCode": 0,
  "error": null
}
```

## 12. 安全设计

### 12.1 权限

- 扫描权限和安装权限分离。
- 安装、卸载、强制重启必须审批。
- 离线 WSUS 批次导入登记必须记录操作人和变更单。
- PowerShell 脚本模板只能由后端受控生成，用户自定义脚本需审计和权限控制。

### 12.2 凭据

- WinRM/Agent 凭据进入凭据管理系统，不落普通业务表。
- 支持按主机组绑定执行账号。
- 凭据访问记录审计。

### 12.3 脚本安全

- 脚本模板版本化。
- 每次任务保存脚本快照和 SHA256。
- 禁止前端直接传任意安装命令。
- 用户自定义预检查/校验脚本限制最大长度、敏感命令审计。
- 可选启用 PowerShell Constrained Language Mode 或签名脚本。

### 12.4 离线介质安全

- `export.xml.gz`、内容清单、`wsusscn2.cab` 均记录 SHA256。
- `wsusscn2.cab` 校验微软签名。
- 离线介质导入要关联变更单。
- 导入日志归档。

## 13. 错误码与故障归类

后端不要只存“失败”，需要归类：

| 分类 | 示例 |
|---|---|
| `SOURCE_ERROR` | WSUS 不可达、源配置不匹配、未审批、内容未下载。 |
| `WUA_ERROR` | WUA 服务未运行、WUA 版本问题、搜索失败。 |
| `DOWNLOAD_ERROR` | 下载失败、BITS 异常、WSUS 内容缺失。 |
| `INSTALL_ERROR` | CBS/DISM 安装失败、HResult 非 0。 |
| `REBOOT_ERROR` | 重启命令失败、重启后未恢复连接。 |
| `VALIDATE_ERROR` | 复扫仍缺失、状态不一致。 |
| `PERMISSION_ERROR` | 执行账号无管理员权限、WinRM 策略不允许。 |
| `TIMEOUT` | 作业超时、主机离线。 |

WUA 结果字段：

- `ResultCode`
- `HResult`
- `RebootRequired`
- 每个 Update 的 `ResultCode/HResult`

需要存原始 JSON，便于后续补充错误码字典。

## 14. 报表与合规口径

### 14.1 主机合规

```text
合规主机 = 最近扫描成功 && 无 Critical/Important MISSING 更新 && 无超期重启
```

可配置：

- 只看安全更新。
- 是否包含 .NET、SQL Server、Office。
- 是否包含驱动。
- 扫描有效期，如 7 天。
- 重启宽限期，如 3 天。

### 14.2 CVE 合规

```text
CVE 未修复 = 主机关联 CVE 的任一有效修复更新仍为 MISSING
```

注意：

- CVE 与 KB/UpdateID 多对多。
- Supersedence 后，旧 KB 未安装不等于 CVE 未修复；如果替代更新已安装，应判定为已修复。
- 以 WUA 当前适用性和安装历史综合判断。

### 14.3 离线源合规

离线环境必须展示：

- 当前 WSUS 离线批次日期。
- 距上次外网同步天数。
- 产品/分类覆盖范围。
- 内容文件校验状态。
- 主机指向该 WSUS 的比例。
- WSUS 未下载/未审批更新数量。

## 15. 性能与容量

### 15.1 数据规模估算

假设：

- Windows 主机 10,000 台。
- 每台平均缺失/适用更新状态 100 条。
- 当前状态表约 1,000,000 行。
- 历史扫描保留 12 个月，按月归档。

建议：

- `vap2_win_host_update_status` 保留当前状态。
- 历史明细进入 `vap2_win_host_update_status_hist`，按月分区。
- `raw_json` 大字段可进入对象存储或压缩字段。

### 15.2 索引

核心索引：

```sql
CREATE INDEX idx_win_status_host ON vap2_win_host_update_status(host_id, status);
CREATE INDEX idx_win_status_kb ON vap2_win_host_update_status(kb_ids);
CREATE INDEX idx_win_status_update ON vap2_win_host_update_status(update_id, revision_number);
CREATE INDEX idx_win_status_cve ON vap2_win_host_update_status(cve_ids);
CREATE INDEX idx_win_status_scan ON vap2_win_host_update_status(scan_id);
CREATE INDEX idx_win_catalog_kb ON vap2_win_update_catalog(kb_ids);
CREATE INDEX idx_win_catalog_update ON vap2_win_update_catalog(update_id, revision_number);
```

若数据库不适合对 JSON/逗号字段建索引，应拆关联表：

- `vap2_win_host_update_kb`
- `vap2_win_host_update_cve`

## 16. 定时任务

| 任务 | 频率 | 说明 |
|---|---|---|
| MSRC 同步 | 每日 | 联网区同步，离线区导入。 |
| WSUS 元数据同步 | 每日/导入后 | 读取内网 WSUS 状态。 |
| 更新源校验 | 每日 | 检查 WSUS 可达、内容完整、配置一致。 |
| 主机周期扫描 | 每周或按策略 | 大规模分批扫描。 |
| 安装后复扫 | 任务完成后 | 自动触发。 |
| 待重启检查 | 每日 | 找出重启挂起主机。 |
| 历史归档 | 每月 | 扫描历史归档。 |

## 17. 测试策略

### 17.1 环境矩阵

至少覆盖：

- Windows Server 2012 R2。
- Windows Server 2016。
- Windows Server 2019。
- Windows Server 2022。
- Windows Server 2025。
- Windows 10。
- Windows 11。

更新源：

- WSUS_ONLINE。
- WSUS_OFFLINE。
- DIRECT_WUA。
- OFFLINE_CAB_SCAN。

网络：

- 正常。
- WSUS 不可达。
- 代理异常。
- 主机离线。
- WinRM 不通。

### 17.2 用例

1. 主机源配置匹配，扫描成功。
2. 主机源配置不匹配，预检查失败。
3. WSUS 元数据有但内容未下载，安装前拦截。
4. 多 KB 安装成功，需要重启。
5. 安装成功但复扫仍缺失，标记校验失败。
6. 安装部分成功，任务 `INSTALL_PARTIAL_FAILED`。
7. 离线 CAB 扫描成功，但不允许安装。
8. MSRC CVE 与 KB 多对多映射正确。
9. Supersedence 场景下旧 KB 未安装但替代更新已安装，CVE 判定已修复。
10. 卸载能力评估不可卸载，不创建卸载执行任务。

## 18. Java 后端实现建议

当前后端语言为 Java，因此实现上建议采用“Java 领域服务 + 执行适配器 + Windows 本地脚本”的分层方式。Java 后端不直接承载 WUA COM 调用，也不要求后端服务运行在 Windows；WUA/WSUS 相关本地能力通过目标机或 WSUS 服务器上的 PowerShell/Agent/JAO 执行，Java 只负责下发、状态机、解析、持久化和审计。

### 18.1 推荐包结构

若现有后端是 Spring Boot，可按如下结构组织；若使用其他 Java 框架，也建议保留同样的边界。

```text
com.opsmind.vap.windows.patch
  ├── controller
  │   ├── WindowsPatchTaskController
  │   ├── WindowsPatchScanController
  │   ├── WindowsUpdateSourceController
  │   └── WindowsComplianceController
  ├── application
  │   ├── WindowsPatchTaskAppService
  │   ├── WindowsAssessmentAppService
  │   ├── WindowsCatalogSyncAppService
  │   └── WindowsWsusBatchAppService
  ├── domain
  │   ├── model
  │   ├── enums
  │   ├── service
  │   └── state
  ├── infrastructure
  │   ├── persistence
  │   ├── jao
  │   ├── script
  │   ├── msrc
  │   ├── wsus
  │   └── lock
  └── scheduler
```

### 18.2 核心 Java 接口

建议把外部执行和领域服务解耦，避免任务逻辑散落在 Controller 或 Mapper 中。

```java
public interface WindowsPatchExecutor {
    ExecutionHandle submitScan(WindowsScanPlan plan);
    ExecutionHandle submitInstall(WindowsInstallPlan plan);
    ExecutionHandle submitRestart(WindowsRestartPlan plan);
    ExecutionHandle submitValidate(WindowsValidatePlan plan);
}

public interface WindowsPatchResultHandler {
    void handleScanResult(String scanId, HostExecutionResult result);
    void handleInstallResult(String taskId, HostExecutionResult result);
    void handleRestartResult(String taskId, HostExecutionResult result);
    void handleValidateResult(String taskId, HostExecutionResult result);
}

public interface WindowsUpdateSourceVerifier {
    SourceVerifyResult verifyHostSource(String sourceId, String hostId);
    SourceVerifyResult verifyWsusSource(String sourceId);
}

public interface WindowsCatalogProvider {
    List<WindowsUpdateCatalogItem> syncMsrc(LocalDate from, LocalDate to);
    List<WindowsUpdateCatalogItem> syncWsus(String sourceId);
}
```

### 18.3 状态机实现

任务状态不建议用字符串随意更新，应使用枚举和状态转移守卫。

```java
public enum WindowsPatchTaskStatus {
    CREATED,
    PRE_CHECK_RUNNING,
    PRE_CHECK_DONE,
    PRE_CHECK_FAILED,
    DOWNLOAD_RUNNING,
    DOWNLOAD_DONE,
    DOWNLOAD_FAILED,
    INSTALL_RUNNING,
    INSTALL_DONE,
    INSTALL_PARTIAL_FAILED,
    INSTALL_FAILED,
    RESTART_PENDING,
    RESTART_CONFIRMED,
    RESTART_RUNNING,
    RESTART_DONE,
    RESTART_FAILED,
    VALIDATE_RUNNING,
    VALIDATE_DONE,
    VALIDATE_FAILED,
    RESCAN_RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED
}
```

状态更新入口统一放在 `WindowsPatchTaskStateService`：

```java
public void transit(String taskId, WindowsPatchTaskStatus target, String reason) {
    WindowsPatchTask task = taskRepository.findByIdForUpdate(taskId);
    if (!transitionPolicy.canTransit(task.getStatus(), target)) {
        throw new IllegalStateException("Illegal task status transition");
    }
    taskRepository.updateStatus(taskId, target, reason);
    auditService.recordTaskTransition(taskId, task.getStatus(), target, reason);
}
```

建议：

- 主任务状态和主机明细状态分开维护。
- 所有回调处理必须幂等。
- 任务明细更新使用乐观锁字段 `version`，或使用数据库行锁。
- 同一主机同一时间只允许一个 Windows 补丁安装任务。

### 18.4 持久化建议

如果现有后端使用 MyBatis/MyBatis-Plus，建议继续沿用。Windows 补丁数据查询条件复杂，MyBatis 对动态 SQL、分页和批量更新更直接。如果现有后端使用 JPA，也可以保留 JPA，但复杂报表建议使用专用 Mapper/QueryRepository。

事务边界：

| 场景 | 事务建议 |
|---|---|
| 创建任务 | 一个事务内写任务主表、任务明细、任务快照、审计日志。 |
| 扫描结果入库 | 按主机分批事务，避免单批过大。 |
| 安装结果回调 | 每个主机结果独立事务，失败不影响其他主机。 |
| 任务状态聚合 | 明细更新后异步或同事务计算主任务状态。 |
| 报表统计 | 不放在长事务中，必要时使用预聚合表。 |

批量写入建议：

- `vap2_win_host_update_status` 使用 upsert。
- 按 `host_id` 分批，每批 200-1000 行。
- 保留当前状态表，历史结果归档到历史表。
- 大 JSON 原始结果可压缩或落对象存储，表中保存路径和摘要。

### 18.5 异步执行与回调

Windows 补丁安装是长任务，不应在 HTTP 请求线程中执行。

推荐模式：

```text
Controller 创建任务
  -> AppService 持久化任务
  -> Executor 提交 JAO/Agent 作业
  -> 作业回调或轮询结果
  -> ResultHandler 幂等更新主机明细
  -> Aggregator 聚合主任务状态
```

实现建议：

- 若现有系统已有 JAO 作业编排，第一期优先使用 JAO。
- Java 后端保存 `jaoRunId`、`hostRunId`、脚本模板版本、脚本 SHA256。
- 回调接口需要验签或鉴权。
- 如果 JAO 只支持轮询，则使用调度任务按 runId 拉取结果。
- `@Async` 或 `ScheduledExecutorService` 只适合轻量异步，不建议承载大规模主机执行本身。

### 18.6 脚本模板与 JSON 解析

Java 后端维护 PowerShell 模板，不在业务代码里拼接大段脚本字符串。

推荐目录：

```text
resources/windows-patch/scripts/
  win_patch_source_check.ps1
  win_patch_scan.ps1
  win_patch_install.ps1
  win_patch_reboot_check.ps1
  win_patch_validate.ps1
  win_patch_uninstall_assess.ps1
```

模板渲染：

- 使用受控模板参数，不允许任意命令注入。
- 参数通过 JSON 文件或 Base64 JSON 传给脚本，避免 PowerShell 命令行转义问题。
- 脚本输出只认最后一段结构化 JSON，其他日志单独归档。

Java 解析：

- 使用 Jackson 反序列化脚本输出。
- 定义 `schemaVersion`，不同脚本版本兼容解析。
- 对 `updateId`、`revisionNumber`、`kbIds`、`resultCode`、`hresult`、`rebootRequired` 做必填校验。
- 原始输出要归档，解析失败时保留现场。

### 18.7 MSRC 与 WSUS 集成方式

MSRC：

- Java 后端可用 `WebClient`、`RestTemplate` 或现有 HTTP Client 调用 MSRC API。
- 需要配置超时、重试、代理和离线导入模式。
- 联网区可同步后导出 JSON，隔离区导入 JSON。

WSUS：

- WSUS Administration API 是 .NET 生态能力，Java 后端不建议直接通过 JNI 或复杂 COM 桥接调用。
- 推荐第一期使用“WSUS 服务器本地 PowerShell 导出 JSON + Java 导入”的方式。
- 第二期如需直连，可做一个 .NET sidecar/adapter，由 Java 通过 HTTP 调用。

推荐第一期 WSUS 元数据同步链路：

```text
Java 后端创建同步任务
  -> JAO 在 WSUS 服务器执行 PowerShell
  -> PowerShell 读取 WSUS 元数据并输出 JSON
  -> Java 拉取/接收 JSON
  -> Java 校验和入库
```

### 18.8 锁与幂等

必须有两类锁：

| 锁 | 用途 |
|---|---|
| `windows_patch_host:{hostId}` | 防止同一主机并发安装/重启。 |
| `windows_patch_task:{taskId}:{step}` | 防止重复点击或重复回调导致同一步骤重复执行。 |

可以用 Redis，也可以用数据库锁表。若当前系统没有 Redis，第一期可使用数据库唯一键/状态守卫实现。

幂等键建议：

```text
taskId + hostId + step + runId
```

### 18.9 Java 后端不应承担的事情

不要让 Java 服务直接做这些事：

- 直接调用目标机 WUA COM API 安装补丁。
- 在 Java 服务所在机器上下载所有 Windows 补丁并自行分发，试图替代 WSUS。
- 只用 Java 静态 KB 表判断某主机是否缺补丁。
- 在 Controller 中同步等待补丁安装完成。
- 把 PowerShell 任意脚本文本无审计地透传到生产主机。

Java 后端真正应该做的是：

```text
建模、编排、校验、状态机、幂等、审计、报表、适配器抽象。
```

## 19. 实施路线

### 第一期：离线 WSUS + 扫描合规闭环

目标：

- 建立更新源配置。
- 建立离线 WSUS 批次登记和校验。
- 实现 WUA 扫描。
- 入库主机当前补丁状态。
- 输出主机/KB/CVE 合规报表。

交付：

- 数据表 1-6。
- `source_check`、`scan` 脚本。
- 扫描 API。
- WSUS 批次 API。
- MSRC 基础同步。
- Java 侧完成 Entity/Mapper/Service/Controller 和 JAO 执行适配器。

### 第二期：安装任务闭环

目标：

- 创建安装任务。
- 预检查。
- 下载/安装。
- 重启确认。
- 安装后复扫。
- 任务审计。

交付：

- 任务状态机。
- `install`、`reboot_check`、`validate` 脚本。
- 安装任务 API。
- 任务明细和错误码归类。
- Java 状态机、主机锁、回调幂等、安装后复扫聚合。

### 第三期：CVE 深度治理与报表

目标：

- CVE/KB/UpdateID 多对多模型完善。
- Supersedence 判定。
- 业务系统/组织/区域合规报表。
- 紧急度计算与现有 Linux 漏洞治理统一。

### 第四期：增强能力

目标：

- WSUS API 直连同步。
- Agent 长任务模式。
- 卸载能力评估。
- 应急 MSU/CAB 导入。
- 与 Azure Update Manager/Autopatch/Graph 能力做可选连接器。

## 20. 关键设计取舍

### 20.1 为什么不用自建 Windows 补丁仓库替代 WSUS

Windows 更新包含复杂的 applicability、supersedence、servicing stack、累积更新、语言包、产品分类和审批策略。自行维护补丁本体、依赖和适用性判断成本极高，且容易误装。WSUS/WUA 是微软原生路径，离线生产环境应优先使用。

### 20.2 为什么不用 KB 作为唯一键

KB 适合人阅读，不适合作为执行唯一键。同一个 KB 在不同产品/架构/修订下可能有多个 UpdateID/Revision。安装时必须以 WUA 搜索结果中的 UpdateID/Revision 为准。

### 20.3 为什么扫描和安装都要在目标机本地执行

WUA 和 WUSA 在远程调用场景有安全和接口限制。通过目标机本地 PowerShell/Agent 执行，可以最大程度贴近 Windows Update 原生行为，也方便读取本机 GPO、注册表、WUA 服务、安装历史和重启状态。

### 20.4 为什么 `wsusscn2.cab` 不是离线安装方案

`wsusscn2.cab` 只包含安全更新扫描信息，不包含补丁本体。它能回答“这台机器缺哪些安全更新”，不能提供“这些更新从哪里下载并安装”。离线安装仍应依赖内网 WSUS 或经过审批的手工 MSU/CAB 包。

### 20.5 为什么要保留 Update Source 抽象

WSUS 已经进入 deprecated 状态，但目前仍是离线/内网部署的现实主通道。未来微软可能继续强化 Intune、Autopatch、Azure Update Manager、Graph 或推出新的混合更新能力。保留 Update Source 抽象后，后端只需要新增适配器，而不需要重写扫描、任务、状态、CVE/KB 和报表模型。

## 21. v1.0 最终建议

生产落地建议采用：

```text
WSUS_OFFLINE 为隔离网主更新源
+ MSRC 安全公告同步/导入
+ WSUS 离线导入批次治理
+ 目标机本地 WUA 扫描安装
+ 平台任务状态机和审计
+ 安装后复扫闭环
```

暂不建议第一期实现：

- 自建 Windows 补丁包仓库替代 WSUS。
- 承诺完整 Windows 补丁回滚。
- 依赖远程 WUA/WUSA 直接安装。
- 只靠 `Get-HotFix` 做合规判断。
- 只靠 KB 静态表判断主机是否缺补丁。
- Java 后端直接替代 WSUS 承担 Windows 补丁本体仓库能力。

这套方案不是“永不变化”的终极方案，但可以作为当前 Windows 补丁管理后端的生产级终版基线。后续演进点应围绕微软更新通道变化、WSUS 生命周期、Agent 能力和云管连接器逐步扩展，而不是推翻核心模型。
