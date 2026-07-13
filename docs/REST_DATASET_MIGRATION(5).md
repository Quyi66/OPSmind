# DTS Dataset 迁移接口文档

## 背景

前端原来统一通过 DTS 代理调用 `POST /dts/api/dts/q/data/{code}/` 查询数据。
迁移后，**所有接口**（包括 REST 和 JDBC 类型）统一改为直接调用后端各模块的新 API。

## 请求链路（Portal Zuul 网关路由）

前端所有 API 请求经过以下链路：

```
浏览器 → Nginx (/sjxy-portal/) → Portal Zuul 网关 (port 8001) → 后端服务 (port 8081)
```

1. **Nginx** 剥离 `/sjxy-portal/` 前缀后转发到 Portal（port 8001）
2. **Portal** 作为 Zuul 网关，根据 `zuul.routes` 配置匹配路由，剥离路由前缀后转发到后端服务

```
旧 DTS 调用:  /sjxy-portal/dts/api/dts/q/data/VAP2_CURRENT_STATS
新 API 调用:  /sjxy-portal/vap/api/vap/dashboard/current-stats
                ↑ Nginx基路径   ↑ Portal Zuul 路由前缀
```

### Portal Zuul 路由配置（sjxy-portal application.yml）

| 路由名 | 匹配路径 (path) | 转发目标 (url) | 说明 |
|--------|----------------|---------------|------|
| `vap` | `/vap/api/vap/**` | `http://127.0.0.1:8081/api/vap/` | 补丁漏洞 |
| `cac` | `/cac/api/cac/**` | `http://127.0.0.1:8081/api/cac/` | 巡检审计 |
| `acm` | `/acm/api/acm/**` | `http://127.0.0.1:8081/api/acm/` | 资产管理 |
| `jao` | `/jao/api/jao/**` | `http://127.0.0.1:8081/api/jao/` | 作业调度 |
| `adm` | `/adm/api/adm/**` | `http://127.0.0.1:8081/api/adm/` | 系统管理 |
| `upm` | `/upm/api/upm/**` | `http://127.0.0.1:8081/api/upm/` | 用户权限 |
| `uim` | `/uim/api/uim/**` | `http://127.0.0.1:8081/api/uim/` | 身份管理 |
| `gfs` | `/gfs/api/gfs/**` | `http://127.0.0.1:8081/api/gfs/` | 文件服务 |
| `nms` | `/nms/api/nms/**` | `http://127.0.0.1:8081/api/nms/` | 网络管理 |
| `vcm` | `/vcm/api/vcm/**` | `http://127.0.0.1:8081/api/vcm/` | 虚拟化 |
| `vsm` | `/vsm/api/vsm/**` | `http://127.0.0.1:8081/api/vsm/` | 存储管理 |
| `flow` | `/flow/api/flow/**` | `http://127.0.0.1:8081/api/flow/` | 流程编排 |
| `sys-dashboard` | `/svs/api/sys/dashboard/**` | `http://127.0.0.1:8081/api/sys/dashboard/` | 系统Dashboard |

### 后端路径 → 前端路径转换规则

| 后端路径格式 | Portal 路由 | 前端路径（浏览器 URL） |
|-------------|-----------|---------------------|
| `/api/vap/{...}` | `vap` | `/sjxy-portal/vap/api/vap/{...}` |
| `/api/cac/{...}` | `cac` | `/sjxy-portal/cac/api/cac/{...}` |
| `/api/acm/{...}` | `acm` | `/sjxy-portal/acm/api/acm/{...}` |
| `/api/jao/{...}` | `jao` | `/sjxy-portal/jao/api/jao/{...}` |
| `/api/adm/{...}` | `adm` | `/sjxy-portal/adm/api/adm/{...}` |
| `/api/upm/{...}` | `upm` | `/sjxy-portal/upm/api/upm/{...}` |
| `/api/sys/dashboard/{...}` | `sys-dashboard` | `/sjxy-portal/svs/api/sys/dashboard/{...}` |

> **⚠ 注意 `sys-dashboard` 路由**：后端路径以 `/api/sys/dashboard/` 开头的接口，前端需使用 `/svs/api/sys/dashboard/` 路由前缀（非 `/sys/`）。

> 下表中 **新API** 列为后端接口路径，前端需按上述转换规则拼接完整路径。
> 所有 Dashboard 新接口均为 **GET** 方法，参数通过 Query String 传递，`tenantId` 由 Token 自动提取无需传递。

## 通用说明

- 认证：Header 携带 `Authorization: Bearer <token>`
- 新接口统一返回 `ApiResponse` 格式：`{ "code": 200, "message": "success", "data": [...] }`
- 前端取数据方式：`response.data.data`（注意多一层 `.data`）
- 参数值为 `"all"` 时表示不过滤

---

## SUDO — sudo/密码管理

### REST 接口（type=rest，直接调用原 curl 地址）

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `CRCLOUD_SUDO_REQ_DETAIL` | `POST /api/dts/q/data/CRCLOUD_SUDO_REQ_DETAIL/` | `/api/jao/universal/dc/crcloud_sudo_add_result` | `jao` | `/jao/api/jao/universal/dc/crcloud_sudo_add_result` | POST | Body: `{"req_no":"..."}` | JSON Body |
| `CRCLOUD_RESET_PW_REQ_DETAIL` | `POST /api/dts/q/data/CRCLOUD_RESET_PW_REQ_DETAIL/` | `/api/jao/universal/dc/crcloud_sudo_passwd_reset_result` | `jao` | `/jao/api/jao/universal/dc/crcloud_sudo_passwd_reset_result` | POST | Body: `{"req_no":"..."}` | JSON Body |
| `SYS_PARAMS` | `POST /api/dts/q/data/SYS_PARAMS/` | `/api/adm/tenant-param` | `adm` | `/adm/api/adm/tenant-param` | GET | 无 | 获取当前租户的系统参数配置 |

### JDBC 接口（type=jdbc → SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `GET_SYS_AUDIT_LOG_BY_MODULE` | `POST /api/dts/q/data/GET_SYS_AUDIT_LOG_BY_MODULE/` | `/api/sys/dashboard/sys-audit-log-by-module` | GET | `module` (string) | 根据模块查询审计日志 |
| `UPM_LIST_AUDIT_LOG` | `POST /api/dts/q/data/UPM_LIST_AUDIT_LOG/` | `/api/sys/dashboard/upm-list-audit-log` | GET | `action` (可选), `status` (可选) | 列出UPM操作日志 |

---

## VAP — 补丁漏洞管理

### REST 接口

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `VAP2_DC_DATA_BY_KEYWORD` | `POST /api/dts/q/data/VAP2_DC_DATA_BY_KEYWORD/` | `/api/jao/universal/dc/{model}` | `jao` | `/jao/api/jao/universal/dc/{model}` | POST | `model`: path; Body: `{"repo-status":"...","$data_owner":"..."}` | JSON Body |
| `VAP2_LIST_EFFECTED_PATCH_REST` | `POST /api/dts/q/data/VAP2_LIST_EFFECTED_PATCH_REST/` | `/api/vap/v2/patch/effect/patch` | `vap` | `/vap/api/vap/v2/patch/effect/patch` | POST | Body: `["severity1","severity2"]` | JSON Array |
| `GET_ATTR_BY_INVENTORY` | `POST /api/dts/q/data/GET_ATTR_BY_INVENTORY/` | `/api/acm/ci/attr/inventory/{nodeName}/{assetType}` | `acm` | `/acm/api/acm/ci/attr/inventory/{nodeName}/{assetType}` | GET | `nodeName`, `assetType`: path | 查询资产属性 |

### JDBC 接口 — Linux 补丁（VapDashboard）

> **前端路径**: `/sjxy-portal/vap/api/vap/dashboard/{endpoint}` （Portal 路由 `vap`）
> 例外: `VPA2_GET_IP_WITH_CRITICAL` 走 `sys-dashboard` 路由 → `/sjxy-portal/svs/api/sys/dashboard/vpa2-ip-with-critical`

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `VAP2_CURRENT_STATS` | `POST /api/dts/q/data/VAP2_CURRENT_STATS/` | `/api/vap/dashboard/current-stats` | GET | 无 | 当前统计信息 |
| `VAP2_LIST_MACHINE_WITH_PATCH` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH/` | `/api/vap/dashboard/machine-with-patch` | GET | 无 | 有补丁的机器列表 |
| `VAP2_LIST_MACHINE_OS_INFO` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO/` | `/api/vap/dashboard/machine-os-info` | GET | 无 | 主机系统列表（去重） |
| `VAP2_LIST_MACHINE_OS_VERSION_INFO` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO/` | `/api/vap/dashboard/machine-os-version-info` | GET | 无 | 主机系统版本列表（去重） |
| `VAP2_LIST_PATCH_OF_ONE_MACHINE` | `POST /api/dts/q/data/VAP2_LIST_PATCH_OF_ONE_MACHINE/` | `/api/vap/dashboard/patch-of-one-machine` | GET | `hostId`, `severity` (可选) | 单台主机补丁一览 |
| `VAP2_LIST_MACHINE_BY_PATCH` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_BY_PATCH/` | `/api/vap/dashboard/machine-by-patch` | GET | `patchIds` (List) | 受补丁影响的主机 |
| `VAP2_LIST_MACHINE_VUL_OTO` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_VUL_OTO/` | `/api/vap/dashboard/machine-vul-oto` | GET | 无 | 主机-漏洞一对一 |
| `VAP2_LIST_MACHINE_PATCH_OTO` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_PATCH_OTO/` | `/api/vap/dashboard/machine-patch-oto` | GET | 无 | 主机-补丁一对一 |
| `VAP2_LIST_EFFECTED_PATCH` | `POST /api/dts/q/data/VAP2_LIST_EFFECTED_PATCH/` | `/api/vap/dashboard/effected-patch` | GET | `severity` (List) | 有效补丁列表 |
| `VAP2_GET_PATCH_DETAIL` | `POST /api/dts/q/data/VAP2_GET_PATCH_DETAIL/` | `/api/vap/dashboard/patch-detail` | GET | `patchId` | 补丁详情 |
| `VAP2_LIST_AFFECTED_PKG_OF_PATCH` | `POST /api/dts/q/data/VAP2_LIST_AFFECTED_PKG_OF_PATCH/` | `/api/vap/dashboard/affected-pkg-of-patch` | GET | `patchIds` (List) | 补丁影响的包 |
| `VAP2_LIST_AFFECTED_PKG_OF_PATCH_DETAIL` | `POST /api/dts/q/data/VAP2_LIST_AFFECTED_PKG_OF_PATCH_DETAIL/` | `/api/vap/dashboard/affected-pkg-of-patch-detail` | GET | `patchIds` (List) | 补丁影响的包详情 |
| `VAP2_GET_MACHINE_INFO` | `POST /api/dts/q/data/VAP2_GET_MACHINE_INFO/` | `/api/vap/dashboard/machine-info` | GET | `hostId` | 主机详情 |
| `VAP2_GET_MACHINE_PKGS` | `POST /api/dts/q/data/VAP2_GET_MACHINE_PKGS/` | `/api/vap/dashboard/machine-pkgs` | GET | `hostId` | 主机安装的软件包 |
| `VAP2_COUNT_HOST_BY_VUL` | `POST /api/dts/q/data/VAP2_COUNT_HOST_BY_VUL/` | `/api/vap/dashboard/count-host-by-vul` | GET | 无 | 按漏洞统计受影响主机 |
| `VAP2_LIST_MACHINE_BY_VUL` | `POST /api/dts/q/data/VAP2_LIST_MACHINE_BY_VUL/` | `/api/vap/dashboard/machine-by-vul` | GET | `vulId` | 受漏洞影响的主机 |
| `VAP2_LIST_VUL_OF_ONE_MACHINE` | `POST /api/dts/q/data/VAP2_LIST_VUL_OF_ONE_MACHINE/` | `/api/vap/dashboard/vul-of-one-machine` | GET | `hostId` | 单台主机漏洞一览 |
| `VAP2_PATCH_INDEX` | `POST /api/dts/q/data/VAP2_PATCH_INDEX/` | `/api/vap/dashboard/patch-index` | GET | 无 | 补丁指标 |
| `VAP2_PATCH_TREND` | `POST /api/dts/q/data/VAP2_PATCH_TREND/` | `/api/vap/dashboard/patch-trend` | GET | 无 | Linux漏洞趋势 |
| `VAP2_LIST_PATCH_DATE` | `POST /api/dts/q/data/VAP2_LIST_PATCH_DATE/` | `/api/vap/dashboard/patch-date` | GET | `vendor`, `severity` (可选), `isIgnore` (可选) | 补丁库查询 |
| `VAP2_LIST_VENDOR_PATCH` | `POST /api/dts/q/data/VAP2_LIST_VENDOR_PATCH/` | `/api/vap/dashboard/vendor-patch` | GET | 无 | 厂商补丁库 |
| `VAP2_LIST_AUDIT_LOG` | `POST /api/dts/q/data/VAP2_LIST_AUDIT_LOG/` | `/api/vap/dashboard/audit-log` | GET | `action` (可选), `status` (可选) | VAP操作日志 |
| `VAP2_LIST_AUDIT_BY_ACTION_LOG` | `POST /api/dts/q/data/VAP2_LIST_AUDIT_BY_ACTION_LOG/` | `/api/vap/dashboard/audit-by-action-log` | GET | 无 | 操作日志按ACTION分组 |
| `VAP2_LIST_AUDIT_BY_STATUS_LOG` | `POST /api/dts/q/data/VAP2_LIST_AUDIT_BY_STATUS_LOG/` | `/api/vap/dashboard/audit-by-status-log` | GET | 无 | 操作日志按STATUS分组 |
| `VAP2_LIST_PATCH_ROLLBACK_LOG` | `POST /api/dts/q/data/VAP2_LIST_PATCH_ROLLBACK_LOG/` | `/api/vap/dashboard/patch-rollback-log` | GET | 无 | 补丁回退日志 |
| `VAP_HIST_UPDATE_PKGS` | `POST /api/dts/q/data/VAP_HIST_UPDATE_PKGS/` | `/api/vap/dashboard/hist-update-pkgs` | GET | `hostKey` (可选), `vulId` (可选) | 补丁安装历史 |
| `VAP2_LIST_PATCH_BY_CVES` | `POST /api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/` | `/api/vap/dashboard/patch-by-cves` | GET | `hostKey`, `vulId`, `severity` (默认all), `rebootStatus` (默认all), `isKernel` (默认all), `patchStatus` (默认all), `osDistro` (默认all), `osMajorVersion` (默认all) | 补丁综合查询 |
| `VAP2_MACHINE_CVE_LIST` | `POST /api/dts/q/data/VAP2_MACHINE_CVE_LIST/` | `/api/vap/dashboard/machine-cve-list` | GET | `hostId` | 单台主机CVE列表 |
| `VAP2_PATCH_STATUS_INFO` | `POST /api/dts/q/data/VAP2_PATCH_STATUS_INFO/` | `/api/vap/dashboard/patch-status-info` | GET | `ids` (List) | 补丁状态-所选主机 |
| `VAP2_PATCH_STATUS_INFO_BY_PATCH` | `POST /api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PATCH/` | `/api/vap/dashboard/patch-status-info-by-patch` | GET | `ids` (List) | 补丁状态-所选补丁 |
| `VAP2_PATCH_STATUS_INFO_BY_CVE` | `POST /api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_CVE/` | `/api/vap/dashboard/patch-status-info-by-cve` | GET | `ids` (List) | 补丁状态-所选CVE |
| `VAP2_PATCH_STATUS_INFO_BY_PKGS` | `POST /api/dts/q/data/VAP2_PATCH_STATUS_INFO_BY_PKGS/` | `/api/vap/dashboard/patch-status-info-by-pkgs` | GET | `ids` (List) | 补丁状态-所选软件 |
| `VAP2_SCAN_HIST` | `POST /api/dts/q/data/VAP2_SCAN_HIST/` | `/api/vap/dashboard/scan-hist` | GET | `runId` | 扫描历史 |
| `VAP2_HIST_SCAN_DETAIL` | `POST /api/dts/q/data/VAP2_HIST_SCAN_DETAIL/` | `/api/vap/dashboard/hist-scan-detail` | GET | `runId` | 历史扫描详情 |
| `VAP2_HIST_SCAN_DETAIL_BY_VULS` | `POST /api/dts/q/data/VAP2_HIST_SCAN_DETAIL_BY_VULS/` | `/api/vap/dashboard/hist-scan-detail-by-vuls` | GET | `runId`, `hostId` | 历史扫描-漏洞 |
| `VAP2_HIST_SCAN_DETAIL_BY_PACTHS` | `POST /api/dts/q/data/VAP2_HIST_SCAN_DETAIL_BY_PACTHS/` | `/api/vap/dashboard/hist-scan-detail-by-patches` | GET | `runId`, `hostId` | 历史扫描-补丁 |
| `VAP2_HIST_SCAN_DETAIL_BY_INSTALL_PKGS` | `POST /api/dts/q/data/VAP2_HIST_SCAN_DETAIL_BY_INSTALL_PKGS/` | `/api/vap/dashboard/hist-scan-detail-by-install-pkgs` | GET | `runId`, `hostId` | 历史扫描-已安装包 |
| `VAP2_HIST_SCAN_DETAIL_BY_AFFECTED_PKGS` | `POST /api/dts/q/data/VAP2_HIST_SCAN_DETAIL_BY_AFFECTED_PKGS/` | `/api/vap/dashboard/hist-scan-detail-by-affected-pkgs` | GET | `runId`, `hostId` | 历史扫描-受影响包 |
| `VAP2_GET_CVE_AND_TIME` | `POST /api/dts/q/data/VAP2_GET_CVE_AND_TIME/` | `/api/vap/dashboard/cve-and-time` | GET | `severity` (可选) | CVE与时间信息 |
| `VAP2_GET_TOTAL_OF_AFFECT_HOST_KEY` | `POST /api/dts/q/data/VAP2_GET_TOTAL_OF_AFFECT_HOST_KEY/` | `/api/vap/dashboard/total-of-affect-host-key` | GET | `severity` (可选) | 受影响主机总数 |
| `VPA2_GET_IP_WITH_CRITICAL` | `POST /api/dts/q/data/VPA2_GET_IP_WITH_CRITICAL/` | `/api/sys/dashboard/vpa2-ip-with-critical` | GET | `severity` (可选) | 存在严重漏洞的主机 |

### JDBC 接口 — Windows 补丁（VapDashboard）

> **前端路径**: `/sjxy-portal/vap/api/vap/dashboard/{endpoint}` （Portal 路由 `vap`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `VAP2_WIN_MACHINE` | `POST /api/dts/q/data/VAP2_WIN_MACHINE/` | `/api/vap/dashboard/win-machine` | GET | 无 | Windows主机概览 |
| `VAP2_WIN_MACHINE_PATCHS` | `POST /api/dts/q/data/VAP2_WIN_MACHINE_PATCHS/` | `/api/vap/dashboard/win-machine-patchs` | GET | `hostKey` (可选), `kbNumber` (可选), `patchStatus` (默认all), `osDistro` (默认all), `osArch` (默认all), `osVersion` (默认all) | Windows主机补丁 |
| `VAP2_GET_WIN_MACHINE_INFO` | `POST /api/dts/q/data/VAP2_GET_WIN_MACHINE_INFO/` | `/api/vap/dashboard/win-machine-info` | GET | `hostId` | Windows主机信息 |
| `VAP2_GET_WIN_MACHINE_PATCH_INFO` | `POST /api/dts/q/data/VAP2_GET_WIN_MACHINE_PATCH_INFO/` | `/api/vap/dashboard/win-machine-patch-info` | GET | `hostId` | Windows主机补丁详情 |
| `VAP2_LIST_WIN_OS_INFO` | `POST /api/dts/q/data/VAP2_LIST_WIN_OS_INFO/` | `/api/vap/dashboard/win-os-info` | GET | 无 | Windows系统列表 |
| `VAP2_LIST_WIN_OS_VERSION_INFO` | `POST /api/dts/q/data/VAP2_LIST_WIN_OS_VERSION_INFO/` | `/api/vap/dashboard/win-os-version-info` | GET | 无 | Windows系统版本列表 |
| `VAP2_LIST_WIN_OS_ARCH_INFO` | `POST /api/dts/q/data/VAP2_LIST_WIN_OS_ARCH_INFO/` | `/api/vap/dashboard/win-os-arch-info` | GET | 无 | Windows系统架构列表 |
| `VAP2_PATCH_WIN_STATUS_INFO` | `POST /api/dts/q/data/VAP2_PATCH_WIN_STATUS_INFO/` | `/api/vap/dashboard/patch-win-status-info` | GET | `ids` (List) | Windows补丁状态-所选主机 |
| `VAP2_PATCH_WIN_PATCH_INFO` | `POST /api/dts/q/data/VAP2_PATCH_WIN_PATCH_INFO/` | `/api/vap/dashboard/patch-win-patch-info` | GET | `ids` (List) | Windows补丁状态-所选漏洞 |
| `VAP2_PATCH_TREND_WINDOWS` | `POST /api/dts/q/data/VAP2_PATCH_TREND_WINDOWS/` | `/api/vap/dashboard/patch-trend-windows` | GET | 无 | Windows漏洞趋势 |
| `VAP2_CURRENT_STATS_WIN` | `POST /api/dts/q/data/VAP2_CURRENT_STATS_WIN/` | `/api/vap/dashboard/current-stats-win` | GET | 无 | Windows补丁统计概要 |
| `VAP_HIST_UPDATE_KBS_WIN` | `POST /api/dts/q/data/VAP_HIST_UPDATE_KBS_WIN/` | `/api/vap/dashboard/hist-update-kbs-win` | GET | `hostKey` (可选), `updateKbNumbers` (可选) | Windows补丁安装历史 |
| `VAP2_WIN_SCAN_HIST` | `POST /api/dts/q/data/VAP2_WIN_SCAN_HIST/` | `/api/vap/dashboard/win-scan-hist` | GET | `runId` | Windows扫描历史 |
| `VAP2_HIST_WIN_SCAN_DETAIL` | `POST /api/dts/q/data/VAP2_HIST_WIN_SCAN_DETAIL/` | `/api/vap/dashboard/hist-win-scan-detail` | GET | `runId` | Windows历史扫描详情 |
| `VAP2_PATCH_WIN_LIST` | `POST /api/dts/q/data/VAP2_PATCH_WIN_LIST/` | `/api/vap/dashboard/patch-win-list` | GET | `categoryNames` (可选) | Windows扫描漏洞列表 |
| `VAP2_PATCH_AFFECTED_MACHINES` | `POST /api/dts/q/data/VAP2_PATCH_AFFECTED_MACHINES/` | `/api/vap/dashboard/patch-affected-machines` | GET | `kbNumbers` (List) | Windows漏洞影响主机 |

---

## SPM — 软件包管理

### REST 接口

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `SPM_LIST_INSTALLED_PKGS` | `POST /api/dts/q/data/SPM_LIST_INSTALLED_PKGS/` | `/api/vap/v2/installed/pkgs` | `vap` | `/vap/api/vap/v2/installed/pkgs` | GET | `available` (如 `"所有"`) | 已安装软件包列表 |

### JDBC 接口（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `SPM_MACHINE_OVERERVIEW_LIST` | `POST /api/dts/q/data/SPM_MACHINE_OVERERVIEW_LIST/` | `/api/sys/dashboard/spm-machine-overerview-list` | GET | 无 | 主机概览列表 |
| `SPM_GET_PKG_MACHINE_INFO` | `POST /api/dts/q/data/SPM_GET_PKG_MACHINE_INFO/` | `/api/sys/dashboard/spm-pkg-machine-info` | GET | `hostId` | 软件包主机信息 |
| `SPM_CURRENT_INSTALLEND_PKGS` | `POST /api/dts/q/data/SPM_CURRENT_INSTALLEND_PKGS/` | `/api/sys/dashboard/spm-current-installend-pkgs` | GET | `hostId` | 当前已安装软件包 |
| `SPM_LIST_REPO` | `POST /api/dts/q/data/SPM_LIST_REPO/` | `/api/sys/dashboard/spm-list-repo` | GET | `repoStatus` (可选) | 仓库列表 |
| `SPM_REPO_DETAIL` | `POST /api/dts/q/data/SPM_REPO_DETAIL/` | `/api/sys/dashboard/spm-repo-detail` | GET | `repoId`, `refid` | 仓库详情 |
| `SPM_LIST_REPO_PKGS` | `POST /api/dts/q/data/SPM_LIST_REPO_PKGS/` | `/api/sys/dashboard/spm-list-repo-pkgs` | GET | `repoId` | 仓库软件列表 |
| `SPM_LIST_SIGLE_REPO_MACHINE` | `POST /api/dts/q/data/SPM_LIST_SIGLE_REPO_MACHINE/` | `/api/sys/dashboard/spm-list-sigle-repo-machine` | GET | `ids` | 已配置仓库的机器 |
| `SPM_LIST_SIGLE_NOT_REPO_MACHINE` | `POST /api/dts/q/data/SPM_LIST_SIGLE_NOT_REPO_MACHINE/` | `/api/sys/dashboard/spm-list-sigle-not-repo-machine` | GET | `refid` (可选), `osDistro` (可选) | 未配置仓库的机器 |
| `SPM_LIST_YUM_OF_ONE_MACHIN` | `POST /api/dts/q/data/SPM_LIST_YUM_OF_ONE_MACHIN/` | `/api/sys/dashboard/spm-list-yum-of-one-machin` | GET | `hostId`, `repoStatus` (可选) | 单台主机仓库一览 |
| `SPM_LIST_YUM_PKG_OF_ONE_MACHIN` | `POST /api/dts/q/data/SPM_LIST_YUM_PKG_OF_ONE_MACHIN/` | `/api/sys/dashboard/spm-list-yum-pkg-of-one-machin` | GET | `hostId` | 单台主机软件列表 |
| `SPM_REPO_COFIGS` | `POST /api/dts/q/data/SPM_REPO_COFIGS/` | `/api/sys/dashboard/spm-repo-cofigs` | GET | 无 | 仓库配置列表 |
| `SPM_REPO_DEFAULT_HOSTS` | `POST /api/dts/q/data/SPM_REPO_DEFAULT_HOSTS/` | `/api/sys/dashboard/spm-repo-default-hosts` | GET | 无 | 基准扫描仓库列表 |
| `SPM_REPO_DEFAULT_HOSTS_LIST` | `POST /api/dts/q/data/SPM_REPO_DEFAULT_HOSTS_LIST/` | `/api/sys/dashboard/spm-repo-default-hosts-list` | GET | 无 | 仓库扫描配置机器 |
| `SPM_REPO_INFO_BY_REFID` | `POST /api/dts/q/data/SPM_REPO_INFO_BY_REFID/` | `/api/sys/dashboard/spm-repo-info-by-refid` | GET | `refid` | 查询仓库信息 |
| `SPM_CONFIGURED_REPO` | `POST /api/dts/q/data/SPM_CONFIGURED_REPO/` | `/api/sys/dashboard/spm-configured-repo` | GET | `repoStatus` (可选) | 已配置仓库 |
| `SPM_PACKAGES_OVERERVIEW_LIST` | `POST /api/dts/q/data/SPM_PACKAGES_OVERERVIEW_LIST/` | `/api/sys/dashboard/spm-packages-overerview-list` | GET | 无 | 软件包概览 |
| `SPM_PACKAGES_REPO` | `POST /api/dts/q/data/SPM_PACKAGES_REPO/` | `/api/sys/dashboard/spm-packages-repo` | GET | `ids` | 软件包关联仓库 |
| `SPM_LIST_PACKAGE_MACHINE` | `POST /api/dts/q/data/SPM_LIST_PACKAGE_MACHINE/` | `/api/sys/dashboard/spm-list-package-machine` | GET | `refid` | 软件包可用主机 |
| `SPM_PACKAGES_INSTALLLED_ALL_LIST` | `POST /api/dts/q/data/SPM_PACKAGES_INSTALLLED_ALL_LIST/` | `/api/sys/dashboard/spm-packages-installled-all-list` | GET | `availablePkg` (可选) | 已安装软件包 |
| `SPM_INSTALLED_PKGS_MACHINE` | `POST /api/dts/q/data/SPM_INSTALLED_PKGS_MACHINE/` | `/api/sys/dashboard/spm-installed-pkgs-machine` | GET | `pkgs` | 已安装包关联主机 |
| `SPM_PACKAGE_ID_NAME` | `POST /api/dts/q/data/SPM_PACKAGE_ID_NAME/` | `/api/sys/dashboard/spm-package-id-name` | GET | `pkgs` | 软件id关联名称 |
| `SPM_CURRENT_REPO_STATS` | `POST /api/dts/q/data/SPM_CURRENT_REPO_STATS/` | `/api/sys/dashboard/spm-current-repo-stats` | GET | 无 | 仓库扫描概要 |
| `SPM_CURRENT_SOFTWARE_STATS` | `POST /api/dts/q/data/SPM_CURRENT_SOFTWARE_STATS/` | `/api/sys/dashboard/spm-current-software-stats` | GET | 无 | 软件包扫描概要 |
| `SPM_CURRENT_SOFTWARE_STATS_V2` | `POST /api/dts/q/data/SPM_CURRENT_SOFTWARE_STATS_V2/` | `/api/sys/dashboard/spm-current-software-stats-v2` | GET | 无 | 软件包扫描概要V2 |
| `SPM_LIST_AUDIT_LOG` | `POST /api/dts/q/data/SPM_LIST_AUDIT_LOG/` | `/api/sys/dashboard/spm-list-audit-log` | GET | `action` (可选), `status` (可选) | SPM操作日志 |

---

## UIM — 用户身份管理 (LUPM)

### JDBC 接口（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `LUPM_LIST_USERS` | `POST /api/dts/q/data/LUPM_LIST_USERS/` | `/api/sys/dashboard/lupm-users` | GET | `types` (可选), `lockStatus` (可选), `hostKey` (可选), `username` (可选) | 查询用户 |
| `LUPM_LIST_GROUPS` | `POST /api/dts/q/data/LUPM_LIST_GROUPS/` | `/api/sys/dashboard/lupm-groups` | GET | `hostKey` (可选), `groupName` (可选), `pluginFindHost` | 查询用户组 |
| `LUPM_LIST_SUDO_TEMPLATES` | `POST /api/dts/q/data/LUPM_LIST_SUDO_TEMPLATES/` | `/api/sys/dashboard/lupm-sudo-templates` | GET | 无 | sudo模板列表 |
| `LUPM_LIST_SUDO_COMMAND_BY_TEMPLATE_ID` | `POST /api/dts/q/data/LUPM_LIST_SUDO_COMMAND_BY_TEMPLATE_ID/` | `/api/sys/dashboard/lupm-sudo-command-by-template-id` | GET | `templateId` | sudo模板命令 |
| `LUPM_STATISTICS` | `POST /api/dts/q/data/LUPM_STATISTICS/` | `/api/sys/dashboard/lupm-statistics` | GET | 无 | 总览KPI统计 |
| `LUPM_AUDIT_LOG_STATISTICS` | `POST /api/dts/q/data/LUPM_AUDIT_LOG_STATISTICS/` | `/api/sys/dashboard/lupm-audit-log-statistics` | GET | `diffDay` (可选, 默认15) | 操作记录统计 |
| `LUPM_LIST_ALL_USERNAME` | `POST /api/dts/q/data/LUPM_LIST_ALL_USERNAME/` | `/api/sys/dashboard/lupm-all-username` | GET | 无 | 所有用户名 |
| `LUPM_LIST_ALL_GROUPNAME` | `POST /api/dts/q/data/LUPM_LIST_ALL_GROUPNAME/` | `/api/sys/dashboard/lupm-all-groupname` | GET | 无 | 所有用户组名 |
| `LUPM_ERROR_USER` | `POST /api/dts/q/data/LUPM_ERROR_USER/` | `/api/sys/dashboard/lupm-error-user` | GET | 无 | 异常用户 |
| `LUPM_GET_USER_CRONTAB` | `POST /api/dts/q/data/LUPM_GET_USER_CRONTAB/` | `/api/sys/dashboard/lupm-user-crontab` | GET | `id` | 用户定时任务 |
| `LUPM_GET_USER_LOGIN_FAIL_MESSAGE` | `POST /api/dts/q/data/LUPM_GET_USER_LOGIN_FAIL_MESSAGE/` | `/api/sys/dashboard/lupm-user-login-fail-message` | GET | `id` | 用户登录异常 |
| `TEST_LUPM_DATASET` | `POST /api/dts/q/data/TEST_LUPM_DATASET/` | 未迁移，仍通过 DTS | POST | 无 | 测试数据集 |

---

## VC — VMware vCenter 管理

### JDBC 接口（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）
> 例外: `JAO_COUNTS_SUM_RUN_LOG` 走 `jao` 路由 → `/sjxy-portal/jao/api/jao/dashboard/counts-sum-run-log`

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `VC_MAIN_STATS` | `POST /api/dts/q/data/VC_MAIN_STATS/` | `/api/sys/dashboard/vc-main-stats` | GET | `vcServer` | 首页指标 |
| `VC_STATS_DEPLOY_SUCCESS` | `POST /api/dts/q/data/VC_STATS_DEPLOY_SUCCESS/` | `/api/sys/dashboard/vc-stats-deploy-success` | GET | `vcServer` | 部署成功率 |
| `VC_STATS_OPERATION_NUM` | `POST /api/dts/q/data/VC_STATS_OPERATION_NUM/` | `/api/sys/dashboard/vc-stats-operation-num` | GET | `vcServer` | 操作数量 |
| `VC_GET_OPERATION_LOG` | `POST /api/dts/q/data/VC_GET_OPERATION_LOG/` | `/api/sys/dashboard/vc-operation-log` | GET | 无 | 操作日志 |
| `VC_GET_SERVER` | `POST /api/dts/q/data/VC_GET_SERVER/` | `/api/sys/dashboard/vc-server` | GET | `status` | vc列表 |
| `VC_GET_SERVER_BY_ID` | `POST /api/dts/q/data/VC_GET_SERVER_BY_ID/` | `/api/sys/dashboard/vc-server-by-id` | GET | `id` | vc详情(按ID) |
| `VC_GET_DETIAL` | `POST /api/dts/q/data/VC_GET_DETIAL/` | `/api/sys/dashboard/vc-detial` | GET | 无 | vc全部列表(含ALL) |
| `VC_GET_ALL_DETAIL` | `POST /api/dts/q/data/VC_GET_ALL_DETAIL/` | `/api/sys/dashboard/vc-all-detail` | GET | 无 | vc/NSX全部列表 |
| `VC_GET_DC` | `POST /api/dts/q/data/VC_GET_DC/` | `/api/sys/dashboard/vc-dc` | GET | `vc` | 数据中心列表 |
| `VC_GET_CODE` | `POST /api/dts/q/data/VC_GET_CODE/` | `/api/sys/dashboard/vc-code` | GET | `vc` | 数据中心全部(含ALL) |
| `VC_GET_FOLDER_LIST` | `POST /api/dts/q/data/VC_GET_FOLDER_LIST/` | `/api/sys/dashboard/vc-folder-list` | GET | `dc` | 文件夹列表 |
| `VC_GET_ESXI_LIST` | `POST /api/dts/q/data/VC_GET_ESXI_LIST/` | `/api/sys/dashboard/vc-esxi-list` | GET | `vcServer`, `dc`, `cluster` | ESXI服务器列表 |
| `VC_GET_ESXI_CPU_CORE_NUM` | `POST /api/dts/q/data/VC_GET_ESXI_CPU_CORE_NUM/` | `/api/sys/dashboard/vc-esxi-cpu-core-num` | GET | `esxi` | ESXi CPU核心数 |
| `VC_GET_ESXI_MEMORY` | `POST /api/dts/q/data/VC_GET_ESXI_MEMORY/` | `/api/sys/dashboard/vc-esxi-memory` | GET | `hostname` | ESXI内存 |
| `VC_GET_ESXI_DATA_STORE_LIST` | `POST /api/dts/q/data/VC_GET_ESXI_DATA_STORE_LIST/` | `/api/sys/dashboard/vc-esxi-data-store-list` | GET | `esxi` | ESXI存储列表 |
| `VC_GET_CLUSTER_LIST` | `POST /api/dts/q/data/VC_GET_CLUSTER_LIST/` | `/api/sys/dashboard/vc-cluster-list` | GET | `vcServer`, `dc` | Cluster列表 |
| `VC_GET_VMS_LIST` | `POST /api/dts/q/data/VC_GET_VMS_LIST/` | `/api/sys/dashboard/vc-vms-list` | GET | `vcServer`, `dc`, `cluster` | 虚拟机列表 |
| `VC_GET_TEMPLATE_LIST` | `POST /api/dts/q/data/VC_GET_TEMPLATE_LIST/` | `/api/sys/dashboard/vc-template-list` | GET | `vcServer`, `dc` | 模板列表 |
| `VC_GET_TEMPLATE` | `POST /api/dts/q/data/VC_GET_TEMPLATE/` | `/api/sys/dashboard/vc-template` | GET | `vcServer`, `name` | 获取模板 |
| `VC_GET_NETWORK` | `POST /api/dts/q/data/VC_GET_NETWORK/` | `/api/sys/dashboard/vc-network` | GET | `vc` | 网络列表 |
| `VC_GET_DATASTORE_LIST` | `POST /api/dts/q/data/VC_GET_DATASTORE_LIST/` | `/api/sys/dashboard/vc-datastore-list` | GET | `vcServer`, `datastore` | DataStore列表 |
| `VC_GET_NSX_SERVER` | `POST /api/dts/q/data/VC_GET_NSX_SERVER/` | `/api/sys/dashboard/vc-nsx-server` | GET | `status` | NSX列表 |
| `VC_GET_NSX_SERVER_BY_ID` | `POST /api/dts/q/data/VC_GET_NSX_SERVER_BY_ID/` | `/api/sys/dashboard/vc-nsx-server-by-id` | GET | `id` | NSX详情(按ID) |
| `VC_GET_NSX_DETAIL` | `POST /api/dts/q/data/VC_GET_NSX_DETAIL/` | `/api/sys/dashboard/vc-nsx-detail` | GET | 无 | NSX全部列表(含ALL) |
| `VC_GET_ALARM_LIST` | `POST /api/dts/q/data/VC_GET_ALARM_LIST/` | `/api/sys/dashboard/vc-alarm-list` | GET | `vcServer`, `status` | vc告警列表 |
| `VC_GET_NSX_ALARM_LIST` | `POST /api/dts/q/data/VC_GET_NSX_ALARM_LIST/` | `/api/sys/dashboard/vc-nsx-alarm-list` | GET | `nsxServer`, `severity` | NSX告警列表 |
| `VC_GET_EVENT_LIST` | `POST /api/dts/q/data/VC_GET_EVENT_LIST/` | `/api/sys/dashboard/vc-event-list` | GET | `vcServer`, `type`, `startTime`, `endTime` | vc事件列表 |
| `VC_GET_TASK_LIST` | `POST /api/dts/q/data/VC_GET_TASK_LIST/` | `/api/sys/dashboard/vc-task-list` | GET | `vcServer`, `state`, `startTime`, `endTime` | vc任务列表 |
| `JAO_COUNTS_SUM_RUN_LOG` | `POST /api/dts/q/data/JAO_COUNTS_SUM_RUN_LOG/` | `/api/jao/dashboard/counts-sum-run-log` | GET | `jobId` | 作业统计(近30天) |

---

## ACM — 资产配置管理

### REST 接口（type=rest，直接调用原 curl 地址）

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `ACM_CI_BY_CIT` | `POST /api/dts/q/data/ACM_CI_BY_CIT/` | `/api/acm/ci/list-asset-selector` | `acm` | `/acm/api/acm/ci/list-asset-selector` | POST | Body: `selectorStr`, `status`, `assetType` 等 | JSON Body |
| `ACM_GET_ALL_ANSIBLE_SET_REST` | `POST /api/dts/q/data/ACM_GET_ALL_ANSIBLE_SET_REST/` | `/api/acm/auto/ansible/find/all` | `acm` | `/acm/api/acm/auto/ansible/find/all` | GET | 无 | 所有ansible配置 |
| `ACM_GET_ANSIBLE_CONFIG_BY_ID` | `POST /api/dts/q/data/ACM_GET_ANSIBLE_CONFIG_BY_ID/` | `/api/acm/auto/ansible/find/list/{id}` | `acm` | `/acm/api/acm/auto/ansible/find/list/{id}` | GET | `id`: path | ansible配置详情 |
| `ACM_GET_ALL_ATTR_BY_CODE` | `POST /api/dts/q/data/ACM_GET_ALL_ATTR_BY_CODE/` | `/api/acm/ci/attr/list/{ciType}/{code}` | `acm` | `/acm/api/acm/ci/attr/list/{ciType}/{code}` | GET | `ciType`, `code`: path | 属性值列表 |
| `ACM_GET_MODEL` | `POST /api/dts/q/data/ACM_GET_MODEL/` | `/api/acm/cit/code/{ciType}/as/list` | `acm` | `/acm/api/acm/cit/code/{ciType}/as/list` | GET | `ciType`: path | 资产模型属性code |
| `ACM_GET_ATTRS_BY_TAGID` | `POST /api/dts/q/data/ACM_GET_ATTRS_BY_TAGID/` | `/api/acm/ci/attrs/tag` | `acm` | `/acm/api/acm/ci/attrs/tag` | GET | `tagId`: query | 标签设备信息 |
| `ACM_GET_ATTRS_BY_GROUPID` | `POST /api/dts/q/data/ACM_GET_ATTRS_BY_GROUPID/` | `/api/acm/ci/attrs/group` | `acm` | `/acm/api/acm/ci/attrs/group` | GET | `groupId`: query | 分组设备信息 |
| `ACM_GET_CI_BY_SELECTOR` | `POST /api/dts/q/data/ACM_GET_CI_BY_SELECTOR/` | `/api/acm/ci/list-by-groups-tags` | `acm` | `/acm/api/acm/ci/list-by-groups-tags` | POST | Body: `groups`, `tags`, `dynamicTags`, `assetType`, `dataType` | JSON Body |
| `ACM_GET_GROUP_BY_CIT` | `POST /api/dts/q/data/ACM_GET_GROUP_BY_CIT/` | `/api/acm/query/group/find/{ciType}` | `acm` | `/acm/api/acm/query/group/find/{ciType}` | GET | `ciType`: path | 按类型查分组 |
| `ACM_GET_GROUP_PERMISSION` | `POST /api/dts/q/data/ACM_GET_GROUP_PERMISSION/` | `/api/acm/permission/team/{teamId}` | `acm` | `/acm/api/acm/permission/team/{teamId}` | GET | `teamId`: path | 团队权限 |
| `ACM_GET_RECENTLY_CI` | `POST /api/dts/q/data/ACM_GET_RECENTLY_CI/` | `/api/acm/ci/recently` | `acm` | `/acm/api/acm/ci/recently` | GET | Body: `ciType`, `jobType`, `lim` | GET+Body |
| `ACM_GET_SCRIPT_ENGINE` | `POST /api/dts/q/data/ACM_GET_SCRIPT_ENGINE/` | `/api/params/jao/script_engine` | Portal 本地 | `/api/params/jao/script_engine` | GET | 无 | 系统参数（Portal自身接口） |
| `ACM_ATTR_OS_DISTRO` | `POST /api/dts/q/data/ACM_ATTR_OS_DISTRO/` | `/api/acm/ci/statistic/attr/list/{attr}/{code}` | `acm` | `/acm/api/acm/ci/statistic/attr/list/{attr}/{code}` | GET | `attr`, `code`: path; `os`: query | 按属性统计OS |
| `ACM_HISTORY_ATTR_INF` | `POST /api/dts/q/data/ACM_HISTORY_ATTR_INF/` | `/api/acm/auto/hist/statistic/single/attr/{cid}/{day}` | `acm` | `/acm/api/acm/auto/hist/statistic/single/attr/{cid}/{day}` | POST | `cid`, `day`: path; Body: attrs数组 | 资产属性趋势 |
| `ACM_HISTORY_OS_INF` | `POST /api/dts/q/data/ACM_HISTORY_OS_INF/` | `/api/acm/auto/hist/statistic/global/time/os` | `acm` | `/acm/api/acm/auto/hist/statistic/global/time/os` | GET | 无 | OS趋势 |
| `ACM_MUTIL_GROUP_CI` | `POST /api/dts/q/data/ACM_MUTIL_GROUP_CI/` | `/api/acm/auto/hist/statistic/multiple/group/{code}` | `acm` | `/acm/api/acm/auto/hist/statistic/multiple/group/{code}` | GET | `code`: path | 多分组机器 |
| `ACM_PARENT_GROUP_ASSET_COUNT` | `POST /api/dts/q/data/ACM_PARENT_GROUP_ASSET_COUNT/` | `/api/acm/query/group/find/group/sum` | `acm` | `/acm/api/acm/query/group/find/group/sum` | GET | `os`: query | 父分组资产统计 |
| `GET_ALL_GROUP_PATH` | `POST /api/dts/q/data/GET_ALL_GROUP_PATH/` | `/api/acm/query/group/except/{thisGroup}/{code}` | `acm` | `/acm/api/acm/query/group/except/{thisGroup}/{code}` | GET | `thisGroup`, `code`: path | 分组路径 |
| `AAP_QUERY_INSTANCE_GROUP` | `POST /api/dts/q/data/AAP_QUERY_INSTANCE_GROUP/` | `/api/jao/aap/instance_group` | `jao` | `/jao/api/jao/aap/instance_group` | GET | 无 | AAP实例组 |
| `TEAM_GET_COUNT_BY_MODULE` | `POST /api/dts/q/data/TEAM_GET_COUNT_BY_MODULE/` | `/api/team/permission/{module}` | Portal 本地 | `/api/team/permission/{module}` | GET | `module`: path | 模块团队统计（Portal自身接口） |

### JDBC 接口 — 资产统计（AcmDashboard）

> **前端路径**: `/sjxy-portal/acm/api/acm/dashboard/{endpoint}` （Portal 路由 `acm`）
> 例外: `EYWUXITONG_ISNULL` 走 `sys-dashboard` 路由 → `/sjxy-portal/svs/api/sys/dashboard/eywuxitong-isnull`

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `ACM_CI_NEW_COUNT` | `POST /api/dts/q/data/ACM_CI_NEW_COUNT/` | `/api/acm/dashboard/ci-new-count` | GET | 无 | 新增资产统计(近6月) |
| `ACM_CIT_MANAGE` | `POST /api/dts/q/data/ACM_CIT_MANAGE/` | `/api/acm/dashboard/cit-manage` | GET | 无 | 资产模型管理 |
| `ACM_GET_OS_DISTRO` | `POST /api/dts/q/data/ACM_GET_OS_DISTRO/` | `/api/acm/dashboard/os-distro` | GET | 无 | 操作系统分布 |
| `ACM_COUNT_OS_VERSION` | `POST /api/dts/q/data/ACM_COUNT_OS_VERSION/` | `/api/acm/dashboard/os-version-count` | GET | 无 | 操作系统小版本统计 |
| `ACM_GET_OS_VIESON` | `POST /api/dts/q/data/ACM_GET_OS_VIESON/` | `/api/acm/dashboard/os-version` | GET | `osDistro` | 操作系统版本分布 |
| `ACM_COUNT_ATA` | `POST /api/dts/q/data/ACM_COUNT_ATA/` | `/api/acm/dashboard/count-ata` | GET | 无 | Ansible节点纳管数量 |
| `ACM_GET_RESOURCE_TYPE` | `POST /api/dts/q/data/ACM_GET_RESOURCE_TYPE/` | `/api/acm/dashboard/resource-type` | GET | 无 | 资产信息类型 |
| `ACM_NO_GROUP_CI` | `POST /api/dts/q/data/ACM_NO_GROUP_CI/` | `/api/acm/dashboard/no-group-ci` | GET | 无 | 未分组的机器 |
| `ACM_GET_ALL_GROUP_ADMIN` | `POST /api/dts/q/data/ACM_GET_ALL_GROUP_ADMIN/` | `/api/acm/dashboard/groups` | GET | 无 | 分组列表(管理员) |
| `ACM_GET_CI_TAGS` | `POST /api/dts/q/data/ACM_GET_CI_TAGS/` | `/api/acm/dashboard/tags` | GET | `ciType` (可选, 默认sjxy_all) | 标签列表 |
| `ACM_GET_CI_TAGS_BY_CIT` | `POST /api/dts/q/data/ACM_GET_CI_TAGS_BY_CIT/` | `/api/acm/dashboard/tags/{ciType}` | GET | `ciType`: path | 按类型查标签 |
| `ACM_GET_AUTO_DEVICE_TYPE` | `POST /api/dts/q/data/ACM_GET_AUTO_DEVICE_TYPE/` | `/api/acm/dashboard/auto-device-type` | GET | 无 | 可支持的自动化设备 |
| `EYWUXITONG_ISNULL` | `POST /api/dts/q/data/EYWUXITONG_ISNULL/` | `/api/sys/dashboard/eywuxitong-isnull` | GET | 无 | 业务系统为空的值 |

### JDBC 接口 — 系统配置（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `CM2_GET_ALL_ANSIBLE_VARS_SET` | `POST /api/dts/q/data/CM2_GET_ALL_ANSIBLE_VARS_SET/` | `/api/sys/dashboard/cm2-ansible-vars-set` | GET | 无 | Ansible变量集配置 |
| `GET_ALL_ASSET_AUTO_CONFIG` | `POST /api/dts/q/data/GET_ALL_ASSET_AUTO_CONFIG/` | `/api/sys/dashboard/all-asset-auto-config` | GET | 无 | 自动化配置列表 |
| `GET_ALL_ATA_NODE_BY_PARAM_CONFIG` | `POST /api/dts/q/data/GET_ALL_ATA_NODE_BY_PARAM_CONFIG/` | `/api/sys/dashboard/all-ata-node-by-param-config` | GET | 无 | ATA节点参数配置 |
| `GET_TAT_URL_AS_STRING_LIST` | `POST /api/dts/q/data/GET_TAT_URL_AS_STRING_LIST/` | `/api/sys/dashboard/tat-url-as-string-list` | GET | 无 | ATA节点URL列表 |

### JDBC 接口 — 未迁移（仍通过 DTS 查询）

| DTS Code | 调用方式 | 说明 |
|----------|----------|------|
| `ACM_CONNECTION_COUNT` | `POST /api/dts/q/data/ACM_CONNECTION_COUNT/` | 异常设备统计 |
| `ACM_GET_FAILED_TO_CONNECT_HOST` | `POST /api/dts/q/data/ACM_GET_FAILED_TO_CONNECT_HOST/` | 连接异常设备数量 |
| `ACM_LIST_CONNECT_EXCEPTION` | `POST /api/dts/q/data/ACM_LIST_CONNECT_EXCEPTION/` | 连接异常主机列表 |
| `ACM_OS_DIFF` | `POST /api/dts/q/data/ACM_OS_DIFF/` | 机器差异对比 |
| `ACM_GET_ALL_GROUP` | `POST /api/dts/q/data/ACM_GET_ALL_GROUP/` | 分组列表(按权限) |
| `ACM_AUTOMATION_GET` | `POST /api/dts/q/data/ACM_AUTOMATION_GET/` | 设备连接配置 |

---

## CAC — 巡检审计

### REST 接口

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `CAC_GET_STATISTICS` | `POST /api/dts/q/data/CAC_GET_STATISTICS/` | `/api/cac/v2/statistics/check-item/{jobId}` | `cac` | `/cac/api/cac/v2/statistics/check-item/{jobId}` | GET | `jobId`: path | 巡检统计 |
| `CAC_STRUCTURAL_KPI` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI/` | `/api/cac/v2/custom-kpi/check-item/{jobId}` | `cac` | `/cac/api/cac/v2/custom-kpi/check-item/{jobId}` | GET | `jobId`: path | 组织架构KPI |

### JDBC 接口（CacDashboard）

> **前端路径**: `/sjxy-portal/cac/api/cac/dashboard/{endpoint}` （Portal 路由 `cac`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `CAC_QUERY_TEMPLATE` | `POST /api/dts/q/data/CAC_QUERY_TEMPLATE/` | `/api/cac/dashboard/query-template` | GET | 无 | 巡检模板 |
| `CAC_DB_QUERY_TEMPLATE` | `POST /api/dts/q/data/CAC_DB_QUERY_TEMPLATE/` | `/api/cac/dashboard/db-query-template` | GET | `id` | 模板详情 |
| `CAC_DB_RUN_HOST` | `POST /api/dts/q/data/CAC_DB_RUN_HOST/` | `/api/cac/dashboard/db-run-host` | GET | `templateId` | 执行主机状态 |
| `CAC_DB_QUERY_ITEM` | `POST /api/dts/q/data/CAC_DB_QUERY_ITEM/` | `/api/cac/dashboard/db-query-item` | GET | `templateId` | 执行检查项 |
| `CAC_DB_LAST_TIME` | `POST /api/dts/q/data/CAC_DB_LAST_TIME/` | `/api/cac/dashboard/db-last-time` | GET | `templateId` | 最近成功/失败统计 |
| `CAC_DB_GROUP_TYPE` | `POST /api/dts/q/data/CAC_DB_GROUP_TYPE/` | `/api/cac/dashboard/db-group-type` | GET | `templateId` | 分组类型查看状态 |
| `CAC_DB_GROUP_JOB_DATE` | `POST /api/dts/q/data/CAC_DB_GROUP_JOB_DATE/` | `/api/cac/dashboard/db-group-job-date` | GET | `templateId` | 成功与失败趋势图 |
| `CAC_DB_QUERY_FAILED_HOST` | `POST /api/dts/q/data/CAC_DB_QUERY_FAILED_HOST/` | `/api/cac/dashboard/db-query-failed-host` | GET | `templateId` | 失败的主机 |
| `CAC_DB_QUERY_FAILED_ITEM` | `POST /api/dts/q/data/CAC_DB_QUERY_FAILED_ITEM/` | `/api/cac/dashboard/db-query-failed-item` | GET | `templateId` | 失败的检查项 |
| `CAC_CHECK_ITEM_MACHINE` | `POST /api/dts/q/data/CAC_CHECK_ITEM_MACHINE/` | `/api/cac/dashboard/check-item-machine` | GET | `jobId` | 巡检-主机概览 |
| `CAC_CHECK_ITEM` | `POST /api/dts/q/data/CAC_CHECK_ITEM/` | `/api/cac/dashboard/check-item` | GET | `jobId` | 巡检-巡检项概览 |
| `CAC_CHECK_ITEM_MACHINE_DETAIL` | `POST /api/dts/q/data/CAC_CHECK_ITEM_MACHINE_DETAIL/` | `/api/cac/dashboard/check-item-machine-detail` | GET | `jobId`, `hostKey`, `status` (默认all) | 主机概览详情 |
| `CAC_CHECK_ITEM_DETAIL` | `POST /api/dts/q/data/CAC_CHECK_ITEM_DETAIL/` | `/api/cac/dashboard/check-item-detail` | GET | `jobId`, `name`, `status` (默认all) | 巡检项概览详情 |
| `CAC_GET_MACHINE_INFO` | `POST /api/dts/q/data/CAC_GET_MACHINE_INFO/` | `/api/cac/dashboard/machine-info` | GET | `hostId` | 主机详情 |
| `CAC_GET_CHECK_ITEM_INFO` | `POST /api/dts/q/data/CAC_GET_CHECK_ITEM_INFO/` | `/api/cac/dashboard/check-item-info` | GET | `id` | 巡检项详情 |
| `CAC_GET_CHECK_ITEM_BY_STATUS` | `POST /api/dts/q/data/CAC_GET_CHECK_ITEM_BY_STATUS/` | `/api/cac/dashboard/check-item-by-status` | GET | `jobId`, `status` | 指定状态巡检项 |
| `CAC_BLACK_LIST` | `POST /api/dts/q/data/CAC_BLACK_LIST/` | `/api/cac/dashboard/black-list` | GET | `module` (可选, 默认cac) | 主机黑名单 |
| `CAC_STRUCTURAL_KPI_HOSTALL` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI_HOSTALL/` | `/api/cac/dashboard/structural-kpi-host-all` | GET | `jobId` | KPI主机总数 |
| `CAC_STRUCTURAL_KPI_HOSTOK` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI_HOSTOK/` | `/api/cac/dashboard/structural-kpi-host-ok` | GET | `jobId` | KPI主机成功数 |
| `CAC_STRUCTURAL_KPI_HOSTFAILED` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI_HOSTFAILED/` | `/api/cac/dashboard/structural-kpi-host-failed` | GET | `jobId` | KPI主机失败数 |
| `CAC_STRUCTURAL_KPI_HOSTCHECK` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI_HOSTCHECK/` | `/api/cac/dashboard/structural-kpi-host-check` | GET | `jobId` | KPI主机人工检查数 |
| `CAC_STRUCTURAL_KPI_ITEMALL` | `POST /api/dts/q/data/CAC_STRUCTURAL_KPI_ITEMALL/` | `/api/cac/dashboard/structural-kpi-item-all` | GET | `jobId` | KPI巡检项总数 |

---

## PMS — 密码管理服务

### REST 接口

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `GET_FORM_ASSESTS_BY_FROMID` | `POST /api/dts/q/data/GET_FORM_ASSESTS_BY_FROMID/` | `/api/upm/pms/v2/application-forms-assests/{id}` | `upm` | `/upm/api/upm/pms/v2/application-forms-assests/{id}` | GET | `id`: path | 申请单关联设备 |
| `GET_LOGDETAIL_BY_LOGID` | `POST /api/dts/q/data/GET_LOGDETAIL_BY_LOGID/` | `/api/upm/pms/v2/log/detail/{id}` | `upm` | `/upm/api/upm/pms/v2/log/detail/{id}` | GET | `id`: path | 日志详情 |
| `PMS_GET_LOG_HISTORY` | `POST /api/dts/q/data/PMS_GET_LOG_HISTORY/` | `/api/upm/pms/v2/log/find` | `upm` | `/upm/api/upm/pms/v2/log/find` | GET | `username`, `assestsId`, `module`: query | 密码修改历史 |

### JDBC 接口（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `GET_PMS_SERVER` | `POST /api/dts/q/data/GET_PMS_SERVER/` | `/api/sys/dashboard/pms-server` | GET | `pluginFindHost` | 服务器列表 |
| `GET_PMS_SYSTEM_PARAM` | `POST /api/dts/q/data/GET_PMS_SYSTEM_PARAM/` | `/api/sys/dashboard/pms-system-param` | GET | 无 | 系统参数 |
| `PMS_GET_AUDIT_LOG` | `POST /api/dts/q/data/PMS_GET_AUDIT_LOG/` | `/api/sys/dashboard/pms-audit-log` | GET | 无 | 审计日志 |
| `PMS_GET_DEFAULT_USERNAME` | `POST /api/dts/q/data/PMS_GET_DEFAULT_USERNAME/` | `/api/sys/dashboard/pms-default-username` | GET | 无 | 默认修改用户 |
| `PMS2_GET_APPLICATION_FORM_BY_ROLE` | `POST /api/dts/q/data/PMS2_GET_APPLICATION_FORM_BY_ROLE/` | `/api/sys/dashboard/pms2-application-form-by-role` | GET | `status` (可选, 默认all) | 临时密码申请单 |
| `PMS_LIST_USERNAME` | `POST /api/dts/q/data/PMS_LIST_USERNAME/` | `/api/sys/dashboard/pms-list-username` | GET | 无 | 所有用户名 |

---

## JAO/OPLUS_CORE — 作业调度与核心功能

### REST 接口

| DTS Code | 旧调用 | 新API (后端路径) | Portal 路由 | 前端完整路径 | Method | 参数 | 说明 |
|----------|--------|-----------------|-----------|-------------|--------|------|------|
| `GET_DC_DATA_BY_MODEL` | `POST /api/dts/q/data/GET_DC_DATA_BY_MODEL/` | `/api/jao/universal/dc/{model}` | `jao` | `/jao/api/jao/universal/dc/{model}` | GET | `model`: path | 获取数据模型数据 |
| `GET_CALLBACK_DATA` | `POST /api/dts/q/data/GET_CALLBACK_DATA/` | `/api/jao/runlogs/{runId}/result` | `jao` | `/jao/api/jao/runlogs/{runId}/result` | GET | `runId`: path | Callback数据 |
| `JAO_CRON_LIST` | `POST /api/dts/q/data/JAO_CRON_LIST/` | `/api/jao/cron` | `jao` | `/jao/api/jao/cron` | GET | 无 | 定时任务列表 |

### JDBC 接口（JaoDashboard）

> **前端路径**: `/sjxy-portal/jao/api/jao/dashboard/{endpoint}` （Portal 路由 `jao`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `JAO_LIST_RUN_LOGS` | `POST /api/dts/q/data/JAO_LIST_RUN_LOGS/` | `/api/jao/dashboard/list-run-logs` | GET | `type`, `jobId`, `runIds`, `day`, `status` (可选) | 运行日志列表 |
| `JAO_LIST_RUN_LOGS_JOBID` | `POST /api/dts/q/data/JAO_LIST_RUN_LOGS_JOBID/` | `/api/jao/dashboard/list-run-logs-jobid` | GET | `jobId` | 按jobId查看日志 |
| `JAO_COUNT_RUNS_BY_TIME` | `POST /api/dts/q/data/JAO_COUNT_RUNS_BY_TIME/` | `/api/jao/dashboard/count-runs-by-time` | GET | 无 | 按时间统计(近30天) |
| `JAO_COUNT_RUNS_BY_JOB` | `POST /api/dts/q/data/JAO_COUNT_RUNS_BY_JOB/` | `/api/jao/dashboard/count-runs-by-job` | GET | 无 | 统计运行次数 |
| `JAO_GET_LAST_RUN_ID` | `POST /api/dts/q/data/JAO_GET_LAST_RUN_ID/` | `/api/jao/dashboard/get-last-run-id` | GET | `jobId` | 最后运行ID |
| `JAO_LIST_ALL_JOB` | `POST /api/dts/q/data/JAO_LIST_ALL_JOB/` | `/api/jao/dashboard/list-all-job` | GET | 无 | 所有作业列表 |
| `JAO_TEST_LIST` | `POST /api/dts/q/data/JAO_TEST_LIST/` | `/api/jao/dashboard/test-list` | GET | `id` | 作业列表(按ID) |
| `JAO_LIST_OPERATION_LOG` | `POST /api/dts/q/data/JAO_LIST_OPERATION_LOG/` | `/api/jao/dashboard/list-operation-log` | GET | `module`, `action`, `status`, `day` | 操作日志 |
| `LIST_AUDIT_BY_ACTION_LOG` | `POST /api/dts/q/data/LIST_AUDIT_BY_ACTION_LOG/` | `/api/jao/dashboard/list-audit-by-action-log` | GET | `module` | 审计操作类型 |
| `LIST_AUDIT_BY_STATUS_LOG` | `POST /api/dts/q/data/LIST_AUDIT_BY_STATUS_LOG/` | `/api/jao/dashboard/list-audit-by-status-log` | GET | `module` | 审计状态 |

---

## FLOW — 流程编排

### JDBC 接口（JaoDashboard）

> **前端路径**: `/sjxy-portal/jao/api/jao/dashboard/{endpoint}` （Portal 路由 `jao`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `FLOW_INSTANCE_AUDIT_ALL` | `POST /api/dts/q/data/FLOW_INSTANCE_AUDIT_ALL/` | `/api/jao/dashboard/flow-instance-audit-all` | GET | `appletCode`, `day` | 流程操作记录 |
| `FLOW_TEMPLATE_BY_APP` | `POST /api/dts/q/data/FLOW_TEMPLATE_BY_APP/` | `/api/jao/dashboard/flow-template-by-app` | GET | `appletCode` | 流程模板(按APP) |
| `FLOW_TEST` | `POST /api/dts/q/data/FLOW_TEST/` | `/api/jao/dashboard/flow-test` | GET | 无 | 测试接口 |

---

## 系统/其他

### JDBC 接口（SysDashboard）

> **前端路径**: `/sjxy-portal/svs/api/sys/dashboard/{endpoint}` （Portal 路由 `sys-dashboard`）

| DTS Code | 旧调用 | 新API | Method | 参数 | 说明 |
|----------|--------|-------|--------|------|------|
| `TENANT_GET_CURRENT_TENANT_ID` | `POST /api/dts/q/data/TENANT_GET_CURRENT_TENANT_ID/` | `/api/sys/dashboard/current-tenant-id` | GET | 无 | 当前租户ID |
| `TENANT_GET_CURRENT_USER` | `POST /api/dts/q/data/TENANT_GET_CURRENT_USER/` | `/api/sys/dashboard/current-user` | GET | 无 | 当前租户用户列表 |
| `TEAM_GET_USER_BY_TEAM` | `POST /api/dts/q/data/TEAM_GET_USER_BY_TEAM/` | `/api/sys/dashboard/team-user-by-team` | GET | `teamId` | 团队用户列表 |
| `GET_SYSTEM_PARAM_NAME` | `POST /api/dts/q/data/GET_SYSTEM_PARAM_NAME/` | `/api/sys/dashboard/system-param-name` | GET | `name` | 租户参数 |
| `SYS_RESOURCE_VERSION` | `POST /api/dts/q/data/SYS_RESOURCE_VERSION/` | `/api/sys/dashboard/sys-resource-version` | GET | 无 | 资源版本 |
| `SYS_RESOURCE_VERSION_OPLUS_CORE` | `POST /api/dts/q/data/SYS_RESOURCE_VERSION_OPLUS_CORE/` | `/api/sys/dashboard/sys-resource-version-sjxy-core` | GET | 无 | 资源版本(sjxy_core) |
| `TEST1` | `POST /api/dts/q/data/TEST1/` | `/api/sys/dashboard/test1` | GET | 无 | 测试接口 |

### JDBC 接口 — 未迁移（仍通过 DTS 查询）

| DTS Code | 调用方式 | 说明 |
|----------|----------|------|
| `UDP_PAGE_HISTORY` | `POST /api/dts/q/data/UDP_PAGE_HISTORY/` | 页面历史记录 |
| `UDP_PAGE_VERSION` | `POST /api/dts/q/data/UDP_PAGE_VERSION/` | 页面历史版本 |
| `UDP_PAGE_VERSION_DETAIL` | `POST /api/dts/q/data/UDP_PAGE_VERSION_DETAIL/` | 页面版本详情 |
| `UDP_PAGE_HISTORY_OPLUS_CORE` | `POST /api/dts/q/data/UDP_PAGE_HISTORY_OPLUS_CORE/` | 同UDP_PAGE_HISTORY |
| `UDP_PAGE_VERSION_OPLUS_CORE` | `POST /api/dts/q/data/UDP_PAGE_VERSION_OPLUS_CORE/` | 同UDP_PAGE_VERSION |
| `UDP_PAGE_VERSION_DETAIL_OPLUS_CORE` | `POST /api/dts/q/data/UDP_PAGE_VERSION_DETAIL_OPLUS_CORE/` | 同UDP_PAGE_VERSION_DETAIL |

---

## 前端改造示例

### JDBC 类型改造（主要变更）

```javascript
// ============================================================
// 改造前: 通过 DTS 代理
// ============================================================
const res = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_CURRENT_STATS/', {
  params: {},
  page: 1,
  size: 0
});
const data = res.data;  // DTS 直接返回 {data: [...], page: {...}}

// ============================================================
// 改造后: 经 Portal Zuul 路由到 VapDashboardResource
// 后端路径: /api/vap/dashboard/current-stats
// Portal 路由: vap → path=/vap/api/vap/**
// 前端路径: /sjxy-portal/vap/api/vap/dashboard/current-stats
// ============================================================
const res = await axios.get('/sjxy-portal/vap/api/vap/dashboard/current-stats');
const data = res.data.data;  // ApiResponse 格式 {code:200, message:"success", data:[...]}
```

### 带参数的 JDBC 改造

```javascript
// 改造前
const res = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_LIST_PATCH_BY_CVES/', {
  params: { hostKey: '192.168.1.1', severity: 'Critical', patchStatus: 'all' },
  page: 1,
  size: 0
});

// 改造后: POST → GET，Body 参数 → Query String
// 后端路径: /api/vap/dashboard/patch-by-cves → Portal路由 vap → 前端加 /vap/api/vap/
const res = await axios.get('/sjxy-portal/vap/api/vap/dashboard/patch-by-cves', {
  params: { hostKey: '192.168.1.1', severity: 'Critical', patchStatus: 'all' }
});
```

### SysDashboard 类型改造（注意 svs 前缀）

```javascript
// 改造前
const res = await axios.post('/sjxy-portal/dts/api/dts/q/data/SPM_MACHINE_OVERERVIEW_LIST/', {
  params: {},
  page: 1,
  size: 0
});

// 改造后: sys-dashboard 路由 → 前缀为 /svs/api/sys/dashboard/
// 后端路径: /api/sys/dashboard/spm-machine-overerview-list
// Portal 路由: sys-dashboard → path=/svs/api/sys/dashboard/**
const res = await axios.get('/sjxy-portal/svs/api/sys/dashboard/spm-machine-overerview-list');
const data = res.data.data;
```

### REST 类型改造

```javascript
// 改造前
const res = await axios.get('/sjxy-portal/dts/api/dts/q/data/ACM_GET_MODEL/', {
  params: { params: JSON.stringify({ ciType: 'linux' }) }
});

// 改造后: 经 Portal Zuul 路由直接调用后端 REST API
// 后端路径: /api/acm/cit/code/{ciType}/as/list → Portal路由 acm
const res = await axios.get('/sjxy-portal/acm/api/acm/cit/code/linux/as/list');
```

---

## 接口来源说明

新 API 来自以下后端 Controller（代码位置）：

| Controller | 路径前缀 | 代码文件 |
|------------|----------|----------|
| `VapDashboardResource` | `/api/vap/dashboard/` | `sjxy-vap/.../vap2/web/VapDashboardResource.java` |
| `CacDashboardResource` | `/api/cac/dashboard/` | `sjxy-cac/.../cac/web/CacDashboardResource.java` |
| `AcmDashboardResource` | `/api/acm/dashboard/` | `sjxy-acm/.../acm/ci/web/rest/AcmDashboardResource.java` |
| `JaoDashboardResource` | `/api/jao/dashboard/` | `sjxy-jao/.../jao/rest/JaoDashboardResource.java` |
| `SysDashboardResource` | `/api/sys/dashboard/` | `sjxy-svs/.../svs/web/rest/SysDashboardResource.java` |

---

## 统计汇总

| 模块 | 已迁移 Dashboard | REST(直接调用) | 未迁移(仍DTS) | 合计 |
|------|-----------------|---------------|--------------|------|
| SUDO | 2 | 3 | 0 | 5 |
| VAP | 56 | 3 | 0 | 59 |
| SPM | 25 | 1 | 0 | 26 |
| UIM/LUPM | 11 | 0 | 1 | 12 |
| VC | 29 | 0 | 0 | 29 |
| ACM | 16 | 20 | 6 | 42 |
| CAC | 22 | 2 | 0 | 24 |
| PMS | 6 | 3 | 0 | 9 |
| JAO/OPLUS_CORE | 10 | 3 | 0 | 13 |
| FLOW | 3 | 0 | 0 | 3 |
| 系统/其他 | 7 | 0 | 6 | 13 |
| **合计** | **187** | **35** | **13** | **235** |

## 注意事项

1. 所有 API 都需要在 Header 中携带 `Authorization: Bearer <token>`
2. `tenantId` 由后端从 Token 自动提取，前端**无需传递**
3. Dashboard 新接口统一为 **GET** 方法，参数通过 **Query String** 传递
4. 返回格式从 DTS 的 `{data, page}` 变更为 `ApiResponse` 的 `{code, message, data}`
5. 前端取数据方式从 `response.data` 变更为 `response.data.data`
6. REST 类型直接调用后端原始 API 路径，不再经过 DTS 代理（REST 类型返回格式保持原样，无 ApiResponse 包装）
7. 未迁移的接口（标记为"仍通过 DTS"）继续使用 `POST /api/dts/q/data/{code}/`

## Portal Zuul 路由与前端 URL 拼接规则

前端实际请求 URL = `/sjxy-portal/` + **Portal Zuul 路由前缀**

Nginx 剥离 `/sjxy-portal/` 后转发到 Portal（port 8001），Portal Zuul 匹配路由后转发到后端（port 8081）。

```
前端请求:       /sjxy-portal/vap/api/vap/dashboard/current-stats
Nginx 剥离:     /sjxy-portal/
Portal 收到:    /vap/api/vap/dashboard/current-stats
Zuul 匹配路由:  vap → path=/vap/api/vap/** → url=http://127.0.0.1:8081/api/vap/
Zuul 剥离前缀:  /vap/api/vap/
后端收到:       /api/vap/dashboard/current-stats
```

> **重要**：前端代码中的 URL 必须保留 `/sjxy-portal/` 前缀，然后接 Portal Zuul 路由路径。
> 类似旧 DTS 调用 `/sjxy-portal/dts/api/dts/q/data/...` 的格式。

### JDBC Dashboard — Portal 路由对照表

| 后端路径前缀 | Controller | Portal 路由 | 前端完整 URL 示例 |
|-------------|-----------|------------|-----------------|
| `/api/vap/dashboard/` | `VapDashboardResource` | `vap` | `/sjxy-portal/vap/api/vap/dashboard/current-stats` |
| `/api/cac/dashboard/` | `CacDashboardResource` | `cac` | `/sjxy-portal/cac/api/cac/dashboard/query-template` |
| `/api/acm/dashboard/` | `AcmDashboardResource` | `acm` | `/sjxy-portal/acm/api/acm/dashboard/os-distro` |
| `/api/jao/dashboard/` | `JaoDashboardResource` | `jao` | `/sjxy-portal/jao/api/jao/dashboard/list-run-logs` |
| `/api/sys/dashboard/` | `SysDashboardResource` | `sys-dashboard` | `/sjxy-portal/svs/api/sys/dashboard/vc-main-stats` |

### REST 类型 — Portal 路由对照表

| 后端路径前缀 | Portal 路由 | 前端完整 URL 示例 |
|-------------|-----------|-----------------|
| `/api/acm/` | `acm` | `/sjxy-portal/acm/api/acm/ci/list-asset-selector` |
| `/api/jao/` | `jao` | `/sjxy-portal/jao/api/jao/universal/dc/{model}` |
| `/api/cac/v2/` | `cac` | `/sjxy-portal/cac/api/cac/v2/statistics/check-item/{jobId}` |
| `/api/vap/v2/` | `vap` | `/sjxy-portal/vap/api/vap/v2/patch/effect/patch` |
| `/api/upm/` | `upm` | `/sjxy-portal/upm/api/upm/pms/v2/log/find` |
| `/api/adm/` | `adm` | `/sjxy-portal/adm/api/adm/tenant-param` |
| `/api/team/` | Portal 本地 | `/sjxy-portal/api/team/permission/{module}` |
| `/api/params/` | Portal 本地 | `/sjxy-portal/api/params/jao/script_engine` |
