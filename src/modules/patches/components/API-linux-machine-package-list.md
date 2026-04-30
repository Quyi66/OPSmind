# Linux 机器包清单查询与导出接口

## 1. 分页查询机器包清单

`GET /vap/api/vap/v2/rpm-info/installed/scan-packages`

说明：按 Linux 最新扫描结果展开机器安装包清单，一台机器上的一个包返回一条记录。数据来自 `vap2_curr_machine_scan.installed_pkgs`，包版本/Release 和受影响服务从 `vap2_rpm_package_info` 补充。

参数：

- `hostId`：可选，按资产 ID 过滤。
- `hostKey`：可选，按主机标识/IP 过滤。
- `hostIds`：可选，按选中的资产 ID 列表过滤，多值参数，例如 `hostIds=host-1&hostIds=host-2`。
- `keyword`：可选，匹配完整包字符串或包名。
- `osDistro`：可选，按操作系统发行版过滤。
- `osVersion`：可选，按操作系统版本过滤。
- `page`：默认 `0`。
- `size`：默认 `20`。

示例：

```http
GET /vap/api/vap/v2/rpm-info/installed/scan-packages?keyword=openssl&page=0&size=20
```

选择多台机器：

```http
GET /vap/api/vap/v2/rpm-info/installed/scan-packages?hostIds=host-1&hostIds=host-2&page=0&size=20
```

返回：

```json
{
  "content": [
    {
      "hostId": "host-1",
      "hostKey": "192.168.1.10",
      "osDistro": "Kylin Linux Advanced Server",
      "osVersion": "V10",
      "osSpVersion": "SP1",
      "osArch": "x86_64",
      "scanTimestamp": "2026-04-30T10:00:00.000+00:00",
      "currentPackage": "openssl-1.1.1k-12.el8.x86_64",
      "pkgName": "openssl",
      "pkgVersion": "1.1.1k-12.el8",
      "pkgRelease": "1.1.1k-12.el8",
      "pkgArch": "x86_64",
      "affectedServices": ["sshd", "nginx"]
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

字段说明：

- `hostId`：资产 ID。
- `hostKey`：主机标识/IP。
- `osDistro`：操作系统发行版。
- `osVersion`：操作系统版本。
- `osSpVersion`：SP 版本。
- `osArch`：系统架构。
- `scanTimestamp`：扫描时间。
- `currentPackage`：扫描到的完整包字符串。
- `pkgName`：包名。
- `pkgVersion`：包版本/Release，取 `vap2_rpm_package_info.version`。
- `pkgRelease`：兼容字段，当前与 `pkgVersion` 一致。
- `pkgArch`：包架构。
- `affectedServices`：受影响服务列表，来自 `vap2_rpm_package_info.services_json`。

## 2. 导出机器包清单

`POST /vap/api/vap/v2/rpm-info/installed/scan-packages/export`

说明：按查询条件导出 Excel。导出不分页；传 `hostIds` 时仅导出选中机器。

请求体：

```json
{
  "hostIds": ["host-1", "host-2"],
  "keyword": "openssl",
  "osDistro": "Kylin Linux Advanced Server",
  "osVersion": "V10"
}
```

请求参数：

- `hostId`：可选，按单台资产 ID 过滤。
- `hostKey`：可选，按主机标识/IP 过滤。
- `hostIds`：可选，按选中的资产 ID 列表过滤。
- `keyword`：可选，匹配完整包字符串或包名。
- `osDistro`：可选，按操作系统发行版过滤。
- `osVersion`：可选，按操作系统版本过滤。

响应：返回 Excel 文件流。

响应头：

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment;filename=Linux%E6%9C%BA%E5%99%A8%E5%8C%85%E6%B8%85%E5%8D%95.xlsx
Access-Control-Expose-Headers: Content-Disposition
```

Excel 列：

- 主机ID
- 主机标识
- 操作系统
- 系统版本
- SP版本
- 系统架构
- 扫描时间
- 完整包名
- 包名
- 包版本/Release
- 包架构
- 受影响服务

说明：如果前端直接调用后端服务而不是网关路径，请去掉前缀 `/vap`，即使用 `/api/vap/v2/rpm-info/installed/scan-packages` 和 `/api/vap/v2/rpm-info/installed/scan-packages/export`。
