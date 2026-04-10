# 补丁在某主机上的重启要求查询 API

数据来源：`vap2_curr_machine_status`（与 DTS 数据集 `VAP2_MACHINE_CVE_LIST` 中 `reboot_status` / `is_kernel` 等字段语义一致）。

## 基本信息

| 项 | 说明 |
|----|------|
| 方法 | `GET` |
| 路径 | `/api/vap/v2/patch/reboot-on-host` |
| 网关前缀 | 按部署为准，常见为：`{门户前缀}/vap`，完整示例：`https://{host}{门户前缀}/vap/api/vap/v2/patch/reboot-on-host` |
| 权限 | 与 `shiro-vap` 中 `/**/vap/*/patch/**` 一致（如 `ROLE_PRIVUSER` 等，以环境配置为准） |
| 租户 | 使用当前登录上下文租户（`TenantUtil`），与列表类接口一致 |

## 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patchId` | string | 是 | 补丁编号，对应 `vap2_patch.patch_id`；匹配 `vap2_curr_machine_status.patch_id`（支持库内逗号拼接后的 `FIND_IN_SET` 逻辑） |
| `hostIp` | string | 是 | 主机 IP，与资产表 `acm_ci.attrs` 中 JSON 字段 **`IP`** 一致（`JSON_EXTRACT(attrs, '$.IP')`） |

### 请求示例

```http
GET /api/vap/v2/patch/reboot-on-host?patchId=RHSA-2024%3A1234&hostIp=192.168.1.100
```

## 成功响应

- **HTTP 状态码**：`200`
- **Content-Type**：`application/json`
- **Body**：JSON 对象（字段如下）

| 字段 | 类型 | 说明 |
|------|------|------|
| `hostId` | string | 资产主键 `acm_ci.id` |
| `hostIp` | string | 请求传入的主机 IP（trim 后） |
| `patchId` | string | 请求传入的补丁编号（trim 后） |
| `rebootStatus` | string | `system`：需系统重启；`service`：需服务重启；`none`：按当前记录判断为无需重启 |
| `rebootLabel` | string | 中文：`系统重启` / `服务重启` / `无需重启` |
| `patchStatusIds` | string[] | 命中的 `vap2_curr_machine_status.id` 列表（同一主机 + 同一补丁可能对应多条 CVE 行） |
| `rowCount` | number | 命中行数 |
| `sampleRebootStatusRaw` | string | 首行原始 `reboot_status`（便于对账） |
| `sampleIsKernel` | string | 首行原始 `is_kernel` |
| `sampleVulId` | string | 首行 `vul_id`（如 CVE 编号） |

### 多行合并规则

同一 `patchId` + `hostIp` 若命中多行 `vap2_curr_machine_status`：

- 任一行 `is_kernel === is_kernel`（不区分大小写）或与 **`system`** 等价的重启要求 → 整体按 **系统重启**；
- 否则若任一行要求 **服务重启**（`service`）→ 整体按 **服务重启**；
- 否则 → **无需重启**。

### 成功示例

```json
{
  "hostId": "2c9380849d65d495019d713aba735e65",
  "hostIp": "192.168.1.100",
  "patchId": "RHSA-2024:1234",
  "rebootStatus": "system",
  "rebootLabel": "系统重启",
  "patchStatusIds": ["abc...", "def..."],
  "rowCount": 2,
  "sampleRebootStatusRaw": "system",
  "sampleIsKernel": "is_kernel",
  "sampleVulId": "CVE-2024-0001"
}
```

## 失败响应

### 400 Bad Request

缺少参数或参数为空。

```json
{
  "error": "patchId 与 hostIp 不能为空"
}
```

### 404 Not Found

当前租户下不存在该 IP 的 `acm_ci`，或该主机在 `vap2_curr_machine_status` 中无包含该 `patchId` 的状态记录（含未完成扫描/未同步等情况）。

```json
{
  "error": "未找到该主机 IP 对应资产，或该主机上无此补丁的漏洞状态记录（请先完成扫描同步）"
}
```

## 前端对接提示

1. **IP 必须与 CMDB/资产里存的 `attrs.IP` 完全一致**（若资产存的是内网别名或带掩码，需与后端数据一致）。
2. **`patchId` 与漏洞列表、补丁库中的主键一致**；若页面展示的是其他编码，需先映射到 `patch_id`。
3. 若需防缓存，可像其他接口一样追加 `cacheBuster` 等无用 query，不影响本接口解析。

## 相关后端类

- `com.famessoft.oplus.vap2.web.rest.PatchHostRebootController`
- `com.famessoft.oplus.vap2.service.PatchHostRebootQueryService` / `PatchHostRebootQueryServiceImpl`
