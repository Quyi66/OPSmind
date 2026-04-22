## 十二、单台主机补丁一览（按架构过滤 affected_pkgs）

替代 DTS 查询 `VAP2_LIST_PATCH_OF_ONE_MACHINE`。

### 背景

原 DTS jdbc 查询直接读 `vap2_patch.affected_pkgs`（逗号分隔字符串，包含所有架构的包），导致 `x86_64` 主机展示 `aarch64` / `i686` 的包。

### 新接口

```
GET /oplus-portal/vap/api/vap/v2/patch/host-patches?host_id={host_id}&severity={severity}
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| host_id | string | 是 | 主机 ID（如 `2c9380849daf0fa8019daf10ad0d0001`） |
| severity | string | 否 | 严重程度过滤，逗号分隔（如 `Critical,Important`）。为空或不传则返回所有严重程度 |

### 响应

返回 JSON 数组，每行一个补丁记录，字段与原 DTS 查询完全一致：

```json
[
  {
    "host_id": "2c9380849daf0fa8019daf10ad0d0001",
    "host_key": "192.168.1.149",
    "patch_id": "KYSA-202303-1020",
    "title": "关于 openssl 的补丁包公告",
    "severity": "Critical",
    "publish_date": "2023-06-19T00:00:00.000+0800",
    "affected_pkgs": "openssl-1.1.1k-7.el8_6.x86_64.rpm,openssl-libs-1.1.1k-7.el8_6.x86_64.rpm,openssl-perl-1.1.1k-7.el8_6.x86_64.rpm",
    "related_vuls": "CVE-2022-2097,CVE-2022-2068,CVE-2022-1292"
  }
]
```

> **注意**：`affected_pkgs` 只包含与主机架构匹配的包，`aarch64`/`i686` 等不匹配架构的包已被过滤。

### 过滤逻辑

1. 查询 `vap2_curr_machine_patch` + `vap2_patch` 获取该主机关联的补丁列表
2. 通过 `vap2_curr_machine_scan` 获取该主机的 `os_arch`（如 `x86_64`）
3. 对每个补丁，从 `vap2_patch_affected_pkg` 获取包列表，仅保留：
   - `arch` 与主机架构匹配（如 `x86_64`）
   - `arch` 为 `noarch`（架构无关）
   - `arch` 为 `any`（通配）
   - `arch` 字段为空
4. 若主机无扫描记录或 `os_arch` 为空，回退返回该补丁全量包

### DTS 数据集变更

将 `VAP2_LIST_PATCH_OF_ONE_MACHINE` 从 `jdbc` 改为 `rest` 类型，前端无需改动：

```sql
UPDATE dts_dataset
SET type  = 'rest',
    query = 'curl -X GET -H "Accept:application/json" -H "Content-Type:application/json" "http://127.0.0.1/oplus-portal/vap/api/vap/v2/patch/host-patches?host_id=${host_id}&severity=${severity}"'
WHERE code = 'VAP2_LIST_PATCH_OF_ONE_MACHINE';
```

DTS 的 `params` 不变（仍为 `host_id` + `severity`），前端调用 DTS 接口时传参方式不变。
