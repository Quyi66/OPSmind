# 补丁主机重启策略查询接口

## 接口概述

查询指定补丁在某台主机上的重启要求。支持传入单个或多个补丁编号。

- **当传入单个补丁时**：按该补丁在该主机上的实际扫描结果返回重启类型（系统重启 / 服务重启 / 无需重启）
- **当传入多个补丁时**：统一返回**系统重启**（系统重启优先级高于服务重启）

## 请求

```
GET /api/vap/v2/patch/reboot-on-host
```

### 请求参数

| 参数名   | 类型   | 必填 | 说明                                                                                     |
|----------|--------|------|------------------------------------------------------------------------------------------|
| patchId  | String | 是   | 补丁编号，支持逗号分隔传多个。例如 `PATCH-001` 或 `PATCH-001,PATCH-002,PATCH-003`         |
| hostIp   | String | 是   | 主机 IP 地址，对应 acm_ci 资产中的 IP                                                     |

### 请求示例

**单个补丁：**

```
GET /api/vap/v2/patch/reboot-on-host?patchId=KYSA-202503-1001&hostIp=10.0.1.5
```

**多个补丁：**

```
GET /api/vap/v2/patch/reboot-on-host?patchId=KYSA-202503-1001,KYSA-202503-1002,KYSA-202503-1003&hostIp=10.0.1.5
```

## 响应

### 单个补丁 —— 成功（200）

```json
{
  "hostId": "2c9380849db384a1019db3c8a1234567",
  "hostIp": "10.0.1.5",
  "patchId": "KYSA-202503-1001",
  "rebootStatus": "service",
  "rebootLabel": "服务重启",
  "patchStatusIds": [
    "2c938084a1b2c3d4e5f60001",
    "2c938084a1b2c3d4e5f60002"
  ],
  "rowCount": 2,
  "sampleRebootStatusRaw": "service",
  "sampleIsKernel": "no_kernel",
  "sampleVulId": "CVE-2025-12345"
}
```

### 多个补丁 —— 成功（200）

```json
{
  "hostId": "2c9380849db384a1019db3c8a1234567",
  "hostIp": "10.0.1.5",
  "patchIds": [
    "KYSA-202503-1001",
    "KYSA-202503-1002",
    "KYSA-202503-1003"
  ],
  "rebootStatus": "system",
  "rebootLabel": "系统重启",
  "multiPatch": true,
  "multiPatchReason": "多个补丁同时安装，统一按系统重启处理",
  "patchStatusIds": [
    "2c938084a1b2c3d4e5f60001",
    "2c938084a1b2c3d4e5f60002",
    "2c938084a1b2c3d4e5f60003",
    "2c938084a1b2c3d4e5f60004"
  ],
  "rowCount": 4,
  "patchDetails": {
    "KYSA-202503-1001": "service",
    "KYSA-202503-1002": "system",
    "KYSA-202503-1003": "none"
  }
}
```

### 参数为空 —— 失败（400）

```json
{
  "error": "patchId 与 hostIp 不能为空"
}
```

### 未找到记录 —— 失败（404）

```json
{
  "error": "未找到该主机 IP 对应资产，或该主机上无此补丁的漏洞状态记录（请先完成扫描同步）"
}
```

## 响应字段说明

### 公共字段

| 字段名         | 类型    | 说明                                                       |
|----------------|---------|--------------------------------------------------------------|
| hostId         | String  | 资产主机 ID（acm_ci.id）                                    |
| hostIp         | String  | 主机 IP                                                      |
| rebootStatus   | String  | 重启类型编码：`system` / `service` / `none`                  |
| rebootLabel    | String  | 重启类型中文：系统重启 / 服务重启 / 无需重启                  |
| patchStatusIds | Array   | 关联的 vap2_curr_machine_status 记录 ID 列表                 |
| rowCount       | Integer | 关联的漏洞状态记录总条数                                      |

### 单补丁模式特有字段

| 字段名                | 类型   | 说明                                             |
|-----------------------|--------|--------------------------------------------------|
| patchId               | String | 传入的补丁编号                                    |
| sampleRebootStatusRaw | String | 第一条记录的原始 rebootStatus 值                  |
| sampleIsKernel        | String | 第一条记录的 isKernel 值（is_kernel / no_kernel） |
| sampleVulId           | String | 第一条记录的漏洞编号                              |

### 多补丁模式特有字段

| 字段名           | 类型    | 说明                                                                      |
|------------------|---------|---------------------------------------------------------------------------|
| patchIds         | Array   | 传入的全部补丁编号列表                                                     |
| multiPatch       | Boolean | 固定为 `true`，标识当前为多补丁聚合模式                                     |
| multiPatchReason | String  | 聚合原因说明                                                               |
| patchDetails     | Object  | 每个补丁各自的重启级别明细，key 为补丁编号，value 为 `system`/`service`/`none` |

## 业务规则

### 单补丁重启判断

按照 `vap2_curr_machine_status` 中的 `reboot_status` 和 `is_kernel` 字段判断：

| 优先级 | 条件                                            | 重启类型 |
|--------|-------------------------------------------------|----------|
| 最高   | `is_kernel = 'is_kernel'` 或 `reboot_status = 'system'` | 系统重启 |
| 中     | `reboot_status = 'service'`                     | 服务重启 |
| 最低   | 其他                                             | 无需重启 |

同一补丁在同一主机上有多条记录时，取**优先级最高**的。

### 多补丁重启判断

**当传入多个补丁编号时，不再按单个补丁的结果取最高优先级，而是统一返回系统重启。**

原因：多个补丁同时安装涉及的变更面较广，为保证系统稳定性，统一要求系统重启。`patchDetails` 字段中仍保留每个补丁各自的独立判断结果，方便前端展示和排查。

## 数据来源

- 主机资产：`acm_ci` 表，通过 IP 匹配
- 漏洞状态：`vap2_curr_machine_status` 表，通过 `patch_id`（支持 FIND_IN_SET）+ `host_id` 匹配

## 变更记录

| 日期       | 变更内容                                                                          |
|------------|-----------------------------------------------------------------------------------|
| 2026-04-22 | patchId 参数支持逗号分隔传入多个；多补丁时统一返回系统重启；新增 multiPatch 等字段 |
