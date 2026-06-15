# RPM 软件包信息接口

## 1. 全量 RPM 软件包分页查询

`GET /vap/api/vap/v2/rpm-info/list`

参数：

- `source`：可选，`kylin` / `redhat`
- `keyword`：可选，匹配短包名、`completePackageName`(完整 NVRA)、描述
- `name`：可选，短包名精确匹配，或可匹配 `completePackageName` 子串
- `arch`：可选，精确架构
- `page`：默认 `0`
- `size`：默认 `20`

返回字段包含 `content`、`totalElements`、`totalPages`、`size`、`number`、`first`、`last`。
`content` 内每行只返回摘要字段：`id`、`source`、`name`（短包名）、`completePackageName`（完整 NVRA，形如 `aalto-xml-help-1.0.0-7.ky10.noarch`）、`version`（`Version-Release`，如 `0.201-2.ky10`）、`architecture`、`services`。完整 `description` 和 `changelog` 请调用详情接口获取，避免列表响应过大。

## 1.1 列表页“架构”筛选下拉枚举

`GET /vap/api/vap/v2/rpm-info/architectures`

参数：

- `source`：可选，`kylin` / `redhat`；不传时返回全部数据源去重后的架构。

返回：

```json
{
  "total": 4,
  "content": ["aarch64", "i686", "noarch", "x86_64"]
}
```

> 列表页“架构”筛选项请使用此接口拉取候选值并渲染为下拉框，避免用户手输错误（如 `X86_64`、`amd64` 等无效值导致查不到数据）。建议前端在“数据源”切换时重新拉一次，把同源不存在的架构隐藏掉。

## 2. 全量 RPM 软件包详情

按 ID 查询：

`GET /vap/api/vap/v2/rpm-info/detail/{id}`

按包名查询：

`GET /vap/api/vap/v2/rpm-info/detail?name=kernel&source=kylin&arch=x86_64`

按包名查询时优先匹配指定架构，其次匹配 `noarch`。

> CVE 软件包详情已在 `GET /vap/api/vap/v2/cve/detail/{cveId}` 的 `sources[].packages[*].packageInfo` 中内联返回，前端无需再单独调用本接口。

批量查询：

`POST /vap/api/vap/v2/rpm-info/batch-detail`

请求体：

```json
{
  "source": "kylin",
  "osDistro": "Kylin Linux Advanced Server V10 SP1",
  "arch": "x86_64",
  "packages": [
    "curl-7.66.0-3.ky10-x86_64.rpm",
    {"pkgName": "kernel", "arch": "x86_64"},
    {"currentPackage": "subversion-help-1.10.6-2.ky10-noarch.rpm"}
  ]
}
```

返回每个输入项解析出的 `pkgName`、`pkgArch` 和完整 `packageInfo`。前端已有 DTS `installed_pkgs` 时，优先使用该接口批量取详情，避免逐行请求。

## 2.1 根据 DTS 已安装包行查询详情

`GET /vap/api/vap/v2/rpm-info/installed/detail`

用于机器详情页已通过 `/dts/api/dts/q/data/VAP2_GET_MACHINE_PKGS/` 获取软件包列表后，再按当前行查询软件包详情。

参数：

- `pkgName`：可选，DTS 行里如果已有包名则优先传这个字段。
- `pkgId`：可选，DTS 行里的当前安装版本/包标识，例如 `curl-7.66.0-3.ky10-x86_64.rpm`。
- `currentPackage`：可选，与 `pkgId` 等价，便于前端按展示字段传参。
- `osDistro`：可选，例如 `Kylin Linux Advanced Server V10 SP1`，用于推断 `source=kylin`。
- `source`：可选，显式指定 `kylin` / `redhat` 时优先于 `osDistro`。
- `arch`：可选，例如 `x86_64`；如果 `pkgId/currentPackage` 是完整 RPM 文件名，接口会自动从文件名解析架构。

示例：

```http
GET /vap/api/vap/v2/rpm-info/installed/detail?currentPackage=curl-7.66.0-3.ky10-x86_64.rpm&osDistro=Kylin%20Linux%20Advanced%20Server%20V10%20SP1
```

## 3. CVE 详情补丁包信息增强

原接口：

`GET /vap/api/vap/v2/cve/detail/{cveId}`

在 `sources[].packages` 的每个软件包行中新增：

- `packageDescription`：软件包描述
- `changelog`：软件包 changelog
- `services`：关联/受影响服务列表
- `packageInfo`：RPM 详情对象（与 `/rpm-info/detail` 一致，含短名 `name`、`completePackageName`、`version` 等）

## 4. 纳管机器已安装软件包查询

`GET /vap/api/vap/v2/rpm-info/installed/list`

参数：

- `hostId`：可选，按资产 ID 过滤
- `hostKey`：可选，按主机标识/IP 过滤
- `keyword`：可选，匹配 `pkgName` 或 `pkgId`
- `available`：可选，`所有` 表示全部；其它值表示只看有可升级版本的软件包
- `page`：默认 `0`
- `size`：默认 `20`

每行返回主机扫描软件包字段，并在 `packageInfo` 中关联全量 RPM 详情。系统会根据主机 `osDistro` 推断 `kylin` / `redhat` 数据源。

如果页面已经使用 DTS `VAP2_GET_MACHINE_PKGS`，其 SQL 来自 `vap2_curr_machine_scan.installed_pkgs / affected_pkgs`，推荐使用同源接口：

`GET /vap/api/vap/v2/rpm-info/installed/scan-list`

参数：

- `hostId`：必填，主机资产 ID。
- `keyword`：可选，匹配完整 RPM 字符串或解析出的包名。
- `page`：默认 `0`。
- `size`：默认 `20`。

接口会读取该主机最新扫描记录，解析 `installed_pkgs` JSON 字符串数组，并用 `affected_pkgs` 标记 `affected=true/false`。每行补充摘要版 `packageInfo`；用户点击某行时，再调用 `/installed/detail` 或 `/batch-detail` 获取完整 `description` / `changelog`。

示例：

```http
GET /vap/api/vap/v2/rpm-info/installed/scan-list?hostId=xxx&page=0&size=20
```

## 5. 补丁安装涉及服务列表

补丁安装前端可基于补丁包名调用 `/rpm-info/detail` 或 `/rpm-info/installed/detail` 查询 `services` 字段并展示。
服务列表来自全量 RPM 表 `services_json`，不需要在 `vap2_patch_install_task` 上新增持久化字段。
