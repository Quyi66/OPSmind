# VAP2 Dashboard 接口迁移文档

> 日期: 2026-03-19
>
> 模块: sjxy-vap (漏洞补丁管理)
>
> 说明: 以下 4 个接口原先通过 DTS 数据集代理调用，现已迁移为 VAP 模块直接提供的 REST API。前端需要将调用方式从 DTS 代理改为直接调用 VAP API。

---

## 一、变更概述

### 变更原因

前端通过 DTS 代理调用 `POST /dts/api/dts/q/data/{code}`，但 `dts_dataset` 表中不存在以下数据集定义，导致 DTS 服务抛出 `NotFoundException: 查询不到数据集`，HTTP 状态码返回 404。

这些数据查询已直接实现在 `sjxy-vap` 模块的 `VapDashboardResource` 控制器中，前端应直接调用新的 REST API。

### 迁移映射表

| DTS Code (旧) | 旧调用方式 | 新 API | 请求方法 |
|---|---|---|---|
| `VAP2_CURRENT_STATS` | `POST /dts/api/dts/q/data/VAP2_CURRENT_STATS` | `/api/vap/dashboard/current-stats` | **GET** |
| `VAP2_LIST_MACHINE_WITH_PATCH` | `POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH` | `/api/vap/dashboard/machine-with-patch` | **GET** |
| `VAP2_LIST_MACHINE_OS_INFO` | `POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO` | `/api/vap/dashboard/machine-os-info` | **GET** |
| `VAP2_LIST_MACHINE_OS_VERSION_INFO` | `POST /dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO` | `/api/vap/dashboard/machine-os-version-info` | **GET** |

### Nginx 路由前缀

前端实际请求路径需加上 Nginx 模块前缀 `sjxy-vap`，例如:

```
旧: /sjxy-portal/dts/api/dts/q/data/VAP2_CURRENT_STATS
新: /sjxy-portal/sjxy-vap/api/vap/dashboard/current-stats
```

---

## 二、通用说明

### 认证

所有接口需要在 Header 中携带:

```
Authorization: Bearer <token>
```

### 租户标识

`tenantId` 参数由后端通过 `@CurrentTenant` 注解从登录 Token 中自动提取，**前端无需传递**。

### 统一返回格式

新接口使用 `ApiResponse` 统一包装，返回格式如下:

```json
{
  "code": 200,
  "message": "success",
  "data": [ ... ]
}
```

**注意: 与 DTS 返回格式不同，实际数据在 `data` 字段中，前端取数据时需调整解析逻辑。**

错误时返回:

```json
{
  "code": 500,
  "message": "错误描述"
}
```

---

## 三、接口详情

---

### 1. 当前统计信息

获取最近一次漏洞扫描的统计数据。

| 项目 | 说明 |
|---|---|
| 旧 DTS Code | `VAP2_CURRENT_STATS` |
| 新 URL | `GET /api/vap/dashboard/current-stats` |
| Nginx 完整路径 | `GET /sjxy-portal/sjxy-vap/api/vap/dashboard/current-stats` |
| 请求方法 | `GET` (旧为 POST) |
| 请求参数 | 无 |

#### 请求示例

```http
GET /sjxy-portal/sjxy-vap/api/vap/dashboard/current-stats HTTP/1.1
Host: 192.168.1.162
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "run_id": "run-20260319-001",
      "name": "total_hosts",
      "value": "128",
      "description": "扫描主机总数",
      "updated_at": "2026-03-19 09:00:00"
    },
    {
      "run_id": "run-20260319-001",
      "name": "total_patches",
      "value": "56",
      "description": "待修复补丁总数",
      "updated_at": "2026-03-19 09:00:00"
    }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `run_id` | String | 扫描运行ID |
| `name` | String | 统计指标名称 |
| `value` | String | 统计值 |
| `description` | String | 指标描述 |
| `updated_at` | String | 更新时间 |

#### 数据来源

```sql
SELECT run_id, name, value, description, updated_at
FROM vap2_hist_stats
WHERE updated_at = (SELECT updated_at FROM vap2_hist_stats
                    WHERE tenant_id = #{tenantId}
                    ORDER BY updated_at DESC LIMIT 1)
```

---

### 2. 有补丁的机器列表

获取所有已扫描到补丁的主机列表，包含各严重级别补丁数量。

| 项目 | 说明 |
|---|---|
| 旧 DTS Code | `VAP2_LIST_MACHINE_WITH_PATCH` |
| 新 URL | `GET /api/vap/dashboard/machine-with-patch` |
| Nginx 完整路径 | `GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-with-patch` |
| 请求方法 | `GET` (旧为 POST) |
| 请求参数 | 无 |

#### 请求示例

```http
GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-with-patch HTTP/1.1
Host: 192.168.1.162
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "hostname": "web-server-01",
      "host_key": "192.168.1.100",
      "host_id": "ff808081727a047f01729...",
      "os_distro": "CentOS",
      "os_version": "7.9",
      "num_low": 2,
      "num_critical": 1,
      "num_important": 3,
      "num_moderate": 5,
      "scan_timestamp": "2026-03-19 08:30:00",
      "need_reboot": 0
    }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `hostname` | String | 主机名 |
| `host_key` | String | 主机IP |
| `host_id` | String | 主机ID (ACM资产ID) |
| `os_distro` | String | 操作系统发行版 (如 CentOS, RedHat, KylinOS) |
| `os_version` | String | 操作系统版本号 |
| `num_low` | Integer | 低危补丁数量 |
| `num_critical` | Integer | 严重补丁数量 |
| `num_important` | Integer | 重要补丁数量 |
| `num_moderate` | Integer | 中等补丁数量 |
| `scan_timestamp` | String | 最近扫描时间 |
| `need_reboot` | Integer | 是否需要重启 (0=否, 1=是) |

#### 数据来源

```sql
SELECT hostname, host_key, host_id, os_distro, os_version,
       num_low, num_critical, num_important, num_moderate,
       scan_timestamp, COALESCE(ac.need_reboot, 0) AS need_reboot
FROM vap2_curr_machine_scan v2cms
         LEFT JOIN acm_ci ac ON v2cms.tenant_id = ac.tenant_id AND ac.id = v2cms.host_id
WHERE v2cms.tenant_id = #{tenantId}
ORDER BY v2cms.scan_timestamp DESC
```

---

### 3. 机器操作系统信息

获取当前租户下所有已扫描主机的操作系统发行版去重列表，用于前端筛选下拉框。

| 项目 | 说明 |
|---|---|
| 旧 DTS Code | `VAP2_LIST_MACHINE_OS_INFO` |
| 新 URL | `GET /api/vap/dashboard/machine-os-info` |
| Nginx 完整路径 | `GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-info` |
| 请求方法 | `GET` (旧为 POST) |
| 请求参数 | 无 |

#### 请求示例

```http
GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-info HTTP/1.1
Host: 192.168.1.162
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "os_distro": "CentOS" },
    { "os_distro": "RedHat" },
    { "os_distro": "KylinOS" }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `os_distro` | String | 操作系统发行版名称 (去重后) |

#### 数据来源

```sql
SELECT DISTINCT v2cms.os_distro os_distro
FROM vap2_curr_machine_scan v2cms
WHERE v2cms.tenant_id = #{tenantId}
```

---

### 4. 机器操作系统版本信息

获取当前租户下所有已扫描主机的操作系统版本去重列表，用于前端筛选下拉框。

| 项目 | 说明 |
|---|---|
| 旧 DTS Code | `VAP2_LIST_MACHINE_OS_VERSION_INFO` |
| 新 URL | `GET /api/vap/dashboard/machine-os-version-info` |
| Nginx 完整路径 | `GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-version-info` |
| 请求方法 | `GET` (旧为 POST) |
| 请求参数 | 无 |

#### 请求示例

```http
GET /sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-version-info HTTP/1.1
Host: 192.168.1.162
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "os_major_version": "7.9" },
    { "os_major_version": "8.4" },
    { "os_major_version": "V10" }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `os_major_version` | String | 操作系统主版本号 (去重后) |

#### 数据来源

```sql
SELECT DISTINCT v2cms.os_version os_major_version
FROM vap2_curr_machine_scan v2cms
WHERE v2cms.tenant_id = #{tenantId}
```

---

## 四、前端改造示例

### JavaScript / Axios

```javascript
// ============================================================
// 改造前: 通过 DTS 代理 (当前报 404 的调用方式)
// ============================================================
const res1 = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_CURRENT_STATS');
const data1 = res1.data;  // DTS 直接返回数据

const res2 = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_LIST_MACHINE_WITH_PATCH');
const data2 = res2.data;

const res3 = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_INFO');
const data3 = res3.data;

const res4 = await axios.post('/sjxy-portal/dts/api/dts/q/data/VAP2_LIST_MACHINE_OS_VERSION_INFO');
const data4 = res4.data;

// ============================================================
// 改造后: 直接调用 VAP REST API
// ============================================================
const res1 = await axios.get('/sjxy-portal/sjxy-vap/api/vap/dashboard/current-stats');
const data1 = res1.data.data;  // 注意: ApiResponse 包装，实际数据在 .data.data 中

const res2 = await axios.get('/sjxy-portal/sjxy-vap/api/vap/dashboard/machine-with-patch');
const data2 = res2.data.data;

const res3 = await axios.get('/sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-info');
const data3 = res3.data.data;

const res4 = await axios.get('/sjxy-portal/sjxy-vap/api/vap/dashboard/machine-os-version-info');
const data4 = res4.data.data;
```

---

## 五、注意事项

| 项目 | 旧 (DTS 代理) | 新 (VAP 直接调用) |
|---|---|---|
| 请求方法 | POST | **GET** |
| URL 前缀 | `/sjxy-portal/dts/` | `/sjxy-portal/sjxy-vap/` |
| tenantId | DTS 自动注入 | Token 中自动提取 (无需传参) |
| 返回格式 | DTS 自有格式 `{data, page, ...}` | ApiResponse 格式 `{code, message, data}` |
| 取数据方式 | `response.data` | `response.data.data` |
| 认证 | Bearer Token | Bearer Token (不变) |
