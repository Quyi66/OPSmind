# 补丁安装预检 API 文档

## 概述

本模块提供 Linux 主机已安装 RPM 包采集和补丁安装预检功能。通过在每台目标主机上执行 `rpm -qa` 采集已安装包列表，在创建补丁安装/漏洞修复/软件包更新任务前，自动比对主机上已安装的包是否满足补丁安装要求。

**核心思路：** 不依赖集中式 YUM 仓库，而是在每台目标主机上直接检查本地已安装的 RPM 包版本，判断补丁是否可安装。

**预检作用范围：**

| 任务类型 | 是否预检 | 说明 |
|---------|---------|------|
| 补丁安装 (install) | 是 | 检查补丁关联的 RPM 包是否已安装在主机上 |
| 漏洞修复 (vuln_fix) | 是 | 同上，漏洞修复本质是安装补丁 |
| 软件包更新 (pkg_update) | 是 | 检查指定的包名是否已安装在主机上 |
| 补丁回滚 (rollback) | **否** | 回滚使用 yum downgrade 还原旧版本 |

> 如果目标主机没有已采集的包数据，预检会静默跳过，不影响原有流程。

---

## 一、主机 RPM 采集接口

### 1.1 触发主机 RPM 采集

通过 JAO 下发 Ansible 脚本到目标主机，执行 `rpm -qa` 采集已安装包列表并入库。

```
POST /api/vap/v2/repo-rpm/scan/trigger
```

**请求体：**

```json
{
  "hostIds": ["acm-host-001", "acm-host-002", "acm-host-003"]
}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| hostIds | string[] | 是 | 目标主机 ACM 资产 ID 列表 |

**成功响应：**

```json
{
  "message": "扫描任务已提交",
  "hostCount": 3
}
```

---

### 1.2 查询主机已安装 RPM 清单

分页查询指定主机的已安装 RPM 列表，支持按包名模糊搜索。

```
GET /api/vap/v2/repo-rpm/list?hostId={id}&pkgName={keyword}&page={page}&size={size}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| hostId | string | 是 | 主机 ID |
| pkgName | string | 否 | 包名关键字（模糊搜索） |
| page | int | 否 | 页码，默认 0 |
| size | int | 否 | 每页数量，默认 20 |

**成功响应：**

```json
{
  "content": [
    {
      "id": "abc123",
      "hostId": "acm-host-001",
      "pkgName": "kernel",
      "pkgVersion": "3.10.0",
      "pkgRelease": "1160.el7",
      "pkgEpoch": "0",
      "pkgArch": "x86_64",
      "pkgCmpver": "0:3.10.0-1160.el7",
      "pkgFullNevra": "0:kernel-3.10.0-1160.el7.x86_64",
      "scanTime": "2026-04-14T02:00:00"
    }
  ],
  "totalElements": 856,
  "totalPages": 43,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

---

### 1.3 查询主机扫描状态

返回指定主机的最近扫描时间、已安装包总数、扫描状态。

```
GET /api/vap/v2/repo-rpm/status?hostId={id}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| hostId | string | 是 | 主机 ID |

**成功响应：**

```json
{
  "hostId": "acm-host-001",
  "rpmCount": 856,
  "latestScanTime": "2026-04-14T02:00:00",
  "lastScanStatus": "SUCCESS",
  "lastScanError": null
}
```

---

### 1.4 查询扫描日志

查询指定主机的扫描历史记录，按时间倒序。

```
GET /api/vap/v2/repo-rpm/scan-logs?hostId={id}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| hostId | string | 是 | 主机 ID |

**成功响应：**

```json
[
  {
    "id": "log-001",
    "hostId": "acm-host-001",
    "scanRunId": "run-123",
    "jaoRunId": "jao-456",
    "status": "SUCCESS",
    "rpmCount": 856,
    "errorMessage": null,
    "startedAt": "2026-04-14T02:00:00",
    "finishedAt": "2026-04-14T02:01:15"
  }
]
```

**status 枚举值：**

| 值 | 说明 |
|---|------|
| PENDING | 已创建，等待执行 |
| RUNNING | 扫描执行中 |
| SUCCESS | 扫描成功 |
| FAILED | 扫描失败 |

---

### 1.5 获取已扫描的主机列表

返回当前租户下所有已有已安装包数据的主机 ID 列表。

```
GET /api/vap/v2/repo-rpm/hosts
```

**成功响应：**

```json
["acm-host-001", "acm-host-002"]
```

---

## 二、补丁安装预检接口

### 2.1 执行预检

检查指定补丁所需的 RPM 包在目标主机上是否已安装且版本满足要求。返回包含汇总统计的检查结果。

```
POST /api/vap/v2/patch/repo-check/execute
```

**请求体：**

```json
{
  "patchIds": ["RHSA-2024:1234", "RHSA-2024:5678"],
  "hostIds": ["acm-host-001", "acm-host-002"],
  "osDistro": "CentOS",
  "osVersion": "7"
}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| patchIds | string[] | 是 | 待检查的补丁 ID 列表 |
| hostIds | string[] | 是 | 目标主机 ID 列表 |
| osDistro | string | 否 | OS 发行版过滤（如 CentOS、RHEL、Kylin） |
| osVersion | string | 否 | OS 版本过滤（如 7、8） |

**成功响应：**

```json
{
  "checkRunId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total": 30,
  "available": 24,
  "missing": 4,
  "versionLow": 2,
  "archMismatch": 0,
  "passed": false
}
```

| 字段 | 说明 |
|-----|------|
| checkRunId | 预检批次 ID，用于查询详细结果 |
| total | 检查的（主机 x 包）总数 |
| available | 已安装且版本满足的数量 |
| missing | 主机上未安装该包的数量 |
| versionLow | 已安装但版本不足的数量 |
| archMismatch | 架构不匹配的数量 |
| passed | 是否全部通过（total == available） |

---

### 2.2 查询预检结果（分页）

查询某次预检的详细结果，含每台主机上每个包的检查状态。

```
GET /api/vap/v2/patch/repo-check/result/{checkRunId}?page={page}&size={size}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| checkRunId | string | 是 | 预检批次 ID（路径参数） |
| page | int | 否 | 页码，默认 0 |
| size | int | 否 | 每页数量，默认 20 |

**成功响应：**

```json
{
  "content": [
    {
      "id": "chk-001",
      "checkRunId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "hostId": "acm-host-001",
      "patchId": "RHSA-2024:1234",
      "pkgName": "openssl",
      "requiredVersion": "1.0.2k-25.el7_9",
      "requiredArch": "x86_64",
      "osDistro": "CentOS",
      "osVersion": "7",
      "installedRpmId": null,
      "installedVersion": null,
      "checkStatus": "MISSING",
      "checkTime": "2026-04-14T10:30:00"
    },
    {
      "id": "chk-002",
      "checkRunId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "hostId": "acm-host-001",
      "patchId": "RHSA-2024:1234",
      "pkgName": "openssl-libs",
      "requiredVersion": "1.0.2k-25.el7_9",
      "requiredArch": "x86_64",
      "osDistro": "CentOS",
      "osVersion": "7",
      "installedRpmId": "rpm-456",
      "installedVersion": "0:1.0.2k-26.el7_9",
      "checkStatus": "AVAILABLE",
      "checkTime": "2026-04-14T10:30:00"
    }
  ],
  "totalElements": 30,
  "totalPages": 2,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

**checkStatus 枚举值：**

| 值 | 含义 | 前端建议展示 |
|---|------|------------|
| AVAILABLE | 已安装且版本满足 | 绿色/通过 |
| MISSING | 主机上未安装该包 | 红色/缺失 |
| VERSION_LOW | 已安装但版本低于要求 | 橙色/版本不足 |
| ARCH_MISMATCH | 包名存在但架构不匹配 | 橙色/架构不匹配 |

---

### 2.3 查询预检汇总

返回某次预检的汇总统计数据。

```
GET /api/vap/v2/patch/repo-check/summary/{checkRunId}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| checkRunId | string | 是 | 预检批次 ID（路径参数） |

**成功响应：**

```json
{
  "checkRunId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total": 30,
  "available": 30,
  "missing": 0,
  "versionLow": 0,
  "archMismatch": 0,
  "passed": true
}
```

---

### 2.4 快速预检

创建任务前的快速校验接口，直接返回不满足的包列表。适用于前端在用户点击"创建任务"按钮前做一次轻量级检查。

```
POST /api/vap/v2/patch/repo-check/quick-check
```

**请求体：**

```json
{
  "patchIds": ["RHSA-2024:1234"],
  "hostIds": ["acm-host-001"],
  "osDistro": "CentOS",
  "osVersion": "7"
}
```

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| patchIds | string[] | 是 | 待检查的补丁 ID 列表 |
| hostIds | string[] | 是 | 目标主机 ID 列表 |
| osDistro | string | 否 | OS 发行版过滤 |
| osVersion | string | 否 | OS 版本过滤 |

**成功响应（全部通过）：**

```json
{
  "passed": true,
  "missingCount": 0,
  "missingPackages": []
}
```

**成功响应（有不满足项）：**

```json
{
  "passed": false,
  "missingCount": 2,
  "missingPackages": [
    {
      "hostId": "acm-host-001",
      "patchId": "RHSA-2024:1234",
      "pkgName": "openssl",
      "requiredVersion": "1.0.2k-25.el7_9",
      "requiredArch": "x86_64",
      "checkStatus": "MISSING"
    },
    {
      "hostId": "acm-host-001",
      "patchId": "RHSA-2024:1234",
      "pkgName": "kernel",
      "requiredVersion": "3.10.0-1160.105.1.el7",
      "requiredArch": "x86_64",
      "installedVersion": "0:3.10.0-1160.100.1.el7",
      "checkStatus": "VERSION_LOW"
    }
  ]
}
```

---

## 三、回调接口（仅供 JAO 内部调用）

### 3.1 主机 RPM 采集回调

Ansible playbook 执行完成后的回调，由 JAO 自动调用。

```
POST /api/vap/v2/callback/repo-rpm-scan
```

**请求体：** 标准 `JaoCallbackData` 格式，`batches[].result.scanResultFile` 指向扫描结果 JSON 文件路径。

---

## 四、与创建任务接口的集成

以下已有接口在创建任务时会自动执行主机预检，如果检测到不满足条件的包会返回 `400` 错误：

| 接口 | 预检行为 |
|------|---------|
| `POST /api/vap/v2/patch/task/create` | 基于 patchIds + hostIds 检查目标主机上的已安装包 |
| `POST /api/vap/v2/patch/task/create-vuln-fix` | 同上 |
| `POST /api/vap/v2/patch/task/create-pkg-update` | 基于 packages + hostIds 检查包是否已安装 |
| `POST /api/vap/v2/patch/task/create-rollback` | **不预检**（回滚不依赖当前版本） |

**预检失败时的错误响应：**

```json
{
  "error": "主机上有3个补丁依赖包不满足要求: acm-host-001:openssl(MISSING), acm-host-001:kernel(VERSION_LOW), acm-host-002:glibc(MISSING) 等"
}
```

**前端建议处理方式：**

1. 在创建任务前，先调用 `POST /api/vap/v2/patch/repo-check/quick-check` 做前置检查
2. 如果 `passed=false`，展示不满足的包列表，提示用户检查主机环境
3. 如果 `passed=true` 或目标主机无扫描数据（不会报错），正常创建任务
4. 也可以直接创建任务，后端会自动检查并在不满足时返回 400 错误

---

## 五、数据库表

| 表名 | 说明 |
|-----|------|
| vap2_yum_repo_rpm | 主机已安装 RPM 包清单 |
| vap2_repo_patch_check | 补丁安装预检结果 |
| vap2_yum_repo_scan_log | 主机 RPM 扫描执行日志 |
